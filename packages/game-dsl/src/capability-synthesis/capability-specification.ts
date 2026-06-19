import { GameplayCapabilityIdSchema, RuntimeFamilyIdSchema } from '../gameplay-capabilities/registry.js';
import { hashStableJson } from '../gameplay-capabilities/stable-json.js';
import {
  CAPABILITY_GAP_ANALYSIS_REPORT_KIND,
  CAPABILITY_GAP_ANALYSIS_SCHEMA_VERSION,
  type CapabilityGapAnalysis,
  type MissingCapabilityPrimitive
} from './capability-gap-analysis.js';
import type { GameplayDesignRequestContext, GameplayDesignModelProvenance } from './gameplay-design.js';

export const CAPABILITY_SPECIFICATION_SCHEMA_VERSION = 'step36.capability-specification.v1';
export const CAPABILITY_SPECIFICATION_CONTRACT_VERSION = 'gameplay-capability-package.v1';
export const CAPABILITY_SPECIFICATION_VALIDATION_REPORT_KIND = 'capability_specification_validation_report';
export const CAPABILITY_SPECIFICATION_VALIDATION_REPORT_SCHEMA_VERSION = 'step36.capability-specification-validation-report.v1';
export const CAPABILITY_SPECIFICATION_VALIDATION_ATTESTATION_KIND = 'capability_specification_validation_attestation';
export const CAPABILITY_SPECIFICATION_VALIDATION_ATTESTATION_SCHEMA_VERSION = 'step36.spec-validation-attestation.v1';
export const CAPABILITY_SPECIFICATION_VALIDATION_TRUSTED_NAMESPACE = 'trusted-artifact-store:capability-specification-validation';
export const CAPABILITY_SPECIFICATION_VALIDATION_CANONICALIZATION_VERSION = 'stable-json.v1';
export const CAPABILITY_SPECIFICATION_VALIDATOR_ID = 'trusted_capability_specification_validator';
export const CAPABILITY_SPECIFICATION_VALIDATOR_VERSION = 'step36.capability-specification-validator.v1';
export const CAPABILITY_SPECIFICATION_VALIDATION_REQUIRED_CHECKS = [
  'gap_report_integrity',
  'request_binding',
  'primitive_binding',
  'identity_and_versioning',
  'dependency_contract',
  'ownership_boundary',
  'runtime_service_allowlist',
  'qa_and_acceptance',
  'render_contract',
  'security_privileges',
  'performance_budget',
  'forbidden_authority_fields'
] as const;
export const CAPABILITY_SPECIFICATION_VALIDATION_RULESET_HASH = hashStableJson({
  validatorId: CAPABILITY_SPECIFICATION_VALIDATOR_ID,
  validatorVersion: CAPABILITY_SPECIFICATION_VALIDATOR_VERSION,
  requiredChecks: CAPABILITY_SPECIFICATION_VALIDATION_REQUIRED_CHECKS
});

export const CAPABILITY_SPEC_PATCH_POLICIES = ['hot', 'warm', 'regeneration', 'not_patchable'] as const;
export const CAPABILITY_SPEC_FALLBACK_POLICIES = ['not_applicable', 'fail_closed', 'placeholder_only', 'semantic_fallback_allowed'] as const;

export type CapabilitySpecPatchPolicy = (typeof CAPABILITY_SPEC_PATCH_POLICIES)[number];
export type CapabilitySpecFallbackPolicy = (typeof CAPABILITY_SPEC_FALLBACK_POLICIES)[number];

export type CapabilitySpecDependency = {
  capabilityId: string;
  versionRange: string;
  requiredInterface: string;
  reason: string;
};

export type CapabilitySpecConflict = {
  capabilityId: string;
  reason: string;
};

export type CapabilitySpecProvidedInterface = {
  interfaceId: string;
  description: string;
};

export type CapabilitySpecValidationRule = {
  ruleId: string;
  path: string;
  assertion: string;
};

export type CapabilitySpecDslSection = {
  ownedPaths: string[];
  schema: unknown;
  defaults: Record<string, unknown>;
  normalizationRules: string[];
  validationRules: CapabilitySpecValidationRule[];
  examples: unknown[];
};

export type CapabilitySpecIrSection = {
  ownedNodeKinds: string[];
  fragmentContract: unknown;
  compileRules: string[];
  mergePolicy: string[];
};

export type CapabilitySpecRuntimeSection = {
  requiredServices: string[];
  lifecycle: string[];
  stateModel: unknown;
  deterministicRules: string[];
  patchPolicy: CapabilitySpecPatchPolicy;
  teardownRequirements: string[];
  ownedStateKeys: string[];
  ownedEvents: string[];
};

export type CapabilitySpecAmendmentsSection = {
  supportedOperations: string[];
  patchPolicy: CapabilitySpecPatchPolicy;
  expectedEffects: string[];
};

export type CapabilitySpecQaProbe = {
  probeId: string;
  given: string[];
  when: string;
  actions: string[];
  observations: string[];
  assertions: string[];
  negativeAssertions: string[];
  tolerance: string;
  requiredEvidenceSource: string;
};

export type CapabilitySpecQaSection = {
  requiredProbes: CapabilitySpecQaProbe[];
  externalAssertions: string[];
  mutationTargets: string[];
  failureScenarios: string[];
};

export type CapabilitySpecRenderSection = {
  assetRoles: string[];
  sceneBindings: string[];
  fallbackPolicy: CapabilitySpecFallbackPolicy;
  renderEvidence: string[];
};

export type CapabilitySpecSecuritySection = {
  requiredPrivileges: string[];
  forbiddenPrivileges: string[];
  dataAccess: string[];
};

export type CapabilitySpecBudgets = {
  maxRuntimeMsPerFrame?: number;
  maxEntitiesCreatedPerSecond?: number;
  maxTelemetryEventsPerSecond?: number;
  maxBundleBytes?: number;
};

export type CapabilitySpecAcceptanceScenario = {
  scenarioId: string;
  given: string[];
  when: string;
  actions: string[];
  observations: string[];
  assertions: string[];
  negativeAssertions: string[];
  tolerance: string;
  requiredEvidenceSource: string;
};

