import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  STEP38_BASELINE_COMMIT,
  STEP38_EXPECTED_PROMPT_SHA256,
  STEP38_EXPECTED_PROVIDER_MODEL,
  evaluateStep38DslConsumption,
  resolveStep38SmokeMode
} from '../../scripts/step38-deepseek-dsl-consumption.js';
import { evaluateStep38FullGameExpansionEvidence } from '../../scripts/step38-full-game-expansion-gate.js';
import { buildStep38MainJs, buildStep38SpriteAssets } from '../../scripts/run-step38-deepseek-dsl-smoke.js';
import {
  buildStep38AssetTemplateFingerprintReport,
  buildStep38RoleStaticTemplateProbeCanvasSha,
  buildStep38VisualDesignRealizationReport
} from '../../scripts/step38-visual-asset-materializer.js';

const STEP38_TEST_REQUIRED_VISUAL_ROLES = ['player', 'enemy_ground', 'enemy_static', 'flying_enemy', 'pickup', 'projectile', 'hazard', 'boss'] as const;
const STEP38_TEST_REQUIRED_VISUAL_RUNTIME_OBJECTS = [
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
const STEP38_TEST_REQUIRED_MANUAL_TRAVERSAL_SCREENSHOTS = [
  '00_spawn_start',
  '01_wave1_reached_by_input',
  '02_projectile_visible_by_input',
  '02_pickup_and_area2_reached_by_input',
  '03_wave2_reached_by_input',
  '04_boss_telegraph_reached_by_input',
  '05_boss_phase_reached_by_input',
  '06_exit_or_mission_complete_reached_by_input'
] as const;
const STEP38_TEST_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS = [
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

function readStep38RunnerSource(): string {
  return readFileSync(new URL('../../scripts/run-step38-deepseek-dsl-smoke.ts', import.meta.url), 'utf8');
}

describe('Step38 DeepSeek DSL consumption gate', () => {
  it('skips real smoke without recording API success when the env flag is disabled', () => {
    expect(resolveStep38SmokeMode({}, { apiKey: 'present', defaultModel: STEP38_EXPECTED_PROVIDER_MODEL })).toMatchObject({
      mode: 'skipped',
      realApiSuccess: false,
      blockers: ['RUN_DEEPSEEK_API_SMOKE_NOT_ENABLED']
    });
  });

  it('fails clearly when real smoke is enabled without a DeepSeek API key', () => {
    expect(resolveStep38SmokeMode({ RUN_DEEPSEEK_API_SMOKE: '1' }, { defaultModel: STEP38_EXPECTED_PROVIDER_MODEL })).toMatchObject({
      mode: 'blocked',
      realApiSuccess: false,
      blockers: ['DEEPSEEK_API_KEY_MISSING']
    });
  });

  it('passes only when required capabilities are represented through the canonical runtime chain', () => {
    const result = evaluateStep38DslConsumption({
      baselineCommit: STEP38_BASELINE_COMMIT,
      promptSha256: STEP38_EXPECTED_PROMPT_SHA256,
      modelName: STEP38_EXPECTED_PROVIDER_MODEL,
      realDeepSeekPathExecuted: true,
      dslConsumerPathUsed: true,
      rawGameDslResponsePresent: true,
      generatedArtifactRunSpecific: true,
      buildSucceeded: true,
      previewBooted: true,
      guardFlags: {
        fallback_used: false,
        preloaded_artifact_used: false,
        legacy_fixed_template_authority: false,
        stale_generated_artifact_used: false
      },
      artifacts: {
        canonicalDsl: {
          profile: { id: 'DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1' },
          play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 },
          game: { genre: 'side_scrolling_run_and_gun' },
          capability_ids: [
            'movement.run_jump.v1',
            'movement.crouch.v1',
            'combat.projectile.v1',
            'weapon.spread_shot.v1',
            'spawn.enemy_wave.v1',
            'scene.ordered_segments.v1',
            'scene.visual_presentation_metadata.v1',
            'enemy.boss_lifecycle.v1',
            'health.player_health_points.v1',
            'ui.hud_player_health.v1',
            'ui.win_failure_transitions.v1'
          ],
          scenes: [{ id: 'main_scene', config: { visual_theme: 'original_16bit_jungle_metal_core' } }],
          progression: { estimated_total_sec: { min_sec: 480, max_sec: 720 }, segments: [{ id: 'approach' }, { id: 'bridge' }, { id: 'core' }] },
          waves: [{ id: 'wave_approach' }],
          pickups: [{ id: 'spread_pickup' }],
          bosses: [{ id: 'boss_core', phases: [{ id: 'phase_1' }, { id: 'phase_2' }] }],
          objectives: [{ kind: 'boss_defeated' }, { kind: 'reach_exit' }],
          entities: buildStep38VisualEntities(),
          metadata: { title: '赤焰突围', tags: ['original_no_existing_ip'] }
        },
        runtimePlan: {
          profileId: 'side_scrolling_run_and_gun',
          progression: { estimatedTotalSec: { min: 480, max: 720 }, segments: [{ id: 'approach' }, { id: 'bridge' }, { id: 'core' }] },
          player: { health: 3, lives: 2 },
          gameplay: { waveIds: ['wave_approach'], pickupIds: ['spread_pickup'], bossIds: ['boss_core'], objectiveIds: ['boss_defeated'] },
          runtimeSystems: [
            { capabilityId: 'movement.run_jump.v1' },
            { capabilityId: 'movement.crouch.v1' },
            { capabilityId: 'combat.projectile.v1' },
            { capabilityId: 'spawn.enemy_wave.v1' },
            { capabilityId: 'scene.visual_presentation_metadata.v1' },
            { capabilityId: 'health.player_health_points.v1' },
            { capabilityId: 'enemy.boss_lifecycle.v1' },
            { capabilityId: 'ui.win_failure_transitions.v1' }
          ]
        },
        sceneIr: {
          visualIntent: {
            source: 'canonical_dsl_visual_intent',
            sceneVisualTheme: 'original_16bit_jungle_metal_core',
            requiredVisualRoles: STEP38_TEST_REQUIRED_VISUAL_ROLES,
            missingVisualRoles: [],
            canonicalVisualIntentCount: 8
          },
          nodes: [
            { kind: 'visual_intent_manifest' },
            { kind: 'player_spawn', visualAssetIntentRef: 'player_red_runner' },
            { kind: 'enemy_spawn', visualAssetIntentRef: 'enemy_patrol_red' },
            { kind: 'enemy_spawn', visualAssetIntentRef: 'enemy_flying_wing' },
            { kind: 'enemy_spawn', visualAssetIntentRef: 'enemy_fixed_turret' },
            { kind: 'pickup', visualAssetIntentRef: 'weapon_supply_green_orb' },
            { kind: 'projectile', visualAssetIntentRef: 'projectile_flare' },
            { kind: 'hazard', visualAssetIntentRef: 'hazard_warning_triangle' },
            { kind: 'boss', visualAssetIntentRef: 'boss_molten_core_guard' },
            { kind: 'goal' }
          ],
          provenance: { source: 'canonical_game_dsl_v0.2_runtime_plan' }
        },
        runtimeManifest: {
          systems: [
            { capabilityId: 'movement.run_jump.v1' },
            { capabilityId: 'movement.crouch.v1' },
            { capabilityId: 'combat.projectile.v1' },
            { capabilityId: 'spawn.enemy_wave.v1' },
            { capabilityId: 'scene.visual_presentation_metadata.v1' },
            { capabilityId: 'health.player_health_points.v1' },
            { capabilityId: 'enemy.boss_lifecycle.v1' },
            { capabilityId: 'ui.win_failure_transitions.v1' }
          ]
        },
        qaReport: buildInteractiveQaReport(['enemy.cleared']),
        manualVerticalSliceProjection: buildManualVerticalSliceProjection(),
        visualRuntimeBindingReport: buildVisualRuntimeBindingReport(),
        visualAssetMaterializationReport: buildVisualAssetMaterializationReport(),
        assetTemplateFingerprintReport: buildAssetTemplateFingerprintReport(),
        visualDesignRealizationReport: buildVisualDesignRealizationReport(),
        runtimeTextureLoadReport: buildRuntimeTextureLoadReport(),
        artDirectionQualityReport: buildArtDirectionQualityReport(),
        encounterDirectorPlan: buildEncounterDirectorPlan(),
        encounterDirectorRuntimeEvidence: buildEncounterDirectorRuntimeEvidence(),
        outcomeStateMachineReport: buildOutcomeStateMachineReport(),
        winPathEvidence: buildWinPathEvidence(),
        losePathEvidence: buildLosePathEvidence(),
        successRouteMilestoneTimeline: buildSuccessRouteMilestoneTimeline(),
        routePressureBandEvidence: buildRoutePressureBandEvidence(),
        realPlaythroughCompletionEvidence: buildRealPlaythroughCompletionEvidence(),
        twoDGameplayPlaythroughGate: buildTwoDGameplayPlaythroughGate(),
        canvasVisualReadabilityGate: buildCanvasVisualReadabilityGate(),
        proceduralPixelArtGrammarReport: buildProceduralPixelArtGrammarReport(),
        canvasArtFidelityGate: buildCanvasArtFidelityGate(),
        spriteAnimationCoverageReport: buildSpriteAnimationCoverageReport(),
        environmentLayeringReport: buildEnvironmentLayeringReport(),
        startupSurvivabilityGate: buildStartupSurvivabilityGate(),
        encounterPlayabilityGate: buildEncounterPlayabilityGate(),
        operatorVisibleArtGate: buildOperatorVisibleArtGate(),
        visualPlaythroughValidatorReport: buildVisualPlaythroughValidatorReport(),
        telemetryEvents: [
          'game.ready',
          'game.started',
          'scene.visual_presentation_metadata.verified',
          'player.moved',
          'player.fired',
          'enemy.hit',
          'player.dead',
          'game.over',
          'mission.complete',
          'game.lost',
          'game.won'
        ],
        dslConsumptionReport: { entries: [], summary: { unsupportedCount: 0, deferredCount: 0, ignoredAuthoritativeCount: 0 } }
      }
    });

    expect(result.readyState, JSON.stringify(result.blockers)).toBe('READY_FOR_MANUAL_TEST');
    expect(result.unsupported_required_capabilities).toEqual([]);
    expect(result.ignored_required_dsl_fields).toEqual([]);
  });

  it('keeps entity-specific material bindings when canonical entities share an assetIntentRef', () => {
    const assets = buildStep38SpriteAssets(buildSharedAssetIntentDsl());
    const sharedIntentAssets = assets.filter((asset) => asset.assetIntentRef === 'original_16bit_pixel_art');
    const assetsByEntity = new Map(sharedIntentAssets.map((asset) => [asset.entityId, asset]));
    const textureKeys = new Set(sharedIntentAssets.map((asset) => asset.textureKey));

    expect([...assetsByEntity.keys()]).toEqual(
      expect.arrayContaining([
        'player',
        'patrol_infantry',
        'fixed_turret',
        'flying_enemy',
        'player_projectile',
        'rapid_fire_pickup',
        'falling_area_hazard',
        'molten_core_guard'
      ])
    );
    expect(textureKeys.size).toBe(sharedIntentAssets.length);
    for (const asset of sharedIntentAssets) {
      expect(asset.textureKey).toContain(asset.requiredObject.replace(/-/g, '_'));
      expect(asset.textureKey).toContain(asset.entityId.replace(/-/g, '_'));
      expect(asset.requiredObject).toBeTruthy();
    }
    expect(assetsByEntity.get('player')?.textureKey).not.toBe(assetsByEntity.get('patrol_infantry')?.textureKey);
    expect(assetsByEntity.get('patrol_infantry')?.requiredObject).toBe('ground_enemy');
    expect(assetsByEntity.get('fixed_turret')?.requiredObject).toBe('ranged_enemy');
    expect(assetsByEntity.get('flying_enemy')?.requiredObject).toBe('flying_enemy');
    expect(assetsByEntity.get('player_projectile')?.requiredObject).toBe('projectile');
    expect(assetsByEntity.get('rapid_fire_pickup')?.requiredObject).toBe('pickup_weapon');
    expect(assetsByEntity.get('falling_area_hazard')?.requiredObject).toBe('environment_hazard');
    expect(assetsByEntity.get('molten_core_guard')?.requiredObject).toBe('boss');
  });

  it('materializes visual assets from DSL intent rather than role-only static templates', () => {
    const jungleAssets = buildStep38SpriteAssets(buildCounterfactualVisualIntentDsl('jungle_metal_core'));
    const iceAssets = buildStep38SpriteAssets(buildCounterfactualVisualIntentDsl('ice_neon_temple'));
    const requiredObjects = ['player', 'ground_enemy', 'ranged_enemy', 'flying_enemy', 'boss', 'projectile', 'environment_hazard'];

    for (const requiredObject of requiredObjects) {
      const jungleAsset = jungleAssets.find((asset) => asset.requiredObject === requiredObject) as Record<string, unknown> | undefined;
      const iceAsset = iceAssets.find((asset) => asset.requiredObject === requiredObject) as Record<string, unknown> | undefined;

      expect(jungleAsset, requiredObject).toBeDefined();
      expect(iceAsset, requiredObject).toBeDefined();
      expect(jungleAsset?.visual_intent_sha).toMatch(/^[a-f0-9]{64}$/);
      expect(jungleAsset?.asset_design_spec_sha).toMatch(/^[a-f0-9]{64}$/);
      expect(jungleAsset?.role_static_svg_template_used).toBe(false);
      expect(jungleAsset?.old_svgForVisualIntent_used).toBe(false);
      expect(jungleAsset?.template_derived_placeholder).toBe(false);
      expect(jungleAsset?.geometry_signature).toEqual(expect.any(String));
      expect(jungleAsset?.motif_coverage).toEqual(expect.arrayContaining(['jungle', 'metal', 'industrial_core']));
      const drawPlan = jungleAsset?.canvas_draw_plan as Record<string, unknown> | undefined;
      const drawOperations = Array.isArray(drawPlan?.draw_operations)
        ? drawPlan.draw_operations.filter(
            (operation): operation is Record<string, unknown> =>
              operation !== null && typeof operation === 'object' && !Array.isArray(operation)
          )
        : [];
      expect(drawPlan?.renderer_kind).toBe('canvas_texture');
      expect(drawPlan?.source).toBe('canonical_dsl');
      expect(drawPlan?.debug_geometry_dominant).toBe(false);
      expect(drawPlan?.role_static_template_used).toBe(false);
      expect(drawOperations.length).toBeGreaterThan(0);
      expect(drawOperations.every((operation) => typeof operation.purpose === 'string' && typeof operation.source_motif === 'string')).toBe(true);
      const grammar = drawPlan?.procedural_pixel_art_grammar as Record<string, unknown> | undefined;
      const animationFrames = Array.isArray(drawPlan?.animation_frames) ? drawPlan.animation_frames.filter(Boolean) : [];
      const frameHashes = new Set(
        animationFrames
          .map((frame) => (typeof frame === 'object' && frame !== null && !Array.isArray(frame) ? (frame as Record<string, unknown>).frame_hash : null))
          .filter((hash): hash is string => typeof hash === 'string')
      );
      expect(grammar?.version, requiredObject).toBe('step38.procedural_pixel_art_grammar.v1');
      expect(grammar?.active_visual_asset_backend, requiredObject).toBe('procedural_canvas_v1');
      expect(grammar?.future_visual_asset_backend, requiredObject).toBe('image_provider_v1');
      expect(grammar?.image_provider_v1_enabled, requiredObject).toBe(false);
      expect(grammar?.old_environment_resource_logic_used, requiredObject).toBe(false);
      expect(grammar?.target_fidelity, requiredObject).toBe('procedural_pixel_art_readable_v1');
      expect(grammar?.pixel_grid_rendering, requiredObject).toBe(true);
      expect(grammar?.role_only_generation_used, requiredObject).toBe(false);
      expect(grammar?.debug_geometry_dominant, requiredObject).toBe(false);
      expect(animationFrames.length, requiredObject).toBeGreaterThanOrEqual(requiredObject === 'player' || requiredObject === 'boss' ? 4 : 2);
      expect(frameHashes.size, requiredObject).toBeGreaterThan(1);
      expect(iceAsset?.motif_coverage).toEqual(expect.arrayContaining(['ice', 'neon', 'cyber_temple']));
      expect(jungleAsset?.asset_design_spec_sha).not.toBe(iceAsset?.asset_design_spec_sha);
      expect(jungleAsset?.geometry_signature).not.toBe(iceAsset?.geometry_signature);
      expect(jungleAsset?.svg).not.toBe(iceAsset?.svg);
    }
    const playerPlan = jungleAssets.find((asset) => asset.requiredObject === 'player')?.canvas_draw_plan;
    const playerPurposes = (playerPlan?.draw_operations ?? []).map((operation) => operation.purpose);
    expect(playerPurposes).toEqual(expect.arrayContaining([
      expect.stringContaining('head'),
      expect.stringContaining('body'),
      expect.stringContaining('leg'),
      expect.stringContaining('weapon')
    ]));
  });

  it('binds the generated runtime to the procedural pixel-art grammar instead of the old vector primitive renderer', () => {
    const mainJs = buildStep38MainJs();

    expect(mainJs).toContain('drawProceduralPixelArtFrame');
    expect(mainJs).toContain('drawProceduralCanvasEnvironment');
    expect(mainJs).toContain("plan.procedural_pixel_art_grammar");
    expect(mainJs).toContain("version === 'step38.procedural_pixel_art_grammar.v1'");
    expect(mainJs).toContain('ctx.imageSmoothingEnabled = false');
    expect(mainJs).toContain('old_resource_logic_bypassed');
    expect(mainJs).toContain("active_visual_asset_backend: 'procedural_canvas_v1'");
    expect(mainJs).toContain("image_provider_v1_enabled: false");
    expect(mainJs).toContain("old_environment_resource_logic_used: false");
    expect(mainJs).not.toContain('function drawEnvironmentMotif');
    expect(mainJs).not.toContain('ctx.arc(x + 10, 185, 54');
  });

  it('detects role-only static template geometry even when asset metadata self-reports non-placeholder', () => {
    const playerAsset = buildStep38SpriteAssets(buildCounterfactualVisualIntentDsl('jungle_metal_core')).find(
      (asset) => asset.requiredObject === 'player'
    );
    expect(playerAsset).toBeDefined();

    const report = buildStep38AssetTemplateFingerprintReport('run_step38_role_static_guard', [
      {
        ...playerAsset!,
        rendered_canvas_pixel_sha: buildStep38RoleStaticTemplateProbeCanvasSha('player'),
        role_static_svg_template_used: false,
        old_svgForVisualIntent_used: false,
        template_derived_placeholder: false,
        role_only_generation_detected: false,
        matches_known_static_template: false,
        placeholder: false
      }
    ]);

    expect(report.role_static_svg_template_used).toBe(false);
    expect(report.template_derived_placeholder_detected).toBe(true);
    expect(report.template_similarity_blockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ required_object: 'player' })])
    );
    const [assetReport] = report.assets as Array<Record<string, unknown>>;
    expect(assetReport.matches_known_static_template).toBe(true);
    expect(assetReport.role_only_generation_detected).toBe(true);
    expect(assetReport.placeholder).toBe(true);
  });

  it('fails visual design realization when asset palette metadata is not reflected in materialized SVG', () => {
    const assets = buildStep38SpriteAssets(buildCounterfactualVisualIntentDsl('jungle_metal_core'));
    const paletteDriftAssets = assets.map((asset) =>
      asset.requiredObject === 'player'
        ? {
            ...asset,
            palette: { primary: '#010203', accent: '#040506', outline: '#070809' }
          }
        : asset
    );

    const report = buildStep38VisualDesignRealizationReport({
      runId: 'run_step38_palette_drift_guard',
      assets: paletteDriftAssets
    });
    const gate = report.visual_design_realization_gate as Record<string, unknown>;

    expect(gate.visual_intent_affects_palette).toBe(false);
    expect(gate.verdict).toBe('FAIL');
    expect(gate.operator_visible_art_ready).toBe(false);
  });

  it('uses canonical runtime entity ids as asset intent refs for synthesized runtime-only visual objects', () => {
    const assets = buildStep38SpriteAssets(buildCounterfactualVisualIntentDsl('jungle_metal_core'));
    const runtimeOnlyRequiredObjects = ['default_weapon', 'wave_marker', 'area_marker', 'boss_telegraph', 'boss_projectile_phase_object'];

    for (const requiredObject of runtimeOnlyRequiredObjects) {
      const asset = assets.find((candidate) => candidate.requiredObject === requiredObject);

      expect(asset, requiredObject).toBeDefined();
      expect(asset?.assetIntentRef, requiredObject).toBe(asset?.entityId);
    }
  });

  it('materializes visual assets without crashing when generated visual entities omit capability_ids', () => {
    const dsl = buildCounterfactualVisualIntentDsl('jungle_metal_core');
    for (const entity of dsl.entities) {
      delete (entity as Record<string, unknown>).capability_ids;
    }

    const assets = buildStep38SpriteAssets(dsl);

    expect(assets.some((asset) => asset.requiredObject === 'player')).toBe(true);
    expect(assets.some((asset) => asset.requiredObject === 'boss')).toBe(true);
    expect(assets.every((asset) => Array.isArray(asset.asset_design_spec.theme))).toBe(true);
  });

  it('blocks readiness when visual template fingerprint and design realization reports are missing', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    delete (input.artifacts as Record<string, unknown>).assetTemplateFingerprintReport;
    delete (input.artifacts as Record<string, unknown>).visualDesignRealizationReport;
    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toEqual(
      expect.arrayContaining(['asset_template_fingerprint_report_missing', 'visual_design_realization_report_missing'])
    );
  });

  it('blocks readiness when the generated 2D gameplay playthrough gate is missing', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    delete (input.artifacts as Record<string, unknown>).twoDGameplayPlaythroughGate;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('two_d_gameplay_playthrough_gate_missing');
  });

  it('does not treat Mission Complete as a complete generated 2D gameplay loop without the Game Over path', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    (input.artifacts as Record<string, unknown>).twoDGameplayPlaythroughGate = buildTwoDGameplayPlaythroughGate({
      game_over_visible: false,
      game_over_reached_by_play: false,
      player_damage_observed_for_game_over: false,
      health_zero_or_retries_exhausted_by_play: false
    });

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('two_d_gameplay_playthrough_gate_failed');
  });

  it('blocks readiness when canvas visual readability evidence is missing', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    delete (input.artifacts as Record<string, unknown>).canvasVisualReadabilityGate;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('canvas_visual_readability_gate_missing');
  });

  it('blocks canvas visual readability when screenshots do not support materialized canvas art claims', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    (input.artifacts as Record<string, unknown>).canvasVisualReadabilityGate = buildCanvasVisualReadabilityGate({
      verdict: 'FAIL',
      screenshots_support_claims: false,
      debug_geometry_dominant: true
    });

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('canvas_visual_readability_gate_failed');
  });

  it('blocks canvas visual readability when the active backend is not procedural_canvas_v1', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    (input.artifacts as Record<string, unknown>).canvasVisualReadabilityGate = buildCanvasVisualReadabilityGate({
      active_visual_asset_backend: 'image_provider_v1',
      current_backend: 'image_provider_v1',
      image_provider_v1_enabled: true,
      backend_policy_ok: false
    });

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('canvas_visual_readability_gate_failed');
  });

  it('blocks readiness when procedural pixel-art grammar evidence is missing', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    delete (input.artifacts as Record<string, unknown>).proceduralPixelArtGrammarReport;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('procedural_pixel_art_grammar_report_missing');
  });

  it('blocks procedural pixel-art grammar when role-only geometry or identical animation frames are reported', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    (input.artifacts as Record<string, unknown>).proceduralPixelArtGrammarReport = buildProceduralPixelArtGrammarReport({
      verdict: 'BLOCKED',
      role_only_generation_used: true,
      debug_geometry_dominant: true,
      object_classes_visibly_distinct: false,
      identical_frame_failure: true
    });

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('procedural_pixel_art_grammar_gate_failed');
  });

  it('blocks procedural pixel-art grammar when old environment resource logic is still active', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    (input.artifacts as Record<string, unknown>).proceduralPixelArtGrammarReport = buildProceduralPixelArtGrammarReport({
      old_environment_resource_logic_used: true
    });

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('procedural_pixel_art_grammar_gate_failed');
  });

  it('blocks final visual design evidence when the report drops backend policy fields', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    const report = buildVisualDesignRealizationReport();
    delete (report as Record<string, unknown>).active_visual_asset_backend;
    const gate = report.visual_design_realization_gate as Record<string, unknown>;
    delete gate.active_visual_asset_backend;
    (input.artifacts as Record<string, unknown>).visualDesignRealizationReport = report;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('visual_design_report_dropped_backend_policy');
  });

  it('blocks final operator-visible gate when only a runtime snapshot exists without fresh manual input-only source', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    const runtimeSnapshotPolicy = {
      source: 'runtime_operator_visible_snapshot',
      screenshot_source: 'runtime_operator_visible_snapshot',
      capture_mode: 'runtime_snapshot',
      input_policy: 'not_verified',
      runtime_operator_snapshot_only: true
    };
    (input.artifacts as Record<string, unknown>).operatorVisibleArtGate = buildOperatorVisibleArtGate(runtimeSnapshotPolicy, runtimeSnapshotPolicy);

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('operator_gate_screenshot_not_manual_input_only');
  });

  it('blocks final operator-visible gate when screenshot evidence is stale', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    const staleEvidence = { stale_evidence: true };
    (input.artifacts as Record<string, unknown>).operatorVisibleArtGate = buildOperatorVisibleArtGate(staleEvidence, staleEvidence);

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('operator_gate_screenshot_not_manual_input_only');
  });

  it('blocks final operator-visible gate when backend policy selects the future image provider', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    const imageProviderPolicy = {
      active_visual_asset_backend: 'image_provider_v1',
      current_backend: 'image_provider_v1',
      image_provider_v1_enabled: true
    };
    (input.artifacts as Record<string, unknown>).operatorVisibleArtGate = buildOperatorVisibleArtGate(imageProviderPolicy, imageProviderPolicy);

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('operator_gate_backend_policy_mismatch');
  });

  it('blocks readiness when canvas art fidelity or animation coverage gates are missing', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    delete (input.artifacts as Record<string, unknown>).canvasArtFidelityGate;
    delete (input.artifacts as Record<string, unknown>).spriteAnimationCoverageReport;
    delete (input.artifacts as Record<string, unknown>).environmentLayeringReport;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        'canvas_art_fidelity_gate_missing',
        'sprite_animation_coverage_report_missing',
        'environment_layering_report_missing'
      ])
    );
  });

  it('blocks readiness when the fresh session starts in Game Over', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    (input.artifacts as Record<string, unknown>).startupSurvivabilityGate = buildStartupSurvivabilityGate({
      verdict: 'FAIL',
      fresh_session_starts_alive: false,
      health_at_spawn: 0,
      health_at_spawn_gt_zero: false,
      game_over_at_spawn: true,
      spawn_immediate_lethal_pressure: true
    });

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('startup_survivability_gate_failed');
  });

  it('blocks readiness when encounter density removes the player reaction window', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    (input.artifacts as Record<string, unknown>).encounterPlayabilityGate = buildEncounterPlayabilityGate({
      verdict: 'FAIL',
      spawn_safe_window_sec: 1.4,
      overcrowded_spawn_detected: true,
      enemy_density_within_camera_limit: false,
      player_has_reaction_space: false
    });

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('encounter_playability_gate_failed');
  });

  it('does not accept a lose path that reaches Game Over at spawn', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    (input.artifacts as Record<string, unknown>).losePathEvidence = buildLosePathEvidence({
      game_over_at_spawn: true
    });

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('lose_path_evidence_missing');
  });

  it('blocks role-static SVG templates even when assets are run-scoped and texture-bound', () => {
    const qaReport = buildInteractiveQaReport();
    const input = buildReadyEvaluationInput(qaReport);
    (input.artifacts as Record<string, unknown>).assetTemplateFingerprintReport = buildAssetTemplateFingerprintReport({
      role_static_svg_template_used: true,
      old_svgForVisualIntent_used: true,
      template_derived_placeholder_detected: true
    });
    (input.artifacts as Record<string, unknown>).visualDesignRealizationReport = buildVisualDesignRealizationReport({
      role_static_templates_used: true,
      old_svgForVisualIntent_used: true,
      template_derived_placeholder_detected: true
    });

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        'old_svgForVisualIntent_used',
        'role_static_svg_template_used',
        'template_derived_placeholder_asset',
        'bound_texture_is_template_placeholder'
      ])
    );
  });

  it('reports palette realization drift as visual intent ignored instead of missing realization report', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    (input.artifacts as Record<string, unknown>).visualDesignRealizationReport = buildVisualDesignRealizationReport({
      visual_intent_affects_palette: false,
      operator_visible_art_ready: false,
      verdict: 'FAIL'
    });

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('visual_intent_ignored_by_asset_generator');
    expect(result.blockers).not.toContain('visual_design_realization_report_missing');
  });

  it('fails closed when enemy movement and counterfire evidence is missing', () => {
    const qaReport = buildInteractiveQaReport();
    delete qaReport.enemy_behavior_evidence;

    const result = evaluateStep38DslConsumption({
      baselineCommit: STEP38_BASELINE_COMMIT,
      promptSha256: STEP38_EXPECTED_PROMPT_SHA256,
      modelName: STEP38_EXPECTED_PROVIDER_MODEL,
      realDeepSeekPathExecuted: true,
      dslConsumerPathUsed: true,
      rawGameDslResponsePresent: true,
      generatedArtifactRunSpecific: true,
      buildSucceeded: true,
      previewBooted: true,
      guardFlags: {
        fallback_used: false,
        preloaded_artifact_used: false,
        legacy_fixed_template_authority: false,
        stale_generated_artifact_used: false
      },
      artifacts: {
        canonicalDsl: {
          profile: { id: 'side_scrolling_run_and_gun.v1' },
          play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 },
          game: { genre: 'side_scrolling_run_and_gun' },
          capability_ids: [
            'movement.run_jump.v1',
            'movement.crouch.v1',
            'combat.projectile.v1',
            'weapon.spread_shot.v1',
            'spawn.enemy_wave.v1',
            'scene.ordered_segments.v1',
            'enemy.boss_lifecycle.v1',
            'enemy.boss_attack_pattern.v1',
            'health.player_health_points.v1',
            'ui.hud_player_health.v1',
            'ui.win_failure_transitions.v1'
          ],
          progression: { estimated_total_sec: { min_sec: 480, max_sec: 720 }, segments: [{ id: 'jungle_entrance' }, { id: 'metal_bridge' }, { id: 'enemy_core' }] },
          waves: [{ id: 'wave_jungle_patrol' }, { id: 'wave_bridge_flyers' }, { id: 'wave_core_one' }, { id: 'wave_core_two' }],
          pickups: [{ id: 'spread_pickup' }],
          bosses: [{ id: 'boss_core', phases: [{ id: 'phase_1' }, { id: 'phase_2' }] }],
          objectives: [{ kind: 'boss_defeated' }],
          entities: [
            { role: 'player' },
            { role: 'enemy', capability_ids: ['combat.projectile.v1', 'enemy.patrol_infantry.v1'] },
            { role: 'enemy', capability_ids: ['combat.projectile.v1', 'enemy.flying_right_entry.v1'] },
            { role: 'boss', capability_ids: ['enemy.boss_attack_pattern.v1'] },
            { role: 'pickup' }
          ],
          metadata: { title: '赤焰突围', tags: ['original_no_existing_ip'] }
        },
        runtimePlan: {
          profileId: 'side_scrolling_run_and_gun.v1',
          progression: { estimatedTotalSec: { min: 480, max: 720 }, segments: [{ id: 'jungle_entrance' }, { id: 'metal_bridge' }, { id: 'enemy_core' }] },
          gameplay: { waveIds: ['wave_jungle_patrol', 'wave_bridge_flyers', 'wave_core_one', 'wave_core_two'], pickupIds: ['spread_pickup'], bossIds: ['boss_core'], objectiveIds: ['boss_defeated'] },
          runtimeSystems: [
            { capabilityId: 'movement.run_jump.v1' },
            { capabilityId: 'movement.crouch.v1' },
            { capabilityId: 'combat.projectile.v1' },
            { capabilityId: 'spawn.enemy_wave.v1' },
            { capabilityId: 'health.player_health_points.v1' },
            { capabilityId: 'enemy.boss_lifecycle.v1' },
            { capabilityId: 'enemy.boss_attack_pattern.v1' },
            { capabilityId: 'ui.win_failure_transitions.v1' }
          ]
        },
        sceneIr: {
          source: 'canonical_game_dsl_v0.2_runtime_plan',
          nodes: [
            { kind: 'player_spawn' },
            { kind: 'enemy_spawn', entityId: 'patrol_infantry', capability_ids: ['combat.projectile.v1', 'enemy.patrol_infantry.v1'] },
            { kind: 'enemy_spawn', entityId: 'flying_enemy', capability_ids: ['combat.projectile.v1', 'enemy.flying_right_entry.v1'] },
            { kind: 'boss', entityId: 'boss_core', capability_ids: ['enemy.boss_attack_pattern.v1'] },
            { kind: 'pickup' },
            { kind: 'goal' }
          ]
        },
        runtimeManifest: {
          runtimeFamily: 'phaser_2d_action_arcade.v1',
          systems: [
            { capabilityId: 'movement.run_jump.v1' },
            { capabilityId: 'movement.crouch.v1' },
            { capabilityId: 'combat.projectile.v1' },
            { capabilityId: 'spawn.enemy_wave.v1' },
            { capabilityId: 'health.player_health_points.v1' },
            { capabilityId: 'enemy.boss_lifecycle.v1' },
            { capabilityId: 'enemy.boss_attack_pattern.v1' },
            { capabilityId: 'ui.win_failure_transitions.v1' }
          ]
        },
        qaReport,
        telemetryEvents: ['game.ready', 'game.started', 'player.moved', 'player.fired', 'enemy.hit', 'game.won'],
        dslConsumptionReport: { entries: [], summary: { unsupportedCount: 0, deferredCount: 0, ignoredAuthoritativeCount: 0 } }
      }
    });

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('enemy_behavior_evidence_missing');
  });

  it('fails closed when concrete behavior config consumption evidence is missing', () => {
    const qaReport = buildInteractiveQaReport();
    delete qaReport.behavior_config_evidence;

    const result = evaluateStep38DslConsumption(buildReadyEvaluationInput(qaReport));

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('behavior_config_evidence_missing');
  });

  it('fails closed when sprites are loaded but not bound to canonical DSL visual intent', () => {
    const qaReport = buildInteractiveQaReport();
    qaReport.visual_asset_evidence = {
      status: 'PASSED',
      renderer: 'runtime_2d_generated_assets',
      renderer_is_implementation_detail: true,
      placeholder_rectangles_present: false,
      sprite_asset_count: 8
    };

    const result = evaluateStep38DslConsumption(buildReadyEvaluationInput(qaReport));

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('visual_asset_evidence_missing');
    expect(result.unsupported_required_capabilities).toContain('dsl_driven_visual_intent');
  });

  it('fails closed when Game Over is an event name but not a proven runtime state', () => {
    const qaReport = buildInteractiveQaReport();
    const losePathEvidence = buildLosePathEvidence();
    losePathEvidence.lose_path_gate = {
      ...(losePathEvidence.lose_path_gate as Record<string, unknown>),
      verdict: 'FAIL',
      game_over_overlay_visible: false,
      game_over_overlay_persistent: false
    };
    qaReport.lose_path_evidence = losePathEvidence;
    const input = buildReadyEvaluationInput(qaReport);
    input.artifacts.losePathEvidence = losePathEvidence;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('lose_path_evidence_missing');
    expect(result.blockers).not.toContain('interactive_runtime_evidence_missing');
  });

  it('fails closed when enemy counts pass but browser canvas visual slice evidence is missing', () => {
    const qaReport = buildInteractiveQaReport();
    delete qaReport.visual_vertical_slice_evidence;

    const result = evaluateStep38DslConsumption(buildReadyEvaluationInput(qaReport));

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('visual_vertical_slice_evidence_missing');
  });

  it('fails closed when DSL visual intent is loaded but not bound to runtime render objects', () => {
    const qaReport = buildInteractiveQaReport();
    qaReport.visual_vertical_slice_evidence = {
      status: 'PASSED',
      evidence_source: 'browser_canvas_pixel_probe',
      run_id: 'run_step38_test',
      screenshot_count: 4,
      marker_run_id_matches: true,
      canonical_dsl_visual_intent_runtime_bound: false,
      observed_runtime_roles: ['player', 'enemy_ground', 'pickup'],
      missing_runtime_roles: ['enemy_static', 'flying_enemy', 'projectile', 'hazard', 'boss'],
      windows: []
    };

    const result = evaluateStep38DslConsumption(buildReadyEvaluationInput(qaReport));

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('visual_vertical_slice_evidence_missing');
    expect(result.unsupported_required_capabilities).toContain('dsl_driven_visual_intent');
  });

  it('fails closed when visual runtime binding report is missing', () => {
    const qaReport = buildInteractiveQaReport();
    delete qaReport.visual_runtime_binding_report;
    const input = buildReadyEvaluationInput(qaReport);
    delete input.artifacts.visualRuntimeBindingReport;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('visual_runtime_binding_report_missing');
    expect(result.unsupported_required_capabilities).toContain('dsl_driven_visual_intent');
  });

  it('fails closed when a required visual runtime object remains a placeholder or is not visible in fresh traversal', () => {
    const visualRuntimeBindingReport = buildVisualRuntimeBindingReport({
      boss: {
        placeholder: true,
        bound_to_runtime_object: false,
        visible_in_fresh_manual_traversal: false,
        evidence_screenshots: []
      }
    });
    const qaReport = buildInteractiveQaReport();
    qaReport.visual_runtime_binding_report = visualRuntimeBindingReport;
    const input = buildReadyEvaluationInput(qaReport);
    input.artifacts.visualRuntimeBindingReport = visualRuntimeBindingReport;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('visual_runtime_binding_report_missing');
    expect(result.unsupported_required_capabilities).toContain('dsl_driven_visual_intent');
  });

  it('fails closed when a required visual runtime object uses a generic generated silhouette', () => {
    const visualRuntimeBindingReport = buildVisualRuntimeBindingReport({
      boss_projectile_phase_object: {
        silhouette: 'runtime_generated_shape',
        texture_key: 'missing:boss_projectile_phase_object'
      }
    });
    const qaReport = buildInteractiveQaReport();
    qaReport.visual_runtime_binding_report = visualRuntimeBindingReport;
    const input = buildReadyEvaluationInput(qaReport);
    input.artifacts.visualRuntimeBindingReport = visualRuntimeBindingReport;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('visual_runtime_binding_report_missing');
    expect(result.unsupported_required_capabilities).toContain('dsl_driven_visual_intent');
  });

  it('fails closed when projectile is not proven by the dedicated input-only fire screenshot', () => {
    const visualRuntimeBindingReport = buildVisualRuntimeBindingReport({
      projectile: {
        evidence_screenshots: ['00_spawn_start']
      }
    });
    const visualAssetMaterializationReport = buildVisualAssetMaterializationReport({
      projectile: {
        evidence_screenshots: ['00_spawn_start']
      }
    });
    const qaReport = buildInteractiveQaReport();
    qaReport.visual_runtime_binding_report = visualRuntimeBindingReport;
    qaReport.visual_asset_materialization_report = visualAssetMaterializationReport;
    const input = buildReadyEvaluationInput(qaReport);
    input.artifacts.visualRuntimeBindingReport = visualRuntimeBindingReport;
    input.artifacts.visualAssetMaterializationReport = visualAssetMaterializationReport;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toEqual(
      expect.arrayContaining(['visual_runtime_binding_report_missing', 'visual_asset_materialization_report_missing'])
    );
    expect(result.unsupported_required_capabilities).toContain('dsl_driven_visual_intent');
  });

  it('fails closed when boss projectile reuses generic projectile asset metadata or texture', () => {
    const visualRuntimeBindingReport = buildVisualRuntimeBindingReport({
      boss_projectile_phase_object: {
        asset_meta_required_object: 'projectile',
        texture_key: 'step38_original_pixel_art_enemy_bullet'
      }
    });
    const visualAssetMaterializationReport = buildVisualAssetMaterializationReport({
      boss_projectile_phase_object: {
        asset_meta_required_object: 'projectile',
        texture_key: 'step38_original_pixel_art_enemy_bullet'
      }
    });
    const runtimeTextureLoadReport = buildRuntimeTextureLoadReport({
      boss_projectile_phase_object: {
        texture_key: 'step38_original_pixel_art_enemy_bullet'
      }
    });
    const qaReport = buildInteractiveQaReport();
    qaReport.visual_runtime_binding_report = visualRuntimeBindingReport;
    qaReport.visual_asset_materialization_report = visualAssetMaterializationReport;
    qaReport.runtime_texture_load_report = runtimeTextureLoadReport;
    const input = buildReadyEvaluationInput(qaReport);
    input.artifacts.visualRuntimeBindingReport = visualRuntimeBindingReport;
    input.artifacts.visualAssetMaterializationReport = visualAssetMaterializationReport;
    input.artifacts.runtimeTextureLoadReport = runtimeTextureLoadReport;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        'visual_runtime_binding_report_missing',
        'visual_asset_materialization_asset_required_object_binding_mismatch',
        'runtime_texture_load_report_missing'
      ])
    );
    expect(result.unsupported_required_capabilities).toContain('dsl_driven_visual_intent');
  });

  it('fails closed when visual asset materialization report is missing', () => {
    const qaReport = buildInteractiveQaReport();
    delete qaReport.visual_asset_materialization_report;
    const input = buildReadyEvaluationInput(qaReport);
    delete input.artifacts.visualAssetMaterializationReport;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('visual_asset_materialization_report_missing');
    expect(result.unsupported_required_capabilities).toContain('dsl_driven_visual_intent');
  });

  it('fails closed when materialized art drops the asset required object binding', () => {
    const visualAssetMaterializationReport = buildVisualAssetMaterializationReport({
      player: {
        asset_meta_required_object: undefined
      }
    });
    const qaReport = buildInteractiveQaReport();
    qaReport.visual_asset_materialization_report = visualAssetMaterializationReport;
    const input = buildReadyEvaluationInput(qaReport);
    input.artifacts.visualAssetMaterializationReport = visualAssetMaterializationReport;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('visual_asset_materialization_asset_required_object_binding_missing');
    expect(result.blockers).not.toContain('runtime_texture_load_report_missing');
    expect(result.blockers).not.toContain('canonical_dsl_missing');
    expect(result.unsupported_required_capabilities).toContain('dsl_driven_visual_intent');
  });

  it.each([
    ['missing source', { asset_required_object_binding_source: undefined }],
    ['missing path', { asset_required_object_binding_path: [] }],
    ['invalid flag', { asset_required_object_binding_valid: false }],
    [
      'fallback source',
      {
        asset_required_object_binding_source: {
          type: 'fallback_default',
          manifest_path: 'assets[].requiredObject',
          asset_id: 'canonical_player',
          asset_intent_ref: 'player_asset_intent',
          entity_id: 'canonical_player',
          material_slot: 'player',
          required_object: 'player',
          asset_meta_required_object: 'player',
          texture_key: 'player_texture_key'
        }
      }
    ]
  ])('fails closed when materialized art binding has %s', (_name, playerOverride) => {
    const visualAssetMaterializationReport = buildVisualAssetMaterializationReport({
      player: playerOverride
    });
    const qaReport = buildInteractiveQaReport();
    qaReport.visual_asset_materialization_report = visualAssetMaterializationReport;
    const input = buildReadyEvaluationInput(qaReport);
    input.artifacts.visualAssetMaterializationReport = visualAssetMaterializationReport;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('visual_asset_materialization_asset_required_object_binding_invalid');
    expect(result.blockers).not.toContain('runtime_texture_load_report_missing');
  });

  it('fails closed when materialized art binds the right required object to the wrong canonical entity', () => {
    const visualAssetMaterializationReport = buildVisualAssetMaterializationReport({
      pickup_weapon: {
        canonical_id: 'rapid_fire_pickup',
        expected_entity_id: 'rapid_fire_pickup',
        expected_asset_id: 'rapid_fire_pickup',
        expected_asset_intent_ref: 'original_16bit_pixel_art_rapid_fire_pickup',
        asset_required_object_binding_source: {
          type: 'asset_manifest_required_object',
          manifest_path: 'assets[].requiredObject',
          asset_id: 'spread_shot_pickup',
          asset_intent_ref: 'original_16bit_pixel_art_spread_shot_pickup',
          entity_id: 'spread_shot_pickup',
          material_slot: 'pickup_weapon',
          required_object: 'pickup_weapon',
          asset_meta_required_object: 'pickup_weapon',
          texture_key: 'pickup_weapon_texture_key'
        }
      }
    });
    const qaReport = buildInteractiveQaReport();
    qaReport.visual_asset_materialization_report = visualAssetMaterializationReport;
    const input = buildReadyEvaluationInput(qaReport);
    input.artifacts.visualAssetMaterializationReport = visualAssetMaterializationReport;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('visual_asset_materialization_asset_identity_binding_mismatch');
    expect(result.blockers).not.toContain('runtime_texture_load_report_missing');
  });

  it('fails closed when production vertical slice loses fresh lose path evidence', () => {
    const qaReport = buildInteractiveQaReport();
    delete qaReport.lose_path_evidence;
    const input = buildReadyEvaluationInput(qaReport);
    delete input.artifacts.losePathEvidence;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('lose_path_evidence_missing');
    expect(result.blockers).not.toContain('interactive_runtime_evidence_missing');
    expect(result.blockers).not.toContain('win_path_evidence_missing');
  });

  it('fails closed when materialized art is label-only or not runtime-loaded', () => {
    const visualAssetMaterializationReport = buildVisualAssetMaterializationReport({
      player: {
        label_only: true,
        materialized: false,
        loaded_in_runtime: false,
        texture_cache_present: false,
        evidence_screenshots: []
      }
    });
    const runtimeTextureLoadReport = buildRuntimeTextureLoadReport({
      player: {
        loaded_in_runtime: false,
        texture_cache_present: false
      }
    });
    const qaReport = buildInteractiveQaReport();
    qaReport.visual_asset_materialization_report = visualAssetMaterializationReport;
    qaReport.runtime_texture_load_report = runtimeTextureLoadReport;
    const input = buildReadyEvaluationInput(qaReport);
    input.artifacts.visualAssetMaterializationReport = visualAssetMaterializationReport;
    input.artifacts.runtimeTextureLoadReport = runtimeTextureLoadReport;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toEqual(
      expect.arrayContaining(['visual_asset_materialization_report_missing', 'runtime_texture_load_report_missing'])
    );
    expect(result.unsupported_required_capabilities).toContain('dsl_driven_visual_intent');
  });

  it('fails closed when the materialization report drops DSL-driven visual asset fields from runtime objects', () => {
    const visualAssetMaterializationReport = buildVisualAssetMaterializationReport({
      player: {
        visual_intent_sha: undefined,
        asset_design_spec_sha: undefined,
        motif_coverage: [],
        geometry_signature: undefined,
        template_fingerprint: undefined
      }
    });
    const qaReport = buildInteractiveQaReport();
    qaReport.visual_asset_materialization_report = visualAssetMaterializationReport;
    const input = buildReadyEvaluationInput(qaReport);
    input.artifacts.visualAssetMaterializationReport = visualAssetMaterializationReport;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('visual_asset_materialization_report_missing');
    expect(result.blockers).not.toContain('runtime_texture_load_report_missing');
    expect(result.blockers).not.toContain('canonical_dsl_missing');
    expect(result.unsupported_required_capabilities).toContain('dsl_driven_visual_intent');
  });

  it('fails closed when the manual vertical slice projection manifest is missing', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    delete input.artifacts.manualVerticalSliceProjection;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('manual_vertical_slice_projection_missing');
  });

  it('fails closed when visual slice screenshots lack window metadata', () => {
    const qaReport = buildInteractiveQaReport();
    const visualSlice = qaReport.visual_vertical_slice_evidence as Record<string, unknown>;
    visualSlice.windows = [
      buildVisualSliceWindow('04_wave_2_or_area_2_visible', ['player', 'flying_enemy'], ['player', 'flying_enemy'])
    ];
    visualSlice.screenshot_count = 1;
    visualSlice.canvas_pixel_probe_count = 1;

    const result = evaluateStep38DslConsumption(buildReadyEvaluationInput(qaReport));

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('visual_vertical_slice_evidence_missing');
  });

  it('fails closed when browser evidence only proves scripted capture windows without a continuous manual traversal path', () => {
    const qaReport = buildInteractiveQaReport();
    delete qaReport.manual_traversal_evidence;

    const result = evaluateStep38DslConsumption(buildReadyEvaluationInput(qaReport));

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('manual_traversal_evidence_missing');
  });

  it('fails closed when movement and firing are observed separately but moving-fire is not proven', () => {
    const qaReport = buildInteractiveQaReport();
    const playableState = qaReport.playable_state as Record<string, unknown>;
    const manualTraversal = qaReport.manual_traversal_evidence as Record<string, unknown>;
    const manualGate = manualTraversal.manual_traversal_gate as Record<string, unknown>;
    const eventRecords = qaReport.event_records as Array<Record<string, unknown>>;
    playableState.movingFireObserved = false;
    manualTraversal.moving_fire_seen_by_input = false;
    manualGate.moving_fire_seen_by_input = false;
    for (const record of eventRecords) {
      if (record.event === 'player.fired') {
        delete record.moving;
        delete record.moving_fire;
      }
    }

    const result = evaluateStep38DslConsumption(buildReadyEvaluationInput(qaReport));

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('moving_fire_evidence_missing');
    expect(result.blockers).not.toContain('interactive_runtime_evidence_missing');
    expect(result.blockers).not.toContain('manual_traversal_evidence_missing');
  });

  it('fails closed when manual traversal is only a text summary without input-only screenshot metadata', () => {
    const qaReport = buildInteractiveQaReport();
    const manualTraversal = qaReport.manual_traversal_evidence as Record<string, unknown>;
    delete manualTraversal.screenshots;
    manualTraversal.screenshots_are_input_only = false;

    const result = evaluateStep38DslConsumption(buildReadyEvaluationInput(qaReport));

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('manual_traversal_evidence_missing');
  });

  it('does not collapse an unrelated global QA failure into the interactive runtime blocker', () => {
    const qaReport = buildInteractiveQaReport();
    qaReport.status = 'FAILED';
    delete qaReport.manual_traversal_evidence;

    const result = evaluateStep38DslConsumption(buildReadyEvaluationInput(qaReport));

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('manual_traversal_evidence_missing');
    expect(result.blockers).not.toContain('interactive_runtime_evidence_missing');
  });

  it('accepts manual traversal progression unlock when later waves and area traversal are input-proven', () => {
    const qaReport = buildInteractiveQaReport();
    const manualTraversal = qaReport.manual_traversal_evidence as Record<string, unknown>;
    const gate = manualTraversal.manual_traversal_gate as Record<string, unknown>;
    manualTraversal.cleared_wave_ids = [];
    manualTraversal.post_first_wave_enemy_seen = false;
    manualTraversal.progression_unlock_seen_by_input = true;
    gate.wave_clear_or_progression_unlock_by_input = true;

    const result = evaluateStep38DslConsumption(buildReadyEvaluationInput(qaReport));

    expect(result.blockers).not.toContain('manual_traversal_evidence_missing');
  });

  it('fails closed when manual traversal has neither wave clear nor progression unlock evidence', () => {
    const qaReport = buildInteractiveQaReport();
    const manualTraversal = qaReport.manual_traversal_evidence as Record<string, unknown>;
    const gate = manualTraversal.manual_traversal_gate as Record<string, unknown>;
    manualTraversal.cleared_wave_ids = [];
    manualTraversal.post_first_wave_enemy_seen = false;
    gate.wave_clear_or_progression_unlock_by_input = false;
    gate.wave_clear_reachable_by_input = false;
    gate.wave2_reached_by_input = false;

    const result = evaluateStep38DslConsumption(buildReadyEvaluationInput(qaReport));

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('manual_traversal_evidence_missing');
  });

  it('keeps density pass blocked when the success route has a large empty gameplay gap', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    const qaReport = input.artifacts.qaReport as Record<string, unknown>;
    const encounterCoverage = qaReport.encounter_coverage as Record<string, unknown>;
    const manualTraversal = qaReport.manual_traversal_evidence as Record<string, unknown>;
    const encounterRuntime = input.artifacts.encounterDirectorRuntimeEvidence as Record<string, unknown>;
    const manualGate = manualTraversal.manual_traversal_gate as Record<string, unknown>;
    const encounterGate = encounterRuntime.encounter_director_gate as Record<string, unknown>;

    encounterCoverage.expected_enemy_count = 40;
    encounterCoverage.realized_enemy_count = 47;
    manualTraversal.status = 'FAILED';
    manualGate.verdict = 'FAIL';
    manualGate.large_empty_traversal_detected = true;
    manualGate.milestone_times_sec = [
      { id: 'wave2_seen_by_input', elapsedSec: 2.49 },
      { id: 'pickup_area2_seen_by_input', elapsedSec: 3.43 },
      { id: 'boss_telegraph_seen_by_input', elapsedSec: 11.54 }
    ];
    encounterGate.verdict = 'FAIL';
    encounterGate.large_empty_traversal_detected = true;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('manual_traversal_evidence_missing');
    expect(result.blockers).toContain('encounter_director_runtime_evidence_missing');
    expect(result.blockers).not.toContain('encounter_coverage_evidence_missing');
  });

  it('keeps mission complete and boss defeated blocked when route milestones fail', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    input.artifacts.successRouteMilestoneTimeline = buildSuccessRouteMilestoneTimeline({
      route_verdict: 'FAIL',
      large_empty_traversal_detected: true,
      mission_complete_used_as_route_pass_without_milestones: true
    });
    input.artifacts.routePressureBandEvidence = buildRoutePressureBandEvidence({
      route_pressure_band_gate: {
        verdict: 'FAIL',
        max_empty_interval_sec: 8,
        largest_empty_interval_sec: 8.1,
        large_empty_traversal_detected: true,
        text_only_evidence_used_for_pass: false,
        telemetry_only_evidence_used_for_pass: false
      },
      large_empty_traversal_detected: true
    });

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('success_route_milestone_timeline_missing');
    expect(result.blockers).toContain('route_pressure_band_evidence_missing');
    expect(result.blockers).not.toContain('encounter_coverage_evidence_missing');
  });

  it('accepts route pressure when a visible hazard or boss projectile carries the hostile pressure frame', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    input.artifacts.routePressureBandEvidence = buildRoutePressureBandEvidence({
      pressure_bands: [
        {
          id: 'wave2_to_boss_mid_pressure',
          from: '03_wave2',
          to: '04_boss_telegraph',
          visible_runtime_objects: ['flying_enemy', 'environment_hazard', 'player_projectile'],
          progress_evidence: [
            'flying_enemy_visible',
            'hazard_visible_and_active',
            'player_projectile_visible_with_pressure',
            'active_pressure_band_visible'
          ],
          screenshots: ['03b_mid_pressure_band.png'],
          metadata_paths: ['03b_mid_pressure_band.metadata.json'],
          counts_as_progress: true
        }
      ]
    });

    const result = evaluateStep38DslConsumption(input);

    expect(result.blockers).not.toContain('route_pressure_band_evidence_missing');
  });

  it('blocks route pressure when required objects are split across different pressure bands', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    input.artifacts.routePressureBandEvidence = buildRoutePressureBandEvidence({
      pressure_bands: [
        {
          id: 'wave2_to_boss_mid_pressure',
          from: '03_wave2',
          to: '04_boss_telegraph',
          visible_runtime_objects: ['flying_enemy'],
          progress_evidence: ['flying_enemy_visible', 'active_pressure_band_visible'],
          screenshots: ['03b_mid_pressure_band.png'],
          metadata_paths: ['03b_mid_pressure_band.metadata.json'],
          counts_as_progress: true
        },
        {
          id: 'split_player_projectile',
          visible_runtime_objects: ['player_projectile'],
          progress_evidence: ['player_projectile_visible_with_pressure'],
          screenshots: ['later_projectile.png'],
          metadata_paths: ['later_projectile.metadata.json'],
          counts_as_progress: false
        },
        {
          id: 'split_hostile_pressure',
          visible_runtime_objects: ['environment_hazard'],
          progress_evidence: ['hazard_visible_and_active'],
          screenshots: ['later_hazard.png'],
          metadata_paths: ['later_hazard.metadata.json'],
          counts_as_progress: false
        }
      ]
    });

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('route_pressure_band_evidence_missing');
  });

  it('blocks route pressure evidence that is not fresh manual input-only evidence', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    input.artifacts.routePressureBandEvidence = buildRoutePressureBandEvidence({
      source: 'runtime_operator_visible_snapshot'
    });

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('route_pressure_band_evidence_missing');
  });

  it('blocks route pressure evidence that marks text-only evidence as passing', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    input.artifacts.routePressureBandEvidence = buildRoutePressureBandEvidence({
      route_pressure_band_gate: {
        verdict: 'PASS',
        max_empty_interval_sec: 8,
        largest_empty_interval_sec: 5,
        large_empty_traversal_detected: false,
        text_only_evidence_used_for_pass: true,
        telemetry_only_evidence_used_for_pass: false
      }
    });

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('route_pressure_band_evidence_missing');
  });

  it('blocks route pressure evidence that marks telemetry-only evidence as passing', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    input.artifacts.routePressureBandEvidence = buildRoutePressureBandEvidence({
      route_pressure_band_gate: {
        verdict: 'PASS',
        max_empty_interval_sec: 8,
        largest_empty_interval_sec: 5,
        large_empty_traversal_detected: false,
        text_only_evidence_used_for_pass: false,
        telemetry_only_evidence_used_for_pass: true
      }
    });

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('route_pressure_band_evidence_missing');
  });

  it('blocks route pressure evidence without same-band screenshot and metadata paths', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    input.artifacts.routePressureBandEvidence = buildRoutePressureBandEvidence({
      pressure_bands: [
        {
          id: 'wave2_to_boss_mid_pressure',
          from: '03_wave2',
          to: '04_boss_telegraph',
          visible_runtime_objects: ['flying_enemy', 'enemy_projectile', 'player_projectile'],
          progress_evidence: [
            'active_pressure_band_visible',
            'enemy_projectile_visible',
            'flying_enemy_visible',
            'player_projectile_visible_with_pressure'
          ],
          screenshots: [],
          metadata_paths: [],
          counts_as_progress: true
        }
      ]
    });

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('route_pressure_band_evidence_missing');
  });

  it('requires mid-route pressure evidence instead of mission-complete-only route pass', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    input.artifacts.successRouteMilestoneTimeline = buildSuccessRouteMilestoneTimeline({
      segments: [
        {
          id: 'spawn_to_wave1',
          from_step: '00_fresh_spawn',
          to_step: '01_wave1_visible',
          elapsed_sec: 0.25,
          progress_evidence: ['wave1_visible'],
          screenshots: ['01_wave1_reached_by_input.png'],
          verdict: 'PASS'
        },
        {
          id: 'wave2_to_boss_telegraph',
          from_step: '03_wave2',
          to_step: '04_boss_telegraph',
          elapsed_sec: 8.1,
          progress_evidence: ['mission_complete_visible_after_boss_progression'],
          screenshots: ['06_exit_or_mission_complete_reached_by_input.png'],
          verdict: 'PASS'
        },
        {
          id: 'boss_to_mission_complete',
          from_step: '08_boss_phase_1_visible',
          to_step: '11_mission_complete_after_play',
          elapsed_sec: 2,
          progress_evidence: ['mission_complete_visible_after_boss_progression'],
          screenshots: ['06_exit_or_mission_complete_reached_by_input.png'],
          verdict: 'PASS'
        }
      ]
    });

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('success_route_milestone_timeline_missing');
    expect(result.blockers).not.toContain('win_path_evidence_missing');
  });

  it('fails closed when mission complete evidence is only text and events without real playthrough completion', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    const winPathEvidence = input.artifacts.winPathEvidence as Record<string, unknown>;
    const gate = winPathEvidence.win_path_gate as Record<string, unknown>;
    gate.mission_complete_overlay_visible = true;
    gate.mission_complete_overlay_persistent = true;
    gate.telemetry_mission_complete_recorded = true;
    gate.mission_complete_visible = true;
    gate.real_playthrough_completion_verified = false;
    gate.text_or_overlay_only_evidence = true;
    delete gate.boss_defeated_by_input;
    delete gate.all_required_waves_resolved_before_win;
    delete gate.all_required_regions_traversed_before_win;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('win_path_evidence_missing');
    expect(result.blockers).not.toContain('manual_traversal_evidence_missing');
  });

  it('fails closed when the outcome state machine allows mission complete before gameplay completion preconditions', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    const outcomeReport = input.artifacts.outcomeStateMachineReport as Record<string, unknown>;
    const gate = outcomeReport.outcome_state_machine_gate as Record<string, unknown>;
    gate.win_path_connected = true;
    gate.mission_complete_persistent = true;
    gate.real_playthrough_completion_verified = false;
    gate.early_mission_complete_detected = true;
    gate.text_or_overlay_only_win_transition = true;
    delete gate.completion_preconditions_satisfied;
    delete gate.mission_complete_requires_completion_preconditions;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('outcome_state_machine_report_missing');
    expect(result.blockers).not.toContain('win_path_evidence_missing');
  });

  it('fails closed when the real playthrough and operator-visible hard gates are missing', () => {
    const input = buildReadyEvaluationInput(buildInteractiveQaReport());
    delete (input.artifacts as Record<string, unknown>).realPlaythroughCompletionEvidence;
    delete (input.artifacts as Record<string, unknown>).operatorVisibleArtGate;
    delete (input.artifacts as Record<string, unknown>).visualPlaythroughValidatorReport;

    const result = evaluateStep38DslConsumption(input);

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        'real_playthrough_completion_evidence_missing',
        'human_visible_gameplay_gate_missing',
        'operator_visible_art_gate_missing',
        'visual_playthrough_validator_report_missing'
      ])
    );
  });

  it('keeps the runtime wave gate local to engaged waves so later waves cannot be bypassed into boss completion', () => {
    const mainJs = buildStep38MainJs();

    expect(mainJs).toContain('function applyWaveProgressionGate(state)');
    expect(mainJs).toContain('const trailingWaveLookback = Math.max(980, state.player.x);');
    expect(mainJs).toContain('const engagedWaveEnemies = activeWaveEnemies.filter');
    expect(mainJs).toContain('enemy.x <= state.player.x + 980');
    expect(mainJs).toContain('enemy.x >= state.player.x - trailingWaveLookback');
    expect(mainJs).toContain("reason: 'required_engaged_wave_enemy_alive'");
    expect(mainJs).toContain('state.player.x = gateX;');
  });

  it('keeps product-duration evidence while using preview-safe encounter density in the visual slice runtime', () => {
    const mainJs = buildStep38MainJs();

    expect(mainJs).toContain('const canonicalGame = { ...(canonicalDsl.game || {}), play_time_intent: canonicalDsl.play_time_intent };');
    expect(mainJs).toContain('game: canonicalGame');
    expect(mainJs).toContain('state.game.play_time_intent');
    expect(mainJs).toContain('const productDurationWaveCountScale = Math.max');
    expect(mainJs).toContain('const previewWaveCountScale = visualSlicePreviewMode ? 1 : productDurationWaveCountScale;');
    expect(mainJs).toContain('const count = isStatic ? baseCount : clamp(baseCount * previewWaveCountScale, 1, visualSlicePreviewMode ? 8 : 80);');
    expect(mainJs).toContain('product_duration_wave_count_scale: productDurationWaveCountScale');
    expect(mainJs).toContain('preview_wave_count_scale: previewWaveCountScale');
    expect(mainJs).toContain("const fullDurationRuntimeCoverageDisposition = fullDurationRuntimeCoverage ? 'SATISFIED' : state.visualSlicePreviewMode ? 'DEFERRED_NON_BLOCKING' : 'BLOCKING_CURRENT_MILESTONE';");
    expect(mainJs).toContain('product_duration_coverage_status');
    expect(mainJs).toContain('full_duration_runtime_coverage_disposition');
    expect(mainJs).toContain('full_duration_runtime_coverage_deferred');
    expect(mainJs).toContain('full_duration_runtime_coverage_blocking_current_milestone');
    expect(mainJs).toContain('full_duration_enemy_count_disposition');
    expect(mainJs).toContain('full_duration_encounter_band_count_disposition');
    expect(mainJs).toContain('preview_visual_slice_coverage_status');
    expect(mainJs).toContain('preview_minimum_encounter_band_count');
  });

  it('caps visual-slice projectile pressure without removing enemy and boss counterfire', () => {
    const mainJs = buildStep38MainJs();

    expect(mainJs).toContain('const maxVisiblePlayerProjectiles = visualSlicePreviewMode ? (spread ? 8 : 5) : 120;');
    expect(mainJs).toContain('if (visiblePlayerProjectiles.length >= maxVisiblePlayerProjectiles) return;');
    expect(mainJs).toContain('const activeEnemyProjectileLimit = visualSlicePreviewMode ? 10 : 80;');
    expect(mainJs).toContain('if (activeEnemyProjectileCount >= activeEnemyProjectileLimit) return;');
    expect(mainJs).toContain('const activeBossProjectileCount = state.enemyProjectiles.filter');
    expect(mainJs).toContain('if (visualSlicePreviewMode && activeBossProjectileCount >= 4) return;');
    expect(mainJs).toContain('shot.x > state.cameraX - 160 && shot.x < Math.min(state.worldWidth + 120, state.cameraX + 1080)');
  });

  it('binds upgraded DSL weapons to stronger wave-clearing projectile behavior', () => {
    const mainJs = buildStep38MainJs();

    expect(mainJs).toContain("const playerShotDamage = shot.sourceWeapon === 'straight_single' ? 1 : 2;");
    expect(mainJs).toContain("if (shot.sourceWeapon === 'straight_single')");
    expect(mainJs).toContain('shot.x = enemy.x + enemy.w + 10;');
    expect(mainJs).toContain('damage: playerShotDamage');
  });

  it('models firing as sustained input that can happen while movement is held', () => {
    const mainJs = buildStep38MainJs();
    const runnerSource = readStep38RunnerSource();

    expect(mainJs).toContain('function isPlayerMovingInputHeld(state)');
    expect(mainJs).toContain('function isFireInputHeld(state)');
    expect(mainJs).toContain("state.keys.has('KeyX') || state.keys.has('KeyJ')");
    expect(mainJs).toContain('function applyShootingInput(state, now)');
    expect(mainJs).toContain('applyShootingInput(state, now);');
    expect(mainJs).toContain('const movingWhileFiring = isPlayerMovingInputHeld(state);');
    expect(mainJs).toContain('window.__STEP38_PLAYABLE_STATE.movingFireObserved = true;');
    expect(mainJs).toContain('moving: movingWhileFiring');
    expect(runnerSource).toContain("await page.keyboard.down('ArrowRight');");
    expect(runnerSource).toContain("await page.keyboard.down('KeyX');");
    expect(runnerSource).toContain("await page.keyboard.up('KeyX');");
  });

  it('keeps normal success traversal survivable while preserving the lethal failure path', () => {
    const mainJs = buildStep38MainJs();
    const runnerSource = readStep38RunnerSource();

    expect(mainJs).toContain('const playerHitRecoveryMs = state.failurePathQaMode ? 650 : 2400;');
    expect(mainJs).toContain('player.invulnerableUntil = now + playerHitRecoveryMs;');
    expect(runnerSource).toContain('for (let index = 0; index < 560; index += 1)');
  });

  it('exposes infinite health as a diagnostic-only manual traversal switch', () => {
    const mainJs = buildStep38MainJs();

    expect(mainJs).toContain("const debugInfiniteHealth = urlParams.get('debugInfiniteHealth') === '1';");
    expect(mainJs).toContain('debugInfiniteHealthDiagnosticOnly: debugInfiniteHealth');
    expect(mainJs).toContain('if (debugInfiniteHealth) {');
    expect(mainJs).toContain("source: 'debug_infinite_health'");
    expect(mainJs).toContain('counts_for_ready_for_manual_test: false');
    expect(mainJs).toContain("const healthLabel = debugInfiniteHealth ? '∞' : state.player.health;");
  });

  it('records core-wave pressure as gameplay progress instead of loosening the large-empty gate', () => {
    const mainJs = buildStep38MainJs();

    expect(mainJs).toContain("layout.projectionWindow?.id === 'window_2_boss'");
    expect(mainJs).toContain('bossRoutePressureSegment ? 180 : 620');
    expect(mainJs).toContain("segmentLayout?.projectionWindow?.id === 'window_2_boss'");
    expect(mainJs).toContain("markManualMilestone(state, 'core_wave_pressure_seen_by_input'");
    expect(mainJs).toContain('traversal.coreWavePressureSeen');
    expect(mainJs).toContain('traversal.maxEmptyTraversalSecBetweenRequiredEvents > 8');
    expect(mainJs).not.toContain('traversal.maxEmptyTraversalSecBetweenRequiredEvents > 12');
  });

  it('binds runtime marker and boss phase visuals to their own canonical asset identities', () => {
    const mainJs = buildStep38MainJs();

    expect(mainJs).toContain("entityId: 'wave_marker.runtime_trigger.v1'");
    expect(mainJs).toContain("sourceEntityId: 'boss_telegraph.runtime_arc.v1'");
    expect(mainJs).toContain("entityId: 'boss_telegraph.runtime_arc.v1'");
    expect(mainJs).toContain("sourceEntityId: 'boss_projectile_phase.runtime.v1'");
    expect(mainJs).toContain("entityId: 'boss_projectile_phase.runtime.v1'");
  });

  it('emits route milestone and pressure-band evidence from fresh manual traversal screenshots', () => {
    const runnerSource = readStep38RunnerSource();
    const mainJs = buildStep38MainJs();

    expect(runnerSource).toContain("const STEP38_ROUTE_PRESSURE_BAND_SCREENSHOTS = ['03b_mid_pressure_band'] as const;");
    expect(runnerSource).toContain('buildStep38RoutePressureBandEvidence');
    expect(runnerSource).toContain('buildStep38SuccessRouteMilestoneTimeline');
    expect(runnerSource).toContain('success_route_milestone_timeline_ok');
    expect(runnerSource).toContain('route_pressure_band_evidence_ok');
    expect(runnerSource).toContain('hasCompletePressureBand');
    expect(runnerSource).toContain('hostileProjectileOrHazardVisible');
    expect(runnerSource).toContain("pressureObjects.includes('environment_hazard')");
    expect(runnerSource).toContain("object.required_object === 'boss_projectile_phase_object'");
    expect(mainJs).toContain("objectType: 'progression_gate'");
    expect(mainJs).toContain("sourceEntityId: 'boss_falling_hazard.visual_slice.v1'");
  });

  it('keeps boss immunity from consuming player shots before required waves are cleared', () => {
    const mainJs = buildStep38MainJs();
    const bossBlockStart = mainJs.indexOf('if (state.boss.alive && player.x > state.boss.x - 900)');
    const bossDamageStart = mainJs.indexOf("objective: 'boss_damage'", bossBlockStart);
    const bossDamageBlockEnd = mainJs.indexOf('state.boss.hp -=', bossDamageStart);
    const bossDamageBlock = mainJs.slice(bossBlockStart, bossDamageBlockEnd);

    expect(bossBlockStart).toBeGreaterThanOrEqual(0);
    expect(bossDamageStart).toBeGreaterThan(bossBlockStart);
    expect(bossDamageBlockEnd).toBeGreaterThan(bossDamageStart);
    expect(bossDamageBlock).toContain("objective: 'boss_damage'");
    expect(bossDamageBlock.indexOf('if (!waveProgressionCompleteForBossGate(state))')).toBeLessThan(
      bossDamageBlock.indexOf('shot.x = state.worldWidth + 999;')
    );
  });

  it('places the visual-slice boss after compressed core waves and gates toward unresolved waves first', () => {
    const mainJs = buildStep38MainJs();

    expect(mainJs).toContain('const bossX = visualSlicePreviewMode ? bossLayout.endX + 160 : bossLayout.endX - 620;');
    expect(mainJs).toContain('x: bossX,');
    expect(mainJs).toContain('const nextBlockingWaveEnemy = activeWaveEnemies.find');
    expect(mainJs).toContain('nextBlockingWaveEnemy ? nextBlockingWaveEnemy.x - 220 : state.boss.x - 620');
  });

  it('allows the fresh traversal wave2 screenshot to come from the core wave window when DSL waves extend into the boss segment', () => {
    const runnerSource = readStep38RunnerSource();
    const wave2Cases = [...runnerSource.matchAll(/case '03_wave2_reached_by_input':[\s\S]*?case '04_boss_telegraph_reached_by_input':/g)].map(
      (match) => match[0]
    );

    expect(wave2Cases).toHaveLength(2);
    for (const wave2Case of wave2Cases) {
      expect(wave2Case).toContain("previewWindow === 'window_2_boss'");
    }
  });

  it('generates source evidence for the real playthrough and visual validator gates', () => {
    const mainJs = buildStep38MainJs();

    expect(mainJs).toContain('window.__STEP38_REAL_PLAYTHROUGH_COMPLETION_EVIDENCE');
    expect(mainJs).toContain('real_playthrough_completion_gate');
    expect(mainJs).toContain('human_visible_gameplay_gate');
    expect(mainJs).toContain('operator_visible_art_gate');
    expect(mainJs).toContain('visual_playthrough_validator');
  });

  it('requires fresh manual input-only policy in runner QA summary readers for final visual gates', () => {
    const runnerSource = readStep38RunnerSource();
    const visualDesignReader = runnerSource.slice(
      runnerSource.indexOf('function hasStep38VisualDesignRealizationQaEvidence'),
      runnerSource.indexOf('function hasStep38ProceduralCanvasBackendPolicy')
    );
    const canvasArtReader = runnerSource.slice(
      runnerSource.indexOf('function hasStep38CanvasArtFidelityQaEvidence'),
      runnerSource.indexOf('function hasStep38SpriteAnimationCoverageQaEvidence')
    );
    const operatorReader = runnerSource.slice(
      runnerSource.indexOf('function hasStep38OperatorVisibleArtGateQaEvidence'),
      runnerSource.indexOf('function hasStep38VisualPlaythroughValidatorQaEvidence')
    );
    const spriteAnimationReader = runnerSource.slice(
      runnerSource.indexOf('function hasStep38SpriteAnimationCoverageQaEvidence'),
      runnerSource.indexOf('function hasStep38EnvironmentLayeringQaEvidence')
    );
    const environmentLayeringReader = runnerSource.slice(
      runnerSource.indexOf('function hasStep38EnvironmentLayeringQaEvidence'),
      runnerSource.indexOf('function hasStep38StartupSurvivabilityQaEvidence')
    );

    expect(runnerSource).toContain('function hasStep38FreshManualInputOnlyEvidencePolicy');
    expect(visualDesignReader).toContain('hasStep38FreshManualInputOnlyEvidencePolicy(value, gate)');
    expect(canvasArtReader).toContain('hasStep38FreshManualInputOnlyEvidencePolicy(value, gate)');
    expect(operatorReader).toContain('hasStep38FreshManualInputOnlyEvidencePolicy(value, gate)');
    expect(spriteAnimationReader).toContain('hasStep38ProceduralCanvasBackendPolicy(value, gate)');
    expect(spriteAnimationReader).not.toContain('hasStep38FreshManualInputOnlyEvidencePolicy(value, gate)');
    expect(environmentLayeringReader).toContain('hasStep38ProceduralCanvasBackendPolicy(value, gate)');
    expect(environmentLayeringReader).not.toContain('hasStep38FreshManualInputOnlyEvidencePolicy(value, gate)');
  });

  it('keeps runtime-generated materialization report bound to DSL-driven visual asset fields', () => {
    const mainJs = buildStep38MainJs();
    const reportStart = mainJs.indexOf('function buildVisualAssetMaterializationReport(state)');
    const reportEnd = mainJs.indexOf('function buildRuntime(', reportStart);
    const reportBody = mainJs.slice(reportStart, reportEnd);

    expect(reportStart).toBeGreaterThanOrEqual(0);
    expect(reportEnd).toBeGreaterThan(reportStart);
    expect(reportBody).toContain('visual_intent_sha: object.visual_intent_sha');
    expect(reportBody).toContain('asset_design_spec_sha: object.asset_design_spec_sha');
    expect(reportBody).toContain('motif_coverage: object.motif_coverage');
    expect(reportBody).toContain('geometry_signature: object.geometry_signature');
    expect(reportBody).toContain('template_fingerprint: object.template_fingerprint');
    expect(reportBody).toContain('role_static_svg_template_used: object.role_static_svg_template_used');
    expect(reportBody).toContain('old_svgForVisualIntent_used: object.old_svgForVisualIntent_used');
    expect(reportBody).toContain('template_derived_placeholder: object.template_derived_placeholder');
    expect(reportBody).toContain('role_only_generation_detected: object.role_only_generation_detected');
    expect(reportBody).toContain('matches_known_static_template: object.matches_known_static_template');
    expect(reportBody).toContain('distinct_silhouette: object.distinct_silhouette');
    expect(reportBody).toContain("typeof object.visual_intent_sha !== 'string'");
    expect(reportBody).toContain("typeof object.asset_design_spec_sha !== 'string'");
    expect(reportBody).toContain('!Array.isArray(object.motif_coverage) || object.motif_coverage.length === 0');
    expect(reportBody).toContain('object.template_derived_placeholder === true');
    expect(reportBody).toContain('object.distinct_silhouette !== true');
    expect(reportBody).toContain('visual_intent_sha_present: objects.every((object) => typeof object.visual_intent_sha ===');
    expect(reportBody).toContain('template_derived_placeholder_detected: objects.some((object) => object.template_derived_placeholder === true)');
  });

  it('prevents shared assetIntentRef lookup from binding the wrong required visual object', () => {
    const mainJs = buildStep38MainJs();
    const lookupStart = mainJs.indexOf('function requiredObjectForAssetLookup');
    const lookupEnd = mainJs.indexOf('function readEnvironmentVisuals', lookupStart);
    const lookupBody = mainJs.slice(lookupStart, lookupEnd);

    expect(lookupStart).toBeGreaterThanOrEqual(0);
    expect(lookupEnd).toBeGreaterThan(lookupStart);
    expect(lookupBody).toContain("if (role === 'pickup') return 'pickup_weapon';");
    expect(lookupBody).toContain("if (role === 'hazard') return 'environment_hazard';");
    expect(lookupBody).toContain("if (role === 'enemy_static') return 'ranged_enemy';");
    expect(lookupBody).toContain("if (role === 'enemy_ground') return 'ground_enemy';");
    expect(lookupBody).toContain('function assetMatchesRequiredObject(asset, requiredObject)');
    expect(lookupBody).toContain('asset.__step38AssetMeta.requiredObject === requiredObject');
    expect(lookupBody).toContain('assetMatchesRequiredObject(candidate, requiredObject)');
    expect(lookupBody).toContain('return assetMatchesRequiredObject(asset, requiredObject) ? asset : null;');
  });

  it('generates runtime code that blocks mission complete until required wave progression is complete', () => {
    const mainJs = buildStep38MainJs();

    expect(mainJs).toContain('const completionBeforeWin = runtimeCompletionPreconditionEvidence(state,');
    expect(mainJs).toContain('completionBeforeWin.real_playthrough_completion_verified !== true');
    expect(mainJs).toContain("emit('objective.blocked'");
    expect(mainJs.indexOf('const completionBeforeWin = runtimeCompletionPreconditionEvidence(state,')).toBeLessThan(
      mainJs.indexOf("setOutcomeState(state, 'MISSION_COMPLETE'")
    );
  });

  it('generates runtime code that prevents bypassing unresolved wave progression gates', () => {
    const mainJs = buildStep38MainJs();

    expect(mainJs).toContain('function applyWaveProgressionGate(state)');
    expect(mainJs).toContain("emit('progression.blocked'");
    expect(mainJs).toContain('applyWaveProgressionGate(state);');
    expect(mainJs.indexOf('applyWaveProgressionGate(state);')).toBeLessThan(mainJs.indexOf('if (state.boss.alive && player.x > state.boss.x - 900)'));
  });

  it('accepts real canonical DSL v0.2 profile artifacts without requiring legacy game.genre authority', () => {
    const canonicalDsl = {
      artifactKind: 'canonical_game_dsl',
      schema_version: 'game-dsl.v0.2',
      projectId: 'proj_step38_canonical',
      runId: 'run_step38_canonical',
      profile: { id: 'side_scrolling_run_and_gun.v1', runtime_family: 'phaser_2d_action_arcade.v1' },
      play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 },
      capability_ids: [
        'movement.run_jump.v1',
        'movement.crouch.v1',
        'combat.projectile.v1',
        'weapon.spread_shot.v1',
        'weapon.rapid_fire.v1',
        'spawn.enemy_wave.v1',
        'scene.ordered_segments.v1',
        'scene.visual_presentation_metadata.v1',
        'enemy.boss_lifecycle.v1',
        'health.player_health_points.v1',
        'ui.hud_player_health.v1',
        'ui.win_failure_transitions.v1'
      ],
      progression: {
        estimated_total_sec: { min_sec: 480, max_sec: 720 },
        segments: [{ id: 'jungle_entrance' }, { id: 'metal_bridge' }, { id: 'enemy_core' }]
      },
      scenes: [{ id: 'main_scene', config: { visual_theme: 'original_16bit_jungle_metal_core' } }],
      entities: buildStep38VisualEntities(),
      waves: [{ id: 'wave_one' }],
      pickups: [{ id: 'spread_supply' }],
      bosses: [{ id: 'boss_core', phases: [{ id: 'phase_1' }, { id: 'phase_2' }] }],
      objectives: [{ kind: 'boss_defeated' }],
      metadata: { title: '赤焰突围', tags: ['original_no_existing_ip'] }
    };
    const result = evaluateStep38DslConsumption({
      baselineCommit: STEP38_BASELINE_COMMIT,
      promptSha256: STEP38_EXPECTED_PROMPT_SHA256,
      modelName: STEP38_EXPECTED_PROVIDER_MODEL,
      realDeepSeekPathExecuted: true,
      dslConsumerPathUsed: true,
      rawGameDslResponsePresent: true,
      generatedArtifactRunSpecific: true,
      buildSucceeded: true,
      previewBooted: true,
      guardFlags: {
        fallback_used: false,
        preloaded_artifact_used: false,
        legacy_fixed_template_authority: false,
        stale_generated_artifact_used: false
      },
      artifacts: {
        canonicalDsl,
        runtimePlan: {
          profileId: 'side_scrolling_run_and_gun.v1',
          runtimeFamily: 'phaser_2d_action_arcade.v1',
          progression: { estimatedTotalSec: { min: 480, max: 720 }, segments: [{ id: 'jungle_entrance' }, { id: 'metal_bridge' }, { id: 'enemy_core' }] },
          gameplay: { waveIds: ['wave_one'], pickupIds: ['spread_supply'], bossIds: ['boss_core'], objectiveIds: ['boss_defeated'] },
          runtimeSystems: canonicalDsl.capability_ids.map((capabilityId) => ({ capabilityId }))
        },
        sceneIr: {
          source: 'canonical_game_dsl_v0.2_runtime_plan',
          visualIntent: {
            source: 'canonical_dsl_visual_intent',
            sceneVisualTheme: 'original_16bit_jungle_metal_core',
            requiredVisualRoles: STEP38_TEST_REQUIRED_VISUAL_ROLES,
            missingVisualRoles: [],
            canonicalVisualIntentCount: 8
          },
          nodes: [
            { kind: 'visual_intent_manifest' },
            { kind: 'player_spawn', visualAssetIntentRef: 'player_red_runner' },
            { kind: 'enemy_spawn', visualAssetIntentRef: 'enemy_patrol_red' },
            { kind: 'enemy_spawn', visualAssetIntentRef: 'enemy_flying_wing' },
            { kind: 'enemy_spawn', visualAssetIntentRef: 'enemy_fixed_turret' },
            { kind: 'pickup', visualAssetIntentRef: 'weapon_supply_green_orb' },
            { kind: 'projectile', visualAssetIntentRef: 'projectile_flare' },
            { kind: 'hazard', visualAssetIntentRef: 'hazard_warning_triangle' },
            { kind: 'boss', visualAssetIntentRef: 'boss_molten_core_guard' },
            { kind: 'goal' }
          ]
        },
        runtimeManifest: {
          runtimeFamily: 'phaser_2d_action_arcade.v1',
          compatibilityMode: { selection: 'universal_composition' },
          systems: canonicalDsl.capability_ids.map((capabilityId) => ({ capabilityId, authoritativeConfig: 'capability_ir' }))
        },
        qaReport: buildInteractiveQaReport(),
        manualVerticalSliceProjection: buildManualVerticalSliceProjection(),
        visualRuntimeBindingReport: buildVisualRuntimeBindingReport(),
        visualAssetMaterializationReport: buildVisualAssetMaterializationReport(),
        assetTemplateFingerprintReport: buildAssetTemplateFingerprintReport(),
        visualDesignRealizationReport: buildVisualDesignRealizationReport(),
        runtimeTextureLoadReport: buildRuntimeTextureLoadReport(),
        artDirectionQualityReport: buildArtDirectionQualityReport(),
        encounterDirectorPlan: buildEncounterDirectorPlan(),
        encounterDirectorRuntimeEvidence: buildEncounterDirectorRuntimeEvidence(),
        outcomeStateMachineReport: buildOutcomeStateMachineReport(),
        winPathEvidence: buildWinPathEvidence(),
        losePathEvidence: buildLosePathEvidence(),
        successRouteMilestoneTimeline: buildSuccessRouteMilestoneTimeline(),
        routePressureBandEvidence: buildRoutePressureBandEvidence(),
        realPlaythroughCompletionEvidence: buildRealPlaythroughCompletionEvidence(),
        twoDGameplayPlaythroughGate: buildTwoDGameplayPlaythroughGate(),
        canvasVisualReadabilityGate: buildCanvasVisualReadabilityGate(),
        proceduralPixelArtGrammarReport: buildProceduralPixelArtGrammarReport(),
        canvasArtFidelityGate: buildCanvasArtFidelityGate(),
        spriteAnimationCoverageReport: buildSpriteAnimationCoverageReport(),
        environmentLayeringReport: buildEnvironmentLayeringReport(),
        startupSurvivabilityGate: buildStartupSurvivabilityGate(),
        encounterPlayabilityGate: buildEncounterPlayabilityGate(),
        operatorVisibleArtGate: buildOperatorVisibleArtGate(),
        visualPlaythroughValidatorReport: buildVisualPlaythroughValidatorReport(),
        telemetryEvents: [
          'game.ready',
          'game.started',
          'scene.visual_presentation_metadata.verified',
          'player.moved',
          'player.fired',
          'enemy.hit',
          'player.dead',
          'game.over',
          'mission.complete',
          'game.lost',
          'game.won'
        ],
        dslConsumptionReport: { entries: [], summary: { unsupportedCount: 0, deferredCount: 0, ignoredAuthoritativeCount: 0 } }
      }
    });

    expect(result.readyState, JSON.stringify(result.blockers)).toBe('READY_FOR_MANUAL_TEST');
    expect(result.unsupported_required_capabilities).toEqual([]);
  });

  it('fails closed for preload, missing canonical artifacts, and unsupported DSL fields', () => {
    const result = evaluateStep38DslConsumption({
      baselineCommit: STEP38_BASELINE_COMMIT,
      promptSha256: STEP38_EXPECTED_PROMPT_SHA256,
      modelName: STEP38_EXPECTED_PROVIDER_MODEL,
      realDeepSeekPathExecuted: true,
      dslConsumerPathUsed: true,
      rawGameDslResponsePresent: true,
      generatedArtifactRunSpecific: false,
      buildSucceeded: true,
      previewBooted: true,
      guardFlags: {
        fallback_used: false,
        preloaded_artifact_used: true,
        legacy_fixed_template_authority: false,
        stale_generated_artifact_used: false
      },
      artifacts: {
        canonicalDsl: undefined,
        runtimePlan: {},
        sceneIr: {},
        runtimeManifest: {},
        qaReport: { observed_events: [] },
        telemetryEvents: [],
        dslConsumptionReport: {
          entries: [
            { path: '/bosses', status: 'unsupported', authoritative: true },
            { path: '/level/segments', status: 'deferred', authoritative: true }
          ],
          summary: { unsupportedCount: 1, deferredCount: 1, ignoredAuthoritativeCount: 0 }
        }
      }
    });

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toEqual(expect.arrayContaining(['preloaded_artifact_used=true', 'generated_artifact_not_run_specific', 'canonical_dsl_missing']));
    expect(result.unsupported_required_capabilities).toEqual(expect.arrayContaining(['play_time_intent_8_12_range', 'boss_phase_or_boss_encounter_structure']));
    expect(result.ignored_required_dsl_fields).toEqual(['/bosses', '/level/segments']);
  });

  it('does not treat raw keyword strings as canonical DSL consumption evidence', () => {
    const keywordSoup = [
      'side_scrolling_run_and_gun',
      '480',
      '720',
      'movement.run_jump.v1',
      'movement.crouch.v1',
      'combat.projectile.v1',
      'weapon.spread_shot.v1',
      'spawn.enemy_wave.v1',
      'enemy.boss_lifecycle.v1',
      'ui.win_failure_transitions.v1',
      'boss_defeated',
      'reach_exit',
      'player_spawn',
      'enemy_spawn',
      'pickup',
      'boss',
      'goal',
      'original_no_existing_ip'
    ].join(' ');

    const result = evaluateStep38DslConsumption({
      baselineCommit: STEP38_BASELINE_COMMIT,
      promptSha256: STEP38_EXPECTED_PROMPT_SHA256,
      modelName: STEP38_EXPECTED_PROVIDER_MODEL,
      realDeepSeekPathExecuted: true,
      dslConsumerPathUsed: true,
      rawGameDslResponsePresent: true,
      generatedArtifactRunSpecific: true,
      buildSucceeded: true,
      previewBooted: true,
      guardFlags: {
        fallback_used: false,
        preloaded_artifact_used: false,
        legacy_fixed_template_authority: false,
        stale_generated_artifact_used: false
      },
      artifacts: {
        canonicalDsl: keywordSoup,
        runtimePlan: keywordSoup,
        sceneIr: keywordSoup,
        runtimeManifest: keywordSoup,
        qaReport: { observed_events: ['game.ready', 'player.moved', 'player.fired', 'enemy.hit', 'game.won'] },
        telemetryEvents: ['game.ready', 'player.moved', 'player.fired', 'enemy.hit', 'game.won'],
        dslConsumptionReport: { entries: [], summary: { unsupportedCount: 0, deferredCount: 0, ignoredAuthoritativeCount: 0 } }
      }
    });

    expect(result.readyState).toBe('BLOCKED');
    expect(result.unsupported_required_capabilities).toEqual(
      expect.arrayContaining(['genre_side_scrolling_run_and_gun', 'play_time_intent_8_12_range', 'weapon_pickups'])
    );
  });

  it('fails closed when QA events are auto-observed without interactive runtime evidence', () => {
    const result = evaluateStep38DslConsumption({
      baselineCommit: STEP38_BASELINE_COMMIT,
      promptSha256: STEP38_EXPECTED_PROMPT_SHA256,
      modelName: STEP38_EXPECTED_PROVIDER_MODEL,
      realDeepSeekPathExecuted: true,
      dslConsumerPathUsed: true,
      rawGameDslResponsePresent: true,
      generatedArtifactRunSpecific: true,
      buildSucceeded: true,
      previewBooted: true,
      guardFlags: {
        fallback_used: false,
        preloaded_artifact_used: false,
        legacy_fixed_template_authority: false,
        stale_generated_artifact_used: false
      },
      artifacts: {
        canonicalDsl: {
          profile: { id: 'side_scrolling_run_and_gun.v1' },
          play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 },
          capability_ids: ['movement.run_jump.v1', 'combat.projectile.v1', 'weapon.spread_shot.v1', 'spawn.enemy_wave.v1'],
          progression: { estimated_total_sec: { min_sec: 480, max_sec: 720 }, segments: [{ id: 'approach' }, { id: 'bridge' }, { id: 'core' }] },
          waves: [{ id: 'wave_approach' }],
          pickups: [{ id: 'spread_pickup' }],
          bosses: [{ id: 'boss_core', phases: [{ id: 'phase_1' }, { id: 'phase_2' }] }],
          objectives: [{ kind: 'boss_defeated' }],
          entities: [{ role: 'player' }],
          metadata: { title: '赤焰突围', tags: ['original_no_existing_ip'] }
        },
        runtimePlan: {
          profileId: 'side_scrolling_run_and_gun.v1',
          progression: { estimatedTotalSec: { min: 480, max: 720 }, segments: [{ id: 'approach' }, { id: 'bridge' }, { id: 'core' }] },
          gameplay: { waveIds: ['wave_approach'], pickupIds: ['spread_pickup'], bossIds: ['boss_core'], objectiveIds: ['boss_defeated'] },
          runtimeSystems: [
            { capabilityId: 'movement.run_jump.v1' },
            { capabilityId: 'movement.crouch.v1' },
            { capabilityId: 'combat.projectile.v1' },
            { capabilityId: 'spawn.enemy_wave.v1' },
            { capabilityId: 'health.player_health_points.v1' },
            { capabilityId: 'enemy.boss_lifecycle.v1' },
            { capabilityId: 'ui.win_failure_transitions.v1' }
          ]
        },
        sceneIr: {
          source: 'canonical_game_dsl_v0.2_runtime_plan',
          nodes: [{ kind: 'player_spawn' }, { kind: 'enemy_spawn' }, { kind: 'pickup' }, { kind: 'boss' }, { kind: 'goal' }]
        },
        runtimeManifest: {
          runtimeFamily: 'phaser_2d_action_arcade.v1',
          systems: [
            { capabilityId: 'movement.run_jump.v1' },
            { capabilityId: 'movement.crouch.v1' },
            { capabilityId: 'combat.projectile.v1' },
            { capabilityId: 'spawn.enemy_wave.v1' },
            { capabilityId: 'health.player_health_points.v1' },
            { capabilityId: 'enemy.boss_lifecycle.v1' },
            { capabilityId: 'ui.win_failure_transitions.v1' }
          ]
        },
        qaReport: {
          status: 'PASSED',
          observed_events: ['game.ready', 'game.started', 'player.moved', 'player.jumped', 'player.crouched', 'player.fired', 'projectile.spawned', 'item.collected', 'enemy.hit', 'score.changed', 'player.damaged', 'level.segment.completed', 'boss.phase.changed', 'game.lost', 'objective.completed', 'game.won'],
          event_records: [
            { event: 'player.moved', source: 'auto_timer' },
            { event: 'player.fired', source: 'auto_timer' },
            { event: 'enemy.hit', source: 'auto_timer' },
            { event: 'game.won', source: 'auto_timer' }
          ]
        },
        telemetryEvents: ['game.ready', 'game.started', 'player.moved', 'player.fired', 'enemy.hit', 'game.won'],
        dslConsumptionReport: { entries: [], summary: { unsupportedCount: 0, deferredCount: 0, ignoredAuthoritativeCount: 0 } }
      }
    });

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('interactive_runtime_evidence_missing');
  });

  it('fails closed when playable evidence lacks non-placeholder sprites or duration support', () => {
    const qaReport = buildInteractiveQaReport();
    delete qaReport.visual_asset_evidence;
    delete qaReport.playable_duration_support;

    const result = evaluateStep38DslConsumption({
      baselineCommit: STEP38_BASELINE_COMMIT,
      promptSha256: STEP38_EXPECTED_PROMPT_SHA256,
      modelName: STEP38_EXPECTED_PROVIDER_MODEL,
      realDeepSeekPathExecuted: true,
      dslConsumerPathUsed: true,
      rawGameDslResponsePresent: true,
      generatedArtifactRunSpecific: true,
      buildSucceeded: true,
      previewBooted: true,
      guardFlags: {
        fallback_used: false,
        preloaded_artifact_used: false,
        legacy_fixed_template_authority: false,
        stale_generated_artifact_used: false
      },
      artifacts: {
        canonicalDsl: {
          profile: { id: 'side_scrolling_run_and_gun.v1' },
          play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 },
          game: { genre: 'side_scrolling_run_and_gun' },
          capability_ids: ['movement.run_jump.v1', 'movement.crouch.v1', 'combat.projectile.v1', 'weapon.spread_shot.v1', 'spawn.enemy_wave.v1', 'enemy.boss_lifecycle.v1', 'ui.win_failure_transitions.v1'],
          progression: { estimated_total_sec: { min_sec: 480, max_sec: 720 }, segments: [{ id: 'approach' }, { id: 'bridge' }, { id: 'core' }] },
          waves: [{ id: 'wave_approach' }],
          pickups: [{ id: 'spread_pickup' }],
          bosses: [{ id: 'boss_core', phases: [{ id: 'phase_1' }, { id: 'phase_2' }] }],
          objectives: [{ kind: 'boss_defeated' }],
          entities: [{ role: 'player' }, { role: 'pickup' }, { role: 'boss' }],
          metadata: { title: '赤焰突围', tags: ['original_no_existing_ip'] }
        },
        runtimePlan: {
          profileId: 'side_scrolling_run_and_gun.v1',
          progression: { estimatedTotalSec: { min: 480, max: 720 }, segments: [{ id: 'approach' }, { id: 'bridge' }, { id: 'core' }] },
          gameplay: { waveIds: ['wave_approach'], pickupIds: ['spread_pickup'], bossIds: ['boss_core'], objectiveIds: ['boss_defeated'] },
          runtimeSystems: [
            { capabilityId: 'movement.run_jump.v1' },
            { capabilityId: 'movement.crouch.v1' },
            { capabilityId: 'combat.projectile.v1' },
            { capabilityId: 'spawn.enemy_wave.v1' },
            { capabilityId: 'health.player_health_points.v1' },
            { capabilityId: 'enemy.boss_lifecycle.v1' },
            { capabilityId: 'ui.win_failure_transitions.v1' }
          ]
        },
        sceneIr: {
          source: 'canonical_game_dsl_v0.2_runtime_plan',
          nodes: [{ kind: 'player_spawn' }, { kind: 'enemy_spawn' }, { kind: 'pickup' }, { kind: 'boss' }, { kind: 'goal' }]
        },
        runtimeManifest: {
          runtimeFamily: 'phaser_2d_action_arcade.v1',
          systems: [
            { capabilityId: 'movement.run_jump.v1' },
            { capabilityId: 'movement.crouch.v1' },
            { capabilityId: 'combat.projectile.v1' },
            { capabilityId: 'spawn.enemy_wave.v1' },
            { capabilityId: 'health.player_health_points.v1' },
            { capabilityId: 'enemy.boss_lifecycle.v1' },
            { capabilityId: 'ui.win_failure_transitions.v1' }
          ]
        },
        qaReport,
        telemetryEvents: ['game.ready', 'game.started', 'player.moved', 'player.fired', 'enemy.hit', 'game.won'],
        dslConsumptionReport: { entries: [], summary: { unsupportedCount: 0, deferredCount: 0, ignoredAuthoritativeCount: 0 } }
      }
    });

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toEqual(expect.arrayContaining(['visual_asset_evidence_missing', 'playable_duration_support_missing']));
  });

  it('fails closed when encounter coverage is too sparse for the duration target', () => {
    const qaReport = buildInteractiveQaReport();
    qaReport.encounter_coverage = {
      status: 'FAILED',
      expected_enemy_count: 12,
      realized_enemy_count: 12,
      minimum_enemy_count_for_duration: 40,
      encounter_band_count: 2,
      minimum_encounter_band_count_for_duration: 10,
      wave_segment_coverage_count: 1,
      minimum_wave_segment_coverage_count: 3,
      max_gap_between_encounter_bands_sec: 86,
      max_allowed_gap_between_encounter_bands_sec: 45,
      segments_below_minimum_band_count: ['bridge', 'core'],
      first_encounter_estimated_sec: 56,
      first_viewport_enemy_count: 0,
      static_enemy_node_count: 1,
      realized_static_enemy_node_count: 0,
      wave_node_count: 3,
      realized_wave_node_count: 3,
      pickup_node_count: 2,
      realized_pickup_node_count: 2,
      boss_node_count: 1,
      realized_boss_count: 1
    };

    const result = evaluateStep38DslConsumption({
      baselineCommit: STEP38_BASELINE_COMMIT,
      promptSha256: STEP38_EXPECTED_PROMPT_SHA256,
      modelName: STEP38_EXPECTED_PROVIDER_MODEL,
      realDeepSeekPathExecuted: true,
      dslConsumerPathUsed: true,
      rawGameDslResponsePresent: true,
      generatedArtifactRunSpecific: true,
      buildSucceeded: true,
      previewBooted: true,
      guardFlags: {
        fallback_used: false,
        preloaded_artifact_used: false,
        legacy_fixed_template_authority: false,
        stale_generated_artifact_used: false
      },
      artifacts: {
        canonicalDsl: {
          profile: { id: 'side_scrolling_run_and_gun.v1' },
          play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 },
          game: { genre: 'side_scrolling_run_and_gun' },
          capability_ids: ['movement.run_jump.v1', 'movement.crouch.v1', 'combat.projectile.v1', 'weapon.spread_shot.v1', 'spawn.enemy_wave.v1', 'enemy.boss_lifecycle.v1', 'ui.win_failure_transitions.v1'],
          progression: { estimated_total_sec: { min_sec: 480, max_sec: 720 }, segments: [{ id: 'approach' }, { id: 'bridge' }, { id: 'core' }] },
          waves: [{ id: 'wave_approach' }],
          pickups: [{ id: 'spread_pickup' }],
          bosses: [{ id: 'boss_core', phases: [{ id: 'phase_1' }, { id: 'phase_2' }] }],
          objectives: [{ kind: 'boss_defeated' }],
          entities: [{ role: 'player' }, { role: 'pickup' }, { role: 'boss' }],
          metadata: { title: '赤焰突围', tags: ['original_no_existing_ip'] }
        },
        runtimePlan: {
          profileId: 'side_scrolling_run_and_gun.v1',
          progression: { estimatedTotalSec: { min: 480, max: 720 }, segments: [{ id: 'approach' }, { id: 'bridge' }, { id: 'core' }] },
          gameplay: { waveIds: ['wave_approach'], pickupIds: ['spread_pickup'], bossIds: ['boss_core'], objectiveIds: ['boss_defeated'] },
          runtimeSystems: [
            { capabilityId: 'movement.run_jump.v1' },
            { capabilityId: 'movement.crouch.v1' },
            { capabilityId: 'combat.projectile.v1' },
            { capabilityId: 'spawn.enemy_wave.v1' },
            { capabilityId: 'health.player_health_points.v1' },
            { capabilityId: 'enemy.boss_lifecycle.v1' },
            { capabilityId: 'ui.win_failure_transitions.v1' }
          ]
        },
        sceneIr: {
          source: 'canonical_game_dsl_v0.2_runtime_plan',
          nodes: [{ kind: 'player_spawn' }, { kind: 'enemy_spawn' }, { kind: 'pickup' }, { kind: 'boss' }, { kind: 'goal' }]
        },
        runtimeManifest: {
          runtimeFamily: 'phaser_2d_action_arcade.v1',
          systems: [
            { capabilityId: 'movement.run_jump.v1' },
            { capabilityId: 'movement.crouch.v1' },
            { capabilityId: 'combat.projectile.v1' },
            { capabilityId: 'spawn.enemy_wave.v1' },
            { capabilityId: 'health.player_health_points.v1' },
            { capabilityId: 'enemy.boss_lifecycle.v1' },
            { capabilityId: 'ui.win_failure_transitions.v1' }
          ]
        },
        qaReport,
        telemetryEvents: ['game.ready', 'game.started', 'player.moved', 'player.fired', 'enemy.hit', 'game.won'],
        dslConsumptionReport: { entries: [], summary: { unsupportedCount: 0, deferredCount: 0, ignoredAuthoritativeCount: 0 } }
      }
    });

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('encounter_coverage_evidence_missing');
  });

  it('accepts preview-safe visual-slice encounter density only when product duration support remains proven', () => {
    const qaReport = buildInteractiveQaReport();
    qaReport.encounter_coverage = {
      status: 'PASSED',
      visual_slice_preview_mode: true,
      product_duration_coverage_status: 'PASSED',
      full_duration_runtime_coverage_status: 'FAILED',
      full_duration_runtime_coverage_disposition: 'DEFERRED_NON_BLOCKING',
      full_duration_runtime_coverage_deferred: true,
      full_duration_runtime_coverage_blocking_current_milestone: false,
      full_duration_enemy_count_disposition: 'DEFERRED_NON_BLOCKING',
      full_duration_encounter_band_count_disposition: 'DEFERRED_NON_BLOCKING',
      preview_visual_slice_coverage_status: 'PASSED',
      dsl_enemy_count: 17,
      expected_enemy_count: 40,
      realized_enemy_count: 17,
      preview_expected_enemy_count: 17,
      preview_realized_enemy_count: 17,
      minimum_enemy_count_for_duration: 40,
      encounter_band_count: 8,
      minimum_encounter_band_count_for_duration: 10,
      preview_minimum_encounter_band_count: 8,
      full_game_expansion_evidence: buildPassingFullGameExpansionEvidence(),
      wave_segment_coverage_count: 3,
      minimum_wave_segment_coverage_count: 3,
      max_gap_between_encounter_bands_sec: 3.5,
      max_allowed_gap_between_encounter_bands_sec: 45,
      segments_below_minimum_band_count: [],
      first_encounter_estimated_sec: 3.8,
      first_viewport_enemy_count: 4,
      static_enemy_node_count: 1,
      realized_static_enemy_node_count: 1,
      wave_node_count: 4,
      realized_wave_node_count: 5,
      pickup_node_count: 2,
      realized_pickup_node_count: 2,
      boss_node_count: 1,
      realized_boss_count: 1
    };

    const result = evaluateStep38DslConsumption(buildReadyEvaluationInput(qaReport));

    expect(result.readyState).toBe('READY_FOR_MANUAL_TEST');
    expect(result.blockers).not.toContain('encounter_coverage_evidence_missing');
    expect(result.blockers).not.toContain('playable_duration_support_missing');
  });

  it('blocks preview-safe visual-slice encounter density when full-duration failure is not marked deferred non-blocking', () => {
    const qaReport = buildInteractiveQaReport();
    qaReport.encounter_coverage = {
      status: 'PASSED',
      visual_slice_preview_mode: true,
      product_duration_coverage_status: 'PASSED',
      full_duration_runtime_coverage_status: 'FAILED',
      preview_visual_slice_coverage_status: 'PASSED',
      dsl_enemy_count: 17,
      expected_enemy_count: 40,
      realized_enemy_count: 17,
      preview_expected_enemy_count: 17,
      preview_realized_enemy_count: 17,
      minimum_enemy_count_for_duration: 40,
      encounter_band_count: 8,
      minimum_encounter_band_count_for_duration: 10,
      preview_minimum_encounter_band_count: 8,
      wave_segment_coverage_count: 3,
      minimum_wave_segment_coverage_count: 3,
      max_gap_between_encounter_bands_sec: 3.5,
      max_allowed_gap_between_encounter_bands_sec: 45,
      segments_below_minimum_band_count: [],
      first_encounter_estimated_sec: 3.8,
      first_viewport_enemy_count: 4,
      static_enemy_node_count: 1,
      realized_static_enemy_node_count: 1,
      wave_node_count: 4,
      realized_wave_node_count: 5,
      pickup_node_count: 2,
      realized_pickup_node_count: 2,
      boss_node_count: 1,
      realized_boss_count: 1
    };

    const result = evaluateStep38DslConsumption(buildReadyEvaluationInput(qaReport));

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('encounter_coverage_evidence_missing');
  });

  it('evaluates full-game expansion evidence without letting preview visual slice coverage imply full-duration pass', () => {
    const result = evaluateStep38FullGameExpansionEvidence(
      {
        play_time_intent_seconds: { min: 480, max: 720 },
        runtime_coverage_seconds: 50,
        mission_complete_reached: false,
        encounter_band_count: 8,
        enemy_spawn_count: 17,
        enemy_defeat_count: 17,
        preview_visual_slice_coverage_status: 'PASSED',
        full_duration_runtime_coverage_status: 'FAILED',
        model_fallback_used: false,
        procedural_asset_fallback_used: true,
        failure_reasons: []
      },
      {
        minimumEncounterBandCount: 10,
        minimumEnemySpawnCount: 40,
        minimumEnemyDefeatCount: 40
      }
    );

    expect(result.status).toBe('FAILED');
    expect(result.preview_visual_slice_coverage_status).toBe('PASSED');
    expect(result.full_duration_runtime_coverage_status).toBe('FAILED');
    expect(result.model_fallback_used).toBe(false);
    expect(result.procedural_asset_fallback_used).toBe(true);
    expect(result.failure_reasons).toEqual(
      expect.arrayContaining([
        'runtime_coverage_below_play_time_intent_min',
        'mission_complete_not_reached',
        'encounter_band_count_below_threshold',
        'enemy_spawn_count_below_threshold',
        'enemy_defeat_count_below_threshold',
        'full_duration_runtime_coverage_not_passed'
      ])
    );
  });

  it('fails full-game expansion evidence when runtime coverage is missing or out of the requested band', () => {
    const thresholds = {
      minimumEncounterBandCount: 10,
      minimumEnemySpawnCount: 40,
      minimumEnemyDefeatCount: 40
    };

    expect(
      evaluateStep38FullGameExpansionEvidence(
        {
          play_time_intent_seconds: { min: 480, max: 720 },
          mission_complete_reached: true,
          mission_complete_time_seconds: 600,
          encounter_band_count: 10,
          enemy_spawn_count: 40,
          enemy_defeat_count: 40,
          preview_visual_slice_coverage_status: 'FAILED',
          full_duration_runtime_coverage_status: 'PASSED'
        },
        thresholds
      ).failure_reasons
    ).toContain('missing_runtime_coverage');

    expect(
      evaluateStep38FullGameExpansionEvidence(
        {
          play_time_intent_seconds: { min: 480, max: 720 },
          runtime_coverage_seconds: 900,
          mission_complete_reached: true,
          mission_complete_time_seconds: 900,
          encounter_band_count: 10,
          enemy_spawn_count: 40,
          enemy_defeat_count: 40,
          preview_visual_slice_coverage_status: 'NOT_APPLICABLE',
          full_duration_runtime_coverage_status: 'PASSED'
        },
        thresholds
      ).failure_reasons
    ).toContain('runtime_coverage_above_play_time_intent_max');
  });

  it('passes full-game expansion evidence only when duration, completion, encounter, and enemy thresholds are satisfied', () => {
    const result = evaluateStep38FullGameExpansionEvidence(buildPassingFullGameExpansionEvidence(), {
      minimumEncounterBandCount: 10,
      minimumEnemySpawnCount: 40,
      minimumEnemyDefeatCount: 40
    });

    expect(result).toMatchObject({
      status: 'PASSED',
      preview_visual_slice_coverage_status: 'NOT_APPLICABLE',
      full_duration_runtime_coverage_status: 'PASSED',
      model_fallback_used: false,
      procedural_asset_fallback_used: false,
      failure_reasons: []
    });
  });

  it('blocks preview-safe visual-slice encounter density when product duration status is not proven', () => {
    const qaReport = buildInteractiveQaReport();
    qaReport.encounter_coverage = {
      ...(qaReport.encounter_coverage as Record<string, unknown>),
      status: 'PASSED',
      visual_slice_preview_mode: true,
      product_duration_coverage_status: 'FAILED',
      full_duration_runtime_coverage_status: 'FAILED',
      preview_visual_slice_coverage_status: 'PASSED',
      expected_enemy_count: 40,
      realized_enemy_count: 17,
      preview_expected_enemy_count: 17,
      preview_realized_enemy_count: 17,
      minimum_enemy_count_for_duration: 40,
      encounter_band_count: 8,
      minimum_encounter_band_count_for_duration: 10,
      preview_minimum_encounter_band_count: 8
    };

    const result = evaluateStep38DslConsumption(buildReadyEvaluationInput(qaReport));

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('encounter_coverage_evidence_missing');
  });

  it('fails closed when enemy totals pass but encounter bands do not cover the full run', () => {
    const qaReport = buildInteractiveQaReport();
    qaReport.encounter_coverage = {
      status: 'FAILED',
      expected_enemy_count: 72,
      realized_enemy_count: 72,
      minimum_enemy_count_for_duration: 40,
      encounter_band_count: 4,
      minimum_encounter_band_count_for_duration: 10,
      wave_segment_coverage_count: 1,
      minimum_wave_segment_coverage_count: 3,
      max_gap_between_encounter_bands_sec: 190,
      max_allowed_gap_between_encounter_bands_sec: 45,
      segments_below_minimum_band_count: ['metal_bridge', 'enemy_core'],
      first_encounter_estimated_sec: 3,
      first_viewport_enemy_count: 3,
      static_enemy_node_count: 1,
      realized_static_enemy_node_count: 1,
      wave_node_count: 3,
      realized_wave_node_count: 3,
      pickup_node_count: 2,
      realized_pickup_node_count: 2,
      boss_node_count: 1,
      realized_boss_count: 1
    };

    const result = evaluateStep38DslConsumption({
      baselineCommit: STEP38_BASELINE_COMMIT,
      promptSha256: STEP38_EXPECTED_PROMPT_SHA256,
      modelName: STEP38_EXPECTED_PROVIDER_MODEL,
      realDeepSeekPathExecuted: true,
      dslConsumerPathUsed: true,
      rawGameDslResponsePresent: true,
      generatedArtifactRunSpecific: true,
      buildSucceeded: true,
      previewBooted: true,
      guardFlags: {
        fallback_used: false,
        preloaded_artifact_used: false,
        legacy_fixed_template_authority: false,
        stale_generated_artifact_used: false
      },
      artifacts: {
        canonicalDsl: {
          profile: { id: 'side_scrolling_run_and_gun.v1' },
          play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 },
          game: { genre: 'side_scrolling_run_and_gun' },
          capability_ids: ['movement.run_jump.v1', 'movement.crouch.v1', 'combat.projectile.v1', 'weapon.spread_shot.v1', 'spawn.enemy_wave.v1', 'enemy.boss_lifecycle.v1', 'ui.win_failure_transitions.v1'],
          progression: { estimated_total_sec: { min_sec: 480, max_sec: 720 }, segments: [{ id: 'jungle_entrance' }, { id: 'metal_bridge' }, { id: 'enemy_core' }] },
          waves: [{ id: 'wave_jungle_patrol' }, { id: 'wave_core_one' }, { id: 'wave_core_two' }],
          pickups: [{ id: 'spread_pickup' }],
          bosses: [{ id: 'boss_core', phases: [{ id: 'phase_1' }, { id: 'phase_2' }] }],
          objectives: [{ kind: 'boss_defeated' }],
          entities: [{ role: 'player' }, { role: 'pickup' }, { role: 'boss' }],
          metadata: { title: '赤焰突围', tags: ['original_no_existing_ip'] }
        },
        runtimePlan: {
          profileId: 'side_scrolling_run_and_gun.v1',
          progression: { estimatedTotalSec: { min: 480, max: 720 }, segments: [{ id: 'jungle_entrance' }, { id: 'metal_bridge' }, { id: 'enemy_core' }] },
          gameplay: { waveIds: ['wave_jungle_patrol', 'wave_core_one', 'wave_core_two'], pickupIds: ['spread_pickup'], bossIds: ['boss_core'], objectiveIds: ['boss_defeated'] },
          runtimeSystems: [
            { capabilityId: 'movement.run_jump.v1' },
            { capabilityId: 'movement.crouch.v1' },
            { capabilityId: 'combat.projectile.v1' },
            { capabilityId: 'spawn.enemy_wave.v1' },
            { capabilityId: 'health.player_health_points.v1' },
            { capabilityId: 'enemy.boss_lifecycle.v1' },
            { capabilityId: 'ui.win_failure_transitions.v1' }
          ]
        },
        sceneIr: {
          source: 'canonical_game_dsl_v0.2_runtime_plan',
          nodes: [{ kind: 'player_spawn' }, { kind: 'enemy_spawn' }, { kind: 'pickup' }, { kind: 'boss' }, { kind: 'goal' }]
        },
        runtimeManifest: {
          runtimeFamily: 'phaser_2d_action_arcade.v1',
          systems: [
            { capabilityId: 'movement.run_jump.v1' },
            { capabilityId: 'movement.crouch.v1' },
            { capabilityId: 'combat.projectile.v1' },
            { capabilityId: 'spawn.enemy_wave.v1' },
            { capabilityId: 'health.player_health_points.v1' },
            { capabilityId: 'enemy.boss_lifecycle.v1' },
            { capabilityId: 'ui.win_failure_transitions.v1' }
          ]
        },
        qaReport,
        telemetryEvents: ['game.ready', 'game.started', 'player.moved', 'player.fired', 'enemy.hit', 'game.won'],
        dslConsumptionReport: { entries: [], summary: { unsupportedCount: 0, deferredCount: 0, ignoredAuthoritativeCount: 0 } }
      }
    });

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('encounter_coverage_evidence_missing');
  });

  it('does not collapse visual or duration evidence into the interactive runtime blocker', () => {
    const qaReport = buildInteractiveQaReport();
    qaReport.status = 'FAILED';
    qaReport.playable_state = {
      playerMovedByInput: true,
      projectileHitEnemy: true,
      pickupCollected: true,
      bossPhaseChanged: false,
      winReached: false
    };

    const result = evaluateStep38DslConsumption({
      baselineCommit: STEP38_BASELINE_COMMIT,
      promptSha256: STEP38_EXPECTED_PROMPT_SHA256,
      modelName: STEP38_EXPECTED_PROVIDER_MODEL,
      realDeepSeekPathExecuted: true,
      dslConsumerPathUsed: true,
      rawGameDslResponsePresent: true,
      generatedArtifactRunSpecific: true,
      buildSucceeded: true,
      previewBooted: true,
      guardFlags: {
        fallback_used: false,
        preloaded_artifact_used: false,
        legacy_fixed_template_authority: false,
        stale_generated_artifact_used: false
      },
      artifacts: {
        canonicalDsl: {
          profile: { id: 'side_scrolling_run_and_gun.v1' },
          play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 },
          game: { genre: 'side_scrolling_run_and_gun' },
          capability_ids: ['movement.run_jump.v1', 'movement.crouch.v1', 'combat.projectile.v1', 'weapon.spread_shot.v1', 'spawn.enemy_wave.v1', 'enemy.boss_lifecycle.v1', 'ui.win_failure_transitions.v1'],
          progression: { estimated_total_sec: { min_sec: 480, max_sec: 720 }, segments: [{ id: 'approach' }, { id: 'bridge' }, { id: 'core' }] },
          waves: [{ id: 'wave_approach' }],
          pickups: [{ id: 'spread_pickup' }],
          bosses: [{ id: 'boss_core', phases: [{ id: 'phase_1' }, { id: 'phase_2' }] }],
          objectives: [{ kind: 'boss_defeated' }],
          entities: [{ role: 'player' }, { role: 'pickup' }, { role: 'boss' }],
          metadata: { title: '赤焰突围', tags: ['original_no_existing_ip'] }
        },
        runtimePlan: {
          profileId: 'side_scrolling_run_and_gun.v1',
          progression: { estimatedTotalSec: { min: 480, max: 720 }, segments: [{ id: 'approach' }, { id: 'bridge' }, { id: 'core' }] },
          gameplay: { waveIds: ['wave_approach'], pickupIds: ['spread_pickup'], bossIds: ['boss_core'], objectiveIds: ['boss_defeated'] },
          runtimeSystems: [
            { capabilityId: 'movement.run_jump.v1' },
            { capabilityId: 'movement.crouch.v1' },
            { capabilityId: 'combat.projectile.v1' },
            { capabilityId: 'spawn.enemy_wave.v1' },
            { capabilityId: 'health.player_health_points.v1' },
            { capabilityId: 'enemy.boss_lifecycle.v1' },
            { capabilityId: 'ui.win_failure_transitions.v1' }
          ]
        },
        sceneIr: {
          source: 'canonical_game_dsl_v0.2_runtime_plan',
          nodes: [{ kind: 'player_spawn' }, { kind: 'enemy_spawn' }, { kind: 'pickup' }, { kind: 'boss' }, { kind: 'goal' }]
        },
        runtimeManifest: {
          runtimeFamily: 'phaser_2d_action_arcade.v1',
          systems: [
            { capabilityId: 'movement.run_jump.v1' },
            { capabilityId: 'movement.crouch.v1' },
            { capabilityId: 'combat.projectile.v1' },
            { capabilityId: 'spawn.enemy_wave.v1' },
            { capabilityId: 'health.player_health_points.v1' },
            { capabilityId: 'enemy.boss_lifecycle.v1' },
            { capabilityId: 'ui.win_failure_transitions.v1' }
          ]
        },
        qaReport,
        telemetryEvents: ['game.ready', 'game.started', 'player.moved', 'player.fired', 'enemy.hit', 'game.won'],
        dslConsumptionReport: { entries: [], summary: { unsupportedCount: 0, deferredCount: 0, ignoredAuthoritativeCount: 0 } }
      }
    });

    expect(result.readyState).toBe('BLOCKED');
    expect(result.blockers).toContain('interactive_runtime_evidence_missing');
    expect(result.blockers).not.toContain('visual_asset_evidence_missing');
    expect(result.blockers).not.toContain('playable_duration_support_missing');
  });

  it('uses merged input-only projectile hit events to validate enemy counterfire behavior', () => {
    const qaReport = buildInteractiveQaReport();
    const enemyBehavior = qaReport.enemy_behavior_evidence as Record<string, unknown>;
    enemyBehavior.status = 'FAILED';
    enemyBehavior.realized_enemy_behavior_capability_count = 2;
    enemyBehavior.player_damage_from_enemy_projectile_count = 0;

    const result = evaluateStep38DslConsumption(buildReadyEvaluationInput(qaReport));

    expect(result.readyState).toBe('READY_FOR_MANUAL_TEST');
    expect(result.blockers).not.toContain('enemy_behavior_evidence_missing');
  });
});

