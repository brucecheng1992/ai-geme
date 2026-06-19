import { hashStableJson } from '../gameplay-capabilities/stable-json.js';
import type { GameplayCapabilityLock } from '../gameplay-capabilities/capability-lock.js';
import {
  validateCapabilityApprovalValidityReceipt,
  type CapabilityApprovalValidityReceipt,
  type CapabilityApprovalValidityReceiptResolver,
  type CapabilityApprovalValidityReport
} from './candidate-approval.js';

export const CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION = 'step36.capability-registry-install.v1';
export const REGISTRY_INSTALL_PRECHECK_KIND = 'registry_install_precheck';
export const REGISTRY_TRANSACTION_SNAPSHOT_KIND = 'registry_transaction_snapshot';
export const REGISTRY_INSTALL_PLAN_KIND = 'registry_install_plan';
export const REGISTRY_STAGING_REPORT_KIND = 'registry_staging_report';
export const REGISTRY_CANARY_PLAN_KIND = 'registry_canary_plan';
export const REGISTRY_CANARY_REPORT_KIND = 'registry_canary_report';
export const REGISTRY_INSTALL_RECEIPT_KIND = 'registry_install_receipt';
export const REGISTRY_ROLLBACK_RECEIPT_KIND = 'registry_rollback_receipt';
export const REGISTRY_SUPPORT_PROMOTION_RECEIPT_KIND = 'registry_support_promotion_receipt';
export const REGISTRY_REVOCATION_RECORD_KIND = 'registry_revocation_record';

export const REGISTRY_CANARY_BASE_ROLES = [
  'requesting_project',
  'reference_side_scrolling_run_and_gun',
  'reference_side_scrolling_platformer',
  'old_exact_lock',
  'unrelated_project',
  'step34_amendment'
] as const;

export const REGISTRY_CANARY_RENDER_ROLE = 'step33_render_path';

export type RegistryInstalledPackageStatus = 'experimental_complete' | 'supported_complete' | 'disabled' | 'revoked';
export type RegistryInstallTransactionStatus = 'passed' | 'blocked' | 'prepared' | 'staged' | 'failed' | 'committed' | 'rolled_back' | 'promoted';
export type RegistryCanaryRole = (typeof REGISTRY_CANARY_BASE_ROLES)[number] | typeof REGISTRY_CANARY_RENDER_ROLE;

export type RegistryInstallIssue = {
  code:
    | 'INSTALL_LIFECYCLE_STATE_INVALID'
    | 'INSTALL_APPROVAL_INVALID'
    | 'INSTALL_APPROVAL_HASH_MISMATCH'
    | 'INSTALL_APPROVAL_RECEIPT_INVALID'
    | 'INSTALL_LATEST_REF_MISMATCH'
    | 'INSTALL_PACKAGE_ID_MISMATCH'
    | 'INSTALL_PACKAGE_VERSION_MISMATCH'
    | 'INSTALL_CANDIDATE_HASH_MISMATCH'
    | 'INSTALL_REGISTRY_SNAPSHOT_STALE'
    | 'INSTALL_PACKAGE_OCCUPIED'
    | 'INSTALL_OWNERSHIP_CONFLICT'
    | 'INSTALL_DEPENDENCY_UNRESOLVED'
    | 'INSTALL_FEATURE_FLAG_DISABLED'
    | 'INSTALL_ACTOR_NOT_REGISTRY_ADMIN'
    | 'INSTALL_ADMIN_AUTHORIZATION_INVALID'
    | 'INSTALL_WRITER_LOCK_MISSING'
    | 'INSTALL_ACTIVE_LOCK_PROOF_MISSING'
    | 'INSTALL_CONCURRENT_LOCK_MISMATCH'
    | 'INSTALL_PRECONDITION_FAILED'
    | 'STAGING_PACKAGE_HASH_MISMATCH'
    | 'STAGING_INDEX_INVALID'
    | 'STAGING_CANDIDATE_STATUS_FORBIDDEN'
    | 'CANARY_REQUIRED_ROLE_MISSING'
    | 'CANARY_EVIDENCE_MISSING'
    | 'CANARY_ROLE_FAILED'
    | 'CANARY_OLD_LOCK_EVIDENCE_MISSING'
    | 'CANARY_OLD_LOCK_DRIFT'
    | 'COMMIT_PRECONDITION_FAILED'
    | 'COMMIT_CHILD_HASH_MISMATCH'
    | 'COMMIT_TRANSACTION_MISMATCH'
    | 'COMMIT_SNAPSHOT_POINTER_INVALID'
    | 'POST_COMMIT_RELOAD_FAILED'
    | 'POST_COMMIT_LOOKUP_FAILED'
    | 'POST_COMMIT_STARTUP_DIAGNOSTICS_FAILED'
    | 'POST_COMMIT_OLD_LOCK_DRIFT'
    | 'ROLLBACK_RESTORE_FAILED'
    | 'PROMOTION_REQUIREMENT_MISSING'
    | 'REVOCATION_HISTORY_DELETE_FORBIDDEN';
  message: string;
  path?: string;
};

export type RegistryInstallCurrentRefs = {
  candidatePackageHash: string;
  packageVersion: string;
  verificationBundleHash: string;
  verificationReportReceiptHashes: string[];
  policyDecisionReceiptHash: string;
  policyVersion: string;
  requiredApprovals: string[];
  reviewerRolePolicyVersion: string;
  registrySnapshotHash: string;
  repairLineageHash?: string;
};

export type RegistryInstalledPackageRecord = {
  packageId: string;
  packageVersion: string;
  packageHash: string;
  installedStatus: RegistryInstalledPackageStatus;
};

export type RegistryTransactionSnapshot = {
  artifactKind: typeof REGISTRY_TRANSACTION_SNAPSHOT_KIND;
  schemaVersion: typeof CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION;
  activePointerId: string;
  registrySnapshotHash: string;
  packageIndexHash: string;
  packages: RegistryInstalledPackageRecord[];
  sampledOldLocks: Array<Pick<GameplayCapabilityLock, 'profileId' | 'runtimeFamily' | 'packages' | 'lockHash'>>;
  snapshotHash: string;
};

