import { z, type ZodIssue } from 'zod';

import type {
  ArtBatchReviewOutcome,
  ArtBatchReviewOutcomeIssue,
  ArtBatchReviewOutcomeResult,
  ArtReviewFailureReason,
  EvaluateArtBatchReviewOutcomeOptions,
  ImageContentGateStatus,
  ProductionApprovalStatus,
  ProductionClosureStatus
} from './art-quality-gates.js';

const ArtReviewFailureReasonSchema: z.ZodType<ArtReviewFailureReason> = z.enum([
  'actual_text',
  'fake_text',
  'logo',
  'watermark',
  'signature',
  'corner_mark',
  'footer',
  'fake_ui_label',
  'not_strict_side_view',
  'not_gameplay_scale',
  'poster_layout',
  'card_frame',
  'concept_sheet_layout',
  'chibi_wrong_style',
  'ui_should_be_deterministic',
  'icon_should_be_glyph_only'
]);

export const ArtBatchReviewOutcomeSchema: z.ZodType<ArtBatchReviewOutcome> = z
  .object({
    batchId: z.string().min(1),
    parentBatchId: z.string().min(1).optional(),
    generationExecutionStatus: z.enum(['skipped', 'failed_before_provider_call', 'provider_failed', 'generation_completed']),
    promptGateStatus: z.enum(['passed', 'failed']),
    productionApprovalStatus: z.enum(['pending_human_review', 'production_blocked', 'production_approved']),
    imageContentGateStatus: z.enum(['not_evaluated', 'manual_review_required', 'manual_failed', 'manual_passed', 'automated_passed']),
    productionClosureStatus: z.enum(['open_pending_review', 'closed_blocked', 'closed_approved']),
    selectedAssetIds: z.array(z.string().min(1)),
    approvedAssetIds: z.array(z.string().min(1)),
    reviewedAt: z.string().datetime(),
    reviewer: z.string().min(1),
    assetOutcomes: z.array(
      z
        .object({
          assetId: z.string().min(1),
          batchId: z.string().min(1),
          status: z.enum(['approved', 'selected', 'needs_revision', 'rejected']),
          reasons: z.array(ArtReviewFailureReasonSchema),
          notes: z.string().min(1).optional()
        })
        .strict()
    ),
    batchLevelFindings: z.array(z.string().min(1))
  })
  .strict();

const IMAGE_CONTENT_BLOCKING_REASONS = new Set<ArtReviewFailureReason>([
  'actual_text',
  'fake_text',
  'logo',
  'watermark',
  'signature',
  'corner_mark',
  'footer',
  'fake_ui_label',
  'not_strict_side_view',
  'not_gameplay_scale',
  'poster_layout',
  'card_frame',
  'concept_sheet_layout',
  'chibi_wrong_style',
  'ui_should_be_deterministic',
  'icon_should_be_glyph_only'
]);

export type ArtBatchReviewOutcomeParseContext = {
  inputSource?: string;
  fixtureId?: string;
};

export type ArtBatchReviewOutcomeParseDiagnosticIssue = {
  zod_issue_path: Array<string | number>;
  zod_issue_code: string;
  expected_type: string;
  actual_type: string;
};

export type ArtBatchReviewOutcomeParseDiagnostic = {
  result: 'BLOCKED';
  error_code: 'ART_BATCH_REVIEW_OUTCOME_JSON_INVALID' | 'ART_BATCH_REVIEW_OUTCOME_SCHEMA_INVALID';
  input_source: string;
  fixture_id: string | null;
  parser_stage: 'json_parse' | 'schema_validation';
  failure_kind: 'malformed_json' | 'shape_mismatch';
  issues: ArtBatchReviewOutcomeParseDiagnosticIssue[];
};

export class ArtBatchReviewOutcomeParseError extends Error {
  readonly diagnostic: ArtBatchReviewOutcomeParseDiagnostic;

  constructor(diagnostic: ArtBatchReviewOutcomeParseDiagnostic) {
    super(diagnostic.error_code);
    this.name = 'ArtBatchReviewOutcomeParseError';
    this.diagnostic = diagnostic;
  }
}

