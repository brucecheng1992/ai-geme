import {
  CAPABILITY_GAME_DSL_DRAFT_ARTIFACT_KIND,
  CAPABILITY_GAME_DSL_DRAFT_SCHEMA_VERSION,
  CapabilityGameDslDraftV1Schema,
  type CapabilityGameDslDraftV1
} from './schemas/capability-game-dsl-draft-v1.schema.js';
import { hashStableJson } from './gameplay-capabilities/stable-json.js';
import { type Step37ComposedDslSchemaReport } from './step37-composed-dsl-schema.js';
import {
  STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
  STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID
} from './step37-remaining-inventory-driver.js';

export const STEP37_STAGE6_CAPABILITY_DSL_DRAFT_ARTIFACT_KIND = 'step37_capability_dsl_draft_from_composed_schema';
export const STEP37_STAGE6_CAPABILITY_DSL_DRAFT_SCHEMA_VERSION = 'step37_capability_dsl_draft_from_composed_schema.v0.1';

export type Step37CapabilityDslDraftStatus = 'passed' | 'blocked';

export type Step37CapabilityDslDraftBlocker = {
  errorCode:
    | 'STAGE6_CAPABILITY_DSL_DRAFT_COMPOSED_SCHEMA_AUDIT_HASH_MISMATCH'
    | 'STAGE6_CAPABILITY_DSL_DRAFT_COMPOSED_SCHEMA_NOT_PASSED'
    | 'STAGE6_CAPABILITY_DSL_DRAFT_COMPOSED_SCHEMA_HASH_MISMATCH'
    | 'STAGE6_CAPABILITY_DSL_DRAFT_SCHEMA_INVALID'
    | 'STAGE6_CAPABILITY_DSL_DRAFT_PROFILE_MISMATCH'
    | 'STAGE6_CAPABILITY_DSL_DRAFT_CAPABILITY_IDS_MISMATCH'
    | 'STAGE6_CAPABILITY_DSL_DRAFT_PROVIDER_CLAIM_PREMATURE'
    | 'STAGE6_CAPABILITY_DSL_DRAFT_NORMALIZATION_PREMATURE'
    | 'STAGE6_CAPABILITY_DSL_DRAFT_COMPILATION_PREMATURE'
    | 'STAGE6_CAPABILITY_DSL_DRAFT_RUNTIME_CONSUMPTION_PREMATURE'
    | 'STAGE6_CAPABILITY_DSL_DRAFT_QA_OBSERVATION_PREMATURE'
    | 'STAGE6_CAPABILITY_DSL_DRAFT_PRODUCTION_CUTOVER_PREMATURE'
    | 'STAGE6_CAPABILITY_DSL_DRAFT_LEGACY_AUTHORITY_EXIT_PREMATURE'
    | 'STAGE6_CAPABILITY_DSL_DRAFT_FINAL_CLOSURE_PREMATURE';
  capabilityIds: string[];
  actual?: string | number | boolean | null;
  expected?: string | number | boolean | null;
};

export type Step37CapabilityDslDraftReport = {
  artifactKind: typeof STEP37_STAGE6_CAPABILITY_DSL_DRAFT_ARTIFACT_KIND;
  schemaVersion: typeof STEP37_STAGE6_CAPABILITY_DSL_DRAFT_SCHEMA_VERSION;
  checkpointId: typeof STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID;
  parentStageId: 'stage6';
  sourceComposedSchemaPath: string;
  sourceComposedSchemaAuditHash: string;
  expectedComposedSchemaAuditHash: string;
  composedSchemaAuditHashMatches: boolean;
  sourceComposedSchemaHash: string | null;
  sourceExactCapabilityLockAuditHash: string;
  sourceExactCapabilityLockHash: string | null;
  sourceStage5EntryAuditHash: string;
  sourceStage4ExitAuditHash: string;
  sourceSupportViewHash: string;
  sourceInventoryHash: string;
  profileId: Step37ComposedDslSchemaReport['profileId'];
  draftProfileId: string;
  profileVersion: Step37ComposedDslSchemaReport['profileVersion'];
  runtimeFamily: Step37ComposedDslSchemaReport['runtimeFamily'];
  composedSchemaStatus: Step37ComposedDslSchemaReport['composedSchemaStatus'];
  composedSchemaProduced: boolean;
  composedSchemaNextCheckpointId: Step37ComposedDslSchemaReport['nextCheckpointId'];
  requiredCapabilityCount: number;
  completeSupportedCount: number;
  packageCount: number;
  completeSupportedCapabilityIds: string[];
  composedSchemaCapabilityIds: string[];
  draftCapabilityIds: string[];
  capabilityDslDraft: CapabilityGameDslDraftV1 | null;
  draftHash: string | null;
  draftStatus: Step37CapabilityDslDraftStatus;
  capabilityDslDraftProduced: boolean;
  schemaExpressible: boolean;
  providerDraftProduced: boolean;
  normalized: boolean;
  compiled: boolean;
  runtimeConsumed: boolean;
  qaObserved: boolean;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
  globalExitConditionsMet: false;
  parentStageStatusAfterDraft: 'running' | 'complete';
  nextCheckpointId: typeof STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID | null;
  blockers: Step37CapabilityDslDraftBlocker[];
  auditHash: string;
};

