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

export const BATCH_002B_ID = 'batch-002b' as const;
export const BATCH_002B_PURPOSE = 'ChiYan side-scrolling run-and-gun production-candidate generation batch' as const;
export const BATCH_002B_MAX_IMAGES = 11 as const;
export const BATCH_002B_GAME_FORMAT = 'side_scrolling_run_and_gun' as const;
export const CHIYAN_SIDE_RUNNER_SOURCE_DSL_ID = 'chiyan-battlefield-side-runner-dsl-v1' as const;
export const CHIYAN_SIDE_RUNNER_ART_BIBLE_ID = 'chiyan-battlefield-side-runner-art-bible-v1' as const;
export const CHIYAN_SIDE_RUNNER_PROMPT_TEMPLATE_ID = 'chiyan-batch-002b-side-runner-v1' as const;
export const CHIYAN_SIDE_RUNNER_DEFAULT_BASE_URL = 'https://api.minimaxi.com' as const;
export const CHIYAN_SIDE_RUNNER_DEFAULT_IMAGE_MODEL = 'image-01' as const;
export const CHIYAN_SIDE_RUNNER_DSL_MISSING_MESSAGE =
  'ChiYan side-runner DSL not found. Provide CHIYAN_BATTLEFIELD_DSL_PATH or add docs/art-pipeline/dsl/chiyan-battlefield-side-runner.dsl.' as const;
export const CHIYAN_SIDE_RUNNER_DSL_TEST_ONLY_MESSAGE =
  'ChiYan Batch 002b source DSL is marked test-only and cannot be used for live generation.' as const;
export const CHIYAN_SIDE_RUNNER_DSL_LIVE_ALLOWED_MISSING_MESSAGE =
  'ChiYan Batch 002b source DSL must contain LIVE_GENERATION_ALLOWED true before live generation.' as const;
export const CHIYAN_SIDE_RUNNER_DSL_CONSTRAINTS_MISSING_MESSAGE =
  'ChiYan Batch 002b source DSL must include side-scrolling run-and-gun production constraints.' as const;

const DEFAULT_CHIYAN_SIDE_RUNNER_DSL_CANDIDATE_PATHS = ['docs/art-pipeline/dsl/chiyan-battlefield-side-runner.dsl'] as const;

export type ChiyanBatch002bTaskDefinition = {
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

export type ChiyanBatch002bPromptLineage = {
  sourceDslId: typeof CHIYAN_SIDE_RUNNER_SOURCE_DSL_ID;
  sourceDslPath: string;
  sourceDslHash: string;
  artBibleId: typeof CHIYAN_SIDE_RUNNER_ART_BIBLE_ID;
  promptTemplateId: typeof CHIYAN_SIDE_RUNNER_PROMPT_TEMPLATE_ID;
  compiledPromptHash: string;
  compiledAt: string;
};

export type ChiyanBatch002bCompiledPrompt = {
  compiledPrompt: string;
  negativePrompt: string;
  promptSummary: string;
  promptLineage: ChiyanBatch002bPromptLineage;
};

type Batch002bGateResult =
  | {
      status: 'skip';
      message: string;
      providerCallCount: 0;
    }
  | {
      status: 'error';
      message: string;
      providerCallCount: 0;
    }
  | {
      status: 'run';
      env: {
        MINIMAX_BASE_URL: string;
        MINIMAX_IMAGE_MODEL: string;
      };
    };

type SideRunnerDslSourceResult =
  | {
      ok: true;
      path: string;
      text: string;
      sha256: string;
    }
  | {
      ok: false;
      message: typeof CHIYAN_SIDE_RUNNER_DSL_MISSING_MESSAGE;
    };

type SideRunnerDslLiveValidationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message:
        | typeof CHIYAN_SIDE_RUNNER_DSL_TEST_ONLY_MESSAGE
        | typeof CHIYAN_SIDE_RUNNER_DSL_LIVE_ALLOWED_MISSING_MESSAGE
        | typeof CHIYAN_SIDE_RUNNER_DSL_CONSTRAINTS_MISSING_MESSAGE;
    };