function buildSharedAssetIntentDsl(): Parameters<typeof buildStep38SpriteAssets>[0] {
  const sharedVisual = (role: string, silhouette: string, primary: string, accent: string) => ({
    asset_intent_ref: 'original_16bit_pixel_art',
    role,
    silhouette,
    palette: { primary, accent, outline: '#000000' }
  });

  return {
    artifactKind: 'canonical_game_dsl',
    schema_version: 'game-dsl.v0.2',
    projectId: 'proj_step38_sprite_asset_test',
    runId: 'run_step38_sprite_asset_test',
    source: {
      game_brief_hash: 'fnv1a_game_brief',
      profile_resolution_hash: 'fnv1a_profile_resolution',
      capability_lock_hash: 'fnv1a_capability_lock',
      composed_schema_hash: 'fnv1a_composed_schema',
      draft_hash: 'fnv1a_draft'
    },
    profile: { id: 'side_scrolling_run_and_gun.v1', runtime_family: 'phaser_2d_action_arcade.v1' },
    play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 },
    capability_ids: [
      'movement.run_jump.v1',
      'combat.projectile.v1',
      'spawn.enemy_wave.v1',
      'enemy.boss_lifecycle.v1',
      'scene.visual_presentation_metadata.v1'
    ],
    progression: {
      estimated_total_sec: { min_sec: 480, max_sec: 720 },
      segments: [
        { id: 'jungle_entrance', order: 0, duration_target_sec: { min_sec: 160, max_sec: 240 }, capability_ids: ['spawn.enemy_wave.v1'] },
        { id: 'metal_bridge', order: 1, duration_target_sec: { min_sec: 160, max_sec: 240 }, capability_ids: ['spawn.enemy_wave.v1'] },
        { id: 'enemy_core', order: 2, duration_target_sec: { min_sec: 160, max_sec: 240 }, capability_ids: ['enemy.boss_lifecycle.v1'] }
      ]
    },
    scenes: [
      {
        id: 'main_scene',
        segment_ids: ['jungle_entrance', 'metal_bridge', 'enemy_core'],
        entity_ids: ['player', 'patrol_infantry', 'fixed_turret', 'flying_enemy', 'molten_core_guard'],
        capability_ids: ['scene.visual_presentation_metadata.v1'],
        config: {
          visual_theme: '16-bit pixel art run-and-gun with jungle, metal, and industrial core environments',
          environment_visuals: [
            {
              segment_id: 'jungle_entrance',
              motif: 'dense jungle foliage',
              palette: ['#2d5a27', '#8b5e3c', '#4a7c59']
            }
          ]
        }
      }
    ],
    entities: [
      {
        id: 'player',
        role: 'player',
        tags: ['player'],
        capability_ids: ['movement.run_jump.v1', 'combat.projectile.v1'],
        config: { visual: sharedVisual('player_character', 'humanoid with combat gear, helmet, and rifle', '#cc3300', '#ffcc00') }
      },
      {
        id: 'patrol_infantry',
        role: 'enemy',
        tags: ['enemy', 'ground'],
        capability_ids: ['enemy.patrol_infantry.v1', 'combat.projectile.v1'],
        config: { visual: sharedVisual('enemy_soldier', 'humanoid soldier with rifle, walking', '#556b2f', '#8b4513') }
      },
      {
        id: 'fixed_turret',
        role: 'enemy',
        tags: ['enemy', 'ranged', 'static'],
        capability_ids: ['enemy.fixed_turret.v1', 'combat.projectile.v1'],
        config: { visual: sharedVisual('enemy_turret', 'mounted gun turret with rotating barrel', '#708090', '#ff0000') }
      },
      {
        id: 'flying_enemy',
        role: 'enemy',
        tags: ['enemy', 'flying'],
        capability_ids: ['enemy.flying_right_entry.v1', 'combat.projectile.v1'],
        config: { visual: sharedVisual('enemy_flying', 'small drone with wings and gun', '#b0c4de', '#ff6347') }
      },
      {
        id: 'player_projectile',
        role: 'projectile',
        tags: ['projectile'],
        capability_ids: ['combat.projectile.v1'],
        config: { visual: sharedVisual('projectile', 'small bullet', '#ffff00', '#ffa500') }
      },
      {
        id: 'rapid_fire_pickup',
        role: 'pickup',
        tags: ['pickup', 'weapon'],
        capability_ids: ['pickup.weapon_supply.v1', 'weapon.rapid_fire.v1'],
        config: { visual: sharedVisual('pickup', 'glowing icon with multiple bullets', '#00bfff', '#ffffff') }
      },
      {
        id: 'falling_area_hazard',
        role: 'hazard',
        tags: ['hazard'],
        capability_ids: ['hazard.falling_area.v1'],
        config: { visual: sharedVisual('hazard', 'falling debris zone', '#8b0000', '#ff6347') }
      },
      {
        id: 'molten_core_guard',
        role: 'boss',
        tags: ['boss'],
        capability_ids: ['enemy.boss_lifecycle.v1', 'enemy.boss_attack_pattern.v1'],
        config: { visual: sharedVisual('boss', 'large mechanical humanoid with molten core', '#8b0000', '#ff4500') }
      }
    ],
    systems: [],
    objectives: [],
    waves: [],
    pickups: [],
    bosses: [],
    metadata: { title: 'Step38 Sprite Asset Test', tags: ['step38'] }
  };
}

