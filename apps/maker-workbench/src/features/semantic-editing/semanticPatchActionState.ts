import type { SemanticEditIntent, SemanticPatch, SemanticPatchDiffViewModel } from '@ai-game-maker/game-dsl';

import type { PreviewRefreshRequest } from '../preview/index.js';

export type SemanticPatchActionStatus =
  | 'idle'
  | 'validated'
  | 'accepting'
  | 'accepted'
  | 'applied'
  | 'rejected'
  | 'rolling_back'
  | 'rolled_back'
  | 'failed'
  | 'stale_patch'
  | 'hash_conflict'
  | 'rollback_failed';

export type SemanticPatchActionResultStatus =
  | 'previewed'
  | 'accepted'
  | 'rejected'
  | 'applied'
  | 'rolled_back'
  | 'failed'
  | 'stale'
  | 'hash_conflict';

export type SemanticPatchReviewInput = {
  projectId: string;
  runId: string;
  draftHash: string;
  intentId: string;
  patchId: string;
  target: string;
  intent: SemanticEditIntent;
  patch: SemanticPatch;
  diff: SemanticPatchDiffViewModel;
};

export type SemanticPatchReviewModel = SemanticPatchReviewInput & {
  beforeHash: string;
  afterHash?: string;
  operationCount: number;
  validationOk: boolean;
};

export type SemanticPatchActionHistoryItem = {
  id: string;
  action: 'preview' | 'accept' | 'reject' | 'undo';
  status: SemanticPatchActionResultStatus;
  patchId: string;
  at: string;
  traceEventIds: string[];
  message: string;
};

export type SemanticPatchActionState = {
  status: SemanticPatchActionStatus;
  review?: SemanticPatchReviewModel;
  pendingAction?: 'accept' | 'undo';
  history: SemanticPatchActionHistoryItem[];
  errors: string[];
  warnings: string[];
  previewRefreshRequest?: PreviewRefreshRequest;
};

export type SemanticPatchActionResult = {
  ok: boolean;
  status: SemanticPatchActionResultStatus;
  patchId?: string;
  beforeHash?: string;
  afterHash?: string;
  errors: string[];
  warnings: string[];
  traceEventIds: string[];
  previewRefreshRequest?: PreviewRefreshRequest;
};

export type SemanticPatchAcceptRequest = {
  projectId: string;
  runId: string;
  patchId: string;
  intentId: string;
  expectedBeforeHash: string;
  intent: SemanticEditIntent;
  patch: SemanticPatch;
};

export type SemanticPatchUndoRequest = {
  projectId: string;
  runId: string;
  patchId: string;
  intentId: string;
  expectedCurrentHash?: string;
};

export type SemanticPatchRejectRequest = {
  projectId: string;
  runId: string;
  patchId: string;
  intentId: string;
  reason?: string;
};

export type SemanticPatchBackendResult = {
  ok: boolean;
  status: SemanticPatchActionResultStatus;
  beforeHash?: string;
  afterHash?: string;
  errors?: string[];
  warnings?: string[];
  traceEventIds?: string[];
};

export type SemanticPatchAcceptBackendResult = SemanticPatchBackendResult & {
  status: 'accepted' | 'applied' | 'failed' | 'stale' | 'hash_conflict';
};

export type SemanticPatchUndoBackendResult = SemanticPatchBackendResult & {
  status: 'rolled_back' | 'failed' | 'stale' | 'hash_conflict';
};

export type SemanticPatchRejectBackendResult = SemanticPatchBackendResult & {
  status: 'rejected' | 'failed' | 'stale';
};

export type SemanticPatchActionBackend = {
  acceptPatch(request: SemanticPatchAcceptRequest): Promise<SemanticPatchAcceptBackendResult>;
  rejectPatch?: (request: SemanticPatchRejectRequest) => Promise<SemanticPatchRejectBackendResult>;
  undoPatch(request: SemanticPatchUndoRequest): Promise<SemanticPatchUndoBackendResult>;
};

export type SemanticPatchActionContext = {
  currentProjectId: string;
  currentRunId: string;
  currentSSOTHash?: string;
  now?: () => Date;
};

export function createEmptySemanticPatchActionState(): SemanticPatchActionState {
  return {
    status: 'idle',
    history: [],
    errors: [],
    warnings: []
  };
}

export function createSemanticPatchReviewState(input: SemanticPatchReviewInput, now: () => Date = () => new Date()): SemanticPatchActionState {
  const review = toReviewModel(input);
  const status: SemanticPatchActionStatus = review.validationOk ? 'validated' : 'failed';
  const message = review.validationOk ? 'Patch preview is validated.' : 'Patch preview is not valid.';
  return {
    status,
    review,
    history: [historyItem({ action: 'preview', status: 'previewed', patchId: review.patchId, message, traceEventIds: [], now })],
    errors: review.validationOk ? [] : ['SEMANTIC_PATCH_NOT_VALIDATED'],
    warnings: []
  };
}

