import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  COLLISION_PLATFORM_CAPABILITY_ID,
  COLLISION_PLATFORM_GROUNDED_EVENT_TYPE,
  COLLISION_PLATFORM_RUNTIME_SYSTEM_ID
} from './collision-platform-runtime-module.js';

export const COLLISION_PLATFORM_PACKAGE_VERSION = '1.0.0';
export const COLLISION_PLATFORM_REQUIRED_PROBE_ID = 'collision.platform.v1.grounded.browser_qa.v1';
export const COLLISION_PLATFORM_PACKAGE_REQUIRED_EVIDENCE_ID = 'collision.platform.v1.evidence.capability_qa_report.v1';

export function createCollisionPlatformPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: COLLISION_PLATFORM_CAPABILITY_ID,
      packageVersion: COLLISION_PLATFORM_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Platform terrain collision capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'collision.platform.schema',
      ownedPaths: ['/capability_configs/platform_collision'],
      normalizerId: 'collision.platform.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'collision.platform.ir',
      ownedNodeKinds: ['runtime_system.collision.platform']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: COLLISION_PLATFORM_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'physics', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetPlatformCollision:terrain', executionPolicy: 'hot_runtime_patch' }],
      compilerId: 'collision.platform.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'collision.platform.patch.terrain',
          policy: 'hot_runtime_patch',
          ownedPaths: ['/capability_configs/platform_collision']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: COLLISION_PLATFORM_REQUIRED_PROBE_ID,
          capabilityId: COLLISION_PLATFORM_CAPABILITY_ID,
          prerequisites: ['runtime scene started', 'player reaches a solid platform surface'],
          actions: [
            {
              id: `${COLLISION_PLATFORM_REQUIRED_PROBE_ID}.action.resolve_grounded`,
              kind: 'runtime_event',
              target: COLLISION_PLATFORM_GROUNDED_EVENT_TYPE,
              parameters: { ownerEntityId: 'player', action: 'resolve_ground_collision' }
            }
          ],
          observations: [
            {
              id: `${COLLISION_PLATFORM_REQUIRED_PROBE_ID}.observation.grounded`,
              kind: 'state_probe',
              runtimeSystemId: COLLISION_PLATFORM_RUNTIME_SYSTEM_ID,
              ref: COLLISION_PLATFORM_GROUNDED_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${COLLISION_PLATFORM_REQUIRED_PROBE_ID}.assertion.grounded`,
              observationId: `${COLLISION_PLATFORM_REQUIRED_PROBE_ID}.observation.grounded`,
              comparator: 'exists',
              message: 'collision platform package observes player grounded on terrain'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: COLLISION_PLATFORM_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'collision.platform.service', version: 'v1' }],
    defaults: {
      groundedEvent: COLLISION_PLATFORM_GROUNDED_EVENT_TYPE
    },
    diagnostics: {
      source: 'stage37.collision_platform_package_owned_qa_slice'
    }
  };
}
