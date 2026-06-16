import { useCallback, useEffect, useRef, useState } from 'react';

import type { PreviewRefreshRequest } from '../preview/index.js';
import {
  acceptSemanticPatchAction,
  beginAcceptSemanticPatch,
  beginUndoSemanticPatch,
  canAcceptSemanticPatch,
  canRejectSemanticPatch,
  canUndoSemanticPatch,
  createEmptySemanticPatchActionState,
  createSemanticPatchReviewState,
  rejectSemanticPatchAction,
  undoSemanticPatchAction,
  type SemanticPatchActionBackend,
  type SemanticPatchActionContext,
  type SemanticPatchActionState,
  type SemanticPatchReviewInput
} from './semanticPatchActionState.js';

export type UseSemanticPatchActionsOptions = {
  backend?: SemanticPatchActionBackend;
  onPreviewRefreshRequest?: (request: PreviewRefreshRequest) => void;
  now?: () => Date;
};

export type UseSemanticPatchActionsResult = {
  state: SemanticPatchActionState;
  canAccept: boolean;
  canReject: boolean;
  canUndo: boolean;
  openReview: (review: SemanticPatchReviewInput) => void;
  clearReview: () => void;
  acceptCurrent: (context: Omit<SemanticPatchActionContext, 'now'>) => Promise<SemanticPatchActionState>;
  rejectCurrent: (reason?: string) => SemanticPatchActionState;
  undoCurrent: (context: Omit<SemanticPatchActionContext, 'now'>) => Promise<SemanticPatchActionState>;
};

export function useSemanticPatchActions(options: UseSemanticPatchActionsOptions = {}): UseSemanticPatchActionsResult {
  const { backend, now, onPreviewRefreshRequest } = options;
  const [state, setState] = useState<SemanticPatchActionState>(() => createEmptySemanticPatchActionState());
  const stateRef = useRef(state);
  const actionTokenRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const publish = useCallback(
    (nextState: SemanticPatchActionState) => {
      stateRef.current = nextState;
      setState(nextState);
      if (nextState.previewRefreshRequest !== undefined) {
        onPreviewRefreshRequest?.(nextState.previewRefreshRequest);
      }
      return nextState;
    },
    [onPreviewRefreshRequest]
  );

  const openReview = useCallback(
    (review: SemanticPatchReviewInput) => {
      actionTokenRef.current += 1;
      publish(createSemanticPatchReviewState(review, now));
    },
    [now, publish]
  );

  const clearReview = useCallback(() => {
    actionTokenRef.current += 1;
    publish(createEmptySemanticPatchActionState());
  }, [publish]);

  const acceptCurrent = useCallback(
    async (context: Omit<SemanticPatchActionContext, 'now'>) => {
      if (!canAcceptSemanticPatch(stateRef.current)) {
        return stateRef.current;
      }
      const token = actionTokenRef.current + 1;
      actionTokenRef.current = token;
      const started = beginAcceptSemanticPatch(stateRef.current);
      publish(started);
      const result = await acceptSemanticPatchAction({
        state: started,
        context: { ...context, now },
        backend
      });
      if (started.pendingAction === 'accept' && !isCurrentAction(stateRef.current, started, token, actionTokenRef.current, 'accept')) {
        return stateRef.current;
      }
      return publish(result);
    },
    [backend, now, publish]
  );

  const rejectCurrent = useCallback(
    (reason?: string) => {
      if (!canRejectSemanticPatch(stateRef.current)) {
        return stateRef.current;
      }
      actionTokenRef.current += 1;
      const nextState = rejectSemanticPatchAction({ state: stateRef.current, reason, now });
      return publish(nextState);
    },
    [now, publish]
  );

  const undoCurrent = useCallback(
    async (context: Omit<SemanticPatchActionContext, 'now'>) => {
      if (!canUndoSemanticPatch(stateRef.current)) {
        return stateRef.current;
      }
      const token = actionTokenRef.current + 1;
      actionTokenRef.current = token;
      const started = beginUndoSemanticPatch(stateRef.current);
      publish(started);
      const result = await undoSemanticPatchAction({
        state: started,
        context: { ...context, now },
        backend
      });
      if (started.pendingAction === 'undo' && !isCurrentAction(stateRef.current, started, token, actionTokenRef.current, 'undo')) {
        return stateRef.current;
      }
      return publish(result);
    },
    [backend, now, publish]
  );

  return {
    state,
    canAccept: canAcceptSemanticPatch(state),
    canReject: canRejectSemanticPatch(state),
    canUndo: canUndoSemanticPatch(state),
    openReview,
    clearReview,
    acceptCurrent,
    rejectCurrent,
    undoCurrent
  };
}

function isCurrentAction(
  current: SemanticPatchActionState,
  started: SemanticPatchActionState,
  startedToken: number,
  currentToken: number,
  action: 'accept' | 'undo'
): boolean {
  return startedToken === currentToken && current.pendingAction === action && sameReviewIdentity(current, started);
}

function sameReviewIdentity(left: SemanticPatchActionState, right: SemanticPatchActionState): boolean {
  return (
    left.review !== undefined &&
    right.review !== undefined &&
    left.review.projectId === right.review.projectId &&
    left.review.runId === right.review.runId &&
    left.review.patchId === right.review.patchId &&
    left.review.intentId === right.review.intentId &&
    left.review.draftHash === right.review.draftHash
  );
}
