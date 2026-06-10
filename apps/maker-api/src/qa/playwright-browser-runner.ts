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

    for (const key of GENRE_KEYS[input.genre]) {
      await page.keyboard.press(key);
    }

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

    return {
      ok: consoleErrors.length === 0 && gateReady && visualGate.ok,
      visual_ok: visualGate.ok,
      interaction_ok: consoleErrors.length === 0 && gateReady,
      observed_events: telemetry.map((event) => event.type),
      telemetry,
      snapshot: result.snapshot,
      console_errors: consoleErrors,
      failure_code: consoleErrors.length > 0 ? 'FATAL_CONSOLE_ERROR' : undefined,
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
    message: error instanceof Error ? error.message : 'Playwright interaction QA failed',
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
