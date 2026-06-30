import collectorContract from '../../../../packages/game-dsl/src/contracts/collector.contract.json' with { type: 'json' };
import dodgerContract from '../../../../packages/game-dsl/src/contracts/dodger.contract.json' with { type: 'json' };
import shooterContract from '../../../../packages/game-dsl/src/contracts/shooter.contract.json' with { type: 'json' };
import sideScrollingRunAndGunContract from '../../../../packages/game-dsl/src/contracts/side_scrolling_run_and_gun.contract.json' with { type: 'json' };
import { authorityBundleRef, findRuntimeGenreCapability, type RawGameDsl, type RuntimeGenreCapability } from '../../../../packages/game-dsl/src/index.js';
import type { BuildRawDslPromptContextParams, DslGenerationContext, RawDslPromptContext, SupportedGameGenre } from './prompt-context.types.js';

const selectedContracts: Record<SupportedGameGenre, unknown> = {
  collector: collectorContract,
  dodger: dodgerContract,
  shooter: shooterContract,
  side_scrolling_run_and_gun: sideScrollingRunAndGunContract
};

const validCollectorExample: RawGameDsl = {
  dsl_version: 'game-dsl-v0.1',
  metadata: {
    title: 'Gem Run',
    description: 'Collect gems before time runs out.',
    language: 'en'
  },
  game: {
    genre: 'collector',
    camera: 'top_down',
    difficulty: 'easy',
    target_play_time_sec: 60
  },
  world: {
    width: 960,
    height: 540,
    visual_theme: 'neon garden'
  },
  player: {
    id: 'player',
    label: 'Hero',
    movement: { type: 'eight_direction', speed_px_per_sec: 240 },
    actions: [{ id: 'collect', type: 'collect' }]
  },
  entities: [
    {
      id: 'gem',
      kind: 'collectible',
      label: 'Gem',
      count: 8,
      movement: { type: 'static' }
    }
  ],
  rules: {
    collisions: [
      {
        id: 'collect_gem',
        source: 'player',
        target: 'gem',
        type: 'overlap',
        effects: [{ type: 'score_add', value: 1 }, { type: 'destroy' }]
      }
    ]
  },
  objectives: {
    win: { type: 'target_score', target: 8 },
    lose: { type: 'none' }
  },
  ui: {
    hud: ['score', 'objective'],
    restart: true,
    screens: {
      win: { title: 'VICTORY', subtitle: 'All gems collected' },
      lose: { title: 'DEFEAT', subtitle: 'Try again' }
    }
  }
};

const validDodgerExample: RawGameDsl = {
  dsl_version: 'game-dsl-v0.1',
  metadata: {
    title: 'Road Dodge',
    description: 'Move across the road, avoid hazards, and survive the timer.',
    language: 'en'
  },
  game: {
    genre: 'dodger',
    camera: 'top_down',
    difficulty: 'normal',
    target_play_time_sec: 60
  },
  world: {
    width: 960,
    height: 540,
    visual_theme: 'urban street'
  },
  player: {
    id: 'player',
    label: 'Runner',
    health: 3,
    movement: { type: 'horizontal', speed_px_per_sec: 300 },
    actions: [{ id: 'collect_action', type: 'collect' }]
  },
  entities: [
    {
      id: 'coin',
      kind: 'collectible',
      label: 'Coin',
      count: 6,
      movement: { type: 'static' },
      spawn: { strategy: 'fixed_positions', max_active: 2, interval_ms: 1000 }
    },
    {
      id: 'barrier',
      kind: 'hazard',
      label: 'Barrier',
      count: 6,
      movement: { type: 'fall_down', speed_px_per_sec: 180 },
      spawn: { strategy: 'right_edge_wave', max_active: 3, interval_ms: 800, lane_count: 3 }
    }
  ],
  rules: {
    collisions: [
      {
        id: 'collect_coin',
        source: 'player',
        target: 'coin',
        type: 'overlap',
        effects: [{ type: 'score_add', value: 1 }, { type: 'destroy' }]
      },
      {
        id: 'player_hits_barrier',
        source: 'player',
        target: 'barrier',
        type: 'overlap',
        effects: [{ type: 'damage', value: 1 }, { type: 'destroy' }]
      }
    ]
  },
  objectives: {
    win: { type: 'survive_duration' },
    lose: { type: 'player_health_zero' }
  },
  ui: {
    hud: ['score', 'health', 'timer'],
    restart: true,
    screens: {
      win: { title: 'VICTORY', subtitle: 'Survived the timer' },
      lose: { title: 'DEFEAT', subtitle: 'Health depleted' }
    }
  }
};

