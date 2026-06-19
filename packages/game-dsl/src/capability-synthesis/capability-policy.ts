import { hashStableJson } from '../gameplay-capabilities/stable-json.js';
import {
  CAPABILITY_SPECIFICATION_VALIDATION_ATTESTATION_KIND,
  CAPABILITY_SPECIFICATION_VALIDATION_ATTESTATION_SCHEMA_VERSION,
  CAPABILITY_SPECIFICATION_VALIDATION_REPORT_KIND,
  CAPABILITY_SPECIFICATION_VALIDATION_REPORT_SCHEMA_VERSION,
  CAPABILITY_SPECIFICATION_VALIDATION_CANONICALIZATION_VERSION,
  CAPABILITY_SPECIFICATION_VALIDATION_REQUIRED_CHECKS,
  CAPABILITY_SPECIFICATION_VALIDATION_RULESET_HASH,
  CAPABILITY_SPECIFICATION_VALIDATION_TRUSTED_NAMESPACE,
  CAPABILITY_SPECIFICATION_VALIDATOR_ID,
  CAPABILITY_SPECIFICATION_VALIDATOR_VERSION,
  type CapabilitySpecificationCandidate,
  type CapabilitySpecificationValidationReport,
  type SpecificationValidationAttestation
} from './capability-specification.js';

export const CAPABILITY_SYNTHESIS_REUSE_PLAN_KIND = 'capability_synthesis_reuse_plan';
export const CAPABILITY_SYNTHESIS_REUSE_PLAN_SCHEMA_VERSION = 'step36.capability-synthesis-reuse-plan.v1';
export const CAPABILITY_SYNTHESIS_POLICY_REPORT_KIND = 'capability_synthesis_policy_report';
export const CAPABILITY_SYNTHESIS_POLICY_REPORT_SCHEMA_VERSION = 'step36.capability-synthesis-policy-report.v1';
export const CAPABILITY_SYNTHESIS_POLICY_DECISION_RECEIPT_KIND = 'capability_synthesis_policy_decision_receipt';
export const CAPABILITY_SYNTHESIS_POLICY_DECISION_RECEIPT_SCHEMA_VERSION = 'step36.capability-synthesis-policy-decision-receipt.v1';
export const CAPABILITY_SYNTHESIS_POLICY_DECISION_TRUSTED_NAMESPACE = 'trusted-artifact-store:capability-synthesis-policy-decisions';
export const CAPABILITY_SYNTHESIS_POLICY_VERSION = 'step36.capability-synthesis-policy.v1';

export const CAPABILITY_SYNTHESIS_RISK_TIERS = [
  'R0_COMPOSITION_ONLY',
  'R1_DECLARATIVE_EXTENSION',
  'R2_BOUNDED_RUNTIME_MODULE',
  'R3_MANUAL_ARCHITECTURE_REVIEW',
  'R4_PROHIBITED'
] as const;

export const CAPABILITY_SYNTHESIS_MODES = [
  'COMPOSITION_ONLY',
  'CONFIGURATION_ONLY',
  'DECLARATIVE_BEHAVIOR_GRAPH',
  'DECLARATIVE_STATE_MACHINE',
  'BOUNDED_TYPED_RUNTIME_MODULE',
  'MANUAL_SPEC_ONLY',
  'PROHIBITED'
] as const;

export const CAPABILITY_SYNTHESIS_R3_TRIGGER_CODES = [
  'DIRECT_ENGINE_API_ACCESS',
  'NEW_PHYSICS_MODEL',
  'KERNEL_LIFECYCLE_CHANGE',
  'PERSISTENCE_FORMAT_CHANGE',
  'SCHEMA_MAJOR_CHANGE',
  'UNBOUNDED_WORLD_SIMULATION',
  'LARGE_MULTI_PACKAGE_REFACTOR',
  'CAPABILITY_CANNOT_BE_ISOLATED',
  'SUBJECTIVE_ACCEPTANCE',
  'UNDECLARED_DEPENDENCY_CHANGE'
] as const;

export const CAPABILITY_SYNTHESIS_R4_TRIGGER_CODES = [
  'NETWORK_ACCESS',
  'FILESYSTEM_ACCESS',
  'SECRETS_ACCESS',
  'EXTERNAL_DEPENDENCY',
  'DYNAMIC_CODE_EXECUTION',
  'NATIVE_OR_WASM_BINARY',
  'CHILD_PROCESS',
  'RUNTIME_PACKAGE_INSTALL',
  'CROSS_ORIGIN_ACCESS',
  'CREDENTIAL_STORAGE',
  'PAYMENT_OR_AUTHENTICATION',
  'SELF_UPDATE',
  'OBFUSCATED_SOURCE',
  'LICENSE_UNKNOWN_CODE'
] as const;

export type CapabilitySynthesisRiskTier = (typeof CAPABILITY_SYNTHESIS_RISK_TIERS)[number];
export type CapabilitySynthesisMode = (typeof CAPABILITY_SYNTHESIS_MODES)[number];
export type CapabilitySynthesisR3TriggerCode = (typeof CAPABILITY_SYNTHESIS_R3_TRIGGER_CODES)[number];
export type CapabilitySynthesisR4TriggerCode = (typeof CAPABILITY_SYNTHESIS_R4_TRIGGER_CODES)[number];
export type CapabilitySynthesisPolicyEvaluationStatus = 'EVALUATED' | 'BLOCKED_PRECONDITION';

export type CapabilitySynthesisAuditList<T extends string> = {
  checked: boolean;
  values: T[];
};

export type CapabilitySynthesisBooleanAudit = {
  checked: boolean;
  value: boolean;
};

export type CapabilitySynthesisPolicyAuditEvidence = {
  externalDependencies: CapabilitySynthesisAuditList<string>;
  candidateFilePolicyMutable: CapabilitySynthesisBooleanAudit;
  r3Triggers: CapabilitySynthesisAuditList<CapabilitySynthesisR3TriggerCode>;
  globalKernelChanges: CapabilitySynthesisBooleanAudit;
};

export type CapabilitySynthesisReusePlan = {
  artifactKind: typeof CAPABILITY_SYNTHESIS_REUSE_PLAN_KIND;
  schemaVersion: typeof CAPABILITY_SYNTHESIS_REUSE_PLAN_SCHEMA_VERSION;
  requestId: string;
  sourceGapReportHash: string;
  registrySnapshotHash: string;
  activeCapabilityLockHash?: string;
  mode: Extract<CapabilitySynthesisMode, 'COMPOSITION_ONLY' | 'CONFIGURATION_ONLY'>;
  reusedCapabilityIds: string[];
  noNewPackage: true;
  noCandidateWorkspace: true;
  planHash: string;
};

