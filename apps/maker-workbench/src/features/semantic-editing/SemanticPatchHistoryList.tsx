import type { SemanticPatchActionHistoryItem } from './semanticPatchActionState.js';

export type SemanticPatchHistoryListProps = {
  items: SemanticPatchActionHistoryItem[];
};

export function SemanticPatchHistoryList({ items }: SemanticPatchHistoryListProps) {
  if (items.length === 0) {
    return <p className="m-0 text-sm font-bold text-[#69645d]">No semantic patch actions yet.</p>;
  }

  return (
    <ol className="m-0 grid list-none gap-2 p-0">
      {items.map((item) => (
        <li className="rounded-lg border border-[#ead9ba] bg-[#fffaf0] p-3 text-xs font-bold text-[#69645d] [overflow-wrap:anywhere]" key={item.id}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#d0b993] bg-[#fff7e8] px-2 py-0.5 text-[11px] font-black text-[#8a5b13]">{item.action}</span>
            <span className="font-black text-[#15130f]">{item.status}</span>
            <span>{item.patchId}</span>
            <span>{item.at}</span>
          </div>
          <p className="m-0 mt-1">{item.message}</p>
          {item.traceEventIds.length === 0 ? null : <p className="m-0 mt-1">Trace: {item.traceEventIds.join(', ')}</p>}
        </li>
      ))}
    </ol>
  );
}
