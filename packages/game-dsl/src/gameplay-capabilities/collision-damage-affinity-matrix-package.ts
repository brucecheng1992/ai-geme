import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  COLLISION_DAMAGE_AFFINITY_MATRIX_CAPABILITY_ID,
  COLLISION_DAMAGE_AFFINITY_MATRIX_EVENT_TYPE,
  COLLISION_DAMAGE_AFFINITY_MATRIX_RUNTIME_SYSTEM_ID
} from './collision-damage-affinity-matrix-runtime-module.js';

export const COLLISION_DAMAGE_AFFINITY_MATRIX_PACKAGE_VERSION = '1.0.0';
export const COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID = 'collision.damage_affinity_matrix.v1.affinity.browser_qa.v1';
export const COLLISION_DAMAGE_AFFINITY_MATRIX_PACKAGE_REQUIRED_EVIDENCE_ID =
  'collision.damage_affinity_matrix.v1.evidence.capability_qa_report.v1';

export function createCollisionDamageAffinityMatrixPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: COLLISION_DAMAGE_AFFINITY_MATRIX_CAPABILITY_ID,
      packageVersion: COLLISION_DAMAGE_AFFINITY_MATRIX_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Collision damage-affinity matrix capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'collision.damage_affinity_matrix.schema',
      ownedPaths: ['/rules/collision_damage_affinity_matrix'],
      normalizerId: 'collision.damage_affinity_matrix.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'collision.damage_affinity_matrix.ir',
      ownedNodeKinds: ['runtime_system.collision.damage_affinity_matrix']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: COLLISION_DAMAGE_AFFINITY_MATRIX_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'physics', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'VerifyDamageAffinityMatrix:projectile_hazard_targets', executionPolicy: 'regeneration_required' }],
      compilerId: 'collision.damage_affinity_matrix.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'collision.damage_affinity_matrix.patch.projectile_hazard_targets',
          policy: 'regeneration_required',
          ownedPaths: ['/rules/collision_damage_affinity_matrix']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID,
          capabilityId: COLLISION_DAMAGE_AFFINITY_MATRIX_CAPABILITY_ID,
          prerequisites: [
            'runtime scene started',
            'player projectile, enemy projectile, and hazard collision samples are available',
            'damage affinity matrix is emitted by the runtime'
          ],
          actions: [
            {
              id: `${COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID}.action.verify_damage_affinity_matrix`,
              kind: 'runtime_event',
              target: COLLISION_DAMAGE_AFFINITY_MATRIX_EVENT_TYPE,
              parameters: {
                source: 'runtime_damage_affinity_matrix',
                playerProjectileTarget: 'enemy',
                enemyProjectileTarget: 'player',
                hazardTarget: 'player'
              }
            }
          ],
          observations: [
            {
              id: `${COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID}.observation.affinity_matrix`,
              kind: 'runtime_event',
              runtimeSystemId: COLLISION_DAMAGE_AFFINITY_MATRIX_RUNTIME_SYSTEM_ID,
              ref: COLLISION_DAMAGE_AFFINITY_MATRIX_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID}.assertion.affinity_matrix_enforced`,
              observationId: `${COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID}.observation.affinity_matrix`,
              comparator: 'exists',
              expected: {
                playerProjectilesDamageEnemies: true,
                playerProjectilesDamagePlayer: false,
                enemyProjectilesDamagePlayer: true,
                enemyProjectilesDamageEnemies: false,
                hazardsDamagePlayer: true,
                hazardsDamageEnemies: false
              },
              message: 'damage affinity evidence verifies player projectiles, enemy projectiles, and hazards damage only their allowed targets'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: COLLISION_DAMAGE_AFFINITY_MATRIX_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'collision.damage_affinity_matrix.service', version: 'v1' }],
    defaults: {
      affinityEvent: COLLISION_DAMAGE_AFFINITY_MATRIX_EVENT_TYPE,
      requiredStateFields: [
        'playerProjectilesDamageEnemies',
        'playerProjectilesDamagePlayer',
        'enemyProjectilesDamagePlayer',
        'enemyProjectilesDamageEnemies',
        'hazardsDamagePlayer',
        'hazardsDamageEnemies'
      ]
    },
    diagnostics: {
      source: 'stage37.collision_damage_affinity_matrix_package_slice'
    }
  };
}
