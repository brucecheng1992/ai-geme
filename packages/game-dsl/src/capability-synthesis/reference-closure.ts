import { hashStableJson } from '../gameplay-capabilities/stable-json.js';

export const STEP36_REFERENCE_CLOSURE_SCHEMA_VERSION = 'step36.reference-closure.v1';
export const REFERENCE_RICOCHET_CONTRACT_KIND = 'reference_ricochet_contract';
export const STEP36_REFERENCE_ARTIFACT_INDEX_KIND = 'step36_reference_artifact_index';
export const STEP36_REFERENCE_ARTIFACT_INDEX_RECEIPT_KIND = 'step36_reference_artifact_index_receipt';
export const STEP36_NEGATIVE_PROOF_REPORT_KIND = 'step36_negative_proof_report';
export const STEP36_REFERENCE_POSITIVE_GATE_EVIDENCE_KIND = 'step36_reference_positive_gate_evidence';
export const STEP36_REFERENCE_POSITIVE_GATE_RECEIPT_KIND = 'step36_reference_positive_gate_receipt';
export const STEP36_REFERENCE_CLOSURE_REPORT_KIND = 'step36_reference_closure_report';
export const STEP36_REFERENCE_ARTIFACT_INDEX_PRODUCER = 'maker-api.reference-closure-orchestrator';
export const STEP36_REFERENCE_ARTIFACT_INDEX_TRUSTED_NAMESPACE = 'trusted-artifact-store:step36-reference-artifact-index';
export const STEP36_REFERENCE_POSITIVE_GATE_TRUSTED_NAMESPACE = 'trusted-artifact-store:step36-reference-positive-gate';

const TRUSTED_REFERENCE_ARTIFACT_INDEX_ISSUERS = new Set([STEP36_REFERENCE_ARTIFACT_INDEX_PRODUCER]);
const TRUSTED_REFERENCE_POSITIVE_GATE_ISSUERS = new Set([STEP36_REFERENCE_ARTIFACT_INDEX_PRODUCER]);

export const REFERENCE_RICOCHET_CAPABILITY_ID = 'combat.projectile_ricochet.v1';
export const REFERENCE_RICOCHET_REQUEST = '让子弹碰到墙后最多反弹两次，每次反弹后伤害降低 25%。';

export const REFERENCE_RICOCHET_REQUIRED_REUSE_CAPABILITIES = [
  'combat.projectile.v1',
  'collision.platform.v1',
  'health.damage.v1',
  'telemetry.gameplay_events.v1'
] as const;

export const REFERENCE_RICOCHET_ALLOWED_OPTIONAL_REUSE_CAPABILITIES = ['rules.event_condition_action.v1'] as const;

export const REFERENCE_RICOCHET_REQUIRED_SCOPE = [
  'configured_surface_collision_observation',
  'deterministic_velocity_reflection',
  'per_projectile_bounce_state',
  'bounce_limit',
  'post_bounce_damage_multiplier',
  'ricochet_telemetry',
  'amendment_and_qa_descriptors'
] as const;

export const REFERENCE_RICOCHET_FORBIDDEN_SCOPE = [
  'projectile_spawning',
  'weapon_input',
  'base_projectile_lifetime',
  'enemy_health_implementation',
  'wall_geometry_creation',
  'general_physics_engine',
  'visual_asset_generation',
  'genre_specific_level_design'
] as const;

export const REFERENCE_RICOCHET_RUNTIME_SEMANTICS = [
  'ignore_disposed_projectile',
  'ignore_non_ricochet_surface',
  'read_collision_normal_from_trusted_service',
  'reflect_velocity_deterministically',
  'increment_bounce_count_once_per_resolved_contact',
  'apply_damage_multiplier_after_bounce',
  'emit_projectile_ricochet_with_before_after_snapshot',
  'dispose_when_bounce_limit_policy_requires',
  'prevent_repeated_count_same_unresolved_contact'
] as const;

export const REFERENCE_RICOCHET_AMENDMENT_OPERATIONS = [
  'SetComponentProperty:maxBounces',
  'SetComponentProperty:damageMultiplierPerBounce',
  'SetComponentProperty:minimumSpeed',
  'AddBehavior:projectile_ricochet',
  'RemoveBehavior:projectile_ricochet'
] as const;

export const REFERENCE_RICOCHET_QA_SCENARIOS = [
  'one_bounce_reflects_velocity_and_damage_75',
  'two_bounces_limit_and_damage_56_25',
  'non_ricochet_surface_no_event',
  'unrelated_semantics_unchanged',
  'teardown_removes_listener'
] as const;

export const REFERENCE_RICOCHET_MUTATIONS = [
  'skip_damage_multiplier',
  'increment_twice_per_collision',
  'reflect_wrong_axis',
  'allow_third_bounce',
  'apply_to_all_surfaces',
  'leave_listener_after_dispose'
] as const;

export const STEP36_REQUIRED_REFERENCE_ARTIFACT_KINDS = [
  'reference_ricochet_design_plan',
  'reference_ricochet_gap_report',
  'reference_ricochet_specification',
  'reference_ricochet_policy_decision',
  'reference_ricochet_verification_bundle',
  'reference_ricochet_oracle_review',
  'reference_ricochet_install_receipt',
  'reference_ricochet_step34_acceptance_report',
  'reference_ricochet_workbench_truthfulness_report',
  STEP36_NEGATIVE_PROOF_REPORT_KIND
] as const;

export const STEP36_NEGATIVE_PROOF_CASES = [
  'existing_capability_reuse',
  'semantic_duplicate',
  'online_multiplayer',
  'prompt_injection',
  'external_dependency',
  'candidate_self_certification',
  'missing_qa',
  'stale_base',
  'hash_change_after_approval',
  'sandbox_escape',
  'render_fallback',
  'old_lock_stability',
  'forged_trusted_evidence_receipt',
  'workbench_truthfulness_local_override'
] as const;

export type Step36NegativeProofCaseId = (typeof STEP36_NEGATIVE_PROOF_CASES)[number];
export type Step36ReferenceArtifactKind = (typeof STEP36_REQUIRED_REFERENCE_ARTIFACT_KINDS)[number];