export type CapabilitySynthesisPolicyDecision = {
  artifactKind: typeof CAPABILITY_SYNTHESIS_POLICY_REPORT_KIND;
  schemaVersion: typeof CAPABILITY_SYNTHESIS_POLICY_REPORT_SCHEMA_VERSION;
  policyVersion: string;
  policyEvaluationStatus: CapabilitySynthesisPolicyEvaluationStatus;
  requestId?: string;
  sourceGapReportHash?: string;
  registrySnapshotHash?: string;
  activeCapabilityLockHash?: string;
  specificationHash?: string;
  specificationValidationAttestationHash?: string;
  policyInputHash?: string;
  decisionContextHash?: string;
  reusePlanHash?: string;
  riskTier?: CapabilitySynthesisRiskTier;
  mode?: CapabilitySynthesisMode;
  allowed: boolean;
  implementationSandboxAllowed: boolean;
  requiredApprovals: string[];
  requiredGates: string[];
  blockingRules: string[];
  rationale: string[];
  repairableByModel?: boolean;
  advisoryModelSuggestion?: {
    riskTier?: CapabilitySynthesisRiskTier;
    mode?: CapabilitySynthesisMode;
  };
  decisionHash: string;
};

export type CapabilitySynthesisPolicyDecisionReceipt = {
  artifactKind: typeof CAPABILITY_SYNTHESIS_POLICY_DECISION_RECEIPT_KIND;
  schemaVersion: typeof CAPABILITY_SYNTHESIS_POLICY_DECISION_RECEIPT_SCHEMA_VERSION;
  receiptId: string;
  trustedArtifactRef: {
    namespace: typeof CAPABILITY_SYNTHESIS_POLICY_DECISION_TRUSTED_NAMESPACE | string;
    artifactId: string;
    artifactKind: typeof CAPABILITY_SYNTHESIS_POLICY_DECISION_RECEIPT_KIND | string;
  };
  subject: {
    requestId?: string;
    policyVersion: string;
    policyDecisionHash: string;
    decisionContextHash: string;
    policyInputHash?: string;
    specificationHash?: string;
    registrySnapshotHash?: string;
    activeCapabilityLockHash?: string;
  };
  issuer: {
    serviceId: string;
    keyId?: string;
    issuedAt: string;
  };
  receiptHash: string;
};

export type CapabilitySynthesisPolicyDecisionReceiptResolver = {
  namespace: typeof CAPABILITY_SYNTHESIS_POLICY_DECISION_TRUSTED_NAMESPACE | string;
  resolveReceipt(ref: CapabilitySynthesisPolicyDecisionReceipt['trustedArtifactRef']): CapabilitySynthesisPolicyDecisionReceipt | undefined;
};

export type SpecificationValidationAttestationStoreResolver = {
  namespace: typeof CAPABILITY_SPECIFICATION_VALIDATION_TRUSTED_NAMESPACE | string;
  resolveAttestation(ref: SpecificationValidationAttestation['trustedArtifactRef']): SpecificationValidationAttestation | undefined;
};

type CapabilitySynthesisCommonPolicyInput = {
  policyVersion?: string;
  advisoryModelSuggestion?: {
    riskTier?: CapabilitySynthesisRiskTier;
    mode?: CapabilitySynthesisMode;
  };
  auditEvidence?: CapabilitySynthesisPolicyAuditEvidence;
  approvedRuntimeServices?: readonly string[];
  existingInterpreterSupportsOperations?: boolean;
  boundedEventRate?: boolean;
  boundedState?: boolean;
  boundedSourceFileSet?: boolean;
  boundedEntityCreation?: boolean;
  deterministicClockAndRng?: boolean;
  teardownVerifiable?: boolean;
  behaviorObservable?: boolean;
};

export type CapabilitySynthesisSpecificationPolicyInput = CapabilitySynthesisCommonPolicyInput & {
  source?: 'validated_specification';
  specificationReport: CapabilitySpecificationValidationReport;
  specificationValidationAttestationRef?: SpecificationValidationAttestation['trustedArtifactRef'];
  trustedValidationAttestationStore?: SpecificationValidationAttestationStoreResolver;
  attemptId?: string;
};

export type CapabilitySynthesisReusePolicyInput = CapabilitySynthesisCommonPolicyInput & {
  source: 'validated_reuse_plan';
  reusePlan: CapabilitySynthesisReusePlan;
};

export type CapabilitySynthesisPolicyInput = CapabilitySynthesisSpecificationPolicyInput | CapabilitySynthesisReusePolicyInput;

export function buildCapabilitySynthesisReusePlan(
  input: Omit<CapabilitySynthesisReusePlan, 'artifactKind' | 'schemaVersion' | 'planHash'>
): CapabilitySynthesisReusePlan {
  const payload: Omit<CapabilitySynthesisReusePlan, 'planHash'> = {
    artifactKind: CAPABILITY_SYNTHESIS_REUSE_PLAN_KIND,
    schemaVersion: CAPABILITY_SYNTHESIS_REUSE_PLAN_SCHEMA_VERSION,
    requestId: input.requestId.trim(),
    sourceGapReportHash: input.sourceGapReportHash.trim(),
    registrySnapshotHash: input.registrySnapshotHash.trim(),
    ...(input.activeCapabilityLockHash === undefined ? {} : { activeCapabilityLockHash: input.activeCapabilityLockHash.trim() }),
    mode: input.mode,
    reusedCapabilityIds: uniqueStrings(input.reusedCapabilityIds),
    noNewPackage: true,
    noCandidateWorkspace: true
  };
  return { ...payload, planHash: hashStableJson(payload) };
}

export function decideCapabilitySynthesisPolicy(input: CapabilitySynthesisPolicyInput): CapabilitySynthesisPolicyDecision {
  const policyVersion = input.policyVersion ?? CAPABILITY_SYNTHESIS_POLICY_VERSION;
  if (input.source === 'validated_reuse_plan') {
    return decideReusePolicy(input, policyVersion);
  }
  return decideSpecificationPolicy(input, policyVersion);
}

export function buildCapabilitySynthesisPolicyDecisionReceipt(input: {
  decision: CapabilitySynthesisPolicyDecision;
  issuer?: Partial<CapabilitySynthesisPolicyDecisionReceipt['issuer']>;
}): CapabilitySynthesisPolicyDecisionReceipt {
  const receiptPayloadWithoutId: Omit<CapabilitySynthesisPolicyDecisionReceipt, 'receiptId' | 'trustedArtifactRef' | 'receiptHash'> & {
    trustedArtifactRef: Omit<CapabilitySynthesisPolicyDecisionReceipt['trustedArtifactRef'], 'artifactId'>;
  } = {
    artifactKind: CAPABILITY_SYNTHESIS_POLICY_DECISION_RECEIPT_KIND,
    schemaVersion: CAPABILITY_SYNTHESIS_POLICY_DECISION_RECEIPT_SCHEMA_VERSION,
    trustedArtifactRef: {
      namespace: CAPABILITY_SYNTHESIS_POLICY_DECISION_TRUSTED_NAMESPACE,
      artifactKind: CAPABILITY_SYNTHESIS_POLICY_DECISION_RECEIPT_KIND
    },
    subject: {
      ...(input.decision.requestId === undefined ? {} : { requestId: input.decision.requestId }),
      policyVersion: input.decision.policyVersion,
      policyDecisionHash: input.decision.decisionHash,
      decisionContextHash: input.decision.decisionContextHash ?? '',
      ...(input.decision.policyInputHash === undefined ? {} : { policyInputHash: input.decision.policyInputHash }),
      ...(input.decision.specificationHash === undefined ? {} : { specificationHash: input.decision.specificationHash }),
      ...(input.decision.registrySnapshotHash === undefined ? {} : { registrySnapshotHash: input.decision.registrySnapshotHash }),
      ...(input.decision.activeCapabilityLockHash === undefined ? {} : { activeCapabilityLockHash: input.decision.activeCapabilityLockHash })
    },
    issuer: {
      serviceId: input.issuer?.serviceId ?? 'maker-api.capability-synthesis-policy-engine',
      ...(input.issuer?.keyId === undefined ? {} : { keyId: input.issuer.keyId }),
      issuedAt: input.issuer?.issuedAt ?? '2026-06-19T00:00:00.000Z'
    }
  };
  const receiptId = `policy_receipt_${hashStableJson(receiptPayloadWithoutId).slice('fnv1a_'.length)}`;
  const payload: Omit<CapabilitySynthesisPolicyDecisionReceipt, 'receiptHash'> = {
    ...receiptPayloadWithoutId,
    receiptId,
    trustedArtifactRef: {
      ...receiptPayloadWithoutId.trustedArtifactRef,
      artifactId: receiptId
    }
  };
  return { ...payload, receiptHash: hashStableJson(payload) };
}

