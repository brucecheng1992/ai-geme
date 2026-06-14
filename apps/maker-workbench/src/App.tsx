import { useEffect, useMemo, useRef, useState } from 'react';

import { AssetStatusPanel } from './AssetStatusPanel.js';
import { QaStatusPanel } from './QaStatusPanel.js';
import { buildEditableFields, buildLiveObjectTree, buildReplacePrepareBody, buildRuntimeApplyReportFromPatchResult, type LiveEditableField } from './live-edit-client.js';
import './styles.css';
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
  const [language, setLanguage] = useState('zh');
  const [projectId, setProjectId] = useState('');
  const [runId, setRunId] = useState('');
  const [data, setData] = useState<DashboardData>({ events: [] });
  const [error, setError] = useState<string | null>(null);
  const [liveEditStatus, setLiveEditStatus] = useState('Runtime not connected');
  const [liveCurrent, setLiveCurrent] = useState<LiveCurrentResponse | undefined>(undefined);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [pendingPatchId, setPendingPatchId] = useState<string | null>(null);
  const [selectedObjectPath, setSelectedObjectPath] = useState('/player');
  const [previewInstanceId, setPreviewInstanceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const previewHostRef = useRef<HTMLDivElement | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const pendingPatchRef = useRef<PreparedDeterministicPatch | null>(null);

  const previewUrl = useMemo(() => {
    if (data.project?.project.preview_url) {
      return data.project.project.preview_url;
    }
    return projectId ? `${API_BASE}/preview/${projectId}/index.html` : '';
  }, [data.project?.project.preview_url, projectId]);
  const observedCounts = useMemo(() => countEvents(data.qaReport?.observed_events ?? []), [data.qaReport?.observed_events]);
  const previewBlankScreen = data.qaReport?.code === 'PREVIEW_BLANK_SCREEN';
  const displayStatus = resolveWorkbenchDisplayStatus(data.project?.project.status, data.qaReport);
  const latestRun = data.project?.latest_run;
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
    if (!previewUrl || previewBlankScreen) {
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
  }, [previewUrl, previewBlankScreen]);

  useEffect(() => {
    setRuntimeReady(false);
    setPendingPatchId(null);
    setPreviewInstanceId(null);
    pendingPatchRef.current = null;
    setLiveEditStatus(previewUrl && !previewBlankScreen ? 'Waiting for runtime' : 'Runtime not connected');
  }, [previewUrl, previewBlankScreen]);

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
        previewFrameRef.current?.contentWindow?.postMessage({ type: 'AIGAME_GET_CAPABILITIES', runId, previewInstanceId: data.previewInstanceId }, '*');
        return;
      }

      if (data.type === 'AIGAME_RUNTIME_ERROR') {
        const prepared = pendingPatchRef.current;
        if (!runtimeMessageMatchesPending(data, prepared, runId, previewInstanceId)) {
          return;
        }
        const message = typeof data.message === 'string' ? data.message : 'Runtime bridge error.';
        setLiveEditStatus(`Runtime error: ${message}`);
        if (prepared !== null) {
          void recordRuntimePatchResult(prepared, {
            status: 'failed_runtime_apply',
            applyMode: 'none',
            runtimeTarget: 'phaser:top_down_shooter',
            appliedPaths: [],
            warnings: [],
            errors: [{ code: 'AIGAME_RUNTIME_ERROR', path: 'runtime', message }]
          });
        }
        return;
      }

      if (data.type !== 'AIGAME_PATCH_RESULT' || !isRuntimePatchResult(data.result)) {
        return;
      }

      const prepared = pendingPatchRef.current;
      if (!runtimeMessageMatchesPending(data, prepared, runId, previewInstanceId)) {
        return;
      }
      void recordRuntimePatchResult(prepared, data.result);
    };

    window.addEventListener('message', handleRuntimeMessage);
    return () => window.removeEventListener('message', handleRuntimeMessage);
  }, [projectId, runId, previewInstanceId]);

  async function generateProject() {
    await runAction(async () => {
      const created = await requestJson<{ ok: true; project_id: string; run_id: string }>(`${API_BASE}/api/projects/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, language })
      });
      setProjectId(created.project_id);
      setRunId(created.run_id);
      await loadProject(created.project_id, created.run_id);
    });
  }

  async function loadProject(selectedProjectId = projectId, selectedRunId = runId, options: { silent?: boolean } = {}) {
    await runAction(async () => {
      const project = await requestJson<ProjectStatus>(`${API_BASE}/api/projects/${selectedProjectId}`);
      const events = await requestJson<RunEvents>(`${API_BASE}/api/projects/${selectedProjectId}/runs/${selectedRunId}/events`);
      const status = project.latest_run.status;
      const [qaReport, repairReport, buildLog, artAssetPreview, live] = await Promise.all([
        shouldLoadQaReport(status) ? optionalJson<{ qa_report: QaReport }>(`${API_BASE}/api/projects/${selectedProjectId}/runs/${selectedRunId}/qa-report`) : undefined,
        shouldLoadRepairReport(status)
          ? optionalJson<{ repair_report: RepairReport }>(`${API_BASE}/api/projects/${selectedProjectId}/runs/${selectedRunId}/repair-report`)
          : undefined,
        shouldLoadBuildLog(status) ? optionalJson<{ build_log: string }>(`${API_BASE}/api/projects/${selectedProjectId}/runs/${selectedRunId}/build-log`) : undefined,
        optionalJson<{ preview: ArtAssetWorkbenchPreview }>(`${API_BASE}/api/art-assets/preview/small-library`),
        optionalJson<LiveCurrentResponse>(`${API_BASE}/api/projects/${selectedProjectId}/runs/${selectedRunId}/live/current`)
      ]);

      setData({
        project,
        events: events.events,
        qaReport: qaReport?.qa_report,
        repairReport: repairReport?.repair_report,
        buildLog: buildLog?.build_log,
        artAssetPreview: artAssetPreview?.preview
      });
      setLiveCurrent(live);
    }, options);
  }

  async function applyLiveField(field: LiveEditableField, nextValue: number) {
    await runAction(async () => {
      if (pendingPatchRef.current !== null) {
        throw new Error('A live edit patch is already waiting for runtime confirmation.');
      }
      if (!runtimeReady || previewInstanceId === null) {
        throw new Error('Preview runtime is not ready for live edit.');
      }
      setLiveEditStatus(`Preparing ${field.path}`);
      const prepared = await requestJson<PreparedDeterministicPatch>(`${API_BASE}/api/projects/${projectId}/runs/${runId}/live-edits/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildReplacePrepareBody(field.path, nextValue))
      });
      setLiveEditStatus(`Plan: ${prepared.status}`);

      if (prepared.validation_report?.status === 'invalid') {
        return;
      }
      if (prepared.apply_mode !== 'hot' || prepared.runtime_patch === undefined) {
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
    });
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
      setError(applyError instanceof Error ? applyError.message : 'Runtime apply recording failed.');
    } finally {
      pendingPatchRef.current = null;
      setPendingPatchId(null);
    }
  }

  async function runAction(action: () => Promise<void>, options: { silent?: boolean } = {}) {
    if (!options.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      await action();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Request failed.');
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }

  function focusPreviewFrame() {
    previewHostRef.current?.focus();
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

      <section className="grid grid-cols-[320px_minmax(0,1fr)] gap-5 p-5 max-lg:grid-cols-1 max-sm:p-3">
        <aside className="sticky top-24 flex flex-col gap-4 self-start max-lg:static">
          <section className={`${panelClass} border-[#312b22] bg-gradient-to-b from-white to-[#fff1d6] shadow-[6px_6px_0_rgba(21,19,15,0.08)]`}>
            <div className={panelHeadingClass}>
              <div>
                <p className={eyebrowClass}>Create</p>
                <h2 className={headingClass}>Game brief</h2>
              </div>
            </div>
            <label className="mb-3 grid gap-2 text-sm font-bold text-[#69645d]">
              Idea
              <textarea className={`${fieldClass} min-h-24 resize-y`} value={idea} onChange={(event) => setIdea(event.target.value)} rows={4} />
            </label>
            <div className="grid grid-cols-[1fr_auto] items-end gap-3 max-sm:grid-cols-1">
              <label className="mb-0 grid gap-2 text-sm font-bold text-[#69645d]">
                Language
                <select className={fieldClass} value={language} onChange={(event) => setLanguage(event.target.value)}>
                  <option value="zh">zh</option>
                  <option value="en">en</option>
                </select>
              </label>
              <button className={primaryButtonClass} type="button" onClick={() => void generateProject()} disabled={loading}>
                {loading ? 'Working' : 'Generate'}
              </button>
            </div>
          </section>

          <section className={panelClass}>
            <div className={panelHeadingClass}>
              <div>
                <p className={eyebrowClass}>Run</p>
                <h2 className={headingClass}>Session</h2>
              </div>
            </div>
            <label className="mb-3 grid gap-2 text-sm font-bold text-[#69645d]">
              Project ID
              <input className={fieldClass} value={projectId} onChange={(event) => setProjectId(event.target.value)} />
            </label>
            <label className="mb-0 grid gap-2 text-sm font-bold text-[#69645d]">
              Run ID
              <input className={fieldClass} value={runId} onChange={(event) => setRunId(event.target.value)} />
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
        </aside>

        <section className="flex min-w-0 flex-col gap-4">
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
                <span className="rounded-full border border-[#314e66] px-3 py-1.5 text-xs font-extrabold text-[#c6d7e6]">
                  {observedCounts.length} telemetry signals
                </span>
                <span className="max-w-[260px] rounded-full border border-[#314e66] px-3 py-1.5 text-xs font-extrabold text-[#c6d7e6] [overflow-wrap:anywhere]">
                  {pendingPatchId ?? liveEditStatus}
                </span>
              </div>
            </div>
            {previewBlankScreen ? (
              <div className="flex h-[clamp(360px,50vh,560px)] flex-col items-center justify-center gap-2 bg-[#2d1114] p-6 text-center text-[#ffd8ce]">
                <strong>PREVIEW_BLANK_SCREEN</strong>
                <span className="max-w-xl text-[#ffc1b5]">Visual QA failed: the preview returned a blank rendered frame, so this run is not PLAYABLE.</span>
              </div>
            ) : previewUrl ? (
              <div
                className="h-[clamp(360px,50vh,560px)] w-full outline-none focus-visible:ring-4 focus-visible:ring-[#ffb13b]"
                ref={previewHostRef}
                tabIndex={0}
              >
                <iframe className="h-full w-full border-0" title="Game preview" src={previewUrl} sandbox="allow-scripts" ref={previewFrameRef} onLoad={focusPreviewFrame} />
              </div>
            ) : (
              <div className="flex h-[clamp(360px,50vh,560px)] items-center justify-center text-[#b8cadd]">No preview</div>
            )}
          </section>

          <section className="grid grid-cols-[minmax(260px,0.95fr)_minmax(320px,1.05fr)] gap-4 max-lg:grid-cols-1">
            <QaStatusPanel report={data.qaReport} />

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
                        defaultValue={field.value ?? 0}
                        disabled={!field.enabled || pendingPatchId !== null || !runtimeReady || previewInstanceId === null}
                        key={`${liveCurrent?.current_version.versionId ?? 'none'}:${field.path}`}
                        step="0.1"
                        type="number"
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            void applyLiveField(field, Number((event.currentTarget as HTMLInputElement).value));
                          }
                        }}
                      />
                      <button
                        className={secondaryButtonClass}
                        disabled={!field.enabled || !runtimeReady || previewInstanceId === null || pendingPatchId !== null}
                        type="button"
                        onClick={(event) => {
                          const input = event.currentTarget.parentElement?.querySelector('input');
                          void applyLiveField(field, Number(input?.value ?? field.value ?? 0));
                        }}
                      >
                        Apply
                      </button>
                    </label>
                  ))}
                  {liveEditableFields.length === 0 ? <span className="text-sm font-bold text-[#69645d]">Select player, enemy, or projectile</span> : null}
                </div>
              </div>
              <div className="mt-3 grid gap-1 border-t border-[#ead9ba] pt-3 text-xs font-bold text-[#69645d]">
                <span>{`Runtime: ${runtimeReady ? 'ready' : 'waiting'} · ${liveEditStatus}`}</span>
                <span>{`History: ${liveCurrent?.patch_history.map((item) => `${item.patchId}:${item.status}:${item.ops?.map((op) => op.path).join('|') ?? ''}`).join(', ') || 'none'}`}</span>
                <span>{`Audit: ${liveCurrent?.edit_audit_log.map((item) => `${item.patchId}:${item.status}:${item.applyMode}${item.errors?.length ? `:${item.errors.map((issue) => issue.code).join('|')}` : ''}`).join(', ') || 'none'}`}</span>
              </div>
            </article>

            <AssetStatusPanel report={data.qaReport?.asset_report} preview={data.artAssetPreview} />

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
                    {`${event.type}: ${event.message}`}
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
              {data.buildLog ?? 'No build log'}
            </pre>
          </section>
        </section>
      </section>
    </main>
  );
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

function isRuntimePatchResult(value: unknown): value is RuntimePatchResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<RuntimePatchResult>;
  return (
    (candidate.status === 'applied_hot' || candidate.status === 'failed_runtime_apply' || candidate.status === 'unsupported') &&
    (candidate.applyMode === 'hot' || candidate.applyMode === 'none') &&
    typeof candidate.runtimeTarget === 'string' &&
    Array.isArray(candidate.appliedPaths) &&
    Array.isArray(candidate.warnings) &&
    Array.isArray(candidate.errors)
  );
}
