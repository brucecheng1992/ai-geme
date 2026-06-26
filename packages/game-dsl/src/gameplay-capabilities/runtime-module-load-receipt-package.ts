import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  RUNTIME_MODULE_LOAD_RECEIPT_CAPABILITY_ID,
  RUNTIME_MODULE_LOAD_RECEIPT_EVENT_TYPE,
  RUNTIME_MODULE_LOAD_RECEIPT_KIND,
  RUNTIME_MODULE_LOAD_RECEIPT_MIN_LIFECYCLE_EVENT_COUNT,
  RUNTIME_MODULE_LOAD_RECEIPT_MIN_LOAD_ORDER_COUNT,
  RUNTIME_MODULE_LOAD_RECEIPT_PROFILE_ID,
  RUNTIME_MODULE_LOAD_RECEIPT_RUNTIME_FAMILY,
  RUNTIME_MODULE_LOAD_RECEIPT_RUNTIME_SYSTEM_ID,
  RUNTIME_MODULE_LOAD_RECEIPT_SCHEMA_VERSION,
  RUNTIME_MODULE_LOAD_RECEIPT_SYSTEM_PHASE,
  RUNTIME_MODULE_LOAD_RECEIPT_SYSTEM_VERSION
} from './runtime-module-load-receipt-runtime-module.js';

export const RUNTIME_MODULE_LOAD_RECEIPT_PACKAGE_VERSION = '1.0.0';
export const RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID =
  'runtime.module_load_receipt.v1.verify_module_load_receipt.browser_qa.v1';
export const RUNTIME_MODULE_LOAD_RECEIPT_PACKAGE_REQUIRED_EVIDENCE_ID =
  'runtime.module_load_receipt.v1.evidence.capability_qa_report.v1';

export function createRuntimeModuleLoadReceiptPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: RUNTIME_MODULE_LOAD_RECEIPT_CAPABILITY_ID,
      packageVersion: RUNTIME_MODULE_LOAD_RECEIPT_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Runtime module load receipt capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: [RUNTIME_MODULE_LOAD_RECEIPT_RUNTIME_FAMILY],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'runtime.module_load_receipt.schema',
      ownedPaths: ['/runtime/moduleLoadReceipt', '/artifacts/runtime_module_load_receipt'],
      normalizerId: 'runtime.module_load_receipt.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'runtime.module_load_receipt.ir',
      ownedNodeKinds: ['runtime_system.runtime.module_load_receipt']
    },
    runtime: {
      families: [RUNTIME_MODULE_LOAD_RECEIPT_RUNTIME_FAMILY],
      systems: [
        {
          id: RUNTIME_MODULE_LOAD_RECEIPT_RUNTIME_SYSTEM_ID,
          version: RUNTIME_MODULE_LOAD_RECEIPT_SYSTEM_VERSION,
          phase: RUNTIME_MODULE_LOAD_RECEIPT_SYSTEM_PHASE,
          dependencies: ['runtime.manifest_binding']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'VerifyRuntimeModuleLoad:receipt_integrity', executionPolicy: 'regeneration_required' }],
      compilerId: 'runtime.module_load_receipt.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'runtime.module_load_receipt.patch.receipt_integrity',
          policy: 'regeneration_required',
          ownedPaths: ['/runtime/moduleLoadReceipt', '/artifacts/runtime_module_load_receipt']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID,
          capabilityId: RUNTIME_MODULE_LOAD_RECEIPT_CAPABILITY_ID,
          prerequisites: [
            'runtime manifest binding is verified',
            'module load receipt artifact is available',
            'loader plan and capability lock hashes are available'
          ],
          actions: [
            {
              id: `${RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID}.action.verify_receipt`,
              kind: 'runtime_event',
              target: RUNTIME_MODULE_LOAD_RECEIPT_EVENT_TYPE,
              parameters: {
                artifactKind: RUNTIME_MODULE_LOAD_RECEIPT_KIND,
                schemaVersion: RUNTIME_MODULE_LOAD_RECEIPT_SCHEMA_VERSION,
                profileId: RUNTIME_MODULE_LOAD_RECEIPT_PROFILE_ID,
                runtimeFamily: RUNTIME_MODULE_LOAD_RECEIPT_RUNTIME_FAMILY
              }
            }
          ],
          observations: [
            {
              id: `${RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID}.observation.receipt`,
              kind: 'state_probe',
              runtimeSystemId: RUNTIME_MODULE_LOAD_RECEIPT_RUNTIME_SYSTEM_ID,
              ref: RUNTIME_MODULE_LOAD_RECEIPT_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID}.assertion.receipt`,
              observationId: `${RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID}.observation.receipt`,
              comparator: 'exists',
              expected: {
                runtimeModuleLoadReceiptLoaded: true,
                runtimeModuleLoadReceiptKind: RUNTIME_MODULE_LOAD_RECEIPT_KIND,
                runtimeModuleLoadReceiptSchemaVersion: RUNTIME_MODULE_LOAD_RECEIPT_SCHEMA_VERSION,
                runtimeModuleLoadReceiptHashPresent: true,
                runtimeModuleLoadReceiptLoadOrderCount: RUNTIME_MODULE_LOAD_RECEIPT_MIN_LOAD_ORDER_COUNT,
                runtimeModuleLoadReceiptLifecycleEventCount: RUNTIME_MODULE_LOAD_RECEIPT_MIN_LIFECYCLE_EVENT_COUNT,
                runtimeModuleLoadReceiptIssuesCount: 0,
                runtimeModuleLoadReceiptCapabilityLockHashMatched: true,
                runtimeModuleLoadReceiptRuntimeManifestHashMatched: true,
                runtimeModuleLoadReceiptRuntimePlanHashMatched: true,
                runtimeModuleLoadReceiptLoaderPlanHashMatched: true,
                runtimeModuleLoadReceiptLifecycleComplete: true
              },
              message: 'runtime module load receipt verifies loaded modules, lifecycle coverage, artifact hash, and active plan bindings'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: RUNTIME_MODULE_LOAD_RECEIPT_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    dependencies: [{ capabilityId: 'runtime.manifest_binding.v1', range: '^v1' }],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'runtime.module_load_receipt.service', version: 'v1' }],
    defaults: {
      event: RUNTIME_MODULE_LOAD_RECEIPT_EVENT_TYPE,
      artifactKind: RUNTIME_MODULE_LOAD_RECEIPT_KIND,
      schemaVersion: RUNTIME_MODULE_LOAD_RECEIPT_SCHEMA_VERSION,
      requiredStateFields: [
        'runtimeModuleLoadReceiptLoaded',
        'runtimeModuleLoadReceiptKind',
        'runtimeModuleLoadReceiptSchemaVersion',
        'runtimeModuleLoadReceiptHashPresent',
        'runtimeModuleLoadReceiptLoadOrderCount',
        'runtimeModuleLoadReceiptLifecycleEventCount',
        'runtimeModuleLoadReceiptIssuesCount',
        'runtimeModuleLoadReceiptCapabilityLockHashMatched',
        'runtimeModuleLoadReceiptRuntimeManifestHashMatched',
        'runtimeModuleLoadReceiptRuntimePlanHashMatched',
        'runtimeModuleLoadReceiptLoaderPlanHashMatched',
        'runtimeModuleLoadReceiptLifecycleComplete'
      ]
    },
    diagnostics: {
      source: 'stage37.runtime_module_load_receipt_package_slice'
    }
  };
}