export type RegistryInstallPrecheck = {
  artifactKind: typeof REGISTRY_INSTALL_PRECHECK_KIND;
  schemaVersion: typeof CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION;
  status: 'passed' | 'blocked';
  lifecycleState: string;
  packageId: string;
  packageVersion: string;
  candidatePackageHash: string;
  approvalValidityHash: string;
  approvalValidityReceiptHash?: string;
  registryAdminAuthorizationHash?: string;
  currentRegistrySnapshotHash: string;
  issues: RegistryInstallIssue[];
  precheckHash: string;
};

export type RegistryInstallPlan = {
  artifactKind: typeof REGISTRY_INSTALL_PLAN_KIND;
  schemaVersion: typeof CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION;
  status: 'prepared' | 'blocked';
  transactionId?: string;
  packageId: string;
  packageVersion: string;
  packageHash: string;
  initialInstalledStatus: Extract<RegistryInstalledPackageStatus, 'experimental_complete'>;
  beforeSnapshotHash: string;
  precheckHash: string;
  approvalValidityHash: string;
  approvalValidityReceiptHash?: string;
  registryAdminAuthorizationHash?: string;
  writerLockToken?: string;
  rollbackTargetSnapshotHash: string;
  issues: RegistryInstallIssue[];
  planHash: string;
};

export type RegistryStagingReport = {
  artifactKind: typeof REGISTRY_STAGING_REPORT_KIND;
  schemaVersion: typeof CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION;
  status: 'staged' | 'blocked';
  transactionId?: string;
  packageId: string;
  packageVersion: string;
  approvedPackageHash: string;
  stagedPackageHash: string;
  stagedPackageIndexHash: string;
  derivedCompleteness: Extract<RegistryInstalledPackageStatus, 'experimental_complete'>;
  issues: RegistryInstallIssue[];
  stagingHash: string;
};

export type RegistryCanaryPlan = {
  artifactKind: typeof REGISTRY_CANARY_PLAN_KIND;
  schemaVersion: typeof CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION;
  transactionId?: string;
  packageId: string;
  requiredRoles: RegistryCanaryRole[];
  canaryPlanHash: string;
};

export type RegistryCanaryReport = {
  artifactKind: typeof REGISTRY_CANARY_REPORT_KIND;
  schemaVersion: typeof CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION;
  status: 'passed' | 'failed';
  transactionId?: string;
  packageId: string;
  canaryPlanHash: string;
  roleResults: Array<{ role: RegistryCanaryRole; passed: boolean; evidenceHash: string }>;
  oldLockComparisons: Array<{ lockHash: string; beforePackagesHash: string; afterPackagesHash: string; identical: boolean }>;
  issues: RegistryInstallIssue[];
  canaryReportHash: string;
};

export type RegistryInstallReceipt = {
  artifactKind: typeof REGISTRY_INSTALL_RECEIPT_KIND;
  schemaVersion: typeof CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION;
  status: 'committed' | 'blocked';
  transactionId?: string;
  packageId: string;
  packageVersion: string;
  installedStatus: Extract<RegistryInstalledPackageStatus, 'experimental_complete'>;
  beforeSnapshotHash: string;
  afterSnapshotHash: string;
  precheckHash: string;
  approvalValidityHash: string;
  approvalValidityReceiptHash: string;
  registryAdminAuthorizationHash: string;
  packageHash: string;
  canaryPlanHash: string;
  canaryReportHash: string;
  registryAdminHash: string;
  issues: RegistryInstallIssue[];
  receiptHash: string;
};

export type RegistryRollbackReceipt = {
  artifactKind: typeof REGISTRY_ROLLBACK_RECEIPT_KIND;
  schemaVersion: typeof CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION;
  status: 'rolled_back' | 'failed';
  transactionId?: string;
  beforeSnapshotHash: string;
  failedSnapshotHash: string;
  restoredActivePointerHash: string;
  candidatePackageHash: string;
  quarantinedCandidateHash: string;
  linkedGameCandidateIdsInvalidated: string[];
  reasonCodes: string[];
  issues: RegistryInstallIssue[];
  rollbackHash: string;
};

export type RegistrySupportPromotionReceipt = {
  artifactKind: typeof REGISTRY_SUPPORT_PROMOTION_RECEIPT_KIND;
  schemaVersion: typeof CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION;
  status: 'promoted' | 'blocked';
  packageId: string;
  packageVersion: string;
  installReceiptHash: string;
  promotedStatus?: Extract<RegistryInstalledPackageStatus, 'supported_complete'>;
  issues: RegistryInstallIssue[];
  promotionHash: string;
};

export type RegistryRevocationRecord = {
  artifactKind: typeof REGISTRY_REVOCATION_RECORD_KIND;
  schemaVersion: typeof CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION;
  status: Extract<RegistryInstalledPackageStatus, 'disabled' | 'revoked'>;
  packageId: string;
  packageVersion: string;
  packageHash: string;
  securityAdvisoryHash: string;
  replacementPlanHash?: string;
  existingLockPolicy: 'preserve_existing_locks' | 'block_new_resolution_only' | 'manual_migration_required';
  historyRetained: boolean;
  issues: RegistryInstallIssue[];
  revocationHash: string;
};

