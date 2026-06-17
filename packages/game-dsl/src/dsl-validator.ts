import type { z } from 'zod';

import { RawGameDslSchema, type RawGameDsl } from './schemas/raw-game-dsl-v0.1.schema.js';
import type { GameplayRole } from './semantic/semantic-model.schema.js';
import { validateMechanicContract, validateObjectiveReachability } from './mechanic-contract.validator.js';
import type { DslValidationIssue, DslValidationResult } from './validation.types.js';

const forbiddenCodeKeys = new Set(['script', 'custom_script', 'code', 'function', 'eval', 'callback', 'onUpdate', 'onCreate', 'expression']);
const numericPaths = new Set([
  'game.target_play_time_sec',
  'world.width',
  'world.height',
  'player.health',
  'player.invulnerabilityFrames.durationMs',
  'player.movement.speed_px_per_sec',
  'player.actions.cooldown_ms',
  'entities.count',
  'entities.health',
  'entities.damage',
  'entities.movement.speed_px_per_sec',
  'entities.spawn.max_active',
  'entities.spawn.interval_ms',
  'entities.spawn.lane_count',
  'rules.collisions.effects.value',
  'objectives.win.target',
  'objectives.lose.target',
  'world.gravity',
  'projectiles.damage',
  'projectiles.speed_px_per_sec',
  'enemyTypes.health',
  'enemyTypes.movement.speed_px_per_sec',
  'level.segments.startX',
  'level.segments.endX',
  'level.terrain.x',
  'level.terrain.y',
  'level.terrain.width',
  'level.terrain.height',
  'level.spawns.x',
  'level.spawns.count',
  'pickups.x',
  'pickups.y',
  'bosses.items.health',
  'bosses.items.movement.speed_px_per_sec',
  'bosses.items.phases.healthThresholdPct',
  'winLose.lives',
  'winLose.checkpoints',
  'feedback.cameraShake.intensity',
  'feedback.cameraShake.durationMs',
  'feedback.hitFlash.durationMs',
  'feedback.hitFlash.flashCount',
  'effects.explosion.scale',
  'effects.explosion.durationMs',
  'effects.explosion.cameraShake.intensity',
  'effects.explosion.cameraShake.durationMs',
  'ui.warningBanner.durationMs'
]);

export function validateRawGameDsl(input: unknown): DslValidationResult<RawGameDsl> {
  const parsed = RawGameDslSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, issues: parsed.error.issues.map(toSchemaIssue) };
  }

  const issues = [
    ...validateUniqueIds(parsed.data),
    ...validateReferences(parsed.data),
    ...validateSemanticModelReferences(parsed.data),
    ...validateMechanicContract(parsed.data),
    ...validateObjectiveReachability(parsed.data)
  ];

  return issues.length === 0 ? { ok: true, value: parsed.data } : { ok: false, issues };
}

function validateSemanticModelReferences(raw: RawGameDsl): DslValidationIssue[] {
  const model = raw.semanticModel;
  if (model === undefined) {
    return [];
  }

  const rolesById = new Map<string, GameplayRole>([
    [raw.player.id, 'player'],
    ...raw.entities.map((entity) => [entity.id, roleForEntityKind(entity.kind)] as [string, GameplayRole]),
    ...(raw.bosses?.items ?? []).map((boss) => [boss.id, 'enemy'] as [string, GameplayRole])
  ]);
  const issues: DslValidationIssue[] = [];

  for (const [index, profile] of model.entities.entries()) {
    const expectedRole = rolesById.get(profile.entityId);
    if (expectedRole === undefined) {
      issues.push({
        code: 'UNRESOLVED_REFERENCE',
        path: `semanticModel.entities.${index}.entityId`,
        message: `Unknown semantic profile entity id "${profile.entityId}"`
      });
      continue;
    }
    if (profile.role !== expectedRole) {
      issues.push({
        code: 'INVALID_GAME_SEMANTICS',
        path: `semanticModel.entities.${index}.role`,
        message: `Semantic profile role for "${profile.entityId}" must be "${expectedRole}".`
      });
    }
  }

  return issues;
}

function roleForEntityKind(kind: RawGameDsl['entities'][number]['kind']): GameplayRole {
  if (kind === 'collectible') {
    return 'collectible';
  }
  return kind;
}

