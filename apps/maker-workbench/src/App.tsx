import { useEffect, useMemo, useRef, useState } from 'react';
import { buildSemanticIndex } from '@ai-game-maker/game-dsl';

import { AssetStatusPanel } from './AssetStatusPanel.js';
import { AssetBindingTraceSummaryPanel, fetchAssetBindingTrace, type AssetBindingTraceView } from './asset-binding-trace-client.js';
import { BriefTextboxPanel, type BriefTextboxMode, type GameConversationMessage } from './features/brief/index.js';
import { PreviewFrame, PreviewStatusBadge, usePreviewRuntimeRefresh } from './features/preview/index.js';
import {
  acceptSemanticAmendment,
  buildSemanticAmendmentRuntimeApplyReport,
  isPreviewableSemanticAmendment,
  planSemanticAmendment,
  previewSemanticAmendment,
  rejectSemanticAmendment,
  requiresRuntimeApplyReport,
  undoSemanticAmendment,
  type SemanticAmendmentDesignDelta,
  type SemanticAmendmentPreviewState,
  type SemanticAmendmentProposalCardAction,
  type SemanticAmendmentProposalCardView,
  type SemanticEditProposal
} from './features/semantic-amendments/index.js';
import {
  buildLiveEditCapabilityDiagnostics,
  SemanticPatchReviewPanel,
  useSemanticPatchActions,
  type LiveEditCapabilityDiagnosticItem,
  type SemanticPatchReviewInput
} from './features/semantic-editing/index.js';
import { PromptCoachPanel } from './PromptCoachPanel.js';
import { QaStatusPanel } from './QaStatusPanel.js';
import {
  buildEditableFields,
  buildLiveObjectTree,
  buildReplacePrepareBody,
  buildReplacePrepareBodyForEdits,
  buildRuntimeApplyReportFromPatchResult,
  type LiveEditableField
} from './live-edit-client.js';
import { PipelineAcceptanceSummary, fetchPipelineAcceptance, type PipelineAcceptanceView } from './pipeline-acceptance-client.js';
import { PipelineEvidencePanel, fetchPipelineEvidence, type PipelineEvidenceView } from './pipeline-evidence-client.js';
import { buildGenerateProjectRequest, type PromptCoachProvenanceSelection } from './prompt-coach-client.js';
import './styles.css';
import { sanitizeWorkbenchDisplayText, sanitizeWorkbenchErrorMessage } from './workbench-display-safety.js';
import {
  API_BASE,
  countEvents,
  fallbackSteps,
  getWorkbenchStatusTone,
  optionalJson,
  requestJson,
  resolveWorkbenchDisplayStatus,
  shouldLoadBuildLog,
  shouldLoadQaReport,
  shouldLoadRepairReport,
  type ArtAssetWorkbenchPreview,
  type DashboardData,
  type LiveCurrentResponse,
  type PipelineArtifactsResponse,
  type PreparedDeterministicPatch,
  type ProjectStatus,
  type QaReport,
  type RepairReport,
  type RuntimeApplyResponse,
  type RuntimePatch,
  type RuntimePatchResult,
  type RunEvents
} from './workbench-api.js';

const defaultIdea = '做一个小猫射击外星人的小游戏';

const panelClass = 'rounded-lg border border-[#d8c7a6] bg-[#fffef9] p-4 shadow-[0_1px_0_rgba(49,43,34,0.08)]';
const panelHeadingClass = 'mb-3 flex items-start justify-between gap-3';
const eyebrowClass = 'm-0 text-[11px] font-extrabold uppercase text-[#6f6558]';
const headingClass = 'm-0 text-[15px] font-extrabold leading-tight text-[#15130f]';
const fieldClass =
  'min-w-0 rounded-lg border border-[#bba98c] bg-[#fffefa] px-3 py-2.5 text-sm text-[#15130f] outline-none transition focus:border-[#f3763d] focus:shadow-[0_0_0_3px_rgba(255,177,59,0.28)]';
