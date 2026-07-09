import type { ArtAssetType } from '../packages/asset-pipeline/src/index.js';

export {
  ArtBatchReviewOutcomeParseError,
  ArtBatchReviewOutcomeSchema,
  evaluateArtBatchReviewOutcome,
  parseArtBatchReviewOutcome,
  parseArtBatchReviewOutcomeJson
} from './art-production-status.js';
export type {
  ArtBatchReviewOutcomeParseContext,
  ArtBatchReviewOutcomeParseDiagnostic,
  ArtBatchReviewOutcomeParseDiagnosticIssue
} from './art-production-status.js';

export type ArtQualityGateProfileId = 'ProductionCleanSideRunnerV1';
export type ArtQualityGateVersion = '1.0';
export type ArtQualityGateCheckStatus = 'pass' | 'fail' | 'manual_review_required';
export type PromptQualityGateStatus = 'pass' | 'fail';
export type ImageContentGateStatus = 'not_evaluated' | 'manual_review_required' | 'manual_failed' | 'manual_passed' | 'automated_passed';
export type ProductionApprovalStatus = 'pending_human_review' | 'production_blocked' | 'production_approved';
/** Records provider/file execution only; it never implies production approval. */
export type GenerationExecutionStatus = 'skipped' | 'failed_before_provider_call' | 'provider_failed' | 'generation_completed';
/** Separates an open review from a blocked or approved production decision. */
export type ProductionClosureStatus = 'open_pending_review' | 'closed_blocked' | 'closed_approved';
export type ArtBatchPromptGateStatus = 'passed' | 'failed';
export type ArtAssetReviewStatus = 'approved' | 'selected' | 'needs_revision' | 'rejected';

export type ArtReviewFailureReason =
  | 'actual_text'
  | 'fake_text'
  | 'logo'
  | 'watermark'
  | 'signature'
  | 'corner_mark'
  | 'footer'
  | 'fake_ui_label'
  | 'not_strict_side_view'
  | 'not_gameplay_scale'
  | 'poster_layout'
  | 'card_frame'
  | 'concept_sheet_layout'
  | 'chibi_wrong_style'
  | 'ui_should_be_deterministic'
  | 'icon_should_be_glyph_only';

export type ArtQualityGateBlockingIssue =
  | 'missing_quality_gate_profile'
  | 'prompt_lineage_missing'
  | 'game_format_mismatch'
  | 'text_logo_watermark_signature'
  | 'side_view_strictness'
  | 'gameplay_scale_readability'
  | 'human_review_required';

export type ArtQualityGateCheck = {
  id: string;
  status: ArtQualityGateCheckStatus;
  blockingIssue?: ArtQualityGateBlockingIssue;
  message: string;
};

export type ArtQualityGateResult = {
  ok: boolean;
  profile: ArtQualityGateProfileId;
  version: ArtQualityGateVersion;
  qualityGateStatus: 'pass' | 'fail' | 'pending_human_review';
  promptQualityGateStatus: PromptQualityGateStatus;
  imageContentGateStatus: ImageContentGateStatus;
  productionApprovalStatus: ProductionApprovalStatus;
  checks: ArtQualityGateCheck[];
  blockingIssues: ArtQualityGateBlockingIssue[];
};

export type ArtAssetReviewOutcome = {
  assetId: string;
  batchId: string;
  status: ArtAssetReviewStatus;
  reasons: ArtReviewFailureReason[];
  notes?: string;
};

export type ArtBatchReviewOutcome = {
  batchId: string;
  parentBatchId?: string;
  generationExecutionStatus: GenerationExecutionStatus;
  promptGateStatus: ArtBatchPromptGateStatus;
  productionApprovalStatus: ProductionApprovalStatus;
  imageContentGateStatus: ImageContentGateStatus;
  productionClosureStatus: ProductionClosureStatus;
  selectedAssetIds: string[];
  approvedAssetIds: string[];
  reviewedAt: string;
  reviewer: string;
  assetOutcomes: ArtAssetReviewOutcome[];
  batchLevelFindings: string[];
};

