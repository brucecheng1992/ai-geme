import { describe, expect, it } from 'vitest';

import {
  STEP37_FINAL_ACCEPTANCE_EVIDENCE_REQUIREMENTS,
  STEP37_FINAL_ACCEPTANCE_IDS,
  STEP37_FINAL_MAX_VALIDATION_AGE_MS,
  STEP37_FINAL_REQUIRED_EVIDENCE_KINDS,
  STEP37_FINAL_REQUIRED_VALIDATION_COMMANDS,
  buildStep37FinalClosureReport,
  buildStep37FinalOracleGate,
  buildStep37FinalValidationReceipt,
  type Step37FinalAcceptanceCheck,
  type Step37FinalAcceptanceId,
  type Step37FinalClosureReport,
  type Step37FinalEvidenceKind,
  type Step37FinalEvidenceRef,
  type Step37FinalRequiredValidationCommand,
  type Step37FinalValidationReceipt,
  type Step37ReferenceRegressionSummary
} from '../../packages/game-dsl/src/index.js';

describe('Step37 final capability-first generation closure contract', () => {
  it('closes only when every acceptance item, evidence ref, validation, reference regression and Oracle gate passes', () => {
    const first = buildStep37FinalClosureReport(validClosureInput());
    const second = buildStep37FinalClosureReport(validClosureInput());

    expect(first.status).toBe('closed');
    expect(first.issues).toEqual([]);
    expect(first.missingAcceptanceIds).toEqual([]);
    expect(first.failedAcceptanceIds).toEqual([]);
    expect(first.missingEvidenceKinds).toEqual([]);
    expect(first.missingValidationCommands).toEqual([]);
    expect(first.referenceRegressionPassed).toBe(true);
    expect(first.oracleGatePassed).toBe(true);
    expect(first.reportHash).toBe(second.reportHash);
  });

  it('blocks the current A-E state instead of claiming final Step37 closure', () => {
    const report = buildStep37FinalClosureReport({
      ...validClosureInput(),
      acceptanceChecks: completeStep37FinalAcceptanceChecks({
        supported_profile_default_capability_composed_v1: {
          status: 'failed',
          evidenceRef: evidenceRefFor('generation_capability_cutover_report'),
          summary: 'Current cutover report keeps defaultCutoverAllowed false.'
        },
        runtime_manifest_matches_exact_lock: {
          status: 'failed',
          evidenceRef: evidenceRefFor('runtime_system_manifest'),
          summary: 'Current production run has no active runtime manifest bound to an exact lock.'
        },
        required_telemetry_runtime_evidence: {
          status: 'failed',
          evidenceRef: evidenceRefFor('generation_capability_runtime_report'),
          summary: 'Current production run has no observed capability-owned enemy.fired runtime evidence.'
        },
        final_build_and_capability_owned_qa_passed: {
          status: 'failed',
          evidenceRef: evidenceRefFor('capability_qa_report'),
          summary: 'Current production run has no active capability-owned QA pass.'
        }
      }),
      referenceRegression: completeStep37ReferenceRegression({
        enemyFiredObserved: false,
        capabilityOwnedQaStatus: 'failed'
      }),
      oracleFinalGate: buildStep37FinalOracleGate({
        status: 'blocked',
        reviewHash: 'fnv1a_phase_f_not_closed',
        p0Count: 0,
        unresolvedP1Count: 1
      })
    });

    expect(report.status).toBe('blocked');
    expect(report.failedAcceptanceIds).toEqual(
      expect.arrayContaining([
        'supported_profile_default_capability_composed_v1',
        'runtime_manifest_matches_exact_lock',
        'required_telemetry_runtime_evidence',
        'final_build_and_capability_owned_qa_passed'
      ])
    );
    expect(issueCodes(report)).toEqual(
      expect.arrayContaining([
        'STEP37_FINAL_ACCEPTANCE_FAILED',
        'STEP37_FINAL_REFERENCE_REGRESSION_FAILED',
        'STEP37_FINAL_ORACLE_GATE_FAILED'
      ])
    );
  });

  it('requires every acceptance check to reference an allowed final evidence path or hash', () => {
    const report = buildStep37FinalClosureReport({
      ...validClosureInput(),
      acceptanceChecks: completeStep37FinalAcceptanceChecks({
        generation_path_recorded: {
          evidenceRef: evidenceRefFor('runtime_system_manifest')
        }
      })
    });

    expect(report.status).toBe('blocked');
    expect(issueCodes(report)).toContain('STEP37_FINAL_ACCEPTANCE_EVIDENCE_MISMATCH');
  });

  it('requires every final evidence kind to have hash, producer and parent lineage', () => {
    const duplicate = completeStep37FinalEvidenceRefs()[0];
    const report = buildStep37FinalClosureReport({
      ...validClosureInput(),
      evidenceRefs: [
        ...completeStep37FinalEvidenceRefs({
          runtime_system_manifest: { reportHash: '', producer: '', parentHashes: [] }
        }).filter((ref) => ref.evidenceKind !== 'gameplay_capability_lock'),
        { ...duplicate, path: 'artifacts/step37/duplicate-pipeline-index.json' },
        { evidenceKind: 'not_a_step37_evidence', artifactKind: 'extra', path: 'extra.json', reportHash: 'fnv1a_extra', producer: 'test', parentHashes: ['fnv1a_parent'] } as unknown as Step37FinalEvidenceRef
      ]
    });

    expect(report.status).toBe('blocked');
    expect(report.missingEvidenceKinds).toEqual(['gameplay_capability_lock']);
    expect(report.duplicateEvidenceKinds).toEqual(['pipeline_artifact_index']);
    expect(report.invalidEvidenceKinds).toEqual(['not_a_step37_evidence']);
    expect(issueCodes(report)).toEqual(
      expect.arrayContaining([
        'STEP37_FINAL_EVIDENCE_MISSING',
        'STEP37_FINAL_EVIDENCE_DUPLICATE',
        'STEP37_FINAL_EVIDENCE_INVALID',
        'STEP37_FINAL_EVIDENCE_HASH_MISSING',
        'STEP37_FINAL_EVIDENCE_PRODUCER_MISSING',
        'STEP37_FINAL_EVIDENCE_PARENT_MISSING'
      ])
    );
  });

  it('requires all final validation receipts to pass and remain hash-bound', () => {
    const receipts = completeStep37FinalValidationReceipts({
      'git diff --check': { status: 'failed' }
    });
    const staleReceipt = buildStep37FinalValidationReceipt({
      command: STEP37_FINAL_REQUIRED_VALIDATION_COMMANDS[0],
      status: 'failed',
      completedAt: '2026-06-17T00:00:00.000Z'
    });
    const report = buildStep37FinalClosureReport({
      ...validClosureInput(),
      validationReceipts: [
        ...receipts.filter((receipt) => receipt.command !== 'npm run typecheck:root'),
        receipts[0],
        staleReceipt
      ]
    });

    expect(report.status).toBe('blocked');
    expect(report.missingValidationCommands).toEqual(['npm run typecheck:root']);
    expect(report.duplicateValidationCommands).toEqual([STEP37_FINAL_REQUIRED_VALIDATION_COMMANDS[0]]);
    expect(report.failedValidationCommands).toEqual(['git diff --check', STEP37_FINAL_REQUIRED_VALIDATION_COMMANDS[0]]);
    expect(issueCodes(report)).toEqual(
      expect.arrayContaining([
        'STEP37_FINAL_VALIDATION_MISSING',
        'STEP37_FINAL_VALIDATION_DUPLICATE',
        'STEP37_FINAL_VALIDATION_FAILED',
        'STEP37_FINAL_VALIDATION_STALE'
      ])
    );
  });

  it('rejects caller-supplied validation freshness windows wider than the final gate maximum', () => {
    const report = buildStep37FinalClosureReport({
      ...validClosureInput(),
      maxValidationAgeMs: STEP37_FINAL_MAX_VALIDATION_AGE_MS + 1
    });

    expect(report.status).toBe('blocked');
    expect(issueCodes(report)).toContain('STEP37_FINAL_VALIDATION_STALE');
  });

  it('keeps final closure hashes deterministic when inputs arrive in different order', () => {
    const first = buildStep37FinalClosureReport(validClosureInput());
    const second = buildStep37FinalClosureReport({
      ...validClosureInput(),
      acceptanceChecks: [...completeStep37FinalAcceptanceChecks()].reverse(),
      evidenceRefs: [...completeStep37FinalEvidenceRefs()].reverse(),
      validationReceipts: [...completeStep37FinalValidationReceipts()].reverse()
    });

    expect(first.reportHash).toBe(second.reportHash);
  });
});

