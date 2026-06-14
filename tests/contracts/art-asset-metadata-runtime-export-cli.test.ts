import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('Art asset runtime metadata export CLI contracts', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-runtime-export-cli-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('exposes npm run metadata:export-runtime as the root script entrypoint', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.['metadata:export-runtime']).toBe('tsx scripts/export-art-runtime-metadata.ts');
  });

  it('prints only artifact JSON to stdout for successful non-json export without --out', async () => {
    const filePath = await writeMetadata('prop.asset.json', createValidManifest('prop_forest_container_barrel_001'));

    const result = await runCli([filePath]);
    const artifact = JSON.parse(result.stdout) as { generated_by: string; asset_count: number };

    expect(result).toMatchObject({ status: 0, stderr: '' });
    expect(artifact).toMatchObject({ generated_by: 'metadata:export-runtime', asset_count: 1 });
    expect(result.stdout).not.toContain('OK ');
  });

  it('prints a short success message and writes the artifact for successful non-json export with --out', async () => {
    const filePath = await writeMetadata('prop.asset.json', createValidManifest('prop_forest_container_barrel_001'));
    const outputPath = join(root, 'dist/runtime-art-assets.json');

    const result = await runCli([filePath, '--out', outputPath]);

    expect(result).toMatchObject({ status: 0, stderr: '' });
    expect(result.stdout).toBe(`OK 1 runtime metadata assets -> ${outputPath}\n`);
    expect(JSON.parse(await readFile(outputPath, 'utf8'))).toMatchObject({ asset_count: 1 });
  });

  it('keeps --json stdout deterministic and includes outputPath plus artifact with --out', async () => {
    const filePath = await writeMetadata('prop.asset.json', createValidManifest('prop_forest_container_barrel_001'));
    const outputPath = join(root, 'dist/runtime-art-assets.json');

    const first = await runCli(['--json', filePath, '--out', outputPath]);
    const second = await runCli(['--json', filePath, '--out', outputPath]);
    const envelope = JSON.parse(first.stdout) as { ok: boolean; outputPath: string; artifact?: { asset_count: number } };

    expect(first).toMatchObject({ status: 0, stderr: '' });
    expect(second).toMatchObject({ status: 0, stderr: '' });
    expect(first.stdout).toBe(second.stdout);
    expect(envelope).toMatchObject({ ok: true, outputPath, artifact: { asset_count: 1 } });
    expect(first.stdout).not.toContain('OK ');
  });

  it('returns exit code 1 and writes diagnostics to stderr for validation/export errors', async () => {
    const invalidPath = await writeMetadata('invalid.asset.json', {
      ...createValidManifest('prop_forest_container_barrel_001'),
      title: undefined
    });

    const result = await runCli([invalidPath]);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('ART_ASSET_METADATA_RUNTIME_EXPORT_VALIDATION_FAILED');
  });

  it('returns exit code 2 for usage errors', async () => {
    const filePath = await writeMetadata('prop.asset.json', createValidManifest('prop_forest_container_barrel_001'));

    await expect(runCli(['--unknown-flag'])).resolves.toMatchObject({
      status: 2,
      stdout: '',
      stderr: expect.stringContaining('Unknown argument: --unknown-flag')
    });
    await expect(runCli([])).resolves.toMatchObject({
      status: 2,
      stdout: '',
      stderr: expect.stringContaining('Expected a .asset.json file or directory input.')
    });
    await expect(runCli(['--file', root])).resolves.toMatchObject({
      status: 2,
      stdout: '',
      stderr: expect.stringContaining('Expected --file input to be a .asset.json file.')
    });
    await expect(runCli(['--dir', filePath])).resolves.toMatchObject({
      status: 2,
      stdout: '',
      stderr: expect.stringContaining('Expected --dir input to be a directory.')
    });
  });

  it('does not overwrite --out artifacts on validation failure', async () => {
    const invalidPath = await writeMetadata('invalid.asset.json', {
      ...createValidManifest('prop_forest_container_barrel_001'),
      title: undefined
    });
    const outputPath = join(root, 'dist/runtime-art-assets.json');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, 'keep me', 'utf8');

    const result = await runCli([invalidPath, '--out', outputPath]);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('ART_ASSET_METADATA_RUNTIME_EXPORT_VALIDATION_FAILED');
    expect(await readFile(outputPath, 'utf8')).toBe('keep me');
  });

  it('keeps --check-paths explicit and off by default', async () => {
    const filePath = await writeMetadata('prop.asset.json', createValidManifest('prop_forest_container_barrel_001'));

    await expect(runCli([filePath])).resolves.toMatchObject({ status: 0, stderr: '' });

    const checked = await runCli(['--check-paths', '--project-root', root, filePath]);
    expect(checked.status).toBe(1);
    expect(checked.stderr).toContain('ART_ASSET_METADATA_RUNTIME_EXPORT_VALIDATION_FAILED');
  });

  async function writeMetadata(relativePath: string, value: unknown): Promise<string> {
    const filePath = join(root, relativePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    return filePath;
  }
});

type CliResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

function runCli(args: string[]): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/export-art-runtime-metadata.ts', ...args], {
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

function createValidManifest(assetId: string) {
  return {
    asset_id: assetId,
    asset_type: 'prop',
    asset_subtype: 'container',
    title: 'Destructible Wooden Barrel',
    description: 'A stylized wooden barrel for forest village loot scenes.',
    version: '1.0.0',
    status: 'approved',
    semantic: {
      world: 'forest_village',
      semantic_tags: ['barrel', 'wood', 'storage'],
      visual_style: ['stylized', 'hand_painted'],
      mood: ['warm']
    },
    gameplay: {
      gameplay_role: ['loot_container', 'cover'],
      affordances: ['destructible', 'container'],
      allowed_contexts: ['forest_village'],
      blocked_contexts: ['sci_fi_city']
    },
    technical: {
      source_path: 'assets/art/props/barrel.png',
      thumbnail_path: 'assets/art/props/barrel_thumb.png',
      file_format: 'png'
    },
    ai_generation: {
      generated_by_ai: true,
      prompt_summary: 'stylized hand-painted asset',
      negative_prompt_summary: 'no logo',
      seed: '123456'
    },
    rights: {
      creator: 'internal_art_team',
      owner: 'studio',
      license: 'internal_project_only',
      commercial_use: true,
      training_use_allowed: false,
      third_party_sources: [],
      rights_risk_level: 'low'
    },
    workflow: {
      owner: 'lead_artist',
      reviewed_by: 'art_director',
      review_notes: 'Approved.',
      updated_at: '2026-06-12'
    }
  };
}
