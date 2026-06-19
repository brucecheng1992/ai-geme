import { describe, expect, it } from 'vitest';

import {
  CAPABILITY_HUMAN_REVIEW_REQUIRED_CHECKLIST_KEYS,
  CAPABILITY_REVIEWER_ROLE_POLICY_VERSION,
  REGISTRY_CANARY_RENDER_ROLE,
  buildCapabilityApprovalValidityReport,
  buildCapabilityApprovalValidityReceipt,
  buildCapabilityHumanApprovalRecord,
  buildCapabilityHumanReviewChecklist,
  buildCapabilityOracleReviewReport,
  buildRegistryCanaryPlan,
  buildRegistryCanaryReport,
  buildRegistryInstallPlan,
  buildRegistryInstallPrecheck,
  buildRegistryInstallReceipt,
  buildRegistryRollbackReceipt,
  buildRegistryStagingReport,
  buildRegistrySupportPromotionReceipt,
  buildRegistryRevocationRecord,
  buildRegistryTransactionSnapshot,
  type CapabilityApprovalPolicySnapshot,
  type CapabilityApprovalValidityReceipt,
  type CapabilityApprovalReviewContext,
  type RegistryCanaryPlan,
  type RegistryCanaryRole,
  type RegistryInstalledPackageRecord,
  type RegistryInstallCurrentRefs
} from '../../packages/game-dsl/src/index.js';

