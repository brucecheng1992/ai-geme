import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { Browser, Page } from 'playwright';

import { TelemetryEventSchema } from '../../../../packages/runtime-core/src/index.js';
import type { QaBrowserResult, QaBrowserRunner, QaFailureCode, QaGenre, QaRequiredEvents, QaVisualMetrics, RunQaInput } from './qa.types.js';

const GENRE_KEYS: Record<QaGenre, string[]> = {
  collector: ['Enter', 'ArrowRight', 'r'],
  dodger: ['Enter', 'ArrowRight', 'h', 'r'],
  shooter: ['Enter', ' ', 'ArrowRight', 'r']
};

export const runPlaywrightQaBrowser: QaBrowserRunner = async (input, requiredEvents) => {
  const { chromium } = await import('playwright');
  const consoleErrors: string[] = [];
  const timeoutMs = input.timeoutMs ?? 30_000;
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => {
      consoleErrors.push(error.message);
    });

    try {
      const response = await page.goto(withQaParams(input.previewUrl, input.seed ?? 'golden'), { waitUntil: 'networkidle', timeout: timeoutMs });
      if (response === null || response.status() !== 200) {
        return failedBrowserResult('PREVIEW_LOAD_FAILED', consoleErrors, `Preview returned ${response?.status() ?? 'no response'}.`);
      }
    } catch (error) {
      return failedBrowserResult('PREVIEW_LOAD_FAILED', consoleErrors, error);
    }

    const visualGate = await evaluateVisualRenderGate(page, browser, input.screenshotPath);
    if (!visualGate.ok) {
      return {
        ok: false,
        visual_ok: false,
        interaction_ok: false,
        observed_events: [],
        telemetry: [],
        console_errors: consoleErrors,
        failure_code: visualGate.failure_code,
        message: visualGate.message,
        screenshot_path: visualGate.screenshot_path,
        visual_metrics: visualGate.visual_metrics
      };
    }

    try {
      await page.waitForFunction(
        () => {
          const target = globalThis as BrowserQaGlobal;
          return Boolean(target.__GAME_QA__ && target.__GAME_TELEMETRY__);
        },
        undefined,
        { timeout: timeoutMs }
      );
    } catch (error) {
      return failedInteractionResult(consoleErrors.length > 0 ? 'FATAL_CONSOLE_ERROR' : 'QA_BRIDGE_MISSING', consoleErrors, visualGate, error);
    }

    const assetAssertion = await verifyRuntimeAssetsLoaded(page, input.genre);
    if (!assetAssertion.ok) {
      return failedInteractionResult('ASSET_LOAD_FAILED', consoleErrors, visualGate, assetAssertion.message);
    }

    const interactionAssertion = await runDeterministicInteraction(page, input.genre, timeoutMs);

    await page
      .waitForFunction(
        () => {
          const qa = (globalThis as BrowserQaGlobal).__GAME_QA__;
          if (!qa) {
            return false;
          }
          return qa.telemetry().some((event) => {
            if (typeof event !== 'object' || event === null || !('type' in event)) {
              return false;
            }
            return event.type === 'game.restarted';
          });
        },
        undefined,
        { timeout: timeoutMs }
      )
      .catch(() => undefined);

    const result = await page.evaluate(() => {
      const qa = (globalThis as BrowserQaGlobal).__GAME_QA__;
      return {
        telemetry: qa?.telemetry() ?? [],
        snapshot: qa?.snapshot()
      };
    });
    const telemetry = result.telemetry.map((event) => TelemetryEventSchema.parse(event));
    const gateReady = requiredTelemetryObserved(telemetry.map((event) => event.type), requiredEvents);
    const interactionReady = consoleErrors.length === 0 && gateReady && interactionAssertion.ok;

    return {
      ok: interactionReady && visualGate.ok,
      visual_ok: visualGate.ok,
      interaction_ok: interactionReady,
      observed_events: telemetry.map((event) => event.type),
      telemetry,
      snapshot: result.snapshot,
      console_errors: consoleErrors,
      failure_code: consoleErrors.length > 0 ? 'FATAL_CONSOLE_ERROR' : !gateReady ? 'REQUIRED_TELEMETRY_MISSING' : interactionAssertion.ok ? undefined : 'QA_RUNNER_FAILED',
      message: interactionAssertion.message,
      screenshot_path: visualGate.screenshot_path,
      visual_metrics: visualGate.visual_metrics
    };
  } catch (error) {
    return {
      ok: false,
      visual_ok: false,
      interaction_ok: false,
      observed_events: [],
      telemetry: [],
      console_errors: consoleErrors,
      failure_code: consoleErrors.length > 0 ? 'FATAL_CONSOLE_ERROR' : 'PREVIEW_LOAD_FAILED',
      message: error instanceof Error ? error.message : 'Playwright QA failed'
    };
  } finally {
    await browser.close();
  }
};

