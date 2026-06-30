import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  SCENE_ORDERED_SEGMENTS_CAPABILITY_ID,
  SCENE_ORDERED_SEGMENTS_COUNT,
  SCENE_ORDERED_SEGMENTS_EVENT_TYPE,
  SCENE_ORDERED_SEGMENTS_FIRST_ID,
  SCENE_ORDERED_SEGMENTS_PROFILE_ID,
  SCENE_ORDERED_SEGMENTS_RUNTIME_FAMILY,
  SCENE_ORDERED_SEGMENTS_RUNTIME_SYSTEM_ID,
  SCENE_ORDERED_SEGMENTS_SCENE_ID,
  SCENE_ORDERED_SEGMENTS_SCHEMA_VERSION,
  SCENE_ORDERED_SEGMENTS_SECOND_ID,
  SCENE_ORDERED_SEGMENTS_SYSTEM_PHASE,
  SCENE_ORDERED_SEGMENTS_SYSTEM_VERSION,
  SCENE_ORDERED_SEGMENTS_THIRD_ID
} from './scene-ordered-segments-runtime-module.js';

export const SCENE_ORDERED_SEGMENTS_PACKAGE_VERSION = '1.0.0';
export const SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID =
  'scene.ordered_segments.v1.verify_ordered_segments.browser_qa.v1';
export const SCENE_ORDERED_SEGMENTS_PACKAGE_REQUIRED_EVIDENCE_ID =
  'scene.ordered_segments.v1.evidence.capability_qa_report.v1';

export function createSceneOrderedSegmentsPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: SCENE_ORDERED_SEGMENTS_CAPABILITY_ID,
      packageVersion: SCENE_ORDERED_SEGMENTS_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Scene ordered segments capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: [SCENE_ORDERED_SEGMENTS_RUNTIME_FAMILY],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'scene.ordered_segments.schema',
      ownedPaths: ['/progression/segments', '/scenes/*/segment_ids'],
      normalizerId: 'scene.ordered_segments.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'scene.ordered_segments.ir',
      ownedNodeKinds: ['runtime_system.scene.ordered_segments']
    },
    runtime: {
      families: [SCENE_ORDERED_SEGMENTS_RUNTIME_FAMILY],
      systems: [
        {
          id: SCENE_ORDERED_SEGMENTS_RUNTIME_SYSTEM_ID,
          version: SCENE_ORDERED_SEGMENTS_SYSTEM_VERSION,
          phase: SCENE_ORDERED_SEGMENTS_SYSTEM_PHASE,
          dependencies: ['runtime_manifest', 'runtime_plan']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'VerifyScene:ordered_segments', executionPolicy: 'regeneration_required' }],
      compilerId: 'scene.ordered_segments.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'scene.ordered_segments.patch.segment_order',
          policy: 'regeneration_required',
          ownedPaths: ['/progression/segments', '/scenes/*/segment_ids']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID,
          capabilityId: SCENE_ORDERED_SEGMENTS_CAPABILITY_ID,
          prerequisites: [
            'canonical progression segments are available',
            'runtime scene segment bindings are loaded',
            'runtime tracker can observe continuous ordered segment traversal'
          ],
          actions: [
            {
              id: `${SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID}.action.verify_order`,
              kind: 'runtime_event',
              target: SCENE_ORDERED_SEGMENTS_EVENT_TYPE,
              parameters: {
                schemaVersion: SCENE_ORDERED_SEGMENTS_SCHEMA_VERSION,
                profileId: SCENE_ORDERED_SEGMENTS_PROFILE_ID,
                runtimeFamily: SCENE_ORDERED_SEGMENTS_RUNTIME_FAMILY,
                sceneId: SCENE_ORDERED_SEGMENTS_SCENE_ID,
                segmentCount: SCENE_ORDERED_SEGMENTS_COUNT,
                segmentIds: [
                  SCENE_ORDERED_SEGMENTS_FIRST_ID,
                  SCENE_ORDERED_SEGMENTS_SECOND_ID,
                  SCENE_ORDERED_SEGMENTS_THIRD_ID
                ]
              }
            }
          ],
          observations: [
            {
              id: `${SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID}.observation.ordered_segments`,
              kind: 'state_probe',
              runtimeSystemId: SCENE_ORDERED_SEGMENTS_RUNTIME_SYSTEM_ID,
              ref: SCENE_ORDERED_SEGMENTS_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID}.assertion.ordered_segments`,
              observationId: `${SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID}.observation.ordered_segments`,
              comparator: 'exists',
              expected: {
                sceneOrderedSegmentsVerified: true,
                sceneOrderedSegmentsSchemaVersion: SCENE_ORDERED_SEGMENTS_SCHEMA_VERSION,
                sceneOrderedSegmentsProfileId: SCENE_ORDERED_SEGMENTS_PROFILE_ID,
                sceneOrderedSegmentsRuntimeFamily: SCENE_ORDERED_SEGMENTS_RUNTIME_FAMILY,
                sceneOrderedSegmentsSceneId: SCENE_ORDERED_SEGMENTS_SCENE_ID,
                sceneOrderedSegmentsCount: SCENE_ORDERED_SEGMENTS_COUNT,
                sceneOrderedSegmentsFirstId: SCENE_ORDERED_SEGMENTS_FIRST_ID,
                sceneOrderedSegmentsSecondId: SCENE_ORDERED_SEGMENTS_SECOND_ID,
                sceneOrderedSegmentsThirdId: SCENE_ORDERED_SEGMENTS_THIRD_ID,
                sceneOrderedSegmentsOrderMatched: true,
                sceneOrderedSegmentsContinuous: true,
                sceneOrderedSegmentsAllNamed: true,
                sceneOrderedSegmentsSceneBindingMatched: true,
                sceneOrderedSegmentsNoGaps: true
              },
              message: 'scene ordered segments evidence verifies the three named segments are continuous and bound in canonical order'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: SCENE_ORDERED_SEGMENTS_PACKAGE_REQUIRED_EVIDENCE_ID,
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
    provides: [{ id: 'scene.ordered_segments.service', version: 'v1' }],
    defaults: {
      event: SCENE_ORDERED_SEGMENTS_EVENT_TYPE,
      schemaVersion: SCENE_ORDERED_SEGMENTS_SCHEMA_VERSION,
      profileId: SCENE_ORDERED_SEGMENTS_PROFILE_ID,
      runtimeFamily: SCENE_ORDERED_SEGMENTS_RUNTIME_FAMILY,
      sceneId: SCENE_ORDERED_SEGMENTS_SCENE_ID,
      segmentIds: [
        SCENE_ORDERED_SEGMENTS_FIRST_ID,
        SCENE_ORDERED_SEGMENTS_SECOND_ID,
        SCENE_ORDERED_SEGMENTS_THIRD_ID
      ],
      requiredStateFields: [
        'sceneOrderedSegmentsVerified',
        'sceneOrderedSegmentsSchemaVersion',
        'sceneOrderedSegmentsProfileId',
        'sceneOrderedSegmentsRuntimeFamily',
        'sceneOrderedSegmentsSceneId',
        'sceneOrderedSegmentsCount',
        'sceneOrderedSegmentsFirstId',
        'sceneOrderedSegmentsSecondId',
        'sceneOrderedSegmentsThirdId',
        'sceneOrderedSegmentsOrderMatched',
        'sceneOrderedSegmentsContinuous',
        'sceneOrderedSegmentsAllNamed',
        'sceneOrderedSegmentsSceneBindingMatched',
        'sceneOrderedSegmentsNoGaps'
      ]
    },
    diagnostics: {
      source: 'stage37.scene_ordered_segments_package_slice'
    }
  };
}
