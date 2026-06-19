import { z } from 'zod';

import { DeclarativeJsonObjectSchema, SafeDeclarativeJsonValueSchema } from '../gameplay-capabilities/declarative-json.js';
import { GameplayCapabilityLockSchema, type GameplayCapabilityLock } from '../gameplay-capabilities/capability-lock.js';
import { GameplayCapabilityIdSchema, GameplayProfileIdSchema, RuntimeFamilyIdSchema } from '../gameplay-capabilities/registry.js';
import { hashStableJson } from '../gameplay-capabilities/stable-json.js';
import {
  CAPABILITY_GAME_DSL_DRAFT_RAW_PATH,
  CAPABILITY_GAME_DSL_DRAFT_SCHEMA_VERSION,
  CapabilityGameDslDraftComposedSchemaIdentitySchema,
  CapabilityGameDslDraftV1Schema,
  type CapabilityGameDslDraftComposedSchemaIdentity,
  type CapabilityGameDslDraftV1
} from './capability-game-dsl-draft-v1.schema.js';
import { PlayTimeIntentSchema } from './game-brief-v0.2.schema.js';
import { RAW_GAME_DSL_V01_DIALECT } from './raw-game-dsl-v0.1.schema.js';

export const CANONICAL_GAME_DSL_V02_SCHEMA_VERSION = 'game-dsl.v0.2';
export const CANONICAL_GAME_DSL_V02_ARTIFACT_KIND = 'canonical_game_dsl';
export const CANONICAL_GAME_DSL_V02_PATH = 'canonical-game-dsl-v0.2.json';
export const GAME_DSL_NORMALIZATION_REPORT_KIND = 'game_dsl_normalization_report';
export const GAME_DSL_NORMALIZATION_REPORT_SCHEMA_VERSION = 'game_dsl_normalization_report.v0.2';
export const GAME_DSL_NORMALIZATION_REPORT_PATH = 'game-dsl-normalization-report.json';
export const LEGACY_RAW_GAME_DSL_V01_RAW_PATH = 'legacy-raw-game-dsl-v0.1.raw.json';
export const LEGACY_GAME_DSL_V1_DIALECT = 'game-dsl.v1';
export const LEGACY_GAME_DSL_V1_PATH = 'legacy-game-dsl-v1.json';

const HashLikeSchema = z.string().min(1);
const StableCanonicalIdSchema = z.string().regex(/^[a-z][a-z0-9_.-]{1,119}$/);
const CapabilityIdListSchema = z.array(GameplayCapabilityIdSchema).max(120);
const DurationTargetSchema = z.strictObject({
  min_sec: z.number().int().positive(),
  max_sec: z.number().int().positive()
});

const CanonicalSourceBindingSchema = z.strictObject({
  game_brief_hash: HashLikeSchema,
  profile_resolution_hash: HashLikeSchema,
  capability_lock_hash: HashLikeSchema,
  composed_schema_hash: HashLikeSchema,
  draft_hash: HashLikeSchema
});

const CanonicalProgressionSegmentSchema = z.strictObject({
  id: StableCanonicalIdSchema,
  order: z.number().int().min(0),
  label: z.string().min(1).max(120).optional(),
  duration_target_sec: DurationTargetSchema,
  capability_ids: CapabilityIdListSchema
});

const CanonicalEntitySchema = z.strictObject({
  id: StableCanonicalIdSchema,
  role: z.enum(['player', 'enemy', 'projectile', 'weapon', 'pickup', 'boss', 'terrain', 'hazard', 'camera', 'ui', 'system']),
  label: z.string().min(1).max(120).optional(),
  tags: z.array(StableCanonicalIdSchema).max(40),
  capability_ids: CapabilityIdListSchema,
  config: SafeDeclarativeJsonValueSchema.optional()
});

