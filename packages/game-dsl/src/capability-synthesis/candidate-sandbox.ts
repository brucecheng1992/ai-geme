import { hashStableJson } from '../gameplay-capabilities/stable-json.js';
import {
  CAPABILITY_SYNTHESIS_POLICY_REPORT_KIND,
  CAPABILITY_SYNTHESIS_POLICY_REPORT_SCHEMA_VERSION,
  CAPABILITY_SYNTHESIS_POLICY_DECISION_TRUSTED_NAMESPACE,
  validateCapabilitySynthesisPolicyDecisionReceipt,
  type CapabilitySynthesisPolicyDecision,
  type CapabilitySynthesisPolicyDecisionReceipt,
  type CapabilitySynthesisPolicyDecisionReceiptResolver
} from './capability-policy.js';
import { isCapabilitySynthesisAttemptId, isCapabilitySynthesisAttemptIdForRequest, isCapabilitySynthesisRequestId } from './request-id.js';

export const CAPABILITY_SYNTHESIS_SANDBOX_POLICY_VERSION = 'step36.capability-synthesis-sandbox.v1';
export const CAPABILITY_SYNTHESIS_WORKSPACE_MANIFEST_KIND = 'capability_synthesis_workspace_manifest';
export const CAPABILITY_SYNTHESIS_SANDBOX_POLICY_KIND = 'capability_synthesis_sandbox_policy';
export const CAPABILITY_SYNTHESIS_MOUNT_MANIFEST_KIND = 'capability_synthesis_sandbox_mount_manifest';
export const CAPABILITY_SYNTHESIS_NETWORK_REPORT_KIND = 'capability_synthesis_sandbox_network_isolation_report';
export const CAPABILITY_SYNTHESIS_STARTUP_ATTESTATION_KIND = 'capability_synthesis_sandbox_startup_attestation';
export const CAPABILITY_SYNTHESIS_COMMAND_LOG_KIND = 'capability_synthesis_sandbox_command_log';
export const CAPABILITY_SYNTHESIS_RESOURCE_REPORT_KIND = 'capability_synthesis_sandbox_resource_report';
export const CAPABILITY_SYNTHESIS_ATTEMPT_MANIFEST_KIND = 'capability_synthesis_candidate_attempt_manifest';
export const CAPABILITY_SYNTHESIS_SANDBOX_SCHEMA_VERSION = 'step36.capability-synthesis-sandbox-artifact.v1';

export const CAPABILITY_SYNTHESIS_SANDBOX_COMMAND_IDS = [
  'candidate:validate-manifest',
  'candidate:lint-policy',
  'candidate:typecheck',
  'candidate:test-contracts',
  'candidate:build',
  'candidate:test-runtime',
  'candidate:test-adversarial',
  'candidate:test-mutation',
  'candidate:test-performance',
  'candidate:test-teardown'
] as const;

export const CAPABILITY_SYNTHESIS_SANDBOX_ENV_ALLOWLIST = [
  'NODE_ENV',
  'CAPABILITY_SYNTHESIS_ATTEMPT_ID',
  'DETERMINISTIC_SEED',
  'TZ',
  'LANG'
] as const;

export type CapabilitySynthesisSandboxCommandId = (typeof CAPABILITY_SYNTHESIS_SANDBOX_COMMAND_IDS)[number];
export type CapabilitySynthesisSandboxEnvKey = (typeof CAPABILITY_SYNTHESIS_SANDBOX_ENV_ALLOWLIST)[number];

export type CapabilitySynthesisSandboxIssue = {
  code:
    | 'SANDBOX_POLICY_DECISION_KIND_INVALID'
    | 'SANDBOX_POLICY_DECISION_HASH_MISMATCH'
    | 'SANDBOX_POLICY_NOT_EVALUATED'
    | 'SANDBOX_POLICY_RISK_TIER_NOT_R2'
    | 'SANDBOX_POLICY_MODE_INVALID'
    | 'SANDBOX_POLICY_NOT_ALLOWED'
    | 'SANDBOX_POLICY_PERMISSION_MISSING'
    | 'SANDBOX_POLICY_REQUEST_MISMATCH'
    | 'SANDBOX_POLICY_BINDING_MISSING'
    | 'SANDBOX_POLICY_RECEIPT_INVALID'
    | 'SANDBOX_POLICY_HASH_STALE'
    | 'SANDBOX_POLICY_CONTEXT_HASH_STALE'
    | 'SANDBOX_SPEC_HASH_STALE'
    | 'SANDBOX_REGISTRY_SNAPSHOT_STALE'
    | 'SANDBOX_ACTIVE_LOCK_STALE'
    | 'SANDBOX_IDENTITY_INVALID'
    | 'SANDBOX_PATH_EMPTY'
    | 'SANDBOX_PATH_ABSOLUTE'
    | 'SANDBOX_PATH_BACKSLASH'
    | 'SANDBOX_PATH_TRAVERSAL'
    | 'SANDBOX_PATH_SYMLINK_FORBIDDEN'
    | 'SANDBOX_PATH_OUTSIDE_ATTEMPT_NAMESPACE'
    | 'SANDBOX_PATH_OUTSIDE_WRITABLE_ROOT'
    | 'SANDBOX_PATH_FORBIDDEN_ACTIVE_REGISTRY'
    | 'SANDBOX_PATH_FORBIDDEN_ACTIVE_ARTIFACT'
    | 'SANDBOX_PATH_FORBIDDEN_GENERATED_PROJECT'
    | 'SANDBOX_PATH_FORBIDDEN_REPO_SOURCE'
    | 'SANDBOX_PATH_FORBIDDEN_PACKAGE_JSON'
    | 'SANDBOX_PATH_FORBIDDEN_DOTFILE'
    | 'SANDBOX_ENV_OVERRIDE_REJECTED'
    | 'SANDBOX_ENV_SECRET_REJECTED'
    | 'SANDBOX_COMMAND_NOT_ALLOWLISTED'
    | 'SANDBOX_COMMAND_MODEL_SUPPLIED_REJECTED'
    | 'SANDBOX_COMMAND_ARGS_OVERRIDE_REJECTED'
    | 'SANDBOX_COMMAND_ENV_OVERRIDE_REJECTED'
    | 'SANDBOX_COMMAND_PACKAGE_INSTALL_REJECTED'
    | 'SANDBOX_NETWORK_PROBE_SUCCEEDED'
    | 'SANDBOX_NETWORK_PROBE_NOT_RUN'
    | 'SANDBOX_NETWORK_EVIDENCE_MISSING'
    | 'SANDBOX_RESOURCE_PID_LIMIT_EXCEEDED'
    | 'SANDBOX_RESOURCE_CPU_LIMIT_EXCEEDED'
    | 'SANDBOX_RESOURCE_MEMORY_LIMIT_EXCEEDED'
    | 'SANDBOX_RESOURCE_TIMEOUT_EXCEEDED'
    | 'SANDBOX_RESOURCE_OUTPUT_LIMIT_EXCEEDED'
    | 'SANDBOX_RESOURCE_FILE_LIMIT_EXCEEDED'
    | 'SANDBOX_ATTEMPT_MANIFEST_HASH_MISMATCH'
    | 'SANDBOX_ATTEMPT_BINDING_MISMATCH'
    | 'SANDBOX_CHILD_ARTIFACT_HASH_MISMATCH'
    | 'SANDBOX_CHILD_ARTIFACT_IDENTITY_MISMATCH'
    | 'SANDBOX_CHILD_ARTIFACT_STATUS_FAILED'
    | 'SANDBOX_COMMAND_LOG_ENTRY_HASH_MISMATCH';
  message: string;
  path?: string;
  key?: string;
};

