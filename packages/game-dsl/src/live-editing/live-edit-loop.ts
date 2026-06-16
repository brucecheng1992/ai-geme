import {
  createResolverV2,
  createResolverV2DiagnosticsViewModel,
  createResolverV2IrIntegrationGate,
  createResolverV2TraceRecorder,
  traceResolverV2IrGate,
  traceResolverV2Resolve
} from '../resolver-v2/index.js';
import {
  createSemanticEditingTraceRecorder,
  createSemanticPatchApplier,
  createSemanticPatchDiffViewModel,
  createSemanticPatchPlanner,
  createSemanticPatchValidator,
  hashSemanticPatchDocument,
  traceSemanticPatchApply,
  traceSemanticPatchPlan,
  traceSemanticPatchValidation,
  type SemanticEditIntent,
  type SemanticPatch,
  type SemanticPatchApplyResult,
  type SemanticPatchPlanResult,
  type SemanticPatchValidationResult
} from '../semantic-editing/index.js';
import { createLiveSemanticEditHandlers } from './live-edit-handlers.js';
import { createLiveSemanticEditIntent } from './live-edit-intents.js';
import { parseLiveSemanticEditText } from './live-edit-parser.js';
import type {
  LiveSemanticEditError,
  LiveSemanticEditParseResult,
  LiveSemanticEditResult,
  LiveSemanticEditStage,
  RunLiveSemanticEditRequest
} from './types.js';