describe('Step36 atomic registry install, canary and rollback contracts', () => {
  it('passes install precheck only with valid approval, latest refs, feature flag and registry admin', () => {
    const context = approvalContext();
    const approval = validApproval(context);
    const approvalReceipt = trustedReceiptFor(approval);
    const passed = buildRegistryInstallPrecheck({
      lifecycleState: 'APPROVED',
      approvalValidityReport: approval,
      approvalValidityReceiptRef: approvalReceipt.trustedArtifactRef,
      trustedApprovalValidityStore: trustedApprovalStore(approvalReceipt),
      currentRefs: currentRefsFor(context),
      packageId: context.packageId,
      packageVersion: 'v1',
      candidatePackageHash: context.candidatePackageHash,
      currentRegistrySnapshotHash: context.registrySnapshotHash,
      installFeatureFlagEnabled: true,
      actorRole: 'registry_admin',
      registryAdminAuthorizationHash: 'fnv1a_admin_auth'
    });
    const invalidApproval = buildRegistryInstallPrecheck({
      lifecycleState: 'APPROVED',
      approvalValidityReport: validApproval(context, { latestRefs: undefined }),
      approvalValidityReceiptRef: trustedReceiptFor(validApproval(context, { latestRefs: undefined })).trustedArtifactRef,
      trustedApprovalValidityStore: trustedApprovalStore(trustedReceiptFor(validApproval(context, { latestRefs: undefined }))),
      currentRefs: currentRefsFor(context),
      packageId: context.packageId,
      packageVersion: 'v1',
      candidatePackageHash: context.candidatePackageHash,
      currentRegistrySnapshotHash: context.registrySnapshotHash,
      installFeatureFlagEnabled: true,
      actorRole: 'registry_admin',
      registryAdminAuthorizationHash: 'fnv1a_admin_auth'
    });
    const nonAdmin = buildRegistryInstallPrecheck({
      lifecycleState: 'APPROVED',
      approvalValidityReport: approval,
      approvalValidityReceiptRef: approvalReceipt.trustedArtifactRef,
      trustedApprovalValidityStore: trustedApprovalStore(approvalReceipt),
      currentRefs: currentRefsFor(context),
      packageId: context.packageId,
      packageVersion: 'v1',
      candidatePackageHash: context.candidatePackageHash,
      currentRegistrySnapshotHash: context.registrySnapshotHash,
      installFeatureFlagEnabled: true,
      actorRole: 'capability_maintainer',
      registryAdminAuthorizationHash: 'fnv1a_admin_auth'
    });
    const noAdminAuth = buildRegistryInstallPrecheck({
      lifecycleState: 'APPROVED',
      approvalValidityReport: approval,
      approvalValidityReceiptRef: approvalReceipt.trustedArtifactRef,
      trustedApprovalValidityStore: trustedApprovalStore(approvalReceipt),
      currentRefs: currentRefsFor(context),
      packageId: context.packageId,
      packageVersion: 'v1',
      candidatePackageHash: context.candidatePackageHash,
      currentRegistrySnapshotHash: context.registrySnapshotHash,
      installFeatureFlagEnabled: true,
      actorRole: 'registry_admin'
    });

    expect(passed.status).toBe('passed');
    expect(passed.issues).toEqual([]);
    expect(invalidApproval.status).toBe('blocked');
    expect(invalidApproval.issues.map((issue) => issue.code)).toContain('INSTALL_APPROVAL_INVALID');
    expect(nonAdmin.issues.map((issue) => issue.code)).toContain('INSTALL_ACTOR_NOT_REGISTRY_ADMIN');
    expect(noAdminAuth.issues.map((issue) => issue.code)).toContain('INSTALL_ADMIN_AUTHORIZATION_INVALID');
  });

  it('blocks stale candidate, registry, package occupancy, ownership and dependency preconditions', () => {
    const context = approvalContext();
    const approval = validApproval(context);
    const approvalReceipt = trustedReceiptFor(approval);
    const precheck = buildRegistryInstallPrecheck({
      lifecycleState: 'APPROVED',
      approvalValidityReport: approval,
      approvalValidityReceiptRef: approvalReceipt.trustedArtifactRef,
      trustedApprovalValidityStore: trustedApprovalStore(approvalReceipt),
      currentRefs: {
        ...currentRefsFor(context),
        candidatePackageHash: 'fnv1a_stale_candidate',
        registrySnapshotHash: 'fnv1a_stale_registry'
      },
      packageId: context.packageId,
      packageVersion: 'v2',
      candidatePackageHash: 'fnv1a_stale_candidate',
      currentRegistrySnapshotHash: 'fnv1a_stale_registry',
      occupiedPackageVersions: [`${context.packageId}@v2`],
      ownershipConflicts: ['/capabilities/projectileRicochet'],
      unresolvedDependencies: ['combat.projectile.v1'],
      installFeatureFlagEnabled: false,
      actorRole: 'registry_admin',
      registryAdminAuthorizationHash: 'fnv1a_admin_auth'
    });

    expect(precheck.status).toBe('blocked');
    expect(precheck.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'INSTALL_CANDIDATE_HASH_MISMATCH',
        'INSTALL_PACKAGE_VERSION_MISMATCH',
        'INSTALL_REGISTRY_SNAPSHOT_STALE',
        'INSTALL_PACKAGE_OCCUPIED',
        'INSTALL_OWNERSHIP_CONFLICT',
        'INSTALL_DEPENDENCY_UNRESOLVED',
        'INSTALL_FEATURE_FLAG_DISABLED'
      ])
    );
  });

  it('requires a matching single-writer lock before install planning', () => {
    const context = approvalContext();
    const precheck = passedPrecheck(context);
    const before = beforeSnapshot();
    const first = buildRegistryInstallPlan({
      precheck,
      beforeSnapshot: before,
      writerLockToken: 'lock_token_a',
      activeWriterLockToken: 'lock_token_a'
    });
    const second = buildRegistryInstallPlan({
      precheck,
      beforeSnapshot: before,
      writerLockToken: 'lock_token_a',
      activeWriterLockToken: 'lock_token_b'
    });
    const missing = buildRegistryInstallPlan({
      precheck,
      beforeSnapshot: before
    });
    const empty = buildRegistryInstallPlan({
      precheck,
      beforeSnapshot: before,
      writerLockToken: '',
      activeWriterLockToken: ''
    });

    expect(first.status).toBe('prepared');
    expect(first.initialInstalledStatus).toBe('experimental_complete');
    expect(second.status).toBe('blocked');
    expect(second.issues.map((issue) => issue.code)).toContain('INSTALL_CONCURRENT_LOCK_MISMATCH');
    expect(missing.issues.map((issue) => issue.code)).toContain('INSTALL_WRITER_LOCK_MISSING');
    expect(empty.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['INSTALL_WRITER_LOCK_MISSING', 'INSTALL_ACTIVE_LOCK_PROOF_MISSING'])
    );
  });

  it('blocks staging hash mismatch and candidate-selected supported status before active pointer swap', () => {
    const context = approvalContext();
    const plan = preparedPlan(context);
    const blocked = buildRegistryStagingReport({
      plan,
      stagedPackageHash: 'fnv1a_tampered_package',
      stagedPackageIndexHash: 'fnv1a_index',
      candidateRequestedStatus: 'supported_complete',
      packageIndexValid: false
    });
    const staged = buildRegistryStagingReport({
      plan,
      stagedPackageHash: context.candidatePackageHash,
      stagedPackageIndexHash: 'fnv1a_index'
    });

    expect(blocked.status).toBe('blocked');
    expect(blocked.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['STAGING_PACKAGE_HASH_MISMATCH', 'STAGING_CANDIDATE_STATUS_FORBIDDEN', 'STAGING_INDEX_INVALID'])
    );
    expect(staged.status).toBe('staged');
    expect(staged.derivedCompleteness).toBe('experimental_complete');
  });

  it('requires fixed canary roles and identical old exact locks', () => {
    const context = approvalContext();
    const staging = stagedReport(context);
    const plan = buildRegistryCanaryPlan({ stagingReport: staging });
    const failed = buildRegistryCanaryReport({
      canaryPlan: plan,
      roleResults: plan.requiredRoles
        .filter((role) => role !== REGISTRY_CANARY_RENDER_ROLE)
        .map((role) => ({ role, passed: role !== 'unrelated_project', evidenceHash: role === 'unrelated_project' ? '' : `fnv1a_${role}` })),
      oldLockComparisons: [{ lockHash: 'fnv1a_old_lock', beforePackagesHash: 'fnv1a_before', afterPackagesHash: 'fnv1a_after', identical: false }]
    });
    const missingOldLockEvidence = buildRegistryCanaryReport({
      canaryPlan: plan,
      roleResults: passedCanaryRoles(plan),
      oldLockComparisons: []
    });
    const passed = buildRegistryCanaryReport({
      canaryPlan: plan,
      roleResults: passedCanaryRoles(plan),
      oldLockComparisons: [{ lockHash: 'fnv1a_old_lock', beforePackagesHash: 'fnv1a_same', afterPackagesHash: 'fnv1a_same', identical: true }]
    });

    expect(plan.requiredRoles).toEqual(
      expect.arrayContaining([
        'requesting_project',
        'reference_side_scrolling_run_and_gun',
        'reference_side_scrolling_platformer',
        'old_exact_lock',
        'unrelated_project',
        'step34_amendment',
        'step33_render_path'
      ])
    );
    expect(failed.status).toBe('failed');
    expect(failed.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['CANARY_REQUIRED_ROLE_MISSING', 'CANARY_EVIDENCE_MISSING', 'CANARY_ROLE_FAILED', 'CANARY_OLD_LOCK_DRIFT'])
    );
    expect(missingOldLockEvidence.issues.map((issue) => issue.code)).toContain('CANARY_OLD_LOCK_EVIDENCE_MISSING');
    expect(passed.status).toBe('passed');
  });

  it('commits only after staging, canary and post-commit verification, defaulting to experimental status', () => {
    const context = approvalContext();
    const precheck = passedPrecheck(context);
    const approvalValidityReport = validApproval(context);
    const approvalReceipt = trustedReceiptFor(approvalValidityReport);
    const currentRefs = currentRefsFor(context);
    const plan = preparedPlan(context, precheck);
    const before = beforeSnapshot();
    const staging = stagedReport(context, plan);
    const canaryPlan = buildRegistryCanaryPlan({ stagingReport: staging });
    const canary = buildRegistryCanaryReport({
      canaryPlan,
      roleResults: passedCanaryRoles(canaryPlan),
      oldLockComparisons: [{ lockHash: 'fnv1a_old_lock', beforePackagesHash: 'fnv1a_same', afterPackagesHash: 'fnv1a_same', identical: true }]
    });
    const receipt = buildRegistryInstallReceipt({
      precheck,
      approvalValidityReport,
      approvalValidityReceiptRef: approvalReceipt.trustedArtifactRef,
      trustedApprovalValidityStore: trustedApprovalStore(approvalReceipt),
      currentRefs,
      plan,
      stagingReport: staging,
      canaryPlan,
      canaryReport: canary,
      beforeSnapshot: before,
      afterSnapshot: afterSnapshot(context),
      registryAdminHash: 'fnv1a_registry_admin',
      registryAdminAuthorizationHash: 'fnv1a_admin_auth',
      postCommit: { reloadOk: true, lookupOk: true, startupDiagnosticsOk: true, oldLocksStable: true }
    });
    const tamperedChild = buildRegistryInstallReceipt({
      precheck,
      approvalValidityReport,
      approvalValidityReceiptRef: approvalReceipt.trustedArtifactRef,
      trustedApprovalValidityStore: trustedApprovalStore(approvalReceipt),
      currentRefs,
      plan,
      stagingReport: { ...staging, approvedPackageHash: 'fnv1a_other_package' },
      canaryPlan,
      canaryReport: canary,
      beforeSnapshot: before,
      afterSnapshot: afterSnapshot(context),
      registryAdminHash: 'fnv1a_registry_admin',
      registryAdminAuthorizationHash: 'fnv1a_admin_auth',
      postCommit: { reloadOk: true, lookupOk: true, startupDiagnosticsOk: true, oldLocksStable: true }
    });
    const forgedPrecheck = passedPrecheck(approvalContext({ packageId: 'combat.other_ricochet.v1' }));
    const forgedPlan = preparedPlan(context, forgedPrecheck);
    const forgedStaging = stagedReport(context, forgedPlan);
    const forgedCanaryPlan = buildRegistryCanaryPlan({ stagingReport: forgedStaging });
    const forgedCanary = buildRegistryCanaryReport({
      canaryPlan: forgedCanaryPlan,
      roleResults: passedCanaryRoles(forgedCanaryPlan),
      oldLockComparisons: [{ lockHash: 'fnv1a_old_lock', beforePackagesHash: 'fnv1a_same', afterPackagesHash: 'fnv1a_same', identical: true }]
    });
    const forgedReceipt = buildRegistryInstallReceipt({
      precheck,
      approvalValidityReport,
      approvalValidityReceiptRef: approvalReceipt.trustedArtifactRef,
      trustedApprovalValidityStore: trustedApprovalStore(approvalReceipt),
      currentRefs,
      plan: forgedPlan,
      stagingReport: forgedStaging,
      canaryPlan: forgedCanaryPlan,
      canaryReport: forgedCanary,
      beforeSnapshot: before,
      afterSnapshot: afterSnapshot(context),
      registryAdminHash: 'fnv1a_registry_admin',
      registryAdminAuthorizationHash: 'fnv1a_admin_auth',
      postCommit: { reloadOk: true, lookupOk: true, startupDiagnosticsOk: true, oldLocksStable: true }
    });
    const missingApprovalReceipt = buildRegistryInstallReceipt({
      precheck,
      approvalValidityReport,
      currentRefs,
      plan,
      stagingReport: staging,
      canaryPlan,
      canaryReport: canary,
      beforeSnapshot: before,
      afterSnapshot: afterSnapshot(context),
      registryAdminHash: 'fnv1a_registry_admin',
      registryAdminAuthorizationHash: 'fnv1a_admin_auth',
      postCommit: { reloadOk: true, lookupOk: true, startupDiagnosticsOk: true, oldLocksStable: true }
    });
    const blocked = buildRegistryInstallReceipt({
      precheck,
      approvalValidityReport,
      approvalValidityReceiptRef: approvalReceipt.trustedArtifactRef,
      trustedApprovalValidityStore: trustedApprovalStore(approvalReceipt),
      currentRefs,
      plan,
      stagingReport: staging,
      canaryPlan,
      canaryReport: canary,
      beforeSnapshot: before,
      afterSnapshot: before,
      registryAdminHash: 'fnv1a_registry_admin',
      registryAdminAuthorizationHash: 'fnv1a_admin_auth',
      postCommit: { reloadOk: false, lookupOk: false, startupDiagnosticsOk: false, oldLocksStable: false }
    });

    expect(receipt.status).toBe('committed');
    expect(receipt.installedStatus).toBe('experimental_complete');
    expect(blocked.status).toBe('blocked');
    expect(blocked.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'COMMIT_SNAPSHOT_POINTER_INVALID',
        'POST_COMMIT_RELOAD_FAILED',
        'POST_COMMIT_LOOKUP_FAILED',
        'POST_COMMIT_STARTUP_DIAGNOSTICS_FAILED',
        'POST_COMMIT_OLD_LOCK_DRIFT'
      ])
    );
    expect(tamperedChild.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['COMMIT_CHILD_HASH_MISMATCH', 'COMMIT_TRANSACTION_MISMATCH'])
    );
    expect(forgedReceipt.status).toBe('blocked');
    expect(forgedReceipt.issues.map((issue) => issue.code)).toContain('COMMIT_TRANSACTION_MISMATCH');
    expect(missingApprovalReceipt.status).toBe('blocked');
    expect(missingApprovalReceipt.issues.map((issue) => issue.code)).toContain('INSTALL_APPROVAL_RECEIPT_INVALID');
  });

  it('rolls back by restoring the previous active pointer and quarantining the candidate hash', () => {
    const context = approvalContext();
    const before = beforeSnapshot();
    const rollback = buildRegistryRollbackReceipt({
      transactionId: 'reg_install_1234',
      beforeSnapshotHash: before.snapshotHash,
      failedSnapshotHash: 'fnv1a_failed_snapshot',
      restoredActivePointerHash: before.snapshotHash,
      candidatePackageHash: context.candidatePackageHash,
      linkedGameCandidateIdsInvalidated: ['game_candidate_1'],
      reasonCodes: ['canary_failure']
    });
    const failedRollback = buildRegistryRollbackReceipt({
      beforeSnapshotHash: before.snapshotHash,
      failedSnapshotHash: 'fnv1a_failed_snapshot',
      restoredActivePointerHash: 'fnv1a_wrong_pointer',
      candidatePackageHash: context.candidatePackageHash,
      reasonCodes: ['reload_failure']
    });

    expect(rollback.status).toBe('rolled_back');
    expect(rollback.quarantinedCandidateHash).toBe(context.candidatePackageHash);
    expect(rollback.linkedGameCandidateIdsInvalidated).toEqual(['game_candidate_1']);
    expect(failedRollback.status).toBe('failed');
    expect(failedRollback.issues.map((issue) => issue.code)).toContain('ROLLBACK_RESTORE_FAILED');
  });

  it('keeps support promotion and revocation as separate evidence-derived records', () => {
    const context = approvalContext();
    const installReceipt = committedReceipt(context);
    const blockedPromotion = buildRegistrySupportPromotionReceipt({
      installReceipt,
      referenceAcceptancePassed: false,
      noBlockingFindings: true,
      supportedUsageRefs: [],
      canaryRegressionComplete: true
    });
    const promoted = buildRegistrySupportPromotionReceipt({
      installReceipt,
      referenceAcceptancePassed: true,
      noBlockingFindings: true,
      supportedUsageRefs: ['side_scrolling_run_and_gun.v1'],
      canaryRegressionComplete: true,
      promotionApprovalHash: 'fnv1a_support_promotion'
    });
    const revoked = buildRegistryRevocationRecord({
      status: 'revoked',
      packageId: context.packageId,
      packageVersion: 'v1',
      packageHash: context.candidatePackageHash,
      securityAdvisoryHash: 'fnv1a_advisory',
      existingLockPolicy: 'block_new_resolution_only',
      historyRetained: true
    });
    const badRevocation = buildRegistryRevocationRecord({
      status: 'disabled',
      packageId: context.packageId,
      packageVersion: 'v1',
      packageHash: context.candidatePackageHash,
      securityAdvisoryHash: 'fnv1a_advisory',
      existingLockPolicy: 'manual_migration_required',
      historyRetained: false
    });

    expect(blockedPromotion.status).toBe('blocked');
    expect(blockedPromotion.promotedStatus).toBeUndefined();
    expect(promoted.status).toBe('promoted');
    expect(promoted.promotedStatus).toBe('supported_complete');
    expect(revoked.issues).toEqual([]);
    expect(badRevocation.issues.map((issue) => issue.code)).toContain('REVOCATION_HISTORY_DELETE_FORBIDDEN');
  });
});

