import {
  buildCapabilityGameDslDraftComposedSchemaIdentity,
  CapabilityGameDslDraftComposedSchemaIdentitySchema,
  type CapabilityGameDslDraftComposedSchemaIdentity
} from './schemas/capability-game-dsl-draft-v1.schema.js';
import { type Step37ExactCapabilityLockReport } from './step37-exact-capability-lock.js';
import {
  STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
  STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID
} from './step37-remaining-inventory-driver.js';
import { RUN_AND_GUN_REFERENCE_PROFILE_ID } from './gameplay-capabilities/run-and-gun-reference-composition.js';
import { hashStableJson } from './gameplay-capabilities/stable-json.js';

export const STEP37_STAGE6_COMPOSED_DSL_SCHEMA_ARTIFACT_KIND = 'step37_composed_dsl_schema_from_exact_capability_lock';
export const STEP37_STAGE6_COMPOSED_DSL_SCHEMA_SCHEMA_VERSION = 'step37_composed_dsl_schema_from_exact_capability_lock.v0.1';

export type Step37ComposedDslSchemaStatus = 'passed' | 'blocked';

export type Step37ComposedDslSchemaBlocker = {
  errorCode:
    | 'STAGE6_COMPOSED_SCHEMA_EXACT_LOCK_AUDIT_HASH_MISMATCH'
    | 'STAGE6_COMPOSED_SCHEMA_EXACT_LOCK_NOT_PASSED'
    | 'STAGE6_COMPOSED_SCHEMA_EXACT_LOCK_NEXT_CHECKPOINT_MISMATCH'
    | 'STAGE6_COMPOSED_SCHEMA_LOCK_HASH_MISMATCH'
    | 'STAGE6_COMPOSED_SCHEMA_CAPABILITY_IDS_MISMATCH'
    | 'STAGE6_COMPOSED_SCHEMA_IDENTITY_INVALID'
    | 'STAGE6_COMPOSED_SCHEMA_IDENTITY_CAPABILITY_IDS_MISMATCH'
    | 'STAGE6_COMPOSED_SCHEMA_IDENTITY_PROFILE_MISMATCH'
    | 'STAGE6_COMPOSED_SCHEMA_PROVIDER_DRAFT_PREMATURE'
    | 'STAGE6_COMPOSED_SCHEMA_NORMALIZATION_PREMATURE'
    | 'STAGE6_COMPOSED_SCHEMA_COMPILATION_PREMATURE'
    | 'STAGE6_COMPOSED_SCHEMA_RUNTIME_CONSUMPTION_PREMATURE'
    | 'STAGE6_COMPOSED_SCHEMA_QA_OBSERVATION_PREMATURE'
    | 'STAGE6_COMPOSED_SCHEMA_PRODUCTION_CUTOVER_PREMATURE'
    | 'STAGE6_COMPOSED_SCHEMA_LEGACY_AUTHORITY_EXIT_PREMATURE'
    | 'STAGE6_COMPOSED_SCHEMA_FINAL_CLOSURE_PREMATURE';
  capabilityIds: string[];
  actual?: string | number | boolean | null;
  expected?: string | number | boolean;
};

export type Step37ComposedDslSchemaReport = {
  artifactKind: typeof STEP37_STAGE6_COMPOSED_DSL_SCHEMA_ARTIFACT_KIND;
  schemaVersion: typeof STEP37_STAGE6_COMPOSED_DSL_SCHEMA_SCHEMA_VERSION;
  checkpointId: typeof STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID;
  parentStageId: 'stage6';
  sourceExactCapabilityLockPath: string;
  sourceExactCapabilityLockAuditHash: string;
  expectedExactCapabilityLockAuditHash: string;
  exactCapabilityLockAuditHashMatches: boolean;
  sourceStage5EntryAuditHash: string;
  sourceStage4ExitAuditHash: string;
  sourceSupportViewHash: string;
  sourceInventoryHash: string;
  sourceExactCapabilityLockHash: string | null;
  profileId: Step37ExactCapabilityLockReport['profileId'];
  draftProfileId: string;
  profileVersion: Step37ExactCapabilityLockReport['profileVersion'];
  runtimeFamily: Step37ExactCapabilityLockReport['runtimeFamily'];
  exactLockStatus: Step37ExactCapabilityLockReport['exactLockStatus'];
  exactLockProduced: boolean;
  exactLockNextCheckpointId: Step37ExactCapabilityLockReport['nextCheckpointId'];
  requiredCapabilityCount: number;
  completeSupportedCount: number;
  packageCount: number;
  completeSupportedCapabilityIds: string[];
  selectedCapabilityIds: string[];
  lockCapabilityIds: string[];
  composedSchemaIdentity: CapabilityGameDslDraftComposedSchemaIdentity | null;
  composedSchemaHash: string | null;
  composedSchemaStatus: Step37ComposedDslSchemaStatus;
  composedSchemaProduced: boolean;
  schemaExpressible: boolean;
  providerDraftProduced: boolean;
  normalized: boolean;
  compiled: boolean;
  runtimeConsumed: boolean;
  qaObserved: boolean;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
  globalExitConditionsMet: false;
  parentStageStatusAfterSchema: 'running' | 'complete';
  nextCheckpointId: typeof STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID | null;
  blockers: Step37ComposedDslSchemaBlocker[];
  auditHash: string;
};

