import type { PipelineArtifactIndex, QaReport } from '../../workbench-api.js';

export type PreviewRefreshReason =
  | 'semantic_patch_applied'
  | 'semantic_patch_rolled_back'
  | 'qa_repair_applied'
  | 'manual_refresh'
  | 'generation_completed';

export type PreviewRefreshStatus =
  | 'idle'
  | 'queued'
  | 'resolving_artifact'
  | 'waiting_for_build'
  | 'loading_iframe'
  | 'runtime_loaded'
  | 'qa_running'
  | 'ready'
  | 'failed'
  | 'stale';

export type PreviewRefreshRequest = {
  projectId: string;
  runId?: string;
  patchId?: string;
  intentId?: string;
  reason: PreviewRefreshReason;
  expectedSSOTHash?: string;
  forceQa?: boolean;
};

export type PreviewRefreshResult = {
  refreshId: string;
  status: PreviewRefreshStatus;
  projectId: string;
  runId?: string;
  patchId?: string;
  intentId?: string;
  reason: PreviewRefreshReason;
  artifactEntryUrl?: string;
  iframeUrl?: string;
  iframeLoaded?: boolean;
  runtimeLoaded?: boolean;
  qaStatus?: 'passed' | 'failed' | 'skipped';
  visuallyObservable?: boolean;
  falsePlayable?: boolean;
  errors: string[];
  warnings: string[];
  traceEventIds: string[];
};

export type PreviewRefreshArtifactContext = {
  apiBase: string;
  projectPreviewUrl?: string;
  artifactIndex?: PipelineArtifactIndex;
  projectStatus?: string;
  runStatus?: string;
  workbenchOrigin?: string;
};

export type PreviewRuntimeRefreshAdapter = {
  requestRefresh(request: PreviewRefreshRequest, context: PreviewRefreshArtifactContext): PreviewRefreshResult;
  markIframeLoaded(refreshId: string): PreviewRefreshResult;
  markRuntimeLoaded(refreshId: string): PreviewRefreshResult;
  markQaRunning(refreshId: string): PreviewRefreshResult;
  completeQa(refreshId: string, input: { qaReport?: QaReport }): PreviewRefreshResult;
  current(): PreviewRefreshResult | undefined;
};

export type CreatePreviewRuntimeRefreshAdapterOptions = {
  createRefreshId?: (request: PreviewRefreshRequest, sequence: number) => string;
};

const BUILD_WAITING_STATUSES = new Set([
  'DSL_GENERATING',
  'DSL_GENERATED',
  'DSL_VALIDATING',
  'IR_NORMALIZED',
  'RUNTIME_CHECKING',
  'COMPILING',
  'COMPILED',
  'BUILDING'
]);

const PLAYABLE_STATUSES = new Set(['PLAYABLE', 'PLAYABLE_WITH_FALLBACK_ASSETS', 'PLAYABLE_WITH_ART_WARNINGS']);

