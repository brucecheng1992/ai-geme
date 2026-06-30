import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  ENEMY_BOSS_ATTACK_PATTERN_CADENCE_MS,
  ENEMY_BOSS_ATTACK_PATTERN_CAPABILITY_ID,
  ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
  ENEMY_BOSS_ATTACK_PATTERN_PHASE_ID,
  ENEMY_BOSS_ATTACK_PATTERN_PATTERN_ID,
  ENEMY_BOSS_ATTACK_PATTERN_RUNTIME_SYSTEM_ID
} from './enemy-boss-attack-pattern-runtime-module.js';

export const ENEMY_BOSS_ATTACK_PATTERN_PACKAGE_VERSION = '1.0.0';
export const ENEMY_BOSS_ATTACK_PATTERN_REQUIRED_PROBE_ID = 'enemy.boss_attack_pattern.v1.pattern.browser_qa.v1';
export const ENEMY_BOSS_ATTACK_PATTERN_PACKAGE_REQUIRED_EVIDENCE_ID =
  'enemy.boss_attack_pattern.v1.evidence.capability_qa_report.v1';

export function createEnemyBossAttackPatternPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: ENEMY_BOSS_ATTACK_PATTERN_CAPABILITY_ID,
      packageVersion: ENEMY_BOSS_ATTACK_PATTERN_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Enemy boss attack-pattern capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'enemy.boss_attack_pattern.schema',
      ownedPaths: ['/boss/phases/attacks'],
      normalizerId: 'enemy.boss_attack_pattern.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'enemy.boss_attack_pattern.ir',
      ownedNodeKinds: ['runtime_system.enemy.boss_attack_pattern']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: ENEMY_BOSS_ATTACK_PATTERN_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'gameplay', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetBossAttackPattern:phase_attack_cycle', executionPolicy: 'regeneration_required' }],
      compilerId: 'enemy.boss_attack_pattern.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'enemy.boss_attack_pattern.patch.phase_attack_cycle',
          policy: 'regeneration_required',
          ownedPaths: ['/boss/phases/attacks']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: ENEMY_BOSS_ATTACK_PATTERN_REQUIRED_PROBE_ID,
          capabilityId: ENEMY_BOSS_ATTACK_PATTERN_CAPABILITY_ID,
          prerequisites: [
            'runtime scene started',
            'boss encounter is active',
            'boss phase attack scheduler emits the active pattern state'
          ],
          actions: [
            {
              id: `${ENEMY_BOSS_ATTACK_PATTERN_REQUIRED_PROBE_ID}.action.verify_boss_attack_pattern`,
              kind: 'runtime_event',
              target: ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
              parameters: {
                phaseId: ENEMY_BOSS_ATTACK_PATTERN_PHASE_ID,
                patternId: ENEMY_BOSS_ATTACK_PATTERN_PATTERN_ID,
                cadenceMs: ENEMY_BOSS_ATTACK_PATTERN_CADENCE_MS,
                targetsPlayer: true
              }
            }
          ],
          observations: [
            {
              id: `${ENEMY_BOSS_ATTACK_PATTERN_REQUIRED_PROBE_ID}.observation.pattern_state`,
              kind: 'runtime_event',
              runtimeSystemId: ENEMY_BOSS_ATTACK_PATTERN_RUNTIME_SYSTEM_ID,
              ref: ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${ENEMY_BOSS_ATTACK_PATTERN_REQUIRED_PROBE_ID}.assertion.pattern_state_verified`,
              observationId: `${ENEMY_BOSS_ATTACK_PATTERN_REQUIRED_PROBE_ID}.observation.pattern_state`,
              comparator: 'exists',
              expected: {
                bossAttackPatternActive: true,
                bossAttackPhaseId: ENEMY_BOSS_ATTACK_PATTERN_PHASE_ID,
                bossAttackPatternId: ENEMY_BOSS_ATTACK_PATTERN_PATTERN_ID,
                bossAttackCadenceMs: ENEMY_BOSS_ATTACK_PATTERN_CADENCE_MS,
                bossAttackTargetsPlayer: true
              },
              message: 'boss attack-pattern evidence verifies the active phase, pattern cadence, and player targeting state'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: ENEMY_BOSS_ATTACK_PATTERN_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'enemy.boss_attack_pattern.service', version: 'v1' }],
    defaults: {
      phaseId: ENEMY_BOSS_ATTACK_PATTERN_PHASE_ID,
      patternId: ENEMY_BOSS_ATTACK_PATTERN_PATTERN_ID,
      cadenceMs: ENEMY_BOSS_ATTACK_PATTERN_CADENCE_MS,
      patternEvent: ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
      requiredStateFields: [
        'bossAttackPatternActive',
        'bossAttackPhaseId',
        'bossAttackPatternId',
        'bossAttackCadenceMs',
        'bossAttackTargetsPlayer'
      ]
    },
    diagnostics: {
      source: 'stage37.enemy_boss_attack_pattern_package_slice'
    }
  };
}
