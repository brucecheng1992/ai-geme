import {
  ArtProviderAdapterError,
  createArtTaskRunner,
  createInMemoryArtTaskRepositories,
  createLocalGeneratedAssetStorage,
  createMiniMaxArtProviderAdapter,
  createMiniMaxProviderProfileFromEnv,
  createStaticProviderResolver,
  type ArtTask,
  type NormalizedProviderError
} from '../packages/asset-pipeline/src/index.js';

async function main(): Promise<void> {
  if (process.env.RUN_MINIMAX_LIVE_TESTS !== '1') {
    console.log('Skipping live MiniMax ArtTask smoke test');
    return;
  }

  if ((process.env.MINIMAX_API_KEY ?? '').trim().length === 0) {
    console.error('MiniMax ArtTask live smoke test requires MINIMAX_API_KEY when RUN_MINIMAX_LIVE_TESTS=1.');
    process.exitCode = 1;
    return;
  }

  const repositories = createInMemoryArtTaskRepositories();
  const adapter = createMiniMaxArtProviderAdapter();
  const providerProfile = createMiniMaxProviderProfileFromEnv(process.env);
  const runner = createArtTaskRunner({
    repositories,
    providerResolver: createStaticProviderResolver({
      providers: [adapter],
      defaultProfile: providerProfile
    }),
    storage: createLocalGeneratedAssetStorage()
  });
  const task = repositories.artTasks.create(createLiveSmokeTask());

  const runResult = await runner.runTask(task.taskId);
  const asset = runResult.assets[0];
  if (asset === undefined) {
    throw new Error('MiniMax ArtTask live smoke did not create a GeneratedAsset.');
  }
  if (runResult.providerCall.providerId !== 'minimax') {
    throw new Error('MiniMax ArtTask live smoke resolved an unexpected provider.');
  }
  if (asset.taskId !== task.taskId) {
    throw new Error('MiniMax ArtTask live smoke created an asset for the wrong task.');
  }
  if (repositories.artTasks.get(task.taskId)?.status !== 'generated') {
    throw new Error('MiniMax ArtTask live smoke did not reach generated status before review.');
  }

  runner.selectAsset(task.taskId, asset.assetId, 'live smoke selected');
  runner.approveAsset(task.taskId, asset.assetId, 'live smoke approved');

  console.log(
    JSON.stringify(
      {
        taskId: task.taskId,
        providerCallId: runResult.providerCall.callId,
        assetId: asset.assetId,
        finalTaskStatus: repositories.artTasks.get(task.taskId)?.status,
        generatedLocalPath: asset.localPath
      },
      null,
      2
    )
  );
}

function createLiveSmokeTask(): ArtTask {
  return {
    taskId: `minimax-live-art-task-smoke-${timestampForId(new Date())}`,
    projectId: 'minimax-live-smoke',
    type: 'skill_icon',
    requiredCapability: 'image.generate',
    prompt:
      '2D fantasy game skill icon, glowing blue sword slash, clean silhouette, high contrast, game UI icon, transparent-feeling dark background, polished mobile game art',
    negativePrompt: 'text, watermark, logo, blurry, low quality, extra objects',
    outputSpec: {
      aspectRatio: '1:1',
      count: 1,
      responseFormat: 'base64'
    },
    status: 'planned'
  };
}

function timestampForId(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

function formatSafeError(error: unknown): unknown {
  if (error instanceof ArtProviderAdapterError) {
    return safeProviderError(error.normalizedError);
  }
  return {
    message: error instanceof Error ? error.message : 'MiniMax ArtTask live smoke failed.'
  };
}

function safeProviderError(error: NormalizedProviderError): Omit<NormalizedProviderError, 'raw'> {
  return {
    providerId: error.providerId,
    operation: error.operation,
    ...(error.httpStatus === undefined ? {} : { httpStatus: error.httpStatus }),
    ...(error.code === undefined ? {} : { code: error.code }),
    message: error.message,
    retryable: error.retryable
  };
}

try {
  await main();
} catch (error) {
  console.error(
    JSON.stringify(
      {
        error: formatSafeError(error)
      },
      null,
      2
    )
  );
  process.exitCode = 1;
}
