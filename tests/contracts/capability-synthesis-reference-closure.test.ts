import { describe, expect, it } from 'vitest';

import {
  buildReferenceRicochetContract,
  buildStep36NegativeProofReport,
  buildStep36ReferenceArtifactIndex,
  buildStep36ReferenceArtifactIndexReceipt,
  buildStep36ReferenceClosureReport,
  buildStep36ReferencePositiveGateEvidence,
  buildStep36ReferencePositiveGateReceipt,
  completeStep36NegativeProofCases,
  REFERENCE_RICOCHET_FORBIDDEN_SCOPE,
  REFERENCE_RICOCHET_REQUIRED_SCOPE,
  STEP36_NEGATIVE_PROOF_CASES,
  STEP36_REQUIRED_REFERENCE_ARTIFACT_KINDS,
  STEP36_NEGATIVE_PROOF_REPORT_KIND,
  STEP36_REFERENCE_ARTIFACT_INDEX_TRUSTED_NAMESPACE,
  STEP36_REFERENCE_POSITIVE_GATE_TRUSTED_NAMESPACE,
  type ReferenceRicochetContract,
  type Step36NegativeProofReport,
  type Step36ReferenceArtifactIndex,
  type Step36ReferenceArtifactIndexReceipt,
  type Step36ReferenceArtifactIndexReceiptResolver,
  type Step36ReferenceArtifactRef,
  type Step36ReferencePositiveGateEvidence,
  type Step36ReferencePositiveGates,
  type Step36ReferencePositiveGateReceipt,
  type Step36ReferencePositiveGateReceiptResolver
} from '../../packages/game-dsl/src/index.js';

