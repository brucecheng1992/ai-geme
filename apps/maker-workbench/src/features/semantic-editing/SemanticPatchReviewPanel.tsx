import { SemanticPatchActionBar } from './SemanticPatchActionBar.js';
import { SemanticPatchDiffPanel } from './SemanticPatchDiffPanel.js';
import { SemanticPatchHistoryList } from './SemanticPatchHistoryList.js';
import { SemanticPatchStatusBadge } from './SemanticPatchStatusBadge.js';
import type { SemanticPatchActionState } from './semanticPatchActionState.js';

export type SemanticPatchReviewPanelProps = {
  state: SemanticPatchActionState;
  canAccept: boolean;
  canReject: boolean;
  canUndo: boolean;
  loading?: boolean;
  qaStatus?: string;
  onAccept: () => void;
  onReject: () => void;
  onUndo: () => void;
};

const panelClass = 'rounded-lg border border-[#d8c7a6] bg-[#fffef9] p-4 shadow-[0_1px_0_rgba(49,43,34,0.08)]';
const eyebrowClass = 'm-0 text-[11px] font-extrabold uppercase text-[#6f6558]';
const headingClass = 'm-0 text-[15px] font-extrabold leading-tight text-[#15130f]';
const sectionHeadingClass = 'm-0 text-[12px] font-black uppercase text-[#6f6558]';

export function SemanticPatchReviewPanel({
  state,
  canAccept,
  canReject,
  canUndo,
  loading = false,
  qaStatus,
  onAccept,
  onReject,
  onUndo
}: SemanticPatchReviewPanelProps) {
  const review = state.review;
  return (
    <article className={`${panelClass} min-h-64`}>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={eyebrowClass}>Semantic Editing</p>
          <h2 className={headingClass}>Patch Review</h2>
        </div>
        <SemanticPatchStatusBadge status={state.status} />
      </header>

      {review === undefined ? (
        <p className="m-0 text-sm font-bold leading-snug text-[#69645d]">Preview a semantic patch to review accept, reject, and undo actions.</p>
      ) : (
        <div className="grid gap-3">
          <dl className="m-0 grid gap-2 md:grid-cols-2">
            {metadata('Patch ID', review.patchId)}
            {metadata('Intent ID', review.intentId)}
            {metadata('Target', review.target)}
            {metadata('Draft Hash', review.draftHash)}
            {metadata('Before Hash', review.beforeHash)}
            {metadata('After Hash', review.afterHash)}
            {metadata('Operations', String(review.operationCount))}
            {metadata('QA', qaStatus ?? 'not available')}
          </dl>

          <SemanticPatchActionBar canAccept={canAccept} canReject={canReject} canUndo={canUndo} loading={loading} onAccept={onAccept} onReject={onReject} onUndo={onUndo} />
          <MessageList title="Errors" tone="error" items={state.errors} />
          <MessageList title="Warnings" tone="warn" items={state.warnings} />
          <SemanticPatchDiffPanel compact title="Semantic Patch Review" viewModel={review.diff} />
        </div>
      )}

      <section className="mt-3 grid gap-2">
        <h3 className={sectionHeadingClass}>Patch History</h3>
        <SemanticPatchHistoryList items={state.history} />
      </section>
    </article>
  );
}

function metadata(label: string, value: string | undefined) {
  return (
    <div className="min-w-0 rounded-lg border border-[#ead9ba] bg-[#fffaf0] p-3" key={label}>
      <dt className="text-[11px] font-black uppercase text-[#6f6558]">{label}</dt>
      <dd className="m-0 mt-1 text-xs font-bold text-[#15130f] [overflow-wrap:anywhere]">{value ?? 'none'}</dd>
    </div>
  );
}

function MessageList({ title, tone, items }: { title: string; tone: 'error' | 'warn'; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  const className =
    tone === 'error'
      ? 'rounded-lg border border-[#f2a39b] bg-[#ffe2dc] p-3 text-xs font-bold text-[#c93d35] [overflow-wrap:anywhere]'
      : 'rounded-lg border border-[#f2ca83] bg-[#fff1d6] p-3 text-xs font-bold text-[#8a5b13] [overflow-wrap:anywhere]';

  return (
    <section className="grid gap-2">
      <h3 className={sectionHeadingClass}>{title}</h3>
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