function buildCounterfactualVisualIntentDsl(themeId: 'jungle_metal_core' | 'ice_neon_temple'): Parameters<typeof buildStep38SpriteAssets>[0] {
  const dsl = JSON.parse(JSON.stringify(buildSharedAssetIntentDsl())) as Record<string, unknown>;
  const theme =
    themeId === 'jungle_metal_core'
      ? {
          visual_theme: '16-bit pixel art run-and-gun with jungle, metal, and industrial core environments',
          motif: 'jungle canopy, metal struts, reactor glow, industrial_core pipes',
          palette: ['#2d5a27', '#8b5e3c', '#4a7c59'],
          motifs: ['jungle', 'metal', 'industrial_core'],
          colors: ['#cc3300', '#ffcc00', '#0f172a']
        }
      : {
          visual_theme: '16-bit pixel art run-and-gun with ice, neon, and cyber temple environments',
          motif: 'ice crystals, neon circuitry, cyber_temple arches',
          palette: ['#7dd3fc', '#c084fc', '#e0f2fe'],
          motifs: ['ice', 'neon', 'cyber_temple'],
          colors: ['#38bdf8', '#c084fc', '#082f49']
        };
  const scenes = dsl.scenes as Array<Record<string, unknown>>;
  scenes[0].config = {
    ...(scenes[0].config as Record<string, unknown>),
    visual_theme: theme.visual_theme,
    environment_visuals: [{ segment_id: 'jungle_entrance', motif: theme.motif, palette: theme.palette }]
  };
  const entities = dsl.entities as Array<Record<string, unknown>>;
  entities.forEach((entity, index) => {
    const config = entity.config as Record<string, unknown>;
    const visual = config.visual as Record<string, unknown>;
    visual.asset_intent_ref = `${entity.id}_${themeId}_visual_art`;
    visual.silhouette = `${themeId}_${entity.role}_${index}_silhouette_with_${theme.motifs.join('_')}`;
    visual.palette = {
      primary: theme.colors[index % theme.colors.length],
      accent: theme.colors[(index + 1) % theme.colors.length],
      outline: theme.colors[(index + 2) % theme.colors.length]
    };
  });
  return dsl as Parameters<typeof buildStep38SpriteAssets>[0];
}

