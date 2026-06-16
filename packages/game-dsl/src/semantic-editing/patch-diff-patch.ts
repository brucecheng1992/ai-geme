import type { SemanticPatchDiffPatchSummary } from './patch-diff-types.js';
import { SemanticPatchSchema } from './patch-schema.js';
import type { SemanticPatch, SemanticPatchOperation } from './types.js';

export type ParsedPatchForDiff = {
  operations: SemanticPatchOperation[];
  summary: SemanticPatchDiffPatchSummary;
  warnings: string[];
};

type LooseSemanticPatchForDiff = {
  id: string;
  intentId: string;
  target: string;
  operations: SemanticPatchOperation[];
  beforeHash: string;
  afterHash?: string;
  status: string;
  createdAt: string;
};

export function parseSemanticPatchForDiff(patch: unknown): ParsedPatchForDiff {
  const strictResult = SemanticPatchSchema.safeParse(patch);
  if (strictResult.success) {
    return {
      operations: strictResult.data.operations,
      summary: summarizePatch(strictResult.data, true, strictResult.data.operations.length),
      warnings: []
    };
  }

  const loosePatch = parseLoosePatch(patch);
  const warning = 'INVALID_SEMANTIC_PATCH_SCHEMA: Semantic patch failed schema validation.';
  if (loosePatch === undefined) {
    return {
      operations: [],
      summary: summarizeInvalidPatch(patch, 0),
      warnings: [warning]
    };
  }

  return {
    operations: loosePatch.operations,
    summary: summarizePatch(loosePatch, false, loosePatch.operations.length),
    warnings: [warning]
  };
}

function parseLoosePatch(value: unknown): LooseSemanticPatchForDiff | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = readString(value, 'id');
  const intentId = readString(value, 'intentId');
  const target = readString(value, 'target');
  const beforeHash = readString(value, 'beforeHash');
  const status = readString(value, 'status');
  const createdAt = readString(value, 'createdAt');
  if (
    id === undefined ||
    intentId === undefined ||
    target === undefined ||
    beforeHash === undefined ||
    status === undefined ||
    createdAt === undefined ||
    !Array.isArray(value.operations)
  ) {
    return undefined;
  }

  return {
    id,
    intentId,
    target,
    operations: value.operations.flatMap(parseLooseOperation),
    beforeHash,
    afterHash: readString(value, 'afterHash'),
    status,
    createdAt
  };
}

function parseLooseOperation(value: unknown): SemanticPatchOperation[] {
  if (!isRecord(value)) {
    return [];
  }

  const op = readString(value, 'op');
  const path = readString(value, 'path');
  if (op === undefined || path === undefined) {
    return [];
  }

  if (op === 'remove') {
    return [{ op, path }];
  }

  if (op === 'set' || op === 'add' || op === 'replace') {
    return hasOwn(value, 'value') ? [{ op, path, value: value.value }] : [];
  }

  return [];
}

function summarizePatch(
  patch: SemanticPatch | LooseSemanticPatchForDiff,
  valid: boolean,
  operationCount: number
): SemanticPatchDiffPatchSummary {
  return {
    id: patch.id,
    intentId: patch.intentId,
    target: patch.target,
    status: patch.status,
    beforeHash: patch.beforeHash,
    afterHash: patch.afterHash,
    operationCount,
    valid
  };
}

function summarizeInvalidPatch(patch: unknown, operationCount: number): SemanticPatchDiffPatchSummary {
  if (!isRecord(patch)) {
    return { operationCount, valid: false };
  }

  return {
    id: readString(patch, 'id'),
    intentId: readString(patch, 'intentId'),
    target: readString(patch, 'target'),
    status: readString(patch, 'status'),
    beforeHash: readString(patch, 'beforeHash'),
    afterHash: readString(patch, 'afterHash'),
    operationCount,
    valid: false
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}
