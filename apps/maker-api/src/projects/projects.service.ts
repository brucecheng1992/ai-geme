import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { NotFoundException } from '@nestjs/common';

import { AssetBindingTraceReportSchema } from '../compiler/asset-binding-trace-report.js';
import { normalizePersistedQaReport } from '../qa/qa-report-normalizer.js';
import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import { buildAssetBindingTraceSummary, buildUnavailableAssetBindingTraceSummary } from './asset-binding-trace-summary.js';
import { DslLiveEditService } from './dsl-live-edit.service.js';
import { resolvePromptOptimizationGenerationInput, type GenerationInputReport } from './generation-input-report.js';
import { GenerationPipelineService } from './generation-pipeline.service.js';
import type {
  AssetBindingTraceSummaryResponse,
  BuildLogResponse,
  GenerateProjectRequest,
  GenerateProjectResponse,
  LiveCurrentResponse,
  PipelineAcceptanceResponse,
  PipelineArtifactsResponse,
  PrepareLiveEditRequest,
  PreparePromptOptimizationRequest,
  PreparePromptOptimizationResponse,
  PrepareDeterministicPatchResponse,
  ProjectStatusResponse,
  QaReportResponse,
  RepairReportResponse,
  RuntimeApplyResultResponse,
  RunEventsResponse
} from './project-api.types.js';
import { PipelineArtifactIndexSchema } from './pipeline-artifact-index.js';
import { PipelineAcceptanceReportSchema } from './pipeline-acceptance-report.js';
import { PromptOptimizationReportSchema } from './prompt-coach.contract.js';
import { PromptCoachService } from './prompt-coach.service.js';
import { ProjectRequestError } from './project-request.error.js';
import { ProjectStoreService } from './project-store.service.js';
import { RunStoreService } from './run-store.service.js';
import {
  buildRuntimeCapabilityReport,
  DslPatchV1Schema,
  GameDslArtifactSchema,
  RuntimeCapabilityReportSchema,
  type GameDslArtifact,
  type LiveEditCapabilities,
  type RuntimeCapabilityReport
} from '../../../../packages/game-dsl/src/index.js';

type IdFactory = (date: Date) => { projectId: string; runId: string };
type SuffixFactory = () => string;
type GenerationPipeline = Pick<GenerationPipelineService, 'run'>;
type ParsedGenerateProjectRequest = Required<Pick<GenerateProjectRequest, 'idea' | 'language'>> &
  Pick<GenerateProjectRequest, 'promptOptimizationProjectId' | 'promptOptimizationId'>;
const PROJECT_ID_PATTERN = /^proj_[A-Za-z0-9_-]+$/;
const PROMPT_OPTIMIZATION_ID_PATTERN = /^opt_proj_[A-Za-z0-9_-]+_[a-f0-9]{12}$/;
const liveEditRegistryGenreDirByDslGenre: Partial<Record<GameDslArtifact['genre'], string>> = {
  top_down_shooter: 'shooter',
  side_scrolling_run_and_gun: 'side_scrolling_run_and_gun'
};
const emptyLiveEditCapabilities: LiveEditCapabilities = {
  hot: [],
  assetSwap: [],
  warmRestart: [],
  rebuildRequired: []
};

type GeneratedRuntimeCapabilitiesResolution =
  | { status: 'available'; capabilities: LiveEditCapabilities }
  | { status: 'not-applicable' | 'file-missing' | 'inventory-missing' | 'run-mismatch' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatTimestampForId(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '').replace('T', '_');
}

export function createProjectRunIds(date: Date, createSuffix: SuffixFactory = () => randomBytes(2).toString('hex')) {
  const timestamp = formatTimestampForId(date);
  const suffix = createSuffix();
  return {
    projectId: `proj_${timestamp}_${suffix}`,
    runId: `run_${timestamp}_${suffix}`
  };
}

