import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AssetPipelineReportSchema, writeAssetPipelineReport, type AssetPipelineReport } from '../../apps/maker-api/src/compiler/asset-pipeline-report.js';
import { AssetLibraryUsageReportSchema, writeAssetLibraryUsageReport, type AssetLibraryUsageReport } from '../../apps/maker-api/src/compiler/asset-library-usage-report.js';
import { AssetBindingTraceReportSchema, writeAssetBindingTraceReport, type AssetBindingTraceReport } from '../../apps/maker-api/src/compiler/asset-binding-trace-report.js';
import type { RuntimeCompileResult } from '../../apps/maker-api/src/compiler/compiler.types.js';
import { GenerationPipelineService } from '../../apps/maker-api/src/projects/generation-pipeline.service.js';
import { ProjectStoreService } from '../../apps/maker-api/src/projects/project-store.service.js';
import { PromptCoachService } from '../../apps/maker-api/src/projects/prompt-coach.service.js';
import { ProjectsService } from '../../apps/maker-api/src/projects/projects.service.js';
import { RunStoreService } from '../../apps/maker-api/src/projects/run-store.service.js';
import { DslLiveEditService } from '../../apps/maker-api/src/projects/dsl-live-edit.service.js';
import { LocalWorkspaceService } from '../../apps/maker-api/src/workspace/local-workspace.service.js';
import { buildPipelineAcceptanceView } from '../../apps/maker-workbench/src/pipeline-acceptance-client.js';
import { buildPipelineEvidenceView } from '../../apps/maker-workbench/src/pipeline-evidence-client.js';
import type { QaGenre, QaReport } from '../../apps/maker-api/src/qa/qa.types.js';
import { AssetManifestSchema, buildAssetPlanFromIr } from '../../packages/asset-pipeline/src/index.js';
import { GameBriefSchema, RawGameDslSchema, type NormalizedGameIr, type RawGameDsl } from '../../packages/game-dsl/src/index.js';
import type { PipelineAcceptanceReport } from '../../apps/maker-api/src/projects/pipeline-acceptance-report.js';
import type { PipelineArtifactIndex } from '../../apps/maker-api/src/projects/pipeline-artifact-index.js';
import type { GenerationInputReport } from '../../apps/maker-api/src/projects/generation-input-report.js';
import { createShooterRawDsl } from '../contracts/fixtures.js';