export type CapabilitySpecificationCandidate = {
  schemaVersion: typeof CAPABILITY_SPECIFICATION_SCHEMA_VERSION;
  specificationId: string;
  requestId: string;
  sourceGapReportHash: string;
  registrySnapshotHash: string;
  activeCapabilityLockHash?: string;
  proposedCapabilityId: string;
  proposedPackageVersion: string;
  capabilityContractVersion: typeof CAPABILITY_SPECIFICATION_CONTRACT_VERSION;
  title: string;
  description: string;
  semanticContract: string;
  explicitNonGoals: string[];
  runtimeFamilies: string[];
  dependencies: CapabilitySpecDependency[];
  optionalDependencies: CapabilitySpecDependency[];
  conflictsWith: CapabilitySpecConflict[];
  provides: CapabilitySpecProvidedInterface[];
  dsl: CapabilitySpecDslSection;
  ir: CapabilitySpecIrSection;
  runtime: CapabilitySpecRuntimeSection;
  amendments: CapabilitySpecAmendmentsSection;
  qa: CapabilitySpecQaSection;
  render?: CapabilitySpecRenderSection;
  security: CapabilitySpecSecuritySection;
  budgets: CapabilitySpecBudgets;
  acceptanceScenarios: CapabilitySpecAcceptanceScenario[];
  provenance: GameplayDesignModelProvenance;
  specificationHash: string;
};

export type CapabilitySpecificationValidationIssue = {
  code:
    | 'CAPABILITY_SPEC_NOT_OBJECT'
    | 'CAPABILITY_SPEC_UNKNOWN_FIELD'
    | 'CAPABILITY_SPEC_FORBIDDEN_FIELD'
    | 'CAPABILITY_SPEC_REQUIRED_FIELD_MISSING'
    | 'CAPABILITY_SPEC_SCHEMA_VERSION_INVALID'
    | 'CAPABILITY_SPEC_REQUEST_ID_MISMATCH'
    | 'CAPABILITY_SPEC_GAP_REPORT_INVALID'
    | 'CAPABILITY_SPEC_OUTCOME_INVALID'
    | 'CAPABILITY_SPEC_PRIMITIVE_MISMATCH'
    | 'CAPABILITY_SPEC_HASH_MISMATCH'
    | 'CAPABILITY_SPEC_ID_INVALID'
    | 'CAPABILITY_SPEC_ID_FORBIDDEN_TERM'
    | 'CAPABILITY_SPEC_CONTRACT_VERSION_INVALID'
    | 'CAPABILITY_SPEC_ARRAY_INVALID'
    | 'CAPABILITY_SPEC_OWNERSHIP_OVERLAP'
    | 'CAPABILITY_SPEC_OWNED_PATH_OUTSIDE_DOMAIN'
    | 'CAPABILITY_SPEC_DEPENDENCY_CYCLE'
    | 'CAPABILITY_SPEC_DEPENDENCY_INTERFACE_MISSING'
    | 'CAPABILITY_SPEC_PROVIDED_INTERFACE_MISSING'
    | 'CAPABILITY_SPEC_RUNTIME_SERVICE_UNKNOWN'
    | 'CAPABILITY_SPEC_PATCH_POLICY_INVALID'
    | 'CAPABILITY_SPEC_QA_INSUFFICIENT'
    | 'CAPABILITY_SPEC_NEGATIVE_ASSERTION_MISSING'
    | 'CAPABILITY_SPEC_RENDER_CONTRACT_MISSING'
    | 'CAPABILITY_SPEC_PERFORMANCE_BUDGET_MISSING'
    | 'CAPABILITY_SPEC_SECURITY_PRIVILEGE_INVALID';
  severity: 'error';
  path: string;
  message: string;
};

export type CapabilitySpecificationValidationReport = {
  artifactKind: typeof CAPABILITY_SPECIFICATION_VALIDATION_REPORT_KIND;
  schemaVersion: typeof CAPABILITY_SPECIFICATION_VALIDATION_REPORT_SCHEMA_VERSION;
  requestId: string;
  sourceGapReportHash: string;
  registrySnapshotHash: string;
  status: 'valid' | 'invalid';
  issues: CapabilitySpecificationValidationIssue[];
  normalizedSpec?: CapabilitySpecificationCandidate;
  specificationHash?: string;
  reportHash: string;
};

export type SpecificationValidationAttestation = {
  artifactKind: typeof CAPABILITY_SPECIFICATION_VALIDATION_ATTESTATION_KIND;
  schemaVersion: typeof CAPABILITY_SPECIFICATION_VALIDATION_ATTESTATION_SCHEMA_VERSION;
  attestationId: string;
  trustedArtifactRef: {
    namespace: typeof CAPABILITY_SPECIFICATION_VALIDATION_TRUSTED_NAMESPACE | string;
    artifactId: string;
    artifactKind: typeof CAPABILITY_SPECIFICATION_VALIDATION_ATTESTATION_KIND | string;
  };
  subject: {
    requestId: string;
    attemptId: string;
    rawSpecificationHash: string;
    canonicalSpecificationHash: string;
    registrySnapshotHash: string;
  };
  predicate: {
    validationReportHash: string;
    validationStatus: 'PASSED' | 'FAILED';
    validatorId: string;
    validatorVersion: string;
    validationRulesetHash: string;
    canonicalizationVersion: typeof CAPABILITY_SPECIFICATION_VALIDATION_CANONICALIZATION_VERSION | string;
    requiredChecks: string[];
  };
  issuer: {
    serviceId: string;
    keyId?: string;
    issuedAt: string;
  };
  signature?: string;
  attestationHash: string;
};

type SpecificationValidationAttestationPayloadWithoutId =
  Omit<SpecificationValidationAttestation, 'attestationId' | 'trustedArtifactRef' | 'attestationHash'> & {
    trustedArtifactRef: Omit<SpecificationValidationAttestation['trustedArtifactRef'], 'artifactId'>;
  };

