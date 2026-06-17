import type { SemanticId } from './semantic-address.js';

export const SEMANTIC_EDIT_INTENT_KINDS = [
  'fix_blank_preview',
  'move_entity',
  'resize_world',
  'bind_asset',
  'adjust_camera',
  'change_physics',
  'configure_feedback',
  'configure_boss',
  'add_entity',
  'remove_entity',
  'modify_rule'
] as const;

export const SEMANTIC_EDIT_REASON_SOURCES = ['user', 'qa', 'agent', 'trace', 'workbench'] as const;

export type SemanticEditIntentKind = (typeof SEMANTIC_EDIT_INTENT_KINDS)[number];
export type SemanticEditReasonSource = (typeof SEMANTIC_EDIT_REASON_SOURCES)[number];

export type SemanticEditReason = {
  source: SemanticEditReasonSource;
  message: string;
  traceEventIds?: string[];
  qaFindingIds?: string[];
};

export type SemanticEditConstraints = {
  preserveGameplay?: boolean;
  preserveAssets?: boolean;
  preserveEntityIds?: boolean;
  noGeneratedCodeEdit?: boolean;
};

export type SemanticEditIntent = {
  id: string;
  kind: SemanticEditIntentKind;
  target: SemanticId;
  reason: SemanticEditReason;
  payload: Record<string, unknown>;
  constraints?: SemanticEditConstraints;
};

export const SEMANTIC_PATCH_STATUSES = ['proposed', 'validated', 'applied', 'rejected', 'rolled_back'] as const;

export type SemanticPatchStatus = (typeof SEMANTIC_PATCH_STATUSES)[number];

export type SemanticPatchOperation =
  | {
      op: 'set';
      path: string;
      value: unknown;
    }
  | {
      op: 'add';
      path: string;
      value: unknown;
    }
  | {
      op: 'remove';
      path: string;
    }
  | {
      op: 'replace';
      path: string;
      value: unknown;
    };

export type SemanticPatchValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export type SemanticPatch = {
  id: string;
  intentId: string;
  target: SemanticId;
  operations: SemanticPatchOperation[];
  beforeHash: string;
  afterHash?: string;
  status: SemanticPatchStatus;
  createdAt: string;
  validation?: SemanticPatchValidation;
};

export type SemanticPatchValidationSeverity = 'error' | 'warning';

export type SemanticPatchValidationIssueCode =
  | 'INVALID_SEMANTIC_EDIT_INTENT_SCHEMA'
  | 'INVALID_SEMANTIC_PATCH_SCHEMA'
  | 'SEMANTIC_PATCH_TARGET_NOT_FOUND'
  | 'PATCH_INTENT_MISMATCH'
  | 'PATCH_TARGET_MISMATCH'
  | 'MISSING_TRACEABILITY_REASON'
  | 'PATCH_STATUS_NOT_PROPOSED'
  | 'PATCH_AFTER_HASH_SET_BEFORE_APPLY'
  | 'EMPTY_SEMANTIC_PATCH_OPERATIONS'
  | 'INVALID_SEMANTIC_OPERATION_PATH'
  | 'GENERATED_CODE_EDIT_FORBIDDEN'
  | 'GUARD_EXCEPTION'
  | string;

export type SemanticPatchValidationIssue = {
  severity: SemanticPatchValidationSeverity;
  code: SemanticPatchValidationIssueCode;
  message: string;
  guardId?: string;
  intentId?: string;
  target?: string;
  path?: string;
  operationIndex?: number;
  cause?: unknown;
};

export type SemanticPatchValidationResult = {
  ok: boolean;
  errors: SemanticPatchValidationIssue[];
  warnings: SemanticPatchValidationIssue[];
};
