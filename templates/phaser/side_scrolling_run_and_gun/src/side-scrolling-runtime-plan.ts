export type SideScrollingPlatform = {
  id: string;
  kind: 'platform' | 'ground' | 'slope';
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SideScrollingBackground = {
  id: string;
  role: 'sky' | 'far' | 'mid' | 'near' | 'overlay';
  parallax: number;
  fixedToCamera?: boolean;
  repeatX?: boolean;
  opacity?: number;
  depth: number;
};

export type SideScrollingEnemyDefinition = {
  id: string;
  label: string;
  health: number;
  movement: {
    type: 'static' | 'horizontal' | 'patrol' | 'chase_player' | 'move_left' | 'move_right';
    speedPxPerSec: number;
  };
  firing: {
    projectileEntityId: string;
    cooldownMs: number;
    speedPxPerSec: number;
    damage: number;
    rangePx: number;
  };
};

export type SideScrollingWave = {
  id: string;
  enemyTypeId: string;
  trigger: 'enter_segment' | 'reach_x';
  triggerX: number;
  spawnX: number;
  spawnY?: number;
  count: number;
};

export type SideScrollingGoal = {
  id: string;
  kind: 'reach' | 'destroy' | 'collect' | 'survive' | 'enemy_cleared';
  x?: number;
  y?: number;
};

export type SideScrollingRuntimeSlice = {
  scene: {
    viewport: { width: 960; height: 540 };
    world: { width: number; height: number; gravityY: number };
  };
  camera: {
    mode: 'side_follow';
    followTarget: 'player';
    bounds: { x: 0; y: 0; width: number; height: number };
  };
  physics: {
    mode: 'gravity_platformer';
    colliders: Array<['player' | 'enemies' | 'projectiles', 'platforms']>;
    overlaps: Array<['playerProjectiles' | 'player', 'enemies' | 'pickups']>;
  };
  player: {
    entityId: string;
    spawn: { x: number; y: number };
    speedPxPerSec: number;
    jumpVelocity: number;
    health: number;
    lives: number;
    fireCooldownMs: number;
    projectileEntityId: string;
    projectileSpeedPxPerSec: number;
    projectileDamage: number;
  };
  backgrounds?: SideScrollingBackground[];
  platforms: SideScrollingPlatform[];
  enemyDefinitions: SideScrollingEnemyDefinition[];
  waves: SideScrollingWave[];
  pickups: Array<{ id: string; kind: 'health' | 'score' | 'weapon'; x: number; y: number }>;
  goals?: SideScrollingGoal[];
  winCondition: { kind: 'reach_exit'; targetX: number } | { kind: 'enemy_cleared'; targetCount: number };
  telemetry: { profile: 'side_scrolling_run_and_gun_smoke' };
};

export type SideScrollingRuntimePlan = {
  side_scrolling?: SideScrollingRuntimeSlice;
};

export const defaultSideScrollingRuntimeSlice: SideScrollingRuntimeSlice = {
  scene: {
    viewport: { width: 960, height: 540 },
    world: { width: 1280, height: 540, gravityY: 1200 }
  },
  camera: {
    mode: 'side_follow',
    followTarget: 'player',
    bounds: { x: 0, y: 0, width: 1280, height: 540 }
  },
  physics: {
    mode: 'gravity_platformer',
    colliders: [
      ['player', 'platforms'],
      ['enemies', 'platforms'],
      ['projectiles', 'platforms']
    ],
    overlaps: [
      ['playerProjectiles', 'enemies'],
      ['player', 'enemies'],
      ['player', 'pickups']
    ]
  },
  player: {
    entityId: 'player',
    spawn: { x: 120, y: 452 },
    speedPxPerSec: 260,
    jumpVelocity: -540,
    health: 3,
    lives: 3,
    fireCooldownMs: 260,
    projectileEntityId: 'pulse_bolt',
    projectileSpeedPxPerSec: 620,
    projectileDamage: 1
  },
  platforms: [
    { id: 'ground_intro', kind: 'ground', x: 0, y: 500, width: 1280, height: 40 },
    { id: 'platform_bridge', kind: 'platform', x: 980, y: 380, width: 280, height: 24 }
  ],
  enemyDefinitions: [
    {
      id: 'drone_type',
      label: 'Alien Drone',
      health: 1,
      movement: { type: 'patrol', speedPxPerSec: 90 },
      firing: { projectileEntityId: 'pulse_bolt', cooldownMs: 1400, speedPxPerSec: 372, damage: 1, rangePx: 520 }
    }
  ],
  waves: [
    { id: 'spawn_intro_drone', enemyTypeId: 'drone_type', trigger: 'enter_segment', triggerX: 640, spawnX: 640, count: 3 },
    { id: 'spawn_bridge_drone', enemyTypeId: 'drone_type', trigger: 'reach_x', triggerX: 1080, spawnX: 1080, count: 5 }
  ],
  pickups: [{ id: 'field_medkit', kind: 'health', x: 720, y: 450 }],
  winCondition: { kind: 'reach_exit', targetX: 1240 },
  telemetry: { profile: 'side_scrolling_run_and_gun_smoke' }
};

export const defaultSideScrollingRuntimePlan: SideScrollingRuntimePlan = {
  side_scrolling: defaultSideScrollingRuntimeSlice
};

export function resolveSideScrollingRuntimeSlice(plan: SideScrollingRuntimePlan): SideScrollingRuntimeSlice {
  return plan.side_scrolling ?? defaultSideScrollingRuntimeSlice;
}
