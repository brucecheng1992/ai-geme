import { describe, expect, it } from 'vitest';

import {
  buildStep35FinalClosureReport,
  PLATFORMER_PROFILE_ID,
  PLATFORMER_REUSE_PROOF_REPORT_KIND,
  RUN_AND_GUN_CAPABILITY_MIGRATION_REPORT_KIND,
  RUN_AND_GUN_REFERENCE_PROFILE_ID,
  STEP35_FINAL_ORACLE_GATE_ID,
  STEP35_P0_QUESTION_IDS,
  STEP35_P1_QUESTION_IDS,
  STEP35_REQUIRED_FINAL_EVIDENCE_KINDS,
  type PlatformerReuseProofReport,
  type RunAndGunCapabilityMigrationReport,
  type Step35FinalEvidenceRef,
  type Step35FinalOracleGateReview,
  type Step35GateAnswer
} from '../../packages/game-dsl/src/index.js';

describe('Step35 final capability platform closure contract', () => {
  it('closes Step35 when all required evidence, gates, reference migration, second profile proof, and Oracle review pass', () => {
    const report = buildStep35FinalClosureReport(createClosureInput());

    expect(report.status).toBe('closed');
    expect(report.missingFinalEvidenceKinds).toEqual([]);
    expect(report.duplicateEvidenceKinds).toEqual([]);
    expect(report.failedP0QuestionIds).toEqual([]);
    expect(report.failedP1QuestionIds).toEqual([]);
    expect(report.runAndGunReferenceReady).toBe(true);
    expect(report.secondProfileReuseReady).toBe(true);
    expect(report.oracleGatePassed).toBe(true);
    expect(report.blockers).toEqual([]);
  });

  it('blocks closure when required final evidence is missing or invalid', () => {
    const report = buildStep35FinalClosureReport({
      ...createClosureInput(),
      evidenceRefs: [
        ...createEvidenceRefs().filter((ref) => ref.evidenceKind !== 'capability_runtime_binding_report'),
        { evidenceKind: 'not_a_step35_evidence', artifactKind: 'extra', path: 'artifacts/extra.json' } as unknown as Step35FinalEvidenceRef
      ]
    });

    expect(report.status).toBe('blocked');
    expect(report.missingFinalEvidenceKinds).toEqual(['capability_runtime_binding_report']);
    expect(report.invalidEvidenceKinds).toEqual(['not_a_step35_evidence']);
    expect(report.blockers).toEqual(expect.arrayContaining(['final_evidence_incomplete']));
  });

  it('blocks closure when final evidence contains duplicate evidence kinds', () => {
    const report = buildStep35FinalClosureReport({
      ...createClosureInput(),
      evidenceRefs: [...createEvidenceRefs(), { ...createEvidenceRefs()[0], path: 'artifacts/step35/duplicate-registry.json' }]
    });

    expect(report.status).toBe('blocked');
    expect(report.duplicateEvidenceKinds).toEqual(['capability_registry_snapshot']);
    expect(report.blockers).toEqual(expect.arrayContaining(['final_evidence_incomplete']));
  });

  it('blocks closure on any unresolved P0 question', () => {
    const report = buildStep35FinalClosureReport({
      ...createClosureInput(),
      p0Answers: createP0Answers({ new_profile_requires_new_phaser_template: 'failed' })
    });

    expect(report.status).toBe('blocked');
    expect(report.failedP0QuestionIds).toEqual(['new_profile_requires_new_phaser_template']);
    expect(report.blockers).toEqual(expect.arrayContaining(['p0_questions_not_cleared']));
  });

  it('blocks closure on unresolved P1 questions', () => {
    const report = buildStep35FinalClosureReport({
      ...createClosureInput(),
      p1Answers: createP1Answers({ step34_amendment_has_no_field_first_fallback: 'failed' })
    });

    expect(report.status).toBe('blocked');
    expect(report.failedP1QuestionIds).toEqual(['step34_amendment_has_no_field_first_fallback']);
    expect(report.blockers).toEqual(expect.arrayContaining(['p1_questions_not_cleared']));
  });

  it('blocks closure when the run-and-gun reference migration is not ready', () => {
    const report = buildStep35FinalClosureReport({
      ...createClosureInput(),
      runAndGunMigrationReport: { ...createRunAndGunReport(), status: 'blocked' } as RunAndGunCapabilityMigrationReport
    });

    expect(report.status).toBe('blocked');
    expect(report.runAndGunReferenceReady).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining(['run_and_gun_reference_not_ready']));
  });

  it('blocks internally inconsistent ready run-and-gun reference migration reports', () => {
    const report = buildStep35FinalClosureReport({
      ...createClosureInput(),
      runAndGunMigrationReport: {
        ...createRunAndGunReport(),
        noGenreSpecificTemplateSelected: false,
        artifactRefsComplete: false,
        blockers: ['capability_artifact_refs_incomplete']
      } as RunAndGunCapabilityMigrationReport
    });

    expect(report.status).toBe('blocked');
    expect(report.runAndGunReferenceReady).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining(['run_and_gun_reference_not_ready']));
  });

  it('blocks closure when the second profile reuse proof is not ready', () => {
    const report = buildStep35FinalClosureReport({
      ...createClosureInput(),
      platformerReuseProofReport: { ...createPlatformerReuseReport(), noNewTemplateDirectory: false } as PlatformerReuseProofReport
    });

    expect(report.status).toBe('blocked');
    expect(report.secondProfileReuseReady).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining(['second_profile_reuse_not_ready']));
  });

  it('blocks internally inconsistent ready second profile reuse proofs', () => {
    const report = buildStep35FinalClosureReport({
      ...createClosureInput(),
      platformerReuseProofReport: {
        ...createPlatformerReuseReport(),
        renderFidelityPassed: false,
        shootingActualAddedCapabilityIds: ['combat.projectile.v1', 'enemy.ranged_attack.v1', 'weapon.cooldown.v1'],
        blockers: ['render_fidelity_missing']
      } as PlatformerReuseProofReport
    });

    expect(report.status).toBe('blocked');
    expect(report.secondProfileReuseReady).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining(['second_profile_reuse_not_ready']));
  });

  it('blocks malformed shooting actual additions with duplicate IDs even when length matches', () => {
    const report = buildStep35FinalClosureReport({
      ...createClosureInput(),
      platformerReuseProofReport: {
        ...createPlatformerReuseReport(),
        shootingActualAddedCapabilityIds: ['combat.projectile.v1', 'combat.projectile.v1']
      } as PlatformerReuseProofReport
    });

    expect(report.status).toBe('blocked');
    expect(report.secondProfileReuseReady).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining(['second_profile_reuse_not_ready']));
  });

  it('blocks closure until the final Oracle gate has no P0 or P1 findings', () => {
    const report = buildStep35FinalClosureReport({
      ...createClosureInput(),
      oracleReview: { ...createOracleReview(), p1Findings: ['field-first fallback remains'] }
    });

    expect(report.status).toBe('blocked');
    expect(report.oracleGatePassed).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining(['final_oracle_gate_not_cleared']));
  });

  it('keeps final closure report hashes deterministic', () => {
    const first = buildStep35FinalClosureReport(createClosureInput());
    const second = buildStep35FinalClosureReport({
      ...createClosureInput(),
      evidenceRefs: [...createEvidenceRefs()].reverse(),
      p0Answers: [...createP0Answers()].reverse(),
      p1Answers: [...createP1Answers()].reverse()
    });

    expect(first.reportHash).toBe(second.reportHash);
  });
});

