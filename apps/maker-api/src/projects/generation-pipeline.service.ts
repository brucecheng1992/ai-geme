import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { NormalizedGameIr, RawGameDsl } from '../../../../packages/game-dsl/src/index.js';
import { validateAndNormalizeRawGameDsl } from '../../../../packages/game-dsl/src/index.js';
import type { RuntimeCompileResult } from '../compiler/compiler.types.js';
import { TemplateCompilerService } from '../compiler/template-compiler.service.js';
import { ViteBuildRunnerService } from '../compiler/vite-build-runner.service.js';
import { GameDslProviderService, type GameDslProviderResult } from '../model-provider/game-dsl-provider.service.js';
import { PlaywrightQaRunnerService } from '../qa/playwright-qa-runner.service.js';
import type { QaGenre, QaReport } from '../qa/qa.types.js';
import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import { createDeterministicRawGameDsl } from './deterministic-game-dsl.js';
import { ProjectStoreService } from './project-store.service.js';
import type { JobEventRecord, ProjectStatus } from './project-state.types.js';
import { RunStoreService } from './run-store.service.js';

type GenerationPipelineInput = {
  projectId: string;
  runId: string;
  idea: string;
  language: string;
};
type DslLanguage = 'zh' | 'en';

type DslProvider = Pick<GameDslProviderService, 'generateGameBrief' | 'generateRawGameDsl'>;
type RuntimeCompiler = Pick<TemplateCompilerService, 'compile'>;
type RuntimeBuilder = Pick<ViteBuildRunnerService, 'build'>;
type RuntimeQaRunner = Pick<PlaywrightQaRunnerService, 'run'>;
type RawDslGenerationResult = { ok: true; value: RawGameDsl } | { ok: false; status: ProjectStatus };

export class GenerationPipelineService {
  constructor(
    private readonly projectStore: ProjectStoreService,
    private readonly runStore: RunStoreService,
    private readonly workspace: LocalWorkspaceService,
    private readonly modelProvider: DslProvider,
    private readonly compiler: RuntimeCompiler,
    private readonly buildRunner: RuntimeBuilder,
    private readonly qaRunner: RuntimeQaRunner
  ) {}

  async run(input: GenerationPipelineInput): Promise<ProjectStatus> {
    const generated = await this.generateRawDsl(input);

    if (!generated.ok) {
      return generated.status;
    }

    const rawDsl = generated.value;
    await this.appendEvent(input.runId, 'dsl.generated', 'Raw Game DSL generated.');

    await this.setStatus(input.projectId, input.runId, 'DSL_VALIDATING', 'dsl-validation', 'RUNNING');
    const normalized = validateAndNormalizeRawGameDsl(rawDsl);

    if (!normalized.ok) {
      await this.setStatus(input.projectId, input.runId, 'DSL_VALIDATION_FAILED', 'dsl-validation', 'FAILED');
      await this.appendEvent(input.runId, 'dsl.validation.failed', normalized.issues.map((issue) => issue.message).join('; '));
      return 'DSL_VALIDATION_FAILED';
    }

    await this.setStatus(input.projectId, input.runId, 'IR_NORMALIZED', 'dsl-validation', 'DONE', {
      title: rawDsl.metadata.title,
      genre: rawDsl.game.genre
    });
    await this.appendEvent(input.runId, 'ir.generated', 'Normalized IR generated from validated DSL.');

    const compiled = await this.compileProject(input, normalized.ir);
    if (!compiled.ok) {
      return 'BUILD_FAILED';
    }
    const built = await this.buildProject(input, compiled);

    if (built !== 'PREVIEW_READY') {
      return built;
    }

    return await this.runQa(input, rawDsl.game.genre);
  }

  private async generateRawDsl(input: GenerationPipelineInput): Promise<RawDslGenerationResult> {
    await this.setStatus(input.projectId, input.runId, 'DSL_GENERATING', 'dsl-generation', 'RUNNING');
    const language = normalizeLanguage(input.language);
    let brief: Awaited<ReturnType<DslProvider['generateGameBrief']>>;

    try {
      brief = await this.modelProvider.generateGameBrief({ ...input, language });
    } catch (error) {
      return await this.failThrownModelGeneration(input, error);
    }

    if (brief.ok) {
      let raw: Awaited<ReturnType<DslProvider['generateRawGameDsl']>>;

      try {
        raw = await this.modelProvider.generateRawGameDsl({ ...input, language, brief: brief.value });
      } catch (error) {
        return await this.failThrownModelGeneration(input, error);
      }

      if (raw.ok) {
        await this.setStatus(input.projectId, input.runId, 'DSL_GENERATED', 'dsl-generation', 'DONE');
        return { ok: true, value: raw.value };
      }

      return await this.handleModelGenerationFailure(input, raw);
    }

    return await this.handleModelGenerationFailure(input, brief);
  }

