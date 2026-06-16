import { useEffect, useRef, useState, type MutableRefObject } from 'react';

import {
  runLiveSemanticEdit,
  type LiveSemanticEditResult,
  type SemanticIndex
} from '@ai-game-maker/game-dsl';

import { ResolverV2DiagnosticsPanel } from '../resolver-v2/index.js';
import { SemanticPatchDiffPanel } from '../semantic-editing/index.js';

export type LiveSemanticEditPanelProps = {
  document: unknown;
  semanticIndex: SemanticIndex;
  onDocumentChange?: (document: unknown, result: LiveSemanticEditResult) => void;
  onResult?: (result: LiveSemanticEditResult) => void;
  defaultSceneTarget?: `scene:${string}`;
  defaultEntityId?: `entity:${string}`;
  enabled?: boolean;
  autoApply?: boolean;
  debounceMs?: number;
  title?: string;
};

const panelClass = 'rounded-lg border border-[#d8c7a6] bg-[#fffef9] p-4 shadow-[0_1px_0_rgba(49,43,34,0.08)]';
const eyebrowClass = 'm-0 text-[11px] font-extrabold uppercase text-[#6f6558]';
const headingClass = 'm-0 text-[15px] font-extrabold leading-tight text-[#15130f]';
const sectionHeadingClass = 'm-0 text-[12px] font-black uppercase text-[#6f6558]';
const fieldClass =
  'min-h-24 min-w-0 resize-y rounded-lg border border-[#bba98c] bg-[#fffefa] px-3 py-2.5 text-sm text-[#15130f] outline-none transition focus:border-[#f3763d] focus:shadow-[0_0_0_3px_rgba(255,177,59,0.28)]';
const buttonClass =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-[#15130f] bg-[#15130f] px-4 text-sm font-extrabold text-[#fffaf0] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#2b261d] hover:shadow-[4px_4px_0_#ffb13b] disabled:translate-x-0 disabled:translate-y-0 disabled:border-[#978f82] disabled:bg-[#978f82] disabled:shadow-none';

export function LiveSemanticEditPanel({
  document,
  semanticIndex,
  onDocumentChange,
  onResult,
  defaultSceneTarget = 'scene:main',
  defaultEntityId = 'entity:player',
  enabled = true,
  autoApply = true,
  debounceMs = 400,
  title = 'Live Semantic Edit'
}: LiveSemanticEditPanelProps) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<LiveSemanticEditResult | null>(null);
  const lastAppliedTextRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || !autoApply) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      runPanelEdit({
        text,
        document,
        semanticIndex,
        defaultSceneTarget,
        defaultEntityId,
        lastAppliedTextRef,
        setResult,
        onResult,
        onDocumentChange
      });
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [
    autoApply,
    debounceMs,
    defaultEntityId,
    defaultSceneTarget,
    document,
    enabled,
    onDocumentChange,
    onResult,
    semanticIndex,
    text
  ]);

  return (
    <article className={`${panelClass} grid gap-4`} aria-label={title}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className={eyebrowClass}>Semantic Editing</p>
          <h2 className={headingClass}>{title}</h2>
        </div>
        <span className={statusClass(result?.ok === true ? 'ok' : result?.stage ?? (enabled ? 'idle' : 'disabled'))}>
          {enabled ? result?.stage ?? 'idle' : 'disabled'}
        </span>
      </header>

      <label className="grid gap-2">
        <span className={sectionHeadingClass}>Command</span>
        <textarea
          className={fieldClass}
          disabled={!enabled}
          onChange={(event) => setText(event.target.value)}
          value={text}
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          className={buttonClass}
          disabled={!enabled}
          onClick={() =>
            runPanelEdit({
              text,
              document,
              semanticIndex,
              defaultSceneTarget,
              defaultEntityId,
              lastAppliedTextRef,
              setResult,
              onResult,
              onDocumentChange
            })
          }
          type="button"
        >
          Run
        </button>
        <span className="text-xs font-bold text-[#69645d]">{autoApply ? 'debounced' : 'manual'}</span>
      </div>

      {result === null ? null : (
        <section className="grid gap-3" aria-labelledby="live-semantic-edit-status">
          <h3 className={sectionHeadingClass} id="live-semantic-edit-status">
            Status
          </h3>
          <div className="grid gap-2 md:grid-cols-5">
            {renderStageStatus('Parse', result.parse.ok ? 'ok' : 'failed')}
            {renderStageStatus('Plan', result.plan === undefined ? 'pending' : result.plan.ok ? 'ok' : 'failed')}
            {renderStageStatus('Validation', result.validation === undefined ? 'pending' : result.validation.ok ? 'ok' : 'failed')}
            {renderStageStatus('Apply', result.apply === undefined ? 'pending' : result.apply.ok ? 'ok' : 'failed')}
            {renderStageStatus('Resolver', result.irGate?.status ?? 'pending')}
          </div>
          {result.error === undefined ? null : (
            <p className="m-0 rounded-lg border border-[#f2a39b] bg-[#ffe2dc] p-3 text-xs font-bold text-[#c93d35] [overflow-wrap:anywhere]">
              {result.error.code}: {result.error.message}
            </p>
          )}
          {renderWarnings(result.warnings)}
        </section>
      )}

      {result?.diff === undefined ? null : (
        <SemanticPatchDiffPanel compact title="Live Edit Patch Diff" viewModel={result.diff} />
      )}
      {result?.diagnostics === undefined ? null : (
        <ResolverV2DiagnosticsPanel compact title="Live Edit Resolver Diagnostics" viewModel={result.diagnostics} />
      )}
    </article>
  );
}

