import {
  GameplayCapabilityPackageContractSchema,
  validateGameplayCapabilityPackage,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import { compileGameplayProfileRecipe, GAMEPLAY_PROFILE_RECIPE_CONTRACT_VERSION, type GameplayProfileCompilationReport } from './profile-recipe-compiler.js';
import { resolveGameplayCapabilityGraph, type GameplayCapabilityResolutionReport } from './capability-resolver.js';
import { PhaserRuntimeSystemManifestSchema } from './phaser-runtime-loader.js';
import {
  RUN_AND_GUN_CAPABILITY_MIGRATION_REPORT_KIND,
  RUN_AND_GUN_REFERENCE_CAPABILITY_IDS,
  RUN_AND_GUN_REFERENCE_PROFILE_ID,
  type CapabilityArtifactRef,
  type RunAndGunAmendmentScenarioEvidence,
  type RunAndGunCapabilityMigrationReport,
  type RunAndGunParityGateEvidence
} from './run-and-gun-reference-composition.js';
import { hashStableJson } from './stable-json.js';

export const PLATFORMER_REUSE_PROOF_REPORT_KIND = 'side_scrolling_platformer_reuse_proof_report';
export const PLATFORMER_REUSE_PROOF_REPORT_SCHEMA_VERSION = 'side_scrolling_platformer_reuse_proof_report.v0.1';
export const PLATFORMER_PROFILE_ID = 'side_scrolling_platformer.v1';
export const PLATFORMER_REUSE_THRESHOLD = 0.7;

export const PLATFORMER_REQUIRED_CAPABILITY_IDS = [
  'asset.sprite_binding.v1',
  'camera.side_follow.v1',
  'collision.platform.v1',
  'goal.reach_exit.v1',
  'health.damage_invulnerability.v1',
  'movement.run_jump.v1',
  'physics.gravity_platformer.v1',
  'pickup.collectible.v1',
  'scene.parallax_background.v1',
  'telemetry.gameplay_events.v1'
] as const;

export const PLATFORMER_FORBIDDEN_BASE_CAPABILITY_IDS = ['combat.projectile.v1', 'weapon.cooldown.v1', 'enemy.ranged_attack.v1'] as const;
export const PLATFORMER_SHOOTING_ADDITION_CAPABILITY_IDS = ['combat.projectile.v1', 'weapon.cooldown.v1'] as const;

export const PLATFORMER_REQUIRED_AMENDMENT_SCENARIOS = [
  'denser_platforms_keep_completable',
  'background_ice_ruins',
  'collectible_count_to_8',
  'jump_height_increase',
  'add_shooting_capability'
] as const;

export const PLATFORMER_REQUIRED_ARTIFACT_KINDS = [
  PLATFORMER_REUSE_PROOF_REPORT_KIND,
  'platformer_collect_exit_qa_report',
  'render_fidelity_report'
] as const;

const RUN_AND_GUN_REFERENCE_CAPABILITY_ID_SET = new Set<string>(RUN_AND_GUN_REFERENCE_CAPABILITY_IDS);

export type PlatformerAmendmentScenarioId = (typeof PLATFORMER_REQUIRED_AMENDMENT_SCENARIOS)[number];

export type PlatformerAmendmentScenarioEvidence = {
  scenarioId: PlatformerAmendmentScenarioId;
  status: 'passed' | 'candidate_generated' | 'failed';
  evidenceRef: string;
  addedCapabilityIds?: string[];
};

export type PlatformerReuseProofReport = {
  artifactKind: typeof PLATFORMER_REUSE_PROOF_REPORT_KIND;
  schemaVersion: typeof PLATFORMER_REUSE_PROOF_REPORT_SCHEMA_VERSION;
  profileId: typeof PLATFORMER_PROFILE_ID;
  status: 'ready' | 'blocked';
  referenceCompositionReady: boolean;
  referenceCompositionReportHash?: string;
  referenceCapabilityLockHash?: string;
  requiredCapabilityIds: string[];
  reusedCapabilityIds: string[];
  newCapabilityIds: string[];
  missingReferencePackageIds: string[];
  reuseRatio: number;
  reuseThreshold: typeof PLATFORMER_REUSE_THRESHOLD;
  noProjectileModulesLoaded: boolean;
  noNewTemplateDirectory: boolean;
  noGenreSwitchRegression: boolean;
  collectAndExitQaPassed: boolean;
  renderFidelityPassed: boolean;
  amendmentScenarios: PlatformerAmendmentScenarioEvidence[];
  missingAmendmentScenarioIds: string[];
  failedAmendmentScenarioIds: string[];
  shootingActualAddedCapabilityIds: string[];
  shootingAdditionCandidate: GameplayCapabilityResolutionReport;
  profileCompilationReport: GameplayProfileCompilationReport;
  artifactRefs: CapabilityArtifactRef[];
  missingArtifactKinds: string[];
  blockers: string[];
  reportHash: string;
};

export function buildPlatformerReuseProofReport(input: {
  packages: readonly unknown[];
  runtimeManifest: unknown;
  referenceAcceptance: { passed: boolean; evidenceRefs?: readonly string[] };
  runAndGunReferenceReport: RunAndGunCapabilityMigrationReport;
  amendmentScenarios: readonly PlatformerAmendmentScenarioEvidence[];
  artifactRefs: readonly CapabilityArtifactRef[];
  templateDirs: readonly string[];
  compilerGenreSwitches: readonly string[];
  collectAndExitQaPassed: boolean;
  renderFidelityPassed: boolean;
}): PlatformerReuseProofReport {
  const runtimeManifest = PhaserRuntimeSystemManifestSchema.safeParse(input.runtimeManifest);
  const profileCompilationReport = compileGameplayProfileRecipe({
    recipe: {
      contractVersion: GAMEPLAY_PROFILE_RECIPE_CONTRACT_VERSION,
      id: PLATFORMER_PROFILE_ID,
      runtimeFamily: 'phaser_2d_action_arcade.v1',
      requiredCapabilities: [...PLATFORMER_REQUIRED_CAPABILITY_IDS],
      optionalCapabilities: [],
      defaults: {},
      constraints: ['side-view platform traversal', 'collect required pickups before exit'],
      acceptance: { requiredEvidence: ['platformer_acceptance_report.json'] }
    },
    packages: input.packages,
    runtimeManifest: input.runtimeManifest,
    referenceAcceptance: input.referenceAcceptance,
    step33RenderFidelityEvidenceRefs: ['render_fidelity_report.json'],
    step34AmendmentVerificationRefs: ['amendment_verification_report.json']
  });
  const packageContracts = input.packages.flatMap((candidate) => {
    const parsed = GameplayCapabilityPackageContractSchema.safeParse(candidate);
    return parsed.success && validateGameplayCapabilityPackage(parsed.data).supportEligible ? [parsed.data] : [];
  });
  const runtimeCapabilityIds = runtimeManifest.success ? runtimeManifest.data.systems.map((system) => system.capabilityId) : [];
  const noProjectileModulesLoaded = PLATFORMER_FORBIDDEN_BASE_CAPABILITY_IDS.every((capabilityId) => !runtimeCapabilityIds.includes(capabilityId));
  const noNewTemplateDirectory = !input.templateDirs.some(isPlatformerTemplatePath) && runtimeManifest.success && runtimeManifest.data.compatibilityMode.selection === 'universal_composition';
  const noGenreSwitchRegression = !input.compilerGenreSwitches.includes('side_scrolling_platformer');
  const selectedPackageHashes = new Map(
    packageContracts.flatMap((contract) => {
      const validation = validateGameplayCapabilityPackage(contract);
      return validation.packageHash === undefined ? [] : [[contract.manifest.id, validation.packageHash] as const];
    })
  );
  const referenceCompositionReady =
    input.runAndGunReferenceReport.artifactKind === RUN_AND_GUN_CAPABILITY_MIGRATION_REPORT_KIND &&
    input.runAndGunReferenceReport.profileId === RUN_AND_GUN_REFERENCE_PROFILE_ID &&
    input.runAndGunReferenceReport.status === 'ready' &&
    input.runAndGunReferenceReport.profileCompilationReport.status === 'compiled' &&
    input.runAndGunReferenceReport.profileCompilationReport.artifacts?.gameplayCapabilityLock.profileId === RUN_AND_GUN_REFERENCE_PROFILE_ID;
  const referenceCapabilityLock = referenceCompositionReady ? input.runAndGunReferenceReport.profileCompilationReport.artifacts?.gameplayCapabilityLock : undefined;
  const referencePackageHashes = new Map((referenceCapabilityLock?.packages ?? []).map((ref) => [ref.capabilityId, ref.packageHash]));
  const referenceCapabilityIds = new Set(referencePackageHashes.keys());
  const reusedCapabilityIds = PLATFORMER_REQUIRED_CAPABILITY_IDS.filter(
    (capabilityId) => referencePackageHashes.has(capabilityId) && selectedPackageHashes.get(capabilityId) === referencePackageHashes.get(capabilityId)
  ).sort();
  const newCapabilityIds = PLATFORMER_REQUIRED_CAPABILITY_IDS.filter((capabilityId) => !referenceCapabilityIds.has(capabilityId)).sort();
  const missingReferencePackageIds = PLATFORMER_REQUIRED_CAPABILITY_IDS.filter(
    (capabilityId) => RUN_AND_GUN_REFERENCE_CAPABILITY_ID_SET.has(capabilityId) && selectedPackageHashes.get(capabilityId) !== referencePackageHashes.get(capabilityId)
  ).sort();
  const reuseRatio = reusedCapabilityIds.length / PLATFORMER_REQUIRED_CAPABILITY_IDS.length;
  const amendmentScenarios = [...input.amendmentScenarios].filter((scenario) => scenario.evidenceRef.length > 0).sort(comparePlatformerAmendmentScenarios);
  const observedScenarioIds = new Set(amendmentScenarios.map((scenario) => scenario.scenarioId));
  const missingAmendmentScenarioIds = PLATFORMER_REQUIRED_AMENDMENT_SCENARIOS.filter((scenarioId) => !observedScenarioIds.has(scenarioId)).sort();
  const failedAmendmentScenarioIds = amendmentScenarios
    .filter((scenario) => (scenario.scenarioId === 'add_shooting_capability' ? scenario.status !== 'candidate_generated' : scenario.status !== 'passed'))
    .map((scenario) => scenario.scenarioId)
    .sort();
  const shootingAdditionCandidate = resolveGameplayCapabilityGraph({
    requestedCapabilities: [...PLATFORMER_REQUIRED_CAPABILITY_IDS, ...PLATFORMER_SHOOTING_ADDITION_CAPABILITY_IDS],
    packages: packageContracts,
    runtimeFamily: 'phaser_2d_action_arcade.v1',
    activeLock: profileCompilationReport.artifacts?.gameplayCapabilityLock,
    allowedVersionChanges: [],
    allowedCapabilityRemovals: []
  });
  const addShootingScenario = amendmentScenarios.find((scenario) => scenario.scenarioId === 'add_shooting_capability');
  const shootingAdditionIds = new Set(addShootingScenario?.addedCapabilityIds ?? []);
  const shootingAdditionIdsExact =
    shootingAdditionIds.size === PLATFORMER_SHOOTING_ADDITION_CAPABILITY_IDS.length &&
    PLATFORMER_SHOOTING_ADDITION_CAPABILITY_IDS.every((capabilityId) => shootingAdditionIds.has(capabilityId));
  const baseCapabilityIds = new Set(profileCompilationReport.artifacts?.gameplayCapabilityLock.capabilityIds ?? []);
  const shootingActualAddedCapabilityIds = [...new Set(shootingAdditionCandidate.lock?.capabilityIds ?? [])]
    .filter((capabilityId) => !baseCapabilityIds.has(capabilityId))
    .sort();
  const shootingActualAdditionsExact =
    shootingActualAddedCapabilityIds.length === PLATFORMER_SHOOTING_ADDITION_CAPABILITY_IDS.length &&
    PLATFORMER_SHOOTING_ADDITION_CAPABILITY_IDS.every((capabilityId) => shootingActualAddedCapabilityIds.includes(capabilityId));
  const shootingCandidateReady =
    addShootingScenario?.status === 'candidate_generated' &&
    shootingAdditionIdsExact &&
    shootingActualAdditionsExact &&
    shootingAdditionCandidate.status === 'resolved';
  const artifactRefs = [...input.artifactRefs].filter((ref) => ref.path.length > 0).sort(compareArtifactRefs);
  const artifactKinds = new Set(artifactRefs.map((ref) => ref.artifactKind));
  const missingArtifactKinds = PLATFORMER_REQUIRED_ARTIFACT_KINDS.filter((artifactKind) => !artifactKinds.has(artifactKind)).sort();
  const blockers = [
    ...(referenceCompositionReady ? [] : ['run_and_gun_reference_composition_missing']),
    ...(profileCompilationReport.status === 'compiled' ? [] : ['profile_compilation_blocked']),
    ...(reuseRatio >= PLATFORMER_REUSE_THRESHOLD ? [] : ['reuse_ratio_below_threshold']),
    ...(noProjectileModulesLoaded ? [] : ['projectile_modules_loaded_in_base_profile']),
    ...(noNewTemplateDirectory ? [] : ['new_genre_template_directory_detected']),
    ...(noGenreSwitchRegression ? [] : ['compiler_genre_switch_detected']),
    ...(input.collectAndExitQaPassed ? [] : ['collect_and_exit_qa_missing']),
    ...(input.renderFidelityPassed ? [] : ['render_fidelity_missing']),
    ...(missingArtifactKinds.length === 0 ? [] : ['platformer_evidence_artifact_refs_incomplete']),
    ...(missingAmendmentScenarioIds.length === 0 && failedAmendmentScenarioIds.length === 0 ? [] : ['amendment_scenarios_incomplete']),
    ...(shootingCandidateReady ? [] : ['shooting_capability_addition_candidate_missing']),
  ].sort();
  const payload: Omit<PlatformerReuseProofReport, 'reportHash'> = {
    artifactKind: PLATFORMER_REUSE_PROOF_REPORT_KIND,
    schemaVersion: PLATFORMER_REUSE_PROOF_REPORT_SCHEMA_VERSION,
    profileId: PLATFORMER_PROFILE_ID,
    status: blockers.length === 0 ? 'ready' : 'blocked',
    referenceCompositionReady,
    referenceCompositionReportHash: referenceCompositionReady ? input.runAndGunReferenceReport.reportHash : undefined,
    referenceCapabilityLockHash: referenceCapabilityLock?.lockHash,
    requiredCapabilityIds: [...PLATFORMER_REQUIRED_CAPABILITY_IDS],
    reusedCapabilityIds,
    newCapabilityIds,
    missingReferencePackageIds,
    reuseRatio,
    reuseThreshold: PLATFORMER_REUSE_THRESHOLD,
    noProjectileModulesLoaded,
    noNewTemplateDirectory,
    noGenreSwitchRegression,
    collectAndExitQaPassed: input.collectAndExitQaPassed,
    renderFidelityPassed: input.renderFidelityPassed,
    amendmentScenarios,
    missingAmendmentScenarioIds,
    failedAmendmentScenarioIds,
    shootingActualAddedCapabilityIds,
    shootingAdditionCandidate,
    profileCompilationReport,
    artifactRefs,
    missingArtifactKinds,
    blockers
  };
  const stablePayload = stripUndefined(payload) as Omit<PlatformerReuseProofReport, 'reportHash'>;
  return { ...stablePayload, reportHash: hashStableJson(stablePayload) };
}

function comparePlatformerAmendmentScenarios(left: PlatformerAmendmentScenarioEvidence, right: PlatformerAmendmentScenarioEvidence): number {
  return left.scenarioId.localeCompare(right.scenarioId);
}

function compareArtifactRefs(left: CapabilityArtifactRef, right: CapabilityArtifactRef): number {
  return `${left.artifactKind}:${left.path}`.localeCompare(`${right.artifactKind}:${right.path}`);
}

function isPlatformerTemplatePath(path: string): boolean {
  return path.split(/[\\/]/).includes('side_scrolling_platformer');
}

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripUndefined);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => (child === undefined ? [] : [[key, stripUndefined(child)]])));
}
