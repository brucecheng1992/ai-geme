import { type DeepSeekRunAndGunProfileSupportSummary } from './deepseek-run-and-gun-validation-profile-v1.js';
import { hashStableJson } from './gameplay-capabilities/stable-json.js';
import {
  STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_CHECKPOINT_ID,
  STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID
} from './step37-remaining-inventory-driver.js';
import { type Step37SupportPromotionApplicationReport } from './step37-support-promotion-inventory.js';

export const STEP37_STAGE4_EXIT_AUDIT_ARTIFACT_KIND = 'step37_stage4_exit_audit_after_support_promotion';
export const STEP37_STAGE4_EXIT_AUDIT_SCHEMA_VERSION = 'step37_stage4_exit_audit_after_support_promotion.v0.1';

export type Step37Stage4ExitAuditStatus = 'passed' | 'blocked';

export type Step37Stage4ExitAuditBlocker = {
  errorCode:
    | 'STAGE4_EXIT_SUPPORT_VIEW_HASH_MISMATCH'
    | 'STAGE4_EXIT_PROMOTION_APPLICATION_NOT_APPLIED'
    | 'STAGE4_EXIT_PROMOTION_INVENTORY_HASH_MISMATCH'
    | 'STAGE4_EXIT_SUPPORT_SUMMARY_NOT_COMPLETE'
    | 'STAGE4_EXIT_SUPPORT_SUMMARY_NOT_FULLY_REGISTERED'
    | 'STAGE4_EXIT_PROMOTION_ELIGIBLE_COUNT_MISMATCH'
    | 'STAGE4_EXIT_COMPLETE_SUPPORTED_IDS_MISMATCH'
    | 'STAGE4_EXIT_STAGE5_EXACT_LOCK_PREMATURE'
    | 'STAGE4_EXIT_PRODUCTION_CUTOVER_PREMATURE'
    | 'STAGE4_EXIT_LEGACY_AUTHORITY_EXIT_PREMATURE'
    | 'STAGE4_EXIT_FINAL_CLOSURE_PREMATURE';
  capabilityIds: string[];
  actual?: string | number | boolean;
  expected?: string | number | boolean;
};

export type Step37Stage4ExitAuditReport = {
  artifactKind: typeof STEP37_STAGE4_EXIT_AUDIT_ARTIFACT_KIND;
  schemaVersion: typeof STEP37_STAGE4_EXIT_AUDIT_SCHEMA_VERSION;
  checkpointId: typeof STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_CHECKPOINT_ID;
  parentStageId: 'stage4';
  sourceSupportViewPath: string;
  sourceSupportViewHash: string;
  expectedSupportViewHash: string;
  supportViewHashMatches: boolean;
  sourceInventoryHash: string;
  supportPromotionApplicationStatus: Step37SupportPromotionApplicationReport['applicationStatus'];
  supportSummaryConsumer: Step37SupportPromotionApplicationReport['supportSummaryConsumer'];
  requiredCapabilityCount: number;
  registeredCapabilityCount: number;
  promotionEligibleCount: number;
  completeSupportedCount: number;
  completeSupportedCapabilityIds: string[];
  stage4ExitStatus: Step37Stage4ExitAuditStatus;
  stage4ExitConditionsMet: boolean;
  parentStageStatusAfterAudit: 'running' | 'complete';
  stage5EntryAuditAllowed: boolean;
  stage5ExactLockAllowed: boolean;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
  globalExitConditionsMet: false;
  nextCheckpointId: typeof STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID | null;
  blockers: Step37Stage4ExitAuditBlocker[];
  auditHash: string;
};

