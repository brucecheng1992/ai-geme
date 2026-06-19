import { describe, expect, it } from 'vitest';

import {
  CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION,
  REGISTRY_INSTALL_RECEIPT_KIND,
  buildAmendmentCapabilityWaitingState,
  buildLinkedAmendmentSynthesisRef,
  buildPostInstallAmendmentVerificationReport,
  buildPostInstallCandidateCapabilityLock,
  buildPostInstallCapabilityResolution,
  buildPostInstallRenderFidelityReport,
  buildStep34CapabilityBackfillGate,
  buildStep34CapabilityDecisionRecord,
  resolveGameplayCapabilityGraph,
  type GameAmendmentIr,
  type GameAmendmentOperation,
  type GameplayCapabilityPackageContract,
  type RegistryInstallReceipt,
  type SemanticEditProposal
} from '../../packages/game-dsl/src/index.js';
import { hashStableJson } from '../../packages/game-dsl/src/gameplay-capabilities/stable-json.js';

describe('Step36 Step34 amendment and Step33 render integration contracts', () => {
  it('keeps Step34 waiting with Accept disabled and active artifacts unchanged before install', () => {
    const fixture = integrationFixture({ includeInstallReceipt: false });
    const resolution = buildPostInstallCapabilityResolution({
      linkedRef: fixture.linkedRef,
      waitingState: fixture.waitingState,
      resolutionReport: fixture.resolutionReport,
      currentBaseArtifactHashes: fixture.baseArtifactHashes,
      currentBaseCapabilityLockHash: fixture.baseLock.lockHash,
      currentRegistrySnapshotHash: 'fnv1a_registry_after'
    });
    const accept = buildStep34CapabilityDecisionRecord({
      decision: 'accept',
      amendmentProposalId: fixture.proposal.id,
      previousProjectLockHash: fixture.baseLock.lockHash,
      candidateCapabilityLockHash: fixture.resolutionReport.lock?.lockHash
    });

    expect(fixture.waitingState.status).toBe('waiting');
    expect(fixture.waitingState.acceptEnabled).toBe(false);
    expect(fixture.waitingState.activeRunMutation).toBe(false);
    expect(fixture.waitingState.sandboxPreviewPromotable).toBe(false);
    expect(resolution.status).toBe('blocked');
    expect(resolution.issues.map((issue) => issue.code)).toContain('INSTALL_RECEIPT_INVALID');
    expect(accept.status).toBe('blocked');
    expect(accept.issues.map((issue) => issue.code)).toContain('ACCEPT_GATE_NOT_REVIEWABLE');
    expect(accept.activeProjectLockHash).toBe(fixture.baseLock.lockHash);
  });

  it('requires committed install, fresh resolution, candidate lock, amendment verification and render gate before reviewable Step34 gate', () => {
    const fixture = integrationFixture();
    const resolution = postInstallResolution(fixture);
    const candidateLock = buildPostInstallCandidateCapabilityLock({
      resolution,
      previousProjectLock: fixture.baseLock,
      activeProjectLockHashAfterInstall: fixture.baseLock.lockHash
    });
    const verification = buildPostInstallAmendmentVerificationReport({
      amendmentIr: fixture.amendmentIr,
      candidateLock,
      candidateDslHash: 'fnv1a_candidate_dsl',
      candidateIrHash: 'fnv1a_candidate_ir',
      runtimeManifestHash: 'fnv1a_runtime_manifest',
      gameplayQaReportHash: 'fnv1a_gameplay_qa',
      evidenceByEffectId: { 'op_add_pickup_rule:effect:0': 'fnv1a_effect_evidence' }
    });
    const render = buildPostInstallRenderFidelityReport({
      amendmentProposalId: fixture.proposal.id,
      renderRequired: true,
      visualChangeKinds: ['visual_effect'],
      renderStatus: 'full_pass',
      evidenceRefs: ['post_install_render_fidelity_report.json']
    });
    const gate = buildStep34CapabilityBackfillGate({
      waitingState: fixture.waitingState,
      linkedRef: fixture.linkedRef,
      resolution,
      candidateLock,
      amendmentVerification: verification,
      renderFidelity: render
    });
    const accept = buildStep34CapabilityDecisionRecord({
      decision: 'accept',
      amendmentProposalId: fixture.proposal.id,
      gate,
      gateEvidence: { waitingState: fixture.waitingState, linkedRef: fixture.linkedRef, resolution, candidateLock, amendmentVerification: verification, renderFidelity: render },
      previousProjectLockHash: fixture.baseLock.lockHash,
      candidateCapabilityLockHash: candidateLock.candidateCapabilityLockHash,
      installReceiptHash: fixture.installReceipt?.receiptHash
    });

    expect(resolution.status).toBe('resolved');
    expect(candidateLock.status).toBe('ready');
    expect(candidateLock.lockDiff?.addedCapabilityIds).toEqual(['pickup.drop_collect.v1']);
    expect(candidateLock.activeProjectLockMutation).toBe(false);
    expect(verification.status).toBe('passed');
    expect(render.status).toBe('passed');
    expect(gate.status).toBe('reviewable');
    expect(gate.acceptEnabled).toBe(true);
    expect(accept.status).toBe('applied');
    expect(accept.activeProjectLockHash).toBe(candidateLock.candidateCapabilityLockHash);
    expect(accept.registryPackageAction).toBe('none');
  });

  it('blocks tampered child artifacts before the Step34 backfill gate becomes reviewable', () => {
    const fixture = integrationFixture();
    const ready = reviewableArtifacts(fixture);
    const tamperedVerification = {
      ...ready.amendmentVerification,
      candidateDslHash: 'fnv1a_forged_candidate_dsl'
    };
    const tamperedRender = {
      ...ready.renderFidelity,
      evidenceRefs: ['forged_render_fidelity_report.json']
    };
    const verificationGate = buildStep34CapabilityBackfillGate({
      waitingState: fixture.waitingState,
      linkedRef: fixture.linkedRef,
      resolution: ready.resolution,
      candidateLock: ready.candidateLock,
      amendmentVerification: tamperedVerification,
      renderFidelity: ready.renderFidelity
    });
    const renderGate = buildStep34CapabilityBackfillGate({
      waitingState: fixture.waitingState,
      linkedRef: fixture.linkedRef,
      resolution: ready.resolution,
      candidateLock: ready.candidateLock,
      amendmentVerification: ready.amendmentVerification,
      renderFidelity: tamperedRender
    });

    expect(verificationGate.status).toBe('blocked');
    expect(verificationGate.issues.map((issue) => issue.code)).toContain('BACKFILL_CHILD_ARTIFACT_HASH_MISMATCH');
    expect(renderGate.status).toBe('blocked');
    expect(renderGate.issues.map((issue) => issue.code)).toContain('BACKFILL_CHILD_ARTIFACT_HASH_MISMATCH');
  });

  it('blocks self-consistent child artifacts bound to another proposal or candidate lock', () => {
    const fixture = integrationFixture();
    const ready = reviewableArtifacts(fixture);
    const forgedVerification = recomputeVerificationHash({
      ...ready.amendmentVerification,
      amendmentProposalId: 'proposal_other',
      candidateCapabilityLockHash: 'fnv1a_other_lock'
    });
    const gate = buildStep34CapabilityBackfillGate({
      waitingState: fixture.waitingState,
      linkedRef: fixture.linkedRef,
      resolution: ready.resolution,
      candidateLock: ready.candidateLock,
      amendmentVerification: forgedVerification,
      renderFidelity: ready.renderFidelity
    });

    expect(gate.status).toBe('blocked');
    expect(gate.issues.map((issue) => issue.code)).toContain('BACKFILL_ARTIFACT_CONTEXT_MISMATCH');
  });

  it('blocks Step34 Accept when the gate hash or gate bindings are forged', () => {
    const fixture = integrationFixture();
    const ready = reviewableArtifacts(fixture);
    const gate = buildStep34CapabilityBackfillGate({
      waitingState: fixture.waitingState,
      linkedRef: fixture.linkedRef,
      ...ready
    });
    const staleHashGate = {
      ...gate,
      candidateCapabilityLockHash: 'fnv1a_other_lock'
    };
    const selfConsistentMismatchedGate = recomputeGateHash(staleHashGate);
    const staleHashAccept = buildStep34CapabilityDecisionRecord({
      decision: 'accept',
      amendmentProposalId: fixture.proposal.id,
      gate: staleHashGate,
      gateEvidence: { waitingState: fixture.waitingState, linkedRef: fixture.linkedRef, ...ready },
      previousProjectLockHash: fixture.baseLock.lockHash,
      candidateCapabilityLockHash: ready.candidateLock.candidateCapabilityLockHash,
      installReceiptHash: fixture.installReceipt?.receiptHash
    });
    const mismatchedAccept = buildStep34CapabilityDecisionRecord({
      decision: 'accept',
      amendmentProposalId: fixture.proposal.id,
      gate: selfConsistentMismatchedGate,
      gateEvidence: { waitingState: fixture.waitingState, linkedRef: fixture.linkedRef, ...ready },
      previousProjectLockHash: fixture.baseLock.lockHash,
      candidateCapabilityLockHash: ready.candidateLock.candidateCapabilityLockHash,
      installReceiptHash: fixture.installReceipt?.receiptHash
    });

    expect(staleHashAccept.status).toBe('blocked');
    expect(staleHashAccept.issues.map((issue) => issue.code)).toContain('ACCEPT_GATE_HASH_MISMATCH');
    expect(staleHashAccept.activeProjectLockHash).toBe(fixture.baseLock.lockHash);
    expect(mismatchedAccept.status).toBe('blocked');
    expect(mismatchedAccept.issues.map((issue) => issue.code)).toContain('ACCEPT_GATE_CONTEXT_MISMATCH');
    expect(mismatchedAccept.activeProjectLockHash).toBe(fixture.baseLock.lockHash);
  });

  it('blocks a fully self-consistent reviewable gate when Accept has no child artifact evidence', () => {
    const fixture = integrationFixture();
    const ready = reviewableArtifacts(fixture);
    const gate = buildStep34CapabilityBackfillGate({
      waitingState: fixture.waitingState,
      linkedRef: fixture.linkedRef,
      ...ready
    });
    const forgedGate = recomputeGateHash({
      ...gate,
      candidateCapabilityLockHash: 'fnv1a_forged_candidate_lock',
      installReceiptHash: 'fnv1a_forged_install_receipt'
    });
    const accept = buildStep34CapabilityDecisionRecord({
      decision: 'accept',
      amendmentProposalId: fixture.proposal.id,
      gate: forgedGate,
      previousProjectLockHash: fixture.baseLock.lockHash,
      candidateCapabilityLockHash: 'fnv1a_forged_candidate_lock',
      installReceiptHash: 'fnv1a_forged_install_receipt'
    });

    expect(accept.status).toBe('blocked');
    expect(accept.issues.map((issue) => issue.code)).toContain('ACCEPT_GATE_PROVENANCE_MISSING');
    expect(accept.activeProjectLockHash).toBe(fixture.baseLock.lockHash);
  });

  it('blocks sandbox preview promotion and active run mutation before Step34 Accept', () => {
    const fixture = integrationFixture();
    const ready = reviewableArtifacts(fixture);
    const gate = buildStep34CapabilityBackfillGate({
      ...ready,
      waitingState: fixture.waitingState,
      linkedRef: fixture.linkedRef,
      sandboxPreviewPromoted: true,
      activeRunMutation: true
    });

    expect(gate.status).toBe('blocked');
    expect(gate.acceptEnabled).toBe(false);
    expect(gate.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['SANDBOX_PREVIEW_PROMOTION_FORBIDDEN', 'ACTIVE_RUN_MUTATED_BY_INSTALL'])
    );
  });

  it('requires stale Step34 base or stale registry snapshot to rebase instead of silently merging', () => {
    const fixture = integrationFixture();
    const staleBase = buildPostInstallCapabilityResolution({
      linkedRef: fixture.linkedRef,
      waitingState: fixture.waitingState,
      installReceipt: fixture.installReceipt,
      resolutionReport: fixture.resolutionReport,
      currentBaseArtifactHashes: { currentDsl: 'fnv1a_new_dsl' },
      currentBaseCapabilityLockHash: fixture.baseLock.lockHash,
      currentRegistrySnapshotHash: fixture.installReceipt?.afterSnapshotHash ?? ''
    });
    const staleRegistry = buildPostInstallCapabilityResolution({
      linkedRef: fixture.linkedRef,
      waitingState: fixture.waitingState,
      installReceipt: fixture.installReceipt,
      resolutionReport: fixture.resolutionReport,
      currentBaseArtifactHashes: fixture.baseArtifactHashes,
      currentBaseCapabilityLockHash: fixture.baseLock.lockHash,
      currentRegistrySnapshotHash: 'fnv1a_stale_registry'
    });

    expect(staleBase.status).toBe('blocked');
    expect(staleBase.issues.map((issue) => issue.code)).toContain('AMENDMENT_BASE_STALE');
    expect(staleRegistry.status).toBe('blocked');
    expect(staleRegistry.issues.map((issue) => issue.code)).toContain('REGISTRY_SNAPSHOT_STALE');
  });

  it('blocks reviewability when the installed package still does not satisfy the missing capability', () => {
    const fixture = integrationFixture();
    const missingCapabilityResolution = buildPostInstallCapabilityResolution({
      linkedRef: fixture.linkedRef,
      waitingState: fixture.waitingState,
      installReceipt: fixture.installReceipt,
      resolutionReport: resolveGameplayCapabilityGraph({
        requestedCapabilities: ['movement.run_jump.v1'],
        packages: [fixture.movementPackage],
        runtimeFamily: 'phaser_2d_action_arcade.v1',
        activeLock: fixture.baseLock
      }),
      currentBaseArtifactHashes: fixture.baseArtifactHashes,
      currentBaseCapabilityLockHash: fixture.baseLock.lockHash,
      currentRegistrySnapshotHash: fixture.installReceipt?.afterSnapshotHash ?? ''
    });

    expect(missingCapabilityResolution.status).toBe('blocked');
    expect(missingCapabilityResolution.issues.map((issue) => issue.code)).toContain('POST_INSTALL_CAPABILITY_MISSING');
  });

  it('requires expected-effect evidence before the backfilled amendment can become reviewable', () => {
    const fixture = integrationFixture();
    const ready = reviewableArtifacts(fixture);
    const missingEvidence = buildPostInstallAmendmentVerificationReport({
      amendmentIr: fixture.amendmentIr,
      candidateLock: ready.candidateLock,
      candidateDslHash: 'fnv1a_candidate_dsl',
      candidateIrHash: 'fnv1a_candidate_ir',
      runtimeManifestHash: 'fnv1a_runtime_manifest',
      gameplayQaReportHash: 'fnv1a_gameplay_qa'
    });
    const gate = buildStep34CapabilityBackfillGate({
      waitingState: fixture.waitingState,
      linkedRef: fixture.linkedRef,
      resolution: ready.resolution,
      candidateLock: ready.candidateLock,
      amendmentVerification: missingEvidence,
      renderFidelity: ready.renderFidelity
    });

    expect(missingEvidence.status).toBe('failed');
    expect(missingEvidence.issues.map((issue) => issue.code)).toContain('AMENDMENT_EXPECTED_EFFECT_EVIDENCE_MISSING');
    expect(gate.status).toBe('blocked');
    expect(gate.issues.map((issue) => issue.code)).toContain('AMENDMENT_VERIFICATION_FAILED');
  });

  it('keeps Step33 render fidelity authoritative and blocks generic fallback from claiming full visual success', () => {
    const missing = buildPostInstallRenderFidelityReport({
      amendmentProposalId: 'proposal_step36_13',
      renderRequired: true,
      visualChangeKinds: ['sprite'],
      renderStatus: 'missing'
    });
    const fallbackBlocked = buildPostInstallRenderFidelityReport({
      amendmentProposalId: 'proposal_step36_13',
      renderRequired: true,
      visualChangeKinds: ['visual_effect'],
      renderStatus: 'fallback_only',
      evidenceRefs: ['fallback_render.json']
    });
    const fallbackAllowed = buildPostInstallRenderFidelityReport({
      amendmentProposalId: 'proposal_step36_13',
      renderRequired: true,
      visualChangeKinds: ['visual_effect'],
      renderStatus: 'fallback_only',
      frozenSpecAllowsFallback: true,
      truthfulFallbackLabel: true,
      evidenceRefs: ['fallback_render.json']
    });

    expect(missing.status).toBe('failed');
    expect(missing.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(['RENDER_EVIDENCE_MISSING', 'RENDER_FIDELITY_REQUIRED']));
    expect(fallbackBlocked.status).toBe('failed');
    expect(fallbackBlocked.issues.map((issue) => issue.code)).toContain('RENDER_FALLBACK_NOT_FULL_PASS');
    expect(fallbackAllowed.status).toBe('passed');
    expect(fallbackAllowed.renderPassKind).toBe('fallback_allowed');
  });

  it('keeps Reject and Undo separate from registry uninstall or rollback', () => {
    const fixture = integrationFixture();
    const ready = reviewableArtifacts(fixture);
    const reject = buildStep34CapabilityDecisionRecord({
      decision: 'reject',
      amendmentProposalId: fixture.proposal.id,
      gate: buildStep34CapabilityBackfillGate({ waitingState: fixture.waitingState, linkedRef: fixture.linkedRef, ...ready }),
      previousProjectLockHash: fixture.baseLock.lockHash,
      candidateCapabilityLockHash: ready.candidateLock.candidateCapabilityLockHash,
      installReceiptHash: fixture.installReceipt?.receiptHash
    });
    const undo = buildStep34CapabilityDecisionRecord({
      decision: 'undo',
      amendmentProposalId: fixture.proposal.id,
      previousProjectLockHash: fixture.baseLock.lockHash,
      candidateCapabilityLockHash: ready.candidateLock.candidateCapabilityLockHash,
      previousCompleteCheckpointHash: 'fnv1a_complete_checkpoint',
      installReceiptHash: fixture.installReceipt?.receiptHash
    });

    expect(reject.status).toBe('applied');
    expect(reject.registryPackageAction).toBe('none');
    expect(reject.activeProjectLockHash).toBe(fixture.baseLock.lockHash);
    expect(undo.status).toBe('applied');
    expect(undo.registryPackageAction).toBe('none');
    expect(undo.activeProjectLockHash).toBe(fixture.baseLock.lockHash);
  });
});