export type CapabilitySpecificationValidationContext = {
  gapAnalysis: CapabilityGapAnalysis;
  requestContext: GameplayDesignRequestContext;
  selectedPrimitive: MissingCapabilityPrimitive;
  existingOwnedDslPaths?: readonly string[];
  dependencyInterfaces?: ReadonlyArray<{ capabilityId: string; interfaces: readonly string[] }>;
  allowedRuntimeServices?: readonly string[];
};

const SPEC_ALLOWED_KEYS = new Set([
  'schemaVersion',
  'specificationId',
  'requestId',
  'sourceGapReportHash',
  'registrySnapshotHash',
  'activeCapabilityLockHash',
  'proposedCapabilityId',
  'proposedPackageVersion',
  'capabilityContractVersion',
  'title',
  'description',
  'semanticContract',
  'explicitNonGoals',
  'runtimeFamilies',
  'dependencies',
  'optionalDependencies',
  'conflictsWith',
  'provides',
  'dsl',
  'ir',
  'runtime',
  'amendments',
  'qa',
  'render',
  'security',
  'budgets',
  'acceptanceScenarios',
  'provenance',
  'specificationHash'
]);

const REQUIRED_SPEC_KEYS = [...SPEC_ALLOWED_KEYS].filter((key) => key !== 'activeCapabilityLockHash' && key !== 'render');

const FORBIDDEN_SPEC_KEYS = new Set([
  'approvalStatus',
  'approvalRecommendation',
  'approved',
  'candidateWorkspace',
  'command',
  'commands',
  'file',
  'filePath',
  'files',
  'installInstruction',
  'jsonPatch',
  'npmDependencies',
  'npmDependency',
  'npmPackage',
  'npmPackages',
  'packageInstall',
  'qaPassStatus',
  'rawCodePatch',
  'registryMutation',
  'shellCommand',
  'shellCommands',
  'sourceCode',
  'sourceFile',
  'sourceFiles',
  'workspacePath'
]);

const FORBIDDEN_CAPABILITY_ID_TERMS = ['contra', 'platformer', 'phaser', 'template', 'magic', 'fun', 'special_move'];
const DEFAULT_FORBIDDEN_PRIVILEGES = ['network', 'filesystem', 'package_manager', 'secrets', 'shell'];
const VERSION_RANGE_PATTERN = /^\^[1-9][0-9]*\.[0-9]+\.[0-9]+$/;
const PACKAGE_VERSION_PATTERN = /^[1-9][0-9]*\.[0-9]+\.[0-9]+$/;

export function buildCapabilitySpecificationCandidate(input: Omit<CapabilitySpecificationCandidate, 'specificationHash'>): CapabilitySpecificationCandidate {
  const normalized = normalizeSpecificationPayload(input);
  return { ...normalized, specificationHash: hashStableJson(normalized) };
}

export function validateCapabilitySpecificationCandidate(input: {
  candidate: unknown;
  context: CapabilitySpecificationValidationContext;
}): CapabilitySpecificationValidationReport {
  const issues: CapabilitySpecificationValidationIssue[] = [];
  const gapIssues = validateGapContext(input.context);
  issues.push(...gapIssues);
  const sourcePrimitive = findSourcePrimitive(input.context) ?? input.context.selectedPrimitive;
  const validationContext: CapabilitySpecificationValidationContext = { ...input.context, selectedPrimitive: sourcePrimitive };

  if (!isRecord(input.candidate)) {
    issues.push(issue('CAPABILITY_SPEC_NOT_OBJECT', '<root>', 'Capability specification candidate must be an object.'));
    return buildValidationReport({
      context: validationContext,
      issues
    });
  }

  issues.push(...unknownKeyIssues(input.candidate, SPEC_ALLOWED_KEYS, '<root>'));
  issues.push(...forbiddenKeyIssues(input.candidate));
  for (const key of REQUIRED_SPEC_KEYS) {
    if (!(key in input.candidate)) {
      issues.push(issue('CAPABILITY_SPEC_REQUIRED_FIELD_MISSING', key, `Missing required specification field ${key}.`));
    }
  }

  const candidate = input.candidate as Partial<CapabilitySpecificationCandidate>;
  if (candidate.schemaVersion !== CAPABILITY_SPECIFICATION_SCHEMA_VERSION) {
    issues.push(issue('CAPABILITY_SPEC_SCHEMA_VERSION_INVALID', 'schemaVersion', 'Capability specification schemaVersion is invalid.'));
  }
  if (candidate.requestId !== validationContext.requestContext.requestId) {
    issues.push(issue('CAPABILITY_SPEC_REQUEST_ID_MISMATCH', 'requestId', 'Capability specification requestId does not match request context.'));
  }
  if (candidate.sourceGapReportHash !== validationContext.gapAnalysis.reportHash) {
    issues.push(issue('CAPABILITY_SPEC_GAP_REPORT_INVALID', 'sourceGapReportHash', 'Capability specification is not bound to the source gap report hash.'));
  }
  if (candidate.registrySnapshotHash !== validationContext.gapAnalysis.registrySnapshotHash) {
    issues.push(issue('CAPABILITY_SPEC_GAP_REPORT_INVALID', 'registrySnapshotHash', 'Capability specification registry snapshot hash does not match gap analysis.'));
  }
  if (validationContext.gapAnalysis.activeCapabilityLockHash !== undefined && candidate.activeCapabilityLockHash !== validationContext.gapAnalysis.activeCapabilityLockHash) {
    issues.push(issue('CAPABILITY_SPEC_GAP_REPORT_INVALID', 'activeCapabilityLockHash', 'Capability specification active capability lock hash does not match gap analysis.'));
  }
  if (candidate.capabilityContractVersion !== CAPABILITY_SPECIFICATION_CONTRACT_VERSION) {
    issues.push(issue('CAPABILITY_SPEC_CONTRACT_VERSION_INVALID', 'capabilityContractVersion', 'Capability specification must target gameplay-capability-package.v1.'));
  }

  issues.push(...validateIdentity(candidate, validationContext.selectedPrimitive));
  issues.push(...validateArrays(candidate));
  issues.push(...validateDependencies(candidate, validationContext));
  issues.push(...validateOwnership(candidate, validationContext));
  issues.push(...validateRuntime(candidate, validationContext));
  issues.push(...validateQa(candidate));
  issues.push(...validateRender(candidate));
  issues.push(...validateSecurity(candidate));

  const normalizedSpec = issues.length === 0 && requiredSpecShapePresent(candidate) ? buildCapabilitySpecificationCandidate(candidateWithoutHash(candidate)) : undefined;
  if (normalizedSpec !== undefined && candidate.specificationHash !== normalizedSpec.specificationHash) {
    issues.push(issue('CAPABILITY_SPEC_HASH_MISMATCH', 'specificationHash', 'Capability specification hash does not match normalized payload.'));
  }

  return buildValidationReport({
    context: validationContext,
    issues,
    normalizedSpec: issues.length === 0 ? normalizedSpec : undefined
  });
}