function failedBrowserResult(failureCode: QaBrowserResult['failure_code'], consoleErrors: string[], error: unknown): QaBrowserResult {
  return {
    ok: false,
    visual_ok: false,
    interaction_ok: false,
    observed_events: [],
    telemetry: [],
    console_errors: consoleErrors,
    failure_code: failureCode,
    message: error instanceof Error ? error.message : 'Playwright QA failed'
  };
}

function failedInteractionResult(
  failureCode: QaBrowserResult['failure_code'],
  consoleErrors: string[],
  visualGate: Extract<VisualGateResult, { ok: true }>,
  error: unknown
): QaBrowserResult {
  return {
    ok: false,
    visual_ok: true,
    interaction_ok: false,
    observed_events: [],
    telemetry: [],
    console_errors: consoleErrors,
    failure_code: failureCode,
    message: errorMessage(error, 'Playwright interaction QA failed'),
    screenshot_path: visualGate.screenshot_path,
    visual_metrics: visualGate.visual_metrics
  };
}

async function evaluateVisualRenderGate(
  page: Page,
  browser: Browser,
  screenshotPath: string | undefined
): Promise<VisualGateResult> {
  const canvas = await page.$('canvas');
  if (canvas === null) {
    return { ok: false, failure_code: 'CANVAS_NOT_FOUND', message: 'Preview did not render a canvas element.' };
  }

  const canvasBox = await canvas.boundingBox();
  if (canvasBox === null) {
    return { ok: false, failure_code: 'CANVAS_NOT_FOUND', message: 'Preview did not render a canvas element.' };
  }

  if (canvasBox.width <= 0 || canvasBox.height <= 0) {
    return { ok: false, failure_code: 'CANVAS_ZERO_SIZE', message: `Canvas has zero-size bounds: ${canvasBox.width}x${canvasBox.height}.` };
  }

  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const { requestAnimationFrame: waitForFrame } = globalThis as unknown as { requestAnimationFrame: (callback: () => void) => number };
        waitForFrame(() => waitForFrame(() => resolve()));
      })
  );
  await page.waitForTimeout(250);
  const screenshot = await canvas.screenshot();

  if (screenshotPath !== undefined) {
    await mkdir(dirname(screenshotPath), { recursive: true });
    await writeFile(screenshotPath, screenshot);
  }

  const metrics = await analyzeScreenshot(browser, screenshot, canvasBox.width, canvasBox.height);
  const hasVisibleFrame =
    metrics.transparent_pixel_ratio < 0.98 && metrics.non_background_pixel_ratio >= 0.01 && metrics.varied_pixel_ratio >= 0.005;

  if (!hasVisibleFrame) {
    return {
      ok: false,
      failure_code: 'PREVIEW_BLANK_SCREEN',
      message: 'Preview screenshot is blank or has too few varied pixels.',
      screenshot_path: screenshotPath,
      visual_metrics: metrics
    };
  }

  return { ok: true, screenshot_path: screenshotPath, visual_metrics: metrics };
}

async function analyzeScreenshot(
  browser: Browser,
  screenshot: Buffer,
  canvasWidth: number,
  canvasHeight: number
): Promise<QaVisualMetrics> {
  const page = await browser.newPage();
  try {
    return await page.evaluate(
      async ({ dataUrl, canvasWidth, canvasHeight }) => {
        const { Image: BrowserImage, document: browserDocument } = globalThis as unknown as BrowserImageEnvironment;
        const image = new BrowserImage();
        image.src = dataUrl;
        await image.decode();

        const canvas = browserDocument.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        if (context === null) {
          throw new Error('Unable to create screenshot analysis canvas.');
        }

        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let transparentPixels = 0;
        let nonWhitePixels = 0;
        let nonBlackPixels = 0;
        let variedPixels = 0;
        const first = [pixels[0] ?? 0, pixels[1] ?? 0, pixels[2] ?? 0, pixels[3] ?? 0];

        for (let index = 0; index < pixels.length; index += 4) {
          const red = pixels[index] ?? 0;
          const green = pixels[index + 1] ?? 0;
          const blue = pixels[index + 2] ?? 0;
          const alpha = pixels[index + 3] ?? 0;

          if (alpha <= 8) {
            transparentPixels += 1;
          }

          if (!(red >= 248 && green >= 248 && blue >= 248 && alpha >= 248)) {
            nonWhitePixels += 1;
          }

          if (!(red <= 8 && green <= 8 && blue <= 8 && alpha >= 248)) {
            nonBlackPixels += 1;
          }

          if (Math.abs(red - first[0]) + Math.abs(green - first[1]) + Math.abs(blue - first[2]) + Math.abs(alpha - first[3]) > 24) {
            variedPixels += 1;
          }
        }

        const totalPixels = Math.max(1, pixels.length / 4);
        return {
          canvas_width: canvasWidth,
          canvas_height: canvasHeight,
          screenshot_width: canvas.width,
          screenshot_height: canvas.height,
          non_background_pixel_ratio: Math.min(nonWhitePixels, nonBlackPixels) / totalPixels,
          varied_pixel_ratio: variedPixels / totalPixels,
          transparent_pixel_ratio: transparentPixels / totalPixels
        };
      },
      {
        dataUrl: `data:image/png;base64,${screenshot.toString('base64')}`,
        canvasWidth,
        canvasHeight
      }
    );
  } finally {
    await page.close();
  }
}

