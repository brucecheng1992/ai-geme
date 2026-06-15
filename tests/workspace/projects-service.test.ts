import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ProjectRequestError } from '../../apps/maker-api/src/projects/project-request.error.js';
import { PromptCoachService } from '../../apps/maker-api/src/projects/prompt-coach.service.js';
import { ProjectStoreService } from '../../apps/maker-api/src/projects/project-store.service.js';
import { createProjectRunIds, ProjectsService } from '../../apps/maker-api/src/projects/projects.service.js';
import { RunStoreService } from '../../apps/maker-api/src/projects/run-store.service.js';
import { LocalWorkspaceService } from '../../apps/maker-api/src/workspace/local-workspace.service.js';
import { DslLiveEditService } from '../../apps/maker-api/src/projects/dsl-live-edit.service.js';
import { buildGameDslArtifact, buildRuntimeCapabilityReport, RawGameDslSchema, type GameDslArtifact } from '../../packages/game-dsl/src/index.js';
import { createShooterRawDsl } from '../contracts/fixtures.js';

describe('ProjectsService', () => {
  let root: string;
  let projectStore: ProjectStoreService;
  let runStore: RunStoreService;
  let workspace: LocalWorkspaceService;
  let service: ProjectsService;
  let liveEdit: DslLiveEditService;
  let pipelineRuns: number;
  let lastPipelineInput: unknown;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-api-'));
    workspace = new LocalWorkspaceService(root);
    projectStore = new ProjectStoreService(workspace);
    runStore = new RunStoreService(workspace);
    liveEdit = new DslLiveEditService(workspace);
    pipelineRuns = 0;
    lastPipelineInput = undefined;
    service = new ProjectsService(
      projectStore,
      runStore,
      workspace,
      liveEdit,
      {
        async run(input: unknown) {
          pipelineRuns += 1;
          lastPipelineInput = input;
          return 'CREATED';
        }
      },
      new PromptCoachService(workspace, {
        llm: {
          enabled: true,
          async optimize() {
            return {
              ok: true,
              json: {
                optimizedPrompt: 'Use a 2D cat shooter.',
                intentSummary: 'cat shooter',
                dslFitWarnings: [],
                unsupportedRequests: [],
                suggestedQuestions: ['What is the win condition?'],
                capabilitiesUsed: ['llm-json-prompt-coaching']
              }
            };
          }
        }
      }),
      () => ({
        projectId: 'proj_20260609_153000_abcd',
        runId: 'run_20260609_153000_0001'
      })
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('creates a CREATED project and exposes project status plus events', async () => {
    const created = await service.generateProject({
      idea: '做一个小猫射击外星人的小游戏',
      language: 'zh'
    });

    expect(created).toEqual({
      ok: true,
      project_id: 'proj_20260609_153000_abcd',
      run_id: 'run_20260609_153000_0001',
      status: 'CREATED'
    });
    await expect(service.getProject(created.project_id)).resolves.toMatchObject({
      ok: true,
      project: {
        project_id: created.project_id,
        idea: '做一个小猫射击外星人的小游戏',
        language: 'zh',
        status: 'CREATED',
        latest_run_id: created.run_id
      },
      latest_run: {
        run_id: created.run_id,
        project_id: created.project_id,
        status: 'CREATED',
        steps: []
      }
    });
    await expect(service.getRunEvents(created.project_id, created.run_id)).resolves.toMatchObject({
      ok: true,
      events: [{ type: 'job.started', message: 'Project generation job created.' }]
    });
  });

  it('rejects invalid generate requests at the API boundary service layer', async () => {
    await expect(service.generateProject({ idea: '', language: 'zh' })).rejects.toThrow(ProjectRequestError);
    await expect(service.generateProject({ idea: 'cat shooter' })).rejects.toThrow(ProjectRequestError);
    await expect(service.generateProject(null)).rejects.toThrow(ProjectRequestError);

    await expect(service.generateProject({ idea: '', language: 'zh' })).rejects.toMatchObject({
      status: 400
    });
  });

  it('prepares prompt optimization artifacts without mutating project prompt or running generation', async () => {
    const created = await service.generateProject({ idea: 'cat shooter', language: 'en' });
    expect(pipelineRuns).toBe(1);

    const prepared = await service.preparePromptOptimization(created.project_id, {
      originalPrompt: 'make a multiplayer 3D cat shooter with online leaderboard'
    });

    expect(prepared).toMatchObject({
      ok: true,
      report: {
        projectId: created.project_id,
        originalPrompt: 'make a multiplayer 3D cat shooter with online leaderboard',
        status: 'prepared',
        applied: false
      },
      artifacts: [
        expect.objectContaining({ id: 'promptOptimizationReport', path: expect.stringContaining('prompt_optimization_report.json') }),
        expect.objectContaining({ id: 'optimizedPrompt', path: expect.stringContaining('optimized_prompt.txt') })
      ]
    });
    expect(pipelineRuns).toBe(1);
    await expect(service.getProject(created.project_id)).resolves.toMatchObject({
      project: { idea: 'cat shooter' }
    });
    await expect(readFile(workspace.getModelOutputPath(created.project_id, created.run_id, 'game_dsl.json'), 'utf8')).rejects.toThrow();
    expect(JSON.stringify(prepared)).not.toContain(root);
  });

  it('requires explicit llm mode and still does not mutate project prompt or run generation', async () => {
    const created = await service.generateProject({ idea: 'cat shooter', language: 'en' });
    expect(pipelineRuns).toBe(1);

    const defaultPrepared = await service.preparePromptOptimization(created.project_id, {
      originalPrompt: 'cat shooter'
    });
    const llmPrepared = await service.preparePromptOptimization(created.project_id, {
      originalPrompt: 'cat shooter',
      runId: created.run_id,
      mode: 'llm'
    });

    expect(defaultPrepared.report.mode).toBe('mock');
    expect(llmPrepared.report).toMatchObject({
      mode: 'llm',
      strategy: 'llm-v1',
      optimizedPrompt: 'Use a 2D cat shooter.',
      applied: false
    });
    expect(llmPrepared.report.optimizationId).not.toBe(defaultPrepared.report.optimizationId);
    expect(llmPrepared.artifacts[0].path).not.toBe(defaultPrepared.artifacts[0].path);
    expect(pipelineRuns).toBe(1);
    await expect(service.getProject(created.project_id)).resolves.toMatchObject({
      project: { idea: 'cat shooter' }
    });
    await expect(readFile(workspace.getModelOutputPath(created.project_id, created.run_id, 'game_dsl.json'), 'utf8')).rejects.toThrow();
  });

  it('passes verified prompt optimization provenance into generation without trusting artifact paths from the request', async () => {
    const source = await service.generateProject({ idea: 'cat shooter', language: 'en' });
    const prepared = await service.preparePromptOptimization(source.project_id, {
      originalPrompt: 'cat shooter'
    });

    const generated = await service.generateProject({
      idea: prepared.report.optimizedPrompt,
      language: 'en',
      promptOptimizationProjectId: source.project_id,
      promptOptimizationId: prepared.report.optimizationId
    });

    expect(generated.project_id).toBe('proj_20260609_153000_abcd');
    expect(pipelineRuns).toBe(2);
    expect(lastPipelineInput).toMatchObject({
      projectId: generated.project_id,
      runId: generated.run_id,
      idea: prepared.report.optimizedPrompt,
      generationInputReport: {
        reportVersion: 'generation_input_report.v1',
        projectId: generated.project_id,
        runId: generated.run_id,
        source: 'prompt-coach-candidate',
        effectivePrompt: prepared.report.optimizedPrompt,
        promptOptimizationRef: {
          projectId: source.project_id,
          optimizationId: prepared.report.optimizationId,
          reportPath: `prompt-optimizations/${prepared.report.optimizationId}/prompt_optimization_report.json`,
          optimizedPromptPath: `prompt-optimizations/${prepared.report.optimizationId}/optimized_prompt.txt`
        },
        candidatePromptMatchesEffectivePrompt: true
      }
    });
    expect(JSON.stringify(lastPipelineInput)).not.toContain('intentSummary');
    expect(JSON.stringify(lastPipelineInput)).not.toContain(root);
  });

  it('rejects prompt optimization provenance when the effective prompt or request shape is invalid', async () => {
    const source = await service.generateProject({ idea: 'cat shooter', language: 'en' });
    const prepared = await service.preparePromptOptimization(source.project_id, {
      originalPrompt: 'cat shooter'
    });
    const runsBeforeRejectedGenerate = pipelineRuns;

    await expect(
      service.generateProject({
        idea: `${prepared.report.optimizedPrompt} edited`,
        language: 'en',
        promptOptimizationProjectId: source.project_id,
        promptOptimizationId: prepared.report.optimizationId
      })
    ).rejects.toThrow(ProjectRequestError);
    await expect(
      service.generateProject({
        idea: prepared.report.optimizedPrompt,
        language: 'en',
        promptOptimizationId: prepared.report.optimizationId
      })
    ).rejects.toThrow(ProjectRequestError);
    await expect(
      service.generateProject({
        idea: prepared.report.optimizedPrompt,
        language: 'en',
        promptOptimizationProjectId: '../proj_escape',
        promptOptimizationId: prepared.report.optimizationId
      })
    ).rejects.toThrow(ProjectRequestError);
    await expect(
      service.generateProject({
        idea: prepared.report.optimizedPrompt,
        language: 'en',
        promptOptimizationProjectId: source.project_id,
        promptOptimizationId: '../opt_escape'
      })
    ).rejects.toThrow(ProjectRequestError);
    expect(pipelineRuns).toBe(runsBeforeRejectedGenerate);
  });

  it('rejects unreadable prompt optimization artifacts without leaking workspace paths', async () => {
    const source = await service.generateProject({ idea: 'cat shooter', language: 'en' });
    const runsBeforeRejectedGenerate = pipelineRuns;

    try {
      await service.generateProject({
        idea: 'Use a 2D cat shooter.',
        language: 'en',
        promptOptimizationProjectId: source.project_id,
        promptOptimizationId: `opt_${source.project_id}_000000000000`
      });
      throw new Error('Expected generateProject to reject unreadable prompt optimization artifacts.');
    } catch (error) {
      expect(error).toBeInstanceOf(ProjectRequestError);
      expect(JSON.stringify(error)).toContain('Prompt optimization artifact is not readable.');
      expect(JSON.stringify(error)).not.toContain(root);
    }
    expect(pipelineRuns).toBe(runsBeforeRejectedGenerate);
  });

  it('rejects prompt optimization prepare for missing projects and empty prompts', async () => {
    await expect(service.preparePromptOptimization('proj_missing', { originalPrompt: 'cat shooter' })).rejects.toThrow();
    const created = await service.generateProject({ idea: 'cat shooter', language: 'en' });

    await expect(service.preparePromptOptimization(created.project_id, { originalPrompt: '  ' })).rejects.toThrow(ProjectRequestError);
    await expect(service.preparePromptOptimization(created.project_id, { originalPrompt: 'cat shooter', runId: '   ' })).rejects.toThrow(ProjectRequestError);
    await expect(service.preparePromptOptimization(created.project_id, { originalPrompt: 'cat shooter', mode: 'surprise' })).rejects.toThrow(ProjectRequestError);
  });

  it('rejects event lookup when the run does not belong to the project', async () => {
    const created = await service.generateProject({ idea: 'cat shooter', language: 'en' });

    await expect(service.getRunEvents('proj_other', created.run_id)).rejects.toThrow('run does not belong to project');
  });

  it('reads QA report, repair report, and build log after validating run ownership', async () => {
    const created = await service.generateProject({ idea: 'cat shooter', language: 'en' });
    await writeJsonFile(workspace.getQaReportPath(created.project_id, created.run_id), { status: 'PASSED', observed_events: ['game.ready'] });
    await writeJsonFile(workspace.getRepairReportPath(created.project_id, created.run_id), { status: 'REPAIRED', attempts: [] });
    await writeTextFile(workspace.getBuildLogPath(created.project_id, created.run_id), 'vite build ok');

    await expect(service.getQaReport(created.project_id, created.run_id)).resolves.toMatchObject({
      ok: true,
      qa_report: {
        status: 'PASSED',
        runtime_status: 'PASSED',
        asset_semantic_status: 'PASSED',
        overall_status: 'PLAYABLE'
      }
    });
    await expect(service.getRepairReport(created.project_id, created.run_id)).resolves.toMatchObject({
      ok: true,
      repair_report: { status: 'REPAIRED' }
    });
    await expect(service.getBuildLog(created.project_id, created.run_id)).resolves.toEqual({
      ok: true,
      build_log: 'vite build ok'
    });
    await expect(service.getQaReport('proj_other', created.run_id)).rejects.toThrow('run does not belong to project');
  });

  it('reads pipeline artifact refs and acceptance report after validating run ownership', async () => {
    const created = await service.generateProject({ idea: 'cat shooter', language: 'en' });
    await writeJsonFile(workspace.getModelOutputPath(created.project_id, created.run_id, 'pipeline_artifact_index.json'), {
      indexVersion: 'pipeline-artifact-index-v0.1',
      projectId: created.project_id,
      runId: created.run_id,
      artifacts: [
        {
          id: 'gameDsl',
          role: 'dsl',
          artifactRoot: 'model-output',
          path: 'game_dsl.json',
          status: 'present',
          required: true,
          producedBy: 'generation',
          format: 'json'
        },
        {
          id: 'assetPipelineReport',
          role: 'asset',
          artifactRoot: 'generated-project',
          path: 'asset_pipeline_report.json',
          status: 'present',
          required: true,
          producedBy: 'asset-pipeline',
          format: 'json'
        },
        {
          id: 'pipelineAcceptanceReport',
          role: 'index',
          artifactRoot: 'model-output',
          path: 'pipeline_acceptance_report.json',
          status: 'present',
          required: true,
          producedBy: 'pipeline-acceptance',
          format: 'json'
        }
      ]
    });
    await writeJsonFile(workspace.getModelOutputPath(created.project_id, created.run_id, 'pipeline_acceptance_report.json'), {
      reportVersion: 'pipeline_acceptance_report.v1',
      projectId: created.project_id,
      runId: created.run_id,
      overallStatus: 'pass',
      previewable: true,
      checkedArtifacts: [
        { artifactId: 'pipelineAcceptanceReport', artifactPath: 'pipeline_acceptance_report.json', status: 'present', required: true }
      ],
      checks: [
        {
          id: 'artifact_index_consistency',
          category: 'artifacts',
          status: 'pass',
          required: true,
          artifactId: 'pipelineArtifactIndex',
          artifactPath: 'pipeline_artifact_index.json',
          reason: 'Pipeline artifact index matches the current project and run.',
          evidenceRefs: ['pipelineArtifactIndex:pipeline_artifact_index.json']
        }
      ],
      errors: [],
      warnings: []
    });

    await expect(service.getPipelineArtifacts(created.project_id, created.run_id)).resolves.toMatchObject({
      ok: true,
      pipeline_artifact_index: {
        projectId: created.project_id,
        runId: created.run_id,
        artifacts: expect.arrayContaining([
          expect.objectContaining({ id: 'gameDsl', path: 'game_dsl.json' }),
          expect.objectContaining({ id: 'assetPipelineReport', path: 'asset_pipeline_report.json' })
        ])
      }
    });
    const response = await service.getPipelineArtifacts(created.project_id, created.run_id);
    expect(JSON.stringify(response)).not.toContain(root);
    await expect(service.getPipelineAcceptance(created.project_id, created.run_id)).resolves.toMatchObject({
      ok: true,
      pipeline_acceptance_report: {
        projectId: created.project_id,
        runId: created.run_id,
        overallStatus: 'pass',
        previewable: true
      }
    });
    await expect(service.getPipelineArtifacts('proj_other', created.run_id)).rejects.toThrow('run does not belong to project');
    await expect(service.getPipelineAcceptance('proj_other', created.run_id)).rejects.toThrow('run does not belong to project');
  });

  it('returns a clear missing artifact index error', async () => {
    const created = await service.generateProject({ idea: 'cat shooter', language: 'en' });

    await expect(service.getPipelineArtifacts(created.project_id, created.run_id)).rejects.toMatchObject({
      status: 404,
      message: 'Pipeline artifact index not found.'
    });
    await expect(service.getPipelineAcceptance(created.project_id, created.run_id)).rejects.toMatchObject({
      status: 404,
      message: 'Pipeline acceptance report not found.'
    });
  });

  it('rejects a pipeline artifact index whose identity does not match the requested run', async () => {
    const created = await service.generateProject({ idea: 'cat shooter', language: 'en' });
    await writeJsonFile(workspace.getModelOutputPath(created.project_id, created.run_id, 'pipeline_artifact_index.json'), {
      indexVersion: 'pipeline-artifact-index-v0.1',
      projectId: 'proj_20260609_153000_other',
      runId: 'run_20260609_153000_other',
      artifacts: [
        {
          id: 'gameDsl',
          role: 'dsl',
          artifactRoot: 'model-output',
          path: 'game_dsl.json',
          status: 'present',
          required: true,
          producedBy: 'generation',
          format: 'json'
        }
      ]
    });

    await expect(service.getPipelineArtifacts(created.project_id, created.run_id)).rejects.toThrow(
      `pipeline artifact index identity does not match run: ${created.project_id}/${created.run_id}`
    );
  });

  it('rejects a pipeline acceptance report whose identity does not match the requested run', async () => {
    const created = await service.generateProject({ idea: 'cat shooter', language: 'en' });
    await writeJsonFile(workspace.getModelOutputPath(created.project_id, created.run_id, 'pipeline_acceptance_report.json'), {
      reportVersion: 'pipeline_acceptance_report.v1',
      projectId: 'proj_20260609_153000_other',
      runId: 'run_20260609_153000_other',
      overallStatus: 'pass',
      previewable: true,
      checkedArtifacts: [],
      checks: [
        {
          id: 'artifact_index_consistency',
          category: 'artifacts',
          status: 'pass',
          required: true,
          artifactId: 'pipelineArtifactIndex',
          artifactPath: 'pipeline_artifact_index.json',
          reason: 'Pipeline artifact index matches the current project and run.',
          evidenceRefs: ['pipelineArtifactIndex:pipeline_artifact_index.json']
        }
      ],
      errors: [],
      warnings: []
    });

    await expect(service.getPipelineAcceptance(created.project_id, created.run_id)).rejects.toThrow(
      `pipeline acceptance report identity does not match run: ${created.project_id}/${created.run_id}`
    );
  });

  it('rejects unsafe pipeline acceptance report content at the API boundary', async () => {
    const created = await service.generateProject({ idea: 'cat shooter', language: 'en' });
    await writeJsonFile(workspace.getModelOutputPath(created.project_id, created.run_id, 'pipeline_acceptance_report.json'), {
      reportVersion: 'pipeline_acceptance_report.v1',
      projectId: created.project_id,
      runId: created.run_id,
      overallStatus: 'pass',
      previewable: true,
      checkedArtifacts: [
        { artifactId: 'pipelineAcceptanceReport', artifactPath: '/Users/dahufa/private.json', status: 'present', required: true }
      ],
      checks: [
        {
          id: 'artifact_index_consistency',
          category: 'artifacts',
          status: 'pass',
          required: true,
          artifactId: 'pipelineArtifactIndex',
          artifactPath: 'pipeline_artifact_index.json',
          reason: 'DEEPSEEK_API_KEY leaked from raw provider response',
          evidenceRefs: ['pipelineArtifactIndex:pipeline_artifact_index.json']
        }
      ],
      errors: [],
      warnings: []
    });

    await expect(service.getPipelineAcceptance(created.project_id, created.run_id)).rejects.toThrow();
  });

  it('uses the same random suffix for project and run ids to avoid cross-project run collisions', () => {
    expect(createProjectRunIds(new Date('2026-06-09T15:30:00.000Z'), () => 'abcd')).toEqual({
      projectId: 'proj_20260609_153000_abcd',
      runId: 'run_20260609_153000_abcd'
    });
  });

  it('rejects project status when latest_run_id and latest_run.run_id drift', async () => {
    const created = await service.generateProject({ idea: 'cat shooter', language: 'en' });
    const otherRun = await runStore.createRun({
      projectId: created.project_id,
      runId: 'run_20260609_153000_other'
    });
    await projectStore.writeLatestRun(created.project_id, otherRun);

    await expect(service.getProject(created.project_id)).rejects.toThrow('latest run does not match project');
  });

  it('prepares the Workbench deterministic hot patch and records runtime-confirmed version advancement', async () => {
    const created = await service.generateProject({ idea: '小猫大战坦克', language: 'zh' });
    const gameDsl = await writeCatVsTankArtifacts(workspace, liveEdit, created.project_id, created.run_id);

    const prepared = await service.prepareWorkbenchDeterministicPatch(created.project_id, created.run_id);

    expect(prepared).toMatchObject({
      ok: true,
      patch_id: expect.stringMatching(/^patch_workbench_[a-z0-9]+$/),
      status: 'hot_patchable',
      apply_mode: 'hot',
      runtime_patch: {
        player: { scale: 1.3, maxSpeed: 320 },
        enemyTypes: { tank_basic: { speed: 80 } }
      }
    });
    await expect(readFile(workspace.getLiveCurrentVersionPath(created.project_id, created.run_id), 'utf8')).resolves.toContain('"versionId": "v_initial"');
    await expect(readFile(workspace.getLiveArtifactPath(created.project_id, created.run_id, `${prepared.patch_id}.dsl_patch.json`), 'utf8')).resolves.toContain(
      '/enemyTypes/tank_basic/physics/speed'
    );

    const recorded = await service.recordWorkbenchRuntimeApplyResult(created.project_id, created.run_id, prepared.patch_id, {
      artifactKind: 'runtime_apply_report',
      schemaVersion: 'runtime_apply_report.v1',
      runId: created.run_id,
      patchId: prepared.patch_id,
      liveUpdatePlanRef: { artifact: `${prepared.patch_id}.live_update_plan.json`, patchId: prepared.patch_id },
      status: 'applied_hot',
      applyMode: 'hot',
      runtimeTarget: 'phaser:top_down_shooter',
      appliedPaths: ['/player/render/scale', '/player/physics/maxSpeed', '/enemyTypes/tank_basic/physics/speed'],
      warnings: [],
      errors: []
    });

    expect(recorded).toMatchObject({
      ok: true,
      patch_id: prepared.patch_id,
      status: 'applied_hot',
      apply_mode: 'hot',
      version_id: expect.stringContaining(prepared.patch_id)
    });
    await expect(readFile(workspace.getLivePatchHistoryPath(created.project_id, created.run_id), 'utf8')).resolves.toContain(prepared.patch_id);
  });

  it('loads Workbench live current state with version, DSL, capabilities, history, and audit log', async () => {
    const created = await service.generateProject({ idea: '小猫大战坦克', language: 'zh' });
    const gameDsl = await writeCatVsTankArtifacts(workspace, liveEdit, created.project_id, created.run_id);

    const current = await service.getLiveCurrent(created.project_id, created.run_id);

    expect(current).toMatchObject({
      ok: true,
      current_version: { versionId: 'v_initial', dslId: gameDsl.dslId },
      game_dsl: { dslId: gameDsl.dslId, player: { id: 'player' }, enemyTypes: { tank_basic: { id: 'tank_basic' } } },
      runtime_capability_report: { status: 'supported' },
      live_edit_capabilities: { hot: expect.arrayContaining(['/player/render/scale', '/enemyTypes/*/physics/speed']) },
      patch_history: [],
      edit_audit_log: []
    });
  });

  it('prepares a generic Workbench replace op and records failed runtime result without advancing current_version', async () => {
    const created = await service.generateProject({ idea: '小猫大战坦克', language: 'zh' });
    await writeCatVsTankArtifacts(workspace, liveEdit, created.project_id, created.run_id);
    const before = await readFile(workspace.getLiveCurrentVersionPath(created.project_id, created.run_id), 'utf8').catch(() => '');

    const prepared = await service.prepareWorkbenchLiveEdit(created.project_id, created.run_id, {
      op: 'replace',
      path: '/player/render/scale',
      value: 1.3
    });

    expect(prepared).toMatchObject({
      status: 'hot_patchable',
      runtime_patch: { player: { scale: 1.3 } },
      validation_report: { status: 'valid' }
    });
    const recorded = await service.recordWorkbenchRuntimeApplyResult(created.project_id, created.run_id, prepared.patch_id, {
      artifactKind: 'runtime_apply_report',
      schemaVersion: 'runtime_apply_report.v1',
      runId: created.run_id,
      patchId: prepared.patch_id,
      liveUpdatePlanRef: prepared.live_update_plan_ref,
      status: 'failed_runtime_apply',
      applyMode: 'hot',
      runtimeTarget: 'phaser:top_down_shooter',
      appliedPaths: [],
      warnings: [],
      errors: [{ code: 'MOCK_RUNTIME_FAILURE', path: '/player/render/scale', message: 'mock failure' }]
    });

    expect(recorded).toMatchObject({ status: 'failed_runtime_apply', version_id: undefined });
    await expect(readFile(workspace.getLiveCurrentVersionPath(created.project_id, created.run_id), 'utf8')).resolves.toBe(before);
    await expect(readFile(workspace.getLivePatchHistoryPath(created.project_id, created.run_id), 'utf8')).rejects.toThrow();
  });

  it('rejects stale runtime success without advancing patch history', async () => {
    const created = await service.generateProject({ idea: '小猫大战坦克', language: 'zh' });
    await writeCatVsTankArtifacts(workspace, liveEdit, created.project_id, created.run_id);
    const first = await service.prepareWorkbenchLiveEdit(created.project_id, created.run_id, { op: 'replace', path: '/player/render/scale', value: 1.3 });
    const second = await service.prepareWorkbenchLiveEdit(created.project_id, created.run_id, { op: 'replace', path: '/player/physics/maxSpeed', value: 320 });
    await service.recordWorkbenchRuntimeApplyResult(created.project_id, created.run_id, first.patch_id, {
      artifactKind: 'runtime_apply_report',
      schemaVersion: 'runtime_apply_report.v1',
      runId: created.run_id,
      patchId: first.patch_id,
      liveUpdatePlanRef: first.live_update_plan_ref,
      status: 'applied_hot',
      applyMode: 'hot',
      runtimeTarget: 'phaser:top_down_shooter',
      appliedPaths: ['/player/render/scale'],
      warnings: [],
      errors: []
    });

    const stale = await service.recordWorkbenchRuntimeApplyResult(created.project_id, created.run_id, second.patch_id, {
      artifactKind: 'runtime_apply_report',
      schemaVersion: 'runtime_apply_report.v1',
      runId: created.run_id,
      patchId: second.patch_id,
      liveUpdatePlanRef: second.live_update_plan_ref,
      status: 'applied_hot',
      applyMode: 'hot',
      runtimeTarget: 'phaser:top_down_shooter',
      appliedPaths: ['/player/physics/maxSpeed'],
      warnings: [],
      errors: []
    });

    expect(stale).toMatchObject({ status: 'failed_runtime_apply', version_id: undefined });
    const history = (await readFile(workspace.getLivePatchHistoryPath(created.project_id, created.run_id), 'utf8')).trim().split('\n');
    expect(history).toHaveLength(1);
    expect(history[0]).toContain(first.patch_id);
  });

  it('rejects runtime success reports with mismatched plan artifact, extra paths, or errors', async () => {
    const created = await service.generateProject({ idea: '小猫大战坦克', language: 'zh' });
    await writeCatVsTankArtifacts(workspace, liveEdit, created.project_id, created.run_id);
    const artifactMismatch = await service.prepareWorkbenchLiveEdit(created.project_id, created.run_id, {
      op: 'replace',
      path: '/player/render/scale',
      value: 1.3
    });
    const extraPath = await service.prepareWorkbenchLiveEdit(created.project_id, created.run_id, {
      op: 'replace',
      path: '/player/physics/maxSpeed',
      value: 320
    });
    const successWithErrors = await service.prepareWorkbenchLiveEdit(created.project_id, created.run_id, {
      op: 'replace',
      path: '/enemyTypes/tank_basic/physics/speed',
      value: 80
    });

    const mismatchResult = await recordApplied(service, created.project_id, created.run_id, artifactMismatch.patch_id, {
      liveUpdatePlanRef: { artifact: 'wrong.live_update_plan.json', patchId: artifactMismatch.patch_id },
      appliedPaths: ['/player/render/scale']
    });
    const extraPathResult = await recordApplied(service, created.project_id, created.run_id, extraPath.patch_id, {
      liveUpdatePlanRef: extraPath.live_update_plan_ref,
      appliedPaths: ['/player/physics/maxSpeed', '/player/render/scale']
    });
    const errorResult = await recordApplied(service, created.project_id, created.run_id, successWithErrors.patch_id, {
      liveUpdatePlanRef: successWithErrors.live_update_plan_ref,
      appliedPaths: ['/enemyTypes/tank_basic/physics/speed'],
      errors: [{ code: 'RUNTIME_SUCCESS_WITH_ERROR_FIXTURE', path: '/enemyTypes/tank_basic/physics/speed', message: 'fixture' }]
    });

    expect(mismatchResult).toMatchObject({ status: 'failed_runtime_apply', version_id: undefined });
    expect(extraPathResult).toMatchObject({ status: 'failed_runtime_apply', version_id: undefined });
    expect(errorResult).toMatchObject({ status: 'failed_runtime_apply', version_id: undefined });
    await expect(readFile(workspace.getLivePatchHistoryPath(created.project_id, created.run_id), 'utf8')).rejects.toThrow();
  });

  it('does not recreate live current_version when the existing record is malformed', async () => {
    const created = await service.generateProject({ idea: '小猫大战坦克', language: 'zh' });
    await writeCatVsTankArtifacts(workspace, liveEdit, created.project_id, created.run_id);
    await writeTextFile(workspace.getLiveCurrentVersionPath(created.project_id, created.run_id), '{"versionId":123}\n');

    await expect(service.getLiveCurrent(created.project_id, created.run_id)).rejects.toThrow();
    await expect(readFile(workspace.getLiveCurrentVersionPath(created.project_id, created.run_id), 'utf8')).resolves.toBe('{"versionId":123}\n');
  });
});

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await writeTextFile(path, `${JSON.stringify(value)}\n`);
}

