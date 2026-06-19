import { z } from 'zod';

import { DeclarativeJsonObjectSchema, SafeDeclarativeJsonValueSchema } from '../gameplay-capabilities/declarative-json.js';
import { GameplayCapabilityIdSchema, GameplayProfileIdSchema } from '../gameplay-capabilities/registry.js';
import { hashStableJson } from '../gameplay-capabilities/stable-json.js';
import { DurationSecondsSchema, PlayTimeIntentSchema } from './game-brief-v0.2.schema.js';

export const CAPABILITY_GAME_DSL_DRAFT_ARTIFACT_KIND = 'capability_game_dsl_draft';
export const CAPABILITY_GAME_DSL_DRAFT_SCHEMA_VERSION = 'capability-game-dsl-draft.v1';
export const CAPABILITY_GAME_DSL_DRAFT_RAW_PATH = 'capability-game-dsl-draft.raw.json';
export const COMPOSED_GAME_DSL_SCHEMA_ARTIFACT_KIND = 'composed_game_dsl_schema';
export const COMPOSED_GAME_DSL_SCHEMA_VERSION = 'composed-game-dsl-schema.v1';

const ForbiddenTrustedEvidenceKeys = new Set([
  'activecapabilitylock',
  'activedefault',
  'activeevidence',
  'activemanifest',
  'activemoduleload',
  'activepath',
  'activeqa',
  'activeruntime',
  'artifactreferences',
  'artifactrefs',
  'buildpassed',
  'buildreport',
  'canarypassed',
  'canarystatus',
  'capabilitylockhash',
  'capabilitypackageversion',
  'capabilityownedqa',
  'capabilityqapassed',
  'composedschemahash',
  'composedschemaidentity',
  'cutoverallowed',
  'cutoverpassed',
  'cutoverreport',
  'cutoverstatus',
  'defaultcutover',
  'defaultcutoverallowed',
  'enemyfiredevidence',
  'enemyfiredtelemetry',
  'exactcapabilitylockhash',
  'finalclosure',
  'finalgate',
  'lockhash',
  'manifesthash',
  'moduleloadreceipt',
  'packageversion',
  'paritypassed',
  'parityreport',
  'paritystatus',
  'registrysnapshothash',
  'rollbackpassed',
  'rollbackreport',
  'rollbackstatus',
  'runtimeevidence',
  'runtimeevidencestatus',
  'runtimemanifest',
  'runtimemanifesthash',
  'runtimemoduleloadreceipt',
  'snapshothash',
  'trustedartifactreferences',
  'trustedartifactrefs',
  'trustedartifacts'
]);

const StableDraftIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_.-]{1,79}$/)
  .refine((value) => value.split(/[.-]/).every((segment) => !/^\d+$/.test(segment)), 'stable IDs cannot be raw array-index refs');

const CapabilityRefListSchema = z.array(GameplayCapabilityIdSchema).min(1).max(40);

const DurationTargetSchema = z
  .strictObject({
    min_sec: DurationSecondsSchema,
    max_sec: DurationSecondsSchema
  })
  .superRefine((value, ctx) => {
    if (value.min_sec > value.max_sec) {
      ctx.addIssue({
        code: 'custom',
        path: ['max_sec'],
        message: 'max_sec must be greater than or equal to min_sec'
      });
    }
  });

const ProgressionSegmentSchema = z.strictObject({
  id: StableDraftIdSchema,
  order: z.number().int().min(0).max(999),
  label: z.string().min(1).max(120).optional(),
  duration_target_sec: DurationTargetSchema,
  capability_refs: CapabilityRefListSchema.optional(),
  start_condition: DeclarativeJsonObjectSchema.optional(),
  end_condition: DeclarativeJsonObjectSchema.optional()
});

