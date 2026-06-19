import { describe, expect, it } from 'vitest';

import {
  buildStep36FinalArtifactIndex,
  buildStep36FinalArtifactIndexReceipt,
  buildStep36FinalClosureReport,
  buildStep36FinalOracleGate,
  buildStep36FinalValidationReceipt,
  completeStep36FinalChildArtifacts,
  completeStep36FinalReviewAreas,
  completeStep36FinalValidationReceipts,
  STEP36_FINAL_ARTIFACT_INDEX_TRUSTED_NAMESPACE,
  STEP36_REQUIRED_FINAL_STEPS,
  type Step36FinalArtifactIndex,
  type Step36FinalArtifactIndexReceipt,
  type Step36FinalArtifactIndexReceiptResolver,
  type Step36FinalChildArtifact,
  type Step36FinalClosureReport
} from '../../packages/game-dsl/src/index.js';
import { hashStableJson } from '../../packages/game-dsl/src/gameplay-capabilities/stable-json.js';

describe('Step36 final contract, security and Oracle closure', () => {
  it('closes only when all final review areas, artifacts, validations and Oracle gates pass', () => {
    const first = buildStep36FinalClosureReport(validFinalClosureInput());
    const second = buildStep36FinalClosureReport(validFinalClosureInput());

    expect(first.status).toBe('closed');
    expect(first.issues).toEqual([]);
    expect(first.closedStepIds).toEqual([...STEP36_REQUIRED_FINAL_STEPS]);
    expect(first.finalArtifactIndexHash).toBe(second.finalArtifactIndexHash);
    expect(first.reportHash).toBe(second.reportHash);
    expect(first.closureRules).toMatchObject({
      step35PrerequisitePassed: true,
      referencePassed: true,
      negativeProofPassed: true,
      rollbackExercised: true,
      artifactsIndexed: true,
      noArbitraryCodePath: true,
      noHiddenFallback: true,
      noDirectGeneratedPhaserMutation: true
    });
  });

  it('blocks final closure on P0 or unresolved P1 findings', () => {
    const report = buildStep36FinalClosureReport(validFinalClosureInput({
      findings: [
        { severity: 'P0', code: 'arbitrary_command', message: 'Model can execute arbitrary command.' },
        { severity: 'P1', code: 'weak_mutation_gate', message: 'Mutation evidence is incomplete.' }
      ]
    }));

    expect(report.status).toBe('blocked');
    expect(issueCodes(report)).toEqual(expect.arrayContaining(['STEP36_FINAL_P0_PRESENT', 'STEP36_FINAL_P1_UNRESOLVED']));
  });

  it('requires Step35 prerequisite and every final review area evidence row', () => {
    const report = buildStep36FinalClosureReport(validFinalClosureInput({
      reviewAreas: completeStep36FinalReviewAreas({
        step35_prerequisite: { status: 'failed', evidenceHash: 'fnv1a_step35_failed' }
      }).filter((area) => area.areaId !== 'artifact_index_organization'),
      closureRules: {
        ...passingClosureRules(),
        step35PrerequisitePassed: false
      }
    }));

    expect(report.status).toBe('blocked');
    expect(issueCodes(report)).toEqual(
      expect.arrayContaining([
        'STEP36_FINAL_STEP35_PREREQUISITE_MISSING',
        'STEP36_FINAL_REVIEW_AREA_MISSING',
        'STEP36_FINAL_REVIEW_AREA_FAILED'
      ])
    );
  });

  it('rejects duplicate review area rows instead of allowing later rows to mask conflicts', () => {
    const reviewAreas = completeStep36FinalReviewAreas();
    const report = buildStep36FinalClosureReport(validFinalClosureInput({
      reviewAreas: [
        ...reviewAreas,
        { areaId: 'step35_prerequisite', status: 'failed', evidenceHash: 'fnv1a_conflicting_step35' }
      ]
    }));

    expect(report.status).toBe('blocked');
    expect(issueCodes(report)).toContain('STEP36_FINAL_REVIEW_AREA_DUPLICATE');
  });

  it('blocks failed reference closure, failed negative proof and missing rollback exercise', () => {
    const report = buildStep36FinalClosureReport(validFinalClosureInput({
      referenceClosure: { status: 'failed', reportHash: 'fnv1a_reference' },
      negativeProof: { status: 'failed', reportHash: 'fnv1a_negative', caseCount: 13 },
      closureRules: {
        ...passingClosureRules(),
        referencePassed: false,
        negativeProofPassed: false,
        rollbackExercised: false
      }
    }));

    expect(report.status).toBe('blocked');
    expect(issueCodes(report)).toEqual(
      expect.arrayContaining([
        'STEP36_FINAL_REFERENCE_FAILED',
        'STEP36_FINAL_NEGATIVE_PROOF_FAILED',
        'STEP36_FINAL_ROLLBACK_NOT_EXERCISED'
      ])
    );
  });

  it('rejects reference and negative proof summaries that do not match indexed child artifacts', () => {
    const report = buildStep36FinalClosureReport(validFinalClosureInput({
      referenceClosure: { status: 'passed', reportHash: 'fnv1a_stale_reference_summary' },
      negativeProof: { status: 'passed', reportHash: 'fnv1a_stale_negative_summary', caseCount: 14 }
    }));

    expect(report.status).toBe('blocked');
    expect(issueCodes(report)).toEqual(
      expect.arrayContaining([
        'STEP36_FINAL_REFERENCE_FAILED',
        'STEP36_FINAL_NEGATIVE_PROOF_FAILED'
      ])
    );
  });

  it('rejects a self-consistent final artifact index when child artifacts are absent', () => {
    const childArtifacts = completeStep36FinalChildArtifacts();
    const index = buildStep36FinalArtifactIndex({ childArtifacts });
    const receipt = buildStep36FinalArtifactIndexReceipt({ index });
    const report = buildStep36FinalClosureReport(validFinalClosureInput({
      childArtifacts: [],
      finalArtifactIndex: index,
      finalArtifactIndexReceipt: receipt
    }));

    expect(report.status).toBe('blocked');
    expect(issueCodes(report)).toEqual(expect.arrayContaining(['STEP36_FINAL_ARTIFACT_INDEX_INVALID', 'STEP36_FINAL_ARTIFACT_MISSING']));
  });

  it('rejects missing, duplicate and hashless final artifact entries', () => {
    const childArtifacts = [
      ...completeStep36FinalChildArtifacts({
        step36_policy_decision_receipt: { payloadHash: '' }
      }).filter((artifact) => artifact.kind !== 'step36_rollback_receipt'),
      completeStep36FinalChildArtifacts()[0]
    ];
    const report = buildStep36FinalClosureReport(validFinalClosureInput({
      childArtifacts
    }));

    expect(report.status).toBe('blocked');
    expect(issueCodes(report)).toEqual(
      expect.arrayContaining([
        'STEP36_FINAL_ARTIFACT_MISSING',
        'STEP36_FINAL_ARTIFACT_DUPLICATE',
        'STEP36_FINAL_ARTIFACT_HASH_MISMATCH'
      ])
    );
  });

  it('rejects child hash, producer and parent lineage mismatches even with a fresh trusted receipt', () => {
    const childArtifacts = completeStep36FinalChildArtifacts();
    const index = rehashIndex({
      ...buildStep36FinalArtifactIndex({ childArtifacts }),
      entries: buildStep36FinalArtifactIndex({ childArtifacts }).entries.map((entry) => {
        if (entry.kind === 'step36_verification_bundle') {
          return { ...entry, contentHash: 'fnv1a_other_verification' };
        }
        if (entry.kind === 'step36_registry_install_receipt') {
          return { ...entry, producer: 'candidate.self-claimed-installer' };
        }
        if (entry.kind === 'step36_step34_acceptance_gate') {
          return { ...entry, parentHashes: ['fnv1a_other_parent'] };
        }
        return entry;
      })
    });
    const receipt = buildStep36FinalArtifactIndexReceipt({ index });
    const report = buildStep36FinalClosureReport(validFinalClosureInput({
      childArtifacts,
      finalArtifactIndex: index,
      finalArtifactIndexReceipt: receipt
    }));

    expect(report.status).toBe('blocked');
    expect(issueCodes(report)).toEqual(
      expect.arrayContaining([
        'STEP36_FINAL_ARTIFACT_HASH_MISMATCH',
        'STEP36_FINAL_ARTIFACT_PRODUCER_MISMATCH',
        'STEP36_FINAL_ARTIFACT_PARENT_MISMATCH'
      ])
    );
  });

  it('rejects stale final artifact index receipts, failed validations and blocked Oracle gate', () => {
    const childArtifacts = completeStep36FinalChildArtifacts();
    const index = buildStep36FinalArtifactIndex({ childArtifacts });
    const staleReceipt = buildStep36FinalArtifactIndexReceipt({
      index: buildStep36FinalArtifactIndex({
        childArtifacts: completeStep36FinalChildArtifacts({
          step36_reference_closure_report: { payloadHash: 'fnv1a_old_reference' }
        })
      })
    });
    const report = buildStep36FinalClosureReport(validFinalClosureInput({
      childArtifacts,
      finalArtifactIndex: index,
      finalArtifactIndexReceipt: staleReceipt,
      validationReceipts: completeStep36FinalValidationReceipts({
        'npm run test:contracts': { status: 'failed', testFiles: 75, testCount: 865 }
      }),
      oracleFinalGate: buildStep36FinalOracleGate({
        status: 'blocked',
        promptHash: 'fnv1a_prompt',
        reviewHash: 'fnv1a_review',
        p0Count: 0,
        unresolvedP1Count: 1
      })
    }));

    expect(report.status).toBe('blocked');
    expect(issueCodes(report)).toEqual(
      expect.arrayContaining([
        'STEP36_FINAL_ARTIFACT_INDEX_INVALID',
        'STEP36_FINAL_VALIDATION_FAILED',
        'STEP36_FINAL_ORACLE_GATE_FAILED'
      ])
    );
  });

  it('rejects duplicate validation receipts instead of allowing later receipts to mask failures', () => {
    const receipts = completeStep36FinalValidationReceipts();
    const report = buildStep36FinalClosureReport(validFinalClosureInput({
      validationReceipts: [
        ...receipts,
        buildStep36FinalValidationReceipt({
          command: 'npm run test:contracts',
          status: 'failed',
          testFiles: 76,
          testCount: 875,
          completedAt: '2026-06-19T00:00:00.000Z'
        })
      ]
    }));

    expect(report.status).toBe('blocked');
    expect(issueCodes(report)).toContain('STEP36_FINAL_VALIDATION_DUPLICATE');
  });
});