export class ProjectsService {
  constructor(
    private readonly projectStore: ProjectStoreService,
    private readonly runStore: RunStoreService,
    private readonly workspace: LocalWorkspaceService,
    private readonly liveEdit: DslLiveEditService,
    private readonly pipeline: GenerationPipeline,
    private readonly promptCoach: PromptCoachService,
    private readonly idFactory: IdFactory = createProjectRunIds
  ) {}

  async generateProject(body: unknown): Promise<GenerateProjectResponse> {
    const request = this.parseGenerateRequest(body);
    const createdAt = new Date();
    const { projectId, runId } = this.idFactory(createdAt);
    const generationInputReport = await this.resolveGenerationInputReport({
      projectId,
      runId,
      request
    });

    await this.projectStore.createProject({
      projectId,
      runId,
      idea: request.idea,
      language: request.language,
      createdAt: createdAt.toISOString()
    });
    const run = await this.runStore.createRun({ projectId, runId, createdAt: createdAt.toISOString() });
    await this.projectStore.writeLatestRun(projectId, run);
    await this.runStore.appendEvent(runId, {
      timestamp: createdAt.toISOString(),
      type: 'job.started',
      message: 'Project generation job created.'
    });
    const status = await this.pipeline.run({
      projectId,
      runId,
      idea: request.idea,
      language: request.language,
      generationInputReport
    });

    return {
      ok: true,
      project_id: projectId,
      run_id: runId,
      status
    };
  }

  async getProject(projectId: string): Promise<ProjectStatusResponse> {
    const project = await this.projectStore.readProject(projectId);
    const latestRun = await this.projectStore.readLatestRun(projectId);

    if (project.latest_run_id !== latestRun.run_id) {
      throw new ProjectRequestError(`latest run does not match project: ${projectId}`);
    }

    return {
      ok: true,
      project,
      latest_run: latestRun
    };
  }

  async getRunEvents(projectId: string, runId: string): Promise<RunEventsResponse> {
    await this.assertRunBelongsToProject(projectId, runId);

    return {
      ok: true,
      events: await this.runStore.readEvents(runId)
    };
  }

  async getQaReport(projectId: string, runId: string): Promise<QaReportResponse> {
    await this.assertRunBelongsToProject(projectId, runId);

    return {
      ok: true,
      qa_report: normalizePersistedQaReport(JSON.parse(await this.readRequiredFile(this.workspace.getQaReportPath(projectId, runId), 'QA report not found.')))
    };
  }

  async getRepairReport(projectId: string, runId: string): Promise<RepairReportResponse> {
    await this.assertRunBelongsToProject(projectId, runId);

    return {
      ok: true,
      repair_report: JSON.parse(
        await this.readRequiredFile(this.workspace.getRepairReportPath(projectId, runId), 'Repair report not found.')
      ) as RepairReportResponse['repair_report']
    };
  }

  async getBuildLog(projectId: string, runId: string): Promise<BuildLogResponse> {
    await this.assertRunBelongsToProject(projectId, runId);

    return {
      ok: true,
      build_log: await this.readRequiredFile(this.workspace.getBuildLogPath(projectId, runId), 'Build log not found.')
    };
  }

  async getPipelineArtifacts(projectId: string, runId: string): Promise<PipelineArtifactsResponse> {
    await this.assertRunBelongsToProject(projectId, runId);
    const index = PipelineArtifactIndexSchema.parse(
      JSON.parse(
        await this.readRequiredFile(
          this.workspace.getModelOutputPath(projectId, runId, 'pipeline_artifact_index.json'),
          'Pipeline artifact index not found.'
        )
      )
    );

    if (index.projectId !== projectId || index.runId !== runId) {
      throw new ProjectRequestError(`pipeline artifact index identity does not match run: ${projectId}/${runId}`);
    }

    return {
      ok: true,
      pipeline_artifact_index: index
    };
  }

  async getPipelineAcceptance(projectId: string, runId: string): Promise<PipelineAcceptanceResponse> {
    await this.assertRunBelongsToProject(projectId, runId);
    const report = PipelineAcceptanceReportSchema.parse(
      JSON.parse(
        await this.readRequiredFile(
          this.workspace.getModelOutputPath(projectId, runId, 'pipeline_acceptance_report.json'),
          'Pipeline acceptance report not found.'
        )
      )
    );

    if (report.projectId !== projectId || report.runId !== runId) {
      throw new ProjectRequestError(`pipeline acceptance report identity does not match run: ${projectId}/${runId}`);
    }

    return {
      ok: true,
      pipeline_acceptance_report: report
    };
  }

