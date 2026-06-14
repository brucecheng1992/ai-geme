import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  AssetManifestSchema,
  AssetResolutionReportSchema,
  buildAssetRepairPlan,
  executeAssetRepairPlan,
  type AssetManifest,
  type AssetRepairExecutionResult,
  type AssetRepairPlan,
  type AssetRepairPlanItem,
  type AssetResolutionReport
} from '../../../../packages/asset-pipeline/src/index.js';
import type { NormalizedGameIr, RawGameDsl } from '../../../../packages/game-dsl/src/index.js';
import {
  buildRuntimeCapabilityReport,
  buildGameDslArtifact,
  checkPhaserRuntimeCapabilities,
  validateAndNormalizeRawGameDsl,
  validateGameDslArtifact,
  withDslValidationSourceArtifact,
  type DslValidationReport,
  type GameDslArtifact,
  type RuntimeCapabilityReport
} from '../../../../packages/game-dsl/src/index.js';
import type { RuntimeCompileResult, RuntimeCompileSuccess } from '../compiler/compiler.types.js';
import { TemplateCompilerService } from '../compiler/template-compiler.service.js';
import { ViteBuildRunnerService } from '../compiler/vite-build-runner.service.js';
import { GameDslProviderService, type GameDslProviderResult } from '../model-provider/game-dsl-provider.service.js';
import { buildIntentPlan, type IntentPlan } from '../model-provider/intent-plan.js';
import { PlaywrightQaRunnerService } from '../qa/playwright-qa-runner.service.js';
import type { QaAssetSemanticRepairReport, QaAssetSemanticRepairSkippedReason, QaGenre, QaReport } from '../qa/qa.types.js';
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
type RawDslGenerationResult = { ok: true; artifact: GameDslArtifact } | { ok: false; status: ProjectStatus };
type QaPipelineResult =
  | { kind: 'report'; report: QaReport; assetSemanticRepair: QaAssetSemanticRepairReport }
  | { kind: 'status'; status: ProjectStatus; report: QaReport; assetSemanticRepair: QaAssetSemanticRepairReport };

type ExecutableRepairPlanItem = AssetRepairPlanItem & {
  strictness: 'hard';
  action: 'blacklist_candidate_then_reresolve' | 'force_template_svg_fallback';
};

export type AssetSemanticRepairConfig = {
  enabled: boolean;
  maxAttempts: number;
  assetPacksDir?: string;
};

const DEFAULT_ASSET_SEMANTIC_REPAIR_CONFIG: AssetSemanticRepairConfig = {
  enabled: false,
  maxAttempts: 1
};

export class GenerationPipelineService {
  constructor(
    private readonly projectStore: ProjectStoreService,
    private readonly runStore: RunStoreService,
    private readonly workspace: LocalWorkspaceService,
    private readonly modelProvider: DslProvider,
    private readonly compiler: RuntimeCompiler,
    private readonly buildRunner: RuntimeBuilder,
    private readonly qaRunner: RuntimeQaRunner,
    private readonly assetSemanticRepairConfig: AssetSemanticRepairConfig = readAssetSemanticRepairConfig()
  ) {}

  async run(input: GenerationPipelineInput): Promise<ProjectStatus> {
    const generated = await this.generateRawDsl(input);

    if (!generated.ok) {
      return generated.status;
    }

    const rawDsl = generated.artifact.sourceDsl;
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
      return compiled.status;
    }
    const built = await this.buildProject(input, compiled);

    if (built !== 'PREVIEW_READY') {
      return built;
    }

    const qaGenre = toQaGenre(rawDsl.game.genre);
    if (qaGenre === undefined) {
      await this.setStatus(input.projectId, input.runId, 'RUNTIME_UNSUPPORTED', 'qa', 'FAILED');
      await this.appendEvent(input.runId, 'runtime.unsupported', `QA is not available for genre ${rawDsl.game.genre}.`);
      return 'RUNTIME_UNSUPPORTED';
    }