const ProgressionPlanSchema = z
  .strictObject({
    estimated_total_sec: DurationTargetSchema,
    segments: z.array(ProgressionSegmentSchema).min(1).max(60)
  })
  .superRefine((value, ctx) => {
    addDuplicateStableIdIssues(value.segments, 'segments', ctx);
    addDuplicateNumberIssues(
      value.segments.map((segment) => segment.order),
      'segments',
      'order',
      ctx
    );

    const totalMin = value.segments.reduce((sum, segment) => sum + segment.duration_target_sec.min_sec, 0);
    const totalMax = value.segments.reduce((sum, segment) => sum + segment.duration_target_sec.max_sec, 0);
    if (totalMin < value.estimated_total_sec.min_sec || totalMax > value.estimated_total_sec.max_sec) {
      ctx.addIssue({
        code: 'custom',
        path: ['segments'],
        message: 'segment duration targets must fit within estimated_total_sec'
      });
    }
  });

const CapabilityConfigDraftSchema = z.strictObject({
  id: StableDraftIdSchema,
  capability_id: GameplayCapabilityIdSchema,
  applies_to: z.array(StableDraftIdSchema).min(1).max(40).optional(),
  config: SafeDeclarativeJsonValueSchema
});

const EntityDraftSchema = z.strictObject({
  id: StableDraftIdSchema,
  role: z.enum(['player', 'enemy', 'projectile', 'weapon', 'pickup', 'boss', 'terrain', 'hazard', 'camera', 'ui', 'system']),
  label: z.string().min(1).max(120).optional(),
  tags: z.array(StableDraftIdSchema).max(40).optional(),
  capability_refs: CapabilityRefListSchema.optional(),
  config: SafeDeclarativeJsonValueSchema.optional()
});

const BehaviorDraftSchema = z.strictObject({
  id: StableDraftIdSchema,
  owner_entity_id: StableDraftIdSchema,
  capability_id: GameplayCapabilityIdSchema,
  trigger: DeclarativeJsonObjectSchema,
  config: SafeDeclarativeJsonValueSchema
});

const WaveDraftSchema = z.strictObject({
  id: StableDraftIdSchema,
  segment_id: StableDraftIdSchema,
  enemy_entity_id: StableDraftIdSchema,
  count: z.number().int().min(1).max(500),
  spawn: DeclarativeJsonObjectSchema,
  capability_refs: CapabilityRefListSchema.optional()
});

const PickupDraftSchema = z.strictObject({
  id: StableDraftIdSchema,
  segment_id: StableDraftIdSchema.optional(),
  pickup_entity_id: StableDraftIdSchema.optional(),
  count: z.number().int().min(1).max(200).optional(),
  spawn: DeclarativeJsonObjectSchema.optional(),
  capability_refs: CapabilityRefListSchema.optional()
});

const ObjectiveDraftSchema = z.strictObject({
  id: StableDraftIdSchema,
  kind: z.enum(['target_score', 'destroy_target', 'survive_duration', 'reach_exit', 'collect_items', 'boss_defeated']),
  target: SafeDeclarativeJsonValueSchema.optional(),
  success_condition: DeclarativeJsonObjectSchema,
  capability_refs: CapabilityRefListSchema.optional()
});

const BossPhaseDraftSchema = z.strictObject({
  id: StableDraftIdSchema,
  order: z.number().int().min(0).max(20),
  health_threshold_pct: z.number().finite().min(0).max(100),
  pattern: DeclarativeJsonObjectSchema,
  capability_refs: CapabilityRefListSchema.optional()
});

const BossDraftSchema = z
  .strictObject({
    id: StableDraftIdSchema,
    boss_entity_id: StableDraftIdSchema,
    segment_refs: z.array(StableDraftIdSchema).min(1).max(20).optional(),
    phases: z.array(BossPhaseDraftSchema).min(1).max(20)
  })
  .superRefine((value, ctx) => {
    addDuplicateStableIdIssues(value.phases, 'phases', ctx);
    addDuplicateNumberIssues(
      value.phases.map((phase) => phase.order),
      'phases',
      'order',
      ctx
    );
  });

const SceneDraftSchema = z.strictObject({
  id: StableDraftIdSchema,
  segment_refs: z.array(StableDraftIdSchema).min(1).max(60).optional(),
  entity_refs: z.array(StableDraftIdSchema).max(200).optional(),
  capability_refs: CapabilityRefListSchema.optional(),
  config: SafeDeclarativeJsonValueSchema.optional()
});