const CanonicalGameplaySystemSchema = z.strictObject({
  id: StableCanonicalIdSchema,
  capability_id: GameplayCapabilityIdSchema,
  source_kind: z.enum(['behavior', 'capability_config']),
  owner_entity_id: StableCanonicalIdSchema.optional(),
  applies_to_entity_ids: z.array(StableCanonicalIdSchema).max(40).optional(),
  source_draft_id: StableCanonicalIdSchema,
  trigger: DeclarativeJsonObjectSchema.optional(),
  config: SafeDeclarativeJsonValueSchema
});

const CanonicalObjectiveSchema = z.strictObject({
  id: StableCanonicalIdSchema,
  kind: z.enum(['target_score', 'destroy_target', 'survive_duration', 'reach_exit', 'collect_items', 'boss_defeated']),
  target: SafeDeclarativeJsonValueSchema.optional(),
  success_condition: DeclarativeJsonObjectSchema,
  capability_ids: CapabilityIdListSchema
});

const CanonicalSceneContributionSchema = z.strictObject({
  id: StableCanonicalIdSchema,
  segment_ids: z.array(StableCanonicalIdSchema).max(60),
  entity_ids: z.array(StableCanonicalIdSchema).max(300),
  capability_ids: CapabilityIdListSchema,
  config: SafeDeclarativeJsonValueSchema.optional()
});

const CanonicalWaveSchema = z.strictObject({
  id: StableCanonicalIdSchema,
  segment_id: StableCanonicalIdSchema,
  enemy_entity_id: StableCanonicalIdSchema,
  count: z.number().int().min(1),
  spawn: DeclarativeJsonObjectSchema,
  capability_ids: CapabilityIdListSchema
});

const CanonicalPickupSchema = z.strictObject({
  id: StableCanonicalIdSchema,
  segment_id: StableCanonicalIdSchema.optional(),
  pickup_entity_id: StableCanonicalIdSchema.optional(),
  count: z.number().int().min(1).optional(),
  spawn: DeclarativeJsonObjectSchema.optional(),
  capability_ids: CapabilityIdListSchema
});

const CanonicalBossPhaseSchema = z.strictObject({
  id: StableCanonicalIdSchema,
  order: z.number().int().min(0),
  health_threshold_pct: z.number().finite().min(0).max(100),
  pattern: DeclarativeJsonObjectSchema,
  capability_ids: CapabilityIdListSchema
});

const CanonicalBossSchema = z.strictObject({
  id: StableCanonicalIdSchema,
  boss_entity_id: StableCanonicalIdSchema,
  segment_ids: z.array(StableCanonicalIdSchema).max(20),
  phases: z.array(CanonicalBossPhaseSchema).min(1).max(20)
});

export const CanonicalGameDslV02Schema = z.strictObject({
  artifactKind: z.literal(CANONICAL_GAME_DSL_V02_ARTIFACT_KIND),
  schema_version: z.literal(CANONICAL_GAME_DSL_V02_SCHEMA_VERSION),
  projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
  runId: z.string().regex(/^run_[A-Za-z0-9_-]+$/),
  source: CanonicalSourceBindingSchema,
  profile: z.strictObject({
    id: GameplayProfileIdSchema,
    runtime_family: RuntimeFamilyIdSchema
  }),
  capability_ids: z.array(GameplayCapabilityIdSchema).min(1).max(120),
  play_time_intent: PlayTimeIntentSchema,
  progression: z.strictObject({
    estimated_total_sec: DurationTargetSchema,
    segments: z.array(CanonicalProgressionSegmentSchema).min(1).max(60)
  }),
  scenes: z.array(CanonicalSceneContributionSchema).min(1).max(40),
  entities: z.array(CanonicalEntitySchema).min(1).max(300),
  systems: z.array(CanonicalGameplaySystemSchema).max(600),
  objectives: z.array(CanonicalObjectiveSchema).min(1).max(40),
  waves: z.array(CanonicalWaveSchema).max(120),
  pickups: z.array(CanonicalPickupSchema).max(120),
  bosses: z.array(CanonicalBossSchema).max(20),
  metadata: z.strictObject({
    title: z.string().min(1).max(160),
    summary: z.string().min(1).max(1200).optional(),
    language: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/).optional(),
    tags: z.array(StableCanonicalIdSchema).max(40)
  })
});

