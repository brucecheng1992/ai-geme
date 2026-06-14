import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ProjectRequestError } from '../../apps/maker-api/src/projects/project-request.error.js';
import { ProjectStoreService } from '../../apps/maker-api/src/projects/project-store.service.js';
import { createProjectRunIds, ProjectsService } from '../../apps/maker-api/src/projects/projects.service.js';
import { RunStoreService } from '../../apps/maker-api/src/projects/run-store.service.js';
import { LocalWorkspaceService } from '../../apps/maker-api/src/workspace/local-workspace.service.js';

describe('ProjectsService', () => {
  let root: string;
  let projectStore: ProjectStoreService;
  let runStore: RunStoreService;
  let workspace: LocalWorkspaceService;
  let service: ProjectsService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-api-'));
    workspace = new LocalWorkspaceService(root);
    projectStore = new ProjectStoreService(workspace);
    runStore = new RunStoreService(workspace);
    service = new ProjectsService(
      projectStore,
      runStore,
      workspace,
      {
        async run() {
          return 'CREATED';
        }
      },
      () => ({
        projectId: 'proj_20260609_153000_abcd',
        runId: 'run_20260609_153000_0001'
      })
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('creates a CREATED project and exposes project status plus events', async () => {
    const created = await service.generateProject({
      idea: '做一个小猫射击外星人的小游戏',
      language: 'zh'
    });

    expect(created).toEqual({
      ok: true,
      project_id: 'proj_20260609_153000_abcd',
      run_id: 'run_20260609_153000_0001',
      status: 'CREATED'
    });
    await expect(service.getProject(created.project_id)).resolves.toMatchObject({
      ok: true,
      project: {
        project_id: created.project_id,
        idea: '做一个小猫射击外星人的小游戏',
        language: 'zh',
        status: 'CREATED',
        latest_run_id: created.run_id
      },
      latest_run: {
        run_id: created.run_id,
        project_id: created.project_id,
        status: 'CREATED',
        steps: []
      }
    });
    await expect(service.getRunEvents(created.project_id, created.run_id)).resolves.toMatchObject({
      ok: true,
      events: [{ type: 'job.started', message: 'Project generation job created.' }]
    });
  });

  it('rejects invalid generate requests at the API boundary service layer', async () => {
    await expect(service.generateProject({ idea: '', language: 'zh' })).rejects.toThrow(ProjectRequestError);
    await expect(service.generateProject({ idea: 'cat shooter' })).rejects.toThrow(ProjectRequestError);
    await expect(service.generateProject(null)).rejects.toThrow(ProjectRequestError);

    await expect(service.generateProject({ idea: '', language: 'zh' })).rejects.toMatchObject({
      status: 400
    });
  });

  it('rejects event lookup when the run does not belong to the project', async () => {
    const created = await service.generateProject({ idea: 'cat shooter', language: 'en' });

    await expect(service.getRunEvents('proj_other', created.run_id)).rejects.toThrow('run does not belong to project');
  });

  it('reads QA report, repair report, and build log after validating run ownership', async () => {
    const created = await service.generateProject({ idea: 'cat shooter', language: 'en' });
    await writeJsonFile(workspace.getQaReportPath(created.project_id, created.run_id), { status: 'PASSED', observed_events: ['game.ready'] });
    await writeJsonFile(workspace.getRepairReportPath(created.project_id, created.run_id), { status: 'REPAIRED', attempts: [] });
    await writeTextFile(workspace.getBuildLogPath(created.project_id, created.run_id), 'vite build ok');

    await expect(service.getQaReport(created.project_id, created.run_id)).resolves.toMatchObject({
      ok: true,
      qa_report: {
        status: 'PASSED',
        runtime_status: 'PASSED',
        asset_semantic_status: 'PASSED',
        overall_status: 'PLAYABLE'
      }
    });
    await expect(service.getRepairReport(created.project_id, created.run_id)).resolves.toMatchObject({
      ok: true,
      repair_report: { status: 'REPAIRED' }
    });
    await expect(service.getBuildLog(created.project_id, created.run_id)).resolves.toEqual({
      ok: true,
      build_log: 'vite build ok'
    });
    await expect(service.getQaReport('proj_other', created.run_id)).rejects.toThrow('run does not belong to project');
  });

  it('uses the same random suffix for project and run ids to avoid cross-project run collisions', () => {
    expect(createProjectRunIds(new Date('2026-06-09T15:30:00.000Z'), () => 'abcd')).toEqual({
      projectId: 'proj_20260609_153000_abcd',
      runId: 'run_20260609_153000_abcd'
    });
  });

  it('rejects project status when latest_run_id and latest_run.run_id drift', async () => {
    const created = await service.generateProject({ idea: 'cat shooter', language: 'en' });
    const otherRun = await runStore.createRun({
      projectId: created.project_id,
      runId: 'run_20260609_153000_other'
    });
    await projectStore.writeLatestRun(created.project_id, otherRun);

    await expect(service.getProject(created.project_id)).rejects.toThrow('latest run does not match project');
  });
});

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await writeTextFile(path, `${JSON.stringify(value)}\n`);
}

async function writeTextFile(path: string, value: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, 'utf8');
}
