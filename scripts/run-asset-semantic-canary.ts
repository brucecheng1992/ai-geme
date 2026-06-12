import 'reflect-metadata';

import { execFile } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';

import type { GameBrief, RawGameDsl } from '../packages/game-dsl/src/index.js';
import { GameBriefSchema, RawGameDslSchema } from '../packages/game-dsl/src/index.js';
import { TemplateCompilerService } from '../apps/maker-api/src/compiler/template-compiler.service.js';
import { ViteBuildRunnerService } from '../apps/maker-api/src/compiler/vite-build-runner.service.js';
import type { CommandRunner } from '../apps/maker-api/src/compiler/compiler.types.js';
import { GenerationPipelineService } from '../apps/maker-api/src/projects/generation-pipeline.service.js';
import { ProjectStoreService } from '../apps/maker-api/src/projects/project-store.service.js';
import { ProjectsService } from '../apps/maker-api/src/projects/projects.service.js';
import { RunStoreService } from '../apps/maker-api/src/projects/run-store.service.js';
import { PlayableQaGateService } from '../apps/maker-api/src/qa/playable-qa-gate.service.js';
import { PlaywrightQaRunnerService } from '../apps/maker-api/src/qa/playwright-qa-runner.service.js';
import { normalizePersistedQaReport } from '../apps/maker-api/src/qa/qa-report-normalizer.js';
import { LocalWorkspaceService } from '../apps/maker-api/src/workspace/local-workspace.service.js';
import {
  AssetSemanticCanaryBriefsSchema,
  buildAssetSemanticCanarySummary,
  renderAssetSemanticCanaryMarkdown,
  selectAssetSemanticCanaryBriefs,
  type AssetSemanticCanaryBrief,
  type AssetSemanticCanaryExecution
} from './asset-semantic-canary-report.js';

type CliOptions = {
  fixturePath: string;
  outputRoot: string;
  includeUnsupported: boolean;
  allowNetwork: boolean;
  caseId?: string;
  limit?: number;
  timestamp: string;
};

const workspace = new LocalWorkspaceService(process.cwd());

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const fixture = AssetSemanticCanaryBriefsSchema.parse(JSON.parse(await readFile(options.fixturePath, 'utf8')));
  const outputDir = join(options.outputRoot, options.timestamp);
  const selected = selectAssetSemanticCanaryBriefs(fixture, {
    includeUnsupported: options.includeUnsupported,
    caseId: options.caseId,
    limit: options.limit
  });
  const selectedIds = new Set([...selected.runnable.map((brief) => brief.id), ...selected.skipped.map((item) => item.brief.id)]);
  const runnableIds = new Set(selected.runnable.map((brief) => brief.id));
  const skippedById = new Map(selected.skipped.map((item) => [item.brief.id, item.reason]));
  const executions: AssetSemanticCanaryExecution[] = [];
  const createdAt = new Date().toISOString();
  const previousPreviewBaseUrl = process.env.PREVIEW_BASE_URL;
  const server = await startPreviewServer();
  process.env.PREVIEW_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    for (const [index, brief] of fixture.entries()) {
      if (!selectedIds.has(brief.id)) {
        continue;
      }

      const skipReason = skippedById.get(brief.id);
      if (skipReason !== undefined) {
        executions.push({ brief, state: 'skipped', reason: skipReason });
        continue;
      }

      if (runnableIds.has(brief.id)) {
        executions.push(await runCanaryCase(brief, index, options));
      }
    }
  } finally {
    await closeServer(server);
    restorePreviewBaseUrl(previousPreviewBaseUrl);
  }

  const summary = buildAssetSemanticCanarySummary({
    fixturePath: options.fixturePath,
    outputDir,
    includeUnsupported: options.includeUnsupported,
    createdAt,
    executions
  });

  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await writeFile(join(outputDir, 'summary.md'), renderAssetSemanticCanaryMarkdown(summary), 'utf8');

  console.log(`Asset semantic canary summary written to ${outputDir}`);
  console.log(`runnable=${summary.runnable} skipped=${summary.skipped} experimental=${summary.experimental} passed=${summary.passed} failed=${summary.failed}`);

  process.exitCode = summary.exitCode;
}

