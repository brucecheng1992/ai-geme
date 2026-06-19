import type { GameAmendmentIr, SemanticEditProposal } from '../amendments/semantic-amendment-schema.js';
import type { GameplayCapabilityLock } from '../gameplay-capabilities/capability-lock.js';
import type { GameplayCapabilityResolutionReport } from '../gameplay-capabilities/capability-resolver.js';
import { hashStableJson } from '../gameplay-capabilities/stable-json.js';
import type { RegistryInstallReceipt } from './registry-install.js';

export const CAPABILITY_AMENDMENT_INTEGRATION_SCHEMA_VERSION = 'step36.capability-amendment-integration.v1';
export const LINKED_AMENDMENT_SYNTHESIS_REF_KIND = 'linked_amendment_synthesis_ref';
export const AMENDMENT_CAPABILITY_WAITING_STATE_KIND = 'amendment_capability_waiting_state';
export const POST_INSTALL_CAPABILITY_RESOLUTION_KIND = 'post_install_capability_resolution';
export const POST_INSTALL_CANDIDATE_CAPABILITY_LOCK_KIND = 'post_install_candidate_capability_lock';
export const POST_INSTALL_AMENDMENT_VERIFICATION_KIND = 'post_install_amendment_verification_report';
export const POST_INSTALL_RENDER_FIDELITY_KIND = 'post_install_render_fidelity_report';
export const STEP34_CAPABILITY_BACKFILL_GATE_KIND = 'step34_capability_backfill_gate';
export const STEP34_CAPABILITY_DECISION_RECORD_KIND = 'step34_capability_decision_record';

export type AmendmentCapabilityResolutionStatus =
  | 'SUPPORTED'
  | 'MISSING_CAPABILITY'
  | 'SYNTHESIS_ELIGIBLE'
  | 'SYNTHESIS_POLICY_BLOCKED'
  | 'MANUAL_CAPABILITY_REVIEW'
  | 'INCOMPATIBLE';

export type CapabilityAmendmentIntegrationIssue = {
  code:
    | 'LINKED_REF_HASH_MISMATCH'
    | 'WAITING_PROPOSAL_STATE_INVALID'
    | 'WAITING_STATE_INVALID'
    | 'INSTALL_RECEIPT_INVALID'
    | 'AMENDMENT_BASE_STALE'
    | 'REGISTRY_SNAPSHOT_STALE'
    | 'POST_INSTALL_RESOLUTION_BLOCKED'
    | 'POST_INSTALL_CAPABILITY_MISSING'
    | 'CANDIDATE_LOCK_INVALID'
    | 'ACTIVE_LOCK_MUTATED_BEFORE_ACCEPT'
    | 'AMENDMENT_EXPECTED_EFFECT_EVIDENCE_MISSING'
    | 'AMENDMENT_VERIFICATION_FAILED'
    | 'RENDER_FIDELITY_REQUIRED'
    | 'RENDER_EVIDENCE_MISSING'
    | 'RENDER_FALLBACK_NOT_FULL_PASS'
    | 'SANDBOX_PREVIEW_PROMOTION_FORBIDDEN'
    | 'ACTIVE_RUN_MUTATED_BY_INSTALL'
    | 'BACKFILL_ARTIFACT_CONTEXT_MISMATCH'
    | 'BACKFILL_CHILD_ARTIFACT_HASH_MISMATCH'
    | 'ACCEPT_GATE_CONTEXT_MISMATCH'
    | 'ACCEPT_GATE_HASH_MISMATCH'
    | 'ACCEPT_GATE_NOT_REVIEWABLE'
    | 'ACCEPT_GATE_PROVENANCE_MISMATCH'
    | 'ACCEPT_GATE_PROVENANCE_MISSING'
    | 'UNDO_CHECKPOINT_MISSING';
  message: string;
  path?: string;
};

export type LinkedAmendmentSynthesisRef = {
  artifactKind: typeof LINKED_AMENDMENT_SYNTHESIS_REF_KIND;
  schemaVersion: typeof CAPABILITY_AMENDMENT_INTEGRATION_SCHEMA_VERSION;
  amendmentProposalId: string;
  synthesisRequestId: string;
  requestedCapabilitySemantics: string[];
  requestedCapabilityIds: string[];
  baseArtifactHashes: Record<string, string>;
  baseCapabilityLockHash: string;
  baseRegistrySnapshotHash: string;
  synthesisRequestHash?: string;
  decisionContextHash?: string;
  approvalValidityReceiptHash?: string;
  installReceiptHash?: string;
  refHash: string;
};

export type AmendmentCapabilityWaitingState = {
  artifactKind: typeof AMENDMENT_CAPABILITY_WAITING_STATE_KIND;
  schemaVersion: typeof CAPABILITY_AMENDMENT_INTEGRATION_SCHEMA_VERSION;
  status: 'waiting' | 'blocked';
  amendmentProposalId: string;
  synthesisRequestId: string;
  step34ProposalState: 'WAITING_FOR_CAPABILITY_SYNTHESIS';
  reviewStateBeforeWaiting: SemanticEditProposal['reviewState'];
  acceptEnabled: false;
  activeRunMutation: false;
  sandboxPreviewPromotable: false;
  linkedRefHash: string;
  reason: string;
  issues: CapabilityAmendmentIntegrationIssue[];
  waitingHash: string;
};

export type PostInstallCapabilityResolution = {
  artifactKind: typeof POST_INSTALL_CAPABILITY_RESOLUTION_KIND;
  schemaVersion: typeof CAPABILITY_AMENDMENT_INTEGRATION_SCHEMA_VERSION;
  status: 'resolved' | 'blocked';
  amendmentProposalId: string;
  synthesisRequestId: string;
  linkedRefHash: string;
  installReceiptHash?: string;
  resolverReportHash: string;
  requiredCapabilityIds: string[];
  selectedCapabilityIds: string[];
  candidateLock?: GameplayCapabilityLock;
  issues: CapabilityAmendmentIntegrationIssue[];
  resolutionHash: string;
};

