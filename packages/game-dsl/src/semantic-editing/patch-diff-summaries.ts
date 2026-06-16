import type {
  SemanticPatchApplyResult,
  SemanticPatchRollbackResult
} from './patch-applier-types.js';
import { SemanticEditingTraceEventSchema } from './trace-events.js';
import type { SemanticEditingTraceEvent } from './trace-events.js';
import type {
  SemanticPatchValidationIssue,
  SemanticPatchValidationResult,
  SemanticPatchValidationSeverity
} from './types.js';
import type {
  SemanticPatchDiffApplySummary,
  SemanticPatchDiffOperationIssue,
  SemanticPatchDiffTraceSummary,
  SemanticPatchDiffValidationIssue,
  SemanticPatchDiffValidationSummary
} from './patch-diff-types.js';

export function summarizeSemanticPatchDiffValidation(validation: unknown): SemanticPatchDiffValidationSummary | undefined {
  if (!isValidationResult(validation)) {
    return undefined;
  }

  return {
    ok: validation.ok,
    errorCount: validation.errors.length,
    warningCount: validation.warnings.length,
    errors: validation.errors.map(toValidationIssueSummary),
    warnings: validation.warnings.map(toValidationIssueSummary)
  };
}

export function collectSemanticPatchDiffOperationIssues(validation: unknown): SemanticPatchValidationIssue[] {
  if (!isValidationResult(validation)) {
    return [];
  }

  return [...validation.errors, ...validation.warnings];
}

export function summarizeSemanticPatchDiffApplyResult(result: unknown): SemanticPatchDiffApplySummary | undefined {
  if (!isApplyResult(result)) {
    return undefined;
  }

  if (result.ok) {
    return {
      ok: true,
      beforeHash: result.beforeHash,
      afterHash: result.afterHash,
      appliedPatchId: result.appliedPatch.id,
      rollbackPatchId: result.rollbackPatch.id
    };
  }

  return {
    ok: false,
    errorCode: result.error.code,
    errorPath: result.error.path,
    operationIndex: result.error.operationIndex
  };
}

export function summarizeSemanticPatchDiffRollbackResult(result: unknown): SemanticPatchDiffApplySummary | undefined {
  if (!isRollbackResult(result)) {
    return undefined;
  }

  if (result.ok) {
    return {
      ok: true,
      beforeHash: result.beforeHash,
      afterHash: result.afterHash,
      appliedPatchId: result.appliedRollbackPatch.id,
      rollbackPatchId: result.rolledBackPatch.id
    };
  }

  return {
    ok: false,
    errorCode: result.error.code,
    errorPath: result.error.path,
    operationIndex: result.error.operationIndex
  };
}

export function summarizeSemanticPatchDiffTraceEvents(traceEvents: unknown): SemanticPatchDiffTraceSummary | undefined {
  if (!Array.isArray(traceEvents)) {
    return undefined;
  }

  return traceEvents.flatMap((event) => {
    const parsed = SemanticEditingTraceEventSchema.safeParse(event);
    if (!parsed.success) {
      return [];
    }

    return [toTraceSummary(parsed.data)];
  });
}

export function summarizeSemanticPatchDiffTraceWarnings(traceEvents: unknown): string[] {
  if (traceEvents === undefined || Array.isArray(traceEvents)) {
    return [];
  }

  return ['INVALID_SEMANTIC_TRACE_EVENTS: traceEvents must be an array.'];
}

export function summarizeSemanticPatchDiffResultWarnings(result: unknown, label: 'apply' | 'rollback'): string[] {
  if (result === undefined) {
    return [];
  }

  if (label === 'apply' && isApplyResult(result)) {
    return [];
  }

  if (label === 'rollback' && isRollbackResult(result)) {
    return [];
  }

  return [`INVALID_SEMANTIC_PATCH_${label.toUpperCase()}_RESULT: ${label}Result could not be summarized.`];
}

export function toSemanticPatchDiffOperationIssue(issue: SemanticPatchValidationIssue): SemanticPatchDiffOperationIssue {
  return {
    severity: issue.severity,
    code: issue.code,
    ...(issue.guardId === undefined ? {} : { guardId: issue.guardId }),
    ...(issue.path === undefined ? {} : { path: issue.path }),
    ...(issue.target === undefined ? {} : { target: issue.target })
  };
}

function toTraceSummary(event: SemanticEditingTraceEvent): SemanticPatchDiffTraceSummary[number] {
  return {
    id: event.id,
    type: event.type,
    at: event.at,
    severity: event.severity,
    ...(event.intentId === undefined ? {} : { intentId: event.intentId }),
    ...(event.patchId === undefined ? {} : { patchId: event.patchId }),
    ...(event.target === undefined ? {} : { target: event.target }),
    ...(event.kind === undefined ? {} : { kind: event.kind })
  };
}

function toValidationIssueSummary(issue: SemanticPatchValidationIssue): SemanticPatchDiffValidationIssue {
  return {
    code: issue.code,
    ...(issue.guardId === undefined ? {} : { guardId: issue.guardId }),
    ...(issue.path === undefined ? {} : { path: issue.path }),
    ...(issue.operationIndex === undefined ? {} : { operationIndex: issue.operationIndex }),
    ...(issue.target === undefined ? {} : { target: issue.target })
  };
}

function isValidationResult(value: unknown): value is SemanticPatchValidationResult {
  return (
    isRecord(value) &&
    typeof value.ok === 'boolean' &&
    Array.isArray(value.errors) &&
    Array.isArray(value.warnings) &&
    value.errors.every(isValidationIssue) &&
    value.warnings.every(isValidationIssue)
  );
}

function isValidationIssue(value: unknown): value is SemanticPatchValidationIssue {
  return isRecord(value) && isSeverity(value.severity) && typeof value.code === 'string';
}

function isSeverity(value: unknown): value is SemanticPatchValidationSeverity {
  return value === 'error' || value === 'warning';
}

function isApplyResult(value: unknown): value is SemanticPatchApplyResult {
  if (!isRecord(value) || typeof value.ok !== 'boolean') {
    return false;
  }

  if (value.ok) {
    return (
      isRecord(value.appliedPatch) &&
      typeof value.appliedPatch.id === 'string' &&
      isRecord(value.rollbackPatch) &&
      typeof value.rollbackPatch.id === 'string' &&
      typeof value.beforeHash === 'string' &&
      typeof value.afterHash === 'string'
    );
  }

  return isRecord(value.error) && typeof value.error.code === 'string';
}

function isRollbackResult(value: unknown): value is SemanticPatchRollbackResult {
  if (!isRecord(value) || typeof value.ok !== 'boolean') {
    return false;
  }

  if (value.ok) {
    return (
      isRecord(value.appliedRollbackPatch) &&
      typeof value.appliedRollbackPatch.id === 'string' &&
      isRecord(value.rolledBackPatch) &&
      typeof value.rolledBackPatch.id === 'string' &&
      typeof value.beforeHash === 'string' &&
      typeof value.afterHash === 'string'
    );
  }

  return isRecord(value.error) && typeof value.error.code === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
