import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createMiniMaxManifest,
  type ArtProviderAdapter,
  type GenerateImageInput,
  type ProviderProfile
} from '../../packages/asset-pipeline/src/index.js';
import {
  MINIMAX_ART_TASK_SMOKE_OUTPUT_ROOT,
  MINIMAX_ART_TASK_SMOKE_MAX_PROVIDER_CALL_COUNT,
  MINIMAX_ART_TASK_SMOKE_TASK_COUNT,
  MINIMAX_ART_TASK_SMOKE_TOTAL_REQUESTED_IMAGES,
  MiniMaxArtTaskSmokeExecutionError,
  evaluateMiniMaxArtTaskSmokeGate,
  executeMiniMaxArtTaskSmoke
} from '../../scripts/art-task-minimax-smoke.js';

const execFileAsync = promisify(execFile);
const NON_SECRET_TEST_KEY = 'test-only-not-a-credential';

describe('MiniMax ArtTask shared-path smoke', () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
    tempRoots.length = 0;
  });

  it('requires both live gates and fails before provider setup when the key is missing', () => {
    expect(evaluateMiniMaxArtTaskSmokeGate({})).toMatchObject({ status: 'skip', providerCallCount: 0 });
    expect(
      evaluateMiniMaxArtTaskSmokeGate({
        RUN_MINIMAX_ART_TASK_SMOKE: '1',
        RUN_MINIMAX_LIVE_TESTS: '0'
      })
    ).toMatchObject({ status: 'skip', providerCallCount: 0 });
    expect(
      evaluateMiniMaxArtTaskSmokeGate({
        RUN_MINIMAX_ART_TASK_SMOKE: '1',
        RUN_MINIMAX_LIVE_TESTS: '1',
        MINIMAX_API_KEY: ''
      })
    ).toMatchObject({ status: 'fail_before_provider_call', providerCallCount: 0 });
    expect(
      evaluateMiniMaxArtTaskSmokeGate({
        RUN_MINIMAX_ART_TASK_SMOKE: '1',
        RUN_MINIMAX_LIVE_TESTS: '1',
        MINIMAX_API_KEY: NON_SECRET_TEST_KEY
      })
    ).toMatchObject({ status: 'run', providerCallCount: 0 });
  });

  it('skips the npm shared-path command with zero provider calls when both flags are disabled', async () => {
    const result = await execFileAsync('npm', ['run', 'art-task:minimax-smoke'], {
      env: {
        ...process.env,
        RUN_MINIMAX_ART_TASK_SMOKE: '0',
        RUN_MINIMAX_LIVE_TESTS: '0',
        MINIMAX_API_KEY: ''
      }
    });

    expect(result.stdout).toContain('Skipping MiniMax ArtTask shared-path smoke');
    expect(result.stdout).toContain('providerCallCount=0');
    expect(result.stderr).toBe('');
  });

  it('runs one task through the resolver and adapter while leaving the asset review-only', async () => {
    const storageRootDir = await createTempRoot(tempRoots);
    const adapter = createFakeMiniMaxAdapter();
    const result = await executeMiniMaxArtTaskSmoke({
      adapter,
      providerProfile: createTestProfile(),
      storageRootDir,
      now: () => new Date('2026-07-10T08:00:00.000Z')
    });

    expect(MINIMAX_ART_TASK_SMOKE_TASK_COUNT).toBe(1);
    expect(MINIMAX_ART_TASK_SMOKE_TOTAL_REQUESTED_IMAGES).toBe(1);
    expect(MINIMAX_ART_TASK_SMOKE_MAX_PROVIDER_CALL_COUNT).toBe(1);
    expect(adapter.generateImageInputs).toHaveLength(1);
    expect(adapter.generateImageInputs[0]).toMatchObject({ count: 1, responseFormat: 'base64' });
    expect(result).toMatchObject({
      smokeStatus: 'generation_completed',
      providerId: 'minimax',
      modelId: 'image-01',
      taskCount: 1,
      providerCallCount: 1,
      totalRequestedImages: 1,
      generatedAssetCount: 1,
      providerCallStatus: 'succeeded',
      generationExecutionStatus: 'generation_completed',
      promptGateStatus: 'not_evaluated',
      imageContentGateStatus: 'manual_review_required',
      productionApprovalStatus: 'pending_human_review',
      productionClosureStatus: 'open_pending_review',
      autoSelection: false,
      autoApproval: false,
      selectedAssetIds: [],
      approvedAssetIds: [],
      reviewDecisionCount: 0
    });
    expect(result.generatedAssetPaths).toHaveLength(1);
    expect(result.generatedAssetPaths[0]).toContain(join(MINIMAX_ART_TASK_SMOKE_OUTPUT_ROOT, result.smokeRunId));
    expect(result.generatedAssetPaths[0]).not.toMatch(/batch-002(?:b|c)?/);
    expect(JSON.parse(await readFile(result.evidencePath, 'utf8'))).toEqual(result);
  });

  it('does not retry a failed provider call', async () => {
    const storageRootDir = await createTempRoot(tempRoots);
    const adapter = createFakeMiniMaxAdapter({ fail: true });

    await expect(
      executeMiniMaxArtTaskSmoke({
        adapter,
        providerProfile: createTestProfile(),
        storageRootDir,
        now: () => new Date('2026-07-10T08:00:01.000Z')
      })
    ).rejects.toBeInstanceOf(MiniMaxArtTaskSmokeExecutionError);

    expect(adapter.generateImageInputs).toHaveLength(1);
  });

  it('keeps the production CLI on the shared runner/resolver/MiniMax adapter path', async () => {
    const source = await readFile('scripts/art-task-minimax-smoke.ts', 'utf8');

    expect(source).toContain('createArtTaskRunner');
    expect(source).toContain('createStaticProviderResolver');
    expect(source).toContain('createMiniMaxArtProviderAdapter');
    expect(source).not.toContain('/v1/image_generation');
    expect(source).not.toMatch(/\bfetch\s*\(/);
  });

  it('forbids automatic select or approve calls in live ArtTask runners', async () => {
    const scriptNames = (await readdir('scripts')).filter(
      (name) => /^art-task-.*\.ts$/.test(name) && name !== 'art-task-mock.ts'
    );
    const sources = await Promise.all(scriptNames.map(async (name) => [name, await readFile(join('scripts', name), 'utf8')] as const));

    for (const [name, source] of sources) {
      expect(source, name).not.toMatch(/\.selectAsset\s*\(/);
      expect(source, name).not.toMatch(/\.approveAsset\s*\(/);
    }
  });
});

async function createTempRoot(tempRoots: string[]): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'minimax-art-task-smoke-'));
  tempRoots.push(root);
  return root;
}

function createTestProfile(): ProviderProfile {
  return {
    providerProfileId: 'minimax-smoke-test',
    providerId: 'minimax',
    auth: { mode: 'env', apiKeyRef: 'MINIMAX_API_KEY' },
    defaults: {
      modelId: 'image-01',
      imageCount: 1,
      aspectRatio: '1:1',
      responseFormat: 'base64'
    },
    enabled: true
  };
}

function createFakeMiniMaxAdapter(options: { fail?: boolean } = {}): ArtProviderAdapter & { generateImageInputs: GenerateImageInput[] } {
  const generateImageInputs: GenerateImageInput[] = [];
  return {
    providerId: 'minimax',
    generateImageInputs,
    getManifest: () => createMiniMaxManifest('image-01'),
    async generateImage(input) {
      generateImageInputs.push(input);
      if (options.fail === true) {
        throw new Error('test-only provider failure');
      }
      return {
        providerId: 'minimax',
        modelId: 'image-01',
        images: [{ base64: Buffer.from('fake smoke image').toString('base64'), mimeType: 'image/jpeg' }],
        raw: { fixture: true }
      };
    }
  };
}
