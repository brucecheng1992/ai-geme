import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createCollectorRawDsl } from '../contracts/fixtures.js';
import { GenerationPipelineService } from '../../apps/maker-api/src/projects/generation-pipeline.service.js';
import { ProjectStoreService } from '../../apps/maker-api/src/projects/project-store.service.js';
import { RunStoreService } from '../../apps/maker-api/src/projects/run-store.service.js';
import { LocalWorkspaceService } from '../../apps/maker-api/src/workspace/local-workspace.service.js';
import type { RuntimeCompileResult } from '../../apps/maker-api/src/compiler/compiler.types.js';
import type { QaGenre } from '../../apps/maker-api/src/qa/qa.types.js';
import { GameBriefSchema, RawGameDslSchema } from '../../packages/game-dsl/src/index.js';

const projectId = 'proj_20260610_050000_pipe';
const runId = 'run_20260610_050000_pipe';

type PipelineOverrides = {
  modelProvider?: ConstructorParameters<typeof GenerationPipelineService>[3];
  compiler?: ConstructorParameters<typeof GenerationPipelineService>[4];
  buildRunner?: ConstructorParameters<typeof GenerationPipelineService>[5];
  qaRunner?: ConstructorParameters<typeof GenerationPipelineService>[6];
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

    await expect(runPipeline(pipeline)).resolves.toBe('PLAYABLE');

    const resultFiles = await collectFiles(join(root, 'data/local-data/result'));
    expect(resultFiles).toHaveLength(1);
    expect(resultFiles[0]).toContain('/data/local-data/result/');
    expect(resultFiles[0]).toContain(`__${projectId}__${runId}__raw-game-dsl.json`);
    await expect(readFile(resultFiles[0], 'utf8')).resolves.toContain(`"title": "${rawDsl.metadata.title}"`);
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
          return {
            status: 'PASSED',
            project_id: projectId,
            run_id: runId,
            genre: input.genre,
            preview_url: 'http://localhost/preview/index.html',
            seed: 'golden',
            required_events: { all: [], any_groups: [] },
            observed_events: [],
            missing_events: [],
            missing_any_groups: [],
            console_errors: [],
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
          };
        }
      }
    );
  }

  async function runPipeline(pipeline: GenerationPipelineService) {
    return await pipeline.run({ projectId, runId, idea: 'cat shooter', language: 'en' });
  }

  async function compileWithDist(): Promise<RuntimeCompileResult> {
    const distDir = workspace.getGeneratedProjectDistDir(projectId);
    await mkdir(distDir, { recursive: true });
    await writeFile(join(distDir, 'index.html'), '<html></html>', 'utf8');
    return compileResult();
  }

  async function compileWithoutDist(): Promise<RuntimeCompileResult> {
    await mkdir(workspace.getGeneratedProjectDir(projectId), { recursive: true });
    return compileResult();
  }

  function compileResult(): RuntimeCompileResult {
    return {
      ok: true,
      projectId,
      outputDir: workspace.getGeneratedProjectDir(projectId),
      distDir: workspace.getGeneratedProjectDistDir(projectId),
      templateId: 'shooter_v1',
      files: []
    };
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
