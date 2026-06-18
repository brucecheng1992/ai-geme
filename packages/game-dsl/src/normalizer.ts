import collectorContract from './contracts/collector.contract.json' with { type: 'json' };
import dodgerContract from './contracts/dodger.contract.json' with { type: 'json' };
import shooterContract from './contracts/shooter.contract.json' with { type: 'json' };
import sideScrollingRunAndGunContract from './contracts/side_scrolling_run_and_gun.contract.json' with { type: 'json' };
import { NormalizedGameIrSchema, type NormalizedGameIr } from './schemas/normalized-game-ir-v0.1.schema.js';
import type { RawGameDsl } from './schemas/raw-game-dsl-v0.1.schema.js';
import { buildGameSemanticModel } from './semantic/semantic-model-derivation.js';
import { buildShooterVisualParams } from './template-visual-params.js';
import { validateRawGameDsl } from './dsl-validator.js';
import { findRuntimeGenreCapability, type RuntimeTemplateManifestId } from './runtime-capabilities.js';
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

const runtimeGenreByRawGenre = {
  collector: undefined,
  dodger: 'dodger_collector',
  shooter: 'top_down_shooter',
  side_scrolling_run_and_gun: 'side_scrolling_run_and_gun'
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
    semanticModel: buildGameSemanticModel(raw),
    template_params: {
      template_id: templateIdForRawGenre(raw.game.genre),
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
    ...(raw.game.genre === 'shooter' ? { enemy_waves: buildShooterEnemyWaves(raw) } : {}),
    ...(raw.game.genre === 'side_scrolling_run_and_gun' ? { side_scrolling: buildSideScrollingRunAndGunPlan(raw) } : {})
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

/** Side-scrolling IR turns validated Raw DSL facts into a deterministic runtime plan. */
function buildSideScrollingRunAndGunPlan(raw: RawGameDsl) {
  const level = raw.level;
  const fireAction = raw.player.actions.find((action) => action.type === 'shoot_projectile');
  const projectileEntity = raw.entities.find((entity) => entity.kind === 'projectile' && entity.id === fireAction?.spawns);
  const projectileSpec = raw.projectiles?.find((projectile) => projectile.label === projectileEntity?.label) ?? raw.projectiles?.[0];
  const enemyProjectileSpec = selectEnemyProjectileSpec(raw);
  const platformForSpawn = selectPlayerSpawnPlatform(level?.terrain ?? [], raw.world.height);
  const playerSpawn = {
    x: Math.min(120, Math.max(0, raw.world.width - 64)),
    y: Math.max(0, platformForSpawn.y - 48)
  };
  const projectileDamage = projectileEntity?.damage ?? projectileSpec?.damage ?? 1;
  const projectileSpeed = projectileEntity?.movement.speed_px_per_sec ?? projectileSpec?.speed_px_per_sec ?? 1;

  return {
    scene: {
      viewport: { width: 960, height: 540 },
      world: {
        width: raw.world.width,
        height: raw.world.height,
        gravityY: raw.world.gravity ?? 1
      }
    },
    camera: {
      mode: 'side_follow' as const,
      followTarget: 'player' as const,
      bounds: {
        x: 0 as const,
        y: 0 as const,
        width: raw.world.width,
        height: raw.world.height
      }
    },
    physics: {
      mode: 'gravity_platformer' as const,
      colliders: [
        ['player', 'platforms'],
        ['enemies', 'platforms'],
        ['projectiles', 'platforms']
      ] as const,
      overlaps: [
        ['playerProjectiles', 'enemies'],
        ['player', 'enemies'],
        ['player', 'pickups']
      ] as const
    },
    player: {
      entityId: raw.player.id,
      spawn: playerSpawn,
      speedPxPerSec: raw.player.movement.speed_px_per_sec ?? 1,
      jumpVelocity: -540,
      health: raw.player.health ?? 3,
      lives: raw.winLose?.lives ?? 1,
      fireCooldownMs: fireAction?.cooldown_ms ?? 260,
      projectileEntityId: projectileEntity?.id ?? fireAction?.spawns ?? 'projectile',
      projectileSpeedPxPerSec: projectileSpeed,
      projectileDamage
    },
    platforms: (level?.terrain ?? []).map((terrain) => ({
      id: terrain.id,
      kind: terrain.kind,
      x: terrain.x,
      y: terrain.y,
      width: terrain.width,
      height: terrain.height
    })),
    enemyDefinitions: (raw.enemyTypes ?? []).map((enemyType) => ({
      id: enemyType.id,
      label: enemyType.label,
      health: enemyType.health,
      movement: {
        type: enemyType.movement.type,
        speedPxPerSec: enemyType.movement.speed_px_per_sec ?? 0
      },
      firing: {
        projectileEntityId: enemyProjectileSpec?.id ?? projectileEntity?.id ?? fireAction?.spawns ?? 'projectile',
        cooldownMs: 1400,
        speedPxPerSec: enemyProjectileSpec?.speed_px_per_sec ?? Math.max(180, Math.round(projectileSpeed * 0.6)),
        damage: enemyProjectileSpec?.damage ?? Math.max(1, projectileDamage),
        rangePx: 520
      }
    })),
    waves: (level?.spawns ?? []).map((spawn) => ({
      id: spawn.id,
      enemyTypeId: spawn.enemyType,
      trigger: spawn.trigger,
      triggerX: spawn.x,
      spawnX: spawn.x,
      count: spawn.count
    })),
    pickups: (raw.pickups ?? []).map((pickup) => ({
      id: pickup.id,
      kind: pickup.kind,
      x: pickup.x,
      y: pickup.y
    })),
    winCondition:
      raw.objectives.win.type === 'reach_exit'
        ? { kind: 'reach_exit' as const, targetX: raw.objectives.win.target ?? raw.world.width }
        : { kind: 'enemy_cleared' as const, targetCount: raw.objectives.win.target ?? totalSideScrollingEnemyCount(raw) },
    telemetry: {
      profile: 'side_scrolling_run_and_gun_smoke' as const
    }
  };
}

function selectPlayerSpawnPlatform(
  terrain: NonNullable<RawGameDsl['level']>['terrain'],
  worldHeight: number
): NonNullable<RawGameDsl['level']>['terrain'][number] {
  const platforms = terrain
    .filter((item) => item.kind === 'ground' || item.kind === 'platform')
    .sort((a, b) => a.x - b.x || a.y - b.y);

  return platforms[0] ?? { id: 'ground', kind: 'ground', x: 0, y: Math.max(48, worldHeight - 40), width: 960, height: 40 };
}

function totalSideScrollingEnemyCount(raw: RawGameDsl): number {
  const spawnCount = raw.level?.spawns.reduce((sum, spawn) => sum + spawn.count, 0) ?? 0;
  return Math.max(1, spawnCount);
}

function selectEnemyProjectileSpec(raw: RawGameDsl): NonNullable<RawGameDsl['projectiles']>[number] | undefined {
  const enemyProjectileRefs = new Set(
    raw.rules.collisions
      .filter((collision) => collision.type === 'projectile_hit' && collision.target === raw.player.id)
      .map((collision) => collision.source)
  );

  return raw.projectiles?.find((projectile) => enemyProjectileRefs.has(projectile.id));
}

function buildRequiredCapabilities(raw: RawGameDsl): string[] {
  if (raw.game.genre !== 'side_scrolling_run_and_gun') {
    return [];
  }

  return [...(findRuntimeGenreCapability('side_scrolling_run_and_gun')?.requiredCapabilities ?? sideScrollingRunAndGunContract.required_runtime_capabilities)];
}

function templateIdForRawGenre(genre: RawGameDsl['game']['genre']): RuntimeTemplateManifestId {
  const runtimeGenre = runtimeGenreByRawGenre[genre];
  const templateId = runtimeGenre === undefined ? undefined : findRuntimeGenreCapability(runtimeGenre)?.runtimeTemplateManifestId;
  return templateId ?? templateIds[genre];
}

function buildTemplateParams(raw: RawGameDsl): Record<string, unknown> {
  const base = {
    world: raw.world,
    player: {
      sourceEntityId: raw.player.id,
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
        ...(collectible === undefined ? {} : { sourceEntityId: collectible.id }),
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
        ...(hazard === undefined ? {} : { sourceEntityId: hazard.id }),
        label: hazard?.label ?? 'Hazard',
        speedPxPerSec: hazard?.movement.speed_px_per_sec ?? 180,
        spawnIntervalMs: 1000,
        damage: damageValue(hazardCollision) || hazard?.damage || 1
      },
      ...(collectible && collectibleScore > 0
        ? {
            collectible: {
              sourceEntityId: collectible.id,
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
    const projectile = raw.entities.find((entity) => entity.kind === 'projectile');
    const enemy = raw.entities.find((entity) => entity.kind === 'enemy');
    const pickup = raw.pickups?.[0];

    return {
      style: { visualTheme: raw.world.visual_theme },
      player: {
        sourceEntityId: raw.player.id,
        label: raw.player.label
      },
      assetLabels: {
        ...(enemy ? { enemy: { sourceEntityId: enemy.id, label: enemy.label } } : {}),
        ...(projectile ? { projectile: { sourceEntityId: projectile.id, label: projectile.label } } : {}),
        ...(pickup ? { pickup: { sourceEntityId: pickup.id, label: pickup.label } } : {})
      },
      ui: raw.ui
    };
  }

  const projectile = raw.entities.find((entity) => entity.kind === 'projectile');
  const enemy = raw.entities.find((entity) => entity.kind === 'enemy');
  const hitCollision = projectile && enemy ? findCollision(raw, projectile.id, enemy.id, 'projectile_hit') : undefined;
  const visuals = buildShooterVisualParams(raw);

  return {
    ...base,
    projectile: {
      ...(projectile === undefined ? {} : { sourceEntityId: projectile.id }),
      label: projectile?.label ?? 'Projectile',
      damage: projectile?.damage ?? (damageValue(hitCollision) || 1),
      speedPxPerSec: projectile?.movement.speed_px_per_sec ?? 520,
      visual: visuals.projectile
    },
    enemy: {
      ...(enemy === undefined ? {} : { sourceEntityId: enemy.id }),
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
      projectileId: projectile?.id ?? 'projectile',
      waveId: enemy === undefined ? 'enemy_wave' : `${enemy.id}_wave`
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