const DraftMetadataSchema = z.strictObject({
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(1200).optional(),
  language: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/).optional(),
  tags: z.array(StableDraftIdSchema).max(40).optional(),
  notes: z.array(z.string().min(1).max(500)).max(20).optional()
});

export const CapabilityGameDslDraftV1Schema = z
  .strictObject({
    artifactKind: z.literal(CAPABILITY_GAME_DSL_DRAFT_ARTIFACT_KIND),
    schemaVersion: z.literal(CAPABILITY_GAME_DSL_DRAFT_SCHEMA_VERSION),
    profile: z.strictObject({ id: GameplayProfileIdSchema }),
    play_time_intent: PlayTimeIntentSchema,
    capabilities: z.array(GameplayCapabilityIdSchema).min(1).max(120),
    progression: ProgressionPlanSchema,
    scenes: z.array(SceneDraftSchema).min(1).max(40),
    entities: z.array(EntityDraftSchema).min(1).max(300),
    behaviors: z.array(BehaviorDraftSchema).max(300),
    waves: z.array(WaveDraftSchema).max(120),
    pickups: z.array(PickupDraftSchema).max(120),
    objectives: z.array(ObjectiveDraftSchema).min(1).max(40),
    bosses: z.array(BossDraftSchema).max(20),
    capability_configs: z.array(CapabilityConfigDraftSchema).max(300),
    metadata: DraftMetadataSchema
  })
  .superRefine((draft, ctx) => {
    const forbiddenPath = findForbiddenCapabilityGameDslDraftEvidenceKeyPath(draft);
    if (forbiddenPath !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: forbiddenPath,
        message: 'CapabilityGameDslDraft v1 cannot contain trusted evidence; locks, manifest hashes and artifact refs must be produced by the system.'
      });
    }

    assertPlayTimeIntentMatchesProgression(draft, ctx);
    addDuplicateStableIdIssues(draft.scenes, 'scenes', ctx);
    addDuplicateStableIdIssues(draft.entities, 'entities', ctx);
    addDuplicateStableIdIssues(draft.behaviors, 'behaviors', ctx);
    addDuplicateStableIdIssues(draft.waves, 'waves', ctx);
    addDuplicateStableIdIssues(draft.pickups, 'pickups', ctx);
    addDuplicateStableIdIssues(draft.objectives, 'objectives', ctx);
    addDuplicateStableIdIssues(draft.bosses, 'bosses', ctx);
    addDuplicateStableIdIssues(draft.capability_configs, 'capability_configs', ctx);
    addDuplicateStringIssues(draft.capabilities, 'capabilities', ctx);

    const declaredCapabilities = new Set(draft.capabilities);
    addUndeclaredCapabilityIssues(collectCapabilityRefs(draft), declaredCapabilities, ctx);
    addMissingDraftReferenceIssues(draft, ctx);
  });

export type CapabilityGameDslDraftV1 = z.infer<typeof CapabilityGameDslDraftV1Schema>;

export const CapabilityGameDslDraftComposedSchemaIdentitySchema = z
  .strictObject({
    artifactKind: z.literal(COMPOSED_GAME_DSL_SCHEMA_ARTIFACT_KIND),
    schemaVersion: z.literal(COMPOSED_GAME_DSL_SCHEMA_VERSION),
    draftSchemaVersion: z.literal(CAPABILITY_GAME_DSL_DRAFT_SCHEMA_VERSION),
    profileId: GameplayProfileIdSchema,
    capabilityIds: z.array(GameplayCapabilityIdSchema).min(1).max(120),
    schemaHash: z.string().regex(/^fnv1a_[a-f0-9]{8}$/)
  })
  .superRefine((value, ctx) => {
    addDuplicateStringIssues(value.capabilityIds, 'capabilityIds', ctx);
    if (value.capabilityIds.join('\n') !== [...value.capabilityIds].sort().join('\n')) {
      ctx.addIssue({
        code: 'custom',
        path: ['capabilityIds'],
        message: 'capabilityIds must be sorted for deterministic composed schema identity.'
      });
    }
    const expectedHash = hashCapabilityGameDslDraftComposedSchemaIdentity(value);
    if (value.schemaHash !== expectedHash) {
      ctx.addIssue({
        code: 'custom',
        path: ['schemaHash'],
        message: 'schemaHash must match the deterministic composed schema identity payload.'
      });
    }
  });

