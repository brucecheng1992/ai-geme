import { describe, expect, it } from 'vitest';

import {
  acknowledgePhaserRuntimePatch,
  buildPhaserRuntimeSystemLoaderPlan,
  compileCanonicalCapabilityDslToRuntimePlan,
  createDefaultStraightSingleWeaponRuntimeModule,
  createPhaserRuntimeModuleSession,
  observePhaserRuntimeBindingReport,
  type CanonicalGameDslV02,
  type CapabilityDrivenGameIr,
  type GameplayCapabilityLock,
  type PhaserRuntimeLoaderPlan,
  type PhaserRuntimeSystemManifest,
  type PhaserRuntimeSystemModule
} from '../../packages/game-dsl/src/index.js';
import type { DeclarativeJsonValue } from '../../packages/game-dsl/src/gameplay-capabilities/declarative-json.js';
import { hashStableJson } from '../../packages/game-dsl/src/gameplay-capabilities/stable-json.js';

type DeclarativeJsonObject = { [key: string]: DeclarativeJsonValue };

describe('Modular Phaser runtime system loader', () => {
  it('builds a deterministic dependency and phase ordered loader plan', () => {
    const first = buildPhaserRuntimeSystemLoaderPlan(createLoaderInput());
    const second = buildPhaserRuntimeSystemLoaderPlan({
      ...createLoaderInput(),
      gameIr: {
        ...createGameIr(),
        runtimeSystemConfigs: [...createGameIr().runtimeSystemConfigs].reverse()
      },
      manifest: {
        ...createManifest(),
        systems: [...createManifest().systems].reverse()
      }
    });

    expect(first.status).toBe('ready');
    expect(first.plan?.loadOrder.map((entry) => entry.systemId)).toEqual(['system.gravity', 'system.input', 'system.run_jump', 'system.camera_follow']);
    expect(first.plan?.updateLoopSystemIds).toEqual(['system.gravity', 'system.input', 'system.run_jump', 'system.camera_follow']);
    expect(first.plan?.loadOrder.find((entry) => entry.systemId === 'system.run_jump')?.config).toEqual({ moveSpeed: 220 });
    expect(first.planHash).toBe(second.planHash);
    expect(first.bindingReport?.status).toBe('bound_pending_qa');
  });

  it('fails before preview when a runtime module is unavailable', () => {
    const report = buildPhaserRuntimeSystemLoaderPlan({
      ...createLoaderInput(),
      gameIr: {
        ...createGameIr(),
        runtimeSystemConfigs: [
          ...createGameIr().runtimeSystemConfigs,
          { id: 'system.projectile', capabilityId: 'combat.projectile.v1', config: { enabled: true } }
        ]
      },
      capabilityLock: {
        ...createCapabilityLock(),
        capabilityIds: [...createCapabilityLock().capabilityIds, 'combat.projectile.v1']
      }
    });

    expect(report.status).toBe('invalid');
    expect(report.plan).toBeUndefined();
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'RUNTIME_MODULE_MISSING', systemId: 'system.projectile' })]));
  });

  it('requires dependencies to be present in IR instead of creating implicit defaults', () => {
    const report = buildPhaserRuntimeSystemLoaderPlan({
      ...createLoaderInput(),
      gameIr: {
        ...createGameIr(),
        runtimeSystemConfigs: createGameIr().runtimeSystemConfigs.filter((config) => config.id !== 'system.input')
      }
    });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'RUNTIME_MODULE_DEPENDENCY_MISSING', systemId: 'system.run_jump' })]));
  });

  it('rejects dependency cycles deterministically', () => {
    const report = buildPhaserRuntimeSystemLoaderPlan({
      ...createLoaderInput(),
      manifest: {
        ...createManifest(),
        systems: createManifest().systems.map((system) => (system.id === 'system.gravity' ? { ...system, dependencies: ['system.camera_follow'] } : system))
      }
    });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'RUNTIME_MODULE_CYCLE', systemId: 'system.camera_follow' })]));
  });

  it('rejects duplicate runtime system configs so the update loop cannot be registered twice', () => {
    const report = buildPhaserRuntimeSystemLoaderPlan({
      ...createLoaderInput(),
      gameIr: {
        ...createGameIr(),
        runtimeSystemConfigs: [...createGameIr().runtimeSystemConfigs, createGameIr().runtimeSystemConfigs[2]]
      }
    });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'RUNTIME_SYSTEM_CONFIG_DUPLICATE', systemId: 'system.input' })]));
  });

  it('rejects template-default gameplay objects on the universal composition path', () => {
    const report = buildPhaserRuntimeSystemLoaderPlan({
      ...createLoaderInput(),
      manifest: {
        ...createManifest(),
        systems: createManifest().systems.map((system) => (system.id === 'system.run_jump' ? { ...system, authoritativeConfig: 'template_default' } : system))
      }
    });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'RUNTIME_MODULE_DEFAULT_ENTITY_FORBIDDEN', systemId: 'system.run_jump' })]));
  });

  it('requires universal composition mode instead of silently falling back to a legacy template', () => {
    const report = buildPhaserRuntimeSystemLoaderPlan({
      ...createLoaderInput(),
      manifest: {
        ...createManifest(),
        compatibilityMode: {
          ...createManifest().compatibilityMode,
          selection: 'legacy_template',
          legacyTemplatePath: 'templates/phaser/side_scrolling_run_and_gun'
        }
      }
    });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'RUNTIME_COMPATIBILITY_MODE_LEGACY' })]));
  });

  it('acknowledges only declared hot patch properties with verification evidence', () => {
    const accepted = acknowledgePhaserRuntimePatch({
      manifest: createManifest(),
      patch: { systemId: 'system.run_jump', property: 'moveSpeed', value: 260 }
    });
    const rejected = acknowledgePhaserRuntimePatch({
      manifest: createManifest(),
      patch: { systemId: 'system.run_jump', property: 'jumpVelocity', value: 520 }
    });

    expect(accepted.status).toBe('accepted');
    expect(accepted.verificationEvent).toBe('runtime.run_jump.patch_applied');
    expect(rejected.status).toBe('rejected');
    expect(rejected.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'RUNTIME_PATCH_PROPERTY_UNSUPPORTED' })]));
  });

  it('keeps runtime binding evidence pending until QA observes every module', () => {
    const loader = buildPhaserRuntimeSystemLoaderPlan(createLoaderInput());
    expect(loader.bindingReport).toBeDefined();

    const observed = observePhaserRuntimeBindingReport({
      bindingReport: loader.bindingReport!,
      observedModuleIds: loader.bindingReport!.modules.map((module) => module.systemId),
      qaProbeId: 'qa.runtime_binding_observed'
    });
    const missing = observePhaserRuntimeBindingReport({
      bindingReport: loader.bindingReport!,
      observedModuleIds: ['system.gravity'],
      qaProbeId: 'qa.runtime_binding_observed'
    });
    const spoofed = observePhaserRuntimeBindingReport({
      bindingReport: loader.bindingReport!,
      observedModuleIds: loader.bindingReport!.modules.map((module) => module.systemId),
      qaProbeId: 'qa.spoofed_probe'
    });

    expect(observed.issues).toEqual([]);
    expect(observed.report.status).toBe('qa_observed');
    expect(observed.report.modules.every((module) => module.status === 'qa_observed')).toBe(true);
    expect(missing.report.status).toBe('bound_pending_qa');
    expect(missing.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'RUNTIME_BINDING_OBSERVATION_MISSING' })]));
    expect(spoofed.report.status).toBe('bound_pending_qa');
    expect(spoofed.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'RUNTIME_BINDING_OBSERVATION_UNDECLARED' })]));
  });

  it('runs lifecycle hooks once and disposes modules in reverse load order', async () => {
    const loader = buildPhaserRuntimeSystemLoaderPlan(createLoaderInput());
    expect(loader.plan).toBeDefined();
    const calls: string[] = [];
    const installedConfigById: Record<string, unknown> = {};
    const modules = Object.fromEntries(
      loader.plan!.loadOrder.map((entry): [string, PhaserRuntimeSystemModule] => [
        entry.systemId,
        {
          id: entry.systemId,
          install: (_context, config) => {
            calls.push(`install:${entry.systemId}`);
            installedConfigById[entry.systemId] = config;
          },
          start: () => {
            calls.push(`start:${entry.systemId}`);
          },
          update: () => calls.push(`update:${entry.systemId}`),
          snapshot: () => ({ id: entry.systemId }),
          dispose: () => {
            calls.push(`dispose:${entry.systemId}`);
          }
        }
      ])
    );

    const session = createPhaserRuntimeModuleSession({ plan: loader.plan!, modules });
    await session.installAll();
    await session.installAll();
    await session.startAll();
    await session.startAll();
    session.update(16);
    expect(Object.keys(session.snapshot())).toEqual(['system.gravity', 'system.input', 'system.run_jump', 'system.camera_follow']);
    await session.dispose();
    await session.dispose();

    expect(calls.filter((call) => call.startsWith('install:'))).toHaveLength(4);
    expect(installedConfigById['system.run_jump']).toEqual({ moveSpeed: 220 });
    expect(calls.filter((call) => call.startsWith('start:'))).toHaveLength(4);
    expect(calls.filter((call) => call.startsWith('update:'))).toHaveLength(4);
    expect(calls.slice(-4)).toEqual(['dispose:system.camera_follow', 'dispose:system.run_jump', 'dispose:system.input', 'dispose:system.gravity']);
    expect(() => session.update(16)).toThrow('Runtime module session is already disposed.');
  });

  it('installs default straight single weapon compiler artifact as interpreted runtime state', async () => {
    const { loaderPlan } = compileDefaultWeaponRuntimeFixture();
    const weaponModule = createDefaultStraightSingleWeaponRuntimeModule();
    const session = createPhaserRuntimeModuleSession({ plan: loaderPlan, modules: createSessionModules(loaderPlan, weaponModule) });

    expect(session.snapshot()[DEFAULT_WEAPON_SYSTEM_ID]).toEqual({ installed: false });

    await session.installAll();

    expect(session.snapshot()[DEFAULT_WEAPON_SYSTEM_ID]).toEqual({
      installed: true,
      owner: { entityId: 'player', role: 'player' },
      loadout: { slot: 'primary', equipPolicy: 'initial_spawn' },
      projectilePattern: { kind: 'straight', projectileCount: 1 },
      fireAction: 'shoot_projectile',
      provenance: {
        artifactKind: DEFAULT_WEAPON_ARTIFACT_KIND,
        canonicalSystemId: 'config_default_straight_single_weapon',
        sourceDraftId: 'default_straight_single_weapon'
      }
    });
  });

  it('fires a player-owned straight single projectile from the installed default weapon state', async () => {
    const { loaderPlan } = compileDefaultWeaponRuntimeFixture();
    const weaponModule = createDefaultStraightSingleWeaponRuntimeModule();
    const session = createPhaserRuntimeModuleSession({ plan: loaderPlan, modules: createSessionModules(loaderPlan, weaponModule) });

    await session.installAll();

    const fireResult = weaponModule.fire({
      ownerEntityId: 'player',
      action: 'shoot_projectile',
      origin: { x: 128, y: 256 },
      nowMs: 1000
    });

    expect(fireResult).toEqual({
      status: 'fired',
      projectileSpawns: [
        {
          id: 'weapon_default_straight_single_player_1000_0',
          owner: 'player',
          sourceCapabilityId: DEFAULT_WEAPON_CAPABILITY_ID,
          weaponSlot: 'primary',
          pattern: 'straight',
          projectileCount: 1,
          firedAtMs: 1000,
          position: { x: 128, y: 256 },
          trajectory: { kind: 'straight', vx: 1, vy: 0 }
        }
      ],
      telemetryEvents: [
        {
          type: 'player.fired',
          payload: {
            owner: 'player',
            weaponSlot: 'primary',
            sourceCapabilityId: DEFAULT_WEAPON_CAPABILITY_ID
          }
        },
        {
          type: 'projectile.spawned',
          payload: {
            projectileId: 'weapon_default_straight_single_player_1000_0',
            owner: 'player',
            sourceCapabilityId: DEFAULT_WEAPON_CAPABILITY_ID,
            pattern: 'straight',
            projectileCount: 1
          }
        }
      ]
    });
  });

  it('blocks default straight single firing unless the installed player primary action matches', async () => {
    const { loaderPlan } = compileDefaultWeaponRuntimeFixture();
    const weaponModule = createDefaultStraightSingleWeaponRuntimeModule();
    const session = createPhaserRuntimeModuleSession({ plan: loaderPlan, modules: createSessionModules(loaderPlan, weaponModule) });

    expect(weaponModule.fire({ ownerEntityId: 'player', action: 'shoot_projectile', origin: { x: 0, y: 0 }, nowMs: 0 })).toEqual({
      status: 'blocked',
      reason: 'not_installed',
      projectileSpawns: [],
      telemetryEvents: []
    });

    await session.installAll();

    expect(weaponModule.fire({ ownerEntityId: 'rifle_soldier', action: 'shoot_projectile', origin: { x: 0, y: 0 }, nowMs: 1 })).toEqual({
      status: 'blocked',
      reason: 'owner_mismatch',
      projectileSpawns: [],
      telemetryEvents: []
    });
    expect(weaponModule.fire({ ownerEntityId: 'player', action: 'charge_shot', origin: { x: 0, y: 0 }, nowMs: 2 })).toEqual({
      status: 'blocked',
      reason: 'action_mismatch',
      projectileSpawns: [],
      telemetryEvents: []
    });

    expect(weaponModule.fire({ ownerEntityId: 'player', action: 'shoot_projectile', origin: { x: 32, y: 48 }, nowMs: 3 })).toMatchObject({
      status: 'fired',
      projectileSpawns: [
        {
          id: 'weapon_default_straight_single_player_3_0'
        }
      ]
    });
  });

  it.each([
    {
      name: 'wrong artifactKind',
      config: { ...DEFAULT_WEAPON_COMPILED_CONFIG, artifactKind: 'weapon.spread_shot.compiled.v1' }
    },
    {
      name: 'generic config aggregation object',
      config: {
        canonicalDslPath: 'canonical-game-dsl.v0.2.json',
        systemSourceIds: ['config_default_straight_single_weapon'],
        configSourceIds: ['default_straight_single_weapon']
      }
    },
    {
      name: 'missing required field',
      config: withoutKey(DEFAULT_WEAPON_COMPILED_CONFIG, 'fireAction')
    },
    {
      name: 'non-player owner',
      config: { ...DEFAULT_WEAPON_COMPILED_CONFIG, owner: { entityId: 'rifle_soldier', role: 'enemy' } }
    },
    {
      name: 'non-straight pattern',
      config: { ...DEFAULT_WEAPON_COMPILED_CONFIG, projectilePattern: { kind: 'spread', projectileCount: 1 } }
    },
    {
      name: 'multiple projectiles',
      config: { ...DEFAULT_WEAPON_COMPILED_CONFIG, projectilePattern: { kind: 'straight', projectileCount: 2 } }
    },
    {
      name: 'wrong fire action',
      config: { ...DEFAULT_WEAPON_COMPILED_CONFIG, fireAction: 'charge_shot' }
    }
  ] satisfies Array<{ name: string; config: DeclarativeJsonObject }>)('fails closed before installing default weapon runtime state for $name', async ({ config }) => {
    const { loaderPlan } = compileDefaultWeaponRuntimeFixture();
    const weaponModule = createDefaultStraightSingleWeaponRuntimeModule();
    const session = createPhaserRuntimeModuleSession({
      plan: withDefaultWeaponConfig(loaderPlan, config),
      modules: createSessionModules(loaderPlan, weaponModule)
    });

    await expect(session.installAll()).rejects.toThrow('Default straight single weapon runtime config invalid');
    expect(snapshotModule(weaponModule)).toEqual({ installed: false });
  });

  it('fails closed when the default weapon runtime module is missing from the session module map', async () => {
    const { loaderPlan } = compileDefaultWeaponRuntimeFixture();
    const session = createPhaserRuntimeModuleSession({ plan: loaderPlan, modules: createSessionModules(loaderPlan, undefined) });

    await expect(session.installAll()).rejects.toThrow(`Runtime module ${DEFAULT_WEAPON_SYSTEM_ID} is missing from the active session.`);
  });

  it('does not install default weapon runtime state when only the loader plan exists', () => {
    const { loaderPlan } = compileDefaultWeaponRuntimeFixture();
    const weaponModule = createDefaultStraightSingleWeaponRuntimeModule();
    const session = createPhaserRuntimeModuleSession({ plan: loaderPlan, modules: createSessionModules(loaderPlan, weaponModule) });

    expect(loaderPlan.loadOrder.find((entry) => entry.systemId === DEFAULT_WEAPON_SYSTEM_ID)?.config).toMatchObject({
      artifactKind: DEFAULT_WEAPON_ARTIFACT_KIND
    });
    expect(session.snapshot()[DEFAULT_WEAPON_SYSTEM_ID]).toEqual({ installed: false });
  });
});

