import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  ARTIFACT_LINEAGE_NO_MANUAL_PATCH_CAPABILITY_ID,
  ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
  ARTIFACT_LINEAGE_NO_MANUAL_PATCH_RUNTIME_SYSTEM_ID
} from './artifact-lineage-no-manual-patch-runtime-module.js';

export const ARTIFACT_LINEAGE_NO_MANUAL_PATCH_PACKAGE_VERSION = '1.0.0';
export const ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID = 'artifact.lineage_no_manual_patch.v1.no_manual_patch.browser_qa.v1';
export const ARTIFACT_LINEAGE_NO_MANUAL_PATCH_PACKAGE_REQUIRED_EVIDENCE_ID =
  'artifact.lineage_no_manual_patch.v1.evidence.capability_qa_report.v1';

export function createArtifactLineageNoManualPatchPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: ARTIFACT_LINEAGE_NO_MANUAL_PATCH_CAPABILITY_ID,
      packageVersion: ARTIFACT_LINEAGE_NO_MANUAL_PATCH_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Artifact lineage no-manual-patch capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'artifact.lineage_no_manual_patch.schema',
      ownedPaths: ['/artifacts/lineage_no_manual_patch'],
      normalizerId: 'artifact.lineage_no_manual_patch.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'artifact.lineage_no_manual_patch.ir',
      ownedNodeKinds: ['runtime_system.artifact.lineage_no_manual_patch']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: ARTIFACT_LINEAGE_NO_MANUAL_PATCH_RUNTIME_SYSTEM_ID, version: 'v1', phase: 'telemetry', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'VerifyArtifactLineage:no_manual_patch', executionPolicy: 'regeneration_required' }],
      compilerId: 'artifact.lineage_no_manual_patch.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'artifact.lineage_no_manual_patch.patch.lineage_policy',
          policy: 'regeneration_required',
          ownedPaths: ['/artifacts/lineage_no_manual_patch']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID,
          capabilityId: ARTIFACT_LINEAGE_NO_MANUAL_PATCH_CAPABILITY_ID,
          prerequisites: ['source artifact manifest is available', 'generated artifact manifest is available', 'manual patch policy is forbidden'],
          actions: [
            {
              id: `${ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID}.action.verify_lineage`,
              kind: 'runtime_event',
              target: ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
              parameters: {
                source: 'pipeline_artifact_lineage',
                manualPatchPolicy: 'forbidden'
              }
            }
          ],
          observations: [
            {
              id: `${ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID}.observation.no_manual_patch`,
              kind: 'runtime_event',
              runtimeSystemId: ARTIFACT_LINEAGE_NO_MANUAL_PATCH_RUNTIME_SYSTEM_ID,
              ref: ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID}.assertion.no_manual_patch`,
              observationId: `${ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID}.observation.no_manual_patch`,
              comparator: 'exists',
              expected: {
                pipelineProduced: true,
                manualPatchDetected: false,
                lineageVerified: true
              },
              message: 'artifact lineage package observes pipeline-produced output with no manual patch'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: ARTIFACT_LINEAGE_NO_MANUAL_PATCH_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'artifact.lineage_no_manual_patch.service', version: 'v1' }],
    defaults: {
      lineageEvent: ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
      manualPatchPolicy: 'forbidden',
      requiredStateFields: ['pipelineProduced', 'manualPatchDetected', 'lineageVerified']
    },
    diagnostics: {
      source: 'stage37.artifact_lineage_no_manual_patch_package_slice'
    }
  };
}
