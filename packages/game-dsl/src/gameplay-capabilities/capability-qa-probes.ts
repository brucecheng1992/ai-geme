import { z } from 'zod';

import { ExpectedEffectSchema, type ExpectedEffect } from '../amendments/semantic-amendment-schema.js';
import { GameplayCapabilityLockSchema } from './capability-lock.js';
import {
  CapabilityQaActionDescriptorSchema,
  CapabilityQaAssertionDescriptorSchema,
  CapabilityQaObservationDescriptorSchema,
  GameplayCapabilityPackageContractSchema,
  validateGameplayCapabilityPackage,
  type CapabilityQaActionDescriptor,
  type CapabilityQaAssertionDescriptor,
  type CapabilityQaObservationDescriptor,
  type CapabilityQaProbeDescriptor,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import { hashStableJson } from './stable-json.js';

export const CAPABILITY_RUNTIME_QA_PLAN_KIND = 'capability_qa_plan';
export const CAPABILITY_RUNTIME_QA_PLAN_SCHEMA_VERSION = 'capability_qa_plan.v0.2';
export const CAPABILITY_QA_REPORT_KIND = 'capability_qa_report';
export const CAPABILITY_QA_REPORT_SCHEMA_VERSION = 'capability_qa_report.v0.1';
export const PROFILE_ACCEPTANCE_REPORT_KIND = 'profile_acceptance_report';
export const PROFILE_ACCEPTANCE_REPORT_SCHEMA_VERSION = 'profile_acceptance_report.v0.1';
export const AMENDMENT_VERIFICATION_REPORT_KIND = 'amendment_verification_report';
export const AMENDMENT_VERIFICATION_REPORT_SCHEMA_VERSION = 'amendment_verification_report.v0.1';

export type CapabilityQaDiagnostic = {
  code:
    | 'LOCK_INVALID'
    | 'PACKAGE_INVALID'
    | 'LOCKED_PACKAGE_MISSING'
    | 'REQUIRED_PROBE_MISSING'
    | 'PROFILE_SCENARIO_INVALID'
    | 'QA_PROBE_ID_CONFLICT'
    | 'QA_ACTION_CONFLICT'
    | 'RUNTIME_OBSERVATION_REF_INVALID';
  capabilityId?: string;
  probeId?: string;
  actionId?: string;
  observationId?: string;
  message: string;
};

export type ProfileQaScenarioProbe = {
  id: string;
  severity: 'required' | 'optional';
  prerequisites: string[];
  actions: CapabilityQaActionDescriptor[];
  observations: CapabilityQaObservationDescriptor[];
  assertions: CapabilityQaAssertionDescriptor[];
};

export const ProfileQaScenarioProbeSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z][a-z0-9_.-]{2,160}$/),
    severity: z.enum(['required', 'optional']),
    prerequisites: z.array(z.string().min(1).max(200)).min(1).max(40),
    actions: z.array(CapabilityQaActionDescriptorSchema).min(1).max(80),
    observations: z.array(CapabilityQaObservationDescriptorSchema).min(1).max(80),
    assertions: z.array(CapabilityQaAssertionDescriptorSchema).min(1).max(80)
  })
  .superRefine((probe, ctx) => {
    const observations = new Set(probe.observations.map((observation) => observation.id));
    probe.assertions.forEach((assertion, index) => {
      if (!observations.has(assertion.observationId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['assertions', index, 'observationId'],
          message: `Profile QA assertion ${assertion.id} references unknown observation ${assertion.observationId}.`
        });
      }
    });
  });

export type CapabilityQaPlanProbe = {
  id: string;
  capabilityId?: string;
  source: 'capability' | 'profile_scenario';
  severity: 'required' | 'optional';
  prerequisites: string[];
  actions: CapabilityQaActionDescriptor[];
  observations: CapabilityQaObservationDescriptor[];
  assertions: CapabilityQaAssertionDescriptor[];
};

export type CapabilityRuntimeQaPlan = {
  artifactKind: typeof CAPABILITY_RUNTIME_QA_PLAN_KIND;
  schemaVersion: typeof CAPABILITY_RUNTIME_QA_PLAN_SCHEMA_VERSION;
  profileId: string;
  status: 'ready' | 'blocked';
  capabilityLockHash?: string;
  requiredProbes: CapabilityQaPlanProbe[];
  optionalProbes: CapabilityQaPlanProbe[];
  profileScenarioProbes: CapabilityQaPlanProbe[];
  step33RenderFidelityEvidenceRefs: string[];
  step34AmendmentVerificationRefs: string[];
  diagnostics: CapabilityQaDiagnostic[];
  planHash: string;
};

export type CapabilityQaProbeResult = {
  probeId: string;
  status: 'passed' | 'failed' | 'skipped';
  assertionResults?: Array<{ assertionId: string; status: 'passed' | 'failed'; message?: string }>;
  observationRefs?: string[];
};

