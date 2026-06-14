import { useEffect, useState } from 'react';

import { API_BASE, type PreparePromptOptimizationResponse, type PromptOptimizationMode, type PromptOptimizationReport } from './workbench-api.js';
import { buildPromptCoachResultView, getPromptCoachCandidate, preparePromptOptimization, resolvePromptCoachDraftAfterCurrentPromptChange } from './prompt-coach-client.js';

type PromptCoachPanelProps = {
  projectId: string;
  runId: string;
  currentPrompt: string;
  onUseOptimizedPrompt: (prompt: string) => void;
};

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

export function PromptCoachPanel({ projectId, runId, currentPrompt, onUseOptimizedPrompt }: PromptCoachPanelProps) {
  const [draft, setDraft] = useState({ draft: currentPrompt, dirty: false });
  const [mode, setMode] = useState<PromptOptimizationMode>('mock');
  const [prepared, setPrepared] = useState<PreparePromptOptimizationResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const prompt = draft.draft;

  useEffect(() => {
    setDraft((previous) => resolvePromptCoachDraftAfterCurrentPromptChange({ draft: previous.draft, nextCurrentPrompt: currentPrompt, dirty: previous.dirty }));
  }, [currentPrompt]);

  async function prepare() {
    setStatus('loading');
    setMessage(null);
    setPrepared(null);

    try {
      const response = await preparePromptOptimization({ apiBase: API_BASE, projectId, runId, originalPrompt: prompt, mode });
      setPrepared(response);
      setStatus('ready');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Prompt Coach prepare failed.');
    }
  }

  async function copyCandidate() {
    if (prepared === null) {
      return;
    }
    await navigator.clipboard?.writeText(getPromptCoachCandidate(prepared.report));
    setMessage('Optimized prompt copied.');
  }

  return (
    <article className={`${panelClass} min-h-64`}>
      <div className={panelHeadingClass}>
        <div>
          <p className={eyebrowClass}>Prompt Coach</p>
          <h2 className={headingClass}>Optimization candidate</h2>
        </div>
        <span className="rounded-full border border-[#d0b993] bg-[#ece1ce] px-2.5 py-1 text-[11px] font-black text-[#69645d]">{mode}</span>
      </div>

      <label className="mb-3 grid gap-2 text-sm font-bold text-[#69645d]">
        Original prompt
        <textarea className={`${fieldClass} min-h-24 resize-y`} value={prompt} onChange={(event) => setDraft({ draft: event.target.value, dirty: true })} rows={4} />
      </label>

      <div className="mb-3 grid grid-cols-[1fr_auto] items-end gap-3 max-sm:grid-cols-1">
        <label className="grid gap-2 text-sm font-bold text-[#69645d]">
          Mode
          <select className={fieldClass} value={mode} onChange={(event) => setMode(event.target.value as PromptOptimizationMode)}>
            <option value="mock">mock</option>
            <option value="llm">llm</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button className={secondaryButtonClass} type="button" onClick={() => setDraft({ draft: currentPrompt, dirty: false })}>
            Use game brief
          </button>
          <button className={primaryButtonClass} type="button" onClick={() => void prepare()} disabled={!projectId || status === 'loading'}>
            {status === 'loading' ? 'Preparing' : 'Prepare'}
          </button>
        </div>
      </div>

      {status === 'error' && message ? <div className="mb-3 rounded-lg border border-[#f09a8f] bg-[#ffe2dc] px-3 py-2 text-sm font-extrabold text-[#c93d35]">{message}</div> : null}
      {message && status !== 'error' ? <div className="mb-3 rounded-lg border border-[#d0b993] bg-[#fff7e8] px-3 py-2 text-sm font-bold text-[#69645d]">{message}</div> : null}

      {prepared ? (
        <PromptCoachResultView
          artifacts={prepared.artifacts}
          report={prepared.report}
          onCopy={() => void copyCandidate()}
          onUse={() => onUseOptimizedPrompt(getPromptCoachCandidate(prepared.report))}
        />
      ) : null}
      {status === 'idle' ? <p className="m-0 text-sm leading-snug text-[#69645d]">Prepare a candidate before generating. Nothing is applied automatically.</p> : null}
    </article>
  );
}

export function PromptCoachResultView({
  report,
  artifacts,
  onCopy,
  onUse
}: {
  report: PromptOptimizationReport;
  artifacts: PreparePromptOptimizationResponse['artifacts'];
  onCopy: () => void;
  onUse: () => void;
}) {
  const view = buildPromptCoachResultView({ report, artifacts });
  return (
    <div className="grid gap-3">
      <div className="rounded-lg border border-[#ead9ba] bg-[#fffaf0] p-3">
        <div className="mb-1 text-[11px] font-black uppercase text-[#6f6558]">Candidate</div>
        <p className="m-0 whitespace-pre-wrap text-sm font-bold leading-snug text-[#15130f] [overflow-wrap:anywhere]">{view.candidate}</p>
      </div>
      <div className="grid gap-1 text-xs font-bold text-[#69645d]">
        <span>{`Mode: ${view.mode} · Strategy: ${view.strategy} · DSL: ${view.supportedDslVersion}`}</span>
        <span>{`Original: ${view.originalPrompt}`}</span>
        <span>{`Intent: ${view.intentSummary}`}</span>
      </div>
      <ResultList title="DSL warnings" items={view.dslFitWarnings} />
      <ResultList title="Unsupported requests" items={view.unsupportedRequests} />
      <ResultList title="Suggested questions" items={view.suggestedQuestions} />
      <ResultList title="Artifact refs" items={view.artifacts.map((artifact) => `${artifact.id}:${artifact.path}:${artifact.format}`)} />
      <div className="flex flex-wrap gap-2">
        <button className={secondaryButtonClass} type="button" onClick={onCopy}>
          Copy optimized prompt
        </button>
        <button className={primaryButtonClass} type="button" onClick={onUse}>
          Use optimized prompt
        </button>
      </div>
    </div>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-black uppercase text-[#6f6558]">{title}</div>
      <ul className="m-0 grid list-none gap-1 p-0">
        {items.length ? (
          items.map((item) => (
            <li className="rounded-lg border border-[#ead9ba] bg-[#fffef9] px-2.5 py-1.5 text-xs font-bold text-[#69645d] [overflow-wrap:anywhere]" key={item}>
              {item}
            </li>
          ))
        ) : (
          <li className="text-xs font-bold text-[#69645d]">none</li>
        )}
      </ul>
    </div>
  );
}
