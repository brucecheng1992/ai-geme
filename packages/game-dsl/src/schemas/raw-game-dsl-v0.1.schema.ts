import { z } from 'zod';

import { RAW_DSL_GAME_GENRES, SIDE_SCROLLING_WORLD_BOUNDS } from '../runtime-capabilities.js';
import { GameSemanticModelSchema } from '../semantic/semantic-model.schema.js';

export const RAW_GAME_DSL_V01_DIALECT = 'game-dsl-v0.1' as const;
export const RAW_GAME_DSL_V01_CONTRACT_STATUS = 'legacy' as const;
export const RAW_GAME_DSL_V01_TARGET_PLAY_TIME_MIN_SEC = 30 as const;
export const RAW_GAME_DSL_V01_TARGET_PLAY_TIME_MAX_SEC = 120 as const;

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
  'sprite',
  'texture',
  'physics',
  'arcade',
  'matter',
  'canvas',
  'webgl'
];

const copyrightedRunAndGunTerms = ['contra', '魂斗罗'];
const topDownWorldMaxWidth = 1280;
const sideScrollingRunAndGunViewport = { width: SIDE_SCROLLING_WORLD_BOUNDS.viewportWidth, height: SIDE_SCROLLING_WORLD_BOUNDS.viewportHeight } as const;

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

function findCopyrightedRunAndGunValue(value: unknown, path: Array<string | number> = []): { term: string; path: Array<string | number> } | null {
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    const term = copyrightedRunAndGunTerms.find((candidate) => lower.includes(candidate));
    return term === undefined ? null : { term, path };
  }

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const violation = findCopyrightedRunAndGunValue(item, [...path, index]);
      if (violation) {
        return violation;
      }
    }

    return null;
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const violation = findCopyrightedRunAndGunValue(child, [...path, key]);
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

const SceneRefSchema = z.string().regex(/^[a-z][a-z0-9_.-]{1,79}$/);

