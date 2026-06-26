import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  CANONICAL_SEMANTIC_PRESERVATION_CAPABILITY_ID,
  CANONICAL_SEMANTIC_PRESERVATION_EVENT_TYPE,
  CANONICAL_SEMANTIC_PRESERVATION_RUNTIME_SYSTEM_ID
} from './canonical-semantic-preservation-runtime-module.js';

export const CANONICAL_SEMANTIC_PRESERVATION_PACKAGE_VERSION = '1.0.0';
export const CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID = 'canonical.semantic_preservation.v1.semantic.browser_qa.v1';
export const CANONICAL_SEMANTIC_PRESERVATION_PACKAGE_REQUIRED_EVIDENCE_ID =
  'canonical.semantic_preservation.v1.evidence.capability_qa_report.v1';

export function createCanonicalSemanticPreservationPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: CANONICAL_SEMANTIC_PRESERVATION_CAPABILITY_ID,
      packageVersion: CANONICAL_SEMANTIC_PRESERVATION_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Canonical semantic preservation capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'canonical.semantic_preservation.schema',
      ownedPaths: ['/canonical/semantic_preservation'],
      normalizerId: 'canonical.semantic_preservation.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'canonical.semantic_preservation.ir',
      ownedNodeKinds: ['runtime_system.canonical.semantic_preservation']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: CANONICAL_SEMANTIC_PRESERVATION_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'telemetry', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'VerifyCanonicalSemanticPreservation:semantic_hash', executionPolicy: 'regeneration_required' }],
      compilerId: 'canonical.semantic_preservation.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'canonical.semantic_preservation.patch.semantic_hash',
          policy: 'regeneration_required',
          ownedPaths: ['/canonical/semantic_preservation']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID,
          capabilityId: CANONICAL_SEMANTIC_PRESERVATION_CAPABILITY_ID,
          prerequisites: [
            'canonical semantic report is available',
            'canonical hash can be compared against emitted runtime evidence',
            'semantic intent preservation policy is active'
          ],
          actions: [
            {
              id: `${CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID}.action.verify_semantic_preservation`,
              kind: 'runtime_event',
              target: CANONICAL_SEMANTIC_PRESERVATION_EVENT_TYPE,
              parameters: {
                source: 'canonical_semantic_preservation_report',
                semanticPolicy: 'preserve_intent'
              }
            }
          ],
          observations: [
            {
              id: `${CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID}.observation.semantic_preserved`,
              kind: 'runtime_event',
              runtimeSystemId: CANONICAL_SEMANTIC_PRESERVATION_RUNTIME_SYSTEM_ID,
              ref: CANONICAL_SEMANTIC_PRESERVATION_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID}.assertion.semantic_preserved`,
              observationId: `${CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID}.observation.semantic_preserved`,
              comparator: 'exists',
              expected: {
                canonicalHashMatched: true,
                semanticIntentPreserved: true,
                droppedCanonicalNodes: false
              },
              message: 'canonical semantic preservation evidence verifies hash match, preserved intent, and no dropped canonical nodes'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: CANONICAL_SEMANTIC_PRESERVATION_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'canonical.semantic_preservation.service', version: 'v1' }],
    defaults: {
      semanticEvent: CANONICAL_SEMANTIC_PRESERVATION_EVENT_TYPE,
      semanticPolicy: 'preserve_intent',
      requiredStateFields: ['canonicalHashMatched', 'semanticIntentPreserved', 'droppedCanonicalNodes']
    },
    diagnostics: {
      source: 'stage37.canonical_semantic_preservation_package_slice'
    }
  };
}