function integrationFixture(options: { includeInstallReceipt?: boolean } = {}) {
  const movementPackage = createPackage('movement.run_jump.v1', {
    operations: [{ operation: 'SetComponentProperty:moveSpeed', executionPolicy: 'hot_runtime_patch' }]
  });
  const pickupPackage = createPackage('pickup.drop_collect.v1', {
    operations: [{ operation: 'AddRule', executionPolicy: 'regeneration_required' }]
  });
  const baseLock = requiredLock(
    resolveGameplayCapabilityGraph({
      requestedCapabilities: ['movement.run_jump.v1'],
      packages: [movementPackage],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    })
  );
  const installReceipt = options.includeInstallReceipt === false ? undefined : committedInstallReceipt(pickupPackage);
  const baseArtifactHashes = { currentDsl: 'hash_current_dsl' };
  const linkedRef = buildLinkedAmendmentSynthesisRef({
    amendmentProposalId: 'proposal_step36_13',
    synthesisRequestId: 'capsyn_req_step36_13',
    requestedCapabilitySemantics: ['drop a pickup when an enemy is defeated'],
    requestedCapabilityIds: ['pickup.drop_collect.v1'],
    baseArtifactHashes,
    baseCapabilityLockHash: baseLock.lockHash,
    baseRegistrySnapshotHash: 'fnv1a_registry_before',
    synthesisRequestHash: 'fnv1a_synthesis_request',
    decisionContextHash: 'fnv1a_decision_context',
    approvalValidityReceiptHash: 'fnv1a_approval_receipt',
    ...(installReceipt === undefined ? {} : { installReceiptHash: installReceipt.receiptHash })
  });
  const proposal = semanticProposal();
  const waitingState = buildAmendmentCapabilityWaitingState({
    proposal,
    linkedRef
  });
  const resolutionReport = resolveGameplayCapabilityGraph({
    requestedCapabilities: ['movement.run_jump.v1', 'pickup.drop_collect.v1'],
    packages: [movementPackage, pickupPackage],
    runtimeFamily: 'phaser_2d_action_arcade.v1',
    activeLock: baseLock
  });
  return {
    proposal,
    amendmentIr: createAmendmentIr([createRuleOperation('op_add_pickup_rule')]),
    movementPackage,
    pickupPackage,
    baseLock,
    baseArtifactHashes,
    linkedRef,
    waitingState,
    resolutionReport,
    installReceipt
  };
}

