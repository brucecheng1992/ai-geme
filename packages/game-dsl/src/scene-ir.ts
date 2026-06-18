import { z } from 'zod';

import type { NormalizedGameIr } from './schemas/normalized-game-ir-v0.1.schema.js';
import type { RawGameDsl } from './schemas/raw-game-dsl-v0.1.schema.js';

const SceneIrProvenanceSchema = z.strictObject({
  source: z.enum(['dsl', 'runtime_plan', 'system']),
  dslPath: z.string().regex(/^\//),
  relatedDslPaths: z.array(z.string().regex(/^\//)).optional(),
  reason: z.string().min(1).optional()
});

const SceneIrWorldSchema = z.strictObject({
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  viewportWidth: z.number().int().min(1),
  viewportHeight: z.number().int().min(1)
});

const SceneIrCameraSchema = z.strictObject({
  mode: z.literal('side_follow'),
  followTarget: z.literal('player'),
  bounds: z.strictObject({
    x: z.number().int(),
    y: z.number().int(),
    width: z.number().int().min(1),
    height: z.number().int().min(1)
  })
});

const SceneIrBackgroundSchema = z.strictObject({
  runtimeId: z.string().min(1),
  role: z.enum(['sky', 'far', 'mid', 'near', 'overlay']),
  assetIntentRef: z.string().min(1).optional(),
  parallax: z.number().min(0).max(1),
  repeatX: z.boolean().optional(),
  fixedToCamera: z.boolean().optional(),
  opacity: z.number().min(0).max(1).optional(),
  depth: z.number().int(),
  provenanceRef: z.string().min(1)
});

const SceneIrPlatformSchema = z.strictObject({
  runtimeId: z.string().min(1),
  kind: z.enum(['platform', 'ground', 'slope']),
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  shape: z.enum(['rectangle', 'slope', 'one_way']),
  materialRef: z.string().min(1).optional(),
  visualAssetIntentRef: z.string().min(1).optional(),
  collider: z.strictObject({
    runtimeId: z.string().min(1),
    enabled: z.boolean(),
    oneWay: z.boolean().optional()
  }),
  provenanceRef: z.string().min(1)
});

const SceneIrPlayerSchema = z.strictObject({
  runtimeId: z.literal('entity.player'),
  prefabRef: z.literal('player.run_and_gun.v1'),
  x: z.number().int(),
  y: z.number().int(),
  visualAssetIntentRef: z.string().min(1).optional(),
  provenanceRef: z.string().min(1)
});

const SceneIrEnemyInstanceSchema = z.strictObject({
  runtimeId: z.string().min(1),
  archetypeRef: z.string().min(1),
  prefabRef: z.string().min(1),
  x: z.number().int(),
  y: z.number().int(),
  count: z.number().int().min(1).optional(),
  spawnRule: z.string().min(1).optional(),
  behaviorRef: z.string().min(1).optional(),
  visualAssetIntentRef: z.string().min(1).optional(),
  colliderRef: z.string().min(1).optional(),
  provenanceRef: z.string().min(1)
});

const SceneIrGoalSchema = z.strictObject({
  runtimeId: z.string().min(1),
  kind: z.enum(['reach', 'destroy', 'collect', 'survive', 'enemy_cleared']),
  entityRef: z.string().min(1).optional(),
  x: z.number().int().optional(),
  y: z.number().int().optional(),
  visualAssetIntentRef: z.string().min(1).optional(),
  provenanceRef: z.string().min(1)
});

const SceneIrSceneSchema = z.strictObject({
  id: z.string().min(1),
  world: SceneIrWorldSchema,
  camera: SceneIrCameraSchema,
  backgrounds: z.array(SceneIrBackgroundSchema),
  platforms: z.array(SceneIrPlatformSchema).min(1),
  player: SceneIrPlayerSchema,
  enemyInstances: z.array(SceneIrEnemyInstanceSchema),
  goals: z.array(SceneIrGoalSchema).min(1)
});

export const SceneIrSchema = z.strictObject({
  schemaVersion: z.literal('step33.scene-ir.v1'),
  projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
  runId: z.string().regex(/^run_[A-Za-z0-9_-]+$/),
  runtimeProfile: z.literal('side_scrolling_run_and_gun.v1'),
  source: z.enum(['dsl_scene_contract', 'runtime_plan_derived']),
  scenes: z.array(SceneIrSceneSchema).min(1),
  provenance: z.record(z.string().min(1), SceneIrProvenanceSchema)
});

export type SceneIr = z.infer<typeof SceneIrSchema>;

type BuildSceneIrInput = {
  projectId: string;
  runId: string;
  rawDsl?: RawGameDsl;
  ir: NormalizedGameIr;
};

type ProvenanceInput = z.input<typeof SceneIrProvenanceSchema>;

export function buildSceneIr(input: BuildSceneIrInput): SceneIr {
  if (input.ir.game.genre !== 'side_scrolling_run_and_gun' || input.ir.runtime_plan.side_scrolling === undefined) {
    throw new Error(`Scene IR is currently supported only for side_scrolling_run_and_gun, received ${input.ir.game.genre}.`);
  }

  const provenance: Record<string, ProvenanceInput> = {};
  const addProvenance = (runtimeId: string, value: ProvenanceInput): string => {
    provenance[runtimeId] = value;
    return runtimeId;
  };
  const sideScrolling = input.ir.runtime_plan.side_scrolling;
  const scene = input.rawDsl?.scenes?.[0];
  const sceneIr = scene === undefined
    ? buildRuntimePlanDerivedScene(input, addProvenance)
    : buildDslAuthoredScene(input, addProvenance);

  return SceneIrSchema.parse({
    schemaVersion: 'step33.scene-ir.v1',
    projectId: input.projectId,
    runId: input.runId,
    runtimeProfile: 'side_scrolling_run_and_gun.v1',
    source: scene === undefined ? 'runtime_plan_derived' : 'dsl_scene_contract',
    scenes: [sceneIr],
    provenance
  });
}

function buildDslAuthoredScene(input: BuildSceneIrInput, addProvenance: (runtimeId: string, value: ProvenanceInput) => string): SceneIr['scenes'][number] {
  const scene = input.rawDsl?.scenes?.[0];
  const sideScrolling = input.ir.runtime_plan.side_scrolling;
  if (scene === undefined || sideScrolling === undefined || input.rawDsl === undefined) {
    throw new Error('DSL-authored Scene IR requires side_scrolling runtime plan and Raw DSL scenes.');
  }

  const enemyTypeIndex = new Map(input.rawDsl.enemyTypes?.map((enemyType, index) => [enemyType.id, { enemyType, index }]));

  return {
    id: scene.id,
    world: toWorld(sideScrolling),
    camera: sideScrolling.camera,
    backgrounds: scene.backgroundLayers.map((layer, index) => {
      const runtimeId = `background.${layer.id}`;
      return {
        runtimeId,
        role: layer.role,
        assetIntentRef: layer.assetIntentRef,
        parallax: layer.parallax,
        repeatX: layer.repeatX,
        fixedToCamera: layer.fixedToCamera,
        opacity: layer.opacity,
        depth: layer.depth,
        provenanceRef: addProvenance(runtimeId, { source: 'dsl', dslPath: `/scenes/0/backgroundLayers/${index}` })
      };
    }),
    platforms: scene.platforms.map((platform, index) => {
      const runtimeId = `platform.${platform.id}`;
      return {
        runtimeId,
        kind: platform.shape === 'slope' ? 'slope' : platform.tags?.includes('ground') ? 'ground' : 'platform',
        x: platform.x,
        y: platform.y,
        width: platform.width,
        height: platform.height,
        shape: platform.shape,
        materialRef: platform.materialRef,
        visualAssetIntentRef: platform.visualAssetIntentRef,
        collider: { runtimeId: `collider.${platform.id}`, enabled: platform.collision.enabled, oneWay: platform.collision.oneWay },
        provenanceRef: addProvenance(runtimeId, { source: 'dsl', dslPath: `/scenes/0/platforms/${index}` })
      };
    }),
    player: {
      runtimeId: 'entity.player',
      prefabRef: 'player.run_and_gun.v1',
      x: scene.playerSpawn.x,
      y: scene.playerSpawn.y,
      visualAssetIntentRef: input.rawDsl.player.visual?.assetIntentRef,
      provenanceRef: addProvenance('entity.player', { source: 'dsl', dslPath: '/scenes/0/playerSpawn', relatedDslPaths: ['/player', '/player/visual'] })
    },
    enemyInstances: scene.enemyInstances.map((instance, index) => {
      const enemy = enemyTypeIndex.get(instance.archetypeRef);
      const runtimeId = sceneEnemyRuntimeId(instance.id);
      return {
        runtimeId,
        archetypeRef: instance.archetypeRef,
        prefabRef: `enemy.${instance.archetypeRef}.v1`,
        x: instance.x,
        y: instance.y,
        spawnRule: instance.spawnRule,
        behaviorRef: enemy?.enemyType.behaviorRef,
        visualAssetIntentRef: enemy?.enemyType.visual?.assetIntentRef,
        colliderRef: enemy?.enemyType.colliderRef,
        provenanceRef: addProvenance(runtimeId, {
          source: 'dsl',
          dslPath: `/scenes/0/enemyInstances/${index}`,
          relatedDslPaths: enemy === undefined ? undefined : [`/enemyTypes/${enemy.index}`]
        })
      };
    }),
    goals: [
      {
        runtimeId: `goal.${scene.goal.id}`,
        kind: scene.goal.kind,
        entityRef: scene.goal.entityRef,
        x: scene.goal.x,
        y: scene.goal.y,
        visualAssetIntentRef: scene.goal.visualAssetIntentRef,
        provenanceRef: addProvenance(`goal.${scene.goal.id}`, { source: 'dsl', dslPath: '/scenes/0/goal', relatedDslPaths: ['/objectives/win'] })
      }
    ]
  };
}

function sceneEnemyRuntimeId(instanceId: string): string {
  return `entity.enemy.${instanceId}`;
}

function buildRuntimePlanDerivedScene(input: BuildSceneIrInput, addProvenance: (runtimeId: string, value: ProvenanceInput) => string): SceneIr['scenes'][number] {
  const sideScrolling = input.ir.runtime_plan.side_scrolling;
  if (sideScrolling === undefined) {
    throw new Error('Runtime-plan derived Scene IR requires side_scrolling runtime plan.');
  }

  const terrainIndex = new Map(input.rawDsl?.level?.terrain.map((terrain, index) => [terrain.id, index]));
  const spawnIndex = new Map(input.rawDsl?.level?.spawns.map((spawn, index) => [spawn.id, index]));
  const backgroundId = 'background.runtime_plan_default';

  return {
    id: 'runtime_plan_scene',
    world: toWorld(sideScrolling),
    camera: sideScrolling.camera,
    backgrounds: [
      {
        runtimeId: backgroundId,
        role: 'sky',
        parallax: 0,
        fixedToCamera: true,
        depth: -40,
        provenanceRef: addProvenance(backgroundId, {
          source: input.rawDsl === undefined ? 'runtime_plan' : 'system',
          dslPath: input.rawDsl === undefined ? '/runtime_plan/side_scrolling/scene' : '/world/visual_theme',
          reason: 'Scene DSL is absent; background remains a system-owned visual placeholder until 33.4/33.5.'
        })
      }
    ],
    platforms: sideScrolling.platforms.map((platform, index) => {
      const runtimeId = `platform.${platform.id}`;
      const terrain = terrainIndex.get(platform.id);
      return {
        runtimeId,
        kind: platform.kind,
        x: platform.x,
        y: platform.y,
        width: platform.width,
        height: platform.height,
        shape: platform.kind === 'slope' ? 'slope' : 'rectangle',
        collider: { runtimeId: `collider.${platform.id}`, enabled: true },
        provenanceRef: addProvenance(runtimeId, {
          source: terrain === undefined ? 'runtime_plan' : 'dsl',
          dslPath: terrain === undefined ? `/runtime_plan/side_scrolling/platforms/${index}` : `/level/terrain/${terrain}`
        })
      };
    }),
    player: {
      runtimeId: 'entity.player',
      prefabRef: 'player.run_and_gun.v1',
      x: sideScrolling.player.spawn.x,
      y: sideScrolling.player.spawn.y,
      visualAssetIntentRef: input.rawDsl?.player.visual?.assetIntentRef,
      provenanceRef: addProvenance('entity.player', {
        source: input.rawDsl === undefined ? 'runtime_plan' : 'dsl',
        dslPath: input.rawDsl === undefined ? '/runtime_plan/side_scrolling/player' : '/player',
        relatedDslPaths: input.rawDsl?.player.visual === undefined ? undefined : ['/player/visual']
      })
    },
    enemyInstances: sideScrolling.waves.map((wave, index) => {
      const runtimeId = `spawn.${wave.id}`;
      const spawn = spawnIndex.get(wave.id);
      return {
        runtimeId,
        archetypeRef: wave.enemyTypeId,
        prefabRef: `enemy.${wave.enemyTypeId}.v1`,
        x: wave.spawnX,
        y: enemyY(sideScrolling),
        count: wave.count,
        spawnRule: wave.id,
        provenanceRef: addProvenance(runtimeId, {
          source: spawn === undefined ? 'runtime_plan' : 'dsl',
          dslPath: spawn === undefined ? `/runtime_plan/side_scrolling/waves/${index}` : `/level/spawns/${spawn}`
        })
      };
    }),
    goals: [runtimePlanGoal(sideScrolling, addProvenance, input.rawDsl !== undefined)]
  };
}

function toWorld(sideScrolling: NonNullable<NormalizedGameIr['runtime_plan']['side_scrolling']>): SceneIr['scenes'][number]['world'] {
  return {
    width: sideScrolling.scene.world.width,
    height: sideScrolling.scene.world.height,
    viewportWidth: sideScrolling.scene.viewport.width,
    viewportHeight: sideScrolling.scene.viewport.height
  };
}

function runtimePlanGoal(
  sideScrolling: NonNullable<NormalizedGameIr['runtime_plan']['side_scrolling']>,
  addProvenance: (runtimeId: string, value: ProvenanceInput) => string,
  hasRawDsl: boolean
): SceneIr['scenes'][number]['goals'][number] {
  const provenance: ProvenanceInput = hasRawDsl
    ? { source: 'dsl', dslPath: '/objectives/win' }
    : { source: 'runtime_plan', dslPath: '/runtime_plan/side_scrolling/winCondition' };

  if (sideScrolling.winCondition.kind === 'reach_exit') {
    const runtimeId = 'goal.reach_exit';
    return {
      runtimeId,
      kind: 'reach',
      x: sideScrolling.winCondition.targetX,
      y: Math.max(0, sideScrolling.scene.world.height - 80),
      provenanceRef: addProvenance(runtimeId, provenance)
    };
  }

  const runtimeId = 'goal.enemy_cleared';
  return {
    runtimeId,
    kind: 'enemy_cleared',
    provenanceRef: addProvenance(runtimeId, provenance)
  };
}

function enemyY(sideScrolling: NonNullable<NormalizedGameIr['runtime_plan']['side_scrolling']>): number {
  const ground = sideScrolling.platforms.find((platform) => platform.kind === 'ground') ?? sideScrolling.platforms[0];
  return Math.max(0, (ground?.y ?? sideScrolling.scene.world.height - 40) - 42);
}