function approvalContext(overrides: Partial<CapabilityApprovalReviewContext> = {}): CapabilityApprovalReviewContext {
  return {
    requestId: 'capsyn_req_install_12345678',
    attemptId: 'capsyn_attempt_install_12345678_00000001',
    packageId: 'combat.projectile_ricochet.v1',
    packageVersion: 'v1',
    candidatePackageHash: 'fnv1a_candidate_package',
    verificationBundleHash: 'fnv1a_verification_bundle',
    verificationReportReceiptHashes: ['fnv1a_receipt_build', 'fnv1a_receipt_runtime'],
    policyDecisionReceiptHash: 'fnv1a_policy_receipt',
    policyVersion: 'step36.capability-synthesis-policy.v1',
    requiredApprovals: ['capability_maintainer', 'runtime_code_owner'],
    registrySnapshotHash: 'fnv1a_registry_before',
    reviewerRolePolicyVersion: CAPABILITY_REVIEWER_ROLE_POLICY_VERSION,
    ...overrides
  };
}

function validApproval(
  context: CapabilityApprovalReviewContext,
  options: { latestRefs?: RegistryInstallCurrentRefs | undefined } = { latestRefs: currentRefsFor(context) }
) {
  const oracle = buildCapabilityOracleReviewReport({
    context,
    verificationBundleStatus: 'PASSED',
    findings: []
  });
  const checklist = buildCapabilityHumanReviewChecklist({
    context,
    checks: Object.fromEntries(CAPABILITY_HUMAN_REVIEW_REQUIRED_CHECKLIST_KEYS.map((key) => [key, true]))
  });
  const maintainer = buildCapabilityHumanApprovalRecord({
    context,
    reviewer: { reviewerId: 'alice', assignedRoles: ['capability_maintainer'] },
    requestedRole: 'capability_maintainer',
    oracleReview: oracle,
    checklist
  });
  const runtimeOwner = buildCapabilityHumanApprovalRecord({
    context,
    reviewer: { reviewerId: 'bob', assignedRoles: ['runtime_code_owner'] },
    requestedRole: 'runtime_code_owner',
    oracleReview: oracle,
    checklist
  });
  return buildCapabilityApprovalValidityReport({
    context,
    policy: policySnapshot(),
    oracleReview: oracle,
    approvals: [maintainer, runtimeOwner],
    latestRefs: options.latestRefs
  });
}

