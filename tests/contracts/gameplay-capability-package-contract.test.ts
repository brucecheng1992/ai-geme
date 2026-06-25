import { describe, expect, it } from 'vitest';

import {
  validateGameplayCapabilityPackage,
  validateGameplayCapabilityPackages,
  type GameplayCapabilityPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/package-contract.js';
import {
  DEFAULT_STRAIGHT_SINGLE_WEAPON_PACKAGE_REQUIRED_EVIDENCE_ID,
  DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID,
  createDefaultStraightSingleWeaponPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/default-straight-single-weapon-package.js';
import {
  DEFAULT_STRAIGHT_SINGLE_WEAPON_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/default-straight-single-weapon-runtime-module.js';
import {
  CAMERA_SIDE_FOLLOW_PACKAGE_REQUIRED_EVIDENCE_ID,
  CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID,
  createCameraSideFollowPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/camera-side-follow-package.js';
import {
  CAMERA_SIDE_FOLLOW_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/camera-side-follow-runtime-module.js';
import {
  COMBAT_PROJECTILE_PACKAGE_REQUIRED_EVIDENCE_ID,
  COMBAT_PROJECTILE_REQUIRED_PROBE_ID,
  createCombatProjectilePackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/combat-projectile-package.js';
import {
  COMBAT_PROJECTILE_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/combat-projectile-runtime-module.js';
import {
  MOVEMENT_RUN_JUMP_PACKAGE_REQUIRED_EVIDENCE_ID,
  MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID,
  createMovementRunJumpPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/movement-run-jump-package.js';
import {
  MOVEMENT_RUN_JUMP_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/movement-run-jump-runtime-module.js';

describe('Gameplay capability package contract', () => {
  it('accepts a complete supported package and keeps hashes deterministic', () => {
    const contract = createPackageContract();
    const first = validateGameplayCapabilityPackage(contract);
    const second = validateGameplayCapabilityPackage(structuredClone(contract));

    expect(first.status).toBe('valid');
    expect(first.completeness).toBe('COMPLETE_SUPPORTED');
    expect(first.supportEligible).toBe(true);
    expect(first.manifestHash).toMatch(/^fnv1a_[a-f0-9]{8}$/);
    expect(first.packageHash).toBe(second.packageHash);
  });

  it('accepts the default straight single weapon package prerequisite contract', () => {
    const contract = createDefaultStraightSingleWeaponPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'weapon.default_straight_single.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([DEFAULT_STRAIGHT_SINGLE_WEAPON_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: DEFAULT_STRAIGHT_SINGLE_WEAPON_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'weapon.default_straight_single.v1',
      severity: 'required',
      observations: expect.arrayContaining([expect.objectContaining({ runtimeSystemId: DEFAULT_STRAIGHT_SINGLE_WEAPON_RUNTIME_SYSTEM_ID })])
    });
  });

  it('accepts the camera side follow package-owned QA contract', () => {
    const contract = createCameraSideFollowPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'camera.side_follow.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([CAMERA_SIDE_FOLLOW_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: CAMERA_SIDE_FOLLOW_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'camera.side_follow.v1',
      severity: 'required',
      observations: [expect.objectContaining({ kind: 'camera_scroll', runtimeSystemId: CAMERA_SIDE_FOLLOW_RUNTIME_SYSTEM_ID, ref: 'camera.side_follow.active' })]
    });
  });

  it('accepts the combat projectile package-owned QA contract', () => {
    const contract = createCombatProjectilePackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === COMBAT_PROJECTILE_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'combat.projectile.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([COMBAT_PROJECTILE_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: COMBAT_PROJECTILE_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'combat.projectile.v1',
      severity: 'required',
      observations: [expect.objectContaining({ runtimeSystemId: COMBAT_PROJECTILE_RUNTIME_SYSTEM_ID, ref: 'projectile.spawned' })]
    });
  });

  it('accepts the movement run jump package-owned QA contract', () => {
    const contract = createMovementRunJumpPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'movement.run_jump.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([MOVEMENT_RUN_JUMP_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: MOVEMENT_RUN_JUMP_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'movement.run_jump.v1',
      severity: 'required',
      observations: [expect.objectContaining({ runtimeSystemId: MOVEMENT_RUN_JUMP_RUNTIME_SYSTEM_ID, ref: 'player.jumped' })]
    });
  });

  it('does not let manifest.status supported bypass missing QA and evidence', () => {
    const report = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      qa: { probes: [], requiredEvidence: [] }
    });

    expect(report.status).toBe('invalid');
    expect(report.supportEligible).toBe(false);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PACKAGE_SCHEMA_INVALID'
        })
      ])
    );
  });

  it('rejects supported packages that parse but are not complete supported', () => {
    const report = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      qa: {
        probes: [createQaProbe('movement.run_jump.v1.qa.optional', { severity: 'optional' })],
        requiredEvidence: [{ id: 'movement.run_jump.v1.evidence.optional', artifactKind: 'capability_qa_report', required: false }]
      }
    });

    expect(report.status).toBe('invalid');
    expect(report.supportEligible).toBe(false);
    expect(report.completeness).toBe('RUNTIME_WITHOUT_QA');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'SUPPORTED_PACKAGE_INCOMPLETE'
        })
      ])
    );
  });

  it('rejects manifest capability version drift and extra arbitrary fields', () => {
    const versionDrift = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      manifest: { ...createPackageContract().manifest, capabilityVersion: 'v2' }
    });
    const arbitraryScript = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      runtime: {
        ...createPackageContract().runtime,
        systems: [{ ...createPackageContract().runtime.systems[0], script: 'Math.random()' }]
      }
    });

    expect(versionDrift.status).toBe('invalid');
    expect(versionDrift.issues.some((issue) => issue.path.endsWith('capabilityVersion'))).toBe(true);
    expect(arbitraryScript.status).toBe('invalid');
    expect(arbitraryScript.issues.some((issue) => issue.path.includes('runtime.systems.0'))).toBe(true);
  });

  it('rejects patch descriptors without owned paths or outside the package DSL ownership', () => {
    const emptyPatchPaths = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      patch: { descriptors: [{ id: 'movement.run_jump.v1.patch.move_speed', policy: 'warm_restart', ownedPaths: [] }] }
    });
    const outsidePatchPath = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      patch: { descriptors: [{ id: 'movement.run_jump.v1.patch.enemy_speed', policy: 'warm_restart', ownedPaths: ['/entities/components/enemy.speed'] }] }
    });

    expect(emptyPatchPaths.status).toBe('invalid');
    expect(emptyPatchPaths.issues.some((issue) => issue.path.includes('patch.descriptors.0.ownedPaths'))).toBe(true);
    expect(outsidePatchPath.status).toBe('invalid');
    expect(outsidePatchPath.issues.some((issue) => issue.path.includes('patch.descriptors.0.ownedPaths.0'))).toBe(true);
  });

  it('rejects non-json defaults and executable-looking defaults keys', () => {
    const functionDefault = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      defaults: { value: () => 1 }
    });
    const scriptKeyDefault = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      defaults: { nested: { script: 'Math.random()' } }
    });

    expect(functionDefault.status).toBe('invalid');
    expect(functionDefault.issues.some((issue) => issue.path.includes('defaults.value'))).toBe(true);
    expect(scriptKeyDefault.status).toBe('invalid');
    expect(scriptKeyDefault.issues.some((issue) => issue.path.includes('defaults.nested.script'))).toBe(true);
  });

  it('requires capability-owned QA probes and required evidence', () => {
    const foreignProbe = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      qa: {
        probes: [createQaProbe('other.capability.v1.qa.required', { capabilityId: 'other.capability.v1' })],
        requiredEvidence: [{ id: 'movement.run_jump.v1.evidence.runtime', artifactKind: 'capability_qa_report', required: true }]
      }
    });
    const foreignEvidence = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      qa: {
        probes: [createQaProbe('movement.run_jump.v1.qa.required')],
        requiredEvidence: [{ id: 'other.capability.v1.evidence.runtime', artifactKind: 'capability_qa_report', required: true }]
      }
    });

    expect(foreignProbe.status).toBe('invalid');
    expect(foreignProbe.issues.some((issue) => issue.path.includes('qa.probes.0.id'))).toBe(true);
    expect(foreignEvidence.status).toBe('invalid');
    expect(foreignEvidence.issues.some((issue) => issue.path.includes('qa.requiredEvidence.0.id'))).toBe(true);
  });

  it('rejects owned DSL path overlap across packages', () => {
    const first = createPackageContract();
    const second = createPackageContract({
      id: 'movement.wall_jump.v1',
      ownedPath: '/entities/components/movement.run_jump'
    });
    const report = validateGameplayCapabilityPackages([first, second]);

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'OWNED_DSL_PATH_CONFLICT',
          path: 'dsl.ownedPaths'
        })
      ])
    );
  });

  it('rejects parent-child owned DSL path overlap across packages', () => {
    const first = createPackageContract({
      ownedPath: '/entities/components'
    });
    const second = createPackageContract({
      id: 'movement.wall_jump.v1',
      ownedPath: '/entities/components/movement.wall_jump'
    });
    const report = validateGameplayCapabilityPackages([first, second]);

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'OWNED_DSL_PATH_CONFLICT'
        })
      ])
    );
  });

  it('rejects duplicate package IDs in a package set', () => {
    const report = validateGameplayCapabilityPackages([createPackageContract(), createPackageContract({ ownedPath: '/entities/components/movement.run_jump.alt' })]);

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'DUPLICATE_PACKAGE_ID',
          path: 'manifest.id'
        })
      ])
    );
  });

  it('keeps experimental complete packages out of production support eligibility', () => {
    const report = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      manifest: { ...createPackageContract().manifest, status: 'experimental' }
    });

    expect(report.status).toBe('valid');
    expect(report.completeness).toBe('COMPLETE_EXPERIMENTAL');
    expect(report.supportEligible).toBe(false);
  });
});