const DEFAULT_WEAPON_CAPABILITY_ID = 'weapon.default_straight_single.v1';
const DEFAULT_WEAPON_SYSTEM_ID = `system.${DEFAULT_WEAPON_CAPABILITY_ID}`;
const DEFAULT_WEAPON_ARTIFACT_KIND = 'weapon.default_straight_single.compiled.v1';
const DEFAULT_WEAPON_COMPILED_CONFIG = {
  artifactKind: DEFAULT_WEAPON_ARTIFACT_KIND,
  source: {
    canonicalSystemId: 'config_default_straight_single_weapon',
    sourceDraftId: 'default_straight_single_weapon'
  },
  owner: { entityId: 'player', role: 'player' },
  loadout: { slot: 'primary', equipPolicy: 'initial_spawn' },
  projectilePattern: { kind: 'straight', projectileCount: 1 },
  fireAction: 'shoot_projectile'
} satisfies DeclarativeJsonObject;

function createLoaderInput() {
  return {
    gameIr: createGameIr(),
    manifest: createManifest(),
    capabilityLock: createCapabilityLock()
  };
}

function compileDefaultWeaponRuntimeFixture(): { loaderPlan: PhaserRuntimeLoaderPlan } {
  const compilerFixture = createDefaultWeaponCompilerFixture();
  const compiled = compileCanonicalCapabilityDslToRuntimePlan(compilerFixture);
  if (compiled.status !== 'compiled') {
    throw new Error(`Expected default weapon compiler fixture to compile, got ${compiled.status}`);
  }
  const loader = buildPhaserRuntimeSystemLoaderPlan({
    gameIr: compiled.capabilityIr,
    manifest: compiled.runtimeSystemManifest,
    capabilityLock: {
      ref: 'gameplay_capability_lock.json',
      hash: compilerFixture.capabilityLock.lockHash,
      capabilityIds: compilerFixture.capabilityLock.capabilityIds
    }
  });
  if (loader.status !== 'ready' || loader.plan === undefined) {
    throw new Error(`Expected default weapon runtime loader fixture to be ready, got ${loader.status}`);
  }
  return { loaderPlan: loader.plan };
}