export type PostInstallCandidateCapabilityLock = {
  artifactKind: typeof POST_INSTALL_CANDIDATE_CAPABILITY_LOCK_KIND;
  schemaVersion: typeof CAPABILITY_AMENDMENT_INTEGRATION_SCHEMA_VERSION;
  status: 'ready' | 'blocked';
  amendmentProposalId: string;
  previousProjectLockHash: string;
  candidateCapabilityLockHash?: string;
  lockDiff?: {
    beforeLockHash: string;
    afterLockHash: string;
    addedCapabilityIds: string[];
    removedCapabilityIds: string[];
    changedPackageVersions: Array<{ capabilityId: string; beforePackageVersion: string; afterPackageVersion: string }>;
  };
  promotedOnStep34AcceptOnly: true;
  activeProjectLockMutation: false;
  issues: CapabilityAmendmentIntegrationIssue[];
  lockRecordHash: string;
};

export type PostInstallAmendmentVerificationReport = {
  artifactKind: typeof POST_INSTALL_AMENDMENT_VERIFICATION_KIND;
  schemaVersion: typeof CAPABILITY_AMENDMENT_INTEGRATION_SCHEMA_VERSION;
  status: 'passed' | 'failed';
  amendmentProposalId: string;
  amendmentIrHash: string;
  candidateCapabilityLockHash?: string;
  candidateDslHash: string;
  candidateIrHash: string;
  runtimeManifestHash: string;
  gameplayQaReportHash: string;
  expectedEffectEvidence: Array<{ effectId: string; evidenceHash?: string }>;
  issues: CapabilityAmendmentIntegrationIssue[];
  verificationHash: string;
};

export type PostInstallRenderFidelityReport = {
  artifactKind: typeof POST_INSTALL_RENDER_FIDELITY_KIND;
  schemaVersion: typeof CAPABILITY_AMENDMENT_INTEGRATION_SCHEMA_VERSION;
  status: 'passed' | 'failed';
  amendmentProposalId: string;
  renderRequired: boolean;
  visualChangeKinds: string[];
  renderStatus: 'not_required' | 'full_pass' | 'fallback_only' | 'failed' | 'missing';
  renderPassKind: 'not_required' | 'full_pass' | 'fallback_allowed' | 'failed';
  frozenSpecAllowsFallback: boolean;
  truthfulFallbackLabel: boolean;
  evidenceRefs: string[];
  issues: CapabilityAmendmentIntegrationIssue[];
  renderHash: string;
};

export type Step34CapabilityBackfillGate = {
  artifactKind: typeof STEP34_CAPABILITY_BACKFILL_GATE_KIND;
  schemaVersion: typeof CAPABILITY_AMENDMENT_INTEGRATION_SCHEMA_VERSION;
  status: 'reviewable' | 'blocked';
  amendmentProposalId: string;
  nextStep34State?: 'REVIEWABLE';
  acceptEnabled: boolean;
  activeRunMutation: false;
  sandboxPreviewPromotable: false;
  linkedRefHash: string;
  installReceiptHash?: string;
  candidateCapabilityLockHash?: string;
  amendmentVerificationHash?: string;
  renderFidelityHash?: string;
  issues: CapabilityAmendmentIntegrationIssue[];
  gateHash: string;
};

export type Step34CapabilityBackfillGateEvidence = {
  waitingState: AmendmentCapabilityWaitingState;
  linkedRef: LinkedAmendmentSynthesisRef;
  resolution: PostInstallCapabilityResolution;
  candidateLock: PostInstallCandidateCapabilityLock;
  amendmentVerification: PostInstallAmendmentVerificationReport;
  renderFidelity: PostInstallRenderFidelityReport;
};

export type Step34CapabilityDecisionRecord = {
  artifactKind: typeof STEP34_CAPABILITY_DECISION_RECORD_KIND;
  schemaVersion: typeof CAPABILITY_AMENDMENT_INTEGRATION_SCHEMA_VERSION;
  decision: 'accept' | 'reject' | 'undo';
  status: 'applied' | 'blocked';
  amendmentProposalId: string;
  registryPackageAction: 'none';
  previousProjectLockHash: string;
  activeProjectLockHash: string;
  candidateCapabilityLockHash?: string;
  previousCompleteCheckpointHash?: string;
  installReceiptHash?: string;
  issues: CapabilityAmendmentIntegrationIssue[];
  decisionHash: string;
};

export function buildLinkedAmendmentSynthesisRef(input: {
  amendmentProposalId: string;
  synthesisRequestId: string;
  requestedCapabilitySemantics: readonly string[];
  requestedCapabilityIds?: readonly string[];
  baseArtifactHashes: Record<string, string>;
  baseCapabilityLockHash: string;
  baseRegistrySnapshotHash: string;
  synthesisRequestHash?: string;
  decisionContextHash?: string;
  approvalValidityReceiptHash?: string;
  installReceiptHash?: string;
}): LinkedAmendmentSynthesisRef {
  const payload: Omit<LinkedAmendmentSynthesisRef, 'refHash'> = {
    artifactKind: LINKED_AMENDMENT_SYNTHESIS_REF_KIND,
    schemaVersion: CAPABILITY_AMENDMENT_INTEGRATION_SCHEMA_VERSION,
    amendmentProposalId: input.amendmentProposalId,
    synthesisRequestId: input.synthesisRequestId,
    requestedCapabilitySemantics: uniqueStrings(input.requestedCapabilitySemantics),
    requestedCapabilityIds: uniqueStrings(input.requestedCapabilityIds ?? []),
    baseArtifactHashes: sortRecord(input.baseArtifactHashes),
    baseCapabilityLockHash: input.baseCapabilityLockHash,
    baseRegistrySnapshotHash: input.baseRegistrySnapshotHash,
    ...(input.synthesisRequestHash === undefined ? {} : { synthesisRequestHash: input.synthesisRequestHash }),
    ...(input.decisionContextHash === undefined ? {} : { decisionContextHash: input.decisionContextHash }),
    ...(input.approvalValidityReceiptHash === undefined ? {} : { approvalValidityReceiptHash: input.approvalValidityReceiptHash }),
    ...(input.installReceiptHash === undefined ? {} : { installReceiptHash: input.installReceiptHash })
  };
  return { ...payload, refHash: hashStableJson(payload) };
}

