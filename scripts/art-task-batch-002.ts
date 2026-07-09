import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
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
  MINIMAX_MAX_PROMPT_LENGTH,
  type ArtAssetType,
  type ArtTask,
  type ArtTaskRepositories,
  type AspectRatio,
  type GeneratedAsset,
  type NormalizedProviderError,
  type ProviderCall,
  type ProviderCallError
} from '../packages/asset-pipeline/src/index.js';

export const BATCH_002_ID = 'batch-002' as const;
export const BATCH_002_PURPOSE = 'ChiYan Battlefield Art Direction Calibration' as const;
export const BATCH_002_MAX_IMAGES = 11 as const;
export const CHIYAN_SOURCE_DSL_ID = 'chiyan-battlefield-dsl-v1' as const;
export const CHIYAN_ART_BIBLE_ID = 'chiyan-battlefield-art-bible-v1' as const;
export const CHIYAN_PROMPT_TEMPLATE_ID = 'chiyan-batch-002-v1' as const;
export const CHIYAN_DEFAULT_BASE_URL = 'https://api.minimaxi.com' as const;
export const CHIYAN_DEFAULT_IMAGE_MODEL = 'image-01' as const;
export const CHIYAN_DSL_MISSING_MESSAGE =
  'ChiYan Battlefield DSL not found. Provide CHIYAN_BATTLEFIELD_DSL_PATH or add the DSL file to the repo.' as const;
export const CHIYAN_DSL_TEST_ONLY_MESSAGE = 'ChiYan Batch 002 source DSL is marked test-only and cannot be used for live generation.' as const;
export const CHIYAN_DSL_LIVE_ALLOWED_MISSING_MESSAGE =
  'ChiYan Batch 002 source DSL must contain LIVE_GENERATION_ALLOWED true before live generation.' as const;

const DEFAULT_CHIYAN_DSL_CANDIDATE_PATHS = [
  'docs/art-pipeline/chiyan-battlefield-dsl.md',
  'docs/art-pipeline/chiyan-battlefield-art-bible.md',
  'docs/art-pipeline/chiyan-battlefield-world-bible.md'
] as const;

export type ChiyanBatch002TaskDefinition = {
  readonly id: string;
  readonly type: ArtAssetType;
  readonly requiredCapability: 'image.generate';
  readonly aspectRatio: AspectRatio;
  readonly count: number;
  readonly responseFormat: 'base64';
  readonly assetInstruction: string;
  readonly negativePrompt: string;
  readonly autoSelect: false;
  readonly autoApprove: false;
};

export type ChiyanPromptLineage = {
  sourceDslId: typeof CHIYAN_SOURCE_DSL_ID;
  sourceDslPath: string;
  sourceDslHash: string;
  artBibleId: typeof CHIYAN_ART_BIBLE_ID;
  promptTemplateId: typeof CHIYAN_PROMPT_TEMPLATE_ID;
  compiledPromptHash: string;
  compiledAt: string;
};

export type ChiyanCompiledPrompt = {
  compiledPrompt: string;
  negativePrompt: string;
  promptSummary: string;
  promptLineage: ChiyanPromptLineage;
};

type Batch002GateResult =
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
      env: {
        MINIMAX_BASE_URL: string;
        MINIMAX_IMAGE_MODEL: string;
      };
    };

type DslSourceResult =
  | {
      ok: true;
      path: string;
      text: string;
      sha256: string;
    }
  | {
      ok: false;
      message: typeof CHIYAN_DSL_MISSING_MESSAGE;
    };

type DslLiveValidationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: typeof CHIYAN_DSL_TEST_ONLY_MESSAGE | typeof CHIYAN_DSL_LIVE_ALLOWED_MISSING_MESSAGE;
    };

type Batch002TaskManifest = {
  taskId: string;
  type: ArtAssetType;
  requiredCapability: 'image.generate';
  aspectRatio: AspectRatio;
  count: number;
  promptSummary: string;
  promptLineage: ChiyanPromptLineage;
  providerCallId?: string;
  providerCallStatus?: ProviderCall['status'];
  generatedAssetIds: string[];
  error?: ProviderCallError | { message: string };
};

type Batch002AssetManifest = {
  assetId: string;
  taskId: string;
  type: ArtAssetType;
  providerId: string;
  modelId: string;
  localPath?: string;
  storagePath?: string;
  temporaryUrl?: string;
  status: GeneratedAsset['status'];
};

