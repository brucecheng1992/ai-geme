import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from '../gameplay-capabilities/package-contract.js';
import type { DeclarativeJsonValue } from '../gameplay-capabilities/declarative-json.js';
import { hashStableJson } from '../gameplay-capabilities/stable-json.js';
import type { CapabilitySpecificationCandidate } from './capability-specification.js';
import {
  CAPABILITY_SYNTHESIS_POLICY_DECISION_TRUSTED_NAMESPACE,
  validateCapabilitySynthesisPolicyDecisionReceipt,
  type CapabilitySynthesisPolicyDecision,
  type CapabilitySynthesisPolicyDecisionReceipt,
  type CapabilitySynthesisPolicyDecisionReceiptResolver
} from './capability-policy.js';
import type { CapabilitySynthesisAttemptManifest, CapabilitySynthesisSandboxGateReport } from './candidate-sandbox.js';

export const CAPABILITY_SCAFFOLD_VERSION = 'step36.capability-scaffold.v1';
export const CAPABILITY_SCAFFOLD_PLAN_KIND = 'capability_scaffold_plan';
export const CAPABILITY_SCAFFOLD_REPORT_KIND = 'capability_scaffold_report';
export const CANDIDATE_ALLOWED_FILES_KIND = 'candidate_allowed_files';
export const CANDIDATE_SOURCE_MANIFEST_KIND = 'candidate_source_manifest.initial';
export const CANDIDATE_EXTERNAL_TEST_MANIFEST_KIND = 'candidate_external_test_manifest';
export const CANDIDATE_MANIFEST_INITIAL_KIND = 'candidate_manifest.initial';
export const CAPABILITY_SCAFFOLD_SCHEMA_VERSION = 'step36.capability-scaffold-artifact.v1';

export type CapabilityScaffoldIssue = {
  code:
    | 'SCAFFOLD_POLICY_NOT_ALLOWED'
    | 'SCAFFOLD_POLICY_NOT_SCAFFOLDABLE'
    | 'SCAFFOLD_POLICY_NOT_EVALUATED'
    | 'SCAFFOLD_POLICY_RECEIPT_INVALID'
    | 'SCAFFOLD_POLICY_HASH_MISMATCH'
    | 'SCAFFOLD_POLICY_CONTEXT_HASH_MISMATCH'
    | 'SCAFFOLD_POLICY_DECISION_HASH_MISMATCH'
    | 'SCAFFOLD_POLICY_REQUEST_MISMATCH'
    | 'SCAFFOLD_SPEC_HASH_MISMATCH'
    | 'SCAFFOLD_ATTEMPT_HASH_MISMATCH'
    | 'SCAFFOLD_ATTEMPT_POLICY_HASH_MISMATCH'
    | 'SCAFFOLD_ATTEMPT_REQUEST_MISMATCH'
    | 'SCAFFOLD_ATTEMPT_INTEGRITY_MISSING'
    | 'SCAFFOLD_ATTEMPT_INTEGRITY_BLOCKED'
    | 'SCAFFOLD_ATTEMPT_INTEGRITY_HASH_MISMATCH'
    | 'SCAFFOLD_ATTEMPT_INTEGRITY_BINDING_MISMATCH'
    | 'SCAFFOLD_VERSION_MISMATCH'
    | 'SCAFFOLD_SDK_VERSION_MISMATCH'
    | 'SCAFFOLD_RUNTIME_FAMILY_UNSAFE'
    | 'SCAFFOLD_MODEL_PATH_NOT_WRITABLE'
    | 'SCAFFOLD_MODEL_PATH_READ_ONLY'
    | 'SCAFFOLD_MODEL_PATH_FORBIDDEN'
    | 'SCAFFOLD_MODEL_PATH_UNKNOWN'
    | 'SCAFFOLD_REPORT_HASH_MISMATCH';
  message: string;
  path?: string;
};

export type CapabilityScaffoldFileClassification =
  | 'writable_by_model'
  | 'read_only_generated'
  | 'read_only_external_test'
  | 'forbidden';

export type CapabilityScaffoldFileEntry = {
  path: string;
  classification: CapabilityScaffoldFileClassification;
  owner: 'trusted_scaffolder' | 'model_candidate' | 'trusted_external_harness' | 'forbidden';
  purpose: string;
};

export type CapabilityScaffoldAllowedFileMap = {
  artifactKind: typeof CANDIDATE_ALLOWED_FILES_KIND;
  schemaVersion: typeof CAPABILITY_SCAFFOLD_SCHEMA_VERSION;
  files: CapabilityScaffoldFileEntry[];
  allowedFileMapHash: string;
};

export type CapabilityScaffoldSourceManifest = {
  artifactKind: typeof CANDIDATE_SOURCE_MANIFEST_KIND;
  schemaVersion: typeof CAPABILITY_SCAFFOLD_SCHEMA_VERSION;
  files: Array<{ path: string; classification: CapabilityScaffoldFileClassification; contentHash: string }>;
  initialSourceManifestHash: string;
};

export type CapabilityScaffoldExternalTestManifest = {
  artifactKind: typeof CANDIDATE_EXTERNAL_TEST_MANIFEST_KIND;
  schemaVersion: typeof CAPABILITY_SCAFFOLD_SCHEMA_VERSION;
  files: Array<{ path: string; contentHash: string; readOnly: true }>;
  externalTestManifestHash: string;
};

