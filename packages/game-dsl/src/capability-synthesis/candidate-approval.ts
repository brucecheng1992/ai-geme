import { hashStableJson } from '../gameplay-capabilities/stable-json.js';

export const CAPABILITY_APPROVAL_SCHEMA_VERSION = 'step36.capability-approval.v1';
export const CAPABILITY_ORACLE_REVIEW_PROMPT_KIND = 'capability_oracle_review_prompt';
export const CAPABILITY_ORACLE_REVIEW_REPORT_KIND = 'capability_oracle_review_report';
export const CAPABILITY_HUMAN_REVIEW_CHECKLIST_KIND = 'capability_human_review_checklist';
export const CAPABILITY_HUMAN_APPROVAL_RECORD_KIND = 'capability_human_approval_record';
export const CAPABILITY_HUMAN_REJECTION_RECORD_KIND = 'capability_human_rejection_record';
export const CAPABILITY_APPROVAL_VALIDITY_REPORT_KIND = 'capability_approval_validity_report';
export const CAPABILITY_APPROVAL_VALIDITY_RECEIPT_KIND = 'capability_approval_validity_receipt';
export const CAPABILITY_APPROVAL_VALIDITY_TRUSTED_NAMESPACE = 'trusted-artifact-store:capability-approval-validity';
export const CAPABILITY_REVIEWER_ROLE_POLICY_VERSION = 'step36.reviewer-role-policy.v1';
const TRUSTED_APPROVAL_VALIDITY_ISSUERS = new Set(['maker-api.capability-approval-orchestrator']);

export const CAPABILITY_HUMAN_REVIEW_REQUIRED_CHECKLIST_KEYS = [
  'reuse_exhausted',
  'minimal_reusable_primitive',
  'not_genre_or_template',
  'semantic_contract_and_non_goals_clear',
  'ownership_non_overlapping',
  'dependencies_and_versions_deterministic',
  'runtime_privileges_match_policy',
  'no_external_dependency_or_forbidden_api',
  'dsl_ir_behavior_deterministic',
  'amendment_operations_and_patch_policy_correct',
  'qa_proves_required_effects_and_negative_assertions',
  'mutation_tests_sensitive',
  'performance_and_teardown_pass',
  'step33_render_path_passes_when_applicable',
  'candidate_hash_matches_evidence',
  'step34_lifecycle_not_bypassed',
  'rollback_plan_exists'
] as const;

export const CAPABILITY_ORACLE_REVIEW_SEVERITY_TAXONOMY = {
  P0: [
    'security_boundary_breach',
    'arbitrary_code',
    'active_mutation',
    'self_certification',
    'registry_corruption',
    'missing_mandatory_isolation'
  ],
  P1: [
    'incorrect_capability_abstraction',
    'insufficient_qa',
    'ownership_conflict',
    'non_determinism',
    'teardown_leak',
    'incorrect_risk_tier',
    'step33_render_regression',
    'step34_lifecycle_regression'
  ],
  P2: ['diagnostics', 'maintainability', 'performance_margin', 'documentation', 'evidence_clarity'],
  P3: ['style', 'naming', 'developer_experience']
} as const;

export type CapabilityHumanReviewChecklistKey = (typeof CAPABILITY_HUMAN_REVIEW_REQUIRED_CHECKLIST_KEYS)[number];
export type CapabilityOracleFindingSeverity = keyof typeof CAPABILITY_ORACLE_REVIEW_SEVERITY_TAXONOMY;
export type CapabilityReviewerRole = 'capability_maintainer' | 'runtime_code_owner' | 'security_reviewer' | 'registry_admin';
export type CapabilityApprovalRole = Exclude<CapabilityReviewerRole, 'registry_admin'>;
export type CapabilityOracleReviewDecision = 'reject' | 'changes_requested' | 'approved_for_human_review';
export type CapabilityFindingDisposition = 'accepted_risk' | 'fixed_in_followup' | 'not_applicable' | 'deferred_manual_review';
export type CapabilityApprovalStatus = 'valid' | 'invalid';

export type CapabilityApprovalRepairBinding = {
  repairRequestHash: string;
  sourceDiffHash: string;
  scopeReportHash: string;
  invalidationReportHash: string;
  lineageHash: string;
};

export type CapabilityApprovalReviewContext = {
  requestId: string;
  attemptId: string;
  packageId: string;
  candidatePackageHash: string;
  packageVersion: string;
  verificationBundleHash: string;
  verificationReportReceiptHashes: string[];
  policyDecisionReceiptHash: string;
  policyVersion: string;
  requiredApprovals: string[];
  registrySnapshotHash: string;
  reviewerRolePolicyVersion?: string;
  repairBinding?: CapabilityApprovalRepairBinding;
};

export type CapabilityOracleReviewFinding = {
  severity: CapabilityOracleFindingSeverity;
  code: string;
  message: string;
  resolved?: boolean;
  disposition?: CapabilityFindingDisposition;
};