type Batch002Manifest = {
  batchRunId: string;
  batchId: typeof BATCH_002_ID;
  batchPurpose: typeof BATCH_002_PURPOSE;
  sourceDslPath: string;
  sourceDslHash: string;
  taskCount: number;
  providerCallCount: number;
  totalRequestedImages: number;
  generatedAssetCount: number;
  reviewState: 'pending_human_review';
  autoApproval: false;
  autoSelection: false;
  tasks: Batch002TaskManifest[];
  assets: Batch002AssetManifest[];
};

export const BATCH_002_TASK_DEFINITIONS: readonly ChiyanBatch002TaskDefinition[] = [
  {
    id: 'player_character_concept_chiyan',
    type: 'character_concept',
    requiredCapability: 'image.generate',
    aspectRatio: '3:4',
    count: 3,
    responseFormat: 'base64',
    assetInstruction:
      '赤炎战场主角职业概念图。全身角色设计，适合 2D fantasy action RPG / mobile game。角色需要有清晰轮廓、明确职业气质、可读的武器或战斗定位，后续可拆解为 portrait / sprite / attack pose。避免海报式复杂背景。',
    negativePrompt: sharedNegativePrompt(),
    autoSelect: false,
    autoApprove: false
  },
  {
    id: 'enemy_concept_chiyan',
    type: 'enemy_concept',
    requiredCapability: 'image.generate',
    aspectRatio: '3:4',
    count: 2,
    responseFormat: 'base64',
    assetInstruction:
      '赤炎战场第一批敌人概念图。敌意明确，轮廓独特，玩家缩小观看时仍然能一眼识别为敌人。需要适合后续制作 idle / attack / hurt / death 2D 动画。避免过度复杂碎片。',
    negativePrompt: sharedNegativePrompt(),
    autoSelect: false,
    autoApprove: false
  },
  {
    id: 'scene_background_chiyan',
    type: 'scene_background',
    requiredCapability: 'image.generate',
    aspectRatio: '16:9',
    count: 2,
    responseFormat: 'base64',
    assetInstruction:
      '赤炎战场第一关 2D 战斗背景。需要适合横版或 2D action RPG 战斗空间，前中后景层次清楚，角色放上去仍然可读。背景服务玩法，不要像宣传海报。不要出现人物、UI、文字。',
    negativePrompt: `${sharedNegativePrompt()}, character, person, monster, UI overlay, icon, menu`,
    autoSelect: false,
    autoApprove: false
  },
  {
    id: 'skill_icon_chiyan_flame_slash',
    type: 'skill_icon',
    requiredCapability: 'image.generate',
    aspectRatio: '1:1',
    count: 1,
    responseFormat: 'base64',
    assetInstruction:
      '赤炎战场技能图标：赤焰剑气斩。中心主体明确，一个图标只表达一个技能。缩小到 64x64 仍然可读。高对比、清晰轮廓、移动端游戏 UI 图标。',
    negativePrompt: `${sharedNegativePrompt()}, multiple icons, full character, tiny details, unreadable at small size, text label`,
    autoSelect: false,
    autoApprove: false
  },
  {
    id: 'skill_icon_chiyan_ash_guard',
    type: 'skill_icon',
    requiredCapability: 'image.generate',
    aspectRatio: '1:1',
    count: 1,
    responseFormat: 'base64',
    assetInstruction:
      '赤炎战场技能图标：灰烬护盾或熔火护盾。中心主体明确，一个图标只表达防御技能。缩小到 64x64 仍然可读。高对比、清晰轮廓、移动端游戏 UI 图标。',
    negativePrompt: `${sharedNegativePrompt()}, multiple icons, full character, tiny details, unreadable at small size, text label`,
    autoSelect: false,
    autoApprove: false
  },
  {
    id: 'skill_icon_chiyan_battle_burst',
    type: 'skill_icon',
    requiredCapability: 'image.generate',
    aspectRatio: '1:1',
    count: 1,
    responseFormat: 'base64',
    assetInstruction:
      '赤炎战场技能图标：战场爆燃或熔火爆裂。中心主体明确，一个图标只表达爆发技能。缩小到 64x64 仍然可读。高对比、清晰轮廓、移动端游戏 UI 图标。',
    negativePrompt: `${sharedNegativePrompt()}, multiple icons, full character, tiny details, unreadable at small size, text label`,
    autoSelect: false,
    autoApprove: false
  },
  {
    id: 'ui_concept_chiyan_battle_hud',
    type: 'ui_concept',
    requiredCapability: 'image.generate',
    aspectRatio: '16:9',
    count: 1,
    responseFormat: 'base64',
    assetInstruction:
      '赤炎战场 2D mobile action RPG 战斗 HUD 概念。包含血条、技能按钮区域、战斗信息布局。要求清晰、可读、可拆分，不要复杂乱码文字，不要真实产品截图感。',
    negativePrompt: sharedNegativePrompt(),
    autoSelect: false,
    autoApprove: false
  }
];