function policySnapshot(overrides: Partial<CapabilityApprovalPolicySnapshot> = {}): CapabilityApprovalPolicySnapshot {
  return {
    policyVersion: 'step36.capability-synthesis-policy.v1',
    policyDecisionReceiptHash: 'fnv1a_policy_receipt',
    riskTier: 'R2_BOUNDED_RUNTIME_MODULE',
    allowed: true,
    requiredApprovals: ['capability_maintainer', 'runtime_code_owner'],
    ...overrides
  };
}

function currentRefsFor(context: CapabilityApprovalReviewContext): RegistryInstallCurrentRefs {
  return {
    candidatePackageHash: context.candidatePackageHash,
    packageVersion: context.packageVersion ?? 'v1',
    verificationBundleHash: context.verificationBundleHash,
    verificationReportReceiptHashes: context.verificationReportReceiptHashes,
    policyDecisionReceiptHash: context.policyDecisionReceiptHash,
    policyVersion: context.policyVersion,
    requiredApprovals: context.requiredApprovals,
    reviewerRolePolicyVersion: context.reviewerRolePolicyVersion ?? CAPABILITY_REVIEWER_ROLE_POLICY_VERSION,
    registrySnapshotHash: context.registrySnapshotHash,
    ...(context.repairBinding === undefined ? {} : { repairLineageHash: context.repairBinding.lineageHash })
  };
}