function createSessionModules(
  plan: PhaserRuntimeLoaderPlan,
  weaponModule: PhaserRuntimeSystemModule | undefined
): Record<string, PhaserRuntimeSystemModule> {
  return Object.fromEntries(
    plan.loadOrder
      .filter((entry) => entry.systemId !== DEFAULT_WEAPON_SYSTEM_ID || weaponModule !== undefined)
      .map((entry): [string, PhaserRuntimeSystemModule] => [
        entry.systemId,
        entry.systemId === DEFAULT_WEAPON_SYSTEM_ID
          ? weaponModule!
          : {
              id: entry.systemId,
              snapshot: () => ({ installed: true })
            }
      ])
  );
}

function withDefaultWeaponConfig(plan: PhaserRuntimeLoaderPlan, config: DeclarativeJsonObject): PhaserRuntimeLoaderPlan {
  return {
    ...plan,
    loadOrder: plan.loadOrder.map((entry) =>
      entry.systemId === DEFAULT_WEAPON_SYSTEM_ID
        ? {
            ...entry,
            config,
            configHash: hashStableJson(config)
          }
        : entry
    )
  };
}

function withoutKey<T extends DeclarativeJsonObject>(input: T, key: keyof T): DeclarativeJsonObject {
  const { [key]: _removed, ...rest } = input;
  return rest;
}

