import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  COMBAT_PROJECTILE_CAPABILITY_ID,
  COMBAT_PROJECTILE_RUNTIME_SYSTEM_ID
} from './combat-projectile-runtime-module.js';

export const COMBAT_PROJECTILE_PACKAGE_VERSION = '1.0.0';
export const COMBAT_PROJECTILE_REQUIRED_PROBE_ID = 'combat.projectile.v1.spawn.browser_qa.v1';
export const COMBAT_PROJECTILE_PACKAGE_REQUIRED_EVIDENCE_ID = 'combat.projectile.v1.evidence.capability_qa_report.v1';

export function createCombatProjectilePackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: COMBAT_PROJECTILE_CAPABILITY_ID,
      packageVersion: COMBAT_PROJECTILE_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Player projectile spawn capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'combat.projectile.schema',
      ownedPaths: ['/capability_configs/projectile_combat'],
      normalizerId: 'combat.projectile.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'combat.projectile.ir',
      ownedNodeKinds: ['runtime_system.combat.projectile']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: COMBAT_PROJECTILE_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'gameplay', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetProjectileSpawn:player_default', executionPolicy: 'hot_runtime_patch' }],
      compilerId: 'combat.projectile.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'combat.projectile.patch.spawn',
          policy: 'hot_runtime_patch',
          ownedPaths: ['/capability_configs/projectile_combat']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: COMBAT_PROJECTILE_REQUIRED_PROBE_ID,
          capabilityId: COMBAT_PROJECTILE_CAPABILITY_ID,
          prerequisites: ['runtime scene started', 'player fire action spawns a projectile'],
          actions: [
            {
              id: `${COMBAT_PROJECTILE_REQUIRED_PROBE_ID}.action.fire`,
              kind: 'runtime_event',
              target: 'combat.projectile.spawn',
              parameters: { ownerEntityId: 'player', action: 'spawn_projectile' }
            }
          ],
          observations: [
            {
              id: `${COMBAT_PROJECTILE_REQUIRED_PROBE_ID}.observation.projectile_spawned`,
              kind: 'runtime_event',
              runtimeSystemId: COMBAT_PROJECTILE_RUNTIME_SYSTEM_ID,
              ref: 'projectile.spawned'
            }
          ],
          assertions: [
            {
              id: `${COMBAT_PROJECTILE_REQUIRED_PROBE_ID}.assertion.projectile_spawned`,
              observationId: `${COMBAT_PROJECTILE_REQUIRED_PROBE_ID}.observation.projectile_spawned`,
              comparator: 'exists',
              message: 'combat projectile package observes projectile.spawned'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: COMBAT_PROJECTILE_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'combat.projectile.service', version: 'v1' }],
    defaults: {
      owner: 'player',
      spawnEvent: 'projectile.spawned'
    },
    diagnostics: {
      source: 'stage37.combat_projectile_package_owned_qa_slice'
    }
  };
}

