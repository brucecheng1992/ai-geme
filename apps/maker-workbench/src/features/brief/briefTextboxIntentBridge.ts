import {
  parseSemanticId,
  type SemanticEditIntent,
  type SemanticId,
  type SemanticIndex,
  type SemanticPatch,
  type SemanticPatchDiffViewModel
} from '../../../../../packages/game-dsl/src/semantic-editing/index.js';
import {
  runLiveSemanticEdit,
  type LiveSemanticEditResult
} from '../../../../../packages/game-dsl/src/live-editing/index.js';

import {
  DEFAULT_BRIEF_TEXTBOX_TARGET,
  validateBriefTextboxDraft,
  withBriefTextboxValidation,
  type BriefTextboxContext,
  type BriefTextboxDraft,
  type BriefTextboxValidationResult
} from './briefTextboxSchema.js';

export type BriefTextboxTraceEvent = {
  draftHash: string;
  status: 'requested' | 'preview_ready' | 'preview_failed';
  intentId?: string;
  patchId?: string;
};

export type BriefTextboxPatchReviewHandoff = {
  projectId: string;
  runId: string;
  draftHash: string;
  intentId: string;
  patchId: string;
  target: SemanticId;
  intent: SemanticEditIntent;
  patch: SemanticPatch;
  diff: SemanticPatchDiffViewModel;
};

export type BriefTextboxPatchPreviewSuccess = {
  ok: true;
  status: 'preview_ready';
  canAccept: true;
  draft: BriefTextboxDraft;
  validation: BriefTextboxValidationResult;
  result: LiveSemanticEditResult;
  intent: SemanticEditIntent;
  patch: SemanticPatch;
  diff: SemanticPatchDiffViewModel;
  handoff: BriefTextboxPatchReviewHandoff;
  traceEvents: BriefTextboxTraceEvent[];
  warnings: string[];
};

export type BriefTextboxPatchPreviewFailure = {
  ok: false;
  status: 'preview_failed';
  canAccept: false;
  draft: BriefTextboxDraft;
  validation: BriefTextboxValidationResult;
  result?: LiveSemanticEditResult;
  error: {
    code: string;
    message: string;
  };
  handoff?: undefined;
  traceEvents: BriefTextboxTraceEvent[];
  warnings: string[];
};

export type BriefTextboxPatchPreviewResult = BriefTextboxPatchPreviewSuccess | BriefTextboxPatchPreviewFailure;

