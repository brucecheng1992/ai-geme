export type SemanticPatchActionBarProps = {
  canAccept: boolean;
  canReject: boolean;
  canUndo: boolean;
  loading?: boolean;
  onAccept: () => void;
  onReject: () => void;
  onUndo: () => void;
};

const primaryButtonClass =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-[#15130f] bg-[#15130f] px-4 text-sm font-extrabold text-[#fffaf0] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#2b261d] hover:shadow-[4px_4px_0_#ffb13b] disabled:translate-x-0 disabled:translate-y-0 disabled:border-[#978f82] disabled:bg-[#978f82] disabled:shadow-none';
const secondaryButtonClass =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-[#15130f] bg-[#fffef9] px-4 text-sm font-extrabold text-[#15130f] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#fff7e8] hover:shadow-[4px_4px_0_#ffb13b] disabled:translate-x-0 disabled:translate-y-0 disabled:border-[#978f82] disabled:text-[#978f82] disabled:shadow-none';

export function SemanticPatchActionBar({
  canAccept,
  canReject,
  canUndo,
  loading = false,
  onAccept,
  onReject,
  onUndo
}: SemanticPatchActionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className={primaryButtonClass} type="button" onClick={onAccept} disabled={loading || !canAccept}>
        Accept
      </button>
      <button className={secondaryButtonClass} type="button" onClick={onReject} disabled={loading || !canReject}>
        Reject
      </button>
      <button className={secondaryButtonClass} type="button" onClick={onUndo} disabled={loading || !canUndo}>
        Undo
      </button>
    </div>
  );
}
