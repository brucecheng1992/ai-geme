import { z } from 'zod';
import collectorContract from '../contracts/collector.contract.json' with { type: 'json' };
import dodgerContract from '../contracts/dodger.contract.json' with { type: 'json' };
import shooterContract from '../contracts/shooter.contract.json' with { type: 'json' };
import sideScrollingRunAndGunContract from '../contracts/side_scrolling_run_and_gun.contract.json' with { type: 'json' };
import { GameSemanticModelSchema } from '../semantic/semantic-model.schema.js';

const TelemetryEventNameSchema = z.enum([
  'game.ready',
  'game.started',
  'input.received',
  'player.moved',
  'player.jumped',
  'player.fired',
  'projectile.spawned',
  'collision.detected',
  'enemy.fired',
  'enemy.hit',
  'enemy.cleared',
  'item.spawned',
  'item.collected',
  'hazard.spawned',
  'player.damaged',
  'checkpoint.reached',
  'level.segment.completed',
  'score.changed',
  'survival_time.changed',
  'objective.completed',
  'game.won',
  'game.lost',
  'game.restarted'
]);

const telemetryRequirementsByGenre = {
  collector: {
    required_events_all: collectorContract.required_telemetry_all,
    required_events_any_groups: collectorContract.required_telemetry_any_groups
  },
  dodger: {
    required_events_all: dodgerContract.required_telemetry_all,
    required_events_any_groups: dodgerContract.required_telemetry_any_groups
  },
  shooter: {
    required_events_all: shooterContract.required_telemetry_all,
    required_events_any_groups: shooterContract.required_telemetry_any_groups
  },
  side_scrolling_run_and_gun: {
    required_events_all: sideScrollingRunAndGunContract.required_telemetry_all,
    required_events_any_groups: sideScrollingRunAndGunContract.required_telemetry_any_groups
  }
} as const;

const RuntimeRequirementsSchema = z.strictObject({
  dimension: z.literal('2d'),
  camera: z.enum(['top_down', 'side_view']),
  movement: z.array(z.string()).min(1),
  collision: z.array(z.enum(['overlap', 'projectile_hit'])).min(1),
  actions: z.array(z.enum(['shoot_projectile', 'collect', 'restart'])).min(1),
  objectives: z.array(z.enum(['target_score', 'enemy_cleared', 'survive_duration', 'player_health_zero', 'time_up', 'none', 'reach_exit'])).min(1),
  capabilities: z.array(z.string().min(1)).default([]),
  telemetry: z.literal(true)
});