export type CapabilitySynthesisSandboxResourceBudget = {
  maxCpuCores: number;
  maxMemoryMb: number;
  maxPids: number;
  perCommandTimeoutSeconds: number;
  totalAttemptTimeoutSeconds: number;
  maxCandidateSourceBytes: number;
  maxBuildOutputBytes: number;
  maxOpenFiles: number;
};

export type CapabilitySynthesisSandboxPolicy = {
  artifactKind: typeof CAPABILITY_SYNTHESIS_SANDBOX_POLICY_KIND;
  schemaVersion: typeof CAPABILITY_SYNTHESIS_SANDBOX_SCHEMA_VERSION;
  sandboxPolicyVersion: typeof CAPABILITY_SYNTHESIS_SANDBOX_POLICY_VERSION;
  allowedCommandIds: CapabilitySynthesisSandboxCommandId[];
  envAllowlist: CapabilitySynthesisSandboxEnvKey[];
  network: {
    mode: 'none';
    dns: 'none';
    proxyEnv: 'empty';
    cloudMetadata: 'unreachable';
  };
  process: {
    user: 'non-root';
    noSetuid: true;
    seccomp: 'required';
    nestedContainer: 'forbidden';
  };
  resourceBudget: CapabilitySynthesisSandboxResourceBudget;
  mounts: CapabilitySynthesisSandboxMount[];
  forbiddenMounts: string[];
  sandboxPolicyHash: string;
};

export type CapabilitySynthesisSandboxMount = {
  mountPoint: '/read-only-sdk' | '/read-only-contracts' | '/workspace' | '/tmp';
  access: 'read-only' | 'writable-candidate-only' | 'bounded-tmpfs';
};

export type CapabilitySynthesisWorkspaceManifest = {
  artifactKind: typeof CAPABILITY_SYNTHESIS_WORKSPACE_MANIFEST_KIND;
  schemaVersion: typeof CAPABILITY_SYNTHESIS_SANDBOX_SCHEMA_VERSION;
  requestId: string;
  attemptId: string;
  attemptRoot: string;
  directories: string[];
  writableRoots: string[];
  forbiddenPathPrefixes: string[];
  workspaceManifestHash: string;
};

export type CapabilitySynthesisSandboxMountManifest = {
  artifactKind: typeof CAPABILITY_SYNTHESIS_MOUNT_MANIFEST_KIND;
  schemaVersion: typeof CAPABILITY_SYNTHESIS_SANDBOX_SCHEMA_VERSION;
  sandboxPolicyHash: string;
  mounts: CapabilitySynthesisSandboxMount[];
  forbiddenMounts: string[];
  mountManifestHash: string;
};

export type CapabilitySynthesisSandboxGateReport = {
  status: 'allowed' | 'blocked';
  requestId?: string;
  attemptId?: string;
  policyDecisionHash?: string;
  issues: CapabilitySynthesisSandboxIssue[];
  reportHash: string;
};

export type CapabilitySynthesisWorkspacePathReport = {
  status: 'allowed' | 'blocked';
  requestId: string;
  attemptId: string;
  requestedPath: string;
  normalizedAttemptPath?: string;
  issues: CapabilitySynthesisSandboxIssue[];
  reportHash: string;
};

export type CapabilitySynthesisSandboxEnvironmentReport = {
  status: 'allowed' | 'blocked';
  env: Record<CapabilitySynthesisSandboxEnvKey, string>;
  issues: CapabilitySynthesisSandboxIssue[];
  reportHash: string;
};

export type CapabilitySynthesisSandboxCommandReport = {
  status: 'allowed' | 'blocked';
  commandId: string;
  issues: CapabilitySynthesisSandboxIssue[];
  reportHash: string;
};

export type CapabilitySynthesisNetworkProbeStatus = 'failed' | 'succeeded' | 'not_run';
export type CapabilitySynthesisNetworkProbeEvidence = {
  status: CapabilitySynthesisNetworkProbeStatus;
  target: string;
  startedAt: string;
  endedAt: string;
  observedErrorCategory: string;
  executorEvidenceId: string;
};

export type CapabilitySynthesisNetworkIsolationReport = {
  artifactKind: typeof CAPABILITY_SYNTHESIS_NETWORK_REPORT_KIND;
  schemaVersion: typeof CAPABILITY_SYNTHESIS_SANDBOX_SCHEMA_VERSION;
  requestId: string;
  attemptId: string;
  probes: {
    outboundTcp: CapabilitySynthesisNetworkProbeEvidence;
    dnsLookup: CapabilitySynthesisNetworkProbeEvidence;
    httpFetch: CapabilitySynthesisNetworkProbeEvidence;
    webSocket: CapabilitySynthesisNetworkProbeEvidence;
    cloudMetadata: CapabilitySynthesisNetworkProbeEvidence;
  };
  status: 'passed' | 'failed';
  issues: CapabilitySynthesisSandboxIssue[];
  networkIsolationReportHash: string;
};

export type CapabilitySynthesisStartupAttestation = {
  artifactKind: typeof CAPABILITY_SYNTHESIS_STARTUP_ATTESTATION_KIND;
  schemaVersion: typeof CAPABILITY_SYNTHESIS_SANDBOX_SCHEMA_VERSION;
  requestId: string;
  attemptId: string;
  sandboxPolicyHash: string;
  workspaceManifestHash: string;
  mountManifestHash: string;
  networkIsolationReportHash: string;
  status: 'passed' | 'failed';
  startupAttestationHash: string;
};

export type CapabilitySynthesisSandboxResourceUsage = {
  cpuCoresUsed: number;
  memoryMbUsed: number;
  pidsUsed: number;
  commandDurationSeconds: number;
  outputBytes: number;
  openFiles: number;
};

export type CapabilitySynthesisSandboxResourceReport = {
  artifactKind: typeof CAPABILITY_SYNTHESIS_RESOURCE_REPORT_KIND;
  schemaVersion: typeof CAPABILITY_SYNTHESIS_SANDBOX_SCHEMA_VERSION;
  requestId: string;
  attemptId: string;
  budget: CapabilitySynthesisSandboxResourceBudget;
  usage: CapabilitySynthesisSandboxResourceUsage;
  status: 'passed' | 'failed';
  issues: CapabilitySynthesisSandboxIssue[];
  resourceReportHash: string;
};

export type CapabilitySynthesisSandboxCommandLogEntry = {
  commandId: CapabilitySynthesisSandboxCommandId;
  fixedCommandName: string;
  startedAt: string;
  endedAt: string;
  exitCode: number;
  timeout: boolean;
  stdoutHash: string;
  stderrHash: string;
  sanitizedStdoutPreview: string;
  sanitizedStderrPreview: string;
  resourceUsage: CapabilitySynthesisSandboxResourceUsage;
  sandboxRuntime: {
    image: string;
    version: string;
    policyVersion: typeof CAPABILITY_SYNTHESIS_SANDBOX_POLICY_VERSION;
  };
  entryHash: string;
};

export type CapabilitySynthesisSandboxCommandLog = {
  artifactKind: typeof CAPABILITY_SYNTHESIS_COMMAND_LOG_KIND;
  schemaVersion: typeof CAPABILITY_SYNTHESIS_SANDBOX_SCHEMA_VERSION;
  requestId: string;
  attemptId: string;
  entries: CapabilitySynthesisSandboxCommandLogEntry[];
  commandLogHash: string;
};

