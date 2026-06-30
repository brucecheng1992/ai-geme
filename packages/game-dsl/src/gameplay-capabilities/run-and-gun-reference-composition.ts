import { z } from 'zod';

import {
  compileGameplayProfileRecipe,
  GAMEPLAY_PROFILE_RECIPE_CONTRACT_VERSION,
  type GameplayProfileCompilationReport,
  type GameplayProfileRecipe
} from './profile-recipe-compiler.js';
import { PhaserRuntimeSystemManifestSchema } from './phaser-runtime-loader.js';
import { hashStableJson } from './stable-json.js';

export const RUN_AND_GUN_REFERENCE_PROFILE_ID = 'side_scrolling_run_and_gun.v1';
export const RUN_AND_GUN_CAPABILITY_MIGRATION_REPORT_KIND = 'run_and_gun_capability_migration_report';
export const RUN_AND_GUN_CAPABILITY_MIGRATION_REPORT_SCHEMA_VERSION = 'run_and_gun_capability_migration_report.v0.1';
export const LEGACY_VS_COMPOSED_PARITY_REPORT_KIND = 'legacy_vs_composed_parity_report';
export const LEGACY_VS_COMPOSED_PARITY_REPORT_SCHEMA_VERSION = 'legacy_vs_composed_parity_report.v0.1';

export const RUN_AND_GUN_REFERENCE_CAPABILITY_IDS = [
  'asset.sprite_binding.v1',
  'camera.side_follow.v1',
  'collision.platform.v1',
  'combat.projectile.v1',
  'enemy.patrol.v1',
  'enemy.ranged_attack.v1',
  'goal.destroy_target.v1',
  'health.damage_invulnerability.v1',
  'health.player_health_points.v1',
  'movement.run_jump.v1',
  'physics.gravity_platformer.v1',
  'scene.parallax_background.v1',
  'spawn.static.v1',
  'telemetry.gameplay_events.v1',
  'weapon.cooldown.v1'
] as const;

export const RUN_AND_GUN_REQUIRED_PARITY_GATES = [
  'normalized_dsl_semantic',
  'ir_semantic',
  'runtime_events',
  'gameplay_qa',
  'render_fidelity',
  'asset_fallback',
  'amendment_lifecycle'
] as const;

export const RUN_AND_GUN_REQUIRED_AMENDMENT_SCENARIOS = [
  'player_speed_increase',
  'primary_weapon_fire_rate_increase',
  'background_theme_replace',
  'platform_layout_change',
  'player_appearance_replace',
  'supported_enemy_archetype_add',
  'accept_reject_undo'
] as const;

export const RUN_AND_GUN_REQUIRED_CAPABILITY_ARTIFACTS = [
  'gameplay_capability_lock',
  'capability_qa_plan',
  'capability_qa_report',
  'profile_acceptance_report',
  RUN_AND_GUN_CAPABILITY_MIGRATION_REPORT_KIND,
  LEGACY_VS_COMPOSED_PARITY_REPORT_KIND
] as const;

const ParityGateIdSchema = z.enum(RUN_AND_GUN_REQUIRED_PARITY_GATES);
const AmendmentScenarioIdSchema = z.enum(RUN_AND_GUN_REQUIRED_AMENDMENT_SCENARIOS);
const EvidenceRefSchema = z.string().min(1).max(240);

const RunAndGunParityGateEvidenceSchema = z.strictObject({
  gateId: ParityGateIdSchema,
  status: z.enum(['passed', 'failed']),
  legacyEvidenceRef: EvidenceRefSchema,
  composedEvidenceRef: EvidenceRefSchema,
  summary: z.string().min(1).max(300)
});

const RunAndGunAmendmentScenarioEvidenceSchema = z.strictObject({
  scenarioId: AmendmentScenarioIdSchema,
  status: z.enum(['passed', 'failed']),
  evidenceRef: EvidenceRefSchema
});

const CapabilityArtifactRefSchema = z.strictObject({
  artifactKind: z.string().min(1).max(160),
  path: EvidenceRefSchema
});

export type RunAndGunParityGateId = z.infer<typeof ParityGateIdSchema>;
export type RunAndGunAmendmentScenarioId = z.infer<typeof AmendmentScenarioIdSchema>;

export type RunAndGunParityGateEvidence = {
  gateId: RunAndGunParityGateId;
  status: 'passed' | 'failed';
  legacyEvidenceRef: string;
  composedEvidenceRef: string;
  summary: string;
};