export type CanonicalGameDslV02 = z.infer<typeof CanonicalGameDslV02Schema>;

export const GameDslNormalizationIssueSchema = z.strictObject({
  code: z.enum([
    'DRAFT_INVALID',
    'CAPABILITY_LOCK_INVALID',
    'COMPOSED_SCHEMA_INVALID',
    'PROFILE_MISMATCH',
    'LOCK_HASH_MISMATCH',
    'CAPABILITY_SET_MISMATCH',
    'CANONICAL_SCHEMA_INVALID'
  ]),
  path: z.string().min(1),
  message: z.string().min(1)
});

export const GameDslNormalizationReportSchema = z.strictObject({
  artifactKind: z.literal(GAME_DSL_NORMALIZATION_REPORT_KIND),
  schemaVersion: z.literal(GAME_DSL_NORMALIZATION_REPORT_SCHEMA_VERSION),
  projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
  runId: z.string().regex(/^run_[A-Za-z0-9_-]+$/),
  status: z.enum(['normalized', 'blocked']),
  rawModelArtifact: z.strictObject({
    dialect: z.literal(CAPABILITY_GAME_DSL_DRAFT_SCHEMA_VERSION),
    path: z.literal(CAPABILITY_GAME_DSL_DRAFT_RAW_PATH),
    hash: HashLikeSchema
  }),
  authoritativeArtifact: z.strictObject({
    dialect: z.literal(CANONICAL_GAME_DSL_V02_SCHEMA_VERSION),
    path: z.literal(CANONICAL_GAME_DSL_V02_PATH),
    hash: HashLikeSchema.optional()
  }),
  legacyArtifacts: z.array(
    z.strictObject({
      dialect: z.enum([RAW_GAME_DSL_V01_DIALECT, LEGACY_GAME_DSL_V1_DIALECT]),
      path: z.enum([LEGACY_RAW_GAME_DSL_V01_RAW_PATH, LEGACY_GAME_DSL_V1_PATH]),
      role: z.enum(['legacy_raw_model_output', 'legacy_normalized_runtime_dsl'])
    })
  ),
  source: CanonicalSourceBindingSchema,
  issues: z.array(GameDslNormalizationIssueSchema),
  reportHash: HashLikeSchema
}).superRefine((report, ctx) => {
  if (report.status === 'normalized' && report.authoritativeArtifact.hash === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['authoritativeArtifact', 'hash'],
      message: 'normalized reports must include the authoritative canonical DSL hash.'
    });
  }
  if (report.status === 'blocked' && report.authoritativeArtifact.hash !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['authoritativeArtifact', 'hash'],
      message: 'blocked reports must not include an authoritative canonical DSL hash.'
    });
  }
  if (report.reportHash !== hashGameDslNormalizationReportPayload(report)) {
    ctx.addIssue({
      code: 'custom',
      path: ['reportHash'],
      message: 'reportHash must match the deterministic normalization report payload.'
    });
  }
});

export type GameDslNormalizationIssue = z.infer<typeof GameDslNormalizationIssueSchema>;
export type GameDslNormalizationReport = z.infer<typeof GameDslNormalizationReportSchema>;

export type NormalizeCapabilityGameDslDraftToCanonicalV02Result =
  | { status: 'normalized'; canonicalDsl: CanonicalGameDslV02; normalizationReport: GameDslNormalizationReport }
  | { status: 'blocked'; normalizationReport: GameDslNormalizationReport };

