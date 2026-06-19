import { hashStableJson } from '../gameplay-capabilities/stable-json.js';
import {
  buildCapabilitySynthesisAttemptId,
  isCapabilitySynthesisAttemptIdForRequest,
  parseCapabilitySynthesisAttemptId
} from './request-id.js';

export const CAPABILITY_REPAIR_SCHEMA_VERSION = 'step36.capability-repair.v1';
export const CAPABILITY_REPAIR_REQUEST_KIND = 'capability_repair_request';
export const CAPABILITY_REPAIR_MODEL_INPUT_KIND = 'capability_repair_model_input';
export const CANDIDATE_SOURCE_DIFF_KIND = 'candidate_source_diff';
export const CAPABILITY_REPAIR_SCOPE_REPORT_KIND = 'capability_repair_scope_report';
export const CAPABILITY_REPAIR_INVALIDATION_REPORT_KIND = 'capability_repair_invalidation_report';
export const CAPABILITY_REPAIR_ATTEMPT_LINEAGE_KIND = 'capability_repair_attempt_lineage';
export const CAPABILITY_REPAIR_RERUN_GATE_KIND = 'capability_repair_rerun_gate';

export const CAPABILITY_REPAIR_ELIGIBLE_DIAGNOSTICS = [
  'SCHEMA_MISMATCH',
  'TYPE_ERROR',
  'PURE_CONTRACT_TEST_FAILURE',
  'BOUNDED_RUNTIME_ASSERTION_FAILURE',
  'MISSING_DIAGNOSTIC_MAPPING',
  'FORMATTING_OR_LINT_POLICY'
] as const;

export const CAPABILITY_REPAIR_DENYLISTED_DIAGNOSTICS = [
  'RISK_TIER_INCREASE_REQUIRED',
  'NEW_DEPENDENCY_REQUIRED',
  'NEW_RUNTIME_SERVICE_REQUIRED',
  'SANDBOX_VIOLATION',
  'FORBIDDEN_API_ATTEMPT',
  'OWNERSHIP_CONFLICT_ARCHITECTURE_CHANGE',
  'SECURITY_REVIEWER_REJECTION',
  'SPEC_SEMANTIC_CONTRADICTION',
  'VALIDATION_OR_POLICY_PROVENANCE_MISMATCH',
  'VERIFICATION_RECEIPT_MISSING_OR_MISMATCH',
  'VERIFICATION_BUNDLE_PROVENANCE_MISMATCH',
  'CANDIDATE_CONTROLLED_VERIFICATION_REPORT',
  'DUPLICATE_TRUSTED_VERIFICATION_REPORT',
  'SOURCE_MANIFEST_OR_ALLOWED_MAP_TAMPER',
  'EXTERNAL_HARNESS_TAMPER'
] as const;

export type CapabilityRepairEligibleDiagnostic = (typeof CAPABILITY_REPAIR_ELIGIBLE_DIAGNOSTICS)[number];
export type CapabilityRepairDenylistedDiagnostic = (typeof CAPABILITY_REPAIR_DENYLISTED_DIAGNOSTICS)[number];
export type CapabilityRepairDiagnosticClassification =
  | CapabilityRepairEligibleDiagnostic
  | CapabilityRepairDenylistedDiagnostic
  | 'UNKNOWN_DIAGNOSTIC'
  | 'UNMAPPED_VERIFICATION_FAILURE';

export type CapabilityRepairContext = {
  requestId: string;
  currentAttemptId: string;
  currentAttemptNumber: number;
  parentAttemptId?: string;
  parentSourceManifestHash: string;
  specificationHash: string;
  policyDecisionReceiptHash: string;
  decisionContextHash: string;
  allowedFileMapHash: string;
  previousSourceManifestHash: string;
  previousSourceProvenanceHash: string;
  verificationBundleHash: string;
  registrySnapshotHash: string;
  activeCapabilityLockHash?: string;
};

export type CapabilityRepairDiagnostic = {
  code: string;
  classification: CapabilityRepairDiagnosticClassification;
  stageId: string;
  message: string;
  path?: string;
  assertionId?: string;
};