export type CapabilityGameDslDraftComposedSchemaIdentity = z.infer<typeof CapabilityGameDslDraftComposedSchemaIdentitySchema>;

export function buildCapabilityGameDslDraftComposedSchemaIdentity(input: {
  profileId: string;
  capabilityIds: readonly string[];
}): CapabilityGameDslDraftComposedSchemaIdentity {
  const capabilityIds = [...new Set(input.capabilityIds)].sort();
  const identityWithoutHash = {
    artifactKind: COMPOSED_GAME_DSL_SCHEMA_ARTIFACT_KIND,
    schemaVersion: COMPOSED_GAME_DSL_SCHEMA_VERSION,
    draftSchemaVersion: CAPABILITY_GAME_DSL_DRAFT_SCHEMA_VERSION,
    profileId: input.profileId,
    capabilityIds
  } as const;
  return CapabilityGameDslDraftComposedSchemaIdentitySchema.parse({
    ...identityWithoutHash,
    schemaHash: hashCapabilityGameDslDraftComposedSchemaIdentity(identityWithoutHash)
  });
}

export function findForbiddenCapabilityGameDslDraftEvidenceKeyPath(value: unknown, path: Array<string | number> = []): Array<string | number> | undefined {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const childPath = findForbiddenCapabilityGameDslDraftEvidenceKeyPath(value[index], [...path, index]);
      if (childPath !== undefined) {
        return childPath;
      }
    }
    return undefined;
  }
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  for (const [key, child] of Object.entries(value)) {
    if (isForbiddenCapabilityGameDslDraftEvidenceKey(key)) {
      return [...path, key];
    }
    const childPath = findForbiddenCapabilityGameDslDraftEvidenceKeyPath(child, [...path, key]);
    if (childPath !== undefined) {
      return childPath;
    }
  }
  return undefined;
}

function isForbiddenCapabilityGameDslDraftEvidenceKey(key: string): boolean {
  const normalized = normalizeEvidenceKey(key);
  if (ForbiddenTrustedEvidenceKeys.has(normalized)) {
    return true;
  }

  if (
    includesAny(normalized, [
      'artifactref',
      'capabilitylock',
      'composedschema',
      'moduleloadreceipt',
      'packageversion',
      'registrysnapshot',
      'runtimemanifest',
      'trustedartifact'
    ])
  ) {
    return true;
  }

  if (includesAny(normalized, ['canary', 'cutover', 'finalclosure', 'finalgate', 'parity', 'rollback'])) {
    return true;
  }

  if (normalized.includes('active') && includesAny(normalized, ['build', 'capability', 'evidence', 'lock', 'manifest', 'moduleload', 'qa', 'runtime'])) {
    return true;
  }

  return (
    includesAny(normalized, ['build', 'moduleload', 'qa', 'runtime']) &&
    includesAny(normalized, ['allowed', 'evidence', 'pass', 'passed', 'ready', 'receipt', 'report', 'status'])
  );
}

function normalizeEvidenceKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function includesAny(value: string, candidates: readonly string[]): boolean {
  return candidates.some((candidate) => value.includes(candidate));
}

function hashCapabilityGameDslDraftComposedSchemaIdentity(input: {
  artifactKind: typeof COMPOSED_GAME_DSL_SCHEMA_ARTIFACT_KIND;
  schemaVersion: typeof COMPOSED_GAME_DSL_SCHEMA_VERSION;
  draftSchemaVersion: typeof CAPABILITY_GAME_DSL_DRAFT_SCHEMA_VERSION;
  profileId: string;
  capabilityIds: readonly string[];
}): string {
  return hashStableJson({
    artifactKind: input.artifactKind,
    schemaVersion: input.schemaVersion,
    draftSchemaVersion: input.draftSchemaVersion,
    profileId: input.profileId,
    capabilityIds: input.capabilityIds
  });
}