const validShooterExample: RawGameDsl = {
  dsl_version: 'game-dsl-v0.1',
  metadata: {
    title: 'Alien Clear',
    description: 'Clear enemies with projectiles before they overwhelm the player.',
    language: 'en'
  },
  game: {
    genre: 'shooter',
    camera: 'top_down',
    difficulty: 'normal',
    target_play_time_sec: 60
  },
  world: {
    width: 960,
    height: 540,
    visual_theme: 'bright garden'
  },
  player: {
    id: 'player',
    label: 'Cat',
    health: 3,
    movement: { type: 'eight_direction', speed_px_per_sec: 260 },
    actions: [{ id: 'fire', type: 'shoot_projectile', cooldown_ms: 300, spawns: 'fish_bolt' }]
  },
  entities: [
    {
      id: 'fish_bolt',
      kind: 'projectile',
      label: 'Fish Bolt',
      damage: 1,
      movement: { type: 'move_right', speed_px_per_sec: 520 }
    },
    {
      id: 'bird',
      kind: 'enemy',
      label: 'Bird Swarm',
      count: 8,
      health: 1,
      movement: { type: 'chase_player', speed_px_per_sec: 120 }
    }
  ],
  rules: {
    collisions: [
      {
        id: 'bolt_hits_bird',
        source: 'fish_bolt',
        target: 'bird',
        type: 'projectile_hit',
        effects: [{ type: 'damage', value: 1 }, { type: 'destroy' }, { type: 'score_add', value: 1 }]
      },
      {
        id: 'bird_hits_player',
        source: 'bird',
        target: 'player',
        type: 'overlap',
        effects: [{ type: 'damage', value: 1 }]
      }
    ]
  },
  objectives: {
    win: { type: 'enemy_cleared', target: 8 },
    lose: { type: 'player_health_zero' }
  },
  ui: {
    hud: ['score', 'health', 'objective'],
    restart: true,
    screens: {
      win: { title: 'VICTORY', subtitle: 'Enemies cleared' },
      lose: { title: 'DEFEAT', subtitle: 'Health depleted' }
    }
  }
};

