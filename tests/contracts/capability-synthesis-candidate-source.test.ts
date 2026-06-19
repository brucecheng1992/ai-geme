import { describe, expect, it } from 'vitest';

import {
  CAPABILITY_SCAFFOLD_VERSION,
  CAPABILITY_SPECIFICATION_CONTRACT_VERSION,
  CAPABILITY_SPECIFICATION_SCHEMA_VERSION,
  CAPABILITY_SYNTHESIS_POLICY_DECISION_TRUSTED_NAMESPACE,
  CAPABILITY_SYNTHESIS_POLICY_REPORT_KIND,
  CAPABILITY_SYNTHESIS_POLICY_REPORT_SCHEMA_VERSION,
  CAPABILITY_SYNTHESIS_POLICY_VERSION,
  buildCandidateSourceArtifacts,
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
  validateCapabilitySynthesisAttemptManifestIntegrity,
  type CandidateSourceResponse,
  type CapabilitySpecificationCandidate,
  type CapabilitySynthesisPolicyDecision,
  type CapabilitySynthesisPolicyDecisionReceipt,
  type CapabilitySynthesisPolicyDecisionReceiptResolver
} from '../../packages/game-dsl/src/index.js';
import { hashStableJson } from '../../packages/game-dsl/src/gameplay-capabilities/stable-json.js';

