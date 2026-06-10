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

  it(
    'fails dodger QA when telemetry exists but the survival frame does not advance',
    async () => {
      const server = await startStaticDodgerPreviewServer();
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message: 'Dodger QA expected survival frame to advance automatically after preview load.'
        });
        expect(report.missing_events).toEqual([]);
        expect(report.missing_any_groups).toEqual([]);
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails dodger QA when runtime_plan spawn telemetry does not match the QA snapshot',
    async () => {
      const server = await startRuntimePlanMismatchDodgerPreviewServer();
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message: 'Dodger QA expected runtime_plan hazard spawn telemetry to match the snapshot spawnPlan.'
        });
        expect(report.missing_events).toEqual([]);
        expect(report.missing_any_groups).toEqual([]);
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails dodger QA when runtime_plan spawnPlan metadata is incomplete',
    async () => {
      const server = await startIncompleteRuntimePlanDodgerPreviewServer();
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message: 'Dodger QA expected runtime_plan spawnPlan.hazard to include entityId, strategy, count, maxActive, intervalMs, and laneCount.'
        });
        expect(report.missing_events).toEqual([]);
        expect(report.missing_any_groups).toEqual([]);
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails dodger QA when runtime_plan difficultyPlan metadata is incomplete',
    async () => {
      const telemetry = dodgerObservedBase()
        .map((type, index) => ({
          type,
          timestamp_ms: index,
          frame: index,
          payload:
            type === 'hazard.spawned'
              ? { source: 'runtime_plan', entityId: 'obstacle', strategy: 'right_edge_wave', count: 5, maxActive: 2, intervalMs: 700, laneCount: 4 }
              : undefined
        }))
        .map((event) => JSON.stringify(event))
        .join(',');
      const html = dodgerRuntimePlanHtml(
        telemetry,
        {
          hazard: {
            entityId: 'obstacle',
            strategy: 'right_edge_wave',
            source: 'runtime_plan',
            count: 5,
            maxActive: 2,
            intervalMs: 700,
            laneCount: 4
          }
        },
        { difficultyPlan: { level: 'normal', source: 'runtime_plan' } }
      );
      const server = await startHtmlPreviewServer(html);
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message:
            'Dodger QA expected runtime_plan difficultyPlan to include level, derivedFrom, rampDurationMs, rampProgress, speed multipliers, and spawn interval multipliers.'
        });
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails dodger QA when runtime_plan difficultyPlan is present but hazard telemetry lacks difficulty metadata',
    async () => {
      const telemetry = dodgerObservedBase()
        .map((type, index) => ({
          type,
          timestamp_ms: index,
          frame: index,
          payload: type === 'hazard.spawned' ? { source: 'template_default', entityId: 'hazard', strategy: 'right_edge_wave', count: 99, maxActive: 3, intervalMs: 1000, laneCount: 3 } : undefined
        }))
        .map((event) => JSON.stringify(event))
        .join(',');
      const html = dodgerRuntimePlanHtml(
        telemetry,
        {
          hazard: {
            entityId: 'hazard',
            strategy: 'right_edge_wave',
            source: 'template_default',
            count: 99,
            maxActive: 3,
            intervalMs: 1000,
            laneCount: 3
          }
        },
        {
          difficultyPlan: {
            level: 'normal',
            source: 'runtime_plan',
            derivedFrom: 'game.difficulty,game.target_play_time_sec',
            rampDurationMs: 60000,
            rampProgress: 0,
            speedMultiplierStart: 1,
            speedMultiplierEnd: 1.25,
            speedMultiplier: 1,
            spawnIntervalMultiplierStart: 1,
            spawnIntervalMultiplierEnd: 0.8,
            spawnIntervalMultiplier: 1
          }
        }
      );
      const server = await startHtmlPreviewServer(html);
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message: 'Dodger QA expected runtime_plan difficulty_curve metadata on hazard spawn telemetry.'
        });
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'accepts collectible runtime_plan spawns while hazard difficulty curve metadata is present',
    async () => {
      const telemetry = dodgerObservedBase()
        .map((type, index) => ({
          type,
          timestamp_ms: index,
          frame: index,
          payload:
            type === 'hazard.spawned'
              ? {
                  source: 'runtime_plan',
                  entityId: 'obstacle',
                  strategy: 'right_edge_wave',
                  count: 5,
                  maxActive: 2,
                  intervalMs: 700,
                  effectiveIntervalMs: 700,
                  laneCount: 4,
                  difficultyLevel: 'normal',
                  difficultySource: 'runtime_plan',
                  rampProgress: 0,
                  speedMultiplier: 1,
                  spawnIntervalMultiplier: 1
                }
              : type === 'item.spawned'
                ? { source: 'runtime_plan', entityId: 'coin', strategy: 'fixed_positions', count: 6, maxActive: 2, intervalMs: 900 }
                : undefined
        }))
        .map((event) => JSON.stringify(event))
        .join(',');
      const html = dodgerRuntimePlanHtml(
        telemetry,
        {
          hazard: {
            entityId: 'obstacle',
            strategy: 'right_edge_wave',
            source: 'runtime_plan',
            count: 5,
            maxActive: 2,
            intervalMs: 700,
            laneCount: 4
          },
          collectible: {
            entityId: 'coin',
            strategy: 'fixed_positions',
            source: 'runtime_plan',
            count: 6,
            maxActive: 2,
            intervalMs: 900
          }
        },
        {
          difficultyPlan: {
            level: 'normal',
            source: 'runtime_plan',
            derivedFrom: 'game.difficulty,game.target_play_time_sec',
            rampDurationMs: 60000,
            rampProgress: 0,
            speedMultiplierStart: 1,
            speedMultiplierEnd: 1.25,
            speedMultiplier: 1,
            spawnIntervalMultiplierStart: 1,
            spawnIntervalMultiplierEnd: 0.8,
            spawnIntervalMultiplier: 1
          }
        }
      );
      const server = await startHtmlPreviewServer(html);
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'PASSED',
          visual_status: 'PASSED'
        });
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails dodger QA when collectible runtime_plan spawn telemetry does not match the QA snapshot',
    async () => {
      const server = await startCollectibleRuntimePlanMismatchDodgerPreviewServer();
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message: 'Dodger QA expected runtime_plan collectible spawn telemetry to match the snapshot spawnPlan.'
        });
        expect(report.missing_events).toEqual([]);
        expect(report.missing_any_groups).toEqual([]);
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails dodger QA when collectible runtime_plan spawnPlan metadata is incomplete',
    async () => {
      const server = await startIncompleteCollectibleRuntimePlanDodgerPreviewServer();
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message: 'Dodger QA expected runtime_plan spawnPlan.collectible to include entityId, strategy, count, maxActive, and intervalMs.'
        });
        expect(report.missing_events).toEqual([]);
        expect(report.missing_any_groups).toEqual([]);
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails dodger QA when collectible runtime_plan uses an unsupported strategy even if telemetry matches',
    async () => {
      const server = await startUnsupportedCollectibleRuntimePlanDodgerPreviewServer();
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message: 'Dodger QA expected runtime_plan collectible strategy to be fixed_positions without laneCount.'
        });
        expect(report.missing_events).toEqual([]);
        expect(report.missing_any_groups).toEqual([]);
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails dodger QA when hazard runtime_plan uses an unsupported strategy even if telemetry matches',
    async () => {
      const server = await startUnsupportedHazardRuntimePlanDodgerPreviewServer();
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'dodger', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message: 'Dodger QA expected runtime_plan hazard strategy to be right_edge_wave.'
        });
        expect(report.missing_events).toEqual([]);
        expect(report.missing_any_groups).toEqual([]);
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'accepts shooter runtime_plan enemy wave metadata when hit telemetry matches the QA snapshot',
    async () => {
      const html = shooterRuntimePlanHtml({
        enemiesActive: 1,
        hitPayload: { entityId: 'alien', waveSource: 'runtime_plan', strategy: 'right_edge_wave', speedMultiplier: 1.15 }
      });
      const server = await startHtmlPreviewServer(html);
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'shooter', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'PASSED',
          visual_status: 'PASSED'
        });
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails shooter QA when runtime_plan enemyWavePlan exceeds maxActive',
    async () => {
      const html = shooterRuntimePlanHtml({
        enemiesActive: 2,
        hitPayload: { entityId: 'alien', waveSource: 'runtime_plan', strategy: 'right_edge_wave', speedMultiplier: 1.15 }
      });
      const server = await startHtmlPreviewServer(html);
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'shooter', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message: 'Shooter QA expected runtime_plan enemyWavePlan maxActive 1, observed 2 active enemies.'
        });
      } finally {
        await closeServer(server);
      }
    },
    30_000
  );

  it(
    'fails shooter QA when runtime_plan enemy hit telemetry does not match the QA snapshot',
    async () => {
      const html = shooterRuntimePlanHtml({
        enemiesActive: 1,
        hitPayload: { entityId: 'alien', waveSource: 'template_default', strategy: 'right_edge_wave', speedMultiplier: 1 }
      });
      const server = await startHtmlPreviewServer(html);
      const port = (server.address() as AddressInfo).port;
      const runner = new PlaywrightQaRunnerService(workspace, gate);

      try {
        const report = await runner.run({ projectId, runId, genre: 'shooter', previewUrl: `http://127.0.0.1:${port}/index.html`, timeoutMs: 10_000 });

        expect(report).toMatchObject({
          status: 'QA_FAILED',
          visual_status: 'PASSED',
          code: 'QA_RUNNER_FAILED',
          message: 'Shooter QA expected runtime_plan enemy wave hit or clear telemetry to match the snapshot enemyWavePlan.'
        });
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

async function startStaticDodgerPreviewServer(): Promise<Server> {
  const telemetry = dodgerObservedBase()
    .map((type, index) => ({ type, timestamp_ms: index, frame: 0 }))
    .map((event) => JSON.stringify(event))
    .join(',');
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#07111f">
    <canvas id="game" width="640" height="360" style="width:640px;height:360px;background:linear-gradient(135deg,#07111f 0%,#2a2438 35%,#ffd28a 62%,#9ca3af 100%)"></canvas>
    <script>
      const canvas = document.getElementById('game');
      const context = canvas.getContext('2d');
      context.fillStyle = '#07111f';
      context.fillRect(0, 0, 640, 360);
      context.fillStyle = '#2a2438';
      context.fillRect(24, 24, 592, 312);
      context.fillStyle = '#ffd28a';
      context.beginPath();
      context.arc(250, 180, 40, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#9ca3af';
      context.beginPath();
      context.moveTo(450, 210);
      context.lineTo(500, 100);
      context.lineTo(550, 210);
      context.closePath();
      context.fill();
      const telemetry = [${telemetry}];
      window.__GAME_TELEMETRY__ = { events: telemetry, state: { gameStatus: 'PLAYING', score: 0, health: 3, frame: 0 } };
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

async function startRuntimePlanMismatchDodgerPreviewServer(): Promise<Server> {
  const telemetry = dodgerObservedBase()
    .map((type, index) => ({
      type,
      timestamp_ms: index,
      frame: index,
      payload:
        type === 'hazard.spawned'
          ? { source: 'runtime_plan', entityId: 'obstacle', strategy: 'right_edge_wave', count: 5, maxActive: 99, intervalMs: 700, laneCount: 3 }
          : undefined
    }))
    .map((event) => JSON.stringify(event))
    .join(',');
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#07111f">
    <canvas id="game" width="640" height="360" style="width:640px;height:360px"></canvas>
    <script>
      const canvas = document.getElementById('game');
      const context = canvas.getContext('2d');
      context.fillStyle = '#07111f';
      context.fillRect(0, 0, 640, 360);
      context.fillStyle = '#2a2438';
      context.fillRect(24, 24, 592, 312);
      context.fillStyle = '#ffd28a';
      context.beginPath();
      context.arc(250, 180, 40, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#9ca3af';
      context.beginPath();
      context.moveTo(450, 210);
      context.lineTo(500, 100);
      context.lineTo(550, 210);
      context.closePath();
      context.fill();
      const telemetry = [${telemetry}];
      const state = {
        gameStatus: 'PLAYING',
        score: 0,
        health: 3,
        frame: 0,
        player: { x: 250, y: 180 },
        spawnPlan: {
          hazard: {
            entityId: 'obstacle',
            strategy: 'right_edge_wave',
            source: 'runtime_plan',
            count: 5,
            maxActive: 2,
            intervalMs: 700,
            laneCount: 4
          }
        }
      };
      setInterval(() => {
        state.frame += 1;
      }, 350);
      document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown') {
          state.player.y += 80;
        }
        if (event.key === 'ArrowUp') {
          state.player.y -= 80;
        }
      });
      window.__GAME_TELEMETRY__ = { events: telemetry, state };
      window.__GAME_QA__ = {
        snapshot() { return state; },
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

async function startIncompleteRuntimePlanDodgerPreviewServer(): Promise<Server> {
  const telemetry = dodgerObservedBase()
    .map((type, index) => ({
      type,
      timestamp_ms: index,
      frame: index,
      payload:
        type === 'hazard.spawned'
          ? { source: 'runtime_plan', entityId: 'obstacle', strategy: 'right_edge_wave', count: 5, maxActive: 2, intervalMs: 700, laneCount: 4 }
          : undefined
    }))
    .map((event) => JSON.stringify(event))
    .join(',');
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#07111f">
    <canvas id="game" width="640" height="360" style="width:640px;height:360px"></canvas>
    <script>
      const canvas = document.getElementById('game');
      const context = canvas.getContext('2d');
      context.fillStyle = '#07111f';
      context.fillRect(0, 0, 640, 360);
      context.fillStyle = '#2a2438';
      context.fillRect(24, 24, 592, 312);
      context.fillStyle = '#ffd28a';
      context.beginPath();
      context.arc(250, 180, 40, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#9ca3af';
      context.beginPath();
      context.moveTo(450, 210);
      context.lineTo(500, 100);
      context.lineTo(550, 210);
      context.closePath();
      context.fill();
      const telemetry = [${telemetry}];
      const state = {
        gameStatus: 'PLAYING',
        score: 0,
        health: 3,
        frame: 0,
        player: { x: 250, y: 180 },
        spawnPlan: {
          hazard: {
            entityId: 'obstacle',
            strategy: 'right_edge_wave',
            source: 'runtime_plan',
            count: 5,
            maxActive: 2
          }
        }
      };
      setInterval(() => {
        state.frame += 1;
      }, 350);
      document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown') {
          state.player.y += 80;
        }
        if (event.key === 'ArrowUp') {
          state.player.y -= 80;
        }
      });
      window.__GAME_TELEMETRY__ = { events: telemetry, state };
      window.__GAME_QA__ = {
        snapshot() { return state; },
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

async function startCollectibleRuntimePlanMismatchDodgerPreviewServer(): Promise<Server> {
  const telemetry = dodgerObservedBase()
    .map((type, index) => ({
      type,
      timestamp_ms: index,
      frame: index,
      payload:
        type === 'hazard.spawned'
          ? { source: 'template_default', entityId: 'hazard', strategy: 'right_edge_wave', count: 99, maxActive: 3, intervalMs: 1000, laneCount: 3 }
          : type === 'item.spawned'
            ? { source: 'runtime_plan', entityId: 'coin', strategy: 'fixed_positions', count: 6, maxActive: 99, intervalMs: 900 }
            : undefined
    }))
    .map((event) => JSON.stringify(event))
    .join(',');
  const html = dodgerRuntimePlanHtml(telemetry, {
    collectible: {
      entityId: 'coin',
      strategy: 'fixed_positions',
      source: 'runtime_plan',
      count: 6,
      maxActive: 2,
      intervalMs: 900
    }
  });
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(html);
  });

  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  return server;
}

async function startIncompleteCollectibleRuntimePlanDodgerPreviewServer(): Promise<Server> {
  const telemetry = dodgerObservedBase()
    .map((type, index) => ({
      type,
      timestamp_ms: index,
      frame: index,
      payload:
        type === 'item.spawned'
          ? { source: 'runtime_plan', entityId: 'coin', strategy: 'fixed_positions', count: 6, maxActive: 2, intervalMs: 900 }
          : undefined
    }))
    .map((event) => JSON.stringify(event))
    .join(',');
  const html = dodgerRuntimePlanHtml(telemetry, {
    collectible: {
      entityId: 'coin',
      strategy: 'fixed_positions',
      source: 'runtime_plan',
      count: 6,
      maxActive: 2
    }
  });
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(html);
  });

  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  return server;
}

async function startUnsupportedCollectibleRuntimePlanDodgerPreviewServer(): Promise<Server> {
  const telemetry = dodgerObservedBase()
    .map((type, index) => ({
      type,
      timestamp_ms: index,
      frame: index,
      payload:
        type === 'item.spawned'
          ? { source: 'runtime_plan', entityId: 'coin', strategy: 'right_edge_wave', count: 6, maxActive: 2, intervalMs: 900, laneCount: 3 }
          : undefined
    }))
    .map((event) => JSON.stringify(event))
    .join(',');
  const html = dodgerRuntimePlanHtml(telemetry, {
    collectible: {
      entityId: 'coin',
      strategy: 'right_edge_wave',
      source: 'runtime_plan',
      count: 6,
      maxActive: 2,
      intervalMs: 900,
      laneCount: 3
    }
  });
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(html);
  });

  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  return server;
}