describe('Step36 reference synthesis and negative proof closure contracts', () => {
  it('passes only when ricochet reference, negative matrix, artifacts and positive gates all close', () => {
    const contract = buildReferenceRicochetContract();
    const negativeProof = buildStep36NegativeProofReport({ cases: completeStep36NegativeProofCases() });
    const closure = buildStep36ReferenceClosureReport({
      ...trustedClosureInput(contract, negativeProof)
    });

    expect(contract.issues).toEqual([]);
    expect(contract.capabilityId).toBe('combat.projectile_ricochet.v1');
    expect(contract.scopeIncluded).toEqual(expect.arrayContaining([...REFERENCE_RICOCHET_REQUIRED_SCOPE]));
    expect(contract.scopeIncluded).not.toEqual(expect.arrayContaining([...REFERENCE_RICOCHET_FORBIDDEN_SCOPE]));
    expect(negativeProof.status).toBe('passed');
    expect(negativeProof.cases).toHaveLength(STEP36_NEGATIVE_PROOF_CASES.length);
    expect(closure.status).toBe('passed');
    expect(closure.issues).toEqual([]);
  });

  it('blocks over-broad or invalid ricochet reference contracts', () => {
    const contract = buildReferenceRicochetContract({
      existingReuseCapabilities: [],
      scopeIncluded: ['configured_surface_collision_observation', 'weapon_input'],
      scopeExcluded: [],
      defaults: {
        maxBounces: 0,
        damageMultiplierPerBounce: 1.25,
        surfaceTags: [],
        minimumSpeed: -1
      }
    });

    expect(contract.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'REFERENCE_RICOCHET_REUSE_MISSING',
        'REFERENCE_RICOCHET_SCOPE_MISSING',
        'REFERENCE_RICOCHET_SCOPE_EXCLUSION_MISSING',
        'REFERENCE_RICOCHET_SCOPE_FORBIDDEN',
        'REFERENCE_RICOCHET_DEFAULT_INVALID'
      ])
    );
  });

  it('requires every negative matrix case with trusted artifact evidence and expected outcome', () => {
    const report = buildStep36NegativeProofReport({
      cases: completeStep36NegativeProofCases({
        forged_trusted_evidence_receipt: {
          evidenceSource: 'candidate_self_report'
        },
        workbench_truthfulness_local_override: {
          evidenceSource: 'local_ui_state'
        },
        prompt_injection: {
          outcome: 'EXTERNAL_DEPENDENCY_BLOCKED'
        }
      }).filter((entry) => entry.caseId !== 'old_lock_stability')
    });
    const duplicateReport = buildStep36NegativeProofReport({
      cases: [
        ...completeStep36NegativeProofCases(),
        {
          ...completeStep36NegativeProofCases()[0]
        }
      ]
    });

    expect(report.status).toBe('failed');
    expect(report.missingCaseIds).toEqual(['old_lock_stability']);
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'NEGATIVE_PROOF_CASE_MISSING',
        'NEGATIVE_PROOF_OUTCOME_MISMATCH',
        'NEGATIVE_PROOF_UNTRUSTED_SOURCE'
      ])
    );
    expect(duplicateReport.status).toBe('failed');
    expect(duplicateReport.issues.map((issue) => issue.code)).toContain('NEGATIVE_PROOF_CASE_DUPLICATE');
  });

  it('keeps forged trusted receipt and Workbench local override proofs explicit and trusted', () => {
    const report = buildStep36NegativeProofReport({ cases: completeStep36NegativeProofCases() });
    const forgedReceipt = report.cases.find((entry) => entry.caseId === 'forged_trusted_evidence_receipt');
    const workbenchOverride = report.cases.find((entry) => entry.caseId === 'workbench_truthfulness_local_override');

    expect(forgedReceipt).toMatchObject({
      outcome: 'TRUSTED_PROVENANCE_REJECTED',
      evidenceSource: 'trusted_artifact'
    });
    expect(workbenchOverride).toMatchObject({
      outcome: 'WORKBENCH_LOCAL_OVERRIDE_IGNORED',
      evidenceSource: 'trusted_artifact'
    });
  });

  it('fails reference closure when required artifact refs or prior gates are missing', () => {
    const contract = buildReferenceRicochetContract();
    const negativeProof = buildStep36NegativeProofReport({ cases: completeStep36NegativeProofCases() });
    const closure = buildStep36ReferenceClosureReport({
      ...trustedClosureInput(contract, negativeProof, {
        artifactRefs: completeReferenceArtifactRefs(negativeProof.reportHash).filter((ref) => ref.artifactKind !== 'reference_ricochet_install_receipt'),
        positiveGates: {
          ...passingPositiveGates(),
          riskTier: 'R3',
          step34ChildEvidenceGatePassed: false,
          workbenchTruthful: false,
          oldExactLocksUnchanged: false,
          previousRequestingLockCheckpointHash: ''
        }
      })
    });

    expect(closure.status).toBe('failed');
    expect(closure.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['REFERENCE_ARTIFACT_MISSING', 'REFERENCE_GATE_FAILED'])
    );
    expect(closure.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining([
        'reference_ricochet_install_receipt',
        'risk_not_r2',
        'step34_child_evidence_gate_not_passed',
        'workbench_not_truthful',
        'old_exact_locks_changed',
        'previous_requesting_lock_checkpoint_missing'
      ])
    );
  });

  it('rejects tampered negative proof report hashes before closure can pass', () => {
    const contract = buildReferenceRicochetContract();
    const negativeProof = {
      ...buildStep36NegativeProofReport({ cases: completeStep36NegativeProofCases() }),
      reportHash: 'fnv1a_tampered'
    };
    const closure = buildStep36ReferenceClosureReport({
      ...trustedClosureInput(contract, negativeProof)
    });

    expect(closure.status).toBe('failed');
    expect(closure.issues.map((issue) => issue.path)).toContain('negativeProofReport');
  });

  it('rejects tampered reference artifact indexes before positive closure can pass', () => {
    const contract = buildReferenceRicochetContract();
    const negativeProof = buildStep36NegativeProofReport({ cases: completeStep36NegativeProofCases() });
    const index = buildStep36ReferenceArtifactIndex({ artifactRefs: completeReferenceArtifactRefs(negativeProof.reportHash) });
    const indexReceipt = buildStep36ReferenceArtifactIndexReceipt({ index });
    const tamperedIndex = {
      ...index,
      artifactRefs: index.artifactRefs.map((ref) =>
        ref.artifactKind === 'reference_ricochet_verification_bundle'
          ? { ...ref, artifactHash: 'fnv1a_tampered_verification_bundle' }
          : ref
      )
    };
    const positiveGateEvidence = buildStep36ReferencePositiveGateEvidence({
      referenceContract: contract,
      negativeProofReport: negativeProof,
      trustedArtifactIndex: tamperedIndex,
      positiveGates: passingPositiveGates()
    });
    const positiveGateReceipt = buildStep36ReferencePositiveGateReceipt({ evidence: positiveGateEvidence });
    const closure = buildStep36ReferenceClosureReport({
      referenceContract: contract,
      negativeProofReport: negativeProof,
      trustedArtifactIndex: tamperedIndex,
      artifactIndexReceiptRef: indexReceipt.trustedArtifactRef,
      trustedArtifactIndexStore: trustedArtifactIndexStore(indexReceipt),
      positiveGateEvidence,
      positiveGateReceiptRef: positiveGateReceipt.trustedArtifactRef,
      trustedPositiveGateStore: trustedPositiveGateStore(positiveGateReceipt)
    });

    expect(closure.status).toBe('failed');
    expect(closure.issues.map((issue) => issue.code)).toContain('REFERENCE_ARTIFACT_INDEX_INVALID');
  });

  it('rejects fully rehashed reference artifact indexes without trusted receipt provenance', () => {
    const contract = buildReferenceRicochetContract();
    const negativeProof = buildStep36NegativeProofReport({ cases: completeStep36NegativeProofCases() });
    const forgedIndex = buildStep36ReferenceArtifactIndex({
      artifactRefs: completeReferenceArtifactRefs(negativeProof.reportHash).map((ref) => ({
        ...ref,
        artifactHash: ref.artifactKind === STEP36_NEGATIVE_PROOF_REPORT_KIND ? negativeProof.reportHash : `fnv1a_forged_${ref.artifactKind}`
      }))
    });
    const forgedEvidence = buildStep36ReferencePositiveGateEvidence({
      referenceContract: contract,
      negativeProofReport: negativeProof,
      trustedArtifactIndex: forgedIndex,
      positiveGates: passingPositiveGates()
    });

    const closure = buildStep36ReferenceClosureReport({
      referenceContract: contract,
      negativeProofReport: negativeProof,
      trustedArtifactIndex: forgedIndex,
      positiveGateEvidence: forgedEvidence
    });

    expect(closure.status).toBe('failed');
    expect(closure.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining(['trustedArtifactIndexReceipt', 'positiveGateEvidenceReceipt'])
    );
  });

  it('rejects duplicate reference artifact refs even when the trusted index receipt is self-consistent', () => {
    const contract = buildReferenceRicochetContract();
    const negativeProof = buildStep36NegativeProofReport({ cases: completeStep36NegativeProofCases() });
    const refs = completeReferenceArtifactRefs(negativeProof.reportHash);
    const closure = buildStep36ReferenceClosureReport({
      ...trustedClosureInput(contract, negativeProof, {
        artifactRefs: [...refs, refs[0]]
      })
    });

    expect(closure.status).toBe('failed');
    expect(closure.issues.map((issue) => issue.code)).toContain('REFERENCE_ARTIFACT_INDEX_DUPLICATE_REF');
  });

  it('rejects self-certified positive gates without trusted positive gate receipt provenance', () => {
    const contract = buildReferenceRicochetContract();
    const negativeProof = buildStep36NegativeProofReport({ cases: completeStep36NegativeProofCases() });
    const bundle = trustedClosureBundle(contract, negativeProof);

    const closure = buildStep36ReferenceClosureReport({
      referenceContract: contract,
      negativeProofReport: negativeProof,
      trustedArtifactIndex: bundle.index,
      artifactIndexReceiptRef: bundle.indexReceipt.trustedArtifactRef,
      trustedArtifactIndexStore: bundle.indexStore,
      positiveGateEvidence: bundle.positiveGateEvidence
    });

    expect(closure.status).toBe('failed');
    expect(closure.issues.map((issue) => issue.path)).toContain('positiveGateEvidenceReceipt');
  });
});

