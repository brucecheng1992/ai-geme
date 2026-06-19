import { describe, expect, it } from 'vitest';

import {
  CAPABILITY_SCAFFOLD_VERSION,
  CAPABILITY_SPECIFICATION_CONTRACT_VERSION,
  CAPABILITY_SPECIFICATION_SCHEMA_VERSION,
  CAPABILITY_SYNTHESIS_POLICY_REPORT_KIND,
  CAPABILITY_SYNTHESIS_POLICY_REPORT_SCHEMA_VERSION,
  CAPABILITY_SYNTHESIS_POLICY_DECISION_TRUSTED_NAMESPACE,
  CAPABILITY_SYNTHESIS_POLICY_VERSION,
  buildCapabilityScaffoldArtifacts,
  buildCapabilitySpecificationCandidate,
  buildCapabilitySynthesisAttemptId,
  buildCapabilitySynthesisAttemptManifest,
  buildCapabilitySynthesisMountManifest,
  buildCapabilitySynthesisNetworkIsolationReport,
  buildCapabilitySynthesisPolicyDecisionReceipt,
  buildCapabilitySynthesisSandboxCommandLog,
  buildCapabilitySynthesisSandboxCommandLogEntry,
  buildCapabilitySynthesisSandboxPolicy,
  buildCapabilitySynthesisSandboxResourceReport,
  buildCapabilitySynthesisStartupAttestation,
  buildCapabilitySynthesisWorkspaceManifest,
  validateCapabilityScaffoldModelFilePath,
  validateCapabilityScaffoldReportIntegrity,
  validateCapabilitySynthesisAttemptManifestIntegrity,
  validateGameplayCapabilityPackage,
  type CapabilitySpecificationCandidate,
  type CapabilitySynthesisPolicyDecision,
  type CapabilitySynthesisPolicyDecisionReceipt,
  type CapabilitySynthesisPolicyDecisionReceiptResolver,
  type CapabilitySynthesisRiskTier,
  type CapabilitySynthesisMode
} from '../../packages/game-dsl/src/index.js';
import { hashStableJson } from '../../packages/game-dsl/src/gameplay-capabilities/stable-json.js';