export type CapabilityRepairIssue = {
  code:
    | 'REPAIR_DIAGNOSTICS_MISSING'
    | 'REPAIR_ATTEMPT_ID_INVALID'
    | 'REPAIR_ATTEMPT_NUMBER_MISMATCH'
    | 'REPAIR_ATTEMPT_LIMIT_EXCEEDED'
    | 'REPAIR_DIAGNOSTIC_DENYLISTED'
    | 'REPAIR_DIAGNOSTIC_UNKNOWN'
    | 'REPAIR_DIAGNOSTIC_NOT_ALLOWLISTED'
    | 'REPAIR_DIAGNOSTIC_MAPPING_CANDIDATE_SOURCE_FORBIDDEN'
    | 'REPAIR_CONTEXT_BINDING_MISSING'
    | 'REPAIR_SCOPE_DRIFT'
    | 'REPAIR_PROMPT_SENSITIVE_DATA'
    | 'REPAIR_RERUN_LINEAGE_MISSING'
    | 'REPAIR_RERUN_LINEAGE_MISMATCH'
    | 'REPAIR_RERUN_CANDIDATE_HASH_MISSING'
    | 'REPAIR_RERUN_CANDIDATE_HASH_REUSED'
    | 'REPAIR_RERUN_REGISTRY_MISMATCH'
    | 'REPAIR_INVALIDATION_PREVIOUS_VERIFICATION_MISSING'
    | 'REPAIR_LINEAGE_INPUT_INVALID'
    | 'REPAIR_ACTIVE_LOCK_DRIFT';
  message: string;
  path?: string;
};

export type CapabilityRepairRequest = {
  artifactKind: typeof CAPABILITY_REPAIR_REQUEST_KIND;
  schemaVersion: typeof CAPABILITY_REPAIR_SCHEMA_VERSION;
  status: 'created' | 'blocked';
  requestId: string;
  currentAttemptId: string;
  currentAttemptNumber: number;
  nextAttemptId?: string;
  nextAttemptNumber?: number;
  parentAttemptId?: string;
  parentSourceManifestHash: string;
  specificationHash: string;
  policyDecisionReceiptHash: string;
  decisionContextHash: string;
  allowedFileMapHash: string;
  previousSourceManifestHash: string;
  previousSourceProvenanceHash: string;
  verificationBundleHash: string;
  registrySnapshotHash: string;
  activeCapabilityLockHash?: string;
  requestedChangeKind: 'candidate_source' | 'diagnostic_mapping';
  diagnostics: CapabilityRepairDiagnostic[];
  modelInvocationAllowed: boolean;
  nextState: 'REPAIRING' | 'FAILED' | 'QUARANTINED';
  issues: CapabilityRepairIssue[];
  repairRequestHash: string;
};

export type CapabilityRepairModelInput = {
  artifactKind: typeof CAPABILITY_REPAIR_MODEL_INPUT_KIND;
  schemaVersion: typeof CAPABILITY_REPAIR_SCHEMA_VERSION;
  status: 'ready' | 'blocked';
  repairRequestHash: string;
  requestId: string;
  attemptId: string;
  allowedWritablePaths: string[];
  sanitizedDiagnostics: CapabilityRepairDiagnostic[];
  previousSourceManifestHash: string;
  promptRules: string[];
  hiddenExternalHarnessIncluded: false;
  modelInvocationAllowed: boolean;
  issues: CapabilityRepairIssue[];
  modelInputHash: string;
};

export type CandidateRepairSourceDiff = {
  artifactKind: typeof CANDIDATE_SOURCE_DIFF_KIND;
  schemaVersion: typeof CAPABILITY_REPAIR_SCHEMA_VERSION;
  requestId: string;
  parentAttemptId: string;
  nextAttemptId: string;
  changedFiles: Array<{ path: string; beforeHash?: string; afterHash: string }>;
  sourceDiffHash: string;
};

export type CapabilityRepairScopeSnapshot = {
  writablePaths: string[];
  approvedImports: string[];
  dependencies: string[];
  runtimeServices: string[];
  dslOwnedPaths: string[];
  irNodeKinds: string[];
  publicInterfaces: string[];
  privileges: string[];
  budgets: {
    maxStateEntries: number;
    maxEventRate: number;
    maxUpdateMs: number;
  };
};

export type CapabilityRepairScopeCandidate = Omit<CapabilityRepairScopeSnapshot, 'writablePaths' | 'approvedImports'> & {
  changedFiles: string[];
  imports: string[];
  touchedTrustedPaths?: string[];
};

export type CapabilityRepairScopeReport = {
  artifactKind: typeof CAPABILITY_REPAIR_SCOPE_REPORT_KIND;
  schemaVersion: typeof CAPABILITY_REPAIR_SCHEMA_VERSION;
  status: 'allowed' | 'blocked';
  requestId: string;
  attemptId: string;
  issues: CapabilityRepairIssue[];
  scopeReportHash: string;
};

