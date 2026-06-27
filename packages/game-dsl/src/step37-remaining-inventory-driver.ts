import {
  type DeepSeekRunAndGunProfileCapabilitySupport,
  type DeepSeekRunAndGunProfileSupportSummary
} from './deepseek-run-and-gun-validation-profile-v1.js';
import { selectNextAtomicCheckpoint, type Step37CheckpointInventoryItem, type Step37NextAtomicCheckpoint } from './step37-parent-loop-driver.js';
import { type Step37ExactCapabilityLockReport } from './step37-exact-capability-lock.js';
import { type Step37Stage4ExitAuditReport } from './step37-stage4-exit-audit.js';
import { type Step37Stage5EntryAuditReport } from './step37-stage5-entry-audit.js';
import { type Step37SupportPromotionApplicationReport } from './step37-support-promotion-inventory.js';

export const STEP37_REMAINING_INVENTORY_ARTIFACT_KIND = 'step37_remaining_complete_supported_inventory';
export const STEP37_REMAINING_INVENTORY_SCHEMA_VERSION = 'step37_remaining_complete_supported_inventory.v0.1';
export const STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_CHECKPOINT_ID =
  'stage4.support_promotion_from_same_run_observed_package_receipts';
export const STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_NEXT_ATOMIC_STEP =
  'Stage 4 support promotion from same-run observed package receipts atomic step';
export const STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_CHECKPOINT_ID = 'stage4.exit_audit_after_support_promotion';
export const STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_NEXT_ATOMIC_STEP =
  'Stage 4 exit audit after support promotion atomic step';
export const STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID = 'stage5.entry_audit_after_stage4_exit';
export const STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_NEXT_ATOMIC_STEP = 'Stage 5 entry audit after Stage 4 exit atomic step';
export const STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID =
  'stage5.exact_capability_lock_from_complete_supported_packages';
export const STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_NEXT_ATOMIC_STEP =
  'Stage 5 exact capability lock from complete-supported packages atomic step';
export const STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID =
  'stage6.composed_dsl_schema_from_exact_capability_lock';
export const STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_NEXT_ATOMIC_STEP =
  'Stage 6 composed DSL schema from exact capability lock atomic step';
const STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_PARENT_STAGE_ID = 'stage4';
const STEP37_STAGE5_ENTRY_AUDIT_PARENT_STAGE_ID = 'stage5';
const STEP37_STAGE6_COMPOSED_DSL_SCHEMA_PARENT_STAGE_ID = 'stage6';

export const STEP37_REMAINING_CAPABILITY_STATES = [
  'complete_supported',
  'same_run_observed_only',
  'registered_without_required_probe_verification',
  'registered_static_qa_observed_false',
  'legacy_backed',
  'unsupported_unregistered'
] as const;

export type Step37RemainingCapabilityState = (typeof STEP37_REMAINING_CAPABILITY_STATES)[number];

export type Step37CommittedCapabilityClosure = {
  capabilityId: string;
  checkpointId: string;
  sourceRevision: string;
};

export type Step37RemainingInventoryDriverInput = {
  supportSummary: DeepSeekRunAndGunProfileSupportSummary;
  observedCapabilityIds?: readonly string[];
  committedCapabilityClosures?: readonly Step37CommittedCapabilityClosure[];
  supportPromotionCheckpoint?: Step37CheckpointInventoryItem | null;
  supportPromotionApplicationReport?: Step37SupportPromotionApplicationReport | null;
  stage4ExitAuditCheckpoint?: Step37CheckpointInventoryItem | null;
  stage4ExitAuditReport?: Step37Stage4ExitAuditReport | null;
  stage5EntryAuditCheckpoint?: Step37CheckpointInventoryItem | null;
  stage5EntryAuditReport?: Step37Stage5EntryAuditReport | null;
  stage5ExactLockCheckpoint?: Step37CheckpointInventoryItem | null;
  stage5ExactCapabilityLockReport?: Step37ExactCapabilityLockReport | null;
  stage6ComposedDslSchemaCheckpoint?: Step37CheckpointInventoryItem | null;
  parentStageId?: string;
  sourcePlanRevision: string;
};

export type Step37RemainingCapabilityInventoryItem = {
  capabilityId: string;
  registered: boolean;
  classification: DeepSeekRunAndGunProfileCapabilitySupport['classification'];
  state: Step37RemainingCapabilityState;
  staticCompleteSupported: boolean;
  sameRunObserved: boolean;
  legacyBacked: boolean;
  closedInCommittedHistory: boolean;
  closedByCheckpointIds: string[];
  evidenceDimensions: DeepSeekRunAndGunProfileCapabilitySupport['evidenceDimensions'];
  missingEvidenceDimensions: DeepSeekRunAndGunProfileCapabilitySupport['missingEvidenceDimensions'];
  missingSupportEvidencePrerequisites: DeepSeekRunAndGunProfileCapabilitySupport['missingSupportEvidencePrerequisites'];
};