function validClosureInput() {
  return {
    acceptanceChecks: completeStep37FinalAcceptanceChecks(),
    evidenceRefs: completeStep37FinalEvidenceRefs(),
    validationReceipts: completeStep37FinalValidationReceipts(),
    evaluatedAt: '2026-06-19T00:00:00.000Z',
    maxValidationAgeMs: STEP37_FINAL_MAX_VALIDATION_AGE_MS,
    referenceRegression: completeStep37ReferenceRegression(),
    oracleFinalGate: buildStep37FinalOracleGate({
      status: 'passed',
      reviewHash: 'fnv1a_step37_final_oracle_review',
      p0Count: 0,
      unresolvedP1Count: 0
    })
  };
}

function issueCodes(report: Step37FinalClosureReport): string[] {
  return report.issues.map((issue) => issue.code);
}

function completeStep37FinalAcceptanceChecks(
  overrides: Partial<Record<Step37FinalAcceptanceId, Partial<Step37FinalAcceptanceCheck>>> = {}
): Step37FinalAcceptanceCheck[] {
  return STEP37_FINAL_ACCEPTANCE_IDS.map((acceptanceId) => ({
    acceptanceId,
    status: 'passed',
    evidenceRef: evidenceRefFor(STEP37_FINAL_ACCEPTANCE_EVIDENCE_REQUIREMENTS[acceptanceId][0]),
    summary: `${acceptanceId} passed`,
    ...overrides[acceptanceId]
  }));
}

