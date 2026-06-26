import {
  GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION,
  type GameplayCapabilityPackageContract
} from './package-contract.js';
import {
  SCENE_VISUAL_PRESENTATION_METADATA_CAPABILITY_ID,
  SCENE_VISUAL_PRESENTATION_METADATA_COLOR_DEPTH_BITS,
  SCENE_VISUAL_PRESENTATION_METADATA_EVENT_TYPE,
  SCENE_VISUAL_PRESENTATION_METADATA_ORIGINALITY_POLICY,
  SCENE_VISUAL_PRESENTATION_METADATA_PROFILE_ID,
  SCENE_VISUAL_PRESENTATION_METADATA_RUNTIME_FAMILY,
  SCENE_VISUAL_PRESENTATION_METADATA_RUNTIME_SYSTEM_ID,
  SCENE_VISUAL_PRESENTATION_METADATA_SCHEMA_VERSION,
  SCENE_VISUAL_PRESENTATION_METADATA_STYLE_ID,
  SCENE_VISUAL_PRESENTATION_METADATA_STYLE_LABEL
} from './scene-visual-presentation-metadata-runtime-module.js';

export const SCENE_VISUAL_PRESENTATION_METADATA_PACKAGE_VERSION = '1.0.0';
export const SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID =
  'scene.visual_presentation_metadata.v1.verify_visual_metadata.browser_qa.v1';
export const SCENE_VISUAL_PRESENTATION_METADATA_PACKAGE_REQUIRED_EVIDENCE_ID =
  'scene.visual_presentation_metadata.v1.evidence.capability_qa_report.v1';