export type CapabilityRepairInvalidationReport = {
  artifactKind: typeof CAPABILITY_REPAIR_INVALIDATION_REPORT_KIND;
  schemaVersion: typeof CAPABILITY_REPAIR_SCHEMA_VERSION;
  status: 'valid' | 'invalid';
  requestId: string;
  parentAttemptId: string;
  nextAttemptId: string;
  sourceChanged: boolean;
  invalidatedHashes: {
    previousVerificationBundleHash?: string;
    previousOracleReviewHash?: string;
    previousHumanApprovalHash?: string;
    previousInstallPlanHash?: string;
    previousCanaryPlanHash?: string;
  };
  issues: CapabilityRepairIssue[];
  invalidationHash: string;
};

export type CapabilityRepairAttemptLineage = {
  artifactKind: typeof CAPABILITY_REPAIR_ATTEMPT_LINEAGE_KIND;
  schemaVersion: typeof CAPABILITY_REPAIR_SCHEMA_VERSION;
  status: 'valid' | 'invalid';
  requestId: string;
  attemptId: string;
  parentAttemptId: string;
  repairAttemptNumber: number;
  parentSourceManifestHash: string;
  repairRequestHash: string;
  sourceDiffHash: string;
  scopeReportHash: string;
  invalidationReportHash: string;
  registrySnapshotHash: string;
  activeCapabilityLockHash?: string;
  issues: CapabilityRepairIssue[];
  lineageHash: string;
};

export type CapabilityRepairRerunGateReport = {
  artifactKind: typeof CAPABILITY_REPAIR_RERUN_GATE_KIND;
  schemaVersion: typeof CAPABILITY_REPAIR_SCHEMA_VERSION;
  status: 'allowed' | 'blocked';
  requestId: string;
  attemptId: string;
  fromState: 'REPAIRING';
  toState: 'STATIC_VALIDATING';
  issues: CapabilityRepairIssue[];
  rerunGateHash: string;
};

export function buildCapabilityRepairRequest(input: {
  context: CapabilityRepairContext;
  diagnostics: readonly CapabilityRepairDiagnostic[];
  requestedChangeKind: CapabilityRepairRequest['requestedChangeKind'];
  maxRepairAttempts?: number;
  activeCapabilityLockHash?: string;
}): CapabilityRepairRequest {
  const nextAttemptNumber = input.context.currentAttemptNumber + 1;
  const nextAttemptId = buildNextAttemptId(input.context.requestId, nextAttemptNumber);
  const issues = [
    ...contextIssues(input.context, input.activeCapabilityLockHash),
    ...repairLimitIssues(input.context.currentAttemptNumber, input.maxRepairAttempts ?? 2),
    ...diagnosticEligibilityIssues(input.diagnostics, input.requestedChangeKind)
  ].sort(compareIssues);
  const blocked = issues.length > 0;
  const payload: Omit<CapabilityRepairRequest, 'repairRequestHash'> = {
    artifactKind: CAPABILITY_REPAIR_REQUEST_KIND,
    schemaVersion: CAPABILITY_REPAIR_SCHEMA_VERSION,
    status: blocked ? 'blocked' : 'created',
    requestId: input.context.requestId,
    currentAttemptId: input.context.currentAttemptId,
    currentAttemptNumber: input.context.currentAttemptNumber,
    ...(blocked ? {} : { nextAttemptId, nextAttemptNumber }),
    ...(input.context.parentAttemptId === undefined ? {} : { parentAttemptId: input.context.parentAttemptId }),
    parentSourceManifestHash: input.context.parentSourceManifestHash,
    specificationHash: input.context.specificationHash,
    policyDecisionReceiptHash: input.context.policyDecisionReceiptHash,
    decisionContextHash: input.context.decisionContextHash,
    allowedFileMapHash: input.context.allowedFileMapHash,
    previousSourceManifestHash: input.context.previousSourceManifestHash,
    previousSourceProvenanceHash: input.context.previousSourceProvenanceHash,
    verificationBundleHash: input.context.verificationBundleHash,
    registrySnapshotHash: input.context.registrySnapshotHash,
    ...(input.context.activeCapabilityLockHash === undefined ? {} : { activeCapabilityLockHash: input.context.activeCapabilityLockHash }),
    requestedChangeKind: input.requestedChangeKind,
    diagnostics: sortDiagnostics(input.diagnostics),
    modelInvocationAllowed: !blocked && input.requestedChangeKind === 'candidate_source',
    nextState: blocked ? blockedNextState(issues) : 'REPAIRING',
    issues
  };
  return { ...payload, repairRequestHash: hashStableJson(payload) };
}