export function buildStep37CapabilityDslDraftReport(input: {
  composedSchemaReport: Step37ComposedDslSchemaReport;
  sourceComposedSchemaPath: string;
  sourceComposedSchemaAuditHash: string;
  expectedComposedSchemaAuditHash: string;
  capabilityDslDraft?: unknown;
  providerDraftProduced?: boolean;
  normalized?: boolean;
  compiled?: boolean;
  runtimeConsumed?: boolean;
  qaObserved?: boolean;
  productionDefaultCutoverActive?: boolean;
  legacyAuthoritativePathExited?: boolean;
  finalClosureNotBlocked?: boolean;
}): Step37CapabilityDslDraftReport {
  const sourceComposedSchemaPath = requireNonEmpty(input.sourceComposedSchemaPath, 'sourceComposedSchemaPath');
  const sourceComposedSchemaAuditHash = requireNonEmpty(input.sourceComposedSchemaAuditHash, 'sourceComposedSchemaAuditHash');
  const expectedComposedSchemaAuditHash = requireNonEmpty(input.expectedComposedSchemaAuditHash, 'expectedComposedSchemaAuditHash');
  const providerDraftProduced = input.providerDraftProduced ?? false;
  const normalized = input.normalized ?? false;
  const compiled = input.compiled ?? false;
  const runtimeConsumed = input.runtimeConsumed ?? false;
  const qaObserved = input.qaObserved ?? false;
  const productionDefaultCutoverActive = input.productionDefaultCutoverActive ?? false;
  const legacyAuthoritativePathExited = input.legacyAuthoritativePathExited ?? false;
  const finalClosureNotBlocked = input.finalClosureNotBlocked ?? false;
  const expectedCapabilityIds = [...input.composedSchemaReport.completeSupportedCapabilityIds].sort();
  const composedSchemaCapabilityIds = input.composedSchemaReport.composedSchemaIdentity?.capabilityIds ?? [];
  const draftCandidate = input.capabilityDslDraft ?? buildCapabilityDslDraftFromComposedSchema({
    draftProfileId: input.composedSchemaReport.draftProfileId,
    capabilityIds: expectedCapabilityIds
  });
  const parsedDraft = CapabilityGameDslDraftV1Schema.safeParse(draftCandidate);
  const capabilityDslDraft = parsedDraft.success ? parsedDraft.data : null;
  const draftCapabilityIds = capabilityDslDraft?.capabilities !== undefined ? [...capabilityDslDraft.capabilities].sort() : [];
  const blockers = buildCapabilityDslDraftBlockers({
    composedSchemaReport: input.composedSchemaReport,
    sourceComposedSchemaAuditHash,
    expectedComposedSchemaAuditHash,
    expectedCapabilityIds,
    composedSchemaCapabilityIds,
    capabilityDslDraft,
    draftCapabilityIds,
    draftSchemaValid: parsedDraft.success,
    providerDraftProduced,
    normalized,
    compiled,
    runtimeConsumed,
    qaObserved,
    productionDefaultCutoverActive,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked
  });
  const draftStatus: Step37CapabilityDslDraftStatus = blockers.length === 0 && capabilityDslDraft !== null ? 'passed' : 'blocked';
  const payloadWithoutHash: Omit<Step37CapabilityDslDraftReport, 'auditHash'> = {
    artifactKind: STEP37_STAGE6_CAPABILITY_DSL_DRAFT_ARTIFACT_KIND,
    schemaVersion: STEP37_STAGE6_CAPABILITY_DSL_DRAFT_SCHEMA_VERSION,
    checkpointId: STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
    parentStageId: 'stage6',
    sourceComposedSchemaPath,
    sourceComposedSchemaAuditHash,
    expectedComposedSchemaAuditHash,
    composedSchemaAuditHashMatches: sourceComposedSchemaAuditHash === expectedComposedSchemaAuditHash,
    sourceComposedSchemaHash: input.composedSchemaReport.composedSchemaHash,
    sourceExactCapabilityLockAuditHash: input.composedSchemaReport.sourceExactCapabilityLockAuditHash,
    sourceExactCapabilityLockHash: input.composedSchemaReport.sourceExactCapabilityLockHash,
    sourceStage5EntryAuditHash: input.composedSchemaReport.sourceStage5EntryAuditHash,
    sourceStage4ExitAuditHash: input.composedSchemaReport.sourceStage4ExitAuditHash,
    sourceSupportViewHash: input.composedSchemaReport.sourceSupportViewHash,
    sourceInventoryHash: input.composedSchemaReport.sourceInventoryHash,
    profileId: input.composedSchemaReport.profileId,
    draftProfileId: input.composedSchemaReport.draftProfileId,
    profileVersion: input.composedSchemaReport.profileVersion,
    runtimeFamily: input.composedSchemaReport.runtimeFamily,
    composedSchemaStatus: input.composedSchemaReport.composedSchemaStatus,
    composedSchemaProduced: input.composedSchemaReport.composedSchemaProduced,
    composedSchemaNextCheckpointId: input.composedSchemaReport.nextCheckpointId,
    requiredCapabilityCount: input.composedSchemaReport.requiredCapabilityCount,
    completeSupportedCount: input.composedSchemaReport.completeSupportedCount,
    packageCount: input.composedSchemaReport.packageCount,
    completeSupportedCapabilityIds: expectedCapabilityIds,
    composedSchemaCapabilityIds: [...composedSchemaCapabilityIds].sort(),
    draftCapabilityIds,
    capabilityDslDraft: draftStatus === 'passed' ? capabilityDslDraft : null,
    draftHash: draftStatus === 'passed' ? hashStableJson(capabilityDslDraft) : null,
    draftStatus,
    capabilityDslDraftProduced: draftStatus === 'passed',
    schemaExpressible: draftStatus === 'passed',
    providerDraftProduced,
    normalized,
    compiled,
    runtimeConsumed,
    qaObserved,
    productionDefaultCutoverActive,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked,
    globalExitConditionsMet: false,
    parentStageStatusAfterDraft: draftStatus === 'passed' ? 'running' : 'complete',
    nextCheckpointId: draftStatus === 'passed' ? STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID : null,
    blockers
  };
  return { ...payloadWithoutHash, auditHash: hashStableJson(payloadWithoutHash) };
}

