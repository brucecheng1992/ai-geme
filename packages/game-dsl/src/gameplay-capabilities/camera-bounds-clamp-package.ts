import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  CAMERA_BOUNDS_CLAMP_CAPABILITY_ID,
  CAMERA_BOUNDS_CLAMP_EVENT_TYPE,
  CAMERA_BOUNDS_CLAMP_RUNTIME_SYSTEM_ID
} from './camera-bounds-clamp-runtime-module.js';

export const CAMERA_BOUNDS_CLAMP_PACKAGE_VERSION = '1.0.0';
export const CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID = 'camera.bounds_clamp.v1.bounds.browser_qa.v1';
export const CAMERA_BOUNDS_CLAMP_PACKAGE_REQUIRED_EVIDENCE_ID = 'camera.bounds_clamp.v1.evidence.capability_qa_report.v1';

export function createCameraBoundsClampPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: CAMERA_BOUNDS_CLAMP_CAPABILITY_ID,
      packageVersion: CAMERA_BOUNDS_CLAMP_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Camera world-bounds clamp capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'camera.bounds_clamp.schema',
      ownedPaths: ['/capability_configs/camera_bounds_clamp'],
      normalizerId: 'camera.bounds_clamp.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'camera.bounds_clamp.ir',
      ownedNodeKinds: ['runtime_system.camera.bounds_clamp']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: CAMERA_BOUNDS_CLAMP_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'scene', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetCameraBoundsClamp:world_bounds', executionPolicy: 'hot_runtime_patch' }],
      compilerId: 'camera.bounds_clamp.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'camera.bounds_clamp.patch.world_bounds',
          policy: 'hot_runtime_patch',
          ownedPaths: ['/capability_configs/camera_bounds_clamp']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID,
          capabilityId: CAMERA_BOUNDS_CLAMP_CAPABILITY_ID,
          prerequisites: ['runtime scene started', 'camera can approach both horizontal world boundaries'],
          actions: [
            {
              id: `${CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID}.action.verify_camera_bounds`,
              kind: 'runtime_event',
              target: CAMERA_BOUNDS_CLAMP_EVENT_TYPE,
              parameters: {
                boundaryPolicy: 'world_bounds',
                clampRequired: true
              }
            }
          ],
          observations: [
            {
              id: `${CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID}.observation.bounds_clamped`,
              kind: 'camera_scroll',
              runtimeSystemId: CAMERA_BOUNDS_CLAMP_RUNTIME_SYSTEM_ID,
              ref: CAMERA_BOUNDS_CLAMP_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID}.assertion.bounds_clamped`,
              observationId: `${CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID}.observation.bounds_clamped`,
              comparator: 'exists',
              expected: {
                cameraWithinWorldBounds: true,
                leftBoundaryClamped: true,
                rightBoundaryClamped: true
              },
              message: 'camera remains within world bounds and clamps both horizontal boundaries'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: CAMERA_BOUNDS_CLAMP_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'camera.bounds_clamp.service', version: 'v1' }],
    defaults: {
      cameraEvent: CAMERA_BOUNDS_CLAMP_EVENT_TYPE,
      boundaryPolicy: 'world_bounds',
      requiredStateFields: ['cameraWithinWorldBounds', 'leftBoundaryClamped', 'rightBoundaryClamped']
    },
    diagnostics: {
      source: 'stage37.camera_bounds_clamp_package_slice'
    }
  };
}
