import { describe, expect, it } from 'vitest';

import {
  CAPABILITY_HUMAN_REVIEW_REQUIRED_CHECKLIST_KEYS,
  CAPABILITY_REVIEWER_ROLE_POLICY_VERSION,
  buildCapabilityApprovalValidityReport,
  buildCapabilityHumanApprovalRecord,
  buildCapabilityHumanRejectionRecord,
  buildCapabilityHumanReviewChecklist,
  buildCapabilityOracleReviewPrompt,
  buildCapabilityOracleReviewReport,
  type CapabilityApprovalPolicySnapshot,
  type CapabilityApprovalRepairBinding,
  type CapabilityApprovalReviewContext,
  type CapabilityHumanReviewChecklist,
  type CapabilityOracleReviewReport,
  type CapabilityReviewerIdentity,
  type CapabilityReviewerRole
} from '../../packages/game-dsl/src/index.js';

describe('Step36 Oracle review and human approval contracts', () => {
  it('builds a bounded Oracle prompt and deterministic approved review report', () => {
    const context = approvalContext();
    const prompt = buildCapabilityOracleReviewPrompt({
      context,
      evidenceRefs: [
        'capability_verification_bundle:fnv1a_verification_bundle',
        'provider_secret:sk-test',
        'raw_hidden_harness_source:fnv1a_hidden'
      ]
    });
    const first = approvedOracleReview(context);
    const second = approvedOracleReview({ ...context, verificationReportReceiptHashes: [...context.verificationReportReceiptHashes].reverse() });

    expect(prompt.evidenceRefs).toEqual(['capability_verification_bundle:fnv1a_verification_bundle']);
    expect(prompt.issues.map((issue) => issue.code)).toEqual(['ORACLE_REVIEW_PROMPT_SENSITIVE_REF', 'ORACLE_REVIEW_PROMPT_SENSITIVE_REF']);
    expect(first.decision).toBe('approved_for_human_review');
    expect(first.reportHash).toBe(second.reportHash);
  });

  it('blocks approval for P0, unresolved P1 and P2/P3 without disposition', () => {
    const context = approvalContext();
    const p0 = buildCapabilityOracleReviewReport({
      context,
      verificationBundleStatus: 'PASSED',
      findings: [{ severity: 'P0', code: 'self_certification', message: 'Candidate writes its own evidence.' }]
    });
    const p1 = buildCapabilityOracleReviewReport({
      context,
      verificationBundleStatus: 'PASSED',
      findings: [{ severity: 'P1', code: 'insufficient_qa', message: 'QA does not prove ricochet behavior.' }]
    });
    const p2 = buildCapabilityOracleReviewReport({
      context,
      verificationBundleStatus: 'PASSED',
      findings: [{ severity: 'P2', code: 'docs_gap', message: 'Reviewer notes need clearer evidence.' }]
    });
    const missingVerification = buildCapabilityOracleReviewReport({
      context,
      findings: []
    });

    expect(p0.decision).toBe('reject');
    expect(p1.decision).toBe('changes_requested');
    expect(p2.decision).toBe('changes_requested');
    expect(p2.issues.map((issue) => issue.code)).toContain('ORACLE_REVIEW_FINDING_DISPOSITION_MISSING');
    expect(missingVerification.decision).toBe('reject');
    expect(missingVerification.issues.map((issue) => issue.code)).toContain('ORACLE_REVIEW_VERIFICATION_BUNDLE_NOT_PASSED');
  });

  it('validates an R2 approval only when maintainer and runtime owner are distinct and hash-bound', () => {
    const context = approvalContext();
    const oracle = approvedOracleReview(context);
    const checklist = completeChecklist(context);
    const maintainer = approvalFor(context, oracle, checklist, 'capability_maintainer', reviewer('alice', ['capability_maintainer']));
    const runtimeOwner = approvalFor(context, oracle, checklist, 'runtime_code_owner', reviewer('bob', ['runtime_code_owner']));
    const report = buildCapabilityApprovalValidityReport({
      context,
      policy: policySnapshot(),
      oracleReview: oracle,
      approvals: [runtimeOwner, maintainer],
      latestRefs: latestRefsFor(context)
    });

    expect(report.status).toBe('valid');
    expect(report.requiredRoles).toEqual(['capability_maintainer', 'runtime_code_owner']);
    expect(report.issues).toEqual([]);
  });

  it('enforces R1, R2, elevated security and distinct-reviewer role requirements', () => {
    const r1Context = approvalContext({ requiredApprovals: ['capability_maintainer'] });
    const r1Oracle = approvedOracleReview(r1Context);
    const r1Checklist = completeChecklist(r1Context);
    const r1Missing = buildCapabilityApprovalValidityReport({
      context: r1Context,
      policy: policySnapshot({
        riskTier: 'R1_DECLARATIVE_EXTENSION',
        requiredApprovals: ['capability_maintainer']
      }),
      oracleReview: r1Oracle,
      approvals: [],
      latestRefs: latestRefsFor(r1Context)
    });
    const r2Context = approvalContext();
    const r2Oracle = approvedOracleReview(r2Context);
    const r2Checklist = completeChecklist(r2Context);
    const sameReviewer = reviewer('alice', ['capability_maintainer', 'runtime_code_owner']);
    const sameReviewerReport = buildCapabilityApprovalValidityReport({
      context: r2Context,
      policy: policySnapshot(),
      oracleReview: r2Oracle,
      approvals: [
        approvalFor(r2Context, r2Oracle, r2Checklist, 'capability_maintainer', sameReviewer),
        approvalFor(r2Context, r2Oracle, r2Checklist, 'runtime_code_owner', sameReviewer)
      ],
      latestRefs: latestRefsFor(r2Context)
    });
    const elevatedContext = approvalContext({ requiredApprovals: ['capability_maintainer', 'runtime_code_owner', 'security_reviewer'] });
    const elevated = buildCapabilityApprovalValidityReport({
      context: elevatedContext,
      policy: policySnapshot({
        requiredApprovals: ['capability_maintainer', 'runtime_code_owner'],
        elevatedSecurityReview: true
      }),
      oracleReview: approvedOracleReview(elevatedContext),
      approvals: [],
      latestRefs: latestRefsFor(elevatedContext)
    });
    const weakenedContext = approvalContext({ requiredApprovals: ['capability_maintainer'] });
    const weakenedOracle = approvedOracleReview(weakenedContext);
    const weakenedChecklist = completeChecklist(weakenedContext);
    const weakenedR2 = buildCapabilityApprovalValidityReport({
      context: weakenedContext,
      policy: policySnapshot({ requiredApprovals: ['capability_maintainer'] }),
      oracleReview: weakenedOracle,
      approvals: [approvalFor(weakenedContext, weakenedOracle, weakenedChecklist, 'capability_maintainer', reviewer('alice', ['capability_maintainer']))],
      latestRefs: latestRefsFor(weakenedContext)
    });

    expect(r1Missing.status).toBe('invalid');
    expect(r1Missing.issues.map((issue) => issue.code)).toContain('APPROVAL_REQUIRED_ROLE_MISSING');
    expect(sameReviewerReport.issues.map((issue) => issue.code)).toContain('APPROVAL_DISTINCT_REVIEWER_REQUIRED');
    expect(elevated.requiredRoles).toEqual(['capability_maintainer', 'runtime_code_owner', 'security_reviewer']);
    expect(elevated.issues.map((issue) => issue.role)).toEqual(expect.arrayContaining(['security_reviewer']));
    expect(weakenedR2.requiredRoles).toEqual(['capability_maintainer', 'runtime_code_owner']);
    expect(weakenedR2.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['APPROVAL_REQUIRED_APPROVALS_STALE', 'APPROVAL_REQUIRED_ROLE_MISSING'])
    );
    expect(r1Checklist.status).toBe('complete');
  });

  it('rejects client-supplied reviewer roles and derives approval roles from backend identity', () => {
    const context = approvalContext({ requiredApprovals: ['capability_maintainer'] });
    const oracle = approvedOracleReview(context);
    const checklist = completeChecklist(context);
    const badApproval = buildCapabilityHumanApprovalRecord({
      context,
      oracleReview: oracle,
      checklist,
      reviewer: reviewer('alice', ['capability_maintainer']),
      requestedRole: 'capability_maintainer',
      clientSuppliedReviewerRole: 'runtime_code_owner'
    });
    const goodApproval = buildCapabilityHumanApprovalRecord({
      context,
      oracleReview: oracle,
      checklist,
      reviewer: reviewer('alice', ['capability_maintainer']),
      requestedRole: 'capability_maintainer'
    });
    const rejectedOracle = buildCapabilityOracleReviewReport({
      context,
      verificationBundleStatus: 'PASSED',
      findings: [{ severity: 'P0', code: 'self_certification', message: 'Candidate self-certified evidence.' }]
    });
    const approvalForRejectedOracle = buildCapabilityHumanApprovalRecord({
      context,
      oracleReview: rejectedOracle,
      checklist,
      reviewer: reviewer('alice', ['capability_maintainer']),
      requestedRole: 'capability_maintainer'
    });

    expect(badApproval.status).toBe('invalid');
    expect(badApproval.issues.map((issue) => issue.code)).toContain('HUMAN_APPROVAL_CLIENT_ROLE_SUPPLIED');
    expect(goodApproval.status).toBe('valid');
    expect(goodApproval.derivedReviewerRole).toBe('capability_maintainer');
    expect(approvalForRejectedOracle.status).toBe('invalid');
    expect(approvalForRejectedOracle.issues.map((issue) => issue.code)).toContain('ORACLE_REVIEW_NOT_APPROVED');
  });

  it('fails closed when approval validity is missing latest refs', () => {
    const context = approvalContext();
    const oracle = approvedOracleReview(context);
    const checklist = completeChecklist(context);
    const report = buildCapabilityApprovalValidityReport({
      context,
      policy: policySnapshot(),
      oracleReview: oracle,
      approvals: [
        approvalFor(context, oracle, checklist, 'capability_maintainer', reviewer('alice', ['capability_maintainer'])),
        approvalFor(context, oracle, checklist, 'runtime_code_owner', reviewer('bob', ['runtime_code_owner']))
      ]
    });

    expect(report.status).toBe('invalid');
    expect(report.issues.map((issue) => issue.code)).toContain('APPROVAL_LATEST_REF_MISSING');
  });

  it('expires approval validity on candidate, verification, receipt, policy, role policy and registry drift', () => {
    const context = approvalContext();
    const oracle = approvedOracleReview(context);
    const checklist = completeChecklist(context);
    const report = buildCapabilityApprovalValidityReport({
      context,
      policy: policySnapshot(),
      oracleReview: oracle,
      approvals: [
        approvalFor(context, oracle, checklist, 'capability_maintainer', reviewer('alice', ['capability_maintainer'])),
        approvalFor(context, oracle, checklist, 'runtime_code_owner', reviewer('bob', ['runtime_code_owner']))
      ],
      latestRefs: {
        candidatePackageHash: 'fnv1a_new_candidate_package',
        packageVersion: 'v2',
        verificationBundleHash: 'fnv1a_new_verification_bundle',
        verificationReportReceiptHashes: ['fnv1a_new_receipt'],
        policyDecisionReceiptHash: 'fnv1a_new_policy_receipt',
        policyVersion: 'step36.capability-synthesis-policy.v2',
        requiredApprovals: ['capability_maintainer', 'runtime_code_owner', 'security_reviewer'],
        reviewerRolePolicyVersion: 'step36.reviewer-role-policy.v2',
        registrySnapshotHash: 'fnv1a_new_registry'
      }
    });

    expect(report.status).toBe('invalid');
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'APPROVAL_CANDIDATE_HASH_STALE',
        'APPROVAL_PACKAGE_VERSION_STALE',
        'APPROVAL_VERIFICATION_BUNDLE_STALE',
        'APPROVAL_VERIFICATION_RECEIPTS_STALE',
        'APPROVAL_POLICY_RECEIPT_STALE',
        'APPROVAL_POLICY_VERSION_STALE',
        'APPROVAL_REQUIRED_APPROVALS_STALE',
        'APPROVAL_REVIEWER_ROLE_POLICY_STALE',
        'APPROVAL_REGISTRY_SNAPSHOT_STALE'
      ])
    );
  });

  it('requires latest repair lineage and blocks invalidated Oracle or human approvals after repair', () => {
    const repairBinding = repairedBinding();
    const oldContext = approvalContext();
    const newContext = approvalContext({ repairBinding });
    const oldOracle = approvedOracleReview(oldContext);
    const oldChecklist = completeChecklist(oldContext);
    const oldApproval = approvalFor(oldContext, oldOracle, oldChecklist, 'capability_maintainer', reviewer('alice', ['capability_maintainer']));
    const report = buildCapabilityApprovalValidityReport({
      context: oldContext,
      policy: policySnapshot(),
      oracleReview: oldOracle,
      approvals: [
        oldApproval,
        approvalFor(oldContext, oldOracle, oldChecklist, 'runtime_code_owner', reviewer('bob', ['runtime_code_owner']))
      ],
      latestRefs: {
        repairBinding
      },
      invalidatedHashes: {
        previousOracleReviewHash: oldOracle.reportHash,
        previousHumanApprovalHash: oldApproval.approvalHash
      }
    });
    const repairedOracle = approvedOracleReview(newContext);
    const repairedChecklist = completeChecklist(newContext);
    const repairedReport = buildCapabilityApprovalValidityReport({
      context: newContext,
      policy: policySnapshot(),
      oracleReview: repairedOracle,
      approvals: [
        approvalFor(newContext, repairedOracle, repairedChecklist, 'capability_maintainer', reviewer('alice', ['capability_maintainer'])),
        approvalFor(newContext, repairedOracle, repairedChecklist, 'runtime_code_owner', reviewer('bob', ['runtime_code_owner']))
      ],
      latestRefs: latestRefsFor(newContext)
    });

    expect(report.status).toBe('invalid');
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['APPROVAL_REPAIR_BINDING_MISSING', 'APPROVAL_INVALIDATED_ARTIFACT_REUSED'])
    );
    expect(repairedReport.status).toBe('valid');
  });

  it('keeps R4, human rejection and Step34/install state out of approval readiness', () => {
    const context = approvalContext({ requiredApprovals: ['capability_maintainer'] });
    const oracle = approvedOracleReview(context);
    const checklist = completeChecklist(context);
    const rejection = buildCapabilityHumanRejectionRecord({
      context,
      reviewer: reviewer('alice', ['capability_maintainer']),
      reasonCodes: ['not_minimal_primitive'],
      notesHash: 'fnv1a_notes',
      requiredSpecChanges: ['split reusable primitive'],
      newRequestRequired: true,
      candidateRemainsViewable: true
    });
    const r4 = buildCapabilityApprovalValidityReport({
      context,
      policy: policySnapshot({
        riskTier: 'R4_PROHIBITED',
        allowed: false,
        requiredApprovals: []
      }),
      oracleReview: oracle,
      approvals: [approvalFor(context, oracle, checklist, 'capability_maintainer', reviewer('alice', ['capability_maintainer']))],
      latestRefs: latestRefsFor(context)
    });

    expect(rejection.candidateRemainsViewable).toBe(true);
    expect(rejection.newRequestRequired).toBe(true);
    expect(r4.status).toBe('invalid');
    expect(r4.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['APPROVAL_POLICY_NOT_INSTALLABLE', 'APPROVAL_TIER_NOT_INSTALLABLE'])
    );
  });
});