  async getAssetBindingTraceSummary(projectId: string, runId: string): Promise<AssetBindingTraceSummaryResponse> {
    await this.assertRunBelongsToProject(projectId, runId);
    const index = PipelineArtifactIndexSchema.parse(
      JSON.parse(
        await this.readRequiredFile(
          this.workspace.getModelOutputPath(projectId, runId, 'pipeline_artifact_index.json'),
          'Pipeline artifact index not found.'
        )
      )
    );

    if (index.projectId !== projectId || index.runId !== runId) {
      throw new ProjectRequestError(`pipeline artifact index identity does not match run: ${projectId}/${runId}`);
    }

    const artifact = index.artifacts.find((candidate) => candidate.id === 'assetBindingTraceReport');
    if (artifact === undefined) {
      throw new NotFoundException('Asset binding trace report ref not found.');
    }
    if (artifact.artifactRoot !== 'generated-project' || artifact.path !== 'asset_binding_trace_report.json') {
      throw new ProjectRequestError(`asset binding trace report ref does not match the fixed generated artifact path: ${projectId}/${runId}`);
    }

    if (artifact.status !== 'present') {
      return {
        ok: true,
        asset_binding_trace_summary: buildUnavailableAssetBindingTraceSummary({ projectId, runId, artifact })
      };
    }

    const report = AssetBindingTraceReportSchema.parse(
      JSON.parse(
        await this.readRequiredFile(
          join(this.workspace.getGeneratedProjectDir(projectId), 'asset_binding_trace_report.json'),
          'Asset binding trace report not found.'
        )
      )
    );

    if (report.projectId !== projectId || report.runId !== runId) {
      throw new ProjectRequestError(`asset binding trace report identity does not match run: ${projectId}/${runId}`);
    }

    return {
      ok: true,
      asset_binding_trace_summary: buildAssetBindingTraceSummary({ projectId, runId, report, artifact })
    };
  }

  async preparePromptOptimization(projectId: string, body: unknown): Promise<PreparePromptOptimizationResponse> {
    await this.projectStore.readProject(projectId);
    const request = this.parsePreparePromptOptimizationRequest(body);
    if (request.runId !== undefined) {
      await this.assertRunBelongsToProject(projectId, request.runId);
    }
    const prepared = await this.promptCoach.prepare({
      projectId,
      originalPrompt: request.originalPrompt,
      supportedDslVersion: 'v1',
      runId: request.runId,
      mode: request.mode
    });

    return {
      ok: true,
      report: prepared.report,
      artifacts: prepared.artifacts
    };
  }

  async getLiveCurrent(projectId: string, runId: string): Promise<LiveCurrentResponse> {
    await this.assertRunBelongsToProject(projectId, runId);
    const current = await this.liveEdit.ensureLiveVersion({ projectId, runId });
    const gameDsl = GameDslArtifactSchema.parse(JSON.parse(await readFile(current.dslArtifactPath, 'utf8')));
    const runtimeCapabilityReport = await this.resolveLiveCurrentCapabilityReport({ projectId, runId, gameDsl });

    return {
      ok: true,
      current_version: current,
      game_dsl: gameDsl,
      runtime_capability_report: runtimeCapabilityReport,
      live_edit_capabilities: runtimeCapabilityReport.liveEditCapabilities,
      patch_history: await this.readOptionalJsonLines(this.workspace.getLivePatchHistoryPath(projectId, runId)),
      edit_audit_log: await this.readOptionalJsonLines(this.workspace.getLiveEditAuditLogPath(projectId, runId))
    };
  }

