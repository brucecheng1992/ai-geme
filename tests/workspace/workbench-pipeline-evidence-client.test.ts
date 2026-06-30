import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import {
  PipelineEvidencePanel,
  buildPipelineEvidenceView,
  fetchPipelineEvidence,
  type PipelineArtifactsFetch
} from '../../apps/maker-workbench/src/pipeline-evidence-client.js';
import type { PipelineArtifactIndex } from '../../apps/maker-workbench/src/workbench-api.js';

describe('Workbench pipeline evidence client', () => {
  it('groups safe artifact refs by pipeline stage while preserving evidence fields', () => {
    const view = buildPipelineEvidenceView(makeIndex());

    expect(view).toMatchObject({
      status: 'ready',
      indexVersion: 'pipeline-artifact-index-v0.1',
      projectId: 'proj_20260615_evidence',
      runId: 'run_20260615_evidence'
    });
    expect(group(view, 'Prompt / Provenance')?.artifacts.map((artifact) => artifact.id)).toEqual(['generationInputReport', 'generationPathReceipt', 'intentPlan']);
    expect(group(view, 'DSL')?.artifacts.map((artifact) => artifact.id)).toEqual(['gameDsl', 'gameDslCandidate', 'dslValidationReport', 'dslConsumptionReport']);
    expect(group(view, 'Runtime')?.artifacts.map((artifact) => artifact.id)).toEqual([
      'capabilityRegistrySnapshot',
      'generationCapabilityReadinessReport',
      'generationCapabilityResolutionReport',
      'shadowGameplayCapabilityLock',
      'generationCapabilityRuntimeReport',
      'generationCapabilityGapReport',
      'generationCapabilityCutoverReport',
      'shadowRuntimeSystemManifest',
      'shadowRuntimeLoaderReport',
      'shadowCapabilityQaPlan',
      'shadowCapabilityQaReport',
      'targetProfileRuntimeSupportReport',
      'runtimeCapabilityReport',
      'sceneIr',
      'runtimeSceneBindingReport'
    ]);
    expect(group(view, 'Assets')?.artifacts.map((artifact) => artifact.id)).toEqual([
      'assetIntentManifest',
      'assetPlan',
      'publicAssetManifest',
      'phaserPreviewManifest',
      'assetResolutionReport',
      'assetPipelineReport',
      'assetLibraryUsageReport',
      'assetBindingTraceReport'
    ]);
    expect(group(view, 'Build / QA / Preview')?.artifacts.map((artifact) => artifact.id)).toEqual(['buildLog', 'qaReport', 'renderFidelityReport', 'pipelineAcceptanceReport', 'pipelineArtifactIndex']);
    expect(group(view, 'DSL')?.artifacts).toContainEqual(
      expect.objectContaining({
        id: 'gameDslCandidate',
        status: 'skipped',
        required: false,
        producedBy: 'generation',
        format: 'json',
        reason: 'valid_dsl_path_uses_game_dsl_json',
        path: 'game_dsl.candidate.json'
      })
    );
  });

  it('filters unsafe paths and hides secret-like reasons without dropping safe unknown refs', () => {
    const view = buildPipelineEvidenceView({
      ...makeIndex(),
      artifacts: [
        ...makeIndex().artifacts,
        { id: 'unknownSafeReport', role: 'validation', artifactRoot: 'model-output', path: 'safe/unknown.json', status: 'present', required: false, producedBy: 'generation', format: 'json' },
        { id: 'absolutePath', role: 'validation', artifactRoot: 'model-output', path: '/Users/dahufa/private.json', status: 'present', required: false, producedBy: 'generation', format: 'json' },
        { id: 'parentTraversal', role: 'validation', artifactRoot: 'model-output', path: '../secret.json', status: 'present', required: false, producedBy: 'generation', format: 'json' },
        { id: 'backslashPath', role: 'validation', artifactRoot: 'model-output', path: 'prompt\\secret.json', status: 'present', required: false, producedBy: 'generation', format: 'json' },
        { id: 'urlPath', role: 'validation', artifactRoot: 'model-output', path: 'https://example.test/report.json', status: 'present', required: false, producedBy: 'generation', format: 'json' },
        {
          id: 'secretReason',
          role: 'validation',
          artifactRoot: 'model-output',
          path: 'safe/reason.json',
          status: 'missing',
          required: true,
          producedBy: 'generation',
          format: 'json',
          reason: 'DEEPSEEK_API_KEY missing from raw provider response'
        }
      ]
    });

    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain('/Users/');
    expect(serialized).not.toContain('../secret');
    expect(serialized).not.toContain('prompt\\secret');
    expect(serialized).not.toContain('https://');
    expect(serialized).not.toContain('DEEPSEEK_API_KEY');
    expect(serialized).not.toContain('raw provider');
    expect(group(view, 'Other')?.artifacts).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'unknownSafeReport', path: 'safe/unknown.json' })]));
    expectReady(view);
    expect(view.filteredCount).toBe(4);
    expect(group(view, 'Other')?.artifacts).toContainEqual(
      expect.objectContaining({ id: 'secretReason', path: 'safe/reason.json', reason: 'Reason hidden by Workbench.' })
    );
  });

  it('returns an explicit empty state for a missing pipeline artifact index', async () => {
    const calls: string[] = [];
    const view = await fetchPipelineEvidence({
      apiBase: 'http://localhost:3000',
      projectId: 'proj_20260615_evidence',
      runId: 'run_20260615_evidence',
      fetcher: async (url) => {
        calls.push(String(url));
        return jsonResponse(404, { message: 'Pipeline artifact index not found.' });
      }
    });

    expect(calls).toEqual(['http://localhost:3000/api/projects/proj_20260615_evidence/runs/run_20260615_evidence/artifacts']);
    expect(view).toEqual({
      status: 'empty',
      message: 'No pipeline artifact index is available for this run.',
      groups: []
    });
  });

  it('does not request artifacts without both projectId and runId', async () => {
    const calls: string[] = [];
    const view = await fetchPipelineEvidence({
      apiBase: 'http://localhost:3000',
      projectId: 'proj_20260615_evidence',
      runId: '',
      fetcher: async (url) => {
        calls.push(String(url));
        return jsonResponse(200, { ok: true, pipeline_artifact_index: makeIndex() });
      }
    });

    expect(calls).toEqual([]);
    expect(view).toEqual({
      status: 'idle',
      message: 'Select a project and run to view pipeline evidence.',
      groups: []
    });
  });

  it('encodes project and run ids before building the read-only artifacts URL', async () => {
    const calls: string[] = [];
    await fetchPipelineEvidence({
      apiBase: 'http://localhost:3000',
      projectId: 'proj_20260615_evidence/unsafe',
      runId: 'run_20260615_evidence?query=1',
      fetcher: async (url) => {
        calls.push(String(url));
        return jsonResponse(200, { ok: true, pipeline_artifact_index: makeIndex() });
      }
    });

    expect(calls).toEqual(['http://localhost:3000/api/projects/proj_20260615_evidence%2Funsafe/runs/run_20260615_evidence%3Fquery%3D1/artifacts']);
  });

  it('fetches only the artifacts API and never triggers generation, Prompt Coach, live edit, or content downloads', async () => {
    const calls: Array<{ url: string; method?: string }> = [];
    const view = await fetchPipelineEvidence({
      apiBase: 'http://localhost:3000',
      projectId: 'proj_20260615_evidence',
      runId: 'run_20260615_evidence',
      fetcher: async (url, init) => {
        calls.push({ url: String(url), method: init?.method });
        return jsonResponse(200, { ok: true, pipeline_artifact_index: makeIndex() });
      }
    });

    expect(view.status).toBe('ready');
    expect(calls).toEqual([{ url: 'http://localhost:3000/api/projects/proj_20260615_evidence/runs/run_20260615_evidence/artifacts', method: undefined }]);
    expect(calls[0]?.url).not.toContain('/generate');
    expect(calls[0]?.url).not.toContain('/prompt-optimizations');
    expect(calls[0]?.url).not.toContain('/live-edits');
    expect(calls[0]?.url).not.toContain('generation_input_report.json');
  });

  it('renders success, reason, empty, and error states without artifact content links', () => {
    const successMarkup = renderToStaticMarkup(createElement(PipelineEvidencePanel, { loading: false, view: buildPipelineEvidenceView(makeIndex()), onRefresh: () => undefined, canRefresh: true }));
    expect(successMarkup).toContain('Pipeline Evidence');
    expect(successMarkup).toContain('generationInputReport');
    expect(successMarkup).toContain('generation_input_report.json');
    expect(successMarkup).toContain('valid_dsl_path_uses_game_dsl_json');
    expect(successMarkup).not.toContain('href=');
    expect(successMarkup).not.toContain('/Users/');

    const emptyMarkup = renderToStaticMarkup(
      createElement(PipelineEvidencePanel, {
        loading: false,
        view: { status: 'empty', message: 'No pipeline artifact index is available for this run.', groups: [] },
        onRefresh: () => undefined,
        canRefresh: false
      })
    );
    expect(emptyMarkup).toContain('No pipeline artifact index is available for this run.');

    const errorMarkup = renderToStaticMarkup(
      createElement(PipelineEvidencePanel, { loading: false, view: { status: 'error', message: '403 Forbidden', groups: [] }, onRefresh: () => undefined, canRefresh: true })
    );
    expect(errorMarkup).toContain('403 Forbidden');
  });
});