export type Step37RemainingInventorySelectionFailure =
  | {
      error_code: 'NEXT_ATOMIC_STEP_REQUIRED';
      global_exit_conditions_met: false;
      user_input_required: false;
      parent_stage_status: 'running';
      unmet_static_complete_supported_count: number;
      message: string;
    }
  | {
      error_code: 'SUPPORT_PROMOTION_CHECKPOINT_REQUIRED';
      global_exit_conditions_met: false;
      user_input_required: false;
      parent_stage_status: 'running';
      stage5_entry_allowed: false;
      unmet_static_complete_supported_count: number;
      reason: string;
      expected_checkpoint_id: typeof STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_CHECKPOINT_ID;
      expected_parent_stage_id: string;
      expected_next_atomic_step: typeof STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_NEXT_ATOMIC_STEP;
      actual_checkpoint_id: string | null;
      invalid_fields: string[];
      message: string;
    }
  | {
      error_code: 'SUPPORT_SUMMARY_CONSUMER_NOT_CONSUMED_PROMOTION_INVENTORY';
      global_exit_conditions_met: false;
      user_input_required: false;
      parent_stage_status: 'running';
      stage5_entry_allowed: false;
      expected_complete_supported_count: number;
      actual_complete_supported_count: number;
      promotion_application_status: Step37SupportPromotionApplicationReport['applicationStatus'];
      source_inventory_hash: string;
      message: string;
    }
  | {
      error_code: 'STAGE4_EXIT_AUDIT_CHECKPOINT_REQUIRED';
      global_exit_conditions_met: false;
      user_input_required: false;
      parent_stage_status: 'running';
      stage5_entry_allowed: false;
      reason: string;
      expected_checkpoint_id: typeof STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_CHECKPOINT_ID;
      expected_parent_stage_id: string;
      expected_next_atomic_step: typeof STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_NEXT_ATOMIC_STEP;
      actual_checkpoint_id: string | null;
      invalid_fields: string[];
      message: string;
    }
  | {
      error_code: 'STAGE5_ENTRY_AUDIT_CHECKPOINT_REQUIRED';
      global_exit_conditions_met: false;
      user_input_required: false;
      parent_stage_status: 'complete';
      stage5_entry_allowed: true;
      reason: string;
      expected_checkpoint_id: typeof STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID;
      expected_parent_stage_id: typeof STEP37_STAGE5_ENTRY_AUDIT_PARENT_STAGE_ID;
      expected_next_atomic_step: typeof STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_NEXT_ATOMIC_STEP;
      actual_checkpoint_id: string | null;
      invalid_fields: string[];
      message: string;
    }
  | {
      error_code: 'STAGE5_EXACT_LOCK_CHECKPOINT_REQUIRED';
      global_exit_conditions_met: false;
      user_input_required: false;
      parent_stage_status: 'running';
      stage5_entry_allowed: true;
      stage5_exact_lock_implementation_allowed: true;
      reason: string;
      expected_checkpoint_id: typeof STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID;
      expected_parent_stage_id: typeof STEP37_STAGE5_ENTRY_AUDIT_PARENT_STAGE_ID;
      expected_next_atomic_step: typeof STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_NEXT_ATOMIC_STEP;
      actual_checkpoint_id: string | null;
      invalid_fields: string[];
      message: string;
    }
  | {
      error_code: 'STAGE6_COMPOSED_DSL_SCHEMA_CHECKPOINT_REQUIRED';
      global_exit_conditions_met: false;
      user_input_required: false;
      parent_stage_status: 'complete';
      stage5_entry_allowed: true;
      stage5_exact_lock_implementation_allowed: true;
      stage5_exact_lock_produced: true;
      reason: string;
      expected_checkpoint_id: typeof STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID;
      expected_parent_stage_id: typeof STEP37_STAGE6_COMPOSED_DSL_SCHEMA_PARENT_STAGE_ID;
      expected_next_atomic_step: typeof STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_NEXT_ATOMIC_STEP;
      actual_checkpoint_id: string | null;
      invalid_fields: string[];
      message: string;
    };

export type Step37RemainingInventoryReport = {
  artifactKind: typeof STEP37_REMAINING_INVENTORY_ARTIFACT_KIND;
  schemaVersion: typeof STEP37_REMAINING_INVENTORY_SCHEMA_VERSION;
  profileId: DeepSeekRunAndGunProfileSupportSummary['profileId'];
  profileVersion: DeepSeekRunAndGunProfileSupportSummary['profileVersion'];
  parentStageId: string;
  sourcePlanRevision: string;
  requiredCapabilityCount: number;
  registeredCapabilityCount: number;
  staticCompleteSupportedCount: number;
  sameRunObservedOnlyCount: number;
  committedClosedCapabilityCount: number;
  stateCounts: Record<Step37RemainingCapabilityState, number>;
  capabilities: Step37RemainingCapabilityInventoryItem[];
  checkpointInventory: Step37CheckpointInventoryItem[];
  nextCheckpoint: Step37NextAtomicCheckpoint | null;
  selectionFailure: Step37RemainingInventorySelectionFailure | null;
};

const checkpointStateRank: Record<Step37RemainingCapabilityState, number> = {
  registered_without_required_probe_verification: 0,
  registered_static_qa_observed_false: 1,
  legacy_backed: 2,
  same_run_observed_only: 3,
  unsupported_unregistered: 4,
  complete_supported: 5
};