const validSideScrollingRunAndGunExample: RawGameDsl = {
  dsl_version: 'game-dsl-v0.1',
  metadata: {
    title: 'Frontier Blast',
    description: 'Run, jump, and fire through side-view platform segments while clearing generic enemies.',
    language: 'en'
  },
  game: {
    genre: 'side_scrolling_run_and_gun',
    camera: 'side_view',
    difficulty: 'normal',
    target_play_time_sec: 60
  },
  world: {
    width: 1280,
    height: 540,
    visual_theme: 'generic sci fi frontier',
    coordinateSystem: 'side_view_2d',
    gravity: 1200
  },
  camera: { mode: 'follow_player_x' },
  player: {
    id: 'player',
    label: 'Runner',
    health: 3,
    movement: { type: 'horizontal', speed_px_per_sec: 260 },
    controller: 'run_jump_shoot',
    aiming: { mode: 'multi_direction' },
    actions: [{ id: 'fire', type: 'shoot_projectile', cooldown_ms: 260, spawns: 'pulse_bolt' }],
    visual: {
      assetIntentRef: 'player_red_runner',
      styleRef: 'style_pixel_16',
      facingMode: 'flip_x',
      animationSetRef: 'anim_run_jump_shoot',
      tintIntent: 'red armor',
      silhouetteIntent: 'compact side-view runner'
    }
  },
  entities: [
    { id: 'pulse_bolt', kind: 'projectile', label: 'Pulse Bolt', damage: 1, movement: { type: 'move_right', speed_px_per_sec: 620 } },
    { id: 'drone', kind: 'enemy', label: 'Drone', count: 8, health: 1, movement: { type: 'patrol', speed_px_per_sec: 90 } }
  ],
  projectiles: [{ id: 'pulse_bolt_spec', label: 'Pulse Bolt', damage: 1, speed_px_per_sec: 620 }],
  enemyTypes: [
    {
      id: 'drone_type',
      label: 'Drone',
      health: 1,
      movement: { type: 'patrol', speed_px_per_sec: 90 },
      behaviorRef: 'behavior_ground_patrol',
      visual: {
        assetIntentRef: 'enemy_mech_drone',
        styleRef: 'style_pixel_16',
        facingMode: 'flip_x',
        animationSetRef: 'anim_enemy_patrol'
      },
      colliderRef: 'collider_small_enemy',
      movementRef: 'movement_ground_patrol',
      tags: ['mechanical']
    }
  ],
  level: {
    segments: [
      { id: 'segment_intro', startX: 0, endX: 720 },
      { id: 'segment_bridge', startX: 720, endX: 1280 }
    ],
    terrain: [
      { id: 'ground_intro', kind: 'ground', x: 0, y: 500, width: 1280, height: 40 },
      { id: 'platform_bridge', kind: 'platform', x: 980, y: 380, width: 280, height: 24 }
    ],
    spawns: [
      { id: 'spawn_intro_drone', enemyType: 'drone_type', trigger: 'enter_segment', x: 640, count: 3 },
      { id: 'spawn_bridge_drone', enemyType: 'drone_type', trigger: 'reach_x', x: 1080, count: 5 }
    ]
  },
  scenes: [
    {
      id: 'level_01',
      theme: {
        id: 'snow_base_night',
        style: 'pixel art 16 bit',
        biome: 'snow base',
        faction: 'mechanical patrol',
        timeOfDay: 'night',
        atmosphere: 'cold bright edges',
        paletteIntent: 'blue white red accents',
        terrainMaterialSet: 'terrain_snow_metal',
        propFamily: 'base_outpost',
        lightingIntent: 'moonlit cold lights'
      },
      backgroundLayers: [
        {
          id: 'sky_night',
          role: 'sky',
          assetIntentRef: 'scene_night_sky',
          parallax: 0,
          fixedToCamera: true,
          depth: -40
        },
        {
          id: 'base_far',
          role: 'far',
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
          shape: 'rectangle',
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
          shape: 'rectangle',
          materialRef: 'terrain_snow_metal',
          visualAssetIntentRef: 'tile_snow_metal_platform',
          collision: { enabled: true },
          tags: ['platform']
        }
      ],
      playerSpawn: { x: 120, y: 452 },
      enemyInstances: [{ id: 'enemy_intro_01', archetypeRef: 'drone_type', x: 720, y: 450, spawnRule: 'spawn_intro_drone' }],
      goal: { id: 'goal_exit_01', kind: 'reach', x: 1240, y: 460, visualAssetIntentRef: 'goal_exit_beacon' }
    }
  ],
  pickups: [{ id: 'field_medkit', label: 'Medkit', kind: 'health', x: 720, y: 450 }],
  winLose: { win: 'reach_exit', lose: 'player_health_zero', lives: 3, checkpoints: [0, 720] },
  rules: {
    collisions: [
      {
        id: 'bolt_hits_drone',
        source: 'pulse_bolt',
        target: 'drone',
        type: 'projectile_hit',
        effects: [{ type: 'damage', value: 1 }, { type: 'destroy' }, { type: 'score_add', value: 1 }]
      },
      {
        id: 'drone_hits_player',
        source: 'drone',
        target: 'player',
        type: 'overlap',
        effects: [{ type: 'damage', value: 1 }]
      }
    ]
  },
  objectives: { win: { type: 'reach_exit', target: 1240 }, lose: { type: 'player_health_zero' } },
  ui: {
    hud: ['score', 'health', 'objective'],
    restart: true,
    screens: {
      win: { title: 'VICTORY', subtitle: 'Exit reached' },
      lose: { title: 'DEFEAT', subtitle: 'Lives depleted' }
    }
  }
};

const validExamplesByGenre: Partial<Record<SupportedGameGenre, RawGameDsl>> = {
  collector: validCollectorExample,
  dodger: validDodgerExample,
  shooter: validShooterExample,
  side_scrolling_run_and_gun: validSideScrollingRunAndGunExample
};

