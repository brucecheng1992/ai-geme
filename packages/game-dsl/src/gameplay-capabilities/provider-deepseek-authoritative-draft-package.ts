import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_CAPABILITY_ID,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_ARTIFACT_KIND,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_CANONICAL_SCHEMA_VERSION,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_EVENT_TYPE,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PROFILE_ID,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PROVIDER_ID,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_SCHEMA_VERSION,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_RUNTIME_SYSTEM_ID
} from './provider-deepseek-authoritative-draft-runtime-module.js';

export const PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PACKAGE_VERSION = '1.0.0';
export const PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID =
  'provider.deepseek_authoritative_draft.v1.draft.browser_qa.v1';
export const PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PACKAGE_REQUIRED_EVIDENCE_ID =
  'provider.deepseek_authoritative_draft.v1.evidence.capability_qa_report.v1';
const PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_RAW_PATH = 'capability-game-dsl-draft.raw.json';
const PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_COMPOSED_SCHEMA_ARTIFACT_KIND = 'composed_game_dsl_schema';
const PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_COMPOSED_SCHEMA_VERSION = 'composed-game-dsl-schema.v1';

export function createProviderDeepSeekAuthoritativeDraftPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_CAPABILITY_ID,
      packageVersion: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'DeepSeek provider authoritative CapabilityGameDslDraft v1 package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'provider.deepseek_authoritative_draft.schema',
      ownedPaths: ['/provider/deepseek_authoritative_draft'],
      normalizerId: 'provider.deepseek_authoritative_draft.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'provider.deepseek_authoritative_draft.ir',
      ownedNodeKinds: ['runtime_system.provider.deepseek_authoritative_draft']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [
        {
          id: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'bootstrap',
          dependencies: ['metadata.fixed_prompt_binding', 'profile.deepseek_run_and_gun_validation']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'ValidateDeepSeekAuthoritativeDraft:capability_game_dsl_draft_v1', executionPolicy: 'regeneration_required' }],
      compilerId: 'provider.deepseek_authoritative_draft.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'provider.deepseek_authoritative_draft.patch.draft_contract',
          policy: 'regeneration_required',
          ownedPaths: ['/provider/deepseek_authoritative_draft']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID,
          capabilityId: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_CAPABILITY_ID,
          prerequisites: [
            'DeepSeek provider response is available for the current run',
            'CapabilityGameDslDraft v1 schema validation completed',
            'composed schema identity is system generated',
            'trusted runtime evidence fields are rejected from the model-owned draft'
          ],
          actions: [
            {
              id: `${PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID}.action.validate_draft`,
              kind: 'runtime_event',
              target: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_EVENT_TYPE,
              parameters: {
                providerId: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PROVIDER_ID,
                draftArtifactKind: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_ARTIFACT_KIND,
                draftSchemaVersion: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_SCHEMA_VERSION,
                canonicalSchemaVersion: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_CANONICAL_SCHEMA_VERSION
              }
            }
          ],
          observations: [
            {
              id: `${PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID}.observation.validated`,
              kind: 'runtime_event',
              runtimeSystemId: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_RUNTIME_SYSTEM_ID,
              ref: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID}.assertion.authoritative_draft_verified`,
              observationId: `${PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID}.observation.validated`,
              comparator: 'exists',
              expected: {
                deepSeekAuthoritativeDraftProduced: true,
                deepSeekProviderId: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PROVIDER_ID,
                deepSeekDraftArtifactKind: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_ARTIFACT_KIND,
                deepSeekDraftSchemaVersion: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_SCHEMA_VERSION,
                deepSeekDraftNormalized: true,
                deepSeekCanonicalSchemaVersion: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_CANONICAL_SCHEMA_VERSION,
                deepSeekComposedSchemaHashMatched: true,
                deepSeekCapabilityLockHashMatched: true,
                deepSeekTrustedEvidenceRejected: true
              },
              message: 'DeepSeek authoritative draft package observes a validated CapabilityGameDslDraft v1 without trusted runtime evidence in model output'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PACKAGE_REQUIRED_EVIDENCE_ID,
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
      { capabilityId: 'metadata.fixed_prompt_binding.v1', range: '^v1' },
      { capabilityId: 'profile.deepseek_run_and_gun_validation.v1', range: '^v1' }
    ],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'provider.deepseek_authoritative_draft.service', version: 'v1' }],
    defaults: {
      draftArtifactKind: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_ARTIFACT_KIND,
      draftSchemaVersion: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_SCHEMA_VERSION,
      rawPath: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_RAW_PATH,
      composedSchemaArtifactKind: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_COMPOSED_SCHEMA_ARTIFACT_KIND,
      composedSchemaVersion: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_COMPOSED_SCHEMA_VERSION,
      providerProfileId: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PROFILE_ID,
      providerId: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PROVIDER_ID,
      canonicalSchemaVersion: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_CANONICAL_SCHEMA_VERSION,
      validationEvent: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_EVENT_TYPE,
      requiredStateFields: [
        'deepSeekAuthoritativeDraftProduced',
        'deepSeekProviderId',
        'deepSeekDraftArtifactKind',
        'deepSeekDraftSchemaVersion',
        'deepSeekDraftNormalized',
        'deepSeekCanonicalSchemaVersion',
        'deepSeekComposedSchemaHashMatched',
        'deepSeekCapabilityLockHashMatched',
        'deepSeekTrustedEvidenceRejected'
      ]
    },
    diagnostics: {
      source: 'stage37.provider_deepseek_authoritative_draft_package_slice'
    }
  };
}