export function createPreviewRuntimeRefreshAdapter(options: CreatePreviewRuntimeRefreshAdapterOptions = {}): PreviewRuntimeRefreshAdapter {
  let sequence = 0;
  let latestRefreshId: string | undefined;
  let latestResult: PreviewRefreshResult | undefined;

  function requestRefresh(request: PreviewRefreshRequest, context: PreviewRefreshArtifactContext): PreviewRefreshResult {
    sequence += 1;
    const refreshId = options.createRefreshId?.(request, sequence) ?? `preview_refresh_${sequence}`;
    latestRefreshId = refreshId;

    const base = createBaseResult(refreshId, request, 'resolving_artifact');
    if (isWaitingForBuild(context)) {
      latestResult = {
        ...base,
        status: 'waiting_for_build',
        iframeLoaded: false,
        runtimeLoaded: false,
        qaStatus: 'skipped',
        visuallyObservable: false,
        traceEventIds: trace(refreshId, 'preview_refresh.requested', 'preview_refresh.waiting_for_build')
      };
      return latestResult;
    }

    const resolved = resolvePreviewArtifactEntryUrl(request, context);
    if (!resolved.ok) {
      latestResult = {
        ...base,
        status: 'failed',
        iframeLoaded: false,
        runtimeLoaded: false,
        qaStatus: 'failed',
        visuallyObservable: false,
        falsePlayable: false,
        errors: [resolved.error],
        traceEventIds: trace(refreshId, 'preview_refresh.requested', 'preview_refresh.artifact_missing', 'preview_refresh.failed')
      };
      return latestResult;
    }

    latestResult = {
      ...base,
      status: 'loading_iframe',
      artifactEntryUrl: resolved.artifactEntryUrl,
      iframeUrl: withCacheBusting(resolved.artifactEntryUrl, request.patchId ?? request.runId ?? refreshId),
      iframeLoaded: false,
      runtimeLoaded: false,
      qaStatus: 'skipped',
      visuallyObservable: false,
      falsePlayable: false,
      traceEventIds: trace(refreshId, 'preview_refresh.requested', 'preview_refresh.artifact_resolved', 'preview_refresh.iframe_loading')
    };
    return latestResult;
  }

  function markIframeLoaded(refreshId: string): PreviewRefreshResult {
    const current = getCurrentOrStale(refreshId);
    if (current.status === 'stale') {
      return current;
    }
    if (isTerminalRefreshStatus(current.status)) {
      return current;
    }

    latestResult = {
      ...current,
      status: current.status === 'runtime_loaded' || current.status === 'qa_running' ? current.status : 'loading_iframe',
      iframeLoaded: true,
      visuallyObservable: false,
      warnings: appendUnique(current.warnings, 'PREVIEW_IFRAME_LOADED_AWAITING_RUNTIME'),
      traceEventIds: appendUnique(current.traceEventIds, `${refreshId}:preview_refresh.iframe_loaded`)
    };
    return latestResult;
  }

  function markRuntimeLoaded(refreshId: string): PreviewRefreshResult {
    const current = getCurrentOrStale(refreshId);
    if (current.status === 'stale') {
      return current;
    }
    if (isTerminalRefreshStatus(current.status)) {
      return current;
    }

    const qaAlreadyPassed = current.qaStatus === 'passed' && current.falsePlayable !== true && current.errors.length === 0;

    latestResult = {
      ...current,
      status: qaAlreadyPassed ? 'ready' : 'runtime_loaded',
      runtimeLoaded: true,
      qaStatus: current.qaStatus ?? 'skipped',
      visuallyObservable: qaAlreadyPassed,
      traceEventIds: appendUnique(
        current.traceEventIds,
        `${refreshId}:preview_refresh.runtime_loaded`,
        ...(qaAlreadyPassed ? [`${refreshId}:preview_refresh.completed`] : [])
      )
    };
    return latestResult;
  }

  function markQaRunning(refreshId: string): PreviewRefreshResult {
    const current = getCurrentOrStale(refreshId);
    if (current.status === 'stale') {
      return current;
    }
    if (isTerminalRefreshStatus(current.status)) {
      return current;
    }

    latestResult = {
      ...current,
      status: 'qa_running',
      qaStatus: 'skipped',
      visuallyObservable: false,
      traceEventIds: appendUnique(current.traceEventIds, `${refreshId}:preview_refresh.qa_started`)
    };
    return latestResult;
  }

  function completeQa(refreshId: string, input: { qaReport?: QaReport }): PreviewRefreshResult {
    const current = getCurrentOrStale(refreshId);
    if (current.status === 'stale') {
      return current;
    }
    if (isTerminalRefreshStatus(current.status)) {
      return current;
    }

    const qa = evaluateQa(input.qaReport);
    const runtimeLoaded = current.runtimeLoaded === true || current.status === 'runtime_loaded' || current.status === 'ready';
    if (qa.ok && !runtimeLoaded) {
      latestResult = {
        ...current,
        status: 'qa_running',
        qaStatus: 'passed',
        visuallyObservable: false,
        falsePlayable: false,
        warnings: appendUnique(current.warnings, 'PREVIEW_QA_PASSED_AWAITING_RUNTIME'),
        traceEventIds: appendUnique(current.traceEventIds, `${refreshId}:preview_refresh.qa_completed`)
      };
      return latestResult;
    }

    latestResult = {
      ...current,
      status: qa.ok ? 'ready' : 'failed',
      qaStatus: qa.ok ? 'passed' : 'failed',
      visuallyObservable: qa.visuallyObservable,
      falsePlayable: qa.falsePlayable,
      errors: qa.ok ? current.errors : appendUnique(current.errors, qa.error),
      traceEventIds: appendUnique(
        current.traceEventIds,
        `${refreshId}:preview_refresh.qa_completed`,
        qa.ok ? `${refreshId}:preview_refresh.completed` : `${refreshId}:preview_refresh.failed`
      )
    };
    return latestResult;
  }

  function current(): PreviewRefreshResult | undefined {
    return latestResult;
  }

  function getCurrentOrStale(refreshId: string): PreviewRefreshResult {
    if (refreshId !== latestRefreshId || latestResult === undefined) {
      return createStaleResult(refreshId);
    }
    return latestResult;
  }

  return {
    requestRefresh,
    markIframeLoaded,
    markRuntimeLoaded,
    markQaRunning,
    completeQa,
    current
  };
}

