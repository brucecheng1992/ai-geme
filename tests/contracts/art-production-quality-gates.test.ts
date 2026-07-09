import { describe, expect, it } from 'vitest';

import {
  ProductionCleanSideRunnerV1,
  evaluateArtBatchReviewOutcome,
  evaluateArtProductionQualityGate,
  productionBatchMustDeclareQualityGate,
  type ArtBatchReviewOutcome
} from '../../scripts/art-quality-gates.js';

const baseTask = {
  taskId: 'task-character',
  type: 'character_concept' as const,
  aspectRatio: '3:4',
  prompt:
    'Full body strict side-view / side-on 2D side-scrolling run-and-gun character for a horizontal combat lane, gameplay-scale readable silhouette, animation-ready proportions, no front-facing hero portrait, no 3/4 splash art, no poster layout, no cropped body.',
  negativePrompt:
    'no text, no readable text, no fake text, no logo, no watermark, no signature, no title, no title card, no footer, no corner mark, no fake UI labels, no letters, no numbers',
  promptLineage: {
    sourceDslPath: 'docs/art-pipeline/dsl/chiyan-battlefield-side-runner.dsl',
    sourceDslHash: 'a'.repeat(64),
    promptTemplateId: 'test-template',
    compiledPromptHash: 'b'.repeat(64)
  }
};

const baseManifest = {
  batchId: 'future-production-batch',
  qualityGateProfile: 'ProductionCleanSideRunnerV1',
  qualityGateVersion: '1.0',
  sourceDslPath: 'docs/art-pipeline/dsl/chiyan-battlefield-side-runner.dsl',
  sourceDslHash: 'a'.repeat(64),
  gameFormat: 'side_scrolling_run_and_gun',
  reviewState: 'pending_human_review',
  autoApproval: false,
  autoSelection: false,
  tasks: [baseTask],
  reviewIndexText:
    'Generation Execution Status\nPrompt Gate Status\nImage Content Gate Status\nProduction Approval Status\nProduction Closure Status\n' +
    'Generated assets are review candidates only.\nGenerated does not mean approved.\nPrompt gate pass does not mean image content pass.\n' +
    'No asset is selected or approved until an explicit review outcome records it.\n' +
    'game format fit\ngameplay readability\nChiYan direction fit\nprocessability\nstyle consistency\n' +
    'text/logo/watermark/signature check\napprove / selected / needs_revision / rejected'
};

type ReviewOutcomeOverrides = Partial<ArtBatchReviewOutcome> & {
  expectedAssetIds?: readonly string[];
  allowPartialReview?: boolean;
};

function evaluateReviewOutcome(overrides: ReviewOutcomeOverrides) {
  const { expectedAssetIds, allowPartialReview, ...outcomeOverrides } = overrides;
  const assetOutcomes = outcomeOverrides.assetOutcomes ?? [];
  const productionApprovalStatus = outcomeOverrides.productionApprovalStatus ?? 'pending_human_review';
  return evaluateArtBatchReviewOutcome(
    {
      batchId: 'batch-002c',
      generationExecutionStatus: 'generation_completed',
      promptGateStatus: 'passed',
      imageContentGateStatus: 'manual_review_required',
      productionClosureStatus:
        outcomeOverrides.productionClosureStatus ??
        (productionApprovalStatus === 'production_approved'
          ? 'closed_approved'
          : productionApprovalStatus === 'production_blocked'
            ? 'closed_blocked'
            : 'open_pending_review'),
      selectedAssetIds:
        outcomeOverrides.selectedAssetIds ?? assetOutcomes.filter((asset) => asset.status === 'selected').map((asset) => asset.assetId),
      approvedAssetIds:
        outcomeOverrides.approvedAssetIds ?? assetOutcomes.filter((asset) => asset.status === 'approved').map((asset) => asset.assetId),
      reviewedAt: '2026-07-10T00:00:00.000Z',
      reviewer: 'human',
      batchLevelFindings: [],
      ...outcomeOverrides,
      assetOutcomes,
      productionApprovalStatus
    },
    {
      expectedAssetIds: expectedAssetIds ?? assetOutcomes.map((asset) => asset.assetId),
      ...(allowPartialReview === undefined ? {} : { allowPartialReview })
    }
  );
}

