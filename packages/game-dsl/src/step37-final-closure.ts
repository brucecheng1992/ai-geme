import { hashStableJson } from './gameplay-capabilities/stable-json.js';

export const STEP37_FINAL_CLOSURE_REPORT_KIND = 'step37_final_closure_report';
export const STEP37_FINAL_CLOSURE_SCHEMA_VERSION = 'step37.final-closure.v1';
export const STEP37_FINAL_MAX_VALIDATION_AGE_MS = 24 * 60 * 60 * 1000;

export const STEP37_FINAL_ACCEPTANCE_IDS = [
  'generation_path_recorded',
  'supported_profile_default_capability_composed_v1',
  'play_time_not_schema_capped_120',
  'downstream_raw_model_not_authority',
  'scene_ir_single_authority_owner',
  'runtime_plan_not_overwritten_by_partial_scene',
  'runtime_manifest_matches_exact_lock',
  'required_telemetry_runtime_evidence',
  'capability_gap_fail_closed',
  'step36_unapproved_candidate_blocked',
  'legacy_auditable_rollback_non_default',
  'reference_regression_preserved',
  'final_build_and_capability_owned_qa_passed'
] as const;

export const STEP37_FINAL_REQUIRED_EVIDENCE_KINDS = [
  'pipeline_artifact_index',
  'generation_path_receipt',
  'game_brief_v02_contract',
  'generation_scope_plan',
  'scene_ir_authority_report',
  'scene_ir_coverage_report',
  'generation_capability_gap_report',
  'generation_capability_cutover_report',
  'generation_capability_runtime_report',
  'gameplay_capability_lock',
  'runtime_system_manifest',
  'capability_qa_report',
  'reference_qa_report',
  'oracle_final_gate'
] as const;

export const STEP37_FINAL_REQUIRED_VALIDATION_COMMANDS = [
  'npx vitest run tests/contracts/step37-final-closure.test.ts',
  'npx vitest run tests/contracts/generation-capability-cutover.test.ts tests/contracts/generation-capability-gap.test.ts tests/contracts/generation-capability-runtime.test.ts tests/contracts/generation-capability-resolution.test.ts tests/contracts/generation-capability-readiness.test.ts tests/contracts/generation-path-receipt.test.ts tests/contracts/game-brief-v0.2.test.ts tests/contracts/game-brief-ingress.test.ts tests/contracts/generation-scope-plan.test.ts tests/workspace/game-dsl-provider.test.ts tests/contracts/scene-ir.test.ts tests/contracts/asset-intent-manifest.test.ts tests/contracts/phaser-templates.test.ts tests/workspace/runtime-scene-binding-report.test.ts tests/workspace/compiler-service.test.ts tests/workspace/pipeline-artifact-index.test.ts tests/workspace/pipeline-acceptance-report.test.ts tests/workspace/workbench-pipeline-evidence-client.test.ts tests/workspace/pipeline-golden-trace.test.ts tests/workspace/generation-pipeline.service.test.ts',
  'npx vitest run tests/contracts/capability-synthesis-policy.test.ts tests/contracts/capability-synthesis-scaffold.test.ts tests/contracts/capability-synthesis-lifecycle.test.ts tests/contracts/capability-synthesis-verification.test.ts',
  'npm run typecheck:root',
  'git diff --check',
  'git diff --no-index --check -- /dev/null packages/game-dsl/src/step37-final-closure.ts',
  'git diff --no-index --check -- /dev/null tests/contracts/step37-final-closure.test.ts',
  'git diff --no-index --check -- /dev/null docs/refactor-log/step37-capability-first-authoritative-generation-pipeline-cutover.md'
] as const;

export type Step37FinalAcceptanceId = (typeof STEP37_FINAL_ACCEPTANCE_IDS)[number];
export type Step37FinalEvidenceKind = (typeof STEP37_FINAL_REQUIRED_EVIDENCE_KINDS)[number];
export type Step37FinalRequiredValidationCommand = (typeof STEP37_FINAL_REQUIRED_VALIDATION_COMMANDS)[number];