describe('Pipeline golden trace', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-golden-trace-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('produces a verifiable prompt-coach-to-acceptance pipeline trace', async () => {
    const trace = await createGoldenTrace('proj_20260615_trace_valid_a');

    expect(trace.prepared.report).toMatchObject({
      reportVersion: 'prompt_optimization_report.v1',
      projectId: trace.sourceProjectId,
      originalPrompt: trace.originalPrompt,
      mode: 'mock',
      strategy: 'mock-v1',
      status: 'prepared',
      applied: false
    });
    expect(trace.prepared.artifacts).toEqual([
      expect.objectContaining({ id: 'promptOptimizationReport', path: expect.stringContaining('prompt_optimization_report.json') }),
      expect.objectContaining({ id: 'optimizedPrompt', path: expect.stringContaining('optimized_prompt.txt') })
    ]);
    await expect(readFile(trace.promptReportPath, 'utf8')).resolves.toContain('"prompt_optimization_report.v1"');
    expect((await readFile(trace.optimizedPromptPath, 'utf8')).trimEnd()).toBe(trace.prepared.report.optimizedPrompt);
    await expect(trace.projectStore.readProject(trace.sourceProjectId)).resolves.toMatchObject({ idea: trace.originalPrompt });

    expect(trace.generationInput).toMatchObject({
      reportVersion: 'generation_input_report.v1',
      projectId: trace.generated.project_id,
      runId: trace.generated.run_id,
      source: 'prompt-coach-candidate',
      effectivePrompt: trace.prepared.report.optimizedPrompt,
      promptOptimizationRef: {
        projectId: trace.sourceProjectId,
        optimizationId: trace.prepared.report.optimizationId,
        reportPath: `prompt-optimizations/${trace.prepared.report.optimizationId}/prompt_optimization_report.json`,
        optimizedPromptPath: `prompt-optimizations/${trace.prepared.report.optimizationId}/optimized_prompt.txt`
      },
      candidatePromptMatchesEffectivePrompt: true
    });
    expect(JSON.stringify(trace.generationInput)).not.toContain('intentSummary');
    expect(JSON.stringify(trace.generationInput)).not.toContain('dslFitWarnings');

    expect(trace.gameDsl).toMatchObject({ artifactKind: 'game_dsl', schemaVersion: 'game_dsl.v1', runId: trace.generated.run_id });
    expect(trace.dslValidation).toMatchObject({
      artifactKind: 'dsl_validation_report',
      schemaVersion: 'dsl_validation_report.v1',
      status: 'valid',
      valid: true,
      stableIdSummary: expect.objectContaining({ duplicateIds: [] }),
      objectCounts: expect.objectContaining({ player: 1, enemyTypes: 1, projectiles: 1, waves: 1 })
    });
    expect(trace.assetPipelineReport).toMatchObject({
      version: 'asset-pipeline-report-v0.1',
      projectId: trace.generated.project_id,
      templateId: 'shooter_v1',
      checks: {
        publicManifestMatchesPreviewManifest: true,
        catalogIdentityMatchesPreviewManifest: true,
        previewManifestConsumedByTemplate: true,
        assetFilesListedInCompileResult: true
      },
      artifacts: {
        assetPlan: 'asset_plan.json',
        publicManifest: 'public/asset_manifest.json',
        previewManifest: 'shooter/src/asset-manifest.generated.json',
        resolutionReport: 'asset_resolution_report.json'
      }
    });
    expect(trace.assetManifest.assets.every((asset) => asset.catalogRef?.source === 'local-template')).toBe(true);
    expect(trace.assetLibraryUsageReport.usedAssets.every((asset) => asset.catalogAssetId !== null && asset.status === 'matched')).toBe(true);
    expect(trace.assetBindingTraceReport).toMatchObject({
      reportVersion: 'asset-binding-trace-report.v1',
      projectId: trace.generated.project_id,
      runId: trace.generated.run_id,
      status: 'pass',
      errors: []
    });
    expect(trace.assetBindingTraceReport.traces.length).toBeGreaterThanOrEqual(trace.assetManifest.assets.length);
    expect(trace.assetBindingTraceReport.traces.every((row) => row.source === 'local-template' && row.catalogAssetId !== null && row.catalogVersion === 'template_asset_catalog.v1')).toBe(true);
    expectNoSensitiveTraceText(trace.assetBindingTraceReport);
    await expect(readFile(join(trace.workspace.getGeneratedProjectDir(trace.generated.project_id), 'asset_plan.json'), 'utf8')).resolves.toContain('"asset-plan-v0.1"');
    await expect(readFile(join(trace.workspace.getGeneratedProjectDir(trace.generated.project_id), 'public', 'asset_manifest.json'), 'utf8')).resolves.toContain('"asset-manifest-v0.1"');
    await expect(readFile(join(trace.workspace.getGeneratedProjectDir(trace.generated.project_id), 'asset_resolution_report.json'), 'utf8')).resolves.toContain('"asset-resolution-report-v0.1"');
    await expect(readFile(join(trace.workspace.getGeneratedProjectDir(trace.generated.project_id), 'asset_binding_trace_report.json'), 'utf8')).resolves.toContain('"asset-binding-trace-report.v1"');

    expect(trace.index.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'generationInputReport', status: 'present', path: 'generation_input_report.json' }),
        expect.objectContaining({ id: 'gameDsl', status: 'present', path: 'game_dsl.json' }),
        expect.objectContaining({ id: 'dslValidationReport', status: 'present', path: 'dsl_validation_report.json' }),
        expect.objectContaining({ id: 'runtimeCapabilityReport', status: 'present', path: 'runtime_capability_report.json' }),
        expect.objectContaining({ id: 'assetPlan', status: 'present', path: 'asset_plan.json' }),
        expect.objectContaining({ id: 'publicAssetManifest', status: 'present', path: 'public/asset_manifest.json' }),
        expect.objectContaining({ id: 'phaserPreviewManifest', status: 'present', path: 'shooter/src/asset-manifest.generated.json' }),
        expect.objectContaining({ id: 'assetResolutionReport', status: 'present', path: 'asset_resolution_report.json' }),
        expect.objectContaining({ id: 'assetPipelineReport', status: 'present', path: 'asset_pipeline_report.json' }),
        expect.objectContaining({ id: 'assetLibraryUsageReport', status: 'present', path: 'asset_library_usage_report.json' }),
        expect.objectContaining({ id: 'assetBindingTraceReport', status: 'present', path: 'asset_binding_trace_report.json' }),
        expect.objectContaining({ id: 'pipelineAcceptanceReport', status: 'present', path: 'pipeline_acceptance_report.json' }),
        expect.objectContaining({ id: 'pipelineArtifactIndex', status: 'present', path: 'pipeline_artifact_index.json' })
      ])
    );
    for (const artifact of trace.index.artifacts) {
      expect(isSafeRelativePath(artifact.path)).toBe(true);
    }

    expect(trace.acceptance).toMatchObject({
      reportVersion: 'pipeline_acceptance_report.v1',
      projectId: trace.generated.project_id,
      runId: trace.generated.run_id,
      overallStatus: 'pass',
      previewable: true
    });
    expect(trace.acceptance.checks.filter((check) => check.required && check.status === 'fail')).toEqual([]);
    expect(trace.acceptance.errors).toEqual([]);
    expect(trace.acceptance.checks.map((check) => check.id)).toEqual([
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
    expectNoSensitiveTraceText(trace.index, trace.acceptance);

    await expect(trace.service.getPipelineArtifacts(trace.generated.project_id, trace.generated.run_id)).resolves.toMatchObject({
      pipeline_artifact_index: { projectId: trace.generated.project_id, runId: trace.generated.run_id }
    });
    await expect(trace.service.getPipelineAcceptance(trace.generated.project_id, trace.generated.run_id)).resolves.toMatchObject({
      pipeline_acceptance_report: { projectId: trace.generated.project_id, runId: trace.generated.run_id }
    });
    await expect(trace.service.getPipelineArtifacts('proj_other', trace.generated.run_id)).rejects.toThrow('run does not belong to project');
    await expect(trace.service.getPipelineAcceptance('proj_other', trace.generated.run_id)).rejects.toThrow('run does not belong to project');

    expect(group(trace.evidenceView, 'Prompt / Provenance')?.artifacts.map((artifact) => artifact.id)).toContain('generationInputReport');
    expect(group(trace.evidenceView, 'DSL')?.artifacts.map((artifact) => artifact.id)).toEqual(
      expect.arrayContaining(['gameDsl', 'dslValidationReport'])
    );
    expect(group(trace.evidenceView, 'Runtime')?.artifacts.map((artifact) => artifact.id)).toContain('runtimeCapabilityReport');
    expect(group(trace.evidenceView, 'Assets')?.artifacts.map((artifact) => artifact.id)).toEqual(
      expect.arrayContaining(['assetPlan', 'publicAssetManifest', 'phaserPreviewManifest', 'assetResolutionReport', 'assetPipelineReport', 'assetLibraryUsageReport', 'assetBindingTraceReport'])
    );
    expect(group(trace.evidenceView, 'Build / QA / Preview')?.artifacts.map((artifact) => artifact.id)).toEqual(
      expect.arrayContaining(['pipelineAcceptanceReport', 'pipelineArtifactIndex'])
    );
    expect(trace.acceptanceView).toMatchObject({
      status: 'ready',
      overallStatus: 'pass',
      previewable: true,
      requiredFailCount: 0
    });
    expect(JSON.stringify(trace.evidenceView)).not.toContain(root);
    expect(JSON.stringify(trace.acceptanceView)).not.toContain(root);
  });

  it('keeps normalized golden trace summaries deterministic across repeated equivalent runs', async () => {
    const first = await createGoldenTrace('proj_20260615_trace_determinism_a');
    const second = await createGoldenTrace('proj_20260615_trace_determinism_b');

    expect(first.summary).toEqual(second.summary);
  });

  it('produces a fail acceptance trace for invalid DSL without stale downstream artifacts', async () => {
    const trace = await createInvalidDslTrace('proj_20260615_trace_invalid', 'run_20260615_trace_invalid');

    expect(trace.generationInput).toMatchObject({
      reportVersion: 'generation_input_report.v1',
      source: 'manual',
      effectivePrompt: 'cat shooter'
    });
    expect(trace.candidate).toMatchObject({
      artifactKind: 'game_dsl',
      schemaVersion: 'game_dsl.v1',
      player: { actions: [expect.objectContaining({ projectileRef: 'ghost_projectile' })] }
    });
    expect(trace.dslValidation).toMatchObject({
      sourceArtifact: 'game_dsl.candidate.json',
      status: 'invalid',
      valid: false
    });
    expect(trace.index.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'generationInputReport', status: 'present', path: 'generation_input_report.json' }),
        expect.objectContaining({ id: 'gameDslCandidate', status: 'present', path: 'game_dsl.candidate.json' }),
        expect.objectContaining({ id: 'dslValidationReport', status: 'present', path: 'dsl_validation_report.json' }),
        expect.objectContaining({ id: 'runtimeCapabilityReport', status: 'skipped' }),
        expect.objectContaining({ id: 'assetPipelineReport', status: 'skipped' }),
        expect.objectContaining({ id: 'assetLibraryUsageReport', status: 'skipped' }),
        expect.objectContaining({ id: 'assetBindingTraceReport', status: 'skipped' }),
        expect.objectContaining({ id: 'pipelineAcceptanceReport', status: 'present', path: 'pipeline_acceptance_report.json' }),
        expect.objectContaining({ id: 'pipelineArtifactIndex', status: 'present', path: 'pipeline_artifact_index.json' })
      ])
    );
    expect(trace.acceptance).toMatchObject({
      overallStatus: 'fail',
      previewable: false,
      checks: expect.arrayContaining([
        expect.objectContaining({ id: 'dsl_validation', status: 'fail' }),
        expect.objectContaining({ id: 'asset_pipeline', status: 'skipped' }),
        expect.objectContaining({ id: 'asset_library_usage', status: 'skipped' }),
        expect.objectContaining({ id: 'asset_binding_trace', status: 'skipped' })
      ])
    });
    expect(JSON.stringify(trace.index)).not.toContain('stale_asset_pipeline_report');
    expect(JSON.stringify(trace.acceptance)).not.toContain('stale_asset_pipeline_report');
    expect(JSON.stringify(trace.index)).not.toContain('stale_asset_library_usage_report');
    expect(JSON.stringify(trace.acceptance)).not.toContain('stale_asset_library_usage_report');
    expect(JSON.stringify(trace.index)).not.toContain('stale_asset_binding_trace_report');
    expect(JSON.stringify(trace.acceptance)).not.toContain('stale_asset_binding_trace_report');
    expectNoSensitiveTraceText(trace.index, trace.acceptance);
  });

  async function createGoldenTrace(idPrefix: string) {
    const workspace = new LocalWorkspaceService(root);
    const projectStore = new ProjectStoreService(workspace);
    const runStore = new RunStoreService(workspace);
    const sourceProjectId = `${idPrefix}_source`;
    const sourceRunId = `run_${idPrefix.replace(/^proj_/, '')}_source`;
    const generatedProjectId = `${idPrefix}_generated`;
    const generatedRunId = `run_${idPrefix.replace(/^proj_/, '')}_generated`;
    const originalPrompt = 'make a multiplayer 3D cat shooter with online leaderboard';
    const rawDsl = RawGameDslSchema.parse(createShooterRawDsl());
    const service = createProjectsService({
      workspace,
      projectStore,
      runStore,
      generatedProjectId,
      generatedRunId,
      rawDsl
    });

    await projectStore.createProject({ projectId: sourceProjectId, runId: sourceRunId, idea: originalPrompt, language: 'en' });
    const sourceRun = await runStore.createRun({ projectId: sourceProjectId, runId: sourceRunId });
    await projectStore.writeLatestRun(sourceProjectId, sourceRun);

    const prepared = await service.preparePromptOptimization(sourceProjectId, {
      originalPrompt,
      runId: sourceRunId,
      mode: 'mock'
    });
    const generated = await service.generateProject({
      idea: prepared.report.optimizedPrompt,
      language: 'en',
      promptOptimizationProjectId: sourceProjectId,
      promptOptimizationId: prepared.report.optimizationId
    });

    const promptReportPath = workspace.getProjectPromptOptimizationArtifactPath(sourceProjectId, prepared.report.optimizationId, 'prompt_optimization_report.json');
    const optimizedPromptPath = workspace.getProjectPromptOptimizationArtifactPath(sourceProjectId, prepared.report.optimizationId, 'optimized_prompt.txt');
    const generationInput = (await readModelJson(workspace, generated.project_id, generated.run_id, 'generation_input_report.json')) as GenerationInputReport;
    const gameDsl = await readModelJson(workspace, generated.project_id, generated.run_id, 'game_dsl.json');
    const dslValidation = (await readModelJson(workspace, generated.project_id, generated.run_id, 'dsl_validation_report.json')) as DslValidationTrace;
    const index = (await readModelJson(workspace, generated.project_id, generated.run_id, 'pipeline_artifact_index.json')) as PipelineArtifactIndex;
    const acceptance = (await readModelJson(workspace, generated.project_id, generated.run_id, 'pipeline_acceptance_report.json')) as PipelineAcceptanceReport;
    const assetPipelineReport = AssetPipelineReportSchema.parse(
      JSON.parse(await readFile(join(workspace.getGeneratedProjectDir(generated.project_id), 'asset_pipeline_report.json'), 'utf8'))
    );
    const assetManifest = AssetManifestSchema.parse(
      JSON.parse(await readFile(join(workspace.getGeneratedProjectDir(generated.project_id), 'public', 'asset_manifest.json'), 'utf8'))
    );
    const assetLibraryUsageReport = AssetLibraryUsageReportSchema.parse(
      JSON.parse(await readFile(join(workspace.getGeneratedProjectDir(generated.project_id), 'asset_library_usage_report.json'), 'utf8'))
    );
    const assetBindingTraceReport = AssetBindingTraceReportSchema.parse(
      JSON.parse(await readFile(join(workspace.getGeneratedProjectDir(generated.project_id), 'asset_binding_trace_report.json'), 'utf8'))
    );
    const evidenceView = buildPipelineEvidenceView(index);
    const acceptanceView = buildPipelineAcceptanceView(acceptance);

    return {
      workspace,
      projectStore,
      service,
      sourceProjectId,
      originalPrompt,
      prepared,
      generated,
      promptReportPath,
      optimizedPromptPath,
      generationInput,
      gameDsl,
      dslValidation,
      assetPipelineReport,
      assetManifest,
      assetLibraryUsageReport,
      assetBindingTraceReport,
      index,
      acceptance,
      evidenceView,
      acceptanceView,
      summary: summarizeTrace({ generationInput, dslValidation, index, acceptance })
    };
  }

  async function createInvalidDslTrace(projectId: string, runId: string) {
    const workspace = new LocalWorkspaceService(root);
    const projectStore = new ProjectStoreService(workspace);
    const runStore = new RunStoreService(workspace);
    await projectStore.createProject({ projectId, runId, idea: 'cat shooter', language: 'en' });
    const run = await runStore.createRun({ projectId, runId });
    await projectStore.writeLatestRun(projectId, run);
    await mkdir(workspace.getGeneratedProjectDir(projectId), { recursive: true });
    await writeFile(join(workspace.getGeneratedProjectDir(projectId), 'asset_pipeline_report.json'), 'stale_asset_pipeline_report', 'utf8');
    await writeFile(join(workspace.getGeneratedProjectDir(projectId), 'asset_library_usage_report.json'), 'stale_asset_library_usage_report', 'utf8');
    await writeFile(join(workspace.getGeneratedProjectDir(projectId), 'asset_binding_trace_report.json'), 'stale_asset_binding_trace_report', 'utf8');

    const rawDsl = {
      ...RawGameDslSchema.parse(createShooterRawDsl()),
      player: {
        ...createShooterRawDsl().player,
        actions: [{ id: 'fire', type: 'shoot_projectile', cooldown_ms: 300, spawns: 'ghost_projectile' }]
      }
    } as RawGameDsl;
    const pipeline = createPipeline({ workspace, projectStore, runStore, rawDsl });
    await expect(pipeline.run({ projectId, runId, idea: 'cat shooter', language: 'en' })).resolves.toBe('DSL_VALIDATION_FAILED');

    return {
      generationInput: (await readModelJson(workspace, projectId, runId, 'generation_input_report.json')) as GenerationInputReport,
      candidate: await readModelJson(workspace, projectId, runId, 'game_dsl.candidate.json'),
      dslValidation: await readModelJson(workspace, projectId, runId, 'dsl_validation_report.json'),
      index: (await readModelJson(workspace, projectId, runId, 'pipeline_artifact_index.json')) as PipelineArtifactIndex,
      acceptance: (await readModelJson(workspace, projectId, runId, 'pipeline_acceptance_report.json')) as PipelineAcceptanceReport
    };
  }
});