export type CapabilityApprovalIssue = {
  code:
    | 'APPROVAL_CONTEXT_BINDING_MISSING'
    | 'ORACLE_REVIEW_PROMPT_SENSITIVE_REF'
    | 'ORACLE_REVIEW_VERIFICATION_BUNDLE_NOT_PASSED'
    | 'ORACLE_REVIEW_FINDING_DISPOSITION_MISSING'
    | 'ORACLE_REVIEW_HASH_MISMATCH'
    | 'ORACLE_REVIEW_CONTEXT_MISMATCH'
    | 'ORACLE_REVIEW_NOT_APPROVED'
    | 'HUMAN_CHECKLIST_REQUIRED_KEY_MISSING'
    | 'HUMAN_CHECKLIST_REQUIRED_KEY_FALSE'
    | 'HUMAN_APPROVAL_CLIENT_ROLE_SUPPLIED'
    | 'HUMAN_APPROVAL_ROLE_NOT_ASSIGNED'
    | 'HUMAN_APPROVAL_CHECKLIST_INCOMPLETE'
    | 'HUMAN_APPROVAL_NOT_APPROVED'
    | 'HUMAN_APPROVAL_HASH_MISMATCH'
    | 'HUMAN_APPROVAL_CONTEXT_MISMATCH'
    | 'HUMAN_APPROVAL_ORACLE_REVIEW_MISMATCH'
    | 'HUMAN_APPROVAL_ROLE_POLICY_MISMATCH'
    | 'APPROVAL_POLICY_NOT_INSTALLABLE'
    | 'APPROVAL_TIER_NOT_INSTALLABLE'
    | 'APPROVAL_LATEST_REF_MISSING'
    | 'APPROVAL_REQUIRED_ROLE_MISSING'
    | 'APPROVAL_DISTINCT_REVIEWER_REQUIRED'
    | 'APPROVAL_CANDIDATE_HASH_STALE'
    | 'APPROVAL_PACKAGE_VERSION_STALE'
    | 'APPROVAL_VERIFICATION_BUNDLE_STALE'
    | 'APPROVAL_VERIFICATION_RECEIPTS_STALE'
    | 'APPROVAL_POLICY_RECEIPT_STALE'
    | 'APPROVAL_POLICY_VERSION_STALE'
    | 'APPROVAL_REQUIRED_APPROVALS_STALE'
    | 'APPROVAL_REVIEWER_ROLE_POLICY_STALE'
    | 'APPROVAL_REGISTRY_SNAPSHOT_STALE'
    | 'APPROVAL_REPAIR_BINDING_MISSING'
    | 'APPROVAL_REPAIR_BINDING_STALE'
    | 'APPROVAL_INVALIDATED_ARTIFACT_REUSED'
    | 'APPROVAL_INSTALL_OR_STEP34_STATE_FORBIDDEN';
  message: string;
  role?: CapabilityReviewerRole | string;
  path?: string;
};

export type CapabilityOracleReviewPrompt = {
  artifactKind: typeof CAPABILITY_ORACLE_REVIEW_PROMPT_KIND;
  schemaVersion: typeof CAPABILITY_APPROVAL_SCHEMA_VERSION;
  context: CapabilityApprovalReviewContext;
  contextHash: string;
  evidenceRefs: string[];
  reviewQuestions: string[];
  exclusions: string[];
  issues: CapabilityApprovalIssue[];
  promptHash: string;
};

export type CapabilityOracleReviewReport = {
  artifactKind: typeof CAPABILITY_ORACLE_REVIEW_REPORT_KIND;
  schemaVersion: typeof CAPABILITY_APPROVAL_SCHEMA_VERSION;
  context: CapabilityApprovalReviewContext;
  contextHash: string;
  decision: CapabilityOracleReviewDecision;
  findings: CapabilityOracleReviewFinding[];
  previousOracleReviewHash?: string;
  issues: CapabilityApprovalIssue[];
  reportHash: string;
};

export type CapabilityHumanReviewChecklist = {
  artifactKind: typeof CAPABILITY_HUMAN_REVIEW_CHECKLIST_KIND;
  schemaVersion: typeof CAPABILITY_APPROVAL_SCHEMA_VERSION;
  context: CapabilityApprovalReviewContext;
  contextHash: string;
  status: 'complete' | 'incomplete';
  requiredKeys: CapabilityHumanReviewChecklistKey[];
  checks: Record<CapabilityHumanReviewChecklistKey, boolean>;
  issues: CapabilityApprovalIssue[];
  checklistHash: string;
};

export type CapabilityReviewerIdentity = {
  reviewerId: string;
  assignedRoles: CapabilityReviewerRole[];
};

export type CapabilityHumanApprovalRecord = {
  artifactKind: typeof CAPABILITY_HUMAN_APPROVAL_RECORD_KIND;
  schemaVersion: typeof CAPABILITY_APPROVAL_SCHEMA_VERSION;
  context: CapabilityApprovalReviewContext;
  contextHash: string;
  status: CapabilityApprovalStatus;
  decision: 'approved' | 'changes_requested' | 'rejected';
  reviewerIdentityHash: string;
  derivedReviewerRole?: CapabilityReviewerRole;
  rolePolicyVersion: string;
  oracleReviewHash: string;
  checklistHash: string;
  notesHash?: string;
  issues: CapabilityApprovalIssue[];
  approvalHash: string;
};

export type CapabilityHumanRejectionRecord = {
  artifactKind: typeof CAPABILITY_HUMAN_REJECTION_RECORD_KIND;
  schemaVersion: typeof CAPABILITY_APPROVAL_SCHEMA_VERSION;
  context: CapabilityApprovalReviewContext;
  contextHash: string;
  reviewerIdentityHash: string;
  reasonCodes: string[];
  notesHash: string;
  requiredSpecChanges: string[];
  newRequestRequired: boolean;
  candidateRemainsViewable: boolean;
  rejectionHash: string;
};

export type CapabilityApprovalPolicySnapshot = {
  policyVersion: string;
  policyDecisionReceiptHash: string;
  riskTier?: string;
  allowed: boolean;
  requiredApprovals: string[];
  elevatedSecurityReview?: boolean;
};

export type CapabilityApprovalLatestRefs = Partial<{
  candidatePackageHash: string;
  packageVersion: string;
  verificationBundleHash: string;
  verificationReportReceiptHashes: string[];
  policyDecisionReceiptHash: string;
  policyVersion: string;
  requiredApprovals: string[];
  reviewerRolePolicyVersion: string;
  registrySnapshotHash: string;
  repairBinding: CapabilityApprovalRepairBinding;
}>;

export type CapabilityApprovalInvalidatedHashes = Partial<{
  previousVerificationBundleHash: string;
  previousOracleReviewHash: string;
  previousHumanApprovalHash: string;
  previousInstallPlanHash: string;
  previousCanaryPlanHash: string;
}>;

export type CapabilityApprovalValidityReport = {
  artifactKind: typeof CAPABILITY_APPROVAL_VALIDITY_REPORT_KIND;
  schemaVersion: typeof CAPABILITY_APPROVAL_SCHEMA_VERSION;
  context: CapabilityApprovalReviewContext;
  contextHash: string;
  status: CapabilityApprovalStatus;
  oracleReviewHash: string;
  approvalHashes: string[];
  requiredRoles: CapabilityApprovalRole[];
  issues: CapabilityApprovalIssue[];
  validityHash: string;
};