export function buildCapabilityRepairModelInput(input: {
  repairRequest: CapabilityRepairRequest;
  allowedWritablePaths: readonly string[];
  includeHiddenExternalHarness?: boolean;
}): CapabilityRepairModelInput {
  const sanitizedDiagnostics = input.repairRequest.diagnostics.map((diagnostic) => ({
    ...diagnostic,
    message: sanitizeDiagnosticText(diagnostic.message),
    ...(diagnostic.path === undefined ? {} : { path: sanitizeDiagnosticText(diagnostic.path) })
  }));
  const issues = [
    ...(input.repairRequest.modelInvocationAllowed ? [] : [issue('REPAIR_DIAGNOSTIC_NOT_ALLOWLISTED', 'Repair request does not allow model invocation.')]),
    ...(input.includeHiddenExternalHarness === true ? [issue('REPAIR_PROMPT_SENSITIVE_DATA', 'Repair model input cannot include hidden external harness source.')] : []),
    ...sanitizedDiagnostics.flatMap((diagnostic) =>
      containsSensitiveText(diagnostic.message) || (diagnostic.path !== undefined && containsSensitiveText(diagnostic.path))
        ? [issue('REPAIR_PROMPT_SENSITIVE_DATA', 'Repair diagnostic contains sensitive data after sanitization.', diagnostic.path)]
        : []
    )
  ].sort(compareIssues);
  const modelInvocationAllowed = input.repairRequest.modelInvocationAllowed && issues.length === 0;
  const payload: Omit<CapabilityRepairModelInput, 'modelInputHash'> = {
    artifactKind: CAPABILITY_REPAIR_MODEL_INPUT_KIND,
    schemaVersion: CAPABILITY_REPAIR_SCHEMA_VERSION,
    status: modelInvocationAllowed ? 'ready' : 'blocked',
    repairRequestHash: input.repairRequest.repairRequestHash,
    requestId: input.repairRequest.requestId,
    attemptId: input.repairRequest.nextAttemptId ?? '',
    allowedWritablePaths: uniqueStrings(input.allowedWritablePaths),
    sanitizedDiagnostics: sortDiagnostics(sanitizedDiagnostics),
    previousSourceManifestHash: input.repairRequest.previousSourceManifestHash,
    promptRules: [
      'Do not add files, imports, dependencies, privileges, runtime services, behaviors or requirements.',
      'Do not modify tests, manifests, policy, build configuration, approval, verification or registry artifacts.',
      'Return complete replacements only for allowed writable files required by the diagnostics.'
    ],
    hiddenExternalHarnessIncluded: false,
    modelInvocationAllowed,
    issues
  };
  return { ...payload, modelInputHash: hashStableJson(payload) };
}

export function buildCandidateRepairSourceDiff(input: {
  requestId: string;
  parentAttemptId: string;
  nextAttemptId: string;
  changedFiles: ReadonlyArray<{ path: string; beforeHash?: string; afterHash: string }>;
}): CandidateRepairSourceDiff {
  const payload: Omit<CandidateRepairSourceDiff, 'sourceDiffHash'> = {
    artifactKind: CANDIDATE_SOURCE_DIFF_KIND,
    schemaVersion: CAPABILITY_REPAIR_SCHEMA_VERSION,
    requestId: input.requestId,
    parentAttemptId: input.parentAttemptId,
    nextAttemptId: input.nextAttemptId,
    changedFiles: [...input.changedFiles]
      .map((file) => ({
        path: normalizePath(file.path),
        ...(file.beforeHash === undefined ? {} : { beforeHash: file.beforeHash }),
        afterHash: file.afterHash
      }))
      .sort((left, right) => left.path.localeCompare(right.path))
  };
  return { ...payload, sourceDiffHash: hashStableJson(payload) };
}

export function buildCapabilityRepairScopeReport(input: {
  requestId: string;
  attemptId: string;
  baseline: CapabilityRepairScopeSnapshot;
  candidate: CapabilityRepairScopeCandidate;
}): CapabilityRepairScopeReport {
  const issues = scopeIssues(input.baseline, input.candidate).sort(compareIssues);
  const payload: Omit<CapabilityRepairScopeReport, 'scopeReportHash'> = {
    artifactKind: CAPABILITY_REPAIR_SCOPE_REPORT_KIND,
    schemaVersion: CAPABILITY_REPAIR_SCHEMA_VERSION,
    status: issues.length === 0 ? 'allowed' : 'blocked',
    requestId: input.requestId,
    attemptId: input.attemptId,
    issues
  };
  return { ...payload, scopeReportHash: hashStableJson(payload) };
}