function buildCapabilityDslDraftFromComposedSchema(input: { draftProfileId: string; capabilityIds: readonly string[] }): CapabilityGameDslDraftV1 {
  const capabilityIds = [...input.capabilityIds].sort();
  const capabilityChunks = chunk(capabilityIds, 20);
  const capabilitySet = new Set(capabilityIds);
  return CapabilityGameDslDraftV1Schema.parse({
    artifactKind: CAPABILITY_GAME_DSL_DRAFT_ARTIFACT_KIND,
    schemaVersion: CAPABILITY_GAME_DSL_DRAFT_SCHEMA_VERSION,
    profile: { id: input.draftProfileId },
    play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 },
    capabilities: capabilityIds,
    progression: {
      estimated_total_sec: { min_sec: 480, max_sec: 720 },
      segments: [
        {
          id: 'approach',
          order: 0,
          label: 'Capability approach',
          duration_target_sec: { min_sec: 160, max_sec: 240 },
          capability_refs: capabilityChunks[0] ?? capabilityIds.slice(0, 1)
        },
        {
          id: 'escalation',
          order: 1,
          label: 'Capability escalation',
          duration_target_sec: { min_sec: 160, max_sec: 240 },
          capability_refs: capabilityChunks[1] ?? capabilityIds.slice(0, 1)
        },
        {
          id: 'finale',
          order: 2,
          label: 'Capability finale',
          duration_target_sec: { min_sec: 160, max_sec: 240 },
          capability_refs: capabilityChunks[2] ?? capabilityIds.slice(0, 1)
        }
      ]
    },
    scenes: [
      {
        id: 'main_scene',
        segment_refs: ['approach', 'escalation', 'finale'],
        entity_refs: ['player', 'side_camera', 'ground', 'rifle_soldier', 'flying_enemy', 'turret_enemy', 'weapon_pickup', 'hazard_zone', 'boss_core', 'hud']
      }
    ],
    entities: [
      { id: 'player', role: 'player', label: 'Player', capability_refs: capabilityChunks[0] ?? capabilityIds.slice(0, 1) },
      withCapabilityRefs({ id: 'side_camera', role: 'camera', label: 'Side camera' }, capabilitySet, ['camera.side_follow.v1']),
      withCapabilityRefs({ id: 'ground', role: 'terrain', label: 'Ground' }, capabilitySet, ['collision.platform.v1']),
      withCapabilityRefs({ id: 'rifle_soldier', role: 'enemy', label: 'Rifle soldier' }, capabilitySet, [
        'enemy.patrol_infantry.v1',
        'combat.projectile.v1'
      ]),
      withCapabilityRefs({ id: 'flying_enemy', role: 'enemy', label: 'Flying enemy' }, capabilitySet, ['enemy.flying_right_entry.v1']),
      withCapabilityRefs({ id: 'turret_enemy', role: 'enemy', label: 'Fixed turret' }, capabilitySet, ['enemy.fixed_turret.v1']),
      withCapabilityRefs({ id: 'weapon_pickup', role: 'pickup', label: 'Weapon pickup' }, capabilitySet, ['pickup.weapon_supply.v1']),
      withCapabilityRefs({ id: 'hazard_zone', role: 'hazard', label: 'Hazard zone' }, capabilitySet, [
        'hazard.falling_area.v1',
        'hazard.timed_explosion.v1'
      ]),
      withCapabilityRefs({ id: 'boss_core', role: 'boss', label: 'Boss core' }, capabilitySet, ['enemy.boss_lifecycle.v1', 'goal.boss_unlock.v1']),
      withCapabilityRefs({ id: 'hud', role: 'ui', label: 'HUD' }, capabilitySet, [
        'ui.hud_player_health.v1',
        'ui.hud_current_weapon.v1',
        'ui.hud_boss_health.v1'
      ])
    ],
    behaviors: buildDraftBehaviors(capabilitySet),
    waves: [
      withCapabilityRefs({
        id: 'wave_approach',
        segment_id: 'approach',
        enemy_entity_id: 'rifle_soldier',
        count: 4,
        spawn: { side: 'right', lane: 'ground' }
      }, capabilitySet, ['spawn.enemy_wave.v1', 'enemy.patrol_infantry.v1']),
      withCapabilityRefs({
        id: 'wave_flying',
        segment_id: 'escalation',
        enemy_entity_id: 'flying_enemy',
        count: 3,
        spawn: { side: 'right', lane: 'air' }
      }, capabilitySet, ['enemy.flying_right_entry.v1'])
    ],
    pickups: [
      withCapabilityRefs({
        id: 'weapon_supply_pickup',
        segment_id: 'escalation',
        pickup_entity_id: 'weapon_pickup',
        count: 1,
        spawn: { lane: 'ground', after_wave: 'wave_approach' }
      }, capabilitySet, ['pickup.weapon_supply.v1', 'weapon.spread_shot.v1'])
    ],
    objectives: [
      withCapabilityRefs({
        id: 'survive_goal',
        kind: 'survive_duration',
        target: { min_sec: 480 },
        success_condition: { event: 'timer.reached', min_sec: 480 }
      }, capabilitySet, ['validation.user_acceptance_gate.v1', 'feedback.victory_declaration.v1']),
      withCapabilityRefs({
        id: 'boss_goal',
        kind: 'boss_defeated',
        target: { boss_entity_id: 'boss_core' },
        success_condition: { event: 'boss.defeated', boss_entity_id: 'boss_core' }
      }, capabilitySet, ['goal.boss_unlock.v1', 'spawn.stop_on_boss_defeat.v1'])
    ],
    bosses: [
      {
        id: 'boss_core_plan',
        boss_entity_id: 'boss_core',
        segment_refs: ['finale'],
        phases: [
          {
            id: 'boss_phase_opening',
            order: 0,
            health_threshold_pct: 100,
            ...withCapabilityRefs({ pattern: { attack: 'projectile_burst', cadence_ms: 1400 } }, capabilitySet, ['enemy.boss_attack_pattern.v1'])
          },
          {
            id: 'boss_phase_finale',
            order: 1,
            health_threshold_pct: 50,
            ...withCapabilityRefs({ pattern: { attack: 'projectile_burst_fast', cadence_ms: 850 } }, capabilitySet, ['enemy.boss_phase_transition.v1'])
          }
        ]
      }
    ],
    capability_configs: capabilityIds.map((capabilityId) => ({
      id: toCapabilityConfigId(capabilityId),
      capability_id: capabilityId,
      config: {
        enabled: true,
        design_note: 'declared_by_stage6_capability_dsl_draft'
      }
    })),
    metadata: {
      title: 'Step37 capability DSL draft',
      summary: 'Deterministic draft artifact produced from the exact Step37 composed schema capability set.',
      language: 'en-US',
      tags: ['step37', 'capability_draft']
    }
  });
}