export function createSceneVisualPresentationMetadataPackageContract(): GameplayCapabilityPackageContract {
  return {
    manifest: {
      id: SCENE_VISUAL_PRESENTATION_METADATA_CAPABILITY_ID,
      packageVersion: SCENE_VISUAL_PRESENTATION_METADATA_PACKAGE_VERSION,
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Scene visual presentation metadata capability package.',
      owners: ['gameplay-platform'],
      runtimeFamilies: [SCENE_VISUAL_PRESENTATION_METADATA_RUNTIME_FAMILY],
      contractVersion: GAMEPLAY_CAPABILITY_PACKAGE_CONTRACT_VERSION
    },
    dsl: {
      schemaFragmentId: 'scene.visual_presentation_metadata.schema',
      ownedPaths: ['/world/visual_theme'],
      normalizerId: 'scene.visual_presentation_metadata.normalizer',
      migrations: []
    },
    ir: {
      compilerId: 'scene.visual_presentation_metadata.ir',
      ownedNodeKinds: ['runtime_system.scene.visual_presentation_metadata']
    },
    runtime: {
      families: [SCENE_VISUAL_PRESENTATION_METADATA_RUNTIME_FAMILY],
      systems: [
        {
          id: SCENE_VISUAL_PRESENTATION_METADATA_RUNTIME_SYSTEM_ID,
          version: 'v1',
          phase: 'bootstrap',
          dependencies: ['asset_plan', 'template_params']
        }
      ]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetSceneVisualMetadata:sixteen_bit_pixel_style', executionPolicy: 'regeneration_required' }],
      compilerId: 'scene.visual_presentation_metadata.amendments'
    },
    patch: {
      descriptors: [
        {
          id: 'scene.visual_presentation_metadata.patch.visual_theme_binding',
          policy: 'regeneration_required',
          ownedPaths: ['/world/visual_theme']
        }
      ]
    },
    qa: {
      probes: [
        {
          id: SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID,
          capabilityId: SCENE_VISUAL_PRESENTATION_METADATA_CAPABILITY_ID,
          prerequisites: [
            'canonical DSL world visual theme is available',
            'template params and asset plan consume the visual theme',
            'visual metadata declares 16-bit pixel style without protected reuse'
          ],
          actions: [
            {
              id: `${SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID}.action.verify_visual_metadata`,
              kind: 'runtime_event',
              target: SCENE_VISUAL_PRESENTATION_METADATA_EVENT_TYPE,
              parameters: {
                schemaVersion: SCENE_VISUAL_PRESENTATION_METADATA_SCHEMA_VERSION,
                profileId: SCENE_VISUAL_PRESENTATION_METADATA_PROFILE_ID,
                runtimeFamily: SCENE_VISUAL_PRESENTATION_METADATA_RUNTIME_FAMILY,
                styleId: SCENE_VISUAL_PRESENTATION_METADATA_STYLE_ID,
                styleLabel: SCENE_VISUAL_PRESENTATION_METADATA_STYLE_LABEL,
                colorDepthBits: SCENE_VISUAL_PRESENTATION_METADATA_COLOR_DEPTH_BITS,
                originalityPolicy: SCENE_VISUAL_PRESENTATION_METADATA_ORIGINALITY_POLICY
              }
            }
          ],
          observations: [
            {
              id: `${SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID}.observation.visual_metadata`,
              kind: 'state_probe',
              runtimeSystemId: SCENE_VISUAL_PRESENTATION_METADATA_RUNTIME_SYSTEM_ID,
              ref: SCENE_VISUAL_PRESENTATION_METADATA_EVENT_TYPE
            }
          ],
          assertions: [
            {
              id: `${SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID}.assertion.visual_metadata`,
              observationId: `${SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID}.observation.visual_metadata`,
              comparator: 'exists',
              expected: {
                sceneVisualPresentationMetadataVerified: true,
                sceneVisualPresentationSchemaVersion: SCENE_VISUAL_PRESENTATION_METADATA_SCHEMA_VERSION,
                sceneVisualPresentationProfileId: SCENE_VISUAL_PRESENTATION_METADATA_PROFILE_ID,
                sceneVisualPresentationRuntimeFamily: SCENE_VISUAL_PRESENTATION_METADATA_RUNTIME_FAMILY,
                sceneVisualPresentationStyleId: SCENE_VISUAL_PRESENTATION_METADATA_STYLE_ID,
                sceneVisualPresentationStyleLabel: SCENE_VISUAL_PRESENTATION_METADATA_STYLE_LABEL,
                sceneVisualPresentationPixelArt: true,
                sceneVisualPresentationColorDepthBits: SCENE_VISUAL_PRESENTATION_METADATA_COLOR_DEPTH_BITS,
                sceneVisualPresentationOriginalityPolicy: SCENE_VISUAL_PRESENTATION_METADATA_ORIGINALITY_POLICY,
                sceneVisualPresentationAssetPlanBound: true,
                sceneVisualPresentationNoProtectedReuse: true
              },
              message: 'visual presentation metadata must prove 16-bit pixel style binding and no protected reuse'
            }
          ],
          severity: 'required'
        }
      ],
      requiredEvidence: [
        {
          id: SCENE_VISUAL_PRESENTATION_METADATA_PACKAGE_REQUIRED_EVIDENCE_ID,
          artifactKind: 'capability_qa_report',
          required: true
        }
      ]
    },
    render: {
      assetRoles: [
        { role: 'background', required: false },
        { role: 'player_sprite', required: false },
        { role: 'enemy_sprite', required: false },
        { role: 'hud', required: false }
      ],
      sceneBindings: [
        { id: 'scene.visual_presentation_metadata.binding.world_visual_theme', nodeKind: 'world.visual_theme' },
        { id: 'scene.visual_presentation_metadata.binding.asset_plan_style', nodeKind: 'asset_plan.style' },
        { id: 'scene.visual_presentation_metadata.binding.template_params_visual_theme', nodeKind: 'template_params.style.visual_theme' }
      ],
      fallbackPolicy: 'not_applicable'
    },
    dependencies: [],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: 'scene.visual_presentation_metadata.service', version: 'v1' }],
    defaults: {
      schemaVersion: SCENE_VISUAL_PRESENTATION_METADATA_SCHEMA_VERSION,
      profileId: SCENE_VISUAL_PRESENTATION_METADATA_PROFILE_ID,
      runtimeFamily: SCENE_VISUAL_PRESENTATION_METADATA_RUNTIME_FAMILY,
      styleId: SCENE_VISUAL_PRESENTATION_METADATA_STYLE_ID,
      styleLabel: SCENE_VISUAL_PRESENTATION_METADATA_STYLE_LABEL,
      colorDepthBits: SCENE_VISUAL_PRESENTATION_METADATA_COLOR_DEPTH_BITS,
      originalityPolicy: SCENE_VISUAL_PRESENTATION_METADATA_ORIGINALITY_POLICY,
      requiredStateFields: [
        'sceneVisualPresentationMetadataVerified',
        'sceneVisualPresentationSchemaVersion',
        'sceneVisualPresentationProfileId',
        'sceneVisualPresentationRuntimeFamily',
        'sceneVisualPresentationStyleId',
        'sceneVisualPresentationStyleLabel',
        'sceneVisualPresentationPixelArt',
        'sceneVisualPresentationColorDepthBits',
        'sceneVisualPresentationOriginalityPolicy',
        'sceneVisualPresentationAssetPlanBound',
        'sceneVisualPresentationNoProtectedReuse'
      ]
    },
    diagnostics: {
      source: 'stage37.scene_visual_presentation_metadata_package_slice'
    }
  };
}
