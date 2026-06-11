import { z } from 'zod';
import collectorContract from '../contracts/collector.contract.json' with { type: 'json' };
import dodgerContract from '../contracts/dodger.contract.json' with { type: 'json' };
import shooterContract from '../contracts/shooter.contract.json' with { type: 'json' };

const TelemetryEventNameSchema = z.enum([
  'game.ready',
  'game.started',
  'input.received',
  'player.moved',
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
  }
} as const;

const RuntimeRequirementsSchema = z.strictObject({
  dimension: z.literal('2d'),
  camera: z.literal('top_down'),
  movement: z.array(z.string()).min(1),
  collision: z.array(z.enum(['overlap', 'projectile_hit'])).min(1),
  actions: z.array(z.enum(['shoot_projectile', 'collect', 'restart'])).min(1),
  objectives: z.array(z.enum(['target_score', 'enemy_cleared', 'survive_duration', 'player_health_zero', 'time_up', 'none'])).min(1),
  telemetry: z.literal(true)
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
    .default([])
});

const TemplateParamsSchema = z.strictObject({
  template_id: z.enum(['collector_v1', 'dodger_v1', 'shooter_v1']),
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
    genre: z.enum(['collector', 'dodger', 'shooter']),
    camera: z.literal('top_down'),
    difficulty: z.enum(['easy', 'normal'])
  }),
  world: z.strictObject({
    width: z.number().int().min(640).max(1280),
    height: z.number().int().min(360).max(720)
  }),
  runtime_requirements: RuntimeRequirementsSchema,
  runtime_plan: RuntimePlanSchema,
  template_params: TemplateParamsSchema,
  telemetry_contract: TelemetryContractSchema,
  qa_plan: QaPlanSchema
}).superRefine((value, ctx) => {
  const expectedTemplateId = `${value.game.genre}_v1`;
  if (value.template_params.template_id !== expectedTemplateId) {
    ctx.addIssue({
      code: 'custom',
      path: ['template_params', 'template_id'],
      message: `template_id must match genre: expected ${expectedTemplateId}`
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
