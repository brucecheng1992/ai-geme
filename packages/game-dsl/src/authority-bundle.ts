import { z } from 'zod';

import {
  ACTIVE_PROFILE_LOCK_ARTIFACT_KIND,
  ACTIVE_PROFILE_LOCK_PATH,
  ActiveProfileLockSchema,
  type ActiveProfileLock
} from './active-profile-lock.js';
import {
  CANONICAL_GAME_BRIEF_ARTIFACT_KIND,
  CANONICAL_GAME_BRIEF_PATH,
  CanonicalGameBriefArtifactSchema,
  type CanonicalGameBriefArtifact
} from './canonical-game-brief-artifact.js';
import { hashStableJson } from './gameplay-capabilities/stable-json.js';
import {
  GENERATION_SCOPE_PLAN_ARTIFACT_KIND,
  GENERATION_SCOPE_PLAN_PATH
} from './active-profile-lock.js';
import { GenerationScopePlanSchema, type GenerationScopePlan } from './generation-scope-plan.js';
import {
  RAW_GAME_DSL_V01_CONTRACT_STATUS,
  RAW_GAME_DSL_V01_DIALECT
} from './schemas/raw-game-dsl-v0.1.schema.js';
import { parseAndNormalizeGameBrief } from './schemas/game-brief-ingress.js';
import type { GameBrief } from './schemas/game-brief-v0.1.schema.js';
import type { GameBriefV02 } from './schemas/game-brief-v0.2.schema.js';

export const AUTHORITY_BUNDLE_ARTIFACT_KIND = 'authority_bundle';
export const AUTHORITY_BUNDLE_SCHEMA_VERSION = 'step37.authority-bundle.v1';
export const AUTHORITY_BUNDLE_PATH = 'authority_bundle.json';

const ProjectIdSchema = z.string().regex(/^proj_[A-Za-z0-9_-]+$/);
const RunIdSchema = z.string().regex(/^run_[A-Za-z0-9_-]+$/);
const HashSchema = z.string().regex(/^fnv1a_[0-9a-f]{8}$/);

const CanonicalBriefRefSchema = z.strictObject({
  artifactKind: z.literal(CANONICAL_GAME_BRIEF_ARTIFACT_KIND),
  path: z.literal(CANONICAL_GAME_BRIEF_PATH),
  contentHash: HashSchema
});

const GenerationScopePlanRefSchema = z.strictObject({
  artifactKind: z.literal(GENERATION_SCOPE_PLAN_ARTIFACT_KIND),
  path: z.literal(GENERATION_SCOPE_PLAN_PATH),
  contentHash: HashSchema
});

export const ActiveProfileLockRefSchema = z.strictObject({
  artifactKind: z.literal(ACTIVE_PROFILE_LOCK_ARTIFACT_KIND),
  path: z.literal(ACTIVE_PROFILE_LOCK_PATH),
  lockHash: HashSchema
});

export const AuthorityBundleRefSchema = z.strictObject({
  artifactKind: z.literal(AUTHORITY_BUNDLE_ARTIFACT_KIND),
  path: z.literal(AUTHORITY_BUNDLE_PATH),
  bundleHash: HashSchema
});

export const AuthorityBundleSchema = z.strictObject({
  artifactKind: z.literal(AUTHORITY_BUNDLE_ARTIFACT_KIND),
  schemaVersion: z.literal(AUTHORITY_BUNDLE_SCHEMA_VERSION),
  projectId: ProjectIdSchema,
  runId: RunIdSchema,
  selectedPath: z.literal('capability_composed_v1'),
  canonicalBrief: CanonicalGameBriefArtifactSchema,
  generationScopePlan: GenerationScopePlanSchema,
  activeProfileLock: ActiveProfileLockSchema,
  refs: z.strictObject({
    canonicalBrief: CanonicalBriefRefSchema,
    generationScopePlan: GenerationScopePlanRefSchema,
    activeProfileLock: ActiveProfileLockRefSchema
  }),
  rawDslConsumption: z.strictObject({
    mode: z.enum(['complete_active_profile_lock', 'versioned_hash_bound_projection']),
    canonicalBriefRef: CanonicalBriefRefSchema,
    generationScopePlanRef: GenerationScopePlanRefSchema,
    activeProfileLockRef: ActiveProfileLockRefSchema,
    immutableProjection: z.strictObject({
      artifactKind: z.literal('raw_dsl_authority_projection'),
      dialect: z.literal(RAW_GAME_DSL_V01_DIALECT),
      contractStatus: z.literal(RAW_GAME_DSL_V01_CONTRACT_STATUS),
      canonicalBriefHash: HashSchema,
      generationScopePlanHash: HashSchema,
      activeProfileLockHash: HashSchema
    }).optional()
  }),
  bundleHash: HashSchema
});