async function startUnsupportedHazardRuntimePlanDodgerPreviewServer(): Promise<Server> {
  const telemetry = dodgerObservedBase()
    .map((type, index) => ({
      type,
      timestamp_ms: index,
      frame: index,
      payload:
        type === 'hazard.spawned'
          ? { source: 'runtime_plan', entityId: 'obstacle', strategy: 'fixed_positions', count: 5, maxActive: 2, intervalMs: 700, laneCount: 3 }
          : undefined
    }))
    .map((event) => JSON.stringify(event))
    .join(',');
  const html = dodgerRuntimePlanHtml(telemetry, {
    hazard: {
      entityId: 'obstacle',
      strategy: 'fixed_positions',
      source: 'runtime_plan',
      count: 5,
      maxActive: 2,
      intervalMs: 700,
      laneCount: 3
    }
  });
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(html);
  });

  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  return server;
}

function dodgerRuntimePlanHtml(telemetry: string, spawnPlan: Record<string, unknown>, extraState: Record<string, unknown> = {}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#07111f">
    <canvas id="game" width="640" height="360" style="width:640px;height:360px"></canvas>
    <script>
      const canvas = document.getElementById('game');
      const context = canvas.getContext('2d');
      context.fillStyle = '#07111f';
      context.fillRect(0, 0, 640, 360);
      context.fillStyle = '#2a2438';
      context.fillRect(24, 24, 592, 312);
      context.fillStyle = '#ffd28a';
      context.beginPath();
      context.arc(250, 180, 40, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#9ca3af';
      context.beginPath();
      context.moveTo(450, 210);
      context.lineTo(500, 100);
      context.lineTo(550, 210);
      context.closePath();
      context.fill();
      const telemetry = [${telemetry}];
      const state = {
        gameStatus: 'PLAYING',
        score: 0,
        health: 3,
        frame: 0,
        player: { x: 250, y: 180 },
        spawnPlan: ${JSON.stringify(spawnPlan)},
        ...${JSON.stringify(extraState)}
      };
      setInterval(() => {
        state.frame += 1;
      }, 350);
      document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown') {
          state.player.y += 80;
        }
        if (event.key === 'ArrowUp') {
          state.player.y -= 80;
        }
      });
      window.__GAME_TELEMETRY__ = { events: telemetry, state };
      window.__GAME_QA__ = {
        snapshot() { return state; },
        telemetry() { return telemetry; }
      };
    </script>
  </body>
