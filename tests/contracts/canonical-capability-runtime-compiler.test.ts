import { describe, expect, it } from 'vitest';

import { hashStableJson } from '../../packages/game-dsl/src/gameplay-capabilities/stable-json.js';
import {
  CanonicalCapabilityCompilationReportSchema,
  CapabilityRuntimePlanSchema,
  buildPhaserRuntimeSystemLoaderPlan,
  compileCanonicalCapabilityDslToRuntimePlan
} from '../../packages/game-dsl/src/index.js';

describe('Canonical capability DSL runtime compiler', () => {
  it('compiles canonical DSL into capability IR, runtime plan, Scene IR authority and runtime manifest', () => {
    const fixture = createFixture();
    const result = compileCanonicalCapabilityDslToRuntimePlan(fixture);

    expect(result.status).toBe('compiled');
    if (result.status !== 'compiled') {
      throw new Error('expected compiler fixture to pass');
    }

    expect(CapabilityRuntimePlanSchema.parse(result.runtimePlan)).toEqual(result.runtimePlan);
    expect(CanonicalCapabilityCompilationReportSchema.parse(result.compilationReport)).toEqual(result.compilationReport);
    expect(result.capabilityIr).toMatchObject({
      contractVersion: 'capability-game-ir.v0.1',
      runtimeFamily: 'phaser_2d_action_arcade.v1',
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLockRef: 'gameplay_capability_lock.json'
    });
    expect(result.capabilityIr.runtimeSystemConfigs.map((config) => config.capabilityId).sort()).toEqual(fixture.capabilityLock.capabilityIds);
    expect(result.runtimePlan.progression).toMatchObject({
      estimatedTotalSec: { min: 480, max: 720 },
      segments: [
        { id: 'approach', startSec: 0, targetDurationSec: 200, endSec: 200 },
        { id: 'base_assault', startSec: 200, targetDurationSec: 200, endSec: 400 },
        { id: 'core_boss', startSec: 400, targetDurationSec: 200, endSec: 600 }
      ]
    });
    expect(result.runtimePlan.gameplay).toMatchObject({
      waveIds: ['wave_approach', 'wave_core', 'wave_mid'],
      pickupIds: ['spread_pickup'],
      objectiveIds: ['score_target']
    });
    expect(result.runtimeSystemManifest.compatibilityMode.selection).toBe('universal_composition');
    expect(result.runtimeSystemManifest.systems.map((system) => system.capabilityId).sort()).toEqual(fixture.capabilityLock.capabilityIds);
    expect(result.runtimeSystemManifest.systems.every((system) => system.authoritativeConfig === 'capability_ir')).toBe(true);
    expect(new Set(Object.values(result.sceneIrAuthorityReport.domainOwnership))).toEqual(new Set(['canonical_game_dsl_v0.2_runtime_plan']));
    expect(result.sceneIrAuthorityReport.conflicts).toEqual([]);
    expect(result.compilationReport.outputRefs).toEqual({
      capabilityIr: 'capability-ir.json',
      runtimePlan: 'runtime-plan.generated.json',
      runtimeSystemManifest: 'runtime-system-manifest.json'
    });

    const loader = buildPhaserRuntimeSystemLoaderPlan({
      gameIr: result.capabilityIr,
      manifest: result.runtimeSystemManifest,
      capabilityLock: {
        ref: 'gameplay_capability_lock.json',
        hash: fixture.capabilityLock.lockHash,
        capabilityIds: fixture.capabilityLock.capabilityIds
      }
    });
    expect(loader.status).toBe('ready');
    expect(loader.plan?.loadOrder.map((entry) => entry.capabilityId).sort()).toEqual(fixture.capabilityLock.capabilityIds);
  });

  it('compiles M2 action-state canonical systems into runtime-plan and manifest artifacts', () => {
    const fixture = createFixture();
    const actionStateCapabilityIds = ['combat.airborne_fire.v1', 'movement.crouch.v1'];
    const capabilityIds = [...fixture.capabilityLock.capabilityIds, ...actionStateCapabilityIds].sort();
    const capabilityLock = createCapabilityLock({ capabilityIds });
    const canonicalDsl = {
      ...fixture.canonicalDsl,
      source: { ...fixture.canonicalDsl.source, capability_lock_hash: capabilityLock.lockHash },
      capability_ids: capabilityIds,
      entities: fixture.canonicalDsl.entities.map((entity) =>
        entity.id === 'player'
          ? {
              ...entity,
              capability_ids: [...new Set([...entity.capability_ids, ...actionStateCapabilityIds])].sort()
            }
          : entity
      ),
      systems: [
        ...fixture.canonicalDsl.systems,
        {
          id: 'config_airborne_fire_permission',
          capability_id: 'combat.airborne_fire.v1',
          source_kind: 'capability_config',
          applies_to_entity_ids: ['player'],
          source_draft_id: 'airborne_fire_permission',
          config: { allowed_when: ['jumping', 'falling'], fire_action: 'shoot_projectile' }
        },
        {
          id: 'config_crouch_action_state',
          capability_id: 'movement.crouch.v1',
          source_kind: 'capability_config',
          applies_to_entity_ids: ['player'],
          source_draft_id: 'crouch_action_state',
          config: { input: 'down', posture: 'crouch', height_scale: 0.58 }
        }
      ]
    };
    const result = compileCanonicalCapabilityDslToRuntimePlan({ canonicalDsl, capabilityLock });

    expect(result.status).toBe('compiled');
    if (result.status !== 'compiled') {
      throw new Error('expected action-state compiler fixture to pass');
    }

    expect(result.runtimePlan.runtimeSystems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'system.combat.airborne_fire.v1',
          capabilityId: 'combat.airborne_fire.v1',
          configSourceIds: ['airborne_fire_permission'],
          appliesToEntityIds: ['player']
        }),
        expect.objectContaining({
          id: 'system.movement.crouch.v1',
          capabilityId: 'movement.crouch.v1',
          configSourceIds: ['crouch_action_state'],
          appliesToEntityIds: ['player']
        })
      ])
    );
    expect(result.capabilityIr.runtimeSystemConfigs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'system.combat.airborne_fire.v1',
          capabilityId: 'combat.airborne_fire.v1',
          config: expect.objectContaining({ systemSourceIds: ['config_airborne_fire_permission'] })
        }),
        expect.objectContaining({
          id: 'system.movement.crouch.v1',
          capabilityId: 'movement.crouch.v1',
          config: expect.objectContaining({ systemSourceIds: ['config_crouch_action_state'] })
        })
      ])
    );
    expect(result.runtimeSystemManifest.systems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'system.combat.airborne_fire.v1',
          capabilityId: 'combat.airborne_fire.v1',
          authoritativeConfig: 'capability_ir'
        }),
        expect.objectContaining({
          id: 'system.movement.crouch.v1',
          capabilityId: 'movement.crouch.v1',
          authoritativeConfig: 'capability_ir'
        })
      ])
    );
  });

  it('compiles M2 damage invulnerability canonical systems into runtime-plan and manifest artifacts', () => {
    const fixture = createFixture();
    const capabilityIds = [...fixture.capabilityLock.capabilityIds, 'health.damage_invulnerability.v1'].sort();
    const capabilityLock = createCapabilityLock({ capabilityIds });
    const canonicalDsl = {
      ...fixture.canonicalDsl,
      source: { ...fixture.canonicalDsl.source, capability_lock_hash: capabilityLock.lockHash },
      capability_ids: capabilityIds,
      entities: fixture.canonicalDsl.entities.map((entity) =>
        entity.id === 'player'
          ? {
              ...entity,
              capability_ids: [...new Set([...entity.capability_ids, 'health.damage_invulnerability.v1'])].sort()
            }
          : entity
      ),
      systems: [
        ...fixture.canonicalDsl.systems,
        {
          id: 'config_damage_invulnerability_window',
          capability_id: 'health.damage_invulnerability.v1',
          source_kind: 'capability_config',
          applies_to_entity_ids: ['player'],
          source_draft_id: 'damage_invulnerability_window',
          config: { trigger: 'player.damaged', duration_ms: 1200, ignores_damage_sources: ['enemy_projectile', 'hazard', 'enemy_contact'] }
        }
      ]
    };
    const result = compileCanonicalCapabilityDslToRuntimePlan({ canonicalDsl, capabilityLock });

    expect(result.status).toBe('compiled');
    if (result.status !== 'compiled') {
      throw new Error('expected damage invulnerability compiler fixture to pass');
    }

    expect(result.runtimePlan.runtimeSystems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'system.health.damage_invulnerability.v1',
          capabilityId: 'health.damage_invulnerability.v1',
          configSourceIds: ['damage_invulnerability_window'],
          appliesToEntityIds: ['player']
        })
      ])
    );
    expect(result.capabilityIr.runtimeSystemConfigs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'system.health.damage_invulnerability.v1',
          capabilityId: 'health.damage_invulnerability.v1',
          config: expect.objectContaining({ systemSourceIds: ['config_damage_invulnerability_window'] })
        })
      ])
    );
    expect(result.runtimeSystemManifest.systems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'system.health.damage_invulnerability.v1',
          capabilityId: 'health.damage_invulnerability.v1',
          authoritativeConfig: 'capability_ir'
        })
      ])
    );
  });

  it('fails closed when exact lock hash or profile binding drifts', () => {
    const fixture = createFixture();
    const staleLock = compileCanonicalCapabilityDslToRuntimePlan({
      ...fixture,
      capabilityLock: { ...fixture.capabilityLock, lockHash: 'fnv1a_stale_lock' }
    });
    const profileMismatch = compileCanonicalCapabilityDslToRuntimePlan({
      ...fixture,
      capabilityLock: createCapabilityLock({ profileId: 'collector.v1' })
    });

    expect(staleLock.status).toBe('blocked');
    expect(staleLock.compilationReport.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'LOCK_HASH_MISMATCH' })]));
    expect(profileMismatch.status).toBe('blocked');
    expect(profileMismatch.compilationReport.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'PROFILE_MISMATCH' })]));
  });

  it('fails closed when canonical source lock hash does not match the exact lock', () => {
    const fixture = createFixture();
    const result = compileCanonicalCapabilityDslToRuntimePlan({
      ...fixture,
      canonicalDsl: {
        ...fixture.canonicalDsl,
        source: { ...fixture.canonicalDsl.source, capability_lock_hash: 'fnv1a_stale_source_lock' }
      }
    });

    expect(result.status).toBe('blocked');
    expect(result.compilationReport.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'LOCK_HASH_MISMATCH', path: 'source.capability_lock_hash' })])
    );
  });

  it('fails closed when exact lock packages drift from capability ids', () => {
    const fixture = createFixture();
    const { lockHash: _lockHash, ...payload } = fixture.capabilityLock;
    const packageMismatchLock = {
      ...payload,
      packages: payload.packages.filter((pkg) => pkg.capabilityId !== 'telemetry.gameplay_events.v1')
    };
    const result = compileCanonicalCapabilityDslToRuntimePlan({
      ...fixture,
      capabilityLock: { ...packageMismatchLock, lockHash: hashStableJson(packageMismatchLock) }
    });

    expect(result.status).toBe('blocked');
    expect(result.compilationReport.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SET_MISMATCH', path: 'capabilityLock.packages' })])
    );
  });

  it('fails closed when exact lock packages contain duplicate capability owners', () => {
    const fixture = createFixture();
    const { lockHash: _lockHash, ...payload } = fixture.capabilityLock;
    const duplicatePackageLock = {
      ...payload,
      packages: [...payload.packages, payload.packages[0]]
    };
    const result = compileCanonicalCapabilityDslToRuntimePlan({
      ...fixture,
      capabilityLock: { ...duplicatePackageLock, lockHash: hashStableJson(duplicatePackageLock) },
      canonicalDsl: {
        ...fixture.canonicalDsl,
        source: { ...fixture.canonicalDsl.source, capability_lock_hash: hashStableJson(duplicatePackageLock) }
      }
    });

    expect(result.status).toBe('blocked');
    expect(result.compilationReport.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SET_MISMATCH', path: 'capabilityLock.packages' })])
    );
  });

  it('fails closed when canonical nested capability refs are outside the exact lock', () => {
    const fixture = createFixture();
    const result = compileCanonicalCapabilityDslToRuntimePlan({
      ...fixture,
      canonicalDsl: {
        ...fixture.canonicalDsl,
        waves: [{ ...fixture.canonicalDsl.waves[0], capability_ids: ['enemy.fake.v1'] }]
      }
    });

    expect(result.status).toBe('blocked');
    expect(result.compilationReport.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SET_MISMATCH', path: '/waves/0/capability_ids/0' })])
    );
  });

  it('fails closed instead of inventing a default spawn capability for waves', () => {
    const fixture = createFixture();
    const capabilityIds = fixture.capabilityLock.capabilityIds.filter((capabilityId) => capabilityId !== 'spawn.static.v1');
    const lockPayload = {
      ...fixture.capabilityLock,
      capabilityIds,
      packages: fixture.capabilityLock.packages.filter((pkg) => pkg.capabilityId !== 'spawn.static.v1')
    };
    const { lockHash: _lockHash, ...payloadWithoutHash } = lockPayload;
    const result = compileCanonicalCapabilityDslToRuntimePlan({
      canonicalDsl: {
        ...fixture.canonicalDsl,
        capability_ids: capabilityIds,
        progression: {
          ...fixture.canonicalDsl.progression,
          segments: fixture.canonicalDsl.progression.segments.map((segment) => ({
            ...segment,
            capability_ids: segment.capability_ids.filter((capabilityId) => capabilityId !== 'spawn.static.v1')
          }))
        },
        waves: fixture.canonicalDsl.waves.map((wave) => ({ ...wave, capability_ids: [] }))
      },
      capabilityLock: { ...payloadWithoutHash, lockHash: hashStableJson(payloadWithoutHash) }
    });

    expect(result.status).toBe('blocked');
    expect(result.compilationReport.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SET_MISMATCH', path: '/waves/0/capability_ids' })])
    );
  });

  it('keeps versioned capability runtime system ids distinct for loader consumption', () => {
    const fixture = createFixture();
    const capabilityIds = [...fixture.capabilityLock.capabilityIds, 'spawn.static.v2'].sort();
    const lockPayload = {
      ...fixture.capabilityLock,
      capabilityIds,
      packages: [
        ...fixture.capabilityLock.packages,
        { capabilityId: 'spawn.static.v2', packageVersion: '2.0.0', packageHash: 'fnv1a_spawnv2' }
      ].sort((left, right) => left.capabilityId.localeCompare(right.capabilityId))
    };
    const { lockHash: _lockHash, ...payloadWithoutHash } = lockPayload;
    const capabilityLock = { ...payloadWithoutHash, lockHash: hashStableJson(payloadWithoutHash) };
    const result = compileCanonicalCapabilityDslToRuntimePlan({
      canonicalDsl: {
        ...fixture.canonicalDsl,
        source: { ...fixture.canonicalDsl.source, capability_lock_hash: capabilityLock.lockHash },
        capability_ids: capabilityIds,
        waves: fixture.canonicalDsl.waves.map((wave) => ({ ...wave, capability_ids: ['spawn.static.v1', 'spawn.static.v2'] }))
      },
      capabilityLock
    });

    expect(result.status).toBe('compiled');
    if (result.status !== 'compiled') {
      throw new Error('expected versioned capabilities to compile');
    }
    expect(result.runtimeSystemManifest.systems.map((system) => system.id)).toEqual(
      expect.arrayContaining(['system.spawn.static.v1', 'system.spawn.static.v2'])
    );
    expect(result.capabilityIr.rules.map((rule) => rule.id)).toEqual(
      expect.arrayContaining(['wave.wave_approach.spawn.static.v1', 'wave.wave_approach.spawn.static.v2'])
    );
    expect(new Set(result.capabilityIr.rules.map((rule) => rule.id)).size).toBe(result.capabilityIr.rules.length);
    const loader = buildPhaserRuntimeSystemLoaderPlan({
      gameIr: result.capabilityIr,
      manifest: result.runtimeSystemManifest,
      capabilityLock: {
        ref: 'gameplay_capability_lock.json',
        hash: capabilityLock.lockHash,
        capabilityIds
      }
    });
    expect(loader.status).toBe('ready');
  });

  it('enforces compilation report hash and status/output invariants', () => {
    const fixture = createFixture();
    const compiled = compileCanonicalCapabilityDslToRuntimePlan(fixture);
    const blocked = compileCanonicalCapabilityDslToRuntimePlan({
      ...fixture,
      capabilityLock: { ...fixture.capabilityLock, lockHash: 'fnv1a_stale_lock' }
    });
    if (compiled.status !== 'compiled') {
      throw new Error('expected compiled report fixture');
    }

    const staleHash = CanonicalCapabilityCompilationReportSchema.safeParse({
      ...compiled.compilationReport,
      reportHash: 'fnv1a_deadbeef'
    });
    const compiledMissingRef = CanonicalCapabilityCompilationReportSchema.safeParse({
      ...compiled.compilationReport,
      outputRefs: { runtimePlan: 'runtime-plan.generated.json', runtimeSystemManifest: 'runtime-system-manifest.json' }
    });
    const compiledMissingSourceHash = CanonicalCapabilityCompilationReportSchema.safeParse({
      ...compiled.compilationReport,
      canonicalDslHash: undefined
    });
    const blockedWithRef = CanonicalCapabilityCompilationReportSchema.safeParse({
      ...blocked.compilationReport,
      outputRefs: { capabilityIr: 'capability-ir.json' }
    });
    const stalePlanHash = CapabilityRuntimePlanSchema.safeParse({
      ...compiled.runtimePlan,
      planHash: 'fnv1a_deadbeef'
    });

    expect(staleHash.success).toBe(false);
    expect(staleHash.error?.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['reportHash'] })]));
    expect(compiledMissingRef.success).toBe(false);
    expect(compiledMissingRef.error?.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['outputRefs'] })]));
    expect(compiledMissingSourceHash.success).toBe(false);
    expect(compiledMissingSourceHash.error?.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['canonicalDslHash'] })]));
    expect(blockedWithRef.success).toBe(false);
    expect(blockedWithRef.error?.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['outputRefs'] })]));
    expect(stalePlanHash.success).toBe(false);
    expect(stalePlanHash.error?.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['planHash'] })]));
  });
});

