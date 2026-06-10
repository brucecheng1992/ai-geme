import { resolve } from 'node:path';

import { JsonFileStore } from './json-file-store.js';
import { assertProjectRecord, assertRunRecord } from './project-record.guards.js';
import type { CreateProjectInput, ProjectRecord, ProjectStatus, RunRecord } from './project-state.types.js';
import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';

export class ProjectStoreService {
  private readonly files: JsonFileStore;

  constructor(private readonly workspace: LocalWorkspaceService) {
    this.files = new JsonFileStore(workspace);
  }

  async createProject(input: CreateProjectInput): Promise<ProjectRecord> {
    const now = input.createdAt ?? new Date().toISOString();
    const project: ProjectRecord = {
      project_id: input.projectId,
      created_at: now,
      updated_at: now,
      idea: input.idea,
      language: input.language,
      status: 'CREATED',
      latest_run_id: input.runId
    };

    await this.writeProject(project);
    return project;
  }

  async readProject(projectId: string): Promise<ProjectRecord> {
    const value = await this.files.readJson(this.getProjectPath(projectId));
    assertProjectRecord(value);
    if (value.project_id !== projectId) {
      throw new Error(`project id mismatch: ${value.project_id} !== ${projectId}`);
    }
    return value;
  }

  async writeProject(project: ProjectRecord): Promise<void> {
    await this.files.writeJson(this.getProjectPath(project.project_id), project);
  }

  async updateProjectStatus(projectId: string, status: ProjectStatus, patch: Partial<Pick<ProjectRecord, 'title' | 'genre' | 'preview_url'>> = {}): Promise<ProjectRecord> {
    const project = await this.readProject(projectId);
    const updated: ProjectRecord = {
      ...project,
      ...patch,
      status,
      updated_at: new Date().toISOString()
    };

    await this.writeProject(updated);
    return updated;
  }

  async readLatestRun(projectId: string): Promise<RunRecord> {
    const value = await this.files.readJson(this.getLatestRunPath(projectId));
    assertRunRecord(value);
    if (value.project_id !== projectId) {
      throw new Error(`latest-run project mismatch: ${value.project_id} !== ${projectId}`);
    }
    return value;
  }

  async writeLatestRun(projectId: string, run: RunRecord): Promise<void> {
    if (run.project_id !== projectId) {
      throw new Error(`latest-run project mismatch: ${run.project_id} !== ${projectId}`);
    }

    await this.files.writeJson(this.getLatestRunPath(projectId), run);
  }

  private getProjectPath(projectId: string): string {
    const path = resolve(this.workspace.getProjectDir(projectId), 'project.json');
    this.workspace.assertInsideWorkspace(path);
    return path;
  }

  private getLatestRunPath(projectId: string): string {
    const path = resolve(this.workspace.getProjectDir(projectId), 'latest-run.json');
    this.workspace.assertInsideWorkspace(path);
    return path;
  }
}