export function buildStep37RemainingCompleteSupportedInventory(input: Step37RemainingInventoryDriverInput): Step37RemainingInventoryReport {
  const sourcePlanRevision = requireNonEmpty(input.sourcePlanRevision, 'sourcePlanRevision');
  const parentStageId = input.parentStageId?.trim() || 'stage4';
  const observedCapabilityIds = new Set(input.observedCapabilityIds ?? []);
  const committedClosureMap = buildCommittedClosureMap(input.committedCapabilityClosures ?? []);
  const capabilities = input.supportSummary.capabilities
    .map((capability) => buildInventoryItem(capability, observedCapabilityIds, committedClosureMap))
    .sort((left, right) => left.capabilityId.localeCompare(right.capabilityId));
  const stateCounts = buildStateCounts(capabilities);
  const packageCheckpointInventory = capabilities
    .filter((capability) => !capability.staticCompleteSupported && !capability.closedInCommittedHistory)
    .sort(compareInventoryItemsForNextCheckpoint)
    .map((capability) => toCheckpointInventoryItem(capability, parentStageId, sourcePlanRevision));
  const staticCompleteSupportedCount = input.supportSummary.summary.completeSupportedCount;
  const requiredCapabilityCount = input.supportSummary.summary.requiredCapabilityCount;
  const staticCompleteSupportedCapabilityIds = capabilities
    .filter((capability) => capability.staticCompleteSupported)
    .map((capability) => capability.capabilityId)
    .sort();
  const sameRunObservedOnlyCount = capabilities.filter((capability) => capability.state === 'same_run_observed_only').length;
  const committedClosedCapabilityCount = capabilities.filter((capability) => capability.closedInCommittedHistory).length;
  const supportPromotionRequired =
    shouldRequireSupportPromotionCheckpoint({
      packageCheckpointInventoryCount: packageCheckpointInventory.length,
      requiredCapabilityCount,
      staticCompleteSupportedCount,
      sameRunObservedOnlyCount,
      committedClosedCapabilityCount
    });
  const supportPromotionCheckpointInvalidFields = supportPromotionRequired
    ? getSupportPromotionCheckpointInvalidFields(input.supportPromotionCheckpoint ?? null, parentStageId)
    : [];
  const supportPromotionCheckpoint =
    supportPromotionRequired &&
    input.supportPromotionCheckpoint !== undefined &&
    input.supportPromotionCheckpoint !== null &&
    supportPromotionCheckpointInvalidFields.length === 0
      ? [input.supportPromotionCheckpoint]
      : [];
  const supportPromotionConsumerFailure = buildSupportPromotionConsumerFailure({
    supportPromotionApplicationReport: input.supportPromotionApplicationReport ?? null,
    requiredCapabilityCount,
    staticCompleteSupportedCount
  });
  const stage4ExitAuditPassed = isStage4ExitAuditPassed(input.stage4ExitAuditReport ?? null);
  const stage4ExitAuditRequired = requiredCapabilityCount > 0 && staticCompleteSupportedCount === requiredCapabilityCount && !stage4ExitAuditPassed;
  const stage4ExitAuditCheckpointInvalidFields = stage4ExitAuditRequired
    ? getStage4ExitAuditCheckpointInvalidFields(input.stage4ExitAuditCheckpoint ?? null, parentStageId)
    : [];
  const stage4ExitAuditCheckpoint =
    stage4ExitAuditRequired &&
    input.stage4ExitAuditCheckpoint !== undefined &&
    input.stage4ExitAuditCheckpoint !== null &&
    stage4ExitAuditCheckpointInvalidFields.length === 0
      ? [input.stage4ExitAuditCheckpoint]
      : [];
  const stage5EntryAuditPassed = isStage5EntryAuditPassed(input.stage5EntryAuditReport ?? null);
  const stage5EntryAuditRequired =
    requiredCapabilityCount > 0 && staticCompleteSupportedCount === requiredCapabilityCount && stage4ExitAuditPassed && !stage5EntryAuditPassed;
  const stage5EntryAuditCheckpointInvalidFields = stage5EntryAuditRequired
    ? getStage5EntryAuditCheckpointInvalidFields(input.stage5EntryAuditCheckpoint ?? null)
    : [];
  const stage5EntryAuditCheckpoint =
    stage5EntryAuditRequired &&
    input.stage5EntryAuditCheckpoint !== undefined &&
    input.stage5EntryAuditCheckpoint !== null &&
    stage5EntryAuditCheckpointInvalidFields.length === 0
      ? [input.stage5EntryAuditCheckpoint]
      : [];
  const stage5ExactCapabilityLockPassed = isStage5ExactCapabilityLockPassed(
    input.stage5ExactCapabilityLockReport ?? null,
    staticCompleteSupportedCapabilityIds
  );
  const stage5ExactLockCheckpointRequired =
    requiredCapabilityCount > 0 &&
    staticCompleteSupportedCount === requiredCapabilityCount &&
    stage4ExitAuditPassed &&
    stage5EntryAuditPassed &&
    !stage5ExactCapabilityLockPassed;
  const stage5ExactLockCheckpointInvalidFields = stage5ExactLockCheckpointRequired
    ? getStage5ExactLockCheckpointInvalidFields(input.stage5ExactLockCheckpoint ?? null)
    : [];
  const stage5ExactLockCheckpoint =
    stage5ExactLockCheckpointRequired &&
    input.stage5ExactLockCheckpoint !== undefined &&
    input.stage5ExactLockCheckpoint !== null &&
    stage5ExactLockCheckpointInvalidFields.length === 0
      ? [input.stage5ExactLockCheckpoint]
      : [];
  const stage6ComposedDslSchemaCheckpointRequired =
    requiredCapabilityCount > 0 &&
    staticCompleteSupportedCount === requiredCapabilityCount &&
    stage4ExitAuditPassed &&
    stage5EntryAuditPassed &&
    stage5ExactCapabilityLockPassed;
  const stage6ComposedDslSchemaCheckpointInvalidFields = stage6ComposedDslSchemaCheckpointRequired
    ? getStage6ComposedDslSchemaCheckpointInvalidFields(input.stage6ComposedDslSchemaCheckpoint ?? null)
    : [];
  const stage6ComposedDslSchemaCheckpoint =
    stage6ComposedDslSchemaCheckpointRequired &&
    input.stage6ComposedDslSchemaCheckpoint !== undefined &&
    input.stage6ComposedDslSchemaCheckpoint !== null &&
    stage6ComposedDslSchemaCheckpointInvalidFields.length === 0
      ? [input.stage6ComposedDslSchemaCheckpoint]
      : [];
  const checkpointInventory = [
    ...packageCheckpointInventory,
    ...supportPromotionCheckpoint,
    ...stage4ExitAuditCheckpoint,
    ...stage5EntryAuditCheckpoint,
    ...stage5ExactLockCheckpoint,
    ...stage6ComposedDslSchemaCheckpoint
  ];
  const nextCheckpoint = selectNextAtomicCheckpoint(checkpointInventory);
  const unmetStaticCompleteSupportedCount = requiredCapabilityCount - staticCompleteSupportedCount;

  return {
    artifactKind: STEP37_REMAINING_INVENTORY_ARTIFACT_KIND,
    schemaVersion: STEP37_REMAINING_INVENTORY_SCHEMA_VERSION,
    profileId: input.supportSummary.profileId,
    profileVersion: input.supportSummary.profileVersion,
    parentStageId,
    sourcePlanRevision,
    requiredCapabilityCount,
    registeredCapabilityCount: input.supportSummary.summary.registeredCapabilityCount,
    staticCompleteSupportedCount,
    sameRunObservedOnlyCount,
    committedClosedCapabilityCount,
    stateCounts,
    capabilities,
    checkpointInventory,
    nextCheckpoint,
    selectionFailure: buildSelectionFailure({
      nextCheckpoint,
      supportPromotionRequired,
      supportPromotionCheckpoint: input.supportPromotionCheckpoint ?? null,
      supportPromotionCheckpointInvalidFields,
      supportPromotionConsumerFailure,
      stage4ExitAuditRequired,
      stage4ExitAuditCheckpoint: input.stage4ExitAuditCheckpoint ?? null,
      stage4ExitAuditCheckpointInvalidFields,
      stage5EntryAuditRequired,
      stage5EntryAuditCheckpoint: input.stage5EntryAuditCheckpoint ?? null,
      stage5EntryAuditCheckpointInvalidFields,
      stage5ExactLockCheckpointRequired,
      stage5ExactLockCheckpoint: input.stage5ExactLockCheckpoint ?? null,
      stage5ExactLockCheckpointInvalidFields,
      stage6ComposedDslSchemaCheckpointRequired,
      stage6ComposedDslSchemaCheckpoint: input.stage6ComposedDslSchemaCheckpoint ?? null,
      stage6ComposedDslSchemaCheckpointInvalidFields,
      parentStageId,
      unmetStaticCompleteSupportedCount
    })
  };
}

