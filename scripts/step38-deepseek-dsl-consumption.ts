import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import {
  evaluateStep38EncounterCoverageRuntimeEvidence,
  type Step38EncounterCoverageRuntimeEvaluation
} from './step38-full-game-expansion-gate.js';

export const STEP38_BASELINE_COMMIT = '5ae9cd3a1c1058929db0482e89b2f46b469e7c24';
export const STEP38_EXPECTED_PROVIDER_MODEL = 'deepseek-v4-flash';
export const STEP38_EXPECTED_PROMPT_SHA256 = '5bff34f8b97ea7ee5b0e66b5a17b893eda11fd327d3dadc128c30f3123c64686';

export type Step38SmokeMode =
  | { mode: 'skipped'; modelName: string; realApiSuccess: false; blockers: ['RUN_DEEPSEEK_API_SMOKE_NOT_ENABLED'] }
  | { mode: 'blocked'; modelName: string; realApiSuccess: false; blockers: string[] }
  | { mode: 'enabled'; modelName: string; realApiSuccess: false; blockers: [] };

export type Step38GuardFlags = {
  fallback_used: boolean;
  preloaded_artifact_used: boolean;
  legacy_fixed_template_authority: boolean;
  stale_generated_artifact_used: boolean;
};

export type Step38EvaluationInput = {
  baselineCommit: string;
  promptSha256: string;
  modelName: string;
  realDeepSeekPathExecuted: boolean;
  dslConsumerPathUsed: boolean;
  rawGameDslResponsePresent: boolean;
  generatedArtifactRunSpecific: boolean;
  buildSucceeded: boolean;
  previewBooted: boolean;
  guardFlags: Step38GuardFlags;
  artifacts: {
    canonicalDsl?: unknown;
    runtimePlan?: unknown;
    sceneIr?: unknown;
    runtimeManifest?: unknown;
    qaReport?: unknown;
    telemetryEvents?: string[];
    dslConsumptionReport?: unknown;
    manualVerticalSliceProjection?: unknown;
    manualTraversalPath?: unknown;
    visualRuntimeBindingReport?: unknown;
    visualAssetMaterializationReport?: unknown;
    assetTemplateFingerprintReport?: unknown;
    visualDesignRealizationReport?: unknown;
    runtimeTextureLoadReport?: unknown;
    artDirectionQualityReport?: unknown;
    encounterDirectorPlan?: unknown;
    encounterDirectorRuntimeEvidence?: unknown;
    outcomeStateMachineReport?: unknown;
    winPathEvidence?: unknown;
    losePathEvidence?: unknown;
    realPlaythroughCompletionEvidence?: unknown;
    twoDGameplayPlaythroughGate?: unknown;
    canvasVisualReadabilityGate?: unknown;
    proceduralPixelArtGrammarReport?: unknown;
    canvasArtFidelityGate?: unknown;
    spriteAnimationCoverageReport?: unknown;
    environmentLayeringReport?: unknown;
    startupSurvivabilityGate?: unknown;
    encounterPlayabilityGate?: unknown;
    successRouteMilestoneTimeline?: unknown;
    routePressureBandEvidence?: unknown;
    operatorVisibleArtGate?: unknown;
    visualPlaythroughValidatorReport?: unknown;
  };
};

export type Step38RepresentationLayer = 'canonicalDsl' | 'runtimePlan' | 'sceneIr' | 'runtimeManifest' | 'runtimeOrTelemetry';

export type Step38CapabilityRepresentation = Record<Step38RepresentationLayer, boolean> & {
  capability: string;
  requiredLayers: Step38RepresentationLayer[];
};

export type Step38EvaluationResult = {
  readyState: 'READY_FOR_MANUAL_TEST' | 'BLOCKED';
  blockers: string[];
  blocker_details: {
    encounter_coverage_evidence_missing?: Step38EncounterCoverageRuntimeEvaluation;
  };
  evidence_details: {
    encounter_coverage: Step38EncounterCoverageRuntimeEvaluation;
  };
  unsupported_required_capabilities: string[];
  ignored_required_dsl_fields: string[];
  capabilityRepresentations: Step38CapabilityRepresentation[];
};

const STEP38_REQUIRED_VISUAL_ROLES = ['player', 'enemy_ground', 'enemy_static', 'flying_enemy', 'pickup', 'projectile', 'hazard', 'boss'] as const;
const STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS = [
  'player',
  'default_weapon',
  'pickup_weapon',
  'projectile',
  'ground_enemy',
  'ranged_enemy',
  'flying_enemy',
  'wave_marker',
  'area_marker',
  'boss',
  'boss_telegraph',
  'boss_projectile_phase_object',
  'environment_hazard'
] as const;
const STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY = {
  active_visual_asset_backend: 'procedural_canvas_v1',
  current_backend: 'procedural_canvas_v1',
  future_visual_asset_backend: 'image_provider_v1',
  image_provider_v1_enabled: false,
  external_art_used: false,
  png_core_fix_used: false,
  old_environment_resource_logic_used: false,
  target_fidelity: 'procedural_pixel_art_readable_v1'
} as const;
const STEP38_FINAL_GATE_READER_ID = 'step38.final_gate_reader.v1';
const STEP38_FRESH_MANUAL_SCREENSHOT_SOURCE = 'fresh_manual_playthrough_input_only';
const STEP38_REQUIRED_VERTICAL_SLICE_CONTENT = [
  'player',
  'enemy_wave',
  'static_enemy',
  'flying_enemy',
  'weapon_pickup',
  'projectile',
  'hazard',
  'boss',
  'boss_telegraph',
  'boss_phase',
  'region_transition',
  'runtime_feedback'
] as const;
const STEP38_REQUIRED_VERTICAL_SLICE_SCREENSHOTS = [
  '00_spawn_hud_marker',
  '01_movement_shooting',
  '02_weapon_pickup_visible',
  '03_wave_1_enemy_mix',
  '04_wave_2_or_area_2_visible',
  '05_boss_telegraph_visible',
  '06_boss_phase_visible',
  '07_mission_complete_or_exit_state'
] as const;
const STEP38_REQUIRED_MANUAL_TRAVERSAL_SCREENSHOTS = [
  '00_spawn_start',
  '01_wave1_reached_by_input',
  '02_projectile_visible_by_input',
  '02_pickup_and_area2_reached_by_input',
  '03_wave2_reached_by_input',
  '04_boss_telegraph_reached_by_input',
  '05_boss_phase_reached_by_input',
  '06_exit_or_mission_complete_reached_by_input'
] as const;
const STEP38_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS = [
  '00_fresh_spawn',
  '01_wave1_visible',
  '02_wave1_clear_or_progression',
  '03_weapon_pickup_visible_and_collected',
  '04_area_progression_visible',
  '05_wave2_mixed_enemies_visible',
  '06_wave2_clear_or_pressure',
  '07_boss_arena_visible',
  '08_boss_phase_1_visible',
  '09_boss_phase_2_visible',
  '10_boss_defeated',
  '11_mission_complete_after_play'
] as const;
const STEP38_REQUIRED_COMPLETION_PRECONDITIONS = [
  'wave_progression_complete',
  'area_progression_complete',
  'weapon_pickup_consumed',
  'boss_phase_seen',
  'boss_defeated_by_input'
] as const;

type Step38CapabilitySpec = {
  id: string;
  requiredLayers: Step38RepresentationLayer[];
  canonicalDsl: (value: unknown) => boolean;
  runtimePlan: (value: unknown) => boolean;
  sceneIr: (value: unknown) => boolean;
  runtimeManifest: (value: unknown) => boolean;
  runtimeOrTelemetry: (context: { qaReport?: unknown; telemetryEvents: string[] }) => boolean;
};

export function resolveStep38SmokeMode(
  env: Partial<Record<'RUN_DEEPSEEK_API_SMOKE' | 'DEEPSEEK_API_KEY' | 'DEEPSEEK_MODEL' | 'DEEPSEEK_DSL_MODEL', string>>,
  config: { apiKey?: string; defaultModel?: string }
): Step38SmokeMode {
  const modelName = normalizeModelName(env.DEEPSEEK_MODEL ?? env.DEEPSEEK_DSL_MODEL ?? config.defaultModel);

  if (env.RUN_DEEPSEEK_API_SMOKE !== '1') {
    return { mode: 'skipped', modelName, realApiSuccess: false, blockers: ['RUN_DEEPSEEK_API_SMOKE_NOT_ENABLED'] };
  }

  const apiKey = (env.DEEPSEEK_API_KEY ?? config.apiKey ?? '').trim();
  if (apiKey.length === 0 || apiKey === 'your_deepseek_api_key') {
    return { mode: 'blocked', modelName, realApiSuccess: false, blockers: ['DEEPSEEK_API_KEY_MISSING'] };
  }

  return { mode: 'enabled', modelName, realApiSuccess: false, blockers: [] };
}

export function evaluateStep38DslConsumption(input: Step38EvaluationInput): Step38EvaluationResult {
  const blockers: string[] = [];
  const encounterCoverageEvaluation = evaluateEncounterCoverageEvidence(input.artifacts.qaReport);

  if (input.baselineCommit !== STEP38_BASELINE_COMMIT) blockers.push('baseline_commit_mismatch');
  if (input.promptSha256 !== STEP38_EXPECTED_PROMPT_SHA256) blockers.push('prompt_sha_mismatch');
  if (input.modelName !== STEP38_EXPECTED_PROVIDER_MODEL) blockers.push('model_mismatch');
  if (!input.realDeepSeekPathExecuted) blockers.push('real_deepseek_path_not_executed');
  if (!input.dslConsumerPathUsed) blockers.push('dsl_consumer_path_not_used');
  if (!input.rawGameDslResponsePresent) blockers.push('raw_game_dsl_response_missing');
  if (!input.generatedArtifactRunSpecific) blockers.push('generated_artifact_not_run_specific');
  if (!input.buildSucceeded) blockers.push('build_failed_or_missing');
  if (!input.previewBooted) blockers.push('preview_not_booted');

  for (const [name, value] of Object.entries(input.guardFlags)) {
    if (value) blockers.push(`${name}=true`);
  }

  if (input.artifacts.canonicalDsl === undefined) blockers.push('canonical_dsl_missing');
  if (input.artifacts.runtimePlan === undefined) blockers.push('runtime_plan_missing');
  if (input.artifacts.sceneIr === undefined) blockers.push('scene_ir_missing');
  if (input.artifacts.runtimeManifest === undefined) blockers.push('runtime_manifest_missing');
  if (!hasManualVerticalSliceProjectionEvidence(input.artifacts.manualVerticalSliceProjection)) blockers.push('manual_vertical_slice_projection_missing');
  if (!hasInteractiveRuntimeEvidence(input.artifacts.qaReport)) blockers.push('interactive_runtime_evidence_missing');
  if (!hasMovingFireEvidence(input.artifacts.qaReport)) blockers.push('moving_fire_evidence_missing');
  if (!hasVisualAssetEvidence(input.artifacts.qaReport)) blockers.push('visual_asset_evidence_missing');
  if (!hasVisualVerticalSliceEvidence(input.artifacts.qaReport)) blockers.push('visual_vertical_slice_evidence_missing');
  if (!hasManualTraversalEvidence(input.artifacts.qaReport)) blockers.push('manual_traversal_evidence_missing');
  if (!hasVisualRuntimeBindingReport(input.artifacts.visualRuntimeBindingReport)) blockers.push('visual_runtime_binding_report_missing');
  if (!hasVisualAssetMaterializationReport(input.artifacts.visualAssetMaterializationReport)) {
    const materializationBlockers = collectVisualAssetMaterializationBlockers(input.artifacts.visualAssetMaterializationReport);
    blockers.push(...(materializationBlockers.length > 0 ? materializationBlockers : ['visual_asset_materialization_report_missing']));
  }
  if (!hasAssetTemplateFingerprintReport(input.artifacts.assetTemplateFingerprintReport)) {
    const fingerprintBlockers = collectAssetTemplateFingerprintBlockers(input.artifacts.assetTemplateFingerprintReport);
    blockers.push(...(fingerprintBlockers.length > 0 ? fingerprintBlockers : ['asset_template_fingerprint_report_missing']));
  }
  if (!hasVisualDesignRealizationReport(input.artifacts.visualDesignRealizationReport)) {
    const realizationBlockers = collectVisualDesignRealizationBlockers(input.artifacts.visualDesignRealizationReport);
    blockers.push(...(realizationBlockers.length > 0 ? realizationBlockers : ['visual_design_realization_report_missing']));
  }
  if (!hasRuntimeTextureLoadReport(input.artifacts.runtimeTextureLoadReport)) blockers.push('runtime_texture_load_report_missing');
  if (!hasArtDirectionQualityReport(input.artifacts.artDirectionQualityReport)) blockers.push('art_direction_quality_report_missing');
  if (!hasEncounterDirectorPlan(input.artifacts.encounterDirectorPlan)) blockers.push('encounter_director_plan_missing');
  if (!hasEncounterDirectorRuntimeEvidence(input.artifacts.encounterDirectorRuntimeEvidence)) blockers.push('encounter_director_runtime_evidence_missing');
  if (!hasOutcomeStateMachineReport(input.artifacts.outcomeStateMachineReport)) blockers.push('outcome_state_machine_report_missing');
  if (!hasWinPathEvidence(input.artifacts.winPathEvidence)) blockers.push('win_path_evidence_missing');
  if (!hasLosePathEvidence(input.artifacts.losePathEvidence)) blockers.push('lose_path_evidence_missing');
  if (!hasSuccessRouteMilestoneTimeline(input.artifacts.successRouteMilestoneTimeline)) {
    blockers.push('success_route_milestone_timeline_missing');
  }
  if (!hasRoutePressureBandEvidence(input.artifacts.routePressureBandEvidence)) {
    blockers.push('route_pressure_band_evidence_missing');
  }
  if (!hasRealPlaythroughCompletionEvidence(input.artifacts.realPlaythroughCompletionEvidence)) {
    blockers.push('real_playthrough_completion_evidence_missing');
  }
  if (!isRecord(input.artifacts.twoDGameplayPlaythroughGate)) {
    blockers.push('two_d_gameplay_playthrough_gate_missing');
  } else if (!hasTwoDGameplayPlaythroughGate(input.artifacts.twoDGameplayPlaythroughGate)) {
    blockers.push('two_d_gameplay_playthrough_gate_failed');
  }
  if (!isRecord(input.artifacts.canvasVisualReadabilityGate)) {
    blockers.push('canvas_visual_readability_gate_missing');
  } else if (!hasCanvasVisualReadabilityGate(input.artifacts.canvasVisualReadabilityGate)) {
    blockers.push('canvas_visual_readability_gate_failed');
  }
  if (!isRecord(input.artifacts.proceduralPixelArtGrammarReport)) {
    blockers.push('procedural_pixel_art_grammar_report_missing');
  } else if (!hasProceduralPixelArtGrammarReport(input.artifacts.proceduralPixelArtGrammarReport)) {
    blockers.push('procedural_pixel_art_grammar_gate_failed');
  }
  if (!isRecord(input.artifacts.canvasArtFidelityGate)) {
    blockers.push('canvas_art_fidelity_gate_missing');
  } else if (!hasCanvasArtFidelityGate(input.artifacts.canvasArtFidelityGate)) {
    blockers.push('canvas_art_fidelity_gate_failed');
  }
  if (!isRecord(input.artifacts.spriteAnimationCoverageReport)) {
    blockers.push('sprite_animation_coverage_report_missing');
  } else if (!hasSpriteAnimationCoverageReport(input.artifacts.spriteAnimationCoverageReport)) {
    blockers.push('sprite_animation_coverage_report_failed');
  }
  if (!isRecord(input.artifacts.environmentLayeringReport)) {
    blockers.push('environment_layering_report_missing');
  } else if (!hasEnvironmentLayeringReport(input.artifacts.environmentLayeringReport)) {
    blockers.push('environment_layering_report_failed');
  }
  if (!isRecord(input.artifacts.startupSurvivabilityGate)) {
    blockers.push('startup_survivability_gate_missing');
  } else if (!hasStartupSurvivabilityGate(input.artifacts.startupSurvivabilityGate)) {
    blockers.push('startup_survivability_gate_failed');
  }
  if (!isRecord(input.artifacts.encounterPlayabilityGate)) {
    blockers.push('encounter_playability_gate_missing');
  } else if (!hasEncounterPlayabilityGate(input.artifacts.encounterPlayabilityGate)) {
    blockers.push('encounter_playability_gate_failed');
  }
  if (!hasHumanVisibleGameplayGate(input.artifacts.realPlaythroughCompletionEvidence)) {
    blockers.push('human_visible_gameplay_gate_missing');
  }
  if (!hasOperatorVisibleArtGate(input.artifacts.operatorVisibleArtGate)) {
    const operatorGateBlockers = collectOperatorVisibleArtGateBlockers(input.artifacts.operatorVisibleArtGate);
    blockers.push(...(operatorGateBlockers.length > 0 ? operatorGateBlockers : ['operator_visible_art_gate_missing']));
  }
  if (!hasVisualPlaythroughValidatorReport(input.artifacts.visualPlaythroughValidatorReport)) {
    blockers.push('visual_playthrough_validator_report_missing');
  }
  if (!hasPlayableDurationEvidence(input.artifacts.qaReport)) blockers.push('playable_duration_support_missing');
  if (encounterCoverageEvaluation.status !== 'PASSED') blockers.push('encounter_coverage_evidence_missing');
  if (!hasEnemyBehaviorEvidence(input.artifacts.qaReport)) blockers.push('enemy_behavior_evidence_missing');
  if (!hasBehaviorConfigEvidence(input.artifacts.qaReport)) blockers.push('behavior_config_evidence_missing');

  const capabilityRepresentations = STEP38_REQUIRED_CAPABILITY_SPECS.map((spec) => representCapability(spec, input.artifacts));
  const unsupported_required_capabilities = capabilityRepresentations
    .filter((representation) => !representation.requiredLayers.every((layer) => representation[layer]))
    .map((representation) => representation.capability)
    .sort();
  const ignored_required_dsl_fields = collectIgnoredRequiredDslFields(input.artifacts.dslConsumptionReport);

  if (unsupported_required_capabilities.length > 0) blockers.push('unsupported_required_capabilities_non_empty');
  if (ignored_required_dsl_fields.length > 0) blockers.push('ignored_required_dsl_fields_non_empty');

  const sortedBlockers = uniqueSorted(blockers);
  return {
    readyState: sortedBlockers.length === 0 ? 'READY_FOR_MANUAL_TEST' : 'BLOCKED',
    blockers: sortedBlockers,
    blocker_details: sortedBlockers.includes('encounter_coverage_evidence_missing')
      ? { encounter_coverage_evidence_missing: encounterCoverageEvaluation }
      : {},
    evidence_details: {
      encounter_coverage: encounterCoverageEvaluation
    },
    unsupported_required_capabilities,
    ignored_required_dsl_fields,
    capabilityRepresentations
  };
}

