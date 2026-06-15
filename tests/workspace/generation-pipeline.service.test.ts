import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createCollectorRawDsl, createShooterRawDsl } from '../contracts/fixtures.js';
import {
  GenerationPipelineService,
  readAssetSemanticRepairConfig,
  type AssetSemanticRepairConfig
} from '../../apps/maker-api/src/projects/generation-pipeline.service.js';
import { ProjectStoreService } from '../../apps/maker-api/src/projects/project-store.service.js';
import { RunStoreService } from '../../apps/maker-api/src/projects/run-store.service.js';
import { LocalWorkspaceService } from '../../apps/maker-api/src/workspace/local-workspace.service.js';
import type { RuntimeCompileResult } from '../../apps/maker-api/src/compiler/compiler.types.js';
import type { QaGenre, QaReport } from '../../apps/maker-api/src/qa/qa.types.js';
import {
  AssetManifestSchema,
  AssetResolutionReportSchema,
  buildAssetPlanFromIr,
  type AssetManifest,
  type AssetPlan,
  type AssetResolutionReport
} from '../../packages/asset-pipeline/src/index.js';
import { GameBriefSchema, RawGameDslSchema, buildGameDslArtifact, type GameDslArtifact, type NormalizedGameIr, type RawGameDsl } from '../../packages/game-dsl/src/index.js';

const projectId = 'proj_20260610_050000_pipe';
const runId = 'run_20260610_050000_pipe';

type PipelineOverrides = {
  modelProvider?: ConstructorParameters<typeof GenerationPipelineService>[3];
  compiler?: ConstructorParameters<typeof GenerationPipelineService>[4];
  buildRunner?: ConstructorParameters<typeof GenerationPipelineService>[5];
  qaRunner?: ConstructorParameters<typeof GenerationPipelineService>[6];
  assetSemanticRepairConfig?: AssetSemanticRepairConfig;
};

