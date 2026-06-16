import type { SemanticPatchActionStatus } from './semanticPatchActionState.js';

export type SemanticPatchStatusBadgeProps = {
  status: SemanticPatchActionStatus;
};

export function SemanticPatchStatusBadge({ status }: SemanticPatchStatusBadgeProps) {
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${statusClass(status)}`}>{status}</span>;
}

function statusClass(status: SemanticPatchActionStatus): string {
  if (status === 'validated' || status === 'applied' || status === 'rolled_back') {
    return 'border-[#91d49b] bg-[#dff3df] text-[#208a4d]';
  }
  if (status === 'failed' || status === 'stale_patch' || status === 'hash_conflict' || status === 'rollback_failed') {
    return 'border-[#f2a39b] bg-[#ffe2dc] text-[#c93d35]';
  }
  if (status === 'accepting' || status === 'rolling_back') {
    return 'border-[#5d7890] bg-[#dceeff] text-[#244e72]';
  }
  return 'border-[#d0b993] bg-[#fff7e8] text-[#8a5b13]';
}
