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
  type ArtAssetType,
  type ArtTask,
  type ArtTaskRepositories,
  type AspectRatio,
  type GeneratedAsset,
  type NormalizedProviderError,
  type ProviderCall,
  type ProviderCallError
} from '../packages/asset-pipeline/src/index.js';
import {
  ProductionCleanSideRunnerV1,
  evaluateArtProductionQualityGate,
  type ArtQualityGateBlockingIssue,
  type ArtQualityGateCheck,
  type ArtBatchPromptGateStatus,
  type GenerationExecutionStatus,
  type ImageContentGateStatus,
  type ProductionApprovalStatus,
  type ProductionClosureStatus,
  type PromptQualityGateStatus
} from './art-quality-gates.js';

export const BATCH_002C_ID = 'batch-002c' as const;
export const BATCH_002C_PARENT_BATCH_ID = 'batch-002b' as const;
export const BATCH_002C_PURPOSE = 'ChiYan side-scrolling run-and-gun production-candidate cleanup generation batch' as const;
export const BATCH_002C_GAME_FORMAT = 'side_scrolling_run_and_gun' as const;
export const BATCH_002C_TOTAL_REQUESTED_IMAGES = 13 as const;
export const BATCH_002C_DEFAULT_BASE_URL = 'https://api.minimaxi.com' as const;
export const BATCH_002C_DEFAULT_IMAGE_MODEL = 'image-01' as const;
export const BATCH_002C_DSL_MISSING_MESSAGE =
  'ChiYan side-runner cleanup DSL not found. Provide CHIYAN_BATTLEFIELD_DSL_PATH or add docs/art-pipeline/dsl/chiyan-battlefield-side-runner-cleanup.dsl.' as const;
export const BATCH_002C_DSL_TEST_ONLY_MESSAGE = 'ChiYan Batch 002c source DSL is marked test-only and cannot be used for live generation.' as const;
export const BATCH_002C_DSL_LIVE_ALLOWED_MISSING_MESSAGE =
  'ChiYan Batch 002c source DSL must contain LIVE_GENERATION_ALLOWED true before live generation.' as const;
export const BATCH_002C_DSL_SIDE_RUNNER_MISSING_MESSAGE =
  'ChiYan Batch 002c source DSL must include side-scrolling run-and-gun constraints.' as const;
export const BATCH_002C_DSL_CLEANUP_MISSING_MESSAGE =
  'ChiYan Batch 002c source DSL must include cleanup constraints for no text, logo, watermark, signature, and title artifacts.' as const;
export const BATCH_002C_DSL_GENERIC_FALLBACK_MESSAGE = 'ChiYan Batch 002c source DSL must forbid generic fantasy fallback.' as const;

const DEFAULT_BATCH_002C_DSL_CANDIDATE_PATHS = ['docs/art-pipeline/dsl/chiyan-battlefield-side-runner-cleanup.dsl'] as const;

export type Batch002cTaskDefinition = {
  readonly id: string;
  readonly type: ArtAssetType;
  readonly requiredCapability: 'image.generate';
  readonly aspectRatio: AspectRatio;
  readonly count: number;
  readonly responseFormat: 'base64';
  readonly prompt: string;
  readonly negativePrompt: string;
  readonly autoSelect: false;
  readonly autoApprove: false;
};

type Batch002cGateResult =
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

type Batch002cDslSourceResult =
  | {
      ok: true;
      path: string;
      text: string;
      sha256: string;
    }
  | {
      ok: false;
      message: typeof BATCH_002C_DSL_MISSING_MESSAGE;
    };

type Batch002cDslValidationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message:
        | typeof BATCH_002C_DSL_TEST_ONLY_MESSAGE
        | typeof BATCH_002C_DSL_LIVE_ALLOWED_MISSING_MESSAGE
        | typeof BATCH_002C_DSL_SIDE_RUNNER_MISSING_MESSAGE
        | typeof BATCH_002C_DSL_CLEANUP_MISSING_MESSAGE
        | typeof BATCH_002C_DSL_GENERIC_FALLBACK_MESSAGE;
    };