describe('GenerationPipelineService failure states', () => {
  let root: string;
  let workspace: LocalWorkspaceService;
  let projectStore: ProjectStoreService;
  let runStore: RunStoreService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-pipeline-'));
    workspace = new LocalWorkspaceService(root);
    projectStore = new ProjectStoreService(workspace);
    runStore = new RunStoreService(workspace);
    await projectStore.createProject({ projectId, runId, idea: 'cat shooter', language: 'en' });
    const run = await runStore.createRun({ projectId, runId });
    await projectStore.writeLatestRun(projectId, run);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function resetStores(): Promise<void> {
    await rm(root, { recursive: true, force: true });
    await mkdir(root, { recursive: true });
    workspace = new LocalWorkspaceService(root);
    projectStore = new ProjectStoreService(workspace);
    runStore = new RunStoreService(workspace);
    await projectStore.createProject({ projectId, runId, idea: 'cat shooter', language: 'en' });
    const run = await runStore.createRun({ projectId, runId });
    await projectStore.writeLatestRun(projectId, run);
  }

  it('keeps semantic asset repair disabled by default config and clamps explicit attempts to one', () => {
    expect(readAssetSemanticRepairConfig({} as NodeJS.ProcessEnv)).toMatchObject({
      enabled: false,
      maxAttempts: 1
    });
    expect(
      readAssetSemanticRepairConfig({
        ASSET_SEMANTIC_REPAIR_ENABLED: 'true',
        ASSET_SEMANTIC_REPAIR_MAX_ATTEMPTS: '5',
        AGM_ASSET_PACKS_DIR: '/tmp/asset-packs'
      } as NodeJS.ProcessEnv)
    ).toEqual({
      enabled: true,
      maxAttempts: 1,
      assetPacksDir: '/tmp/asset-packs'
    });
  });

  it('does not execute repair when the explicit max attempt budget is zero', async () => {
    let qaRuns = 0;
    const pipeline = createPipeline({
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre }) {
          qaRuns += 1;
          return createQaReport(input.genre, {
            asset_semantic_status: 'FAILED',
            overall_status: 'NEEDS_ASSET_REPAIR'
          });
        }
      },
      assetSemanticRepairConfig: { enabled: true, maxAttempts: 0 }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('PLAYABLE');
    expect(qaRuns).toBe(1);
    await expect(runStore.readEvents(runId)).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'asset-repair.started' })])
    );
    await expect(readQaReport()).resolves.toMatchObject({
      asset_semantic_repair: {
        enabled: true,
        attempted: false,
        skippedReason: 'max_attempts_exhausted',
        attemptCount: 0,
        maxAttempts: 0,
        beforeOverallStatus: 'NEEDS_ASSET_REPAIR',
        beforeAssetSemanticStatus: 'FAILED'
      }
    });
  });

  it('maps compiler exceptions to BUILD_FAILED and records build.failed', async () => {
    const pipeline = createPipeline({
      compiler: {
        async compile() {
          throw new Error('compile exploded');
        }
      }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('BUILD_FAILED');
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ status: 'BUILD_FAILED' });
    await expect(runStore.readEvents(runId)).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ type: 'build.failed' })]));
  });

  it('maps runtime capability gate failures to RUNTIME_UNSUPPORTED without building or running QA', async () => {
    let buildRuns = 0;
    let qaRuns = 0;
    const pipeline = createPipeline({
      compiler: {
        async compile(input) {
          return {
            ok: false,
            code: 'RUNTIME_UNSUPPORTED',
            projectId,
            templateId: input.ir.template_params.template_id,
            unsupportedCapabilities: [
              { capability: 'side_view_camera', path: 'runtime_requirements.capabilities', reason: 'Phaser adapter does not support "side_view_camera".' }
            ]
          };
        }
      },
      buildRunner: {
        async build() {
          buildRuns += 1;
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre }) {
          qaRuns += 1;
          return createQaReport(input.genre);
        }
      }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('RUNTIME_UNSUPPORTED');
    expect(buildRuns).toBe(0);
    expect(qaRuns).toBe(0);
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ status: 'RUNTIME_UNSUPPORTED' });
    await expect(runStore.readEvents(runId)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'runtime.unsupported', message: expect.stringContaining('side_view_camera') })])
    );
  });

  it('keeps deterministic fallback only for missing local model configuration', async () => {
    const pipeline = createPipeline({
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('PLAYABLE');
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ status: 'PLAYABLE' });
    await expect(runStore.readEvents(runId)).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ type: 'model.fallback' })]));
  });

  it('stores model-generated raw DSL snapshots under data/local-data/result by time', async () => {
    const rawDsl = RawGameDslSchema.parse(createCollectorRawDsl());
    const brief = GameBriefSchema.parse({
      brief_version: 'game-brief-v0.1',
      title: rawDsl.metadata.title,
      genre: rawDsl.game.genre,
      camera: rawDsl.game.camera,
      core_loop: ['Collect stars before the timer ends.', 'Avoid hazards to keep the score growing.'],
      difficulty: rawDsl.game.difficulty,
      target_play_time_sec: rawDsl.game.target_play_time_sec
    });
    const pipeline = createPipeline({
      modelProvider: {
        async generateGameBrief() {
          return {
            ok: true,
            value: brief,
            rawText: '{}',
            rawOutputPath: workspace.getModelOutputPath(projectId, runId, 'game-brief.raw.json')
          };
        },
        async generateRawGameDsl() {
          return {
            ok: true,
            value: rawDsl,
            rawText: JSON.stringify(rawDsl),
            rawOutputPath: workspace.getModelOutputPath(projectId, runId, 'raw-game-dsl.raw.json')
          };
        }
      },
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      }
    });

    await expect(runPipeline(pipeline, { idea: 'collect gems', language: 'en' })).resolves.toBe('PLAYABLE');

    const resultFiles = await collectFiles(join(root, 'data/local-data/result'));
    expect(resultFiles).toHaveLength(1);
    expect(resultFiles[0]).toContain('/data/local-data/result/');
    expect(resultFiles[0]).toContain(`__${projectId}__${runId}__raw-game-dsl.json`);
    await expect(readFile(resultFiles[0], 'utf8')).resolves.toContain(`"title": "${rawDsl.metadata.title}"`);
  });

  it('stores intent_plan.json before DSL generation', async () => {
    const rawDsl = RawGameDslSchema.parse(createShooterRawDsl());
    const pipeline = createPipeline({
      modelProvider: createModelProviderForRawDsl(rawDsl),
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      }
    });

    await expect(runPipeline(pipeline, { idea: '小猫大战坦克', language: 'zh' })).resolves.toBe('PLAYABLE');

    const intentPlan = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'intent_plan.json'), 'utf8'));
    const generationInputReport = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_input_report.json'), 'utf8'));
    const gameDsl = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'game_dsl.json'), 'utf8'));
    const validationReport = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'dsl_validation_report.json'), 'utf8'));
    const runtimeCapabilityReport = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'runtime_capability_report.json'), 'utf8'));
    expect(generationInputReport).toEqual({
      reportVersion: 'generation_input_report.v1',
      projectId,
      runId,
      source: 'manual',
      effectivePrompt: '小猫大战坦克',
      promptOptimizationRef: null,
      candidatePromptMatchesEffectivePrompt: false,
      checkedPaths: ['effectivePrompt', 'source'],
      status: 'accepted',
      warnings: [],
      errors: []
    });
    expect(JSON.stringify(generationInputReport)).not.toContain('raw-game-dsl');
    expect(intentPlan).toMatchObject({
      schemaVersion: 'intent-plan-v0.1',
      sourcePrompt: '小猫大战坦克',
      normalizedGenre: 'top_down_shooter',
      runtimeDslSupport: 'supported'
    });
    expect(gameDsl).toMatchObject({
      artifactKind: 'game_dsl',
      schemaVersion: 'game_dsl.v1',
      runId,
      intentPlanRef: { artifact: 'intent_plan.json', normalizedGenre: 'top_down_shooter' },
      genre: 'top_down_shooter',
      player: { id: 'player' },
      enemyTypes: { alien: expect.objectContaining({ id: 'alien' }) },
      projectiles: { bolt: expect.objectContaining({ id: 'bolt' }) },
      level: { id: 'level_main', waves: { alien_wave: expect.objectContaining({ id: 'alien_wave' }) } }
    });
    expect(validationReport).toMatchObject({
      artifactKind: 'dsl_validation_report',
      reportVersion: 'dsl-validation-report-v1',
      schemaVersion: 'dsl_validation_report.v1',
      runId,
      sourceArtifact: 'game_dsl.json',
      validatedArtifact: { artifactKind: 'game_dsl', schemaVersion: 'game_dsl.v1', dslId: gameDsl.dslId },
      status: 'valid',
      valid: true,
      errorCount: 0,
      checkedPaths: expect.arrayContaining(['schemaVersion', 'player.id', 'level.waves.alien_wave.id']),
      stableIdSummary: expect.objectContaining({
        duplicateIds: [],
        checked: expect.arrayContaining([{ path: 'player.id', id: 'player' }])
      }),
      objectCounts: expect.objectContaining({
        player: 1,
        enemyTypes: 1,
        projectiles: 1,
        waves: 1
      }),
      requiredCapabilities: expect.arrayContaining(['top_down_camera', 'projectile_combat'])
    });
    expect(runtimeCapabilityReport).toMatchObject({
      artifactKind: 'runtime_capability_report',
      schemaVersion: 'runtime_capability_report.v1',
      runId,
      validatedDslRef: { artifactKind: 'game_dsl', schemaVersion: 'game_dsl.v1', dslId: gameDsl.dslId },
      selectedAdapterId: 'top_down_shooter.phaser.v1',
      status: 'supported',
      liveEditCapabilities: {
        hot: expect.arrayContaining(['/player/render/scale', '/projectiles/*/damage']),
        warmRestart: expect.arrayContaining(['/level/waves']),
        rebuildRequired: expect.arrayContaining(['/genre', '/world/coordinateSystem'])
      }
    });
    await expect(runStore.readEvents(runId)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'intent.planned', message: 'Intent normalized to top_down_shooter.' })])
    );
  });

  it('writes a pipeline artifact index for the valid generation path without stale or absolute refs', async () => {
    const rawDsl = RawGameDslSchema.parse(createShooterRawDsl());
    const pipeline = createPipeline({
      modelProvider: createModelProviderForRawDsl(rawDsl),
      compiler: { compile: compileWithArtifactFiles },
      buildRunner: {
        async build() {
          await writeTextFile(workspace.getBuildLogPath(projectId, runId), 'vite build ok');
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      }
    });

    await expect(runPipeline(pipeline, { idea: '小猫大战坦克', language: 'zh' })).resolves.toBe('PLAYABLE');

    const index = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_artifact_index.json'), 'utf8'));
    expect(index).toMatchObject({
      indexVersion: 'pipeline-artifact-index-v0.1',
      projectId,
      runId,
      artifacts: expect.arrayContaining([
        expect.objectContaining({ id: 'gameDsl', status: 'present', path: 'game_dsl.json' }),
        expect.objectContaining({ id: 'generationInputReport', status: 'present', path: 'generation_input_report.json' }),
        expect.objectContaining({ id: 'dslValidationReport', status: 'present', path: 'dsl_validation_report.json' }),
        expect.objectContaining({ id: 'runtimeCapabilityReport', status: 'present', path: 'runtime_capability_report.json' }),
        expect.objectContaining({ id: 'assetPlan', status: 'present', path: 'asset_plan.json' }),
        expect.objectContaining({ id: 'publicAssetManifest', status: 'present', path: 'public/asset_manifest.json' }),
        expect.objectContaining({ id: 'phaserPreviewManifest', status: 'present', path: 'shooter/src/asset-manifest.generated.json' }),
        expect.objectContaining({ id: 'assetResolutionReport', status: 'present', path: 'asset_resolution_report.json' }),
        expect.objectContaining({ id: 'assetPipelineReport', status: 'present', path: 'asset_pipeline_report.json' }),
        expect.objectContaining({ id: 'buildLog', status: 'present', artifactRoot: 'build-log' }),
        expect.objectContaining({ id: 'qaReport', status: 'present', artifactRoot: 'qa-report' }),
        expect.objectContaining({ id: 'pipelineArtifactIndex', status: 'present', path: 'pipeline_artifact_index.json' })
      ])
    });
    expect(JSON.stringify(index)).not.toContain(root);
    expect(JSON.stringify(index)).not.toContain('stale_asset_pipeline_report');
  });

  it('writes game_dsl.candidate.json and blocks downstream steps when artifact validation fails', async () => {
    const rawDsl = {
      ...RawGameDslSchema.parse(createShooterRawDsl()),
      player: {
        ...createShooterRawDsl().player,
        actions: [{ id: 'fire', type: 'shoot_projectile', cooldown_ms: 300, spawns: 'ghost_projectile' }]
      }
    } as RawGameDsl;
    let compileRuns = 0;
    await mkdir(workspace.getGeneratedProjectDir(projectId), { recursive: true });
    await writeFile(join(workspace.getGeneratedProjectDir(projectId), 'asset_pipeline_report.json'), 'stale_asset_pipeline_report', 'utf8');
    const pipeline = createPipeline({
      modelProvider: createModelProviderForRawDsl(rawDsl),
      compiler: {
        async compile() {
          compileRuns += 1;
          return compileResult();
        }
      },
      buildRunner: {
        async build() {
          throw new Error('invalid DSL should not build');
        }
      }
    });

    await expect(runPipeline(pipeline, { idea: '小猫大战坦克', language: 'zh' })).resolves.toBe('DSL_VALIDATION_FAILED');
    expect(compileRuns).toBe(0);

    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'game_dsl.json'), 'utf8')).rejects.toThrow();
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'runtime_capability_report.json'), 'utf8')).rejects.toThrow();
    const candidate = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'game_dsl.candidate.json'), 'utf8'));
    const generationInputReport = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_input_report.json'), 'utf8'));
    const validationReport = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'dsl_validation_report.json'), 'utf8'));
    const index = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_artifact_index.json'), 'utf8'));
    const acceptance = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_acceptance_report.json'), 'utf8'));
    expect(generationInputReport).toMatchObject({
      reportVersion: 'generation_input_report.v1',
      projectId,
      runId,
      source: 'manual',
      effectivePrompt: '小猫大战坦克'
    });
    expect(candidate).toMatchObject({
      artifactKind: 'game_dsl',
      schemaVersion: 'game_dsl.v1',
      player: { actions: [expect.objectContaining({ projectileRef: 'ghost_projectile' })] }
    });
    expect(validationReport).toMatchObject({
      sourceArtifact: 'game_dsl.candidate.json',
      status: 'invalid',
      valid: false,
      errorCount: expect.any(Number),
      errors: expect.arrayContaining([
        expect.objectContaining({ code: 'UNRESOLVED_REFERENCE', path: 'sourceDsl.player.actions.0.spawns' }),
        expect.objectContaining({ code: 'UNRESOLVED_PROJECTILE_REFERENCE' })
      ])
    });
    expect(index).toMatchObject({
      projectId,
      runId,
      artifacts: expect.arrayContaining([
        expect.objectContaining({ id: 'gameDslCandidate', status: 'present', path: 'game_dsl.candidate.json' }),
        expect.objectContaining({ id: 'generationInputReport', status: 'present', path: 'generation_input_report.json' }),
        expect.objectContaining({ id: 'dslValidationReport', status: 'present', path: 'dsl_validation_report.json' }),
        expect.objectContaining({ id: 'runtimeCapabilityReport', status: 'skipped', reason: 'dsl_validation_failed_before_runtime_capability' }),
        expect.objectContaining({ id: 'assetPipelineReport', status: 'skipped', reason: 'dsl_validation_failed_before_compile' }),
        expect.objectContaining({ id: 'pipelineAcceptanceReport', status: 'present', path: 'pipeline_acceptance_report.json' }),
        expect.objectContaining({ id: 'pipelineArtifactIndex', status: 'present', path: 'pipeline_artifact_index.json' })
      ])
    });
    expect(acceptance).toMatchObject({
      projectId,
      runId,
      overallStatus: 'fail',
      previewable: false,
      checks: expect.arrayContaining([
        expect.objectContaining({ id: 'dsl_validation', status: 'fail', reason: 'DSL validation report is invalid.' }),
        expect.objectContaining({ id: 'asset_pipeline', status: 'skipped', reason: 'dsl_validation_failed_before_compile' })
      ])
    });
    expect(JSON.stringify(index)).not.toContain('stale_asset_pipeline_report');
    expect(JSON.stringify(acceptance)).not.toContain('stale_asset_pipeline_report');
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ status: 'DSL_VALIDATION_FAILED' });
  });

  it('writes acceptance evidence when raw DSL normalization fails after artifact generation', async () => {
    const rawDsl = {
      ...RawGameDslSchema.parse(createShooterRawDsl()),
      player: {
        ...createShooterRawDsl().player,
        actions: [{ id: 'fire', type: 'shoot_projectile', cooldown_ms: 300, spawns: 'ghost_projectile' }]
      }
    } as RawGameDsl;
    const artifact = buildGameDslArtifact({
      rawDsl,
      runId,
      intentPlan: { normalizedGenre: 'top_down_shooter' }
    });
    let compileRuns = 0;
    const pipeline = createPipeline({
      compiler: {
        async compile() {
          compileRuns += 1;
          return compileResult();
        }
      }
    });
    Object.defineProperty(pipeline, 'generateRawDsl', {
      value: async () => ({ ok: true, artifact }),
      configurable: true
    });

    await expect(runPipeline(pipeline)).resolves.toBe('DSL_VALIDATION_FAILED');
    expect(compileRuns).toBe(0);
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_acceptance_report.json'), 'utf8')).resolves.toContain('"overallStatus": "fail"');

    const validationReport = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'dsl_validation_report.json'), 'utf8'));
    const index = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_artifact_index.json'), 'utf8'));
    const acceptance = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_acceptance_report.json'), 'utf8'));
    expect(validationReport).toMatchObject({
      sourceArtifact: 'game_dsl.json',
      status: 'invalid',
      valid: false,
      errors: expect.arrayContaining([expect.objectContaining({ code: 'UNRESOLVED_REFERENCE', path: 'sourceDsl.player.actions.0.spawns' })])
    });
    expect(index.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'gameDsl', status: 'present', path: 'game_dsl.json' }),
        expect.objectContaining({ id: 'gameDslCandidate', status: 'skipped', reason: 'invalid_dsl_path_uses_game_dsl_json' }),
        expect.objectContaining({ id: 'runtimeCapabilityReport', status: 'present', path: 'runtime_capability_report.json' }),
        expect.objectContaining({ id: 'pipelineAcceptanceReport', status: 'present', path: 'pipeline_acceptance_report.json' }),
        expect.objectContaining({ id: 'assetPipelineReport', status: 'skipped', reason: 'dsl_validation_failed_before_compile' })
      ])
    );
    expect(acceptance).toMatchObject({
      overallStatus: 'fail',
      previewable: false,
      checks: expect.arrayContaining([
        expect.objectContaining({ id: 'dsl_validation', status: 'fail' }),
        expect.objectContaining({ id: 'dsl_artifact', status: 'fail', artifactId: 'gameDsl', artifactPath: 'game_dsl.json' })
      ])
    });
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'game_dsl.candidate.json'), 'utf8')).rejects.toThrow();
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'runtime_capability_report.json'), 'utf8')).resolves.toContain('"status": "supported"');
  });

  it.each([
    ['飞机大战', 'vertical_shooter', 'vertical_scroll_camera'],
    ['contra-like', 'side_scrolling_run_and_gun', 'side_view_camera'],
    ['横版跑枪打外星人', 'side_scrolling_run_and_gun', 'side_view_camera'],
    ['马里奥式平台跳跃', 'side_scrolling_platformer', 'gravity_platformer_physics'],
    ['平台跳跃', 'side_scrolling_platformer', 'gravity_platformer_physics']
  ] as const)(
    'returns explicit unsupported capabilities for normalized genres outside the current runtime DSL envelope: %s',
    async (idea, normalizedGenre, expectedCapability) => {
      await resetStores();
      const pipeline = createPipeline({
        modelProvider: {
          async generateGameBrief() {
            throw new Error('unsupported intent should not request a Game Brief');
          },
          async generateRawGameDsl() {
            throw new Error('unsupported intent should not request Raw DSL');
          }
        }
      });

      await expect(runPipeline(pipeline, { idea, language: idea === 'contra-like' ? 'en' : 'zh' })).resolves.toBe('RUNTIME_UNSUPPORTED');

      const intentPlan = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'intent_plan.json'), 'utf8'));
      expect(intentPlan).toMatchObject({
        normalizedGenre,
        runtimeDslSupport: 'unsupported',
        unsupportedCapabilities: expect.arrayContaining([expectedCapability])
      });
      await expect(runStore.readEvents(runId)).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'intent.planned', message: `Intent normalized to ${normalizedGenre}.` }),
          expect.objectContaining({ type: 'runtime.unsupported', message: expect.stringContaining(expectedCapability) })
        ])
      );
    }
  );

  it('returns explicit unsupported capabilities for unrecognized prompts instead of downgrading to shooter', async () => {
    const pipeline = createPipeline({
      modelProvider: {
        async generateGameBrief() {
          throw new Error('unsupported intent should not request a Game Brief');
        },
        async generateRawGameDsl() {
          throw new Error('unsupported intent should not request Raw DSL');
        }
      }
    });

    await expect(runPipeline(pipeline, { idea: '做一个全新的二维游戏', language: 'zh' })).resolves.toBe('RUNTIME_UNSUPPORTED');

    const intentPlan = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'intent_plan.json'), 'utf8'));
    expect(intentPlan).toMatchObject({
      normalizedGenre: 'unrecognized_2d_genre',
      runtimeDslSupport: 'unsupported',
      unsupportedCapabilities: ['recognized_2d_genre']
    });
    await expect(runStore.readEvents(runId)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'intent.planned', message: 'Intent normalized to unrecognized_2d_genre.' }),
        expect.objectContaining({ type: 'runtime.unsupported', message: expect.stringContaining('recognized_2d_genre') })
      ])
    );
  });

  it('fails production generation instead of falling back when the model returns invalid DSL', async () => {
    const pipeline = createPipeline({
      modelProvider: {
        async generateGameBrief() {
          return { ok: false, code: 'MODEL_SCHEMA_VALIDATION_FAILED', message: 'Game Brief schema validation failed.', issues: ['genre invalid'] };
        },
        async generateRawGameDsl() {
          throw new Error('raw DSL should not be requested');
        }
      }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('FAILED');
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ status: 'FAILED' });
    await expect(runStore.readEvents(runId)).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ type: 'model.failed' })]));
  });

  it('maps missing dist/index.html to PREVIEW_ARTIFACT_MISSING', async () => {
    const pipeline = createPipeline({
      compiler: { compile: compileWithoutDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('PREVIEW_ARTIFACT_MISSING');
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ status: 'PREVIEW_ARTIFACT_MISSING' });
    await expect(runStore.readEvents(runId)).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ type: 'build.failed' })]));
  });

  it('refreshes the pipeline artifact index with a build log ref when build fails', async () => {
    const pipeline = createPipeline({
      compiler: { compile: compileWithArtifactFiles },
      buildRunner: {
        async build() {
          await writeTextFile(workspace.getBuildLogPath(projectId, runId), 'vite build failed');
          return { ok: false, projectId, logPath: workspace.getBuildLogPath(projectId, runId), message: 'build failed' };
        }
      }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('BUILD_FAILED');

    const index = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_artifact_index.json'), 'utf8'));
    const acceptance = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_acceptance_report.json'), 'utf8'));
    expect(index.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'buildLog', status: 'present', artifactRoot: 'build-log', path: `${runId}.log` }),
        expect.objectContaining({ id: 'qaReport', status: 'missing', reason: 'qa_report_not_available_yet' }),
        expect.objectContaining({ id: 'pipelineAcceptanceReport', status: 'present', path: 'pipeline_acceptance_report.json' })
      ])
    );
    expect(acceptance).toMatchObject({
      projectId,
      runId,
      overallStatus: 'pass',
      previewable: true,
      checks: expect.arrayContaining([
        expect.objectContaining({ id: 'build_log', status: 'pass' }),
        expect.objectContaining({ id: 'qa_report', status: 'skipped' })
      ])
    });
  });

  it('maps QA runner exceptions to QA_FAILED and writes a QA report', async () => {
    const pipeline = createPipeline({
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run() {
          throw new Error('browser launch failed');
        }
      }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('QA_FAILED');
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ status: 'QA_FAILED' });
    await expect(readFile(workspace.getQaReportPath(projectId, runId), 'utf8')).resolves.toContain('"code": "QA_RUNNER_FAILED"');
    await expect(runStore.readEvents(runId)).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ type: 'qa.failed' })]));
  });

  it('does not mark blank-preview visual QA failures as PLAYABLE', async () => {
    const pipeline = createPipeline({
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre }) {
          return {
            status: 'QA_FAILED',
            runtime_status: 'FAILED',
            asset_semantic_status: 'PASSED',
            overall_status: 'QA_FAILED',
            visual_status: 'VISUAL_QA_FAILED',
            project_id: projectId,
            run_id: runId,
            genre: input.genre,
            preview_url: 'http://localhost/preview/index.html',
            seed: 'golden',
            required_events: { all: [], any_groups: [] },
            observed_events: ['game.ready', 'player.fired', 'projectile.spawned', 'enemy.hit', 'score.changed'],
            missing_events: [],
            missing_any_groups: [],
            console_errors: [],
            code: 'PREVIEW_BLANK_SCREEN',
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
          };
        }
      }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('QA_FAILED');
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ status: 'QA_FAILED' });
    await expect(runStore.readEvents(runId)).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ type: 'qa.failed', message: 'PREVIEW_BLANK_SCREEN' })]));
  });

  it('keeps project status PLAYABLE when runtime QA passes but asset semantic QA needs repair', async () => {
    let qaRuns = 0;
    const pipeline = createPipeline({
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre }) {
          qaRuns += 1;
          return createQaReport(input.genre, {
            asset_semantic_status: 'FAILED',
            overall_status: 'NEEDS_ASSET_REPAIR'
          });
        }
      }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('PLAYABLE');
    expect(qaRuns).toBe(1);
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ status: 'PLAYABLE' });
    await expect(runStore.readEvents(runId)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'qa.passed' })])
    );
    await expect(runStore.readEvents(runId)).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'asset-repair.started' })])
    );
    await expect(readQaReport()).resolves.toMatchObject({
      asset_semantic_repair: {
        enabled: false,
        attempted: false,
        skippedReason: 'asset_semantic_repair_disabled',
        attemptCount: 0,
        maxAttempts: 1,
        beforeOverallStatus: 'NEEDS_ASSET_REPAIR',
        beforeAssetSemanticStatus: 'FAILED'
      }
    });
  });

  it('runs one semantic asset repair attempt behind the explicit flag and reruns QA once', async () => {
    const rawDsl = RawGameDslSchema.parse(createShooterRawDsl());
    let buildRuns = 0;
    let qaRuns = 0;
    const pipeline = createPipeline({
      modelProvider: createModelProviderForRawDsl(rawDsl),
      compiler: {
        async compile(input) {
          return await compileWithHardSemanticMismatchArtifacts(input.ir);
        }
      },
      buildRunner: {
        async build() {
          buildRuns += 1;
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre }) {
          qaRuns += 1;
          if (qaRuns === 1) {
            return createQaReport(input.genre, {
              asset_semantic_status: 'FAILED',
              overall_status: 'NEEDS_ASSET_REPAIR'
            });
          }

          return createQaReport(input.genre, {
            overall_status: 'PLAYABLE_WITH_FALLBACK_ASSETS'
          });
        }
      },
      assetSemanticRepairConfig: { enabled: true, maxAttempts: 3 }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('PLAYABLE');

    expect(buildRuns).toBe(2);
    expect(qaRuns).toBe(2);
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ status: 'PLAYABLE' });
    const repairedReport = await readResolutionReport();
    expect(repairedReport.repair).toMatchObject({
      status: 'repaired',
      attempts: 1,
      maxAttempts: 1
    });
    expect(repairedReport.repair?.items.length).toBeGreaterThan(0);
    const repairedManifest = await readManifest(join(workspace.getGeneratedProjectPublicDir(projectId), 'asset_manifest.json'));
    expect(repairedManifest.assets.some((asset) => asset.semanticFit?.status === 'fallback_generated')).toBe(true);
    await expect(runStore.readEvents(runId)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'asset-repair.started' }),
        expect.objectContaining({ type: 'asset-repair.applied' }),
        expect.objectContaining({ type: 'qa.rerun.started' }),
        expect.objectContaining({ type: 'qa.passed' })
      ])
    );
    await expect(readQaReport()).resolves.toMatchObject({
      asset_semantic_repair: {
        enabled: true,
        attempted: true,
        attemptCount: 1,
        maxAttempts: 1,
        repairPlanTriggered: true,
        beforeOverallStatus: 'NEEDS_ASSET_REPAIR',
        beforeAssetSemanticStatus: 'FAILED',
        afterOverallStatus: 'PLAYABLE_WITH_FALLBACK_ASSETS',
        afterAssetSemanticStatus: 'PASSED',
        repairedRequirements: expect.arrayContaining([
          expect.objectContaining({
            requirementId: 'player',
            role: 'player_character',
            expectedConcept: 'cat',
            previousSource: 'local_asset_pack',
            previousSemanticFitStatus: 'mismatch',
            newSource: 'template_svg',
            newSemanticFitStatus: 'fallback_generated'
          })
        ])
      }
    });
  });

  it('does not repair fallback or warning playable statuses even when the flag is enabled', async () => {
    for (const report of [
      createQaReport('shooter', { overall_status: 'PLAYABLE_WITH_FALLBACK_ASSETS' }),
      createQaReport('shooter', { asset_semantic_status: 'WARNING', overall_status: 'PLAYABLE_WITH_ART_WARNINGS' }),
      createQaReport('shooter', { asset_semantic_status: 'FAILED', overall_status: 'PLAYABLE_WITH_FALLBACK_ASSETS' }),
      createQaReport('shooter', { asset_semantic_status: 'FAILED', overall_status: 'PLAYABLE_WITH_ART_WARNINGS' })
    ]) {
      await resetStores();
      let qaRuns = 0;
      const pipeline = createPipeline({
        compiler: { compile: compileWithDist },
        buildRunner: {
          async build() {
            return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
          }
        },
        qaRunner: {
          async run() {
            qaRuns += 1;
            return report;
          }
        },
        assetSemanticRepairConfig: { enabled: true, maxAttempts: 1 }
      });

      await expect(runPipeline(pipeline)).resolves.toBe('PLAYABLE');
      expect(qaRuns).toBe(1);
      await expect(runStore.readEvents(runId)).resolves.not.toEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'asset-repair.started' })])
      );
      await expect(readQaReport()).resolves.toMatchObject({
        asset_semantic_repair: {
          enabled: true,
          attempted: false,
          skippedReason: 'no_asset_semantic_repair_needed',
          attemptCount: 0,
          maxAttempts: 1,
          beforeOverallStatus: report.overall_status,
          beforeAssetSemanticStatus: report.asset_semantic_status
        }
      });
    }
  });

  it('does not repair runtime QA failures even when semantic fields are failed', async () => {
    let qaRuns = 0;
    const pipeline = createPipeline({
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre }) {
          qaRuns += 1;
          return createQaReport(input.genre, {
            status: 'QA_FAILED',
            runtime_status: 'FAILED',
            asset_semantic_status: 'FAILED',
            overall_status: 'QA_FAILED',
            code: 'PREVIEW_BLANK_SCREEN'
          });
        }
      },
      assetSemanticRepairConfig: { enabled: true, maxAttempts: 1 }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('QA_FAILED');
    expect(qaRuns).toBe(1);
    await expect(runStore.readEvents(runId)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'qa.failed', message: 'PREVIEW_BLANK_SCREEN' })])
    );
    await expect(runStore.readEvents(runId)).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'asset-repair.started' })])
    );
    await expect(readQaReport()).resolves.toMatchObject({
      asset_semantic_repair: {
        enabled: true,
        attempted: false,
        skippedReason: 'runtime_failed_not_asset_semantic_repair',
        attemptCount: 0,
        maxAttempts: 1
      }
    });
  });

  it('does not repair asset load failures even when semantic fields are failed', async () => {
    let qaRuns = 0;
    const pipeline = createPipeline({
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre }) {
          qaRuns += 1;
          return createQaReport(input.genre, {
            asset_semantic_status: 'FAILED',
            overall_status: 'NEEDS_ASSET_REPAIR',
            asset_report: {
              semantic_status: 'FAILED',
              required: ['player'],
              ready: ['player'],
              fallback_used: [],
              placeholder_used: [],
              missing: [],
              assets: [],
              semantic_issues: [],
              failures: [
                {
                  code: 'ASSET_LOAD_FAILED',
                  message: 'Runtime failed to load player asset.',
                  asset_ids: ['player'],
                  roles: ['player_character']
                }
              ]
            }
          });
        }
      },
      assetSemanticRepairConfig: { enabled: true, maxAttempts: 1 }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('PLAYABLE');
    expect(qaRuns).toBe(1);
    await expect(runStore.readEvents(runId)).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'asset-repair.started' })])
    );
    await expect(readQaReport()).resolves.toMatchObject({
      asset_semantic_repair: {
        enabled: true,
        attempted: false,
        skippedReason: 'runtime_asset_failure_not_asset_semantic_repair',
        attemptCount: 0,
        maxAttempts: 1
      }
    });
  });

  it('records no executable item when QA asks for repair without hard semantic evidence', async () => {
    const rawDsl = RawGameDslSchema.parse(createShooterRawDsl());
    let qaRuns = 0;
    const pipeline = createPipeline({
      modelProvider: createModelProviderForRawDsl(rawDsl),
      compiler: {
        async compile(input) {
          return await compileWithExactSemanticArtifacts(input.ir);
        }
      },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre }) {
          qaRuns += 1;
          return createQaReport(input.genre, {
            asset_semantic_status: 'FAILED',
            overall_status: 'NEEDS_ASSET_REPAIR'
          });
        }
      },
      assetSemanticRepairConfig: { enabled: true, maxAttempts: 1 }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('PLAYABLE');
    expect(qaRuns).toBe(1);
    await expect(runStore.readEvents(runId)).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'asset-repair.started' })])
    );
    await expect(readQaReport()).resolves.toMatchObject({
      asset_semantic_repair: {
        enabled: true,
        attempted: false,
        skippedReason: 'no_executable_repair_items',
        repairPlanTriggered: true,
        executableItemCount: 0
      }
    });
  });

  it('records executor failures without rerunning QA', async () => {
    const rawDsl = RawGameDslSchema.parse(createShooterRawDsl());
    let qaRuns = 0;
    const pipeline = createPipeline({
      modelProvider: createModelProviderForRawDsl(rawDsl),
      compiler: {
        async compile(input) {
          return await compileWithHardSemanticMismatchArtifacts(input.ir, { assetPlanProjectId: 'proj_other' });
        }
      },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre }) {
          qaRuns += 1;
          return createQaReport(input.genre, {
            asset_semantic_status: 'FAILED',
            overall_status: 'NEEDS_ASSET_REPAIR'
          });
        }
      },
      assetSemanticRepairConfig: { enabled: true, maxAttempts: 1 }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('PLAYABLE');
    expect(qaRuns).toBe(1);
    await expect(runStore.readEvents(runId)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'asset-repair.failed' })])
    );
    await expect(readQaReport()).resolves.toMatchObject({
      asset_semantic_repair: {
        enabled: true,
        attempted: true,
        skippedReason: 'repair_execution_failed',
        attemptCount: 1,
        failureReasons: [expect.stringContaining('Asset repair project identity mismatch')]
      }
    });
  });

  it('records rebuild failure after a successful repair without rerunning QA', async () => {
    const rawDsl = RawGameDslSchema.parse(createShooterRawDsl());
    let buildRuns = 0;
    let qaRuns = 0;
    const pipeline = createPipeline({
      modelProvider: createModelProviderForRawDsl(rawDsl),
      compiler: {
        async compile(input) {
          return await compileWithHardSemanticMismatchArtifacts(input.ir);
        }
      },
      buildRunner: {
        async build() {
          buildRuns += 1;
          if (buildRuns === 1) {
            return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
          }

          return { ok: false, projectId, logPath: workspace.getBuildLogPath(projectId, runId), message: 'repair rebuild failed' };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre }) {
          qaRuns += 1;
          return createQaReport(input.genre, {
            asset_semantic_status: 'FAILED',
            overall_status: 'NEEDS_ASSET_REPAIR'
          });
        }
      },
      assetSemanticRepairConfig: { enabled: true, maxAttempts: 1 }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('BUILD_FAILED');
    expect(buildRuns).toBe(2);
    expect(qaRuns).toBe(1);
    await expect(readQaReport()).resolves.toMatchObject({
      asset_semantic_repair: {
        enabled: true,
        attempted: true,
        skippedReason: 'repair_rebuild_failed',
        attemptCount: 1,
        failureReasons: ['Repair build/preview ended with status BUILD_FAILED.']
      }
    });
    await expect(runStore.readRun(runId)).resolves.toMatchObject({
      status: 'BUILD_FAILED',
      steps: expect.arrayContaining([
        { name: 'build', status: 'FAILED' },
        { name: 'qa', status: 'DONE' }
      ])
    });
  });

  it('records force template fallback repair actions through pipeline metadata', async () => {
    const rawDsl = RawGameDslSchema.parse(createShooterRawDsl());
    let qaRuns = 0;
    const pipeline = createPipeline({
      modelProvider: createModelProviderForRawDsl(rawDsl),
      compiler: {
        async compile(input) {
          return await compileWithHardSemanticMismatchArtifacts(input.ir, { source: 'template_svg' });
        }
      },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre }) {
          qaRuns += 1;
          return qaRuns === 1
            ? createQaReport(input.genre, {
                asset_semantic_status: 'FAILED',
                overall_status: 'NEEDS_ASSET_REPAIR'
              })
            : createQaReport(input.genre);
        }
      },
      assetSemanticRepairConfig: { enabled: true, maxAttempts: 1 }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('PLAYABLE');
    expect(qaRuns).toBe(2);
    await expect(readQaReport()).resolves.toMatchObject({
      asset_semantic_repair: {
        enabled: true,
        attempted: true,
        repairedRequirements: expect.arrayContaining([
          expect.objectContaining({
            requirementId: 'player',
            action: 'force_template_svg_fallback',
            previousSource: 'template_svg',
            newSource: 'template_svg',
            newSemanticFitStatus: 'fallback_generated'
          })
        ])
      }
    });
  });

  it('does not repair inconsistent QA_FAILED overall status', async () => {
    let qaRuns = 0;
    const pipeline = createPipeline({
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre }) {
          qaRuns += 1;
          return createQaReport(input.genre, {
            asset_semantic_status: 'FAILED',
            overall_status: 'QA_FAILED'
          });
        }
      },
      assetSemanticRepairConfig: { enabled: true, maxAttempts: 1 }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('PLAYABLE');
    expect(qaRuns).toBe(1);
    await expect(readQaReport()).resolves.toMatchObject({
      asset_semantic_repair: {
        enabled: true,
        attempted: false,
        skippedReason: 'runtime_failed_not_asset_semantic_repair'
      }
    });
  });

  function createPipeline(overrides: PipelineOverrides = {}): GenerationPipelineService {
    return new GenerationPipelineService(
      projectStore,
      runStore,
      workspace,
      overrides.modelProvider ?? {
        async generateGameBrief() {
          return { ok: false, code: 'MODEL_NOT_AVAILABLE', message: 'unit test fallback' };
        },
        async generateRawGameDsl() {
          return { ok: false, code: 'MODEL_NOT_AVAILABLE', message: 'unit test fallback' };
        }
      },
      overrides.compiler ?? { compile: compileWithDist },
      overrides.buildRunner ?? {
        async build() {
          return { ok: false, projectId, logPath: workspace.getBuildLogPath(projectId, runId), message: 'build failed' };
        }
      },
      overrides.qaRunner ?? {
        async run(input: { genre: QaGenre }) {
          return createQaReport(input.genre);
        }
      },
      overrides.assetSemanticRepairConfig ?? { enabled: false, maxAttempts: 1 }
    );
  }

  async function runPipeline(pipeline: GenerationPipelineService, input: Partial<{ idea: string; language: string }> = {}) {
    return await pipeline.run({ projectId, runId, idea: input.idea ?? 'cat shooter', language: input.language ?? 'en' });
  }

  async function compileWithDist(): Promise<RuntimeCompileResult> {
    const distDir = workspace.getGeneratedProjectDistDir(projectId);
    await mkdir(distDir, { recursive: true });
    await writeFile(join(distDir, 'index.html'), '<html></html>', 'utf8');
    return compileResult();
  }

  async function compileWithArtifactFiles(): Promise<RuntimeCompileResult> {
    const distDir = workspace.getGeneratedProjectDistDir(projectId);
    await mkdir(distDir, { recursive: true });
    await writeFile(join(distDir, 'index.html'), '<html></html>', 'utf8');
    return compileResult([
      'asset_plan.json',
      'public/asset_manifest.json',
      'asset_resolution_report.json',
      'shooter/src/asset-manifest.generated.json',
      'asset_pipeline_report.json',
      'pipeline_artifact_index.json'
    ]);
  }

  async function compileWithHardSemanticMismatchArtifacts(
    ir: NormalizedGameIr,
    options: { source?: 'local_asset_pack' | 'template_svg'; assetPlanProjectId?: string } = {}
  ): Promise<RuntimeCompileResult> {
    const distDir = workspace.getGeneratedProjectDistDir(projectId);
    await mkdir(distDir, { recursive: true });
    await writeFile(join(distDir, 'index.html'), '<html></html>', 'utf8');
    await writeHardSemanticMismatchArtifacts(buildAssetPlanFromIr(projectId, ir), options);
    return compileResult();
  }

  async function compileWithExactSemanticArtifacts(ir: NormalizedGameIr): Promise<RuntimeCompileResult> {
    const distDir = workspace.getGeneratedProjectDistDir(projectId);
    await mkdir(distDir, { recursive: true });
    await writeFile(join(distDir, 'index.html'), '<html></html>', 'utf8');
    await writeExactSemanticArtifacts(buildAssetPlanFromIr(projectId, ir));
    return compileResult();
  }

  async function compileWithoutDist(): Promise<RuntimeCompileResult> {
    await mkdir(workspace.getGeneratedProjectDir(projectId), { recursive: true });
    return compileResult();
  }

  function compileResult(files: string[] = []): RuntimeCompileResult {
    return {
      ok: true,
      projectId,
      outputDir: workspace.getGeneratedProjectDir(projectId),
      distDir: workspace.getGeneratedProjectDistDir(projectId),
      templateId: 'shooter_v1',
      files
    };
  }

  function createModelProviderForRawDsl(rawDsl: RawGameDsl): NonNullable<PipelineOverrides['modelProvider']> {
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
      async generateGameBrief() {
        return {
          ok: true,
          value: brief,
          rawText: '{}',
          rawOutputPath: workspace.getModelOutputPath(projectId, runId, 'game-brief.raw.json')
        };
      },
      async generateRawGameDsl() {
        return {
          ok: true,
          value: rawDsl,
          rawText: JSON.stringify(rawDsl),
          rawOutputPath: workspace.getModelOutputPath(projectId, runId, 'raw-game-dsl.raw.json')
        };
      }
    };
  }

  function createQaReport(genre: QaGenre, patch: Partial<QaReport> = {}): QaReport {
    const now = new Date().toISOString();
    return {
      status: 'PASSED',
      runtime_status: 'PASSED',
      asset_semantic_status: 'PASSED',
      overall_status: 'PLAYABLE',
      project_id: projectId,
      run_id: runId,
      genre,
      preview_url: 'http://localhost/preview/index.html',
      seed: 'golden',
      required_events: { all: [], any_groups: [] },
      observed_events: [],
      missing_events: [],
      missing_any_groups: [],
      console_errors: [],
      started_at: now,
      completed_at: now,
      ...patch
    };
  }

  async function writeHardSemanticMismatchArtifacts(
    plan: AssetPlan,
    options: { source?: 'local_asset_pack' | 'template_svg'; assetPlanProjectId?: string } = {}
  ): Promise<void> {
    const projectDir = workspace.getGeneratedProjectDir(projectId);
    const publicAssetsDir = join(projectDir, 'public', 'assets');
    const source = options.source ?? 'local_asset_pack';
    const writtenPlan = options.assetPlanProjectId === undefined ? plan : { ...plan, projectId: options.assetPlanProjectId };
    await mkdir(publicAssetsDir, { recursive: true });
    await writeFile(join(projectDir, 'asset_plan.json'), `${JSON.stringify(writtenPlan, null, 2)}\n`, 'utf8');

    const assets = plan.items.map((item) => ({
      id: item.id,
      loadKey: `agm.${item.id}`,
      role: item.role,
      type: 'image' as const,
      format: item.format,
      path: `assets/${item.id}.svg`,
      source,
      ...(source === 'local_asset_pack'
        ? {
            sourcePack: 'kenney-tiny-shooter-tanks',
            licenseId: 'CC0-1.0',
            licenseName: 'Creative Commons CC0 1.0 Universal',
            attribution: 'Kenney Tanks by Kenney Vleugels',
            sourceUrl: 'https://kenney.nl/assets/tanks'
          }
        : {}),
      required: item.required,
      status: 'ready' as const,
      size: item.size,
      semanticFit:
        item.semantic?.strictness === 'hard'
          ? {
              status: 'mismatch' as const,
              confidence: 0,
              strictness: 'hard' as const,
              expectedConcept: item.semantic.expectedConcept,
              expectedAnyTags: item.semantic.expectedAnyTags,
              actualTags: ['tank', 'vehicle', 'turret'],
              missingTags: item.semantic.expectedAnyTags,
              conflictingTags: ['tank', 'vehicle'],
              reason: `Local asset semantic tags do not satisfy expected ${item.semantic.expectedConcept}.`
            }
          : {
              status: 'exact' as const,
              confidence: 1,
              strictness: item.semantic?.strictness,
              expectedConcept: item.semantic?.expectedConcept,
              expectedAnyTags: item.semantic?.expectedAnyTags,
              actualTags: item.semantic?.expectedAnyTags,
              reason: `Local asset semantic tags exactly match expected ${item.semantic?.expectedConcept ?? item.id}.`
            }
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

    for (const asset of manifest.assets) {
      await writeFile(join(projectDir, 'public', asset.path), '<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf8');
    }
    await writeFile(join(projectDir, 'public', 'asset_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    await writeFile(join(projectDir, 'asset_resolution_report.json'), `${JSON.stringify(createBadResolutionReport(plan, manifest), null, 2)}\n`, 'utf8');
  }

  async function writeExactSemanticArtifacts(plan: AssetPlan): Promise<void> {
    const projectDir = workspace.getGeneratedProjectDir(projectId);
    const publicAssetsDir = join(projectDir, 'public', 'assets');
    await mkdir(publicAssetsDir, { recursive: true });
    await writeFile(join(projectDir, 'asset_plan.json'), `${JSON.stringify(plan, null, 2)}\n`, 'utf8');

    const assets = plan.items.map((item) => ({
      id: item.id,
      loadKey: `agm.${item.id}`,
      role: item.role,
      type: 'image' as const,
      format: item.format,
      path: `assets/${item.id}.svg`,
      source: 'template_svg' as const,
      required: item.required,
      status: 'ready' as const,
      size: item.size,
      semanticFit: {
        status: 'exact' as const,
        confidence: 1,
        strictness: item.semantic?.strictness,
        expectedConcept: item.semantic?.expectedConcept,
        expectedAnyTags: item.semantic?.expectedAnyTags,
        actualTags: item.semantic?.expectedAnyTags,
        reason: `Test asset semantic tags exactly match expected ${item.semantic?.expectedConcept ?? item.id}.`
      }
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

    for (const asset of manifest.assets) {
      await writeFile(join(projectDir, 'public', asset.path), '<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf8');
    }
    await writeFile(join(projectDir, 'public', 'asset_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    await writeFile(join(projectDir, 'asset_resolution_report.json'), `${JSON.stringify(createBadResolutionReport(plan, manifest), null, 2)}\n`, 'utf8');
  }

  function createBadResolutionReport(plan: AssetPlan, manifest: AssetManifest): AssetResolutionReport {
    const planById = new Map(plan.items.map((item) => [item.id, item]));
    const hasSelectedPack = manifest.assets.some((asset) => asset.sourcePack !== undefined);
    return AssetResolutionReportSchema.parse({
      version: 'asset-resolution-report-v0.1',
      projectId,
      summary: {
        selectedProvider: hasSelectedPack ? 'local_asset_pack' : 'template_svg',
        selectedPackId: hasSelectedPack ? 'kenney-tiny-shooter-tanks' : undefined,
        fallbackUsed: false,
        reason: 'Selected complete local asset pack kenney-tiny-shooter-tanks.'
      },
      assets: manifest.assets.map((asset) => ({
        id: asset.id,
        role: asset.role,
        selected: {
          source: asset.source,
          sourcePack: asset.sourcePack,
          path: asset.path,
          status: asset.status
        },
        expectedSemantic: planById.get(asset.id)?.semantic,
        semanticFit: asset.semanticFit
      })),
      candidates: hasSelectedPack
        ? [
            {
              packId: 'kenney-tiny-shooter-tanks',
              status: 'selected',
              reason: 'selected',
              message: 'Selected complete local asset pack kenney-tiny-shooter-tanks.'
            }
          ]
        : []
    });
  }

  async function readManifest(path: string): Promise<AssetManifest> {
    return AssetManifestSchema.parse(JSON.parse(await readFile(path, 'utf8')));
  }

  async function readQaReport(): Promise<QaReport> {
    return JSON.parse(await readFile(workspace.getQaReportPath(projectId, runId), 'utf8')) as QaReport;
  }

  async function readResolutionReport(): Promise<AssetResolutionReport> {
    return AssetResolutionReportSchema.parse(JSON.parse(await readFile(join(workspace.getGeneratedProjectDir(projectId), 'asset_resolution_report.json'), 'utf8')));
  }
});

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? await collectFiles(path) : [path];
    })
  );

  return files.flat();
}

async function writeTextFile(path: string, value: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, 'utf8');
}