type VisualGateResult =
  | {
      ok: true;
      screenshot_path?: string;
      visual_metrics: QaVisualMetrics;
    }
  | {
      ok: false;
      failure_code: QaFailureCode;
      message: string;
      screenshot_path?: string;
      visual_metrics?: QaVisualMetrics;
    };

type BrowserImageEnvironment = {
  Image: new () => {
    src: string;
    naturalWidth: number;
    naturalHeight: number;
    decode(): Promise<void>;
  };
  document: {
    createElement(name: 'canvas'): BrowserAnalysisCanvas;
  };
};

type BrowserAnalysisCanvas = {
  width: number;
  height: number;
  getContext(type: '2d'): BrowserAnalysisContext | null;
};

type BrowserAnalysisContext = {
  drawImage(image: unknown, x: number, y: number): void;
  getImageData(x: number, y: number, width: number, height: number): { data: ArrayLike<number> };
};

function requiredTelemetryObserved(observedEvents: string[], requiredEvents: QaRequiredEvents): boolean {
  const observed = new Set(observedEvents);
  return requiredEvents.all.every((event) => observed.has(event)) && requiredEvents.any_groups.every((group) => group.some((event) => observed.has(event)));
}

async function runDeterministicInteraction(page: Page, genre: QaGenre, timeoutMs: number): Promise<{ ok: boolean; message?: string }> {
  if (genre !== 'shooter') {
    if (genre === 'dodger') {
      const autoProgress = await verifyDodgerAutoProgress(page);
      if (!autoProgress.ok) {
        return autoProgress;
      }

      const movementAssertion = await verifyDodgerMovement(page);
      if (!movementAssertion.ok) {
        return movementAssertion;
      }

      const runtimePlanAssertion = await verifyDodgerRuntimePlanSpawns(page);
      if (!runtimePlanAssertion.ok) {
        return runtimePlanAssertion;
      }
    }

    for (const key of GENRE_KEYS[genre]) {
      await page.keyboard.press(key);
    }
    return { ok: true };
  }

  await page.keyboard.press('Enter');
  const movementAssertion = await verifyShooterMovement(page);
  if (!movementAssertion.ok) {
    await page.keyboard.press('r');
    return movementAssertion;
  }

  const progressed = await fireUntilShooterProgress(page, timeoutMs);
  if (!progressed) {
    await page.keyboard.press('r');
    return { ok: false, message: 'Shooter QA expected repeated firing to produce enemy.cleared or score.changed.' };
  }

  const runtimePlanAssertion = await verifyShooterRuntimePlanEnemyWave(page);
  await page.keyboard.press('r');

  return runtimePlanAssertion;
}

async function readQaSnapshot(page: Page): Promise<unknown> {
  return await page.evaluate(() => (globalThis as BrowserQaGlobal).__GAME_QA__?.snapshot());
}

async function verifyRuntimeAssetsLoaded(page: Page, genre: QaGenre): Promise<{ ok: boolean; message?: string }> {
  if (genre !== 'dodger') {
    return { ok: true };
  }

  const telemetry = await page.evaluate(() => {
    const target = (globalThis as BrowserQaGlobal).__GAME_TELEMETRY__;
    if (typeof target !== 'object' || target === null || !('assets' in target)) {
      return undefined;
    }
    return (target as { assets?: unknown }).assets;
  });

  const assets = readAssetTelemetry(telemetry);
  if (assets === undefined) {
    return { ok: false, message: 'Dodger QA expected __GAME_TELEMETRY__.assets from the manifest loader.' };
  }

  if (!assets.manifestLoaded) {
    return { ok: false, message: 'Dodger QA expected asset manifest telemetry to report manifestLoaded=true.' };
  }

  if (assets.required.length === 0) {
    return { ok: false, message: 'Dodger QA expected at least one required runtime asset.' };
  }

  const loaded = new Set(assets.loaded);
  const missingRequired = assets.required.filter((id) => !loaded.has(id));
  if (missingRequired.length > 0) {
    return { ok: false, message: `Dodger QA expected required assets to load: ${missingRequired.join(', ')}` };
  }

  const failed = new Set(assets.failed);
  const failedRequired = assets.required.filter((id) => failed.has(id));
  if (failedRequired.length > 0) {
    return { ok: false, message: `Dodger QA observed failed required assets: ${failedRequired.join(', ')}` };
  }

  if (assets.missing.length > 0) {
    return { ok: false, message: `Dodger QA observed missing manifest assets: ${assets.missing.join(', ')}` };
  }

  if (assets.missingRequiredRoles.length > 0) {
    return { ok: false, message: `Dodger QA observed missing required asset roles: ${assets.missingRequiredRoles.join(', ')}` };
  }

  return { ok: true };
}

