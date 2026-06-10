import 'reflect-metadata';

import { readFile, rm, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { isAbsolute, relative } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TemplateCompilerService } from '../../apps/maker-api/src/compiler/template-compiler.service.js';
import { ViteBuildRunnerService } from '../../apps/maker-api/src/compiler/vite-build-runner.service.js';
import { GenerationPipelineService } from '../../apps/maker-api/src/projects/generation-pipeline.service.js';
import { ProjectStoreService } from '../../apps/maker-api/src/projects/project-store.service.js';
import { ProjectsService } from '../../apps/maker-api/src/projects/projects.service.js';
import { RunStoreService } from '../../apps/maker-api/src/projects/run-store.service.js';
import { PlayableQaGateService } from '../../apps/maker-api/src/qa/playable-qa-gate.service.js';
import { PlaywrightQaRunnerService } from '../../apps/maker-api/src/qa/playwright-qa-runner.service.js';
import { LocalWorkspaceService } from '../../apps/maker-api/src/workspace/local-workspace.service.js';

const projectId = 'proj_20260609_191900_smoke';
const runId = 'run_20260609_191900_smoke';
const repoRoot = process.cwd();
const workspace = new LocalWorkspaceService(repoRoot);
const previousPreviewBaseUrl = process.env.PREVIEW_BASE_URL;

describe('P0 generation pipeline smoke', () => {
  beforeEach(async () => {
    await cleanSmokeArtifacts();
  });

  afterEach(async () => {
    if (previousPreviewBaseUrl === undefined) {
      delete process.env.PREVIEW_BASE_URL;
    } else {
      process.env.PREVIEW_BASE_URL = previousPreviewBaseUrl;
    }
    await cleanSmokeArtifacts();
  });

  it(
    'generates cat shooter preview and QA report from Generate',
    async () => {
      const server = await startPreviewServer();
      const port = (server.address() as AddressInfo).port;
      process.env.PREVIEW_BASE_URL = `http://127.0.0.1:${port}`;

      try {
        const service = createProjectsService();
        const result = await service.generateProject({ idea: '做一个小猫射击外星人的小游戏', language: 'zh' });

        expect(result).toMatchObject({ ok: true, project_id: projectId, run_id: runId, status: 'PLAYABLE' });
        await expect(readFile(join(workspace.getGeneratedProjectDir(projectId), 'package.json'), 'utf8')).resolves.toContain('"build": "vite build"');
        await expect(readFile(join(workspace.getGeneratedProjectDir(projectId), 'index.html'), 'utf8')).resolves.toContain('./src/main.ts');
        await expect(readFile(join(workspace.getGeneratedProjectDir(projectId), 'src/main.ts'), 'utf8')).resolves.toContain("../shooter/src/main.js");
        await expect(readFile(join(workspace.getGeneratedProjectDistDir(projectId), 'index.html'), 'utf8')).resolves.toContain('<script');

        const preview = await fetch(`${process.env.PREVIEW_BASE_URL}/preview/${projectId}/index.html`);
        expect(preview.status).toBe(200);

        const qaReport = JSON.parse(await readFile(workspace.getQaReportPath(projectId, runId), 'utf8')) as {
          status: string;
          visual_status?: string;
          observed_events: string[];
          screenshot_path?: string;
          visual_metrics?: { canvas_width: number; canvas_height: number; non_background_pixel_ratio: number; varied_pixel_ratio: number };
        };
        expect(qaReport.status).toBe('PASSED');
        expect(qaReport.visual_status).toBe('PASSED');
        expect(qaReport.observed_events).toEqual(expect.arrayContaining(['player.fired', 'projectile.spawned', 'enemy.hit', 'score.changed']));
        expect(qaReport.visual_metrics?.canvas_width).toBeGreaterThan(0);
        expect(qaReport.visual_metrics?.canvas_height).toBeGreaterThan(0);
        expect(qaReport.visual_metrics?.non_background_pixel_ratio).toBeGreaterThan(0.01);
        expect(qaReport.visual_metrics?.varied_pixel_ratio).toBeGreaterThan(0.005);
        expect(qaReport.screenshot_path).toBe(workspace.getQaScreenshotPath(projectId, runId));
        const screenshot = await stat(workspace.getQaScreenshotPath(projectId, runId));
        expect(screenshot.size).toBeGreaterThan(0);

        const events = (await service.getRunEvents(projectId, runId)).events.map((event) => event.type);
        expect(events).toEqual(
          expect.arrayContaining([
            'job.started',
            'dsl.generated',
            'ir.generated',
            'project.generated',
            'build.started',
            'build.success',
            'qa.started',
            'qa.passed'
          ])
        );
      } finally {
        await closeServer(server);
      }
    },
    180_000
  );
});

function createProjectsService(): ProjectsService {
  const projectStore = new ProjectStoreService(workspace);
  const runStore = new RunStoreService(workspace);
  const qaGate = new PlayableQaGateService();
  const pipeline = new GenerationPipelineService(
    projectStore,
    runStore,
    workspace,
    {
      async generateGameBrief() {
        return { ok: false, code: 'MODEL_NOT_AVAILABLE', message: 'Smoke test uses deterministic local DSL.' };
      },
      async generateRawGameDsl() {
        return { ok: false, code: 'MODEL_NOT_AVAILABLE', message: 'Smoke test uses deterministic local DSL.' };
      }
    },
    new TemplateCompilerService(workspace),
    new ViteBuildRunnerService(workspace),
    new PlaywrightQaRunnerService(workspace, qaGate)
  );

  return new ProjectsService(projectStore, runStore, workspace, pipeline, () => ({ projectId, runId }));
}

async function cleanSmokeArtifacts(): Promise<void> {
  await Promise.all([
    rm(workspace.getGeneratedProjectDir(projectId), { recursive: true, force: true }),
    rm(workspace.getProjectDir(projectId), { recursive: true, force: true }),
    rm(workspace.getRunDir(runId), { recursive: true, force: true }),
    rm(workspace.getQaReportPath(projectId, runId), { force: true }),
    rm(workspace.getQaScreenshotPath(projectId, runId), { force: true }),
    rm(workspace.getBuildLogPath(projectId, runId), { force: true }),
    rm(workspace.getRepairReportPath(projectId, runId), { force: true }),
    rm(dirname(workspace.getModelOutputPath(projectId, runId, 'raw-game-dsl.raw.json')), { recursive: true, force: true })
  ]);
}

async function startPreviewServer(): Promise<Server> {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const match = /^\/preview\/([^/]+)\/(.+)$/.exec(url.pathname);

    if (!match) {
      response.writeHead(404).end();
      return;
    }

    const [, requestedProjectId, fileName] = match;
    const baseDir = workspace.getGeneratedProjectDistDir(requestedProjectId);
    const filePath = resolve(baseDir, fileName);
    const pathFromBase = relative(baseDir, filePath);

    if (pathFromBase === '' || pathFromBase.startsWith('..') || isAbsolute(pathFromBase)) {
      response.writeHead(404).end();
      return;
    }

    response.setHeader('content-type', extname(filePath) === '.html' ? 'text/html' : 'application/javascript');
    createReadStream(filePath)
      .on('error', () => response.writeHead(404).end())
      .pipe(response);
  });

  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  return server;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
}
