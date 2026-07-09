import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import {
  BATCH_002_MAX_IMAGES,
  BATCH_002_TASK_DEFINITIONS,
  buildChiyanBatch002Prompt,
  evaluateBatch002Gate,
  getBatch002RequestedImageCount,
  resolveChiyanDslSource,
  validateChiyanDslForLiveGeneration
} from '../../scripts/art-task-batch-002.js';

const execFileAsync = promisify(execFile);

describe('ChiYan ArtTask Batch 002', () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
    tempRoots.length = 0;
  });

  it('skips when RUN_CHIYAN_BATCH_002 is not enabled', async () => {
    const result = await execFileAsync('npx', ['tsx', 'scripts/art-task-batch-002.ts'], {
      env: {
        ...process.env,
        RUN_CHIYAN_BATCH_002: '0',
        RUN_MINIMAX_LIVE_TESTS: '0',
        MINIMAX_API_KEY: ''
      }
    });

    expect(result.stdout).toContain('Skipping ChiYan Batch 002');
    expect(result.stderr).toBe('');
  });

  it('fails the live gate clearly when the API key is missing', () => {
    expect(
      evaluateBatch002Gate({
        RUN_CHIYAN_BATCH_002: '1',
        RUN_MINIMAX_LIVE_TESTS: '1',
        MINIMAX_API_KEY: '',
        MINIMAX_BASE_URL: 'https://api.minimaxi.com',
        MINIMAX_IMAGE_MODEL: 'image-01'
      })
    ).toEqual({
      status: 'error',
      message: 'ChiYan Batch 002 requires MINIMAX_API_KEY when RUN_CHIYAN_BATCH_002=1.'
    });
  });

  it('fails clearly when the ChiYan DSL is missing', async () => {
    await expect(
      execFileAsync('npm', ['run', 'art-task:batch-002'], {
        env: {
          ...process.env,
          RUN_CHIYAN_BATCH_002: '1',
          RUN_MINIMAX_LIVE_TESTS: '1',
          MINIMAX_API_KEY: 'test-key-not-used',
          MINIMAX_BASE_URL: 'https://api.minimaxi.com',
          MINIMAX_IMAGE_MODEL: 'image-01',
          CHIYAN_BATTLEFIELD_DSL_PATH: join(tmpdir(), 'missing-chiyan-dsl.md')
        }
      })
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('ChiYan Battlefield DSL not found. Provide CHIYAN_BATTLEFIELD_DSL_PATH or add the DSL file to the repo.')
    });

    const missing = await resolveChiyanDslSource({
      env: {
        RUN_CHIYAN_BATCH_002: '1',
        CHIYAN_BATTLEFIELD_DSL_PATH: join(tmpdir(), 'missing-chiyan-dsl.md')
      },
      repoRoot: process.cwd(),
      candidatePaths: []
    });

    expect(missing).toEqual({
      ok: false,
      message: 'ChiYan Battlefield DSL not found. Provide CHIYAN_BATTLEFIELD_DSL_PATH or add the DSL file to the repo.'
    });
  });

  it('does not treat the Batch 002 documentation as a source DSL fallback', async () => {
    const root = await mkdtemp(join(tmpdir(), 'chiyan-doc-only-'));
    tempRoots.push(root);
    await mkdir(join(root, 'docs', 'art-pipeline'), { recursive: true });
    await writeFile(join(root, 'docs', 'art-pipeline', 'batch-002-chiyan.md'), 'documentation is not the ChiYan source DSL', 'utf8');

    const result = await resolveChiyanDslSource({
      env: {},
      repoRoot: root
    });

    expect(result).toEqual({
      ok: false,
      message: 'ChiYan Battlefield DSL not found. Provide CHIYAN_BATTLEFIELD_DSL_PATH or add the DSL file to the repo.'
    });
  });

  it('rejects test-only fixture DSL before live provider setup', async () => {
    const root = await mkdtemp(join(tmpdir(), 'chiyan-test-only-'));
    tempRoots.push(root);
    const fixturePath = join(root, 'chiyan-battlefield.fixture.dsl');
    await writeFile(
      fixturePath,
      [
        'CHIYAN_BATTLEFIELD_DSL_VERSION 0.1',
        'DSL_STATUS TEST_ONLY_DO_NOT_USE_FOR_LIVE_GENERATION',
        'LIVE_GENERATION_ALLOWED false',
        'WORLD ChiYan_Battlefield { visual_anchor: "red flame, blackened iron, basalt battlefield terrain" }'
      ].join('\n'),
      'utf8'
    );

    await expect(
      execFileAsync('npm', ['run', 'art-task:batch-002'], {
        env: {
          ...process.env,
          RUN_CHIYAN_BATCH_002: '1',
          RUN_MINIMAX_LIVE_TESTS: '1',
          MINIMAX_API_KEY: 'test-key-not-used',
          MINIMAX_BASE_URL: 'https://127.0.0.1:1',
          MINIMAX_IMAGE_MODEL: 'image-01',
          CHIYAN_BATTLEFIELD_DSL_PATH: fixturePath
        }
      })
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('ChiYan Batch 002 source DSL is marked test-only and cannot be used for live generation.')
    });
  });

  it('accepts live DSL marker during DSL gate validation', () => {
    expect(
      validateChiyanDslForLiveGeneration(
        [
          'CHIYAN_BATTLEFIELD_DSL_VERSION 1.0',
          'DSL_STATUS LIVE_SOURCE_OF_TRUTH_CANDIDATE',
          'LIVE_GENERATION_ALLOWED true',
          'WORLD ChiYan_Battlefield { visual_anchor: "red flame, blackened iron, basalt battlefield terrain" }'
        ].join('\n')
      )
    ).toEqual({ ok: true });
  });

  it('defines exactly 7 provider-agnostic image.generate tasks within the 11-image cap', () => {
    expect(BATCH_002_TASK_DEFINITIONS).toHaveLength(7);
    expect(BATCH_002_TASK_DEFINITIONS.every((definition) => definition.requiredCapability === 'image.generate')).toBe(true);
    expect(getBatch002RequestedImageCount()).toBe(11);
    expect(getBatch002RequestedImageCount()).toBeLessThanOrEqual(BATCH_002_MAX_IMAGES);
  });

  it('does not auto select or auto approve in Batch 002 config', () => {
    expect(BATCH_002_TASK_DEFINITIONS.every((definition) => definition.autoSelect === false)).toBe(true);
    expect(BATCH_002_TASK_DEFINITIONS.every((definition) => definition.autoApprove === false)).toBe(true);
  });

  it('creates prompt lineage with source DSL and compiled prompt hashes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'chiyan-dsl-'));
    tempRoots.push(root);
    const sourceDslPath = join(root, 'chiyan-battlefield-dsl.md');
    const sourceDslText =
      '赤炎战场 art bible: volcanic battlefield, ash storm sky, molten cracks, bronze armor, ember cloth, red-orange firelight, black basalt, readable silhouettes.';
    await writeFile(sourceDslPath, sourceDslText, 'utf8');
    const dslSource = await resolveChiyanDslSource({
      env: { CHIYAN_BATTLEFIELD_DSL_PATH: sourceDslPath },
      repoRoot: process.cwd(),
      candidatePaths: []
    });

    expect(dslSource.ok).toBe(true);
    if (!dslSource.ok) return;

    const compiled = buildChiyanBatch002Prompt({
      sourceDslText: dslSource.text,
      sourceDslPath: dslSource.path,
      sourceDslHash: dslSource.sha256,
      taskDefinition: BATCH_002_TASK_DEFINITIONS[0],
      providerPromptLimit: 1500,
      now: () => new Date('2026-07-09T00:00:00.000Z')
    });

    expect(compiled.promptLineage).toMatchObject({
      sourceDslId: 'chiyan-battlefield-dsl-v1',
      sourceDslPath,
      sourceDslHash: dslSource.sha256,
      artBibleId: 'chiyan-battlefield-art-bible-v1',
      promptTemplateId: 'chiyan-batch-002-v1',
      compiledAt: '2026-07-09T00:00:00.000Z'
    });
    expect(compiled.promptLineage.compiledPromptHash).toMatch(/^[a-f0-9]{64}$/);
    expect(compiled.compiledPrompt).toContain('赤炎战场');
    expect(compiled.negativePrompt).toContain('text, watermark');
  });

  it('fails before provider calls when the compiled prompt exceeds the provider limit', () => {
    expect(() =>
      buildChiyanBatch002Prompt({
        sourceDslText: '赤炎战场 ' + 'molten basalt '.repeat(200),
        sourceDslPath: 'docs/art-pipeline/chiyan-battlefield-dsl.md',
        sourceDslHash: 'a'.repeat(64),
        taskDefinition: BATCH_002_TASK_DEFINITIONS[0],
        providerPromptLimit: 120,
        now: () => new Date('2026-07-09T00:00:00.000Z')
      })
    ).toThrow(/compiled prompt length .* exceeds provider limit/);
  });
});
