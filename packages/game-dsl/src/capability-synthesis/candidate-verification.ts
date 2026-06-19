import { hashStableJson } from '../gameplay-capabilities/stable-json.js';
import type {
  CandidateSourceManifest,
  CandidateSourcePolicyPrecheck,
  CandidateSourceProvenance
} from './candidate-source.js';
import type {
  CapabilityScaffoldAllowedFileMap,
  CapabilityScaffoldExternalTestManifest
} from './capability-scaffold.js';

export const CANDIDATE_VERIFICATION_SCHEMA_VERSION = 'step36.capability-verification.v1';
export const CANDIDATE_VERIFICATION_REPORT_KIND = 'capability_verification_report';
export const CANDIDATE_VERIFICATION_REPORT_RECEIPT_KIND = 'capability_verification_report_receipt';
export const CAPABILITY_VERIFICATION_BUNDLE_KIND = 'capability_verification_bundle';
export const CANDIDATE_VERIFICATION_REPORT_TRUSTED_NAMESPACE = 'trusted-artifact-store:capability-verification-reports';
const TRUSTED_CANDIDATE_VERIFICATION_ISSUERS = new Set(['maker-api.capability-verification-orchestrator']);

export const CANDIDATE_VERIFICATION_STAGES = [
  'source_integrity',
  'package_contract',
  'ownership',
  'static_policy',
  'typecheck',
  'determinism',
  'contract_tests',
  'build',
  'runtime_binding',
  'capability_qa',
  'external_qa',
  'render_fidelity',
  'failure_path',
  'mutation_tests',
  'adversarial_security',
  'performance',
  'teardown',
  'profile_canary'
] as const;

export type CandidateVerificationStageId = (typeof CANDIDATE_VERIFICATION_STAGES)[number];
export type CandidateVerificationStatus = 'PASSED' | 'FAILED' | 'INCONCLUSIVE' | 'SKIPPED';

export type CandidateVerificationContext = {
  requestId: string;
  attemptId: string;
  packageId: string;
  specificationHash: string;
  decisionContextHash: string;
  policyDecisionReceiptHash: string;
  sourceManifestHash: string;
  candidateSourceManifestHash: string;
  scaffoldReportHash: string;
  allowedFileMapHash: string;
  generatedTestManifestHash: string;
  externalTestManifestHash: string;
  registrySnapshotHash: string;
};

export type CandidateVerificationIssue = {
  code:
    | 'VERIFICATION_REQUIRED_REPORT_MISSING'
    | 'VERIFICATION_REPORT_RECEIPT_MISSING'
    | 'VERIFICATION_REPORT_RECEIPT_PROVENANCE_INVALID'
    | 'VERIFICATION_REPORT_RECEIPT_HASH_MISMATCH'
    | 'VERIFICATION_REPORT_RECEIPT_CONTEXT_MISMATCH'
    | 'VERIFICATION_REPORT_DUPLICATE_STAGE'
    | 'VERIFICATION_REPORT_HASH_MISMATCH'
    | 'VERIFICATION_REPORT_CONTEXT_MISMATCH'
    | 'VERIFICATION_REPORT_CANDIDATE_CONTROLLED'
    | 'VERIFICATION_REQUIRED_REPORT_FAILED'
    | 'VERIFICATION_REQUIRED_REPORT_INCONCLUSIVE'
    | 'VERIFICATION_REQUIRED_REPORT_SKIPPED'
    | 'VERIFICATION_HARNESS_MANIFEST_HASH_MISMATCH'
    | 'VERIFICATION_HARNESS_MISSING'
    | 'VERIFICATION_HARNESS_HASH_MISMATCH'
    | 'VERIFICATION_HARNESS_CANDIDATE_CONTROLLED'
    | 'VERIFICATION_ALLOWED_FILE_MAP_HASH_MISMATCH'
    | 'VERIFICATION_SOURCE_MANIFEST_HASH_MISMATCH'
    | 'VERIFICATION_SOURCE_PRECHECK_FAILED'
    | 'VERIFICATION_SOURCE_PRECHECK_HASH_MISMATCH'
    | 'VERIFICATION_SOURCE_PROVENANCE_HASH_MISMATCH'
    | 'VERIFICATION_SOURCE_CONTEXT_MISMATCH'
    | 'VERIFICATION_SOURCE_FILE_MISSING'
    | 'VERIFICATION_SOURCE_FILE_HASH_MISMATCH'
    | 'VERIFICATION_SOURCE_FILE_UNDECLARED'
    | 'VERIFICATION_FORBIDDEN_STATIC_PATTERN'
    | 'VERIFICATION_MUTATION_COVERAGE_MISSING'
    | 'VERIFICATION_MUTATION_SURVIVED'
    | 'VERIFICATION_PERFORMANCE_EVIDENCE_MISSING'
    | 'VERIFICATION_PERFORMANCE_BUDGET_EXCEEDED'
    | 'VERIFICATION_TEARDOWN_LEAK'
    | 'VERIFICATION_PROFILE_CANARY_COVERAGE_MISSING'
    | 'VERIFICATION_PROFILE_CANARY_REGRESSION';
  message: string;
  stageId?: CandidateVerificationStageId;
  path?: string;
};

