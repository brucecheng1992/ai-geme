import { describe, expect, it } from 'vitest';

import {
  buildDslConsumptionReport,
  validateAndNormalizeRawGameDsl,
  validateRawGameDsl
} from '../../packages/game-dsl/src/index.js';
import { createCollectorRawDsl, createSideScrollingRunAndGunRawDsl } from './fixtures.js';

describe('Step 33 scene and visual DSL contract', () => {
  it('accepts side-scrolling scene contract and records it as deferred consumption', () => {
    const rawDsl = createSideScrollingSceneDsl();
    expect(rawDsl.scenes[0].backgroundLayers[0].assetIntentRef).toBe('scene_night_sky');
    const normalized = validateAndNormalizeRawGameDsl(rawDsl);

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const report = buildDslConsumptionReport({
      projectId: 'proj_20260618_step33_scene',
      runId: 'run_20260618_step33_scene',
      rawDsl: normalized.rawDsl,
      ir: normalized.ir
    });

    expect(report.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/scenes', status: 'deferred', authoritative: true }),
        expect.objectContaining({ path: '/scenes/0/theme/biome', status: 'deferred', authoritative: true }),
        expect.objectContaining({ path: '/player/visual', status: 'deferred', authoritative: true }),
        expect.objectContaining({ path: '/enemyTypes/0/visual', status: 'deferred', authoritative: true }),
        expect.objectContaining({ path: '/enemyTypes/0/behaviorRef', status: 'deferred', authoritative: true })
      ])
    );
  });

  it('rejects scene enemy instances that reference missing archetypes', () => {
    const rawDsl = createSideScrollingSceneDsl({
      enemyInstances: [{ id: 'enemy_bad_ref', archetypeRef: 'missing_type', x: 720, y: 450 }]
    });
    const result = validateRawGameDsl(rawDsl);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'UNRESOLVED_REFERENCE',
          path: 'scenes.0.enemyInstances.0.archetypeRef',
          message: 'Unknown enemy archetype "missing_type"'
        })
      ])
    );
  });

  it('rejects scene enemy instances that reference missing spawn rules', () => {
    const rawDsl = createSideScrollingSceneDsl({
      enemyInstances: [
        {
          id: 'enemy_bad_spawn_rule',
          archetypeRef: 'drone_type',
          x: 720,
          y: 450,
          spawnRule: 'missing_spawn'
        }
      ]
    });
    const result = validateRawGameDsl(rawDsl);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'UNRESOLVED_REFERENCE',
          path: 'scenes.0.enemyInstances.0.spawnRule',
          message: 'Unknown scene spawn rule "missing_spawn"'
        })
      ])
    );
  });

  it('rejects scene goals that reference missing target entities', () => {
    const rawDsl = createSideScrollingSceneDsl({
      goal: {
        id: 'goal_destroy_core',
        kind: 'destroy' as const,
        entityRef: 'missing_target',
        x: 1240,
        y: 460,
        visualAssetIntentRef: 'goal_exit_beacon'
      }
    });
    const result = validateRawGameDsl(rawDsl);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'UNRESOLVED_REFERENCE',
          path: 'scenes.0.goal.entityRef',
          message: 'Unknown destroy goal entityRef "missing_target"'
        })
      ])
    );
  });

  it('rejects destroy goals that target non-enemy hazard entities', () => {
    const base = createSideScrollingSceneDsl();
    const rawDsl = {
      ...base,
      entities: [
        ...base.entities,
        {
          id: 'spike',
          kind: 'hazard' as const,
          label: 'Spike',
          movement: { type: 'static' as const }
        }
      ],
      scenes: [
        {
          ...base.scenes[0],
          goal: {
            id: 'goal_destroy_spike',
            kind: 'destroy' as const,
            entityRef: 'spike',
            x: 1240,
            y: 460
          }
        }
      ]
    };
    const result = validateRawGameDsl(rawDsl);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'UNRESOLVED_REFERENCE',
          path: 'scenes.0.goal.entityRef',
          message: 'Unknown destroy goal entityRef "spike"'
        })
      ])
    );
  });

  it('reports duplicate scene node ids with duplicate-id semantics', () => {
    const base = createSideScrollingSceneDsl();
    const rawDsl = {
      ...base,
      scenes: [
        {
          ...base.scenes[0],
          platforms: [
            base.scenes[0].platforms[0],
            { ...base.scenes[0].platforms[1], id: base.scenes[0].platforms[0].id }
          ]
        }
      ]
    };
    const result = validateRawGameDsl(rawDsl);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'DUPLICATE_ID',
          path: 'scenes.0.platforms.1.id',
          message: 'Duplicate scene node id "ground_intro_visual"'
        })
      ])
    );
  });

  it('rejects scene platform geometry outside world bounds', () => {
    const rawDsl = createSideScrollingSceneDsl({
      platforms: [
        {
          id: 'bad_platform',
          x: 1260,
          y: 500,
          width: 80,
          height: 24,
          shape: 'rectangle' as const,
          materialRef: 'terrain_snow_metal',
          collision: { enabled: true }
        }
      ]
    });
    const result = validateRawGameDsl(rawDsl);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'scenes.0.platforms.0',
          message: 'scene platform geometry must stay inside world bounds'
        })
      ])
    );
  });

  it('rejects scene contracts for non-side-scrolling profiles', () => {
    const sceneDsl = createSideScrollingSceneDsl();
    const rawDsl = {
      ...createCollectorRawDsl(),
      scenes: sceneDsl.scenes
    };
    const result = validateRawGameDsl(rawDsl);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'scenes',
          message: 'scenes is supported only for side_scrolling_run_and_gun'
        })
      ])
    );
  });
});

