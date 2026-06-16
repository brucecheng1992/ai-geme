import type { RawGameDsl } from '../schemas/raw-game-dsl-v0.1.schema.js';
import { isSemanticId, parseSemanticId, type SemanticId, type SemanticIdKind } from './semantic-address.js';

export type SemanticNodeRef = {
  id: SemanticId;
  kind: SemanticIdKind;
  path: string;
  value: unknown;
};

export type SemanticIndexEntry = SemanticNodeRef;

export type SemanticIndex = {
  resolve(id: SemanticId): SemanticNodeRef | null;
  has(id: SemanticId): boolean;
  list(kind?: SemanticIdKind): SemanticNodeRef[];
};

type RawGameDslLike = Pick<RawGameDsl, 'metadata' | 'game' | 'world' | 'camera' | 'player' | 'entities' | 'rules'> &
  Partial<Pick<RawGameDsl, 'projectiles' | 'enemyTypes' | 'level' | 'pickups'>>;

/**
 * Builds a semantic address index over the current Raw DSL SSOT without introducing generated-code paths.
 */
export function buildSemanticIndex(ssot: unknown): SemanticIndex {
  const refs = new Map<SemanticId, SemanticNodeRef>();

  if (isRawGameDslLike(ssot)) {
    addNamedRef(refs, 'project', 'default', '/', ssot);
    addNamedRef(refs, 'scene', 'main', '/', ssot);
    addNamedRef(refs, 'entity', ssot.player.id, '/player', ssot.player);
    addNamedRef(refs, 'camera', 'main', ssot.camera === undefined ? '/game/camera' : '/camera', ssot.camera ?? ssot.game.camera);
    addNamedRef(refs, 'input', 'keyboard', '/player/actions', ssot.player.actions);
    addNamedRef(refs, 'system', 'movement', '/player/movement', ssot.player.movement);
    addNamedRef(refs, 'system', 'collision', '/rules/collisions', ssot.rules.collisions);
    addNamedRef(refs, 'physics', 'arcade', '/world', ssot.world);

    ssot.entities.forEach((entity, index) => addNamedRef(refs, 'entity', entity.id, `/entities/${index}`, entity));
    ssot.rules.collisions.forEach((rule, index) => addNamedRef(refs, 'rule', rule.id, `/rules/collisions/${index}`, rule));
    ssot.projectiles?.forEach((projectile, index) => addNamedRef(refs, 'entity', projectile.id, `/projectiles/${index}`, projectile));
    ssot.enemyTypes?.forEach((enemyType, index) => addNamedRef(refs, 'entity', enemyType.id, `/enemyTypes/${index}`, enemyType));
    ssot.pickups?.forEach((pickup, index) => addNamedRef(refs, 'entity', pickup.id, `/pickups/${index}`, pickup));
    ssot.level?.segments.forEach((segment, index) => addNamedRef(refs, 'scene', segment.id, `/level/segments/${index}`, segment));
  }

  return {
    resolve(id) {
      return refs.get(id) ?? null;
    },
    has(id) {
      return refs.has(id);
    },
    list(kind) {
      const values = [...refs.values()];
      return kind === undefined ? values : values.filter((ref) => ref.kind === kind);
    }
  };
}

function addNamedRef(refs: Map<SemanticId, SemanticNodeRef>, kind: SemanticIdKind, name: unknown, path: string, value: unknown): void {
  if (typeof name !== 'string') {
    return;
  }

  const id = `${kind}:${name}`;
  if (!isSemanticId(id)) {
    return;
  }

  addRef(refs, id, kind, path, value);
}

function addRef(refs: Map<SemanticId, SemanticNodeRef>, id: SemanticId, kind: SemanticIdKind, path: string, value: unknown): void {
  if (!isSemanticId(id) || parseSemanticId(id)?.kind !== kind || refs.has(id)) {
    return;
  }

  refs.set(id, { id, kind, path, value });
}

function isRawGameDslLike(value: unknown): value is RawGameDslLike {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRecord(value.metadata) &&
    isRecord(value.game) &&
    isRecord(value.world) &&
    isRecord(value.player) &&
    typeof value.player.id === 'string' &&
    isRecord(value.player.movement) &&
    Array.isArray(value.player.actions) &&
    Array.isArray(value.entities) &&
    value.entities.every(isRecordWithOptionalId) &&
    isRecord(value.rules) &&
    Array.isArray(value.rules.collisions) &&
    value.rules.collisions.every(isRecordWithOptionalId) &&
    isOptionalArrayOfRecords(value.projectiles) &&
    isOptionalArrayOfRecords(value.enemyTypes) &&
    isOptionalArrayOfRecords(value.pickups) &&
    (value.level === undefined || (isRecord(value.level) && Array.isArray(value.level.segments) && value.level.segments.every(isRecordWithOptionalId)))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isRecordWithOptionalId(value: unknown): value is Record<string, unknown> & { id?: unknown } {
  return isRecord(value);
}

function isOptionalArrayOfRecords(value: unknown): value is Array<Record<string, unknown> & { id?: unknown }> | undefined {
  return value === undefined || (Array.isArray(value) && value.every(isRecordWithOptionalId));
}
