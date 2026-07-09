export type ArtCapability = 'image.generate' | 'image.image_to_image';

export type ArtAssetType =
  | 'character_concept'
  | 'enemy_concept'
  | 'scene_background'
  | 'skill_icon'
  | 'skill_vfx_concept'
  | 'ui_concept';

export type AspectRatio = '1:1' | '16:9' | '4:3' | '3:2' | '2:3' | '3:4' | '9:16' | '21:9';

export type ImageResponseFormat = 'url' | 'base64';

export type GenerateImageInput = {
  taskId: string;
  assetType: ArtAssetType;
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: AspectRatio;
  count?: number;
  seed?: number;
  responseFormat?: ImageResponseFormat;
  providerOptions?: Record<string, unknown>;
};

export type ImageToImageInput = GenerateImageInput & {
  referenceImages: Array<{
    type: 'character' | 'style' | 'object';
    imageUrl: string;
  }>;
};

export type GeneratedImage = {
  temporaryUrl?: string;
  base64?: string;
  mimeType?: string;
  width?: number;
  height?: number;
};

export type GeneratedImageResult = {
  providerId: string;
  modelId: string;
  traceId?: string;
  images: GeneratedImage[];
  raw: unknown;
};

export type NormalizedProviderError = {
  providerId: string;
  operation: ArtCapability;
  httpStatus?: number;
  code?: string | number;
  message: string;
  retryable: boolean;
  raw?: unknown;
};

export interface ArtProviderAdapter {
  readonly providerId: string;
  getManifest(): ArtProviderManifest;
  generateImage(input: GenerateImageInput): Promise<GeneratedImageResult>;
  imageToImage?(input: ImageToImageInput): Promise<GeneratedImageResult>;
  validateConfig?(): Promise<{ ok: boolean; error?: string }>;
}

export type ArtProviderManifest = {
  providerId: string;
  displayName: string;
  capabilities: {
    textToImage: boolean;
    imageToImage: boolean;
    maskedImageEdit: boolean;
    styleReference: boolean;
    subjectReference: boolean;
    batchGeneration: boolean;
    seedControl: boolean;
    asyncJob: boolean;
  };
  supportedAssetTypes: ArtAssetType[];
  supportedAspectRatios: AspectRatio[];
  limits: {
    maxPromptLength: number;
    maxOutputCount: number;
  };
  models: Array<{
    modelId: string;
    capabilities: ArtCapability[];
  }>;
};

export type ProviderProfile = {
  providerProfileId: string;
  providerId: string;
  auth: {
    mode: 'env' | 'bring_your_own_key' | 'system_managed';
    apiKeyRef?: string;
  };
  defaults?: {
    modelId?: string;
    imageCount?: number;
    aspectRatio?: AspectRatio;
    responseFormat?: ImageResponseFormat;
  };
  enabled: boolean;
};

export class ArtProviderAdapterError extends Error {
  readonly normalizedError: NormalizedProviderError;

  constructor(normalizedError: NormalizedProviderError) {
    super(normalizedError.message);
    this.name = 'ArtProviderAdapterError';
    this.normalizedError = normalizedError;
  }
}