export function previewBriefTextboxSemanticPatch(input: {
  draft: BriefTextboxDraft;
  context: BriefTextboxContext;
  document?: unknown;
  semanticIndex?: SemanticIndex;
  now?: () => Date;
  createIntentId?: Parameters<typeof runLiveSemanticEdit>[0]['createIntentId'];
  createPatchId?: Parameters<typeof runLiveSemanticEdit>[0]['createPatchId'];
}): BriefTextboxPatchPreviewResult {
  const now = input.now ?? (() => new Date());
  const validation = validateBriefTextboxDraft(input.draft, input.context);
  const requested = createBriefTextboxTraceEvent({
    validation,
    status: 'requested'
  });

  if (!validation.ok) {
    return previewFailure({
      draft: input.draft,
      validation,
      requested,
      code: validation.errors[0]?.code ?? 'BRIEF_TEXTBOX_VALIDATION_FAILED',
      message: validation.errors[0]?.message ?? 'Brief textbox validation failed.'
    });
  }

  if (input.draft.mode !== 'edit_current_game') {
    return previewFailure({
      draft: input.draft,
      validation,
      requested,
      code: 'BRIEF_TEXTBOX_PREVIEW_REQUIRES_EDIT_MODE',
      message: 'Preview Patch is only available in edit current game mode.'
    });
  }

  if (input.document === undefined || input.semanticIndex === undefined) {
    return previewFailure({
      draft: input.draft,
      validation,
      requested,
      code: 'BRIEF_TEXTBOX_PREVIEW_SOURCE_MISSING',
      message: 'A loaded semantic document and SemanticIndex are required before previewing a patch.'
    });
  }

  const defaults = resolveLiveSemanticEditDefaults(validation.target ?? DEFAULT_BRIEF_TEXTBOX_TARGET);
  const result = runLiveSemanticEdit({
    text: input.draft.text,
    document: input.document,
    semanticIndex: input.semanticIndex,
    autoApply: false,
    correlationId: `${input.draft.projectId}:${input.draft.runId ?? 'run'}:${validation.draftHash}`,
    now,
    createIntentId: input.createIntentId,
    createPatchId: input.createPatchId,
    defaultSceneTarget: defaults.defaultSceneTarget,
    defaultEntityId: defaults.defaultEntityId
  });

  if (!result.ok || result.stage !== 'validated' || result.intent === undefined || result.plan === undefined || !result.plan.ok || result.diff === undefined) {
    return previewFailure({
      draft: input.draft,
      validation,
      requested,
      result,
      code: result.error?.code ?? 'BRIEF_TEXTBOX_PREVIEW_FAILED',
      message: result.error?.message ?? 'Brief textbox patch preview did not produce a validated patch.'
    });
  }

  const ready = createBriefTextboxTraceEvent({
    validation,
    status: 'preview_ready',
    intentId: result.intent.id,
    patchId: result.plan.patch.id
  });
  const draft = withBriefTextboxValidation({ ...input.draft, status: 'preview_ready' }, validation);
  const runId = input.draft.runId;
  if (runId === undefined) {
    return previewFailure({
      draft: input.draft,
      validation,
      requested,
      result,
      code: 'BRIEF_TEXTBOX_RUN_REQUIRED',
      message: 'Run ID is required before handing off a semantic patch preview.'
    });
  }

  return {
    ok: true,
    status: 'preview_ready',
    canAccept: true,
    draft,
    validation,
    result,
    intent: result.intent,
    patch: result.plan.patch,
    diff: result.diff,
    handoff: {
      projectId: input.draft.projectId,
      runId,
      draftHash: validation.draftHash,
      intentId: result.intent.id,
      patchId: result.plan.patch.id,
      target: result.intent.target,
      intent: result.intent,
      patch: result.plan.patch,
      diff: result.diff
    },
    traceEvents: [requested, ready],
    warnings: [...validation.warnings.map((issue) => issue.code), ...result.warnings]
  };
}

function previewFailure(input: {
  draft: BriefTextboxDraft;
  validation: BriefTextboxValidationResult;
  requested: BriefTextboxTraceEvent;
  result?: LiveSemanticEditResult;
  code: string;
  message: string;
}): BriefTextboxPatchPreviewFailure {
  const failed = createBriefTextboxTraceEvent({
    validation: input.validation,
    status: 'preview_failed',
    intentId: input.result?.intent?.id,
    patchId: input.result?.plan?.ok === true ? input.result.plan.patch.id : undefined
  });

  return {
    ok: false,
    status: 'preview_failed',
    canAccept: false,
    draft: withBriefTextboxValidation({ ...input.draft, status: 'preview_failed' }, input.validation),
    validation: input.validation,
    result: input.result,
    error: {
      code: input.code,
      message: input.message
    },
    traceEvents: [input.requested, failed],
    warnings: [...input.validation.warnings.map((issue) => issue.code), ...(input.result?.warnings ?? [])]
  };
}

function createBriefTextboxTraceEvent(input: {
  validation: BriefTextboxValidationResult;
  status: BriefTextboxTraceEvent['status'];
  intentId?: string;
  patchId?: string;
}): BriefTextboxTraceEvent {
  return {
    draftHash: input.validation.draftHash,
    status: input.status,
    ...(input.intentId === undefined ? {} : { intentId: input.intentId }),
    ...(input.patchId === undefined ? {} : { patchId: input.patchId })
  };
}

function resolveLiveSemanticEditDefaults(target: SemanticId): {
  defaultSceneTarget: `scene:${string}`;
  defaultEntityId: `entity:${string}`;
} {
  const parsed = parseSemanticId(target);
  return {
    defaultSceneTarget: parsed?.kind === 'scene' ? (target as `scene:${string}`) : 'scene:main',
    defaultEntityId: parsed?.kind === 'entity' ? (target as `entity:${string}`) : 'entity:player'
  };
}
