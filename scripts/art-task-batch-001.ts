import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  ArtProviderAdapterError,
  createArtTaskRunner,
  createInMemoryArtTaskRepositories,
  createLocalGeneratedAssetStorage,
  createMiniMaxArtProviderAdapter,
  createMiniMaxProviderProfileFromEnv,
  createStaticProviderResolver,
  type ArtTask,
  type ArtTaskRepositories,
  type ArtAssetType,
  type AspectRatio,
  type GeneratedAsset,
  type NormalizedProviderError,
  type ProviderCall,
  type ProviderCallError
} from '../packages/asset-pipeline/src/index.js';

export const BATCH_001_ID = 'batch-001' as const;
export const BATCH_001_MAX_IMAGES = 12 as const;

export type Batch001TaskDefinition = {
  readonly id: string;
  readonly type: ArtAssetType;
  readonly requiredCapability: 'image.generate';
  readonly aspectRatio: AspectRatio;
  readonly count: number;
  readonly responseFormat: 'base64';
  readonly prompt: string;
  readonly negativePrompt: string;
};

type Batch001GateResult =
  | {
      status: 'skip';
      message: string;
    }
  | {
      status: 'error';
      message: string;
    }
  | {
      status: 'run';
    };

type Batch001TaskManifest = {
  taskId: string;
  definitionId: string;
  type: ArtAssetType;
  status: ArtTask['status'];
  requestedImages: number;
  providerCallId?: string;
  providerCallStatus?: ProviderCall['status'];
  assetIds: string[];
  assets: Array<Pick<GeneratedAsset, 'assetId' | 'status' | 'localPath' | 'storagePath' | 'temporaryUrl' | 'mimeType'>>;
  error?: ProviderCallError | { message: string };
};

type Batch001Manifest = {
  batchId: typeof BATCH_001_ID;
  batchRunId: string;
  providerId: 'minimax';
  purpose: string;
  totalTaskCount: number;
  totalRequestedImages: number;
  maxRequestedImages: typeof BATCH_001_MAX_IMAGES;
  autoApproval: false;
  autoSelection: false;
  reviewState: 'pending_human_review';
  tasks: Batch001TaskManifest[];
};

export const BATCH_001_TASK_DEFINITIONS: readonly Batch001TaskDefinition[] = [
  {
    id: 'player_character_concept',
    type: 'character_concept',
    requiredCapability: 'image.generate',
    aspectRatio: '3:4',
    count: 3,
    responseFormat: 'base64',
    prompt:
      '2D game main character concept art, stylized fantasy action RPG hero, clear silhouette, full body, readable costume design, mobile game art, consistent shape language, high quality concept art',
    negativePrompt: 'text, watermark, logo, blurry, low quality, extra limbs, deformed hands, messy background'
  },
  {
    id: 'enemy_concept',
    type: 'enemy_concept',
    requiredCapability: 'image.generate',
    aspectRatio: '3:4',
    count: 3,
    responseFormat: 'base64',
    prompt:
      '2D game enemy concept art, stylized fantasy action RPG monster, clear silhouette, readable combat shape, full body, mobile game art, high contrast, production concept art',
    negativePrompt: 'text, watermark, logo, blurry, low quality, extra limbs, unreadable silhouette'
  },
  {
    id: 'scene_background',
    type: 'scene_background',
    requiredCapability: 'image.generate',
    aspectRatio: '16:9',
    count: 2,
    responseFormat: 'base64',
    prompt:
      '2D game first level background, fantasy action RPG environment, side-scrolling readable gameplay space, atmospheric depth, clean layers, mobile game background art, no characters',
    negativePrompt: 'text, watermark, logo, blurry, low quality, character, UI, cluttered composition'
  },
  {
    id: 'skill_icon_slash',
    type: 'skill_icon',
    requiredCapability: 'image.generate',
    aspectRatio: '1:1',
    count: 1,
    responseFormat: 'base64',
    prompt: '2D fantasy game skill icon, glowing sword slash, clean silhouette, high contrast, polished mobile game UI icon',
    negativePrompt: 'text, watermark, logo, blurry, low quality, multiple icons'
  },
  {
    id: 'skill_icon_guard',
    type: 'skill_icon',
    requiredCapability: 'image.generate',
    aspectRatio: '1:1',
    count: 1,
    responseFormat: 'base64',
    prompt: '2D fantasy game skill icon, protective energy shield, clean silhouette, high contrast, polished mobile game UI icon',
    negativePrompt: 'text, watermark, logo, blurry, low quality, multiple icons'
  },
  {
    id: 'skill_icon_burst',
    type: 'skill_icon',
    requiredCapability: 'image.generate',
    aspectRatio: '1:1',
    count: 1,
    responseFormat: 'base64',
    prompt: '2D fantasy game skill icon, explosive magic burst, clean silhouette, high contrast, polished mobile game UI icon',
    negativePrompt: 'text, watermark, logo, blurry, low quality, multiple icons'
  },
  {
    id: 'ui_concept',
    type: 'ui_concept',
    requiredCapability: 'image.generate',
    aspectRatio: '16:9',
    count: 1,
    responseFormat: 'base64',
    prompt:
      '2D mobile game battle HUD concept, fantasy action RPG, health bar, skill buttons, clean readable layout, polished UI style, no copyrighted logos',
    negativePrompt: 'text, watermark, logo, blurry, low quality, cluttered layout'
  }
];