export function validateCapabilitySynthesisPolicyDecisionReceipt(input: {
  decision: CapabilitySynthesisPolicyDecision;
  receipt: CapabilitySynthesisPolicyDecisionReceipt | undefined;
  receiptRef: CapabilitySynthesisPolicyDecisionReceipt['trustedArtifactRef'] | undefined;
  trustedPolicyDecisionStore: CapabilitySynthesisPolicyDecisionReceiptResolver | undefined;
}): boolean {
  const { decision, receipt, receiptRef, trustedPolicyDecisionStore } = input;
  if (receipt === undefined || receiptRef === undefined || trustedPolicyDecisionStore === undefined) {
    return false;
  }
  return trustedPolicyDecisionStore.namespace === CAPABILITY_SYNTHESIS_POLICY_DECISION_TRUSTED_NAMESPACE &&
    sameTrustedArtifactRef(receiptRef, receipt.trustedArtifactRef) &&
    policyDecisionReceiptProvenanceValid(receipt) &&
    policyDecisionReceiptSubjectMatchesDecision(receipt, decision);
}

function decideReusePolicy(input: CapabilitySynthesisReusePolicyInput, policyVersion: string): CapabilitySynthesisPolicyDecision {
  const r4Rules = r4EvidenceBlockingRules(input);
  if (r4Rules.length > 0) {
    return buildPolicyDecision({
      ...metadataFromReusePlan(input.reusePlan),
      policyVersion,
      riskTier: 'R4_PROHIBITED',
      mode: 'PROHIBITED',
      allowed: false,
      implementationSandboxAllowed: false,
      requiredApprovals: [],
      requiredGates: ['reuse_plan_validation', 'policy_decision'],
      blockingRules: r4Rules,
      rationale: ['Policy cannot allow composition without completed R4 audit evidence.'],
      advisoryModelSuggestion: input.advisoryModelSuggestion
    });
  }

  const r3Rules = r3EvidenceBlockingRules(input);
  if (r3Rules.length > 0) {
    return buildPolicyDecision({
      ...metadataFromReusePlan(input.reusePlan),
      policyVersion,
      riskTier: 'R3_MANUAL_ARCHITECTURE_REVIEW',
      mode: 'MANUAL_SPEC_ONLY',
      allowed: false,
      implementationSandboxAllowed: false,
      requiredApprovals: approvalsForTier('R3_MANUAL_ARCHITECTURE_REVIEW'),
      requiredGates: ['reuse_plan_validation', 'policy_decision', 'manual_architecture_review'],
      blockingRules: r3Rules,
      rationale: ['Manual architecture review required because R3 audit evidence is incomplete.'],
      advisoryModelSuggestion: input.advisoryModelSuggestion
    });
  }

  const plan = validReusePlan(input.reusePlan);
  if (plan === undefined) {
    return buildPolicyDecision({
      ...metadataFromReusePlan(input.reusePlan),
      policyVersion,
      riskTier: 'R4_PROHIBITED',
      mode: 'PROHIBITED',
      allowed: false,
      implementationSandboxAllowed: false,
      requiredApprovals: [],
      requiredGates: ['reuse_plan_validation'],
      blockingRules: ['REUSE_PLAN_INVALID'],
      rationale: ['Policy cannot allow R0 without a valid no-new-package reuse plan.'],
      advisoryModelSuggestion: input.advisoryModelSuggestion
    });
  }

  const r4RulesFromAudit = r4AuditBlockingRules(input);
  if (r4RulesFromAudit.length > 0) {
    return buildPolicyDecision({
      ...metadataFromReusePlan(plan),
      policyVersion,
      riskTier: 'R4_PROHIBITED',
      mode: 'PROHIBITED',
      allowed: false,
      implementationSandboxAllowed: false,
      requiredApprovals: [],
      requiredGates: ['reuse_plan_validation', 'policy_decision'],
      blockingRules: r4RulesFromAudit,
      rationale: ['Policy prohibited reuse-only composition because R4 audit evidence found forbidden capability.'],
      advisoryModelSuggestion: input.advisoryModelSuggestion
    });
  }

  const r3RulesFromAudit = r3AuditBlockingRules(input);
  if (r3RulesFromAudit.length > 0) {
    return buildPolicyDecision({
      ...metadataFromReusePlan(plan),
      policyVersion,
      riskTier: 'R3_MANUAL_ARCHITECTURE_REVIEW',
      mode: 'MANUAL_SPEC_ONLY',
      allowed: false,
      implementationSandboxAllowed: false,
      requiredApprovals: approvalsForTier('R3_MANUAL_ARCHITECTURE_REVIEW'),
      requiredGates: ['reuse_plan_validation', 'policy_decision', 'manual_architecture_review'],
      blockingRules: r3RulesFromAudit,
      rationale: ['Manual architecture review required for reuse-only path because R3 audit evidence found a blocker.'],
      advisoryModelSuggestion: input.advisoryModelSuggestion
    });
  }

  return buildPolicyDecision({
    ...metadataFromReusePlan(plan),
    policyVersion,
    riskTier: 'R0_COMPOSITION_ONLY',
    mode: plan.mode,
    allowed: true,
    implementationSandboxAllowed: false,
    requiredApprovals: [],
    requiredGates: ['reuse_plan_validation', 'policy_decision', 'composition_contract'],
    blockingRules: [],
    rationale: [`Reuse plan composes existing capabilities only: ${plan.reusedCapabilityIds.join(', ')}.`],
    advisoryModelSuggestion: input.advisoryModelSuggestion
  });
}