export function buildRegistryTransactionSnapshot(input: {
  activePointerId: string;
  registrySnapshotHash: string;
  packageIndexHash: string;
  packages: readonly RegistryInstalledPackageRecord[];
  sampledOldLocks?: readonly Pick<GameplayCapabilityLock, 'profileId' | 'runtimeFamily' | 'packages' | 'lockHash'>[];
}): RegistryTransactionSnapshot {
  const payload: Omit<RegistryTransactionSnapshot, 'snapshotHash'> = {
    artifactKind: REGISTRY_TRANSACTION_SNAPSHOT_KIND,
    schemaVersion: CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION,
    activePointerId: input.activePointerId,
    registrySnapshotHash: input.registrySnapshotHash,
    packageIndexHash: input.packageIndexHash,
    packages: [...input.packages].sort(comparePackages),
    sampledOldLocks: [...(input.sampledOldLocks ?? [])].map(normalizeOldLock).sort(compareOldLocks)
  };
  return { ...payload, snapshotHash: hashStableJson(payload) };
}

export function buildRegistryInstallPrecheck(input: {
  lifecycleState: string;
  approvalValidityReport: CapabilityApprovalValidityReport;
  approvalValidityReceiptRef?: CapabilityApprovalValidityReceipt['trustedArtifactRef'];
  trustedApprovalValidityStore?: CapabilityApprovalValidityReceiptResolver;
  currentRefs: RegistryInstallCurrentRefs;
  packageId: string;
  packageVersion: string;
  candidatePackageHash: string;
  currentRegistrySnapshotHash: string;
  occupiedPackageVersions?: readonly string[];
  ownershipConflicts?: readonly string[];
  unresolvedDependencies?: readonly string[];
  installFeatureFlagEnabled: boolean;
  actorRole: string;
  registryAdminAuthorizationHash?: string;
}): RegistryInstallPrecheck {
  const issues = [
    ...(input.lifecycleState === 'APPROVED' ? [] : [issue('INSTALL_LIFECYCLE_STATE_INVALID', 'Install requires APPROVED lifecycle state.')]),
    ...approvalValidityReceiptIssues(input.approvalValidityReport, input.approvalValidityReceiptRef, input.trustedApprovalValidityStore),
    ...approvalValidityIssues(input.approvalValidityReport, input.currentRefs, input.candidatePackageHash, input.currentRegistrySnapshotHash),
    ...(input.approvalValidityReport.context.packageId === input.packageId
      ? []
      : [issue('INSTALL_PACKAGE_ID_MISMATCH', 'Install package id does not match approved capability package id.')]),
    ...(input.approvalValidityReport.context.packageVersion === input.packageVersion && input.currentRefs.packageVersion === input.packageVersion
      ? []
      : [issue('INSTALL_PACKAGE_VERSION_MISMATCH', 'Install package version does not match approved candidate package version.')]),
    ...(input.occupiedPackageVersions?.includes(`${input.packageId}@${input.packageVersion}`)
      ? [issue('INSTALL_PACKAGE_OCCUPIED', `Package ${input.packageId}@${input.packageVersion} is already occupied.`)]
      : []),
    ...(input.ownershipConflicts ?? []).map((conflict) => issue('INSTALL_OWNERSHIP_CONFLICT', `Ownership conflict ${conflict}.`, conflict)),
    ...(input.unresolvedDependencies ?? []).map((dependency) => issue('INSTALL_DEPENDENCY_UNRESOLVED', `Unresolved dependency ${dependency}.`, dependency)),
    ...(input.installFeatureFlagEnabled ? [] : [issue('INSTALL_FEATURE_FLAG_DISABLED', 'Capability registry install feature flag is disabled.')]),
    ...(input.actorRole === 'registry_admin' ? [] : [issue('INSTALL_ACTOR_NOT_REGISTRY_ADMIN', 'Only registry_admin can initiate install transaction.')]),
    ...(input.registryAdminAuthorizationHash === undefined || input.registryAdminAuthorizationHash.trim().length === 0
      ? [issue('INSTALL_ADMIN_AUTHORIZATION_INVALID', 'Registry admin authority must be backed by a server-side authorization hash.')]
      : [])
  ].sort(compareIssues);
  const payload: Omit<RegistryInstallPrecheck, 'precheckHash'> = {
    artifactKind: REGISTRY_INSTALL_PRECHECK_KIND,
    schemaVersion: CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION,
    status: issues.length === 0 ? 'passed' : 'blocked',
    lifecycleState: input.lifecycleState,
    packageId: input.packageId,
    packageVersion: input.packageVersion,
    candidatePackageHash: input.candidatePackageHash,
    approvalValidityHash: input.approvalValidityReport.validityHash,
    ...(approvalValidityReceiptHash(input.approvalValidityReceiptRef, input.trustedApprovalValidityStore) === undefined
      ? {}
      : { approvalValidityReceiptHash: approvalValidityReceiptHash(input.approvalValidityReceiptRef, input.trustedApprovalValidityStore) ?? '' }),
    ...(input.registryAdminAuthorizationHash === undefined ? {} : { registryAdminAuthorizationHash: input.registryAdminAuthorizationHash }),
    currentRegistrySnapshotHash: input.currentRegistrySnapshotHash,
    issues
  };
  return { ...payload, precheckHash: hashStableJson(payload) };
}