export function buildCapabilitySpecificationValidationAttestation(input: {
  report: CapabilitySpecificationValidationReport;
  attemptId: string;
  rawSpecificationHash?: string;
  issuer?: Partial<SpecificationValidationAttestation['issuer']>;
  signature?: string;
}): SpecificationValidationAttestation {
  const canonicalSpecificationHash = input.report.specificationHash ?? input.report.normalizedSpec?.specificationHash ?? '';
  const attestationPayloadWithoutId: SpecificationValidationAttestationPayloadWithoutId = {
    artifactKind: CAPABILITY_SPECIFICATION_VALIDATION_ATTESTATION_KIND,
    schemaVersion: CAPABILITY_SPECIFICATION_VALIDATION_ATTESTATION_SCHEMA_VERSION,
    trustedArtifactRef: {
      namespace: CAPABILITY_SPECIFICATION_VALIDATION_TRUSTED_NAMESPACE,
      artifactKind: CAPABILITY_SPECIFICATION_VALIDATION_ATTESTATION_KIND
    },
    subject: {
      requestId: input.report.requestId,
      attemptId: input.attemptId,
      rawSpecificationHash: input.rawSpecificationHash ?? canonicalSpecificationHash,
      canonicalSpecificationHash,
      registrySnapshotHash: input.report.registrySnapshotHash
    },
    predicate: {
      validationReportHash: input.report.reportHash,
      validationStatus: input.report.status === 'valid' ? 'PASSED' as const : 'FAILED' as const,
      validatorId: CAPABILITY_SPECIFICATION_VALIDATOR_ID,
      validatorVersion: CAPABILITY_SPECIFICATION_VALIDATOR_VERSION,
      validationRulesetHash: CAPABILITY_SPECIFICATION_VALIDATION_RULESET_HASH,
      canonicalizationVersion: CAPABILITY_SPECIFICATION_VALIDATION_CANONICALIZATION_VERSION,
      requiredChecks: [...CAPABILITY_SPECIFICATION_VALIDATION_REQUIRED_CHECKS]
    },
    issuer: {
      serviceId: input.issuer?.serviceId ?? 'maker-api.capability-specification-validator',
      ...(input.issuer?.keyId === undefined ? {} : { keyId: input.issuer.keyId }),
      issuedAt: input.issuer?.issuedAt ?? '2026-06-19T00:00:00.000Z'
    },
    ...(input.signature === undefined ? {} : { signature: input.signature })
  };
  const attestationId = `specval_att_${hashStableJson(attestationPayloadWithoutId).slice('fnv1a_'.length)}`;
  const payload: Omit<SpecificationValidationAttestation, 'attestationHash'> = {
    ...attestationPayloadWithoutId,
    attestationId,
    trustedArtifactRef: {
      ...attestationPayloadWithoutId.trustedArtifactRef,
      artifactId: attestationId
    }
  };
  return { ...payload, attestationHash: hashStableJson(payload) };
}

function validateGapContext(context: CapabilitySpecificationValidationContext): CapabilitySpecificationValidationIssue[] {
  const issues: CapabilitySpecificationValidationIssue[] = [];
  const reportHash = recomputeGapReportHash(context.gapAnalysis);
  if (
    context.gapAnalysis.artifactKind !== CAPABILITY_GAP_ANALYSIS_REPORT_KIND ||
    context.gapAnalysis.schemaVersion !== CAPABILITY_GAP_ANALYSIS_SCHEMA_VERSION ||
    context.gapAnalysis.reportHash !== reportHash
  ) {
    issues.push(issue('CAPABILITY_SPEC_GAP_REPORT_INVALID', 'gapAnalysis', 'Source gap analysis report failed integrity validation.'));
  }
  if (context.gapAnalysis.requestId !== context.requestContext.requestId) {
    issues.push(issue('CAPABILITY_SPEC_REQUEST_ID_MISMATCH', 'gapAnalysis.requestId', 'Gap analysis requestId does not match request context.'));
  }
  if (context.gapAnalysis.outcome !== 'NEW_BOUNDED_CAPABILITY_REQUIRED') {
    issues.push(issue('CAPABILITY_SPEC_OUTCOME_INVALID', 'gapAnalysis.outcome', 'Capability specification can only be created from NEW_BOUNDED_CAPABILITY_REQUIRED gap analysis.'));
  }
  const primitive = context.gapAnalysis.missingPrimitives.find((item) => item.proposedId === context.selectedPrimitive.proposedId);
  if (primitive === undefined || primitive.semanticContract !== context.selectedPrimitive.semanticContract) {
    issues.push(issue('CAPABILITY_SPEC_PRIMITIVE_MISMATCH', 'selectedPrimitive', 'Selected primitive is not part of the source gap analysis.'));
  } else if (hashStableJson(primitive) !== hashStableJson(context.selectedPrimitive)) {
    issues.push(issue('CAPABILITY_SPEC_PRIMITIVE_MISMATCH', 'selectedPrimitive', 'Selected primitive does not exactly match the source gap analysis primitive.'));
  }
  return issues;
}

function findSourcePrimitive(context: CapabilitySpecificationValidationContext): MissingCapabilityPrimitive | undefined {
  return context.gapAnalysis.missingPrimitives.find((item) => item.proposedId === context.selectedPrimitive.proposedId);
}