type Batch002bTaskManifest = {
  taskId: string;
  type: ArtAssetType;
  requiredCapability: 'image.generate';
  aspectRatio: AspectRatio;
  count: number;
  promptSummary: string;
  promptLineage: ChiyanBatch002bPromptLineage;
  providerCallId?: string;
  providerCallStatus?: ProviderCall['status'];
  generatedAssetIds: string[];
  error?: ProviderCallError | { message: string };
};

type Batch002bAssetManifest = {
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

type Batch002bManifest = {
  batchRunId: string;
  batchId: typeof BATCH_002B_ID;
  batchPurpose: typeof BATCH_002B_PURPOSE;
  sourceDslPath: string;
  sourceDslHash: string;
  gameFormat: typeof BATCH_002B_GAME_FORMAT;
  taskCount: 7;
  providerCallCount: number;
  totalRequestedImages: 11;
  generatedAssetCount: number;
  reviewState: 'pending_human_review';
  autoApproval: false;
  autoSelection: false;
  tasks: Batch002bTaskManifest[];
  assets: Batch002bAssetManifest[];
};

export const BATCH_002B_TASK_DEFINITIONS: readonly ChiyanBatch002bTaskDefinition[] = [
  {
    id: 'player_character_concept_chiyan',
    type: 'character_concept',
    requiredCapability: 'image.generate',
    aspectRatio: '3:4',
    count: 3,
    responseFormat: 'base64',
    assetInstruction:
      '横版跑枪玩家角色生产概念。Strict side-view / side-on camera, 2D side-scrolling run-and-gun player character, full body, readable silhouette, holding fantasy ChiYan ranged weapon such as ember rifle / flame repeater / fire-lance / arm cannon, aiming horizontally, running or combat-ready pose, animation-ready proportions, no front-facing hero poster, no vertical card art, no text, no logo, no watermark.',
    negativePrompt: sharedSideRunnerNegativePrompt(),
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
      '横版跑枪敌人概念。Side-view enemy for a 2D side-scrolling run-and-gun game, readable at gameplay scale, designed for horizontal lane combat, clear weak points and attack silhouette, can face the player from left or right, ChiYan black armor / ember / ash / basalt visual language, no giant splash-art-only boss poster unless explicitly side-view, no text, no logo, no watermark.',
    negativePrompt: sharedSideRunnerNegativePrompt(),
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
      '横版跑枪关卡背景。Wide 16:9 landscape, 2D side-scrolling game background for run-and-gun combat, clear horizontal traversal route, readable walkable platform line, foreground / midground / background parallax layers, scorched basalt battlefield, red cliffs, ash, ember haze, leave gameplay readability space, no characters dominating the image, no title, no text, no logo, no watermark.',
    negativePrompt: `${sharedSideRunnerNegativePrompt()}, character, person, monster, UI overlay, icon, menu, title`,
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
      '技能图标。Square game skill icon for ChiYan flame slash / forward attack, readable at small size, strong silhouette, high contrast ember motion, no text, no logo, no UI labels, no watermark.',
    negativePrompt: `${sharedSideRunnerNegativePrompt()}, multiple icons, full character, tiny details, unreadable at small size, text label`,
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
      '技能图标。Square game skill icon for defensive ash shield / ember guard, readable at small size, strong silhouette, high contrast protection shape, no text, no logo, no UI labels, no watermark.',
    negativePrompt: `${sharedSideRunnerNegativePrompt()}, multiple icons, full character, tiny details, unreadable at small size, text label`,
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
      '技能图标。Square game skill icon for explosive ChiYan battle burst, readable at small size, centered burst subject, high contrast ember explosion, no text, no logo, no UI labels, no watermark.',
    negativePrompt: `${sharedSideRunnerNegativePrompt()}, multiple icons, full character, tiny details, unreadable at small size, text label`,
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
      '横版跑枪 HUD 概念。16:9 horizontal run-and-gun HUD overlay, health bar, ammo/energy meter, skill slots, boss bar, minimap or progress indicator, use abstract glyph placeholders only, no readable text, no fake English/Chinese labels, no text, no logo, no watermark.',
    negativePrompt: `${sharedSideRunnerNegativePrompt()}, readable labels, fake English labels, fake Chinese labels, product logo`,
    autoSelect: false,
    autoApprove: false
  }
];

export function getBatch002bRequestedImageCount(
  definitions: readonly ChiyanBatch002bTaskDefinition[] = BATCH_002B_TASK_DEFINITIONS
): 11 {
  const total = definitions.reduce((sum, definition) => sum + definition.count, 0);
  if (total !== 11) {
    throw new Error(`ChiYan Batch 002b expected 11 requested images but found ${total}.`);
  }
  return total;
}

export function evaluateBatch002bGate(env: Record<string, string | undefined>): Batch002bGateResult {
  if (env.RUN_CHIYAN_BATCH_002B !== '1') {
    return {
      status: 'skip',
      message: 'Skipping ChiYan Batch 002b',
      providerCallCount: 0
    };
  }

  if (env.RUN_MINIMAX_LIVE_TESTS !== '1') {
    return {
      status: 'error',
      message: 'ChiYan Batch 002b requires RUN_MINIMAX_LIVE_TESTS=1 when RUN_CHIYAN_BATCH_002B=1.',
      providerCallCount: 0
    };
  }

  if ((env.MINIMAX_API_KEY ?? '').trim().length === 0) {
    return {
      status: 'error',
      message: 'ChiYan Batch 002b requires MINIMAX_API_KEY when RUN_CHIYAN_BATCH_002B=1.',
      providerCallCount: 0
    };
  }

  return {
    status: 'run',
    env: {
      MINIMAX_BASE_URL: normalizeEnvValue(env.MINIMAX_BASE_URL) ?? CHIYAN_SIDE_RUNNER_DEFAULT_BASE_URL,
      MINIMAX_IMAGE_MODEL: normalizeEnvValue(env.MINIMAX_IMAGE_MODEL) ?? CHIYAN_SIDE_RUNNER_DEFAULT_IMAGE_MODEL
    }
  };
}

export async function resolveChiyanSideRunnerDslSource(input: {
  env?: Record<string, string | undefined>;
  repoRoot?: string;
  candidatePaths?: readonly string[];
} = {}): Promise<SideRunnerDslSourceResult> {
  const env = input.env ?? process.env;
  const repoRoot = input.repoRoot ?? process.cwd();
  const envPath = normalizeEnvValue(env.CHIYAN_BATTLEFIELD_DSL_PATH);
  const candidatePaths = envPath === undefined ? input.candidatePaths ?? DEFAULT_CHIYAN_SIDE_RUNNER_DSL_CANDIDATE_PATHS : [envPath];

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
    message: CHIYAN_SIDE_RUNNER_DSL_MISSING_MESSAGE
  };
}