export function buildRegistryInstallPlan(input: {
  precheck: RegistryInstallPrecheck;
  beforeSnapshot: RegistryTransactionSnapshot;
  writerLockToken?: string;
  activeWriterLockToken?: string;
}): RegistryInstallPlan {
  const lockIssues = [
    ...(input.writerLockToken === undefined || input.writerLockToken.trim().length === 0
      ? [issue('INSTALL_WRITER_LOCK_MISSING', 'Install requires a non-empty writer lock token before staging.')]
      : []),
    ...(input.activeWriterLockToken === undefined || input.activeWriterLockToken.trim().length === 0
      ? [issue('INSTALL_ACTIVE_LOCK_PROOF_MISSING', 'Install requires non-empty active writer lock proof before staging.')]
      : []),
    ...(input.activeWriterLockToken !== undefined && input.writerLockToken !== input.activeWriterLockToken
      ? [issue('INSTALL_CONCURRENT_LOCK_MISMATCH', 'Install writer lock token does not match active registry writer lock.')]
      : [])
  ];
  const issues = [
    ...(input.precheck.status === 'passed' && input.precheck.precheckHash === recomputePrecheckHash(input.precheck)
      ? []
      : [issue('INSTALL_PRECONDITION_FAILED', 'Install precheck must pass before planning.')]),
    ...lockIssues
  ].sort(compareIssues);
  const transactionId = issues.length === 0
    ? `reg_install_${hashStableJson({ precheckHash: input.precheck.precheckHash, writerLockToken: input.writerLockToken }).slice('fnv1a_'.length)}`
    : undefined;
  const payload: Omit<RegistryInstallPlan, 'planHash'> = {
    artifactKind: REGISTRY_INSTALL_PLAN_KIND,
    schemaVersion: CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION,
    status: issues.length === 0 ? 'prepared' : 'blocked',
    ...(transactionId === undefined ? {} : { transactionId }),
    packageId: input.precheck.packageId,
    packageVersion: input.precheck.packageVersion,
    packageHash: input.precheck.candidatePackageHash,
    initialInstalledStatus: 'experimental_complete',
    beforeSnapshotHash: input.beforeSnapshot.snapshotHash,
    precheckHash: input.precheck.precheckHash,
    approvalValidityHash: input.precheck.approvalValidityHash,
    ...(input.precheck.approvalValidityReceiptHash === undefined ? {} : { approvalValidityReceiptHash: input.precheck.approvalValidityReceiptHash }),
    ...(input.precheck.registryAdminAuthorizationHash === undefined ? {} : { registryAdminAuthorizationHash: input.precheck.registryAdminAuthorizationHash }),
    ...(input.writerLockToken === undefined ? {} : { writerLockToken: input.writerLockToken }),
    rollbackTargetSnapshotHash: input.beforeSnapshot.snapshotHash,
    issues
  };
  return { ...payload, planHash: hashStableJson(payload) };
}

export function buildRegistryStagingReport(input: {
  plan: RegistryInstallPlan;
  stagedPackageHash: string;
  stagedPackageIndexHash: string;
  candidateRequestedStatus?: string;
  packageIndexValid?: boolean;
}): RegistryStagingReport {
  const issues = [
    ...(input.plan.status === 'prepared' && input.plan.planHash === recomputePlanHash(input.plan)
      ? []
      : [issue('INSTALL_PRECONDITION_FAILED', 'Staging requires a prepared install plan.')]),
    ...(input.stagedPackageHash === input.plan.packageHash
      ? []
      : [issue('STAGING_PACKAGE_HASH_MISMATCH', 'Staged package hash does not match approved package hash.')]),
    ...(input.packageIndexValid ?? true ? [] : [issue('STAGING_INDEX_INVALID', 'Staged registry index is invalid.')]),
    ...(input.candidateRequestedStatus === undefined || input.candidateRequestedStatus === 'experimental_complete'
      ? []
      : [issue('STAGING_CANDIDATE_STATUS_FORBIDDEN', 'Candidate cannot choose supported or active install status.')])
  ].sort(compareIssues);
  const payload: Omit<RegistryStagingReport, 'stagingHash'> = {
    artifactKind: REGISTRY_STAGING_REPORT_KIND,
    schemaVersion: CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION,
    status: issues.length === 0 ? 'staged' : 'blocked',
    ...(input.plan.transactionId === undefined ? {} : { transactionId: input.plan.transactionId }),
    packageId: input.plan.packageId,
    packageVersion: input.plan.packageVersion,
    approvedPackageHash: input.plan.packageHash,
    stagedPackageHash: input.stagedPackageHash,
    stagedPackageIndexHash: input.stagedPackageIndexHash,
    derivedCompleteness: 'experimental_complete',
    issues
  };
  return { ...payload, stagingHash: hashStableJson(payload) };
}

export function buildRegistryCanaryPlan(input: {
  stagingReport: RegistryStagingReport;
  renderRequired?: boolean;
}): RegistryCanaryPlan {
  const requiredRoles: RegistryCanaryRole[] = [
    ...REGISTRY_CANARY_BASE_ROLES,
    ...(input.renderRequired === false ? [] : [REGISTRY_CANARY_RENDER_ROLE] as RegistryCanaryRole[])
  ];
  const payload: Omit<RegistryCanaryPlan, 'canaryPlanHash'> = {
    artifactKind: REGISTRY_CANARY_PLAN_KIND,
    schemaVersion: CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION,
    ...(input.stagingReport.transactionId === undefined ? {} : { transactionId: input.stagingReport.transactionId }),
    packageId: input.stagingReport.packageId,
    requiredRoles
  };
  return { ...payload, canaryPlanHash: hashStableJson(payload) };
}

export function buildRegistryCanaryReport(input: {
  canaryPlan: RegistryCanaryPlan;
  roleResults: ReadonlyArray<{ role: RegistryCanaryRole; passed: boolean; evidenceHash: string }>;
  oldLockComparisons?: ReadonlyArray<{ lockHash: string; beforePackagesHash: string; afterPackagesHash: string; identical: boolean }>;
}): RegistryCanaryReport {
  const roleMap = new Map(input.roleResults.map((result) => [result.role, result]));
  const issues = [
    ...input.canaryPlan.requiredRoles
      .filter((role) => !roleMap.has(role))
      .map((role) => issue('CANARY_REQUIRED_ROLE_MISSING', `Missing canary role ${role}.`, role)),
    ...input.roleResults
      .filter((result) => result.evidenceHash.trim().length === 0)
      .map((result) => issue('CANARY_EVIDENCE_MISSING', `Canary role ${result.role} is missing evidence hash.`, result.role)),
    ...input.roleResults
      .filter((result) => !result.passed)
      .map((result) => issue('CANARY_ROLE_FAILED', `Canary role ${result.role} failed.`, result.role)),
    ...((input.oldLockComparisons ?? []).length > 0
      ? []
      : [issue('CANARY_OLD_LOCK_EVIDENCE_MISSING', 'Canary requires old exact lock comparison evidence.')]),
    ...(input.oldLockComparisons ?? [])
      .filter((comparison) => !comparison.identical || comparison.beforePackagesHash !== comparison.afterPackagesHash)
      .map((comparison) => issue('CANARY_OLD_LOCK_DRIFT', `Old lock ${comparison.lockHash} changed under canary.`, comparison.lockHash))
  ].sort(compareIssues);
  const payload: Omit<RegistryCanaryReport, 'canaryReportHash'> = {
    artifactKind: REGISTRY_CANARY_REPORT_KIND,
    schemaVersion: CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION,
    ...(input.canaryPlan.transactionId === undefined ? {} : { transactionId: input.canaryPlan.transactionId }),
    packageId: input.canaryPlan.packageId,
    canaryPlanHash: input.canaryPlan.canaryPlanHash,
    roleResults: [...input.roleResults].sort(compareCanaryResults),
    oldLockComparisons: [...(input.oldLockComparisons ?? [])].sort(compareOldLockComparisons),
    issues,
    status: issues.length === 0 ? 'passed' : 'failed'
  };
  return { ...payload, canaryReportHash: hashStableJson(payload) };
}

