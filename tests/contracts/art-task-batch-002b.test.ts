import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import {
  BATCH_002B_MAX_IMAGES,
  BATCH_002B_TASK_DEFINITIONS,
  buildChiyanBatch002bPrompt,
  evaluateBatch002bGate,
  getBatch002bRequestedImageCount,
  resolveChiyanSideRunnerDslSource,
  validateChiyanSideRunnerDslForLiveGeneration
} from '../../scripts/art-task-batch-002b.js';

const execFileAsync = promisify(execFile);

const SIDE_RUNNER_DSL = [
  'CHIYAN_BATTLEFIELD_DSL_VERSION 1.1',
  'LIVE_GENERATION_ALLOWED true',
  'game_format: side-scrolling run-and-gun',
  'camera: strict side-view / side-on camera',
  'gameplay_readability: horizontal combat lane, platform readability, clear silhouettes',
  'movement: left-to-right / right-to-left horizontal action',
  'weapon_language: fantasy ChiYan ranged weaponry, ember rifle, flame repeater, fire-lance, arm cannon, explosive fire bolts',
  'visual_anchors: deep crimson banners, blackened iron armor, scorched basalt terrain, ash haze, ember rim light',
  'no portrait splash art for production tasks',
  'no card art layout',
  'no fake logo, watermark, readable text, fake UI labels',
  'no generic fantasy fallback'
].join('\n');