function buildAssetTemplateFingerprintReport(
  overrides: Partial<Record<string, unknown>> = {},
  assetOverrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  const assets = STEP38_TEST_REQUIRED_VISUAL_RUNTIME_OBJECTS.map((requiredObject) => ({
    canonical_id: `canonical_${requiredObject}`,
    required_object: requiredObject,
    asset_format: 'runtime_canvas_texture',
    final_pass_renderer: 'runtime_canvas_texture',
    renderer_kind: 'canvas_texture',
    visual_intent_sha: 'b'.repeat(64),
    asset_design_spec_sha: 'c'.repeat(64),
    rendered_canvas_pixel_sha: 'd'.repeat(64),
    canvas_pixel_fingerprint: 'd'.repeat(64),
    template_fingerprint: `${requiredObject}_dsl_template_fingerprint`,
    matches_known_static_template: false,
    role_only_generation_detected: false,
    dsl_motif_coverage: ['jungle', 'metal', 'industrial_core'],
    geometry_signature: `${requiredObject}_dsl_geometry_signature`,
    dsl_geometry_fingerprint: 'd'.repeat(64),
    role_static_control_fingerprint: 'e'.repeat(64),
    visual_geometry_dependency: true,
    distinct_silhouette: true,
    placeholder: false,
    ...assetOverrides
  }));
  return {
    schemaVersion: 'step38.asset-template-fingerprint-report.v1',
    source: 'canonical_dsl_visual_asset_materializer',
    role_static_svg_template_used: false,
    old_svgForVisualIntent_used: false,
    template_derived_placeholder_detected: false,
    template_similarity_blockers: [],
    assets,
    ...overrides
  };
}

