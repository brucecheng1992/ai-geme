import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  ENEMY_FIXED_TURRET_ARCHETYPE_ID,
  ENEMY_FIXED_TURRET_CAPABILITY_ID,
  ENEMY_FIXED_TURRET_ENTITY_ID,
  ENEMY_FIXED_TURRET_EVENT_TYPE,
  ENEMY_FIXED_TURRET_FIRE_CADENCE_MS,
  ENEMY_FIXED_TURRET_PROJECTILE_PATTERN_ID,
  ENEMY_FIXED_TURRET_RUNTIME_SYSTEM_ID
} from './enemy-fixed-turret-runtime-module.js';

export const ENEMY_FIXED_TURRET_PACKAGE_VERSION = '1.0.0';
export const ENEMY_FIXED_TURRET_REQUIRED_PROBE_ID = 'enemy.fixed_turret.v1.stationary.browser_qa.v1';
export const ENEMY_FIXED_TURRET_PACKAGE_REQUIRED_EVIDENCE_ID = 'enemy.fixed_turret.v1.evidence.capability_qa_report.v1';

export function createEnemyFixedTurretPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: ENEMY_FIXED_TURRET_CAPABILITY_ID,
      packageVersion: ENEMY_FIXED_TURRET_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Enemy fixed-turret archetype capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'enemy.fixed_turret.schema',
      ownedPaths: ['/capability_configs/enemy_fixed_turret'],
      normalizerId: 'enemy.fixed_turret.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'enemy.fixed_turret.ir',
      ownedNodeKinds: ['runtime_system.enemy.fixed_turret']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [
        {
          id: ENEMY_FIXED_TURRET_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'gameplay',
          dependencies: ['spawn.static', 'combat.projectile']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetFixedTurret:stationary_projectile_pattern', executionPolicy: 'regeneration_required' }],
      compilerId: 'enemy.fixed_turret.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'enemy.fixed_turret.patch.stationary_projectile_pattern',
          policy: 'regeneration_required',
          ownedPaths: ['/capability_configs/enemy_fixed_turret']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: ENEMY_FIXED_TURRET_REQUIRED_PROBE_ID,
          capabilityId: ENEMY_FIXED_TURRET_CAPABILITY_ID,
          prerequisites: [
            'runtime scene started',
            'fixed turret spawn trigger has resolved',
            'fixed turret runtime emits stationary archetype and projectile pattern state'
          ],
          actions: [
            {
              id: `${ENEMY_FIXED_TURRET_REQUIRED_PROBE_ID}.action.verify_fixed_turret`,
              kind: 'runtime_event',
              target: ENEMY_FIXED_TURRET_EVENT_TYPE,
              parameters: {
                turretEntityId: ENEMY_FIXED_TURRET_ENTITY_ID,
                turretArchetypeId: ENEMY_FIXED_TURRET_ARCHETYPE_ID,
                projectilePatternId: ENEMY_FIXED_TURRET_PROJECTILE_PATTERN_ID,
                fireCadenceMs: ENEMY_FIXED_TURRET_FIRE_CADENCE_MS
              }
            }
          ],
          observations: [
            {
              id: `${ENEMY_FIXED_TURRET_REQUIRED_PROBE_ID}.observation.fixed_turret_state`,
              kind: 'runtime_event',
              runtimeSystemId: ENEMY_FIXED_TURRET_RUNTIME_SYSTEM_ID,
              ref: ENEMY_FIXED_TURRET_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${ENEMY_FIXED_TURRET_REQUIRED_PROBE_ID}.assertion.fixed_turret_verified`,
              observationId: `${ENEMY_FIXED_TURRET_REQUIRED_PROBE_ID}.observation.fixed_turret_state`,
              comparator: 'exists',
              expected: {
                fixedTurretSpawned: true,
                fixedTurretEntityId: ENEMY_FIXED_TURRET_ENTITY_ID,
                fixedTurretArchetypeId: ENEMY_FIXED_TURRET_ARCHETYPE_ID,
                fixedTurretStationary: true,
                fixedTurretTargetsPlayer: true,
                fixedTurretProjectilePatternId: ENEMY_FIXED_TURRET_PROJECTILE_PATTERN_ID,
                fixedTurretFireCadenceMs: ENEMY_FIXED_TURRET_FIRE_CADENCE_MS
              },
              message: 'fixed turret evidence verifies a stationary turret archetype targeting the player with a projectile pattern'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: ENEMY_FIXED_TURRET_PACKAGE_REQUIRED_EVIDENCE_ID,
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
      { capabilityId: 'combat.projectile.v1', range: '^v1' }
    ],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'enemy.fixed_turret.service', version: 'v1' }],
    defaults: {
      turretEntityId: ENEMY_FIXED_TURRET_ENTITY_ID,
      turretArchetypeId: ENEMY_FIXED_TURRET_ARCHETYPE_ID,
      projectilePatternId: ENEMY_FIXED_TURRET_PROJECTILE_PATTERN_ID,
      fireCadenceMs: ENEMY_FIXED_TURRET_FIRE_CADENCE_MS,
      fixedTurretEvent: ENEMY_FIXED_TURRET_EVENT_TYPE,
      requiredStateFields: [
        'fixedTurretSpawned',
        'fixedTurretEntityId',
        'fixedTurretArchetypeId',
        'fixedTurretStationary',
        'fixedTurretTargetsPlayer',
        'fixedTurretProjectilePatternId',
        'fixedTurretFireCadenceMs'
      ]
    },
    diagnostics: {
      source: 'stage37.enemy_fixed_turret_package_slice'
    }
  };
}
