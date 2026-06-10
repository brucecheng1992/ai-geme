export { GameBriefSchema, type GameBrief } from './schemas/game-brief-v0.1.schema.js';
export { RawGameDslSchema, type RawGameDsl } from './schemas/raw-game-dsl-v0.1.schema.js';
export { NormalizedGameIrSchema, type NormalizedGameIr } from './schemas/normalized-game-ir-v0.1.schema.js';
export { DslPatchSchema, type DslPatch, type DslPatchOperation } from './schemas/dsl-patch-v0.1.schema.js';
export { validateRawGameDsl } from './dsl-validator.js';
export { normalizeRawGameDsl, validateAndNormalizeRawGameDsl } from './normalizer.js';
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