function decideSpecificationPolicy(input: CapabilitySynthesisSpecificationPolicyInput, policyVersion: string): CapabilitySynthesisPolicyDecision {
  const policyInputHash = hashSpecificationPolicyInput(input, policyVersion);
  const precondition = validateSpecificationPolicyPreconditions(input, policyInputHash);
  if (precondition.status === 'blocked') {
    return buildPolicyDecision({
      policyVersion,
      requestId: input.specificationReport.requestId,
      sourceGapReportHash: input.specificationReport.sourceGapReportHash,
      registrySnapshotHash: input.specificationReport.registrySnapshotHash,
      specificationHash: input.specificationReport.specificationHash,
      specificationValidationAttestationHash: precondition.specificationValidationAttestationHash,
      policyInputHash,
      policyEvaluationStatus: 'BLOCKED_PRECONDITION',
      allowed: false,
      implementationSandboxAllowed: false,
      requiredApprovals: [],
      requiredGates: ['specification_validation_attestation'],
      blockingRules: precondition.blockingRules,
      rationale: ['Policy precondition blocked before risk classification because specification validation provenance is not trusted.'],
      repairableByModel: false,
      advisoryModelSuggestion: input.advisoryModelSuggestion
    });
  }
  const { spec } = precondition;

  const r4Rules = uniqueStrings([...r4EvidenceBlockingRules(input), ...r4SpecBlockingRules(spec), ...r4AuditBlockingRules(input)]);
  if (r4Rules.length > 0) {
    return decisionForTier({ spec, input, policyVersion, riskTier: 'R4_PROHIBITED', blockingRules: r4Rules, policyInputHash, specificationValidationAttestationHash: precondition.specificationValidationAttestationHash });
  }

  const r3Rules = uniqueStrings([...r3EvidenceBlockingRules(input), ...r3SpecBlockingRules(spec, input), ...r3AuditBlockingRules(input)]);
  if (r3Rules.length > 0) {
    return decisionForTier({ spec, input, policyVersion, riskTier: 'R3_MANUAL_ARCHITECTURE_REVIEW', blockingRules: r3Rules, policyInputHash, specificationValidationAttestationHash: precondition.specificationValidationAttestationHash });
  }

  const tier = chooseAllowedTier(spec, input);
  return decisionForTier({ spec, input, policyVersion, riskTier: tier, blockingRules: [], policyInputHash, specificationValidationAttestationHash: precondition.specificationValidationAttestationHash });
}

function validReusePlan(plan: CapabilitySynthesisReusePlan): CapabilitySynthesisReusePlan | undefined {
  return plan.artifactKind === CAPABILITY_SYNTHESIS_REUSE_PLAN_KIND &&
    plan.schemaVersion === CAPABILITY_SYNTHESIS_REUSE_PLAN_SCHEMA_VERSION &&
    (plan.mode === 'COMPOSITION_ONLY' || plan.mode === 'CONFIGURATION_ONLY') &&
    plan.requestId.trim().length > 0 &&
    plan.sourceGapReportHash.trim().length > 0 &&
    plan.registrySnapshotHash.trim().length > 0 &&
    plan.reusedCapabilityIds.length > 0 &&
    plan.noNewPackage === true &&
    plan.noCandidateWorkspace === true &&
    plan.planHash === recomputeReusePlanHash(plan)
    ? plan
    : undefined;
}

type SpecificationPolicyPrecondition =
  | {
      status: 'valid';
      spec: CapabilitySpecificationCandidate;
      specificationValidationAttestationHash: string;
    }
  | {
      status: 'blocked';
      blockingRules: string[];
      specificationValidationAttestationHash?: string;
    };

function validateSpecificationPolicyPreconditions(
  input: CapabilitySynthesisSpecificationPolicyInput,
  policyInputHash: string
): SpecificationPolicyPrecondition {
  const report = input.specificationReport;
  const attestationRef = input.specificationValidationAttestationRef;
  const attestation = resolveTrustedSpecificationValidationAttestation(input);
  const issues: string[] = [];
  if (
    Object.prototype.hasOwnProperty.call(input, 'trustedValidationReportHash') ||
    Object.prototype.hasOwnProperty.call(input, 'specificationValidationAttestation')
  ) {
    issues.push('CAP_SYNTH_SPEC_VALIDATION_PROVENANCE_INVALID');
  }
  if (attestationRef === undefined || input.trustedValidationAttestationStore === undefined || attestation === undefined) {
    issues.push('CAP_SYNTH_SPEC_VALIDATION_ATTESTATION_MISSING');
  } else {
    issues.push(...attestationTrustedStoreIssues(input.trustedValidationAttestationStore, attestationRef, attestation));
    issues.push(...attestationProvenanceIssues(attestation));
    issues.push(...attestationReportBindingIssues(attestation, report));
    issues.push(...attestationSubjectIssues(attestation, report));
    issues.push(...attestationContextIssues(attestation, report, input.attemptId));
  }

  const spec = validSpecFromReport(report);
  if (spec === undefined || attestation?.predicate.validationStatus !== 'PASSED') {
    issues.push('CAP_SYNTH_SPEC_INVALID');
  }

  const uniqueIssues = uniqueStrings(issues);
  if (uniqueIssues.length > 0) {
    return {
      status: 'blocked',
      blockingRules: uniqueIssues,
      ...(attestation?.attestationHash === undefined ? {} : { specificationValidationAttestationHash: attestation.attestationHash })
    };
  }
  if (spec === undefined || attestation === undefined) {
    return {
      status: 'blocked',
      blockingRules: ['CAP_SYNTH_SPEC_INVALID'],
      ...(attestation?.attestationHash === undefined ? {} : { specificationValidationAttestationHash: attestation.attestationHash })
    };
  }

  return {
    status: 'valid',
    spec,
    specificationValidationAttestationHash: attestation.attestationHash
  };
}

function resolveTrustedSpecificationValidationAttestation(input: CapabilitySynthesisSpecificationPolicyInput): SpecificationValidationAttestation | undefined {
  const ref = input.specificationValidationAttestationRef;
  const store = input.trustedValidationAttestationStore;
  if (ref === undefined || store === undefined || store.namespace !== CAPABILITY_SPECIFICATION_VALIDATION_TRUSTED_NAMESPACE) {
    return undefined;
  }
  return store.resolveAttestation(ref);
}

function attestationTrustedStoreIssues(
  store: SpecificationValidationAttestationStoreResolver,
  ref: SpecificationValidationAttestation['trustedArtifactRef'],
  attestation: SpecificationValidationAttestation
): string[] {
  return store.namespace === CAPABILITY_SPECIFICATION_VALIDATION_TRUSTED_NAMESPACE &&
    sameTrustedArtifactRef(ref, attestation.trustedArtifactRef) &&
    ref.namespace === CAPABILITY_SPECIFICATION_VALIDATION_TRUSTED_NAMESPACE &&
    ref.artifactKind === CAPABILITY_SPECIFICATION_VALIDATION_ATTESTATION_KIND
    ? []
    : ['CAP_SYNTH_SPEC_VALIDATION_PROVENANCE_INVALID'];
}

function validSpecFromReport(report: CapabilitySpecificationValidationReport): CapabilitySpecificationCandidate | undefined {
  return report.artifactKind === CAPABILITY_SPECIFICATION_VALIDATION_REPORT_KIND &&
    report.schemaVersion === CAPABILITY_SPECIFICATION_VALIDATION_REPORT_SCHEMA_VERSION &&
    report.status === 'valid' &&
    report.issues.length === 0 &&
    report.normalizedSpec !== undefined &&
    report.specificationHash === report.normalizedSpec.specificationHash &&
    report.requestId === report.normalizedSpec.requestId &&
    report.registrySnapshotHash === report.normalizedSpec.registrySnapshotHash &&
    report.normalizedSpec.specificationHash === recomputeSpecificationHash(report.normalizedSpec) &&
    report.reportHash === recomputeSpecificationValidationReportHash(report)
    ? report.normalizedSpec
    : undefined;
}

