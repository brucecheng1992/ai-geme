import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { Browser, Page } from 'playwright';

import { TelemetryEventSchema, type TelemetryEvent } from '../../../../packages/runtime-core/src/index.js';
import type {
  QaAssetRuntimeTelemetry,
  QaBrowserResult,
  QaBrowserRunner,
  QaCapabilityRuntimeEvidence,
  QaCapabilityRuntimeExpectation,
  QaCapabilityRuntimeObservedProbe,
  QaFailureCode,
  QaGenre,
  QaRequiredEvents,
  QaRuntimeAuthorityEvidence,
  QaRuntimeAuthorityExpectation,
  QaVisualMetrics,
  RunQaInput
} from './qa.types.js';

const GENRE_KEYS: Record<QaGenre, string[]> = {
  collector: ['Enter', 'ArrowRight', 'r'],
  dodger: ['Enter', 'ArrowRight', 'h', 'r'],
  shooter: ['Enter', ' ', 'ArrowRight', 'r'],
  side_scrolling_run_and_gun: ['Enter', 'ArrowRight', ' ', 'j', 'r']
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
      return failedInteractionResult('ASSET_LOAD_FAILED', consoleErrors, visualGate, assetAssertion.message, assetAssertion.telemetry);
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
    const runtimeAuthority = evaluateRuntimeAuthorityEvidence(result.snapshot, input.expectedRuntimeAuthority);
    const capabilityRuntime = evaluateCapabilityRuntimeEvidence(result.snapshot, telemetry, input.expectedCapabilityRuntime);
    const runtimeAuthorityReady = runtimeAuthority?.status !== 'FAILED';
    const capabilityRuntimeReady = capabilityRuntime?.status !== 'FAILED';
    const interactionReady = consoleErrors.length === 0 && gateReady && interactionAssertion.ok && runtimeAuthorityReady && capabilityRuntimeReady;

    return {
      ok: interactionReady && visualGate.ok,
      visual_ok: visualGate.ok,
      interaction_ok: interactionReady,
      observed_events: telemetry.map((event) => event.type),
      telemetry,
      snapshot: result.snapshot,
      console_errors: consoleErrors,
      failure_code: resolveInteractionFailureCode({ consoleErrors, gateReady, interactionAssertion, runtimeAuthority, capabilityRuntime }),
      message: buildInteractionMessage(interactionAssertion.message, runtimeAuthority, capabilityRuntime),
      screenshot_path: visualGate.screenshot_path,
      visual_metrics: visualGate.visual_metrics,
      asset_runtime: assetAssertion.telemetry,
      runtime_authority: runtimeAuthority,
      capability_runtime: capabilityRuntime
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

export function evaluateRuntimeAuthorityEvidence(
  snapshot: unknown,
  expected: QaRuntimeAuthorityExpectation | undefined
): QaRuntimeAuthorityEvidence | undefined {
  if (expected === undefined) {
    return undefined;
  }

  const observed = readRuntimeAuthoritySnapshot(snapshot);
  if (observed === undefined) {
    return {
      status: 'FAILED',
      expected,
      mismatches: ['snapshot.runtimeAuthority: missing']
    };
  }

  const mismatches = [
    ...compareScalar('authorityBundleRef.artifactKind', observed.authorityBundleRef?.artifactKind, expected.authorityBundleRef.artifactKind),
    ...compareScalar('authorityBundleRef.path', observed.authorityBundleRef?.path, expected.authorityBundleRef.path),
    ...compareScalar('authorityBundleRef.bundleHash', observed.authorityBundleRef?.bundleHash, expected.authorityBundleRef.bundleHash),
    ...compareScalar('activeProfileLockRef.artifactKind', observed.activeProfileLockRef?.artifactKind, expected.activeProfileLockRef.artifactKind),
    ...compareScalar('activeProfileLockRef.path', observed.activeProfileLockRef?.path, expected.activeProfileLockRef.path),
    ...compareScalar('activeProfileLockRef.lockHash', observed.activeProfileLockRef?.lockHash, expected.activeProfileLockRef.lockHash),
    ...compareScalar('profileId', observed.profileId, expected.profileId),
    ...compareScalar('runtimeTemplateId', observed.runtimeTemplateId, expected.runtimeTemplateId),
    ...compareScalar('runtimeTemplateManifestId', observed.runtimeTemplateManifestId, expected.runtimeTemplateManifestId),
    ...compareScalar('qaProfile', observed.qaProfile, expected.qaProfile)
  ];

  return {
    status: mismatches.length === 0 ? 'PASSED' : 'FAILED',
    expected,
    observed,
    mismatches
  };
}

export function evaluateCapabilityRuntimeEvidence(
  snapshot: unknown,
  telemetry: readonly TelemetryEvent[],
  expected: QaCapabilityRuntimeExpectation | undefined
): QaCapabilityRuntimeEvidence | undefined {
  if (expected === undefined) {
    return undefined;
  }

  const observed = collectCapabilityRuntimeObservedProbes(snapshot, telemetry);
  const observedByProbeId = new Map(observed.map((probe) => [probe.probeId, probe]));
  const missingProbeIds: string[] = [];
  const mismatches: string[] = [];

  for (const expectedProbe of expected.requiredProbes) {
    const observedProbe = observedByProbeId.get(expectedProbe.probeId);
    if (observedProbe === undefined) {
      missingProbeIds.push(expectedProbe.probeId);
      mismatches.push(`capabilityRuntime.probes[${expectedProbe.probeId}]: missing`);
      continue;
    }

    mismatches.push(...compareScalar(`capabilityRuntime.probes[${expectedProbe.probeId}].capabilityId`, observedProbe.capabilityId, expectedProbe.capabilityId));
    mismatches.push(...compareScalar(`capabilityRuntime.probes[${expectedProbe.probeId}].action`, observedProbe.action, expectedProbe.action));
    mismatches.push(...compareScalar(`capabilityRuntime.probes[${expectedProbe.probeId}].eventType`, observedProbe.eventType, expectedProbe.eventType));
    if (expectedProbe.airborne !== undefined) {
      mismatches.push(...compareBoolean(`capabilityRuntime.probes[${expectedProbe.probeId}].airborne`, observedProbe.airborne, expectedProbe.airborne));
    }
    if (expectedProbe.invulnerable !== undefined) {
      mismatches.push(
        ...compareBoolean(`capabilityRuntime.probes[${expectedProbe.probeId}].invulnerable`, observedProbe.invulnerable, expectedProbe.invulnerable)
      );
    }
    if (expectedProbe.damagePrevented !== undefined) {
      mismatches.push(
        ...compareBoolean(
          `capabilityRuntime.probes[${expectedProbe.probeId}].damagePrevented`,
          observedProbe.damagePrevented,
          expectedProbe.damagePrevented
        )
      );
    }
    if (expectedProbe.projectileEntityId !== undefined) {
      mismatches.push(
        ...compareScalar(
          `capabilityRuntime.probes[${expectedProbe.probeId}].projectileEntityId`,
          observedProbe.projectileEntityId,
          expectedProbe.projectileEntityId
        )
      );
    }
  }

  return {
    status: missingProbeIds.length === 0 && mismatches.length === 0 ? 'PASSED' : 'FAILED',
    expected,
    observed,
    missingProbeIds,
    mismatches
  };
}

function readRuntimeAuthoritySnapshot(snapshot: unknown): Partial<QaRuntimeAuthorityExpectation> | undefined {
  if (snapshot === null || typeof snapshot !== 'object' || !('runtimeAuthority' in snapshot)) {
    return undefined;
  }

  const runtimeAuthority = (snapshot as { runtimeAuthority?: unknown }).runtimeAuthority;
  if (runtimeAuthority === null || typeof runtimeAuthority !== 'object') {
    return undefined;
  }

  return {
    authorityBundleRef: readAuthorityBundleRef((runtimeAuthority as { authorityBundleRef?: unknown }).authorityBundleRef),
    activeProfileLockRef: readActiveProfileLockRef((runtimeAuthority as { activeProfileLockRef?: unknown }).activeProfileLockRef),
    profileId: readString((runtimeAuthority as { profileId?: unknown }).profileId),
    runtimeTemplateId: readString((runtimeAuthority as { runtimeTemplateId?: unknown }).runtimeTemplateId),
    runtimeTemplateManifestId: readString((runtimeAuthority as { runtimeTemplateManifestId?: unknown }).runtimeTemplateManifestId),
    qaProfile: readString((runtimeAuthority as { qaProfile?: unknown }).qaProfile)
  };
}

function readAuthorityBundleRef(value: unknown): QaRuntimeAuthorityExpectation['authorityBundleRef'] | undefined {
  if (value === null || typeof value !== 'object') {
    return undefined;
  }
  const ref = value as { artifactKind?: unknown; path?: unknown; bundleHash?: unknown };
  if (typeof ref.artifactKind !== 'string' || typeof ref.path !== 'string' || typeof ref.bundleHash !== 'string') {
    return undefined;
  }
  return {
    artifactKind: ref.artifactKind as QaRuntimeAuthorityExpectation['authorityBundleRef']['artifactKind'],
    path: ref.path as QaRuntimeAuthorityExpectation['authorityBundleRef']['path'],
    bundleHash: ref.bundleHash
  };
}

function readActiveProfileLockRef(value: unknown): QaRuntimeAuthorityExpectation['activeProfileLockRef'] | undefined {
  if (value === null || typeof value !== 'object') {
    return undefined;
  }
  const ref = value as { artifactKind?: unknown; path?: unknown; lockHash?: unknown };
  if (typeof ref.artifactKind !== 'string' || typeof ref.path !== 'string' || typeof ref.lockHash !== 'string') {
    return undefined;
  }
  return {
    artifactKind: ref.artifactKind as QaRuntimeAuthorityExpectation['activeProfileLockRef']['artifactKind'],
    path: ref.path as QaRuntimeAuthorityExpectation['activeProfileLockRef']['path'],
    lockHash: ref.lockHash
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function collectCapabilityRuntimeObservedProbes(snapshot: unknown, telemetry: readonly TelemetryEvent[]): QaCapabilityRuntimeObservedProbe[] {
  const probesById = new Map<string, QaCapabilityRuntimeObservedProbe>();
  for (const probe of readSnapshotCapabilityRuntimeProbes(snapshot)) {
    mergeCapabilityRuntimeProbe(probesById, probe, 'snapshot');
  }

  for (const event of telemetry) {
    const payload = isRecord(event.payload) ? event.payload : undefined;
    const probes = [
      ...readCapabilityRuntimeProbes(payload?.capabilityRuntime, event.type),
      ...readCapabilityRuntimeProbes(payload?.capabilityRuntimeProbes, event.type)
    ];
    for (const probe of probes) {
      mergeCapabilityRuntimeProbe(probesById, probe, 'telemetry');
    }
  }

  return [...probesById.values()].sort((left, right) => left.probeId.localeCompare(right.probeId));
}

function readSnapshotCapabilityRuntimeProbes(snapshot: unknown): Array<Omit<QaCapabilityRuntimeObservedProbe, 'observedIn'>> {
  if (!isRecord(snapshot) || !isRecord(snapshot.capabilityRuntime) || !Array.isArray(snapshot.capabilityRuntime.probes)) {
    return [];
  }

  return snapshot.capabilityRuntime.probes.flatMap((probe) => readCapabilityRuntimeProbes(probe));
}

function readCapabilityRuntimeProbes(value: unknown, eventTypeFallback?: string): Array<Omit<QaCapabilityRuntimeObservedProbe, 'observedIn'>> {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => readCapabilityRuntimeProbes(entry, eventTypeFallback));
  }

  const probe = readCapabilityRuntimeProbe(value, eventTypeFallback);
  return probe === undefined ? [] : [probe];
}

function readCapabilityRuntimeProbe(value: unknown, eventTypeFallback?: string): Omit<QaCapabilityRuntimeObservedProbe, 'observedIn'> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const capabilityId = readString(value.capabilityId);
  const probeId = readString(value.probeId);
  const action = readString(value.action);
  const eventType = readString(value.eventType) ?? eventTypeFallback;
  if (capabilityId === undefined || probeId === undefined || action === undefined || eventType === undefined) {
    return undefined;
  }

  const airborne = readBoolean(value.airborne);
  const invulnerable = readBoolean(value.invulnerable);
  const damagePrevented = readBoolean(value.damagePrevented);
  const projectileEntityId = readString(value.projectileEntityId);
  const runtimeModuleId = readString(value.runtimeModuleId);
  const projectileId = readString(value.projectileId);
  const sourceRef = readString(value.sourceRef);
  const status = readString(value.status);
  const eventTypes = uniqueStrings([
    ...readRuntimeEventTypes(value.eventTypes),
    eventType,
    ...(eventTypeFallback === undefined ? [] : [eventTypeFallback])
  ]);

  return {
    capabilityId,
    probeId,
    action,
    eventType,
    eventTypes,
    ...(airborne === undefined ? {} : { airborne }),
    ...(invulnerable === undefined ? {} : { invulnerable }),
    ...(damagePrevented === undefined ? {} : { damagePrevented }),
    ...(projectileEntityId === undefined ? {} : { projectileEntityId }),
    ...(runtimeModuleId === undefined ? {} : { runtimeModuleId }),
    ...(projectileId === undefined ? {} : { projectileId }),
    ...(sourceRef === undefined ? {} : { sourceRef }),
    ...(status === undefined ? {} : { status })
  };
}

function mergeCapabilityRuntimeProbe(
  probesById: Map<string, QaCapabilityRuntimeObservedProbe>,
  probe: Omit<QaCapabilityRuntimeObservedProbe, 'observedIn'>,
  observedIn: 'snapshot' | 'telemetry'
): void {
  const existing = probesById.get(probe.probeId);
  if (existing === undefined) {
    probesById.set(probe.probeId, { ...probe, observedIn: [observedIn] });
    return;
  }

  if (!existing.observedIn.includes(observedIn)) {
    existing.observedIn.push(observedIn);
  }
  existing.eventTypes = uniqueStrings([...(existing.eventTypes ?? [existing.eventType]), ...(probe.eventTypes ?? [probe.eventType])]);
}

function compareScalar(path: string, observed: string | undefined, expected: string): string[] {
  return observed === expected ? [] : [`${path}: expected ${expected}, observed ${observed ?? '<missing>'}`];
}

function compareBoolean(path: string, observed: boolean | undefined, expected: boolean): string[] {
  return observed === expected ? [] : [`${path}: expected ${expected}, observed ${observed === undefined ? '<missing>' : String(observed)}`];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readRuntimeEventTypes(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort();
}

function resolveInteractionFailureCode(input: {
  consoleErrors: readonly string[];
  gateReady: boolean;
  interactionAssertion: { ok: boolean };
  runtimeAuthority: QaRuntimeAuthorityEvidence | undefined;
  capabilityRuntime: QaCapabilityRuntimeEvidence | undefined;
}): QaFailureCode | undefined {
  if (input.consoleErrors.length > 0) {
    return 'FATAL_CONSOLE_ERROR';
  }
  if (!input.gateReady) {
    return 'REQUIRED_TELEMETRY_MISSING';
  }
  if (input.runtimeAuthority?.status === 'FAILED') {
    return 'RUNTIME_AUTHORITY_MISMATCH';
  }
  if (input.capabilityRuntime?.status === 'FAILED') {
    return 'CAPABILITY_RUNTIME_MISMATCH';
  }
  return input.interactionAssertion.ok ? undefined : 'QA_RUNNER_FAILED';
}

function buildInteractionMessage(
  interactionMessage: string | undefined,
  runtimeAuthority: QaRuntimeAuthorityEvidence | undefined,
  capabilityRuntime: QaCapabilityRuntimeEvidence | undefined
): string | undefined {
  const messages = [
    interactionMessage,
    runtimeAuthority?.status === 'FAILED' ? `Runtime authority mismatch: ${runtimeAuthority.mismatches.join('; ')}` : undefined,
    capabilityRuntime?.status === 'FAILED' ? `Capability runtime mismatch: ${capabilityRuntime.mismatches.join('; ')}` : undefined
  ].filter((message): message is string => message !== undefined && message.length > 0);
  return messages.length === 0 ? undefined : messages.join(' ');
}

function failedInteractionResult(
  failureCode: QaBrowserResult['failure_code'],
  consoleErrors: string[],
  visualGate: Extract<VisualGateResult, { ok: true }>,
  error: unknown,
  assetRuntime?: QaAssetRuntimeTelemetry
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
    visual_metrics: visualGate.visual_metrics,
    asset_runtime: assetRuntime
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
  if (genre === 'side_scrolling_run_and_gun') {
    await page.keyboard.press('Enter');
    const movementAssertion = await verifySideScrollingMovement(page);
    if (!movementAssertion.ok) {
      await page.keyboard.press('r');
      return movementAssertion;
    }

    await page.keyboard.press(' ');
    const jumpAssertion = await verifyTelemetryEvent(page, 'player.jumped', 'Side-scrolling QA expected Space to emit player.jumped.');
    if (!jumpAssertion.ok) {
      await page.keyboard.press('r');
      return jumpAssertion;
    }

    const progressed = await runSideScrollingCombat(page, timeoutMs);
    await page.keyboard.press('r');
    return progressed
      ? { ok: true }
      : {
          ok: false,
          message:
            'Side-scrolling QA expected run-and-gun input to produce enemy.fired, combat progress, and health.damage_invulnerability.blocked.'
        };
  }

  if (genre !== 'shooter') {
    if (genre === 'collector') {
      await page.keyboard.press('Enter');
      const movementAssertion = await verifyCollectorMovement(page);
      if (!movementAssertion.ok) {
        await page.keyboard.press('r');
        return movementAssertion;
      }

      const progressed = await collectUntilCollectorProgress(page, timeoutMs);
      await page.keyboard.press('r');
      return progressed ? { ok: true } : { ok: false, message: 'Collector QA expected directional movement to collect an item and change score.' };
    }

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

async function verifyRuntimeAssetsLoaded(page: Page, genre: QaGenre): Promise<{ ok: boolean; message?: string; telemetry?: QaAssetRuntimeTelemetry }> {
  if (genre !== 'collector' && genre !== 'dodger' && genre !== 'shooter' && genre !== 'side_scrolling_run_and_gun') {
    return { ok: true };
  }
  const genreLabel = qaGenreLabel(genre);

  const telemetry = await page.evaluate(() => {
    const target = (globalThis as BrowserQaGlobal).__GAME_TELEMETRY__;
    if (typeof target !== 'object' || target === null || !('assets' in target)) {
      return undefined;
    }
    return (target as { assets?: unknown }).assets;
  });

  const assets = readAssetTelemetry(telemetry);
  if (assets === undefined) {
    return { ok: false, message: `${genreLabel} QA expected __GAME_TELEMETRY__.assets from the manifest loader.` };
  }
  const assetRuntime = toQaAssetRuntimeTelemetry(assets);

  if (!assets.manifestLoaded) {
    return { ok: false, message: `${genreLabel} QA expected asset manifest telemetry to report manifestLoaded=true.`, telemetry: assetRuntime };
  }

  if (assets.required.length === 0) {
    return { ok: false, message: `${genreLabel} QA expected at least one required runtime asset.`, telemetry: assetRuntime };
  }

  const loaded = new Set(assets.loaded);
  const missingRequired = assets.required.filter((id) => !loaded.has(id));
  if (missingRequired.length > 0) {
    return { ok: false, message: `${genreLabel} QA expected required assets to load: ${missingRequired.join(', ')}`, telemetry: assetRuntime };
  }

  const failed = new Set(assets.failed);
  const failedRequired = assets.required.filter((id) => failed.has(id));
  if (failedRequired.length > 0) {
    return { ok: false, message: `${genreLabel} QA observed failed required assets: ${failedRequired.join(', ')}`, telemetry: assetRuntime };
  }

  if (assets.missing.length > 0) {
    return { ok: false, message: `${genreLabel} QA observed missing manifest assets: ${assets.missing.join(', ')}`, telemetry: assetRuntime };
  }

  if (assets.missingRequiredRoles.length > 0) {
    return { ok: false, message: `${genreLabel} QA observed missing required asset roles: ${assets.missingRequiredRoles.join(', ')}`, telemetry: assetRuntime };
  }

  return { ok: true, telemetry: assetRuntime };
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

async function verifySideScrollingMovement(page: Page): Promise<{ ok: boolean; message?: string }> {
  const moved = await tryHorizontalMove(page, 'ArrowRight', 12);
  if (!moved) {
    return { ok: false, message: 'Side-scrolling QA expected player.x to change after holding ArrowRight.' };
  }

  const snapshot = await readQaSnapshot(page);
  const camera = readSnapshotCamera(snapshot);
  if (camera !== undefined && camera.scrollX <= 0 && camera.playerX > camera.viewportWidth / 2) {
    return { ok: false, message: 'Side-scrolling QA expected side_follow camera.scrollX to advance with the player.' };
  }

  return { ok: true };
}

async function verifyCollectorMovement(page: Page): Promise<{ ok: boolean; message?: string }> {
  if (await tryHorizontalMove(page, 'ArrowRight', 12)) {
    return { ok: true };
  }

  if (await tryHorizontalMove(page, 'ArrowLeft', 12)) {
    return { ok: true };
  }

  return { ok: false, message: 'Collector QA expected player.x to change after holding ArrowRight or ArrowLeft.' };
}

async function tryHorizontalMove(page: Page, key: 'ArrowLeft' | 'ArrowRight', minDelta: number): Promise<boolean> {
  const beforeMove = await readQaSnapshot(page);
  await page.keyboard.down(key);
  await page.waitForTimeout(300);
  await page.keyboard.up(key);
  const afterMove = await readQaSnapshot(page);
  return movedHorizontally(beforeMove, afterMove, minDelta);
}

async function collectUntilCollectorProgress(page: Page, timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(250);
    await page.keyboard.up('ArrowRight');
    const observed = await page
      .waitForFunction(
        () => {
          const qa = (globalThis as BrowserQaGlobal).__GAME_QA__;
          return (
            qa?.telemetry().some((event) => {
              if (typeof event !== 'object' || event === null || !('type' in event)) {
                return false;
              }

              return event.type === 'item.collected' || event.type === 'score.changed';
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
  }

  return false;
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

async function runSideScrollingCombat(page: Page, timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();
  await page.keyboard.down('ArrowRight');

  try {
    while (Date.now() - startedAt < timeoutMs) {
      await page.keyboard.press('j');
      const observed = await page
        .waitForFunction(
          () => {
            const qa = (globalThis as BrowserQaGlobal).__GAME_QA__;
            return (
              qa?.telemetry().some((event) => {
                if (typeof event !== 'object' || event === null || !('type' in event)) {
                  return false;
                }

                return event.type === 'enemy.fired';
              }) === true &&
              qa?.telemetry().some((event) => {
                if (typeof event !== 'object' || event === null || !('type' in event)) {
                  return false;
                }

                return event.type === 'enemy.hit' || event.type === 'enemy.cleared' || event.type === 'level.segment.completed' || event.type === 'game.won';
              }) === true &&
              qa?.telemetry().some((event) => {
                if (typeof event !== 'object' || event === null || !('type' in event)) {
                  return false;
                }

                return event.type === 'health.damage_invulnerability.blocked';
              }) === true
            );
          },
          undefined,
          { timeout: Math.min(700, Math.max(100, timeoutMs - (Date.now() - startedAt))) }
        )
        .then(() => true)
        .catch(() => false);

      if (observed) {
        return true;
      }

      await page.waitForTimeout(300);
    }

    return false;
  } finally {
    await page.keyboard.up('ArrowRight').catch(() => undefined);
  }
}

async function verifyTelemetryEvent(page: Page, type: string, message: string): Promise<{ ok: boolean; message?: string }> {
  const observed = await page
    .waitForFunction(
      (expectedType) => {
        const qa = (globalThis as BrowserQaGlobal).__GAME_QA__;
        return qa?.telemetry().some((event) => typeof event === 'object' && event !== null && 'type' in event && event.type === expectedType) === true;
      },
      type,
      { timeout: 1000 }
    )
    .then(() => true)
    .catch(() => false);

  return observed ? { ok: true } : { ok: false, message };
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

function readSnapshotCamera(snapshot: unknown): { scrollX: number; playerX: number; viewportWidth: number } | undefined {
  if (typeof snapshot !== 'object' || snapshot === null || !('camera' in snapshot)) {
    return undefined;
  }

  const camera = (snapshot as { camera?: unknown }).camera;
  if (typeof camera !== 'object' || camera === null || !('scrollX' in camera) || !('playerX' in camera) || !('viewport' in camera)) {
    return undefined;
  }

  const { scrollX, playerX, viewport } = camera as { scrollX?: unknown; playerX?: unknown; viewport?: unknown };
  if (typeof viewport !== 'object' || viewport === null || !('width' in viewport)) {
    return undefined;
  }

  const { width } = viewport as { width?: unknown };
  return typeof scrollX === 'number' && typeof playerX === 'number' && typeof width === 'number' ? { scrollX, playerX, viewportWidth: width } : undefined;
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
    !Array.isArray(assets.fallbackUsed) ||
    !Array.isArray(assets.placeholderUsed) ||
    !Array.isArray(assets.missing) ||
    !Array.isArray(assets.missingRequiredRoles)
  ) {
    return undefined;
  }

  const required = readStringArray(assets.required);
  const loaded = readStringArray(assets.loaded);
  const failed = readStringArray(assets.failed);
  const fallbackUsed = readStringArray(assets.fallbackUsed);
  const placeholderUsed = readStringArray(assets.placeholderUsed);
  const missing = readStringArray(assets.missing);
  const missingRequiredRoles = readStringArray(assets.missingRequiredRoles);
  if (
    required === undefined ||
    loaded === undefined ||
    failed === undefined ||
    fallbackUsed === undefined ||
    placeholderUsed === undefined ||
    missing === undefined ||
    missingRequiredRoles === undefined
  ) {
    return undefined;
  }

  return { manifestLoaded: assets.manifestLoaded, required, loaded, failed, fallbackUsed, placeholderUsed, missing, missingRequiredRoles };
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
  fallbackUsed: string[];
  placeholderUsed: string[];
  missing: string[];
  missingRequiredRoles: string[];
};

function toQaAssetRuntimeTelemetry(assets: RuntimeAssetTelemetry): QaAssetRuntimeTelemetry {
  return {
    manifest_loaded: assets.manifestLoaded,
    required: [...assets.required],
    loaded: [...assets.loaded],
    failed: [...assets.failed],
    fallback_used: [...assets.fallbackUsed],
    placeholder_used: [...assets.placeholderUsed],
    missing: [...assets.missing],
    missing_required_roles: [...assets.missingRequiredRoles]
  };
}

function qaGenreLabel(genre: QaGenre): string {
  return `${genre.slice(0, 1).toUpperCase()}${genre.slice(1)}`;
}