function buildVisualDesignRealizationReport(
  gateOverrides: Partial<Record<string, unknown>> = {},
  requiredObjectOverrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  const requiredObjects = Object.fromEntries(
    STEP38_TEST_REQUIRED_VISUAL_RUNTIME_OBJECTS.map((requiredObject) => [
      requiredObject,
      {
        dsl_derived: true,
        template_static: false,
        motif_coverage: true,
        distinct_silhouette: true,
        visible_in_screenshot: true,
        placeholder: false,
        visual_intent_sha: 'b'.repeat(64),
        asset_design_spec_sha: 'c'.repeat(64),
        ...requiredObjectOverrides
      }
    ])
  );
  return {
    schemaVersion: 'step38.visual-design-realization-report.v1',
    source: 'fresh_browser_screenshots',
    ...proceduralCanvasBackendPolicy(),
    ...freshManualInputOnlyEvidencePolicy(),
    visual_design_realization_gate: {
      verdict: 'PASS',
      ...proceduralCanvasBackendPolicy(),
      ...freshManualInputOnlyEvidencePolicy(),
      role_static_templates_used: false,
      old_svgForVisualIntent_used: false,
      template_derived_placeholder_detected: false,
      visual_intent_affects_asset_geometry: true,
      visual_intent_affects_palette: true,
      visual_intent_affects_silhouette: true,
      visual_intent_affects_environment_layers: true,
      object_classes_visibly_distinct: true,
      operator_visible_art_ready: true,
      ...gateOverrides
    },
    required_objects: requiredObjects
  };
}

function proceduralCanvasBackendPolicy(): Record<string, unknown> {
  return {
    active_visual_asset_backend: 'procedural_canvas_v1',
    current_backend: 'procedural_canvas_v1',
    future_visual_asset_backend: 'image_provider_v1',
    image_provider_v1_enabled: false,
    external_art_used: false,
    png_core_fix_used: false,
    old_environment_resource_logic_used: false,
    target_fidelity: 'procedural_pixel_art_readable_v1'
  };
}

function freshManualInputOnlyEvidencePolicy(): Record<string, unknown> {
  return {
    screenshot_source: 'fresh_manual_playthrough_input_only',
    capture_mode: 'manual_input_only',
    input_policy: 'input_only',
    runtime_operator_snapshot_only: false,
    stale_evidence: false,
    gate_reader_id: 'step38.final_gate_reader.v1'
  };
}

function buildStep38VisualEntities(): Array<Record<string, unknown>> {
  return [
    {
      id: 'player',
      role: 'player',
      capability_ids: ['movement.run_jump.v1', 'combat.projectile.v1'],
      config: { visual: { asset_intent_ref: 'player_red_runner', role: 'player_character', silhouette: 'runner_with_rifle', palette: { primary: '#facc15', accent: '#38bdf8', outline: '#fef3c7' } } }
    },
    {
      id: 'patrol_infantry',
      role: 'enemy',
      capability_ids: ['enemy.patrol_infantry.v1', 'combat.projectile.v1'],
      config: { visual: { asset_intent_ref: 'enemy_patrol_red', role: 'enemy_soldier', silhouette: 'ground_patrol_rifleman', palette: { primary: '#ef4444', accent: '#111827', outline: '#fecaca' } } }
    },
    {
      id: 'fixed_turret',
      role: 'enemy',
      capability_ids: ['enemy.fixed_turret.v1', 'combat.projectile.v1', 'spawn.static.v1'],
      config: { visual: { asset_intent_ref: 'enemy_fixed_turret', role: 'enemy_turret', silhouette: 'mounted_burst_turret', palette: { primary: '#94a3b8', accent: '#ef4444', outline: '#e2e8f0' } } }
    },
    {
      id: 'flying_enemy',
      role: 'enemy',
      capability_ids: ['enemy.flying_right_entry.v1', 'combat.projectile.v1'],
      config: { visual: { asset_intent_ref: 'enemy_flying_wing', role: 'enemy_flyer', silhouette: 'winged_drone', palette: { primary: '#fb7185', accent: '#0f172a', outline: '#ffe4e6' } } }
    },
    {
      id: 'weapon_pickup',
      role: 'pickup',
      capability_ids: ['pickup.weapon_supply.v1', 'weapon.spread_shot.v1'],
      config: { visual: { asset_intent_ref: 'weapon_supply_green_orb', role: 'weapon_pickup', silhouette: 'weapon_supply_capsule', palette: { primary: '#22c55e', accent: '#052e16', outline: '#bbf7d0' } } }
    },
    {
      id: 'flare_projectile',
      role: 'projectile',
      capability_ids: ['combat.projectile.v1'],
      config: { visual: { asset_intent_ref: 'projectile_flare', role: 'projectile', silhouette: 'orange_energy_bolt', palette: { primary: '#f97316', accent: '#fed7aa', outline: '#431407' } } }
    },
    {
      id: 'timed_explosion_zone',
      role: 'hazard',
      capability_ids: ['hazard.timed_explosion.v1'],
      config: { visual: { asset_intent_ref: 'hazard_warning_triangle', role: 'explosion_marker', silhouette: 'warning_triangle', palette: { primary: '#f59e0b', accent: '#111827', outline: '#fde68a' } } }
    },
    {
      id: 'molten_core_guard',
      role: 'boss',
      capability_ids: ['enemy.boss_lifecycle.v1', 'enemy.boss_attack_pattern.v1'],
      config: { visual: { asset_intent_ref: 'boss_molten_core_guard', role: 'boss_mecha', silhouette: 'armored_molten_core_guard', palette: { primary: '#a855f7', accent: '#f97316', outline: '#f5d0fe' } } }
    }
  ];
}

