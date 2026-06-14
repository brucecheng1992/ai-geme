import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateArtAssetMetadataFiles } from '../../packages/asset-pipeline/src/index.js';

const fixtureRoot = 'tests/fixtures/art-library-small-v0.1';
const selectedBasenames = [
  'animal-bee',
  'animal-bunny',
  'animal-cat',
  'animal-crab',
  'animal-dog',
  'animal-fish',
  'animal-fox',
  'animal-lion',
  'animal-penguin',
  'animal-tiger'
] as const;

const allowedExtensions = new Set(['.glb', '.png', '.json', '.txt', '.md']);
const hardTotalBytes = 10 * 1024 * 1024;
const preferredTotalBytes = 5 * 1024 * 1024;
const hardFileBytes = 1024 * 1024;
const preferredFileBytes = 512 * 1024;
const thumbnailMaxBytes = 256 * 1024;

describe('Small art library v0.1 fixture', () => {
  it('keeps an exact 10-asset Kenney Cube Pets subset with matched assets, thumbnails, and sidecars', async () => {
    await expect(readSortedNames(fixtureRoot)).resolves.toEqual(['README.md', 'assets', 'metadata', 'source', 'thumbnails']);

    expect(stripExtensions(await readSortedNames(join(fixtureRoot, 'assets')), '.glb')).toEqual(selectedBasenames);
    expect(stripExtensions(await readSortedNames(join(fixtureRoot, 'thumbnails')), '.png')).toEqual(selectedBasenames);
    expect(stripExtensions(await readSortedNames(join(fixtureRoot, 'metadata')), '.asset.json')).toEqual(selectedBasenames);
  });

  it('keeps the whole fixture within Step 9B size and format limits', async () => {
    const files = await listFixtureFiles(fixtureRoot);

    expect(files).toHaveLength(32);
    expect(files.map((file) => file.relativePath)).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\.zip$/),
        expect.stringMatching(/\.fbx$/),
        expect.stringMatching(/\.obj$/),
        expect.stringMatching(/\.mtl$/),
        expect.stringMatching(/Overview\.html$/),
        expect.stringMatching(/Preview\.png$/),
        expect.stringMatching(/URL\.(txt|url)$/i)
      ])
    );

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    expect(totalBytes).toBeLessThanOrEqual(preferredTotalBytes);
    expect(totalBytes).toBeLessThanOrEqual(hardTotalBytes);

    for (const file of files) {
      expect(allowedExtensions.has(extname(file.relativePath))).toBe(true);
      expect(file.size).toBeLessThanOrEqual(preferredFileBytes);
      expect(file.size).toBeLessThanOrEqual(hardFileBytes);
      if (file.relativePath.startsWith('thumbnails/')) {
        expect(file.size).toBeLessThanOrEqual(thumbnailMaxBytes);
      }
    }
  });

  it('validates all sidecar metadata and referenced fixture paths without runtime wiring', async () => {
    const result = await validateArtAssetMetadataFiles({
      targets: [join(fixtureRoot, 'metadata')],
      checkPaths: true,
      projectRoot: process.cwd()
    });

    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.files.map((file) => file.assetId)).toEqual([
      'creature_kenney_cube_pet_bee_001',
      'creature_kenney_cube_pet_bunny_001',
      'creature_kenney_cube_pet_cat_001',
      'creature_kenney_cube_pet_crab_001',
      'creature_kenney_cube_pet_dog_001',
      'creature_kenney_cube_pet_fish_001',
      'creature_kenney_cube_pet_fox_001',
      'creature_kenney_cube_pet_lion_001',
      'creature_kenney_cube_pet_penguin_001',
      'creature_kenney_cube_pet_tiger_001'
    ]);
  });

  it('keeps metadata paths project-relative and under the Step 9B fixture root', async () => {
    for (const basename of selectedBasenames) {
      const metadata = JSON.parse(await readFile(join(fixtureRoot, 'metadata', `${basename}.asset.json`), 'utf8')) as {
        technical: { source_path: string; thumbnail_path: string };
        gameplay: { allowed_contexts: string[]; blocked_contexts: string[] };
      };

      expect(metadata.technical.source_path).toBe(`${fixtureRoot}/assets/${basename}.glb`);
      expect(metadata.technical.thumbnail_path).toBe(`${fixtureRoot}/thumbnails/${basename}.png`);
      expect(metadata.technical.source_path).not.toMatch(/^\/|:|\.\./);
      expect(metadata.technical.thumbnail_path).not.toMatch(/^\/|:|\.\./);
      expect(metadata.gameplay.allowed_contexts).toContain('small_art_library_fixture');
      if (basename === 'animal-cat') {
        expect(metadata.gameplay.allowed_contexts).toContain('production_default_runtime');
        expect(metadata.gameplay.blocked_contexts).toEqual(['large_library_rollout']);
      } else {
        expect(metadata.gameplay.blocked_contexts).toEqual(['production_default_runtime', 'large_library_rollout']);
      }
    }
  });
});

async function readSortedNames(directory: string): Promise<string[]> {
  return (await readdir(directory)).sort();
}

function stripExtensions(names: readonly string[], suffix: string): string[] {
  return names.map((name) => {
    expect(name.endsWith(suffix)).toBe(true);
    return name.slice(0, -suffix.length);
  });
}

async function listFixtureFiles(root: string): Promise<Array<{ relativePath: string; size: number }>> {
  const files: Array<{ relativePath: string; size: number }> = [];

  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
        continue;
      }

      const fileStat = await stat(path);
      files.push({ relativePath: relative(root, path), size: fileStat.size });
    }
  }

  await visit(root);
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}
