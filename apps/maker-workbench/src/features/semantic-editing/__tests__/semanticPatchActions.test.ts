import { readFile } from 'node:fs/promises';

import { describe, expect, it, vi } from 'vitest';

import type { SemanticEditIntent, SemanticPatch, SemanticPatchDiffViewModel } from '@ai-game-maker/game-dsl';

import {
  acceptSemanticPatchAction,
  beginAcceptSemanticPatch,
  beginUndoSemanticPatch,
  canAcceptSemanticPatch,
  canRejectSemanticPatch,
  canUndoSemanticPatch,
  createSemanticPatchReviewState,
  rejectSemanticPatchAction,
  undoSemanticPatchAction,
  type SemanticPatchActionBackend
} from '../index.js';

describe('Semantic patch action lifecycle', () => {
  it('creates a validated review state without mutating the handoff payload', () => {
    const review = createReview();
    const before = structuredClone(review);

    const state = createSemanticPatchReviewState(review, fixedNow);

    expect(state.status).toBe('validated');
    expect(canAcceptSemanticPatch(state)).toBe(true);
    expect(canRejectSemanticPatch(state)).toBe(true);
    expect(canUndoSemanticPatch(state)).toBe(false);
    expect(state.history.map((item) => item.action)).toEqual(['preview']);
    expect(review).toEqual(before);
  });

  it('accepts a validated patch through the backend adapter and requests preview refresh', async () => {
    const backend = createBackend({ acceptStatus: 'applied' });
    const state = beginAcceptSemanticPatch(createSemanticPatchReviewState(createReview(), fixedNow));

    const nextState = await acceptSemanticPatchAction({
      state,
      context: { currentProjectId: 'proj_demo', currentRunId: 'run_demo', now: fixedNow },
      backend
    });

    expect(backend.acceptPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'proj_demo',
        runId: 'run_demo',
        patchId: 'semantic_patch:001',
        intentId: 'intent:001',
        expectedBeforeHash: 'hash_before'
      })
    );
    expect(nextState).toMatchObject({
      status: 'applied',
      errors: [],
      previewRefreshRequest: {
        projectId: 'proj_demo',
        runId: 'run_demo',
        patchId: 'semantic_patch:001',
        intentId: 'intent:001',
        reason: 'semantic_patch_applied',
        expectedSSOTHash: 'hash_after',
        forceQa: true
      }
    });
  });

  it('does not request preview refresh when backend only accepts but does not apply', async () => {
    const backend = createBackend({ acceptStatus: 'accepted' });

    const nextState = await acceptSemanticPatchAction({
      state: createSemanticPatchReviewState(createReview(), fixedNow),
      context: { currentProjectId: 'proj_demo', currentRunId: 'run_demo', now: fixedNow },
      backend
    });

    expect(nextState).toMatchObject({
      status: 'accepted',
      errors: [],
      previewRefreshRequest: undefined
    });
  });

  it('blocks pending accept re-entry at the capability gate', () => {
    const pending = beginAcceptSemanticPatch(createSemanticPatchReviewState(createReview(), fixedNow));

    expect(pending.status).toBe('accepting');
    expect(canAcceptSemanticPatch(pending)).toBe(false);
    expect(canRejectSemanticPatch(pending)).toBe(false);
    expect(canUndoSemanticPatch(pending)).toBe(false);
  });

  it('does not reject a pending accept through the direct transition', () => {
    const pending = beginAcceptSemanticPatch(createSemanticPatchReviewState(createReview(), fixedNow));

    const nextState = rejectSemanticPatchAction({ state: pending, reason: 'clicked reject while accepting', now: fixedNow });

    expect(nextState).toBe(pending);
    expect(nextState.status).toBe('accepting');
    expect(nextState.history.map((item) => item.action)).toEqual(['preview']);
  });

  it('rejects invalid backend status combinations without preview refresh', async () => {
    const backend = {
      acceptPatch: vi.fn(async () => ({
        ok: true,
        status: 'rolled_back' as const,
        afterHash: 'hash_wrong'
      })),
      undoPatch: vi.fn()
    } as unknown as SemanticPatchActionBackend;

    const nextState = await acceptSemanticPatchAction({
      state: createSemanticPatchReviewState(createReview(), fixedNow),
      context: { currentProjectId: 'proj_demo', currentRunId: 'run_demo', now: fixedNow },
      backend
    });

    expect(nextState).toMatchObject({
      status: 'failed',
      errors: ['SEMANTIC_PATCH_BACKEND_STATUS_INVALID'],
      previewRefreshRequest: undefined
    });
  });

  it('rejects stale project or run before calling the backend', async () => {
    const backend = createBackend();

    const nextState = await acceptSemanticPatchAction({
      state: createSemanticPatchReviewState(createReview(), fixedNow),
      context: { currentProjectId: 'proj_other', currentRunId: 'run_demo', now: fixedNow },
      backend
    });

    expect(backend.acceptPatch).not.toHaveBeenCalled();
    expect(nextState).toMatchObject({
      status: 'stale_patch',
      errors: ['SEMANTIC_PATCH_STALE_PROJECT_RUN']
    });
  });

  it('rejects hash conflicts before calling the backend', async () => {
    const backend = createBackend();

    const nextState = await acceptSemanticPatchAction({
      state: createSemanticPatchReviewState(createReview(), fixedNow),
      context: { currentProjectId: 'proj_demo', currentRunId: 'run_demo', currentSSOTHash: 'hash_other', now: fixedNow },
      backend
    });

    expect(backend.acceptPatch).not.toHaveBeenCalled();
    expect(nextState).toMatchObject({
      status: 'hash_conflict',
      errors: ['SEMANTIC_PATCH_HASH_CONFLICT']
    });
  });

  it('does not let Workbench accept without a backend adapter', async () => {
    const nextState = await acceptSemanticPatchAction({
      state: createSemanticPatchReviewState(createReview(), fixedNow),
      context: { currentProjectId: 'proj_demo', currentRunId: 'run_demo', now: fixedNow }
    });

    expect(nextState).toMatchObject({
      status: 'failed',
      errors: ['SEMANTIC_PATCH_BACKEND_UNAVAILABLE'],
      previewRefreshRequest: undefined
    });
  });

  it('converts accept backend exceptions into failed action state', async () => {
    const backend = {
      acceptPatch: vi.fn(async () => {
        throw new Error('network down');
      }),
      undoPatch: vi.fn()
    } as unknown as SemanticPatchActionBackend;

    const nextState = await acceptSemanticPatchAction({
      state: beginAcceptSemanticPatch(createSemanticPatchReviewState(createReview(), fixedNow)),
      context: { currentProjectId: 'proj_demo', currentRunId: 'run_demo', now: fixedNow },
      backend
    });

    expect(nextState).toMatchObject({
      status: 'failed',
      pendingAction: undefined,
      errors: ['SEMANTIC_PATCH_BACKEND_FAILED'],
      previewRefreshRequest: undefined
    });
    expect(nextState.history.at(-1)).toMatchObject({
      action: 'accept',
      status: 'failed',
      message: 'Semantic patch accept backend failed: network down'
    });
  });

  it('rejects a patch without modifying SSOT or requesting preview refresh', () => {
    const state = createSemanticPatchReviewState(createReview(), fixedNow);
    const nextState = rejectSemanticPatchAction({ state, reason: 'user changed draft', now: fixedNow });

    expect(nextState).toMatchObject({
      status: 'rejected',
      errors: [],
      previewRefreshRequest: undefined
    });
    expect(nextState.history.at(-1)).toMatchObject({
      action: 'reject',
      status: 'rejected',
      message: 'Patch rejected without modifying SSOT.'
    });
  });

  it('does not allow undo before a patch is applied', async () => {
    const state = createSemanticPatchReviewState(createReview(), fixedNow);
    const nextState = await undoSemanticPatchAction({
      state,
      context: { currentProjectId: 'proj_demo', currentRunId: 'run_demo', now: fixedNow },
      backend: createBackend()
    });

    expect(nextState).toMatchObject({
      status: 'rollback_failed',
      errors: ['SEMANTIC_PATCH_NOT_APPLIED']
    });
  });

  it('undoes an applied patch through the backend adapter and requests preview refresh', async () => {
    const backend = createBackend({ undoStatus: 'rolled_back' });
    const applied = await acceptSemanticPatchAction({
      state: createSemanticPatchReviewState(createReview(), fixedNow),
      context: { currentProjectId: 'proj_demo', currentRunId: 'run_demo', now: fixedNow },
      backend
    });

    const nextState = await undoSemanticPatchAction({
      state: beginUndoSemanticPatch(applied),
      context: { currentProjectId: 'proj_demo', currentRunId: 'run_demo', currentSSOTHash: 'hash_after', now: fixedNow },
      backend
    });

    expect(backend.undoPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'proj_demo',
        runId: 'run_demo',
        patchId: 'semantic_patch:001',
        intentId: 'intent:001',
        expectedCurrentHash: 'hash_after'
      })
    );
    expect(nextState).toMatchObject({
      status: 'rolled_back',
      previewRefreshRequest: {
        reason: 'semantic_patch_rolled_back',
        expectedSSOTHash: 'hash_rolled_back',
        forceQa: true
      }
    });
  });

  it('blocks pending undo re-entry at the capability gate', () => {
    const applied = {
      ...createSemanticPatchReviewState(createReview(), fixedNow),
      status: 'applied' as const
    };
    const pending = beginUndoSemanticPatch(applied);

    expect(pending.status).toBe('rolling_back');
    expect(canAcceptSemanticPatch(pending)).toBe(false);
    expect(canRejectSemanticPatch(pending)).toBe(false);
    expect(canUndoSemanticPatch(pending)).toBe(false);
  });

  it('rejects stale undo before calling the backend', async () => {
    const backend = createBackend({ undoStatus: 'rolled_back' });
    const applied = {
      ...createSemanticPatchReviewState(createReview(), fixedNow),
      status: 'applied' as const
    };

    const nextState = await undoSemanticPatchAction({
      state: applied,
      context: { currentProjectId: 'proj_other', currentRunId: 'run_demo', now: fixedNow },
      backend
    });

    expect(backend.undoPatch).not.toHaveBeenCalled();
    expect(nextState).toMatchObject({
      status: 'stale_patch',
      errors: ['SEMANTIC_PATCH_STALE_PROJECT_RUN'],
      previewRefreshRequest: undefined
    });
    expect(nextState.history.at(-1)).toMatchObject({
      action: 'undo',
      status: 'stale'
    });
  });

  it('does not perform UI-only rollback when backend adapter is unavailable', async () => {
    const applied = {
      ...createSemanticPatchReviewState(createReview(), fixedNow),
      status: 'applied' as const
    };

    const nextState = await undoSemanticPatchAction({
      state: applied,
      context: { currentProjectId: 'proj_demo', currentRunId: 'run_demo', now: fixedNow }
    });

    expect(nextState).toMatchObject({
      status: 'rollback_failed',
      errors: ['SEMANTIC_ROLLBACK_BACKEND_UNAVAILABLE'],
      previewRefreshRequest: undefined
    });
  });

  it('converts undo backend exceptions into rollback failure state', async () => {
    const backend = {
      acceptPatch: vi.fn(),
      undoPatch: vi.fn(async () => {
        throw new Error('rollback timeout');
      })
    } as unknown as SemanticPatchActionBackend;
    const applied = {
      ...createSemanticPatchReviewState(createReview(), fixedNow),
      status: 'applied' as const
    };

    const nextState = await undoSemanticPatchAction({
      state: beginUndoSemanticPatch(applied),
      context: { currentProjectId: 'proj_demo', currentRunId: 'run_demo', now: fixedNow },
      backend
    });

    expect(nextState).toMatchObject({
      status: 'rollback_failed',
      pendingAction: undefined,
      errors: ['SEMANTIC_ROLLBACK_BACKEND_FAILED'],
      previewRefreshRequest: undefined
    });
    expect(nextState.history.at(-1)).toMatchObject({
      action: 'undo',
      status: 'failed',
      message: 'Semantic rollback backend failed: rollback timeout'
    });
  });

  it('keeps App integration on preview handoff and preview refresh instead of direct SSOT writes', async () => {
    const appSource = await readFile(new URL('../../../App.tsx', import.meta.url), 'utf8');

    expect(appSource).toContain('onPreviewHandoff={openSemanticPatchReview}');
    expect(appSource).toContain('semanticPatchActions.openReview(handoff)');
    expect(appSource).toContain('previewRefresh.requestRefresh(request');
    expect(appSource).not.toContain('createSemanticPatchApplier(');
    expect(appSource).not.toContain('hashSemanticPatchDocument(');
  });

  it('guards async hook action completion against newer reviews', async () => {
    const hookSource = await readFile(new URL('../useSemanticPatchActions.ts', import.meta.url), 'utf8');

    expect(hookSource).toContain('actionTokenRef');
    expect(hookSource).toContain('stateRef');
    expect(hookSource).toContain('if (!canAcceptSemanticPatch(stateRef.current))');
    expect(hookSource).toContain('if (!canRejectSemanticPatch(stateRef.current))');
    expect(hookSource).toContain('if (!canUndoSemanticPatch(stateRef.current))');
    expect(hookSource).toContain('isCurrentAction');
    expect(hookSource).toContain('sameReviewIdentity');
  });
});