function postInstallResolution(fixture: ReturnType<typeof integrationFixture>) {
  return buildPostInstallCapabilityResolution({
    linkedRef: fixture.linkedRef,
    waitingState: fixture.waitingState,
    installReceipt: fixture.installReceipt,
    resolutionReport: fixture.resolutionReport,
    currentBaseArtifactHashes: fixture.baseArtifactHashes,
    currentBaseCapabilityLockHash: fixture.baseLock.lockHash,
    currentRegistrySnapshotHash: fixture.installReceipt?.afterSnapshotHash ?? ''
  });
}

function reviewableArtifacts(fixture: ReturnType<typeof integrationFixture>) {
  const resolution = postInstallResolution(fixture);
  const candidateLock = buildPostInstallCandidateCapabilityLock({
    resolution,
    previousProjectLock: fixture.baseLock,
    activeProjectLockHashAfterInstall: fixture.baseLock.lockHash
  });
  const amendmentVerification = buildPostInstallAmendmentVerificationReport({
    amendmentIr: fixture.amendmentIr,
    candidateLock,
    candidateDslHash: 'fnv1a_candidate_dsl',
    candidateIrHash: 'fnv1a_candidate_ir',
    runtimeManifestHash: 'fnv1a_runtime_manifest',
    gameplayQaReportHash: 'fnv1a_gameplay_qa',
    evidenceByEffectId: { 'op_add_pickup_rule:effect:0': 'fnv1a_effect_evidence' }
  });
  const renderFidelity = buildPostInstallRenderFidelityReport({
    amendmentProposalId: fixture.proposal.id,
    renderRequired: false
  });
  return { resolution, candidateLock, amendmentVerification, renderFidelity };
}