export function getBatch002RequestedImageCount(definitions: readonly ChiyanBatch002TaskDefinition[] = BATCH_002_TASK_DEFINITIONS): number {
  return definitions.reduce((total, definition) => total + definition.count, 0);
}

export function evaluateBatch002Gate(env: Record<string, string | undefined>): Batch002GateResult {
  if (env.RUN_CHIYAN_BATCH_002 !== '1') {
    return {
      status: 'skip',
      message: 'Skipping ChiYan Batch 002'
    };
  }

  if (env.RUN_MINIMAX_LIVE_TESTS !== '1') {
    return {
      status: 'error',
      message: 'ChiYan Batch 002 requires RUN_MINIMAX_LIVE_TESTS=1 when RUN_CHIYAN_BATCH_002=1.'
    };
  }

  if ((env.MINIMAX_API_KEY ?? '').trim().length === 0) {
    return {
      status: 'error',
      message: 'ChiYan Batch 002 requires MINIMAX_API_KEY when RUN_CHIYAN_BATCH_002=1.'
    };
  }

  return {
    status: 'run',
    env: {
      MINIMAX_BASE_URL: normalizeEnvValue(env.MINIMAX_BASE_URL) ?? CHIYAN_DEFAULT_BASE_URL,
      MINIMAX_IMAGE_MODEL: normalizeEnvValue(env.MINIMAX_IMAGE_MODEL) ?? CHIYAN_DEFAULT_IMAGE_MODEL
    }
  };
}

export async function resolveChiyanDslSource(input: {
  env?: Record<string, string | undefined>;
  repoRoot?: string;
  candidatePaths?: readonly string[];
} = {}): Promise<DslSourceResult> {
  const env = input.env ?? process.env;
  const repoRoot = input.repoRoot ?? process.cwd();
  const envPath = normalizeEnvValue(env.CHIYAN_BATTLEFIELD_DSL_PATH);
  const candidatePaths = envPath === undefined ? input.candidatePaths ?? DEFAULT_CHIYAN_DSL_CANDIDATE_PATHS : [envPath];

  for (const candidatePath of candidatePaths) {
    const resolvedPath = isAbsolute(candidatePath) ? candidatePath : join(repoRoot, candidatePath);
    if (!(await fileExists(resolvedPath))) {
      continue;
    }
    const text = await readFile(resolvedPath, 'utf8');
    if (text.trim().length === 0) {
      continue;
    }
    return {
      ok: true,
      path: isAbsolute(candidatePath) ? candidatePath : candidatePath,
      text,
      sha256: sha256Hex(text)
    };
  }

  return {
    ok: false,
    message: CHIYAN_DSL_MISSING_MESSAGE
  };
}

export function validateChiyanDslForLiveGeneration(sourceDslText: string): DslLiveValidationResult {
  if (/TEST_ONLY_DO_NOT_USE_FOR_LIVE_GENERATION/.test(sourceDslText) || /LIVE_GENERATION_ALLOWED\s+false/.test(sourceDslText)) {
    return {
      ok: false,
      message: CHIYAN_DSL_TEST_ONLY_MESSAGE
    };
  }

  if (!/LIVE_GENERATION_ALLOWED\s+true/.test(sourceDslText)) {
    return {
      ok: false,
      message: CHIYAN_DSL_LIVE_ALLOWED_MISSING_MESSAGE
    };
  }

  return { ok: true };
}