export type CapabilityRuntimeObservedProbeEvidence = {
  capabilityId: string;
  probeId: string;
  action: string;
  eventType: string;
  eventTypes?: readonly string[];
  airborne?: boolean;
  crouching?: boolean;
  heightScale?: number;
  invulnerable?: boolean;
  damagePrevented?: boolean;
  projectileEntityId?: string;
  pickupCollected?: boolean;
  pickupConsumed?: boolean;
  pickupStateChanged?: boolean;
  orderedWaveSequence?: boolean;
  gateTriggered?: boolean;
  waveSpawned?: boolean;
  sequenceIndex?: number;
  waveId?: string;
  weaponReset?: boolean;
  currentWeaponId?: string;
  initialWeaponId?: string;
  previousWeaponId?: string;
  rapidFire?: boolean;
  cooldownMs?: number;
  burstShotCount?: number;
  burstWindowMs?: number;
  spreadShot?: boolean;
  projectileCount?: number;
  spreadArcDeg?: number;
  spreadAnglesDeg?: readonly number[];
  weaponReplaced?: boolean;
  replacementWeaponId?: string;
  pipelineProduced?: boolean;
  manualPatchDetected?: boolean;
  lineageVerified?: boolean;
  declaredModulesOnly?: boolean;
  hiddenScriptDetected?: boolean;
  moduleLoadManifestVerified?: boolean;
  cameraWithinWorldBounds?: boolean;
  leftBoundaryClamped?: boolean;
  rightBoundaryClamped?: boolean;
  canonicalHashMatched?: boolean;
  semanticIntentPreserved?: boolean;
  droppedCanonicalNodes?: boolean;
  playerProjectilesDamageEnemies?: boolean;
  playerProjectilesDamagePlayer?: boolean;
  enemyProjectilesDamagePlayer?: boolean;
  enemyProjectilesDamageEnemies?: boolean;
  hazardsDamagePlayer?: boolean;
  hazardsDamageEnemies?: boolean;
  bossAttackPatternActive?: boolean;
  bossAttackPhaseId?: string;
  bossAttackPatternId?: string;
  bossAttackCadenceMs?: number;
  bossAttackTargetsPlayer?: boolean;
  bossLifecycleStarted?: boolean;
  bossEntityId?: string;
  bossMaxHealth?: number;
  bossHealthInitialized?: boolean;
  bossDefeated?: boolean;
  bossPhaseTransitioned?: boolean;
  bossPreviousPhaseId?: string;
  bossCurrentPhaseId?: string;
  bossHealthThresholdRatio?: number;
  bossSpeedMultiplier?: number;
  bossSpeedMultiplierApplied?: boolean;
  fixedTurretSpawned?: boolean;
  fixedTurretEntityId?: string;
  fixedTurretArchetypeId?: string;
  fixedTurretStationary?: boolean;
  fixedTurretTargetsPlayer?: boolean;
  fixedTurretProjectilePatternId?: string;
  fixedTurretFireCadenceMs?: number;
  flyingRightEntrySpawned?: boolean;
  flyingRightEntryEnemyId?: string;
  flyingRightEntryArchetypeId?: string;
  flyingRightEntrySegmentId?: string;
  flyingRightEntryEnteredFromRight?: boolean;
  flyingRightEntryEntrySide?: string;
  flyingRightEntryMovementPatternId?: string;
  flyingRightEntryWaveId?: string;
  patrolInfantrySpawned?: boolean;
  patrolInfantryEnemyId?: string;
  patrolInfantryArchetypeId?: string;
  patrolInfantrySegmentId?: string;
  patrolInfantryGrounded?: boolean;
  patrolInfantryMovementPatternId?: string;
  patrolInfantryRouteId?: string;
  victoryDeclarationShown?: boolean;
  victoryDeclarationText?: string;
  victoryDeclarationTrigger?: string;
  victoryDeclarationOutcome?: string;
  victoryDeclarationObjectiveCompleted?: boolean;
  fallbackPolicy?: string;
  fallbackPolicyVerified?: boolean;
  undeclaredFallbackDetected?: boolean;
  fallbackOutputGenerated?: boolean;
  fallbackFailureCode?: string;
  wavesCleared?: boolean;
  clearedWaveCount?: number;
  requiredWaveCount?: number;
  bossUnlockTriggered?: boolean;
  bossUnlockReason?: string;
  bossEncounterUnlocked?: boolean;
  bossUnlockWaveId?: string;
  bossUnlockBossEntityId?: string;
  fallingAreaActive?: boolean;
  fallingAreaHazardId?: string;
  fallingAreaBossPhaseId?: string;
  fallingAreaPatternId?: string;
  fallingAreaDropsFromAbove?: boolean;
  fallingAreaArmed?: boolean;
  fallingAreaDamagesPlayer?: boolean;
  fallingAreaDamage?: number;
  fallingAreaTelegraphMs?: number;
  status?: string;
  sourceRef?: string;
};

export type CapabilityRuntimeProbeEvidenceReport = {
  status: 'PASSED' | 'FAILED' | 'NOT_REQUIRED';
  observed: readonly CapabilityRuntimeObservedProbeEvidence[];
  missingProbeIds: readonly string[];
  mismatches: readonly string[];
};

export type CapabilityQaReport = {
  artifactKind: typeof CAPABILITY_QA_REPORT_KIND;
  schemaVersion: typeof CAPABILITY_QA_REPORT_SCHEMA_VERSION;
  status: 'passed' | 'failed' | 'passed_with_optional_failures';
  planStatus: CapabilityRuntimeQaPlan['status'];
  planHash: string;
  planDiagnostics: CapabilityQaDiagnostic[];
  requiredResults: CapabilityQaProbeResult[];
  optionalResults: CapabilityQaProbeResult[];
  missingRequiredProbeIds: string[];
  failedOptionalProbeIds: string[];
  reportHash: string;
};

export type ProfileAcceptanceReport = {
  artifactKind: typeof PROFILE_ACCEPTANCE_REPORT_KIND;
  schemaVersion: typeof PROFILE_ACCEPTANCE_REPORT_SCHEMA_VERSION;
  status: 'passed' | 'failed';
  profileId: string;
  capabilityQaStatus: CapabilityQaReport['status'];
  renderFidelityPassed: boolean;
  requiredEvidenceRefs: string[];
  reportHash: string;
};

export type AmendmentVerificationCheck = {
  effectKind: ExpectedEffect['kind'];
  ref: string;
  status: 'passed' | 'failed';
  before?: unknown;
  after?: unknown;
  message: string;
};

export type AmendmentVerificationReport = {
  artifactKind: typeof AMENDMENT_VERIFICATION_REPORT_KIND;
  schemaVersion: typeof AMENDMENT_VERIFICATION_REPORT_SCHEMA_VERSION;
  status: 'passed' | 'failed';
  operationId: string;
  checks: AmendmentVerificationCheck[];
  reportHash: string;
};

type LockedQaPackage = {
  contract: GameplayCapabilityPackageContract;
  packageHash: string;
};