export function buildStep37Stage4ExitAuditReport(input: {
  supportSummary: DeepSeekRunAndGunProfileSupportSummary;
  promotionApplicationReport: Step37SupportPromotionApplicationReport;
  sourceSupportViewPath: string;
  sourceSupportViewHash: string;
  expectedSupportViewHash: string;
  stage5ExactLockAllowed?: boolean;
  productionDefaultCutoverActive?: boolean;
  legacyAuthoritativePathExited?: boolean;
  finalClosureNotBlocked?: boolean;
}): Step37Stage4ExitAuditReport {
  const sourceSupportViewPath = requireNonEmpty(input.sourceSupportViewPath, 'sourceSupportViewPath');
  const sourceSupportViewHash = requireNonEmpty(input.sourceSupportViewHash, 'sourceSupportViewHash');
  const expectedSupportViewHash = requireNonEmpty(input.expectedSupportViewHash, 'expectedSupportViewHash');
  const completeSupportedCapabilityIds = input.supportSummary.capabilities
    .filter((capability) => capability.completeSupported)
    .map((capability) => capability.capabilityId)
    .sort();
  const expectedCompleteSupportedCapabilityIds = [...input.promotionApplicationReport.completeSupportedCapabilityIds].sort();
  const stage5ExactLockAllowed = input.stage5ExactLockAllowed ?? false;
  const productionDefaultCutoverActive = input.productionDefaultCutoverActive ?? false;
  const legacyAuthoritativePathExited = input.legacyAuthoritativePathExited ?? false;
  const finalClosureNotBlocked = input.finalClosureNotBlocked ?? false;
  const blockers = buildStage4ExitAuditBlockers({
    supportSummary: input.supportSummary,
    promotionApplicationReport: input.promotionApplicationReport,
    sourceSupportViewHash,
    expectedSupportViewHash,
    completeSupportedCapabilityIds,
    expectedCompleteSupportedCapabilityIds,
    stage5ExactLockAllowed,
    productionDefaultCutoverActive,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked
  });
  const stage4ExitStatus: Step37Stage4ExitAuditStatus = blockers.length === 0 ? 'passed' : 'blocked';
  const payloadWithoutHash: Omit<Step37Stage4ExitAuditReport, 'auditHash'> = {
    artifactKind: STEP37_STAGE4_EXIT_AUDIT_ARTIFACT_KIND,
    schemaVersion: STEP37_STAGE4_EXIT_AUDIT_SCHEMA_VERSION,
    checkpointId: STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_CHECKPOINT_ID,
    parentStageId: 'stage4',
    sourceSupportViewPath,
    sourceSupportViewHash,
    expectedSupportViewHash,
    supportViewHashMatches: sourceSupportViewHash === expectedSupportViewHash,
    sourceInventoryHash: input.promotionApplicationReport.sourceInventoryHash,
    supportPromotionApplicationStatus: input.promotionApplicationReport.applicationStatus,
    supportSummaryConsumer: input.promotionApplicationReport.supportSummaryConsumer,
    requiredCapabilityCount: input.supportSummary.summary.requiredCapabilityCount,
    registeredCapabilityCount: input.supportSummary.summary.registeredCapabilityCount,
    promotionEligibleCount: input.promotionApplicationReport.promotionEligibleCount,
    completeSupportedCount: input.supportSummary.summary.completeSupportedCount,
    completeSupportedCapabilityIds,
    stage4ExitStatus,
    stage4ExitConditionsMet: stage4ExitStatus === 'passed',
    parentStageStatusAfterAudit: stage4ExitStatus === 'passed' ? 'complete' : 'running',
    stage5EntryAuditAllowed: stage4ExitStatus === 'passed',
    stage5ExactLockAllowed,
    productionDefaultCutoverActive,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked,
    globalExitConditionsMet: false,
    nextCheckpointId: stage4ExitStatus === 'passed' ? STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID : null,
    blockers
  };
  return {
    ...payloadWithoutHash,
    auditHash: hashStableJson(payloadWithoutHash)
  };
}