function approvalContext(overrides: Partial<CapabilityApprovalReviewContext> = {}): CapabilityApprovalReviewContext {
  return {
    requestId: 'capsyn_req_approval_12345678',
    attemptId: 'capsyn_attempt_approval_12345678_00000001',
    packageId: 'combat.projectile_ricochet.v1',
    packageVersion: 'v1',
    candidatePackageHash: 'fnv1a_candidate_package',
    verificationBundleHash: 'fnv1a_verification_bundle',
    verificationReportReceiptHashes: ['fnv1a_receipt_build', 'fnv1a_receipt_runtime'],
    policyDecisionReceiptHash: 'fnv1a_policy_receipt',
    policyVersion: 'step36.capability-synthesis-policy.v1',
    requiredApprovals: ['capability_maintainer', 'runtime_code_owner'],
    registrySnapshotHash: 'fnv1a_registry',
    reviewerRolePolicyVersion: CAPABILITY_REVIEWER_ROLE_POLICY_VERSION,
    ...overrides
  };
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

function latestRefsFor(context: CapabilityApprovalReviewContext) {
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
    ...(context.repairBinding === undefined ? {} : { repairBinding: context.repairBinding })
  };
}

function approvedOracleReview(context: CapabilityApprovalReviewContext): CapabilityOracleReviewReport {
  return buildCapabilityOracleReviewReport({
    context,
    verificationBundleStatus: 'PASSED',
    findings: [
      {
        severity: 'P2',
        code: 'documentation_margin',
        message: 'Reviewer wants clearer docs but accepts risk for this candidate.',
        disposition: 'accepted_risk'
      }
    ]
  });
}

