import { describe, expect, it } from 'vitest';

import {
  buildSceneIrAuthorityReport,
  buildSceneIrCoverageReport,
  SceneIrSchema,
  buildSceneIr,
  validateAndNormalizeRawGameDsl
} from '../../packages/game-dsl/src/index.js';
import { createSideScrollingRunAndGunRawDsl } from './fixtures.js';

describe('Step 33 Scene IR', () => {
  it('builds executable Scene IR from side-scrolling scene DSL with provenance', () => {
    const rawDsl = createSideScrollingSceneDsl();
    const normalized = validateAndNormalizeRawGameDsl(rawDsl);

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const sceneIr = buildSceneIr({
      projectId: 'proj_20260618_step33_scene_ir',
      runId: 'run_20260618_step33_scene_ir',
      rawDsl: normalized.rawDsl,
      ir: normalized.ir
    });

    expect(SceneIrSchema.parse(sceneIr)).toEqual(sceneIr);
    expect(sceneIr).toMatchObject({
      schemaVersion: 'step33.scene-ir.v1',
      runtimeProfile: 'side_scrolling_run_and_gun.v1',
      source: 'runtime_plan_derived',
      scenes: [
        expect.objectContaining({
          id: 'level_01',
          backgrounds: [expect.objectContaining({ runtimeId: 'background.sky_night', assetIntentRef: 'scene_night_sky' })],
          platforms: expect.arrayContaining([
            expect.objectContaining({ runtimeId: 'platform.ground_intro', collider: expect.objectContaining({ runtimeId: 'collider.ground_intro' }) })
          ]),
          player: expect.objectContaining({ runtimeId: 'entity.player', visualAssetIntentRef: 'player_red_runner' }),
          enemyInstances: [
            expect.objectContaining({
              runtimeId: 'spawn.spawn_intro_drone',
              archetypeRef: 'drone_type',
              count: 3
            }),
            expect.objectContaining({ runtimeId: 'spawn.spawn_bridge_drone', count: 5 })
          ],
          pickups: [expect.objectContaining({ runtimeId: 'pickup.field_medkit', kind: 'health' })],
          goals: [expect.objectContaining({ runtimeId: 'goal.reach_exit', kind: 'reach', x: 1240 })]
        })
      ]
    });
    expect(sceneIr.provenance['background.sky_night']).toMatchObject({ source: 'dsl', dslPath: '/scenes/0/backgroundLayers/0' });
    expect(sceneIr.provenance['spawn.spawn_intro_drone']).toMatchObject({
      source: 'runtime_plan',
      dslPath: '/runtime_plan/side_scrolling/waves/0',
      relatedDslPaths: ['/level/spawns/0']
    });
  });

  it('does not let a v0.1 scene enemy id collide with runtime-plan protected spawns', () => {
    const rawDsl = createSideScrollingSceneDsl();
    rawDsl.scenes[0].enemyInstances = [
      { ...rawDsl.scenes[0].enemyInstances[0], id: 'player' }
    ];
    const normalized = validateAndNormalizeRawGameDsl(rawDsl);

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const sceneIr = buildSceneIr({
      projectId: 'proj_20260618_step33_scene_runtime_namespace',
      runId: 'run_20260618_step33_scene_runtime_namespace',
      rawDsl: normalized.rawDsl,
      ir: normalized.ir
    });

    const player = sceneIr.scenes[0].player;
    const enemy = sceneIr.scenes[0].enemyInstances[0];
    expect(enemy.runtimeId).toBe('spawn.spawn_intro_drone');
    expect(enemy.runtimeId).not.toBe(player.runtimeId);
    expect(sceneIr.provenance[player.provenanceRef]).toMatchObject({
      source: 'runtime_plan',
      dslPath: '/runtime_plan/side_scrolling/player',
      relatedDslPaths: ['/player', '/player/visual']
    });
    expect(sceneIr.provenance[enemy.provenanceRef]).toMatchObject({
      source: 'runtime_plan',
      dslPath: '/runtime_plan/side_scrolling/waves/0',
      relatedDslPaths: ['/level/spawns/0']
    });
  });

  it('marks legacy side-scrolling DSL without scenes as runtime-plan-derived', () => {
    const rawDsl = createSideScrollingRunAndGunRawDsl();
    const normalized = validateAndNormalizeRawGameDsl(rawDsl);

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const sceneIr = buildSceneIr({
      projectId: 'proj_20260618_step33_runtime_plan_scene',
      runId: 'run_20260618_step33_runtime_plan_scene',
      rawDsl: normalized.rawDsl,
      ir: normalized.ir
    });

    expect(sceneIr.source).toBe('runtime_plan_derived');
    expect(sceneIr.scenes[0].backgrounds[0]).toMatchObject({
      runtimeId: 'background.runtime_plan_default',
      provenanceRef: 'background.runtime_plan_default'
    });
    expect(sceneIr.provenance['background.runtime_plan_default']).toMatchObject({
      source: 'system',
      dslPath: '/world/visual_theme',
      reason: expect.stringContaining('Scene DSL is absent')
    });
    expect(sceneIr.provenance['platform.ground_intro']).toMatchObject({
      source: 'runtime_plan',
      dslPath: '/runtime_plan/side_scrolling/platforms/0',
      relatedDslPaths: ['/level/terrain/0']
    });
  });

  it('does not mark runtime-plan-derived goals as DSL-authored when raw DSL is absent', () => {
    const rawDsl = createSideScrollingRunAndGunRawDsl();
    const normalized = validateAndNormalizeRawGameDsl(rawDsl);

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const sceneIr = buildSceneIr({
      projectId: 'proj_20260618_step33_runtime_plan_only_scene',
      runId: 'run_20260618_step33_runtime_plan_only_scene',
      ir: normalized.ir
    });

    const goal = sceneIr.scenes[0].goals[0];
    expect(sceneIr.source).toBe('runtime_plan_derived');
    expect(sceneIr.provenance[goal.provenanceRef]).toMatchObject({
      source: 'runtime_plan',
      dslPath: '/runtime_plan/side_scrolling/winCondition'
    });
  });

  it('does not let a partial authored scene truncate runtime-plan terrain, waves, pickups, or objectives', () => {
    const rawDsl = createSideScrollingSceneDsl();
    rawDsl.scenes[0].platforms = [
      rawDsl.scenes[0].platforms[0],
      {
        id: 'platform_partial_visual',
        x: 980,
        y: 380,
        width: 280,
        height: 24,
        shape: 'rectangle' as const,
        materialRef: 'terrain_snow_metal',
        visualAssetIntentRef: 'tile_snow_metal_bridge',
        collision: { enabled: true },
        tags: ['platform']
      }
    ];
    rawDsl.scenes[0].enemyInstances = rawDsl.scenes[0].enemyInstances.slice(0, 1);
    const normalized = validateAndNormalizeRawGameDsl(rawDsl);

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }
    expect(normalized.rawDsl.scenes?.[0].platforms).toHaveLength(2);
    expect(normalized.rawDsl.scenes?.[0].enemyInstances).toHaveLength(1);

    const ir = withStep37ReferenceRuntimePlan(normalized.ir);
    const runtimePlan = ir.runtime_plan.side_scrolling;
    if (runtimePlan === undefined) {
      throw new Error('Expected Step37 reference runtime plan.');
    }
    expect(runtimePlan.platforms).toHaveLength(5);
    expect(runtimePlan.waves).toHaveLength(3);
    expect(runtimePlan.pickups).toHaveLength(1);
    expect(runtimePlan.winCondition).toMatchObject({ kind: 'reach_exit', targetX: 3800 });

    const sceneIr = buildSceneIr({
      projectId: 'proj_20260619_step37_scene_overlay',
      runId: 'run_20260619_step37_scene_overlay',
      rawDsl: normalized.rawDsl,
      ir
    });
    const coverage = buildSceneIrCoverageReport({
      runId: 'run_20260619_step37_scene_overlay',
      ir,
      sceneIr
    });
    const authority = buildSceneIrAuthorityReport({
      runId: 'run_20260619_step37_scene_overlay',
      sceneIr
    });

    expect(sceneIr.source).toBe('runtime_plan_derived');
    expect(sceneIr.scenes[0].platforms).toHaveLength(5);
    const platformRuntimeIds = sceneIr.scenes[0].platforms.map((platform) => platform.runtimeId);
    expect(platformRuntimeIds).toEqual([
      'platform.ground_intro',
      'platform.platform_bridge',
      'platform.platform_mid',
      'platform.platform_high',
      'platform.ground_exit'
    ]);
    expect(platformRuntimeIds).not.toContain('platform.platform_partial_visual');
    expect(sceneIr.provenance).not.toHaveProperty('platform.platform_partial_visual');
    expect(sceneIr.scenes[0].enemyInstances).toHaveLength(3);
    expect(sceneIr.scenes[0].enemyInstances.map((enemy) => enemy.runtimeId)).toEqual([
      'spawn.spawn_intro_drone',
      'spawn.spawn_bridge_drone',
      'spawn.spawn_exit_drone'
    ]);
    expect(sceneIr.scenes[0].pickups).toHaveLength(1);
    expect(sceneIr.scenes[0].pickups[0]).toMatchObject({ runtimeId: 'pickup.field_medkit', kind: 'health' });
    expect(sceneIr.scenes[0].goals[0]).toMatchObject({ kind: 'reach', x: 3800 });
    expect(sceneIr.scenes[0].backgrounds[0]).toMatchObject({
      runtimeId: 'background.sky_night',
      assetIntentRef: 'scene_night_sky'
    });
    expect(sceneIr.provenance['platform.platform_mid']).toMatchObject({
      source: 'runtime_plan',
      dslPath: '/runtime_plan/side_scrolling/platforms/2'
    });
    expect(sceneIr.provenance['spawn.spawn_exit_drone']).toMatchObject({
      source: 'runtime_plan',
      dslPath: '/runtime_plan/side_scrolling/waves/2'
    });
    expect(coverage).toMatchObject({
      status: 'PASS',
      terrain: { runtimePlanCount: 5, mappedCount: 5, missingSourceIds: [] },
      waves: { runtimePlanCount: 3, mappedCount: 3, missingSourceIds: [] },
      pickups: { runtimePlanCount: 1, mappedCount: 1, missingSourceIds: [] },
      objectives: { runtimePlanCount: 1, mappedCount: 1, missingSourceIds: [] },
      semanticChecks: {
        winTargetPreserved: true,
        noRequiredWaveDropped: true,
        noRequiredPickupDropped: true,
        noProtectedDomainClearedByOverlay: true
      }
    });
    expect(authority).toMatchObject({
      decision: 'runtime_plan_with_dsl_overlay',
      domainOwnership: {
        terrain: 'runtime_plan',
        spawns: 'runtime_plan',
        pickups: 'runtime_plan',
        objectives: 'runtime_plan',
        camera_gameplay_bounds: 'runtime_plan',
        presentation: 'normalized_dsl_scene_overlay',
        background: 'normalized_dsl_scene_overlay',
        lighting: 'normalized_dsl_scene_overlay',
        decorations: 'normalized_dsl_scene_overlay',
        asset_bindings: 'step33_asset_binding'
      },
      conflicts: [],
      diagnostics: []
    });
  });
});

