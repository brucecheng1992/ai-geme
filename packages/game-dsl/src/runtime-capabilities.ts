export const RUNTIME_SUPPORT_STATUSES = ['unsupported', 'planned', 'experimental', 'supported'] as const;
export const RUNTIME_GENRE_REGISTRY_VERSION = 'runtime-genre-registry.v1';

export type RuntimeSupportStatus = (typeof RUNTIME_SUPPORT_STATUSES)[number];

export type RuntimeGenreCapability = {
  genre: string;
  version: string;
  status: RuntimeSupportStatus;
  dslProfile?: string;
  irProfile?: string;
  runtimeTemplate?: string;
  runtimeTemplateManifestId?: RuntimeTemplateManifestId;
  templateDir?: RuntimeTemplateDir;
  templateSourceFiles?: string[];
  generatedTemplateArtifacts?: RuntimeGeneratedTemplateArtifact[];
  requiredCapabilities: string[];
  implementedCapabilities: string[];
  missingCapabilities: string[];
  templateId?: string;
  qaProfile?: string;
  notes?: string[];
};

export const RAW_DSL_GAME_GENRES = ['collector', 'dodger', 'shooter', 'side_scrolling_run_and_gun'] as const;
export const RUNTIME_TEMPLATE_MANIFEST_IDS = ['collector_v1', 'dodger_v1', 'shooter_v1', 'side_scrolling_run_and_gun.v1'] as const;
export const RUNTIME_TEMPLATE_DIRS = ['collector', 'dodger', 'shooter', 'side_scrolling_run_and_gun'] as const;
export const SIDE_SCROLLING_WORLD_BOUNDS = {
  viewportWidth: 960,
  viewportHeight: 540,
  maxWorldWidth: 24000,
  maxWorldHeight: 720
} as const;

export type RawDslGameGenre = (typeof RAW_DSL_GAME_GENRES)[number];
export type RuntimeTemplateManifestId = (typeof RUNTIME_TEMPLATE_MANIFEST_IDS)[number];
export type RuntimeTemplateDir = (typeof RUNTIME_TEMPLATE_DIRS)[number];
export type RuntimeGeneratedTemplateArtifact = 'assetManifest' | 'runtimePlan' | 'sceneIr' | 'liveEditRegistry';

const topDownShooterCapabilities = ['top_down_camera', 'eight_direction_movement', 'projectile_combat', 'enemy_waves'] as const;
const collectorCapabilities = ['top_down_camera', 'eight_direction_movement', 'collectibles'] as const;
const dodgerCollectorCapabilities = ['top_down_camera', 'eight_direction_movement', 'collectibles', 'hazards'] as const;
const sideScrollingRunAndGunCapabilities = [
  'side_view_camera',
  'gravity_platformer_physics',
  'run_jump_controller',
  'platform_collision',
  'multi_direction_shooting',
  'projectile_combat',
  'enemy_spawn',
  'enemy_spawn_triggers',
  'terrain_collision',
  'platforms_terrain_collision',
  'player_health',
  'restart_loop',
  'checkpoint_or_lives_system'
] as const;