async function verifyDodgerAutoProgress(page: Page): Promise<{ ok: boolean; message?: string }> {
  const beforeFrame = readSnapshotFrame(await readQaSnapshot(page));
  await page.waitForTimeout(1200);
  const afterFrame = readSnapshotFrame(await readQaSnapshot(page));

  if (beforeFrame !== undefined && afterFrame !== undefined && afterFrame > beforeFrame) {
    return { ok: true };
  }

  return { ok: false, message: 'Dodger QA expected survival frame to advance automatically after preview load.' };
}

async function verifyDodgerMovement(page: Page): Promise<{ ok: boolean; message?: string }> {
  const beforeMove = await readQaSnapshot(page);
  await page.keyboard.press('ArrowDown');
  const afterMove = await readQaSnapshot(page);
  if (!movedVertically(beforeMove, afterMove, 20)) {
    await page.keyboard.press('ArrowUp');
    const afterFallbackMove = await readQaSnapshot(page);
    if (!movedVertically(afterMove, afterFallbackMove, 20)) {
      return { ok: false, message: 'Dodger QA expected player.y to change after pressing ArrowDown or ArrowUp.' };
    }
  }

  const healthAfterMove = readSnapshotHealth(await readQaSnapshot(page));
  await page.waitForTimeout(250);
  const healthAfterHazardPass = readSnapshotHealth(await readQaSnapshot(page));
  if (healthAfterMove !== undefined && healthAfterHazardPass !== undefined && healthAfterHazardPass < healthAfterMove) {
    return { ok: false, message: 'Dodger QA expected a lane dodge to avoid immediate hazard damage.' };
  }

  return { ok: true };
}

async function verifyDodgerRuntimePlanSpawns(page: Page): Promise<{ ok: boolean; message?: string }> {
  const snapshot = await readQaSnapshot(page);
  const difficultyPlan = readSnapshotDodgerDifficultyPlan(snapshot);
  if (difficultyPlan.kind === 'malformed') {
    return { ok: false, message: difficultyPlan.message };
  }
  if (difficultyPlan.kind === 'runtime_plan') {
    const difficultyAssertion = await verifyDodgerRuntimePlanDifficulty(page, difficultyPlan);
    if (!difficultyAssertion.ok) {
      return difficultyAssertion;
    }
  }

  for (const entityKind of ['hazard', 'collectible'] as const) {
    const spawnPlan = readSnapshotDodgerSpawnPlan(snapshot, entityKind);
    if (spawnPlan.kind === 'absent' || spawnPlan.kind === 'not_runtime_plan') {
      continue;
    }

    if (spawnPlan.kind === 'malformed') {
      return { ok: false, message: spawnPlan.message };
    }

    const eventType = entityKind === 'hazard' ? 'hazard.spawned' : 'item.spawned';
    const observedRuntimePlanSpawn = await page
      .waitForFunction(
        ({ eventType: expectedEventType, entityKind: expectedEntityKind, entityId, strategy, maxActive, count, intervalMs, laneCount }) => {
          const qa = (globalThis as BrowserQaGlobal).__GAME_QA__;
          return (
            qa?.telemetry().some((event) => {
              if (typeof event !== 'object' || event === null || !('type' in event) || event.type !== expectedEventType) {
                return false;
              }

              const payload = (event as { payload?: unknown }).payload;
              if (typeof payload !== 'object' || payload === null) {
                return false;
              }

              const observed = payload as {
                entityId?: unknown;
                strategy?: unknown;
                source?: unknown;
                maxActive?: unknown;
                count?: unknown;
                intervalMs?: unknown;
                effectiveIntervalMs?: unknown;
                laneCount?: unknown;
                difficultyLevel?: unknown;
                difficultySource?: unknown;
                rampProgress?: unknown;
                speedMultiplier?: unknown;
                spawnIntervalMultiplier?: unknown;
              };
              const laneMatches = laneCount === undefined || observed.laneCount === laneCount;
              return (
                observed.source === 'runtime_plan' &&
                observed.entityId === entityId &&
                observed.strategy === strategy &&
                observed.maxActive === maxActive &&
                observed.count === count &&
                observed.intervalMs === intervalMs &&
                laneMatches
              );
            }) === true
          );
        },
        {
          eventType,
          entityKind,
          entityId: spawnPlan.entityId,
          strategy: spawnPlan.strategy,
          maxActive: spawnPlan.maxActive,
          count: spawnPlan.count,
          intervalMs: spawnPlan.intervalMs,
          laneCount: spawnPlan.laneCount
        },
        { timeout: 1500 }
      )
      .then(() => true)
      .catch(() => false);

    if (!observedRuntimePlanSpawn) {
      return { ok: false, message: `Dodger QA expected runtime_plan ${entityKind} spawn telemetry to match the snapshot spawnPlan.` };
    }
  }

  return { ok: true };
}