export function buildCapabilityRuntimeQaPlan(input: {
  profileId: string;
  capabilityLock: unknown;
  packages: readonly unknown[];
  profileScenarios?: readonly ProfileQaScenarioProbe[];
  step33RenderFidelityEvidenceRefs?: readonly string[];
  step34AmendmentVerificationRefs?: readonly string[];
}): CapabilityRuntimeQaPlan {
  const lock = GameplayCapabilityLockSchema.safeParse(input.capabilityLock);
  const diagnostics: CapabilityQaDiagnostic[] = [];
  if (!lock.success) {
    diagnostics.push({
      code: 'LOCK_INVALID',
      message: lock.error.issues.map((issue) => `${issue.path.map(String).join('.')}: ${issue.message}`).join('; ')
    });
  }

  const packageCandidates = buildQaPackageCandidates(input.packages, diagnostics);
  const lockedPackages = lock.success ? selectLockedQaPackages(lock.data, packageCandidates, diagnostics) : [];
  const requiredProbes = lockedPackages.flatMap((entry) =>
    entry.contract.qa.probes.filter((probe) => probe.severity === 'required').map((probe) => qaPlanProbeFromCapability(entry.contract, probe))
  );
  const optionalProbes = lockedPackages.flatMap((entry) =>
    entry.contract.qa.probes.filter((probe) => probe.severity === 'optional').map((probe) => qaPlanProbeFromCapability(entry.contract, probe))
  );
  for (const entry of lockedPackages) {
    if (!entry.contract.qa.probes.some((probe) => probe.severity === 'required')) {
      diagnostics.push({
        code: 'REQUIRED_PROBE_MISSING',
        capabilityId: entry.contract.manifest.id,
        message: `Capability ${entry.contract.manifest.id} has no required QA probe.`
      });
    }
    validateProbeRuntimeObservationRefs(entry.contract, diagnostics);
  }

  const profileScenarios = parseProfileScenarioProbes(input.profileScenarios ?? [], diagnostics);
  validateProfileScenarioRuntimeObservationRefs(profileScenarios, selectedRuntimeSystemIds(lockedPackages), diagnostics);
  const profileScenarioProbes = profileScenarios.map(qaPlanProbeFromProfileScenario).sort(comparePlanProbes);
  const allProbes = [...requiredProbes, ...optionalProbes, ...profileScenarioProbes];
  diagnostics.push(...findDuplicateQaProbeIds(allProbes));
  diagnostics.push(...findConflictingQaActions(allProbes));

  const payload: Omit<CapabilityRuntimeQaPlan, 'planHash'> = {
    artifactKind: CAPABILITY_RUNTIME_QA_PLAN_KIND,
    schemaVersion: CAPABILITY_RUNTIME_QA_PLAN_SCHEMA_VERSION,
    profileId: input.profileId,
    status: diagnostics.length === 0 ? 'ready' : 'blocked',
    ...(lock.success ? { capabilityLockHash: lock.data.lockHash } : {}),
    requiredProbes: requiredProbes.sort(comparePlanProbes),
    optionalProbes: optionalProbes.sort(comparePlanProbes),
    profileScenarioProbes,
    step33RenderFidelityEvidenceRefs: [...(input.step33RenderFidelityEvidenceRefs ?? [])].sort(),
    step34AmendmentVerificationRefs: [...(input.step34AmendmentVerificationRefs ?? [])].sort(),
    diagnostics
  };
  return { ...payload, planHash: hashStableJson(payload) };
}

