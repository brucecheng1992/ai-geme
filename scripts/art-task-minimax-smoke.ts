import { mkdir, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  ArtProviderAdapterError,
  createArtTaskRunner,
  createInMemoryArtTaskRepositories,
  createLocalGeneratedAssetStorage,
  createMiniMaxArtProviderAdapter,
  createMiniMaxProviderProfileFromEnv,
  createStaticProviderResolver,
  type ArtProviderAdapter,
  type ArtTask,
  type NormalizedProviderError,
  type ProviderProfile
} from '../packages/asset-pipeline/src/index.js';
import type {
  GenerationExecutionStatus,
  ImageContentGateStatus,
  ProductionApprovalStatus,
  ProductionClosureStatus
} from './art-quality-gates.js';

export const MINIMAX_ART_TASK_SMOKE_TASK_COUNT = 1 as const;
export const MINIMAX_ART_TASK_SMOKE_TOTAL_REQUESTED_IMAGES = 1 as const;
export const MINIMAX_ART_TASK_SMOKE_MAX_PROVIDER_CALL_COUNT = 1 as const;
export const MINIMAX_ART_TASK_SMOKE_OUTPUT_ROOT = join('artifacts', 'generated-assets', 'minimax-same-run-smoke');

type MiniMaxArtTaskSmokeEnv = Record<string, string | undefined>;
type SmokePromptGateStatus = 'not_evaluated';
type SmokeProviderCallStatus = 'not_started' | 'running' | 'succeeded' | 'failed';

export type MiniMaxArtTaskSmokeGateResult =
  | { status: 'skip'; reason: 'smoke_flag_disabled' | 'live_flag_disabled'; providerCallCount: 0 }
  | { status: 'fail_before_provider_call'; reason: 'missing_api_key'; providerCallCount: 0 }
  | { status: 'run'; providerCallCount: 0 };

export type MiniMaxArtTaskSmokeEvidence = {
  smokeStatus: 'generation_completed' | 'failed';
  smokeRunId: string;
  providerId: string;
  modelId: string;
  taskId: string;
  providerCallId?: string;
  taskCount: number;
  providerCallCount: number;
  totalRequestedImages: number;
  generatedAssetCount: number;
  generatedAssetPaths: string[];
  providerCallStatus: SmokeProviderCallStatus;
  startedAt: string;
  completedAt: string;
  generationExecutionStatus: GenerationExecutionStatus;
  promptGateStatus: SmokePromptGateStatus;
  imageContentGateStatus: ImageContentGateStatus;
  productionApprovalStatus: ProductionApprovalStatus;
  productionClosureStatus: ProductionClosureStatus;
  autoSelection: false;
  autoApproval: false;
  selectedAssetIds: string[];
  approvedAssetIds: string[];
  reviewDecisionCount: number;
  outputRoot: string;
  evidencePath: string;
};

export type ExecuteMiniMaxArtTaskSmokeOptions = {
  adapter: ArtProviderAdapter;
  providerProfile: ProviderProfile;
  storageRootDir?: string;
  now?: () => Date;
};

export class MiniMaxArtTaskSmokeExecutionError extends Error {
  readonly evidence: MiniMaxArtTaskSmokeEvidence;
  readonly cause: unknown;

  constructor(evidence: MiniMaxArtTaskSmokeEvidence, cause: unknown) {
    super('MiniMax ArtTask shared-path smoke execution failed.');
    this.name = 'MiniMaxArtTaskSmokeExecutionError';
    this.evidence = evidence;
    this.cause = cause;
  }
}

export function evaluateMiniMaxArtTaskSmokeGate(env: MiniMaxArtTaskSmokeEnv): MiniMaxArtTaskSmokeGateResult {
  if (env.RUN_MINIMAX_ART_TASK_SMOKE !== '1') {
    return { status: 'skip', reason: 'smoke_flag_disabled', providerCallCount: 0 };
  }
  if (env.RUN_MINIMAX_LIVE_TESTS !== '1') {
    return { status: 'skip', reason: 'live_flag_disabled', providerCallCount: 0 };
  }
  if ((env.MINIMAX_API_KEY ?? '').trim().length === 0) {
    return { status: 'fail_before_provider_call', reason: 'missing_api_key', providerCallCount: 0 };
  }
  return { status: 'run', providerCallCount: 0 };
}