function createPackageContract(input: { id?: string; ownedPath?: string } = {}): GameplayCapabilityPackageContract {
  const id = input.id ?? 'movement.run_jump.v1';
  const ownedPath = input.ownedPath ?? '/entities/components/movement.run_jump';
  return {
    manifest: {
      id,
      packageVersion: '1.0.0',
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Run and jump movement capability.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
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
      ownedNodeKinds: ['component.movement.run_jump']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: `${id}.system`, version: 'v1', phase: 'gameplay', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetComponentProperty:moveSpeed', executionPolicy: 'warm_restart' }],
      compilerId: `${id}.amendments`
    },
    patch: {
      descriptors: [{ id: `${id}.patch.move_speed`, policy: 'warm_restart', ownedPaths: [ownedPath] }]
    },
    qa: {
      probes: [createQaProbe(`${id}.qa.required`, { capabilityId: id, runtimeSystemId: `${id}.system`, message: 'player x increases after move input' })],
      requiredEvidence: [{ id: `${id}.evidence.runtime`, artifactKind: 'capability_qa_report', required: true }]
    },
    render: {
      assetRoles: [],
      sceneBindings: [],
      fallbackPolicy: 'not_applicable'
    },
    dependencies: [],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: `${id}.service`, version: 'v1' }],
    defaults: {},
    diagnostics: {}
  };
}

function createQaProbe(
  id: string,
  input: {
    capabilityId?: string;
    runtimeSystemId?: string;
    severity?: 'required' | 'optional';
    message?: string;
  } = {}
): GameplayCapabilityPackageContract['qa']['probes'][number] {
  const capabilityId = input.capabilityId ?? 'movement.run_jump.v1';
  const runtimeSystemId = input.runtimeSystemId ?? 'movement.run_jump.v1.system';
  return {
    id,
    capabilityId,
    severity: input.severity ?? 'required',
    prerequisites: ['runtime scene started'],
    actions: [{ id: `${id}.action.move_right`, kind: 'input', target: 'player', parameters: { control: 'right', durationMs: 240 } }],
    observations: [{ id: `${id}.observation.player_x`, kind: 'position_delta', runtimeSystemId, ref: 'player.x' }],
    assertions: [
      {
        id: `${id}.assertion.player_x_increased`,
        observationId: `${id}.observation.player_x`,
        comparator: 'increased',
        message: input.message ?? 'player x increases after move input'
      }
    ]
  };
}