function snapshotModule(module: PhaserRuntimeSystemModule): DeclarativeJsonObject {
  if (module.snapshot === undefined) {
    throw new Error(`Runtime module ${module.id} does not expose a snapshot.`);
  }
  return module.snapshot();
}

function createDefaultWeaponCompilerFixture() {
  const capabilityIds = [...createCompilerCapabilityIds(), DEFAULT_WEAPON_CAPABILITY_ID].sort();
  const capabilityLock = createGameplayCapabilityLock(capabilityIds);
  const canonicalDsl = createCanonicalDsl(capabilityLock);
  return {
    capabilityLock,
    canonicalDsl: {
      ...canonicalDsl,
      entities: canonicalDsl.entities.map((entity) =>
        entity.id === 'player'
          ? {
              ...entity,
              capability_ids: [...new Set([...entity.capability_ids, DEFAULT_WEAPON_CAPABILITY_ID])].sort()
            }
          : entity
      ),
      systems: [
        ...canonicalDsl.systems,
        {
          id: 'config_default_straight_single_weapon',
          capability_id: DEFAULT_WEAPON_CAPABILITY_ID,
          source_kind: 'capability_config',
          applies_to_entity_ids: ['player'],
          source_draft_id: 'default_straight_single_weapon',
          config: { slot: 'primary', pattern: 'straight', projectile_count: 1, fire_action: 'shoot_projectile' }
        }
      ]
    }
  };
}

