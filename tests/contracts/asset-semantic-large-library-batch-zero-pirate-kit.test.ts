import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { exportRuntimeArtAssetMetadataFromDirectory, validateArtAssetMetadataFiles } from '../../packages/asset-pipeline/src/index.js';

const fixtureRoot = 'tests/fixtures/art-library-batch-zero-pirate-kit-v0.1';
const selectedBasenames = [
  'barrel',
  'boat-row-small',
  'cannon',
  'chest',
  'crate',
  'flag-pirate',
  'palm-straight',
  'rocks-a',
  'ship-pirate-small',
  'tower-complete-small'
] as const;

const expectedAssetIds = [
  'pirate_kit_barrel_001',
  'pirate_kit_boat_row_small_001',
  'pirate_kit_cannon_001',
  'pirate_kit_chest_001',
  'pirate_kit_crate_001',
  'pirate_kit_flag_pirate_001',
  'pirate_kit_palm_straight_001',
  'pirate_kit_rocks_a_001',
  'pirate_kit_ship_pirate_small_001',
  'pirate_kit_tower_complete_small_001'
] as const;

const allowedExtensions = new Set(['.glb', '.png', '.json', '.txt', '.md']);
const hardTotalBytes = 30 * 1024 * 1024;
const hardAssetBytes = 5 * 1024 * 1024;
const thumbnailMaxBytes = 512 * 1024;

describe('Large art library batch-zero Pirate Kit fixture', () => {
  it('keeps the exact Step 13C-A approved 10-asset subset with matched assets, thumbnails, and sidecars', async () => {
    await expect(readSortedNames(fixtureRoot)).resolves.toEqual(['README.md', 'assets', 'metadata', 'source', 'thumbnails']);

    expect(stripExtensions(await readSortedNames(join(fixtureRoot, 'assets')), '.glb')).toEqual(selectedBasenames);
    expect(stripExtensions(await readSortedNames(join(fixtureRoot, 'thumbnails')), '.png')).toEqual(selectedBasenames);
    expect(stripExtensions(await readSortedNames(join(fixtureRoot, 'metadata')), '.asset.json')).toEqual(selectedBasenames);
  });

  it('keeps the fixture within Step 13C-A size, format, and no-full-archive limits', async () => {
    const files = await listFixtureFiles(fixtureRoot);

    expect(files).toHaveLength(32);
    expect(files.map((file) => file.relativePath)).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\.zip$/),
        expect.stringMatching(/\.fbx$/),
        expect.stringMatching(/\.obj$/),
        expect.stringMatching(/\.mtl$/),
        expect.stringMatching(/Overview\.html$/),
        expect.stringMatching(/^Previews\//),
        expect.stringMatching(/^Models\//),
        expect.stringMatching(/Sample\.png$/),
        expect.stringMatching(/Preview\.png$/),
        expect.stringMatching(/URL\.(txt|url)$/i)
      ])
    );

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    expect(totalBytes).toBeLessThanOrEqual(hardTotalBytes);

    for (const file of files) {
      expect(allowedExtensions.has(extname(file.relativePath))).toBe(true);
      if (file.relativePath.startsWith('assets/')) {
        expect(file.size).toBeLessThanOrEqual(hardAssetBytes);
      }
      if (file.relativePath.startsWith('thumbnails/')) {
        expect(file.size).toBeLessThanOrEqual(thumbnailMaxBytes);
      }
    }
  });

  it('validates sidecar metadata and referenced fixture paths without runtime wiring', async () => {
    const result = await validateArtAssetMetadataFiles({
      targets: [join(fixtureRoot, 'metadata')],
      checkPaths: true,
      projectRoot: process.cwd()
    });

    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.files.map((file) => file.assetId)).toEqual(expectedAssetIds);
  });

  it('keeps metadata paths project-relative and under the Step 13C-B fixture root', async () => {
    const seenAssetIds = new Set<string>();

    for (const basename of selectedBasenames) {
      const metadata = JSON.parse(await readFile(join(fixtureRoot, 'metadata', `${basename}.asset.json`), 'utf8')) as {
        asset_id: string;
        technical: { source_path: string; thumbnail_path: string };
        gameplay: { allowed_contexts: string[]; blocked_contexts: string[] };
        rights: { license: string; third_party_sources: string[] };
      };

      expect(seenAssetIds.has(metadata.asset_id)).toBe(false);
      seenAssetIds.add(metadata.asset_id);
      expect(metadata.technical.source_path).toBe(`${fixtureRoot}/assets/${basename}.glb`);
      expect(metadata.technical.thumbnail_path).toBe(`${fixtureRoot}/thumbnails/${basename}.png`);
      expect(metadata.technical.source_path).not.toMatch(/^\/|:|\.\./);
      expect(metadata.technical.thumbnail_path).not.toMatch(/^\/|:|\.\./);
      expect(metadata.technical.source_path).not.toContain('assets/asset-packs/');
      expect(metadata.technical.thumbnail_path).not.toContain('assets/asset-packs/');
      expect(metadata.gameplay.allowed_contexts).toContain('pirate_kit_batch_zero');
      expect(metadata.gameplay.blocked_contexts).toEqual(['production_default_runtime', 'large_library_rollout']);
      expect(metadata.rights.license).toBe('cc0');
      expect(metadata.rights.third_party_sources).toEqual([
        'https://kenney.nl/assets/pirate-kit',
        'https://kenney.nl/media/pages/assets/pirate-kit/e6d4bb1525-1771333093/kenney_pirate-kit.zip'
      ]);
    }

    expect([...seenAssetIds].sort()).toEqual([...expectedAssetIds]);
  });

  it('exports runtime-safe metadata without internal provenance-sensitive fields', async () => {
    const result = await exportRuntimeArtAssetMetadataFromDirectory(join(fixtureRoot, 'metadata'));

    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.artifact?.asset_count).toBe(10);
    expect(result.artifact?.assets.map((asset) => asset.asset_id)).toEqual(expectedAssetIds);

    const artifactJson = JSON.stringify(result.artifact);
    for (const forbidden of [
      'rights',
      'third_party_sources',
      'workflow',
      'review_notes',
      'search',
      'embedding_input',
      'creator',
      'owner',
      'ai_generation'
    ]) {
      expect(artifactJson).not.toContain(forbidden);
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
