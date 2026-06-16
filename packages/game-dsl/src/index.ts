export { GameBriefSchema, type GameBrief } from './schemas/game-brief-v0.1.schema.js';
export { RawGameDslSchema, type RawGameDsl } from './schemas/raw-game-dsl-v0.1.schema.js';
export { NormalizedGameIrSchema, type NormalizedGameIr } from './schemas/normalized-game-ir-v0.1.schema.js';
export {
  EntitySemanticProfileSchema,
  GameSemanticModelSchema,
  GameplayRoleSchema,
  SemanticStrictnessSchema,
  VisualConceptSchema,
  type EntitySemanticProfile,
  type GameSemanticModel,
  type GameplayRole,
  type SemanticStrictness,
  type VisualConcept
} from './semantic/semantic-model.schema.js';
export {
  buildSemanticModelReport,
  SemanticModelReportSchema,
  SEMANTIC_MODEL_REPORT_VERSION,
  type SemanticModelReport
} from './semantic/semantic-model-report.js';
export {
  buildSemanticExtractionTrace,
  buildSemanticExtractionTraceReport,
  type BuildSemanticExtractionTraceInput
} from './semantic/semantic-extraction-trace.js';
export {
  buildSemanticIndex,
  createFixBlankPreviewRepairHandler,
  createFixBlankPreviewRepairHandlers,
  createSemanticPatchApplier,
  createSemanticPatchPlanner,
  createSemanticPatchValidator,
  defaultSemanticPatchGuards,
  FIX_BLANK_PREVIEW_REPAIR_KIND,
  hashSemanticPatchDocument,
  isSemanticId,
  makeSemanticId,
  parseSemanticId,
  SemanticEditIntentSchema,
  SemanticPatchSchema,
  SEMANTIC_EDIT_INTENT_KINDS,
  SEMANTIC_EDIT_REASON_SOURCES,
  SEMANTIC_PATCH_STATUSES,
  SEMANTIC_ID_KINDS,
  type FixBlankPreviewRepairHandlerOptions,
  type FixBlankPreviewRepairPayload,
  type ParsedSemanticId,
  type SemanticEditConstraints,
  type SemanticEditIntent,
  type SemanticEditIntentKind,
  type SemanticEditReason,
  type SemanticEditReasonSource,
  type SemanticId,
  type SemanticIdKind,
  type SemanticIndex,
  type SemanticIndexEntry,
  type SemanticNodeRef,
  type SemanticPatch,
  type SemanticPatchApplier,
  type SemanticPatchApplierOptions,
  type SemanticPatchApplyError,
  type SemanticPatchApplyErrorCode,
  type SemanticPatchApplyFailure,
  type SemanticPatchApplyRequest,
  type SemanticPatchApplyResult,
  type SemanticPatchApplySuccess,
  type SemanticPatchDocument,
  type SemanticPatchDocumentHasher,
  type SemanticPatchGuard,
  type SemanticPatchGuardInput,
  type SemanticPatchPlanRequest,
  type SemanticPatchPlanResult,
  type SemanticPatchPlanner,
  type SemanticPatchPlannerError,
  type SemanticPatchPlannerErrorCode,
  type SemanticPatchPlannerHandler,
  type SemanticPatchPlannerHandlerInput,
  type SemanticPatchPlannerHandlers,
  type SemanticPatchOperation,
  type SemanticPatchStatus,
  type SemanticPatchValidation,
  type SemanticPatchValidationIssue,
  type SemanticPatchValidationIssueCode,
  type SemanticPatchValidationRequest,
  type SemanticPatchValidationResult,
  type SemanticPatchValidationSeverity,
  type SemanticPatchValidator,
  type SemanticPatchValidatorOptions,
  type SemanticPatchRollbackFailure,
  type SemanticPatchRollbackRequest,
  type SemanticPatchRollbackResult,
  type SemanticPatchRollbackSuccess
} from './semantic-editing/index.js';
export {
  ExtractionSourceSchema,
  SemanticExtractionTraceEntrySchema,
  SemanticExtractionTraceReportSchema,
  SemanticExtractionTraceSchema,
  type ExtractionSource,
  type SemanticExtractionTrace,
  type SemanticExtractionTraceEntry,
  type SemanticExtractionTraceReport
} from './semantic/semantic-extraction-trace.schema.js';
export { DslPatchSchema, type DslPatch, type DslPatchOperation } from './schemas/dsl-patch-v0.1.schema.js';
export {
  buildGameDslArtifact,
  buildDslValidationReport,
  validateGameDslArtifact,
  withDslValidationSourceArtifact,
  GameDslArtifactSchema,
  DslValidationReportSchema,
  GAME_DSL_ARTIFACT_KIND,
  GAME_DSL_SCHEMA_VERSION,
  DSL_VALIDATION_REPORT_ARTIFACT_KIND,
  DSL_VALIDATION_REPORT_SCHEMA_VERSION,
  DSL_VALIDATION_REPORT_VERSION,
  type GameDslArtifact,
  type GameDslArtifactValidationResult,
  type StableGameGenre,
  type DslValidationReport,
  type DslValidationReportIssue,
  type DslValidationSourceArtifact
} from './artifact-contract.js';
export {
  buildRuntimeCapabilityReport,
  validateAndPlanDslPatch,
  DslPatchV1Schema,
  PatchValidationReportSchema,
  RuntimeCapabilityReportSchema,
  LiveUpdatePlanSchema,
  RuntimeApplyReportSchema,
  topDownShooterPhaserLiveEditCapabilities,
  type DslPatchV1,
  type DslPatchV1Operation,
  type RuntimeCapabilityReport,
  type PatchValidationReport,
  type LiveUpdatePlan,
  type RuntimeApplyReport,
  type LiveEditCapabilities
} from './live-edit.js';
export { validateRawGameDsl } from './dsl-validator.js';
export { normalizeRawGameDsl, validateAndNormalizeRawGameDsl } from './normalizer.js';
export { checkPhaserRuntimeCapabilities, type RuntimeCapabilityGateResult, type UnsupportedRuntimeCapability } from './runtime-capability-gate.js';
export { DslValidationError } from './validation.types.js';
export type {
  DslValidationFailure,
  DslValidationIssue,
  DslValidationIssueCode,
  DslValidationResult,
  DslValidationSuccess,
  ValidateAndNormalizeResult,
  ValidateAndNormalizeSuccess
} from './validation.types.js';
