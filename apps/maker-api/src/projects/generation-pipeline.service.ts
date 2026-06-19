import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  AssetManifestSchema,
  AssetIntentManifestSchema,
  AssetResolutionReportSchema,
  buildAssetRepairPlan,
  summarizeAssetIntentResolutionFallbacks,
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
  buildDslConsumptionReport,
  buildUnsupportedRuntimeCapabilityReport,
  buildDslValidationReport,
  DslConsumptionReportSchema,
  SceneIrSchema,
  buildGenerationCapabilityCutoverReport,
  buildGenerationCapabilityGapReport,
  buildGenerationCapabilityRuntimeShadow,
  buildGenerationCapabilityResolutionShadow,
  buildGenerationCapabilityPreflight,
  buildGenerationPathReceipt,
  buildGameDslArtifact,
  checkPhaserRuntimeCapabilities,
  findRuntimeGenreCapability,
  LEGACY_DSL_NONREPRESENTABLE,
  validateAndNormalizeRawGameDsl,
  validateGameDslArtifact,
  withDslValidationSourceArtifact,
  type DslValidationReport,
  type GenerationCapabilityRuntimeShadowArtifacts,
  type GenerationCapabilityResolutionShadowArtifacts,
  type GenerationCapabilityPreflightArtifacts,
  type GenerationCapabilityGapReport,
  type GameDslArtifact,
  type RuntimeCapabilityReport
} from '../../../../packages/game-dsl/src/index.js';
import type { RuntimeCompileResult, RuntimeCompileSuccess } from '../compiler/compiler.types.js';
import { AssetLibraryUsageReportSchema } from '../compiler/asset-library-usage-report.js';
import { AssetBindingTraceReportSchema } from '../compiler/asset-binding-trace-report.js';
import { RuntimeSceneBindingReportSchema, buildRuntimeObservedSceneBindingReport, writeRuntimeSceneBindingReport } from '../compiler/runtime-scene-binding-report.js';
import { TemplateCompilerService } from '../compiler/template-compiler.service.js';
import { ViteBuildRunnerService } from '../compiler/vite-build-runner.service.js';
import { GameDslProviderService, type GameDslProviderResult } from '../model-provider/game-dsl-provider.service.js';
import { buildIntentPlan, type IntentPlan } from '../model-provider/intent-plan.js';
import { PlaywrightQaRunnerService } from '../qa/playwright-qa-runner.service.js';
import {
  RenderFidelityReportSchema,
  buildRenderFidelityReport,
  summarizeRenderFidelityForQaReport,
  writeRenderFidelityReport
} from '../qa/render-fidelity-report.js';
import type { QaAssetSemanticRepairReport, QaAssetSemanticRepairSkippedReason, QaGenre, QaReport } from '../qa/qa.types.js';
import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import { createDeterministicRawGameDsl } from './deterministic-game-dsl.js';
import { GenerationInputReportSchema, buildGenerationInputReport, type GenerationInputReport } from './generation-input-report.js';
import { buildPipelineAcceptanceReport, writePipelineAcceptanceReport } from './pipeline-acceptance-report.js';
import {
  buildCompileFailedPipelineArtifactIndex,
  buildDslPreconditionBlockedPipelineArtifactIndex,
  buildInvalidDslPipelineArtifactIndex,
  buildModelGenerationFailedPipelineArtifactIndex,
  buildUnsupportedIntentPipelineArtifactIndex,
  buildValidPipelineArtifactIndex,
  writePipelineArtifactIndex,
  type PipelineArtifactIndex
} from './pipeline-artifact-index.js';
import { ProjectStoreService } from './project-store.service.js';
import type { JobEventRecord, ProjectStatus } from './project-state.types.js';
import { RunStoreService } from './run-store.service.js';

type GenerationPipelineInput = {
  projectId: string;
  runId: string;
  idea: string;
  language: string;
  generationInputReport?: GenerationInputReport;
};
type DslLanguage = 'zh' | 'en';