export function deriveStep37RemainingCapabilityState(input: {
  capability: DeepSeekRunAndGunProfileCapabilitySupport;
  sameRunObserved: boolean;
}): Step37RemainingCapabilityState {
  const { capability, sameRunObserved } = input;
  if (capability.completeSupported) {
    return 'complete_supported';
  }
  if (sameRunObserved) {
    return 'same_run_observed_only';
  }
  if (!capability.registered) {
    return 'unsupported_unregistered';
  }
  if (capability.legacyBacked) {
    return 'legacy_backed';
  }
  if (capability.missingSupportEvidencePrerequisites.includes('requiredProbesVerified')) {
    return 'registered_without_required_probe_verification';
  }
  return 'registered_static_qa_observed_false';
}

function buildInventoryItem(
  capability: DeepSeekRunAndGunProfileCapabilitySupport,
  observedCapabilityIds: ReadonlySet<string>,
  committedClosureMap: ReadonlyMap<string, Step37CommittedCapabilityClosure[]>
): Step37RemainingCapabilityInventoryItem {
  const sameRunObserved = observedCapabilityIds.has(capability.capabilityId) && !capability.completeSupported;
  const closedBy = committedClosureMap.get(capability.capabilityId) ?? [];
  return {
    capabilityId: capability.capabilityId,
    registered: capability.registered,
    classification: capability.classification,
    state: deriveStep37RemainingCapabilityState({ capability, sameRunObserved }),
    staticCompleteSupported: capability.completeSupported,
    sameRunObserved,
    legacyBacked: capability.legacyBacked,
    closedInCommittedHistory: closedBy.length > 0,
    closedByCheckpointIds: closedBy.map((closure) => closure.checkpointId).sort(),
    evidenceDimensions: capability.evidenceDimensions,
    missingEvidenceDimensions: [...capability.missingEvidenceDimensions],
    missingSupportEvidencePrerequisites: [...capability.missingSupportEvidencePrerequisites]
  };
}

