import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  RULES_CHECKPOINT_RESTORE_CAPABILITY_ID,
  RULES_CHECKPOINT_RESTORE_CHECKPOINT_ID,
  RULES_CHECKPOINT_RESTORE_DAMAGE_EVENT_TYPE,
  RULES_CHECKPOINT_RESTORE_EVENT_TYPE,
  RULES_CHECKPOINT_RESTORE_RETRY_COUNT_AFTER,
  RULES_CHECKPOINT_RESTORE_RETRY_COUNT_BEFORE,
  RULES_CHECKPOINT_RESTORE_RUNTIME_SYSTEM_ID
} from './rules-checkpoint-restore-runtime-module.js';

export const RULES_CHECKPOINT_RESTORE_PACKAGE_VERSION = '1.0.0';
export const RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID = 'rules.checkpoint_restore.v1.restore.browser_qa.v1';
export const RULES_CHECKPOINT_RESTORE_PACKAGE_REQUIRED_EVIDENCE_ID = 'rules.checkpoint_restore.v1.evidence.capability_qa_report.v1';

export function createRulesCheckpointRestorePackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: RULES_CHECKPOINT_RESTORE_CAPABILITY_ID,
      packageVersion: RULES_CHECKPOINT_RESTORE_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Checkpoint restoration capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'rules.checkpoint_restore.schema',
      ownedPaths: ['/winLose/checkpoints', '/capability_configs/checkpoint_restore'],
      normalizerId: 'rules.checkpoint_restore.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'rules.checkpoint_restore.ir',
      ownedNodeKinds: ['runtime_system.rules.checkpoint_restore']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [
        {
          id: RULES_CHECKPOINT_RESTORE_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'gameplay',
          dependencies: ['health.player_health_points', 'checkpoint_or_lives_system']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetCheckpointRestore:on_zero_health_retry', executionPolicy: 'regeneration_required' }],
      compilerId: 'rules.checkpoint_restore.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'rules.checkpoint_restore.patch.zero_health_retry_restore',
          policy: 'regeneration_required',
          ownedPaths: ['/winLose/checkpoints', '/capability_configs/checkpoint_restore']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID,
          capabilityId: RULES_CHECKPOINT_RESTORE_CAPABILITY_ID,
          prerequisites: [
            'runtime scene started',
            'player health reaches zero while retry count remains',
            'nearest checkpoint is configured',
            'checkpoint restore state is emitted by the runtime'
          ],
          actions: [
            {
              id: `${RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID}.action.zero_health`,
              kind: 'runtime_event',
              target: RULES_CHECKPOINT_RESTORE_DAMAGE_EVENT_TYPE,
              parameters: {
                damageEvent: RULES_CHECKPOINT_RESTORE_DAMAGE_EVENT_TYPE,
                retryCountBefore: RULES_CHECKPOINT_RESTORE_RETRY_COUNT_BEFORE,
                retryCountAfter: RULES_CHECKPOINT_RESTORE_RETRY_COUNT_AFTER,
                expectedCheckpointId: RULES_CHECKPOINT_RESTORE_CHECKPOINT_ID
              }
            }
          ],
          observations: [
            {
              id: `${RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID}.observation.zero_health`,
              kind: 'runtime_event',
              runtimeSystemId: RULES_CHECKPOINT_RESTORE_RUNTIME_SYSTEM_ID,
              ref: RULES_CHECKPOINT_RESTORE_DAMAGE_EVENT_TYPE
            },
            {
              id: `${RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID}.observation.restored`,
              kind: 'state_probe',
              runtimeSystemId: RULES_CHECKPOINT_RESTORE_RUNTIME_SYSTEM_ID,
              ref: RULES_CHECKPOINT_RESTORE_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID}.assertion.zero_health`,
              observationId: `${RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID}.observation.zero_health`,
              comparator: 'exists',
              message: 'checkpoint restore package observes the zero-health trigger'
            },
            {
              id: `${RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID}.assertion.restored_checkpoint`,
              observationId: `${RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID}.observation.restored`,
              comparator: 'exists',
              expected: {
                checkpointRestoreTriggeredByZeroHealth: true,
                checkpointRestoreRetryConsumed: true,
                checkpointRestoreRetryCountBefore: RULES_CHECKPOINT_RESTORE_RETRY_COUNT_BEFORE,
                checkpointRestoreRetryCountAfter: RULES_CHECKPOINT_RESTORE_RETRY_COUNT_AFTER,
                checkpointRestoreNearestCheckpointSelected: true,
                checkpointRestoreCheckpointId: RULES_CHECKPOINT_RESTORE_CHECKPOINT_ID,
                checkpointRestoreExpectedCheckpointId: RULES_CHECKPOINT_RESTORE_CHECKPOINT_ID,
                checkpointRestorePositionMatched: true,
                checkpointRestorePlayerRespawned: true,
                checkpointRestoreFailureScreenShown: false
              },
              message: 'checkpoint restore package observes retry consumption and respawn at the expected checkpoint'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: RULES_CHECKPOINT_RESTORE_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'rules.checkpoint_restore.service', version: 'v1' }],
    defaults: {
      restoreEvent: RULES_CHECKPOINT_RESTORE_EVENT_TYPE,
      damageEvent: RULES_CHECKPOINT_RESTORE_DAMAGE_EVENT_TYPE,
      checkpointId: RULES_CHECKPOINT_RESTORE_CHECKPOINT_ID,
      retryCountBefore: RULES_CHECKPOINT_RESTORE_RETRY_COUNT_BEFORE,
      retryCountAfter: RULES_CHECKPOINT_RESTORE_RETRY_COUNT_AFTER,
      requiredStateFields: [
        'checkpointRestoreTriggeredByZeroHealth',
        'checkpointRestoreRetryConsumed',
        'checkpointRestoreRetryCountBefore',
        'checkpointRestoreRetryCountAfter',
        'checkpointRestoreNearestCheckpointSelected',
        'checkpointRestoreCheckpointId',
        'checkpointRestoreExpectedCheckpointId',
        'checkpointRestorePositionMatched',
        'checkpointRestorePlayerRespawned',
        'checkpointRestoreFailureScreenShown'
      ]
    },
    diagnostics: {
      source: 'stage37.rules_checkpoint_restore_package_slice'
    }
  };
}