function attestationProvenanceIssues(attestation: SpecificationValidationAttestation): string[] {
  const issues: string[] = [];
  if (
    attestation.artifactKind !== CAPABILITY_SPECIFICATION_VALIDATION_ATTESTATION_KIND ||
    attestation.schemaVersion !== CAPABILITY_SPECIFICATION_VALIDATION_ATTESTATION_SCHEMA_VERSION ||
    attestation.trustedArtifactRef.namespace !== CAPABILITY_SPECIFICATION_VALIDATION_TRUSTED_NAMESPACE ||
    attestation.trustedArtifactRef.artifactKind !== CAPABILITY_SPECIFICATION_VALIDATION_ATTESTATION_KIND ||
    attestation.trustedArtifactRef.artifactId !== attestation.attestationId ||
    !TRUSTED_SPECIFICATION_VALIDATION_ISSUERS.has(attestation.issuer.serviceId) ||
    (attestation.signature !== undefined && (attestation.issuer.keyId === undefined || !TRUSTED_SPECIFICATION_VALIDATION_KEY_IDS.has(attestation.issuer.keyId))) ||
    attestation.attestationHash !== recomputeSpecificationValidationAttestationHash(attestation)
  ) {
    issues.push('CAP_SYNTH_SPEC_VALIDATION_PROVENANCE_INVALID');
  }
  if (
    attestation.predicate.validatorId !== CAPABILITY_SPECIFICATION_VALIDATOR_ID ||
    attestation.predicate.validatorVersion !== CAPABILITY_SPECIFICATION_VALIDATOR_VERSION ||
    attestation.predicate.validationRulesetHash !== CAPABILITY_SPECIFICATION_VALIDATION_RULESET_HASH ||
    attestation.predicate.canonicalizationVersion !== CAPABILITY_SPECIFICATION_VALIDATION_CANONICALIZATION_VERSION ||
    !sameStringSet(attestation.predicate.requiredChecks, CAPABILITY_SPECIFICATION_VALIDATION_REQUIRED_CHECKS)
  ) {
    issues.push('CAP_SYNTH_SPEC_VALIDATION_RULESET_UNTRUSTED');
  }
  return issues;
}

function attestationReportBindingIssues(
  attestation: SpecificationValidationAttestation,
  report: CapabilitySpecificationValidationReport
): string[] {
  return attestation.predicate.validationReportHash === report.reportHash &&
    report.reportHash === recomputeSpecificationValidationReportHash(report)
    ? []
    : ['CAP_SYNTH_SPEC_VALIDATION_REPORT_HASH_MISMATCH'];
}

function attestationSubjectIssues(
  attestation: SpecificationValidationAttestation,
  report: CapabilitySpecificationValidationReport
): string[] {
  const spec = report.normalizedSpec;
  if (spec === undefined) {
    return [];
  }
  return attestation.subject.requestId === report.requestId &&
    attestation.subject.requestId === spec.requestId &&
    attestation.subject.canonicalSpecificationHash === report.specificationHash &&
    attestation.subject.canonicalSpecificationHash === spec.specificationHash
    ? []
    : ['CAP_SYNTH_SPEC_VALIDATION_SUBJECT_MISMATCH'];
}

function attestationContextIssues(
  attestation: SpecificationValidationAttestation,
  report: CapabilitySpecificationValidationReport,
  attemptId: string | undefined
): string[] {
  const spec = report.normalizedSpec;
  return attemptId !== undefined &&
    attestation.subject.attemptId === attemptId &&
    attestation.subject.registrySnapshotHash === report.registrySnapshotHash &&
    (spec === undefined || attestation.subject.registrySnapshotHash === spec.registrySnapshotHash)
    ? []
    : ['CAP_SYNTH_SPEC_VALIDATION_CONTEXT_MISMATCH'];
}

function decisionForTier(input: {
  spec: CapabilitySpecificationCandidate;
  input: CapabilitySynthesisSpecificationPolicyInput;
  policyVersion: string;
  riskTier: CapabilitySynthesisRiskTier;
  blockingRules: readonly string[];
  policyInputHash: string;
  specificationValidationAttestationHash: string;
}): CapabilitySynthesisPolicyDecision {
  const mode = modeForTier(input.riskTier, input.spec);
  return buildPolicyDecision({
    ...metadataFromSpec(input.spec),
    policyVersion: input.policyVersion,
    specificationValidationAttestationHash: input.specificationValidationAttestationHash,
    policyInputHash: input.policyInputHash,
    riskTier: input.riskTier,
    mode,
    allowed: input.riskTier !== 'R3_MANUAL_ARCHITECTURE_REVIEW' && input.riskTier !== 'R4_PROHIBITED',
    implementationSandboxAllowed: input.riskTier === 'R2_BOUNDED_RUNTIME_MODULE',
    requiredApprovals: approvalsForTier(input.riskTier),
    requiredGates: gatesForTier(input.riskTier, input.spec),
    blockingRules: [...input.blockingRules].sort(),
    rationale: rationaleForTier(input.riskTier, input.blockingRules, input.spec),
    advisoryModelSuggestion: input.input.advisoryModelSuggestion
  });
}

function chooseAllowedTier(spec: CapabilitySpecificationCandidate, input: CapabilitySynthesisSpecificationPolicyInput): CapabilitySynthesisRiskTier {
  if (isDeclarativeOnly(spec, input)) {
    return 'R1_DECLARATIVE_EXTENSION';
  }
  if (isBoundedRuntimeModule(spec, input)) {
    return 'R2_BOUNDED_RUNTIME_MODULE';
  }
  return 'R3_MANUAL_ARCHITECTURE_REVIEW';
}

function r4EvidenceBlockingRules(input: CapabilitySynthesisCommonPolicyInput): string[] {
  return uniqueStrings([
    ...(input.auditEvidence?.externalDependencies.checked === true ? [] : ['AUDIT_EVIDENCE_MISSING:external_dependencies']),
    ...(input.auditEvidence?.candidateFilePolicyMutable.checked === true ? [] : ['AUDIT_EVIDENCE_MISSING:candidate_file_policy'])
  ]);
}

function r3EvidenceBlockingRules(input: CapabilitySynthesisCommonPolicyInput): string[] {
  return uniqueStrings([
    ...(input.auditEvidence?.r3Triggers.checked === true ? [] : ['AUDIT_EVIDENCE_MISSING:r3_triggers']),
    ...(input.auditEvidence?.globalKernelChanges.checked === true ? [] : ['AUDIT_EVIDENCE_MISSING:global_kernel_changes'])
  ]);
}

function r4SpecBlockingRules(spec: CapabilitySpecificationCandidate): string[] {
  return uniqueStrings([
    ...spec.security.requiredPrivileges.map((privilege) => r4RuleForRequiredPrivilege(privilege)).filter(isPresent),
    ...spec.security.dataAccess.map((item) => r4RuleForTerm(item)).filter(isPresent)
  ]);
}