</html>`;
}

function shooterRuntimePlanHtml(params: { enemiesActive: number; hitPayload: Record<string, unknown> }): string {
  const telemetry = missingObservedBase()
    .map((type, index) => ({
      type,
      timestamp_ms: index,
      frame: index,
      payload: type === 'enemy.hit' || type === 'enemy.cleared' ? params.hitPayload : undefined
    }))
    .map((event) => JSON.stringify(event))
    .join(',');
  return `<!doctype html>
<html>
  <body style="margin:0;background:#07111f">
    <canvas id="game" width="640" height="360" style="width:640px;height:360px"></canvas>
    <script>
      const canvas = document.getElementById('game');
      const context = canvas.getContext('2d');
      context.fillStyle = '#07111f';
      context.fillRect(0, 0, 640, 360);
      context.fillStyle = '#22d3ee';
      context.fillRect(80, 150, 90, 70);
      context.fillStyle = '#f97316';
      context.beginPath();
      context.arc(470, 180, 46, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#fef08a';
      context.fillRect(250, 176, 120, 10);
      const telemetry = [${telemetry}];
      const state = {
        gameStatus: 'PLAYING',
        score: 1,
        health: 3,
        frame: 0,
        player: { x: 250, y: 180 },
        enemiesActive: ${params.enemiesActive},
        enemyWavePlan: {
          derivedFrom: 'entities.enemy.id,entities.enemy.count,entities.enemy.health,entities.enemy.movement.speed_px_per_sec,game.difficulty,game.target_play_time_sec',
          entityId: 'alien',
          strategy: 'right_edge_wave',
          source: 'runtime_plan',
          count: 3,
          maxActive: 1,
          intervalMs: 700,
          speedMultiplier: 1.15
        }
      };
      document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') {
          state.player.x += 80;
        }
        if (event.key === 'ArrowLeft') {
          state.player.x -= 80;
        }
      });
      window.__GAME_TELEMETRY__ = { events: telemetry, state };
      window.__GAME_QA__ = {
        snapshot() { return state; },
        telemetry() { return telemetry; }
      };
    </script>
  </body>
</html>`;
}

async function startHtmlPreviewServer(html: string): Promise<Server> {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server;
}

function dodgerObservedBase(): TelemetryEvent['type'][] {
  return [
    'game.ready',
    'game.started',
    'input.received',
    'game.restarted',
    'player.moved',
    'hazard.spawned',
    'collision.detected',
    'player.damaged',
    'item.spawned',
    'survival_time.changed'
  ];
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
}
