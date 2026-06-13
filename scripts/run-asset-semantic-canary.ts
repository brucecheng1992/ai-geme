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
import { GenerationPipelineService, type AssetSemanticRepairConfig } from '../apps/maker-api/src/projects/generation-pipeline.service.js';
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
import {
  parseAssetSemanticCanaryArgs,
  printAssetSemanticCanaryHelp,
  resolveCanaryAssetSemanticRepairConfig,
  type AssetSemanticCanaryCliOptions
} from './asset-semantic-canary-options.js';
import { buildSmallArtLibraryCanaryDryRunSummary, isSmallArtLibraryFixtureRoot } from './asset-semantic-small-art-library-dry-run.js';

const workspace = new LocalWorkspaceService(process.cwd());

async function main(): Promise<void> {
  const parsedOptions = parseAssetSemanticCanaryArgs(process.argv.slice(2));
  if (parsedOptions === 'help') {
    printAssetSemanticCanaryHelp();
    process.exit(0);
  }

  const options = parsedOptions;
  const outputDir = join(options.outputRoot, options.timestamp);
  if (await isSmallArtLibraryFixtureRoot(options.fixturePath)) {
    const summary = await buildSmallArtLibraryCanaryDryRunSummary({
      fixtureRoot: options.fixturePath,
      outputDir,
      repairEnabled: resolveCanaryAssetSemanticRepairConfig(options).enabled,
      createdAt: new Date().toISOString()
    });

    await writeCanarySummary(outputDir, summary);
    printCanarySummary(outputDir, summary);
    process.exitCode = summary.exitCode;
    return;
  }

  const fixture = AssetSemanticCanaryBriefsSchema.parse(JSON.parse(await readFile(options.fixturePath, 'utf8')));
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
  const assetSemanticRepairConfig = resolveCanaryAssetSemanticRepairConfig(options);
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
        executions.push(await runCanaryCase(brief, index, options, assetSemanticRepairConfig));
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
    repairEnabled: assetSemanticRepairConfig.enabled,
    createdAt,
    executions
  });

  await writeCanarySummary(outputDir, summary);
  printCanarySummary(outputDir, summary);

  process.exitCode = summary.exitCode;
}

async function writeCanarySummary(outputDir: string, summary: ReturnType<typeof buildAssetSemanticCanarySummary> | Awaited<ReturnType<typeof buildSmallArtLibraryCanaryDryRunSummary>>): Promise<void> {
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await writeFile(join(outputDir, 'summary.md'), renderAssetSemanticCanaryMarkdown(summary), 'utf8');
}

function printCanarySummary(outputDir: string, summary: ReturnType<typeof buildAssetSemanticCanarySummary> | Awaited<ReturnType<typeof buildSmallArtLibraryCanaryDryRunSummary>>): void {
  console.log(`Asset semantic canary summary written to ${outputDir}`);
  console.log(`runnable=${summary.runnable} skipped=${summary.skipped} experimental=${summary.experimental} passed=${summary.passed} failed=${summary.failed}`);
  console.log(`repair.enabled=${summary.repair.enabled} repair.attemptedCount=${summary.repair.attemptedCount} repair.failedCount=${summary.repair.failedCount}`);
  if (summary.fixture?.kind === 'small_art_library') {
    console.log(`fixture.kind=${summary.fixture.kind} fixture.identity=${summary.fixture.identity} fixture.assetCount=${summary.fixture.assetCount ?? 0}`);
  }
}

async function runCanaryCase(
  brief: AssetSemanticCanaryBrief,
  index: number,
  options: AssetSemanticCanaryCliOptions,
  assetSemanticRepairConfig: AssetSemanticRepairConfig
): Promise<AssetSemanticCanaryExecution> {
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
      new PlaywrightQaRunnerService(workspace, new PlayableQaGateService()),
      assetSemanticRepairConfig
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