export function normalizeCapabilityGameDslDraftToCanonicalV02(input: {
  projectId: string;
  runId: string;
  draft: unknown;
  gameBriefHash: string;
  profileResolutionHash: string;
  capabilityLock: unknown;
  composedSchemaIdentity: unknown;
}): NormalizeCapabilityGameDslDraftToCanonicalV02Result {
  const draftResult = CapabilityGameDslDraftV1Schema.safeParse(input.draft);
  const lockResult = GameplayCapabilityLockSchema.safeParse(input.capabilityLock);
  const schemaIdentityResult = CapabilityGameDslDraftComposedSchemaIdentitySchema.safeParse(input.composedSchemaIdentity);
  const issues: GameDslNormalizationIssue[] = [
    ...zodIssues('DRAFT_INVALID', draftResult),
    ...zodIssues('CAPABILITY_LOCK_INVALID', lockResult),
    ...zodIssues('COMPOSED_SCHEMA_INVALID', schemaIdentityResult)
  ];
  const draftHash = draftResult.success ? hashStableJson(draftResult.data) : hashStableJson({ invalidDraft: input.draft });
  const source = {
    game_brief_hash: input.gameBriefHash,
    profile_resolution_hash: input.profileResolutionHash,
    capability_lock_hash: lockResult.success ? lockResult.data.lockHash : '<invalid-lock>',
    composed_schema_hash: schemaIdentityResult.success ? schemaIdentityResult.data.schemaHash : '<invalid-composed-schema>',
    draft_hash: draftHash
  };

  if (draftResult.success && lockResult.success && schemaIdentityResult.success) {
    issues.push(...validateTrustedSourceBindings(draftResult.data, lockResult.data, schemaIdentityResult.data));
  }

  if (issues.length > 0 || !draftResult.success || !lockResult.success || !schemaIdentityResult.success) {
    return {
      status: 'blocked',
      normalizationReport: buildNormalizationReport({
        projectId: input.projectId,
        runId: input.runId,
        status: 'blocked',
        source,
        issues
      })
    };
  }

  const canonicalPayload = buildCanonicalPayload({
    projectId: input.projectId,
    runId: input.runId,
    draft: draftResult.data,
    lock: lockResult.data,
    source
  });
  const canonicalResult = CanonicalGameDslV02Schema.safeParse(canonicalPayload);
  if (!canonicalResult.success) {
    return {
      status: 'blocked',
      normalizationReport: buildNormalizationReport({
        projectId: input.projectId,
        runId: input.runId,
        status: 'blocked',
        source,
        issues: zodIssues('CANONICAL_SCHEMA_INVALID', canonicalResult)
      })
    };
  }

  const canonicalHash = hashStableJson(canonicalResult.data);
  return {
    status: 'normalized',
    canonicalDsl: canonicalResult.data,
    normalizationReport: buildNormalizationReport({
      projectId: input.projectId,
      runId: input.runId,
      status: 'normalized',
      source,
      canonicalHash,
      issues: []
    })
  };
}

function validateTrustedSourceBindings(
  draft: CapabilityGameDslDraftV1,
  lock: GameplayCapabilityLock,
  schemaIdentity: CapabilityGameDslDraftComposedSchemaIdentity
): GameDslNormalizationIssue[] {
  const issues: GameDslNormalizationIssue[] = [];
  const recomputedLockHash = recomputeGameplayCapabilityLockHash(lock);
  const draftCapabilityIds = sortedUnique(draft.capabilities);
  const lockCapabilityIds = sortedUnique(lock.capabilityIds);
  const lockPackageCapabilityIds = sortedUnique(lock.packages.map((pkg) => pkg.capabilityId));
  const schemaCapabilityIds = sortedUnique(schemaIdentity.capabilityIds);

  if (lock.lockHash !== recomputedLockHash) {
    issues.push(issue('LOCK_HASH_MISMATCH', 'capabilityLock.lockHash', 'Capability lock hash does not match its payload.'));
  }
  if (draft.profile.id !== lock.profileId) {
    issues.push(issue('PROFILE_MISMATCH', 'draft.profile.id', 'Draft profile must match the exact capability lock profile.'));
  }
  if (draft.profile.id !== schemaIdentity.profileId) {
    issues.push(issue('PROFILE_MISMATCH', 'draft.profile.id', 'Draft profile must match the composed schema profile.'));
  }
  if (!sameStringSet(draftCapabilityIds, schemaCapabilityIds)) {
    issues.push(issue('CAPABILITY_SET_MISMATCH', 'draft.capabilities', 'Draft capabilities must match the composed schema capability set.'));
  }
  if (!sameStringSet(lockCapabilityIds, schemaCapabilityIds)) {
    issues.push(issue('CAPABILITY_SET_MISMATCH', 'capabilityLock.capabilityIds', 'Exact capability lock must match the composed schema capability set.'));
  }
  if (!sameStringSet(lockCapabilityIds, lockPackageCapabilityIds)) {
    issues.push(issue('CAPABILITY_SET_MISMATCH', 'capabilityLock.packages', 'Exact capability lock packages must match capabilityIds.'));
  }
  return issues;
}

