import type {
  ArtAssetType,
  ArtCapability,
  ArtProviderAdapter,
  AspectRatio,
  ImageResponseFormat,
  NormalizedProviderError,
  ProviderProfile
} from '../art-providers/index.js';

export type ArtTaskStatus = 'planned' | 'generating' | 'generated' | 'failed' | 'selected' | 'approved' | 'needs_revision';

export type GeneratedAssetStatus = 'generated' | 'selected' | 'approved' | 'rejected' | 'needs_revision';

export type ProviderCallStatus = 'running' | 'succeeded' | 'failed';

export type ReviewDecisionType = 'selected' | 'approved' | 'rejected' | 'needs_revision';

export type ArtTaskOutputSpec = {
  aspectRatio?: AspectRatio;
  count?: number;
  responseFormat?: ImageResponseFormat;
};

export type ArtTaskProviderSelection = {
  providerProfileId?: string;
  providerId?: string;
  modelId?: string;
};

export type ArtTask = {
  taskId: string;
  projectId: string;
  type: ArtAssetType;
  requiredCapability: ArtCapability;
  prompt: string;
  negativePrompt?: string;
  styleProfileId?: string;
  outputSpec: ArtTaskOutputSpec;
  providerSelection?: ArtTaskProviderSelection;
  status: ArtTaskStatus;
};

export type GeneratedAsset = {
  assetId: string;
  taskId: string;
  providerId: string;
  modelId: string;
  storagePath?: string;
  localPath?: string;
  temporaryUrl?: string;
  mimeType: string;
  width?: number;
  height?: number;
  status: GeneratedAssetStatus;
  createdAt: string;
};

export type ProviderCallError = Omit<NormalizedProviderError, 'providerId' | 'operation' | 'raw'>;

export type ProviderCall = {
  callId: string;
  taskId: string;
  providerId: string;
  modelId: string;
  operation: ArtCapability;
  inputHash: string;
  status: ProviderCallStatus;
  outputAssetIds: string[];
  error?: ProviderCallError;
  latencyMs?: number;
  createdAt: string;
  finishedAt?: string;
};

export type ReviewDecision = {
  reviewId: string;
  taskId: string;
  assetId: string;
  decision: ReviewDecisionType;
  reason?: string;
  createdAt: string;
};

export interface ArtTaskRepository {
  create(task: ArtTask): ArtTask;
  get(taskId: string): ArtTask | undefined;
  update(task: ArtTask): ArtTask;
  updateStatus(taskId: string, status: ArtTaskStatus): ArtTask;
  list(): ArtTask[];
}

export interface GeneratedAssetRepository {
  create(asset: GeneratedAsset): GeneratedAsset;
  get(assetId: string): GeneratedAsset | undefined;
  update(asset: GeneratedAsset): GeneratedAsset;
  listByTaskId(taskId: string): GeneratedAsset[];
  list(): GeneratedAsset[];
}

export interface ProviderCallRepository {
  create(call: ProviderCall): ProviderCall;
  get(callId: string): ProviderCall | undefined;
  update(call: ProviderCall): ProviderCall;
  listByTaskId(taskId: string): ProviderCall[];
  list(): ProviderCall[];
}

export interface ReviewDecisionRepository {
  create(decision: ReviewDecision): ReviewDecision;
  listByTaskId(taskId: string): ReviewDecision[];
  list(): ReviewDecision[];
}

export type ArtTaskRepositories = {
  artTasks: ArtTaskRepository;
  generatedAssets: GeneratedAssetRepository;
  providerCalls: ProviderCallRepository;
  reviewDecisions: ReviewDecisionRepository;
};

export type ProviderResolution = {
  providerId: string;
  modelId: string;
  providerProfile?: ProviderProfile;
  adapter: ArtProviderAdapter;
};

export interface ProviderResolver {
  resolve(task: ArtTask): ProviderResolution;
}

export type StoredGeneratedImage = {
  localPath?: string;
  storagePath?: string;
  temporaryUrl?: string;
};

export interface GeneratedAssetStorage {
  store(input: {
    projectId: string;
    taskId: string;
    assetId: string;
    base64?: string;
    temporaryUrl?: string;
    mimeType?: string;
  }): Promise<StoredGeneratedImage>;
}

export type RunArtTaskResult = {
  task: ArtTask;
  providerCall: ProviderCall;
  assets: GeneratedAsset[];
};
