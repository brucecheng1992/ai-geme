import { hashStableJson } from '../gameplay-capabilities/stable-json.js';

export const STEP36_FINAL_CLOSURE_SCHEMA_VERSION = 'step36.final-closure.v1';
export const STEP36_FINAL_ARTIFACT_INDEX_KIND = 'step36_final_artifact_index';
export const STEP36_FINAL_ARTIFACT_INDEX_RECEIPT_KIND = 'step36_final_artifact_index_receipt';
export const STEP36_FINAL_CLOSURE_REPORT_KIND = 'step36_final_closure_report';
export const STEP36_FINAL_CLOSURE_ORCHESTRATOR = 'maker-api.step36-final-closure-orchestrator';
export const STEP36_FINAL_ARTIFACT_INDEX_TRUSTED_NAMESPACE = 'trusted-artifact-store:step36-final-artifact-index';

export const STEP36_REQUIRED_FINAL_STEPS = [
  '36.1',
  '36.2',
  '36.3',
  '36.4',
  '36.5',
  '36.6',
  '36.7',
  '36.8',
  '36.9',
  '36.10',
  '36.11',
  '36.12',
  '36.13',
  '36.14',
  '36.15',
  '36.16'
] as const;

export const STEP36_FINAL_REVIEW_AREAS = [
  'step35_prerequisite',
  'readiness_and_feature_flags',
  'state_machine_and_permissions',
  'design_synthesis_contracts',
  'reuse_first_gap_analysis',
  'specification_attestation',
  'risk_policy_decision_context',
  'sandbox_isolation',
  'scaffold_authority',
  'model_output_boundaries',
  'static_policy_source_integrity',
  'verification_independence',
  'mutation_adversarial_performance_teardown',
  'oracle_and_human_approval',
  'registry_transaction_canary_rollback',
  'step34_accept_separation',
  'step33_render_fidelity',
  'workbench_truthfulness',
  'reference_and_negative_proofs',
  'artifact_index_organization'
] as const;

export const STEP36_FINAL_REQUIRED_ARTIFACTS = [
  { kind: 'step35_prerequisite_closure', producer: 'maker-api.step35-capability-platform' },
  { kind: 'step36_readiness_report', producer: 'maker-api.capability-synthesis-readiness' },
  { kind: 'step36_design_plan', producer: 'maker-api.capability-design-orchestrator' },
  { kind: 'step36_gap_report', producer: 'maker-api.capability-gap-analyzer' },
  { kind: 'step36_spec_validation_attestation', producer: 'maker-api.capability-specification-validator' },
  { kind: 'step36_policy_decision_receipt', producer: 'maker-api.capability-synthesis-policy-engine' },
  { kind: 'step36_sandbox_manifest', producer: 'maker-api.capability-sandbox-executor' },
  { kind: 'step36_scaffold_report', producer: 'maker-api.capability-scaffolder' },
  { kind: 'step36_candidate_source_manifest', producer: 'maker-api.candidate-source-orchestrator' },
  { kind: 'step36_verification_bundle', producer: 'maker-api.capability-verification-orchestrator' },
  { kind: 'step36_oracle_review', producer: 'oracle' },
  { kind: 'step36_approval_validity_receipt', producer: 'maker-api.capability-approval-orchestrator' },
  { kind: 'step36_registry_install_receipt', producer: 'maker-api.capability-registry-installer' },
  { kind: 'step36_rollback_receipt', producer: 'maker-api.capability-registry-installer' },
  { kind: 'step36_step34_acceptance_gate', producer: 'maker-api.semantic-amendment-orchestrator' },
  { kind: 'step36_step33_render_fidelity', producer: 'maker-api.render-fidelity-orchestrator' },
  { kind: 'step36_workbench_truthfulness_report', producer: 'maker-api.workbench-review-orchestrator' },
  { kind: 'step36_reference_closure_report', producer: STEP36_FINAL_CLOSURE_ORCHESTRATOR },
  { kind: 'step36_negative_proof_report', producer: STEP36_FINAL_CLOSURE_ORCHESTRATOR }
] as const;

export const STEP36_FINAL_REQUIRED_VALIDATION_COMMANDS = [
  'npx vitest run tests/contracts/capability-synthesis-final-closure.test.ts',
  'npm run typecheck:root',
  'npx vitest run tests/contracts/capability-synthesis-*.test.ts',
  'npm run test:contracts',
  'git diff --check',
  'rg -n "[ \\t]+$" docs/refactor-log/step36-ai-assisted-gameplay-design-and-capability-synthesis.md packages/game-dsl/src/capability-synthesis/final-closure.ts tests/contracts/capability-synthesis-final-closure.test.ts'
] as const;