export function buildRegistryInstallReceipt(input: {
  precheck: RegistryInstallPrecheck;
  approvalValidityReport: CapabilityApprovalValidityReport;
  approvalValidityReceiptRef?: CapabilityApprovalValidityReceipt['trustedArtifactRef'];
  trustedApprovalValidityStore?: CapabilityApprovalValidityReceiptResolver;
  currentRefs: RegistryInstallCurrentRefs;
  plan: RegistryInstallPlan;
  stagingReport: RegistryStagingReport;
  canaryPlan: RegistryCanaryPlan;
  canaryReport: RegistryCanaryReport;
  beforeSnapshot: RegistryTransactionSnapshot;
  afterSnapshot: RegistryTransactionSnapshot;
  registryAdminHash: string;
  registryAdminAuthorizationHash: string;
  postCommit: {
    reloadOk: boolean;
    lookupOk: boolean;
    startupDiagnosticsOk: boolean;
    oldLocksStable: boolean;
  };
}): RegistryInstallReceipt {
  const issues = [
    ...(input.plan.status === 'prepared' ? [] : [issue('COMMIT_PRECONDITION_FAILED', 'Commit requires prepared install plan.')]),
    ...(input.precheck.status === 'passed' ? [] : [issue('COMMIT_PRECONDITION_FAILED', 'Commit requires passed install precheck.')]),
    ...approvalValidityReceiptIssues(input.approvalValidityReport, input.approvalValidityReceiptRef, input.trustedApprovalValidityStore),
    ...approvalValidityIssues(input.approvalValidityReport, input.currentRefs, input.plan.packageHash, input.precheck.currentRegistrySnapshotHash),
    ...(input.stagingReport.status === 'staged' ? [] : [issue('COMMIT_PRECONDITION_FAILED', 'Commit requires successful staging report.')]),
    ...(input.canaryReport.status === 'passed' ? [] : [issue('COMMIT_PRECONDITION_FAILED', 'Commit requires passed canary report.')]),
    ...commitChildHashIssues(input.precheck, input.plan, input.stagingReport, input.canaryPlan, input.canaryReport, input.beforeSnapshot, input.afterSnapshot),
    ...commitLineageIssues(input.precheck, input.plan, input.stagingReport, input.canaryPlan, input.canaryReport, input.afterSnapshot),
    ...(input.registryAdminAuthorizationHash.trim().length > 0 && input.registryAdminAuthorizationHash === input.precheck.registryAdminAuthorizationHash
      ? []
      : [issue('INSTALL_ADMIN_AUTHORIZATION_INVALID', 'Install receipt requires the same server-side registry admin authorization hash as precheck.')]),
    ...(input.beforeSnapshot.snapshotHash !== input.afterSnapshot.snapshotHash && input.plan.beforeSnapshotHash === input.beforeSnapshot.snapshotHash
      ? []
      : [issue('COMMIT_SNAPSHOT_POINTER_INVALID', 'Commit requires distinct before/after snapshots and matching rollback target.')]),
    ...(input.postCommit.reloadOk ? [] : [issue('POST_COMMIT_RELOAD_FAILED', 'Post-commit registry reload failed.')]),
    ...(input.postCommit.lookupOk ? [] : [issue('POST_COMMIT_LOOKUP_FAILED', 'Post-commit package lookup failed.')]),
    ...(input.postCommit.startupDiagnosticsOk ? [] : [issue('POST_COMMIT_STARTUP_DIAGNOSTICS_FAILED', 'Post-commit startup diagnostics failed.')]),
    ...(input.postCommit.oldLocksStable ? [] : [issue('POST_COMMIT_OLD_LOCK_DRIFT', 'Old exact locks drifted after commit.')])
  ].sort(compareIssues);
  const payload: Omit<RegistryInstallReceipt, 'receiptHash'> = {
    artifactKind: REGISTRY_INSTALL_RECEIPT_KIND,
    schemaVersion: CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION,
    status: issues.length === 0 ? 'committed' : 'blocked',
    ...(input.plan.transactionId === undefined ? {} : { transactionId: input.plan.transactionId }),
    packageId: input.plan.packageId,
    packageVersion: input.plan.packageVersion,
    installedStatus: 'experimental_complete',
    beforeSnapshotHash: input.beforeSnapshot.snapshotHash,
    afterSnapshotHash: input.afterSnapshot.snapshotHash,
    precheckHash: input.precheck.precheckHash,
    approvalValidityHash: input.plan.approvalValidityHash,
    approvalValidityReceiptHash: input.precheck.approvalValidityReceiptHash ?? '',
    registryAdminAuthorizationHash: input.registryAdminAuthorizationHash,
    packageHash: input.plan.packageHash,
    canaryPlanHash: input.canaryPlan.canaryPlanHash,
    canaryReportHash: input.canaryReport.canaryReportHash,
    registryAdminHash: input.registryAdminHash,
    issues
  };
  return { ...payload, receiptHash: hashStableJson(payload) };
}