export function buildAmendmentCapabilityWaitingState(input: {
  proposal: Pick<SemanticEditProposal, 'id' | 'reviewState'>;
  linkedRef: LinkedAmendmentSynthesisRef;
  reason?: string;
}): AmendmentCapabilityWaitingState {
  const issues = [
    ...(input.proposal.reviewState === 'proposed' || input.proposal.reviewState === 'failed'
      ? []
      : [issue('WAITING_PROPOSAL_STATE_INVALID', 'Only proposed or failed Step34 proposals can enter capability synthesis waiting state.')]),
    ...(input.linkedRef.refHash === recomputeLinkedRefHash(input.linkedRef)
      ? []
      : [issue('LINKED_REF_HASH_MISMATCH', 'Linked amendment synthesis ref hash does not match payload.')])
  ].sort(compareIssues);
  const payload: Omit<AmendmentCapabilityWaitingState, 'waitingHash'> = {
    artifactKind: AMENDMENT_CAPABILITY_WAITING_STATE_KIND,
    schemaVersion: CAPABILITY_AMENDMENT_INTEGRATION_SCHEMA_VERSION,
    status: issues.length === 0 ? 'waiting' : 'blocked',
    amendmentProposalId: input.proposal.id,
    synthesisRequestId: input.linkedRef.synthesisRequestId,
    step34ProposalState: 'WAITING_FOR_CAPABILITY_SYNTHESIS',
    reviewStateBeforeWaiting: input.proposal.reviewState,
    acceptEnabled: false,
    activeRunMutation: false,
    sandboxPreviewPromotable: false,
    linkedRefHash: input.linkedRef.refHash,
    reason: input.reason ?? 'Step34 proposal is waiting for controlled capability synthesis and install evidence.',
    issues
  };
  return { ...payload, waitingHash: hashStableJson(payload) };
}

export function buildPostInstallCapabilityResolution(input: {
  linkedRef: LinkedAmendmentSynthesisRef;
  waitingState: AmendmentCapabilityWaitingState;
  installReceipt?: RegistryInstallReceipt;
  resolutionReport: GameplayCapabilityResolutionReport;
  currentBaseArtifactHashes: Record<string, string>;
  currentBaseCapabilityLockHash: string;
  currentRegistrySnapshotHash: string;
  requiredCapabilityIds?: readonly string[];
}): PostInstallCapabilityResolution {
  const requiredCapabilityIds = uniqueStrings(
    input.requiredCapabilityIds ??
      (input.linkedRef.requestedCapabilityIds.length > 0
        ? input.linkedRef.requestedCapabilityIds
        : input.installReceipt === undefined
          ? []
          : [input.installReceipt.packageId])
  );
  const resolverReportHash = hashStableJson(input.resolutionReport);
  const baseIssues = baseBindingIssues(input.linkedRef, input.currentBaseArtifactHashes, input.currentBaseCapabilityLockHash);
  const receiptIssues = installReceiptIssues(input.linkedRef, input.installReceipt);
  const selectedCapabilityIds = uniqueStrings(input.resolutionReport.selectedCapabilityIds);
  const missingCapabilityIds = requiredCapabilityIds.filter((capabilityId) => !selectedCapabilityIds.includes(capabilityId));
  const issues = [
    ...(input.waitingState.status === 'waiting' &&
    input.waitingState.linkedRefHash === input.linkedRef.refHash &&
    input.waitingState.acceptEnabled === false &&
    input.waitingState.activeRunMutation === false
      ? []
      : [issue('WAITING_STATE_INVALID', 'Post-install resolution requires a valid Step34 capability synthesis waiting state.')]),
    ...baseIssues,
    ...receiptIssues,
    ...(input.installReceipt !== undefined && input.currentRegistrySnapshotHash === input.installReceipt.afterSnapshotHash
      ? []
      : [issue('REGISTRY_SNAPSHOT_STALE', 'Post-install resolution must use the registry snapshot committed by the install receipt.')]),
    ...(input.resolutionReport.status === 'resolved' && input.resolutionReport.lock !== undefined
      ? []
      : [issue('POST_INSTALL_RESOLUTION_BLOCKED', 'Post-install capability resolution did not resolve a fresh candidate lock.')]),
    ...missingCapabilityIds.map((capabilityId) =>
      issue('POST_INSTALL_CAPABILITY_MISSING', `Post-install resolution did not include requested capability ${capabilityId}.`, capabilityId)
    )
  ].sort(compareIssues);
  const payload: Omit<PostInstallCapabilityResolution, 'resolutionHash'> = {
    artifactKind: POST_INSTALL_CAPABILITY_RESOLUTION_KIND,
    schemaVersion: CAPABILITY_AMENDMENT_INTEGRATION_SCHEMA_VERSION,
    status: issues.length === 0 ? 'resolved' : 'blocked',
    amendmentProposalId: input.linkedRef.amendmentProposalId,
    synthesisRequestId: input.linkedRef.synthesisRequestId,
    linkedRefHash: input.linkedRef.refHash,
    ...(input.installReceipt === undefined ? {} : { installReceiptHash: input.installReceipt.receiptHash }),
    resolverReportHash,
    requiredCapabilityIds,
    selectedCapabilityIds,
    ...(issues.length === 0 && input.resolutionReport.lock !== undefined ? { candidateLock: input.resolutionReport.lock } : {}),
    issues
  };
  return { ...payload, resolutionHash: hashStableJson(payload) };
}

