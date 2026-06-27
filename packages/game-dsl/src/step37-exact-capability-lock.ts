import {
  type DeepSeekRunAndGunProfileSupportSummary
} from './deepseek-run-and-gun-validation-profile-v1.js';
import * as packageRegistry from './gameplay-capabilities/index.js';
import {
  type CapabilityResolutionDiagnostic,
  resolveGameplayCapabilityGraph
} from './gameplay-capabilities/capability-resolver.js';
import { type GameplayCapabilityLock } from './gameplay-capabilities/capability-lock.js';
import {
  GameplayCapabilityPackageContractSchema,
  type GameplayCapabilityPackageContract
} from './gameplay-capabilities/package-contract.js';
import { PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY } from './gameplay-capabilities/phaser-runtime-loader.js';
import { hashStableJson } from './gameplay-capabilities/stable-json.js';
import {
  STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID,
  STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID
} from './step37-remaining-inventory-driver.js';
import { type Step37Stage5EntryAuditReport } from './step37-stage5-entry-audit.js';

export const STEP37_STAGE5_EXACT_CAPABILITY_LOCK_ARTIFACT_KIND =
  'step37_exact_capability_lock_from_complete_supported_packages';
export const STEP37_STAGE5_EXACT_CAPABILITY_LOCK_SCHEMA_VERSION =
  'step37_exact_capability_lock_from_complete_supported_packages.v0.1';

export type Step37ExactCapabilityLockStatus = 'passed' | 'blocked';

export type Step37ExactCapabilityLockBlocker = {
  errorCode:
    | 'STAGE5_EXACT_LOCK_STAGE5_ENTRY_AUDIT_HASH_MISMATCH'
    | 'STAGE5_EXACT_LOCK_STAGE5_ENTRY_AUDIT_NOT_PASSED'
    | 'STAGE5_EXACT_LOCK_STAGE5_ENTRY_NEXT_CHECKPOINT_MISMATCH'
    | 'STAGE5_EXACT_LOCK_SUPPORT_SUMMARY_NOT_COMPLETE'
    | 'STAGE5_EXACT_LOCK_COMPLETE_SUPPORTED_IDS_MISMATCH'
    | 'STAGE5_EXACT_LOCK_PACKAGE_IDS_MISMATCH'
    | 'STAGE5_EXACT_LOCK_DUPLICATE_PACKAGE_CAPABILITY'
    | 'STAGE5_EXACT_LOCK_RESOLUTION_BLOCKED'
    | 'STAGE5_EXACT_LOCK_LOCK_CAPABILITY_IDS_MISMATCH'
    | 'STAGE5_EXACT_LOCK_LOCK_HASH_MISMATCH'
    | 'STAGE5_EXACT_LOCK_COMPOSED_SCHEMA_PREMATURE'
    | 'STAGE5_EXACT_LOCK_PRODUCTION_CUTOVER_PREMATURE'
    | 'STAGE5_EXACT_LOCK_LEGACY_AUTHORITY_EXIT_PREMATURE'
    | 'STAGE5_EXACT_LOCK_FINAL_CLOSURE_PREMATURE';
  capabilityIds: string[];
  actual?: string | number | boolean | null;
  expected?: string | number | boolean;
};

export type Step37ExactCapabilityLockReport = {
  artifactKind: typeof STEP37_STAGE5_EXACT_CAPABILITY_LOCK_ARTIFACT_KIND;
  schemaVersion: typeof STEP37_STAGE5_EXACT_CAPABILITY_LOCK_SCHEMA_VERSION;
  checkpointId: typeof STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID;
  parentStageId: 'stage5';
  sourceStage5EntryAuditPath: string;
  sourceStage5EntryAuditHash: string;
  expectedStage5EntryAuditHash: string;
  stage5EntryAuditHashMatches: boolean;
  sourceStage4ExitAuditHash: string;
  sourceSupportViewHash: string;
  sourceInventoryHash: string;
  profileId: string;
  profileVersion: string;
  runtimeFamily: string;
  stage5EntryStatus: Step37Stage5EntryAuditReport['stage5EntryStatus'];
  stage5EntryConditionsMet: boolean;
  stage5EntryNextCheckpointId: Step37Stage5EntryAuditReport['nextCheckpointId'];
  requiredCapabilityCount: number;
  registeredCapabilityCount: number;
  completeSupportedCount: number;
  completeSupportedCapabilityIds: string[];
  packageCount: number;
  packageCapabilityIds: string[];
  selectedCapabilityIds: string[];
  resolutionStatus: 'resolved' | 'blocked';
  resolutionDiagnostics: CapabilityResolutionDiagnostic[];
  capabilityLock: GameplayCapabilityLock | null;
  lockHash: string | null;
  exactLockStatus: Step37ExactCapabilityLockStatus;
  exactLockProduced: boolean;
  parentStageStatusAfterLock: 'running' | 'complete';
  composedSchemaProduced: boolean;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
  globalExitConditionsMet: false;
  nextCheckpointId: typeof STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID | null;
  blockers: Step37ExactCapabilityLockBlocker[];
  auditHash: string;
};