describe('Step36 deterministic capability package scaffolding contracts', () => {
  it('generates deterministic R2 scaffold artifacts and binds the full sandbox hash chain', () => {
    const fixture = scaffoldFixture();
    const first = buildCapabilityScaffoldArtifacts(fixture);
    const second = buildCapabilityScaffoldArtifacts(fixture);

    expect(first.report.status).toBe('generated');
    expect(first.report.scaffoldReportHash).toBe(second.report.scaffoldReportHash);
    expect(first.allowedFileMap?.allowedFileMapHash).toBe(second.allowedFileMap?.allowedFileMapHash);
    expect(first.candidateManifest?.trust).toEqual({ status: 'candidate', installable: false, supported: false });
      expect(first.candidateManifest?.packageContract).toMatchObject({
        manifest: {
          contractVersion: 'gameplay-capability-package.v1',
          id: fixture.specification.proposedCapabilityId,
          packageVersion: fixture.specification.proposedPackageVersion,
          capabilityVersion: 'v1',
          runtimeFamilies: fixture.specification.runtimeFamilies
        }
      });
      expect(validateGameplayCapabilityPackage(first.candidateManifest?.packageContract).status).toBe('valid');
      expect(first.allowedFileMap?.files.find((file) => file.path === 'src/runtime/phaser_2d_action_arcade.v1.ts')?.classification).toBe('writable_by_model');
    expect(first.allowedFileMap?.files.find((file) => file.path === 'src/render.ts')?.classification).toBe('writable_by_model');
    expect(first.allowedFileMap?.files.find((file) => file.path === 'package.json')?.classification).toBe('read_only_generated');
    expect(first.allowedFileMap?.files.every((file) => file.owner.length > 0 && file.purpose.length > 0)).toBe(true);
    expect(first.report.attemptManifestIntegrityReportHash).toBe(fixture.attemptManifestIntegrityReport.reportHash);
    expect(first.report.commandLogHash).toBe(fixture.attemptManifest.commandLogHash);
  });

  it.each([
    ['R0_COMPOSITION_ONLY', 'COMPOSITION_ONLY', true],
    ['R3_MANUAL_ARCHITECTURE_REVIEW', 'MANUAL_SPEC_ONLY', false],
    ['R4_PROHIBITED', 'PROHIBITED', false]
  ] as const)('blocks %s policy from producing package scaffold', (riskTier, mode, allowed) => {
    const fixture = scaffoldFixture({ riskTier, mode, allowed, implementationSandboxAllowed: false });
    const artifacts = buildCapabilityScaffoldArtifacts(fixture);

    expect(artifacts.report.status).toBe('blocked');
    expect(artifacts.report.issues.map((issue) => issue.code)).toContain('SCAFFOLD_POLICY_NOT_SCAFFOLDABLE');
  });

  it('requires an allowed attempt manifest integrity report bound by trusted hash', () => {
    const fixture = scaffoldFixture();
    const missingIntegrity = buildCapabilityScaffoldArtifacts({
      ...fixture,
      trustedAttemptManifestIntegrityReportHash: 'fnv1a_stale'
    });
    const blockedIntegrity = buildCapabilityScaffoldArtifacts({
      ...fixture,
      attemptManifestIntegrityReport: {
        ...fixture.attemptManifestIntegrityReport,
        status: 'blocked'
      }
    });

    expect(missingIntegrity.report.status).toBe('blocked');
    expect(missingIntegrity.report.issues.map((issue) => issue.code)).toContain('SCAFFOLD_ATTEMPT_INTEGRITY_HASH_MISMATCH');
    expect(blockedIntegrity.report.status).toBe('blocked');
    expect(blockedIntegrity.report.issues.map((issue) => issue.code)).toContain('SCAFFOLD_ATTEMPT_INTEGRITY_BLOCKED');
  });

  it('rejects scaffold inputs when policy, attempt and integrity identities or hashes drift', () => {
    const fixture = scaffoldFixture();
    const forgedPolicy = {
      ...fixture.policyDecision,
      requestId: 'capsyn_req_87654321'
    };
    const { attemptManifestHash: _attemptManifestHash, ...attemptPayload } = fixture.attemptManifest;
    const forgedAttemptPayload = {
      ...attemptPayload,
      policyDecisionHash: 'fnv1a_forged_policy'
    };
    const forgedAttempt = {
      ...forgedAttemptPayload,
      attemptManifestHash: hashStableJson(forgedAttemptPayload)
    };
    const forgedIntegrityPayload = {
      status: fixture.attemptManifestIntegrityReport.status,
      requestId: 'capsyn_req_87654321',
      attemptId: fixture.attemptManifestIntegrityReport.attemptId,
      policyDecisionHash: fixture.attemptManifestIntegrityReport.policyDecisionHash,
      issues: fixture.attemptManifestIntegrityReport.issues
    };
    const forgedIntegrity = {
      ...forgedIntegrityPayload,
      reportHash: hashStableJson(forgedIntegrityPayload)
    };

    const policyArtifacts = buildCapabilityScaffoldArtifacts({ ...fixture, policyDecision: forgedPolicy });
    const attemptArtifacts = buildCapabilityScaffoldArtifacts({ ...fixture, attemptManifest: forgedAttempt });
    const integrityArtifacts = buildCapabilityScaffoldArtifacts({
      ...fixture,
      attemptManifestIntegrityReport: forgedIntegrity,
      trustedAttemptManifestIntegrityReportHash: forgedIntegrity.reportHash
    });
    const notEvaluatedArtifacts = buildCapabilityScaffoldArtifacts({
      ...fixture,
      policyDecision: rehashPolicyDecision({
        ...fixture.policyDecision,
        policyEvaluationStatus: 'BLOCKED_PRECONDITION',
        repairableByModel: false
      })
    });
    const missingContextArtifacts = buildCapabilityScaffoldArtifacts({
      ...fixture,
      policyDecision: rehashPolicyDecision({
        ...fixture.policyDecision,
        decisionContextHash: ''
      })
    });

    expect(policyArtifacts.report.status).toBe('blocked');
    expect(policyArtifacts.report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['SCAFFOLD_POLICY_DECISION_HASH_MISMATCH', 'SCAFFOLD_POLICY_REQUEST_MISMATCH', 'SCAFFOLD_ATTEMPT_REQUEST_MISMATCH'])
    );
    expect(attemptArtifacts.report.status).toBe('blocked');
    expect(attemptArtifacts.report.issues.map((issue) => issue.code)).toContain('SCAFFOLD_ATTEMPT_POLICY_HASH_MISMATCH');
    expect(integrityArtifacts.report.status).toBe('blocked');
    expect(integrityArtifacts.report.issues.map((issue) => issue.code)).toContain('SCAFFOLD_ATTEMPT_INTEGRITY_BINDING_MISMATCH');
    expect(notEvaluatedArtifacts.report.issues.map((issue) => issue.code)).toContain('SCAFFOLD_POLICY_NOT_EVALUATED');
    expect(missingContextArtifacts.report.issues.map((issue) => issue.code)).toContain('SCAFFOLD_POLICY_CONTEXT_HASH_MISMATCH');
  });

  it('keeps R1 declarative scaffold free of writable runtime TypeScript', () => {
    const fixture = scaffoldFixture({ riskTier: 'R1_DECLARATIVE_EXTENSION', mode: 'DECLARATIVE_BEHAVIOR_GRAPH', implementationSandboxAllowed: false });
    const artifacts = buildCapabilityScaffoldArtifacts(fixture);

    expect(artifacts.report.status).toBe('generated');
    expect(artifacts.allowedFileMap?.files.some((file) => file.path.startsWith('src/runtime/') && file.classification === 'writable_by_model')).toBe(false);
    expect(artifacts.allowedFileMap?.files.some((file) => file.path.endsWith('.ts') && file.classification === 'writable_by_model')).toBe(false);
    expect(artifacts.allowedFileMap?.files.find((file) => file.path === 'declarative/behavior-graph.json')?.classification).toBe('writable_by_model');
    expect(artifacts.allowedFileMap?.files.find((file) => file.path === 'declarative/qa-descriptors.json')?.classification).toBe('writable_by_model');
  });

  it('validates model output paths against writable, read-only, external and forbidden file classes', () => {
    const fixture = scaffoldFixture();
    const artifacts = buildCapabilityScaffoldArtifacts(fixture);
    const allowedFileMap = artifacts.allowedFileMap;
    if (allowedFileMap === undefined) {
      throw new Error('Expected scaffold allowed file map');
    }

    const writable = validateCapabilityScaffoldModelFilePath({ allowedFileMap, path: 'src/schema.ts' });
    const readOnly = validateCapabilityScaffoldModelFilePath({ allowedFileMap, path: 'package.json' });
    const external = validateCapabilityScaffoldModelFilePath({ allowedFileMap, path: 'tests/external/harness-contract.test.ts' });
    const forbidden = validateCapabilityScaffoldModelFilePath({ allowedFileMap, path: 'src/.env' });
    const unknown = validateCapabilityScaffoldModelFilePath({ allowedFileMap, path: 'src/runtime/extra.ts' });

    expect(writable.status).toBe('allowed');
    expect(readOnly.issues.map((issue) => issue.code)).toContain('SCAFFOLD_MODEL_PATH_READ_ONLY');
    expect(external.issues.map((issue) => issue.code)).toContain('SCAFFOLD_MODEL_PATH_READ_ONLY');
    expect(forbidden.issues.map((issue) => issue.code)).toContain('SCAFFOLD_MODEL_PATH_FORBIDDEN');
    expect(unknown.issues.map((issue) => issue.code)).toContain('SCAFFOLD_MODEL_PATH_UNKNOWN');
  });

  it('omits render source when specification has no render contract', () => {
    const fixture = scaffoldFixture({ specification: makeSpecificationWithoutRender() });
    const artifacts = buildCapabilityScaffoldArtifacts(fixture);

    expect(artifacts.report.status).toBe('generated');
    expect(artifacts.allowedFileMap?.files.some((file) => file.path === 'src/render.ts')).toBe(false);
  });

  it('rejects report reuse when spec, policy, attempt, scaffold version or SDK version drift', () => {
    const fixture = scaffoldFixture();
    const artifacts = buildCapabilityScaffoldArtifacts(fixture);
    const validation = validateCapabilityScaffoldReportIntegrity({
      report: artifacts.report,
      expectedSpecificationHash: 'fnv1a_stale_spec',
      expectedPolicyDecisionHash: 'fnv1a_stale_policy',
      expectedAttemptManifestHash: 'fnv1a_stale_attempt',
      expectedAttemptManifestIntegrityReportHash: 'fnv1a_stale_integrity',
      expectedScaffoldVersion: 'step36.other-scaffold.v1',
      expectedSdkVersion: 'sdk.other'
    });

    expect(validation.status).toBe('invalid');
    expect(validation.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'SCAFFOLD_SPEC_HASH_MISMATCH',
        'SCAFFOLD_POLICY_HASH_MISMATCH',
        'SCAFFOLD_ATTEMPT_HASH_MISMATCH',
        'SCAFFOLD_ATTEMPT_INTEGRITY_HASH_MISMATCH',
        'SCAFFOLD_VERSION_MISMATCH',
        'SCAFFOLD_SDK_VERSION_MISMATCH'
      ])
    );
  });

  it('rejects unsafe runtime family ids before deriving runtime source paths', () => {
    const fixture = scaffoldFixture({
      specification: makeSpecification({ runtimeFamilies: ['../evil'] })
    });
    const artifacts = buildCapabilityScaffoldArtifacts(fixture);

    expect(artifacts.report.status).toBe('blocked');
    expect(artifacts.report.issues.map((issue) => issue.code)).toContain('SCAFFOLD_RUNTIME_FAMILY_UNSAFE');
  });
});