function buildCommittedClosureMap(
  closures: readonly Step37CommittedCapabilityClosure[]
): Map<string, Step37CommittedCapabilityClosure[]> {
  const closureMap = new Map<string, Step37CommittedCapabilityClosure[]>();
  for (const closure of closures) {
    const capabilityId = requireNonEmpty(closure.capabilityId, 'committedCapabilityClosures.capabilityId');
    requireNonEmpty(closure.checkpointId, `committedCapabilityClosures[${capabilityId}].checkpointId`);
    requireNonEmpty(closure.sourceRevision, `committedCapabilityClosures[${capabilityId}].sourceRevision`);
    closureMap.set(capabilityId, [...(closureMap.get(capabilityId) ?? []), closure]);
  }
  return closureMap;
}

function buildStateCounts(capabilities: readonly Step37RemainingCapabilityInventoryItem[]): Record<Step37RemainingCapabilityState, number> {
  const counts = Object.fromEntries(STEP37_REMAINING_CAPABILITY_STATES.map((state) => [state, 0])) as Record<
    Step37RemainingCapabilityState,
    number
  >;
  for (const capability of capabilities) {
    counts[capability.state] += 1;
  }
  return counts;
}

function compareInventoryItemsForNextCheckpoint(
  left: Step37RemainingCapabilityInventoryItem,
  right: Step37RemainingCapabilityInventoryItem
): number {
  return checkpointStateRank[left.state] - checkpointStateRank[right.state] || left.capabilityId.localeCompare(right.capabilityId);
}

function toCheckpointInventoryItem(
  capability: Step37RemainingCapabilityInventoryItem,
  parentStageId: string,
  sourcePlanRevision: string
): Step37CheckpointInventoryItem {
  return {
    checkpoint_id: `${parentStageId}.${sanitizeCapabilityIdForCheckpoint(capability.capabilityId)}.complete_supported_package_slice`,
    parent_stage_id: parentStageId,
    next_atomic_step: `Stage 4 ${capability.capabilityId} complete-supported package slice implementation atomic step`,
    status: 'unmet',
    unmet_reason: buildUnmetReason(capability),
    source_plan_revision: sourcePlanRevision
  };
}

function shouldRequireSupportPromotionCheckpoint(input: {
  packageCheckpointInventoryCount: number;
  requiredCapabilityCount: number;
  staticCompleteSupportedCount: number;
  sameRunObservedOnlyCount: number;
  committedClosedCapabilityCount: number;
}): boolean {
  const unmetStaticCompleteSupportedCount = input.requiredCapabilityCount - input.staticCompleteSupportedCount;
  if (input.requiredCapabilityCount <= 0 || unmetStaticCompleteSupportedCount <= 0 || input.packageCheckpointInventoryCount > 0) {
    return false;
  }

  return (
    input.sameRunObservedOnlyCount + input.staticCompleteSupportedCount === input.requiredCapabilityCount &&
    input.committedClosedCapabilityCount + input.staticCompleteSupportedCount === input.requiredCapabilityCount
  );
}