function buildCanonicalPayload(input: {
  projectId: string;
  runId: string;
  draft: CapabilityGameDslDraftV1;
  lock: GameplayCapabilityLock;
  source: CanonicalGameDslV02['source'];
}): unknown {
  return {
    artifactKind: CANONICAL_GAME_DSL_V02_ARTIFACT_KIND,
    schema_version: CANONICAL_GAME_DSL_V02_SCHEMA_VERSION,
    projectId: input.projectId,
    runId: input.runId,
    source: input.source,
    profile: { id: input.lock.profileId, runtime_family: input.lock.runtimeFamily },
    capability_ids: sortedUnique(input.lock.capabilityIds),
    play_time_intent: input.draft.play_time_intent,
    progression: {
      estimated_total_sec: input.draft.progression.estimated_total_sec,
      segments: input.draft.progression.segments.map((segment) => ({
        id: segment.id,
        order: segment.order,
        ...(segment.label === undefined ? {} : { label: segment.label }),
        duration_target_sec: segment.duration_target_sec,
        capability_ids: sortedUnique(segment.capability_refs ?? [])
      }))
    },
    scenes: input.draft.scenes.map((scene) => ({
      id: scene.id,
      segment_ids: [...(scene.segment_refs ?? [])],
      entity_ids: [...(scene.entity_refs ?? [])],
      capability_ids: sortedUnique(scene.capability_refs ?? []),
      ...(scene.config === undefined ? {} : { config: scene.config })
    })),
    entities: input.draft.entities.map((entity) => ({
      id: entity.id,
      role: entity.role,
      ...(entity.label === undefined ? {} : { label: entity.label }),
      tags: [...(entity.tags ?? [])].sort(),
      capability_ids: sortedUnique(entity.capability_refs ?? []),
      ...(entity.config === undefined ? {} : { config: entity.config })
    })),
    systems: [
      ...input.draft.behaviors.map((behavior) => ({
        id: `behavior_${behavior.id}`,
        capability_id: behavior.capability_id,
        source_kind: 'behavior' as const,
        owner_entity_id: behavior.owner_entity_id,
        source_draft_id: behavior.id,
        trigger: behavior.trigger,
        config: behavior.config
      })),
      ...input.draft.capability_configs.map((config) => ({
        id: `config_${config.id}`,
        capability_id: config.capability_id,
        source_kind: 'capability_config' as const,
        applies_to_entity_ids: [...(config.applies_to ?? [])].sort(),
        source_draft_id: config.id,
        config: config.config
      }))
    ].sort(compareById),
    objectives: input.draft.objectives.map((objective) => ({
      id: objective.id,
      kind: objective.kind,
      ...(objective.target === undefined ? {} : { target: objective.target }),
      success_condition: objective.success_condition,
      capability_ids: sortedUnique(objective.capability_refs ?? [])
    })),
    waves: input.draft.waves.map((wave) => ({
      id: wave.id,
      segment_id: wave.segment_id,
      enemy_entity_id: wave.enemy_entity_id,
      count: wave.count,
      spawn: wave.spawn,
      capability_ids: sortedUnique(wave.capability_refs ?? [])
    })),
    pickups: input.draft.pickups.map((pickup) => ({
      id: pickup.id,
      ...(pickup.segment_id === undefined ? {} : { segment_id: pickup.segment_id }),
      ...(pickup.pickup_entity_id === undefined ? {} : { pickup_entity_id: pickup.pickup_entity_id }),
      ...(pickup.count === undefined ? {} : { count: pickup.count }),
      ...(pickup.spawn === undefined ? {} : { spawn: pickup.spawn }),
      capability_ids: sortedUnique(pickup.capability_refs ?? [])
    })),
    bosses: input.draft.bosses.map((boss) => ({
      id: boss.id,
      boss_entity_id: boss.boss_entity_id,
      segment_ids: [...(boss.segment_refs ?? [])],
      phases: boss.phases.map((phase) => ({
        id: phase.id,
        order: phase.order,
        health_threshold_pct: phase.health_threshold_pct,
        pattern: phase.pattern,
        capability_ids: sortedUnique(phase.capability_refs ?? [])
      }))
    })),
    metadata: {
      title: input.draft.metadata.title,
      ...(input.draft.metadata.summary === undefined ? {} : { summary: input.draft.metadata.summary }),
      ...(input.draft.metadata.language === undefined ? {} : { language: input.draft.metadata.language }),
      tags: [...(input.draft.metadata.tags ?? [])].sort()
    }
  };
}