function passedPrecheck(context: CapabilityApprovalReviewContext) {
  const approvalValidityReport = validApproval(context);
  const approvalReceipt = trustedReceiptFor(approvalValidityReport);
  return buildRegistryInstallPrecheck({
    lifecycleState: 'APPROVED',
    approvalValidityReport,
    approvalValidityReceiptRef: approvalReceipt.trustedArtifactRef,
    trustedApprovalValidityStore: trustedApprovalStore(approvalReceipt),
    currentRefs: currentRefsFor(context),
    packageId: context.packageId,
    packageVersion: 'v1',
    candidatePackageHash: context.candidatePackageHash,
    currentRegistrySnapshotHash: context.registrySnapshotHash,
    installFeatureFlagEnabled: true,
    actorRole: 'registry_admin',
    registryAdminAuthorizationHash: 'fnv1a_admin_auth'
  });
}

function preparedPlan(context: CapabilityApprovalReviewContext, precheck = passedPrecheck(context)) {
  return buildRegistryInstallPlan({
    precheck,
    beforeSnapshot: beforeSnapshot(),
    writerLockToken: 'lock_token_a',
    activeWriterLockToken: 'lock_token_a'
  });
}

function stagedReport(context: CapabilityApprovalReviewContext, plan = preparedPlan(context)) {
  return buildRegistryStagingReport({
    plan,
    stagedPackageHash: context.candidatePackageHash,
    stagedPackageIndexHash: 'fnv1a_staged_index'
  });
}