async function runCanaryCase(brief: AssetSemanticCanaryBrief, index: number, options: CliOptions): Promise<AssetSemanticCanaryExecution> {
  const projectId = `proj_canary_${options.timestamp}_${String(index + 1).padStart(2, '0')}_${brief.id}`;
  const runId = `run_canary_${options.timestamp}_${String(index + 1).padStart(2, '0')}_${brief.id}`;
  const projectStore = new ProjectStoreService(workspace);
  const runStore = new RunStoreService(workspace);
  const service = new ProjectsService(
    projectStore,
    runStore,
    workspace,
    new GenerationPipelineService(
      projectStore,
      runStore,
      workspace,
      createCanaryProvider(brief),
      new TemplateCompilerService(workspace),
      new ViteBuildRunnerService(workspace, createCanaryCommandRunner(options.allowNetwork)),
      new PlaywrightQaRunnerService(workspace, new PlayableQaGateService())
    ),
    () => ({ projectId, runId })
  );

  let projectStatus = 'FAILED';
  let error: { code: string; message: string } | undefined;

  try {
    const response = await service.generateProject({ idea: brief.brief, language: 'zh' });
    projectStatus = response.status;
  } catch (caught) {
    error = { code: 'CANARY_CASE_FAILED', message: errorMessage(caught) };
  }

  const qaReportPath = workspace.getQaReportPath(projectId, runId);
  const manifestPath = workspace.getGeneratedProjectAssetManifestPath(projectId);
  const reportPath = join(workspace.getGeneratedProjectDir(projectId), 'asset_resolution_report.json');
  return {
    brief,
    state: 'completed',
    projectId,
    projectStatus,
    reportPath,
    manifestPath,
    qaReportPath,
    assetManifest: await readJsonIfExists(manifestPath),
    qaReport: await readNormalizedQaIfExists(qaReportPath),
    error
  };
}

function createCanaryProvider(brief: AssetSemanticCanaryBrief) {
  return {
    async generateGameBrief() {
      const value: GameBrief = GameBriefSchema.parse({
        brief_version: 'game-brief-v0.1',
        title: brief.id,
        genre: 'shooter',
        camera: 'top_down',
        core_loop: ['move', 'fire', 'clear enemies'],
        difficulty: 'easy',
        target_play_time_sec: 60
      });
      return { ok: true as const, value, rawText: JSON.stringify(value), rawOutputPath: '' };
    },
    async generateRawGameDsl() {
      const value = RawGameDslSchema.parse(createRawGameDslForCanary(brief));
      return { ok: true as const, value, rawText: JSON.stringify(value), rawOutputPath: '' };
    }
  };
}

function createRawGameDslForCanary(brief: AssetSemanticCanaryBrief): RawGameDsl {
  const player = expectedConcept(brief, 'player') ?? 'player';
  const enemy = expectedConcept(brief, 'enemy') ?? 'enemy';
  const projectile = expectedConcept(brief, 'projectile') ?? 'bolt';
  const background = expectedConcept(brief, 'background');

  return {
    dsl_version: 'game-dsl-v0.1',
    metadata: { title: brief.id, description: brief.brief, language: 'zh' },
    game: { genre: 'shooter', camera: 'top_down', difficulty: 'easy', target_play_time_sec: 60 },
    world: { width: 960, height: 540, visual_theme: background === 'space' ? 'deep space stars' : player === 'tank' || enemy === 'tank' ? 'battlefield road' : 'neon arena' },
    player: {
      id: 'player',
      label: labelForConcept(player, 'Player'),
      health: 3,
      movement: { type: 'eight_direction', speed_px_per_sec: 260 },
      actions: [{ id: 'fire', type: 'shoot_projectile', cooldown_ms: 300, spawns: 'shot' }]
    },
    entities: [
      { id: 'shot', kind: 'projectile', label: labelForConcept(projectile, 'Bolt'), damage: 1, movement: { type: 'move_right', speed_px_per_sec: 520 } },
      { id: 'target', kind: 'enemy', label: labelForConcept(enemy, 'Enemy'), count: 6, health: 1, movement: { type: 'chase_player', speed_px_per_sec: 120 } }
    ],
    rules: {
      collisions: [
        {
          id: 'shot_hits_target',
          source: 'shot',
          target: 'target',
          type: 'projectile_hit',
          effects: [{ type: 'damage', value: 1 }, { type: 'destroy' }, { type: 'score_add', value: 1 }]
        }
      ]
    },
    objectives: { win: { type: 'enemy_cleared', target: 6 }, lose: { type: 'player_health_zero' } },
    ui: { hud: ['score', 'health', 'objective'], restart: true }
  };
}

