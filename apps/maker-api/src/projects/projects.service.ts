import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { NotFoundException } from '@nestjs/common';

import { normalizePersistedQaReport } from '../qa/qa-report-normalizer.js';
import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import { DslLiveEditService } from './dsl-live-edit.service.js';
import { GenerationPipelineService } from './generation-pipeline.service.js';
import type {
  BuildLogResponse,
  GenerateProjectRequest,
  GenerateProjectResponse,
  LiveCurrentResponse,
  PrepareLiveEditRequest,
  PrepareDeterministicPatchResponse,
  ProjectStatusResponse,
  QaReportResponse,
  RepairReportResponse,
  RuntimeApplyResultResponse,
  RunEventsResponse
} from './project-api.types.js';
import { ProjectRequestError } from './project-request.error.js';
import { ProjectStoreService } from './project-store.service.js';
import { RunStoreService } from './run-store.service.js';
import { DslPatchV1Schema, GameDslArtifactSchema, RuntimeCapabilityReportSchema, type GameDslArtifact } from '../../../../packages/game-dsl/src/index.js';

type IdFactory = (date: Date) => { projectId: string; runId: string };
type SuffixFactory = () => string;
type GenerationPipeline = Pick<GenerationPipelineService, 'run'>;

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
    private readonly idFactory: IdFactory = createProjectRunIds
  ) {}

  async generateProject(body: unknown): Promise<GenerateProjectResponse> {
    const request = this.parseGenerateRequest(body);
    const createdAt = new Date();
    const { projectId, runId } = this.idFactory(createdAt);

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
      language: request.language
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

  async getLiveCurrent(projectId: string, runId: string): Promise<LiveCurrentResponse> {
    await this.assertRunBelongsToProject(projectId, runId);
    const current = await this.liveEdit.ensureLiveVersion({ projectId, runId });
    const gameDsl = GameDslArtifactSchema.parse(JSON.parse(await readFile(current.dslArtifactPath, 'utf8')));
    const runtimeCapabilityReport = RuntimeCapabilityReportSchema.parse(
      JSON.parse(await this.readRequiredFile(this.workspace.getModelOutputPath(projectId, runId, 'runtime_capability_report.json'), 'Runtime capability report not found.'))
    );

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
      intent: request.intent ?? `Workbench edit ${request.path}`,
      ops: [{ op: 'replace', path: request.path, value: request.value }]
    });
    const prepared = await this.liveEdit.prepareLiveEditPatch({ projectId, runId, patch });

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
    const prepared = await this.liveEdit.prepareLiveEditPatch({ projectId, runId, patch });

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

  private async assertRunBelongsToProject(projectId: string, runId: string): Promise<void> {
    const run = await this.runStore.readRun(runId);

    if (run.project_id !== projectId) {
      throw new ProjectRequestError(`run does not belong to project: ${runId}`);
    }
  }

  private parseGenerateRequest(body: unknown): GenerateProjectRequest {
    if (!isRecord(body)) {
      throw new ProjectRequestError('Request body must be an object.');
    }

    if (typeof body.idea !== 'string' || body.idea.trim().length === 0) {
      throw new ProjectRequestError('idea is required.');
    }

    if (typeof body.language !== 'string' || body.language.trim().length === 0) {
      throw new ProjectRequestError('language is required.');
    }

    return {
      idea: body.idea.trim(),
      language: body.language.trim()
    };
  }

  private parsePrepareLiveEditRequest(body: unknown): Required<Pick<PrepareLiveEditRequest, 'op' | 'path'>> & Pick<PrepareLiveEditRequest, 'value' | 'intent'> {
    if (!isRecord(body)) {
      throw new ProjectRequestError('Request body must be an object.');
    }
    if (body.op !== 'replace') {
      throw new ProjectRequestError('Only replace live edit operations are supported.');
    }
    if (typeof body.path !== 'string' || body.path.trim().length === 0) {
      throw new ProjectRequestError('path is required.');
    }

    return {
      op: 'replace',
      path: body.path.trim(),
      value: body.value,
      intent: typeof body.intent === 'string' && body.intent.trim().length > 0 ? body.intent.trim() : undefined
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