export function getBatch001RequestedImageCount(definitions: readonly Batch001TaskDefinition[] = BATCH_001_TASK_DEFINITIONS): number {
  return definitions.reduce((total, definition) => total + definition.count, 0);
}

export function evaluateBatch001Gate(env: Record<string, string | undefined>): Batch001GateResult {
  if (env.RUN_MINIMAX_LIVE_TESTS !== '1' || env.RUN_REAL_2D_ASSET_BATCH !== '1') {
    return {
      status: 'skip',
      message: 'Skipping real 2D asset Batch 001'
    };
  }

  if ((env.MINIMAX_API_KEY ?? '').trim().length === 0) {
    return {
      status: 'error',
      message: 'Batch 001 requires MINIMAX_API_KEY when live batch flags are enabled.'
    };
  }

  return { status: 'run' };
}

async function main(): Promise<void> {
  const gate = evaluateBatch001Gate(process.env);
  if (gate.status === 'skip') {
    console.log(gate.message);
    return;
  }
  if (gate.status === 'error') {
    console.error(gate.message);
    process.exitCode = 1;
    return;
  }

  assertBatch001ImageCap();
  const batchRunId = `${BATCH_001_ID}-${timestampForId(new Date())}`;
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

  const manifestTasks: Batch001TaskManifest[] = [];
  for (const definition of BATCH_001_TASK_DEFINITIONS) {
    const task = repositories.artTasks.create(createBatch001ArtTask(batchRunId, definition));
    try {
      const result = await runner.runTask(task.taskId);
      manifestTasks.push(taskManifestFromRepositories(repositories, definition, task.taskId, result.providerCall));
    } catch (error) {
      const failedCall = repositories.providerCalls.listByTaskId(task.taskId).at(-1);
      manifestTasks.push(taskManifestFromRepositories(repositories, definition, task.taskId, failedCall, formatSafeError(error)));
      await writeBatch001ReviewArtifacts(createBatch001Manifest(batchRunId, manifestTasks));
      throw error;
    }
  }

  const manifest = createBatch001Manifest(batchRunId, manifestTasks);
  const artifactPaths = await writeBatch001ReviewArtifacts(manifest);
  console.log(
    JSON.stringify(
      {
        batchRunId,
        taskCount: manifest.totalTaskCount,
        totalRequestedImages: manifest.totalRequestedImages,
        generatedAssetCount: manifest.tasks.reduce((total, task) => total + task.assetIds.length, 0),
        providerCallIds: manifest.tasks.flatMap((task) => (task.providerCallId === undefined ? [] : [task.providerCallId])),
        reviewManifestPath: artifactPaths.manifestPath,
        reviewIndexPath: artifactPaths.indexPath,
        reviewState: manifest.reviewState
      },
      null,
      2
    )
  );
}

function assertBatch001ImageCap(): void {
  const requestedImages = getBatch001RequestedImageCount();
  if (requestedImages > BATCH_001_MAX_IMAGES) {
    throw new Error(`Batch 001 requests ${requestedImages} images, above the ${BATCH_001_MAX_IMAGES} image cap.`);
  }
}

function createBatch001ArtTask(batchRunId: string, definition: Batch001TaskDefinition): ArtTask {
  return {
    taskId: `${batchRunId}-${definition.id}`,
    projectId: BATCH_001_ID,
    type: definition.type,
    requiredCapability: definition.requiredCapability,
    prompt: definition.prompt,
    negativePrompt: definition.negativePrompt,
    outputSpec: {
      aspectRatio: definition.aspectRatio,
      count: definition.count,
      responseFormat: definition.responseFormat
    },
    status: 'planned'
  };
}

