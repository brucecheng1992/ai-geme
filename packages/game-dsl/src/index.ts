export { GameBriefSchema, type GameBrief } from './schemas/game-brief-v0.1.schema.js';
export {
  DurationSecondsSchema,
  GAME_BRIEF_V02_SCHEMA_VERSION,
  GameBriefV02Schema,
  PlayTimeIntentSchema,
  getPlanningUpperBoundSec,
  getRepresentativePlayTimeSec,
  toLegacyTargetPlayTimeSec,
  type DurationSeconds,
  type GameBriefV02,
  type PlayTimeIntent
} from './schemas/game-brief-v0.2.schema.js';
export { migrateGameBriefV01ToV02 } from './schemas/game-brief-migration.js';
export {
  GameBriefIngressValidationError,
  parseAndNormalizeGameBrief,
  type GameBriefIngressResult
} from './schemas/game-brief-ingress.js';
export {
  LEGACY_DSL_NONREPRESENTABLE,
  classifyLegacyRawGameDslRepresentability,
  type CompatibilityDisposition,
  type LegacyRepresentabilityReason,
  type LegacyRepresentabilityResult
} from './schemas/legacy-raw-game-dsl-representability.js';
export {
  CAPABILITY_GAME_DSL_DRAFT_ARTIFACT_KIND,
  CAPABILITY_GAME_DSL_DRAFT_RAW_PATH,
  CAPABILITY_GAME_DSL_DRAFT_SCHEMA_VERSION,
  COMPOSED_GAME_DSL_SCHEMA_ARTIFACT_KIND,
  COMPOSED_GAME_DSL_SCHEMA_VERSION,
  CapabilityGameDslDraftComposedSchemaIdentitySchema,
  CapabilityGameDslDraftV1Schema,
  buildCapabilityGameDslDraftComposedSchemaIdentity,
  findForbiddenCapabilityGameDslDraftEvidenceKeyPath,
  type CapabilityGameDslDraftComposedSchemaIdentity,
  type CapabilityGameDslDraftV1
} from './schemas/capability-game-dsl-draft-v1.schema.js';
export {
  CANONICAL_GAME_DSL_V02_ARTIFACT_KIND,
  CANONICAL_GAME_DSL_V02_PATH,
  CANONICAL_GAME_DSL_V02_SCHEMA_VERSION,
  GAME_DSL_NORMALIZATION_REPORT_KIND,
  GAME_DSL_NORMALIZATION_REPORT_PATH,
  GAME_DSL_NORMALIZATION_REPORT_SCHEMA_VERSION,
  LEGACY_GAME_DSL_V1_DIALECT,
  LEGACY_GAME_DSL_V1_PATH,
  LEGACY_RAW_GAME_DSL_V01_RAW_PATH,
  CanonicalGameDslV02Schema,
  GameDslNormalizationReportSchema,
  normalizeCapabilityGameDslDraftToCanonicalV02,
  type CanonicalGameDslV02,
  type GameDslNormalizationIssue,
  type GameDslNormalizationReport,
  type NormalizeCapabilityGameDslDraftToCanonicalV02Result
} from './schemas/game-dsl-v0.2.schema.js';
export {
  GenerationScopePlanSchema,
  buildGenerationScopePlan,
  type GenerationScopePlan
} from './generation-scope-plan.js';
export {
  GENERATION_PATH_RECEIPT_KIND,
  GENERATION_PATH_RECEIPT_SCHEMA_VERSION,
  GenerationPathReceiptSchema,
  buildGenerationPathReceipt,
  type GenerationPathReceipt
} from './generation-path-receipt.js';
export {
  GENERATION_CAPABILITY_READINESS_REPORT_KIND,
  GENERATION_CAPABILITY_READINESS_REPORT_SCHEMA_VERSION,
  GenerationCapabilityReadinessReportSchema,
  buildGenerationCapabilityPreflight,
  type GenerationCapabilityPreflightArtifacts,
  type GenerationCapabilityReadinessReport
} from './generation-capability-readiness.js';
export {
  GENERATION_CAPABILITY_RESOLUTION_REPORT_KIND,
  GENERATION_CAPABILITY_RESOLUTION_REPORT_SCHEMA_VERSION,
  SHADOW_GAMEPLAY_CAPABILITY_LOCK_PATH,
  GenerationCapabilityResolutionReportSchema,
  buildGenerationCapabilityResolutionShadow,
  type GenerationCapabilityResolutionReport,
  type GenerationCapabilityResolutionShadowArtifacts
} from './generation-capability-resolution.js';
export {
  GENERATION_CAPABILITY_RUNTIME_REPORT_KIND,
  GENERATION_CAPABILITY_RUNTIME_REPORT_SCHEMA_VERSION,
  SHADOW_CAPABILITY_QA_PLAN_PATH,
  SHADOW_CAPABILITY_QA_REPORT_PATH,
  SHADOW_PHASER_RUNTIME_LOADER_REPORT_PATH,
  SHADOW_PHASER_RUNTIME_SYSTEM_MANIFEST_PATH,
  GenerationCapabilityRuntimeReportSchema,
  buildGenerationCapabilityRuntimeShadow,
  type GenerationCapabilityRuntimeReport,
  type GenerationCapabilityRuntimeShadowArtifacts
} from './generation-capability-runtime.js';
export {
  GENERATION_CAPABILITY_GAP_REPORT_KIND,
  GENERATION_CAPABILITY_GAP_REPORT_PATH,
  GENERATION_CAPABILITY_GAP_REPORT_SCHEMA_VERSION,
  GenerationCapabilityGapReportSchema,
  buildGenerationCapabilityGapReport,
  type GenerationCapabilityGapReport
} from './generation-capability-gap.js';
export {
  GENERATION_CAPABILITY_CUTOVER_REPORT_KIND,
  GENERATION_CAPABILITY_CUTOVER_REPORT_PATH,
  GENERATION_CAPABILITY_CUTOVER_REPORT_SCHEMA_VERSION,
  GENERATION_CAPABILITY_ROLLBACK_DRILL_KIND,
  GENERATION_CAPABILITY_ROLLBACK_DRILL_SCHEMA_VERSION,
  LEGACY_EXECUTION_AUTHORIZATION_SCHEMA_VERSION,
  GenerationCapabilityCutoverReportSchema,
  GenerationCapabilityRollbackDrillReportSchema,
  LegacyExecutionAuthorizationSchema,
  buildGenerationCapabilityCutoverReport,
  buildGenerationCapabilityRollbackDrillReport,
  type GenerationCapabilityCutoverReport,
  type GenerationCapabilityRollbackDrillReport,
  type LegacyExecutionAuthorization
} from './generation-capability-cutover.js';
export {
  STEP37_FINAL_ACCEPTANCE_IDS,
  STEP37_FINAL_ACCEPTANCE_EVIDENCE_REQUIREMENTS,
  STEP37_FINAL_CLOSURE_REPORT_KIND,
  STEP37_FINAL_CLOSURE_SCHEMA_VERSION,
  STEP37_FINAL_MAX_VALIDATION_AGE_MS,
  STEP37_FINAL_REQUIRED_EVIDENCE_KINDS,
  STEP37_FINAL_REQUIRED_VALIDATION_COMMANDS,
  buildStep37FinalClosureReport,
  buildStep37FinalOracleGate,
  buildStep37FinalValidationReceipt,
  type Step37FinalAcceptanceCheck,
  type Step37FinalAcceptanceId,
  type Step37FinalClosureIssue,
  type Step37FinalClosureReport,
  type Step37FinalEvidenceKind,
  type Step37FinalEvidenceRef,
  type Step37FinalOracleGate,
  type Step37FinalRequiredValidationCommand,
  type Step37FinalValidationReceipt,
  type Step37ReferenceRegressionSummary
} from './step37-final-closure.js';
export {
  RAW_GAME_DSL_V01_CONTRACT_STATUS,
  RAW_GAME_DSL_V01_DIALECT,
  RAW_GAME_DSL_V01_TARGET_PLAY_TIME_MAX_SEC,
  RAW_GAME_DSL_V01_TARGET_PLAY_TIME_MIN_SEC,
  RawGameDslSchema,
  type RawGameDsl
} from './schemas/raw-game-dsl-v0.1.schema.js';
export { NormalizedGameIrSchema, type NormalizedGameIr } from './schemas/normalized-game-ir-v0.1.schema.js';
export {
  buildDslConsumptionReport,
  DslConsumptionEntrySchema,
  DslConsumptionReportSchema,
  DslConsumptionStatusSchema,
  type DslConsumptionEntry,
  type DslConsumptionReport,
  type DslConsumptionStatus
} from './dsl-consumption-report.js';
export {
  buildSceneIr,
  buildSceneIrAuthorityReport,
  buildSceneIrCoverageReport,
  SceneIrSchema,
  type SceneDomain,
  type SceneIr,
  type SceneIrAuthorityReport,
  type SceneIrCoverageReport
} from './scene-ir.js';
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
export * from './resolver-v2/index.js';
export * from './live-editing/index.js';
export * from './amendments/index.js';
export * from './gameplay-capabilities/index.js';
export * from './capability-synthesis/index.js';
export {
  buildSemanticIndex,
  createFixBlankPreviewRepairHandler,
  createFixBlankPreviewRepairHandlers,
  createSemanticEditingTraceRecorder,
  createFalsePlayableRepairIntent,
  createSemanticPatchDiffValuePreview,
  createSemanticPatchDiffViewModel,
  createSemanticPatchApplier,
  createSemanticPatchPlanner,
  createSemanticPatchValidator,
  detectSemanticFalsePlayableFindings,
  defaultSemanticPatchGuards,
  FIX_BLANK_PREVIEW_REPAIR_KIND,
  hashSemanticPatchDocument,
  isSemanticId,
  makeSemanticId,
  parseSemanticId,
  SemanticEditingTraceEventSchema,
  SemanticEditingTraceEventTypeSchema,
  SemanticEditingTraceSeveritySchema,
  SemanticEditIntentSchema,
  SemanticPatchSchema,
  SEMANTIC_EDIT_INTENT_KINDS,
  SEMANTIC_EDIT_REASON_SOURCES,
  SEMANTIC_PATCH_STATUSES,
  SEMANTIC_ID_KINDS,
  type FixBlankPreviewRepairHandlerOptions,
  type FixBlankPreviewRepairPayload,
  type CreateFalsePlayableRepairIntentOptions,
  type CreateSemanticPatchDiffViewModelInput,
  type CreateSemanticPatchDiffViewModelOptions,
  type DetectSemanticFalsePlayableOptions,
  type ParsedSemanticId,
  type RunSemanticFalsePlayableRepairLoopRequest,
  type SemanticEditingApplyTraceSummary,
  type SemanticEditingIntentTraceSummary,
  type SemanticEditingPatchTraceSummary,
  type SemanticEditingTraceEvent,
  type SemanticEditingTraceEventType,
  type SemanticEditingTraceRecorder,
  type SemanticEditingTraceRecorderOptions,
  type SemanticEditingTraceSeverity,
  type SemanticEditingTraceSink,
  type SemanticEditingValidationTraceSummary,
  type SemanticEditConstraints,
  type SemanticEditIntent,
  type SemanticEditIntentKind,
  type SemanticEditReason,
  type SemanticEditReasonSource,
  type SemanticFalsePlayableDetectionResult,
  type SemanticFalsePlayableFinding,
  type SemanticFalsePlayableRepairLoopError,
  type SemanticFalsePlayableRepairLoopFailure,
  type SemanticFalsePlayableRepairLoopNoop,
  type SemanticFalsePlayableRepairLoopResult,
  type SemanticFalsePlayableRepairLoopStage,
  type SemanticFalsePlayableRepairLoopSuccess,
  type SemanticFalsePlayableSeverity,
  type SemanticId,
  type SemanticIdKind,
  type SemanticIndex,
  type SemanticIndexEntry,
  type SemanticNodeRef,
  type SemanticPatch,
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
  type SemanticPatchDiffViewModel,
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
  type SemanticPatchRollbackSuccess,
  traceSemanticPatchApply,
  traceSemanticPatchPlan,
  traceSemanticPatchRollback,
  traceSemanticPatchValidation,
  runSemanticFalsePlayableRepairLoop,
  type TraceSemanticPatchApplyRequest,
  type TraceSemanticPatchPlanRequest,
  type TraceSemanticPatchRollbackRequest,
  type TraceSemanticPatchValidationRequest
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
  classifyLiveEditCapabilityRuntimeMode,
  findLiveEditCapabilityExposure,
  isLiveEditCapabilitySupportedEndToEnd,
  listLiveEditCapabilityExposuresByStatus,
  liveEditCapabilityExposureRegistry,
  summarizeLiveEditCapabilityExposure,
  type LiveEditCapabilityExposure,
  type LiveEditCapabilityExposureSummary,
  type LiveEditCapabilityRuntimeMode,
  type LiveEditRuntimeCapabilityInventory
} from './live-edit-capabilities.js';
export {
  isEndToEndLiveEditStatus,
  LIVE_EDIT_CAPABILITY_STATUSES,
  type LiveEditCapabilityStatus
} from './live-edit-capability-status.js';
export {
  describeRuntimeGenreCapability,
  findRuntimeGenreCapability,
  findRuntimeGenreCapabilityByTemplateManifestId,
  isRuntimeGenreExecutable,
  listSupportedRuntimeGenres,
  listSupportedRuntimeTemplateDirs,
  RAW_DSL_GAME_GENRES,
  RUNTIME_GENRE_CAPABILITIES,
  RuntimeGenreRegistry,
  RUNTIME_GENRE_REGISTRY_VERSION,
  RUNTIME_TEMPLATE_DIRS,
  RUNTIME_TEMPLATE_MANIFEST_IDS,
  RUNTIME_SUPPORT_STATUSES,
  SIDE_SCROLLING_WORLD_BOUNDS,
  type RawDslGameGenre,
  type RuntimeGeneratedTemplateArtifact,
  type RuntimeGenreCapability,
  type RuntimeTemplateDir,
  type RuntimeTemplateManifestId,
  type RuntimeSupportStatus
} from './runtime-capabilities.js';
export {
  buildUnsupportedRuntimeCapabilityReport,
  buildRuntimeCapabilityReport,
  getRuntimeLiveEditCapabilitiesForGenre,
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