export async function executeMiniMaxArtTaskSmoke(
  options: ExecuteMiniMaxArtTaskSmokeOptions
): Promise<MiniMaxArtTaskSmokeEvidence> {
  const now = options.now ?? (() => new Date());
  const storageRootDir = options.storageRootDir ?? '.';
  const startedAt = now().toISOString();
  const smokeRunId = `minimax-same-run-smoke-${timestampForId(new Date(startedAt))}`;
  const taskId = smokeRunId;
  const runRoot = join(storageRootDir, MINIMAX_ART_TASK_SMOKE_OUTPUT_ROOT, smokeRunId);
  const evidencePath = join(runRoot, 'smoke-result.json');
  const repositories = createInMemoryArtTaskRepositories();
  const runner = createArtTaskRunner({
    repositories,
    providerResolver: createStaticProviderResolver({
      providers: [options.adapter],
      defaultProfile: options.providerProfile
    }),
    storage: createLocalGeneratedAssetStorage({ rootDir: storageRootDir }),
    now
  });
  const task = repositories.artTasks.create(createLiveSmokeTask(taskId));

  try {
    await mkdir(runRoot, { recursive: true });
    const runResult = await runner.runTask(task.taskId);
    assertSuccessfulSmokeContract(repositories, runResult.providerCall.providerId, task.taskId, runRoot);
    const evidence = buildEvidence({
      smokeStatus: 'generation_completed',
      smokeRunId,
      taskId,
      startedAt,
      completedAt: now().toISOString(),
      evidencePath,
      outputRoot: runRoot,
      repositories
    });
    await writeEvidence(evidence);
    return evidence;
  } catch (cause) {
    const evidence = buildEvidence({
      smokeStatus: 'failed',
      smokeRunId,
      taskId,
      startedAt,
      completedAt: now().toISOString(),
      evidencePath,
      outputRoot: runRoot,
      repositories
    });
    try {
      await writeEvidence(evidence);
    } catch {
      // Preserve the original execution failure. Missing evidence remains an artifact-persistence failure signal.
    }
    throw new MiniMaxArtTaskSmokeExecutionError(evidence, cause);
  }
}

export async function runMiniMaxArtTaskSmokeCli(env: MiniMaxArtTaskSmokeEnv = process.env): Promise<number> {
  const gate = evaluateMiniMaxArtTaskSmokeGate(env);
  if (gate.status === 'skip') {
    console.log(`Skipping MiniMax ArtTask shared-path smoke (${gate.reason}); providerCallCount=0.`);
    return 0;
  }
  if (gate.status === 'fail_before_provider_call') {
    console.error(
      'MiniMax ArtTask shared-path smoke requires MINIMAX_API_KEY when RUN_MINIMAX_LIVE_TESTS=1 and RUN_MINIMAX_ART_TASK_SMOKE=1; providerCallCount=0.'
    );
    return 1;
  }

  const adapter = createMiniMaxArtProviderAdapter({
    apiKey: env.MINIMAX_API_KEY,
    baseUrl: env.MINIMAX_BASE_URL,
    defaultModel: env.MINIMAX_IMAGE_MODEL
  });
  const providerProfile = createMiniMaxProviderProfileFromEnv(env);

  try {
    const evidence = await executeMiniMaxArtTaskSmoke({ adapter, providerProfile });
    console.log('MiniMax shared-path smoke generation completed.');
    console.log('Provider connectivity and execution contract require final verification.');
    console.log('Production not approved.');
    console.log('No asset selected or approved.');
    console.log(JSON.stringify(evidence, null, 2));
    return 0;
  } catch (error) {
    if (error instanceof MiniMaxArtTaskSmokeExecutionError) {
      console.error(
        JSON.stringify(
          {
            smokeRunId: error.evidence.smokeRunId,
            evidencePath: error.evidence.evidencePath,
            generationExecutionStatus: error.evidence.generationExecutionStatus,
            providerCallStatus: error.evidence.providerCallStatus,
            error: formatSafeError(error.cause)
          },
          null,
          2
        )
      );
      return 1;
    }
    console.error(JSON.stringify({ error: formatSafeError(error) }, null, 2));
    return 1;
  }
}

function createLiveSmokeTask(taskId: string): ArtTask {
  return {
    taskId,
    projectId: 'minimax-same-run-smoke',
    type: 'skill_icon',
    requiredCapability: 'image.generate',
    prompt:
      '2D fantasy game skill icon, glowing blue sword slash, clean silhouette, high contrast, game UI icon, transparent-feeling dark background, polished mobile game art',
    negativePrompt: 'text, watermark, logo, blurry, low quality, extra objects',
    outputSpec: {
      aspectRatio: '1:1',
      count: MINIMAX_ART_TASK_SMOKE_TOTAL_REQUESTED_IMAGES,
      responseFormat: 'base64'
    },
    status: 'planned'
  };
}