export type CapabilitySynthesisAttemptManifest = {
  artifactKind: typeof CAPABILITY_SYNTHESIS_ATTEMPT_MANIFEST_KIND;
  schemaVersion: typeof CAPABILITY_SYNTHESIS_SANDBOX_SCHEMA_VERSION;
  requestId: string;
  attemptId: string;
  policyDecisionHash: string;
  decisionContextHash: string;
  policyVersion: string;
  specificationHash: string;
  registrySnapshotHash: string;
  activeCapabilityLockHash: string;
  workspaceManifestHash: string;
  sandboxPolicyHash: string;
  mountManifestHash: string;
  startupAttestationHash: string;
  networkIsolationReportHash: string;
  commandLogHash: string;
  resourceReportHash: string;
  violationReportHash?: string;
  attemptManifestHash: string;
};

export const DEFAULT_CAPABILITY_SYNTHESIS_SANDBOX_RESOURCE_BUDGET: CapabilitySynthesisSandboxResourceBudget = {
  maxCpuCores: 2,
  maxMemoryMb: 1024,
  maxPids: 64,
  perCommandTimeoutSeconds: 120,
  totalAttemptTimeoutSeconds: 600,
  maxCandidateSourceBytes: 256 * 1024,
  maxBuildOutputBytes: 5 * 1024 * 1024,
  maxOpenFiles: 256
};

const DEFAULT_WORKSPACE_DIRECTORIES = ['source', 'generated-tests', 'external-tests', 'artifacts', 'logs', 'preview'] as const;
const DEFAULT_FORBIDDEN_PATH_PREFIXES = [
  'apps/',
  'packages/',
  'scripts/',
  'artifacts/',
  'data/artifacts/',
  'generated-projects/',
  'data/generated-projects/',
  'local-data/gameplay-capability-registry/',
  'local-data/capability-registry/'
] as const;

export function buildCapabilitySynthesisSandboxPolicy(
  input: { resourceBudget?: Partial<CapabilitySynthesisSandboxResourceBudget> } = {}
): CapabilitySynthesisSandboxPolicy {
  const payload: Omit<CapabilitySynthesisSandboxPolicy, 'sandboxPolicyHash'> = {
    artifactKind: CAPABILITY_SYNTHESIS_SANDBOX_POLICY_KIND,
    schemaVersion: CAPABILITY_SYNTHESIS_SANDBOX_SCHEMA_VERSION,
    sandboxPolicyVersion: CAPABILITY_SYNTHESIS_SANDBOX_POLICY_VERSION,
    allowedCommandIds: [...CAPABILITY_SYNTHESIS_SANDBOX_COMMAND_IDS],
    envAllowlist: [...CAPABILITY_SYNTHESIS_SANDBOX_ENV_ALLOWLIST],
    network: {
      mode: 'none',
      dns: 'none',
      proxyEnv: 'empty',
      cloudMetadata: 'unreachable'
    },
    process: {
      user: 'non-root',
      noSetuid: true,
      seccomp: 'required',
      nestedContainer: 'forbidden'
    },
    resourceBudget: tightenResourceBudget(input.resourceBudget),
    mounts: [
      { mountPoint: '/read-only-sdk', access: 'read-only' },
      { mountPoint: '/read-only-contracts', access: 'read-only' },
      { mountPoint: '/workspace', access: 'writable-candidate-only' },
      { mountPoint: '/tmp', access: 'bounded-tmpfs' }
    ],
    forbiddenMounts: ['repository_root_writable', 'user_home', '.env', '.git', 'ssh_agent', 'docker_socket', 'host_tmp', 'active_registry_store', 'active_project_artifact_store']
  };
  return { ...payload, sandboxPolicyHash: hashStableJson(payload) };
}

export function buildCapabilitySynthesisWorkspaceManifest(input: { requestId: string; attemptId: string }): CapabilitySynthesisWorkspaceManifest {
  const attemptRoot = `local-data/capability-synthesis/${input.requestId}/attempts/${input.attemptId}`;
  const payload: Omit<CapabilitySynthesisWorkspaceManifest, 'workspaceManifestHash'> = {
    artifactKind: CAPABILITY_SYNTHESIS_WORKSPACE_MANIFEST_KIND,
    schemaVersion: CAPABILITY_SYNTHESIS_SANDBOX_SCHEMA_VERSION,
    requestId: input.requestId,
    attemptId: input.attemptId,
    attemptRoot,
    directories: [...DEFAULT_WORKSPACE_DIRECTORIES],
    writableRoots: [...DEFAULT_WORKSPACE_DIRECTORIES],
    forbiddenPathPrefixes: [...DEFAULT_FORBIDDEN_PATH_PREFIXES]
  };
  return { ...payload, workspaceManifestHash: hashStableJson(payload) };
}

export function buildCapabilitySynthesisMountManifest(input: { sandboxPolicy: CapabilitySynthesisSandboxPolicy }): CapabilitySynthesisSandboxMountManifest {
  const payload: Omit<CapabilitySynthesisSandboxMountManifest, 'mountManifestHash'> = {
    artifactKind: CAPABILITY_SYNTHESIS_MOUNT_MANIFEST_KIND,
    schemaVersion: CAPABILITY_SYNTHESIS_SANDBOX_SCHEMA_VERSION,
    sandboxPolicyHash: input.sandboxPolicy.sandboxPolicyHash,
    mounts: input.sandboxPolicy.mounts,
    forbiddenMounts: input.sandboxPolicy.forbiddenMounts
  };
  return { ...payload, mountManifestHash: hashStableJson(payload) };
}