export type EvaluateArtBatchReviewOutcomeOptions = {
  /** Manifest-owned asset ids; kept outside the review outcome so the receipt cannot self-authorize coverage. */
  expectedAssetIds?: readonly string[];
  allowPartialReview?: boolean;
};

export type ArtBatchReviewOutcomeIssue =
  | 'image_content_manual_failed_blocks_approval'
  | 'production_approval_requires_image_content_pass'
  | 'production_approval_requires_generation_completed'
  | 'production_approval_requires_prompt_gate_pass'
  | 'production_approval_requires_expected_asset_ids'
  | 'production_approval_requires_full_review_coverage'
  | 'pending_human_review_requires_open_pending_review'
  | 'production_blocked_requires_closed_blocked'
  | 'production_approved_requires_closed_approved'
  | 'review_outcome_references_unknown_asset'
  | 'review_outcome_references_wrong_batch'
  | 'review_outcome_contains_duplicate_asset'
  | 'review_outcome_missing_expected_asset'
  | 'selected_asset_ids_mismatch'
  | 'approved_asset_ids_mismatch'
  | 'production_approval_status_mismatch'
  | 'production_closure_status_mismatch'
  | 'production_approved_without_approved_asset'
  | 'production_approved_has_unresolved_asset'
  | 'production_blocked_has_selected_asset'
  | 'production_blocked_has_approved_asset'
  | 'manual_failed_has_selected_asset'
  | 'manual_failed_has_approved_asset'
  | 'asset_with_blocking_reason_cannot_be_selected'
  | 'asset_with_blocking_reason_cannot_be_approved';

export type ArtBatchReviewOutcomeResult = {
  ok: boolean;
  issues: ArtBatchReviewOutcomeIssue[];
  derivedProductionApprovalStatus: ProductionApprovalStatus;
  derivedProductionClosureStatus: ProductionClosureStatus;
};

export type ArtPromptQualityGate = {
  id: string;
  requiredTerms: readonly string[];
};

export type ArtReviewQualityGate = {
  id: string;
  requiredChecklistItems: readonly string[];
};

export type ArtQualityGateProfile = {
  profile: ArtQualityGateProfileId;
  version: ArtQualityGateVersion;
  automatedChecks: readonly string[];
  humanReviewRequired: readonly string[];
  promptGate: ArtPromptQualityGate;
  reviewGate: ArtReviewQualityGate;
};

export type ArtQualityGatePromptLineage = {
  sourceDslPath?: string;
  sourceDslHash?: string;
  promptTemplateId?: string;
  compiledPromptHash?: string;
};

export type ArtQualityGateTask = {
  taskId?: string;
  type: ArtAssetType | string;
  aspectRatio?: string;
  prompt?: string;
  negativePrompt?: string;
  promptLineage?: ArtQualityGatePromptLineage;
};

export type ArtQualityGateManifest = {
  qualityGateProfile?: string;
  qualityGateVersion?: string;
  sourceDslPath?: string;
  sourceDslHash?: string;
  gameFormat?: string;
  reviewState?: string;
  autoApproval?: boolean;
  autoSelection?: boolean;
  tasks?: readonly ArtQualityGateTask[];
  reviewIndexText?: string;
};

export const PRODUCTION_CLEAN_SIDE_RUNNER_BLOCKING_ISSUES: readonly ArtQualityGateBlockingIssue[] = [
  'text_logo_watermark_signature',
  'side_view_strictness',
  'gameplay_scale_readability'
] as const;