function buildSelectionFailure(input: {
  nextCheckpoint: Step37NextAtomicCheckpoint | null;
  supportPromotionRequired: boolean;
  supportPromotionCheckpoint: Step37CheckpointInventoryItem | null;
  supportPromotionCheckpointInvalidFields: readonly string[];
  supportPromotionConsumerFailure: Step37RemainingInventorySelectionFailure | null;
  stage4ExitAuditRequired: boolean;
  stage4ExitAuditCheckpoint: Step37CheckpointInventoryItem | null;
  stage4ExitAuditCheckpointInvalidFields: readonly string[];
  stage5EntryAuditRequired: boolean;
  stage5EntryAuditCheckpoint: Step37CheckpointInventoryItem | null;
  stage5EntryAuditCheckpointInvalidFields: readonly string[];
  stage5ExactLockCheckpointRequired: boolean;
  stage5ExactLockCheckpoint: Step37CheckpointInventoryItem | null;
  stage5ExactLockCheckpointInvalidFields: readonly string[];
  stage6ComposedDslSchemaCheckpointRequired: boolean;
  stage6ComposedDslSchemaCheckpoint: Step37CheckpointInventoryItem | null;
  stage6ComposedDslSchemaCheckpointInvalidFields: readonly string[];
  parentStageId: string;
  unmetStaticCompleteSupportedCount: number;
}): Step37RemainingInventorySelectionFailure | null {
  if (input.supportPromotionConsumerFailure !== null) {
    return input.supportPromotionConsumerFailure;
  }

  if (input.stage4ExitAuditRequired && input.nextCheckpoint === null) {
    return {
      error_code: 'STAGE4_EXIT_AUDIT_CHECKPOINT_REQUIRED',
      global_exit_conditions_met: false,
      user_input_required: false,
      parent_stage_status: 'running',
      stage5_entry_allowed: false,
      reason:
        input.stage4ExitAuditCheckpoint === null
          ? 'complete support was promoted but Stage 4 exit audit checkpoint was not supplied'
          : 'complete support was promoted but supplied Stage 4 exit audit checkpoint identity is not authoritative',
      expected_checkpoint_id: STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_CHECKPOINT_ID,
      expected_parent_stage_id: STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_PARENT_STAGE_ID,
      expected_next_atomic_step: STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_NEXT_ATOMIC_STEP,
      actual_checkpoint_id: input.stage4ExitAuditCheckpoint?.checkpoint_id ?? null,
      invalid_fields: [...input.stage4ExitAuditCheckpointInvalidFields],
      message:
        'STAGE4_EXIT_AUDIT_CHECKPOINT_REQUIRED: Stage 4 complete support is promoted, but Stage 4 exit audit authority is missing or invalid'
    };
  }

  if (input.stage5EntryAuditRequired && input.nextCheckpoint === null) {
    return {
      error_code: 'STAGE5_ENTRY_AUDIT_CHECKPOINT_REQUIRED',
      global_exit_conditions_met: false,
      user_input_required: false,
      parent_stage_status: 'complete',
      stage5_entry_allowed: true,
      reason:
        input.stage5EntryAuditCheckpoint === null
          ? 'Stage 4 exit audit passed but Stage 5 entry audit checkpoint was not supplied'
          : 'Stage 4 exit audit passed but supplied Stage 5 entry audit checkpoint identity is not authoritative',
      expected_checkpoint_id: STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID,
      expected_parent_stage_id: STEP37_STAGE5_ENTRY_AUDIT_PARENT_STAGE_ID,
      expected_next_atomic_step: STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_NEXT_ATOMIC_STEP,
      actual_checkpoint_id: input.stage5EntryAuditCheckpoint?.checkpoint_id ?? null,
      invalid_fields: [...input.stage5EntryAuditCheckpointInvalidFields],
      message:
        'STAGE5_ENTRY_AUDIT_CHECKPOINT_REQUIRED: Stage 4 exit audit passed, but Stage 5 entry audit authority is missing or invalid'
    };
  }

  if (input.stage5ExactLockCheckpointRequired && input.nextCheckpoint === null) {
    return {
      error_code: 'STAGE5_EXACT_LOCK_CHECKPOINT_REQUIRED',
      global_exit_conditions_met: false,
      user_input_required: false,
      parent_stage_status: 'running',
      stage5_entry_allowed: true,
      stage5_exact_lock_implementation_allowed: true,
      reason:
        input.stage5ExactLockCheckpoint === null
          ? 'Stage 5 entry audit passed but exact capability lock checkpoint was not supplied'
          : 'Stage 5 entry audit passed but supplied exact capability lock checkpoint identity is not authoritative',
      expected_checkpoint_id: STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID,
      expected_parent_stage_id: STEP37_STAGE5_ENTRY_AUDIT_PARENT_STAGE_ID,
      expected_next_atomic_step: STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_NEXT_ATOMIC_STEP,
      actual_checkpoint_id: input.stage5ExactLockCheckpoint?.checkpoint_id ?? null,
      invalid_fields: [...input.stage5ExactLockCheckpointInvalidFields],
      message:
        'STAGE5_EXACT_LOCK_CHECKPOINT_REQUIRED: Stage 5 entry audit passed, but exact capability lock checkpoint authority is missing or invalid'
    };
  }

  if (input.stage6ComposedDslSchemaCheckpointRequired && input.nextCheckpoint === null) {
    return {
      error_code: 'STAGE6_COMPOSED_DSL_SCHEMA_CHECKPOINT_REQUIRED',
      global_exit_conditions_met: false,
      user_input_required: false,
      parent_stage_status: 'complete',
      stage5_entry_allowed: true,
      stage5_exact_lock_implementation_allowed: true,
      stage5_exact_lock_produced: true,
      reason:
        input.stage6ComposedDslSchemaCheckpoint === null
          ? 'Stage 5 exact capability lock passed but composed DSL schema checkpoint was not supplied'
          : 'Stage 5 exact capability lock passed but supplied composed DSL schema checkpoint identity is not authoritative',
      expected_checkpoint_id: STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID,
      expected_parent_stage_id: STEP37_STAGE6_COMPOSED_DSL_SCHEMA_PARENT_STAGE_ID,
      expected_next_atomic_step: STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_NEXT_ATOMIC_STEP,
      actual_checkpoint_id: input.stage6ComposedDslSchemaCheckpoint?.checkpoint_id ?? null,
      invalid_fields: [...input.stage6ComposedDslSchemaCheckpointInvalidFields],
      message:
        'STAGE6_COMPOSED_DSL_SCHEMA_CHECKPOINT_REQUIRED: Stage 5 exact capability lock passed, but composed DSL schema checkpoint authority is missing or invalid'
    };
  }

  if (input.nextCheckpoint !== null || input.unmetStaticCompleteSupportedCount <= 0) {
    return null;
  }

  if (input.supportPromotionRequired && input.supportPromotionCheckpointInvalidFields.length > 0) {
    return {
      error_code: 'SUPPORT_PROMOTION_CHECKPOINT_REQUIRED',
      global_exit_conditions_met: false,
      user_input_required: false,
      parent_stage_status: 'running',
      stage5_entry_allowed: false,
      unmet_static_complete_supported_count: input.unmetStaticCompleteSupportedCount,
      reason:
        input.supportPromotionCheckpoint === null
          ? 'observed inventory exhausted but static support promotion not consumed'
          : 'observed inventory exhausted but supplied support promotion checkpoint identity is not authoritative',
      expected_checkpoint_id: STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_CHECKPOINT_ID,
      expected_parent_stage_id: STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_PARENT_STAGE_ID,
      expected_next_atomic_step: STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_NEXT_ATOMIC_STEP,
      actual_checkpoint_id: input.supportPromotionCheckpoint?.checkpoint_id ?? null,
      invalid_fields: [...input.supportPromotionCheckpointInvalidFields],
      message:
        'SUPPORT_PROMOTION_CHECKPOINT_REQUIRED: Stage 4 observed/closed inventory is exhausted, static completeSupported is still unmet, and no authoritative support-promotion checkpoint was provided'
    };
  }

  return {
    error_code: 'NEXT_ATOMIC_STEP_REQUIRED',
    global_exit_conditions_met: false,
    user_input_required: false,
    parent_stage_status: 'running',
    unmet_static_complete_supported_count: input.unmetStaticCompleteSupportedCount,
    message:
      'NEXT_ATOMIC_STEP_REQUIRED: Stage 4 static completeSupported is unmet, no user blocker exists, and remaining inventory has no executable unclosed checkpoint'
  };
}