type SceneOverride = Partial<{
  platforms: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    shape: 'rectangle' | 'slope' | 'one_way';
    materialRef: string;
    visualAssetIntentRef?: string;
    collision: { enabled: boolean; oneWay?: boolean };
    tags?: string[];
  }>;
  enemyInstances: Array<{ id: string; archetypeRef: string; x: number; y: number; spawnRule?: string }>;
  goal: {
    id: string;
    kind: 'reach' | 'destroy' | 'collect' | 'survive';
    entityRef?: string;
    x?: number;
    y?: number;
    visualAssetIntentRef?: string;
  };
}>;

function createSideScrollingSceneDsl(overrides: SceneOverride = {}) {
  const base = createSideScrollingRunAndGunRawDsl();
  const enemyType = base.enemyTypes[0];

  return {
    ...base,
    player: {
      ...base.player,
      visual: {
        assetIntentRef: 'player_red_robot',
        styleRef: 'style_pixel_16',
        facingMode: 'flip_x' as const,
        animationSetRef: 'anim_run_jump_shoot',
        tintIntent: 'red armor',
        silhouetteIntent: 'compact armored runner'
      }
    },
    enemyTypes: [
      {
        ...enemyType,
        behaviorRef: 'behavior_ground_patrol',
        visual: {
          assetIntentRef: 'enemy_mech_soldier',
          styleRef: 'style_pixel_16',
          facingMode: 'flip_x' as const,
          animationSetRef: 'anim_enemy_patrol'
        },
        colliderRef: 'collider_humanoid',
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
          faction: 'mechanical army',
          timeOfDay: 'night' as const,
          atmosphere: 'cold bright edges',
          paletteIntent: 'blue white red accents',
          terrainMaterialSet: 'terrain_snow_metal',
          propFamily: 'base_outpost',
          lightingIntent: 'moonlit cold lights'
        },
        backgroundLayers: [
          {
            id: 'sky_night',
            role: 'sky' as const,
            assetIntentRef: 'scene_night_sky',
            parallax: 0,
            fixedToCamera: true,
            depth: -40
          },
          {
            id: 'base_far',
            role: 'far' as const,
            assetIntentRef: 'bg_snow_base_far',
            parallax: 0.25,
            repeatX: true,
            depth: -30
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
          },
          {
            id: 'platform_bridge_visual',
            x: 980,
            y: 380,
            width: 280,
            height: 24,
            shape: 'rectangle' as const,
            materialRef: 'terrain_snow_metal',
            visualAssetIntentRef: 'tile_snow_metal_platform',
            collision: { enabled: true },
            tags: ['platform']
          }
        ],
        playerSpawn: { x: 120, y: 452 },
        enemyInstances: [{ id: 'enemy_intro_01', archetypeRef: enemyType.id, x: 720, y: 450 }],
        goal: { id: 'goal_exit_01', kind: 'reach' as const, x: 1240, y: 460, visualAssetIntentRef: 'goal_exit_beacon' },
        ...overrides
      }
    ]
  };
}