export function validateChiyanSideRunnerDslForLiveGeneration(sourceDslText: string): SideRunnerDslLiveValidationResult {
  if (/TEST_ONLY_DO_NOT_USE_FOR_LIVE_GENERATION/.test(sourceDslText) || /LIVE_GENERATION_ALLOWED\s+false/.test(sourceDslText)) {
    return {
      ok: false,
      message: CHIYAN_SIDE_RUNNER_DSL_TEST_ONLY_MESSAGE
    };
  }

  if (!/LIVE_GENERATION_ALLOWED\s+true/.test(sourceDslText)) {
    return {
      ok: false,
      message: CHIYAN_SIDE_RUNNER_DSL_LIVE_ALLOWED_MISSING_MESSAGE
    };
  }

  if (!hasSideRunnerProductionConstraints(sourceDslText)) {
    return {
      ok: false,
      message: CHIYAN_SIDE_RUNNER_DSL_CONSTRAINTS_MISSING_MESSAGE
    };
  }

  return { ok: true };
}

export function buildChiyanBatch002bPrompt(input: {
  sourceDslText: string;
  sourceDslPath: string;
  sourceDslHash: string;
  taskDefinition: ChiyanBatch002bTaskDefinition;
  providerPromptLimit?: number;
  now?: () => Date;
}): ChiyanBatch002bCompiledPrompt {
  const providerPromptLimit = input.providerPromptLimit ?? MINIMAX_MAX_PROMPT_LENGTH;
  const styleBlock = deriveChiyanSideRunnerStyleBlock(input.sourceDslText);
  const compiledPrompt = [
    'Project: 赤炎战场 / ChiYan Battlefield.',
    'Format: 2D side-scrolling run-and-gun, strict side-view / side-on camera.',
    'Readability: horizontal combat lane, clear platform line, silhouette first, production asset candidate.',
    'Weapons: stylized fantasy ChiYan ranged weapons: ember rifle, flame repeater, fire-lance, arm cannon, explosive fire bolts; not modern military realism.',
    `DSL anchors: ${styleBlock}`,
    `Asset: ${input.taskDefinition.type}. ${input.taskDefinition.assetInstruction}`,
    `Output: ${input.taskDefinition.aspectRatio}, count ${input.taskDefinition.count}, ${input.taskDefinition.responseFormat}.`
  ].join('\n');

  if (compiledPrompt.length > providerPromptLimit) {
    throw new Error(
      `ChiYan Batch 002b ${input.taskDefinition.type} compiled prompt length ${compiledPrompt.length} exceeds provider limit ${providerPromptLimit}.`
    );
  }

  const compiledAt = (input.now ?? (() => new Date()))().toISOString();
  return {
    compiledPrompt,
    negativePrompt: input.taskDefinition.negativePrompt,
    promptSummary: `${input.taskDefinition.id}: ${input.taskDefinition.assetInstruction}`,
    promptLineage: {
      sourceDslId: CHIYAN_SIDE_RUNNER_SOURCE_DSL_ID,
      sourceDslPath: input.sourceDslPath,
      sourceDslHash: input.sourceDslHash,
      artBibleId: CHIYAN_SIDE_RUNNER_ART_BIBLE_ID,
      promptTemplateId: CHIYAN_SIDE_RUNNER_PROMPT_TEMPLATE_ID,
      compiledPromptHash: sha256Hex(compiledPrompt),
      compiledAt
    }
  };
}