export const ProductionCleanSideRunnerV1: ArtQualityGateProfile = {
  profile: 'ProductionCleanSideRunnerV1',
  version: '1.0',
  automatedChecks: [
    'dsl_path_present',
    'dsl_hash_present',
    'prompt_lineage_present',
    'side_runner_prompt_constraints_present',
    'no_text_logo_watermark_prompt_constraints_present',
    'human_review_manifest_state_present'
  ],
  humanReviewRequired: [
    'actual_text_detection',
    'actual_fake_text_detection',
    'actual_logo_detection',
    'actual_watermark_detection',
    'actual_signature_detection',
    'actual_corner_mark_detection',
    'actual_footer_detection',
    'actual_fake_ui_label_detection',
    'actual_watermark_logo_signature_detection',
    'actual_side_view_strictness',
    'actual_gameplay_scale_readability'
  ],
  promptGate: {
    id: 'NoTextLogoWatermarkPromptGate',
    requiredTerms: [
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
      'no numbers'
    ]
  },
  reviewGate: {
    id: 'HumanReviewGate',
    requiredChecklistItems: [
      'Generation Execution Status',
      'Prompt Gate Status',
      'Image Content Gate Status',
      'Production Approval Status',
      'Production Closure Status',
      'Generated assets are review candidates only.',
      'Generated does not mean approved.',
      'Prompt gate pass does not mean image content pass.',
      'No asset is selected or approved until an explicit review outcome records it.',
      'game format fit',
      'gameplay readability',
      'ChiYan direction fit',
      'processability',
      'style consistency',
      'text/logo/watermark/signature check',
      'approve / selected / needs_revision / rejected'
    ]
  }
};

export function productionBatchMustDeclareQualityGate(manifest: ArtQualityGateManifest): { ok: true } | { ok: false; issue: 'missing_quality_gate_profile' } {
  return manifest.qualityGateProfile === undefined || manifest.qualityGateProfile.trim().length === 0
    ? { ok: false, issue: 'missing_quality_gate_profile' }
    : { ok: true };
}

export function evaluateArtProductionQualityGate(
  profile: ArtQualityGateProfile,
  manifest: ArtQualityGateManifest
): ArtQualityGateResult {
  const checks: ArtQualityGateCheck[] = [];

  checks.push(checkProfile(profile, manifest));
  checks.push(checkPromptLineage(manifest));
  checks.push(checkGameFormat(manifest));
  checks.push(...checkTasks(profile, manifest.tasks ?? []));
  checks.push(checkHumanReviewState(manifest));
  checks.push(checkReviewIndex(profile, manifest.reviewIndexText ?? ''));
  checks.push({
    id: 'HumanImageContentReviewRequired',
    status: 'manual_review_required',
    blockingIssue: 'human_review_required',
    message: 'Image content issues such as actual watermark, logo, signature, fake text, side-view strictness, and processability remain human review checks.'
  });

  const blockingIssues = unique(
    checks.filter((check) => check.status === 'fail' && check.blockingIssue !== undefined).map((check) => check.blockingIssue as ArtQualityGateBlockingIssue)
  );
  const promptQualityGateStatus: PromptQualityGateStatus = blockingIssues.length === 0 ? 'pass' : 'fail';
  const imageContentGateStatus: ImageContentGateStatus = promptQualityGateStatus === 'pass' ? 'manual_review_required' : 'not_evaluated';
  const productionApprovalStatus: ProductionApprovalStatus = promptQualityGateStatus === 'pass' ? 'pending_human_review' : 'production_blocked';

  return {
    ok: blockingIssues.length === 0,
    profile: profile.profile,
    version: profile.version,
    qualityGateStatus: blockingIssues.length === 0 ? 'pending_human_review' : 'fail',
    promptQualityGateStatus,
    imageContentGateStatus,
    productionApprovalStatus,
    checks,
    blockingIssues
  };
}


function checkProfile(profile: ArtQualityGateProfile, manifest: ArtQualityGateManifest): ArtQualityGateCheck {
  const ok = manifest.qualityGateProfile === profile.profile && manifest.qualityGateVersion === profile.version;
  return {
    id: 'QualityGateProfileDeclared',
    status: ok ? 'pass' : 'fail',
    ...(ok ? {} : { blockingIssue: 'missing_quality_gate_profile' as const }),
    message: ok ? 'Production batch declares the expected quality gate profile.' : 'Production batch must declare qualityGateProfile and qualityGateVersion.'
  };
}