export type CandidateVerificationReport = {
  artifactKind: typeof CANDIDATE_VERIFICATION_REPORT_KIND;
  schemaVersion: typeof CANDIDATE_VERIFICATION_SCHEMA_VERSION;
  context: CandidateVerificationContext;
  stageId: CandidateVerificationStageId;
  required: boolean;
  status: CandidateVerificationStatus;
  issues: CandidateVerificationIssue[];
  evidenceRefs: string[];
  startedAt: string;
  endedAt: string;
  candidateControlled?: boolean;
  reportHash: string;
};

export type CandidateVerificationReportReceipt = {
  artifactKind: typeof CANDIDATE_VERIFICATION_REPORT_RECEIPT_KIND;
  schemaVersion: typeof CANDIDATE_VERIFICATION_SCHEMA_VERSION;
  receiptId: string;
  trustedArtifactRef: {
    namespace: typeof CANDIDATE_VERIFICATION_REPORT_TRUSTED_NAMESPACE | string;
    artifactId: string;
    artifactKind: typeof CANDIDATE_VERIFICATION_REPORT_RECEIPT_KIND | string;
  };
  subject: CandidateVerificationReportReceiptSubject;
  issuer: {
    serviceId: string;
    keyId?: string;
    issuedAt: string;
  };
  receiptHash: string;
};

export type CandidateVerificationReportReceiptSubject = {
  requestId: string;
  attemptId: string;
  packageId: string;
  stageId: CandidateVerificationStageId;
  reportHash: string;
  reportContextHash: string;
  specificationHash: string;
  decisionContextHash: string;
  policyDecisionReceiptHash: string;
  sourceManifestHash: string;
  candidateSourceManifestHash: string;
  scaffoldReportHash: string;
  allowedFileMapHash: string;
  generatedTestManifestHash: string;
  externalTestManifestHash: string;
  registrySnapshotHash: string;
};

export type CandidateVerificationReportReceiptResolver = {
  namespace: typeof CANDIDATE_VERIFICATION_REPORT_TRUSTED_NAMESPACE | string;
  resolveReceipt(ref: CandidateVerificationReportReceipt['trustedArtifactRef']): CandidateVerificationReportReceipt | undefined;
};

export type CandidateVerificationBundle = {
  artifactKind: typeof CAPABILITY_VERIFICATION_BUNDLE_KIND;
  schemaVersion: typeof CANDIDATE_VERIFICATION_SCHEMA_VERSION;
  context: CandidateVerificationContext;
  status: 'PASSED' | 'FAILED';
  requiredStages: CandidateVerificationStageId[];
  reportHashes: Array<{ stageId: CandidateVerificationStageId; reportHash: string }>;
  firstBlockingStage?: CandidateVerificationStageId;
  issues: CandidateVerificationIssue[];
  bundleHash: string;
};