export function evaluateCapabilityQaReport(input: { plan: CapabilityRuntimeQaPlan; probeResults: readonly CapabilityQaProbeResult[] }): CapabilityQaReport {
  const results = new Map(input.probeResults.map((result) => [result.probeId, result]));
  const requiredPlanProbes = [...input.plan.requiredProbes, ...input.plan.profileScenarioProbes.filter((probe) => probe.severity === 'required')];
  const optionalPlanProbes = [...input.plan.optionalProbes, ...input.plan.profileScenarioProbes.filter((probe) => probe.severity === 'optional')];
  const requiredResults = requiredPlanProbes.map((probe) => results.get(probe.id) ?? { probeId: probe.id, status: 'skipped' as const });
  const optionalResults = optionalPlanProbes.map((probe) => results.get(probe.id) ?? { probeId: probe.id, status: 'skipped' as const });
  const requiredAssertionIds = buildPlanAssertionMap(requiredPlanProbes);
  const optionalAssertionIds = buildPlanAssertionMap(optionalPlanProbes);
  const missingRequiredProbeIds = requiredResults
    .filter((result) => input.plan.status !== 'ready' || !probeResultPassed(result, requiredAssertionIds.get(result.probeId) ?? []))
    .map((result) => result.probeId)
    .sort();
  const failedOptionalProbeIds = optionalResults
    .filter((result) => result.status === 'failed' || !probeResultAssertionsPassed(result, optionalAssertionIds.get(result.probeId) ?? []))
    .map((result) => result.probeId)
    .sort();
  const status = input.plan.status !== 'ready' || missingRequiredProbeIds.length > 0 ? 'failed' : failedOptionalProbeIds.length > 0 ? 'passed_with_optional_failures' : 'passed';
  const payload: Omit<CapabilityQaReport, 'reportHash'> = {
    artifactKind: CAPABILITY_QA_REPORT_KIND,
    schemaVersion: CAPABILITY_QA_REPORT_SCHEMA_VERSION,
    status,
    planStatus: input.plan.status,
    planHash: input.plan.planHash,
    planDiagnostics: input.plan.diagnostics,
    requiredResults: requiredResults.sort(compareProbeResults),
    optionalResults: optionalResults.sort(compareProbeResults),
    missingRequiredProbeIds,
    failedOptionalProbeIds
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

export function buildCapabilityQaProbeResultsFromRuntimeEvidence(input: {
  plan: CapabilityRuntimeQaPlan;
  evidence: CapabilityRuntimeProbeEvidenceReport | undefined;
}): CapabilityQaProbeResult[] {
  if (input.evidence?.status !== 'PASSED') {
    return [];
  }

  const observedByProbeId = new Map(input.evidence.observed.map((probe) => [probe.probeId, probe]));
  return [...input.plan.requiredProbes, ...input.plan.optionalProbes]
    .flatMap((probe) => buildProbeResultFromRuntimeEvidence(probe, observedByProbeId.get(probe.id)))
    .sort(compareProbeResults);
}

function buildProbeResultFromRuntimeEvidence(probe: CapabilityQaPlanProbe, observed: CapabilityRuntimeObservedProbeEvidence | undefined): CapabilityQaProbeResult[] {
  if (observed === undefined) {
    return [];
  }

  const probeMismatches = [
    ...(probe.capabilityId === undefined || observed.capabilityId === probe.capabilityId
      ? []
      : [`capabilityId expected ${probe.capabilityId}, observed ${observed.capabilityId}`]),
    ...(observed.status === undefined || observed.status === 'observed' ? [] : [`runtime status ${observed.status} is not observed`])
  ];
  const eventTypes = new Set([observed.eventType, ...(observed.eventTypes ?? [])].filter((eventType) => eventType.length > 0));
  const observationsById = new Map(probe.observations.map((observation) => [observation.id, observation]));
  const assertionResults = probe.assertions.map((assertion) => {
    const observation = observationsById.get(assertion.observationId);
    const unsupportedComparator = assertion.comparator !== 'exists';
    const expectedFieldMismatches = compareRuntimeEvidenceExpectedFields(assertion.expected, observed);
    const passed =
      probeMismatches.length === 0 &&
      observation !== undefined &&
      !unsupportedComparator &&
      eventTypes.has(observation.ref) &&
      expectedFieldMismatches.length === 0;
    return {
      assertionId: assertion.id,
      status: passed ? ('passed' as const) : ('failed' as const),
      ...(passed
        ? {}
        : {
            message: buildRuntimeEvidenceAssertionFailureMessage({
              assertionId: assertion.id,
              observationRef: observation?.ref,
              observedEventTypes: [...eventTypes].sort(),
              probeMismatches,
              unsupportedComparator,
              expectedFieldMismatches
            })
          })
    };
  });

  return [
    {
      probeId: probe.id,
      status: assertionResults.every((assertion) => assertion.status === 'passed') ? 'passed' : 'failed',
      assertionResults,
      observationRefs: observed.sourceRef === undefined ? [...eventTypes].sort() : [observed.sourceRef]
    }
  ];
}

function buildRuntimeEvidenceAssertionFailureMessage(input: {
  assertionId: string;
  observationRef: string | undefined;
  observedEventTypes: readonly string[];
  probeMismatches: readonly string[];
  unsupportedComparator: boolean;
  expectedFieldMismatches: readonly string[];
}): string {
  const reasons = [
    ...(input.observationRef === undefined ? ['observation descriptor missing'] : [`observation ${input.observationRef} not observed`]),
    ...(input.unsupportedComparator ? ['only exists assertions can be derived from runtime event evidence'] : []),
    ...input.expectedFieldMismatches,
    ...input.probeMismatches
  ];
  return `Runtime evidence did not satisfy assertion ${input.assertionId}: ${reasons.join('; ')}; observed events: ${input.observedEventTypes.join(', ') || '<none>'}.`;
}

function compareRuntimeEvidenceExpectedFields(expected: unknown, observed: CapabilityRuntimeObservedProbeEvidence): string[] {
  if (!isRecord(expected)) {
    return [];
  }

  return [
    ...compareExpectedBooleanField('airborne', expected, observed.airborne),
    ...compareExpectedBooleanField('crouching', expected, observed.crouching),
    ...compareExpectedNumberField('heightScale', expected, observed.heightScale),
    ...compareExpectedBooleanField('invulnerable', expected, observed.invulnerable),
    ...compareExpectedBooleanField('damagePrevented', expected, observed.damagePrevented),
    ...compareExpectedStringField('projectileEntityId', expected, observed.projectileEntityId),
    ...compareExpectedBooleanField('pickupCollected', expected, observed.pickupCollected),
    ...compareExpectedBooleanField('pickupConsumed', expected, observed.pickupConsumed),
    ...compareExpectedBooleanField('pickupStateChanged', expected, observed.pickupStateChanged),
    ...compareExpectedBooleanField('orderedWaveSequence', expected, observed.orderedWaveSequence),
    ...compareExpectedBooleanField('gateTriggered', expected, observed.gateTriggered),
    ...compareExpectedBooleanField('waveSpawned', expected, observed.waveSpawned),
    ...compareExpectedNumberField('sequenceIndex', expected, observed.sequenceIndex),
    ...compareExpectedStringField('waveId', expected, observed.waveId),
    ...compareExpectedBooleanField('weaponReset', expected, observed.weaponReset),
    ...compareExpectedStringField('currentWeaponId', expected, observed.currentWeaponId),
    ...compareExpectedStringField('initialWeaponId', expected, observed.initialWeaponId),
    ...compareExpectedStringField('previousWeaponId', expected, observed.previousWeaponId),
    ...compareExpectedBooleanField('rapidFire', expected, observed.rapidFire),
    ...compareExpectedNumberField('cooldownMs', expected, observed.cooldownMs),
    ...compareExpectedNumberField('burstShotCount', expected, observed.burstShotCount),
    ...compareExpectedNumberField('burstWindowMs', expected, observed.burstWindowMs),
    ...compareExpectedBooleanField('spreadShot', expected, observed.spreadShot),
    ...compareExpectedNumberField('projectileCount', expected, observed.projectileCount),
    ...compareExpectedNumberField('spreadArcDeg', expected, observed.spreadArcDeg),
    ...compareExpectedNumberArrayField('spreadAnglesDeg', expected, observed.spreadAnglesDeg),
    ...compareExpectedBooleanField('weaponReplaced', expected, observed.weaponReplaced),
    ...compareExpectedStringField('replacementWeaponId', expected, observed.replacementWeaponId),
    ...compareExpectedBooleanField('pipelineProduced', expected, observed.pipelineProduced),
    ...compareExpectedBooleanField('manualPatchDetected', expected, observed.manualPatchDetected),
    ...compareExpectedBooleanField('lineageVerified', expected, observed.lineageVerified),
    ...compareExpectedBooleanField('declaredModulesOnly', expected, observed.declaredModulesOnly),
    ...compareExpectedBooleanField('hiddenScriptDetected', expected, observed.hiddenScriptDetected),
    ...compareExpectedBooleanField('moduleLoadManifestVerified', expected, observed.moduleLoadManifestVerified),
    ...compareExpectedBooleanField('cameraWithinWorldBounds', expected, observed.cameraWithinWorldBounds),
    ...compareExpectedBooleanField('leftBoundaryClamped', expected, observed.leftBoundaryClamped),
    ...compareExpectedBooleanField('rightBoundaryClamped', expected, observed.rightBoundaryClamped),
    ...compareExpectedBooleanField('canonicalHashMatched', expected, observed.canonicalHashMatched),
    ...compareExpectedBooleanField('semanticIntentPreserved', expected, observed.semanticIntentPreserved),
    ...compareExpectedBooleanField('droppedCanonicalNodes', expected, observed.droppedCanonicalNodes),
    ...compareExpectedBooleanField('playerProjectilesDamageEnemies', expected, observed.playerProjectilesDamageEnemies),
    ...compareExpectedBooleanField('playerProjectilesDamagePlayer', expected, observed.playerProjectilesDamagePlayer),
    ...compareExpectedBooleanField('enemyProjectilesDamagePlayer', expected, observed.enemyProjectilesDamagePlayer),
    ...compareExpectedBooleanField('enemyProjectilesDamageEnemies', expected, observed.enemyProjectilesDamageEnemies),
    ...compareExpectedBooleanField('hazardsDamagePlayer', expected, observed.hazardsDamagePlayer),
    ...compareExpectedBooleanField('hazardsDamageEnemies', expected, observed.hazardsDamageEnemies),
    ...compareExpectedBooleanField('bossAttackPatternActive', expected, observed.bossAttackPatternActive),
    ...compareExpectedStringField('bossAttackPhaseId', expected, observed.bossAttackPhaseId),
    ...compareExpectedStringField('bossAttackPatternId', expected, observed.bossAttackPatternId),
    ...compareExpectedNumberField('bossAttackCadenceMs', expected, observed.bossAttackCadenceMs),
    ...compareExpectedBooleanField('bossAttackTargetsPlayer', expected, observed.bossAttackTargetsPlayer),
    ...compareExpectedBooleanField('bossLifecycleStarted', expected, observed.bossLifecycleStarted),
    ...compareExpectedStringField('bossEntityId', expected, observed.bossEntityId),
    ...compareExpectedNumberField('bossMaxHealth', expected, observed.bossMaxHealth),
    ...compareExpectedBooleanField('bossHealthInitialized', expected, observed.bossHealthInitialized),
    ...compareExpectedBooleanField('bossDefeated', expected, observed.bossDefeated),
    ...compareExpectedBooleanField('bossPhaseTransitioned', expected, observed.bossPhaseTransitioned),
    ...compareExpectedStringField('bossPreviousPhaseId', expected, observed.bossPreviousPhaseId),
    ...compareExpectedStringField('bossCurrentPhaseId', expected, observed.bossCurrentPhaseId),
    ...compareExpectedNumberField('bossHealthThresholdRatio', expected, observed.bossHealthThresholdRatio),
    ...compareExpectedNumberField('bossSpeedMultiplier', expected, observed.bossSpeedMultiplier),
    ...compareExpectedBooleanField('bossSpeedMultiplierApplied', expected, observed.bossSpeedMultiplierApplied),
    ...compareExpectedBooleanField('fixedTurretSpawned', expected, observed.fixedTurretSpawned),
    ...compareExpectedStringField('fixedTurretEntityId', expected, observed.fixedTurretEntityId),
    ...compareExpectedStringField('fixedTurretArchetypeId', expected, observed.fixedTurretArchetypeId),
    ...compareExpectedBooleanField('fixedTurretStationary', expected, observed.fixedTurretStationary),
    ...compareExpectedBooleanField('fixedTurretTargetsPlayer', expected, observed.fixedTurretTargetsPlayer),
    ...compareExpectedStringField('fixedTurretProjectilePatternId', expected, observed.fixedTurretProjectilePatternId),
    ...compareExpectedNumberField('fixedTurretFireCadenceMs', expected, observed.fixedTurretFireCadenceMs),
    ...compareExpectedBooleanField('flyingRightEntrySpawned', expected, observed.flyingRightEntrySpawned),
    ...compareExpectedStringField('flyingRightEntryEnemyId', expected, observed.flyingRightEntryEnemyId),
    ...compareExpectedStringField('flyingRightEntryArchetypeId', expected, observed.flyingRightEntryArchetypeId),
    ...compareExpectedStringField('flyingRightEntrySegmentId', expected, observed.flyingRightEntrySegmentId),
    ...compareExpectedBooleanField('flyingRightEntryEnteredFromRight', expected, observed.flyingRightEntryEnteredFromRight),
    ...compareExpectedStringField('flyingRightEntryEntrySide', expected, observed.flyingRightEntryEntrySide),
    ...compareExpectedStringField('flyingRightEntryMovementPatternId', expected, observed.flyingRightEntryMovementPatternId),
    ...compareExpectedStringField('flyingRightEntryWaveId', expected, observed.flyingRightEntryWaveId),
    ...compareExpectedBooleanField('patrolInfantrySpawned', expected, observed.patrolInfantrySpawned),
    ...compareExpectedStringField('patrolInfantryEnemyId', expected, observed.patrolInfantryEnemyId),
    ...compareExpectedStringField('patrolInfantryArchetypeId', expected, observed.patrolInfantryArchetypeId),
    ...compareExpectedStringField('patrolInfantrySegmentId', expected, observed.patrolInfantrySegmentId),
    ...compareExpectedBooleanField('patrolInfantryGrounded', expected, observed.patrolInfantryGrounded),
    ...compareExpectedStringField('patrolInfantryMovementPatternId', expected, observed.patrolInfantryMovementPatternId),
    ...compareExpectedStringField('patrolInfantryRouteId', expected, observed.patrolInfantryRouteId),
    ...compareExpectedBooleanField('victoryDeclarationShown', expected, observed.victoryDeclarationShown),
    ...compareExpectedStringField('victoryDeclarationText', expected, observed.victoryDeclarationText),
    ...compareExpectedStringField('victoryDeclarationTrigger', expected, observed.victoryDeclarationTrigger),
    ...compareExpectedStringField('victoryDeclarationOutcome', expected, observed.victoryDeclarationOutcome),
    ...compareExpectedBooleanField('victoryDeclarationObjectiveCompleted', expected, observed.victoryDeclarationObjectiveCompleted),
    ...compareExpectedStringField('fallbackPolicy', expected, observed.fallbackPolicy),
    ...compareExpectedBooleanField('fallbackPolicyVerified', expected, observed.fallbackPolicyVerified),
    ...compareExpectedBooleanField('undeclaredFallbackDetected', expected, observed.undeclaredFallbackDetected),
    ...compareExpectedBooleanField('fallbackOutputGenerated', expected, observed.fallbackOutputGenerated),
    ...compareExpectedStringField('fallbackFailureCode', expected, observed.fallbackFailureCode),
    ...compareExpectedBooleanField('wavesCleared', expected, observed.wavesCleared),
    ...compareExpectedNumberField('clearedWaveCount', expected, observed.clearedWaveCount),
    ...compareExpectedNumberField('requiredWaveCount', expected, observed.requiredWaveCount),
    ...compareExpectedBooleanField('bossUnlockTriggered', expected, observed.bossUnlockTriggered),
    ...compareExpectedStringField('bossUnlockReason', expected, observed.bossUnlockReason),
    ...compareExpectedBooleanField('bossEncounterUnlocked', expected, observed.bossEncounterUnlocked),
    ...compareExpectedStringField('bossUnlockWaveId', expected, observed.bossUnlockWaveId),
    ...compareExpectedStringField('bossUnlockBossEntityId', expected, observed.bossUnlockBossEntityId),
    ...compareExpectedBooleanField('fallingAreaActive', expected, observed.fallingAreaActive),
    ...compareExpectedStringField('fallingAreaHazardId', expected, observed.fallingAreaHazardId),
    ...compareExpectedStringField('fallingAreaBossPhaseId', expected, observed.fallingAreaBossPhaseId),
    ...compareExpectedStringField('fallingAreaPatternId', expected, observed.fallingAreaPatternId),
    ...compareExpectedBooleanField('fallingAreaDropsFromAbove', expected, observed.fallingAreaDropsFromAbove),
    ...compareExpectedBooleanField('fallingAreaArmed', expected, observed.fallingAreaArmed),
    ...compareExpectedBooleanField('fallingAreaDamagesPlayer', expected, observed.fallingAreaDamagesPlayer),
    ...compareExpectedNumberField('fallingAreaDamage', expected, observed.fallingAreaDamage),
    ...compareExpectedNumberField('fallingAreaTelegraphMs', expected, observed.fallingAreaTelegraphMs)
  ];
}

function compareExpectedBooleanField(field: string, expected: Readonly<Record<string, unknown>>, observed: boolean | undefined): string[] {
  const expectedValue = expected[field];
  if (typeof expectedValue !== 'boolean') {
    return [];
  }
  return observed === expectedValue ? [] : [`expected ${field}=${expectedValue}, observed ${observed === undefined ? '<missing>' : String(observed)}`];
}

function compareExpectedNumberField(field: string, expected: Readonly<Record<string, unknown>>, observed: number | undefined): string[] {
  const expectedValue = expected[field];
  if (typeof expectedValue !== 'number') {
    return [];
  }
  return observed === expectedValue ? [] : [`expected ${field}=${expectedValue}, observed ${observed === undefined ? '<missing>' : String(observed)}`];
}

function compareExpectedNumberArrayField(
  field: string,
  expected: Readonly<Record<string, unknown>>,
  observed: readonly number[] | undefined
): string[] {
  const expectedValue = expected[field];
  if (!Array.isArray(expectedValue) || !expectedValue.every((item) => typeof item === 'number')) {
    return [];
  }
  if (observed === undefined) {
    return [`expected ${field}=[${expectedValue.join(',')}], observed <missing>`];
  }
  const matches = observed.length === expectedValue.length && observed.every((item, index) => item === expectedValue[index]);
  return matches ? [] : [`expected ${field}=[${expectedValue.join(',')}], observed [${observed.join(',')}]`];
}

function compareExpectedStringField(field: string, expected: Readonly<Record<string, unknown>>, observed: string | undefined): string[] {
  const expectedValue = expected[field];
  if (typeof expectedValue !== 'string') {
    return [];
  }
  return observed === expectedValue ? [] : [`expected ${field}=${expectedValue}, observed ${observed ?? '<missing>'}`];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function buildProfileAcceptanceReport(input: {
  profileId: string;
  capabilityQaReport: CapabilityQaReport;
  renderFidelityPassed: boolean;
  requiredEvidenceRefs: readonly string[];
}): ProfileAcceptanceReport {
  const payload: Omit<ProfileAcceptanceReport, 'reportHash'> = {
    artifactKind: PROFILE_ACCEPTANCE_REPORT_KIND,
    schemaVersion: PROFILE_ACCEPTANCE_REPORT_SCHEMA_VERSION,
    status: input.capabilityQaReport.status === 'failed' || !input.renderFidelityPassed ? 'failed' : 'passed',
    profileId: input.profileId,
    capabilityQaStatus: input.capabilityQaReport.status,
    renderFidelityPassed: input.renderFidelityPassed,
    requiredEvidenceRefs: [...input.requiredEvidenceRefs].sort()
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

export function buildAmendmentVerificationReport(input: {
  operationId: string;
  expectedEffects: readonly unknown[];
  beforeObservations: Readonly<Record<string, unknown>>;
  afterObservations: Readonly<Record<string, unknown>>;
  runtimeEventCounts?: Readonly<Record<string, number>>;
}): AmendmentVerificationReport {
  const effects = z.array(ExpectedEffectSchema).safeParse(input.expectedEffects);
  const checks: AmendmentVerificationCheck[] = effects.success
    ? effects.data.map((effect) => verifyExpectedEffect(effect, input.beforeObservations, input.afterObservations, input.runtimeEventCounts ?? {}))
    : [
        {
          effectKind: 'no_regression',
          ref: '<expected-effects>',
          status: 'failed',
          message: effects.error.issues.map((issue) => `${issue.path.map(String).join('.')}: ${issue.message}`).join('; ')
        }
      ];
  const payload: Omit<AmendmentVerificationReport, 'reportHash'> = {
    artifactKind: AMENDMENT_VERIFICATION_REPORT_KIND,
    schemaVersion: AMENDMENT_VERIFICATION_REPORT_SCHEMA_VERSION,
    status: checks.every((check) => check.status === 'passed') ? 'passed' : 'failed',
    operationId: input.operationId,
    checks: checks.sort((left, right) => left.ref.localeCompare(right.ref))
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

function buildQaPackageCandidates(packages: readonly unknown[], diagnostics: CapabilityQaDiagnostic[]): Map<string, LockedQaPackage[]> {
  const candidates = new Map<string, LockedQaPackage[]>();
  for (const candidate of packages) {
    const parsed = GameplayCapabilityPackageContractSchema.safeParse(candidate);
    if (!parsed.success) {
      diagnostics.push({
        code: 'PACKAGE_INVALID',
        message: parsed.error.issues.map((issue) => `${issue.path.map(String).join('.')}: ${issue.message}`).join('; ')
      });
      continue;
    }
    const report = validateGameplayCapabilityPackage(parsed.data);
    if (!report.supportEligible || report.packageHash === undefined) {
      diagnostics.push({
        code: 'PACKAGE_INVALID',
        capabilityId: parsed.data.manifest.id,
        message: `Package ${parsed.data.manifest.id} is not support eligible for capability-owned QA.`
      });
      continue;
    }
    const list = candidates.get(parsed.data.manifest.id) ?? [];
    list.push({ contract: parsed.data, packageHash: report.packageHash });
    candidates.set(parsed.data.manifest.id, list);
  }
  return candidates;
}

function selectLockedQaPackages(
  lock: z.infer<typeof GameplayCapabilityLockSchema>,
  candidates: ReadonlyMap<string, readonly LockedQaPackage[]>,
  diagnostics: CapabilityQaDiagnostic[]
): LockedQaPackage[] {
  return lock.packages.flatMap((lockedPackage) => {
    const match = (candidates.get(lockedPackage.capabilityId) ?? []).find(
      (candidate) => candidate.contract.manifest.packageVersion === lockedPackage.packageVersion && candidate.packageHash === lockedPackage.packageHash
    );
    if (match === undefined) {
      diagnostics.push({
        code: 'LOCKED_PACKAGE_MISSING',
        capabilityId: lockedPackage.capabilityId,
        message: `Locked package ${lockedPackage.capabilityId}@${lockedPackage.packageVersion} is unavailable for QA planning.`
      });
      return [];
    }
    return [match];
  });
}

function qaPlanProbeFromCapability(contract: GameplayCapabilityPackageContract, probe: CapabilityQaProbeDescriptor): CapabilityQaPlanProbe {
  return {
    id: probe.id,
    capabilityId: contract.manifest.id,
    source: 'capability',
    severity: probe.severity,
    prerequisites: [...probe.prerequisites].sort(),
    actions: stableActions(probe.actions),
    observations: stableObservations(probe.observations),
    assertions: stableAssertions(probe.assertions)
  };
}

function qaPlanProbeFromProfileScenario(probe: ProfileQaScenarioProbe): CapabilityQaPlanProbe {
  return {
    id: probe.id,
    source: 'profile_scenario',
    severity: probe.severity,
    prerequisites: [...probe.prerequisites].sort(),
    actions: stableActions(probe.actions),
    observations: stableObservations(probe.observations),
    assertions: stableAssertions(probe.assertions)
  };
}

function parseProfileScenarioProbes(scenarios: readonly ProfileQaScenarioProbe[], diagnostics: CapabilityQaDiagnostic[]): ProfileQaScenarioProbe[] {
  return scenarios.flatMap((scenario, index) => {
    const parsed = ProfileQaScenarioProbeSchema.safeParse(scenario);
    if (!parsed.success) {
      diagnostics.push({
        code: 'PROFILE_SCENARIO_INVALID',
        probeId: scenario.id,
        message: `Profile QA scenario at index ${index} is invalid: ${parsed.error.issues.map((issue) => `${issue.path.map(String).join('.')}: ${issue.message}`).join('; ')}`
      });
      return [];
    }
    return [parsed.data];
  });
}

function validateProbeRuntimeObservationRefs(contract: GameplayCapabilityPackageContract, diagnostics: CapabilityQaDiagnostic[]): void {
  const runtimeSystems = new Set(contract.runtime.systems.map((system) => system.id));
  for (const probe of contract.qa.probes) {
    for (const observation of probe.observations) {
      if (!runtimeSystems.has(observation.runtimeSystemId)) {
        diagnostics.push({
          code: 'RUNTIME_OBSERVATION_REF_INVALID',
          capabilityId: contract.manifest.id,
          probeId: probe.id,
          observationId: observation.id,
          message: `QA observation ${observation.id} references unknown runtime system ${observation.runtimeSystemId}.`
        });
      }
    }
  }
}

function validateProfileScenarioRuntimeObservationRefs(
  probes: readonly ProfileQaScenarioProbe[],
  runtimeSystemIds: ReadonlySet<string>,
  diagnostics: CapabilityQaDiagnostic[]
): void {
  for (const probe of probes) {
    for (const observation of probe.observations) {
      if (!runtimeSystemIds.has(observation.runtimeSystemId)) {
        diagnostics.push({
          code: 'RUNTIME_OBSERVATION_REF_INVALID',
          probeId: probe.id,
          observationId: observation.id,
          message: `Profile QA observation ${observation.id} references runtime system ${observation.runtimeSystemId} outside the selected capability lock.`
        });
      }
    }
  }
}

function selectedRuntimeSystemIds(lockedPackages: readonly LockedQaPackage[]): ReadonlySet<string> {
  return new Set(lockedPackages.flatMap((entry) => entry.contract.runtime.systems.map((system) => system.id)));
}

function findConflictingQaActions(probes: readonly CapabilityQaPlanProbe[]): CapabilityQaDiagnostic[] {
  const byId = new Map<string, { hash: string; probeId: string }>();
  const diagnostics: CapabilityQaDiagnostic[] = [];
  for (const probe of probes) {
    for (const action of probe.actions) {
      const hash = hashStableJson(action);
      const existing = byId.get(action.id);
      if (existing !== undefined && existing.hash !== hash) {
        diagnostics.push({
          code: 'QA_ACTION_CONFLICT',
          probeId: probe.id,
          actionId: action.id,
          message: `QA action ${action.id} conflicts between probes ${existing.probeId} and ${probe.id}.`
        });
      }
      byId.set(action.id, { hash, probeId: probe.id });
    }
  }
  return diagnostics;
}

function findDuplicateQaProbeIds(probes: readonly CapabilityQaPlanProbe[]): CapabilityQaDiagnostic[] {
  const seen = new Map<string, CapabilityQaPlanProbe>();
  const diagnostics: CapabilityQaDiagnostic[] = [];
  for (const probe of probes) {
    const existing = seen.get(probe.id);
    if (existing !== undefined) {
      diagnostics.push({
        code: 'QA_PROBE_ID_CONFLICT',
        probeId: probe.id,
        message: `QA probe id ${probe.id} is declared by both ${describeProbeSource(existing)} and ${describeProbeSource(probe)}.`
      });
      continue;
    }
    seen.set(probe.id, probe);
  }
  return diagnostics;
}

function describeProbeSource(probe: CapabilityQaPlanProbe): string {
  return probe.capabilityId === undefined ? probe.source : `${probe.source}:${probe.capabilityId}`;
}

function verifyExpectedEffect(
  effect: ExpectedEffect,
  beforeObservations: Readonly<Record<string, unknown>>,
  afterObservations: Readonly<Record<string, unknown>>,
  runtimeEventCounts: Readonly<Record<string, number>>
): AmendmentVerificationCheck {
  if (effect.kind === 'property_changed') {
    const before = beforeObservations[effect.property];
    const after = afterObservations[effect.property];
    return {
      effectKind: effect.kind,
      ref: effect.property,
      before,
      after,
      status: comparePropertyChange(effect.comparison, before, after) ? 'passed' : 'failed',
      message: `Property ${effect.property} ${effect.comparison}.`
    };
  }
  if (effect.kind === 'runtime_event') {
    const count = runtimeEventCounts[effect.eventName] ?? 0;
    const minimum = Math.max(effect.minimumCount ?? 1, 1);
    return {
      effectKind: effect.kind,
      ref: effect.eventName,
      after: count,
      status: count >= minimum ? 'passed' : 'failed',
      message: `Runtime event ${effect.eventName} observed ${count} time(s), expected at least ${minimum}.`
    };
  }
  if (effect.kind === 'constraint_preserved') {
    const before = beforeObservations[effect.property];
    const after = afterObservations[effect.property];
    const expected = effect.expectedValue ?? before;
    return {
      effectKind: effect.kind,
      ref: effect.property,
      before,
      after,
      status: Object.is(after, expected) ? 'passed' : 'failed',
      message: `Constraint ${effect.property} preserved.`
    };
  }
  if (effect.kind === 'asset_binding') {
    const missingRole = effect.requiredAssetRoles.find((role) => afterObservations[`asset:${role}`] !== true);
    return {
      effectKind: effect.kind,
      ref: effect.requiredAssetRoles.join(','),
      status: missingRole === undefined ? 'passed' : 'failed',
      message: missingRole === undefined ? 'Required asset roles are bound.' : `Required asset role ${missingRole} is not bound.`
    };
  }
  const regressionStatus = afterObservations[`no_regression:${effect.checkId}`] === false ? 'failed' : 'passed';
  return {
    effectKind: effect.kind,
    ref: effect.checkId,
    status: regressionStatus,
    message: `Regression check ${effect.checkId} ${regressionStatus}.`
  };
}

function comparePropertyChange(comparison: 'increased' | 'decreased' | 'equals' | 'changed', before: unknown, after: unknown): boolean {
  if (comparison === 'changed') {
    return !Object.is(before, after);
  }
  if (comparison === 'equals') {
    return Object.is(before, after);
  }
  if (typeof before !== 'number' || typeof after !== 'number') {
    return false;
  }
  return comparison === 'increased' ? after > before : after < before;
}

function probeResultPassed(result: CapabilityQaProbeResult, expectedAssertionIds: readonly string[]): boolean {
  return result.status === 'passed' && probeResultAssertionsPassed(result, expectedAssertionIds);
}

function probeResultAssertionsPassed(result: CapabilityQaProbeResult, expectedAssertionIds: readonly string[]): boolean {
  const assertions = new Map((result.assertionResults ?? []).map((assertion) => [assertion.assertionId, assertion.status]));
  return expectedAssertionIds.length > 0 && expectedAssertionIds.every((assertionId) => assertions.get(assertionId) === 'passed');
}

function buildPlanAssertionMap(probes: readonly CapabilityQaPlanProbe[]): Map<string, string[]> {
  return new Map(probes.map((probe) => [probe.id, probe.assertions.map((assertion) => assertion.id).sort()]));
}

function comparePlanProbes(left: CapabilityQaPlanProbe, right: CapabilityQaPlanProbe): number {
  return left.id.localeCompare(right.id);
}

function compareProbeResults(left: CapabilityQaProbeResult, right: CapabilityQaProbeResult): number {
  return left.probeId.localeCompare(right.probeId);
}

function stableActions(actions: readonly CapabilityQaActionDescriptor[]): CapabilityQaActionDescriptor[] {
  return [...actions].sort((left, right) => left.id.localeCompare(right.id));
}

function stableObservations(observations: readonly CapabilityQaObservationDescriptor[]): CapabilityQaObservationDescriptor[] {
  return [...observations].sort((left, right) => left.id.localeCompare(right.id));
}

function stableAssertions(assertions: readonly CapabilityQaAssertionDescriptor[]): CapabilityQaAssertionDescriptor[] {
  return [...assertions].sort((left, right) => left.id.localeCompare(right.id));
}