async function main(): Promise<void> {
  const gate = evaluateBatch002bGate(process.env);
  if (gate.status === 'skip') {
    console.log(gate.message);
    return;
  }
  if (gate.status === 'error') {
    console.error(gate.message);
    process.exitCode = 1;
    return;
  }

  assertBatch002bImageCap();
  const dslSource = await resolveChiyanSideRunnerDslSource();
  if (!dslSource.ok) {
    console.error(dslSource.message);
    process.exitCode = 1;
    return;
  }
  const dslLiveValidation = validateChiyanSideRunnerDslForLiveGeneration(dslSource.text);
  if (!dslLiveValidation.ok) {
    console.error(dslLiveValidation.message);
    process.exitCode = 1;
    return;
  }

  const batchRunId = `${BATCH_002B_ID}-${timestampForId(new Date())}`;
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

  const compiledPrompts = BATCH_002B_TASK_DEFINITIONS.map((definition) =>
    buildChiyanBatch002bPrompt({
      sourceDslText: dslSource.text,
      sourceDslPath: dslSource.path,
      sourceDslHash: dslSource.sha256,
      taskDefinition: definition
    })
  );

  const manifestTasks: Batch002bTaskManifest[] = [];
  for (const [index, definition] of BATCH_002B_TASK_DEFINITIONS.entries()) {
    const compiled = compiledPrompts[index];
    if (compiled === undefined) {
      throw new Error(`ChiYan Batch 002b prompt compiler did not produce prompt for ${definition.id}.`);
    }
    const task = repositories.artTasks.create(createBatch002bArtTask(batchRunId, definition, compiled));
    try {
      const result = await runner.runTask(task.taskId);
      manifestTasks.push(taskManifestFromRepositories(repositories, definition, task.taskId, compiled, result.providerCall));
    } catch (error) {
      const failedCall = repositories.providerCalls.listByTaskId(task.taskId).at(-1);
      manifestTasks.push(taskManifestFromRepositories(repositories, definition, task.taskId, compiled, failedCall, formatSafeError(error)));
      await writeBatch002bReviewArtifacts(createBatch002bManifest(batchRunId, dslSource, repositories, manifestTasks));
      throw error;
    }
  }

  const manifest = createBatch002bManifest(batchRunId, dslSource, repositories, manifestTasks);
  const artifactPaths = await writeBatch002bReviewArtifacts(manifest);
  console.log(
    JSON.stringify(
      {
        batchRunId,
        sourceDslPath: dslSource.path,
        sourceDslHash: dslSource.sha256,
        gameFormat: manifest.gameFormat,
        taskCount: manifest.taskCount,
        providerCallCount: manifest.providerCallCount,
        totalRequestedImages: manifest.totalRequestedImages,
        generatedAssetCount: manifest.generatedAssetCount,
        outputFolderPath: join('artifacts', 'generated-assets', BATCH_002B_ID),
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

function assertBatch002bImageCap(): void {
  const requestedImages = getBatch002bRequestedImageCount();
  if (requestedImages > BATCH_002B_MAX_IMAGES) {
    throw new Error(`ChiYan Batch 002b requests ${requestedImages} images, above the ${BATCH_002B_MAX_IMAGES} image cap.`);
  }
}

function createBatch002bArtTask(
  batchRunId: string,
  definition: ChiyanBatch002bTaskDefinition,
  compiled: ChiyanBatch002bCompiledPrompt
): ArtTask {
  return {
    taskId: `${batchRunId}-${definition.id}`,
    projectId: BATCH_002B_ID,
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
  definition: ChiyanBatch002bTaskDefinition,
  taskId: string,
  compiled: ChiyanBatch002bCompiledPrompt,
  providerCall: ProviderCall | undefined,
  error?: Batch002bTaskManifest['error']
): Batch002bTaskManifest {
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

function createBatch002bManifest(
  batchRunId: string,
  dslSource: Extract<SideRunnerDslSourceResult, { ok: true }>,
  repositories: ArtTaskRepositories,
  tasks: Batch002bTaskManifest[]
): Batch002bManifest {
  const assets = repositories.generatedAssets.list().map((asset) => assetManifestFromAsset(asset, repositories));
  return {
    batchRunId,
    batchId: BATCH_002B_ID,
    batchPurpose: BATCH_002B_PURPOSE,
    sourceDslPath: dslSource.path,
    sourceDslHash: dslSource.sha256,
    gameFormat: BATCH_002B_GAME_FORMAT,
    taskCount: 7,
    providerCallCount: repositories.providerCalls.list().length,
    totalRequestedImages: 11,
    generatedAssetCount: assets.length,
    reviewState: 'pending_human_review',
    autoApproval: false,
    autoSelection: false,
    tasks,
    assets
  };
}

function assetManifestFromAsset(asset: GeneratedAsset, repositories: ArtTaskRepositories): Batch002bAssetManifest {
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

async function writeBatch002bReviewArtifacts(manifest: Batch002bManifest): Promise<{ manifestPath: string; indexPath: string }> {
  const batchDir = join('artifacts', 'generated-assets', BATCH_002B_ID);
  await mkdir(batchDir, { recursive: true });
  const manifestPath = join(batchDir, 'review-manifest.json');
  const indexPath = join(batchDir, 'review-index.md');
  await Promise.all([
    writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
    writeFile(indexPath, renderReviewIndex(manifest), 'utf8')
  ]);
  return { manifestPath, indexPath };
}

function renderReviewIndex(manifest: Batch002bManifest): string {
  const lines = [
    '# Batch 002b ChiYan Side-Runner Review Index',
    '',
    `Batch run: ${manifest.batchRunId}`,
    `Purpose: ${manifest.batchPurpose}`,
    `Game format: ${manifest.gameFormat}`,
    `Source DSL: ${manifest.sourceDslPath}`,
    `Source DSL hash: ${manifest.sourceDslHash}`,
    `Review state: ${manifest.reviewState}`,
    `Requested images: ${manifest.totalRequestedImages}/${BATCH_002B_MAX_IMAGES}`,
    '',
    'Assets remain generated for human review. No asset is selected or approved by this script.',
    '',
    'Review checklist for each asset:',
    '',
    '- side-view / side-scrolling run-and-gun fit',
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
      const linkTarget = asset.localPath === undefined ? displayPath : relative(join('artifacts', 'generated-assets', BATCH_002B_ID), asset.localPath);
      lines.push(`- ${asset.assetId} (${asset.status})`, `  - Path: ${displayPath}`, `  - Preview: [open asset](${linkTarget})`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function deriveChiyanSideRunnerStyleBlock(sourceDslText: string): string {
  if (!CHIYAN_SIDE_RUNNER_VISUAL_ANCHOR_PATTERN.test(sourceDslText)) {
    throw new Error('ChiYan side-runner DSL did not include recognizable side-runner ChiYan anchors.');
  }

  const candidates = sourceDslText
    .split(/[\n。.!?！？；;]+/u)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter((part) => part.length > 0 && CHIYAN_SIDE_RUNNER_ANCHOR_PATTERN.test(part));
  const combined = candidates.join('；');
  if (combined.length === 0) {
    throw new Error('ChiYan side-runner DSL did not include recognizable side-runner ChiYan anchors.');
  }
  return summarizeAtSentenceBoundary(combined, 220);
}

function summarizeAtSentenceBoundary(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  const clipped = value.slice(0, maxLength);
  const boundary = Math.max(clipped.lastIndexOf('；'), clipped.lastIndexOf(','), clipped.lastIndexOf('，'));
  return boundary > 80 ? clipped.slice(0, boundary) : clipped;
}

function hasSideRunnerProductionConstraints(sourceDslText: string): boolean {
  return SIDE_RUNNER_REQUIRED_PATTERNS.every((pattern) => pattern.test(sourceDslText));
}

function sharedSideRunnerNegativePrompt(): string {
  return [
    'readable text',
    'fake text',
    'logo',
    'watermark',
    'title card',
    'poster layout',
    'vertical card art',
    'front-facing hero portrait',
    'MOBA splash art',
    'generic fantasy',
    'modern military rifle realism',
    'sci-fi neon armor',
    'unreadable silhouette',
    'overexposed flames',
    'fake UI labels'
  ].join(', ');
}

function formatSafeError(error: unknown): ProviderCallError | { message: string } {
  if (error instanceof ArtProviderAdapterError) {
    return safeProviderError(error.normalizedError);
  }
  return {
    message: error instanceof Error ? error.message : 'ChiYan Batch 002b ArtTask generation failed.'
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

const SIDE_RUNNER_REQUIRED_PATTERNS = [
  /side[-\s]?scrolling[\s\S]*run[-\s]?and[-\s]?gun|run[-\s]?and[-\s]?gun[\s\S]*side[-\s]?scrolling/i,
  /strict\s+side[-\s]?view|side[-\s]?on\s+camera/i,
  /horizontal\s+combat\s+lane/i,
  /platform\s+readability/i,
  /clear\s+silhouettes/i,
  /left-to-right|right-to-left|horizontal\s+action/i,
  /ember\s+rifle/i,
  /flame\s+repeater/i,
  /fire-lance/i,
  /arm\s+cannon/i,
  /explosive\s+fire\s+bolts/i
] as const;

const CHIYAN_SIDE_RUNNER_ANCHOR_PATTERN =
  /赤炎|ChiYan|chiyan|side[-\s]?scrolling|run[-\s]?and[-\s]?gun|side[-\s]?view|side[-\s]?on|horizontal|platform|ember rifle|flame repeater|fire-lance|arm cannon|fire bolts|battlefield|战场|火|焰|炎|熔|灰烬|岩浆|lava|magma|molten|ember|ash|basalt|volcanic|bronze|armor|盔甲|铠甲|红|橙|black/i;

const CHIYAN_SIDE_RUNNER_VISUAL_ANCHOR_PATTERN =
  /赤炎|ChiYan|chiyan|crimson|blackened iron|basalt|ember|ash|bronze|scorched|fire-lance|flame repeater|arm cannon|battlefield|战场|炎|熔|灰烬|岩浆/i;

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