const TRUSTED_STEP36_FINAL_ARTIFACT_INDEX_ISSUERS = new Set([STEP36_FINAL_CLOSURE_ORCHESTRATOR]);

export type Step36FinalStepId = (typeof STEP36_REQUIRED_FINAL_STEPS)[number];
export type Step36FinalReviewAreaId = (typeof STEP36_FINAL_REVIEW_AREAS)[number];
export type Step36FinalArtifactKind = (typeof STEP36_FINAL_REQUIRED_ARTIFACTS)[number]['kind'];
export type Step36FinalRequiredValidationCommand = (typeof STEP36_FINAL_REQUIRED_VALIDATION_COMMANDS)[number];
export type Step36FinalArtifactTrustClass = 'model_output' | 'trusted_generated' | 'sandbox_output' | 'human_record' | 'oracle_record';
export type Step36FinalFindingSeverity = 'P0' | 'P1' | 'P2' | 'P3';

export type Step36FinalClosureIssue = {
  code:
    | 'STEP36_FINAL_STEP_MISSING'
    | 'STEP36_FINAL_STEP35_PREREQUISITE_MISSING'
    | 'STEP36_FINAL_REVIEW_AREA_MISSING'
    | 'STEP36_FINAL_REVIEW_AREA_FAILED'
    | 'STEP36_FINAL_REVIEW_AREA_DUPLICATE'
    | 'STEP36_FINAL_P0_PRESENT'
    | 'STEP36_FINAL_P1_UNRESOLVED'
    | 'STEP36_FINAL_REFERENCE_FAILED'
    | 'STEP36_FINAL_NEGATIVE_PROOF_FAILED'
    | 'STEP36_FINAL_CLOSURE_RULE_FAILED'
    | 'STEP36_FINAL_ROLLBACK_NOT_EXERCISED'
    | 'STEP36_FINAL_ARTIFACT_INDEX_INVALID'
    | 'STEP36_FINAL_ARTIFACT_MISSING'
    | 'STEP36_FINAL_ARTIFACT_DUPLICATE'
    | 'STEP36_FINAL_ARTIFACT_HASH_MISMATCH'
    | 'STEP36_FINAL_ARTIFACT_PRODUCER_MISMATCH'
    | 'STEP36_FINAL_ARTIFACT_PARENT_MISMATCH'
    | 'STEP36_FINAL_VALIDATION_FAILED'
    | 'STEP36_FINAL_VALIDATION_DUPLICATE'
    | 'STEP36_FINAL_ORACLE_GATE_FAILED';
  message: string;
  path?: string;
};

export type Step36FinalReviewAreaStatus = {
  areaId: Step36FinalReviewAreaId;
  status: 'passed' | 'failed';
  evidenceHash: string;
};

export type Step36FinalFinding = {
  severity: Step36FinalFindingSeverity;
  code: string;
  message: string;
  resolved?: boolean;
};

export type Step36FinalChildArtifact = {
  kind: Step36FinalArtifactKind;
  path: string;
  payloadHash: string;
  producer: string;
  parentHashes: string[];
  trustClass: Step36FinalArtifactTrustClass;
  createdAt: string;
  trustedReceiptHash?: string;
};

export type Step36FinalArtifactIndexEntry = {
  kind: Step36FinalArtifactKind;
  path: string;
  contentHash: string;
  producer: string;
  parentHashes: string[];
  trustClass: Step36FinalArtifactTrustClass;
  createdAt: string;
  trustedReceiptHash?: string;
};

export type Step36FinalArtifactIndex = {
  artifactKind: typeof STEP36_FINAL_ARTIFACT_INDEX_KIND;
  schemaVersion: typeof STEP36_FINAL_CLOSURE_SCHEMA_VERSION;
  producerServiceId: typeof STEP36_FINAL_CLOSURE_ORCHESTRATOR;
  entries: Step36FinalArtifactIndexEntry[];
  indexHash: string;
};

export type Step36FinalArtifactIndexReceipt = {
  artifactKind: typeof STEP36_FINAL_ARTIFACT_INDEX_RECEIPT_KIND;
  schemaVersion: typeof STEP36_FINAL_CLOSURE_SCHEMA_VERSION;
  receiptId: string;
  trustedArtifactRef: {
    namespace: typeof STEP36_FINAL_ARTIFACT_INDEX_TRUSTED_NAMESPACE | string;
    artifactId: string;
    artifactKind: typeof STEP36_FINAL_ARTIFACT_INDEX_RECEIPT_KIND | string;
  };
  subject: {
    indexHash: string;
    artifactKindsHash: string;
  };
  issuer: {
    serviceId: string;
    keyId?: string;
    issuedAt: string;
  };
  receiptHash: string;
};

