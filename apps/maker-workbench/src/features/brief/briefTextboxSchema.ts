import { isSemanticId, type SemanticId } from '@ai-game-maker/game-dsl';

export type BriefTextboxMode = 'new_game' | 'edit_current_game';

export type BriefTextboxDraftStatus =
  | 'empty'
  | 'dirty'
  | 'validating'
  | 'valid'
  | 'invalid'
  | 'preview_ready'
  | 'preview_failed';

export type BriefTextboxDraft = {
  projectId: string;
  runId?: string;
  text: string;
  language?: string;
  target?: string;
  mode: BriefTextboxMode;
  source: 'workbench';
  dirty: boolean;
  status: BriefTextboxDraftStatus;
  validationErrors: string[];
  validationWarnings: string[];
  updatedAt: string;
};

export type BriefTextboxContext = {
  projectId: string;
  runId?: string;
};

export type BriefTextboxValidationIssue = {
  code: string;
  message: string;
};

export type BriefTextboxValidationResult = {
  ok: boolean;
  errors: BriefTextboxValidationIssue[];
  warnings: BriefTextboxValidationIssue[];
  draftHash: string;
  target?: SemanticId;
  stale: boolean;
};

export const BRIEF_TEXTBOX_MAX_LENGTH = 2000;
export const DEFAULT_BRIEF_TEXTBOX_TARGET = 'entity:player' satisfies SemanticId;

export function createBriefTextboxDraft(input: {
  projectId: string;
  runId?: string;
  text: string;
  language?: string;
  target?: string;
  mode?: BriefTextboxMode;
  dirty?: boolean;
  status?: BriefTextboxDraftStatus;
  now?: () => Date;
}): BriefTextboxDraft {
  const draft: BriefTextboxDraft = {
    projectId: input.projectId.trim(),
    ...(input.runId?.trim() ? { runId: input.runId.trim() } : {}),
    text: input.text,
    ...(input.language?.trim() ? { language: input.language.trim() } : {}),
    target: input.target ?? DEFAULT_BRIEF_TEXTBOX_TARGET,
    mode: input.mode ?? 'new_game',
    source: 'workbench',
    dirty: input.dirty ?? false,
    status: input.status ?? (input.text.trim().length === 0 ? 'empty' : 'dirty'),
    validationErrors: [],
    validationWarnings: [],
    updatedAt: (input.now ?? (() => new Date()))().toISOString()
  };
  return withBriefTextboxValidation(draft, validateBriefTextboxDraft(draft, { projectId: draft.projectId, runId: draft.runId }));
}

export function validateBriefTextboxDraft(
  draft: BriefTextboxDraft,
  context: BriefTextboxContext = { projectId: draft.projectId, runId: draft.runId }
): BriefTextboxValidationResult {
  const errors: BriefTextboxValidationIssue[] = [];
  const warnings: BriefTextboxValidationIssue[] = [];
  const text = draft.text.trim();
  const targetText = draft.target?.trim() ?? '';
  const target = isSemanticId(targetText) ? targetText : undefined;
  const stale =
    draft.mode === 'edit_current_game' &&
    ((context.projectId.trim().length > 0 && draft.projectId !== context.projectId.trim()) ||
      ((context.runId?.trim() ?? '') !== (draft.runId ?? '')));

  if (text.length === 0) {
    errors.push({
      code: 'BRIEF_TEXTBOX_TEXT_EMPTY',
      message: 'Brief text is required before previewing a semantic patch.'
    });
  }

  if (text.length > BRIEF_TEXTBOX_MAX_LENGTH) {
    errors.push({
      code: 'BRIEF_TEXTBOX_TEXT_TOO_LONG',
      message: `Brief text must be ${BRIEF_TEXTBOX_MAX_LENGTH} characters or fewer.`
    });
  }

  if (targetText.length === 0 || target === undefined) {
    errors.push({
      code: 'BRIEF_TEXTBOX_TARGET_INVALID',
      message: 'Semantic edit target must be a semantic id such as entity:player or scene:main.'
    });
  }

  if (draft.mode === 'edit_current_game') {
    if (draft.projectId.length === 0) {
      errors.push({
        code: 'BRIEF_TEXTBOX_PROJECT_REQUIRED',
        message: 'Project ID is required for editing the current game.'
      });
    }

    if ((draft.runId ?? '').length === 0) {
      errors.push({
        code: 'BRIEF_TEXTBOX_RUN_REQUIRED',
        message: 'Run ID is required for editing the current game.'
      });
    }

    if (stale) {
      errors.push({
        code: 'BRIEF_TEXTBOX_DRAFT_STALE',
        message: 'Draft belongs to a previous project or run. Edit the text again before previewing.'
      });
    }
  } else {
    warnings.push({
      code: 'BRIEF_TEXTBOX_NEW_GAME_MODE',
      message: 'New game mode is prompt-only; semantic patch preview requires edit current game mode.'
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    draftHash: hashBriefTextboxDraft(draft),
    ...(target === undefined ? {} : { target }),
    stale
  };
}

export function withBriefTextboxValidation(draft: BriefTextboxDraft, validation: BriefTextboxValidationResult): BriefTextboxDraft {
  return {
    ...draft,
    status: resolveBriefTextboxDraftStatus(draft, validation),
    validationErrors: validation.errors.map((issue) => issue.code),
    validationWarnings: validation.warnings.map((issue) => issue.code)
  };
}

export function resolveBriefTextboxDraftStatus(
  draft: Pick<BriefTextboxDraft, 'text' | 'dirty' | 'status'>,
  validation: Pick<BriefTextboxValidationResult, 'ok'>
): BriefTextboxDraftStatus {
  if (draft.status === 'preview_ready' || draft.status === 'preview_failed' || draft.status === 'validating') {
    return draft.status;
  }

  if (draft.text.trim().length === 0) {
    return 'empty';
  }

  if (!validation.ok) {
    return 'invalid';
  }

  return draft.dirty ? 'dirty' : 'valid';
}

export function hashBriefTextboxDraft(draft: Pick<BriefTextboxDraft, 'projectId' | 'runId' | 'text' | 'target' | 'mode'>): string {
  const value = JSON.stringify({
    projectId: draft.projectId,
    runId: draft.runId ?? '',
    text: draft.text,
    target: draft.target ?? '',
    mode: draft.mode
  });
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `brief_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
