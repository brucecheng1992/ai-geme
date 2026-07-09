import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import {
  ProductionCleanSideRunnerV1,
  evaluateArtBatchReviewOutcome,
  evaluateArtProductionQualityGate,
  parseArtBatchReviewOutcomeJson
} from '../../scripts/art-quality-gates.js';
import {
  BATCH_002C_TOTAL_REQUESTED_IMAGES,
  BATCH_002C_TASK_DEFINITIONS,
  buildBatch002cRunSummary,
  buildBatch002cQualityGateManifest,
  evaluateBatch002cGate,
  getBatch002cRequestedImageCount,
  renderBatch002cReviewIndex,
  resolveBatch002cDslSource,
  validateBatch002cDslForLiveGeneration
} from '../../scripts/art-task-batch-002c.js';

const execFileAsync = promisify(execFile);
const CANONICAL_CLEANUP_DSL_PATH = 'docs/art-pipeline/dsl/chiyan-battlefield-side-runner-cleanup.dsl';
const BATCH_002C_EXPECTED_ASSET_IDS = [
  'batch-002c-2026-07-09T18-36-05-280Z-player_character_concept_chiyan_clean-asset-1',
  'batch-002c-2026-07-09T18-36-05-280Z-player_character_concept_chiyan_clean-asset-2',
  'batch-002c-2026-07-09T18-36-05-280Z-player_character_concept_chiyan_clean-asset-3',
  'batch-002c-2026-07-09T18-36-05-280Z-enemy_concept_chiyan_clean-asset-1',
  'batch-002c-2026-07-09T18-36-05-280Z-enemy_concept_chiyan_clean-asset-2',
  'batch-002c-2026-07-09T18-36-05-280Z-enemy_concept_chiyan_clean-asset-3',
  'batch-002c-2026-07-09T18-36-05-280Z-skill_icon_chiyan_flame_slash_clean-asset-1',
  'batch-002c-2026-07-09T18-36-05-280Z-skill_icon_chiyan_flame_slash_clean-asset-2',
  'batch-002c-2026-07-09T18-36-05-280Z-skill_icon_chiyan_ash_guard_clean-asset-1',
  'batch-002c-2026-07-09T18-36-05-280Z-skill_icon_chiyan_ash_guard_clean-asset-2',
  'batch-002c-2026-07-09T18-36-05-280Z-skill_icon_chiyan_battle_burst_clean-asset-1',
  'batch-002c-2026-07-09T18-36-05-280Z-skill_icon_chiyan_battle_burst_clean-asset-2',
  'batch-002c-2026-07-09T18-36-05-280Z-ui_concept_chiyan_battle_hud_clean-asset-1'
] as const;

const VALID_CLEANUP_DSL = [
  'CHIYAN_BATTLEFIELD_DSL_VERSION 1.2',
  'LIVE_GENERATION_ALLOWED true',
  'game_format: side-scrolling run-and-gun',
  'camera: strict side-view / side-on camera',
  'gameplay_readability: horizontal combat lane, gameplay-scale readability',
  'generic_fantasy_fallback_allowed: false',
  'cleanup_targets: watermark, logo, fake text, signature, title, footer, corner mark',
  'rules: no text, no readable text, no fake text, no logo, no watermark, no signature, no title, no letters, no numbers'
].join('\n');

