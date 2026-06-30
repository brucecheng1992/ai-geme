import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_CAPABILITY_ID,
  VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_ERROR_CODE,
  VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_EVENT_TYPE,
  VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_FIXTURE_ID,
  VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_KIND,
  VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_PATH,
  VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_PROFILE_ID,
  VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_RUNTIME_FAMILY,
  VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_RUNTIME_SYSTEM_ID,
  VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_SCHEMA_VERSION
} from './validation-fail-closed-unknown-nodes-runtime-module.js';

export const VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_PACKAGE_VERSION = '1.0.0';
export const VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_REQUIRED_PROBE_ID =
  'validation.fail_closed_unknown_nodes.v1.unknown_node.browser_qa.v1';
export const VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_PACKAGE_REQUIRED_EVIDENCE_ID =
  'validation.fail_closed_unknown_nodes.v1.evidence.capability_qa_report.v1';

export function createValidationFailClosedUnknownNodesPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_CAPABILITY_ID,
      packageVersion: VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Validation fail-closed unknown nodes capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: [VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_RUNTIME_FAMILY],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'validation.fail_closed_unknown_nodes.schema',
      ownedPaths: ['/validation/failClosedUnknownNodes', '/capability_configs/validation_fail_closed_unknown_nodes'],
      normalizerId: 'validation.fail_closed_unknown_nodes.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'validation.fail_closed_unknown_nodes.ir',
      ownedNodeKinds: ['validation.fail_closed_unknown_nodes.report']
    },
    runtime: {
      families: [VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_RUNTIME_FAMILY],
      systems: [
        {
          id: VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'telemetry',
          dependencies: []
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'VerifyValidationFailClosed:unknown_nodes', executionPolicy: 'regeneration_required' }],
      compilerId: 'validation.fail_closed_unknown_nodes.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'validation.fail_closed_unknown_nodes.patch.validation_fixture',
          policy: 'regeneration_required',
          ownedPaths: ['/validation/failClosedUnknownNodes', '/capability_configs/validation_fail_closed_unknown_nodes']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_REQUIRED_PROBE_ID,
          capabilityId: VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_CAPABILITY_ID,
          prerequisites: [
            'unknown node fixture is available',
            'validator diagnostics are captured',
            'fallback runtime generation is forbidden'
          ],
          actions: [
            {
              id: `${VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_REQUIRED_PROBE_ID}.action.verify_unknown_node_rejection`,
              kind: 'runtime_event',
              target: VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_EVENT_TYPE,
              parameters: {
                unknownNodeFixture: VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_FIXTURE_ID,
                expectedFailureCode: VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_ERROR_CODE
              }
            }
          ],
          observations: [
            {
              id: `${VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_REQUIRED_PROBE_ID}.observation.unknown_node_rejection`,
              kind: 'runtime_event',
              runtimeSystemId: VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_RUNTIME_SYSTEM_ID,
              ref: VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_REQUIRED_PROBE_ID}.assertion.fail_closed_unknown_nodes`,
              observationId: `${VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_REQUIRED_PROBE_ID}.observation.unknown_node_rejection`,
              comparator: 'exists',
              expected: {
                unknownNodesRejected: true,
                unknownNodeValidationSchemaVersion: VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_SCHEMA_VERSION,
                unknownNodeFailureCode: VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_ERROR_CODE,
                unknownNodeAccepted: false,
                fallbackRuntimeGenerated: false,
                validatorFailedClosed: true,
                unknownNodeKind: VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_KIND,
                unknownNodePath: VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_PATH,
                unknownNodeProfileId: VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_PROFILE_ID
              },
              message: 'validation package observes unknown DSL/runtime nodes rejected fail-closed without fallback runtime generation'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'validation.fail_closed_unknown_nodes.service', version: 'v1' }],
    defaults: {
      fixtureId: VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_FIXTURE_ID,
      failureCode: VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_ERROR_CODE,
      verificationEvent: VALIDATION_FAIL_CLOSED_UNKNOWN_NODES_EVENT_TYPE,
      requiredStateFields: [
        'unknownNodesRejected',
        'unknownNodeValidationSchemaVersion',
        'unknownNodeFailureCode',
        'unknownNodeAccepted',
        'fallbackRuntimeGenerated',
        'validatorFailedClosed',
        'unknownNodeKind',
        'unknownNodePath',
        'unknownNodeProfileId'
      ]
    },
    diagnostics: {
      source: 'stage37.validation_fail_closed_unknown_nodes_package_slice'
    }
  };
}
