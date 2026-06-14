export { GameBriefSchema, type GameBrief } from './schemas/game-brief-v0.1.schema.js';
export { RawGameDslSchema, type RawGameDsl } from './schemas/raw-game-dsl-v0.1.schema.js';
export { NormalizedGameIrSchema, type NormalizedGameIr } from './schemas/normalized-game-ir-v0.1.schema.js';
export { DslPatchSchema, type DslPatch, type DslPatchOperation } from './schemas/dsl-patch-v0.1.schema.js';
export {
  buildGameDslArtifact,
  buildDslValidationReport,
  validateGameDslArtifact,
  GameDslArtifactSchema,
  DslValidationReportSchema,
  GAME_DSL_ARTIFACT_KIND,
  GAME_DSL_SCHEMA_VERSION,
  DSL_VALIDATION_REPORT_ARTIFACT_KIND,
  DSL_VALIDATION_REPORT_SCHEMA_VERSION,
  type GameDslArtifact,
  type GameDslArtifactValidationResult,
  type StableGameGenre,
  type DslValidationReport,
  type DslValidationReportIssue
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