function createProjectsService(input: {
  workspace: LocalWorkspaceService;
  projectStore: ProjectStoreService;
  runStore: RunStoreService;
  generatedProjectId: string;
  generatedRunId: string;
  rawDsl: RawGameDsl;
}): ProjectsService {
  return new ProjectsService(
    input.projectStore,
    input.runStore,
    input.workspace,
    new DslLiveEditService(input.workspace),
    createPipeline(input),
    new PromptCoachService(input.workspace),
    () => ({ projectId: input.generatedProjectId, runId: input.generatedRunId })
  );
}

function createPipeline(input: {
  workspace: LocalWorkspaceService;
  projectStore: ProjectStoreService;
  runStore: RunStoreService;
  rawDsl: RawGameDsl;
}): GenerationPipelineService {
  return new GenerationPipelineService(
    input.projectStore,
    input.runStore,
    input.workspace,
    createModelProvider(input.workspace, input.rawDsl),
    {
      async compile(compileInput) {
        return await compileWithArtifactFiles(input.workspace, compileInput.projectId, compileInput.runId, compileInput.ir);
      }
    },
    {
      async build(buildInput) {
        await writeTextFile(input.workspace.getBuildLogPath(buildInput.projectId, buildInput.runId), 'vite build ok');
        return {
          ok: true,
          projectId: buildInput.projectId,
          distDir: input.workspace.getGeneratedProjectDistDir(buildInput.projectId),
          logPath: input.workspace.getBuildLogPath(buildInput.projectId, buildInput.runId)
        };
      }
    },
    {
      async run(qaInput: { projectId: string; runId: string; genre: QaGenre }) {
        return createQaReport(qaInput);
      }
    },
    { enabled: false, maxAttempts: 1 }
  );
}