export function buildStep37ComposedDslSchemaReport(input: {
  exactCapabilityLockReport: Step37ExactCapabilityLockReport;
  sourceExactCapabilityLockPath: string;
  sourceExactCapabilityLockAuditHash: string;
  expectedExactCapabilityLockAuditHash: string;
  draftProfileId?: string;
  composedSchemaIdentity?: unknown;
  providerDraftProduced?: boolean;
  normalized?: boolean;
  compiled?: boolean;
  runtimeConsumed?: boolean;
  qaObserved?: boolean;
  productionDefaultCutoverActive?: boolean;
  legacyAuthoritativePathExited?: boolean;
  finalClosureNotBlocked?: boolean;
}): Step37ComposedDslSchemaReport {
  const sourceExactCapabilityLockPath = requireNonEmpty(input.sourceExactCapabilityLockPath, 'sourceExactCapabilityLockPath');
  const sourceExactCapabilityLockAuditHash = requireNonEmpty(input.sourceExactCapabilityLockAuditHash, 'sourceExactCapabilityLockAuditHash');
  const expectedExactCapabilityLockAuditHash = requireNonEmpty(
    input.expectedExactCapabilityLockAuditHash,
    'expectedExactCapabilityLockAuditHash'
  );
  const draftProfileId = requireNonEmpty(input.draftProfileId ?? RUN_AND_GUN_REFERENCE_PROFILE_ID, 'draftProfileId');
  const providerDraftProduced = input.providerDraftProduced ?? false;
  const normalized = input.normalized ?? false;
  const compiled = input.compiled ?? false;
  const runtimeConsumed = input.runtimeConsumed ?? false;
  const qaObserved = input.qaObserved ?? false;
  const productionDefaultCutoverActive = input.productionDefaultCutoverActive ?? false;
  const legacyAuthoritativePathExited = input.legacyAuthoritativePathExited ?? false;
  const finalClosureNotBlocked = input.finalClosureNotBlocked ?? false;
  const expectedCapabilityIds = [...input.exactCapabilityLockReport.completeSupportedCapabilityIds].sort();
  const lockCapabilityIds = input.exactCapabilityLockReport.capabilityLock?.capabilityIds !== undefined
    ? [...input.exactCapabilityLockReport.capabilityLock.capabilityIds].sort()
    : [];
  const composedSchemaIdentity = buildComposedSchemaIdentity({
    draftProfileId,
    capabilityIds: expectedCapabilityIds,
    override: input.composedSchemaIdentity
  });
  const blockers = buildComposedSchemaBlockers({
    exactCapabilityLockReport: input.exactCapabilityLockReport,
    sourceExactCapabilityLockAuditHash,
    expectedExactCapabilityLockAuditHash,
    expectedCapabilityIds,
    lockCapabilityIds,
    draftProfileId,
    composedSchemaIdentity,
    providerDraftProduced,
    normalized,
    compiled,
    runtimeConsumed,
    qaObserved,
    productionDefaultCutoverActive,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked
  });
  const composedSchemaStatus: Step37ComposedDslSchemaStatus = blockers.length === 0 && composedSchemaIdentity !== null ? 'passed' : 'blocked';
  const payloadWithoutHash: Omit<Step37ComposedDslSchemaReport, 'auditHash'> = {
    artifactKind: STEP37_STAGE6_COMPOSED_DSL_SCHEMA_ARTIFACT_KIND,
    schemaVersion: STEP37_STAGE6_COMPOSED_DSL_SCHEMA_SCHEMA_VERSION,
    checkpointId: STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID,
    parentStageId: 'stage6',
    sourceExactCapabilityLockPath,
    sourceExactCapabilityLockAuditHash,
    expectedExactCapabilityLockAuditHash,
    exactCapabilityLockAuditHashMatches: sourceExactCapabilityLockAuditHash === expectedExactCapabilityLockAuditHash,
    sourceStage5EntryAuditHash: input.exactCapabilityLockReport.sourceStage5EntryAuditHash,
    sourceStage4ExitAuditHash: input.exactCapabilityLockReport.sourceStage4ExitAuditHash,
    sourceSupportViewHash: input.exactCapabilityLockReport.sourceSupportViewHash,
    sourceInventoryHash: input.exactCapabilityLockReport.sourceInventoryHash,
    sourceExactCapabilityLockHash: input.exactCapabilityLockReport.lockHash,
    profileId: input.exactCapabilityLockReport.profileId,
    draftProfileId,
    profileVersion: input.exactCapabilityLockReport.profileVersion,
    runtimeFamily: input.exactCapabilityLockReport.runtimeFamily,
    exactLockStatus: input.exactCapabilityLockReport.exactLockStatus,
    exactLockProduced: input.exactCapabilityLockReport.exactLockProduced,
    exactLockNextCheckpointId: input.exactCapabilityLockReport.nextCheckpointId,
    requiredCapabilityCount: input.exactCapabilityLockReport.requiredCapabilityCount,
    completeSupportedCount: input.exactCapabilityLockReport.completeSupportedCount,
    packageCount: input.exactCapabilityLockReport.packageCount,
    completeSupportedCapabilityIds: expectedCapabilityIds,
    selectedCapabilityIds: [...input.exactCapabilityLockReport.selectedCapabilityIds].sort(),
    lockCapabilityIds,
    composedSchemaIdentity: composedSchemaStatus === 'passed' ? composedSchemaIdentity : null,
    composedSchemaHash: composedSchemaStatus === 'passed' ? composedSchemaIdentity?.schemaHash ?? null : null,
    composedSchemaStatus,
    composedSchemaProduced: composedSchemaStatus === 'passed',
    schemaExpressible: composedSchemaStatus === 'passed',
    providerDraftProduced,
    normalized,
    compiled,
    runtimeConsumed,
    qaObserved,
    productionDefaultCutoverActive,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked,
    globalExitConditionsMet: false,
    parentStageStatusAfterSchema: composedSchemaStatus === 'passed' ? 'running' : 'complete',
    nextCheckpointId: composedSchemaStatus === 'passed' ? STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID : null,
    blockers
  };
  return { ...payloadWithoutHash, auditHash: hashStableJson(payloadWithoutHash) };
}