describe('ChiYan ArtTask Batch 002c production quality gate', () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
    tempRoots.length = 0;
  });

  it('skips when RUN_CHIYAN_BATCH_002C is not enabled', async () => {
    const result = await execFileAsync('npm', ['run', 'art-task:batch-002c'], {
      env: {
        ...process.env,
        RUN_CHIYAN_BATCH_002C: '0',
        RUN_MINIMAX_LIVE_TESTS: '0',
        MINIMAX_API_KEY: ''
      }
    });

    expect(result.stdout).toContain('Skipping ChiYan Batch 002c');
    expect(result.stderr).toBe('');
    expect(evaluateBatch002cGate({ RUN_CHIYAN_BATCH_002C: '0' })).toMatchObject({ status: 'skip', providerCallCount: 0 });
  });

  it('fails before provider calls when live flags are enabled but MINIMAX_API_KEY is missing', () => {
    expect(
      evaluateBatch002cGate({
        RUN_CHIYAN_BATCH_002C: '1',
        RUN_MINIMAX_LIVE_TESTS: '1',
        MINIMAX_API_KEY: '',
        MINIMAX_BASE_URL: 'https://api.minimaxi.com',
        MINIMAX_IMAGE_MODEL: 'image-01'
      })
    ).toEqual({
      status: 'error',
      message: 'ChiYan Batch 002c requires MINIMAX_API_KEY when RUN_CHIYAN_BATCH_002C=1.',
      providerCallCount: 0
    });
  });

  it('fails closed when the cleanup DSL is missing', async () => {
    const missing = await resolveBatch002cDslSource({
      env: { CHIYAN_BATTLEFIELD_DSL_PATH: join(tmpdir(), 'missing-chiyan-cleanup.dsl') },
      repoRoot: process.cwd(),
      candidatePaths: []
    });

    expect(missing.ok).toBe(false);
  });

  it('rejects fixture DSL in live mode', () => {
    expect(
      validateBatch002cDslForLiveGeneration(
        [
          'DSL_STATUS TEST_ONLY_DO_NOT_USE_FOR_LIVE_GENERATION',
          'LIVE_GENERATION_ALLOWED false',
          'game_format: side-scrolling run-and-gun',
          'cleanup_targets: watermark, logo, fake text, signature'
        ].join('\n')
      )
    ).toMatchObject({ ok: false });
  });

  it('rejects DSL missing cleanup constraints', () => {
    expect(
      validateBatch002cDslForLiveGeneration(
        [
          'LIVE_GENERATION_ALLOWED true',
          'game_format: side-scrolling run-and-gun',
          'camera: strict side-view / side-on camera',
          'gameplay_readability: horizontal combat lane',
          'generic_fantasy_fallback_allowed: false'
        ].join('\n')
      )
    ).toMatchObject({ ok: false, message: 'ChiYan Batch 002c source DSL must include cleanup constraints for no text, logo, watermark, signature, and title artifacts.' });
  });

  it('rejects cleanup DSL that allows forbidden image-content artifacts', () => {
    expect(
      validateBatch002cDslForLiveGeneration(
        [
          'LIVE_GENERATION_ALLOWED true',
          'game_format: side-scrolling run-and-gun',
          'camera: strict side-view / side-on camera',
          'gameplay_readability: horizontal combat lane',
          'generic_fantasy_fallback_allowed: false',
          'cleanup_targets: watermark allowed, logo allowed, signature allowed, title allowed, fake text allowed, letters allowed, numbers allowed'
        ].join('\n')
      )
    ).toMatchObject({ ok: false, message: 'ChiYan Batch 002c source DSL must include cleanup constraints for no text, logo, watermark, signature, and title artifacts.' });
  });

  it('rejects generic fantasy fallback DSL', () => {
    expect(
      validateBatch002cDslForLiveGeneration(
        [
          'LIVE_GENERATION_ALLOWED true',
          'game_format: side-scrolling run-and-gun',
          'camera: strict side-view / side-on camera',
          'gameplay_readability: horizontal combat lane',
          'cleanup_targets: watermark, logo, fake text, signature, title, footer, corner mark',
          'rules: no text, no readable text, no fake text, no logo, no watermark, no signature, no title, no letters, no numbers'
        ].join('\n')
      )
    ).toMatchObject({ ok: false, message: 'ChiYan Batch 002c source DSL must forbid generic fantasy fallback.' });
  });

  it('does not treat markdown docs as source DSL fallback', async () => {
    const root = await mkdtemp(join(tmpdir(), 'chiyan-002c-doc-only-'));
    tempRoots.push(root);
    await mkdir(join(root, 'docs', 'art-pipeline'), { recursive: true });
    await writeFile(join(root, 'docs', 'art-pipeline', 'batch-002c-chiyan-cleanup.md'), VALID_CLEANUP_DSL, 'utf8');

    const result = await resolveBatch002cDslSource({ env: {}, repoRoot: root });

    expect(result.ok).toBe(false);
  });

  it('loads and validates the canonical cleanup DSL', async () => {
    const result = await resolveBatch002cDslSource({ env: {}, repoRoot: process.cwd() });

    expect(result).toMatchObject({ ok: true, path: CANONICAL_CLEANUP_DSL_PATH });
    if (!result.ok) {
      return;
    }
    expect(validateBatch002cDslForLiveGeneration(result.text)).toEqual({ ok: true });
  });

  it('declares ProductionCleanSideRunnerV1 quality gate metadata', () => {
    const manifest = buildBatch002cQualityGateManifest({
      sourceDslPath: CANONICAL_CLEANUP_DSL_PATH,
      sourceDslHash: 'a'.repeat(64)
    });

    expect(manifest.qualityGateProfile).toBe('ProductionCleanSideRunnerV1');
    expect(manifest.qualityGateVersion).toBe('1.0');
    expect(manifest.qualityGateStatus).toBe('pending_human_review');
    expect(manifest.blockingIssues).toEqual([]);
  });

  it('records the injected compilation time in prompt lineage', () => {
    const compiledAt = '2026-07-09T18:36:05.280Z';
    const manifest = buildBatch002cQualityGateManifest({
      sourceDslPath: CANONICAL_CLEANUP_DSL_PATH,
      sourceDslHash: 'a'.repeat(64),
      now: () => new Date(compiledAt)
    });

    expect(manifest.tasks.every((task) => task.promptLineage.compiledAt === compiledAt)).toBe(true);
  });

  it('renders review index with text/logo/watermark/signature check', () => {
    const manifest = buildBatch002cQualityGateManifest({
      sourceDslPath: CANONICAL_CLEANUP_DSL_PATH,
      sourceDslHash: 'a'.repeat(64)
    });

    const index = renderBatch002cReviewIndex(manifest);
    const firstTaskHeadingOffset = index.indexOf(`## ${manifest.tasks[0]?.taskId}`);
    const statusLabels = [
      'Generation Execution Status',
      'Prompt Gate Status',
      'Image Content Gate Status',
      'Production Approval Status',
      'Production Closure Status'
    ];

    expect(index).toContain('Generation Execution Status: skipped');
    expect(index).toContain('Prompt Gate Status: passed');
    expect(index).toContain('Image Content Gate Status: manual_review_required');
    expect(index).toContain('Production Approval Status: pending_human_review');
    expect(index).toContain('Production Closure Status: open_pending_review');
    expect(index).toContain('Generated assets are review candidates only.');
    expect(index).toContain('Generated does not mean approved.');
    expect(index).toContain('Prompt gate pass does not mean image content pass.');
    expect(index).toContain('No asset is selected or approved until an explicit review outcome records it.');
    expect(index).toContain('text/logo/watermark/signature check');
    expect(firstTaskHeadingOffset).toBeGreaterThan(0);
    for (const label of statusLabels) {
      expect(index.indexOf(label)).toBeLessThan(firstTaskHeadingOffset);
      expect(index.match(new RegExp(label, 'g'))).toHaveLength(1);
    }
  });

  it('accepts every Batch 002c prompt in automated preflight while keeping production pending', () => {
    const manifest = buildBatch002cQualityGateManifest({
      sourceDslPath: CANONICAL_CLEANUP_DSL_PATH,
      sourceDslHash: 'a'.repeat(64)
    });

    const result = evaluateArtProductionQualityGate(ProductionCleanSideRunnerV1, manifest);

    expect(result.ok).toBe(true);
    expect(manifest.qualityGateChecks.every((check) => check.status !== 'fail')).toBe(true);
  });

  it('keeps Batch 002c prompt gate pass separate from manual image content review', () => {
    const manifest = buildBatch002cQualityGateManifest({
      sourceDslPath: CANONICAL_CLEANUP_DSL_PATH,
      sourceDslHash: 'a'.repeat(64)
    });

    const result = evaluateArtProductionQualityGate(ProductionCleanSideRunnerV1, manifest);

    expect(result.promptQualityGateStatus).toBe('pass');
    expect(result.imageContentGateStatus).toBe('manual_review_required');
    expect(result.productionApprovalStatus).toBe('pending_human_review');
    expect(manifest.promptQualityGateStatus).toBe('pass');
    expect(manifest.imageContentGateStatus).toBe('manual_review_required');
    expect(manifest.productionApprovalStatus).toBe('pending_human_review');
  });

  it('records Batch 002c human review outcome as production_blocked with no selected or approved assets', async () => {
    const fixturePath = 'docs/art-pipeline/review-outcomes/batch-002c-human-review.json';
    const outcome = parseArtBatchReviewOutcomeJson(await readFile(fixturePath, 'utf8'), {
      inputSource: fixturePath,
      fixtureId: 'batch-002c-human-review'
    });

    expect(outcome.batchId).toBe('batch-002c');
    expect(outcome.generationExecutionStatus).toBe('generation_completed');
    expect(outcome.promptGateStatus).toBe('passed');
    expect(outcome.productionApprovalStatus).toBe('production_blocked');
    expect(outcome.imageContentGateStatus).toBe('manual_failed');
    expect(outcome.productionClosureStatus).toBe('closed_blocked');
    expect(outcome.selectedAssetIds).toEqual([]);
    expect(outcome.approvedAssetIds).toEqual([]);
    expect(outcome.batchLevelFindings).toEqual(
      expect.arrayContaining(['prompt_compliance_not_image_compliance', 'actual_text', 'fake_text', 'logo', 'watermark', 'signature', 'fake_ui_label'])
    );
    expect(outcome.assetOutcomes).toHaveLength(13);
    expect(new Set(outcome.assetOutcomes.map((asset) => asset.assetId))).toEqual(new Set(BATCH_002C_EXPECTED_ASSET_IDS));
    expect(outcome.assetOutcomes.some((asset) => asset.status === 'selected')).toBe(false);
    expect(outcome.assetOutcomes.some((asset) => asset.status === 'approved')).toBe(false);
    expect(evaluateArtBatchReviewOutcome(outcome, { expectedAssetIds: BATCH_002C_EXPECTED_ASSET_IDS })).toMatchObject({
      ok: true,
      derivedProductionApprovalStatus: 'production_blocked',
      derivedProductionClosureStatus: 'closed_blocked'
    });
  });

  it('builds an explicit no-approval runner summary without provider calls', () => {
    const manifest = buildBatch002cQualityGateManifest({
      sourceDslPath: CANONICAL_CLEANUP_DSL_PATH,
      sourceDslHash: 'a'.repeat(64)
    });
    const summary = buildBatch002cRunSummary(manifest, {
      manifestPath: 'artifacts/generated-assets/batch-002c/review-manifest.json',
      indexPath: 'artifacts/generated-assets/batch-002c/review-index.md'
    });

    expect(summary).toMatchObject({
      generationExecutionStatus: 'skipped',
      promptGateStatus: 'passed',
      imageContentGateStatus: 'manual_review_required',
      productionApprovalStatus: 'pending_human_review',
      productionClosureStatus: 'open_pending_review',
      providerCallCount: 0,
      generatedAssetCount: 0,
      selectedAssetCount: 0,
      approvedAssetCount: 0
    });
    expect(summary.productionStatusMessages).toContain('Production not approved.');

    const blockedSummary = buildBatch002cRunSummary(
      {
        ...manifest,
        generationExecutionStatus: 'generation_completed',
        imageContentGateStatus: 'manual_failed',
        productionApprovalStatus: 'production_blocked',
        productionClosureStatus: 'closed_blocked'
      },
      {
        manifestPath: 'artifacts/generated-assets/batch-002c/review-manifest.json',
        indexPath: 'artifacts/generated-assets/batch-002c/review-index.md'
      }
    );
    expect(blockedSummary.productionStatusMessages).toEqual([
      'Production not approved.',
      'Production blocked by human image content review.'
    ]);
  });

  it('defines 6 tasks and 13 requested images with no auto review actions', () => {
    expect(BATCH_002C_TASK_DEFINITIONS).toHaveLength(6);
    expect(getBatch002cRequestedImageCount()).toBe(13);
    expect(BATCH_002C_TOTAL_REQUESTED_IMAGES).toBe(13);
    expect(BATCH_002C_TASK_DEFINITIONS.every((definition) => definition.autoApprove === false)).toBe(true);
    expect(BATCH_002C_TASK_DEFINITIONS.every((definition) => definition.autoSelect === false)).toBe(true);
  });

  it('puts no logo/no watermark/no text/no signature/no footer/no corner mark constraints in all prompts', () => {
    for (const definition of BATCH_002C_TASK_DEFINITIONS) {
      const text = `${definition.prompt}\n${definition.negativePrompt}`;
      expect(text).toMatch(/no logo/i);
      expect(text).toMatch(/no watermark/i);
      expect(text).toMatch(/no text/i);
      expect(text).toMatch(/no signature/i);
      expect(text).toMatch(/no footer/i);
      expect(text).toMatch(/no corner mark/i);
    }
  });

  it('keeps character and enemy prompts strict side-view and gameplay-scale', () => {
    const definitions = BATCH_002C_TASK_DEFINITIONS.filter((definition) => definition.type === 'character_concept' || definition.type === 'enemy_concept');
    for (const definition of definitions) {
      expect(definition.prompt).toMatch(/strict side-view|side-on/i);
      expect(definition.prompt).toMatch(/gameplay-scale/i);
    }
  });

  it('keeps skill icon prompts glyph-only without characters, letters, or numbers', () => {
    const definitions = BATCH_002C_TASK_DEFINITIONS.filter((definition) => definition.type === 'skill_icon');
    for (const definition of definitions) {
      const text = `${definition.prompt}\n${definition.negativePrompt}`;
      expect(text).toMatch(/glyph only/i);
      expect(text).toMatch(/no character/i);
      expect(text).toMatch(/no letters/i);
      expect(text).toMatch(/no numbers/i);
    }
  });

  it('keeps HUD prompt free of letters, numbers, labels, and fake language', () => {
    const hud = BATCH_002C_TASK_DEFINITIONS.find((definition) => definition.type === 'ui_concept');
    expect(hud).toBeDefined();
    const text = `${hud?.prompt}\n${hud?.negativePrompt}`;
    expect(text).toMatch(/no letters/i);
    expect(text).toMatch(/no numbers/i);
    expect(text).toMatch(/no labels/i);
    expect(text).toMatch(/no fake language/i);
  });

  it('would fail before provider call if a Batch 002c prompt violates ProductionCleanSideRunnerV1', () => {
    const manifest = buildBatch002cQualityGateManifest({
      sourceDslPath: CANONICAL_CLEANUP_DSL_PATH,
      sourceDslHash: 'a'.repeat(64),
      taskDefinitions: [
        {
          ...BATCH_002C_TASK_DEFINITIONS[0],
          prompt: 'generic character concept'
        }
      ]
    });

    const result = evaluateArtProductionQualityGate(ProductionCleanSideRunnerV1, manifest);

    expect(result.ok).toBe(false);
    expect(result.blockingIssues).toContain('side_view_strictness');
  });
});