function buildDraftBehaviors(capabilitySet: ReadonlySet<string>): CapabilityGameDslDraftV1['behaviors'] {
  const behaviors: CapabilityGameDslDraftV1['behaviors'] = [];
  if (capabilitySet.has('combat.projectile.v1')) {
    behaviors.push({
      id: 'player_primary_fire',
      owner_entity_id: 'player',
      capability_id: 'combat.projectile.v1',
      trigger: { event: 'input.fire', cadence_ms: 240 },
      config: { action: 'spawn_projectile', projectile_style: 'straight' }
    });
  }
  if (capabilitySet.has('movement.crouch.v1')) {
    behaviors.push({
      id: 'player_crouch_state',
      owner_entity_id: 'player',
      capability_id: 'movement.crouch.v1',
      trigger: { event: 'input.down' },
      config: { posture: 'crouch', height_scale: 0.58 }
    });
  }
  return behaviors;
}

function withCapabilityRefs<T extends Record<string, unknown>>(value: T, capabilitySet: ReadonlySet<string>, capabilityIds: readonly string[]): T {
  const capabilityRefs = capabilityIds.filter((capabilityId) => capabilitySet.has(capabilityId));
  if (capabilityRefs.length === 0) {
    return value;
  }
  return { ...value, capability_refs: capabilityRefs } as T;
}