export type Step36FinalArtifactIndexReceiptResolver = {
  namespace: typeof STEP36_FINAL_ARTIFACT_INDEX_TRUSTED_NAMESPACE | string;
  resolveReceipt(ref: Step36FinalArtifactIndexReceipt['trustedArtifactRef']): Step36FinalArtifactIndexReceipt | undefined;
};

export type Step36FinalValidationReceipt = {
  command: Step36FinalRequiredValidationCommand;
  status: 'passed' | 'failed';
  testFiles?: number;
  testCount?: number;
  completedAt: string;
  receiptHash: string;
};

export type Step36FinalOracleGate = {
  status: 'passed' | 'blocked';
  promptHash: string;
  reviewHash: string;
  p0Count: number;
  unresolvedP1Count: number;
  gateHash: string;
};

export type Step36FinalReferenceSummary = {
  reportHash: string;
  status: 'passed' | 'failed';
};

export type Step36FinalNegativeProofSummary = {
  reportHash: string;
  status: 'passed' | 'failed';
  caseCount: number;
};

export type Step36FinalClosureRules = {
  step35PrerequisitePassed: boolean;
  referencePassed: boolean;
  negativeProofPassed: boolean;
  rollbackExercised: boolean;
  artifactsIndexed: boolean;
  noArbitraryCodePath: boolean;
  noHiddenFallback: boolean;
  noDirectGeneratedPhaserMutation: boolean;
};

export type Step36FinalClosureReport = {
  artifactKind: typeof STEP36_FINAL_CLOSURE_REPORT_KIND;
  schemaVersion: typeof STEP36_FINAL_CLOSURE_SCHEMA_VERSION;
  status: 'closed' | 'blocked';
  closedStepIds: Step36FinalStepId[];
  reviewAreas: Step36FinalReviewAreaStatus[];
  findings: Step36FinalFinding[];
  referenceClosure: Step36FinalReferenceSummary;
  negativeProof: Step36FinalNegativeProofSummary;
  finalArtifactIndexHash: string;
  validationReceipts: Step36FinalValidationReceipt[];
  oracleFinalGate: Step36FinalOracleGate;
  closureRules: Step36FinalClosureRules;
  issues: Step36FinalClosureIssue[];
  reportHash: string;
};

export function buildStep36FinalArtifactIndex(input: {
  childArtifacts: readonly Step36FinalChildArtifact[];
}): Step36FinalArtifactIndex {
  const payload: Omit<Step36FinalArtifactIndex, 'indexHash'> = {
    artifactKind: STEP36_FINAL_ARTIFACT_INDEX_KIND,
    schemaVersion: STEP36_FINAL_CLOSURE_SCHEMA_VERSION,
    producerServiceId: STEP36_FINAL_CLOSURE_ORCHESTRATOR,
    entries: normalizeChildArtifacts(input.childArtifacts).map((artifact) => ({
      kind: artifact.kind,
      path: artifact.path,
      contentHash: artifact.payloadHash,
      producer: artifact.producer,
      parentHashes: uniqueStrings(artifact.parentHashes),
      trustClass: artifact.trustClass,
      createdAt: artifact.createdAt,
      ...(artifact.trustedReceiptHash === undefined ? {} : { trustedReceiptHash: artifact.trustedReceiptHash })
    }))
  };
  return { ...payload, indexHash: hashStableJson(payload) };
}