const EntityVisualSchema = z.strictObject({
  assetIntentRef: SceneRefSchema,
  styleRef: SceneRefSchema.optional(),
  scale: z.number().min(0.1).max(8).optional(),
  facingMode: z.enum(['flip_x', 'separate_animations']).optional(),
  animationSetRef: SceneRefSchema.optional(),
  tintIntent: z.string().min(1).max(80).optional(),
  silhouetteIntent: z.string().min(1).max(120).optional()
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

const FeedbackCameraShakeSchema = z.strictObject({
  enabled: z.boolean(),
  intensity: z.number().min(0).max(1),
  durationMs: z.number().int().min(0).max(5000)
});

const FeedbackHitFlashSchema = z.strictObject({
  enabled: z.boolean(),
  durationMs: z.number().int().min(0).max(3000),
  flashCount: z.number().int().min(1).max(20).optional()
});

const InvulnerabilityFramesSchema = z.strictObject({
  durationMs: z.number().int().min(0).max(10000),
  flashEnabled: z.boolean()
});

const PlayerSchema = z.strictObject({
  id: DslIdSchema,
  label: z.string().min(1).max(40),
  health: z.number().int().min(1).max(20).optional(),
  movement: MovementSchema,
  actions: z.array(ActionSchema).max(6).default([]),
  controller: z.enum(['run_jump_shoot']).optional(),
  aiming: z.strictObject({ mode: z.enum(['multi_direction', 'eight_direction']) }).optional(),
  invulnerabilityFrames: InvulnerabilityFramesSchema.optional(),
  visual: EntityVisualSchema.optional()
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

const ExplosionEffectSchema = z.strictObject({
  enabled: z.boolean(),
  scale: z.number().min(0.1).max(10),
  durationMs: z.number().int().min(50).max(5000),
  audioEvent: z.enum(['explosion', 'bossDefeated']).optional(),
  cameraShake: FeedbackCameraShakeSchema.optional()
});

const AudioAssetRefSchema = z.string().regex(/^asset:[a-z][a-z0-9_]{1,39}$/);

const AudioEventBindingSchema = z.strictObject({
  assetRef: AudioAssetRefSchema.optional(),
  volume: z.number().min(0).max(1),
  enabled: z.boolean()
});

const AudioEventsSchema = z.strictObject({
  shoot: AudioEventBindingSchema.optional(),
  enemyHit: AudioEventBindingSchema.optional(),
  enemyDefeated: AudioEventBindingSchema.optional(),
  playerHit: AudioEventBindingSchema.optional(),
  pickupCollected: AudioEventBindingSchema.optional(),
  weaponPickup: AudioEventBindingSchema.optional(),
  shieldPickup: AudioEventBindingSchema.optional(),
  bossIntro: AudioEventBindingSchema.optional(),
  bossDefeated: AudioEventBindingSchema.optional(),
  explosion: AudioEventBindingSchema.optional(),
  warning: AudioEventBindingSchema.optional()
});

const AudioSchema = z.strictObject({
  events: AudioEventsSchema
});

const FeedbackSchema = z.strictObject({
  cameraShake: FeedbackCameraShakeSchema.optional(),
  hitFlash: FeedbackHitFlashSchema.optional()
});

const EffectsSchema = z.strictObject({
  explosion: ExplosionEffectSchema.optional()
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
  movement: MovementSchema,
  behaviorRef: SceneRefSchema.optional(),
  visual: EntityVisualSchema.optional(),
  colliderRef: SceneRefSchema.optional(),
  weaponRef: SceneRefSchema.optional(),
  movementRef: SceneRefSchema.optional(),
  tags: z.array(DslIdSchema).max(12).optional()
});

const LevelTerrainSchema = z.strictObject({
  id: DslIdSchema,
  kind: z.enum(['platform', 'ground', 'slope']),
  x: z.number().int().min(0).max(20000),
  y: z.number().int().min(0).max(20000),
  width: z.number().int().min(16).max(SIDE_SCROLLING_WORLD_BOUNDS.maxWorldWidth),
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

const BossAttackPatternSchema = z.enum(['spread_shot', 'charge', 'summon_minions', 'laser_burst', 'ground_slam']);

const BossPhaseSchema = z.strictObject({
  healthThresholdPct: z.number().int().min(1).max(100),
  attacks: z.array(BossAttackPatternSchema).min(1).max(4)
});

const BossSchema = z.strictObject({
  id: DslIdSchema,
  label: z.string().min(1).max(40),
  health: z.number().int().min(1).max(50),
  movement: MovementSchema,
  healthBar: z.strictObject({ enabled: z.boolean() }).optional(),
  phases: z.array(BossPhaseSchema).min(1).max(8),
  intro: z
    .strictObject({
      warningEnabled: z.boolean(),
      warningText: z.string().min(1).max(40).optional(),
      audioEvent: z.enum(['bossIntro', 'warning']).optional()
    })
    .optional(),
  defeat: z
    .strictObject({
      explosionEffect: z.boolean(),
      audioEvent: z.enum(['bossDefeated', 'explosion']).optional()
    })
    .optional()
});

const BossesSchema = z.strictObject({
  items: z.array(BossSchema).min(1).max(4)
});

const WinLoseSchema = z.strictObject({
  win: z.enum(['reach_exit', 'enemy_cleared']),
  lose: z.enum(['player_health_zero', 'lives_zero']),
  lives: z.number().int().min(1).max(9).optional(),
  checkpoints: z.array(z.number().int().min(0).max(20000)).min(1).max(12).optional()
});

const SceneThemeSchema = z.strictObject({
  id: DslIdSchema,
  style: z.string().min(1).max(80),
  biome: z.string().min(1).max(80),
  faction: z.string().min(1).max(80).optional(),
  timeOfDay: z.enum(['day', 'night', 'dawn', 'dusk', 'interior']).optional(),
  weather: z.string().min(1).max(80).optional(),
  atmosphere: z.string().min(1).max(120).optional(),
  paletteIntent: z.string().min(1).max(120).optional(),
  terrainMaterialSet: SceneRefSchema.optional(),
  propFamily: SceneRefSchema.optional(),
  lightingIntent: z.string().min(1).max(120).optional()
});

const BackgroundLayerSchema = z.strictObject({
  id: DslIdSchema,
  role: z.enum(['sky', 'far', 'mid', 'near', 'overlay']),
  assetIntentRef: SceneRefSchema,
  parallax: z.number().min(0).max(1),
  repeatX: z.boolean().optional(),
  fixedToCamera: z.boolean().optional(),
  opacity: z.number().min(0).max(1).optional(),
  depth: z.number().int().min(-1000).max(1000)
});

const ScenePlatformSchema = z.strictObject({
  id: DslIdSchema,
  x: z.number().int().min(0).max(20000),
  y: z.number().int().min(0).max(20000),
  width: z.number().int().min(16).max(SIDE_SCROLLING_WORLD_BOUNDS.maxWorldWidth),
  height: z.number().int().min(8).max(400),
  shape: z.enum(['rectangle', 'slope', 'one_way']),
  materialRef: SceneRefSchema,
  visualAssetIntentRef: SceneRefSchema.optional(),
  collision: z.strictObject({
    enabled: z.boolean(),
    oneWay: z.boolean().optional()
  }),
  tags: z.array(DslIdSchema).max(12).optional()
});

const SceneEntityInstanceSchema = z.strictObject({
  id: DslIdSchema,
  archetypeRef: DslIdSchema,
  x: z.number().int().min(0).max(20000),
  y: z.number().int().min(0).max(20000),
  spawnRule: DslIdSchema.optional()
});

const SceneGoalSchema = z.strictObject({
  id: DslIdSchema,
  kind: z.enum(['reach', 'destroy', 'collect', 'survive']),
  entityRef: DslIdSchema.optional(),
  x: z.number().int().min(0).max(20000).optional(),
  y: z.number().int().min(0).max(20000).optional(),
  visualAssetIntentRef: SceneRefSchema.optional()
});

const SceneSchema = z.strictObject({
  id: DslIdSchema,
  theme: SceneThemeSchema,
  backgroundLayers: z.array(BackgroundLayerSchema).min(1).max(8),
  platforms: z.array(ScenePlatformSchema).min(1).max(80),
  playerSpawn: z.strictObject({
    x: z.number().int().min(0).max(20000),
    y: z.number().int().min(0).max(20000)
  }),
  enemyInstances: z.array(SceneEntityInstanceSchema).max(80),
  goal: SceneGoalSchema
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
  }),
  warningBanner: z.strictObject({
    enabled: z.boolean(),
    text: z.string().min(1).max(40),
    durationMs: z.number().int().min(0).max(5000)
  }).optional()
});

/** Raw DSL 只允许表达引擎无关的玩法语义，不能包含 runtime API 或任意脚本。 */
export const RawGameDslSchema = z.strictObject({
  dsl_version: z.literal(RAW_GAME_DSL_V01_DIALECT),
  metadata: z.strictObject({
    title: z.string().min(1).max(80),
    description: z.string().max(300),
    language: z.enum(['zh', 'en'])
  }),
  game: z.strictObject({
    genre: z.enum(RAW_DSL_GAME_GENRES),
    camera: z.enum(['top_down', 'side_view']),
    difficulty: z.enum(['easy', 'normal']),
    target_play_time_sec: z.number().int().min(RAW_GAME_DSL_V01_TARGET_PLAY_TIME_MIN_SEC).max(RAW_GAME_DSL_V01_TARGET_PLAY_TIME_MAX_SEC)
  }),
  world: z.strictObject({
    width: z.number().int().min(640).max(SIDE_SCROLLING_WORLD_BOUNDS.maxWorldWidth),
    height: z.number().int().min(360).max(720),
    visual_theme: z.string().min(1).max(80),
    coordinateSystem: z.enum(['top_down_2d', 'side_view_2d']).optional(),
    gravity: z.number().int().min(0).max(4000).optional()
  }),
  camera: CameraSchema.optional(),
  player: PlayerSchema,
  feedback: FeedbackSchema.optional(),
  audio: AudioSchema.optional(),
  effects: EffectsSchema.optional(),
  entities: z.array(EntitySchema).min(1).max(12),
  semanticModel: GameSemanticModelSchema.optional(),
  projectiles: z.array(ProjectileSchema).min(1).max(8).optional(),
  enemyTypes: z.array(EnemyTypeSchema).min(1).max(12).optional(),
  level: LevelSchema.optional(),
  scenes: z.array(SceneSchema).min(1).max(8).optional(),
  pickups: z.array(PickupSchema).max(20).optional(),
  bosses: BossesSchema.optional(),
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
    if (value.world.width > topDownWorldMaxWidth) {
      ctx.addIssue({
        code: 'custom',
        path: ['world', 'width'],
        message: `non-side-scrolling runtime worlds must stay at or below ${topDownWorldMaxWidth}`
      });
    }

    for (const [path, child] of [
      ['camera', value.camera],
      ['projectiles', value.projectiles],
      ['enemyTypes', value.enemyTypes],
      ['level', value.level],
      ['scenes', value.scenes],
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
  if (value.world.width <= sideScrollingRunAndGunViewport.width) {
    ctx.addIssue({
      code: 'custom',
      path: ['world', 'width'],
      message: `side_scrolling_run_and_gun requires world.width greater than ${sideScrollingRunAndGunViewport.width} viewport width`
    });
  }
  if (value.world.height < sideScrollingRunAndGunViewport.height) {
    ctx.addIssue({
      code: 'custom',
      path: ['world', 'height'],
      message: `side_scrolling_run_and_gun requires world.height at least ${sideScrollingRunAndGunViewport.height} viewport height`
    });
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
  if ((value.player.movement.speed_px_per_sec ?? 0) <= 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['player', 'movement', 'speed_px_per_sec'],
      message: 'side_scrolling_run_and_gun requires positive player horizontal speed'
    });
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

  addSideScrollingRunAndGunCombatIssues(value, ctx);
  addSideScrollingRunAndGunLevelIssues(value, ctx);
  addSideScrollingRunAndGunSceneIssues(value, ctx);
  addSideScrollingRunAndGunWinLoseIssues(value, ctx);

  const copyrightedSourceReference = findCopyrightedRunAndGunValue(value);
  if (copyrightedSourceReference !== null) {
    ctx.addIssue({
      code: 'custom',
      path: copyrightedSourceReference.path,
      message: `side_scrolling_run_and_gun DSL must not contain copyrighted source term "${copyrightedSourceReference.term}"`
    });
  }
}

function addSideScrollingRunAndGunCombatIssues(value: z.infer<typeof RawGameDslSchema>, ctx: z.RefinementCtx): void {
  const fireAction = value.player.actions.find((action) => action.type === 'shoot_projectile');
  const firedProjectile = value.entities.find((entity) => entity.kind === 'projectile' && entity.id === fireAction?.spawns);

  if (fireAction !== undefined && (firedProjectile?.movement.speed_px_per_sec ?? 0) <= 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['player', 'actions'],
      message: 'side_scrolling_run_and_gun requires fired projectile entity speed'
    });
  }

  for (const [index, entity] of value.entities.entries()) {
    if (entity.kind === 'enemy' && entity.health === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['entities', index, 'health'],
        message: 'side_scrolling_run_and_gun enemy entities require health'
      });
    }
  }
}

function addSideScrollingRunAndGunLevelIssues(value: z.infer<typeof RawGameDslSchema>, ctx: z.RefinementCtx): void {
  const level = value.level;
  if (level === undefined) {
    return;
  }

  if (!level.terrain.some((terrain) => terrain.kind === 'platform' || terrain.kind === 'ground')) {
    ctx.addIssue({
      code: 'custom',
      path: ['level', 'terrain'],
      message: 'side_scrolling_run_and_gun requires at least one ground or platform terrain'
    });
  }

  for (const [index, segment] of level.segments.entries()) {
    if (segment.endX <= segment.startX) {
      ctx.addIssue({
        code: 'custom',
        path: ['level', 'segments', index, 'endX'],
        message: 'side_scrolling_run_and_gun level segment must end after start'
      });
    }
    if (segment.startX > value.world.width || segment.endX > value.world.width) {
      ctx.addIssue({
        code: 'custom',
        path: ['level', 'segments', index, 'endX'],
        message: 'side_scrolling_run_and_gun level segment must stay within world width'
      });
    }
  }

  for (const [index, terrain] of level.terrain.entries()) {
    if (terrain.x + terrain.width > value.world.width || terrain.y + terrain.height > value.world.height) {
      ctx.addIssue({
        code: 'custom',
        path: ['level', 'terrain', index],
        message: 'side_scrolling_run_and_gun terrain must stay inside world bounds'
      });
    }
  }

  for (const [index, spawn] of level.spawns.entries()) {
    if (spawn.x > value.world.width) {
      ctx.addIssue({
        code: 'custom',
        path: ['level', 'spawns', index, 'x'],
        message: 'side_scrolling_run_and_gun spawn x must stay inside world width'
      });
    }
  }

  for (const [index, pickup] of (value.pickups ?? []).entries()) {
    if (pickup.x > value.world.width || pickup.y > value.world.height) {
      ctx.addIssue({
        code: 'custom',
        path: ['pickups', index],
        message: 'side_scrolling_run_and_gun pickup must stay inside world bounds'
      });
    }
  }
}

function addSideScrollingRunAndGunSceneIssues(value: z.infer<typeof RawGameDslSchema>, ctx: z.RefinementCtx): void {
  const scenes = value.scenes;
  if (scenes === undefined) {
    return;
  }

  for (const [sceneIndex, scene] of scenes.entries()) {
    addPointWithinWorld(scene.playerSpawn, value.world, ['scenes', sceneIndex, 'playerSpawn'], ctx, 'scene player spawn must stay inside world bounds');

    for (const [platformIndex, platform] of scene.platforms.entries()) {
      if (platform.x + platform.width > value.world.width || platform.y + platform.height > value.world.height) {
        ctx.addIssue({
          code: 'custom',
          path: ['scenes', sceneIndex, 'platforms', platformIndex],
          message: 'scene platform geometry must stay inside world bounds'
        });
      }
    }

    for (const [instanceIndex, instance] of scene.enemyInstances.entries()) {
      addPointWithinWorld(instance, value.world, ['scenes', sceneIndex, 'enemyInstances', instanceIndex], ctx, 'scene enemy instance must stay inside world bounds');
    }

    if (scene.goal.kind === 'reach' && (scene.goal.x === undefined || scene.goal.y === undefined)) {
      ctx.addIssue({
        code: 'custom',
        path: ['scenes', sceneIndex, 'goal'],
        message: 'reach scene goal requires x and y coordinates'
      });
    }
    if (scene.goal.x !== undefined && scene.goal.y !== undefined) {
      addPointWithinWorld({ x: scene.goal.x, y: scene.goal.y }, value.world, ['scenes', sceneIndex, 'goal'], ctx, 'scene goal must stay inside world bounds');
    }
  }
}

function addPointWithinWorld(
  point: { x: number; y: number },
  world: { width: number; height: number },
  path: Array<string | number>,
  ctx: z.RefinementCtx,
  message: string
): void {
  if (point.x > world.width || point.y > world.height) {
    ctx.addIssue({
      code: 'custom',
      path,
      message
    });
  }
}

function addSideScrollingRunAndGunWinLoseIssues(value: z.infer<typeof RawGameDslSchema>, ctx: z.RefinementCtx): void {
  const allowedWinTypes = new Set(['reach_exit', 'enemy_cleared']);

  if (!allowedWinTypes.has(value.objectives.win.type)) {
    ctx.addIssue({
      code: 'custom',
      path: ['objectives', 'win', 'type'],
      message: 'side_scrolling_run_and_gun supports only reach_exit or enemy_cleared win objectives'
    });
  }

  if (value.objectives.win.type === 'reach_exit') {
    if (value.objectives.win.target === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['objectives', 'win', 'target'],
        message: 'side_scrolling_run_and_gun reach_exit objective requires target'
      });
    } else if (value.objectives.win.target > value.world.width) {
      ctx.addIssue({
        code: 'custom',
        path: ['objectives', 'win', 'target'],
        message: 'side_scrolling_run_and_gun reach_exit target must stay inside world width'
      });
    }
  }

  const winLose = value.winLose;
  if (winLose === undefined) {
    return;
  }

  if (winLose.win !== value.objectives.win.type) {
    ctx.addIssue({
      code: 'custom',
      path: ['winLose', 'win'],
      message: 'side_scrolling_run_and_gun winLose.win must match objectives.win.type'
    });
  }

  if (winLose.lives === undefined && winLose.checkpoints === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['winLose'],
      message: 'side_scrolling_run_and_gun requires winLose.lives or checkpoints'
    });
  }

  for (const [index, checkpoint] of (winLose.checkpoints ?? []).entries()) {
    if (checkpoint > value.world.width) {
      ctx.addIssue({
        code: 'custom',
        path: ['winLose', 'checkpoints', index],
        message: 'side_scrolling_run_and_gun checkpoint must stay inside world width'
      });
    }
  }
}