function scaffoldFixture(
  overrides: {
    specification?: CapabilitySpecificationCandidate;
    riskTier?: CapabilitySynthesisRiskTier;
    mode?: CapabilitySynthesisMode;
    allowed?: boolean;
    implementationSandboxAllowed?: boolean;
  } = {}
) {
  const specification = overrides.specification ?? makeSpecification();
  const policyDecision = makePolicyDecision(specification, {
    requestId: specification.requestId,
    riskTier: overrides.riskTier,
    mode: overrides.mode,
    allowed: overrides.allowed,
    implementationSandboxAllowed: overrides.implementationSandboxAllowed
  });
  const attempt = buildAttemptFixture(policyDecision);
  const policyReceiptInput = trustedPolicyReceiptInput(policyDecision);
  return {
    specification,
    policyDecision,
    ...policyReceiptInput,
    attemptManifest: attempt.attemptManifest,
    attemptManifestIntegrityReport: attempt.attemptManifestIntegrityReport,
    trustedAttemptManifestIntegrityReportHash: attempt.attemptManifestIntegrityReport.reportHash,
    scaffoldVersion: CAPABILITY_SCAFFOLD_VERSION,
    sdkVersion: 'sdk.step36.reference.v1'
  };
}

function buildAttemptFixture(policyDecision: CapabilitySynthesisPolicyDecision) {
  const requestId = policyDecision.requestId;
  if (requestId === undefined) {
    throw new Error('Expected policy decision requestId in scaffold fixture.');
  }
  const attemptId = buildCapabilitySynthesisAttemptId({ requestId, attemptNumber: 1 });
  const sandboxPolicy = buildCapabilitySynthesisSandboxPolicy();
  const workspaceManifest = buildCapabilitySynthesisWorkspaceManifest({ requestId, attemptId });
  const mountManifest = buildCapabilitySynthesisMountManifest({ sandboxPolicy });
  const networkReport = buildCapabilitySynthesisNetworkIsolationReport({
    requestId,
    attemptId,
    probes: networkProbes()
  });
  const startupAttestation = buildCapabilitySynthesisStartupAttestation({
    requestId,
    attemptId,
    sandboxPolicyHash: sandboxPolicy.sandboxPolicyHash,
    workspaceManifestHash: workspaceManifest.workspaceManifestHash,
    mountManifestHash: mountManifest.mountManifestHash,
    networkIsolationReport: networkReport
  });
  const usage = {
    cpuCoresUsed: 1,
    memoryMbUsed: 128,
    pidsUsed: 4,
    commandDurationSeconds: 2,
    outputBytes: 2048,
    openFiles: 12
  };
  const commandEntry = buildCapabilitySynthesisSandboxCommandLogEntry({
    commandId: 'candidate:build',
    fixedCommandName: 'candidate:build',
    startedAt: '2026-06-19T00:00:00.000Z',
    endedAt: '2026-06-19T00:00:02.000Z',
    exitCode: 0,
    timeout: false,
    stdout: 'ok',
    stderr: '',
    resourceUsage: usage,
    sandboxRuntime: { image: 'capability-sandbox', version: 'v1' }
  });
  const commandLog = buildCapabilitySynthesisSandboxCommandLog({ requestId, attemptId, entries: [commandEntry] });
  const resourceReport = buildCapabilitySynthesisSandboxResourceReport({
    requestId,
    attemptId,
    budget: sandboxPolicy.resourceBudget,
    usage
  });
  const attemptManifest = buildCapabilitySynthesisAttemptManifest({
    requestId,
    attemptId,
    policyDecision,
    workspaceManifest,
    sandboxPolicy,
    mountManifest,
    startupAttestation,
    networkIsolationReport: networkReport,
    commandLog,
    resourceReport
  });
  const attemptManifestIntegrityReport = validateCapabilitySynthesisAttemptManifestIntegrity({
    manifest: attemptManifest,
    policyDecision,
    workspaceManifest,
    sandboxPolicy,
    mountManifest,
    startupAttestation,
    networkIsolationReport: networkReport,
    commandLog,
    resourceReport
  });
  return { attemptManifest, attemptManifestIntegrityReport };
}

