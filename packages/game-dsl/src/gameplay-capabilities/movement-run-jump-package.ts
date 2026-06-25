import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  MOVEMENT_RUN_JUMP_CAPABILITY_ID,
  MOVEMENT_RUN_JUMP_RUNTIME_SYSTEM_ID
} from './movement-run-jump-runtime-module.js';

export const MOVEMENT_RUN_JUMP_PACKAGE_VERSION = '1.0.0';
export const MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID = 'movement.run_jump.v1.jump.browser_qa.v1';
export const MOVEMENT_RUN_JUMP_PACKAGE_REQUIRED_EVIDENCE_ID = 'movement.run_jump.v1.evidence.capability_qa_report.v1';

export function createMovementRunJumpPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: MOVEMENT_RUN_JUMP_CAPABILITY_ID,
      packageVersion: MOVEMENT_RUN_JUMP_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Run and jump movement capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'movement.run_jump.schema',
      ownedPaths: ['/capability_configs/run_jump_movement'],
      normalizerId: 'movement.run_jump.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'movement.run_jump.ir',
      ownedNodeKinds: ['runtime_system.movement.run_jump']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: MOVEMENT_RUN_JUMP_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'gameplay', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetMovementJump:run_jump', executionPolicy: 'hot_runtime_patch' }],
      compilerId: 'movement.run_jump.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'movement.run_jump.patch.jump',
          policy: 'hot_runtime_patch',
          ownedPaths: ['/capability_configs/run_jump_movement']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID,
          capabilityId: MOVEMENT_RUN_JUMP_CAPABILITY_ID,
          prerequisites: ['runtime scene started', 'player can execute jump input'],
          actions: [
            {
              id: `${MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID}.action.jump`,
              kind: 'runtime_event',
              target: 'movement.run_jump.jump',
              parameters: { ownerEntityId: 'player', action: 'jump' }
            }
          ],
          observations: [
            {
              id: `${MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID}.observation.player_jumped`,
              kind: 'runtime_event',
              runtimeSystemId: MOVEMENT_RUN_JUMP_RUNTIME_SYSTEM_ID,
              ref: 'player.jumped'
            }
          ],
          assertions: [
            {
              id: `${MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID}.assertion.player_jumped`,
              observationId: `${MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID}.observation.player_jumped`,
              comparator: 'exists',
              message: 'movement run jump package observes player.jumped'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: MOVEMENT_RUN_JUMP_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'movement.run_jump.service', version: 'v1' }],
    defaults: {
      jumpEvent: 'player.jumped'
    },
    diagnostics: {
      source: 'stage37.movement_run_jump_package_owned_qa_slice'
    }
  };
}

