import { z } from 'zod';

import { GameSemanticModelSchema } from '../semantic/semantic-model.schema.js';

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

const copyrightedRunAndGunTerms = ['contra', '魂斗罗'];

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

const CameraSchema = z.strictObject({
  mode: z.enum(['follow_player_x'])
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
  actions: z.array(ActionSchema).max(6).default([]),
  controller: z.enum(['run_jump_shoot']).optional(),
  aiming: z.strictObject({ mode: z.enum(['multi_direction', 'eight_direction']) }).optional()
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
    type: z.enum(['enemy_cleared', 'target_score', 'survive_duration', 'reach_exit']),
    target: z.number().int().min(1).max(9999).optional()
  }),
  lose: z.strictObject({
    type: z.enum(['player_health_zero', 'time_up', 'none']),
    target: z.number().int().min(1).max(9999).optional()
  })
});

const ProjectileSchema = z.strictObject({
  id: DslIdSchema,
  label: z.string().min(1).max(40),
  damage: z.number().int().min(1).max(20),
  speed_px_per_sec: z.number().int().min(1).max(1200)
});

const EnemyTypeSchema = z.strictObject({
  id: DslIdSchema,
  label: z.string().min(1).max(40),
  health: z.number().int().min(1).max(20),
  movement: MovementSchema
});

const LevelTerrainSchema = z.strictObject({
  id: DslIdSchema,
  kind: z.enum(['platform', 'ground', 'slope']),
  x: z.number().int().min(0).max(20000),
  y: z.number().int().min(0).max(20000),
  width: z.number().int().min(16).max(2000),
  height: z.number().int().min(8).max(400)
});

const LevelSpawnSchema = z.strictObject({
  id: DslIdSchema,
  enemyType: DslIdSchema,
  trigger: z.enum(['enter_segment', 'reach_x']),
  x: z.number().int().min(0).max(20000),
  count: z.number().int().min(1).max(20)
});

const LevelSegmentSchema = z.strictObject({
  id: DslIdSchema,
  startX: z.number().int().min(0).max(20000),
  endX: z.number().int().min(1).max(24000)
});

const LevelSchema = z.strictObject({
  segments: z.array(LevelSegmentSchema).min(1).max(12),
  terrain: z.array(LevelTerrainSchema).min(1).max(80),
  spawns: z.array(LevelSpawnSchema).min(1).max(80)
});

const PickupSchema = z.strictObject({
  id: DslIdSchema,
  label: z.string().min(1).max(40),
  kind: z.enum(['health', 'score', 'weapon']),
  x: z.number().int().min(0).max(20000),
  y: z.number().int().min(0).max(20000)
});

const WinLoseSchema = z.strictObject({
  win: z.enum(['reach_exit', 'enemy_cleared']),
  lose: z.enum(['player_health_zero', 'lives_zero']),
  lives: z.number().int().min(1).max(9).optional(),
  checkpoints: z.array(z.number().int().min(0).max(20000)).min(1).max(12).optional()
});

