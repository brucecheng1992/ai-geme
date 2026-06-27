import {
  CANONICAL_SEMANTIC_PRESERVATION_CAPABILITY_ID,
  CANONICAL_SEMANTIC_PRESERVATION_EVENT_TYPE,
  CANONICAL_SEMANTIC_PRESERVATION_RUNTIME_SYSTEM_ID
} from './canonical-semantic-preservation-runtime-module.js';
import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  VALIDATION_METAMORPHIC_SEMANTIC_HASH_BASE_HASH,
  VALIDATION_METAMORPHIC_SEMANTIC_HASH_CAPABILITY_ID,
  VALIDATION_METAMORPHIC_SEMANTIC_HASH_EVENT_TYPE,
  VALIDATION_METAMORPHIC_SEMANTIC_HASH_PROFILE_ID,
  VALIDATION_METAMORPHIC_SEMANTIC_HASH_RUNTIME_FAMILY,
  VALIDATION_METAMORPHIC_SEMANTIC_HASH_RUNTIME_SYSTEM_ID,
  VALIDATION_METAMORPHIC_SEMANTIC_HASH_SCHEMA_VERSION,
  VALIDATION_METAMORPHIC_SEMANTIC_HASH_TRANSFORM_SUITE_ID,
  VALIDATION_METAMORPHIC_SEMANTIC_HASH_VARIANT_HASH
} from './validation-metamorphic-semantic-hash-runtime-module.js';

export const VALIDATION_METAMORPHIC_SEMANTIC_HASH_PACKAGE_VERSION = '1.0.0';
export const VALIDATION_METAMORPHIC_SEMANTIC_HASH_REQUIRED_PROBE_ID =
  'validation.metamorphic_semantic_hash.v1.semantic_hash.browser_qa.v1';
export const VALIDATION_METAMORPHIC_SEMANTIC_HASH_PACKAGE_REQUIRED_EVIDENCE_ID =
  'validation.metamorphic_semantic_hash.v1.evidence.capability_qa_report.v1';

export function createValidationMetamorphicSemanticHashPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: VALIDATION_METAMORPHIC_SEMANTIC_HASH_CAPABILITY_ID,
      packageVersion: VALIDATION_METAMORPHIC_SEMANTIC_HASH_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Validation metamorphic semantic hash capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: [VALIDATION_METAMORPHIC_SEMANTIC_HASH_RUNTIME_FAMILY],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'validation.metamorphic_semantic_hash.schema',
      ownedPaths: ['/validation/metamorphicSemanticHash', '/capability_configs/validation_metamorphic_semantic_hash'],
      normalizerId: 'validation.metamorphic_semantic_hash.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'validation.metamorphic_semantic_hash.ir',
      ownedNodeKinds: ['validation.metamorphic_semantic_hash.report']
    },
    runtime: {
      families: [VALIDATION_METAMORPHIC_SEMANTIC_HASH_RUNTIME_FAMILY],
      systems: [
        {
          id: VALIDATION_METAMORPHIC_SEMANTIC_HASH_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'telemetry',
          dependencies: [CANONICAL_SEMANTIC_PRESERVATION_RUNTIME_SYSTEM_ID]
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'VerifyMetamorphicSemanticHash:equivalent_variants', executionPolicy: 'regeneration_required' }],
      compilerId: 'validation.metamorphic_semantic_hash.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'validation.metamorphic_semantic_hash.patch.metamorphic_suite',
          policy: 'regeneration_required',
          ownedPaths: ['/validation/metamorphicSemanticHash', '/capability_configs/validation_metamorphic_semantic_hash']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: VALIDATION_METAMORPHIC_SEMANTIC_HASH_REQUIRED_PROBE_ID,
          capabilityId: VALIDATION_METAMORPHIC_SEMANTIC_HASH_CAPABILITY_ID,
          prerequisites: [
            'canonical semantic preservation probe passed in the current QA plan',
            'metamorphic equivalent DSL variants are available',
            'semantic hash comparison output is captured'
          ],
          actions: [
            {
              id: `${VALIDATION_METAMORPHIC_SEMANTIC_HASH_REQUIRED_PROBE_ID}.action.verify_metamorphic_semantic_hash`,
              kind: 'runtime_event',
              target: VALIDATION_METAMORPHIC_SEMANTIC_HASH_EVENT_TYPE,
              parameters: {
                transformSuiteId: VALIDATION_METAMORPHIC_SEMANTIC_HASH_TRANSFORM_SUITE_ID,
                expectedBaseHash: VALIDATION_METAMORPHIC_SEMANTIC_HASH_BASE_HASH,
                expectedVariantHash: VALIDATION_METAMORPHIC_SEMANTIC_HASH_VARIANT_HASH
              }
            }
          ],
          observations: [
            {
              id: `${VALIDATION_METAMORPHIC_SEMANTIC_HASH_REQUIRED_PROBE_ID}.observation.metamorphic_semantic_hash`,
              kind: 'runtime_event',
              runtimeSystemId: VALIDATION_METAMORPHIC_SEMANTIC_HASH_RUNTIME_SYSTEM_ID,
              ref: VALIDATION_METAMORPHIC_SEMANTIC_HASH_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${VALIDATION_METAMORPHIC_SEMANTIC_HASH_REQUIRED_PROBE_ID}.assertion.metamorphic_semantic_hash`,
              observationId: `${VALIDATION_METAMORPHIC_SEMANTIC_HASH_REQUIRED_PROBE_ID}.observation.metamorphic_semantic_hash`,
              comparator: 'exists',
              expected: {
                metamorphicSemanticHashVerified: true,
                metamorphicSemanticHashSchemaVersion: VALIDATION_METAMORPHIC_SEMANTIC_HASH_SCHEMA_VERSION,
                metamorphicSemanticHashProfileId: VALIDATION_METAMORPHIC_SEMANTIC_HASH_PROFILE_ID,
                metamorphicSemanticHashRuntimeFamily: VALIDATION_METAMORPHIC_SEMANTIC_HASH_RUNTIME_FAMILY,
                metamorphicTransformSuiteId: VALIDATION_METAMORPHIC_SEMANTIC_HASH_TRANSFORM_SUITE_ID,
                metamorphicBaseSemanticHash: VALIDATION_METAMORPHIC_SEMANTIC_HASH_BASE_HASH,
                metamorphicVariantSemanticHash: VALIDATION_METAMORPHIC_SEMANTIC_HASH_VARIANT_HASH,
                metamorphicHashMatched: true,
                metamorphicTransformCount: 2,
                metamorphicSemanticIntentPreserved: true,
                metamorphicNoCanonicalDrift: true
              },
              message: 'metamorphic semantic hash validation proves equivalent variants preserve the canonical semantic hash without drift'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: VALIDATION_METAMORPHIC_SEMANTIC_HASH_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    dependencies: [{ capabilityId: CANONICAL_SEMANTIC_PRESERVATION_CAPABILITY_ID, range: '^v1' }],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'validation.metamorphic_semantic_hash.service', version: 'v1' }],
    defaults: {
      transformSuiteId: VALIDATION_METAMORPHIC_SEMANTIC_HASH_TRANSFORM_SUITE_ID,
      verificationEvent: VALIDATION_METAMORPHIC_SEMANTIC_HASH_EVENT_TYPE,
      dependencyEvents: [CANONICAL_SEMANTIC_PRESERVATION_EVENT_TYPE],
      requiredStateFields: [
        'metamorphicSemanticHashVerified',
        'metamorphicSemanticHashSchemaVersion',
        'metamorphicSemanticHashProfileId',
        'metamorphicSemanticHashRuntimeFamily',
        'metamorphicTransformSuiteId',
        'metamorphicBaseSemanticHash',
        'metamorphicVariantSemanticHash',
        'metamorphicHashMatched',
        'metamorphicTransformCount',
        'metamorphicSemanticIntentPreserved',
        'metamorphicNoCanonicalDrift'
      ]
    },
    diagnostics: {
      source: 'stage37.validation_metamorphic_semantic_hash_package_slice'
    }
  };
}