function validFinalClosureInput(
  overrides: Partial<Parameters<typeof buildStep36FinalClosureReport>[0]> & {
    finalArtifactIndexReceipt?: Step36FinalArtifactIndexReceipt;
  } = {}
): Parameters<typeof buildStep36FinalClosureReport>[0] {
  const childArtifacts = overrides.childArtifacts ?? completeStep36FinalChildArtifacts();
  const finalArtifactIndex = overrides.finalArtifactIndex ?? buildStep36FinalArtifactIndex({ childArtifacts });
  const receipt = overrides.finalArtifactIndexReceipt ?? buildStep36FinalArtifactIndexReceipt({ index: finalArtifactIndex });
  const referenceArtifact = childArtifacts.find((artifact) => artifact.kind === 'step36_reference_closure_report');
  const negativeProofArtifact = childArtifacts.find((artifact) => artifact.kind === 'step36_negative_proof_report');
  return {
    closedStepIds: overrides.closedStepIds ?? STEP36_REQUIRED_FINAL_STEPS,
    reviewAreas: overrides.reviewAreas ?? completeStep36FinalReviewAreas(),
    findings: overrides.findings ?? [],
    referenceClosure: overrides.referenceClosure ?? { status: 'passed', reportHash: referenceArtifact?.payloadHash ?? 'fnv1a_reference_closure' },
    negativeProof: overrides.negativeProof ?? { status: 'passed', reportHash: negativeProofArtifact?.payloadHash ?? 'fnv1a_negative_proof', caseCount: 14 },
    childArtifacts,
    finalArtifactIndex,
    finalArtifactIndexReceiptRef: overrides.finalArtifactIndexReceiptRef ?? receipt.trustedArtifactRef,
    trustedFinalArtifactIndexStore: overrides.trustedFinalArtifactIndexStore ?? trustedFinalArtifactIndexStore(receipt),
    validationReceipts: overrides.validationReceipts ?? completeStep36FinalValidationReceipts(),
    oracleFinalGate: overrides.oracleFinalGate ?? buildStep36FinalOracleGate({
      status: 'passed',
      promptHash: 'fnv1a_final_oracle_prompt',
      reviewHash: 'fnv1a_final_oracle_review',
      p0Count: 0,
      unresolvedP1Count: 0
    }),
    closureRules: overrides.closureRules ?? passingClosureRules()
  };
}