function trustedClosureInput(
  contract: ReferenceRicochetContract,
  negativeProof: Step36NegativeProofReport,
  input: {
    artifactRefs?: Step36ReferenceArtifactRef[];
    positiveGates?: Step36ReferencePositiveGates;
  } = {}
): Parameters<typeof buildStep36ReferenceClosureReport>[0] {
  const bundle = trustedClosureBundle(contract, negativeProof, input);
  return {
    referenceContract: contract,
    negativeProofReport: negativeProof,
    trustedArtifactIndex: bundle.index,
    artifactIndexReceiptRef: bundle.indexReceipt.trustedArtifactRef,
    trustedArtifactIndexStore: bundle.indexStore,
    positiveGateEvidence: bundle.positiveGateEvidence,
    positiveGateReceiptRef: bundle.positiveGateReceipt.trustedArtifactRef,
    trustedPositiveGateStore: bundle.positiveGateStore
  };
}

function trustedClosureBundle(
  contract: ReferenceRicochetContract,
  negativeProof: Step36NegativeProofReport,
  input: {
    artifactRefs?: Step36ReferenceArtifactRef[];
    positiveGates?: Step36ReferencePositiveGates;
  } = {}
): {
  index: Step36ReferenceArtifactIndex;
  indexReceipt: Step36ReferenceArtifactIndexReceipt;
  indexStore: Step36ReferenceArtifactIndexReceiptResolver;
  positiveGateEvidence: Step36ReferencePositiveGateEvidence;
  positiveGateReceipt: Step36ReferencePositiveGateReceipt;
  positiveGateStore: Step36ReferencePositiveGateReceiptResolver;
} {
  const index = buildStep36ReferenceArtifactIndex({
    artifactRefs: input.artifactRefs ?? completeReferenceArtifactRefs(negativeProof.reportHash)
  });
  const indexReceipt = buildStep36ReferenceArtifactIndexReceipt({ index });
  const positiveGateEvidence = buildStep36ReferencePositiveGateEvidence({
    referenceContract: contract,
    negativeProofReport: negativeProof,
    trustedArtifactIndex: index,
    positiveGates: input.positiveGates ?? passingPositiveGates()
  });
  const positiveGateReceipt = buildStep36ReferencePositiveGateReceipt({ evidence: positiveGateEvidence });
  return {
    index,
    indexReceipt,
    indexStore: trustedArtifactIndexStore(indexReceipt),
    positiveGateEvidence,
    positiveGateReceipt,
    positiveGateStore: trustedPositiveGateStore(positiveGateReceipt)
  };
}

