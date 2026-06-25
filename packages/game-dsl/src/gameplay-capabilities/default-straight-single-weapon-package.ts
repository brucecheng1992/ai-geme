import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  DEFAULT_STRAIGHT_SINGLE_WEAPON_CAPABILITY_ID,
  DEFAULT_STRAIGHT_SINGLE_WEAPON_RUNTIME_SYSTEM_ID
} from './default-straight-single-weapon-runtime-module.js';

export const DEFAULT_STRAIGHT_SINGLE_WEAPON_PACKAGE_VERSION = '1.0.0';
export const DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID = 'weapon.default_straight_single.v1.fire.browser_qa.v1';
export const DEFAULT_STRAIGHT_SINGLE_WEAPON_PACKAGE_REQUIRED_EVIDENCE_ID =
  'weapon.default_straight_single.v1.evidence.capability_qa_report.v1';

export function createDefaultStraightSingleWeaponPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: DEFAULT_STRAIGHT_SINGLE_WEAPON_CAPABILITY_ID,
      packageVersion: DEFAULT_STRAIGHT_SINGLE_WEAPON_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Default straight single-shot weapon capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'weapon.default_straight_single.schema',
      ownedPaths: ['/capability_configs/default_straight_single_weapon'],
      normalizerId: 'weapon.default_straight_single.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'weapon.default_straight_single.ir',
      ownedNodeKinds: ['runtime_system.weapon.default_straight_single']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: DEFAULT_STRAIGHT_SINGLE_WEAPON_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'gameplay', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetWeaponProjectilePattern:default_straight_single', executionPolicy: 'hot_runtime_patch' }],
      compilerId: 'weapon.default_straight_single.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'weapon.default_straight_single.patch.projectile_pattern',
          policy: 'hot_runtime_patch',
          ownedPaths: ['/capability_configs/default_straight_single_weapon']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID,
          capabilityId: DEFAULT_STRAIGHT_SINGLE_WEAPON_CAPABILITY_ID,
          prerequisites: ['runtime scene started', 'player owns primary default straight single weapon'],
          actions: [
            {
              id: `${DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID}.action.fire`,
              kind: 'runtime_event',
              target: 'weapon.default_straight_single.fire',
              parameters: { ownerEntityId: 'player', action: 'shoot_projectile' }
            }
          ],
          observations: [
            {
              id: `${DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID}.observation.player_fired`,
              kind: 'runtime_event',
              runtimeSystemId: DEFAULT_STRAIGHT_SINGLE_WEAPON_RUNTIME_SYSTEM_ID,
              ref: 'player.fired'
            },
            {
              id: `${DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID}.observation.projectile_spawned`,
              kind: 'runtime_event',
              runtimeSystemId: DEFAULT_STRAIGHT_SINGLE_WEAPON_RUNTIME_SYSTEM_ID,
              ref: 'projectile.spawned'
            }
          ],
          assertions: [
            {
              id: `${DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID}.assertion.player_fired`,
              observationId: `${DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID}.observation.player_fired`,
              comparator: 'exists',
              message: 'default straight single weapon emits player.fired'
            },
            {
              id: `${DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID}.assertion.projectile_spawned`,
              observationId: `${DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID}.observation.projectile_spawned`,
              comparator: 'exists',
              message: 'default straight single weapon emits projectile.spawned'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: DEFAULT_STRAIGHT_SINGLE_WEAPON_PACKAGE_REQUIRED_EVIDENCE_ID,
          artifactKind: 'capability_qa_report',
          required: true
        }
      ]
    },
    render: {
      assetRoles: [],
      sceneBindings: [],
      fallbackPolicy: 'not_applicable'
    },
    dependencies: [],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'weapon.default_straight_single.service', version: 'v1' }],
    defaults: {
      projectilePattern: 'straight',
      projectileCount: 1,
      slot: 'primary'
    },
    diagnostics: {
      source: 'stage37.default_weapon_package_contract_prerequisite'
    }
  };
}