type Batch002cPromptLineage = {
  sourceDslPath: string;
  sourceDslHash: string;
  promptTemplateId: 'chiyan-batch-002c-cleanup-v1';
  compiledPromptHash: string;
  compiledAt: string;
};

type Batch002cTaskManifest = {
  taskId: string;
  type: ArtAssetType;
  requiredCapability: 'image.generate';
  aspectRatio: AspectRatio;
  count: number;
  prompt: string;
  negativePrompt: string;
  promptLineage: Batch002cPromptLineage;
  providerCallId?: string;
  providerCallStatus?: ProviderCall['status'];
  generatedAssetIds: string[];
  error?: ProviderCallError | { message: string };
};

type Batch002cAssetManifest = {
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

export type Batch002cManifest = {
  batchRunId: string;
  batchId: typeof BATCH_002C_ID;
  batchPurpose: typeof BATCH_002C_PURPOSE;
  parentBatchId: typeof BATCH_002C_PARENT_BATCH_ID;
  cleanupTargets: readonly ['watermark', 'logo', 'fake_text', 'signature', 'side_view_strictness'];
  sourceDslPath: string;
  sourceDslHash: string;
  gameFormat: typeof BATCH_002C_GAME_FORMAT;
  taskCount: 6;
  providerCallCount: number;
  totalRequestedImages: number;
  generatedAssetCount: number;
  generationExecutionStatus: GenerationExecutionStatus;
  reviewState: 'pending_human_review';
  autoApproval: false;
  autoSelection: false;
  qualityGateProfile: 'ProductionCleanSideRunnerV1';
  qualityGateVersion: '1.0';
  qualityGateStatus: 'pending_human_review' | 'fail';
  promptQualityGateStatus: PromptQualityGateStatus;
  promptGateStatus: ArtBatchPromptGateStatus;
  imageContentGateStatus: ImageContentGateStatus;
  productionApprovalStatus: ProductionApprovalStatus;
  productionClosureStatus: ProductionClosureStatus;
  qualityGateChecks: ArtQualityGateCheck[];
  blockingIssues: readonly ArtQualityGateBlockingIssue[];
  tasks: Batch002cTaskManifest[];
  assets: Batch002cAssetManifest[];
  reviewIndexText?: string;
};

export const BATCH_002C_TASK_DEFINITIONS: readonly Batch002cTaskDefinition[] = [
  {
    id: 'player_character_concept_chiyan_clean',
    type: 'character_concept',
    requiredCapability: 'image.generate',
    aspectRatio: '3:4',
    count: 3,
    responseFormat: 'base64',
    prompt:
      'Production concept sheet, plain neutral background, full body strict side-view / side-on 2D side-scrolling run-and-gun player character, horizontal combat lane aiming pose, gameplay-scale readable silhouette, animation-ready proportions, fantasy ChiYan ranged weapon, black armor, ember highlights, crimson cloth, no front-facing hero portrait, no 3/4 splash art, no poster layout, no cropped body, no title area, no footer, no corner mark, no signature, no logo, no text, no watermark, no copyright mark, not chibi.',
    negativePrompt: cleanupNegativePrompt(),
    autoSelect: false,
    autoApprove: false
  },
  {
    id: 'enemy_concept_chiyan_clean',
    type: 'enemy_concept',
    requiredCapability: 'image.generate',
    aspectRatio: '3:4',
    count: 3,
    responseFormat: 'base64',
    prompt:
      'Production enemy concept sheet, plain neutral background, full body strict side-view enemy for 2D side-scrolling run-and-gun, horizontal lane combat silhouette, readable weak point, attack silhouette clear at small gameplay-scale, ChiYan black armor, ember, ash, basalt language, no boss splash-art-only poster, not boss splash art unless strict side-view, no poster layout, no title, no logo, no watermark, no signature, no footer text, no corner emblem, no text.',
    negativePrompt: cleanupNegativePrompt(),
    autoSelect: false,
    autoApprove: false
  },
  {
    id: 'skill_icon_chiyan_flame_slash_clean',
    type: 'skill_icon',
    requiredCapability: 'image.generate',
    aspectRatio: '1:1',
    count: 2,
    responseFormat: 'base64',
    prompt:
      '1:1 square skill icon, icon glyph only, centered abstract flame slash symbol, readable at 64x64, no character, no badge frame with words, no corner logo, no corner marks, no text, no letters, no numbers, no UI labels, no logo, no watermark, no signature, no title.',
    negativePrompt: cleanupNegativePrompt(),
    autoSelect: false,
    autoApprove: false
  },
  {
    id: 'skill_icon_chiyan_ash_guard_clean',
    type: 'skill_icon',
    requiredCapability: 'image.generate',
    aspectRatio: '1:1',
    count: 2,
    responseFormat: 'base64',
    prompt:
      '1:1 square skill icon, icon glyph only, centered abstract ash shield / ember guard glyph only, readable at 64x64, no character, no badge frame with words, no corner logo, no corner marks, no text, no letters, no numbers, no UI labels, no logo, no watermark, no signature, no title.',
    negativePrompt: cleanupNegativePrompt(),
    autoSelect: false,
    autoApprove: false
  },
  {
    id: 'skill_icon_chiyan_battle_burst_clean',
    type: 'skill_icon',
    requiredCapability: 'image.generate',
    aspectRatio: '1:1',
    count: 2,
    responseFormat: 'base64',
    prompt:
      '1:1 square skill icon, icon glyph only, centered abstract explosive battle burst glyph only, readable at 64x64, no character, no badge frame with words, no corner logo, no corner marks, no text, no letters, no numbers, no UI labels, no logo, no watermark, no signature, no title.',
    negativePrompt: cleanupNegativePrompt(),
    autoSelect: false,
    autoApprove: false
  },
  {
    id: 'ui_concept_chiyan_battle_hud_clean',
    type: 'ui_concept',
    requiredCapability: 'image.generate',
    aspectRatio: '16:9',
    count: 1,
    responseFormat: 'base64',
    prompt:
      '16:9 HUD mockup for horizontal run-and-gun, abstract placeholder bars only, abstract icon slots only, empty red bars, simple square/circle placeholders, no readable glyphs, no characters dominating the UI, no readable labels, no labels, no fake language, no fake English, no fake Chinese, no letters, no numbers, no logo, no watermark, no title, no footer, no corner signature, no decorative typography.',
    negativePrompt: cleanupNegativePrompt(),
    autoSelect: false,
    autoApprove: false
  }
];

export function getBatch002cRequestedImageCount(definitions: readonly Batch002cTaskDefinition[] = BATCH_002C_TASK_DEFINITIONS): number {
  return definitions.reduce((total, definition) => total + definition.count, 0);
}

export function evaluateBatch002cGate(env: Record<string, string | undefined>): Batch002cGateResult {
  if (env.RUN_CHIYAN_BATCH_002C !== '1') {
    return {
      status: 'skip',
      message: 'Skipping ChiYan Batch 002c',
      providerCallCount: 0
    };
  }
  if (env.RUN_MINIMAX_LIVE_TESTS !== '1') {
    return {
      status: 'error',
      message: 'ChiYan Batch 002c requires RUN_MINIMAX_LIVE_TESTS=1 when RUN_CHIYAN_BATCH_002C=1.',
      providerCallCount: 0
    };
  }
  if ((env.MINIMAX_API_KEY ?? '').trim().length === 0) {
    return {
      status: 'error',
      message: 'ChiYan Batch 002c requires MINIMAX_API_KEY when RUN_CHIYAN_BATCH_002C=1.',
      providerCallCount: 0
    };
  }

  return {
    status: 'run',
    env: {
      MINIMAX_BASE_URL: normalizeEnvValue(env.MINIMAX_BASE_URL) ?? BATCH_002C_DEFAULT_BASE_URL,
      MINIMAX_IMAGE_MODEL: normalizeEnvValue(env.MINIMAX_IMAGE_MODEL) ?? BATCH_002C_DEFAULT_IMAGE_MODEL
    }
  };
}

export async function resolveBatch002cDslSource(input: {
  env?: Record<string, string | undefined>;
  repoRoot?: string;
  candidatePaths?: readonly string[];
} = {}): Promise<Batch002cDslSourceResult> {
  const env = input.env ?? process.env;
  const repoRoot = input.repoRoot ?? process.cwd();
  const envPath = normalizeEnvValue(env.CHIYAN_BATTLEFIELD_DSL_PATH);
  const candidatePaths = envPath === undefined ? input.candidatePaths ?? DEFAULT_BATCH_002C_DSL_CANDIDATE_PATHS : [envPath];

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

  return { ok: false, message: BATCH_002C_DSL_MISSING_MESSAGE };
}

export function validateBatch002cDslForLiveGeneration(sourceDslText: string): Batch002cDslValidationResult {
  if (/TEST_ONLY_DO_NOT_USE_FOR_LIVE_GENERATION/.test(sourceDslText) || /LIVE_GENERATION_ALLOWED\s+false/.test(sourceDslText)) {
    return { ok: false, message: BATCH_002C_DSL_TEST_ONLY_MESSAGE };
  }
  if (!/LIVE_GENERATION_ALLOWED\s+true/.test(sourceDslText)) {
    return { ok: false, message: BATCH_002C_DSL_LIVE_ALLOWED_MISSING_MESSAGE };
  }
  if (!SIDE_RUNNER_REQUIRED_PATTERNS.every((pattern) => pattern.test(sourceDslText))) {
    return { ok: false, message: BATCH_002C_DSL_SIDE_RUNNER_MISSING_MESSAGE };
  }
  if (!CLEANUP_REQUIRED_PATTERNS.every((pattern) => pattern.test(sourceDslText))) {
    return { ok: false, message: BATCH_002C_DSL_CLEANUP_MISSING_MESSAGE };
  }
  if (!/generic_fantasy_fallback_allowed:\s*false|no\s+generic\s+fantasy\s+fallback/i.test(sourceDslText)) {
    return { ok: false, message: BATCH_002C_DSL_GENERIC_FALLBACK_MESSAGE };
  }
  return { ok: true };
}

export function buildBatch002cQualityGateManifest(input: {
  sourceDslPath: string;
  sourceDslHash: string;
  batchRunId?: string;
  providerCallCount?: number;
  generatedAssetCount?: number;
  generationExecutionStatus?: GenerationExecutionStatus;
  taskDefinitions?: readonly Batch002cTaskDefinition[];
  assets?: Batch002cAssetManifest[];
  now?: () => Date;
}): Batch002cManifest {
  const batchRunId = input.batchRunId ?? `${BATCH_002C_ID}-dry-run`;
  const taskDefinitions = input.taskDefinitions ?? BATCH_002C_TASK_DEFINITIONS;
  const compiledAt = (input.now ?? (() => new Date()))().toISOString();
  const tasks = taskDefinitions.map((definition) => createTaskManifest(batchRunId, definition, input.sourceDslPath, input.sourceDslHash, compiledAt));
  const reviewIndexText = renderBatch002cReviewIndexBase();
  const draft: Batch002cManifest = {
    batchRunId,
    batchId: BATCH_002C_ID,
    batchPurpose: BATCH_002C_PURPOSE,
    parentBatchId: BATCH_002C_PARENT_BATCH_ID,
    cleanupTargets: ['watermark', 'logo', 'fake_text', 'signature', 'side_view_strictness'],
    sourceDslPath: input.sourceDslPath,
    sourceDslHash: input.sourceDslHash,
    gameFormat: BATCH_002C_GAME_FORMAT,
    taskCount: 6,
    providerCallCount: input.providerCallCount ?? 0,
    totalRequestedImages: getBatch002cRequestedImageCount(taskDefinitions),
    generatedAssetCount: input.generatedAssetCount ?? 0,
    generationExecutionStatus: input.generationExecutionStatus ?? 'skipped',
    reviewState: 'pending_human_review',
    autoApproval: false,
    autoSelection: false,
    qualityGateProfile: ProductionCleanSideRunnerV1.profile,
    qualityGateVersion: ProductionCleanSideRunnerV1.version,
    qualityGateStatus: 'pending_human_review',
    promptQualityGateStatus: 'pass',
    promptGateStatus: 'passed',
    imageContentGateStatus: 'manual_review_required',
    productionApprovalStatus: 'pending_human_review',
    productionClosureStatus: 'open_pending_review',
    qualityGateChecks: [],
    blockingIssues: [],
    tasks,
    assets: input.assets ?? [],
    reviewIndexText
  };
  const qualityGateResult = evaluateArtProductionQualityGate(ProductionCleanSideRunnerV1, draft);
  return {
    ...draft,
    qualityGateStatus: qualityGateResult.qualityGateStatus === 'fail' ? 'fail' : 'pending_human_review',
    promptQualityGateStatus: qualityGateResult.promptQualityGateStatus,
    promptGateStatus: qualityGateResult.promptQualityGateStatus === 'pass' ? 'passed' : 'failed',
    imageContentGateStatus: qualityGateResult.imageContentGateStatus,
    productionApprovalStatus: qualityGateResult.productionApprovalStatus,
    productionClosureStatus: qualityGateResult.productionApprovalStatus === 'production_blocked' ? 'closed_blocked' : 'open_pending_review',
    qualityGateChecks: qualityGateResult.checks,
    blockingIssues: qualityGateResult.blockingIssues
  };
}

export function renderBatch002cReviewIndex(manifest: Batch002cManifest): string {
  const lines = [
    '# Batch 002c ChiYan Cleanup Review Index',
    '',
    `Batch run: ${manifest.batchRunId}`,
    `Purpose: ${manifest.batchPurpose}`,
    `Parent batch: ${manifest.parentBatchId}`,
    `Game format: ${manifest.gameFormat}`,
    `Quality gate: ${manifest.qualityGateProfile} ${manifest.qualityGateVersion}`,
    `Source DSL: ${manifest.sourceDslPath}`,
    `Source DSL hash: ${manifest.sourceDslHash}`,
    `Review state: ${manifest.reviewState}`,
    `Generation Execution Status: ${manifest.generationExecutionStatus}`,
    `Prompt Gate Status: ${manifest.promptGateStatus}`,
    `Image Content Gate Status: ${manifest.imageContentGateStatus}`,
    `Production Approval Status: ${manifest.productionApprovalStatus}`,
    `Production Closure Status: ${manifest.productionClosureStatus}`,
    `Requested images: ${manifest.totalRequestedImages}`,
    '',
    'Generated assets are review candidates only.',
    'Generated does not mean approved.',
    'Prompt gate pass does not mean image content pass.',
    'No asset is selected or approved until an explicit review outcome records it.',
    '',
    renderBatch002cReviewChecklist(),
    ''
  ];

  for (const task of manifest.tasks) {
    const assets = manifest.assets.filter((asset) => asset.taskId === task.taskId);
    lines.push(`## ${task.taskId}`, '', `Type: ${task.type}`, '');
    if (assets.length === 0) {
      lines.push('- No generated assets recorded.', '');
      continue;
    }
    for (const asset of assets) {
      const displayPath = asset.localPath ?? asset.temporaryUrl ?? 'not stored locally';
      const linkTarget = asset.localPath === undefined ? displayPath : relative(join('artifacts', 'generated-assets', BATCH_002C_ID), asset.localPath);
      lines.push(
        `- ${asset.assetId} (${asset.status})`,
        `  - Path: ${displayPath}`,
        `  - Preview: [open asset](${linkTarget})`,
        '  - Checklist:',
        '    - text/logo/watermark/signature',
        '    - fake text / fake labels',
        '    - side-view strictness',
        '    - gameplay-scale readability',
        '    - processability',
        '    - final status: approved / selected / needs_revision / rejected'
      );
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

export type Batch002cRunSummary = {
  batchRunId: string;
  sourceDslPath: string;
  sourceDslHash: string;
  gameFormat: typeof BATCH_002C_GAME_FORMAT;
  qualityGateProfile: 'ProductionCleanSideRunnerV1';
  qualityGateVersion: '1.0';
  qualityGateStatus: Batch002cManifest['qualityGateStatus'];
  generationExecutionStatus: GenerationExecutionStatus;
  promptGateStatus: ArtBatchPromptGateStatus;
  imageContentGateStatus: ImageContentGateStatus;
  productionApprovalStatus: ProductionApprovalStatus;
  productionClosureStatus: ProductionClosureStatus;
  taskCount: number;
  providerCallCount: number;
  totalRequestedImages: number;
  generatedAssetCount: number;
  selectedAssetCount: number;
  approvedAssetCount: number;
  outputFolderPath: string;
  reviewManifestPath: string;
  reviewIndexPath: string;
  reviewState: Batch002cManifest['reviewState'];
  autoApproval: false;
  autoSelection: false;
  productionStatusMessages: string[];
};

/** Builds the machine-readable completion summary without running a provider. */
export function buildBatch002cRunSummary(
  manifest: Batch002cManifest,
  artifactPaths: { manifestPath: string; indexPath: string }
): Batch002cRunSummary {
  const productionStatusMessages: string[] = [];
  if (manifest.productionApprovalStatus !== 'production_approved') {
    productionStatusMessages.push('Production not approved.');
  }
  if (manifest.productionApprovalStatus === 'production_blocked' && manifest.imageContentGateStatus === 'manual_failed') {
    productionStatusMessages.push('Production blocked by human image content review.');
  }

  return {
    batchRunId: manifest.batchRunId,
    sourceDslPath: manifest.sourceDslPath,
    sourceDslHash: manifest.sourceDslHash,
    gameFormat: manifest.gameFormat,
    qualityGateProfile: manifest.qualityGateProfile,
    qualityGateVersion: manifest.qualityGateVersion,
    qualityGateStatus: manifest.qualityGateStatus,
    generationExecutionStatus: manifest.generationExecutionStatus,
    promptGateStatus: manifest.promptGateStatus,
    imageContentGateStatus: manifest.imageContentGateStatus,
    productionApprovalStatus: manifest.productionApprovalStatus,
    productionClosureStatus: manifest.productionClosureStatus,
    taskCount: manifest.taskCount,
    providerCallCount: manifest.providerCallCount,
    totalRequestedImages: manifest.totalRequestedImages,
    generatedAssetCount: manifest.generatedAssetCount,
    selectedAssetCount: manifest.assets.filter((asset) => asset.status === 'selected').length,
    approvedAssetCount: manifest.assets.filter((asset) => asset.status === 'approved').length,
    outputFolderPath: join('artifacts', 'generated-assets', BATCH_002C_ID),
    reviewManifestPath: artifactPaths.manifestPath,
    reviewIndexPath: artifactPaths.indexPath,
    reviewState: manifest.reviewState,
    autoApproval: manifest.autoApproval,
    autoSelection: manifest.autoSelection,
    productionStatusMessages
  };
}

async function main(): Promise<void> {
  const gate = evaluateBatch002cGate(process.env);
  if (gate.status === 'skip') {
    console.log(gate.message);
    return;
  }
  if (gate.status === 'error') {
    console.error(gate.message);
    process.exitCode = 1;
    return;
  }

  const dslSource = await resolveBatch002cDslSource();
  if (!dslSource.ok) {
    console.error(dslSource.message);
    process.exitCode = 1;
    return;
  }
  const dslValidation = validateBatch002cDslForLiveGeneration(dslSource.text);
  if (!dslValidation.ok) {
    console.error(dslValidation.message);
    process.exitCode = 1;
    return;
  }

  const batchRunId = `${BATCH_002C_ID}-${timestampForId(new Date())}`;
  const preflightManifest = buildBatch002cQualityGateManifest({
    batchRunId,
    sourceDslPath: dslSource.path,
    sourceDslHash: dslSource.sha256
  });
  const preflightGate = evaluateArtProductionQualityGate(ProductionCleanSideRunnerV1, preflightManifest);
  if (!preflightGate.ok) {
    console.error(JSON.stringify({ error: 'BATCH_002C_QUALITY_GATE_FAILED', blockingIssues: preflightGate.blockingIssues }, null, 2));
    process.exitCode = 1;
    return;
  }

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

  for (const definition of BATCH_002C_TASK_DEFINITIONS) {
    const task = repositories.artTasks.create(createBatch002cArtTask(batchRunId, definition));
    try {
      await runner.runTask(task.taskId);
    } catch (error) {
      const failedManifest = createBatch002cManifestFromRepositories(batchRunId, dslSource, repositories, 'provider_failed');
      await writeBatch002cReviewArtifacts(failedManifest);
      throw error;
    }
  }

  const manifest = createBatch002cManifestFromRepositories(batchRunId, dslSource, repositories, 'generation_completed');
  const artifactPaths = await writeBatch002cReviewArtifacts(manifest);
  console.log(JSON.stringify(buildBatch002cRunSummary(manifest, artifactPaths), null, 2));
}

function createBatch002cManifestFromRepositories(
  batchRunId: string,
  dslSource: Extract<Batch002cDslSourceResult, { ok: true }>,
  repositories: ArtTaskRepositories,
  generationExecutionStatus: GenerationExecutionStatus
): Batch002cManifest {
  const assets = repositories.generatedAssets.list().map((asset) => assetManifestFromAsset(asset, repositories));
  const manifest = buildBatch002cQualityGateManifest({
    batchRunId,
    sourceDslPath: dslSource.path,
    sourceDslHash: dslSource.sha256,
    providerCallCount: repositories.providerCalls.list().length,
    generatedAssetCount: assets.length,
    generationExecutionStatus,
    assets
  });
  return {
    ...manifest,
    tasks: manifest.tasks.map((task) => {
      const call = repositories.providerCalls.listByTaskId(task.taskId).at(-1);
      const taskAssets = repositories.generatedAssets.listByTaskId(task.taskId);
      return {
        ...task,
        ...(call === undefined ? {} : { providerCallId: call.callId, providerCallStatus: call.status }),
        generatedAssetIds: taskAssets.map((asset) => asset.assetId)
      };
    })
  };
}

function createTaskManifest(
  batchRunId: string,
  definition: Batch002cTaskDefinition,
  sourceDslPath: string,
  sourceDslHash: string,
  compiledAt: string
): Batch002cTaskManifest {
  const taskId = `${batchRunId}-${definition.id}`;
  return {
    taskId,
    type: definition.type,
    requiredCapability: definition.requiredCapability,
    aspectRatio: definition.aspectRatio,
    count: definition.count,
    prompt: definition.prompt,
    negativePrompt: definition.negativePrompt,
    promptLineage: {
      sourceDslPath,
      sourceDslHash,
      promptTemplateId: 'chiyan-batch-002c-cleanup-v1',
      compiledPromptHash: sha256Hex(definition.prompt),
      compiledAt
    },
    generatedAssetIds: []
  };
}

function createBatch002cArtTask(batchRunId: string, definition: Batch002cTaskDefinition): ArtTask {
  return {
    taskId: `${batchRunId}-${definition.id}`,
    projectId: BATCH_002C_ID,
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

function assetManifestFromAsset(asset: GeneratedAsset, repositories: ArtTaskRepositories): Batch002cAssetManifest {
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

async function writeBatch002cReviewArtifacts(manifest: Batch002cManifest): Promise<{ manifestPath: string; indexPath: string }> {
  const batchDir = join('artifacts', 'generated-assets', BATCH_002C_ID);
  await mkdir(batchDir, { recursive: true });
  const manifestPath = join(batchDir, 'review-manifest.json');
  const indexPath = join(batchDir, 'review-index.md');
  await Promise.all([
    writeFile(manifestPath, `${JSON.stringify({ ...manifest, reviewIndexText: undefined }, null, 2)}\n`, 'utf8'),
    writeFile(indexPath, renderBatch002cReviewIndex(manifest), 'utf8')
  ]);
  return { manifestPath, indexPath };
}

function renderBatch002cReviewIndexBase(): string {
  return [
    'Generation Execution Status',
    'Prompt Gate Status',
    'Image Content Gate Status',
    'Production Approval Status',
    'Production Closure Status',
    'Generated assets are review candidates only.',
    'Generated does not mean approved.',
    'Prompt gate pass does not mean image content pass.',
    'No asset is selected or approved until an explicit review outcome records it.',
    '',
    renderBatch002cReviewChecklist()
  ].join('\n');
}

function renderBatch002cReviewChecklist(): string {
  return [
    'Review checklist for each asset:',
    '',
    '- text/logo/watermark/signature',
    '- fake text / fake labels',
    '- side-view strictness',
    '- gameplay-scale readability',
    '- game format fit',
    '- gameplay readability',
    '- ChiYan direction fit',
    '- processability',
    '- style consistency',
    '- text/logo/watermark/signature check',
    '- final status: approved / selected / needs_revision / rejected',
    '- approve / selected / needs_revision / rejected'
  ].join('\n');
}

function cleanupNegativePrompt(): string {
  return [
    'no text',
    'no readable text',
    'no fake text',
    'no logo',
    'no watermark',
    'no signature',
    'no title',
    'no title card',
    'no footer',
    'no corner mark',
    'no fake UI labels',
    'no letters',
    'no numbers',
    'watermark',
    'signature',
    'artist signature',
    'copyright mark',
    'brand mark',
    'subtitle',
    'caption',
    'label',
    'UI label',
    'pseudo text',
    'Chinese characters',
    'English letters',
    'corner emblem',
    'bottom mark',
    'poster layout',
    'splash art',
    'card art',
    'fake game logo',
    'fake studio logo',
    'decorative typography',
    'chibi',
    'front-facing portrait',
    '3/4 hero poster',
    'cropped body',
    'unreadable silhouette'
  ].join(', ');
}

function formatSafeError(error: unknown): ProviderCallError | { message: string } {
  if (error instanceof ArtProviderAdapterError) {
    return safeProviderError(error.normalizedError);
  }
  return {
    message: error instanceof Error ? error.message : 'ChiYan Batch 002c ArtTask generation failed.'
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
  /side[-\s]?view|side[-\s]?on/i,
  /horizontal\s+combat\s+lane/i
] as const;

const CLEANUP_REQUIRED_PATTERNS = [
  /\bno\s+watermark\b/i,
  /\bno\s+(?:fake\s+(?:game\s+|studio\s+)?)?logo\b/i,
  /\bno\s+(?:artist\s+)?signature\b/i,
  /\bno\s+title\b/i,
  /\bno\s+(?:fake\s+|readable\s+|pseudo\s+)?text\b/i,
  /\bno\s+letters\b/i,
  /\bno\s+numbers\b/i
] as const;

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
