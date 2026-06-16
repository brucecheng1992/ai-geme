import type {
  SemanticPatchApplyError,
  SemanticPatchApplyResult,
  SemanticPatchRollbackResult
} from './patch-applier-types.js';
import type { SemanticPatchValidationResult } from './types.js';

export type SemanticEditingIntentTraceSummary = {
  id?: string;
  kind?: string;
  target?: string;
  reasonSource?: string;
  hasReasonMessage?: boolean;
  payloadKeys?: string[];
  constraintKeys?: string[];
};

export type SemanticEditingPatchTraceSummary = {
  id?: string;
  intentId?: string;
  target?: string;
  status?: string;
  beforeHash?: string;
  afterHash?: string;
  operationCount?: number;
  operations?: Array<{ op: string; path: string }>;
};

export type SemanticEditingValidationTraceSummary = {
  ok: boolean;
  errorCount: number;
  warningCount: number;
  errors: Array<{ code: string; guardId?: string; path?: string; operationIndex?: number; target?: string }>;
  warnings: Array<{ code: string; guardId?: string; path?: string; operationIndex?: number; target?: string }>;
};

export type SemanticEditingApplyTraceSummary = {
  ok: boolean;
  beforeHash?: string;
  afterHash?: string;
  appliedPatchId?: string;
  rollbackPatchId?: string;
  errorCode?: string;
  errorPath?: string;
  operationIndex?: number;
  validation?: SemanticEditingValidationTraceSummary;
};

/**
 * Produces an audit-safe intent summary without copying intent.payload values.
 */
export function summarizeIntentForTrace(intent: unknown): SemanticEditingIntentTraceSummary {
  if (!isPlainRecord(intent)) {
    return {};
  }

  const reason = isPlainRecord(intent.reason) ? intent.reason : undefined;
  const payload = isPlainRecord(intent.payload) ? intent.payload : undefined;
  const constraints = isPlainRecord(intent.constraints) ? intent.constraints : undefined;

  return {
    ...stringField(intent, 'id'),
    ...stringField(intent, 'kind'),
    ...stringField(intent, 'target'),
    ...(typeof reason?.source === 'string' ? { reasonSource: reason.source } : {}),
    ...(reason === undefined ? {} : { hasReasonMessage: typeof reason.message === 'string' && reason.message.trim().length > 0 }),
    ...(payload === undefined ? {} : { payloadKeys: sortedKeys(payload) }),
    ...(constraints === undefined ? {} : { constraintKeys: sortedKeys(constraints) })
  };
}

/**
 * Produces a patch summary that keeps operation op/path only and redacts operation values.
 */
export function summarizePatchForTrace(patch: unknown): SemanticEditingPatchTraceSummary {
  if (!isPlainRecord(patch)) {
    return {};
  }

  const operations = Array.isArray(patch.operations)
    ? patch.operations.map((operation) => ({
        op: isPlainRecord(operation) && typeof operation.op === 'string' ? operation.op : '<unknown>',
        path: isPlainRecord(operation) && typeof operation.path === 'string' ? operation.path : '<unknown>'
      }))
    : undefined;

  return {
    ...stringField(patch, 'id'),
    ...stringField(patch, 'intentId'),
    ...stringField(patch, 'target'),
    ...stringField(patch, 'status'),
    ...stringField(patch, 'beforeHash'),
    ...stringField(patch, 'afterHash'),
    ...(operations === undefined ? {} : { operationCount: operations.length, operations })
  };
}

export function summarizeValidationForTrace(validation: SemanticPatchValidationResult): SemanticEditingValidationTraceSummary {
  const errors = validation.errors.map(summarizeValidationIssue);
  const warnings = validation.warnings.map(summarizeValidationIssue);
  return { ok: validation.ok, errorCount: errors.length, warningCount: warnings.length, errors, warnings };
}

export function summarizeApplyResultForTrace(result: SemanticPatchApplyResult): SemanticEditingApplyTraceSummary {
  if (!result.ok) {
    return summarizeApplyError(result.error);
  }
  return {
    ok: true,
    beforeHash: result.beforeHash,
    afterHash: result.afterHash,
    appliedPatchId: result.appliedPatch.id,
    rollbackPatchId: result.rollbackPatch.id
  };
}

export function summarizeRollbackResultForTrace(result: SemanticPatchRollbackResult): SemanticEditingApplyTraceSummary {
  if (!result.ok) {
    return summarizeApplyError(result.error);
  }
  return {
    ok: true,
    beforeHash: result.beforeHash,
    afterHash: result.afterHash,
    appliedPatchId: result.appliedRollbackPatch.id,
    rollbackPatchId: result.rolledBackPatch.id
  };
}

export function intentEnvelope(intent: SemanticEditingIntentTraceSummary) {
  return {
    ...(intent.id === undefined ? {} : { intentId: intent.id }),
    ...(intent.target === undefined ? {} : { target: intent.target }),
    ...(intent.kind === undefined ? {} : { kind: intent.kind })
  };
}

export function patchEnvelope(patch: SemanticEditingPatchTraceSummary) {
  return {
    ...(patch.intentId === undefined ? {} : { intentId: patch.intentId }),
    ...(patch.id === undefined ? {} : { patchId: patch.id }),
    ...(patch.target === undefined ? {} : { target: patch.target })
  };
}

export function summarizePlannerError(error: { code: string; target?: string; kind?: string }) {
  return { code: error.code, target: error.target, kind: error.kind };
}

function summarizeApplyError(error: SemanticPatchApplyError): SemanticEditingApplyTraceSummary {
  return {
    ok: false,
    errorCode: error.code,
    errorPath: error.path,
    operationIndex: error.operationIndex,
    ...(error.validation === undefined ? {} : { validation: summarizeValidationForTrace(error.validation) })
  };
}

function summarizeValidationIssue(issue: SemanticPatchValidationResult['errors'][number]) {
  return {
    code: issue.code,
    guardId: issue.guardId,
    path: issue.path,
    operationIndex: issue.operationIndex,
    target: issue.target
  };
}

function stringField(record: Record<string, unknown>, key: string): Record<string, string> {
  const value = record[key];
  return typeof value === 'string' ? { [key]: value } : {};
}

function sortedKeys(record: Record<string, unknown>): string[] {
  return Object.keys(record).sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