async function verifyDodgerRuntimePlanDifficulty(
  page: Page,
  difficulty: Extract<DodgerDifficultyPlanRead, { kind: 'runtime_plan' }>
): Promise<{ ok: boolean; message?: string }> {
  const observedRuntimePlanDifficulty = await page
    .waitForFunction(
      ({ level, speedMultiplierMin, speedMultiplierMax, spawnIntervalMultiplierMin, spawnIntervalMultiplierMax }) => {
        const qa = (globalThis as BrowserQaGlobal).__GAME_QA__;
        return (
          qa?.telemetry().some((event) => {
            if (typeof event !== 'object' || event === null || !('type' in event) || event.type !== 'hazard.spawned') {
              return false;
            }

            const payload = (event as { payload?: unknown }).payload;
            if (typeof payload !== 'object' || payload === null) {
              return false;
            }

            const observed = payload as {
              difficultyLevel?: unknown;
              difficultySource?: unknown;
              rampProgress?: unknown;
              speedMultiplier?: unknown;
              spawnIntervalMultiplier?: unknown;
              effectiveIntervalMs?: unknown;
            };
            return (
              observed.difficultyLevel === level &&
              observed.difficultySource === 'runtime_plan' &&
              typeof observed.rampProgress === 'number' &&
              observed.rampProgress >= 0 &&
              observed.rampProgress <= 1 &&
              typeof observed.speedMultiplier === 'number' &&
              observed.speedMultiplier >= speedMultiplierMin &&
              observed.speedMultiplier <= speedMultiplierMax &&
              typeof observed.spawnIntervalMultiplier === 'number' &&
              observed.spawnIntervalMultiplier >= spawnIntervalMultiplierMin &&
              observed.spawnIntervalMultiplier <= spawnIntervalMultiplierMax &&
              typeof observed.effectiveIntervalMs === 'number' &&
              observed.effectiveIntervalMs >= 200
            );
          }) === true
        );
      },
      difficulty,
      { timeout: 1500 }
    )
    .then(() => true)
    .catch(() => false);

  return observedRuntimePlanDifficulty
    ? { ok: true }
    : { ok: false, message: 'Dodger QA expected runtime_plan difficulty_curve metadata on hazard spawn telemetry.' };
}

async function verifyShooterMovement(page: Page): Promise<{ ok: boolean; message?: string }> {
  if (await tryHorizontalMove(page, 'ArrowRight', 12)) {
    return { ok: true };
  }

  if (await tryHorizontalMove(page, 'ArrowLeft', 12)) {
    return { ok: true };
  }

  return { ok: false, message: 'Shooter QA expected player.x to change after holding ArrowRight or ArrowLeft.' };
}

async function tryHorizontalMove(page: Page, key: 'ArrowLeft' | 'ArrowRight', minDelta: number): Promise<boolean> {
  const beforeMove = await readQaSnapshot(page);
  await page.keyboard.down(key);
  await page.waitForTimeout(300);
  await page.keyboard.up(key);
  const afterMove = await readQaSnapshot(page);
  return movedHorizontally(beforeMove, afterMove, minDelta);
}

async function fireUntilShooterProgress(page: Page, timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    await page.keyboard.press(' ');
    const observed = await page
      .waitForFunction(
        () => {
          const qa = (globalThis as BrowserQaGlobal).__GAME_QA__;
          return (
            qa?.telemetry().some((event) => {
              if (typeof event !== 'object' || event === null || !('type' in event)) {
                return false;
              }

              return event.type === 'enemy.cleared' || event.type === 'score.changed';
            }) === true
          );
        },
        undefined,
        { timeout: Math.min(600, Math.max(100, timeoutMs - (Date.now() - startedAt))) }
      )
      .then(() => true)
      .catch(() => false);

    if (observed) {
      return true;
    }

    await page.waitForTimeout(350);
  }

  return false;
}

