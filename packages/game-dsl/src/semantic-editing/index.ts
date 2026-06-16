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
  createFixBlankPreviewRepairHandler,
  createFixBlankPreviewRepairHandlers,
  FIX_BLANK_PREVIEW_REPAIR_KIND,
  type FixBlankPreviewRepairHandlerOptions,
  type FixBlankPreviewRepairPayload
} from './repair-packs/index.js';
export {
  SemanticEditingTraceEventSchema,
  SemanticEditingTraceEventTypeSchema,
  SemanticEditingTraceSeveritySchema,
  type SemanticEditingTraceEvent,
  type SemanticEditingTraceEventType,
  type SemanticEditingTraceSeverity
} from './trace-events.js';
export {
  type SemanticEditingApplyTraceSummary,
  type SemanticEditingIntentTraceSummary,
  type SemanticEditingPatchTraceSummary,
  type SemanticEditingValidationTraceSummary
} from './trace-summaries.js';
export {
  createSemanticEditingTraceRecorder,
  type SemanticEditingTraceRecorder,
  type SemanticEditingTraceRecorderOptions,
  type SemanticEditingTraceSink
} from './trace-recorder.js';
export {
  traceSemanticPatchApply,
  traceSemanticPatchPlan,
  traceSemanticPatchRollback,
  traceSemanticPatchValidation,
  type TraceSemanticPatchApplyRequest,
  type TraceSemanticPatchPlanRequest,
  type TraceSemanticPatchRollbackRequest,
  type TraceSemanticPatchValidationRequest
} from './traced-semantic-editing.js';
export {
  createSemanticPatchDiffValuePreview,
  createSemanticPatchDiffViewModel,
  type CreateSemanticPatchDiffViewModelInput,
  type CreateSemanticPatchDiffViewModelOptions,
  type SemanticPatchDiffApplySummary,
  type SemanticPatchDiffOperationEffect,
  type SemanticPatchDiffOperationIssue,
  type SemanticPatchDiffOperationRow,
  type SemanticPatchDiffPatchSummary,
  type SemanticPatchDiffTraceSummary,
  type SemanticPatchDiffValidationIssue,
  type SemanticPatchDiffValidationSummary,
  type SemanticPatchDiffValueKind,
  type SemanticPatchDiffValuePreview,
  type SemanticPatchDiffViewModel
} from './patch-diff.js';
export {
  createFalsePlayableRepairIntent,
  detectSemanticFalsePlayableFindings,
  runSemanticFalsePlayableRepairLoop,
  type CreateFalsePlayableRepairIntentOptions,
  type DetectSemanticFalsePlayableOptions,
  type RunSemanticFalsePlayableRepairLoopRequest,
  type SemanticFalsePlayableDetectionResult,
  type SemanticFalsePlayableFinding,
  type SemanticFalsePlayableRepairLoopError,
  type SemanticFalsePlayableRepairLoopFailure,
  type SemanticFalsePlayableRepairLoopNoop,
  type SemanticFalsePlayableRepairLoopResult,
  type SemanticFalsePlayableRepairLoopStage,
  type SemanticFalsePlayableRepairLoopSuccess,
  type SemanticFalsePlayableSeverity
} from './qa-false-playable/index.js';
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
