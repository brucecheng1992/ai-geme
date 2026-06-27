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

export type CapabilityQaDependency = {
  capabilityId: string;
  dependencyCapabilityIds: string[];
};

export type CapabilityRuntimeQaPlan = {
  artifactKind: typeof CAPABILITY_RUNTIME_QA_PLAN_KIND;
  schemaVersion: typeof CAPABILITY_RUNTIME_QA_PLAN_SCHEMA_VERSION;
  profileId: string;
  status: 'ready' | 'blocked';
  capabilityLockHash?: string;
  capabilityDependencies: CapabilityQaDependency[];
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
  capabilityId?: string;
  status: 'passed' | 'failed' | 'skipped';
  planHash?: string;
  assertionResults?: CapabilityQaAssertionResult[];
  observationRefs?: string[];
};

export type CapabilityQaAssertionResult = {
  assertionId: string;
  status: 'passed' | 'failed';
  message?: string;
  failureKind?: 'PLAN_MISMATCH' | 'PLAN_SCOPE_REQUIRED';
  capabilityId?: string;
  expectedPlanHash?: string;
  actualPlanHash?: string;
  resultSource?: 'probe_result';
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
  weaponSupplyAvailable?: boolean;
  weaponSupplyNodeId?: string;
  weaponSupplyPickupId?: string;
  weaponSupplyWeaponId?: string;
  weaponSupplyCollected?: boolean;
  weaponSupplyConsumed?: boolean;
  weaponSupplyGranted?: boolean;
  orderedWaveSequence?: boolean;
  gateTriggered?: boolean;
  waveSpawned?: boolean;
  sequenceIndex?: number;
  waveId?: string;
  weaponReset?: boolean;
  currentWeaponId?: string;
  initialWeaponId?: string;
  previousWeaponId?: string;
  checkpointRestoreTriggeredByZeroHealth?: boolean;
  checkpointRestoreRetryConsumed?: boolean;
  checkpointRestoreRetryCountBefore?: number;
  checkpointRestoreRetryCountAfter?: number;
  checkpointRestoreNearestCheckpointSelected?: boolean;
  checkpointRestoreCheckpointId?: string;
  checkpointRestoreExpectedCheckpointId?: string;
  checkpointRestorePositionMatched?: boolean;
  checkpointRestorePlayerRespawned?: boolean;
  checkpointRestoreFailureScreenShown?: boolean;
  retryCountConfigured?: boolean;
  retryCountInitial?: number;
  retryCountBefore?: number;
  retryCountAfter?: number;
  retryCountRemaining?: number;
  retryCountConsumed?: boolean;
  retryCountDecremented?: boolean;
  retryCountExhausted?: boolean;
  retryCountFailureScreenShown?: boolean;
  failureRestartVerified?: boolean;
  failureRestartSchemaVersion?: string;
  failureRestartProfileId?: string;
  failureRestartRuntimeFamily?: string;
  failureRestartNoRetriesRemaining?: boolean;
  failureRestartFailureScreenShown?: boolean;
  failureRestartFailureText?: string;
  failureRestartPromptVisible?: boolean;
  failureRestartPromptText?: string;
  failureRestartInputReceived?: boolean;
  failureRestartInput?: string;
  failureRestartGameRestarted?: boolean;
  failureRestartRestartEventType?: string;
  failureRestartStateReset?: boolean;
  failureRestartPlayerHealthReset?: boolean;
  failureRestartRetryCountReset?: boolean;
  failureRestartFailureScreenCleared?: boolean;
  winFailureTransitionsVerified?: boolean;
  winFailureTransitionsSchemaVersion?: string;
  winFailureTransitionsProfileId?: string;
  winFailureTransitionsRuntimeFamily?: string;
  winFailureTransitionsWinScreenShown?: boolean;
  winFailureTransitionsWinText?: string;
  winFailureTransitionsWinTrigger?: string;
  winFailureTransitionsFailureScreenShown?: boolean;
  winFailureTransitionsFailureText?: string;
  winFailureTransitionsFailureTrigger?: string;
  winFailureTransitionsTerminalStatesDistinct?: boolean;
  winFailureTransitionsNoImplicitFallback?: boolean;
  winFailureTransitionsInputLockedOnTerminal?: boolean;
  hudCurrentWeaponVisible?: boolean;
  hudCurrentWeaponSchemaVersion?: string;
  hudCurrentWeaponProfileId?: string;
  hudCurrentWeaponRuntimeFamily?: string;
  hudCurrentWeaponWeaponId?: string;
  hudCurrentWeaponExpectedWeaponId?: string;
  hudCurrentWeaponSlot?: string;
  hudCurrentWeaponLabelVisible?: boolean;
  hudCurrentWeaponLabelText?: string;
  hudCurrentWeaponIconVisible?: boolean;
  hudCurrentWeaponBoundToWeaponState?: boolean;
  hudCurrentWeaponMatchesCurrentWeapon?: boolean;
  hudPlayerHealthVisible?: boolean;
  hudPlayerHealthSchemaVersion?: string;
  hudPlayerHealthProfileId?: string;
  hudPlayerHealthRuntimeFamily?: string;
  hudPlayerHealthOwnerEntityId?: string;
  hudPlayerHealthCurrent?: number;
  hudPlayerHealthMax?: number;
  hudPlayerHealthRatio?: number;
  hudPlayerHealthLabelVisible?: boolean;
  hudPlayerHealthLabelText?: string;
  hudPlayerHealthBarVisible?: boolean;
  hudPlayerHealthBarValueMatchesPlayerHealth?: boolean;
  hudPlayerHealthBoundToPlayerHealth?: boolean;
  hudPlayerHealthUpdatesOnDamage?: boolean;
  hudRetriesVisible?: boolean;
  hudRetriesSchemaVersion?: string;
  hudRetriesProfileId?: string;
  hudRetriesRuntimeFamily?: string;
  hudRetriesInitial?: number;
  hudRetriesRemaining?: number;
  hudRetriesConsumed?: boolean;
  hudRetriesLabelVisible?: boolean;
  hudRetriesLabelText?: string;
  hudRetriesCounterVisible?: boolean;
  hudRetriesCounterValueMatchesRetryCount?: boolean;
  hudRetriesBoundToRetryCount?: boolean;
  hudRetriesUpdatesOnRetryConsumption?: boolean;
  hudBossHealthVisible?: boolean;
  hudBossHealthSchemaVersion?: string;
  hudBossHealthProfileId?: string;
  hudBossHealthRuntimeFamily?: string;
  hudBossHealthBossEntityId?: string;
  hudBossHealthCurrent?: number;
  hudBossHealthMax?: number;
  hudBossHealthRatio?: number;
  hudBossHealthLabelVisible?: boolean;
  hudBossHealthLabelText?: string;
  hudBossHealthBarVisible?: boolean;
  hudBossHealthBarValueMatchesBoss?: boolean;
  hudBossHealthBoundToBossLifecycle?: boolean;
  hudBossHealthUpdatesOnDamage?: boolean;
  stateTransitionGraphDeclared?: boolean;
  stateTransitionGraphId?: string;
  stateTransitionGraphStateCount?: number;
  stateTransitionGraphTransitionCount?: number;
  stateTransitionGraphFromState?: string;
  stateTransitionGraphToState?: string;
  stateTransitionGraphTrigger?: string;
  stateTransitionGraphTerminalStatesIncluded?: boolean;
  stateTransitionGraphNoImplicitFallback?: boolean;
  stateTransitionGraphReachabilityVerified?: boolean;
  runtimeManifestBound?: boolean;
  runtimeManifestRuntimeFamily?: string;
  runtimeManifestProfileId?: string;
  runtimeManifestTemplateId?: string;
  runtimeManifestCapabilityLockBound?: boolean;
  runtimeManifestCapabilityId?: string;
  runtimeManifestSystemId?: string;
  runtimeManifestSystemVersion?: string;
  runtimeManifestSystemPhase?: string;
  runtimeManifestSystemDependencyCount?: number;
  runtimeManifestLoaderPlanBound?: boolean;
  runtimeModuleLoadReceiptLoaded?: boolean;
  runtimeModuleLoadReceiptKind?: string;
  runtimeModuleLoadReceiptSchemaVersion?: string;
  runtimeModuleLoadReceiptHashPresent?: boolean;
  runtimeModuleLoadReceiptLoadOrderCount?: number;
  runtimeModuleLoadReceiptLifecycleEventCount?: number;
  runtimeModuleLoadReceiptIssuesCount?: number;
  runtimeModuleLoadReceiptCapabilityLockHashMatched?: boolean;
  runtimeModuleLoadReceiptRuntimeManifestHashMatched?: boolean;
  runtimeModuleLoadReceiptRuntimePlanHashMatched?: boolean;
  runtimeModuleLoadReceiptLoaderPlanHashMatched?: boolean;
  runtimeModuleLoadReceiptLifecycleComplete?: boolean;
  runtimePlanCoverageComputed?: boolean;
  runtimePlanCoverageKind?: string;
  runtimePlanCoverageSchemaVersion?: string;
  runtimePlanCoverageProfileId?: string;
  runtimePlanCoverageRuntimeFamily?: string;
  runtimePlanCoverageCapabilityLockMatched?: boolean;
  runtimePlanCoverageRequiredCapabilitiesEnumerated?: boolean;
  runtimePlanCoveragePackageInventoryMatched?: boolean;
  runtimePlanCoverageMissingCapabilitiesReported?: boolean;
  runtimePlanCoverageNoUnclassifiedRequiredCapabilities?: boolean;
  runtimePlanCoverageReportHashPresent?: boolean;
  spawnExplicitDeclarationsVerified?: boolean;
  spawnExplicitDeclarationsSchemaVersion?: string;
  spawnExplicitDeclarationsProfileId?: string;
  spawnExplicitDeclarationsRuntimeFamily?: string;
  spawnExplicitDeclarationsRuntimeManifestBound?: boolean;
  spawnExplicitDeclarationsCapabilityLockBound?: boolean;
  spawnExplicitDeclarationsDeclarationCount?: number;
  spawnExplicitDeclarationsStaticDeclared?: boolean;
  spawnExplicitDeclarationsEnemyWaveDeclared?: boolean;
  spawnExplicitDeclarationsNoImplicitFallback?: boolean;
  spawnExplicitDeclarationsHiddenSpawnDetected?: boolean;
  spawnStopOnBossDefeatVerified?: boolean;
  spawnStopOnBossDefeatSchemaVersion?: string;
  spawnStopOnBossDefeatProfileId?: string;
  spawnStopOnBossDefeatRuntimeFamily?: string;
  spawnStopOnBossDefeatBossDefeated?: boolean;
  spawnStopOnBossDefeatBossEntityId?: string;
  spawnStopOnBossDefeatStopReason?: string;
  spawnStopOnBossDefeatSpawnPipelineStopped?: boolean;
  spawnStopOnBossDefeatPendingWavesCancelled?: boolean;
  spawnStopOnBossDefeatPostDefeatSpawnAttemptBlocked?: boolean;
  spawnStopOnBossDefeatPostDefeatSpawnCount?: number;
  spawnStopOnBossDefeatNoHiddenSpawnDetected?: boolean;
  sceneOrderedSegmentsVerified?: boolean;
  sceneOrderedSegmentsSchemaVersion?: string;
  sceneOrderedSegmentsProfileId?: string;
  sceneOrderedSegmentsRuntimeFamily?: string;
  sceneOrderedSegmentsSceneId?: string;
  sceneOrderedSegmentsCount?: number;
  sceneOrderedSegmentsFirstId?: string;
  sceneOrderedSegmentsSecondId?: string;
  sceneOrderedSegmentsThirdId?: string;
  sceneOrderedSegmentsOrderMatched?: boolean;
  sceneOrderedSegmentsContinuous?: boolean;
  sceneOrderedSegmentsAllNamed?: boolean;
  sceneOrderedSegmentsSceneBindingMatched?: boolean;
  sceneOrderedSegmentsNoGaps?: boolean;
  sceneVisualPresentationMetadataVerified?: boolean;
  sceneVisualPresentationSchemaVersion?: string;
  sceneVisualPresentationProfileId?: string;
  sceneVisualPresentationRuntimeFamily?: string;
  sceneVisualPresentationStyleId?: string;
  sceneVisualPresentationStyleLabel?: string;
  sceneVisualPresentationPixelArt?: boolean;
  sceneVisualPresentationColorDepthBits?: number;
  sceneVisualPresentationOriginalityPolicy?: string;
  sceneVisualPresentationAssetPlanBound?: boolean;
  sceneVisualPresentationTemplateParamsBound?: boolean;
  sceneVisualPresentationNoProtectedReuse?: boolean;
  encounterGateClosedEntrance?: boolean;
  encounterGateGateId?: string;
  encounterGateEntranceId?: string;
  encounterGateClosedBeforeWaveSpawn?: boolean;
  encounterGateWaveSequenceBlockedUntilClosed?: boolean;
  encounterGateNextWaveId?: string;
  encounterGateSequenceIndex?: number;
  encounterGatePlayerBacktrackingBlocked?: boolean;
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
  unknownNodesRejected?: boolean;
  unknownNodeValidationSchemaVersion?: string;
  unknownNodeFailureCode?: string;
  unknownNodeAccepted?: boolean;
  fallbackRuntimeGenerated?: boolean;
  validatorFailedClosed?: boolean;
  unknownNodeKind?: string;
  unknownNodePath?: string;
  unknownNodeProfileId?: string;
  deepSeekAuthoritativeDraftProduced?: boolean;
  deepSeekProviderId?: string;
  deepSeekDraftArtifactKind?: string;
  deepSeekDraftSchemaVersion?: string;
  deepSeekDraftNormalized?: boolean;
  deepSeekCanonicalSchemaVersion?: string;
  deepSeekComposedSchemaHashMatched?: boolean;
  deepSeekCapabilityLockHashMatched?: boolean;
  deepSeekTrustedEvidenceRejected?: boolean;
  fixedPromptEndToEndVerified?: boolean;
  fixedPromptSchemaVersion?: string;
  fixedPromptSource?: string;
  fixedPromptProfileId?: string;
  fixedPromptRuntimeFamily?: string;
  fixedPromptBindingObserved?: boolean;
  fixedPromptProfileBindingObserved?: boolean;
  fixedPromptProviderDraftValidated?: boolean;
  fixedPromptProviderId?: string;
  fixedPromptDraftSchemaVersion?: string;
  fixedPromptCanonicalSchemaVersion?: string;
  fixedPromptHashMatched?: boolean;
  fixedPromptFallbackPromptUsed?: boolean;
  metamorphicSemanticHashVerified?: boolean;
  metamorphicSemanticHashSchemaVersion?: string;
  metamorphicSemanticHashProfileId?: string;
  metamorphicSemanticHashRuntimeFamily?: string;
  metamorphicTransformSuiteId?: string;
  metamorphicBaseSemanticHash?: string;
  metamorphicVariantSemanticHash?: string;
  metamorphicHashMatched?: boolean;
  metamorphicTransformCount?: number;
  metamorphicSemanticIntentPreserved?: boolean;
  metamorphicNoCanonicalDrift?: boolean;
  replayStabilityVerified?: boolean;
  replayStabilitySchemaVersion?: string;
  replayStabilityProfileId?: string;
  replayStabilityRuntimeFamily?: string;
  replayStabilitySeed?: string;
  replayStabilityInputTimelineHash?: string;
  replayStabilityBaselineTraceHash?: string;
  replayStabilityReplayTraceHash?: string;
  replayStabilityTraceMatched?: boolean;
  replayStabilityFrameCount?: number;
  replayStabilityNoNondeterministicDrift?: boolean;
  replayStabilitySamePlan?: boolean;
  finalOracleGateApproved?: boolean;
  finalOracleReviewedCommitShaPresent?: boolean;
  finalOracleReviewedSkillRevisionPresent?: boolean;
  finalOracleResultMatchesReviewedCommit?: boolean;
  finalOracleResultMatchesReviewedSkillRevision?: boolean;
  finalOracleCheckpointMatched?: boolean;
  finalOracleResultIdPresent?: boolean;
  finalOracleReviewedCommitIsNotReceipt?: boolean;
  finalOracleP0Count?: number;
  finalOracleP1Count?: number;
  finalOracleP2Count?: number;
  finalOracleGateStatus?: string;
  finalOracleCandidateCommitSha?: string;
  finalOracleReviewedCommitSha?: string;
  finalOracleCandidateSkillRevision?: string;
  finalOracleReviewedSkillRevision?: string;
  finalOracleResultId?: string;
  finalOracleCheckpointId?: string;
  finalOracleExpectedCheckpointId?: string;
  finalOracleReceiptCommitSha?: string;
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
  timedExplosionActive?: boolean;
  timedExplosionHazardId?: string;
  timedExplosionTimerId?: string;
  timedExplosionCountdownMs?: number;
  timedExplosionElapsedMs?: number;
  timedExplosionTriggerCondition?: string;
  timedExplosionTriggeredByTimer?: boolean;
  timedExplosionOccurred?: boolean;
  timedExplosionDamagesPlayer?: boolean;
  timedExplosionDamage?: number;
  timedExplosionRadius?: number;
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
  capabilityDependencies: CapabilityQaDependency[];
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
    capabilityDependencies: buildCapabilityDependencies(lockedPackages),
    requiredProbes: requiredProbes.sort(comparePlanProbes),
    optionalProbes: optionalProbes.sort(comparePlanProbes),
    profileScenarioProbes,
    step33RenderFidelityEvidenceRefs: [...(input.step33RenderFidelityEvidenceRefs ?? [])].sort(),
    step34AmendmentVerificationRefs: [...(input.step34AmendmentVerificationRefs ?? [])].sort(),
    diagnostics
  };
  return { ...payload, planHash: hashStableJson(payload) };
}

