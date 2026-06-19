import { describe, expect, it } from 'vitest';

import {
  CAPABILITY_SYNTHESIS_POLICY_REPORT_KIND,
  CAPABILITY_SYNTHESIS_POLICY_REPORT_SCHEMA_VERSION,
  CAPABILITY_SYNTHESIS_POLICY_DECISION_TRUSTED_NAMESPACE,
  CAPABILITY_SYNTHESIS_POLICY_VERSION,
  buildCapabilitySynthesisPolicyDecisionReceipt,
  CAPABILITY_SYNTHESIS_SANDBOX_POLICY_VERSION,
  buildCapabilitySynthesisAttemptId,
  buildCapabilitySynthesisAttemptManifest,
  buildCapabilitySynthesisMountManifest,
  buildCapabilitySynthesisNetworkIsolationReport,
  buildCapabilitySynthesisRequestIdentity,
  buildCapabilitySynthesisSandboxCommandLog,
  buildCapabilitySynthesisSandboxCommandLogEntry,
  buildCapabilitySynthesisSandboxEnvironment,
  buildCapabilitySynthesisSandboxPolicy,
  buildCapabilitySynthesisSandboxResourceReport,
  buildCapabilitySynthesisStartupAttestation,
  buildCapabilitySynthesisWorkspaceManifest,
  validateCapabilitySynthesisAttemptManifestIntegrity,
  validateCapabilitySynthesisSandboxCommand,
  validateCapabilitySynthesisSandboxGate,
  validateCapabilitySynthesisWorkspacePath,
  type CapabilitySynthesisPolicyDecision,
  type CapabilitySynthesisPolicyDecisionReceipt,
  type CapabilitySynthesisPolicyDecisionReceiptResolver
} from '../../packages/game-dsl/src/index.js';
import { hashStableJson } from '../../packages/game-dsl/src/gameplay-capabilities/stable-json.js';