export type RunAndGunAmendmentScenarioEvidence = {
  scenarioId: RunAndGunAmendmentScenarioId;
  status: 'passed' | 'failed';
  evidenceRef: string;
};

export type CapabilityArtifactRef = {
  artifactKind: string;
  path: string;
};

export type LegacyVsComposedParityReport = {
  artifactKind: typeof LEGACY_VS_COMPOSED_PARITY_REPORT_KIND;
  schemaVersion: typeof LEGACY_VS_COMPOSED_PARITY_REPORT_SCHEMA_VERSION;
  profileId: typeof RUN_AND_GUN_REFERENCE_PROFILE_ID;
  status: 'passed' | 'failed';
  gates: RunAndGunParityGateEvidence[];
  amendmentScenarios: RunAndGunAmendmentScenarioEvidence[];
  missingGateIds: string[];
  failedGateIds: string[];
  invalidGateIds: string[];
  missingAmendmentScenarioIds: string[];
  failedAmendmentScenarioIds: string[];
  invalidAmendmentScenarioIds: string[];
  reportHash: string;
};

export type RunAndGunCapabilityMigrationReport = {
  artifactKind: typeof RUN_AND_GUN_CAPABILITY_MIGRATION_REPORT_KIND;
  schemaVersion: typeof RUN_AND_GUN_CAPABILITY_MIGRATION_REPORT_SCHEMA_VERSION;
  profileId: typeof RUN_AND_GUN_REFERENCE_PROFILE_ID;
  status: 'ready' | 'blocked';
  strategy: 'dual_run_legacy_default_composed_flagged';
  legacyRuntimeTemplate: 'phaser/side_scrolling_run_and_gun';
  composedRuntimeFamily: 'phaser_2d_action_arcade.v1';
  requiredCapabilityIds: string[];
  selectedCapabilityIds: string[];
  noGenreSpecificTemplateSelected: boolean;
  runtimeManifestComplete: boolean;
  gameplayQaPassed: boolean;
  renderFidelityPassed: boolean;
  amendmentLifecyclePassed: boolean;
  artifactRefsComplete: boolean;
  invalidArtifactRefKinds: string[];
  profileCompilationReport: GameplayProfileCompilationReport;
  parityReport: LegacyVsComposedParityReport;
  artifactRefs: CapabilityArtifactRef[];
  blockers: string[];
  reportHash: string;
};

export function buildRunAndGunReferenceRecipe(input: { acceptanceEvidenceRefs?: readonly string[] } = {}): GameplayProfileRecipe {
  return {
    contractVersion: GAMEPLAY_PROFILE_RECIPE_CONTRACT_VERSION,
    id: RUN_AND_GUN_REFERENCE_PROFILE_ID,
    runtimeFamily: 'phaser_2d_action_arcade.v1',
    requiredCapabilities: [...RUN_AND_GUN_REFERENCE_CAPABILITY_IDS],
    optionalCapabilities: [],
    defaults: {},
    constraints: ['side-view 2d coordinate system', 'legacy run-and-gun parity required before default switch'],
    acceptance: { requiredEvidence: [...(input.acceptanceEvidenceRefs ?? ['reference_acceptance_report.json'])] }
  };
}

