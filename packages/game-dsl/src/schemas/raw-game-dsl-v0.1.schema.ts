import { z } from 'zod';

export const DslIdSchema = z.string().regex(/^[a-z][a-z0-9_]{1,39}$/);

const forbiddenKeys = new Set([
  'script',
  'custom_script',
  'code',
  'function',
  'eval',
  'callback',
  'onUpdate',
  'onCreate',
  'expression'
]);

const forbiddenTerms = [
  'phaser',
  'pixi',
  'godot',
  'cocos',
  'scene',
  'sprite',
  'texture',
  'physics',
  'arcade',
  'matter',
  'canvas',
  'webgl'
];

function findForbiddenDslValue(value: unknown, path: Array<string | number> = []): string | null {
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    const term = forbiddenTerms.find((candidate) => lower.includes(candidate));

    return term ? `${path.join('.') || '<root>'} contains forbidden term "${term}"` : null;
  }

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const violation = findForbiddenDslValue(item, [...path, index]);
      if (violation) {
        return violation;
      }
    }

    return null;
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (forbiddenKeys.has(key)) {
        return `${[...path, key].join('.')} is a forbidden DSL field`;
      }

      const violation = findForbiddenDslValue(child, [...path, key]);
      if (violation) {
        return violation;
      }
    }
  }

  return null;
}

const MovementSchema = z.strictObject({
  type: z.enum([
    'static',
    'eight_direction',
    'horizontal',
    'vertical',
    'chase_player',
    'move_left',
    'move_right',
    'fall_down',
    'patrol'
  ]),
  speed_px_per_sec: z.number().int().min(0).max(1000).optional()
});

/** Entity spawn 是模型可生成的引擎无关入场语义，不允许表达脚本或坐标运算。 */
const SpawnSchema = z.strictObject({
  strategy: z.enum(['fixed_positions', 'right_edge_wave', 'top_edge_stream']),
  max_active: z.number().int().min(1).max(12).optional(),
  interval_ms: z.number().int().min(200).max(10000).optional(),
  lane_count: z.number().int().min(1).max(6).optional()
});

const ActionSchema = z.strictObject({
  id: DslIdSchema,
  type: z.enum(['shoot_projectile', 'collect', 'restart']),
  cooldown_ms: z.number().int().min(0).max(5000).optional(),
  spawns: DslIdSchema.optional()
});

const PlayerSchema = z.strictObject({
  id: DslIdSchema,
  label: z.string().min(1).max(40),
  health: z.number().int().min(1).max(20).optional(),
  movement: MovementSchema,
  actions: z.array(ActionSchema).max(6).default([])
});

const EntitySchema = z.strictObject({
  id: DslIdSchema,
  kind: z.enum(['enemy', 'projectile', 'collectible', 'hazard']),
  label: z.string().min(1).max(40),
  count: z.number().int().min(1).max(50).optional(),
  health: z.number().int().min(1).max(20).optional(),
  damage: z.number().int().min(0).max(20).optional(),
  movement: MovementSchema,
  spawn: SpawnSchema.optional()
});

const EffectSchema = z.strictObject({
  type: z.enum(['damage', 'destroy', 'score_add', 'heal', 'knockback', 'end_game']),
  value: z.number().int().min(0).max(1000).optional()
});

const CollisionRuleSchema = z.strictObject({
  id: DslIdSchema,
  source: DslIdSchema,
  target: DslIdSchema,
  type: z.enum(['overlap', 'projectile_hit']),
  effects: z.array(EffectSchema).min(1).max(6)
});

const ObjectivesSchema = z.strictObject({
  win: z.strictObject({
    type: z.enum(['enemy_cleared', 'target_score', 'survive_duration']),
    target: z.number().int().min(1).max(9999).optional()
  }),
  lose: z.strictObject({
    type: z.enum(['player_health_zero', 'time_up', 'none']),
    target: z.number().int().min(1).max(9999).optional()
  })
});

const UiSchema = z.strictObject({
  hud: z.array(z.enum(['score', 'health', 'timer', 'objective'])).min(1).max(4),
  restart: z.boolean()
});

/** Raw DSL 只允许表达引擎无关的玩法语义，不能包含 runtime API 或任意脚本。 */
export const RawGameDslSchema = z.strictObject({
  dsl_version: z.literal('game-dsl-v0.1'),
  metadata: z.strictObject({
    title: z.string().min(1).max(80),
    description: z.string().max(300),
    language: z.enum(['zh', 'en'])
  }),
  game: z.strictObject({
    genre: z.enum(['collector', 'dodger', 'shooter']),
    camera: z.literal('top_down'),
    difficulty: z.enum(['easy', 'normal']),
    target_play_time_sec: z.number().int().min(30).max(120)
  }),
  world: z.strictObject({
    width: z.number().int().min(640).max(1280),
    height: z.number().int().min(360).max(720),
    visual_theme: z.string().min(1).max(80)
  }),
  player: PlayerSchema,
  entities: z.array(EntitySchema).min(1).max(12),
  rules: z.strictObject({
    collisions: z.array(CollisionRuleSchema).min(1).max(12)
  }),
  objectives: ObjectivesSchema,
  ui: UiSchema
}).superRefine((value, ctx) => {
  const violation = findForbiddenDslValue(value);
  if (violation) {
    ctx.addIssue({
      code: 'custom',
      message: violation
    });
  }

  for (const [index, entity] of value.entities.entries()) {
    if (value.game.genre !== 'dodger' && entity.spawn !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['entities', index, 'spawn'],
        message: 'entity.spawn is currently supported only for dodger runtime_plan v0'
      });
    }
  }
});

export type RawGameDsl = z.infer<typeof RawGameDslSchema>;
