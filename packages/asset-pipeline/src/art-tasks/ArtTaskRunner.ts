import { createHash } from 'node:crypto';

import {
  ArtProviderAdapterError,
  type ArtCapability,
  type GeneratedImage,
  type GenerateImageInput,
  type NormalizedProviderError
} from '../art-providers/index.js';
import type {
  ArtTask,
  ArtTaskRepositories,
  GeneratedAsset,
  GeneratedAssetStorage,
  ProviderCall,
  ProviderCallError,
  ProviderResolution,
  ProviderResolver,
  ReviewDecision,
  ReviewDecisionType,
  RunArtTaskResult
} from './types.js';

export type ArtTaskRunnerOptions = {
  repositories: ArtTaskRepositories;
  providerResolver: ProviderResolver;
  storage: GeneratedAssetStorage;
  now?: () => Date;
};

export function createArtTaskRunner(options: ArtTaskRunnerOptions): ArtTaskRunner {
  return new ArtTaskRunner(options);
}

export class ArtTaskRunner {
  private readonly repositories: ArtTaskRepositories;
  private readonly providerResolver: ProviderResolver;
  private readonly storage: GeneratedAssetStorage;
  private readonly now: () => Date;

  constructor(options: ArtTaskRunnerOptions) {
    this.repositories = options.repositories;
    this.providerResolver = options.providerResolver;
    this.storage = options.storage;
    this.now = options.now ?? (() => new Date());
  }

  async runTask(taskId: string): Promise<RunArtTaskResult> {
    const task = this.requireTask(taskId);
    if (task.requiredCapability !== 'image.generate') {
      throw new Error(`ArtTask ${taskId} requires unsupported P0 capability: ${task.requiredCapability}.`);
    }

    const resolution = this.providerResolver.resolve(task);
    const generateInput = this.createGenerateImageInput(task, resolution);
    const inputHash = sha256Hex(stableStringify({
      operation: task.requiredCapability,
      providerId: resolution.providerId,
      modelId: resolution.modelId,
      input: generateInput
    }));

    // TODO: Use inputHash for duplicate provider-call suppression once durable cache semantics exist.
    const createdAt = this.timestamp();
    const providerCall = this.repositories.providerCalls.create({
      callId: `${task.taskId}-call-${this.repositories.providerCalls.listByTaskId(task.taskId).length + 1}`,
      taskId: task.taskId,
      providerId: resolution.providerId,
      modelId: resolution.modelId,
      operation: task.requiredCapability,
      inputHash,
      status: 'running',
      outputAssetIds: [],
      createdAt
    });
    this.repositories.artTasks.updateStatus(task.taskId, 'generating');
    const startedAtMs = Date.parse(createdAt);

    try {
      const providerResult = await resolution.adapter.generateImage(generateInput);
      const assets = await this.createGeneratedAssets(task, providerResult.images, {
        providerId: providerResult.providerId,
        modelId: providerResult.modelId
      });
      const finishedAt = this.timestamp();
      const succeededCall = this.repositories.providerCalls.update({
        ...providerCall,
        providerId: providerResult.providerId,
        modelId: providerResult.modelId,
        status: 'succeeded',
        outputAssetIds: assets.map((asset) => asset.assetId),
        latencyMs: Math.max(0, Date.parse(finishedAt) - startedAtMs),
        finishedAt
      });
      const updatedTask = this.repositories.artTasks.updateStatus(task.taskId, 'generated');
      return {
        task: updatedTask,
        providerCall: succeededCall,
        assets
      };
    } catch (error) {
      const finishedAt = this.timestamp();
      this.repositories.providerCalls.update({
        ...providerCall,
        status: 'failed',
        error: normalizeProviderCallError(error, resolution, task.requiredCapability),
        outputAssetIds: [],
        latencyMs: Math.max(0, Date.parse(finishedAt) - startedAtMs),
        finishedAt
      });
      this.repositories.artTasks.updateStatus(task.taskId, 'failed');
      throw error;
    }
  }

  selectAsset(taskId: string, assetId: string, reason?: string): ReviewDecision {
    return this.recordDecision(taskId, assetId, 'selected', 'selected', 'selected', reason);
  }