  private async compileProject(input: GenerationPipelineInput, ir: NormalizedGameIr): Promise<RuntimeCompileResult | { ok: false }> {
    await this.setStatus(input.projectId, input.runId, 'COMPILING', 'project-generation', 'RUNNING');
    let compiled: RuntimeCompileResult;

    try {
      compiled = await this.compiler.compile({ projectId: input.projectId, runId: input.runId, ir });
    } catch (error) {
      await this.setStatus(input.projectId, input.runId, 'BUILD_FAILED', 'project-generation', 'FAILED');
      await this.appendEvent(input.runId, 'build.failed', errorMessage(error, 'Project generation failed before build.'));
      return { ok: false };
    }

    await this.setStatus(input.projectId, input.runId, 'COMPILED', 'project-generation', 'DONE');
    await this.appendEvent(input.runId, 'project.generated', `Phaser/Vite project generated at ${compiled.outputDir}.`);
    return compiled;
  }

  private async buildProject(input: GenerationPipelineInput, compiled: RuntimeCompileResult): Promise<ProjectStatus> {
    await this.setStatus(input.projectId, input.runId, 'BUILDING', 'build', 'RUNNING');
    await this.appendEvent(input.runId, 'build.started', 'Installing generated project dependencies and running Vite build.');
    let build: Awaited<ReturnType<RuntimeBuilder['build']>>;

    try {
      build = await this.buildRunner.build({ projectId: input.projectId, runId: input.runId, projectDir: compiled.outputDir });
    } catch (error) {
      await this.setStatus(input.projectId, input.runId, 'BUILD_FAILED', 'build', 'FAILED');
      await this.appendEvent(input.runId, 'build.failed', errorMessage(error, 'Build runner failed.'));
      return 'BUILD_FAILED';
    }

    if (!build.ok) {
      await this.setStatus(input.projectId, input.runId, 'BUILD_FAILED', 'build', 'FAILED');
      await this.appendEvent(input.runId, 'build.failed', build.message);
      return 'BUILD_FAILED';
    }

    const previewIndex = join(build.distDir, 'index.html');
    if (!(await pathExists(previewIndex))) {
      await this.setStatus(input.projectId, input.runId, 'PREVIEW_ARTIFACT_MISSING', 'build', 'FAILED');
      await this.appendEvent(input.runId, 'build.failed', `Preview index.html is missing at ${previewIndex}.`);
      return 'PREVIEW_ARTIFACT_MISSING';
    }

    const previewUrl = this.getPreviewUrl(input.projectId);
    await this.setStatus(input.projectId, input.runId, 'PREVIEW_READY', 'build', 'DONE', { preview_url: previewUrl });
    await this.appendEvent(input.runId, 'build.success', 'Vite build completed and preview artifact exists.');
    return 'PREVIEW_READY';
  }

  private async runQa(input: GenerationPipelineInput, genre: QaGenre): Promise<ProjectStatus> {
    await this.setStatus(input.projectId, input.runId, 'QA_RUNNING', 'qa', 'RUNNING');
    await this.appendEvent(input.runId, 'qa.started', 'Playwright QA started.');
    const previewUrl = this.getPreviewUrl(input.projectId);
    let report: QaReport;

    try {
      report = await this.qaRunner.run({ projectId: input.projectId, runId: input.runId, genre, previewUrl });
    } catch (error) {
      report = await this.writeQaFailureReport(input, genre, previewUrl, errorMessage(error, 'Playwright QA runner failed.'));
    }

    if (report.status === 'PASSED') {
      await this.setStatus(input.projectId, input.runId, 'PLAYABLE', 'qa', 'DONE');
      await this.appendEvent(input.runId, 'qa.passed', 'Playwright QA passed.');
      return 'PLAYABLE';
    }

    await this.setStatus(input.projectId, input.runId, 'QA_FAILED', 'qa', 'FAILED');
    await this.appendEvent(input.runId, 'qa.failed', report.code ?? 'Playwright QA failed.');
    return 'QA_FAILED';
  }

