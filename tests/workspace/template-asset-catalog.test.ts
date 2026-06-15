import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  TemplateAssetCatalogSchema,
  buildTemplateAssetCatalog
} from '../../apps/maker-api/src/compiler/template-asset-catalog.js';

describe('Template asset catalog contract', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-template-catalog-'));
    await writePackFixture(root);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('builds deterministic local-template entries for current local assets', async () => {
    const repoRoot = process.cwd();
    const first = await buildTemplateAssetCatalog({
      workspaceRoot: repoRoot,
      assetPacksDir: join(repoRoot, 'assets', 'asset-packs'),
      runtimeMetadataDir: join(repoRoot, 'tests', 'fixtures', 'art-library-small-v0.1', 'metadata')
    });
    const second = await buildTemplateAssetCatalog({
      workspaceRoot: repoRoot,
      assetPacksDir: join(repoRoot, 'assets', 'asset-packs'),
      runtimeMetadataDir: join(repoRoot, 'tests', 'fixtures', 'art-library-small-v0.1', 'metadata')
    });

    expect(first).toEqual(second);
    expect(first).toMatchObject({ catalogVersion: 'template_asset_catalog.v1' });
    expect(first.entries.map((entry) => entry.id)).toEqual([...first.entries.map((entry) => entry.id)].sort((left, right) => left.localeCompare(right)));
    expect(first.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'local-pack:kenney-tiny-shooter-tanks:player', relativePath: 'assets/asset-packs/kenney-tiny-shooter-tanks/player.svg' }),
        expect.objectContaining({ id: 'runtime-small-library:creature_kenney_cube_pet_cat_001', relativePath: 'tests/fixtures/art-library-small-v0.1/thumbnails/animal-cat.png' })
      ])
    );
    for (const entry of first.entries) {
      expect(entry.source).toBe('local-template');
      expect(isAbsolute(entry.relativePath)).toBe(false);
      expect(entry.relativePath).not.toContain('..');
      expect(entry.relativePath).not.toContain('\\');
      expect(entry.relativePath).not.toContain('://');
      expect(entry.tags).toEqual([...entry.tags].sort((left, right) => left.localeCompare(right)));
      expect(entry.supportedGenres).toEqual([...entry.supportedGenres].sort((left, right) => left.localeCompare(right)));
    }
  });

  it('rejects duplicate ids and unsafe catalog paths at the schema boundary', () => {
    const entry = {
      id: 'local-pack:agm-mini:player',
      kind: 'sprite',
      source: 'local-template',
      relativePath: 'assets/asset-packs/agm-mini/player.svg',
      tags: ['player'],
      supportedGenres: ['collector'],
      purpose: 'player',
      required: true
    };

    expect(() => TemplateAssetCatalogSchema.parse({ catalogVersion: 'template_asset_catalog.v1', entries: [entry, entry] })).toThrow();
    for (const relativePath of ['/abs.svg', '../escape.svg', 'safe/../escape.svg', 'assets\\player.svg', 'https://example.test/player.svg', 'C:/tmp/player.svg']) {
      expect(() => TemplateAssetCatalogSchema.parse({ catalogVersion: 'template_asset_catalog.v1', entries: [{ ...entry, relativePath }] })).toThrow();
    }
  });

  it('rejects catalog entries whose local pack file is missing', async () => {
    await rm(join(root, 'assets', 'asset-packs', 'agm-mini', 'player.svg'));

    await expect(
      buildTemplateAssetCatalog({
        workspaceRoot: root,
        assetPacksDir: join(root, 'assets', 'asset-packs'),
        runtimeMetadataDir: join(root, 'tests', 'fixtures', 'art-library-small-v0.1', 'metadata')
      })
    ).rejects.toThrow();
  });

  it('rejects local pack directories that do not match pack ids before writing catalog paths', async () => {
    await mkdir(join(root, 'assets', 'asset-packs', 'wrong-dir'), { recursive: true });
    await writeFile(join(root, 'assets', 'asset-packs', 'wrong-dir', 'player.svg'), '<svg></svg>\n', 'utf8');
    await writeFile(
      join(root, 'assets', 'asset-packs', 'wrong-dir', 'pack.json'),
      `${JSON.stringify(
        {
          version: 'local-asset-pack-v0.1',
          id: 'agm-wrong',
          label: 'AGM Wrong',
          license: {
            id: 'CC0-1.0',
            name: 'Creative Commons CC0 1.0 Universal',
            attribution: 'AI Game Maker local asset pack',
            sourceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
          },
          style: { genres: ['collector'], camera: 'top_down', tags: ['arcade'] },
          assets: [{ id: 'player', role: 'player_character', file: 'player.svg', format: 'svg' }]
        },
        null,
        2
      )}\n`,
      'utf8'
    );

    await expect(
      buildTemplateAssetCatalog({
        workspaceRoot: root,
        assetPacksDir: join(root, 'assets', 'asset-packs'),
        runtimeMetadataDir: join(root, 'tests', 'fixtures', 'art-library-small-v0.1', 'metadata')
      })
    ).rejects.toThrow('Local asset pack id agm-wrong must match directory wrong-dir.');
  });
});