export function buildPostInstallCandidateCapabilityLock(input: {
  resolution: PostInstallCapabilityResolution;
  previousProjectLock: GameplayCapabilityLock;
  activeProjectLockHashAfterInstall?: string;
}): PostInstallCandidateCapabilityLock {
  const candidateLock = input.resolution.candidateLock;
  const issues = [
    ...(input.resolution.status === 'resolved' && candidateLock !== undefined
      ? []
      : [issue('CANDIDATE_LOCK_INVALID', 'Candidate project capability lock requires resolved post-install capability resolution.')]),
    ...(candidateLock === undefined || candidateLock.lockHash === recomputeCapabilityLockHash(candidateLock)
      ? []
      : [issue('CANDIDATE_LOCK_INVALID', 'Candidate capability lock hash does not match payload.')]),
    ...(input.activeProjectLockHashAfterInstall === undefined || input.activeProjectLockHashAfterInstall === input.previousProjectLock.lockHash
      ? []
      : [issue('ACTIVE_LOCK_MUTATED_BEFORE_ACCEPT', 'Package install must not mutate the active project lock before Step34 Accept.')])
  ].sort(compareIssues);
  const payload: Omit<PostInstallCandidateCapabilityLock, 'lockRecordHash'> = {
    artifactKind: POST_INSTALL_CANDIDATE_CAPABILITY_LOCK_KIND,
    schemaVersion: CAPABILITY_AMENDMENT_INTEGRATION_SCHEMA_VERSION,
    status: issues.length === 0 ? 'ready' : 'blocked',
    amendmentProposalId: input.resolution.amendmentProposalId,
    previousProjectLockHash: input.previousProjectLock.lockHash,
    ...(candidateLock === undefined ? {} : { candidateCapabilityLockHash: candidateLock.lockHash }),
    ...(candidateLock === undefined ? {} : { lockDiff: buildLockDiff(input.previousProjectLock, candidateLock) }),
    promotedOnStep34AcceptOnly: true,
    activeProjectLockMutation: false,
    issues
  };
  return { ...payload, lockRecordHash: hashStableJson(payload) };
}

export function buildPostInstallAmendmentVerificationReport(input: {
  amendmentIr: GameAmendmentIr;
  candidateLock: PostInstallCandidateCapabilityLock;
  candidateDslHash: string;
  candidateIrHash: string;
  runtimeManifestHash: string;
  gameplayQaReportHash: string;
  evidenceByEffectId?: Record<string, string>;
}): PostInstallAmendmentVerificationReport {
  const expectedEffectEvidence = expectedEffectIds(input.amendmentIr).map((effectId) => ({
    effectId,
    ...(input.evidenceByEffectId?.[effectId] === undefined ? {} : { evidenceHash: input.evidenceByEffectId[effectId] })
  }));
  const issues = [
    ...(input.candidateLock.status === 'ready'
      ? []
      : [issue('CANDIDATE_LOCK_INVALID', 'Amendment verification requires a ready candidate capability lock.')]),
    ...expectedEffectEvidence
      .filter((entry) => entry.evidenceHash === undefined || entry.evidenceHash.trim().length === 0)
      .map((entry) =>
        issue('AMENDMENT_EXPECTED_EFFECT_EVIDENCE_MISSING', `Missing executable evidence for amendment expected effect ${entry.effectId}.`, entry.effectId)
      ),
    ...nonEmptyHashIssues({
      candidateDslHash: input.candidateDslHash,
      candidateIrHash: input.candidateIrHash,
      runtimeManifestHash: input.runtimeManifestHash,
      gameplayQaReportHash: input.gameplayQaReportHash
    })
  ].sort(compareIssues);
  const payload: Omit<PostInstallAmendmentVerificationReport, 'verificationHash'> = {
    artifactKind: POST_INSTALL_AMENDMENT_VERIFICATION_KIND,
    schemaVersion: CAPABILITY_AMENDMENT_INTEGRATION_SCHEMA_VERSION,
    status: issues.length === 0 ? 'passed' : 'failed',
    amendmentProposalId: input.amendmentIr.proposalId,
    amendmentIrHash: hashStableJson(input.amendmentIr),
    candidateCapabilityLockHash: input.candidateLock.candidateCapabilityLockHash,
    candidateDslHash: input.candidateDslHash,
    candidateIrHash: input.candidateIrHash,
    runtimeManifestHash: input.runtimeManifestHash,
    gameplayQaReportHash: input.gameplayQaReportHash,
    expectedEffectEvidence,
    issues
  };
  return { ...payload, verificationHash: hashStableJson(payload) };
}

