import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { JsonFileStore } from './json-file-store.js';
import { assertJobEventRecord, assertRunRecord } from './project-record.guards.js';
import type { CreateRunInput, JobEventRecord, ProjectStatus, RunRecord, RunStepRecord, RunStepStatus } from './project-state.types.js';
import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';

export class RunStoreService {
  private readonly files: JsonFileStore;

  constructor(private readonly workspace: LocalWorkspaceService) {
    this.files = new JsonFileStore(workspace);
  }

  async createRun(input: CreateRunInput): Promise<RunRecord> {
    const now = input.createdAt ?? new Date().toISOString();
    const run: RunRecord = {
      run_id: input.runId,
      project_id: input.projectId,
      created_at: now,
      updated_at: now,
      status: 'CREATED',
      steps: []
    };

    await this.writeRun(run);
    await this.ensureEventsFile(run.run_id);
    return run;
  }

  async readRun(runId: string): Promise<RunRecord> {
    const value = await this.files.readJson(this.getRunPath(runId));
    assertRunRecord(value);
    if (value.run_id !== runId) {
      throw new Error(`run id mismatch: ${value.run_id} !== ${runId}`);
    }
    return value;
  }

  async writeRun(run: RunRecord): Promise<void> {
    await this.files.writeJson(this.getRunPath(run.run_id), run);
  }

  async updateRunStatus(runId: string, status: ProjectStatus): Promise<RunRecord> {
    const run = await this.readRun(runId);
    const updated: RunRecord = {
      ...run,
      status,
      updated_at: new Date().toISOString()
    };

    await this.writeRun(updated);
    return updated;
  }

  async updateStep(runId: string, name: string, status: RunStepStatus): Promise<RunRecord> {
    const run = await this.readRun(runId);
    const nextStep: RunStepRecord = { name, status };
    const steps = run.steps.some((step) => step.name === name) ? run.steps.map((step) => (step.name === name ? nextStep : step)) : [...run.steps, nextStep];
    const updated: RunRecord = {
      ...run,
      steps,
      updated_at: new Date().toISOString()
    };

    await this.writeRun(updated);
    return updated;
  }

  async appendEvent(runId: string, event: JobEventRecord): Promise<void> {
    const path = this.getEventsPath(runId);
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path, `${JSON.stringify(event)}\n`, 'utf8');
  }

  async readEvents(runId: string): Promise<JobEventRecord[]> {
    const path = this.getEventsPath(runId);
    const content = await readFile(path, 'utf8');

    return content
      .split(/\r?\n/)
      .filter((line) => line.length > 0)
      .map((line) => {
        const value = JSON.parse(line) as unknown;
        assertJobEventRecord(value);
        return value;
      });
  }

  private async ensureEventsFile(runId: string): Promise<void> {
    const path = this.getEventsPath(runId);
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path, '', 'utf8');
  }

  private getRunPath(runId: string): string {
    const path = resolve(this.workspace.getRunDir(runId), 'run.json');
    this.workspace.assertInsideWorkspace(path);
    return path;
  }

  private getEventsPath(runId: string): string {
    const path = resolve(this.workspace.getRunDir(runId), 'events.jsonl');
    this.workspace.assertInsideWorkspace(path);
    return path;
  }
}
