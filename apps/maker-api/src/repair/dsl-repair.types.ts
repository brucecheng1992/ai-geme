import type { DslPatch, DslValidationIssue, RawGameDsl, ValidateAndNormalizeResult } from '../../../../packages/game-dsl/src/index.js';
import type { QaReport } from '../qa/qa.types.js';

export const MAX_REPAIR_ATTEMPTS = 2;

export type RepairFailureSource = 'validation' | 'qa';
export type RepairStatus = 'REPAIRED' | 'NOT_REPAIRABLE' | 'REPAIR_FAILED';

export type DslRepairInput = {
  projectId: string;
  runId: string;
  attempt: number;
  rawDsl: unknown;
  source: RepairFailureSource;
  issues?: DslValidationIssue[];
  qaReport?: QaReport;
};

export type RepairAttemptRecord = {
  attempt: number;
  source: RepairFailureSource;
  reason: string;
  patch?: DslPatch;
  validation: ValidateAndNormalizeResult;
};

export type DslRepairReport = {
  status: RepairStatus;
  project_id: string;
  run_id: string;
  max_attempts: typeof MAX_REPAIR_ATTEMPTS;
  attempts: RepairAttemptRecord[];
  repaired_dsl?: RawGameDsl;
  message?: string;
};