function assertPlayTimeIntentMatchesProgression(draft: CapabilityGameDslDraftV1, ctx: z.RefinementCtx): void {
  const estimated = draft.progression.estimated_total_sec;
  if (draft.play_time_intent.mode === 'range') {
    if (estimated.min_sec !== draft.play_time_intent.min_sec || estimated.max_sec !== draft.play_time_intent.max_sec) {
      ctx.addIssue({
        code: 'custom',
        path: ['progression', 'estimated_total_sec'],
        message: 'range play_time_intent must be preserved in progression.estimated_total_sec.'
      });
    }
    return;
  }
  if (draft.play_time_intent.mode === 'target' && (estimated.min_sec > draft.play_time_intent.target_sec || estimated.max_sec < draft.play_time_intent.target_sec)) {
    ctx.addIssue({
      code: 'custom',
      path: ['progression', 'estimated_total_sec'],
      message: 'target play_time_intent must be covered by progression.estimated_total_sec.'
    });
  }
}

function addMissingDraftReferenceIssues(draft: CapabilityGameDslDraftV1, ctx: z.RefinementCtx): void {
  const segmentIds = new Set(draft.progression.segments.map((segment) => segment.id));
  const entityById = new Map(draft.entities.map((entity) => [entity.id, entity]));

  draft.scenes.forEach((scene, sceneIndex) => {
    scene.segment_refs?.forEach((segmentId, refIndex) => addMissingSetRefIssue(segmentIds, segmentId, ['scenes', sceneIndex, 'segment_refs', refIndex], ctx));
    scene.entity_refs?.forEach((entityId, refIndex) => addMissingMapRefIssue(entityById, entityId, ['scenes', sceneIndex, 'entity_refs', refIndex], ctx));
  });

  draft.behaviors.forEach((behavior, behaviorIndex) => {
    addMissingMapRefIssue(entityById, behavior.owner_entity_id, ['behaviors', behaviorIndex, 'owner_entity_id'], ctx);
  });

  draft.waves.forEach((wave, waveIndex) => {
    addMissingSetRefIssue(segmentIds, wave.segment_id, ['waves', waveIndex, 'segment_id'], ctx);
    const enemyEntity = addMissingMapRefIssue(entityById, wave.enemy_entity_id, ['waves', waveIndex, 'enemy_entity_id'], ctx);
    if (enemyEntity !== undefined && enemyEntity.role !== 'enemy') {
      ctx.addIssue({
        code: 'custom',
        path: ['waves', waveIndex, 'enemy_entity_id'],
        message: `Wave enemy_entity_id ${wave.enemy_entity_id} must reference an enemy entity.`
      });
    }
  });

  draft.pickups.forEach((pickup, pickupIndex) => {
    if (pickup.segment_id !== undefined) {
      addMissingSetRefIssue(segmentIds, pickup.segment_id, ['pickups', pickupIndex, 'segment_id'], ctx);
    }
    if (pickup.pickup_entity_id !== undefined) {
      const pickupEntity = addMissingMapRefIssue(entityById, pickup.pickup_entity_id, ['pickups', pickupIndex, 'pickup_entity_id'], ctx);
      if (pickupEntity !== undefined && pickupEntity.role !== 'pickup') {
        ctx.addIssue({
          code: 'custom',
          path: ['pickups', pickupIndex, 'pickup_entity_id'],
          message: `Pickup pickup_entity_id ${pickup.pickup_entity_id} must reference a pickup entity.`
        });
      }
    }
  });

  draft.bosses.forEach((boss, bossIndex) => {
    const bossEntity = addMissingMapRefIssue(entityById, boss.boss_entity_id, ['bosses', bossIndex, 'boss_entity_id'], ctx);
    if (bossEntity !== undefined && bossEntity.role !== 'boss') {
      ctx.addIssue({
        code: 'custom',
        path: ['bosses', bossIndex, 'boss_entity_id'],
        message: `Boss boss_entity_id ${boss.boss_entity_id} must reference a boss entity.`
      });
    }
    boss.segment_refs?.forEach((segmentId, refIndex) => addMissingSetRefIssue(segmentIds, segmentId, ['bosses', bossIndex, 'segment_refs', refIndex], ctx));
  });

  draft.capability_configs.forEach((config, configIndex) => {
    config.applies_to?.forEach((entityId, refIndex) =>
      addMissingMapRefIssue(entityById, entityId, ['capability_configs', configIndex, 'applies_to', refIndex], ctx)
    );
  });
}