export function buildRegistryRollbackReceipt(input: {
  transactionId?: string;
  beforeSnapshotHash: string;
  failedSnapshotHash: string;
  restoredActivePointerHash: string;
  candidatePackageHash: string;
  linkedGameCandidateIdsInvalidated?: readonly string[];
  reasonCodes: readonly string[];
}): RegistryRollbackReceipt {
  const issues = input.restoredActivePointerHash === input.beforeSnapshotHash
    ? []
    : [issue('ROLLBACK_RESTORE_FAILED', 'Rollback did not restore the previous active snapshot pointer.')];
  const payload: Omit<RegistryRollbackReceipt, 'rollbackHash'> = {
    artifactKind: REGISTRY_ROLLBACK_RECEIPT_KIND,
    schemaVersion: CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION,
    status: issues.length === 0 ? 'rolled_back' : 'failed',
    ...(input.transactionId === undefined ? {} : { transactionId: input.transactionId }),
    beforeSnapshotHash: input.beforeSnapshotHash,
    failedSnapshotHash: input.failedSnapshotHash,
    restoredActivePointerHash: input.restoredActivePointerHash,
    candidatePackageHash: input.candidatePackageHash,
    quarantinedCandidateHash: input.candidatePackageHash,
    linkedGameCandidateIdsInvalidated: uniqueStrings(input.linkedGameCandidateIdsInvalidated ?? []),
    reasonCodes: uniqueStrings(input.reasonCodes),
    issues
  };
  return { ...payload, rollbackHash: hashStableJson(payload) };
}

export function buildRegistrySupportPromotionReceipt(input: {
  installReceipt: RegistryInstallReceipt;
  referenceAcceptancePassed: boolean;
  noBlockingFindings: boolean;
  supportedUsageRefs: readonly string[];
  canaryRegressionComplete: boolean;
  promotionApprovalHash?: string;
}): RegistrySupportPromotionReceipt {
  const issues = [
    ...(input.installReceipt.status === 'committed' ? [] : [issue('PROMOTION_REQUIREMENT_MISSING', 'Promotion requires committed install receipt.')]),
    ...(input.referenceAcceptancePassed ? [] : [issue('PROMOTION_REQUIREMENT_MISSING', 'Promotion requires reference acceptance.')]),
    ...(input.noBlockingFindings ? [] : [issue('PROMOTION_REQUIREMENT_MISSING', 'Promotion requires no P0/P1 findings.')]),
    ...(input.supportedUsageRefs.length > 0 ? [] : [issue('PROMOTION_REQUIREMENT_MISSING', 'Promotion requires supported profile or optional capability usage.')]),
    ...(input.canaryRegressionComplete ? [] : [issue('PROMOTION_REQUIREMENT_MISSING', 'Promotion requires canary and regression completion.')]),
    ...(input.promotionApprovalHash === undefined ? [issue('PROMOTION_REQUIREMENT_MISSING', 'Promotion requires separate support promotion approval.')] : [])
  ].sort(compareIssues);
  const payload: Omit<RegistrySupportPromotionReceipt, 'promotionHash'> = {
    artifactKind: REGISTRY_SUPPORT_PROMOTION_RECEIPT_KIND,
    schemaVersion: CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION,
    status: issues.length === 0 ? 'promoted' : 'blocked',
    packageId: input.installReceipt.packageId,
    packageVersion: input.installReceipt.packageVersion,
    installReceiptHash: input.installReceipt.receiptHash,
    ...(issues.length === 0 ? { promotedStatus: 'supported_complete' } : {}),
    issues
  };
  return { ...payload, promotionHash: hashStableJson(payload) };
}

export function buildRegistryRevocationRecord(input: {
  status: Extract<RegistryInstalledPackageStatus, 'disabled' | 'revoked'>;
  packageId: string;
  packageVersion: string;
  packageHash: string;
  securityAdvisoryHash: string;
  replacementPlanHash?: string;
  existingLockPolicy: RegistryRevocationRecord['existingLockPolicy'];
  historyRetained: boolean;
}): RegistryRevocationRecord {
  const issues = input.historyRetained ? [] : [issue('REVOCATION_HISTORY_DELETE_FORBIDDEN', 'Revocation must retain artifact history.')];
  const payload: Omit<RegistryRevocationRecord, 'revocationHash'> = {
    artifactKind: REGISTRY_REVOCATION_RECORD_KIND,
    schemaVersion: CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION,
    status: input.status,
    packageId: input.packageId,
    packageVersion: input.packageVersion,
    packageHash: input.packageHash,
    securityAdvisoryHash: input.securityAdvisoryHash,
    ...(input.replacementPlanHash === undefined ? {} : { replacementPlanHash: input.replacementPlanHash }),
    existingLockPolicy: input.existingLockPolicy,
    historyRetained: input.historyRetained,
    issues
  };
  return { ...payload, revocationHash: hashStableJson(payload) };
}

function approvalValidityIssues(
  report: CapabilityApprovalValidityReport,
  currentRefs: RegistryInstallCurrentRefs,
  candidatePackageHash: string,
  currentRegistrySnapshotHash: string
): RegistryInstallIssue[] {
  const context = report.context;
  const issues = [
    ...(report.status === 'valid' ? [] : [issue('INSTALL_APPROVAL_INVALID', 'Install requires a valid approval validity report.')]),
    ...(report.validityHash === recomputeApprovalValidityHash(report)
      ? []
      : [issue('INSTALL_APPROVAL_HASH_MISMATCH', 'Approval validity hash does not match payload.')]),
    ...(context.candidatePackageHash === candidatePackageHash && currentRefs.candidatePackageHash === candidatePackageHash
      ? []
      : [issue('INSTALL_CANDIDATE_HASH_MISMATCH', 'Install candidate hash does not match approval tuple.')]),
    ...(context.registrySnapshotHash === currentRegistrySnapshotHash && currentRefs.registrySnapshotHash === currentRegistrySnapshotHash
      ? []
      : [issue('INSTALL_REGISTRY_SNAPSHOT_STALE', 'Install registry snapshot is stale.')]),
    ...latestRefIssues(report, currentRefs)
  ];
  return issues;
}

