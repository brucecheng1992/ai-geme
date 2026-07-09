import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import {
  ArtProviderAdapterError,
  createArtTaskRunner,
  createInMemoryArtTaskRepositories,
  createStaticProviderResolver,
  createLocalGeneratedAssetStorage,
  type ArtProviderAdapter,
  type GenerateImageInput,
  type GeneratedImageResult
} from '../../packages/asset-pipeline/src/index.js';

describe('provider-agnostic ArtTask flow', () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
    tempRoots.length = 0;
  });

  it('creates a skill_icon ArtTask and runs image generation through an ArtProviderAdapter', async () => {
    const storageRoot = await createTempRoot(tempRoots);
    const repositories = createInMemoryArtTaskRepositories();
    const provider = createMockArtProviderAdapter({
      providerId: 'minimax',
      modelId: 'image-01',
      base64: Buffer.from('fake image bytes').toString('base64')
    });
    const runner = createArtTaskRunner({
      repositories,
      providerResolver: createStaticProviderResolver({
        providers: [provider],
        defaultProfile: {
          providerProfileId: 'minimax-test-profile',
          providerId: 'minimax',
          auth: { mode: 'env', apiKeyRef: 'MINIMAX_API_KEY' },
          enabled: true,
          defaults: {
            modelId: 'image-01',
            imageCount: 1,
            aspectRatio: '1:1',
            responseFormat: 'base64'
          }
        }
      }),
      storage: createLocalGeneratedAssetStorage({ rootDir: storageRoot })
    });

    const task = repositories.artTasks.create({
      taskId: 'task-skill-icon',
      projectId: 'project-001',
      type: 'skill_icon',
      requiredCapability: 'image.generate',
      prompt: 'glowing sword slash skill icon',
      negativePrompt: 'photorealistic',
      outputSpec: {
        aspectRatio: '1:1',
        count: 1,
        responseFormat: 'base64'
      },
      status: 'planned'
    });

    expect(task.status).toBe('planned');

    const result = await runner.runTask('task-skill-icon');

    expect(provider.generateImageInputs).toEqual<GenerateImageInput[]>([
      {
        taskId: 'task-skill-icon',
        assetType: 'skill_icon',
        prompt: 'glowing sword slash skill icon',
        negativePrompt: 'photorealistic',
        aspectRatio: '1:1',
        count: 1,
        responseFormat: 'base64'
      }
    ]);

    const calls = repositories.providerCalls.listByTaskId('task-skill-icon');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      taskId: 'task-skill-icon',
      providerId: 'minimax',
      modelId: 'image-01',
      operation: 'image.generate',
      status: 'succeeded',
      outputAssetIds: ['task-skill-icon-asset-1']
    });
    expect(calls[0]?.inputHash).toMatch(/^[a-f0-9]{64}$/);
    expect(calls[0]?.latencyMs).toEqual(expect.any(Number));
    expect(calls[0]?.finishedAt).toEqual(expect.any(String));

    expect(result.providerCall.callId).toBe(calls[0]?.callId);
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]).toMatchObject({
      assetId: 'task-skill-icon-asset-1',
      taskId: 'task-skill-icon',
      providerId: 'minimax',
      modelId: 'image-01',
      mimeType: 'image/jpeg',
      status: 'generated'
    });

    const savedAsset = result.assets[0];
    expect(savedAsset?.localPath).toContain(join('artifacts', 'generated-assets'));
    await expect(readFile(savedAsset?.localPath ?? '', 'utf8')).resolves.toBe('fake image bytes');
    expect(repositories.generatedAssets.listByTaskId('task-skill-icon')).toEqual(result.assets);
    expect(repositories.artTasks.get('task-skill-icon')?.status).toBe('generated');
  });

  it('records selected and approved ReviewDecision states for a generated asset', async () => {
    const storageRoot = await createTempRoot(tempRoots);
    const repositories = createInMemoryArtTaskRepositories();
    const runner = createArtTaskRunner({
      repositories,
      providerResolver: createStaticProviderResolver({
        providers: [
          createMockArtProviderAdapter({
            providerId: 'minimax',
            modelId: 'image-01',
            base64: Buffer.from('approved image').toString('base64')
          })
        ],
        defaultProviderId: 'minimax'
      }),
      storage: createLocalGeneratedAssetStorage({ rootDir: storageRoot })
    });
    repositories.artTasks.create(createSkillIconTask('task-review'));
    await runner.runTask('task-review');

    const selected = runner.selectAsset('task-review', 'task-review-asset-1', 'best silhouette');
    const approved = runner.approveAsset('task-review', 'task-review-asset-1', 'ready for runtime');

    expect(selected).toMatchObject({
      taskId: 'task-review',
      assetId: 'task-review-asset-1',
      decision: 'selected',
      reason: 'best silhouette'
    });
    expect(approved).toMatchObject({
      taskId: 'task-review',
      assetId: 'task-review-asset-1',
      decision: 'approved',
      reason: 'ready for runtime'
    });
    expect(repositories.reviewDecisions.listByTaskId('task-review').map((decision) => decision.decision)).toEqual(['selected', 'approved']);
    expect(repositories.generatedAssets.get('task-review-asset-1')?.status).toBe('approved');
    expect(repositories.artTasks.get('task-review')?.status).toBe('approved');
  });

  it('records rejected ReviewDecision states without approving the asset', async () => {
    const repositories = createInMemoryArtTaskRepositories();
    const runner = createArtTaskRunner({
      repositories,
      providerResolver: createStaticProviderResolver({
        providers: [createMockArtProviderAdapter({ providerId: 'minimax', modelId: 'image-01', base64: 'ZmFrZQ==' })],
        defaultProviderId: 'minimax'
      }),
      storage: createLocalGeneratedAssetStorage({ rootDir: await createTempRoot(tempRoots) })
    });
    repositories.artTasks.create(createSkillIconTask('task-reject'));
    await runner.runTask('task-reject');

    const decision = runner.rejectAsset('task-reject', 'task-reject-asset-1', 'too noisy');

    expect(decision).toMatchObject({
      taskId: 'task-reject',
      assetId: 'task-reject-asset-1',
      decision: 'rejected',
      reason: 'too noisy'
    });
    expect(repositories.generatedAssets.get('task-reject-asset-1')?.status).toBe('rejected');
    expect(repositories.artTasks.get('task-reject')?.status).toBe('needs_revision');
  });

  it('records failed ProviderCall state and does not create approved assets when the provider fails', async () => {
    const repositories = createInMemoryArtTaskRepositories();
    const provider = createFailingArtProviderAdapter('minimax', 'image-01');
    const runner = createArtTaskRunner({
      repositories,
      providerResolver: createStaticProviderResolver({
        providers: [provider],
        defaultProviderId: 'minimax'
      }),
      storage: createLocalGeneratedAssetStorage({ rootDir: await createTempRoot(tempRoots) })
    });
    repositories.artTasks.create(createSkillIconTask('task-failure'));

    await expect(runner.runTask('task-failure')).rejects.toMatchObject({
      normalizedError: {
        providerId: 'minimax',
        operation: 'image.generate',
        code: 'PROVIDER_DOWN'
      }
    });

    expect(repositories.providerCalls.listByTaskId('task-failure')).toEqual([
      expect.objectContaining({
        taskId: 'task-failure',
        providerId: 'minimax',
        modelId: 'image-01',
        status: 'failed',
        outputAssetIds: [],
        error: expect.objectContaining({
          code: 'PROVIDER_DOWN',
          retryable: true
        })
      })
    ]);
    expect(repositories.generatedAssets.listByTaskId('task-failure')).toEqual([]);
    expect(repositories.artTasks.get('task-failure')?.status).toBe('failed');
  });
});

