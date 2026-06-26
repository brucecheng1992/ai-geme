import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_CAPABILITY_ID,
  PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
  PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_RUNTIME_SYSTEM_ID
} from './profile-deepseek-run-and-gun-validation-runtime-module.js';

export const PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_PACKAGE_VERSION = '1.0.0';
export const PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID = 'profile.deepseek_run_and_gun_validation.v1.bound.browser_qa.v1';
export const PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_PACKAGE_REQUIRED_EVIDENCE_ID =
  'profile.deepseek_run_and_gun_validation.v1.evidence.capability_qa_report.v1';

export function createProfileDeepSeekRunAndGunValidationPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_CAPABILITY_ID,
      packageVersion: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'DeepSeek run-and-gun validation profile binding capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'profile.deepseek_run_and_gun_validation.schema',
      ownedPaths: ['/profile/id', '/profile/runtime_family'],
      normalizerId: 'profile.deepseek_run_and_gun_validation.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'profile.deepseek_run_and_gun_validation.ir',
      ownedNodeKinds: ['runtime_system.profile.deepseek_run_and_gun_validation']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'telemetry', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetDeepSeekRunAndGunValidationProfile:profile_id', executionPolicy: 'regeneration_required' }],
      compilerId: 'profile.deepseek_run_and_gun_validation.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'profile.deepseek_run_and_gun_validation.patch.profile_identity',
          policy: 'regeneration_required',
          ownedPaths: ['/profile/id', '/profile/runtime_family']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID,
          capabilityId: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_CAPABILITY_ID,
          prerequisites: ['canonical DSL is bound to the DeepSeek run-and-gun validation profile', 'runtime metadata receipt is available'],
          actions: [
            {
              id: `${PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID}.action.observe_profile_binding`,
              kind: 'runtime_event',
              target: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
              parameters: { source: 'canonical_dsl.profile.id' }
            }
          ],
          observations: [
            {
              id: `${PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID}.observation.bound`,
              kind: 'runtime_event',
              runtimeSystemId: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_RUNTIME_SYSTEM_ID,
              ref: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID}.assertion.bound`,
              observationId: `${PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID}.observation.bound`,
              comparator: 'exists',
              message: 'profile binding package observes the canonical DeepSeek run-and-gun validation profile receipt'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'profile.deepseek_run_and_gun_validation.service', version: 'v1' }],
    defaults: {
      profileId: 'side_scrolling_run_and_gun.v1',
      runtimeFamily: 'phaser_2d_action_arcade.v1',
      bindingEvent: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE
    },
    diagnostics: {
      source: 'stage37.profile_deepseek_run_and_gun_validation_package_slice'
    }
  };
}