function semanticProposal(): SemanticEditProposal {
  const amendmentIr = createAmendmentIr([createRuleOperation('op_add_pickup_rule')]);
  return {
    id: 'proposal_step36_13',
    projectId: 'proj_step36_13',
    runId: 'run_base',
    createdAt: '2026-06-19T00:00:00.000Z',
    sourceText: '让敌人被击败时掉落一个可收集道具',
    language: 'zh',
    understanding: {
      understood: true,
      confidence: 0.95,
      summary: 'Add pickup drops after enemy defeat.',
      intentClass: 'structural_edit',
      affectedDomains: ['pickup', 'enemy', 'rules'],
      designDeltas: [{ kind: 'add_mechanic', mechanic: 'pickup', description: 'Enemies drop pickups.' }],
      operations: [{ kind: 'event_action', event: 'enemy_defeated', actions: [{ kind: 'spawn_pickup', pickup: 'coin' }] }],
      explicitConstraints: [],
      inferredConstraints: ['preserve enemy defeat flow'],
      unresolvedReferences: [],
      modelInvocationId: 'deepseek_invocation_001',
      plannerProvenanceStatus: 'DEEPSEEK_PLANNED'
    },
    amendmentIr,
    execution: {
      mode: 'unsupported_capability',
      reason: 'Pickup drop capability is missing before controlled synthesis.',
      supportedNow: false,
      requiresPreviewReload: false,
      requiresCandidateRun: false,
      missingCapabilities: ['pickup.drop_collect.v1'],
      rejectedUnsafeFallbacks: ['generic score popup']
    },
    executionPlan: {
      schemaVersion: 'step34.execution-plan.v1',
      proposalId: 'proposal_step36_13',
      mode: 'unsupported_capability',
      reason: 'Pickup drop capability is missing before controlled synthesis.',
      requiredCapabilities: ['pickup.drop_collect.v1'],
      availableCapabilities: [],
      missingCapabilities: ['pickup.drop_collect.v1'],
      incompatibleCapabilities: [],
      runtimeSessionRequired: false,
      candidateRunRequired: false,
      previewReloadRequired: false,
      operationPlan: [],
      verificationRequirements: amendmentIr.operations.flatMap((operation) => operation.expectedEffects),
      rejectedUnsafeFallbacks: ['generic score popup']
    },
    reviewState: 'proposed',
    userMessage: '需要等待受控 capability synthesis 完成后才能预览。'
  };
}