export type CapabilityScaffoldCandidateManifest = {
  artifactKind: typeof CANDIDATE_MANIFEST_INITIAL_KIND;
  schemaVersion: typeof CAPABILITY_SCAFFOLD_SCHEMA_VERSION;
  trust: {
    status: 'candidate';
    installable: false;
    supported: false;
  };
  packageContract: GameplayCapabilityPackageContract;
  candidateManifestHash: string;
};

export type CapabilityScaffoldPlan = {
  artifactKind: typeof CAPABILITY_SCAFFOLD_PLAN_KIND;
  schemaVersion: typeof CAPABILITY_SCAFFOLD_SCHEMA_VERSION;
  specificationHash: string;
  policyDecisionHash: string;
  decisionContextHash: string;
  attemptManifestHash: string;
  attemptManifestIntegrityReportHash: string;
  workspaceManifestHash: string;
  sandboxPolicyHash: string;
  scaffoldVersion: string;
  sdkVersion: string;
  mode: CapabilitySynthesisPolicyDecision['mode'];
  scaffoldPlanHash: string;
};

export type CapabilityScaffoldReport = {
  artifactKind: typeof CAPABILITY_SCAFFOLD_REPORT_KIND;
  schemaVersion: typeof CAPABILITY_SCAFFOLD_SCHEMA_VERSION;
  status: 'generated' | 'blocked';
  specificationHash: string;
  policyDecisionHash: string;
  decisionContextHash: string;
  attemptManifestHash: string;
  attemptManifestIntegrityReportHash: string;
  workspaceManifestHash: string;
  sandboxPolicyHash: string;
  mountManifestHash: string;
  startupAttestationHash: string;
  networkIsolationReportHash: string;
  commandLogHash: string;
  resourceReportHash: string;
  scaffoldVersion: string;
  sdkVersion: string;
  layoutHash?: string;
  allowedFileMapHash?: string;
  initialSourceManifestHash?: string;
  externalTestManifestHash?: string;
  candidateManifestHash?: string;
  issues: CapabilityScaffoldIssue[];
  scaffoldReportHash: string;
};

export type CapabilityScaffoldArtifacts = {
  plan: CapabilityScaffoldPlan;
  report: CapabilityScaffoldReport;
  allowedFileMap?: CapabilityScaffoldAllowedFileMap;
  sourceManifest?: CapabilityScaffoldSourceManifest;
  externalTestManifest?: CapabilityScaffoldExternalTestManifest;
  candidateManifest?: CapabilityScaffoldCandidateManifest;
};

export function buildCapabilityScaffoldArtifacts(input: {
  specification: CapabilitySpecificationCandidate;
  policyDecision: CapabilitySynthesisPolicyDecision;
  trustedPolicyDecisionReceiptRef: CapabilitySynthesisPolicyDecisionReceipt['trustedArtifactRef'];
  trustedPolicyDecisionStore: CapabilitySynthesisPolicyDecisionReceiptResolver;
  attemptManifest: CapabilitySynthesisAttemptManifest;
  attemptManifestIntegrityReport: CapabilitySynthesisSandboxGateReport;
  trustedAttemptManifestIntegrityReportHash: string;
  scaffoldVersion?: string;
  sdkVersion: string;
}): CapabilityScaffoldArtifacts {
  const scaffoldVersion = input.scaffoldVersion ?? CAPABILITY_SCAFFOLD_VERSION;
  const plan = buildCapabilityScaffoldPlan({
    specificationHash: input.specification.specificationHash,
    policyDecisionHash: input.policyDecision.decisionHash,
    decisionContextHash: input.policyDecision.decisionContextHash ?? '',
    attemptManifestHash: input.attemptManifest.attemptManifestHash,
    attemptManifestIntegrityReportHash: input.attemptManifestIntegrityReport.reportHash,
    workspaceManifestHash: input.attemptManifest.workspaceManifestHash,
    sandboxPolicyHash: input.attemptManifest.sandboxPolicyHash,
    scaffoldVersion,
    sdkVersion: input.sdkVersion,
    mode: input.policyDecision.mode
  });
  const issues = scaffoldInputIssues({ ...input, scaffoldVersion });
  if (issues.length > 0) {
    return {
      plan,
      report: buildCapabilityScaffoldReport({
        input,
        scaffoldVersion,
        status: 'blocked',
        issues
      })
    };
  }

  const runtimePath = runtimeSourcePath(input.specification.runtimeFamilies[0] ?? '');
  const allowedFileMap = buildAllowedFileMap(input.specification, input.policyDecision, runtimePath);
  const sourceManifest = buildSourceManifest(allowedFileMap);
  const externalTestManifest = buildExternalTestManifest();
  const candidateManifest = buildCandidateManifest(input.specification);
  const layoutHash = hashStableJson({
    files: allowedFileMap.files.map((file) => file.path),
    candidateManifestHash: candidateManifest.candidateManifestHash
  });

  return {
    plan,
    report: buildCapabilityScaffoldReport({
      input,
      scaffoldVersion,
      status: 'generated',
      issues: [],
      layoutHash,
      allowedFileMap,
      sourceManifest,
      externalTestManifest,
      candidateManifest
    }),
    allowedFileMap,
    sourceManifest,
    externalTestManifest,
    candidateManifest
  };
}

