import { hashStableJson } from '../gameplay-capabilities/stable-json.js';

export const GAMEPLAY_DESIGN_REQUEST_SCHEMA_VERSION = 'step36.gameplay-design-request.v1';
export const GAMEPLAY_DESIGN_PLAN_SCHEMA_VERSION = 'step36.gameplay-design-plan.v1';
export const GAMEPLAY_DESIGN_VALIDATION_REPORT_KIND = 'gameplay_design_validation_report';
export const GAMEPLAY_DESIGN_VALIDATION_REPORT_SCHEMA_VERSION = 'step36.gameplay-design-validation-report.v1';

export const GAMEPLAY_DESIGN_ORIGINS = ['initial_generation', 'step34_amendment', 'maintainer_spike'] as const;
export const GAMEPLAY_DESIGN_LANGUAGES = ['zh', 'en'] as const;
export const GAMEPLAY_DESIGN_TARGET_KINDS = ['entity', 'behavior', 'weapon', 'projectile', 'scene', 'goal'] as const;

export type GameplayDesignOrigin = (typeof GAMEPLAY_DESIGN_ORIGINS)[number];
export type GameplayDesignLanguage = (typeof GAMEPLAY_DESIGN_LANGUAGES)[number];
export type GameplayDesignTargetKind = (typeof GAMEPLAY_DESIGN_TARGET_KINDS)[number];

export type GameplayDesignTargetRef = {
  kind: GameplayDesignTargetKind;
  ref: string;
};

export type GameplayDesignSynthesisRequest = {
  schemaVersion: typeof GAMEPLAY_DESIGN_REQUEST_SCHEMA_VERSION;
  requestId: string;
  origin: GameplayDesignOrigin;
  projectId?: string;
  baseRunId?: string;
  linkedAmendmentProposalId?: string;
  sourceText: string;
  language: GameplayDesignLanguage;
  runtimeFamily: string;
  activeProfileId?: string;
  activeCapabilityLockHash?: string;
  selectedTargets?: GameplayDesignTargetRef[];
  preservedConstraints: string[];
  userAcceptanceHints: string[];
  baseArtifactHashes?: {
    gameDsl?: string;
    gameIr?: string;
    sceneIr?: string;
    assetManifest?: string;
  };
  idempotencyKey: string;
  createdAt: string;
};

export type ExpectedEffectSpec = {
  subject: string;
  observableChange: string;
  measurement: string;
  assertion: string;
};

export type CapabilityAcceptanceScenario = {
  scenarioId: string;
  action: string;
  observation: string;
  assertion: string;
};

export type ProposedCapabilityRequirement = {
  semanticName: string;
  requiredInterfaces: string[];
  requiredEvents: string[];
  requiredRuntimeServices: string[];
  suggestedCapabilityIds: string[];
  reason: string;
  proposed: true;
};

export type ProposedGameplayMechanic = {
  mechanicId: string;
  description: string;
  actors: string[];
  trigger: string;
  stateChanges: string[];
  constraints: string[];
  expectedEffects: ExpectedEffectSpec[];
  balanceParameters: string[];
  existingMechanicInteractions: string[];
};

export type GameplayDesignModelProvenance = {
  provider: string;
  model: string;
  invocationId: string;
  promptVersion: string;
};

export type GameplayDesignPlan = {
  schemaVersion: typeof GAMEPLAY_DESIGN_PLAN_SCHEMA_VERSION;
  requestId: string;
  summary: string;
  playerFantasy: string;
  coreLoop: string[];
  playerVerbs: string[];
  challengeSources: string[];
  successConditions: string[];
  failureConditions: string[];
  feedbackRequirements: string[];
  proposedMechanics: ProposedGameplayMechanic[];
  preservedConstraints: string[];
  acceptanceScenarios: CapabilityAcceptanceScenario[];
  proposedCapabilityRequirements: ProposedCapabilityRequirement[];
  modelProvenance: GameplayDesignModelProvenance;
};

export type GameplayDesignIssue = {
  code:
    | 'GAMEPLAY_DESIGN_NOT_OBJECT'
    | 'GAMEPLAY_DESIGN_UNKNOWN_FIELD'
    | 'GAMEPLAY_DESIGN_FORBIDDEN_FIELD'
    | 'GAMEPLAY_DESIGN_SCHEMA_VERSION_INVALID'
    | 'GAMEPLAY_DESIGN_REQUEST_ID_MISMATCH'
    | 'GAMEPLAY_DESIGN_REQUIRED_FIELD_MISSING'
    | 'GAMEPLAY_DESIGN_ENUM_INVALID'
    | 'GAMEPLAY_DESIGN_ARRAY_INVALID'
    | 'GAMEPLAY_DESIGN_ACCEPTANCE_SCENARIO_INVALID'
    | 'GAMEPLAY_DESIGN_EXPECTED_EFFECT_INVALID'
    | 'GAMEPLAY_DESIGN_MECHANIC_INCOMPLETE'
    | 'GAMEPLAY_DESIGN_REQUIREMENT_NOT_PROPOSED'
    | 'GAMEPLAY_DESIGN_AMENDMENT_PRESERVATION_MISSING'
    | 'GAMEPLAY_DESIGN_CONTRADICTION_DETECTED'
    | 'GAMEPLAY_DESIGN_CLARIFICATION_REQUIRED'
    | 'GAMEPLAY_DESIGN_JSON_PARSE_FAILED'
    | 'GAMEPLAY_DESIGN_JSON_REPAIR_FAILED';
  severity: 'error' | 'clarification';
  message: string;
  path: string;
};

