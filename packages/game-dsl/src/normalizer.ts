import phaserCapabilities from '../../runtime-adapters/phaser/src/phaser-adapter-v0.1.capabilities.json' with { type: 'json' };
import collectorContract from './contracts/collector.contract.json' with { type: 'json' };
import dodgerContract from './contracts/dodger.contract.json' with { type: 'json' };
import shooterContract from './contracts/shooter.contract.json' with { type: 'json' };
import { NormalizedGameIrSchema, type NormalizedGameIr } from './schemas/normalized-game-ir-v0.1.schema.js';
import type { RawGameDsl } from './schemas/raw-game-dsl-v0.1.schema.js';
import { validateRawGameDsl } from './dsl-validator.js';
import { DslValidationError, type DslValidationIssue, type ValidateAndNormalizeResult } from './validation.types.js';

type RuntimeRequirements = {
  movement: string[];
  collision: string[];
  actions: string[];
  objectives: string[];
};

const contracts = {
  collector: collectorContract,
  dodger: dodgerContract,
  shooter: shooterContract
} as const;

const templateIds = {
  collector: 'collector_v1',
  dodger: 'dodger_v1',
  shooter: 'shooter_v1'
} as const;

export function validateAndNormalizeRawGameDsl(input: unknown): ValidateAndNormalizeResult {
  const validRaw = validateRawGameDsl(input);

  if (!validRaw.ok) {
    return validRaw;
  }

  const ir = buildNormalizedGameIr(validRaw.value);
  const runtimeIssues = validateRuntimeRequirements(ir.runtime_requirements);

  if (runtimeIssues.length > 0) {
    return { ok: false, issues: runtimeIssues };
  }

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
      movement,
      collision,
      actions,
      objectives: unique([raw.objectives.win.type, raw.objectives.lose.type]),
      telemetry: true
    },
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

function validateRuntimeRequirements(requirements: RuntimeRequirements): DslValidationIssue[] {
  const supports = phaserCapabilities.supports;

  return [
    ...unsupported('runtime_requirements.movement', requirements.movement, supports.movement),
    ...unsupported('runtime_requirements.collision', requirements.collision, supports.collision),
    ...unsupported('runtime_requirements.actions', requirements.actions, supports.actions),
    ...unsupported('runtime_requirements.objectives', requirements.objectives, supports.objectives)
  ];
}

function unsupported(path: string, values: string[], supported: string[]): DslValidationIssue[] {
  return values
    .filter((value) => !supported.includes(value))
    .map((value) => ({
      code: 'RUNTIME_CAPABILITY_MISMATCH',
      path,
      message: `Runtime does not support "${value}"`
    }));
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
    objective: raw.objectives
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

    return {
      ...base,
      hazard: {
        label: hazard?.label ?? 'Hazard',
        speedPxPerSec: hazard?.movement.speed_px_per_sec ?? 180,
        spawnIntervalMs: 1000,
        damage: damageValue(hazardCollision) || hazard?.damage || 1
      },
      objective: {
        surviveDurationMs: (raw.objectives.win.target ?? raw.game.target_play_time_sec) * 1000
      }
    };
  }

  const projectile = raw.entities.find((entity) => entity.kind === 'projectile');
  const enemy = raw.entities.find((entity) => entity.kind === 'enemy');
  const hitCollision = projectile && enemy ? findCollision(raw, projectile.id, enemy.id, 'projectile_hit') : undefined;

  return {
    ...base,
    projectile: {
      label: projectile?.label ?? 'Projectile',
      damage: projectile?.damage ?? (damageValue(hitCollision) || 1),
      speedPxPerSec: projectile?.movement.speed_px_per_sec ?? 520
    },
    enemy: {
      label: enemy?.label ?? 'Enemy',
      health: enemy?.health ?? 1,
      speedPxPerSec: enemy?.movement.speed_px_per_sec ?? 120,
      count: enemy?.count ?? raw.objectives.win.target ?? 6,
      spawnIntervalMs: 800,
      spawnArea: 'right_edge'
    },
    scoring: {
      scorePerEnemy: scoreAddValue(hitCollision) || 1
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