export function evaluateCapabilityQaReport(input: {
  plan: CapabilityRuntimeQaPlan;
  probeResults: readonly CapabilityQaProbeResult[];
  requirePlanScopedResults?: boolean;
}): CapabilityQaReport {
  const requiredPlanProbes = [...input.plan.requiredProbes, ...input.plan.profileScenarioProbes.filter((probe) => probe.severity === 'required')];
  const optionalPlanProbes = [...input.plan.optionalProbes, ...input.plan.profileScenarioProbes.filter((probe) => probe.severity === 'optional')];
  const planProbesById = new Map([...requiredPlanProbes, ...optionalPlanProbes].map((probe) => [probe.id, probe]));
  const results = new Map(
    input.probeResults.map((result) => [
      result.probeId,
      bindProbeResultToPlan(result, input.plan.planHash, planProbesById.get(result.probeId), input.requirePlanScopedResults === true)
    ])
  );
  const requiredResults = requiredPlanProbes.map((probe) => results.get(probe.id) ?? skippedProbeResult(probe));
  const optionalResults = optionalPlanProbes.map((probe) => results.get(probe.id) ?? skippedProbeResult(probe));
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
    capabilityDependencies: input.plan.capabilityDependencies,
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
    .flatMap((probe) => buildProbeResultFromRuntimeEvidence(probe, observedByProbeId.get(probe.id), input.plan.planHash))
    .sort(compareProbeResults);
}