export const RuntimeGenreRegistry: RuntimeGenreCapability[] = [
  {
    genre: 'collector',
    version: 'v1',
    status: 'supported',
    dslProfile: 'collector.v1',
    irProfile: 'collector.v1',
    runtimeTemplate: 'phaser/collector',
    runtimeTemplateManifestId: 'collector_v1',
    templateDir: 'collector',
    templateSourceFiles: ['src/collector-art-library.ts'],
    generatedTemplateArtifacts: ['assetManifest'],
    requiredCapabilities: [...collectorCapabilities],
    implementedCapabilities: [...collectorCapabilities],
    missingCapabilities: [],
    templateId: 'phaser/collector_v1',
    qaProfile: 'collector_smoke'
  },
  {
    genre: 'top_down_shooter',
    version: 'v1',
    status: 'supported',
    dslProfile: 'shooter.v1',
    irProfile: 'shooter.v1',
    runtimeTemplate: 'phaser/shooter',
    runtimeTemplateManifestId: 'shooter_v1',
    templateDir: 'shooter',
    templateSourceFiles: ['src/shooter-runtime.ts', 'src/shooter-runtime-plan.ts', 'src/shooter-renderer.ts', 'src/live-edit-bridge.ts', 'src/shooter-art-library.ts', 'src/template-visuals.ts'],
    generatedTemplateArtifacts: ['assetManifest', 'runtimePlan', 'liveEditRegistry'],
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
    dslProfile: 'dodger.v1',
    irProfile: 'dodger.v1',
    runtimeTemplate: 'phaser/dodger',
    runtimeTemplateManifestId: 'dodger_v1',
    templateDir: 'dodger',
    templateSourceFiles: ['src/dodger-art-library.ts', 'src/dodger-runtime-plan.ts'],
    generatedTemplateArtifacts: ['assetManifest', 'runtimePlan'],
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
    dslProfile: 'side_scrolling_run_and_gun.v1',
    irProfile: 'side_scrolling_run_and_gun.v1',
    runtimeTemplate: 'phaser/side_scrolling_run_and_gun',
    runtimeTemplateManifestId: 'side_scrolling_run_and_gun.v1',
    templateDir: 'side_scrolling_run_and_gun',
    templateSourceFiles: ['src/side-scrolling-art-library.ts', 'src/side-scrolling-scene-ir.ts', 'src/side-scrolling-runtime-plan.ts', 'src/side-scrolling-live-edit-bridge.ts'],
    generatedTemplateArtifacts: ['assetManifest', 'runtimePlan', 'sceneIr', 'liveEditRegistry'],
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
    dslProfile: 'side_scrolling_platformer.v1',
    irProfile: 'side_scrolling_platformer.v1',
    requiredCapabilities: ['side_view_camera', 'gravity_platformer_physics', 'run_jump_controller', 'platforms_terrain_collision'],
    implementedCapabilities: [],
    missingCapabilities: ['side_view_camera', 'gravity_platformer_physics', 'run_jump_controller', 'platforms_terrain_collision']
  },
  {
    genre: 'vertical_shooter',
    version: 'v1',
    status: 'unsupported',
    dslProfile: 'vertical_shooter.v1',
    irProfile: 'vertical_shooter.v1',
    requiredCapabilities: ['vertical_scroll_camera', 'vertical_shooter_enemy_patterns'],
    implementedCapabilities: [],
    missingCapabilities: ['vertical_scroll_camera', 'vertical_shooter_enemy_patterns']
  },
  {
    genre: 'breakout',
    version: 'v1',
    status: 'unsupported',
    dslProfile: 'breakout.v1',
    irProfile: 'breakout.v1',
    requiredCapabilities: ['paddle_ball_physics', 'brick_collision_grid'],
    implementedCapabilities: [],
    missingCapabilities: ['paddle_ball_physics', 'brick_collision_grid']
  },
  {
    genre: 'maze_chase',
    version: 'v1',
    status: 'unsupported',
    dslProfile: 'maze_chase.v1',
    irProfile: 'maze_chase.v1',
    requiredCapabilities: ['tilemap_maze_navigation', 'chaser_pathfinding'],
    implementedCapabilities: [],
    missingCapabilities: ['tilemap_maze_navigation', 'chaser_pathfinding']
  }
];

export const RUNTIME_GENRE_CAPABILITIES = RuntimeGenreRegistry;

export function findRuntimeGenreCapability(genre: string): RuntimeGenreCapability | undefined {
  return RuntimeGenreRegistry.find((capability) => capability.genre === genre);
}

export function findRuntimeGenreCapabilityByTemplateManifestId(templateId: string): RuntimeGenreCapability | undefined {
  return RuntimeGenreRegistry.find((capability) => capability.runtimeTemplateManifestId === templateId);
}

export function listSupportedRuntimeGenres(): string[] {
  return RuntimeGenreRegistry.filter(isRuntimeGenreExecutable).map((capability) => capability.genre);
}

export function listSupportedRuntimeTemplateDirs(): RuntimeTemplateDir[] {
  return RuntimeGenreRegistry.filter(isRuntimeGenreExecutable).flatMap((capability) =>
    capability.templateDir === undefined ? [] : [capability.templateDir]
  );
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
