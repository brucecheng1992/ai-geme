import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import { ENEMY_BOSS_LIFECYCLE_BOSS_ENTITY_ID } from './enemy-boss-lifecycle-runtime-module.js';
import {
  SPAWN_STOP_ON_BOSS_DEFEAT_CAPABILITY_ID,
  SPAWN_STOP_ON_BOSS_DEFEAT_EVENT_TYPE,
  SPAWN_STOP_ON_BOSS_DEFEAT_POST_DEFEAT_SPAWN_COUNT,
  SPAWN_STOP_ON_BOSS_DEFEAT_PROFILE_ID,
  SPAWN_STOP_ON_BOSS_DEFEAT_RUNTIME_FAMILY,
  SPAWN_STOP_ON_BOSS_DEFEAT_RUNTIME_SYSTEM_ID,
  SPAWN_STOP_ON_BOSS_DEFEAT_SCHEMA_VERSION,
  SPAWN_STOP_ON_BOSS_DEFEAT_STOP_REASON
} from './spawn-stop-on-boss-defeat-runtime-module.js';

export const SPAWN_STOP_ON_BOSS_DEFEAT_PACKAGE_VERSION = '1.0.0';
export const SPAWN_STOP_ON_BOSS_DEFEAT_REQUIRED_PROBE_ID =
  'spawn.stop_on_boss_defeat.v1.stop_after_boss_defeat.browser_qa.v1';
export const SPAWN_STOP_ON_BOSS_DEFEAT_PACKAGE_REQUIRED_EVIDENCE_ID =
  'spawn.stop_on_boss_defeat.v1.evidence.capability_qa_report.v1';

export function createSpawnStopOnBossDefeatPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: SPAWN_STOP_ON_BOSS_DEFEAT_CAPABILITY_ID,
      packageVersion: SPAWN_STOP_ON_BOSS_DEFEAT_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Stop enemy spawning after boss defeat capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: [SPAWN_STOP_ON_BOSS_DEFEAT_RUNTIME_FAMILY],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'spawn.stop_on_boss_defeat.schema',
      ownedPaths: ['/runtime/spawnStopConditions', '/capability_configs/spawn_stop_on_boss_defeat'],
      normalizerId: 'spawn.stop_on_boss_defeat.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'spawn.stop_on_boss_defeat.ir',
      ownedNodeKinds: ['runtime_system.spawn.stop_on_boss_defeat']
    },
    runtime: {
      families: [SPAWN_STOP_ON_BOSS_DEFEAT_RUNTIME_FAMILY],
      systems: [
        {
          id: SPAWN_STOP_ON_BOSS_DEFEAT_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'gameplay',
          dependencies: ['spawn.static', 'spawn.enemy_wave', 'spawn.explicit_declarations', 'enemy.boss_lifecycle']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetSpawnStopCondition:boss_defeated', executionPolicy: 'regeneration_required' }],
      compilerId: 'spawn.stop_on_boss_defeat.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'spawn.stop_on_boss_defeat.patch.boss_defeat_shutdown',
          policy: 'regeneration_required',
          ownedPaths: ['/runtime/spawnStopConditions', '/capability_configs/spawn_stop_on_boss_defeat']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: SPAWN_STOP_ON_BOSS_DEFEAT_REQUIRED_PROBE_ID,
          capabilityId: SPAWN_STOP_ON_BOSS_DEFEAT_CAPABILITY_ID,
          prerequisites: [
            'spawn static package is registered',
            'spawn enemy-wave package is registered',
            'explicit spawn declarations package is registered',
            'boss lifecycle package emits boss defeated state',
            'runtime emits post-defeat spawn shutdown state'
          ],
          actions: [
            {
              id: `${SPAWN_STOP_ON_BOSS_DEFEAT_REQUIRED_PROBE_ID}.action.verify_stop_condition`,
              kind: 'runtime_event',
              target: SPAWN_STOP_ON_BOSS_DEFEAT_EVENT_TYPE,
              parameters: {
                bossEntityId: ENEMY_BOSS_LIFECYCLE_BOSS_ENTITY_ID,
                stopReason: SPAWN_STOP_ON_BOSS_DEFEAT_STOP_REASON,
                postDefeatSpawnCount: SPAWN_STOP_ON_BOSS_DEFEAT_POST_DEFEAT_SPAWN_COUNT
              }
            }
          ],
          observations: [
            {
              id: `${SPAWN_STOP_ON_BOSS_DEFEAT_REQUIRED_PROBE_ID}.observation.stop_state`,
              kind: 'state_probe',
              runtimeSystemId: SPAWN_STOP_ON_BOSS_DEFEAT_RUNTIME_SYSTEM_ID,
              ref: SPAWN_STOP_ON_BOSS_DEFEAT_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${SPAWN_STOP_ON_BOSS_DEFEAT_REQUIRED_PROBE_ID}.assertion.stop_after_boss_defeat`,
              observationId: `${SPAWN_STOP_ON_BOSS_DEFEAT_REQUIRED_PROBE_ID}.observation.stop_state`,
              comparator: 'exists',
              expected: {
                spawnStopOnBossDefeatVerified: true,
                spawnStopOnBossDefeatSchemaVersion: SPAWN_STOP_ON_BOSS_DEFEAT_SCHEMA_VERSION,
                spawnStopOnBossDefeatProfileId: SPAWN_STOP_ON_BOSS_DEFEAT_PROFILE_ID,
                spawnStopOnBossDefeatRuntimeFamily: SPAWN_STOP_ON_BOSS_DEFEAT_RUNTIME_FAMILY,
                spawnStopOnBossDefeatBossDefeated: true,
                spawnStopOnBossDefeatBossEntityId: ENEMY_BOSS_LIFECYCLE_BOSS_ENTITY_ID,
                spawnStopOnBossDefeatStopReason: SPAWN_STOP_ON_BOSS_DEFEAT_STOP_REASON,
                spawnStopOnBossDefeatSpawnPipelineStopped: true,
                spawnStopOnBossDefeatPendingWavesCancelled: true,
                spawnStopOnBossDefeatPostDefeatSpawnAttemptBlocked: true,
                spawnStopOnBossDefeatPostDefeatSpawnCount: SPAWN_STOP_ON_BOSS_DEFEAT_POST_DEFEAT_SPAWN_COUNT,
                spawnStopOnBossDefeatNoHiddenSpawnDetected: true
              },
              message:
                'spawn stop-on-boss-defeat evidence verifies boss defeated state and post-defeat spawn shutdown with no hidden spawn'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: SPAWN_STOP_ON_BOSS_DEFEAT_PACKAGE_REQUIRED_EVIDENCE_ID,
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
      { capabilityId: 'spawn.static.v1', range: '^v1' },
      { capabilityId: 'spawn.enemy_wave.v1', range: '^v1' },
      { capabilityId: 'spawn.explicit_declarations.v1', range: '^v1' },
      { capabilityId: 'enemy.boss_lifecycle.v1', range: '^v1' }
    ],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'spawn.stop_on_boss_defeat.service', version: 'v1' }],
    defaults: {
      event: SPAWN_STOP_ON_BOSS_DEFEAT_EVENT_TYPE,
      profileId: SPAWN_STOP_ON_BOSS_DEFEAT_PROFILE_ID,
      runtimeFamily: SPAWN_STOP_ON_BOSS_DEFEAT_RUNTIME_FAMILY,
      stopReason: SPAWN_STOP_ON_BOSS_DEFEAT_STOP_REASON,
      requiredStateFields: [
        'spawnStopOnBossDefeatVerified',
        'spawnStopOnBossDefeatSchemaVersion',
        'spawnStopOnBossDefeatProfileId',
        'spawnStopOnBossDefeatRuntimeFamily',
        'spawnStopOnBossDefeatBossDefeated',
        'spawnStopOnBossDefeatBossEntityId',
        'spawnStopOnBossDefeatStopReason',
        'spawnStopOnBossDefeatSpawnPipelineStopped',
        'spawnStopOnBossDefeatPendingWavesCancelled',
        'spawnStopOnBossDefeatPostDefeatSpawnAttemptBlocked',
        'spawnStopOnBossDefeatPostDefeatSpawnCount',
        'spawnStopOnBossDefeatNoHiddenSpawnDetected'
      ]
    },
    diagnostics: {
      source: 'stage37.spawn_stop_on_boss_defeat_package_slice'
    }
  };
}