export function buildStep36FinalArtifactIndexReceipt(input: {
  index: Step36FinalArtifactIndex;
  issuer?: Partial<Step36FinalArtifactIndexReceipt['issuer']>;
}): Step36FinalArtifactIndexReceipt {
  const subject = finalArtifactIndexReceiptSubject(input.index);
  const receiptPayloadWithoutId: Omit<Step36FinalArtifactIndexReceipt, 'receiptId' | 'trustedArtifactRef' | 'receiptHash'> & {
    trustedArtifactRef: Omit<Step36FinalArtifactIndexReceipt['trustedArtifactRef'], 'artifactId'>;
  } = {
    artifactKind: STEP36_FINAL_ARTIFACT_INDEX_RECEIPT_KIND,
    schemaVersion: STEP36_FINAL_CLOSURE_SCHEMA_VERSION,
    trustedArtifactRef: {
      namespace: STEP36_FINAL_ARTIFACT_INDEX_TRUSTED_NAMESPACE,
      artifactKind: STEP36_FINAL_ARTIFACT_INDEX_RECEIPT_KIND
    },
    subject,
    issuer: {
      serviceId: input.issuer?.serviceId ?? STEP36_FINAL_CLOSURE_ORCHESTRATOR,
      ...(input.issuer?.keyId === undefined ? {} : { keyId: input.issuer.keyId }),
      issuedAt: input.issuer?.issuedAt ?? '2026-06-19T00:00:00.000Z'
    }
  };
  const receiptId = `step36_final_index_receipt_${hashStableJson(receiptPayloadWithoutId).slice('fnv1a_'.length)}`;
  const payload: Omit<Step36FinalArtifactIndexReceipt, 'receiptHash'> = {
    ...receiptPayloadWithoutId,
    receiptId,
    trustedArtifactRef: {
      ...receiptPayloadWithoutId.trustedArtifactRef,
      artifactId: receiptId
    }
  };
  return { ...payload, receiptHash: hashStableJson(payload) };
}

export function buildStep36FinalValidationReceipt(input: Omit<Step36FinalValidationReceipt, 'receiptHash'>): Step36FinalValidationReceipt {
  const payload: Omit<Step36FinalValidationReceipt, 'receiptHash'> = {
    command: input.command,
    status: input.status,
    ...(input.testFiles === undefined ? {} : { testFiles: input.testFiles }),
    ...(input.testCount === undefined ? {} : { testCount: input.testCount }),
    completedAt: input.completedAt
  };
  return { ...payload, receiptHash: hashStableJson(payload) };
}

export function buildStep36FinalOracleGate(input: Omit<Step36FinalOracleGate, 'gateHash'>): Step36FinalOracleGate {
  const payload: Omit<Step36FinalOracleGate, 'gateHash'> = {
    status: input.status,
    promptHash: input.promptHash.trim(),
    reviewHash: input.reviewHash.trim(),
    p0Count: input.p0Count,
    unresolvedP1Count: input.unresolvedP1Count
  };
  return { ...payload, gateHash: hashStableJson(payload) };
}

