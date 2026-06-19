import { describe, expect, it } from 'vitest';

import {
  buildCandidateRepairSourceDiff,
  buildCapabilityRepairAttemptLineage,
  buildCapabilityRepairInvalidationReport,
  buildCapabilityRepairModelInput,
  buildCapabilityRepairRequest,
  buildCapabilityRepairRerunGateReport,
  buildCapabilityRepairScopeReport,
  buildCapabilitySynthesisAttemptId,
  buildCapabilitySynthesisRequestIdentity,
  type CapabilityRepairContext,
  type CapabilityRepairDiagnostic,
  type CapabilityRepairScopeSnapshot
} from '../../packages/game-dsl/src/index.js';

describe('Step36 repair loop, candidate immutability and attempt history contracts', () => {
  it('creates a bounded repair request for allowlisted diagnostics and binds the next immutable attempt', () => {
    const context = repairContext(1);
    const first = buildCapabilityRepairRequest({
      context,
      diagnostics: [diagnostic('TYPE_ERROR')],
      requestedChangeKind: 'candidate_source'
    });
    const second = buildCapabilityRepairRequest({
      context,
      diagnostics: [diagnostic('TYPE_ERROR')],
      requestedChangeKind: 'candidate_source'
    });

    expect(first.status).toBe('created');
    expect(first.modelInvocationAllowed).toBe(true);
    expect(first.nextAttemptNumber).toBe(2);
    expect(first.nextAttemptId).toBe(buildCapabilitySynthesisAttemptId({ requestId: context.requestId, attemptNumber: 2 }));
    expect(first.currentAttemptId).toBe(context.currentAttemptId);
    expect(first.parentSourceManifestHash).toBe(context.parentSourceManifestHash);
    expect(first.repairRequestHash).toBe(second.repairRequestHash);
  });

  it('fails closed for denylisted, unknown, unmapped and mixed diagnostics before model repair', () => {
    const context = repairContext(1);
    const denylisted = buildCapabilityRepairRequest({
      context,
      diagnostics: [diagnostic('SANDBOX_VIOLATION')],
      requestedChangeKind: 'candidate_source'
    });
    const unknown = buildCapabilityRepairRequest({
      context,
      diagnostics: [diagnostic('UNKNOWN_DIAGNOSTIC')],
      requestedChangeKind: 'candidate_source'
    });
    const unmapped = buildCapabilityRepairRequest({
      context,
      diagnostics: [diagnostic('UNMAPPED_VERIFICATION_FAILURE')],
      requestedChangeKind: 'candidate_source'
    });
    const mixed = buildCapabilityRepairRequest({
      context,
      diagnostics: [diagnostic('TYPE_ERROR'), diagnostic('VERIFICATION_RECEIPT_MISSING_OR_MISMATCH')],
      requestedChangeKind: 'candidate_source'
    });

    expect(denylisted.status).toBe('blocked');
    expect(denylisted.modelInvocationAllowed).toBe(false);
    expect(denylisted.nextState).toBe('QUARANTINED');
    expect(denylisted.issues.map((issue) => issue.code)).toContain('REPAIR_DIAGNOSTIC_DENYLISTED');
    expect(unknown.issues.map((issue) => issue.code)).toContain('REPAIR_DIAGNOSTIC_UNKNOWN');
    expect(unmapped.issues.map((issue) => issue.code)).toContain('REPAIR_DIAGNOSTIC_UNKNOWN');
    expect(mixed.status).toBe('blocked');
    expect(mixed.issues.map((issue) => issue.code)).toContain('REPAIR_DIAGNOSTIC_DENYLISTED');
  });

  it('limits missing diagnostic mapping to trusted mapping work and never candidate source changes', () => {
    const context = repairContext(1);
    const candidateSource = buildCapabilityRepairRequest({
      context,
      diagnostics: [diagnostic('MISSING_DIAGNOSTIC_MAPPING')],
      requestedChangeKind: 'candidate_source'
    });
    const diagnosticMapping = buildCapabilityRepairRequest({
      context,
      diagnostics: [diagnostic('MISSING_DIAGNOSTIC_MAPPING')],
      requestedChangeKind: 'diagnostic_mapping'
    });

    expect(candidateSource.status).toBe('blocked');
    expect(candidateSource.issues.map((issue) => issue.code)).toContain('REPAIR_DIAGNOSTIC_MAPPING_CANDIDATE_SOURCE_FORBIDDEN');
    expect(diagnosticMapping.status).toBe('created');
    expect(diagnosticMapping.modelInvocationAllowed).toBe(false);
  });

  it('blocks a third automatic repair attempt and active lock drift', () => {
    const thirdAttempt = buildCapabilityRepairRequest({
      context: repairContext(3),
      diagnostics: [diagnostic('TYPE_ERROR')],
      requestedChangeKind: 'candidate_source'
    });
    const activeLockDrift = buildCapabilityRepairRequest({
      context: repairContext(1, { activeCapabilityLockHash: 'fnv1a_lock_a' }),
      activeCapabilityLockHash: 'fnv1a_lock_b',
      diagnostics: [diagnostic('TYPE_ERROR')],
      requestedChangeKind: 'candidate_source'
    });

    expect(thirdAttempt.status).toBe('blocked');
    expect(thirdAttempt.modelInvocationAllowed).toBe(false);
    expect(thirdAttempt.issues.map((issue) => issue.code)).toContain('REPAIR_ATTEMPT_LIMIT_EXCEEDED');
    expect(activeLockDrift.issues.map((issue) => issue.code)).toContain('REPAIR_ACTIVE_LOCK_DRIFT');
  });

  it('requires all upstream context bindings before a repair request can call the model', () => {
    const missingBindings = buildCapabilityRepairRequest({
      context: repairContext(1, {
        policyDecisionReceiptHash: '',
        verificationBundleHash: '',
        registrySnapshotHash: ''
      }),
      diagnostics: [diagnostic('TYPE_ERROR')],
      requestedChangeKind: 'candidate_source'
    });

    expect(missingBindings.status).toBe('blocked');
    expect(missingBindings.modelInvocationAllowed).toBe(false);
    expect(missingBindings.issues.map((issue) => issue.code)).toContain('REPAIR_CONTEXT_BINDING_MISSING');
  });

  it('sanitizes repair model input and blocks hidden harness leakage', () => {
    const request = buildCapabilityRepairRequest({
      context: repairContext(1),
      diagnostics: [
        {
          ...diagnostic('TYPE_ERROR'),
          message: 'Failure in /Users/dahufa/private/file.ts and /tmp/build.log with OPENAI_TOKEN=secret and sk-testsecret123456',
          path: '/private/var/tmp/file.ts'
        }
      ],
      requestedChangeKind: 'candidate_source'
    });
    const clean = buildCapabilityRepairModelInput({
      repairRequest: request,
      allowedWritablePaths: ['src/runtime/phaser_2d_action_arcade.v1.ts']
    });
    const hiddenHarness = buildCapabilityRepairModelInput({
      repairRequest: request,
      allowedWritablePaths: ['src/runtime/phaser_2d_action_arcade.v1.ts'],
      includeHiddenExternalHarness: true
    });

    expect(clean.issues).toEqual([]);
    expect(clean.status).toBe('ready');
    expect(clean.modelInvocationAllowed).toBe(true);
    expect(JSON.stringify(clean.sanitizedDiagnostics)).not.toContain('/Users/');
    expect(JSON.stringify(clean.sanitizedDiagnostics)).not.toContain('/tmp/');
    expect(JSON.stringify(clean.sanitizedDiagnostics)).not.toContain('/private/var/');
    expect(JSON.stringify(clean.sanitizedDiagnostics)).not.toContain('OPENAI_TOKEN=');
    expect(JSON.stringify(clean.sanitizedDiagnostics)).not.toContain('sk-testsecret');
    expect(hiddenHarness.status).toBe('blocked');
    expect(hiddenHarness.modelInvocationAllowed).toBe(false);
    expect(hiddenHarness.issues.map((issue) => issue.code)).toContain('REPAIR_PROMPT_SENSITIVE_DATA');
  });

  it('detects scope drift for paths, imports, dependencies, services, interfaces, privileges and budgets', () => {
    const baseline = scopeBaseline();
    const allowed = buildCapabilityRepairScopeReport({
      requestId: repairContext(1).requestId,
      attemptId: repairContext(1).currentAttemptId,
      baseline,
      candidate: {
        changedFiles: ['src/runtime/phaser_2d_action_arcade.v1.ts'],
        imports: ['@maker/capability-sdk/runtime'],
        dependencies: ['combat.projectile.v1'],
        runtimeServices: ['projectile_motion'],
        dslOwnedPaths: ['/capabilities/projectileRicochet'],
        irNodeKinds: ['ProjectileRicochetRule'],
        publicInterfaces: ['ProjectileRicochetConfig'],
        privileges: ['candidate_spec_only'],
        budgets: { maxStateEntries: 32, maxEventRate: 30, maxUpdateMs: 1 }
      }
    });
    const drift = buildCapabilityRepairScopeReport({
      requestId: repairContext(1).requestId,
      attemptId: repairContext(1).currentAttemptId,
      baseline,
      candidate: {
        changedFiles: ['src/runtime/phaser_2d_action_arcade.v1.ts', 'package.json'],
        imports: ['@maker/capability-sdk/runtime', 'left-pad'],
        dependencies: ['combat.projectile.v1', 'new.dependency.v1'],
        runtimeServices: ['projectile_motion', 'network_sync'],
        dslOwnedPaths: ['/capabilities/projectileRicochet', '/capabilities/network'],
        irNodeKinds: ['ProjectileRicochetRule', 'NetworkRule'],
        publicInterfaces: ['ProjectileRicochetConfig', 'NetworkConfig'],
        privileges: ['candidate_spec_only', 'network'],
        budgets: { maxStateEntries: 64, maxEventRate: 90, maxUpdateMs: 8 },
        touchedTrustedPaths: ['allowed-files.json']
      }
    });

    expect(allowed.status).toBe('allowed');
    expect(drift.status).toBe('blocked');
    expect(drift.issues.map((issue) => issue.code)).toContain('REPAIR_SCOPE_DRIFT');
    expect(drift.issues.map((issue) => issue.path)).toEqual(expect.arrayContaining(['package.json', 'left-pad', 'allowed-files.json']));
  });

  it('invalidates downstream trust, records deterministic lineage and requires full gate rerun evidence', () => {
    const request = buildCapabilityRepairRequest({
      context: repairContext(1),
      diagnostics: [diagnostic('TYPE_ERROR')],
      requestedChangeKind: 'candidate_source'
    });
    const diff = buildCandidateRepairSourceDiff({
      requestId: request.requestId,
      parentAttemptId: request.currentAttemptId,
      nextAttemptId: request.nextAttemptId ?? '',
      changedFiles: [
        { path: 'src/runtime/phaser_2d_action_arcade.v1.ts', beforeHash: 'fnv1a_before', afterHash: 'fnv1a_after' }
      ]
    });
    const scope = buildCapabilityRepairScopeReport({
      requestId: request.requestId,
      attemptId: request.nextAttemptId ?? '',
      baseline: scopeBaseline(),
      candidate: {
        changedFiles: ['src/runtime/phaser_2d_action_arcade.v1.ts'],
        imports: ['@maker/capability-sdk/runtime'],
        dependencies: ['combat.projectile.v1'],
        runtimeServices: ['projectile_motion'],
        dslOwnedPaths: ['/capabilities/projectileRicochet'],
        irNodeKinds: ['ProjectileRicochetRule'],
        publicInterfaces: ['ProjectileRicochetConfig'],
        privileges: ['candidate_spec_only'],
        budgets: { maxStateEntries: 32, maxEventRate: 30, maxUpdateMs: 1 }
      }
    });
    const invalidation = buildCapabilityRepairInvalidationReport({
      requestId: request.requestId,
      parentAttemptId: request.currentAttemptId,
      nextAttemptId: request.nextAttemptId ?? '',
      sourceChanged: true,
      previousVerificationBundleHash: 'fnv1a_verification',
      previousOracleReviewHash: 'fnv1a_oracle',
      previousHumanApprovalHash: 'fnv1a_human',
      previousInstallPlanHash: 'fnv1a_install'
    });
    const missingInvalidation = buildCapabilityRepairInvalidationReport({
      requestId: request.requestId,
      parentAttemptId: request.currentAttemptId,
      nextAttemptId: request.nextAttemptId ?? '',
      sourceChanged: true
    });
    const firstLineage = buildCapabilityRepairAttemptLineage({ repairRequest: request, sourceDiff: diff, scopeReport: scope, invalidationReport: invalidation });
    const secondLineage = buildCapabilityRepairAttemptLineage({ repairRequest: request, sourceDiff: diff, scopeReport: scope, invalidationReport: invalidation });
    const invalidLineage = buildCapabilityRepairAttemptLineage({ repairRequest: request, sourceDiff: diff, scopeReport: scope, invalidationReport: missingInvalidation });
    const allowedRerun = buildCapabilityRepairRerunGateReport({
      requestId: request.requestId,
      attemptId: request.nextAttemptId ?? '',
      lineage: firstLineage,
      candidateHash: 'fnv1a_new_candidate',
      registrySnapshotHash: request.registrySnapshotHash,
      expectedRegistrySnapshotHash: request.registrySnapshotHash,
      evidenceRefs: [firstLineage.lineageHash]
    });
    const blockedRerun = buildCapabilityRepairRerunGateReport({
      requestId: request.requestId,
      attemptId: request.nextAttemptId ?? '',
      lineage: firstLineage,
      registrySnapshotHash: 'fnv1a_stale_registry',
      expectedRegistrySnapshotHash: request.registrySnapshotHash,
      evidenceRefs: []
    });
    const mismatchedLineage = buildCapabilityRepairRerunGateReport({
      requestId: request.requestId,
      attemptId: request.nextAttemptId ?? '',
      lineage: { ...firstLineage, lineageHash: 'fnv1a_tampered_lineage' },
      candidateHash: 'fnv1a_new_candidate',
      registrySnapshotHash: request.registrySnapshotHash,
      expectedRegistrySnapshotHash: request.registrySnapshotHash,
      evidenceRefs: ['fnv1a_tampered_lineage']
    });
    const invalidLineageRerun = buildCapabilityRepairRerunGateReport({
      requestId: request.requestId,
      attemptId: request.nextAttemptId ?? '',
      lineage: invalidLineage,
      candidateHash: 'fnv1a_new_candidate',
      registrySnapshotHash: request.registrySnapshotHash,
      expectedRegistrySnapshotHash: request.registrySnapshotHash,
      evidenceRefs: [invalidLineage.lineageHash]
    });
    const reusedCandidateHash = buildCapabilityRepairRerunGateReport({
      requestId: request.requestId,
      attemptId: request.nextAttemptId ?? '',
      lineage: firstLineage,
      candidateHash: firstLineage.parentSourceManifestHash,
      registrySnapshotHash: request.registrySnapshotHash,
      expectedRegistrySnapshotHash: request.registrySnapshotHash,
      evidenceRefs: [firstLineage.lineageHash]
    });

    expect(missingInvalidation.status).toBe('invalid');
    expect(missingInvalidation.issues.map((issue) => issue.code)).toContain('REPAIR_INVALIDATION_PREVIOUS_VERIFICATION_MISSING');
    expect(invalidation.invalidatedHashes).toEqual({
      previousVerificationBundleHash: 'fnv1a_verification',
      previousOracleReviewHash: 'fnv1a_oracle',
      previousHumanApprovalHash: 'fnv1a_human',
      previousInstallPlanHash: 'fnv1a_install'
    });
    expect(firstLineage.lineageHash).toBe(secondLineage.lineageHash);
    expect(firstLineage.status).toBe('valid');
    expect(invalidLineage.status).toBe('invalid');
    expect(invalidLineage.issues.map((issue) => issue.code)).toContain('REPAIR_LINEAGE_INPUT_INVALID');
    expect(firstLineage.parentAttemptId).toBe(request.currentAttemptId);
    expect(allowedRerun.status).toBe('allowed');
    expect(mismatchedLineage.issues.map((issue) => issue.code)).toContain('REPAIR_RERUN_LINEAGE_MISMATCH');
    expect(invalidLineageRerun.issues.map((issue) => issue.code)).toContain('REPAIR_RERUN_LINEAGE_MISMATCH');
    expect(reusedCandidateHash.issues.map((issue) => issue.code)).toContain('REPAIR_RERUN_CANDIDATE_HASH_REUSED');
    expect(blockedRerun.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'REPAIR_RERUN_LINEAGE_MISSING',
        'REPAIR_RERUN_CANDIDATE_HASH_MISSING',
        'REPAIR_RERUN_REGISTRY_MISMATCH'
      ])
    );
  });
});