export function canAcceptSemanticPatch(state: SemanticPatchActionState): boolean {
  return state.status === 'validated' && state.review !== undefined;
}

export function canRejectSemanticPatch(state: SemanticPatchActionState): boolean {
  return state.review !== undefined && ['validated', 'failed', 'hash_conflict', 'stale_patch'].includes(state.status);
}

export function canUndoSemanticPatch(state: SemanticPatchActionState): boolean {
  return state.status === 'applied' && state.review !== undefined;
}

export function beginAcceptSemanticPatch(state: SemanticPatchActionState): SemanticPatchActionState {
  if (!canAcceptSemanticPatch(state)) {
    return state;
  }

  return {
    ...state,
    status: 'accepting',
    pendingAction: 'accept',
    errors: [],
    warnings: []
  };
}

export async function acceptSemanticPatchAction(input: {
  state: SemanticPatchActionState;
  context: SemanticPatchActionContext;
  backend?: SemanticPatchActionBackend;
}): Promise<SemanticPatchActionState> {
  const now = input.context.now ?? (() => new Date());
  const review = input.state.review;
  const preflight = preflightAccept(input.state, input.context);
  if (review === undefined) {
    return actionFailure({ state: input.state, status: 'failed', code: 'SEMANTIC_PATCH_REVIEW_MISSING', message: 'No patch review is selected.', now });
  }
  if (preflight.ok === false) {
    return actionFailure({ state: input.state, status: preflight.status, action: 'accept', patchId: review.patchId, code: preflight.code, message: preflight.message, now });
  }
  if (input.backend === undefined) {
    return actionFailure({
      state: input.state,
      status: 'failed',
      action: 'accept',
      patchId: review.patchId,
      code: 'SEMANTIC_PATCH_BACKEND_UNAVAILABLE',
      message: 'Semantic patch accept requires a backend adapter; Workbench did not write SSOT directly.',
      now
    });
  }

  let backendResult: SemanticPatchAcceptBackendResult;
  try {
    backendResult = await input.backend.acceptPatch({
      projectId: review.projectId,
      runId: review.runId,
      patchId: review.patchId,
      intentId: review.intentId,
      expectedBeforeHash: review.beforeHash,
      intent: review.intent,
      patch: review.patch
    });
  } catch (error) {
    return actionFailure({
      state: input.state,
      status: 'failed',
      action: 'accept',
      patchId: review.patchId,
      code: 'SEMANTIC_PATCH_BACKEND_FAILED',
      message: `Semantic patch accept backend failed: ${describeUnknownError(error)}`,
      now
    });
  }
  return applyBackendResult({ state: input.state, action: 'accept', backendResult, review, now });
}

export function rejectSemanticPatchAction(input: {
  state: SemanticPatchActionState;
  reason?: string;
  now?: () => Date;
}): SemanticPatchActionState {
  const now = input.now ?? (() => new Date());
  const review = input.state.review;
  if (review === undefined) {
    return actionFailure({ state: input.state, status: 'failed', code: 'SEMANTIC_PATCH_REVIEW_MISSING', message: 'No patch review is selected.', now });
  }
  if (!canRejectSemanticPatch(input.state)) {
    return input.state;
  }

  const traceEventIds = [`${review.patchId}:semantic_edit.patch.rejected`];
  return {
    ...input.state,
    status: 'rejected',
    errors: [],
    warnings: input.reason === undefined ? [] : [`reject_reason:${input.reason}`],
    previewRefreshRequest: undefined,
    history: [
      ...input.state.history,
      historyItem({
        action: 'reject',
        status: 'rejected',
        patchId: review.patchId,
        message: 'Patch rejected without modifying SSOT.',
        traceEventIds,
        now
      })
    ]
  };
}

export function beginUndoSemanticPatch(state: SemanticPatchActionState): SemanticPatchActionState {
  if (!canUndoSemanticPatch(state)) {
    return state;
  }

  return {
    ...state,
    status: 'rolling_back',
    pendingAction: 'undo',
    errors: [],
    warnings: []
  };
}