describe('Step36 AI-assisted candidate source response contracts', () => {
  it('accepts only complete writable files and binds source artifacts to the full trusted context', () => {
    const fixture = candidateSourceFixture();
    const rawResponse = validSourceResponse(fixture);
    const artifacts = buildCandidateSourceArtifacts({ ...fixture, rawResponse });
    const reversed = buildCandidateSourceArtifacts({
      ...fixture,
      rawResponse: {
        ...rawResponse,
        files: [...rawResponse.files].reverse()
      }
    });

    expect(artifacts.policyPrecheck.status).toBe('allowed');
    expect(artifacts.policyPrecheck.filesWritten).toBe(true);
    expect(artifacts.sourceManifest.status).toBe('written');
    expect(artifacts.sourceManifest.allOrNothing).toBe(true);
    expect(artifacts.sourceManifest.files.map((file) => file.path)).toEqual(writablePaths(fixture));
    expect(artifacts.provenance.inputHashes).toMatchObject({
      specificationHash: fixture.scaffoldArtifacts.report.specificationHash,
      decisionContextHash: fixture.policyDecision.decisionContextHash,
      policyDecisionReceiptHash: fixture.policyReceipt.receiptHash,
      attemptManifestHash: fixture.attemptManifest.attemptManifestHash,
      workspaceManifestHash: fixture.attemptManifest.workspaceManifestHash,
      scaffoldReportHash: fixture.scaffoldArtifacts.report.scaffoldReportHash,
      allowedFileMapHash: fixture.scaffoldArtifacts.allowedFileMap?.allowedFileMapHash,
      initialSourceManifestHash: fixture.scaffoldArtifacts.sourceManifest?.initialSourceManifestHash,
      sdkVersion: fixture.sdkVersion,
      sdkHash: fixture.sdkHash
    });
    expect(artifacts.sourceManifest.sourceManifestHash).toBe(reversed.sourceManifest.sourceManifestHash);
  });

  it('rejects extra, read-only, external, forbidden and duplicate paths without writing partial files', () => {
    const fixture = candidateSourceFixture();
    const rawResponse = validSourceResponse(fixture);
    const blocked = buildCandidateSourceArtifacts({
      ...fixture,
      rawResponse: {
        ...rawResponse,
        files: [
          ...rawResponse.files,
          { path: 'manifest.json', content: '{}', purpose: 'mutate manifest' },
          { path: 'tests/external/harness-contract.test.ts', content: 'export const external = true;', purpose: 'mutate external test' },
          { path: 'src/.env', content: 'SECRET=x', purpose: 'write env' },
          { path: 'src\\schema.ts', content: 'export const windowsPath = true;', purpose: 'unsafe path separator' },
          { path: 'Dockerfile', content: 'FROM node:22', purpose: 'container artifact' },
          { path: 'src/extra.ts', content: 'export const extra = true;', purpose: 'extra source' },
          rawResponse.files[0]
        ]
      }
    });

    expect(blocked.policyPrecheck.status).toBe('blocked');
    expect(blocked.policyPrecheck.filesWritten).toBe(false);
    expect(blocked.sourceManifest.status).toBe('blocked');
    expect(blocked.sourceManifest.files).toEqual([]);
    expect(blocked.policyPrecheck.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['SOURCE_PATH_NOT_WRITABLE', 'SOURCE_PATH_INVALID', 'SOURCE_PATH_DUPLICATE'])
    );
  });

  it.each([
    ['node import', "import fs from 'fs';\nexport const bad = fs;", 'SOURCE_FORBIDDEN_API'],
    ['external package import', "import leftPad from 'left-pad';\nexport const bad = leftPad;", 'SOURCE_FORBIDDEN_API'],
    ['direct Phaser', "import Phaser from 'phaser';\nexport const bad = Phaser.Math;", 'SOURCE_DIRECT_ENGINE_ACCESS'],
    ['direct scene add', 'export const bad = (scene: SceneLike) => scene.add.sprite(0, 0, "x");', 'SOURCE_DIRECT_ENGINE_ACCESS'],
    ['process env', 'export const bad = process.env.OPENAI_API_KEY;', 'SOURCE_FORBIDDEN_API'],
    ['dynamic code', 'export const bad = eval("1 + 1");', 'SOURCE_FORBIDDEN_API'],
    ['web crypto random', 'export const bad = crypto.getRandomValues(new Uint8Array(1));', 'SOURCE_FORBIDDEN_API'],
    ['any escape', 'export const bad = (value: any) => value;', 'SOURCE_ANY_ESCAPE'],
    ['generic any escape', 'export const bad = (value: Record<string, any>) => value;', 'SOURCE_ANY_ESCAPE'],
    ['unknown cast chain', 'export const bad = value as unknown as RuntimeContext;', 'SOURCE_ANY_ESCAPE'],
    ['placeholder', 'export function install() { throw new Error("not implemented"); }', 'SOURCE_PLACEHOLDER_IMPLEMENTATION'],
    ['base64', 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWkFCQ0RFRkdISg==', 'SOURCE_CONTENT_BASE64'],
    ['embedded base64', 'export const payload = "QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWkFCQ0RFRkdISg==";', 'SOURCE_CONTENT_BASE64'],
    ['binary', 'export const bad = "ok";\0', 'SOURCE_CONTENT_BINARY']
  ] as const)('rejects %s candidate content', (_name, content, expectedCode) => {
    const fixture = candidateSourceFixture();
    const rawResponse = sourceResponseWithFirstContent(fixture, content);
    const artifacts = buildCandidateSourceArtifacts({ ...fixture, rawResponse, maxFileBytes: 256 });

    expect(artifacts.policyPrecheck.status).toBe('blocked');
    expect(artifacts.policyPrecheck.filesWritten).toBe(false);
    expect(artifacts.sourceManifest.files).toEqual([]);
    expect(artifacts.policyPrecheck.issues.map((issue) => issue.code)).toContain(expectedCode);
  });

  it('blocks unimplemented declarations, oversized output and missing required writable files', () => {
    const fixture = candidateSourceFixture();
    const rawResponse = validSourceResponse(fixture);
    const blocked = buildCandidateSourceArtifacts({
      ...fixture,
      rawResponse: {
        ...rawResponse,
        files: rawResponse.files.slice(0, -1).map((file, index) => index === 0 ? { ...file, content: 'x'.repeat(512) } : file),
        unimplemented: ['runtime teardown is not complete']
      },
      maxFileBytes: 128
    });

    expect(blocked.policyPrecheck.status).toBe('blocked');
    expect(blocked.policyPrecheck.filesWritten).toBe(false);
    expect(blocked.policyPrecheck.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['SOURCE_CONTENT_OVERSIZED', 'SOURCE_REQUIRED_FILE_MISSING', 'SOURCE_UNIMPLEMENTED_DECLARED'])
    );
  });

  it('blocks stale scaffold context and invalid policy receipts', () => {
    const fixture = candidateSourceFixture();
    const rawResponse = validSourceResponse(fixture);
    const staleScaffold = {
      ...fixture.scaffoldReport,
      allowedFileMapHash: 'fnv1a_stale_allowed_map'
    };
    const invalidReceipt = {
      ...fixture.policyReceipt,
      subject: {
        ...fixture.policyReceipt.subject,
        decisionContextHash: 'fnv1a_stale_context'
      }
    };
    const invalidReceiptPayload = stripReceiptHash(invalidReceipt);
    const blocked = buildCandidateSourceArtifacts({
      ...fixture,
      rawResponse,
      scaffoldReport: staleScaffold,
      trustedPolicyDecisionReceiptRef: invalidReceipt.trustedArtifactRef,
      trustedPolicyDecisionStore: trustedPolicyDecisionStore({
        ...invalidReceiptPayload,
        receiptHash: hashStableJson(invalidReceiptPayload)
      })
    });

    expect(blocked.policyPrecheck.status).toBe('blocked');
    expect(blocked.policyPrecheck.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['SOURCE_POLICY_RECEIPT_INVALID', 'SOURCE_CONTEXT_MISMATCH', 'SOURCE_SCAFFOLD_REPORT_INVALID'])
    );
  });

  it('recomputes allowed map, initial manifest and attempt manifest hashes before trusting writable scope', () => {
    const fixture = candidateSourceFixture();
    const rawResponse = validSourceResponse(fixture);
    const forgedAllowedFileMap = {
      ...fixture.allowedFileMap,
      files: fixture.allowedFileMap.files.map((file) =>
        file.path === 'manifest.json'
          ? { ...file, classification: 'writable_by_model' as const, owner: 'model_candidate' as const }
          : file
      )
    };
    const forgedInitialSourceManifest = {
      ...fixture.initialSourceManifest,
      files: []
    };
    const forgedAttemptManifest = {
      ...fixture.attemptManifest,
      requestId: 'capsyn_req_87654321'
    };
    const blocked = buildCandidateSourceArtifacts({
      ...fixture,
      rawResponse: {
        ...rawResponse,
        files: [
          ...rawResponse.files,
          { path: 'manifest.json', content: '{}', purpose: 'try to write trusted manifest' }
        ]
      },
      allowedFileMap: forgedAllowedFileMap,
      initialSourceManifest: forgedInitialSourceManifest,
      attemptManifest: forgedAttemptManifest
    });

    expect(blocked.policyPrecheck.status).toBe('blocked');
    expect(blocked.policyPrecheck.filesWritten).toBe(false);
    expect(blocked.sourceManifest.files).toEqual([]);
    expect(blocked.policyPrecheck.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['SOURCE_CONTEXT_MISMATCH', 'SOURCE_PATH_NOT_WRITABLE'])
    );
  });
});