export function runLiveSemanticEdit(request: RunLiveSemanticEditRequest): LiveSemanticEditResult {
  const parse = parseLiveSemanticEditText(request.text, {
    defaultSceneTarget: request.defaultSceneTarget,
    defaultEntityId: request.defaultEntityId
  });
  const trace = createSemanticEditingTraceRecorder({
    now: request.now,
    correlationId: request.correlationId,
    createEventId: request.createTraceEventId
  });
  const resolverTrace = createResolverV2TraceRecorder({
    now: request.now,
    correlationId: request.correlationId,
    createEventId: request.createResolverTraceEventId
  });

  if (!parse.ok) {
    return failure({
      stage: 'parse_failed',
      parse,
      traceEvents: trace.getEvents(),
      resolverTraceEvents: resolverTrace.getEvents(),
      warnings: parse.warnings,
      error: {
        code: 'LIVE_SEMANTIC_EDIT_PARSE_FAILED',
        message: parse.message,
        reason: parse.reason
      }
    });
  }

  const command = parse.command;
  let intent: SemanticEditIntent;
  try {
    intent = createLiveSemanticEditIntent(command, {
      createIntentId: request.createIntentId,
      sequence: 0
    });
  } catch {
    return failure({
      stage: 'plan_failed',
      parse,
      command,
      traceEvents: trace.getEvents(),
      resolverTraceEvents: resolverTrace.getEvents(),
      warnings: command.warnings,
      error: {
        code: 'LIVE_SEMANTIC_EDIT_INTENT_FAILED',
        message: 'Live semantic edit intent failed schema validation.'
      }
    });
  }

  let beforeHash: string;
  try {
    beforeHash = hashSemanticPatchDocument(request.document);
  } catch {
    return failure({
      stage: 'plan_failed',
      parse,
      command,
      intent,
      traceEvents: trace.getEvents(),
      resolverTraceEvents: resolverTrace.getEvents(),
      warnings: command.warnings,
      error: {
        code: 'LIVE_SEMANTIC_EDIT_DOCUMENT_HASH_FAILED',
        message: 'Live semantic edit document must be JSON-compatible before planning.'
      }
    });
  }

  const planner =
    request.planner ??
    createSemanticPatchPlanner(
      request.handlers ??
        createLiveSemanticEditHandlers({
          document: request.document,
          scenePath: command.sceneTarget === undefined ? undefined : sceneTargetToPath(command.sceneTarget)
        })
    );
  const plan = callPlan({
    planner,
    request,
    intent,
    beforeHash,
    trace
  });

  if (!plan.ok) {
    return failure({
      stage: 'plan_failed',
      parse,
      command,
      intent,
      plan,
      traceEvents: trace.getEvents(),
      resolverTraceEvents: resolverTrace.getEvents(),
      warnings: command.warnings,
      error: {
        code: 'LIVE_SEMANTIC_EDIT_PLAN_FAILED',
        message: plan.error.message
      }
    });
  }

  const validator = request.validator ?? createSemanticPatchValidator();
  const validation = callValidation({ validator, request, intent, patch: plan.patch, trace });
  if (!validation.ok) {
    const diff = createSemanticPatchDiffViewModel({
      patch: plan.patch,
      beforeDocument: request.document,
      validation,
      traceEvents: trace.getEvents(),
      options: request.patchDiffOptions
    });
    return failure({
      stage: 'validation_failed',
      parse,
      command,
      intent,
      plan,
      validation,
      diff,
      traceEvents: trace.getEvents(),
      resolverTraceEvents: resolverTrace.getEvents(),
      warnings: collectWarnings(command.warnings, diff.warnings),
      error: {
        code: 'LIVE_SEMANTIC_EDIT_VALIDATION_FAILED',
        message: 'Live semantic edit patch validation failed.'
      }
    });
  }

  if (request.autoApply === false) {
    const diff = createSemanticPatchDiffViewModel({
      patch: plan.patch,
      beforeDocument: request.document,
      validation,
      traceEvents: trace.getEvents(),
      options: request.patchDiffOptions
    });
    return {
      ok: true,
      stage: 'validated',
      parse,
      command,
      intent,
      plan,
      validation,
      diff,
      traceEvents: trace.getEvents(),
      resolverTraceEvents: resolverTrace.getEvents(),
      warnings: collectWarnings(command.warnings, diff.warnings)
    };
  }

  const applier =
    request.applier ??
    createSemanticPatchApplier({
      now: request.now,
      createRollbackPatchId: request.createRollbackPatchId
    });
  const apply = callApply({ applier, request, intent, patch: plan.patch, trace });
  if (!apply.ok) {
    const diff = createSemanticPatchDiffViewModel({
      patch: plan.patch,
      beforeDocument: request.document,
      validation,
      applyResult: apply,
      traceEvents: trace.getEvents(),
      options: request.patchDiffOptions
    });
    return failure({
      stage: 'apply_failed',
      parse,
      command,
      intent,
      plan,
      validation,
      apply,
      diff,
      traceEvents: trace.getEvents(),
      resolverTraceEvents: resolverTrace.getEvents(),
      warnings: collectWarnings(command.warnings, diff.warnings),
      error: {
        code: 'LIVE_SEMANTIC_EDIT_APPLY_FAILED',
        message: apply.error.message
      }
    });
  }

  const resolver = request.resolver ?? createResolverV2();
  const resolverResult = traceResolverV2Resolve({
    resolver,
    request: {
      document: apply.document,
      semanticIndex: request.semanticIndex
    },
    trace: resolverTrace,
    resolverRunId: request.correlationId === undefined ? undefined : `${request.correlationId}:resolver`
  });
  const gate = request.irGate ?? createResolverV2IrIntegrationGate();
  const gateResult = traceResolverV2IrGate({
    gate,
    request: {
      document: apply.document,
      semanticIndex: request.semanticIndex,
      resolver,
      resolverResult
    },
    trace: resolverTrace,
    gateRunId: request.correlationId === undefined ? undefined : `${request.correlationId}:ir_gate`
  });
  const diff = createSemanticPatchDiffViewModel({
    patch: apply.appliedPatch,
    beforeDocument: request.document,
    afterDocument: apply.document,
    validation,
    applyResult: apply,
    traceEvents: trace.getEvents(),
    options: request.patchDiffOptions
  });
  const diagnostics = createResolverV2DiagnosticsViewModel({
    resolverResult,
    gateResult,
    traceEvents: resolverTrace.getEvents()
  });
  const warnings = collectWarnings(command.warnings, diff.warnings, diagnostics.warnings);

  if (gateResult.status === 'blocked') {
    return failure({
      stage: 'resolver_blocked',
      parse,
      command,
      intent,
      plan,
      validation,
      apply,
      resolver: resolverResult,
      irGate: gateResult,
      diff,
      diagnostics,
      document: apply.document,
      traceEvents: trace.getEvents(),
      resolverTraceEvents: resolverTrace.getEvents(),
      warnings,
      error: {
        code: 'LIVE_SEMANTIC_EDIT_RESOLVER_BLOCKED',
        message: 'Live semantic edit applied in memory, but Resolver V2 IR gate blocked the result.'
      }
    });
  }

  return {
    ok: true,
    stage: 'applied',
    parse,
    command,
    intent,
    plan,
    validation,
    apply,
    resolver: resolverResult,
    irGate: gateResult,
    diff,
    diagnostics,
    document: apply.document,
    traceEvents: trace.getEvents(),
    resolverTraceEvents: resolverTrace.getEvents(),
    warnings
  };
}