function trustedArtifactIndexStore(
  ...receipts: Step36ReferenceArtifactIndexReceipt[]
): Step36ReferenceArtifactIndexReceiptResolver {
  return {
    namespace: STEP36_REFERENCE_ARTIFACT_INDEX_TRUSTED_NAMESPACE,
    resolveReceipt(ref) {
      return receipts.find((receipt) =>
        receipt.trustedArtifactRef.namespace === ref.namespace &&
        receipt.trustedArtifactRef.artifactKind === ref.artifactKind &&
        receipt.trustedArtifactRef.artifactId === ref.artifactId
      );
    }
  };
}

function trustedPositiveGateStore(
  ...receipts: Step36ReferencePositiveGateReceipt[]
): Step36ReferencePositiveGateReceiptResolver {
  return {
    namespace: STEP36_REFERENCE_POSITIVE_GATE_TRUSTED_NAMESPACE,
    resolveReceipt(ref) {
      return receipts.find((receipt) =>
        receipt.trustedArtifactRef.namespace === ref.namespace &&
        receipt.trustedArtifactRef.artifactKind === ref.artifactKind &&
        receipt.trustedArtifactRef.artifactId === ref.artifactId
      );
    }
  };
}

function completeReferenceArtifactRefs(negativeProofReportHash: string): Step36ReferenceArtifactRef[] {
  return STEP36_REQUIRED_REFERENCE_ARTIFACT_KINDS.map((artifactKind) => ({
    artifactKind,
    artifactHash: artifactKind === STEP36_NEGATIVE_PROOF_REPORT_KIND ? negativeProofReportHash : `fnv1a_${artifactKind}`
  }));
}

function passingPositiveGates(): Step36ReferencePositiveGates {
  return {
    gapProofPassed: true,
    riskTier: 'R2',
    externalDependencyFree: true,
    verificationPassed: true,
    mutationEvidencePassed: true,
    adversarialEvidencePassed: true,
    teardownEvidencePassed: true,
    oracleP0Count: 0,
    oracleP1Count: 0,
    humanApprovalsCurrent: true,
    installedExperimental: true,
    canaryPassed: true,
    rollbackTargetHash: 'fnv1a_rollback_target',
    step34ChildEvidenceGatePassed: true,
    step33RenderAuthoritative: true,
    workbenchTruthful: true,
    userAcceptPromotedAfterGate: true,
    oldExactLocksUnchanged: true,
    previousRequestingLockCheckpointHash: 'fnv1a_previous_requesting_lock'
  };
}