function approvalValidityReceiptIssues(
  report: CapabilityApprovalValidityReport,
  receiptRef: CapabilityApprovalValidityReceipt['trustedArtifactRef'] | undefined,
  trustedStore: CapabilityApprovalValidityReceiptResolver | undefined
): RegistryInstallIssue[] {
  return validateCapabilityApprovalValidityReceipt({
    report,
    receiptRef,
    trustedApprovalValidityStore: trustedStore
  })
    ? []
    : [issue('INSTALL_APPROVAL_RECEIPT_INVALID', 'Install requires a trusted approval validity receipt from the server-owned store.')];
}

function approvalValidityReceiptHash(
  receiptRef: CapabilityApprovalValidityReceipt['trustedArtifactRef'] | undefined,
  trustedStore: CapabilityApprovalValidityReceiptResolver | undefined
): string | undefined {
  return receiptRef === undefined || trustedStore === undefined ? undefined : trustedStore.resolveReceipt(receiptRef)?.receiptHash;
}

function latestRefIssues(report: CapabilityApprovalValidityReport, currentRefs: RegistryInstallCurrentRefs): RegistryInstallIssue[] {
  const context = report.context;
  return [
    ...(context.packageVersion === currentRefs.packageVersion
      ? []
      : [issue('INSTALL_LATEST_REF_MISMATCH', 'Package version does not match latest ref.', 'packageVersion')]),
    ...(context.verificationBundleHash === currentRefs.verificationBundleHash
      ? []
      : [issue('INSTALL_LATEST_REF_MISMATCH', 'Verification bundle hash does not match latest ref.', 'verificationBundleHash')]),
    ...(sameStringSet(context.verificationReportReceiptHashes, currentRefs.verificationReportReceiptHashes)
      ? []
      : [issue('INSTALL_LATEST_REF_MISMATCH', 'Trusted verification receipt hashes do not match latest refs.', 'verificationReportReceiptHashes')]),
    ...(context.policyDecisionReceiptHash === currentRefs.policyDecisionReceiptHash
      ? []
      : [issue('INSTALL_LATEST_REF_MISMATCH', 'Policy decision receipt hash does not match latest ref.', 'policyDecisionReceiptHash')]),
    ...(context.policyVersion === currentRefs.policyVersion
      ? []
      : [issue('INSTALL_LATEST_REF_MISMATCH', 'Policy version does not match latest ref.', 'policyVersion')]),
    ...(sameStringSet(context.requiredApprovals, currentRefs.requiredApprovals)
      ? []
      : [issue('INSTALL_LATEST_REF_MISMATCH', 'Required approvals do not match latest refs.', 'requiredApprovals')]),
    ...(context.reviewerRolePolicyVersion === currentRefs.reviewerRolePolicyVersion
      ? []
      : [issue('INSTALL_LATEST_REF_MISMATCH', 'Reviewer role policy version does not match latest ref.', 'reviewerRolePolicyVersion')]),
    ...(context.repairBinding?.lineageHash === currentRefs.repairLineageHash || (context.repairBinding === undefined && currentRefs.repairLineageHash === undefined)
      ? []
      : [issue('INSTALL_LATEST_REF_MISMATCH', 'Repair lineage hash does not match latest ref.', 'repairLineageHash')])
  ];
}

function commitChildHashIssues(
  precheck: RegistryInstallPrecheck,
  plan: RegistryInstallPlan,
  stagingReport: RegistryStagingReport,
  canaryPlan: RegistryCanaryPlan,
  canaryReport: RegistryCanaryReport,
  beforeSnapshot: RegistryTransactionSnapshot,
  afterSnapshot: RegistryTransactionSnapshot
): RegistryInstallIssue[] {
  return [
    ...(precheck.precheckHash === recomputePrecheckHash(precheck)
      ? []
      : [issue('COMMIT_CHILD_HASH_MISMATCH', 'Install precheck hash does not match payload.', 'precheckHash')]),
    ...(plan.planHash === recomputePlanHash(plan)
      ? []
      : [issue('COMMIT_CHILD_HASH_MISMATCH', 'Install plan hash does not match payload.', 'planHash')]),
    ...(stagingReport.stagingHash === recomputeStagingHash(stagingReport)
      ? []
      : [issue('COMMIT_CHILD_HASH_MISMATCH', 'Staging report hash does not match payload.', 'stagingHash')]),
    ...(canaryPlan.canaryPlanHash === recomputeCanaryPlanHash(canaryPlan)
      ? []
      : [issue('COMMIT_CHILD_HASH_MISMATCH', 'Canary plan hash does not match payload.', 'canaryPlanHash')]),
    ...(canaryReport.canaryReportHash === recomputeCanaryReportHash(canaryReport)
      ? []
      : [issue('COMMIT_CHILD_HASH_MISMATCH', 'Canary report hash does not match payload.', 'canaryReportHash')]),
    ...(beforeSnapshot.snapshotHash === recomputeTransactionSnapshotHash(beforeSnapshot)
      ? []
      : [issue('COMMIT_CHILD_HASH_MISMATCH', 'Before snapshot hash does not match payload.', 'beforeSnapshotHash')]),
    ...(afterSnapshot.snapshotHash === recomputeTransactionSnapshotHash(afterSnapshot)
      ? []
      : [issue('COMMIT_CHILD_HASH_MISMATCH', 'After snapshot hash does not match payload.', 'afterSnapshotHash')])
  ];
}

