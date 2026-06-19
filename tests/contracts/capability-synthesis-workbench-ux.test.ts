import { describe, expect, it } from 'vitest';

import {
  CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION,
  REGISTRY_INSTALL_PRECHECK_KIND,
  buildApprovalControlState,
  buildCapabilityEvidencePanel,
  buildCandidateSourceReviewView,
  buildCreatorCapabilityStatusView,
  buildMaintainerCapabilityReviewDashboard,
  buildRegistryInstallControlState,
  buildRegistryInstallReadinessEvidence,
  buildRegistryInstallReadinessReceipt,
  buildWorkbenchAuditTimeline,
  buildWorkbenchPreviewLabelReport,
  REGISTRY_INSTALL_READINESS_TRUSTED_NAMESPACE,
  type RegistryInstallReadinessReceipt,
  type RegistryInstallPrecheck
} from '../../packages/game-dsl/src/index.js';
import { hashStableJson } from '../../packages/game-dsl/src/gameplay-capabilities/stable-json.js';

describe('Step36 Workbench and maintainer review UX contracts', () => {
  it('keeps creator status truthful and hides source, approval and install authority', () => {
    const view = buildCreatorCapabilityStatusView({
      requestId: 'capsyn_req_workbench',
      actorRoles: ['creator'],
      summary: 'Add projectile ricochet.',
      reusableCapabilities: ['combat.projectile.v1', 'collision.platform.v1'],
      missingCapability: 'combat.projectile_ricochet.v1',
      currentStage: 'HUMAN_REVIEW_PENDING',
      waitingReason: 'Waiting for maintainer review and registry install.',
      nextMaintainerAction: 'Review candidate evidence.',
      rejectedUnsafeFallbacks: ['fake bounce VFX without gameplay state'],
      requestedVisibleSurfaces: ['candidate_source', 'install_control'],
      untrustedStatusClaims: ['AI learned the gameplay and it is ready to publish']
    });

    expect(view.visibleSurfaces).not.toContain('candidate_source');
    expect(view.visibleSurfaces).not.toContain('install_control');
    expect(view.hiddenSurfaces).toEqual(expect.arrayContaining(['candidate_source', 'approval_control', 'install_control']));
    expect(view.statusCopy.join('\n')).toContain('Missing capability: combat.projectile_ricochet.v1');
    expect(view.statusCopy.join('\n')).not.toMatch(/ready to publish|AI learned/i);
    expect(view.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['CREATOR_FORBIDDEN_SURFACE_EXPOSED', 'CREATOR_FALSE_PROMISE_REJECTED'])
    );
  });

  it('labels active, Step34 candidate, sandbox, experimental and supported previews without local promotion', () => {
    const report = buildWorkbenchPreviewLabelReport({
      previews: [
        { previewId: 'active', sourceKind: 'active_game', sourceArtifactHash: 'fnv1a_active' },
        { previewId: 'candidate', sourceKind: 'step34_game_candidate', sourceArtifactHash: 'fnv1a_candidate' },
        { previewId: 'sandbox', sourceKind: 'capability_sandbox_preview', sourceArtifactHash: 'fnv1a_sandbox' },
        {
          previewId: 'experimental',
          sourceKind: 'installed_experimental_capability_preview',
          sourceArtifactHash: 'fnv1a_experimental',
          localLabelOverride: 'SUPPORTED CAPABILITY'
        },
        { previewId: 'supported', sourceKind: 'supported_capability', sourceArtifactHash: 'fnv1a_supported' },
        { previewId: 'missing_hash', sourceKind: 'capability_sandbox_preview', sourceArtifactHash: '' }
      ]
    });

    expect(report.previews.map((preview) => preview.label)).toEqual(
      expect.arrayContaining([
        'ACTIVE GAME',
        'STEP 34 GAME CANDIDATE',
        'UNTRUSTED CAPABILITY SANDBOX PREVIEW',
        'INSTALLED EXPERIMENTAL CAPABILITY PREVIEW',
        'SUPPORTED CAPABILITY'
      ])
    );
    expect(report.previews.find((preview) => preview.previewId === 'experimental')?.supportedReadiness).toBe(false);
    expect(report.previews.find((preview) => preview.previewId === 'supported')?.supportedReadiness).toBe(true);
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['PREVIEW_LABEL_UNSUPPORTED_PROMOTION', 'PREVIEW_LABEL_HASH_MISSING'])
    );
  });

  it('keeps evidence panel requirement-oriented and treats missing evidence as non-passing', () => {
    const panel = buildCapabilityEvidencePanel({
      requestId: 'capsyn_req_workbench',
      rows: [
        {
          requirementId: 'ricochet_once',
          requirement: 'Projectile reflects once from ricochet surface.',
          inputAction: 'Fire projectile into tagged wall.',
          observationSource: 'black-box runtime QA',
          assertion: 'velocity.x reverses and bounceCount = 1',
          status: 'passed',
          evidenceArtifact: 'runtime_qa_ricochet_once.json',
          artifactHash: 'fnv1a_runtime_qa'
        },
        {
          requirementId: 'damage_multiplier',
          requirement: 'Damage multiplier applies after bounce.',
          inputAction: '',
          observationSource: 'black-box runtime QA',
          assertion: 'damage = 75',
          status: 'missing',
          evidenceArtifact: '',
          artifactHash: ''
        }
      ]
    });

    expect(panel.overallStatus).toBe('missing');
    expect(panel.issues.map((issue) => issue.code)).toContain('EVIDENCE_ROW_INCOMPLETE');
    const ricochetRow = panel.rows.find((row) => row.requirementId === 'ricochet_once');
    expect(ricochetRow).toMatchObject({
      requirement: expect.stringContaining('Projectile reflects'),
      inputAction: expect.any(String),
      observationSource: expect.any(String),
      assertion: expect.any(String),
      evidenceArtifact: expect.any(String),
      artifactHash: expect.any(String)
    });
  });

  it('derives approval control from server gates, role, verification, Oracle and hash freshness', () => {
    const enabled = buildApprovalControlState({
      requestId: 'capsyn_req_workbench',
      attemptId: 'attempt_1',
      actorRoles: ['capability_maintainer'],
      requestedRole: 'capability_maintainer',
      lifecycleState: 'HUMAN_REVIEW_PENDING',
      verificationStatus: 'PASSED',
      candidateHashCurrent: true,
      latestRefsCurrent: true
    });
    const blocked = buildApprovalControlState({
      requestId: 'capsyn_req_workbench',
      attemptId: 'attempt_1',
      actorRoles: ['capability_maintainer'],
      requestedRole: 'capability_maintainer',
      lifecycleState: 'HUMAN_REVIEW_PENDING',
      verificationStatus: 'FAILED',
      oracleFindings: [{ severity: 'P1', code: 'insufficient_qa', message: 'Missing mutation evidence.' }],
      candidateHashCurrent: false,
      latestRefsCurrent: false,
      localOverrideEnabled: true
    });
    const missingLatestRefs = buildApprovalControlState({
      requestId: 'capsyn_req_workbench',
      attemptId: 'attempt_1',
      actorRoles: ['capability_maintainer'],
      requestedRole: 'capability_maintainer',
      lifecycleState: 'HUMAN_REVIEW_PENDING',
      verificationStatus: 'PASSED',
      candidateHashCurrent: true
    });
    const registryAdmin = buildApprovalControlState({
      requestId: 'capsyn_req_workbench',
      attemptId: 'attempt_1',
      actorRoles: ['registry_admin'],
      requestedRole: 'capability_maintainer',
      lifecycleState: 'HUMAN_REVIEW_PENDING',
      verificationStatus: 'PASSED',
      candidateHashCurrent: true,
      latestRefsCurrent: true
    });

    expect(enabled.status).toBe('enabled');
    expect(blocked.status).toBe('disabled');
    expect(blocked.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['APPROVAL_CONTROL_BACKEND_GATE_FAILED', 'APPROVAL_CONTROL_LOCAL_STATE_IGNORED'])
    );
    expect(missingLatestRefs.status).toBe('disabled');
    expect(missingLatestRefs.reasons).toContain('latest_refs_missing_or_stale');
    expect(registryAdmin.status).toBe('hidden');
    expect(registryAdmin.issues.map((issue) => issue.code)).toContain('APPROVAL_CONTROL_FORBIDDEN_ROLE');
  });

  it('derives install control from registry admin role, trusted receipt, precheck and writer lock', () => {
    const precheck = passedPrecheck();
    const readinessEvidence = readyInstallEvidence(precheck);
    const readinessReceipt = buildRegistryInstallReadinessReceipt({ evidence: readinessEvidence });
    const trustedStore = trustedReadinessStore(readinessReceipt);
    const maintainer = buildRegistryInstallControlState({
      requestId: 'capsyn_req_workbench',
      attemptId: 'attempt_1',
      actorRoles: ['capability_maintainer'],
      precheck,
      readinessEvidence,
      readinessReceiptRef: readinessReceipt.trustedArtifactRef,
      trustedInstallReadinessStore: trustedStore,
      packageHash: 'fnv1a_package',
      beforeSnapshotHash: 'fnv1a_before',
      canaryPlanHash: 'fnv1a_canary_plan',
      rollbackTargetSnapshotHash: 'fnv1a_before',
      affectedProfiles: ['side_scrolling_run_and_gun'],
      oldLocksRemainUnchanged: true
    });
    const registryAdmin = buildRegistryInstallControlState({
      requestId: 'capsyn_req_workbench',
      attemptId: 'attempt_1',
      actorRoles: ['registry_admin'],
      precheck,
      readinessEvidence,
      readinessReceiptRef: readinessReceipt.trustedArtifactRef,
      trustedInstallReadinessStore: trustedStore,
      packageHash: 'fnv1a_package',
      beforeSnapshotHash: 'fnv1a_before',
      canaryPlanHash: 'fnv1a_canary_plan',
      rollbackTargetSnapshotHash: 'fnv1a_before',
      affectedProfiles: ['side_scrolling_run_and_gun'],
      oldLocksRemainUnchanged: true
    });
    const crossRequest = buildRegistryInstallControlState({
      requestId: 'capsyn_req_other',
      attemptId: 'attempt_other',
      actorRoles: ['registry_admin'],
      precheck,
      readinessEvidence,
      readinessReceiptRef: readinessReceipt.trustedArtifactRef,
      trustedInstallReadinessStore: trustedStore,
      packageHash: 'fnv1a_package',
      beforeSnapshotHash: 'fnv1a_before',
      canaryPlanHash: 'fnv1a_canary_plan',
      rollbackTargetSnapshotHash: 'fnv1a_before',
      affectedProfiles: ['side_scrolling_run_and_gun'],
      oldLocksRemainUnchanged: true
    });
    const stale = buildRegistryInstallControlState({
      requestId: 'capsyn_req_workbench',
      attemptId: 'attempt_1',
      actorRoles: ['registry_admin'],
      precheck: { ...precheck, status: 'blocked' },
      readinessEvidence: buildRegistryInstallReadinessEvidence({
        requestId: 'capsyn_req_workbench',
        attemptId: 'attempt_1',
        precheck: { ...precheck, status: 'blocked' },
        approvalValidityStatus: 'invalid',
        approvalValidityReceiptTrusted: false,
        packageHash: '',
        beforeSnapshotHash: 'fnv1a_before',
        canaryPlanHash: 'fnv1a_canary_plan',
        rollbackTargetSnapshotHash: 'fnv1a_before',
        oldLocksRemainUnchanged: false
      }),
      packageHash: '',
      beforeSnapshotHash: 'fnv1a_before',
      canaryPlanHash: 'fnv1a_canary_plan',
      rollbackTargetSnapshotHash: 'fnv1a_before',
      oldLocksRemainUnchanged: false,
      localOverrideEnabled: true
    });

    expect(maintainer.status).toBe('hidden');
    expect(maintainer.issues.map((issue) => issue.code)).toContain('INSTALL_CONTROL_FORBIDDEN_ROLE');
    expect(registryAdmin.status).toBe('enabled');
    expect(registryAdmin.targetRegistryStatus).toBe('experimental_complete');
    expect(registryAdmin.oldLocksRemainUnchanged).toBe(true);
    expect(crossRequest.status).toBe('disabled');
    expect(crossRequest.reasons).toContain('install_readiness_context_mismatch');
    expect(stale.status).toBe('disabled');
    expect(stale.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['INSTALL_CONTROL_BACKEND_GATE_FAILED', 'INSTALL_CONTROL_LOCAL_STATE_IGNORED'])
    );
  });

  it('keeps a self-consistent install readiness claim disabled without a trusted receipt', () => {
    const precheck = passedPrecheck();
    const readinessEvidence = readyInstallEvidence(precheck);
    const forged = buildRegistryInstallControlState({
      requestId: 'capsyn_req_workbench',
      attemptId: 'attempt_1',
      actorRoles: ['registry_admin'],
      precheck,
      readinessEvidence,
      packageHash: 'fnv1a_package',
      beforeSnapshotHash: 'fnv1a_before',
      canaryPlanHash: 'fnv1a_canary_plan',
      rollbackTargetSnapshotHash: 'fnv1a_before',
      affectedProfiles: ['side_scrolling_run_and_gun'],
      oldLocksRemainUnchanged: true
    });

    expect(forged.status).toBe('disabled');
    expect(forged.reasons).toContain('install_readiness_receipt_invalid');
  });

  it('hash-links maintainer dashboard and source review traces instead of treating raw logs as authority', () => {
    const dashboard = buildMaintainerCapabilityReviewDashboard({
      requestId: 'capsyn_req_workbench',
      actorRoles: ['creator', 'capability_maintainer'],
      artifactRefs: [
        { artifactKind: 'capability_gap_report', path: 'gap.json', artifactHash: 'fnv1a_gap' },
        { artifactKind: 'candidate_source_manifest', path: 'source.json', artifactHash: '' }
      ]
    });
    const sourceReview = buildCandidateSourceReviewView({
      requestId: 'capsyn_req_workbench',
      attemptId: 'attempt_1',
      fileDiffs: [{ path: 'source/runtime.ts', afterHash: 'fnv1a_runtime', status: 'added' }],
      forbiddenApiHighlights: [{ path: 'source/runtime.ts', api: 'fetch', severity: 'blocked' }],
      sdkCallGraphHash: 'fnv1a_sdk_graph',
      ownershipMapHash: 'fnv1a_ownership',
      specToCodeTraceHash: '',
      testToRequirementTraceHash: 'fnv1a_tests',
      modelProvenanceHash: 'fnv1a_model',
      attemptComparisonHash: 'fnv1a_attempt_diff'
    });

    expect(dashboard.visibleToRoles).toEqual(['capability_maintainer']);
    expect(dashboard.issues.map((issue) => issue.code)).toContain('DASHBOARD_ARTIFACT_REF_MISSING');
    expect(sourceReview.forbiddenApiHighlights[0]).toMatchObject({ api: 'fetch', severity: 'blocked' });
    expect(sourceReview.issues.map((issue) => issue.code)).toContain('SOURCE_REVIEW_TRACE_MISSING');
  });

  it('keeps audit timeline append-only and records corrections instead of mutating review notes', () => {
    const timeline = buildWorkbenchAuditTimeline({
      requestId: 'capsyn_req_workbench',
      previousTimelineHash: 'fnv1a_previous_timeline',
      previousLastEventHash: 'fnv1a_previous_last_event',
      entries: [
        {
          eventId: 'evt_review',
          actorRole: 'capability_maintainer',
          action: 'requested_changes',
          textReason: 'Mutation evidence missing.',
          previousEventHash: 'fnv1a_mutated_previous_event',
          artifactRefs: [{ artifactKind: 'oracle_review', path: 'oracle.json', artifactHash: 'fnv1a_oracle' }]
        },
        {
          eventId: 'evt_correction',
          actorRole: 'capability_maintainer',
          action: 'appended_correction',
          textReason: 'Mutation evidence was added in attempt 2.',
          correctionOfEventHash: 'fnv1a_old_review_hash',
          attemptedMutationOfEventHash: 'fnv1a_old_review_hash',
          artifactRefs: [{ artifactKind: 'verification_bundle', path: 'verification.json', artifactHash: 'fnv1a_verification' }]
        }
      ]
    });

    expect(timeline.entries[0].previousEventHash).toBe('fnv1a_previous_last_event');
    expect(timeline.entries[1].previousEventHash).toBe(timeline.entries[0].eventHash);
    expect(timeline.entries[1].correctionOfEventHash).toBe('fnv1a_old_review_hash');
    expect(timeline.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['AUDIT_TIMELINE_EVENT_HASH_MISMATCH', 'AUDIT_TIMELINE_MUTATION_FORBIDDEN'])
    );
  });
});