export type GameplayDesignValidationReport = {
  artifactKind: typeof GAMEPLAY_DESIGN_VALIDATION_REPORT_KIND;
  schemaVersion: typeof GAMEPLAY_DESIGN_VALIDATION_REPORT_SCHEMA_VERSION;
  requestId: string;
  status: 'valid' | 'needs_clarification' | 'invalid';
  issues: GameplayDesignIssue[];
  normalizedPlan?: GameplayDesignPlan;
  clarificationRequest?: {
    requestId: string;
    questions: string[];
  };
  reportHash: string;
};

export type GameplayDesignRequestContext = {
  requestId: string;
  origin: GameplayDesignOrigin;
  sourceText: string;
  selectedTargets?: readonly GameplayDesignTargetRef[];
};

export type GameplayDesignJsonParseResult = {
  status: 'parsed' | 'repaired' | 'failed';
  attempts: number;
  rawPlan?: unknown;
  validationReport?: GameplayDesignValidationReport;
  issues: GameplayDesignIssue[];
};

export type GameplayDesignValidationReportIntegrityIssue = {
  code:
    | 'GAMEPLAY_DESIGN_REPORT_ARTIFACT_KIND_INVALID'
    | 'GAMEPLAY_DESIGN_REPORT_SCHEMA_VERSION_INVALID'
    | 'GAMEPLAY_DESIGN_REPORT_REQUEST_ID_MISMATCH'
    | 'GAMEPLAY_DESIGN_REPORT_STATUS_MISMATCH'
    | 'GAMEPLAY_DESIGN_REPORT_HASH_MISMATCH'
    | 'GAMEPLAY_DESIGN_REPORT_NORMALIZED_PLAN_MISSING'
    | 'GAMEPLAY_DESIGN_REPORT_NORMALIZED_PLAN_REQUEST_ID_MISMATCH'
    | 'GAMEPLAY_DESIGN_REPORT_NORMALIZED_PLAN_INVALID';
  message: string;
};

export type GameplayDesignValidationReportIntegrity = {
  status: 'valid' | 'invalid';
  issues: GameplayDesignValidationReportIntegrityIssue[];
  expectedStatus: GameplayDesignValidationReport['status'];
  expectedReportHash: string;
};

const REQUEST_ALLOWED_KEYS = new Set([
  'schemaVersion',
  'requestId',
  'origin',
  'projectId',
  'baseRunId',
  'linkedAmendmentProposalId',
  'sourceText',
  'language',
  'runtimeFamily',
  'activeProfileId',
  'activeCapabilityLockHash',
  'selectedTargets',
  'preservedConstraints',
  'userAcceptanceHints',
  'baseArtifactHashes',
  'idempotencyKey',
  'createdAt'
]);

const PLAN_ALLOWED_KEYS = new Set([
  'schemaVersion',
  'requestId',
  'summary',
  'playerFantasy',
  'coreLoop',
  'playerVerbs',
  'challengeSources',
  'successConditions',
  'failureConditions',
  'feedbackRequirements',
  'proposedMechanics',
  'preservedConstraints',
  'acceptanceScenarios',
  'proposedCapabilityRequirements',
  'modelProvenance'
]);

const MECHANIC_ALLOWED_KEYS = new Set([
  'mechanicId',
  'description',
  'actors',
  'trigger',
  'stateChanges',
  'constraints',
  'expectedEffects',
  'balanceParameters',
  'existingMechanicInteractions'
]);

const EFFECT_ALLOWED_KEYS = new Set(['subject', 'observableChange', 'measurement', 'assertion']);
const SCENARIO_ALLOWED_KEYS = new Set(['scenarioId', 'action', 'observation', 'assertion']);
const REQUIREMENT_ALLOWED_KEYS = new Set(['semanticName', 'requiredInterfaces', 'requiredEvents', 'requiredRuntimeServices', 'suggestedCapabilityIds', 'reason', 'proposed']);
const PROVENANCE_ALLOWED_KEYS = new Set(['provider', 'model', 'invocationId', 'promptVersion']);
const TARGET_ALLOWED_KEYS = new Set(['kind', 'ref']);
const BASE_HASH_ALLOWED_KEYS = new Set(['gameDsl', 'gameIr', 'sceneIr', 'assetManifest']);