type DslProvider = Pick<GameDslProviderService, 'generateGameBrief' | 'generateRawGameDsl'>;
type RuntimeCompiler = Pick<TemplateCompilerService, 'compile'>;
type RuntimeBuilder = Pick<ViteBuildRunnerService, 'build'>;
type RuntimeQaRunner = Pick<PlaywrightQaRunnerService, 'run'>;
type DslSource = 'model_provider' | 'deterministic_local_fallback';
type RawDslGenerationResult = { ok: true; artifact: GameDslArtifact; dslSource: DslSource; brief?: unknown } | { ok: false; status: ProjectStatus };
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
    await this.writeGenerationInputReport(input);
    const generated = await this.generateRawDsl(input);

    if (!generated.ok) {
      return generated.status;
    }

    const rawDsl = generated.artifact.sourceDsl;
    await this.appendEvent(input.runId, 'dsl.generated', 'Raw Game DSL generated.');

    await this.setStatus(input.projectId, input.runId, 'DSL_VALIDATING', 'dsl-validation', 'RUNNING');
    const normalized = validateAndNormalizeRawGameDsl(rawDsl);

    if (!normalized.ok) {
      await this.writeRawDslNormalizationFailureArtifacts(input, generated.artifact, normalized.issues, generated.dslSource);
      await this.setStatus(input.projectId, input.runId, 'DSL_VALIDATION_FAILED', 'dsl-validation', 'FAILED');
      await this.appendEvent(input.runId, 'dsl.validation.failed', normalized.issues.map((issue) => issue.message).join('; '));
      return 'DSL_VALIDATION_FAILED';
    }

    await this.setStatus(input.projectId, input.runId, 'IR_NORMALIZED', 'dsl-validation', 'DONE', {
      title: rawDsl.metadata.title,
      genre: rawDsl.game.genre
    });
    await this.writeDslConsumptionReport(input, rawDsl, normalized.ir);
    await this.appendEvent(input.runId, 'ir.generated', 'Normalized IR generated from validated DSL.');

    const compiled = await this.compileProject(input, rawDsl, normalized.ir, generated.dslSource, generated.brief);
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
    await this.writeGenerationCapabilityPreflightArtifacts(
      input,
      buildGenerationCapabilityPreflight({
        projectId: input.projectId,
        runId: input.runId,
        normalizedGenre: intentPlan.normalizedGenre
      })
    );
    await this.appendEvent(input.runId, 'intent.planned', `Intent normalized to ${intentPlan.normalizedGenre}.`);

    if (intentPlan.runtimeDslSupport === 'unsupported') {
      await this.writeUnsupportedIntentArtifacts(input, intentPlan);
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
        const artifact = await this.writeValidatedGameDslArtifact(input, raw.value, intentPlan, 'model_provider');
        if (!artifact.ok) {
          return { ok: false, status: 'DSL_VALIDATION_FAILED' };
        }
        await this.setStatus(input.projectId, input.runId, 'DSL_GENERATED', 'dsl-generation', 'DONE');
        return { ok: true, artifact: artifact.value, dslSource: 'model_provider', brief: brief.value };
      }

      return await this.handleModelGenerationFailure(input, raw);
    }

    return await this.handleModelGenerationFailure(input, brief);
  }

  private async compileProject(
    input: GenerationPipelineInput,
    rawDsl: RawGameDsl,
    ir: NormalizedGameIr,
    dslSource: DslSource,
    brief?: unknown
  ): Promise<RuntimeCompileSuccess | { ok: false; status: ProjectStatus }> {
    await this.setStatus(input.projectId, input.runId, 'RUNTIME_CHECKING', 'project-generation', 'RUNNING');
    const runtimeGate = checkPhaserRuntimeCapabilities(ir);
    if (!runtimeGate.ok) {
      await this.writeGenerationPathReceipt(input, {
        selectedPath: 'fail_closed_runtime_unsupported',
        dslSource,
        selectionReason: `Runtime capability gate blocked generation: ${runtimeGate.unsupportedCapabilities.map((item) => item.capability).join(', ')}.`,
        profileId: ir.template_params.template_id,
        capabilityReadiness: 'blocked',
        artifactRefs: [
          { artifactKind: 'game_dsl', path: 'game_dsl.json' },
          { artifactKind: 'dsl_consumption_report', path: 'dsl_consumption_report.json' },
          { artifactKind: 'runtime_capability_report', path: 'runtime_capability_report.json' }
        ]
      });
      await this.writeCompileFailedPipelineArtifactIndex(input, 'runtime_unsupported_before_compile');
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
      compiled = await this.compiler.compile({
        projectId: input.projectId,
        runId: input.runId,
        rawDsl,
        ir,
        semanticTraceContext: { originalPrompt: input.idea, brief }
      });
    } catch (error) {
      await this.writeGenerationPathReceipt(input, {
        selectedPath: 'fail_closed_compile_failed',
        dslSource,
        selectionReason: errorMessage(error, 'Project generation failed before build.'),
        profileId: ir.template_params.template_id,
        capabilityReadiness: 'not_evaluated',
        artifactRefs: [
          { artifactKind: 'game_dsl', path: 'game_dsl.json' },
          { artifactKind: 'dsl_consumption_report', path: 'dsl_consumption_report.json' },
          { artifactKind: 'runtime_capability_report', path: 'runtime_capability_report.json' }
        ]
      });
      await this.writeCompileFailedPipelineArtifactIndex(input, 'compiler_failed_before_compile_artifacts');
      await this.setStatus(input.projectId, input.runId, 'BUILD_FAILED', 'project-generation', 'FAILED');
      await this.appendEvent(input.runId, 'build.failed', errorMessage(error, 'Project generation failed before build.'));
      return { ok: false, status: 'BUILD_FAILED' };
    }

    if (!compiled.ok) {
      await this.writeGenerationPathReceipt(input, {
        selectedPath: 'fail_closed_runtime_unsupported',
        dslSource,
        selectionReason: `Compiler rejected runtime capabilities: ${compiled.unsupportedCapabilities.map((item) => item.capability).join(', ')}.`,
        profileId: ir.template_params.template_id,
        capabilityReadiness: 'blocked',
        artifactRefs: [
          { artifactKind: 'game_dsl', path: 'game_dsl.json' },
          { artifactKind: 'dsl_consumption_report', path: 'dsl_consumption_report.json' },
          { artifactKind: 'runtime_capability_report', path: 'runtime_capability_report.json' }
        ]
      });
      await this.writeCompileFailedPipelineArtifactIndex(input, 'runtime_unsupported_before_compile');
      await this.setStatus(input.projectId, input.runId, 'RUNTIME_UNSUPPORTED', 'project-generation', 'FAILED');
      await this.appendEvent(
        input.runId,
        'runtime.unsupported',
        `Runtime unsupported capabilities: ${compiled.unsupportedCapabilities.map((item) => item.capability).join(', ')}`
      );
      return { ok: false, status: 'RUNTIME_UNSUPPORTED' };
    }

    await this.setStatus(input.projectId, input.runId, 'COMPILED', 'project-generation', 'DONE');
    await this.writeGenerationPathReceipt(input, {
      selectedPath: 'legacy_template_v1',
      dslSource,
      selectionReason: 'Legacy template path is the actual compiled path until capability_composed_v1 cutover gates pass.',
      profileId: ir.template_params.template_id,
      capabilityReadiness: 'not_evaluated',
      artifactRefs: [
        ...(dslSource === 'deterministic_local_fallback' ? [{ artifactKind: 'raw_game_dsl_fallback', path: 'raw-game-dsl.raw.json' }] : []),
        { artifactKind: 'game_dsl', path: 'game_dsl.json' },
        { artifactKind: 'dsl_consumption_report', path: 'dsl_consumption_report.json' },
        { artifactKind: 'runtime_capability_report', path: 'runtime_capability_report.json' }
      ]
    });
    await this.writeValidPipelineArtifactIndex(input, compiled);
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

    await this.writeValidPipelineArtifactIndex(input, compiled, { buildLogPresent: true });

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

    await this.writeObservedRuntimeSceneBindingReport(input, finalReport);
    const renderFidelityReport = await this.writeRenderFidelityReport(input, finalReport);
    const finalReportWithRenderFidelity: QaReport = {
      ...finalReport,
      render_fidelity: summarizeRenderFidelityForQaReport(renderFidelityReport)
    };
    await this.writeQaReport(input.projectId, input.runId, finalReportWithRenderFidelity);
    await this.writeValidPipelineArtifactIndex(input, compiled, { buildLogPresent: true, qaReportPresent: true, renderFidelityReportPresent: true });

    if (repairResult.kind === 'status') {
      await this.setPipelineStep(input.projectId, input.runId, 'qa', 'DONE');
      return repairResult.status;
    }

    return await this.completeQa(input, finalReportWithRenderFidelity);
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

    if (!failure.ok && failure.code === LEGACY_DSL_NONREPRESENTABLE) {
      await this.failLegacyDslPrecondition(input, failure.message, failure.issues);
      return { ok: false, status: 'FAILED' };
    }

    const reason = failure.ok ? 'unknown' : `${failure.code}: ${failure.message}`;
    await this.failModelGeneration(input, `Model generation failed: ${reason}`, failure.ok ? 'UNKNOWN_MODEL_FAILURE' : failure.code);
    return { ok: false, status: 'FAILED' };
  }

  private async failThrownModelGeneration(input: GenerationPipelineInput, error: unknown): Promise<RawDslGenerationResult> {
    await this.failModelGeneration(input, `Model generation threw: ${errorMessage(error, 'unknown error')}`, 'PROVIDER_THROWN');
    return { ok: false, status: 'FAILED' };
  }

  private async failModelGeneration(input: GenerationPipelineInput, message: string, modelFailureCode: string): Promise<void> {
    await this.writeGenerationPathReceipt(input, {
      selectedPath: 'fail_closed_model_generation_failed',
      dslSource: 'not_generated',
      selectionReason: message,
      modelFailureCode,
      capabilityReadiness: 'not_evaluated',
      artifactRefs: [
        { artifactKind: 'generation_input_report', path: 'generation_input_report.json' },
        { artifactKind: 'intent_plan', path: 'intent_plan.json' }
      ]
    });
    await this.writeModelGenerationFailedPipelineArtifactIndex(input);
    await this.setStatus(input.projectId, input.runId, 'FAILED', 'dsl-generation', 'FAILED');
    await this.appendEvent(input.runId, 'model.failed', message);
  }

  private async failLegacyDslPrecondition(input: GenerationPipelineInput, message: string, issues: string[] = []): Promise<void> {
    const issueSummary = issues.length === 0 ? message : `${message}: ${issues.join('; ')}`;
    await this.writeGenerationPathReceipt(input, {
      selectedPath: 'blocked',
      targetPath: 'capability_composed_v1',
      dslSource: 'not_generated',
      selectionReason: `DSL generation blocked before legacy Raw DSL v0.1: ${LEGACY_DSL_NONREPRESENTABLE}: ${issueSummary}`,
      legacyRepresentable: false,
      blocker: 'CAPABILITY_COMPOSED_PATH_NOT_ACTIVE',
      capabilityReadiness: 'blocked',
      artifactRefs: [
        { artifactKind: 'generation_input_report', path: 'generation_input_report.json' },
        { artifactKind: 'intent_plan', path: 'intent_plan.json' }
      ]
    });
    await this.writeDslPreconditionBlockedPipelineArtifactIndex(input);
    await this.setStatus(input.projectId, input.runId, 'FAILED', 'dsl-generation', 'FAILED');
    await this.appendEvent(input.runId, 'dsl.blocked_precondition', `${LEGACY_DSL_NONREPRESENTABLE}: ${issueSummary}`);
  }

  private async writeDeterministicFallback(input: GenerationPipelineInput, failure: GameDslProviderResult<unknown>): Promise<RawDslGenerationResult> {
    const fallback = createDeterministicRawGameDsl(input.idea, input.language);
    const outputPath = this.workspace.getModelOutputPath(input.projectId, input.runId, 'raw-game-dsl.raw.json');
    const reason = failure.ok ? 'unknown' : `${failure.code}: ${failure.message}`;

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(fallback, null, 2)}\n`, 'utf8');
    const intentPlan = buildIntentPlan({ idea: input.idea, language: normalizeLanguage(input.language) });
    const artifact = await this.writeValidatedGameDslArtifact(input, fallback, intentPlan, 'deterministic_local_fallback');
    if (!artifact.ok) {
      return { ok: false, status: 'DSL_VALIDATION_FAILED' };
    }
    await this.setStatus(input.projectId, input.runId, 'DSL_GENERATED', 'dsl-generation', 'DONE');
    await this.appendEvent(input.runId, 'model.fallback', `Using deterministic local DSL fallback because model generation failed: ${reason}`);
    return { ok: true, artifact: artifact.value, dslSource: 'deterministic_local_fallback' };
  }

  private async writeValidatedGameDslArtifact(
    input: GenerationPipelineInput,
    rawDsl: RawGameDsl,
    intentPlan: IntentPlan,
    dslSource: DslSource
  ): Promise<{ ok: true; value: GameDslArtifact } | { ok: false }> {
    await this.setStatus(input.projectId, input.runId, 'DSL_VALIDATING', 'dsl-validation', 'RUNNING');
    const candidate = buildGameDslArtifact({ rawDsl, runId: input.runId, intentPlan });
    const validation = validateGameDslArtifact(candidate);

    if (!validation.ok) {
      const report = withDslValidationSourceArtifact(validation.report, 'game_dsl.candidate.json');
      await this.writeDslValidationReport(input, report);
      await this.writeGameDslCandidate(input, validation.candidate);
      await this.writeGenerationPathReceipt(input, {
        selectedPath: 'fail_closed_invalid_dsl',
        dslSource,
        selectionReason: 'DSL candidate validation failed before runtime generation.',
        capabilityReadiness: 'not_evaluated',
        artifactRefs: [
          { artifactKind: 'game_dsl_candidate', path: 'game_dsl.candidate.json' },
          { artifactKind: 'dsl_validation_report', path: 'dsl_validation_report.json' }
        ]
      });
      await this.writeInvalidDslPipelineArtifactIndex(input);
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

  private async writeGenerationCapabilityPreflightArtifacts(
    input: GenerationPipelineInput,
    artifacts: GenerationCapabilityPreflightArtifacts
  ): Promise<void> {
    await this.writeModelOutputJson(input, 'capability_registry_snapshot.json', artifacts.registrySnapshot);
    await this.writeModelOutputJson(input, 'generation_capability_readiness_report.json', artifacts.readinessReport);
    const resolutionArtifacts = buildGenerationCapabilityResolutionShadow({
      projectId: input.projectId,
      runId: input.runId,
      normalizedGenre: artifacts.readinessReport.normalizedGenre,
      registrySnapshot: artifacts.registrySnapshot,
      readinessReport: artifacts.readinessReport
    });
    await this.writeGenerationCapabilityResolutionShadowArtifacts(input, resolutionArtifacts);
    const runtimeArtifacts = buildGenerationCapabilityRuntimeShadow({
      projectId: input.projectId,
      runId: input.runId,
      normalizedGenre: resolutionArtifacts.resolutionReport.normalizedGenre,
      resolutionReport: resolutionArtifacts.resolutionReport
    });
    await this.writeGenerationCapabilityRuntimeShadowArtifacts(input, runtimeArtifacts);
    const gapReport = buildGenerationCapabilityGapReport({
      projectId: input.projectId,
      runId: input.runId,
      normalizedGenre: artifacts.readinessReport.normalizedGenre,
      readinessReport: artifacts.readinessReport,
      resolutionReport: resolutionArtifacts.resolutionReport,
      runtimeReport: runtimeArtifacts.runtimeReport
    });
    await this.writeGenerationCapabilityGapReport(input, gapReport);
    await this.writeModelOutputJson(
      input,
      'generation_capability_cutover_report.json',
      buildGenerationCapabilityCutoverReport({
        projectId: input.projectId,
        runId: input.runId,
        normalizedGenre: artifacts.readinessReport.normalizedGenre,
        gapReport,
        runtimeReport: runtimeArtifacts.runtimeReport
      })
    );
  }

  private async writeGenerationCapabilityResolutionShadowArtifacts(
    input: GenerationPipelineInput,
    artifacts: GenerationCapabilityResolutionShadowArtifacts
  ): Promise<void> {
    await this.writeModelOutputJson(input, 'generation_capability_resolution_report.json', artifacts.resolutionReport);
    if (artifacts.shadowGameplayCapabilityLock !== undefined) {
      await this.writeModelOutputJson(input, 'shadow_gameplay_capability_lock.json', artifacts.shadowGameplayCapabilityLock);
    }
  }

  private async writeGenerationCapabilityRuntimeShadowArtifacts(
    input: GenerationPipelineInput,
    artifacts: GenerationCapabilityRuntimeShadowArtifacts
  ): Promise<void> {
    await this.writeModelOutputJson(input, 'generation_capability_runtime_report.json', artifacts.runtimeReport);
    if (artifacts.shadowRuntimeSystemManifest !== undefined) {
      await this.writeModelOutputJson(input, 'shadow_phaser_runtime_system_manifest.json', artifacts.shadowRuntimeSystemManifest);
    }
    if (artifacts.shadowRuntimeLoaderReport !== undefined) {
      await this.writeModelOutputJson(input, 'shadow_phaser_runtime_loader_report.json', artifacts.shadowRuntimeLoaderReport);
    }
    if (artifacts.shadowCapabilityQaPlan !== undefined) {
      await this.writeModelOutputJson(input, 'shadow_capability_qa_plan.json', artifacts.shadowCapabilityQaPlan);
    }
    if (artifacts.shadowCapabilityQaReport !== undefined) {
      await this.writeModelOutputJson(input, 'shadow_capability_qa_report.json', artifacts.shadowCapabilityQaReport);
    }
  }

  private async writeGenerationCapabilityGapReport(input: GenerationPipelineInput, report: GenerationCapabilityGapReport): Promise<void> {
    await this.writeModelOutputJson(input, 'generation_capability_gap_report.json', report);
  }

  private async writeGenerationPathReceipt(
    input: GenerationPipelineInput,
    receiptInput: Omit<Parameters<typeof buildGenerationPathReceipt>[0], 'projectId' | 'runId'>
  ): Promise<void> {
    const outputPath = this.workspace.getModelOutputPath(input.projectId, input.runId, 'generation_path_receipt.json');
    const receipt = buildGenerationPathReceipt({
      projectId: input.projectId,
      runId: input.runId,
      ...receiptInput
    });

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  }

  private async writeModelOutputJson(input: GenerationPipelineInput, filename: string, value: unknown): Promise<void> {
    const outputPath = this.workspace.getModelOutputPath(input.projectId, input.runId, filename);

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  }

  private async writeDslConsumptionReport(input: GenerationPipelineInput, rawDsl: RawGameDsl, ir: NormalizedGameIr): Promise<void> {
    const outputPath = this.workspace.getModelOutputPath(input.projectId, input.runId, 'dsl_consumption_report.json');
    const report = buildDslConsumptionReport({ projectId: input.projectId, runId: input.runId, rawDsl, ir });

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  private async writeUnsupportedIntentArtifacts(input: GenerationPipelineInput, intentPlan: IntentPlan): Promise<void> {
    await this.writeRuntimeCapabilityReport(input, buildUnsupportedRuntimeCapabilityReport({ runId: input.runId, intentPlan }));
    await this.writeGenerationPathReceipt(input, {
      selectedPath: 'fail_closed_unsupported_intent',
      dslSource: 'not_generated',
      selectionReason: `Intent ${intentPlan.normalizedGenre} is not supported by the current runtime.`,
      capabilityReadiness: 'blocked',
      artifactRefs: [
        { artifactKind: 'intent_plan', path: 'intent_plan.json' },
        { artifactKind: 'runtime_capability_report', path: 'runtime_capability_report.json' }
      ]
    });
    await this.writeUnsupportedIntentPipelineArtifactIndex(input);
  }

  private async writeRawDslNormalizationFailureArtifacts(
    input: GenerationPipelineInput,
    artifact: GameDslArtifact,
    issues: Array<{ code: string; path: string; message: string }>,
    dslSource: DslSource
  ): Promise<void> {
    await this.writeRuntimeCapabilityReport(input, buildRuntimeCapabilityReport({ runId: input.runId, validatedDsl: artifact }));
    await this.writeDslValidationReport(
      input,
      buildDslValidationReport({
        runId: input.runId,
        dslId: artifact.dslId,
        sourceArtifact: 'game_dsl.json',
        artifact,
        errors: issues.map((issue) => ({
          code: issue.code,
          path: `sourceDsl.${issue.path}`,
          message: issue.message
        })),
        warnings: [],
        normalizedDefaults: [],
        semanticChecks: [{ name: 'raw_dsl_normalization', status: 'failed', message: 'Raw DSL failed normalization.' }],
        requiredCapabilities: artifact.requiredCapabilities
      })
    );
    await this.writeGenerationPathReceipt(input, {
      selectedPath: 'fail_closed_invalid_dsl',
      dslSource,
      selectionReason: 'Validated Game DSL artifact failed normalization before runtime generation.',
      capabilityReadiness: 'not_evaluated',
      artifactRefs: [
        { artifactKind: 'game_dsl', path: 'game_dsl.json' },
        { artifactKind: 'dsl_validation_report', path: 'dsl_validation_report.json' },
        { artifactKind: 'runtime_capability_report', path: 'runtime_capability_report.json' }
      ]
    });
    await this.writeInvalidDslPipelineArtifactIndex(input);
  }

  private async writeGenerationInputReport(input: GenerationPipelineInput): Promise<void> {
    const report = GenerationInputReportSchema.parse(
      input.generationInputReport ??
        buildGenerationInputReport({
          projectId: input.projectId,
          runId: input.runId,
          effectivePrompt: input.idea
        })
    );

    if (report.projectId !== input.projectId || report.runId !== input.runId || report.effectivePrompt !== input.idea) {
      throw new Error('generation input report does not match current pipeline input.');
    }

    const outputPath = this.workspace.getModelOutputPath(input.projectId, input.runId, 'generation_input_report.json');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  private async writeValidPipelineArtifactIndex(
    input: GenerationPipelineInput,
    compiled: RuntimeCompileSuccess,
    options: { buildLogPresent?: boolean; qaReportPresent?: boolean; renderFidelityReportPresent?: boolean } = {}
  ): Promise<void> {
    const index = buildValidPipelineArtifactIndex({
      projectId: input.projectId,
      runId: input.runId,
      compileFiles: compiled.files,
      buildLogPresent: options.buildLogPresent,
      qaReportPresent: options.qaReportPresent,
      renderFidelityReportPresent: options.renderFidelityReportPresent
    });
    await this.writePipelineAcceptanceReport(input, index);
    await writePipelineArtifactIndex(this.workspace.getModelOutputPath(input.projectId, input.runId, 'pipeline_artifact_index.json'), index);
  }

  private async writeInvalidDslPipelineArtifactIndex(input: GenerationPipelineInput): Promise<void> {
    const dslValidation = (await this.readModelOutputJson(input.projectId, input.runId, 'dsl_validation_report.json')) as { sourceArtifact?: unknown };
    const sourceArtifact = dslValidation.sourceArtifact === 'game_dsl.json' ? 'game_dsl.json' : 'game_dsl.candidate.json';
    const index = buildInvalidDslPipelineArtifactIndex({ projectId: input.projectId, runId: input.runId, sourceArtifact });
    await this.writePipelineAcceptanceReport(input, index);
    await writePipelineArtifactIndex(this.workspace.getModelOutputPath(input.projectId, input.runId, 'pipeline_artifact_index.json'), index);
  }

  private async writeUnsupportedIntentPipelineArtifactIndex(input: GenerationPipelineInput): Promise<void> {
    const intentPlan = (await this.readModelOutputJson(input.projectId, input.runId, 'intent_plan.json')) as { normalizedGenre?: unknown };
    const index = buildUnsupportedIntentPipelineArtifactIndex({
      projectId: input.projectId,
      runId: input.runId,
      normalizedGenre: typeof intentPlan.normalizedGenre === 'string' ? intentPlan.normalizedGenre : 'unrecognized_2d_genre'
    });
    await this.writePipelineAcceptanceReport(input, index, {
      dslValidation: {
        valid: false
      }
    });
    await writePipelineArtifactIndex(this.workspace.getModelOutputPath(input.projectId, input.runId, 'pipeline_artifact_index.json'), index);
  }

  private async writeModelGenerationFailedPipelineArtifactIndex(input: GenerationPipelineInput): Promise<void> {
    const index = buildModelGenerationFailedPipelineArtifactIndex({ projectId: input.projectId, runId: input.runId });
    await this.writePipelineAcceptanceReport(input, index, {
      dslValidation: {
        valid: false
      }
    });
    await writePipelineArtifactIndex(this.workspace.getModelOutputPath(input.projectId, input.runId, 'pipeline_artifact_index.json'), index);
  }

  private async writeDslPreconditionBlockedPipelineArtifactIndex(input: GenerationPipelineInput): Promise<void> {
    const index = buildDslPreconditionBlockedPipelineArtifactIndex({ projectId: input.projectId, runId: input.runId });
    await this.writePipelineAcceptanceReport(input, index, {
      dslValidation: {
        valid: false
      }
    });
    await writePipelineArtifactIndex(this.workspace.getModelOutputPath(input.projectId, input.runId, 'pipeline_artifact_index.json'), index);
  }

  private async writeCompileFailedPipelineArtifactIndex(input: GenerationPipelineInput, reason: string): Promise<void> {
    const index = buildCompileFailedPipelineArtifactIndex({ projectId: input.projectId, runId: input.runId, reason });
    await this.writePipelineAcceptanceReport(input, index);
    await writePipelineArtifactIndex(this.workspace.getModelOutputPath(input.projectId, input.runId, 'pipeline_artifact_index.json'), index);
  }

  private async writePipelineAcceptanceReport(
    input: GenerationPipelineInput,
    artifactIndex: PipelineArtifactIndex,
    options: { dslValidation?: { valid: boolean; sourceArtifact?: string } } = {}
  ): Promise<void> {
    const generationInput = GenerationInputReportSchema.parse(
      await this.readModelOutputJson(input.projectId, input.runId, 'generation_input_report.json')
    );
    const dslValidation =
      options.dslValidation ??
      ((await this.readModelOutputJson(input.projectId, input.runId, 'dsl_validation_report.json')) as { valid?: unknown; sourceArtifact?: unknown });
    const report = buildPipelineAcceptanceReport({
      projectId: input.projectId,
      runId: input.runId,
      artifactIndex,
      generationInput: {
        projectId: generationInput.projectId,
        runId: generationInput.runId,
        source: generationInput.source
      },
      runtimeCapability: await this.readRuntimeCapabilityStatus(input.projectId, input.runId, artifactIndex),
      dslValidation: {
        valid: dslValidation.valid === true,
        sourceArtifact: typeof dslValidation.sourceArtifact === 'string' ? dslValidation.sourceArtifact : undefined
      },
      dslConsumption: await this.readDslConsumptionSummary(input.projectId, input.runId, artifactIndex),
      assetIntentResolution: await this.readAssetIntentResolutionSummary(input.projectId, input.runId, artifactIndex),
      runtimeSceneBinding: await this.readRuntimeSceneBindingStatus(input.projectId, input.runId, artifactIndex),
      renderFidelityQa: await this.readRenderFidelityReportStatus(input.projectId, input.runId, artifactIndex),
      assetLibraryUsage: await this.readAssetLibraryUsageStatus(input.projectId, input.runId, artifactIndex),
      assetBindingTrace: await this.readAssetBindingTraceStatus(input.projectId, input.runId, artifactIndex)
    });

    await writePipelineAcceptanceReport(
      this.workspace.getModelOutputPath(input.projectId, input.runId, 'pipeline_acceptance_report.json'),
      report
    );
  }

  private async readModelOutputJson(projectId: string, runId: string, fileName: string): Promise<unknown> {
    return JSON.parse(await readFile(this.workspace.getModelOutputPath(projectId, runId, fileName), 'utf8')) as unknown;
  }

  private async readAssetLibraryUsageStatus(projectId: string, runId: string, artifactIndex: ReturnType<typeof buildValidPipelineArtifactIndex>): Promise<{ status?: 'pass' | 'warn' | 'fail' } | undefined> {
    const artifact = artifactIndex.artifacts.find((candidate) => candidate.id === 'assetLibraryUsageReport');
    if (artifact?.status !== 'present') {
      return undefined;
    }

    const report = AssetLibraryUsageReportSchema.parse(
      JSON.parse(await readFile(join(this.workspace.getGeneratedProjectDir(projectId), 'asset_library_usage_report.json'), 'utf8'))
    );
    if (report.projectId !== projectId || report.runId !== runId) {
      throw new Error('asset_library_usage_report identity does not match the current project and run.');
    }
    return { status: report.status };
  }

  private async readRuntimeCapabilityStatus(projectId: string, runId: string, artifactIndex: PipelineArtifactIndex): Promise<{ status?: 'supported' | 'unsupported' } | undefined> {
    const artifact = artifactIndex.artifacts.find((candidate) => candidate.id === 'runtimeCapabilityReport');
    if (artifact?.status !== 'present') {
      return undefined;
    }

    const report = (await this.readModelOutputJson(projectId, runId, 'runtime_capability_report.json')) as { status?: unknown };
    return report.status === 'supported' || report.status === 'unsupported' ? { status: report.status } : { status: undefined };
  }

  private async readDslConsumptionSummary(
    projectId: string,
    runId: string,
    artifactIndex: PipelineArtifactIndex
  ): Promise<{ ignoredAuthoritativeCount?: number; coverageRatio?: number } | undefined> {
    const artifact = artifactIndex.artifacts.find((candidate) => candidate.id === 'dslConsumptionReport');
    if (artifact?.status !== 'present') {
      return undefined;
    }

    const report = DslConsumptionReportSchema.parse(await this.readModelOutputJson(projectId, runId, 'dsl_consumption_report.json'));
    if (report.projectId !== projectId || report.runId !== runId) {
      throw new Error('dsl_consumption_report identity does not match the current project and run.');
    }
    return {
      ignoredAuthoritativeCount: report.summary.ignoredAuthoritativeCount,
      coverageRatio: report.summary.coverageRatio
    };
  }

  private async readAssetIntentResolutionSummary(
    projectId: string,
    runId: string,
    artifactIndex: PipelineArtifactIndex
  ): Promise<{ coreRequiredFallbackCount?: number; requestRequiredFallbackCount?: number; optionalFallbackCount?: number } | undefined> {
    const intentArtifact = artifactIndex.artifacts.find((candidate) => candidate.id === 'assetIntentManifest');
    const resolutionArtifact = artifactIndex.artifacts.find((candidate) => candidate.id === 'assetResolutionReport');
    if (intentArtifact?.status !== 'present' || resolutionArtifact?.status !== 'present') {
      return undefined;
    }

    const projectDir = this.workspace.getGeneratedProjectDir(projectId);
    const intentManifest = AssetIntentManifestSchema.parse(JSON.parse(await readFile(join(projectDir, 'asset_intent_manifest.json'), 'utf8')));
    const resolutionReport = AssetResolutionReportSchema.parse(JSON.parse(await readFile(join(projectDir, 'asset_resolution_report.json'), 'utf8')));
    if (intentManifest.projectId !== projectId || resolutionReport.projectId !== projectId) {
      throw new Error('asset intent / resolution report identity does not match the current project.');
    }

    return summarizeAssetIntentResolutionFallbacks({ manifest: intentManifest, resolutionReport });
  }

  private async readAssetBindingTraceStatus(projectId: string, runId: string, artifactIndex: ReturnType<typeof buildValidPipelineArtifactIndex>): Promise<{ status?: 'pass' | 'warn' | 'fail' } | undefined> {
    const artifact = artifactIndex.artifacts.find((candidate) => candidate.id === 'assetBindingTraceReport');
    if (artifact?.status !== 'present') {
      return undefined;
    }

    const report = AssetBindingTraceReportSchema.parse(
      JSON.parse(await readFile(join(this.workspace.getGeneratedProjectDir(projectId), 'asset_binding_trace_report.json'), 'utf8'))
    );
    if (report.projectId !== projectId || report.runId !== runId) {
      throw new Error('asset_binding_trace_report identity does not match the current project and run.');
    }
    return { status: report.status };
  }

  private async readRuntimeSceneBindingStatus(projectId: string, runId: string, artifactIndex: PipelineArtifactIndex): Promise<{ status?: 'pass' | 'fail'; unboundCount?: number } | undefined> {
    const artifact = artifactIndex.artifacts.find((candidate) => candidate.id === 'runtimeSceneBindingReport');
    if (artifact?.status !== 'present') {
      return undefined;
    }

    const report = RuntimeSceneBindingReportSchema.parse(
      JSON.parse(await readFile(join(this.workspace.getGeneratedProjectDir(projectId), 'runtime_scene_binding_report.json'), 'utf8'))
    );
    if (report.projectId !== projectId || report.runId !== runId) {
      throw new Error('runtime_scene_binding_report identity does not match the current project and run.');
    }
    return { status: report.status, unboundCount: report.summary.unboundCount };
  }

  private async readRenderFidelityReportStatus(
    projectId: string,
    runId: string,
    artifactIndex: PipelineArtifactIndex
  ): Promise<{ status?: 'PASSED' | 'PASSED_WITH_OPTIONAL_FALLBACKS' | 'VISUALLY_DEGRADED' | 'FAILED' } | undefined> {
    const artifact = artifactIndex.artifacts.find((candidate) => candidate.id === 'renderFidelityReport');
    if (artifact?.status !== 'present') {
      return undefined;
    }

    const report = RenderFidelityReportSchema.parse(await this.readModelOutputJson(projectId, runId, 'render_fidelity_report.json'));
    if (report.projectId !== projectId || report.runId !== runId) {
      throw new Error('render_fidelity_report identity does not match the current project and run.');
    }
    return { status: report.status };
  }

  private async writeRenderFidelityReport(input: GenerationPipelineInput, qaReport: QaReport) {
    const report = buildRenderFidelityReport({
      projectId: input.projectId,
      runId: input.runId,
      qaReport,
      dslConsumption: await this.readDslConsumptionSummaryDirect(input.projectId, input.runId),
      assetBindingTrace: await this.readAssetBindingTraceSummaryDirect(input.projectId, input.runId),
      runtimeSceneBinding: await this.readRuntimeSceneBindingSummaryDirect(input.projectId, input.runId)
    });

    await writeRenderFidelityReport(this.workspace.getModelOutputPath(input.projectId, input.runId, 'render_fidelity_report.json'), report);
    return report;
  }

  private async readDslConsumptionSummaryDirect(projectId: string, runId: string): Promise<{ ignoredAuthoritativeCount: number; coverageRatio?: number } | undefined> {
    const path = this.workspace.getModelOutputPath(projectId, runId, 'dsl_consumption_report.json');
    if (!(await pathExists(path))) {
      return undefined;
    }

    const report = DslConsumptionReportSchema.parse(JSON.parse(await readFile(path, 'utf8')));
    if (report.projectId !== projectId || report.runId !== runId) {
      throw new Error('dsl_consumption_report identity does not match the current project and run.');
    }
    return {
      ignoredAuthoritativeCount: report.summary.ignoredAuthoritativeCount,
      coverageRatio: report.summary.coverageRatio
    };
  }

  private async readAssetBindingTraceSummaryDirect(projectId: string, runId: string): Promise<{ status: 'pass' | 'warn' | 'fail'; warningCount: number; errorCount: number } | undefined> {
    const path = join(this.workspace.getGeneratedProjectDir(projectId), 'asset_binding_trace_report.json');
    if (!(await pathExists(path))) {
      return undefined;
    }

    const report = AssetBindingTraceReportSchema.parse(JSON.parse(await readFile(path, 'utf8')));
    if (report.projectId !== projectId || report.runId !== runId) {
      throw new Error('asset_binding_trace_report identity does not match the current project and run.');
    }
    return {
      status: report.status,
      warningCount: report.warnings.length,
      errorCount: report.errors.length
    };
  }

  private async readRuntimeSceneBindingSummaryDirect(projectId: string, runId: string): Promise<{ status: 'pass' | 'fail'; boundCount: number; unboundCount: number } | undefined> {
    const path = join(this.workspace.getGeneratedProjectDir(projectId), 'runtime_scene_binding_report.json');
    if (!(await pathExists(path))) {
      return undefined;
    }

    const report = RuntimeSceneBindingReportSchema.parse(JSON.parse(await readFile(path, 'utf8')));
    if (report.projectId !== projectId || report.runId !== runId) {
      throw new Error('runtime_scene_binding_report identity does not match the current project and run.');
    }
    return {
      status: report.status,
      boundCount: report.summary.boundCount,
      unboundCount: report.summary.unboundCount
    };
  }

  private async writeObservedRuntimeSceneBindingReport(input: GenerationPipelineInput, qaReport: QaReport): Promise<void> {
    const projectDir = this.workspace.getGeneratedProjectDir(input.projectId);
    const sceneIrPath = join(projectDir, 'game.scene.ir.json');
    if (!(await pathExists(sceneIrPath))) {
      return;
    }

    const sceneIr = JSON.parse(await readFile(sceneIrPath, 'utf8')) as unknown;
    await writeRuntimeSceneBindingReport({
      outputDir: projectDir,
      report: buildRuntimeObservedSceneBindingReport({
        projectId: input.projectId,
        runId: input.runId,
        sceneIr: SceneIrSchema.parse(sceneIr),
        snapshot: qaReport.snapshot
      })
    });
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
  const runtimeGenre = runtimeGenreByRawGenre(genre);
  const templateDir = findRuntimeGenreCapability(runtimeGenre)?.templateDir;
  return isQaGenre(templateDir) ? templateDir : undefined;
}

function runtimeGenreByRawGenre(genre: RawGameDsl['game']['genre']): string {
  if (genre === 'shooter') {
    return 'top_down_shooter';
  }
  if (genre === 'dodger') {
    return 'dodger_collector';
  }
  return genre;
}

function isQaGenre(value: unknown): value is QaGenre {
  return value === 'collector' || value === 'dodger' || value === 'shooter' || value === 'side_scrolling_run_and_gun';
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