function makePolicyDecision(
  specification: CapabilitySpecificationCandidate,
  overrides: {
    requestId?: string;
    riskTier?: CapabilitySynthesisRiskTier;
    mode?: CapabilitySynthesisMode;
    allowed?: boolean;
    implementationSandboxAllowed?: boolean;
  } = {}
): CapabilitySynthesisPolicyDecision {
  const riskTier = overrides.riskTier ?? 'R2_BOUNDED_RUNTIME_MODULE';
  const mode = overrides.mode ?? 'BOUNDED_TYPED_RUNTIME_MODULE';
  const payload: Omit<CapabilitySynthesisPolicyDecision, 'decisionHash'> = {
    artifactKind: CAPABILITY_SYNTHESIS_POLICY_REPORT_KIND,
    schemaVersion: CAPABILITY_SYNTHESIS_POLICY_REPORT_SCHEMA_VERSION,
    policyVersion: CAPABILITY_SYNTHESIS_POLICY_VERSION,
    policyEvaluationStatus: 'EVALUATED',
    requestId: overrides.requestId ?? 'capsyn_req_12345678',
    sourceGapReportHash: specification.sourceGapReportHash,
    registrySnapshotHash: specification.registrySnapshotHash,
    activeCapabilityLockHash: specification.activeCapabilityLockHash,
    specificationHash: specification.specificationHash,
    policyInputHash: 'fnv1a_policy_input',
    decisionContextHash: 'fnv1a_decision_context',
    riskTier,
    mode,
    allowed: overrides.allowed ?? (riskTier === 'R1_DECLARATIVE_EXTENSION' || riskTier === 'R2_BOUNDED_RUNTIME_MODULE'),
    implementationSandboxAllowed: overrides.implementationSandboxAllowed ?? riskTier === 'R2_BOUNDED_RUNTIME_MODULE',
    requiredApprovals: ['capability_maintainer', 'runtime_code_owner'],
    requiredGates: ['policy_decision'],
    blockingRules: [],
    rationale: ['scaffold fixture']
  };
  return { ...payload, decisionHash: hashStableJson(payload) };
}

