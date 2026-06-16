import type { SemanticPatchValidationSeverity } from './types.js';

export type SemanticPatchDiffValueKind =
  | 'missing'
  | 'null'
  | 'boolean'
  | 'number'
  | 'string'
  | 'array'
  | 'object'
  | 'unknown';

export type SemanticPatchDiffValuePreview = {
  kind: SemanticPatchDiffValueKind;
  preview: string;
  truncated: boolean;
  redacted: boolean;
  size?: number;
  keys?: string[];
};

export type SemanticPatchDiffOperationEffect = 'create' | 'update' | 'delete' | 'replace' | 'unknown';

export type SemanticPatchDiffOperationIssue = {
  severity: SemanticPatchValidationSeverity;
  code: string;
  guardId?: string;
  path?: string;
  target?: string;
};

export type SemanticPatchDiffOperationRow = {
  index: number;
  op: string;
  path: string;
  effect: SemanticPatchDiffOperationEffect;
  before: SemanticPatchDiffValuePreview;
  after: SemanticPatchDiffValuePreview;
  validationCodes: string[];
  validationIssues: SemanticPatchDiffOperationIssue[];
  safePath: boolean;
};

export type SemanticPatchDiffPatchSummary = {
  id?: string;
  intentId?: string;
  target?: string;
  status?: string;
  beforeHash?: string;
  afterHash?: string;
  operationCount: number;
  valid: boolean;
};

export type SemanticPatchDiffValidationIssue = {
  code: string;
  guardId?: string;
  path?: string;
  operationIndex?: number;
  target?: string;
};

export type SemanticPatchDiffValidationSummary = {
  ok?: boolean;
  errorCount: number;
  warningCount: number;
  errors: SemanticPatchDiffValidationIssue[];
  warnings: SemanticPatchDiffValidationIssue[];
};

export type SemanticPatchDiffApplySummary = {
  ok?: boolean;
  beforeHash?: string;
  afterHash?: string;
  appliedPatchId?: string;
  rollbackPatchId?: string;
  errorCode?: string;
  errorPath?: string;
  operationIndex?: number;
};

export type SemanticPatchDiffTraceSummary = Array<{
  id: string;
  type: string;
  at: string;
  severity: string;
  intentId?: string;
  patchId?: string;
  target?: string;
  kind?: string;
}>;

export type SemanticPatchDiffViewModel = {
  patch: SemanticPatchDiffPatchSummary;
  operations: SemanticPatchDiffOperationRow[];
  validation?: SemanticPatchDiffValidationSummary;
  apply?: SemanticPatchDiffApplySummary;
  rollback?: SemanticPatchDiffApplySummary;
  trace?: SemanticPatchDiffTraceSummary;
  warnings: string[];
};

export type CreateSemanticPatchDiffViewModelOptions = {
  maxPreviewLength?: number;
  maxPreviewDepth?: number;
  maxKeys?: number;
  redactedKeys?: string[];
};

export type CreateSemanticPatchDiffViewModelInput = {
  patch: unknown;
  beforeDocument?: unknown;
  afterDocument?: unknown;
  validation?: unknown;
  applyResult?: unknown;
  rollbackResult?: unknown;
  traceEvents?: readonly unknown[];
  options?: CreateSemanticPatchDiffViewModelOptions;
};