const UiSchema = z.strictObject({
  hud: z.array(z.enum(['score', 'health', 'timer', 'objective'])).min(1).max(4),
  restart: z.boolean(),
  screens: z.strictObject({
    win: z.strictObject({
      title: z.string().min(1).max(40),
      subtitle: z.string().min(1).max(120)
    }),
    lose: z.strictObject({
      title: z.string().min(1).max(40),
      subtitle: z.string().min(1).max(120)
    })
  })
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
    genre: z.enum(['collector', 'dodger', 'shooter', 'side_scrolling_run_and_gun']),
    camera: z.enum(['top_down', 'side_view']),
    difficulty: z.enum(['easy', 'normal']),
    target_play_time_sec: z.number().int().min(30).max(120)
  }),
  world: z.strictObject({
    width: z.number().int().min(640).max(1280),
    height: z.number().int().min(360).max(720),
    visual_theme: z.string().min(1).max(80),
    coordinateSystem: z.enum(['top_down_2d', 'side_view_2d']).optional(),
    gravity: z.number().int().min(0).max(4000).optional()
  }),
  camera: CameraSchema.optional(),
  player: PlayerSchema,
  entities: z.array(EntitySchema).min(1).max(12),
  semanticModel: GameSemanticModelSchema.optional(),
  projectiles: z.array(ProjectileSchema).min(1).max(8).optional(),
  enemyTypes: z.array(EnemyTypeSchema).min(1).max(12).optional(),
  level: LevelSchema.optional(),
  pickups: z.array(PickupSchema).max(20).optional(),
  winLose: WinLoseSchema.optional(),
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

  if (value.game.genre === 'side_scrolling_run_and_gun') {
    addSideScrollingRunAndGunIssues(value, ctx);
  } else {
    for (const [path, child] of [
      ['camera', value.camera],
      ['projectiles', value.projectiles],
      ['enemyTypes', value.enemyTypes],
      ['level', value.level],
      ['pickups', value.pickups],
      ['winLose', value.winLose]
    ] as const) {
      if (child !== undefined) {
        ctx.addIssue({ code: 'custom', path: [path], message: `${path} is supported only for side_scrolling_run_and_gun` });
      }
    }
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

function addSideScrollingRunAndGunIssues(value: z.infer<typeof RawGameDslSchema>, ctx: z.RefinementCtx): void {
  if (value.game.camera !== 'side_view') {
    ctx.addIssue({ code: 'custom', path: ['game', 'camera'], message: 'side_scrolling_run_and_gun requires side_view camera' });
  }
  if (value.world.coordinateSystem !== 'side_view_2d') {
    ctx.addIssue({ code: 'custom', path: ['world', 'coordinateSystem'], message: 'side_scrolling_run_and_gun requires side_view_2d coordinate system' });
  }
  if (value.world.gravity === undefined || value.world.gravity <= 0) {
    ctx.addIssue({ code: 'custom', path: ['world', 'gravity'], message: 'side_scrolling_run_and_gun requires positive gravity' });
  }
  if (value.camera?.mode !== 'follow_player_x') {
    ctx.addIssue({ code: 'custom', path: ['camera', 'mode'], message: 'side_scrolling_run_and_gun requires follow_player_x camera mode' });
  }
  if (value.player.controller !== 'run_jump_shoot') {
    ctx.addIssue({ code: 'custom', path: ['player', 'controller'], message: 'side_scrolling_run_and_gun requires run_jump_shoot controller' });
  }
  if (value.player.aiming?.mode !== 'multi_direction' && value.player.aiming?.mode !== 'eight_direction') {
    ctx.addIssue({ code: 'custom', path: ['player', 'aiming', 'mode'], message: 'side_scrolling_run_and_gun requires multi_direction or eight_direction aiming' });
  }
  if (value.projectiles === undefined || value.projectiles.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['projectiles'], message: 'side_scrolling_run_and_gun requires projectiles' });
  }
  if (value.enemyTypes === undefined || value.enemyTypes.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['enemyTypes'], message: 'side_scrolling_run_and_gun requires enemyTypes' });
  }
  if (value.level === undefined) {
    ctx.addIssue({ code: 'custom', path: ['level'], message: 'side_scrolling_run_and_gun requires level segments, terrain, and spawns' });
  }
  if (value.winLose === undefined) {
    ctx.addIssue({ code: 'custom', path: ['winLose'], message: 'side_scrolling_run_and_gun requires winLose with checkpoint or lives semantics' });
  }

  const serialized = JSON.stringify(value).toLowerCase();
  for (const term of copyrightedRunAndGunTerms) {
    if (serialized.includes(term)) {
      ctx.addIssue({
        code: 'custom',
        path: ['metadata', 'title'],
        message: `side_scrolling_run_and_gun DSL must not contain copyrighted source term "${term}"`
      });
    }
  }
}
