import { type DeepSeekRunAndGunProfileSupportSummary } from './deepseek-run-and-gun-validation-profile-v1.js';
import { hashStableJson } from './gameplay-capabilities/stable-json.js';
import {
  STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID,
  STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID
} from './step37-remaining-inventory-driver.js';
import { type Step37Stage4ExitAuditReport } from './step37-stage4-exit-audit.js';

export const STEP37_STAGE5_ENTRY_AUDIT_ARTIFACT_KIND = 'step37_stage5_entry_audit_after_stage4_exit';
export const STEP37_STAGE5_ENTRY_AUDIT_SCHEMA_VERSION = 'step37_stage5_entry_audit_after_stage4_exit.v0.1';

export type Step37Stage5EntryAuditStatus = 'passed' | 'blocked';

export type Step37Stage5EntryAuditBlocker = {
  errorCode:
    | 'STAGE5_ENTRY_STAGE4_EXIT_AUDIT_HASH_MISMATCH'
    | 'STAGE5_ENTRY_STAGE4_EXIT_AUDIT_NOT_PASSED'
    | 'STAGE5_ENTRY_STAGE4_EXIT_NEXT_CHECKPOINT_MISMATCH'
    | 'STAGE5_ENTRY_SUPPORT_SUMMARY_NOT_COMPLETE'
    | 'STAGE5_ENTRY_COMPLETE_SUPPORTED_IDS_MISMATCH'
    | 'STAGE5_ENTRY_EXACT_LOCK_PREMATURE'
    | 'STAGE5_ENTRY_PRODUCTION_CUTOVER_PREMATURE'
    | 'STAGE5_ENTRY_LEGACY_AUTHORITY_EXIT_PREMATURE'
    | 'STAGE5_ENTRY_FINAL_CLOSURE_PREMATURE';
  capabilityIds: string[];
  actual?: string | number | boolean | null;
  expected?: string | number | boolean;
};

export type Step37Stage5EntryAuditReport = {
  artifactKind: typeof STEP37_STAGE5_ENTRY_AUDIT_ARTIFACT_KIND;
  schemaVersion: typeof STEP37_STAGE5_ENTRY_AUDIT_SCHEMA_VERSION;
  checkpointId: typeof STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID;
  parentStageId: 'stage5';
  sourceStage4ExitAuditPath: string;
  sourceStage4ExitAuditHash: string;
  expectedStage4ExitAuditHash: string;
  stage4ExitAuditHashMatches: boolean;
  sourceSupportViewHash: string;
  sourceInventoryHash: string;
  stage4ExitStatus: Step37Stage4ExitAuditReport['stage4ExitStatus'];
  stage4ExitConditionsMet: boolean;
  stage4NextCheckpointId: Step37Stage4ExitAuditReport['nextCheckpointId'];
  requiredCapabilityCount: number;
  registeredCapabilityCount: number;
  promotionEligibleCount: number;
  completeSupportedCount: number;
  completeSupportedCapabilityIds: string[];
  stage5EntryStatus: Step37Stage5EntryAuditStatus;
  stage5EntryConditionsMet: boolean;
  parentStageStatusAfterAudit: 'running' | 'complete';
  stage5ExactLockImplementationAllowed: boolean;
  exactCapabilityLockProduced: boolean;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
  globalExitConditionsMet: false;
  nextCheckpointId: typeof STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID | null;
  blockers: Step37Stage5EntryAuditBlocker[];
  auditHash: string;
};