const FORBIDDEN_KEYS = new Set([
  'code',
  'sourceCode',
  'sourceFiles',
  'sourceFile',
  'sourceFilePaths',
  'sourceFilePath',
  'files',
  'file',
  'permissions',
  'permission',
  'jsonPatch',
  'jsonPatchPath',
  'patch',
  'rawCodePatch',
  'shellCommand',
  'shellCommands',
  'command',
  'commands',
  'npmPackage',
  'npmPackages',
  'npmDependency',
  'npmDependencies',
  'dependency',
  'dependencies',
  'registryMutation',
  'directRegistryMutation',
  'riskTier',
  'approvalStatus',
  'approvalRecommendation',
  'qaPassStatus',
  'runtimeCandidate',
  'supported'
]);

export function validateGameplayDesignSynthesisRequest(input: unknown): GameplayDesignValidationReport {
  const request = isPlainObject(input) ? input : undefined;
  const requestId = getString(request, 'requestId') ?? 'unknown_request';
  const issues = request === undefined
    ? [issue('GAMEPLAY_DESIGN_NOT_OBJECT', 'error', 'Request must be a plain object.', '$')]
    : [
        ...unknownKeyIssues(request, REQUEST_ALLOWED_KEYS, '$'),
        ...forbiddenKeyIssues(request, '$'),
        ...requiredStringIssues(request, ['schemaVersion', 'requestId', 'origin', 'sourceText', 'language', 'runtimeFamily', 'idempotencyKey', 'createdAt'], '$'),
        ...schemaIssue(getString(request, 'schemaVersion'), GAMEPLAY_DESIGN_REQUEST_SCHEMA_VERSION, '$.schemaVersion'),
        ...enumIssue(getString(request, 'origin'), GAMEPLAY_DESIGN_ORIGINS, '$.origin'),
        ...enumIssue(getString(request, 'language'), GAMEPLAY_DESIGN_LANGUAGES, '$.language'),
        ...arrayOfStringIssues(request.preservedConstraints, '$.preservedConstraints'),
        ...arrayOfStringIssues(request.userAcceptanceHints, '$.userAcceptanceHints'),
        ...targetIssues(request.selectedTargets),
        ...baseArtifactHashIssues(request.baseArtifactHashes)
      ];
  return buildValidationReport({ requestId, issues });
}

export function validateGameplayDesignPlan(
  input: unknown,
  context: GameplayDesignRequestContext
): GameplayDesignValidationReport {
  const plan = isPlainObject(input) ? input : undefined;
  const issues = plan === undefined
    ? [issue('GAMEPLAY_DESIGN_NOT_OBJECT', 'error', 'Design plan must be a plain object.', '$')]
    : [
        ...unknownKeyIssues(plan, PLAN_ALLOWED_KEYS, '$'),
        ...forbiddenKeyIssues(plan, '$'),
        ...requiredStringIssues(plan, ['schemaVersion', 'requestId', 'summary', 'playerFantasy'], '$'),
        ...schemaIssue(getString(plan, 'schemaVersion'), GAMEPLAY_DESIGN_PLAN_SCHEMA_VERSION, '$.schemaVersion'),
        ...(getString(plan, 'requestId') === context.requestId
          ? []
          : [issue('GAMEPLAY_DESIGN_REQUEST_ID_MISMATCH', 'error', `Plan requestId must match ${context.requestId}.`, '$.requestId')]),
        ...arrayOfStringIssues(plan.coreLoop, '$.coreLoop'),
        ...arrayOfStringIssues(plan.playerVerbs, '$.playerVerbs'),
        ...arrayOfStringIssues(plan.challengeSources, '$.challengeSources'),
        ...arrayOfStringIssues(plan.successConditions, '$.successConditions'),
        ...arrayOfStringIssues(plan.failureConditions, '$.failureConditions'),
        ...arrayOfStringIssues(plan.feedbackRequirements, '$.feedbackRequirements'),
        ...arrayOfStringIssues(plan.preservedConstraints, '$.preservedConstraints'),
        ...mechanicIssues(plan.proposedMechanics),
        ...acceptanceScenarioIssues(plan.acceptanceScenarios),
        ...capabilityRequirementIssues(plan.proposedCapabilityRequirements),
        ...provenanceIssues(plan.modelProvenance),
        ...preservationIssues(plan.preservedConstraints, context.origin),
        ...clarificationIssues(plan, context),
        ...contradictionIssues(plan)
      ];
  const normalizedPlan = plan === undefined || issues.some((item) => item.severity === 'error')
    ? undefined
    : normalizeGameplayDesignPlan(plan as unknown as GameplayDesignPlan);
  return buildValidationReport({
    requestId: context.requestId,
    issues,
    normalizedPlan
  });
}

