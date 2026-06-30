import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  RUNTIME_PLAN_COVERAGE_CAPABILITY_ID,
  RUNTIME_PLAN_COVERAGE_EVENT_TYPE,
  RUNTIME_PLAN_COVERAGE_KIND,
  RUNTIME_PLAN_COVERAGE_PROFILE_ID,
  RUNTIME_PLAN_COVERAGE_RUNTIME_FAMILY,
  RUNTIME_PLAN_COVERAGE_RUNTIME_SYSTEM_ID,
  RUNTIME_PLAN_COVERAGE_SCHEMA_VERSION,
  RUNTIME_PLAN_COVERAGE_SYSTEM_PHASE,
  RUNTIME_PLAN_COVERAGE_SYSTEM_VERSION
} from './runtime-plan-coverage-runtime-module.js';

export const RUNTIME_PLAN_COVERAGE_PACKAGE_VERSION = '1.0.0';
export const RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID =
  'runtime.plan_coverage.v1.verify_runtime_plan_coverage.browser_qa.v1';
export const RUNTIME_PLAN_COVERAGE_PACKAGE_REQUIRED_EVIDENCE_ID =
  'runtime.plan_coverage.v1.evidence.capability_qa_report.v1';

export function createRuntimePlanCoveragePackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: RUNTIME_PLAN_COVERAGE_CAPABILITY_ID,
      packageVersion: RUNTIME_PLAN_COVERAGE_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Runtime plan coverage capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: [RUNTIME_PLAN_COVERAGE_RUNTIME_FAMILY],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'runtime.plan_coverage.schema',
      ownedPaths: ['/runtime/planCoverage', '/artifacts/runtime_plan_coverage'],
      normalizerId: 'runtime.plan_coverage.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'runtime.plan_coverage.ir',
      ownedNodeKinds: ['runtime_system.runtime.plan_coverage']
    },
    runtime: {
      families: [RUNTIME_PLAN_COVERAGE_RUNTIME_FAMILY],
      systems: [
        {
          id: RUNTIME_PLAN_COVERAGE_RUNTIME_SYSTEM_ID,
          version: RUNTIME_PLAN_COVERAGE_SYSTEM_VERSION,
          phase: RUNTIME_PLAN_COVERAGE_SYSTEM_PHASE,
          dependencies: ['capability_lock', 'capability_registry', 'runtime_manifest']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'VerifyRuntimePlan:coverage_alignment', executionPolicy: 'regeneration_required' }],
      compilerId: 'runtime.plan_coverage.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'runtime.plan_coverage.patch.coverage_alignment',
          policy: 'regeneration_required',
          ownedPaths: ['/runtime/planCoverage', '/artifacts/runtime_plan_coverage']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID,
          capabilityId: RUNTIME_PLAN_COVERAGE_CAPABILITY_ID,
          prerequisites: [
            'profile runtime plan is available',
            'capability lock and registry inventory are available',
            'runtime plan coverage report is generated for the selected profile'
          ],
          actions: [
            {
              id: `${RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID}.action.verify_coverage`,
              kind: 'runtime_event',
              target: RUNTIME_PLAN_COVERAGE_EVENT_TYPE,
              parameters: {
                artifactKind: RUNTIME_PLAN_COVERAGE_KIND,
                schemaVersion: RUNTIME_PLAN_COVERAGE_SCHEMA_VERSION,
                profileId: RUNTIME_PLAN_COVERAGE_PROFILE_ID,
                runtimeFamily: RUNTIME_PLAN_COVERAGE_RUNTIME_FAMILY
              }
            }
          ],
          observations: [
            {
              id: `${RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID}.observation.coverage`,
              kind: 'state_probe',
              runtimeSystemId: RUNTIME_PLAN_COVERAGE_RUNTIME_SYSTEM_ID,
              ref: RUNTIME_PLAN_COVERAGE_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID}.assertion.coverage`,
              observationId: `${RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID}.observation.coverage`,
              comparator: 'exists',
              expected: {
                runtimePlanCoverageComputed: true,
                runtimePlanCoverageKind: RUNTIME_PLAN_COVERAGE_KIND,
                runtimePlanCoverageSchemaVersion: RUNTIME_PLAN_COVERAGE_SCHEMA_VERSION,
                runtimePlanCoverageProfileId: RUNTIME_PLAN_COVERAGE_PROFILE_ID,
                runtimePlanCoverageRuntimeFamily: RUNTIME_PLAN_COVERAGE_RUNTIME_FAMILY,
                runtimePlanCoverageCapabilityLockMatched: true,
                runtimePlanCoverageRequiredCapabilitiesEnumerated: true,
                runtimePlanCoveragePackageInventoryMatched: true,
                runtimePlanCoverageMissingCapabilitiesReported: true,
                runtimePlanCoverageNoUnclassifiedRequiredCapabilities: true,
                runtimePlanCoverageReportHashPresent: true
              },
              message: 'runtime plan coverage evidence verifies profile, capability lock, inventory alignment, required capability enumeration, and gap reporting'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: RUNTIME_PLAN_COVERAGE_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'runtime.plan_coverage.service', version: 'v1' }],
    defaults: {
      event: RUNTIME_PLAN_COVERAGE_EVENT_TYPE,
      artifactKind: RUNTIME_PLAN_COVERAGE_KIND,
      schemaVersion: RUNTIME_PLAN_COVERAGE_SCHEMA_VERSION,
      profileId: RUNTIME_PLAN_COVERAGE_PROFILE_ID,
      runtimeFamily: RUNTIME_PLAN_COVERAGE_RUNTIME_FAMILY,
      requiredStateFields: [
        'runtimePlanCoverageComputed',
        'runtimePlanCoverageKind',
        'runtimePlanCoverageSchemaVersion',
        'runtimePlanCoverageProfileId',
        'runtimePlanCoverageRuntimeFamily',
        'runtimePlanCoverageCapabilityLockMatched',
        'runtimePlanCoverageRequiredCapabilitiesEnumerated',
        'runtimePlanCoveragePackageInventoryMatched',
        'runtimePlanCoverageMissingCapabilitiesReported',
        'runtimePlanCoverageNoUnclassifiedRequiredCapabilities',
        'runtimePlanCoverageReportHashPresent'
      ]
    },
    diagnostics: {
      source: 'stage37.runtime_plan_coverage_package_slice'
    }
  };
}