function createClosureInput() {
  return {
    evidenceRefs: createEvidenceRefs(),
    p0Answers: createP0Answers(),
    p1Answers: createP1Answers(),
    runAndGunMigrationReport: createRunAndGunReport(),
    platformerReuseProofReport: createPlatformerReuseReport(),
    oracleReview: createOracleReview()
  };
}

function createEvidenceRefs(): Step35FinalEvidenceRef[] {
  return STEP35_REQUIRED_FINAL_EVIDENCE_KINDS.map((evidenceKind) => ({
    evidenceKind,
    artifactKind: evidenceKind,
    path: `artifacts/step35/${evidenceKind}.json`,
    reportHash: `${evidenceKind}.hash`
  }));
}

function createP0Answers(overrides: Partial<Record<(typeof STEP35_P0_QUESTION_IDS)[number], 'passed' | 'failed'>> = {}): Array<Step35GateAnswer<string>> {
  return STEP35_P0_QUESTION_IDS.map((questionId) => ({
    questionId,
    severity: 'P0',
    status: overrides[questionId] ?? 'passed',
    evidenceRef: `oracle/p0/${questionId}.md`,
    summary: `${questionId} reviewed`
  }));
}

function createP1Answers(overrides: Partial<Record<(typeof STEP35_P1_QUESTION_IDS)[number], 'passed' | 'failed'>> = {}): Array<Step35GateAnswer<string>> {
  return STEP35_P1_QUESTION_IDS.map((questionId) => ({
    questionId,
    severity: 'P1',
    status: overrides[questionId] ?? 'passed',
    evidenceRef: `oracle/p1/${questionId}.md`,
    summary: `${questionId} reviewed`
  }));
}