  async prepareWorkbenchLiveEdit(projectId: string, runId: string, body: unknown): Promise<PrepareDeterministicPatchResponse> {
    await this.assertRunBelongsToProject(projectId, runId);
    const request = this.parsePrepareLiveEditRequest(body);
    const current = await this.liveEdit.ensureLiveVersion({ projectId, runId });
    const baseDsl = GameDslArtifactSchema.parse(JSON.parse(await readFile(current.dslArtifactPath, 'utf8')));
    const patchId = `patch_workbench_${randomBytes(4).toString('hex')}`;
    const patch = DslPatchV1Schema.parse({
      artifactKind: 'dsl_patch',
      schemaVersion: 'dsl_patch.v1',
      patchId,
      runId,
      baseDslId: baseDsl.dslId,
      baseVersionId: current.versionId,
      source: 'workbench',
      intent: request.intent ?? `Workbench edit ${request.ops.map((op) => op.path).join(', ')}`,
      ops: request.ops
    });
    const capabilityReport = await this.resolveLiveCurrentCapabilityReport({ projectId, runId, gameDsl: baseDsl });
    const prepared = await this.liveEdit.prepareLiveEditPatch({ projectId, runId, patch, capabilityReport });

    return toPrepareResponse(prepared);
  }

  async prepareWorkbenchDeterministicPatch(projectId: string, runId: string): Promise<PrepareDeterministicPatchResponse> {
    await this.assertRunBelongsToProject(projectId, runId);
    const current = await this.liveEdit.ensureLiveVersion({ projectId, runId });
    const baseDsl = GameDslArtifactSchema.parse(JSON.parse(await readFile(current.dslArtifactPath, 'utf8')));
    const enemyTypeId = selectDeterministicEnemyTypeId(baseDsl);
    const patchId = `patch_workbench_${randomBytes(4).toString('hex')}`;
    const patch = DslPatchV1Schema.parse({
      artifactKind: 'dsl_patch',
      schemaVersion: 'dsl_patch.v1',
      patchId,
      runId,
      baseDslId: baseDsl.dslId,
      baseVersionId: current.versionId,
      source: 'workbench',
      intent: 'Workbench deterministic top_down_shooter hot patch',
      ops: [
        { op: 'replace', path: '/player/render/scale', value: 1.3 },
        { op: 'replace', path: '/player/physics/maxSpeed', value: 320 },
        { op: 'replace', path: `/enemyTypes/${enemyTypeId}/physics/speed`, value: 80 }
      ]
    });
    const capabilityReport = await this.resolveLiveCurrentCapabilityReport({ projectId, runId, gameDsl: baseDsl });
    const prepared = await this.liveEdit.prepareLiveEditPatch({ projectId, runId, patch, capabilityReport });

    return toPrepareResponse(prepared);
  }

  async recordWorkbenchRuntimeApplyResult(projectId: string, runId: string, patchId: string, report: unknown): Promise<RuntimeApplyResultResponse> {
    await this.assertRunBelongsToProject(projectId, runId);
    const recorded = await this.liveEdit.recordRuntimeApplyResult({ projectId, runId, patchId, report });

    return {
      ok: true,
      patch_id: recorded.patchId,
      status: recorded.status,
      apply_mode: recorded.applyMode,
      version_id: recorded.versionId,
      runtime_apply_report: recorded.runtimeApplyReport
    };
  }

  private async readRequiredFile(path: string, message: string): Promise<string> {
    try {
      return await readFile(path, 'utf8');
    } catch {
      throw new NotFoundException(message);
    }
  }

