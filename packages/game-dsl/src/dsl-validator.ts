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
  'ui.warningBanner.durationMs',
  'player.visual.scale',
  'enemyTypes.visual.scale',
  'scenes.backgroundLayers.parallax',
  'scenes.backgroundLayers.opacity',
  'scenes.backgroundLayers.depth',
  'scenes.platforms.x',
  'scenes.platforms.y',
  'scenes.platforms.width',
  'scenes.platforms.height',
  'scenes.playerSpawn.x',
  'scenes.playerSpawn.y',
  'scenes.enemyInstances.x',
  'scenes.enemyInstances.y',
  'scenes.goal.x',
  'scenes.goal.y'
]);

export function validateRawGameDsl(input: unknown): DslValidationResult<RawGameDsl> {
  const parsed = RawGameDslSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, issues: parsed.error.issues.map(toSchemaIssue) };
  }

  const issues = [
    ...validateUniqueIds(parsed.data),
    ...validateSceneDuplicateIds(parsed.data),
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

function validateSceneDuplicateIds(raw: RawGameDsl): DslValidationIssue[] {
  const issues: DslValidationIssue[] = [];
  const sceneIds = new Set<string>();

  for (const [sceneIndex, scene] of (raw.scenes ?? []).entries()) {
    if (sceneIds.has(scene.id)) {
      issues.push({ code: 'DUPLICATE_ID', path: `scenes.${sceneIndex}.id`, message: `Duplicate scene id "${scene.id}"` });
    }
    sceneIds.add(scene.id);
    issues.push(
      ...duplicateSceneNodeIssues(scene.backgroundLayers.map((layer) => layer.id), `scenes.${sceneIndex}.backgroundLayers`),
      ...duplicateSceneNodeIssues(scene.platforms.map((platform) => platform.id), `scenes.${sceneIndex}.platforms`),
      ...duplicateSceneNodeIssues(scene.enemyInstances.map((instance) => instance.id), `scenes.${sceneIndex}.enemyInstances`)
    );
  }

  return issues;
}

function duplicateSceneNodeIssues(ids: string[], path: string): DslValidationIssue[] {
  const issues: DslValidationIssue[] = [];
  const seen = new Set<string>();
  for (const [index, id] of ids.entries()) {
    if (seen.has(id)) {
      issues.push({ code: 'DUPLICATE_ID', path: `${path}.${index}.id`, message: `Duplicate scene node id "${id}"` });
    }
    seen.add(id);
  }
  return issues;
}

function validateReferences(raw: RawGameDsl): DslValidationIssue[] {
  const entityIds = new Set([raw.player.id, ...raw.entities.map((entity) => entity.id)]);
  const collisionIds = new Set([...entityIds, ...(raw.projectiles ?? []).map((projectile) => projectile.id)]);
  const enemyTypeIds = new Set((raw.enemyTypes ?? []).map((enemyType) => enemyType.id));
  const issues: DslValidationIssue[] = [];

  for (const [index, action] of raw.player.actions.entries()) {
    if (action.spawns !== undefined && !entityIds.has(action.spawns)) {
      issues.push({
        code: 'UNRESOLVED_REFERENCE',
        path: `player.actions.${index}.spawns`,
        message: `Unknown spawned entity id "${action.spawns}"`
      });
    }
  }

  for (const [index, collision] of raw.rules.collisions.entries()) {
    for (const key of ['source', 'target'] as const) {
      if (!collisionIds.has(collision[key])) {
        issues.push({
          code: 'UNRESOLVED_REFERENCE',
          path: `rules.collisions.${index}.${key}`,
          message: `Unknown collision ${key} id "${collision[key]}"`
        });
      }
    }
  }

  for (const [index, spawn] of (raw.level?.spawns ?? []).entries()) {
    if (!enemyTypeIds.has(spawn.enemyType)) {
      issues.push({
        code: 'UNRESOLVED_REFERENCE',
        path: `level.spawns.${index}.enemyType`,
        message: `Unknown enemyType id "${spawn.enemyType}"`
      });
    }
  }

  return [...issues, ...validateSceneReferences(raw, enemyTypeIds)];
}

function validateSceneReferences(raw: RawGameDsl, enemyTypeIds: Set<string>): DslValidationIssue[] {
  const issues: DslValidationIssue[] = [];
  const spawnIds = new Set((raw.level?.spawns ?? []).map((spawn) => spawn.id));
  const enemyEntityIds = new Set(raw.entities.filter((entity) => entity.kind === 'enemy').map((entity) => entity.id));
  const collectibleEntityIds = new Set(raw.entities.filter((entity) => entity.kind === 'collectible').map((entity) => entity.id));
  const pickupIds = new Set((raw.pickups ?? []).map((pickup) => pickup.id));

  for (const [sceneIndex, scene] of (raw.scenes ?? []).entries()) {
    const sceneEnemyInstanceIds = new Set(scene.enemyInstances.map((instance) => instance.id));

    for (const [instanceIndex, instance] of scene.enemyInstances.entries()) {
      if (!enemyTypeIds.has(instance.archetypeRef)) {
        issues.push({
          code: 'UNRESOLVED_REFERENCE',
          path: `scenes.${sceneIndex}.enemyInstances.${instanceIndex}.archetypeRef`,
          message: `Unknown enemy archetype "${instance.archetypeRef}"`
        });
      }
      if (instance.spawnRule !== undefined && !spawnIds.has(instance.spawnRule)) {
        issues.push({
          code: 'UNRESOLVED_REFERENCE',
          path: `scenes.${sceneIndex}.enemyInstances.${instanceIndex}.spawnRule`,
          message: `Unknown scene spawn rule "${instance.spawnRule}"`
        });
      }
    }

    const goalRef = scene.goal.entityRef;
    if (goalRef === undefined) {
      continue;
    }

    const allowedGoalRefs = goalEntityRefsForKind(scene.goal.kind, {
      enemyTypeIds,
      enemyEntityIds,
      collectibleEntityIds,
      pickupIds,
      sceneEnemyInstanceIds
    });
    if (!allowedGoalRefs.has(goalRef)) {
      issues.push({
        code: 'UNRESOLVED_REFERENCE',
        path: `scenes.${sceneIndex}.goal.entityRef`,
        message: `Unknown ${scene.goal.kind} goal entityRef "${goalRef}"`
      });
    }
  }

  return issues;
}

function goalEntityRefsForKind(
  kind: NonNullable<RawGameDsl['scenes']>[number]['goal']['kind'],
  refs: {
    enemyTypeIds: Set<string>;
    enemyEntityIds: Set<string>;
    collectibleEntityIds: Set<string>;
    pickupIds: Set<string>;
    sceneEnemyInstanceIds: Set<string>;
  }
): Set<string> {
  if (kind === 'destroy') {
    return new Set([...refs.enemyTypeIds, ...refs.enemyEntityIds, ...refs.sceneEnemyInstanceIds]);
  }
  if (kind === 'collect') {
    return new Set([...refs.collectibleEntityIds, ...refs.pickupIds]);
  }

  return new Set<string>();
}