export function buildCapabilityRepairInvalidationReport(input: {
  requestId: string;
  parentAttemptId: string;
  nextAttemptId: string;
  sourceChanged: boolean;
  previousVerificationBundleHash?: string;
  previousOracleReviewHash?: string;
  previousHumanApprovalHash?: string;
  previousInstallPlanHash?: string;
  previousCanaryPlanHash?: string;
}): CapabilityRepairInvalidationReport {
  const issues = input.sourceChanged && input.previousVerificationBundleHash === undefined
    ? [issue('REPAIR_INVALIDATION_PREVIOUS_VERIFICATION_MISSING', 'Source-changing repair must invalidate the previous verification bundle hash.')]
    : [];
  const payload: Omit<CapabilityRepairInvalidationReport, 'invalidationHash'> = {
    artifactKind: CAPABILITY_REPAIR_INVALIDATION_REPORT_KIND,
    schemaVersion: CAPABILITY_REPAIR_SCHEMA_VERSION,
    status: issues.length === 0 ? 'valid' : 'invalid',
    requestId: input.requestId,
    parentAttemptId: input.parentAttemptId,
    nextAttemptId: input.nextAttemptId,
    sourceChanged: input.sourceChanged,
    invalidatedHashes: input.sourceChanged
      ? {
          ...(input.previousVerificationBundleHash === undefined ? {} : { previousVerificationBundleHash: input.previousVerificationBundleHash }),
          ...(input.previousOracleReviewHash === undefined ? {} : { previousOracleReviewHash: input.previousOracleReviewHash }),
          ...(input.previousHumanApprovalHash === undefined ? {} : { previousHumanApprovalHash: input.previousHumanApprovalHash }),
          ...(input.previousInstallPlanHash === undefined ? {} : { previousInstallPlanHash: input.previousInstallPlanHash }),
          ...(input.previousCanaryPlanHash === undefined ? {} : { previousCanaryPlanHash: input.previousCanaryPlanHash })
        }
      : {},
    issues
  };
  return { ...payload, invalidationHash: hashStableJson(payload) };
}

export function buildCapabilityRepairAttemptLineage(input: {
  repairRequest: CapabilityRepairRequest;
  sourceDiff: CandidateRepairSourceDiff;
  scopeReport: CapabilityRepairScopeReport;
  invalidationReport: CapabilityRepairInvalidationReport;
}): CapabilityRepairAttemptLineage {
  const issues = lineageInputIssues(input).sort(compareIssues);
  const payload: Omit<CapabilityRepairAttemptLineage, 'lineageHash'> = {
    artifactKind: CAPABILITY_REPAIR_ATTEMPT_LINEAGE_KIND,
    schemaVersion: CAPABILITY_REPAIR_SCHEMA_VERSION,
    status: issues.length === 0 ? 'valid' : 'invalid',
    requestId: input.repairRequest.requestId,
    attemptId: input.repairRequest.nextAttemptId ?? '',
    parentAttemptId: input.repairRequest.currentAttemptId,
    repairAttemptNumber: input.repairRequest.nextAttemptNumber ?? 0,
    parentSourceManifestHash: input.repairRequest.parentSourceManifestHash,
    repairRequestHash: input.repairRequest.repairRequestHash,
    sourceDiffHash: input.sourceDiff.sourceDiffHash,
    scopeReportHash: input.scopeReport.scopeReportHash,
    invalidationReportHash: input.invalidationReport.invalidationHash,
    registrySnapshotHash: input.repairRequest.registrySnapshotHash,
    ...(input.repairRequest.activeCapabilityLockHash === undefined ? {} : { activeCapabilityLockHash: input.repairRequest.activeCapabilityLockHash }),
    issues
  };
  return { ...payload, lineageHash: hashStableJson(payload) };
}

export function buildCapabilityRepairRerunGateReport(input: {
  requestId: string;
  attemptId: string;
  lineage: CapabilityRepairAttemptLineage;
  candidateHash?: string;
  registrySnapshotHash: string;
  expectedRegistrySnapshotHash: string;
  evidenceRefs: readonly string[];
}): CapabilityRepairRerunGateReport {
  const issues = [
    ...(input.evidenceRefs.includes(input.lineage.lineageHash) ? [] : [issue('REPAIR_RERUN_LINEAGE_MISSING', 'Rerun gate requires repair lineage evidence.')]),
    ...(input.lineage.status === 'valid' &&
    input.lineage.lineageHash === recomputeLineageHash(input.lineage) &&
    input.lineage.requestId === input.requestId &&
    input.lineage.attemptId === input.attemptId
      ? []
      : [issue('REPAIR_RERUN_LINEAGE_MISMATCH', 'Rerun gate lineage is not bound to request and attempt.')]),
    ...(input.candidateHash === undefined || input.candidateHash.length === 0 ? [issue('REPAIR_RERUN_CANDIDATE_HASH_MISSING', 'Rerun gate requires the new candidate hash.')] : []),
    ...(input.candidateHash !== undefined && input.candidateHash === input.lineage.parentSourceManifestHash
      ? [issue('REPAIR_RERUN_CANDIDATE_HASH_REUSED', 'Rerun gate candidate hash must not reuse the parent source manifest hash.')]
      : []),
    ...(input.registrySnapshotHash === input.expectedRegistrySnapshotHash && input.registrySnapshotHash === input.lineage.registrySnapshotHash
      ? []
      : [issue('REPAIR_RERUN_REGISTRY_MISMATCH', 'Rerun gate registry snapshot does not match repair lineage.')])
  ].sort(compareIssues);
  const payload: Omit<CapabilityRepairRerunGateReport, 'rerunGateHash'> = {
    artifactKind: CAPABILITY_REPAIR_RERUN_GATE_KIND,
    schemaVersion: CAPABILITY_REPAIR_SCHEMA_VERSION,
    status: issues.length === 0 ? 'allowed' : 'blocked',
    requestId: input.requestId,
    attemptId: input.attemptId,
    fromState: 'REPAIRING',
    toState: 'STATIC_VALIDATING',
    issues
  };
  return { ...payload, rerunGateHash: hashStableJson(payload) };
}

