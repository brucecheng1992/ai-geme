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

const SceneIrPickupSchema = z.strictObject({
  runtimeId: z.string().min(1),
  kind: z.enum(['health', 'score', 'weapon']),
  x: z.number().int(),
  y: z.number().int(),
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
  pickups: z.array(SceneIrPickupSchema).default([]),
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
export type SceneIrScene = SceneIr['scenes'][number];
export type SceneDomain =
  | 'terrain'
  | 'spawns'
  | 'pickups'
  | 'objectives'
  | 'camera_gameplay_bounds'
  | 'presentation'
  | 'background'
  | 'lighting'
  | 'decorations'
  | 'asset_bindings';

export type SceneIrAuthorityReport = {
  schemaVersion: 'step37.scene-ir-authority-report.v1';
  runId: string;
  decision: 'runtime_plan_authoritative' | 'runtime_plan_with_dsl_overlay';
  domainOwnership: Record<SceneDomain, string>;
  conflicts: string[];
  diagnostics: string[];
};

export type SceneIrCoverageReport = {
  schemaVersion: 'step37.scene-ir-coverage-report.v1';
  runId: string;
  status: 'PASS' | 'FAIL';
  terrain: SceneIrCoverageDomainReport;
  waves: SceneIrCoverageDomainReport;
  pickups: SceneIrCoverageDomainReport;
  objectives: SceneIrCoverageDomainReport;
  semanticChecks: {
    winTargetPreserved: boolean;
    noRequiredWaveDropped: boolean;
    noRequiredPickupDropped: boolean;
    noProtectedDomainClearedByOverlay: boolean;
  };
  diagnostics: string[];
};

type SceneIrCoverageDomainReport = {
  runtimePlanCount: number;
  mappedCount: number;
  missingSourceIds: string[];
};

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
  const sceneOverlay = input.rawDsl?.scenes?.[0];
  const sceneIr = applyV01SceneOverlay(buildRuntimePlanDerivedScene(input, addProvenance), sceneOverlay, addProvenance);

  return SceneIrSchema.parse({
    schemaVersion: 'step33.scene-ir.v1',
    projectId: input.projectId,
    runId: input.runId,
    runtimeProfile: 'side_scrolling_run_and_gun.v1',
    source: 'runtime_plan_derived',
    scenes: [sceneIr],
    provenance
  });
}

export function buildSceneIrAuthorityReport(input: { runId: string; sceneIr: SceneIr }): SceneIrAuthorityReport {
  const hasDslOverlay = Object.values(input.sceneIr.provenance).some((entry) => entry.source === 'dsl' && entry.dslPath.startsWith('/scenes/'));
  return {
    schemaVersion: 'step37.scene-ir-authority-report.v1',
    runId: input.runId,
    decision: hasDslOverlay ? 'runtime_plan_with_dsl_overlay' : 'runtime_plan_authoritative',
    domainOwnership: {
      terrain: 'runtime_plan',
      spawns: 'runtime_plan',
      pickups: 'runtime_plan',
      objectives: 'runtime_plan',
      camera_gameplay_bounds: 'runtime_plan',
      presentation: hasDslOverlay ? 'normalized_dsl_scene_overlay' : 'runtime_plan',
      background: hasDslOverlay ? 'normalized_dsl_scene_overlay' : 'runtime_plan',
      lighting: hasDslOverlay ? 'normalized_dsl_scene_overlay' : 'runtime_plan',
      decorations: hasDslOverlay ? 'normalized_dsl_scene_overlay' : 'runtime_plan',
      asset_bindings: 'step33_asset_binding'
    },
    conflicts: [],
    diagnostics: []
  };
}

export function buildSceneIrCoverageReport(input: { runId: string; ir: NormalizedGameIr; sceneIr: SceneIr }): SceneIrCoverageReport {
  const sideScrolling = input.ir.runtime_plan.side_scrolling;
  if (sideScrolling === undefined) {
    throw new Error('Scene IR coverage currently requires side_scrolling runtime plan.');
  }

  const scene = input.sceneIr.scenes[0];
  const terrain = coverageFor(
    sideScrolling.platforms.map((platform) => platform.id),
    scene.platforms.map((platform) => stripRuntimePrefix(platform.runtimeId, 'platform.'))
  );
  const waves = coverageFor(
    sideScrolling.waves.map((wave) => wave.id),
    scene.enemyInstances.map((enemy) => stripRuntimePrefix(enemy.runtimeId, 'spawn.'))
  );
  const pickups = coverageFor(
    sideScrolling.pickups.map((pickup) => pickup.id),
    scene.pickups.map((pickup) => stripRuntimePrefix(pickup.runtimeId, 'pickup.'))
  );
  const objectives = {
    runtimePlanCount: 1,
    mappedCount: scene.goals.length > 0 ? 1 : 0,
    missingSourceIds: scene.goals.length > 0 ? [] : ['winCondition']
  };
  let winTargetPreserved = true;
  if (sideScrolling.winCondition.kind === 'reach_exit') {
    const targetX = sideScrolling.winCondition.targetX;
    winTargetPreserved = scene.goals.some((goal) => goal.kind === 'reach' && goal.x === targetX);
  }
  const semanticChecks = {
    winTargetPreserved,
    noRequiredWaveDropped: waves.missingSourceIds.length === 0,
    noRequiredPickupDropped: pickups.missingSourceIds.length === 0,
    noProtectedDomainClearedByOverlay: terrain.missingSourceIds.length === 0 && objectives.missingSourceIds.length === 0
  };
  const diagnostics = [
    ...terrain.missingSourceIds.map((id) => `SCENE_IR_TERRAIN_MAPPING_MISSING:${id}`),
    ...waves.missingSourceIds.map((id) => `SCENE_IR_WAVE_MAPPING_MISSING:${id}`),
    ...pickups.missingSourceIds.map((id) => `SCENE_IR_PICKUP_MAPPING_MISSING:${id}`),
    ...objectives.missingSourceIds.map((id) => `SCENE_IR_OBJECTIVE_MAPPING_MISSING:${id}`),
    ...(winTargetPreserved ? [] : ['SCENE_IR_WIN_TARGET_CHANGED'])
  ];

  return {
    schemaVersion: 'step37.scene-ir-coverage-report.v1',
    runId: input.runId,
    status: diagnostics.length === 0 ? 'PASS' : 'FAIL',
    terrain,
    waves,
    pickups,
    objectives,
    semanticChecks,
    diagnostics
  };
}

function applyV01SceneOverlay(
  base: SceneIrScene,
  sceneOverlay: NonNullable<RawGameDsl['scenes']>[number] | undefined,
  addProvenance: (runtimeId: string, value: ProvenanceInput) => string
): SceneIrScene {
  if (sceneOverlay === undefined) {
    return base;
  }

  return {
    ...base,
    id: sceneOverlay.id,
    backgrounds:
      sceneOverlay.backgroundLayers.length === 0
        ? base.backgrounds
        : sceneOverlay.backgroundLayers.map((layer, index) => {
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
          })
  };
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
          source: 'runtime_plan',
          dslPath: `/runtime_plan/side_scrolling/platforms/${index}`,
          relatedDslPaths: terrain === undefined ? undefined : [`/level/terrain/${terrain}`]
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
        source: 'runtime_plan',
        dslPath: '/runtime_plan/side_scrolling/player',
        relatedDslPaths: input.rawDsl === undefined
          ? undefined
          : ['/player', ...(input.rawDsl.player.visual === undefined ? [] : ['/player/visual'])]
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
          source: 'runtime_plan',
          dslPath: `/runtime_plan/side_scrolling/waves/${index}`,
          relatedDslPaths: spawn === undefined ? undefined : [`/level/spawns/${spawn}`]
        })
      };
    }),
    pickups: sideScrolling.pickups.map((pickup, index) => {
      const runtimeId = `pickup.${pickup.id}`;
      return {
        runtimeId,
        kind: pickup.kind,
        x: pickup.x,
        y: pickup.y,
        provenanceRef: addProvenance(runtimeId, {
          source: 'runtime_plan',
          dslPath: `/runtime_plan/side_scrolling/pickups/${index}`
        })
      };
    }),
    goals: [runtimePlanGoal(sideScrolling, addProvenance, input.rawDsl !== undefined)]
  };
}

function coverageFor(requiredIds: readonly string[], mappedIds: readonly string[]): SceneIrCoverageDomainReport {
  const mapped = new Set(mappedIds);
  const missingSourceIds = requiredIds.filter((id) => !mapped.has(id));
  return {
    runtimePlanCount: requiredIds.length,
    mappedCount: requiredIds.length - missingSourceIds.length,
    missingSourceIds
  };
}

function stripRuntimePrefix(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
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
  const provenance: ProvenanceInput = {
    source: 'runtime_plan',
    dslPath: '/runtime_plan/side_scrolling/winCondition',
    relatedDslPaths: hasRawDsl ? ['/objectives/win'] : undefined
  };

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