export function parseGameplayDesignPlanModelOutput(input: {
  rawText: string;
  requestId: string;
  origin: GameplayDesignOrigin;
  sourceText: string;
  selectedTargets?: readonly GameplayDesignTargetRef[];
  repairOnce?: (rawText: string) => string;
}): GameplayDesignJsonParseResult {
  const first = parseJson(input.rawText);
  if (first.ok) {
    const validationReport = validateGameplayDesignPlan(first.value, {
      requestId: input.requestId,
      origin: input.origin,
      sourceText: input.sourceText,
      selectedTargets: input.selectedTargets
    });
    return { status: 'parsed', attempts: 1, rawPlan: first.value, validationReport, issues: validationReport.issues };
  }
  if (input.repairOnce === undefined) {
    return { status: 'failed', attempts: 1, issues: [jsonIssue('GAMEPLAY_DESIGN_JSON_PARSE_FAILED', first.error)] };
  }
  let repairedText: string;
  try {
    repairedText = input.repairOnce(input.rawText);
  } catch (error) {
    return {
      status: 'failed',
      attempts: 2,
      issues: [jsonIssue('GAMEPLAY_DESIGN_JSON_PARSE_FAILED', first.error), jsonIssue('GAMEPLAY_DESIGN_JSON_REPAIR_FAILED', error instanceof Error ? error.message : String(error))]
    };
  }
  const second = parseJson(repairedText);
  if (!second.ok) {
    return {
      status: 'failed',
      attempts: 2,
      issues: [jsonIssue('GAMEPLAY_DESIGN_JSON_PARSE_FAILED', first.error), jsonIssue('GAMEPLAY_DESIGN_JSON_REPAIR_FAILED', second.error)]
    };
  }
  const validationReport = validateGameplayDesignPlan(second.value, {
    requestId: input.requestId,
    origin: input.origin,
    sourceText: input.sourceText,
    selectedTargets: input.selectedTargets
  });
  return { status: 'repaired', attempts: 2, rawPlan: second.value, validationReport, issues: validationReport.issues };
}

export function canGameplayDesignEnterGapAnalysis(report: GameplayDesignValidationReport, context: GameplayDesignRequestContext): boolean {
  return validateGameplayDesignValidationReportIntegrity(report, context).status === 'valid' && report.status === 'valid';
}

export function validateGameplayDesignValidationReportIntegrity(
  report: GameplayDesignValidationReport,
  context: GameplayDesignRequestContext
): GameplayDesignValidationReportIntegrity {
  const expectedStatus = deriveValidationStatus(report.issues);
  const expectedReportHash = hashStableJson(validationReportPayload(report));
  const normalizedPlanReport = report.normalizedPlan === undefined ? undefined : validateGameplayDesignPlan(report.normalizedPlan, context);
  const issues: GameplayDesignValidationReportIntegrityIssue[] = [
    ...(report.artifactKind === GAMEPLAY_DESIGN_VALIDATION_REPORT_KIND
      ? []
      : [{ code: 'GAMEPLAY_DESIGN_REPORT_ARTIFACT_KIND_INVALID' as const, message: `Expected artifact kind ${GAMEPLAY_DESIGN_VALIDATION_REPORT_KIND}.` }]),
    ...(report.schemaVersion === GAMEPLAY_DESIGN_VALIDATION_REPORT_SCHEMA_VERSION
      ? []
      : [{ code: 'GAMEPLAY_DESIGN_REPORT_SCHEMA_VERSION_INVALID' as const, message: `Expected schema version ${GAMEPLAY_DESIGN_VALIDATION_REPORT_SCHEMA_VERSION}.` }]),
    ...(report.requestId === context.requestId
      ? []
      : [{ code: 'GAMEPLAY_DESIGN_REPORT_REQUEST_ID_MISMATCH' as const, message: `Report requestId must match ${context.requestId}.` }]),
    ...(report.status === expectedStatus
      ? []
      : [{ code: 'GAMEPLAY_DESIGN_REPORT_STATUS_MISMATCH' as const, message: `Report status ${report.status} does not match derived status ${expectedStatus}.` }]),
    ...(report.reportHash === expectedReportHash
      ? []
      : [{ code: 'GAMEPLAY_DESIGN_REPORT_HASH_MISMATCH' as const, message: 'Report hash does not match validation payload.' }]),
    ...(report.status === 'valid' && report.normalizedPlan === undefined
      ? [{ code: 'GAMEPLAY_DESIGN_REPORT_NORMALIZED_PLAN_MISSING' as const, message: 'Valid design report requires normalizedPlan.' }]
      : []),
    ...(report.normalizedPlan !== undefined && report.normalizedPlan.requestId !== report.requestId
      ? [{ code: 'GAMEPLAY_DESIGN_REPORT_NORMALIZED_PLAN_REQUEST_ID_MISMATCH' as const, message: 'normalizedPlan requestId must match report requestId.' }]
      : []),
    ...(normalizedPlanReport !== undefined && normalizedPlanReport.status !== 'valid'
      ? [{ code: 'GAMEPLAY_DESIGN_REPORT_NORMALIZED_PLAN_INVALID' as const, message: 'normalizedPlan must still pass strict design plan validation.' }]
      : [])
  ].sort(compareIntegrityIssues);
  return {
    status: issues.length === 0 ? 'valid' : 'invalid',
    issues,
    expectedStatus,
    expectedReportHash
  };
}