function completeChecklist(context: CapabilityApprovalReviewContext): CapabilityHumanReviewChecklist {
  return buildCapabilityHumanReviewChecklist({
    context,
    checks: Object.fromEntries(CAPABILITY_HUMAN_REVIEW_REQUIRED_CHECKLIST_KEYS.map((key) => [key, true]))
  });
}

function approvalFor(
  context: CapabilityApprovalReviewContext,
  oracleReview: CapabilityOracleReviewReport,
  checklist: CapabilityHumanReviewChecklist,
  requestedRole: CapabilityReviewerRole,
  identity: CapabilityReviewerIdentity
) {
  return buildCapabilityHumanApprovalRecord({
    context,
    oracleReview,
    checklist,
    requestedRole,
    reviewer: identity,
    notesHash: `fnv1a_notes_${requestedRole}`
  });
}

function reviewer(reviewerId: string, assignedRoles: CapabilityReviewerRole[]): CapabilityReviewerIdentity {
  return { reviewerId, assignedRoles };
}

function repairedBinding(): CapabilityApprovalRepairBinding {
  return {
    repairRequestHash: 'fnv1a_repair_request',
    sourceDiffHash: 'fnv1a_source_diff',
    scopeReportHash: 'fnv1a_scope',
    invalidationReportHash: 'fnv1a_invalidation',
    lineageHash: 'fnv1a_lineage'
  };
}
