import {
  PLATFORMER_PROFILE_ID,
  PLATFORMER_REUSE_PROOF_REPORT_KIND,
  PLATFORMER_REUSE_THRESHOLD,
  PLATFORMER_SHOOTING_ADDITION_CAPABILITY_IDS,
  type PlatformerReuseProofReport
} from './platformer-reuse-proof.js';
import {
  RUN_AND_GUN_CAPABILITY_MIGRATION_REPORT_KIND,
  RUN_AND_GUN_REFERENCE_PROFILE_ID,
  type RunAndGunCapabilityMigrationReport
} from './run-and-gun-reference-composition.js';
import { hashStableJson } from './stable-json.js';

export const STEP35_FINAL_CLOSURE_REPORT_KIND = 'step35_final_capability_platform_closure_report';
export const STEP35_FINAL_CLOSURE_REPORT_SCHEMA_VERSION = 'step35_final_capability_platform_closure_report.v0.1';
export const STEP35_FINAL_ORACLE_GATE_ID = 'step35_final_oracle';

export const STEP35_REQUIRED_FINAL_EVIDENCE_KINDS = [
  'capability_registry_snapshot',
  'package_completeness_report',
  'gameplay_capability_lock',
  'composed_game_dsl_schema',
  'capability_ir_compiler_plan',
  'phaser_runtime_system_manifest',
  'capability_runtime_binding_report',
  'capability_qa_report',
  'run_and_gun_parity_report',
  'second_profile_acceptance_report',
  'step34_amendment_evidence',
  'step33_render_fidelity_evidence'
] as const;

export const STEP35_P0_QUESTION_IDS = [
  'new_profile_requires_new_phaser_template',
  'genre_specific_compiler_main_branch',
  'runtime_support_manual_boolean_override',
  'capability_without_qa_enters_supported_profile',
  'package_arbitrary_code_or_schema_bypass',
  'runtime_module_mutates_authoritative_artifacts',
  'candidate_lock_pollutes_active_run_before_accept',
  'runtime_teardown_leaves_stale_listener_timer_object',
  'dsl_node_without_owner_silently_ignored',
  'second_profile_implicit_legacy_template_fallback'
] as const;

export const STEP35_P1_QUESTION_IDS = [
  'capability_version_lock_reproducible',
  'dependency_conflict_reported_before_generation',
  'profile_defaults_do_not_override_user_values',
  'hot_patch_policy_declared_and_verified_by_package',
  'step34_amendment_has_no_field_first_fallback',
  'step33_required_asset_fallback_fail_closed',
  'profile_qa_composes_capability_probes',
  'legacy_composed_parity_covers_behavior_and_render'
] as const;

export type Step35FinalEvidenceKind = (typeof STEP35_REQUIRED_FINAL_EVIDENCE_KINDS)[number];
export type Step35P0QuestionId = (typeof STEP35_P0_QUESTION_IDS)[number];
export type Step35P1QuestionId = (typeof STEP35_P1_QUESTION_IDS)[number];

export type Step35FinalEvidenceRef = {
  evidenceKind: Step35FinalEvidenceKind;
  artifactKind: string;
  path: string;
  reportHash?: string;
};

export type Step35GateAnswer<QuestionId extends string> = {
  questionId: QuestionId;
  severity: 'P0' | 'P1';
  status: 'passed' | 'failed';
  evidenceRef: string;
  summary: string;
};

export type Step35FinalOracleGateReview = {
  gateId: typeof STEP35_FINAL_ORACLE_GATE_ID;
  status: 'passed' | 'blocked';
  evidenceRef: string;
  p0Findings: string[];
  p1Findings: string[];
  p2Findings: string[];
  p3Findings: string[];
};

export type Step35FinalClosureReport = {
  artifactKind: typeof STEP35_FINAL_CLOSURE_REPORT_KIND;
  schemaVersion: typeof STEP35_FINAL_CLOSURE_REPORT_SCHEMA_VERSION;
  status: 'closed' | 'blocked';
  requiredEvidenceKinds: string[];
  evidenceRefs: Step35FinalEvidenceRef[];
  missingFinalEvidenceKinds: string[];
  invalidEvidenceKinds: string[];
  duplicateEvidenceKinds: string[];
  p0Answers: Array<Step35GateAnswer<Step35P0QuestionId>>;
  p1Answers: Array<Step35GateAnswer<Step35P1QuestionId>>;
  missingP0QuestionIds: string[];
  failedP0QuestionIds: string[];
  invalidP0QuestionIds: string[];
  missingP1QuestionIds: string[];
  failedP1QuestionIds: string[];
  invalidP1QuestionIds: string[];
  runAndGunReferenceReady: boolean;
  secondProfileReuseReady: boolean;
  oracleGatePassed: boolean;
  oracleReview: Step35FinalOracleGateReview;
  blockers: string[];
  reportHash: string;
};