export function buildPostInstallRenderFidelityReport(input: {
  amendmentProposalId: string;
  renderRequired: boolean;
  visualChangeKinds?: readonly string[];
  renderStatus?: PostInstallRenderFidelityReport['renderStatus'];
  frozenSpecAllowsFallback?: boolean;
  truthfulFallbackLabel?: boolean;
  evidenceRefs?: readonly string[];
}): PostInstallRenderFidelityReport {
  const renderStatus = input.renderRequired ? input.renderStatus ?? 'missing' : 'not_required';
  const frozenSpecAllowsFallback = input.frozenSpecAllowsFallback ?? false;
  const truthfulFallbackLabel = input.truthfulFallbackLabel ?? false;
  const issues = [
    ...(input.renderRequired && (input.evidenceRefs ?? []).length === 0
      ? [issue('RENDER_EVIDENCE_MISSING', 'Step33 render fidelity requires trusted evidence refs for visual amendments.')]
      : []),
    ...(input.renderRequired && (renderStatus === 'missing' || renderStatus === 'failed')
      ? [issue('RENDER_FIDELITY_REQUIRED', 'Visual amendment cannot become reviewable without Step33 render fidelity pass.')]
      : []),
    ...(renderStatus === 'fallback_only' && (!frozenSpecAllowsFallback || !truthfulFallbackLabel)
      ? [issue('RENDER_FALLBACK_NOT_FULL_PASS', 'Generic fallback cannot satisfy full visual success unless frozen spec allows it and UX labels it truthfully.')]
      : [])
  ].sort(compareIssues);
  const renderPassKind = renderStatus === 'not_required'
    ? 'not_required'
    : renderStatus === 'full_pass'
      ? 'full_pass'
      : renderStatus === 'fallback_only' && frozenSpecAllowsFallback && truthfulFallbackLabel
        ? 'fallback_allowed'
        : 'failed';
  const payload: Omit<PostInstallRenderFidelityReport, 'renderHash'> = {
    artifactKind: POST_INSTALL_RENDER_FIDELITY_KIND,
    schemaVersion: CAPABILITY_AMENDMENT_INTEGRATION_SCHEMA_VERSION,
    status: issues.length === 0 ? 'passed' : 'failed',
    amendmentProposalId: input.amendmentProposalId,
    renderRequired: input.renderRequired,
    visualChangeKinds: uniqueStrings(input.visualChangeKinds ?? []),
    renderStatus,
    renderPassKind,
    frozenSpecAllowsFallback,
    truthfulFallbackLabel,
    evidenceRefs: uniqueStrings(input.evidenceRefs ?? []),
    issues
  };
  return { ...payload, renderHash: hashStableJson(payload) };
}

export function buildStep34CapabilityBackfillGate(input: {
  waitingState: AmendmentCapabilityWaitingState;
  linkedRef: LinkedAmendmentSynthesisRef;
  resolution: PostInstallCapabilityResolution;
  candidateLock: PostInstallCandidateCapabilityLock;
  amendmentVerification: PostInstallAmendmentVerificationReport;
  renderFidelity: PostInstallRenderFidelityReport;
  sandboxPreviewPromoted?: boolean;
  activeRunMutation?: boolean;
}): Step34CapabilityBackfillGate {
  const childArtifactIntegrityIssues = backfillChildArtifactIntegrityIssues(input);
  const childContextIssues = backfillChildContextIssues(input);
  const issues = [
    ...childArtifactIntegrityIssues,
    ...childContextIssues,
    ...(input.waitingState.status === 'waiting' && input.waitingState.acceptEnabled === false && input.waitingState.activeRunMutation === false
      ? []
      : [issue('WAITING_STATE_INVALID', 'Step34 backfill requires a valid waiting state with Accept disabled.')]),
    ...(input.waitingState.linkedRefHash === input.linkedRef.refHash && input.resolution.linkedRefHash === input.linkedRef.refHash
      ? []
      : [issue('LINKED_REF_HASH_MISMATCH', 'Backfill gate inputs do not bind the same linked amendment synthesis ref.')]),
    ...(input.resolution.status === 'resolved'
      ? []
      : [issue('POST_INSTALL_RESOLUTION_BLOCKED', 'Backfill gate requires resolved post-install capability graph.')]),
    ...(input.candidateLock.status === 'ready'
      ? []
      : [issue('CANDIDATE_LOCK_INVALID', 'Backfill gate requires a ready candidate project lock.')]),
    ...(input.amendmentVerification.status === 'passed'
      ? []
      : [issue('AMENDMENT_VERIFICATION_FAILED', 'Backfill gate requires post-install amendment expected-effect verification.')]),
    ...(input.renderFidelity.status === 'passed'
      ? []
      : [issue('RENDER_FIDELITY_REQUIRED', 'Backfill gate requires Step33 render fidelity for visual amendments.')]),
    ...(input.sandboxPreviewPromoted === true
      ? [issue('SANDBOX_PREVIEW_PROMOTION_FORBIDDEN', 'Step36 sandbox preview cannot be promoted into Step34 candidate preview or active game state.')]
      : []),
    ...(input.activeRunMutation === true
      ? [issue('ACTIVE_RUN_MUTATED_BY_INSTALL', 'Package install and backfill gate must not mutate the active game run before Step34 Accept.')]
      : [])
  ].sort(compareIssues);
  const payload: Omit<Step34CapabilityBackfillGate, 'gateHash'> = {
    artifactKind: STEP34_CAPABILITY_BACKFILL_GATE_KIND,
    schemaVersion: CAPABILITY_AMENDMENT_INTEGRATION_SCHEMA_VERSION,
    status: issues.length === 0 ? 'reviewable' : 'blocked',
    amendmentProposalId: input.linkedRef.amendmentProposalId,
    ...(issues.length === 0 ? { nextStep34State: 'REVIEWABLE' } : {}),
    acceptEnabled: issues.length === 0,
    activeRunMutation: false,
    sandboxPreviewPromotable: false,
    linkedRefHash: input.linkedRef.refHash,
    installReceiptHash: input.resolution.installReceiptHash,
    candidateCapabilityLockHash: input.candidateLock.candidateCapabilityLockHash,
    amendmentVerificationHash: input.amendmentVerification.verificationHash,
    renderFidelityHash: input.renderFidelity.renderHash,
    issues
  };
  return { ...payload, gateHash: hashStableJson(payload) };
}

