import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('MiniMax live smoke configuration', () => {
  it('documents env placeholders and exposes an opt-in smoke script', async () => {
    const [envExample, packageJson, docs] = await Promise.all([
      readFile('.env.example', 'utf8'),
      readFile('package.json', 'utf8'),
      readFile('docs/art-providers/minimax.md', 'utf8')
    ]);

    expect(envExample).toContain('MINIMAX_API_KEY=\n');
    expect(envExample).toContain('MINIMAX_BASE_URL=https://api.minimax.io');
    expect(envExample).toContain('MINIMAX_IMAGE_MODEL=image-01');
    expect(envExample).toContain('RUN_MINIMAX_LIVE_TESTS=0');
    expect(JSON.parse(packageJson).scripts['minimax:smoke']).toBe('tsx scripts/minimax-smoke.ts');
    expect(JSON.parse(packageJson).scripts['art-task:minimax-smoke']).toBe('tsx scripts/art-task-minimax-smoke.ts');
    expect(docs).toContain('MiniMax is the first ArtProviderAdapter, not a business dependency.');
    expect(docs).toContain('RUN_MINIMAX_LIVE_TESTS=1');
    expect(docs).toContain('provider URLs are temporary');
  });

  it('skips the live smoke script unless explicitly enabled', async () => {
    const result = await execFileAsync('npx', ['tsx', 'scripts/minimax-smoke.ts'], {
      env: {
        ...process.env,
        RUN_MINIMAX_LIVE_TESTS: '0',
        MINIMAX_API_KEY: ''
      }
    });

    expect(result.stdout).toContain('Skipping MiniMax live smoke test');
    expect(result.stderr).toBe('');
  });

  it('skips the business ArtTask MiniMax smoke unless explicitly enabled', async () => {
    const result = await execFileAsync('npx', ['tsx', 'scripts/art-task-minimax-smoke.ts'], {
      env: {
        ...process.env,
        RUN_MINIMAX_LIVE_TESTS: '0',
        MINIMAX_API_KEY: ''
      }
    });

    expect(result.stdout).toContain('Skipping live MiniMax ArtTask smoke test');
    expect(result.stderr).toBe('');
  });

  it('fails the business ArtTask MiniMax smoke clearly when live mode has no API key', async () => {
    await expect(
      execFileAsync('npx', ['tsx', 'scripts/art-task-minimax-smoke.ts'], {
        env: {
          ...process.env,
          RUN_MINIMAX_LIVE_TESTS: '1',
          MINIMAX_API_KEY: ''
        }
      })
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('MiniMax ArtTask live smoke test requires MINIMAX_API_KEY when RUN_MINIMAX_LIVE_TESTS=1.')
    });
  });
});