export function buildChiyanBatch002Prompt(input: {
  sourceDslText: string;
  sourceDslPath: string;
  sourceDslHash: string;
  taskDefinition: ChiyanBatch002TaskDefinition;
  providerPromptLimit?: number;
  now?: () => Date;
}): ChiyanCompiledPrompt {
  const providerPromptLimit = input.providerPromptLimit ?? MINIMAX_MAX_PROMPT_LENGTH;
  const styleBlock = deriveChiyanStyleBlock(input.sourceDslText);
  const compiledPrompt = [
    'Project art direction: 赤炎战场 / ChiYan Battlefield.',
    `Source art bible anchors: ${styleBlock}`,
    `Asset type: ${input.taskDefinition.type}.`,
    `Asset instruction: ${input.taskDefinition.assetInstruction}`,
    `Output spec: ${input.taskDefinition.aspectRatio} aspect ratio, ${input.taskDefinition.count} image(s), ${input.taskDefinition.responseFormat} response.`,
    'Production intent: 2D fantasy action RPG / mobile game asset, strong silhouette, gameplay readability, processable for later game asset production, consistent ChiYan art direction.'
  ].join('\n');

  if (compiledPrompt.length > providerPromptLimit) {
    throw new Error(
      `ChiYan Batch 002 ${input.taskDefinition.type} compiled prompt length ${compiledPrompt.length} exceeds provider limit ${providerPromptLimit}.`
    );
  }

  const compiledAt = (input.now ?? (() => new Date()))().toISOString();
  return {
    compiledPrompt,
    negativePrompt: input.taskDefinition.negativePrompt,
    promptSummary: `${input.taskDefinition.id}: ${input.taskDefinition.assetInstruction}`,
    promptLineage: {
      sourceDslId: CHIYAN_SOURCE_DSL_ID,
      sourceDslPath: input.sourceDslPath,
      sourceDslHash: input.sourceDslHash,
      artBibleId: CHIYAN_ART_BIBLE_ID,
      promptTemplateId: CHIYAN_PROMPT_TEMPLATE_ID,
      compiledPromptHash: sha256Hex(compiledPrompt),
      compiledAt
    }
  };
}

async function main(): Promise<void> {
  const gate = evaluateBatch002Gate(process.env);
  if (gate.status === 'skip') {
    console.log(gate.message);
    return;
  }
  if (gate.status === 'error') {
    console.error(gate.message);
    process.exitCode = 1;
    return;
  }

  assertBatch002ImageCap();
  const dslSource = await resolveChiyanDslSource();
  if (!dslSource.ok) {
    console.error(dslSource.message);
    process.exitCode = 1;
    return;
  }
  const dslLiveValidation = validateChiyanDslForLiveGeneration(dslSource.text);
  if (!dslLiveValidation.ok) {
    console.error(dslLiveValidation.message);
    process.exitCode = 1;
    return;
  }

  const batchRunId = `${BATCH_002_ID}-${timestampForId(new Date())}`;
  const repositories = createInMemoryArtTaskRepositories();
  const adapter = createMiniMaxArtProviderAdapter({
    baseUrl: gate.env.MINIMAX_BASE_URL,
    defaultModel: gate.env.MINIMAX_IMAGE_MODEL
  });
  const providerProfile = createMiniMaxProviderProfileFromEnv({
    ...process.env,
    MINIMAX_BASE_URL: gate.env.MINIMAX_BASE_URL,
    MINIMAX_IMAGE_MODEL: gate.env.MINIMAX_IMAGE_MODEL
  });
  const runner = createArtTaskRunner({
    repositories,
    providerResolver: createStaticProviderResolver({
      providers: [adapter],
      defaultProfile: providerProfile
    }),
    storage: createLocalGeneratedAssetStorage()
  });

  const compiledPrompts = BATCH_002_TASK_DEFINITIONS.map((definition) =>
    buildChiyanBatch002Prompt({
      sourceDslText: dslSource.text,
      sourceDslPath: dslSource.path,
      sourceDslHash: dslSource.sha256,
      taskDefinition: definition
    })
  );

  const manifestTasks: Batch002TaskManifest[] = [];
  for (const [index, definition] of BATCH_002_TASK_DEFINITIONS.entries()) {
    const compiled = compiledPrompts[index];
    if (compiled === undefined) {
      throw new Error(`ChiYan Batch 002 prompt compiler did not produce prompt for ${definition.id}.`);
    }
    const task = repositories.artTasks.create(createBatch002ArtTask(batchRunId, definition, compiled));
    try {
      const result = await runner.runTask(task.taskId);
      manifestTasks.push(taskManifestFromRepositories(repositories, definition, task.taskId, compiled, result.providerCall));
    } catch (error) {
      const failedCall = repositories.providerCalls.listByTaskId(task.taskId).at(-1);
      manifestTasks.push(taskManifestFromRepositories(repositories, definition, task.taskId, compiled, failedCall, formatSafeError(error)));
      await writeBatch002ReviewArtifacts(createBatch002Manifest(batchRunId, dslSource, repositories, manifestTasks));
      throw error;
    }
  }

  const manifest = createBatch002Manifest(batchRunId, dslSource, repositories, manifestTasks);
  const artifactPaths = await writeBatch002ReviewArtifacts(manifest);
  console.log(
    JSON.stringify(
      {
        batchRunId,
        sourceDslPath: dslSource.path,
        sourceDslHash: dslSource.sha256,
        taskCount: manifest.taskCount,
        providerCallCount: manifest.providerCallCount,
        totalRequestedImages: manifest.totalRequestedImages,
        generatedAssetCount: manifest.generatedAssetCount,
        outputFolderPath: join('artifacts', 'generated-assets', BATCH_002_ID),
        reviewManifestPath: artifactPaths.manifestPath,
        reviewIndexPath: artifactPaths.indexPath,
        reviewState: manifest.reviewState,
        autoApproval: manifest.autoApproval,
        autoSelection: manifest.autoSelection
      },
      null,
      2
    )
  );
}