export function sha256Text(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function sha256File(path: string): Promise<string> {
  return sha256Text(await readFile(path, 'utf8'));
}

export async function readJsonFile(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

function normalizeModelName(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? STEP38_EXPECTED_PROVIDER_MODEL : trimmed;
}

function representCapability(
  spec: Step38CapabilitySpec,
  artifacts: Step38EvaluationInput['artifacts']
): Step38CapabilityRepresentation {
  const telemetryEvents = artifacts.telemetryEvents ?? [];
  return {
    capability: spec.id,
    requiredLayers: spec.requiredLayers,
    canonicalDsl: spec.canonicalDsl(artifacts.canonicalDsl),
    runtimePlan: spec.runtimePlan(artifacts.runtimePlan),
    sceneIr: spec.sceneIr(artifacts.sceneIr),
    runtimeManifest: spec.runtimeManifest(artifacts.runtimeManifest),
    runtimeOrTelemetry: spec.runtimeOrTelemetry({ qaReport: artifacts.qaReport, telemetryEvents })
  };
}

const STEP38_REQUIRED_CAPABILITY_SPECS: Step38CapabilitySpec[] = [
  capability('genre_side_scrolling_run_and_gun', ['canonicalDsl', 'runtimePlan'], {
    canonicalDsl: (value) =>
      hasFieldValue(value, ['genre'], ['side_scrolling_run_and_gun']) || hasProfileValue(value, ['side_scrolling_run_and_gun.v1']),
    runtimePlan: (value) =>
      hasFieldValue(value, ['genre', 'profileId', 'profile_id', 'runtimeProfile'], [
        'side_scrolling_run_and_gun',
        'side_scrolling',
        'side_scrolling_run_and_gun.v1'
      ]),
    sceneIr: (value) => hasFieldValue(value, ['source', 'genre'], ['canonical_game_dsl_v0.2_runtime_plan', 'side_scrolling_run_and_gun', 'side_scrolling']),
    runtimeManifest: (value) => hasFieldValue(value, ['runtime', 'genre', 'profileId'], ['phaser_2d_action_arcade', 'side_scrolling_run_and_gun']),
    runtimeOrTelemetry: ({ qaReport, telemetryEvents }) => hasAnyEvent(qaReport, telemetryEvents, ['game.ready', 'game.started'])
  }),
  capability('play_time_intent_8_12_range', ['canonicalDsl', 'runtimePlan'], {
    canonicalDsl: hasRange480720,
    runtimePlan: hasRange480720,
    sceneIr: alwaysFalse,
    runtimeManifest: alwaysFalse,
    runtimeOrTelemetry: alwaysRuntimeFalse
  }),
  capability('player_movement', ['canonicalDsl', 'runtimePlan', 'runtimeOrTelemetry'], {
    canonicalDsl: (value) => hasCapabilityRef(value, 'movement.run_jump.v1') || hasRole(value, 'player'),
    runtimePlan: (value) => hasCapabilityRef(value, 'movement.run_jump.v1') || hasNumericField(value, ['speedPxPerSec', 'speed_px_per_sec']),
    sceneIr: (value) => hasNodeKind(value, ['player_spawn', 'player']),
    runtimeManifest: (value) => hasCapabilityRef(value, 'movement.run_jump.v1'),
    runtimeOrTelemetry: ({ qaReport, telemetryEvents }) => hasAnyEvent(qaReport, telemetryEvents, ['player.moved'])
  }),
  capability('jump', ['canonicalDsl', 'runtimePlan'], {
    canonicalDsl: (value) => hasCapabilityRef(value, 'movement.run_jump.v1') || hasFieldValue(value, ['verb', 'mode'], ['run_jump_shoot']),
    runtimePlan: (value) => hasCapabilityRef(value, 'movement.run_jump.v1') || hasNumericField(value, ['jumpVelocity', 'jump_velocity']),
    sceneIr: alwaysFalse,
    runtimeManifest: (value) => hasCapabilityRef(value, 'movement.run_jump.v1'),
    runtimeOrTelemetry: ({ qaReport, telemetryEvents }) => hasAnyEvent(qaReport, telemetryEvents, ['player.jumped'])
  }),
  capability('crouch', ['canonicalDsl', 'runtimePlan', 'runtimeManifest'], {
    canonicalDsl: (value) => hasCapabilityRef(value, 'movement.crouch.v1') || hasFieldValue(value, ['action', 'verb', 'mode'], ['crouch']),
    runtimePlan: (value) => hasCapabilityRef(value, 'movement.crouch.v1') || hasFieldValue(value, ['action', 'verb', 'mode'], ['crouch']),
    sceneIr: alwaysFalse,
    runtimeManifest: (value) => hasCapabilityRef(value, 'movement.crouch.v1') || hasFieldValue(value, ['action', 'verb', 'mode'], ['crouch']),
    runtimeOrTelemetry: ({ qaReport, telemetryEvents }) => hasAnyEvent(qaReport, telemetryEvents, ['player.crouched'])
  }),
  capability('directional_shooting', ['canonicalDsl', 'runtimePlan', 'runtimeOrTelemetry'], {
    canonicalDsl: (value) =>
      hasCapabilityRef(value, 'combat.projectile.v1') || hasFieldValue(value, ['mode', 'pattern', 'directionMode'], ['multi_direction', 'eight_direction']),
    runtimePlan: (value) => hasCapabilityRef(value, 'combat.projectile.v1') || hasArrayKey(value, ['projectiles']),
    sceneIr: alwaysFalse,
    runtimeManifest: (value) => hasCapabilityRef(value, 'combat.projectile.v1'),
    runtimeOrTelemetry: ({ qaReport, telemetryEvents }) => hasAnyEvent(qaReport, telemetryEvents, ['player.fired', 'projectile.spawned'])
  }),
  capability('weapon_pickups', ['canonicalDsl', 'runtimePlan', 'sceneIr'], {
    canonicalDsl: (value) =>
      hasCapabilityRef(value, 'weapon.spread_shot.v1') || hasCapabilityRef(value, 'weapon.rapid_fire.v1') || hasArrayKey(value, ['pickups', 'weapons']),
    runtimePlan: (value) => hasArrayKey(value, ['pickupIds', 'pickup_ids', 'pickups', 'weaponIds', 'weapon_ids']),
    sceneIr: (value) => hasNodeKind(value, ['pickup', 'weapon_pickup']),
    runtimeManifest: (value) => hasCapabilityRef(value, 'weapon.spread_shot.v1') || hasFieldValue(value, ['kind', 'system'], ['pickup', 'weapon']),
    runtimeOrTelemetry: ({ qaReport, telemetryEvents }) => hasAnyEvent(qaReport, telemetryEvents, ['item.collected'])
  }),
  capability('enemy_waves', ['canonicalDsl', 'runtimePlan', 'sceneIr'], {
    canonicalDsl: (value) => hasCapabilityRef(value, 'spawn.enemy_wave.v1') || hasArrayKey(value, ['waves']),
    runtimePlan: (value) => hasCapabilityRef(value, 'spawn.enemy_wave.v1') || hasArrayKey(value, ['waveIds', 'wave_ids', 'waves']),
    sceneIr: (value) => hasNodeKind(value, ['enemy_spawn', 'enemy']),
    runtimeManifest: (value) => hasCapabilityRef(value, 'spawn.enemy_wave.v1'),
    runtimeOrTelemetry: ({ qaReport, telemetryEvents }) => hasAnyEvent(qaReport, telemetryEvents, ['enemy.hit', 'enemy.cleared'])
  }),
  capability('multi_area_progression', ['canonicalDsl', 'runtimePlan'], {
    canonicalDsl: hasThreeProgressionSegments,
    runtimePlan: hasThreeProgressionSegments,
    sceneIr: (value) => hasArrayKey(value, ['segments']) || hasNodeKind(value, ['segment']),
    runtimeManifest: alwaysFalse,
    runtimeOrTelemetry: ({ qaReport, telemetryEvents }) => hasAnyEvent(qaReport, telemetryEvents, ['level.segment.completed'])
  }),
  capability('boss_phase_or_boss_encounter_structure', ['canonicalDsl', 'runtimePlan', 'sceneIr', 'runtimeManifest'], {
    canonicalDsl: (value) => hasCapabilityRef(value, 'enemy.boss_lifecycle.v1') || hasArrayKey(value, ['bosses']),
    runtimePlan: (value) => hasCapabilityRef(value, 'enemy.boss_lifecycle.v1') || hasArrayKey(value, ['bossIds', 'boss_ids', 'bosses']),
    sceneIr: (value) => hasNodeKind(value, ['boss']),
    runtimeManifest: (value) => hasCapabilityRef(value, 'enemy.boss_lifecycle.v1') || hasFieldValue(value, ['kind', 'system'], ['boss']),
    runtimeOrTelemetry: ({ qaReport, telemetryEvents }) => hasAnyEvent(qaReport, telemetryEvents, ['boss.phase.changed', 'game.won'])
  }),
  capability('arcade_feedback_score_lives_damage', ['canonicalDsl', 'runtimePlan'], {
    canonicalDsl: (value) =>
      hasCapabilityRef(value, 'health.player_health_points.v1') || hasCapabilityRef(value, 'ui.hud_player_health.v1') || hasAnyKey(value, ['health', 'score', 'lives', 'damage']),
    runtimePlan: (value) =>
      hasCapabilityRef(value, 'health.player_health_points.v1') || hasCapabilityRef(value, 'ui.hud_player_health.v1') || hasAnyKey(value, ['health', 'score', 'lives', 'damage']),
    sceneIr: alwaysFalse,
    runtimeManifest: (value) =>
      hasCapabilityRef(value, 'health.player_health_points.v1') || hasCapabilityRef(value, 'ui.hud_player_health.v1') || hasAnyKey(value, ['health', 'score', 'lives', 'damage']),
    runtimeOrTelemetry: ({ qaReport, telemetryEvents }) => hasAnyEvent(qaReport, telemetryEvents, ['score.changed', 'player.damaged', 'enemy.hit'])
  }),
  capability('game_over_state', ['canonicalDsl', 'runtimePlan'], {
    canonicalDsl: (value) =>
      hasCapabilityRef(value, 'ui.win_failure_transitions.v1') || hasObjectiveKind(value, ['game.lost', 'player_health_zero']),
    runtimePlan: (value) =>
      hasCapabilityRef(value, 'ui.win_failure_transitions.v1') || hasObjectiveKind(value, ['game.lost', 'player_health_zero']),
    sceneIr: alwaysFalse,
    runtimeManifest: (value) => hasCapabilityRef(value, 'ui.win_failure_transitions.v1'),
    runtimeOrTelemetry: ({ qaReport, telemetryEvents }) => hasAnyEvent(qaReport, telemetryEvents, ['game.over', 'game.lost'])
  }),
  capability('mission_complete_or_win_state', ['canonicalDsl', 'runtimePlan', 'runtimeOrTelemetry'], {
    canonicalDsl: (value) => hasObjectiveKind(value, ['boss_defeated', 'reach_exit', 'game.won']),
    runtimePlan: (value) => hasObjectiveKind(value, ['boss_defeated', 'reach_exit', 'game.won']) || hasArrayKey(value, ['objectiveIds', 'objective_ids']),
    sceneIr: (value) => hasNodeKind(value, ['goal']),
    runtimeManifest: (value) => hasFieldValue(value, ['kind', 'system'], ['goal', 'objective']),
    runtimeOrTelemetry: ({ qaReport, telemetryEvents }) => hasAnyEvent(qaReport, telemetryEvents, ['mission.complete', 'game.won', 'objective.completed'])
  }),
  capability('dsl_driven_visual_intent', ['canonicalDsl', 'sceneIr', 'runtimeManifest', 'runtimeOrTelemetry'], {
    canonicalDsl: hasCanonicalDslVisualIntent,
    runtimePlan: (value) => hasCapabilityRef(value, 'scene.visual_presentation_metadata.v1'),
    sceneIr: hasSceneIrVisualIntent,
    runtimeManifest: (value) => hasCapabilityRef(value, 'scene.visual_presentation_metadata.v1'),
    runtimeOrTelemetry: ({ qaReport, telemetryEvents }) =>
      hasVisualAssetEvidence(qaReport) &&
      hasVisualVerticalSliceEvidence(qaReport) &&
      hasVisualRuntimeBindingReportFromQaReport(qaReport) &&
      hasVisualAssetMaterializationReportFromQaReport(qaReport) &&
      hasRuntimeTextureLoadReportFromQaReport(qaReport) &&
      hasAnyEvent(qaReport, telemetryEvents, ['scene.visual_presentation_metadata.verified'])
  }),
  capability('no_existing_ip_names_assets_logos_music', ['canonicalDsl'], {
    canonicalDsl: (value) =>
      !hasForbiddenIpTerm(value) &&
      (objectContainsStringValue(value, 'original') || objectContainsStringValue(value, 'no_existing_ip') || objectContainsStringValue(value, '赤焰突围')),
    runtimePlan: (value) => !hasForbiddenIpTerm(value),
    sceneIr: (value) => !hasForbiddenIpTerm(value),
    runtimeManifest: (value) => !hasForbiddenIpTerm(value),
    runtimeOrTelemetry: ({ qaReport }) => !hasForbiddenIpTerm(qaReport)
  })
];

function capability(id: string, requiredLayers: Step38RepresentationLayer[], checks: Omit<Step38CapabilitySpec, 'id' | 'requiredLayers'>): Step38CapabilitySpec {
  return { id, requiredLayers, ...checks };
}

function collectIgnoredRequiredDslFields(report: unknown): string[] {
  if (!isRecord(report) || !Array.isArray(report.entries)) {
    return [];
  }

  return uniqueSorted(
    report.entries
      .filter(isRecord)
      .filter((entry) => entry.authoritative === true)
      .filter((entry) => entry.status === 'unsupported' || entry.status === 'deferred' || entry.status === 'ignored_non_authoritative')
      .map((entry) => (typeof entry.path === 'string' ? entry.path : undefined))
      .filter((path): path is string => path !== undefined)
  );
}

function hasAnyEvent(qaReport: unknown, telemetryEvents: readonly string[], names: readonly string[]): boolean {
  const observed = new Set([...telemetryEvents, ...readObservedEvents(qaReport)]);
  return names.some((name) => observed.has(name));
}

function hasInteractiveRuntimeEvidence(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  if (value.interaction_source !== 'playwright_keyboard') {
    return false;
  }

  const runtimeConsumption = value.runtime_consumption;
  if (!isRecord(runtimeConsumption) || runtimeConsumption.auto_emitted_success_events !== false) {
    return false;
  }

  const sourceArtifacts = runtimeConsumption.source_artifacts;
  if (!isRecord(sourceArtifacts)) {
    return false;
  }
  const requiredArtifacts = ['canonicalDsl', 'runtimePlan', 'sceneIr', 'runtimeManifest'];
  if (!requiredArtifacts.every((artifact) => sourceArtifacts[artifact] === true)) {
    return false;
  }

  const playableState = value.playable_state;
  if (!isRecord(playableState)) {
    return false;
  }
  const requiredStateFlags = ['playerMovedByInput', 'projectileHitEnemy', 'pickupCollected', 'bossPhaseChanged', 'winReached'];
  if (!requiredStateFlags.every((flag) => playableState[flag] === true)) {
    return false;
  }

  const eventRecords = readObservedEventRecords(value);
  return [
    hasEventWithSource(eventRecords, 'player.moved', 'player_input'),
    hasEventWithSource(eventRecords, 'player.jumped', 'player_input'),
    hasEventWithSource(eventRecords, 'player.crouched', 'player_input'),
    hasEventWithSource(eventRecords, 'player.fired', 'player_input'),
    hasEventWithSource(eventRecords, 'item.collected', 'runtime_collision'),
    hasEventWithSource(eventRecords, 'enemy.hit', 'runtime_combat'),
    hasEventWithSource(eventRecords, 'boss.phase.changed', 'runtime_combat'),
    hasEventWithSource(eventRecords, 'game.over', 'runtime_health'),
    hasEventWithSource(eventRecords, 'mission.complete', 'runtime_objective'),
    hasEventWithSource(eventRecords, 'game.won', 'runtime_objective')
  ].every(Boolean);
}

function hasMovingFireEvidence(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const playableState = value.playable_state;
  if (!isRecord(playableState) || playableState.movingFireObserved !== true) {
    return false;
  }

  const manualTraversal = value.manual_traversal_evidence;
  if (!isRecord(manualTraversal) || manualTraversal.moving_fire_seen_by_input !== true) {
    return false;
  }

  const manualGate = manualTraversal.manual_traversal_gate;
  if (!isRecord(manualGate) || manualGate.moving_fire_seen_by_input !== true) {
    return false;
  }

  return readObservedEventRecords(value).some(
    (record) => record.event === 'player.fired' && record.source === 'player_input' && (record.moving === true || record.moving_fire === true)
  );
}

function hasVisualAssetEvidence(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const visualEvidence = value.visual_asset_evidence;
  if (!isRecord(visualEvidence) || visualEvidence.status !== 'PASSED') {
    return false;
  }

  const requiredRoles = readStringArrayField(visualEvidence, 'required_visual_roles');
  const loadedRoles = readStringArrayField(visualEvidence, 'loaded_visual_roles');
  const missingRoles = readStringArrayField(visualEvidence, 'missing_visual_roles');
  const loadedAssetIntentRefs = readStringArrayField(visualEvidence, 'loaded_asset_intent_refs');

  return (
    typeof visualEvidence.renderer === 'string' &&
    visualEvidence.renderer_is_implementation_detail === true &&
    visualEvidence.placeholder_rectangles_present === false &&
    visualEvidence.dsl_visual_intent_bound === true &&
    visualEvidence.visual_intent_source === 'canonical_dsl_visual_intent' &&
    typeof visualEvidence.scene_visual_theme === 'string' &&
    typeof visualEvidence.sprite_asset_count === 'number' &&
    typeof visualEvidence.canonical_visual_intent_count === 'number' &&
    typeof visualEvidence.scene_ir_visual_binding_count === 'number' &&
    typeof visualEvidence.manifest_visual_asset_count === 'number' &&
    visualEvidence.sprite_asset_count >= STEP38_REQUIRED_VISUAL_ROLES.length &&
    visualEvidence.canonical_visual_intent_count >= STEP38_REQUIRED_VISUAL_ROLES.length &&
    visualEvidence.scene_ir_visual_binding_count >= STEP38_REQUIRED_VISUAL_ROLES.length &&
    visualEvidence.manifest_visual_asset_count >= STEP38_REQUIRED_VISUAL_ROLES.length &&
    loadedAssetIntentRefs.length >= STEP38_REQUIRED_VISUAL_ROLES.length &&
    missingRoles.length === 0 &&
    STEP38_REQUIRED_VISUAL_ROLES.every((role) => requiredRoles.includes(role) && loadedRoles.includes(role))
  );
}

function hasVisualVerticalSliceEvidence(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const visualSlice = value.visual_vertical_slice_evidence;
  if (!isRecord(visualSlice) || visualSlice.status !== 'PASSED') {
    return false;
  }

  const observedRuntimeRoles = readStringArrayField(visualSlice, 'observed_runtime_roles');
  const missingRuntimeRoles = readStringArrayField(visualSlice, 'missing_runtime_roles');
  const observedContentTypes = readStringArrayField(visualSlice, 'observed_content_types');
  const missingContentTypes = readStringArrayField(visualSlice, 'missing_content_types');
  const windows = Array.isArray(visualSlice.windows) ? visualSlice.windows.filter(isRecord) : [];
  const windowLabels = windows.map((window) => (typeof window.label === 'string' ? window.label : undefined)).filter((label): label is string => label !== undefined);

  return (
    visualSlice.evidence_source === 'browser_canvas_pixel_probe' &&
    visualSlice.marker_run_id_matches === true &&
    visualSlice.canonical_dsl_visual_intent_runtime_bound === true &&
    visualSlice.canvas_pixel_probe_status === 'PASSED' &&
    typeof visualSlice.screenshot_count === 'number' &&
    visualSlice.screenshot_count >= STEP38_REQUIRED_VERTICAL_SLICE_SCREENSHOTS.length &&
    typeof visualSlice.canvas_pixel_probe_count === 'number' &&
    visualSlice.canvas_pixel_probe_count >= STEP38_REQUIRED_VERTICAL_SLICE_SCREENSHOTS.length &&
    missingRuntimeRoles.length === 0 &&
    missingContentTypes.length === 0 &&
    STEP38_REQUIRED_VISUAL_ROLES.every((role) => observedRuntimeRoles.includes(role)) &&
    STEP38_REQUIRED_VERTICAL_SLICE_CONTENT.every((contentType) => observedContentTypes.includes(contentType)) &&
    STEP38_REQUIRED_VERTICAL_SLICE_SCREENSHOTS.every((label) => windowLabels.includes(label)) &&
    windows.length >= STEP38_REQUIRED_VERTICAL_SLICE_SCREENSHOTS.length &&
    windows.every(hasPassingVisualSliceWindowEvidence)
  );
}

function hasVisualRuntimeBindingReportFromQaReport(value: unknown): boolean {
  return isRecord(value) && hasVisualRuntimeBindingReport(value.visual_runtime_binding_report);
}

function hasVisualAssetMaterializationReportFromQaReport(value: unknown): boolean {
  return isRecord(value) && hasVisualAssetMaterializationReport(value.visual_asset_materialization_report);
}

function hasRuntimeTextureLoadReportFromQaReport(value: unknown): boolean {
  return isRecord(value) && hasRuntimeTextureLoadReport(value.runtime_texture_load_report);
}

function hasVisualRuntimeBindingReport(value: unknown): boolean {
  if (!isRecord(value) || value.status !== 'PASSED') {
    return false;
  }

  const requiredObjects = readStringArrayField(value, 'required_objects');
  const missingObjects = readStringArrayField(value, 'missing_objects');
  const failureReasons = readStringArrayField(value, 'failure_reasons');
  const objects = Array.isArray(value.objects) ? value.objects.filter(isRecord) : [];
  const screenshotLabels = readVisualRuntimeBindingScreenshotLabels(value.fresh_manual_traversal_screenshots);

  if (
    value.source !== 'canonical_dsl' ||
    value.evidence_source !== 'fresh_manual_traversal_screenshots' ||
    value.runtime_authority !== 'canonical_dsl_visual_binding' ||
    missingObjects.length !== 0 ||
    failureReasons.length !== 0 ||
    screenshotLabels.length < STEP38_REQUIRED_MANUAL_TRAVERSAL_SCREENSHOTS.length ||
    !STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((object) => requiredObjects.includes(object))
  ) {
    return false;
  }

  return STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((requiredObject) =>
    objects.some((object) => visualRuntimeBindingObjectPasses(object, requiredObject))
  );
}

function hasVisualAssetMaterializationReport(value: unknown): boolean {
  if (!isRecord(value) || value.status !== 'PASSED') {
    return false;
  }

  const requiredObjects = readStringArrayField(value, 'required_objects');
  const missingObjects = readStringArrayField(value, 'missing_objects');
  const failureReasons = readStringArrayField(value, 'failure_reasons');
  const objects = Array.isArray(value.objects) ? value.objects.filter(isRecord) : [];
  const screenshotLabels = readVisualRuntimeBindingScreenshotLabels(value.fresh_manual_traversal_screenshots);
  const gate = value.materialization_gate;

  if (
    value.source !== 'canonical_dsl' ||
    value.evidence_source !== 'fresh_manual_traversal_screenshots' ||
    value.runtime_authority !== 'canonical_dsl_visual_binding' ||
    missingObjects.length !== 0 ||
    failureReasons.length !== 0 ||
    screenshotLabels.length < STEP38_REQUIRED_MANUAL_TRAVERSAL_SCREENSHOTS.length ||
    !isRecord(gate) ||
    gate.verdict !== 'PASS' ||
    gate.all_required_assets_materialized !== true ||
    gate.all_required_assets_run_scoped !== true ||
    gate.all_required_assets_loaded !== true ||
    gate.all_required_assets_factory_bound !== true ||
    gate.all_required_assets_visible_in_fresh_manual_traversal !== true ||
    gate.visual_intent_sha_present !== true ||
    gate.asset_design_spec_sha_present !== true ||
    gate.motif_coverage_present !== true ||
    gate.all_required_assets_distinct_silhouette !== true ||
    gate.role_static_svg_template_used !== false ||
    gate.old_svgForVisualIntent_used !== false ||
    gate.template_derived_placeholder_detected !== false ||
    gate.label_only_visual_evidence !== false ||
    gate.placeholder_visual_evidence !== false ||
    !STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((object) => requiredObjects.includes(object))
  ) {
    return false;
  }

  return STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((requiredObject) =>
    objects.some((object) => visualAssetMaterializationObjectPasses(object, requiredObject))
  );
}

function hasAssetTemplateFingerprintReport(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'canonical_dsl_visual_asset_materializer') {
    return false;
  }
  const assets = Array.isArray(value.assets) ? value.assets.filter(isRecord) : [];
  const blockers = Array.isArray(value.template_similarity_blockers) ? value.template_similarity_blockers : [];
  return (
    value.role_static_svg_template_used === false &&
    value.old_svgForVisualIntent_used === false &&
    value.template_derived_placeholder_detected === false &&
    blockers.length === 0 &&
    STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((requiredObject) =>
      assets.some((asset) => assetTemplateFingerprintAssetPasses(asset, requiredObject))
    )
  );
}

function assetTemplateFingerprintAssetPasses(asset: Record<string, unknown>, requiredObject: string): boolean {
  const dslGeometryFingerprint = typeof asset.dsl_geometry_fingerprint === 'string' ? asset.dsl_geometry_fingerprint : '';
  const roleStaticControlFingerprint =
    typeof asset.role_static_control_fingerprint === 'string' ? asset.role_static_control_fingerprint : '';
  const materialized2dFingerprint =
    typeof asset.rendered_canvas_pixel_sha === 'string'
      ? asset.rendered_canvas_pixel_sha
      : typeof asset.canvas_pixel_fingerprint === 'string'
        ? asset.canvas_pixel_fingerprint
        : '';
  return (
    asset.required_object === requiredObject &&
    typeof asset.canonical_id === 'string' &&
    /^[a-f0-9]{64}$/.test(typeof asset.visual_intent_sha === 'string' ? asset.visual_intent_sha : '') &&
    /^[a-f0-9]{64}$/.test(typeof asset.asset_design_spec_sha === 'string' ? asset.asset_design_spec_sha : '') &&
    /^[a-f0-9]{64}$/.test(materialized2dFingerprint) &&
    materialized2dFingerprint === dslGeometryFingerprint &&
    typeof asset.template_fingerprint === 'string' &&
    asset.template_fingerprint.length > 0 &&
    asset.matches_known_static_template === false &&
    asset.role_only_generation_detected === false &&
    readStringArrayField(asset, 'dsl_motif_coverage').length > 0 &&
    typeof asset.geometry_signature === 'string' &&
    asset.geometry_signature.length > 0 &&
    dslGeometryFingerprint.length === 64 &&
    roleStaticControlFingerprint.length === 64 &&
    dslGeometryFingerprint !== roleStaticControlFingerprint &&
    asset.visual_geometry_dependency === true &&
    asset.distinct_silhouette === true &&
    asset.placeholder === false
  );
}

function collectAssetTemplateFingerprintBlockers(value: unknown): string[] {
  if (!isRecord(value)) {
    return [];
  }
  const blockers = new Set<string>();
  if (value.old_svgForVisualIntent_used === true) blockers.add('old_svgForVisualIntent_used');
  if (value.role_static_svg_template_used === true) blockers.add('role_static_svg_template_used');
  if (value.template_derived_placeholder_detected === true) blockers.add('template_derived_placeholder_asset');
  const assets = Array.isArray(value.assets) ? value.assets.filter(isRecord) : [];
  for (const asset of assets) {
    if (asset.role_only_generation_detected === true) blockers.add('visual_intent_ignored_by_asset_generator');
    if (asset.matches_known_static_template === true) blockers.add('run_scoped_asset_is_static_template');
    if (asset.placeholder === false && (asset.template_derived_placeholder === true || asset.role_static_svg_template_used === true)) {
      blockers.add('placeholder_false_too_narrow');
    }
  }
  return uniqueSorted([...blockers]);
}

function collectStep38EvidencePolicyBlockers(input: {
  value: unknown;
  gate?: unknown;
  context: 'visual_design_report' | 'operator_gate' | 'canvas_visual_readability_gate' | 'procedural_pixel_art_grammar_gate' | 'canvas_art_fidelity_gate' | 'sprite_animation_coverage_report' | 'environment_layering_report';
  requireManualInputOnly: boolean;
}): string[] {
  const blockers = new Set<string>();
  const missingCode =
    input.context === 'visual_design_report'
      ? 'visual_design_report_dropped_backend_policy'
      : input.context === 'operator_gate'
        ? 'operator_gate_backend_policy_missing'
        : `${input.context}_backend_policy_missing`;
  const mismatchCode =
    input.context === 'operator_gate'
      ? 'operator_gate_backend_policy_mismatch'
      : `${input.context}_backend_policy_mismatch`;

  const records = [input.value, input.gate].filter((record): record is Record<string, unknown> => record !== undefined && isRecord(record));
  if (records.length !== (input.gate === undefined ? 1 : 2)) {
    blockers.add(missingCode);
    return uniqueSorted([...blockers]);
  }

  for (const record of records) {
    for (const [key, expected] of Object.entries(STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY)) {
      if (!(key in record)) {
        blockers.add(missingCode);
      } else if (record[key] !== expected) {
        blockers.add(mismatchCode);
      }
    }
    if (record.backend_policy_valid === true && (!hasStep38BackendPolicyFields(record) || !hasStep38BackendPolicyValues(record))) {
      blockers.add(mismatchCode);
    }
  }

  if (input.requireManualInputOnly) {
    const manualRecordsOk = records.every((record) => {
      const screenshotSource = record.screenshot_source;
      const captureMode = record.capture_mode;
      const inputPolicy = record.input_policy;
      return (
        screenshotSource === STEP38_FRESH_MANUAL_SCREENSHOT_SOURCE &&
        captureMode === 'manual_input_only' &&
        inputPolicy === 'input_only' &&
        record.runtime_operator_snapshot_only === false &&
        record.stale_evidence === false &&
        record.gate_reader_id === STEP38_FINAL_GATE_READER_ID
      );
    });
    if (!manualRecordsOk) {
      blockers.add(
        input.context === 'operator_gate'
          ? 'operator_gate_screenshot_not_manual_input_only'
          : `${input.context}_screenshot_not_manual_input_only`
      );
    }
  }

  return uniqueSorted([...blockers]);
}

function hasStep38BackendPolicyFields(record: Record<string, unknown>): boolean {
  return Object.keys(STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY).every((key) => key in record);
}

function hasStep38BackendPolicyValues(record: Record<string, unknown>): boolean {
  return Object.entries(STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY).every(([key, expected]) => record[key] === expected);
}

function hasStep38EvidencePolicy(input: {
  value: unknown;
  gate?: unknown;
  context: Parameters<typeof collectStep38EvidencePolicyBlockers>[0]['context'];
  requireManualInputOnly?: boolean;
}): boolean {
  return (
    collectStep38EvidencePolicyBlockers({
      value: input.value,
      gate: input.gate,
      context: input.context,
      requireManualInputOnly: input.requireManualInputOnly === true
    }).length === 0
  );
}

function hasVisualDesignRealizationReport(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'fresh_browser_screenshots') {
    return false;
  }
  const gate = value.visual_design_realization_gate;
  const requiredObjects = isRecord(value.required_objects) ? value.required_objects : {};
  if (
    !isRecord(gate) ||
    !hasStep38EvidencePolicy({ value, gate, context: 'visual_design_report', requireManualInputOnly: true }) ||
    gate.verdict !== 'PASS' ||
    gate.role_static_templates_used !== false ||
    gate.old_svgForVisualIntent_used !== false ||
    gate.template_derived_placeholder_detected !== false ||
    gate.visual_intent_affects_asset_geometry !== true ||
    gate.visual_intent_affects_palette !== true ||
    gate.visual_intent_affects_silhouette !== true ||
    gate.visual_intent_affects_environment_layers !== true ||
    gate.object_classes_visibly_distinct !== true ||
    gate.operator_visible_art_ready !== true
  ) {
    return false;
  }
  return STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((requiredObject) => {
    const object = requiredObjects[requiredObject];
    return (
      isRecord(object) &&
      object.dsl_derived === true &&
      object.template_static === false &&
      object.motif_coverage === true &&
      object.distinct_silhouette === true &&
      object.visible_in_screenshot === true &&
      object.placeholder === false &&
      /^[a-f0-9]{64}$/.test(typeof object.visual_intent_sha === 'string' ? object.visual_intent_sha : '') &&
      /^[a-f0-9]{64}$/.test(typeof object.asset_design_spec_sha === 'string' ? object.asset_design_spec_sha : '')
    );
  });
}