describe('Step36 candidate workspace and sandbox executor contracts', () => {
  it('allows sandbox creation only for trusted R2 policy decisions with matching hashes', () => {
    const fixture = sandboxFixture();
    const allowed = validateCapabilitySynthesisSandboxGate({
      policyDecision: fixture.policyDecision,
      ...trustedPolicyReceiptInput(fixture.policyDecision),
      requestId: fixture.requestId,
      attemptId: fixture.attemptId,
      expectedPolicyDecisionHash: fixture.policyDecision.decisionHash,
      expectedSpecificationHash: fixture.policyDecision.specificationHash ?? '',
      expectedRegistrySnapshotHash: fixture.policyDecision.registrySnapshotHash ?? '',
      expectedActiveCapabilityLockHash: fixture.policyDecision.activeCapabilityLockHash ?? ''
    });
    const wrongTier = makePolicyDecision(fixture.requestId, {
      riskTier: 'R3_MANUAL_ARCHITECTURE_REVIEW',
      mode: 'MANUAL_SPEC_ONLY',
      allowed: false,
      implementationSandboxAllowed: false
    });
    const blocked = validateCapabilitySynthesisSandboxGate({
      policyDecision: wrongTier,
      ...trustedPolicyReceiptInput(wrongTier),
      requestId: fixture.requestId,
      attemptId: fixture.attemptId,
      expectedPolicyDecisionHash: wrongTier.decisionHash,
      expectedSpecificationHash: wrongTier.specificationHash ?? '',
      expectedRegistrySnapshotHash: wrongTier.registrySnapshotHash ?? '',
      expectedActiveCapabilityLockHash: wrongTier.activeCapabilityLockHash ?? ''
    });
    const staleContextReceipt = policyReceiptWithSubjectOverride(
      buildCapabilitySynthesisPolicyDecisionReceipt({ decision: fixture.policyDecision }),
      { decisionContextHash: 'fnv1a_stale_context' }
    );
    const stale = validateCapabilitySynthesisSandboxGate({
      policyDecision: fixture.policyDecision,
      ...trustedPolicyReceiptInput(fixture.policyDecision, staleContextReceipt),
      requestId: fixture.requestId,
      attemptId: fixture.attemptId,
      expectedPolicyDecisionHash: 'fnv1a_stale_policy',
      expectedSpecificationHash: 'fnv1a_stale_spec',
      expectedRegistrySnapshotHash: 'fnv1a_stale_registry',
      expectedActiveCapabilityLockHash: 'fnv1a_stale_lock'
    });
    const otherRequest = buildCapabilitySynthesisRequestIdentity({
      projectId: 'proj_other',
      requesterId: 'user_1',
      requestText: 'ricochet bullets'
    });
    const crossRequestPolicy = makePolicyDecision(otherRequest.requestId);
    const crossRequest = validateCapabilitySynthesisSandboxGate({
      policyDecision: crossRequestPolicy,
      ...trustedPolicyReceiptInput(crossRequestPolicy),
      requestId: fixture.requestId,
      attemptId: fixture.attemptId,
      expectedPolicyDecisionHash: crossRequestPolicy.decisionHash,
      expectedSpecificationHash: crossRequestPolicy.specificationHash ?? '',
      expectedRegistrySnapshotHash: crossRequestPolicy.registrySnapshotHash ?? '',
      expectedActiveCapabilityLockHash: crossRequestPolicy.activeCapabilityLockHash ?? ''
    });
    const missingBindingPolicy = makePolicyDecision(fixture.requestId, { specificationHash: '' });
    const missingBinding = validateCapabilitySynthesisSandboxGate({
      policyDecision: missingBindingPolicy,
      ...trustedPolicyReceiptInput(missingBindingPolicy),
      requestId: fixture.requestId,
      attemptId: fixture.attemptId,
      expectedPolicyDecisionHash: missingBindingPolicy.decisionHash,
      expectedSpecificationHash: '',
      expectedRegistrySnapshotHash: missingBindingPolicy.registrySnapshotHash ?? '',
      expectedActiveCapabilityLockHash: missingBindingPolicy.activeCapabilityLockHash ?? ''
    });
    const notEvaluatedPolicy = makePolicyDecision(fixture.requestId, {
      policyEvaluationStatus: 'BLOCKED_PRECONDITION',
      repairableByModel: false
    });
    const notEvaluated = validateCapabilitySynthesisSandboxGate({
      policyDecision: notEvaluatedPolicy,
      ...trustedPolicyReceiptInput(notEvaluatedPolicy),
      requestId: fixture.requestId,
      attemptId: fixture.attemptId,
      expectedPolicyDecisionHash: notEvaluatedPolicy.decisionHash,
      expectedSpecificationHash: notEvaluatedPolicy.specificationHash ?? '',
      expectedRegistrySnapshotHash: notEvaluatedPolicy.registrySnapshotHash ?? '',
      expectedActiveCapabilityLockHash: notEvaluatedPolicy.activeCapabilityLockHash ?? ''
    });
    const missingContextPolicy = makePolicyDecision(fixture.requestId, { decisionContextHash: '' });
    const missingContext = validateCapabilitySynthesisSandboxGate({
      policyDecision: missingContextPolicy,
      ...trustedPolicyReceiptInput(missingContextPolicy),
      requestId: fixture.requestId,
      attemptId: fixture.attemptId,
      expectedPolicyDecisionHash: missingContextPolicy.decisionHash,
      expectedSpecificationHash: missingContextPolicy.specificationHash ?? '',
      expectedRegistrySnapshotHash: missingContextPolicy.registrySnapshotHash ?? '',
      expectedActiveCapabilityLockHash: missingContextPolicy.activeCapabilityLockHash ?? ''
    });

    expect(allowed.status).toBe('allowed');
    expect(blocked.status).toBe('blocked');
    expect(blocked.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['SANDBOX_POLICY_RISK_TIER_NOT_R2', 'SANDBOX_POLICY_MODE_INVALID', 'SANDBOX_POLICY_NOT_ALLOWED', 'SANDBOX_POLICY_PERMISSION_MISSING'])
    );
    expect(stale.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'SANDBOX_POLICY_RECEIPT_INVALID',
        'SANDBOX_POLICY_HASH_STALE',
        'SANDBOX_POLICY_CONTEXT_HASH_STALE',
        'SANDBOX_SPEC_HASH_STALE',
        'SANDBOX_REGISTRY_SNAPSHOT_STALE',
        'SANDBOX_ACTIVE_LOCK_STALE'
      ])
    );
    expect(crossRequest.issues.map((issue) => issue.code)).toContain('SANDBOX_POLICY_REQUEST_MISMATCH');
    expect(missingBinding.issues.map((issue) => issue.code)).toContain('SANDBOX_POLICY_BINDING_MISSING');
    expect(notEvaluated.issues.map((issue) => issue.code)).toContain('SANDBOX_POLICY_NOT_EVALUATED');
    expect(notEvaluated.issues.map((issue) => issue.code)).toContain('SANDBOX_POLICY_RECEIPT_INVALID');
    expect(missingContext.issues.map((issue) => issue.code)).toContain('SANDBOX_POLICY_BINDING_MISSING');
    expect(missingContext.issues.map((issue) => issue.code)).toContain('SANDBOX_POLICY_RECEIPT_INVALID');
  });

  it.each([
    ['R0_COMPOSITION_ONLY', 'COMPOSITION_ONLY', true, false],
    ['R1_DECLARATIVE_EXTENSION', 'DECLARATIVE_BEHAVIOR_GRAPH', true, false],
    ['R4_PROHIBITED', 'PROHIBITED', false, false]
  ] as const)('blocks %s policy reports from entering the implementation sandbox', (riskTier, mode, allowed, implementationSandboxAllowed) => {
    const fixture = sandboxFixture();
    const policyDecision = makePolicyDecision(fixture.requestId, {
      riskTier,
      mode,
      allowed,
      implementationSandboxAllowed
    });
    const report = validateCapabilitySynthesisSandboxGate({
      policyDecision,
      ...trustedPolicyReceiptInput(policyDecision),
      requestId: fixture.requestId,
      attemptId: fixture.attemptId,
      expectedPolicyDecisionHash: policyDecision.decisionHash,
      expectedSpecificationHash: policyDecision.specificationHash ?? '',
      expectedRegistrySnapshotHash: policyDecision.registrySnapshotHash ?? '',
      expectedActiveCapabilityLockHash: policyDecision.activeCapabilityLockHash ?? ''
    });

    expect(report.status).toBe('blocked');
    expect(report.issues.map((issue) => issue.code)).toContain('SANDBOX_POLICY_RISK_TIER_NOT_R2');
  });

  it('keeps candidate writes inside attempt workspace and blocks traversal, symlink, registry, repo and package paths', () => {
    const fixture = sandboxFixture();
    const manifest = buildCapabilitySynthesisWorkspaceManifest({ requestId: fixture.requestId, attemptId: fixture.attemptId });

    const allowed = validateCapabilitySynthesisWorkspacePath({ workspaceManifest: manifest, requestedPath: `${manifest.attemptRoot}/source/capability.ts` });
    const traversal = validateCapabilitySynthesisWorkspacePath({ workspaceManifest: manifest, requestedPath: `${manifest.attemptRoot}/source/../registry.json` });
    const symlink = validateCapabilitySynthesisWorkspacePath({ workspaceManifest: manifest, requestedPath: 'source/link.ts', pathKind: 'symlink' });
    const sourceTree = validateCapabilitySynthesisWorkspacePath({ workspaceManifest: manifest, requestedPath: 'packages/game-dsl/src/gameplay-capabilities/registry.ts' });
    const packageJson = validateCapabilitySynthesisWorkspacePath({ workspaceManifest: manifest, requestedPath: 'package.json' });
    const dotfile = validateCapabilitySynthesisWorkspacePath({ workspaceManifest: manifest, requestedPath: 'source/.npmrc' });
    const registry = validateCapabilitySynthesisWorkspacePath({ workspaceManifest: manifest, requestedPath: 'local-data/capability-registry/index.json' });
    const activeArtifact = validateCapabilitySynthesisWorkspacePath({ workspaceManifest: manifest, requestedPath: 'artifacts/projects/proj_123/candidate.json' });

    expect(manifest.attemptRoot).toContain('/attempts/');
    expect(allowed.status).toBe('allowed');
    expect(allowed.normalizedAttemptPath).toBe('source/capability.ts');
    expect(traversal.issues.map((issue) => issue.code)).toContain('SANDBOX_PATH_TRAVERSAL');
    expect(symlink.issues.map((issue) => issue.code)).toContain('SANDBOX_PATH_SYMLINK_FORBIDDEN');
    expect(sourceTree.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(['SANDBOX_PATH_FORBIDDEN_REPO_SOURCE', 'SANDBOX_PATH_OUTSIDE_WRITABLE_ROOT']));
    expect(packageJson.issues.map((issue) => issue.code)).toContain('SANDBOX_PATH_FORBIDDEN_PACKAGE_JSON');
    expect(dotfile.issues.map((issue) => issue.code)).toContain('SANDBOX_PATH_FORBIDDEN_DOTFILE');
    expect(registry.issues.map((issue) => issue.code)).toContain('SANDBOX_PATH_FORBIDDEN_ACTIVE_REGISTRY');
    expect(activeArtifact.issues.map((issue) => issue.code)).toContain('SANDBOX_PATH_FORBIDDEN_ACTIVE_ARTIFACT');
  });

  it('freezes no-network sandbox policy and mount manifest hashes', () => {
    const first = buildCapabilitySynthesisSandboxPolicy();
    const second = buildCapabilitySynthesisSandboxPolicy();
    const mountManifest = buildCapabilitySynthesisMountManifest({ sandboxPolicy: first });

    expect(first.sandboxPolicyHash).toBe(second.sandboxPolicyHash);
    expect(first.network).toEqual({ mode: 'none', dns: 'none', proxyEnv: 'empty', cloudMetadata: 'unreachable' });
    expect(first.process).toEqual({ user: 'non-root', noSetuid: true, seccomp: 'required', nestedContainer: 'forbidden' });
    expect(first.envAllowlist).toEqual(['NODE_ENV', 'CAPABILITY_SYNTHESIS_ATTEMPT_ID', 'DETERMINISTIC_SEED', 'TZ', 'LANG']);
    expect(first.forbiddenMounts).toEqual(
      expect.arrayContaining(['repository_root_writable', 'user_home', '.env', '.git', 'ssh_agent', 'docker_socket', 'host_tmp', 'active_registry_store'])
    );
    expect(mountManifest.sandboxPolicyHash).toBe(first.sandboxPolicyHash);
    expect(mountManifest.mountManifestHash).toMatch(/^fnv1a_[a-f0-9]{8}$/);
  });

  it('allows resource budget overrides only to tighten the frozen sandbox policy', () => {
    const policy = buildCapabilitySynthesisSandboxPolicy({
      resourceBudget: {
        maxPids: 128,
        maxMemoryMb: 2048,
        perCommandTimeoutSeconds: 60,
        maxOpenFiles: -1
      }
    });

    expect(policy.resourceBudget.maxPids).toBe(64);
    expect(policy.resourceBudget.maxMemoryMb).toBe(1024);
    expect(policy.resourceBudget.perCommandTimeoutSeconds).toBe(60);
    expect(policy.resourceBudget.maxOpenFiles).toBe(256);
  });

  it('rejects secret env, model commands, args/env overrides and package manager install paths', () => {
    const fixture = sandboxFixture();
    const env = buildCapabilitySynthesisSandboxEnvironment({
      attemptId: fixture.attemptId,
      deterministicSeed: 'seed_ricochet',
      requestedEnv: {
        OPENAI_API_KEY: 'sk-testsecret',
        HTTPS_PROXY: 'http://127.0.0.1:9999',
        NODE_ENV: 'production'
      }
    });
    const allowedCommand = validateCapabilitySynthesisSandboxCommand({ commandId: 'candidate:build' });
    const blockedCommand = validateCapabilitySynthesisSandboxCommand({
      commandId: 'npm install left-pad',
      modelProvidedCommand: 'npm install left-pad',
      argsOverride: ['--registry=https://example.invalid'],
      envOverride: { NPM_TOKEN: 'secret' }
    });

    expect(env.status).toBe('blocked');
    expect(Object.keys(env.env)).toEqual(['NODE_ENV', 'CAPABILITY_SYNTHESIS_ATTEMPT_ID', 'DETERMINISTIC_SEED', 'TZ', 'LANG']);
    expect(env.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['SANDBOX_ENV_SECRET_REJECTED', 'SANDBOX_ENV_OVERRIDE_REJECTED'])
    );
    expect(allowedCommand.status).toBe('allowed');
    expect(blockedCommand.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'SANDBOX_COMMAND_NOT_ALLOWLISTED',
        'SANDBOX_COMMAND_PACKAGE_INSTALL_REJECTED',
        'SANDBOX_COMMAND_MODEL_SUPPLIED_REJECTED',
        'SANDBOX_COMMAND_ARGS_OVERRIDE_REJECTED',
        'SANDBOX_COMMAND_ENV_OVERRIDE_REJECTED'
      ])
    );
  });

  it('requires executable no-network startup attestation evidence', () => {
    const fixture = sandboxFixture();
    const passedNetwork = buildCapabilitySynthesisNetworkIsolationReport({
      requestId: fixture.requestId,
      attemptId: fixture.attemptId,
      probes: networkProbes()
    });
    const failedNetwork = buildCapabilitySynthesisNetworkIsolationReport({
      requestId: fixture.requestId,
      attemptId: fixture.attemptId,
      probes: networkProbes({ dnsLookup: 'succeeded', httpFetch: 'not_run' })
    });
    const attestation = buildCapabilitySynthesisStartupAttestation({
      requestId: fixture.requestId,
      attemptId: fixture.attemptId,
      sandboxPolicyHash: fixture.sandboxPolicy.sandboxPolicyHash,
      workspaceManifestHash: fixture.workspaceManifest.workspaceManifestHash,
      mountManifestHash: fixture.mountManifest.mountManifestHash,
      networkIsolationReport: passedNetwork
    });

    expect(passedNetwork.status).toBe('passed');
    expect(attestation.status).toBe('passed');
    expect(attestation.networkIsolationReportHash).toBe(passedNetwork.networkIsolationReportHash);
    expect(failedNetwork.status).toBe('failed');
    expect(failedNetwork.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['SANDBOX_NETWORK_PROBE_SUCCEEDED', 'SANDBOX_NETWORK_PROBE_NOT_RUN'])
    );
  });

  it('captures sanitized command logs and enforces resource budgets', () => {
    const fixture = sandboxFixture();
    const usage = {
      cpuCoresUsed: 1,
      memoryMbUsed: 128,
      pidsUsed: 4,
      commandDurationSeconds: 2,
      outputBytes: 2048,
      openFiles: 12
    };
    const entry = buildCapabilitySynthesisSandboxCommandLogEntry({
      commandId: 'candidate:build',
      fixedCommandName: 'candidate:build',
      startedAt: '2026-06-19T00:00:00.000Z',
      endedAt: '2026-06-19T00:00:02.000Z',
      exitCode: 0,
      timeout: false,
      stdout: 'built /Users/dahufa/Documents/workspace/ai-game-maker and OPENAI_API_KEY=sk-testsecret',
      stderr: 'Bearer abc.def.ghi',
      resourceUsage: usage,
      sandboxRuntime: { image: 'capability-sandbox', version: 'v1' }
    });
    const passedResource = buildCapabilitySynthesisSandboxResourceReport({
      requestId: fixture.requestId,
      attemptId: fixture.attemptId,
      budget: fixture.sandboxPolicy.resourceBudget,
      usage
    });
    const failedResource = buildCapabilitySynthesisSandboxResourceReport({
      requestId: fixture.requestId,
      attemptId: fixture.attemptId,
      budget: fixture.sandboxPolicy.resourceBudget,
      usage: {
        ...usage,
        pidsUsed: 65,
        commandDurationSeconds: 121,
        outputBytes: fixture.sandboxPolicy.resourceBudget.maxBuildOutputBytes + 1
      }
    });

    expect(entry.stdoutHash).toMatch(/^fnv1a_[a-f0-9]{8}$/);
    expect(entry.sanitizedStdoutPreview).not.toContain('/Users/dahufa');
    expect(entry.sanitizedStdoutPreview).not.toContain('sk-testsecret');
    expect(entry.sanitizedStderrPreview).toBe('Bearer [redacted]');
    expect(entry.sandboxRuntime.policyVersion).toBe(CAPABILITY_SYNTHESIS_SANDBOX_POLICY_VERSION);
    expect(passedResource.status).toBe('passed');
    expect(failedResource.status).toBe('failed');
    expect(failedResource.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['SANDBOX_RESOURCE_PID_LIMIT_EXCEEDED', 'SANDBOX_RESOURCE_TIMEOUT_EXCEEDED', 'SANDBOX_RESOURCE_OUTPUT_LIMIT_EXCEEDED'])
    );
  });

  it('binds attempt manifest to policy, workspace, mount, attestation, command and resource hashes', () => {
    const fixture = sandboxFixture();
    const entry = buildCapabilitySynthesisSandboxCommandLogEntry({
      commandId: 'candidate:build',
      fixedCommandName: 'candidate:build',
      startedAt: '2026-06-19T00:00:00.000Z',
      endedAt: '2026-06-19T00:00:02.000Z',
      exitCode: 0,
      timeout: false,
      stdout: 'ok',
      stderr: '',
      resourceUsage: fixture.usage,
      sandboxRuntime: { image: 'capability-sandbox', version: 'v1' }
    });
    const commandLog = buildCapabilitySynthesisSandboxCommandLog({ requestId: fixture.requestId, attemptId: fixture.attemptId, entries: [entry] });
    const resourceReport = buildCapabilitySynthesisSandboxResourceReport({
      requestId: fixture.requestId,
      attemptId: fixture.attemptId,
      budget: fixture.sandboxPolicy.resourceBudget,
      usage: fixture.usage
    });
    const manifest = buildCapabilitySynthesisAttemptManifest({
      requestId: fixture.requestId,
      attemptId: fixture.attemptId,
      policyDecision: fixture.policyDecision,
      workspaceManifest: fixture.workspaceManifest,
      sandboxPolicy: fixture.sandboxPolicy,
      mountManifest: fixture.mountManifest,
      startupAttestation: fixture.startupAttestation,
      networkIsolationReport: fixture.networkReport,
      commandLog,
      resourceReport
    });
    const valid = validateCapabilitySynthesisAttemptManifestIntegrity({
      manifest,
      policyDecision: fixture.policyDecision,
      workspaceManifest: fixture.workspaceManifest,
      sandboxPolicy: fixture.sandboxPolicy,
      mountManifest: fixture.mountManifest,
      startupAttestation: fixture.startupAttestation,
      networkIsolationReport: fixture.networkReport,
      commandLog,
      resourceReport
    });
    const tampered = validateCapabilitySynthesisAttemptManifestIntegrity({
      manifest: { ...manifest, sandboxPolicyHash: 'fnv1a_tampered' },
      policyDecision: fixture.policyDecision,
      workspaceManifest: fixture.workspaceManifest,
      sandboxPolicy: fixture.sandboxPolicy,
      mountManifest: fixture.mountManifest,
      startupAttestation: fixture.startupAttestation,
      networkIsolationReport: fixture.networkReport,
      commandLog,
      resourceReport
    });
    const tamperedChild = validateCapabilitySynthesisAttemptManifestIntegrity({
      manifest,
      policyDecision: fixture.policyDecision,
      workspaceManifest: fixture.workspaceManifest,
      sandboxPolicy: fixture.sandboxPolicy,
      mountManifest: fixture.mountManifest,
      startupAttestation: fixture.startupAttestation,
      networkIsolationReport: fixture.networkReport,
      commandLog: {
        ...commandLog,
        entries: [{ ...entry, fixedCommandName: 'candidate:evil' }]
      },
      resourceReport: {
        ...resourceReport,
        status: 'failed'
      }
    });

    expect(manifest.policyDecisionHash).toBe(fixture.policyDecision.decisionHash);
    expect(manifest.workspaceManifestHash).toBe(fixture.workspaceManifest.workspaceManifestHash);
    expect(manifest.sandboxPolicyHash).toBe(fixture.sandboxPolicy.sandboxPolicyHash);
    expect(manifest.commandLogHash).toBe(commandLog.commandLogHash);
    expect(valid.status).toBe('allowed');
    expect(tampered.status).toBe('blocked');
    expect(tampered.issues.map((issue) => issue.code)).toContain('SANDBOX_ATTEMPT_MANIFEST_HASH_MISMATCH');
    expect(tamperedChild.status).toBe('blocked');
    expect(tamperedChild.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['SANDBOX_CHILD_ARTIFACT_HASH_MISMATCH', 'SANDBOX_COMMAND_LOG_ENTRY_HASH_MISMATCH', 'SANDBOX_CHILD_ARTIFACT_STATUS_FAILED'])
    );
  });
});

