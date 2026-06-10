import { useEffect, useMemo, useState } from 'react';

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
  const isTerminal = useMemo(() => {
    const status = data.project?.latest_run.status;
    return status === undefined || ['PLAYABLE', 'QA_FAILED', 'BUILD_FAILED', 'PREVIEW_ARTIFACT_MISSING', 'DSL_VALIDATION_FAILED', 'FAILED'].includes(status);
  }, [data.project?.latest_run.status]);

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
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>AI Game Maker Workbench</h1>
          <span>{displayStatus}</span>
        </div>
        <button type="button" onClick={() => void loadProject()} disabled={loading || !projectId || !runId}>
          Refresh
        </button>
      </header>

      <section className="layout">
        <aside className="left-pane">
          <section className="panel">
            <label>
              Idea
              <textarea value={idea} onChange={(event) => setIdea(event.target.value)} rows={4} />
            </label>
            <div className="split">
              <label>
                Language
                <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                  <option value="zh">zh</option>
                  <option value="en">en</option>
                </select>
              </label>
              <button type="button" onClick={() => void generateProject()} disabled={loading}>
                Generate
              </button>
            </div>
          </section>

          <section className="panel">
            <label>
              Project ID
              <input value={projectId} onChange={(event) => setProjectId(event.target.value)} />
            </label>
            <label>
              Run ID
              <input value={runId} onChange={(event) => setRunId(event.target.value)} />
            </label>
          </section>

          <section className="panel">
            <h2>Timeline</h2>
            <ol className="timeline">
              {(data.project?.latest_run.steps.length ? data.project.latest_run.steps : fallbackSteps(data.project?.latest_run.status)).map((step) => (
                <li key={step.name}>
                  <span data-status={step.status}>{step.status}</span>
                  {step.name}
                </li>
              ))}
            </ol>
          </section>
        </aside>

        <section className="right-pane">
          {error ? <div className="error">{error}</div> : null}

          <section className="preview">
            {previewBlankScreen ? (
              <div className="preview-error">
                <strong>PREVIEW_BLANK_SCREEN</strong>
                <span>Visual QA failed: the preview returned a blank rendered frame, so this run is not PLAYABLE.</span>
              </div>
            ) : previewUrl ? (
              <iframe title="Game preview" src={previewUrl} sandbox="allow-scripts" />
            ) : (
              <div className="empty">No preview</div>
            )}
          </section>

          <section className="grid">
            <article className="panel">
              <h2>QA</h2>
              <div className="metric">{data.qaReport?.status ?? 'No report'}</div>
              <p>{data.qaReport?.code ?? 'No failure code'}</p>
              <p>Missing: {(data.qaReport?.missing_events ?? []).join(', ') || 'none'}</p>
            </article>

            <article className="panel">
              <h2>Telemetry</h2>
              <div className="chips">
                {observedCounts.map(([event, count]) => (
                  <span key={event}>{`${event} ${count}`}</span>
                ))}
              </div>
            </article>

            <article className="panel">
              <h2>Repair</h2>
              <div className="metric">{data.repairReport?.status ?? 'No report'}</div>
              <p>{data.repairReport?.message ?? data.repairReport?.attempts?.[0]?.reason ?? 'none'}</p>
            </article>

            <article className="panel">
              <h2>Events</h2>
              <ul className="events">
                {data.events.map((event) => (
                  <li key={`${event.timestamp}-${event.type}`}>{`${event.type}: ${event.message}`}</li>
                ))}
              </ul>
            </article>
          </section>

          <section className="panel log">
            <h2>Build Log</h2>
            <pre>{data.buildLog ?? 'No build log'}</pre>
          </section>
        </section>
      </section>
    </main>
  );
}