export function resolvePreviewArtifactEntryUrl(
  request: Pick<PreviewRefreshRequest, 'projectId' | 'runId'>,
  context: PreviewRefreshArtifactContext
): { ok: true; artifactEntryUrl: string } | { ok: false; error: string } {
  const artifactIndex = context.artifactIndex;
  if (artifactIndex === undefined) {
    return { ok: false, error: 'PREVIEW_ARTIFACT_ENTRY_NOT_FOUND' };
  }

  if (artifactIndex.projectId !== request.projectId || (request.runId !== undefined && artifactIndex.runId !== request.runId)) {
    return { ok: false, error: 'PREVIEW_ARTIFACT_INDEX_MISMATCH' };
  }

  const previewManifest = artifactIndex.artifacts.find((artifact) => artifact.id === 'phaserPreviewManifest');
  if (previewManifest === undefined || previewManifest.status !== 'present' || previewManifest.artifactRoot !== 'generated-project') {
    return { ok: false, error: 'PREVIEW_ARTIFACT_ENTRY_NOT_FOUND' };
  }

  const candidate = context.projectPreviewUrl?.trim() || `${context.apiBase.replace(/\/$/, '')}/preview/${encodeURIComponent(request.projectId)}/index.html`;
  return validatePreviewArtifactUrl(candidate, request.projectId, context);
}

export function withCacheBusting(artifactEntryUrl: string, refreshKey: string): string {
  const url = new URL(artifactEntryUrl);
  url.searchParams.set('refresh', refreshKey);
  return url.toString();
}

function createBaseResult(refreshId: string, request: PreviewRefreshRequest, status: PreviewRefreshStatus): PreviewRefreshResult {
  return {
    refreshId,
    status,
    projectId: request.projectId,
    ...(request.runId === undefined ? {} : { runId: request.runId }),
    ...(request.patchId === undefined ? {} : { patchId: request.patchId }),
    ...(request.intentId === undefined ? {} : { intentId: request.intentId }),
    reason: request.reason,
    errors: [],
    warnings: [],
    traceEventIds: trace(refreshId, 'preview_refresh.requested')
  };
}

function createStaleResult(refreshId: string): PreviewRefreshResult {
  return {
    refreshId,
    status: 'stale',
    projectId: 'unknown',
    reason: 'manual_refresh',
    qaStatus: 'skipped',
    visuallyObservable: false,
    falsePlayable: false,
    errors: [],
    warnings: ['PREVIEW_REFRESH_SUPERSEDED'],
    traceEventIds: trace(refreshId, 'preview_refresh.stale')
  };
}

function validatePreviewArtifactUrl(
  candidate: string,
  projectId: string,
  context: PreviewRefreshArtifactContext
): { ok: true; artifactEntryUrl: string } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(candidate, context.apiBase);
  } catch {
    return { ok: false, error: 'PREVIEW_ARTIFACT_ENTRY_NOT_FOUND' };
  }

  if (context.workbenchOrigin !== undefined && url.origin === context.workbenchOrigin) {
    return { ok: false, error: 'PREVIEW_ARTIFACT_POINTS_TO_WORKBENCH_SHELL' };
  }

  const expectedPath = `/preview/${encodeURIComponent(projectId)}/index.html`;
  if (url.pathname !== expectedPath) {
    return { ok: false, error: 'PREVIEW_ARTIFACT_ENTRY_NOT_FOUND' };
  }

  return { ok: true, artifactEntryUrl: url.toString() };
}

function isWaitingForBuild(context: PreviewRefreshArtifactContext): boolean {
  const status = context.runStatus ?? context.projectStatus;
  return status !== undefined && BUILD_WAITING_STATUSES.has(status);
}

function isTerminalRefreshStatus(status: PreviewRefreshStatus): boolean {
  return status === 'ready' || status === 'failed';
}

function evaluateQa(qaReport: QaReport | undefined): {
  ok: boolean;
  visuallyObservable: boolean;
  falsePlayable: boolean;
  error: string;
} {
  if (qaReport === undefined) {
    return {
      ok: false,
      visuallyObservable: false,
      falsePlayable: false,
      error: 'QA_REPORT_NOT_AVAILABLE'
    };
  }

  if (qaReport.code === 'PREVIEW_BLANK_SCREEN') {
    return {
      ok: false,
      visuallyObservable: false,
      falsePlayable: true,
      error: 'FALSE_PLAYABLE'
    };
  }

  const playable = qaReport.overall_status !== undefined && PLAYABLE_STATUSES.has(qaReport.overall_status);
  const runtimePassed = qaReport.runtime_status === 'PASSED';
  const hasTelemetry = (qaReport.observed_events ?? []).length > 0;
  if (playable && runtimePassed && hasTelemetry) {
    return {
      ok: true,
      visuallyObservable: true,
      falsePlayable: false,
      error: ''
    };
  }

  return {
    ok: false,
    visuallyObservable: false,
    falsePlayable: qaReport.status === 'PLAYABLE' && !hasTelemetry,
    error: qaReport.code ?? qaReport.overall_status ?? 'QA_FAILED'
  };
}

function trace(refreshId: string, ...types: string[]): string[] {
  return types.map((type) => `${refreshId}:${type}`);
}

function appendUnique(values: string[], ...nextValues: string[]): string[] {
  const next = new Set(values);
  nextValues.forEach((value) => next.add(value));
  return [...next];
}
