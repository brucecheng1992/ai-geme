import { describe, expect, it } from 'vitest';

import {
  ArtBatchReviewOutcomeParseError,
  evaluateArtBatchReviewOutcome,
  parseArtBatchReviewOutcome,
  parseArtBatchReviewOutcomeJson,
  type ArtBatchReviewOutcome,
  type GenerationExecutionStatus,
  type ProductionClosureStatus
} from '../../scripts/art-quality-gates.js';
import {
  evaluateArtBatchReviewOutcome as evaluateArtBatchReviewOutcomeFromStatusModule,
  parseArtBatchReviewOutcomeJson as parseArtBatchReviewOutcomeJsonFromStatusModule
} from '../../scripts/art-production-status.js';

function makeOutcome(overrides: Partial<ArtBatchReviewOutcome> = {}): ArtBatchReviewOutcome {
  return {
    batchId: 'batch-status',
    generationExecutionStatus: 'generation_completed',
    promptGateStatus: 'passed',
    imageContentGateStatus: 'manual_review_required',
    productionApprovalStatus: 'pending_human_review',
    productionClosureStatus: 'open_pending_review',
    selectedAssetIds: [],
    approvedAssetIds: [],
    reviewedAt: '2026-07-10T00:00:00.000Z',
    reviewer: 'human',
    assetOutcomes: [{ assetId: 'asset-1', batchId: 'batch-status', status: 'needs_revision', reasons: [] }],
    batchLevelFindings: [],
    ...overrides
  };
}

function evaluateOutcome(overrides: Partial<ArtBatchReviewOutcome> = {}, expectedAssetIds: readonly string[] = ['asset-1']) {
  return evaluateArtBatchReviewOutcome(makeOutcome(overrides), { expectedAssetIds });
}