const primaryButtonClass =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-[#15130f] bg-[#15130f] px-4 text-sm font-extrabold text-[#fffaf0] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#2b261d] hover:shadow-[4px_4px_0_#ffb13b] disabled:translate-x-0 disabled:translate-y-0 disabled:border-[#978f82] disabled:bg-[#978f82] disabled:shadow-none';
const secondaryButtonClass =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-[#15130f] bg-[#fffef9] px-4 text-sm font-extrabold text-[#15130f] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#fff7e8] hover:shadow-[4px_4px_0_#ffb13b] disabled:translate-x-0 disabled:translate-y-0 disabled:border-[#978f82] disabled:text-[#978f82] disabled:shadow-none';
const previewViewportClass = 'h-[calc(100dvh-11rem)] min-h-[520px] max-lg:h-[clamp(360px,58vh,560px)] max-lg:min-h-0';

type ConversationAction = 'generating' | 'submitting_edit';
type ConversationInputRecord = {
  id: string;
  mode: BriefTextboxMode;
  body: string;
  meta: string;
};

type SemanticAmendmentCardStatus =
  | 'planned'
  | 'previewing'
  | 'ready'
  | 'unsupported'
  | 'needs_clarification'
  | 'accepting'
  | 'accepted'
  | 'rejecting'
  | 'rejected'
  | 'undoing'
  | 'undone'
  | 'failed';

type SemanticAmendmentConversationCard = {
  id: string;
  projectId: string;
  runId: string;
  proposal: SemanticEditProposal;
  status: SemanticAmendmentCardStatus;
  previewState?: SemanticAmendmentPreviewState;
  message?: string;
  failureReason?: string;
};

type PendingSemanticAmendmentRuntimeApply = {
  cardId: string;
  projectId: string;
  runId: string;
  proposalId: string;
  previewState: SemanticAmendmentPreviewState;
  previewInstanceId: string;
};

const CONVERSATION_INPUT_HISTORY_LIMIT = 24;

function statusToneClass(status: string) {
  const tone = getWorkbenchStatusTone(status);
  if (tone === 'good') {
    return 'bg-[#208a4d]';
  }

  if (tone === 'warn') {
    return 'bg-[#c58a1c]';
  }

  if (tone === 'bad') {
    return 'bg-[#c93d35]';
  }

  return 'bg-[#69645d]';
}

function stepStatusClass(status: string) {
  if (['DONE', 'PLAYABLE', 'PASSED'].includes(status)) {
    return 'border-[#91d49b] bg-[#dff3df] text-[#208a4d]';
  }

  if (['FAILED', 'QA_FAILED', 'REPAIR_FAILED'].includes(status)) {
    return 'border-[#f2a39b] bg-[#ffe2dc] text-[#c93d35]';
  }

  return 'border-[#d0b993] bg-[#ece1ce] text-[#69645d]';
}

export function App() {
  const [idea, setIdea] = useState(defaultIdea);
  const [semanticEditText, setSemanticEditText] = useState('');
  const [briefMode, setBriefMode] = useState<BriefTextboxMode>('new_game');
  const [language, setLanguage] = useState('zh');
  const [promptOptimizationSelection, setPromptOptimizationSelection] = useState<PromptCoachProvenanceSelection | null>(null);
  const [projectId, setProjectId] = useState('');
  const [runId, setRunId] = useState('');
  const [data, setData] = useState<DashboardData>({ events: [] });
  const [pipelineEvidence, setPipelineEvidence] = useState<PipelineEvidenceView>({
    status: 'idle',
    message: 'Select a project and run to view pipeline evidence.',
    groups: []
  });
  const [pipelineAcceptance, setPipelineAcceptance] = useState<PipelineAcceptanceView>({
    status: 'idle',
    message: 'Select a project and run to view pipeline acceptance.'
  });
  const [assetBindingTrace, setAssetBindingTrace] = useState<AssetBindingTraceView>({
    status: 'idle',
    message: 'Select a project and run to view asset binding trace.'
  });
  const [pipelineEvidenceLoading, setPipelineEvidenceLoading] = useState(false);
  const [pipelineAcceptanceLoading, setPipelineAcceptanceLoading] = useState(false);
  const [assetBindingTraceLoading, setAssetBindingTraceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveEditStatus, setLiveEditStatus] = useState('Runtime not connected');
  const [liveCurrent, setLiveCurrent] = useState<LiveCurrentResponse | undefined>(undefined);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [pendingPatchId, setPendingPatchId] = useState<string | null>(null);
  const [conversationAction, setConversationAction] = useState<ConversationAction | null>(null);
  const [conversationInputHistory, setConversationInputHistory] = useState<ConversationInputRecord[]>([]);
  const [semanticAmendmentCards, setSemanticAmendmentCards] = useState<SemanticAmendmentConversationCard[]>([]);
  const [pendingSemanticAmendmentId, setPendingSemanticAmendmentId] = useState<string | null>(null);
  const [selectedObjectPath, setSelectedObjectPath] = useState('/player');
  const [previewInstanceId, setPreviewInstanceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const previewHostRef = useRef<HTMLDivElement | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const runtimeReadyRef = useRef(false);
  const runtimeReadyRetryRef = useRef<{ url: string; attempted: boolean } | null>(null);
  const pendingPatchRef = useRef<PreparedDeterministicPatch | null>(null);
  const pendingSemanticAmendmentRef = useRef<PendingSemanticAmendmentRuntimeApply | null>(null);
  const conversationInputSequenceRef = useRef(0);
  const previewRefresh = usePreviewRuntimeRefresh();
  const previewRefreshResult = previewRefresh.current;
  const previewRefreshId = previewRefreshResult?.refreshId;

  const previewUrl = useMemo(() => {
    if (data.project?.project.preview_url) {
      return data.project.project.preview_url;
    }
    return projectId ? `${API_BASE}/preview/${projectId}/index.html` : '';
  }, [data.project?.project.preview_url, projectId]);
  const observedCounts = useMemo(() => countEvents(data.qaReport?.observed_events ?? []), [data.qaReport?.observed_events]);
  const previewBlankScreen = data.qaReport?.code === 'PREVIEW_BLANK_SCREEN';
  const activePreviewUrl = previewRefreshResult === undefined ? previewUrl : (previewRefreshResult.iframeUrl ?? '');
  const displayStatus = resolveWorkbenchDisplayStatus(data.project?.project.status, data.qaReport);
  const latestRun = data.project?.latest_run;
  const semanticPatchActions = useSemanticPatchActions({
    onPreviewRefreshRequest: (request) => {
      previewRefresh.requestRefresh(request, {
        apiBase: API_BASE,
        projectPreviewUrl: previewUrl,
        artifactIndex: data.pipelineArtifactIndex,
        runStatus: latestRun?.status,
        workbenchOrigin: window.location.origin
      });
    }
  });
  const timelineSteps = latestRun?.steps.length ? latestRun.steps : fallbackSteps(latestRun?.status);
  const repairMessage = data.repairReport?.message ?? data.repairReport?.attempts?.[0]?.reason ?? 'none';
  const isTerminal = useMemo(() => {
    const status = latestRun?.status;
    return status === undefined || ['PLAYABLE', 'QA_FAILED', 'BUILD_FAILED', 'PREVIEW_ARTIFACT_MISSING', 'DSL_VALIDATION_FAILED', 'FAILED'].includes(status);
  }, [latestRun?.status]);
  const liveObjectTree = useMemo(() => (liveCurrent ? buildLiveObjectTree(liveCurrent.game_dsl) : []), [liveCurrent]);
  const liveEditableFields = useMemo(
    () => (liveCurrent ? buildEditableFields(liveCurrent.game_dsl, liveCurrent.live_edit_capabilities, selectedObjectPath) : []),
    [liveCurrent, selectedObjectPath]
  );
  const liveEditCapabilityDiagnostics = useMemo(
    () =>
      liveCurrent
        ? buildLiveEditCapabilityDiagnostics(liveCurrent.live_edit_capabilities, {
            runtimeStatus: liveCurrent.runtime_capability_report.status
          })
        : [],
    [liveCurrent]
  );
  const semanticEditDocument = useMemo(() => liveCurrent?.game_dsl, [liveCurrent]);
  const semanticEditIndex = useMemo(() => (liveCurrent ? buildSemanticIndex(liveCurrent.game_dsl) : undefined), [liveCurrent]);
  const canEditCurrentGame = projectId.trim().length > 0 && runId.trim().length > 0;
  const conversationActivityLabel =
    pendingSemanticAmendmentId !== null
      ? `Applying amendment: ${pendingSemanticAmendmentId}`
      : pendingPatchId !== null
      ? `Applying live edit: ${pendingPatchId}`
      : conversationAction === 'generating'
        ? 'Generating game'
        : conversationAction === 'submitting_edit'
          ? 'Sending edit'
          : undefined;
  const conversationBusy = loading || pendingPatchId !== null || pendingSemanticAmendmentId !== null;
  const agentStatusBody =
    conversationActivityLabel ??
    (latestRun !== undefined && !isTerminal
      ? `Pipeline running: ${latestRun.status}`
      : projectId.trim().length === 0 || runId.trim().length === 0
        ? 'Waiting for a game prompt.'
        : liveEditStatus);
  const agentStatusMessage: GameConversationMessage = {
    id: 'agent:status',
    role: 'system',
    title: conversationActivityLabel === undefined && (latestRun === undefined || isTerminal) ? 'Agent status' : 'Agent running',
    body: agentStatusBody,
    meta: conversationActivityLabel !== undefined || (latestRun !== undefined && !isTerminal) ? 'running' : 'idle',
    live: true
  };
  const gameConversationMessages = useMemo<GameConversationMessage[]>(() => {
    const messages: GameConversationMessage[] = [];
    const trimmedIdea = idea.trim();

    conversationInputHistory.forEach((record) => {
      messages.push({
        id: record.id,
        role: 'user',
        title: record.mode === 'new_game' ? 'New game prompt' : 'Edit request',
        body: record.body,
        meta: record.meta
      });
    });

    if (conversationInputHistory.length === 0 && trimmedIdea.length > 0) {
      messages.push({
        id: 'brief:current',
        role: 'user',
        title: 'Brief',
        body: trimmedIdea,
        meta: projectId ? 'generated' : 'draft'
      });
    }

    if (projectId.trim().length > 0 && runId.trim().length > 0) {
      messages.push({
        id: `run:${projectId}:${runId}`,
        role: 'workbench',
        title: 'Generated game',
        body: `${projectId} · ${runId}`,
        meta: displayStatus
      });
    }

    liveCurrent?.patch_history.slice(-5).forEach((item) => {
      messages.push({
        id: `live:${item.patchId}:${item.versionId}`,
        role: 'workbench',
        title: 'Live edit applied',
        body: item.ops?.map((op) => `${op.op} ${op.path}`).join(', ') || item.patchId,
        meta: item.versionId
      });
    });

    semanticPatchActions.state.history.slice(-5).forEach((item) => {
      messages.push({
        id: `semantic:${item.id}`,
        role: item.status === 'failed' || item.status === 'stale' || item.status === 'hash_conflict' ? 'system' : 'workbench',
        title: `Semantic ${item.action}`,
        body: item.message,
        meta: item.status
      });
    });

    return messages;
  }, [conversationInputHistory, displayStatus, idea, liveCurrent?.patch_history, projectId, runId, semanticPatchActions.state.history]);
  const semanticAmendmentCardViews = useMemo<SemanticAmendmentProposalCardView[]>(
    () =>
      semanticAmendmentCards.map((card) =>
        buildSemanticAmendmentCardView(card, {
          currentProjectId: projectId,
          currentRunId: runId,
          runtimeReady,
          previewInstanceId,
          actionDisabled: loading || pendingPatchId !== null || pendingSemanticAmendmentId !== null,
          onAccept: () => void acceptSemanticAmendmentCard(card.id),
          onReject: () => void rejectSemanticAmendmentCard(card.id),
          onUndo: () => void undoSemanticAmendmentCard(card.id)
        })
      ),
    [loading, pendingPatchId, pendingSemanticAmendmentId, previewInstanceId, projectId, runId, runtimeReady, semanticAmendmentCards]
  );

  useEffect(() => {
    if (!projectId || !runId || isTerminal) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      void loadProject(projectId, runId, { silent: true });
    }, 1500);

    return () => window.clearInterval(timer);
  }, [projectId, runId, isTerminal]);

  useEffect(() => {
    const nextMode: BriefTextboxMode = canEditCurrentGame ? 'edit_current_game' : 'new_game';
    setBriefMode((currentMode) => (currentMode === nextMode ? currentMode : nextMode));
  }, [canEditCurrentGame]);

  useEffect(() => {
    if (!projectId || !runId || !previewUrl || previewBlankScreen) {
      return;
    }
    const hasCurrentRefreshForRun = previewRefreshResult !== undefined && previewRefreshResult.projectId === projectId && previewRefreshResult.runId === runId;
    if (hasCurrentRefreshForRun && previewRefreshResult.status !== 'failed' && previewRefreshResult.status !== 'waiting_for_build') {
      return;
    }
    if (hasCurrentRefreshForRun && previewRefreshResult.status === 'failed' && data.pipelineArtifactIndex === undefined) {
      return;
    }

    previewRefresh.requestRefresh(
      { projectId, runId, reason: 'generation_completed', forceQa: true },
      {
        apiBase: API_BASE,
        projectPreviewUrl: previewUrl,
        artifactIndex: data.pipelineArtifactIndex,
        runStatus: latestRun?.status,
        workbenchOrigin: window.location.origin
      }
    );
  }, [data.pipelineArtifactIndex, latestRun?.status, previewBlankScreen, previewRefresh.requestRefresh, previewRefreshResult, previewUrl, projectId, runId]);

  useEffect(() => {
    if (previewRefreshId === undefined || data.qaReport === undefined) {
      return;
    }

    previewRefresh.completeQa(previewRefreshId, { qaReport: data.qaReport });
  }, [data.qaReport, previewRefresh.completeQa, previewRefreshId]);

  useEffect(() => {
    if (!activePreviewUrl || previewBlankScreen) {
      return undefined;
    }

    const forwardKey = (event: globalThis.KeyboardEvent) => {
      if (!isPreviewControlKey(event.key) || isFormControlTarget(event.target)) {
        return;
      }

      previewFrameRef.current?.contentWindow?.postMessage(
        {
          type: 'agm.preview.key',
          eventType: event.type,
          key: event.key
        },
        '*'
      );
      event.preventDefault();
    };

    window.addEventListener('keydown', forwardKey);
    window.addEventListener('keyup', forwardKey);

    return () => {
      window.removeEventListener('keydown', forwardKey);
      window.removeEventListener('keyup', forwardKey);
    };
  }, [activePreviewUrl, previewBlankScreen]);

  useEffect(() => {
    runtimeReadyRef.current = runtimeReady;
  }, [runtimeReady]);

  useEffect(() => {
    setRuntimeReady(false);
    runtimeReadyRef.current = false;
    setPendingPatchId(null);
    setPreviewInstanceId(null);
    runtimeReadyRetryRef.current = activePreviewUrl && !previewBlankScreen ? { url: activePreviewUrl, attempted: false } : null;
    pendingPatchRef.current = null;
    pendingSemanticAmendmentRef.current = null;
    setPendingSemanticAmendmentId(null);
    setLiveEditStatus(activePreviewUrl && !previewBlankScreen ? 'Waiting for runtime' : 'Runtime not connected');
  }, [activePreviewUrl, previewBlankScreen]);

  useEffect(() => {
    const handleRuntimeMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!isRuntimeMessage(data)) {
        return;
      }
      if (event.source !== previewFrameRef.current?.contentWindow) {
        return;
      }

      if (data.type === 'AIGAME_RUNTIME_READY') {
        if (runId && typeof data.runId === 'string' && data.runId !== runId) {
          return;
        }
        if (typeof data.previewInstanceId !== 'string') {
          return;
        }
        setPreviewInstanceId(data.previewInstanceId);
        setRuntimeReady(true);
        setLiveEditStatus(`Runtime ready: ${typeof data.runtimeTarget === 'string' ? data.runtimeTarget : 'preview'}`);
        if (previewRefreshId !== undefined) {
          previewRefresh.markRuntimeLoaded(previewRefreshId);
        }
        previewFrameRef.current?.contentWindow?.postMessage({ type: 'AIGAME_GET_CAPABILITIES', runId, previewInstanceId: data.previewInstanceId }, '*');
        return;
      }

      if (data.type === 'AIGAME_RUNTIME_ERROR') {
        const prepared = pendingPatchRef.current;
        if (runtimeMessageMatchesPending(data, prepared, runId, previewInstanceId)) {
          const message = typeof data.message === 'string' ? data.message : 'Runtime bridge error.';
          setLiveEditStatus(`Runtime error: ${message}`);
          void recordRuntimePatchResult(prepared, {
            status: 'failed_runtime_apply',
            applyMode: 'none',
            runtimeTarget: 'phaser:top_down_shooter',
            appliedPaths: [],
            warnings: [],
            errors: [{ code: 'AIGAME_RUNTIME_ERROR', path: 'runtime', message }]
          });
          return;
        }

        const pendingSemanticAmendment = pendingSemanticAmendmentRef.current;
        if (!runtimeMessageMatchesPendingSemantic(data, pendingSemanticAmendment)) {
          return;
        }
        const message = typeof data.message === 'string' ? data.message : 'Runtime bridge error.';
        setLiveEditStatus(`Runtime error: ${message}`);
        void recordSemanticAmendmentRuntimeResult(pendingSemanticAmendment, {
          status: 'failed_runtime_apply',
          applyMode: 'none',
          runtimeTarget: 'phaser:top_down_shooter',
          appliedPaths: [],
          warnings: [],
          errors: [{ code: 'AIGAME_RUNTIME_ERROR', path: 'runtime', message }]
        });
        return;
      }

      if (data.type !== 'AIGAME_PATCH_RESULT' || !isRuntimePatchResult(data.result)) {
        return;
      }

      const prepared = pendingPatchRef.current;
      if (runtimeMessageMatchesPending(data, prepared, runId, previewInstanceId)) {
        void recordRuntimePatchResult(prepared, data.result);
        return;
      }

      const pendingSemanticAmendment = pendingSemanticAmendmentRef.current;
      if (runtimeMessageMatchesPendingSemantic(data, pendingSemanticAmendment)) {
        void recordSemanticAmendmentRuntimeResult(pendingSemanticAmendment, data.result);
      }
    };

    window.addEventListener('message', handleRuntimeMessage);
    return () => window.removeEventListener('message', handleRuntimeMessage);
  }, [projectId, runId, previewInstanceId, previewRefresh.markRuntimeLoaded, previewRefreshId]);

  async function generateProject() {
    appendConversationInput('new_game', idea);
    setConversationAction('generating');
    try {
      await runAction(async () => {
        const created = await requestJson<{ ok: true; project_id: string; run_id: string }>(`${API_BASE}/api/projects/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildGenerateProjectRequest({ idea, language, promptOptimizationSelection }))
        });
        setProjectId(created.project_id);
        setRunId(created.run_id);
        setSemanticEditText('');
        setBriefMode('edit_current_game');
        await loadProject(created.project_id, created.run_id);
      });
    } finally {
      setConversationAction(null);
    }
  }

  async function loadProject(selectedProjectId = projectId, selectedRunId = runId, options: { silent?: boolean } = {}) {
    await runAction(async () => {
      const project = await requestJson<ProjectStatus>(`${API_BASE}/api/projects/${selectedProjectId}`);
      const events = await requestJson<RunEvents>(`${API_BASE}/api/projects/${selectedProjectId}/runs/${selectedRunId}/events`);
      const status = project.latest_run.status;
      const [qaReport, repairReport, buildLog, artAssetPreview, artifacts, live, evidence, acceptance, bindingTrace] = await Promise.all([
        shouldLoadQaReport(status) ? optionalJson<{ qa_report: QaReport }>(`${API_BASE}/api/projects/${selectedProjectId}/runs/${selectedRunId}/qa-report`) : undefined,
        shouldLoadRepairReport(status)
          ? optionalJson<{ repair_report: RepairReport }>(`${API_BASE}/api/projects/${selectedProjectId}/runs/${selectedRunId}/repair-report`)
          : undefined,
        shouldLoadBuildLog(status) ? optionalJson<{ build_log: string }>(`${API_BASE}/api/projects/${selectedProjectId}/runs/${selectedRunId}/build-log`) : undefined,
        optionalJson<{ preview: ArtAssetWorkbenchPreview }>(`${API_BASE}/api/art-assets/preview/small-library`),
        optionalJson<PipelineArtifactsResponse>(`${API_BASE}/api/projects/${selectedProjectId}/runs/${selectedRunId}/artifacts`),
        optionalJson<LiveCurrentResponse>(`${API_BASE}/api/projects/${selectedProjectId}/runs/${selectedRunId}/live/current`),
        fetchPipelineEvidence({ apiBase: API_BASE, projectId: selectedProjectId, runId: selectedRunId }),
        fetchPipelineAcceptance({ apiBase: API_BASE, projectId: selectedProjectId, runId: selectedRunId }),
        fetchAssetBindingTrace({ apiBase: API_BASE, projectId: selectedProjectId, runId: selectedRunId })
      ]);

      setData({
        project,
        events: events.events,
        qaReport: qaReport?.qa_report,
        repairReport: repairReport?.repair_report,
        buildLog: buildLog?.build_log,
        artAssetPreview: artAssetPreview?.preview,
        pipelineArtifactIndex: artifacts?.pipeline_artifact_index
      });
      setLiveCurrent(live);
      setPipelineEvidence(evidence);
      setPipelineAcceptance(acceptance);
      setAssetBindingTrace(bindingTrace);
    }, options);
  }

  async function refreshPipelineEvidence() {
    setPipelineEvidenceLoading(true);
    setError(null);
    try {
      setPipelineEvidence(await fetchPipelineEvidence({ apiBase: API_BASE, projectId, runId }));
    } catch (evidenceError) {
      setPipelineEvidence({ status: 'error', message: evidenceError instanceof Error ? evidenceError.message : 'Pipeline evidence request failed.', groups: [] });
    } finally {
      setPipelineEvidenceLoading(false);
    }
  }

  async function refreshPipelineAcceptance() {
    setPipelineAcceptanceLoading(true);
    setError(null);
    try {
      setPipelineAcceptance(await fetchPipelineAcceptance({ apiBase: API_BASE, projectId, runId }));
    } catch (acceptanceError) {
      const message = acceptanceError instanceof Error ? acceptanceError.message : 'Pipeline acceptance request failed.';
      setPipelineAcceptance({ status: 'error', message: sanitizeWorkbenchErrorMessage(message, 'Pipeline acceptance request failed.') });
    } finally {
      setPipelineAcceptanceLoading(false);
    }
  }

  async function refreshAssetBindingTrace() {
    setAssetBindingTraceLoading(true);
    setError(null);
    try {
      setAssetBindingTrace(await fetchAssetBindingTrace({ apiBase: API_BASE, projectId, runId }));
    } catch (traceError) {
      const message = traceError instanceof Error ? traceError.message : 'Asset binding trace request failed.';
      setAssetBindingTrace({ status: 'error', message: sanitizeWorkbenchErrorMessage(message, 'Asset binding trace request failed.') });
    } finally {
      setAssetBindingTraceLoading(false);
    }
  }

  async function applyLiveField(field: LiveEditableField, nextValue: number | string, intent?: string): Promise<boolean> {
    return applyLiveEdits([{ field, value: nextValue }], intent);
  }

  async function applyLiveEdits(edits: Array<{ field: LiveEditableField; value: number | string }>, intent?: string): Promise<boolean> {
    let patchSent = false;
    const actionOk = await runAction(async () => {
      if (pendingPatchRef.current !== null) {
        throw new Error('A live edit patch is already waiting for runtime confirmation.');
      }
      if (!runtimeReady || previewInstanceId === null) {
        throw new Error('Preview runtime is not ready for live edit.');
      }
      setLiveEditStatus(`Preparing ${edits.map((edit) => edit.field.path).join(', ')}`);
      const prepared = await requestJson<PreparedDeterministicPatch>(`${API_BASE}/api/projects/${projectId}/runs/${runId}/live-edits/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          edits.length === 1
            ? buildReplacePrepareBody(edits[0]!.field.path, edits[0]!.value, intent)
            : buildReplacePrepareBodyForEdits(
                edits.map((edit) => ({ path: edit.field.path, value: edit.value })),
                intent
              )
        )
      });
      setLiveEditStatus(`Plan: ${prepared.status}`);

      if (prepared.validation_report?.status === 'invalid') {
        return;
      }
      if ((prepared.apply_mode !== 'hot' && prepared.apply_mode !== 'warm_restart') || prepared.runtime_patch === undefined) {
        pendingPatchRef.current = null;
        setPendingPatchId(null);
        return;
      }

      const previewWindow = previewFrameRef.current?.contentWindow;
      if (previewWindow === undefined || previewWindow === null) {
        throw new Error('Preview runtime is not available.');
      }

      pendingPatchRef.current = prepared;
      setPendingPatchId(prepared.patch_id);
      previewWindow.postMessage(
        { type: 'AIGAME_APPLY_PATCH', runId, patchId: prepared.patch_id, previewInstanceId, runtimePatch: prepared.runtime_patch },
        '*'
      );
      setLiveEditStatus(`Patch sent: ${prepared.patch_id}`);
      patchSent = true;
    });
    return actionOk && patchSent;
  }

  async function recordRuntimePatchResult(prepared: PreparedDeterministicPatch, result: RuntimePatchResult) {
    try {
      const report = buildRuntimeApplyReportFromPatchResult(runId, prepared, result);
      const recorded = await requestJson<RuntimeApplyResponse>(`${API_BASE}/api/projects/${projectId}/runs/${runId}/live-edits/${prepared.patch_id}/runtime-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
      setLiveEditStatus(`${recorded.status}${recorded.version_id ? ` -> ${recorded.version_id}` : ''}`);
      await loadProject(projectId, runId, { silent: true });
    } catch (applyError) {
      const message = applyError instanceof Error ? applyError.message : 'Runtime apply recording failed.';
      setError(sanitizeWorkbenchErrorMessage(message, 'Runtime apply recording failed.'));
    } finally {
      pendingPatchRef.current = null;
      setPendingPatchId(null);
    }
  }

  async function runAction(action: () => Promise<void>, options: { silent?: boolean } = {}): Promise<boolean> {
    if (!options.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      await action();
      return true;
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : 'Request failed.';
      setError(sanitizeWorkbenchErrorMessage(message));
      return false;
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }

  function updateProjectId(nextProjectId: string) {
    setProjectId(nextProjectId);
    if (nextProjectId.trim().length === 0 || runId.trim().length === 0) {
      setPipelineEvidence({ status: 'idle', message: 'Select a project and run to view pipeline evidence.', groups: [] });
      setPipelineAcceptance({ status: 'idle', message: 'Select a project and run to view pipeline acceptance.' });
      setAssetBindingTrace({ status: 'idle', message: 'Select a project and run to view asset binding trace.' });
    }
  }

  function updateRunId(nextRunId: string) {
    setRunId(nextRunId);
    if (projectId.trim().length === 0 || nextRunId.trim().length === 0) {
      setPipelineEvidence({ status: 'idle', message: 'Select a project and run to view pipeline evidence.', groups: [] });
      setPipelineAcceptance({ status: 'idle', message: 'Select a project and run to view pipeline acceptance.' });
      setAssetBindingTrace({ status: 'idle', message: 'Select a project and run to view asset binding trace.' });
    }
  }

  function updateIdeaFromBrief(nextIdea: string) {
    setIdea(nextIdea);
    setPromptOptimizationSelection((selection) => (selection !== null && nextIdea !== selection.candidatePrompt ? null : selection));
  }

  function updateBriefText(nextText: string) {
    if (briefMode === 'new_game') {
      updateIdeaFromBrief(nextText);
      return;
    }

    setSemanticEditText(nextText);
  }

  function appendConversationInput(mode: BriefTextboxMode, text: string): void {
    const body = text.trim();
    if (body.length === 0) {
      return;
    }

    const id = `input:${conversationInputSequenceRef.current}`;
    conversationInputSequenceRef.current += 1;

    setConversationInputHistory((previous) => [
      ...previous.slice(-(CONVERSATION_INPUT_HISTORY_LIMIT - 1)),
      {
        id,
        mode,
        body,
        meta: mode === 'new_game' ? 'new game' : 'edit'
      }
    ]);
  }

  function createSemanticAmendmentCard(input: {
    projectId: string;
    runId: string;
    proposal: SemanticEditProposal;
  }): SemanticAmendmentConversationCard {
    return {
      id: input.proposal.id,
      projectId: input.projectId,
      runId: input.runId,
      proposal: input.proposal,
      status: initialSemanticAmendmentCardStatus(input.proposal),
      message: input.proposal.userMessage
    };
  }

  function upsertSemanticAmendmentCard(card: SemanticAmendmentConversationCard): void {
    setSemanticAmendmentCards((previous) => {
      const next = previous.filter((item) => item.id !== card.id);
      return [...next, card].slice(-8);
    });
  }

  function updateSemanticAmendmentCard(cardId: string, update: (card: SemanticAmendmentConversationCard) => SemanticAmendmentConversationCard): void {
    setSemanticAmendmentCards((previous) => previous.map((card) => (card.id === cardId ? update(card) : card)));
  }

  function setSemanticAmendmentCardStatus(cardId: string, status: SemanticAmendmentCardStatus, message?: string): void {
    updateSemanticAmendmentCard(cardId, (card) => ({
      ...card,
      status,
      ...(message === undefined ? {} : { message })
    }));
  }

  async function submitConversationEdit(text: string): Promise<'handled' | 'blocked'> {
    appendConversationInput('edit_current_game', text);
    const selectedProjectId = projectId.trim();
    const selectedRunId = runId.trim();
    if (selectedProjectId.length === 0 || selectedRunId.length === 0) {
      setError('Select a project and run before requesting a game amendment.');
      return 'blocked';
    }

    setConversationAction('submitting_edit');
    setLoading(true);
    setError(null);
    try {
      const planned = await planSemanticAmendment({
        apiBase: API_BASE,
        projectId: selectedProjectId,
        runId: selectedRunId,
        text,
        language
      });
      const initialCard = createSemanticAmendmentCard({
        projectId: selectedProjectId,
        runId: selectedRunId,
        proposal: planned.proposal
      });
      upsertSemanticAmendmentCard(initialCard);

      if (!isPreviewableSemanticAmendment(planned.proposal)) {
        return 'handled';
      }

      setSemanticAmendmentCardStatus(planned.proposal.id, 'previewing', planned.proposal.userMessage);
      const previewed = await previewSemanticAmendment({
        apiBase: API_BASE,
        projectId: selectedProjectId,
        runId: selectedRunId,
        proposalId: planned.proposal.id
      });
      upsertSemanticAmendmentCard({
        ...initialCard,
        proposal: previewed.proposal,
        previewState: previewed.preview_state,
        status: previewed.preview_state.reviewState === 'previewing' ? 'ready' : 'failed',
        message: previewed.proposal.userMessage,
        failureReason: previewed.preview_state.failureReason
      });
      return 'handled';
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Semantic amendment request failed.';
      setError(sanitizeWorkbenchErrorMessage(message, 'Semantic amendment request failed.'));
      return 'blocked';
    } finally {
      setLoading(false);
      setConversationAction(null);
    }
  }

  async function acceptSemanticAmendmentCard(cardId: string): Promise<void> {
    const card = semanticAmendmentCards.find((candidate) => candidate.id === cardId);
    if (card === undefined) {
      return;
    }

    if (requiresRuntimeApplyReport(card.proposal)) {
      await sendSemanticAmendmentRuntimePatch(card);
      return;
    }

    setLoading(true);
    setError(null);
    setSemanticAmendmentCardStatus(card.id, 'accepting', 'Promoting semantic amendment candidate.');
    try {
      const accepted = await acceptSemanticAmendment({
        apiBase: API_BASE,
        projectId: card.projectId,
        runId: card.runId,
        proposalId: card.proposal.id
      });
      updateSemanticAmendmentCard(card.id, (current) => ({
        ...current,
        proposal: accepted.proposal,
        status: accepted.proposal.reviewState === 'accepted' ? 'accepted' : 'failed',
        message: accepted.proposal.userMessage
      }));

      const activeRunId = accepted.accept_log.candidatePromotionResult?.activeRunId ?? card.runId;
      if (activeRunId !== runId) {
        setRunId(activeRunId);
      }
      await loadProject(card.projectId, activeRunId);
    } catch (acceptError) {
      const message = acceptError instanceof Error ? acceptError.message : 'Semantic amendment accept failed.';
      updateSemanticAmendmentCard(card.id, (current) => ({ ...current, status: 'ready', failureReason: sanitizeWorkbenchErrorMessage(message) }));
      setError(sanitizeWorkbenchErrorMessage(message, 'Semantic amendment accept failed.'));
    } finally {
      setLoading(false);
    }
  }

  async function sendSemanticAmendmentRuntimePatch(card: SemanticAmendmentConversationCard): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      if (pendingPatchRef.current !== null || pendingSemanticAmendmentRef.current !== null) {
        throw new Error('A live edit patch is already waiting for runtime confirmation.');
      }
      if (projectId !== card.projectId || runId !== card.runId) {
        throw new Error('This proposal was previewed for a different active run. Reload that run before accepting it.');
      }
      if (!runtimeReady || previewInstanceId === null) {
        throw new Error('Preview runtime is not ready for semantic amendment accept.');
      }
      if (card.previewState?.preparedLiveEdit === undefined) {
        throw new Error('Semantic amendment preview did not prepare a runtime patch.');
      }
      const prepared = card.previewState.preparedLiveEdit;
      if ((prepared.apply_mode !== 'hot' && prepared.apply_mode !== 'warm_restart') || prepared.runtime_patch === undefined) {
        throw new Error(`Semantic amendment preview is not runtime-applicable: ${prepared.apply_mode}.`);
      }
      const previewWindow = previewFrameRef.current?.contentWindow;
      if (previewWindow === undefined || previewWindow === null) {
        throw new Error('Preview runtime is not available.');
      }

      pendingSemanticAmendmentRef.current = {
        cardId: card.id,
        projectId: card.projectId,
        runId: card.runId,
        proposalId: card.proposal.id,
        previewState: card.previewState,
        previewInstanceId
      };
      setPendingSemanticAmendmentId(card.id);
      setSemanticAmendmentCardStatus(card.id, 'accepting', `Runtime patch sent: ${prepared.patch_id}`);
      setLiveEditStatus(`Semantic amendment patch sent: ${prepared.patch_id}`);
      previewWindow.postMessage(
        { type: 'AIGAME_APPLY_PATCH', runId: card.runId, patchId: prepared.patch_id, previewInstanceId, runtimePatch: prepared.runtime_patch },
        '*'
      );
    } catch (acceptError) {
      const message = acceptError instanceof Error ? acceptError.message : 'Semantic amendment runtime accept failed.';
      if (pendingSemanticAmendmentRef.current?.cardId === card.id) {
        pendingSemanticAmendmentRef.current = null;
        setPendingSemanticAmendmentId(null);
      }
      updateSemanticAmendmentCard(card.id, (current) => ({ ...current, status: 'ready', failureReason: sanitizeWorkbenchErrorMessage(message) }));
      setError(sanitizeWorkbenchErrorMessage(message, 'Semantic amendment runtime accept failed.'));
    } finally {
      setLoading(false);
    }
  }

  async function recordSemanticAmendmentRuntimeResult(pending: PendingSemanticAmendmentRuntimeApply, result: RuntimePatchResult): Promise<void> {
    try {
      const runtimeApplyReport = buildSemanticAmendmentRuntimeApplyReport(pending.runId, pending.previewState, result);
      const accepted = await acceptSemanticAmendment({
        apiBase: API_BASE,
        projectId: pending.projectId,
        runId: pending.runId,
        proposalId: pending.proposalId,
        runtimeApplyReport
      });
      updateSemanticAmendmentCard(pending.cardId, (card) => ({
        ...card,
        proposal: accepted.proposal,
        status: accepted.proposal.reviewState === 'accepted' ? 'accepted' : 'failed',
        message: accepted.proposal.userMessage,
        failureReason: accepted.proposal.reviewState === 'accepted' ? undefined : 'Runtime apply did not produce an accepted amendment.'
      }));
      const runtimeStatus = accepted.accept_log.runtimeApplyResult?.status ?? runtimeApplyReport.status;
      const versionId = accepted.accept_log.runtimeApplyResult?.version_id;
      setLiveEditStatus(`Semantic amendment ${runtimeStatus}${versionId ? ` -> ${versionId}` : ''}`);
      if (accepted.proposal.reviewState === 'accepted' && pending.previewState.preparedLiveEdit !== undefined) {
        previewRefresh.requestRefresh(
          {
            projectId: pending.projectId,
            runId: pending.runId,
            patchId: pending.previewState.preparedLiveEdit.patch_id,
            reason: 'semantic_patch_applied',
            forceQa: true
          },
          {
            apiBase: API_BASE,
            projectPreviewUrl: previewUrl,
            artifactIndex: data.pipelineArtifactIndex,
            runStatus: latestRun?.status,
            workbenchOrigin: window.location.origin
          }
        );
      }
      await loadProject(pending.projectId, pending.runId, { silent: true });
    } catch (applyError) {
      const message = applyError instanceof Error ? applyError.message : 'Semantic amendment runtime result recording failed.';
      updateSemanticAmendmentCard(pending.cardId, (card) => ({ ...card, status: 'failed', failureReason: sanitizeWorkbenchErrorMessage(message) }));
      setError(sanitizeWorkbenchErrorMessage(message, 'Semantic amendment runtime result recording failed.'));
    } finally {
      pendingSemanticAmendmentRef.current = null;
      setPendingSemanticAmendmentId(null);
    }
  }

  async function rejectSemanticAmendmentCard(cardId: string): Promise<void> {
    const card = semanticAmendmentCards.find((candidate) => candidate.id === cardId);
    if (card === undefined) {
      return;
    }

    setLoading(true);
    setError(null);
    setSemanticAmendmentCardStatus(card.id, 'rejecting', 'Rejecting semantic amendment.');
    try {
      const rejected = await rejectSemanticAmendment({
        apiBase: API_BASE,
        projectId: card.projectId,
        runId: card.runId,
        proposalId: card.proposal.id,
        reason: 'Rejected from Workbench proposal card.'
      });
      updateSemanticAmendmentCard(card.id, (current) => ({
        ...current,
        proposal: rejected.proposal,
        status: 'rejected',
        message: rejected.proposal.userMessage
      }));
    } catch (rejectError) {
      const message = rejectError instanceof Error ? rejectError.message : 'Semantic amendment reject failed.';
      updateSemanticAmendmentCard(card.id, (current) => ({ ...current, status: 'failed', failureReason: sanitizeWorkbenchErrorMessage(message) }));
      setError(sanitizeWorkbenchErrorMessage(message, 'Semantic amendment reject failed.'));
    } finally {
      setLoading(false);
    }
  }

  async function undoSemanticAmendmentCard(cardId: string): Promise<void> {
    const card = semanticAmendmentCards.find((candidate) => candidate.id === cardId);
    if (card === undefined) {
      return;
    }

    setLoading(true);
    setError(null);
    setSemanticAmendmentCardStatus(card.id, 'undoing', 'Restoring semantic amendment checkpoint.');
    try {
      const undone = await undoSemanticAmendment({
        apiBase: API_BASE,
        projectId: card.projectId,
        runId: card.runId,
        proposalId: card.proposal.id,
        reason: 'Undo from Workbench proposal card.'
      });
      updateSemanticAmendmentCard(card.id, (current) => ({
        ...current,
        proposal: undone.proposal,
        status: 'undone',
        message: undone.proposal.userMessage
      }));
      const restoredRunId = undone.undo_log.restoredRunId ?? card.runId;
      if (restoredRunId !== runId) {
        setRunId(restoredRunId);
      }
      await loadProject(card.projectId, restoredRunId);
    } catch (undoError) {
      const message = undoError instanceof Error ? undoError.message : 'Semantic amendment undo failed.';
      updateSemanticAmendmentCard(card.id, (current) => ({ ...current, status: 'accepted', failureReason: sanitizeWorkbenchErrorMessage(message) }));
      setError(sanitizeWorkbenchErrorMessage(message, 'Semantic amendment undo failed.'));
    } finally {
      setLoading(false);
    }
  }

  function openSemanticPatchReview(handoff: SemanticPatchReviewInput) {
    setLiveEditStatus(`Semantic patch preview: ${handoff.patchId}`);
    semanticPatchActions.openReview(handoff);
  }

  function focusPreviewFrame() {
    previewHostRef.current?.focus();
  }

  function handlePreviewFrameLoad() {
    focusPreviewFrame();
    if (previewRefreshId !== undefined) {
      previewRefresh.markIframeLoaded(previewRefreshId);
    }
    const retry = runtimeReadyRetryRef.current;
    if (retry === null || retry.attempted || retry.url !== activePreviewUrl) {
      return;
    }

    window.setTimeout(() => {
      const currentRetry = runtimeReadyRetryRef.current;
      if (runtimeReadyRef.current || currentRetry === null || currentRetry.attempted || currentRetry.url !== activePreviewUrl) {
        return;
      }
      currentRetry.attempted = true;
      if (previewFrameRef.current !== null) {
        previewFrameRef.current.src = activePreviewUrl;
      }
    }, 400);
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] bg-[linear-gradient(90deg,rgba(21,19,15,0.045)_1px,transparent_1px),linear-gradient(0deg,rgba(21,19,15,0.035)_1px,transparent_1px)] bg-[length:28px_28px] text-[#15130f]">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b-2 border-[#312b22] bg-[#fffaf0]/95 px-5 py-4 max-sm:flex-col max-sm:items-stretch max-sm:gap-3 max-sm:px-3 max-sm:py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-14 items-center justify-center rounded-lg bg-[#15130f] font-black text-[#ffb13b]">AGM</span>
          <div>
            <h1 className="m-0 text-2xl font-black leading-none text-[#15130f]">AI Game Maker Workbench</h1>
            <p className={eyebrowClass}>Playable pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-3 max-sm:justify-between">
          <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#312b22] bg-[#fffef9] px-3 text-xs font-black text-[#15130f]">
            <span className={`h-2 w-2 rounded-full ${statusToneClass(displayStatus)}`} aria-hidden="true" />
            {displayStatus}
          </span>
          <button className={secondaryButtonClass} type="button" onClick={() => void loadProject()} disabled={loading || !projectId || !runId}>
            Refresh
          </button>
        </div>
      </header>

      <section className="grid min-h-[calc(100dvh-82px)] grid-cols-[minmax(340px,420px)_minmax(0,1fr)] border-b border-[#ead9ba] max-lg:grid-cols-1">
        <aside className="sticky top-[82px] flex h-[calc(100dvh-82px)] min-h-0 flex-col self-start border-r border-[#ead9ba] bg-[#fffaf0]/96 p-5 shadow-[12px_0_30px_rgba(49,43,34,0.08)] max-lg:static max-lg:h-[calc(100dvh-7rem)] max-lg:min-h-[460px] max-lg:border-b max-lg:border-r-0 max-sm:h-[calc(100dvh-8rem)] max-sm:min-h-[420px] max-sm:p-3">
          <BriefTextboxPanel
            agentStatusMessage={agentStatusMessage}
            className="h-full min-h-0"
            amendmentCards={semanticAmendmentCardViews}
            conversationMessages={gameConversationMessages}
            document={semanticEditDocument}
            language={language}
            loading={conversationBusy}
            activityLabel={conversationActivityLabel}
            mode={briefMode}
            onLanguageChange={setLanguage}
            onPreviewHandoff={openSemanticPatchReview}
            onSubmitNewGame={() => void generateProject()}
            onSubmitEdit={submitConversationEdit}
            onTextChange={updateBriefText}
            primaryAction={
              <button className={primaryButtonClass} type="button" onClick={() => void generateProject()} disabled={loading || briefMode !== 'new_game'}>
                {loading ? 'Working' : 'Generate'}
              </button>
            }
            projectId={projectId}
            runId={runId}
            semanticIndex={semanticEditIndex}
            value={briefMode === 'new_game' ? idea : semanticEditText}
          />
        </aside>

        <section className="flex min-w-0 flex-col gap-4 p-5 max-sm:p-3">
          {error ? (
            <div className="sticky top-24 z-[5] rounded-lg border border-[#f09a8f] bg-[#ffe2dc] px-4 py-3 font-extrabold text-[#c93d35] shadow-[0_8px_22px_rgba(201,61,53,0.16)]">
              {error}
            </div>
          ) : null}

          <section className="overflow-hidden rounded-lg border border-[#314e66] bg-[#08131d] shadow-[0_18px_55px_rgba(47,38,24,0.16)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#314e66] px-4 py-3 text-[#f8efe0] max-sm:flex-col max-sm:items-stretch">
              <div className="min-w-0">
                <p className="m-0 text-[11px] font-extrabold uppercase text-[#ffb13b]">Live preview</p>
                <h2 className="m-0 text-[23px] font-black leading-tight text-[#fdf3df] [overflow-wrap:anywhere]">{projectId || 'Waiting for a generated project'}</h2>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <PreviewStatusBadge result={previewRefreshResult} />
                <span className="rounded-full border border-[#314e66] px-3 py-1.5 text-xs font-extrabold text-[#c6d7e6]">
                  {observedCounts.length} telemetry signals
                </span>
                <span className="max-w-[260px] rounded-full border border-[#314e66] px-3 py-1.5 text-xs font-extrabold text-[#c6d7e6] [overflow-wrap:anywhere]">
                  {pendingPatchId ?? liveEditStatus}
                </span>
              </div>
            </div>
            {previewBlankScreen ? (
              <div className={`flex ${previewViewportClass} flex-col items-center justify-center gap-2 bg-[#2d1114] p-6 text-center text-[#ffd8ce]`}>
                <strong>PREVIEW_BLANK_SCREEN</strong>
                <span className="max-w-xl text-[#ffc1b5]">Visual QA failed: the preview returned a blank rendered frame, so this run is not PLAYABLE.</span>
              </div>
            ) : activePreviewUrl ? (
              <div
                className={`${previewViewportClass} w-full outline-none focus-visible:ring-4 focus-visible:ring-[#ffb13b]`}
                ref={previewHostRef}
                tabIndex={0}
              >
                <PreviewFrame ref={previewFrameRef} src={activePreviewUrl} onLoad={handlePreviewFrameLoad} />
              </div>
            ) : (
              <div className={`flex ${previewViewportClass} items-center justify-center text-[#b8cadd]`}>
                {previewRefreshResult?.status === 'waiting_for_build' ? 'Waiting for generated artifact' : 'No preview'}
              </div>
            )}
          </section>

          <section className="grid grid-cols-[minmax(260px,0.95fr)_minmax(320px,1.05fr)] gap-4 max-lg:grid-cols-1">
            <section className={panelClass}>
              <div className={panelHeadingClass}>
                <div>
                  <p className={eyebrowClass}>Run</p>
                  <h2 className={headingClass}>Session</h2>
                </div>
              </div>
              <label className="mb-3 grid gap-2 text-sm font-bold text-[#69645d]">
                Project ID
                <input className={fieldClass} value={projectId} onChange={(event) => updateProjectId(event.target.value)} />
              </label>
              <label className="mb-0 grid gap-2 text-sm font-bold text-[#69645d]">
                Run ID
                <input className={fieldClass} value={runId} onChange={(event) => updateRunId(event.target.value)} />
              </label>
            </section>

            <section className={panelClass}>
              <div className={panelHeadingClass}>
                <div>
                  <p className={eyebrowClass}>Pipeline</p>
                  <h2 className={headingClass}>Timeline</h2>
                </div>
              </div>
              <ol className="m-0 grid list-none gap-2.5 p-0">
                {timelineSteps.map((step) => (
                  <li className="grid grid-cols-[78px_1fr] items-center gap-2.5 text-sm font-bold text-[#302b24]" key={step.name}>
                    <span className={`rounded-full border px-2 py-1 text-center text-[11px] font-black ${stepStatusClass(step.status)}`}>{step.status}</span>
                    {step.name}
                  </li>
                ))}
              </ol>
            </section>

            <QaStatusPanel report={data.qaReport} />

            <PromptCoachPanel
              projectId={projectId}
              runId={runId}
              currentPrompt={idea}
              onUseOptimizedPrompt={(selection) => {
                setIdea(selection.candidatePrompt);
                setPromptOptimizationSelection(selection);
              }}
            />

            <article className={`${panelClass} min-h-40`}>
              <div className={panelHeadingClass}>
                <div>
                  <p className={eyebrowClass}>Runtime</p>
                  <h2 className={headingClass}>Telemetry</h2>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {observedCounts.map(([event, count]) => (
                  <span className="rounded-full border border-[#c9dbff] bg-[#e9f0ff] px-2.5 py-1.5 text-xs font-extrabold text-[#1d57a7]" key={event}>
                    {`${event} ${count}`}
                  </span>
                ))}
                {observedCounts.length === 0 ? (
                  <span className="rounded-full border border-[#d0b993] bg-[#ece1ce] px-2.5 py-1.5 text-xs font-extrabold text-[#69645d]">No events yet</span>
                ) : null}
              </div>
            </article>

            <article className={`${panelClass} min-h-64`}>
              <div className={panelHeadingClass}>
                <div>
                  <p className={eyebrowClass}>Live edit</p>
                  <h2 className={headingClass}>AIGame Controls</h2>
                </div>
                <span className="rounded-full border border-[#d0b993] bg-[#ece1ce] px-2.5 py-1 text-[11px] font-black text-[#69645d]">
                  {liveCurrent?.current_version.versionId ?? 'No version'}
                </span>
              </div>
              <div className="grid grid-cols-[minmax(120px,0.8fr)_minmax(180px,1.2fr)] gap-3 max-sm:grid-cols-1">
                <div className="grid content-start gap-2">
                  {liveObjectTree.map((node) => (
                    <button
                      className={`min-h-9 rounded-lg border px-2.5 text-left text-xs font-black [overflow-wrap:anywhere] ${
                        selectedObjectPath === node.path ? 'border-[#15130f] bg-[#ffefc2] text-[#15130f]' : 'border-[#d0b993] bg-[#fffaf0] text-[#69645d]'
                      }`}
                      key={`${node.kind}-${node.id}`}
                      type="button"
                      onClick={() => setSelectedObjectPath(node.path)}
                    >
                      {node.id}
                    </button>
                  ))}
                  {liveObjectTree.length === 0 ? <span className="text-sm font-bold text-[#69645d]">No live DSL</span> : null}
                </div>
                <div className="grid content-start gap-2">
                  {liveEditableFields.map((field) => (
                    <label className="grid grid-cols-[1fr_96px_auto] items-center gap-2 text-xs font-black text-[#69645d] max-sm:grid-cols-1" key={field.path}>
                      <span className="[overflow-wrap:anywhere]">{field.label}</span>
                      <input
                        className={`${fieldClass} min-h-9 px-2 py-1 text-xs`}
                        defaultValue={field.value ?? (field.valueKind === 'label' ? '' : 0)}
                        disabled={!field.enabled || pendingPatchId !== null || !runtimeReady || previewInstanceId === null}
                        key={`${liveCurrent?.current_version.versionId ?? 'none'}:${field.path}`}
                        step={field.valueKind === 'number' ? '0.1' : undefined}
                        type={field.valueKind === 'number' ? 'number' : 'text'}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            void applyLiveField(field, readInspectorFieldValue(field, event.currentTarget as HTMLInputElement));
                          }
                        }}
                      />
                      <button
                        className={secondaryButtonClass}
                        disabled={!field.enabled || !runtimeReady || previewInstanceId === null || pendingPatchId !== null}
                        type="button"
                        onClick={(event) => {
                          const input = event.currentTarget.parentElement?.querySelector('input');
                          void applyLiveField(field, readInspectorFieldValue(field, input));
                        }}
                      >
                        Apply
                      </button>
                    </label>
                  ))}
                  {liveEditableFields.length === 0 ? <span className="text-sm font-bold text-[#69645d]">Select player, enemy, or projectile</span> : null}
                </div>
              </div>
              {liveEditCapabilityDiagnostics.length > 0 ? (
                <div className="mt-3 grid gap-2 border-t border-[#ead9ba] pt-3">
                  {liveEditCapabilityDiagnostics.map((group) => (
                    <div className="grid gap-1 rounded-lg border border-[#ead9ba] bg-[#fffaf0] px-3 py-2" key={group.status}>
                      <span className="text-[11px] font-black uppercase text-[#6f6558]">{`${group.title}: ${group.items.length}`}</span>
                      <span className="text-xs font-bold leading-snug text-[#69645d]">{group.summary}</span>
                      <span className="text-xs font-bold leading-snug text-[#69645d]">{formatCapabilityDiagnosticItems(group.items)}</span>
                      {formatCapabilityBlockedFallbacks(group.items) ? (
                        <span className="text-xs font-bold leading-snug text-[#9a4d22]">{formatCapabilityBlockedFallbacks(group.items)}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-3 grid gap-1 border-t border-[#ead9ba] pt-3 text-xs font-bold text-[#69645d]">
                <span>{`Runtime: ${runtimeReady ? 'ready' : 'waiting'} · ${liveEditStatus}`}</span>
                <span>{`History: ${liveCurrent?.patch_history.map((item) => `${item.patchId}:${item.status}:${item.ops?.map((op) => op.path).join('|') ?? ''}`).join(', ') || 'none'}`}</span>
                <span>{`Audit: ${liveCurrent?.edit_audit_log.map((item) => `${item.patchId}:${item.status}:${item.applyMode}${item.errors?.length ? `:${item.errors.map((issue) => issue.code).join('|')}` : ''}`).join(', ') || 'none'}`}</span>
              </div>
            </article>

            <SemanticPatchReviewPanel
              canAccept={semanticPatchActions.canAccept}
              canReject={semanticPatchActions.canReject}
              canUndo={semanticPatchActions.canUndo}
              loading={loading}
              onAccept={() => void semanticPatchActions.acceptCurrent({ currentProjectId: projectId, currentRunId: runId })}
              onReject={() => {
                semanticPatchActions.rejectCurrent();
              }}
              onUndo={() => void semanticPatchActions.undoCurrent({ currentProjectId: projectId, currentRunId: runId })}
              qaStatus={data.qaReport?.overall_status ?? data.qaReport?.status}
              state={semanticPatchActions.state}
            />

            <AssetStatusPanel report={data.qaReport?.asset_report} preview={data.artAssetPreview} />

            <PipelineAcceptanceSummary
              view={pipelineAcceptance}
              loading={pipelineAcceptanceLoading}
              canRefresh={projectId.trim().length > 0 && runId.trim().length > 0}
              onRefresh={() => void refreshPipelineAcceptance()}
            />

            <AssetBindingTraceSummaryPanel
              view={assetBindingTrace}
              loading={assetBindingTraceLoading}
              canRefresh={projectId.trim().length > 0 && runId.trim().length > 0}
              onRefresh={() => void refreshAssetBindingTrace()}
            />

            <PipelineEvidencePanel
              view={pipelineEvidence}
              loading={pipelineEvidenceLoading}
              canRefresh={projectId.trim().length > 0 && runId.trim().length > 0}
              onRefresh={() => void refreshPipelineEvidence()}
            />

            <article className={panelClass}>
              <div className={panelHeadingClass}>
                <div>
                  <p className={eyebrowClass}>Autofix</p>
                  <h2 className={headingClass}>Repair</h2>
                </div>
              </div>
              <div className="mb-2 text-4xl font-black leading-none text-[#15130f]">{data.repairReport?.status ?? 'No report'}</div>
              <p className="m-0 text-sm leading-snug text-[#69645d]">{repairMessage}</p>
            </article>

            <article className={`${panelClass} min-h-40`}>
              <div className={panelHeadingClass}>
                <div>
                  <p className={eyebrowClass}>Trace</p>
                  <h2 className={headingClass}>Events</h2>
                </div>
              </div>
              <ul className="m-0 grid max-h-48 list-none gap-2 overflow-auto p-0 pr-1">
                {data.events.map((event) => (
                  <li className="border-l-[3px] border-[#ffb13b] pl-2.5 text-sm leading-snug text-[#69645d]" key={`${event.timestamp}-${event.type}`}>
                    {`${event.type}: ${sanitizeWorkbenchDisplayText(event.message)}`}
                  </li>
                ))}
                {data.events.length === 0 ? <li className="text-sm leading-snug text-[#69645d]">No events yet</li> : null}
              </ul>
            </article>
          </section>

          <section className={panelClass}>
            <div className={panelHeadingClass}>
              <div>
                <p className={eyebrowClass}>Output</p>
                <h2 className={headingClass}>Build Log</h2>
              </div>
            </div>
            <pre className="m-0 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-[#15130f] p-4 font-mono text-xs leading-relaxed text-[#f7e6c5]">
              {sanitizeWorkbenchDisplayText(data.buildLog ?? 'No build log')}
            </pre>
          </section>
        </section>
      </section>
    </main>
  );
}

function initialSemanticAmendmentCardStatus(proposal: SemanticEditProposal): SemanticAmendmentCardStatus {
  if (proposal.execution.mode === 'unsupported_capability') {
    return 'unsupported';
  }
  if (proposal.execution.mode === 'needs_clarification') {
    return 'needs_clarification';
  }
  return 'planned';
}

function buildSemanticAmendmentCardView(
  card: SemanticAmendmentConversationCard,
  context: {
    currentProjectId: string;
    currentRunId: string;
    runtimeReady: boolean;
    previewInstanceId: string | null;
    actionDisabled: boolean;
    onAccept: () => void;
    onReject: () => void;
    onUndo: () => void;
  }
): SemanticAmendmentProposalCardView {
  const proposal = card.proposal;
  return {
    id: card.id,
    title: proposal.understanding.understood ? 'Semantic amendment proposal' : 'Clarification needed',
    summary: card.message ?? proposal.userMessage,
    statusLabel: semanticAmendmentStatusLabel(card.status),
    statusTone: semanticAmendmentStatusTone(card.status),
    modeLabel: semanticAmendmentModeLabel(proposal.execution.mode),
    reviewState: proposal.reviewState,
    detailRows: buildSemanticAmendmentDetailRows(card, context),
    plannedChanges: buildSemanticAmendmentPlannedChanges(proposal),
    missingCapabilities: proposal.execution.missingCapabilities,
    rejectedUnsafeFallbacks: proposal.execution.rejectedUnsafeFallbacks,
    candidateRunId: card.previewState?.candidatePreview?.candidateRunId ?? proposal.candidate?.candidateRunId,
    failureReason: card.failureReason ?? card.previewState?.failureReason,
    actions: buildSemanticAmendmentActions(card, context)
  };
}

function buildSemanticAmendmentActions(
  card: SemanticAmendmentConversationCard,
  context: {
    currentProjectId: string;
    currentRunId: string;
    runtimeReady: boolean;
    previewInstanceId: string | null;
    actionDisabled: boolean;
    onAccept: () => void;
    onReject: () => void;
    onUndo: () => void;
  }
): SemanticAmendmentProposalCardAction[] {
  const actions: SemanticAmendmentProposalCardAction[] = [];
  const runtimeAcceptBlocked =
    requiresRuntimeApplyReport(card.proposal) &&
    (context.currentProjectId !== card.projectId || context.currentRunId !== card.runId || !context.runtimeReady || context.previewInstanceId === null);

  if (card.status === 'ready') {
    actions.push({
      id: `${card.id}:accept`,
      label: 'Accept',
      tone: 'primary',
      disabled: context.actionDisabled || runtimeAcceptBlocked,
      onClick: context.onAccept
    });
  }

  if (['planned', 'ready', 'unsupported', 'needs_clarification', 'failed'].includes(card.status)) {
    actions.push({
      id: `${card.id}:reject`,
      label: 'Reject',
      tone: 'danger',
      disabled: context.actionDisabled,
      onClick: context.onReject
    });
  }

  if (card.status === 'accepted') {
    actions.push({
      id: `${card.id}:undo`,
      label: 'Undo',
      tone: 'secondary',
      disabled: context.actionDisabled,
      onClick: context.onUndo
    });
  }

  return actions;
}

function buildSemanticAmendmentDetailRows(
  card: SemanticAmendmentConversationCard,
  context: { currentProjectId: string; currentRunId: string; runtimeReady: boolean; previewInstanceId: string | null }
): Array<{ label: string; value: string }> {
  const proposal = card.proposal;
  const rows = [
    { label: 'Domains', value: proposal.understanding.affectedDomains.join(', ') || 'none' },
    { label: 'Confidence', value: `${Math.round(proposal.understanding.confidence * 100)}%` }
  ];

  if (proposal.execution.reason.trim().length > 0) {
    rows.push({ label: 'Reason', value: proposal.execution.reason });
  }

  if (card.previewState?.preparedLiveEdit !== undefined) {
    rows.push({
      label: 'Preview',
      value: `${card.previewState.preparedLiveEdit.status} / ${card.previewState.preparedLiveEdit.apply_mode}`
    });
  }

  if (card.previewState?.candidatePreview !== undefined) {
    rows.push({
      label: 'QA',
      value: `${card.previewState.candidatePreview.previewAvailable ? 'candidate ready' : 'candidate unavailable'} / ${card.previewState.candidatePreview.qaStatus}`
    });
  }

  if (requiresRuntimeApplyReport(proposal)) {
    rows.push({
      label: 'Runtime',
      value:
        context.currentProjectId === card.projectId && context.currentRunId === card.runId
          ? context.runtimeReady && context.previewInstanceId !== null
            ? 'ready'
            : 'waiting'
          : 'active run differs'
    });
  }

  return rows;
}

function buildSemanticAmendmentPlannedChanges(proposal: SemanticEditProposal): string[] {
  const changes = [
    ...proposal.understanding.designDeltas.flatMap(formatSemanticDesignDelta),
    ...(proposal.candidate?.expectedChangeSummary ?? []),
    ...(proposal.candidate?.candidateBrief === undefined ? [] : [proposal.candidate.candidateBrief.amendmentSummary])
  ];
  const unique = uniqueNonEmpty(changes);
  return unique.length > 0 ? unique : [proposal.understanding.summary];
}

function formatSemanticDesignDelta(delta: SemanticAmendmentDesignDelta): string[] {
  if (delta.kind === 'tune_stat') {
    return [`${delta.targetDomain ?? 'target'}.${delta.stat ?? 'stat'} ${delta.direction ?? 'change'}${formatSemanticAmount(delta.amount)}`];
  }
  if (delta.kind === 'modify_pacing') {
    return uniqueNonEmpty([
      delta.description ?? `pacing ${delta.direction ?? 'change'}`,
      ...(delta.inferredDeltas ?? []).flatMap(formatSemanticDesignDelta)
    ]);
  }
  if (delta.kind === 'reskin_or_theme') {
    return [`${delta.target ?? 'target'} theme: ${delta.themeDescription ?? 'theme update'}`];
  }
  if (delta.kind === 'add_mechanic') {
    return [`${delta.mechanic ?? 'mechanic'}: ${delta.description ?? 'add mechanic'}`];
  }
  if (delta.kind === 'add_feedback') {
    return [`${delta.event ?? 'event'} feedback: ${delta.feedback ?? delta.description ?? 'feedback'}`];
  }
  if (delta.kind === 'change_genre_or_perspective') {
    return [`genre: ${delta.targetGenre ?? delta.description ?? 'change perspective'}`];
  }
  if (delta.kind === 'open_design_request') {
    return uniqueNonEmpty([delta.description, ...(delta.inferredGoals ?? [])]);
  }
  return [delta.description ?? delta.kind];
}

function formatSemanticAmount(amount: number | string | undefined): string {
  return amount === undefined ? '' : ` ${String(amount)}`;
}

function semanticAmendmentModeLabel(mode: SemanticEditProposal['execution']['mode']): string {
  if (mode === 'hot_runtime_patch') {
    return 'hot runtime patch';
  }
  if (mode === 'dsl_patch_warm_restart') {
    return 'DSL patch + warm restart';
  }
  if (mode === 'candidate_regeneration') {
    return 'candidate regeneration';
  }
  if (mode === 'unsupported_capability') {
    return 'unsupported capability';
  }
  return 'needs clarification';
}

function semanticAmendmentStatusLabel(status: SemanticAmendmentCardStatus): string {
  if (status === 'planned') {
    return 'planned';
  }
  if (status === 'previewing') {
    return 'previewing';
  }
  if (status === 'ready') {
    return 'preview ready';
  }
  if (status === 'unsupported') {
    return 'unsupported';
  }
  if (status === 'needs_clarification') {
    return 'clarify';
  }
  if (status === 'accepting') {
    return 'accepting';
  }
  if (status === 'accepted') {
    return 'accepted';
  }
  if (status === 'rejecting') {
    return 'rejecting';
  }
  if (status === 'rejected') {
    return 'rejected';
  }
  if (status === 'undoing') {
    return 'undoing';
  }
  if (status === 'undone') {
    return 'undone';
  }
  return 'failed';
}

function semanticAmendmentStatusTone(status: SemanticAmendmentCardStatus): SemanticAmendmentProposalCardView['statusTone'] {
  if (status === 'ready') {
    return 'ready';
  }
  if (status === 'planned' || status === 'previewing' || status === 'accepting' || status === 'rejecting' || status === 'undoing') {
    return 'pending';
  }
  if (status === 'unsupported' || status === 'needs_clarification' || status === 'rejected' || status === 'undone') {
    return 'blocked';
  }
  if (status === 'accepted') {
    return 'accepted';
  }
  return 'failed';
}

function uniqueNonEmpty(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => value !== undefined && value.length > 0))];
}

function readInspectorFieldValue(field: LiveEditableField, input: HTMLInputElement | null | undefined): number | string {
  const rawValue = input?.value ?? field.value ?? '';
  return field.valueKind === 'label' ? String(rawValue).trim() : Number(rawValue);
}

function formatCapabilityDiagnosticItems(items: LiveEditCapabilityDiagnosticItem[]): string {
  const visible = items.slice(0, 5).map((item) => `${item.label} (${item.runtimeCapabilityMode})`);
  const remaining = items.length - visible.length;
  return remaining > 0 ? `${visible.join(', ')} +${remaining}` : visible.join(', ');
}

function formatCapabilityBlockedFallbacks(items: LiveEditCapabilityDiagnosticItem[]): string {
  const fallbacks = [...new Set(items.flatMap((item) => item.blockedFallbacks))];
  return fallbacks.length > 0 ? `Blocked fallback: ${fallbacks.join(', ')}` : '';
}

function isPreviewControlKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return key === ' ' || key === 'Enter' || key.startsWith('Arrow') || normalized === 'w' || normalized === 'a' || normalized === 's' || normalized === 'd' || normalized === 'r';
}

function isFormControlTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);
}

