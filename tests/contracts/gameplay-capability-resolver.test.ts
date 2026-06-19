import { describe, expect, it } from 'vitest';

import {
  resolveGameplayCapabilityGraph,
  type GameplayCapabilityPackageContract
} from '../../packages/game-dsl/src/index.js';

describe('Gameplay capability dependency and version resolver', () => {
  it('resolves required dependency closure into an exact lock', () => {
    const report = resolveGameplayCapabilityGraph({
      requestedCapabilities: ['movement.run_jump.v1'],
      packages: [
        createPackage('movement.run_jump.v1', { dependencies: [{ capabilityId: 'physics.gravity_platformer.v1', range: '^v1' }] }),
        createPackage('physics.gravity_platformer.v1')
      ],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });

    expect(report.status).toBe('resolved');
    expect(report.selectedCapabilityIds).toEqual(['movement.run_jump.v1', 'physics.gravity_platformer.v1']);
    expect(report.lock?.packages.map((entry) => `${entry.capabilityId}@${entry.packageVersion}`)).toEqual([
      'movement.run_jump.v1@1.0.0',
      'physics.gravity_platformer.v1@1.0.0'
    ]);
  });

  it('defers missing optional dependencies without blocking resolution', () => {
    const report = resolveGameplayCapabilityGraph({
      requestedCapabilities: ['movement.run_jump.v1'],
      packages: [createPackage('movement.run_jump.v1', { optionalDependencies: [{ capabilityId: 'pickup.drop_collect.v1', range: '^v1' }] })],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });

    expect(report.status).toBe('resolved');
    expect(report.selectedCapabilityIds).toEqual(['movement.run_jump.v1']);
    expect(report.deferredOptionalCapabilityIds).toEqual(['pickup.drop_collect.v1']);
    expect(report.diagnostics).toEqual([]);
  });

  it('detects incompatible capability combinations', () => {
    const report = resolveGameplayCapabilityGraph({
      requestedCapabilities: ['camera.side_follow.v1', 'camera.top_down_follow.v1'],
      packages: [
        createPackage('camera.side_follow.v1', { conflictsWith: [{ capabilityId: 'camera.top_down_follow.v1', reason: 'one active camera model per scene' }] }),
        createPackage('camera.top_down_follow.v1')
      ],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });

    expect(report.status).toBe('blocked');
    expect(report.lock).toBeUndefined();
    expect(report.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'INCOMPATIBLE_CAPABILITIES', capabilityId: 'camera.side_follow.v1' })]));
  });

  it('detects dependency cycles before DSL generation', () => {
    const report = resolveGameplayCapabilityGraph({
      requestedCapabilities: ['movement.run_jump.v1'],
      packages: [
        createPackage('movement.run_jump.v1', { dependencies: [{ capabilityId: 'physics.gravity_platformer.v1', range: '^v1' }] }),
        createPackage('physics.gravity_platformer.v1', { dependencies: [{ capabilityId: 'movement.run_jump.v1', range: '^v1' }] })
      ],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });

    expect(report.status).toBe('blocked');
    expect(report.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'DEPENDENCY_CYCLE' })]));
  });

  it('selects the highest supported package version deterministically when no lock pins it', () => {
    const first = resolveGameplayCapabilityGraph({
      requestedCapabilities: ['movement.run_jump.v1'],
      packages: [createPackage('movement.run_jump.v1', { packageVersion: '1.0.0' }), createPackage('movement.run_jump.v1', { packageVersion: '1.2.0' })],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });
    const second = resolveGameplayCapabilityGraph({
      requestedCapabilities: ['movement.run_jump.v1'],
      packages: [createPackage('movement.run_jump.v1', { packageVersion: '1.2.0' }), createPackage('movement.run_jump.v1', { packageVersion: '1.0.0' })],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });

    expect(first.status).toBe('resolved');
    expect(first.lock?.packages[0].packageVersion).toBe('1.2.0');
    expect(first.lock?.lockHash).toBe(second.lock?.lockHash);
  });

  it('treats stable package versions as higher than same-version prereleases', () => {
    const report = resolveGameplayCapabilityGraph({
      requestedCapabilities: ['movement.run_jump.v1'],
      packages: [createPackage('movement.run_jump.v1', { packageVersion: '1.0.0-beta' }), createPackage('movement.run_jump.v1', { packageVersion: '1.0.0' })],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });

    expect(report.status).toBe('resolved');
    expect(report.lock?.packages[0].packageVersion).toBe('1.0.0');
  });

  it('preserves active lock package versions unless an explicit upgrade candidate is allowed', () => {
    const active = resolveGameplayCapabilityGraph({
      requestedCapabilities: ['movement.run_jump.v1'],
      packages: [createPackage('movement.run_jump.v1', { packageVersion: '1.0.0' })],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });
    const preserved = resolveGameplayCapabilityGraph({
      requestedCapabilities: ['movement.run_jump.v1'],
      packages: [createPackage('movement.run_jump.v1', { packageVersion: '1.0.0' }), createPackage('movement.run_jump.v1', { packageVersion: '1.2.0' })],
      runtimeFamily: 'phaser_2d_action_arcade.v1',
      activeLock: active.lock
    });
    const upgraded = resolveGameplayCapabilityGraph({
      requestedCapabilities: ['movement.run_jump.v1'],
      packages: [createPackage('movement.run_jump.v1', { packageVersion: '1.0.0' }), createPackage('movement.run_jump.v1', { packageVersion: '1.2.0' })],
      runtimeFamily: 'phaser_2d_action_arcade.v1',
      activeLock: active.lock,
      allowedVersionChanges: ['movement.run_jump.v1']
    });

    expect(preserved.status).toBe('resolved');
    expect(preserved.lock?.packages[0].packageVersion).toBe('1.0.0');
    expect(upgraded.status).toBe('resolved');
    expect(upgraded.lock?.packages[0].packageVersion).toBe('1.2.0');
  });

  it('blocks unapproved active lock capability removal', () => {
    const active = resolveGameplayCapabilityGraph({
      requestedCapabilities: ['movement.run_jump.v1', 'physics.gravity_platformer.v1'],
      packages: [createPackage('movement.run_jump.v1'), createPackage('physics.gravity_platformer.v1')],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });
    const blockedRemoval = resolveGameplayCapabilityGraph({
      requestedCapabilities: ['movement.run_jump.v1'],
      packages: [createPackage('movement.run_jump.v1'), createPackage('physics.gravity_platformer.v1')],
      runtimeFamily: 'phaser_2d_action_arcade.v1',
      activeLock: active.lock
    });
    const allowedRemoval = resolveGameplayCapabilityGraph({
      requestedCapabilities: ['movement.run_jump.v1'],
      packages: [createPackage('movement.run_jump.v1'), createPackage('physics.gravity_platformer.v1')],
      runtimeFamily: 'phaser_2d_action_arcade.v1',
      activeLock: active.lock,
      allowedCapabilityRemovals: ['physics.gravity_platformer.v1']
    });

    expect(blockedRemoval.status).toBe('blocked');
    expect(blockedRemoval.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'VERSION_CONFLICT', capabilityId: 'physics.gravity_platformer.v1' })]));
    expect(allowedRemoval.status).toBe('resolved');
    expect(allowedRemoval.selectedCapabilityIds).toEqual(['movement.run_jump.v1']);
  });

  it('blocks packages for the wrong runtime family', () => {
    const report = resolveGameplayCapabilityGraph({
      requestedCapabilities: ['movement.run_jump.v1'],
      packages: [createPackage('movement.run_jump.v1', { runtimeFamilies: ['phaser_2d_top_down_arcade.v1'] })],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });

    expect(report.status).toBe('blocked');
    expect(report.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'RUNTIME_FAMILY_MISMATCH', capabilityId: 'movement.run_jump.v1' })]));
  });

  it('runs package-set ownership validation on the final selected graph', () => {
    const report = resolveGameplayCapabilityGraph({
      requestedCapabilities: ['movement.run_jump.v1', 'physics.gravity_platformer.v1'],
      packages: [
        createPackage('movement.run_jump.v1', { ownedPath: '/entities/components' }),
        createPackage('physics.gravity_platformer.v1', { ownedPath: '/entities/components/physics.gravity_platformer.v1' })
      ],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });

    expect(report.status).toBe('blocked');
    expect(report.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'INCOMPLETE_PACKAGE', requestedBy: ['selected_package_set'] })]));
  });

  it('resolves requiresOneOf groups deterministically', () => {
    const report = resolveGameplayCapabilityGraph({
      requestedCapabilities: ['weapon.cooldown.v1'],
      packages: [
        createPackage('weapon.cooldown.v1'),
        createPackage('combat.projectile.v1', { dependencies: [{ capabilityId: 'physics.gravity_platformer.v1', range: '^v1' }] }),
        createPackage('physics.gravity_platformer.v1')
      ],
      runtimeFamily: 'phaser_2d_action_arcade.v1',
      requiresOneOf: [
        {
          ownerCapabilityId: 'weapon.cooldown.v1',
          groupId: 'weapon.damage_source',
          options: [
            { capabilityId: 'combat.projectile.v1', range: '^v1', reason: 'projectile weapons' },
            { capabilityId: 'combat.melee.v1', range: '^v1', reason: 'melee weapons' }
          ]
        }
      ]
    });

    expect(report.status).toBe('resolved');
    expect(report.selectedCapabilityIds).toEqual(['combat.projectile.v1', 'physics.gravity_platformer.v1', 'weapon.cooldown.v1']);
  });

  it('returns human-readable diagnostics with remediation', () => {
    const report = resolveGameplayCapabilityGraph({
      requestedCapabilities: ['enemy.ranged_attack.v1'],
      packages: [],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });

    expect(report.status).toBe('blocked');
    expect(report.diagnostics[0]).toMatchObject({
      code: 'MISSING_CAPABILITY',
      capabilityId: 'enemy.ranged_attack.v1',
      requestedBy: ['profile_request']
    });
    expect(report.diagnostics[0].explanation).toContain('No package candidate exists');
    expect(report.diagnostics[0].remediation.length).toBeGreaterThan(0);
  });
});