async function createTempRoot(tempRoots: string[]): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'art-task-flow-'));
  tempRoots.push(root);
  return root;
}

function createSkillIconTask(taskId: string) {
  return {
    taskId,
    projectId: 'project-001',
    type: 'skill_icon' as const,
    requiredCapability: 'image.generate' as const,
    prompt: 'glowing sword slash skill icon',
    outputSpec: {
      aspectRatio: '1:1' as const,
      count: 1,
      responseFormat: 'base64' as const
    },
    status: 'planned' as const
  };
}

function createMockArtProviderAdapter(input: {
  providerId: string;
  modelId: string;
  base64: string;
}): ArtProviderAdapter & { generateImageInputs: GenerateImageInput[] } {
  const generateImageInputs: GenerateImageInput[] = [];
  return {
    providerId: input.providerId,
    generateImageInputs,
    getManifest() {
      return {
        providerId: input.providerId,
        displayName: 'Mock Art Provider',
        capabilities: {
          textToImage: true,
          imageToImage: false,
          maskedImageEdit: false,
          styleReference: false,
          subjectReference: false,
          batchGeneration: true,
          seedControl: false,
          asyncJob: false
        },
        supportedAssetTypes: ['skill_icon'],
        supportedAspectRatios: ['1:1'],
        limits: {
          maxPromptLength: 1500,
          maxOutputCount: 4
        },
        models: [{ modelId: input.modelId, capabilities: ['image.generate'] }]
      };
    },
    async generateImage(generateInput: GenerateImageInput): Promise<GeneratedImageResult> {
      generateImageInputs.push(generateInput);
      return {
        providerId: input.providerId,
        modelId: input.modelId,
        traceId: 'trace-mock',
        images: [{ base64: input.base64, mimeType: 'image/jpeg' }],
        raw: { fixture: true }
      };
    }
  };
}

function createFailingArtProviderAdapter(providerId: string, modelId: string): ArtProviderAdapter {
  return {
    providerId,
    getManifest() {
      return {
        providerId,
        displayName: 'Failing Art Provider',
        capabilities: {
          textToImage: true,
          imageToImage: false,
          maskedImageEdit: false,
          styleReference: false,
          subjectReference: false,
          batchGeneration: true,
          seedControl: false,
          asyncJob: false
        },
        supportedAssetTypes: ['skill_icon'],
        supportedAspectRatios: ['1:1'],
        limits: {
          maxPromptLength: 1500,
          maxOutputCount: 1
        },
        models: [{ modelId, capabilities: ['image.generate'] }]
      };
    },
    async generateImage(): Promise<GeneratedImageResult> {
      throw new ArtProviderAdapterError({
        providerId,
        operation: 'image.generate',
        code: 'PROVIDER_DOWN',
        message: 'Provider unavailable',
        retryable: true
      });
    }
  };
}