function createCompilerCapabilityIds(): string[] {
  return [
    'combat.projectile.v1',
    'goal.destroy_target.v1',
    'movement.run_jump.v1',
    'pickup.drop_collect.v1',
    'spawn.static.v1',
    'telemetry.gameplay_events.v1'
  ];
}

function createGameplayCapabilityLock(capabilityIds: string[]): GameplayCapabilityLock {
  const payload = {
    artifactKind: 'gameplay_capability_lock' as const,
    schemaVersion: 'gameplay_capability_lock.v0.1' as const,
    profileId: 'side_scrolling_run_and_gun.v1',
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

function createCanonicalDsl(capabilityLock: GameplayCapabilityLock): CanonicalGameDslV02 {
  return {
    artifactKind: 'canonical_game_dsl',
    schema_version: 'game-dsl.v0.2',
    projectId: 'proj_20260625_weapon_runtime',
    runId: 'run_20260625_weapon_runtime',
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
    metadata: { title: 'Default weapon runtime consumer test', tags: [] }
  };
}

function createGameIr(): CapabilityDrivenGameIr {
  return {
    contractVersion: 'capability-game-ir.v0.1',
    runtimeFamily: 'phaser_2d_action_arcade.v1',
    profileId: 'side_scrolling_run_and_gun.v1',
    capabilityLockRef: 'gameplay_capability_lock.json',
    runtimeSystemConfigs: [
      { id: 'system.camera_follow', capabilityId: 'camera.side_follow.v1', config: { lerp: 0.18 } },
      { id: 'system.run_jump', capabilityId: 'movement.run_jump.v1', config: { moveSpeed: 220 } },
      { id: 'system.input', capabilityId: 'movement.run_jump.v1', config: { scheme: 'keyboard' } },
      { id: 'system.gravity', capabilityId: 'physics.gravity_platformer.v1', config: { gravityY: 900 } }
    ],
    entityComponents: [],
    rules: [],
    goals: [],
    assetRequirements: [],
    telemetryRequirements: [],
    assetManifestRef: 'asset_manifest.json',
    telemetryPlanRef: 'telemetry_plan.json',
    qaPlanRef: 'capability_qa_plan.json'
  };
}

function createCapabilityLock() {
  return {
    ref: 'gameplay_capability_lock.json',
    hash: 'fnv1a_lock',
    capabilityIds: ['camera.side_follow.v1', 'movement.run_jump.v1', 'physics.gravity_platformer.v1']
  };
}

function createManifest(): PhaserRuntimeSystemManifest {
  return {
    artifactKind: 'phaser_runtime_system_manifest',
    schemaVersion: 'phaser_runtime_system_manifest.v0.1',
    runtimeFamily: 'phaser_2d_action_arcade.v1',
    kernel: {
      id: 'phaser_2d_action_arcade.kernel.v1',
      version: 'v1',
      runtimeFamily: 'phaser_2d_action_arcade.v1',
      templateBoundary: 'universal_kernel',
      profileBranching: 'forbidden',
      defaultGameplayObjects: 'forbidden',
      services: ['entity_registry', 'event_bus', 'scheduler', 'runtime_patch', 'qa_observer']
    },
    compatibilityMode: {
      selection: 'universal_composition',
      selectedBy: 'profile_compiler_version',
      selectorValue: 'capability-profile-compiler.v0.1',
      universalTemplatePath: 'templates/phaser/universal-2d-action'
    },
    systems: [
      {
        id: 'system.run_jump',
        version: 'v1',
        capabilityId: 'movement.run_jump.v1',
        runtimeFamily: 'phaser_2d_action_arcade.v1',
        phase: 'gameplay',
        dependencies: ['system.gravity', 'system.input'],
        services: ['entity_registry', 'input', 'physics_body', 'runtime_patch'],
        authoritativeConfig: 'capability_ir',
        patch: {
          patchableProperties: ['moveSpeed'],
          snapshotStrategy: 'module_snapshot',
          applyStrategy: 'module_apply_patch',
          revertStrategy: 'previous_snapshot',
          verificationEvent: 'runtime.run_jump.patch_applied'
        },
        qaProbeIds: ['qa.run_jump.snapshot', 'qa.runtime_binding_observed']
      },
      {
        id: 'system.input',
        version: 'v1',
        capabilityId: 'movement.run_jump.v1',
        runtimeFamily: 'phaser_2d_action_arcade.v1',
        phase: 'input',
        dependencies: [],
        services: ['input'],
        authoritativeConfig: 'capability_ir',
        qaProbeIds: ['qa.input.snapshot', 'qa.runtime_binding_observed']
      },
      {
        id: 'system.gravity',
        version: 'v1',
        capabilityId: 'physics.gravity_platformer.v1',
        runtimeFamily: 'phaser_2d_action_arcade.v1',
        phase: 'physics',
        dependencies: [],
        services: ['physics_body'],
        authoritativeConfig: 'capability_ir',
        qaProbeIds: ['qa.gravity.snapshot', 'qa.runtime_binding_observed']
      },
      {
        id: 'system.camera_follow',
        version: 'v1',
        capabilityId: 'camera.side_follow.v1',
        runtimeFamily: 'phaser_2d_action_arcade.v1',
        phase: 'feedback',
        dependencies: ['system.run_jump'],
        services: ['entity_registry'],
        authoritativeConfig: 'capability_ir',
        qaProbeIds: ['qa.camera.snapshot', 'qa.runtime_binding_observed']
      }
    ]
  };
}
