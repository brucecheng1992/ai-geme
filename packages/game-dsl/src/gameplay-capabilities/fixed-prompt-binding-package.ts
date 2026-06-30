import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  FIXED_PROMPT_BINDING_CAPABILITY_ID,
  FIXED_PROMPT_BINDING_EVENT_TYPE,
  FIXED_PROMPT_BINDING_RUNTIME_SYSTEM_ID
} from './fixed-prompt-binding-runtime-module.js';

export const FIXED_PROMPT_BINDING_PACKAGE_VERSION = '1.0.0';
export const FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID = 'metadata.fixed_prompt_binding.v1.bound.browser_qa.v1';
export const FIXED_PROMPT_BINDING_PACKAGE_REQUIRED_EVIDENCE_ID = 'metadata.fixed_prompt_binding.v1.evidence.capability_qa_report.v1';

export function createFixedPromptBindingPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: FIXED_PROMPT_BINDING_CAPABILITY_ID,
      packageVersion: FIXED_PROMPT_BINDING_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Fixed validation prompt binding metadata capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'metadata.fixed_prompt_binding.schema',
      ownedPaths: ['/targetProfile/fixedPrompt'],
      normalizerId: 'metadata.fixed_prompt_binding.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'metadata.fixed_prompt_binding.ir',
      ownedNodeKinds: ['runtime_system.metadata.fixed_prompt_binding']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: FIXED_PROMPT_BINDING_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'telemetry', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetFixedPromptBinding:profile_hash', executionPolicy: 'regeneration_required' }],
      compilerId: 'metadata.fixed_prompt_binding.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'metadata.fixed_prompt_binding.patch.profile_hash',
          policy: 'regeneration_required',
          ownedPaths: ['/targetProfile/fixedPrompt']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID,
          capabilityId: FIXED_PROMPT_BINDING_CAPABILITY_ID,
          prerequisites: ['target profile is bound to the fixed validation prompt', 'runtime metadata receipt is available'],
          actions: [
            {
              id: `${FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID}.action.observe_binding`,
              kind: 'runtime_event',
              target: FIXED_PROMPT_BINDING_EVENT_TYPE,
              parameters: { source: 'target_profile.fixedPrompt.sha256' }
            }
          ],
          observations: [
            {
              id: `${FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID}.observation.bound`,
              kind: 'runtime_event',
              runtimeSystemId: FIXED_PROMPT_BINDING_RUNTIME_SYSTEM_ID,
              ref: FIXED_PROMPT_BINDING_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID}.assertion.bound`,
              observationId: `${FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID}.observation.bound`,
              comparator: 'exists',
              message: 'fixed prompt binding package observes the target profile fixed prompt metadata receipt'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: FIXED_PROMPT_BINDING_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'metadata.fixed_prompt_binding.service', version: 'v1' }],
    defaults: {
      bindingEvent: FIXED_PROMPT_BINDING_EVENT_TYPE
    },
    diagnostics: {
      source: 'stage37.metadata_fixed_prompt_binding_package_slice'
    }
  };
}
