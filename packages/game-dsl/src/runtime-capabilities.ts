export const RUNTIME_SUPPORT_STATUSES = ['unsupported', 'planned', 'experimental', 'supported'] as const;

export type RuntimeSupportStatus = (typeof RUNTIME_SUPPORT_STATUSES)[number];

export type RuntimeGenreCapability = {
  genre: string;
  version: string;
  status: RuntimeSupportStatus;
  requiredCapabilities: string[];
  implementedCapabilities: string[];
  missingCapabilities: string[];
  templateId?: string;
  qaProfile?: string;
  notes?: string[];
};

const topDownShooterCapabilities = ['top_down_camera', 'eight_direction_movement', 'projectile_combat', 'enemy_waves'] as const;
const dodgerCollectorCapabilities = ['top_down_camera', 'eight_direction_movement', 'collectibles', 'hazards'] as const;
const sideScrollingRunAndGunCapabilities = [
  'side_view_camera',
  'gravity_platformer_physics',
  'run_jump_controller',
  'multi_direction_shooting',
  'projectile_combat',
  'enemy_spawn_triggers',
  'platforms_terrain_collision',
  'checkpoint_or_lives_system'
] as const;

export const RUNTIME_GENRE_CAPABILITIES: RuntimeGenreCapability[] = [
  {
    genre: 'top_down_shooter',
    version: 'v1',
    status: 'supported',
    requiredCapabilities: [...topDownShooterCapabilities],
    implementedCapabilities: [...topDownShooterCapabilities],
    missingCapabilities: [],
    templateId: 'phaser/shooter_v1',
    qaProfile: 'top_down_shooter_smoke'
  },
  {
    genre: 'dodger_collector',
    version: 'v1',
    status: 'supported',
    requiredCapabilities: [...dodgerCollectorCapabilities],
    implementedCapabilities: [...dodgerCollectorCapabilities],
    missingCapabilities: [],
    templateId: 'phaser/dodger_v1',
    qaProfile: 'dodger_collector_smoke'
  },
  {
    genre: 'side_scrolling_run_and_gun',
    version: 'v1',
    status: 'supported',
    requiredCapabilities: [...sideScrollingRunAndGunCapabilities],
    implementedCapabilities: [...sideScrollingRunAndGunCapabilities],
    missingCapabilities: [],
    templateId: 'phaser/side_scrolling_run_and_gun.v1',
    qaProfile: 'side_scrolling_run_and_gun_smoke',
    notes: ['Minimum Phaser side-scrolling run-and-gun runtime supports side-follow camera, run/jump/shoot, enemy waves, terrain collision, lives, and smoke QA.']
  },
  {
    genre: 'side_scrolling_platformer',
    version: 'v1',
    status: 'unsupported',
    requiredCapabilities: ['side_view_camera', 'gravity_platformer_physics', 'run_jump_controller', 'platforms_terrain_collision'],
    implementedCapabilities: [],
    missingCapabilities: ['side_view_camera', 'gravity_platformer_physics', 'run_jump_controller', 'platforms_terrain_collision']
  },
  {
    genre: 'vertical_shooter',
    version: 'v1',
    status: 'unsupported',
    requiredCapabilities: ['vertical_scroll_camera', 'vertical_shooter_enemy_patterns'],
    implementedCapabilities: [],
    missingCapabilities: ['vertical_scroll_camera', 'vertical_shooter_enemy_patterns']
  },
  {
    genre: 'breakout',
    version: 'v1',
    status: 'unsupported',
    requiredCapabilities: ['paddle_ball_physics', 'brick_collision_grid'],
    implementedCapabilities: [],
    missingCapabilities: ['paddle_ball_physics', 'brick_collision_grid']
  },
  {
    genre: 'maze_chase',
    version: 'v1',
    status: 'unsupported',
    requiredCapabilities: ['tilemap_maze_navigation', 'chaser_pathfinding'],
    implementedCapabilities: [],
    missingCapabilities: ['tilemap_maze_navigation', 'chaser_pathfinding']
  }
];

export function findRuntimeGenreCapability(genre: string): RuntimeGenreCapability | undefined {
  return RUNTIME_GENRE_CAPABILITIES.find((capability) => capability.genre === genre);
}

export function isRuntimeGenreExecutable(capability: RuntimeGenreCapability): boolean {
  return capability.status === 'supported' && capability.missingCapabilities.length === 0 && capability.templateId !== undefined && capability.qaProfile !== undefined;
}

export function describeRuntimeGenreCapability(capability: RuntimeGenreCapability | undefined): string {
  if (capability === undefined) {
    return 'No runtime capability registry entry exists for this normalized genre.';
  }

  if (isRuntimeGenreExecutable(capability)) {
    return `Runtime template ${capability.templateId} and QA profile ${capability.qaProfile} are available.`;
  }

  const note = capability.notes?.[0];
  if (note !== undefined) {
    return note;
  }

  return capability.missingCapabilities.length === 0
    ? `Runtime capability status is ${capability.status}.`
    : `Missing runtime capabilities: ${capability.missingCapabilities.join(', ')}.`;
}
