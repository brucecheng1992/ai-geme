import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  PipelineAcceptanceSummary,
  buildPipelineAcceptanceView,
  fetchPipelineAcceptance,
  type PipelineAcceptanceFetch
} from '../../apps/maker-workbench/src/pipeline-acceptance-client.js';
import type { PipelineAcceptanceReport } from '../../apps/maker-workbench/src/workbench-api.js';

describe('Workbench pipeline acceptance client', () => {
  it('summarizes overall status, previewability, required checks, warnings, and skipped checks', () => {
    const view = buildPipelineAcceptanceView(makeReport());

    expect(view).toMatchObject({
      status: 'ready',
      overallStatus: 'fail',
      previewable: false,
      requiredPassCount: 4,
      requiredFailCount: 1,
      warnCount: 1,
      skippedCount: 1
    });
    expectReady(view);
    expect(view.blockingChecks.map((check) => check.id)).toEqual(['asset_pipeline']);
    expect(view.warningChecks.map((check) => check.id)).toEqual(['qa_report']);
    expect(view.skippedChecks.map((check) => check.id)).toEqual(['build_log']);
  });

  it('filters unsafe paths and hides secret-like reasons before rendering the summary', () => {
    const view = buildPipelineAcceptanceView({
      ...makeReport(),
      checkedArtifacts: [
        ...makeReport().checkedArtifacts,
        { artifactId: 'unsafeAcceptance', artifactPath: '/Users/dahufa/private/pipeline_acceptance_report.json', status: 'present', required: false }
      ],
      checks: [
        ...makeReport().checks,
        {
          id: 'secret_reason',
          category: 'artifacts',
          status: 'fail',
          required: true,
          artifactId: 'secretArtifact',
          artifactPath: '../secret.json',
          reason: 'DEEPSEEK_API_KEY missing from raw provider response',
          evidenceRefs: ['secretArtifact:/Users/dahufa/private.json']
        },
        {
          id: 'openai_token_reason',
          category: 'artifacts',
          status: 'warn',
          required: false,
          artifactId: 'tokenArtifact',
          artifactPath: '/tmp/provider-output.json',
          reason: 'OPENAI_API_KEY leaked through process.env.OPENAI_API_KEY with Bearer abc.def token',
          evidenceRefs: ['tokenArtifact:/home/user/provider-output.json']
        }
      ]
    });
    const markup = renderToStaticMarkup(createElement(PipelineAcceptanceSummary, { loading: false, view, onRefresh: () => undefined, canRefresh: true }));
    const serialized = JSON.stringify(view);

    expect(serialized).not.toContain('/Users/');
    expect(serialized).not.toContain('../secret');
    expect(serialized).not.toContain('DEEPSEEK_API_KEY');
    expect(serialized).not.toContain('raw provider');
    expect(serialized).not.toContain('OPENAI_API_KEY');
    expect(serialized).not.toContain('Bearer');
    expect(serialized).not.toContain('/tmp/');
    expect(serialized).not.toContain('/home/');
    expect(markup).toContain('Reason hidden by Workbench.');
    expect(markup).not.toContain('/Users/');
    expect(markup).not.toContain('DEEPSEEK_API_KEY');
    expect(markup).not.toContain('href=');
  });

  it('returns an explicit empty state for a missing pipeline acceptance report', async () => {
    const calls: string[] = [];
    const view = await fetchPipelineAcceptance({
      apiBase: 'http://localhost:3000',
      projectId: 'proj_20260615_acceptance',
      runId: 'run_20260615_acceptance',
      fetcher: async (url) => {
        calls.push(String(url));
        return jsonResponse(404, { message: 'Pipeline acceptance report not found.' });
      }
    });

    expect(calls).toEqual(['http://localhost:3000/api/projects/proj_20260615_acceptance/runs/run_20260615_acceptance/acceptance']);
    expect(view).toEqual({
      status: 'empty',
      message: 'No pipeline acceptance report is available for this run.'
    });
  });

  it('does not request acceptance without both projectId and runId', async () => {
    const calls: string[] = [];
    const view = await fetchPipelineAcceptance({
      apiBase: 'http://localhost:3000',
      projectId: '',
      runId: 'run_20260615_acceptance',
      fetcher: async (url) => {
        calls.push(String(url));
        return jsonResponse(200, { ok: true, pipeline_acceptance_report: makeReport() });
      }
    });

    expect(calls).toEqual([]);
    expect(view).toEqual({
      status: 'idle',
      message: 'Select a project and run to view pipeline acceptance.'
    });
  });

  it('encodes project and run ids before building the read-only acceptance URL', async () => {
    const calls: string[] = [];
    await fetchPipelineAcceptance({
      apiBase: 'http://localhost:3000',
      projectId: 'proj_20260615_acceptance/unsafe',
      runId: 'run_20260615_acceptance?query=1',
      fetcher: async (url) => {
        calls.push(String(url));
        return jsonResponse(200, { ok: true, pipeline_acceptance_report: makeReport() });
      }
    });

    expect(calls).toEqual(['http://localhost:3000/api/projects/proj_20260615_acceptance%2Funsafe/runs/run_20260615_acceptance%3Fquery%3D1/acceptance']);
  });

  it('fetches only the acceptance API and never triggers generation, Prompt Coach, live edit, content, or path requests', async () => {
    const calls: Array<{ url: string; method?: string }> = [];
    const view = await fetchPipelineAcceptance({
      apiBase: 'http://localhost:3000',
      projectId: 'proj_20260615_acceptance',
      runId: 'run_20260615_acceptance',
      fetcher: async (url, init) => {
        calls.push({ url: String(url), method: init?.method });
        return jsonResponse(200, { ok: true, pipeline_acceptance_report: makeReport() });
      }
    });

    expect(view.status).toBe('ready');
    expect(calls).toEqual([{ url: 'http://localhost:3000/api/projects/proj_20260615_acceptance/runs/run_20260615_acceptance/acceptance', method: undefined }]);
    expect(calls[0]?.url).not.toContain('/generate');
    expect(calls[0]?.url).not.toContain('/prompt-optimizations');
    expect(calls[0]?.url).not.toContain('/live-edits');
    expect(calls[0]?.url).not.toContain('pipeline_acceptance_report.json');
  });

  it('sanitizes API error status text before exposing it to Workbench', async () => {
    const view = await fetchPipelineAcceptance({
      apiBase: 'http://localhost:3000',
      projectId: 'proj_20260615_acceptance',
      runId: 'run_20260615_acceptance',
      fetcher: async () => jsonResponse(500, { message: 'ignored' }, 'DEEPSEEK_API_KEY raw provider /Users/dahufa')
    });

    expect(view).toEqual({ status: 'error', message: '500 Error' });
  });

  it('sanitizes thrown fetch errors before exposing them to Workbench', async () => {
    const view = await fetchPipelineAcceptance({
      apiBase: 'http://localhost:3000',
      projectId: 'proj_20260615_acceptance',
      runId: 'run_20260615_acceptance',
      fetcher: async () => {
        throw new Error('OPENAI_API_KEY process.env.OPENAI_API_KEY Bearer abc.def token at /tmp/provider-output.json');
      }
    });

    expect(view).toEqual({ status: 'error', message: 'Pipeline acceptance request failed.' });
    expect(JSON.stringify(view)).not.toContain('OPENAI_API_KEY');
    expect(JSON.stringify(view)).not.toContain('process.env');
    expect(JSON.stringify(view)).not.toContain('Bearer');
    expect(JSON.stringify(view)).not.toContain('/tmp/');
  });

  it('renders status, previewability, check counts, and reasons without full JSON or artifact links', () => {
    const markup = renderToStaticMarkup(
      createElement(PipelineAcceptanceSummary, { loading: false, view: buildPipelineAcceptanceView(makeReport()), onRefresh: () => undefined, canRefresh: true })
    );

    expect(markup).toContain('Pipeline Acceptance');
    expect(markup).toContain('FAIL');
    expect(markup).toContain('Previewable: No');
    expect(markup).toContain('Required checks: 4 passed / 1 failed');
    expect(markup).toContain('Warnings: 1');
    expect(markup).toContain('Skipped: 1');
    expect(markup).toContain('asset_pipeline');
    expect(markup).toContain('Asset pipeline report is missing.');
    expect(markup).not.toContain('href=');
    expect(markup).not.toContain('Report ref:');
    expect(markup).not.toContain('Ref:');
    expect(markup).not.toContain('pipeline_acceptance_report.json');
    expect(markup).not.toContain('&quot;checks&quot;');
    expect(markup).not.toContain('/Users/');
    expect(markup).not.toContain('DEEPSEEK_API_KEY');
  });
});

