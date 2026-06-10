import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ProjectStoreService } from '../../apps/maker-api/src/projects/project-store.service.js';
import { RunStoreService } from '../../apps/maker-api/src/projects/run-store.service.js';
import { LocalWorkspaceService } from '../../apps/maker-api/src/workspace/local-workspace.service.js';

describe('Project and run stores', () => {
  let root: string;
  let workspace: LocalWorkspaceService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-store-'));
    workspace = new LocalWorkspaceService(root);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes and reads project.json and latest-run.json inside data/local-data', async () => {
    const projectStore = new ProjectStoreService(workspace);
    const runStore = new RunStoreService(workspace);
    const projectId = 'proj_20260609_153000_abcd';
    const runId = 'run_20260609_153000_0001';

    const project = await projectStore.createProject({
      projectId,
      runId,
      idea: '做一个小猫射击外星人的小游戏',
      language: 'zh',
      createdAt: '2026-06-09T15:30:00.000Z'
    });
    const run = await runStore.createRun({ projectId, runId, createdAt: '2026-06-09T15:30:00.000Z' });
    await projectStore.writeLatestRun(projectId, run);

    expect(project).toMatchObject({ project_id: projectId, latest_run_id: runId, status: 'CREATED' });
    await expect(projectStore.readProject(projectId)).resolves.toEqual(project);
    await expect(projectStore.readLatestRun(projectId)).resolves.toEqual(run);

    const projectJson = await readFile(resolve(root, 'data/local-data/projects/proj_20260609_153000_abcd/project.json'), 'utf8');
    expect(JSON.parse(projectJson)).toEqual(project);
  });

  it('writes and reads run.json plus JSONL events inside the run directory', async () => {
    const runStore = new RunStoreService(workspace);
    const runId = 'run_20260609_153000_0001';

    const run = await runStore.createRun({
      projectId: 'proj_20260609_153000_abcd',
      runId,
      createdAt: '2026-06-09T15:30:00.000Z'
    });
    await runStore.appendEvent(runId, {
      timestamp: '2026-06-09T15:30:01.000Z',
      type: 'job.started',
      message: 'Project generation started.'
    });
    await runStore.appendEvent(runId, {
      timestamp: '2026-06-09T15:30:04.000Z',
      type: 'dsl.validated',
      message: 'Raw Game DSL passed validation.'
    });

    await expect(runStore.readRun(runId)).resolves.toEqual(run);
    await expect(runStore.readEvents(runId)).resolves.toEqual([
      {
        timestamp: '2026-06-09T15:30:01.000Z',
        type: 'job.started',
        message: 'Project generation started.'
      },
      {
        timestamp: '2026-06-09T15:30:04.000Z',
        type: 'dsl.validated',
        message: 'Raw Game DSL passed validation.'
      }
    ]);

    const eventsJsonl = await readFile(resolve(root, 'data/local-data/runs/run_20260609_153000_0001/events.jsonl'), 'utf8');
    expect(eventsJsonl.trim().split('\n')).toHaveLength(2);
  });

  it('rejects unsafe project and run identifiers through LocalWorkspaceService', async () => {
    const projectStore = new ProjectStoreService(workspace);
    const runStore = new RunStoreService(workspace);

    await expect(
      projectStore.createProject({
        projectId: '../escape',
        runId: 'run_20260609_153000_0001',
        idea: 'bad path',
        language: 'zh'
      })
    ).rejects.toThrow();
    await expect(runStore.createRun({ projectId: 'proj_20260609_153000_abcd', runId: 'run/escape' })).rejects.toThrow();
  });

  it('rejects latest-run writes for a different project', async () => {
    const projectStore = new ProjectStoreService(workspace);
    const runStore = new RunStoreService(workspace);
    const run = await runStore.createRun({
      projectId: 'proj_20260609_153000_abcd',
      runId: 'run_20260609_153000_0001'
    });

    await expect(projectStore.writeLatestRun('proj_other', run)).rejects.toThrow('latest-run project mismatch');
  });

  it('rejects records whose file content id does not match the requested path', async () => {
    const projectStore = new ProjectStoreService(workspace);
    const runStore = new RunStoreService(workspace);
    const projectDir = resolve(root, 'data/local-data/projects/proj_a');
    const runDir = resolve(root, 'data/local-data/runs/run_a');

    await mkdir(projectDir, { recursive: true });
    await mkdir(runDir, { recursive: true });
    await writeFile(
      resolve(projectDir, 'project.json'),
      JSON.stringify({
        project_id: 'proj_b',
        created_at: '2026-06-09T15:30:00.000Z',
        updated_at: '2026-06-09T15:30:00.000Z',
        idea: 'mismatch',
        language: 'zh',
        status: 'CREATED',
        latest_run_id: 'run_a'
      }),
      'utf8'
    );
    await writeFile(
      resolve(runDir, 'run.json'),
      JSON.stringify({
        run_id: 'run_b',
        project_id: 'proj_a',
        created_at: '2026-06-09T15:30:00.000Z',
        updated_at: '2026-06-09T15:30:00.000Z',
        status: 'CREATED',
        steps: []
      }),
      'utf8'
    );

    await expect(projectStore.readProject('proj_a')).rejects.toThrow('project id mismatch');
    await expect(runStore.readRun('run_a')).rejects.toThrow('run id mismatch');
  });

  it('rejects malformed run steps and event records read from disk', async () => {
    const runStore = new RunStoreService(workspace);
    const runDir = resolve(root, 'data/local-data/runs/run_bad');

    await mkdir(runDir, { recursive: true });
    await writeFile(
      resolve(runDir, 'run.json'),
      JSON.stringify({
        run_id: 'run_bad',
        project_id: 'proj_20260609_153000_abcd',
        created_at: '2026-06-09T15:30:00.000Z',
        updated_at: '2026-06-09T15:30:00.000Z',
        status: 'CREATED',
        steps: [{}]
      }),
      'utf8'
    );
    await writeFile(resolve(runDir, 'events.jsonl'), `${JSON.stringify({ type: 1 })}\n`, 'utf8');

    await expect(runStore.readRun('run_bad')).rejects.toThrow('invalid step record');
    await expect(runStore.readEvents('run_bad')).rejects.toThrow('events.jsonl line is missing string field');
  });
});
