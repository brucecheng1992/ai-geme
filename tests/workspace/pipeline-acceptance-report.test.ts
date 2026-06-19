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
        'asset_intent_manifest.json',
        'public/asset_manifest.json',
        'asset_resolution_report.json',
        'shooter/src/asset-manifest.generated.json',
        'asset_pipeline_report.json',
        'asset_library_usage_report.json',
        'asset_binding_trace_report.json',
        'semantic_extraction_trace_report.json',
        'semantic_model_report.json'
      ],
      buildLogPresent: true,
      qaReportPresent: true,
      renderFidelityReportPresent: true
    });
    const first = buildPipelineAcceptanceReport({
      projectId,
      runId,
      artifactIndex: index,
      dslValidation: { valid: true, sourceArtifact: 'game_dsl.json' },
      dslConsumption: { ignoredAuthoritativeCount: 0, coverageRatio: 1 },
      assetIntentResolution: { coreRequiredFallbackCount: 0, requestRequiredFallbackCount: 0, optionalFallbackCount: 0 },
      renderFidelityQa: { status: 'PASSED' },
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
      dslConsumption: { ignoredAuthoritativeCount: 0, coverageRatio: 1 },
      assetIntentResolution: { coreRequiredFallbackCount: 0, requestRequiredFallbackCount: 0, optionalFallbackCount: 0 },
      renderFidelityQa: { status: 'PASSED' },
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
      previewable: true,
      renderFidelity: {
        status: 'PASSED',
        coreRequiredFallbackCount: 0,
        requestRequiredFallbackCount: 0,
        optionalFallbackCount: 0
      }
    });
    expect(first.checks.map((check) => check.id)).toEqual([
      'generation_input',
      'dsl_validation',
      'dsl_artifact',
      'dsl_consumption',
      'scene_ir',
      'required_artifacts',
      'runtime_scene_binding',
      'runtime_capability',
      'asset_intent_resolution',
      'asset_pipeline',
      'asset_library_usage',
      'asset_binding_trace',
      'preview_manifest',
      'artifact_index_consistency',
      'build_log',
      'qa_report'
      ,
      'render_fidelity_report'
    ]);
    expect(first.checkedArtifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ artifactId: 'generationInputReport', artifactPath: 'generation_input_report.json' }),
        expect.objectContaining({ artifactId: 'generationPathReceipt', artifactPath: 'generation_path_receipt.json' }),
        expect.objectContaining({ artifactId: 'capabilityRegistrySnapshot', artifactPath: 'capability_registry_snapshot.json' }),
        expect.objectContaining({ artifactId: 'generationCapabilityReadinessReport', artifactPath: 'generation_capability_readiness_report.json' }),
        expect.objectContaining({ artifactId: 'generationCapabilityResolutionReport', artifactPath: 'generation_capability_resolution_report.json' }),
        expect.objectContaining({ artifactId: 'shadowGameplayCapabilityLock', artifactPath: 'shadow_gameplay_capability_lock.json', status: 'skipped', required: false }),
        expect.objectContaining({ artifactId: 'generationCapabilityRuntimeReport', artifactPath: 'generation_capability_runtime_report.json' }),
        expect.objectContaining({ artifactId: 'generationCapabilityGapReport', artifactPath: 'generation_capability_gap_report.json' }),
        expect.objectContaining({ artifactId: 'generationCapabilityCutoverReport', artifactPath: 'generation_capability_cutover_report.json' }),
        expect.objectContaining({ artifactId: 'shadowRuntimeSystemManifest', artifactPath: 'shadow_phaser_runtime_system_manifest.json', status: 'skipped', required: false }),
        expect.objectContaining({ artifactId: 'shadowRuntimeLoaderReport', artifactPath: 'shadow_phaser_runtime_loader_report.json', status: 'skipped', required: false }),
        expect.objectContaining({ artifactId: 'shadowCapabilityQaPlan', artifactPath: 'shadow_capability_qa_plan.json', status: 'skipped', required: false }),
        expect.objectContaining({ artifactId: 'shadowCapabilityQaReport', artifactPath: 'shadow_capability_qa_report.json', status: 'skipped', required: false }),
        expect.objectContaining({ artifactId: 'dslConsumptionReport', artifactPath: 'dsl_consumption_report.json' }),
        expect.objectContaining({ artifactId: 'sceneIr', artifactPath: 'game.scene.ir.json', status: 'skipped', required: false }),
        expect.objectContaining({ artifactId: 'sceneIrAuthorityReport', artifactPath: 'scene_ir_authority_report.json', status: 'skipped', required: false }),
        expect.objectContaining({ artifactId: 'sceneIrCoverageReport', artifactPath: 'scene_ir_coverage_report.json', status: 'skipped', required: false }),
        expect.objectContaining({ artifactId: 'runtimeSceneBindingReport', artifactPath: 'runtime_scene_binding_report.json', status: 'skipped', required: false }),
        expect.objectContaining({ artifactId: 'assetIntentManifest', artifactPath: 'asset_intent_manifest.json' }),
        expect.objectContaining({ artifactId: 'pipelineAcceptanceReport', artifactPath: 'pipeline_acceptance_report.json' })
        ,
        expect.objectContaining({ artifactId: 'renderFidelityReport', artifactPath: 'render_fidelity_report.json' })
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
        }),
        expect.objectContaining({
          id: 'dsl_consumption',
          status: 'skipped',
          artifactId: 'dslConsumptionReport',
          reason: 'dsl_validation_failed_before_consumption_audit'
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
        compileFiles: [
          'asset_intent_manifest.json',
          'asset_plan.json',
          'asset_resolution_report.json',
          'asset_pipeline_report.json',
          'asset_library_usage_report.json',
          'asset_binding_trace_report.json',
          'semantic_extraction_trace_report.json',
          'semantic_model_report.json'
        ],
        buildLogPresent: false,
        qaReportPresent: false
      }),
      dslValidation: { valid: true, sourceArtifact: 'game_dsl.json' },
      dslConsumption: { ignoredAuthoritativeCount: 0, coverageRatio: 1 },
      assetIntentResolution: { coreRequiredFallbackCount: 0, requestRequiredFallbackCount: 0, optionalFallbackCount: 0 },
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
          'asset_intent_manifest.json',
          'public/asset_manifest.json',
          'asset_resolution_report.json',
          'shooter/src/asset-manifest.generated.json',
          'asset_pipeline_report.json',
          'asset_library_usage_report.json',
          'asset_binding_trace_report.json',
          'semantic_extraction_trace_report.json',
          'semantic_model_report.json'
        ],
        buildLogPresent: true,
        qaReportPresent: true
      }),
      dslValidation: { valid: true, sourceArtifact: 'game_dsl.json' },
      dslConsumption: { ignoredAuthoritativeCount: 0, coverageRatio: 1 },
      assetIntentResolution: { coreRequiredFallbackCount: 0, requestRequiredFallbackCount: 0, optionalFallbackCount: 0 },
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

  it('fails a valid DSL run when consumption audit finds ignored authoritative paths', () => {
    const report = buildPipelineAcceptanceReport({
      projectId,
      runId,
      artifactIndex: buildValidPipelineArtifactIndex({
        projectId,
        runId,
        compileFiles: [
          'asset_plan.json',
          'asset_intent_manifest.json',
          'public/asset_manifest.json',
          'asset_resolution_report.json',
          'shooter/src/asset-manifest.generated.json',
          'asset_pipeline_report.json',
          'asset_library_usage_report.json',
          'asset_binding_trace_report.json',
          'semantic_extraction_trace_report.json',
          'semantic_model_report.json'
        ],
        buildLogPresent: true,
        qaReportPresent: true
      }),
      dslValidation: { valid: true, sourceArtifact: 'game_dsl.json' },
      dslConsumption: { ignoredAuthoritativeCount: 1, coverageRatio: 0.98 },
      assetIntentResolution: { coreRequiredFallbackCount: 0, requestRequiredFallbackCount: 0, optionalFallbackCount: 0 },
      generationInput: { projectId, runId, source: 'manual' },
      runtimeCapability: { status: 'supported' },
      assetLibraryUsage: { status: 'pass' },
      assetBindingTrace: { status: 'pass' }
    });

    expect(report).toMatchObject({
      overallStatus: 'fail',
      previewable: false,
      checks: expect.arrayContaining([
        expect.objectContaining({
          id: 'dsl_consumption',
          status: 'fail',
          reason: 'dsl_consumption_report.json has 1 ignored authoritative path(s).'
        })
      ])
    });
  });

  it('fails a valid DSL run when core or request-required asset intents resolve to fallback', () => {
    const report = buildPipelineAcceptanceReport({
      projectId,
      runId,
      artifactIndex: buildValidPipelineArtifactIndex({
        projectId,
        runId,
        compileFiles: [
          'asset_intent_manifest.json',
          'asset_plan.json',
          'public/asset_manifest.json',
          'asset_resolution_report.json',
          'shooter/src/asset-manifest.generated.json',
          'asset_pipeline_report.json',
          'asset_library_usage_report.json',
          'asset_binding_trace_report.json',
          'semantic_extraction_trace_report.json',
          'semantic_model_report.json'
        ],
        buildLogPresent: true,
        qaReportPresent: true
      }),
      dslValidation: { valid: true, sourceArtifact: 'game_dsl.json' },
      dslConsumption: { ignoredAuthoritativeCount: 0, coverageRatio: 1 },
      assetIntentResolution: { coreRequiredFallbackCount: 1, requestRequiredFallbackCount: 1, optionalFallbackCount: 0 },
      generationInput: { projectId, runId, source: 'manual' },
      runtimeCapability: { status: 'supported' },
      assetLibraryUsage: { status: 'pass' },
      assetBindingTrace: { status: 'pass' }
    });

    expect(report).toMatchObject({
      overallStatus: 'fail',
      previewable: false,
      renderFidelity: {
        status: 'FAILED',
        coreRequiredFallbackCount: 1,
        requestRequiredFallbackCount: 1,
        optionalFallbackCount: 0
      },
      checks: expect.arrayContaining([
        expect.objectContaining({
          id: 'asset_intent_resolution',
          status: 'fail',
          reason: 'asset_intent_manifest.json has 2 core/request-required fallback asset(s).'
        })
      ])
    });
    expect(report.renderFidelity.status).not.toBe('PASSED');
  });

  it('derives render fidelity quality status from fallback and visual evidence', () => {
    const index = buildValidPipelineArtifactIndex({
      projectId,
      runId,
      compileFiles: [
        'game.scene.ir.json',
        'scene_ir_authority_report.json',
        'scene_ir_coverage_report.json',
        'runtime_scene_binding_report.json',
        'asset_plan.json',
        'asset_intent_manifest.json',
        'public/asset_manifest.json',
        'asset_resolution_report.json',
        'side_scrolling_run_and_gun/src/asset-manifest.generated.json',
        'asset_pipeline_report.json',
        'asset_library_usage_report.json',
        'asset_binding_trace_report.json',
        'semantic_extraction_trace_report.json',
        'semantic_model_report.json'
      ],
      buildLogPresent: true,
      qaReportPresent: true,
      renderFidelityReportPresent: true
    });
    const baseInput = {
      projectId,
      runId,
      artifactIndex: index,
      dslValidation: { valid: true, sourceArtifact: 'game_dsl.json' },
      dslConsumption: { ignoredAuthoritativeCount: 0, coverageRatio: 1 },
      runtimeSceneBinding: { status: 'pass' as const, unboundCount: 0 },
      generationInput: { projectId, runId, source: 'manual' },
      runtimeCapability: { status: 'supported' as const },
      assetLibraryUsage: { status: 'pass' as const },
      assetBindingTrace: { status: 'pass' as const }
    };
    const passed = buildPipelineAcceptanceReport({
      ...baseInput,
      assetIntentResolution: { coreRequiredFallbackCount: 0, requestRequiredFallbackCount: 0, optionalFallbackCount: 0 },
      renderFidelityQa: { status: 'PASSED' as const }
    });
    const optionalFallback = buildPipelineAcceptanceReport({
      ...baseInput,
      assetIntentResolution: { coreRequiredFallbackCount: 0, requestRequiredFallbackCount: 0, optionalFallbackCount: 2 },
      renderFidelityQa: { status: 'PASSED' as const }
    });
    const degraded = buildPipelineAcceptanceReport({
      ...baseInput,
      assetIntentResolution: { coreRequiredFallbackCount: 0, requestRequiredFallbackCount: 0, optionalFallbackCount: 0 },
      renderFidelityQa: { status: 'PASSED' as const },
      assetBindingTrace: { status: 'warn' }
    });
    const failed = buildPipelineAcceptanceReport({
      ...baseInput,
      assetIntentResolution: { coreRequiredFallbackCount: 0, requestRequiredFallbackCount: 1, optionalFallbackCount: 0 },
      renderFidelityQa: { status: 'PASSED' as const }
    });

    expect(passed.renderFidelity.status).toBe('PASSED');
    expect(optionalFallback.renderFidelity.status).toBe('PASSED_WITH_OPTIONAL_FALLBACKS');
    expect(degraded.renderFidelity.status).toBe('VISUALLY_DEGRADED');
    expect(failed.renderFidelity.status).toBe('FAILED');
    expect(failed.renderFidelity.status).not.toBe('PASSED');
    expect(() =>
      PipelineAcceptanceReportSchema.parse({
        ...failed,
        renderFidelity: { ...failed.renderFidelity, status: 'PASSED' }
      })
    ).toThrow();
  });

  it('fails render fidelity when the render fidelity report says requested effect failed', () => {
    const report = buildPipelineAcceptanceReport({
      projectId,
      runId,
      artifactIndex: buildValidPipelineArtifactIndex({
        projectId,
        runId,
        compileFiles: [
          'asset_intent_manifest.json',
          'asset_plan.json',
          'public/asset_manifest.json',
          'asset_resolution_report.json',
          'shooter/src/asset-manifest.generated.json',
          'asset_pipeline_report.json',
          'asset_library_usage_report.json',
          'asset_binding_trace_report.json',
          'semantic_extraction_trace_report.json',
          'semantic_model_report.json'
        ],
        buildLogPresent: true,
        qaReportPresent: true,
        renderFidelityReportPresent: true
      }),
      dslValidation: { valid: true, sourceArtifact: 'game_dsl.json' },
      dslConsumption: { ignoredAuthoritativeCount: 0, coverageRatio: 1 },
      assetIntentResolution: { coreRequiredFallbackCount: 0, requestRequiredFallbackCount: 0, optionalFallbackCount: 0 },
      renderFidelityQa: { status: 'FAILED' },
      generationInput: { projectId, runId, source: 'manual' },
      runtimeCapability: { status: 'supported' },
      assetLibraryUsage: { status: 'pass' },
      assetBindingTrace: { status: 'pass' }
    });

    expect(report.renderFidelity.status).toBe('FAILED');
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'render_fidelity_report',
          status: 'fail',
          reason: 'render_fidelity_report.json status is FAILED.'
        })
      ])
    );
  });

  it('fails render fidelity when the render fidelity report is unavailable', () => {
    const report = buildPipelineAcceptanceReport({
      projectId,
      runId,
      artifactIndex: buildValidPipelineArtifactIndex({
        projectId,
        runId,
        compileFiles: [
          'asset_intent_manifest.json',
          'asset_plan.json',
          'public/asset_manifest.json',
          'asset_resolution_report.json',
          'shooter/src/asset-manifest.generated.json',
          'asset_pipeline_report.json',
          'asset_library_usage_report.json',
          'asset_binding_trace_report.json',
          'semantic_extraction_trace_report.json',
          'semantic_model_report.json'
        ],
        buildLogPresent: true,
        qaReportPresent: true,
        renderFidelityReportPresent: false
      }),
      dslValidation: { valid: true, sourceArtifact: 'game_dsl.json' },
      dslConsumption: { ignoredAuthoritativeCount: 0, coverageRatio: 1 },
      assetIntentResolution: { coreRequiredFallbackCount: 0, requestRequiredFallbackCount: 0, optionalFallbackCount: 0 },
      renderFidelityQa: { status: 'PASSED' },
      generationInput: { projectId, runId, source: 'manual' },
      runtimeCapability: { status: 'supported' },
      assetLibraryUsage: { status: 'pass' },
      assetBindingTrace: { status: 'pass' }
    });

    expect(report.overallStatus).toBe('pass');
    expect(report.previewable).toBe(true);
    expect(report.renderFidelity.status).toBe('FAILED');
    expect(report.renderFidelity.reason).toBe('Render fidelity failed: render_fidelity_report.json status is unavailable.');
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'render_fidelity_report',
          status: 'fail',
          required: false,
          reason: 'render_fidelity_report.json status is unavailable.'
        })
      ])
    );
  });

  it('fails a side-scrolling run when runtime Scene IR binding has unbound nodes', () => {
    const report = buildPipelineAcceptanceReport({
      projectId,
      runId,
      artifactIndex: buildValidPipelineArtifactIndex({
        projectId,
        runId,
        compileFiles: [
          'game.scene.ir.json',
          'scene_ir_authority_report.json',
          'scene_ir_coverage_report.json',
          'runtime_scene_binding_report.json',
          'asset_intent_manifest.json',
          'asset_plan.json',
          'public/asset_manifest.json',
          'asset_resolution_report.json',
          'side_scrolling_run_and_gun/src/asset-manifest.generated.json',
          'asset_pipeline_report.json',
          'asset_library_usage_report.json',
          'asset_binding_trace_report.json',
          'semantic_extraction_trace_report.json',
          'semantic_model_report.json'
        ],
        buildLogPresent: true,
        qaReportPresent: true
      }),
      dslValidation: { valid: true, sourceArtifact: 'game_dsl.json' },
      dslConsumption: { ignoredAuthoritativeCount: 0, coverageRatio: 1 },
      assetIntentResolution: { coreRequiredFallbackCount: 0, requestRequiredFallbackCount: 0, optionalFallbackCount: 0 },
      runtimeSceneBinding: { status: 'fail', unboundCount: 2 },
      generationInput: { projectId, runId, source: 'manual' },
      runtimeCapability: { status: 'supported' },
      assetLibraryUsage: { status: 'pass' },
      assetBindingTrace: { status: 'pass' }
    });

    expect(report).toMatchObject({
      overallStatus: 'fail',
      previewable: false,
      checks: expect.arrayContaining([
        expect.objectContaining({
          id: 'runtime_scene_binding',
          status: 'fail',
          reason: 'runtime_scene_binding_report.json has 2 unbound scene node(s).'
        })
      ])
    });
  });

  it('fails a side-scrolling run when required Scene IR authority artifacts are missing', () => {
    const report = buildPipelineAcceptanceReport({
      projectId,
      runId,
      artifactIndex: buildValidPipelineArtifactIndex({
        projectId,
        runId,
        compileFiles: [
          'game.scene.ir.json',
          'runtime_scene_binding_report.json',
          'asset_intent_manifest.json',
          'asset_plan.json',
          'public/asset_manifest.json',
          'asset_resolution_report.json',
          'side_scrolling_run_and_gun/src/asset-manifest.generated.json',
          'asset_pipeline_report.json',
          'asset_library_usage_report.json',
          'asset_binding_trace_report.json',
          'semantic_extraction_trace_report.json',
          'semantic_model_report.json'
        ],
        buildLogPresent: true,
        qaReportPresent: true
      }),
      dslValidation: { valid: true, sourceArtifact: 'game_dsl.json' },
      dslConsumption: { ignoredAuthoritativeCount: 0, coverageRatio: 1 },
      assetIntentResolution: { coreRequiredFallbackCount: 0, requestRequiredFallbackCount: 0, optionalFallbackCount: 0 },
      runtimeSceneBinding: { status: 'pass', unboundCount: 0 },
      generationInput: { projectId, runId, source: 'manual' },
      runtimeCapability: { status: 'supported' },
      assetLibraryUsage: { status: 'pass' },
      assetBindingTrace: { status: 'pass' }
    });

    expect(report).toMatchObject({
      overallStatus: 'fail',
      previewable: false,
      checkedArtifacts: expect.arrayContaining([
        expect.objectContaining({ artifactId: 'sceneIrAuthorityReport', status: 'missing', required: true }),
        expect.objectContaining({ artifactId: 'sceneIrCoverageReport', status: 'missing', required: true })
      ]),
      checks: expect.arrayContaining([
        expect.objectContaining({
          id: 'required_artifacts',
          status: 'fail',
          reason: 'pipeline_artifact_index has 2 required artifact ref(s) not present: sceneIrAuthorityReport, sceneIrCoverageReport.'
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
        'asset_binding_trace_report.json',
        'semantic_extraction_trace_report.json',
        'semantic_model_report.json'
      ],
      buildLogPresent: true,
      qaReportPresent: true
    });
    const unavailable = buildPipelineAcceptanceReport({
      projectId,
      runId,
      artifactIndex: index,
      dslValidation: { valid: true, sourceArtifact: 'game_dsl.json' },
      dslConsumption: { ignoredAuthoritativeCount: 0, coverageRatio: 1 },
      generationInput: { projectId, runId, source: 'manual' },
      assetLibraryUsage: { status: 'pass' }
    });
    const failed = buildPipelineAcceptanceReport({
      projectId,
      runId,
      artifactIndex: index,
      dslValidation: { valid: true, sourceArtifact: 'game_dsl.json' },
      dslConsumption: { ignoredAuthoritativeCount: 0, coverageRatio: 1 },
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
