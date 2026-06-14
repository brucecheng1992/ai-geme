import collectorContract from '../../../../packages/game-dsl/src/contracts/collector.contract.json' with { type: 'json' };
import dodgerContract from '../../../../packages/game-dsl/src/contracts/dodger.contract.json' with { type: 'json' };
import shooterContract from '../../../../packages/game-dsl/src/contracts/shooter.contract.json' with { type: 'json' };
import type { RawGameDsl } from '../../../../packages/game-dsl/src/index.js';
import type { BuildRawDslPromptContextParams, RawDslPromptContext, SupportedGameGenre } from './prompt-context.types.js';

const selectedContracts: Record<SupportedGameGenre, unknown> = {
  collector: collectorContract,
  dodger: dodgerContract,
  shooter: shooterContract
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
    restart: true
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
    restart: true
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
    restart: true
  }
};

const validExamplesByGenre: Partial<Record<SupportedGameGenre, RawGameDsl>> = {
  collector: validCollectorExample,
  dodger: validDodgerExample,
  shooter: validShooterExample
};

export function buildRawDslPromptContext(params: BuildRawDslPromptContextParams): RawDslPromptContext {
  return {
    idea: params.idea,
    language: params.language,
    brief: params.brief,
    selected_contract: selectedContracts[params.brief.genre],
    allowed_enums: {
      genres: ['collector', 'dodger', 'shooter'],
      cameras: ['top_down'],
      difficulties: ['easy', 'normal'],
      languages: ['zh', 'en'],
      movement_types: ['static', 'eight_direction', 'horizontal', 'vertical', 'chase_player', 'move_left', 'move_right', 'fall_down', 'patrol'],
      action_types: ['shoot_projectile', 'collect', 'restart'],
      entity_kinds: ['enemy', 'projectile', 'collectible', 'hazard'],
      collision_types: ['overlap', 'projectile_hit'],
      effect_types: ['damage', 'destroy', 'score_add', 'heal', 'knockback', 'end_game'],
      win_types: ['enemy_cleared', 'target_score', 'survive_duration'],
      lose_types: ['player_health_zero', 'time_up', 'none'],
      hud_items: ['score', 'health', 'timer', 'objective']
    },
    forbidden_terms: ['phaser', 'pixi', 'godot', 'cocos', 'scene', 'sprite', 'texture', 'physics', 'arcade', 'matter', 'canvas', 'webgl'],
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
      'Do not add fields outside the schema. Use cooldown_ms and spawns on player.actions; use movement.speed_px_per_sec, not entity-level speed.',
      'Collision effects only support type and optional value. Do not add target inside effects.',
      'Objectives support type and optional target only. Do not add duration_sec.',
      'Do not output runtime_plan or template_params fields in Raw Game DSL.',
      'For shooter in P0, include one primary projectile entity and one primary enemy entity that form the required fire-hit-clear loop.',
      'For shooter in P0, use enemy_cleared or reachable target_score as win type. Do not use survive_duration for shooter.',
      'If shooter uses target_score instead, target must be less than or equal to the primary enemy projectile_hit score_add value multiplied by the primary enemy count.',
      'For shooter in P0, do not include collectibles or multiple enemy kinds because the current runtime template only consumes one primary projectile and one primary enemy.',
      'Only dodger hazard right_edge_wave and dodger collectible fixed_positions may use spawn. Do not add spawn to collector, shooter, projectile or enemy entities.',
      'Do not output a different genre by renaming entities while keeping incompatible mechanics.',
      'Do not invent unsupported mechanics when they cannot be represented by game-dsl-v0.1.'
    ],
    p0_scope: [
      'Only collector, dodger and shooter are supported.',
      'Only top_down camera is supported.',
      'Only engine-agnostic gameplay semantics are allowed.',
      'Shooter template currently supports one player, one projectile type and one enemy type.',
      'Runtime plan spawn execution is currently verified for dodger hazard right_edge_wave, dodger collectible fixed_positions, and shooter enemy right_edge_wave.'
    ],
    anti_shell_rules: [
      'Do not simulate one genre by renaming another genre.',
      'If genre is shooter, the game must include real fire, projectile or hitscan, enemy hit, enemy clear or score progress.',
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

function buildEnemyWaveRuntimeGuidance(genre: SupportedGameGenre): string[] {
  if (genre !== 'shooter') {
    return ['Do not output shooter enemy wave runtime fields in Raw Game DSL.'];
  }

  return [
    'For shooter, choose a clear primary enemy count, health, movement.speed_px_per_sec, game.difficulty, and target_play_time_sec; the runtime derives the enemy wave pressure from those Raw DSL facts.',
    'Do not output runtime_plan, enemy_waves, waveSource, speed_multiplier, maxActive, intervalMs, or runtime wave fields in Raw Game DSL.'
  ];
}

function buildDifficultyRuntimeGuidance(genre: SupportedGameGenre): string[] {
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
