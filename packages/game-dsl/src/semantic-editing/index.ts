export {
  isSemanticId,
  makeSemanticId,
  parseSemanticId,
  SEMANTIC_ID_KINDS,
  type ParsedSemanticId,
  type SemanticId,
  type SemanticIdKind
} from './semantic-address.js';
export { buildSemanticIndex, type SemanticIndex, type SemanticIndexEntry, type SemanticNodeRef } from './semantic-index.js';
export { defaultSemanticPatchGuards } from './guards.js';
export { SemanticEditIntentSchema } from './intent-schema.js';
export { hashSemanticPatchDocument, type SemanticPatchDocument, type SemanticPatchDocumentHasher } from './document-hash.js';
export { createSemanticPatchApplier } from './patch-applier.js';
export {
  type SemanticPatchApplier,
  type SemanticPatchApplierOptions,
  type SemanticPatchApplyError,
  type SemanticPatchApplyErrorCode,
  type SemanticPatchApplyFailure,
  type SemanticPatchApplyRequest,
  type SemanticPatchApplyResult,
  type SemanticPatchApplySuccess,
  type SemanticPatchRollbackFailure,
  type SemanticPatchRollbackRequest,
  type SemanticPatchRollbackResult,
  type SemanticPatchRollbackSuccess
} from './patch-applier-types.js';
export {
  createSemanticPatchPlanner,
  type SemanticPatchPlanRequest,
  type SemanticPatchPlanResult,
  type SemanticPatchPlanner,
  type SemanticPatchPlannerError,
  type SemanticPatchPlannerErrorCode,
  type SemanticPatchPlannerHandler,
  type SemanticPatchPlannerHandlerInput,
  type SemanticPatchPlannerHandlers
} from './patch-planner.js';
export { SemanticPatchSchema } from './patch-schema.js';
export {
  createSemanticPatchValidator,
  type SemanticPatchGuard,
  type SemanticPatchGuardInput,
  type SemanticPatchValidationRequest,
  type SemanticPatchValidator,
  type SemanticPatchValidatorOptions
} from './patch-validator.js';
export {
  SEMANTIC_EDIT_INTENT_KINDS,
  SEMANTIC_EDIT_REASON_SOURCES,
  SEMANTIC_PATCH_STATUSES,
  type SemanticEditConstraints,
  type SemanticEditIntent,
  type SemanticEditIntentKind,
  type SemanticEditReason,
  type SemanticEditReasonSource,
  type SemanticPatch,
  type SemanticPatchOperation,
  type SemanticPatchStatus,
  type SemanticPatchValidation,
  type SemanticPatchValidationIssue,
  type SemanticPatchValidationIssueCode,
  type SemanticPatchValidationResult,
  type SemanticPatchValidationSeverity
} from './types.js';
