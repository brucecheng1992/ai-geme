import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  RUNTIME_MANIFEST_BINDING_CAPABILITY_ID,
  RUNTIME_MANIFEST_BINDING_EVENT_TYPE,
  RUNTIME_MANIFEST_BINDING_PROFILE_ID,
  RUNTIME_MANIFEST_BINDING_RUNTIME_FAMILY,
  RUNTIME_MANIFEST_BINDING_RUNTIME_SYSTEM_ID,
  RUNTIME_MANIFEST_BINDING_SYSTEM_DEPENDENCY_COUNT,
  RUNTIME_MANIFEST_BINDING_SYSTEM_PHASE,
  RUNTIME_MANIFEST_BINDING_SYSTEM_VERSION,
  RUNTIME_MANIFEST_BINDING_TEMPLATE_ID
} from './runtime-manifest-binding-runtime-module.js';

export const RUNTIME_MANIFEST_BINDING_PACKAGE_VERSION = '1.0.0';
export const RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID =
  'runtime.manifest_binding.v1.verify_runtime_manifest_binding.browser_qa.v1';
export const RUNTIME_MANIFEST_BINDING_PACKAGE_REQUIRED_EVIDENCE_ID =
  'runtime.manifest_binding.v1.evidence.capability_qa_report.v1';

export function createRuntimeManifestBindingPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: RUNTIME_MANIFEST_BINDING_CAPABILITY_ID,
      packageVersion: RUNTIME_MANIFEST_BINDING_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Runtime manifest binding capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: [RUNTIME_MANIFEST_BINDING_RUNTIME_FAMILY],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'runtime.manifest_binding.schema',
      ownedPaths: ['/runtime/manifestBinding', '/capability_configs/runtime_manifest_binding'],
      normalizerId: 'runtime.manifest_binding.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'runtime.manifest_binding.ir',
      ownedNodeKinds: ['runtime_system.runtime.manifest_binding']
    },
    runtime: {
      families: [RUNTIME_MANIFEST_BINDING_RUNTIME_FAMILY],
      systems: [
        {
          id: RUNTIME_MANIFEST_BINDING_RUNTIME_SYSTEM_ID,
          version: RUNTIME_MANIFEST_BINDING_SYSTEM_VERSION,
          phase: RUNTIME_MANIFEST_BINDING_SYSTEM_PHASE,
          dependencies: ['runtime_plan']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'VerifyRuntimeManifest:capability_lock_binding', executionPolicy: 'regeneration_required' }],
      compilerId: 'runtime.manifest_binding.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'runtime.manifest_binding.patch.capability_lock_binding',
          policy: 'regeneration_required',
          ownedPaths: ['/runtime/manifestBinding', '/capability_configs/runtime_manifest_binding']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID,
          capabilityId: RUNTIME_MANIFEST_BINDING_CAPABILITY_ID,
          prerequisites: [
            'profile runtime loader plan is available',
            'runtime manifest is available',
            'capability lock is bound to the selected profile'
          ],
          actions: [
            {
              id: `${RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID}.action.verify_binding`,
              kind: 'runtime_event',
              target: RUNTIME_MANIFEST_BINDING_EVENT_TYPE,
              parameters: {
                profileId: RUNTIME_MANIFEST_BINDING_PROFILE_ID,
                runtimeFamily: RUNTIME_MANIFEST_BINDING_RUNTIME_FAMILY,
                templateId: RUNTIME_MANIFEST_BINDING_TEMPLATE_ID,
                runtimeSystemId: RUNTIME_MANIFEST_BINDING_RUNTIME_SYSTEM_ID
              }
            }
          ],
          observations: [
            {
              id: `${RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID}.observation.binding`,
              kind: 'state_probe',
              runtimeSystemId: RUNTIME_MANIFEST_BINDING_RUNTIME_SYSTEM_ID,
              ref: RUNTIME_MANIFEST_BINDING_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID}.assertion.binding`,
              observationId: `${RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID}.observation.binding`,
              comparator: 'exists',
              expected: {
                runtimeManifestBound: true,
                runtimeManifestRuntimeFamily: RUNTIME_MANIFEST_BINDING_RUNTIME_FAMILY,
                runtimeManifestProfileId: RUNTIME_MANIFEST_BINDING_PROFILE_ID,
                runtimeManifestTemplateId: RUNTIME_MANIFEST_BINDING_TEMPLATE_ID,
                runtimeManifestCapabilityLockBound: true,
                runtimeManifestCapabilityId: RUNTIME_MANIFEST_BINDING_CAPABILITY_ID,
                runtimeManifestSystemId: RUNTIME_MANIFEST_BINDING_RUNTIME_SYSTEM_ID,
                runtimeManifestSystemVersion: RUNTIME_MANIFEST_BINDING_SYSTEM_VERSION,
                runtimeManifestSystemPhase: RUNTIME_MANIFEST_BINDING_SYSTEM_PHASE,
                runtimeManifestSystemDependencyCount: RUNTIME_MANIFEST_BINDING_SYSTEM_DEPENDENCY_COUNT,
                runtimeManifestLoaderPlanBound: true
              },
              message: 'runtime manifest binding evidence verifies profile, capability lock, runtime system, and loader-plan binding'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: RUNTIME_MANIFEST_BINDING_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'runtime.manifest_binding.service', version: 'v1' }],
    defaults: {
      event: RUNTIME_MANIFEST_BINDING_EVENT_TYPE,
      profileId: RUNTIME_MANIFEST_BINDING_PROFILE_ID,
      runtimeFamily: RUNTIME_MANIFEST_BINDING_RUNTIME_FAMILY,
      templateId: RUNTIME_MANIFEST_BINDING_TEMPLATE_ID,
      runtimeSystemId: RUNTIME_MANIFEST_BINDING_RUNTIME_SYSTEM_ID,
      requiredStateFields: [
        'runtimeManifestBound',
        'runtimeManifestRuntimeFamily',
        'runtimeManifestProfileId',
        'runtimeManifestTemplateId',
        'runtimeManifestCapabilityLockBound',
        'runtimeManifestCapabilityId',
        'runtimeManifestSystemId',
        'runtimeManifestSystemVersion',
        'runtimeManifestSystemPhase',
        'runtimeManifestSystemDependencyCount',
        'runtimeManifestLoaderPlanBound'
      ]
    },
    diagnostics: {
      source: 'stage37.runtime_manifest_binding_package_slice'
    }
  };
}