export function buildRawDslPromptContext(params: BuildRawDslPromptContextParams): RawDslPromptContext {
  return {
    idea: params.idea,
    language: params.language,
    brief: params.brief,
    ...(params.authorityBundle === undefined
      ? {}
      : {
          canonical_brief_ref: params.authorityBundle.refs.canonicalBrief,
          authority_bundle_ref: authorityBundleRef(params.authorityBundle),
          active_profile_lock_ref: params.authorityBundle.refs.activeProfileLock,
          active_profile_lock: params.authorityBundle.activeProfileLock,
          generation_scope_plan: params.authorityBundle.generationScopePlan,
          raw_dsl_authority: params.authorityBundle.rawDslConsumption
        }),
    selected_contract: selectedContracts[params.brief.genre],
    ...buildRuntimeGenerationContext(params.brief.genre),
    allowed_enums: {
      genres: ['collector', 'dodger', 'shooter', 'side_scrolling_run_and_gun'],
      cameras: ['top_down', 'side_view'],
      difficulties: ['easy', 'normal'],
      languages: ['zh', 'en'],
      movement_types: ['static', 'eight_direction', 'horizontal', 'vertical', 'chase_player', 'move_left', 'move_right', 'fall_down', 'patrol'],
      action_types: ['shoot_projectile', 'collect', 'restart'],
      entity_kinds: ['enemy', 'projectile', 'collectible', 'hazard'],
      collision_types: ['overlap', 'projectile_hit'],
      effect_types: ['damage', 'destroy', 'score_add', 'heal', 'knockback', 'end_game'],
      win_types: ['enemy_cleared', 'target_score', 'survive_duration', 'reach_exit'],
      lose_types: ['player_health_zero', 'time_up', 'none'],
      hud_items: ['score', 'health', 'timer', 'objective'],
      coordinate_systems: ['top_down_2d', 'side_view_2d'],
      camera_modes: ['follow_player_x'],
      player_controllers: ['run_jump_shoot'],
      aiming_modes: ['multi_direction', 'eight_direction'],
      terrain_kinds: ['platform', 'ground', 'slope'],
      spawn_triggers: ['enter_segment', 'reach_x'],
      pickup_kinds: ['health', 'score', 'weapon'],
      scene_background_roles: ['sky', 'far', 'mid', 'near', 'overlay'],
      scene_platform_shapes: ['rectangle', 'slope', 'one_way'],
      scene_goal_kinds: ['reach', 'destroy', 'collect', 'survive'],
      scene_theme_time_of_day: ['day', 'night', 'dawn', 'dusk', 'interior'],
      visual_facing_modes: ['flip_x', 'separate_animations']
    },
    forbidden_terms: ['phaser', 'pixi', 'godot', 'cocos', 'sprite', 'texture', 'physics', 'arcade', 'matter', 'canvas', 'webgl'],
    forbidden_fields: [
      'script',
      'custom_script',
      'code',
      'function',
      'eval',
      'callback',
      'onUpdate',
      'onCreate',
      'expression',
      'projectile_id',
      'runtime_plan',
      'template_params',
      'enemy_waves',
      'waveSource',
      'wave_source',
      'runtime_wave',
      'difficulty_curve',
      'speed_multiplier',
      'spawn_interval_multiplier',
      'ramp_duration_ms',
      'cooldown_sec',
      'spawn_interval_sec',
      'spawn_interval_decrease_per_sec',
      'lifetime_sec',
      'duration_sec'
    ],
    output_json_rule: 'Return one JSON object only. Do not wrap JSON in markdown. Do not include commentary. Match the exact object shape in valid_example.',
    valid_example: validExamplesByGenre[params.brief.genre] ?? validCollectorExample,
    invalid_examples_summary: [
      'Do not include engine names, rendering API names, scripts, callbacks, functions or executable expressions.',
      'All id and string reference fields such as id, spawns, source, action target ids, and enemyType must use ASCII lower_snake_case matching /^[a-z][a-z0-9_]{1,39}$/. Numeric objective targets stay numeric. Use localized names only in title, description, and label fields.',
      'Do not add fields outside the schema. Use cooldown_ms and spawns on player.actions; use movement.speed_px_per_sec, not entity-level speed.',
      'Collision effects only support type and optional value. Do not add target inside effects.',
      'Objectives support type and optional target only. Do not add duration_sec.',
      'Do not output runtime_plan or template_params fields in Raw Game DSL.',
      'For projectile_hit collisions, source and target may reference player, entities, or projectiles specs; player.actions[].spawns must still reference a projectile entity from entities.',
      'For shooter in P0, include one primary projectile entity and one primary enemy entity that form the required fire-hit-clear loop.',
      'For shooter in P0, use enemy_cleared or reachable target_score as win type. Do not use survive_duration for shooter.',
      'If shooter uses target_score instead, target must be less than or equal to the primary enemy projectile_hit score_add value multiplied by the primary enemy count.',
      'For shooter in P0, do not include collectibles or multiple enemy kinds because the current runtime template only consumes one primary projectile and one primary enemy.',
      'Only dodger hazard right_edge_wave and dodger collectible fixed_positions may use spawn. Do not add spawn to collector, shooter, projectile or enemy entities.',
      'For side_scrolling_run_and_gun, use scenes[] to express theme, backgroundLayers, platforms, playerSpawn, enemyInstances, and goal. Scene refs such as scene_night_sky are allowed Raw DSL references, but do not output engine objects or rendering API names.',
      'Scene enemyInstances[].archetypeRef must reference enemyTypes[].id. enemyInstances[].spawnRule must reference level.spawns[].id. Goal entityRef must reference a target allowed by the goal kind.',
      'Do not output a different genre by renaming entities while keeping incompatible mechanics.',
      'Do not invent unsupported mechanics when they cannot be represented by game-dsl-v0.1.'
    ],
    p0_scope: [
      'collector, dodger, shooter, and generic side_scrolling_run_and_gun DSL are supported.',
      'Phaser runtime generation supports collector, dodger, shooter, and generic side_scrolling_run_and_gun templates; side-scrolling runtime facts are derived from DSL into runtime_plan, not emitted directly by the model.',
      'Only engine-agnostic gameplay semantics are allowed.',
      'Shooter template currently supports one player, one projectile type and one enemy type.',
      'Runtime plan execution is currently verified for dodger hazard right_edge_wave, dodger collectible fixed_positions, shooter enemy right_edge_wave, and side_scrolling_run_and_gun level.spawns.',
      'Normalize 魂斗罗, 魂斗罗式, 横版跑枪, 横版射击, run and gun, and contra-like to side_scrolling_run_and_gun without emitting copyrighted names, characters, levels, or assets.'
    ],
    anti_shell_rules: [
      'Do not simulate one genre by renaming another genre.',
      'If genre is shooter, the game must include real fire, projectile or hitscan, enemy hit, enemy clear or score progress.',
      'If genre is side_scrolling_run_and_gun, the DSL must include side_view_2d coordinates, gravity, follow_player_x camera, run_jump_shoot controller, aiming, terrain platforms, and spawn triggers.',
      'Do not output Contra, 魂斗罗, copyrighted character names, copied level names, or copyrighted assets.',
      'If required mechanics cannot be represented, return unsupported instead of inventing code.'
    ],
    composable_mechanics: [
      'Select genre from the base loop, not from skin or wording alone: collector must still collect for score, dodger must still avoid hazards, and shooter must still fire at clearable enemies.',
      'When an idea mixes themes, keep the selected genre objective inside the current P0 template envelope instead of declaring a win or lose type that the template cannot realize.',
      'Use labels, theme and movement to express mixed ideas within the selected template; do not add extra entities to carry scoring, win or lose semantics that the current template will not consume.'
    ],
    spawn_generation_guidance: buildSpawnGenerationGuidance(params.brief.genre),
    difficulty_runtime_guidance: buildDifficultyRuntimeGuidance(params.brief.genre),
    enemy_wave_runtime_guidance: buildEnemyWaveRuntimeGuidance(params.brief.genre)
  };
}

