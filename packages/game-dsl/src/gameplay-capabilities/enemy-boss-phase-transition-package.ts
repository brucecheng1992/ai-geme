import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  ENEMY_BOSS_PHASE_TRANSITION_CAPABILITY_ID,
  ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
  ENEMY_BOSS_PHASE_TRANSITION_FROM_PHASE_ID,
  ENEMY_BOSS_PHASE_TRANSITION_HEALTH_THRESHOLD_RATIO,
  ENEMY_BOSS_PHASE_TRANSITION_RUNTIME_SYSTEM_ID,
  ENEMY_BOSS_PHASE_TRANSITION_SPEED_MULTIPLIER,
  ENEMY_BOSS_PHASE_TRANSITION_TO_PHASE_ID
} from './enemy-boss-phase-transition-runtime-module.js';

export const ENEMY_BOSS_PHASE_TRANSITION_PACKAGE_VERSION = '1.0.0';
export const ENEMY_BOSS_PHASE_TRANSITION_REQUIRED_PROBE_ID = 'enemy.boss_phase_transition.v1.phase.browser_qa.v1';
export const ENEMY_BOSS_PHASE_TRANSITION_PACKAGE_REQUIRED_EVIDENCE_ID =
  'enemy.boss_phase_transition.v1.evidence.capability_qa_report.v1';

export function createEnemyBossPhaseTransitionPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: ENEMY_BOSS_PHASE_TRANSITION_CAPABILITY_ID,
      packageVersion: ENEMY_BOSS_PHASE_TRANSITION_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Enemy boss phase-transition capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'enemy.boss_phase_transition.schema',
      ownedPaths: ['/capability_configs/boss_phase_transition'],
      normalizerId: 'enemy.boss_phase_transition.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'enemy.boss_phase_transition.ir',
      ownedNodeKinds: ['runtime_system.enemy.boss_phase_transition']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [
        {
          id: ENEMY_BOSS_PHASE_TRANSITION_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'gameplay',
          dependencies: ['enemy.boss_lifecycle']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetBossPhaseTransition:health_threshold_speed_modifier', executionPolicy: 'regeneration_required' }],
      compilerId: 'enemy.boss_phase_transition.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'enemy.boss_phase_transition.patch.health_threshold_speed_modifier',
          policy: 'regeneration_required',
          ownedPaths: ['/capability_configs/boss_phase_transition']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: ENEMY_BOSS_PHASE_TRANSITION_REQUIRED_PROBE_ID,
          capabilityId: ENEMY_BOSS_PHASE_TRANSITION_CAPABILITY_ID,
          prerequisites: [
            'runtime scene started',
            'boss entity is below the phase transition health threshold',
            'boss runtime emits the current phase and movement speed modifier state'
          ],
          actions: [
            {
              id: `${ENEMY_BOSS_PHASE_TRANSITION_REQUIRED_PROBE_ID}.action.verify_boss_phase_transition`,
              kind: 'runtime_event',
              target: ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
              parameters: {
                fromPhaseId: ENEMY_BOSS_PHASE_TRANSITION_FROM_PHASE_ID,
                toPhaseId: ENEMY_BOSS_PHASE_TRANSITION_TO_PHASE_ID,
                healthThresholdRatio: ENEMY_BOSS_PHASE_TRANSITION_HEALTH_THRESHOLD_RATIO,
                speedMultiplier: ENEMY_BOSS_PHASE_TRANSITION_SPEED_MULTIPLIER
              }
            }
          ],
          observations: [
            {
              id: `${ENEMY_BOSS_PHASE_TRANSITION_REQUIRED_PROBE_ID}.observation.phase_transition_state`,
              kind: 'runtime_event',
              runtimeSystemId: ENEMY_BOSS_PHASE_TRANSITION_RUNTIME_SYSTEM_ID,
              ref: ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${ENEMY_BOSS_PHASE_TRANSITION_REQUIRED_PROBE_ID}.assertion.phase_transition_verified`,
              observationId: `${ENEMY_BOSS_PHASE_TRANSITION_REQUIRED_PROBE_ID}.observation.phase_transition_state`,
              comparator: 'exists',
              expected: {
                bossPhaseTransitioned: true,
                bossPreviousPhaseId: ENEMY_BOSS_PHASE_TRANSITION_FROM_PHASE_ID,
                bossCurrentPhaseId: ENEMY_BOSS_PHASE_TRANSITION_TO_PHASE_ID,
                bossHealthThresholdRatio: ENEMY_BOSS_PHASE_TRANSITION_HEALTH_THRESHOLD_RATIO,
                bossSpeedMultiplier: ENEMY_BOSS_PHASE_TRANSITION_SPEED_MULTIPLIER,
                bossSpeedMultiplierApplied: true
              },
              message: 'boss phase-transition evidence verifies the health threshold transition and phase-2 speed modifier state'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: ENEMY_BOSS_PHASE_TRANSITION_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'enemy.boss_phase_transition.service', version: 'v1' }],
    defaults: {
      fromPhaseId: ENEMY_BOSS_PHASE_TRANSITION_FROM_PHASE_ID,
      toPhaseId: ENEMY_BOSS_PHASE_TRANSITION_TO_PHASE_ID,
      healthThresholdRatio: ENEMY_BOSS_PHASE_TRANSITION_HEALTH_THRESHOLD_RATIO,
      speedMultiplier: ENEMY_BOSS_PHASE_TRANSITION_SPEED_MULTIPLIER,
      phaseTransitionEvent: ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
      requiredStateFields: [
        'bossPhaseTransitioned',
        'bossPreviousPhaseId',
        'bossCurrentPhaseId',
        'bossHealthThresholdRatio',
        'bossSpeedMultiplier',
        'bossSpeedMultiplierApplied'
      ]
    },
    diagnostics: {
      source: 'stage37.enemy_boss_phase_transition_package_slice'
    }
  };
}
