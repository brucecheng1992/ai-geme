import { describe, expect, it } from 'vitest';

import {
  appendCapabilitySynthesisStateEvent,
  buildCapabilityCandidateStoreNamespace,
  buildCapabilitySynthesisAttemptId,
  buildCapabilitySynthesisPermissionsReport,
  buildCapabilitySynthesisRequestIdentity,
  buildStep36ReadinessReport,
  canAnyCapabilitySynthesisRolePerform,
  canStep36ReadinessEnterImplementation,
  validateCapabilityCandidateStoreWrite,
  validateCapabilitySynthesisEventHistory,
  validateCapabilitySynthesisTransition,
  validateStep36ReadinessReportIntegrity
} from '../../packages/game-dsl/src/index.js';

describe('Step36 capability synthesis lifecycle contracts', () => {
  it('fails closed until every backend readiness gate and implementation flag is enabled', () => {
    const blocked = buildStep36ReadinessReport({
      step35RegistryReady: true,
      sandboxAvailable: true,
      networkIsolationVerified: true,
      candidateStoreAvailable: true,
      oracleReviewConfigured: true,
      humanApprovalConfigured: true,
      registryInstallTransactionsAvailable: true
    });

    expect(blocked.status).toBe('BLOCKED');
    expect(canStep36ReadinessEnterImplementation(blocked)).toBe(false);
    expect(blocked.featureFlags.CAPABILITY_SYNTHESIS_ENABLED).toBe(false);
    expect(blocked.featureFlags.CAPABILITY_SYNTHESIS_REFERENCE_ONLY).toBe(true);

    const designOnly = buildStep36ReadinessReport({
      step35RegistryReady: false,
      sandboxAvailable: true,
      networkIsolationVerified: true,
      candidateStoreAvailable: true,
      oracleReviewConfigured: true,
      humanApprovalConfigured: true,
      registryInstallTransactionsAvailable: true,
      featureFlags: {
        CAPABILITY_SYNTHESIS_ENABLED: true,
        CAPABILITY_SYNTHESIS_IMPLEMENTATION_ENABLED: true,
        CAPABILITY_SYNTHESIS_TYPED_MODULES_ENABLED: true,
        CAPABILITY_SYNTHESIS_REGISTRY_INSTALL_ENABLED: true,
        CAPABILITY_SYNTHESIS_REFERENCE_ONLY: false
      }
    });

    expect(designOnly.status).toBe('DESIGN_ONLY');
    expect(canStep36ReadinessEnterImplementation(designOnly)).toBe(false);

    const ready = buildStep36ReadinessReport({
      step35RegistryReady: true,
      sandboxAvailable: true,
      networkIsolationVerified: true,
      candidateStoreAvailable: true,
      oracleReviewConfigured: true,
      humanApprovalConfigured: true,
      registryInstallTransactionsAvailable: true,
      featureFlags: {
        CAPABILITY_SYNTHESIS_ENABLED: true,
        CAPABILITY_SYNTHESIS_IMPLEMENTATION_ENABLED: true,
        CAPABILITY_SYNTHESIS_TYPED_MODULES_ENABLED: true,
        CAPABILITY_SYNTHESIS_REGISTRY_INSTALL_ENABLED: true,
        CAPABILITY_SYNTHESIS_REFERENCE_ONLY: false
      }
    });

    expect(ready.status).toBe('READY');
    expect(canStep36ReadinessEnterImplementation(ready)).toBe(true);
    expect(validateStep36ReadinessReportIntegrity(ready).status).toBe('valid');
    expect(ready.reportHash).toMatch(/^fnv1a_[a-f0-9]{8}$/);

    const forgedReady = {
      ...ready,
      packageContractVersion: 'forged-contract',
      reportHash: ready.reportHash
    };

    expect(validateStep36ReadinessReportIntegrity(forgedReady).issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['STEP36_READINESS_PACKAGE_CONTRACT_INVALID', 'STEP36_READINESS_REPORT_HASH_MISMATCH'])
    );
    expect(canStep36ReadinessEnterImplementation(forgedReady)).toBe(false);
  });

  it('freezes server-side role permissions for approval and install boundaries', () => {
    const permissionsReport = buildCapabilitySynthesisPermissionsReport();

    expect(canAnyCapabilitySynthesisRolePerform(['creator'], 'approve_r2')).toBe(false);
    expect(canAnyCapabilitySynthesisRolePerform(['creator'], 'install_registry')).toBe(false);
    expect(canAnyCapabilitySynthesisRolePerform(['capability_maintainer'], 'approve_r2')).toBe(true);
    expect(canAnyCapabilitySynthesisRolePerform(['capability_maintainer'], 'install_registry')).toBe(false);
    expect(canAnyCapabilitySynthesisRolePerform(['registry_admin'], 'install_registry')).toBe(true);
    expect(canAnyCapabilitySynthesisRolePerform(['registry_admin'], 'approve_r2')).toBe(false);
    expect(permissionsReport.invariants).toContain('registry_admin_can_install_but_cannot_approve_candidate');
    expect(permissionsReport.reportHash).toMatch(/^fnv1a_[a-f0-9]{8}$/);
  });

  it('blocks state jumps, stale updates, creator install, and Step34 Accept install bypasses', () => {
    const invalidJump = validateCapabilitySynthesisTransition({
      from: 'SPEC_READY',
      to: 'APPROVED',
      actorRoles: ['capability_maintainer'],
      candidateHash: 'fnv1a_candidate',
      baseRegistrySnapshotHash: 'fnv1a_registry',
      requiredEvidenceRefs: ['candidate_verification_bundle.json']
    });
    const staleUpdate = validateCapabilitySynthesisTransition({
      from: 'STATIC_VALIDATING',
      to: 'BUILDING',
      currentState: 'REPAIRING',
      expectedPreviousState: 'STATIC_VALIDATING',
      actorRoles: ['capability_maintainer'],
      candidateHash: 'fnv1a_candidate',
      baseRegistrySnapshotHash: 'fnv1a_registry'
    });
    const creatorInstall = validateCapabilitySynthesisTransition({
      from: 'APPROVED',
      to: 'INSTALLING',
      actorRoles: ['creator'],
      requestSource: 'step36_orchestrator',
      candidateHash: 'fnv1a_candidate',
      baseRegistrySnapshotHash: 'fnv1a_registry',
      requiredEvidenceRefs: ['candidate_verification_bundle.json']
    });
    const step34AcceptInstall = validateCapabilitySynthesisTransition({
      from: 'APPROVED',
      to: 'INSTALLING',
      actorRoles: ['registry_admin'],
      requestSource: 'step34_accept',
      candidateHash: 'fnv1a_candidate',
      baseRegistrySnapshotHash: 'fnv1a_registry',
      requiredEvidenceRefs: ['candidate_verification_bundle.json'],
      currentInstallTransactionId: 'install_tx_1'
    });
    const missingInstallSourceAndLock = validateCapabilitySynthesisTransition({
      from: 'APPROVED',
      to: 'INSTALLING',
      actorRoles: ['registry_admin'],
      candidateHash: 'fnv1a_candidate',
      baseRegistrySnapshotHash: 'fnv1a_registry',
      requiredEvidenceRefs: ['candidate_verification_bundle.json']
    });

    expect(invalidJump.status).toBe('blocked');
    expect(invalidJump.issues.map((issue) => issue.code)).toContain('INVALID_STATE_TRANSITION');
    expect(staleUpdate.issues.map((issue) => issue.code)).toContain('TRANSITION_STALE_STATE');
    expect(creatorInstall.issues.map((issue) => issue.code)).toContain('TRANSITION_PERMISSION_DENIED');
    expect(step34AcceptInstall.issues.map((issue) => issue.code)).toContain('TRANSITION_INSTALL_SOURCE_FORBIDDEN');
    expect(missingInstallSourceAndLock.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['TRANSITION_INSTALL_SOURCE_MISSING', 'TRANSITION_INSTALL_LOCK_TOKEN_MISSING'])
    );
  });

  it('requires R2 approval evidence before entering approved state', () => {
    const missingRuntimeOwnerApproval = validateCapabilitySynthesisTransition({
      from: 'HUMAN_REVIEW_PENDING',
      to: 'APPROVED',
      actorRoles: ['capability_maintainer'],
      approvalEvidenceRoles: ['capability_maintainer'],
      candidateHash: 'fnv1a_candidate',
      baseRegistrySnapshotHash: 'fnv1a_registry',
      requiredEvidenceRefs: ['candidate_verification_bundle.json']
    });
    const approved = validateCapabilitySynthesisTransition({
      from: 'HUMAN_REVIEW_PENDING',
      to: 'APPROVED',
      actorRoles: ['capability_maintainer'],
      approvalEvidenceRoles: ['capability_maintainer', 'runtime_code_owner'],
      candidateHash: 'fnv1a_candidate',
      baseRegistrySnapshotHash: 'fnv1a_registry',
      requiredEvidenceRefs: ['candidate_verification_bundle.json']
    });

    expect(missingRuntimeOwnerApproval.status).toBe('blocked');
    expect(missingRuntimeOwnerApproval.issues.map((issue) => issue.code)).toContain('TRANSITION_REQUIRED_APPROVAL_ROLE_MISSING');
    expect(approved.status).toBe('allowed');
  });

  it('allows registry admin install only from approved state with evidence and a free install lock', () => {
    const allowed = validateCapabilitySynthesisTransition({
      from: 'APPROVED',
      to: 'INSTALLING',
      actorRoles: ['registry_admin'],
      requestSource: 'step36_orchestrator',
      candidateHash: 'fnv1a_candidate',
      baseRegistrySnapshotHash: 'fnv1a_registry',
      requiredEvidenceRefs: ['candidate_verification_bundle.json'],
      currentInstallTransactionId: 'install_tx_1'
    });
    const lockConflict = validateCapabilitySynthesisTransition({
      from: 'APPROVED',
      to: 'INSTALLING',
      actorRoles: ['registry_admin'],
      requestSource: 'step36_orchestrator',
      candidateHash: 'fnv1a_candidate',
      baseRegistrySnapshotHash: 'fnv1a_registry',
      requiredEvidenceRefs: ['candidate_verification_bundle.json'],
      activeInstallTransactionId: 'install_tx_other',
      currentInstallTransactionId: 'install_tx_1'
    });

    expect(allowed.status).toBe('allowed');
    expect(lockConflict.status).toBe('blocked');
    expect(lockConflict.issues.map((issue) => issue.code)).toContain('TRANSITION_INSTALL_LOCK_CONFLICT');
  });

  it('keeps duplicate synthesis requests idempotent', () => {
    const first = buildCapabilitySynthesisRequestIdentity({
      projectId: 'proj_123',
      requesterId: 'user_1',
      requestText: '  让子弹碰到墙后最多反弹两次，每次反弹后伤害降低 25%。 '
    });
    const second = buildCapabilitySynthesisRequestIdentity({
      projectId: 'proj_123',
      requesterId: 'user_1',
      requestText: '让子弹碰到墙后最多反弹两次，每次反弹后伤害降低 25%。'
    });

    expect(first.requestId).toBe(second.requestId);
    expect(first.requestHash).toBe(second.requestHash);
  });

  it('allows candidate writes only inside the request attempt namespace', () => {
    const request = buildCapabilitySynthesisRequestIdentity({
      projectId: 'proj_123',
      requesterId: 'user_1',
      requestText: 'ricochet bullets'
    });
    const otherRequest = buildCapabilitySynthesisRequestIdentity({
      projectId: 'proj_456',
      requesterId: 'user_1',
      requestText: 'ricochet bullets'
    });
    const attemptId = buildCapabilitySynthesisAttemptId({ requestId: request.requestId, attemptNumber: 1 });
    const otherAttemptId = buildCapabilitySynthesisAttemptId({ requestId: otherRequest.requestId, attemptNumber: 1 });
    const namespaceRoot = buildCapabilityCandidateStoreNamespace({ requestId: request.requestId, attemptId });
    const allowed = validateCapabilityCandidateStoreWrite({
      requestId: request.requestId,
      attemptId,
      requestedPath: `${namespaceRoot}/candidate/capability.json`
    });
    const registryWrite = validateCapabilityCandidateStoreWrite({
      requestId: request.requestId,
      attemptId,
      requestedPath: 'packages/game-dsl/src/gameplay-capabilities/registry.ts'
    });
    const activeArtifactWrite = validateCapabilityCandidateStoreWrite({
      requestId: request.requestId,
      attemptId,
      requestedPath: 'artifacts/projects/proj_123/candidate.json'
    });
    const packageJsonWrite = validateCapabilityCandidateStoreWrite({
      requestId: request.requestId,
      attemptId,
      requestedPath: 'package.json'
    });
    const traversalWrite = validateCapabilityCandidateStoreWrite({
      requestId: request.requestId,
      attemptId,
      requestedPath: `${namespaceRoot}/../registry.json`
    });
    const mismatchedAttempt = validateCapabilityCandidateStoreWrite({
      requestId: request.requestId,
      attemptId: otherAttemptId,
      requestedPath: buildCapabilityCandidateStoreNamespace({ requestId: request.requestId, attemptId: otherAttemptId })
    });

    expect(allowed.status).toBe('allowed');
    expect(registryWrite.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['CANDIDATE_STORE_FORBIDDEN_REGISTRY_PATH', 'CANDIDATE_STORE_OUTSIDE_ATTEMPT_NAMESPACE'])
    );
    expect(activeArtifactWrite.issues.map((issue) => issue.code)).toContain('CANDIDATE_STORE_FORBIDDEN_ACTIVE_ARTIFACTS');
    expect(packageJsonWrite.issues.map((issue) => issue.code)).toContain('CANDIDATE_STORE_FORBIDDEN_PACKAGE_JSON');
    expect(traversalWrite.issues.map((issue) => issue.code)).toContain('CANDIDATE_STORE_PATH_TRAVERSAL');
    expect(mismatchedAttempt.issues.map((issue) => issue.code)).toContain('CANDIDATE_STORE_ATTEMPT_REQUEST_MISMATCH');
  });

  it('keeps state event history append-only with actor provenance and artifact refs', () => {
    const request = buildCapabilitySynthesisRequestIdentity({
      projectId: 'proj_123',
      requesterId: 'user_1',
      requestText: 'ricochet bullets'
    });
    const firstAppend = appendCapabilitySynthesisStateEvent({
      history: [],
      requestId: request.requestId,
      eventType: 'capability_synthesis.received',
      actor: { actorId: 'user_1', roles: ['creator'] },
      toState: 'RECEIVED',
      artifactRefs: [{ artifactKind: 'capability_synthesis_request', path: 'local-data/capability-synthesis/request.json' }],
      createdAt: '2026-06-19T00:00:00.000Z'
    });

    expect(firstAppend.status).toBe('appended');
    expect(firstAppend.event?.actor.actorId).toBe('user_1');
    expect(firstAppend.event?.previousEventHash).toBe('genesis');
    expect(firstAppend.event?.eventHash).toMatch(/^fnv1a_[a-f0-9]{8}$/);
    expect(firstAppend.event?.artifactRefs).toHaveLength(1);
    expect(firstAppend.event?.createdAt).toBe('2026-06-19T00:00:00.000Z');
    expect(validateCapabilitySynthesisEventHistory(firstAppend.events).status).toBe('valid');

    const designAppend = appendCapabilitySynthesisStateEvent({
      history: firstAppend.events,
      requestId: request.requestId,
      eventType: 'capability_synthesis.design_synthesizing',
      actor: { actorId: 'system', roles: ['capability_reviewer'] },
      fromState: 'RECEIVED',
      toState: 'DESIGN_SYNTHESIZING',
      artifactRefs: [{ artifactKind: 'capability_synthesis_state', path: 'local-data/capability-synthesis/state.json' }],
      createdAt: '2026-06-19T00:01:00.000Z'
    });
    const staleAppend = appendCapabilitySynthesisStateEvent({
      history: firstAppend.events,
      expectedPreviousEventHash: 'fnv1a_stale',
      requestId: request.requestId,
      eventType: 'capability_synthesis.design_synthesizing',
      actor: { actorId: 'system', roles: ['capability_reviewer'] },
      fromState: 'RECEIVED',
      toState: 'DESIGN_SYNTHESIZING',
      artifactRefs: [{ artifactKind: 'capability_synthesis_state', path: 'local-data/capability-synthesis/state.json' }],
      createdAt: '2026-06-19T00:01:00.000Z'
    });
    const illegalJumpAppend = appendCapabilitySynthesisStateEvent({
      history: firstAppend.events,
      requestId: request.requestId,
      eventType: 'capability_synthesis.approved',
      actor: { actorId: 'maintainer_1', roles: ['capability_maintainer'] },
      fromState: 'RECEIVED',
      toState: 'APPROVED',
      artifactRefs: [{ artifactKind: 'capability_synthesis_state', path: 'local-data/capability-synthesis/state.json' }],
      createdAt: '2026-06-19T00:01:00.000Z'
    });
    const unapprovedAppend = appendCapabilitySynthesisStateEvent({
      history: firstAppend.events,
      requestId: request.requestId,
      eventType: 'capability_synthesis.approved',
      actor: { actorId: 'maintainer_1', roles: ['capability_maintainer'] },
      fromState: 'HUMAN_REVIEW_PENDING',
      toState: 'APPROVED',
      transitionContext: {
        candidateHash: 'fnv1a_candidate',
        baseRegistrySnapshotHash: 'fnv1a_registry',
        requiredEvidenceRefs: ['candidate_verification_bundle.json']
      },
      artifactRefs: [{ artifactKind: 'capability_synthesis_state', path: 'local-data/capability-synthesis/state.json' }],
      createdAt: '2026-06-19T00:01:00.000Z'
    });
    const unguardedInstallAppend = appendCapabilitySynthesisStateEvent({
      history: firstAppend.events,
      requestId: request.requestId,
      eventType: 'capability_synthesis.installing',
      actor: { actorId: 'registry_admin_1', roles: ['registry_admin'] },
      fromState: 'APPROVED',
      toState: 'INSTALLING',
      transitionContext: {
        candidateHash: 'fnv1a_candidate',
        baseRegistrySnapshotHash: 'fnv1a_registry',
        requiredEvidenceRefs: ['candidate_verification_bundle.json']
      },
      artifactRefs: [{ artifactKind: 'capability_synthesis_state', path: 'local-data/capability-synthesis/state.json' }],
      createdAt: '2026-06-19T00:01:00.000Z'
    });
    const otherRequest = buildCapabilitySynthesisRequestIdentity({
      projectId: 'proj_456',
      requesterId: 'user_1',
      requestText: 'ricochet bullets'
    });
    const requestMismatchAppend = appendCapabilitySynthesisStateEvent({
      history: firstAppend.events,
      requestId: otherRequest.requestId,
      eventType: 'capability_synthesis.design_synthesizing',
      actor: { actorId: 'system', roles: ['capability_reviewer'] },
      fromState: 'RECEIVED',
      toState: 'DESIGN_SYNTHESIZING',
      artifactRefs: [{ artifactKind: 'capability_synthesis_state', path: 'local-data/capability-synthesis/state.json' }],
      createdAt: '2026-06-19T00:01:00.000Z'
    });
    const tamperedEvents = structuredClone(firstAppend.events);
    tamperedEvents[0].artifactRefs[0].path = 'packages/game-dsl/src/gameplay-capabilities/registry.ts';
    const missingActorEvent = {
      ...firstAppend.events[0],
      actor: { actorId: '', roles: [] },
      eventHash: firstAppend.events[0].eventHash
    };

    expect(staleAppend.status).toBe('blocked');
    expect(staleAppend.issues.map((issue) => issue.code)).toContain('EVENT_APPEND_STALE');
    expect(designAppend.status).toBe('appended');
    expect(designAppend.event?.transitionHash).toMatch(/^fnv1a_[a-f0-9]{8}$/);
    expect(validateCapabilitySynthesisEventHistory(designAppend.events).status).toBe('valid');
    expect(illegalJumpAppend.status).toBe('blocked');
    expect(illegalJumpAppend.issues.map((issue) => issue.code)).toContain('EVENT_TRANSITION_GUARD_BLOCKED');
    expect(unapprovedAppend.status).toBe('blocked');
    expect(unapprovedAppend.issues.map((issue) => issue.code)).toContain('EVENT_TRANSITION_GUARD_BLOCKED');
    expect(unguardedInstallAppend.status).toBe('blocked');
    expect(unguardedInstallAppend.issues.map((issue) => issue.code)).toContain('EVENT_TRANSITION_GUARD_BLOCKED');
    expect(requestMismatchAppend.status).toBe('blocked');
    expect(requestMismatchAppend.issues.map((issue) => issue.code)).toContain('EVENT_REQUEST_ID_MISMATCH');
    expect(validateCapabilitySynthesisEventHistory(tamperedEvents).issues.map((issue) => issue.code)).toContain('EVENT_HASH_MISMATCH');
    expect(validateCapabilitySynthesisEventHistory([missingActorEvent]).issues.map((issue) => issue.code)).toContain('EVENT_ACTOR_MISSING');
  });
});