async function writeTextFile(path: string, value: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, 'utf8');
}

async function writeCatVsTankArtifacts(workspace: LocalWorkspaceService, liveEdit: DslLiveEditService, projectId: string, runId: string): Promise<GameDslArtifact> {
  const rawDsl = RawGameDslSchema.parse(createShooterRawDsl());
  rawDsl.player.label = '小猫';
  rawDsl.entities = [
    { id: 'fishbone', kind: 'projectile', label: '鱼骨头', damage: 1, movement: { type: 'move_right', speed_px_per_sec: 520 } },
    { id: 'tank_basic', kind: 'enemy', label: '坦克', count: 8, health: 1, movement: { type: 'chase_player', speed_px_per_sec: 100 } }
  ];
  rawDsl.player.actions = rawDsl.player.actions.map((action) => ({ ...action, spawns: 'fishbone' }));
  rawDsl.rules.collisions = rawDsl.rules.collisions.map((collision) => ({ ...collision, source: 'fishbone', target: 'tank_basic' }));
  rawDsl.objectives.win = { type: 'enemy_cleared', target: 8 };
  const gameDsl = buildGameDslArtifact({
    rawDsl,
    runId,
    intentPlan: { normalizedGenre: 'top_down_shooter', matchedAlias: '小猫大战坦克' }
  });
  await liveEdit.initializeLiveVersion({ projectId, runId, artifact: gameDsl });
  await writeJsonFile(workspace.getModelOutputPath(projectId, runId, 'runtime_capability_report.json'), buildRuntimeCapabilityReport({ runId, validatedDsl: gameDsl }));
  return gameDsl;
}

async function recordApplied(
  service: ProjectsService,
  projectId: string,
  runId: string,
  patchId: string,
  overrides: {
    liveUpdatePlanRef: { artifact: string; patchId: string };
    appliedPaths: string[];
    errors?: Array<{ code: string; path: string; message: string }>;
  }
) {
  return service.recordWorkbenchRuntimeApplyResult(projectId, runId, patchId, {
    artifactKind: 'runtime_apply_report',
    schemaVersion: 'runtime_apply_report.v1',
    runId,
    patchId,
    liveUpdatePlanRef: overrides.liveUpdatePlanRef,
    status: 'applied_hot',
    applyMode: 'hot',
    runtimeTarget: 'phaser:top_down_shooter',
    appliedPaths: overrides.appliedPaths,
    warnings: [],
    errors: overrides.errors ?? []
  });
}