function rehashPolicyDecision(decision: CapabilitySynthesisPolicyDecision): CapabilitySynthesisPolicyDecision {
  const { decisionHash: _decisionHash, ...payload } = decision;
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

function makeSpecification(overrides: Partial<Omit<CapabilitySpecificationCandidate, 'specificationHash'>> = {}): CapabilitySpecificationCandidate {
  return buildCapabilitySpecificationCandidate({
    schemaVersion: CAPABILITY_SPECIFICATION_SCHEMA_VERSION,
    specificationId: 'spec_combat_projectile_ricochet_v1',
      requestId: 'capsyn_req_12345678',
    sourceGapReportHash: 'fnv1a_gap',
    registrySnapshotHash: 'fnv1a_registry',
    activeCapabilityLockHash: 'fnv1a_lock',
    proposedCapabilityId: 'combat.projectile_ricochet.v1',
    proposedPackageVersion: '1.0.0',
    capabilityContractVersion: CAPABILITY_SPECIFICATION_CONTRACT_VERSION,
    title: 'Projectile Ricochet',
    description: 'Adds bounded projectile ricochet with deterministic damage falloff.',
    semanticContract: 'Projectile ricochet with bounded wall bounce count and deterministic damage falloff.',
    explicitNonGoals: ['does not change fire cadence'],
    runtimeFamilies: ['phaser_2d_action_arcade.v1'],
    dependencies: [{ capabilityId: 'combat.projectile.v1', versionRange: '^1.0.0', requiredInterface: 'ProjectileLifecycle.v1', reason: 'Augments projectiles.' }],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ interfaceId: 'ProjectileRicochet.v1', description: 'Bounded ricochet behavior.' }],
    dsl: {
      ownedPaths: ['/entities/components/projectile_ricochet'],
      schema: { type: 'object' },
      defaults: { maxBounces: 2 },
      normalizationRules: ['clamp maxBounces'],
      validationRules: [{ ruleId: 'ricochet_bounds', path: '/entities/components/projectile_ricochet', assertion: 'maxBounces <= 5' }],
      examples: [{ maxBounces: 2 }]
    },
    ir: {
      ownedNodeKinds: ['component.projectile.ricochet'],
      fragmentContract: { component: 'projectile.ricochet' },
      compileRules: ['compile ricochet component'],
      mergePolicy: ['append only']
    },
    runtime: {
      requiredServices: ['physics.arcade_collision'],
      lifecycle: ['create', 'update', 'teardown'],
      stateModel: { reversible: true },
      deterministicRules: ['reflect velocity'],
      patchPolicy: 'warm',
      teardownRequirements: ['remove collision listener'],
      ownedStateKeys: ['projectile.ricochet.bounceCount'],
      ownedEvents: ['projectile.ricochet']
    },
    amendments: {
      supportedOperations: ['set_ricochet_count'],
      patchPolicy: 'warm',
      expectedEffects: ['projectile trajectory reflects']
    },
    qa: {
      requiredProbes: [scenario('ricochet_twice')],
      externalAssertions: ['no extra ricochet'],
      mutationTargets: ['maxBounces'],
      failureScenarios: ['bounces too many times']
    },
    render: {
      assetRoles: ['ricochet_spark'],
      sceneBindings: ['projectile.ricochet'],
      fallbackPolicy: 'fail_closed',
      renderEvidence: ['step33_render_fidelity_required']
    },
    security: {
      requiredPrivileges: [],
      forbiddenPrivileges: ['filesystem', 'network', 'package_manager', 'secrets', 'shell'],
      dataAccess: ['candidate_spec_only']
    },
    budgets: {
      maxRuntimeMsPerFrame: 0.4
    },
    acceptanceScenarios: [scenario('ricochet_twice')],
    provenance: {
      provider: 'fixture',
      model: 'fixture',
      invocationId: 'scaffold_invocation',
      promptVersion: 'step36.capability-specification.prompt.v1'
    },
    ...overrides
  });
}