function expectReady(view: ReturnType<typeof buildPipelineAcceptanceView>): asserts view is Extract<ReturnType<typeof buildPipelineAcceptanceView>, { status: 'ready' }> {
  expect(view.status).toBe('ready');
}

function makeReport(): PipelineAcceptanceReport {
  return {
    reportVersion: 'pipeline_acceptance_report.v1',
    projectId: 'proj_20260615_acceptance',
    runId: 'run_20260615_acceptance',
    overallStatus: 'fail',
    previewable: false,
    checkedArtifacts: [
      { artifactId: 'generationInputReport', artifactPath: 'generation_input_report.json', status: 'present', required: true },
      { artifactId: 'dslValidationReport', artifactPath: 'dsl_validation_report.json', status: 'present', required: true },
      { artifactId: 'assetPipelineReport', artifactPath: 'asset_pipeline_report.json', status: 'missing', required: true },
      { artifactId: 'pipelineAcceptanceReport', artifactPath: 'pipeline_acceptance_report.json', status: 'present', required: true }
    ],
    checks: [
      check('generation_input', 'prompt', 'pass', true, 'generationInputReport', 'generation_input_report.json', 'generation_input_report identity matches the current project and run.'),
      check('dsl_validation', 'dsl', 'pass', true, 'dslValidationReport', 'dsl_validation_report.json', 'DSL validation report is valid.'),
      check('dsl_artifact', 'dsl', 'pass', true, 'gameDsl', 'game_dsl.json', 'Validated Game DSL artifact is present.'),
      check('preview_manifest', 'preview', 'pass', true, 'phaserPreviewManifest', 'src/asset-manifest.generated.json', 'Preview manifest refs are present.'),
      check('asset_pipeline', 'assets', 'fail', true, 'assetPipelineReport', 'asset_pipeline_report.json', 'Asset pipeline report is missing.'),
      check('build_log', 'artifacts', 'skipped', false, 'buildLog', 'run_20260615_acceptance.log', 'build_log artifact ref is skipped.'),
      check('qa_report', 'qa', 'warn', false, 'qaReport', 'run_20260615_acceptance.json', 'QA report is available with warnings.')
    ],
    errors: ['asset_pipeline: Asset pipeline report is missing.'],
    warnings: ['qa_report: QA report is available with warnings.']
  };
}

function check(
  id: string,
  category: string,
  status: 'pass' | 'warn' | 'fail' | 'skipped',
  required: boolean,
  artifactId: string,
  artifactPath: string | null,
  reason: string
) {
  return {
    id,
    category,
    status,
    required,
    artifactId,
    artifactPath,
    reason,
    evidenceRefs: artifactPath === null ? [] : [`${artifactId}:${artifactPath}`]
  };
}

function jsonResponse(status: number, body: unknown, statusText?: string): Awaited<ReturnType<PipelineAcceptanceFetch>> {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: statusText ?? (status >= 200 && status < 300 ? 'OK' : 'Error'),
    json: async () => body
  } as Awaited<ReturnType<PipelineAcceptanceFetch>>;
}