export function buildStep37Stage5EntryAuditReport(input: {
  supportSummary: DeepSeekRunAndGunProfileSupportSummary;
  stage4ExitAuditReport: Step37Stage4ExitAuditReport;
  sourceStage4ExitAuditPath: string;
  sourceStage4ExitAuditHash: string;
  expectedStage4ExitAuditHash: string;
  exactCapabilityLockProduced?: boolean;
  productionDefaultCutoverActive?: boolean;
  legacyAuthoritativePathExited?: boolean;
  finalClosureNotBlocked?: boolean;
}): Step37Stage5EntryAuditReport {
  const sourceStage4ExitAuditPath = requireNonEmpty(input.sourceStage4ExitAuditPath, 'sourceStage4ExitAuditPath');
  const sourceStage4ExitAuditHash = requireNonEmpty(input.sourceStage4ExitAuditHash, 'sourceStage4ExitAuditHash');
  const expectedStage4ExitAuditHash = requireNonEmpty(input.expectedStage4ExitAuditHash, 'expectedStage4ExitAuditHash');
  const completeSupportedCapabilityIds = input.supportSummary.capabilities
    .filter((capability) => capability.completeSupported)
    .map((capability) => capability.capabilityId)
    .sort();
  const expectedCompleteSupportedCapabilityIds = [...input.stage4ExitAuditReport.completeSupportedCapabilityIds].sort();
  const exactCapabilityLockProduced = input.exactCapabilityLockProduced ?? false;
  const productionDefaultCutoverActive = input.productionDefaultCutoverActive ?? false;
  const legacyAuthoritativePathExited = input.legacyAuthoritativePathExited ?? false;
  const finalClosureNotBlocked = input.finalClosureNotBlocked ?? false;
  const blockers = buildStage5EntryAuditBlockers({
    supportSummary: input.supportSummary,
    stage4ExitAuditReport: input.stage4ExitAuditReport,
    sourceStage4ExitAuditHash,
    expectedStage4ExitAuditHash,
    completeSupportedCapabilityIds,
    expectedCompleteSupportedCapabilityIds,
    exactCapabilityLockProduced,
    productionDefaultCutoverActive,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked
  });
  const stage5EntryStatus: Step37Stage5EntryAuditStatus = blockers.length === 0 ? 'passed' : 'blocked';
  const payloadWithoutHash: Omit<Step37Stage5EntryAuditReport, 'auditHash'> = {
    artifactKind: STEP37_STAGE5_ENTRY_AUDIT_ARTIFACT_KIND,
    schemaVersion: STEP37_STAGE5_ENTRY_AUDIT_SCHEMA_VERSION,
    checkpointId: STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID,
    parentStageId: 'stage5',
    sourceStage4ExitAuditPath,
    sourceStage4ExitAuditHash,
    expectedStage4ExitAuditHash,
    stage4ExitAuditHashMatches: sourceStage4ExitAuditHash === expectedStage4ExitAuditHash,
    sourceSupportViewHash: input.stage4ExitAuditReport.sourceSupportViewHash,
    sourceInventoryHash: input.stage4ExitAuditReport.sourceInventoryHash,
    stage4ExitStatus: input.stage4ExitAuditReport.stage4ExitStatus,
    stage4ExitConditionsMet: input.stage4ExitAuditReport.stage4ExitConditionsMet,
    stage4NextCheckpointId: input.stage4ExitAuditReport.nextCheckpointId,
    requiredCapabilityCount: input.supportSummary.summary.requiredCapabilityCount,
    registeredCapabilityCount: input.supportSummary.summary.registeredCapabilityCount,
    promotionEligibleCount: input.stage4ExitAuditReport.promotionEligibleCount,
    completeSupportedCount: input.supportSummary.summary.completeSupportedCount,
    completeSupportedCapabilityIds,
    stage5EntryStatus,
    stage5EntryConditionsMet: stage5EntryStatus === 'passed',
    parentStageStatusAfterAudit: 'running',
    stage5ExactLockImplementationAllowed: stage5EntryStatus === 'passed',
    exactCapabilityLockProduced,
    productionDefaultCutoverActive,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked,
    globalExitConditionsMet: false,
    nextCheckpointId: stage5EntryStatus === 'passed' ? STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID : null,
    blockers
  };
  return {
    ...payloadWithoutHash,
    auditHash: hashStableJson(payloadWithoutHash)
  };
}