function r4AuditBlockingRules(input: CapabilitySynthesisCommonPolicyInput): string[] {
  const externalDependencyRules = input.auditEvidence?.externalDependencies.values.length
    ? ['R4:EXTERNAL_DEPENDENCY']
    : [];
  const policyMutationRules = input.auditEvidence?.candidateFilePolicyMutable.value === true
    ? ['R4:CANDIDATE_POLICY_MUTATION_ATTEMPT']
    : [];
  return uniqueStrings([...externalDependencyRules, ...policyMutationRules]);
}

function r3SpecBlockingRules(spec: CapabilitySpecificationCandidate, input: CapabilitySynthesisSpecificationPolicyInput): string[] {
  const approvedServices = new Set(input.approvedRuntimeServices ?? []);
  const unapprovedRuntimeServices = spec.runtime.requiredServices.filter((service) => !approvedServices.has(service));
  return uniqueStrings([
    ...unapprovedRuntimeServices.map((service) => `R3:NEW_RUNTIME_SERVICE:${service}`),
    ...(spec.runtimeFamilies.length !== 1 ? ['R3:CROSS_RUNTIME_ABSTRACTION'] : [])
  ]);
}

function r3AuditBlockingRules(input: CapabilitySynthesisCommonPolicyInput): string[] {
  return uniqueStrings([
    ...(input.auditEvidence?.globalKernelChanges.value === true ? ['R3:KERNEL_LIFECYCLE_CHANGE'] : []),
    ...(input.auditEvidence?.r3Triggers.values.map((trigger) => `R3:${trigger}`) ?? [])
  ]);
}

function isDeclarativeOnly(spec: CapabilitySpecificationCandidate, input: CapabilitySynthesisSpecificationPolicyInput): boolean {
  return spec.runtime.requiredServices.length === 0 &&
    spec.runtime.ownedStateKeys.length <= 8 &&
    spec.runtime.ownedEvents.length <= 8 &&
    input.existingInterpreterSupportsOperations === true &&
    input.boundedState === true &&
    input.boundedEventRate === true &&
    spec.qa.requiredProbes.length > 0 &&
    spec.acceptanceScenarios.length > 0;
}

function isBoundedRuntimeModule(spec: CapabilitySpecificationCandidate, input: CapabilitySynthesisSpecificationPolicyInput): boolean {
  return spec.runtimeFamilies.length === 1 &&
    spec.runtime.requiredServices.length > 0 &&
    input.boundedSourceFileSet === true &&
    input.boundedState === true &&
    input.boundedEntityCreation === true &&
    input.deterministicClockAndRng === true &&
    input.teardownVerifiable === true &&
    input.behaviorObservable === true &&
    hasPerformanceBudget(spec) &&
    spec.runtime.teardownRequirements.length > 0;
}

function modeForTier(tier: CapabilitySynthesisRiskTier, spec: CapabilitySpecificationCandidate): CapabilitySynthesisMode {
  if (tier === 'R1_DECLARATIVE_EXTENSION') {
    return spec.runtime.patchPolicy === 'not_patchable' ? 'DECLARATIVE_STATE_MACHINE' : 'DECLARATIVE_BEHAVIOR_GRAPH';
  }
  if (tier === 'R2_BOUNDED_RUNTIME_MODULE') {
    return 'BOUNDED_TYPED_RUNTIME_MODULE';
  }
  if (tier === 'R3_MANUAL_ARCHITECTURE_REVIEW') {
    return 'MANUAL_SPEC_ONLY';
  }
  if (tier === 'R4_PROHIBITED') {
    return 'PROHIBITED';
  }
  return spec.dependencies.length > 0 ? 'COMPOSITION_ONLY' : 'CONFIGURATION_ONLY';
}

function approvalsForTier(tier: CapabilitySynthesisRiskTier): string[] {
  if (tier === 'R1_DECLARATIVE_EXTENSION') {
    return ['capability_maintainer'];
  }
  if (tier === 'R2_BOUNDED_RUNTIME_MODULE') {
    return ['capability_maintainer', 'runtime_code_owner'];
  }
  if (tier === 'R3_MANUAL_ARCHITECTURE_REVIEW') {
    return ['capability_maintainer', 'runtime_code_owner', 'manual_architecture_review'];
  }
  return [];
}

function gatesForTier(tier: CapabilitySynthesisRiskTier, spec: CapabilitySpecificationCandidate): string[] {
  const gates = ['specification_validation', 'policy_decision'];
  if (tier === 'R1_DECLARATIVE_EXTENSION') {
    gates.push('declarative_contract_tests', 'capability_qa');
  }
  if (tier === 'R2_BOUNDED_RUNTIME_MODULE') {
    gates.push('source_integrity', 'package_contract', 'ownership', 'ast_policy', 'typecheck', 'build', 'runtime_qa', 'security_qa', 'performance', 'teardown');
  }
  if (spec.render !== undefined) {
    gates.push('step33_render_fidelity');
  }
  if (tier === 'R3_MANUAL_ARCHITECTURE_REVIEW') {
    gates.push('manual_architecture_review');
  }
  return uniqueStrings(gates);
}

function rationaleForTier(tier: CapabilitySynthesisRiskTier, blockingRules: readonly string[], spec: CapabilitySpecificationCandidate): string[] {
  if (tier === 'R4_PROHIBITED') {
    return [`Policy prohibited synthesis: ${blockingRules.join(', ')}`];
  }
  if (tier === 'R3_MANUAL_ARCHITECTURE_REVIEW') {
    return [`Manual architecture review required: ${blockingRules.join(', ') || 'spec exceeds bounded automatic synthesis policy'}`];
  }
  if (tier === 'R2_BOUNDED_RUNTIME_MODULE') {
    return [`Specification ${spec.proposedCapabilityId} is bounded to one runtime family with approved services, teardown and enforceable performance budgets.`];
  }
  if (tier === 'R1_DECLARATIVE_EXTENSION') {
    return [`Specification ${spec.proposedCapabilityId} can be expressed through bounded declarative behavior with black-box assertions.`];
  }
  return [`Specification ${spec.proposedCapabilityId} reuses existing composition/configuration only.`];
}