function validateIdentity(candidate: Partial<CapabilitySpecificationCandidate>, primitive: MissingCapabilityPrimitive): CapabilitySpecificationValidationIssue[] {
  const issues: CapabilitySpecificationValidationIssue[] = [];
  if (typeof candidate.proposedCapabilityId !== 'string' || !GameplayCapabilityIdSchema.safeParse(candidate.proposedCapabilityId).success) {
    issues.push(issue('CAPABILITY_SPEC_ID_INVALID', 'proposedCapabilityId', 'Capability ID must follow <domain>.<name>.v<major>.'));
  } else if (FORBIDDEN_CAPABILITY_ID_TERMS.some((term) => candidate.proposedCapabilityId?.includes(term))) {
    issues.push(issue('CAPABILITY_SPEC_ID_FORBIDDEN_TERM', 'proposedCapabilityId', 'Capability ID must describe a reusable mechanic, not a profile, engine, template, IP, or marketing phrase.'));
  }
  if (candidate.proposedCapabilityId !== primitive.proposedId) {
    issues.push(issue('CAPABILITY_SPEC_PRIMITIVE_MISMATCH', 'proposedCapabilityId', 'Capability ID must match the selected missing primitive proposedId.'));
  }
  if (candidate.semanticContract !== primitive.semanticContract) {
    issues.push(issue('CAPABILITY_SPEC_PRIMITIVE_MISMATCH', 'semanticContract', 'Semantic contract must match the selected missing primitive.'));
  }
  if (typeof candidate.proposedPackageVersion !== 'string' || !PACKAGE_VERSION_PATTERN.test(candidate.proposedPackageVersion)) {
    issues.push(issue('CAPABILITY_SPEC_ID_INVALID', 'proposedPackageVersion', 'Package version must be a stable semver major.minor.patch string.'));
  }
  return issues;
}

function validateArrays(candidate: Partial<CapabilitySpecificationCandidate>): CapabilitySpecificationValidationIssue[] {
  const issues: CapabilitySpecificationValidationIssue[] = [];
  const requiredArrays: Array<[string, unknown]> = [
    ['explicitNonGoals', candidate.explicitNonGoals],
    ['runtimeFamilies', candidate.runtimeFamilies],
    ['dependencies', candidate.dependencies],
    ['optionalDependencies', candidate.optionalDependencies],
    ['conflictsWith', candidate.conflictsWith],
    ['provides', candidate.provides],
    ['acceptanceScenarios', candidate.acceptanceScenarios]
  ];
  for (const [path, value] of requiredArrays) {
    if (!Array.isArray(value)) {
      issues.push(issue('CAPABILITY_SPEC_ARRAY_INVALID', path, `${path} must be an array.`));
    }
  }
  for (const runtimeFamily of candidate.runtimeFamilies ?? []) {
    if (!RuntimeFamilyIdSchema.safeParse(runtimeFamily).success) {
      issues.push(issue('CAPABILITY_SPEC_ARRAY_INVALID', 'runtimeFamilies', `Runtime family ${String(runtimeFamily)} is invalid.`));
    }
  }
  if ((candidate.explicitNonGoals ?? []).length === 0) {
    issues.push(issue('CAPABILITY_SPEC_REQUIRED_FIELD_MISSING', 'explicitNonGoals', 'Capability specification must preserve explicit non-goals.'));
  }
  return issues;
}

function validateDependencies(
  candidate: Partial<CapabilitySpecificationCandidate>,
  context: CapabilitySpecificationValidationContext
): CapabilitySpecificationValidationIssue[] {
  const issues: CapabilitySpecificationValidationIssue[] = [];
  const dependencyInterfaces = new Map((context.dependencyInterfaces ?? []).map((entry) => [entry.capabilityId, new Set(entry.interfaces)]));
  const allDependencies = [...safeDependencies(candidate.dependencies, 'dependencies', issues), ...safeDependencies(candidate.optionalDependencies, 'optionalDependencies', issues)];
  for (const dependency of allDependencies) {
    if (dependency.capabilityId === candidate.proposedCapabilityId) {
      issues.push(issue('CAPABILITY_SPEC_DEPENDENCY_CYCLE', 'dependencies', 'Capability specification cannot depend on itself.'));
    }
    if (!VERSION_RANGE_PATTERN.test(dependency.versionRange)) {
      issues.push(issue('CAPABILITY_SPEC_REQUIRED_FIELD_MISSING', 'dependencies.versionRange', `Dependency ${dependency.capabilityId} must include a semantic version range.`));
    }
    const provided = dependencyInterfaces.get(dependency.capabilityId);
    if (provided === undefined || !provided.has(dependency.requiredInterface)) {
      issues.push(issue('CAPABILITY_SPEC_DEPENDENCY_INTERFACE_MISSING', 'dependencies.requiredInterface', `Dependency ${dependency.capabilityId} does not provide required interface ${dependency.requiredInterface}.`));
    }
  }
  const providedInterfaceIds = new Set(safeProvidedInterfaces(candidate.provides, issues).map((provided) => provided.interfaceId));
  for (const requiredInterface of context.selectedPrimitive.providedInterfaces) {
    if (!providedInterfaceIds.has(requiredInterface)) {
      issues.push(issue('CAPABILITY_SPEC_PROVIDED_INTERFACE_MISSING', 'provides', `Specification must define provided interface ${requiredInterface}.`));
    }
  }
  return issues;
}

