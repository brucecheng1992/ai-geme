import { useEffect, useMemo, useState } from 'react';
import type { SemanticIndex } from '@ai-game-maker/game-dsl';

import {
  previewBriefTextboxSemanticPatch,
  type BriefTextboxPatchPreviewResult
} from './briefTextboxIntentBridge.js';
import {
  createBriefTextboxDraft,
  DEFAULT_BRIEF_TEXTBOX_TARGET,
  validateBriefTextboxDraft,
  withBriefTextboxValidation,
  type BriefTextboxContext,
  type BriefTextboxDraft,
  type BriefTextboxMode,
  type BriefTextboxValidationResult
} from './briefTextboxSchema.js';

export type UseBriefTextboxDraftOptions = {
  text: string;
  language: string;
  projectId: string;
  runId?: string;
  document?: unknown;
  semanticIndex?: SemanticIndex;
  initialMode?: BriefTextboxMode;
  initialTarget?: string;
};

export type UseBriefTextboxDraftResult = {
  draft: BriefTextboxDraft;
  validation: BriefTextboxValidationResult;
  previewResult: BriefTextboxPatchPreviewResult | null;
  canPreview: boolean;
  setText: (text: string) => void;
  setMode: (mode: BriefTextboxMode) => void;
  setTarget: (target: string) => void;
  clearPreview: () => void;
  previewPatch: () => BriefTextboxPatchPreviewResult;
};

export function useBriefTextboxDraft(options: UseBriefTextboxDraftOptions): UseBriefTextboxDraftResult {
  const [draft, setDraft] = useState<BriefTextboxDraft>(() =>
    createBriefTextboxDraft({
      projectId: options.projectId,
      runId: options.runId,
      text: options.text,
      language: options.language,
      target: options.initialTarget ?? DEFAULT_BRIEF_TEXTBOX_TARGET,
      mode: options.initialMode ?? 'new_game'
    })
  );
  const [previewResult, setPreviewResult] = useState<BriefTextboxPatchPreviewResult | null>(null);

  const context = useMemo<BriefTextboxContext>(
    () => ({ projectId: options.projectId.trim(), ...(options.runId?.trim() ? { runId: options.runId.trim() } : {}) }),
    [options.projectId, options.runId]
  );
  const validation = useMemo(() => validateBriefTextboxDraft(draft, context), [context, draft]);
  const canPreview =
    validation.ok &&
    draft.mode === 'edit_current_game' &&
    options.document !== undefined &&
    options.semanticIndex !== undefined;

  useEffect(() => {
    setDraft((previous) => {
      if (previous.text === options.text && previous.language === options.language) {
        return previous;
      }

      return createBriefTextboxDraft({
        projectId: options.projectId,
        runId: options.runId,
        text: options.text,
        language: options.language,
        target: previous.target,
        mode: previous.mode,
        dirty: false
      });
    });
    setPreviewResult(null);
  }, [options.language, options.projectId, options.runId, options.text]);

  function setText(text: string): void {
    setDraft((previous) =>
      createBriefTextboxDraft({
        projectId: options.projectId,
        runId: options.runId,
        text,
        language: options.language,
        target: previous.target,
        mode: previous.mode,
        dirty: true
      })
    );
    setPreviewResult(null);
  }

  function setMode(mode: BriefTextboxMode): void {
    setDraft((previous) =>
      createBriefTextboxDraft({
        projectId: options.projectId,
        runId: options.runId,
        text: previous.text,
        language: previous.language,
        target: previous.target,
        mode,
        dirty: true
      })
    );
    setPreviewResult(null);
  }

  function setTarget(target: string): void {
    setDraft((previous) =>
      createBriefTextboxDraft({
        projectId: options.projectId,
        runId: options.runId,
        text: previous.text,
        language: previous.language,
        target,
        mode: previous.mode,
        dirty: true
      })
    );
    setPreviewResult(null);
  }

  function clearPreview(): void {
    setPreviewResult(null);
    setDraft((previous) => withBriefTextboxValidation({ ...previous, status: previous.text.trim().length === 0 ? 'empty' : 'dirty' }, validation));
  }

  function previewPatch(): BriefTextboxPatchPreviewResult {
    const validatingDraft = withBriefTextboxValidation({ ...draft, status: 'validating' }, validation);
    setDraft(validatingDraft);
    const result = previewBriefTextboxSemanticPatch({
      draft: validatingDraft,
      context,
      document: options.document,
      semanticIndex: options.semanticIndex
    });
    setPreviewResult(result);
    setDraft(result.draft);
    return result;
  }

  return {
    draft,
    validation,
    previewResult,
    canPreview,
    setText,
    setMode,
    setTarget,
    clearPreview,
    previewPatch
  };
}