function createRunAndGunReport(): RunAndGunCapabilityMigrationReport {
  return {
    artifactKind: RUN_AND_GUN_CAPABILITY_MIGRATION_REPORT_KIND,
    schemaVersion: 'run_and_gun_capability_migration_report.v0.1',
    profileId: RUN_AND_GUN_REFERENCE_PROFILE_ID,
    status: 'ready',
    strategy: 'dual_run_legacy_default_composed_flagged',
    legacyRuntimeTemplate: 'phaser/side_scrolling_run_and_gun',
    composedRuntimeFamily: 'phaser_2d_action_arcade.v1',
    requiredCapabilityIds: [],
    selectedCapabilityIds: [],
    noGenreSpecificTemplateSelected: true,
    runtimeManifestComplete: true,
    gameplayQaPassed: true,
    renderFidelityPassed: true,
    amendmentLifecyclePassed: true,
    artifactRefsComplete: true,
    invalidArtifactRefKinds: [],
    profileCompilationReport: { status: 'compiled' } as RunAndGunCapabilityMigrationReport['profileCompilationReport'],
    parityReport: { status: 'passed' } as RunAndGunCapabilityMigrationReport['parityReport'],
    artifactRefs: [],
    blockers: [],
    reportHash: 'run-and-gun.hash'
  };
}

function createPlatformerReuseReport(): PlatformerReuseProofReport {
  return {
    artifactKind: PLATFORMER_REUSE_PROOF_REPORT_KIND,
    schemaVersion: 'side_scrolling_platformer_reuse_proof_report.v0.1',
    profileId: PLATFORMER_PROFILE_ID,
    status: 'ready',
    referenceCompositionReady: true,
    referenceCompositionReportHash: 'run-and-gun.hash',
    referenceCapabilityLockHash: 'run-and-gun-lock.hash',
    requiredCapabilityIds: [],
    reusedCapabilityIds: [],
    newCapabilityIds: [],
    missingReferencePackageIds: [],
    reuseRatio: 0.8,
    reuseThreshold: 0.7,
    noProjectileModulesLoaded: true,
    noNewTemplateDirectory: true,
    noGenreSwitchRegression: true,
    collectAndExitQaPassed: true,
    renderFidelityPassed: true,
    amendmentScenarios: [],
    missingAmendmentScenarioIds: [],
    failedAmendmentScenarioIds: [],
    shootingActualAddedCapabilityIds: ['combat.projectile.v1', 'weapon.cooldown.v1'],
    shootingAdditionCandidate: { status: 'resolved' } as PlatformerReuseProofReport['shootingAdditionCandidate'],
    profileCompilationReport: { status: 'compiled' } as PlatformerReuseProofReport['profileCompilationReport'],
    artifactRefs: [],
    missingArtifactKinds: [],
    blockers: [],
    reportHash: 'platformer.hash'
  };
}

function createOracleReview(): Step35FinalOracleGateReview {
  return {
    gateId: STEP35_FINAL_ORACLE_GATE_ID,
    status: 'passed',
    evidenceRef: 'oracle/step35-final-gate.md',
    p0Findings: [],
    p1Findings: [],
    p2Findings: [],
    p3Findings: []
  };
}