export function buildStep34CapabilityDecisionRecord(input: {
  decision: Step34CapabilityDecisionRecord['decision'];
  amendmentProposalId: string;
  gate?: Step34CapabilityBackfillGate;
  gateEvidence?: Step34CapabilityBackfillGateEvidence;
  previousProjectLockHash: string;
  candidateCapabilityLockHash?: string;
  previousCompleteCheckpointHash?: string;
  installReceiptHash?: string;
}): Step34CapabilityDecisionRecord {
  const acceptGateIssues = input.decision === 'accept' ? step34AcceptGateIssues(input) : [];
  const issues = [
    ...acceptGateIssues,
    ...(input.decision === 'undo' && (input.previousCompleteCheckpointHash?.trim().length ?? 0) === 0
      ? [issue('UNDO_CHECKPOINT_MISSING', 'Step34 Undo requires a previous complete game checkpoint.')]
      : [])
  ].sort(compareIssues);
  const activeProjectLockHash =
    input.decision === 'accept' && issues.length === 0 && input.candidateCapabilityLockHash !== undefined
      ? input.candidateCapabilityLockHash
      : input.previousProjectLockHash;
  const payload: Omit<Step34CapabilityDecisionRecord, 'decisionHash'> = {
    artifactKind: STEP34_CAPABILITY_DECISION_RECORD_KIND,
    schemaVersion: CAPABILITY_AMENDMENT_INTEGRATION_SCHEMA_VERSION,
    decision: input.decision,
    status: issues.length === 0 ? 'applied' : 'blocked',
    amendmentProposalId: input.amendmentProposalId,
    registryPackageAction: 'none',
    previousProjectLockHash: input.previousProjectLockHash,
    activeProjectLockHash,
    ...(input.candidateCapabilityLockHash === undefined ? {} : { candidateCapabilityLockHash: input.candidateCapabilityLockHash }),
    ...(input.previousCompleteCheckpointHash === undefined ? {} : { previousCompleteCheckpointHash: input.previousCompleteCheckpointHash }),
    ...(input.installReceiptHash === undefined ? {} : { installReceiptHash: input.installReceiptHash }),
    issues
  };
  return { ...payload, decisionHash: hashStableJson(payload) };
}

function backfillChildArtifactIntegrityIssues(input: {
  waitingState: AmendmentCapabilityWaitingState;
  linkedRef: LinkedAmendmentSynthesisRef;
  resolution: PostInstallCapabilityResolution;
  candidateLock: PostInstallCandidateCapabilityLock;
  amendmentVerification: PostInstallAmendmentVerificationReport;
  renderFidelity: PostInstallRenderFidelityReport;
}): CapabilityAmendmentIntegrationIssue[] {
  return [
    ...(input.linkedRef.refHash === recomputeLinkedRefHash(input.linkedRef)
      ? []
      : [issue('LINKED_REF_HASH_MISMATCH', 'Linked amendment synthesis ref hash does not match payload.', 'linkedRef.refHash')]),
    ...(input.waitingState.waitingHash === recomputeWaitingStateHash(input.waitingState)
      ? []
      : [issue('BACKFILL_CHILD_ARTIFACT_HASH_MISMATCH', 'Waiting state hash does not match payload.', 'waitingState.waitingHash')]),
    ...(input.resolution.resolutionHash === recomputeCapabilityResolutionHash(input.resolution)
      ? []
      : [issue('BACKFILL_CHILD_ARTIFACT_HASH_MISMATCH', 'Post-install resolution hash does not match payload.', 'resolution.resolutionHash')]),
    ...(input.candidateLock.lockRecordHash === recomputeCandidateLockRecordHash(input.candidateLock)
      ? []
      : [issue('BACKFILL_CHILD_ARTIFACT_HASH_MISMATCH', 'Candidate lock record hash does not match payload.', 'candidateLock.lockRecordHash')]),
    ...(input.amendmentVerification.verificationHash === recomputeAmendmentVerificationHash(input.amendmentVerification)
      ? []
      : [issue('BACKFILL_CHILD_ARTIFACT_HASH_MISMATCH', 'Amendment verification hash does not match payload.', 'amendmentVerification.verificationHash')]),
    ...(input.renderFidelity.renderHash === recomputeRenderFidelityHash(input.renderFidelity)
      ? []
      : [issue('BACKFILL_CHILD_ARTIFACT_HASH_MISMATCH', 'Render fidelity hash does not match payload.', 'renderFidelity.renderHash')])
  ];
}