  private async setStatus(
    projectId: string,
    runId: string,
    status: ProjectStatus,
    step: string,
    stepStatus: 'RUNNING' | 'DONE' | 'FAILED',
    patch: Partial<{ title: string; genre: string; preview_url: string }> = {}
  ): Promise<void> {
    await this.runStore.updateRunStatus(runId, status);
    const steppedRun = await this.runStore.updateStep(runId, step, stepStatus);
    await this.projectStore.updateProjectStatus(projectId, status, patch);
    await this.projectStore.writeLatestRun(projectId, steppedRun);
  }

  private async appendEvent(runId: string, type: string, message: string): Promise<void> {
    const event: JobEventRecord = {
      timestamp: new Date().toISOString(),
      type,
      message
    };
    await this.runStore.appendEvent(runId, event);
  }

  private async handleModelGenerationFailure(
    input: GenerationPipelineInput,
    failure: GameDslProviderResult<unknown>
  ): Promise<RawDslGenerationResult> {
    if (shouldUseLocalFallback(failure)) {
      return { ok: true, value: await this.writeDeterministicFallback(input, failure) };
    }

    const reason = failure.ok ? 'unknown' : `${failure.code}: ${failure.message}`;
    await this.failModelGeneration(input, `Model generation failed: ${reason}`);
    return { ok: false, status: 'FAILED' };
  }

  private async failThrownModelGeneration(input: GenerationPipelineInput, error: unknown): Promise<RawDslGenerationResult> {
    await this.failModelGeneration(input, `Model generation threw: ${errorMessage(error, 'unknown error')}`);
    return { ok: false, status: 'FAILED' };
  }

  private async failModelGeneration(input: GenerationPipelineInput, message: string): Promise<void> {
    await this.setStatus(input.projectId, input.runId, 'FAILED', 'dsl-generation', 'FAILED');
    await this.appendEvent(input.runId, 'model.failed', message);
  }

  private async writeDeterministicFallback(input: GenerationPipelineInput, failure: GameDslProviderResult<unknown>): Promise<RawGameDsl> {
    const fallback = createDeterministicRawGameDsl(input.idea, input.language);
    const outputPath = this.workspace.getModelOutputPath(input.projectId, input.runId, 'raw-game-dsl.raw.json');
    const reason = failure.ok ? 'unknown' : `${failure.code}: ${failure.message}`;

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(fallback, null, 2)}\n`, 'utf8');
    await this.setStatus(input.projectId, input.runId, 'DSL_GENERATED', 'dsl-generation', 'DONE');
    await this.appendEvent(input.runId, 'model.fallback', `Using deterministic local DSL fallback because model generation failed: ${reason}`);
    return fallback;
  }

  private async writeQaFailureReport(input: GenerationPipelineInput, genre: QaGenre, previewUrl: string, message: string): Promise<QaReport> {
    const now = new Date().toISOString();
    const report: QaReport = {
      status: 'QA_FAILED',
      project_id: input.projectId,
      run_id: input.runId,
      genre,
      preview_url: previewUrl,
      seed: 'golden',
      required_events: { all: [], any_groups: [] },
      observed_events: [],
      missing_events: [],
      missing_any_groups: [],
      console_errors: [],
      code: 'QA_RUNNER_FAILED',
      message,
      started_at: now,
      completed_at: now
    };
    const reportPath = this.workspace.getQaReportPath(input.projectId, input.runId);

    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    return report;
  }

  private getPreviewUrl(projectId: string): string {
    const baseUrl = process.env.PREVIEW_BASE_URL ?? 'http://localhost:3000';
    return `${baseUrl.replace(/\/$/, '')}/preview/${projectId}/index.html`;
  }
}

function normalizeLanguage(language: string): DslLanguage {
  return language === 'zh' ? 'zh' : 'en';
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function shouldUseLocalFallback(failure: GameDslProviderResult<unknown>): boolean {
  return !failure.ok && failure.code === 'MODEL_NOT_AVAILABLE';
}
