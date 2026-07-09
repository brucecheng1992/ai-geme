import { describe, expect, it } from 'vitest';

import {
  ProductionCleanSideRunnerV1,
  evaluateArtBatchReviewOutcome,
  evaluateArtProductionQualityGate,
  productionBatchMustDeclareQualityGate
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
    'game format fit\ngameplay readability\nChiYan direction fit\nprocessability\nstyle consistency\ntext/logo/watermark/signature check\napprove / selected / needs_revision / rejected'
};

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
    const result = evaluateArtBatchReviewOutcome({
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
    const result = evaluateArtBatchReviewOutcome({
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
    const result = evaluateArtBatchReviewOutcome({
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
    const result = evaluateArtBatchReviewOutcome({
      batchId: 'batch-approved-clean',
      productionApprovalStatus: 'production_approved',
      imageContentGateStatus: 'manual_passed',
      reviewedAt: '2026-07-10T00:00:00.000Z',
      reviewer: 'human',
      assetOutcomes: [{ assetId: 'asset-approved', batchId: 'batch-approved-clean', status: 'approved', reasons: [] }],
      batchLevelFindings: []
    });

    expect(result).toEqual({ ok: true, issues: [] });
  });

  it('production_blocked review outcome allows no approved or selected assets', () => {
    const result = evaluateArtBatchReviewOutcome({
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
    const result = evaluateArtBatchReviewOutcome({
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
    const result = evaluateArtBatchReviewOutcome({
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
    const result = evaluateArtBatchReviewOutcome({
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
    const result = evaluateArtBatchReviewOutcome({
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
});
