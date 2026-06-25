import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  MOVEMENT_CROUCH_CAPABILITY_ID,
  MOVEMENT_CROUCH_ENTERED_EVENT_TYPE,
  MOVEMENT_CROUCH_HEIGHT_SCALE,
  MOVEMENT_CROUCH_RUNTIME_SYSTEM_ID
} from './movement-crouch-runtime-module.js';

export const MOVEMENT_CROUCH_PACKAGE_VERSION = '1.0.0';
export const MOVEMENT_CROUCH_REQUIRED_PROBE_ID = 'movement.crouch.v1.state.browser_qa.v1';
export const MOVEMENT_CROUCH_PACKAGE_REQUIRED_EVIDENCE_ID = 'movement.crouch.v1.evidence.capability_qa_report.v1';

export function createMovementCrouchPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: MOVEMENT_CROUCH_CAPABILITY_ID,
      packageVersion: MOVEMENT_CROUCH_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Crouch action-state capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'movement.crouch.schema',
      ownedPaths: ['/capability_configs/crouch_action_state'],
      normalizerId: 'movement.crouch.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'movement.crouch.ir',
      ownedNodeKinds: ['runtime_system.movement.crouch']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: MOVEMENT_CROUCH_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'gameplay', dependencies: ['movement.run_jump'] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetMovementCrouch:height_scale', executionPolicy: 'hot_runtime_patch' }],
      compilerId: 'movement.crouch.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'movement.crouch.patch.height_scale',
          policy: 'hot_runtime_patch',
          ownedPaths: ['/capability_configs/crouch_action_state']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: MOVEMENT_CROUCH_REQUIRED_PROBE_ID,
          capabilityId: MOVEMENT_CROUCH_CAPABILITY_ID,
          prerequisites: ['runtime scene started', 'player executes crouch input', 'player enters crouched posture state'],
          actions: [
            {
              id: `${MOVEMENT_CROUCH_REQUIRED_PROBE_ID}.action.crouch`,
              kind: 'runtime_event',
              target: MOVEMENT_CROUCH_ENTERED_EVENT_TYPE,
              parameters: { ownerEntityId: 'player', action: 'crouch', crouching: true, heightScale: MOVEMENT_CROUCH_HEIGHT_SCALE }
            }
          ],
          observations: [
            {
              id: `${MOVEMENT_CROUCH_REQUIRED_PROBE_ID}.observation.state_entered`,
              kind: 'runtime_event',
              runtimeSystemId: MOVEMENT_CROUCH_RUNTIME_SYSTEM_ID,
              ref: MOVEMENT_CROUCH_ENTERED_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${MOVEMENT_CROUCH_REQUIRED_PROBE_ID}.assertion.state_entered`,
              observationId: `${MOVEMENT_CROUCH_REQUIRED_PROBE_ID}.observation.state_entered`,
              comparator: 'exists',
              message: 'movement crouch package observes the player enter crouched posture state'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: MOVEMENT_CROUCH_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    optionalDependencies: [{ capabilityId: 'movement.run_jump.v1', range: '^1.0.0' }],
    conflictsWith: [],
    provides: [{ id: 'movement.crouch.service', version: 'v1' }],
    defaults: {
      crouchEvent: MOVEMENT_CROUCH_ENTERED_EVENT_TYPE,
      heightScale: MOVEMENT_CROUCH_HEIGHT_SCALE
    },
    diagnostics: {
      source: 'stage37.movement_crouch_package_owned_qa_slice'
    }
  };
}