function candidateSourceFixture() {
  const specification = makeSpecification();
  const policyDecision = makePolicyDecision(specification);
  const policyReceipt = buildCapabilitySynthesisPolicyDecisionReceipt({ decision: policyDecision });
  const attempt = buildAttemptFixture(policyDecision);
  const scaffoldArtifacts = buildCapabilityScaffoldArtifacts({
    specification,
    policyDecision,
    trustedPolicyDecisionReceiptRef: policyReceipt.trustedArtifactRef,
    trustedPolicyDecisionStore: trustedPolicyDecisionStore(policyReceipt),
    attemptManifest: attempt.attemptManifest,
    attemptManifestIntegrityReport: attempt.attemptManifestIntegrityReport,
    trustedAttemptManifestIntegrityReportHash: attempt.attemptManifestIntegrityReport.reportHash,
    scaffoldVersion: CAPABILITY_SCAFFOLD_VERSION,
    sdkVersion: 'sdk.step36.reference.v1'
  });
  if (
    scaffoldArtifacts.allowedFileMap === undefined ||
    scaffoldArtifacts.sourceManifest === undefined
  ) {
    throw new Error('Expected generated scaffold artifacts for candidate source fixture.');
  }
  return {
    specification,
    policyDecision,
    policyReceipt,
    trustedPolicyDecisionReceiptRef: policyReceipt.trustedArtifactRef,
    trustedPolicyDecisionStore: trustedPolicyDecisionStore(policyReceipt),
    attemptManifest: attempt.attemptManifest,
    scaffoldReport: scaffoldArtifacts.report,
    allowedFileMap: scaffoldArtifacts.allowedFileMap,
    initialSourceManifest: scaffoldArtifacts.sourceManifest,
    scaffoldArtifacts,
    sdkVersion: 'sdk.step36.reference.v1',
    sdkHash: 'fnv1a_sdk_reference',
    model: {
      provider: 'fixture',
      model: 'fixture-model',
      promptVersion: 'step36.candidate-source.prompt.v1',
      invocationId: 'candidate_source_invocation_1',
      fallbackUsed: false
    }
  };
}

function validSourceResponse(fixture: ReturnType<typeof candidateSourceFixture>): CandidateSourceResponse {
  return {
    schemaVersion: 'step36.candidate-source-response.v1',
    files: writablePaths(fixture).map((path) => ({
      path,
      content: sourceContentForPath(path),
      purpose: `Implement ${path}`
    })),
    assumptions: [],
    unimplemented: []
  };
}

function sourceResponseWithFirstContent(
  fixture: ReturnType<typeof candidateSourceFixture>,
  content: string
): CandidateSourceResponse {
  const response = validSourceResponse(fixture);
  return {
    ...response,
    files: response.files.map((file, index) => index === 0 ? { ...file, content } : file)
  };
}

