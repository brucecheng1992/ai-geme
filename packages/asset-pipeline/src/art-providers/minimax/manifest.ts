import type { ArtAssetType, ArtProviderManifest, AspectRatio } from '../types.js';

export const MINIMAX_PROVIDER_ID = 'minimax' as const;
export const MINIMAX_DISPLAY_NAME = 'MiniMax' as const;
export const MINIMAX_DEFAULT_BASE_URL = 'https://api.minimax.io' as const;
export const MINIMAX_DEFAULT_IMAGE_MODEL = 'image-01' as const;
export const MINIMAX_MAX_PROMPT_LENGTH = 1500 as const;
export const MINIMAX_MAX_OUTPUT_COUNT = 9 as const;

export const MINIMAX_SUPPORTED_ASSET_TYPES: ArtAssetType[] = [
  'character_concept',
  'enemy_concept',
  'scene_background',
  'skill_icon',
  'skill_vfx_concept',
  'ui_concept'
];

export const MINIMAX_SUPPORTED_ASPECT_RATIOS: AspectRatio[] = ['1:1', '16:9', '4:3', '3:2', '2:3', '3:4', '9:16', '21:9'];

export function createMiniMaxManifest(modelId: string = MINIMAX_DEFAULT_IMAGE_MODEL): ArtProviderManifest {
  return {
    providerId: MINIMAX_PROVIDER_ID,
    displayName: MINIMAX_DISPLAY_NAME,
    capabilities: {
      textToImage: true,
      imageToImage: true,
      maskedImageEdit: false,
      styleReference: false,
      subjectReference: true,
      batchGeneration: true,
      seedControl: true,
      asyncJob: false
    },
    supportedAssetTypes: MINIMAX_SUPPORTED_ASSET_TYPES,
    supportedAspectRatios: MINIMAX_SUPPORTED_ASPECT_RATIOS,
    limits: {
      maxPromptLength: MINIMAX_MAX_PROMPT_LENGTH,
      maxOutputCount: MINIMAX_MAX_OUTPUT_COUNT
    },
    models: [
      {
        modelId,
        capabilities: ['image.generate', 'image.image_to_image']
      }
    ]
  };
}