export function buildStep35FinalClosureReport(input: {
  evidenceRefs: readonly Step35FinalEvidenceRef[];
  p0Answers: readonly Step35GateAnswer<string>[];
  p1Answers: readonly Step35GateAnswer<string>[];
  runAndGunMigrationReport: RunAndGunCapabilityMigrationReport;
  platformerReuseProofReport: PlatformerReuseProofReport;
  oracleReview: Step35FinalOracleGateReview;
}): Step35FinalClosureReport {
  const evidenceRefs = [...input.evidenceRefs].filter((ref) => ref.path.length > 0 && ref.artifactKind.length > 0).sort(compareEvidenceRefs);
  const evidenceKinds = new Set(evidenceRefs.map((ref) => ref.evidenceKind));
  const allowedEvidenceKinds = new Set<string>(STEP35_REQUIRED_FINAL_EVIDENCE_KINDS);
  const missingFinalEvidenceKinds = STEP35_REQUIRED_FINAL_EVIDENCE_KINDS.filter((kind) => !evidenceKinds.has(kind)).sort();
  const invalidEvidenceKinds = [...new Set(input.evidenceRefs.map((ref) => ref.evidenceKind).filter((kind) => !allowedEvidenceKinds.has(kind)))].sort();
  const duplicateEvidenceKinds = collectDuplicateEvidenceKinds(evidenceRefs);
  const p0 = collectGateAnswers(input.p0Answers, STEP35_P0_QUESTION_IDS, 'P0');
  const p1 = collectGateAnswers(input.p1Answers, STEP35_P1_QUESTION_IDS, 'P1');
  const runAndGunReferenceReady = isRunAndGunReferenceReady(input.runAndGunMigrationReport);
  const secondProfileReuseReady = isPlatformerReuseReady(input.platformerReuseProofReport);
  const oracleGatePassed =
    input.oracleReview.gateId === STEP35_FINAL_ORACLE_GATE_ID &&
    input.oracleReview.status === 'passed' &&
    input.oracleReview.evidenceRef.length > 0 &&
    input.oracleReview.p0Findings.length === 0 &&
    input.oracleReview.p1Findings.length === 0;
  const blockers = [
    ...(missingFinalEvidenceKinds.length === 0 && invalidEvidenceKinds.length === 0 && duplicateEvidenceKinds.length === 0 ? [] : ['final_evidence_incomplete']),
    ...(p0.missingQuestionIds.length === 0 && p0.failedQuestionIds.length === 0 && p0.invalidQuestionIds.length === 0 ? [] : ['p0_questions_not_cleared']),
    ...(p1.missingQuestionIds.length === 0 && p1.failedQuestionIds.length === 0 && p1.invalidQuestionIds.length === 0 ? [] : ['p1_questions_not_cleared']),
    ...(runAndGunReferenceReady ? [] : ['run_and_gun_reference_not_ready']),
    ...(secondProfileReuseReady ? [] : ['second_profile_reuse_not_ready']),
    ...(oracleGatePassed ? [] : ['final_oracle_gate_not_cleared'])
  ].sort();
  const payload: Omit<Step35FinalClosureReport, 'reportHash'> = {
    artifactKind: STEP35_FINAL_CLOSURE_REPORT_KIND,
    schemaVersion: STEP35_FINAL_CLOSURE_REPORT_SCHEMA_VERSION,
    status: blockers.length === 0 ? 'closed' : 'blocked',
    requiredEvidenceKinds: [...STEP35_REQUIRED_FINAL_EVIDENCE_KINDS],
    evidenceRefs,
    missingFinalEvidenceKinds,
    invalidEvidenceKinds,
    duplicateEvidenceKinds,
    p0Answers: p0.answers,
    p1Answers: p1.answers,
    missingP0QuestionIds: p0.missingQuestionIds,
    failedP0QuestionIds: p0.failedQuestionIds,
    invalidP0QuestionIds: p0.invalidQuestionIds,
    missingP1QuestionIds: p1.missingQuestionIds,
    failedP1QuestionIds: p1.failedQuestionIds,
    invalidP1QuestionIds: p1.invalidQuestionIds,
    runAndGunReferenceReady,
    secondProfileReuseReady,
    oracleGatePassed,
    oracleReview: input.oracleReview,
    blockers
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

function isRunAndGunReferenceReady(report: RunAndGunCapabilityMigrationReport): boolean {
  return (
    report.artifactKind === RUN_AND_GUN_CAPABILITY_MIGRATION_REPORT_KIND &&
    report.profileId === RUN_AND_GUN_REFERENCE_PROFILE_ID &&
    report.status === 'ready' &&
    report.noGenreSpecificTemplateSelected &&
    report.runtimeManifestComplete &&
    report.gameplayQaPassed &&
    report.renderFidelityPassed &&
    report.amendmentLifecyclePassed &&
    report.artifactRefsComplete &&
    report.parityReport.status === 'passed' &&
    report.blockers.length === 0
  );
}

function isPlatformerReuseReady(report: PlatformerReuseProofReport): boolean {
  return (
    report.artifactKind === PLATFORMER_REUSE_PROOF_REPORT_KIND &&
    report.profileId === PLATFORMER_PROFILE_ID &&
    report.status === 'ready' &&
    report.referenceCompositionReady &&
    report.reuseRatio >= PLATFORMER_REUSE_THRESHOLD &&
    report.noProjectileModulesLoaded &&
    report.noNewTemplateDirectory &&
    report.noGenreSwitchRegression &&
    report.collectAndExitQaPassed &&
    report.renderFidelityPassed &&
    report.missingArtifactKinds.length === 0 &&
    report.missingAmendmentScenarioIds.length === 0 &&
    report.failedAmendmentScenarioIds.length === 0 &&
    report.shootingAdditionCandidate.status === 'resolved' &&
    sameStringSet(report.shootingActualAddedCapabilityIds, PLATFORMER_SHOOTING_ADDITION_CAPABILITY_IDS) &&
    report.blockers.length === 0
  );
}

function collectGateAnswers<QuestionId extends string>(
  answers: readonly Step35GateAnswer<string>[],
  requiredQuestionIds: readonly QuestionId[],
  severity: 'P0' | 'P1'
): {
  answers: Array<Step35GateAnswer<QuestionId>>;
  missingQuestionIds: string[];
  failedQuestionIds: string[];
  invalidQuestionIds: string[];
} {
  const required = new Set<string>(requiredQuestionIds);
  const valid = answers.filter((answer): answer is Step35GateAnswer<QuestionId> => {
    return required.has(answer.questionId) && answer.severity === severity && answer.evidenceRef.length > 0 && answer.summary.length > 0;
  });
  const observed = new Set(valid.map((answer) => answer.questionId));
  return {
    answers: [...valid].sort(compareGateAnswers),
    missingQuestionIds: requiredQuestionIds.filter((questionId) => !observed.has(questionId)).sort(),
    failedQuestionIds: valid.filter((answer) => answer.status !== 'passed').map((answer) => answer.questionId).sort(),
    invalidQuestionIds: [
      ...new Set(
        answers
          .filter((answer) => !required.has(answer.questionId) || answer.severity !== severity || answer.evidenceRef.length === 0 || answer.summary.length === 0)
          .map((answer) => answer.questionId)
      )
    ].sort()
  };
}

function compareEvidenceRefs(left: Step35FinalEvidenceRef, right: Step35FinalEvidenceRef): number {
  return `${left.evidenceKind}:${left.path}`.localeCompare(`${right.evidenceKind}:${right.path}`);
}

function compareGateAnswers(left: Step35GateAnswer<string>, right: Step35GateAnswer<string>): number {
  return left.questionId.localeCompare(right.questionId);
}

function collectDuplicateEvidenceKinds(refs: readonly Step35FinalEvidenceRef[]): string[] {
  const counts = new Map<string, number>();
  for (const ref of refs) {
    counts.set(ref.evidenceKind, (counts.get(ref.evidenceKind) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([kind]) => kind).sort();
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  if (leftSet.size !== left.length || rightSet.size !== right.length || leftSet.size !== rightSet.size) {
    return false;
  }
  return [...leftSet].every((value) => rightSet.has(value)) && [...rightSet].every((value) => leftSet.has(value));
}