export function createStep37CompleteSupportedPackageContracts(): GameplayCapabilityPackageContract[] {
  return Object.entries(packageRegistry)
    .filter(([name, value]) => /^create[A-Za-z0-9]+PackageContract$/.test(name) && typeof value === 'function')
    .map(([name, factory]) => {
      const parsed = GameplayCapabilityPackageContractSchema.safeParse((factory as () => unknown)());
      if (!parsed.success) {
        throw new Error(`STEP37_EXACT_LOCK_PACKAGE_FACTORY_INVALID factory="${name}"`);
      }
      return parsed.data;
    })
    .sort((left, right) => left.manifest.id.localeCompare(right.manifest.id));
}

export function buildStep37ExactCapabilityLockReport(input: {
  supportSummary: DeepSeekRunAndGunProfileSupportSummary;
  stage5EntryAuditReport: Step37Stage5EntryAuditReport;
  sourceStage5EntryAuditPath: string;
  sourceStage5EntryAuditHash: string;
  expectedStage5EntryAuditHash: string;
  packages: readonly unknown[];
  runtimeFamily?: string;
  composedSchemaProduced?: boolean;
  productionDefaultCutoverActive?: boolean;
  legacyAuthoritativePathExited?: boolean;
  finalClosureNotBlocked?: boolean;
}): Step37ExactCapabilityLockReport {
  const sourceStage5EntryAuditPath = requireNonEmpty(input.sourceStage5EntryAuditPath, 'sourceStage5EntryAuditPath');
  const sourceStage5EntryAuditHash = requireNonEmpty(input.sourceStage5EntryAuditHash, 'sourceStage5EntryAuditHash');
  const expectedStage5EntryAuditHash = requireNonEmpty(input.expectedStage5EntryAuditHash, 'expectedStage5EntryAuditHash');
  const runtimeFamily = input.runtimeFamily ?? PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY;
  const completeSupportedCapabilityIds = input.supportSummary.capabilities
    .filter((capability) => capability.completeSupported)
    .map((capability) => capability.capabilityId)
    .sort();
  const expectedCompleteSupportedCapabilityIds = [...input.stage5EntryAuditReport.completeSupportedCapabilityIds].sort();
  const parsedPackages = input.packages.flatMap((candidate) => {
    const parsed = GameplayCapabilityPackageContractSchema.safeParse(candidate);
    return parsed.success ? [parsed.data] : [];
  });
  const packageCapabilityIds = parsedPackages.map((contract) => contract.manifest.id).sort();
  const uniquePackageCapabilityIds = [...new Set(packageCapabilityIds)].sort();
  const duplicatePackageCapabilityIds = duplicateStrings(packageCapabilityIds);
  const resolution = resolveGameplayCapabilityGraph({
    requestedCapabilities: completeSupportedCapabilityIds,
    packages: input.packages,
    runtimeFamily
  });
  const composedSchemaProduced = input.composedSchemaProduced ?? false;
  const productionDefaultCutoverActive = input.productionDefaultCutoverActive ?? false;
  const legacyAuthoritativePathExited = input.legacyAuthoritativePathExited ?? false;
  const finalClosureNotBlocked = input.finalClosureNotBlocked ?? false;
  const blockers = buildExactLockBlockers({
    supportSummary: input.supportSummary,
    stage5EntryAuditReport: input.stage5EntryAuditReport,
    sourceStage5EntryAuditHash,
    expectedStage5EntryAuditHash,
    completeSupportedCapabilityIds,
    expectedCompleteSupportedCapabilityIds,
    packageCapabilityIds: uniquePackageCapabilityIds,
    duplicatePackageCapabilityIds,
    resolutionStatus: resolution.status,
    resolutionDiagnostics: resolution.diagnostics,
    lock: resolution.lock,
    composedSchemaProduced,
    productionDefaultCutoverActive,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked
  });
  const exactLockStatus: Step37ExactCapabilityLockStatus = blockers.length === 0 && resolution.lock !== undefined ? 'passed' : 'blocked';
  const capabilityLock = exactLockStatus === 'passed' ? resolution.lock ?? null : null;
  const payloadWithoutHash: Omit<Step37ExactCapabilityLockReport, 'auditHash'> = {
    artifactKind: STEP37_STAGE5_EXACT_CAPABILITY_LOCK_ARTIFACT_KIND,
    schemaVersion: STEP37_STAGE5_EXACT_CAPABILITY_LOCK_SCHEMA_VERSION,
    checkpointId: STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID,
    parentStageId: 'stage5',
    sourceStage5EntryAuditPath,
    sourceStage5EntryAuditHash,
    expectedStage5EntryAuditHash,
    stage5EntryAuditHashMatches: sourceStage5EntryAuditHash === expectedStage5EntryAuditHash,
    sourceStage4ExitAuditHash: input.stage5EntryAuditReport.sourceStage4ExitAuditHash,
    sourceSupportViewHash: input.stage5EntryAuditReport.sourceSupportViewHash,
    sourceInventoryHash: input.stage5EntryAuditReport.sourceInventoryHash,
    profileId: input.supportSummary.profileId,
    profileVersion: input.supportSummary.profileVersion,
    runtimeFamily,
    stage5EntryStatus: input.stage5EntryAuditReport.stage5EntryStatus,
    stage5EntryConditionsMet: input.stage5EntryAuditReport.stage5EntryConditionsMet,
    stage5EntryNextCheckpointId: input.stage5EntryAuditReport.nextCheckpointId,
    requiredCapabilityCount: input.supportSummary.summary.requiredCapabilityCount,
    registeredCapabilityCount: input.supportSummary.summary.registeredCapabilityCount,
    completeSupportedCount: input.supportSummary.summary.completeSupportedCount,
    completeSupportedCapabilityIds,
    packageCount: uniquePackageCapabilityIds.length,
    packageCapabilityIds: uniquePackageCapabilityIds,
    selectedCapabilityIds: [...resolution.selectedCapabilityIds],
    resolutionStatus: resolution.status,
    resolutionDiagnostics: resolution.diagnostics,
    capabilityLock,
    lockHash: capabilityLock?.lockHash ?? null,
    exactLockStatus,
    exactLockProduced: exactLockStatus === 'passed',
    parentStageStatusAfterLock: exactLockStatus === 'passed' ? 'complete' : 'running',
    composedSchemaProduced,
    productionDefaultCutoverActive,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked,
    globalExitConditionsMet: false,
    nextCheckpointId: exactLockStatus === 'passed' ? STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID : null,
    blockers
  };
  return { ...payloadWithoutHash, auditHash: hashStableJson(payloadWithoutHash) };
}