function backfillChildContextIssues(input: {
  waitingState: AmendmentCapabilityWaitingState;
  linkedRef: LinkedAmendmentSynthesisRef;
  resolution: PostInstallCapabilityResolution;
  candidateLock: PostInstallCandidateCapabilityLock;
  amendmentVerification: PostInstallAmendmentVerificationReport;
  renderFidelity: PostInstallRenderFidelityReport;
}): CapabilityAmendmentIntegrationIssue[] {
  const amendmentProposalId = input.linkedRef.amendmentProposalId;
  const candidateCapabilityLockHash = input.candidateLock.candidateCapabilityLockHash;
  const installReceiptHash = input.resolution.installReceiptHash;
  const proposalBindingsMatch =
    input.waitingState.amendmentProposalId === amendmentProposalId &&
    input.resolution.amendmentProposalId === amendmentProposalId &&
    input.candidateLock.amendmentProposalId === amendmentProposalId &&
    input.amendmentVerification.amendmentProposalId === amendmentProposalId &&
    input.renderFidelity.amendmentProposalId === amendmentProposalId;
  const synthesisBindingsMatch =
    input.waitingState.synthesisRequestId === input.linkedRef.synthesisRequestId &&
    input.resolution.synthesisRequestId === input.linkedRef.synthesisRequestId;
  const linkedRefBindingsMatch =
    input.waitingState.linkedRefHash === input.linkedRef.refHash &&
    input.resolution.linkedRefHash === input.linkedRef.refHash;
  const installReceiptBindingsMatch =
    installReceiptHash !== undefined &&
    input.linkedRef.installReceiptHash === installReceiptHash;
  const candidateLockBindingsMatch =
    candidateCapabilityLockHash !== undefined &&
    input.resolution.candidateLock?.lockHash === candidateCapabilityLockHash &&
    input.amendmentVerification.candidateCapabilityLockHash === candidateCapabilityLockHash &&
    input.candidateLock.previousProjectLockHash === input.linkedRef.baseCapabilityLockHash &&
    input.candidateLock.lockDiff?.beforeLockHash === input.candidateLock.previousProjectLockHash &&
    input.candidateLock.lockDiff?.afterLockHash === candidateCapabilityLockHash &&
    input.candidateLock.promotedOnStep34AcceptOnly === true &&
    input.candidateLock.activeProjectLockMutation === false;

  return [
    ...(proposalBindingsMatch
      ? []
      : [issue('BACKFILL_ARTIFACT_CONTEXT_MISMATCH', 'Backfill child artifacts do not bind the same Step34 proposal.', 'amendmentProposalId')]),
    ...(synthesisBindingsMatch
      ? []
      : [issue('BACKFILL_ARTIFACT_CONTEXT_MISMATCH', 'Backfill child artifacts do not bind the same synthesis request.', 'synthesisRequestId')]),
    ...(linkedRefBindingsMatch
      ? []
      : [issue('LINKED_REF_HASH_MISMATCH', 'Backfill gate inputs do not bind the same linked amendment synthesis ref.', 'linkedRefHash')]),
    ...(installReceiptBindingsMatch
      ? []
      : [issue('BACKFILL_ARTIFACT_CONTEXT_MISMATCH', 'Backfill child artifacts do not bind the same committed install receipt.', 'installReceiptHash')]),
    ...(candidateLockBindingsMatch
      ? []
      : [issue('BACKFILL_ARTIFACT_CONTEXT_MISMATCH', 'Backfill child artifacts do not bind the same candidate capability lock.', 'candidateCapabilityLockHash')])
  ];
}

function step34AcceptGateIssues(input: {
  amendmentProposalId: string;
  gate?: Step34CapabilityBackfillGate;
  gateEvidence?: Step34CapabilityBackfillGateEvidence;
  candidateCapabilityLockHash?: string;
  installReceiptHash?: string;
}): CapabilityAmendmentIntegrationIssue[] {
  if (input.gate === undefined) {
    return [issue('ACCEPT_GATE_NOT_REVIEWABLE', 'Step34 Accept is disabled until capability backfill gate is reviewable.')];
  }
  const provenanceIssues = step34AcceptGateProvenanceIssues(input.gate, input.gateEvidence);
  return [
    ...(input.gate.status === 'reviewable' && input.gate.acceptEnabled === true && input.gate.nextStep34State === 'REVIEWABLE'
      ? []
      : [issue('ACCEPT_GATE_NOT_REVIEWABLE', 'Step34 Accept is disabled until capability backfill gate is reviewable.')]),
    ...(input.gate.gateHash === recomputeBackfillGateHash(input.gate)
      ? []
      : [issue('ACCEPT_GATE_HASH_MISMATCH', 'Step34 Accept gate hash does not match payload.', 'gate.gateHash')]),
    ...(input.gate.amendmentProposalId === input.amendmentProposalId &&
    input.gate.candidateCapabilityLockHash !== undefined &&
    input.gate.candidateCapabilityLockHash === input.candidateCapabilityLockHash &&
    input.gate.installReceiptHash !== undefined &&
    input.gate.installReceiptHash === input.installReceiptHash &&
    input.gate.activeRunMutation === false &&
    input.gate.sandboxPreviewPromotable === false
      ? []
      : [issue('ACCEPT_GATE_CONTEXT_MISMATCH', 'Step34 Accept gate is not bound to the requested proposal, install receipt and candidate lock.')]),
    ...provenanceIssues
  ];
}

function step34AcceptGateProvenanceIssues(
  gate: Step34CapabilityBackfillGate,
  evidence: Step34CapabilityBackfillGateEvidence | undefined
): CapabilityAmendmentIntegrationIssue[] {
  if (evidence === undefined) {
    return [issue('ACCEPT_GATE_PROVENANCE_MISSING', 'Step34 Accept requires child artifact evidence for the reviewable capability backfill gate.')];
  }
  const rebuiltGate = buildStep34CapabilityBackfillGate(evidence);
  return [
    ...(rebuiltGate.status === 'reviewable' && rebuiltGate.acceptEnabled === true
      ? []
      : [issue('ACCEPT_GATE_PROVENANCE_MISMATCH', 'Step34 Accept gate evidence does not rebuild a reviewable backfill gate.', 'gateEvidence')]),
    ...(rebuiltGate.gateHash === gate.gateHash
      ? []
      : [issue('ACCEPT_GATE_PROVENANCE_MISMATCH', 'Step34 Accept gate does not match its child artifact evidence.', 'gate.gateHash')])
  ];
}

