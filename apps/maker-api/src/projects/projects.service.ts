import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { NotFoundException } from '@nestjs/common';

import { normalizePersistedQaReport } from '../qa/qa-report-normalizer.js';
import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import { GenerationPipelineService } from './generation-pipeline.service.js';
import type {
  BuildLogResponse,
  GenerateProjectRequest,
  GenerateProjectResponse,
  ProjectStatusResponse,
  QaReportResponse,
  RepairReportResponse,
  RunEventsResponse
} from './project-api.types.js';
import { ProjectRequestError } from './project-request.error.js';
import { ProjectStoreService } from './project-store.service.js';
import { RunStoreService } from './run-store.service.js';

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

  private async readRequiredFile(path: string, message: string): Promise<string> {
    try {
      return await readFile(path, 'utf8');
    } catch {
      throw new NotFoundException(message);
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
}
