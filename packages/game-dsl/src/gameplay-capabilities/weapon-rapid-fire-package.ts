import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
  WEAPON_RAPID_FIRE_BURST_SHOT_COUNT,
  WEAPON_RAPID_FIRE_BURST_WINDOW_MS,
  WEAPON_RAPID_FIRE_CAPABILITY_ID,
  WEAPON_RAPID_FIRE_COOLDOWN_MS,
  WEAPON_RAPID_FIRE_RUNTIME_SYSTEM_ID
} from './weapon-rapid-fire-runtime-module.js';

export const WEAPON_RAPID_FIRE_PACKAGE_VERSION = '1.0.0';
export const WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID = 'weapon.rapid_fire.v1.burst.browser_qa.v1';
export const WEAPON_RAPID_FIRE_PACKAGE_REQUIRED_EVIDENCE_ID = 'weapon.rapid_fire.v1.evidence.capability_qa_report.v1';

export function createWeaponRapidFirePackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: WEAPON_RAPID_FIRE_CAPABILITY_ID,
      packageVersion: WEAPON_RAPID_FIRE_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Rapid-fire weapon capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'weapon.rapid_fire.schema',
      ownedPaths: ['/capability_configs/rapid_fire_weapon'],
      normalizerId: 'weapon.rapid_fire.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'weapon.rapid_fire.ir',
      ownedNodeKinds: ['runtime_system.weapon.rapid_fire']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: WEAPON_RAPID_FIRE_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'gameplay', dependencies: ['weapon.default_straight_single'] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetWeaponFireRate:rapid_fire', executionPolicy: 'hot_runtime_patch' }],
      compilerId: 'weapon.rapid_fire.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'weapon.rapid_fire.patch.fire_rate',
          policy: 'hot_runtime_patch',
          ownedPaths: ['/capability_configs/rapid_fire_weapon']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID,
          capabilityId: WEAPON_RAPID_FIRE_CAPABILITY_ID,
          prerequisites: ['runtime scene started', 'player owns primary rapid-fire weapon', 'weapon fire action can be triggered repeatedly'],
          actions: [
            {
              id: `${WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID}.action.fire_burst`,
              kind: 'runtime_event',
              target: WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
              parameters: {
                ownerEntityId: 'player',
                action: 'fire_burst',
                cooldownMs: WEAPON_RAPID_FIRE_COOLDOWN_MS,
                burstShotCount: WEAPON_RAPID_FIRE_BURST_SHOT_COUNT,
                burstWindowMs: WEAPON_RAPID_FIRE_BURST_WINDOW_MS
              }
            }
          ],
          observations: [
            {
              id: `${WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID}.observation.burst`,
              kind: 'state_probe',
              runtimeSystemId: WEAPON_RAPID_FIRE_RUNTIME_SYSTEM_ID,
              ref: WEAPON_RAPID_FIRE_BURST_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID}.assertion.rapid_burst`,
              observationId: `${WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID}.observation.burst`,
              comparator: 'exists',
              expected: {
                rapidFire: true,
                cooldownMs: WEAPON_RAPID_FIRE_COOLDOWN_MS,
                burstShotCount: WEAPON_RAPID_FIRE_BURST_SHOT_COUNT,
                burstWindowMs: WEAPON_RAPID_FIRE_BURST_WINDOW_MS
              },
              message: 'rapid-fire package observes repeated shots with the configured cooldown and burst window'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: WEAPON_RAPID_FIRE_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'weapon.rapid_fire.service', version: 'v1' }],
    defaults: {
      cooldownMs: WEAPON_RAPID_FIRE_COOLDOWN_MS,
      burstShotCount: WEAPON_RAPID_FIRE_BURST_SHOT_COUNT,
      burstWindowMs: WEAPON_RAPID_FIRE_BURST_WINDOW_MS,
      burstEvent: WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
      requiredStateFields: ['rapidFire', 'cooldownMs', 'burstShotCount', 'burstWindowMs']
    },
    diagnostics: {
      source: 'stage37.weapon_rapid_fire_package_owned_qa_slice'
    }
  };
}