function createModelProvider(workspace: LocalWorkspaceService, rawDsl: RawGameDsl) {
  const brief = GameBriefSchema.parse({
    brief_version: 'game-brief-v0.1',
    title: rawDsl.metadata.title,
    genre: rawDsl.game.genre,
    camera: rawDsl.game.camera,
    core_loop: [rawDsl.metadata.description, 'Use the generated mechanics to satisfy the objective.'],
    difficulty: rawDsl.game.difficulty,
    target_play_time_sec: rawDsl.game.target_play_time_sec
  });

  return {
    async generateGameBrief(input: { projectId: string; runId: string }) {
      return {
        ok: true as const,
        value: brief,
        rawText: '{}',
        rawOutputPath: workspace.getModelOutputPath(input.projectId, input.runId, 'game-brief.raw.json')
      };
    },
    async generateRawGameDsl(input: { projectId: string; runId: string }) {
      return {
        ok: true as const,
        value: rawDsl,
        rawText: JSON.stringify(rawDsl),
        rawOutputPath: workspace.getModelOutputPath(input.projectId, input.runId, 'raw-game-dsl.raw.json')
      };
    }
  };
}

async function compileWithArtifactFiles(workspace: LocalWorkspaceService, projectId: string, runId: string, ir: NormalizedGameIr): Promise<RuntimeCompileResult> {
  const distDir = workspace.getGeneratedProjectDistDir(projectId);
  await mkdir(distDir, { recursive: true });
  await writeFile(join(distDir, 'index.html'), '<html></html>', 'utf8');
  const files = await writeAssetPipelineArtifacts(workspace, projectId, runId, ir);
  return {
    ok: true,
    projectId,
    outputDir: workspace.getGeneratedProjectDir(projectId),
    distDir,
    templateId: 'shooter_v1',
    files
  };
}