function contextIssues(context: CapabilityRepairContext, activeCapabilityLockHash: string | undefined): CapabilityRepairIssue[] {
  const parsed = parseCapabilitySynthesisAttemptId(context.currentAttemptId);
  return [
    ...(isCapabilitySynthesisAttemptIdForRequest(context.currentAttemptId, context.requestId) ? [] : [issue('REPAIR_ATTEMPT_ID_INVALID', 'Current attempt ID does not belong to request.')]),
    ...(parsed?.attemptNumber === context.currentAttemptNumber ? [] : [issue('REPAIR_ATTEMPT_NUMBER_MISMATCH', 'Current attempt number does not match attempt ID.')]),
    ...requiredContextBindingIssues(context),
    ...(activeCapabilityLockHash === undefined || context.activeCapabilityLockHash === undefined || activeCapabilityLockHash === context.activeCapabilityLockHash
      ? []
      : [issue('REPAIR_ACTIVE_LOCK_DRIFT', 'Active capability lock drift invalidates repair request.')])
  ];
}

function requiredContextBindingIssues(context: CapabilityRepairContext): CapabilityRepairIssue[] {
  const required: Array<[keyof CapabilityRepairContext, string]> = [
    ['parentSourceManifestHash', 'parent source manifest hash'],
    ['specificationHash', 'specification hash'],
    ['policyDecisionReceiptHash', 'policy decision receipt hash'],
    ['decisionContextHash', 'decision context hash'],
    ['allowedFileMapHash', 'allowed file map hash'],
    ['previousSourceManifestHash', 'previous source manifest hash'],
    ['previousSourceProvenanceHash', 'previous source provenance hash'],
    ['verificationBundleHash', 'verification bundle hash'],
    ['registrySnapshotHash', 'registry snapshot hash']
  ];
  return required.flatMap(([key, label]) => {
    const value = context[key];
    return typeof value === 'string' && value.trim().length > 0
      ? []
      : [issue('REPAIR_CONTEXT_BINDING_MISSING', `Repair context requires ${label}.`)];
  });
}

function lineageInputIssues(input: {
  repairRequest: CapabilityRepairRequest;
  sourceDiff: CandidateRepairSourceDiff;
  scopeReport: CapabilityRepairScopeReport;
  invalidationReport: CapabilityRepairInvalidationReport;
}): CapabilityRepairIssue[] {
  const nextAttemptId = input.repairRequest.nextAttemptId ?? '';
  return [
    ...(input.repairRequest.status === 'created' && nextAttemptId.length > 0
      ? []
      : [issue('REPAIR_LINEAGE_INPUT_INVALID', 'Lineage requires a created repair request with next attempt ID.')]),
    ...(input.sourceDiff.requestId === input.repairRequest.requestId &&
    input.sourceDiff.parentAttemptId === input.repairRequest.currentAttemptId &&
    input.sourceDiff.nextAttemptId === nextAttemptId &&
    input.sourceDiff.sourceDiffHash === recomputeSourceDiffHash(input.sourceDiff)
      ? []
      : [issue('REPAIR_LINEAGE_INPUT_INVALID', 'Source diff is not bound to repair request lineage.')]),
    ...(input.scopeReport.status === 'allowed' &&
    input.scopeReport.requestId === input.repairRequest.requestId &&
    input.scopeReport.attemptId === nextAttemptId &&
    input.scopeReport.scopeReportHash === recomputeScopeReportHash(input.scopeReport)
      ? []
      : [issue('REPAIR_LINEAGE_INPUT_INVALID', 'Scope report is not valid for repair lineage.')]),
    ...(input.invalidationReport.status === 'valid' &&
    input.invalidationReport.requestId === input.repairRequest.requestId &&
    input.invalidationReport.parentAttemptId === input.repairRequest.currentAttemptId &&
    input.invalidationReport.nextAttemptId === nextAttemptId &&
    input.invalidationReport.invalidationHash === recomputeInvalidationHash(input.invalidationReport)
      ? []
      : [issue('REPAIR_LINEAGE_INPUT_INVALID', 'Invalidation report is not valid for repair lineage.')])
  ];
}