function sandboxFixture() {
  const request = buildCapabilitySynthesisRequestIdentity({
    projectId: 'proj_123',
    requesterId: 'user_1',
    requestText: 'ricochet bullets'
  });
  const attemptId = buildCapabilitySynthesisAttemptId({ requestId: request.requestId, attemptNumber: 1 });
  const policyDecision = makePolicyDecision(request.requestId);
  const sandboxPolicy = buildCapabilitySynthesisSandboxPolicy();
  const workspaceManifest = buildCapabilitySynthesisWorkspaceManifest({ requestId: request.requestId, attemptId });
  const mountManifest = buildCapabilitySynthesisMountManifest({ sandboxPolicy });
  const networkReport = buildCapabilitySynthesisNetworkIsolationReport({
    requestId: request.requestId,
    attemptId,
    probes: networkProbes()
  });
  const startupAttestation = buildCapabilitySynthesisStartupAttestation({
    requestId: request.requestId,
    attemptId,
    sandboxPolicyHash: sandboxPolicy.sandboxPolicyHash,
    workspaceManifestHash: workspaceManifest.workspaceManifestHash,
    mountManifestHash: mountManifest.mountManifestHash,
    networkIsolationReport: networkReport
  });
  return {
    requestId: request.requestId,
    attemptId,
    policyDecision,
    sandboxPolicy,
    workspaceManifest,
    mountManifest,
    networkReport,
    startupAttestation,
    usage: {
      cpuCoresUsed: 1,
      memoryMbUsed: 128,
      pidsUsed: 4,
      commandDurationSeconds: 2,
      outputBytes: 2048,
      openFiles: 12
    }
  };
}