function fixedNow() {
  return new Date('2026-01-01T00:00:00.000Z');
}

function createBackend(input: { acceptStatus?: 'accepted' | 'applied'; undoStatus?: 'rolled_back' } = {}): SemanticPatchActionBackend {
  return {
    acceptPatch: vi.fn(async () => ({
      ok: true,
      status: input.acceptStatus ?? 'applied',
      beforeHash: 'hash_before',
      afterHash: 'hash_after',
      traceEventIds: ['trace:accept']
    })),
    undoPatch: vi.fn(async () => ({
      ok: true,
      status: input.undoStatus ?? 'rolled_back',
      beforeHash: 'hash_after',
      afterHash: 'hash_rolled_back',
      traceEventIds: ['trace:undo']
    }))
  };
}

function createReview() {
  const intent: SemanticEditIntent = {
    id: 'intent:001',
    kind: 'move_entity',
    target: 'entity:player',
    reason: { source: 'workbench', message: 'move player' },
    payload: { x: 160, y: 320 },
    constraints: { noGeneratedCodeEdit: true }
  };
  const patch: SemanticPatch = {
    id: 'semantic_patch:001',
    intentId: intent.id,
    target: intent.target,
    operations: [{ op: 'set', path: '/scenes/main/entities/player/components/transform', value: { x: 160, y: 320 } }],
    beforeHash: 'hash_before',
    status: 'proposed',
    createdAt: '2026-01-01T00:00:00.000Z',
    validation: { ok: true, errors: [], warnings: [] }
  };
  const diff: SemanticPatchDiffViewModel = {
    patch: {
      id: patch.id,
      intentId: intent.id,
      target: patch.target,
      status: patch.status,
      beforeHash: patch.beforeHash,
      operationCount: 1,
      valid: true
    },
    validation: {
      ok: true,
      errorCount: 0,
      warningCount: 0,
      errors: [],
      warnings: []
    },
    operations: [
      {
        index: 0,
        op: 'set',
        path: '/scenes/main/entities/player/components/transform',
        effect: 'update',
        before: { kind: 'object', preview: '{"x":120,"y":300}', truncated: false, redacted: false },
        after: { kind: 'object', preview: '{"x":160,"y":320}', truncated: false, redacted: false },
        validationCodes: [],
        validationIssues: [],
        safePath: true
      }
    ],
    warnings: []
  };

  return {
    projectId: 'proj_demo',
    runId: 'run_demo',
    draftHash: 'draft_hash',
    intentId: intent.id,
    patchId: patch.id,
    target: patch.target,
    intent,
    patch,
    diff
  };
}