function isRuntimeMessage(value: unknown): value is { type: string; runId?: unknown; patchId?: unknown; previewInstanceId?: unknown; runtimeTarget?: unknown; message?: unknown; result?: unknown } {
  return typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string';
}

function runtimeMessageMatchesPending(
  data: { runId?: unknown; patchId?: unknown; previewInstanceId?: unknown },
  prepared: PreparedDeterministicPatch | null,
  runId: string,
  previewInstanceId: string | null
): prepared is PreparedDeterministicPatch {
  if (prepared === null) {
    return false;
  }
  return data.runId === runId && data.patchId === prepared.patch_id && data.previewInstanceId === previewInstanceId;
}

function runtimeMessageMatchesPendingSemantic(
  data: { runId?: unknown; patchId?: unknown; previewInstanceId?: unknown },
  pending: PendingSemanticAmendmentRuntimeApply | null
): pending is PendingSemanticAmendmentRuntimeApply {
  if (pending === null || pending.previewState.preparedLiveEdit === undefined) {
    return false;
  }
  return data.runId === pending.runId && data.patchId === pending.previewState.preparedLiveEdit.patch_id && data.previewInstanceId === pending.previewInstanceId;
}

function isRuntimePatchResult(value: unknown): value is RuntimePatchResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<RuntimePatchResult>;
  return (
    (candidate.status === 'applied_hot' || candidate.status === 'applied_warm_restart' || candidate.status === 'failed_runtime_apply' || candidate.status === 'unsupported') &&
    (candidate.applyMode === 'hot' || candidate.applyMode === 'warm_restart' || candidate.applyMode === 'none') &&
    typeof candidate.runtimeTarget === 'string' &&
    Array.isArray(candidate.appliedPaths) &&
    Array.isArray(candidate.warnings) &&
    Array.isArray(candidate.errors)
  );
}