function buildPolicyDecision(input: Omit<CapabilitySynthesisPolicyDecision, 'artifactKind' | 'schemaVersion' | 'decisionHash' | 'policyEvaluationStatus'> & {
  policyEvaluationStatus?: CapabilitySynthesisPolicyEvaluationStatus;
}): CapabilitySynthesisPolicyDecision {
  const basePayload: Omit<CapabilitySynthesisPolicyDecision, 'decisionHash' | 'decisionContextHash'> = {
    artifactKind: CAPABILITY_SYNTHESIS_POLICY_REPORT_KIND,
    schemaVersion: CAPABILITY_SYNTHESIS_POLICY_REPORT_SCHEMA_VERSION,
    policyVersion: input.policyVersion,
    policyEvaluationStatus: input.policyEvaluationStatus ?? 'EVALUATED',
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
    ...(input.sourceGapReportHash === undefined ? {} : { sourceGapReportHash: input.sourceGapReportHash }),
    ...(input.registrySnapshotHash === undefined ? {} : { registrySnapshotHash: input.registrySnapshotHash }),
    ...(input.activeCapabilityLockHash === undefined ? {} : { activeCapabilityLockHash: input.activeCapabilityLockHash }),
    ...(input.specificationHash === undefined ? {} : { specificationHash: input.specificationHash }),
    ...(input.specificationValidationAttestationHash === undefined ? {} : { specificationValidationAttestationHash: input.specificationValidationAttestationHash }),
    ...(input.policyInputHash === undefined ? {} : { policyInputHash: input.policyInputHash }),
    ...(input.reusePlanHash === undefined ? {} : { reusePlanHash: input.reusePlanHash }),
    ...(input.riskTier === undefined ? {} : { riskTier: input.riskTier }),
    ...(input.mode === undefined ? {} : { mode: input.mode }),
    allowed: input.allowed,
    implementationSandboxAllowed: input.implementationSandboxAllowed,
    requiredApprovals: uniqueStrings(input.requiredApprovals),
    requiredGates: uniqueStrings(input.requiredGates),
    blockingRules: uniqueStrings(input.blockingRules),
    rationale: uniqueStrings(input.rationale),
    ...(input.repairableByModel === undefined ? {} : { repairableByModel: input.repairableByModel }),
    ...(input.advisoryModelSuggestion === undefined ? {} : { advisoryModelSuggestion: input.advisoryModelSuggestion })
  };
  const policyReportHash = hashStableJson(basePayload);
  const payload: Omit<CapabilitySynthesisPolicyDecision, 'decisionHash'> = {
    ...basePayload,
    ...(input.decisionContextHash !== undefined
      ? { decisionContextHash: input.decisionContextHash }
      : decisionContextHashForBasePayload(basePayload, policyReportHash))
  };
  return { ...payload, decisionHash: hashStableJson(payload) };
}

function metadataFromSpec(spec: CapabilitySpecificationCandidate) {
  return {
    requestId: spec.requestId,
    sourceGapReportHash: spec.sourceGapReportHash,
    registrySnapshotHash: spec.registrySnapshotHash,
    activeCapabilityLockHash: spec.activeCapabilityLockHash,
    specificationHash: spec.specificationHash
  };
}

function metadataFromReusePlan(plan: CapabilitySynthesisReusePlan) {
  return {
    requestId: plan.requestId,
    sourceGapReportHash: plan.sourceGapReportHash,
    registrySnapshotHash: plan.registrySnapshotHash,
    activeCapabilityLockHash: plan.activeCapabilityLockHash,
    reusePlanHash: plan.planHash
  };
}

function r4RuleForRequiredPrivilege(value: string): string | undefined {
  const normalized = normalizePolicyTerm(value);
  if (normalized.length === 0) {
    return undefined;
  }
  const trigger = REQUIRED_PRIVILEGE_TO_R4_TRIGGER[normalized] ?? R4_TRIGGER_ALIASES[normalized];
  return trigger === undefined ? `R4:UNKNOWN_REQUIRED_PRIVILEGE:${normalized}` : `R4:${trigger}`;
}

function r4RuleForTerm(value: string): string | undefined {
  const trigger = R4_TRIGGER_ALIASES[normalizePolicyTerm(value)];
  return trigger === undefined ? undefined : `R4:${trigger}`;
}

function recomputeReusePlanHash(plan: CapabilitySynthesisReusePlan): string {
  const { planHash: _planHash, ...payload } = plan;
  return hashStableJson(payload);
}

function recomputePolicyDecisionHash(decision: CapabilitySynthesisPolicyDecision): string {
  const { decisionHash: _decisionHash, ...payload } = decision;
  return hashStableJson(payload);
}

function recomputeSpecificationValidationReportHash(report: CapabilitySpecificationValidationReport): string {
  const { reportHash: _reportHash, ...payload } = report;
  return hashStableJson(payload);
}

function recomputeSpecificationValidationAttestationHash(attestation: SpecificationValidationAttestation): string {
  const { attestationHash: _attestationHash, ...payload } = attestation;
  return hashStableJson(payload);
}

function recomputePolicyDecisionReceiptHash(receipt: CapabilitySynthesisPolicyDecisionReceipt): string {
  const { receiptHash: _receiptHash, ...payload } = receipt;
  return hashStableJson(payload);
}

function recomputeSpecificationHash(spec: CapabilitySpecificationCandidate): string {
  const { specificationHash: _specificationHash, ...payload } = spec;
  return hashStableJson(payload);
}

function hashSpecificationPolicyInput(input: CapabilitySynthesisSpecificationPolicyInput, policyVersion: string): string {
  return hashStableJson({
    source: 'validated_specification',
    policyVersion,
    specificationReportHash: input.specificationReport.reportHash,
    ...(input.specificationValidationAttestationRef === undefined ? {} : { specificationValidationAttestationRef: input.specificationValidationAttestationRef }),
    ...(input.attemptId === undefined ? {} : { attemptId: input.attemptId }),
    ...(input.auditEvidence === undefined ? {} : { auditEvidence: input.auditEvidence }),
    approvedRuntimeServices: uniqueStrings(input.approvedRuntimeServices ?? []),
    ...(input.existingInterpreterSupportsOperations === undefined ? {} : { existingInterpreterSupportsOperations: input.existingInterpreterSupportsOperations }),
    ...(input.boundedEventRate === undefined ? {} : { boundedEventRate: input.boundedEventRate }),
    ...(input.boundedState === undefined ? {} : { boundedState: input.boundedState }),
    ...(input.boundedSourceFileSet === undefined ? {} : { boundedSourceFileSet: input.boundedSourceFileSet }),
    ...(input.boundedEntityCreation === undefined ? {} : { boundedEntityCreation: input.boundedEntityCreation }),
    ...(input.deterministicClockAndRng === undefined ? {} : { deterministicClockAndRng: input.deterministicClockAndRng }),
    ...(input.teardownVerifiable === undefined ? {} : { teardownVerifiable: input.teardownVerifiable }),
    ...(input.behaviorObservable === undefined ? {} : { behaviorObservable: input.behaviorObservable }),
    ...(input.advisoryModelSuggestion === undefined ? {} : { advisoryModelSuggestion: input.advisoryModelSuggestion })
  });
}

function decisionContextHashForBasePayload(
  payload: Omit<CapabilitySynthesisPolicyDecision, 'decisionHash' | 'decisionContextHash'>,
  policyReportHash: string
): { decisionContextHash?: string } {
  if (payload.policyInputHash === undefined) {
    return {};
  }
  return {
    decisionContextHash: hashStableJson({
      ...(payload.specificationHash === undefined ? {} : { specificationHash: payload.specificationHash }),
      ...(payload.specificationValidationAttestationHash === undefined ? {} : { specificationValidationAttestationHash: payload.specificationValidationAttestationHash }),
      policyInputHash: payload.policyInputHash,
      policyReportHash,
      ...(payload.registrySnapshotHash === undefined ? {} : { registrySnapshotHash: payload.registrySnapshotHash }),
      policyVersion: payload.policyVersion
    })
  };
}

