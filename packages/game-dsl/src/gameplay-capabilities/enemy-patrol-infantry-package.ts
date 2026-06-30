import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  ENEMY_PATROL_INFANTRY_ARCHETYPE_ID,
  ENEMY_PATROL_INFANTRY_CAPABILITY_ID,
  ENEMY_PATROL_INFANTRY_ENEMY_ID,
  ENEMY_PATROL_INFANTRY_EVENT_TYPE,
  ENEMY_PATROL_INFANTRY_MOVEMENT_PATTERN_ID,
  ENEMY_PATROL_INFANTRY_ROUTE_ID,
  ENEMY_PATROL_INFANTRY_RUNTIME_SYSTEM_ID,
  ENEMY_PATROL_INFANTRY_SEGMENT_ID
} from './enemy-patrol-infantry-runtime-module.js';

export const ENEMY_PATROL_INFANTRY_PACKAGE_VERSION = '1.0.0';
export const ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID = 'enemy.patrol_infantry.v1.patrol.browser_qa.v1';
export const ENEMY_PATROL_INFANTRY_PACKAGE_REQUIRED_EVIDENCE_ID =
  'enemy.patrol_infantry.v1.evidence.capability_qa_report.v1';

export function createEnemyPatrolInfantryPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: ENEMY_PATROL_INFANTRY_CAPABILITY_ID,
      packageVersion: ENEMY_PATROL_INFANTRY_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Enemy patrol infantry archetype capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'enemy.patrol_infantry.schema',
      ownedPaths: ['/capability_configs/enemy_patrol_infantry'],
      normalizerId: 'enemy.patrol_infantry.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'enemy.patrol_infantry.ir',
      ownedNodeKinds: ['runtime_system.enemy.patrol_infantry']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [
        {
          id: ENEMY_PATROL_INFANTRY_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'gameplay',
          dependencies: ['spawn.enemy_wave']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetPatrolInfantry:jungle_entrance_route', executionPolicy: 'regeneration_required' }],
      compilerId: 'enemy.patrol_infantry.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'enemy.patrol_infantry.patch.jungle_entrance_route',
          policy: 'regeneration_required',
          ownedPaths: ['/capability_configs/enemy_patrol_infantry']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID,
          capabilityId: ENEMY_PATROL_INFANTRY_CAPABILITY_ID,
          prerequisites: [
            'runtime scene started',
            'jungle entrance enemy-wave gate has resolved',
            'patrol infantry runtime emits grounded archetype, segment, and route state'
          ],
          actions: [
            {
              id: `${ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID}.action.verify_patrol_infantry`,
              kind: 'runtime_event',
              target: ENEMY_PATROL_INFANTRY_EVENT_TYPE,
              parameters: {
                enemyId: ENEMY_PATROL_INFANTRY_ENEMY_ID,
                archetypeId: ENEMY_PATROL_INFANTRY_ARCHETYPE_ID,
                segmentId: ENEMY_PATROL_INFANTRY_SEGMENT_ID,
                movementPatternId: ENEMY_PATROL_INFANTRY_MOVEMENT_PATTERN_ID,
                routeId: ENEMY_PATROL_INFANTRY_ROUTE_ID
              }
            }
          ],
          observations: [
            {
              id: `${ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID}.observation.patrol_infantry_state`,
              kind: 'runtime_event',
              runtimeSystemId: ENEMY_PATROL_INFANTRY_RUNTIME_SYSTEM_ID,
              ref: ENEMY_PATROL_INFANTRY_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID}.assertion.patrol_infantry_verified`,
              observationId: `${ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID}.observation.patrol_infantry_state`,
              comparator: 'exists',
              expected: {
                patrolInfantrySpawned: true,
                patrolInfantryEnemyId: ENEMY_PATROL_INFANTRY_ENEMY_ID,
                patrolInfantryArchetypeId: ENEMY_PATROL_INFANTRY_ARCHETYPE_ID,
                patrolInfantrySegmentId: ENEMY_PATROL_INFANTRY_SEGMENT_ID,
                patrolInfantryGrounded: true,
                patrolInfantryMovementPatternId: ENEMY_PATROL_INFANTRY_MOVEMENT_PATTERN_ID,
                patrolInfantryRouteId: ENEMY_PATROL_INFANTRY_ROUTE_ID
              },
              message: 'patrol infantry evidence verifies a grounded jungle-entrance patrol enemy route'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: ENEMY_PATROL_INFANTRY_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'enemy.patrol_infantry.service', version: 'v1' }],
    defaults: {
      enemyId: ENEMY_PATROL_INFANTRY_ENEMY_ID,
      archetypeId: ENEMY_PATROL_INFANTRY_ARCHETYPE_ID,
      segmentId: ENEMY_PATROL_INFANTRY_SEGMENT_ID,
      movementPatternId: ENEMY_PATROL_INFANTRY_MOVEMENT_PATTERN_ID,
      routeId: ENEMY_PATROL_INFANTRY_ROUTE_ID,
      patrolInfantryEvent: ENEMY_PATROL_INFANTRY_EVENT_TYPE,
      requiredStateFields: [
        'patrolInfantrySpawned',
        'patrolInfantryEnemyId',
        'patrolInfantryArchetypeId',
        'patrolInfantrySegmentId',
        'patrolInfantryGrounded',
        'patrolInfantryMovementPatternId',
        'patrolInfantryRouteId'
      ]
    },
    diagnostics: {
      source: 'stage37.enemy_patrol_infantry_package_slice'
    }
  };
}
