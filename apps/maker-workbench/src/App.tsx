import { useEffect, useMemo, useState } from 'react';

import { AssetStatusPanel } from './AssetStatusPanel.js';
import './styles.css';
import {
  API_BASE,
  countEvents,
  fallbackSteps,
  optionalJson,
  requestJson,
  shouldLoadBuildLog,
  shouldLoadQaReport,
  shouldLoadRepairReport,
  type DashboardData,
  type ProjectStatus,
  type QaReport,
  type RepairReport,
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
  if (['PLAYABLE', 'PASSED', 'DONE'].includes(status)) {
    return 'bg-[#208a4d]';
  }

  if (['QA_FAILED', 'BUILD_FAILED', 'PREVIEW_ARTIFACT_MISSING', 'DSL_VALIDATION_FAILED', 'FAILED', 'VISUAL_QA_FAILED'].includes(status)) {
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
  const [loading, setLoading] = useState(false);

  const previewUrl = useMemo(() => {
    if (data.project?.project.preview_url) {
      return data.project.project.preview_url;
    }
    return projectId ? `${API_BASE}/preview/${projectId}/index.html` : '';
  }, [data.project?.project.preview_url, projectId]);
  const observedCounts = useMemo(() => countEvents(data.qaReport?.observed_events ?? []), [data.qaReport?.observed_events]);
  const previewBlankScreen = data.qaReport?.code === 'PREVIEW_BLANK_SCREEN';
  const displayStatus = data.qaReport?.visual_status === 'VISUAL_QA_FAILED' ? 'VISUAL_QA_FAILED' : (data.project?.project.status ?? 'LOCAL');
  const latestRun = data.project?.latest_run;
  const timelineSteps = latestRun?.steps.length ? latestRun.steps : fallbackSteps(latestRun?.status);
  const qaMissingLabel = (data.qaReport?.missing_events ?? []).join(', ') || 'none';
  const repairMessage = data.repairReport?.message ?? data.repairReport?.attempts?.[0]?.reason ?? 'none';
  const isTerminal = useMemo(() => {
    const status = latestRun?.status;
    return status === undefined || ['PLAYABLE', 'QA_FAILED', 'BUILD_FAILED', 'PREVIEW_ARTIFACT_MISSING', 'DSL_VALIDATION_FAILED', 'FAILED'].includes(status);
  }, [latestRun?.status]);

  useEffect(() => {
    if (!projectId || !runId || isTerminal) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      void loadProject(projectId, runId, { silent: true });
    }, 1500);

    return () => window.clearInterval(timer);
  }, [projectId, runId, isTerminal]);

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
      const [qaReport, repairReport, buildLog] = await Promise.all([
        shouldLoadQaReport(status) ? optionalJson<{ qa_report: QaReport }>(`${API_BASE}/api/projects/${selectedProjectId}/runs/${selectedRunId}/qa-report`) : undefined,
        shouldLoadRepairReport(status)
          ? optionalJson<{ repair_report: RepairReport }>(`${API_BASE}/api/projects/${selectedProjectId}/runs/${selectedRunId}/repair-report`)
          : undefined,
        shouldLoadBuildLog(status) ? optionalJson<{ build_log: string }>(`${API_BASE}/api/projects/${selectedProjectId}/runs/${selectedRunId}/build-log`) : undefined
      ]);

      setData({
        project,
        events: events.events,
        qaReport: qaReport?.qa_report,
        repairReport: repairReport?.repair_report,
        buildLog: buildLog?.build_log
      });
    }, options);
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
              <span className="shrink-0 rounded-full border border-[#314e66] px-3 py-1.5 text-xs font-extrabold text-[#c6d7e6]">
                {observedCounts.length} telemetry signals
              </span>
            </div>
            {previewBlankScreen ? (
              <div className="flex h-[clamp(360px,50vh,560px)] flex-col items-center justify-center gap-2 bg-[#2d1114] p-6 text-center text-[#ffd8ce]">
                <strong>PREVIEW_BLANK_SCREEN</strong>
                <span className="max-w-xl text-[#ffc1b5]">Visual QA failed: the preview returned a blank rendered frame, so this run is not PLAYABLE.</span>
              </div>
            ) : previewUrl ? (
              <iframe className="h-[clamp(360px,50vh,560px)] w-full border-0" title="Game preview" src={previewUrl} sandbox="allow-scripts" />
            ) : (
              <div className="flex h-[clamp(360px,50vh,560px)] items-center justify-center text-[#b8cadd]">No preview</div>
            )}
          </section>

          <section className="grid grid-cols-[minmax(260px,0.95fr)_minmax(320px,1.05fr)] gap-4 max-lg:grid-cols-1">
            <article className={panelClass}>
              <div className={panelHeadingClass}>
                <div>
                  <p className={eyebrowClass}>Quality</p>
                  <h2 className={headingClass}>QA</h2>
                </div>
              </div>
              <div className="mb-2 text-4xl font-black leading-none text-[#15130f]">{data.qaReport?.status ?? 'No report'}</div>
              <p className="m-0 mb-1 text-sm leading-snug text-[#69645d]">{data.qaReport?.code ?? 'No failure code'}</p>
              <p className="m-0 text-sm leading-snug text-[#69645d]">Missing: {qaMissingLabel}</p>
            </article>

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

            <AssetStatusPanel report={data.qaReport?.asset_report} />

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
