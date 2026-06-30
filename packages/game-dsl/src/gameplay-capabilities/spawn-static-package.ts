import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  SPAWN_STATIC_CAPABILITY_ID,
  SPAWN_STATIC_RUNTIME_SYSTEM_ID,
  SPAWN_STATIC_TRIGGERED_EVENT_TYPE
} from './spawn-static-runtime-module.js';

export const SPAWN_STATIC_PACKAGE_VERSION = '1.0.0';
export const SPAWN_STATIC_REQUIRED_PROBE_ID = 'spawn.static.v1.triggered.browser_qa.v1';
export const SPAWN_STATIC_PACKAGE_REQUIRED_EVIDENCE_ID = 'spawn.static.v1.evidence.capability_qa_report.v1';

export function createSpawnStaticPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: SPAWN_STATIC_CAPABILITY_ID,
      packageVersion: SPAWN_STATIC_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Static and trigger-based enemy spawning capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'spawn.static.schema',
      ownedPaths: ['/capability_configs/static_spawn'],
      normalizerId: 'spawn.static.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'spawn.static.ir',
      ownedNodeKinds: ['runtime_system.spawn.static']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: SPAWN_STATIC_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'gameplay', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetStaticSpawn:triggered_wave', executionPolicy: 'hot_runtime_patch' }],
      compilerId: 'spawn.static.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'spawn.static.patch.wave_trigger',
          policy: 'hot_runtime_patch',
          ownedPaths: ['/capability_configs/static_spawn']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: SPAWN_STATIC_REQUIRED_PROBE_ID,
          capabilityId: SPAWN_STATIC_CAPABILITY_ID,
          prerequisites: ['runtime scene started', 'player reaches a configured spawn trigger'],
          actions: [
            {
              id: `${SPAWN_STATIC_REQUIRED_PROBE_ID}.action.reach_trigger`,
              kind: 'input',
              target: 'movement.run.right',
              parameters: { ownerEntityId: 'player', action: 'reach_spawn_trigger' }
            }
          ],
          observations: [
            {
              id: `${SPAWN_STATIC_REQUIRED_PROBE_ID}.observation.wave_triggered`,
              kind: 'state_probe',
              runtimeSystemId: SPAWN_STATIC_RUNTIME_SYSTEM_ID,
              ref: SPAWN_STATIC_TRIGGERED_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${SPAWN_STATIC_REQUIRED_PROBE_ID}.assertion.wave_triggered`,
              observationId: `${SPAWN_STATIC_REQUIRED_PROBE_ID}.observation.wave_triggered`,
              comparator: 'exists',
              message: 'spawn static package observes a triggered runtime wave spawn'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: SPAWN_STATIC_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'spawn.static.service', version: 'v1' }],
    defaults: {
      triggeredEvent: SPAWN_STATIC_TRIGGERED_EVENT_TYPE
    },
    diagnostics: {
      source: 'stage37.spawn_static_package_owned_qa_slice'
    }
  };
}