async function writeAssetPipelineArtifacts(workspace: LocalWorkspaceService, projectId: string, runId: string, ir: NormalizedGameIr): Promise<string[]> {
  const outputDir = workspace.getGeneratedProjectDir(projectId);
  const plan = buildAssetPlanFromIr(projectId, ir);
  const assetsDir = join(outputDir, 'public', 'assets');
  await mkdir(assetsDir, { recursive: true });
  await mkdir(join(outputDir, 'shooter', 'src'), { recursive: true });
  await writeFile(join(outputDir, 'asset_plan.json'), `${JSON.stringify(plan, null, 2)}\n`, 'utf8');

  const sourcePack = 'kenney-tiny-shooter-tanks';
  const assets = plan.items.map((item) => ({
    id: item.id,
    loadKey: `agm.${item.id}`,
    role: item.role,
    type: 'image' as const,
    format: 'svg' as const,
    path: `assets/${item.id}.svg`,
    source: 'local_asset_pack' as const,
    sourcePack,
    licenseId: 'CC0-1.0',
    licenseName: 'Creative Commons CC0 1.0 Universal',
    attribution: 'test golden trace',
    sourceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    catalogRef: {
      catalogVersion: 'template_asset_catalog.v1' as const,
      catalogAssetId: `local-pack:${sourcePack}:${item.id}`,
      source: 'local-template' as const
    },
    required: item.required,
    status: 'ready' as const,
    size: item.size
  }));
  const manifest = AssetManifestSchema.parse({
    version: 'asset-manifest-v0.1',
    projectId,
    strict: true,
    assets,
    summary: {
      required: assets.filter((asset) => asset.required).length,
      ready: assets.length,
      fallback_used: 0,
      missing: 0,
      placeholder_used: 0
    }
  });
  const assetFiles = manifest.assets.map((asset) => `public/${asset.path}`);

  for (const asset of manifest.assets) {
    await writeFile(join(outputDir, 'public', asset.path), '<svg xmlns="http://www.w3.org/2000/svg"></svg>\n', 'utf8');
  }
  await writeFile(join(outputDir, 'public', 'asset_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeFile(join(outputDir, 'shooter', 'src', 'asset-manifest.generated.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeFile(
    join(outputDir, 'shooter', 'src', 'main.ts'),
    [
      "import generatedAssetManifest from './asset-manifest.generated.json';",
      "import { createShooterArtRuntime } from './shooter-art-library.js';",
      'const shooterArt = createShooterArtRuntime(generatedAssetManifest);',
      'shooterArt.preload(this);'
    ].join('\n'),
    'utf8'
  );
  await writeFile(
    join(outputDir, 'asset_resolution_report.json'),
    `${JSON.stringify({ version: 'asset-resolution-report-v0.1', projectId, summary: { selectedProvider: 'template_svg', fallbackUsed: false }, assets: [] }, null, 2)}\n`,
    'utf8'
  );

  const compileFiles = ['asset_plan.json', 'public/asset_manifest.json', 'asset_resolution_report.json', 'shooter/src/asset-manifest.generated.json', ...assetFiles, 'asset_pipeline_report.json'];
  await writeAssetPipelineReport({ projectId, templateId: 'shooter_v1', genre: 'shooter', outputDir, compileFiles });
  await writeAssetLibraryUsageReport({
    projectId,
    runId,
    genre: 'shooter',
    outputDir,
    workspaceRoot: workspace.getRootDir(),
    catalog: {
      catalogVersion: 'template_asset_catalog.v1',
      entries: assets.map((asset) => ({
        id: asset.catalogRef.catalogAssetId,
        kind: asset.role === 'background' ? ('background' as const) : ('sprite' as const),
        source: 'local-template' as const,
        relativePath: `assets/asset-packs/${sourcePack}/${asset.id}.svg`,
        tags: [asset.role],
        supportedGenres: ['shooter'],
        purpose: asset.role,
        required: asset.required
      }))
    }
  });
  await writeAssetBindingTraceReport({ projectId, runId, genre: 'shooter', outputDir });
  return [...compileFiles, 'asset_library_usage_report.json', 'asset_binding_trace_report.json', 'pipeline_artifact_index.json'];
}

function createQaReport(input: { projectId: string; runId: string; genre: QaGenre }): QaReport {
  const now = new Date().toISOString();
  return {
    status: 'PASSED',
    runtime_status: 'PASSED',
    asset_semantic_status: 'PASSED',
    overall_status: 'PLAYABLE',
    project_id: input.projectId,
    run_id: input.runId,
    genre: input.genre,
    preview_url: 'http://localhost/preview/index.html',
    seed: 'golden',
    required_events: { all: [], any_groups: [] },
    observed_events: [],
    missing_events: [],
    missing_any_groups: [],
    console_errors: [],
    started_at: now,
    completed_at: now
  };
}

function summarizeTrace(input: {
  generationInput: GenerationInputReport;
  dslValidation: DslValidationTrace;
  index: PipelineArtifactIndex;
  acceptance: PipelineAcceptanceReport;
}) {
  return {
    artifactIds: input.index.artifacts.map((artifact) => artifact.id),
    artifactStatuses: input.index.artifacts.map((artifact) => `${artifact.id}:${artifact.status}:${artifact.required ? 'required' : 'optional'}`),
    acceptanceCheckIds: input.acceptance.checks.map((check) => check.id),
    acceptanceStatuses: input.acceptance.checks.map((check) => `${check.id}:${check.status}:${check.required ? 'required' : 'optional'}`),
    generationInputSource: input.generationInput.source,
    dslValid: input.dslValidation.valid,
    previewable: input.acceptance.previewable
  };
}

type DslValidationTrace = {
  valid?: unknown;
};

function group(view: ReturnType<typeof buildPipelineEvidenceView>, title: string) {
  return view.groups.find((candidate) => candidate.title === title);
}

function isSafeRelativePath(path: string): boolean {
  return (
    path.length > 0 &&
    !path.startsWith('/') &&
    !/^[A-Za-z]:\//.test(path) &&
    !/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(path) &&
    !path.includes('\\') &&
    !path.split('/').includes('..')
  );
}

function expectNoSensitiveTraceText(...values: unknown[]): void {
  const serialized = JSON.stringify(values);
  expect(serialized).not.toContain('/Users/');
  expect(serialized).not.toContain('/tmp/');
  expect(serialized).not.toContain('DEEPSEEK_API_KEY');
  expect(serialized).not.toContain('OPENAI_API_KEY');
  expect(serialized).not.toContain('raw provider');
}

async function readModelJson(workspace: LocalWorkspaceService, projectId: string, runId: string, fileName: string): Promise<unknown> {
  return JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, fileName), 'utf8'));
}

async function writeTextFile(path: string, value: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, 'utf8');
}
