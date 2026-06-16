import type { SemanticPatchDocument, SemanticPatchDocumentHasher } from './document-hash.js';
import type { SemanticPatchValidator } from './patch-validator.js';
import type { SemanticIndex } from './semantic-index.js';
import type { SemanticPatch, SemanticPatchValidationResult } from './types.js';

export type SemanticPatchApplyErrorCode =
  | 'INVALID_SEMANTIC_PATCH_DOCUMENT'
  | 'PATCH_VALIDATION_FAILED'
  | 'PATCH_BEFORE_HASH_MISMATCH'
  | 'PATCH_STATUS_NOT_PROPOSED'
  | 'PATCH_AFTER_HASH_ALREADY_SET'
  | 'SEMANTIC_PATCH_OPERATION_FAILED'
  | 'INVALID_APPLIED_PATCH'
  | 'INVALID_ROLLBACK_PATCH'
  | 'ROLLBACK_DOCUMENT_HASH_MISMATCH'
  | 'SEMANTIC_PATCH_APPLIER_EXCEPTION';

export type SemanticPatchApplyError = {
  code: SemanticPatchApplyErrorCode;
  message: string;
  intentId?: string;
  target?: string;
  path?: string;
  operationIndex?: number;
  cause?: unknown;
  validation?: SemanticPatchValidationResult;
};

export type SemanticPatchApplySuccess = {
  ok: true;
  document: SemanticPatchDocument;
  appliedPatch: SemanticPatch;
  rollbackPatch: SemanticPatch;
  beforeHash: string;
  afterHash: string;
  validation: SemanticPatchValidationResult;
};

export type SemanticPatchApplyFailure = {
  ok: false;
  error: SemanticPatchApplyError;
};

export type SemanticPatchApplyResult = SemanticPatchApplySuccess | SemanticPatchApplyFailure;

export type SemanticPatchApplyRequest = {
  document: SemanticPatchDocument;
  patch: unknown;
  intent: unknown;
  semanticIndex: SemanticIndex;
};

export type SemanticPatchRollbackRequest = {
  document: SemanticPatchDocument;
  appliedPatch: unknown;
  rollbackPatch: unknown;
  intent: unknown;
  semanticIndex: SemanticIndex;
};

export type SemanticPatchRollbackSuccess = {
  ok: true;
  document: SemanticPatchDocument;
  appliedRollbackPatch: SemanticPatch;
  rolledBackPatch: SemanticPatch;
  beforeHash: string;
  afterHash: string;
  validation: SemanticPatchValidationResult;
};

export type SemanticPatchRollbackFailure = {
  ok: false;
  error: SemanticPatchApplyError;
};

export type SemanticPatchRollbackResult = SemanticPatchRollbackSuccess | SemanticPatchRollbackFailure;

export type SemanticPatchApplierOptions = {
  validator?: SemanticPatchValidator;
  hashDocument?: SemanticPatchDocumentHasher;
  now?: () => Date;
  createRollbackPatchId?: (patch: SemanticPatch) => string;
};

export type SemanticPatchApplier = {
  apply(request: SemanticPatchApplyRequest): SemanticPatchApplyResult;
  rollback(request: SemanticPatchRollbackRequest): SemanticPatchRollbackResult;
};
