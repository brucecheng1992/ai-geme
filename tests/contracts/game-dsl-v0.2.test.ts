import { describe, expect, it } from 'vitest';

import { hashStableJson } from '../../packages/game-dsl/src/gameplay-capabilities/stable-json.js';
import {
  CanonicalGameDslV02Schema,
  GameDslNormalizationReportSchema,
  buildCapabilityGameDslDraftComposedSchemaIdentity,
  normalizeCapabilityGameDslDraftToCanonicalV02
} from '../../packages/game-dsl/src/index.js';

describe('Canonical Game DSL v0.2 normalization', () => {
  it('normalizes a capability draft into authoritative canonical DSL without collapsing range duration', () => {
    const fixture = createFixture();
    const result = normalizeCapabilityGameDslDraftToCanonicalV02(fixture);

    expect(result.status).toBe('normalized');
    if (result.status !== 'normalized') {
      throw new Error('expected canonical normalization to pass');
    }

    expect(CanonicalGameDslV02Schema.parse(result.canonicalDsl)).toEqual(result.canonicalDsl);
    expect(GameDslNormalizationReportSchema.parse(result.normalizationReport)).toEqual(result.normalizationReport);
    expect(result.canonicalDsl).toMatchObject({
      artifactKind: 'canonical_game_dsl',
      schema_version: 'game-dsl.v0.2',
      source: {
        game_brief_hash: 'fnv1a_game_brief',
        profile_resolution_hash: 'fnv1a_profile_resolution',
        capability_lock_hash: fixture.capabilityLock.lockHash,
        composed_schema_hash: fixture.composedSchemaIdentity.schemaHash
      },
      profile: { id: 'side_scrolling_run_and_gun.v1', runtime_family: 'phaser_2d_action_arcade.v1' },
      play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 },
      progression: { estimated_total_sec: { min_sec: 480, max_sec: 720 } }
    });
    expect(result.canonicalDsl.waves).toHaveLength(3);
    expect(result.canonicalDsl.pickups).toHaveLength(1);
    expect(result.canonicalDsl.objectives).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'target_score', target: { score: 3800 } })]));
    expect(result.canonicalDsl.systems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'behavior_enemy_fires', capability_id: 'combat.projectile.v1', source_kind: 'behavior' }),
        expect.objectContaining({
          id: 'config_movement_config',
          capability_id: 'movement.run_jump.v1',
          source_kind: 'capability_config',
          applies_to_entity_ids: ['player']
        })
      ])
    );
    expect(result.normalizationReport).toMatchObject({
      status: 'normalized',
      rawModelArtifact: {
        dialect: 'capability-game-dsl-draft.v1',
        path: 'capability-game-dsl-draft.raw.json',
        hash: result.canonicalDsl.source.draft_hash
      },
      authoritativeArtifact: {
        dialect: 'game-dsl.v0.2',
        path: 'canonical-game-dsl-v0.2.json',
        hash: hashStableJson(result.canonicalDsl)
      },
      legacyArtifacts: [
        { dialect: 'game-dsl-v0.1', path: 'legacy-raw-game-dsl-v0.1.raw.json', role: 'legacy_raw_model_output' },
        { dialect: 'game-dsl.v1', path: 'legacy-game-dsl-v1.json', role: 'legacy_normalized_runtime_dsl' }
      ],
      issues: []
    });
  });

  it('fails closed when draft, lock and composed schema capability sets diverge', () => {
    const fixture = createFixture();
    const result = normalizeCapabilityGameDslDraftToCanonicalV02({
      ...fixture,
      composedSchemaIdentity: buildCapabilityGameDslDraftComposedSchemaIdentity({
        profileId: 'side_scrolling_run_and_gun.v1',
        capabilityIds: fixture.draft.capabilities.filter((capabilityId) => capabilityId !== 'combat.projectile.v1')
      })
    });

    expect(result.status).toBe('blocked');
    expect(result.normalizationReport.status).toBe('blocked');
    expect(result.normalizationReport.authoritativeArtifact.hash).toBeUndefined();
    expect(result.normalizationReport.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SET_MISMATCH' })]));
  });

  it('fails closed when trusted profile or lock hash bindings drift', () => {
    const fixture = createFixture();
    const profileMismatch = normalizeCapabilityGameDslDraftToCanonicalV02({
      ...fixture,
      capabilityLock: createCapabilityLock({ profileId: 'collector.v1' })
    });
    const lockHashMismatch = normalizeCapabilityGameDslDraftToCanonicalV02({
      ...fixture,
      capabilityLock: { ...fixture.capabilityLock, lockHash: 'fnv1a_stale_lock' }
    });

    expect(profileMismatch.status).toBe('blocked');
    expect(profileMismatch.normalizationReport.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'PROFILE_MISMATCH' })]));
    expect(lockHashMismatch.status).toBe('blocked');
    expect(lockHashMismatch.normalizationReport.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'LOCK_HASH_MISMATCH' })]));
  });

  it('fails closed when exact lock packages do not match locked capability ids', () => {
    const fixture = createFixture();
    const { lockHash: _lockHash, ...payload } = fixture.capabilityLock;
    const packageMismatchLock = {
      ...payload,
      packages: payload.packages.filter((pkg) => pkg.capabilityId !== 'telemetry.gameplay_events.v1')
    };
    const result = normalizeCapabilityGameDslDraftToCanonicalV02({
      ...fixture,
      capabilityLock: { ...packageMismatchLock, lockHash: hashStableJson(packageMismatchLock) }
    });

    expect(result.status).toBe('blocked');
    expect(result.normalizationReport.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SET_MISMATCH', path: 'capabilityLock.packages' })])
    );
  });

  it('enforces normalization report status and authoritative hash consistency', () => {
    const fixture = createFixture();
    const normalized = normalizeCapabilityGameDslDraftToCanonicalV02(fixture);
    const blocked = normalizeCapabilityGameDslDraftToCanonicalV02({
      ...fixture,
      capabilityLock: { ...fixture.capabilityLock, lockHash: 'fnv1a_stale_lock' }
    });
    if (normalized.status !== 'normalized') {
      throw new Error('expected normalized report fixture');
    }

    const normalizedWithoutHash = GameDslNormalizationReportSchema.safeParse({
      ...normalized.normalizationReport,
      authoritativeArtifact: { dialect: 'game-dsl.v0.2', path: 'canonical-game-dsl-v0.2.json' }
    });
    const blockedWithHash = GameDslNormalizationReportSchema.safeParse({
      ...blocked.normalizationReport,
      authoritativeArtifact: {
        ...blocked.normalizationReport.authoritativeArtifact,
        hash: normalized.normalizationReport.authoritativeArtifact.hash
      }
    });

    expect(normalizedWithoutHash.success).toBe(false);
    expect(normalizedWithoutHash.error?.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['authoritativeArtifact', 'hash'] })]));
    expect(blockedWithHash.success).toBe(false);
    expect(blockedWithHash.error?.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['authoritativeArtifact', 'hash'] })]));
  });

  it('rejects normalization reports with a stale report hash', () => {
    const fixture = createFixture();
    const result = normalizeCapabilityGameDslDraftToCanonicalV02(fixture);
    if (result.status !== 'normalized') {
      throw new Error('expected normalized report fixture');
    }

    const staleReport = GameDslNormalizationReportSchema.safeParse({
      ...result.normalizationReport,
      reportHash: 'fnv1a_deadbeef'
    });

    expect(staleReport.success).toBe(false);
    expect(staleReport.error?.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['reportHash'] })]));
  });

  it('keeps normalization reports deterministic for the same trusted inputs', () => {
    const fixture = createFixture();
    const first = normalizeCapabilityGameDslDraftToCanonicalV02(fixture);
    const second = normalizeCapabilityGameDslDraftToCanonicalV02(fixture);

    expect(first.status).toBe('normalized');
    expect(second.status).toBe('normalized');
    expect(first.normalizationReport.reportHash).toBe(second.normalizationReport.reportHash);
  });
});

