import type { SemanticIndex } from '@ai-game-maker/game-dsl';

import { SemanticPatchDiffPanel } from '../semantic-editing/index.js';
import { BriefTextbox } from './BriefTextbox.js';
import { useBriefTextboxDraft } from './useBriefTextboxDraft.js';
import type { BriefTextboxPatchReviewHandoff } from './briefTextboxIntentBridge.js';
import type { BriefTextboxMode } from './briefTextboxSchema.js';

export type BriefTextboxPanelProps = {
  projectId: string;
  runId: string;
  value: string;
  language: string;
  mode: BriefTextboxMode;
  document?: unknown;
  semanticIndex?: SemanticIndex;
  loading?: boolean;
  onTextChange: (text: string) => void;
  onLanguageChange: (language: string) => void;
  onModeChange: (mode: BriefTextboxMode) => void;
  onPreviewHandoff?: (handoff: BriefTextboxPatchReviewHandoff) => void;
};

const panelClass = 'rounded-lg border border-[#d8c7a6] bg-[#fffef9] p-4 shadow-[0_1px_0_rgba(49,43,34,0.08)]';
const panelHeadingClass = 'mb-3 flex items-start justify-between gap-3';
const eyebrowClass = 'm-0 text-[11px] font-extrabold uppercase text-[#6f6558]';
const headingClass = 'm-0 text-[15px] font-extrabold leading-tight text-[#15130f]';
const secondaryButtonClass =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-[#15130f] bg-[#fffef9] px-4 text-sm font-extrabold text-[#15130f] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#fff7e8] hover:shadow-[4px_4px_0_#ffb13b] disabled:translate-x-0 disabled:translate-y-0 disabled:border-[#978f82] disabled:text-[#978f82] disabled:shadow-none';

export function BriefTextboxPanel({
  projectId,
  runId,
  value,
  language,
  mode,
  document,
  semanticIndex,
  loading = false,
  onTextChange,
  onLanguageChange,
  onModeChange,
  onPreviewHandoff
}: BriefTextboxPanelProps) {
  const brief = useBriefTextboxDraft({
    text: value,
    language,
    projectId,
    runId,
    document,
    semanticIndex,
    initialMode: mode
  });

  function previewPatch(): void {
    const result = brief.previewPatch();
    if (result.ok) {
      onPreviewHandoff?.(result.handoff);
    }
  }

  return (
    <section className={`${panelClass} border-[#312b22] bg-gradient-to-b from-white to-[#fff1d6] shadow-[6px_6px_0_rgba(21,19,15,0.08)]`}>
      <div className={panelHeadingClass}>
        <div>
          <p className={eyebrowClass}>Create</p>
          <h2 className={headingClass}>Game brief</h2>
        </div>
        <span className="rounded-full border border-[#d0b993] bg-[#ece1ce] px-2.5 py-1 text-[11px] font-black text-[#69645d]">
          {brief.validation.draftHash}
        </span>
      </div>

      <BriefTextbox
        disabled={loading}
        language={language}
        mode={brief.draft.mode}
        onLanguageChange={onLanguageChange}
        onModeChange={(nextMode) => {
          brief.setMode(nextMode);
          onModeChange(nextMode);
        }}
        onTargetChange={brief.setTarget}
        onTextChange={(text) => {
          brief.setText(text);
          onTextChange(text);
        }}
        status={brief.draft.status}
        target={brief.draft.target ?? ''}
        text={brief.draft.text}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className={secondaryButtonClass} type="button" onClick={previewPatch} disabled={loading || !brief.canPreview}>
          Preview Patch
        </button>
        {brief.previewResult === null ? null : (
          <button className={secondaryButtonClass} type="button" onClick={brief.clearPreview} disabled={loading}>
            Clear Preview
          </button>
        )}
      </div>

      <IssueList title="Validation errors" tone="error" items={brief.validation.errors.map((issue) => `${issue.code}: ${issue.message}`)} />
      <IssueList title="Validation warnings" tone="warn" items={brief.validation.warnings.map((issue) => `${issue.code}: ${issue.message}`)} />

      {brief.previewResult === null ? null : (
        <section className="mt-3 grid gap-3">
          {brief.previewResult.ok ? (
            <div className="rounded-lg border border-[#91d49b] bg-[#dff3df] p-3 text-xs font-bold text-[#208a4d] [overflow-wrap:anywhere]">
              Patch preview ready: {brief.previewResult.handoff.patchId}
            </div>
          ) : (
            <div className="rounded-lg border border-[#f2a39b] bg-[#ffe2dc] p-3 text-xs font-bold text-[#c93d35] [overflow-wrap:anywhere]">
              {brief.previewResult.error.code}: {brief.previewResult.error.message}
            </div>
          )}

          <TraceSummary events={brief.previewResult.traceEvents} />
          {brief.previewResult.result?.diff === undefined ? null : (
            <SemanticPatchDiffPanel compact title="Brief Patch Preview" viewModel={brief.previewResult.result.diff} />
          )}
        </section>
      )}
    </section>
  );
}

function IssueList({ title, tone, items }: { title: string; tone: 'error' | 'warn'; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  const className =
    tone === 'error'
      ? 'rounded-lg border border-[#f2a39b] bg-[#ffe2dc] p-3 text-xs font-bold text-[#c93d35] [overflow-wrap:anywhere]'
      : 'rounded-lg border border-[#f2ca83] bg-[#fff1d6] p-3 text-xs font-bold text-[#8a5b13] [overflow-wrap:anywhere]';

  return (
    <section className="mt-3 grid gap-2">
      <h3 className="m-0 text-[11px] font-black uppercase text-[#6f6558]">{title}</h3>
      <ul className="m-0 grid list-none gap-2 p-0">
        {items.map((item) => (
          <li className={className} key={item}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function TraceSummary({ events }: { events: Array<{ draftHash: string; intentId?: string; patchId?: string; status: string }> }) {
  return (
    <section className="grid gap-2">
      <h3 className="m-0 text-[11px] font-black uppercase text-[#6f6558]">Trace</h3>
      <ul className="m-0 grid list-none gap-2 p-0">
        {events.map((event, index) => (
          <li className="rounded-lg border border-[#ead9ba] bg-[#fffaf0] p-3 text-xs font-bold text-[#69645d] [overflow-wrap:anywhere]" key={`${event.status}:${event.draftHash}:${index}`}>
            {event.status} · Draft: {event.draftHash} · Intent: {event.intentId ?? 'none'} · Patch: {event.patchId ?? 'none'}
          </li>
        ))}
      </ul>
    </section>
  );
}