function taskManifestFromRepositories(
  repositories: ArtTaskRepositories,
  definition: Batch001TaskDefinition,
  taskId: string,
  providerCall: ProviderCall | undefined,
  error?: Batch001TaskManifest['error']
): Batch001TaskManifest {
  const task = repositories.artTasks.get(taskId);
  const assets = repositories.generatedAssets.listByTaskId(taskId);
  return {
    taskId,
    definitionId: definition.id,
    type: definition.type,
    status: task?.status ?? 'failed',
    requestedImages: definition.count,
    ...(providerCall === undefined ? {} : { providerCallId: providerCall.callId, providerCallStatus: providerCall.status }),
    assetIds: assets.map((asset) => asset.assetId),
    assets: assets.map((asset) => ({
      assetId: asset.assetId,
      status: asset.status,
      ...(asset.localPath === undefined ? {} : { localPath: asset.localPath }),
      ...(asset.storagePath === undefined ? {} : { storagePath: asset.storagePath }),
      ...(asset.temporaryUrl === undefined ? {} : { temporaryUrl: asset.temporaryUrl }),
      mimeType: asset.mimeType
    })),
    ...(error === undefined ? {} : { error })
  };
}

function createBatch001Manifest(batchRunId: string, tasks: Batch001TaskManifest[]): Batch001Manifest {
  return {
    batchId: BATCH_001_ID,
    batchRunId,
    providerId: 'minimax',
    purpose: 'Real 2D game asset task testing for human review, not formal production approval.',
    totalTaskCount: BATCH_001_TASK_DEFINITIONS.length,
    totalRequestedImages: getBatch001RequestedImageCount(),
    maxRequestedImages: BATCH_001_MAX_IMAGES,
    autoApproval: false,
    autoSelection: false,
    reviewState: 'pending_human_review',
    tasks
  };
}

async function writeBatch001ReviewArtifacts(manifest: Batch001Manifest): Promise<{ manifestPath: string; indexPath: string }> {
  const batchDir = join('artifacts', 'generated-assets', BATCH_001_ID);
  await mkdir(batchDir, { recursive: true });
  const manifestPath = join(batchDir, 'review-manifest.json');
  const indexPath = join(batchDir, 'review-index.md');
  await Promise.all([
    writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
    writeFile(indexPath, renderReviewIndex(manifest), 'utf8')
  ]);
  return { manifestPath, indexPath };
}

function renderReviewIndex(manifest: Batch001Manifest): string {
  const lines = [
    '# Batch 001 Review Index',
    '',
    `Batch run: ${manifest.batchRunId}`,
    `Provider: ${manifest.providerId}`,
    `Review state: ${manifest.reviewState}`,
    `Requested images: ${manifest.totalRequestedImages}/${manifest.maxRequestedImages}`,
    '',
    'Assets remain generated for human review. No asset is selected or approved by this script.',
    ''
  ];

  for (const task of manifest.tasks) {
    lines.push(`## ${task.definitionId}`, '', `Task: ${task.taskId}`, `Status: ${task.status}`, `Requested images: ${task.requestedImages}`, '');
    if (task.assets.length === 0) {
      lines.push('- No generated assets recorded.', '');
      continue;
    }
    for (const asset of task.assets) {
      lines.push(`- ${asset.assetId} (${asset.status})`, `  - Path: ${asset.localPath ?? asset.temporaryUrl ?? 'not stored locally'}`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function formatSafeError(error: unknown): ProviderCallError | { message: string } {
  if (error instanceof ArtProviderAdapterError) {
    return safeProviderError(error.normalizedError);
  }
  return {
    message: error instanceof Error ? error.message : 'Batch 001 ArtTask generation failed.'
  };
}

function safeProviderError(error: NormalizedProviderError): Omit<NormalizedProviderError, 'providerId' | 'operation' | 'raw'> {
  return {
    ...(error.httpStatus === undefined ? {} : { httpStatus: error.httpStatus }),
    ...(error.code === undefined ? {} : { code: error.code }),
    message: error.message,
    retryable: error.retryable
  };
}

function timestampForId(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

function isMainModule(importMetaUrl: string, argvPath: string | undefined): boolean {
  return argvPath !== undefined && importMetaUrl === pathToFileURL(argvPath).href;
}

if (isMainModule(import.meta.url, process.argv[1])) {
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
}