export type Step37FinalClosureIssue = {
  code:
    | 'STEP37_FINAL_ACCEPTANCE_MISSING'
    | 'STEP37_FINAL_ACCEPTANCE_FAILED'
    | 'STEP37_FINAL_ACCEPTANCE_EVIDENCE_MISMATCH'
    | 'STEP37_FINAL_ACCEPTANCE_DUPLICATE'
    | 'STEP37_FINAL_EVIDENCE_MISSING'
    | 'STEP37_FINAL_EVIDENCE_INVALID'
    | 'STEP37_FINAL_EVIDENCE_DUPLICATE'
    | 'STEP37_FINAL_EVIDENCE_HASH_MISSING'
    | 'STEP37_FINAL_EVIDENCE_PRODUCER_MISSING'
    | 'STEP37_FINAL_EVIDENCE_PARENT_MISSING'
    | 'STEP37_FINAL_VALIDATION_MISSING'
    | 'STEP37_FINAL_VALIDATION_FAILED'
    | 'STEP37_FINAL_VALIDATION_STALE'
    | 'STEP37_FINAL_VALIDATION_DUPLICATE'
    | 'STEP37_FINAL_REFERENCE_REGRESSION_FAILED'
    | 'STEP37_FINAL_ORACLE_GATE_FAILED';
  message: string;
  path?: string;
};

export type Step37FinalAcceptanceCheck = {
  acceptanceId: Step37FinalAcceptanceId;
  status: 'passed' | 'failed';
  evidenceRef: string;
  summary: string;
};

export const STEP37_FINAL_ACCEPTANCE_EVIDENCE_REQUIREMENTS: Record<Step37FinalAcceptanceId, readonly Step37FinalEvidenceKind[]> = {
  generation_path_recorded: ['generation_path_receipt', 'pipeline_artifact_index'],
  supported_profile_default_capability_composed_v1: ['generation_capability_cutover_report', 'gameplay_capability_lock', 'runtime_system_manifest'],
  play_time_not_schema_capped_120: ['game_brief_v02_contract', 'generation_scope_plan'],
  downstream_raw_model_not_authority: ['generation_path_receipt', 'scene_ir_authority_report'],
  scene_ir_single_authority_owner: ['scene_ir_authority_report'],
  runtime_plan_not_overwritten_by_partial_scene: ['scene_ir_coverage_report'],
  runtime_manifest_matches_exact_lock: ['generation_capability_runtime_report', 'gameplay_capability_lock', 'runtime_system_manifest'],
  required_telemetry_runtime_evidence: ['generation_capability_runtime_report', 'capability_qa_report', 'reference_qa_report'],
  capability_gap_fail_closed: ['generation_capability_gap_report', 'generation_capability_cutover_report'],
  step36_unapproved_candidate_blocked: ['generation_capability_gap_report', 'gameplay_capability_lock'],
  legacy_auditable_rollback_non_default: ['generation_path_receipt', 'generation_capability_cutover_report'],
  reference_regression_preserved: ['scene_ir_coverage_report', 'reference_qa_report'],
  final_build_and_capability_owned_qa_passed: ['capability_qa_report', 'reference_qa_report']
};

export type Step37FinalEvidenceRef = {
  evidenceKind: Step37FinalEvidenceKind;
  artifactKind: string;
  path: string;
  reportHash: string;
  producer: string;
  parentHashes: string[];
};

export type Step37FinalValidationReceipt = {
  command: Step37FinalRequiredValidationCommand;
  status: 'passed' | 'failed';
  completedAt: string;
  testFiles?: number;
  testCount?: number;
  receiptHash: string;
};

export type Step37FinalOracleGate = {
  status: 'passed' | 'blocked';
  reviewHash: string;
  p0Count: number;
  unresolvedP1Count: number;
  gateHash: string;
};

export type Step37ReferenceRegressionSummary = {
  platformsMapped: number;
  wavesMapped: number;
  pickupsMapped: number;
  winTarget: number;
  enemyFiredObserved: boolean;
  buildStatus: 'passed' | 'failed';
  capabilityOwnedQaStatus: 'passed' | 'failed';
  qaReportHash: string;
};

