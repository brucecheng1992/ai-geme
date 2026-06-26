import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  ENEMY_BOSS_LIFECYCLE_BOSS_ENTITY_ID,
  ENEMY_BOSS_LIFECYCLE_CAPABILITY_ID,
  ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
  ENEMY_BOSS_LIFECYCLE_MAX_HEALTH,
  ENEMY_BOSS_LIFECYCLE_RUNTIME_SYSTEM_ID
} from './enemy-boss-lifecycle-runtime-module.js';

export const ENEMY_BOSS_LIFECYCLE_PACKAGE_VERSION = '1.0.0';
export const ENEMY_BOSS_LIFECYCLE_REQUIRED_PROBE_ID = 'enemy.boss_lifecycle.v1.lifecycle.browser_qa.v1';
export const ENEMY_BOSS_LIFECYCLE_PACKAGE_REQUIRED_EVIDENCE_ID = 'enemy.boss_lifecycle.v1.evidence.capability_qa_report.v1';

export function createEnemyBossLifecyclePackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: ENEMY_BOSS_LIFECYCLE_CAPABILITY_ID,
      packageVersion: ENEMY_BOSS_LIFECYCLE_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Enemy boss lifecycle capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'enemy.boss_lifecycle.schema',
      ownedPaths: ['/bosses/items'],
      normalizerId: 'enemy.boss_lifecycle.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'enemy.boss_lifecycle.ir',
      ownedNodeKinds: ['runtime_system.enemy.boss_lifecycle']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: ENEMY_BOSS_LIFECYCLE_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'gameplay', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetBossLifecycle:spawn_health_defeat', executionPolicy: 'regeneration_required' }],
      compilerId: 'enemy.boss_lifecycle.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'enemy.boss_lifecycle.patch.spawn_health_defeat',
          policy: 'regeneration_required',
          ownedPaths: ['/bosses/items']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: ENEMY_BOSS_LIFECYCLE_REQUIRED_PROBE_ID,
          capabilityId: ENEMY_BOSS_LIFECYCLE_CAPABILITY_ID,
          prerequisites: [
            'runtime scene started',
            'boss entity is spawned',
            'boss health and defeat lifecycle state is emitted by the runtime'
          ],
          actions: [
            {
              id: `${ENEMY_BOSS_LIFECYCLE_REQUIRED_PROBE_ID}.action.verify_boss_lifecycle`,
              kind: 'runtime_event',
              target: ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
              parameters: {
                bossEntityId: ENEMY_BOSS_LIFECYCLE_BOSS_ENTITY_ID,
                maxHealth: ENEMY_BOSS_LIFECYCLE_MAX_HEALTH,
                defeated: true
              }
            }
          ],
          observations: [
            {
              id: `${ENEMY_BOSS_LIFECYCLE_REQUIRED_PROBE_ID}.observation.lifecycle_state`,
              kind: 'runtime_event',
              runtimeSystemId: ENEMY_BOSS_LIFECYCLE_RUNTIME_SYSTEM_ID,
              ref: ENEMY_BOSS_LIFECYCLE_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${ENEMY_BOSS_LIFECYCLE_REQUIRED_PROBE_ID}.assertion.lifecycle_verified`,
              observationId: `${ENEMY_BOSS_LIFECYCLE_REQUIRED_PROBE_ID}.observation.lifecycle_state`,
              comparator: 'exists',
              expected: {
                bossLifecycleStarted: true,
                bossEntityId: ENEMY_BOSS_LIFECYCLE_BOSS_ENTITY_ID,
                bossMaxHealth: ENEMY_BOSS_LIFECYCLE_MAX_HEALTH,
                bossHealthInitialized: true,
                bossDefeated: true
              },
              message: 'boss lifecycle evidence verifies spawn, health initialization, and defeat state'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: ENEMY_BOSS_LIFECYCLE_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'enemy.boss_lifecycle.service', version: 'v1' }],
    defaults: {
      bossEntityId: ENEMY_BOSS_LIFECYCLE_BOSS_ENTITY_ID,
      maxHealth: ENEMY_BOSS_LIFECYCLE_MAX_HEALTH,
      lifecycleEvent: ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
      requiredStateFields: ['bossLifecycleStarted', 'bossEntityId', 'bossMaxHealth', 'bossHealthInitialized', 'bossDefeated']
    },
    diagnostics: {
      source: 'stage37.enemy_boss_lifecycle_package_slice'
    }
  };
}