function addMissingSetRefIssue(refs: ReadonlySet<string>, id: string, path: Array<string | number>, ctx: z.RefinementCtx): boolean {
  if (refs.has(id)) {
    return false;
  }
  ctx.addIssue({
    code: 'custom',
    path,
    message: `Draft reference ${id} does not exist.`
  });
  return true;
}

function addMissingMapRefIssue<T>(refs: ReadonlyMap<string, T>, id: string, path: Array<string | number>, ctx: z.RefinementCtx): T | undefined {
  const value = refs.get(id);
  if (value !== undefined) {
    return value;
  }
  ctx.addIssue({
    code: 'custom',
    path,
    message: `Draft reference ${id} does not exist.`
  });
  return undefined;
}

function collectCapabilityRefs(draft: CapabilityGameDslDraftV1): Array<{ path: string; capabilityId: string }> {
  const refs: Array<{ path: string; capabilityId: string }> = draft.capability_configs.map((config, index) => ({
    path: `/capability_configs/${index}/capability_id`,
    capabilityId: config.capability_id
  }));
  draft.behaviors.forEach((behavior, index) => refs.push({ path: `/behaviors/${index}/capability_id`, capabilityId: behavior.capability_id }));

  collectCapabilityRefList(refs, draft.progression.segments, '/progression/segments');
  collectCapabilityRefList(refs, draft.scenes, '/scenes');
  collectCapabilityRefList(refs, draft.entities, '/entities');
  collectCapabilityRefList(refs, draft.waves, '/waves');
  collectCapabilityRefList(refs, draft.pickups, '/pickups');
  collectCapabilityRefList(refs, draft.objectives, '/objectives');
  draft.bosses.forEach((boss, bossIndex) => collectCapabilityRefList(refs, boss.phases, `/bosses/${bossIndex}/phases`));
  return refs;
}

function collectCapabilityRefList(
  refs: Array<{ path: string; capabilityId: string }>,
  items: readonly { capability_refs?: readonly string[] }[],
  pathPrefix: string
): void {
  items.forEach((item, itemIndex) => {
    item.capability_refs?.forEach((capabilityId, capabilityIndex) =>
      refs.push({ path: `${pathPrefix}/${itemIndex}/capability_refs/${capabilityIndex}`, capabilityId })
    );
  });
}

function addUndeclaredCapabilityIssues(refs: readonly { path: string; capabilityId: string }[], declaredCapabilities: ReadonlySet<string>, ctx: z.RefinementCtx): void {
  for (const ref of refs) {
    if (!declaredCapabilities.has(ref.capabilityId)) {
      ctx.addIssue({
        code: 'custom',
        path: ref.path.split('/').filter(Boolean),
        message: `Capability ${ref.capabilityId} is referenced but not declared in capabilities.`
      });
    }
  }
}

function addDuplicateStableIdIssues(items: readonly { id: string }[], path: string, ctx: z.RefinementCtx): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.id)) {
      ctx.addIssue({
        code: 'custom',
        path: [path, index, 'id'],
        message: `Duplicate stable id ${item.id}.`
      });
    }
    seen.add(item.id);
  });
}

function addDuplicateNumberIssues(values: readonly number[], path: string, key: string, ctx: z.RefinementCtx): void {
  const seen = new Set<number>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      ctx.addIssue({
        code: 'custom',
        path: [path, index, key],
        message: `Duplicate ${key} ${value}.`
      });
    }
    seen.add(value);
  });
}

function addDuplicateStringIssues(values: readonly string[], path: string, ctx: z.RefinementCtx): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      ctx.addIssue({
        code: 'custom',
        path: [path, index],
        message: `Duplicate value ${value}.`
      });
    }
    seen.add(value);
  });
}
