import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('Art asset metadata validation CLI contracts', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-art-metadata-cli-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('exposes npm run metadata:validate as the command entrypoint', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.['metadata:validate']).toBe('tsx scripts/validate-art-asset-metadata.ts');
  });

  it('returns exit code 2 for usage errors', async () => {
    await expect(runCli(['--unknown-flag'])).resolves.toMatchObject({
      status: 2,
      stdout: '',
      stderr: expect.stringContaining('Unknown argument: --unknown-flag')
    });
    await expect(runCli(['--project-root'])).resolves.toMatchObject({
      status: 2,
      stdout: '',
      stderr: expect.stringContaining('Expected a value after --project-root')
    });
  });

  it('returns exit code 2 for invalid input paths', async () => {
    const missingPath = join(root, 'missing.asset.json');

    await expect(runCli([missingPath])).resolves.toMatchObject({
      status: 2,
      stdout: expect.stringContaining('INPUT_PATH_NOT_FOUND'),
      stderr: ''
    });
  });
});

type CliResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

function runCli(args: string[]): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/validate-art-asset-metadata.ts', ...args], {
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}