function createPackage(
  id: string,
  input: {
    packageVersion?: string;
    runtimeFamilies?: string[];
    status?: GameplayCapabilityPackageContract['manifest']['status'];
    dependencies?: GameplayCapabilityPackageContract['dependencies'];
    optionalDependencies?: GameplayCapabilityPackageContract['optionalDependencies'];
    conflictsWith?: GameplayCapabilityPackageContract['conflictsWith'];
    ownedPath?: string;
  } = {}
): GameplayCapabilityPackageContract {
  const ownedPath = input.ownedPath ?? `/entities/components/${id}`;
  return {
    manifest: {
      id,
      packageVersion: input.packageVersion ?? '1.0.0',
      capabilityVersion: 'v1',
      status: input.status ?? 'supported',
      description: `${id} resolver fixture.`,
      owners: ['gameplay-platform'],
      runtimeFamilies: input.runtimeFamilies ?? ['phaser_2d_action_arcade.v1'],
      contractVersion: 'gameplay-capability-package.v1'
    },
    dsl: {
      schemaFragmentId: `${id}.schema`,
      ownedPaths: [ownedPath],
      normalizerId: `${id}.normalizer`,
      migrations: []
    },
    ir: {
      compilerId: `${id}.ir`,
      ownedNodeKinds: [`component.${id.replace(/\.v1$/, '')}`]
    },
    runtime: {
      families: input.runtimeFamilies ?? ['phaser_2d_action_arcade.v1'],
      systems: [{ id: `${id}.system`, version: 'v1', phase: 'gameplay', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: `SetComponentProperty:${id}`, executionPolicy: 'hot_runtime_patch' }],
      compilerId: `${id}.amendments`
    },
    patch: {
      descriptors: [{ id: `${id}.patch`, policy: 'hot_runtime_patch', ownedPaths: [ownedPath] }]
    },
    qa: {
      probes: [createQaProbe(`${id}.qa.required`, id)],
      requiredEvidence: [{ id: `${id}.evidence.runtime`, artifactKind: 'capability_qa_report', required: true }]
    },
    render: {
      assetRoles: [],
      sceneBindings: [],
      fallbackPolicy: 'not_applicable'
    },
    dependencies: input.dependencies ?? [],
    optionalDependencies: input.optionalDependencies ?? [],
    conflictsWith: input.conflictsWith ?? [],
    provides: [{ id: `${id}.service`, version: 'v1' }],
    defaults: {},
    diagnostics: {}
  } as GameplayCapabilityPackageContract;
}

function createQaProbe(id: string, capabilityId: string): GameplayCapabilityPackageContract['qa']['probes'][number] {
  return {
    id,
    capabilityId,
    severity: 'required',
    prerequisites: ['runtime scene started'],
    actions: [{ id: `${id}.action`, kind: 'runtime_event', target: `${capabilityId}.probe`, parameters: { event: 'probe_start' } }],
    observations: [{ id: `${id}.observation`, kind: 'runtime_event', runtimeSystemId: `${capabilityId}.system`, ref: `${capabilityId}.observed` }],
    assertions: [{ id: `${id}.assertion`, observationId: `${id}.observation`, comparator: 'exists', message: `${capabilityId} works` }]
  };
}