function validateOwnership(
  candidate: Partial<CapabilitySpecificationCandidate>,
  context: CapabilitySpecificationValidationContext
): CapabilitySpecificationValidationIssue[] {
  const issues: CapabilitySpecificationValidationIssue[] = [];
  const ownedPaths = isDslSection(candidate.dsl) ? candidate.dsl.ownedPaths : [];
  for (const requiredPath of context.selectedPrimitive.ownedDslPaths) {
    if (!ownedPaths.includes(requiredPath)) {
      issues.push(issue('CAPABILITY_SPEC_OWNED_PATH_OUTSIDE_DOMAIN', 'dsl.ownedPaths', `Specification must include missing primitive owned DSL path ${requiredPath}.`));
    }
  }
  for (const path of ownedPaths) {
    if (!path.startsWith('/')) {
      issues.push(issue('CAPABILITY_SPEC_OWNED_PATH_OUTSIDE_DOMAIN', 'dsl.ownedPaths', `Owned path ${path} must be a JSON pointer.`));
    }
    if (context.existingOwnedDslPaths?.some((existing) => jsonPointerOverlaps(path, existing)) === true) {
      issues.push(issue('CAPABILITY_SPEC_OWNERSHIP_OVERLAP', 'dsl.ownedPaths', `Owned path ${path} overlaps an existing registry path.`));
    }
  }
  if (!sameStringSet(ownedPaths, context.selectedPrimitive.ownedDslPaths)) {
    issues.push(issue('CAPABILITY_SPEC_OWNERSHIP_OVERLAP', 'dsl.ownedPaths', 'Specification owned DSL paths must exactly match the selected missing primitive boundary.'));
  }
  for (const requiredNodeKind of context.selectedPrimitive.ownedIrNodeKinds) {
    if (!isIrSection(candidate.ir) || !candidate.ir.ownedNodeKinds.includes(requiredNodeKind)) {
      issues.push(issue('CAPABILITY_SPEC_OWNED_PATH_OUTSIDE_DOMAIN', 'ir.ownedNodeKinds', `Specification must include missing primitive IR node kind ${requiredNodeKind}.`));
    }
  }
  const ownedNodeKinds = isIrSection(candidate.ir) ? candidate.ir.ownedNodeKinds : [];
  if (!sameStringSet(ownedNodeKinds, context.selectedPrimitive.ownedIrNodeKinds)) {
    issues.push(issue('CAPABILITY_SPEC_OWNERSHIP_OVERLAP', 'ir.ownedNodeKinds', 'Specification owned IR node kinds must exactly match the selected missing primitive boundary.'));
  }
  return issues;
}

function validateRuntime(
  candidate: Partial<CapabilitySpecificationCandidate>,
  context: CapabilitySpecificationValidationContext
): CapabilitySpecificationValidationIssue[] {
  const issues: CapabilitySpecificationValidationIssue[] = [];
  const runtime = candidate.runtime;
  if (!isRuntimeSection(runtime)) {
    return [issue('CAPABILITY_SPEC_REQUIRED_FIELD_MISSING', 'runtime', 'Runtime section is required.')];
  }
  const allowedRuntimeServices = new Set(context.allowedRuntimeServices ?? context.selectedPrimitive.requiredDependencies.map((dependency) => dependency.requiredInterface));
  for (const service of runtime.requiredServices) {
    if (!allowedRuntimeServices.has(service)) {
      issues.push(issue('CAPABILITY_SPEC_RUNTIME_SERVICE_UNKNOWN', 'runtime.requiredServices', `Runtime service ${service} is not allow-listed.`));
    }
  }
  if (!CAPABILITY_SPEC_PATCH_POLICIES.includes(runtime.patchPolicy)) {
    issues.push(issue('CAPABILITY_SPEC_PATCH_POLICY_INVALID', 'runtime.patchPolicy', 'Runtime patch policy is invalid.'));
  }
  if (runtime.patchPolicy === 'hot' && (!hasReversibleState(runtime.stateModel) || runtime.teardownRequirements.length === 0)) {
    issues.push(issue('CAPABILITY_SPEC_PATCH_POLICY_INVALID', 'runtime.patchPolicy', 'Hot patch specification requires reversible state and teardown requirements.'));
  }
  if (runtime.requiredServices.length > 0 && !hasPerformanceBudget(candidate.budgets)) {
    issues.push(issue('CAPABILITY_SPEC_PERFORMANCE_BUDGET_MISSING', 'budgets', 'Runtime-affecting specification requires at least one performance budget.'));
  }
  return issues;
}

function validateQa(candidate: Partial<CapabilitySpecificationCandidate>): CapabilitySpecificationValidationIssue[] {
  const issues: CapabilitySpecificationValidationIssue[] = [];
  const requiredProbes = isQaSection(candidate.qa) ? candidate.qa.requiredProbes : [];
  const scenarios = Array.isArray(candidate.acceptanceScenarios) ? candidate.acceptanceScenarios.filter(isScenarioLike) : [];
  if (requiredProbes.length === 0 || scenarios.length === 0) {
    issues.push(issue('CAPABILITY_SPEC_QA_INSUFFICIENT', 'qa.requiredProbes', 'Capability specification requires independent QA probes and acceptance scenarios.'));
  }
  for (const scenario of [...requiredProbes, ...scenarios]) {
    if (
      scenario.given.length === 0 ||
      scenario.actions.length === 0 ||
      scenario.observations.length === 0 ||
      scenario.assertions.length === 0 ||
      scenario.tolerance.length === 0 ||
      scenario.requiredEvidenceSource.length === 0
    ) {
      issues.push(issue('CAPABILITY_SPEC_QA_INSUFFICIENT', 'acceptanceScenarios', 'QA scenario must include given/actions/observations/assertions/tolerance/evidence source.'));
    }
    if (scenario.negativeAssertions.length === 0) {
      issues.push(issue('CAPABILITY_SPEC_NEGATIVE_ASSERTION_MISSING', 'acceptanceScenarios.negativeAssertions', 'State-changing capability requires negative assertions.'));
    }
  }
  return issues;
}

function validateRender(candidate: Partial<CapabilitySpecificationCandidate>): CapabilitySpecificationValidationIssue[] {
  const semanticContract = candidate.semanticContract ?? '';
  const renderRequired = /visual|render|sprite|animation|asset|feedback/i.test(semanticContract);
  if (renderRequired && (!isRenderSection(candidate.render) || candidate.render.renderEvidence.length === 0)) {
    return [issue('CAPABILITY_SPEC_RENDER_CONTRACT_MISSING', 'render', 'Render-affecting specification requires render contract and Step33 evidence requirement.')];
  }
  return [];
}