function collectVisualDesignRealizationBlockers(value: unknown): string[] {
  if (!isRecord(value)) {
    return [];
  }
  const blockers = new Set<string>();
  const gate = isRecord(value.visual_design_realization_gate) ? value.visual_design_realization_gate : {};
  collectStep38EvidencePolicyBlockers({
    value,
    gate,
    context: 'visual_design_report',
    requireManualInputOnly: true
  }).forEach((blocker) => blockers.add(blocker));
  if (gate.old_svgForVisualIntent_used === true) blockers.add('old_svgForVisualIntent_used');
  if (gate.role_static_templates_used === true) blockers.add('role_static_svg_template_used');
  if (gate.template_derived_placeholder_detected === true) blockers.add('bound_texture_is_template_placeholder');
  if (gate.visual_intent_affects_asset_geometry === false) blockers.add('visual_intent_ignored_by_asset_generator');
  if (gate.visual_intent_affects_palette === false) blockers.add('visual_intent_ignored_by_asset_generator');
  if (gate.visual_intent_affects_silhouette === false) blockers.add('visual_intent_ignored_by_asset_generator');
  if (gate.object_classes_visibly_distinct === false) blockers.add('bound_texture_is_template_placeholder');
  if (gate.operator_visible_art_ready === false) blockers.add('operator_visible_art_gate_missing');
  const requiredObjects = isRecord(value.required_objects) ? value.required_objects : {};
  for (const requiredObject of STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS) {
    const object = requiredObjects[requiredObject];
    if (!isRecord(object)) continue;
    if (object.template_static === true) blockers.add('role_static_svg_template_used');
    if (object.placeholder === true) blockers.add('template_derived_placeholder_asset');
  }
  return uniqueSorted([...blockers]);
}

