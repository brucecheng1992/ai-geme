import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  WEAPON_SPREAD_SHOT_CAPABILITY_ID,
  WEAPON_SPREAD_SHOT_EVENT_TYPE,
  WEAPON_SPREAD_SHOT_PROJECTILE_COUNT,
  WEAPON_SPREAD_SHOT_RUNTIME_SYSTEM_ID,
  WEAPON_SPREAD_SHOT_SPREAD_ARC_DEGREES,
  WEAPON_SPREAD_SHOT_SPREAD_ANGLES_DEGREES
} from './weapon-spread-shot-runtime-module.js';

export const WEAPON_SPREAD_SHOT_PACKAGE_VERSION = '1.0.0';
export const WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID = 'weapon.spread_shot.v1.fire.browser_qa.v1';
export const WEAPON_SPREAD_SHOT_PACKAGE_REQUIRED_EVIDENCE_ID = 'weapon.spread_shot.v1.evidence.capability_qa_report.v1';

export function createWeaponSpreadShotPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: WEAPON_SPREAD_SHOT_CAPABILITY_ID,
      packageVersion: WEAPON_SPREAD_SHOT_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Spread-shot weapon capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'weapon.spread_shot.schema',
      ownedPaths: ['/capability_configs/spread_shot_weapon'],
      normalizerId: 'weapon.spread_shot.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'weapon.spread_shot.ir',
      ownedNodeKinds: ['runtime_system.weapon.spread_shot']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: WEAPON_SPREAD_SHOT_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'gameplay', dependencies: ['weapon.default_straight_single'] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetWeaponProjectilePattern:spread_shot', executionPolicy: 'hot_runtime_patch' }],
      compilerId: 'weapon.spread_shot.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'weapon.spread_shot.patch.projectile_pattern',
          policy: 'hot_runtime_patch',
          ownedPaths: ['/capability_configs/spread_shot_weapon']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID,
          capabilityId: WEAPON_SPREAD_SHOT_CAPABILITY_ID,
          prerequisites: ['runtime scene started', 'player owns primary spread-shot weapon', 'weapon fire action can spawn projectiles'],
          actions: [
            {
              id: `${WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID}.action.fire_spread`,
              kind: 'runtime_event',
              target: WEAPON_SPREAD_SHOT_EVENT_TYPE,
              parameters: {
                ownerEntityId: 'player',
                action: 'fire_spread',
                projectileCount: WEAPON_SPREAD_SHOT_PROJECTILE_COUNT,
                spreadArcDeg: WEAPON_SPREAD_SHOT_SPREAD_ARC_DEGREES,
                spreadAnglesDeg: [...WEAPON_SPREAD_SHOT_SPREAD_ANGLES_DEGREES]
              }
            }
          ],
          observations: [
            {
              id: `${WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID}.observation.spread_projectiles`,
              kind: 'state_probe',
              runtimeSystemId: WEAPON_SPREAD_SHOT_RUNTIME_SYSTEM_ID,
              ref: WEAPON_SPREAD_SHOT_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID}.assertion.spread_projectiles`,
              observationId: `${WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID}.observation.spread_projectiles`,
              comparator: 'exists',
              expected: {
                spreadShot: true,
                projectileCount: WEAPON_SPREAD_SHOT_PROJECTILE_COUNT,
                spreadArcDeg: WEAPON_SPREAD_SHOT_SPREAD_ARC_DEGREES,
                spreadAnglesDeg: [...WEAPON_SPREAD_SHOT_SPREAD_ANGLES_DEGREES]
              },
              message: 'spread-shot package observes multiple projectiles across the configured spread angles'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: WEAPON_SPREAD_SHOT_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    dependencies: [{ capabilityId: 'weapon.default_straight_single.v1', range: '^1.0.0' }],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'weapon.spread_shot.service', version: 'v1' }],
    defaults: {
      projectileCount: WEAPON_SPREAD_SHOT_PROJECTILE_COUNT,
      spreadArcDeg: WEAPON_SPREAD_SHOT_SPREAD_ARC_DEGREES,
      spreadAnglesDeg: [...WEAPON_SPREAD_SHOT_SPREAD_ANGLES_DEGREES],
      spreadEvent: WEAPON_SPREAD_SHOT_EVENT_TYPE,
      requiredStateFields: ['spreadShot', 'projectileCount', 'spreadArcDeg', 'spreadAnglesDeg']
    },
    diagnostics: {
      source: 'stage37.weapon_spread_shot_package_owned_qa_slice'
    }
  };
}
