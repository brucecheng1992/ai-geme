import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  AssetBindingTraceSummaryPanel,
  buildAssetBindingTraceView,
  fetchAssetBindingTrace,
  type AssetBindingTraceFetch
} from '../../apps/maker-workbench/src/asset-binding-trace-client.js';
import type { AssetBindingTraceSummary, AssetBindingTraceSummaryResponse } from '../../apps/maker-workbench/src/workbench-api.js';

describe('Workbench asset binding trace client', () => {
  it('summarizes status, counts, categories, warnings, errors, and sample traces', () => {
    const view = buildAssetBindingTraceView(makeReadySummary().asset_binding_trace_summary);

    expect(view).toMatchObject({
      status: 'ready',
      traceStatus: 'warn',
      counts: {
        matched: 2,
        warning: 1,
        missing: 0,
        mismatch: 0,
        skipped: 0
      },
      categoryCounts: {
        dslBound: 2,
        runtimeSystem: 1,
        fallback: 0,
        unresolved: 0
      },
      blockingErrors: ['manifest asset is missing.'],
      warnings: ['fallback trace is informational.']
    });
    expectReady(view);
    expect(view.sampleTraces.map((trace) => trace.traceId)).toEqual(['trace:player', 'trace:enemy']);
  });

  it('filters unsafe paths and hides secret-like reasons before rendering the summary', () => {
    const view = buildAssetBindingTraceView({
      ...makeReadyTraceSummary(),
      reportRef: {
        artifactId: 'assetBindingTraceReport',
        path: '../asset_binding_trace_report.json'
      },
      blockingErrors: ['OPENAI_API_KEY leaked through raw provider response'],
      warnings: ['/Users/dahufa/private.json'],
      sampleTraces: [
        {
          traceId: 'trace:secret',
          category: 'dsl-bound',
          status: 'warning',
          dslStableId: '../secret',
          manifestAssetId: 'https://example.test/asset',
          previewAssetId: 'preview\\asset',
          catalogAssetId: 'player',
          reason: 'Bearer abc.def token from process.env.OPENAI_API_KEY'
        }
      ]
    });
    const markup = renderToStaticMarkup(createElement(AssetBindingTraceSummaryPanel, { loading: false, view, onRefresh: () => undefined, canRefresh: true }));
    const serialized = JSON.stringify(view);

    expect(serialized).not.toContain('../asset_binding_trace_report');
    expect(serialized).not.toContain('OPENAI_API_KEY');
    expect(serialized).not.toContain('raw provider');
    expect(serialized).not.toContain('/Users/');
    expect(serialized).not.toContain('Bearer');
    expect(serialized).not.toContain('https://example');
    expect(serialized).not.toContain('preview\\asset');
    expect(markup).toContain('Reason hidden by Workbench.');
    expect(markup).not.toContain('href=');
  });

  it('returns explicit empty states for missing and skipped summaries', () => {
    expect(
      buildAssetBindingTraceView({
        availability: 'missing',
        projectId: 'proj_20260615_trace',
        runId: 'run_20260615_trace',
        message: 'Asset binding trace report is not available for this run.',
        reportRef: { artifactId: 'assetBindingTraceReport', path: 'asset_binding_trace_report.json', status: 'missing' }
      })
    ).toEqual({
      status: 'empty',
      message: 'Asset binding trace report is not available for this run.'
    });

    expect(
      buildAssetBindingTraceView({
        availability: 'skipped',
        projectId: 'proj_20260615_trace',
        runId: 'run_20260615_trace',
        message: 'Asset binding trace report was skipped for this run.',
        reportRef: { artifactId: 'assetBindingTraceReport', path: 'asset_binding_trace_report.json', status: 'skipped' }
      })
    ).toEqual({
      status: 'empty',
      message: 'Asset binding trace report was skipped for this run.'
    });
  });

  it('does not request asset binding trace without both projectId and runId', async () => {
    const calls: string[] = [];
    const view = await fetchAssetBindingTrace({
      apiBase: 'http://localhost:3000',
      projectId: '',
      runId: 'run_20260615_trace',
      fetcher: async (url) => {
        calls.push(String(url));
        return jsonResponse(200, makeReadySummary());
      }
    });

    expect(calls).toEqual([]);
    expect(view).toEqual({
      status: 'idle',
      message: 'Select a project and run to view asset binding trace.'
    });
  });

  it('fetches only the read-only asset binding trace API and never triggers generation, Prompt Coach, live edit, content, download, or path requests', async () => {
    const calls: Array<{ url: string; method?: string }> = [];
    const view = await fetchAssetBindingTrace({
      apiBase: 'http://localhost:3000',
      projectId: 'proj_20260615_trace',
      runId: 'run_20260615_trace',
      fetcher: async (url, init) => {
        calls.push({ url: String(url), method: init?.method });
        return jsonResponse(200, makeReadySummary());
      }
    });

    expect(view.status).toBe('ready');
    expect(calls).toEqual([{ url: 'http://localhost:3000/api/projects/proj_20260615_trace/runs/run_20260615_trace/asset-binding-trace', method: undefined }]);
    expect(calls[0]?.url).not.toContain('/generate');
    expect(calls[0]?.url).not.toContain('/prompt-optimizations');
    expect(calls[0]?.url).not.toContain('/live-edits');
    expect(calls[0]?.url).not.toContain('/download');
    expect(calls[0]?.url).not.toContain('/content');
    expect(calls[0]?.url).not.toContain('asset_binding_trace_report.json');
  });

  it('sanitizes API and thrown errors before exposing them to Workbench', async () => {
    await expect(
      fetchAssetBindingTrace({
        apiBase: 'http://localhost:3000',
        projectId: 'proj_20260615_trace',
        runId: 'run_20260615_trace',
        fetcher: async () => jsonResponse(500, { message: 'ignored' }, 'DEEPSEEK_API_KEY raw provider /Users/dahufa')
      })
    ).resolves.toEqual({ status: 'error', message: '500 Error' });

    await expect(
      fetchAssetBindingTrace({
        apiBase: 'http://localhost:3000',
        projectId: 'proj_20260615_trace',
        runId: 'run_20260615_trace',
        fetcher: async () => {
          throw new Error('OPENAI_API_KEY process.env.OPENAI_API_KEY Bearer abc.def token at /tmp/provider-output.json');
        }
      })
    ).resolves.toEqual({ status: 'error', message: 'Asset binding trace request failed.' });
  });

  it('renders summary fields without full JSON payload or artifact links', () => {
    const markup = renderToStaticMarkup(
      createElement(AssetBindingTraceSummaryPanel, {
        loading: false,
        view: buildAssetBindingTraceView(makeReadySummary().asset_binding_trace_summary),
        onRefresh: () => undefined,
        canRefresh: true
      })
    );

    expect(markup).toContain('Asset Binding Trace');
    expect(markup).toContain('WARN');
    expect(markup).toContain('Trace counts: 2 matched / 1 warning / 0 missing / 0 mismatch / 0 skipped');
    expect(markup).toContain('Categories: 2 DSL-bound / 1 runtime / 0 fallback / 0 unresolved');
    expect(markup).toContain('manifest asset is missing.');
    expect(markup).toContain('trace:player');
    expect(markup).not.toContain('&quot;sampleTraces&quot;');
    expect(markup).not.toContain('sourceArtifacts');
    expect(markup).not.toContain('checkedPaths');
    expect(markup).not.toContain('href=');
    expect(markup).not.toContain('/Users/');
  });
});

