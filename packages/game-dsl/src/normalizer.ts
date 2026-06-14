import collectorContract from './contracts/collector.contract.json' with { type: 'json' };
import dodgerContract from './contracts/dodger.contract.json' with { type: 'json' };
import shooterContract from './contracts/shooter.contract.json' with { type: 'json' };
import sideScrollingRunAndGunContract from './contracts/side_scrolling_run_and_gun.contract.json' with { type: 'json' };
import { NormalizedGameIrSchema, type NormalizedGameIr } from './schemas/normalized-game-ir-v0.1.schema.js';
import type { RawGameDsl } from './schemas/raw-game-dsl-v0.1.schema.js';
import { buildShooterVisualParams } from './template-visual-params.js';
import { validateRawGameDsl } from './dsl-validator.js';
import { DslValidationError, type ValidateAndNormalizeResult } from './validation.types.js';

const contracts = {
  collector: collectorContract,
  dodger: dodgerContract,
  shooter: shooterContract,
  side_scrolling_run_and_gun: sideScrollingRunAndGunContract
} as const;

const templateIds = {
  collector: 'collector_v1',
  dodger: 'dodger_v1',
  shooter: 'shooter_v1',
  side_scrolling_run_and_gun: 'side_scrolling_run_and_gun.v1'
} as const;

export function validateAndNormalizeRawGameDsl(input: unknown): ValidateAndNormalizeResult {
  const validRaw = validateRawGameDsl(input);

  if (!validRaw.ok) {
    return validRaw;
  }

  const ir = buildNormalizedGameIr(validRaw.value);
  const parsedIr = NormalizedGameIrSchema.safeParse(ir);

  if (!parsedIr.success) {
    return {
      ok: false,
      issues: parsedIr.error.issues.map((issue) => ({
        code: 'INVALID_GAME_SEMANTICS',
        path: issue.path.map(String).join('.') || '<root>',
        message: issue.message
      }))
    };
  }

  return { ok: true, rawDsl: validRaw.value, ir: parsedIr.data };
}

export function normalizeRawGameDsl(input: unknown): NormalizedGameIr {
  const result = validateAndNormalizeRawGameDsl(input);

  if (!result.ok) {
    throw new DslValidationError(result.issues);
  }

  return result.ir;
}

function buildNormalizedGameIr(raw: RawGameDsl) {
  const contract = contracts[raw.game.genre];
  const movement = unique([raw.player.movement.type, ...raw.entities.map((entity) => entity.movement.type)]);
  const collision = unique(raw.rules.collisions.map((rule) => rule.type));
  const actions = unique([...raw.player.actions.map((action) => action.type), ...(raw.ui.restart ? ['restart' as const] : [])]);

  return {
    ir_version: 'game-ir-v0.1',
    source_dsl_version: raw.dsl_version,
    metadata: {
      title: raw.metadata.title,
      language: raw.metadata.language
    },
    game: {
      genre: raw.game.genre,
      camera: raw.game.camera,
      difficulty: raw.game.difficulty
    },
    world: {
      width: raw.world.width,
      height: raw.world.height
    },
    runtime_requirements: {
      dimension: '2d',
      camera: raw.game.camera,
      movement: unique([
        ...movement,
        ...(raw.player.controller === 'run_jump_shoot' ? ['run_jump_controller' as const] : []),
        ...(raw.player.aiming?.mode !== undefined ? [raw.player.aiming.mode] : [])
      ]),
      collision,
      actions,
      objectives: unique([raw.objectives.win.type, raw.objectives.lose.type]),
      capabilities: buildRequiredCapabilities(raw),
      telemetry: true
    },
    runtime_plan: buildRuntimePlan(raw),
    template_params: {
      template_id: templateIds[raw.game.genre],
      params: buildTemplateParams(raw)
    },
    telemetry_contract: {
      required_events_all: contract.required_telemetry_all,
      required_events_any_groups: contract.required_telemetry_any_groups
    },
    qa_plan: {
      mode: 'deterministic',
      seed: 'golden',
      required_events_all: contract.required_telemetry_all,
      required_events_any_groups: contract.required_telemetry_any_groups
    }
  };
}

