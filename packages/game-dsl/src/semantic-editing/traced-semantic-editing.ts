import type {
  SemanticPatchApplyRequest,
  SemanticPatchApplyResult,
  SemanticPatchRollbackRequest,
  SemanticPatchRollbackResult
} from './patch-applier-types.js';
import type { SemanticPatchValidationRequest, SemanticPatchValidator } from './patch-validator.js';
import type {
  SemanticPatchPlanRequest,
  SemanticPatchPlanResult,
  SemanticPatchPlanner
} from './patch-planner.js';
import type { SemanticPatchApplier } from './patch-applier-types.js';
import type { SemanticPatchValidationResult } from './types.js';
import type { SemanticEditingTraceRecorder } from './trace-recorder.js';
import {
  intentEnvelope,
  patchEnvelope,
  summarizeApplyResultForTrace,
  summarizeIntentForTrace,
  summarizePlannerError,
  summarizePatchForTrace,
  summarizeRollbackResultForTrace,
  summarizeValidationForTrace
} from './trace-summaries.js';

export type TraceSemanticPatchPlanRequest = { planner: SemanticPatchPlanner; request: SemanticPatchPlanRequest; trace: SemanticEditingTraceRecorder };
export type TraceSemanticPatchValidationRequest = { validator: SemanticPatchValidator; request: SemanticPatchValidationRequest; trace: SemanticEditingTraceRecorder };
export type TraceSemanticPatchApplyRequest = { applier: SemanticPatchApplier; request: SemanticPatchApplyRequest; trace: SemanticEditingTraceRecorder };
export type TraceSemanticPatchRollbackRequest = { applier: SemanticPatchApplier; request: SemanticPatchRollbackRequest; trace: SemanticEditingTraceRecorder };

const WRAPPED_EXCEPTION_CODE = 'WRAPPED_EXCEPTION';

export function traceSemanticPatchPlan(input: TraceSemanticPatchPlanRequest): SemanticPatchPlanResult {
  const intent = summarizeIntentForTrace(input.request.intent);
  input.trace.emit({
    type: 'semantic_edit.intent.created',
    severity: 'info',
    ...intentEnvelope(intent),
    payload: { intent }
  });

  let result: SemanticPatchPlanResult;
  try {
    result = input.planner.plan(input.request);
  } catch (cause) {
    input.trace.emit({
      type: 'semantic_edit.patch.plan_failed',
      severity: 'error',
      ...intentEnvelope(intent),
      payload: {
        error: summarizePlannerError({
          code: WRAPPED_EXCEPTION_CODE,
          target: intent.target,
          kind: intent.kind
        })
      }
    });
    throw cause;
  }

  if (result.ok) {
    const patch = summarizePatchForTrace(result.patch);
    input.trace.emit({
      type: 'semantic_edit.intent.resolved',
      severity: 'info',
      intentId: result.patch.intentId,
      target: result.patch.target,
      kind: intent.kind,
      payload: { targetFound: true, target: result.patch.target }
    });
    input.trace.emit({
      type: 'semantic_edit.patch.proposed',
      severity: 'info',
      intentId: result.patch.intentId,
      patchId: result.patch.id,
      target: result.patch.target,
      kind: intent.kind,
      payload: { patch }
    });
    return result;
  }

  if (result.error.code === 'INVALID_SEMANTIC_EDIT_INTENT' || result.error.code === 'SEMANTIC_TARGET_NOT_FOUND') {
    input.trace.emit({
      type: 'semantic_edit.intent.rejected',
      severity: 'error',
      intentId: result.error.intentId ?? intent.id,
      target: result.error.target ?? intent.target,
      kind: result.error.kind ?? intent.kind,
      payload: {
        error: summarizePlannerError(result.error)
      }
    });
  }

  input.trace.emit({
    type: 'semantic_edit.patch.plan_failed',
    severity: 'error',
    intentId: result.error.intentId ?? intent.id,
    target: result.error.target ?? intent.target,
    kind: result.error.kind ?? intent.kind,
    payload: {
      error: summarizePlannerError(result.error)
    }
  });
  return result;
}

