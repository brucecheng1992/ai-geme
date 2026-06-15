import type { AssetBindingTraceReport } from '../compiler/asset-binding-trace-report.js';
import type { PipelineArtifactRef } from './pipeline-artifact-index.js';

export type AssetBindingTraceSummaryStatus = AssetBindingTraceReport['status'];
export type AssetBindingTraceAvailability = 'ready' | 'missing' | 'skipped';

export type AssetBindingTraceSummary = {
  availability: 'ready';
  projectId: string;
  runId: string;
  status: AssetBindingTraceSummaryStatus;
  counts: Record<AssetBindingTraceReport['traces'][number]['status'], number>;
  categoryCounts: {
    dslBound: number;
    runtimeSystem: number;
    fallback: number;
    unresolved: number;
  };
  blockingErrors: string[];
  warnings: string[];
  sampleTraces: AssetBindingTraceSampleTrace[];
  reportRef: {
    artifactId: 'assetBindingTraceReport';
    path: string;
  };
};

export type AssetBindingTraceUnavailableSummary = {
  availability: Exclude<AssetBindingTraceAvailability, 'ready'>;
  projectId: string;
  runId: string;
  message: string;
  reportRef: {
    artifactId: 'assetBindingTraceReport';
    path: string;
    status: PipelineArtifactRef['status'];
    reason?: string;
  };
};

export type AssetBindingTraceSummaryResult = AssetBindingTraceSummary | AssetBindingTraceUnavailableSummary;

export type AssetBindingTraceSampleTrace = Pick<
  AssetBindingTraceReport['traces'][number],
  'traceId' | 'category' | 'status' | 'dslStableId' | 'manifestAssetId' | 'previewAssetId' | 'catalogAssetId' | 'reason'
>;

const SAMPLE_TRACE_LIMIT = 20;

export function buildAssetBindingTraceSummary(input: {
  projectId: string;
  runId: string;
  report: AssetBindingTraceReport;
  artifact: PipelineArtifactRef;
}): AssetBindingTraceSummary {
  const sortedTraces = [...input.report.traces].sort((left, right) => left.traceId.localeCompare(right.traceId));

  return {
    availability: 'ready',
    projectId: input.projectId,
    runId: input.runId,
    status: input.report.status,
    counts: {
      matched: sortedTraces.filter((trace) => trace.status === 'matched').length,
      warning: sortedTraces.filter((trace) => trace.status === 'warning').length,
      missing: sortedTraces.filter((trace) => trace.status === 'missing').length,
      mismatch: sortedTraces.filter((trace) => trace.status === 'mismatch').length,
      skipped: sortedTraces.filter((trace) => trace.status === 'skipped').length
    },
    categoryCounts: {
      dslBound: sortedTraces.filter((trace) => trace.category === 'dsl-bound').length,
      runtimeSystem: sortedTraces.filter((trace) => trace.category === 'runtime-system').length,
      fallback: sortedTraces.filter((trace) => trace.category === 'fallback').length,
      unresolved: sortedTraces.filter((trace) => trace.category === 'unresolved').length
    },
    blockingErrors: input.report.errors.map(sanitizeAssetBindingTraceSummaryText),
    warnings: input.report.warnings.map(sanitizeAssetBindingTraceSummaryText),
    sampleTraces: sortedTraces.slice(0, SAMPLE_TRACE_LIMIT).map((trace) => ({
      traceId: sanitizeAssetBindingTraceSummaryText(trace.traceId),
      category: trace.category,
      status: trace.status,
      dslStableId: trace.dslStableId === null ? null : sanitizeAssetBindingTraceSummaryText(trace.dslStableId),
      manifestAssetId: trace.manifestAssetId === null ? null : sanitizeAssetBindingTraceSummaryText(trace.manifestAssetId),
      previewAssetId: trace.previewAssetId === null ? null : sanitizeAssetBindingTraceSummaryText(trace.previewAssetId),
      catalogAssetId: trace.catalogAssetId === null ? null : sanitizeAssetBindingTraceSummaryText(trace.catalogAssetId),
      reason: sanitizeAssetBindingTraceSummaryText(trace.reason)
    })),
    reportRef: {
      artifactId: 'assetBindingTraceReport',
      path: input.artifact.path
    }
  };
}

export function buildUnavailableAssetBindingTraceSummary(input: {
  projectId: string;
  runId: string;
  artifact: PipelineArtifactRef;
}): AssetBindingTraceUnavailableSummary {
  return {
    availability: input.artifact.status === 'skipped' ? 'skipped' : 'missing',
    projectId: input.projectId,
    runId: input.runId,
    message:
      input.artifact.status === 'skipped'
        ? 'Asset binding trace report was skipped for this run.'
        : 'Asset binding trace report is not available for this run.',
    reportRef: {
      artifactId: 'assetBindingTraceReport',
      path: input.artifact.path,
      status: input.artifact.status,
      reason: input.artifact.reason === undefined ? undefined : sanitizeAssetBindingTraceSummaryText(input.artifact.reason)
    }
  };
}

function sanitizeAssetBindingTraceSummaryText(value: string): string {
  return containsUnsafeSummaryText(value) ? 'Trace detail hidden by API.' : value;
}

function containsUnsafeSummaryText(value: string): boolean {
  return (
    value.includes('\\') ||
    value.split('/').includes('..') ||
    /authorization|api key|secret|token|Bearer\s+|[A-Z][A-Z0-9_]*(?:API_KEY|SECRET|TOKEN)|process\.env\.|raw provider|\/(?:Users|home|tmp|var\/folders)\/|[A-Za-z]:[\\/]|[A-Za-z][A-Za-z0-9+.-]*:\/\//i.test(
      value
    )
  );
}
