import { DslPatchSchema, type DslPatch, type DslPatchOperation, type RawGameDsl } from '../../../../packages/game-dsl/src/index.js';
import type { DslRepairInput, RepairFailureSource } from './dsl-repair.types.js';

export function createDslRepairPatch(input: DslRepairInput): DslPatch | null {
  const raw = looseRecord(input.rawDsl);
  const genre = looseGenre(raw);
  if (!genre) {
    return null;
  }

  const changes = repairChangesForGenre(raw, genre);
  if (changes.length === 0) {
    return null;
  }

  return DslPatchSchema.parse({
    patch_version: 'game-dsl-patch-v0.1',
    target_dsl_version: 'game-dsl-v0.1',
    reason: repairReason(input.source, input.issues?.map((issue) => issue.message) ?? input.qaReport?.missing_events ?? []),
    changes
  });
}

function repairChangesForGenre(raw: Record<string, unknown>, genre: RawGameDsl['game']['genre']): DslPatchOperation[] {
  if (genre === 'collector') {
    return collectorRepair(raw);
  }

  if (genre === 'dodger') {
    return dodgerRepair(raw);
  }

  return shooterRepair(raw);
}

function collectorRepair(raw: Record<string, unknown>): DslPatchOperation[] {
  const player = looseRecord(raw.player);
  const entities = normalizedArray(raw.entities);
  const collisions = normalizedArray(looseRecord(raw.rules).collisions);
  const collectible = ensureEntity(entities, 'gem', { id: 'gem', kind: 'collectible', label: 'Gem', count: 8, movement: { type: 'static' } });

  return compactChanges([
    replaceIfDifferent('player.actions', normalizedArray(player.actions), ensureAction(normalizedArray(player.actions), { id: 'collect', type: 'collect' })),
    replaceIfDifferent('entities', entities, upsertById(entities, collectible)),
    replaceIfDifferent('rules.collisions', collisions, [
      ...collisions,
      { id: uniqueId(collisions, 'collect_gem'), source: player.id ?? 'player', target: collectible.id, type: 'overlap', effects: scoreAndDestroy() }
    ]),
    { op: 'replace', path: 'objectives', value: { win: { type: 'target_score', target: 1 }, lose: { type: 'none' } } }
  ]);
}

function dodgerRepair(raw: Record<string, unknown>): DslPatchOperation[] {
  const player = looseRecord(raw.player);
  const entities = normalizedArray(raw.entities);
  const collisions = normalizedArray(looseRecord(raw.rules).collisions);
  const hazard = ensureEntity(entities, 'hazard', {
    id: 'hazard',
    kind: 'hazard',
    label: 'Hazard',
    count: 4,
    damage: 1,
    movement: { type: 'move_left', speed_px_per_sec: 180 }
  });

  return compactChanges([
    replaceIfDifferent('entities', entities, upsertById(entities, hazard)),
    replaceIfDifferent('rules.collisions', collisions, [
      ...collisions,
      { id: uniqueId(collisions, 'player_hits_hazard'), source: player.id ?? 'player', target: hazard.id, type: 'overlap', effects: [{ type: 'damage', value: 1 }] }
    ]),
    { op: 'replace', path: 'objectives', value: { win: { type: 'survive_duration', target: 30 }, lose: { type: 'player_health_zero' } } }
  ]);
}

function shooterRepair(raw: Record<string, unknown>): DslPatchOperation[] {
  const player = looseRecord(raw.player);
  const entities = normalizedArray(raw.entities);
  const collisions = normalizedArray(looseRecord(raw.rules).collisions);
  const projectile = ensureEntity(entities, 'bolt', projectileEntity('bolt'));
  const enemy = ensureEntity(entities, 'enemy', enemyEntity('enemy'));

  return compactChanges([
    replaceIfDifferent('player.actions', normalizedArray(player.actions), [
      ...withoutActionType(normalizedArray(player.actions), 'shoot_projectile'),
      { id: 'fire', type: 'shoot_projectile', cooldown_ms: 300, spawns: projectile.id }
    ]),
    replaceIfDifferent('entities', entities, upsertById(upsertById(entities, projectile), enemy)),
    replaceIfDifferent('rules.collisions', collisions, [
      ...collisions,
      { id: uniqueId(collisions, 'projectile_hits_enemy'), source: projectile.id, target: enemy.id, type: 'projectile_hit', effects: damageDestroyScore() }
    ]),
    { op: 'replace', path: 'objectives', value: { win: { type: 'enemy_cleared', target: 1 }, lose: { type: 'player_health_zero' } } }
  ]);
}

function ensureAction(actions: unknown[], action: Record<string, unknown>): unknown[] {
  return actions.some((candidate) => looseRecord(candidate).type === action.type) ? actions : [...actions, action];
}

function withoutActionType(actions: unknown[], type: string): unknown[] {
  return actions.filter((action) => looseRecord(action).type !== type);
}

function ensureEntity(entities: unknown[], fallbackId: string, fallback: Record<string, unknown>): Record<string, unknown> {
  const existing = entities.find((entity) => looseRecord(entity).kind === fallback.kind);
  return existing ? looseRecord(existing) : { ...fallback, id: uniqueId(entities, fallbackId) };
}

function upsertById(items: unknown[], item: Record<string, unknown>): unknown[] {
  const itemId = item.id;
  if (typeof itemId !== 'string') {
    return items;
  }
  return items.some((candidate) => looseRecord(candidate).id === itemId)
    ? items.map((candidate) => (looseRecord(candidate).id === itemId ? item : candidate))
    : [...items, item];
}

function replaceIfDifferent(path: string, current: unknown[], next: unknown[]): DslPatchOperation | null {
  return JSON.stringify(current) === JSON.stringify(next) ? null : { op: 'replace', path, value: next };
}

function projectileEntity(id: string): Record<string, unknown> {
  return { id, kind: 'projectile', label: 'Bolt', damage: 1, movement: { type: 'move_right', speed_px_per_sec: 520 } };
}

function enemyEntity(id: string): Record<string, unknown> {
  return { id, kind: 'enemy', label: 'Enemy', count: 3, health: 1, movement: { type: 'chase_player', speed_px_per_sec: 120 } };
}

function damageDestroyScore(): Array<Record<string, unknown>> {
  return [{ type: 'damage', value: 1 }, { type: 'destroy' }, { type: 'score_add', value: 1 }];
}

function scoreAndDestroy(): Array<Record<string, unknown>> {
  return [{ type: 'score_add', value: 1 }, { type: 'destroy' }];
}

function repairReason(source: RepairFailureSource, details: string[]): string {
  const suffix = details.slice(0, 3).join('; ');
  return suffix ? `${source} repair: ${suffix}` : `${source} repair`;
}

function looseGenre(raw: Record<string, unknown>): RawGameDsl['game']['genre'] | null {
  const game = looseRecord(raw.game);
  return game.genre === 'collector' || game.genre === 'dodger' || game.genre === 'shooter' ? game.genre : null;
}

function looseRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizedArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function compactChanges(changes: Array<DslPatchOperation | null>): DslPatchOperation[] {
  return changes.filter((change): change is DslPatchOperation => change !== null).slice(0, 10);
}

function uniqueId(items: unknown[], base: string): string {
  const ids = new Set(items.map((item) => looseRecord(item).id).filter((id): id is string => typeof id === 'string'));
  let candidate = base;
  let index = 2;
  while (ids.has(candidate)) {
    candidate = `${base}_${index}`;
    index += 1;
  }
  return candidate;
}