function buildRuntimePlan(raw: RawGameDsl) {
  return {
    spawn_rules: raw.entities.filter((entity) => entity.spawn !== undefined).map((entity) => ({
      entity_id: entity.id,
      entity_kind: entity.kind,
      strategy: entity.spawn?.strategy ?? 'fixed_positions',
      count: entity.count ?? 1,
      max_active: entity.spawn?.max_active ?? defaultMaxActive(entity.kind),
      interval_ms: entity.spawn?.interval_ms ?? defaultSpawnIntervalMs(entity.kind),
      ...(entity.spawn?.lane_count !== undefined ? { lane_count: entity.spawn.lane_count } : {})
    })),
    ...(raw.game.genre === 'dodger' ? { difficulty_curve: buildDodgerDifficultyCurve(raw) } : {}),
    ...(raw.game.genre === 'shooter' ? { enemy_waves: buildShooterEnemyWaves(raw) } : {})
  };
}

/** Difficulty is model-authored, but runtime multipliers stay deterministic normalizer hints. */
function buildDodgerDifficultyCurve(raw: RawGameDsl) {
  const rampDurationMs = raw.game.target_play_time_sec * 1000;
  const curveByDifficulty = {
    easy: {
      speed_multiplier_start: 0.9,
      speed_multiplier_end: 1,
      spawn_interval_multiplier_start: 1.15,
      spawn_interval_multiplier_end: 1.05
    },
    normal: {
      speed_multiplier_start: 1,
      speed_multiplier_end: 1.25,
      spawn_interval_multiplier_start: 1,
      spawn_interval_multiplier_end: 0.8
    }
  } as const;

  return {
    derived_from: ['game.difficulty', 'game.target_play_time_sec'] as const,
    level: raw.game.difficulty,
    ...curveByDifficulty[raw.game.difficulty],
    ramp_duration_ms: rampDurationMs
  };
}

/** Defaults are normalizer-derived runtime hints, not model-authored DSL facts. */
function defaultMaxActive(kind: RawGameDsl['entities'][number]['kind']): number {
  return kind === 'collectible' ? 3 : 2;
}

function defaultSpawnIntervalMs(kind: RawGameDsl['entities'][number]['kind']): number {
  return kind === 'collectible' ? 1200 : 1000;
}

/** Shooter wave pressure is derived from the primary enemy DSL facts, not model-authored runtime fields. */
function buildShooterEnemyWaves(raw: RawGameDsl) {
  const enemy = raw.entities.find((entity) => entity.kind === 'enemy');
  if (enemy === undefined) {
    return [];
  }

  const count = enemy.count ?? raw.objectives.win.target ?? 6;
  const baseIntervalMs = Math.round((raw.game.target_play_time_sec * 1000) / Math.max(1, count) / 8);
  const difficulty = {
    easy: { maxActive: 2, intervalMultiplier: 1.15, speedMultiplier: 0.95 },
    normal: { maxActive: 3, intervalMultiplier: 0.85, speedMultiplier: 1.15 }
  } as const;
  const tuning = difficulty[raw.game.difficulty];

  return [
    {
      derived_from: [
        'entities.enemy.id',
        'entities.enemy.count',
        'entities.enemy.health',
        'entities.enemy.movement.speed_px_per_sec',
        'game.difficulty',
        'game.target_play_time_sec'
      ] as const,
      entity_id: enemy.id,
      strategy: 'right_edge_wave' as const,
      count,
      max_active: Math.min(count, tuning.maxActive),
      interval_ms: clampInt(Math.round(baseIntervalMs * tuning.intervalMultiplier), 600, 1600),
      speed_multiplier: tuning.speedMultiplier
    }
  ];
}

function buildRequiredCapabilities(raw: RawGameDsl): string[] {
  if (raw.game.genre !== 'side_scrolling_run_and_gun') {
    return [];
  }

  return [...sideScrollingRunAndGunContract.required_runtime_capabilities];
}