function networkProbes(overrides: Partial<Record<'outboundTcp' | 'dnsLookup' | 'httpFetch' | 'webSocket' | 'cloudMetadata', 'failed' | 'succeeded' | 'not_run'>> = {}) {
  return {
    outboundTcp: networkProbe('outboundTcp', overrides.outboundTcp ?? 'failed'),
    dnsLookup: networkProbe('dnsLookup', overrides.dnsLookup ?? 'failed'),
    httpFetch: networkProbe('httpFetch', overrides.httpFetch ?? 'failed'),
    webSocket: networkProbe('webSocket', overrides.webSocket ?? 'failed'),
    cloudMetadata: networkProbe('cloudMetadata', overrides.cloudMetadata ?? 'failed')
  };
}

function networkProbe(kind: string, status: 'failed' | 'succeeded' | 'not_run') {
  return {
    status,
    target: `${kind}.invalid`,
    startedAt: '2026-06-19T00:00:00.000Z',
    endedAt: '2026-06-19T00:00:01.000Z',
    observedErrorCategory: status === 'failed' ? 'network_disabled' : status,
    executorEvidenceId: `net_probe_${kind}`
  };
}

function makePolicyDecision(requestId: string, overrides: Partial<Omit<CapabilitySynthesisPolicyDecision, 'decisionHash'>> = {}): CapabilitySynthesisPolicyDecision {
  const payload: Omit<CapabilitySynthesisPolicyDecision, 'decisionHash'> = {
    artifactKind: CAPABILITY_SYNTHESIS_POLICY_REPORT_KIND,
    schemaVersion: CAPABILITY_SYNTHESIS_POLICY_REPORT_SCHEMA_VERSION,
    policyVersion: CAPABILITY_SYNTHESIS_POLICY_VERSION,
    policyEvaluationStatus: 'EVALUATED',
    requestId,
    sourceGapReportHash: 'fnv1a_gap',
    registrySnapshotHash: 'fnv1a_registry',
    activeCapabilityLockHash: 'fnv1a_lock',
    specificationHash: 'fnv1a_spec',
    policyInputHash: 'fnv1a_policy_input',
    decisionContextHash: 'fnv1a_decision_context',
    riskTier: 'R2_BOUNDED_RUNTIME_MODULE',
    mode: 'BOUNDED_TYPED_RUNTIME_MODULE',
    allowed: true,
    implementationSandboxAllowed: true,
    requiredApprovals: ['capability_maintainer', 'runtime_code_owner'],
    requiredGates: ['source_integrity', 'typecheck', 'runtime_qa'],
    blockingRules: [],
    rationale: ['R2 bounded runtime module.'],
    ...overrides
  };
  return { ...payload, decisionHash: hashStableJson(payload) };
}