function passingClosureRules() {
  return {
    step35PrerequisitePassed: true,
    referencePassed: true,
    negativeProofPassed: true,
    rollbackExercised: true,
    artifactsIndexed: true,
    noArbitraryCodePath: true,
    noHiddenFallback: true,
    noDirectGeneratedPhaserMutation: true
  };
}

function trustedFinalArtifactIndexStore(
  ...receipts: Step36FinalArtifactIndexReceipt[]
): Step36FinalArtifactIndexReceiptResolver {
  return {
    namespace: STEP36_FINAL_ARTIFACT_INDEX_TRUSTED_NAMESPACE,
    resolveReceipt(ref) {
      return receipts.find((receipt) =>
        receipt.trustedArtifactRef.namespace === ref.namespace &&
        receipt.trustedArtifactRef.artifactKind === ref.artifactKind &&
        receipt.trustedArtifactRef.artifactId === ref.artifactId
      );
    }
  };
}

function rehashIndex(index: Step36FinalArtifactIndex): Step36FinalArtifactIndex {
  const { indexHash: _indexHash, ...payload } = index;
  return { ...payload, indexHash: hashStableJson(payload) };
}

function issueCodes(report: Step36FinalClosureReport): string[] {
  return report.issues.map((issue) => issue.code);
}