function runPanelEdit(input: {
  text: string;
  document: unknown;
  semanticIndex: SemanticIndex;
  defaultSceneTarget: `scene:${string}`;
  defaultEntityId: `entity:${string}`;
  lastAppliedTextRef: MutableRefObject<string>;
  setResult: (result: LiveSemanticEditResult) => void;
  onResult?: (result: LiveSemanticEditResult) => void;
  onDocumentChange?: (document: unknown, result: LiveSemanticEditResult) => void;
}): void {
  const normalizedText = input.text.trim();
  if (normalizedText === input.lastAppliedTextRef.current) {
    return;
  }

  input.lastAppliedTextRef.current = normalizedText;
  const result = runLiveSemanticEdit({
    text: input.text,
    document: input.document,
    semanticIndex: input.semanticIndex,
    defaultSceneTarget: input.defaultSceneTarget,
    defaultEntityId: input.defaultEntityId
  });
  input.setResult(result);
  input.onResult?.(result);

  if (result.ok && result.stage === 'applied' && result.document !== undefined) {
    input.onDocumentChange?.(result.document, result);
  }
}

function renderStageStatus(label: string, status: string) {
  return (
    <div className="min-w-0 rounded-lg border border-[#ead9ba] bg-[#fffaf0] p-3" key={label}>
      <div className="text-[11px] font-black uppercase text-[#6f6558]">{label}</div>
      <div className="mt-1">
        <span className={statusClass(status)}>{status}</span>
      </div>
    </div>
  );
}

function renderWarnings(warnings: string[]) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {warnings.map((warning, index) => (
        <li className="rounded-lg border border-[#f2ca83] bg-[#fff1d6] p-3 text-xs font-bold text-[#8a5b13] [overflow-wrap:anywhere]" key={`${warning}:${index}`}>
          {warning}
        </li>
      ))}
    </ul>
  );
}

function statusClass(status: string): string {
  if (status === 'ok' || status === 'ready' || status === 'applied') {
    return 'rounded-full border border-[#91d49b] bg-[#dff3df] px-2 py-0.5 text-xs font-black text-[#208a4d]';
  }

  if (status === 'failed' || status === 'blocked' || status.endsWith('_failed')) {
    return 'rounded-full border border-[#f2a39b] bg-[#ffe2dc] px-2 py-0.5 text-xs font-black text-[#c93d35]';
  }

  return 'rounded-full border border-[#f2ca83] bg-[#fff1d6] px-2 py-0.5 text-xs font-black text-[#8a5b13]';
}