describe('Art production status semantics', () => {
  it('keeps the original public import path as a direct compatibility re-export', () => {
    expect(evaluateArtBatchReviewOutcome).toBe(evaluateArtBatchReviewOutcomeFromStatusModule);
    expect(parseArtBatchReviewOutcomeJson).toBe(parseArtBatchReviewOutcomeJsonFromStatusModule);
  });

  it('fails malformed JSON closed with structured parser diagnostics', () => {
    expect.assertions(2);

    try {
      parseArtBatchReviewOutcomeJson('{"batchId":', {
        inputSource: 'docs/art-pipeline/review-outcomes/batch-002c-human-review.json',
        fixtureId: 'batch-002c-human-review'
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ArtBatchReviewOutcomeParseError);
      expect(error).toMatchObject({
        diagnostic: {
          result: 'BLOCKED',
          error_code: 'ART_BATCH_REVIEW_OUTCOME_JSON_INVALID',
          input_source: 'docs/art-pipeline/review-outcomes/batch-002c-human-review.json',
          fixture_id: 'batch-002c-human-review',
          parser_stage: 'json_parse',
          failure_kind: 'malformed_json',
          issues: [
            {
              zod_issue_path: [],
              expected_type: 'valid_json',
              actual_type: 'string'
            }
          ]
        }
      });
    }
  });

  it.each([
    ['missing required field', { batchId: 'batch-invalid' }],
    ['wrong field type', { ...makeOutcome(), selectedAssetIds: 'asset-1' }],
    ['illegal enum value', { ...makeOutcome(), productionClosureStatus: 'complete' }],
    ['wrong nested object shape', { ...makeOutcome(), assetOutcomes: [{ assetId: 'asset-1' }] }],
    ['wrong array element shape', { ...makeOutcome(), assetOutcomes: ['asset-1'] }],
    ['unknown strict-schema field', { ...makeOutcome(), unexpectedApproval: true }]
  ])('fails %s closed at the Zod runtime boundary', (_label, input) => {
    expect.assertions(2);

    try {
      parseArtBatchReviewOutcome(input, {
        inputSource: 'runtime-review-outcome',
        fixtureId: 'shape-contract-test'
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ArtBatchReviewOutcomeParseError);
      expect(error).toMatchObject({
        diagnostic: {
          result: 'BLOCKED',
          error_code: 'ART_BATCH_REVIEW_OUTCOME_SCHEMA_INVALID',
          input_source: 'runtime-review-outcome',
          fixture_id: 'shape-contract-test',
          parser_stage: 'schema_validation',
          failure_kind: 'shape_mismatch'
        }
      });
    }
  });

  it('does not continue to evaluation after parser failure', () => {
    let evaluatorReached = false;

    expect(() => {
      const parsed = parseArtBatchReviewOutcome(
        {
          batchId: 'batch-invalid',
          productionApprovalStatus: 'production_approved',
          assetOutcomes: []
        },
        { inputSource: 'runtime-review-outcome', fixtureId: 'fail-closed-control-flow' }
      );
      evaluatorReached = true;
      evaluateArtBatchReviewOutcome(parsed, { expectedAssetIds: [] });
    }).toThrow(ArtBatchReviewOutcomeParseError);

    expect(evaluatorReached).toBe(false);
  });

  it('defines the complete generation execution and production closure status vocabularies', () => {
    const generationStatuses: GenerationExecutionStatus[] = ['skipped', 'failed_before_provider_call', 'provider_failed', 'generation_completed'];
    const closureStatuses: ProductionClosureStatus[] = ['open_pending_review', 'closed_blocked', 'closed_approved'];

    expect(generationStatuses).toHaveLength(4);
    expect(closureStatuses).toHaveLength(3);
  });

  it('does not derive production approval from generation_completed', () => {
    const result = evaluateOutcome();

    expect(result.derivedProductionApprovalStatus).toBe('pending_human_review');
    expect(result.derivedProductionClosureStatus).toBe('open_pending_review');
  });

  it('does not derive production approval from a passed prompt gate', () => {
    const result = evaluateOutcome({ promptGateStatus: 'passed' });

    expect(result.derivedProductionApprovalStatus).toBe('pending_human_review');
    expect(result.derivedProductionClosureStatus).toBe('open_pending_review');
  });

  it('requires pending_human_review to remain open_pending_review', () => {
    const result = evaluateOutcome({ productionClosureStatus: 'closed_approved' });

    expect(result.issues).toContain('pending_human_review_requires_open_pending_review');
  });

  it('forbids production approval when image content review failed', () => {
    const result = evaluateOutcome({
      imageContentGateStatus: 'manual_failed',
      productionApprovalStatus: 'production_approved',
      productionClosureStatus: 'closed_approved',
      approvedAssetIds: ['asset-1'],
      assetOutcomes: [{ assetId: 'asset-1', batchId: 'batch-status', status: 'approved', reasons: [] }]
    });

    expect(result.issues).toContain('image_content_manual_failed_blocks_approval');
  });

  it('requires production_blocked to use closed_blocked', () => {
    const result = evaluateOutcome({
      imageContentGateStatus: 'manual_failed',
      productionApprovalStatus: 'production_blocked',
      productionClosureStatus: 'open_pending_review'
    });

    expect(result.issues).toContain('production_blocked_requires_closed_blocked');
  });

  it('forbids selected and approved assets in production_blocked outcomes', () => {
    const result = evaluateOutcome(
      {
        imageContentGateStatus: 'manual_failed',
        productionApprovalStatus: 'production_blocked',
        productionClosureStatus: 'closed_blocked',
        selectedAssetIds: ['asset-selected'],
        approvedAssetIds: ['asset-approved'],
        assetOutcomes: [
          { assetId: 'asset-selected', batchId: 'batch-status', status: 'selected', reasons: [] },
          { assetId: 'asset-approved', batchId: 'batch-status', status: 'approved', reasons: [] }
        ]
      },
      ['asset-selected', 'asset-approved']
    );

    expect(result.issues).toContain('production_blocked_has_selected_asset');
    expect(result.issues).toContain('production_blocked_has_approved_asset');
  });

  it('requires production approval to follow an image-content pass', () => {
    const result = evaluateOutcome({
      productionApprovalStatus: 'production_approved',
      productionClosureStatus: 'closed_approved',
      approvedAssetIds: ['asset-1'],
      assetOutcomes: [{ assetId: 'asset-1', batchId: 'batch-status', status: 'approved', reasons: [] }]
    });

    expect(result.issues).toContain('production_approval_requires_image_content_pass');
  });

  it('requires production approval to use closed_approved', () => {
    const result = evaluateOutcome({
      imageContentGateStatus: 'manual_passed',
      productionApprovalStatus: 'production_approved',
      productionClosureStatus: 'open_pending_review',
      approvedAssetIds: ['asset-1'],
      assetOutcomes: [{ assetId: 'asset-1', batchId: 'batch-status', status: 'approved', reasons: [] }]
    });

    expect(result.issues).toContain('production_approved_requires_closed_approved');
  });

  it('requires closed_approved to have an explicit approved asset outcome', () => {
    const result = evaluateOutcome({
      imageContentGateStatus: 'manual_passed',
      productionApprovalStatus: 'production_approved',
      productionClosureStatus: 'closed_approved'
    });

    expect(result.issues).toContain('production_approved_without_approved_asset');
    expect(result.issues).toContain('production_approved_has_unresolved_asset');
  });

  it('does not derive closed_approved from matching generated and requested counts', () => {
    const generatedAssetCount = 1;
    const totalRequestedImages = 1;
    const result = evaluateOutcome();

    expect(generatedAssetCount).toBe(totalRequestedImages);
    expect(result.derivedProductionApprovalStatus).toBe('pending_human_review');
    expect(result.derivedProductionClosureStatus).toBe('open_pending_review');
  });

  it('rejects review assets from a different batch', () => {
    const result = evaluateOutcome({
      imageContentGateStatus: 'manual_passed',
      productionApprovalStatus: 'production_approved',
      productionClosureStatus: 'closed_approved',
      approvedAssetIds: ['asset-1'],
      assetOutcomes: [{ assetId: 'asset-1', batchId: 'other-batch', status: 'approved', reasons: [] }]
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContain('review_outcome_references_wrong_batch');
  });

  it('rejects duplicate reviewed asset ids as an integrity issue', () => {
    const result = evaluateOutcome(
      {
        assetOutcomes: [
          { assetId: 'asset-1', batchId: 'batch-status', status: 'needs_revision', reasons: [] },
          { assetId: 'asset-2', batchId: 'batch-status', status: 'needs_revision', reasons: [] },
          { assetId: 'asset-2', batchId: 'batch-status', status: 'needs_revision', reasons: [] }
        ]
      },
      ['asset-1', 'asset-2']
    );

    expect(result.ok).toBe(false);
    expect(result.issues).toContain('review_outcome_contains_duplicate_asset');
  });

  it('allows automated image-content approval only with full explicit approval evidence', () => {
    const result = evaluateOutcome({
      imageContentGateStatus: 'automated_passed',
      productionApprovalStatus: 'production_approved',
      productionClosureStatus: 'closed_approved',
      approvedAssetIds: ['asset-1'],
      assetOutcomes: [{ assetId: 'asset-1', batchId: 'batch-status', status: 'approved', reasons: [] }]
    });

    expect(result).toMatchObject({
      ok: true,
      issues: [],
      derivedProductionApprovalStatus: 'production_approved',
      derivedProductionClosureStatus: 'closed_approved'
    });
  });
});
