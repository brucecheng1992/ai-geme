import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PlayableQaGateService } from '../../apps/maker-api/src/qa/playable-qa-gate.service.js';
import { PlaywrightQaRunnerService } from '../../apps/maker-api/src/qa/playwright-qa-runner.service.js';
import type { QaBrowserRunner } from '../../apps/maker-api/src/qa/qa.types.js';
import { LocalWorkspaceService } from '../../apps/maker-api/src/workspace/local-workspace.service.js';
import type { TelemetryEvent } from '../../packages/runtime-core/src/index.js';

const projectId = 'proj_20260610_030000_qa';
const runId = 'run_20260610_030000_qa';

describe('Playable QA gate and runner', () => {
  let root: string;
  let workspace: LocalWorkspaceService;
  let gate: PlayableQaGateService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-qa-'));
    workspace = new LocalWorkspaceService(root);
    gate = new PlayableQaGateService();
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('evaluates common, genre all, and any group telemetry requirements', () => {
    const required = gate.getRequiredEvents('shooter');
    const missing = gate.evaluate(['game.ready', 'game.started', 'input.received', 'player.moved', 'player.fired', 'projectile.spawned', 'enemy.hit', 'game.restarted'], required);

    expect(missing).toEqual({
      passed: false,
      missing_events: [],
      missing_any_groups: [['enemy.cleared', 'score.changed']]
    });

    const passed = gate.evaluate([...missingObservedBase(), 'score.changed'], required);
    expect(passed).toEqual({ passed: true, missing_events: [], missing_any_groups: [] });
  });

  it('writes a passed QA report from browser telemetry', async () => {
    const browserRunner: QaBrowserRunner = async () => ({
      ok: true,
      visual_ok: true,
      interaction_ok: true,
      telemetry: missingObservedBase().map((type, index) => ({ type, timestamp_ms: index, frame: index })),
      observed_events: missingObservedBase(),
      snapshot: { gameStatus: 'READY', score: 1, health: 3, frame: 0 },
      console_errors: []
    });
    const runner = new PlaywrightQaRunnerService(workspace, gate, browserRunner);

    const report = await runner.run({ projectId, runId, genre: 'shooter', previewUrl: 'http://localhost:3000/preview/proj/index.html' });

    expect(report.status).toBe('PASSED');
    expect(report.code).toBeUndefined();
    await expect(readFile(workspace.getQaReportPath(projectId, runId), 'utf8')).resolves.toContain('"status": "PASSED"');
  });

  it('writes a QA_FAILED report when required telemetry is missing', async () => {
    const browserRunner: QaBrowserRunner = async () => ({
      ok: true,
      visual_ok: true,
      interaction_ok: true,
      telemetry: [{ type: 'game.ready', timestamp_ms: 0, frame: 0 }],
      observed_events: ['game.ready'],
      console_errors: []
    });
    const runner = new PlaywrightQaRunnerService(workspace, gate, browserRunner);

    const report = await runner.run({ projectId, runId, genre: 'collector', previewUrl: 'http://localhost:3000/preview/proj/index.html' });

    expect(report).toMatchObject({
      status: 'QA_FAILED',
      code: 'REQUIRED_TELEMETRY_MISSING',
      missing_events: ['game.started', 'input.received', 'game.restarted', 'player.moved', 'item.spawned', 'item.collected', 'score.changed']
    });
    await expect(readFile(workspace.getQaReportPath(projectId, runId), 'utf8')).resolves.toContain('"code": "REQUIRED_TELEMETRY_MISSING"');
  });

  it('preserves QA bridge missing failures in the QA report', async () => {
    const browserRunner: QaBrowserRunner = async () => ({
      ok: false,
      visual_ok: true,
      interaction_ok: false,
      telemetry: [],
      observed_events: [],
      console_errors: [],
      failure_code: 'QA_BRIDGE_MISSING',
      message: 'Timed out waiting for __GAME_QA__.'
    });
    const runner = new PlaywrightQaRunnerService(workspace, gate, browserRunner);

    const report = await runner.run({ projectId, runId, genre: 'collector', previewUrl: 'http://localhost:3000/preview/proj/index.html' });

    expect(report).toMatchObject({
      status: 'QA_FAILED',
      code: 'QA_BRIDGE_MISSING',
      message: 'Timed out waiting for __GAME_QA__.'
    });
    await expect(readFile(workspace.getQaReportPath(projectId, runId), 'utf8')).resolves.toContain('"code": "QA_BRIDGE_MISSING"');
  });

  it(
    'p0_false_playable_blank_preview',
    async () => {
      const server = await startBlankTelemetryPreviewServer();
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'shooter', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'VISUAL_QA_FAILED',
          code: 'PREVIEW_BLANK_SCREEN'
        });
        expect(report.observed_events).toEqual([]);
        await expect(readFile(workspace.getQaScreenshotPath(projectId, runId))).resolves.toBeTruthy();
        await expect(readFile(workspace.getQaReportPath(projectId, runId), 'utf8')).resolves.toContain('"code": "PREVIEW_BLANK_SCREEN"');
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );
});

function missingObservedBase(): TelemetryEvent['type'][] {
  return ['game.ready', 'game.started', 'input.received', 'player.moved', 'player.fired', 'projectile.spawned', 'enemy.hit', 'game.restarted', 'score.changed'];
}

async function startBlankTelemetryPreviewServer(): Promise<Server> {
  const telemetry = missingObservedBase()
    .map((type, index) => ({ type, timestamp_ms: index, frame: index }))
    .map((event) => JSON.stringify(event))
    .join(',');
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:white">
    <canvas width="640" height="360" style="width:640px;height:360px"></canvas>
    <script>
      const telemetry = [${telemetry}];
      window.__GAME_TELEMETRY__ = { events: telemetry, state: { gameStatus: 'READY', score: 1, health: 3, frame: 0 } };
      window.__GAME_QA__ = {
        snapshot() { return window.__GAME_TELEMETRY__.state; },
        telemetry() { return telemetry; }
      };
    </script>
  </body>
</html>`;
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(html);
  });

  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  return server;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
}