function toSchemaIssue(issue: z.core.$ZodIssue): DslValidationIssue {
  const path = issue.path.map(String).join('.') || '<root>';
  const keyIssue = issue as z.core.$ZodIssue & { keys?: unknown };

  if (issue.message.includes('forbidden term')) {
    return { code: 'ENGINE_LEAKAGE_DETECTED', path, message: issue.message };
  }

  if (
    issue.message.includes('forbidden DSL field') ||
    (Array.isArray(keyIssue.keys) && keyIssue.keys.some((key) => typeof key === 'string' && forbiddenCodeKeys.has(key)))
  ) {
    return { code: 'ARBITRARY_CODE_NOT_ALLOWED', path, message: issue.message };
  }

  if (isNumericSchemaPath(path)) {
    return { code: 'NUMERIC_RANGE_INVALID', path, message: issue.message };
  }

  if (path.endsWith('.id') || path.endsWith('.source') || path.endsWith('.target') || path.endsWith('.spawns')) {
    return { code: 'INVALID_ID_FORMAT', path, message: issue.message };
  }

  return { code: 'SCHEMA_VALIDATION_FAILED', path, message: issue.message };
}

function isNumericSchemaPath(path: string): boolean {
  const normalizedPath = path.replace(/\.\d+/g, '');
  return numericPaths.has(normalizedPath) || /^audio\.events\.[^.]+\.volume$/.test(normalizedPath);
}

function validateUniqueIds(raw: RawGameDsl): DslValidationIssue[] {
  const seen = new Set<string>();
  const issues: DslValidationIssue[] = [];

  for (const [path, id] of collectIds(raw)) {
    if (seen.has(id)) {
      issues.push({ code: 'DUPLICATE_ID', path, message: `Duplicate id "${id}"` });
      continue;
    }

    seen.add(id);
  }

  return issues;
}

function collectIds(raw: RawGameDsl): Array<[string, string]> {
  return [
    ['player.id', raw.player.id],
    ...raw.player.actions.map((action, index) => [`player.actions.${index}.id`, action.id] as [string, string]),
    ...raw.entities.map((entity, index) => [`entities.${index}.id`, entity.id] as [string, string]),
    ...(raw.projectiles ?? []).map((projectile, index) => [`projectiles.${index}.id`, projectile.id] as [string, string]),
    ...(raw.enemyTypes ?? []).map((enemyType, index) => [`enemyTypes.${index}.id`, enemyType.id] as [string, string]),
    ...(raw.level?.segments ?? []).map((segment, index) => [`level.segments.${index}.id`, segment.id] as [string, string]),
    ...(raw.level?.terrain ?? []).map((terrain, index) => [`level.terrain.${index}.id`, terrain.id] as [string, string]),
    ...(raw.level?.spawns ?? []).map((spawn, index) => [`level.spawns.${index}.id`, spawn.id] as [string, string]),
    ...(raw.pickups ?? []).map((pickup, index) => [`pickups.${index}.id`, pickup.id] as [string, string]),
    ...(raw.bosses?.items ?? []).map((boss, index) => [`bosses.items.${index}.id`, boss.id] as [string, string]),
    ...raw.rules.collisions.map((collision, index) => [`rules.collisions.${index}.id`, collision.id] as [string, string])
  ];
}

function validateReferences(raw: RawGameDsl): DslValidationIssue[] {
  const ids = new Set([raw.player.id, ...raw.entities.map((entity) => entity.id)]);
  const issues: DslValidationIssue[] = [];

  for (const [index, action] of raw.player.actions.entries()) {
    if (action.spawns !== undefined && !ids.has(action.spawns)) {
      issues.push({
        code: 'UNRESOLVED_REFERENCE',
        path: `player.actions.${index}.spawns`,
        message: `Unknown spawned entity id "${action.spawns}"`
      });
    }
  }

  for (const [index, collision] of raw.rules.collisions.entries()) {
    for (const key of ['source', 'target'] as const) {
      if (!ids.has(collision[key])) {
        issues.push({
          code: 'UNRESOLVED_REFERENCE',
          path: `rules.collisions.${index}.${key}`,
          message: `Unknown collision ${key} id "${collision[key]}"`
        });
      }
    }
  }

  const enemyTypeIds = new Set((raw.enemyTypes ?? []).map((enemyType) => enemyType.id));
  for (const [index, spawn] of (raw.level?.spawns ?? []).entries()) {
    if (!enemyTypeIds.has(spawn.enemyType)) {
      issues.push({
        code: 'UNRESOLVED_REFERENCE',
        path: `level.spawns.${index}.enemyType`,
        message: `Unknown enemyType id "${spawn.enemyType}"`
      });
    }
  }

  return issues;
}