function collectVisualAssetMaterializationBlockers(value: unknown): string[] {
  if (!isRecord(value)) {
    return [];
  }

  const objects = Array.isArray(value.objects) ? value.objects.filter(isRecord) : [];
  const blockers = new Set<string>();

  for (const requiredObject of STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS) {
    const object = objects.find((candidate) => candidate.required_object === requiredObject);
    if (object === undefined) continue;

    if (typeof object.asset_meta_required_object !== 'string' || object.asset_meta_required_object.length === 0) {
      blockers.add('visual_asset_materialization_asset_required_object_binding_missing');
      continue;
    }

    if (object.asset_meta_required_object !== requiredObject) {
      blockers.add('visual_asset_materialization_asset_required_object_binding_mismatch');
      continue;
    }

    if (hasAssetRequiredObjectIdentityMismatch(object, requiredObject)) {
      blockers.add('visual_asset_materialization_asset_identity_binding_mismatch');
      continue;
    }

    if (!hasAssetRequiredObjectBinding(object, requiredObject)) {
      blockers.add('visual_asset_materialization_asset_required_object_binding_invalid');
    }
  }

  return uniqueSorted([...blockers]);
}

function hasRuntimeTextureLoadReport(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'canonical_dsl') {
    return false;
  }
  const gate = value.texture_load_gate;
  const textures = Array.isArray(value.textures) ? value.textures.filter(isRecord) : [];
  const loadedRequiredObjects = new Set(
    textures
      .filter((texture) => texture.loaded_in_runtime === true && texture.texture_cache_present === true)
      .map((texture) => (typeof texture.required_object === 'string' ? texture.required_object : undefined))
      .filter((requiredObject): requiredObject is string => requiredObject !== undefined)
  );
  const bossProjectileTextures = textures.filter((texture) => texture.required_object === 'boss_projectile_phase_object');
  const projectileTextureKeys = new Set(
    textures
      .filter((texture) => texture.required_object === 'projectile')
      .map((texture) => (typeof texture.texture_key === 'string' ? texture.texture_key : undefined))
      .filter((textureKey): textureKey is string => textureKey !== undefined)
  );
  return (
    isRecord(gate) &&
    gate.verdict === 'PASS' &&
    gate.required_textures_loaded === true &&
    gate.texture_cache_probe_available === true &&
    Array.isArray(gate.missing_texture_keys) &&
    gate.missing_texture_keys.length === 0 &&
    bossProjectileTextures.length >= 1 &&
    bossProjectileTextures.every(
      (texture) =>
        typeof texture.texture_key === 'string' &&
        bossProjectileTextureKeyPasses(texture.texture_key) &&
        !projectileTextureKeys.has(texture.texture_key)
    ) &&
    STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((requiredObject) => loadedRequiredObjects.has(requiredObject)) &&
    textures.every(
      (texture) =>
        typeof texture.texture_key === 'string' &&
        texture.loaded_in_runtime === true &&
        texture.texture_cache_present === true &&
        typeof texture.width === 'number' &&
        texture.width > 0 &&
        typeof texture.height === 'number' &&
        texture.height > 0
    )
  );
}

function hasArtDirectionQualityReport(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'canonical_dsl') {
    return false;
  }
  const gate = value.art_direction_quality_gate;
  if (!isRecord(gate) || gate.verdict !== 'PASS') {
    return false;
  }
  return (
    gate.player_has_distinct_sprite === true &&
    gate.enemy_types_have_distinct_silhouettes === true &&
    gate.boss_has_large_distinct_visual === true &&
    gate.environment_has_layered_theme === true &&
    gate.weapon_projectiles_visibly_distinct === true &&
    gate.jungle_metal_industrial_theme_visible === true &&
    gate.placeholder_style_dominant === false &&
    gate.label_only_visual_evidence === false &&
    gate.operator_visible_quality_ready === true &&
    readStringArrayField(value, 'visible_quality_screenshot_labels').length >= 4
  );
}

function hasEncounterDirectorPlan(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'canonical_dsl') {
    return false;
  }
  const route = readStringArrayField(value, 'route');
  const waves = Array.isArray(value.waves) ? value.waves.filter(isRecord) : [];
  const requiredRoute = ['spawn', 'wave1', 'weapon_pickup', 'area2', 'wave2', 'mixed_enemy_pressure', 'boss_arena', 'boss_phase_1', 'boss_phase_2', 'exit_or_mission_complete'];
  const enemyTypes = new Set(
    waves
      .flatMap((wave) => (Array.isArray(wave.enemy_mix) ? wave.enemy_mix : []))
      .filter(isRecord)
      .map((entry) => (typeof entry.enemy_type === 'string' ? entry.enemy_type : undefined))
      .filter((entry): entry is string => entry !== undefined)
  );
  return (
    requiredRoute.every((step) => route.includes(step)) &&
    waves.length >= 2 &&
    enemyTypes.size >= 3 &&
    waves.every((wave) => {
      const trigger = wave.trigger;
      const clearCondition = wave.clear_condition;
      return (
        typeof wave.id === 'string' &&
        typeof wave.segment_id === 'string' &&
        isRecord(trigger) &&
        typeof trigger.type === 'string' &&
        Array.isArray(wave.enemy_mix) &&
        wave.enemy_mix.length > 0 &&
        typeof wave.spawn_cadence_ms === 'number' &&
        typeof wave.max_active === 'number' &&
        isRecord(clearCondition) &&
        typeof clearCondition.type === 'string' &&
        typeof wave.progression_unlock === 'string' &&
        wave.source === 'canonical_dsl'
      );
    })
  );
}

function hasEncounterDirectorRuntimeEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'canonical_dsl') {
    return false;
  }
  const gate = value.encounter_director_gate;
  if (!isRecord(gate) || gate.verdict !== 'PASS') {
    return false;
  }
  return (
    gate.fresh_manual_session === true &&
    gate.input_only === true &&
    gate.wave1_spawned_by_traversal === true &&
    gate.wave2_spawned_by_traversal === true &&
    typeof gate.enemy_types_visible_count === 'number' &&
    gate.enemy_types_visible_count >= 3 &&
    gate.weapon_pickup_reached_by_input === true &&
    gate.area2_reached_by_input === true &&
    gate.boss_arena_reached_by_input === true &&
    gate.boss_phase_1_visible === true &&
    gate.boss_phase_2_visible_or_reachable === true &&
    gate.wave_clear_reachable_by_input === true &&
    gate.large_empty_traversal_detected === false
  );
}

function hasOutcomeStateMachineReport(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'runtime_outcome_state_machine') {
    return false;
  }
  const states = readStringArrayField(value, 'states');
  const transitions = Array.isArray(value.transitions) ? value.transitions.filter(isRecord) : [];
  const gate = value.outcome_state_machine_gate;
  const requiredStates = ['RUNNING', 'PLAYER_DAMAGED', 'PLAYER_DEAD', 'RETRY_CONSUMED', 'GAME_OVER', 'MISSION_COMPLETE'];
  const hasTransition = (from: string, to: string) => transitions.some((transition) => transition.from === from && transition.to === to);
  return (
    isRecord(gate) &&
    gate.verdict === 'PASS' &&
    gate.win_path_connected === true &&
    gate.lose_path_connected === true &&
    gate.game_over_persistent === true &&
    gate.mission_complete_persistent === true &&
    gate.real_playthrough_completion_verified === true &&
    gate.mission_complete_requires_completion_preconditions === true &&
    gate.completion_preconditions_satisfied === true &&
    gate.early_mission_complete_detected === false &&
    gate.text_or_overlay_only_win_transition === false &&
    STEP38_REQUIRED_COMPLETION_PRECONDITIONS.every((precondition) =>
      readStringArrayField(gate, 'satisfied_completion_preconditions').includes(precondition)
    ) &&
    requiredStates.every((state) => states.includes(state)) &&
    hasTransition('RUNNING', 'PLAYER_DAMAGED') &&
    hasTransition('PLAYER_DAMAGED', 'PLAYER_DEAD') &&
    (hasTransition('PLAYER_DEAD', 'RETRY_CONSUMED') || hasTransition('PLAYER_DEAD', 'GAME_OVER')) &&
    hasTransition('RETRY_CONSUMED', 'GAME_OVER') &&
    hasTransition('RUNNING', 'MISSION_COMPLETE')
  );
}

function hasWinPathEvidence(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const gate = value.win_path_gate;
  if (!isRecord(gate) || gate.verdict !== 'PASS') {
    return false;
  }
  const events = readObservedEvents(value);
  const verifiedPreconditions = readStringArrayField(gate, 'verified_completion_preconditions');
  return (
    gate.fresh_manual_session === true &&
    gate.input_only === true &&
    gate.state_injection_used === false &&
    gate.real_playthrough_completion_verified === true &&
    gate.boss_defeated_by_input === true &&
    gate.all_required_waves_resolved_before_win === true &&
    gate.all_required_regions_traversed_before_win === true &&
    gate.weapon_and_boss_phase_reached_before_win === true &&
    gate.text_or_overlay_only_evidence === false &&
    gate.early_mission_complete_detected === false &&
    STEP38_REQUIRED_COMPLETION_PRECONDITIONS.every((precondition) => verifiedPreconditions.includes(precondition)) &&
    gate.mission_complete_overlay_visible === true &&
    gate.mission_complete_overlay_persistent === true &&
    gate.telemetry_mission_complete_recorded === true &&
    gate.mission_complete_visible === true &&
    events.includes('mission.complete') &&
    typeof gate.screenshot_evidence_path === 'string' &&
    typeof gate.metadata_evidence_path === 'string'
  );
}

function hasLosePathEvidence(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const gate = value.lose_path_gate;
  if (!isRecord(gate) || gate.verdict !== 'PASS') {
    return false;
  }
  const events = readObservedEvents(value);
  return (
    gate.fresh_manual_session === true &&
    gate.input_only === true &&
    gate.state_injection_used === false &&
    gate.direct_health_mutation_used === false &&
    gate.direct_game_over_trigger_used === false &&
    gate.game_over_at_spawn === false &&
    gate.player_damage_observed === true &&
    gate.health_reached_zero_or_retries_exhausted === true &&
    gate.game_over_overlay_visible === true &&
    gate.game_over_overlay_persistent === true &&
    gate.telemetry_game_over_recorded === true &&
    events.includes('player.damaged') &&
    (events.includes('player.dead') || events.includes('retry.consumed')) &&
    events.includes('game.over') &&
    typeof gate.screenshot_evidence_path === 'string' &&
    typeof gate.metadata_evidence_path === 'string'
  );
}

function hasSuccessRouteMilestoneTimeline(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'fresh_manual_playthrough_input_only') {
    return false;
  }
  const segments = Array.isArray(value.segments) ? value.segments.filter(isRecord) : [];
  const requiredSegmentIds = ['spawn_to_wave1', 'wave2_to_boss_telegraph', 'boss_to_mission_complete'];
  const hasPressureEvidence = segments.some((segment) => {
    const progressEvidence = readStringArrayField(segment, 'progress_evidence');
    return (
      segment.id === 'wave2_to_boss_telegraph' &&
      segment.verdict === 'PASS' &&
      progressEvidence.some((evidence) =>
        [
          'flying_enemy_visible',
          'enemy_projectile_visible',
          'boss_projectile_visible',
          'player_projectile_visible_with_pressure',
          'active_pressure_band_visible'
        ].includes(evidence)
      )
    );
  });
  return (
    value.route_verdict === 'PASS' &&
    value.large_empty_traversal_detected === false &&
    value.mission_complete_used_as_route_pass_without_milestones === false &&
    value.text_only_evidence_used_for_pass === false &&
    value.telemetry_only_evidence_used_for_pass === false &&
    value.large_empty_traversal_threshold_sec === 8 &&
    requiredSegmentIds.every((id) => segments.some((segment) => segment.id === id && segment.verdict === 'PASS')) &&
    hasPressureEvidence
  );
}

function hasRoutePressureBandEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'fresh_manual_playthrough_input_only') {
    return false;
  }
  const gate = value.route_pressure_band_gate;
  const bands = Array.isArray(value.pressure_bands) ? value.pressure_bands.filter(isRecord) : [];
  const pressureBand = bands.find(
    (band) => band.id === 'wave2_to_boss_mid_pressure' && band.counts_as_progress === true
  );
  const pressureObjects = isRecord(pressureBand)
    ? new Set(readStringArrayField(pressureBand, 'visible_runtime_objects'))
    : new Set<string>();
  const progressEvidence = isRecord(pressureBand) ? readStringArrayField(pressureBand, 'progress_evidence') : [];
  const screenshots = isRecord(pressureBand) ? readStringArrayField(pressureBand, 'screenshots') : [];
  const metadataPaths = isRecord(pressureBand) ? readStringArrayField(pressureBand, 'metadata_paths') : [];
  const hostileProjectileOrHazardVisible =
    pressureObjects.has('enemy_projectile') ||
    pressureObjects.has('boss_projectile_phase_object') ||
    pressureObjects.has('boss_projectile') ||
    pressureObjects.has('environment_hazard');
  return (
    isRecord(gate) &&
    gate.verdict === 'PASS' &&
    gate.max_empty_interval_sec === 8 &&
    typeof gate.largest_empty_interval_sec === 'number' &&
    gate.largest_empty_interval_sec <= 8 &&
    gate.large_empty_traversal_detected === false &&
    gate.text_only_evidence_used_for_pass === false &&
    gate.telemetry_only_evidence_used_for_pass === false &&
    isRecord(pressureBand) &&
    pressureObjects.has('flying_enemy') &&
    pressureObjects.has('player_projectile') &&
    hostileProjectileOrHazardVisible &&
    progressEvidence.includes('active_pressure_band_visible') &&
    screenshots.length > 0 &&
    metadataPaths.length > 0
  );
}

function hasRealPlaythroughCompletionEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'fresh_input_only_browser_playthrough') {
    return false;
  }
  const gate = value.real_playthrough_completion_gate;
  if (!isRecord(gate) || gate.verdict !== 'PASS') {
    return false;
  }
  const screenshots = Array.isArray(value.screenshots) ? value.screenshots.filter(isRecord) : [];
  const labels = screenshots
    .map((screenshot) => (typeof screenshot.label === 'string' ? screenshot.label : undefined))
    .filter((label): label is string => label !== undefined);
  const requiredPreconditions = readStringArrayField(gate, 'verified_completion_preconditions');
  return (
    gate.fresh_manual_session === true &&
    gate.input_only === true &&
    gate.starts_from_spawn === true &&
    gate.teleport_used === false &&
    gate.camera_jump_used === false &&
    gate.debug_reposition_used === false &&
    gate.state_injection_used === false &&
    gate.direct_spawn_used === false &&
    gate.direct_phase_trigger_used === false &&
    gate.direct_mission_trigger_used === false &&
    gate.real_playthrough_completion_verified === true &&
    gate.boss_defeated_by_input === true &&
    gate.all_required_waves_resolved_before_win === true &&
    gate.all_required_regions_traversed_before_win === true &&
    gate.weapon_and_boss_phase_reached_before_win === true &&
    gate.mission_complete_after_real_playthrough === true &&
    gate.wave1_cleared_by_play === true &&
    gate.weapon_pickup_collected_by_play === true &&
    gate.area_progression_reached_by_play === true &&
    gate.wave2_or_later_wave_cleared_or_pressure_seen_by_play === true &&
    gate.mid_route_pressure_evidence_present === true &&
    gate.boss_arena_reached_by_play === true &&
    gate.boss_phase_1_seen_by_play === true &&
    gate.boss_phase_2_seen_by_play === true &&
    gate.boss_defeated_by_play === true &&
    gate.mission_complete_visible_after_play === true &&
    gate.mission_complete_persistent === true &&
    gate.large_empty_traversal_detected === false &&
    typeof gate.success_route_milestone_timeline_path === 'string' &&
    gate.screenshots_support_all_required_steps === true &&
    gate.text_only_evidence_used_for_pass === false &&
    gate.manifest_only_evidence_used_for_pass === false &&
    gate.overlay_only_evidence_used_for_pass === false &&
    gate.telemetry_only_evidence_used_for_pass === false &&
    gate.scripted_capture_used_for_pass === false &&
    gate.text_or_overlay_only_evidence === false &&
    gate.early_mission_complete_detected === false &&
    STEP38_REQUIRED_COMPLETION_PRECONDITIONS.every((precondition) => requiredPreconditions.includes(precondition)) &&
    STEP38_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS.every((label) => labels.includes(label)) &&
    screenshots.every(realPlaythroughScreenshotPasses)
  );
}

function hasTwoDGameplayPlaythroughGate(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const gate = value.two_d_gameplay_playthrough_gate;
  if (!isRecord(gate) || gate.verdict !== 'PASS') {
    return false;
  }
  return (
    gate.target === 'generated_2d_gameplay' &&
    gate.renderer_is_implementation_detail === true &&
    gate.fresh_manual_session === true &&
    gate.input_only === true &&
    gate.teleport_used === false &&
    gate.camera_jump_used === false &&
    gate.state_injection_used === false &&
    gate.direct_wave_spawn_used === false &&
    gate.direct_boss_spawn_used === false &&
    gate.direct_phase_trigger_used === false &&
    gate.direct_mission_complete_trigger_used === false &&
    gate.direct_game_over_trigger_used === false &&
    gate.generated_from_canonical_dsl === true &&
    gate.preloaded_artifact_used === false &&
    gate.fallback_used === false &&
    gate.legacy_fixed_template_authority === false &&
    gate.player_movement_proven === true &&
    gate.jump_proven === true &&
    gate.crouch_proven === true &&
    gate.shooting_proven === true &&
    gate.weapon_pickup_collected_by_play === true &&
    gate.wave1_reached_by_play === true &&
    gate.wave2_reached_by_play === true &&
    gate.area_progression_reached_by_play === true &&
    gate.mid_route_pressure_evidence_present === true &&
    gate.large_empty_traversal_detected === false &&
    gate.boss_arena_reached_by_play === true &&
    gate.boss_phase_1_seen_by_play === true &&
    gate.boss_phase_2_seen_by_play === true &&
    gate.boss_defeated_by_play === true &&
    gate.mission_complete_visible === true &&
    gate.game_over_visible === true &&
    gate.game_over_at_spawn === false &&
    gate.player_damage_observed_for_game_over === true &&
    gate.health_zero_or_retries_exhausted_by_play === true &&
    gate.runtime_visual_evidence_supports_claims === true &&
    gate.text_only_evidence_used_for_pass === false &&
    gate.manifest_only_evidence_used_for_pass === false &&
    gate.overlay_only_evidence_used_for_pass === false
  );
}

function hasCanvasVisualReadabilityGate(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const gate = value.canvas_visual_readability_gate;
  if (!isRecord(gate) || gate.verdict !== 'PASS') {
    return false;
  }
  const requiredObjects = readStringArrayField(gate, 'required_objects');
  const readableObjects = readStringArrayField(gate, 'readable_required_objects');
  const drawPlanFieldsPresent = readStringArrayField(gate, 'draw_plan_fields_present');
  const requiredDrawPlanFields = [
    'required_object',
    'canonical_id',
    'renderer_kind',
    'source',
    'visual_intent_sha',
    'draw_plan_sha',
    'canvas_size',
    'draw_operations'
  ];
  return (
    hasStep38EvidencePolicy({ value, gate, context: 'canvas_visual_readability_gate' }) &&
    gate.renderer_kind === 'canvas_texture' &&
    gate.png_required_for_pass === false &&
    gate.svg_required_for_pass === false &&
    gate.player_readable === true &&
    gate.enemy_classes_visibly_distinct === true &&
    gate.boss_visibly_distinct_and_large === true &&
    gate.projectile_types_distinct === true &&
    gate.pickup_visibly_collectible === true &&
    gate.environment_theme_layered === true &&
    gate.jungle_metal_industrial_motifs_visible === true &&
    gate.debug_geometry_dominant === false &&
    gate.label_or_overlay_used_as_art_evidence === false &&
    gate.screenshots_support_claims === true &&
    STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((requiredObject) => requiredObjects.includes(requiredObject)) &&
    STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((requiredObject) => readableObjects.includes(requiredObject)) &&
    requiredDrawPlanFields.every((field) => drawPlanFieldsPresent.includes(field))
  );
}

function hasProceduralPixelArtGrammarReport(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const gate = value.procedural_pixel_art_grammar_gate;
  if (!isRecord(gate) || gate.verdict !== 'PASS') {
    return false;
  }
  const requiredObjects = readStringArrayField(gate, 'required_objects');
  return (
    value.source === 'canonical_dsl_visual_asset_materializer' &&
    hasStep38EvidencePolicy({ value, gate, context: 'procedural_pixel_art_grammar_gate' }) &&
    gate.renderer_kind === 'runtime_canvas_texture' &&
    gate.external_art_required === false &&
    gate.image_model_required === false &&
    gate.role_only_generation_used === false &&
    gate.debug_geometry_dominant === false &&
    gate.visual_intent_affects_geometry === true &&
    gate.visual_intent_affects_palette === true &&
    gate.visual_intent_affects_silhouette === true &&
    gate.visual_intent_affects_animation === true &&
    gate.visual_intent_affects_environment_layers === true &&
    gate.object_classes_visibly_distinct === true &&
    gate.identical_frame_failure === false &&
    STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((requiredObject) => requiredObjects.includes(requiredObject))
  );
}

function hasCanvasArtFidelityGate(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const gate = value.canvas_art_fidelity_gate;
  return (
    isRecord(gate) &&
    hasStep38EvidencePolicy({ value, gate, context: 'canvas_art_fidelity_gate', requireManualInputOnly: true }) &&
    gate.verdict === 'PASS' &&
    gate.target_fidelity === 'procedural_pixel_art_readable_v1' &&
    gate.renderer_kind === 'runtime_canvas_texture' &&
    gate.player_readable === true &&
    gate.enemy_classes_visibly_distinct === true &&
    gate.boss_visibly_distinct_and_large === true &&
    gate.projectile_types_distinct === true &&
    gate.pickup_visibly_collectible === true &&
    gate.environment_theme_layered === true &&
    gate.jungle_metal_industrial_motifs_visible === true &&
    gate.animation_frames_present === true &&
    gate.hit_and_pickup_feedback_visible === true &&
    gate.debug_geometry_dominant === false &&
    gate.label_or_overlay_used_as_art_evidence === false &&
    gate.screenshots_support_claims === true
  );
}

function hasSpriteAnimationCoverageReport(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const gate = value.sprite_animation_coverage_gate;
  const objects = Array.isArray(value.objects) ? value.objects.filter(isRecord) : [];
  return (
    isRecord(gate) &&
    hasStep38EvidencePolicy({ value, gate, context: 'sprite_animation_coverage_report' }) &&
    gate.verdict === 'PASS' &&
    gate.runtime_bound === true &&
    gate.identical_frame_failure === false &&
    readStringArrayField(gate, 'player_frame_names').length >= 7 &&
    readStringArrayField(gate, 'boss_frame_names').length >= 5 &&
    typeof gate.projectile_frame_count === 'number' &&
    gate.projectile_frame_count >= 2 &&
    typeof gate.effect_frame_count === 'number' &&
    gate.effect_frame_count >= 4 &&
    STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((requiredObject) =>
      objects.some((object) => {
        const frameHashes = readStringArrayField(object, 'frame_hashes');
        return (
          object.required_object === requiredObject &&
          typeof object.frame_count === 'number' &&
          object.frame_count >= (requiredObject === 'player' ? 7 : requiredObject === 'boss' ? 5 : 2) &&
          frameHashes.length >= 2 &&
          new Set(frameHashes).size >= 2 &&
          object.runtime_bound === true &&
          object.identical_frame_failure === false
        );
      })
    )
  );
}

function hasEnvironmentLayeringReport(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const gate = value.environment_layering_gate;
  return (
    isRecord(gate) &&
    hasStep38EvidencePolicy({ value, gate, context: 'environment_layering_report' }) &&
    gate.verdict === 'PASS' &&
    gate.background_layer_present === true &&
    gate.midground_layer_present === true &&
    gate.foreground_platform_layer_present === true &&
    typeof gate.prop_variant_count === 'number' &&
    gate.prop_variant_count >= 3 &&
    typeof gate.hazard_variant_count === 'number' &&
    gate.hazard_variant_count >= 2 &&
    typeof gate.area_theme_variant_count === 'number' &&
    gate.area_theme_variant_count >= 3 &&
    gate.jungle_motif_visible === true &&
    gate.metal_motif_visible === true &&
    gate.industrial_core_motif_visible === true &&
    gate.label_or_overlay_used_as_art_evidence === false &&
    gate.screenshots_support_claims === true
  );
}

function hasStartupSurvivabilityGate(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const gate = value.startup_survivability_gate;
  return (
    isRecord(gate) &&
    gate.verdict === 'PASS' &&
    gate.fresh_session_starts_alive === true &&
    gate.health_at_spawn_gt_zero === true &&
    gate.game_over_at_spawn === false &&
    typeof gate.minimum_safe_control_window_sec === 'number' &&
    gate.minimum_safe_control_window_sec >= 3 &&
    gate.spawn_immediate_lethal_pressure === false &&
    gate.player_has_reaction_space === true &&
    gate.state_injection_used === false &&
    gate.direct_health_mutation_used === false &&
    gate.direct_game_over_trigger_used === false
  );
}

function hasEncounterPlayabilityGate(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const gate = value.encounter_playability_gate;
  return (
    isRecord(gate) &&
    gate.verdict === 'PASS' &&
    typeof gate.spawn_safe_window_sec === 'number' &&
    gate.spawn_safe_window_sec >= 3 &&
    gate.overcrowded_spawn_detected === false &&
    gate.enemy_density_within_camera_limit === true &&
    gate.projectile_density_within_camera_limit === true &&
    gate.player_has_reaction_space === true &&
    gate.wave1_intro_pressure === true &&
    gate.weapon_pickup_reachable === true &&
    gate.wave2_mixed_pressure === true &&
    gate.boss_arena_reachable === true &&
    gate.boss_pressure_readable === true &&
    gate.large_empty_traversal_detected === false &&
    gate.text_only_evidence_used_for_pass === false &&
    gate.manifest_only_evidence_used_for_pass === false &&
    gate.overlay_only_evidence_used_for_pass === false
  );
}

function hasHumanVisibleGameplayGate(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const gate = value.human_visible_gameplay_gate;
  if (!isRecord(gate) || gate.verdict !== 'PASS') {
    return false;
  }
  const screenshotLabels = readStringArrayField(gate, 'screenshot_labels');
  return (
    gate.operator_visible_evidence_required === true &&
    gate.browser_visual_evidence_required === true &&
    gate.input_only_evidence_required === true &&
    gate.fresh_manual_session === true &&
    gate.input_only === true &&
    gate.player_visible === true &&
    gate.weapon_visible === true &&
    gate.wave1_visible === true &&
    gate.wave2_visible === true &&
    gate.area_progression_visible === true &&
    gate.boss_visible === true &&
    gate.boss_phase_visible === true &&
    gate.mission_complete_visible_after_play === true &&
    gate.text_only_evidence_used_for_pass === false &&
    gate.manifest_only_evidence_used_for_pass === false &&
    gate.overlay_only_evidence_used_for_pass === false &&
    gate.receipt_only_evidence_used_for_pass === false &&
    gate.telemetry_only_evidence_used_for_pass === false &&
    gate.scripted_capture_used_for_pass === false &&
    STEP38_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS.every((label) => screenshotLabels.includes(label))
  );
}

function hasOperatorVisibleArtGate(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'fresh_browser_screenshots') {
    return false;
  }
  const gate = value.operator_visible_art_gate;
  if (!isRecord(gate) || gate.verdict !== 'PASS') {
    return false;
  }
  return (
    hasStep38EvidencePolicy({ value, gate, context: 'operator_gate', requireManualInputOnly: true }) &&
    gate.target === 'procedural_pixel_art_readable_v1' &&
    gate.production_art_claimed === false &&
    gate.external_art_used === false &&
    gate.operator_visible_quality_ready === true &&
    gate.player_enemy_boss_environment_readable === true &&
    gate.visual_style_consistent === true &&
    gate.debug_geometry_dominant === false &&
    gate.manual_review_required === true &&
    gate.operator_visible_evidence_required === true &&
    gate.browser_visual_evidence_required === true &&
    gate.player_visibly_dsl_derived === true &&
    gate.enemy_types_visibly_distinct === true &&
    gate.boss_visibly_distinct === true &&
    gate.boss_projectile_visibly_distinct === true &&
    gate.weapon_pickup_visibly_distinct === true &&
    gate.environment_theme_visibly_layered === true &&
    gate.projectile_types_visibly_distinct === true &&
    gate.label_only_visual_evidence === false &&
    gate.placeholder_style_dominant === false &&
    gate.template_derived_placeholder === false &&
    gate.role_static_templates_used === false &&
    gate.old_svgForVisualIntent_used === false &&
    gate.visual_design_realization_gate === 'PASS' &&
    gate.screenshots_support_visual_claims === true &&
    gate.text_only_evidence_used_for_pass === false &&
    gate.manifest_only_evidence_used_for_pass === false &&
    gate.overlay_only_evidence_used_for_pass === false &&
    gate.receipt_only_evidence_used_for_pass === false &&
    gate.telemetry_only_evidence_used_for_pass === false &&
    gate.scripted_capture_used_for_pass === false &&
    STEP38_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS.every((label) => readStringArrayField(value, 'screenshot_labels').includes(label))
  );
}

function collectOperatorVisibleArtGateBlockers(value: unknown): string[] {
  if (!isRecord(value)) {
    return [];
  }
  const gate = isRecord(value.operator_visible_art_gate) ? value.operator_visible_art_gate : {};
  const blockers = new Set<string>();
  collectStep38EvidencePolicyBlockers({
    value,
    gate,
    context: 'operator_gate',
    requireManualInputOnly: true
  }).forEach((blocker) => blockers.add(blocker));
  if (gate.external_art_used === true) blockers.add('operator_gate_backend_policy_mismatch');
  if (gate.scripted_capture_used_for_pass === true) blockers.add('operator_gate_screenshot_not_manual_input_only');
  if (gate.text_only_evidence_used_for_pass === true || gate.manifest_only_evidence_used_for_pass === true || gate.overlay_only_evidence_used_for_pass === true) {
    blockers.add('operator_visible_art_gate_missing');
  }
  return uniqueSorted([...blockers]);
}