export function buildStep36FinalClosureReport(input: {
  closedStepIds: readonly Step36FinalStepId[];
  reviewAreas: readonly Step36FinalReviewAreaStatus[];
  findings?: readonly Step36FinalFinding[];
  referenceClosure: Step36FinalReferenceSummary;
  negativeProof: Step36FinalNegativeProofSummary;
  childArtifacts?: readonly Step36FinalChildArtifact[];
  finalArtifactIndex: Step36FinalArtifactIndex;
  finalArtifactIndexReceiptRef?: Step36FinalArtifactIndexReceipt['trustedArtifactRef'];
  trustedFinalArtifactIndexStore?: Step36FinalArtifactIndexReceiptResolver;
  validationReceipts: readonly Step36FinalValidationReceipt[];
  oracleFinalGate: Step36FinalOracleGate;
  closureRules: Step36FinalClosureRules;
}): Step36FinalClosureReport {
  const childArtifacts = normalizeChildArtifacts(input.childArtifacts ?? []);
  const serverDerivedIndex = buildStep36FinalArtifactIndex({ childArtifacts });
  const reviewAreas = normalizeReviewAreas(input.reviewAreas);
  const validationReceipts = normalizeValidationReceipts(input.validationReceipts);
  const findings = [...(input.findings ?? [])].sort((left, right) => `${left.severity}:${left.code}`.localeCompare(`${right.severity}:${right.code}`));
  const issues = [
    ...closedStepIssues(input.closedStepIds),
    ...reviewAreaIssues(reviewAreas),
    ...findingIssues(findings),
    ...referenceIssues(input.referenceClosure, input.negativeProof),
    ...referenceChildArtifactBindingIssues(childArtifacts, input.referenceClosure, input.negativeProof),
    ...closureRuleIssues(input.closureRules),
    ...finalArtifactIndexIssues(input.finalArtifactIndex, serverDerivedIndex, childArtifacts),
    ...(validateStep36FinalArtifactIndexReceipt({
      index: input.finalArtifactIndex,
      receiptRef: input.finalArtifactIndexReceiptRef,
      trustedFinalArtifactIndexStore: input.trustedFinalArtifactIndexStore
    })
      ? []
      : [issue('STEP36_FINAL_ARTIFACT_INDEX_INVALID', 'Final artifact index must resolve through trusted receipt store.', 'finalArtifactIndexReceipt')]),
    ...validationReceiptIssues(validationReceipts),
    ...oracleGateIssues(input.oracleFinalGate)
  ].sort(compareIssues);
  const payload: Omit<Step36FinalClosureReport, 'reportHash'> = {
    artifactKind: STEP36_FINAL_CLOSURE_REPORT_KIND,
    schemaVersion: STEP36_FINAL_CLOSURE_SCHEMA_VERSION,
    status: issues.length === 0 ? 'closed' : 'blocked',
    closedStepIds: normalizeStepIds(input.closedStepIds),
    reviewAreas,
    findings,
    referenceClosure: input.referenceClosure,
    negativeProof: input.negativeProof,
    finalArtifactIndexHash: input.finalArtifactIndex.indexHash,
    validationReceipts,
    oracleFinalGate: input.oracleFinalGate,
    closureRules: input.closureRules,
    issues
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

export function validateStep36FinalArtifactIndexReceipt(input: {
  index: Step36FinalArtifactIndex;
  receiptRef?: Step36FinalArtifactIndexReceipt['trustedArtifactRef'];
  trustedFinalArtifactIndexStore?: Step36FinalArtifactIndexReceiptResolver;
}): boolean {
  const receiptRef = input.receiptRef;
  const store = input.trustedFinalArtifactIndexStore;
  if (receiptRef === undefined || store === undefined) {
    return false;
  }
  const receipt = store.resolveReceipt(receiptRef);
  return receipt !== undefined &&
    store.namespace === STEP36_FINAL_ARTIFACT_INDEX_TRUSTED_NAMESPACE &&
    sameFinalArtifactIndexTrustedRef(receiptRef, receipt.trustedArtifactRef) &&
    receipt.trustedArtifactRef.namespace === STEP36_FINAL_ARTIFACT_INDEX_TRUSTED_NAMESPACE &&
    receipt.trustedArtifactRef.artifactKind === STEP36_FINAL_ARTIFACT_INDEX_RECEIPT_KIND &&
    receipt.trustedArtifactRef.artifactId === receipt.receiptId &&
    TRUSTED_STEP36_FINAL_ARTIFACT_INDEX_ISSUERS.has(receipt.issuer.serviceId) &&
    receipt.receiptHash === recomputeFinalArtifactIndexReceiptHash(receipt) &&
    hashStableJson(receipt.subject) === hashStableJson(finalArtifactIndexReceiptSubject(input.index));
}

export function completeStep36FinalReviewAreas(
  overrides: Partial<Record<Step36FinalReviewAreaId, Partial<Step36FinalReviewAreaStatus>>> = {}
): Step36FinalReviewAreaStatus[] {
  return STEP36_FINAL_REVIEW_AREAS.map((areaId) => ({
    areaId,
    status: 'passed',
    evidenceHash: `fnv1a_${areaId}`,
    ...overrides[areaId]
  }));
}

export function completeStep36FinalChildArtifacts(
  overrides: Partial<Record<Step36FinalArtifactKind, Partial<Step36FinalChildArtifact>>> = {}
): Step36FinalChildArtifact[] {
  return STEP36_FINAL_REQUIRED_ARTIFACTS.map((spec) => ({
    kind: spec.kind,
    path: `capability-synthesis/${spec.kind}.json`,
    payloadHash: `fnv1a_${spec.kind}`,
    producer: spec.producer,
    parentHashes: ['fnv1a_parent_step36'],
    trustClass: spec.kind === 'step36_oracle_review' ? 'oracle_record' : 'trusted_generated',
    createdAt: '2026-06-19T00:00:00.000Z',
    ...overrides[spec.kind]
  }));
}

export function completeStep36FinalValidationReceipts(
  overrides: Partial<Record<Step36FinalRequiredValidationCommand, Partial<Step36FinalValidationReceipt>>> = {}
): Step36FinalValidationReceipt[] {
  return STEP36_FINAL_REQUIRED_VALIDATION_COMMANDS.map((command) => buildStep36FinalValidationReceipt({
    command,
    status: 'passed',
    testFiles: command.includes('capability-synthesis-*.test.ts') ? 16 : command === 'npm run test:contracts' ? 76 : undefined,
    testCount: command.includes('capability-synthesis-*.test.ts') ? 202 : command === 'npm run test:contracts' ? 877 : undefined,
    completedAt: '2026-06-19T00:00:00.000Z',
    ...overrides[command]
  }));
}

function closedStepIssues(stepIds: readonly Step36FinalStepId[]): Step36FinalClosureIssue[] {
  const normalized = new Set(normalizeStepIds(stepIds));
  return STEP36_REQUIRED_FINAL_STEPS
    .filter((stepId) => !normalized.has(stepId))
    .map((stepId) => issue('STEP36_FINAL_STEP_MISSING', 'Step36 final closure requires every step to be closed.', stepId));
}

function reviewAreaIssues(reviewAreas: readonly Step36FinalReviewAreaStatus[]): Step36FinalClosureIssue[] {
  const byArea = new Map(reviewAreas.map((entry) => [entry.areaId, entry]));
  return [
    ...duplicateReviewAreaIssues(reviewAreas),
    ...STEP36_FINAL_REVIEW_AREAS.flatMap((areaId) => {
      const entry = byArea.get(areaId);
      if (entry === undefined || entry.evidenceHash.trim().length === 0) {
        return [issue('STEP36_FINAL_REVIEW_AREA_MISSING', 'Final review area requires evidence.', areaId)];
      }
      return entry.status === 'passed'
        ? []
        : [issue('STEP36_FINAL_REVIEW_AREA_FAILED', 'Final review area did not pass.', areaId)];
    })
  ];
}

function duplicateReviewAreaIssues(reviewAreas: readonly Step36FinalReviewAreaStatus[]): Step36FinalClosureIssue[] {
  const counts = new Map<Step36FinalReviewAreaId, number>();
  reviewAreas.forEach((entry) => counts.set(entry.areaId, (counts.get(entry.areaId) ?? 0) + 1));
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([areaId]) => issue('STEP36_FINAL_REVIEW_AREA_DUPLICATE', 'Final review area cannot appear more than once.', areaId));
}

function findingIssues(findings: readonly Step36FinalFinding[]): Step36FinalClosureIssue[] {
  return findings.flatMap((finding) => [
    ...(finding.severity === 'P0'
      ? [issue('STEP36_FINAL_P0_PRESENT', 'P0 finding blocks Step36 final closure.', finding.code)]
      : []),
    ...(finding.severity === 'P1' && finding.resolved !== true
      ? [issue('STEP36_FINAL_P1_UNRESOLVED', 'Unresolved P1 finding blocks Step36 final closure.', finding.code)]
      : [])
  ]);
}

function referenceIssues(
  referenceClosure: Step36FinalReferenceSummary,
  negativeProof: Step36FinalNegativeProofSummary
): Step36FinalClosureIssue[] {
  return [
    ...(referenceClosure.status === 'passed' && referenceClosure.reportHash.trim().length > 0
      ? []
      : [issue('STEP36_FINAL_REFERENCE_FAILED', 'Reference synthesis closure must pass.', 'referenceClosure')]),
    ...(negativeProof.status === 'passed' && negativeProof.reportHash.trim().length > 0 && negativeProof.caseCount >= 14
      ? []
      : [issue('STEP36_FINAL_NEGATIVE_PROOF_FAILED', 'Negative proof matrix must pass with all cases.', 'negativeProof')])
  ];
}

function referenceChildArtifactBindingIssues(
  childArtifacts: readonly Step36FinalChildArtifact[],
  referenceClosure: Step36FinalReferenceSummary,
  negativeProof: Step36FinalNegativeProofSummary
): Step36FinalClosureIssue[] {
  const byKind = new Map(childArtifacts.map((artifact) => [artifact.kind, artifact]));
  return [
    ...(byKind.get('step36_reference_closure_report')?.payloadHash === referenceClosure.reportHash
      ? []
      : [issue('STEP36_FINAL_REFERENCE_FAILED', 'Reference closure summary hash must match the indexed child artifact payload hash.', 'step36_reference_closure_report')]),
    ...(byKind.get('step36_negative_proof_report')?.payloadHash === negativeProof.reportHash
      ? []
      : [issue('STEP36_FINAL_NEGATIVE_PROOF_FAILED', 'Negative proof summary hash must match the indexed child artifact payload hash.', 'step36_negative_proof_report')])
  ];
}

function closureRuleIssues(rules: Step36FinalClosureRules): Step36FinalClosureIssue[] {
  const issues: Step36FinalClosureIssue[] = [];
  if (!rules.step35PrerequisitePassed) {
    issues.push(issue('STEP36_FINAL_STEP35_PREREQUISITE_MISSING', 'Step35 prerequisite must pass before Step36 can close.', 'step35PrerequisitePassed'));
  }
  if (!rules.referencePassed) {
    issues.push(issue('STEP36_FINAL_REFERENCE_FAILED', 'Reference closure rule must pass.', 'referencePassed'));
  }
  if (!rules.negativeProofPassed) {
    issues.push(issue('STEP36_FINAL_NEGATIVE_PROOF_FAILED', 'Negative proof closure rule must pass.', 'negativeProofPassed'));
  }
  if (!rules.rollbackExercised) {
    issues.push(issue('STEP36_FINAL_ROLLBACK_NOT_EXERCISED', 'Rollback must be exercised before Step36 can close.', 'rollbackExercised'));
  }
  for (const [key, value] of Object.entries(rules)) {
    if (value !== true && key !== 'step35PrerequisitePassed' && key !== 'referencePassed' && key !== 'negativeProofPassed' && key !== 'rollbackExercised') {
      issues.push(issue('STEP36_FINAL_CLOSURE_RULE_FAILED', 'Step36 final closure rule failed.', key));
    }
  }
  return issues;
}

function finalArtifactIndexIssues(
  index: Step36FinalArtifactIndex,
  serverDerivedIndex: Step36FinalArtifactIndex,
  childArtifacts: readonly Step36FinalChildArtifact[]
): Step36FinalClosureIssue[] {
  const childByKind = new Map(childArtifacts.map((artifact) => [artifact.kind, artifact]));
  const entryByKind = new Map(index.entries.map((entry) => [entry.kind, entry]));
  return [
    ...(index.artifactKind === STEP36_FINAL_ARTIFACT_INDEX_KIND &&
    index.schemaVersion === STEP36_FINAL_CLOSURE_SCHEMA_VERSION &&
    index.producerServiceId === STEP36_FINAL_CLOSURE_ORCHESTRATOR &&
    index.indexHash === recomputeFinalArtifactIndexHash(index) &&
    index.indexHash === serverDerivedIndex.indexHash
      ? []
      : [issue('STEP36_FINAL_ARTIFACT_INDEX_INVALID', 'Final artifact index must be server-derived and hash-bound to child artifacts.', 'finalArtifactIndex')]),
    ...duplicateArtifactIssues(index.entries),
    ...STEP36_FINAL_REQUIRED_ARTIFACTS.flatMap((spec) => {
      const child = childByKind.get(spec.kind);
      const entry = entryByKind.get(spec.kind);
      if (child === undefined || entry === undefined) {
        return [issue('STEP36_FINAL_ARTIFACT_MISSING', 'Final closure requires child artifact and index entry.', spec.kind)];
      }
      return [
        ...(entry.contentHash.trim().length > 0 && entry.contentHash === child.payloadHash
          ? []
          : [issue('STEP36_FINAL_ARTIFACT_HASH_MISMATCH', 'Final artifact index content hash must match child artifact payload hash.', spec.kind)]),
        ...(entry.producer === spec.producer && child.producer === spec.producer
          ? []
          : [issue('STEP36_FINAL_ARTIFACT_PRODUCER_MISMATCH', 'Final artifact producer must match the expected trusted producer.', spec.kind)]),
        ...(entry.parentHashes.length > 0 &&
        child.parentHashes.length > 0 &&
        hashStableJson(entry.parentHashes) === hashStableJson(uniqueStrings(child.parentHashes))
          ? []
          : [issue('STEP36_FINAL_ARTIFACT_PARENT_MISMATCH', 'Final artifact parent hash lineage must be present and match child artifact lineage.', spec.kind)])
      ];
    })
  ];
}

function duplicateArtifactIssues(entries: readonly Step36FinalArtifactIndexEntry[]): Step36FinalClosureIssue[] {
  const counts = new Map<Step36FinalArtifactKind, number>();
  entries.forEach((entry) => counts.set(entry.kind, (counts.get(entry.kind) ?? 0) + 1));
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([kind]) => issue('STEP36_FINAL_ARTIFACT_DUPLICATE', 'Final artifact index cannot contain duplicate artifact kinds.', kind));
}