export type CapabilityApprovalValidityReceipt = {
  artifactKind: typeof CAPABILITY_APPROVAL_VALIDITY_RECEIPT_KIND;
  schemaVersion: typeof CAPABILITY_APPROVAL_SCHEMA_VERSION;
  receiptId: string;
  trustedArtifactRef: {
    namespace: typeof CAPABILITY_APPROVAL_VALIDITY_TRUSTED_NAMESPACE | string;
    artifactId: string;
    artifactKind: typeof CAPABILITY_APPROVAL_VALIDITY_RECEIPT_KIND | string;
  };
  subject: {
    requestId: string;
    attemptId: string;
    packageId: string;
    packageVersion: string;
    candidatePackageHash: string;
    verificationBundleHash: string;
    verificationReportReceiptHashes: string[];
    policyDecisionReceiptHash: string;
    policyVersion: string;
    requiredApprovals: string[];
    reviewerRolePolicyVersion: string;
    registrySnapshotHash: string;
    contextHash: string;
    approvalValidityHash: string;
  };
  issuer: {
    serviceId: string;
    keyId?: string;
    issuedAt: string;
  };
  receiptHash: string;
};

export type CapabilityApprovalValidityReceiptResolver = {
  namespace: typeof CAPABILITY_APPROVAL_VALIDITY_TRUSTED_NAMESPACE | string;
  resolveReceipt(ref: CapabilityApprovalValidityReceipt['trustedArtifactRef']): CapabilityApprovalValidityReceipt | undefined;
};

export function buildCapabilityOracleReviewPrompt(input: {
  context: CapabilityApprovalReviewContext;
  evidenceRefs: readonly string[];
  reviewQuestions?: readonly string[];
}): CapabilityOracleReviewPrompt {
  const context = normalizeContext(input.context);
  const sensitiveRefs = input.evidenceRefs.filter(isSensitiveEvidenceRef);
  const payload: Omit<CapabilityOracleReviewPrompt, 'promptHash'> = {
    artifactKind: CAPABILITY_ORACLE_REVIEW_PROMPT_KIND,
    schemaVersion: CAPABILITY_APPROVAL_SCHEMA_VERSION,
    context,
    contextHash: approvalContextHash(context),
    evidenceRefs: uniqueStrings(input.evidenceRefs.filter((ref) => !isSensitiveEvidenceRef(ref))),
    reviewQuestions: uniqueStrings(input.reviewQuestions ?? defaultOracleReviewQuestions()),
    exclusions: [
      'provider_secrets',
      'raw_hidden_harness_source',
      'reviewer_credentials',
      'mutable_registry_write_capability',
      'step34_accept_state'
    ],
    issues: sensitiveRefs
      .map((ref) => issue('ORACLE_REVIEW_PROMPT_SENSITIVE_REF', `Oracle prompt cannot include sensitive evidence ref ${ref}.`, undefined, ref))
      .sort(compareIssues)
  };
  return { ...payload, promptHash: hashStableJson(payload) };
}

