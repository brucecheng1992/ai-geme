import {
  resolveSideScrollingRuntimeSlice,
  type SideScrollingRuntimePlan,
  type SideScrollingRuntimeSlice
} from './side-scrolling-runtime-plan.js';

type SceneIrProvenance = {
  source: 'dsl' | 'runtime_plan' | 'system';
  dslPath: string;
};

type SceneIrBackground = {
  runtimeId: string;
  role: 'sky' | 'far' | 'mid' | 'near' | 'overlay';
  parallax: number;
  fixedToCamera?: boolean;
  repeatX?: boolean;
  opacity?: number;
  depth: number;
  provenanceRef: string;
};

type SceneIrPlatform = {
  runtimeId: string;
  kind: 'platform' | 'ground' | 'slope';
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: 'rectangle' | 'slope' | 'one_way';
  collider?: { runtimeId: string; enabled: boolean; oneWay?: boolean };
  provenanceRef: string;
};

type SceneIrPlayer = {
  runtimeId: 'entity.player';
  prefabRef?: string;
  x: number;
  y: number;
  provenanceRef: string;
};

type SceneIrEnemyInstance = {
  runtimeId: string;
  archetypeRef: string;
  prefabRef?: string;
  x: number;
  y: number;
  count?: number;
  spawnRule?: string;
  provenanceRef: string;
};

type SceneIrPickup = {
  runtimeId: string;
  kind: 'health' | 'score' | 'weapon';
  x: number;
  y: number;
  provenanceRef: string;
};

type SceneIrGoal = {
  runtimeId: string;
  kind: 'reach' | 'destroy' | 'collect' | 'survive' | 'enemy_cleared';
  x?: number;
  y?: number;
  provenanceRef: string;
};

type SceneIrScene = {
  id: string;
  world: {
    width: number;
    height: number;
    viewportWidth: number;
    viewportHeight: number;
  };
  camera: SideScrollingRuntimeSlice['camera'];
  backgrounds: SceneIrBackground[];
  platforms: SceneIrPlatform[];
  player: SceneIrPlayer;
  enemyInstances: SceneIrEnemyInstance[];
  pickups?: SceneIrPickup[];
  goals: SceneIrGoal[];
};

export type SideScrollingSceneIr = {
  schemaVersion: 'step33.scene-ir.v1';
  projectId?: string;
  runId?: string;
  runtimeProfile: 'side_scrolling_run_and_gun.v1';
  source?: 'dsl_scene_contract' | 'runtime_plan_derived';
  scenes: [SceneIrScene, ...SceneIrScene[]];
  provenance: Record<string, SceneIrProvenance>;
};

export type RuntimeSceneBindingKind = 'background' | 'platform' | 'player' | 'enemy' | 'pickup' | 'goal';

export type RuntimeSceneBinding = {
  kind: RuntimeSceneBindingKind;
  sceneRuntimeId: string;
  runtimeInstanceId: string | null;
  sourceDslPath?: string;
  source: 'dsl' | 'runtime_plan' | 'system';
  status: 'bound' | 'unbound';
  reason?: string;
};

export type SideScrollingRuntimeSceneBindingState = {
  source: 'scene_ir' | 'runtime_plan';
  summary: {
    backgroundCount: number;
    platformCount: number;
    enemyInstanceCount: number;
    pickupCount: number;
    goalCount: number;
    boundCount: number;
    unboundCount: number;
  };
  bindings: RuntimeSceneBinding[];
};

export function resolveSideScrollingRuntimeSliceWithSceneIr(
  runtimePlan: SideScrollingRuntimePlan,
  sceneIr: SideScrollingSceneIr
): { plan: SideScrollingRuntimeSlice; bindingState: SideScrollingRuntimeSceneBindingState } {
  const base = resolveSideScrollingRuntimeSlice(runtimePlan);
  const scene = sceneIr.scenes[0];
  const pickups = scene.pickups ?? [];
  const enemyDefinitions = base.enemyDefinitions.length > 0 ? base.enemyDefinitions : [];
  const waves = scene.enemyInstances.map((enemy) => ({
    id: enemy.runtimeId,
    enemyTypeId: enemyDefinitions.some((definition) => definition.id === enemy.archetypeRef)
      ? enemy.archetypeRef
      : enemyDefinitions[0]?.id ?? enemy.archetypeRef,
    trigger: 'reach_x' as const,
    triggerX: Math.max(0, enemy.x),
    spawnX: enemy.x,
    spawnY: enemy.y,
    count: enemy.count ?? 1
  }));
  const goals = scene.goals.map((goal) => ({
    id: goal.runtimeId,
    kind: goal.kind,
    ...(goal.x === undefined ? {} : { x: goal.x }),
    ...(goal.y === undefined ? {} : { y: goal.y })
  }));

  return {
    plan: {
      ...base,
      scene: {
        viewport: toViewport(scene.world, base.scene.viewport),
        world: {
          ...base.scene.world,
          width: scene.world.width,
          height: scene.world.height
        }
      },
      camera: scene.camera,
      backgrounds: scene.backgrounds.map((background) => ({
        id: background.runtimeId,
        role: background.role,
        parallax: background.parallax,
        fixedToCamera: background.fixedToCamera,
        repeatX: background.repeatX,
        opacity: background.opacity,
        depth: background.depth
      })),
      platforms: scene.platforms.map((platform) => ({
        id: platform.runtimeId,
        kind: platform.kind,
        x: platform.x,
        y: platform.y,
        width: platform.width,
        height: platform.height
      })),
      player: {
        ...base.player,
        entityId: scene.player.runtimeId,
        spawn: { x: scene.player.x, y: scene.player.y }
      },
      waves,
      pickups: pickups.map((pickup) => ({
        id: pickup.runtimeId,
        kind: pickup.kind,
        x: pickup.x,
        y: pickup.y
      })),
      goals,
      winCondition: resolveWinCondition(sceneIr, scene, base)
    },
    bindingState: buildBindingState(sceneIr)
  };
}