function writablePaths(fixture: ReturnType<typeof candidateSourceFixture>): string[] {
  return fixture.allowedFileMap.files
    .filter((file) => file.classification === 'writable_by_model')
    .map((file) => file.path)
    .sort();
}

function sourceContentForPath(path: string): string {
  if (path.endsWith('.json')) {
    return JSON.stringify({ capability: 'combat.projectile_ricochet.v1', path }, null, 2);
  }
  const exportedName = path.replace(/[^A-Za-z0-9]/g, '_');
  return `export const ${exportedName} = {\n  capability: 'combat.projectile_ricochet.v1',\n  path: '${path}'\n};\n`;
}

function buildAttemptFixture(policyDecision: CapabilitySynthesisPolicyDecision) {
  const requestId = policyDecision.requestId;
  if (requestId === undefined) {
    throw new Error('Expected policy decision requestId in candidate source fixture.');
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

function makePolicyDecision(specification: CapabilitySpecificationCandidate): CapabilitySynthesisPolicyDecision {
  const payload: Omit<CapabilitySynthesisPolicyDecision, 'decisionHash'> = {
    artifactKind: CAPABILITY_SYNTHESIS_POLICY_REPORT_KIND,
    schemaVersion: CAPABILITY_SYNTHESIS_POLICY_REPORT_SCHEMA_VERSION,
    policyVersion: CAPABILITY_SYNTHESIS_POLICY_VERSION,
    policyEvaluationStatus: 'EVALUATED',
    requestId: specification.requestId,
    sourceGapReportHash: specification.sourceGapReportHash,
    registrySnapshotHash: specification.registrySnapshotHash,
    activeCapabilityLockHash: specification.activeCapabilityLockHash,
    specificationHash: specification.specificationHash,
    policyInputHash: 'fnv1a_policy_input',
    decisionContextHash: 'fnv1a_decision_context',
    riskTier: 'R2_BOUNDED_RUNTIME_MODULE',
    mode: 'BOUNDED_TYPED_RUNTIME_MODULE',
    allowed: true,
    implementationSandboxAllowed: true,
    requiredApprovals: ['capability_maintainer', 'runtime_code_owner'],
    requiredGates: ['policy_decision'],
    blockingRules: [],
    rationale: ['candidate source fixture']
  };
  return { ...payload, decisionHash: hashStableJson(payload) };
}

function makeSpecification(): CapabilitySpecificationCandidate {
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
    explicitNonGoals: ['does not change fire cadence', 'does not add package dependencies'],
    runtimeFamilies: ['phaser_2d_action_arcade.v1'],
    dependencies: [{ capabilityId: 'combat.projectile.v1', versionRange: '^1.0.0', requiredInterface: 'ProjectileLifecycle.v1', reason: 'Ricochet augments projectiles.' }],
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
      mergePolicy: ['append runtime config']
    },
    runtime: {
      requiredServices: ['physics.arcade_collision', 'combat.damage_pipeline'],
      lifecycle: ['create', 'update', 'teardown'],
      stateModel: { reversible: true },
      deterministicRules: ['reflect velocity on wall collision'],
      patchPolicy: 'warm',
      teardownRequirements: ['remove projectile collision listener'],
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
      externalAssertions: ['no third ricochet'],
      mutationTargets: ['maxBounces'],
      failureScenarios: ['too many bounces']
    },
    render: {
      assetRoles: [],
      sceneBindings: [],
      fallbackPolicy: 'not_applicable',
      renderEvidence: ['step33_render_fidelity_required']
    },
    security: {
      requiredPrivileges: [],
      forbiddenPrivileges: ['filesystem', 'network', 'package_manager', 'secrets', 'shell'],
      dataAccess: ['candidate_spec_only']
    },
    budgets: { maxRuntimeMsPerFrame: 0.4 },
    acceptanceScenarios: [scenario('ricochet_twice')],
    provenance: {
      provider: 'fixture',
      model: 'fixture',
      invocationId: 'candidate_source_spec',
      promptVersion: 'step36.specification.prompt.v1'
    }
  });
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

function stripReceiptHash(
  receipt: CapabilitySynthesisPolicyDecisionReceipt
): Omit<CapabilitySynthesisPolicyDecisionReceipt, 'receiptHash'> {
  const { receiptHash: _receiptHash, ...payload } = receipt;
  return payload;
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
    actions: ['spawn projectile', 'advance physics until wall collision'],
    observations: ['projectile emits projectile.ricochet event', 'projectile velocity reflects'],
    assertions: ['ricochet count is at most 2'],
    negativeAssertions: ['projectile does not ricochet a third time'],
    tolerance: 'one physics tick',
    requiredEvidenceSource: 'capability_qa_report'
  };
}
