import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  SPAWN_ENEMY_WAVE_CAPABILITY_ID,
  SPAWN_ENEMY_WAVE_ORDERED_EVENT_TYPE,
  SPAWN_ENEMY_WAVE_RUNTIME_SYSTEM_ID
} from './spawn-enemy-wave-runtime-module.js';

export const SPAWN_ENEMY_WAVE_PACKAGE_VERSION = '1.0.0';
export const SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID = 'spawn.enemy_wave.v1.ordered.browser_qa.v1';
export const SPAWN_ENEMY_WAVE_PACKAGE_REQUIRED_EVIDENCE_ID = 'spawn.enemy_wave.v1.evidence.capability_qa_report.v1';

export function createSpawnEnemyWavePackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: SPAWN_ENEMY_WAVE_CAPABILITY_ID,
      packageVersion: SPAWN_ENEMY_WAVE_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Ordered enemy-wave spawning capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'spawn.enemy_wave.schema',
      ownedPaths: ['/capability_configs/enemy_wave_sequence'],
      normalizerId: 'spawn.enemy_wave.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'spawn.enemy_wave.ir',
      ownedNodeKinds: ['runtime_system.spawn.enemy_wave']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: SPAWN_ENEMY_WAVE_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'gameplay', dependencies: ['spawn.static'] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetEnemyWaveSequence:ordered_gate', executionPolicy: 'hot_runtime_patch' }],
      compilerId: 'spawn.enemy_wave.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'spawn.enemy_wave.patch.ordered_gate',
          policy: 'hot_runtime_patch',
          ownedPaths: ['/capability_configs/enemy_wave_sequence']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID,
          capabilityId: SPAWN_ENEMY_WAVE_CAPABILITY_ID,
          prerequisites: ['runtime scene started', 'player reaches an ordered enemy-wave gate'],
          actions: [
            {
              id: `${SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID}.action.reach_gate`,
              kind: 'input',
              target: 'movement.run.right',
              parameters: { ownerEntityId: 'player', action: 'reach_enemy_wave_gate' }
            }
          ],
          observations: [
            {
              id: `${SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID}.observation.ordered_wave`,
              kind: 'state_probe',
              runtimeSystemId: SPAWN_ENEMY_WAVE_RUNTIME_SYSTEM_ID,
              ref: SPAWN_ENEMY_WAVE_ORDERED_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID}.assertion.ordered_wave`,
              observationId: `${SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID}.observation.ordered_wave`,
              comparator: 'exists',
              expected: { orderedWaveSequence: true, gateTriggered: true, waveSpawned: true, sequenceIndex: 0 },
              message: 'spawn enemy wave package observes an ordered, gate-triggered wave spawn'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: SPAWN_ENEMY_WAVE_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    dependencies: [{ capabilityId: 'spawn.static.v1', range: '^1.0.0' }],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'spawn.enemy_wave.service', version: 'v1' }],
    defaults: {
      orderedEvent: SPAWN_ENEMY_WAVE_ORDERED_EVENT_TYPE
    },
    diagnostics: {
      source: 'stage37.spawn_enemy_wave_package_owned_qa_slice'
    }
  };
}