function buildSupportPromotionConsumerFailure(input: {
  supportPromotionApplicationReport: Step37SupportPromotionApplicationReport | null;
  requiredCapabilityCount: number;
  staticCompleteSupportedCount: number;
}): Step37RemainingInventorySelectionFailure | null {
  const report = input.supportPromotionApplicationReport;
  if (report === null) {
    return null;
  }
  if (report.applicationStatus !== 'applied' || input.staticCompleteSupportedCount === report.completeSupportedCount) {
    return null;
  }

  return {
    error_code: 'SUPPORT_SUMMARY_CONSUMER_NOT_CONSUMED_PROMOTION_INVENTORY',
    global_exit_conditions_met: false,
    user_input_required: false,
    parent_stage_status: 'running',
    stage5_entry_allowed: false,
    expected_complete_supported_count: report.completeSupportedCount,
    actual_complete_supported_count: input.staticCompleteSupportedCount,
    promotion_application_status: report.applicationStatus,
    source_inventory_hash: report.sourceInventoryHash,
    message:
      'SUPPORT_SUMMARY_CONSUMER_NOT_CONSUMED_PROMOTION_INVENTORY: promotion application succeeded, but the supplied support summary did not consume the promoted complete-supported view'
  };
}

function getSupportPromotionCheckpointInvalidFields(
  checkpoint: Step37CheckpointInventoryItem | null,
  parentStageId: string
): string[] {
  if (checkpoint === null) {
    return ['checkpoint_id'];
  }

  return [
    ...(checkpoint.checkpoint_id.trim() !== STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_CHECKPOINT_ID ? ['checkpoint_id'] : []),
    ...(checkpoint.parent_stage_id.trim() !== STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_PARENT_STAGE_ID ||
    parentStageId !== STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_PARENT_STAGE_ID
      ? ['parent_stage_id']
      : []),
    ...(checkpoint.next_atomic_step.trim() !== STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_NEXT_ATOMIC_STEP ? ['next_atomic_step'] : []),
    ...(checkpoint.status !== 'unmet' ? ['status'] : []),
    ...(checkpoint.unmet_reason.trim().length === 0 ? ['unmet_reason'] : []),
    ...(checkpoint.source_plan_revision.trim().length === 0 ? ['source_plan_revision'] : [])
  ];
}

function getStage4ExitAuditCheckpointInvalidFields(checkpoint: Step37CheckpointInventoryItem | null, parentStageId: string): string[] {
  if (checkpoint === null) {
    return ['checkpoint_id'];
  }

  return [
    ...(checkpoint.checkpoint_id.trim() !== STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_CHECKPOINT_ID ? ['checkpoint_id'] : []),
    ...(checkpoint.parent_stage_id.trim() !== STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_PARENT_STAGE_ID ||
    parentStageId !== STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_PARENT_STAGE_ID
      ? ['parent_stage_id']
      : []),
    ...(checkpoint.next_atomic_step.trim() !== STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_NEXT_ATOMIC_STEP ? ['next_atomic_step'] : []),
    ...(checkpoint.status !== 'unmet' ? ['status'] : []),
    ...(checkpoint.unmet_reason.trim().length === 0 ? ['unmet_reason'] : []),
    ...(checkpoint.source_plan_revision.trim().length === 0 ? ['source_plan_revision'] : [])
  ];
}

function getStage5EntryAuditCheckpointInvalidFields(checkpoint: Step37CheckpointInventoryItem | null): string[] {
  if (checkpoint === null) {
    return ['checkpoint_id'];
  }

  return [
    ...(checkpoint.checkpoint_id.trim() !== STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID ? ['checkpoint_id'] : []),
    ...(checkpoint.parent_stage_id.trim() !== STEP37_STAGE5_ENTRY_AUDIT_PARENT_STAGE_ID ? ['parent_stage_id'] : []),
    ...(checkpoint.next_atomic_step.trim() !== STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_NEXT_ATOMIC_STEP ? ['next_atomic_step'] : []),
    ...(checkpoint.status !== 'unmet' ? ['status'] : []),
    ...(checkpoint.unmet_reason.trim().length === 0 ? ['unmet_reason'] : []),
    ...(checkpoint.source_plan_revision.trim().length === 0 ? ['source_plan_revision'] : [])
  ];
}

