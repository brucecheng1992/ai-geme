import { describe, expect, it } from 'vitest';

import { AssetIntentManifestSchema, AssetManifestSchema, buildAssetIntentManifest, buildAssetPlanFromIr, buildAssetResolutionReport, summarizeAssetIntentResolutionFallbacks } from '../../packages/asset-pipeline/src/index.js';
import { buildSceneIr, validateAndNormalizeRawGameDsl } from '../../packages/game-dsl/src/index.js';
import { createSideScrollingRunAndGunRawDsl } from './fixtures.js';

const projectId = 'proj_20260618_step33_asset_intent';
const runId = 'run_20260618_step33_asset_intent';

describe('Step 33 asset intent manifest', () => {
  it('marks visual Scene DSL asset intents as request-required with source paths and cache keys', () => {
    const rawDsl = createSideScrollingSceneDsl();
    const normalized = validateAndNormalizeRawGameDsl(rawDsl);

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const plan = buildAssetPlanFromIr(projectId, normalized.ir);
    const sceneIr = buildSceneIr({ projectId, runId, rawDsl: normalized.rawDsl, ir: normalized.ir });
    const manifest = buildAssetIntentManifest({ projectId, plan, sceneIr });
    const playerIntent = manifest.intents.find((intent) => intent.assetPlanId === 'player');
    const tilesetIntent = manifest.intents.find((intent) => intent.assetPlanId === 'tileset');

    expect(AssetIntentManifestSchema.parse(manifest)).toEqual(manifest);
    expect(manifest).toMatchObject({
      version: 'asset-intent-manifest-v0.1',
      projectId,
      sourceArtifacts: { assetPlan: 'asset_plan.json', sceneIr: 'game.scene.ir.json' },
      summary: {
        total: 7,
        coreRequired: 4,
        requestRequired: 3,
        optional: 0,
        fallbackAllowed: 0,
        cacheKeyVersion: 'asset-intent-cache-v0.1'
      }
    });
    expect(playerIntent).toMatchObject({
      id: 'player_red_runner',
      assetPlanId: 'player',
      role: 'player_sprite',
      requiredLevel: 'request_required',
      sourceDslPaths: expect.arrayContaining(['/player', '/player/visual']),
      fallbackPolicy: { allowed: false, reason: 'not_allowed_for_request_required' },
      cacheKey: {
        version: 'asset-intent-cache-v0.1',
        styleProfileVersion: 'asset-style-profile-v0.1',
        providerPolicyVersion: 'asset-provider-policy-v0.1'
      }
    });
    expect(playerIntent?.cacheKey.intentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(tilesetIntent).toMatchObject({
      id: 'tileset',
      role: 'terrain_tileset',
      requiredLevel: 'core_required',
      tiling: { repeatX: true }
    });
    expect(manifest.intents.map((intent) => intent.id)).toEqual(
      expect.arrayContaining([
        'scene_night_sky',
        'scene.city-skyline',
        'player_red_runner',
        'enemy',
        'projectile',
        'tileset',
        'pickup'
      ])
    );
    expect(manifest.intents.map((intent) => intent.id)).not.toEqual(expect.arrayContaining(['tile.snow-bridge', 'enemy_mech_drone', 'goal_exit_beacon']));
  });

  it('counts request-required Scene visual refs missing from resolution as blocking fallback', () => {
    const rawDsl = createSideScrollingSceneDsl();
    const normalized = validateAndNormalizeRawGameDsl(rawDsl);

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const plan = buildAssetPlanFromIr(projectId, normalized.ir);
    const sceneIr = buildSceneIr({ projectId, runId, rawDsl: normalized.rawDsl, ir: normalized.ir });
    const intentManifest = buildAssetIntentManifest({ projectId, plan, sceneIr });
    const assetManifest = AssetManifestSchema.parse({
      version: 'asset-manifest-v0.1',
      projectId,
      strict: true,
      assets: plan.items.map((item) => ({
        id: item.id,
        loadKey: `agm.${item.id}`,
        role: item.role,
        type: 'image' as const,
        format: item.format,
        path: `assets/${item.id}.svg`,
        source: 'local_asset_pack' as const,
        sourcePack: 'test-pack',
        licenseId: 'CC0-1.0',
        licenseName: 'Creative Commons CC0 1.0 Universal',
        attribution: 'test pack',
        sourceUrl: 'https://example.test/assets',
        required: item.required,
        status: 'ready' as const,
        size: item.size
      })),
      summary: {
        required: plan.items.length,
        ready: plan.items.length,
        fallback_used: 0,
        missing: 0,
        placeholder_used: 0
      }
    });
    const resolutionReport = buildAssetResolutionReport({ plan, manifest: assetManifest, candidates: [] });

    expect(summarizeAssetIntentResolutionFallbacks({ manifest: intentManifest, resolutionReport })).toEqual({
      coreRequiredFallbackCount: 0,
      requestRequiredFallbackCount: 1,
      optionalFallbackCount: 0
    });
  });

  it('counts optional intent fallbacks separately from blocking required fallbacks', () => {
    const normalized = validateAndNormalizeRawGameDsl(createSideScrollingRunAndGunRawDsl());

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const plan = buildAssetPlanFromIr(projectId, normalized.ir);
    const manifest = buildAssetIntentManifest({ projectId, plan });
    const optionalIntentManifest = AssetIntentManifestSchema.parse({
      ...manifest,
      summary: {
        ...manifest.summary,
        coreRequired: manifest.summary.coreRequired - 1,
        optional: manifest.summary.optional + 1,
        fallbackAllowed: manifest.summary.fallbackAllowed + 1
      },
      intents: manifest.intents.map((intent, index) =>
        index === 0
          ? {
              ...intent,
              requiredLevel: 'optional',
              fallbackPolicy: { allowed: true, reason: 'allowed_for_optional' }
            }
          : intent
      )
    });
    const assetManifest = AssetManifestSchema.parse({
      version: 'asset-manifest-v0.1',
      projectId,
      strict: true,
      assets: plan.items.map((item) => ({
        id: item.id,
        loadKey: `agm.${item.id}`,
        role: item.role,
        type: 'image' as const,
        format: item.format,
        path: `assets/${item.id}.svg`,
        source: item.id === plan.items[0]?.id ? ('template_svg' as const) : ('local_asset_pack' as const),
        sourcePack: item.id === plan.items[0]?.id ? undefined : 'test-pack',
        licenseId: 'CC0-1.0',
        licenseName: 'Creative Commons CC0 1.0 Universal',
        attribution: 'test pack',
        sourceUrl: 'https://example.test/assets',
        required: item.required,
        status: item.id === plan.items[0]?.id ? ('fallback_used' as const) : ('ready' as const),
        size: item.size
      })),
      summary: {
        required: plan.items.length,
        ready: plan.items.length - 1,
        fallback_used: 1,
        missing: 0,
        placeholder_used: 0
      }
    });
    const resolutionReport = buildAssetResolutionReport({ plan, manifest: assetManifest, candidates: [] });

    expect(summarizeAssetIntentResolutionFallbacks({ manifest: optionalIntentManifest, resolutionReport })).toEqual({
      coreRequiredFallbackCount: 0,
      requestRequiredFallbackCount: 0,
      optionalFallbackCount: 1
    });
  });

  it('falls back to core-required plan intents when Scene DSL has no visual asset refs', () => {
    const normalized = validateAndNormalizeRawGameDsl(createSideScrollingRunAndGunRawDsl());

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const plan = buildAssetPlanFromIr(projectId, normalized.ir);
    const manifest = buildAssetIntentManifest({ projectId, plan });

    expect(manifest.sourceArtifacts).toEqual({ assetPlan: 'asset_plan.json' });
    expect(manifest.summary).toMatchObject({
      total: plan.items.length,
      coreRequired: plan.items.length,
      requestRequired: 0,
      optional: 0
    });
    expect(manifest.intents.find((intent) => intent.assetPlanId === 'player')).toMatchObject({
      id: 'player',
      requiredLevel: 'core_required',
      sourceDslPaths: ['/player'],
      fallbackPolicy: { allowed: false, reason: 'not_allowed_for_core_required' }
    });
  });
});

function createSideScrollingSceneDsl() {
  const base = createSideScrollingRunAndGunRawDsl();
  const enemyType = base.enemyTypes[0];
  const eliteEnemyType = {
    ...enemyType,
    id: 'elite_drone_type',
    label: 'Elite drone',
    visual: {
      assetIntentRef: 'enemy.mech-elite',
      styleRef: 'style_pixel_16',
      facingMode: 'flip_x' as const,
      animationSetRef: 'anim_enemy_elite_patrol'
    }
  };

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
      },
      eliteEnemyType
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
            repeatX: true,
            depth: -40
          },
          {
            id: 'city_skyline',
            role: 'far' as const,
            assetIntentRef: 'scene.city-skyline',
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
            id: 'upper_bridge_visual',
            x: 380,
            y: 360,
            width: 260,
            height: 24,
            shape: 'rectangle' as const,
            materialRef: 'terrain_snow_metal',
            visualAssetIntentRef: 'tile.snow-bridge',
            collision: { enabled: true },
            tags: ['platform']
          },
          {
            id: 'lower_bridge_visual',
            x: 700,
            y: 410,
            width: 220,
            height: 24,
            shape: 'rectangle' as const,
            materialRef: 'terrain_snow_metal',
            visualAssetIntentRef: 'tile.snow-bridge',
            collision: { enabled: true },
            tags: ['platform']
          }
        ],
        playerSpawn: { x: 120, y: 452 },
        enemyInstances: [
          { id: 'enemy_intro_01', archetypeRef: enemyType.id, x: 720, y: 450, spawnRule: 'spawn_intro_drone' },
          { id: 'enemy_intro_02', archetypeRef: eliteEnemyType.id, x: 920, y: 450, spawnRule: 'spawn_intro_drone' }
        ],
        goal: { id: 'goal_exit_01', kind: 'reach' as const, x: 1240, y: 460, visualAssetIntentRef: 'goal_exit_beacon' }
      }
    ]
  };
}