function validationReceiptIssues(receipts: readonly Step36FinalValidationReceipt[]): Step36FinalClosureIssue[] {
  const byCommand = new Map(receipts.map((receipt) => [receipt.command, receipt]));
  return [
    ...duplicateValidationReceiptIssues(receipts),
    ...STEP36_FINAL_REQUIRED_VALIDATION_COMMANDS.flatMap((command) => {
      const receipt = byCommand.get(command);
      if (receipt === undefined || receipt.receiptHash !== recomputeValidationReceiptHash(receipt)) {
        return [issue('STEP36_FINAL_VALIDATION_FAILED', 'Final validation receipt is missing or hash-mismatched.', command)];
      }
      return receipt.status === 'passed'
        ? []
        : [issue('STEP36_FINAL_VALIDATION_FAILED', 'Final validation command did not pass.', command)];
    })
  ];
}

function duplicateValidationReceiptIssues(receipts: readonly Step36FinalValidationReceipt[]): Step36FinalClosureIssue[] {
  const counts = new Map<Step36FinalRequiredValidationCommand, number>();
  receipts.forEach((receipt) => counts.set(receipt.command, (counts.get(receipt.command) ?? 0) + 1));
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([command]) => issue('STEP36_FINAL_VALIDATION_DUPLICATE', 'Final validation receipt cannot appear more than once.', command));
}