export type Step36ReferenceClosureIssue = {
  code:
    | 'REFERENCE_RICOCHET_SCOPE_MISSING'
    | 'REFERENCE_RICOCHET_REUSE_MISSING'
    | 'REFERENCE_RICOCHET_SCOPE_EXCLUSION_MISSING'
    | 'REFERENCE_RICOCHET_SCOPE_FORBIDDEN'
    | 'REFERENCE_RICOCHET_DEFAULT_INVALID'
    | 'REFERENCE_RICOCHET_SEMANTIC_MISSING'
    | 'REFERENCE_RICOCHET_AMENDMENT_OPERATION_MISSING'
    | 'REFERENCE_RICOCHET_QA_MISSING'
    | 'REFERENCE_RICOCHET_MUTATION_MISSING'
    | 'NEGATIVE_PROOF_CASE_MISSING'
    | 'NEGATIVE_PROOF_CASE_DUPLICATE'
    | 'NEGATIVE_PROOF_OUTCOME_MISMATCH'
    | 'NEGATIVE_PROOF_EVIDENCE_MISSING'
    | 'NEGATIVE_PROOF_UNTRUSTED_SOURCE'
    | 'REFERENCE_ARTIFACT_INDEX_INVALID'
    | 'REFERENCE_ARTIFACT_INDEX_DUPLICATE_REF'
    | 'REFERENCE_ARTIFACT_MISSING'
    | 'REFERENCE_GATE_FAILED';
  message: string;
  path?: string;
};

export type ReferenceRicochetDefaults = {
  enabled: true;
  maxBounces: number;
  damageMultiplierPerBounce: number;
  surfaceTags: string[];
  minimumSpeed: number;
  disposeAfterMaxBounces: boolean;
};

export type ReferenceRicochetContract = {
  artifactKind: typeof REFERENCE_RICOCHET_CONTRACT_KIND;
  schemaVersion: typeof STEP36_REFERENCE_CLOSURE_SCHEMA_VERSION;
  referenceRequest: typeof REFERENCE_RICOCHET_REQUEST;
  capabilityId: typeof REFERENCE_RICOCHET_CAPABILITY_ID;
  existingReuseCapabilities: string[];
  optionalReuseCapabilities: string[];
  scopeIncluded: string[];
  scopeExcluded: string[];
  defaults: ReferenceRicochetDefaults;
  runtimeSemantics: string[];
  amendmentOperations: string[];
  qaScenarios: string[];
  mutationSet: string[];
  issues: Step36ReferenceClosureIssue[];
  contractHash: string;
};

export type Step36NegativeProofCase = {
  caseId: Step36NegativeProofCaseId;
  outcome: Step36NegativeProofExpectedOutcome;
  evidenceHash: string;
  evidenceSource: 'trusted_artifact' | 'candidate_self_report' | 'local_ui_state';
  summary: string;
};

export type Step36NegativeProofExpectedOutcome =
  | 'NO_NEW_CAPABILITY_REQUIRED'
  | 'DUPLICATE_BLOCKED'
  | 'R3_OR_R4_BLOCKED'
  | 'PROMPT_INJECTION_TREATED_AS_DATA'
  | 'EXTERNAL_DEPENDENCY_BLOCKED'
  | 'CANDIDATE_SELF_CERTIFICATION_IGNORED'
  | 'MISSING_QA_BLOCKS_APPROVAL'
  | 'STALE_BASE_BLOCKS_INSTALL'
  | 'HASH_CHANGE_INVALIDATES_APPROVAL'
  | 'SANDBOX_ESCAPE_QUARANTINED'
  | 'RENDER_FALLBACK_BLOCKS_FULL_SUCCESS'
  | 'OLD_LOCK_STABILITY_PRESERVED'
  | 'TRUSTED_PROVENANCE_REJECTED'
  | 'WORKBENCH_LOCAL_OVERRIDE_IGNORED';

export type Step36NegativeProofReport = {
  artifactKind: typeof STEP36_NEGATIVE_PROOF_REPORT_KIND;
  schemaVersion: typeof STEP36_REFERENCE_CLOSURE_SCHEMA_VERSION;
  status: 'passed' | 'failed';
  cases: Step36NegativeProofCase[];
  missingCaseIds: Step36NegativeProofCaseId[];
  issues: Step36ReferenceClosureIssue[];
  reportHash: string;
};

export type Step36ReferenceArtifactRef = {
  artifactKind: Step36ReferenceArtifactKind;
  artifactHash: string;
};

export type Step36ReferenceArtifactIndex = {
  artifactKind: typeof STEP36_REFERENCE_ARTIFACT_INDEX_KIND;
  schemaVersion: typeof STEP36_REFERENCE_CLOSURE_SCHEMA_VERSION;
  producerServiceId: typeof STEP36_REFERENCE_ARTIFACT_INDEX_PRODUCER;
  artifactRefs: Step36ReferenceArtifactRef[];
  indexHash: string;
};