function buildStage5EntryAuditBlockers(input: {
  supportSummary: DeepSeekRunAndGunProfileSupportSummary;
  stage4ExitAuditReport: Step37Stage4ExitAuditReport;
  sourceStage4ExitAuditHash: string;
  expectedStage4ExitAuditHash: string;
  completeSupportedCapabilityIds: readonly string[];
  expectedCompleteSupportedCapabilityIds: readonly string[];
  exactCapabilityLockProduced: boolean;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
}): Step37Stage5EntryAuditBlocker[] {
  const blockers: Step37Stage5EntryAuditBlocker[] = [];
  const requiredCapabilityCount = input.supportSummary.summary.requiredCapabilityCount;

  if (input.sourceStage4ExitAuditHash !== input.expectedStage4ExitAuditHash) {
    blockers.push({
      errorCode: 'STAGE5_ENTRY_STAGE4_EXIT_AUDIT_HASH_MISMATCH',
      capabilityIds: [],
      actual: input.sourceStage4ExitAuditHash,
      expected: input.expectedStage4ExitAuditHash
    });
  }
  if (
    input.stage4ExitAuditReport.stage4ExitStatus !== 'passed' ||
    !input.stage4ExitAuditReport.stage4ExitConditionsMet ||
    input.stage4ExitAuditReport.parentStageStatusAfterAudit !== 'complete'
  ) {
    blockers.push({
      errorCode: 'STAGE5_ENTRY_STAGE4_EXIT_AUDIT_NOT_PASSED',
      capabilityIds: [],
      actual: input.stage4ExitAuditReport.stage4ExitStatus,
      expected: 'passed'
    });
  }
  if (input.stage4ExitAuditReport.nextCheckpointId !== STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID) {
    blockers.push({
      errorCode: 'STAGE5_ENTRY_STAGE4_EXIT_NEXT_CHECKPOINT_MISMATCH',
      capabilityIds: [],
      actual: input.stage4ExitAuditReport.nextCheckpointId,
      expected: STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID
    });
  }
  if (input.supportSummary.summary.completeSupportedCount !== requiredCapabilityCount) {
    blockers.push({
      errorCode: 'STAGE5_ENTRY_SUPPORT_SUMMARY_NOT_COMPLETE',
      capabilityIds: [...input.expectedCompleteSupportedCapabilityIds],
      actual: input.supportSummary.summary.completeSupportedCount,
      expected: requiredCapabilityCount
    });
  }
  if (!sameStringSet(input.completeSupportedCapabilityIds, input.expectedCompleteSupportedCapabilityIds)) {
    blockers.push({
      errorCode: 'STAGE5_ENTRY_COMPLETE_SUPPORTED_IDS_MISMATCH',
      capabilityIds: symmetricDifference(input.completeSupportedCapabilityIds, input.expectedCompleteSupportedCapabilityIds)
    });
  }
  if (input.exactCapabilityLockProduced) {
    blockers.push({
      errorCode: 'STAGE5_ENTRY_EXACT_LOCK_PREMATURE',
      capabilityIds: [],
      actual: true,
      expected: false
    });
  }
  if (input.productionDefaultCutoverActive) {
    blockers.push({
      errorCode: 'STAGE5_ENTRY_PRODUCTION_CUTOVER_PREMATURE',
      capabilityIds: [],
      actual: true,
      expected: false
    });
  }
  if (input.legacyAuthoritativePathExited) {
    blockers.push({
      errorCode: 'STAGE5_ENTRY_LEGACY_AUTHORITY_EXIT_PREMATURE',
      capabilityIds: [],
      actual: true,
      expected: false
    });
  }
  if (input.finalClosureNotBlocked) {
    blockers.push({
      errorCode: 'STAGE5_ENTRY_FINAL_CLOSURE_PREMATURE',
      capabilityIds: [],
      actual: true,
      expected: false
    });
  }
  return blockers.sort((left, right) => left.errorCode.localeCompare(right.errorCode));
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
    throw new Error(`STEP37_STAGE5_ENTRY_AUDIT_FIELD_REQUIRED field="${field}"`);
  }
  return trimmed;
}