function validateSecurity(candidate: Partial<CapabilitySpecificationCandidate>): CapabilitySpecificationValidationIssue[] {
  const issues: CapabilitySpecificationValidationIssue[] = [];
  const security = candidate.security;
  if (!isSecuritySection(security)) {
    return [issue('CAPABILITY_SPEC_REQUIRED_FIELD_MISSING', 'security', 'Security section is required.')];
  }
  for (const privilege of security.requiredPrivileges) {
    if (DEFAULT_FORBIDDEN_PRIVILEGES.includes(privilege)) {
      issues.push(issue('CAPABILITY_SPEC_SECURITY_PRIVILEGE_INVALID', 'security.requiredPrivileges', `Forbidden privilege ${privilege} cannot be required by an auto-synthesized spec.`));
    }
  }
  for (const privilege of DEFAULT_FORBIDDEN_PRIVILEGES) {
    if (!security.forbiddenPrivileges.includes(privilege)) {
      issues.push(issue('CAPABILITY_SPEC_SECURITY_PRIVILEGE_INVALID', 'security.forbiddenPrivileges', `Security section must explicitly forbid ${privilege}.`));
    }
  }
  return issues;
}

function normalizeSpecificationPayload(input: Omit<CapabilitySpecificationCandidate, 'specificationHash'>): Omit<CapabilitySpecificationCandidate, 'specificationHash'> {
  return {
    ...input,
    explicitNonGoals: uniqueStrings(input.explicitNonGoals),
    runtimeFamilies: uniqueStrings(input.runtimeFamilies),
    dependencies: normalizeDependencies(input.dependencies),
    optionalDependencies: normalizeDependencies(input.optionalDependencies),
    conflictsWith: [...input.conflictsWith].sort((left, right) => left.capabilityId.localeCompare(right.capabilityId)),
    provides: [...input.provides].sort((left, right) => left.interfaceId.localeCompare(right.interfaceId)),
    dsl: { ...input.dsl, ownedPaths: uniqueStrings(input.dsl.ownedPaths), normalizationRules: uniqueStrings(input.dsl.normalizationRules), validationRules: [...input.dsl.validationRules].sort((left, right) => left.ruleId.localeCompare(right.ruleId)) },
    ir: { ...input.ir, ownedNodeKinds: uniqueStrings(input.ir.ownedNodeKinds), compileRules: uniqueStrings(input.ir.compileRules), mergePolicy: uniqueStrings(input.ir.mergePolicy) },
    runtime: {
      ...input.runtime,
      requiredServices: uniqueStrings(input.runtime.requiredServices),
      lifecycle: uniqueStrings(input.runtime.lifecycle),
      deterministicRules: uniqueStrings(input.runtime.deterministicRules),
      teardownRequirements: uniqueStrings(input.runtime.teardownRequirements),
      ownedStateKeys: uniqueStrings(input.runtime.ownedStateKeys),
      ownedEvents: uniqueStrings(input.runtime.ownedEvents)
    },
    amendments: { ...input.amendments, supportedOperations: uniqueStrings(input.amendments.supportedOperations), expectedEffects: uniqueStrings(input.amendments.expectedEffects) },
    qa: {
      ...input.qa,
      requiredProbes: [...input.qa.requiredProbes].sort((left, right) => left.probeId.localeCompare(right.probeId)),
      externalAssertions: uniqueStrings(input.qa.externalAssertions),
      mutationTargets: uniqueStrings(input.qa.mutationTargets),
      failureScenarios: uniqueStrings(input.qa.failureScenarios)
    },
    ...(input.render === undefined ? {} : { render: { ...input.render, assetRoles: uniqueStrings(input.render.assetRoles), sceneBindings: uniqueStrings(input.render.sceneBindings), renderEvidence: uniqueStrings(input.render.renderEvidence) } }),
    security: { ...input.security, requiredPrivileges: uniqueStrings(input.security.requiredPrivileges), forbiddenPrivileges: uniqueStrings(input.security.forbiddenPrivileges), dataAccess: uniqueStrings(input.security.dataAccess) },
    acceptanceScenarios: [...input.acceptanceScenarios].sort((left, right) => left.scenarioId.localeCompare(right.scenarioId))
  };
}

function normalizeDependencies(dependencies: readonly CapabilitySpecDependency[]): CapabilitySpecDependency[] {
  return [...dependencies].sort((left, right) => `${left.capabilityId}:${left.requiredInterface}`.localeCompare(`${right.capabilityId}:${right.requiredInterface}`));
}

function buildValidationReport(input: {
  context: CapabilitySpecificationValidationContext;
  issues: readonly CapabilitySpecificationValidationIssue[];
  normalizedSpec?: CapabilitySpecificationCandidate;
}): CapabilitySpecificationValidationReport {
  const payload: Omit<CapabilitySpecificationValidationReport, 'reportHash'> = {
    artifactKind: CAPABILITY_SPECIFICATION_VALIDATION_REPORT_KIND,
    schemaVersion: CAPABILITY_SPECIFICATION_VALIDATION_REPORT_SCHEMA_VERSION,
    requestId: input.context.requestContext.requestId,
    sourceGapReportHash: input.context.gapAnalysis.reportHash,
    registrySnapshotHash: input.context.gapAnalysis.registrySnapshotHash,
    status: input.issues.length === 0 ? 'valid' : 'invalid',
    issues: [...input.issues].sort(compareIssues),
    ...(input.normalizedSpec === undefined ? {} : { normalizedSpec: input.normalizedSpec, specificationHash: input.normalizedSpec.specificationHash })
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

function requiredSpecShapePresent(candidate: Partial<CapabilitySpecificationCandidate>): candidate is CapabilitySpecificationCandidate {
  return REQUIRED_SPEC_KEYS.every((key) => key in candidate);
}

function candidateWithoutHash(candidate: CapabilitySpecificationCandidate): Omit<CapabilitySpecificationCandidate, 'specificationHash'> {
  const { specificationHash: _specificationHash, ...payload } = candidate;
  return payload;
}

function recomputeGapReportHash(report: CapabilityGapAnalysis): string {
  const { reportHash: _reportHash, ...payload } = report;
  return hashStableJson(payload);
}

function unknownKeyIssues(record: Record<string, unknown>, allowedKeys: ReadonlySet<string>, path: string): CapabilitySpecificationValidationIssue[] {
  return Object.keys(record)
    .filter((key) => !allowedKeys.has(key))
    .map((key) => issue('CAPABILITY_SPEC_UNKNOWN_FIELD', `${path}.${key}`, `Unknown capability specification field ${key}.`));
}

function forbiddenKeyIssues(value: unknown, path = '<root>'): CapabilitySpecificationValidationIssue[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => forbiddenKeyIssues(item, `${path}.${index}`));
  }
  if (!isRecord(value)) {
    return [];
  }
  return Object.entries(value).flatMap(([key, nested]) => [
    ...(FORBIDDEN_SPEC_KEYS.has(key) ? [issue('CAPABILITY_SPEC_FORBIDDEN_FIELD', `${path}.${key}`, `Forbidden specification authority field ${key} is not allowed.`)] : []),
    ...forbiddenKeyIssues(nested, `${path}.${key}`)
  ]);
}