/** Parses JSON text and schema shape without echoing input values on failure. */
export function parseArtBatchReviewOutcomeJson(
  input: string,
  context: ArtBatchReviewOutcomeParseContext = {}
): ArtBatchReviewOutcome {
  let decoded: unknown;
  try {
    decoded = JSON.parse(input) as unknown;
  } catch {
    throw new ArtBatchReviewOutcomeParseError({
      result: 'BLOCKED',
      error_code: 'ART_BATCH_REVIEW_OUTCOME_JSON_INVALID',
      input_source: context.inputSource ?? 'runtime_input',
      fixture_id: context.fixtureId ?? null,
      parser_stage: 'json_parse',
      failure_kind: 'malformed_json',
      issues: [
        {
          zod_issue_path: [],
          zod_issue_code: 'invalid_json',
          expected_type: 'valid_json',
          actual_type: 'string'
        }
      ]
    });
  }
  return parseArtBatchReviewOutcome(decoded, context);
}

/** Parses decoded persisted human-review input at the strict Zod boundary. */
export function parseArtBatchReviewOutcome(
  input: unknown,
  context: ArtBatchReviewOutcomeParseContext = {}
): ArtBatchReviewOutcome {
  const parsed = ArtBatchReviewOutcomeSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }
  throw new ArtBatchReviewOutcomeParseError({
    result: 'BLOCKED',
    error_code: 'ART_BATCH_REVIEW_OUTCOME_SCHEMA_INVALID',
    input_source: context.inputSource ?? 'runtime_input',
    fixture_id: context.fixtureId ?? null,
    parser_stage: 'schema_validation',
    failure_kind: 'shape_mismatch',
    issues: parsed.error.issues.map((issue) => toParseDiagnosticIssue(input, issue))
  });
}

function toParseDiagnosticIssue(input: unknown, issue: ZodIssue): ArtBatchReviewOutcomeParseDiagnosticIssue {
  const normalizedPath = issue.path.map((segment) => (typeof segment === 'number' ? segment : String(segment)));
  return {
    zod_issue_path: normalizedPath,
    zod_issue_code: issue.code,
    expected_type: expectedTypeForIssue(issue),
    actual_type: describeRuntimeType(valueAtPath(input, normalizedPath))
  };
}

function expectedTypeForIssue(issue: ZodIssue): string {
  const expected = (issue as ZodIssue & { expected?: unknown }).expected;
  if (typeof expected === 'string') {
    return expected;
  }
  if (issue.code === 'invalid_value') {
    return 'enum_member';
  }
  if (issue.code === 'unrecognized_keys') {
    return 'known_object_key';
  }
  if (issue.code === 'too_small') {
    return 'non_empty_value';
  }
  return 'schema_constraint';
}

function valueAtPath(input: unknown, path: readonly (string | number)[]): unknown {
  let value = input;
  for (const segment of path) {
    if (typeof value !== 'object' || value === null || !(segment in value)) {
      return undefined;
    }
    value = (value as Record<string | number, unknown>)[segment];
  }
  return value;
}

function describeRuntimeType(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  return Array.isArray(value) ? 'array' : typeof value;
}

/**
 * Validates a review receipt against manifest-owned asset ids and derives the
 * authoritative approval/closure pair. `ok` means internally consistent; a
 * valid `closed_blocked` outcome is not production success.
 */