function committedReceipt(context: CapabilityApprovalReviewContext) {
  const precheck = passedPrecheck(context);
  const approvalValidityReport = validApproval(context);
  const approvalReceipt = trustedReceiptFor(approvalValidityReport);
  const currentRefs = currentRefsFor(context);
  const plan = preparedPlan(context, precheck);
  const staging = stagedReport(context, plan);
  const canaryPlan = buildRegistryCanaryPlan({ stagingReport: staging });
  const canary = buildRegistryCanaryReport({
    canaryPlan,
    roleResults: passedCanaryRoles(canaryPlan),
    oldLockComparisons: [{ lockHash: 'fnv1a_old_lock', beforePackagesHash: 'fnv1a_same', afterPackagesHash: 'fnv1a_same', identical: true }]
  });
  return buildRegistryInstallReceipt({
    precheck,
    approvalValidityReport,
    approvalValidityReceiptRef: approvalReceipt.trustedArtifactRef,
    trustedApprovalValidityStore: trustedApprovalStore(approvalReceipt),
    currentRefs,
    plan,
    stagingReport: staging,
    canaryPlan,
    canaryReport: canary,
    beforeSnapshot: beforeSnapshot(),
    afterSnapshot: afterSnapshot(context),
    registryAdminHash: 'fnv1a_registry_admin',
    registryAdminAuthorizationHash: 'fnv1a_admin_auth',
    postCommit: { reloadOk: true, lookupOk: true, startupDiagnosticsOk: true, oldLocksStable: true }
  });
}