function trustedPolicyReceiptInput(
  decision: CapabilitySynthesisPolicyDecision,
  receipt = buildCapabilitySynthesisPolicyDecisionReceipt({ decision })
): {
  trustedPolicyDecisionReceiptRef: CapabilitySynthesisPolicyDecisionReceipt['trustedArtifactRef'];
  trustedPolicyDecisionStore: CapabilitySynthesisPolicyDecisionReceiptResolver;
} {
  return {
    trustedPolicyDecisionReceiptRef: receipt.trustedArtifactRef,
    trustedPolicyDecisionStore: trustedPolicyDecisionStore(receipt)
  };
}

function trustedPolicyDecisionStore(...receipts: CapabilitySynthesisPolicyDecisionReceipt[]): CapabilitySynthesisPolicyDecisionReceiptResolver {
  return {
    namespace: CAPABILITY_SYNTHESIS_POLICY_DECISION_TRUSTED_NAMESPACE,
    resolveReceipt(ref) {
      return receipts.find((receipt) =>
        receipt.trustedArtifactRef.namespace === ref.namespace &&
        receipt.trustedArtifactRef.artifactKind === ref.artifactKind &&
        receipt.trustedArtifactRef.artifactId === ref.artifactId
      );
    }
  };
}

function policyReceiptWithSubjectOverride(
  receipt: CapabilitySynthesisPolicyDecisionReceipt,
  subjectOverride: Partial<CapabilitySynthesisPolicyDecisionReceipt['subject']>
): CapabilitySynthesisPolicyDecisionReceipt {
  const { receiptHash: _receiptHash, ...payload } = receipt;
  const patchedPayload = {
    ...payload,
    subject: {
      ...payload.subject,
      ...subjectOverride
    }
  };
  return { ...patchedPayload, receiptHash: hashStableJson(patchedPayload) };
}