function assertBatch002ImageCap(): void {
  const requestedImages = getBatch002RequestedImageCount();
  if (requestedImages > BATCH_002_MAX_IMAGES) {
    throw new Error(`ChiYan Batch 002 requests ${requestedImages} images, above the ${BATCH_002_MAX_IMAGES} image cap.`);
  }
}

function createBatch002ArtTask(batchRunId: string, definition: ChiyanBatch002TaskDefinition, compiled: ChiyanCompiledPrompt): ArtTask {
  return {
    taskId: `${batchRunId}-${definition.id}`,
    projectId: BATCH_002_ID,
    type: definition.type,
    requiredCapability: definition.requiredCapability,
    prompt: compiled.compiledPrompt,
    negativePrompt: compiled.negativePrompt,
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
  definition: ChiyanBatch002TaskDefinition,
  taskId: string,
  compiled: ChiyanCompiledPrompt,
  providerCall: ProviderCall | undefined,
  error?: Batch002TaskManifest['error']
): Batch002TaskManifest {
  const assets = repositories.generatedAssets.listByTaskId(taskId);
  return {
    taskId,
    type: definition.type,
    requiredCapability: definition.requiredCapability,
    aspectRatio: definition.aspectRatio,
    count: definition.count,
    promptSummary: compiled.promptSummary,
    promptLineage: compiled.promptLineage,
    ...(providerCall === undefined ? {} : { providerCallId: providerCall.callId, providerCallStatus: providerCall.status }),
    generatedAssetIds: assets.map((asset) => asset.assetId),
    ...(error === undefined ? {} : { error })
  };
}

function createBatch002Manifest(
  batchRunId: string,
  dslSource: Extract<DslSourceResult, { ok: true }>,
  repositories: ArtTaskRepositories,
  tasks: Batch002TaskManifest[]
): Batch002Manifest {
  const assets = repositories.generatedAssets.list().map((asset) => assetManifestFromAsset(asset, repositories));
  return {
    batchRunId,
    batchId: BATCH_002_ID,
    batchPurpose: BATCH_002_PURPOSE,
    sourceDslPath: dslSource.path,
    sourceDslHash: dslSource.sha256,
    taskCount: BATCH_002_TASK_DEFINITIONS.length,
    providerCallCount: repositories.providerCalls.list().length,
    totalRequestedImages: getBatch002RequestedImageCount(),
    generatedAssetCount: assets.length,
    reviewState: 'pending_human_review',
    autoApproval: false,
    autoSelection: false,
    tasks,
    assets
  };
}

function assetManifestFromAsset(asset: GeneratedAsset, repositories: ArtTaskRepositories): Batch002AssetManifest {
  const task = repositories.artTasks.get(asset.taskId);
  return {
    assetId: asset.assetId,
    taskId: asset.taskId,
    type: task?.type ?? 'skill_icon',
    providerId: asset.providerId,
    modelId: asset.modelId,
    ...(asset.localPath === undefined ? {} : { localPath: asset.localPath }),
    ...(asset.storagePath === undefined ? {} : { storagePath: asset.storagePath }),
    ...(asset.temporaryUrl === undefined ? {} : { temporaryUrl: asset.temporaryUrl }),
    status: asset.status
  };
}

async function writeBatch002ReviewArtifacts(manifest: Batch002Manifest): Promise<{ manifestPath: string; indexPath: string }> {
  const batchDir = join('artifacts', 'generated-assets', BATCH_002_ID);
  await mkdir(batchDir, { recursive: true });
  const manifestPath = join(batchDir, 'review-manifest.json');
  const indexPath = join(batchDir, 'review-index.md');
  await Promise.all([
    writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
    writeFile(indexPath, renderReviewIndex(manifest), 'utf8')
  ]);
  return { manifestPath, indexPath };
}

function renderReviewIndex(manifest: Batch002Manifest): string {
  const lines = [
    '# Batch 002 ChiYan Review Index',
    '',
    `Batch run: ${manifest.batchRunId}`,
    `Purpose: ${manifest.batchPurpose}`,
    `Source DSL: ${manifest.sourceDslPath}`,
    `Source DSL hash: ${manifest.sourceDslHash}`,
    `Review state: ${manifest.reviewState}`,
    `Requested images: ${manifest.totalRequestedImages}/${BATCH_002_MAX_IMAGES}`,
    '',
    'Assets remain generated for human review. No asset is selected or approved by this script.',
    '',
    'Review checklist for each asset:',
    '',
    '- task fit',
    '- ChiYan direction fit',
    '- gameplay readability',
    '- processability',
    '- style consistency',
    '- approve / selected / needs_revision / rejected',
    ''
  ];

  for (const task of manifest.tasks) {
    const assets = manifest.assets.filter((asset) => asset.taskId === task.taskId);
    lines.push(`## ${task.taskId}`, '', `Type: ${task.type}`, `Prompt summary: ${task.promptSummary}`, '');
    if (assets.length === 0) {
      lines.push('- No generated assets recorded.', '');
      continue;
    }
    for (const asset of assets) {
      const displayPath = asset.localPath ?? asset.temporaryUrl ?? 'not stored locally';
      const linkTarget = asset.localPath === undefined ? displayPath : relative(join('artifacts', 'generated-assets', BATCH_002_ID), asset.localPath);
      lines.push(`- ${asset.assetId} (${asset.status})`, `  - Path: ${displayPath}`, `  - Preview: [open asset](${linkTarget})`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function deriveChiyanStyleBlock(sourceDslText: string): string {
  const candidates = sourceDslText
    .split(/[\n。.!?！？；;]+/u)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter((part) => part.length > 0 && CHIYAN_ANCHOR_PATTERN.test(part));
  const combined = candidates.join('；');
  if (combined.length === 0) {
    throw new Error('ChiYan Battlefield DSL did not include recognizable visual anchors.');
  }
  return summarizeAtSentenceBoundary(combined, 520);
}

function summarizeAtSentenceBoundary(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  const clipped = value.slice(0, maxLength);
  const boundary = Math.max(clipped.lastIndexOf('；'), clipped.lastIndexOf(','), clipped.lastIndexOf('，'));
  return boundary > 120 ? clipped.slice(0, boundary) : clipped;
}

function sharedNegativePrompt(): string {
  return [
    'text',
    'watermark',
    'logo',
    'copyright mark',
    'blurry',
    'low quality',
    'unreadable silhouette',
    'messy composition',
    'extra limbs',
    'deformed hands',
    'malformed body',
    'duplicated character',
    'random UI text',
    'photorealistic',
    'modern sci-fi',
    'unrelated style',
    'cluttered background'
  ].join(', ');
}

function formatSafeError(error: unknown): ProviderCallError | { message: string } {
  if (error instanceof ArtProviderAdapterError) {
    return safeProviderError(error.normalizedError);
  }
  return {
    message: error instanceof Error ? error.message : 'ChiYan Batch 002 ArtTask generation failed.'
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

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function normalizeEnvValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}

function timestampForId(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function isMainModule(importMetaUrl: string, argvPath: string | undefined): boolean {
  return argvPath !== undefined && importMetaUrl === pathToFileURL(resolve(argvPath)).href;
}

const CHIYAN_ANCHOR_PATTERN =
  /赤炎|ChiYan|chiyan|battlefield|战场|火|焰|炎|熔|灰烬|岩浆|lava|magma|molten|ember|ash|basalt|volcanic|bronze|armor|盔甲|铠甲|红|橙|black/i;

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