function oracleGateIssues(gate: Step36FinalOracleGate): Step36FinalClosureIssue[] {
  return gate.status === 'passed' &&
    gate.p0Count === 0 &&
    gate.unresolvedP1Count === 0 &&
    gate.promptHash.trim().length > 0 &&
    gate.reviewHash.trim().length > 0 &&
    gate.gateHash === recomputeOracleGateHash(gate)
    ? []
    : [issue('STEP36_FINAL_ORACLE_GATE_FAILED', 'Oracle final gate must pass with P0=0 and unresolved P1=0.', 'oracleFinalGate')];
}

function normalizeChildArtifacts(artifacts: readonly Step36FinalChildArtifact[]): Step36FinalChildArtifact[] {
  return artifacts
    .map((artifact) => ({
      kind: artifact.kind,
      path: artifact.path.trim(),
      payloadHash: artifact.payloadHash.trim(),
      producer: artifact.producer.trim(),
      parentHashes: uniqueStrings(artifact.parentHashes),
      trustClass: artifact.trustClass,
      createdAt: artifact.createdAt,
      ...(artifact.trustedReceiptHash === undefined ? {} : { trustedReceiptHash: artifact.trustedReceiptHash.trim() })
    }))
    .sort((left, right) => `${left.kind}:${left.path}`.localeCompare(`${right.kind}:${right.path}`));
}