  private async readOptionalJsonLines<T>(path: string): Promise<T[]> {
    try {
      const content = await readFile(path, 'utf8');
      return content
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as T);
    } catch (error) {
      if (isNodeErrorCode(error, 'ENOENT')) {
        return [];
      }
      throw error;
    }
  }

  private async resolveLiveCurrentCapabilityReport(input: { projectId: string; runId: string; gameDsl: GameDslArtifact }): Promise<RuntimeCapabilityReport> {
    const dynamicReport = buildRuntimeCapabilityReport({ runId: input.runId, validatedDsl: input.gameDsl });
    const persistedReport = await this.readPersistedRuntimeCapabilityReport(input.projectId, input.runId);
    const generatedRuntimeCapabilities = await this.readGeneratedRuntimeLiveEditCapabilities(input);
    if (generatedRuntimeCapabilities.status === 'available') {
      return withLiveEditCapabilities(dynamicReport, intersectLiveEditCapabilities(dynamicReport.liveEditCapabilities, generatedRuntimeCapabilities.capabilities));
    }
    if (generatedRuntimeCapabilities.status === 'not-applicable') {
      return persistedReport ?? dynamicReport;
    }
    if (generatedRuntimeCapabilities.status === 'inventory-missing') {
      return persistedReport ?? withLiveEditCapabilities(dynamicReport, emptyLiveEditCapabilities);
    }

    return withLiveEditCapabilities(dynamicReport, emptyLiveEditCapabilities);
  }

  private async readPersistedRuntimeCapabilityReport(projectId: string, runId: string): Promise<RuntimeCapabilityReport | undefined> {
    try {
      return RuntimeCapabilityReportSchema.parse(
        JSON.parse(await readFile(this.workspace.getModelOutputPath(projectId, runId, 'runtime_capability_report.json'), 'utf8'))
      );
    } catch (error) {
      if (isNodeErrorCode(error, 'ENOENT')) {
        return undefined;
      }
      throw error;
    }
  }

  private async readGeneratedRuntimeLiveEditCapabilities(input: {
    projectId: string;
    runId: string;
    gameDsl: GameDslArtifact;
  }): Promise<GeneratedRuntimeCapabilitiesResolution> {
    const genreDir = liveEditRegistryGenreDirByDslGenre[input.gameDsl.genre];
    if (genreDir === undefined) {
      return { status: 'not-applicable' };
    }

    try {
      const registry = JSON.parse(
        await readFile(join(this.workspace.getGeneratedProjectDir(input.projectId), genreDir, 'src', 'live-edit-registry.generated.json'), 'utf8')
      );
      if (!isRecord(registry) || registry.runId !== input.runId) {
        return { status: 'run-mismatch' };
      }
      const capabilities = parseLiveEditCapabilities(registry.liveEditCapabilities);
      return capabilities === undefined ? { status: 'inventory-missing' } : { status: 'available', capabilities };
    } catch (error) {
      if (isNodeErrorCode(error, 'ENOENT')) {
        return { status: 'file-missing' };
      }
      throw error;
    }
  }

  private async assertRunBelongsToProject(projectId: string, runId: string): Promise<void> {
    const run = await this.runStore.readRun(runId);

    if (run.project_id !== projectId) {
      throw new ProjectRequestError(`run does not belong to project: ${runId}`);
    }
  }

  private parseGenerateRequest(body: unknown): ParsedGenerateProjectRequest {
    if (!isRecord(body)) {
      throw new ProjectRequestError('Request body must be an object.');
    }

    if (typeof body.idea !== 'string' || body.idea.trim().length === 0) {
      throw new ProjectRequestError('idea is required.');
    }

    if (typeof body.language !== 'string' || body.language.trim().length === 0) {
      throw new ProjectRequestError('language is required.');
    }

    if (
      body.promptOptimizationProjectId !== undefined &&
      (typeof body.promptOptimizationProjectId !== 'string' || body.promptOptimizationProjectId.trim().length === 0)
    ) {
      throw new ProjectRequestError('promptOptimizationProjectId must be a non-empty string when provided.');
    }
    if (body.promptOptimizationId !== undefined && (typeof body.promptOptimizationId !== 'string' || body.promptOptimizationId.trim().length === 0)) {
      throw new ProjectRequestError('promptOptimizationId must be a non-empty string when provided.');
    }

    const promptOptimizationProjectId = typeof body.promptOptimizationProjectId === 'string' ? body.promptOptimizationProjectId.trim() : undefined;
    const promptOptimizationId = typeof body.promptOptimizationId === 'string' ? body.promptOptimizationId.trim() : undefined;

    if ((promptOptimizationProjectId === undefined) !== (promptOptimizationId === undefined)) {
      throw new ProjectRequestError('promptOptimizationProjectId and promptOptimizationId must be provided together.');
    }
    if (promptOptimizationProjectId !== undefined && !PROJECT_ID_PATTERN.test(promptOptimizationProjectId)) {
      throw new ProjectRequestError('promptOptimizationProjectId is invalid.');
    }
    if (promptOptimizationId !== undefined && !PROMPT_OPTIMIZATION_ID_PATTERN.test(promptOptimizationId)) {
      throw new ProjectRequestError('promptOptimizationId is invalid.');
    }

    return {
      idea: body.idea.trim(),
      language: body.language.trim(),
      promptOptimizationProjectId,
      promptOptimizationId
    };
  }

  private async resolveGenerationInputReport(input: {
    projectId: string;
    runId: string;
    request: ParsedGenerateProjectRequest;
  }): Promise<GenerationInputReport | undefined> {
    const { promptOptimizationProjectId, promptOptimizationId } = input.request;
    if (promptOptimizationProjectId === undefined || promptOptimizationId === undefined) {
      return undefined;
    }

    await this.projectStore.readProject(promptOptimizationProjectId);
    const reportPath = this.workspace.getProjectPromptOptimizationArtifactPath(
      promptOptimizationProjectId,
      promptOptimizationId,
      'prompt_optimization_report.json'
    );
    const optimizedPromptPath = this.workspace.getProjectPromptOptimizationArtifactPath(
      promptOptimizationProjectId,
      promptOptimizationId,
      'optimized_prompt.txt'
    );
    let report: unknown;
    let optimizedPromptArtifact: string;

    try {
      report = JSON.parse(await readFile(reportPath, 'utf8'));
      optimizedPromptArtifact = await readFile(optimizedPromptPath, 'utf8');
    } catch {
      throw new ProjectRequestError('Prompt optimization artifact is not readable.');
    }

    let parsedReport;
    try {
      parsedReport = PromptOptimizationReportSchema.parse(report);
    } catch (error) {
      throw new ProjectRequestError(`Prompt optimization report is invalid: ${errorMessage(error)}`);
    }
    const optimizedPrompt = stripSingleTrailingNewline(optimizedPromptArtifact);
    if (optimizedPrompt !== parsedReport.optimizedPrompt) {
      throw new ProjectRequestError('optimized_prompt.txt does not match prompt_optimization_report.json.');
    }

    try {
      return resolvePromptOptimizationGenerationInput({
        projectId: input.projectId,
        runId: input.runId,
        promptOptimizationProjectId,
        optimizationId: promptOptimizationId,
        effectivePrompt: input.request.idea,
        report: parsedReport
      });
    } catch (error) {
      throw new ProjectRequestError(errorMessage(error));
    }
  }

  private parsePrepareLiveEditRequest(body: unknown): { ops: Array<{ op: 'replace'; path: string; value: unknown }>; intent?: string } {
    if (!isRecord(body)) {
      throw new ProjectRequestError('Request body must be an object.');
    }

    if (Array.isArray(body.ops)) {
      if (body.ops.length === 0 || body.ops.length > 20) {
        throw new ProjectRequestError('ops must contain between 1 and 20 live edit operations.');
      }
      return {
        ops: body.ops.map((op, index) => {
          if (!isRecord(op)) {
            throw new ProjectRequestError(`ops.${index} must be an object.`);
          }
          if (op.op !== 'replace') {
            throw new ProjectRequestError('Only replace live edit operations are supported.');
          }
          if (typeof op.path !== 'string' || op.path.trim().length === 0) {
            throw new ProjectRequestError(`ops.${index}.path is required.`);
          }
          return { op: 'replace', path: op.path.trim(), value: op.value };
        }),
        intent: typeof body.intent === 'string' && body.intent.trim().length > 0 ? body.intent.trim() : undefined
      };
    }

    if (body.op !== 'replace') {
      throw new ProjectRequestError('Only replace live edit operations are supported.');
    }
    if (typeof body.path !== 'string' || body.path.trim().length === 0) {
      throw new ProjectRequestError('path is required.');
    }

    return {
      ops: [{ op: 'replace', path: body.path.trim(), value: body.value }],
      intent: typeof body.intent === 'string' && body.intent.trim().length > 0 ? body.intent.trim() : undefined
    };
  }

  private parsePreparePromptOptimizationRequest(body: unknown): Required<Pick<PreparePromptOptimizationRequest, 'originalPrompt' | 'mode'>> & Pick<PreparePromptOptimizationRequest, 'runId'> {
    if (!isRecord(body)) {
      throw new ProjectRequestError('Request body must be an object.');
    }
    if (typeof body.originalPrompt !== 'string' || body.originalPrompt.trim().length === 0) {
      throw new ProjectRequestError('originalPrompt is required.');
    }
    if (body.runId !== undefined && (typeof body.runId !== 'string' || body.runId.trim().length === 0)) {
      throw new ProjectRequestError('runId must be a string when provided.');
    }
    if (body.mode !== undefined && body.mode !== 'mock' && body.mode !== 'llm') {
      throw new ProjectRequestError('mode must be "mock" or "llm" when provided.');
    }

    return {
      originalPrompt: body.originalPrompt.trim(),
      runId: typeof body.runId === 'string' ? body.runId.trim() : undefined,
      mode: body.mode ?? 'mock'
    };
  }
}