function makeSpecificationWithoutRender(): CapabilitySpecificationCandidate {
  const { specificationHash: _specificationHash, render: _render, ...payload } = makeSpecification();
  return buildCapabilitySpecificationCandidate(payload);
}

function networkProbes() {
  return {
    outboundTcp: networkProbe('outboundTcp'),
    dnsLookup: networkProbe('dnsLookup'),
    httpFetch: networkProbe('httpFetch'),
    webSocket: networkProbe('webSocket'),
    cloudMetadata: networkProbe('cloudMetadata')
  };
}

function networkProbe(kind: string) {
  return {
    status: 'failed' as const,
    target: `${kind}.invalid`,
    startedAt: '2026-06-19T00:00:00.000Z',
    endedAt: '2026-06-19T00:00:01.000Z',
    observedErrorCategory: 'network_disabled',
    executorEvidenceId: `net_probe_${kind}`
  };
}

function scenario(id: string) {
  return {
    scenarioId: id,
    probeId: id,
    given: ['projectile is moving toward a wall'],
    when: 'projectile collides with wall',
    actions: ['spawn projectile'],
    observations: ['projectile emits projectile.ricochet event'],
    assertions: ['ricochet count is at most 2'],
    negativeAssertions: ['projectile does not ricochet a third time'],
    tolerance: 'one physics tick',
    requiredEvidenceSource: 'capability_qa_report'
  };
}