async function verifyShooterRuntimePlanEnemyWave(page: Page): Promise<{ ok: boolean; message?: string }> {
  const snapshot = await readQaSnapshot(page);
  const enemyWavePlan = readSnapshotShooterEnemyWavePlan(snapshot);
  if (enemyWavePlan.kind === 'absent' || enemyWavePlan.kind === 'not_runtime_plan') {
    return { ok: true };
  }

  if (enemyWavePlan.kind === 'malformed') {
    return { ok: false, message: enemyWavePlan.message };
  }

  const activeCount = readSnapshotEnemiesActive(snapshot);
  if (activeCount !== undefined && activeCount > enemyWavePlan.maxActive) {
    return {
      ok: false,
      message: `Shooter QA expected runtime_plan enemyWavePlan maxActive ${enemyWavePlan.maxActive}, observed ${activeCount} active enemies.`
    };
  }

  const observedRuntimePlanHit = await page
    .waitForFunction(
      ({ entityId, strategy, speedMultiplier }) => {
        const qa = (globalThis as BrowserQaGlobal).__GAME_QA__;
        return (
          qa?.telemetry().some((event) => {
            if (
              typeof event !== 'object' ||
              event === null ||
              !('type' in event) ||
              (event.type !== 'enemy.hit' && event.type !== 'enemy.cleared')
            ) {
              return false;
            }

            const payload = (event as { payload?: unknown }).payload;
            if (typeof payload !== 'object' || payload === null) {
              return false;
            }

            const observed = payload as {
              entityId?: unknown;
              waveSource?: unknown;
              strategy?: unknown;
              speedMultiplier?: unknown;
            };
            return (
              observed.waveSource === 'runtime_plan' &&
              observed.entityId === entityId &&
              observed.strategy === strategy &&
              observed.speedMultiplier === speedMultiplier
            );
          }) === true
        );
      },
      {
        entityId: enemyWavePlan.entityId,
        strategy: enemyWavePlan.strategy,
        speedMultiplier: enemyWavePlan.speedMultiplier
      },
      { timeout: 1500 }
    )
    .then(() => true)
    .catch(() => false);

  return observedRuntimePlanHit
    ? { ok: true }
    : { ok: false, message: 'Shooter QA expected runtime_plan enemy wave hit or clear telemetry to match the snapshot enemyWavePlan.' };
}

function movedHorizontally(before: unknown, after: unknown, minDelta: number): boolean {
  const beforePlayer = readSnapshotPlayer(before);
  const afterPlayer = readSnapshotPlayer(after);

  if (beforePlayer === undefined || afterPlayer === undefined) {
    return false;
  }

  return Math.abs(afterPlayer.x - beforePlayer.x) >= minDelta;
}

function movedVertically(before: unknown, after: unknown, minDelta: number): boolean {
  const beforePlayer = readSnapshotPlayer(before);
  const afterPlayer = readSnapshotPlayer(after);

  if (beforePlayer === undefined || afterPlayer === undefined) {
    return false;
  }

  return Math.abs(afterPlayer.y - beforePlayer.y) >= minDelta;
}

function readSnapshotPlayer(snapshot: unknown): { x: number; y: number } | undefined {
  if (typeof snapshot !== 'object' || snapshot === null || !('player' in snapshot)) {
    return undefined;
  }

  const player = (snapshot as { player?: unknown }).player;
  if (typeof player !== 'object' || player === null || !('x' in player) || !('y' in player)) {
    return undefined;
  }

  const { x, y } = player as { x?: unknown; y?: unknown };
  return typeof x === 'number' && typeof y === 'number' ? { x, y } : undefined;
}

function readSnapshotFrame(snapshot: unknown): number | undefined {
  if (typeof snapshot !== 'object' || snapshot === null || !('frame' in snapshot)) {
    return undefined;
  }

  const { frame } = snapshot as { frame?: unknown };
  return typeof frame === 'number' ? frame : undefined;
}

function readSnapshotHealth(snapshot: unknown): number | undefined {
  if (typeof snapshot !== 'object' || snapshot === null || !('health' in snapshot)) {
    return undefined;
  }

  const { health } = snapshot as { health?: unknown };
  return typeof health === 'number' ? health : undefined;
}

function readSnapshotEnemiesActive(snapshot: unknown): number | undefined {
  if (typeof snapshot !== 'object' || snapshot === null || !('enemiesActive' in snapshot)) {
    return undefined;
  }

  const { enemiesActive } = snapshot as { enemiesActive?: unknown };
  return typeof enemiesActive === 'number' ? enemiesActive : undefined;
}

type DodgerSpawnPlanRead =
  | { kind: 'absent' }
  | { kind: 'not_runtime_plan' }
  | { kind: 'malformed'; message: string }
  | { kind: 'runtime_plan'; entityId: string; strategy: string; source: 'runtime_plan'; maxActive: number; count: number; intervalMs: number; laneCount?: number };

type DodgerDifficultyPlanRead =
  | { kind: 'absent' }
  | { kind: 'not_runtime_plan' }
  | { kind: 'malformed'; message: string }
  | {
      kind: 'runtime_plan';
      level: 'easy' | 'normal';
      speedMultiplierMin: number;
      speedMultiplierMax: number;
      spawnIntervalMultiplierMin: number;
      spawnIntervalMultiplierMax: number;
    };