export type AuthorityBundle = z.infer<typeof AuthorityBundleSchema>;
export type AuthorityBundleRef = z.infer<typeof AuthorityBundleRefSchema>;
export type ActiveProfileLockRef = z.infer<typeof ActiveProfileLockRefSchema>;

export type BuildAuthorityBundleResult =
  | { ok: true; value: AuthorityBundle }
  | { ok: false; issues: string[] };

/**
 * Binds canonical brief, scope plan, and active profile lock into one hash-bound
 * authority object. Production Raw DSL and compiler entry points should receive
 * this bundle instead of constructing authority context from loose refs.
 */
export function buildAuthorityBundle(input: {
  projectId: string;
  runId: string;
  canonicalBrief: CanonicalGameBriefArtifact;
  generationScopePlan: GenerationScopePlan;
  activeProfileLock: ActiveProfileLock;
}): BuildAuthorityBundleResult {
  const canonicalBrief = CanonicalGameBriefArtifactSchema.parse(input.canonicalBrief);
  const generationScopePlan = GenerationScopePlanSchema.parse(input.generationScopePlan);
  const activeProfileLock = ActiveProfileLockSchema.parse(input.activeProfileLock);
  const canonicalBriefHash = canonicalBrief.contentHash;
  const generationScopePlanHash = hashStableJson(generationScopePlan);
  const activeProfileLockHash = activeProfileLock.lockHash;
  const canonicalBriefRef = {
    artifactKind: CANONICAL_GAME_BRIEF_ARTIFACT_KIND,
    path: CANONICAL_GAME_BRIEF_PATH,
    contentHash: canonicalBriefHash
  } as const;
  const generationScopePlanRef = {
    artifactKind: GENERATION_SCOPE_PLAN_ARTIFACT_KIND,
    path: GENERATION_SCOPE_PLAN_PATH,
    contentHash: generationScopePlanHash
  } as const;
  const activeProfileLockRef = {
    artifactKind: ACTIVE_PROFILE_LOCK_ARTIFACT_KIND,
    path: ACTIVE_PROFILE_LOCK_PATH,
    lockHash: activeProfileLockHash
  } as const;
  const rawDslConsumption =
    activeProfileLock.profileSupportStatus === 'capability_complete_supported' ||
    activeProfileLock.profileSupportStatus === 'active_profile_supported'
      ? {
          mode: 'complete_active_profile_lock' as const,
          canonicalBriefRef,
          generationScopePlanRef,
          activeProfileLockRef
        }
      : {
          mode: 'versioned_hash_bound_projection' as const,
          canonicalBriefRef,
          generationScopePlanRef,
          activeProfileLockRef,
          immutableProjection: {
            artifactKind: 'raw_dsl_authority_projection' as const,
            dialect: RAW_GAME_DSL_V01_DIALECT,
            contractStatus: RAW_GAME_DSL_V01_CONTRACT_STATUS,
            canonicalBriefHash,
            generationScopePlanHash,
            activeProfileLockHash
          }
        };
  const payload: Omit<AuthorityBundle, 'bundleHash'> = {
    artifactKind: AUTHORITY_BUNDLE_ARTIFACT_KIND,
    schemaVersion: AUTHORITY_BUNDLE_SCHEMA_VERSION,
    projectId: input.projectId,
    runId: input.runId,
    selectedPath: 'capability_composed_v1',
    canonicalBrief,
    generationScopePlan,
    activeProfileLock,
    refs: {
      canonicalBrief: canonicalBriefRef,
      generationScopePlan: generationScopePlanRef,
      activeProfileLock: activeProfileLockRef
    },
    rawDslConsumption
  };
  const candidate = AuthorityBundleSchema.parse({ ...payload, bundleHash: hashStableJson(payload) });
  const validation = validateAuthorityBundleForRun({
    projectId: input.projectId,
    runId: input.runId,
    bundle: candidate,
    brief: canonicalBrief.canonicalBrief
  });

  return validation.ok ? { ok: true, value: candidate } : validation;
}

export function authorityBundleRef(bundle: AuthorityBundle): AuthorityBundleRef {
  const parsed = AuthorityBundleSchema.parse(bundle);
  return {
    artifactKind: AUTHORITY_BUNDLE_ARTIFACT_KIND,
    path: AUTHORITY_BUNDLE_PATH,
    bundleHash: parsed.bundleHash
  };
}