function resolveWinCondition(sceneIr: SideScrollingSceneIr, scene: SceneIrScene, base: SideScrollingRuntimeSlice): SideScrollingRuntimeSlice['winCondition'] {
  const reachGoal = scene.goals.find((goal) => goal.kind === 'reach' && typeof goal.x === 'number');
  if (reachGoal?.x !== undefined) {
    return { kind: 'reach_exit', targetX: reachGoal.x };
  }

  const enemyClearedGoal = scene.goals.find((goal) => goal.kind === 'enemy_cleared');
  if (enemyClearedGoal !== undefined) {
    if (sceneIr.source === 'runtime_plan_derived' && base.winCondition.kind === 'enemy_cleared') {
      return base.winCondition;
    }
    return {
      kind: 'enemy_cleared',
      targetCount: scene.enemyInstances.reduce((total, enemy) => total + (enemy.count ?? 1), 0)
    };
  }

  // Unsupported Scene IR goal kinds stay visible in binding evidence and keep the runtime baseline.
  // They are closed by acceptance through the unbound goal binding instead of being remapped silently.
  return base.winCondition;
}

function isRuntimeSupportedGoal(goal: SceneIrGoal): boolean {
  return goal.kind === 'reach' || goal.kind === 'enemy_cleared';
}

function sceneGoalRuntimeInstanceId(goal: SceneIrGoal): string | null {
  return isRuntimeSupportedGoal(goal) ? goal.runtimeId : null;
}

function sceneGoalBindingReason(goal: SceneIrGoal): string | undefined {
  return isRuntimeSupportedGoal(goal) ? undefined : 'unsupported_goal_kind';
}

function sceneGoalBindingStatus(goal: SceneIrGoal): RuntimeSceneBinding['status'] {
  return isRuntimeSupportedGoal(goal) ? 'bound' : 'unbound';
}

function supportedBindingCount(bindings: RuntimeSceneBinding[]): number {
  return bindings.filter((row) => row.status === 'bound').length;
}

function unsupportedBindingCount(bindings: RuntimeSceneBinding[]): number {
  return bindings.filter((row) => row.status === 'unbound').length;
}

function buildBindingState(sceneIr: SideScrollingSceneIr): SideScrollingRuntimeSceneBindingState {
  const scene = sceneIr.scenes[0];
  const pickups = scene.pickups ?? [];
  const bindings: RuntimeSceneBinding[] = [
    ...scene.backgrounds.map((background) => binding(sceneIr, 'background', background.runtimeId, background.runtimeId, background.provenanceRef)),
    ...scene.platforms.map((platform) => binding(sceneIr, 'platform', platform.runtimeId, platform.runtimeId, platform.provenanceRef)),
    binding(sceneIr, 'player', scene.player.runtimeId, scene.player.runtimeId, scene.player.provenanceRef),
    ...scene.enemyInstances.map((enemy) => binding(sceneIr, 'enemy', enemy.runtimeId, enemy.runtimeId, enemy.provenanceRef)),
    ...pickups.map((pickup) => binding(sceneIr, 'pickup', pickup.runtimeId, pickup.runtimeId, pickup.provenanceRef)),
    ...scene.goals.map((goal) =>
      binding(sceneIr, 'goal', goal.runtimeId, sceneGoalRuntimeInstanceId(goal), goal.provenanceRef, sceneGoalBindingStatus(goal), sceneGoalBindingReason(goal))
    )
  ];

  return {
    source: 'scene_ir',
    summary: {
      backgroundCount: scene.backgrounds.length,
      platformCount: scene.platforms.length,
      enemyInstanceCount: scene.enemyInstances.length,
      pickupCount: pickups.length,
      goalCount: scene.goals.length,
      boundCount: supportedBindingCount(bindings),
      unboundCount: unsupportedBindingCount(bindings)
    },
    bindings
  };
}

function binding(
  sceneIr: SideScrollingSceneIr,
  kind: RuntimeSceneBindingKind,
  sceneRuntimeId: string,
  runtimeInstanceId: string | null,
  provenanceRef: string,
  status: RuntimeSceneBinding['status'] = 'bound',
  reason?: string
): RuntimeSceneBinding {
  const provenance = sceneIr.provenance[provenanceRef] ?? sceneIr.provenance[sceneRuntimeId];
  return {
    kind,
    sceneRuntimeId,
    runtimeInstanceId,
    ...(provenance?.dslPath === undefined ? {} : { sourceDslPath: provenance.dslPath }),
    source: provenance?.source ?? 'system',
    status,
    ...(reason === undefined ? {} : { reason })
  };
}

function toViewport(
  world: SceneIrScene['world'],
  fallback: SideScrollingRuntimeSlice['scene']['viewport']
): SideScrollingRuntimeSlice['scene']['viewport'] {
  return world.viewportWidth === 960 && world.viewportHeight === 540 ? { width: 960, height: 540 } : fallback;
}