const SideScrollingRuntimePlanSchema = z.strictObject({
  /** The first playable slice has a fixed viewport while world bounds come from validated DSL. */
  scene: z.strictObject({
    viewport: z.strictObject({
      width: z.literal(960),
      height: z.literal(540)
    }),
    world: z.strictObject({
      width: z.number().int().min(961).max(1280),
      height: z.number().int().min(540).max(720),
      gravityY: z.number().int().min(1).max(4000)
    })
  }),
  camera: z.strictObject({
    mode: z.literal('side_follow'),
    followTarget: z.literal('player'),
    bounds: z.strictObject({
      x: z.literal(0),
      y: z.literal(0),
      width: z.number().int().min(961).max(1280),
      height: z.number().int().min(540).max(720)
    })
  }),
  physics: z.strictObject({
    mode: z.literal('gravity_platformer'),
    colliders: z.array(z.tuple([z.enum(['player', 'enemies', 'projectiles']), z.literal('platforms')])).min(2),
    overlaps: z.array(z.tuple([z.enum(['playerProjectiles', 'player']), z.enum(['enemies', 'pickups'])])).min(1)
  }),
  player: z.strictObject({
    entityId: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
    spawn: z.strictObject({
      x: z.number().int().min(0).max(1280),
      y: z.number().int().min(0).max(720)
    }),
    speedPxPerSec: z.number().int().min(1).max(1000),
    jumpVelocity: z.number().int().max(-1).min(-1200),
    health: z.number().int().min(1).max(20),
    lives: z.number().int().min(1).max(9),
    fireCooldownMs: z.number().int().min(0).max(5000),
    projectileEntityId: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
    projectileSpeedPxPerSec: z.number().int().min(1).max(1200),
    projectileDamage: z.number().int().min(1).max(20)
  }),
  platforms: z.array(
    z.strictObject({
      id: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
      kind: z.enum(['platform', 'ground', 'slope']),
      x: z.number().int().min(0).max(20000),
      y: z.number().int().min(0).max(20000),
      width: z.number().int().min(16).max(2000),
      height: z.number().int().min(8).max(400)
    })
  ).min(1),
  enemyDefinitions: z.array(
    z.strictObject({
      id: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
      label: z.string().min(1).max(40),
      health: z.number().int().min(1).max(20),
      movement: z.strictObject({
        type: z.enum(['static', 'horizontal', 'patrol', 'chase_player', 'move_left', 'move_right']),
        speedPxPerSec: z.number().int().min(0).max(1000)
      }),
      firing: z.strictObject({
        projectileEntityId: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
        cooldownMs: z.number().int().min(0).max(5000),
        speedPxPerSec: z.number().int().min(1).max(1200),
        damage: z.number().int().min(1).max(20),
        rangePx: z.number().int().min(1).max(2000)
      })
    })
  ).min(1),
  waves: z.array(
    z.strictObject({
      id: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
      enemyTypeId: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
      trigger: z.enum(['enter_segment', 'reach_x']),
      triggerX: z.number().int().min(0).max(1280),
      spawnX: z.number().int().min(0).max(1280),
      count: z.number().int().min(1).max(20)
    })
  ).min(1),
  pickups: z.array(
    z.strictObject({
      id: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
      kind: z.enum(['health', 'score', 'weapon']),
      x: z.number().int().min(0).max(1280),
      y: z.number().int().min(0).max(720)
    })
  ).default([]),
  winCondition: z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('reach_exit'),
      targetX: z.number().int().min(1).max(1280)
    }),
    z.strictObject({
      kind: z.literal('enemy_cleared'),
      targetCount: z.number().int().min(1).max(9999)
    })
  ]),
  telemetry: z.strictObject({
    profile: z.literal('side_scrolling_run_and_gun_smoke')
  })
});

const RuntimePlanSchema = z.strictObject({
  /** Spawn rules are DSL-authored world entry semantics preserved for runtime interpreters. */
  spawn_rules: z.array(
    z.strictObject({
      entity_id: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
      entity_kind: z.enum(['enemy', 'projectile', 'collectible', 'hazard']),
      strategy: z.enum(['fixed_positions', 'right_edge_wave', 'top_edge_stream']),
      count: z.number().int().min(1).max(50),
      max_active: z.number().int().min(1).max(12),
      interval_ms: z.number().int().min(200).max(10000),
      lane_count: z.number().int().min(1).max(6).optional()
    })
  ).default([]),
  /** Difficulty curves are normalizer-derived runtime hints from model-authored game fields. */
  difficulty_curve: z
    .strictObject({
      derived_from: z.tuple([z.literal('game.difficulty'), z.literal('game.target_play_time_sec')]),
      level: z.enum(['easy', 'normal']),
      speed_multiplier_start: z.number().min(0.5).max(2),
      speed_multiplier_end: z.number().min(0.5).max(2),
      spawn_interval_multiplier_start: z.number().min(0.5).max(2),
      spawn_interval_multiplier_end: z.number().min(0.5).max(2),
      ramp_duration_ms: z.number().int().min(1000).max(120000)
    })
    .optional(),
  /** Enemy waves are normalizer-derived shooter pressure plans from the primary enemy DSL facts. */
  enemy_waves: z
    .array(
      z.strictObject({
        derived_from: z.tuple([
          z.literal('entities.enemy.id'),
          z.literal('entities.enemy.count'),
          z.literal('entities.enemy.health'),
          z.literal('entities.enemy.movement.speed_px_per_sec'),
          z.literal('game.difficulty'),
          z.literal('game.target_play_time_sec')
        ]),
        entity_id: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
        strategy: z.literal('right_edge_wave'),
        count: z.number().int().min(1).max(50),
        max_active: z.number().int().min(1).max(8),
        interval_ms: z.number().int().min(200).max(10000),
        speed_multiplier: z.number().min(0.5).max(2)
      })
    )
    .max(1)
    .default([]),
  /** Side-scrolling run-and-gun runtime plan is derived from validated DSL facts. */
  side_scrolling: SideScrollingRuntimePlanSchema.optional()
});