export function validateAuthorityBundleForRun(input: {
  projectId: string;
  runId: string;
  bundle: unknown;
  brief?: GameBrief | GameBriefV02;
}): { ok: true; value: AuthorityBundle } | { ok: false; issues: string[] } {
  const parsed = AuthorityBundleSchema.safeParse(input.bundle);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => `authorityBundle.${issue.path.map(String).join('.') || '<root>'}: ${issue.message}`)
    };
  }

  const bundle = parsed.data;
  const canonicalBriefHash = hashStableJson(bundle.canonicalBrief.canonicalBrief);
  const generationScopePlanHash = hashStableJson(bundle.generationScopePlan);
  const activeProfileLockHash = recomputeActiveProfileLockHash(bundle.activeProfileLock);
  const bundleHash = recomputeAuthorityBundleHash(bundle);
  const issues = [
    ...(bundle.projectId === input.projectId ? [] : [`authorityBundle.projectId: expected ${input.projectId}, received ${bundle.projectId}`]),
    ...(bundle.runId === input.runId ? [] : [`authorityBundle.runId: expected ${input.runId}, received ${bundle.runId}`]),
    ...(bundle.bundleHash === bundleHash ? [] : ['authorityBundle.bundleHash: hash does not match bundle payload']),
    ...(bundle.canonicalBrief.projectId === input.projectId ? [] : ['canonicalBrief.projectId: does not match current project']),
    ...(bundle.canonicalBrief.runId === input.runId ? [] : ['canonicalBrief.runId: does not match current run']),
    ...(bundle.canonicalBrief.contentHash === canonicalBriefHash ? [] : ['canonicalBrief.contentHash: does not match canonicalBrief payload']),
    ...(bundle.generationScopePlan.requestedPlayTime.mode === bundle.canonicalBrief.canonicalBrief.play_time_intent.mode
      ? []
      : ['generationScopePlan.requestedPlayTime: mode does not match canonical brief play_time_intent']),
    ...(hashStableJson(bundle.generationScopePlan.requestedPlayTime) === hashStableJson(bundle.canonicalBrief.canonicalBrief.play_time_intent)
      ? []
      : ['generationScopePlan.requestedPlayTime: does not match canonical brief play_time_intent']),
    ...(bundle.activeProfileLock.projectId === input.projectId ? [] : ['activeProfileLock.projectId: does not match current project']),
    ...(bundle.activeProfileLock.runId === input.runId ? [] : ['activeProfileLock.runId: does not match current run']),
    ...(bundle.activeProfileLock.lockHash === activeProfileLockHash ? [] : ['activeProfileLock.lockHash: hash does not match lock payload']),
    ...compareCanonicalBriefRef('refs.canonicalBrief', bundle.refs.canonicalBrief, canonicalBriefHash),
    ...compareGenerationScopePlanRef('refs.generationScopePlan', bundle.refs.generationScopePlan, generationScopePlanHash),
    ...compareActiveProfileLockRef('refs.activeProfileLock', bundle.refs.activeProfileLock, activeProfileLockHash),
    ...compareCanonicalBriefRef('activeProfileLock.canonicalBriefRef', bundle.activeProfileLock.canonicalBriefRef, canonicalBriefHash),
    ...compareGenerationScopePlanRef('activeProfileLock.generationScopePlanRef', bundle.activeProfileLock.generationScopePlanRef, generationScopePlanHash),
    ...compareCanonicalBriefRef('rawDslConsumption.canonicalBriefRef', bundle.rawDslConsumption.canonicalBriefRef, canonicalBriefHash),
    ...compareGenerationScopePlanRef('rawDslConsumption.generationScopePlanRef', bundle.rawDslConsumption.generationScopePlanRef, generationScopePlanHash),
    ...compareActiveProfileLockRef('rawDslConsumption.activeProfileLockRef', bundle.rawDslConsumption.activeProfileLockRef, activeProfileLockHash),
    ...validateRawDslConsumptionMode(bundle, canonicalBriefHash, generationScopePlanHash, activeProfileLockHash),
    ...validateBriefInput(input.brief, canonicalBriefHash)
  ];

  return issues.length === 0 ? { ok: true, value: bundle } : { ok: false, issues };
}

function recomputeAuthorityBundleHash(bundle: AuthorityBundle): string {
  const { bundleHash: _bundleHash, ...payload } = bundle;
  return hashStableJson(payload);
}

function recomputeActiveProfileLockHash(lock: ActiveProfileLock): string {
  const { lockHash: _lockHash, ...payload } = lock;
  return hashStableJson(payload);
}

