import { createElement, type ReactNode } from 'react';

import { isSafeWorkbenchRelativePath, sanitizeWorkbenchText } from './workbench-display-safety.js';
import type { PipelineArtifactIndex, PipelineArtifactRef, PipelineArtifactsResponse } from './workbench-api.js';

export type PipelineArtifactsFetch = (input: string | URL, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'statusText' | 'json'>>;

export type PipelineEvidenceArtifact = PipelineArtifactRef & {
  reason?: string;
};

export type PipelineEvidenceGroup = {
  id: string;
  title: string;
  artifacts: PipelineEvidenceArtifact[];
};

export type PipelineEvidenceView =
  | {
      status: 'idle' | 'empty' | 'error';
      message: string;
      groups: [];
    }
  | {
      status: 'ready';
      indexVersion: string;
      projectId: string;
      runId: string;
      groups: PipelineEvidenceGroup[];
      filteredCount: number;
    };

const GROUPS: Array<{ id: string; title: string; artifactIds: string[] }> = [
  { id: 'prompt', title: 'Prompt / Provenance', artifactIds: ['generationInputReport', 'intentPlan', 'promptOptimizationReport', 'optimizedPrompt'] },
  { id: 'dsl', title: 'DSL', artifactIds: ['gameDsl', 'gameDslCandidate', 'dslValidationReport'] },
  { id: 'runtime', title: 'Runtime', artifactIds: ['runtimeCapabilityReport'] },
  { id: 'assets', title: 'Assets', artifactIds: ['assetPlan', 'publicAssetManifest', 'phaserPreviewManifest', 'assetResolutionReport', 'assetPipelineReport', 'assetLibraryUsageReport', 'assetBindingTraceReport'] },
  { id: 'build-qa', title: 'Build / QA / Preview', artifactIds: ['buildLog', 'qaReport', 'pipelineAcceptanceReport', 'pipelineArtifactIndex'] }
];

const panelClass = 'rounded-lg border border-[#d8c7a6] bg-[#fffef9] p-4 shadow-[0_1px_0_rgba(49,43,34,0.08)]';
const panelHeadingClass = 'mb-3 flex items-start justify-between gap-3';
const eyebrowClass = 'm-0 text-[11px] font-extrabold uppercase text-[#6f6558]';
const headingClass = 'm-0 text-[15px] font-extrabold leading-tight text-[#15130f]';
const secondaryButtonClass =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-[#15130f] bg-[#fffef9] px-4 text-sm font-extrabold text-[#15130f] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#fff7e8] hover:shadow-[4px_4px_0_#ffb13b] disabled:translate-x-0 disabled:translate-y-0 disabled:border-[#978f82] disabled:text-[#978f82] disabled:shadow-none';

export function buildPipelineEvidenceView(index: PipelineArtifactIndex): PipelineEvidenceView {
  const safeArtifacts = index.artifacts.map(toSafeArtifact).filter((artifact): artifact is PipelineEvidenceArtifact => artifact !== undefined);
  const groups = GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    artifacts: safeArtifacts.filter((artifact) => group.artifactIds.includes(artifact.id))
  })).filter((group) => group.artifacts.length > 0);
  const knownIds = new Set(GROUPS.flatMap((group) => group.artifactIds));
  const otherArtifacts = safeArtifacts.filter((artifact) => !knownIds.has(artifact.id));

  if (otherArtifacts.length > 0) {
    groups.push({ id: 'other', title: 'Other', artifacts: otherArtifacts });
  }

  return {
    status: 'ready',
    indexVersion: index.indexVersion,
    projectId: index.projectId,
    runId: index.runId,
    groups,
    filteredCount: index.artifacts.length - safeArtifacts.length
  };
}

export async function fetchPipelineEvidence(input: {
  apiBase: string;
  projectId: string;
  runId: string;
  fetcher?: PipelineArtifactsFetch;
}): Promise<PipelineEvidenceView> {
  const projectId = input.projectId.trim();
  const runId = input.runId.trim();
  if (projectId.length === 0 || runId.length === 0) {
    return { status: 'idle', message: 'Select a project and run to view pipeline evidence.', groups: [] };
  }

  const fetcher = input.fetcher ?? fetch;
  const response = await fetcher(`${input.apiBase}/api/projects/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(runId)}/artifacts`);
  if (!response.ok) {
    if (response.status === 404) {
      return { status: 'empty', message: 'No pipeline artifact index is available for this run.', groups: [] };
    }
    return { status: 'error', message: `${response.status} ${response.statusText}`.trim(), groups: [] };
  }

  const payload = (await response.json()) as PipelineArtifactsResponse;
  return buildPipelineEvidenceView(payload.pipeline_artifact_index);
}

