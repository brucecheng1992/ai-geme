import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  ENEMY_FLYING_RIGHT_ENTRY_ARCHETYPE_ID,
  ENEMY_FLYING_RIGHT_ENTRY_CAPABILITY_ID,
  ENEMY_FLYING_RIGHT_ENTRY_ENEMY_ID,
  ENEMY_FLYING_RIGHT_ENTRY_ENTRY_SIDE,
  ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
  ENEMY_FLYING_RIGHT_ENTRY_MOVEMENT_PATTERN_ID,
  ENEMY_FLYING_RIGHT_ENTRY_RUNTIME_SYSTEM_ID,
  ENEMY_FLYING_RIGHT_ENTRY_SEGMENT_ID,
  ENEMY_FLYING_RIGHT_ENTRY_WAVE_ID
} from './enemy-flying-right-entry-runtime-module.js';

export const ENEMY_FLYING_RIGHT_ENTRY_PACKAGE_VERSION = '1.0.0';
export const ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID = 'enemy.flying_right_entry.v1.right_entry.browser_qa.v1';
export const ENEMY_FLYING_RIGHT_ENTRY_PACKAGE_REQUIRED_EVIDENCE_ID =
  'enemy.flying_right_entry.v1.evidence.capability_qa_report.v1';

export function createEnemyFlyingRightEntryPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: ENEMY_FLYING_RIGHT_ENTRY_CAPABILITY_ID,
      packageVersion: ENEMY_FLYING_RIGHT_ENTRY_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Flying enemy right-side entry capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'enemy.flying_right_entry.schema',
      ownedPaths: ['/capability_configs/enemy_flying_right_entry'],
      normalizerId: 'enemy.flying_right_entry.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'enemy.flying_right_entry.ir',
      ownedNodeKinds: ['runtime_system.enemy.flying_right_entry']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [
        {
          id: ENEMY_FLYING_RIGHT_ENTRY_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'gameplay',
          dependencies: ['spawn.enemy_wave']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetFlyingEnemyEntry:right_side_bridge', executionPolicy: 'regeneration_required' }],
      compilerId: 'enemy.flying_right_entry.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'enemy.flying_right_entry.patch.right_side_bridge',
          policy: 'regeneration_required',
          ownedPaths: ['/capability_configs/enemy_flying_right_entry']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID,
          capabilityId: ENEMY_FLYING_RIGHT_ENTRY_CAPABILITY_ID,
          prerequisites: [
            'runtime scene started',
            'metal bridge enemy-wave gate has resolved',
            'flying enemy runtime emits right-side entry, segment, and movement state'
          ],
          actions: [
            {
              id: `${ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID}.action.verify_right_entry`,
              kind: 'runtime_event',
              target: ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
              parameters: {
                enemyId: ENEMY_FLYING_RIGHT_ENTRY_ENEMY_ID,
                archetypeId: ENEMY_FLYING_RIGHT_ENTRY_ARCHETYPE_ID,
                segmentId: ENEMY_FLYING_RIGHT_ENTRY_SEGMENT_ID,
                entrySide: ENEMY_FLYING_RIGHT_ENTRY_ENTRY_SIDE,
                movementPatternId: ENEMY_FLYING_RIGHT_ENTRY_MOVEMENT_PATTERN_ID,
                waveId: ENEMY_FLYING_RIGHT_ENTRY_WAVE_ID
              }
            }
          ],
          observations: [
            {
              id: `${ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID}.observation.right_entry_state`,
              kind: 'runtime_event',
              runtimeSystemId: ENEMY_FLYING_RIGHT_ENTRY_RUNTIME_SYSTEM_ID,
              ref: ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID}.assertion.right_entry_verified`,
              observationId: `${ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID}.observation.right_entry_state`,
              comparator: 'exists',
              expected: {
                flyingRightEntrySpawned: true,
                flyingRightEntryEnemyId: ENEMY_FLYING_RIGHT_ENTRY_ENEMY_ID,
                flyingRightEntryArchetypeId: ENEMY_FLYING_RIGHT_ENTRY_ARCHETYPE_ID,
                flyingRightEntrySegmentId: ENEMY_FLYING_RIGHT_ENTRY_SEGMENT_ID,
                flyingRightEntryEnteredFromRight: true,
                flyingRightEntryEntrySide: ENEMY_FLYING_RIGHT_ENTRY_ENTRY_SIDE,
                flyingRightEntryMovementPatternId: ENEMY_FLYING_RIGHT_ENTRY_MOVEMENT_PATTERN_ID,
                flyingRightEntryWaveId: ENEMY_FLYING_RIGHT_ENTRY_WAVE_ID
              },
              message: 'flying enemy evidence verifies a right-side entry into the metal bridge segment'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: ENEMY_FLYING_RIGHT_ENTRY_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    dependencies: [{ capabilityId: 'spawn.enemy_wave.v1', range: '^v1' }],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'enemy.flying_right_entry.service', version: 'v1' }],
    defaults: {
      enemyId: ENEMY_FLYING_RIGHT_ENTRY_ENEMY_ID,
      archetypeId: ENEMY_FLYING_RIGHT_ENTRY_ARCHETYPE_ID,
      segmentId: ENEMY_FLYING_RIGHT_ENTRY_SEGMENT_ID,
      entrySide: ENEMY_FLYING_RIGHT_ENTRY_ENTRY_SIDE,
      movementPatternId: ENEMY_FLYING_RIGHT_ENTRY_MOVEMENT_PATTERN_ID,
      waveId: ENEMY_FLYING_RIGHT_ENTRY_WAVE_ID,
      rightEntryEvent: ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
      requiredStateFields: [
        'flyingRightEntrySpawned',
        'flyingRightEntryEnemyId',
        'flyingRightEntryArchetypeId',
        'flyingRightEntrySegmentId',
        'flyingRightEntryEnteredFromRight',
        'flyingRightEntryEntrySide',
        'flyingRightEntryMovementPatternId',
        'flyingRightEntryWaveId'
      ]
    },
    diagnostics: {
      source: 'stage37.enemy_flying_right_entry_package_slice'
    }
  };
}
