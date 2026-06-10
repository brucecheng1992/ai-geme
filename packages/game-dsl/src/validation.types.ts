import type { NormalizedGameIr } from './schemas/normalized-game-ir-v0.1.schema.js';
import type { RawGameDsl } from './schemas/raw-game-dsl-v0.1.schema.js';

export type DslValidationIssueCode =
  | 'INVALID_JSON'
  | 'SCHEMA_VALIDATION_FAILED'
  | 'ENGINE_LEAKAGE_DETECTED'
  | 'ARBITRARY_CODE_NOT_ALLOWED'
  | 'INVALID_ID_FORMAT'
  | 'DUPLICATE_ID'
  | 'UNRESOLVED_REFERENCE'
  | 'NUMERIC_RANGE_INVALID'
  | 'INVALID_GAME_SEMANTICS'
  | 'MECHANIC_CONTRACT_FAILED'
  | 'UNREACHABLE_OBJECTIVE'
  | 'RUNTIME_CAPABILITY_MISMATCH';

export type DslValidationIssue = {
  code: DslValidationIssueCode;
  path: string;
  message: string;
};

export type DslValidationSuccess<T> = {
  ok: true;
  value: T;
};

export type DslValidationFailure = {
  ok: false;
  issues: DslValidationIssue[];
};

export type DslValidationResult<T> = DslValidationSuccess<T> | DslValidationFailure;

export type ValidateAndNormalizeSuccess = {
  ok: true;
  rawDsl: RawGameDsl;
  ir: NormalizedGameIr;
};

export type ValidateAndNormalizeResult = ValidateAndNormalizeSuccess | DslValidationFailure;

export class DslValidationError extends Error {
  constructor(readonly issues: DslValidationIssue[]) {
    super('DSL validation failed.');
    this.name = 'DslValidationError';
  }
}
