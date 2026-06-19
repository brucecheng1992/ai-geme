import { describe, expect, it } from 'vitest';

import {
  acknowledgePhaserRuntimePatch,
  buildPhaserRuntimeSystemLoaderPlan,
  createPhaserRuntimeModuleSession,
  observePhaserRuntimeBindingReport,
  type CapabilityDrivenGameIr,
  type PhaserRuntimeSystemManifest,
  type PhaserRuntimeSystemModule
} from '../../packages/game-dsl/src/index.js';

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
});

function createLoaderInput() {
  return {
    gameIr: createGameIr(),
    manifest: createManifest(),
    capabilityLock: createCapabilityLock()
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