function buildExactLockBlockers(input: {
  supportSummary: DeepSeekRunAndGunProfileSupportSummary;
  stage5EntryAuditReport: Step37Stage5EntryAuditReport;
  sourceStage5EntryAuditHash: string;
  expectedStage5EntryAuditHash: string;
  completeSupportedCapabilityIds: readonly string[];
  expectedCompleteSupportedCapabilityIds: readonly string[];
  packageCapabilityIds: readonly string[];
  duplicatePackageCapabilityIds: readonly string[];
  resolutionStatus: 'resolved' | 'blocked';
  resolutionDiagnostics: readonly CapabilityResolutionDiagnostic[];
  lock?: GameplayCapabilityLock;
  composedSchemaProduced: boolean;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
}): Step37ExactCapabilityLockBlocker[] {
  const blockers: Step37ExactCapabilityLockBlocker[] = [];
  const requiredCapabilityCount = input.supportSummary.summary.requiredCapabilityCount;

  if (input.sourceStage5EntryAuditHash !== input.expectedStage5EntryAuditHash) {
    blockers.push({
      errorCode: 'STAGE5_EXACT_LOCK_STAGE5_ENTRY_AUDIT_HASH_MISMATCH',
      capabilityIds: [],
      actual: input.sourceStage5EntryAuditHash,
      expected: input.expectedStage5EntryAuditHash
    });
  }
  if (
    input.stage5EntryAuditReport.stage5EntryStatus !== 'passed' ||
    !input.stage5EntryAuditReport.stage5EntryConditionsMet ||
    input.stage5EntryAuditReport.parentStageStatusAfterAudit !== 'running'
  ) {
    blockers.push({
      errorCode: 'STAGE5_EXACT_LOCK_STAGE5_ENTRY_AUDIT_NOT_PASSED',
      capabilityIds: [],
      actual: input.stage5EntryAuditReport.stage5EntryStatus,
      expected: 'passed'
    });
  }
  if (input.stage5EntryAuditReport.nextCheckpointId !== STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID) {
    blockers.push({
      errorCode: 'STAGE5_EXACT_LOCK_STAGE5_ENTRY_NEXT_CHECKPOINT_MISMATCH',
      capabilityIds: [],
      actual: input.stage5EntryAuditReport.nextCheckpointId,
      expected: STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID
    });
  }
  if (input.supportSummary.summary.completeSupportedCount !== requiredCapabilityCount) {
    blockers.push({
      errorCode: 'STAGE5_EXACT_LOCK_SUPPORT_SUMMARY_NOT_COMPLETE',
      capabilityIds: [...input.expectedCompleteSupportedCapabilityIds],
      actual: input.supportSummary.summary.completeSupportedCount,
      expected: requiredCapabilityCount
    });
  }
  if (!sameStringSet(input.completeSupportedCapabilityIds, input.expectedCompleteSupportedCapabilityIds)) {
    blockers.push({
      errorCode: 'STAGE5_EXACT_LOCK_COMPLETE_SUPPORTED_IDS_MISMATCH',
      capabilityIds: symmetricDifference(input.completeSupportedCapabilityIds, input.expectedCompleteSupportedCapabilityIds)
    });
  }
  if (!sameStringSet(input.completeSupportedCapabilityIds, input.packageCapabilityIds)) {
    blockers.push({
      errorCode: 'STAGE5_EXACT_LOCK_PACKAGE_IDS_MISMATCH',
      capabilityIds: symmetricDifference(input.completeSupportedCapabilityIds, input.packageCapabilityIds)
    });
  }
  if (input.duplicatePackageCapabilityIds.length > 0) {
    blockers.push({
      errorCode: 'STAGE5_EXACT_LOCK_DUPLICATE_PACKAGE_CAPABILITY',
      capabilityIds: [...input.duplicatePackageCapabilityIds]
    });
  }
  if (input.resolutionStatus !== 'resolved') {
    blockers.push({
      errorCode: 'STAGE5_EXACT_LOCK_RESOLUTION_BLOCKED',
      capabilityIds: [...new Set(input.resolutionDiagnostics.map((diagnostic) => diagnostic.capabilityId))].sort()
    });
  }
  if (input.lock !== undefined && !sameStringSet(input.completeSupportedCapabilityIds, [...input.lock.capabilityIds].sort())) {
    blockers.push({
      errorCode: 'STAGE5_EXACT_LOCK_LOCK_CAPABILITY_IDS_MISMATCH',
      capabilityIds: symmetricDifference(input.completeSupportedCapabilityIds, [...input.lock.capabilityIds].sort())
    });
  }
  if (input.lock !== undefined) {
    const { lockHash: _lockHash, ...lockPayload } = input.lock;
    const recomputedLockHash = hashStableJson(lockPayload);
    if (input.lock.lockHash !== recomputedLockHash) {
      blockers.push({
        errorCode: 'STAGE5_EXACT_LOCK_LOCK_HASH_MISMATCH',
        capabilityIds: [],
        actual: input.lock.lockHash,
        expected: recomputedLockHash
      });
    }
  }
  if (input.composedSchemaProduced) {
    blockers.push({
      errorCode: 'STAGE5_EXACT_LOCK_COMPOSED_SCHEMA_PREMATURE',
      capabilityIds: [],
      actual: true,
      expected: false
    });
  }
  if (input.productionDefaultCutoverActive) {
    blockers.push({
      errorCode: 'STAGE5_EXACT_LOCK_PRODUCTION_CUTOVER_PREMATURE',
      capabilityIds: [],
      actual: true,
      expected: false
    });
  }
  if (input.legacyAuthoritativePathExited) {
    blockers.push({
      errorCode: 'STAGE5_EXACT_LOCK_LEGACY_AUTHORITY_EXIT_PREMATURE',
      capabilityIds: [],
      actual: true,
      expected: false
    });
  }
  if (input.finalClosureNotBlocked) {
    blockers.push({
      errorCode: 'STAGE5_EXACT_LOCK_FINAL_CLOSURE_PREMATURE',
      capabilityIds: [],
      actual: true,
      expected: false
    });
  }
  return blockers.sort((left, right) => left.errorCode.localeCompare(right.errorCode));
}

function duplicateStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates].sort();
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
    throw new Error(`STEP37_EXACT_CAPABILITY_LOCK_FIELD_REQUIRED field="${field}"`);
  }
  return trimmed;
}