type ShooterEnemyWavePlanRead =
  | { kind: 'absent' }
  | { kind: 'not_runtime_plan' }
  | { kind: 'malformed'; message: string }
  | {
      kind: 'runtime_plan';
      entityId: string;
      strategy: 'right_edge_wave';
      source: 'runtime_plan';
      count: number;
      maxActive: number;
      intervalMs: number;
      speedMultiplier: number;
    };

function readSnapshotShooterEnemyWavePlan(snapshot: unknown): ShooterEnemyWavePlanRead {
  if (typeof snapshot !== 'object' || snapshot === null || !('enemyWavePlan' in snapshot)) {
    return { kind: 'absent' };
  }

  const enemyWavePlan = (snapshot as { enemyWavePlan?: unknown }).enemyWavePlan;
  if (typeof enemyWavePlan !== 'object' || enemyWavePlan === null) {
    return { kind: 'malformed', message: 'Shooter QA expected runtime_plan enemyWavePlan to be an object.' };
  }

  const { derivedFrom, entityId, strategy, source, count, maxActive, intervalMs, speedMultiplier } = enemyWavePlan as Record<string, unknown>;
  if (source !== 'runtime_plan') {
    return { kind: 'not_runtime_plan' };
  }

  if (
    derivedFrom !==
      'entities.enemy.id,entities.enemy.count,entities.enemy.health,entities.enemy.movement.speed_px_per_sec,game.difficulty,game.target_play_time_sec' ||
    typeof entityId !== 'string' ||
    strategy !== 'right_edge_wave' ||
    typeof count !== 'number' ||
    typeof maxActive !== 'number' ||
    typeof intervalMs !== 'number' ||
    typeof speedMultiplier !== 'number'
  ) {
    return {
      kind: 'malformed',
      message:
        'Shooter QA expected runtime_plan enemyWavePlan to include derivedFrom, entityId, strategy, count, maxActive, intervalMs, and speedMultiplier.'
    };
  }

  return { kind: 'runtime_plan', entityId, strategy, source, count, maxActive, intervalMs, speedMultiplier };
}

function readSnapshotDodgerDifficultyPlan(snapshot: unknown): DodgerDifficultyPlanRead {
  if (typeof snapshot !== 'object' || snapshot === null || !('difficultyPlan' in snapshot)) {
    return { kind: 'absent' };
  }

  const difficultyPlan = (snapshot as { difficultyPlan?: unknown }).difficultyPlan;
  if (typeof difficultyPlan !== 'object' || difficultyPlan === null) {
    return { kind: 'malformed', message: 'Dodger QA expected runtime_plan difficultyPlan to be an object.' };
  }

  const {
    level,
    source,
    derivedFrom,
    rampDurationMs,
    rampProgress,
    speedMultiplierStart,
    speedMultiplierEnd,
    speedMultiplier,
    spawnIntervalMultiplierStart,
    spawnIntervalMultiplierEnd,
    spawnIntervalMultiplier
  } = difficultyPlan as Record<string, unknown>;

  if (source !== 'runtime_plan') {
    return { kind: 'not_runtime_plan' };
  }

  if (
    (level !== 'easy' && level !== 'normal') ||
    derivedFrom !== 'game.difficulty,game.target_play_time_sec' ||
    typeof rampDurationMs !== 'number' ||
    typeof rampProgress !== 'number' ||
    rampProgress < 0 ||
    rampProgress > 1 ||
    typeof speedMultiplierStart !== 'number' ||
    typeof speedMultiplierEnd !== 'number' ||
    typeof speedMultiplier !== 'number' ||
    typeof spawnIntervalMultiplierStart !== 'number' ||
    typeof spawnIntervalMultiplierEnd !== 'number' ||
    typeof spawnIntervalMultiplier !== 'number'
  ) {
    return {
      kind: 'malformed',
      message:
        'Dodger QA expected runtime_plan difficultyPlan to include level, derivedFrom, rampDurationMs, rampProgress, speed multipliers, and spawn interval multipliers.'
    };
  }

  const speedMultiplierMin = Math.min(speedMultiplierStart, speedMultiplierEnd);
  const speedMultiplierMax = Math.max(speedMultiplierStart, speedMultiplierEnd);
  const spawnIntervalMultiplierMin = Math.min(spawnIntervalMultiplierStart, spawnIntervalMultiplierEnd);
  const spawnIntervalMultiplierMax = Math.max(spawnIntervalMultiplierStart, spawnIntervalMultiplierEnd);

  if (
    speedMultiplier < speedMultiplierMin ||
    speedMultiplier > speedMultiplierMax ||
    spawnIntervalMultiplier < spawnIntervalMultiplierMin ||
    spawnIntervalMultiplier > spawnIntervalMultiplierMax
  ) {
    return { kind: 'malformed', message: 'Dodger QA expected runtime_plan difficultyPlan current multipliers to stay inside curve bounds.' };
  }

  return {
    kind: 'runtime_plan',
    level,
    speedMultiplierMin,
    speedMultiplierMax,
    spawnIntervalMultiplierMin,
    spawnIntervalMultiplierMax
  };
}

