import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { buildPreviewRefreshRequestFromSemanticPatchEvent } from '../../semantic-editing/index.js';
import type { PipelineArtifactIndex, QaReport } from '../../../workbench-api.js';
import { createPreviewRuntimeRefreshAdapter, resolvePreviewArtifactEntryUrl } from '../index.js';

describe('Preview runtime refresh adapter', () => {
  it('resolves the backend preview artifact URL and adds deterministic cache busting', () => {
    const adapter = createPreviewRuntimeRefreshAdapter({ createRefreshId: () => 'refresh_1' });

    const result = adapter.requestRefresh(
      { projectId: 'proj_demo', runId: 'run_demo', reason: 'generation_completed', forceQa: true },
      createArtifactContext({ projectPreviewUrl: 'http://localhost:3000/preview/proj_demo/index.html' })
    );

    expect(result).toMatchObject({
      refreshId: 'refresh_1',
      status: 'loading_iframe',
      artifactEntryUrl: 'http://localhost:3000/preview/proj_demo/index.html',
      qaStatus: 'skipped',
      visuallyObservable: false,
      falsePlayable: false
    });
    expect(result.iframeUrl).toBe('http://localhost:3000/preview/proj_demo/index.html?refresh=run_demo');
  });

  it('waits for build readiness instead of loading a preview shell', () => {
    const adapter = createPreviewRuntimeRefreshAdapter({ createRefreshId: () => 'refresh_building' });

    const result = adapter.requestRefresh(
      { projectId: 'proj_demo', runId: 'run_demo', reason: 'generation_completed' },
      createArtifactContext({ runStatus: 'BUILDING' })
    );

    expect(result).toMatchObject({
      refreshId: 'refresh_building',
      status: 'waiting_for_build',
      qaStatus: 'skipped',
      visuallyObservable: false
    });
    expect(result).not.toHaveProperty('artifactEntryUrl');
    expect(result).not.toHaveProperty('iframeUrl');
  });

  it('returns PREVIEW_ARTIFACT_ENTRY_NOT_FOUND when the generated artifact is absent', () => {
    const adapter = createPreviewRuntimeRefreshAdapter({ createRefreshId: () => 'refresh_missing' });

    const result = adapter.requestRefresh(
      { projectId: 'proj_demo', runId: 'run_demo', reason: 'generation_completed' },
      createArtifactContext({ artifactIndex: createArtifactIndex({ previewManifestStatus: 'missing' }) })
    );

    expect(result).toMatchObject({
      status: 'failed',
      qaStatus: 'failed',
      errors: ['PREVIEW_ARTIFACT_ENTRY_NOT_FOUND'],
      visuallyObservable: false
    });
  });

  it('requires artifact index evidence before loading a fallback preview route', () => {
    const adapter = createPreviewRuntimeRefreshAdapter({ createRefreshId: () => 'refresh_no_index' });

    const result = adapter.requestRefresh(
      { projectId: 'proj_demo', runId: 'run_demo', reason: 'generation_completed' },
      createArtifactContext({ artifactIndex: undefined })
    );

    expect(result).toMatchObject({
      status: 'failed',
      qaStatus: 'failed',
      errors: ['PREVIEW_ARTIFACT_ENTRY_NOT_FOUND']
    });
    expect(result).not.toHaveProperty('iframeUrl');
  });

  it('rejects Workbench shell URLs as preview artifacts', () => {
    const resolved = resolvePreviewArtifactEntryUrl(
      { projectId: 'proj_demo', runId: 'run_demo' },
      createArtifactContext({
        artifactIndex: createArtifactIndex(),
        projectPreviewUrl: 'http://localhost:5173/preview/proj_demo/index.html',
        workbenchOrigin: 'http://localhost:5173'
      })
    );

    expect(resolved).toEqual({ ok: false, error: 'PREVIEW_ARTIFACT_POINTS_TO_WORKBENCH_SHELL' });
  });

  it('marks older refreshes stale when a newer request supersedes them', () => {
    const refreshIds = ['refresh_1', 'refresh_2'];
    const adapter = createPreviewRuntimeRefreshAdapter({ createRefreshId: () => refreshIds.shift() ?? 'refresh_fallback' });

    adapter.requestRefresh({ projectId: 'proj_demo', runId: 'run_demo', reason: 'generation_completed' }, createArtifactContext());
    adapter.requestRefresh({ projectId: 'proj_demo', runId: 'run_demo', reason: 'manual_refresh' }, createArtifactContext());

    expect(adapter.markIframeLoaded('refresh_1')).toMatchObject({
      status: 'stale',
      warnings: ['PREVIEW_REFRESH_SUPERSEDED']
    });
    expect(adapter.markIframeLoaded('refresh_2')).toMatchObject({
      status: 'loading_iframe',
      qaStatus: 'skipped',
      warnings: ['PREVIEW_IFRAME_LOADED_AWAITING_RUNTIME']
    });
  });

  it('does not treat iframe load as QA passed or visually observable', () => {
    const adapter = createPreviewRuntimeRefreshAdapter({ createRefreshId: () => 'refresh_iframe' });

    adapter.requestRefresh({ projectId: 'proj_demo', runId: 'run_demo', reason: 'manual_refresh' }, createArtifactContext());
    const result = adapter.markIframeLoaded('refresh_iframe');

    expect(result).toMatchObject({
      status: 'loading_iframe',
      qaStatus: 'skipped',
      visuallyObservable: false,
      falsePlayable: false
    });
    expect(result.status).not.toBe('ready');
  });

  it('requires runtime telemetry and QA before reporting ready', () => {
    const adapter = createPreviewRuntimeRefreshAdapter({ createRefreshId: () => 'refresh_ready' });

    adapter.requestRefresh({ projectId: 'proj_demo', runId: 'run_demo', reason: 'generation_completed' }, createArtifactContext());
    adapter.markIframeLoaded('refresh_ready');
    expect(adapter.markRuntimeLoaded('refresh_ready')).toMatchObject({
      status: 'runtime_loaded',
      qaStatus: 'skipped',
      visuallyObservable: false
    });

    const result = adapter.completeQa('refresh_ready', { qaReport: playableQaReport() });
    expect(result).toMatchObject({
      status: 'ready',
      qaStatus: 'passed',
      visuallyObservable: true,
      falsePlayable: false
    });
  });

  it('does not report ready when QA completes before runtime readiness', () => {
    const adapter = createPreviewRuntimeRefreshAdapter({ createRefreshId: () => 'refresh_qa_first' });

    adapter.requestRefresh({ projectId: 'proj_demo', runId: 'run_demo', reason: 'generation_completed' }, createArtifactContext());
    const qaFirst = adapter.completeQa('refresh_qa_first', { qaReport: playableQaReport() });

    expect(qaFirst).toMatchObject({
      status: 'qa_running',
      qaStatus: 'passed',
      visuallyObservable: false,
      warnings: ['PREVIEW_QA_PASSED_AWAITING_RUNTIME']
    });
    expect(qaFirst.status).not.toBe('ready');

    const ready = adapter.markRuntimeLoaded('refresh_qa_first');
    expect(ready).toMatchObject({
      status: 'ready',
      qaStatus: 'passed',
      runtimeLoaded: true,
      visuallyObservable: true
    });
  });

  it('does not let later iframe or runtime events overwrite a failed QA verdict', () => {
    const adapter = createPreviewRuntimeRefreshAdapter({ createRefreshId: () => 'refresh_failed_monotonic' });

    adapter.requestRefresh({ projectId: 'proj_demo', runId: 'run_demo', reason: 'generation_completed' }, createArtifactContext());
    const failed = adapter.completeQa('refresh_failed_monotonic', {
      qaReport: { status: 'FAILED', runtime_status: 'FAILED', overall_status: 'QA_FAILED', observed_events: [] }
    });
    expect(failed).toMatchObject({ status: 'failed', qaStatus: 'failed' });

    expect(adapter.markIframeLoaded('refresh_failed_monotonic')).toEqual(failed);
    expect(adapter.markRuntimeLoaded('refresh_failed_monotonic')).toEqual(failed);
  });

  it('does not let later QA overwrite an artifact-missing failure', () => {
    const adapter = createPreviewRuntimeRefreshAdapter({ createRefreshId: () => 'refresh_missing_terminal' });

    const failed = adapter.requestRefresh(
      { projectId: 'proj_demo', runId: 'run_demo', reason: 'generation_completed' },
      createArtifactContext({ artifactIndex: undefined })
    );
    expect(failed).toMatchObject({ status: 'failed', errors: ['PREVIEW_ARTIFACT_ENTRY_NOT_FOUND'] });

    expect(adapter.completeQa('refresh_missing_terminal', { qaReport: playableQaReport() })).toEqual(failed);
  });

  it('does not let later QA overwrite a ready verdict', () => {
    const adapter = createPreviewRuntimeRefreshAdapter({ createRefreshId: () => 'refresh_ready_terminal' });

    adapter.requestRefresh({ projectId: 'proj_demo', runId: 'run_demo', reason: 'generation_completed' }, createArtifactContext());
    adapter.markRuntimeLoaded('refresh_ready_terminal');
    const ready = adapter.completeQa('refresh_ready_terminal', { qaReport: playableQaReport() });
    expect(ready).toMatchObject({ status: 'ready', qaStatus: 'passed' });

    expect(adapter.completeQa('refresh_ready_terminal', { qaReport: { code: 'PREVIEW_BLANK_SCREEN' } })).toEqual(ready);
  });

  it('downgrades blank-screen playable claims to FALSE_PLAYABLE failures', () => {
    const adapter = createPreviewRuntimeRefreshAdapter({ createRefreshId: () => 'refresh_blank' });

    adapter.requestRefresh({ projectId: 'proj_demo', runId: 'run_demo', reason: 'generation_completed' }, createArtifactContext());
    const result = adapter.completeQa('refresh_blank', {
      qaReport: {
        status: 'PLAYABLE',
        runtime_status: 'PASSED',
        overall_status: 'PLAYABLE',
        observed_events: ['runtime.ready'],
        code: 'PREVIEW_BLANK_SCREEN'
      }
    });

    expect(result).toMatchObject({
      status: 'failed',
      qaStatus: 'failed',
      visuallyObservable: false,
      falsePlayable: true,
      errors: ['FALSE_PLAYABLE']
    });
  });

  it('does not mutate artifact index inputs while resolving preview artifacts', () => {
    const artifactIndex = createArtifactIndex();
    const before = structuredClone(artifactIndex);
    const adapter = createPreviewRuntimeRefreshAdapter();

    adapter.requestRefresh({ projectId: 'proj_demo', runId: 'run_demo', reason: 'generation_completed' }, createArtifactContext({ artifactIndex }));

    expect(artifactIndex).toEqual(before);
  });

  it('maps semantic patch applied and rollback events into preview refresh requests', () => {
    expect(
      buildPreviewRefreshRequestFromSemanticPatchEvent({
        type: 'semantic_patch_applied',
        projectId: 'proj_demo',
        runId: 'run_demo',
        patchId: 'patch_1',
        intentId: 'intent_1',
        expectedSSOTHash: 'ssot_hash'
      })
    ).toEqual({
      projectId: 'proj_demo',
      runId: 'run_demo',
      patchId: 'patch_1',
      intentId: 'intent_1',
      reason: 'semantic_patch_applied',
      expectedSSOTHash: 'ssot_hash',
      forceQa: true
    });

    expect(
      buildPreviewRefreshRequestFromSemanticPatchEvent({
        type: 'semantic_patch_rolled_back',
        projectId: 'proj_demo',
        runId: 'run_demo',
        patchId: 'patch_1'
      })
    ).toMatchObject({
      projectId: 'proj_demo',
      runId: 'run_demo',
      patchId: 'patch_1',
      reason: 'semantic_patch_rolled_back',
      forceQa: true
    });
  });

  it('keeps Step 29.3 scoped away from SSOT apply, Resolver V2, and IR integration', async () => {
    const [adapterSource, bridgeSource] = await Promise.all([
      readFile(new URL('../PreviewRuntimeRefreshAdapter.ts', import.meta.url), 'utf8'),
      readFile(new URL('../../semantic-editing/semanticEditPreviewRefreshBridge.ts', import.meta.url), 'utf8')
    ]);
    const combinedSource = `${adapterSource}\n${bridgeSource}`;

    expect(combinedSource).not.toContain('@ai-game-maker/game-dsl');
    expect(combinedSource).not.toContain('resolver-v2');
    expect(combinedSource).not.toContain('resolveSceneGraph');
    expect(combinedSource).not.toContain('normalizeIr');
    expect(combinedSource).not.toContain('applySemanticPatch');
  });

  it('passes pipeline artifact index evidence through the Workbench refresh path', async () => {
    const appSource = await readFile(new URL('../../../App.tsx', import.meta.url), 'utf8');

    expect(appSource).toContain('optionalJson<PipelineArtifactsResponse>');
    expect(appSource).toContain('pipelineArtifactIndex: artifacts?.pipeline_artifact_index');
    expect(appSource).toContain('artifactIndex: data.pipelineArtifactIndex');
    expect(appSource).toContain("const activePreviewUrl = previewRefreshResult === undefined ? previewUrl : (previewRefreshResult.iframeUrl ?? '');");
  });
});

