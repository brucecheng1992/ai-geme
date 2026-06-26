import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  GOAL_BOSS_UNLOCK_BOSS_ENTITY_ID,
  GOAL_BOSS_UNLOCK_CAPABILITY_ID,
  GOAL_BOSS_UNLOCK_EVENT_TYPE,
  GOAL_BOSS_UNLOCK_REASON,
  GOAL_BOSS_UNLOCK_REQUIRED_WAVE_COUNT,
  GOAL_BOSS_UNLOCK_RUNTIME_SYSTEM_ID,
  GOAL_BOSS_UNLOCK_WAVE_ID
} from './goal-boss-unlock-runtime-module.js';

export const GOAL_BOSS_UNLOCK_PACKAGE_VERSION = '1.0.0';
export const GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID = 'goal.boss_unlock.v1.unlock.browser_qa.v1';
export const GOAL_BOSS_UNLOCK_PACKAGE_REQUIRED_EVIDENCE_ID = 'goal.boss_unlock.v1.evidence.capability_qa_report.v1';

export function createGoalBossUnlockPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: GOAL_BOSS_UNLOCK_CAPABILITY_ID,
      packageVersion: GOAL_BOSS_UNLOCK_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Boss encounter unlocks after required enemy waves are cleared.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'goal.boss_unlock.schema',
      ownedPaths: ['/capability_configs/boss_unlock'],
      normalizerId: 'goal.boss_unlock.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'goal.boss_unlock.ir',
      ownedNodeKinds: ['runtime_system.goal.boss_unlock']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [
        {
          id: GOAL_BOSS_UNLOCK_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'gameplay',
          dependencies: ['spawn.enemy_wave', 'enemy.boss_lifecycle']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetBossUnlock:on_wave_clear', executionPolicy: 'regeneration_required' }],
      compilerId: 'goal.boss_unlock.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'goal.boss_unlock.patch.wave_clear_gate',
          policy: 'regeneration_required',
          ownedPaths: ['/capability_configs/boss_unlock']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID,
          capabilityId: GOAL_BOSS_UNLOCK_CAPABILITY_ID,
          prerequisites: [
            'runtime scene started',
            'required enemy wave is cleared',
            'boss encounter unlock state is emitted by the runtime'
          ],
          actions: [
            {
              id: `${GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID}.action.clear_required_wave`,
              kind: 'runtime_event',
              target: GOAL_BOSS_UNLOCK_EVENT_TYPE,
              parameters: {
                waveId: GOAL_BOSS_UNLOCK_WAVE_ID,
                bossEntityId: GOAL_BOSS_UNLOCK_BOSS_ENTITY_ID,
                unlockReason: GOAL_BOSS_UNLOCK_REASON
              }
            }
          ],
          observations: [
            {
              id: `${GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID}.observation.unlock_state`,
              kind: 'runtime_event',
              runtimeSystemId: GOAL_BOSS_UNLOCK_RUNTIME_SYSTEM_ID,
              ref: GOAL_BOSS_UNLOCK_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID}.assertion.boss_unlock_verified`,
              observationId: `${GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID}.observation.unlock_state`,
              comparator: 'exists',
              expected: {
                wavesCleared: true,
                clearedWaveCount: GOAL_BOSS_UNLOCK_REQUIRED_WAVE_COUNT,
                requiredWaveCount: GOAL_BOSS_UNLOCK_REQUIRED_WAVE_COUNT,
                bossUnlockTriggered: true,
                bossUnlockReason: GOAL_BOSS_UNLOCK_REASON,
                bossEncounterUnlocked: true,
                bossUnlockWaveId: GOAL_BOSS_UNLOCK_WAVE_ID,
                bossUnlockBossEntityId: GOAL_BOSS_UNLOCK_BOSS_ENTITY_ID
              },
              message: 'boss unlock evidence verifies required wave clearance caused the boss encounter to open'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: GOAL_BOSS_UNLOCK_PACKAGE_REQUIRED_EVIDENCE_ID,
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
      { capabilityId: 'spawn.enemy_wave.v1', range: '^v1' },
      { capabilityId: 'enemy.boss_lifecycle.v1', range: '^v1' }
    ],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'goal.boss_unlock.service', version: 'v1' }],
    defaults: {
      waveId: GOAL_BOSS_UNLOCK_WAVE_ID,
      bossEntityId: GOAL_BOSS_UNLOCK_BOSS_ENTITY_ID,
      unlockReason: GOAL_BOSS_UNLOCK_REASON,
      requiredWaveCount: GOAL_BOSS_UNLOCK_REQUIRED_WAVE_COUNT,
      unlockEvent: GOAL_BOSS_UNLOCK_EVENT_TYPE,
      requiredStateFields: [
        'wavesCleared',
        'clearedWaveCount',
        'requiredWaveCount',
        'bossUnlockTriggered',
        'bossUnlockReason',
        'bossEncounterUnlocked',
        'bossUnlockWaveId',
        'bossUnlockBossEntityId'
      ]
    },
    diagnostics: {
      source: 'stage37.goal_boss_unlock_package_slice'
    }
  };
}