export function buildLegacyVsComposedParityReport(input: {
  gates: readonly RunAndGunParityGateEvidence[];
  amendmentScenarios: readonly RunAndGunAmendmentScenarioEvidence[];
}): LegacyVsComposedParityReport {
  const parsedGates = parseParityGates(input.gates);
  const parsedScenarios = parseAmendmentScenarios(input.amendmentScenarios);
  const gates = parsedGates.valid.sort(compareParityGates);
  const amendmentScenarios = parsedScenarios.valid.sort(compareAmendmentScenarios);
  const observedGateIds = new Set(gates.map((gate) => gate.gateId));
  const observedScenarioIds = new Set(amendmentScenarios.map((scenario) => scenario.scenarioId));
  const missingGateIds = RUN_AND_GUN_REQUIRED_PARITY_GATES.filter((gateId) => !observedGateIds.has(gateId)).sort();
  const failedGateIds = gates.filter((gate) => gate.status !== 'passed').map((gate) => gate.gateId).sort();
  const missingAmendmentScenarioIds = RUN_AND_GUN_REQUIRED_AMENDMENT_SCENARIOS.filter((scenarioId) => !observedScenarioIds.has(scenarioId)).sort();
  const failedAmendmentScenarioIds = amendmentScenarios.filter((scenario) => scenario.status !== 'passed').map((scenario) => scenario.scenarioId).sort();
  const payload: Omit<LegacyVsComposedParityReport, 'reportHash'> = {
    artifactKind: LEGACY_VS_COMPOSED_PARITY_REPORT_KIND,
    schemaVersion: LEGACY_VS_COMPOSED_PARITY_REPORT_SCHEMA_VERSION,
    profileId: RUN_AND_GUN_REFERENCE_PROFILE_ID,
    status:
      missingGateIds.length === 0 &&
      failedGateIds.length === 0 &&
      parsedGates.invalidIds.length === 0 &&
      missingAmendmentScenarioIds.length === 0 &&
      failedAmendmentScenarioIds.length === 0 &&
      parsedScenarios.invalidIds.length === 0
        ? 'passed'
        : 'failed',
    gates,
    amendmentScenarios,
    missingGateIds,
    failedGateIds,
    invalidGateIds: parsedGates.invalidIds,
    missingAmendmentScenarioIds,
    failedAmendmentScenarioIds,
    invalidAmendmentScenarioIds: parsedScenarios.invalidIds
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

export function buildRunAndGunCapabilityMigrationReport(input: {
  packages: readonly unknown[];
  runtimeManifest: unknown;
  referenceAcceptance: { passed: boolean; evidenceRefs?: readonly string[] };
  parityGates: readonly RunAndGunParityGateEvidence[];
  amendmentScenarios: readonly RunAndGunAmendmentScenarioEvidence[];
  artifactRefs: readonly CapabilityArtifactRef[];
}): RunAndGunCapabilityMigrationReport {
  const runtimeManifest = PhaserRuntimeSystemManifestSchema.safeParse(input.runtimeManifest);
  const recipe = buildRunAndGunReferenceRecipe({ acceptanceEvidenceRefs: ['reference_acceptance_report.json'] });
  const profileCompilationReport = compileGameplayProfileRecipe({
    recipe,
    packages: input.packages,
    runtimeManifest: input.runtimeManifest,
    referenceAcceptance: input.referenceAcceptance,
    step33RenderFidelityEvidenceRefs: ['render_fidelity_report.json'],
    step34AmendmentVerificationRefs: ['amendment_verification_report.json']
  });
  const parityReport = buildLegacyVsComposedParityReport({
    gates: input.parityGates,
    amendmentScenarios: input.amendmentScenarios
  });
  const parsedArtifactRefs = parseArtifactRefs(input.artifactRefs);
  const artifactRefs = parsedArtifactRefs.valid.sort(compareArtifactRefs);
  const noGenreSpecificTemplateSelected =
    runtimeManifest.success &&
    runtimeManifest.data.compatibilityMode.selection === 'universal_composition' &&
    runtimeManifest.data.compatibilityMode.legacyTemplatePath === undefined &&
    !JSON.stringify(runtimeManifest.data).includes('templates/phaser/side_scrolling_run_and_gun');
  const artifactRefsComplete =
    parsedArtifactRefs.invalidKinds.length === 0 &&
    RUN_AND_GUN_REQUIRED_CAPABILITY_ARTIFACTS.every((artifactKind) => artifactRefs.some((ref) => ref.artifactKind === artifactKind));
  const gameplayQaPassed = parityReport.gates.find((gate) => gate.gateId === 'gameplay_qa')?.status === 'passed';
  const renderFidelityPassed = parityReport.gates.find((gate) => gate.gateId === 'render_fidelity')?.status === 'passed';
  const amendmentLifecyclePassed = parityReport.failedAmendmentScenarioIds.length === 0 && parityReport.missingAmendmentScenarioIds.length === 0;
  const blockers = [
    ...(profileCompilationReport.status === 'compiled' ? [] : ['profile_compilation_blocked']),
    ...(noGenreSpecificTemplateSelected ? [] : ['genre_specific_template_selected']),
    ...(parityReport.status === 'passed' ? [] : ['legacy_vs_composed_parity_failed']),
    ...(artifactRefsComplete ? [] : ['capability_artifact_refs_incomplete'])
  ].sort();
  const payload: Omit<RunAndGunCapabilityMigrationReport, 'reportHash'> = {
    artifactKind: RUN_AND_GUN_CAPABILITY_MIGRATION_REPORT_KIND,
    schemaVersion: RUN_AND_GUN_CAPABILITY_MIGRATION_REPORT_SCHEMA_VERSION,
    profileId: RUN_AND_GUN_REFERENCE_PROFILE_ID,
    status: blockers.length === 0 ? 'ready' : 'blocked',
    strategy: 'dual_run_legacy_default_composed_flagged',
    legacyRuntimeTemplate: 'phaser/side_scrolling_run_and_gun',
    composedRuntimeFamily: 'phaser_2d_action_arcade.v1',
    requiredCapabilityIds: [...RUN_AND_GUN_REFERENCE_CAPABILITY_IDS],
    selectedCapabilityIds: profileCompilationReport.artifacts?.gameplayCapabilityLock.capabilityIds ?? [],
    noGenreSpecificTemplateSelected,
    runtimeManifestComplete: profileCompilationReport.support.runtimeManifestComplete,
    gameplayQaPassed,
    renderFidelityPassed,
    amendmentLifecyclePassed,
    artifactRefsComplete,
    invalidArtifactRefKinds: parsedArtifactRefs.invalidKinds,
    profileCompilationReport,
    parityReport,
    artifactRefs,
    blockers
  };
  const stablePayload = stripUndefined(payload) as Omit<RunAndGunCapabilityMigrationReport, 'reportHash'>;
  return { ...stablePayload, reportHash: hashStableJson(stablePayload) };
}

function compareParityGates(left: RunAndGunParityGateEvidence, right: RunAndGunParityGateEvidence): number {
  return left.gateId.localeCompare(right.gateId);
}

function compareAmendmentScenarios(left: RunAndGunAmendmentScenarioEvidence, right: RunAndGunAmendmentScenarioEvidence): number {
  return left.scenarioId.localeCompare(right.scenarioId);
}

function compareArtifactRefs(left: CapabilityArtifactRef, right: CapabilityArtifactRef): number {
  return `${left.artifactKind}:${left.path}`.localeCompare(`${right.artifactKind}:${right.path}`);
}

function parseParityGates(gates: readonly RunAndGunParityGateEvidence[]): { valid: RunAndGunParityGateEvidence[]; invalidIds: string[] } {
  const valid: RunAndGunParityGateEvidence[] = [];
  const invalidIds: string[] = [];
  gates.forEach((gate, index) => {
    const parsed = RunAndGunParityGateEvidenceSchema.safeParse(gate);
    if (parsed.success) {
      valid.push(parsed.data);
      return;
    }
    invalidIds.push(typeof gate.gateId === 'string' && gate.gateId.length > 0 ? gate.gateId : `<gate:${index}>`);
  });
  return { valid, invalidIds: [...new Set(invalidIds)].sort() };
}

function parseAmendmentScenarios(scenarios: readonly RunAndGunAmendmentScenarioEvidence[]): {
  valid: RunAndGunAmendmentScenarioEvidence[];
  invalidIds: string[];
} {
  const valid: RunAndGunAmendmentScenarioEvidence[] = [];
  const invalidIds: string[] = [];
  scenarios.forEach((scenario, index) => {
    const parsed = RunAndGunAmendmentScenarioEvidenceSchema.safeParse(scenario);
    if (parsed.success) {
      valid.push(parsed.data);
      return;
    }
    invalidIds.push(typeof scenario.scenarioId === 'string' && scenario.scenarioId.length > 0 ? scenario.scenarioId : `<scenario:${index}>`);
  });
  return { valid, invalidIds: [...new Set(invalidIds)].sort() };
}

function parseArtifactRefs(refs: readonly CapabilityArtifactRef[]): { valid: CapabilityArtifactRef[]; invalidKinds: string[] } {
  const valid: CapabilityArtifactRef[] = [];
  const invalidKinds: string[] = [];
  refs.forEach((ref, index) => {
    const parsed = CapabilityArtifactRefSchema.safeParse(ref);
    if (parsed.success) {
      valid.push(parsed.data);
      return;
    }
    invalidKinds.push(typeof ref.artifactKind === 'string' && ref.artifactKind.length > 0 ? ref.artifactKind : `<artifact:${index}>`);
  });
  return { valid, invalidKinds: [...new Set(invalidKinds)].sort() };
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