function buildReadyEvaluationInput(qaReport: Record<string, unknown>): Parameters<typeof evaluateStep38DslConsumption>[0] {
  return {
    baselineCommit: STEP38_BASELINE_COMMIT,
    promptSha256: STEP38_EXPECTED_PROMPT_SHA256,
    modelName: STEP38_EXPECTED_PROVIDER_MODEL,
    realDeepSeekPathExecuted: true,
    dslConsumerPathUsed: true,
    rawGameDslResponsePresent: true,
    generatedArtifactRunSpecific: true,
    buildSucceeded: true,
    previewBooted: true,
    guardFlags: {
      fallback_used: false,
      preloaded_artifact_used: false,
      legacy_fixed_template_authority: false,
      stale_generated_artifact_used: false
    },
    artifacts: {
      canonicalDsl: {
        profile: { id: 'side_scrolling_run_and_gun.v1' },
        play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 },
        game: { genre: 'side_scrolling_run_and_gun' },
        capability_ids: [
          'movement.run_jump.v1',
          'movement.crouch.v1',
          'combat.projectile.v1',
          'weapon.spread_shot.v1',
          'spawn.enemy_wave.v1',
          'scene.ordered_segments.v1',
          'scene.visual_presentation_metadata.v1',
          'enemy.boss_lifecycle.v1',
          'enemy.boss_attack_pattern.v1',
          'health.player_health_points.v1',
          'ui.hud_player_health.v1',
          'ui.win_failure_transitions.v1'
        ],
        scenes: [
          {
            id: 'main_scene',
            config: {
              visual_theme: 'original_16bit_jungle_metal_core'
            }
          }
        ],
        progression: { estimated_total_sec: { min_sec: 480, max_sec: 720 }, segments: [{ id: 'jungle_entrance' }, { id: 'metal_bridge' }, { id: 'enemy_core' }] },
        waves: [{ id: 'wave_jungle_patrol' }, { id: 'wave_bridge_flyers' }, { id: 'wave_core_one' }, { id: 'wave_core_two' }],
        pickups: [{ id: 'spread_pickup' }],
        bosses: [{ id: 'boss_core', phases: [{ id: 'phase_1' }, { id: 'phase_2' }] }],
        objectives: [{ kind: 'boss_defeated' }],
        entities: buildStep38VisualEntities(),
        metadata: { title: '赤焰突围', tags: ['original_no_existing_ip'] }
      },
      runtimePlan: {
        profileId: 'side_scrolling_run_and_gun.v1',
        progression: { estimatedTotalSec: { min: 480, max: 720 }, segments: [{ id: 'jungle_entrance' }, { id: 'metal_bridge' }, { id: 'enemy_core' }] },
        gameplay: { waveIds: ['wave_jungle_patrol', 'wave_bridge_flyers', 'wave_core_one', 'wave_core_two'], pickupIds: ['spread_pickup'], bossIds: ['boss_core'], objectiveIds: ['boss_defeated'] },
        runtimeSystems: [
          { capabilityId: 'movement.run_jump.v1' },
          { capabilityId: 'movement.crouch.v1' },
          { capabilityId: 'combat.projectile.v1' },
          { capabilityId: 'spawn.enemy_wave.v1' },
          { capabilityId: 'scene.visual_presentation_metadata.v1' },
          { capabilityId: 'health.player_health_points.v1' },
          { capabilityId: 'enemy.boss_lifecycle.v1' },
          { capabilityId: 'enemy.boss_attack_pattern.v1' },
          { capabilityId: 'ui.win_failure_transitions.v1' }
        ]
      },
      sceneIr: {
        source: 'canonical_game_dsl_v0.2_runtime_plan',
        visualIntent: {
          source: 'canonical_dsl_visual_intent',
          sceneVisualTheme: 'original_16bit_jungle_metal_core',
          requiredVisualRoles: STEP38_TEST_REQUIRED_VISUAL_ROLES,
          missingVisualRoles: [],
          canonicalVisualIntentCount: 8
        },
        nodes: [
          { kind: 'visual_intent_manifest' },
          { kind: 'player_spawn', visualAssetIntentRef: 'player_red_runner' },
          { kind: 'enemy_spawn', visualAssetIntentRef: 'enemy_patrol_red' },
          { kind: 'enemy_spawn', visualAssetIntentRef: 'enemy_flying_wing' },
          { kind: 'enemy_spawn', visualAssetIntentRef: 'enemy_fixed_turret' },
          { kind: 'pickup', visualAssetIntentRef: 'weapon_supply_green_orb' },
          { kind: 'projectile', visualAssetIntentRef: 'projectile_flare' },
          { kind: 'hazard', visualAssetIntentRef: 'hazard_warning_triangle' },
          { kind: 'boss', visualAssetIntentRef: 'boss_molten_core_guard' },
          { kind: 'goal' }
        ]
      },
      runtimeManifest: {
        runtimeFamily: 'phaser_2d_action_arcade.v1',
        systems: [
          { capabilityId: 'movement.run_jump.v1' },
          { capabilityId: 'movement.crouch.v1' },
          { capabilityId: 'combat.projectile.v1' },
          { capabilityId: 'spawn.enemy_wave.v1' },
          { capabilityId: 'scene.visual_presentation_metadata.v1' },
          { capabilityId: 'health.player_health_points.v1' },
          { capabilityId: 'enemy.boss_lifecycle.v1' },
          { capabilityId: 'enemy.boss_attack_pattern.v1' },
          { capabilityId: 'ui.win_failure_transitions.v1' }
        ]
      },
      qaReport,
      manualVerticalSliceProjection: buildManualVerticalSliceProjection(),
      visualRuntimeBindingReport: buildVisualRuntimeBindingReport(),
      visualAssetMaterializationReport: buildVisualAssetMaterializationReport(),
      assetTemplateFingerprintReport: buildAssetTemplateFingerprintReport(),
      visualDesignRealizationReport: buildVisualDesignRealizationReport(),
      runtimeTextureLoadReport: buildRuntimeTextureLoadReport(),
      artDirectionQualityReport: buildArtDirectionQualityReport(),
      encounterDirectorPlan: buildEncounterDirectorPlan(),
      encounterDirectorRuntimeEvidence: buildEncounterDirectorRuntimeEvidence(),
      outcomeStateMachineReport: buildOutcomeStateMachineReport(),
      winPathEvidence: buildWinPathEvidence(),
      losePathEvidence: buildLosePathEvidence(),
      successRouteMilestoneTimeline: buildSuccessRouteMilestoneTimeline(),
      routePressureBandEvidence: buildRoutePressureBandEvidence(),
      realPlaythroughCompletionEvidence: buildRealPlaythroughCompletionEvidence(),
      twoDGameplayPlaythroughGate: buildTwoDGameplayPlaythroughGate(),
      canvasVisualReadabilityGate: buildCanvasVisualReadabilityGate(),
      proceduralPixelArtGrammarReport: buildProceduralPixelArtGrammarReport(),
      canvasArtFidelityGate: buildCanvasArtFidelityGate(),
      spriteAnimationCoverageReport: buildSpriteAnimationCoverageReport(),
      environmentLayeringReport: buildEnvironmentLayeringReport(),
      startupSurvivabilityGate: buildStartupSurvivabilityGate(),
      encounterPlayabilityGate: buildEncounterPlayabilityGate(),
      operatorVisibleArtGate: buildOperatorVisibleArtGate(),
      visualPlaythroughValidatorReport: buildVisualPlaythroughValidatorReport(),
      telemetryEvents: [
        'game.ready',
        'game.started',
        'scene.visual_presentation_metadata.verified',
        'player.moved',
        'player.fired',
        'enemy.hit',
        'player.dead',
        'game.over',
        'mission.complete',
        'game.lost',
        'game.won'
      ],
      dslConsumptionReport: { entries: [], summary: { unsupportedCount: 0, deferredCount: 0, ignoredAuthoritativeCount: 0 } }
    }
  };
}

function buildInteractiveQaReport(extraEvents: string[] = []): Record<string, unknown> {
  const eventRecords = [
    { event: 'game.ready', source: 'runtime_boot' },
    { event: 'game.started', source: 'runtime_boot' },
    {
      event: 'scene.visual_presentation_metadata.verified',
      source: 'runtime_visual_manifest',
      visualIntentSource: 'canonical_dsl_visual_intent',
      sceneVisualTheme: 'original_16bit_jungle_metal_core',
      loadedAssetIntentRefs: [
        'boss_molten_core_guard',
        'enemy_fixed_turret',
        'enemy_flying_wing',
        'enemy_patrol_red',
        'hazard_warning_triangle',
        'player_red_runner',
        'projectile_flare',
        'weapon_supply_green_orb'
      ]
    },
    { event: 'player.moved', source: 'player_input' },
    { event: 'player.jumped', source: 'player_input' },
    { event: 'player.crouched', source: 'player_input' },
    { event: 'player.fired', source: 'player_input', moving: true, moving_fire: true, input_mode: 'held_fire' },
    { event: 'projectile.spawned', source: 'runtime_combat' },
    { event: 'item.collected', source: 'runtime_collision' },
    {
      event: 'enemy.moved',
      source: 'runtime_enemy_ai',
      enemy: 'patrol_infantry',
      movePattern: 'patrol_advance',
      behaviorIds: ['behavior_patrol_infantry_patrol'],
      behaviorCapabilityIds: ['enemy.patrol_infantry.v1']
    },
    {
      event: 'enemy.fired',
      source: 'runtime_enemy_ai',
      enemy: 'patrol_infantry',
      projectilePattern: 'aimed_single',
      projectileCount: 1,
      behaviorIds: ['behavior_patrol_infantry_patrol'],
      behaviorCapabilityIds: ['enemy.patrol_infantry.v1']
    },
    {
      event: 'enemy.moved',
      source: 'runtime_enemy_ai',
      enemy: 'flying_enemy',
      movePattern: 'flying_strafe',
      behaviorIds: ['behavior_flying_enemy_entry'],
      behaviorCapabilityIds: ['enemy.flying_right_entry.v1']
    },
    {
      event: 'enemy.fired',
      source: 'runtime_enemy_ai',
      enemy: 'flying_enemy',
      projectilePattern: 'diagonal_aimed_single',
      projectileCount: 1,
      behaviorIds: ['behavior_flying_enemy_entry'],
      behaviorCapabilityIds: ['enemy.flying_right_entry.v1']
    },
    {
      event: 'enemy.fired',
      source: 'runtime_enemy_ai',
      enemy: 'fixed_turret',
      projectilePattern: 'aimed_single',
      projectileCount: 1,
      behaviorIds: ['behavior_fixed_turret_fire'],
      behaviorCapabilityIds: ['enemy.fixed_turret.v1']
    },
    {
      event: 'enemy.projectile.spawned',
      source: 'runtime_enemy_projectile',
      enemy: 'fixed_turret',
      projectilePattern: 'aimed_single',
      projectileCount: 1,
      behaviorIds: ['behavior_fixed_turret_fire'],
      behaviorCapabilityIds: ['enemy.fixed_turret.v1']
    },
    {
      event: 'enemy.projectile.hit_player',
      source: 'runtime_enemy_projectile',
      enemy: 'fixed_turret',
      projectilePattern: 'aimed_single',
      behaviorIds: ['behavior_fixed_turret_fire'],
      behaviorCapabilityIds: ['enemy.fixed_turret.v1']
    },
    { event: 'enemy.hit', source: 'runtime_combat' },
    { event: 'score.changed', source: 'runtime_score' },
    { event: 'player.damaged', source: 'runtime_collision' },
    { event: 'level.segment.completed', source: 'runtime_progression' },
    {
      event: 'boss.attack.fired',
      source: 'runtime_boss_ai',
      phase: 2,
      attackPattern: 'three_way_projectile',
      projectileCount: 3,
      behaviorIds: ['behavior_boss_attack_pattern_phase2'],
      behaviorCapabilityIds: ['enemy.boss_attack_pattern.v1', 'hazard.falling_area.v1']
    },
    {
      event: 'boss.falling_hazard.spawned',
      source: 'runtime_boss_ai',
      attackPattern: 'falling_hazard',
      behaviorIds: ['behavior_boss_attack_pattern_phase2'],
      behaviorCapabilityIds: ['enemy.boss_attack_pattern.v1', 'hazard.falling_area.v1']
    },
    { event: 'boss.phase.changed', source: 'runtime_combat' },
    { event: 'player.dead', source: 'runtime_health' },
    { event: 'game.over', source: 'runtime_health' },
    { event: 'game.lost', source: 'runtime_health' },
    { event: 'objective.completed', source: 'runtime_objective' },
    { event: 'mission.complete', source: 'runtime_objective' },
    { event: 'game.won', source: 'runtime_objective' },
    ...extraEvents.map((event) => ({ event, source: 'runtime_combat' }))
  ];

  return {
    status: 'PASSED',
    interaction_source: 'playwright_keyboard',
    observed_events: eventRecords.map((record) => record.event),
    event_records: eventRecords,
    runtime_consumption: {
      auto_emitted_success_events: false,
      source_artifacts: {
        canonicalDsl: true,
        runtimePlan: true,
        sceneIr: true,
        runtimeManifest: true
      },
      enemy_behavior: { movement: true, counterfire: true, boss_attack: true },
      behavior_config: {
        status: 'PASSED',
        consumed_behavior_config_ids: [
          'behavior_boss_attack_pattern_phase2',
          'behavior_fixed_turret_fire',
          'behavior_flying_enemy_entry',
          'behavior_patrol_infantry_patrol'
        ],
        consumed_behavior_capability_ids: [
          'enemy.boss_attack_pattern.v1',
          'enemy.fixed_turret.v1',
          'enemy.flying_right_entry.v1',
          'enemy.patrol_infantry.v1',
          'hazard.falling_area.v1'
        ]
      }
    },
    playable_state: {
    playerMovedByInput: true,
    movingFireObserved: true,
    projectileHitEnemy: true,
      pickupCollected: true,
      bossPhaseChanged: true,
      gameOverReached: true,
      winReached: true
    },
    visual_asset_evidence: {
      status: 'PASSED',
      renderer: 'runtime_2d_generated_assets',
      renderer_is_implementation_detail: true,
      placeholder_rectangles_present: false,
      sprite_asset_count: 8,
      dsl_visual_intent_bound: true,
      visual_intent_source: 'canonical_dsl_visual_intent',
      scene_visual_theme: 'original_16bit_jungle_metal_core',
      canonical_visual_intent_count: 8,
      scene_ir_visual_binding_count: 8,
      manifest_visual_asset_count: 8,
      required_visual_roles: STEP38_TEST_REQUIRED_VISUAL_ROLES,
      loaded_visual_roles: STEP38_TEST_REQUIRED_VISUAL_ROLES,
      missing_visual_roles: [],
      loaded_asset_intent_refs: [
        'boss_molten_core_guard',
        'enemy_fixed_turret',
        'enemy_flying_wing',
        'enemy_patrol_red',
        'hazard_warning_triangle',
        'player_red_runner',
        'projectile_flare',
        'weapon_supply_green_orb'
      ]
    },
    visual_vertical_slice_evidence: buildVisualVerticalSliceEvidence(),
    visual_runtime_binding_report: buildVisualRuntimeBindingReport(),
    visual_asset_materialization_report: buildVisualAssetMaterializationReport(),
    asset_template_fingerprint_report: buildAssetTemplateFingerprintReport(),
    visual_design_realization_report: buildVisualDesignRealizationReport(),
    runtime_texture_load_report: buildRuntimeTextureLoadReport(),
    art_direction_quality_report: buildArtDirectionQualityReport(),
    encounter_director_plan: buildEncounterDirectorPlan(),
    encounter_director_runtime_evidence: buildEncounterDirectorRuntimeEvidence(),
    outcome_state_machine_report: buildOutcomeStateMachineReport(),
    win_path_evidence: buildWinPathEvidence(),
    lose_path_evidence: buildLosePathEvidence(),
    success_route_milestone_timeline: buildSuccessRouteMilestoneTimeline(),
    success_route_milestone_timeline_ok: true,
    route_pressure_band_evidence: buildRoutePressureBandEvidence(),
    route_pressure_band_evidence_ok: true,
    real_playthrough_completion_evidence: buildRealPlaythroughCompletionEvidence(),
    operator_visible_art_gate: buildOperatorVisibleArtGate(),
    visual_playthrough_validator_report: buildVisualPlaythroughValidatorReport(),
    two_d_gameplay_playthrough_gate: buildTwoDGameplayPlaythroughGate(),
    canvas_visual_readability_gate: buildCanvasVisualReadabilityGate(),
    startup_survivability_gate: buildStartupSurvivabilityGate(),
    encounter_playability_gate: buildEncounterPlayabilityGate(),
    manual_traversal_evidence: buildManualTraversalEvidence(),
    playable_duration_support: {
      status: 'PASSED',
      supported_range_sec: { min: 480, max: 720 },
      normal_mode_estimated_sec: { min: 480, target: 600, max: 720 },
      qa_acceleration_used: true
    },
    encounter_coverage: {
      status: 'PASSED',
      visual_slice_preview_mode: false,
      product_duration_coverage_status: 'PASSED',
      full_duration_runtime_coverage_status: 'PASSED',
      preview_visual_slice_coverage_status: 'NOT_APPLICABLE',
      expected_enemy_count: 60,
      realized_enemy_count: 61,
      preview_expected_enemy_count: 17,
      preview_realized_enemy_count: 17,
      minimum_enemy_count_for_duration: 40,
      encounter_band_count: 24,
      minimum_encounter_band_count_for_duration: 10,
      preview_minimum_encounter_band_count: 8,
      full_game_expansion_evidence: buildPassingFullGameExpansionEvidence(),
      wave_segment_coverage_count: 3,
      minimum_wave_segment_coverage_count: 3,
      max_gap_between_encounter_bands_sec: 34,
      max_allowed_gap_between_encounter_bands_sec: 45,
      segments_below_minimum_band_count: [],
      first_encounter_estimated_sec: 3,
      first_viewport_enemy_count: 3,
      static_enemy_node_count: 1,
      realized_static_enemy_node_count: 1,
      wave_node_count: 3,
      realized_wave_node_count: 3,
      pickup_node_count: 2,
      realized_pickup_node_count: 2,
      boss_node_count: 1,
      realized_boss_count: 1
    },
    enemy_behavior_evidence: {
      status: 'PASSED',
      required_enemy_behavior_capability_count: 3,
      realized_enemy_behavior_capability_count: 3,
      moving_enemy_entity_count: 3,
      enemy_movement_event_count: 6,
      attacking_enemy_entity_count: 3,
      enemy_fire_event_count: 5,
      enemy_projectile_spawn_count: 5,
      player_damage_from_enemy_projectile_count: 1,
      boss_attack_event_count: 1
    },
    behavior_config_evidence: {
      status: 'PASSED',
      required_behavior_config_ids: [
        'behavior_boss_attack_pattern_phase2',
        'behavior_fixed_turret_fire',
        'behavior_flying_enemy_entry',
        'behavior_patrol_infantry_patrol'
      ],
      consumed_behavior_config_ids: [
        'behavior_boss_attack_pattern_phase2',
        'behavior_fixed_turret_fire',
        'behavior_flying_enemy_entry',
        'behavior_patrol_infantry_patrol'
      ],
      required_behavior_capability_ids: [
        'enemy.boss_attack_pattern.v1',
        'enemy.fixed_turret.v1',
        'enemy.flying_right_entry.v1',
        'enemy.patrol_infantry.v1',
        'hazard.falling_area.v1'
      ],
      consumed_behavior_capability_ids: [
        'enemy.boss_attack_pattern.v1',
        'enemy.fixed_turret.v1',
        'enemy.flying_right_entry.v1',
        'enemy.patrol_infantry.v1',
        'hazard.falling_area.v1'
      ],
      fixed_turret_burst_consumed: true,
      fixed_turret_fire_consumed: true,
      fixed_turret_burst_fire_count: 1,
      fixed_turret_fire_count: 1,
      patrol_counterfire_consumed: true,
      patrol_counterfire_event_count: 2,
      patrol_counterfire_fire_count: 1,
      flying_strafe_fire_consumed: true,
      flying_strafe_move_event_count: 1,
      flying_strafe_fire_event_count: 1,
      boss_attack_cycle_consumed: true,
      boss_attack_pattern_consumed: true,
      boss_falling_hazard_consumed: true,
      boss_attack_event_count: 1,
      boss_three_way_event_count: 1,
      boss_falling_hazard_event_count: 1
    }
  };
}

function buildPassingFullGameExpansionEvidence(): Record<string, unknown> {
  return {
    play_time_intent_seconds: { min: 480, max: 720 },
    runtime_coverage_seconds: 600,
    mission_complete_reached: true,
    mission_complete_time_seconds: 600,
    encounter_band_count: 24,
    enemy_spawn_count: 61,
    enemy_defeat_count: 60,
    preview_visual_slice_coverage_status: 'NOT_APPLICABLE',
    full_duration_runtime_coverage_status: 'PASSED',
    model_fallback_used: false,
    procedural_asset_fallback_used: false,
    failure_reasons: []
  };
}

function buildManualTraversalEvidence(): Record<string, unknown> {
  const requiredScreenshots = [
    '00_spawn_start',
    '01_wave1_reached_by_input',
    '02_projectile_visible_by_input',
    '02_pickup_and_area2_reached_by_input',
    '03_wave2_reached_by_input',
    '04_boss_telegraph_reached_by_input',
    '05_boss_phase_reached_by_input',
    '06_exit_or_mission_complete_reached_by_input'
  ];
  return {
    schemaVersion: 'step38.manual-traversal-evidence.v1',
    status: 'PASSED',
    evidence_source: 'playwright_keyboard_continuous_path',
    run_id: 'run_step38_ready',
    marker_run_id_matches: true,
    started_at_player_spawn: true,
    capture_window_teleport_used: false,
    product_duration_sec: { min: 480, max: 720 },
    preview_target_sec: 50,
    observed_preview_windows: ['window_0_intro', 'window_1_weapon_wave_area', 'window_2_boss'],
    observed_segments: ['jungle_entrance', 'metal_bridge', 'enemy_core'],
    observed_wave_ids: ['wave_jungle_patrol', 'wave_bridge_flyers'],
    cleared_wave_ids: ['wave_jungle_patrol'],
    post_first_wave_enemy_seen: true,
    weapon_pickup_seen: true,
    moving_fire_seen_by_input: true,
    boss_seen: true,
    boss_telegraph_seen: true,
    boss_phase_seen: true,
    distinct_environment_visual_count: 3,
    observed_environment_motifs: ['jungle ruin entry', 'industrial bridge over molten vents', 'molten mechanical core'],
    observed_content_types: ['player', 'enemy_wave', 'static_enemy', 'flying_enemy', 'weapon_pickup', 'projectile', 'hazard', 'boss', 'boss_telegraph', 'boss_phase', 'region_transition', 'runtime_feedback'],
    observed_visual_roles: STEP38_TEST_REQUIRED_VISUAL_ROLES,
    placeholder_objects_seen: false,
    canonical_dsl_visual_intent_runtime_bound: true,
    scripted_capture_used_for_pass: false,
    screenshot_count: requiredScreenshots.length,
    required_screenshots: requiredScreenshots,
    observed_screenshots: requiredScreenshots,
    missing_screenshots: [],
    screenshots_are_input_only: true,
    manual_traversal_gate: {
      verdict: 'PASS',
      starts_from_spawn: true,
      input_only: true,
      teleport_used: false,
      camera_jump_used: false,
      debug_reposition_used: false,
      state_injection_used: false,
      direct_spawn_used: false,
      scripted_capture_used_for_pass: false,
      max_target_duration_sec: 50,
      wave2_reached_by_input: true,
      area2_reached_by_input: true,
      weapon_pickup_reached_by_input: true,
      moving_fire_seen_by_input: true,
      boss_reached_by_input_or_scripted_reachable_after_input_path: true,
      boss_telegraph_seen_by_input: true,
      mission_complete_reached_by_input: true,
      boss_defeated_by_input: true,
      all_required_waves_resolved_before_win: true,
      all_required_regions_traversed_before_win: true,
      text_or_overlay_only_completion_evidence: false,
      early_mission_complete_detected: false,
      dsl_visual_objects_seen_by_input: true,
      large_empty_traversal_detected: false,
      milestone_times_sec: [
        { id: 'wave1_seen_by_input', elapsedSec: 0.25 },
        { id: 'wave2_seen_by_input', elapsedSec: 2.5 },
        { id: 'pickup_area2_seen_by_input', elapsedSec: 3.5 },
        { id: 'core_wave_pressure_seen_by_input', elapsedSec: 5.6 },
        { id: 'boss_telegraph_seen_by_input', elapsedSec: 7.5 },
        { id: 'boss_phase_seen_by_input', elapsedSec: 11.2 },
        { id: 'mission_complete_seen_by_input', elapsedSec: 13.1 }
      ]
    },
    screenshots: requiredScreenshots.map((label) => buildManualTraversalScreenshot(label))
  };
}