export async function undoSemanticPatchAction(input: {
  state: SemanticPatchActionState;
  context: SemanticPatchActionContext;
  backend?: SemanticPatchActionBackend;
}): Promise<SemanticPatchActionState> {
  const now = input.context.now ?? (() => new Date());
  const review = input.state.review;
  const preflight = preflightUndo(input.state, input.context);
  if (review === undefined) {
    return actionFailure({ state: input.state, status: 'rollback_failed', code: 'SEMANTIC_PATCH_REVIEW_MISSING', message: 'No patch review is selected.', now });
  }
  if (preflight.ok === false) {
    return actionFailure({ state: input.state, status: preflight.status, action: 'undo', patchId: review.patchId, code: preflight.code, message: preflight.message, now });
  }
  if (input.backend === undefined) {
    return actionFailure({
      state: input.state,
      status: 'rollback_failed',
      action: 'undo',
      patchId: review.patchId,
      code: 'SEMANTIC_ROLLBACK_BACKEND_UNAVAILABLE',
      message: 'Semantic rollback requires a backend adapter; Workbench did not perform a UI-only rollback.',
      now
    });
  }

  let backendResult: SemanticPatchUndoBackendResult;
  try {
    backendResult = await input.backend.undoPatch({
      projectId: review.projectId,
      runId: review.runId,
      patchId: review.patchId,
      intentId: review.intentId,
      expectedCurrentHash: input.context.currentSSOTHash
    });
  } catch (error) {
    return actionFailure({
      state: input.state,
      status: 'rollback_failed',
      action: 'undo',
      patchId: review.patchId,
      code: 'SEMANTIC_ROLLBACK_BACKEND_FAILED',
      message: `Semantic rollback backend failed: ${describeUnknownError(error)}`,
      now
    });
  }
  return applyBackendResult({ state: input.state, action: 'undo', backendResult, review, now });
}

function preflightAccept(
  state: SemanticPatchActionState,
  context: SemanticPatchActionContext
): { ok: true } | { ok: false; status: SemanticPatchActionStatus; code: string; message: string } {
  const review = state.review;
  if (review === undefined) {
    return { ok: false, status: 'failed', code: 'SEMANTIC_PATCH_REVIEW_MISSING', message: 'No patch review is selected.' };
  }
  if (state.status !== 'validated' && state.status !== 'accepting') {
    return { ok: false, status: 'failed', code: 'SEMANTIC_PATCH_NOT_VALIDATED', message: 'Patch must be validated before accept.' };
  }
  if (review.projectId !== context.currentProjectId || review.runId !== context.currentRunId) {
    return { ok: false, status: 'stale_patch', code: 'SEMANTIC_PATCH_STALE_PROJECT_RUN', message: 'Patch project or run no longer matches the current Workbench session.' };
  }
  if (context.currentSSOTHash !== undefined && context.currentSSOTHash !== review.beforeHash) {
    return { ok: false, status: 'hash_conflict', code: 'SEMANTIC_PATCH_HASH_CONFLICT', message: 'Current SSOT hash does not match patch beforeHash.' };
  }
  return { ok: true };
}

function preflightUndo(
  state: SemanticPatchActionState,
  context: SemanticPatchActionContext
): { ok: true } | { ok: false; status: SemanticPatchActionStatus; code: string; message: string } {
  const review = state.review;
  if (review === undefined) {
    return { ok: false, status: 'rollback_failed', code: 'SEMANTIC_PATCH_REVIEW_MISSING', message: 'No patch review is selected.' };
  }
  if (state.status !== 'applied' && state.status !== 'rolling_back') {
    return { ok: false, status: 'rollback_failed', code: 'SEMANTIC_PATCH_NOT_APPLIED', message: 'Only applied patches can be undone.' };
  }
  if (review.projectId !== context.currentProjectId || review.runId !== context.currentRunId) {
    return { ok: false, status: 'stale_patch', code: 'SEMANTIC_PATCH_STALE_PROJECT_RUN', message: 'Patch project or run no longer matches the current Workbench session.' };
  }
  return { ok: true };
}