export type Step37FinalClosureReport = {
  artifactKind: typeof STEP37_FINAL_CLOSURE_REPORT_KIND;
  schemaVersion: typeof STEP37_FINAL_CLOSURE_SCHEMA_VERSION;
  status: 'closed' | 'blocked';
  acceptanceChecks: Step37FinalAcceptanceCheck[];
  missingAcceptanceIds: string[];
  failedAcceptanceIds: string[];
  duplicateAcceptanceIds: string[];
  requiredEvidenceKinds: string[];
  evidenceRefs: Step37FinalEvidenceRef[];
  missingEvidenceKinds: string[];
  duplicateEvidenceKinds: string[];
  invalidEvidenceKinds: string[];
  validationReceipts: Step37FinalValidationReceipt[];
  evaluatedAt: string;
  maxValidationAgeMs: number;
  missingValidationCommands: string[];
  failedValidationCommands: string[];
  duplicateValidationCommands: string[];
  referenceRegression: Step37ReferenceRegressionSummary;
  referenceRegressionPassed: boolean;
  oracleFinalGate: Step37FinalOracleGate;
  oracleGatePassed: boolean;
  issues: Step37FinalClosureIssue[];
  reportHash: string;
};

export function buildStep37FinalValidationReceipt(input: Omit<Step37FinalValidationReceipt, 'receiptHash'>): Step37FinalValidationReceipt {
  const payload: Omit<Step37FinalValidationReceipt, 'receiptHash'> = {
    command: input.command,
    status: input.status,
    completedAt: input.completedAt,
    ...(input.testFiles === undefined ? {} : { testFiles: input.testFiles }),
    ...(input.testCount === undefined ? {} : { testCount: input.testCount })
  };
  return { ...payload, receiptHash: hashStableJson(payload) };
}

export function buildStep37FinalOracleGate(input: Omit<Step37FinalOracleGate, 'gateHash'>): Step37FinalOracleGate {
  const payload: Omit<Step37FinalOracleGate, 'gateHash'> = {
    status: input.status,
    reviewHash: input.reviewHash.trim(),
    p0Count: input.p0Count,
    unresolvedP1Count: input.unresolvedP1Count
  };
  return { ...payload, gateHash: hashStableJson(payload) };
}

