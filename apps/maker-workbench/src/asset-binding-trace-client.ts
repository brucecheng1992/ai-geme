import { createElement, type ReactNode } from 'react';

import {
  isSafeWorkbenchRelativePath,
  sanitizeWorkbenchErrorMessage,
  sanitizeWorkbenchText
} from './workbench-display-safety.js';
import type { AssetBindingTraceSampleTrace, AssetBindingTraceSummary, AssetBindingTraceSummaryResponse } from './workbench-api.js';

export type AssetBindingTraceFetch = (input: string | URL, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'statusText' | 'json'>>;

export type AssetBindingTraceSampleTraceView = Omit<AssetBindingTraceSampleTrace, 'reason'> & {
  reason: string;
};

export type AssetBindingTraceView =
  | {
      status: 'idle' | 'empty' | 'error';
      message: string;
    }
  | {
      status: 'ready';
      projectId: string;
      runId: string;
      traceStatus: string;
      counts: AssetBindingTraceSummary['counts'];
      categoryCounts: AssetBindingTraceSummary['categoryCounts'];
      blockingErrors: string[];
      warnings: string[];
      sampleTraces: AssetBindingTraceSampleTraceView[];
      reportRef?: {
        artifactId: 'assetBindingTraceReport';
        path: string;
      };
    };

const panelClass = 'rounded-lg border border-[#d8c7a6] bg-[#fffef9] p-4 shadow-[0_1px_0_rgba(49,43,34,0.08)]';
const panelHeadingClass = 'mb-3 flex items-start justify-between gap-3';
const eyebrowClass = 'm-0 text-[11px] font-extrabold uppercase text-[#6f6558]';
const headingClass = 'm-0 text-[15px] font-extrabold leading-tight text-[#15130f]';
const secondaryButtonClass =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-[#15130f] bg-[#fffef9] px-4 text-sm font-extrabold text-[#15130f] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#fff7e8] hover:shadow-[4px_4px_0_#ffb13b] disabled:translate-x-0 disabled:translate-y-0 disabled:border-[#978f82] disabled:text-[#978f82] disabled:shadow-none';

export function buildAssetBindingTraceView(summary: AssetBindingTraceSummaryResponse['asset_binding_trace_summary']): AssetBindingTraceView {
  if (summary.availability !== 'ready') {
    return {
      status: 'empty',
      message: sanitizeAssetBindingTraceText(summary.message)
    };
  }

  const reportRef = isSafeWorkbenchRelativePath(summary.reportRef.path)
    ? { artifactId: summary.reportRef.artifactId, path: summary.reportRef.path }
    : undefined;

  return {
    status: 'ready',
    projectId: sanitizeAssetBindingTraceText(summary.projectId),
    runId: sanitizeAssetBindingTraceText(summary.runId),
    traceStatus: sanitizeAssetBindingTraceText(summary.status),
    counts: summary.counts,
    categoryCounts: summary.categoryCounts,
    blockingErrors: summary.blockingErrors.map(sanitizeAssetBindingTraceText),
    warnings: summary.warnings.map(sanitizeAssetBindingTraceText),
    sampleTraces: summary.sampleTraces.slice(0, 20).map(toSafeTrace),
    reportRef
  };
}

export async function fetchAssetBindingTrace(input: {
  apiBase: string;
  projectId: string;
  runId: string;
  fetcher?: AssetBindingTraceFetch;
}): Promise<AssetBindingTraceView> {
  const projectId = input.projectId.trim();
  const runId = input.runId.trim();
  if (projectId.length === 0 || runId.length === 0) {
    return { status: 'idle', message: 'Select a project and run to view asset binding trace.' };
  }

  const fetcher = input.fetcher ?? fetch;
  let response: Awaited<ReturnType<AssetBindingTraceFetch>>;
  try {
    response = await fetcher(`${input.apiBase}/api/projects/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(runId)}/asset-binding-trace`);
  } catch (requestError) {
    const message = requestError instanceof Error ? requestError.message : 'Asset binding trace request failed.';
    return { status: 'error', message: sanitizeWorkbenchErrorMessage(message, 'Asset binding trace request failed.') };
  }
  if (!response.ok) {
    if (response.status === 404) {
      return { status: 'empty', message: 'No asset binding trace summary is available for this run.' };
    }
    return { status: 'error', message: sanitizeWorkbenchErrorMessage(`${response.status} ${response.statusText}`.trim()) };
  }

  const payload = (await response.json()) as AssetBindingTraceSummaryResponse;
  return buildAssetBindingTraceView(payload.asset_binding_trace_summary);
}

export function AssetBindingTraceSummaryPanel({
  view,
  loading,
  canRefresh,
  onRefresh
}: {
  view: AssetBindingTraceView;
  loading: boolean;
  canRefresh: boolean;
  onRefresh: () => void;
}) {
  return h(
    'article',
    { className: `${panelClass} min-h-64` },
    h(
      'div',
      { className: panelHeadingClass },
      h('div', undefined, h('p', { className: eyebrowClass }, 'Assets'), h('h2', { className: headingClass }, 'Asset Binding Trace')),
      h('button', { className: secondaryButtonClass, type: 'button', onClick: onRefresh, disabled: !canRefresh || loading }, loading ? 'Loading' : 'Refresh')
    ),
    view.status === 'ready' ? renderReadyView(view) : h('p', { className: 'm-0 text-sm font-bold leading-snug text-[#69645d]' }, loading ? 'Loading asset binding trace.' : view.message)
  );
}

function renderReadyView(view: Extract<AssetBindingTraceView, { status: 'ready' }>): ReactNode {
  return h(
    'div',
    { className: 'grid gap-3' },
    h(
      'div',
      { className: 'flex flex-wrap items-center gap-2' },
      h('span', { className: statusClass(view.traceStatus) }, view.traceStatus.toUpperCase()),
      view.reportRef ? h('span', { className: 'rounded-full border border-[#d0b993] bg-[#fff7e8] px-2.5 py-1 text-xs font-black text-[#69645d]' }, view.reportRef.path) : null
    ),
    h(
      'div',
      { className: 'grid gap-1 text-xs font-bold text-[#69645d]' },
      h('span', undefined, `Trace counts: ${view.counts.matched} matched / ${view.counts.warning} warning / ${view.counts.missing} missing / ${view.counts.mismatch} mismatch / ${view.counts.skipped} skipped`),
      h('span', undefined, `Categories: ${view.categoryCounts.dslBound} DSL-bound / ${view.categoryCounts.runtimeSystem} runtime / ${view.categoryCounts.fallback} fallback / ${view.categoryCounts.unresolved} unresolved`)
    ),
    renderTextList('Blocking errors', view.blockingErrors),
    renderTextList('Warnings', view.warnings),
    renderTraceTable(view.sampleTraces)
  );
}

function renderTextList(title: string, items: string[]): ReactNode {
  if (items.length === 0) {
    return null;
  }

  return h(
    'section',
    { className: 'grid gap-2' },
    h('h3', { className: 'm-0 text-[12px] font-black uppercase text-[#6f6558]' }, title),
    h('ul', { className: 'm-0 grid list-none gap-2 p-0' }, ...items.slice(0, 5).map((item) => h('li', { className: 'rounded-lg border border-[#ead9ba] bg-[#fffaf0] p-3 text-xs font-bold text-[#69645d] [overflow-wrap:anywhere]', key: item }, item)))
  );
}

function renderTraceTable(traces: AssetBindingTraceSampleTraceView[]): ReactNode {
  if (traces.length === 0) {
    return null;
  }

  return h(
    'section',
    { className: 'grid gap-2' },
    h('h3', { className: 'm-0 text-[12px] font-black uppercase text-[#6f6558]' }, 'Sample Traces'),
    h(
      'div',
      { className: 'overflow-x-auto' },
      h(
        'table',
        { className: 'w-full min-w-[680px] border-collapse text-left text-xs font-bold text-[#69645d]' },
        h(
          'thead',
          undefined,
          h('tr', undefined, ...['Trace', 'Category', 'Status', 'DSL', 'Manifest', 'Catalog', 'Reason'].map((label) => h('th', { className: 'border-b border-[#d8c7a6] px-2 py-1 text-[#15130f]', key: label }, label)))
        ),
        h('tbody', undefined, ...traces.map(renderTraceRow))
      )
    )
  );
}

function renderTraceRow(trace: AssetBindingTraceSampleTraceView): ReactNode {
  return h(
    'tr',
    { key: trace.traceId },
    h('td', { className: 'border-b border-[#ead9ba] px-2 py-2 [overflow-wrap:anywhere]' }, trace.traceId),
    h('td', { className: 'border-b border-[#ead9ba] px-2 py-2' }, trace.category),
    h('td', { className: 'border-b border-[#ead9ba] px-2 py-2' }, h('span', { className: traceStatusClass(trace.status) }, trace.status)),
    h('td', { className: 'border-b border-[#ead9ba] px-2 py-2 [overflow-wrap:anywhere]' }, trace.dslStableId ?? 'none'),
    h('td', { className: 'border-b border-[#ead9ba] px-2 py-2 [overflow-wrap:anywhere]' }, trace.manifestAssetId ?? 'none'),
    h('td', { className: 'border-b border-[#ead9ba] px-2 py-2 [overflow-wrap:anywhere]' }, trace.catalogAssetId ?? 'none'),
    h('td', { className: 'border-b border-[#ead9ba] px-2 py-2 [overflow-wrap:anywhere]' }, trace.reason)
  );
}

function toSafeTrace(trace: AssetBindingTraceSampleTrace): AssetBindingTraceSampleTraceView {
  return {
    traceId: sanitizeAssetBindingTraceText(trace.traceId),
    category: sanitizeAssetBindingTraceText(trace.category),
    status: sanitizeAssetBindingTraceText(trace.status),
    dslStableId: trace.dslStableId === null ? null : sanitizeAssetBindingTraceText(trace.dslStableId),
    manifestAssetId: trace.manifestAssetId === null ? null : sanitizeAssetBindingTraceText(trace.manifestAssetId),
    previewAssetId: trace.previewAssetId === null ? null : sanitizeAssetBindingTraceText(trace.previewAssetId),
    catalogAssetId: trace.catalogAssetId === null ? null : sanitizeAssetBindingTraceText(trace.catalogAssetId),
    reason: sanitizeAssetBindingTraceText(trace.reason)
  };
}

function sanitizeAssetBindingTraceText(value: string): string {
  if (value.includes('\\') || value.split('/').includes('..') || /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(value)) {
    return 'Reason hidden by Workbench.';
  }
  return sanitizeWorkbenchText(value);
}

function statusClass(status: string): string {
  if (status === 'pass') {
    return 'rounded-full border border-[#91d49b] bg-[#dff3df] px-2 py-0.5 font-black text-[#208a4d]';
  }
  if (status === 'fail') {
    return 'rounded-full border border-[#f2a39b] bg-[#ffe2dc] px-2 py-0.5 font-black text-[#c93d35]';
  }
  return 'rounded-full border border-[#f4cc72] bg-[#fff0bf] px-2 py-0.5 font-black text-[#9b6a14]';
}

function traceStatusClass(status: string): string {
  if (status === 'matched') {
    return 'rounded-full border border-[#91d49b] bg-[#dff3df] px-2 py-0.5 font-black text-[#208a4d]';
  }
  if (status === 'missing' || status === 'mismatch') {
    return 'rounded-full border border-[#f2a39b] bg-[#ffe2dc] px-2 py-0.5 font-black text-[#c93d35]';
  }
  return 'rounded-full border border-[#d0b993] bg-[#fff7e8] px-2 py-0.5 font-black text-[#69645d]';
}

function h(type: string, props?: Record<string, unknown>, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}