function createSideScrollingSceneDsl() {
  const base = createSideScrollingRunAndGunRawDsl();
  const enemyType = base.enemyTypes[0];

  return {
    ...base,
    player: {
      ...base.player,
      visual: {
        assetIntentRef: 'player_red_runner',
        styleRef: 'style_pixel_16',
        facingMode: 'flip_x' as const,
        animationSetRef: 'anim_run_jump_shoot'
      }
    },
    enemyTypes: [
      {
        ...enemyType,
        behaviorRef: 'behavior_ground_patrol',
        visual: {
          assetIntentRef: 'enemy_mech_drone',
          styleRef: 'style_pixel_16',
          facingMode: 'flip_x' as const,
          animationSetRef: 'anim_enemy_patrol'
        },
        colliderRef: 'collider_small_enemy',
        movementRef: 'movement_ground_patrol',
        tags: ['mechanical']
      }
    ],
    scenes: [
      {
        id: 'level_01',
        theme: {
          id: 'snow_base_night',
          style: 'pixel art 16 bit',
          biome: 'snow base',
          timeOfDay: 'night' as const,
          terrainMaterialSet: 'terrain_snow_metal'
        },
        backgroundLayers: [
          {
            id: 'sky_night',
            role: 'sky' as const,
            assetIntentRef: 'scene_night_sky',
            parallax: 0,
            fixedToCamera: true,
            depth: -40
          }
        ],
        platforms: [
          {
            id: 'ground_intro_visual',
            x: 0,
            y: 500,
            width: 1280,
            height: 40,
            shape: 'rectangle' as const,
            materialRef: 'terrain_snow_metal',
            visualAssetIntentRef: 'tile_snow_metal_ground',
            collision: { enabled: true },
            tags: ['ground']
          }
        ],
        playerSpawn: { x: 120, y: 452 },
        enemyInstances: [{ id: 'enemy_intro_01', archetypeRef: enemyType.id, x: 720, y: 450, spawnRule: 'spawn_intro_drone' }],
        goal: { id: 'goal_exit_01', kind: 'reach' as const, x: 1240, y: 460, visualAssetIntentRef: 'goal_exit_beacon' }
      }
    ]
  };
}