export function buildStep37FinalClosureReport(input: {
  acceptanceChecks: readonly Step37FinalAcceptanceCheck[];
  evidenceRefs: readonly Step37FinalEvidenceRef[];
  validationReceipts: readonly Step37FinalValidationReceipt[];
  evaluatedAt: string;
  maxValidationAgeMs: number;
  referenceRegression: Step37ReferenceRegressionSummary;
  oracleFinalGate: Step37FinalOracleGate;
}): Step37FinalClosureReport {
  const acceptance = normalizeAcceptanceChecks(input.acceptanceChecks);
  const evidenceRefs = normalizeEvidenceRefs(input.evidenceRefs);
  const validationReceipts = normalizeValidationReceipts(input.validationReceipts);
  const referenceRegressionPassed = isReferenceRegressionPassed(input.referenceRegression);
  const oracleGatePassed = isOracleGatePassed(input.oracleFinalGate);
  const issues = [
    ...acceptanceIssues(acceptance, evidenceRefs),
    ...evidenceIssues(evidenceRefs),
    ...validationIssues(validationReceipts, input.evaluatedAt, input.maxValidationAgeMs),
    ...(referenceRegressionPassed ? [] : [issue('STEP37_FINAL_REFERENCE_REGRESSION_FAILED', 'Reference regression must preserve counts, enemy.fired, build and capability QA.', 'referenceRegression')]),
    ...(oracleGatePassed ? [] : [issue('STEP37_FINAL_ORACLE_GATE_FAILED', 'Final Oracle gate must pass with P0=0 and unresolved P1=0.', 'oracleFinalGate')])
  ].sort(compareIssues);
  const payload: Omit<Step37FinalClosureReport, 'reportHash'> = {
    artifactKind: STEP37_FINAL_CLOSURE_REPORT_KIND,
    schemaVersion: STEP37_FINAL_CLOSURE_SCHEMA_VERSION,
    status: issues.length === 0 ? 'closed' : 'blocked',
    acceptanceChecks: acceptance,
    missingAcceptanceIds: missingAcceptanceIds(acceptance),
    failedAcceptanceIds: failedAcceptanceIds(acceptance),
    duplicateAcceptanceIds: duplicateAcceptanceIds(acceptance),
    requiredEvidenceKinds: [...STEP37_FINAL_REQUIRED_EVIDENCE_KINDS],
    evidenceRefs,
    missingEvidenceKinds: missingEvidenceKinds(evidenceRefs),
    duplicateEvidenceKinds: duplicateEvidenceKinds(evidenceRefs),
    invalidEvidenceKinds: invalidEvidenceKinds(input.evidenceRefs),
    validationReceipts,
    evaluatedAt: input.evaluatedAt,
    maxValidationAgeMs: input.maxValidationAgeMs,
    missingValidationCommands: missingValidationCommands(validationReceipts),
    failedValidationCommands: failedValidationCommands(validationReceipts),
    duplicateValidationCommands: duplicateValidationCommands(validationReceipts),
    referenceRegression: input.referenceRegression,
    referenceRegressionPassed,
    oracleFinalGate: input.oracleFinalGate,
    oracleGatePassed,
    issues
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

function acceptanceIssues(
  checks: readonly Step37FinalAcceptanceCheck[],
  evidenceRefs: readonly Step37FinalEvidenceRef[]
): Step37FinalClosureIssue[] {
  return [
    ...missingAcceptanceIds(checks).map((id) => issue('STEP37_FINAL_ACCEPTANCE_MISSING', 'Final acceptance check is missing.', id)),
    ...failedAcceptanceIds(checks).map((id) => issue('STEP37_FINAL_ACCEPTANCE_FAILED', 'Final acceptance check did not pass.', id)),
    ...acceptanceEvidenceBindingIssues(checks, evidenceRefs),
    ...duplicateAcceptanceIds(checks).map((id) => issue('STEP37_FINAL_ACCEPTANCE_DUPLICATE', 'Final acceptance check cannot appear more than once.', id))
  ];
}

function evidenceIssues(refs: readonly Step37FinalEvidenceRef[]): Step37FinalClosureIssue[] {
  return [
    ...missingEvidenceKinds(refs).map((kind) => issue('STEP37_FINAL_EVIDENCE_MISSING', 'Final evidence ref is missing.', kind)),
    ...duplicateEvidenceKinds(refs).map((kind) => issue('STEP37_FINAL_EVIDENCE_DUPLICATE', 'Final evidence ref cannot appear more than once.', kind)),
    ...invalidEvidenceKinds(refs).map((kind) => issue('STEP37_FINAL_EVIDENCE_INVALID', 'Final evidence kind is not allowed.', kind)),
    ...refs.flatMap((ref) => [
      ...(ref.reportHash.trim().length > 0 ? [] : [issue('STEP37_FINAL_EVIDENCE_HASH_MISSING', 'Final evidence must include a report hash.', ref.evidenceKind)]),
      ...(ref.producer.trim().length > 0 ? [] : [issue('STEP37_FINAL_EVIDENCE_PRODUCER_MISSING', 'Final evidence must include a producer.', ref.evidenceKind)]),
      ...(ref.parentHashes.length > 0 && ref.parentHashes.every((hash) => hash.trim().length > 0)
        ? []
        : [issue('STEP37_FINAL_EVIDENCE_PARENT_MISSING', 'Final evidence must include parent lineage hashes.', ref.evidenceKind)])
    ])
  ];
}

function validationIssues(
  receipts: readonly Step37FinalValidationReceipt[],
  evaluatedAt: string,
  maxValidationAgeMs: number
): Step37FinalClosureIssue[] {
  return [
    ...missingValidationCommands(receipts).map((command) => issue('STEP37_FINAL_VALIDATION_MISSING', 'Final validation receipt is missing.', command)),
    ...failedValidationCommands(receipts).map((command) => issue('STEP37_FINAL_VALIDATION_FAILED', 'Final validation command did not pass.', command)),
    ...duplicateValidationCommands(receipts).map((command) => issue('STEP37_FINAL_VALIDATION_DUPLICATE', 'Final validation receipt cannot appear more than once.', command)),
    ...receipts
      .filter((receipt) => receipt.receiptHash !== recomputeValidationReceiptHash(receipt))
      .map((receipt) => issue('STEP37_FINAL_VALIDATION_FAILED', 'Final validation receipt hash does not match the receipt payload.', receipt.command)),
    ...staleValidationReceiptIssues(receipts, evaluatedAt, maxValidationAgeMs)
  ];
}

function acceptanceEvidenceBindingIssues(
  checks: readonly Step37FinalAcceptanceCheck[],
  evidenceRefs: readonly Step37FinalEvidenceRef[]
): Step37FinalClosureIssue[] {
  const evidenceByRef = new Map<string, Step37FinalEvidenceRef>();
  for (const ref of evidenceRefs) {
    evidenceByRef.set(ref.path, ref);
    evidenceByRef.set(ref.reportHash, ref);
  }

  return checks.flatMap((check) => {
    const evidence = evidenceByRef.get(check.evidenceRef);
    const requiredEvidenceKinds = STEP37_FINAL_ACCEPTANCE_EVIDENCE_REQUIREMENTS[check.acceptanceId];
    return evidence !== undefined && requiredEvidenceKinds.includes(evidence.evidenceKind)
      ? []
      : [issue('STEP37_FINAL_ACCEPTANCE_EVIDENCE_MISMATCH', 'Final acceptance evidenceRef must point to an allowed required evidence path or hash.', check.acceptanceId)];
  });
}

function staleValidationReceiptIssues(
  receipts: readonly Step37FinalValidationReceipt[],
  evaluatedAt: string,
  maxValidationAgeMs: number
): Step37FinalClosureIssue[] {
  const evaluatedMs = Date.parse(evaluatedAt);
  if (!Number.isFinite(evaluatedMs) || maxValidationAgeMs <= 0 || maxValidationAgeMs > STEP37_FINAL_MAX_VALIDATION_AGE_MS) {
    return [issue('STEP37_FINAL_VALIDATION_STALE', 'Final closure evaluatedAt and maxValidationAgeMs must define a valid validation freshness window.', 'evaluatedAt')];
  }

  return receipts.flatMap((receipt) => {
    const completedMs = Date.parse(receipt.completedAt);
    return Number.isFinite(completedMs) && completedMs <= evaluatedMs && evaluatedMs - completedMs <= maxValidationAgeMs
      ? []
      : [issue('STEP37_FINAL_VALIDATION_STALE', 'Final validation receipt is outside the allowed freshness window.', receipt.command)];
  });
}

function isReferenceRegressionPassed(summary: Step37ReferenceRegressionSummary): boolean {
  return (
    summary.platformsMapped === 5 &&
    summary.wavesMapped === 3 &&
    summary.pickupsMapped === 1 &&
    summary.winTarget === 3800 &&
    summary.enemyFiredObserved &&
    summary.buildStatus === 'passed' &&
    summary.capabilityOwnedQaStatus === 'passed' &&
    summary.qaReportHash.trim().length > 0
  );
}

function isOracleGatePassed(gate: Step37FinalOracleGate): boolean {
  return (
    gate.status === 'passed' &&
    gate.reviewHash.trim().length > 0 &&
    gate.p0Count === 0 &&
    gate.unresolvedP1Count === 0 &&
    gate.gateHash === recomputeOracleGateHash(gate)
  );
}

function normalizeAcceptanceChecks(checks: readonly Step37FinalAcceptanceCheck[]): Step37FinalAcceptanceCheck[] {
  return checks
    .map((check) => ({
      acceptanceId: check.acceptanceId,
      status: check.status,
      evidenceRef: check.evidenceRef.trim(),
      summary: check.summary.trim()
    }))
    .sort((left, right) => left.acceptanceId.localeCompare(right.acceptanceId));
}

function normalizeEvidenceRefs(refs: readonly Step37FinalEvidenceRef[]): Step37FinalEvidenceRef[] {
  return refs
    .filter((ref) => ref.path.trim().length > 0 && ref.artifactKind.trim().length > 0)
    .map((ref) => ({
      evidenceKind: ref.evidenceKind,
      artifactKind: ref.artifactKind.trim(),
      path: ref.path.trim(),
      reportHash: ref.reportHash.trim(),
      producer: ref.producer.trim(),
      parentHashes: uniqueStrings(ref.parentHashes)
    }))
    .sort((left, right) => `${left.evidenceKind}:${left.path}`.localeCompare(`${right.evidenceKind}:${right.path}`));
}

function normalizeValidationReceipts(receipts: readonly Step37FinalValidationReceipt[]): Step37FinalValidationReceipt[] {
  return receipts
    .map((receipt) => ({
      command: receipt.command,
      status: receipt.status,
      completedAt: receipt.completedAt,
      ...(receipt.testFiles === undefined ? {} : { testFiles: receipt.testFiles }),
      ...(receipt.testCount === undefined ? {} : { testCount: receipt.testCount }),
      receiptHash: receipt.receiptHash
    }))
    .sort((left, right) => left.command.localeCompare(right.command));
}

function missingAcceptanceIds(checks: readonly Step37FinalAcceptanceCheck[]): string[] {
  const observed = new Set(checks.map((check) => check.acceptanceId));
  return STEP37_FINAL_ACCEPTANCE_IDS.filter((acceptanceId) => !observed.has(acceptanceId)).sort();
}

function failedAcceptanceIds(checks: readonly Step37FinalAcceptanceCheck[]): string[] {
  return checks
    .filter((check) => check.status !== 'passed' || check.evidenceRef.length === 0 || check.summary.length === 0)
    .map((check) => check.acceptanceId)
    .sort();
}

function duplicateAcceptanceIds(checks: readonly Step37FinalAcceptanceCheck[]): string[] {
  return duplicateValues(checks.map((check) => check.acceptanceId));
}

function missingEvidenceKinds(refs: readonly Step37FinalEvidenceRef[]): string[] {
  const observed = new Set(refs.map((ref) => ref.evidenceKind));
  return STEP37_FINAL_REQUIRED_EVIDENCE_KINDS.filter((kind) => !observed.has(kind)).sort();
}

function duplicateEvidenceKinds(refs: readonly Step37FinalEvidenceRef[]): string[] {
  return duplicateValues(refs.map((ref) => ref.evidenceKind));
}

function invalidEvidenceKinds(refs: readonly { evidenceKind: string }[]): string[] {
  const allowed = new Set<string>(STEP37_FINAL_REQUIRED_EVIDENCE_KINDS);
  return [...new Set(refs.map((ref) => ref.evidenceKind).filter((kind) => !allowed.has(kind)))].sort();
}

function missingValidationCommands(receipts: readonly Step37FinalValidationReceipt[]): string[] {
  const observed = new Set(receipts.map((receipt) => receipt.command));
  return STEP37_FINAL_REQUIRED_VALIDATION_COMMANDS.filter((command) => !observed.has(command)).sort();
}

function failedValidationCommands(receipts: readonly Step37FinalValidationReceipt[]): string[] {
  return receipts.filter((receipt) => receipt.status !== 'passed').map((receipt) => receipt.command).sort();
}

function duplicateValidationCommands(receipts: readonly Step37FinalValidationReceipt[]): string[] {
  return duplicateValues(receipts.map((receipt) => receipt.command));
}

function duplicateValues(values: readonly string[]): string[] {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value).sort();
}

function recomputeValidationReceiptHash(receipt: Step37FinalValidationReceipt): string {
  const { receiptHash: _receiptHash, ...payload } = receipt;
  return hashStableJson(payload);
}

function recomputeOracleGateHash(gate: Step37FinalOracleGate): string {
  const { gateHash: _gateHash, ...payload } = gate;
  return hashStableJson(payload);
}

function issue(code: Step37FinalClosureIssue['code'], message: string, path?: string): Step37FinalClosureIssue {
  return { code, message, ...(path === undefined ? {} : { path }) };
}

function compareIssues(left: Step37FinalClosureIssue, right: Step37FinalClosureIssue): number {
  return `${left.code}:${left.path ?? ''}`.localeCompare(`${right.code}:${right.path ?? ''}`);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort();
}
