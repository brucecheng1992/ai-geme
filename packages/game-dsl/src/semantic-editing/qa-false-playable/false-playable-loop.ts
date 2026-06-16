import { createSemanticPatchApplier } from '../patch-applier.js';
import { hashSemanticPatchDocument } from '../document-hash.js';
import { createSemanticPatchDiffViewModel } from '../patch-diff.js';
import { createSemanticPatchPlanner } from '../patch-planner.js';
import { createSemanticPatchValidator } from '../patch-validator.js';
import { createFixBlankPreviewRepairHandlers } from '../repair-packs/index.js';
import { createSemanticEditingTraceRecorder } from '../trace-recorder.js';
import {
  traceSemanticPatchApply,
  traceSemanticPatchPlan,
  traceSemanticPatchValidation
} from '../traced-semantic-editing.js';
import type { SemanticEditingTraceRecorder } from '../trace-recorder.js';
import type { SemanticPatchPlanResult } from '../patch-planner.js';
import type { SemanticPatchApplyResult } from '../patch-applier-types.js';
import type { SemanticPatchValidationResult } from '../types.js';
import {
  createFalsePlayableRepairIntent,
  detectSemanticFalsePlayableFindings
} from './false-playable-detector.js';
import type {
  RunSemanticFalsePlayableRepairLoopRequest,
  SemanticFalsePlayableDetectionResult,
  SemanticFalsePlayableFinding,
  SemanticFalsePlayableRepairLoopFailure,
  SemanticFalsePlayableRepairLoopResult,
  SemanticFalsePlayableRepairLoopStage
} from './false-playable-types.js';

/**
 * Runs the false-playable repair flow entirely in memory. It orchestrates the
 * existing semantic editing primitives and never runs real QA, runtime, or file I/O.
 */
export function runSemanticFalsePlayableRepairLoop(
  request: RunSemanticFalsePlayableRepairLoopRequest
): SemanticFalsePlayableRepairLoopResult {
  const trace = request.trace ?? createSemanticEditingTraceRecorder({
    correlationId: request.correlationId,
    now: request.now,
    createEventId: request.createTraceEventId
  });
  const detection = detectSemanticFalsePlayableFindings(request.qaReport, {
    defaultSceneTarget: request.defaultSceneTarget
  });

  if (!detection.detected) {
    trace.emit({
      type: 'semantic_edit.qa.false_playable.not_detected',
      severity: 'info',
      payload: {
        detected: false,
        warningCount: detection.warnings.length
      }
    });
    return {
      ok: true,
      stage: 'not_detected',
      detection,
      traceEvents: trace.getEvents(),
      reason: 'NO_FALSE_PLAYABLE_FINDING'
    };
  }

  const finding = detection.findings[0];
  if (finding === undefined) {
    trace.emit({
      type: 'semantic_edit.qa.false_playable.not_detected',
      severity: 'warning',
      payload: {
        detected: false,
        warningCount: detection.warnings.length
      }
    });
    return {
      ok: true,
      stage: 'not_detected',
      detection,
      traceEvents: trace.getEvents(),
      reason: 'NO_FALSE_PLAYABLE_FINDING'
    };
  }

  emitFalsePlayableDetected(trace, finding);
  const intent = createFalsePlayableRepairIntent(finding, {
    createIntentId: request.createIntentId
  });

  let plan: SemanticPatchPlanResult;
  try {
    const planner = createSemanticPatchPlanner(
      createFixBlankPreviewRepairHandlers({
        document: request.document,
        scenePath: request.scenePath,
        defaults: request.repairDefaults
      })
    );
    plan = traceSemanticPatchPlan({
      planner,
      request: {
        intent,
        semanticIndex: request.semanticIndex,
        beforeHash: hashSemanticPatchDocument(request.document),
        now: request.now,
        createPatchId: request.createPatchId
      },
      trace
    });
  } catch {
    emitRepairFailed(trace, 'plan', 'FALSE_PLAYABLE_LOOP_EXCEPTION');
    return failureResult({
      stage: 'plan_failed',
      detection,
      finding,
      intent,
      trace,
      errorCode: 'FALSE_PLAYABLE_LOOP_EXCEPTION',
      message: 'False-playable repair planning failed with an exception.'
    });
  }

  if (!plan.ok) {
    emitRepairFailed(trace, 'plan', plan.error.code);
    return failureResult({
      stage: 'plan_failed',
      detection,
      finding,
      intent,
      plan,
      trace,
      errorCode: 'FALSE_PLAYABLE_PLAN_FAILED',
      message: 'False-playable repair planning failed.'
    });
  }

  const validator = request.validator ?? createSemanticPatchValidator();
  let validation: SemanticPatchValidationResult;
  try {
    validation = traceSemanticPatchValidation({
      validator,
      request: {
        patch: plan.patch,
        intent,
        semanticIndex: request.semanticIndex
      },
      trace
    });
  } catch {
    emitRepairFailed(trace, 'validation', 'FALSE_PLAYABLE_LOOP_EXCEPTION');
    return failureResult({
      stage: 'validation_failed',
      detection,
      finding,
      intent,
      plan,
      trace,
      errorCode: 'FALSE_PLAYABLE_LOOP_EXCEPTION',
      message: 'False-playable repair validation failed with an exception.'
    });
  }

  if (!validation.ok) {
    emitRepairFailed(trace, 'validation', 'FALSE_PLAYABLE_VALIDATION_FAILED');
    return failureResult({
      stage: 'validation_failed',
      detection,
      finding,
      intent,
      plan,
      validation,
      diff: createSemanticPatchDiffViewModel({
        patch: plan.patch,
        beforeDocument: request.document,
        validation,
        traceEvents: trace.getEvents(),
        options: request.patchDiffOptions
      }),
      trace,
      errorCode: 'FALSE_PLAYABLE_VALIDATION_FAILED',
      message: 'False-playable repair validation failed.'
    });
  }

  const applier = request.applier ?? createSemanticPatchApplier({
    validator,
    now: request.now,
    createRollbackPatchId: request.createRollbackPatchId
  });
  let apply: SemanticPatchApplyResult;
  try {
    apply = traceSemanticPatchApply({
      applier,
      request: {
        document: request.document,
        patch: plan.patch,
        intent,
        semanticIndex: request.semanticIndex
      },
      trace
    });
  } catch {
    emitRepairFailed(trace, 'apply', 'FALSE_PLAYABLE_LOOP_EXCEPTION');
    return failureResult({
      stage: 'apply_failed',
      detection,
      finding,
      intent,
      plan,
      validation,
      trace,
      errorCode: 'FALSE_PLAYABLE_LOOP_EXCEPTION',
      message: 'False-playable repair apply failed with an exception.'
    });
  }

  if (!apply.ok) {
    emitRepairFailed(trace, 'apply', apply.error.code);
    return failureResult({
      stage: 'apply_failed',
      detection,
      finding,
      intent,
      plan,
      validation,
      apply,
      diff: createSemanticPatchDiffViewModel({
        patch: plan.patch,
        beforeDocument: request.document,
        validation,
        applyResult: apply,
        traceEvents: trace.getEvents(),
        options: request.patchDiffOptions
      }),
      trace,
      errorCode: 'FALSE_PLAYABLE_APPLY_FAILED',
      message: 'False-playable repair apply failed.'
    });
  }

  const diff = createSemanticPatchDiffViewModel({
    patch: plan.patch,
    beforeDocument: request.document,
    afterDocument: apply.document,
    validation,
    applyResult: apply,
    traceEvents: trace.getEvents(),
    options: request.patchDiffOptions
  });
  trace.emit({
    type: 'semantic_edit.qa.false_playable.repair_completed',
    severity: 'info',
    intentId: intent.id,
    patchId: plan.patch.id,
    target: plan.patch.target,
    kind: intent.kind,
    payload: {
      intentId: intent.id,
      patchId: plan.patch.id,
      beforeHash: apply.beforeHash,
      afterHash: apply.afterHash,
      operationCount: plan.patch.operations.length
    }
  });

  return {
    ok: true,
    stage: 'repaired',
    detection,
    finding,
    intent,
    plan,
    validation,
    apply,
    diff,
    traceEvents: trace.getEvents()
  };
}