export function PipelineEvidencePanel({
  view,
  loading,
  canRefresh,
  onRefresh
}: {
  view: PipelineEvidenceView;
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
      h('div', undefined, h('p', { className: eyebrowClass }, 'Pipeline'), h('h2', { className: headingClass }, 'Pipeline Evidence')),
      h('button', { className: secondaryButtonClass, type: 'button', onClick: onRefresh, disabled: !canRefresh || loading }, loading ? 'Loading' : 'Refresh')
    ),
    view.status === 'ready' ? renderReadyView(view) : h('p', { className: 'm-0 text-sm font-bold leading-snug text-[#69645d]' }, loading ? 'Loading pipeline artifact refs.' : view.message)
  );
}

function renderReadyView(view: Extract<PipelineEvidenceView, { status: 'ready' }>): ReactNode {
  return h(
    'div',
    { className: 'grid gap-3' },
    h(
      'div',
      { className: 'grid gap-1 text-xs font-bold text-[#69645d]' },
      h('span', undefined, `Index: ${view.indexVersion}`),
      h('span', undefined, `Run: ${view.runId}`),
      view.filteredCount > 0 ? h('span', undefined, `Filtered unsafe refs: ${view.filteredCount}`) : null
    ),
    ...view.groups.map((group) =>
      h(
        'section',
        { className: 'grid gap-2', key: group.id },
        h('h3', { className: 'm-0 text-[12px] font-black uppercase text-[#6f6558]' }, group.title),
        h('ul', { className: 'm-0 grid list-none gap-2 p-0' }, ...group.artifacts.map(renderArtifact))
      )
    )
  );
}

function renderArtifact(artifact: PipelineEvidenceArtifact): ReactNode {
  return h(
    'li',
    { className: 'rounded-lg border border-[#ead9ba] bg-[#fffaf0] p-3 text-xs font-bold text-[#69645d]', key: `${artifact.id}:${artifact.path}` },
    h(
      'div',
      { className: 'mb-2 flex flex-wrap items-center gap-2' },
      h('span', { className: 'font-black text-[#15130f] [overflow-wrap:anywhere]' }, artifact.id),
      h('span', { className: statusClass(artifact.status) }, artifact.status),
      h('span', { className: 'rounded-full border border-[#d0b993] px-2 py-0.5' }, artifact.required ? 'required' : 'optional')
    ),
    h(
      'div',
      { className: 'grid gap-1 [overflow-wrap:anywhere]' },
      h('span', undefined, `Path: ${artifact.path}`),
      h('span', undefined, `Role: ${artifact.role} · Root: ${artifact.artifactRoot} · By: ${artifact.producedBy} · Format: ${artifact.format}`),
      artifact.reason ? h('span', undefined, `Reason: ${artifact.reason}`) : null
    )
  );
}

function toSafeArtifact(artifact: PipelineArtifactRef): PipelineEvidenceArtifact | undefined {
  if (!isSafeWorkbenchRelativePath(artifact.path)) {
    return undefined;
  }

  return {
    ...artifact,
    reason: artifact.reason === undefined ? undefined : sanitizeWorkbenchText(artifact.reason)
  };
}

function statusClass(status: string): string {
  if (status === 'present') {
    return 'rounded-full border border-[#91d49b] bg-[#dff3df] px-2 py-0.5 font-black text-[#208a4d]';
  }
  if (status === 'missing') {
    return 'rounded-full border border-[#f2a39b] bg-[#ffe2dc] px-2 py-0.5 font-black text-[#c93d35]';
  }
  return 'rounded-full border border-[#d0b993] bg-[#fff7e8] px-2 py-0.5 font-black text-[#9b6a14]';
}

function h(type: string, props?: Record<string, unknown>, ...children: ReactNode[]) {
  return createElement(type, props, ...children);
}