function callPlan(input: {
  planner: NonNullable<RunLiveSemanticEditRequest['planner']>;
  request: RunLiveSemanticEditRequest;
  intent: SemanticEditIntent;
  beforeHash: string;
  trace: Parameters<typeof traceSemanticPatchPlan>[0]['trace'];
}): SemanticPatchPlanResult {
  try {
    return traceSemanticPatchPlan({
      planner: input.planner,
      request: {
        intent: input.intent,
        semanticIndex: input.request.semanticIndex,
        beforeHash: input.beforeHash,
        now: input.request.now,
        createPatchId: input.request.createPatchId
      },
      trace: input.trace
    });
  } catch {
    return {
      ok: false,
      error: {
        code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION',
        intentId: input.intent.id,
        target: input.intent.target,
        kind: input.intent.kind,
        message: 'Live semantic edit planner failed unexpectedly.'
      }
    };
  }
}

function callValidation(input: {
  validator: NonNullable<RunLiveSemanticEditRequest['validator']>;
  request: RunLiveSemanticEditRequest;
  intent: SemanticEditIntent;
  patch: SemanticPatch;
  trace: Parameters<typeof traceSemanticPatchValidation>[0]['trace'];
}): SemanticPatchValidationResult {
  try {
    return traceSemanticPatchValidation({
      validator: input.validator,
      request: {
        patch: input.patch,
        intent: input.intent,
        semanticIndex: input.request.semanticIndex
      },
      trace: input.trace
    });
  } catch {
    return {
      ok: false,
      errors: [
        {
          severity: 'error',
          code: 'LIVE_SEMANTIC_EDIT_VALIDATION_EXCEPTION',
          message: 'Live semantic edit validation failed unexpectedly.'
        }
      ],
      warnings: []
    };
  }
}

function callApply(input: {
  applier: NonNullable<RunLiveSemanticEditRequest['applier']>;
  request: RunLiveSemanticEditRequest;
  intent: SemanticEditIntent;
  patch: SemanticPatch;
  trace: Parameters<typeof traceSemanticPatchApply>[0]['trace'];
}): SemanticPatchApplyResult {
  try {
    return traceSemanticPatchApply({
      applier: input.applier,
      request: {
        document: input.request.document,
        patch: input.patch,
        intent: input.intent,
        semanticIndex: input.request.semanticIndex
      },
      trace: input.trace
    });
  } catch {
    return {
      ok: false,
      error: {
        code: 'SEMANTIC_PATCH_APPLIER_EXCEPTION',
        message: 'Live semantic edit applier failed unexpectedly.'
      }
    };
  }
}

function failure(input: {
  stage: Exclude<LiveSemanticEditStage, 'applied' | 'validated'>;
  parse: LiveSemanticEditParseResult;
  command?: LiveSemanticEditResult['command'];
  intent?: LiveSemanticEditResult['intent'];
  plan?: LiveSemanticEditResult['plan'];
  validation?: LiveSemanticEditResult['validation'];
  apply?: LiveSemanticEditResult['apply'];
  resolver?: LiveSemanticEditResult['resolver'];
  irGate?: LiveSemanticEditResult['irGate'];
  diff?: LiveSemanticEditResult['diff'];
  diagnostics?: LiveSemanticEditResult['diagnostics'];
  document?: unknown;
  traceEvents: LiveSemanticEditResult['traceEvents'];
  resolverTraceEvents: LiveSemanticEditResult['resolverTraceEvents'];
  warnings: string[];
  error: LiveSemanticEditError;
}): LiveSemanticEditResult {
  return {
    ok: false,
    ...input
  };
}

function sceneTargetToPath(sceneTarget: `scene:${string}`): string {
  return `/scenes/${sceneTarget.slice('scene:'.length)}`;
}

function collectWarnings(...groups: readonly string[][]): string[] {
  return groups.flatMap((group) => group);
}