function expectReady(view: ReturnType<typeof buildAssetBindingTraceView>): asserts view is Extract<ReturnType<typeof buildAssetBindingTraceView>, { status: 'ready' }> {
  expect(view.status).toBe('ready');
}

function makeReadySummary(): AssetBindingTraceSummaryResponse {
  return {
    ok: true,
    asset_binding_trace_summary: makeReadyTraceSummary()
  };
}

function makeReadyTraceSummary(): AssetBindingTraceSummary {
  return {
    availability: 'ready',
    projectId: 'proj_20260615_trace',
    runId: 'run_20260615_trace',
    status: 'warn',
    counts: {
      matched: 2,
      warning: 1,
      missing: 0,
      mismatch: 0,
      skipped: 0
    },
    categoryCounts: {
      dslBound: 2,
      runtimeSystem: 1,
      fallback: 0,
      unresolved: 0
    },
    blockingErrors: ['manifest asset is missing.'],
    warnings: ['fallback trace is informational.'],
    sampleTraces: [
      trace('trace:player', 'dsl-bound', 'matched', 'player'),
      trace('trace:enemy', 'runtime-system', 'warning', 'enemy')
    ],
    reportRef: {
      artifactId: 'assetBindingTraceReport',
      path: 'asset_binding_trace_report.json'
    }
  };
}

function trace(traceId: string, category: string, status: string, id: string) {
  return {
    traceId,
    category,
    status,
    dslStableId: id,
    manifestAssetId: id,
    previewAssetId: id,
    catalogAssetId: id,
    reason: `${id} binding trace matches AssetPlan, manifests, and catalog usage.`
  };
}

function jsonResponse(status: number, body: unknown, statusText?: string): Awaited<ReturnType<AssetBindingTraceFetch>> {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: statusText ?? (status >= 200 && status < 300 ? 'OK' : 'Error'),
    async json() {
      return body;
    }
  };
}