export type Step36ReferenceArtifactIndexReceipt = {
  artifactKind: typeof STEP36_REFERENCE_ARTIFACT_INDEX_RECEIPT_KIND;
  schemaVersion: typeof STEP36_REFERENCE_CLOSURE_SCHEMA_VERSION;
  receiptId: string;
  trustedArtifactRef: {
    namespace: typeof STEP36_REFERENCE_ARTIFACT_INDEX_TRUSTED_NAMESPACE | string;
    artifactId: string;
    artifactKind: typeof STEP36_REFERENCE_ARTIFACT_INDEX_RECEIPT_KIND | string;
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

export type Step36ReferenceArtifactIndexReceiptResolver = {
  namespace: typeof STEP36_REFERENCE_ARTIFACT_INDEX_TRUSTED_NAMESPACE | string;
  resolveReceipt(ref: Step36ReferenceArtifactIndexReceipt['trustedArtifactRef']): Step36ReferenceArtifactIndexReceipt | undefined;
};

export type Step36ReferencePositiveGates = {
  gapProofPassed: boolean;
  riskTier: 'R0' | 'R1' | 'R2' | 'R3' | 'R4';
  externalDependencyFree: boolean;
  verificationPassed: boolean;
  mutationEvidencePassed: boolean;
  adversarialEvidencePassed: boolean;
  teardownEvidencePassed: boolean;
  oracleP0Count: number;
  oracleP1Count: number;
  humanApprovalsCurrent: boolean;
  installedExperimental: boolean;
  canaryPassed: boolean;
  rollbackTargetHash: string;
  step34ChildEvidenceGatePassed: boolean;
  step33RenderAuthoritative: boolean;
  workbenchTruthful: boolean;
  userAcceptPromotedAfterGate: boolean;
  oldExactLocksUnchanged: boolean;
  previousRequestingLockCheckpointHash: string;
};

export type Step36ReferencePositiveGateEvidence = {
  artifactKind: typeof STEP36_REFERENCE_POSITIVE_GATE_EVIDENCE_KIND;
  schemaVersion: typeof STEP36_REFERENCE_CLOSURE_SCHEMA_VERSION;
  status: 'passed' | 'failed';
  referenceContractHash: string;
  negativeProofReportHash: string;
  artifactIndexHash: string;
  positiveGates: Step36ReferencePositiveGates;
  issues: Step36ReferenceClosureIssue[];
  evidenceHash: string;
};

export type Step36ReferencePositiveGateReceipt = {
  artifactKind: typeof STEP36_REFERENCE_POSITIVE_GATE_RECEIPT_KIND;
  schemaVersion: typeof STEP36_REFERENCE_CLOSURE_SCHEMA_VERSION;
  receiptId: string;
  trustedArtifactRef: {
    namespace: typeof STEP36_REFERENCE_POSITIVE_GATE_TRUSTED_NAMESPACE | string;
    artifactId: string;
    artifactKind: typeof STEP36_REFERENCE_POSITIVE_GATE_RECEIPT_KIND | string;
  };
  subject: {
    evidenceHash: string;
    referenceContractHash: string;
    negativeProofReportHash: string;
    artifactIndexHash: string;
  };
  issuer: {
    serviceId: string;
    keyId?: string;
    issuedAt: string;
  };
  receiptHash: string;
};

export type Step36ReferencePositiveGateReceiptResolver = {
  namespace: typeof STEP36_REFERENCE_POSITIVE_GATE_TRUSTED_NAMESPACE | string;
  resolveReceipt(ref: Step36ReferencePositiveGateReceipt['trustedArtifactRef']): Step36ReferencePositiveGateReceipt | undefined;
};

export type Step36ReferenceClosureReport = {
  artifactKind: typeof STEP36_REFERENCE_CLOSURE_REPORT_KIND;
  schemaVersion: typeof STEP36_REFERENCE_CLOSURE_SCHEMA_VERSION;
  status: 'passed' | 'failed';
  referenceContractHash: string;
  negativeProofReportHash: string;
  artifactIndexHash: string;
  positiveGateEvidenceHash: string;
  artifactRefs: Step36ReferenceArtifactRef[];
  positiveGates: Step36ReferencePositiveGates;
  issues: Step36ReferenceClosureIssue[];
  reportHash: string;
};

const EXPECTED_NEGATIVE_OUTCOMES: Record<Step36NegativeProofCaseId, Step36NegativeProofExpectedOutcome> = {
  existing_capability_reuse: 'NO_NEW_CAPABILITY_REQUIRED',
  semantic_duplicate: 'DUPLICATE_BLOCKED',
  online_multiplayer: 'R3_OR_R4_BLOCKED',
  prompt_injection: 'PROMPT_INJECTION_TREATED_AS_DATA',
  external_dependency: 'EXTERNAL_DEPENDENCY_BLOCKED',
  candidate_self_certification: 'CANDIDATE_SELF_CERTIFICATION_IGNORED',
  missing_qa: 'MISSING_QA_BLOCKS_APPROVAL',
  stale_base: 'STALE_BASE_BLOCKS_INSTALL',
  hash_change_after_approval: 'HASH_CHANGE_INVALIDATES_APPROVAL',
  sandbox_escape: 'SANDBOX_ESCAPE_QUARANTINED',
  render_fallback: 'RENDER_FALLBACK_BLOCKS_FULL_SUCCESS',
  old_lock_stability: 'OLD_LOCK_STABILITY_PRESERVED',
  forged_trusted_evidence_receipt: 'TRUSTED_PROVENANCE_REJECTED',
  workbench_truthfulness_local_override: 'WORKBENCH_LOCAL_OVERRIDE_IGNORED'
};

export function buildReferenceRicochetContract(input: {
  existingReuseCapabilities?: readonly string[];
  optionalReuseCapabilities?: readonly string[];
  scopeIncluded?: readonly string[];
  scopeExcluded?: readonly string[];
  defaults?: Partial<ReferenceRicochetDefaults>;
  runtimeSemantics?: readonly string[];
  amendmentOperations?: readonly string[];
  qaScenarios?: readonly string[];
  mutationSet?: readonly string[];
} = {}): ReferenceRicochetContract {
  const defaults = normalizeDefaults(input.defaults);
  const scopeIncluded = uniqueStrings(input.scopeIncluded ?? REFERENCE_RICOCHET_REQUIRED_SCOPE);
  const scopeExcluded = uniqueStrings(input.scopeExcluded ?? REFERENCE_RICOCHET_FORBIDDEN_SCOPE);
  const runtimeSemantics = uniqueStrings(input.runtimeSemantics ?? REFERENCE_RICOCHET_RUNTIME_SEMANTICS);
  const amendmentOperations = uniqueStrings(input.amendmentOperations ?? REFERENCE_RICOCHET_AMENDMENT_OPERATIONS);
  const qaScenarios = uniqueStrings(input.qaScenarios ?? REFERENCE_RICOCHET_QA_SCENARIOS);
  const mutationSet = uniqueStrings(input.mutationSet ?? REFERENCE_RICOCHET_MUTATIONS);
  const issues = [
    ...missingValues(REFERENCE_RICOCHET_REQUIRED_REUSE_CAPABILITIES, input.existingReuseCapabilities ?? REFERENCE_RICOCHET_REQUIRED_REUSE_CAPABILITIES, 'REFERENCE_RICOCHET_REUSE_MISSING', 'Reference ricochet existing reuse capability is missing.'),
    ...missingValues(REFERENCE_RICOCHET_REQUIRED_SCOPE, scopeIncluded, 'REFERENCE_RICOCHET_SCOPE_MISSING', 'Reference ricochet scope is missing required responsibility.'),
    ...missingValues(REFERENCE_RICOCHET_FORBIDDEN_SCOPE, scopeExcluded, 'REFERENCE_RICOCHET_SCOPE_EXCLUSION_MISSING', 'Reference ricochet contract must explicitly exclude forbidden responsibility.'),
    ...REFERENCE_RICOCHET_FORBIDDEN_SCOPE
      .filter((forbidden) => scopeIncluded.includes(forbidden))
      .map((forbidden) => issue('REFERENCE_RICOCHET_SCOPE_FORBIDDEN', 'Reference ricochet scope includes forbidden responsibility.', forbidden)),
    ...defaultIssues(defaults),
    ...missingValues(REFERENCE_RICOCHET_RUNTIME_SEMANTICS, runtimeSemantics, 'REFERENCE_RICOCHET_SEMANTIC_MISSING', 'Reference ricochet runtime semantic is missing.'),
    ...missingValues(REFERENCE_RICOCHET_AMENDMENT_OPERATIONS, amendmentOperations, 'REFERENCE_RICOCHET_AMENDMENT_OPERATION_MISSING', 'Reference ricochet amendment operation is missing.'),
    ...missingValues(REFERENCE_RICOCHET_QA_SCENARIOS, qaScenarios, 'REFERENCE_RICOCHET_QA_MISSING', 'Reference ricochet QA scenario is missing.'),
    ...missingValues(REFERENCE_RICOCHET_MUTATIONS, mutationSet, 'REFERENCE_RICOCHET_MUTATION_MISSING', 'Reference ricochet mutation evidence is missing.')
  ].sort(compareIssues);
  const payload: Omit<ReferenceRicochetContract, 'contractHash'> = {
    artifactKind: REFERENCE_RICOCHET_CONTRACT_KIND,
    schemaVersion: STEP36_REFERENCE_CLOSURE_SCHEMA_VERSION,
    referenceRequest: REFERENCE_RICOCHET_REQUEST,
    capabilityId: REFERENCE_RICOCHET_CAPABILITY_ID,
    existingReuseCapabilities: uniqueStrings(input.existingReuseCapabilities ?? REFERENCE_RICOCHET_REQUIRED_REUSE_CAPABILITIES),
    optionalReuseCapabilities: uniqueStrings(input.optionalReuseCapabilities ?? REFERENCE_RICOCHET_ALLOWED_OPTIONAL_REUSE_CAPABILITIES),
    scopeIncluded,
    scopeExcluded,
    defaults,
    runtimeSemantics,
    amendmentOperations,
    qaScenarios,
    mutationSet,
    issues
  };
  return { ...payload, contractHash: hashStableJson(payload) };
}

export function buildStep36NegativeProofReport(input: {
  cases: readonly Step36NegativeProofCase[];
}): Step36NegativeProofReport {
  const cases = [...input.cases].sort((left, right) => left.caseId.localeCompare(right.caseId));
  const presentCaseIds = new Set(cases.map((entry) => entry.caseId));
  const missingCaseIds = STEP36_NEGATIVE_PROOF_CASES.filter((caseId) => !presentCaseIds.has(caseId));
  const issues = [
    ...missingCaseIds.map((caseId) => issue('NEGATIVE_PROOF_CASE_MISSING', 'Negative proof case is missing.', caseId)),
    ...duplicateCaseIssues(cases),
    ...cases.flatMap(negativeProofCaseIssues)
  ].sort(compareIssues);
  const payload: Omit<Step36NegativeProofReport, 'reportHash'> = {
    artifactKind: STEP36_NEGATIVE_PROOF_REPORT_KIND,
    schemaVersion: STEP36_REFERENCE_CLOSURE_SCHEMA_VERSION,
    status: issues.length === 0 ? 'passed' : 'failed',
    cases,
    missingCaseIds,
    issues
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

export function buildStep36ReferenceArtifactIndex(input: {
  artifactRefs: readonly Step36ReferenceArtifactRef[];
}): Step36ReferenceArtifactIndex {
  const payload: Omit<Step36ReferenceArtifactIndex, 'indexHash'> = {
    artifactKind: STEP36_REFERENCE_ARTIFACT_INDEX_KIND,
    schemaVersion: STEP36_REFERENCE_CLOSURE_SCHEMA_VERSION,
    producerServiceId: STEP36_REFERENCE_ARTIFACT_INDEX_PRODUCER,
    artifactRefs: normalizeArtifactRefs(input.artifactRefs)
  };
  return { ...payload, indexHash: hashStableJson(payload) };
}

export function buildStep36ReferenceArtifactIndexReceipt(input: {
  index: Step36ReferenceArtifactIndex;
  issuer?: Partial<Step36ReferenceArtifactIndexReceipt['issuer']>;
}): Step36ReferenceArtifactIndexReceipt {
  const subject = referenceArtifactIndexReceiptSubject(input.index);
  const receiptPayloadWithoutId: Omit<Step36ReferenceArtifactIndexReceipt, 'receiptId' | 'trustedArtifactRef' | 'receiptHash'> & {
    trustedArtifactRef: Omit<Step36ReferenceArtifactIndexReceipt['trustedArtifactRef'], 'artifactId'>;
  } = {
    artifactKind: STEP36_REFERENCE_ARTIFACT_INDEX_RECEIPT_KIND,
    schemaVersion: STEP36_REFERENCE_CLOSURE_SCHEMA_VERSION,
    trustedArtifactRef: {
      namespace: STEP36_REFERENCE_ARTIFACT_INDEX_TRUSTED_NAMESPACE,
      artifactKind: STEP36_REFERENCE_ARTIFACT_INDEX_RECEIPT_KIND
    },
    subject,
    issuer: {
      serviceId: input.issuer?.serviceId ?? STEP36_REFERENCE_ARTIFACT_INDEX_PRODUCER,
      ...(input.issuer?.keyId === undefined ? {} : { keyId: input.issuer.keyId }),
      issuedAt: input.issuer?.issuedAt ?? '2026-06-19T00:00:00.000Z'
    }
  };
  const receiptId = `reference_index_receipt_${hashStableJson(receiptPayloadWithoutId).slice('fnv1a_'.length)}`;
  const payload: Omit<Step36ReferenceArtifactIndexReceipt, 'receiptHash'> = {
    ...receiptPayloadWithoutId,
    receiptId,
    trustedArtifactRef: {
      ...receiptPayloadWithoutId.trustedArtifactRef,
      artifactId: receiptId
    }
  };
  return { ...payload, receiptHash: hashStableJson(payload) };
}

export function validateStep36ReferenceArtifactIndexReceipt(input: {
  index: Step36ReferenceArtifactIndex;
  receiptRef?: Step36ReferenceArtifactIndexReceipt['trustedArtifactRef'];
  trustedArtifactIndexStore?: Step36ReferenceArtifactIndexReceiptResolver;
}): boolean {
  const receiptRef = input.receiptRef;
  const store = input.trustedArtifactIndexStore;
  if (receiptRef === undefined || store === undefined) {
    return false;
  }
  const receipt = store.resolveReceipt(receiptRef);
  return receipt !== undefined &&
    store.namespace === STEP36_REFERENCE_ARTIFACT_INDEX_TRUSTED_NAMESPACE &&
    sameArtifactIndexTrustedRef(receiptRef, receipt.trustedArtifactRef) &&
    receipt.trustedArtifactRef.namespace === STEP36_REFERENCE_ARTIFACT_INDEX_TRUSTED_NAMESPACE &&
    receipt.trustedArtifactRef.artifactKind === STEP36_REFERENCE_ARTIFACT_INDEX_RECEIPT_KIND &&
    receipt.trustedArtifactRef.artifactId === receipt.receiptId &&
    TRUSTED_REFERENCE_ARTIFACT_INDEX_ISSUERS.has(receipt.issuer.serviceId) &&
    receipt.receiptHash === recomputeReferenceArtifactIndexReceiptHash(receipt) &&
    hashStableJson(receipt.subject) === hashStableJson(referenceArtifactIndexReceiptSubject(input.index));
}

export function buildStep36ReferencePositiveGateEvidence(input: {
  referenceContract: ReferenceRicochetContract;
  negativeProofReport: Step36NegativeProofReport;
  trustedArtifactIndex: Step36ReferenceArtifactIndex;
  positiveGates: Step36ReferencePositiveGates;
}): Step36ReferencePositiveGateEvidence {
  const issues = positiveGateIssues(input.positiveGates).sort(compareIssues);
  const payload: Omit<Step36ReferencePositiveGateEvidence, 'evidenceHash'> = {
    artifactKind: STEP36_REFERENCE_POSITIVE_GATE_EVIDENCE_KIND,
    schemaVersion: STEP36_REFERENCE_CLOSURE_SCHEMA_VERSION,
    status: issues.length === 0 ? 'passed' : 'failed',
    referenceContractHash: input.referenceContract.contractHash,
    negativeProofReportHash: input.negativeProofReport.reportHash,
    artifactIndexHash: input.trustedArtifactIndex.indexHash,
    positiveGates: input.positiveGates,
    issues
  };
  return { ...payload, evidenceHash: hashStableJson(payload) };
}

export function buildStep36ReferencePositiveGateReceipt(input: {
  evidence: Step36ReferencePositiveGateEvidence;
  issuer?: Partial<Step36ReferencePositiveGateReceipt['issuer']>;
}): Step36ReferencePositiveGateReceipt {
  const subject = referencePositiveGateReceiptSubject(input.evidence);
  const receiptPayloadWithoutId: Omit<Step36ReferencePositiveGateReceipt, 'receiptId' | 'trustedArtifactRef' | 'receiptHash'> & {
    trustedArtifactRef: Omit<Step36ReferencePositiveGateReceipt['trustedArtifactRef'], 'artifactId'>;
  } = {
    artifactKind: STEP36_REFERENCE_POSITIVE_GATE_RECEIPT_KIND,
    schemaVersion: STEP36_REFERENCE_CLOSURE_SCHEMA_VERSION,
    trustedArtifactRef: {
      namespace: STEP36_REFERENCE_POSITIVE_GATE_TRUSTED_NAMESPACE,
      artifactKind: STEP36_REFERENCE_POSITIVE_GATE_RECEIPT_KIND
    },
    subject,
    issuer: {
      serviceId: input.issuer?.serviceId ?? STEP36_REFERENCE_ARTIFACT_INDEX_PRODUCER,
      ...(input.issuer?.keyId === undefined ? {} : { keyId: input.issuer.keyId }),
      issuedAt: input.issuer?.issuedAt ?? '2026-06-19T00:00:00.000Z'
    }
  };
  const receiptId = `reference_gate_receipt_${hashStableJson(receiptPayloadWithoutId).slice('fnv1a_'.length)}`;
  const payload: Omit<Step36ReferencePositiveGateReceipt, 'receiptHash'> = {
    ...receiptPayloadWithoutId,
    receiptId,
    trustedArtifactRef: {
      ...receiptPayloadWithoutId.trustedArtifactRef,
      artifactId: receiptId
    }
  };
  return { ...payload, receiptHash: hashStableJson(payload) };
}

export function validateStep36ReferencePositiveGateReceipt(input: {
  evidence: Step36ReferencePositiveGateEvidence;
  receiptRef?: Step36ReferencePositiveGateReceipt['trustedArtifactRef'];
  trustedPositiveGateStore?: Step36ReferencePositiveGateReceiptResolver;
}): boolean {
  const receiptRef = input.receiptRef;
  const store = input.trustedPositiveGateStore;
  if (receiptRef === undefined || store === undefined) {
    return false;
  }
  const receipt = store.resolveReceipt(receiptRef);
  return receipt !== undefined &&
    store.namespace === STEP36_REFERENCE_POSITIVE_GATE_TRUSTED_NAMESPACE &&
    samePositiveGateTrustedRef(receiptRef, receipt.trustedArtifactRef) &&
    receipt.trustedArtifactRef.namespace === STEP36_REFERENCE_POSITIVE_GATE_TRUSTED_NAMESPACE &&
    receipt.trustedArtifactRef.artifactKind === STEP36_REFERENCE_POSITIVE_GATE_RECEIPT_KIND &&
    receipt.trustedArtifactRef.artifactId === receipt.receiptId &&
    TRUSTED_REFERENCE_POSITIVE_GATE_ISSUERS.has(receipt.issuer.serviceId) &&
    receipt.receiptHash === recomputeReferencePositiveGateReceiptHash(receipt) &&
    hashStableJson(receipt.subject) === hashStableJson(referencePositiveGateReceiptSubject(input.evidence));
}

export function buildStep36ReferenceClosureReport(input: {
  referenceContract: ReferenceRicochetContract;
  negativeProofReport: Step36NegativeProofReport;
  trustedArtifactIndex: Step36ReferenceArtifactIndex;
  artifactIndexReceiptRef?: Step36ReferenceArtifactIndexReceipt['trustedArtifactRef'];
  trustedArtifactIndexStore?: Step36ReferenceArtifactIndexReceiptResolver;
  positiveGateEvidence: Step36ReferencePositiveGateEvidence;
  positiveGateReceiptRef?: Step36ReferencePositiveGateReceipt['trustedArtifactRef'];
  trustedPositiveGateStore?: Step36ReferencePositiveGateReceiptResolver;
}): Step36ReferenceClosureReport {
  const artifactRefs = normalizeArtifactRefs(input.trustedArtifactIndex.artifactRefs);
  const issues = [
    ...(input.referenceContract.issues.length === 0 && input.referenceContract.contractHash === recomputeReferenceRicochetContractHash(input.referenceContract)
      ? []
      : [issue('REFERENCE_GATE_FAILED', 'Reference ricochet contract is not valid or hash-mismatched.', 'referenceContract')]),
    ...(input.negativeProofReport.status === 'passed' && input.negativeProofReport.reportHash === recomputeNegativeProofReportHash(input.negativeProofReport)
      ? []
      : [issue('REFERENCE_GATE_FAILED', 'Negative proof report is missing, failed or hash-mismatched.', 'negativeProofReport')]),
    ...referenceArtifactIndexIssues(input.trustedArtifactIndex),
    ...(validateStep36ReferenceArtifactIndexReceipt({
      index: input.trustedArtifactIndex,
      receiptRef: input.artifactIndexReceiptRef,
      trustedArtifactIndexStore: input.trustedArtifactIndexStore
    })
      ? []
      : [issue('REFERENCE_ARTIFACT_INDEX_INVALID', 'Reference artifact index must resolve through trusted receipt store.', 'trustedArtifactIndexReceipt')]),
    ...positiveGateEvidenceIssues(input),
    ...referenceArtifactIssues(artifactRefs),
    ...negativeProofArtifactBindingIssues(artifactRefs, input.negativeProofReport),
  ].sort(compareIssues);
  const payload: Omit<Step36ReferenceClosureReport, 'reportHash'> = {
    artifactKind: STEP36_REFERENCE_CLOSURE_REPORT_KIND,
    schemaVersion: STEP36_REFERENCE_CLOSURE_SCHEMA_VERSION,
    status: issues.length === 0 ? 'passed' : 'failed',
    referenceContractHash: input.referenceContract.contractHash,
    negativeProofReportHash: input.negativeProofReport.reportHash,
    artifactIndexHash: input.trustedArtifactIndex.indexHash,
    positiveGateEvidenceHash: input.positiveGateEvidence.evidenceHash,
    artifactRefs,
    positiveGates: input.positiveGateEvidence.positiveGates,
    issues
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

export function completeStep36NegativeProofCases(
  overrides: Partial<Record<Step36NegativeProofCaseId, Partial<Step36NegativeProofCase>>> = {}
): Step36NegativeProofCase[] {
  return STEP36_NEGATIVE_PROOF_CASES.map((caseId) => ({
    caseId,
    outcome: EXPECTED_NEGATIVE_OUTCOMES[caseId],
    evidenceHash: `fnv1a_${caseId}`,
    evidenceSource: 'trusted_artifact',
    summary: `${caseId} evidence`,
    ...overrides[caseId]
  }));
}

function normalizeDefaults(defaults: Partial<ReferenceRicochetDefaults> | undefined): ReferenceRicochetDefaults {
  return {
    enabled: true,
    maxBounces: defaults?.maxBounces ?? 2,
    damageMultiplierPerBounce: defaults?.damageMultiplierPerBounce ?? 0.75,
    surfaceTags: uniqueStrings(defaults?.surfaceTags ?? ['ricochet_surface']),
    minimumSpeed: defaults?.minimumSpeed ?? 60,
    disposeAfterMaxBounces: defaults?.disposeAfterMaxBounces ?? true
  };
}

function defaultIssues(defaults: ReferenceRicochetDefaults): Step36ReferenceClosureIssue[] {
  return [
    ...(Number.isInteger(defaults.maxBounces) && defaults.maxBounces >= 1 && defaults.maxBounces <= 8
      ? []
      : [issue('REFERENCE_RICOCHET_DEFAULT_INVALID', 'maxBounces must be an integer from 1 to 8.', 'defaults.maxBounces')]),
    ...(Number.isFinite(defaults.damageMultiplierPerBounce) && defaults.damageMultiplierPerBounce > 0 && defaults.damageMultiplierPerBounce <= 1
      ? []
      : [issue('REFERENCE_RICOCHET_DEFAULT_INVALID', 'damageMultiplierPerBounce must be > 0 and <= 1.', 'defaults.damageMultiplierPerBounce')]),
    ...(defaults.surfaceTags.length > 0
      ? []
      : [issue('REFERENCE_RICOCHET_DEFAULT_INVALID', 'surfaceTags must contain at least one stable tag.', 'defaults.surfaceTags')]),
    ...(Number.isFinite(defaults.minimumSpeed) && defaults.minimumSpeed >= 0
      ? []
      : [issue('REFERENCE_RICOCHET_DEFAULT_INVALID', 'minimumSpeed must be finite and >= 0.', 'defaults.minimumSpeed')])
  ];
}

function negativeProofCaseIssues(entry: Step36NegativeProofCase): Step36ReferenceClosureIssue[] {
  return [
    ...(entry.outcome === EXPECTED_NEGATIVE_OUTCOMES[entry.caseId]
      ? []
      : [issue('NEGATIVE_PROOF_OUTCOME_MISMATCH', 'Negative proof outcome does not match expected result.', entry.caseId)]),
    ...(entry.evidenceHash.trim().length > 0
      ? []
      : [issue('NEGATIVE_PROOF_EVIDENCE_MISSING', 'Negative proof case requires evidence hash.', entry.caseId)]),
    ...(entry.evidenceSource === 'trusted_artifact'
      ? []
      : [issue('NEGATIVE_PROOF_UNTRUSTED_SOURCE', 'Negative proof cannot rely on local UI state or candidate self-reporting.', entry.caseId)])
  ];
}

function duplicateCaseIssues(cases: readonly Step36NegativeProofCase[]): Step36ReferenceClosureIssue[] {
  const counts = new Map<Step36NegativeProofCaseId, number>();
  cases.forEach((entry) => counts.set(entry.caseId, (counts.get(entry.caseId) ?? 0) + 1));
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([caseId]) => issue('NEGATIVE_PROOF_CASE_DUPLICATE', 'Negative proof matrix must contain exactly one entry per case.', caseId));
}

function referenceArtifactIndexIssues(index: Step36ReferenceArtifactIndex): Step36ReferenceClosureIssue[] {
  return [
    ...(index.artifactKind === STEP36_REFERENCE_ARTIFACT_INDEX_KIND &&
    index.schemaVersion === STEP36_REFERENCE_CLOSURE_SCHEMA_VERSION &&
    index.producerServiceId === STEP36_REFERENCE_ARTIFACT_INDEX_PRODUCER &&
    index.indexHash === recomputeReferenceArtifactIndexHash(index)
      ? []
      : [issue('REFERENCE_ARTIFACT_INDEX_INVALID', 'Reference artifact index must be server-derived and hash-bound.', 'trustedArtifactIndex')]),
    ...duplicateArtifactRefIssues(index.artifactRefs)
  ];
}

function duplicateArtifactRefIssues(refs: readonly Step36ReferenceArtifactRef[]): Step36ReferenceClosureIssue[] {
  const counts = new Map<Step36ReferenceArtifactKind, number>();
  refs.forEach((ref) => counts.set(ref.artifactKind, (counts.get(ref.artifactKind) ?? 0) + 1));
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([artifactKind]) => issue('REFERENCE_ARTIFACT_INDEX_DUPLICATE_REF', 'Reference artifact index must contain exactly one hash per artifact kind.', artifactKind));
}

function referenceArtifactIssues(refs: readonly Step36ReferenceArtifactRef[]): Step36ReferenceClosureIssue[] {
  const byKind = new Map(refs.map((ref) => [ref.artifactKind, ref.artifactHash]));
  return STEP36_REQUIRED_REFERENCE_ARTIFACT_KINDS.flatMap((artifactKind) => {
    const artifactHash = byKind.get(artifactKind);
    return artifactHash === undefined || artifactHash.trim().length === 0
      ? [issue('REFERENCE_ARTIFACT_MISSING', 'Step36 reference closure is missing required artifact hash.', artifactKind)]
      : [];
  });
}

function negativeProofArtifactBindingIssues(
  refs: readonly Step36ReferenceArtifactRef[],
  negativeProofReport: Step36NegativeProofReport
): Step36ReferenceClosureIssue[] {
  const negativeProofRef = refs.find((ref) => ref.artifactKind === STEP36_NEGATIVE_PROOF_REPORT_KIND);
  return negativeProofRef?.artifactHash === negativeProofReport.reportHash
    ? []
    : [issue('REFERENCE_ARTIFACT_MISSING', 'Negative proof artifact ref must bind the actual negative proof report hash.', STEP36_NEGATIVE_PROOF_REPORT_KIND)];
}

function positiveGateIssues(gates: Step36ReferencePositiveGates): Step36ReferenceClosureIssue[] {
  const failed = [
    ...(gates.gapProofPassed ? [] : ['gap_proof_not_passed']),
    ...(gates.riskTier === 'R2' ? [] : ['risk_not_r2']),
    ...(gates.externalDependencyFree ? [] : ['external_dependency_present']),
    ...(gates.verificationPassed ? [] : ['verification_not_passed']),
    ...(gates.mutationEvidencePassed ? [] : ['mutation_evidence_not_passed']),
    ...(gates.adversarialEvidencePassed ? [] : ['adversarial_evidence_not_passed']),
    ...(gates.teardownEvidencePassed ? [] : ['teardown_evidence_not_passed']),
    ...(gates.oracleP0Count === 0 ? [] : ['oracle_p0_present']),
    ...(gates.oracleP1Count === 0 ? [] : ['oracle_p1_present']),
    ...(gates.humanApprovalsCurrent ? [] : ['human_approvals_not_current']),
    ...(gates.installedExperimental ? [] : ['not_installed_experimental']),
    ...(gates.canaryPassed ? [] : ['canary_not_passed']),
    ...(gates.rollbackTargetHash.trim().length > 0 ? [] : ['rollback_target_missing']),
    ...(gates.step34ChildEvidenceGatePassed ? [] : ['step34_child_evidence_gate_not_passed']),
    ...(gates.step33RenderAuthoritative ? [] : ['step33_render_not_authoritative']),
    ...(gates.workbenchTruthful ? [] : ['workbench_not_truthful']),
    ...(gates.userAcceptPromotedAfterGate ? [] : ['user_accept_not_gate_bound']),
    ...(gates.oldExactLocksUnchanged ? [] : ['old_exact_locks_changed']),
    ...(gates.previousRequestingLockCheckpointHash.trim().length > 0 ? [] : ['previous_requesting_lock_checkpoint_missing'])
  ];
  return failed.map((path) => issue('REFERENCE_GATE_FAILED', 'Step36 reference positive closure gate failed.', path));
}

function positiveGateEvidenceIssues(input: {
  referenceContract: ReferenceRicochetContract;
  negativeProofReport: Step36NegativeProofReport;
  trustedArtifactIndex: Step36ReferenceArtifactIndex;
  positiveGateEvidence: Step36ReferencePositiveGateEvidence;
  positiveGateReceiptRef?: Step36ReferencePositiveGateReceipt['trustedArtifactRef'];
  trustedPositiveGateStore?: Step36ReferencePositiveGateReceiptResolver;
}): Step36ReferenceClosureIssue[] {
  const evidence = input.positiveGateEvidence;
  return [
    ...(evidence.artifactKind === STEP36_REFERENCE_POSITIVE_GATE_EVIDENCE_KIND &&
    evidence.schemaVersion === STEP36_REFERENCE_CLOSURE_SCHEMA_VERSION &&
    evidence.status === 'passed' &&
    evidence.evidenceHash === recomputeReferencePositiveGateEvidenceHash(evidence)
      ? []
      : [issue('REFERENCE_GATE_FAILED', 'Positive gate evidence must be trusted, passed and hash-bound.', 'positiveGateEvidence')]),
    ...evidence.issues,
    ...(evidence.referenceContractHash === input.referenceContract.contractHash
      ? []
      : [issue('REFERENCE_GATE_FAILED', 'Positive gate evidence must bind the reference contract hash.', 'positiveGateEvidence.referenceContractHash')]),
    ...(evidence.negativeProofReportHash === input.negativeProofReport.reportHash
      ? []
      : [issue('REFERENCE_GATE_FAILED', 'Positive gate evidence must bind the negative proof report hash.', 'positiveGateEvidence.negativeProofReportHash')]),
    ...(evidence.artifactIndexHash === input.trustedArtifactIndex.indexHash
      ? []
      : [issue('REFERENCE_GATE_FAILED', 'Positive gate evidence must bind the trusted artifact index hash.', 'positiveGateEvidence.artifactIndexHash')]),
    ...(validateStep36ReferencePositiveGateReceipt({
      evidence,
      receiptRef: input.positiveGateReceiptRef,
      trustedPositiveGateStore: input.trustedPositiveGateStore
    })
      ? []
      : [issue('REFERENCE_GATE_FAILED', 'Positive gate evidence must resolve through trusted receipt store.', 'positiveGateEvidenceReceipt')])
  ];
}

function missingValues(
  required: readonly string[],
  actual: readonly string[],
  code: Step36ReferenceClosureIssue['code'],
  message: string
): Step36ReferenceClosureIssue[] {
  return required
    .filter((value) => !actual.includes(value))
    .map((value) => issue(code, message, value));
}

function normalizeArtifactRefs(refs: readonly Step36ReferenceArtifactRef[]): Step36ReferenceArtifactRef[] {
  return refs
    .map((ref) => ({ artifactKind: ref.artifactKind, artifactHash: ref.artifactHash.trim() }))
    .sort((left, right) => left.artifactKind.localeCompare(right.artifactKind));
}

function recomputeReferenceRicochetContractHash(contract: ReferenceRicochetContract): string {
  const { contractHash: _contractHash, ...payload } = contract;
  return hashStableJson(payload);
}

function recomputeReferenceArtifactIndexHash(index: Step36ReferenceArtifactIndex): string {
  const { indexHash: _indexHash, ...payload } = index;
  return hashStableJson(payload);
}

function recomputeNegativeProofReportHash(report: Step36NegativeProofReport): string {
  const { reportHash: _reportHash, ...payload } = report;
  return hashStableJson(payload);
}

function recomputeReferencePositiveGateEvidenceHash(evidence: Step36ReferencePositiveGateEvidence): string {
  const { evidenceHash: _evidenceHash, ...payload } = evidence;
  return hashStableJson(payload);
}

function recomputeReferenceArtifactIndexReceiptHash(receipt: Step36ReferenceArtifactIndexReceipt): string {
  const { receiptHash: _receiptHash, ...payload } = receipt;
  return hashStableJson(payload);
}

function recomputeReferencePositiveGateReceiptHash(receipt: Step36ReferencePositiveGateReceipt): string {
  const { receiptHash: _receiptHash, ...payload } = receipt;
  return hashStableJson(payload);
}

function referenceArtifactIndexReceiptSubject(index: Step36ReferenceArtifactIndex): Step36ReferenceArtifactIndexReceipt['subject'] {
  return {
    indexHash: index.indexHash,
    artifactKindsHash: hashStableJson(index.artifactRefs.map((ref) => ref.artifactKind).sort())
  };
}

function referencePositiveGateReceiptSubject(evidence: Step36ReferencePositiveGateEvidence): Step36ReferencePositiveGateReceipt['subject'] {
  return {
    evidenceHash: evidence.evidenceHash,
    referenceContractHash: evidence.referenceContractHash,
    negativeProofReportHash: evidence.negativeProofReportHash,
    artifactIndexHash: evidence.artifactIndexHash
  };
}

function sameArtifactIndexTrustedRef(
  left: Step36ReferenceArtifactIndexReceipt['trustedArtifactRef'],
  right: Step36ReferenceArtifactIndexReceipt['trustedArtifactRef']
): boolean {
  return left.namespace === right.namespace &&
    left.artifactKind === right.artifactKind &&
    left.artifactId === right.artifactId;
}

function samePositiveGateTrustedRef(
  left: Step36ReferencePositiveGateReceipt['trustedArtifactRef'],
  right: Step36ReferencePositiveGateReceipt['trustedArtifactRef']
): boolean {
  return left.namespace === right.namespace &&
    left.artifactKind === right.artifactKind &&
    left.artifactId === right.artifactId;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort();
}

function issue(code: Step36ReferenceClosureIssue['code'], message: string, path?: string): Step36ReferenceClosureIssue {
  return {
    code,
    message,
    ...(path === undefined ? {} : { path })
  };
}

function compareIssues(left: Step36ReferenceClosureIssue, right: Step36ReferenceClosureIssue): number {
  return `${left.code}:${left.path ?? ''}`.localeCompare(`${right.code}:${right.path ?? ''}`);
}