function createFixture() {
  const capabilityLock = createCapabilityLock();
  return {
    canonicalDsl: createCanonicalDsl(capabilityLock),
    capabilityLock
  };
}

function createCapabilityIds(): string[] {
  return [
    'combat.projectile.v1',
    'goal.destroy_target.v1',
    'movement.run_jump.v1',
    'pickup.drop_collect.v1',
    'spawn.static.v1',
    'telemetry.gameplay_events.v1'
  ];
}

function createCapabilityLock(input: { profileId?: string; capabilityIds?: string[] } = {}) {
  const capabilityIds = input.capabilityIds ?? createCapabilityIds();
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

function createCanonicalDsl(capabilityLock: ReturnType<typeof createCapabilityLock>) {
  return {
    artifactKind: 'canonical_game_dsl',
    schema_version: 'game-dsl.v0.2',
    projectId: 'proj_20260619_compile',
    runId: 'run_20260619_compile',
    source: {
      game_brief_hash: 'fnv1a_game_brief',
      profile_resolution_hash: 'fnv1a_profile_resolution',
      capability_lock_hash: capabilityLock.lockHash,
      composed_schema_hash: 'fnv1a_composed_schema',
      draft_hash: 'fnv1a_draft'
    },
    profile: { id: 'side_scrolling_run_and_gun.v1', runtime_family: 'phaser_2d_action_arcade.v1' },
    capability_ids: capabilityLock.capabilityIds,
    play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 },
    progression: {
      estimated_total_sec: { min_sec: 480, max_sec: 720 },
      segments: [
        { id: 'approach', order: 0, duration_target_sec: { min_sec: 160, max_sec: 240 }, capability_ids: ['movement.run_jump.v1', 'spawn.static.v1'] },
        { id: 'base_assault', order: 1, duration_target_sec: { min_sec: 160, max_sec: 240 }, capability_ids: ['combat.projectile.v1', 'pickup.drop_collect.v1'] },
        { id: 'core_boss', order: 2, duration_target_sec: { min_sec: 160, max_sec: 240 }, capability_ids: ['goal.destroy_target.v1', 'telemetry.gameplay_events.v1'] }
      ]
    },
    scenes: [{ id: 'main_scene', segment_ids: ['approach', 'base_assault', 'core_boss'], entity_ids: ['player', 'rifle_soldier'], capability_ids: [] }],
    entities: [
      { id: 'player', role: 'player', tags: [], capability_ids: ['movement.run_jump.v1', 'combat.projectile.v1'] },
      { id: 'rifle_soldier', role: 'enemy', tags: [], capability_ids: ['combat.projectile.v1'] },
      { id: 'weapon_pickup', role: 'pickup', tags: [], capability_ids: ['pickup.drop_collect.v1'] },
      { id: 'energy_core', role: 'boss', tags: [], capability_ids: ['goal.destroy_target.v1'] }
    ],
    systems: [
      {
        id: 'behavior_enemy_fires',
        capability_id: 'combat.projectile.v1',
        source_kind: 'behavior',
        owner_entity_id: 'rifle_soldier',
        source_draft_id: 'enemy_fires',
        trigger: { event: 'player.in_range' },
        config: { projectile_entity_id: 'enemy_projectile' }
      },
      {
        id: 'config_movement_config',
        capability_id: 'movement.run_jump.v1',
        source_kind: 'capability_config',
        applies_to_entity_ids: ['player'],
        source_draft_id: 'movement_config',
        config: { move_speed: 260, jump_velocity: 520 }
      }
    ],
    objectives: [
      {
        id: 'score_target',
        kind: 'target_score',
        target: { score: 3800 },
        success_condition: { event: 'score.reached', target_score: 3800 },
        capability_ids: ['goal.destroy_target.v1']
      }
    ],
    waves: [
      { id: 'wave_approach', segment_id: 'approach', enemy_entity_id: 'rifle_soldier', count: 4, spawn: { x: 720, y: 492 }, capability_ids: ['spawn.static.v1'] },
      { id: 'wave_mid', segment_id: 'base_assault', enemy_entity_id: 'rifle_soldier', count: 6, spawn: { x: 1500, y: 492 }, capability_ids: ['spawn.static.v1'] },
      { id: 'wave_core', segment_id: 'core_boss', enemy_entity_id: 'rifle_soldier', count: 5, spawn: { x: 2780, y: 492 }, capability_ids: ['spawn.static.v1'] }
    ],
    pickups: [
      {
        id: 'spread_pickup',
        segment_id: 'base_assault',
        pickup_entity_id: 'weapon_pickup',
        count: 1,
        spawn: { x: 1880, y: 440 },
        capability_ids: ['pickup.drop_collect.v1']
      }
    ],
    bosses: [
      {
        id: 'energy_core_boss',
        boss_entity_id: 'energy_core',
        segment_ids: ['core_boss'],
        phases: [{ id: 'core_phase_one', order: 0, health_threshold_pct: 100, pattern: { attack: 'slow_burst' }, capability_ids: ['combat.projectile.v1'] }]
      }
    ],
    metadata: { title: 'Runtime compiler test', tags: [] }
  };
}