export function normalizeGameplayDesignPlan(plan: GameplayDesignPlan): GameplayDesignPlan {
  return {
    schemaVersion: GAMEPLAY_DESIGN_PLAN_SCHEMA_VERSION,
    requestId: plan.requestId.trim(),
    summary: plan.summary.trim(),
    playerFantasy: plan.playerFantasy.trim(),
    coreLoop: uniqueStrings(plan.coreLoop),
    playerVerbs: uniqueStrings(plan.playerVerbs),
    challengeSources: uniqueStrings(plan.challengeSources),
    successConditions: uniqueStrings(plan.successConditions),
    failureConditions: uniqueStrings(plan.failureConditions),
    feedbackRequirements: uniqueStrings(plan.feedbackRequirements),
    proposedMechanics: plan.proposedMechanics.map((mechanic) => normalizeMechanic(mechanic)),
    preservedConstraints: uniqueStrings(plan.preservedConstraints),
    acceptanceScenarios: plan.acceptanceScenarios.map((scenario) => ({
      scenarioId: scenario.scenarioId.trim(),
      action: scenario.action.trim(),
      observation: scenario.observation.trim(),
      assertion: scenario.assertion.trim()
    })),
    proposedCapabilityRequirements: dedupeRequirements(plan.proposedCapabilityRequirements),
    modelProvenance: {
      provider: plan.modelProvenance.provider.trim(),
      model: plan.modelProvenance.model.trim(),
      invocationId: plan.modelProvenance.invocationId.trim(),
      promptVersion: plan.modelProvenance.promptVersion.trim()
    }
  };
}

function normalizeMechanic(mechanic: ProposedGameplayMechanic): ProposedGameplayMechanic {
  const seed = {
    description: mechanic.description.trim(),
    trigger: mechanic.trigger.trim(),
    actors: uniqueStrings(mechanic.actors.map((actor) => actor.toLowerCase()))
  };
  const mechanicId = mechanic.mechanicId.trim().length === 0 ? `mechanic_${hashStableJson(seed).slice('fnv1a_'.length)}` : mechanic.mechanicId.trim();
  return {
    mechanicId,
    description: seed.description,
    actors: seed.actors,
    trigger: seed.trigger,
    stateChanges: uniqueStrings(mechanic.stateChanges),
    constraints: uniqueStrings(mechanic.constraints),
    expectedEffects: mechanic.expectedEffects.map((effect) => ({
      subject: effect.subject.trim(),
      observableChange: effect.observableChange.trim(),
      measurement: effect.measurement.trim(),
      assertion: effect.assertion.trim()
    })),
    balanceParameters: uniqueStrings(mechanic.balanceParameters),
    existingMechanicInteractions: uniqueStrings(mechanic.existingMechanicInteractions)
  };
}

function mechanicIssues(value: unknown): GameplayDesignIssue[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [issue('GAMEPLAY_DESIGN_ARRAY_INVALID', 'error', 'proposedMechanics must be a non-empty array.', '$.proposedMechanics')];
  }
  return value.flatMap((item, index) => {
    if (!isPlainObject(item)) {
      return [issue('GAMEPLAY_DESIGN_MECHANIC_INCOMPLETE', 'error', 'Mechanic must be an object.', `$.proposedMechanics.${index}`)];
    }
    return [
      ...unknownKeyIssues(item, MECHANIC_ALLOWED_KEYS, `$.proposedMechanics.${index}`),
      ...forbiddenKeyIssues(item, `$.proposedMechanics.${index}`),
      ...requiredStringIssues(item, ['description', 'trigger'], `$.proposedMechanics.${index}`),
      ...arrayOfStringIssues(item.actors, `$.proposedMechanics.${index}.actors`, { nonEmpty: true }),
      ...arrayOfStringIssues(item.stateChanges, `$.proposedMechanics.${index}.stateChanges`, { nonEmpty: true }),
      ...arrayOfStringIssues(item.constraints, `$.proposedMechanics.${index}.constraints`),
      ...effectIssues(item.expectedEffects, `$.proposedMechanics.${index}.expectedEffects`),
      ...arrayOfStringIssues(item.balanceParameters, `$.proposedMechanics.${index}.balanceParameters`, { nonEmpty: true }),
      ...arrayOfStringIssues(item.existingMechanicInteractions, `$.proposedMechanics.${index}.existingMechanicInteractions`, { nonEmpty: true })
    ];
  });
}

function effectIssues(value: unknown, path: string): GameplayDesignIssue[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [issue('GAMEPLAY_DESIGN_EXPECTED_EFFECT_INVALID', 'error', 'expectedEffects must be a non-empty array.', path)];
  }
  return value.flatMap((item, index) => {
    if (!isPlainObject(item)) {
      return [issue('GAMEPLAY_DESIGN_EXPECTED_EFFECT_INVALID', 'error', 'Expected effect must be an object.', `${path}.${index}`)];
    }
    return [
      ...unknownKeyIssues(item, EFFECT_ALLOWED_KEYS, `${path}.${index}`),
      ...forbiddenKeyIssues(item, `${path}.${index}`),
      ...requiredStringIssues(item, ['subject', 'observableChange', 'measurement', 'assertion'], `${path}.${index}`)
    ];
  });
}