function hasVisualPlaythroughValidatorReport(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const gate = value.visual_playthrough_validator;
  if (!isRecord(gate) || gate.verdict !== 'PASS') {
    return false;
  }
  const requiredGateSummary = gate.required_gate_summary;
  return (
    gate.text_only_evidence_used_for_pass === false &&
    gate.manifest_only_evidence_used_for_pass === false &&
    gate.overlay_only_evidence_used_for_pass === false &&
    gate.receipt_only_evidence_used_for_pass === false &&
    gate.telemetry_only_evidence_used_for_pass === false &&
    gate.scripted_capture_used_for_pass === false &&
    gate.operator_visible_evidence_required === true &&
    gate.browser_visual_evidence_required === true &&
    gate.input_only_evidence_required === true &&
    Array.isArray(gate.blocking_reasons) &&
    gate.blocking_reasons.length === 0 &&
    gate.encounter_coverage_status === 'PASSED' &&
    gate.real_playthrough_won === true &&
    gate.boss_defeated === true &&
    gate.manual_traversal_gate === 'PASS' &&
    gate.large_empty_traversal_detected === false &&
    gate.success_route_milestone_timeline_verdict === 'PASS' &&
    gate.route_pressure_band_gate === 'PASS' &&
    gate.win_path_gate === 'PASS' &&
    gate.lose_path_gate === 'PASS' &&
    gate.mission_complete_used_as_route_pass_without_milestones === false &&
    isRecord(requiredGateSummary) &&
    requiredGateSummary.real_playthrough_completion_gate === 'PASS' &&
    requiredGateSummary.human_visible_gameplay_gate === 'PASS' &&
    requiredGateSummary.success_route_milestone_timeline === 'PASS' &&
    requiredGateSummary.route_pressure_band_gate === 'PASS' &&
    requiredGateSummary.operator_visible_art_gate === 'PASS' &&
    requiredGateSummary.win_path_gate === 'PASS' &&
    requiredGateSummary.lose_path_gate === 'PASS' &&
    readStringArrayField(value, 'evidence_paths').length >= STEP38_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS.length
  );
}

function realPlaythroughScreenshotPasses(screenshot: Record<string, unknown>): boolean {
  const canvasPixelProbe = screenshot.canvas_pixel_probe;
  return (
    typeof screenshot.label === 'string' &&
    typeof screenshot.screenshot_path === 'string' &&
    typeof screenshot.screenshot_sha256 === 'string' &&
    typeof screenshot.metadata_path === 'string' &&
    screenshot.evidence_type === 'fresh_manual_playthrough_input_only' &&
    screenshot.counts_for_ready_for_manual_test === true &&
    screenshot.fresh_manual_session === true &&
    screenshot.starts_from_spawn === true &&
    screenshot.input_only === true &&
    screenshot.teleport_used === false &&
    screenshot.camera_jump_used === false &&
    screenshot.debug_reposition_used === false &&
    screenshot.state_injection_used === false &&
    screenshot.direct_spawn_used === false &&
    screenshot.direct_phase_trigger_used === false &&
    screenshot.label_only_visual_evidence === false &&
    screenshot.placeholder_objects_seen === false &&
    screenshot.pixel_probe_passed === true &&
    Array.isArray(screenshot.visible_canonical_objects) &&
    screenshot.visible_canonical_objects.length > 0 &&
    Array.isArray(screenshot.visible_materialized_assets) &&
    screenshot.visible_materialized_assets.length > 0 &&
    isRecord(canvasPixelProbe) &&
    canvasPixelProbe.status === 'PASSED' &&
    typeof canvasPixelProbe.probed_runtime_object_count === 'number' &&
    canvasPixelProbe.probed_runtime_object_count > 0 &&
    typeof canvasPixelProbe.non_background_pixel_count === 'number' &&
    canvasPixelProbe.non_background_pixel_count > 0 &&
    realPlaythroughScreenshotMeetsLabel(screenshot)
  );
}

function realPlaythroughScreenshotMeetsLabel(screenshot: Record<string, unknown>): boolean {
  const label = typeof screenshot.label === 'string' ? screenshot.label : '';
  const contentTypes = new Set(readStringArrayField(screenshot, 'visible_content_types'));
  const objectTypes = new Set(readStringArrayField(screenshot, 'visible_object_types'));
  const runtimeRoles = new Set(readStringArrayField(screenshot, 'visible_runtime_roles'));
  switch (label) {
    case '00_fresh_spawn':
      return contentTypes.has('player') && contentTypes.has('region_transition');
    case '01_wave1_visible':
      return contentTypes.has('enemy_wave') && (runtimeRoles.has('enemy_ground') || contentTypes.has('static_enemy'));
    case '02_wave1_clear_or_progression':
      return objectTypes.has('wave_marker') || contentTypes.has('runtime_feedback') || contentTypes.has('projectile');
    case '03_weapon_pickup_visible_and_collected':
      return contentTypes.has('weapon_pickup') && screenshot.weapon_pickup_collected === true;
    case '04_area_progression_visible':
      return contentTypes.has('region_transition');
    case '05_wave2_mixed_enemies_visible':
      return contentTypes.has('enemy_wave') && (contentTypes.has('flying_enemy') || runtimeRoles.has('flying_enemy'));
    case '06_wave2_clear_or_pressure':
      return contentTypes.has('enemy_wave') || contentTypes.has('runtime_feedback');
    case '07_boss_arena_visible':
      return contentTypes.has('boss') && contentTypes.has('region_transition');
    case '08_boss_phase_1_visible':
      return contentTypes.has('boss') && contentTypes.has('boss_telegraph');
    case '09_boss_phase_2_visible':
      return contentTypes.has('boss') && contentTypes.has('boss_phase');
    case '10_boss_defeated':
      return screenshot.boss_defeated_by_input === true;
    case '11_mission_complete_after_play':
      return screenshot.mission_complete_after_real_playthrough === true && objectTypes.has('mission_complete_overlay');
    default:
      return false;
  }
}

function readVisualRuntimeBindingScreenshotLabels(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueSorted(
    value
      .map((entry) => {
        if (typeof entry === 'string') return entry;
        if (isRecord(entry) && typeof entry.label === 'string') return entry.label;
        return undefined;
      })
      .filter((entry): entry is string => entry !== undefined)
  );
}

function visualRuntimeBindingObjectPasses(object: Record<string, unknown>, requiredObject: string): boolean {
  const palette = readStringArrayField(object, 'palette');
  const evidenceScreenshots = readStringArrayField(object, 'evidence_screenshots');
  const rendererKind = object.renderer_kind;
  const silhouette = typeof object.silhouette === 'string' ? object.silhouette : '';
  const textureKey = typeof object.texture_key === 'string' ? object.texture_key : '';

  return (
    object.required_object === requiredObject &&
    hasDslDrivenVisualAssetFields(object) &&
    hasAssetRequiredObjectBinding(object, requiredObject) &&
    typeof object.canonical_id === 'string' &&
    object.canonical_id.length > 0 &&
    typeof object.role === 'string' &&
    object.role.length > 0 &&
    object.source === 'canonical_dsl' &&
    typeof object.visual_role === 'string' &&
    object.visual_role.length > 0 &&
    typeof object.asset_role === 'string' &&
    object.asset_role.length > 0 &&
    palette.length >= 3 &&
    silhouette.length > 0 &&
    silhouette !== 'runtime_generated_shape' &&
    silhouette !== 'missing_runtime_binding' &&
    textureKey.length > 0 &&
    !textureKey.startsWith('missing:') &&
    (rendererKind === 'sprite' || rendererKind === 'generated_texture' || rendererKind === 'canvas_texture') &&
    object.loaded_in_runtime === true &&
    object.bound_to_runtime_object === true &&
    object.factory_used_texture_key === true &&
    object.used_placeholder_renderer === false &&
    object.visible_in_fresh_manual_traversal === true &&
    object.materialized === true &&
    object.placeholder === false &&
    object.label_only === false &&
    (requiredObject !== 'projectile' || evidenceScreenshots.includes('02_projectile_visible_by_input')) &&
    (requiredObject !== 'boss_projectile_phase_object' ||
      (bossProjectileTextureKeyPasses(textureKey) && evidenceScreenshots.some((label) => label.includes('boss')))) &&
    evidenceScreenshots.length > 0
  );
}

function visualAssetMaterializationObjectPasses(object: Record<string, unknown>, requiredObject: string): boolean {
  const palette = readStringArrayField(object, 'palette');
  const evidenceScreenshots = readStringArrayField(object, 'evidence_screenshots');
  const textureKey = typeof object.texture_key === 'string' ? object.texture_key : '';
  const runScopedSha = typeof object.run_scoped_asset_sha256 === 'string' ? object.run_scoped_asset_sha256 : '';
  const servedSha = typeof object.served_asset_sha256 === 'string' ? object.served_asset_sha256 : '';

  return (
    object.required_object === requiredObject &&
    hasDslDrivenVisualAssetFields(object) &&
    hasAssetRequiredObjectBinding(object, requiredObject) &&
    typeof object.canonical_id === 'string' &&
    object.canonical_id.length > 0 &&
    object.source === 'canonical_dsl' &&
    typeof object.role === 'string' &&
    object.role.length > 0 &&
    typeof object.visual_role === 'string' &&
    object.visual_role.length > 0 &&
    typeof object.asset_role === 'string' &&
    object.asset_role.length > 0 &&
    palette.length >= 3 &&
    typeof object.silhouette === 'string' &&
    object.silhouette.length > 0 &&
    typeof object.run_scoped_asset_path === 'string' &&
    object.run_scoped_asset_path.includes('/generated/step38/') &&
    typeof object.served_asset_path === 'string' &&
    object.served_asset_path.includes('public/assets/') &&
    runScopedSha.length === 64 &&
    servedSha.length === 64 &&
    runScopedSha === servedSha &&
    textureKey.length > 0 &&
    !textureKey.startsWith('missing:') &&
    object.materialized === true &&
    object.copied_to_served_assets === true &&
    object.loaded_in_runtime === true &&
    object.texture_cache_present === true &&
    object.bound_to_runtime_object === true &&
    object.factory_used_texture_key === true &&
    object.visible_in_fresh_manual_traversal === true &&
    object.placeholder === false &&
    object.label_only === false &&
    (requiredObject !== 'projectile' || evidenceScreenshots.includes('02_projectile_visible_by_input')) &&
    (requiredObject !== 'boss_projectile_phase_object' ||
      (bossProjectileTextureKeyPasses(textureKey) && evidenceScreenshots.some((label) => label.includes('boss')))) &&
    evidenceScreenshots.length > 0
  );
}

function hasDslDrivenVisualAssetFields(object: Record<string, unknown>): boolean {
  const visualIntentSha = typeof object.visual_intent_sha === 'string' ? object.visual_intent_sha : '';
  const assetDesignSpecSha = typeof object.asset_design_spec_sha === 'string' ? object.asset_design_spec_sha : '';
  const dslGeometryFingerprint = typeof object.dsl_geometry_fingerprint === 'string' ? object.dsl_geometry_fingerprint : '';
  const roleStaticControlFingerprint =
    typeof object.role_static_control_fingerprint === 'string' ? object.role_static_control_fingerprint : '';
  return (
    /^[a-f0-9]{64}$/.test(visualIntentSha) &&
    /^[a-f0-9]{64}$/.test(assetDesignSpecSha) &&
    readStringArrayField(object, 'motif_coverage').length > 0 &&
    typeof object.geometry_signature === 'string' &&
    object.geometry_signature.length > 0 &&
    typeof object.template_fingerprint === 'string' &&
    object.template_fingerprint.length > 0 &&
    dslGeometryFingerprint.length === 64 &&
    roleStaticControlFingerprint.length === 64 &&
    dslGeometryFingerprint !== roleStaticControlFingerprint &&
    object.visual_geometry_dependency === true &&
    object.role_static_template_used !== true &&
    object.role_static_svg_template_used !== true &&
    object.old_svgForVisualIntent_used !== true &&
    object.template_derived_placeholder !== true &&
    object.role_only_generation_detected !== true &&
    object.matches_known_static_template !== true &&
    object.distinct_silhouette === true
  );
}

function hasAssetRequiredObjectBinding(object: Record<string, unknown>, requiredObject: string): boolean {
  const source = object.asset_required_object_binding_source;
  const path = readStringArrayField(object, 'asset_required_object_binding_path');
  const textureKey = typeof object.texture_key === 'string' ? object.texture_key : '';
  const canonicalId = typeof object.canonical_id === 'string' ? object.canonical_id : '';
  const expectedEntityId = typeof object.expected_entity_id === 'string' ? object.expected_entity_id : '';
  const expectedAssetId = typeof object.expected_asset_id === 'string' ? object.expected_asset_id : '';
  const expectedAssetIntentRef = typeof object.expected_asset_intent_ref === 'string' ? object.expected_asset_intent_ref : '';
  const expectedPath = [
    'asset_manifest.assets[].requiredObject',
    'loadSpriteAssets',
    'runtime_render_object',
    'materialization_report'
  ];

  return (
    object.asset_meta_required_object === requiredObject &&
    object.asset_required_object_binding_valid === true &&
    isRecord(source) &&
    source.type === 'asset_manifest_required_object' &&
    source.manifest_path === 'assets[].requiredObject' &&
    source.required_object === requiredObject &&
    source.asset_meta_required_object === requiredObject &&
    canonicalId.length > 0 &&
    expectedEntityId.length > 0 &&
    expectedAssetId.length > 0 &&
    expectedAssetIntentRef.length > 0 &&
    canonicalId === expectedEntityId &&
    typeof source.asset_id === 'string' &&
    source.asset_id === expectedAssetId &&
    typeof source.asset_intent_ref === 'string' &&
    source.asset_intent_ref === expectedAssetIntentRef &&
    typeof source.entity_id === 'string' &&
    source.entity_id === expectedEntityId &&
    source.expected_entity_id === expectedEntityId &&
    source.expected_asset_id === expectedAssetId &&
    source.expected_asset_intent_ref === expectedAssetIntentRef &&
    typeof source.material_slot === 'string' &&
    source.material_slot.length > 0 &&
    source.texture_key === textureKey &&
    expectedPath.every((entry, index) => path[index] === entry)
  );
}

function hasAssetRequiredObjectIdentityMismatch(object: Record<string, unknown>, requiredObject: string): boolean {
  const source = object.asset_required_object_binding_source;
  if (!isRecord(source)) {
    return false;
  }
  if (source.type !== 'asset_manifest_required_object') {
    return false;
  }

  const canonicalId = typeof object.canonical_id === 'string' ? object.canonical_id : '';
  const expectedEntityId = typeof object.expected_entity_id === 'string' ? object.expected_entity_id : '';
  const expectedAssetId = typeof object.expected_asset_id === 'string' ? object.expected_asset_id : '';
  const expectedAssetIntentRef = typeof object.expected_asset_intent_ref === 'string' ? object.expected_asset_intent_ref : '';
  if (canonicalId.length === 0 || expectedEntityId.length === 0 || expectedAssetId.length === 0 || expectedAssetIntentRef.length === 0) {
    return false;
  }

  return (
    object.asset_meta_required_object === requiredObject &&
    source.required_object === requiredObject &&
    source.asset_meta_required_object === requiredObject &&
    (canonicalId !== expectedEntityId ||
      source.entity_id !== expectedEntityId ||
      source.asset_id !== expectedAssetId ||
      source.asset_intent_ref !== expectedAssetIntentRef ||
      source.expected_entity_id !== expectedEntityId ||
      source.expected_asset_id !== expectedAssetId ||
      source.expected_asset_intent_ref !== expectedAssetIntentRef)
  );
}

function bossProjectileTextureKeyPasses(textureKey: string): boolean {
  return (
    textureKey.length > 0 &&
    textureKey.includes('boss') &&
    !textureKey.includes('enemy_bullet') &&
    !textureKey.includes('player_bullet')
  );
}