export function validateCapabilitySynthesisSandboxGate(input: {
  policyDecision: CapabilitySynthesisPolicyDecision;
  trustedPolicyDecisionReceiptRef: CapabilitySynthesisPolicyDecisionReceipt['trustedArtifactRef'];
  trustedPolicyDecisionStore: CapabilitySynthesisPolicyDecisionReceiptResolver;
  requestId: string;
  attemptId: string;
  expectedPolicyDecisionHash: string;
  expectedSpecificationHash: string;
  expectedRegistrySnapshotHash: string;
  expectedActiveCapabilityLockHash: string;
}): CapabilitySynthesisSandboxGateReport {
  const trustedPolicyDecisionReceipt = resolveTrustedPolicyDecisionReceipt({
    receiptRef: input.trustedPolicyDecisionReceiptRef,
    store: input.trustedPolicyDecisionStore
  });
  const issues: CapabilitySynthesisSandboxIssue[] = [
    ...identityIssues(input.requestId, input.attemptId),
    ...policyDecisionIssues({ ...input, trustedPolicyDecisionReceipt })
  ].sort(compareIssues);
  const payload: Omit<CapabilitySynthesisSandboxGateReport, 'reportHash'> = {
    status: issues.length === 0 ? 'allowed' : 'blocked',
    requestId: input.requestId,
    attemptId: input.attemptId,
    policyDecisionHash: input.policyDecision.decisionHash,
    issues
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

export function validateCapabilitySynthesisWorkspacePath(input: {
  workspaceManifest: CapabilitySynthesisWorkspaceManifest;
  requestedPath: string;
  pathKind?: 'file' | 'symlink';
}): CapabilitySynthesisWorkspacePathReport {
  const normalized = normalizeAttemptPath(input.requestedPath, input.workspaceManifest.attemptRoot);
  const normalizedPath = normalized.normalizedAttemptPath;
  const issues = [
    ...identityIssues(input.workspaceManifest.requestId, input.workspaceManifest.attemptId),
    ...normalized.issues,
    ...(input.pathKind === 'symlink' ? [issue('SANDBOX_PATH_SYMLINK_FORBIDDEN', 'Sandbox workspace rejects symlink entries.', input.requestedPath)] : []),
    ...(normalizedPath === undefined ? [] : workspacePathBoundaryIssues(normalizedPath, input.workspaceManifest))
  ].sort(compareIssues);
  const payload: Omit<CapabilitySynthesisWorkspacePathReport, 'reportHash'> = {
    status: issues.length === 0 ? 'allowed' : 'blocked',
    requestId: input.workspaceManifest.requestId,
    attemptId: input.workspaceManifest.attemptId,
    requestedPath: input.requestedPath,
    ...(normalizedPath === undefined ? {} : { normalizedAttemptPath: normalizedPath }),
    issues
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

export function buildCapabilitySynthesisSandboxEnvironment(input: {
  attemptId: string;
  deterministicSeed: string;
  requestedEnv?: Record<string, string>;
}): CapabilitySynthesisSandboxEnvironmentReport {
  const env: Record<CapabilitySynthesisSandboxEnvKey, string> = {
    NODE_ENV: 'test',
    CAPABILITY_SYNTHESIS_ATTEMPT_ID: input.attemptId,
    DETERMINISTIC_SEED: input.deterministicSeed,
    TZ: 'UTC',
    LANG: 'C'
  };
  const requestedEnv = input.requestedEnv ?? {};
  const issues = Object.keys(requestedEnv)
    .flatMap((key) => {
      if (isSecretLikeEnvKey(key)) {
        return [issue('SANDBOX_ENV_SECRET_REJECTED', `Sandbox environment rejects secret-like key ${key}.`, undefined, key)];
      }
      return [issue('SANDBOX_ENV_OVERRIDE_REJECTED', `Sandbox environment ignores caller-provided env key ${key}.`, undefined, key)];
    })
    .sort(compareIssues);
  const payload: Omit<CapabilitySynthesisSandboxEnvironmentReport, 'reportHash'> = {
    status: issues.length === 0 ? 'allowed' : 'blocked',
    env,
    issues
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

export function validateCapabilitySynthesisSandboxCommand(input: {
  commandId: string;
  modelProvidedCommand?: string;
  argsOverride?: readonly string[];
  envOverride?: Record<string, string>;
}): CapabilitySynthesisSandboxCommandReport {
  const issues: CapabilitySynthesisSandboxIssue[] = [];
  if (!CAPABILITY_SYNTHESIS_SANDBOX_COMMAND_IDS.includes(input.commandId as CapabilitySynthesisSandboxCommandId)) {
    issues.push(issue('SANDBOX_COMMAND_NOT_ALLOWLISTED', `Sandbox command ${input.commandId} is not allowlisted.`));
  }
  if (isPackageManagerCommand(input.commandId) || isPackageManagerCommand(input.modelProvidedCommand ?? '')) {
    issues.push(issue('SANDBOX_COMMAND_PACKAGE_INSTALL_REJECTED', 'Sandbox rejects package manager install commands.'));
  }
  if (input.modelProvidedCommand !== undefined) {
    issues.push(issue('SANDBOX_COMMAND_MODEL_SUPPLIED_REJECTED', 'Sandbox rejects model-provided shell commands.'));
  }
  if (input.argsOverride !== undefined && input.argsOverride.length > 0) {
    issues.push(issue('SANDBOX_COMMAND_ARGS_OVERRIDE_REJECTED', 'Sandbox rejects command argument overrides.'));
  }
  if (input.envOverride !== undefined && Object.keys(input.envOverride).length > 0) {
    issues.push(issue('SANDBOX_COMMAND_ENV_OVERRIDE_REJECTED', 'Sandbox rejects command environment overrides.'));
  }
  const sortedIssues = issues.sort(compareIssues);
  const payload: Omit<CapabilitySynthesisSandboxCommandReport, 'reportHash'> = {
    status: sortedIssues.length === 0 ? 'allowed' : 'blocked',
    commandId: input.commandId,
    issues: sortedIssues
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

export function buildCapabilitySynthesisNetworkIsolationReport(input: {
  requestId: string;
  attemptId: string;
  probes: CapabilitySynthesisNetworkIsolationReport['probes'];
}): CapabilitySynthesisNetworkIsolationReport {
  const issues = Object.entries(input.probes)
    .flatMap(([key, value]) => {
      const evidenceIssues =
        value.target.trim().length > 0 &&
        value.startedAt.trim().length > 0 &&
        value.endedAt.trim().length > 0 &&
        value.observedErrorCategory.trim().length > 0 &&
        value.executorEvidenceId.trim().length > 0
          ? []
          : [issue('SANDBOX_NETWORK_EVIDENCE_MISSING', `Sandbox network probe ${key} is missing executable evidence.`, undefined, key)];
      if (value.status === 'failed') {
        return evidenceIssues;
      }
      return [
        ...evidenceIssues,
        issue(
          value.status === 'not_run' ? 'SANDBOX_NETWORK_PROBE_NOT_RUN' : 'SANDBOX_NETWORK_PROBE_SUCCEEDED',
          `Sandbox network probe ${key} must fail but was ${value.status}.`,
          undefined,
          key
        )
      ];
    })
    .sort(compareIssues);
  const payload: Omit<CapabilitySynthesisNetworkIsolationReport, 'networkIsolationReportHash'> = {
    artifactKind: CAPABILITY_SYNTHESIS_NETWORK_REPORT_KIND,
    schemaVersion: CAPABILITY_SYNTHESIS_SANDBOX_SCHEMA_VERSION,
    requestId: input.requestId,
    attemptId: input.attemptId,
    probes: input.probes,
    status: issues.length === 0 ? 'passed' : 'failed',
    issues
  };
  return { ...payload, networkIsolationReportHash: hashStableJson(payload) };
}

export function buildCapabilitySynthesisStartupAttestation(input: {
  requestId: string;
  attemptId: string;
  sandboxPolicyHash: string;
  workspaceManifestHash: string;
  mountManifestHash: string;
  networkIsolationReport: CapabilitySynthesisNetworkIsolationReport;
}): CapabilitySynthesisStartupAttestation {
  const payload: Omit<CapabilitySynthesisStartupAttestation, 'startupAttestationHash'> = {
    artifactKind: CAPABILITY_SYNTHESIS_STARTUP_ATTESTATION_KIND,
    schemaVersion: CAPABILITY_SYNTHESIS_SANDBOX_SCHEMA_VERSION,
    requestId: input.requestId,
    attemptId: input.attemptId,
    sandboxPolicyHash: input.sandboxPolicyHash,
    workspaceManifestHash: input.workspaceManifestHash,
    mountManifestHash: input.mountManifestHash,
    networkIsolationReportHash: input.networkIsolationReport.networkIsolationReportHash,
    status: input.networkIsolationReport.status
  };
  return { ...payload, startupAttestationHash: hashStableJson(payload) };
}

export function buildCapabilitySynthesisSandboxResourceReport(input: {
  requestId: string;
  attemptId: string;
  budget: CapabilitySynthesisSandboxResourceBudget;
  usage: CapabilitySynthesisSandboxResourceUsage;
}): CapabilitySynthesisSandboxResourceReport {
  const issues = resourceIssues(input.budget, input.usage).sort(compareIssues);
  const payload: Omit<CapabilitySynthesisSandboxResourceReport, 'resourceReportHash'> = {
    artifactKind: CAPABILITY_SYNTHESIS_RESOURCE_REPORT_KIND,
    schemaVersion: CAPABILITY_SYNTHESIS_SANDBOX_SCHEMA_VERSION,
    requestId: input.requestId,
    attemptId: input.attemptId,
    budget: input.budget,
    usage: input.usage,
    status: issues.length === 0 ? 'passed' : 'failed',
    issues
  };
  return { ...payload, resourceReportHash: hashStableJson(payload) };
}

export function buildCapabilitySynthesisSandboxCommandLogEntry(input: {
  commandId: CapabilitySynthesisSandboxCommandId;
  fixedCommandName: string;
  startedAt: string;
  endedAt: string;
  exitCode: number;
  timeout: boolean;
  stdout: string;
  stderr: string;
  resourceUsage: CapabilitySynthesisSandboxResourceUsage;
  sandboxRuntime: {
    image: string;
    version: string;
    policyVersion?: typeof CAPABILITY_SYNTHESIS_SANDBOX_POLICY_VERSION;
  };
}): CapabilitySynthesisSandboxCommandLogEntry {
  const payload: Omit<CapabilitySynthesisSandboxCommandLogEntry, 'entryHash'> = {
    commandId: input.commandId,
    fixedCommandName: input.fixedCommandName,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    exitCode: input.exitCode,
    timeout: input.timeout,
    stdoutHash: hashStableJson(input.stdout),
    stderrHash: hashStableJson(input.stderr),
    sanitizedStdoutPreview: sanitizeSandboxLogPreview(input.stdout),
    sanitizedStderrPreview: sanitizeSandboxLogPreview(input.stderr),
    resourceUsage: input.resourceUsage,
    sandboxRuntime: {
      image: input.sandboxRuntime.image,
      version: input.sandboxRuntime.version,
      policyVersion: input.sandboxRuntime.policyVersion ?? CAPABILITY_SYNTHESIS_SANDBOX_POLICY_VERSION
    }
  };
  return { ...payload, entryHash: hashStableJson(payload) };
}

export function buildCapabilitySynthesisSandboxCommandLog(input: {
  requestId: string;
  attemptId: string;
  entries: CapabilitySynthesisSandboxCommandLogEntry[];
}): CapabilitySynthesisSandboxCommandLog {
  const payload: Omit<CapabilitySynthesisSandboxCommandLog, 'commandLogHash'> = {
    artifactKind: CAPABILITY_SYNTHESIS_COMMAND_LOG_KIND,
    schemaVersion: CAPABILITY_SYNTHESIS_SANDBOX_SCHEMA_VERSION,
    requestId: input.requestId,
    attemptId: input.attemptId,
    entries: input.entries
  };
  return { ...payload, commandLogHash: hashStableJson(payload) };
}

export function buildCapabilitySynthesisAttemptManifest(input: {
  requestId: string;
  attemptId: string;
  policyDecision: CapabilitySynthesisPolicyDecision;
  workspaceManifest: CapabilitySynthesisWorkspaceManifest;
  sandboxPolicy: CapabilitySynthesisSandboxPolicy;
  mountManifest: CapabilitySynthesisSandboxMountManifest;
  startupAttestation: CapabilitySynthesisStartupAttestation;
  networkIsolationReport: CapabilitySynthesisNetworkIsolationReport;
  commandLog: CapabilitySynthesisSandboxCommandLog;
  resourceReport: CapabilitySynthesisSandboxResourceReport;
  violationReportHash?: string;
}): CapabilitySynthesisAttemptManifest {
  const payload: Omit<CapabilitySynthesisAttemptManifest, 'attemptManifestHash'> = {
    artifactKind: CAPABILITY_SYNTHESIS_ATTEMPT_MANIFEST_KIND,
    schemaVersion: CAPABILITY_SYNTHESIS_SANDBOX_SCHEMA_VERSION,
    requestId: input.requestId,
    attemptId: input.attemptId,
    policyDecisionHash: input.policyDecision.decisionHash,
    decisionContextHash: input.policyDecision.decisionContextHash ?? '',
    policyVersion: input.policyDecision.policyVersion,
    specificationHash: input.policyDecision.specificationHash ?? '',
    registrySnapshotHash: input.policyDecision.registrySnapshotHash ?? '',
    activeCapabilityLockHash: input.policyDecision.activeCapabilityLockHash ?? '',
    workspaceManifestHash: input.workspaceManifest.workspaceManifestHash,
    sandboxPolicyHash: input.sandboxPolicy.sandboxPolicyHash,
    mountManifestHash: input.mountManifest.mountManifestHash,
    startupAttestationHash: input.startupAttestation.startupAttestationHash,
    networkIsolationReportHash: input.networkIsolationReport.networkIsolationReportHash,
    commandLogHash: input.commandLog.commandLogHash,
    resourceReportHash: input.resourceReport.resourceReportHash,
    ...(input.violationReportHash === undefined ? {} : { violationReportHash: input.violationReportHash })
  };
  return { ...payload, attemptManifestHash: hashStableJson(payload) };
}

export function validateCapabilitySynthesisAttemptManifestIntegrity(input: {
  manifest: CapabilitySynthesisAttemptManifest;
  policyDecision: CapabilitySynthesisPolicyDecision;
  workspaceManifest: CapabilitySynthesisWorkspaceManifest;
  sandboxPolicy: CapabilitySynthesisSandboxPolicy;
  mountManifest: CapabilitySynthesisSandboxMountManifest;
  startupAttestation: CapabilitySynthesisStartupAttestation;
  networkIsolationReport: CapabilitySynthesisNetworkIsolationReport;
  commandLog: CapabilitySynthesisSandboxCommandLog;
  resourceReport: CapabilitySynthesisSandboxResourceReport;
}): CapabilitySynthesisSandboxGateReport {
  const expectedManifest = buildCapabilitySynthesisAttemptManifest({
    requestId: input.manifest.requestId,
    attemptId: input.manifest.attemptId,
    policyDecision: input.policyDecision,
    workspaceManifest: input.workspaceManifest,
    sandboxPolicy: input.sandboxPolicy,
    mountManifest: input.mountManifest,
    startupAttestation: input.startupAttestation,
    networkIsolationReport: input.networkIsolationReport,
    commandLog: input.commandLog,
    resourceReport: input.resourceReport,
    violationReportHash: input.manifest.violationReportHash
  });
  const issues = [
    ...(expectedManifest.attemptManifestHash === input.manifest.attemptManifestHash &&
    hashStableJson(candidateManifestWithoutHash(input.manifest)) === input.manifest.attemptManifestHash
      ? []
      : [issue('SANDBOX_ATTEMPT_MANIFEST_HASH_MISMATCH', 'Attempt manifest hash chain does not match current sandbox evidence.')]),
    ...attemptManifestChildArtifactIssues(input)
  ].sort(compareIssues);
  const payload: Omit<CapabilitySynthesisSandboxGateReport, 'reportHash'> = {
    status: issues.length === 0 ? 'allowed' : 'blocked',
    requestId: input.manifest.requestId,
    attemptId: input.manifest.attemptId,
    policyDecisionHash: input.manifest.policyDecisionHash,
    issues
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

export function sanitizeSandboxLogPreview(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [redacted]')
    .replace(/(OPENAI_API_KEY|ANTHROPIC_API_KEY|DEEPSEEK_API_KEY|TOKEN|SECRET)=\S+/gi, '$1=[redacted]')
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, 'sk-[redacted]')
    .replace(/\/(?:Users|home|private|var|tmp|Volumes)\/[^\s'"`]+/g, '[host-path]')
    .slice(0, 500);
}

function policyDecisionIssues(input: {
  policyDecision: CapabilitySynthesisPolicyDecision;
  trustedPolicyDecisionReceipt: CapabilitySynthesisPolicyDecisionReceipt | undefined;
  trustedPolicyDecisionReceiptRef: CapabilitySynthesisPolicyDecisionReceipt['trustedArtifactRef'];
  trustedPolicyDecisionStore: CapabilitySynthesisPolicyDecisionReceiptResolver;
  requestId: string;
  expectedPolicyDecisionHash: string;
  expectedSpecificationHash: string;
  expectedRegistrySnapshotHash: string;
  expectedActiveCapabilityLockHash: string;
}): CapabilitySynthesisSandboxIssue[] {
  const decision = input.policyDecision;
  const receiptValid = validateCapabilitySynthesisPolicyDecisionReceipt({
    decision,
    receipt: input.trustedPolicyDecisionReceipt,
    receiptRef: input.trustedPolicyDecisionReceiptRef,
    trustedPolicyDecisionStore: input.trustedPolicyDecisionStore
  });
  const expectedDecisionContextHash = input.trustedPolicyDecisionReceipt?.subject.decisionContextHash ?? '';
  return [
    ...(decision.artifactKind !== CAPABILITY_SYNTHESIS_POLICY_REPORT_KIND || decision.schemaVersion !== CAPABILITY_SYNTHESIS_POLICY_REPORT_SCHEMA_VERSION
      ? [issue('SANDBOX_POLICY_DECISION_KIND_INVALID', 'Sandbox requires a capability synthesis policy report.')]
      : []),
    ...(decision.decisionHash !== recomputePolicyDecisionHash(decision)
      ? [issue('SANDBOX_POLICY_DECISION_HASH_MISMATCH', 'Policy decision hash does not match payload.')]
      : []),
    ...(decision.policyEvaluationStatus === 'EVALUATED' ? [] : [issue('SANDBOX_POLICY_NOT_EVALUATED', 'Sandbox requires an evaluated policy decision.')]),
    ...(decision.requestId !== input.requestId ? [issue('SANDBOX_POLICY_REQUEST_MISMATCH', 'Policy decision request does not match sandbox attempt request.')] : []),
    ...(receiptValid ? [] : [issue('SANDBOX_POLICY_RECEIPT_INVALID', 'Sandbox requires a trusted policy decision receipt.')]),
    ...(decision.decisionHash !== input.expectedPolicyDecisionHash ? [issue('SANDBOX_POLICY_HASH_STALE', 'Policy decision hash does not match trusted input.')] : []),
    ...(decision.riskTier !== 'R2_BOUNDED_RUNTIME_MODULE' ? [issue('SANDBOX_POLICY_RISK_TIER_NOT_R2', 'Only R2 bounded runtime modules can enter sandbox.')] : []),
    ...(decision.mode !== 'BOUNDED_TYPED_RUNTIME_MODULE' ? [issue('SANDBOX_POLICY_MODE_INVALID', 'Sandbox requires bounded typed runtime module mode.')] : []),
    ...(decision.allowed !== true ? [issue('SANDBOX_POLICY_NOT_ALLOWED', 'Policy report is not allowed.')] : []),
    ...(decision.implementationSandboxAllowed !== true ? [issue('SANDBOX_POLICY_PERMISSION_MISSING', 'Policy report does not allow implementation sandbox.')] : []),
    ...bindingIssues('decisionContextHash', decision.decisionContextHash, expectedDecisionContextHash, 'SANDBOX_POLICY_CONTEXT_HASH_STALE'),
    ...bindingIssues('specificationHash', decision.specificationHash, input.expectedSpecificationHash, 'SANDBOX_SPEC_HASH_STALE'),
    ...bindingIssues('registrySnapshotHash', decision.registrySnapshotHash, input.expectedRegistrySnapshotHash, 'SANDBOX_REGISTRY_SNAPSHOT_STALE'),
    ...bindingIssues('activeCapabilityLockHash', decision.activeCapabilityLockHash, input.expectedActiveCapabilityLockHash, 'SANDBOX_ACTIVE_LOCK_STALE')
  ];
}

function resolveTrustedPolicyDecisionReceipt(input: {
  receiptRef: CapabilitySynthesisPolicyDecisionReceipt['trustedArtifactRef'];
  store: CapabilitySynthesisPolicyDecisionReceiptResolver;
}): CapabilitySynthesisPolicyDecisionReceipt | undefined {
  return input.store.namespace === CAPABILITY_SYNTHESIS_POLICY_DECISION_TRUSTED_NAMESPACE
    ? input.store.resolveReceipt(input.receiptRef)
    : undefined;
}

function bindingIssues(
  key: string,
  actual: string | undefined,
  expected: string,
  staleCode: CapabilitySynthesisSandboxIssue['code']
): CapabilitySynthesisSandboxIssue[] {
  if (actual === undefined || actual.trim().length === 0 || expected.trim().length === 0) {
    return [issue('SANDBOX_POLICY_BINDING_MISSING', `Sandbox policy binding ${key} is missing.`, undefined, key)];
  }
  return actual === expected ? [] : [issue(staleCode, `Sandbox policy binding ${key} does not match trusted input.`, undefined, key)];
}

function identityIssues(requestId: string, attemptId: string): CapabilitySynthesisSandboxIssue[] {
  const issues: CapabilitySynthesisSandboxIssue[] = [];
  if (!isCapabilitySynthesisRequestId(requestId)) {
    issues.push(issue('SANDBOX_IDENTITY_INVALID', `Invalid capability synthesis request ID: ${requestId}.`));
  }
  if (!isCapabilitySynthesisAttemptId(attemptId) || !isCapabilitySynthesisAttemptIdForRequest(attemptId, requestId)) {
    issues.push(issue('SANDBOX_IDENTITY_INVALID', `Invalid capability synthesis attempt ID ${attemptId} for request ${requestId}.`));
  }
  return issues;
}

function normalizeAttemptPath(path: string, attemptRoot: string): {
  normalizedAttemptPath?: string;
  issues: CapabilitySynthesisSandboxIssue[];
} {
  const trimmedPath = path.trim();
  if (trimmedPath.length === 0) {
    return { issues: [issue('SANDBOX_PATH_EMPTY', 'Sandbox workspace path is empty.')] };
  }
  const issues: CapabilitySynthesisSandboxIssue[] = [];
  if (trimmedPath.startsWith('/')) {
    issues.push(issue('SANDBOX_PATH_ABSOLUTE', 'Sandbox workspace path must be attempt-relative.', trimmedPath));
  }
  if (trimmedPath.includes('\\')) {
    issues.push(issue('SANDBOX_PATH_BACKSLASH', 'Sandbox workspace path must use POSIX separators.', trimmedPath));
  }
  const attemptRelative = trimmedPath === attemptRoot ? '' : trimmedPath.startsWith(`${attemptRoot}/`) ? trimmedPath.slice(attemptRoot.length + 1) : trimmedPath;
  const segments = attemptRelative.split('/').filter((segment) => segment.length > 0 && segment !== '.');
  if (segments.includes('..')) {
    issues.push(issue('SANDBOX_PATH_TRAVERSAL', 'Sandbox workspace path cannot contain traversal segments.', trimmedPath));
  }
  return issues.length > 0 ? { issues } : { normalizedAttemptPath: segments.join('/'), issues: [] };
}

function workspacePathBoundaryIssues(normalizedPath: string, manifest: CapabilitySynthesisWorkspaceManifest): CapabilitySynthesisSandboxIssue[] {
  const issues: CapabilitySynthesisSandboxIssue[] = [];
  if (normalizedPath.length === 0) {
    issues.push(issue('SANDBOX_PATH_OUTSIDE_WRITABLE_ROOT', 'Sandbox write must target a declared writable root.', normalizedPath));
  }
  if (normalizedPath === 'package.json' || normalizedPath.endsWith('/package.json')) {
    issues.push(issue('SANDBOX_PATH_FORBIDDEN_PACKAGE_JSON', 'Sandbox cannot write package.json.', normalizedPath));
  }
  if (normalizedPath.split('/').some((segment) => segment.startsWith('.'))) {
    issues.push(issue('SANDBOX_PATH_FORBIDDEN_DOTFILE', 'Sandbox cannot write host dotfiles or secret files.', normalizedPath));
  }
  if (normalizedPath.startsWith('packages/') || normalizedPath.startsWith('apps/') || normalizedPath.startsWith('scripts/')) {
    issues.push(issue('SANDBOX_PATH_FORBIDDEN_REPO_SOURCE', 'Sandbox cannot write repository source tree paths.', normalizedPath));
  }
  if (normalizedPath.startsWith('artifacts/') || normalizedPath.startsWith('data/artifacts/')) {
    issues.push(issue('SANDBOX_PATH_FORBIDDEN_ACTIVE_ARTIFACT', 'Sandbox cannot write active artifact paths.', normalizedPath));
  }
  if (normalizedPath.startsWith('generated-projects/') || normalizedPath.startsWith('data/generated-projects/')) {
    issues.push(issue('SANDBOX_PATH_FORBIDDEN_GENERATED_PROJECT', 'Sandbox cannot write generated project paths.', normalizedPath));
  }
  if (normalizedPath.startsWith('local-data/gameplay-capability-registry/') || normalizedPath.startsWith('local-data/capability-registry/')) {
    issues.push(issue('SANDBOX_PATH_FORBIDDEN_ACTIVE_REGISTRY', 'Sandbox cannot write active registry paths.', normalizedPath));
  }
  if (!manifest.writableRoots.some((root) => normalizedPath === root || normalizedPath.startsWith(`${root}/`))) {
    issues.push(issue('SANDBOX_PATH_OUTSIDE_WRITABLE_ROOT', 'Sandbox write must stay under a declared writable root.', normalizedPath));
  }
  if (manifest.forbiddenPathPrefixes.some((prefix) => normalizedPath.startsWith(prefix))) {
    issues.push(issue('SANDBOX_PATH_OUTSIDE_ATTEMPT_NAMESPACE', 'Sandbox path resolves outside attempt namespace.', normalizedPath));
  }
  return issues;
}

function resourceIssues(
  budget: CapabilitySynthesisSandboxResourceBudget,
  usage: CapabilitySynthesisSandboxResourceUsage
): CapabilitySynthesisSandboxIssue[] {
  return [
    ...(usage.pidsUsed > budget.maxPids ? [issue('SANDBOX_RESOURCE_PID_LIMIT_EXCEEDED', 'Sandbox PID limit exceeded.')] : []),
    ...(usage.cpuCoresUsed > budget.maxCpuCores ? [issue('SANDBOX_RESOURCE_CPU_LIMIT_EXCEEDED', 'Sandbox CPU limit exceeded.')] : []),
    ...(usage.memoryMbUsed > budget.maxMemoryMb ? [issue('SANDBOX_RESOURCE_MEMORY_LIMIT_EXCEEDED', 'Sandbox memory limit exceeded.')] : []),
    ...(usage.commandDurationSeconds > budget.perCommandTimeoutSeconds ? [issue('SANDBOX_RESOURCE_TIMEOUT_EXCEEDED', 'Sandbox command timeout exceeded.')] : []),
    ...(usage.outputBytes > budget.maxBuildOutputBytes ? [issue('SANDBOX_RESOURCE_OUTPUT_LIMIT_EXCEEDED', 'Sandbox output size limit exceeded.')] : []),
    ...(usage.openFiles > budget.maxOpenFiles ? [issue('SANDBOX_RESOURCE_FILE_LIMIT_EXCEEDED', 'Sandbox open file limit exceeded.')] : [])
  ];
}

function tightenResourceBudget(input: Partial<CapabilitySynthesisSandboxResourceBudget> | undefined): CapabilitySynthesisSandboxResourceBudget {
  const defaults = DEFAULT_CAPABILITY_SYNTHESIS_SANDBOX_RESOURCE_BUDGET;
  return {
    maxCpuCores: tightenLimit(input?.maxCpuCores, defaults.maxCpuCores),
    maxMemoryMb: tightenLimit(input?.maxMemoryMb, defaults.maxMemoryMb),
    maxPids: tightenLimit(input?.maxPids, defaults.maxPids),
    perCommandTimeoutSeconds: tightenLimit(input?.perCommandTimeoutSeconds, defaults.perCommandTimeoutSeconds),
    totalAttemptTimeoutSeconds: tightenLimit(input?.totalAttemptTimeoutSeconds, defaults.totalAttemptTimeoutSeconds),
    maxCandidateSourceBytes: tightenLimit(input?.maxCandidateSourceBytes, defaults.maxCandidateSourceBytes),
    maxBuildOutputBytes: tightenLimit(input?.maxBuildOutputBytes, defaults.maxBuildOutputBytes),
    maxOpenFiles: tightenLimit(input?.maxOpenFiles, defaults.maxOpenFiles)
  };
}

function tightenLimit(value: number | undefined, defaultValue: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.min(value, defaultValue) : defaultValue;
}

function isSecretLikeEnvKey(key: string): boolean {
  return /(?:TOKEN|SECRET|KEY|PASSWORD|CREDENTIAL|AUTH|PROXY|NPM_CONFIG|YARN|PNPM)/i.test(key);
}

function isPackageManagerCommand(value: string): boolean {
  return /\b(?:npm|pnpm|yarn|bun)\s+(?:install|add|dlx|x)\b/.test(value) || /\b(?:pip|brew|cargo)\s+(?:install|add)\b/.test(value);
}

function recomputePolicyDecisionHash(decision: CapabilitySynthesisPolicyDecision): string {
  const { decisionHash: _decisionHash, ...payload } = decision;
  return hashStableJson(payload);
}

function candidateManifestWithoutHash(manifest: CapabilitySynthesisAttemptManifest): Omit<CapabilitySynthesisAttemptManifest, 'attemptManifestHash'> {
  const { attemptManifestHash: _attemptManifestHash, ...payload } = manifest;
  return payload;
}

function attemptManifestChildArtifactIssues(input: {
  manifest: CapabilitySynthesisAttemptManifest;
  policyDecision: CapabilitySynthesisPolicyDecision;
  workspaceManifest: CapabilitySynthesisWorkspaceManifest;
  sandboxPolicy: CapabilitySynthesisSandboxPolicy;
  mountManifest: CapabilitySynthesisSandboxMountManifest;
  startupAttestation: CapabilitySynthesisStartupAttestation;
  networkIsolationReport: CapabilitySynthesisNetworkIsolationReport;
  commandLog: CapabilitySynthesisSandboxCommandLog;
  resourceReport: CapabilitySynthesisSandboxResourceReport;
}): CapabilitySynthesisSandboxIssue[] {
  const { manifest } = input;
  return [
    ...identityBindingIssues('workspace_manifest', input.workspaceManifest.requestId, input.workspaceManifest.attemptId, manifest.requestId, manifest.attemptId),
    ...identityBindingIssues('network_report', input.networkIsolationReport.requestId, input.networkIsolationReport.attemptId, manifest.requestId, manifest.attemptId),
    ...identityBindingIssues('startup_attestation', input.startupAttestation.requestId, input.startupAttestation.attemptId, manifest.requestId, manifest.attemptId),
    ...identityBindingIssues('command_log', input.commandLog.requestId, input.commandLog.attemptId, manifest.requestId, manifest.attemptId),
    ...identityBindingIssues('resource_report', input.resourceReport.requestId, input.resourceReport.attemptId, manifest.requestId, manifest.attemptId),
    ...hashBindingIssue('policyDecisionHash', manifest.policyDecisionHash, input.policyDecision.decisionHash),
    ...hashBindingIssue('decisionContextHash', manifest.decisionContextHash, input.policyDecision.decisionContextHash ?? ''),
    ...hashBindingIssue('workspaceManifestHash', manifest.workspaceManifestHash, recomputeWorkspaceManifestHash(input.workspaceManifest)),
    ...hashBindingIssue('sandboxPolicyHash', manifest.sandboxPolicyHash, recomputeSandboxPolicyHash(input.sandboxPolicy)),
    ...hashBindingIssue('mountManifestHash', manifest.mountManifestHash, recomputeMountManifestHash(input.mountManifest)),
    ...hashBindingIssue('networkIsolationReportHash', manifest.networkIsolationReportHash, recomputeNetworkIsolationReportHash(input.networkIsolationReport)),
    ...hashBindingIssue('startupAttestationHash', manifest.startupAttestationHash, recomputeStartupAttestationHash(input.startupAttestation)),
    ...hashBindingIssue('commandLogHash', manifest.commandLogHash, recomputeCommandLogHash(input.commandLog)),
    ...hashBindingIssue('resourceReportHash', manifest.resourceReportHash, recomputeResourceReportHash(input.resourceReport)),
    ...hashBindingIssue('mountManifest.sandboxPolicyHash', input.mountManifest.sandboxPolicyHash, input.sandboxPolicy.sandboxPolicyHash),
    ...hashBindingIssue('startupAttestation.sandboxPolicyHash', input.startupAttestation.sandboxPolicyHash, input.sandboxPolicy.sandboxPolicyHash),
    ...hashBindingIssue('startupAttestation.workspaceManifestHash', input.startupAttestation.workspaceManifestHash, input.workspaceManifest.workspaceManifestHash),
    ...hashBindingIssue('startupAttestation.mountManifestHash', input.startupAttestation.mountManifestHash, input.mountManifest.mountManifestHash),
    ...hashBindingIssue('startupAttestation.networkIsolationReportHash', input.startupAttestation.networkIsolationReportHash, input.networkIsolationReport.networkIsolationReportHash),
    ...(input.networkIsolationReport.status === 'passed' ? [] : [issue('SANDBOX_CHILD_ARTIFACT_STATUS_FAILED', 'Network isolation report must be passed.', undefined, 'networkIsolationReport')]),
    ...(input.startupAttestation.status === 'passed' ? [] : [issue('SANDBOX_CHILD_ARTIFACT_STATUS_FAILED', 'Startup attestation must be passed.', undefined, 'startupAttestation')]),
    ...(input.resourceReport.status === 'passed' ? [] : [issue('SANDBOX_CHILD_ARTIFACT_STATUS_FAILED', 'Resource report must be passed.', undefined, 'resourceReport')]),
    ...input.commandLog.entries.flatMap((entry) =>
      entry.entryHash === recomputeCommandLogEntryHash(entry)
        ? []
        : [issue('SANDBOX_COMMAND_LOG_ENTRY_HASH_MISMATCH', `Command log entry ${entry.commandId} hash does not match payload.`, undefined, entry.commandId)]
    )
  ];
}

function identityBindingIssues(
  artifactName: string,
  actualRequestId: string,
  actualAttemptId: string,
  expectedRequestId: string,
  expectedAttemptId: string
): CapabilitySynthesisSandboxIssue[] {
  return actualRequestId === expectedRequestId && actualAttemptId === expectedAttemptId
    ? []
    : [
        issue(
          'SANDBOX_CHILD_ARTIFACT_IDENTITY_MISMATCH',
          `${artifactName} request/attempt binding does not match attempt manifest.`,
          undefined,
          artifactName
        )
      ];
}

function hashBindingIssue(key: string, actual: string, expected: string): CapabilitySynthesisSandboxIssue[] {
  return actual === expected
    ? []
    : [issue('SANDBOX_CHILD_ARTIFACT_HASH_MISMATCH', `${key} does not match child artifact payload.`, undefined, key)];
}

function recomputeWorkspaceManifestHash(manifest: CapabilitySynthesisWorkspaceManifest): string {
  const { workspaceManifestHash: _workspaceManifestHash, ...payload } = manifest;
  return hashStableJson(payload);
}

function recomputeSandboxPolicyHash(policy: CapabilitySynthesisSandboxPolicy): string {
  const { sandboxPolicyHash: _sandboxPolicyHash, ...payload } = policy;
  return hashStableJson(payload);
}

function recomputeMountManifestHash(manifest: CapabilitySynthesisSandboxMountManifest): string {
  const { mountManifestHash: _mountManifestHash, ...payload } = manifest;
  return hashStableJson(payload);
}

function recomputeNetworkIsolationReportHash(report: CapabilitySynthesisNetworkIsolationReport): string {
  const { networkIsolationReportHash: _networkIsolationReportHash, ...payload } = report;
  return hashStableJson(payload);
}

function recomputeStartupAttestationHash(attestation: CapabilitySynthesisStartupAttestation): string {
  const { startupAttestationHash: _startupAttestationHash, ...payload } = attestation;
  return hashStableJson(payload);
}

function recomputeCommandLogHash(log: CapabilitySynthesisSandboxCommandLog): string {
  const { commandLogHash: _commandLogHash, ...payload } = log;
  return hashStableJson(payload);
}

function recomputeCommandLogEntryHash(entry: CapabilitySynthesisSandboxCommandLogEntry): string {
  const { entryHash: _entryHash, ...payload } = entry;
  return hashStableJson(payload);
}

function recomputeResourceReportHash(report: CapabilitySynthesisSandboxResourceReport): string {
  const { resourceReportHash: _resourceReportHash, ...payload } = report;
  return hashStableJson(payload);
}

function compareIssues(left: CapabilitySynthesisSandboxIssue, right: CapabilitySynthesisSandboxIssue): number {
  return `${left.code}:${left.path ?? ''}:${left.key ?? ''}`.localeCompare(`${right.code}:${right.path ?? ''}:${right.key ?? ''}`);
}

function issue(code: CapabilitySynthesisSandboxIssue['code'], message: string, path?: string, key?: string): CapabilitySynthesisSandboxIssue {
  return {
    code,
    message,
    ...(path === undefined ? {} : { path }),
    ...(key === undefined ? {} : { key })
  };
}