function createFixture() {
  const draft = createDraft();
  const capabilityLock = createCapabilityLock();
  return {
    projectId: 'proj_20260619_canonical',
    runId: 'run_20260619_canonical',
    draft,
    gameBriefHash: 'fnv1a_game_brief',
    profileResolutionHash: 'fnv1a_profile_resolution',
    capabilityLock,
    composedSchemaIdentity: buildCapabilityGameDslDraftComposedSchemaIdentity({
      profileId: draft.profile.id,
      capabilityIds: draft.capabilities
    })
  };
}

function createCapabilityIds(): string[] {
  return ['combat.projectile.v1', 'goal.destroy_target.v1', 'movement.run_jump.v1', 'pickup.drop_collect.v1', 'telemetry.gameplay_events.v1'];
}

function createCapabilityLock(input: { profileId?: string } = {}) {
  const capabilityIds = createCapabilityIds();
  const payload = {
    artifactKind: 'gameplay_capability_lock',
    schemaVersion: 'gameplay_capability_lock.v0.1',
    profileId: input.profileId ?? 'side_scrolling_run_and_gun.v1',
    runtimeFamily: 'phaser_2d_action_arcade.v1',
    capabilityIds,
    packages: capabilityIds.map((capabilityId) => ({
      capabilityId,
      packageVersion: '1.0.0',
      packageHash: `fnv1a_${capabilityId.replace(/[^a-z0-9]/g, '').slice(0, 8).padEnd(8, '0')}`
    }))
  };
  return { ...payload, lockHash: hashStableJson(payload) };
}