function createAmendmentIr(operations: GameAmendmentOperation[]): GameAmendmentIr {
  return {
    schemaVersion: 'step34.game-amendment-ir.v1',
    proposalId: 'proposal_step36_13',
    requestId: 'proposal_step36_13',
    baseRunId: 'run_base',
    baseArtifactHashes: { currentDsl: 'hash_current_dsl' },
    modelInvocationIds: ['deepseek_invocation_001'],
    operations,
    operationDependencies: operations.map((operation, index) => ({
      operationId: operation.id,
      dependsOn: index === 0 ? [] : [operations[index - 1].id]
    })),
    preservedConstraints: [{ id: 'preserve_core_loop', description: 'Preserve core loop.' }],
    rejectedUnsafeFallbacks: [{ requestedConcept: 'pickup drop', rejectedFallback: 'generic score popup', reason: 'Does not create a pickup entity.' }],
    provenance: {
      sourceTextHash: 'hash_source',
      semanticUnderstandingHash: 'hash_understanding',
      designDeltasHash: 'hash_deltas'
    }
  };
}

function createRuleOperation(id: string): GameAmendmentOperation {
  return {
    id,
    operation: 'addRule',
    target: { scope: 'game', id: 'rules' },
    value: { rule: 'drop pickup when enemy defeated' },
    preconditions: [{ kind: 'target_exists', target: { scope: 'game', id: 'rules' } }],
    requiresCapabilities: [{ capabilityId: 'pickup.drop_collect.v1', reason: 'Add pickup drop rule.', required: true }],
    expectedEffects: [{ kind: 'runtime_event', eventName: 'pickup_collected', minimumCount: 0 }]
  };
}