function baseBindingIssues(
  linkedRef: LinkedAmendmentSynthesisRef,
  currentBaseArtifactHashes: Record<string, string>,
  currentBaseCapabilityLockHash: string
): CapabilityAmendmentIntegrationIssue[] {
  const normalizedCurrent = sortRecord(currentBaseArtifactHashes);
  return [
    ...(linkedRef.refHash === recomputeLinkedRefHash(linkedRef)
      ? []
      : [issue('LINKED_REF_HASH_MISMATCH', 'Linked amendment synthesis ref hash does not match payload.')]),
    ...(hashStableJson(linkedRef.baseArtifactHashes) === hashStableJson(normalizedCurrent) &&
    linkedRef.baseCapabilityLockHash === currentBaseCapabilityLockHash
      ? []
      : [issue('AMENDMENT_BASE_STALE', 'Step34 proposal base artifacts or base capability lock changed and require rebase.')])
  ];
}

function installReceiptIssues(
  linkedRef: LinkedAmendmentSynthesisRef,
  installReceipt: RegistryInstallReceipt | undefined
): CapabilityAmendmentIntegrationIssue[] {
  if (installReceipt === undefined) {
    return [issue('INSTALL_RECEIPT_INVALID', 'Post-install resolution requires a committed 36.12 install receipt.')];
  }
  return installReceipt.status === 'committed' &&
    installReceipt.receiptHash === recomputeInstallReceiptHash(installReceipt) &&
    linkedRef.installReceiptHash === installReceipt.receiptHash
    ? []
    : [issue('INSTALL_RECEIPT_INVALID', 'Install receipt is missing, uncommitted, stale or not bound to the linked amendment synthesis ref.')];
}

function expectedEffectIds(amendmentIr: GameAmendmentIr): string[] {
  return amendmentIr.operations.flatMap((operation) =>
    operation.expectedEffects.map((_, index) => `${operation.id}:effect:${index}`)
  );
}

function nonEmptyHashIssues(values: Record<string, string>): CapabilityAmendmentIntegrationIssue[] {
  return Object.entries(values)
    .filter(([, value]) => value.trim().length === 0)
    .map(([path]) => issue('AMENDMENT_VERIFICATION_FAILED', `Post-install amendment verification is missing ${path}.`, path));
}

function buildLockDiff(previousLock: GameplayCapabilityLock, candidateLock: GameplayCapabilityLock): PostInstallCandidateCapabilityLock['lockDiff'] {
  const previousPackages = new Map(previousLock.packages.map((entry) => [entry.capabilityId, entry]));
  const candidatePackages = new Map(candidateLock.packages.map((entry) => [entry.capabilityId, entry]));
  return {
    beforeLockHash: previousLock.lockHash,
    afterLockHash: candidateLock.lockHash,
    addedCapabilityIds: candidateLock.capabilityIds.filter((capabilityId) => !previousLock.capabilityIds.includes(capabilityId)).sort(),
    removedCapabilityIds: previousLock.capabilityIds.filter((capabilityId) => !candidateLock.capabilityIds.includes(capabilityId)).sort(),
    changedPackageVersions: candidateLock.capabilityIds
      .flatMap((capabilityId) => {
        const beforePackage = previousPackages.get(capabilityId);
        const afterPackage = candidatePackages.get(capabilityId);
        if (beforePackage === undefined || afterPackage === undefined || beforePackage.packageVersion === afterPackage.packageVersion) {
          return [];
        }
        return [
          {
            capabilityId,
            beforePackageVersion: beforePackage.packageVersion,
            afterPackageVersion: afterPackage.packageVersion
          }
        ];
      })
      .sort((left, right) => left.capabilityId.localeCompare(right.capabilityId))
  };
}

function recomputeLinkedRefHash(ref: LinkedAmendmentSynthesisRef): string {
  const { refHash: _refHash, ...payload } = ref;
  return hashStableJson(payload);
}

function recomputeInstallReceiptHash(receipt: RegistryInstallReceipt): string {
  const { receiptHash: _receiptHash, ...payload } = receipt;
  return hashStableJson(payload);
}

function recomputeWaitingStateHash(waitingState: AmendmentCapabilityWaitingState): string {
  const { waitingHash: _waitingHash, ...payload } = waitingState;
  return hashStableJson(payload);
}

function recomputeCapabilityResolutionHash(resolution: PostInstallCapabilityResolution): string {
  const { resolutionHash: _resolutionHash, ...payload } = resolution;
  return hashStableJson(payload);
}

function recomputeCandidateLockRecordHash(candidateLock: PostInstallCandidateCapabilityLock): string {
  const { lockRecordHash: _lockRecordHash, ...payload } = candidateLock;
  return hashStableJson(payload);
}

function recomputeAmendmentVerificationHash(verification: PostInstallAmendmentVerificationReport): string {
  const { verificationHash: _verificationHash, ...payload } = verification;
  return hashStableJson(payload);
}

function recomputeRenderFidelityHash(renderFidelity: PostInstallRenderFidelityReport): string {
  const { renderHash: _renderHash, ...payload } = renderFidelity;
  return hashStableJson(payload);
}

function recomputeBackfillGateHash(gate: Step34CapabilityBackfillGate): string {
  const { gateHash: _gateHash, ...payload } = gate;
  return hashStableJson(payload);
}

function recomputeCapabilityLockHash(lock: GameplayCapabilityLock): string {
  const { lockHash: _lockHash, ...payload } = lock;
  return hashStableJson(payload);
}

function sortRecord(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).sort(([left], [right]) => left.localeCompare(right)));
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort();
}

function issue(code: CapabilityAmendmentIntegrationIssue['code'], message: string, path?: string): CapabilityAmendmentIntegrationIssue {
  return {
    code,
    message,
    ...(path === undefined ? {} : { path })
  };
}

function compareIssues(left: CapabilityAmendmentIntegrationIssue, right: CapabilityAmendmentIntegrationIssue): number {
  return `${left.code}:${left.path ?? ''}`.localeCompare(`${right.code}:${right.path ?? ''}`);
}