function createDraft() {
  return {
    artifactKind: 'capability_game_dsl_draft',
    schemaVersion: 'capability-game-dsl-draft.v1',
    profile: { id: 'side_scrolling_run_and_gun.v1' },
    play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 },
    capabilities: createCapabilityIds(),
    progression: {
      estimated_total_sec: { min_sec: 480, max_sec: 720 },
      segments: [
        { id: 'approach', order: 0, duration_target_sec: { min_sec: 160, max_sec: 240 }, capability_refs: ['movement.run_jump.v1'] },
        { id: 'base_assault', order: 1, duration_target_sec: { min_sec: 160, max_sec: 240 }, capability_refs: ['combat.projectile.v1'] },
        { id: 'core_boss', order: 2, duration_target_sec: { min_sec: 160, max_sec: 240 }, capability_refs: ['goal.destroy_target.v1'] }
      ]
    },
    scenes: [{ id: 'main_scene', segment_refs: ['approach', 'base_assault', 'core_boss'], entity_refs: ['player', 'rifle_soldier', 'weapon_pickup'] }],
    entities: [
      { id: 'player', role: 'player', capability_refs: ['movement.run_jump.v1', 'combat.projectile.v1'] },
      { id: 'rifle_soldier', role: 'enemy', capability_refs: ['combat.projectile.v1'] },
      { id: 'weapon_pickup', role: 'pickup', capability_refs: ['pickup.drop_collect.v1'] },
      { id: 'energy_core', role: 'boss', capability_refs: ['goal.destroy_target.v1'] }
    ],
    behaviors: [
      {
        id: 'enemy_fires',
        owner_entity_id: 'rifle_soldier',
        capability_id: 'combat.projectile.v1',
        trigger: { event: 'player.in_range' },
        config: { projectile_entity_id: 'enemy_projectile' }
      }
    ],
    waves: [
      { id: 'wave_approach', segment_id: 'approach', enemy_entity_id: 'rifle_soldier', count: 4, spawn: { x: 720, y: 492 } },
      { id: 'wave_mid', segment_id: 'base_assault', enemy_entity_id: 'rifle_soldier', count: 6, spawn: { x: 1500, y: 492 } },
      { id: 'wave_core', segment_id: 'core_boss', enemy_entity_id: 'rifle_soldier', count: 5, spawn: { x: 2780, y: 492 } }
    ],
    pickups: [{ id: 'spread_pickup', segment_id: 'base_assault', pickup_entity_id: 'weapon_pickup', count: 1, spawn: { x: 1880, y: 440 } }],
    objectives: [
      {
        id: 'score_target',
        kind: 'target_score',
        target: { score: 3800 },
        success_condition: { event: 'score.reached', target_score: 3800 },
        capability_refs: ['goal.destroy_target.v1']
      }
    ],
    bosses: [
      {
        id: 'energy_core_boss',
        boss_entity_id: 'energy_core',
        segment_refs: ['core_boss'],
        phases: [{ id: 'core_phase_one', order: 0, health_threshold_pct: 100, pattern: { attack: 'slow_burst' } }]
      }
    ],
    capability_configs: [
      { id: 'movement_config', capability_id: 'movement.run_jump.v1', applies_to: ['player'], config: { move_speed: 260, jump_velocity: 520 } }
    ],
    metadata: { title: 'Canonical run-and-gun test', language: 'en' }
  };
}