export function buildCapabilityOracleReviewReport(input: {
  context: CapabilityApprovalReviewContext;
  findings: readonly CapabilityOracleReviewFinding[];
  verificationBundleStatus?: 'PASSED' | 'FAILED';
  previousOracleReviewHash?: string;
}): CapabilityOracleReviewReport {
  const context = normalizeContext(input.context);
  const findings = [...input.findings].map(normalizeFinding).sort(compareFindings);
  const issues = [
    ...(input.verificationBundleStatus === 'PASSED'
      ? []
      : [issue('ORACLE_REVIEW_VERIFICATION_BUNDLE_NOT_PASSED', 'Oracle review requires an explicit trusted PASSED verification bundle.')]),
    ...findings
      .filter((finding) => (finding.severity === 'P2' || finding.severity === 'P3') && finding.disposition === undefined)
      .map((finding) =>
        issue('ORACLE_REVIEW_FINDING_DISPOSITION_MISSING', `Finding ${finding.code} requires a P2/P3 disposition.`)
      )
  ].sort(compareIssues);
  const payload: Omit<CapabilityOracleReviewReport, 'reportHash'> = {
    artifactKind: CAPABILITY_ORACLE_REVIEW_REPORT_KIND,
    schemaVersion: CAPABILITY_APPROVAL_SCHEMA_VERSION,
    context,
    contextHash: approvalContextHash(context),
    decision: oracleDecision(findings, issues),
    findings,
    ...(input.previousOracleReviewHash === undefined ? {} : { previousOracleReviewHash: input.previousOracleReviewHash }),
    issues
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

export function buildCapabilityHumanReviewChecklist(input: {
  context: CapabilityApprovalReviewContext;
  checks: Partial<Record<CapabilityHumanReviewChecklistKey, boolean>>;
}): CapabilityHumanReviewChecklist {
  const context = normalizeContext(input.context);
  const checks = Object.fromEntries(
    CAPABILITY_HUMAN_REVIEW_REQUIRED_CHECKLIST_KEYS.map((key) => [key, input.checks[key] === true])
  ) as Record<CapabilityHumanReviewChecklistKey, boolean>;
  const issues = CAPABILITY_HUMAN_REVIEW_REQUIRED_CHECKLIST_KEYS.flatMap((key) => {
    if (!Object.prototype.hasOwnProperty.call(input.checks, key)) {
      return [issue('HUMAN_CHECKLIST_REQUIRED_KEY_MISSING', `Missing required human review checklist key ${key}.`, undefined, key)];
    }
    return input.checks[key] === true
      ? []
      : [issue('HUMAN_CHECKLIST_REQUIRED_KEY_FALSE', `Required human review checklist key ${key} is not confirmed.`, undefined, key)];
  }).sort(compareIssues);
  const payload: Omit<CapabilityHumanReviewChecklist, 'checklistHash'> = {
    artifactKind: CAPABILITY_HUMAN_REVIEW_CHECKLIST_KIND,
    schemaVersion: CAPABILITY_APPROVAL_SCHEMA_VERSION,
    context,
    contextHash: approvalContextHash(context),
    status: issues.length === 0 ? 'complete' : 'incomplete',
    requiredKeys: [...CAPABILITY_HUMAN_REVIEW_REQUIRED_CHECKLIST_KEYS],
    checks,
    issues
  };
  return { ...payload, checklistHash: hashStableJson(payload) };
}

export function buildCapabilityHumanApprovalRecord(input: {
  context: CapabilityApprovalReviewContext;
  reviewer: CapabilityReviewerIdentity;
  requestedRole: CapabilityReviewerRole;
  oracleReview: CapabilityOracleReviewReport;
  checklist: CapabilityHumanReviewChecklist;
  decision?: CapabilityHumanApprovalRecord['decision'];
  notesHash?: string;
  clientSuppliedReviewerRole?: string;
  rolePolicyVersion?: string;
}): CapabilityHumanApprovalRecord {
  const context = normalizeContext(input.context);
  const rolePolicyVersion = input.rolePolicyVersion ?? CAPABILITY_REVIEWER_ROLE_POLICY_VERSION;
  const derivedReviewerRole = deriveReviewerRole(input.reviewer, input.requestedRole);
  const issues = [
    ...(input.clientSuppliedReviewerRole === undefined
      ? []
      : [issue('HUMAN_APPROVAL_CLIENT_ROLE_SUPPLIED', 'Reviewer role must be derived by the backend, not supplied by client JSON.', input.clientSuppliedReviewerRole)]),
    ...(derivedReviewerRole === undefined
      ? [issue('HUMAN_APPROVAL_ROLE_NOT_ASSIGNED', `Reviewer is not assigned required role ${input.requestedRole}.`, input.requestedRole)]
      : []),
    ...(input.checklist.status === 'complete' && input.checklist.checklistHash === recomputeChecklistHash(input.checklist)
      ? []
      : [issue('HUMAN_APPROVAL_CHECKLIST_INCOMPLETE', 'Human approval requires a complete hash-valid checklist.')]),
    ...contextMatchIssues(context, input.oracleReview.context, 'HUMAN_APPROVAL_ORACLE_REVIEW_MISMATCH', 'Oracle review context does not match approval context.'),
    ...contextMatchIssues(context, input.checklist.context, 'HUMAN_APPROVAL_CONTEXT_MISMATCH', 'Checklist context does not match approval context.'),
    ...(input.oracleReview.reportHash === recomputeOracleReviewHash(input.oracleReview)
      ? []
      : [issue('ORACLE_REVIEW_HASH_MISMATCH', 'Oracle review hash does not match its payload.')]),
    ...(input.oracleReview.decision === 'approved_for_human_review' && input.oracleReview.issues.length === 0
      ? []
      : [issue('ORACLE_REVIEW_NOT_APPROVED', 'Human approval cannot bind an Oracle report that is not approved for human review.')]),
    ...(input.decision === undefined || input.decision === 'approved'
      ? []
      : [issue('HUMAN_APPROVAL_NOT_APPROVED', 'Human approval record is not an approved decision.')])
  ].sort(compareIssues);
  const payload: Omit<CapabilityHumanApprovalRecord, 'approvalHash'> = {
    artifactKind: CAPABILITY_HUMAN_APPROVAL_RECORD_KIND,
    schemaVersion: CAPABILITY_APPROVAL_SCHEMA_VERSION,
    context,
    contextHash: approvalContextHash(context),
    status: issues.length === 0 ? 'valid' : 'invalid',
    decision: input.decision ?? 'approved',
    reviewerIdentityHash: reviewerIdentityHash(input.reviewer),
    ...(derivedReviewerRole === undefined ? {} : { derivedReviewerRole }),
    rolePolicyVersion,
    oracleReviewHash: input.oracleReview.reportHash,
    checklistHash: input.checklist.checklistHash,
    ...(input.notesHash === undefined ? {} : { notesHash: input.notesHash }),
    issues
  };
  return { ...payload, approvalHash: hashStableJson(payload) };
}

export function buildCapabilityHumanRejectionRecord(input: {
  context: CapabilityApprovalReviewContext;
  reviewer: CapabilityReviewerIdentity;
  reasonCodes: readonly string[];
  notesHash: string;
  requiredSpecChanges?: readonly string[];
  newRequestRequired?: boolean;
  candidateRemainsViewable?: boolean;
}): CapabilityHumanRejectionRecord {
  const context = normalizeContext(input.context);
  const payload: Omit<CapabilityHumanRejectionRecord, 'rejectionHash'> = {
    artifactKind: CAPABILITY_HUMAN_REJECTION_RECORD_KIND,
    schemaVersion: CAPABILITY_APPROVAL_SCHEMA_VERSION,
    context,
    contextHash: approvalContextHash(context),
    reviewerIdentityHash: reviewerIdentityHash(input.reviewer),
    reasonCodes: uniqueStrings(input.reasonCodes),
    notesHash: input.notesHash,
    requiredSpecChanges: uniqueStrings(input.requiredSpecChanges ?? []),
    newRequestRequired: input.newRequestRequired ?? false,
    candidateRemainsViewable: input.candidateRemainsViewable ?? true
  };
  return { ...payload, rejectionHash: hashStableJson(payload) };
}

export function buildCapabilityApprovalValidityReport(input: {
  context: CapabilityApprovalReviewContext;
  policy: CapabilityApprovalPolicySnapshot;
  oracleReview: CapabilityOracleReviewReport;
  approvals: readonly CapabilityHumanApprovalRecord[];
  latestRefs?: CapabilityApprovalLatestRefs;
  invalidatedHashes?: CapabilityApprovalInvalidatedHashes;
}): CapabilityApprovalValidityReport {
  const context = normalizeContext(input.context);
  const requiredRoles = requiredRolesForPolicy(input.policy);
  const issues = [
    ...contextBindingIssues(context),
    ...policyInstallabilityIssues(input.policy),
    ...policySnapshotBindingIssues(context, input.policy, requiredRoles),
    ...latestRefIssues(context, input.latestRefs),
    ...oracleValidityIssues(context, input.oracleReview),
    ...humanApprovalValidityIssues(context, input.oracleReview.reportHash, requiredRoles, input.approvals),
    ...invalidatedHashIssues(input.oracleReview, input.approvals, input.invalidatedHashes)
  ].sort(compareIssues);
  const payload: Omit<CapabilityApprovalValidityReport, 'validityHash'> = {
    artifactKind: CAPABILITY_APPROVAL_VALIDITY_REPORT_KIND,
    schemaVersion: CAPABILITY_APPROVAL_SCHEMA_VERSION,
    context,
    contextHash: approvalContextHash(context),
    status: issues.length === 0 ? 'valid' : 'invalid',
    oracleReviewHash: input.oracleReview.reportHash,
    approvalHashes: [...input.approvals].map((approval) => approval.approvalHash).sort(),
    requiredRoles,
    issues
  };
  return { ...payload, validityHash: hashStableJson(payload) };
}

export function buildCapabilityApprovalValidityReceipt(input: {
  report: CapabilityApprovalValidityReport;
  issuer?: Partial<CapabilityApprovalValidityReceipt['issuer']>;
}): CapabilityApprovalValidityReceipt {
  const subject = approvalValidityReceiptSubject(input.report);
  const receiptPayloadWithoutId: Omit<CapabilityApprovalValidityReceipt, 'receiptId' | 'trustedArtifactRef' | 'receiptHash'> & {
    trustedArtifactRef: Omit<CapabilityApprovalValidityReceipt['trustedArtifactRef'], 'artifactId'>;
  } = {
    artifactKind: CAPABILITY_APPROVAL_VALIDITY_RECEIPT_KIND,
    schemaVersion: CAPABILITY_APPROVAL_SCHEMA_VERSION,
    trustedArtifactRef: {
      namespace: CAPABILITY_APPROVAL_VALIDITY_TRUSTED_NAMESPACE,
      artifactKind: CAPABILITY_APPROVAL_VALIDITY_RECEIPT_KIND
    },
    subject,
    issuer: {
      serviceId: input.issuer?.serviceId ?? 'maker-api.capability-approval-orchestrator',
      ...(input.issuer?.keyId === undefined ? {} : { keyId: input.issuer.keyId }),
      issuedAt: input.issuer?.issuedAt ?? '2026-06-19T00:00:00.000Z'
    }
  };
  const receiptId = `approval_receipt_${hashStableJson(receiptPayloadWithoutId).slice('fnv1a_'.length)}`;
  const payload: Omit<CapabilityApprovalValidityReceipt, 'receiptHash'> = {
    ...receiptPayloadWithoutId,
    receiptId,
    trustedArtifactRef: {
      ...receiptPayloadWithoutId.trustedArtifactRef,
      artifactId: receiptId
    }
  };
  return { ...payload, receiptHash: hashStableJson(payload) };
}

export function validateCapabilityApprovalValidityReceipt(input: {
  report: CapabilityApprovalValidityReport;
  receiptRef?: CapabilityApprovalValidityReceipt['trustedArtifactRef'];
  trustedApprovalValidityStore?: CapabilityApprovalValidityReceiptResolver;
}): boolean {
  const receipt = input.receiptRef === undefined || input.trustedApprovalValidityStore === undefined
    ? undefined
    : input.trustedApprovalValidityStore.resolveReceipt(input.receiptRef);
  return receipt !== undefined &&
    input.trustedApprovalValidityStore?.namespace === CAPABILITY_APPROVAL_VALIDITY_TRUSTED_NAMESPACE &&
    sameTrustedArtifactRef(input.receiptRef, receipt.trustedArtifactRef) &&
    receipt.trustedArtifactRef.namespace === CAPABILITY_APPROVAL_VALIDITY_TRUSTED_NAMESPACE &&
    receipt.trustedArtifactRef.artifactKind === CAPABILITY_APPROVAL_VALIDITY_RECEIPT_KIND &&
    receipt.trustedArtifactRef.artifactId === receipt.receiptId &&
    TRUSTED_APPROVAL_VALIDITY_ISSUERS.has(receipt.issuer.serviceId) &&
    receipt.receiptHash === recomputeApprovalValidityReceiptHash(receipt) &&
    hashStableJson(receipt.subject) === hashStableJson(approvalValidityReceiptSubject(input.report));
}

function normalizeContext(context: CapabilityApprovalReviewContext): CapabilityApprovalReviewContext {
  return {
    requestId: context.requestId.trim(),
    attemptId: context.attemptId.trim(),
    packageId: context.packageId.trim(),
    packageVersion: context.packageVersion.trim(),
    candidatePackageHash: context.candidatePackageHash.trim(),
    verificationBundleHash: context.verificationBundleHash.trim(),
    verificationReportReceiptHashes: uniqueStrings(context.verificationReportReceiptHashes.map((value) => value.trim())),
    policyDecisionReceiptHash: context.policyDecisionReceiptHash.trim(),
    policyVersion: context.policyVersion.trim(),
    requiredApprovals: uniqueStrings(context.requiredApprovals.map((value) => value.trim())),
    registrySnapshotHash: context.registrySnapshotHash.trim(),
    reviewerRolePolicyVersion: (context.reviewerRolePolicyVersion ?? CAPABILITY_REVIEWER_ROLE_POLICY_VERSION).trim(),
    ...(context.repairBinding === undefined ? {} : { repairBinding: normalizeRepairBinding(context.repairBinding) })
  };
}

function normalizeRepairBinding(binding: CapabilityApprovalRepairBinding): CapabilityApprovalRepairBinding {
  return {
    repairRequestHash: binding.repairRequestHash.trim(),
    sourceDiffHash: binding.sourceDiffHash.trim(),
    scopeReportHash: binding.scopeReportHash.trim(),
    invalidationReportHash: binding.invalidationReportHash.trim(),
    lineageHash: binding.lineageHash.trim()
  };
}

function approvalContextHash(context: CapabilityApprovalReviewContext): string {
  return hashStableJson(normalizeContext(context));
}

function defaultOracleReviewQuestions(): string[] {
  return [
    'reuse_analysis_credible',
    'smallest_reusable_primitive',
    'no_hidden_genre_or_template',
    'contract_covers_dsl_ir_runtime_amendments_qa_evidence',
    'ownership_dependencies_versions_deterministic',
    'approved_sdk_services_only',
    'no_network_filesystem_secrets_dynamic_code_or_external_dependency',
    'black_box_evidence_proves_runtime_behavior',
    'mutation_tests_detect_semantic_defects',
    'performance_teardown_lifecycle_pass',
    'step33_and_step34_authoritative',
    'install_and_rollback_plan_safe'
  ];
}

function normalizeFinding(finding: CapabilityOracleReviewFinding): CapabilityOracleReviewFinding {
  return {
    severity: finding.severity,
    code: finding.code.trim(),
    message: finding.message.trim(),
    ...(finding.resolved === undefined ? {} : { resolved: finding.resolved }),
    ...(finding.disposition === undefined ? {} : { disposition: finding.disposition })
  };
}

function oracleDecision(
  findings: readonly CapabilityOracleReviewFinding[],
  issues: readonly CapabilityApprovalIssue[]
): CapabilityOracleReviewDecision {
  if (issues.some((item) => item.code === 'ORACLE_REVIEW_VERIFICATION_BUNDLE_NOT_PASSED') || findings.some((finding) => finding.severity === 'P0')) {
    return 'reject';
  }
  if (
    findings.some((finding) => finding.severity === 'P1' && finding.resolved !== true) ||
    issues.some((item) => item.code === 'ORACLE_REVIEW_FINDING_DISPOSITION_MISSING')
  ) {
    return 'changes_requested';
  }
  return 'approved_for_human_review';
}

function deriveReviewerRole(reviewer: CapabilityReviewerIdentity, requestedRole: CapabilityReviewerRole): CapabilityReviewerRole | undefined {
  return reviewer.assignedRoles.includes(requestedRole) ? requestedRole : undefined;
}

function reviewerIdentityHash(reviewer: CapabilityReviewerIdentity): string {
  return hashStableJson({
    reviewerId: reviewer.reviewerId.trim(),
    assignedRoles: uniqueStrings(reviewer.assignedRoles)
  });
}

function requiredRolesForPolicy(policy: CapabilityApprovalPolicySnapshot): CapabilityApprovalRole[] {
  if (policy.riskTier === 'R1_DECLARATIVE_EXTENSION') {
    return uniqueStrings(['capability_maintainer', ...extraApprovalRoles(policy.requiredApprovals)]).filter(isApprovalRole);
  }
  if (policy.riskTier === 'R2_BOUNDED_RUNTIME_MODULE') {
    return uniqueStrings([
      'capability_maintainer',
      'runtime_code_owner',
      ...extraApprovalRoles(policy.requiredApprovals),
      ...(policy.elevatedSecurityReview === true || policy.requiredApprovals.includes('security_reviewer') ? ['security_reviewer'] : [])
    ]).filter(isApprovalRole);
  }
  return [];
}

function extraApprovalRoles(requiredApprovals: readonly string[]): string[] {
  return requiredApprovals.filter((role) => isApprovalRole(role) && role !== 'capability_maintainer' && role !== 'runtime_code_owner');
}

function policyInstallabilityIssues(policy: CapabilityApprovalPolicySnapshot): CapabilityApprovalIssue[] {
  const issues: CapabilityApprovalIssue[] = [];
  if (!policy.allowed) {
    issues.push(issue('APPROVAL_POLICY_NOT_INSTALLABLE', 'Policy snapshot is not installable.'));
  }
  if (policy.riskTier !== 'R1_DECLARATIVE_EXTENSION' && policy.riskTier !== 'R2_BOUNDED_RUNTIME_MODULE') {
    issues.push(issue('APPROVAL_TIER_NOT_INSTALLABLE', `Risk tier ${policy.riskTier ?? 'unknown'} cannot be approved for automated install.`));
  }
  return issues;
}

function policySnapshotBindingIssues(
  context: CapabilityApprovalReviewContext,
  policy: CapabilityApprovalPolicySnapshot,
  requiredRoles: readonly CapabilityApprovalRole[]
): CapabilityApprovalIssue[] {
  return [
    ...(policy.policyDecisionReceiptHash === context.policyDecisionReceiptHash
      ? []
      : [issue('APPROVAL_POLICY_RECEIPT_STALE', 'Policy snapshot receipt hash does not match approval context.')]),
    ...(policy.policyVersion === context.policyVersion
      ? []
      : [issue('APPROVAL_POLICY_VERSION_STALE', 'Policy snapshot version does not match approval context.')]),
    ...(sameStringSet(requiredRoles, context.requiredApprovals)
      ? []
      : [issue('APPROVAL_REQUIRED_APPROVALS_STALE', 'Policy snapshot required approvals do not match approval context.')])
  ];
}

function latestRefIssues(context: CapabilityApprovalReviewContext, latestRefs: CapabilityApprovalLatestRefs | undefined): CapabilityApprovalIssue[] {
  const missingIssues = latestRefMissingIssues(latestRefs);
  if (latestRefs === undefined) {
    return missingIssues;
  }
  return [
    ...missingIssues,
    ...(latestRefs.candidatePackageHash === undefined || latestRefs.candidatePackageHash === context.candidatePackageHash
      ? []
      : [issue('APPROVAL_CANDIDATE_HASH_STALE', 'Approval context candidate package hash is stale.')]),
    ...(latestRefs.packageVersion === undefined || latestRefs.packageVersion === context.packageVersion
      ? []
      : [issue('APPROVAL_PACKAGE_VERSION_STALE', 'Approval context package version is stale.', undefined, 'packageVersion')]),
    ...(latestRefs.verificationBundleHash === undefined || latestRefs.verificationBundleHash === context.verificationBundleHash
      ? []
      : [issue('APPROVAL_VERIFICATION_BUNDLE_STALE', 'Approval context verification bundle hash is stale.')]),
    ...(latestRefs.verificationReportReceiptHashes === undefined ||
    sameStringSet(latestRefs.verificationReportReceiptHashes, context.verificationReportReceiptHashes)
      ? []
      : [issue('APPROVAL_VERIFICATION_RECEIPTS_STALE', 'Approval context trusted verification receipt hashes are stale.')]),
    ...(latestRefs.policyDecisionReceiptHash === undefined || latestRefs.policyDecisionReceiptHash === context.policyDecisionReceiptHash
      ? []
      : [issue('APPROVAL_POLICY_RECEIPT_STALE', 'Approval context policy receipt hash is stale.')]),
    ...(latestRefs.policyVersion === undefined || latestRefs.policyVersion === context.policyVersion
      ? []
      : [issue('APPROVAL_POLICY_VERSION_STALE', 'Approval context policy version is stale.')]),
    ...(latestRefs.requiredApprovals === undefined || sameStringSet(latestRefs.requiredApprovals, context.requiredApprovals)
      ? []
      : [issue('APPROVAL_REQUIRED_APPROVALS_STALE', 'Approval context required approvals are stale.')]),
    ...(latestRefs.reviewerRolePolicyVersion === undefined || latestRefs.reviewerRolePolicyVersion === context.reviewerRolePolicyVersion
      ? []
      : [issue('APPROVAL_REVIEWER_ROLE_POLICY_STALE', 'Approval context reviewer role policy version is stale.')]),
    ...(latestRefs.registrySnapshotHash === undefined || latestRefs.registrySnapshotHash === context.registrySnapshotHash
      ? []
      : [issue('APPROVAL_REGISTRY_SNAPSHOT_STALE', 'Approval context registry snapshot is stale.')]),
    ...latestRepairBindingIssues(context.repairBinding, latestRefs.repairBinding)
  ];
}

function latestRefMissingIssues(latestRefs: CapabilityApprovalLatestRefs | undefined): CapabilityApprovalIssue[] {
  const requiredKeys = [
    'candidatePackageHash',
    'packageVersion',
    'verificationBundleHash',
    'verificationReportReceiptHashes',
    'policyDecisionReceiptHash',
    'policyVersion',
    'requiredApprovals',
    'reviewerRolePolicyVersion',
    'registrySnapshotHash'
  ] as const;
  return requiredKeys
    .filter((key) => latestRefs?.[key] === undefined)
    .map((key) => issue('APPROVAL_LATEST_REF_MISSING', `Approval validity requires latest ref ${key}.`, undefined, key));
}

function latestRepairBindingIssues(
  contextBinding: CapabilityApprovalRepairBinding | undefined,
  latestBinding: CapabilityApprovalRepairBinding | undefined
): CapabilityApprovalIssue[] {
  if (contextBinding !== undefined && latestBinding === undefined) {
    return [issue('APPROVAL_REPAIR_BINDING_MISSING', 'Repaired candidate approval requires latest repair binding.')];
  }
  if (latestBinding === undefined) {
    return [];
  }
  if (contextBinding === undefined) {
    return [issue('APPROVAL_REPAIR_BINDING_MISSING', 'Repaired candidate approval requires matching repair binding.')];
  }
  return hashStableJson(normalizeRepairBinding(contextBinding)) === hashStableJson(normalizeRepairBinding(latestBinding))
    ? []
    : [issue('APPROVAL_REPAIR_BINDING_STALE', 'Approval context repair binding is stale.')];
}

function oracleValidityIssues(
  context: CapabilityApprovalReviewContext,
  oracleReview: CapabilityOracleReviewReport
): CapabilityApprovalIssue[] {
  return [
    ...(oracleReview.reportHash === recomputeOracleReviewHash(oracleReview)
      ? []
      : [issue('ORACLE_REVIEW_HASH_MISMATCH', 'Oracle review hash does not match its payload.')]),
    ...contextMatchIssues(context, oracleReview.context, 'ORACLE_REVIEW_CONTEXT_MISMATCH', 'Oracle review context does not match approval context.'),
    ...(oracleReview.decision === 'approved_for_human_review' && oracleReview.issues.length === 0
      ? []
      : [issue('ORACLE_REVIEW_NOT_APPROVED', 'Oracle review is not approved for human review.')])
  ];
}

function humanApprovalValidityIssues(
  context: CapabilityApprovalReviewContext,
  oracleReviewHash: string,
  requiredRoles: readonly CapabilityApprovalRole[],
  approvals: readonly CapabilityHumanApprovalRecord[]
): CapabilityApprovalIssue[] {
  const issues: CapabilityApprovalIssue[] = [];
  const validApprovals = approvals.filter((approval) => {
    const approvalIssues = [
      ...(approval.approvalHash === recomputeApprovalHash(approval)
        ? []
        : [issue('HUMAN_APPROVAL_HASH_MISMATCH', 'Human approval hash does not match its payload.')]),
      ...contextMatchIssues(context, approval.context, 'HUMAN_APPROVAL_CONTEXT_MISMATCH', 'Human approval context does not match approval validity context.'),
      ...(approval.status === 'valid' && approval.decision === 'approved'
        ? []
        : [issue('HUMAN_APPROVAL_NOT_APPROVED', 'Human approval record is not valid and approved.')]),
      ...(approval.rolePolicyVersion === context.reviewerRolePolicyVersion
        ? []
        : [issue('HUMAN_APPROVAL_ROLE_POLICY_MISMATCH', 'Human approval role policy version does not match approval context.')]),
      ...(approval.oracleReviewHash === oracleReviewHash
        ? []
        : [issue('HUMAN_APPROVAL_ORACLE_REVIEW_MISMATCH', 'Human approval does not bind the latest Oracle review hash.')])
    ];
    issues.push(...approvalIssues);
    return approvalIssues.length === 0 && approval.derivedReviewerRole !== undefined && isApprovalRole(approval.derivedReviewerRole);
  });
  for (const requiredRole of requiredRoles) {
    if (!validApprovals.some((approval) => approval.derivedReviewerRole === requiredRole)) {
      issues.push(issue('APPROVAL_REQUIRED_ROLE_MISSING', `Missing required approval role ${requiredRole}.`, requiredRole));
    }
  }
  const maintainer = validApprovals.find((approval) => approval.derivedReviewerRole === 'capability_maintainer');
  const runtimeOwner = validApprovals.find((approval) => approval.derivedReviewerRole === 'runtime_code_owner');
  if (
    requiredRoles.includes('capability_maintainer') &&
    requiredRoles.includes('runtime_code_owner') &&
    maintainer !== undefined &&
    runtimeOwner !== undefined &&
    maintainer.reviewerIdentityHash === runtimeOwner.reviewerIdentityHash
  ) {
    issues.push(issue('APPROVAL_DISTINCT_REVIEWER_REQUIRED', 'R2 capability maintainer and runtime code owner approvals require distinct reviewers.'));
  }
  return issues;
}

function invalidatedHashIssues(
  oracleReview: CapabilityOracleReviewReport,
  approvals: readonly CapabilityHumanApprovalRecord[],
  invalidatedHashes: CapabilityApprovalInvalidatedHashes | undefined
): CapabilityApprovalIssue[] {
  if (invalidatedHashes === undefined) {
    return [];
  }
  const invalidated = new Set(
    Object.values(invalidatedHashes).filter((value): value is string => typeof value === 'string' && value.length > 0)
  );
  return [
    ...(invalidated.has(oracleReview.reportHash)
      ? [issue('APPROVAL_INVALIDATED_ARTIFACT_REUSED', 'Oracle review hash was invalidated by a prior repair.')]
      : []),
    ...approvals
      .filter((approval) => invalidated.has(approval.approvalHash))
      .map((approval) =>
        issue('APPROVAL_INVALIDATED_ARTIFACT_REUSED', 'Human approval hash was invalidated by a prior repair.', approval.derivedReviewerRole)
      )
  ];
}

function contextBindingIssues(context: CapabilityApprovalReviewContext): CapabilityApprovalIssue[] {
  const requiredValues = [
    ['requestId', context.requestId],
    ['attemptId', context.attemptId],
    ['packageId', context.packageId],
    ['packageVersion', context.packageVersion],
    ['candidatePackageHash', context.candidatePackageHash],
    ['verificationBundleHash', context.verificationBundleHash],
    ['policyDecisionReceiptHash', context.policyDecisionReceiptHash],
    ['policyVersion', context.policyVersion],
    ['registrySnapshotHash', context.registrySnapshotHash],
    ['reviewerRolePolicyVersion', context.reviewerRolePolicyVersion ?? '']
  ] as const;
  const issues = requiredValues
    .filter(([, value]) => value.trim().length === 0)
    .map(([key]) => issue('APPROVAL_CONTEXT_BINDING_MISSING', `Approval context missing required binding ${key}.`, undefined, key));
  if (context.verificationReportReceiptHashes.length === 0) {
    issues.push(issue('APPROVAL_CONTEXT_BINDING_MISSING', 'Approval context requires trusted verification receipt hashes.', undefined, 'verificationReportReceiptHashes'));
  }
  if (context.requiredApprovals.length === 0) {
    issues.push(issue('APPROVAL_CONTEXT_BINDING_MISSING', 'Approval context requires policy-derived required approvals.', undefined, 'requiredApprovals'));
  }
  if (context.repairBinding !== undefined) {
    for (const [key, value] of Object.entries(context.repairBinding)) {
      if (value.trim().length === 0) {
        issues.push(issue('APPROVAL_REPAIR_BINDING_MISSING', `Approval context missing repair binding ${key}.`, undefined, key));
      }
    }
  }
  return issues;
}

function contextMatchIssues(
  expected: CapabilityApprovalReviewContext,
  actual: CapabilityApprovalReviewContext,
  code: Extract<CapabilityApprovalIssue['code'], 'ORACLE_REVIEW_CONTEXT_MISMATCH' | 'HUMAN_APPROVAL_CONTEXT_MISMATCH' | 'HUMAN_APPROVAL_ORACLE_REVIEW_MISMATCH'>,
  message: string
): CapabilityApprovalIssue[] {
  return approvalContextHash(expected) === approvalContextHash(actual) ? [] : [issue(code, message)];
}

function recomputeOracleReviewHash(report: CapabilityOracleReviewReport): string {
  const { reportHash: _reportHash, ...payload } = report;
  return hashStableJson(payload);
}

function recomputeChecklistHash(checklist: CapabilityHumanReviewChecklist): string {
  const { checklistHash: _checklistHash, ...payload } = checklist;
  return hashStableJson(payload);
}

function recomputeApprovalHash(approval: CapabilityHumanApprovalRecord): string {
  const { approvalHash: _approvalHash, ...payload } = approval;
  return hashStableJson(payload);
}

function recomputeApprovalValidityReceiptHash(receipt: CapabilityApprovalValidityReceipt): string {
  const { receiptHash: _receiptHash, ...payload } = receipt;
  return hashStableJson(payload);
}

function approvalValidityReceiptSubject(report: CapabilityApprovalValidityReport): CapabilityApprovalValidityReceipt['subject'] {
  const context = normalizeContext(report.context);
  return {
    requestId: context.requestId,
    attemptId: context.attemptId,
    packageId: context.packageId,
    packageVersion: context.packageVersion,
    candidatePackageHash: context.candidatePackageHash,
    verificationBundleHash: context.verificationBundleHash,
    verificationReportReceiptHashes: context.verificationReportReceiptHashes,
    policyDecisionReceiptHash: context.policyDecisionReceiptHash,
    policyVersion: context.policyVersion,
    requiredApprovals: context.requiredApprovals,
    registrySnapshotHash: context.registrySnapshotHash,
    reviewerRolePolicyVersion: context.reviewerRolePolicyVersion ?? CAPABILITY_REVIEWER_ROLE_POLICY_VERSION,
    contextHash: approvalContextHash(context),
    approvalValidityHash: report.validityHash
  };
}

function sameTrustedArtifactRef(
  left: CapabilityApprovalValidityReceipt['trustedArtifactRef'] | undefined,
  right: CapabilityApprovalValidityReceipt['trustedArtifactRef']
): boolean {
  return left !== undefined &&
    left.namespace === right.namespace &&
    left.artifactId === right.artifactId &&
    left.artifactKind === right.artifactKind;
}

function issue(
  code: CapabilityApprovalIssue['code'],
  message: string,
  role?: CapabilityReviewerRole | string,
  path?: string
): CapabilityApprovalIssue {
  return {
    code,
    message,
    ...(role === undefined ? {} : { role }),
    ...(path === undefined ? {} : { path })
  };
}

function isSensitiveEvidenceRef(ref: string): boolean {
  const normalized = ref.toLowerCase();
  return normalized.includes('secret') ||
    normalized.includes('token') ||
    normalized.includes('credential') ||
    normalized.includes('raw_hidden_harness') ||
    normalized.includes('provider_key') ||
    normalized.includes('step34_accept');
}

function isApprovalRole(value: string): value is CapabilityApprovalRole {
  return value === 'capability_maintainer' ||
    value === 'runtime_code_owner' ||
    value === 'security_reviewer';
}

function compareIssues(left: CapabilityApprovalIssue, right: CapabilityApprovalIssue): number {
  return `${left.code}:${left.role ?? ''}:${left.path ?? ''}`.localeCompare(`${right.code}:${right.role ?? ''}:${right.path ?? ''}`);
}

function compareFindings(left: CapabilityOracleReviewFinding, right: CapabilityOracleReviewFinding): number {
  return `${left.severity}:${left.code}`.localeCompare(`${right.severity}:${right.code}`);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort();
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  return hashStableJson(uniqueStrings(left)) === hashStableJson(uniqueStrings(right));
}