const TemplateParamsSchema = z.strictObject({
  template_id: z.enum(['collector_v1', 'dodger_v1', 'shooter_v1', 'side_scrolling_run_and_gun.v1']),
  params: z.record(z.string(), z.unknown())
});

const TelemetryContractSchema = z.strictObject({
  required_events_all: z.array(TelemetryEventNameSchema).min(1),
  required_events_any_groups: z.array(z.array(TelemetryEventNameSchema).min(2)).default([])
});

const QaPlanSchema = z.strictObject({
  mode: z.literal('deterministic'),
  seed: z.literal('golden'),
  required_events_all: z.array(TelemetryEventNameSchema).min(1),
  required_events_any_groups: z.array(z.array(TelemetryEventNameSchema).min(2)).default([])
});

/** Normalized IR 是通过校验后的可信编译输入，模板只读取这里的参数。 */
export const NormalizedGameIrSchema = z.strictObject({
  ir_version: z.literal('game-ir-v0.1'),
  source_dsl_version: z.literal('game-dsl-v0.1'),
  metadata: z.strictObject({
    title: z.string().min(1).max(80),
    language: z.enum(['zh', 'en'])
  }),
  game: z.strictObject({
    genre: z.enum(['collector', 'dodger', 'shooter', 'side_scrolling_run_and_gun']),
    camera: z.enum(['top_down', 'side_view']),
    difficulty: z.enum(['easy', 'normal'])
  }),
  world: z.strictObject({
    width: z.number().int().min(640).max(1280),
    height: z.number().int().min(360).max(720)
  }),
  runtime_requirements: RuntimeRequirementsSchema,
  runtime_plan: RuntimePlanSchema,
  semanticModel: GameSemanticModelSchema.optional(),
  template_params: TemplateParamsSchema,
  telemetry_contract: TelemetryContractSchema,
  qa_plan: QaPlanSchema
}).superRefine((value, ctx) => {
  const expectedTemplateIdByGenre = {
    collector: 'collector_v1',
    dodger: 'dodger_v1',
    shooter: 'shooter_v1',
    side_scrolling_run_and_gun: 'side_scrolling_run_and_gun.v1'
  } as const;
  if (value.template_params.template_id !== expectedTemplateIdByGenre[value.game.genre]) {
    ctx.addIssue({
      code: 'custom',
      path: ['template_params', 'template_id'],
      message: `template_id must match genre: expected ${expectedTemplateIdByGenre[value.game.genre]}`
    });
  }

  if (value.game.genre !== 'dodger' && value.runtime_plan.spawn_rules.length > 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['runtime_plan', 'spawn_rules'],
      message: 'runtime_plan.spawn_rules is currently supported only for dodger runtime_plan v0'
    });
  }

  if (value.game.genre !== 'dodger' && value.runtime_plan.difficulty_curve !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['runtime_plan', 'difficulty_curve'],
      message: 'runtime_plan.difficulty_curve is currently supported only for dodger runtime_plan v0'
    });
  }

  if (value.game.genre !== 'shooter' && value.runtime_plan.enemy_waves.length > 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['runtime_plan', 'enemy_waves'],
      message: 'runtime_plan.enemy_waves is currently supported only for shooter runtime_plan v0'
    });
  }

  if (value.game.genre === 'side_scrolling_run_and_gun' && value.runtime_plan.side_scrolling === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['runtime_plan', 'side_scrolling'],
      message: 'side_scrolling_run_and_gun IR requires runtime_plan.side_scrolling'
    });
  }

  if (value.game.genre !== 'side_scrolling_run_and_gun' && value.runtime_plan.side_scrolling !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['runtime_plan', 'side_scrolling'],
      message: 'runtime_plan.side_scrolling is supported only for side_scrolling_run_and_gun'
    });
  }

  const sideScrolling = value.runtime_plan.side_scrolling;
  if (sideScrolling !== undefined) {
    const worldWidth = value.world.width;
    const worldHeight = value.world.height;

    if (sideScrolling.scene.world.width !== value.world.width || sideScrolling.camera.bounds.width !== value.world.width) {
      ctx.addIssue({
        code: 'custom',
        path: ['runtime_plan', 'side_scrolling', 'scene', 'world', 'width'],
        message: 'side_scrolling runtime plan width must match IR world width'
      });
    }
    if (sideScrolling.scene.world.height !== value.world.height || sideScrolling.camera.bounds.height !== value.world.height) {
      ctx.addIssue({
        code: 'custom',
        path: ['runtime_plan', 'side_scrolling', 'scene', 'world', 'height'],
        message: 'side_scrolling runtime plan height must match IR world height'
      });
    }
    if (sideScrolling.player.spawn.x > worldWidth || sideScrolling.player.spawn.y > worldHeight) {
      ctx.addIssue({
        code: 'custom',
        path: ['runtime_plan', 'side_scrolling', 'player', 'spawn'],
        message: 'side_scrolling player spawn must stay inside IR world bounds'
      });
    }
    for (const [index, platform] of sideScrolling.platforms.entries()) {
      if (platform.x + platform.width > worldWidth || platform.y + platform.height > worldHeight) {
        ctx.addIssue({
          code: 'custom',
          path: ['runtime_plan', 'side_scrolling', 'platforms', index],
          message: 'side_scrolling platform must stay inside IR world bounds'
        });
      }
    }
    for (const [index, wave] of sideScrolling.waves.entries()) {
      if (wave.triggerX > worldWidth || wave.spawnX > worldWidth) {
        ctx.addIssue({
          code: 'custom',
          path: ['runtime_plan', 'side_scrolling', 'waves', index],
          message: 'side_scrolling wave trigger and spawn x must stay inside IR world width'
        });
      }
    }
    for (const [index, pickup] of sideScrolling.pickups.entries()) {
      if (pickup.x > worldWidth || pickup.y > worldHeight) {
        ctx.addIssue({
          code: 'custom',
          path: ['runtime_plan', 'side_scrolling', 'pickups', index],
          message: 'side_scrolling pickup must stay inside IR world bounds'
        });
      }
    }
    if (sideScrolling.winCondition.kind === 'reach_exit' && sideScrolling.winCondition.targetX > worldWidth) {
      ctx.addIssue({
        code: 'custom',
        path: ['runtime_plan', 'side_scrolling', 'winCondition', 'targetX'],
        message: 'side_scrolling reach_exit target must stay inside IR world width'
      });
    }
  }

  const telemetryAll = JSON.stringify(value.telemetry_contract.required_events_all);
  const qaAll = JSON.stringify(value.qa_plan.required_events_all);
  const telemetryAny = JSON.stringify(value.telemetry_contract.required_events_any_groups);
  const qaAny = JSON.stringify(value.qa_plan.required_events_any_groups);

  if (telemetryAll !== qaAll || telemetryAny !== qaAny) {
    ctx.addIssue({
      code: 'custom',
      path: ['qa_plan'],
      message: 'qa_plan required events must match telemetry_contract'
    });
  }

  const expectedTelemetry = telemetryRequirementsByGenre[value.game.genre];
  const expectedAll = JSON.stringify(expectedTelemetry.required_events_all);
  const expectedAny = JSON.stringify(expectedTelemetry.required_events_any_groups);

  if (telemetryAll !== expectedAll || telemetryAny !== expectedAny) {
    ctx.addIssue({
      code: 'custom',
      path: ['telemetry_contract'],
      message: `telemetry_contract must match ${value.game.genre} mechanic contract`
    });
  }
});

export type NormalizedGameIr = z.infer<typeof NormalizedGameIrSchema>;