describe('Art Production Quality Gates', () => {
  it('defines ProductionCleanSideRunnerV1', () => {
    expect(ProductionCleanSideRunnerV1.profile).toBe('ProductionCleanSideRunnerV1');
    expect(ProductionCleanSideRunnerV1.version).toBe('1.0');
  });

  it('fails future production batches without a qualityGateProfile', () => {
    expect(productionBatchMustDeclareQualityGate({ ...baseManifest, qualityGateProfile: undefined })).toEqual({
      ok: false,
      issue: 'missing_quality_gate_profile'
    });
  });

  it('fails when no text/logo/watermark prompt constraints are missing', () => {
    const result = evaluateArtProductionQualityGate(ProductionCleanSideRunnerV1, {
      ...baseManifest,
      tasks: [{ ...baseTask, negativePrompt: 'no text, no readable text' }]
    });

    expect(result.ok).toBe(false);
    expect(result.blockingIssues).toContain('text_logo_watermark_signature');
  });

  it('fails character prompts without side-view and gameplay-scale readability', () => {
    const result = evaluateArtProductionQualityGate(ProductionCleanSideRunnerV1, {
      ...baseManifest,
      tasks: [{ ...baseTask, prompt: 'full body character concept, animation-ready proportions' }]
    });

    expect(result.ok).toBe(false);
    expect(result.blockingIssues).toContain('side_view_strictness');
    expect(result.blockingIssues).toContain('gameplay_scale_readability');
  });

  it('fails enemy prompts without horizontal lane, weak point, or attack silhouette', () => {
    const result = evaluateArtProductionQualityGate(ProductionCleanSideRunnerV1, {
      ...baseManifest,
      tasks: [
        {
          ...baseTask,
          taskId: 'task-enemy',
          type: 'enemy_concept',
          prompt: 'strict side-view enemy concept, gameplay-scale readability'
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.blockingIssues).toContain('gameplay_scale_readability');
  });

  it('fails scene_background prompts without parallax layers or platform line', () => {
    const result = evaluateArtProductionQualityGate(ProductionCleanSideRunnerV1, {
      ...baseManifest,
      tasks: [
        {
          ...baseTask,
          taskId: 'task-scene',
          type: 'scene_background',
          aspectRatio: '16:9',
          prompt: '16:9 horizontal side-scrolling background with clear traversal route'
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.blockingIssues).toContain('gameplay_scale_readability');
  });

  it('fails skill_icon prompts without glyph only and no letters/numbers constraints', () => {
    const result = evaluateArtProductionQualityGate(ProductionCleanSideRunnerV1, {
      ...baseManifest,
      tasks: [
        {
          ...baseTask,
          taskId: 'task-icon',
          type: 'skill_icon',
          aspectRatio: '1:1',
          prompt: '1:1 square skill icon, readable at 64x64',
          negativePrompt: 'no text, no logo, no watermark'
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.blockingIssues).toContain('text_logo_watermark_signature');
    expect(result.blockingIssues).toContain('gameplay_scale_readability');
  });

  it('fails ui_concept prompts without no labels or no fake language constraints', () => {
    const result = evaluateArtProductionQualityGate(ProductionCleanSideRunnerV1, {
      ...baseManifest,
      tasks: [
        {
          ...baseTask,
          taskId: 'task-ui',
          type: 'ui_concept',
          aspectRatio: '16:9',
          prompt: '16:9 HUD mockup with abstract placeholder bars/icons only'
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.blockingIssues).toContain('text_logo_watermark_signature');
  });

  it('fails review-state gates for auto approval, auto selection, or non-pending review', () => {
    expect(evaluateArtProductionQualityGate(ProductionCleanSideRunnerV1, { ...baseManifest, autoApproval: true }).ok).toBe(false);
    expect(evaluateArtProductionQualityGate(ProductionCleanSideRunnerV1, { ...baseManifest, autoSelection: true }).ok).toBe(false);
    expect(evaluateArtProductionQualityGate(ProductionCleanSideRunnerV1, { ...baseManifest, reviewState: 'approved' }).ok).toBe(false);
  });

  it('fails future review indexes that omit the five status headings and candidate-only disclosures', () => {
    const result = evaluateArtProductionQualityGate(ProductionCleanSideRunnerV1, {
      ...baseManifest,
      reviewIndexText:
        'game format fit\ngameplay readability\nChiYan direction fit\nprocessability\nstyle consistency\n' +
        'text/logo/watermark/signature check\napprove / selected / needs_revision / rejected'
    });

    expect(result.ok).toBe(false);
    expect(result.blockingIssues).toContain('human_review_required');
  });

  it('documents that image content recognition remains human review, not automatic detection', () => {
    expect(ProductionCleanSideRunnerV1.humanReviewRequired).toContain('actual_watermark_logo_signature_detection');
    expect(ProductionCleanSideRunnerV1.automatedChecks).not.toContain('detect_pixels_for_watermark');
  });

  it('keeps prompt gate pass separate from image content pass', () => {
    const result = evaluateArtProductionQualityGate(ProductionCleanSideRunnerV1, baseManifest);

    expect(result.promptQualityGateStatus).toBe('pass');
    expect(result.imageContentGateStatus).toBe('manual_review_required');
    expect(result.productionApprovalStatus).toBe('pending_human_review');
  });

  it('blocks production approval when imageContentGateStatus is manual_failed', () => {
    const result = evaluateReviewOutcome({
      batchId: 'batch-002c',
      productionApprovalStatus: 'production_approved',
      imageContentGateStatus: 'manual_failed',
      reviewedAt: '2026-07-10T00:00:00.000Z',
      reviewer: 'human',
      assetOutcomes: [],
      batchLevelFindings: ['fake text remains']
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContain('image_content_manual_failed_blocks_approval');
  });

  it('requires at least one approved asset before approving production', () => {
    const result = evaluateReviewOutcome({
      batchId: 'batch-approved-empty',
      productionApprovalStatus: 'production_approved',
      imageContentGateStatus: 'manual_passed',
      reviewedAt: '2026-07-10T00:00:00.000Z',
      reviewer: 'human',
      assetOutcomes: [],
      batchLevelFindings: []
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContain('production_approved_without_approved_asset');
  });

  it('rejects production approval while any asset remains unresolved', () => {
    const result = evaluateReviewOutcome({
      batchId: 'batch-approved-with-blocker',
      productionApprovalStatus: 'production_approved',
      imageContentGateStatus: 'manual_passed',
      reviewedAt: '2026-07-10T00:00:00.000Z',
      reviewer: 'human',
      assetOutcomes: [
        { assetId: 'asset-approved', batchId: 'batch-approved-with-blocker', status: 'approved', reasons: [] },
        { assetId: 'asset-watermarked', batchId: 'batch-approved-with-blocker', status: 'needs_revision', reasons: ['watermark'] }
      ],
      batchLevelFindings: []
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContain('production_approved_has_unresolved_asset');
  });

  it('allows production approval only when reviewed assets are clean and approved', () => {
    const result = evaluateReviewOutcome({
      batchId: 'batch-approved-clean',
      productionApprovalStatus: 'production_approved',
      imageContentGateStatus: 'manual_passed',
      reviewedAt: '2026-07-10T00:00:00.000Z',
      reviewer: 'human',
      assetOutcomes: [{ assetId: 'asset-approved', batchId: 'batch-approved-clean', status: 'approved', reasons: [] }],
      batchLevelFindings: []
    });

    expect(result).toMatchObject({ ok: true, issues: [] });
  });

  it('production_blocked review outcome allows no approved or selected assets', () => {
    const result = evaluateReviewOutcome({
      batchId: 'batch-002c',
      productionApprovalStatus: 'production_blocked',
      imageContentGateStatus: 'manual_failed',
      reviewedAt: '2026-07-10T00:00:00.000Z',
      reviewer: 'human',
      assetOutcomes: [
        { assetId: 'asset-1', batchId: 'batch-002c', status: 'selected', reasons: ['fake_text'] },
        { assetId: 'asset-2', batchId: 'batch-002c', status: 'approved', reasons: ['logo'] }
      ],
      batchLevelFindings: ['blocked']
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContain('production_blocked_has_selected_asset');
    expect(result.issues).toContain('production_blocked_has_approved_asset');
  });

  it.each(['actual_text', 'logo', 'watermark', 'signature'] as const)('asset with %s reason cannot be approved', (reason) => {
    const result = evaluateReviewOutcome({
      batchId: 'batch-002c',
      productionApprovalStatus: 'pending_human_review',
      imageContentGateStatus: 'manual_review_required',
      reviewedAt: '2026-07-10T00:00:00.000Z',
      reviewer: 'human',
      assetOutcomes: [{ assetId: 'asset-1', batchId: 'batch-002c', status: 'approved', reasons: [reason] }],
      batchLevelFindings: []
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContain('asset_with_blocking_reason_cannot_be_approved');
  });

  it('ui_concept with fake_ui_label reason cannot be approved', () => {
    const result = evaluateReviewOutcome({
      batchId: 'batch-002c',
      productionApprovalStatus: 'pending_human_review',
      imageContentGateStatus: 'manual_review_required',
      reviewedAt: '2026-07-10T00:00:00.000Z',
      reviewer: 'human',
      assetOutcomes: [{ assetId: 'asset-ui', batchId: 'batch-002c', status: 'approved', reasons: ['fake_ui_label'] }],
      batchLevelFindings: []
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContain('asset_with_blocking_reason_cannot_be_approved');
  });

  it('skill_icon with card_frame or logo reason cannot be approved', () => {
    const result = evaluateReviewOutcome({
      batchId: 'batch-002c',
      productionApprovalStatus: 'pending_human_review',
      imageContentGateStatus: 'manual_review_required',
      reviewedAt: '2026-07-10T00:00:00.000Z',
      reviewer: 'human',
      assetOutcomes: [
        { assetId: 'asset-icon-1', batchId: 'batch-002c', status: 'approved', reasons: ['card_frame'] },
        { assetId: 'asset-icon-2', batchId: 'batch-002c', status: 'approved', reasons: ['logo'] }
      ],
      batchLevelFindings: []
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContain('asset_with_blocking_reason_cannot_be_approved');
  });

  it('manual_failed image content gate rejects approved assets', () => {
    const result = evaluateReviewOutcome({
      batchId: 'batch-002c',
      productionApprovalStatus: 'pending_human_review',
      imageContentGateStatus: 'manual_failed',
      reviewedAt: '2026-07-10T00:00:00.000Z',
      reviewer: 'human',
      assetOutcomes: [{ assetId: 'asset-1', batchId: 'batch-002c', status: 'approved', reasons: [] }],
      batchLevelFindings: ['manual image content failed']
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContain('manual_failed_has_approved_asset');
  });

  it('rejects review outcomes that reference assets outside the expected manifest set', () => {
    const result = evaluateReviewOutcome({
      expectedAssetIds: ['asset-expected'],
      assetOutcomes: [{ assetId: 'asset-unknown', batchId: 'batch-002c', status: 'needs_revision', reasons: [] }]
    });

    expect(result.issues).toContain('review_outcome_references_unknown_asset');
  });

  it('requires full expected-asset review coverage before production approval', () => {
    const result = evaluateReviewOutcome({
      imageContentGateStatus: 'manual_passed',
      productionApprovalStatus: 'production_approved',
      productionClosureStatus: 'closed_approved',
      expectedAssetIds: ['asset-approved', 'asset-missing'],
      approvedAssetIds: ['asset-approved'],
      assetOutcomes: [{ assetId: 'asset-approved', batchId: 'batch-002c', status: 'approved', reasons: [] }]
    });

    expect(result.issues).toContain('review_outcome_missing_expected_asset');
    expect(result.issues).toContain('production_approval_requires_full_review_coverage');
  });

  it('requires selectedAssetIds and approvedAssetIds to match the outcome statuses', () => {
    const result = evaluateReviewOutcome({
      expectedAssetIds: ['asset-selected', 'asset-approved'],
      selectedAssetIds: [],
      approvedAssetIds: ['asset-selected'],
      assetOutcomes: [
        { assetId: 'asset-selected', batchId: 'batch-002c', status: 'selected', reasons: [] },
        { assetId: 'asset-approved', batchId: 'batch-002c', status: 'approved', reasons: [] }
      ]
    });

    expect(result.issues).toContain('selected_asset_ids_mismatch');
    expect(result.issues).toContain('approved_asset_ids_mismatch');
  });

  it.each(['actual_text', 'fake_text', 'logo', 'watermark', 'signature', 'corner_mark', 'footer', 'fake_ui_label', 'card_frame', 'poster_layout'] as const)(
    'forbids selected and approved assets carrying the %s blocking reason',
    (reason) => {
      const result = evaluateReviewOutcome({
        expectedAssetIds: ['asset-selected', 'asset-approved'],
        selectedAssetIds: ['asset-selected'],
        approvedAssetIds: ['asset-approved'],
        assetOutcomes: [
          { assetId: 'asset-selected', batchId: 'batch-002c', status: 'selected', reasons: [reason] },
          { assetId: 'asset-approved', batchId: 'batch-002c', status: 'approved', reasons: [reason] }
        ]
      });

      expect(result.issues).toContain('asset_with_blocking_reason_cannot_be_selected');
      expect(result.issues).toContain('asset_with_blocking_reason_cannot_be_approved');
    }
  );
});