function completeStep37FinalEvidenceRefs(
  overrides: Partial<Record<Step37FinalEvidenceKind, Partial<Step37FinalEvidenceRef>>> = {}
): Step37FinalEvidenceRef[] {
  return STEP37_FINAL_REQUIRED_EVIDENCE_KINDS.map((evidenceKind) => ({
    evidenceKind,
    artifactKind: evidenceKind,
    path: evidenceRefFor(evidenceKind),
    reportHash: `fnv1a_${evidenceKind}`,
    producer: evidenceKind === 'oracle_final_gate' ? 'oracle' : 'maker-api.step37-final-closure',
    parentHashes: [`fnv1a_parent_${evidenceKind}`],
    ...overrides[evidenceKind]
  }));
}

function completeStep37FinalValidationReceipts(
  overrides: Partial<Record<Step37FinalRequiredValidationCommand, Partial<Step37FinalValidationReceipt>>> = {}
): Step37FinalValidationReceipt[] {
  return STEP37_FINAL_REQUIRED_VALIDATION_COMMANDS.map((command) => buildStep37FinalValidationReceipt({
    command,
    status: 'passed',
    completedAt: '2026-06-19T00:00:00.000Z',
    ...(command.includes('generation-capability-cutover') ? { testFiles: 21, testCount: 236 } : {}),
    ...(command.includes('capability-synthesis') ? { testFiles: 4, testCount: 64 } : {}),
    ...overrides[command]
  }));
}

function completeStep37ReferenceRegression(
  overrides: Partial<Step37ReferenceRegressionSummary> = {}
): Step37ReferenceRegressionSummary {
  return {
    platformsMapped: 5,
    wavesMapped: 3,
    pickupsMapped: 1,
    winTarget: 3800,
    enemyFiredObserved: true,
    buildStatus: 'passed',
    capabilityOwnedQaStatus: 'passed',
    qaReportHash: 'fnv1a_step37_reference_qa',
    ...overrides
  };
}

function evidenceRefFor(evidenceKind: Step37FinalEvidenceKind): string {
  return `artifacts/step37/${evidenceKind}.json`;
}