function acceptanceScenarioIssues(value: unknown): GameplayDesignIssue[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [issue('GAMEPLAY_DESIGN_ACCEPTANCE_SCENARIO_INVALID', 'error', 'acceptanceScenarios must be a non-empty array.', '$.acceptanceScenarios')];
  }
  return value.flatMap((item, index) => {
    if (!isPlainObject(item)) {
      return [issue('GAMEPLAY_DESIGN_ACCEPTANCE_SCENARIO_INVALID', 'error', 'Acceptance scenario must be an object.', `$.acceptanceScenarios.${index}`)];
    }
    return [
      ...unknownKeyIssues(item, SCENARIO_ALLOWED_KEYS, `$.acceptanceScenarios.${index}`),
      ...forbiddenKeyIssues(item, `$.acceptanceScenarios.${index}`),
      ...requiredStringIssues(item, ['scenarioId', 'action', 'observation', 'assertion'], `$.acceptanceScenarios.${index}`)
    ];
  });
}

function capabilityRequirementIssues(value: unknown): GameplayDesignIssue[] {
  if (!Array.isArray(value)) {
    return [issue('GAMEPLAY_DESIGN_ARRAY_INVALID', 'error', 'proposedCapabilityRequirements must be an array.', '$.proposedCapabilityRequirements')];
  }
  return value.flatMap((item, index) => {
    if (!isPlainObject(item)) {
      return [issue('GAMEPLAY_DESIGN_ARRAY_INVALID', 'error', 'Capability requirement must be an object.', `$.proposedCapabilityRequirements.${index}`)];
    }
    return [
      ...unknownKeyIssues(item, REQUIREMENT_ALLOWED_KEYS, `$.proposedCapabilityRequirements.${index}`),
      ...forbiddenKeyIssues(item, `$.proposedCapabilityRequirements.${index}`),
      ...requiredStringIssues(item, ['semanticName', 'reason'], `$.proposedCapabilityRequirements.${index}`),
      ...arrayOfStringIssues(item.requiredInterfaces, `$.proposedCapabilityRequirements.${index}.requiredInterfaces`),
      ...arrayOfStringIssues(item.requiredEvents, `$.proposedCapabilityRequirements.${index}.requiredEvents`),
      ...arrayOfStringIssues(item.requiredRuntimeServices, `$.proposedCapabilityRequirements.${index}.requiredRuntimeServices`),
      ...arrayOfStringIssues(item.suggestedCapabilityIds, `$.proposedCapabilityRequirements.${index}.suggestedCapabilityIds`),
      ...(item.proposed === true
        ? []
        : [issue('GAMEPLAY_DESIGN_REQUIREMENT_NOT_PROPOSED', 'error', 'Capability requirement must be marked proposed.', `$.proposedCapabilityRequirements.${index}.proposed`)])
    ];
  });
}

function provenanceIssues(value: unknown): GameplayDesignIssue[] {
  if (!isPlainObject(value)) {
    return [issue('GAMEPLAY_DESIGN_REQUIRED_FIELD_MISSING', 'error', 'modelProvenance is required.', '$.modelProvenance')];
  }
  return [
    ...unknownKeyIssues(value, PROVENANCE_ALLOWED_KEYS, '$.modelProvenance'),
    ...forbiddenKeyIssues(value, '$.modelProvenance'),
    ...requiredStringIssues(value, ['provider', 'model', 'invocationId', 'promptVersion'], '$.modelProvenance')
  ];
}

function preservationIssues(value: unknown, origin: GameplayDesignOrigin): GameplayDesignIssue[] {
  return origin === 'step34_amendment' && (!Array.isArray(value) || value.length === 0)
    ? [issue('GAMEPLAY_DESIGN_AMENDMENT_PRESERVATION_MISSING', 'error', 'Amendment design plan requires preserved constraints.', '$.preservedConstraints')]
    : [];
}

function clarificationIssues(plan: Record<string, unknown>, context: { sourceText: string; selectedTargets?: readonly GameplayDesignTargetRef[] }): GameplayDesignIssue[] {
  const issues: GameplayDesignIssue[] = [];
  const sourceText = context.sourceText;
  if (isVagueRequest(sourceText)) {
    issues.push(issue('GAMEPLAY_DESIGN_CLARIFICATION_REQUIRED', 'clarification', 'Request is too vague to synthesize measurable mechanics.', '$.sourceText'));
  }
  if ((context.selectedTargets === undefined || context.selectedTargets.length === 0) && mentionsAmbiguousTarget(sourceText)) {
    issues.push(issue('GAMEPLAY_DESIGN_CLARIFICATION_REQUIRED', 'clarification', 'Request depends on an unspecified target.', '$.selectedTargets'));
  }
  if (Array.isArray(plan.acceptanceScenarios) && plan.acceptanceScenarios.length === 0) {
    issues.push(issue('GAMEPLAY_DESIGN_CLARIFICATION_REQUIRED', 'clarification', 'Acceptance criteria cannot be observed.', '$.acceptanceScenarios'));
  }
  return issues;
}