function createPackage(
  id: string,
  input: {
    operations: GameplayCapabilityPackageContract['amendments']['supportedOperations'];
  }
): GameplayCapabilityPackageContract {
  const ownedPath = `/entities/components/${id}`;
  return {
    manifest: {
      id,
      packageVersion: '1.0.0',
      capabilityVersion: 'v1',
      status: 'supported',
      description: `${id} package.`,
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: 'gameplay-capability-package.v1'
    },
    dsl: {
      schemaFragmentId: `${id}.schema`,
      ownedPaths: [ownedPath],
      normalizerId: `${id}.normalizer`,
      migrations: []
    },
    ir: {
      compilerId: `${id}.ir`,
      ownedNodeKinds: [`component.${id.replace(/\.v1$/, '')}`]
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: `${id}.system`, version: 'v1', phase: 'gameplay', dependencies: [] }]
    },
    amendments: {
      supportedOperations: input.operations,
      compilerId: `${id}.amendments`
    },
    patch: {
      descriptors: [{ id: `${id}.patch`, policy: 'hot_runtime_patch', ownedPaths: [ownedPath] }]
    },
    qa: {
      probes: [createQaProbe(`${id}.qa.required`, id)],
      requiredEvidence: [{ id: `${id}.evidence.runtime`, artifactKind: 'capability_qa_report', required: true }]
    },
    render: {
      assetRoles: [],
      sceneBindings: [],
      fallbackPolicy: 'not_applicable'
    },
    dependencies: [],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: `${id}.service`, version: 'v1' }],
    defaults: {},
    diagnostics: {}
  };
}