function passedPrecheck(): RegistryInstallPrecheck {
  const payload: Omit<RegistryInstallPrecheck, 'precheckHash'> = {
    artifactKind: REGISTRY_INSTALL_PRECHECK_KIND,
    schemaVersion: CAPABILITY_REGISTRY_INSTALL_SCHEMA_VERSION,
    status: 'passed',
    lifecycleState: 'APPROVED',
    packageId: 'combat.projectile_ricochet.v1',
    packageVersion: '1.0.0',
    candidatePackageHash: 'fnv1a_package',
    approvalValidityHash: 'fnv1a_approval_validity',
    approvalValidityReceiptHash: 'fnv1a_approval_receipt',
    registryAdminAuthorizationHash: 'fnv1a_admin_auth',
    currentRegistrySnapshotHash: 'fnv1a_registry',
    issues: []
  };
  return { ...payload, precheckHash: hashStableJson(payload) };
}

function readyInstallEvidence(precheck: RegistryInstallPrecheck) {
  return buildRegistryInstallReadinessEvidence({
    requestId: 'capsyn_req_workbench',
    attemptId: 'attempt_1',
    precheck,
    approvalValidityStatus: 'valid',
    approvalValidityReceiptTrusted: true,
    registryAdminAuthorizationHash: 'fnv1a_admin_auth',
    writerLockProofHash: 'fnv1a_writer_lock',
    currentRefsHash: 'fnv1a_current_refs',
    packageHash: 'fnv1a_package',
    beforeSnapshotHash: 'fnv1a_before',
    canaryPlanHash: 'fnv1a_canary_plan',
    rollbackTargetSnapshotHash: 'fnv1a_before',
    oldLocksRemainUnchanged: true
  });
}

function trustedReadinessStore(receipt: RegistryInstallReadinessReceipt) {
  return {
    namespace: REGISTRY_INSTALL_READINESS_TRUSTED_NAMESPACE,
    resolveReceipt(ref: RegistryInstallReadinessReceipt['trustedArtifactRef']) {
      return ref.artifactId === receipt.trustedArtifactRef.artifactId ? receipt : undefined;
    }
  };
}
