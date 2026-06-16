import type { PreviewRefreshResult, PreviewRefreshStatus } from './PreviewRuntimeRefreshAdapter.js';

export type PreviewStatusBadgeProps = {
  result?: PreviewRefreshResult;
};

export function PreviewStatusBadge({ result }: PreviewStatusBadgeProps) {
  const status = result?.status ?? 'idle';
  return (
    <span className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${statusClass(status)}`}>
      Preview refresh: {status}
    </span>
  );
}

function statusClass(status: PreviewRefreshStatus): string {
  if (status === 'ready') {
    return 'border-[#91d49b] bg-[#dff3df] text-[#208a4d]';
  }

  if (status === 'failed' || status === 'stale') {
    return 'border-[#f2a39b] bg-[#ffe2dc] text-[#c93d35]';
  }

  if (status === 'runtime_loaded' || status === 'loading_iframe' || status === 'qa_running') {
    return 'border-[#5d7890] bg-[#dceeff] text-[#244e72]';
  }

  return 'border-[#d0b993] bg-[#fff7e8] text-[#8a5b13]';
}