function repairLimitIssues(currentAttemptNumber: number, maxRepairAttempts: number): CapabilityRepairIssue[] {
  const maxAttemptNumber = 1 + maxRepairAttempts;
  return currentAttemptNumber >= maxAttemptNumber
    ? [issue('REPAIR_ATTEMPT_LIMIT_EXCEEDED', `Repair attempt limit exceeded at attempt ${currentAttemptNumber}.`)]
    : [];
}

function diagnosticEligibilityIssues(
  diagnostics: readonly CapabilityRepairDiagnostic[],
  requestedChangeKind: CapabilityRepairRequest['requestedChangeKind']
): CapabilityRepairIssue[] {
  if (diagnostics.length === 0) {
    return [issue('REPAIR_DIAGNOSTICS_MISSING', 'Repair requires at least one normalized diagnostic.')];
  }
  return diagnostics.flatMap((diagnostic) => {
    if (isDenylistedDiagnostic(diagnostic.classification)) {
      return [issue('REPAIR_DIAGNOSTIC_DENYLISTED', `Diagnostic ${diagnostic.code} is not model-repairable.`, diagnostic.path)];
    }
    if (diagnostic.classification === 'UNKNOWN_DIAGNOSTIC' || diagnostic.classification === 'UNMAPPED_VERIFICATION_FAILURE') {
      return [issue('REPAIR_DIAGNOSTIC_UNKNOWN', `Diagnostic ${diagnostic.code} is not mapped to a repairable class.`, diagnostic.path)];
    }
    if (!isEligibleDiagnostic(diagnostic.classification)) {
      return [issue('REPAIR_DIAGNOSTIC_NOT_ALLOWLISTED', `Diagnostic ${diagnostic.code} is not repair allowlisted.`, diagnostic.path)];
    }
    if (diagnostic.classification === 'MISSING_DIAGNOSTIC_MAPPING' && requestedChangeKind === 'candidate_source') {
      return [issue('REPAIR_DIAGNOSTIC_MAPPING_CANDIDATE_SOURCE_FORBIDDEN', 'Missing diagnostic mapping cannot authorize candidate source repair.', diagnostic.path)];
    }
    return [];
  });
}

function scopeIssues(
  baseline: CapabilityRepairScopeSnapshot,
  candidate: CapabilityRepairScopeCandidate
): CapabilityRepairIssue[] {
  const issues: CapabilityRepairIssue[] = [];
  issues.push(...subsetIssues(candidate.changedFiles, baseline.writablePaths, 'Changed file is outside writable repair scope.'));
  issues.push(...subsetIssues(candidate.imports, baseline.approvedImports, 'Repair import is outside the approved SDK/import allowlist.'));
  issues.push(...sameSetIssues(candidate.dependencies, baseline.dependencies, 'Repair cannot change dependencies.'));
  issues.push(...sameSetIssues(candidate.runtimeServices, baseline.runtimeServices, 'Repair cannot change runtime services.'));
  issues.push(...sameSetIssues(candidate.dslOwnedPaths, baseline.dslOwnedPaths, 'Repair cannot change DSL ownership.'));
  issues.push(...sameSetIssues(candidate.irNodeKinds, baseline.irNodeKinds, 'Repair cannot change IR ownership.'));
  issues.push(...sameSetIssues(candidate.publicInterfaces, baseline.publicInterfaces, 'Repair cannot change public interfaces.'));
  issues.push(...sameSetIssues(candidate.privileges, baseline.privileges, 'Repair cannot change privileges.'));
  for (const path of candidate.touchedTrustedPaths ?? []) {
    issues.push(issue('REPAIR_SCOPE_DRIFT', 'Repair cannot modify trusted artifacts.', path));
  }
  if (
    candidate.budgets.maxStateEntries > baseline.budgets.maxStateEntries ||
    candidate.budgets.maxEventRate > baseline.budgets.maxEventRate ||
    candidate.budgets.maxUpdateMs > baseline.budgets.maxUpdateMs
  ) {
    issues.push(issue('REPAIR_SCOPE_DRIFT', 'Repair cannot expand runtime budgets.'));
  }
  return issues;
}