function getStage5ExactLockCheckpointInvalidFields(checkpoint: Step37CheckpointInventoryItem | null): string[] {
  if (checkpoint === null) {
    return ['checkpoint_id'];
  }

  return [
    ...(checkpoint.checkpoint_id.trim() !== STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID
      ? ['checkpoint_id']
      : []),
    ...(checkpoint.parent_stage_id.trim() !== STEP37_STAGE5_ENTRY_AUDIT_PARENT_STAGE_ID ? ['parent_stage_id'] : []),
    ...(checkpoint.next_atomic_step.trim() !== STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_NEXT_ATOMIC_STEP
      ? ['next_atomic_step']
      : []),
    ...(checkpoint.status !== 'unmet' ? ['status'] : []),
    ...(checkpoint.unmet_reason.trim().length === 0 ? ['unmet_reason'] : []),
    ...(checkpoint.source_plan_revision.trim().length === 0 ? ['source_plan_revision'] : [])
  ];
}

function getStage6ComposedDslSchemaCheckpointInvalidFields(checkpoint: Step37CheckpointInventoryItem | null): string[] {
  if (checkpoint === null) {
    return ['checkpoint_id'];
  }

  return [
    ...(checkpoint.checkpoint_id.trim() !== STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID
      ? ['checkpoint_id']
      : []),
    ...(checkpoint.parent_stage_id.trim() !== STEP37_STAGE6_COMPOSED_DSL_SCHEMA_PARENT_STAGE_ID ? ['parent_stage_id'] : []),
    ...(checkpoint.next_atomic_step.trim() !== STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_NEXT_ATOMIC_STEP
      ? ['next_atomic_step']
      : []),
    ...(checkpoint.status !== 'unmet' ? ['status'] : []),
    ...(checkpoint.unmet_reason.trim().length === 0 ? ['unmet_reason'] : []),
    ...(checkpoint.source_plan_revision.trim().length === 0 ? ['source_plan_revision'] : [])
  ];
}

function isStage4ExitAuditPassed(report: Step37Stage4ExitAuditReport | null): boolean {
  return report?.stage4ExitStatus === 'passed' && report.stage4ExitConditionsMet && report.parentStageStatusAfterAudit === 'complete';
}

function isStage5EntryAuditPassed(report: Step37Stage5EntryAuditReport | null): boolean {
  return (
    report?.stage5EntryStatus === 'passed' &&
    report.stage5EntryConditionsMet &&
    report.parentStageStatusAfterAudit === 'running' &&
    report.nextCheckpointId === STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID
  );
}

function isStage5ExactCapabilityLockPassed(
  report: Step37ExactCapabilityLockReport | null,
  staticCompleteSupportedCapabilityIds: readonly string[]
): boolean {
  const lockPackageCapabilityIds = report?.capabilityLock?.packages.map((entry) => entry.capabilityId).sort() ?? [];
  return (
    report?.exactLockStatus === 'passed' &&
    report.exactLockProduced &&
    report.blockers.length === 0 &&
    report.resolutionStatus === 'resolved' &&
    report.capabilityLock !== null &&
    report.lockHash !== null &&
    report.lockHash === report.capabilityLock.lockHash &&
    report.parentStageStatusAfterLock === 'complete' &&
    report.nextCheckpointId === STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID &&
    report.completeSupportedCount === staticCompleteSupportedCapabilityIds.length &&
    report.packageCount === staticCompleteSupportedCapabilityIds.length &&
    sameStringSet(report.completeSupportedCapabilityIds, staticCompleteSupportedCapabilityIds) &&
    sameStringSet(report.packageCapabilityIds, staticCompleteSupportedCapabilityIds) &&
    sameStringSet(report.selectedCapabilityIds, staticCompleteSupportedCapabilityIds) &&
    sameStringSet(report.capabilityLock.capabilityIds, staticCompleteSupportedCapabilityIds) &&
    sameStringSet(lockPackageCapabilityIds, staticCompleteSupportedCapabilityIds) &&
    !report.composedSchemaProduced &&
    !report.productionDefaultCutoverActive &&
    !report.legacyAuthoritativePathExited &&
    !report.finalClosureNotBlocked &&
    !report.globalExitConditionsMet
  );
}

function buildUnmetReason(capability: Step37RemainingCapabilityInventoryItem): string {
  const missingEvidence = capability.missingEvidenceDimensions.length > 0 ? capability.missingEvidenceDimensions.join(',') : 'none';
  const missingPrerequisites =
    capability.missingSupportEvidencePrerequisites.length > 0 ? capability.missingSupportEvidencePrerequisites.join(',') : 'none';
  return `Stage 4 ${capability.capabilityId} remains ${capability.state}; static completeSupported=false; missingEvidenceDimensions=[${missingEvidence}]; missingSupportEvidencePrerequisites=[${missingPrerequisites}].`;
}

function sanitizeCapabilityIdForCheckpoint(capabilityId: string): string {
  return capabilityId
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`STEP37_REMAINING_INVENTORY_FIELD_REQUIRED field="${field}"`);
  }
  return trimmed;
}
