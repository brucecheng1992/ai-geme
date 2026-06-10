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
      'For shooter in P0, include one primary projectile entity and one primary enemy entity that form the required fire-hit-clear loop.',
      'If shooter uses target_score instead, target must be less than or equal to the sum of every scoring collision score_add value multiplied by its target entity count.',
      'For shooter in P0, do not include collectibles or multiple enemy kinds because the current runtime template only consumes one primary projectile and one primary enemy.',
      'Do not output a different genre by renaming entities while keeping incompatible mechanics.',
      'Do not invent unsupported mechanics when they cannot be represented by game-dsl-v0.1.'
    ],
    p0_scope: [
      'Only collector, dodger and shooter are supported.',
      'Only top_down camera is supported.',
      'Only engine-agnostic gameplay semantics are allowed.',
      'Shooter template currently supports one player, one projectile type and one enemy type.'
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
    ]
  };
}
