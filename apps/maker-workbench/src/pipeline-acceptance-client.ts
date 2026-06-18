import { createElement, type ReactNode } from 'react';

import {
  isSafeWorkbenchEvidenceRef,
  isSafeWorkbenchRelativePath,
  sanitizeWorkbenchErrorMessage,
  sanitizeWorkbenchText
} from './workbench-display-safety.js';
import type { PipelineAcceptanceCheck, PipelineAcceptanceReport, PipelineAcceptanceResponse } from './workbench-api.js';

export type PipelineAcceptanceFetch = (input: string | URL, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'statusText' | 'json'>>;

export type PipelineAcceptanceCheckView = Omit<PipelineAcceptanceCheck, 'artifactPath' | 'reason' | 'evidenceRefs'> & {
  artifactPath?: string;
  reason: string;
  evidenceRefs: string[];
};

export type PipelineAcceptanceView =
  | {
      status: 'idle' | 'empty' | 'error';
      message: string;
    }
  | {
      status: 'ready';
      projectId: string;
      runId: string;
      overallStatus: string;
      previewable: boolean;
      renderFidelityStatus: string;
      renderFidelityReason: string;
      requiredPassCount: number;
      requiredFailCount: number;
      warnCount: number;
      skippedCount: number;
      blockingChecks: PipelineAcceptanceCheckView[];
      warningChecks: PipelineAcceptanceCheckView[];
      skippedChecks: PipelineAcceptanceCheckView[];
    };

const panelClass = 'rounded-lg border border-[#d8c7a6] bg-[#fffef9] p-4 shadow-[0_1px_0_rgba(49,43,34,0.08)]';
const panelHeadingClass = 'mb-3 flex items-start justify-between gap-3';
const eyebrowClass = 'm-0 text-[11px] font-extrabold uppercase text-[#6f6558]';
const headingClass = 'm-0 text-[15px] font-extrabold leading-tight text-[#15130f]';
const secondaryButtonClass =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-[#15130f] bg-[#fffef9] px-4 text-sm font-extrabold text-[#15130f] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#fff7e8] hover:shadow-[4px_4px_0_#ffb13b] disabled:translate-x-0 disabled:translate-y-0 disabled:border-[#978f82] disabled:text-[#978f82] disabled:shadow-none';

export function buildPipelineAcceptanceView(report: PipelineAcceptanceReport): PipelineAcceptanceView {
  const checks = report.checks.map(toSafeCheck);

  return {
    status: 'ready',
    projectId: sanitizeWorkbenchText(report.projectId),
    runId: sanitizeWorkbenchText(report.runId),
    overallStatus: sanitizeWorkbenchText(report.overallStatus),
    previewable: report.previewable,
    renderFidelityStatus: sanitizeWorkbenchText(report.renderFidelity.status),
    renderFidelityReason: sanitizeWorkbenchText(report.renderFidelity.reason),
    requiredPassCount: checks.filter((check) => check.required && check.status === 'pass').length,
    requiredFailCount: checks.filter((check) => check.required && check.status === 'fail').length,
    warnCount: checks.filter((check) => check.status === 'warn').length,
    skippedCount: checks.filter((check) => check.status === 'skipped').length,
    blockingChecks: checks.filter((check) => check.required && check.status === 'fail'),
    warningChecks: checks.filter((check) => check.status === 'warn'),
    skippedChecks: checks.filter((check) => check.status === 'skipped')
  };
}

export async function fetchPipelineAcceptance(input: {
  apiBase: string;
  projectId: string;
  runId: string;
  fetcher?: PipelineAcceptanceFetch;
}): Promise<PipelineAcceptanceView> {
  const projectId = input.projectId.trim();
  const runId = input.runId.trim();
  if (projectId.length === 0 || runId.length === 0) {
    return { status: 'idle', message: 'Select a project and run to view pipeline acceptance.' };
  }

  const fetcher = input.fetcher ?? fetch;
  let response: Awaited<ReturnType<PipelineAcceptanceFetch>>;
  try {
    response = await fetcher(`${input.apiBase}/api/projects/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(runId)}/acceptance`);
  } catch (requestError) {
    const message = requestError instanceof Error ? requestError.message : 'Pipeline acceptance request failed.';
    return { status: 'error', message: sanitizeWorkbenchErrorMessage(message, 'Pipeline acceptance request failed.') };
  }
  if (!response.ok) {
    if (response.status === 404) {
      return { status: 'empty', message: 'No pipeline acceptance report is available for this run.' };
    }
    return { status: 'error', message: sanitizeWorkbenchErrorMessage(`${response.status} ${response.statusText}`.trim()) };
  }

  const payload = (await response.json()) as PipelineAcceptanceResponse;
  return buildPipelineAcceptanceView(payload.pipeline_acceptance_report);
}

export function PipelineAcceptanceSummary({
  view,
  loading,
  canRefresh,
  onRefresh
}: {
  view: PipelineAcceptanceView;
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
      h('div', undefined, h('p', { className: eyebrowClass }, 'Pipeline'), h('h2', { className: headingClass }, 'Pipeline Acceptance')),
      h('button', { className: secondaryButtonClass, type: 'button', onClick: onRefresh, disabled: !canRefresh || loading }, loading ? 'Loading' : 'Refresh')
    ),
    view.status === 'ready' ? renderReadyView(view) : h('p', { className: 'm-0 text-sm font-bold leading-snug text-[#69645d]' }, loading ? 'Loading pipeline acceptance.' : view.message)
  );
}

function renderReadyView(view: Extract<PipelineAcceptanceView, { status: 'ready' }>): ReactNode {
  return h(
    'div',
    { className: 'grid gap-3' },
    h(
      'div',
      { className: 'flex flex-wrap items-center gap-2' },
      h('span', { className: statusClass(view.overallStatus) }, view.overallStatus.toUpperCase()),
      h('span', { className: renderFidelityClass(view.renderFidelityStatus) }, `Render fidelity: ${view.renderFidelityStatus}`),
      h('span', { className: 'rounded-full border border-[#d0b993] bg-[#fff7e8] px-2.5 py-1 text-xs font-black text-[#69645d]' }, `Previewable: ${view.previewable ? 'Yes' : 'No'}`)
    ),
    h(
      'div',
      { className: 'grid gap-1 text-xs font-bold text-[#69645d]' },
      h('span', undefined, view.renderFidelityReason),
      h('span', undefined, `Required checks: ${view.requiredPassCount} passed / ${view.requiredFailCount} failed`),
      h('span', undefined, `Warnings: ${view.warnCount}`),
      h('span', undefined, `Skipped: ${view.skippedCount}`)
    ),
    renderCheckList('Blocking', view.blockingChecks),
    renderCheckList('Warnings', view.warningChecks),
    renderCheckList('Skipped', view.skippedChecks)
  );
}

function renderCheckList(title: string, checks: PipelineAcceptanceCheckView[]): ReactNode {
  if (checks.length === 0) {
    return null;
  }

  return h(
    'section',
    { className: 'grid gap-2' },
    h('h3', { className: 'm-0 text-[12px] font-black uppercase text-[#6f6558]' }, title),
    h('ul', { className: 'm-0 grid list-none gap-2 p-0' }, ...checks.map(renderCheck))
  );
}

function renderCheck(check: PipelineAcceptanceCheckView): ReactNode {
  return h(
    'li',
    { className: 'rounded-lg border border-[#ead9ba] bg-[#fffaf0] p-3 text-xs font-bold text-[#69645d]', key: `${check.id}:${check.status}` },
    h(
      'div',
      { className: 'mb-2 flex flex-wrap items-center gap-2' },
      h('span', { className: 'font-black text-[#15130f] [overflow-wrap:anywhere]' }, check.id),
      h('span', { className: statusClass(check.status) }, check.status),
      h('span', { className: 'rounded-full border border-[#d0b993] px-2 py-0.5' }, check.required ? 'required' : 'optional')
    ),
    h(
      'div',
      { className: 'grid gap-1 [overflow-wrap:anywhere]' },
      h('span', undefined, `Category: ${check.category}`),
      h('span', undefined, `Reason: ${check.reason}`)
    )
  );
}

function toSafeCheck(check: PipelineAcceptanceCheck): PipelineAcceptanceCheckView {
  return {
    ...check,
    id: sanitizeWorkbenchText(check.id),
    category: sanitizeWorkbenchText(check.category),
    status: sanitizeWorkbenchText(check.status),
    artifactId: sanitizeWorkbenchText(check.artifactId),
    artifactPath: check.artifactPath !== null && isSafeWorkbenchRelativePath(check.artifactPath) ? check.artifactPath : undefined,
    reason: sanitizeWorkbenchText(check.reason),
    evidenceRefs: check.evidenceRefs.filter(isSafeWorkbenchEvidenceRef)
  };
}

function statusClass(status: string): string {
  if (status === 'pass') {
    return 'rounded-full border border-[#91d49b] bg-[#dff3df] px-2 py-0.5 font-black text-[#208a4d]';
  }
  if (status === 'fail') {
    return 'rounded-full border border-[#f2a39b] bg-[#ffe2dc] px-2 py-0.5 font-black text-[#c93d35]';
  }
  if (status === 'warn') {
    return 'rounded-full border border-[#f4cc72] bg-[#fff0bf] px-2 py-0.5 font-black text-[#9b6a14]';
  }
  return 'rounded-full border border-[#d0b993] bg-[#fff7e8] px-2 py-0.5 font-black text-[#69645d]';
}

function renderFidelityClass(status: string): string {
  if (status === 'PASSED') {
    return 'rounded-full border border-[#91d49b] bg-[#dff3df] px-2 py-0.5 font-black text-[#208a4d]';
  }
  if (status === 'FAILED') {
    return 'rounded-full border border-[#f2a39b] bg-[#ffe2dc] px-2 py-0.5 font-black text-[#c93d35]';
  }
  if (status === 'PASSED_WITH_OPTIONAL_FALLBACKS' || status === 'VISUALLY_DEGRADED') {
    return 'rounded-full border border-[#f4cc72] bg-[#fff0bf] px-2 py-0.5 font-black text-[#9b6a14]';
  }
  return 'rounded-full border border-[#d0b993] bg-[#fff7e8] px-2 py-0.5 font-black text-[#69645d]';
}

function h(type: string, props?: Record<string, unknown>, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}
