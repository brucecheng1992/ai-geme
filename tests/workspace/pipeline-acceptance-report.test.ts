import { isAbsolute } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  PipelineAcceptanceReportSchema,
  buildPipelineAcceptanceReport
} from '../../apps/maker-api/src/projects/pipeline-acceptance-report.js';
import {
  buildInvalidDslPipelineArtifactIndex,
  buildValidPipelineArtifactIndex
} from '../../apps/maker-api/src/projects/pipeline-artifact-index.js';

const projectId = 'proj_20260615_acceptance';
const runId = 'run_20260615_acceptance';

describe('Pipeline acceptance report contract', () => {
  it('builds a deterministic valid-path acceptance summary from artifact refs', () => {
    const index = buildValidPipelineArtifactIndex({
      projectId,
      runId,
      compileFiles: [
        'asset_plan.json',
        'public/asset_manifest.json',
        'asset_resolution_report.json',
        'shooter/src/asset-manifest.generated.json',
        'asset_pipeline_report.json',
        'asset_library_usage_report.json',
        'asset_binding_trace_report.json'
      ],
      buildLogPresent: true,
      qaReportPresent: true
    });
    const first = buildPipelineAcceptanceReport({
      projectId,
      runId,
      artifactIndex: index,
      dslValidation: { valid: true, sourceArtifact: 'game_dsl.json' },
      generationInput: { projectId, runId, source: 'manual' },
      runtimeCapability: { status: 'supported' },
      assetLibraryUsage: { status: 'pass' },
      assetBindingTrace: { status: 'pass' }
    });
    const second = buildPipelineAcceptanceReport({
      projectId,
      runId,
      artifactIndex: { ...index, artifacts: [...index.artifacts].reverse() },
      dslValidation: { valid: true, sourceArtifact: 'game_dsl.json' },
      generationInput: { projectId, runId, source: 'manual' },
      runtimeCapability: { status: 'supported' },
      assetLibraryUsage: { status: 'pass' },
      assetBindingTrace: { status: 'pass' }
    });

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      reportVersion: 'pipeline_acceptance_report.v1',
      projectId,
      runId,
      overallStatus: 'pass',
      previewable: true
    });
    expect(first.checks.map((check) => check.id)).toEqual([
      'generation_input',
      'dsl_validation',
      'dsl_artifact',
      'runtime_capability',
      'asset_pipeline',
      'asset_library_usage',
      'asset_binding_trace',
      'preview_manifest',
      'artifact_index_consistency',
      'build_log',
      'qa_report'
    ]);
    expect(first.checkedArtifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ artifactId: 'generationInputReport', artifactPath: 'generation_input_report.json' }),
        expect.objectContaining({ artifactId: 'pipelineAcceptanceReport', artifactPath: 'pipeline_acceptance_report.json' })
      ])
    );
    expect(first.errors).toEqual([]);
    expect(first.warnings).toEqual([]);
    assertReportIsSafeSummary(first);
  });

  it('fails invalid DSL runs while keeping downstream generated-project refs skipped', () => {
    const report = buildPipelineAcceptanceReport({
      projectId,
      runId,
      artifactIndex: buildInvalidDslPipelineArtifactIndex({ projectId, runId }),
      dslValidation: { valid: false, sourceArtifact: 'game_dsl.candidate.json' },
      generationInput: { projectId, runId, source: 'manual' }
    });

    expect(report).toMatchObject({
      overallStatus: 'fail',
      previewable: false,
      checks: expect.arrayContaining([
        expect.objectContaining({
          id: 'dsl_validation',
          status: 'fail',
          required: true,
          artifactId: 'dslValidationReport',
          artifactPath: 'dsl_validation_report.json',
          reason: 'DSL validation report is invalid.'
        }),
        expect.objectContaining({
          id: 'dsl_artifact',
          status: 'fail',
          artifactId: 'gameDslCandidate',
          artifactPath: 'game_dsl.candidate.json',
          reason: 'DSL validation failed for game_dsl.candidate.json.'
        }),
        expect.objectContaining({
          id: 'asset_pipeline',
          status: 'skipped',
          artifactId: 'assetPipelineReport',
          reason: 'dsl_validation_failed_before_compile'
        }),
        expect.objectContaining({
          id: 'asset_library_usage',
          status: 'skipped',
          artifactId: 'assetLibraryUsageReport',
          reason: 'dsl_validation_failed_before_compile'
        }),
        expect.objectContaining({
          id: 'asset_binding_trace',
          status: 'skipped',
          artifactId: 'assetBindingTraceReport',
          reason: 'dsl_validation_failed_before_compile'
        })
      ])
    });
    expect(JSON.stringify(report)).not.toContain('stale_asset_pipeline_report');
    assertReportIsSafeSummary(report);
  });

  it('derives status and previewability from checks and rejects contradictory reports', () => {
    const report = buildPipelineAcceptanceReport({
      projectId,
      runId,
      artifactIndex: buildValidPipelineArtifactIndex({
        projectId,
        runId,
        compileFiles: ['asset_plan.json', 'asset_resolution_report.json', 'asset_pipeline_report.json', 'asset_library_usage_report.json', 'asset_binding_trace_report.json'],
        buildLogPresent: false,
        qaReportPresent: false
      }),
      dslValidation: { valid: true, sourceArtifact: 'game_dsl.json' },
      generationInput: { projectId, runId, source: 'manual' },
      assetLibraryUsage: { status: 'fail' },
      assetBindingTrace: { status: 'pass' }
    });

    expect(report.overallStatus).toBe('fail');
    expect(report.previewable).toBe(false);
    expect(report.errors).toEqual(expect.arrayContaining([expect.stringContaining('preview_manifest'), expect.stringContaining('asset_library_usage')]));
    expect(() => PipelineAcceptanceReportSchema.parse({ ...report, overallStatus: 'pass' })).toThrow();
    expect(() => PipelineAcceptanceReportSchema.parse({ ...report, previewable: true })).toThrow();
  });

  it('fails a present asset library usage ref when report status was not read', () => {
    const report = buildPipelineAcceptanceReport({
      projectId,
      runId,
      artifactIndex: buildValidPipelineArtifactIndex({
        projectId,
        runId,
        compileFiles: [
          'asset_plan.json',
          'public/asset_manifest.json',
          'asset_resolution_report.json',
          'shooter/src/asset-manifest.generated.json',
          'asset_pipeline_report.json',
          'asset_library_usage_report.json',
          'asset_binding_trace_report.json'
        ],
        buildLogPresent: true,
        qaReportPresent: true
      }),
      dslValidation: { valid: true, sourceArtifact: 'game_dsl.json' },
      generationInput: { projectId, runId, source: 'manual' }
    });

    expect(report).toMatchObject({
      overallStatus: 'fail',
      previewable: false,
      checks: expect.arrayContaining([
        expect.objectContaining({
          id: 'asset_library_usage',
          status: 'fail',
          reason: 'asset_library_usage_report.json status is unavailable.'
        })
      ])
    });
  });

  it('fails a present asset binding trace ref when report status is fail or unavailable', () => {
    const index = buildValidPipelineArtifactIndex({
      projectId,
      runId,
      compileFiles: [
        'asset_plan.json',
        'public/asset_manifest.json',
        'asset_resolution_report.json',
        'shooter/src/asset-manifest.generated.json',
        'asset_pipeline_report.json',
        'asset_library_usage_report.json',
        'asset_binding_trace_report.json'
      ],
      buildLogPresent: true,
      qaReportPresent: true
    });
    const unavailable = buildPipelineAcceptanceReport({
      projectId,
      runId,
      artifactIndex: index,
      dslValidation: { valid: true, sourceArtifact: 'game_dsl.json' },
      generationInput: { projectId, runId, source: 'manual' },
      assetLibraryUsage: { status: 'pass' }
    });
    const failed = buildPipelineAcceptanceReport({
      projectId,
      runId,
      artifactIndex: index,
      dslValidation: { valid: true, sourceArtifact: 'game_dsl.json' },
      generationInput: { projectId, runId, source: 'manual' },
      assetLibraryUsage: { status: 'pass' },
      assetBindingTrace: { status: 'fail' }
    });

    expect(unavailable.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'asset_binding_trace',
          status: 'fail',
          reason: 'asset_binding_trace_report.json status is unavailable.'
        })
      ])
    );
    expect(failed).toMatchObject({
      overallStatus: 'fail',
      previewable: false,
      checks: expect.arrayContaining([
        expect.objectContaining({
          id: 'asset_binding_trace',
          status: 'fail',
          reason: 'asset_binding_trace_report.json status is fail.'
        })
      ])
    });
  });
});

function assertReportIsSafeSummary(report: unknown): void {
  const json = JSON.stringify(report);
  expect(json).not.toContain('timestamp');
  expect(json).not.toContain('asset-pipeline-report-v0.1');
  expect(json).not.toContain('dsl_validation_report.v1');
  expect(json).not.toContain('raw provider');
  expect(json).not.toContain('DEEPSEEK_API_KEY');
  expect(json).not.toContain('/Users/');
  for (const path of json.match(/"[A-Za-z0-9_./-]+\.json"/g) ?? []) {
    expect(isAbsolute(path.slice(1, -1))).toBe(false);
  }
}
