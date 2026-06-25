import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  HEALTH_PLAYER_HEALTH_POINTS_CAPABILITY_ID,
  HEALTH_PLAYER_HEALTH_POINTS_CURRENT_EVENT_TYPE,
  HEALTH_PLAYER_HEALTH_POINTS_RUNTIME_SYSTEM_ID
} from './health-player-health-points-runtime-module.js';

export const HEALTH_PLAYER_HEALTH_POINTS_PACKAGE_VERSION = '1.0.0';
export const HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID = 'health.player_health_points.v1.current.browser_qa.v1';
export const HEALTH_PLAYER_HEALTH_POINTS_PACKAGE_REQUIRED_EVIDENCE_ID = 'health.player_health_points.v1.evidence.capability_qa_report.v1';

export function createHealthPlayerHealthPointsPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: HEALTH_PLAYER_HEALTH_POINTS_CAPABILITY_ID,
      packageVersion: HEALTH_PLAYER_HEALTH_POINTS_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Player health point state capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'health.player_health_points.schema',
      ownedPaths: ['/capability_configs/player_health_points'],
      normalizerId: 'health.player_health_points.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'health.player_health_points.ir',
      ownedNodeKinds: ['runtime_system.health.player_health_points']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: HEALTH_PLAYER_HEALTH_POINTS_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'gameplay', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetPlayerHealth:max_points', executionPolicy: 'hot_runtime_patch' }],
      compilerId: 'health.player_health_points.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'health.player_health_points.patch.max_points',
          policy: 'hot_runtime_patch',
          ownedPaths: ['/capability_configs/player_health_points']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID,
          capabilityId: HEALTH_PLAYER_HEALTH_POINTS_CAPABILITY_ID,
          prerequisites: ['runtime scene started', 'player health state initialized from runtime plan'],
          actions: [
            {
              id: `${HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID}.action.observe_current_health`,
              kind: 'runtime_event',
              target: HEALTH_PLAYER_HEALTH_POINTS_CURRENT_EVENT_TYPE,
              parameters: { ownerEntityId: 'player', action: 'observe_health_points' }
            }
          ],
          observations: [
            {
              id: `${HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID}.observation.current_health`,
              kind: 'state_probe',
              runtimeSystemId: HEALTH_PLAYER_HEALTH_POINTS_RUNTIME_SYSTEM_ID,
              ref: HEALTH_PLAYER_HEALTH_POINTS_CURRENT_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID}.assertion.current_health`,
              observationId: `${HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID}.observation.current_health`,
              comparator: 'exists',
              message: 'player health points package observes current runtime health'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: HEALTH_PLAYER_HEALTH_POINTS_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'health.player_health_points.service', version: 'v1' }],
    defaults: {
      currentHealthEvent: HEALTH_PLAYER_HEALTH_POINTS_CURRENT_EVENT_TYPE
    },
    diagnostics: {
      source: 'stage37.health_player_health_points_package_owned_qa_slice'
    }
  };
}