function buildTemplateParams(raw: RawGameDsl): Record<string, unknown> {
  const base = {
    world: raw.world,
    player: {
      label: raw.player.label,
      health: raw.player.health ?? 3,
      speedPxPerSec: raw.player.movement.speed_px_per_sec ?? 240,
      startX: Math.round(raw.world.width / 2),
      startY: Math.round(raw.world.height / 2)
    },
    objective: raw.objectives,
    ui: raw.ui
  };

  if (raw.game.genre === 'collector') {
    const collectible = raw.entities.find((entity) => entity.kind === 'collectible');
    const collectCollision = collectible ? findCollision(raw, raw.player.id, collectible.id, 'overlap') : undefined;

    return {
      ...base,
      collectible: {
        label: collectible?.label ?? 'Item',
        count: collectible?.count ?? 8,
        scorePerItem: scoreAddValue(collectCollision) || 1
      },
      objective: {
        targetScore: raw.objectives.win.target ?? collectible?.count ?? 8
      }
    };
  }

  if (raw.game.genre === 'dodger') {
    const hazard = raw.entities.find((entity) => entity.kind === 'hazard');
    const hazardCollision = hazard ? findCollision(raw, raw.player.id, hazard.id, 'overlap') : undefined;
    const collectible = raw.entities.find((entity) => entity.kind === 'collectible');
    const collectCollision = collectible ? findCollision(raw, raw.player.id, collectible.id, 'overlap') : undefined;
    const collectibleScore = scoreAddValue(collectCollision);

    return {
      ...base,
      hazard: {
        label: hazard?.label ?? 'Hazard',
        speedPxPerSec: hazard?.movement.speed_px_per_sec ?? 180,
        spawnIntervalMs: 1000,
        damage: damageValue(hazardCollision) || hazard?.damage || 1
      },
      ...(collectible && collectibleScore > 0
        ? {
            collectible: {
              label: collectible.label,
              count: collectible.count ?? 1,
              scorePerItem: collectibleScore
            }
          }
        : {}),
      objective: {
        surviveDurationMs: (raw.objectives.win.target ?? raw.game.target_play_time_sec) * 1000
      }
    };
  }

  if (raw.game.genre === 'side_scrolling_run_and_gun') {
    return {
      ...base,
      camera: raw.camera,
      projectiles: raw.projectiles,
      enemyTypes: raw.enemyTypes,
      level: raw.level,
      pickups: raw.pickups ?? [],
      winLose: raw.winLose
    };
  }

  const projectile = raw.entities.find((entity) => entity.kind === 'projectile');
  const enemy = raw.entities.find((entity) => entity.kind === 'enemy');
  const hitCollision = projectile && enemy ? findCollision(raw, projectile.id, enemy.id, 'projectile_hit') : undefined;
  const visuals = buildShooterVisualParams(raw);

  return {
    ...base,
    projectile: {
      label: projectile?.label ?? 'Projectile',
      damage: projectile?.damage ?? (damageValue(hitCollision) || 1),
      speedPxPerSec: projectile?.movement.speed_px_per_sec ?? 520,
      visual: visuals.projectile
    },
    enemy: {
      label: enemy?.label ?? 'Enemy',
      health: enemy?.health ?? 1,
      speedPxPerSec: enemy?.movement.speed_px_per_sec ?? 120,
      count: enemy?.count ?? raw.objectives.win.target ?? 6,
      spawnIntervalMs: 800,
      spawnArea: 'right_edge',
      visual: visuals.enemy
    },
    player: { ...base.player, visual: visuals.player },
    scoring: {
      scorePerEnemy: scoreAddValue(hitCollision) || 1
    },
    liveEditRegistry: {
      playerId: 'player_main',
      enemyTypeId: enemy?.id ?? 'enemy',
      projectileId: projectile?.id ?? 'projectile'
    },
    objective:
      raw.objectives.win.type === 'target_score'
        ? { winType: 'target_score', targetScore: raw.objectives.win.target ?? 1 }
        : { winType: 'enemy_cleared', targetCount: raw.objectives.win.target ?? enemy?.count ?? 6 }
  };
}

function unique<T extends string>(values: T[]): T[] {
  return [...new Set(values)];
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function findCollision(raw: RawGameDsl, a: string, b: string, type: RawGameDsl['rules']['collisions'][number]['type']) {
  return raw.rules.collisions.find((collision) => {
    if (collision.type !== type) {
      return false;
    }

    if (type === 'projectile_hit') {
      return collision.source === a && collision.target === b;
    }

    return (collision.source === a && collision.target === b) || (collision.source === b && collision.target === a);
  });
}

function scoreAddValue(collision: RawGameDsl['rules']['collisions'][number] | undefined): number {
  return collision?.effects.find((effect) => effect.type === 'score_add')?.value ?? 0;
}

function damageValue(collision: RawGameDsl['rules']['collisions'][number] | undefined): number {
  return collision?.effects.find((effect) => effect.type === 'damage')?.value ?? 0;
}