  approveAsset(taskId: string, assetId: string, reason?: string): ReviewDecision {
    return this.recordDecision(taskId, assetId, 'approved', 'approved', 'approved', reason);
  }

  rejectAsset(taskId: string, assetId: string, reason?: string): ReviewDecision {
    return this.recordDecision(taskId, assetId, 'rejected', 'rejected', 'needs_revision', reason);
  }

  private createGenerateImageInput(task: ArtTask, resolution: ProviderResolution): GenerateImageInput {
    return {
      taskId: task.taskId,
      assetType: task.type,
      prompt: task.prompt,
      ...(task.negativePrompt === undefined ? {} : { negativePrompt: task.negativePrompt }),
      aspectRatio: task.outputSpec.aspectRatio ?? resolution.providerProfile?.defaults?.aspectRatio,
      count: task.outputSpec.count ?? resolution.providerProfile?.defaults?.imageCount,
      responseFormat: task.outputSpec.responseFormat ?? resolution.providerProfile?.defaults?.responseFormat
    };
  }

  private async createGeneratedAssets(
    task: ArtTask,
    images: GeneratedImage[],
    provider: { providerId: string; modelId: string }
  ): Promise<GeneratedAsset[]> {
    const assets: GeneratedAsset[] = [];
    for (const [index, image] of images.entries()) {
      const assetId = `${task.taskId}-asset-${index + 1}`;
      const stored = await this.storage.store({
        projectId: task.projectId,
        taskId: task.taskId,
        assetId,
        base64: image.base64,
        temporaryUrl: image.temporaryUrl,
        mimeType: image.mimeType
      });
      assets.push(
        this.repositories.generatedAssets.create({
          assetId,
          taskId: task.taskId,
          providerId: provider.providerId,
          modelId: provider.modelId,
          ...stored,
          mimeType: image.mimeType ?? 'application/octet-stream',
          ...(image.width === undefined ? {} : { width: image.width }),
          ...(image.height === undefined ? {} : { height: image.height }),
          status: 'generated',
          createdAt: this.timestamp()
        })
      );
    }
    return assets;
  }

  private recordDecision(
    taskId: string,
    assetId: string,
    decision: ReviewDecisionType,
    assetStatus: GeneratedAsset['status'],
    taskStatus: ArtTask['status'],
    reason: string | undefined
  ): ReviewDecision {
    this.requireTask(taskId);
    const asset = this.repositories.generatedAssets.get(assetId);
    if (asset === undefined || asset.taskId !== taskId) {
      throw new Error(`GeneratedAsset ${assetId} was not found for ArtTask ${taskId}.`);
    }
    this.repositories.generatedAssets.update({
      ...asset,
      status: assetStatus
    });
    this.repositories.artTasks.updateStatus(taskId, taskStatus);
    return this.repositories.reviewDecisions.create({
      reviewId: `${taskId}-review-${this.repositories.reviewDecisions.listByTaskId(taskId).length + 1}`,
      taskId,
      assetId,
      decision,
      ...(reason === undefined ? {} : { reason }),
      createdAt: this.timestamp()
    });
  }

  private requireTask(taskId: string): ArtTask {
    const task = this.repositories.artTasks.get(taskId);
    if (task === undefined) {
      throw new Error(`ArtTask not found: ${taskId}.`);
    }
    return task;
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}

function normalizeProviderCallError(error: unknown, resolution: ProviderResolution, operation: ArtCapability): ProviderCallError {
  if (error instanceof ArtProviderAdapterError) {
    return sanitizeNormalizedError(error.normalizedError);
  }
  return {
    code: 'ART_TASK_PROVIDER_CALL_FAILED',
    message: `Art provider ${resolution.providerId} ${operation} call failed.`,
    retryable: false
  };
}

function sanitizeNormalizedError(error: NormalizedProviderError): ProviderCallError {
  return {
    ...(error.httpStatus === undefined ? {} : { httpStatus: error.httpStatus }),
    ...(error.code === undefined ? {} : { code: error.code }),
    message: error.message,
    retryable: error.retryable
  };
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, sortValue(entryValue)])
    );
  }
  return value;
}