function contradictionIssues(plan: Record<string, unknown>): GameplayDesignIssue[] {
  const texts = [
    ...(Array.isArray(plan.preservedConstraints) ? plan.preservedConstraints.filter((item): item is string => typeof item === 'string') : []),
    ...(Array.isArray(plan.proposedMechanics)
      ? plan.proposedMechanics.flatMap((mechanic) =>
          isPlainObject(mechanic) && Array.isArray(mechanic.constraints) ? mechanic.constraints.filter((item): item is string => typeof item === 'string') : []
        )
      : [])
  ];
  return hasContradiction(texts)
    ? [issue('GAMEPLAY_DESIGN_CONTRADICTION_DETECTED', 'clarification', 'Design contains contradictory constraints.', '$.preservedConstraints')]
    : [];
}

function targetIssues(value: unknown): GameplayDesignIssue[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    return [issue('GAMEPLAY_DESIGN_ARRAY_INVALID', 'error', 'selectedTargets must be an array.', '$.selectedTargets')];
  }
  return value.flatMap((item, index) => {
    if (!isPlainObject(item)) {
      return [issue('GAMEPLAY_DESIGN_ARRAY_INVALID', 'error', 'selected target must be an object.', `$.selectedTargets.${index}`)];
    }
    return [
      ...unknownKeyIssues(item, TARGET_ALLOWED_KEYS, `$.selectedTargets.${index}`),
      ...enumIssue(getString(item, 'kind'), GAMEPLAY_DESIGN_TARGET_KINDS, `$.selectedTargets.${index}.kind`),
      ...requiredStringIssues(item, ['ref'], `$.selectedTargets.${index}`)
    ];
  });
}

function baseArtifactHashIssues(value: unknown): GameplayDesignIssue[] {
  if (value === undefined) {
    return [];
  }
  if (!isPlainObject(value)) {
    return [issue('GAMEPLAY_DESIGN_NOT_OBJECT', 'error', 'baseArtifactHashes must be an object.', '$.baseArtifactHashes')];
  }
  return [
    ...unknownKeyIssues(value, BASE_HASH_ALLOWED_KEYS, '$.baseArtifactHashes'),
    ...Object.entries(value).flatMap(([key, item]) => (typeof item === 'string' && item.trim().length > 0 ? [] : [issue('GAMEPLAY_DESIGN_REQUIRED_FIELD_MISSING', 'error', `${key} hash must be a non-empty string.`, `$.baseArtifactHashes.${key}`)]))
  ];
}

function buildValidationReport(input: {
  requestId: string;
  issues: GameplayDesignIssue[];
  normalizedPlan?: GameplayDesignPlan;
}): GameplayDesignValidationReport {
  const issues = [...input.issues].sort(compareIssues);
  const status = deriveValidationStatus(issues);
  const clarificationIssues = issues.filter((item) => item.severity === 'clarification');
  const payload: Omit<GameplayDesignValidationReport, 'reportHash'> = {
    artifactKind: GAMEPLAY_DESIGN_VALIDATION_REPORT_KIND,
    schemaVersion: GAMEPLAY_DESIGN_VALIDATION_REPORT_SCHEMA_VERSION,
    requestId: input.requestId,
    status,
    issues,
    ...(input.normalizedPlan === undefined ? {} : { normalizedPlan: input.normalizedPlan }),
    ...(clarificationIssues.length === 0
      ? {}
      : { clarificationRequest: { requestId: input.requestId, questions: clarificationIssues.map((item) => item.message) } })
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

function validationReportPayload(report: GameplayDesignValidationReport): Omit<GameplayDesignValidationReport, 'reportHash'> {
  return {
    artifactKind: report.artifactKind,
    schemaVersion: report.schemaVersion,
    requestId: report.requestId,
    status: report.status,
    issues: report.issues,
    ...(report.normalizedPlan === undefined ? {} : { normalizedPlan: report.normalizedPlan }),
    ...(report.clarificationRequest === undefined ? {} : { clarificationRequest: report.clarificationRequest })
  };
}

function deriveValidationStatus(issues: readonly GameplayDesignIssue[]): GameplayDesignValidationReport['status'] {
  return issues.some((item) => item.severity === 'error') ? 'invalid' : issues.some((item) => item.severity === 'clarification') ? 'needs_clarification' : 'valid';
}

function unknownKeyIssues(value: Record<string, unknown>, allowedKeys: ReadonlySet<string>, path: string): GameplayDesignIssue[] {
  return Object.keys(value)
    .filter((key) => !allowedKeys.has(key))
    .map((key) => issue('GAMEPLAY_DESIGN_UNKNOWN_FIELD', 'error', `Unknown field ${key} is not allowed.`, `${path}.${key}`));
}

function forbiddenKeyIssues(value: unknown, path: string): GameplayDesignIssue[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => forbiddenKeyIssues(item, `${path}.${index}`));
  }
  if (!isPlainObject(value)) {
    return [];
  }
  return Object.entries(value).flatMap(([key, item]) => [
    ...(FORBIDDEN_KEYS.has(key) ? [issue('GAMEPLAY_DESIGN_FORBIDDEN_FIELD', 'error', `Forbidden field ${key} is not allowed.`, `${path}.${key}`)] : []),
    ...forbiddenKeyIssues(item, `${path}.${key}`)
  ]);
}

