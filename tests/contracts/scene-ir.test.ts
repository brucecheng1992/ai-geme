import { describe, expect, it } from 'vitest';

import { SceneIrSchema, buildSceneIr, validateAndNormalizeRawGameDsl } from '../../packages/game-dsl/src/index.js';
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
      source: 'dsl_scene_contract',
      scenes: [
        expect.objectContaining({
          id: 'level_01',
          backgrounds: [expect.objectContaining({ runtimeId: 'background.sky_night', assetIntentRef: 'scene_night_sky' })],
          platforms: expect.arrayContaining([
            expect.objectContaining({ runtimeId: 'platform.ground_intro_visual', collider: expect.objectContaining({ runtimeId: 'collider.ground_intro_visual' }) })
          ]),
          player: expect.objectContaining({ runtimeId: 'entity.player', visualAssetIntentRef: 'player_red_runner' }),
          enemyInstances: [
            expect.objectContaining({
              runtimeId: 'entity.enemy.enemy_intro_01',
              archetypeRef: 'drone_type',
              behaviorRef: 'behavior_ground_patrol',
              visualAssetIntentRef: 'enemy_mech_drone'
            })
          ],
          goals: [expect.objectContaining({ runtimeId: 'goal.goal_exit_01', kind: 'reach', x: 1240 })]
        })
      ]
    });
    expect(sceneIr.provenance['background.sky_night']).toMatchObject({ source: 'dsl', dslPath: '/scenes/0/backgroundLayers/0' });
    expect(sceneIr.provenance['entity.enemy.enemy_intro_01']).toMatchObject({
      source: 'dsl',
      dslPath: '/scenes/0/enemyInstances/0',
      relatedDslPaths: ['/enemyTypes/0']
    });
  });

  it('keeps player and enemy instance provenance separate when a scene enemy id is player', () => {
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
    expect(enemy.runtimeId).toBe('entity.enemy.player');
    expect(enemy.runtimeId).not.toBe(player.runtimeId);
    expect(sceneIr.provenance[player.provenanceRef]).toMatchObject({ source: 'dsl', dslPath: '/scenes/0/playerSpawn' });
    expect(sceneIr.provenance[enemy.provenanceRef]).toMatchObject({ source: 'dsl', dslPath: '/scenes/0/enemyInstances/0' });
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
    expect(sceneIr.provenance['platform.ground_intro']).toMatchObject({ source: 'dsl', dslPath: '/level/terrain/0' });
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