function checkPromptLineage(manifest: ArtQualityGateManifest): ArtQualityGateCheck {
  const tasks = manifest.tasks ?? [];
  const manifestHasSource = nonEmpty(manifest.sourceDslPath) && nonEmpty(manifest.sourceDslHash);
  const tasksHaveLineage =
    tasks.length > 0 &&
    tasks.every(
      (task) =>
        nonEmpty(task.promptLineage?.sourceDslPath) &&
        nonEmpty(task.promptLineage?.sourceDslHash) &&
        nonEmpty(task.promptLineage?.promptTemplateId) &&
        nonEmpty(task.promptLineage?.compiledPromptHash)
    );

  const ok = manifestHasSource && tasksHaveLineage;
  return {
    id: 'PromptLineageGate',
    status: ok ? 'pass' : 'fail',
    ...(ok ? {} : { blockingIssue: 'prompt_lineage_missing' as const }),
    message: ok ? 'Manifest and tasks include source DSL and compiled prompt lineage.' : 'Production art manifest must preserve source DSL and prompt lineage.'
  };
}

function checkGameFormat(manifest: ArtQualityGateManifest): ArtQualityGateCheck {
  const tasks = manifest.tasks ?? [];
  const taskText = tasks.map(taskTextForGate).join('\n');
  const ok =
    manifest.gameFormat === 'side_scrolling_run_and_gun' &&
    containsAny(taskText, ['side-view', 'side view', 'side-on', 'side on']) &&
    containsAny(taskText, ['side-scrolling', 'side scrolling']) &&
    containsAny(taskText, ['run-and-gun', 'run and gun']) &&
    containsAll(taskText, ['horizontal combat lane']) &&
    containsAny(taskText, ['gameplay-scale', 'gameplay scale']);

  return {
    id: 'GameFormatGate',
    status: ok ? 'pass' : 'fail',
    ...(ok ? {} : { blockingIssue: 'game_format_mismatch' as const }),
    message: ok ? 'Batch is bound to side-scrolling run-and-gun production constraints.' : 'Side-runner production batches must bind prompts to side-view run-and-gun gameplay format.'
  };
}

function checkTasks(profile: ArtQualityGateProfile, tasks: readonly ArtQualityGateTask[]): ArtQualityGateCheck[] {
  return tasks.flatMap((task, index) => {
    const prefix = task.taskId ?? `task-${index}`;
    return [checkNoTextLogoWatermark(profile, task, prefix), ...checkAssetTypeSpecific(task, prefix)];
  });
}

function checkNoTextLogoWatermark(profile: ArtQualityGateProfile, task: ArtQualityGateTask, prefix: string): ArtQualityGateCheck {
  const text = taskTextForGate(task);
  const ok = profile.promptGate.requiredTerms.every((term) => containsTerm(text, term));
  return {
    id: `${prefix}:NoTextLogoWatermarkPromptGate`,
    status: ok ? 'pass' : 'fail',
    ...(ok ? {} : { blockingIssue: 'text_logo_watermark_signature' as const }),
    message: ok ? 'Prompt includes required no text/logo/watermark/signature constraints.' : 'Production prompt must include all required no text/logo/watermark/signature constraints.'
  };
}