function commitLineageIssues(
  precheck: RegistryInstallPrecheck,
  plan: RegistryInstallPlan,
  stagingReport: RegistryStagingReport,
  canaryPlan: RegistryCanaryPlan,
  canaryReport: RegistryCanaryReport,
  afterSnapshot: RegistryTransactionSnapshot
): RegistryInstallIssue[] {
  const installedPackage = afterSnapshot.packages.find(
    (item) =>
      item.packageId === plan.packageId &&
      item.packageVersion === plan.packageVersion &&
      item.packageHash === plan.packageHash
  );
  return [
    ...(plan.precheckHash === precheck.precheckHash && plan.approvalValidityHash === precheck.approvalValidityHash
      ? []
      : [issue('COMMIT_TRANSACTION_MISMATCH', 'Install plan does not bind the provided precheck and approval validity hash.', 'precheckHash')]),
    ...(plan.approvalValidityReceiptHash === precheck.approvalValidityReceiptHash && precheck.approvalValidityReceiptHash !== undefined
      ? []
      : [issue('COMMIT_TRANSACTION_MISMATCH', 'Install plan does not bind the trusted approval validity receipt hash.', 'approvalValidityReceiptHash')]),
    ...(plan.registryAdminAuthorizationHash === precheck.registryAdminAuthorizationHash
      ? []
      : [issue('COMMIT_TRANSACTION_MISMATCH', 'Install plan does not bind the registry admin authorization hash.', 'registryAdminAuthorizationHash')]),
    ...(plan.transactionId !== undefined &&
    stagingReport.transactionId === plan.transactionId &&
    canaryPlan.transactionId === plan.transactionId &&
    canaryReport.transactionId === plan.transactionId
      ? []
      : [issue('COMMIT_TRANSACTION_MISMATCH', 'Install child artifacts do not share the same transaction id.', 'transactionId')]),
    ...(stagingReport.packageId === plan.packageId && canaryReport.packageId === plan.packageId
      ? []
      : [issue('COMMIT_TRANSACTION_MISMATCH', 'Install child artifacts do not bind the same package id.', 'packageId')]),
    ...(canaryReport.canaryPlanHash === canaryPlan.canaryPlanHash
      ? []
      : [issue('COMMIT_TRANSACTION_MISMATCH', 'Canary report does not bind the provided canary plan.', 'canaryPlanHash')]),
    ...(stagingReport.packageVersion === plan.packageVersion && stagingReport.approvedPackageHash === plan.packageHash
      ? []
      : [issue('COMMIT_TRANSACTION_MISMATCH', 'Staging report does not bind the approved package version/hash.', 'packageHash')]),
    ...(installedPackage?.installedStatus === 'experimental_complete'
      ? []
      : [issue('COMMIT_TRANSACTION_MISMATCH', 'After snapshot must contain the installed package in experimental status.', 'installedStatus')])
  ];
}

function normalizeOldLock(lock: Pick<GameplayCapabilityLock, 'profileId' | 'runtimeFamily' | 'packages' | 'lockHash'>) {
  return {
    profileId: lock.profileId,
    runtimeFamily: lock.runtimeFamily,
    packages: [...lock.packages].sort((left, right) => `${left.capabilityId}:${left.packageVersion}`.localeCompare(`${right.capabilityId}:${right.packageVersion}`)),
    lockHash: lock.lockHash
  };
}

function recomputeApprovalValidityHash(report: CapabilityApprovalValidityReport): string {
  const { validityHash: _validityHash, ...payload } = report;
  return hashStableJson(payload);
}

function recomputePrecheckHash(precheck: RegistryInstallPrecheck): string {
  const { precheckHash: _precheckHash, ...payload } = precheck;
  return hashStableJson(payload);
}

function recomputePlanHash(plan: RegistryInstallPlan): string {
  const { planHash: _planHash, ...payload } = plan;
  return hashStableJson(payload);
}

function recomputeCanaryPlanHash(canaryPlan: RegistryCanaryPlan): string {
  const { canaryPlanHash: _canaryPlanHash, ...payload } = canaryPlan;
  return hashStableJson(payload);
}

function recomputeStagingHash(stagingReport: RegistryStagingReport): string {
  const { stagingHash: _stagingHash, ...payload } = stagingReport;
  return hashStableJson(payload);
}

function recomputeCanaryReportHash(canaryReport: RegistryCanaryReport): string {
  const { canaryReportHash: _canaryReportHash, ...payload } = canaryReport;
  return hashStableJson(payload);
}

function recomputeTransactionSnapshotHash(snapshot: RegistryTransactionSnapshot): string {
  const { snapshotHash: _snapshotHash, ...payload } = snapshot;
  return hashStableJson(payload);
}

function issue(code: RegistryInstallIssue['code'], message: string, path?: string): RegistryInstallIssue {
  return {
    code,
    message,
    ...(path === undefined ? {} : { path })
  };
}

function compareIssues(left: RegistryInstallIssue, right: RegistryInstallIssue): number {
  return `${left.code}:${left.path ?? ''}`.localeCompare(`${right.code}:${right.path ?? ''}`);
}

function comparePackages(left: RegistryInstalledPackageRecord, right: RegistryInstalledPackageRecord): number {
  return `${left.packageId}:${left.packageVersion}`.localeCompare(`${right.packageId}:${right.packageVersion}`);
}

function compareOldLocks(left: Pick<GameplayCapabilityLock, 'lockHash'>, right: Pick<GameplayCapabilityLock, 'lockHash'>): number {
  return left.lockHash.localeCompare(right.lockHash);
}

function compareCanaryResults(
  left: { role: RegistryCanaryRole },
  right: { role: RegistryCanaryRole }
): number {
  return left.role.localeCompare(right.role);
}

function compareOldLockComparisons(
  left: { lockHash: string },
  right: { lockHash: string }
): number {
  return left.lockHash.localeCompare(right.lockHash);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort();
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  return hashStableJson(uniqueStrings(left)) === hashStableJson(uniqueStrings(right));
}
