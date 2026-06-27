import {
  type DeepSeekRunAndGunProfileCapabilitySupport,
  type DeepSeekRunAndGunProfileSupportSummary
} from './deepseek-run-and-gun-validation-profile-v1.js';
import { selectNextAtomicCheckpoint, type Step37CheckpointInventoryItem, type Step37NextAtomicCheckpoint } from './step37-parent-loop-driver.js';

export const STEP37_REMAINING_INVENTORY_ARTIFACT_KIND = 'step37_remaining_complete_supported_inventory';
export const STEP37_REMAINING_INVENTORY_SCHEMA_VERSION = 'step37_remaining_complete_supported_inventory.v0.1';
export const STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_CHECKPOINT_ID =
  'stage4.support_promotion_from_same_run_observed_package_receipts';
export const STEP37_SUPPORT_PROMOTION_AFTER_PACKAGE_EXHAUSTION_NEXT_ATOMIC_STEP =
  'Stage 4 support promotion from same-run observed package receipts atomic step';

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
  const supportPromotionCheckpoint =
    supportPromotionRequired && input.supportPromotionCheckpoint !== undefined && input.supportPromotionCheckpoint !== null
      ? [input.supportPromotionCheckpoint]
      : [];
  const checkpointInventory = [...packageCheckpointInventory, ...supportPromotionCheckpoint];
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
      supportPromotionCheckpointProvided: input.supportPromotionCheckpoint !== undefined && input.supportPromotionCheckpoint !== null,
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
  supportPromotionCheckpointProvided: boolean;
  unmetStaticCompleteSupportedCount: number;
}): Step37RemainingInventorySelectionFailure | null {
  if (input.nextCheckpoint !== null || input.unmetStaticCompleteSupportedCount <= 0) {
    return null;
  }

  if (input.supportPromotionRequired && !input.supportPromotionCheckpointProvided) {
    return {
      error_code: 'SUPPORT_PROMOTION_CHECKPOINT_REQUIRED',
      global_exit_conditions_met: false,
      user_input_required: false,
      parent_stage_status: 'running',
      stage5_entry_allowed: false,
      unmet_static_complete_supported_count: input.unmetStaticCompleteSupportedCount,
      reason: 'observed inventory exhausted but static support promotion not consumed',
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

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`STEP37_REMAINING_INVENTORY_FIELD_REQUIRED field="${field}"`);
  }
  return trimmed;
}