function applyBackendResult(input: {
  state: SemanticPatchActionState;
  action: 'accept' | 'undo';
  backendResult: SemanticPatchBackendResult;
  review: SemanticPatchReviewModel;
  now: () => Date;
}): SemanticPatchActionState {
  const errors = input.backendResult.errors ?? [];
  const warnings = input.backendResult.warnings ?? [];
  const traceEventIds = input.backendResult.traceEventIds ?? [];
  if (!isActionStatusAllowed(input.action, input.backendResult.status)) {
    return actionFailure({
      state: input.state,
      status: input.action === 'undo' ? 'rollback_failed' : 'failed',
      action: input.action,
      patchId: input.review.patchId,
      code: 'SEMANTIC_PATCH_BACKEND_STATUS_INVALID',
      message: `Backend returned ${input.backendResult.status} for ${input.action}.`,
      now: input.now
    });
  }

  const failed = !input.backendResult.ok || input.backendResult.status === 'failed' || input.backendResult.status === 'hash_conflict' || input.backendResult.status === 'stale';
  const status = toStateStatus(input.action, input.backendResult.status, failed);
  const previewRefreshRequest = shouldRequestPreviewRefresh(input.action, input.backendResult)
    ? toPreviewRefreshRequest(input.action, input.review, input.backendResult)
    : undefined;

  return {
    ...input.state,
    status,
    pendingAction: undefined,
    errors,
    warnings,
    previewRefreshRequest,
    history: [
      ...input.state.history,
      historyItem({
        action: input.action,
        status: input.backendResult.status,
        patchId: input.review.patchId,
        message: failed ? errors[0] ?? `${input.action} failed.` : `${input.action} completed through backend adapter.`,
        traceEventIds,
        now: input.now
      })
    ]
  };
}

function actionFailure(input: {
  state: SemanticPatchActionState;
  status: SemanticPatchActionStatus;
  action?: 'accept' | 'undo';
  patchId?: string;
  code: string;
  message: string;
  now: () => Date;
}): SemanticPatchActionState {
  const patchId = input.patchId ?? input.state.review?.patchId ?? 'none';
  return {
    ...input.state,
    status: input.status,
    pendingAction: undefined,
    errors: [input.code],
    warnings: [],
    previewRefreshRequest: undefined,
    history: [
      ...input.state.history,
      historyItem({
        action: input.action ?? (input.status === 'rollback_failed' ? 'undo' : 'accept'),
        status: input.status === 'hash_conflict' ? 'hash_conflict' : input.status === 'stale_patch' ? 'stale' : 'failed',
        patchId,
        message: input.message,
        traceEventIds: [],
        now: input.now
      })
    ]
  };
}

function toReviewModel(input: SemanticPatchReviewInput): SemanticPatchReviewModel {
  const validationOk = input.diff.patch.valid && input.diff.validation?.ok !== false && input.diff.validation?.errorCount !== undefined && input.diff.validation.errorCount === 0;
  return {
    ...input,
    beforeHash: input.patch.beforeHash,
    ...(input.patch.afterHash === undefined ? {} : { afterHash: input.patch.afterHash }),
    operationCount: input.diff.patch.operationCount,
    validationOk
  };
}

function toStateStatus(action: 'accept' | 'undo', resultStatus: SemanticPatchActionResultStatus, failed: boolean): SemanticPatchActionStatus {
  if (failed) {
    if (resultStatus === 'hash_conflict') {
      return 'hash_conflict';
    }
    if (resultStatus === 'stale') {
      return 'stale_patch';
    }
    return action === 'undo' ? 'rollback_failed' : 'failed';
  }
  if (action === 'undo') {
    return 'rolled_back';
  }
  return resultStatus === 'accepted' ? 'accepted' : 'applied';
}

function toPreviewRefreshRequest(
  action: 'accept' | 'undo',
  review: SemanticPatchReviewModel,
  result: SemanticPatchBackendResult
): PreviewRefreshRequest {
  return {
    projectId: review.projectId,
    runId: review.runId,
    patchId: review.patchId,
    intentId: review.intentId,
    reason: action === 'undo' ? 'semantic_patch_rolled_back' : 'semantic_patch_applied',
    expectedSSOTHash: result.afterHash,
    forceQa: true
  };
}

function shouldRequestPreviewRefresh(action: 'accept' | 'undo', result: SemanticPatchBackendResult): boolean {
  if (!result.ok) {
    return false;
  }
  return (action === 'accept' && result.status === 'applied') || (action === 'undo' && result.status === 'rolled_back');
}

function isActionStatusAllowed(action: 'accept' | 'undo', status: SemanticPatchActionResultStatus): boolean {
  if (action === 'accept') {
    return status === 'accepted' || status === 'applied' || status === 'failed' || status === 'stale' || status === 'hash_conflict';
  }
  return status === 'rolled_back' || status === 'failed' || status === 'stale' || status === 'hash_conflict';
}

function describeUnknownError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }
  return 'unknown error';
}

function historyItem(input: {
  action: SemanticPatchActionHistoryItem['action'];
  status: SemanticPatchActionResultStatus;
  patchId: string;
  message: string;
  traceEventIds: string[];
  now: () => Date;
}): SemanticPatchActionHistoryItem {
  const at = input.now().toISOString();
  return {
    id: `${input.patchId}:${input.action}:${input.status}:${at}`,
    action: input.action,
    status: input.status,
    patchId: input.patchId,
    at,
    traceEventIds: input.traceEventIds,
    message: input.message
  };
}