function buildComposedSchemaIdentity(input: {
  draftProfileId: string;
  capabilityIds: readonly string[];
  override?: unknown;
}): CapabilityGameDslDraftComposedSchemaIdentity | null {
  if (input.override !== undefined) {
    const parsed = CapabilityGameDslDraftComposedSchemaIdentitySchema.safeParse(input.override);
    return parsed.success ? parsed.data : null;
  }

  try {
    return buildCapabilityGameDslDraftComposedSchemaIdentity({
      profileId: input.draftProfileId,
      capabilityIds: input.capabilityIds
    });
  } catch {
    return null;
  }
}

function buildComposedSchemaBlockers(input: {
  exactCapabilityLockReport: Step37ExactCapabilityLockReport;
  sourceExactCapabilityLockAuditHash: string;
  expectedExactCapabilityLockAuditHash: string;
  expectedCapabilityIds: readonly string[];
  lockCapabilityIds: readonly string[];
  draftProfileId: string;
  composedSchemaIdentity: CapabilityGameDslDraftComposedSchemaIdentity | null;
  providerDraftProduced: boolean;
  normalized: boolean;
  compiled: boolean;
  runtimeConsumed: boolean;
  qaObserved: boolean;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
}): Step37ComposedDslSchemaBlocker[] {
  const blockers: Step37ComposedDslSchemaBlocker[] = [];
  const report = input.exactCapabilityLockReport;

  if (input.sourceExactCapabilityLockAuditHash !== input.expectedExactCapabilityLockAuditHash) {
    blockers.push({
      errorCode: 'STAGE6_COMPOSED_SCHEMA_EXACT_LOCK_AUDIT_HASH_MISMATCH',
      capabilityIds: [],
      actual: input.sourceExactCapabilityLockAuditHash,
      expected: input.expectedExactCapabilityLockAuditHash
    });
  }
  if (
    report.exactLockStatus !== 'passed' ||
    !report.exactLockProduced ||
    report.blockers.length > 0 ||
    report.capabilityLock === null ||
    report.lockHash === null ||
    report.parentStageStatusAfterLock !== 'complete'
  ) {
    blockers.push({
      errorCode: 'STAGE6_COMPOSED_SCHEMA_EXACT_LOCK_NOT_PASSED',
      capabilityIds: [...input.expectedCapabilityIds],
      actual: report.exactLockStatus,
      expected: 'passed'
    });
  }
  if (report.nextCheckpointId !== STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID) {
    blockers.push({
      errorCode: 'STAGE6_COMPOSED_SCHEMA_EXACT_LOCK_NEXT_CHECKPOINT_MISMATCH',
      capabilityIds: [],
      actual: report.nextCheckpointId,
      expected: STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID
    });
  }
  if (report.capabilityLock !== null && report.lockHash !== report.capabilityLock.lockHash) {
    blockers.push({
      errorCode: 'STAGE6_COMPOSED_SCHEMA_LOCK_HASH_MISMATCH',
      capabilityIds: [],
      actual: report.lockHash,
      expected: report.capabilityLock.lockHash
    });
  }
  if (!sameStringSet(input.expectedCapabilityIds, [...report.selectedCapabilityIds].sort()) || !sameStringSet(input.expectedCapabilityIds, input.lockCapabilityIds)) {
    blockers.push({
      errorCode: 'STAGE6_COMPOSED_SCHEMA_CAPABILITY_IDS_MISMATCH',
      capabilityIds: [
        ...new Set([
          ...symmetricDifference(input.expectedCapabilityIds, [...report.selectedCapabilityIds].sort()),
          ...symmetricDifference(input.expectedCapabilityIds, input.lockCapabilityIds)
        ])
      ].sort()
    });
  }
  if (input.composedSchemaIdentity === null) {
    blockers.push({
      errorCode: 'STAGE6_COMPOSED_SCHEMA_IDENTITY_INVALID',
      capabilityIds: [...input.expectedCapabilityIds],
      actual: null,
      expected: 'valid_composed_schema_identity'
    });
  } else {
    if (!sameStringSet(input.composedSchemaIdentity.capabilityIds, input.expectedCapabilityIds)) {
      blockers.push({
        errorCode: 'STAGE6_COMPOSED_SCHEMA_IDENTITY_CAPABILITY_IDS_MISMATCH',
        capabilityIds: symmetricDifference(input.composedSchemaIdentity.capabilityIds, input.expectedCapabilityIds)
      });
    }
    if (input.composedSchemaIdentity.profileId !== input.draftProfileId) {
      blockers.push({
        errorCode: 'STAGE6_COMPOSED_SCHEMA_IDENTITY_PROFILE_MISMATCH',
        capabilityIds: [],
        actual: input.composedSchemaIdentity.profileId,
        expected: input.draftProfileId
      });
    }
  }
  addPrematureBlocker(blockers, input.providerDraftProduced, 'STAGE6_COMPOSED_SCHEMA_PROVIDER_DRAFT_PREMATURE');
  addPrematureBlocker(blockers, input.normalized, 'STAGE6_COMPOSED_SCHEMA_NORMALIZATION_PREMATURE');
  addPrematureBlocker(blockers, input.compiled, 'STAGE6_COMPOSED_SCHEMA_COMPILATION_PREMATURE');
  addPrematureBlocker(blockers, input.runtimeConsumed, 'STAGE6_COMPOSED_SCHEMA_RUNTIME_CONSUMPTION_PREMATURE');
  addPrematureBlocker(blockers, input.qaObserved, 'STAGE6_COMPOSED_SCHEMA_QA_OBSERVATION_PREMATURE');
  addPrematureBlocker(blockers, input.productionDefaultCutoverActive, 'STAGE6_COMPOSED_SCHEMA_PRODUCTION_CUTOVER_PREMATURE');
  addPrematureBlocker(blockers, input.legacyAuthoritativePathExited, 'STAGE6_COMPOSED_SCHEMA_LEGACY_AUTHORITY_EXIT_PREMATURE');
  addPrematureBlocker(blockers, input.finalClosureNotBlocked, 'STAGE6_COMPOSED_SCHEMA_FINAL_CLOSURE_PREMATURE');
  return blockers.sort((left, right) => left.errorCode.localeCompare(right.errorCode));
}

function addPrematureBlocker(
  blockers: Step37ComposedDslSchemaBlocker[],
  actual: boolean,
  errorCode: Step37ComposedDslSchemaBlocker['errorCode']
): void {
  if (!actual) {
    return;
  }
  blockers.push({ errorCode, capabilityIds: [], actual: true, expected: false });
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function symmetricDifference(left: readonly string[], right: readonly string[]): string[] {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return [...new Set([...left.filter((value) => !rightSet.has(value)), ...right.filter((value) => !leftSet.has(value))])].sort();
}

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`STEP37_COMPOSED_DSL_SCHEMA_FIELD_REQUIRED field="${field}"`);
  }
  return trimmed;
}