export function evaluateArtBatchReviewOutcome(
  outcome: ArtBatchReviewOutcome,
  options: EvaluateArtBatchReviewOutcomeOptions = {}
): ArtBatchReviewOutcomeResult {
  const issues: ArtBatchReviewOutcomeIssue[] = [];
  const selectedAssets = outcome.assetOutcomes.filter((asset) => asset.status === 'selected');
  const approvedAssets = outcome.assetOutcomes.filter((asset) => asset.status === 'approved');
  const reviewedAssetIds = outcome.assetOutcomes.map((asset) => asset.assetId);
  const expectedAssetIds = options.expectedAssetIds;
  const expectedAssetIdSet = new Set(expectedAssetIds ?? []);
  const reviewedAssetIdSet = new Set(reviewedAssetIds);
  const selectedAssetIdsMatch = sameStringSet(outcome.selectedAssetIds, selectedAssets.map((asset) => asset.assetId));
  const approvedAssetIdsMatch = sameStringSet(outcome.approvedAssetIds, approvedAssets.map((asset) => asset.assetId));
  const hasExpectedAssetAuthority = expectedAssetIds !== undefined;
  const hasFullReviewCoverage =
    hasExpectedAssetAuthority &&
    expectedAssetIds.length > 0 &&
    expectedAssetIdSet.size === expectedAssetIds.length &&
    reviewedAssetIdSet.size === reviewedAssetIds.length &&
    reviewedAssetIds.length === expectedAssetIds.length &&
    expectedAssetIds.every((assetId) => reviewedAssetIdSet.has(assetId));
  const hasUnknownReviewAsset = hasExpectedAssetAuthority && reviewedAssetIds.some((assetId) => !expectedAssetIdSet.has(assetId));
  const hasMissingReviewAsset = hasExpectedAssetAuthority && expectedAssetIds.some((assetId) => !reviewedAssetIdSet.has(assetId));
  const hasDuplicateReviewAsset = reviewedAssetIdSet.size !== reviewedAssetIds.length;
  const hasWrongBatchReviewAsset = outcome.assetOutcomes.some((asset) => asset.batchId !== outcome.batchId);

  if (hasUnknownReviewAsset) {
    issues.push('review_outcome_references_unknown_asset');
  }
  if (hasWrongBatchReviewAsset) {
    issues.push('review_outcome_references_wrong_batch');
  }
  if (hasDuplicateReviewAsset) {
    issues.push('review_outcome_contains_duplicate_asset');
  }
  if (hasMissingReviewAsset && options.allowPartialReview !== true) {
    issues.push('review_outcome_missing_expected_asset');
  }
  if (!selectedAssetIdsMatch) {
    issues.push('selected_asset_ids_mismatch');
  }
  if (!approvedAssetIdsMatch) {
    issues.push('approved_asset_ids_mismatch');
  }

  if (outcome.imageContentGateStatus === 'manual_failed' && outcome.productionApprovalStatus === 'production_approved') {
    issues.push('image_content_manual_failed_blocks_approval');
  }

  const imageContentPassed = isImageContentPassed(outcome.imageContentGateStatus);
  if (outcome.productionApprovalStatus === 'production_approved' && !imageContentPassed) {
    issues.push('production_approval_requires_image_content_pass');
  }

  if (outcome.productionApprovalStatus === 'pending_human_review' && outcome.productionClosureStatus !== 'open_pending_review') {
    issues.push('pending_human_review_requires_open_pending_review');
  }
  if (outcome.productionApprovalStatus === 'production_blocked' && outcome.productionClosureStatus !== 'closed_blocked') {
    issues.push('production_blocked_requires_closed_blocked');
  }
  if (outcome.productionApprovalStatus === 'production_approved' && outcome.productionClosureStatus !== 'closed_approved') {
    issues.push('production_approved_requires_closed_approved');
  }

  if (outcome.productionApprovalStatus === 'production_approved') {
    if (outcome.generationExecutionStatus !== 'generation_completed') {
      issues.push('production_approval_requires_generation_completed');
    }
    if (outcome.promptGateStatus !== 'passed') {
      issues.push('production_approval_requires_prompt_gate_pass');
    }
    if (!hasExpectedAssetAuthority || expectedAssetIds.length === 0) {
      issues.push('production_approval_requires_expected_asset_ids');
    }
    if (!hasFullReviewCoverage) {
      issues.push('production_approval_requires_full_review_coverage');
    }
    if (approvedAssets.length === 0) {
      issues.push('production_approved_without_approved_asset');
    }
    if (outcome.assetOutcomes.some((asset) => asset.status !== 'approved')) {
      issues.push('production_approved_has_unresolved_asset');
    }
  }

  if (outcome.productionApprovalStatus === 'production_blocked') {
    if (selectedAssets.length > 0) {
      issues.push('production_blocked_has_selected_asset');
    }
    if (approvedAssets.length > 0) {
      issues.push('production_blocked_has_approved_asset');
    }
  }

  if (outcome.imageContentGateStatus === 'manual_failed') {
    if (selectedAssets.length > 0) {
      issues.push('manual_failed_has_selected_asset');
    }
    if (approvedAssets.length > 0) {
      issues.push('manual_failed_has_approved_asset');
    }
  }

  for (const asset of outcome.assetOutcomes) {
    if (!asset.reasons.some((reason) => IMAGE_CONTENT_BLOCKING_REASONS.has(reason))) {
      continue;
    }
    if (asset.status === 'selected') {
      issues.push('asset_with_blocking_reason_cannot_be_selected');
    }
    if (asset.status === 'approved') {
      issues.push('asset_with_blocking_reason_cannot_be_approved');
    }
  }

  const hasBlockingAssetDecision = outcome.assetOutcomes.some(
    (asset) => asset.status === 'needs_revision' || asset.status === 'rejected' || asset.reasons.some((reason) => IMAGE_CONTENT_BLOCKING_REASONS.has(reason))
  );
  const hasExplicitApprovalEvidence =
    outcome.generationExecutionStatus === 'generation_completed' &&
    outcome.promptGateStatus === 'passed' &&
    imageContentPassed &&
    hasFullReviewCoverage &&
    approvedAssets.length > 0 &&
    selectedAssets.length === 0 &&
    outcome.assetOutcomes.every((asset) => asset.status === 'approved') &&
    !hasBlockingAssetDecision &&
    selectedAssetIdsMatch &&
    approvedAssetIdsMatch;
  const hasIntegrityIssue =
    hasUnknownReviewAsset ||
    hasWrongBatchReviewAsset ||
    hasDuplicateReviewAsset ||
    (hasMissingReviewAsset && options.allowPartialReview !== true) ||
    !selectedAssetIdsMatch ||
    !approvedAssetIdsMatch;
  const derivedProductionApprovalStatus = deriveProductionApprovalStatus({
    outcome,
    imageContentPassed,
    hasBlockingAssetDecision,
    hasExplicitApprovalEvidence,
    hasIntegrityIssue
  });
  const derivedProductionClosureStatus = closureForApprovalStatus(derivedProductionApprovalStatus);

  if (outcome.productionApprovalStatus !== derivedProductionApprovalStatus) {
    issues.push('production_approval_status_mismatch');
  }
  if (outcome.productionClosureStatus !== derivedProductionClosureStatus) {
    issues.push('production_closure_status_mismatch');
  }

  const uniqueIssues = unique(issues);
  return {
    ok: uniqueIssues.length === 0,
    issues: uniqueIssues,
    derivedProductionApprovalStatus,
    derivedProductionClosureStatus
  };
}

function deriveProductionApprovalStatus(input: {
  outcome: ArtBatchReviewOutcome;
  imageContentPassed: boolean;
  hasBlockingAssetDecision: boolean;
  hasExplicitApprovalEvidence: boolean;
  hasIntegrityIssue: boolean;
}): ProductionApprovalStatus {
  if (
    input.hasIntegrityIssue ||
    input.outcome.generationExecutionStatus !== 'generation_completed' ||
    input.outcome.promptGateStatus === 'failed' ||
    input.outcome.imageContentGateStatus === 'manual_failed' ||
    (input.imageContentPassed && input.hasBlockingAssetDecision)
  ) {
    return 'production_blocked';
  }
  return input.hasExplicitApprovalEvidence ? 'production_approved' : 'pending_human_review';
}

function closureForApprovalStatus(status: ProductionApprovalStatus): ProductionClosureStatus {
  if (status === 'production_approved') {
    return 'closed_approved';
  }
  return status === 'production_blocked' ? 'closed_blocked' : 'open_pending_review';
}

function isImageContentPassed(status: ImageContentGateStatus): boolean {
  return status === 'manual_passed' || status === 'automated_passed';
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return leftSet.size === left.length && rightSet.size === right.length && right.every((value) => leftSet.has(value));
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
