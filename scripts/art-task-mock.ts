import {
  createArtTaskRunner,
  createInMemoryArtTaskRepositories,
  createLocalGeneratedAssetStorage,
  createStaticProviderResolver,
  type ArtProviderAdapter,
  type GenerateImageInput,
  type GeneratedImageResult
} from '../packages/asset-pipeline/src/index.js';

const repositories = createInMemoryArtTaskRepositories();
const provider = createMockProvider();
const runner = createArtTaskRunner({
  repositories,
  providerResolver: createStaticProviderResolver({
    providers: [provider],
    defaultProviderId: provider.providerId
  }),
  storage: createLocalGeneratedAssetStorage()
});

repositories.artTasks.create({
  taskId: 'mock-skill-icon-task',
  projectId: 'mock-project',
  type: 'skill_icon',
  requiredCapability: 'image.generate',
  prompt: 'mock skill icon',
  outputSpec: {
    aspectRatio: '1:1',
    count: 1,
    responseFormat: 'base64'
  },
  status: 'planned'
});

const runResult = await runner.runTask('mock-skill-icon-task');
const firstAsset = runResult.assets[0];
if (firstAsset === undefined) {
  throw new Error('Mock ArtTask did not create a GeneratedAsset.');
}
runner.selectAsset(runResult.task.taskId, firstAsset.assetId, 'mock selection');
runner.approveAsset(runResult.task.taskId, firstAsset.assetId, 'mock approval');

const approvedTask = repositories.artTasks.get(runResult.task.taskId);
console.log(
  JSON.stringify(
    {
      taskId: runResult.task.taskId,
      assetId: firstAsset.assetId,
      providerCallId: runResult.providerCall.callId,
      status: approvedTask?.status,
      artifactPath: firstAsset.localPath
    },
    null,
    2
  )
);

function createMockProvider(): ArtProviderAdapter {
  return {
    providerId: 'mock-minimax-profile',
    getManifest() {
      return {
        providerId: 'mock-minimax-profile',
        displayName: 'Mock MiniMax-compatible Provider',
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
        models: [{ modelId: 'mock-image-01', capabilities: ['image.generate'] }]
      };
    },
    async generateImage(input: GenerateImageInput): Promise<GeneratedImageResult> {
      return {
        providerId: 'mock-minimax-profile',
        modelId: 'mock-image-01',
        traceId: `mock-${input.taskId}`,
        images: [
          {
            base64: Buffer.from('mock generated skill icon').toString('base64'),
            mimeType: 'image/jpeg'
          }
        ],
        raw: { mock: true }
      };
    }
  };
}