function trustedReceiptFor(report: ReturnType<typeof validApproval>): CapabilityApprovalValidityReceipt {
  return buildCapabilityApprovalValidityReceipt({ report });
}

function trustedApprovalStore(receipt: CapabilityApprovalValidityReceipt) {
  return {
    namespace: receipt.trustedArtifactRef.namespace,
    resolveReceipt(ref: CapabilityApprovalValidityReceipt['trustedArtifactRef']) {
      return ref.artifactId === receipt.trustedArtifactRef.artifactId ? receipt : undefined;
    }
  };
}

function beforeSnapshot() {
  return buildRegistryTransactionSnapshot({
    activePointerId: 'registry_snapshot_before',
    registrySnapshotHash: 'fnv1a_registry_before',
    packageIndexHash: 'fnv1a_package_index_before',
    packages: [existingPackage()],
    sampledOldLocks: [oldLock()]
  });
}

function afterSnapshot(context: CapabilityApprovalReviewContext) {
  return buildRegistryTransactionSnapshot({
    activePointerId: 'registry_snapshot_after',
    registrySnapshotHash: 'fnv1a_registry_after',
    packageIndexHash: 'fnv1a_package_index_after',
    packages: [
      existingPackage(),
      {
        packageId: context.packageId,
        packageVersion: 'v1',
        packageHash: context.candidatePackageHash,
        installedStatus: 'experimental_complete'
      }
    ],
    sampledOldLocks: [oldLock()]
  });
}

function existingPackage(): RegistryInstalledPackageRecord {
  return {
    packageId: 'combat.projectile.v1',
    packageVersion: 'v1',
    packageHash: 'fnv1a_projectile',
    installedStatus: 'supported_complete'
  };
}

function oldLock() {
  return {
    profileId: 'side_scrolling_run_and_gun.v1',
    runtimeFamily: 'phaser_2d_action_arcade.v1',
    packages: [{ capabilityId: 'combat.projectile.v1', packageVersion: 'v1', packageHash: 'fnv1a_projectile' }],
    lockHash: 'fnv1a_old_lock'
  };
}

function passedCanaryRoles(plan: RegistryCanaryPlan): Array<{ role: RegistryCanaryRole; passed: boolean; evidenceHash: string }> {
  return plan.requiredRoles.map((role) => ({
    role,
    passed: true,
    evidenceHash: `fnv1a_${role}`
  }));
}
