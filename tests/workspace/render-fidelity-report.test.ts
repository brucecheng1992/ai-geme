import { describe, expect, it } from 'vitest';

import {
  RenderFidelityReportSchema,
  buildRenderFidelityReport
} from '../../apps/maker-api/src/qa/render-fidelity-report.js';

const projectId = 'proj_20260618_render_fidelity';
const runId = 'run_20260618_render_fidelity';

describe('Render fidelity report contract', () => {
  it('combines DSL, asset binding, runtime structure, screenshot, and scene snapshot evidence', () => {
    const report = buildRenderFidelityReport({
      projectId,
      runId,
      qaReport: passedQaReport(),
      dslConsumption: { ignoredAuthoritativeCount: 0, coverageRatio: 1 },
      assetBindingTrace: { status: 'pass', warningCount: 0, errorCount: 0 },
      runtimeSceneBinding: { status: 'pass', boundCount: 8, unboundCount: 0 }
    });

    expect(RenderFidelityReportSchema.parse(report)).toEqual(report);
    expect(report).toMatchObject({
      reportVersion: 'render-fidelity-report.v1',
      projectId,
      runId,
      status: 'PASSED',
      requestedEffect: {
        status: 'matched',
        expected: expect.arrayContaining(['Authoritative DSL paths are consumed.', 'Runtime scene structure is bound.', 'QA screenshot is non-blank.']),
        observed: expect.arrayContaining(['DSL consumption coverage 100%.', 'Runtime scene bindings: 8 bound / 0 unbound.', 'Screenshot metrics: nonBackground=0.21, varied=0.09.']),
        missing: []
      }
    });
    expect(report.checks.map((check) => check.id)).toEqual(['dsl_consumption', 'asset_binding', 'runtime_structure', 'screenshot', 'scene_snapshot']);
    expect(JSON.stringify(report)).not.toContain('/Users/');
  });

  it('fails requested effect when visual screenshot evidence or scene snapshot is missing', () => {
    const report = buildRenderFidelityReport({
      projectId,
      runId,
      qaReport: {
        ...passedQaReport(),
        visual_status: 'VISUAL_QA_FAILED',
        screenshot_path: undefined,
        visual_metrics: undefined,
        snapshot: undefined
      },
      dslConsumption: { ignoredAuthoritativeCount: 0, coverageRatio: 1 },
      assetBindingTrace: { status: 'pass', warningCount: 0, errorCount: 0 },
      runtimeSceneBinding: { status: 'pass', boundCount: 8, unboundCount: 0 }
    });

    expect(report.status).toBe('FAILED');
    expect(report.requestedEffect).toMatchObject({
      status: 'failed',
      missing: expect.arrayContaining(['QA screenshot evidence is non-blank.', 'Runtime scene snapshot is captured.'])
    });
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'screenshot', status: 'fail' }),
        expect.objectContaining({ id: 'scene_snapshot', status: 'fail' })
      ])
    );
  });
});

function passedQaReport() {
  return {
    status: 'PASSED' as const,
    runtime_status: 'PASSED' as const,
    asset_semantic_status: 'PASSED' as const,
    overall_status: 'PLAYABLE' as const,
    project_id: projectId,
    run_id: runId,
    genre: 'side_scrolling_run_and_gun' as const,
    preview_url: 'http://localhost:3000/preview/proj/index.html',
    seed: 'golden',
    required_events: { all: ['game.ready'], any_groups: [] },
    observed_events: ['game.ready'],
    missing_events: [],
    missing_any_groups: [],
    console_errors: [],
    snapshot: { gameStatus: 'READY', sceneBindings: { bindings: [] } },
    visual_status: 'PASSED' as const,
    screenshot_path: '/Users/dahufa/Documents/workspace/ai-game-maker/generated-projects/proj/qa/screenshot.png',
    visual_metrics: {
      canvas_width: 1280,
      canvas_height: 720,
      screenshot_width: 1280,
      screenshot_height: 720,
      non_background_pixel_ratio: 0.21,
      varied_pixel_ratio: 0.09,
      transparent_pixel_ratio: 0
    },
    started_at: '2026-06-18T00:00:00.000Z',
    completed_at: '2026-06-18T00:00:01.000Z'
  };
}
