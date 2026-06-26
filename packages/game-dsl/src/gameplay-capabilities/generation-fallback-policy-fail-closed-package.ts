import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  GENERATION_FALLBACK_POLICY_FAIL_CLOSED_CAPABILITY_ID,
  GENERATION_FALLBACK_POLICY_FAIL_CLOSED_ERROR_CODE,
  GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
  GENERATION_FALLBACK_POLICY_FAIL_CLOSED_POLICY,
  GENERATION_FALLBACK_POLICY_FAIL_CLOSED_RUNTIME_SYSTEM_ID
} from './generation-fallback-policy-fail-closed-runtime-module.js';

export const GENERATION_FALLBACK_POLICY_FAIL_CLOSED_PACKAGE_VERSION = '1.0.0';
export const GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID =
  'generation.fallback_policy_fail_closed.v1.fail_closed.browser_qa.v1';
export const GENERATION_FALLBACK_POLICY_FAIL_CLOSED_PACKAGE_REQUIRED_EVIDENCE_ID =
  'generation.fallback_policy_fail_closed.v1.evidence.capability_qa_report.v1';

export function createGenerationFallbackPolicyFailClosedPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_CAPABILITY_ID,
      packageVersion: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Generation fallback fail-closed policy capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'generation.fallback_policy_fail_closed.schema',
      ownedPaths: ['/generation/fallback_policy'],
      normalizerId: 'generation.fallback_policy_fail_closed.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'generation.fallback_policy_fail_closed.ir',
      ownedNodeKinds: ['runtime_system.generation.fallback_policy_fail_closed']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [
        {
          id: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'telemetry',
          dependencies: []
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'VerifyGenerationFallbackPolicy:fail_closed', executionPolicy: 'regeneration_required' }],
      compilerId: 'generation.fallback_policy_fail_closed.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'generation.fallback_policy_fail_closed.patch.policy',
          policy: 'regeneration_required',
          ownedPaths: ['/generation/fallback_policy']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID,
          capabilityId: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_CAPABILITY_ID,
          prerequisites: [
            'generation path receipt is available',
            'fallback policy is explicitly declared',
            'unsupported fallback output is forbidden'
          ],
          actions: [
            {
              id: `${GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID}.action.verify_fail_closed_policy`,
              kind: 'runtime_event',
              target: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
              parameters: {
                source: 'generation_path_receipt',
                fallbackPolicy: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_POLICY
              }
            }
          ],
          observations: [
            {
              id: `${GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID}.observation.fail_closed_policy`,
              kind: 'runtime_event',
              runtimeSystemId: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_RUNTIME_SYSTEM_ID,
              ref: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID}.assertion.fail_closed_policy`,
              observationId: `${GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID}.observation.fail_closed_policy`,
              comparator: 'exists',
              expected: {
                fallbackPolicy: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_POLICY,
                fallbackPolicyVerified: true,
                undeclaredFallbackDetected: false,
                fallbackOutputGenerated: false,
                fallbackFailureCode: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_ERROR_CODE
              },
              message: 'generation path package observes explicit fail-closed fallback policy with no undeclared fallback output'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'generation.fallback_policy_fail_closed.service', version: 'v1' }],
    defaults: {
      policy: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_POLICY,
      failureCode: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_ERROR_CODE,
      verificationEvent: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
      requiredStateFields: [
        'fallbackPolicy',
        'fallbackPolicyVerified',
        'undeclaredFallbackDetected',
        'fallbackOutputGenerated',
        'fallbackFailureCode'
      ]
    },
    diagnostics: {
      source: 'stage37.generation_fallback_policy_fail_closed_package_slice'
    }
  };
}