function buildNormalizationReport(input: {
  projectId: string;
  runId: string;
  status: GameDslNormalizationReport['status'];
  source: CanonicalGameDslV02['source'];
  canonicalHash?: string;
  issues: readonly GameDslNormalizationIssue[];
}): GameDslNormalizationReport {
  const payload: Omit<GameDslNormalizationReport, 'reportHash'> = {
    artifactKind: GAME_DSL_NORMALIZATION_REPORT_KIND,
    schemaVersion: GAME_DSL_NORMALIZATION_REPORT_SCHEMA_VERSION,
    projectId: input.projectId,
    runId: input.runId,
    status: input.status,
    rawModelArtifact: {
      dialect: CAPABILITY_GAME_DSL_DRAFT_SCHEMA_VERSION,
      path: CAPABILITY_GAME_DSL_DRAFT_RAW_PATH,
      hash: input.source.draft_hash
    },
    authoritativeArtifact: {
      dialect: CANONICAL_GAME_DSL_V02_SCHEMA_VERSION,
      path: CANONICAL_GAME_DSL_V02_PATH,
      ...(input.canonicalHash === undefined ? {} : { hash: input.canonicalHash })
    },
    legacyArtifacts: [
      {
        dialect: RAW_GAME_DSL_V01_DIALECT,
        path: LEGACY_RAW_GAME_DSL_V01_RAW_PATH,
        role: 'legacy_raw_model_output'
      },
      {
        dialect: LEGACY_GAME_DSL_V1_DIALECT,
        path: LEGACY_GAME_DSL_V1_PATH,
        role: 'legacy_normalized_runtime_dsl'
      }
    ],
    source: input.source,
    issues: [...input.issues].sort((left, right) => `${left.code}:${left.path}:${left.message}`.localeCompare(`${right.code}:${right.path}:${right.message}`))
  };
  return GameDslNormalizationReportSchema.parse({ ...payload, reportHash: hashStableJson(payload) });
}

function hashGameDslNormalizationReportPayload(report: Omit<GameDslNormalizationReport, 'reportHash'> | GameDslNormalizationReport): string {
  const { reportHash: _reportHash, ...payload } = report as GameDslNormalizationReport;
  return hashStableJson(payload);
}

function zodIssues(
  code: GameDslNormalizationIssue['code'],
  result: { success: true } | { success: false; error: z.ZodError }
): GameDslNormalizationIssue[] {
  if (result.success) {
    return [];
  }
  return result.error.issues.map((zodIssue) => issue(code, zodIssue.path.map(String).join('.') || '<root>', zodIssue.message));
}

function issue(code: GameDslNormalizationIssue['code'], path: string, message: string): GameDslNormalizationIssue {
  return { code, path, message };
}

function recomputeGameplayCapabilityLockHash(lock: GameplayCapabilityLock): string {
  const { lockHash: _lockHash, ...payload } = lock;
  return hashStableJson(payload);
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function compareById(left: { id: string }, right: { id: string }): number {
  return left.id.localeCompare(right.id);
}