function subsetIssues(values: readonly string[], allowed: readonly string[], message: string): CapabilityRepairIssue[] {
  const allowedSet = new Set(allowed);
  return uniqueStrings(values).flatMap((value) =>
    allowedSet.has(value) ? [] : [issue('REPAIR_SCOPE_DRIFT', message, value)]
  );
}

function sameSetIssues(values: readonly string[], expected: readonly string[], message: string): CapabilityRepairIssue[] {
  return hashStableJson(uniqueStrings(values)) === hashStableJson(uniqueStrings(expected))
    ? []
    : [issue('REPAIR_SCOPE_DRIFT', message)];
}

function buildNextAttemptId(requestId: string, nextAttemptNumber: number): string | undefined {
  try {
    return buildCapabilitySynthesisAttemptId({ requestId, attemptNumber: nextAttemptNumber });
  } catch {
    return undefined;
  }
}

function blockedNextState(issues: readonly CapabilityRepairIssue[]): CapabilityRepairRequest['nextState'] {
  return issues.some((item) =>
    item.code === 'REPAIR_ACTIVE_LOCK_DRIFT' ||
    item.code === 'REPAIR_DIAGNOSTIC_DENYLISTED' ||
    item.code === 'REPAIR_SCOPE_DRIFT'
  )
    ? 'QUARANTINED'
    : 'FAILED';
}

function isEligibleDiagnostic(value: CapabilityRepairDiagnosticClassification): value is CapabilityRepairEligibleDiagnostic {
  return (CAPABILITY_REPAIR_ELIGIBLE_DIAGNOSTICS as readonly string[]).includes(value);
}

function isDenylistedDiagnostic(value: CapabilityRepairDiagnosticClassification): value is CapabilityRepairDenylistedDiagnostic {
  return (CAPABILITY_REPAIR_DENYLISTED_DIAGNOSTICS as readonly string[]).includes(value);
}

function sanitizeDiagnosticText(value: string): string {
  return value
    .replace(/\/(?:Users|home|tmp|private|var|Volumes|workspace)\/[^\s'"]+/g, '[REDACTED_PATH]')
    .replace(/[A-Za-z0-9_]*TOKEN[A-Za-z0-9_]*=[^\s'"]+/gi, '[REDACTED_SECRET]')
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, '[REDACTED_SECRET]');
}

function containsSensitiveText(value: string): boolean {
  return /\/(?:Users|home|tmp|private|var|Volumes|workspace)\//.test(value) || /sk-[A-Za-z0-9_-]{12,}/.test(value) || /TOKEN=/i.test(value);
}

function recomputeLineageHash(lineage: CapabilityRepairAttemptLineage): string {
  const { lineageHash: _lineageHash, ...payload } = lineage;
  return hashStableJson(payload);
}

function recomputeSourceDiffHash(sourceDiff: CandidateRepairSourceDiff): string {
  const { sourceDiffHash: _sourceDiffHash, ...payload } = sourceDiff;
  return hashStableJson(payload);
}

function recomputeScopeReportHash(scopeReport: CapabilityRepairScopeReport): string {
  const { scopeReportHash: _scopeReportHash, ...payload } = scopeReport;
  return hashStableJson(payload);
}

function recomputeInvalidationHash(invalidationReport: CapabilityRepairInvalidationReport): string {
  const { invalidationHash: _invalidationHash, ...payload } = invalidationReport;
  return hashStableJson(payload);
}

function normalizePath(path: string): string {
  return path.trim().replace(/\\/g, '/').replace(/^\/+/, '');
}

function sortDiagnostics(diagnostics: readonly CapabilityRepairDiagnostic[]): CapabilityRepairDiagnostic[] {
  return [...diagnostics]
    .map((diagnostic) => ({
      code: diagnostic.code.trim(),
      classification: diagnostic.classification,
      stageId: diagnostic.stageId.trim(),
      message: diagnostic.message.trim(),
      ...(diagnostic.path === undefined ? {} : { path: normalizePath(diagnostic.path) }),
      ...(diagnostic.assertionId === undefined ? {} : { assertionId: diagnostic.assertionId.trim() })
    }))
    .sort((left, right) => `${left.stageId}:${left.code}:${left.path ?? ''}`.localeCompare(`${right.stageId}:${right.code}:${right.path ?? ''}`));
}

function issue(code: CapabilityRepairIssue['code'], message: string, path?: string): CapabilityRepairIssue {
  return { code, message, ...(path === undefined ? {} : { path }) };
}

function compareIssues(left: CapabilityRepairIssue, right: CapabilityRepairIssue): number {
  return `${left.code}:${left.path ?? ''}:${left.message}`.localeCompare(`${right.code}:${right.path ?? ''}:${right.message}`);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort();
}