function toPrepareResponse(prepared: Awaited<ReturnType<DslLiveEditService['prepareLiveEditPatch']>>): PrepareDeterministicPatchResponse {
  return {
    ok: true,
    patch_id: prepared.patchId,
    status: prepared.status,
    apply_mode: prepared.applyMode,
    runtime_patch: prepared.runtimePatch,
    validation_report: prepared.validationReport,
    live_update_plan: prepared.liveUpdatePlan,
    live_update_plan_ref: { artifact: `${prepared.patchId}.live_update_plan.json`, patchId: prepared.patchId },
    artifact_refs: prepared.artifactRefs
  };
}

function selectDeterministicEnemyTypeId(baseDsl: GameDslArtifact): string {
  if (baseDsl.enemyTypes.tank_basic !== undefined) {
    return 'tank_basic';
  }

  const [firstEnemyTypeId] = Object.keys(baseDsl.enemyTypes).sort();
  if (firstEnemyTypeId === undefined) {
    throw new ProjectRequestError('Cannot prepare deterministic patch without enemyTypes.');
  }

  return firstEnemyTypeId;
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === code;
}

function stripSingleTrailingNewline(value: string): string {
  return value.endsWith('\n') ? value.slice(0, -1) : value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseLiveEditCapabilities(value: unknown): LiveEditCapabilities | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const hot = parseStringArray(value.hot);
  const assetSwap = parseStringArray(value.assetSwap);
  const warmRestart = parseStringArray(value.warmRestart);
  const rebuildRequired = parseStringArray(value.rebuildRequired);
  if (hot === undefined || assetSwap === undefined || warmRestart === undefined || rebuildRequired === undefined) {
    return undefined;
  }

  return { hot, assetSwap, warmRestart, rebuildRequired };
}

function parseStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined;
}

function intersectLiveEditCapabilities(left: LiveEditCapabilities, right: LiveEditCapabilities): LiveEditCapabilities {
  return {
    hot: intersectStrings(left.hot, right.hot),
    assetSwap: intersectStrings(left.assetSwap, right.assetSwap),
    warmRestart: intersectStrings(left.warmRestart, right.warmRestart),
    rebuildRequired: intersectStrings(left.rebuildRequired, right.rebuildRequired)
  };
}

function intersectStrings(left: string[], right: string[]): string[] {
  const allowed = new Set(right);
  return left.filter((item) => allowed.has(item));
}

function withLiveEditCapabilities(report: RuntimeCapabilityReport, liveEditCapabilities: LiveEditCapabilities): RuntimeCapabilityReport {
  return RuntimeCapabilityReportSchema.parse({ ...report, liveEditCapabilities });
}