function buildManualTraversalScreenshot(label: string): Record<string, unknown> {
  const byLabel: Record<string, { preview: string; content: string[]; roles: string[]; objects: string[] }> = {
    '00_spawn_start': {
      preview: 'window_0_intro',
      content: ['player', 'region_transition', 'runtime_feedback'],
      roles: ['player', 'region', 'feedback'],
      objects: ['player']
    },
    '01_wave1_reached_by_input': {
      preview: 'window_0_intro',
      content: ['player', 'enemy_wave', 'static_enemy', 'region_transition', 'runtime_feedback'],
      roles: ['player', 'enemy_ground', 'enemy_static', 'region', 'feedback'],
      objects: ['enemy']
    },
    '02_projectile_visible_by_input': {
      preview: 'window_0_intro',
      content: ['player', 'projectile', 'region_transition', 'runtime_feedback'],
      roles: ['player', 'projectile', 'region', 'feedback'],
      objects: ['player_projectile']
    },
    '02_pickup_and_area2_reached_by_input': {
      preview: 'window_1_weapon_wave_area',
      content: ['player', 'weapon_pickup', 'region_transition', 'runtime_feedback'],
      roles: ['player', 'pickup', 'region', 'feedback'],
      objects: ['pickup']
    },
    '03_wave2_reached_by_input': {
      preview: 'window_1_weapon_wave_area',
      content: ['player', 'enemy_wave', 'flying_enemy', 'region_transition', 'runtime_feedback'],
      roles: ['player', 'enemy_ground', 'flying_enemy', 'region', 'feedback'],
      objects: ['enemy']
    },
    '04_boss_telegraph_reached_by_input': {
      preview: 'window_2_boss',
      content: ['player', 'boss', 'boss_telegraph', 'region_transition', 'runtime_feedback'],
      roles: ['player', 'boss', 'region', 'feedback'],
      objects: ['boss', 'boss_telegraph']
    },
    '05_boss_phase_reached_by_input': {
      preview: 'window_2_boss',
      content: ['player', 'boss', 'boss_phase', 'region_transition', 'runtime_feedback'],
      roles: ['player', 'boss', 'region', 'feedback'],
      objects: ['boss', 'boss_phase_2']
    },
    '06_exit_or_mission_complete_reached_by_input': {
      preview: 'window_2_boss',
      content: ['player', 'region_transition', 'runtime_feedback'],
      roles: ['player', 'region', 'feedback'],
      objects: ['mission_complete_overlay']
    }
  };
  const expected = byLabel[label] ?? byLabel['00_spawn_start'];
  return {
    label,
    screenshot: `${label}.png`,
    screenshot_path: `/tmp/${label}.png`,
    screenshot_sha256: `sha-${label}`,
    metadata_path: `/tmp/${label}.metadata.json`,
    evidence_type: 'fresh_manual_traversal_input_only',
    counts_for_ready_for_manual_test: true,
    fresh_manual_session: true,
    starts_from_spawn: true,
    input_only: true,
    teleport_used: false,
    camera_jump_used: false,
    debug_reposition_used: false,
    state_injection_used: false,
    direct_spawn_used: false,
    direct_phase_trigger_used: false,
    action: label === '02_projectile_visible_by_input' ? 'fire_weapon' : 'traverse',
    elapsed_sec_from_spawn: 12,
    player_x: 1200,
    camera_x: 900,
    route_segment: 'wave1_to_pickup_area2',
    preview_window: expected.preview,
    visible_canonical_objects: ['player', 'wave_2_enemy_ground_01'],
    required_roles_seen: [...new Set([...expected.roles, ...expected.content])].sort(),
    visible_runtime_roles: expected.roles,
    visible_content_types: expected.content,
    visible_object_types: expected.objects,
    visible_materialized_assets: expected.objects.map((object) => ({
      required_object:
        object === 'boss_phase_2'
          ? 'boss_projectile_phase_object'
          : object === 'boss_telegraph'
            ? 'boss_telegraph'
            : object === 'pickup'
              ? 'pickup_weapon'
              : object === 'enemy'
                ? 'ground_enemy'
                : object === 'player_projectile'
                  ? 'projectile'
                  : 'player',
      canonical_id: `canonical_${object}`,
      role: object.includes('boss') ? 'boss' : object === 'enemy' ? 'enemy' : object === 'pickup' || object === 'player_projectile' ? 'weapon' : 'player',
      source: 'canonical_dsl',
      texture_key: `${object}_texture_key`,
      bound_to_runtime_object: true,
      factory_used_texture_key: true,
      used_placeholder_renderer: false,
      run_scoped_asset_sha256: 'a'.repeat(64),
      visible: true,
      placeholder: false,
      label_only: false
    })),
    missing_required_materialized_assets: [],
    pixel_probe_passed: true,
    placeholder_objects_seen: false,
    source: 'canonical_dsl',
    ...(label === '06_exit_or_mission_complete_reached_by_input'
      ? {
          mission_complete_after_real_playthrough: true,
          boss_defeated_by_input: true,
          text_or_overlay_only_completion_evidence: false
        }
      : {}),
    canvas_pixel_probe: {
      status: 'PASSED',
      probed_runtime_object_count: 2,
      non_background_pixel_count: 6
    }
  };
}

function buildSuccessRouteMilestoneTimeline(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 'step38.success-route-milestone-timeline.v1',
    run_id: 'run_step38_ready',
    evidence_path: '/tmp/success_route_milestone_timeline.json',
    source: 'fresh_manual_playthrough_input_only',
    large_empty_traversal_threshold_sec: 8,
    route_verdict: 'PASS',
    large_empty_traversal_detected: false,
    mission_complete_used_as_route_pass_without_milestones: false,
    text_only_evidence_used_for_pass: false,
    telemetry_only_evidence_used_for_pass: false,
    segments: [
      {
        id: 'spawn_to_wave1',
        from_step: '00_fresh_spawn',
        to_step: '01_wave1_visible',
        elapsed_sec: 0.25,
        progress_evidence: ['player_moved', 'wave1_visible', 'ground_enemy_visible'],
        screenshots: ['00_spawn_start.png', '01_wave1_reached_by_input.png'],
        verdict: 'PASS'
      },
      {
        id: 'wave2_to_boss_telegraph',
        from_step: '03_wave2',
        to_step: '04_boss_telegraph',
        elapsed_sec: 5,
        progress_evidence: [
          'flying_enemy_visible',
          'enemy_projectile_visible',
          'boss_projectile_visible',
          'player_projectile_visible_with_pressure',
          'active_pressure_band_visible'
        ],
        screenshots: ['03_wave2_reached_by_input.png', '03b_mid_pressure_band.png', '04_boss_telegraph_reached_by_input.png'],
        verdict: 'PASS'
      },
      {
        id: 'boss_to_mission_complete',
        from_step: '08_boss_phase_1_visible',
        to_step: '11_mission_complete_after_play',
        elapsed_sec: 5.6,
        progress_evidence: ['boss_telegraph_visible', 'boss_phase_transition_visible', 'mission_complete_visible_after_boss_progression'],
        screenshots: [
          '04_boss_telegraph_reached_by_input.png',
          '05_boss_phase_reached_by_input.png',
          '06_exit_or_mission_complete_reached_by_input.png'
        ],
        verdict: 'PASS'
      }
    ],
    ...overrides
  };
}

function buildRoutePressureBandEvidence(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 'step38.route-pressure-band-evidence.v1',
    run_id: 'run_step38_ready',
    source: 'fresh_manual_playthrough_input_only',
    route_pressure_band_gate: {
      verdict: 'PASS',
      max_empty_interval_sec: 8,
      largest_empty_interval_sec: 5,
      large_empty_traversal_detected: false,
      text_only_evidence_used_for_pass: false,
      telemetry_only_evidence_used_for_pass: false
    },
    pressure_bands: [
      {
        id: 'wave2_to_boss_mid_pressure',
        from: '03_wave2',
        to: '04_boss_telegraph',
        visible_runtime_objects: ['flying_enemy', 'enemy_projectile', 'boss_projectile_phase_object', 'player_projectile'],
        progress_evidence: [
          'flying_enemy_visible',
          'enemy_projectile_visible',
          'boss_projectile_visible',
          'player_projectile_visible_with_pressure',
          'active_pressure_band_visible'
        ],
        screenshots: ['03b_mid_pressure_band.png'],
        metadata_paths: ['03b_mid_pressure_band.metadata.json'],
        counts_as_progress: true
      }
    ],
    large_empty_traversal_detected: false,
    ...overrides
  };
}

function buildRealPlaythroughCompletionEvidence(): Record<string, unknown> {
  const completionPreconditions = [
    'wave_progression_complete',
    'area_progression_complete',
    'weapon_pickup_consumed',
    'boss_phase_seen',
    'boss_defeated_by_input'
  ];
  const screenshots = STEP38_TEST_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS.map((label) => buildRealPlaythroughScreenshot(label));
  return {
    schemaVersion: 'step38.real-playthrough-completion-evidence.v1',
    run_id: 'run_step38_ready',
    source: 'fresh_input_only_browser_playthrough',
    screenshots,
    real_playthrough_completion_gate: {
      verdict: 'PASS',
      fresh_manual_session: true,
      input_only: true,
      starts_from_spawn: true,
      teleport_used: false,
      camera_jump_used: false,
      debug_reposition_used: false,
      state_injection_used: false,
      direct_spawn_used: false,
      direct_phase_trigger_used: false,
      direct_mission_trigger_used: false,
      real_playthrough_completion_verified: true,
      boss_defeated_by_input: true,
      all_required_waves_resolved_before_win: true,
      all_required_regions_traversed_before_win: true,
      weapon_and_boss_phase_reached_before_win: true,
      mission_complete_after_real_playthrough: true,
      wave1_cleared_by_play: true,
      weapon_pickup_collected_by_play: true,
      area_progression_reached_by_play: true,
      wave2_or_later_wave_cleared_or_pressure_seen_by_play: true,
      mid_route_pressure_evidence_present: true,
      boss_arena_reached_by_play: true,
      boss_phase_1_seen_by_play: true,
      boss_phase_2_seen_by_play: true,
      boss_defeated_by_play: true,
      mission_complete_visible_after_play: true,
      mission_complete_persistent: true,
      large_empty_traversal_detected: false,
      success_route_milestone_timeline_path: '/tmp/success_route_milestone_timeline.json',
      screenshots_support_all_required_steps: true,
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      receipt_only_evidence_used_for_pass: false,
      telemetry_only_evidence_used_for_pass: false,
      scripted_capture_used_for_pass: false,
      text_or_overlay_only_evidence: false,
      early_mission_complete_detected: false,
      verified_completion_preconditions: completionPreconditions
    },
    human_visible_gameplay_gate: {
      verdict: 'PASS',
      operator_visible_evidence_required: true,
      browser_visual_evidence_required: true,
      input_only_evidence_required: true,
      fresh_manual_session: true,
      input_only: true,
      player_visible: true,
      weapon_visible: true,
      wave1_visible: true,
      wave2_visible: true,
      area_progression_visible: true,
      boss_visible: true,
      boss_phase_visible: true,
      mission_complete_visible_after_play: true,
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      receipt_only_evidence_used_for_pass: false,
      telemetry_only_evidence_used_for_pass: false,
      scripted_capture_used_for_pass: false,
      screenshot_labels: [...STEP38_TEST_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS]
    }
  };
}

function buildRealPlaythroughScreenshot(label: string): Record<string, unknown> {
  const byLabel: Record<string, { content: string[]; roles: string[]; objects: string[]; extra?: Record<string, unknown> }> = {
    '00_fresh_spawn': {
      content: ['player', 'region_transition', 'runtime_feedback'],
      roles: ['player', 'region'],
      objects: ['player']
    },
    '01_wave1_visible': {
      content: ['player', 'enemy_wave', 'static_enemy', 'region_transition', 'runtime_feedback'],
      roles: ['player', 'enemy_ground', 'enemy_static'],
      objects: ['enemy']
    },
    '02_wave1_clear_or_progression': {
      content: ['player', 'projectile', 'runtime_feedback'],
      roles: ['player', 'projectile'],
      objects: ['wave_marker', 'player_projectile']
    },
    '03_weapon_pickup_visible_and_collected': {
      content: ['player', 'weapon_pickup', 'region_transition', 'runtime_feedback'],
      roles: ['player', 'pickup'],
      objects: ['pickup'],
      extra: { weapon_pickup_collected: true }
    },
    '04_area_progression_visible': {
      content: ['player', 'region_transition', 'runtime_feedback'],
      roles: ['player', 'region'],
      objects: ['area_marker']
    },
    '05_wave2_mixed_enemies_visible': {
      content: ['player', 'enemy_wave', 'flying_enemy', 'region_transition', 'runtime_feedback'],
      roles: ['player', 'enemy_ground', 'flying_enemy'],
      objects: ['enemy']
    },
    '06_wave2_clear_or_pressure': {
      content: ['player', 'enemy_wave', 'projectile', 'runtime_feedback'],
      roles: ['player', 'enemy_ground', 'projectile'],
      objects: ['wave_marker', 'enemy']
    },
    '07_boss_arena_visible': {
      content: ['player', 'boss', 'region_transition', 'runtime_feedback'],
      roles: ['player', 'boss'],
      objects: ['boss', 'area_marker']
    },
    '08_boss_phase_1_visible': {
      content: ['player', 'boss', 'boss_telegraph', 'runtime_feedback'],
      roles: ['player', 'boss'],
      objects: ['boss', 'boss_telegraph']
    },
    '09_boss_phase_2_visible': {
      content: ['player', 'boss', 'boss_phase', 'runtime_feedback'],
      roles: ['player', 'boss'],
      objects: ['boss', 'boss_phase_2']
    },
    '10_boss_defeated': {
      content: ['player', 'boss', 'boss_phase', 'runtime_feedback'],
      roles: ['player', 'boss'],
      objects: ['boss'],
      extra: { boss_defeated_by_input: true }
    },
    '11_mission_complete_after_play': {
      content: ['player', 'region_transition', 'runtime_feedback'],
      roles: ['player', 'region'],
      objects: ['mission_complete_overlay'],
      extra: {
        mission_complete_after_real_playthrough: true,
        boss_defeated_by_input: true,
        text_or_overlay_only_completion_evidence: false
      }
    }
  };
  const expected = byLabel[label] ?? byLabel['00_fresh_spawn'];
  return {
    label,
    screenshot: `${label}.png`,
    screenshot_path: `/tmp/browser-qa-real-playthrough/${label}.png`,
    screenshot_sha256: `sha-${label}`,
    metadata_path: `/tmp/browser-qa-real-playthrough/${label}.metadata.json`,
    evidence_type: 'fresh_manual_playthrough_input_only',
    counts_for_ready_for_manual_test: true,
    fresh_manual_session: true,
    starts_from_spawn: true,
    input_only: true,
    teleport_used: false,
    camera_jump_used: false,
    debug_reposition_used: false,
    state_injection_used: false,
    direct_spawn_used: false,
    direct_phase_trigger_used: false,
    label_only_visual_evidence: false,
    placeholder_objects_seen: false,
    pixel_probe_passed: true,
    visible_canonical_objects: ['player', `canonical_${label}`],
    visible_runtime_roles: expected.roles,
    visible_content_types: expected.content,
    visible_object_types: expected.objects,
    visible_materialized_assets: expected.objects.map((object) => ({
      required_object: object === 'boss_phase_2' ? 'boss_projectile_phase_object' : object === 'area_marker' ? 'area_marker' : object,
      canonical_id: `canonical_${object}`,
      source: 'canonical_dsl',
      texture_key: `${object}_texture_key`,
      bound_to_runtime_object: true,
      factory_used_texture_key: true,
      visible: true,
      placeholder: false,
      label_only: false
    })),
    canvas_pixel_probe: {
      status: 'PASSED',
      probed_runtime_object_count: 3,
      non_background_pixel_count: 9
    },
    ...expected.extra
  };
}

function buildOperatorVisibleArtGate(
  topLevelOverrides: Record<string, unknown> = {},
  gateOverrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    schemaVersion: 'step38.operator-visible-art-gate.v1',
    run_id: 'run_step38_ready',
    source: 'fresh_browser_screenshots',
    ...proceduralCanvasBackendPolicy(),
    ...freshManualInputOnlyEvidencePolicy(),
    ...topLevelOverrides,
    screenshot_labels: [...STEP38_TEST_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS],
    operator_visible_art_gate: {
      verdict: 'PASS',
      ...proceduralCanvasBackendPolicy(),
      ...freshManualInputOnlyEvidencePolicy(),
      target: 'procedural_pixel_art_readable_v1',
      production_art_claimed: false,
      external_art_used: false,
      operator_visible_quality_ready: true,
      player_enemy_boss_environment_readable: true,
      visual_style_consistent: true,
      debug_geometry_dominant: false,
      manual_review_required: true,
      operator_visible_evidence_required: true,
      browser_visual_evidence_required: true,
      player_visibly_dsl_derived: true,
      enemy_types_visibly_distinct: true,
      boss_visibly_distinct: true,
      boss_projectile_visibly_distinct: true,
      weapon_pickup_visibly_distinct: true,
      environment_theme_visibly_layered: true,
      projectile_types_visibly_distinct: true,
      label_only_visual_evidence: false,
      placeholder_style_dominant: false,
      template_derived_placeholder: false,
      role_static_templates_used: false,
      old_svgForVisualIntent_used: false,
      visual_design_realization_gate: 'PASS',
      canvas_art_fidelity_gate: 'PASS',
      screenshots_support_visual_claims: true,
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      receipt_only_evidence_used_for_pass: false,
      telemetry_only_evidence_used_for_pass: false,
      scripted_capture_used_for_pass: false,
      ...gateOverrides
    }
  };
}

function buildVisualPlaythroughValidatorReport(): Record<string, unknown> {
  return {
    schemaVersion: 'step38.visual-playthrough-validator-report.v1',
    run_id: 'run_step38_ready',
    encounter_coverage_status: 'PASSED',
    real_playthrough_won: true,
    boss_defeated: true,
    manual_traversal_gate: 'PASS',
    large_empty_traversal_detected: false,
    success_route_milestone_timeline_verdict: 'PASS',
    route_pressure_band_gate: 'PASS',
    win_path_gate: 'PASS',
    lose_path_gate: 'PASS',
    mission_complete_used_as_route_pass_without_milestones: false,
    text_only_evidence_used_for_pass: false,
    telemetry_only_evidence_used_for_pass: false,
    evidence_paths: STEP38_TEST_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS.map((label) => `/tmp/browser-qa-real-playthrough/${label}.png`),
    visual_playthrough_validator: {
      verdict: 'PASS',
      encounter_coverage_status: 'PASSED',
      real_playthrough_won: true,
      boss_defeated: true,
      manual_traversal_gate: 'PASS',
      large_empty_traversal_detected: false,
      success_route_milestone_timeline_verdict: 'PASS',
      route_pressure_band_gate: 'PASS',
      win_path_gate: 'PASS',
      lose_path_gate: 'PASS',
      mission_complete_used_as_route_pass_without_milestones: false,
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      receipt_only_evidence_used_for_pass: false,
      telemetry_only_evidence_used_for_pass: false,
      scripted_capture_used_for_pass: false,
      operator_visible_evidence_required: true,
      browser_visual_evidence_required: true,
      input_only_evidence_required: true,
      blocking_reasons: [],
      required_gate_summary: {
        real_playthrough_completion_gate: 'PASS',
        human_visible_gameplay_gate: 'PASS',
        success_route_milestone_timeline: 'PASS',
        route_pressure_band_gate: 'PASS',
        operator_visible_art_gate: 'PASS',
        win_path_gate: 'PASS',
        lose_path_gate: 'PASS'
      }
    }
  };
}

function buildTwoDGameplayPlaythroughGate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 'step38.two-d-gameplay-playthrough-gate.v1',
    run_id: 'run_step38_ready',
    evidence_source: 'fresh_manual_playthrough_input_only',
    two_d_gameplay_playthrough_gate: {
      verdict: 'PASS',
      target: 'generated_2d_gameplay',
      renderer_is_implementation_detail: true,
      fresh_manual_session: true,
      input_only: true,
      starts_from_spawn: true,
      teleport_used: false,
      camera_jump_used: false,
      debug_reposition_used: false,
      state_injection_used: false,
      direct_wave_spawn_used: false,
      direct_boss_spawn_used: false,
      direct_spawn_used: false,
      direct_phase_trigger_used: false,
      direct_mission_complete_trigger_used: false,
      direct_mission_trigger_used: false,
      direct_game_over_trigger_used: false,
      generated_from_canonical_dsl: true,
      generated_2d_playable_artifact: true,
      canonical_dsl_runtime_authority: true,
      fallback_used: false,
      preloaded_artifact_used: false,
      legacy_fixed_template_authority: false,
      legacy_template_authority: false,
      player_movement_proven: true,
      movement_by_input: true,
      jump_proven: true,
      jump_by_input: true,
      crouch_proven: true,
      crouch_by_input: true,
      shooting_proven: true,
      shooting_by_input: true,
      moving_fire_observed: true,
      weapon_pickup_collected_by_play: true,
      pickup_collected_by_play: true,
      wave1_reached_by_play: true,
      wave1_resolved_by_play: true,
      wave2_reached_by_play: true,
      wave2_or_later_reached_by_play: true,
      area_progression_reached_by_play: true,
      mid_route_pressure_evidence_present: true,
      boss_arena_reached_by_play: true,
      boss_phase_1_seen_by_play: true,
      boss_phase_2_seen_by_play: true,
      boss_defeated_by_play: true,
      mission_complete_visible: true,
      mission_complete_after_real_playthrough: true,
      game_over_visible: true,
      game_over_at_spawn: false,
      game_over_reached_by_play: true,
      player_damage_observed_for_game_over: true,
      health_zero_or_retries_exhausted_by_play: true,
      runtime_visual_evidence_supports_claims: true,
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      telemetry_only_evidence_used_for_pass: false,
      mission_complete_used_as_route_pass_without_milestones: false,
      large_empty_traversal_detected: false,
      ...overrides
    },
    evidence_paths: {
      real_playthrough_completion_evidence: '/tmp/real_playthrough_completion_evidence.json',
      win_path_evidence: '/tmp/win_path_evidence.json',
      lose_path_evidence: '/tmp/lose_path_evidence.json',
      success_route_milestone_timeline: '/tmp/success_route_milestone_timeline.json',
      route_pressure_band_evidence: '/tmp/route_pressure_band_evidence.json'
    }
  };
}

function buildCanvasVisualReadabilityGate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 'step38.canvas-visual-readability-gate.v1',
    run_id: 'run_step38_ready',
    source: 'canonical_dsl_canvas_materializer_v2',
    ...proceduralCanvasBackendPolicy(),
    canvas_visual_readability_gate: {
      verdict: 'PASS',
      ...proceduralCanvasBackendPolicy(),
      renderer_kind: 'canvas_texture',
      png_required_for_pass: false,
      svg_required_for_pass: false,
      required_objects: STEP38_TEST_REQUIRED_VISUAL_RUNTIME_OBJECTS,
      visible_required_objects: STEP38_TEST_REQUIRED_VISUAL_RUNTIME_OBJECTS,
      readable_required_objects: STEP38_TEST_REQUIRED_VISUAL_RUNTIME_OBJECTS,
      draw_plan_fields_present: [
        'required_object',
        'canonical_id',
        'renderer_kind',
        'source',
        'visual_intent_sha',
        'draw_plan_sha',
        'canvas_size',
        'draw_operations'
      ],
      player_readable: true,
      enemy_classes_visibly_distinct: true,
      boss_visibly_distinct_and_large: true,
      projectile_types_distinct: true,
      pickup_visibly_collectible: true,
      environment_theme_layered: true,
      jungle_metal_industrial_motifs_visible: true,
      debug_geometry_dominant: false,
      label_or_overlay_used_as_art_evidence: false,
      backend_policy_ok: true,
      screenshots_support_claims: true,
      ...overrides
    }
  };
}

function buildProceduralPixelArtGrammarReport(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 'step38.procedural-pixel-art-grammar-report.v1',
    run_id: 'run_step38_ready',
    source: 'canonical_dsl_visual_asset_materializer',
    ...proceduralCanvasBackendPolicy(),
    procedural_pixel_art_grammar_gate: {
      verdict: 'PASS',
      ...proceduralCanvasBackendPolicy(),
      renderer_kind: 'runtime_canvas_texture',
      external_art_required: false,
      image_model_required: false,
      role_only_generation_used: false,
      debug_geometry_dominant: false,
      visual_intent_affects_geometry: true,
      visual_intent_affects_palette: true,
      visual_intent_affects_silhouette: true,
      visual_intent_affects_animation: true,
      visual_intent_affects_environment_layers: true,
      object_classes_visibly_distinct: true,
      identical_frame_failure: false,
      required_objects: STEP38_TEST_REQUIRED_VISUAL_RUNTIME_OBJECTS,
      ...overrides
    }
  };
}

function buildCanvasArtFidelityGate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 'step38.canvas-art-fidelity-gate.v1',
    run_id: 'run_step38_ready',
    source: 'fresh_browser_screenshots',
    ...proceduralCanvasBackendPolicy(),
    ...freshManualInputOnlyEvidencePolicy(),
    canvas_art_fidelity_gate: {
      verdict: 'PASS',
      ...proceduralCanvasBackendPolicy(),
      ...freshManualInputOnlyEvidencePolicy(),
      target_fidelity: 'procedural_pixel_art_readable_v1',
      renderer_kind: 'runtime_canvas_texture',
      player_readable: true,
      enemy_classes_visibly_distinct: true,
      boss_visibly_distinct_and_large: true,
      projectile_types_distinct: true,
      pickup_visibly_collectible: true,
      environment_theme_layered: true,
      jungle_metal_industrial_motifs_visible: true,
      animation_frames_present: true,
      hit_and_pickup_feedback_visible: true,
      debug_geometry_dominant: false,
      label_or_overlay_used_as_art_evidence: false,
      screenshots_support_claims: true,
      ...overrides
    }
  };
}

function buildSpriteAnimationCoverageReport(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 'step38.sprite-animation-coverage-report.v1',
    run_id: 'run_step38_ready',
    source: 'canonical_dsl_visual_asset_materializer',
    ...proceduralCanvasBackendPolicy(),
    sprite_animation_coverage_gate: {
      verdict: 'PASS',
      ...proceduralCanvasBackendPolicy(),
      runtime_bound: true,
      identical_frame_failure: false,
      required_objects: STEP38_TEST_REQUIRED_VISUAL_RUNTIME_OBJECTS,
      player_frame_names: ['idle', 'run_1', 'run_2', 'jump', 'crouch', 'fire', 'damage'],
      boss_frame_names: ['phase_1', 'phase_2', 'telegraph', 'damage', 'defeated'],
      projectile_frame_count: 2,
      effect_frame_count: 4,
      ...overrides
    },
    objects: STEP38_TEST_REQUIRED_VISUAL_RUNTIME_OBJECTS.map((requiredObject) => ({
      required_object: requiredObject,
      frame_count: requiredObject === 'player' ? 7 : requiredObject === 'boss' ? 5 : 2,
      frame_names: requiredObject === 'player' ? ['idle', 'run_1', 'run_2', 'jump', 'crouch', 'fire', 'damage'] : ['idle', 'active'],
      frame_hashes: ['a'.repeat(64), 'b'.repeat(64)],
      runtime_bound: true,
      identical_frame_failure: false
    }))
  };
}

function buildEnvironmentLayeringReport(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 'step38.environment-layering-report.v1',
    run_id: 'run_step38_ready',
    source: 'canonical_dsl_visual_asset_materializer',
    ...proceduralCanvasBackendPolicy(),
    environment_layering_gate: {
      verdict: 'PASS',
      ...proceduralCanvasBackendPolicy(),
      background_layer_present: true,
      midground_layer_present: true,
      foreground_platform_layer_present: true,
      prop_variant_count: 3,
      hazard_variant_count: 2,
      area_theme_variant_count: 3,
      jungle_motif_visible: true,
      metal_motif_visible: true,
      industrial_core_motif_visible: true,
      label_or_overlay_used_as_art_evidence: false,
      screenshots_support_claims: true,
      ...overrides
    }
  };
}

