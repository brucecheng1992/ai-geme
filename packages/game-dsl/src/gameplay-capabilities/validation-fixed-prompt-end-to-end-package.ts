import {
  FIXED_PROMPT_BINDING_CAPABILITY_ID,
  FIXED_PROMPT_BINDING_EVENT_TYPE,
  FIXED_PROMPT_BINDING_RUNTIME_SYSTEM_ID
} from './fixed-prompt-binding-runtime-module.js';
import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_CAPABILITY_ID,
  PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
  PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_RUNTIME_SYSTEM_ID
} from './profile-deepseek-run-and-gun-validation-runtime-module.js';
import {
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_CANONICAL_SCHEMA_VERSION,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_CAPABILITY_ID,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_EVENT_TYPE,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PROVIDER_ID,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_RUNTIME_SYSTEM_ID,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_SCHEMA_VERSION
} from './provider-deepseek-authoritative-draft-runtime-module.js';
import {
  VALIDATION_FIXED_PROMPT_END_TO_END_CAPABILITY_ID,
  VALIDATION_FIXED_PROMPT_END_TO_END_EVENT_TYPE,
  VALIDATION_FIXED_PROMPT_END_TO_END_PROFILE_ID,
  VALIDATION_FIXED_PROMPT_END_TO_END_PROMPT_SOURCE,
  VALIDATION_FIXED_PROMPT_END_TO_END_RUNTIME_FAMILY,
  VALIDATION_FIXED_PROMPT_END_TO_END_RUNTIME_SYSTEM_ID,
  VALIDATION_FIXED_PROMPT_END_TO_END_SCHEMA_VERSION
} from './validation-fixed-prompt-end-to-end-runtime-module.js';

export const VALIDATION_FIXED_PROMPT_END_TO_END_PACKAGE_VERSION = '1.0.0';
export const VALIDATION_FIXED_PROMPT_END_TO_END_REQUIRED_PROBE_ID =
  'validation.fixed_prompt_end_to_end.v1.fixed_prompt.browser_qa.v1';
export const VALIDATION_FIXED_PROMPT_END_TO_END_PACKAGE_REQUIRED_EVIDENCE_ID =
  'validation.fixed_prompt_end_to_end.v1.evidence.capability_qa_report.v1';

export function createValidationFixedPromptEndToEndPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: VALIDATION_FIXED_PROMPT_END_TO_END_CAPABILITY_ID,
      packageVersion: VALIDATION_FIXED_PROMPT_END_TO_END_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Validation fixed prompt end-to-end capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: [VALIDATION_FIXED_PROMPT_END_TO_END_RUNTIME_FAMILY],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'validation.fixed_prompt_end_to_end.schema',
      ownedPaths: ['/validation/fixedPromptEndToEnd', '/capability_configs/validation_fixed_prompt_end_to_end'],
      normalizerId: 'validation.fixed_prompt_end_to_end.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'validation.fixed_prompt_end_to_end.ir',
      ownedNodeKinds: ['validation.fixed_prompt_end_to_end.report']
    },
    runtime: {
      families: [VALIDATION_FIXED_PROMPT_END_TO_END_RUNTIME_FAMILY],
      systems: [
        {
          id: VALIDATION_FIXED_PROMPT_END_TO_END_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'telemetry',
          dependencies: [
            FIXED_PROMPT_BINDING_RUNTIME_SYSTEM_ID,
            PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_RUNTIME_SYSTEM_ID,
            PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_RUNTIME_SYSTEM_ID
          ]
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'VerifyFixedPromptEndToEnd:provider_draft', executionPolicy: 'regeneration_required' }],
      compilerId: 'validation.fixed_prompt_end_to_end.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'validation.fixed_prompt_end_to_end.patch.validation_chain',
          policy: 'regeneration_required',
          ownedPaths: ['/validation/fixedPromptEndToEnd', '/capability_configs/validation_fixed_prompt_end_to_end']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: VALIDATION_FIXED_PROMPT_END_TO_END_REQUIRED_PROBE_ID,
          capabilityId: VALIDATION_FIXED_PROMPT_END_TO_END_CAPABILITY_ID,
          prerequisites: [
            'fixed prompt binding probe passed in the current QA plan',
            'DeepSeek validation profile binding probe passed in the current QA plan',
            'DeepSeek authoritative draft probe passed in the current QA plan'
          ],
          actions: [
            {
              id: `${VALIDATION_FIXED_PROMPT_END_TO_END_REQUIRED_PROBE_ID}.action.verify_fixed_prompt_chain`,
              kind: 'runtime_event',
              target: VALIDATION_FIXED_PROMPT_END_TO_END_EVENT_TYPE,
              parameters: {
                promptSource: VALIDATION_FIXED_PROMPT_END_TO_END_PROMPT_SOURCE,
                providerId: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PROVIDER_ID,
                draftSchemaVersion: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_SCHEMA_VERSION,
                canonicalSchemaVersion: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_CANONICAL_SCHEMA_VERSION
              }
            }
          ],
          observations: [
            {
              id: `${VALIDATION_FIXED_PROMPT_END_TO_END_REQUIRED_PROBE_ID}.observation.fixed_prompt_chain`,
              kind: 'runtime_event',
              runtimeSystemId: VALIDATION_FIXED_PROMPT_END_TO_END_RUNTIME_SYSTEM_ID,
              ref: VALIDATION_FIXED_PROMPT_END_TO_END_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${VALIDATION_FIXED_PROMPT_END_TO_END_REQUIRED_PROBE_ID}.assertion.fixed_prompt_end_to_end`,
              observationId: `${VALIDATION_FIXED_PROMPT_END_TO_END_REQUIRED_PROBE_ID}.observation.fixed_prompt_chain`,
              comparator: 'exists',
              expected: {
                fixedPromptEndToEndVerified: true,
                fixedPromptSchemaVersion: VALIDATION_FIXED_PROMPT_END_TO_END_SCHEMA_VERSION,
                fixedPromptSource: VALIDATION_FIXED_PROMPT_END_TO_END_PROMPT_SOURCE,
                fixedPromptProfileId: VALIDATION_FIXED_PROMPT_END_TO_END_PROFILE_ID,
                fixedPromptRuntimeFamily: VALIDATION_FIXED_PROMPT_END_TO_END_RUNTIME_FAMILY,
                fixedPromptBindingObserved: true,
                fixedPromptProfileBindingObserved: true,
                fixedPromptProviderDraftValidated: true,
                fixedPromptProviderId: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PROVIDER_ID,
                fixedPromptDraftSchemaVersion: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_SCHEMA_VERSION,
                fixedPromptCanonicalSchemaVersion: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_CANONICAL_SCHEMA_VERSION,
                fixedPromptHashMatched: true,
                fixedPromptFallbackPromptUsed: false
              },
              message: 'fixed prompt end-to-end validation observes prompt binding, profile binding, and provider draft validation in one package-owned proof'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: VALIDATION_FIXED_PROMPT_END_TO_END_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    dependencies: [
      { capabilityId: FIXED_PROMPT_BINDING_CAPABILITY_ID, range: '^v1' },
      { capabilityId: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_CAPABILITY_ID, range: '^v1' },
      { capabilityId: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_CAPABILITY_ID, range: '^v1' }
    ],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'validation.fixed_prompt_end_to_end.service', version: 'v1' }],
    defaults: {
      promptSource: VALIDATION_FIXED_PROMPT_END_TO_END_PROMPT_SOURCE,
      verificationEvent: VALIDATION_FIXED_PROMPT_END_TO_END_EVENT_TYPE,
      dependencyEvents: [
        FIXED_PROMPT_BINDING_EVENT_TYPE,
        PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
        PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_EVENT_TYPE
      ],
      requiredStateFields: [
        'fixedPromptEndToEndVerified',
        'fixedPromptSchemaVersion',
        'fixedPromptSource',
        'fixedPromptProfileId',
        'fixedPromptRuntimeFamily',
        'fixedPromptBindingObserved',
        'fixedPromptProfileBindingObserved',
        'fixedPromptProviderDraftValidated',
        'fixedPromptProviderId',
        'fixedPromptDraftSchemaVersion',
        'fixedPromptCanonicalSchemaVersion',
        'fixedPromptHashMatched',
        'fixedPromptFallbackPromptUsed'
      ]
    },
    diagnostics: {
      source: 'stage37.validation_fixed_prompt_end_to_end_package_slice'
    }
  };
}