function repairContext(attemptNumber: number, overrides: Partial<CapabilityRepairContext> = {}): CapabilityRepairContext {
  const request = buildCapabilitySynthesisRequestIdentity({
    projectId: 'proj_step36',
    requesterId: 'capability_reviewer',
    requestText: 'repair projectile ricochet candidate'
  });
  return {
    requestId: request.requestId,
    currentAttemptId: buildCapabilitySynthesisAttemptId({ requestId: request.requestId, attemptNumber }),
    currentAttemptNumber: attemptNumber,
    ...(attemptNumber > 1
      ? { parentAttemptId: buildCapabilitySynthesisAttemptId({ requestId: request.requestId, attemptNumber: attemptNumber - 1 }) }
      : {}),
    parentSourceManifestHash: 'fnv1a_parent_source_manifest',
    specificationHash: 'fnv1a_spec',
    policyDecisionReceiptHash: 'fnv1a_policy_receipt',
    decisionContextHash: 'fnv1a_decision_context',
    allowedFileMapHash: 'fnv1a_allowed_map',
    previousSourceManifestHash: 'fnv1a_previous_source',
    previousSourceProvenanceHash: 'fnv1a_previous_provenance',
    verificationBundleHash: 'fnv1a_verification_bundle',
    registrySnapshotHash: 'fnv1a_registry',
    activeCapabilityLockHash: 'fnv1a_lock',
    ...overrides
  };
}

function diagnostic(classification: CapabilityRepairDiagnostic['classification']): CapabilityRepairDiagnostic {
  return {
    code: `diag_${classification.toLowerCase()}`,
    classification,
    stageId: 'typecheck',
    message: `Diagnostic ${classification}`,
    path: 'src/runtime/phaser_2d_action_arcade.v1.ts',
    assertionId: `assert_${classification.toLowerCase()}`
  };
}

function scopeBaseline(): CapabilityRepairScopeSnapshot {
  return {
    writablePaths: ['src/runtime/phaser_2d_action_arcade.v1.ts'],
    approvedImports: ['@maker/capability-sdk/runtime'],
    dependencies: ['combat.projectile.v1'],
    runtimeServices: ['projectile_motion'],
    dslOwnedPaths: ['/capabilities/projectileRicochet'],
    irNodeKinds: ['ProjectileRicochetRule'],
    publicInterfaces: ['ProjectileRicochetConfig'],
    privileges: ['candidate_spec_only'],
    budgets: {
      maxStateEntries: 32,
      maxEventRate: 30,
      maxUpdateMs: 1
    }
  };
}
