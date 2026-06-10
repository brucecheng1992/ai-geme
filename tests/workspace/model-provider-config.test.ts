import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readDeepSeekConfig } from '../../apps/maker-api/src/model-provider/model-provider.config.js';

describe('readDeepSeekConfig', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-env-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('loads DeepSeek settings from the nearest .env when process env is not exported', async () => {
    await writeFile(
      join(root, '.env'),
      [
        'DEEPSEEK_API_KEY=test-deepseek-key',
        'DEEPSEEK_BASE_URL=https://example.test',
        'DEEPSEEK_DSL_MODEL=deepseek-test',
        'DEEPSEEK_TIMEOUT_MS=1234'
      ].join('\n'),
      'utf8'
    );

    expect(readDeepSeekConfig({ INIT_CWD: root })).toEqual({
      apiKey: 'test-deepseek-key',
      baseUrl: 'https://example.test',
      defaultModel: 'deepseek-test',
      defaultTimeoutMs: 1234
    });
  });

  it('keeps explicit process env values ahead of .env values', async () => {
    await writeFile(join(root, '.env'), 'DEEPSEEK_API_KEY=file-key\n', 'utf8');

    expect(readDeepSeekConfig({ INIT_CWD: root, DEEPSEEK_API_KEY: 'process-key' }).apiKey).toBe('process-key');
  });
});