function buildStage4ExitAuditBlockers(input: {
  supportSummary: DeepSeekRunAndGunProfileSupportSummary;
  promotionApplicationReport: Step37SupportPromotionApplicationReport;
  sourceSupportViewHash: string;
  expectedSupportViewHash: string;
  completeSupportedCapabilityIds: readonly string[];
  expectedCompleteSupportedCapabilityIds: readonly string[];
  stage5ExactLockAllowed: boolean;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
}): Step37Stage4ExitAuditBlocker[] {
  const blockers: Step37Stage4ExitAuditBlocker[] = [];
  const requiredCapabilityCount = input.supportSummary.summary.requiredCapabilityCount;

  if (input.sourceSupportViewHash !== input.expectedSupportViewHash) {
    blockers.push({
      errorCode: 'STAGE4_EXIT_SUPPORT_VIEW_HASH_MISMATCH',
      capabilityIds: [],
      actual: input.sourceSupportViewHash,
      expected: input.expectedSupportViewHash
    });
  }
  if (input.promotionApplicationReport.applicationStatus !== 'applied') {
    blockers.push({
      errorCode: 'STAGE4_EXIT_PROMOTION_APPLICATION_NOT_APPLIED',
      capabilityIds: input.promotionApplicationReport.blockedCapabilityIds,
      actual: input.promotionApplicationReport.applicationStatus,
      expected: 'applied'
    });
  }
  if (!input.promotionApplicationReport.inventoryHashMatches) {
    blockers.push({
      errorCode: 'STAGE4_EXIT_PROMOTION_INVENTORY_HASH_MISMATCH',
      capabilityIds: [],
      actual: input.promotionApplicationReport.sourceInventoryHash,
      expected: input.promotionApplicationReport.expectedInventoryHash
    });
  }
  if (input.supportSummary.summary.completeSupportedCount !== requiredCapabilityCount) {
    blockers.push({
      errorCode: 'STAGE4_EXIT_SUPPORT_SUMMARY_NOT_COMPLETE',
      capabilityIds: input.promotionApplicationReport.completeSupportedCapabilityIds,
      actual: input.supportSummary.summary.completeSupportedCount,
      expected: requiredCapabilityCount
    });
  }
  if (input.supportSummary.summary.registeredCapabilityCount !== requiredCapabilityCount) {
    blockers.push({
      errorCode: 'STAGE4_EXIT_SUPPORT_SUMMARY_NOT_FULLY_REGISTERED',
      capabilityIds: input.supportSummary.capabilities.filter((capability) => !capability.registered).map((capability) => capability.capabilityId),
      actual: input.supportSummary.summary.registeredCapabilityCount,
      expected: requiredCapabilityCount
    });
  }
  if (input.promotionApplicationReport.promotionEligibleCount !== requiredCapabilityCount) {
    blockers.push({
      errorCode: 'STAGE4_EXIT_PROMOTION_ELIGIBLE_COUNT_MISMATCH',
      capabilityIds: input.promotionApplicationReport.blockedCapabilityIds,
      actual: input.promotionApplicationReport.promotionEligibleCount,
      expected: requiredCapabilityCount
    });
  }
  if (!sameStringSet(input.completeSupportedCapabilityIds, input.expectedCompleteSupportedCapabilityIds)) {
    blockers.push({
      errorCode: 'STAGE4_EXIT_COMPLETE_SUPPORTED_IDS_MISMATCH',
      capabilityIds: symmetricDifference(input.completeSupportedCapabilityIds, input.expectedCompleteSupportedCapabilityIds)
    });
  }
  if (input.stage5ExactLockAllowed) {
    blockers.push({
      errorCode: 'STAGE4_EXIT_STAGE5_EXACT_LOCK_PREMATURE',
      capabilityIds: [],
      actual: true,
      expected: false
    });
  }
  if (input.productionDefaultCutoverActive) {
    blockers.push({
      errorCode: 'STAGE4_EXIT_PRODUCTION_CUTOVER_PREMATURE',
      capabilityIds: [],
      actual: true,
      expected: false
    });
  }
  if (input.legacyAuthoritativePathExited) {
    blockers.push({
      errorCode: 'STAGE4_EXIT_LEGACY_AUTHORITY_EXIT_PREMATURE',
      capabilityIds: [],
      actual: true,
      expected: false
    });
  }
  if (input.finalClosureNotBlocked) {
    blockers.push({
      errorCode: 'STAGE4_EXIT_FINAL_CLOSURE_PREMATURE',
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
    throw new Error(`STEP37_STAGE4_EXIT_AUDIT_FIELD_REQUIRED field="${field}"`);
  }
  return trimmed;
}