function buildRuntimeGenerationContext(genre: SupportedGameGenre): { runtime_generation_context?: DslGenerationContext } {
  const capability = findRuntimeGenreCapability(normalizedRuntimeGenreForBriefGenre(genre));
  if (!isExecutableGenerationProfile(capability)) {
    return {};
  }

  return {
    runtime_generation_context: {
      normalizedGenre: capability.genre,
      profileVersion: capability.version,
      dslProfile: capability.dslProfile,
      irProfile: capability.irProfile,
      runtimeTemplate: capability.runtimeTemplate,
      supportedCapabilities: [...capability.implementedCapabilities],
      deferredCapabilities: deferredCapabilitiesForRuntimeGenre(capability.genre),
      requiredCapabilities: [...capability.requiredCapabilities],
      schema: selectedContracts[genre]
    }
  };
}

function normalizedRuntimeGenreForBriefGenre(genre: SupportedGameGenre): string {
  if (genre === 'shooter') {
    return 'top_down_shooter';
  }
  if (genre === 'dodger') {
    return 'dodger_collector';
  }
  return genre;
}

function isExecutableGenerationProfile(
  capability: RuntimeGenreCapability | undefined
): capability is RuntimeGenreCapability & Required<Pick<RuntimeGenreCapability, 'dslProfile' | 'irProfile' | 'runtimeTemplate'>> {
  return capability?.status === 'supported' && capability.dslProfile !== undefined && capability.irProfile !== undefined && capability.runtimeTemplate !== undefined;
}