function buildProbeResultFromRuntimeEvidence(
  probe: CapabilityQaPlanProbe,
  observed: CapabilityRuntimeObservedProbeEvidence | undefined,
  planHash: string
): CapabilityQaProbeResult[] {
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
      ...(probe.capabilityId === undefined ? {} : { capabilityId: probe.capabilityId }),
      status: assertionResults.every((assertion) => assertion.status === 'passed') ? 'passed' : 'failed',
      planHash,
      assertionResults,
      observationRefs: observed.sourceRef === undefined ? [...eventTypes].sort() : [observed.sourceRef]
    }
  ];
}

function bindProbeResultToPlan(
  result: CapabilityQaProbeResult,
  planHash: string,
  probe: CapabilityQaPlanProbe | undefined,
  requirePlanScopedResult: boolean
): CapabilityQaProbeResult {
  const planBoundResult =
    probe?.capabilityId === undefined || result.capabilityId === probe.capabilityId ? result : { ...result, capabilityId: probe.capabilityId };
  if (result.planHash === planHash) {
    return planBoundResult;
  }
  if (result.planHash === undefined && !requirePlanScopedResult) {
    return planBoundResult;
  }
  const planFailureKind = result.planHash === undefined ? 'PLAN_SCOPE_REQUIRED' : 'PLAN_MISMATCH';
  return {
    ...planBoundResult,
    status: 'failed',
    assertionResults: [
      ...(planBoundResult.assertionResults ?? []),
      {
        assertionId: `${result.probeId}.plan_hash`,
        status: 'failed',
        failureKind: planFailureKind,
        capabilityId: probe?.capabilityId,
        expectedPlanHash: planHash,
        actualPlanHash: result.planHash ?? '<missing>',
        resultSource: 'probe_result',
        message: `Probe result planHash expected ${planHash}, observed ${result.planHash ?? '<missing>'}.`
      }
    ]
  };
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
  const finalOracleFacts = deriveFinalOracleGateFacts(observed);

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
    ...compareExpectedBooleanField('weaponSupplyAvailable', expected, observed.weaponSupplyAvailable),
    ...compareExpectedStringField('weaponSupplyNodeId', expected, observed.weaponSupplyNodeId),
    ...compareExpectedStringField('weaponSupplyPickupId', expected, observed.weaponSupplyPickupId),
    ...compareExpectedStringField('weaponSupplyWeaponId', expected, observed.weaponSupplyWeaponId),
    ...compareExpectedBooleanField('weaponSupplyCollected', expected, observed.weaponSupplyCollected),
    ...compareExpectedBooleanField('weaponSupplyConsumed', expected, observed.weaponSupplyConsumed),
    ...compareExpectedBooleanField('weaponSupplyGranted', expected, observed.weaponSupplyGranted),
    ...compareExpectedBooleanField('orderedWaveSequence', expected, observed.orderedWaveSequence),
    ...compareExpectedBooleanField('gateTriggered', expected, observed.gateTriggered),
    ...compareExpectedBooleanField('waveSpawned', expected, observed.waveSpawned),
    ...compareExpectedNumberField('sequenceIndex', expected, observed.sequenceIndex),
    ...compareExpectedStringField('waveId', expected, observed.waveId),
    ...compareExpectedBooleanField('weaponReset', expected, observed.weaponReset),
    ...compareExpectedStringField('currentWeaponId', expected, observed.currentWeaponId),
    ...compareExpectedStringField('initialWeaponId', expected, observed.initialWeaponId),
    ...compareExpectedStringField('previousWeaponId', expected, observed.previousWeaponId),
    ...compareExpectedBooleanField('checkpointRestoreTriggeredByZeroHealth', expected, observed.checkpointRestoreTriggeredByZeroHealth),
    ...compareExpectedBooleanField('checkpointRestoreRetryConsumed', expected, observed.checkpointRestoreRetryConsumed),
    ...compareExpectedNumberField('checkpointRestoreRetryCountBefore', expected, observed.checkpointRestoreRetryCountBefore),
    ...compareExpectedNumberField('checkpointRestoreRetryCountAfter', expected, observed.checkpointRestoreRetryCountAfter),
    ...compareExpectedBooleanField('checkpointRestoreNearestCheckpointSelected', expected, observed.checkpointRestoreNearestCheckpointSelected),
    ...compareExpectedStringField('checkpointRestoreCheckpointId', expected, observed.checkpointRestoreCheckpointId),
    ...compareExpectedStringField('checkpointRestoreExpectedCheckpointId', expected, observed.checkpointRestoreExpectedCheckpointId),
    ...compareExpectedBooleanField('checkpointRestorePositionMatched', expected, observed.checkpointRestorePositionMatched),
    ...compareExpectedBooleanField('checkpointRestorePlayerRespawned', expected, observed.checkpointRestorePlayerRespawned),
    ...compareExpectedBooleanField('checkpointRestoreFailureScreenShown', expected, observed.checkpointRestoreFailureScreenShown),
    ...compareExpectedBooleanField('retryCountConfigured', expected, observed.retryCountConfigured),
    ...compareExpectedNumberField('retryCountInitial', expected, observed.retryCountInitial),
    ...compareExpectedNumberField('retryCountBefore', expected, observed.retryCountBefore),
    ...compareExpectedNumberField('retryCountAfter', expected, observed.retryCountAfter),
    ...compareExpectedNumberField('retryCountRemaining', expected, observed.retryCountRemaining),
    ...compareExpectedBooleanField('retryCountConsumed', expected, observed.retryCountConsumed),
    ...compareExpectedBooleanField('retryCountDecremented', expected, observed.retryCountDecremented),
    ...compareExpectedBooleanField('retryCountExhausted', expected, observed.retryCountExhausted),
    ...compareExpectedBooleanField('retryCountFailureScreenShown', expected, observed.retryCountFailureScreenShown),
    ...compareExpectedBooleanField('failureRestartVerified', expected, observed.failureRestartVerified),
    ...compareExpectedStringField('failureRestartSchemaVersion', expected, observed.failureRestartSchemaVersion),
    ...compareExpectedStringField('failureRestartProfileId', expected, observed.failureRestartProfileId),
    ...compareExpectedStringField('failureRestartRuntimeFamily', expected, observed.failureRestartRuntimeFamily),
    ...compareExpectedBooleanField('failureRestartNoRetriesRemaining', expected, observed.failureRestartNoRetriesRemaining),
    ...compareExpectedBooleanField('failureRestartFailureScreenShown', expected, observed.failureRestartFailureScreenShown),
    ...compareExpectedStringField('failureRestartFailureText', expected, observed.failureRestartFailureText),
    ...compareExpectedBooleanField('failureRestartPromptVisible', expected, observed.failureRestartPromptVisible),
    ...compareExpectedStringField('failureRestartPromptText', expected, observed.failureRestartPromptText),
    ...compareExpectedBooleanField('failureRestartInputReceived', expected, observed.failureRestartInputReceived),
    ...compareExpectedStringField('failureRestartInput', expected, observed.failureRestartInput),
    ...compareExpectedBooleanField('failureRestartGameRestarted', expected, observed.failureRestartGameRestarted),
    ...compareExpectedStringField('failureRestartRestartEventType', expected, observed.failureRestartRestartEventType),
    ...compareExpectedBooleanField('failureRestartStateReset', expected, observed.failureRestartStateReset),
    ...compareExpectedBooleanField('failureRestartPlayerHealthReset', expected, observed.failureRestartPlayerHealthReset),
    ...compareExpectedBooleanField('failureRestartRetryCountReset', expected, observed.failureRestartRetryCountReset),
    ...compareExpectedBooleanField('failureRestartFailureScreenCleared', expected, observed.failureRestartFailureScreenCleared),
    ...compareExpectedBooleanField('winFailureTransitionsVerified', expected, observed.winFailureTransitionsVerified),
    ...compareExpectedStringField('winFailureTransitionsSchemaVersion', expected, observed.winFailureTransitionsSchemaVersion),
    ...compareExpectedStringField('winFailureTransitionsProfileId', expected, observed.winFailureTransitionsProfileId),
    ...compareExpectedStringField('winFailureTransitionsRuntimeFamily', expected, observed.winFailureTransitionsRuntimeFamily),
    ...compareExpectedBooleanField('winFailureTransitionsWinScreenShown', expected, observed.winFailureTransitionsWinScreenShown),
    ...compareExpectedStringField('winFailureTransitionsWinText', expected, observed.winFailureTransitionsWinText),
    ...compareExpectedStringField('winFailureTransitionsWinTrigger', expected, observed.winFailureTransitionsWinTrigger),
    ...compareExpectedBooleanField('winFailureTransitionsFailureScreenShown', expected, observed.winFailureTransitionsFailureScreenShown),
    ...compareExpectedStringField('winFailureTransitionsFailureText', expected, observed.winFailureTransitionsFailureText),
    ...compareExpectedStringField('winFailureTransitionsFailureTrigger', expected, observed.winFailureTransitionsFailureTrigger),
    ...compareExpectedBooleanField(
      'winFailureTransitionsTerminalStatesDistinct',
      expected,
      observed.winFailureTransitionsTerminalStatesDistinct
    ),
    ...compareExpectedBooleanField('winFailureTransitionsNoImplicitFallback', expected, observed.winFailureTransitionsNoImplicitFallback),
    ...compareExpectedBooleanField(
      'winFailureTransitionsInputLockedOnTerminal',
      expected,
      observed.winFailureTransitionsInputLockedOnTerminal
    ),
    ...compareExpectedBooleanField('hudCurrentWeaponVisible', expected, observed.hudCurrentWeaponVisible),
    ...compareExpectedStringField('hudCurrentWeaponSchemaVersion', expected, observed.hudCurrentWeaponSchemaVersion),
    ...compareExpectedStringField('hudCurrentWeaponProfileId', expected, observed.hudCurrentWeaponProfileId),
    ...compareExpectedStringField('hudCurrentWeaponRuntimeFamily', expected, observed.hudCurrentWeaponRuntimeFamily),
    ...compareExpectedStringField('hudCurrentWeaponWeaponId', expected, observed.hudCurrentWeaponWeaponId),
    ...compareExpectedStringField('hudCurrentWeaponExpectedWeaponId', expected, observed.hudCurrentWeaponExpectedWeaponId),
    ...compareExpectedStringField('hudCurrentWeaponSlot', expected, observed.hudCurrentWeaponSlot),
    ...compareExpectedBooleanField('hudCurrentWeaponLabelVisible', expected, observed.hudCurrentWeaponLabelVisible),
    ...compareExpectedStringField('hudCurrentWeaponLabelText', expected, observed.hudCurrentWeaponLabelText),
    ...compareExpectedBooleanField('hudCurrentWeaponIconVisible', expected, observed.hudCurrentWeaponIconVisible),
    ...compareExpectedBooleanField('hudCurrentWeaponBoundToWeaponState', expected, observed.hudCurrentWeaponBoundToWeaponState),
    ...compareExpectedBooleanField('hudCurrentWeaponMatchesCurrentWeapon', expected, observed.hudCurrentWeaponMatchesCurrentWeapon),
    ...compareExpectedBooleanField('hudPlayerHealthVisible', expected, observed.hudPlayerHealthVisible),
    ...compareExpectedStringField('hudPlayerHealthSchemaVersion', expected, observed.hudPlayerHealthSchemaVersion),
    ...compareExpectedStringField('hudPlayerHealthProfileId', expected, observed.hudPlayerHealthProfileId),
    ...compareExpectedStringField('hudPlayerHealthRuntimeFamily', expected, observed.hudPlayerHealthRuntimeFamily),
    ...compareExpectedStringField('hudPlayerHealthOwnerEntityId', expected, observed.hudPlayerHealthOwnerEntityId),
    ...compareExpectedNumberField('hudPlayerHealthCurrent', expected, observed.hudPlayerHealthCurrent),
    ...compareExpectedNumberField('hudPlayerHealthMax', expected, observed.hudPlayerHealthMax),
    ...compareExpectedNumberField('hudPlayerHealthRatio', expected, observed.hudPlayerHealthRatio),
    ...compareExpectedBooleanField('hudPlayerHealthLabelVisible', expected, observed.hudPlayerHealthLabelVisible),
    ...compareExpectedStringField('hudPlayerHealthLabelText', expected, observed.hudPlayerHealthLabelText),
    ...compareExpectedBooleanField('hudPlayerHealthBarVisible', expected, observed.hudPlayerHealthBarVisible),
    ...compareExpectedBooleanField(
      'hudPlayerHealthBarValueMatchesPlayerHealth',
      expected,
      observed.hudPlayerHealthBarValueMatchesPlayerHealth
    ),
    ...compareExpectedBooleanField('hudPlayerHealthBoundToPlayerHealth', expected, observed.hudPlayerHealthBoundToPlayerHealth),
    ...compareExpectedBooleanField('hudPlayerHealthUpdatesOnDamage', expected, observed.hudPlayerHealthUpdatesOnDamage),
    ...compareExpectedBooleanField('hudRetriesVisible', expected, observed.hudRetriesVisible),
    ...compareExpectedStringField('hudRetriesSchemaVersion', expected, observed.hudRetriesSchemaVersion),
    ...compareExpectedStringField('hudRetriesProfileId', expected, observed.hudRetriesProfileId),
    ...compareExpectedStringField('hudRetriesRuntimeFamily', expected, observed.hudRetriesRuntimeFamily),
    ...compareExpectedNumberField('hudRetriesInitial', expected, observed.hudRetriesInitial),
    ...compareExpectedNumberField('hudRetriesRemaining', expected, observed.hudRetriesRemaining),
    ...compareExpectedBooleanField('hudRetriesConsumed', expected, observed.hudRetriesConsumed),
    ...compareExpectedBooleanField('hudRetriesLabelVisible', expected, observed.hudRetriesLabelVisible),
    ...compareExpectedStringField('hudRetriesLabelText', expected, observed.hudRetriesLabelText),
    ...compareExpectedBooleanField('hudRetriesCounterVisible', expected, observed.hudRetriesCounterVisible),
    ...compareExpectedBooleanField(
      'hudRetriesCounterValueMatchesRetryCount',
      expected,
      observed.hudRetriesCounterValueMatchesRetryCount
    ),
    ...compareExpectedBooleanField('hudRetriesBoundToRetryCount', expected, observed.hudRetriesBoundToRetryCount),
    ...compareExpectedBooleanField('hudRetriesUpdatesOnRetryConsumption', expected, observed.hudRetriesUpdatesOnRetryConsumption),
    ...compareExpectedBooleanField('hudBossHealthVisible', expected, observed.hudBossHealthVisible),
    ...compareExpectedStringField('hudBossHealthSchemaVersion', expected, observed.hudBossHealthSchemaVersion),
    ...compareExpectedStringField('hudBossHealthProfileId', expected, observed.hudBossHealthProfileId),
    ...compareExpectedStringField('hudBossHealthRuntimeFamily', expected, observed.hudBossHealthRuntimeFamily),
    ...compareExpectedStringField('hudBossHealthBossEntityId', expected, observed.hudBossHealthBossEntityId),
    ...compareExpectedNumberField('hudBossHealthCurrent', expected, observed.hudBossHealthCurrent),
    ...compareExpectedNumberField('hudBossHealthMax', expected, observed.hudBossHealthMax),
    ...compareExpectedNumberField('hudBossHealthRatio', expected, observed.hudBossHealthRatio),
    ...compareExpectedBooleanField('hudBossHealthLabelVisible', expected, observed.hudBossHealthLabelVisible),
    ...compareExpectedStringField('hudBossHealthLabelText', expected, observed.hudBossHealthLabelText),
    ...compareExpectedBooleanField('hudBossHealthBarVisible', expected, observed.hudBossHealthBarVisible),
    ...compareExpectedBooleanField('hudBossHealthBarValueMatchesBoss', expected, observed.hudBossHealthBarValueMatchesBoss),
    ...compareExpectedBooleanField('hudBossHealthBoundToBossLifecycle', expected, observed.hudBossHealthBoundToBossLifecycle),
    ...compareExpectedBooleanField('hudBossHealthUpdatesOnDamage', expected, observed.hudBossHealthUpdatesOnDamage),
    ...compareExpectedBooleanField('stateTransitionGraphDeclared', expected, observed.stateTransitionGraphDeclared),
    ...compareExpectedStringField('stateTransitionGraphId', expected, observed.stateTransitionGraphId),
    ...compareExpectedNumberField('stateTransitionGraphStateCount', expected, observed.stateTransitionGraphStateCount),
    ...compareExpectedNumberField('stateTransitionGraphTransitionCount', expected, observed.stateTransitionGraphTransitionCount),
    ...compareExpectedStringField('stateTransitionGraphFromState', expected, observed.stateTransitionGraphFromState),
    ...compareExpectedStringField('stateTransitionGraphToState', expected, observed.stateTransitionGraphToState),
    ...compareExpectedStringField('stateTransitionGraphTrigger', expected, observed.stateTransitionGraphTrigger),
    ...compareExpectedBooleanField(
      'stateTransitionGraphTerminalStatesIncluded',
      expected,
      observed.stateTransitionGraphTerminalStatesIncluded
    ),
    ...compareExpectedBooleanField('stateTransitionGraphNoImplicitFallback', expected, observed.stateTransitionGraphNoImplicitFallback),
    ...compareExpectedBooleanField('stateTransitionGraphReachabilityVerified', expected, observed.stateTransitionGraphReachabilityVerified),
    ...compareExpectedBooleanField('runtimeManifestBound', expected, observed.runtimeManifestBound),
    ...compareExpectedStringField('runtimeManifestRuntimeFamily', expected, observed.runtimeManifestRuntimeFamily),
    ...compareExpectedStringField('runtimeManifestProfileId', expected, observed.runtimeManifestProfileId),
    ...compareExpectedStringField('runtimeManifestTemplateId', expected, observed.runtimeManifestTemplateId),
    ...compareExpectedBooleanField('runtimeManifestCapabilityLockBound', expected, observed.runtimeManifestCapabilityLockBound),
    ...compareExpectedStringField('runtimeManifestCapabilityId', expected, observed.runtimeManifestCapabilityId),
    ...compareExpectedStringField('runtimeManifestSystemId', expected, observed.runtimeManifestSystemId),
    ...compareExpectedStringField('runtimeManifestSystemVersion', expected, observed.runtimeManifestSystemVersion),
    ...compareExpectedStringField('runtimeManifestSystemPhase', expected, observed.runtimeManifestSystemPhase),
    ...compareExpectedNumberField('runtimeManifestSystemDependencyCount', expected, observed.runtimeManifestSystemDependencyCount),
    ...compareExpectedBooleanField('runtimeManifestLoaderPlanBound', expected, observed.runtimeManifestLoaderPlanBound),
    ...compareExpectedBooleanField('runtimeModuleLoadReceiptLoaded', expected, observed.runtimeModuleLoadReceiptLoaded),
    ...compareExpectedStringField('runtimeModuleLoadReceiptKind', expected, observed.runtimeModuleLoadReceiptKind),
    ...compareExpectedStringField('runtimeModuleLoadReceiptSchemaVersion', expected, observed.runtimeModuleLoadReceiptSchemaVersion),
    ...compareExpectedBooleanField('runtimeModuleLoadReceiptHashPresent', expected, observed.runtimeModuleLoadReceiptHashPresent),
    ...compareExpectedNumberField('runtimeModuleLoadReceiptLoadOrderCount', expected, observed.runtimeModuleLoadReceiptLoadOrderCount),
    ...compareExpectedNumberField(
      'runtimeModuleLoadReceiptLifecycleEventCount',
      expected,
      observed.runtimeModuleLoadReceiptLifecycleEventCount
    ),
    ...compareExpectedNumberField('runtimeModuleLoadReceiptIssuesCount', expected, observed.runtimeModuleLoadReceiptIssuesCount),
    ...compareExpectedBooleanField(
      'runtimeModuleLoadReceiptCapabilityLockHashMatched',
      expected,
      observed.runtimeModuleLoadReceiptCapabilityLockHashMatched
    ),
    ...compareExpectedBooleanField(
      'runtimeModuleLoadReceiptRuntimeManifestHashMatched',
      expected,
      observed.runtimeModuleLoadReceiptRuntimeManifestHashMatched
    ),
    ...compareExpectedBooleanField(
      'runtimeModuleLoadReceiptRuntimePlanHashMatched',
      expected,
      observed.runtimeModuleLoadReceiptRuntimePlanHashMatched
    ),
    ...compareExpectedBooleanField(
      'runtimeModuleLoadReceiptLoaderPlanHashMatched',
      expected,
      observed.runtimeModuleLoadReceiptLoaderPlanHashMatched
    ),
    ...compareExpectedBooleanField('runtimeModuleLoadReceiptLifecycleComplete', expected, observed.runtimeModuleLoadReceiptLifecycleComplete),
    ...compareExpectedBooleanField('runtimePlanCoverageComputed', expected, observed.runtimePlanCoverageComputed),
    ...compareExpectedStringField('runtimePlanCoverageKind', expected, observed.runtimePlanCoverageKind),
    ...compareExpectedStringField('runtimePlanCoverageSchemaVersion', expected, observed.runtimePlanCoverageSchemaVersion),
    ...compareExpectedStringField('runtimePlanCoverageProfileId', expected, observed.runtimePlanCoverageProfileId),
    ...compareExpectedStringField('runtimePlanCoverageRuntimeFamily', expected, observed.runtimePlanCoverageRuntimeFamily),
    ...compareExpectedBooleanField('runtimePlanCoverageCapabilityLockMatched', expected, observed.runtimePlanCoverageCapabilityLockMatched),
    ...compareExpectedBooleanField(
      'runtimePlanCoverageRequiredCapabilitiesEnumerated',
      expected,
      observed.runtimePlanCoverageRequiredCapabilitiesEnumerated
    ),
    ...compareExpectedBooleanField('runtimePlanCoveragePackageInventoryMatched', expected, observed.runtimePlanCoveragePackageInventoryMatched),
    ...compareExpectedBooleanField('runtimePlanCoverageMissingCapabilitiesReported', expected, observed.runtimePlanCoverageMissingCapabilitiesReported),
    ...compareExpectedBooleanField(
      'runtimePlanCoverageNoUnclassifiedRequiredCapabilities',
      expected,
      observed.runtimePlanCoverageNoUnclassifiedRequiredCapabilities
    ),
    ...compareExpectedBooleanField('runtimePlanCoverageReportHashPresent', expected, observed.runtimePlanCoverageReportHashPresent),
    ...compareExpectedBooleanField('spawnExplicitDeclarationsVerified', expected, observed.spawnExplicitDeclarationsVerified),
    ...compareExpectedStringField('spawnExplicitDeclarationsSchemaVersion', expected, observed.spawnExplicitDeclarationsSchemaVersion),
    ...compareExpectedStringField('spawnExplicitDeclarationsProfileId', expected, observed.spawnExplicitDeclarationsProfileId),
    ...compareExpectedStringField('spawnExplicitDeclarationsRuntimeFamily', expected, observed.spawnExplicitDeclarationsRuntimeFamily),
    ...compareExpectedBooleanField(
      'spawnExplicitDeclarationsRuntimeManifestBound',
      expected,
      observed.spawnExplicitDeclarationsRuntimeManifestBound
    ),
    ...compareExpectedBooleanField(
      'spawnExplicitDeclarationsCapabilityLockBound',
      expected,
      observed.spawnExplicitDeclarationsCapabilityLockBound
    ),
    ...compareExpectedNumberField(
      'spawnExplicitDeclarationsDeclarationCount',
      expected,
      observed.spawnExplicitDeclarationsDeclarationCount
    ),
    ...compareExpectedBooleanField(
      'spawnExplicitDeclarationsStaticDeclared',
      expected,
      observed.spawnExplicitDeclarationsStaticDeclared
    ),
    ...compareExpectedBooleanField(
      'spawnExplicitDeclarationsEnemyWaveDeclared',
      expected,
      observed.spawnExplicitDeclarationsEnemyWaveDeclared
    ),
    ...compareExpectedBooleanField(
      'spawnExplicitDeclarationsNoImplicitFallback',
      expected,
      observed.spawnExplicitDeclarationsNoImplicitFallback
    ),
    ...compareExpectedBooleanField(
      'spawnExplicitDeclarationsHiddenSpawnDetected',
      expected,
      observed.spawnExplicitDeclarationsHiddenSpawnDetected
    ),
    ...compareExpectedBooleanField('spawnStopOnBossDefeatVerified', expected, observed.spawnStopOnBossDefeatVerified),
    ...compareExpectedStringField('spawnStopOnBossDefeatSchemaVersion', expected, observed.spawnStopOnBossDefeatSchemaVersion),
    ...compareExpectedStringField('spawnStopOnBossDefeatProfileId', expected, observed.spawnStopOnBossDefeatProfileId),
    ...compareExpectedStringField('spawnStopOnBossDefeatRuntimeFamily', expected, observed.spawnStopOnBossDefeatRuntimeFamily),
    ...compareExpectedBooleanField('spawnStopOnBossDefeatBossDefeated', expected, observed.spawnStopOnBossDefeatBossDefeated),
    ...compareExpectedStringField('spawnStopOnBossDefeatBossEntityId', expected, observed.spawnStopOnBossDefeatBossEntityId),
    ...compareExpectedStringField('spawnStopOnBossDefeatStopReason', expected, observed.spawnStopOnBossDefeatStopReason),
    ...compareExpectedBooleanField(
      'spawnStopOnBossDefeatSpawnPipelineStopped',
      expected,
      observed.spawnStopOnBossDefeatSpawnPipelineStopped
    ),
    ...compareExpectedBooleanField(
      'spawnStopOnBossDefeatPendingWavesCancelled',
      expected,
      observed.spawnStopOnBossDefeatPendingWavesCancelled
    ),
    ...compareExpectedBooleanField(
      'spawnStopOnBossDefeatPostDefeatSpawnAttemptBlocked',
      expected,
      observed.spawnStopOnBossDefeatPostDefeatSpawnAttemptBlocked
    ),
    ...compareExpectedNumberField(
      'spawnStopOnBossDefeatPostDefeatSpawnCount',
      expected,
      observed.spawnStopOnBossDefeatPostDefeatSpawnCount
    ),
    ...compareExpectedBooleanField(
      'spawnStopOnBossDefeatNoHiddenSpawnDetected',
      expected,
      observed.spawnStopOnBossDefeatNoHiddenSpawnDetected
    ),
    ...compareExpectedBooleanField('sceneOrderedSegmentsVerified', expected, observed.sceneOrderedSegmentsVerified),
    ...compareExpectedStringField('sceneOrderedSegmentsSchemaVersion', expected, observed.sceneOrderedSegmentsSchemaVersion),
    ...compareExpectedStringField('sceneOrderedSegmentsProfileId', expected, observed.sceneOrderedSegmentsProfileId),
    ...compareExpectedStringField('sceneOrderedSegmentsRuntimeFamily', expected, observed.sceneOrderedSegmentsRuntimeFamily),
    ...compareExpectedStringField('sceneOrderedSegmentsSceneId', expected, observed.sceneOrderedSegmentsSceneId),
    ...compareExpectedNumberField('sceneOrderedSegmentsCount', expected, observed.sceneOrderedSegmentsCount),
    ...compareExpectedStringField('sceneOrderedSegmentsFirstId', expected, observed.sceneOrderedSegmentsFirstId),
    ...compareExpectedStringField('sceneOrderedSegmentsSecondId', expected, observed.sceneOrderedSegmentsSecondId),
    ...compareExpectedStringField('sceneOrderedSegmentsThirdId', expected, observed.sceneOrderedSegmentsThirdId),
    ...compareExpectedBooleanField('sceneOrderedSegmentsOrderMatched', expected, observed.sceneOrderedSegmentsOrderMatched),
    ...compareExpectedBooleanField('sceneOrderedSegmentsContinuous', expected, observed.sceneOrderedSegmentsContinuous),
    ...compareExpectedBooleanField('sceneOrderedSegmentsAllNamed', expected, observed.sceneOrderedSegmentsAllNamed),
    ...compareExpectedBooleanField('sceneOrderedSegmentsSceneBindingMatched', expected, observed.sceneOrderedSegmentsSceneBindingMatched),
    ...compareExpectedBooleanField('sceneOrderedSegmentsNoGaps', expected, observed.sceneOrderedSegmentsNoGaps),
    ...compareExpectedBooleanField('sceneVisualPresentationMetadataVerified', expected, observed.sceneVisualPresentationMetadataVerified),
    ...compareExpectedStringField('sceneVisualPresentationSchemaVersion', expected, observed.sceneVisualPresentationSchemaVersion),
    ...compareExpectedStringField('sceneVisualPresentationProfileId', expected, observed.sceneVisualPresentationProfileId),
    ...compareExpectedStringField('sceneVisualPresentationRuntimeFamily', expected, observed.sceneVisualPresentationRuntimeFamily),
    ...compareExpectedStringField('sceneVisualPresentationStyleId', expected, observed.sceneVisualPresentationStyleId),
    ...compareExpectedStringField('sceneVisualPresentationStyleLabel', expected, observed.sceneVisualPresentationStyleLabel),
    ...compareExpectedBooleanField('sceneVisualPresentationPixelArt', expected, observed.sceneVisualPresentationPixelArt),
    ...compareExpectedNumberField('sceneVisualPresentationColorDepthBits', expected, observed.sceneVisualPresentationColorDepthBits),
    ...compareExpectedStringField('sceneVisualPresentationOriginalityPolicy', expected, observed.sceneVisualPresentationOriginalityPolicy),
    ...compareExpectedBooleanField('sceneVisualPresentationAssetPlanBound', expected, observed.sceneVisualPresentationAssetPlanBound),
    ...compareExpectedBooleanField('sceneVisualPresentationTemplateParamsBound', expected, observed.sceneVisualPresentationTemplateParamsBound),
    ...compareExpectedBooleanField('sceneVisualPresentationNoProtectedReuse', expected, observed.sceneVisualPresentationNoProtectedReuse),
    ...compareExpectedBooleanField('encounterGateClosedEntrance', expected, observed.encounterGateClosedEntrance),
    ...compareExpectedStringField('encounterGateGateId', expected, observed.encounterGateGateId),
    ...compareExpectedStringField('encounterGateEntranceId', expected, observed.encounterGateEntranceId),
    ...compareExpectedBooleanField('encounterGateClosedBeforeWaveSpawn', expected, observed.encounterGateClosedBeforeWaveSpawn),
    ...compareExpectedBooleanField('encounterGateWaveSequenceBlockedUntilClosed', expected, observed.encounterGateWaveSequenceBlockedUntilClosed),
    ...compareExpectedStringField('encounterGateNextWaveId', expected, observed.encounterGateNextWaveId),
    ...compareExpectedNumberField('encounterGateSequenceIndex', expected, observed.encounterGateSequenceIndex),
    ...compareExpectedBooleanField('encounterGatePlayerBacktrackingBlocked', expected, observed.encounterGatePlayerBacktrackingBlocked),
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
    ...compareExpectedBooleanField('unknownNodesRejected', expected, observed.unknownNodesRejected),
    ...compareExpectedStringField('unknownNodeValidationSchemaVersion', expected, observed.unknownNodeValidationSchemaVersion),
    ...compareExpectedStringField('unknownNodeFailureCode', expected, observed.unknownNodeFailureCode),
    ...compareExpectedBooleanField('unknownNodeAccepted', expected, observed.unknownNodeAccepted),
    ...compareExpectedBooleanField('fallbackRuntimeGenerated', expected, observed.fallbackRuntimeGenerated),
    ...compareExpectedBooleanField('validatorFailedClosed', expected, observed.validatorFailedClosed),
    ...compareExpectedStringField('unknownNodeKind', expected, observed.unknownNodeKind),
    ...compareExpectedStringField('unknownNodePath', expected, observed.unknownNodePath),
    ...compareExpectedStringField('unknownNodeProfileId', expected, observed.unknownNodeProfileId),
    ...compareExpectedBooleanField('deepSeekAuthoritativeDraftProduced', expected, observed.deepSeekAuthoritativeDraftProduced),
    ...compareExpectedStringField('deepSeekProviderId', expected, observed.deepSeekProviderId),
    ...compareExpectedStringField('deepSeekDraftArtifactKind', expected, observed.deepSeekDraftArtifactKind),
    ...compareExpectedStringField('deepSeekDraftSchemaVersion', expected, observed.deepSeekDraftSchemaVersion),
    ...compareExpectedBooleanField('deepSeekDraftNormalized', expected, observed.deepSeekDraftNormalized),
    ...compareExpectedStringField('deepSeekCanonicalSchemaVersion', expected, observed.deepSeekCanonicalSchemaVersion),
    ...compareExpectedBooleanField('deepSeekComposedSchemaHashMatched', expected, observed.deepSeekComposedSchemaHashMatched),
    ...compareExpectedBooleanField('deepSeekCapabilityLockHashMatched', expected, observed.deepSeekCapabilityLockHashMatched),
    ...compareExpectedBooleanField('deepSeekTrustedEvidenceRejected', expected, observed.deepSeekTrustedEvidenceRejected),
    ...compareExpectedBooleanField('fixedPromptEndToEndVerified', expected, observed.fixedPromptEndToEndVerified),
    ...compareExpectedStringField('fixedPromptSchemaVersion', expected, observed.fixedPromptSchemaVersion),
    ...compareExpectedStringField('fixedPromptSource', expected, observed.fixedPromptSource),
    ...compareExpectedStringField('fixedPromptProfileId', expected, observed.fixedPromptProfileId),
    ...compareExpectedStringField('fixedPromptRuntimeFamily', expected, observed.fixedPromptRuntimeFamily),
    ...compareExpectedBooleanField('fixedPromptBindingObserved', expected, observed.fixedPromptBindingObserved),
    ...compareExpectedBooleanField('fixedPromptProfileBindingObserved', expected, observed.fixedPromptProfileBindingObserved),
    ...compareExpectedBooleanField('fixedPromptProviderDraftValidated', expected, observed.fixedPromptProviderDraftValidated),
    ...compareExpectedStringField('fixedPromptProviderId', expected, observed.fixedPromptProviderId),
    ...compareExpectedStringField('fixedPromptDraftSchemaVersion', expected, observed.fixedPromptDraftSchemaVersion),
    ...compareExpectedStringField('fixedPromptCanonicalSchemaVersion', expected, observed.fixedPromptCanonicalSchemaVersion),
    ...compareExpectedBooleanField('fixedPromptHashMatched', expected, observed.fixedPromptHashMatched),
    ...compareExpectedBooleanField('fixedPromptFallbackPromptUsed', expected, observed.fixedPromptFallbackPromptUsed),
    ...compareExpectedBooleanField('metamorphicSemanticHashVerified', expected, observed.metamorphicSemanticHashVerified),
    ...compareExpectedStringField('metamorphicSemanticHashSchemaVersion', expected, observed.metamorphicSemanticHashSchemaVersion),
    ...compareExpectedStringField('metamorphicSemanticHashProfileId', expected, observed.metamorphicSemanticHashProfileId),
    ...compareExpectedStringField('metamorphicSemanticHashRuntimeFamily', expected, observed.metamorphicSemanticHashRuntimeFamily),
    ...compareExpectedStringField('metamorphicTransformSuiteId', expected, observed.metamorphicTransformSuiteId),
    ...compareExpectedStringField('metamorphicBaseSemanticHash', expected, observed.metamorphicBaseSemanticHash),
    ...compareExpectedStringField('metamorphicVariantSemanticHash', expected, observed.metamorphicVariantSemanticHash),
    ...compareExpectedBooleanField('metamorphicHashMatched', expected, observed.metamorphicHashMatched),
    ...compareExpectedNumberField('metamorphicTransformCount', expected, observed.metamorphicTransformCount),
    ...compareExpectedBooleanField('metamorphicSemanticIntentPreserved', expected, observed.metamorphicSemanticIntentPreserved),
    ...compareExpectedBooleanField('metamorphicNoCanonicalDrift', expected, observed.metamorphicNoCanonicalDrift),
    ...compareExpectedBooleanField('replayStabilityVerified', expected, observed.replayStabilityVerified),
    ...compareExpectedStringField('replayStabilitySchemaVersion', expected, observed.replayStabilitySchemaVersion),
    ...compareExpectedStringField('replayStabilityProfileId', expected, observed.replayStabilityProfileId),
    ...compareExpectedStringField('replayStabilityRuntimeFamily', expected, observed.replayStabilityRuntimeFamily),
    ...compareExpectedStringField('replayStabilitySeed', expected, observed.replayStabilitySeed),
    ...compareExpectedStringField('replayStabilityInputTimelineHash', expected, observed.replayStabilityInputTimelineHash),
    ...compareExpectedStringField('replayStabilityBaselineTraceHash', expected, observed.replayStabilityBaselineTraceHash),
    ...compareExpectedStringField('replayStabilityReplayTraceHash', expected, observed.replayStabilityReplayTraceHash),
    ...compareExpectedBooleanField('replayStabilityTraceMatched', expected, observed.replayStabilityTraceMatched),
    ...compareExpectedNumberField('replayStabilityFrameCount', expected, observed.replayStabilityFrameCount),
    ...compareExpectedBooleanField('replayStabilityNoNondeterministicDrift', expected, observed.replayStabilityNoNondeterministicDrift),
    ...compareExpectedBooleanField('replayStabilitySamePlan', expected, observed.replayStabilitySamePlan),
    ...compareExpectedBooleanField('finalOracleGateApproved', expected, finalOracleFacts.finalOracleGateApproved),
    ...compareExpectedBooleanField('finalOracleReviewedCommitShaPresent', expected, finalOracleFacts.finalOracleReviewedCommitShaPresent),
    ...compareExpectedBooleanField('finalOracleReviewedSkillRevisionPresent', expected, finalOracleFacts.finalOracleReviewedSkillRevisionPresent),
    ...compareExpectedBooleanField('finalOracleResultMatchesReviewedCommit', expected, finalOracleFacts.finalOracleResultMatchesReviewedCommit),
    ...compareExpectedBooleanField('finalOracleResultMatchesReviewedSkillRevision', expected, finalOracleFacts.finalOracleResultMatchesReviewedSkillRevision),
    ...compareExpectedBooleanField('finalOracleCheckpointMatched', expected, finalOracleFacts.finalOracleCheckpointMatched),
    ...compareExpectedBooleanField('finalOracleResultIdPresent', expected, finalOracleFacts.finalOracleResultIdPresent),
    ...compareExpectedBooleanField('finalOracleReviewedCommitIsNotReceipt', expected, finalOracleFacts.finalOracleReviewedCommitIsNotReceipt),
    ...compareExpectedNumberField('finalOracleP0Count', expected, observed.finalOracleP0Count),
    ...compareExpectedNumberField('finalOracleP1Count', expected, observed.finalOracleP1Count),
    ...compareExpectedNumberField('finalOracleP2Count', expected, observed.finalOracleP2Count),
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
    ...compareExpectedNumberField('fallingAreaTelegraphMs', expected, observed.fallingAreaTelegraphMs),
    ...compareExpectedBooleanField('timedExplosionActive', expected, observed.timedExplosionActive),
    ...compareExpectedStringField('timedExplosionHazardId', expected, observed.timedExplosionHazardId),
    ...compareExpectedStringField('timedExplosionTimerId', expected, observed.timedExplosionTimerId),
    ...compareExpectedNumberField('timedExplosionCountdownMs', expected, observed.timedExplosionCountdownMs),
    ...compareExpectedNumberField('timedExplosionElapsedMs', expected, observed.timedExplosionElapsedMs),
    ...compareExpectedStringField('timedExplosionTriggerCondition', expected, observed.timedExplosionTriggerCondition),
    ...compareExpectedBooleanField('timedExplosionTriggeredByTimer', expected, observed.timedExplosionTriggeredByTimer),
    ...compareExpectedBooleanField('timedExplosionOccurred', expected, observed.timedExplosionOccurred),
    ...compareExpectedBooleanField('timedExplosionDamagesPlayer', expected, observed.timedExplosionDamagesPlayer),
    ...compareExpectedNumberField('timedExplosionDamage', expected, observed.timedExplosionDamage),
    ...compareExpectedNumberField('timedExplosionRadius', expected, observed.timedExplosionRadius)
  ];
}