async function writePackFixture(root: string): Promise<void> {
  await mkdir(join(root, 'assets', 'asset-packs', 'agm-mini'), { recursive: true });
  await writeFile(join(root, 'assets', 'asset-packs', 'agm-mini', 'player.svg'), '<svg></svg>\n', 'utf8');
  await writeFile(join(root, 'assets', 'asset-packs', 'agm-mini', 'background_main.svg'), '<svg></svg>\n', 'utf8');
  await writeFile(
    join(root, 'assets', 'asset-packs', 'agm-mini', 'pack.json'),
    `${JSON.stringify(
      {
        version: 'local-asset-pack-v0.1',
        id: 'agm-mini',
        label: 'AGM Mini',
        license: {
          id: 'CC0-1.0',
          name: 'Creative Commons CC0 1.0 Universal',
          attribution: 'AI Game Maker local asset pack',
          sourceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
        },
        style: { genres: ['collector'], camera: 'top_down', tags: ['arcade'] },
        assets: [
          { id: 'background_main', role: 'background', file: 'background_main.svg', format: 'svg' },
          { id: 'player', role: 'player_character', file: 'player.svg', format: 'svg' }
        ]
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  await mkdir(join(root, 'tests', 'fixtures', 'art-library-small-v0.1', 'metadata'), { recursive: true });
  await mkdir(join(root, 'tests', 'fixtures', 'art-library-small-v0.1', 'assets'), { recursive: true });
  await mkdir(join(root, 'tests', 'fixtures', 'art-library-small-v0.1', 'thumbnails'), { recursive: true });
  await writeFile(join(root, 'tests', 'fixtures', 'art-library-small-v0.1', 'assets', 'animal-cat.glb'), 'glb\n', 'utf8');
  await writeFile(join(root, 'tests', 'fixtures', 'art-library-small-v0.1', 'thumbnails', 'animal-cat.png'), 'png\n', 'utf8');
  await writeFile(
    join(root, 'tests', 'fixtures', 'art-library-small-v0.1', 'metadata', 'animal-cat.asset.json'),
    `${JSON.stringify(
      {
        asset_id: 'creature_kenney_cube_pet_cat_001',
        project_code: 'ai_game',
        asset_type: 'creature',
        title: 'Cat',
        description: 'Cat fixture',
        version: '1.0.0',
        status: 'approved',
        semantic: {
          world: 'fixture',
          genre: ['arcade'],
          subject: ['cat'],
          semantic_tags: ['cat'],
          visual_style: ['toon'],
          color_palette: ['orange'],
          dominant_colors: ['#D98A3A']
        },
        gameplay: {
          gameplay_role: ['player_character'],
          affordances: ['decorative'],
          rarity: 'common',
          spawnable: false,
          allowed_contexts: ['production_default_runtime'],
          blocked_contexts: [],
          interaction_type: []
        },
        technical: {
          source_path: 'tests/fixtures/art-library-small-v0.1/assets/animal-cat.glb',
          thumbnail_path: 'tests/fixtures/art-library-small-v0.1/thumbnails/animal-cat.png',
          file_format: 'glb',
          engine_targets: ['web'],
          platform_budget: ['desktop']
        },
        ai_generation: { generated_by_ai: false, human_edit_level: 'human_made' },
        rights: {
          creator: 'Kenney',
          owner: 'Kenney',
          license: 'cc0',
          commercial_use: true,
          training_use_allowed: true,
          third_party_sources: ['https://kenney.nl/assets/cube-pets'],
          rights_risk_level: 'low'
        },
        workflow: {
          owner: 'test',
          reviewed_by: 'test',
          review_notes: 'test',
          created_at: '2026-06-13',
          updated_at: '2026-06-13',
          approved_at: '2026-06-13'
        },
        relations: { variant_of: null, derived_from: [], depends_on: [], compatible_with: [], used_by: [] },
        search: { embedding_input: 'cat' }
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}