function buildCapabilityDslDraftBlockers(input: {
  composedSchemaReport: Step37ComposedDslSchemaReport;
  sourceComposedSchemaAuditHash: string;
  expectedComposedSchemaAuditHash: string;
  expectedCapabilityIds: readonly string[];
  composedSchemaCapabilityIds: readonly string[];
  capabilityDslDraft: CapabilityGameDslDraftV1 | null;
  draftCapabilityIds: readonly string[];
  draftSchemaValid: boolean;
  providerDraftProduced: boolean;
  normalized: boolean;
  compiled: boolean;
  runtimeConsumed: boolean;
  qaObserved: boolean;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
}): Step37CapabilityDslDraftBlocker[] {
  const blockers: Step37CapabilityDslDraftBlocker[] = [];

  if (input.sourceComposedSchemaAuditHash !== input.expectedComposedSchemaAuditHash) {
    blockers.push({
      errorCode: 'STAGE6_CAPABILITY_DSL_DRAFT_COMPOSED_SCHEMA_AUDIT_HASH_MISMATCH',
      capabilityIds: [],
      actual: input.sourceComposedSchemaAuditHash,
      expected: input.expectedComposedSchemaAuditHash
    });
  }
  if (
    input.composedSchemaReport.composedSchemaStatus !== 'passed' ||
    !input.composedSchemaReport.composedSchemaProduced ||
    input.composedSchemaReport.composedSchemaIdentity === null ||
    input.composedSchemaReport.composedSchemaHash === null ||
    input.composedSchemaReport.parentStageStatusAfterSchema !== 'running'
  ) {
    blockers.push({
      errorCode: 'STAGE6_CAPABILITY_DSL_DRAFT_COMPOSED_SCHEMA_NOT_PASSED',
      capabilityIds: [...input.expectedCapabilityIds],
      actual: input.composedSchemaReport.composedSchemaStatus,
      expected: 'passed'
    });
  }
  if (input.composedSchemaReport.composedSchemaHash !== input.composedSchemaReport.composedSchemaIdentity?.schemaHash) {
    blockers.push({
      errorCode: 'STAGE6_CAPABILITY_DSL_DRAFT_COMPOSED_SCHEMA_HASH_MISMATCH',
      capabilityIds: [...input.expectedCapabilityIds],
      actual: input.composedSchemaReport.composedSchemaHash,
      expected: input.composedSchemaReport.composedSchemaIdentity?.schemaHash ?? null
    });
  }
  if (!input.draftSchemaValid || input.capabilityDslDraft === null) {
    blockers.push({
      errorCode: 'STAGE6_CAPABILITY_DSL_DRAFT_SCHEMA_INVALID',
      capabilityIds: [...input.expectedCapabilityIds],
      actual: null,
      expected: 'valid_capability_game_dsl_draft_v1'
    });
  }
  if (input.capabilityDslDraft !== null && input.capabilityDslDraft.profile.id !== input.composedSchemaReport.draftProfileId) {
    blockers.push({
      errorCode: 'STAGE6_CAPABILITY_DSL_DRAFT_PROFILE_MISMATCH',
      capabilityIds: [...input.expectedCapabilityIds],
      actual: input.capabilityDslDraft.profile.id,
      expected: input.composedSchemaReport.draftProfileId
    });
  }
  if (!sameStringSet(input.expectedCapabilityIds, input.composedSchemaCapabilityIds) || !sameStringSet(input.expectedCapabilityIds, input.draftCapabilityIds)) {
    blockers.push({
      errorCode: 'STAGE6_CAPABILITY_DSL_DRAFT_CAPABILITY_IDS_MISMATCH',
      capabilityIds: symmetricDifference(input.expectedCapabilityIds, input.draftCapabilityIds.length > 0 ? input.draftCapabilityIds : input.composedSchemaCapabilityIds)
    });
  }
  if (input.providerDraftProduced) {
    blockers.push({ errorCode: 'STAGE6_CAPABILITY_DSL_DRAFT_PROVIDER_CLAIM_PREMATURE', capabilityIds: [], actual: true, expected: false });
  }
  if (input.normalized) {
    blockers.push({ errorCode: 'STAGE6_CAPABILITY_DSL_DRAFT_NORMALIZATION_PREMATURE', capabilityIds: [], actual: true, expected: false });
  }
  if (input.compiled) {
    blockers.push({ errorCode: 'STAGE6_CAPABILITY_DSL_DRAFT_COMPILATION_PREMATURE', capabilityIds: [], actual: true, expected: false });
  }
  if (input.runtimeConsumed) {
    blockers.push({ errorCode: 'STAGE6_CAPABILITY_DSL_DRAFT_RUNTIME_CONSUMPTION_PREMATURE', capabilityIds: [], actual: true, expected: false });
  }
  if (input.qaObserved) {
    blockers.push({ errorCode: 'STAGE6_CAPABILITY_DSL_DRAFT_QA_OBSERVATION_PREMATURE', capabilityIds: [], actual: true, expected: false });
  }
  if (input.productionDefaultCutoverActive) {
    blockers.push({ errorCode: 'STAGE6_CAPABILITY_DSL_DRAFT_PRODUCTION_CUTOVER_PREMATURE', capabilityIds: [], actual: true, expected: false });
  }
  if (input.legacyAuthoritativePathExited) {
    blockers.push({ errorCode: 'STAGE6_CAPABILITY_DSL_DRAFT_LEGACY_AUTHORITY_EXIT_PREMATURE', capabilityIds: [], actual: true, expected: false });
  }
  if (input.finalClosureNotBlocked) {
    blockers.push({ errorCode: 'STAGE6_CAPABILITY_DSL_DRAFT_FINAL_CLOSURE_PREMATURE', capabilityIds: [], actual: true, expected: false });
  }
  return blockers;
}

function toCapabilityConfigId(capabilityId: string): string {
  return `cfg_${capabilityId.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`.slice(0, 80);
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.length === sortedRight.length && sortedLeft.every((value, index) => value === sortedRight[index]);
}

function symmetricDifference(left: readonly string[], right: readonly string[]): string[] {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return [...new Set([...left.filter((value) => !rightSet.has(value)), ...right.filter((value) => !leftSet.has(value))])].sort();
}

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`STEP37_CAPABILITY_DSL_DRAFT_FIELD_REQUIRED field=\"${field}\"`);
  }
  return trimmed;
}