function buildStartupSurvivabilityGate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 'step38.startup-survivability-gate.v1',
    run_id: 'run_step38_ready',
    source: 'fresh_session_before_input_runtime_probe',
    startup_survivability_gate: {
      verdict: 'PASS',
      fresh_session_starts_alive: true,
      health_at_spawn: 3,
      health_at_spawn_gt_zero: true,
      game_over_at_spawn: false,
      minimum_safe_control_window_sec: 3,
      spawn_immediate_lethal_pressure: false,
      player_has_reaction_space: true,
      state_injection_used: false,
      direct_health_mutation_used: false,
      direct_game_over_trigger_used: false,
      ...overrides
    }
  };
}

function buildEncounterPlayabilityGate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 'step38.encounter-playability-gate.v1',
    run_id: 'run_step38_ready',
    source: 'fresh_manual_traversal_input_only',
    encounter_playability_gate: {
      verdict: 'PASS',
      spawn_safe_window_sec: 3,
      overcrowded_spawn_detected: false,
      enemy_density_within_camera_limit: true,
      projectile_density_within_camera_limit: true,
      player_has_reaction_space: true,
      wave1_intro_pressure: true,
      weapon_pickup_reachable: true,
      wave2_mixed_pressure: true,
      boss_arena_reachable: true,
      boss_pressure_readable: true,
      large_empty_traversal_detected: false,
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      ...overrides
    }
  };
}

function buildVisualVerticalSliceEvidence(): Record<string, unknown> {
  const windows = [
    buildVisualSliceWindow('00_spawn_hud_marker', ['player', 'enemy_ground', 'enemy_static', 'pickup'], ['player', 'enemy_wave', 'static_enemy', 'weapon_pickup', 'runtime_feedback']),
    buildVisualSliceWindow('01_movement_shooting', ['player', 'projectile'], ['player', 'projectile', 'runtime_feedback']),
    buildVisualSliceWindow('02_weapon_pickup_visible', ['player', 'pickup'], ['player', 'weapon_pickup', 'runtime_feedback']),
    buildVisualSliceWindow('03_wave_1_enemy_mix', ['player', 'enemy_ground', 'enemy_static'], ['player', 'enemy_wave', 'static_enemy', 'runtime_feedback']),
    buildVisualSliceWindow('04_wave_2_or_area_2_visible', ['player', 'flying_enemy', 'projectile', 'hazard'], ['player', 'flying_enemy', 'projectile', 'hazard', 'region_transition']),
    buildVisualSliceWindow('05_boss_telegraph_visible', ['player', 'boss', 'projectile', 'hazard'], ['player', 'boss', 'boss_telegraph', 'projectile', 'hazard', 'runtime_feedback']),
    buildVisualSliceWindow('06_boss_phase_visible', ['player', 'boss', 'projectile', 'hazard'], ['player', 'boss', 'boss_phase', 'projectile', 'hazard', 'runtime_feedback']),
    buildVisualSliceWindow('07_mission_complete_or_exit_state', ['player', 'boss'], ['player', 'boss', 'boss_phase', 'runtime_feedback'])
  ];

  return {
    status: 'PASSED',
    evidence_source: 'browser_canvas_pixel_probe',
    run_id: 'run_step38_test',
    marker_run_id_matches: true,
    canonical_dsl_visual_intent_runtime_bound: true,
    canvas_pixel_probe_status: 'PASSED',
    screenshot_count: windows.length,
    canvas_pixel_probe_count: windows.length,
    observed_runtime_roles: STEP38_TEST_REQUIRED_VISUAL_ROLES,
    missing_runtime_roles: [],
    observed_content_types: ['player', 'enemy_wave', 'static_enemy', 'flying_enemy', 'weapon_pickup', 'projectile', 'hazard', 'boss', 'boss_telegraph', 'boss_phase', 'region_transition', 'runtime_feedback'],
    missing_content_types: [],
    windows
  };
}

function buildVisualRuntimeBindingReport(overrides: Partial<Record<(typeof STEP38_TEST_REQUIRED_VISUAL_RUNTIME_OBJECTS)[number], Record<string, unknown>>> = {}): Record<string, unknown> {
  const objects = STEP38_TEST_REQUIRED_VISUAL_RUNTIME_OBJECTS.map((requiredObject) => ({
    required_object: requiredObject,
    asset_meta_required_object: requiredObject,
    canonical_id: requiredObject === 'default_weapon' ? 'weapon.default_straight_single.v1' : `canonical_${requiredObject}`,
    expected_entity_id: requiredObject === 'default_weapon' ? 'weapon.default_straight_single.v1' : `canonical_${requiredObject}`,
    expected_asset_id: requiredObject === 'default_weapon' ? 'weapon.default_straight_single.v1' : `canonical_${requiredObject}`,
    expected_asset_intent_ref: `${requiredObject}_asset_intent`,
    role: visualRuntimeObjectRole(requiredObject),
    source: 'canonical_dsl',
    visual_role: visualRuntimeObjectVisualRole(requiredObject),
    asset_role: visualRuntimeObjectAssetRole(requiredObject),
    asset_required_object_binding_source: {
      type: 'asset_manifest_required_object',
      manifest_path: 'assets[].requiredObject',
      asset_id: requiredObject === 'default_weapon' ? 'weapon.default_straight_single.v1' : `canonical_${requiredObject}`,
      asset_intent_ref: `${requiredObject}_asset_intent`,
      entity_id: requiredObject === 'default_weapon' ? 'weapon.default_straight_single.v1' : `canonical_${requiredObject}`,
      material_slot: requiredObject,
      required_object: requiredObject,
      asset_meta_required_object: requiredObject,
      expected_entity_id: requiredObject === 'default_weapon' ? 'weapon.default_straight_single.v1' : `canonical_${requiredObject}`,
      expected_asset_id: requiredObject === 'default_weapon' ? 'weapon.default_straight_single.v1' : `canonical_${requiredObject}`,
      expected_asset_intent_ref: `${requiredObject}_asset_intent`,
      texture_key:
        requiredObject === 'boss_projectile_phase_object'
          ? 'step38_boss_projectile_phase_object'
          : `${requiredObject}_texture_key`
    },
    asset_required_object_binding_path: [
      'asset_manifest.assets[].requiredObject',
      'loadSpriteAssets',
      'runtime_render_object',
      'materialization_report'
    ],
    asset_required_object_binding_valid: true,
    palette: ['#facc15', '#38bdf8', '#0f172a'],
    silhouette: `${requiredObject}_silhouette_from_canonical_dsl`,
    texture_key:
      requiredObject === 'boss_projectile_phase_object'
        ? 'step38_boss_projectile_phase_object'
        : `${requiredObject}_texture_key`,
    visual_intent_sha: 'b'.repeat(64),
    asset_design_spec_sha: 'c'.repeat(64),
    motif_coverage: ['jungle', 'metal', 'industrial_core'],
    geometry_signature: `${requiredObject}_dsl_geometry_signature`,
    dsl_geometry_fingerprint: 'd'.repeat(64),
    role_static_control_fingerprint: 'e'.repeat(64),
    visual_geometry_dependency: true,
    template_fingerprint: `${requiredObject}_dsl_template_fingerprint`,
    role_static_template_used: false,
    role_static_svg_template_used: false,
    old_svgForVisualIntent_used: false,
    template_derived_placeholder: false,
    role_only_generation_detected: false,
    matches_known_static_template: false,
    distinct_silhouette: true,
    renderer_kind: 'canvas_texture',
    loaded_in_runtime: true,
    texture_cache_present: true,
    bound_to_runtime_object: true,
    factory_used_texture_key: true,
    used_placeholder_renderer: false,
    materialized: true,
    run_scoped_asset_path: `/repo/generated/step38/run_step38_ready/assets/generated/${requiredObject}.svg`,
    run_scoped_asset_sha256: 'a'.repeat(64),
    served_asset_path: `public/assets/generated/${requiredObject}.svg`,
    served_asset_sha256: 'a'.repeat(64),
    copied_to_served_assets: true,
    visible_in_fresh_manual_traversal: true,
    placeholder: false,
    label_only: false,
    evidence_screenshots: [visualRuntimeObjectScreenshot(requiredObject)],
    ...overrides[requiredObject]
  }));

  const missingObjects = objects
    .filter(
      (object) =>
        object.placeholder !== false ||
        object.bound_to_runtime_object !== true ||
        object.factory_used_texture_key !== true ||
        object.used_placeholder_renderer !== false ||
        object.label_only !== false ||
        object.materialized !== true ||
        object.visible_in_fresh_manual_traversal !== true
    )
    .map((object) => object.required_object);

  return {
    schemaVersion: 'step38.visual-runtime-binding-report.v1',
    status: missingObjects.length === 0 ? 'PASSED' : 'FAILED',
    source: 'canonical_dsl',
    evidence_source: 'fresh_manual_traversal_screenshots',
    runtime_authority: 'canonical_dsl_visual_binding',
    required_objects: [...STEP38_TEST_REQUIRED_VISUAL_RUNTIME_OBJECTS],
    missing_objects: missingObjects,
    fresh_manual_traversal_screenshots: [...STEP38_TEST_REQUIRED_MANUAL_TRAVERSAL_SCREENSHOTS],
    objects
  };
}

function buildVisualAssetMaterializationReport(
  overrides: Partial<Record<(typeof STEP38_TEST_REQUIRED_VISUAL_RUNTIME_OBJECTS)[number], Record<string, unknown>>> = {}
): Record<string, unknown> {
  const bindingReport = buildVisualRuntimeBindingReport(overrides);
  const objects = Array.isArray(bindingReport.objects) ? bindingReport.objects : [];
  const missingObjects = objects
    .filter((object) => {
      if (typeof object !== 'object' || object === null || Array.isArray(object)) return true;
      const record = object as Record<string, unknown>;
      return (
        record.source !== 'canonical_dsl' ||
        record.materialized !== true ||
        record.copied_to_served_assets !== true ||
        record.loaded_in_runtime !== true ||
        record.texture_cache_present !== true ||
        record.bound_to_runtime_object !== true ||
        record.factory_used_texture_key !== true ||
        record.visible_in_fresh_manual_traversal !== true ||
        record.placeholder !== false ||
        record.label_only !== false ||
        typeof record.run_scoped_asset_path !== 'string' ||
        typeof record.run_scoped_asset_sha256 !== 'string' ||
        typeof record.served_asset_path !== 'string' ||
        typeof record.served_asset_sha256 !== 'string' ||
        record.run_scoped_asset_sha256 !== record.served_asset_sha256
      );
    })
    .map((object) => (typeof object === 'object' && object !== null && !Array.isArray(object) ? (object as Record<string, unknown>).required_object : 'missing'));
  return {
    schemaVersion: 'step38.visual-asset-materialization-report.v1',
    status: missingObjects.length === 0 ? 'PASSED' : 'FAILED',
    source: 'canonical_dsl',
    evidence_source: 'fresh_manual_traversal_screenshots',
    runtime_authority: 'canonical_dsl_visual_binding',
    required_objects: [...STEP38_TEST_REQUIRED_VISUAL_RUNTIME_OBJECTS],
    missing_objects: missingObjects,
    fresh_manual_traversal_screenshots: [...STEP38_TEST_REQUIRED_MANUAL_TRAVERSAL_SCREENSHOTS],
    materialization_gate: {
      verdict: missingObjects.length === 0 ? 'PASS' : 'FAIL',
      all_required_assets_materialized: missingObjects.length === 0,
      all_required_assets_run_scoped: missingObjects.length === 0,
      all_required_assets_loaded: missingObjects.length === 0,
      all_required_assets_factory_bound: missingObjects.length === 0,
      all_required_assets_visible_in_fresh_manual_traversal: missingObjects.length === 0,
      visual_intent_sha_present: missingObjects.length === 0,
      asset_design_spec_sha_present: missingObjects.length === 0,
      motif_coverage_present: missingObjects.length === 0,
      all_required_assets_distinct_silhouette: missingObjects.length === 0,
      role_static_svg_template_used: false,
      old_svgForVisualIntent_used: false,
      template_derived_placeholder_detected: false,
      label_only_visual_evidence: objects.some(
        (object) => typeof object === 'object' && object !== null && !Array.isArray(object) && (object as Record<string, unknown>).label_only === true
      ),
      placeholder_visual_evidence: objects.some(
        (object) => typeof object === 'object' && object !== null && !Array.isArray(object) && (object as Record<string, unknown>).placeholder === true
      )
    },
    objects
  };
}

function buildRuntimeTextureLoadReport(overrides: Partial<Record<(typeof STEP38_TEST_REQUIRED_VISUAL_RUNTIME_OBJECTS)[number], Record<string, unknown>>> = {}): Record<string, unknown> {
  const textures = STEP38_TEST_REQUIRED_VISUAL_RUNTIME_OBJECTS.map((requiredObject) => ({
    canonical_id: requiredObject === 'default_weapon' ? 'weapon.default_straight_single.v1' : `canonical_${requiredObject}`,
    required_object: requiredObject,
    texture_key:
      requiredObject === 'boss_projectile_phase_object'
        ? 'step38_boss_projectile_phase_object'
        : `${requiredObject}_texture_key`,
    served_asset_path: `public/assets/generated/${requiredObject}.svg`,
    loaded_in_runtime: true,
    texture_cache_present: true,
    width: 80,
    height: 80,
    source: 'canonical_dsl',
    ...overrides[requiredObject]
  }));
  const missingTextureKeys = textures
    .filter((texture) => texture.loaded_in_runtime !== true || texture.texture_cache_present !== true)
    .map((texture) => texture.texture_key);
  return {
    schemaVersion: 'step38.runtime-texture-load-report.v1',
    source: 'canonical_dsl',
    texture_load_gate: {
      verdict: missingTextureKeys.length === 0 ? 'PASS' : 'FAIL',
      required_textures_loaded: missingTextureKeys.length === 0,
      missing_texture_keys: missingTextureKeys,
      texture_cache_probe_available: true
    },
    textures
  };
}

function buildArtDirectionQualityReport(): Record<string, unknown> {
  return {
    schemaVersion: 'step38.art-direction-quality-report.v1',
    run_id: 'run_step38_ready',
    source: 'canonical_dsl',
    visible_quality_screenshot_labels: ['art_spawn', 'art_wave1', 'art_wave2', 'art_boss'],
    art_direction_quality_gate: {
      verdict: 'PASS',
      player_has_distinct_sprite: true,
      enemy_types_have_distinct_silhouettes: true,
      boss_has_large_distinct_visual: true,
      environment_has_layered_theme: true,
      weapon_projectiles_visibly_distinct: true,
      jungle_metal_industrial_theme_visible: true,
      placeholder_style_dominant: false,
      label_only_visual_evidence: false,
      operator_visible_quality_ready: true
    }
  };
}

function buildEncounterDirectorPlan(): Record<string, unknown> {
  return {
    schemaVersion: 'step38.encounter-director-plan.v1',
    run_id: 'run_step38_ready',
    source: 'canonical_dsl',
    route: ['spawn', 'wave1', 'weapon_pickup', 'area2', 'wave2', 'mixed_enemy_pressure', 'boss_arena', 'boss_phase_1', 'boss_phase_2', 'exit_or_mission_complete'],
    waves: [
      {
        id: 'wave_area1_intro',
        segment_id: 'jungle_entrance',
        trigger: { type: 'camera_x', x: 320 },
        enemy_mix: [
          { enemy_type: 'ground_patrol', count: 2 },
          { enemy_type: 'ranged_shooter', count: 1 }
        ],
        spawn_cadence_ms: 900,
        max_active: 3,
        clear_condition: { type: 'defeat_or_traverse_pressure_band' },
        progression_unlock: 'weapon_pickup',
        source: 'canonical_dsl'
      },
      {
        id: 'wave_area2_pressure',
        segment_id: 'metal_bridge',
        trigger: { type: 'camera_x', x: 1200 },
        enemy_mix: [
          { enemy_type: 'ground_patrol', count: 2 },
          { enemy_type: 'ranged_shooter', count: 1 },
          { enemy_type: 'flying_enemy', count: 2 }
        ],
        spawn_cadence_ms: 700,
        max_active: 5,
        clear_condition: { type: 'defeat_or_traverse_pressure_band' },
        progression_unlock: 'boss_arena',
        source: 'canonical_dsl'
      }
    ]
  };
}

function buildEncounterDirectorRuntimeEvidence(): Record<string, unknown> {
  return {
    schemaVersion: 'step38.encounter-director-runtime-evidence.v1',
    run_id: 'run_step38_ready',
    source: 'canonical_dsl',
    evidence_source: 'fresh_manual_traversal_input_only',
    encounter_director_gate: {
      verdict: 'PASS',
      fresh_manual_session: true,
      input_only: true,
      wave1_spawned_by_traversal: true,
      wave2_spawned_by_traversal: true,
      enemy_types_visible_count: 3,
      weapon_pickup_reached_by_input: true,
      area2_reached_by_input: true,
      boss_arena_reached_by_input: true,
      boss_phase_1_visible: true,
      boss_phase_2_visible_or_reachable: true,
      wave_clear_reachable_by_input: true,
      large_empty_traversal_detected: false
    }
  };
}

function buildOutcomeStateMachineReport(): Record<string, unknown> {
  const completionPreconditions = [
    'wave_progression_complete',
    'area_progression_complete',
    'weapon_pickup_consumed',
    'boss_phase_seen',
    'boss_defeated_by_input'
  ];
  return {
    schemaVersion: 'step38.outcome-state-machine-report.v1',
    run_id: 'run_step38_ready',
    source: 'runtime_outcome_state_machine',
    states: ['RUNNING', 'PLAYER_DAMAGED', 'PLAYER_DEAD', 'RETRY_CONSUMED', 'GAME_OVER', 'MISSION_COMPLETE'],
    transitions: [
      { from: 'RUNNING', to: 'PLAYER_DAMAGED', trigger: 'player.damaged', source: 'runtime_collision' },
      { from: 'PLAYER_DAMAGED', to: 'PLAYER_DEAD', trigger: 'player.dead', source: 'runtime_health' },
      { from: 'PLAYER_DEAD', to: 'RETRY_CONSUMED', trigger: 'retry.consumed', source: 'runtime_health' },
      { from: 'RETRY_CONSUMED', to: 'GAME_OVER', trigger: 'game.over', source: 'runtime_health' },
      { from: 'RUNNING', to: 'MISSION_COMPLETE', trigger: 'mission.complete', source: 'runtime_objective' }
    ],
    outcome_state_machine_gate: {
      verdict: 'PASS',
      win_path_connected: true,
      lose_path_connected: true,
      game_over_persistent: true,
      mission_complete_persistent: true,
      real_playthrough_completion_verified: true,
      mission_complete_requires_completion_preconditions: true,
      completion_preconditions_satisfied: true,
      early_mission_complete_detected: false,
      text_or_overlay_only_win_transition: false,
      satisfied_completion_preconditions: completionPreconditions
    }
  };
}

function buildWinPathEvidence(): Record<string, unknown> {
  const completionPreconditions = [
    'wave_progression_complete',
    'area_progression_complete',
    'weapon_pickup_consumed',
    'boss_phase_seen',
    'boss_defeated_by_input'
  ];
  return {
    schemaVersion: 'step38.win-path-evidence.v1',
    run_id: 'run_step38_ready',
    source: 'fresh_manual_success_path',
    observed_events: ['mission.complete', 'game.won'],
    win_path_gate: {
      verdict: 'PASS',
      fresh_manual_session: true,
      input_only: true,
      state_injection_used: false,
      real_playthrough_completion_verified: true,
      boss_defeated_by_input: true,
      all_required_waves_resolved_before_win: true,
      all_required_regions_traversed_before_win: true,
      weapon_and_boss_phase_reached_before_win: true,
      text_or_overlay_only_evidence: false,
      early_mission_complete_detected: false,
      verified_completion_preconditions: completionPreconditions,
      mission_complete_overlay_visible: true,
      mission_complete_overlay_persistent: true,
      telemetry_mission_complete_recorded: true,
      mission_complete_visible: true,
      screenshot_evidence_path: '/tmp/mission_complete.png',
      metadata_evidence_path: '/tmp/mission_complete.metadata.json'
    }
  };
}

function buildLosePathEvidence(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 'step38.lose-path-evidence.v1',
    run_id: 'run_step38_ready',
    source: 'fresh_manual_failure_path',
    observed_events: ['player.damaged', 'player.dead', 'game.over'],
    lose_path_gate: {
      verdict: 'PASS',
      fresh_manual_session: true,
      input_only: true,
      state_injection_used: false,
      direct_health_mutation_used: false,
      direct_game_over_trigger_used: false,
      game_over_at_spawn: false,
      player_damage_observed: true,
      health_reached_zero_or_retries_exhausted: true,
      game_over_overlay_visible: true,
      game_over_overlay_persistent: true,
      telemetry_game_over_recorded: true,
      screenshot_evidence_path: '/tmp/game_over.png',
      metadata_evidence_path: '/tmp/game_over.metadata.json',
      ...overrides
    }
  };
}

function visualRuntimeObjectRole(requiredObject: string): string {
  if (requiredObject.includes('enemy')) return 'enemy';
  if (requiredObject.includes('weapon') || requiredObject === 'projectile') return 'weapon';
  if (requiredObject.includes('boss')) return 'boss';
  if (requiredObject.includes('marker') || requiredObject.includes('environment')) return 'environment';
  return 'player';
}

function visualRuntimeObjectVisualRole(requiredObject: string): string {
  const roleByObject: Record<string, string> = {
    default_weapon: 'default_weapon',
    pickup_weapon: 'pickup',
    ground_enemy: 'enemy_ground',
    ranged_enemy: 'enemy_static',
    wave_marker: 'enemy_wave_marker',
    area_marker: 'region_progression_gate',
    boss_projectile_phase_object: 'boss_phase_projectile',
    environment_hazard: 'hazard'
  };
  return roleByObject[requiredObject] ?? requiredObject;
}

function visualRuntimeObjectAssetRole(requiredObject: string): string {
  const roleByObject: Record<string, string> = {
    default_weapon: 'default_weapon',
    pickup_weapon: 'pickup',
    ground_enemy: 'enemy_ground',
    ranged_enemy: 'enemy_static',
    boss_projectile_phase_object: 'boss_projectile',
    environment_hazard: 'hazard'
  };
  return roleByObject[requiredObject] ?? requiredObject;
}

function visualRuntimeObjectScreenshot(requiredObject: string): string {
  if (requiredObject === 'projectile') return '02_projectile_visible_by_input';
  if (requiredObject.includes('boss')) return '05_boss_phase_reached_by_input';
  if (requiredObject === 'flying_enemy' || requiredObject === 'pickup_weapon' || requiredObject === 'environment_hazard') return '03_wave2_reached_by_input';
  if (requiredObject === 'ground_enemy' || requiredObject === 'ranged_enemy' || requiredObject === 'wave_marker') return '01_wave1_reached_by_input';
  return '00_spawn_start';
}

function buildVisualSliceWindow(label: string, roles: string[], contentTypes: string[]): Record<string, unknown> {
  return {
    label,
    screenshot: `${label}.png`,
    screenshot_path: `/tmp/${label}.png`,
    screenshot_sha256: '0'.repeat(64),
    metadata_path: `/tmp/${label}.metadata.json`,
    camera_x: label.includes('boss') ? 2200 : label.includes('wave_2') ? 1450 : 120,
    preview_window: label.includes('boss') ? 'window_2_boss' : label.includes('wave_2') ? 'window_1_weapon_wave_area' : 'window_0_intro',
    canonical_time_range_sec: label.includes('boss') ? [400, 480] : label.includes('wave_2') ? [180, 240] : [0, 60],
    projection_must_show: label.includes('boss') ? ['boss', 'boss_telegraph', 'boss_phase_1', 'boss_phase_2'] : label.includes('wave_2') ? ['weapon_pickup', 'area_2', 'wave_2', 'flying_enemy'] : ['player', 'area_1', 'wave_1'],
    visible_canonical_objects: ['player', 'enemy_ground_patrol_03', 'weapon_pickup_scatter_01', 'molten_core_guard'],
    required_roles_seen: contentTypes,
    pixel_probe_passed: true,
    placeholder_objects_seen: false,
    visible_runtime_roles: roles,
    visible_content_types: contentTypes,
    canvas_pixel_probe: {
      status: 'PASSED',
      probed_runtime_object_count: roles.length,
      non_background_pixel_count: roles.length
    }
  };
}

function buildManualVerticalSliceProjection(): Record<string, unknown> {
  return {
    schemaVersion: 'step38.manual-vertical-slice-projection.v1',
    projection_mode: 'manual_vertical_slice',
    source: 'canonical_dsl',
    product_duration_sec: { min: 480, max: 720 },
    preview_target_sec: 50,
    compression_is_preview_only: true,
    canonical_dsl_sha: '1'.repeat(64),
    runtime_plan_sha: '2'.repeat(64),
    scene_ir_sha: '3'.repeat(64),
    windows: [
      { id: 'window_0_intro', canonical_time_range_sec: [0, 60], preview_x_range: [0, 900], must_show: ['player', 'default_weapon', 'area_1', 'wave_1', 'movement', 'jump', 'crouch', 'shooting'] },
      { id: 'window_1_weapon_wave_area', canonical_time_range_sec: [180, 240], preview_x_range: [900, 1800], must_show: ['weapon_pickup', 'area_2', 'wave_2', 'ranged_enemy', 'flying_enemy', 'enemy_wave_trigger', 'enemy_wave_clear_condition'] },
      { id: 'window_2_boss', canonical_time_range_sec: [400, 480], preview_x_range: [1800, 2800], must_show: ['boss', 'boss_telegraph', 'boss_phase_1', 'boss_phase_2', 'mission_complete_or_exit'] }
    ],
    waves: [
      {
        id: 'wave_area1_intro',
        segment_id: 'jungle_entrance',
        canonical_time_sec: 24,
        preview_window: 'window_0_intro',
        trigger: { type: 'camera_x', x: 320 },
        enemy_mix: [{ enemy_type: 'ground_patrol', count: 2 }],
        clear_condition: { type: 'defeat_all_wave_enemies' },
        visual_evidence_required: true,
        source: 'canonical_dsl'
      },
      {
        id: 'wave_area2_pressure',
        segment_id: 'metal_bridge',
        canonical_time_sec: 203.9,
        preview_window: 'window_1_weapon_wave_area',
        trigger: { type: 'camera_x', x: 1200 },
        enemy_mix: [
          { enemy_type: 'ground_patrol', count: 2 },
          { enemy_type: 'ranged_shooter', count: 1 },
          { enemy_type: 'flying_enemy', count: 2 }
        ],
        clear_condition: { type: 'defeat_all_wave_enemies' },
        visual_evidence_required: true,
        source: 'canonical_dsl'
      }
    ],
    boss: {
      id: 'molten_core_guard',
      preview_window: 'window_2_boss',
      canonical_time_sec: 420,
      phases: ['phase_1', 'phase_2'],
      telegraph_required: true,
      source: 'canonical_dsl'
    }
  };
}