function hasManualVerticalSliceProjectionEvidence(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const productDuration = value.product_duration_sec;
  const windows = Array.isArray(value.windows) ? value.windows.filter(isRecord) : [];
  const waves = Array.isArray(value.waves) ? value.waves.filter(isRecord) : [];
  const boss = value.boss;
  const hasRequiredWindows = ['window_0_intro', 'window_1_weapon_wave_area', 'window_2_boss'].every((id) =>
    windows.some((window) => window.id === id && hasNumericRange(window.canonical_time_range_sec) && hasNumericRange(window.preview_x_range))
  );
  const hasWaveCoverage =
    waves.length >= 2 &&
    waves.every((wave) => {
      const trigger = wave.trigger;
      const enemyMix = Array.isArray(wave.enemy_mix) ? wave.enemy_mix.filter(isRecord) : [];
      const clearCondition = wave.clear_condition;
      return (
        typeof wave.id === 'string' &&
        typeof wave.segment_id === 'string' &&
        typeof wave.canonical_time_sec === 'number' &&
        typeof wave.preview_window === 'string' &&
        isRecord(trigger) &&
        trigger.type === 'camera_x' &&
        typeof trigger.x === 'number' &&
        enemyMix.length > 0 &&
        enemyMix.every((entry) => typeof entry.enemy_type === 'string' && typeof entry.count === 'number' && entry.count > 0) &&
        isRecord(clearCondition) &&
        typeof clearCondition.type === 'string' &&
        wave.visual_evidence_required === true &&
        wave.source === 'canonical_dsl'
      );
    });
  const enemyTypes = new Set(
    waves.flatMap((wave) => (Array.isArray(wave.enemy_mix) ? wave.enemy_mix : [])).filter(isRecord).map((entry) => entry.enemy_type).filter((type): type is string => typeof type === 'string')
  );

  return (
    value.projection_mode === 'manual_vertical_slice' &&
    value.source === 'canonical_dsl' &&
    isRecord(productDuration) &&
    productDuration.min === 480 &&
    productDuration.max === 720 &&
    value.preview_target_sec === 50 &&
    value.compression_is_preview_only === true &&
    typeof value.canonical_dsl_sha === 'string' &&
    typeof value.runtime_plan_sha === 'string' &&
    typeof value.scene_ir_sha === 'string' &&
    hasRequiredWindows &&
    hasWaveCoverage &&
    enemyTypes.size >= 3 &&
    isRecord(boss) &&
    typeof boss.id === 'string' &&
    boss.preview_window === 'window_2_boss' &&
    typeof boss.canonical_time_sec === 'number' &&
    Array.isArray(boss.phases) &&
    boss.phases.length >= 2 &&
    boss.telegraph_required === true &&
    boss.source === 'canonical_dsl'
  );
}

function hasManualTraversalEvidence(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const traversal = value.manual_traversal_evidence;
  if (!isRecord(traversal) || traversal.status !== 'PASSED') {
    return false;
  }

  const productDuration = traversal.product_duration_sec;
  const observedPreviewWindows = readStringArrayField(traversal, 'observed_preview_windows');
  const observedSegments = readStringArrayField(traversal, 'observed_segments');
  const observedWaveIds = readStringArrayField(traversal, 'observed_wave_ids');
  const clearedWaveIds = readStringArrayField(traversal, 'cleared_wave_ids');
  const observedContentTypes = readStringArrayField(traversal, 'observed_content_types');
  const observedVisualRoles = readStringArrayField(traversal, 'observed_visual_roles');
  const observedEnvironmentMotifs = readStringArrayField(traversal, 'observed_environment_motifs');
  const gate = traversal.manual_traversal_gate;
  const screenshots = Array.isArray(traversal.screenshots) ? traversal.screenshots.filter(isRecord) : [];
  const screenshotLabels = screenshots
    .map((screenshot) => (typeof screenshot.label === 'string' ? screenshot.label : undefined))
    .filter((label): label is string => label !== undefined);
  const waveClearOrProgressionUnlock =
    clearedWaveIds.length >= 1 ||
    (isRecord(gate) &&
      (gate.wave_clear_or_progression_unlock_by_input === true || gate.wave_clear_reachable_by_input === true)) ||
    (observedWaveIds.length >= 2 &&
      observedPreviewWindows.includes('window_1_weapon_wave_area') &&
      traversal.weapon_pickup_seen === true);
  const postFirstWaveProgressionSeen =
    traversal.post_first_wave_enemy_seen === true ||
    (observedWaveIds.length >= 2 && observedContentTypes.some((contentType) => contentType === 'enemy_wave' || contentType === 'flying_enemy'));

  return (
    traversal.evidence_source === 'playwright_keyboard_continuous_path' &&
    traversal.started_at_player_spawn === true &&
    traversal.capture_window_teleport_used === false &&
    traversal.scripted_capture_used_for_pass === false &&
    isRecord(productDuration) &&
    productDuration.min === 480 &&
    productDuration.max === 720 &&
    typeof traversal.preview_target_sec === 'number' &&
    traversal.preview_target_sec <= 50 &&
    ['window_0_intro', 'window_1_weapon_wave_area', 'window_2_boss'].every((windowId) => observedPreviewWindows.includes(windowId)) &&
    observedSegments.length >= 3 &&
    observedWaveIds.length >= 2 &&
    waveClearOrProgressionUnlock &&
    postFirstWaveProgressionSeen &&
    traversal.weapon_pickup_seen === true &&
    traversal.boss_seen === true &&
    traversal.boss_telegraph_seen === true &&
    traversal.boss_phase_seen === true &&
    typeof traversal.distinct_environment_visual_count === 'number' &&
    traversal.distinct_environment_visual_count >= 3 &&
    observedEnvironmentMotifs.length >= 3 &&
    STEP38_REQUIRED_VISUAL_ROLES.every((role) => observedVisualRoles.includes(role)) &&
    STEP38_REQUIRED_VERTICAL_SLICE_CONTENT.every((contentType) => observedContentTypes.includes(contentType)) &&
    traversal.placeholder_objects_seen === false &&
    traversal.canonical_dsl_visual_intent_runtime_bound === true &&
    isRecord(gate) &&
    gate.verdict === 'PASS' &&
    gate.starts_from_spawn === true &&
    gate.input_only === true &&
    gate.teleport_used === false &&
    gate.camera_jump_used === false &&
    gate.debug_reposition_used === false &&
    gate.state_injection_used === false &&
    gate.direct_spawn_used === false &&
    gate.scripted_capture_used_for_pass === false &&
    gate.wave2_reached_by_input === true &&
    gate.area2_reached_by_input === true &&
    gate.weapon_pickup_reached_by_input === true &&
    gate.boss_reached_by_input_or_scripted_reachable_after_input_path === true &&
    gate.boss_telegraph_seen_by_input === true &&
    gate.mission_complete_reached_by_input === true &&
    gate.boss_defeated_by_input === true &&
    gate.all_required_waves_resolved_before_win === true &&
    gate.all_required_regions_traversed_before_win === true &&
    gate.text_or_overlay_only_completion_evidence === false &&
    gate.early_mission_complete_detected === false &&
    gate.dsl_visual_objects_seen_by_input === true &&
    gate.large_empty_traversal_detected === false &&
    traversal.screenshots_are_input_only === true &&
    screenshots.length >= STEP38_REQUIRED_MANUAL_TRAVERSAL_SCREENSHOTS.length &&
    STEP38_REQUIRED_MANUAL_TRAVERSAL_SCREENSHOTS.every((label) => screenshotLabels.includes(label)) &&
    screenshots.every((screenshot) => {
      const canvasPixelProbe = screenshot.canvas_pixel_probe;
      return (
        screenshot.evidence_type === 'fresh_manual_traversal_input_only' &&
        screenshot.counts_for_ready_for_manual_test === true &&
        screenshot.fresh_manual_session === true &&
        screenshot.starts_from_spawn === true &&
        screenshot.input_only === true &&
        screenshot.teleport_used === false &&
        screenshot.camera_jump_used === false &&
        screenshot.debug_reposition_used === false &&
        screenshot.state_injection_used === false &&
        screenshot.direct_spawn_used === false &&
        screenshot.direct_phase_trigger_used === false &&
        typeof screenshot.screenshot === 'string' &&
        typeof screenshot.screenshot_path === 'string' &&
        typeof screenshot.screenshot_sha256 === 'string' &&
        typeof screenshot.metadata_path === 'string' &&
        Array.isArray(screenshot.visible_canonical_objects) &&
        screenshot.visible_canonical_objects.length > 0 &&
        Array.isArray(screenshot.required_roles_seen) &&
        screenshot.required_roles_seen.length > 0 &&
        screenshot.pixel_probe_passed === true &&
        screenshot.placeholder_objects_seen === false &&
        Array.isArray(screenshot.visible_materialized_assets) &&
        screenshot.visible_materialized_assets.length > 0 &&
        screenshot.source === 'canonical_dsl' &&
        isRecord(canvasPixelProbe) &&
        canvasPixelProbe.status === 'PASSED' &&
        typeof canvasPixelProbe.probed_runtime_object_count === 'number' &&
        canvasPixelProbe.probed_runtime_object_count > 0 &&
        typeof canvasPixelProbe.non_background_pixel_count === 'number' &&
        canvasPixelProbe.non_background_pixel_count > 0 &&
        manualTraversalScreenshotMeetsLabel(screenshot)
      );
    })
  );
}

function manualTraversalScreenshotMeetsLabel(screenshot: Record<string, unknown>): boolean {
  const label = typeof screenshot.label === 'string' ? screenshot.label : '';
  const contentTypes = new Set(readStringArrayField(screenshot, 'visible_content_types'));
  const runtimeRoles = new Set(readStringArrayField(screenshot, 'visible_runtime_roles'));
  const objectTypes = new Set(readStringArrayField(screenshot, 'visible_object_types'));
  const previewWindow = typeof screenshot.preview_window === 'string' ? screenshot.preview_window : null;
  const visibleMaterializedAssets = Array.isArray(screenshot.visible_materialized_assets)
    ? screenshot.visible_materialized_assets.filter(isRecord)
    : [];
  const hasVisibleBoundProjectile = visibleMaterializedAssets.some(
    (object) =>
      object.required_object === 'projectile' &&
      object.source === 'canonical_dsl' &&
      object.bound_to_runtime_object === true &&
      object.factory_used_texture_key === true &&
      object.visible === true &&
      object.placeholder === false &&
      object.label_only === false
  );
  const hasCompletePressureBand =
    (contentTypes.has('flying_enemy') || runtimeRoles.has('flying_enemy')) &&
    contentTypes.has('projectile') &&
    (objectTypes.has('enemy_projectile') ||
      objectTypes.has('boss_projectile') ||
      contentTypes.has('hazard') ||
      visibleMaterializedAssets.some(
        (object) => object.required_object === 'boss_projectile_phase_object' || object.required_object === 'environment_hazard'
      ));
  switch (label) {
    case '00_spawn_start':
      return contentTypes.has('player') && contentTypes.has('region_transition');
    case '01_wave1_reached_by_input':
      return contentTypes.has('enemy_wave') && (runtimeRoles.has('enemy_ground') || contentTypes.has('static_enemy'));
    case '02_projectile_visible_by_input':
      return screenshot.action === 'fire_weapon' && contentTypes.has('projectile') && hasVisibleBoundProjectile;
    case '02_pickup_and_area2_reached_by_input':
      return previewWindow === 'window_1_weapon_wave_area' && contentTypes.has('weapon_pickup') && contentTypes.has('region_transition');
    case '03_wave2_reached_by_input':
      return (
        (previewWindow === 'window_1_weapon_wave_area' || previewWindow === 'window_2_boss') &&
        contentTypes.has('enemy_wave') &&
        (contentTypes.has('flying_enemy') || runtimeRoles.has('flying_enemy'))
      );
    case '03b_mid_pressure_band':
      return hasCompletePressureBand;
    case '04_boss_telegraph_reached_by_input':
      return contentTypes.has('boss') && contentTypes.has('boss_telegraph');
    case '05_boss_phase_reached_by_input':
      return contentTypes.has('boss') && contentTypes.has('boss_phase') && objectTypes.has('boss_phase_2');
    case '06_exit_or_mission_complete_reached_by_input':
      return (
        objectTypes.has('mission_complete_overlay') &&
        screenshot.mission_complete_after_real_playthrough === true &&
        screenshot.boss_defeated_by_input === true &&
        screenshot.text_or_overlay_only_completion_evidence === false
      );
    default:
      return false;
  }
}

function hasPassingVisualSliceWindowEvidence(windowEvidence: Record<string, unknown>): boolean {
  const visibleRuntimeRoles = readStringArrayField(windowEvidence, 'visible_runtime_roles');
  const visibleContentTypes = readStringArrayField(windowEvidence, 'visible_content_types');
  const visibleCanonicalObjects = readStringArrayField(windowEvidence, 'visible_canonical_objects');
  const projectionMustShow = readStringArrayField(windowEvidence, 'projection_must_show');
  const requiredRolesSeen = readStringArrayField(windowEvidence, 'required_roles_seen');
  const canvasPixelProbe = windowEvidence.canvas_pixel_probe;
  return (
    typeof windowEvidence.label === 'string' &&
    typeof windowEvidence.screenshot === 'string' &&
    typeof windowEvidence.screenshot_path === 'string' &&
    typeof windowEvidence.screenshot_sha256 === 'string' &&
    typeof windowEvidence.metadata_path === 'string' &&
    typeof windowEvidence.camera_x === 'number' &&
    typeof windowEvidence.preview_window === 'string' &&
    hasNumericRange(windowEvidence.canonical_time_range_sec) &&
    projectionMustShow.length > 0 &&
    visibleCanonicalObjects.length > 0 &&
    requiredRolesSeen.length > 0 &&
    windowEvidence.pixel_probe_passed === true &&
    windowEvidence.placeholder_objects_seen === false &&
    visibleRuntimeRoles.length > 0 &&
    visibleContentTypes.length > 0 &&
    isRecord(canvasPixelProbe) &&
    canvasPixelProbe.status === 'PASSED' &&
    typeof canvasPixelProbe.probed_runtime_object_count === 'number' &&
    canvasPixelProbe.probed_runtime_object_count > 0 &&
    typeof canvasPixelProbe.non_background_pixel_count === 'number' &&
    canvasPixelProbe.non_background_pixel_count > 0
  );
}

function hasNumericRange(value: unknown): boolean {
  return Array.isArray(value) && value.length === 2 && value.every((entry) => typeof entry === 'number');
}

function hasPlayableDurationEvidence(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const durationEvidence = value.playable_duration_support;
  if (!isRecord(durationEvidence) || durationEvidence.status !== 'PASSED') {
    return false;
  }

  const supportedRange = durationEvidence.supported_range_sec;
  const normalEstimate = durationEvidence.normal_mode_estimated_sec;
  if (!isRecord(supportedRange) || !isRecord(normalEstimate)) {
    return false;
  }

  return (
    supportedRange.min === 480 &&
    supportedRange.max === 720 &&
    typeof normalEstimate.target === 'number' &&
    normalEstimate.target >= 480 &&
    normalEstimate.target <= 720 &&
    durationEvidence.qa_acceleration_used === true
  );
}

function evaluateEncounterCoverageEvidence(value: unknown): Step38EncounterCoverageRuntimeEvaluation {
  const expectedRunId = isRecord(value) && typeof value.run_id === 'string' && value.run_id.length > 0 ? value.run_id : null;
  const encounterCoverage = isRecord(value) ? value.encounter_coverage : undefined;
  return evaluateStep38EncounterCoverageRuntimeEvidence(encounterCoverage, expectedRunId);
}

function hasEnemyBehaviorEvidence(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const enemyBehavior = value.enemy_behavior_evidence;
  if (!isRecord(enemyBehavior)) {
    return false;
  }

  const eventRecords = readObservedEventRecords(value);
  const hasEventWithSource = (event: string, source: string) =>
    eventRecords.some((record) => record.event === event && record.source === source);
  const behaviorCapabilityIds = new Set(
    eventRecords.flatMap((record) =>
      Array.isArray(record.behaviorCapabilityIds)
        ? record.behaviorCapabilityIds.filter((id): id is string => typeof id === 'string' && id.startsWith('enemy.'))
        : []
    )
  );
  const realizedCapabilityCount =
    typeof enemyBehavior.realized_enemy_behavior_capability_count === 'number'
      ? Math.max(enemyBehavior.realized_enemy_behavior_capability_count, behaviorCapabilityIds.size)
      : behaviorCapabilityIds.size;
  const projectileHitCount =
    typeof enemyBehavior.player_damage_from_enemy_projectile_count === 'number'
      ? Math.max(
          enemyBehavior.player_damage_from_enemy_projectile_count,
          eventRecords.filter((record) => record.event === 'enemy.projectile.hit_player' && record.source === 'runtime_enemy_projectile').length
        )
      : eventRecords.filter((record) => record.event === 'enemy.projectile.hit_player' && record.source === 'runtime_enemy_projectile').length;

  return (
    typeof enemyBehavior.required_enemy_behavior_capability_count === 'number' &&
    typeof enemyBehavior.moving_enemy_entity_count === 'number' &&
    typeof enemyBehavior.enemy_movement_event_count === 'number' &&
    typeof enemyBehavior.attacking_enemy_entity_count === 'number' &&
    typeof enemyBehavior.enemy_fire_event_count === 'number' &&
    typeof enemyBehavior.enemy_projectile_spawn_count === 'number' &&
    typeof enemyBehavior.player_damage_from_enemy_projectile_count === 'number' &&
    typeof enemyBehavior.boss_attack_event_count === 'number' &&
    enemyBehavior.required_enemy_behavior_capability_count >= 3 &&
    realizedCapabilityCount >= enemyBehavior.required_enemy_behavior_capability_count &&
    enemyBehavior.moving_enemy_entity_count >= 2 &&
    enemyBehavior.enemy_movement_event_count >= 2 &&
    enemyBehavior.attacking_enemy_entity_count >= 2 &&
    enemyBehavior.enemy_fire_event_count >= 2 &&
    enemyBehavior.enemy_projectile_spawn_count >= 2 &&
    projectileHitCount >= 1 &&
    enemyBehavior.boss_attack_event_count >= 1 &&
    hasEventWithSource('enemy.moved', 'runtime_enemy_ai') &&
    hasEventWithSource('enemy.fired', 'runtime_enemy_ai') &&
    hasEventWithSource('enemy.projectile.spawned', 'runtime_enemy_projectile') &&
    hasEventWithSource('enemy.projectile.hit_player', 'runtime_enemy_projectile') &&
    hasEventWithSource('boss.attack.fired', 'runtime_boss_ai')
  );
}