function emitFalsePlayableDetected(trace: SemanticEditingTraceRecorder, finding: SemanticFalsePlayableFinding): void {
  trace.emit({
    type: 'semantic_edit.qa.false_playable.detected',
    severity: finding.severity === 'error' ? 'error' : finding.severity,
    target: finding.sceneTarget,
    kind: 'fix_blank_preview',
    payload: {
      finding: {
        id: finding.id,
        code: finding.code,
        sceneTarget: finding.sceneTarget,
        severity: finding.severity,
        evidenceCodes: finding.source.evidenceCodes,
        hasScreenshot: finding.source.hasScreenshot,
        hasCanvasSnapshot: finding.source.hasCanvasSnapshot
      }
    }
  });
}

function emitRepairFailed(
  trace: SemanticEditingTraceRecorder,
  stage: 'detection' | 'plan' | 'validation' | 'apply',
  errorCode?: string
): void {
  trace.emit({
    type: 'semantic_edit.qa.false_playable.repair_failed',
    severity: 'error',
    payload: {
      stage,
      ...(errorCode === undefined ? {} : { errorCode })
    }
  });
}

function failureResult(input: {
  stage: Exclude<SemanticFalsePlayableRepairLoopStage, 'not_detected' | 'repaired'>;
  detection: SemanticFalsePlayableDetectionResult;
  finding: SemanticFalsePlayableFinding;
  intent: ReturnType<typeof createFalsePlayableRepairIntent>;
  plan?: SemanticPatchPlanResult;
  validation?: SemanticPatchValidationResult;
  apply?: SemanticPatchApplyResult;
  diff?: SemanticFalsePlayableRepairLoopFailure['diff'];
  trace: SemanticEditingTraceRecorder;
  errorCode: SemanticFalsePlayableRepairLoopFailure['error']['code'];
  message: string;
}): SemanticFalsePlayableRepairLoopFailure {
  return {
    ok: false,
    stage: input.stage,
    detection: input.detection,
    finding: input.finding,
    intent: input.intent,
    ...(input.plan === undefined ? {} : { plan: input.plan }),
    ...(input.validation === undefined ? {} : { validation: input.validation }),
    ...(input.apply === undefined ? {} : { apply: input.apply }),
    ...(input.diff === undefined ? {} : { diff: input.diff }),
    traceEvents: input.trace.getEvents(),
    error: {
      code: input.errorCode,
      message: input.message,
      stage: input.stage
    }
  };
}