function createCanaryCommandRunner(allowNetwork: boolean): CommandRunner {
  return async (cmd, args, options) => {
    const effectiveArgs = !allowNetwork && cmd === 'npm' && args[0] === 'install' ? [...args, '--offline'] : args;
    return await execFileResult(cmd, effectiveArgs, options.cwd);
  };
}

function execFileResult(cmd: string, args: string[], cwd: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolveResult) => {
    execFile(cmd, args, { cwd }, (error, stdout, stderr) => {
      const exitCode = !error ? 0 : typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'number' ? error.code : 1;
      const errorMessageText = error instanceof Error ? error.message : '';
      resolveResult({
        exitCode,
        stdout,
        stderr: [stderr, errorMessageText].filter(Boolean).join('\n')
      });
    });
  });
}

function expectedConcept(brief: AssetSemanticCanaryBrief, role: 'player' | 'enemy' | 'projectile' | 'background'): string | undefined {
  return brief.expect.expectedCore?.find((item) => item.role === role)?.concept;
}

function labelForConcept(concept: string, fallback: string): string {
  const labels: Record<string, string> = {
    alien: 'Alien',
    cat: 'Cat',
    fishbone: 'Fishbone',
    tank: 'Tank'
  };
  return labels[concept] ?? fallback;
}

async function readJsonIfExists(path: string): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as unknown;
  } catch {
    return undefined;
  }
}

async function readNormalizedQaIfExists(path: string): Promise<unknown | undefined> {
  const raw = await readJsonIfExists(path);
  return raw === undefined ? undefined : normalizePersistedQaReport(raw);
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

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    fixturePath: 'tests/fixtures/asset-semantic-canary.briefs.json',
    outputRoot: 'artifacts/asset-semantic-canary',
    includeUnsupported: false,
    allowNetwork: false,
    timestamp: compactTimestamp(new Date())
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--include-unsupported') {
      options.includeUnsupported = true;
    } else if (arg === '--allow-network') {
      options.allowNetwork = true;
    } else if (arg === '--case') {
      options.caseId = requireValue(args, (index += 1), arg);
    } else if (arg === '--limit') {
      options.limit = parsePositiveInteger(requireValue(args, (index += 1), arg), arg);
    } else if (arg === '--fixture') {
      options.fixturePath = requireValue(args, (index += 1), arg);
    } else if (arg === '--output-root') {
      options.outputRoot = requireValue(args, (index += 1), arg);
    } else if (arg === '--timestamp') {
      options.timestamp = requireValue(args, (index += 1), arg);
    } else if (arg === '--help') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`Usage: npm run qa:asset-semantic:canary -- [options]

Options:
  --include-unsupported   Run expectedUnsupported canaries instead of skipping them.
  --case <id>             Run one canary case by id.
  --limit <n>             Run the first n selected canaries for smoke checks.
  --allow-network         Allow npm install to use the network. Default adds --offline.
  --fixture <path>        Fixture path. Defaults to tests/fixtures/asset-semantic-canary.briefs.json.
  --output-root <path>    Output root. Defaults to artifacts/asset-semantic-canary.
  --timestamp <value>     Override output timestamp for repeatable local runs.
`);
}

function requireValue(args: string[], index: number, flag: string): string {
  const value = args[index];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`Expected a value after ${flag}`);
  }
  return value;
}

function parsePositiveInteger(value: string, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Expected a positive integer after ${flag}`);
  }

  return parsed;
}

function compactTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function restorePreviewBaseUrl(value: string | undefined): void {
  if (value === undefined) {
    delete process.env.PREVIEW_BASE_URL;
    return;
  }

  process.env.PREVIEW_BASE_URL = value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}

main().catch((error: unknown) => {
  console.error(errorMessage(error));
  process.exitCode = 1;
});