describe('ChiYan ArtTask Batch 002b side-runner production pass', () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
    tempRoots.length = 0;
  });

  it('skips when RUN_CHIYAN_BATCH_002B is not enabled and records zero provider calls', async () => {
    expect(evaluateBatch002bGate({ RUN_CHIYAN_BATCH_002B: '0' })).toEqual({
      status: 'skip',
      message: 'Skipping ChiYan Batch 002b',
      providerCallCount: 0
    });

    const result = await execFileAsync('npx', ['tsx', 'scripts/art-task-batch-002b.ts'], {
      env: {
        ...process.env,
        RUN_CHIYAN_BATCH_002B: '0',
        RUN_MINIMAX_LIVE_TESTS: '0',
        MINIMAX_API_KEY: ''
      }
    });

    expect(result.stdout).toContain('Skipping ChiYan Batch 002b');
    expect(result.stderr).toBe('');
  });

  it('fails the live gate before provider calls when MINIMAX_API_KEY is missing', () => {
    expect(
      evaluateBatch002bGate({
        RUN_CHIYAN_BATCH_002B: '1',
        RUN_MINIMAX_LIVE_TESTS: '1',
        MINIMAX_API_KEY: '',
        MINIMAX_BASE_URL: 'https://api.minimaxi.com',
        MINIMAX_IMAGE_MODEL: 'image-01'
      })
    ).toEqual({
      status: 'error',
      message: 'ChiYan Batch 002b requires MINIMAX_API_KEY when RUN_CHIYAN_BATCH_002B=1.',
      providerCallCount: 0
    });
  });

  it('fails closed when the ChiYan side-runner DSL is missing', async () => {
    const missing = await resolveChiyanSideRunnerDslSource({
      env: {
        RUN_CHIYAN_BATCH_002B: '1',
        CHIYAN_BATTLEFIELD_DSL_PATH: join(tmpdir(), 'missing-chiyan-side-runner-dsl.md')
      },
      repoRoot: process.cwd(),
      candidatePaths: []
    });

    expect(missing).toEqual({
      ok: false,
      message: 'ChiYan side-runner DSL not found. Provide CHIYAN_BATTLEFIELD_DSL_PATH or add docs/art-pipeline/dsl/chiyan-battlefield-side-runner.dsl.'
    });
  });

  it('rejects test-only fixture DSL in live mode', () => {
    expect(
      validateChiyanSideRunnerDslForLiveGeneration(
        [
          'CHIYAN_BATTLEFIELD_DSL_VERSION 0.1',
          'DSL_STATUS TEST_ONLY_DO_NOT_USE_FOR_LIVE_GENERATION',
          'LIVE_GENERATION_ALLOWED false',
          'game_format: side-scrolling run-and-gun',
          'camera: strict side-view / side-on camera'
        ].join('\n')
      )
    ).toEqual({
      ok: false,
      message: 'ChiYan Batch 002b source DSL is marked test-only and cannot be used for live generation.'
    });
  });

  it('rejects live DSL without side-scrolling run-and-gun constraints', () => {
    expect(
      validateChiyanSideRunnerDslForLiveGeneration(
        [
          'CHIYAN_BATTLEFIELD_DSL_VERSION 1.0',
          'LIVE_GENERATION_ALLOWED true',
          'visual_anchors: deep crimson banners, blackened iron armor, scorched basalt terrain, ash haze, ember rim light'
        ].join('\n')
      )
    ).toEqual({
      ok: false,
      message: 'ChiYan Batch 002b source DSL must include side-scrolling run-and-gun production constraints.'
    });
  });

  it('accepts the side-runner DSL through discovery and live DSL gate', async () => {
    const root = await mkdtemp(join(tmpdir(), 'chiyan-side-runner-'));
    tempRoots.push(root);
    const dslPath = join(root, 'chiyan-battlefield-side-runner.dsl');
    await writeFile(dslPath, SIDE_RUNNER_DSL, 'utf8');

    const source = await resolveChiyanSideRunnerDslSource({
      env: { CHIYAN_BATTLEFIELD_DSL_PATH: dslPath },
      repoRoot: process.cwd(),
      candidatePaths: []
    });

    expect(source.ok).toBe(true);
    if (!source.ok) return;
    expect(validateChiyanSideRunnerDslForLiveGeneration(source.text)).toEqual({ ok: true });
  });

  it('keeps repo side-runner DSL prompts plus negative prompts within the MiniMax prompt limit before provider calls', async () => {
    const sourceDslPath = 'docs/art-pipeline/dsl/chiyan-battlefield-side-runner.dsl';
    const sourceDslText = await readFile(sourceDslPath, 'utf8');

    for (const definition of BATCH_002B_TASK_DEFINITIONS) {
      const compiled = buildChiyanBatch002bPrompt({
        sourceDslText,
        sourceDslPath,
        sourceDslHash: 'a'.repeat(64),
        taskDefinition: definition,
        providerPromptLimit: 1500,
        now: () => new Date('2026-07-10T00:00:00.000Z')
      });

      const adapterPrompt = `${compiled.compiledPrompt}\n\nAvoid: ${compiled.negativePrompt}`;
      expect(adapterPrompt.length).toBeLessThanOrEqual(1500);
    }
  });

  it('does not treat markdown docs as source DSL fallback', async () => {
    const root = await mkdtemp(join(tmpdir(), 'chiyan-002b-doc-only-'));
    tempRoots.push(root);
    await mkdir(join(root, 'docs', 'art-pipeline'), { recursive: true });
    await writeFile(join(root, 'docs', 'art-pipeline', 'batch-002b-chiyan-side-runner.md'), SIDE_RUNNER_DSL, 'utf8');

    const result = await resolveChiyanSideRunnerDslSource({
      env: {},
      repoRoot: root
    });

    expect(result.ok).toBe(false);
  });

  it('does not compile a generic fantasy fallback prompt', () => {
    expect(() =>
      buildChiyanBatch002bPrompt({
        sourceDslText: [
          'LIVE_GENERATION_ALLOWED true',
          'game_format: side-scrolling run-and-gun',
          'camera: strict side-view / side-on camera',
          'generic fantasy fallback'
        ].join('\n'),
        sourceDslPath: 'docs/art-pipeline/dsl/chiyan-battlefield-side-runner.dsl',
        sourceDslHash: 'a'.repeat(64),
        taskDefinition: BATCH_002B_TASK_DEFINITIONS[0],
        providerPromptLimit: 1500,
        now: () => new Date('2026-07-10T00:00:00.000Z')
      })
    ).toThrow(/did not include recognizable side-runner ChiYan anchors/);
  });

  it('defines exactly 7 image.generate tasks within the 11-image cap without auto review actions', () => {
    expect(BATCH_002B_TASK_DEFINITIONS).toHaveLength(7);
    expect(BATCH_002B_TASK_DEFINITIONS.every((definition) => definition.requiredCapability === 'image.generate')).toBe(true);
    expect(getBatch002bRequestedImageCount()).toBe(11);
    expect(getBatch002bRequestedImageCount()).toBeLessThanOrEqual(BATCH_002B_MAX_IMAGES);
    expect(BATCH_002B_TASK_DEFINITIONS.every((definition) => definition.autoSelect === false)).toBe(true);
    expect(BATCH_002B_TASK_DEFINITIONS.every((definition) => definition.autoApprove === false)).toBe(true);
  });

  it('binds character, enemy, and background prompts to side-view run-and-gun production constraints', () => {
    const gameplayTasks = BATCH_002B_TASK_DEFINITIONS.filter((definition) =>
      ['character_concept', 'enemy_concept', 'scene_background'].includes(definition.type)
    );

    for (const definition of gameplayTasks) {
      expect(definition.assetInstruction).toMatch(/side-view|side-on|side-scrolling|run-and-gun/i);
      expect(definition.assetInstruction).toMatch(/no text|no logo|no watermark/i);
    }
  });

  it('binds icon and UI prompts to no text, logo, or watermark constraints', () => {
    const iconAndUiTasks = BATCH_002B_TASK_DEFINITIONS.filter((definition) => definition.type === 'skill_icon' || definition.type === 'ui_concept');

    for (const definition of iconAndUiTasks) {
      expect(definition.assetInstruction).toMatch(/no text/i);
      expect(definition.assetInstruction).toMatch(/no logo/i);
      expect(definition.assetInstruction).toMatch(/no watermark/i);
    }
  });
});