function createQaProbe(id: string, capabilityId: string): GameplayCapabilityPackageContract['qa']['probes'][number] {
  return {
    id,
    capabilityId,
    severity: 'required',
    prerequisites: ['candidate runtime started'],
    actions: [{ id: `${id}.action`, kind: 'runtime_event', target: `${capabilityId}.amendment_probe`, parameters: { event: 'probe_start' } }],
    observations: [{ id: `${id}.observation`, kind: 'runtime_event', runtimeSystemId: `${capabilityId}.system`, ref: `${capabilityId}.amendment_observed` }],
    assertions: [{ id: `${id}.assertion`, observationId: `${id}.observation`, comparator: 'exists', message: `${capabilityId} amendment behavior verified` }]
  };
}

function committedInstallReceipt(pkg: GameplayCapabilityPackageContract): RegistryInstallReceipt {
  const payload: Omit<RegistryInstallReceipt, 'receiptHash'> = {
    artifactKind: REGISTRY_INSTALL_RECEIPT_KIND,
    schemaVersion: CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION,
    status: 'committed',
    transactionId: 'reg_install_step36_13',
    packageId: pkg.manifest.id,
    packageVersion: pkg.manifest.packageVersion,
    installedStatus: 'experimental_complete',
    beforeSnapshotHash: 'fnv1a_registry_before',
    afterSnapshotHash: 'fnv1a_registry_after',
    precheckHash: 'fnv1a_precheck',
    approvalValidityHash: 'fnv1a_approval_validity',
    approvalValidityReceiptHash: 'fnv1a_approval_receipt',
    registryAdminAuthorizationHash: 'fnv1a_admin_auth',
    packageHash: hashStableJson(pkg),
    canaryPlanHash: 'fnv1a_canary_plan',
    canaryReportHash: 'fnv1a_canary_report',
    registryAdminHash: 'fnv1a_registry_admin',
    issues: []
  };
  return { ...payload, receiptHash: hashStableJson(payload) };
}

function requiredLock(report: ReturnType<typeof resolveGameplayCapabilityGraph>) {
  if (report.lock === undefined) {
    throw new Error(`expected resolver lock, got diagnostics: ${JSON.stringify(report.diagnostics)}`);
  }
  return report.lock;
}

function recomputeVerificationHash(
  report: ReturnType<typeof buildPostInstallAmendmentVerificationReport>
): ReturnType<typeof buildPostInstallAmendmentVerificationReport> {
  const { verificationHash: _verificationHash, ...payload } = report;
  return { ...payload, verificationHash: hashStableJson(payload) };
}

function recomputeGateHash(gate: ReturnType<typeof buildStep34CapabilityBackfillGate>): ReturnType<typeof buildStep34CapabilityBackfillGate> {
  const { gateHash: _gateHash, ...payload } = gate;
  return { ...payload, gateHash: hashStableJson(payload) };
}