function createArtifactContext(input: {
  artifactIndex?: PipelineArtifactIndex | undefined;
  projectPreviewUrl?: string;
  runStatus?: string;
  workbenchOrigin?: string;
} = {}) {
  return {
    apiBase: 'http://localhost:3000',
    projectPreviewUrl: input.projectPreviewUrl ?? 'http://localhost:3000/preview/proj_demo/index.html',
    artifactIndex: Object.prototype.hasOwnProperty.call(input, 'artifactIndex') ? input.artifactIndex : createArtifactIndex(),
    runStatus: input.runStatus,
    workbenchOrigin: input.workbenchOrigin ?? 'http://localhost:5173'
  };
}

function createArtifactIndex(input: { previewManifestStatus?: string } = {}): PipelineArtifactIndex {
  return {
    indexVersion: 'pipeline-artifact-index-v0.1',
    projectId: 'proj_demo',
    runId: 'run_demo',
    artifacts: [
      {
        id: 'phaserPreviewManifest',
        role: 'preview-manifest',
        artifactRoot: 'generated-project',
        path: 'data/generated-projects/proj_demo/index.html',
        status: input.previewManifestStatus ?? 'present',
        required: true,
        producedBy: 'phaser-generator',
        format: 'json'
      }
    ]
  };
}

function playableQaReport(): QaReport {
  return {
    status: 'PASSED',
    runtime_status: 'PASSED',
    overall_status: 'PLAYABLE',
    observed_events: ['runtime.ready', 'first-frame.present']
  };
}