export function validateCapabilityScaffoldModelFilePath(input: {
  allowedFileMap: CapabilityScaffoldAllowedFileMap;
  path: string;
}): { status: 'allowed' | 'blocked'; issues: CapabilityScaffoldIssue[]; reportHash: string } {
  const normalizedPath = input.path.trim();
  const entry = input.allowedFileMap.files.find((file) => file.path === normalizedPath) ??
    input.allowedFileMap.files.find((file) => file.classification === 'forbidden' && forbiddenPatternMatches(file.path, normalizedPath));
  const issues =
    entry === undefined
      ? [scaffoldIssue('SCAFFOLD_MODEL_PATH_UNKNOWN', `Model output path ${normalizedPath} is not in the allowed file map.`, normalizedPath)]
      : fileEntryIssues(entry);
  const payload = {
    status: issues.length === 0 ? 'allowed' as const : 'blocked' as const,
    path: input.path,
    issues
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

function forbiddenPatternMatches(pattern: string, path: string): boolean {
  if (pattern.startsWith('**/*.')) {
    return path.endsWith(pattern.slice('**/*'.length));
  }
  if (pattern.startsWith('**/')) {
    return path === pattern.slice('**/'.length) || path.endsWith(`/${pattern.slice('**/'.length)}`);
  }
  return pattern === path;
}

export function validateCapabilityScaffoldReportIntegrity(input: {
  report: CapabilityScaffoldReport;
  expectedSpecificationHash: string;
  expectedPolicyDecisionHash: string;
  expectedAttemptManifestHash: string;
  expectedAttemptManifestIntegrityReportHash: string;
  expectedScaffoldVersion: string;
  expectedSdkVersion: string;
}): { status: 'valid' | 'invalid'; issues: CapabilityScaffoldIssue[]; reportHash: string } {
  const issues = [
    ...(input.report.specificationHash === input.expectedSpecificationHash ? [] : [scaffoldIssue('SCAFFOLD_SPEC_HASH_MISMATCH', 'Scaffold report specification hash mismatch.')]),
    ...(input.report.policyDecisionHash === input.expectedPolicyDecisionHash ? [] : [scaffoldIssue('SCAFFOLD_POLICY_HASH_MISMATCH', 'Scaffold report policy hash mismatch.')]),
    ...(input.report.attemptManifestHash === input.expectedAttemptManifestHash ? [] : [scaffoldIssue('SCAFFOLD_ATTEMPT_HASH_MISMATCH', 'Scaffold report attempt manifest hash mismatch.')]),
    ...(input.report.attemptManifestIntegrityReportHash === input.expectedAttemptManifestIntegrityReportHash
      ? []
      : [scaffoldIssue('SCAFFOLD_ATTEMPT_INTEGRITY_HASH_MISMATCH', 'Scaffold report attempt integrity hash mismatch.')]),
    ...(input.report.scaffoldVersion === input.expectedScaffoldVersion ? [] : [scaffoldIssue('SCAFFOLD_VERSION_MISMATCH', 'Scaffold version mismatch.')]),
    ...(input.report.sdkVersion === input.expectedSdkVersion ? [] : [scaffoldIssue('SCAFFOLD_SDK_VERSION_MISMATCH', 'SDK version mismatch.')]),
    ...(input.report.scaffoldReportHash === recomputeScaffoldReportHash(input.report) ? [] : [scaffoldIssue('SCAFFOLD_REPORT_HASH_MISMATCH', 'Scaffold report hash mismatch.')])
  ];
  const payload = {
    status: issues.length === 0 ? 'valid' as const : 'invalid' as const,
    issues
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

function buildCapabilityScaffoldPlan(input: Omit<CapabilityScaffoldPlan, 'artifactKind' | 'schemaVersion' | 'scaffoldPlanHash'>): CapabilityScaffoldPlan {
  const payload: Omit<CapabilityScaffoldPlan, 'scaffoldPlanHash'> = {
    artifactKind: CAPABILITY_SCAFFOLD_PLAN_KIND,
    schemaVersion: CAPABILITY_SCAFFOLD_SCHEMA_VERSION,
    ...input
  };
  return { ...payload, scaffoldPlanHash: hashStableJson(payload) };
}

function buildCapabilityScaffoldReport(input: {
  input: {
    specification: CapabilitySpecificationCandidate;
    policyDecision: CapabilitySynthesisPolicyDecision;
    attemptManifest: CapabilitySynthesisAttemptManifest;
    attemptManifestIntegrityReport: CapabilitySynthesisSandboxGateReport;
    sdkVersion: string;
  };
  scaffoldVersion: string;
  status: CapabilityScaffoldReport['status'];
  issues: CapabilityScaffoldIssue[];
  layoutHash?: string;
  allowedFileMap?: CapabilityScaffoldAllowedFileMap;
  sourceManifest?: CapabilityScaffoldSourceManifest;
  externalTestManifest?: CapabilityScaffoldExternalTestManifest;
  candidateManifest?: CapabilityScaffoldCandidateManifest;
}): CapabilityScaffoldReport {
  const payload: Omit<CapabilityScaffoldReport, 'scaffoldReportHash'> = {
    artifactKind: CAPABILITY_SCAFFOLD_REPORT_KIND,
    schemaVersion: CAPABILITY_SCAFFOLD_SCHEMA_VERSION,
    status: input.status,
    specificationHash: input.input.specification.specificationHash,
    policyDecisionHash: input.input.policyDecision.decisionHash,
    decisionContextHash: input.input.policyDecision.decisionContextHash ?? '',
    attemptManifestHash: input.input.attemptManifest.attemptManifestHash,
    attemptManifestIntegrityReportHash: input.input.attemptManifestIntegrityReport.reportHash,
    workspaceManifestHash: input.input.attemptManifest.workspaceManifestHash,
    sandboxPolicyHash: input.input.attemptManifest.sandboxPolicyHash,
    mountManifestHash: input.input.attemptManifest.mountManifestHash,
    startupAttestationHash: input.input.attemptManifest.startupAttestationHash,
    networkIsolationReportHash: input.input.attemptManifest.networkIsolationReportHash,
    commandLogHash: input.input.attemptManifest.commandLogHash,
    resourceReportHash: input.input.attemptManifest.resourceReportHash,
    scaffoldVersion: input.scaffoldVersion,
    sdkVersion: input.input.sdkVersion,
    ...(input.layoutHash === undefined ? {} : { layoutHash: input.layoutHash }),
    ...(input.allowedFileMap === undefined ? {} : { allowedFileMapHash: input.allowedFileMap.allowedFileMapHash }),
    ...(input.sourceManifest === undefined ? {} : { initialSourceManifestHash: input.sourceManifest.initialSourceManifestHash }),
    ...(input.externalTestManifest === undefined ? {} : { externalTestManifestHash: input.externalTestManifest.externalTestManifestHash }),
    ...(input.candidateManifest === undefined ? {} : { candidateManifestHash: input.candidateManifest.candidateManifestHash }),
    issues: [...input.issues].sort(compareIssues)
  };
  return { ...payload, scaffoldReportHash: hashStableJson(payload) };
}

function scaffoldInputIssues(input: {
  specification: CapabilitySpecificationCandidate;
  policyDecision: CapabilitySynthesisPolicyDecision;
  trustedPolicyDecisionReceiptRef: CapabilitySynthesisPolicyDecisionReceipt['trustedArtifactRef'];
  trustedPolicyDecisionStore: CapabilitySynthesisPolicyDecisionReceiptResolver;
  attemptManifest: CapabilitySynthesisAttemptManifest;
  attemptManifestIntegrityReport: CapabilitySynthesisSandboxGateReport;
  trustedAttemptManifestIntegrityReportHash: string;
  scaffoldVersion: string;
  sdkVersion: string;
}): CapabilityScaffoldIssue[] {
  const runtimeFamily = input.specification.runtimeFamilies[0] ?? '';
  const trustedPolicyDecisionReceipt = resolveTrustedPolicyDecisionReceipt({
    receiptRef: input.trustedPolicyDecisionReceiptRef,
    store: input.trustedPolicyDecisionStore
  });
  const receiptValid = validateCapabilitySynthesisPolicyDecisionReceipt({
    decision: input.policyDecision,
    receipt: trustedPolicyDecisionReceipt,
    receiptRef: input.trustedPolicyDecisionReceiptRef,
    trustedPolicyDecisionStore: input.trustedPolicyDecisionStore
  });
  const expectedDecisionContextHash = trustedPolicyDecisionReceipt?.subject.decisionContextHash ?? '';
  return [
    ...(input.policyDecision.allowed ? [] : [scaffoldIssue('SCAFFOLD_POLICY_NOT_ALLOWED', 'Policy must be allowed before scaffolding.')]),
    ...(input.policyDecision.policyEvaluationStatus === 'EVALUATED' ? [] : [scaffoldIssue('SCAFFOLD_POLICY_NOT_EVALUATED', 'Policy must be evaluated before scaffolding.')]),
    ...(receiptValid ? [] : [scaffoldIssue('SCAFFOLD_POLICY_RECEIPT_INVALID', 'Scaffold requires a trusted policy decision receipt.')]),
    ...(input.policyDecision.riskTier === 'R1_DECLARATIVE_EXTENSION' || input.policyDecision.riskTier === 'R2_BOUNDED_RUNTIME_MODULE'
      ? []
      : [scaffoldIssue('SCAFFOLD_POLICY_NOT_SCAFFOLDABLE', 'Only R1/R2 policies can produce package scaffold.')]),
    ...(input.policyDecision.decisionHash === recomputePolicyDecisionHash(input.policyDecision)
      ? []
      : [scaffoldIssue('SCAFFOLD_POLICY_DECISION_HASH_MISMATCH', 'Policy decision hash does not match policy payload.')]),
    ...(input.policyDecision.requestId === input.specification.requestId ? [] : [scaffoldIssue('SCAFFOLD_POLICY_REQUEST_MISMATCH', 'Policy request does not match specification request.')]),
    ...(input.policyDecision.requestId === input.attemptManifest.requestId ? [] : [scaffoldIssue('SCAFFOLD_ATTEMPT_REQUEST_MISMATCH', 'Policy request does not match attempt manifest request.')]),
    ...(input.policyDecision.specificationHash === input.specification.specificationHash ? [] : [scaffoldIssue('SCAFFOLD_SPEC_HASH_MISMATCH', 'Policy and specification hashes do not match.')]),
    ...(input.attemptManifest.specificationHash === input.specification.specificationHash ? [] : [scaffoldIssue('SCAFFOLD_ATTEMPT_HASH_MISMATCH', 'Attempt manifest and specification hashes do not match.')]),
    ...(input.attemptManifest.policyDecisionHash === input.policyDecision.decisionHash
      ? []
      : [scaffoldIssue('SCAFFOLD_ATTEMPT_POLICY_HASH_MISMATCH', 'Attempt manifest policy hash does not match policy decision.')]),
    ...(input.policyDecision.decisionContextHash !== undefined &&
    input.policyDecision.decisionContextHash.length > 0 &&
    input.policyDecision.decisionContextHash === expectedDecisionContextHash &&
    input.attemptManifest.decisionContextHash === expectedDecisionContextHash
      ? []
      : [scaffoldIssue('SCAFFOLD_POLICY_CONTEXT_HASH_MISMATCH', 'Attempt manifest decision context hash does not match trusted policy decision context.')]),
    ...(input.attemptManifest.registrySnapshotHash === input.specification.registrySnapshotHash &&
    input.attemptManifest.activeCapabilityLockHash === (input.specification.activeCapabilityLockHash ?? '')
      ? []
      : [scaffoldIssue('SCAFFOLD_ATTEMPT_HASH_MISMATCH', 'Attempt manifest registry or active lock hash does not match specification bindings.')]),
    ...(input.attemptManifest.attemptManifestHash === recomputeAttemptManifestHash(input.attemptManifest)
      ? []
      : [scaffoldIssue('SCAFFOLD_ATTEMPT_HASH_MISMATCH', 'Attempt manifest hash does not match manifest payload.')]),
    ...(input.attemptManifestIntegrityReport.status === 'allowed' ? [] : [scaffoldIssue('SCAFFOLD_ATTEMPT_INTEGRITY_BLOCKED', 'Attempt manifest integrity report is not allowed.')]),
    ...(input.attemptManifestIntegrityReport.requestId === input.attemptManifest.requestId &&
    input.attemptManifestIntegrityReport.attemptId === input.attemptManifest.attemptId &&
    input.attemptManifestIntegrityReport.policyDecisionHash === input.attemptManifest.policyDecisionHash
      ? []
      : [scaffoldIssue('SCAFFOLD_ATTEMPT_INTEGRITY_BINDING_MISMATCH', 'Attempt manifest integrity report is not bound to the attempt manifest.')]),
    ...(input.attemptManifestIntegrityReport.reportHash === recomputeAttemptManifestIntegrityReportHash(input.attemptManifestIntegrityReport)
      ? []
      : [scaffoldIssue('SCAFFOLD_ATTEMPT_INTEGRITY_HASH_MISMATCH', 'Attempt manifest integrity report hash does not match report payload.')]),
    ...(input.attemptManifestIntegrityReport.reportHash === input.trustedAttemptManifestIntegrityReportHash
      ? []
      : [scaffoldIssue('SCAFFOLD_ATTEMPT_INTEGRITY_HASH_MISMATCH', 'Attempt manifest integrity report hash does not match trusted input.')]),
    ...(input.attemptManifestIntegrityReport.reportHash.length > 0 ? [] : [scaffoldIssue('SCAFFOLD_ATTEMPT_INTEGRITY_MISSING', 'Attempt manifest integrity report hash is missing.')]),
    ...(input.scaffoldVersion.trim().length > 0 ? [] : [scaffoldIssue('SCAFFOLD_VERSION_MISMATCH', 'Scaffold version is missing.')]),
    ...(input.sdkVersion.trim().length > 0 ? [] : [scaffoldIssue('SCAFFOLD_SDK_VERSION_MISMATCH', 'SDK version is missing.')]),
    ...(runtimeSourcePath(runtimeFamily) === undefined ? [scaffoldIssue('SCAFFOLD_RUNTIME_FAMILY_UNSAFE', `Runtime family ${runtimeFamily} cannot be mapped to a safe source path.`)] : [])
  ].sort(compareIssues);
}

function resolveTrustedPolicyDecisionReceipt(input: {
  receiptRef: CapabilitySynthesisPolicyDecisionReceipt['trustedArtifactRef'];
  store: CapabilitySynthesisPolicyDecisionReceiptResolver;
}): CapabilitySynthesisPolicyDecisionReceipt | undefined {
  return input.store.namespace === CAPABILITY_SYNTHESIS_POLICY_DECISION_TRUSTED_NAMESPACE
    ? input.store.resolveReceipt(input.receiptRef)
    : undefined;
}

function buildAllowedFileMap(
  specification: CapabilitySpecificationCandidate,
  policyDecision: CapabilitySynthesisPolicyDecision,
  runtimePath: string | undefined
): CapabilityScaffoldAllowedFileMap {
  const writable = policyDecision.riskTier === 'R1_DECLARATIVE_EXTENSION'
    ? [
        entry('declarative/behavior-graph.json', 'writable_by_model', 'model_candidate', 'Declarative behavior graph body.'),
        entry('declarative/state-machine.json', 'writable_by_model', 'model_candidate', 'Declarative state machine body.'),
        entry('declarative/qa-descriptors.json', 'writable_by_model', 'model_candidate', 'Declarative QA descriptors.')
      ]
    : [
        entry('src/schema.ts', 'writable_by_model', 'model_candidate', 'DSL schema implementation.'),
        entry('src/normalizer.ts', 'writable_by_model', 'model_candidate', 'DSL normalization implementation.'),
        entry('src/ir-compiler.ts', 'writable_by_model', 'model_candidate', 'IR compiler implementation.'),
        entry('src/amendments.ts', 'writable_by_model', 'model_candidate', 'Amendment operation implementation.'),
        entry('src/qa-descriptors.ts', 'writable_by_model', 'model_candidate', 'QA descriptor implementation.'),
        entry('src/diagnostics.ts', 'writable_by_model', 'model_candidate', 'Diagnostic implementation.'),
        ...(runtimePath === undefined ? [] : [entry(runtimePath, 'writable_by_model', 'model_candidate', 'Runtime module implementation.')]),
        ...(specification.render === undefined ? [] : [entry('src/render.ts', 'writable_by_model', 'model_candidate', 'Render binding implementation.')])
      ];
  const readOnly = [
    entry('manifest.json', 'read_only_generated', 'trusted_scaffolder', 'Candidate manifest and trust fields.'),
    entry('specification.json', 'read_only_generated', 'trusted_scaffolder', 'Frozen capability specification copy.'),
    entry('package.json', 'read_only_generated', 'trusted_scaffolder', 'Frozen package scripts and dependencies.'),
    entry('tsconfig.json', 'read_only_generated', 'trusted_scaffolder', 'Frozen TypeScript configuration.'),
    entry('README.candidate.md', 'read_only_generated', 'trusted_scaffolder', 'Candidate README.'),
    entry('provenance.json', 'read_only_generated', 'trusted_scaffolder', 'Trusted provenance record.'),
    entry('allowed-files.json', 'read_only_generated', 'trusted_scaffolder', 'Allowed file map.'),
    entry('tests/generated/specification-derived.test.ts', 'read_only_generated', 'trusted_scaffolder', 'Spec-derived visible generated test.'),
    entry('tests/external/harness-contract.test.ts', 'read_only_external_test', 'trusted_external_harness', 'Read-only harness contract test.'),
    entry('tests/external/security-policy.test.ts', 'read_only_external_test', 'trusted_external_harness', 'Read-only security policy test.')
  ];
  const forbidden = ['**/.env', '**/.npmrc', '**/.yarnrc', '**/.pnpmrc', '**/package-lock.json', '**/pnpm-lock.yaml', '**/yarn.lock', '**/*.sh', '**/*.wasm', '**/*.node', '**/Dockerfile', '**/docker-compose.yml']
    .map((path) => entry(path, 'forbidden', 'forbidden', 'Forbidden candidate path.'));
  const payload: Omit<CapabilityScaffoldAllowedFileMap, 'allowedFileMapHash'> = {
    artifactKind: CANDIDATE_ALLOWED_FILES_KIND,
    schemaVersion: CAPABILITY_SCAFFOLD_SCHEMA_VERSION,
    files: [...writable, ...readOnly, ...forbidden].sort((left, right) => left.path.localeCompare(right.path))
  };
  return { ...payload, allowedFileMapHash: hashStableJson(payload) };
}

function buildSourceManifest(allowedFileMap: CapabilityScaffoldAllowedFileMap): CapabilityScaffoldSourceManifest {
  const payload: Omit<CapabilityScaffoldSourceManifest, 'initialSourceManifestHash'> = {
    artifactKind: CANDIDATE_SOURCE_MANIFEST_KIND,
    schemaVersion: CAPABILITY_SCAFFOLD_SCHEMA_VERSION,
    files: allowedFileMap.files
      .filter((file) => file.classification !== 'forbidden')
      .map((file) => ({
        path: file.path,
        classification: file.classification,
        contentHash: hashStableJson({ path: file.path, classification: file.classification, scaffold: CAPABILITY_SCAFFOLD_VERSION })
      }))
  };
  return { ...payload, initialSourceManifestHash: hashStableJson(payload) };
}

function buildExternalTestManifest(): CapabilityScaffoldExternalTestManifest {
  const payload: Omit<CapabilityScaffoldExternalTestManifest, 'externalTestManifestHash'> = {
    artifactKind: CANDIDATE_EXTERNAL_TEST_MANIFEST_KIND,
    schemaVersion: CAPABILITY_SCAFFOLD_SCHEMA_VERSION,
    files: [
      { path: 'tests/external/harness-contract.test.ts', contentHash: hashStableJson('harness-contract'), readOnly: true },
      { path: 'tests/external/security-policy.test.ts', contentHash: hashStableJson('security-policy'), readOnly: true }
    ]
  };
  return { ...payload, externalTestManifestHash: hashStableJson(payload) };
}

function buildCandidateManifest(specification: CapabilitySpecificationCandidate): CapabilityScaffoldCandidateManifest {
  const capabilityId = specification.proposedCapabilityId;
  const capabilityVersion = capabilityId.split('.').at(-1) ?? 'v1';
  const runtimeSystemId = `${capabilityId}.runtime.${descriptorSegment(specification.runtime.requiredServices[0] ?? 'core', 1)}`;
  const ownedPath = specification.dsl.ownedPaths[0] ?? '/capabilities';
  const fallbackPolicy = renderFallbackPolicy(specification.render?.fallbackPolicy ?? 'not_applicable');
  const packageContract: GameplayCapabilityPackageContract = {
    manifest: {
      id: capabilityId,
      packageVersion: specification.proposedPackageVersion,
      capabilityVersion,
      status: 'experimental',
      description: specification.description,
      owners: ['capability_maintainer'],
      runtimeFamilies: [...specification.runtimeFamilies],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: `${capabilityId}.schema`,
      ownedPaths: [...specification.dsl.ownedPaths],
      normalizerId: `${capabilityId}.normalizer`,
      migrations: []
    },
    ir: {
      compilerId: `${capabilityId}.ir`,
      ownedNodeKinds: [...specification.ir.ownedNodeKinds]
    },
    runtime: {
      families: [...specification.runtimeFamilies],
      systems: specification.runtime.requiredServices.length === 0
        ? [{ id: runtimeSystemId, version: capabilityVersion, phase: 'gameplay', dependencies: [] }]
        : specification.runtime.requiredServices.map((service, index) => ({
            id: `${capabilityId}.runtime.${descriptorSegment(service, index + 1)}`,
            version: capabilityVersion,
            phase: runtimePhase(service),
            dependencies: []
          }))
    },
    amendments: {
      supportedOperations: specification.amendments.supportedOperations.map((operation) => ({
        operation,
        executionPolicy: patchExecutionPolicy(specification.amendments.patchPolicy)
      })),
      compilerId: `${capabilityId}.amendments`
    },
    patch: {
      descriptors: specification.amendments.supportedOperations.map((operation, index) => ({
        id: `${capabilityId}.patch.${descriptorSegment(operation, index + 1)}`,
        policy: patchExecutionPolicy(specification.amendments.patchPolicy),
        ownedPaths: [ownedPath]
      }))
    },
    qa: {
      probes: specification.qa.requiredProbes.map((probe, index) => {
        const probeId = `${capabilityId}.qa.${descriptorSegment(probe.probeId, index + 1)}`;
        const observationId = `${probeId}.observation.runtime`;
        return {
          id: probeId,
          capabilityId,
          prerequisites: probe.given.length === 0 ? ['candidate package scaffold generated'] : [...probe.given],
          actions: [
            {
              id: `${probeId}.action.primary`,
              kind: 'runtime_event',
              target: probe.when,
              parameters: {}
            }
          ],
          observations: [
            {
              id: observationId,
              kind: 'runtime_event',
              runtimeSystemId,
              ref: probe.observations.join('; ') || probe.probeId
            }
          ],
          assertions: [
            {
              id: `${probeId}.assertion.required`,
              observationId,
              comparator: 'exists',
              message: probe.assertions.join('; ') || 'required capability observation exists'
            }
          ],
          severity: 'required'
        };
      }),
      requiredEvidence: specification.qa.requiredProbes.map((probe, index) => ({
        id: `${capabilityId}.evidence.${descriptorSegment(probe.probeId, index + 1)}`,
        artifactKind: probe.requiredEvidenceSource,
        required: true
      }))
    },
    render: {
      assetRoles: (specification.render?.assetRoles ?? []).map((role) => ({
        role,
        required: fallbackPolicy === 'required_assets_fail_closed'
      })),
      sceneBindings: (specification.render?.sceneBindings ?? []).map((nodeKind, index) => ({
        id: `${capabilityId}.render.${descriptorSegment(nodeKind, index + 1)}`,
        nodeKind
      })),
      fallbackPolicy
    },
    dependencies: specification.dependencies.map((dependency) => ({
      capabilityId: dependency.capabilityId,
      range: dependency.versionRange
    })),
    optionalDependencies: specification.optionalDependencies.map((dependency) => ({
      capabilityId: dependency.capabilityId,
      range: dependency.versionRange
    })),
    conflictsWith: specification.conflictsWith.map((conflict) => ({
      capabilityId: conflict.capabilityId,
      reason: conflict.reason
    })),
    provides: specification.provides.map((provided, index) => ({
      id: `${capabilityId}.provides.${descriptorSegment(provided.interfaceId, index + 1)}`,
      version: capabilityVersionFromId(provided.interfaceId) ?? capabilityVersion
    })),
    defaults: toDeclarativeJsonObject(specification.dsl.defaults),
    diagnostics: {
      semanticContract: specification.semanticContract,
      nonGoals: specification.explicitNonGoals.join('; '),
      securityDataAccess: specification.security.dataAccess.join(', ')
    }
  };
  const payload: Omit<CapabilityScaffoldCandidateManifest, 'candidateManifestHash'> = {
    artifactKind: CANDIDATE_MANIFEST_INITIAL_KIND,
    schemaVersion: CAPABILITY_SCAFFOLD_SCHEMA_VERSION,
    trust: {
      status: 'candidate',
      installable: false,
      supported: false
    },
    packageContract
  };
  return { ...payload, candidateManifestHash: hashStableJson(payload) };
}

function fileEntryIssues(entry: CapabilityScaffoldFileEntry): CapabilityScaffoldIssue[] {
  if (entry.classification === 'writable_by_model') {
    return [];
  }
  if (entry.classification === 'read_only_generated' || entry.classification === 'read_only_external_test') {
    return [scaffoldIssue('SCAFFOLD_MODEL_PATH_READ_ONLY', `Model output path ${entry.path} is read-only.`, entry.path)];
  }
  return [scaffoldIssue('SCAFFOLD_MODEL_PATH_FORBIDDEN', `Model output path ${entry.path} is forbidden.`, entry.path)];
}

function runtimeSourcePath(runtimeFamily: string): string | undefined {
  if (!/^[a-z0-9][a-z0-9_.-]*$/.test(runtimeFamily) || runtimeFamily.includes('..') || runtimeFamily.split(/[./]/).some((segment) => segment.length === 0 || segment.startsWith('.'))) {
    return undefined;
  }
  return `src/runtime/${runtimeFamily}.ts`;
}

function recomputeScaffoldReportHash(report: CapabilityScaffoldReport): string {
  const { scaffoldReportHash: _scaffoldReportHash, ...payload } = report;
  return hashStableJson(payload);
}

function recomputePolicyDecisionHash(decision: CapabilitySynthesisPolicyDecision): string {
  const { decisionHash: _decisionHash, ...payload } = decision;
  return hashStableJson(payload);
}

function recomputeAttemptManifestHash(manifest: CapabilitySynthesisAttemptManifest): string {
  const { attemptManifestHash: _attemptManifestHash, ...payload } = manifest;
  return hashStableJson(payload);
}

function recomputeAttemptManifestIntegrityReportHash(report: CapabilitySynthesisSandboxGateReport): string {
  const { reportHash: _reportHash, ...payload } = report;
  return hashStableJson(payload);
}

function patchExecutionPolicy(policy: CapabilitySpecificationCandidate['amendments']['patchPolicy']): 'hot_runtime_patch' | 'warm_restart' | 'regeneration_required' | 'unsupported' {
  if (policy === 'hot') {
    return 'hot_runtime_patch';
  }
  if (policy === 'warm') {
    return 'warm_restart';
  }
  if (policy === 'regeneration') {
    return 'regeneration_required';
  }
  return 'unsupported';
}

function renderFallbackPolicy(policy: NonNullable<CapabilitySpecificationCandidate['render']>['fallbackPolicy']): GameplayCapabilityPackageContract['render']['fallbackPolicy'] {
  if (policy === 'fail_closed') {
    return 'required_assets_fail_closed';
  }
  if (policy === 'placeholder_only' || policy === 'semantic_fallback_allowed') {
    return 'optional_assets_allowed';
  }
  return 'not_applicable';
}

function runtimePhase(service: string): GameplayCapabilityPackageContract['runtime']['systems'][number]['phase'] {
  if (service.includes('physics')) {
    return 'physics';
  }
  if (service.includes('input')) {
    return 'input';
  }
  if (service.includes('render') || service.includes('feedback')) {
    return 'feedback';
  }
  return 'gameplay';
}

function capabilityVersionFromId(value: string): string | undefined {
  const version = value.split('.').at(-1);
  return version !== undefined && /^v[1-9][0-9]*$/.test(version) ? version : undefined;
}

function descriptorSegment(value: string, fallbackIndex: number): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '_')
    .replace(/^[^a-z]+/, '')
    .replace(/[_.-]+$/g, '')
    .slice(0, 40);
  return normalized.length >= 3 ? normalized : `item_${fallbackIndex}`;
}

function toDeclarativeJsonObject(value: Record<string, unknown>): Record<string, DeclarativeJsonValue> {
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, toDeclarativeJsonValue(child)]));
}

function toDeclarativeJsonValue(value: unknown): DeclarativeJsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (Array.isArray(value)) {
    return value.map(toDeclarativeJsonValue);
  }
  if (typeof value === 'object' && value !== null) {
    return toDeclarativeJsonObject(value as Record<string, unknown>);
  }
  return null;
}

function entry(
  path: string,
  classification: CapabilityScaffoldFileClassification,
  owner: CapabilityScaffoldFileEntry['owner'],
  purpose: string
): CapabilityScaffoldFileEntry {
  return { path, classification, owner, purpose };
}

function compareIssues(left: CapabilityScaffoldIssue, right: CapabilityScaffoldIssue): number {
  return `${left.code}:${left.path ?? ''}`.localeCompare(`${right.code}:${right.path ?? ''}`);
}

function scaffoldIssue(code: CapabilityScaffoldIssue['code'], message: string, path?: string): CapabilityScaffoldIssue {
  return {
    code,
    message,
    ...(path === undefined ? {} : { path })
  };
}