function hasReversibleState(stateModel: unknown): boolean {
  return isRecord(stateModel) && stateModel.reversible === true;
}

function hasPerformanceBudget(budgets: CapabilitySpecBudgets | undefined): boolean {
  return budgets !== undefined && Object.values(budgets).some((value) => typeof value === 'number' && Number.isFinite(value) && value > 0);
}

function isRuntimeSection(value: unknown): value is CapabilitySpecRuntimeSection {
  return isRecord(value) &&
    isStringArray(value.requiredServices) &&
    isStringArray(value.lifecycle) &&
    isStringArray(value.deterministicRules) &&
    CAPABILITY_SPEC_PATCH_POLICIES.includes(value.patchPolicy as CapabilitySpecPatchPolicy) &&
    isStringArray(value.teardownRequirements) &&
    isStringArray(value.ownedStateKeys) &&
    isStringArray(value.ownedEvents);
}

function isQaSection(value: unknown): value is CapabilitySpecQaSection {
  return isRecord(value) &&
    Array.isArray(value.requiredProbes) &&
    value.requiredProbes.every(isScenarioLike) &&
    isStringArray(value.externalAssertions) &&
    isStringArray(value.mutationTargets) &&
    isStringArray(value.failureScenarios);
}

function isRenderSection(value: unknown): value is CapabilitySpecRenderSection {
  return isRecord(value) &&
    isStringArray(value.assetRoles) &&
    isStringArray(value.sceneBindings) &&
    CAPABILITY_SPEC_FALLBACK_POLICIES.includes(value.fallbackPolicy as CapabilitySpecFallbackPolicy) &&
    isStringArray(value.renderEvidence);
}

function isSecuritySection(value: unknown): value is CapabilitySpecSecuritySection {
  return isRecord(value) &&
    isStringArray(value.requiredPrivileges) &&
    isStringArray(value.forbiddenPrivileges) &&
    isStringArray(value.dataAccess);
}

function isDslSection(value: unknown): value is CapabilitySpecDslSection {
  return isRecord(value) &&
    isStringArray(value.ownedPaths) &&
    isStringArray(value.normalizationRules) &&
    Array.isArray(value.validationRules) &&
    Array.isArray(value.examples);
}

function isIrSection(value: unknown): value is CapabilitySpecIrSection {
  return isRecord(value) &&
    isStringArray(value.ownedNodeKinds) &&
    isStringArray(value.compileRules) &&
    isStringArray(value.mergePolicy);
}

function safeDependencies(
  value: unknown,
  path: string,
  issues: CapabilitySpecificationValidationIssue[]
): CapabilitySpecDependency[] {
  if (!Array.isArray(value)) {
    issues.push(issue('CAPABILITY_SPEC_ARRAY_INVALID', path, `${path} must be an array.`));
    return [];
  }
  return value.flatMap((item, index) => {
    if (!isRecord(item) || typeof item.capabilityId !== 'string' || typeof item.versionRange !== 'string' || typeof item.requiredInterface !== 'string' || typeof item.reason !== 'string') {
      issues.push(issue('CAPABILITY_SPEC_REQUIRED_FIELD_MISSING', `${path}.${index}`, `${path}.${index} must include capabilityId, versionRange, requiredInterface and reason.`));
      return [];
    }
    return [item as CapabilitySpecDependency];
  });
}

function safeProvidedInterfaces(value: unknown, issues: CapabilitySpecificationValidationIssue[]): CapabilitySpecProvidedInterface[] {
  if (!Array.isArray(value)) {
    issues.push(issue('CAPABILITY_SPEC_ARRAY_INVALID', 'provides', 'provides must be an array.'));
    return [];
  }
  return value.flatMap((item, index) => {
    if (!isRecord(item) || typeof item.interfaceId !== 'string' || typeof item.description !== 'string') {
      issues.push(issue('CAPABILITY_SPEC_PROVIDED_INTERFACE_MISSING', `provides.${index}`, 'provided interface must include interfaceId and description.'));
      return [];
    }
    return [item as CapabilitySpecProvidedInterface];
  });
}

function isScenarioLike(value: unknown): value is CapabilitySpecQaProbe & CapabilitySpecAcceptanceScenario {
  return isRecord(value) &&
    isStringArray(value.given) &&
    typeof value.when === 'string' &&
    isStringArray(value.actions) &&
    isStringArray(value.observations) &&
    isStringArray(value.assertions) &&
    isStringArray(value.negativeAssertions) &&
    typeof value.tolerance === 'string' &&
    typeof value.requiredEvidenceSource === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function jsonPointerOverlaps(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort();
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  const leftValues = uniqueStrings(left);
  const rightValues = uniqueStrings(right);
  return leftValues.length === rightValues.length && leftValues.every((value, index) => value === rightValues[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function issue(
  code: CapabilitySpecificationValidationIssue['code'],
  path: string,
  message: string
): CapabilitySpecificationValidationIssue {
  return { code, severity: 'error', path, message };
}

function compareIssues(left: CapabilitySpecificationValidationIssue, right: CapabilitySpecificationValidationIssue): number {
  return `${left.path}:${left.code}:${left.message}`.localeCompare(`${right.path}:${right.code}:${right.message}`);
}