function withStep37ReferenceRuntimePlan(ir: Extract<ReturnType<typeof validateAndNormalizeRawGameDsl>, { ok: true }>['ir']) {
  const sideScrolling = ir.runtime_plan.side_scrolling;
  if (sideScrolling === undefined) {
    throw new Error('Expected side-scrolling runtime plan fixture.');
  }

  return {
    ...ir,
    world: { ...ir.world, width: 4000 },
    runtime_plan: {
      ...ir.runtime_plan,
      side_scrolling: {
        ...sideScrolling,
        scene: {
          ...sideScrolling.scene,
          world: { ...sideScrolling.scene.world, width: 4000 }
        },
        camera: {
          ...sideScrolling.camera,
          bounds: { ...sideScrolling.camera.bounds, width: 4000 }
        },
        platforms: [
          { id: 'ground_intro', kind: 'ground' as const, x: 0, y: 500, width: 1200, height: 40 },
          { id: 'platform_bridge', kind: 'platform' as const, x: 980, y: 380, width: 280, height: 24 },
          { id: 'platform_mid', kind: 'platform' as const, x: 1500, y: 330, width: 320, height: 24 },
          { id: 'platform_high', kind: 'platform' as const, x: 2200, y: 260, width: 300, height: 24 },
          { id: 'ground_exit', kind: 'ground' as const, x: 3000, y: 500, width: 1000, height: 40 }
        ],
        waves: [
          { id: 'spawn_intro_drone', enemyTypeId: 'drone_type', trigger: 'enter_segment' as const, triggerX: 640, spawnX: 640, count: 3 },
          { id: 'spawn_bridge_drone', enemyTypeId: 'drone_type', trigger: 'reach_x' as const, triggerX: 1600, spawnX: 1600, count: 5 },
          { id: 'spawn_exit_drone', enemyTypeId: 'drone_type', trigger: 'reach_x' as const, triggerX: 3200, spawnX: 3200, count: 6 }
        ],
        pickups: [{ id: 'field_medkit', kind: 'health' as const, x: 720, y: 450 }],
        winCondition: { kind: 'reach_exit' as const, targetX: 3800 }
      }
    }
  };
}