    return await this.runQa(input, qaGenre, compiled);
  }

  private async generateRawDsl(input: GenerationPipelineInput): Promise<RawDslGenerationResult> {
    await this.setStatus(input.projectId, input.runId, 'DSL_GENERATING', 'dsl-generation', 'RUNNING');
    const language = normalizeLanguage(input.language);
    const intentPlan = buildIntentPlan({ idea: input.idea, language });
    await this.writeIntentPlan(input, intentPlan);
    await this.appendEvent(input.runId, 'intent.planned', `Intent normalized to ${intentPlan.normalizedGenre}.`);

    if (intentPlan.runtimeDslSupport === 'unsupported') {
      await this.setStatus(input.projectId, input.runId, 'RUNTIME_UNSUPPORTED', 'dsl-generation', 'FAILED');
      await this.appendEvent(
        input.runId,
        'runtime.unsupported',
        `Runtime unsupported capabilities: ${intentPlan.unsupportedCapabilities.join(', ')}`
      );
      return { ok: false, status: 'RUNTIME_UNSUPPORTED' };
    }

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
        await this.writeModelGeneratedRawDsl(input, raw.value);
        const artifact = await this.writeValidatedGameDslArtifact(input, raw.value, intentPlan);
        if (!artifact.ok) {
          return { ok: false, status: 'DSL_VALIDATION_FAILED' };
        }
        await this.setStatus(input.projectId, input.runId, 'DSL_GENERATED', 'dsl-generation', 'DONE');
        return { ok: true, artifact: artifact.value };
      }

      return await this.handleModelGenerationFailure(input, raw);
    }

    return await this.handleModelGenerationFailure(input, brief);
  }

  private async compileProject(input: GenerationPipelineInput, ir: NormalizedGameIr): Promise<RuntimeCompileSuccess | { ok: false; status: ProjectStatus }> {
    await this.setStatus(input.projectId, input.runId, 'RUNTIME_CHECKING', 'project-generation', 'RUNNING');
    const runtimeGate = checkPhaserRuntimeCapabilities(ir);
    if (!runtimeGate.ok) {
      await this.setStatus(input.projectId, input.runId, 'RUNTIME_UNSUPPORTED', 'project-generation', 'FAILED');
      await this.appendEvent(
        input.runId,
        'runtime.unsupported',
        `Runtime unsupported capabilities: ${runtimeGate.unsupportedCapabilities.map((item) => item.capability).join(', ')}`
      );
      return { ok: false, status: 'RUNTIME_UNSUPPORTED' };
    }

    await this.setStatus(input.projectId, input.runId, 'COMPILING', 'project-generation', 'RUNNING');
    let compiled: RuntimeCompileResult;

    try {
      compiled = await this.compiler.compile({ projectId: input.projectId, runId: input.runId, ir });
    } catch (error) {
      await this.setStatus(input.projectId, input.runId, 'BUILD_FAILED', 'project-generation', 'FAILED');
      await this.appendEvent(input.runId, 'build.failed', errorMessage(error, 'Project generation failed before build.'));
      return { ok: false, status: 'BUILD_FAILED' };
    }

    if (!compiled.ok) {
      await this.setStatus(input.projectId, input.runId, 'RUNTIME_UNSUPPORTED', 'project-generation', 'FAILED');
      await this.appendEvent(
        input.runId,
        'runtime.unsupported',
        `Runtime unsupported capabilities: ${compiled.unsupportedCapabilities.map((item) => item.capability).join(', ')}`
      );
      return { ok: false, status: 'RUNTIME_UNSUPPORTED' };
    }

    await this.setStatus(input.projectId, input.runId, 'COMPILED', 'project-generation', 'DONE');
    await this.appendEvent(input.runId, 'project.generated', `Phaser/Vite project generated at ${compiled.outputDir}.`);
    return compiled;
  }

  private async buildProject(input: GenerationPipelineInput, compiled: RuntimeCompileSuccess): Promise<ProjectStatus> {
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

  private async runQa(input: GenerationPipelineInput, genre: QaGenre, compiled: RuntimeCompileSuccess): Promise<ProjectStatus> {
    const firstReport = await this.runQaAttempt(input, genre, 'initial');
    const repairResult = await this.maybeRunAssetSemanticRepair(input, genre, compiled, firstReport);
    const finalReport = withAssetSemanticRepairReport(repairResult.report, repairResult.assetSemanticRepair);

    await this.writeQaReport(input.projectId, input.runId, finalReport);

    if (repairResult.kind === 'status') {
      await this.setPipelineStep(input.projectId, input.runId, 'qa', 'DONE');
      return repairResult.status;
    }

    return await this.completeQa(input, finalReport);
  }

  private async runQaAttempt(input: GenerationPipelineInput, genre: QaGenre, phase: 'initial' | 'repair-rerun'): Promise<QaReport> {
    await this.setStatus(input.projectId, input.runId, 'QA_RUNNING', 'qa', 'RUNNING');
    await this.appendEvent(
      input.runId,
      phase === 'initial' ? 'qa.started' : 'qa.rerun.started',
      phase === 'initial' ? 'Playwright QA started.' : 'Playwright QA rerun started after semantic asset repair.'
    );
    const previewUrl = this.getPreviewUrl(input.projectId);

    try {
      return await this.qaRunner.run({ projectId: input.projectId, runId: input.runId, genre, previewUrl });
    } catch (error) {
      return await this.writeQaFailureReport(input, genre, previewUrl, errorMessage(error, 'Playwright QA runner failed.'));
    }
  }

  private async maybeRunAssetSemanticRepair(
    input: GenerationPipelineInput,
    genre: QaGenre,
    compiled: RuntimeCompileSuccess,
    firstReport: QaReport
  ): Promise<QaPipelineResult> {
    const maxAttempts = normalizeAssetRepairMaxAttempts(this.assetSemanticRepairConfig.maxAttempts);
    const baseReport = buildAssetSemanticRepairReport({
      enabled: this.assetSemanticRepairConfig.enabled,
      maxAttempts,
      beforeReport: firstReport
    });

    if (!this.assetSemanticRepairConfig.enabled) {
      return skipAssetSemanticRepair(firstReport, baseReport, 'asset_semantic_repair_disabled');
    }

    const precheckSkippedReason = resolveAssetSemanticRepairPrecheckSkippedReason(firstReport);
    if (precheckSkippedReason !== undefined) {
      return skipAssetSemanticRepair(firstReport, baseReport, precheckSkippedReason);
    }

    if (maxAttempts < 1) {
      await this.appendEvent(input.runId, 'asset-repair.skipped', 'Semantic asset repair is enabled but maxAttempts is 0.');
      return skipAssetSemanticRepair(firstReport, baseReport, 'max_attempts_exhausted');
    }

    let artifacts: { manifest: AssetManifest; resolutionReport: AssetResolutionReport };
    try {
      artifacts = await this.readAssetRepairArtifacts(input.projectId);
    } catch (error) {
      await this.appendEvent(
        input.runId,
        'asset-repair.skipped',
        `Semantic asset repair skipped because asset artifacts could not be read: ${errorMessage(error, 'unknown error')}`
      );
      return skipAssetSemanticRepair(firstReport, baseReport, 'asset_repair_artifacts_unreadable', [
        errorMessage(error, 'Asset repair artifacts could not be read.')
      ]);
    }

    const repairPlan = buildAssetRepairPlan({
      qaReport: firstReport,
      manifest: artifacts.manifest,
      resolutionReport: artifacts.resolutionReport,
      maxAttempts
    });
    const executableItems = executableHardSemanticRepairItems(repairPlan);
    const plannedReport = {
      ...baseReport,
      repairPlanTriggered: repairPlan.triggered,
      executableItemCount: executableItems.length
    };

    if (!repairPlan.triggered || executableItems.length === 0) {
      await this.appendEvent(input.runId, 'asset-repair.skipped', 'Semantic asset repair skipped because no executable hard semantic repair item was found.');
      return skipAssetSemanticRepair(firstReport, plannedReport, 'no_executable_repair_items');
    }

    await this.setPipelineStep(input.projectId, input.runId, 'asset-repair', 'RUNNING');
    await this.appendEvent(input.runId, 'asset-repair.started', `Semantic asset repair started for ${repairPlan.items.length} planned item(s).`);
    let repair: AssetRepairExecutionResult;

    try {
      repair = await executeAssetRepairPlan({
        projectDir: this.workspace.getGeneratedProjectDir(input.projectId),
        repairPlan,
        assetPacksDir: this.assetSemanticRepairConfig.assetPacksDir
      });

      if (repair.status !== 'repaired') {
        await this.setPipelineStep(input.projectId, input.runId, 'asset-repair', 'DONE');
        await this.appendEvent(input.runId, 'asset-repair.skipped', `Semantic asset repair ended with status ${repair.status}; QA will not be rerun.`);
        return skipAssetSemanticRepair(firstReport, {
          ...plannedReport,
          attempted: true,
          attemptCount: repair.attempts
        }, 'repair_execution_not_repaired', [`Semantic asset repair ended with status ${repair.status}.`]);
      }

      await this.setPipelineStep(input.projectId, input.runId, 'asset-repair', 'DONE');
      await this.appendEvent(input.runId, 'asset-repair.applied', `Semantic asset repair rewrote ${repair.repairedRequirementIds.length} asset(s).`);
    } catch (error) {
      await this.setPipelineStep(input.projectId, input.runId, 'asset-repair', 'FAILED');
      await this.appendEvent(input.runId, 'asset-repair.failed', errorMessage(error, 'Semantic asset repair failed.'));
      return skipAssetSemanticRepair(firstReport, {
        ...plannedReport,
        attempted: true,
        attemptCount: 1
      }, 'repair_execution_failed', [errorMessage(error, 'Semantic asset repair failed.')]);
    }

    const rebuilt = await this.buildProject(input, compiled);
    if (rebuilt !== 'PREVIEW_READY') {
      return {
        kind: 'status',
        status: rebuilt,
        report: firstReport,
        assetSemanticRepair: {
          ...plannedReport,
          attempted: true,
          attemptCount: repair.attempts,
          skippedReason: 'repair_rebuild_failed',
          repairedRequirements: buildRepairedRequirements(repair, repairPlan),
          failureReasons: [`Repair build/preview ended with status ${rebuilt}.`]
        }
      };
    }

    const finalReport = await this.runQaAttempt(input, genre, 'repair-rerun');
    return {
      kind: 'report',
      report: finalReport,
      assetSemanticRepair: {
        ...plannedReport,
        attempted: true,
        attemptCount: repair.attempts,
        afterOverallStatus: finalReport.overall_status,
        afterAssetSemanticStatus: finalReport.asset_semantic_status,
        repairedRequirements: buildRepairedRequirements(repair, repairPlan)
      }
    };
  }

  private async completeQa(input: GenerationPipelineInput, report: QaReport): Promise<ProjectStatus> {
    if (report.status === 'PASSED') {
      await this.setStatus(input.projectId, input.runId, 'PLAYABLE', 'qa', 'DONE');
      await this.appendEvent(input.runId, 'qa.passed', 'Playwright QA passed.');
      return 'PLAYABLE';
    }

    await this.setStatus(input.projectId, input.runId, 'QA_FAILED', 'qa', 'FAILED');
    await this.appendEvent(input.runId, 'qa.failed', report.code ?? 'Playwright QA failed.');
    return 'QA_FAILED';
  }

  private async readAssetRepairArtifacts(projectId: string): Promise<{ manifest: AssetManifest; resolutionReport: AssetResolutionReport }> {
    const projectDir = this.workspace.getGeneratedProjectDir(projectId);
    const manifest = AssetManifestSchema.parse(JSON.parse(await readFile(join(projectDir, 'public', 'asset_manifest.json'), 'utf8')));
    const resolutionReport = AssetResolutionReportSchema.parse(JSON.parse(await readFile(join(projectDir, 'asset_resolution_report.json'), 'utf8')));
    return { manifest, resolutionReport };
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

  private async setPipelineStep(projectId: string, runId: string, step: string, stepStatus: 'RUNNING' | 'DONE' | 'FAILED'): Promise<void> {
    const steppedRun = await this.runStore.updateStep(runId, step, stepStatus);
    await this.projectStore.writeLatestRun(projectId, steppedRun);
  }

  private async handleModelGenerationFailure(
    input: GenerationPipelineInput,
    failure: GameDslProviderResult<unknown>
  ): Promise<RawDslGenerationResult> {
    if (shouldUseLocalFallback(failure)) {
      return await this.writeDeterministicFallback(input, failure);
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

  private async writeDeterministicFallback(input: GenerationPipelineInput, failure: GameDslProviderResult<unknown>): Promise<RawDslGenerationResult> {
    const fallback = createDeterministicRawGameDsl(input.idea, input.language);
    const outputPath = this.workspace.getModelOutputPath(input.projectId, input.runId, 'raw-game-dsl.raw.json');
    const reason = failure.ok ? 'unknown' : `${failure.code}: ${failure.message}`;

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(fallback, null, 2)}\n`, 'utf8');
    const intentPlan = buildIntentPlan({ idea: input.idea, language: normalizeLanguage(input.language) });
    const artifact = await this.writeValidatedGameDslArtifact(input, fallback, intentPlan);
    if (!artifact.ok) {
      return { ok: false, status: 'DSL_VALIDATION_FAILED' };
    }
    await this.setStatus(input.projectId, input.runId, 'DSL_GENERATED', 'dsl-generation', 'DONE');
    await this.appendEvent(input.runId, 'model.fallback', `Using deterministic local DSL fallback because model generation failed: ${reason}`);
    return { ok: true, artifact: artifact.value };
  }

  private async writeValidatedGameDslArtifact(
    input: GenerationPipelineInput,
    rawDsl: RawGameDsl,
    intentPlan: IntentPlan
  ): Promise<{ ok: true; value: GameDslArtifact } | { ok: false }> {
    await this.setStatus(input.projectId, input.runId, 'DSL_VALIDATING', 'dsl-validation', 'RUNNING');
    const candidate = buildGameDslArtifact({ rawDsl, runId: input.runId, intentPlan });
    const validation = validateGameDslArtifact(candidate);

    if (!validation.ok) {
      const report = withDslValidationSourceArtifact(validation.report, 'game_dsl.candidate.json');
      await this.writeDslValidationReport(input, report);
      await this.writeGameDslCandidate(input, validation.candidate);
      await this.setStatus(input.projectId, input.runId, 'DSL_VALIDATION_FAILED', 'dsl-validation', 'FAILED');
      await this.appendEvent(input.runId, 'dsl.validation.failed', report.errors.map((issue) => `${issue.path}: ${issue.message}`).join('; '));
      return { ok: false };
    }

    await this.writeDslValidationReport(input, validation.report);
    await this.writeGameDslArtifact(input, validation.artifact);
    await this.writeRuntimeCapabilityReport(input, buildRuntimeCapabilityReport({ runId: input.runId, validatedDsl: validation.artifact }));
    await this.appendEvent(input.runId, 'dsl.validation.passed', 'Versioned Game DSL artifact validated.');
    return { ok: true, value: validation.artifact };
  }

  private async writeModelGeneratedRawDsl(input: GenerationPipelineInput, rawDsl: RawGameDsl): Promise<void> {
    const resultPath = this.workspace.getResultRawDslPath(input.projectId, input.runId);

    await mkdir(dirname(resultPath), { recursive: true });
    await writeFile(resultPath, `${JSON.stringify(rawDsl, null, 2)}\n`, 'utf8');
  }

  private async writeGameDslArtifact(input: GenerationPipelineInput, artifact: GameDslArtifact): Promise<void> {
    const outputPath = this.workspace.getModelOutputPath(input.projectId, input.runId, 'game_dsl.json');

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  }

  private async writeGameDslCandidate(input: GenerationPipelineInput, candidate: unknown): Promise<void> {
    const outputPath = this.workspace.getModelOutputPath(input.projectId, input.runId, 'game_dsl.candidate.json');

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(candidate, null, 2)}\n`, 'utf8');
  }

  private async writeDslValidationReport(input: GenerationPipelineInput, report: DslValidationReport): Promise<void> {
    const outputPath = this.workspace.getModelOutputPath(input.projectId, input.runId, 'dsl_validation_report.json');

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  private async writeRuntimeCapabilityReport(input: GenerationPipelineInput, report: RuntimeCapabilityReport): Promise<void> {
    const outputPath = this.workspace.getModelOutputPath(input.projectId, input.runId, 'runtime_capability_report.json');

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  private async writeIntentPlan(input: GenerationPipelineInput, intentPlan: IntentPlan): Promise<void> {
    const outputPath = this.workspace.getModelOutputPath(input.projectId, input.runId, 'intent_plan.json');

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(intentPlan, null, 2)}\n`, 'utf8');
  }

  private async writeQaFailureReport(input: GenerationPipelineInput, genre: QaGenre, previewUrl: string, message: string): Promise<QaReport> {
    const now = new Date().toISOString();
    const report: QaReport = {
      status: 'QA_FAILED',
      runtime_status: 'FAILED',
      asset_semantic_status: 'PASSED',
      overall_status: 'QA_FAILED',
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

    await this.writeQaReport(input.projectId, input.runId, report);
    return report;
  }

  private async writeQaReport(projectId: string, runId: string, report: QaReport): Promise<void> {
    const reportPath = this.workspace.getQaReportPath(projectId, runId);
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  private getPreviewUrl(projectId: string): string {
    const baseUrl = process.env.PREVIEW_BASE_URL ?? 'http://localhost:3000';
    return `${baseUrl.replace(/\/$/, '')}/preview/${projectId}/index.html`;
  }
}

function normalizeLanguage(language: string): DslLanguage {
  return language === 'zh' ? 'zh' : 'en';
}

function toQaGenre(genre: RawGameDsl['game']['genre']): QaGenre | undefined {
  return genre === 'collector' || genre === 'dodger' || genre === 'shooter' ? genre : undefined;
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

export function readAssetSemanticRepairConfig(env: NodeJS.ProcessEnv = process.env): AssetSemanticRepairConfig {
  return {
    enabled: env.ASSET_SEMANTIC_REPAIR_ENABLED === 'true',
    maxAttempts: normalizeAssetRepairMaxAttempts(
      env.ASSET_SEMANTIC_REPAIR_MAX_ATTEMPTS ?? DEFAULT_ASSET_SEMANTIC_REPAIR_CONFIG.maxAttempts
    ),
    assetPacksDir: env.AGM_ASSET_PACKS_DIR
  };
}

function resolveAssetSemanticRepairPrecheckSkippedReason(report: QaReport): QaAssetSemanticRepairSkippedReason | undefined {
  if (report.status !== 'PASSED' || report.runtime_status !== 'PASSED') {
    return 'runtime_failed_not_asset_semantic_repair';
  }

  if (report.overall_status === 'QA_FAILED') {
    return 'runtime_failed_not_asset_semantic_repair';
  }

  if (hasRuntimeAssetFailure(report)) {
    return 'runtime_asset_failure_not_asset_semantic_repair';
  }

  switch (report.overall_status) {
    case 'NEEDS_ASSET_REPAIR':
      return undefined;
    case 'PLAYABLE':
    case 'PLAYABLE_WITH_FALLBACK_ASSETS':
    case 'PLAYABLE_WITH_ART_WARNINGS':
      return 'no_asset_semantic_repair_needed';
  }
}

function hasRuntimeAssetFailure(report: QaReport): boolean {
  if ((report.asset_report?.failures.length ?? 0) > 0) {
    return true;
  }

  const runtime = report.asset_report?.runtime;
  if (runtime === undefined) {
    return false;
  }

  return runtime.failed.length > 0 || runtime.missing.length > 0 || runtime.missing_required_roles.length > 0;
}

function executableHardSemanticRepairItems(plan: AssetRepairPlan): ExecutableRepairPlanItem[] {
  return plan.items.filter(
    (item): item is ExecutableRepairPlanItem =>
      item.strictness === 'hard' &&
      (item.action === 'blacklist_candidate_then_reresolve' || item.action === 'force_template_svg_fallback')
  );
}

function buildAssetSemanticRepairReport(input: {
  enabled: boolean;
  maxAttempts: number;
  beforeReport: QaReport;
}): QaAssetSemanticRepairReport {
  return {
    enabled: input.enabled,
    attempted: false,
    attemptCount: 0,
    maxAttempts: input.maxAttempts,
    beforeOverallStatus: input.beforeReport.overall_status,
    beforeAssetSemanticStatus: input.beforeReport.asset_semantic_status
  };
}

function skipAssetSemanticRepair(
  report: QaReport,
  assetSemanticRepair: QaAssetSemanticRepairReport,
  skippedReason: QaAssetSemanticRepairSkippedReason,
  failureReasons: string[] = []
): QaPipelineResult {
  return {
    kind: 'report',
    report,
    assetSemanticRepair: {
      ...assetSemanticRepair,
      skippedReason,
      failureReasons: failureReasons.length > 0 ? failureReasons : assetSemanticRepair.failureReasons
    }
  };
}

function withAssetSemanticRepairReport(report: QaReport, assetSemanticRepair: QaAssetSemanticRepairReport): QaReport {
  return {
    ...report,
    asset_semantic_repair: assetSemanticRepair
  };
}

function buildRepairedRequirements(
  repair: AssetRepairExecutionResult,
  plan: AssetRepairPlan
): NonNullable<QaAssetSemanticRepairReport['repairedRequirements']> | undefined {
  const reportItems = repair.report?.repair?.items ?? [];
  if (reportItems.length === 0) {
    return repair.repairedRequirementIds.map((requirementId) => ({ requirementId, role: plan.items.find((item) => item.requirementId === requirementId)?.role ?? 'unknown' }));
  }

  const planById = new Map(plan.items.map((item) => [item.requirementId, item]));
  return reportItems.map((item) => {
    const planned = planById.get(item.requirementId);
    return {
      requirementId: item.requirementId,
      role: item.role,
      expectedConcept: planned?.expectedConcept,
      previousAssetId: item.requirementId,
      previousSource: item.before?.source,
      previousSemanticFitStatus: item.before?.semanticFitStatus,
      action: item.action,
      newAssetId: item.requirementId,
      newSource: item.after?.source,
      newSemanticFitStatus: item.after?.semanticFitStatus
    };
  });
}

function normalizeAssetRepairMaxAttempts(value: string | number | undefined): number {
  if (value === undefined) {
    return DEFAULT_ASSET_SEMANTIC_REPAIR_CONFIG.maxAttempts;
  }

  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_ASSET_SEMANTIC_REPAIR_CONFIG.maxAttempts;
  }

  return Math.min(Math.trunc(parsed), 1);
}