function assertSuccessfulSmokeContract(
  repositories: ReturnType<typeof createInMemoryArtTaskRepositories>,
  providerId: string,
  taskId: string,
  runRoot: string
): void {
  const tasks = repositories.artTasks.list();
  const calls = repositories.providerCalls.list();
  const assets = repositories.generatedAssets.list();
  const decisions = repositories.reviewDecisions.list();
  if (tasks.length !== MINIMAX_ART_TASK_SMOKE_TASK_COUNT || tasks[0]?.taskId !== taskId) {
    throw new Error('MiniMax shared-path smoke must execute exactly one ArtTask.');
  }
  if (calls.length !== MINIMAX_ART_TASK_SMOKE_MAX_PROVIDER_CALL_COUNT || calls[0]?.status !== 'succeeded') {
    throw new Error('MiniMax shared-path smoke must complete exactly one logical provider call.');
  }
  if (providerId !== 'minimax' || calls[0]?.providerId !== 'minimax') {
    throw new Error('MiniMax shared-path smoke resolved an unexpected provider.');
  }
  if (assets.length !== MINIMAX_ART_TASK_SMOKE_TOTAL_REQUESTED_IMAGES || assets.some((asset) => asset.status !== 'generated')) {
    throw new Error('MiniMax shared-path smoke must create exactly one generated review candidate.');
  }
  const storedPath = assets[0]?.localPath;
  const runRelativePath = storedPath === undefined ? '..' : relative(resolve(runRoot), resolve(storedPath));
  if (storedPath === undefined || runRelativePath === '' || runRelativePath.startsWith('..') || isAbsolute(runRelativePath)) {
    throw new Error('MiniMax shared-path smoke must persist its generated image inside the unique smoke run root.');
  }
  if (repositories.artTasks.get(taskId)?.status !== 'generated') {
    throw new Error('MiniMax shared-path smoke task must remain generated pending review.');
  }
  if (decisions.length !== 0) {
    throw new Error('MiniMax shared-path smoke must not create review decisions.');
  }
}

function buildEvidence(input: {
  smokeStatus: MiniMaxArtTaskSmokeEvidence['smokeStatus'];
  smokeRunId: string;
  taskId: string;
  startedAt: string;
  completedAt: string;
  evidencePath: string;
  outputRoot: string;
  repositories: ReturnType<typeof createInMemoryArtTaskRepositories>;
}): MiniMaxArtTaskSmokeEvidence {
  const calls = input.repositories.providerCalls.list();
  const call = calls.at(-1);
  const assets = input.repositories.generatedAssets.listByTaskId(input.taskId);
  const selectedAssetIds = assets.filter((asset) => asset.status === 'selected').map((asset) => asset.assetId);
  const approvedAssetIds = assets.filter((asset) => asset.status === 'approved').map((asset) => asset.assetId);
  const generatedAssetPaths = assets.flatMap((asset) => (asset.localPath === undefined ? [] : [asset.localPath]));
  const generationExecutionStatus: GenerationExecutionStatus =
    call?.status === 'succeeded' ? 'generation_completed' : call === undefined ? 'failed_before_provider_call' : 'provider_failed';
  const modelId = call?.modelId ?? assets[0]?.modelId ?? 'unknown';
  const providerId = call?.providerId ?? assets[0]?.providerId ?? 'minimax';

  return {
    smokeStatus: input.smokeStatus,
    smokeRunId: input.smokeRunId,
    providerId,
    modelId,
    taskId: input.taskId,
    ...(call === undefined ? {} : { providerCallId: call.callId }),
    taskCount: input.repositories.artTasks.list().length,
    providerCallCount: calls.length,
    totalRequestedImages: MINIMAX_ART_TASK_SMOKE_TOTAL_REQUESTED_IMAGES,
    generatedAssetCount: assets.length,
    generatedAssetPaths,
    providerCallStatus: call?.status ?? 'not_started',
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    generationExecutionStatus,
    promptGateStatus: 'not_evaluated',
    imageContentGateStatus: assets.length > 0 ? 'manual_review_required' : 'not_evaluated',
    productionApprovalStatus: 'pending_human_review',
    productionClosureStatus: 'open_pending_review',
    autoSelection: false,
    autoApproval: false,
    selectedAssetIds,
    approvedAssetIds,
    reviewDecisionCount: input.repositories.reviewDecisions.listByTaskId(input.taskId).length,
    outputRoot: input.outputRoot,
    evidencePath: input.evidencePath
  };
}

async function writeEvidence(evidence: MiniMaxArtTaskSmokeEvidence): Promise<void> {
  await mkdir(resolve(evidence.outputRoot), { recursive: true });
  await writeFile(evidence.evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

function timestampForId(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

function formatSafeError(error: unknown): unknown {
  if (error instanceof ArtProviderAdapterError) {
    return safeProviderError(error.normalizedError);
  }
  return { message: 'MiniMax ArtTask shared-path smoke execution failed.' };
}

function safeProviderError(error: NormalizedProviderError): Omit<NormalizedProviderError, 'raw' | 'message'> & { message: string } {
  return {
    providerId: error.providerId,
    operation: error.operation,
    ...(error.httpStatus === undefined ? {} : { httpStatus: error.httpStatus }),
    ...(error.code === undefined ? {} : { code: error.code }),
    message: 'MiniMax provider call failed.',
    retryable: error.retryable
  };
}

function isDirectExecution(importMetaUrl: string): boolean {
  const argvPath = process.argv[1];
  return argvPath !== undefined && importMetaUrl === pathToFileURL(resolve(argvPath)).href;
}

if (isDirectExecution(import.meta.url)) {
  process.exitCode = await runMiniMaxArtTaskSmokeCli();
}
