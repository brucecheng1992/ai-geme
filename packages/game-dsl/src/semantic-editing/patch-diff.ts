import {
  isSafeSemanticPatchDiffPath,
  isSensitiveSemanticPatchDiffPath,
  readSemanticPatchDiffPathValue,
  type SemanticPatchDiffPathReadResult
} from './patch-diff-path.js';
import {
  createSemanticPatchDiffPreviewFromReadResult,
  normalizeSemanticPatchDiffPreviewOptions
} from './patch-diff-preview.js';
import { parseSemanticPatchForDiff } from './patch-diff-patch.js';
import {
  collectSemanticPatchDiffOperationIssues,
  summarizeSemanticPatchDiffApplyResult,
  summarizeSemanticPatchDiffResultWarnings,
  summarizeSemanticPatchDiffRollbackResult,
  summarizeSemanticPatchDiffTraceEvents,
  summarizeSemanticPatchDiffTraceWarnings,
  summarizeSemanticPatchDiffValidation,
  toSemanticPatchDiffOperationIssue
} from './patch-diff-summaries.js';
import type {
  CreateSemanticPatchDiffViewModelInput,
  CreateSemanticPatchDiffViewModelOptions,
  SemanticPatchDiffOperationEffect,
  SemanticPatchDiffOperationRow,
  SemanticPatchDiffViewModel
} from './patch-diff-types.js';
import type { SemanticPatchOperation, SemanticPatchValidationIssue } from './types.js';

export { createSemanticPatchDiffValuePreview } from './patch-diff-preview.js';
export type {
  CreateSemanticPatchDiffViewModelInput,
  CreateSemanticPatchDiffViewModelOptions,
  SemanticPatchDiffApplySummary,
  SemanticPatchDiffOperationEffect,
  SemanticPatchDiffOperationIssue,
  SemanticPatchDiffOperationRow,
  SemanticPatchDiffPatchSummary,
  SemanticPatchDiffTraceSummary,
  SemanticPatchDiffValidationIssue,
  SemanticPatchDiffValidationSummary,
  SemanticPatchDiffValueKind,
  SemanticPatchDiffValuePreview,
  SemanticPatchDiffViewModel
} from './patch-diff-types.js';

export function createSemanticPatchDiffViewModel(input: CreateSemanticPatchDiffViewModelInput): SemanticPatchDiffViewModel {
  try {
    const parsedPatch = parseSemanticPatchForDiff(input.patch);
    const previewOptions = normalizeSemanticPatchDiffPreviewOptions(input.options);
    const validation = summarizeSemanticPatchDiffValidation(input.validation);
    const operationIssues = collectSemanticPatchDiffOperationIssues(input.validation);
    const operations = parsedPatch.operations.map((operation, index) =>
      createOperationRow({
        operation,
        index,
        beforeDocument: input.beforeDocument,
        afterDocument: input.afterDocument,
        validationIssues: operationIssues,
        options: previewOptions
      })
    );

    return {
      patch: parsedPatch.summary,
      operations,
      validation,
      apply: summarizeSemanticPatchDiffApplyResult(input.applyResult),
      rollback: summarizeSemanticPatchDiffRollbackResult(input.rollbackResult),
      trace: summarizeSemanticPatchDiffTraceEvents(input.traceEvents),
      warnings: [
        ...parsedPatch.warnings,
        ...summarizeSemanticPatchDiffTraceWarnings(input.traceEvents),
        ...summarizeSemanticPatchDiffResultWarnings(input.applyResult, 'apply'),
        ...summarizeSemanticPatchDiffResultWarnings(input.rollbackResult, 'rollback')
      ]
    };
  } catch (cause) {
    return {
      patch: { operationCount: 0, valid: false },
      operations: [],
      warnings: ['SEMANTIC_PATCH_DIFF_VIEW_MODEL_ERROR']
    };
  }
}

function createOperationRow(input: {
  operation: SemanticPatchOperation;
  index: number;
  beforeDocument: unknown;
  afterDocument: unknown;
  validationIssues: SemanticPatchValidationIssue[];
  options: Required<CreateSemanticPatchDiffViewModelOptions>;
}): SemanticPatchDiffOperationRow {
  const beforeValue = readSemanticPatchDiffPathValue(input.beforeDocument, input.operation.path);
  const afterValue = readAfterValue(input.afterDocument, input.operation);
  const forceRedacted = isSensitiveSemanticPatchDiffPath(input.operation.path, input.options.redactedKeys);
  const rowIssues = input.validationIssues.filter(
    (issue) => issue.operationIndex === input.index || (issue.operationIndex === undefined && issue.path === input.operation.path)
  );

  return {
    index: input.index,
    op: input.operation.op,
    path: input.operation.path,
    effect: inferEffect(input.operation, beforeValue),
    before: createSemanticPatchDiffPreviewFromReadResult(beforeValue, input.options, forceRedacted),
    after: createSemanticPatchDiffPreviewFromReadResult(afterValue, input.options, forceRedacted),
    validationCodes: rowIssues.map((issue) => issue.code),
    validationIssues: rowIssues.map(toSemanticPatchDiffOperationIssue),
    safePath: isSafeSemanticPatchDiffPath(input.operation.path)
  };
}

function readAfterValue(afterDocument: unknown, operation: SemanticPatchOperation): SemanticPatchDiffPathReadResult {
  if (operation.op === 'remove') {
    return { exists: false };
  }

  const documentValue = readSemanticPatchDiffPathValue(afterDocument, operation.path);
  if (documentValue.exists) {
    return documentValue;
  }

  return { exists: true, value: operation.value };
}

function inferEffect(
  operation: SemanticPatchOperation,
  beforeValue: SemanticPatchDiffPathReadResult
): SemanticPatchDiffOperationEffect {
  if (operation.op === 'add') {
    return 'create';
  }

  if (operation.op === 'remove') {
    return 'delete';
  }

  if (operation.op === 'replace') {
    return 'replace';
  }

  if (operation.op === 'set') {
    return beforeValue.exists ? 'update' : 'create';
  }

  return 'unknown';
}
