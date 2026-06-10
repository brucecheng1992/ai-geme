import type { z } from 'zod';

import { RawGameDslSchema, type RawGameDsl } from './schemas/raw-game-dsl-v0.1.schema.js';
import { validateMechanicContract, validateObjectiveReachability } from './mechanic-contract.validator.js';
import type { DslValidationIssue, DslValidationResult } from './validation.types.js';

const forbiddenCodeKeys = new Set(['script', 'custom_script', 'code', 'function', 'eval', 'callback', 'onUpdate', 'onCreate', 'expression']);
const numericPaths = new Set([
  'game.target_play_time_sec',
  'world.width',
  'world.height',
  'player.health',
  'player.movement.speed_px_per_sec',
  'player.actions.cooldown_ms',
  'entities.count',
  'entities.health',
  'entities.damage',
  'entities.movement.speed_px_per_sec',
  'rules.collisions.effects.value',
  'objectives.win.target',
  'objectives.lose.target'
]);

export function validateRawGameDsl(input: unknown): DslValidationResult<RawGameDsl> {
  const parsed = RawGameDslSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, issues: parsed.error.issues.map(toSchemaIssue) };
  }

  const issues = [
    ...validateUniqueIds(parsed.data),
    ...validateReferences(parsed.data),
    ...validateMechanicContract(parsed.data),
    ...validateObjectiveReachability(parsed.data)
  ];

  return issues.length === 0 ? { ok: true, value: parsed.data } : { ok: false, issues };
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

  if (path.endsWith('.id') || path.endsWith('.source') || path.endsWith('.target') || path.endsWith('.spawns')) {
    return { code: 'INVALID_ID_FORMAT', path, message: issue.message };
  }

  if (numericPaths.has(path.replace(/\.\d+/g, ''))) {
    return { code: 'NUMERIC_RANGE_INVALID', path, message: issue.message };
  }

  return { code: 'SCHEMA_VALIDATION_FAILED', path, message: issue.message };
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

  return issues;
}