export function buildCandidateVerificationReport(input: {
  context: CandidateVerificationContext;
  stageId: CandidateVerificationStageId;
  required?: boolean;
  status: CandidateVerificationStatus;
  issues?: CandidateVerificationIssue[];
  evidenceRefs?: readonly string[];
  candidateControlled?: boolean;
  startedAt?: string;
  endedAt?: string;
}): CandidateVerificationReport {
  const payload: Omit<CandidateVerificationReport, 'reportHash'> = {
    artifactKind: CANDIDATE_VERIFICATION_REPORT_KIND,
    schemaVersion: CANDIDATE_VERIFICATION_SCHEMA_VERSION,
    context: input.context,
    stageId: input.stageId,
    required: input.required ?? true,
    status: input.status,
    issues: [...(input.issues ?? [])].sort(compareIssues),
    evidenceRefs: uniqueStrings(input.evidenceRefs ?? []),
    startedAt: input.startedAt ?? '2026-06-19T00:00:00.000Z',
    endedAt: input.endedAt ?? '2026-06-19T00:00:01.000Z',
    ...(input.candidateControlled === undefined ? {} : { candidateControlled: input.candidateControlled })
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

export function buildCandidateVerificationReportReceipt(input: {
  report: CandidateVerificationReport;
  issuer?: Partial<CandidateVerificationReportReceipt['issuer']>;
}): CandidateVerificationReportReceipt {
  const receiptPayloadWithoutId: Omit<CandidateVerificationReportReceipt, 'receiptId' | 'trustedArtifactRef' | 'receiptHash'> & {
    trustedArtifactRef: Omit<CandidateVerificationReportReceipt['trustedArtifactRef'], 'artifactId'>;
  } = {
    artifactKind: CANDIDATE_VERIFICATION_REPORT_RECEIPT_KIND,
    schemaVersion: CANDIDATE_VERIFICATION_SCHEMA_VERSION,
    trustedArtifactRef: {
      namespace: CANDIDATE_VERIFICATION_REPORT_TRUSTED_NAMESPACE,
      artifactKind: CANDIDATE_VERIFICATION_REPORT_RECEIPT_KIND
    },
    subject: verificationReportReceiptSubject(input.report),
    issuer: {
      serviceId: input.issuer?.serviceId ?? 'maker-api.capability-verification-orchestrator',
      ...(input.issuer?.keyId === undefined ? {} : { keyId: input.issuer.keyId }),
      issuedAt: input.issuer?.issuedAt ?? '2026-06-19T00:00:00.000Z'
    }
  };
  const receiptId = `capver_receipt_${hashStableJson(receiptPayloadWithoutId).slice('fnv1a_'.length)}`;
  const payload: Omit<CandidateVerificationReportReceipt, 'receiptHash'> = {
    ...receiptPayloadWithoutId,
    receiptId,
    trustedArtifactRef: {
      ...receiptPayloadWithoutId.trustedArtifactRef,
      artifactId: receiptId
    }
  };
  return { ...payload, receiptHash: hashStableJson(payload) };
}

export function buildCapabilityVerificationBundle(input: {
  context: CandidateVerificationContext;
  reports: readonly CandidateVerificationReport[];
  verificationReportReceiptRefs?: readonly CandidateVerificationReportReceipt['trustedArtifactRef'][];
  trustedVerificationReportStore?: CandidateVerificationReportReceiptResolver;
  renderRequired?: boolean;
}): CandidateVerificationBundle {
  const requiredStages = requiredVerificationStages(input.renderRequired === true);
  const reportsByStage = new Map(input.reports.map((report) => [report.stageId, report]));
  const receiptsByStage = resolveTrustedVerificationReceipts(input);
  const issues: CandidateVerificationIssue[] = duplicateReportIssues(input.reports);
  let firstBlockingStage: CandidateVerificationStageId | undefined;
  if (issues.length > 0) {
    firstBlockingStage = issues[0]?.stageId;
  }
  for (const stageId of requiredStages) {
    const report = reportsByStage.get(stageId);
    const stageIssues = report === undefined
      ? [issue('VERIFICATION_REQUIRED_REPORT_MISSING', `Missing required verification report ${stageId}.`, stageId)]
      : reportIssues(report, input.context, receiptsByStage.get(stageId)?.receipt, receiptsByStage.get(stageId)?.ref);
    if (stageIssues.length > 0 && firstBlockingStage === undefined) {
      firstBlockingStage = stageId;
    }
    issues.push(...stageIssues);
  }
  const orderedReports = [...input.reports].sort((left, right) => stageOrder(left.stageId) - stageOrder(right.stageId));
  const payload: Omit<CandidateVerificationBundle, 'bundleHash'> = {
    artifactKind: CAPABILITY_VERIFICATION_BUNDLE_KIND,
    schemaVersion: CANDIDATE_VERIFICATION_SCHEMA_VERSION,
    context: input.context,
    status: issues.length === 0 ? 'PASSED' : 'FAILED',
    requiredStages,
    reportHashes: orderedReports.map((report) => ({ stageId: report.stageId, reportHash: report.reportHash })),
    ...(firstBlockingStage === undefined ? {} : { firstBlockingStage }),
    issues: issues.sort(compareIssues)
  };
  return { ...payload, bundleHash: hashStableJson(payload) };
}

export function buildSourceIntegrityVerificationReport(input: {
  context: CandidateVerificationContext;
  allowedFileMap: CapabilityScaffoldAllowedFileMap;
  candidateSourceManifest: CandidateSourceManifest;
  sourcePolicyPrecheck: CandidateSourcePolicyPrecheck;
  sourceProvenance: CandidateSourceProvenance;
  stagedCandidateFiles: ReadonlyArray<{ path: string; contentHash: string }>;
  externalTestManifest: CapabilityScaffoldExternalTestManifest;
  stagedExternalTests: ReadonlyArray<{ path: string; contentHash: string; source: 'trusted_external_harness' | 'candidate'; readOnly: boolean }>;
}): CandidateVerificationReport {
  const issues = [
    ...sourceArtifactIntegrityIssues(input),
    ...externalHarnessIntegrityIssues(input)
  ];
  return buildCandidateVerificationReport({
    context: input.context,
    stageId: 'source_integrity',
    status: issues.length === 0 ? 'PASSED' : 'FAILED',
    issues,
    evidenceRefs: ['candidate_source_manifest.json', 'candidate_external_test_manifest.json']
  });
}

export function buildStaticPolicyVerificationReport(input: {
  context: CandidateVerificationContext;
  files: ReadonlyArray<{ path: string; content: string }>;
}): CandidateVerificationReport {
  const issues = input.files.flatMap((file) =>
    STATIC_POLICY_PATTERNS.some((pattern) => pattern.test(file.content))
      ? [issue('VERIFICATION_FORBIDDEN_STATIC_PATTERN', `Candidate file ${file.path} violates static policy.`, 'static_policy', file.path)]
      : []
  );
  return buildCandidateVerificationReport({
    context: input.context,
    stageId: 'static_policy',
    status: issues.length === 0 ? 'PASSED' : 'FAILED',
    issues,
    evidenceRefs: ['candidate_static_policy_report.json']
  });
}

export function buildMutationVerificationReport(input: {
  context: CandidateVerificationContext;
  mutations: ReadonlyArray<{ mutationId: string; killed: boolean }>;
}): CandidateVerificationReport {
  const issues = [
    ...(input.mutations.length > 0
      ? []
      : [issue('VERIFICATION_MUTATION_COVERAGE_MISSING', 'Mutation suite must include at least one semantic mutation.', 'mutation_tests')]),
    ...input.mutations.flatMap((mutation) =>
      mutation.killed
        ? []
        : [issue('VERIFICATION_MUTATION_SURVIVED', `Mutation ${mutation.mutationId} survived external QA.`, 'mutation_tests')]
    )
  ];
  return buildCandidateVerificationReport({
    context: input.context,
    stageId: 'mutation_tests',
    status: issues.length === 0 ? 'PASSED' : 'FAILED',
    issues,
    evidenceRefs: ['candidate_mutation_test_report.json']
  });
}

export function buildPerformanceVerificationReport(input: {
  context: CandidateVerificationContext;
  averageUpdateMs: number;
  p95UpdateMs: number;
  peakEntities: number;
  peakEventRate: number;
  memoryDeltaBytes: number;
  bundleBytes: number;
  startupMs: number;
  limits: {
    averageUpdateMs: number;
    p95UpdateMs: number;
    peakEntities: number;
    peakEventRate: number;
    memoryDeltaBytes: number;
    bundleBytes: number;
    startupMs: number;
  };
}): CandidateVerificationReport {
  const metrics = [
    input.averageUpdateMs,
    input.p95UpdateMs,
    input.peakEntities,
    input.peakEventRate,
    input.memoryDeltaBytes,
    input.bundleBytes,
    input.startupMs
  ];
  const evidenceMissing = metrics.some((value) => !Number.isFinite(value) || value < 0);
  const exceeded = input.averageUpdateMs > input.limits.averageUpdateMs ||
    input.p95UpdateMs > input.limits.p95UpdateMs ||
    input.peakEntities > input.limits.peakEntities ||
    input.peakEventRate > input.limits.peakEventRate ||
    input.memoryDeltaBytes > input.limits.memoryDeltaBytes ||
    input.bundleBytes > input.limits.bundleBytes ||
    input.startupMs > input.limits.startupMs;
  const issues = [
    ...(evidenceMissing
      ? [issue('VERIFICATION_PERFORMANCE_EVIDENCE_MISSING', 'Performance report is missing a required metric.', 'performance')]
      : []),
    ...(exceeded
      ? [issue('VERIFICATION_PERFORMANCE_BUDGET_EXCEEDED', 'Candidate exceeded performance hard ceiling.', 'performance')]
      : [])
  ];
  return buildCandidateVerificationReport({
    context: input.context,
    stageId: 'performance',
    status: issues.length === 0 ? 'PASSED' : 'FAILED',
    issues,
    evidenceRefs: ['candidate_performance_report.json']
  });
}

export function buildTeardownVerificationReport(input: {
  context: CandidateVerificationContext;
  duplicateListeners: boolean;
  retainedEntityRefs: boolean;
  schedulerLeaks: boolean;
  telemetryDuplicated: boolean;
  baselineRestored: boolean;
}): CandidateVerificationReport {
  const leaked = input.duplicateListeners ||
    input.retainedEntityRefs ||
    input.schedulerLeaks ||
    input.telemetryDuplicated ||
    !input.baselineRestored;
  const issues = leaked ? [issue('VERIFICATION_TEARDOWN_LEAK', 'Candidate teardown left retained runtime state.', 'teardown')] : [];
  return buildCandidateVerificationReport({
    context: input.context,
    stageId: 'teardown',
    status: issues.length === 0 ? 'PASSED' : 'FAILED',
    issues,
    evidenceRefs: ['candidate_teardown_report.json']
  });
}

export function buildProfileCanaryVerificationReport(input: {
  context: CandidateVerificationContext;
  profiles: ReadonlyArray<{
    profileId: string;
    role: 'reference_candidate_enabled' | 'reference_candidate_disabled' | 'unrelated_profile' | 'requesting_project_candidate';
    regressed: boolean;
  }>;
}): CandidateVerificationReport {
  const roles = new Set(input.profiles.map((profile) => profile.role));
  const requiredRoles = ['reference_candidate_enabled', 'reference_candidate_disabled', 'unrelated_profile', 'requesting_project_candidate'] as const;
  const issues = [
    ...requiredRoles.flatMap((role) =>
      roles.has(role)
        ? []
        : [issue('VERIFICATION_PROFILE_CANARY_COVERAGE_MISSING', `Missing profile canary role ${role}.`, 'profile_canary')]
    ),
    ...input.profiles.flatMap((profile) =>
      profile.regressed
        ? [issue('VERIFICATION_PROFILE_CANARY_REGRESSION', `Profile ${profile.profileId} regressed under candidate canary.`, 'profile_canary')]
        : []
    )
  ];
  return buildCandidateVerificationReport({
    context: input.context,
    stageId: 'profile_canary',
    status: issues.length === 0 ? 'PASSED' : 'FAILED',
    issues,
    evidenceRefs: ['candidate_profile_canary_report.json']
  });
}

function reportIssues(
  report: CandidateVerificationReport,
  context: CandidateVerificationContext,
  receipt: CandidateVerificationReportReceipt | undefined,
  receiptRef: CandidateVerificationReportReceipt['trustedArtifactRef'] | undefined
): CandidateVerificationIssue[] {
  return [
    ...verificationReceiptIssues(report, context, receipt, receiptRef),
    ...(report.reportHash === recomputeReportHash(report)
      ? []
      : [issue('VERIFICATION_REPORT_HASH_MISMATCH', `Report ${report.stageId} hash mismatch.`, report.stageId)]),
    ...(hashStableJson(report.context) === hashStableJson(context)
      ? []
      : [issue('VERIFICATION_REPORT_CONTEXT_MISMATCH', `Report ${report.stageId} context mismatch.`, report.stageId)]),
    ...(report.candidateControlled === true
      ? [issue('VERIFICATION_REPORT_CANDIDATE_CONTROLLED', `Report ${report.stageId} is candidate-controlled.`, report.stageId)]
      : []),
    ...(report.status === 'PASSED'
      ? []
      : [statusIssue(report)]),
    ...report.issues
  ];
}

function verificationReportReceiptSubject(report: CandidateVerificationReport): CandidateVerificationReportReceiptSubject {
  return {
    requestId: report.context.requestId,
    attemptId: report.context.attemptId,
    packageId: report.context.packageId,
    stageId: report.stageId,
    reportHash: report.reportHash,
    reportContextHash: hashStableJson(report.context),
    specificationHash: report.context.specificationHash,
    decisionContextHash: report.context.decisionContextHash,
    policyDecisionReceiptHash: report.context.policyDecisionReceiptHash,
    sourceManifestHash: report.context.sourceManifestHash,
    candidateSourceManifestHash: report.context.candidateSourceManifestHash,
    scaffoldReportHash: report.context.scaffoldReportHash,
    allowedFileMapHash: report.context.allowedFileMapHash,
    generatedTestManifestHash: report.context.generatedTestManifestHash,
    externalTestManifestHash: report.context.externalTestManifestHash,
    registrySnapshotHash: report.context.registrySnapshotHash
  };
}

function resolveTrustedVerificationReceipts(input: {
  verificationReportReceiptRefs?: readonly CandidateVerificationReportReceipt['trustedArtifactRef'][];
  trustedVerificationReportStore?: CandidateVerificationReportReceiptResolver;
}): Map<CandidateVerificationStageId, { ref: CandidateVerificationReportReceipt['trustedArtifactRef']; receipt: CandidateVerificationReportReceipt }> {
  const resolved = new Map<CandidateVerificationStageId, { ref: CandidateVerificationReportReceipt['trustedArtifactRef']; receipt: CandidateVerificationReportReceipt }>();
  if (
    input.trustedVerificationReportStore === undefined ||
    input.trustedVerificationReportStore.namespace !== CANDIDATE_VERIFICATION_REPORT_TRUSTED_NAMESPACE
  ) {
    return resolved;
  }
  for (const ref of input.verificationReportReceiptRefs ?? []) {
    const receipt = input.trustedVerificationReportStore.resolveReceipt(ref);
    if (receipt !== undefined) {
      resolved.set(receipt.subject.stageId, { ref, receipt });
    }
  }
  return resolved;
}

function verificationReceiptIssues(
  report: CandidateVerificationReport,
  context: CandidateVerificationContext,
  receipt: CandidateVerificationReportReceipt | undefined,
  receiptRef: CandidateVerificationReportReceipt['trustedArtifactRef'] | undefined
): CandidateVerificationIssue[] {
  if (receipt === undefined || receiptRef === undefined) {
    return [issue('VERIFICATION_REPORT_RECEIPT_MISSING', `Missing trusted verification receipt for ${report.stageId}.`, report.stageId)];
  }
  return [
    ...(receipt.artifactKind === CANDIDATE_VERIFICATION_REPORT_RECEIPT_KIND &&
    receipt.schemaVersion === CANDIDATE_VERIFICATION_SCHEMA_VERSION &&
    receipt.trustedArtifactRef.namespace === CANDIDATE_VERIFICATION_REPORT_TRUSTED_NAMESPACE &&
    receipt.trustedArtifactRef.artifactKind === CANDIDATE_VERIFICATION_REPORT_RECEIPT_KIND &&
    receipt.trustedArtifactRef.artifactId === receipt.receiptId &&
    sameTrustedArtifactRef(receipt.trustedArtifactRef, receiptRef) &&
    TRUSTED_CANDIDATE_VERIFICATION_ISSUERS.has(receipt.issuer.serviceId)
      ? []
      : [issue('VERIFICATION_REPORT_RECEIPT_PROVENANCE_INVALID', `Verification receipt provenance is invalid for ${report.stageId}.`, report.stageId)]),
    ...(receipt.receiptHash === recomputeReceiptHash(receipt)
      ? []
      : [issue('VERIFICATION_REPORT_RECEIPT_HASH_MISMATCH', `Verification receipt hash mismatch for ${report.stageId}.`, report.stageId)]),
    ...(hashStableJson(receipt.subject) === hashStableJson(verificationReportReceiptSubject(report)) &&
    receipt.subject.reportContextHash === hashStableJson(context)
      ? []
      : [issue('VERIFICATION_REPORT_RECEIPT_CONTEXT_MISMATCH', `Verification receipt is not bound to report ${report.stageId}.`, report.stageId)])
  ];
}

function sourceArtifactIntegrityIssues(input: {
  context: CandidateVerificationContext;
  allowedFileMap: CapabilityScaffoldAllowedFileMap;
  candidateSourceManifest: CandidateSourceManifest;
  sourcePolicyPrecheck: CandidateSourcePolicyPrecheck;
  sourceProvenance: CandidateSourceProvenance;
  stagedCandidateFiles: ReadonlyArray<{ path: string; contentHash: string }>;
}): CandidateVerificationIssue[] {
  const stagedByPath = new Map(input.stagedCandidateFiles.map((file) => [file.path, file]));
  const manifestPaths = new Set(input.candidateSourceManifest.files.map((file) => file.path));
  const writablePaths = new Set(input.allowedFileMap.files.filter((file) => file.classification === 'writable_by_model').map((file) => file.path));
  const issues: CandidateVerificationIssue[] = [
    ...(input.allowedFileMap.allowedFileMapHash === recomputeAllowedFileMapHash(input.allowedFileMap) &&
    input.allowedFileMap.allowedFileMapHash === input.context.allowedFileMapHash
      ? []
      : [issue('VERIFICATION_ALLOWED_FILE_MAP_HASH_MISMATCH', 'Allowed file map hash does not match verification context.', 'source_integrity')]),
    ...(input.candidateSourceManifest.sourceManifestHash === recomputeCandidateSourceManifestHash(input.candidateSourceManifest) &&
    input.candidateSourceManifest.sourceManifestHash === input.context.candidateSourceManifestHash
      ? []
      : [issue('VERIFICATION_SOURCE_MANIFEST_HASH_MISMATCH', 'Candidate source manifest hash does not match verification context.', 'source_integrity')]),
    ...(input.sourcePolicyPrecheck.precheckHash === recomputeSourcePolicyPrecheckHash(input.sourcePolicyPrecheck)
      ? []
      : [issue('VERIFICATION_SOURCE_PRECHECK_HASH_MISMATCH', 'Candidate source precheck hash mismatch.', 'source_integrity')]),
    ...(input.sourcePolicyPrecheck.status === 'allowed' &&
    input.sourcePolicyPrecheck.filesWritten === true &&
    input.sourcePolicyPrecheck.issues.length === 0 &&
    input.sourcePolicyPrecheck.normalizedResponseHash !== undefined &&
    input.candidateSourceManifest.status === 'written'
      ? []
      : [issue('VERIFICATION_SOURCE_PRECHECK_FAILED', 'Candidate source precheck did not allow a complete all-or-nothing write.', 'source_integrity')]),
    ...(input.sourceProvenance.provenanceHash === recomputeSourceProvenanceHash(input.sourceProvenance)
      ? []
      : [issue('VERIFICATION_SOURCE_PROVENANCE_HASH_MISMATCH', 'Candidate source provenance hash mismatch.', 'source_integrity')]),
    ...(sourceContextMatchesVerificationContext(input.candidateSourceManifest.context, input.context) &&
    sourceContextMatchesVerificationContext(input.sourcePolicyPrecheck.context, input.context) &&
    sourceContextMatchesVerificationContext(input.sourceProvenance.context, input.context) &&
    input.sourceProvenance.outputHash === input.sourcePolicyPrecheck.normalizedResponseHash &&
    input.sourceProvenance.inputHashes.specificationHash === input.context.specificationHash &&
    input.sourceProvenance.inputHashes.decisionContextHash === input.context.decisionContextHash &&
    input.sourceProvenance.inputHashes.policyDecisionReceiptHash === input.context.policyDecisionReceiptHash &&
    input.sourceProvenance.inputHashes.scaffoldReportHash === input.context.scaffoldReportHash &&
    input.sourceProvenance.inputHashes.allowedFileMapHash === input.context.allowedFileMapHash &&
    input.sourceProvenance.inputHashes.initialSourceManifestHash === input.context.sourceManifestHash
      ? []
      : [issue('VERIFICATION_SOURCE_CONTEXT_MISMATCH', 'Candidate source artifacts are not bound to the verification context.', 'source_integrity')])
  ];

  for (const expected of input.candidateSourceManifest.files) {
    const staged = stagedByPath.get(expected.path);
    if (!writablePaths.has(expected.path)) {
      issues.push(issue('VERIFICATION_SOURCE_FILE_UNDECLARED', `Candidate source manifest contains non-writable path ${expected.path}.`, 'source_integrity', expected.path));
    }
    if (staged === undefined) {
      issues.push(issue('VERIFICATION_SOURCE_FILE_MISSING', `Missing candidate source file ${expected.path}.`, 'source_integrity', expected.path));
      continue;
    }
    if (staged.contentHash !== expected.contentHash) {
      issues.push(issue('VERIFICATION_SOURCE_FILE_HASH_MISMATCH', `Candidate source file ${expected.path} hash mismatch.`, 'source_integrity', expected.path));
    }
  }
  for (const writablePath of writablePaths) {
    if (!manifestPaths.has(writablePath)) {
      issues.push(issue('VERIFICATION_SOURCE_FILE_MISSING', `Required writable file ${writablePath} is missing from the candidate source manifest.`, 'source_integrity', writablePath));
    }
  }
  for (const staged of input.stagedCandidateFiles) {
    if (!manifestPaths.has(staged.path)) {
      issues.push(issue('VERIFICATION_SOURCE_FILE_UNDECLARED', `Staged candidate source file ${staged.path} is not declared in the source manifest.`, 'source_integrity', staged.path));
    }
  }
  return issues;
}

function duplicateReportIssues(reports: readonly CandidateVerificationReport[]): CandidateVerificationIssue[] {
  const seen = new Set<CandidateVerificationStageId>();
  const issues: CandidateVerificationIssue[] = [];
  for (const report of reports) {
    if (seen.has(report.stageId)) {
      issues.push(issue('VERIFICATION_REPORT_DUPLICATE_STAGE', `Duplicate verification report for ${report.stageId}.`, report.stageId));
      continue;
    }
    seen.add(report.stageId);
  }
  return issues;
}

function externalHarnessIntegrityIssues(input: {
  context: CandidateVerificationContext;
  externalTestManifest: CapabilityScaffoldExternalTestManifest;
  stagedExternalTests: ReadonlyArray<{ path: string; contentHash: string; source: 'trusted_external_harness' | 'candidate'; readOnly: boolean }>;
}): CandidateVerificationIssue[] {
  const stagedByPath = new Map(input.stagedExternalTests.map((file) => [file.path, file]));
  const issues: CandidateVerificationIssue[] = [];
  if (
    input.externalTestManifest.externalTestManifestHash !== recomputeExternalTestManifestHash(input.externalTestManifest) ||
    input.externalTestManifest.externalTestManifestHash !== input.context.externalTestManifestHash
  ) {
    issues.push(issue(
      'VERIFICATION_HARNESS_MANIFEST_HASH_MISMATCH',
      'Trusted external harness manifest hash does not match verification context.',
      'source_integrity'
    ));
  }
  for (const expected of input.externalTestManifest.files) {
    const staged = stagedByPath.get(expected.path);
    if (staged === undefined) {
      issues.push(issue('VERIFICATION_HARNESS_MISSING', `Missing trusted harness file ${expected.path}.`, 'source_integrity', expected.path));
      continue;
    }
    if (staged.source !== 'trusted_external_harness' || staged.readOnly !== true) {
      issues.push(issue('VERIFICATION_HARNESS_CANDIDATE_CONTROLLED', `Harness file ${expected.path} is candidate-controlled.`, 'source_integrity', expected.path));
    }
    if (staged.contentHash !== expected.contentHash) {
      issues.push(issue('VERIFICATION_HARNESS_HASH_MISMATCH', `Harness file ${expected.path} hash does not match trusted manifest.`, 'source_integrity', expected.path));
    }
  }
  return issues;
}

function statusIssue(report: CandidateVerificationReport): CandidateVerificationIssue {
  if (report.status === 'INCONCLUSIVE') {
    return issue('VERIFICATION_REQUIRED_REPORT_INCONCLUSIVE', `Required report ${report.stageId} is inconclusive.`, report.stageId);
  }
  if (report.status === 'SKIPPED') {
    return issue('VERIFICATION_REQUIRED_REPORT_SKIPPED', `Required report ${report.stageId} was skipped.`, report.stageId);
  }
  return issue('VERIFICATION_REQUIRED_REPORT_FAILED', `Required report ${report.stageId} failed.`, report.stageId);
}

function requiredVerificationStages(renderRequired: boolean): CandidateVerificationStageId[] {
  return CANDIDATE_VERIFICATION_STAGES.filter((stage) => renderRequired || stage !== 'render_fidelity');
}

function recomputeReportHash(report: CandidateVerificationReport): string {
  const { reportHash: _reportHash, ...payload } = report;
  return hashStableJson(payload);
}

function recomputeExternalTestManifestHash(manifest: CapabilityScaffoldExternalTestManifest): string {
  const { externalTestManifestHash: _externalTestManifestHash, ...payload } = manifest;
  return hashStableJson(payload);
}

function recomputeReceiptHash(receipt: CandidateVerificationReportReceipt): string {
  const { receiptHash: _receiptHash, ...payload } = receipt;
  return hashStableJson(payload);
}

function recomputeAllowedFileMapHash(allowedFileMap: CapabilityScaffoldAllowedFileMap): string {
  const { allowedFileMapHash: _allowedFileMapHash, ...payload } = allowedFileMap;
  return hashStableJson(payload);
}

function recomputeCandidateSourceManifestHash(manifest: CandidateSourceManifest): string {
  const { sourceManifestHash: _sourceManifestHash, ...payload } = manifest;
  return hashStableJson(payload);
}

function recomputeSourcePolicyPrecheckHash(precheck: CandidateSourcePolicyPrecheck): string {
  const { precheckHash: _precheckHash, ...payload } = precheck;
  return hashStableJson(payload);
}

function recomputeSourceProvenanceHash(provenance: CandidateSourceProvenance): string {
  const { provenanceHash: _provenanceHash, ...payload } = provenance;
  return hashStableJson(payload);
}

function sourceContextMatchesVerificationContext(
  sourceContext: CandidateSourceManifest['context'],
  context: CandidateVerificationContext
): boolean {
  return sourceContext.requestId === context.requestId &&
    sourceContext.attemptId === context.attemptId &&
    sourceContext.specificationHash === context.specificationHash &&
    sourceContext.decisionContextHash === context.decisionContextHash &&
    sourceContext.policyDecisionReceiptHash === context.policyDecisionReceiptHash &&
    sourceContext.scaffoldReportHash === context.scaffoldReportHash &&
    sourceContext.allowedFileMapHash === context.allowedFileMapHash &&
    sourceContext.initialSourceManifestHash === context.sourceManifestHash;
}

function sameTrustedArtifactRef(
  left: CandidateVerificationReportReceipt['trustedArtifactRef'],
  right: CandidateVerificationReportReceipt['trustedArtifactRef']
): boolean {
  return left.namespace === right.namespace &&
    left.artifactKind === right.artifactKind &&
    left.artifactId === right.artifactId;
}

function stageOrder(stageId: CandidateVerificationStageId): number {
  return CANDIDATE_VERIFICATION_STAGES.indexOf(stageId);
}

function issue(
  code: CandidateVerificationIssue['code'],
  message: string,
  stageId?: CandidateVerificationStageId,
  path?: string
): CandidateVerificationIssue {
  return { code, message, ...(stageId === undefined ? {} : { stageId }), ...(path === undefined ? {} : { path }) };
}

function compareIssues(left: CandidateVerificationIssue, right: CandidateVerificationIssue): number {
  return `${left.stageId ?? ''}:${left.code}:${left.path ?? ''}`.localeCompare(`${right.stageId ?? ''}:${right.code}:${right.path ?? ''}`);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort();
}

const STATIC_POLICY_PATTERNS = [
  /\bfrom\s+['"]node:/,
  /\bfrom\s+['"](fs|path|child_process|worker_threads|crypto)['"]/,
  /\bimport\s+['"](?![./])[^'"]+['"]/,
  /\bfrom\s+['"](?![./])[^'"]+['"]/,
  /\brequire\s*\(/,
  /\bimport\s*\(/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bWorker\b/,
  /\bWebAssembly\b/,
  /\bprocess\.env\b/,
  /\b(window|document|globalThis|navigator|localStorage|sessionStorage|indexedDB)\b/,
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  /\bDate\s*\(/,
  /\bDate\.now\s*\(/,
  /\bMath\.random\s*\(/,
  /\bperformance\.now\s*\(/,
  /\bcrypto\.(getRandomValues|randomUUID|subtle)\b/,
  /\bwhile\s*\(\s*true\s*\)/,
  /\bfor\s*\(\s*;\s*;\s*\)/,
  /\bObject\.defineProperty\s*\(\s*(globalThis|window|document|Object\.prototype|Array\.prototype)/,
  /\bprototype\b/,
  /catch\s*(?:\([^)]*\))?\s*\{\s*\}/,
  /@ts-ignore/,
  /eslint-disable/,
  /:\s*any\b/,
  /\bArray\s*<\s*any\s*>/,
  /\bRecord\s*<\s*string\s*,\s*any\s*>/,
  /\bas\s+unknown\s+as\b/,
  /\bas\s+any\b/,
  /<[^>\n]*\bany\b[^>\n]*>/,
  /\w+!\./,
  /\bPhaser\./,
  /\bscene\.add\b/,
  /\bscene\.tweens\b/,
  /\bscene\.cameras\b/,
  /\bscene\.physics\b/,
  /\bthis\.(add|physics|scene|game|tweens|cameras)\b/
];