function normalizeStepIds(stepIds: readonly Step36FinalStepId[]): Step36FinalStepId[] {
  const present = new Set(stepIds);
  return STEP36_REQUIRED_FINAL_STEPS.filter((stepId) => present.has(stepId));
}

function normalizeReviewAreas(reviewAreas: readonly Step36FinalReviewAreaStatus[]): Step36FinalReviewAreaStatus[] {
  return reviewAreas
    .map((area) => ({
      areaId: area.areaId,
      status: area.status,
      evidenceHash: area.evidenceHash.trim()
    }))
    .sort((left, right) => left.areaId.localeCompare(right.areaId));
}

function normalizeValidationReceipts(receipts: readonly Step36FinalValidationReceipt[]): Step36FinalValidationReceipt[] {
  return [...receipts].sort((left, right) => left.command.localeCompare(right.command));
}

function finalArtifactIndexReceiptSubject(index: Step36FinalArtifactIndex): Step36FinalArtifactIndexReceipt['subject'] {
  return {
    indexHash: index.indexHash,
    artifactKindsHash: hashStableJson(index.entries.map((entry) => entry.kind).sort())
  };
}

function recomputeFinalArtifactIndexHash(index: Step36FinalArtifactIndex): string {
  const { indexHash: _indexHash, ...payload } = index;
  return hashStableJson(payload);
}

function recomputeFinalArtifactIndexReceiptHash(receipt: Step36FinalArtifactIndexReceipt): string {
  const { receiptHash: _receiptHash, ...payload } = receipt;
  return hashStableJson(payload);
}

function recomputeValidationReceiptHash(receipt: Step36FinalValidationReceipt): string {
  const { receiptHash: _receiptHash, ...payload } = receipt;
  return hashStableJson(payload);
}

function recomputeOracleGateHash(gate: Step36FinalOracleGate): string {
  const { gateHash: _gateHash, ...payload } = gate;
  return hashStableJson(payload);
}

function sameFinalArtifactIndexTrustedRef(
  left: Step36FinalArtifactIndexReceipt['trustedArtifactRef'],
  right: Step36FinalArtifactIndexReceipt['trustedArtifactRef']
): boolean {
  return left.namespace === right.namespace &&
    left.artifactKind === right.artifactKind &&
    left.artifactId === right.artifactId;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort();
}

function issue(code: Step36FinalClosureIssue['code'], message: string, path?: string): Step36FinalClosureIssue {
  return {
    code,
    message,
    ...(path === undefined ? {} : { path })
  };
}

function compareIssues(left: Step36FinalClosureIssue, right: Step36FinalClosureIssue): number {
  return `${left.code}:${left.path ?? ''}`.localeCompare(`${right.code}:${right.path ?? ''}`);
}