function readSnapshotDodgerSpawnPlan(snapshot: unknown, entityKind: 'hazard' | 'collectible'): DodgerSpawnPlanRead {
  if (typeof snapshot !== 'object' || snapshot === null || !('spawnPlan' in snapshot)) {
    return { kind: 'absent' };
  }

  const spawnPlan = (snapshot as { spawnPlan?: unknown }).spawnPlan;
  if (typeof spawnPlan !== 'object' || spawnPlan === null || !(entityKind in spawnPlan)) {
    return { kind: 'absent' };
  }

  const plan = (spawnPlan as { hazard?: unknown; collectible?: unknown })[entityKind];
  if (typeof plan !== 'object' || plan === null) {
    return { kind: 'malformed', message: `Dodger QA expected runtime_plan spawnPlan.${entityKind} to be an object.` };
  }

  const { entityId, strategy, source, maxActive, count, intervalMs, laneCount } = plan as {
    entityId?: unknown;
    strategy?: unknown;
    source?: unknown;
    maxActive?: unknown;
    count?: unknown;
    intervalMs?: unknown;
    laneCount?: unknown;
  };
  if (source !== 'runtime_plan') {
    return { kind: 'not_runtime_plan' };
  }

  if (entityKind === 'hazard' && strategy !== 'right_edge_wave') {
    return { kind: 'malformed', message: 'Dodger QA expected runtime_plan hazard strategy to be right_edge_wave.' };
  }

  if (entityKind === 'collectible' && (strategy !== 'fixed_positions' || laneCount !== undefined)) {
    return { kind: 'malformed', message: 'Dodger QA expected runtime_plan collectible strategy to be fixed_positions without laneCount.' };
  }

  return typeof entityId === 'string' &&
    typeof strategy === 'string' &&
    typeof maxActive === 'number' &&
    typeof count === 'number' &&
    typeof intervalMs === 'number' &&
    (entityKind === 'collectible' || typeof laneCount === 'number')
    ? { kind: 'runtime_plan', entityId, strategy, source, maxActive, count, intervalMs, ...(typeof laneCount === 'number' ? { laneCount } : {}) }
    : {
        kind: 'malformed',
        message:
          entityKind === 'hazard'
            ? 'Dodger QA expected runtime_plan spawnPlan.hazard to include entityId, strategy, count, maxActive, intervalMs, and laneCount.'
            : 'Dodger QA expected runtime_plan spawnPlan.collectible to include entityId, strategy, count, maxActive, and intervalMs.'
      };
}

function readAssetTelemetry(value: unknown): RuntimeAssetTelemetry | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const assets = value as Record<string, unknown>;
  if (
    typeof assets.manifestLoaded !== 'boolean' ||
    !Array.isArray(assets.required) ||
    !Array.isArray(assets.loaded) ||
    !Array.isArray(assets.failed) ||
    !Array.isArray(assets.missing) ||
    !Array.isArray(assets.missingRequiredRoles)
  ) {
    return undefined;
  }

  const required = readStringArray(assets.required);
  const loaded = readStringArray(assets.loaded);
  const failed = readStringArray(assets.failed);
  const missing = readStringArray(assets.missing);
  const missingRequiredRoles = readStringArray(assets.missingRequiredRoles);
  if (required === undefined || loaded === undefined || failed === undefined || missing === undefined || missingRequiredRoles === undefined) {
    return undefined;
  }

  return { manifestLoaded: assets.manifestLoaded, required, loaded, failed, missing, missingRequiredRoles };
}

function readStringArray(value: unknown[]): string[] | undefined {
  return value.every((item) => typeof item === 'string') ? (value as string[]) : undefined;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === 'string' && error.length > 0 ? error : fallback;
}

function withQaParams(previewUrl: string, seed: string): string {
  const url = new URL(previewUrl);
  url.searchParams.set('qa', '1');
  url.searchParams.set('seed', seed);
  return url.toString();
}

type BrowserQaGlobal = typeof globalThis & {
  __GAME_QA__?: {
    snapshot(): unknown;
    telemetry(): unknown[];
  };
  __GAME_TELEMETRY__?: unknown;
};

type RuntimeAssetTelemetry = {
  manifestLoaded: boolean;
  required: string[];
  loaded: string[];
  failed: string[];
  missing: string[];
  missingRequiredRoles: string[];
};
