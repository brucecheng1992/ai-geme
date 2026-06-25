import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  COMBAT_AIRBORNE_FIRE_CAPABILITY_ID,
  COMBAT_AIRBORNE_FIRE_FIRED_EVENT_TYPE,
  COMBAT_AIRBORNE_FIRE_RUNTIME_SYSTEM_ID
} from './combat-airborne-fire-runtime-module.js';

export const COMBAT_AIRBORNE_FIRE_PACKAGE_VERSION = '1.0.0';
export const COMBAT_AIRBORNE_FIRE_REQUIRED_PROBE_ID = 'combat.airborne_fire.v1.fired.browser_qa.v1';
export const COMBAT_AIRBORNE_FIRE_PACKAGE_REQUIRED_EVIDENCE_ID = 'combat.airborne_fire.v1.evidence.capability_qa_report.v1';

export function createCombatAirborneFirePackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: COMBAT_AIRBORNE_FIRE_CAPABILITY_ID,
      packageVersion: COMBAT_AIRBORNE_FIRE_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Airborne fire permission capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'combat.airborne_fire.schema',
      ownedPaths: ['/capability_configs/airborne_fire'],
      normalizerId: 'combat.airborne_fire.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'combat.airborne_fire.ir',
      ownedNodeKinds: ['runtime_system.combat.airborne_fire']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: COMBAT_AIRBORNE_FIRE_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'gameplay', dependencies: ['combat.projectile'] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetCombatAirborneFire:enabled', executionPolicy: 'hot_runtime_patch' }],
      compilerId: 'combat.airborne_fire.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'combat.airborne_fire.patch.enabled',
          policy: 'hot_runtime_patch',
          ownedPaths: ['/capability_configs/airborne_fire']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: COMBAT_AIRBORNE_FIRE_REQUIRED_PROBE_ID,
          capabilityId: COMBAT_AIRBORNE_FIRE_CAPABILITY_ID,
          prerequisites: ['runtime scene started', 'player jumps before firing', 'fire action occurs while player is airborne'],
          actions: [
            {
              id: `${COMBAT_AIRBORNE_FIRE_REQUIRED_PROBE_ID}.action.fire_airborne`,
              kind: 'runtime_event',
              target: COMBAT_AIRBORNE_FIRE_FIRED_EVENT_TYPE,
              parameters: { ownerEntityId: 'player', action: 'fire', airborne: true }
            }
          ],
          observations: [
            {
              id: `${COMBAT_AIRBORNE_FIRE_REQUIRED_PROBE_ID}.observation.airborne_fire`,
              kind: 'runtime_event',
              runtimeSystemId: COMBAT_AIRBORNE_FIRE_RUNTIME_SYSTEM_ID,
              ref: COMBAT_AIRBORNE_FIRE_FIRED_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${COMBAT_AIRBORNE_FIRE_REQUIRED_PROBE_ID}.assertion.airborne_fire`,
              observationId: `${COMBAT_AIRBORNE_FIRE_REQUIRED_PROBE_ID}.observation.airborne_fire`,
              comparator: 'exists',
              message: 'combat airborne fire package observes a fire action while the player is airborne'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: COMBAT_AIRBORNE_FIRE_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    dependencies: [{ capabilityId: 'combat.projectile.v1', range: '^1.0.0' }],
    optionalDependencies: [{ capabilityId: 'movement.run_jump.v1', range: '^1.0.0' }],
    conflictsWith: [],
    provides: [{ id: 'combat.airborne_fire.service', version: 'v1' }],
    defaults: {
      airborneFireEvent: COMBAT_AIRBORNE_FIRE_FIRED_EVENT_TYPE
    },
    diagnostics: {
      source: 'stage37.combat_airborne_fire_package_owned_qa_slice'
    }
  };
}