function policyDecisionReceiptProvenanceValid(receipt: CapabilitySynthesisPolicyDecisionReceipt): boolean {
  return receipt.artifactKind === CAPABILITY_SYNTHESIS_POLICY_DECISION_RECEIPT_KIND &&
    receipt.schemaVersion === CAPABILITY_SYNTHESIS_POLICY_DECISION_RECEIPT_SCHEMA_VERSION &&
    receipt.trustedArtifactRef.namespace === CAPABILITY_SYNTHESIS_POLICY_DECISION_TRUSTED_NAMESPACE &&
    receipt.trustedArtifactRef.artifactKind === CAPABILITY_SYNTHESIS_POLICY_DECISION_RECEIPT_KIND &&
    receipt.trustedArtifactRef.artifactId === receipt.receiptId &&
    TRUSTED_POLICY_DECISION_ISSUERS.has(receipt.issuer.serviceId) &&
    (receipt.issuer.keyId === undefined || TRUSTED_POLICY_DECISION_KEY_IDS.has(receipt.issuer.keyId)) &&
    receipt.receiptHash === recomputePolicyDecisionReceiptHash(receipt);
}

function policyDecisionReceiptSubjectMatchesDecision(
  receipt: CapabilitySynthesisPolicyDecisionReceipt,
  decision: CapabilitySynthesisPolicyDecision
): boolean {
  return receipt.subject.policyVersion === decision.policyVersion &&
    receipt.subject.policyDecisionHash === decision.decisionHash &&
    receipt.subject.decisionContextHash === (decision.decisionContextHash ?? '') &&
    (receipt.subject.requestId ?? decision.requestId) === decision.requestId &&
    (receipt.subject.policyInputHash ?? decision.policyInputHash) === decision.policyInputHash &&
    (receipt.subject.specificationHash ?? decision.specificationHash) === decision.specificationHash &&
    (receipt.subject.registrySnapshotHash ?? decision.registrySnapshotHash) === decision.registrySnapshotHash &&
    (receipt.subject.activeCapabilityLockHash ?? decision.activeCapabilityLockHash) === decision.activeCapabilityLockHash &&
    decision.decisionHash === recomputePolicyDecisionHash(decision) &&
    decision.policyEvaluationStatus === 'EVALUATED' &&
    (decision.decisionContextHash?.trim().length ?? 0) > 0;
}

function hasPerformanceBudget(spec: CapabilitySpecificationCandidate): boolean {
  return Object.values(spec.budgets).some((value) => typeof value === 'number' && Number.isFinite(value) && value > 0);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort();
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  return uniqueStrings(left).join('\n') === uniqueStrings(right).join('\n');
}

function sameTrustedArtifactRef(
  left: SpecificationValidationAttestation['trustedArtifactRef'] | CapabilitySynthesisPolicyDecisionReceipt['trustedArtifactRef'],
  right: SpecificationValidationAttestation['trustedArtifactRef'] | CapabilitySynthesisPolicyDecisionReceipt['trustedArtifactRef']
): boolean {
  return left.namespace === right.namespace &&
    left.artifactKind === right.artifactKind &&
    left.artifactId === right.artifactId;
}

function normalizePolicyTerm(value: string): string {
  return value.trim().toLowerCase().replace(/[\s.-]+/g, '_');
}

function isPresent<T>(value: T | undefined): value is T {
  return value !== undefined;
}

const REQUIRED_PRIVILEGE_TO_R4_TRIGGER: Record<string, CapabilitySynthesisR4TriggerCode> = {
  filesystem: 'FILESYSTEM_ACCESS',
  network: 'NETWORK_ACCESS',
  package_manager: 'RUNTIME_PACKAGE_INSTALL',
  secrets: 'SECRETS_ACCESS',
  shell: 'CHILD_PROCESS'
};

const TRUSTED_SPECIFICATION_VALIDATION_ISSUERS = new Set(['maker-api.capability-specification-validator']);
const TRUSTED_SPECIFICATION_VALIDATION_KEY_IDS = new Set(['maker-api.spec-validator.v1']);
const TRUSTED_POLICY_DECISION_ISSUERS = new Set(['maker-api.capability-synthesis-policy-engine']);
const TRUSTED_POLICY_DECISION_KEY_IDS = new Set(['maker-api.capability-policy.v1']);

const R4_TRIGGER_ALIASES: Record<string, CapabilitySynthesisR4TriggerCode> = {
  auth: 'PAYMENT_OR_AUTHENTICATION',
  authentication: 'PAYMENT_OR_AUTHENTICATION',
  child_process: 'CHILD_PROCESS',
  copied_code_unknown_license: 'LICENSE_UNKNOWN_CODE',
  credential_storage: 'CREDENTIAL_STORAGE',
  credentials: 'CREDENTIAL_STORAGE',
  cross_origin: 'CROSS_ORIGIN_ACCESS',
  cross_origin_access: 'CROSS_ORIGIN_ACCESS',
  dynamic_code: 'DYNAMIC_CODE_EXECUTION',
  dynamic_code_execution: 'DYNAMIC_CODE_EXECUTION',
  eval: 'DYNAMIC_CODE_EXECUTION',
  external_dependencies: 'EXTERNAL_DEPENDENCY',
  external_dependency: 'EXTERNAL_DEPENDENCY',
  file: 'FILESYSTEM_ACCESS',
  file_system: 'FILESYSTEM_ACCESS',
  filesystem: 'FILESYSTEM_ACCESS',
  fs: 'FILESYSTEM_ACCESS',
  function_constructor: 'DYNAMIC_CODE_EXECUTION',
  http: 'NETWORK_ACCESS',
  license_unknown: 'LICENSE_UNKNOWN_CODE',
  license_unknown_code: 'LICENSE_UNKNOWN_CODE',
  native: 'NATIVE_OR_WASM_BINARY',
  native_binary: 'NATIVE_OR_WASM_BINARY',
  native_or_wasm_binary: 'NATIVE_OR_WASM_BINARY',
  native_wasm: 'NATIVE_OR_WASM_BINARY',
  network: 'NETWORK_ACCESS',
  network_access: 'NETWORK_ACCESS',
  network_fetch: 'NETWORK_ACCESS',
  npm_install: 'RUNTIME_PACKAGE_INSTALL',
  obfuscated: 'OBFUSCATED_SOURCE',
  obfuscated_source: 'OBFUSCATED_SOURCE',
  package_install: 'RUNTIME_PACKAGE_INSTALL',
  package_manager: 'RUNTIME_PACKAGE_INSTALL',
  payment: 'PAYMENT_OR_AUTHENTICATION',
  payments: 'PAYMENT_OR_AUTHENTICATION',
  runtime_package_install: 'RUNTIME_PACKAGE_INSTALL',
  secret: 'SECRETS_ACCESS',
  secrets: 'SECRETS_ACCESS',
  self_update: 'SELF_UPDATE',
  shell: 'CHILD_PROCESS',
  subprocess: 'CHILD_PROCESS',
  updater: 'SELF_UPDATE',
  wasm: 'NATIVE_OR_WASM_BINARY'
};