export function traceSemanticPatchValidation(
  input: TraceSemanticPatchValidationRequest
): SemanticPatchValidationResult {
  const patch = summarizePatchForTrace(input.request.patch);
  input.trace.emit({
    type: 'semantic_edit.patch.validation_started',
    severity: 'info',
    ...patchEnvelope(patch),
    payload: { patch }
  });

  let validation: SemanticPatchValidationResult;
  try {
    validation = input.validator.validate(input.request);
  } catch (cause) {
    input.trace.emit({
      type: 'semantic_edit.patch.rejected',
      severity: 'error',
      ...patchEnvelope(patch),
      payload: { validation: wrappedExceptionValidationSummary() }
    });
    throw cause;
  }
  input.trace.emit({
    type: validation.ok ? 'semantic_edit.patch.validated' : 'semantic_edit.patch.rejected',
    severity: validation.ok ? 'info' : 'error',
    ...patchEnvelope(patch),
    payload: { validation: summarizeValidationForTrace(validation) }
  });

  return validation;
}

export function traceSemanticPatchApply(input: TraceSemanticPatchApplyRequest): SemanticPatchApplyResult {
  const patch = summarizePatchForTrace(input.request.patch);
  input.trace.emit({
    type: 'semantic_edit.patch.apply_started',
    severity: 'info',
    ...patchEnvelope(patch),
    payload: { patch }
  });

  let result: SemanticPatchApplyResult;
  try {
    result = input.applier.apply(input.request);
  } catch (cause) {
    input.trace.emit({
      type: 'semantic_edit.patch.apply_failed',
      severity: 'error',
      ...patchEnvelope(patch),
      payload: { apply: { ok: false, errorCode: WRAPPED_EXCEPTION_CODE } }
    });
    throw cause;
  }
  input.trace.emit({
    type: result.ok ? 'semantic_edit.patch.applied' : 'semantic_edit.patch.apply_failed',
    severity: result.ok ? 'info' : 'error',
    ...patchEnvelope(result.ok ? summarizePatchForTrace(result.appliedPatch) : patch),
    payload: { apply: summarizeApplyResultForTrace(result) }
  });

  return result;
}

export function traceSemanticPatchRollback(input: TraceSemanticPatchRollbackRequest): SemanticPatchRollbackResult {
  const appliedPatch = summarizePatchForTrace(input.request.appliedPatch);
  const rollbackPatch = summarizePatchForTrace(input.request.rollbackPatch);
  input.trace.emit({
    type: 'semantic_edit.rollback.started',
    severity: 'info',
    ...patchEnvelope(rollbackPatch),
    payload: { appliedPatch, rollbackPatch }
  });

  let result: SemanticPatchRollbackResult;
  try {
    result = input.applier.rollback(input.request);
  } catch (cause) {
    input.trace.emit({
      type: 'semantic_edit.rollback.failed',
      severity: 'error',
      ...patchEnvelope(rollbackPatch),
      payload: { rollback: { ok: false, errorCode: WRAPPED_EXCEPTION_CODE } }
    });
    throw cause;
  }
  input.trace.emit({
    type: result.ok ? 'semantic_edit.rollback.completed' : 'semantic_edit.rollback.failed',
    severity: result.ok ? 'info' : 'error',
    ...patchEnvelope(result.ok ? summarizePatchForTrace(result.appliedRollbackPatch) : rollbackPatch),
    payload: { rollback: summarizeRollbackResultForTrace(result) }
  });

  return result;
}

function wrappedExceptionValidationSummary() {
  return {
    ok: false,
    errorCount: 1,
    warningCount: 0,
    errors: [{ code: WRAPPED_EXCEPTION_CODE }],
    warnings: []
  };
}