function group(view: ReturnType<typeof buildPipelineEvidenceView>, title: string) {
  return view.groups.find((candidate) => candidate.title === title);
}

function expectReady(view: ReturnType<typeof buildPipelineEvidenceView>): asserts view is Extract<ReturnType<typeof buildPipelineEvidenceView>, { status: 'ready' }> {
  expect(view.status).toBe('ready');
}

function makeIndex(): PipelineArtifactIndex {
  return {
    indexVersion: 'pipeline-artifact-index-v0.1',
    projectId: 'proj_20260615_evidence',
    runId: 'run_20260615_evidence',
    artifacts: [
      artifact('generationInputReport', 'prompt', 'model-output', 'generation_input_report.json', 'present', true, 'generation', 'json'),
      artifact('generationPathReceipt', 'runtime', 'model-output', 'generation_path_receipt.json', 'present', true, 'generation', 'json'),
      artifact('capabilityRegistrySnapshot', 'runtime', 'model-output', 'capability_registry_snapshot.json', 'present', true, 'capability-readiness', 'json'),
      artifact('generationCapabilityReadinessReport', 'runtime', 'model-output', 'generation_capability_readiness_report.json', 'present', true, 'capability-readiness', 'json'),
      artifact('generationCapabilityResolutionReport', 'runtime', 'model-output', 'generation_capability_resolution_report.json', 'present', true, 'capability-resolution', 'json'),
      artifact('shadowGameplayCapabilityLock', 'runtime', 'model-output', 'shadow_gameplay_capability_lock.json', 'skipped', false, 'capability-resolution', 'json', 'capability_resolution_shadow_lock_not_resolved'),
      artifact('generationCapabilityRuntimeReport', 'runtime', 'model-output', 'generation_capability_runtime_report.json', 'present', true, 'capability-runtime', 'json'),
      artifact('generationCapabilityGapReport', 'runtime', 'model-output', 'generation_capability_gap_report.json', 'present', true, 'capability-gap', 'json'),
      artifact('generationCapabilityCutoverReport', 'runtime', 'model-output', 'generation_capability_cutover_report.json', 'present', true, 'capability-cutover', 'json'),
      artifact('shadowRuntimeSystemManifest', 'runtime', 'model-output', 'shadow_phaser_runtime_system_manifest.json', 'skipped', false, 'capability-runtime', 'json', 'capability_runtime_shadow_artifact_not_resolved'),
      artifact('shadowRuntimeLoaderReport', 'runtime', 'model-output', 'shadow_phaser_runtime_loader_report.json', 'skipped', false, 'capability-runtime', 'json', 'capability_runtime_shadow_artifact_not_resolved'),
      artifact('shadowCapabilityQaPlan', 'runtime', 'model-output', 'shadow_capability_qa_plan.json', 'skipped', false, 'capability-runtime', 'json', 'capability_runtime_shadow_artifact_not_resolved'),
      artifact('shadowCapabilityQaReport', 'runtime', 'model-output', 'shadow_capability_qa_report.json', 'skipped', false, 'capability-runtime', 'json', 'capability_runtime_shadow_artifact_not_resolved'),
      artifact('targetProfileRuntimeSupportReport', 'runtime', 'model-output', 'generation_target_profile_runtime_support_report.json', 'skipped', false, 'capability-runtime', 'json', 'target_profile_runtime_support_overlay_not_resolved'),
      artifact('intentPlan', 'prompt', 'model-output', 'intent_plan.json', 'present', true, 'generation', 'json'),
      artifact('gameDsl', 'dsl', 'model-output', 'game_dsl.json', 'present', true, 'generation', 'json'),
      artifact('gameDslCandidate', 'dsl', 'model-output', 'game_dsl.candidate.json', 'skipped', false, 'generation', 'json', 'valid_dsl_path_uses_game_dsl_json'),
      artifact('dslValidationReport', 'validation', 'model-output', 'dsl_validation_report.json', 'present', true, 'generation', 'json'),
      artifact('dslConsumptionReport', 'validation', 'model-output', 'dsl_consumption_report.json', 'present', true, 'dsl-consumption', 'json'),
      artifact('runtimeCapabilityReport', 'runtime', 'model-output', 'runtime_capability_report.json', 'present', true, 'runtime-capability', 'json'),
      artifact('sceneIr', 'runtime', 'generated-project', 'game.scene.ir.json', 'present', true, 'compiler', 'json'),
      artifact('runtimeSceneBindingReport', 'runtime', 'generated-project', 'runtime_scene_binding_report.json', 'present', true, 'runtime-scene-binding', 'json'),
      artifact('assetIntentManifest', 'asset', 'generated-project', 'asset_intent_manifest.json', 'present', true, 'compiler', 'json'),
      artifact('assetPlan', 'asset', 'generated-project', 'asset_plan.json', 'present', true, 'compiler', 'json'),
      artifact('publicAssetManifest', 'asset', 'generated-project', 'public/asset_manifest.json', 'present', true, 'compiler', 'json'),
      artifact('phaserPreviewManifest', 'preview', 'generated-project', 'shooter/src/asset-manifest.generated.json', 'present', true, 'compiler', 'json'),
      artifact('assetResolutionReport', 'asset', 'generated-project', 'asset_resolution_report.json', 'present', true, 'compiler', 'json'),
      artifact('assetPipelineReport', 'asset', 'generated-project', 'asset_pipeline_report.json', 'present', true, 'asset-pipeline', 'json'),
      artifact('assetLibraryUsageReport', 'asset', 'generated-project', 'asset_library_usage_report.json', 'present', true, 'asset-pipeline', 'json'),
      artifact('assetBindingTraceReport', 'asset', 'generated-project', 'asset_binding_trace_report.json', 'present', true, 'asset-binding-trace', 'json'),
      artifact('buildLog', 'build', 'build-log', 'run_20260615_evidence.log', 'present', false, 'build', 'log'),
      artifact('qaReport', 'qa', 'qa-report', 'run_20260615_evidence.json', 'missing', false, 'qa', 'json', 'qa_report_not_available_yet'),
      artifact('renderFidelityReport', 'qa', 'model-output', 'render_fidelity_report.json', 'present', false, 'qa', 'json'),
      artifact('pipelineAcceptanceReport', 'index', 'model-output', 'pipeline_acceptance_report.json', 'present', true, 'pipeline-acceptance', 'json'),
      artifact('pipelineArtifactIndex', 'index', 'model-output', 'pipeline_artifact_index.json', 'present', true, 'pipeline-artifact-index', 'json')
    ]
  };
}

function artifact(
  id: string,
  role: string,
  artifactRoot: string,
  path: string,
  status: string,
  required: boolean,
  producedBy: string,
  format: string,
  reason?: string
) {
  return reason === undefined ? { id, role, artifactRoot, path, status, required, producedBy, format } : { id, role, artifactRoot, path, status, required, producedBy, format, reason };
}

function jsonResponse(status: number, body: unknown): Awaited<ReturnType<PipelineArtifactsFetch>> {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    json: async () => body
  } as Awaited<ReturnType<PipelineArtifactsFetch>>;
}
