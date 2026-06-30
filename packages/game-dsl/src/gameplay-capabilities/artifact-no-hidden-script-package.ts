import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  ARTIFACT_NO_HIDDEN_SCRIPT_CAPABILITY_ID,
  ARTIFACT_NO_HIDDEN_SCRIPT_EVENT_TYPE,
  ARTIFACT_NO_HIDDEN_SCRIPT_RUNTIME_SYSTEM_ID
} from './artifact-no-hidden-script-runtime-module.js';

export const ARTIFACT_NO_HIDDEN_SCRIPT_PACKAGE_VERSION = '1.0.0';
export const ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID = 'artifact.no_hidden_script.v1.no_hidden_script.browser_qa.v1';
export const ARTIFACT_NO_HIDDEN_SCRIPT_PACKAGE_REQUIRED_EVIDENCE_ID = 'artifact.no_hidden_script.v1.evidence.capability_qa_report.v1';

export function createArtifactNoHiddenScriptPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: ARTIFACT_NO_HIDDEN_SCRIPT_CAPABILITY_ID,
      packageVersion: ARTIFACT_NO_HIDDEN_SCRIPT_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Artifact no-hidden-script capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'artifact.no_hidden_script.schema',
      ownedPaths: ['/artifacts/no_hidden_script'],
      normalizerId: 'artifact.no_hidden_script.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'artifact.no_hidden_script.ir',
      ownedNodeKinds: ['runtime_system.artifact.no_hidden_script']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: ARTIFACT_NO_HIDDEN_SCRIPT_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'telemetry', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'VerifyArtifactManifest:no_hidden_script', executionPolicy: 'regeneration_required' }],
      compilerId: 'artifact.no_hidden_script.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'artifact.no_hidden_script.patch.manifest_policy',
          policy: 'regeneration_required',
          ownedPaths: ['/artifacts/no_hidden_script']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID,
          capabilityId: ARTIFACT_NO_HIDDEN_SCRIPT_CAPABILITY_ID,
          prerequisites: [
            'runtime manifest is available',
            'module load receipt is available',
            'hidden script policy is forbidden'
          ],
          actions: [
            {
              id: `${ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID}.action.verify_no_hidden_script`,
              kind: 'runtime_event',
              target: ARTIFACT_NO_HIDDEN_SCRIPT_EVENT_TYPE,
              parameters: {
                source: 'runtime_manifest_module_load_receipt',
                hiddenScriptPolicy: 'forbidden'
              }
            }
          ],
          observations: [
            {
              id: `${ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID}.observation.no_hidden_script`,
              kind: 'runtime_event',
              runtimeSystemId: ARTIFACT_NO_HIDDEN_SCRIPT_RUNTIME_SYSTEM_ID,
              ref: ARTIFACT_NO_HIDDEN_SCRIPT_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID}.assertion.no_hidden_script`,
              observationId: `${ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID}.observation.no_hidden_script`,
              comparator: 'exists',
              expected: {
                declaredModulesOnly: true,
                hiddenScriptDetected: false,
                moduleLoadManifestVerified: true
              },
              message: 'artifact manifest package observes declared runtime modules with no hidden script'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: ARTIFACT_NO_HIDDEN_SCRIPT_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'artifact.no_hidden_script.service', version: 'v1' }],
    defaults: {
      manifestEvent: ARTIFACT_NO_HIDDEN_SCRIPT_EVENT_TYPE,
      hiddenScriptPolicy: 'forbidden',
      requiredStateFields: ['declaredModulesOnly', 'hiddenScriptDetected', 'moduleLoadManifestVerified']
    },
    diagnostics: {
      source: 'stage37.artifact_no_hidden_script_package_slice'
    }
  };
}
