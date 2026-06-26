import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  WEAPON_DEATH_RESET_CAPABILITY_ID,
  WEAPON_DEATH_RESET_EVENT_TYPE,
  WEAPON_DEATH_RESET_INITIAL_WEAPON_ID,
  WEAPON_DEATH_RESET_NON_INITIAL_WEAPON_ID,
  WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
  WEAPON_DEATH_RESET_RUNTIME_SYSTEM_ID
} from './weapon-death-reset-runtime-module.js';

export const WEAPON_DEATH_RESET_PACKAGE_VERSION = '1.0.0';
export const WEAPON_DEATH_RESET_REQUIRED_PROBE_ID = 'weapon.death_reset.v1.restore.browser_qa.v1';
export const WEAPON_DEATH_RESET_PACKAGE_REQUIRED_EVIDENCE_ID = 'weapon.death_reset.v1.evidence.capability_qa_report.v1';

export function createWeaponDeathResetPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: WEAPON_DEATH_RESET_CAPABILITY_ID,
      packageVersion: WEAPON_DEATH_RESET_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Weapon reset-on-death capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'weapon.death_reset.schema',
      ownedPaths: ['/capability_configs/weapon_death_reset'],
      normalizerId: 'weapon.death_reset.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'weapon.death_reset.ir',
      ownedNodeKinds: ['runtime_system.weapon.death_reset']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: WEAPON_DEATH_RESET_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'gameplay', dependencies: ['health.player_health_points'] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetWeaponLoadout:reset_on_death', executionPolicy: 'hot_runtime_patch' }],
      compilerId: 'weapon.death_reset.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'weapon.death_reset.patch.reset_policy',
          policy: 'hot_runtime_patch',
          ownedPaths: ['/capability_configs/weapon_death_reset']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: WEAPON_DEATH_RESET_REQUIRED_PROBE_ID,
          capabilityId: WEAPON_DEATH_RESET_CAPABILITY_ID,
          prerequisites: [
            'runtime scene started',
            'player has a non-initial weapon equipped',
            'player death occurs',
            'initial weapon is configured'
          ],
          actions: [
            {
              id: `${WEAPON_DEATH_RESET_REQUIRED_PROBE_ID}.action.defeat_player`,
              kind: 'runtime_event',
              target: WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
              parameters: {
                ownerEntityId: 'player',
                action: 'defeat_player',
                previousWeaponId: WEAPON_DEATH_RESET_NON_INITIAL_WEAPON_ID,
                initialWeaponId: WEAPON_DEATH_RESET_INITIAL_WEAPON_ID
              }
            }
          ],
          observations: [
            {
              id: `${WEAPON_DEATH_RESET_REQUIRED_PROBE_ID}.observation.player_defeated`,
              kind: 'runtime_event',
              runtimeSystemId: WEAPON_DEATH_RESET_RUNTIME_SYSTEM_ID,
              ref: WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE
            },
            {
              id: `${WEAPON_DEATH_RESET_REQUIRED_PROBE_ID}.observation.restored`,
              kind: 'state_probe',
              runtimeSystemId: WEAPON_DEATH_RESET_RUNTIME_SYSTEM_ID,
              ref: WEAPON_DEATH_RESET_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${WEAPON_DEATH_RESET_REQUIRED_PROBE_ID}.assertion.player_defeated`,
              observationId: `${WEAPON_DEATH_RESET_REQUIRED_PROBE_ID}.observation.player_defeated`,
              comparator: 'exists',
              message: 'weapon death reset package observes player death before reset'
            },
            {
              id: `${WEAPON_DEATH_RESET_REQUIRED_PROBE_ID}.assertion.restored_initial_weapon`,
              observationId: `${WEAPON_DEATH_RESET_REQUIRED_PROBE_ID}.observation.restored`,
              comparator: 'exists',
              expected: {
                weaponReset: true,
                currentWeaponId: WEAPON_DEATH_RESET_INITIAL_WEAPON_ID,
                initialWeaponId: WEAPON_DEATH_RESET_INITIAL_WEAPON_ID,
                previousWeaponId: WEAPON_DEATH_RESET_NON_INITIAL_WEAPON_ID
              },
              message: 'weapon death reset package observes restoration to the configured initial weapon'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: WEAPON_DEATH_RESET_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    dependencies: [
      { capabilityId: 'weapon.default_straight_single.v1', range: '^1.0.0' },
      { capabilityId: 'health.player_health_points.v1', range: '^1.0.0' }
    ],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'weapon.death_reset.service', version: 'v1' }],
    defaults: {
      resetEvent: WEAPON_DEATH_RESET_EVENT_TYPE,
      deathEvent: WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
      initialWeaponId: WEAPON_DEATH_RESET_INITIAL_WEAPON_ID,
      nonInitialWeaponId: WEAPON_DEATH_RESET_NON_INITIAL_WEAPON_ID,
      requiredStateFields: ['weaponReset', 'currentWeaponId', 'initialWeaponId', 'previousWeaponId']
    },
    diagnostics: {
      source: 'stage37.weapon_death_reset_package_owned_qa_slice'
    }
  };
}