function checkAssetTypeSpecific(task: ArtQualityGateTask, prefix: string): ArtQualityGateCheck[] {
  const text = taskTextForGate(task);
  switch (task.type) {
    case 'character_concept':
      return [
        checkTerms(
          `${prefix}:CharacterSideViewGate`,
          text,
          [
            ['full body', 'full-body'],
            ['side-view', 'side view', 'side-on', 'side on'],
            ['no front-facing hero portrait', 'not front-facing hero portrait'],
            ['no 3/4 splash art', 'not 3/4 splash art'],
            ['no poster layout'],
            ['no cropped body']
          ],
          'side_view_strictness'
        ),
        checkTerms(
          `${prefix}:CharacterGameplayReadabilityGate`,
          text,
          [
            ['gameplay-scale', 'gameplay scale'],
            ['readable silhouette'],
            ['animation-ready', 'animation ready']
          ],
          'gameplay_scale_readability'
        )
      ];
    case 'enemy_concept':
      return [checkTerms(
        `${prefix}:EnemyConceptGate`,
        text,
        [
          ['strict side-view', 'strict side view'],
          ['horizontal lane combat silhouette', 'horizontal combat lane'],
          ['weak point'],
          ['attack silhouette'],
          ['gameplay-scale', 'gameplay scale'],
          ['no boss splash-art-only poster', 'not boss splash art']
        ],
        'gameplay_scale_readability'
      )];
    case 'scene_background':
      return [checkTerms(
        `${prefix}:SceneBackgroundGate`,
        text,
        [
          ['16:9 horizontal'],
          ['side-scrolling background', 'side scrolling background'],
          ['clear traversal route'],
          ['platform line'],
          ['parallax layers'],
          ['no characters dominating'],
          ['no title'],
          ['no logo'],
          ['no watermark']
        ],
        'gameplay_scale_readability'
      )];
    case 'skill_icon':
      return [checkTerms(
        `${prefix}:SkillIconGate`,
        text,
        [
          ['1:1'],
          ['glyph only'],
          ['64x64'],
          ['no character'],
          ['no text'],
          ['no letters'],
          ['no numbers'],
          ['no badge frame with words'],
          ['no corner logo']
        ],
        'gameplay_scale_readability'
      )];
    case 'ui_concept':
      return [checkTerms(
        `${prefix}:UiConceptGate`,
        text,
        [
          ['16:9 HUD mockup', '16:9 horizontal'],
          ['abstract placeholder bars'],
          ['abstract icon slots'],
          ['no labels', 'no readable labels'],
          ['no fake language'],
          ['no fake English'],
          ['no fake Chinese'],
          ['no letters'],
          ['no numbers'],
          ['no logo'],
          ['no watermark'],
          ['no decorative typography']
        ],
        'text_logo_watermark_signature'
      )];
    default:
      return [{
        id: `${prefix}:AssetTypeSpecificGate`,
        status: 'pass',
        message: `No asset-type-specific checks registered for ${String(task.type)}.`
      }];
  }
}

function checkTerms(
  id: string,
  text: string,
  termGroups: readonly (readonly string[])[],
  blockingIssue: ArtQualityGateBlockingIssue
): ArtQualityGateCheck {
  const ok = termGroups.every((terms) => containsAny(text, terms));
  return {
    id,
    status: ok ? 'pass' : 'fail',
    ...(ok ? {} : { blockingIssue }),
    message: ok ? 'Asset-type prompt constraints are present.' : 'Asset-type prompt constraints are missing.'
  };
}

function checkHumanReviewState(manifest: ArtQualityGateManifest): ArtQualityGateCheck {
  const ok = manifest.autoApproval === false && manifest.autoSelection === false && manifest.reviewState === 'pending_human_review';
  return {
    id: 'HumanReviewGate',
    status: ok ? 'pass' : 'fail',
    ...(ok ? {} : { blockingIssue: 'human_review_required' as const }),
    message: ok ? 'Manifest requires pending human review and disables auto approval/selection.' : 'Production batches must remain pending human review with no auto approval or selection.'
  };
}

function checkReviewIndex(profile: ArtQualityGateProfile, reviewIndexText: string): ArtQualityGateCheck {
  const ok = profile.reviewGate.requiredChecklistItems.every((item) => containsTerm(reviewIndexText, item));
  return {
    id: 'ReviewChecklistGate',
    status: ok ? 'pass' : 'fail',
    ...(ok ? {} : { blockingIssue: 'human_review_required' as const }),
    message: ok ? 'Review index includes the required human review checklist.' : 'Review index must include required production art checklist items.'
  };
}

function taskTextForGate(task: ArtQualityGateTask): string {
  return [task.prompt ?? '', task.negativePrompt ?? ''].join('\n');
}

function containsTerm(value: string, term: string): boolean {
  return value.toLocaleLowerCase().includes(term.toLocaleLowerCase());
}

function containsAll(value: string, terms: readonly string[]): boolean {
  return terms.every((term) => containsTerm(value, term));
}

function containsAny(value: string, terms: readonly string[]): boolean {
  return terms.some((term) => containsTerm(value, term));
}

function nonEmpty(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
