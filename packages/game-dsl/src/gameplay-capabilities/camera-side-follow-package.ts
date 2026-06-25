import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  CAMERA_SIDE_FOLLOW_ACTIVE_EVENT_TYPE,
  CAMERA_SIDE_FOLLOW_CAPABILITY_ID,
  CAMERA_SIDE_FOLLOW_RUNTIME_SYSTEM_ID
} from './camera-side-follow-runtime-module.js';

export const CAMERA_SIDE_FOLLOW_PACKAGE_VERSION = '1.0.0';
export const CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID = 'camera.side_follow.v1.scroll.browser_qa.v1';
export const CAMERA_SIDE_FOLLOW_PACKAGE_REQUIRED_EVIDENCE_ID = 'camera.side_follow.v1.evidence.capability_qa_report.v1';

export function createCameraSideFollowPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: CAMERA_SIDE_FOLLOW_CAPABILITY_ID,
      packageVersion: CAMERA_SIDE_FOLLOW_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Side-scrolling camera follow capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'camera.side_follow.schema',
      ownedPaths: ['/capability_configs/side_follow_camera'],
      normalizerId: 'camera.side_follow.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'camera.side_follow.ir',
      ownedNodeKinds: ['runtime_system.camera.side_follow']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: CAMERA_SIDE_FOLLOW_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'scene', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetCameraFollow:side_follow', executionPolicy: 'hot_runtime_patch' }],
      compilerId: 'camera.side_follow.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'camera.side_follow.patch.bounds',
          policy: 'hot_runtime_patch',
          ownedPaths: ['/capability_configs/side_follow_camera']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID,
          capabilityId: CAMERA_SIDE_FOLLOW_CAPABILITY_ID,
          prerequisites: ['runtime scene started', 'player moves far enough to require side-follow camera scroll'],
          actions: [
            {
              id: `${CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID}.action.move`,
              kind: 'input',
              target: 'movement.run.right',
              parameters: { ownerEntityId: 'player', action: 'move_right' }
            }
          ],
          observations: [
            {
              id: `${CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID}.observation.side_follow_active`,
              kind: 'camera_scroll',
              runtimeSystemId: CAMERA_SIDE_FOLLOW_RUNTIME_SYSTEM_ID,
              ref: CAMERA_SIDE_FOLLOW_ACTIVE_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID}.assertion.side_follow_active`,
              observationId: `${CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID}.observation.side_follow_active`,
              comparator: 'exists',
              message: 'side-follow camera scroll is active after player movement'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: CAMERA_SIDE_FOLLOW_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'camera.side_follow.service', version: 'v1' }],
    defaults: {
      cameraEvent: CAMERA_SIDE_FOLLOW_ACTIVE_EVENT_TYPE
    },
    diagnostics: {
      source: 'stage37.camera_side_follow_package_owned_qa_slice'
    }
  };
}