function hasBehaviorConfigEvidence(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const behaviorConfig = value.behavior_config_evidence;
  if (!isRecord(behaviorConfig) || behaviorConfig.status !== 'PASSED') {
    return false;
  }

  const requiredIds = behaviorConfig.required_behavior_config_ids;
  const consumedIds = behaviorConfig.consumed_behavior_config_ids;
  const requiredCapabilityIds = behaviorConfig.required_behavior_capability_ids;
  const consumedCapabilityIds = behaviorConfig.consumed_behavior_capability_ids;
  if (!Array.isArray(requiredIds) || !Array.isArray(consumedIds) || !Array.isArray(requiredCapabilityIds) || !Array.isArray(consumedCapabilityIds)) {
    return false;
  }

  const consumed = new Set(consumedIds.filter((id): id is string => typeof id === 'string'));
  const consumedCapabilities = new Set(consumedCapabilityIds.filter((id): id is string => typeof id === 'string'));
  const eventRecords = readObservedEventRecords(value);
  const hasBehaviorCapabilityId = (record: Record<string, unknown>, capabilityId: string) =>
    Array.isArray(record.behaviorCapabilityIds) && record.behaviorCapabilityIds.some((id) => id === capabilityId);
  const requires = (capabilityId: string) => requiredCapabilityIds.includes(capabilityId);

  return (
    requiredIds.every((id) => typeof id === 'string' && consumed.has(id)) &&
    requiredCapabilityIds.every((id) => typeof id === 'string' && consumedCapabilities.has(id)) &&
    behaviorConfig.fixed_turret_fire_consumed === true &&
    behaviorConfig.patrol_counterfire_consumed === true &&
    behaviorConfig.flying_strafe_fire_consumed === true &&
    behaviorConfig.boss_attack_pattern_consumed === true &&
    behaviorConfig.boss_falling_hazard_consumed === true &&
    (!requires('enemy.fixed_turret.v1') ||
      eventRecords.some(
        (record) =>
          record.event === 'enemy.fired' &&
          record.enemy === 'fixed_turret' &&
          typeof record.projectileCount === 'number' &&
          record.projectileCount >= 1 &&
          hasBehaviorCapabilityId(record, 'enemy.fixed_turret.v1')
      )) &&
    (!requires('enemy.patrol_infantry.v1') ||
      (eventRecords.some(
        (record) =>
          record.event === 'enemy.moved' &&
          record.enemy === 'patrol_infantry' &&
          hasBehaviorCapabilityId(record, 'enemy.patrol_infantry.v1')
      ) &&
        eventRecords.some(
          (record) =>
            record.event === 'enemy.fired' &&
            record.enemy === 'patrol_infantry' &&
            hasBehaviorCapabilityId(record, 'enemy.patrol_infantry.v1')
        ))) &&
    (!requires('enemy.flying_right_entry.v1') ||
      (eventRecords.some(
        (record) =>
          record.event === 'enemy.moved' &&
          record.enemy === 'flying_enemy' &&
          typeof record.movePattern === 'string' &&
          hasBehaviorCapabilityId(record, 'enemy.flying_right_entry.v1')
      ) &&
        eventRecords.some(
          (record) =>
            record.event === 'enemy.fired' &&
            record.enemy === 'flying_enemy' &&
            hasBehaviorCapabilityId(record, 'enemy.flying_right_entry.v1')
        ))) &&
    (!requires('enemy.boss_attack_pattern.v1') ||
      (eventRecords.some(
        (record) =>
          record.event === 'boss.attack.fired' &&
          typeof record.projectileCount === 'number' &&
          record.projectileCount >= 1 &&
          hasBehaviorCapabilityId(record, 'enemy.boss_attack_pattern.v1')
      ) &&
        eventRecords.some(
          (record) =>
            record.event === 'boss.attack.fired' &&
            record.phase === 2 &&
            hasBehaviorCapabilityId(record, 'enemy.boss_attack_pattern.v1') &&
            (record.attackPattern === 'three_way_projectile' ||
              record.fallingHazard === true ||
              (typeof record.projectileCount === 'number' && record.projectileCount >= 3))
        ))) &&
    (!requires('hazard.falling_area.v1') ||
      eventRecords.some(
        (record) =>
          record.event === 'boss.falling_hazard.spawned' &&
          (hasBehaviorCapabilityId(record, 'hazard.falling_area.v1') ||
            hasBehaviorCapabilityId(record, 'enemy.boss_attack_pattern.v1'))
      ))
  );
}

function hasCanonicalDslVisualIntent(value: unknown): boolean {
  if (!isRecord(value) || !hasCapabilityRef(value, 'scene.visual_presentation_metadata.v1')) {
    return false;
  }

  const scenes = Array.isArray(value.scenes) ? value.scenes.filter(isRecord) : [];
  const hasSceneVisualTheme = scenes.some((scene) => {
    const config = scene.config;
    if (!isRecord(config)) {
      return false;
    }
    const visualTheme = config.visual_theme ?? config.visualTheme;
    return typeof visualTheme === 'string' && visualTheme.trim().length > 0;
  });
  const visualRoles = readCanonicalVisualIntentRoles(value);

  return (
    hasSceneVisualTheme &&
    visualRoles.length >= STEP38_REQUIRED_VISUAL_ROLES.length &&
    STEP38_REQUIRED_VISUAL_ROLES.every((role) => visualRoles.includes(role))
  );
}

function hasSceneIrVisualIntent(value: unknown): boolean {
  if (!isRecord(value) || !hasNodeKind(value, ['visual_intent_manifest'])) {
    return false;
  }

  const visualIntent = value.visualIntent;
  if (!isRecord(visualIntent)) {
    return false;
  }

  const requiredRoles = readStringArrayFromKeys(visualIntent, ['requiredVisualRoles', 'required_visual_roles']);
  const missingRoles = readStringArrayFromKeys(visualIntent, ['missingVisualRoles', 'missing_visual_roles']);
  const canonicalVisualIntentCount = readNumberFromKeys(visualIntent, ['canonicalVisualIntentCount', 'canonical_visual_intent_count']);
  const sceneVisualTheme = visualIntent.sceneVisualTheme ?? visualIntent.scene_visual_theme;

  return (
    visualIntent.source === 'canonical_dsl_visual_intent' &&
    typeof sceneVisualTheme === 'string' &&
    canonicalVisualIntentCount >= STEP38_REQUIRED_VISUAL_ROLES.length &&
    countSceneIrVisualAssetIntentRefs(value) >= STEP38_REQUIRED_VISUAL_ROLES.length &&
    missingRoles.length === 0 &&
    STEP38_REQUIRED_VISUAL_ROLES.every((role) => requiredRoles.includes(role))
  );
}

function readCanonicalVisualIntentRoles(value: Record<string, unknown>): string[] {
  const entities = Array.isArray(value.entities) ? value.entities.filter(isRecord) : [];
  return uniqueSorted(entities
    .map((entity) => {
      const config = entity.config;
      const visual = isRecord(config) && isRecord(config.visual) ? config.visual : undefined;
      if (visual === undefined) {
        return undefined;
      }
      const palette = visual.palette;
      const role = visual.role;
      const assetIntentRef = visual.asset_intent_ref ?? visual.assetIntentRef;
      const silhouette = visual.silhouette;
      const hasPalette =
        isRecord(palette) &&
        typeof palette.primary === 'string' &&
        typeof palette.accent === 'string' &&
        typeof palette.outline === 'string';
      return typeof role === 'string' && typeof assetIntentRef === 'string' && typeof silhouette === 'string' && hasPalette
        ? normalizeCanonicalVisualRole(entity, role)
        : undefined;
    })
    .filter((role): role is string => role !== undefined));
}

function normalizeCanonicalVisualRole(entity: Record<string, unknown>, originalRole: string): string | undefined {
  if ((STEP38_REQUIRED_VISUAL_ROLES as readonly string[]).includes(originalRole)) {
    return originalRole;
  }

  const rawRole = originalRole.toLowerCase();
  const entityRole = typeof entity.role === 'string' ? entity.role.toLowerCase() : '';
  const entityId = typeof entity.id === 'string' ? entity.id.toLowerCase() : '';
  const capabilityIds = readStringArrayField(entity, 'capability_ids');
  const hasCapability = (capabilityId: string) => capabilityIds.includes(capabilityId);
  const hasCapabilityPrefix = (prefix: string) => capabilityIds.some((capabilityId) => capabilityId.startsWith(prefix));

  if (entityRole === 'player' || rawRole.includes('player') || rawRole.includes('main_character') || entityId === 'player') return 'player';
  if (entityRole === 'boss' || hasCapabilityPrefix('enemy.boss_') || rawRole.includes('boss') || rawRole.includes('mecha')) return 'boss';
  if (entityRole === 'pickup' || hasCapabilityPrefix('pickup.') || rawRole.includes('pickup') || rawRole.includes('supply')) return 'pickup';
  if (entityRole === 'projectile' || entityId.includes('projectile') || rawRole.includes('projectile') || rawRole.includes('bullet')) return 'projectile';
  if (entityRole === 'hazard' || hasCapabilityPrefix('hazard.') || rawRole.includes('hazard') || rawRole.includes('zone') || rawRole.includes('marker')) return 'hazard';
  if (hasCapability('enemy.flying_right_entry.v1') || rawRole.includes('flying') || rawRole.includes('flyer') || rawRole.includes('aerial') || rawRole.includes('drone')) return 'flying_enemy';
  if (hasCapability('enemy.fixed_turret.v1') || rawRole.includes('turret') || rawRole.includes('static') || rawRole.includes('defense')) return 'enemy_static';
  if (entityRole === 'enemy' || hasCapabilityPrefix('enemy.') || rawRole.includes('enemy') || rawRole.includes('soldier') || rawRole.includes('infantry')) return 'enemy_ground';

  return undefined;
}

function countSceneIrVisualAssetIntentRefs(value: unknown): number {
  if (!isRecord(value) || !Array.isArray(value.nodes)) {
    return 0;
  }
  return value.nodes.filter(isRecord).filter((node) => typeof node.visualAssetIntentRef === 'string' && node.visualAssetIntentRef.length > 0).length;
}

function readStringArrayField(record: Record<string, unknown>, key: string): string[] {
  return readStringArrayFromKeys(record, [key]);
}

function readStringArrayFromKeys(record: Record<string, unknown>, keys: readonly string[]): string[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
  }
  return [];
}

function readNumberFromKeys(record: Record<string, unknown>, keys: readonly string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number') {
      return value;
    }
  }
  return 0;
}

function readObservedEvents(value: unknown): string[] {
  if (!isRecord(value) || !Array.isArray(value.observed_events)) {
    return [];
  }
  return value.observed_events.filter((event): event is string => typeof event === 'string');
}

function readObservedEventRecords(value: unknown): Record<string, unknown>[] {
  if (!isRecord(value) || !Array.isArray(value.event_records)) {
    return [];
  }
  return value.event_records.filter(isRecord);
}

function hasEventWithSource(records: readonly Record<string, unknown>[], eventName: string, source: string): boolean {
  return records.some((record) => record.event === eventName && record.source === source);
}

function hasRange480720(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(hasRange480720);
  }
  if (!isRecord(value)) {
    return false;
  }

  if (matchesRange480720(value)) {
    return true;
  }

  return Object.values(value).some(hasRange480720);
}

function hasThreeProgressionSegments(value: unknown): boolean {
  return findArraysByKey(value, 'segments').some((segments) => segments.length >= 3);
}

function findArraysByKey(value: unknown, key: string): unknown[][] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => findArraysByKey(item, key));
  }
  if (!isRecord(value)) {
    return [];
  }
  return Object.entries(value).flatMap(([entryKey, entryValue]) => [
    ...(entryKey === key && Array.isArray(entryValue) ? [entryValue] : []),
    ...findArraysByKey(entryValue, key)
  ]);
}

function hasForbiddenIpTerm(value: unknown): boolean {
  return ['contra', '魂斗罗', 'mario', 'sonic', 'megaman'].some((term) => objectContainsStringValue(value, term));
}

function alwaysFalse(): boolean {
  return false;
}

function alwaysRuntimeFalse(): boolean {
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function matchesRange480720(value: Record<string, unknown>): boolean {
  const min = firstNumber(value, ['min_sec', 'minSec', 'min_seconds', 'minSeconds', 'min']);
  const max = firstNumber(value, ['max_sec', 'maxSec', 'max_seconds', 'maxSeconds', 'max']);

  return min === 480 && max === 720;
}

function firstNumber(value: Record<string, unknown>, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'number') {
      return candidate;
    }
  }
  return undefined;
}

function hasCapabilityRef(value: unknown, capabilityId: string): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => hasCapabilityRef(item, capabilityId));
  }
  if (!isRecord(value)) {
    return false;
  }

  const listKeys = ['capability_ids', 'capabilityIds', 'capability_refs', 'capabilityRefs'];
  for (const key of listKeys) {
    const candidate = value[key];
    if (Array.isArray(candidate) && candidate.some((item) => item === capabilityId)) {
      return true;
    }
  }

  if (value.capabilityId === capabilityId || value.capability_id === capabilityId) {
    return true;
  }

  return Object.values(value).some((entry) => hasCapabilityRef(entry, capabilityId));
}

function hasFieldValue(value: unknown, keys: readonly string[], expectedValues: readonly string[]): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => hasFieldValue(item, keys, expectedValues));
  }
  if (!isRecord(value)) {
    return false;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && expectedValues.includes(candidate)) {
      return true;
    }
  }

  return Object.values(value).some((entry) => hasFieldValue(entry, keys, expectedValues));
}

function hasAnyKey(value: unknown, keys: readonly string[]): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => hasAnyKey(item, keys));
  }
  if (!isRecord(value)) {
    return false;
  }

  if (keys.some((key) => Object.prototype.hasOwnProperty.call(value, key))) {
    return true;
  }

  return Object.values(value).some((entry) => hasAnyKey(entry, keys));
}

function hasArrayKey(value: unknown, keys: readonly string[]): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => hasArrayKey(item, keys));
  }
  if (!isRecord(value)) {
    return false;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (Array.isArray(candidate) && candidate.length > 0) {
      return true;
    }
  }

  return Object.values(value).some((entry) => hasArrayKey(entry, keys));
}

function hasNumericField(value: unknown, keys: readonly string[]): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => hasNumericField(item, keys));
  }
  if (!isRecord(value)) {
    return false;
  }

  for (const key of keys) {
    if (typeof value[key] === 'number') {
      return true;
    }
  }

  return Object.values(value).some((entry) => hasNumericField(entry, keys));
}

function hasRole(value: unknown, role: string): boolean {
  return hasFieldValue(value, ['role'], [role]);
}

function hasProfileValue(value: unknown, expectedValues: readonly string[]): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => hasProfileValue(item, expectedValues));
  }
  if (!isRecord(value)) {
    return false;
  }

  const profile = value.profile;
  if (isRecord(profile)) {
    const id = profile.id;
    if (typeof id === 'string' && expectedValues.includes(id)) {
      return true;
    }
  }

  return Object.values(value).some((entry) => hasProfileValue(entry, expectedValues));
}

function hasNodeKind(value: unknown, kinds: readonly string[]): boolean {
  return hasFieldValue(value, ['kind', 'nodeKind', 'node_kind'], kinds);
}

function hasObjectiveKind(value: unknown, kinds: readonly string[]): boolean {
  return hasFieldValue(value, ['kind', 'objectiveKind', 'objective_kind'], kinds) || hasStringArrayValue(value, ['objectiveIds', 'objective_ids'], kinds);
}

function hasStringArrayValue(value: unknown, keys: readonly string[], expectedValues: readonly string[]): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => hasStringArrayValue(item, keys, expectedValues));
  }
  if (!isRecord(value)) {
    return false;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (Array.isArray(candidate) && candidate.some((item) => typeof item === 'string' && expectedValues.includes(item))) {
      return true;
    }
  }

  return Object.values(value).some((entry) => hasStringArrayValue(entry, keys, expectedValues));
}

function objectContainsStringValue(value: unknown, needle: string): boolean {
  if (!isRecord(value) && !Array.isArray(value)) {
    return false;
  }
  return containsStringValue(value, needle.toLowerCase());
}

function containsStringValue(value: unknown, normalizedNeedle: string): boolean {
  if (typeof value === 'string') {
    return value.toLowerCase().includes(normalizedNeedle);
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsStringValue(item, normalizedNeedle));
  }
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).some((entry) => containsStringValue(entry, normalizedNeedle));
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}