function compareCanonicalBriefRef(
  path: string,
  ref: { artifactKind: string; path: string; contentHash: string },
  expectedHash: string
): string[] {
  return [
    ...(ref.artifactKind === CANONICAL_GAME_BRIEF_ARTIFACT_KIND ? [] : [`${path}.artifactKind: expected ${CANONICAL_GAME_BRIEF_ARTIFACT_KIND}`]),
    ...(ref.path === CANONICAL_GAME_BRIEF_PATH ? [] : [`${path}.path: expected ${CANONICAL_GAME_BRIEF_PATH}`]),
    ...(ref.contentHash === expectedHash ? [] : [`${path}.contentHash: expected ${expectedHash}, received ${ref.contentHash}`])
  ];
}

function compareGenerationScopePlanRef(
  path: string,
  ref: { artifactKind: string; path: string; contentHash: string },
  expectedHash: string
): string[] {
  return [
    ...(ref.artifactKind === GENERATION_SCOPE_PLAN_ARTIFACT_KIND ? [] : [`${path}.artifactKind: expected ${GENERATION_SCOPE_PLAN_ARTIFACT_KIND}`]),
    ...(ref.path === GENERATION_SCOPE_PLAN_PATH ? [] : [`${path}.path: expected ${GENERATION_SCOPE_PLAN_PATH}`]),
    ...(ref.contentHash === expectedHash ? [] : [`${path}.contentHash: expected ${expectedHash}, received ${ref.contentHash}`])
  ];
}

function compareActiveProfileLockRef(
  path: string,
  ref: { artifactKind: string; path: string; lockHash: string },
  expectedHash: string
): string[] {
  return [
    ...(ref.artifactKind === ACTIVE_PROFILE_LOCK_ARTIFACT_KIND ? [] : [`${path}.artifactKind: expected ${ACTIVE_PROFILE_LOCK_ARTIFACT_KIND}`]),
    ...(ref.path === ACTIVE_PROFILE_LOCK_PATH ? [] : [`${path}.path: expected ${ACTIVE_PROFILE_LOCK_PATH}`]),
    ...(ref.lockHash === expectedHash ? [] : [`${path}.lockHash: expected ${expectedHash}, received ${ref.lockHash}`])
  ];
}

function validateRawDslConsumptionMode(
  bundle: AuthorityBundle,
  canonicalBriefHash: string,
  generationScopePlanHash: string,
  activeProfileLockHash: string
): string[] {
  if (bundle.rawDslConsumption.mode === 'complete_active_profile_lock') {
    return [
      ...(bundle.activeProfileLock.profileSupportStatus === 'capability_complete_supported'
      || bundle.activeProfileLock.profileSupportStatus === 'active_profile_supported'
        ? []
        : ['rawDslConsumption.mode: complete_active_profile_lock requires active or complete profile support']),
      ...(bundle.rawDslConsumption.immutableProjection === undefined
        ? []
        : ['rawDslConsumption.immutableProjection: must be omitted for complete active lock consumption'])
    ];
  }

  const projection = bundle.rawDslConsumption.immutableProjection;
  if (projection === undefined) {
    return ['rawDslConsumption.immutableProjection: required for versioned_hash_bound_projection'];
  }

  return [
    ...(bundle.activeProfileLock.profileSupportStatus === 'legacy_runtime_supported'
      ? []
      : ['rawDslConsumption.mode: versioned_hash_bound_projection requires legacy_runtime_supported profile']),
    ...(projection.canonicalBriefHash === canonicalBriefHash ? [] : ['rawDslConsumption.immutableProjection.canonicalBriefHash: mismatch']),
    ...(projection.generationScopePlanHash === generationScopePlanHash ? [] : ['rawDslConsumption.immutableProjection.generationScopePlanHash: mismatch']),
    ...(projection.activeProfileLockHash === activeProfileLockHash ? [] : ['rawDslConsumption.immutableProjection.activeProfileLockHash: mismatch'])
  ];
}

function validateBriefInput(brief: GameBrief | GameBriefV02 | undefined, expectedHash: string): string[] {
  if (brief === undefined) {
    return [];
  }

  try {
    const canonical = parseAndNormalizeGameBrief(brief).canonical;
    const actualHash = hashStableJson(canonical);
    return actualHash === expectedHash
      ? []
      : [`brief: does not match authority bundle canonical brief hash ${expectedHash}`];
  } catch (error) {
    return [`brief: ${error instanceof Error ? error.message : 'failed to parse brief'}`];
  }
}