function requiredStringIssues(value: Record<string, unknown>, keys: readonly string[], path: string): GameplayDesignIssue[] {
  return keys.flatMap((key) => {
    const item = value[key];
    return typeof item === 'string' && item.trim().length > 0
      ? []
      : [issue('GAMEPLAY_DESIGN_REQUIRED_FIELD_MISSING', 'error', `${key} must be a non-empty string.`, `${path}.${key}`)];
  });
}

function schemaIssue(value: string | undefined, expected: string, path: string): GameplayDesignIssue[] {
  return value === expected ? [] : [issue('GAMEPLAY_DESIGN_SCHEMA_VERSION_INVALID', 'error', `Expected schema version ${expected}.`, path)];
}

function enumIssue<T extends string>(value: string | undefined, allowedValues: readonly T[], path: string): GameplayDesignIssue[] {
  return value !== undefined && allowedValues.includes(value as T)
    ? []
    : [issue('GAMEPLAY_DESIGN_ENUM_INVALID', 'error', `Expected one of ${allowedValues.join(', ')}.`, path)];
}

function arrayOfStringIssues(value: unknown, path: string, options: { nonEmpty?: boolean } = {}): GameplayDesignIssue[] {
  if (!Array.isArray(value)) {
    return [issue('GAMEPLAY_DESIGN_ARRAY_INVALID', 'error', `${path} must be an array.`, path)];
  }
  if (options.nonEmpty === true && value.length === 0) {
    return [issue('GAMEPLAY_DESIGN_ARRAY_INVALID', 'error', `${path} must be non-empty.`, path)];
  }
  return value.flatMap((item, index) =>
    typeof item === 'string' && item.trim().length > 0
      ? []
      : [issue('GAMEPLAY_DESIGN_ARRAY_INVALID', 'error', `${path}.${index} must be a non-empty string.`, `${path}.${index}`)]
  );
}

function dedupeRequirements(requirements: ProposedCapabilityRequirement[]): ProposedCapabilityRequirement[] {
  const seen = new Set<string>();
  return requirements
    .map((requirement) => ({
      semanticName: requirement.semanticName.trim(),
      requiredInterfaces: uniqueStrings(requirement.requiredInterfaces),
      requiredEvents: uniqueStrings(requirement.requiredEvents),
      requiredRuntimeServices: uniqueStrings(requirement.requiredRuntimeServices),
      suggestedCapabilityIds: uniqueStrings(requirement.suggestedCapabilityIds),
      reason: requirement.reason.trim(),
      proposed: true as const
    }))
    .filter((requirement) => {
      const key = requirement.semanticName.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort();
}

function hasContradiction(texts: readonly string[]): boolean {
  const preserved = texts.filter((text) => /(keep|preserve|unchanged|保持|不变)/i.test(text));
  const changed = texts.filter((text) => /(change|increase|decrease|reduce|提高|降低|改变)/i.test(text));
  return preserved.some((left) => changed.some((right) => shareMeaningfulToken(left, right)));
}

function shareMeaningfulToken(left: string, right: string): boolean {
  const leftTokens = meaningfulTokens(left);
  const rightTokens = new Set(meaningfulTokens(right));
  return leftTokens.some((token) => rightTokens.has(token));
}

function meaningfulTokens(value: string): string[] {
  const asciiTokens = value
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((token) => token.length >= 4 && !['keep', 'change', 'unchanged', 'increase', 'decrease', 'preserve'].includes(token));
  const chineseTokens = ['射速', '速度', '伤害', '生命', '移动', '反弹'].filter((token) => value.includes(token));
  return [...asciiTokens, ...chineseTokens];
}

function isVagueRequest(value: string): boolean {
  return /(更有趣|更爽|more fun|juice it up|make it better)/i.test(value);
}

function mentionsAmbiguousTarget(value: string): boolean {
  return /(它|这个|那个|this|that|the thing)/i.test(value);
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function jsonIssue(code: 'GAMEPLAY_DESIGN_JSON_PARSE_FAILED' | 'GAMEPLAY_DESIGN_JSON_REPAIR_FAILED', message: string): GameplayDesignIssue {
  return issue(code, 'error', message, '$');
}

function getString(value: Record<string, unknown> | undefined, key: string): string | undefined {
  const item = value?.[key];
  return typeof item === 'string' ? item : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function issue(code: GameplayDesignIssue['code'], severity: GameplayDesignIssue['severity'], message: string, path: string): GameplayDesignIssue {
  return { code, severity, message, path };
}

function compareIssues(left: GameplayDesignIssue, right: GameplayDesignIssue): number {
  return `${left.severity}:${left.path}:${left.code}`.localeCompare(`${right.severity}:${right.path}:${right.code}`);
}

function compareIntegrityIssues(left: GameplayDesignValidationReportIntegrityIssue, right: GameplayDesignValidationReportIntegrityIssue): number {
  return `${left.code}:${left.message}`.localeCompare(`${right.code}:${right.message}`);
}