type FinalOracleGateFacts = {
  finalOracleGateApproved?: boolean;
  finalOracleReviewedCommitShaPresent: boolean;
  finalOracleReviewedSkillRevisionPresent: boolean;
  finalOracleResultMatchesReviewedCommit: boolean;
  finalOracleResultMatchesReviewedSkillRevision: boolean;
  finalOracleCheckpointMatched: boolean;
  finalOracleResultIdPresent: boolean;
  finalOracleReviewedCommitIsNotReceipt: boolean;
};

function deriveFinalOracleGateFacts(observed: CapabilityRuntimeObservedProbeEvidence): FinalOracleGateFacts {
  const candidateCommitSha = nonEmptyString(observed.finalOracleCandidateCommitSha);
  const reviewedCommitSha = nonEmptyString(observed.finalOracleReviewedCommitSha);
  const candidateSkillRevision = nonEmptyString(observed.finalOracleCandidateSkillRevision);
  const reviewedSkillRevision = nonEmptyString(observed.finalOracleReviewedSkillRevision);
  const checkpointId = nonEmptyString(observed.finalOracleCheckpointId);
  const expectedCheckpointId = nonEmptyString(observed.finalOracleExpectedCheckpointId);
  const oracleResultId = nonEmptyString(observed.finalOracleResultId);
  const receiptCommitSha = nonEmptyString(observed.finalOracleReceiptCommitSha);

  return {
    finalOracleGateApproved: typeof observed.finalOracleGateStatus === 'string' ? observed.finalOracleGateStatus === 'approved' : undefined,
    finalOracleReviewedCommitShaPresent: reviewedCommitSha !== undefined,
    finalOracleReviewedSkillRevisionPresent: reviewedSkillRevision !== undefined,
    finalOracleResultMatchesReviewedCommit:
      candidateCommitSha !== undefined && reviewedCommitSha !== undefined && reviewedCommitSha === candidateCommitSha,
    finalOracleResultMatchesReviewedSkillRevision:
      candidateSkillRevision !== undefined && reviewedSkillRevision !== undefined && reviewedSkillRevision === candidateSkillRevision,
    finalOracleCheckpointMatched: checkpointId !== undefined && expectedCheckpointId !== undefined && checkpointId === expectedCheckpointId,
    finalOracleResultIdPresent: oracleResultId !== undefined,
    finalOracleReviewedCommitIsNotReceipt: reviewedCommitSha !== undefined && (receiptCommitSha === undefined || reviewedCommitSha !== receiptCommitSha)
  };
}

function nonEmptyString(value: string | undefined): string | undefined {
  return value === undefined || value.trim().length === 0 ? undefined : value;
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

function skippedProbeResult(probe: CapabilityQaPlanProbe): CapabilityQaProbeResult {
  return {
    probeId: probe.id,
    ...(probe.capabilityId === undefined ? {} : { capabilityId: probe.capabilityId }),
    status: 'skipped'
  };
}

function buildCapabilityDependencies(lockedPackages: readonly LockedQaPackage[]): CapabilityQaDependency[] {
  return lockedPackages
    .map((entry) => ({
      capabilityId: entry.contract.manifest.id,
      dependencyCapabilityIds: entry.contract.dependencies.map((dependency) => dependency.capabilityId).sort()
    }))
    .sort((left, right) => left.capabilityId.localeCompare(right.capabilityId));
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