function deferredCapabilitiesForRuntimeGenre(genre: string): string[] {
  if (genre !== 'side_scrolling_run_and_gun') {
    return [];
  }

  return ['bosses', 'weapon_pickups', 'screen_shake', 'audio_event_binding', 'multi_phase_attacks', 'eight_direction_shooting'];
}

function buildEnemyWaveRuntimeGuidance(genre: SupportedGameGenre): string[] {
  if (genre === 'side_scrolling_run_and_gun') {
    return ['Use level.spawns for generic side-view enemy spawn triggers. Do not output shooter enemy_waves or runtime_plan fields.'];
  }

  if (genre !== 'shooter') {
    return ['Do not output shooter enemy wave runtime fields in Raw Game DSL.'];
  }

  return [
    'For shooter, choose a clear primary enemy count, health, movement.speed_px_per_sec, game.difficulty, and target_play_time_sec; the runtime derives the enemy wave pressure from those Raw DSL facts.',
    'Do not output runtime_plan, enemy_waves, waveSource, speed_multiplier, maxActive, intervalMs, or runtime wave fields in Raw Game DSL.'
  ];
}

function buildDifficultyRuntimeGuidance(genre: SupportedGameGenre): string[] {
  if (genre === 'side_scrolling_run_and_gun') {
    return ['Keep game.difficulty equal to the Game Brief; side-view runtime tuning is gated by runtime capabilities and must not be expressed as engine fields.'];
  }

  if (genre !== 'dodger') {
    return ['Keep game.difficulty equal to the Game Brief. Do not output runtime difficulty curves or engine tuning fields.'];
  }

  return [
    'Keep game.difficulty equal to the Game Brief; the runtime derives a dodger difficulty curve from game.difficulty and target_play_time_sec.',
    'easy means a gentler hazard speed and spawn interval curve; normal means hazard speed ramps up and spawn intervals tighten over the run.',
    'Do not output runtime_plan, template_params, difficulty_curve, speed multipliers, spawn interval multipliers, or ramp values in Raw Game DSL.'
  ];
}

function buildSpawnGenerationGuidance(genre: SupportedGameGenre): string[] {
  if (genre === 'side_scrolling_run_and_gun') {
    return [
      'Treat world.width as side-scrolling level length, not viewport width; it may exceed the 960px viewport when the user asks for a scrolling stage.',
      'Use level.spawns for side-view enemy spawn triggers; each spawn references enemyTypes by enemyType.',
      'Do not output entity.spawn for side_scrolling_run_and_gun.',
      'Use level.terrain with platform or ground entries so terrain collision is explicit in the DSL.',
      'Keep level segments, terrain, spawns, pickups, and reach_exit targets inside world.width.'
    ];
  }

  if (genre !== 'dodger') {
    return [
      'Do not output entity.spawn for this genre.',
      'Runtime plan spawn execution is currently verified only for dodger hazard right_edge_wave and dodger collectible fixed_positions.'
    ];
  }

  return [
    'Use entity.spawn only for dodger hazard entities and dodger collectible entities when their entry pattern should be generated by the runtime plan.',
    'For dodger hazards, the only executable spawn strategy is right_edge_wave. Do not output fixed_positions or top_edge_stream for hazards.',
    'For dodger hazard spawn, set max_active between 2 and 4, interval_ms between 600 and 1200, and lane_count between 3 and 4.',
    'The hazard entity count remains the total spawn budget; choose count between 5 and 12 for a short playable run.',
    'For dodger collectibles, the only executable spawn strategy is fixed_positions. Set count between 3 and 10, max_active between 1 and 3, interval_ms between 700 and 1600, and omit lane_count.',
    'fixed_positions means the model chooses fixed slot spawning with count, max_active, and interval_ms; the runtime derives the actual slot coordinates from the world geometry.',
    'Do not put spawn in rules, template_params, projectiles, enemies, collector or shooter games.'
  ];
}
