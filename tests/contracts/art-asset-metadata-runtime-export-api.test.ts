import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  exportRuntimeArtAssetMetadataFromDirectory,
  exportRuntimeArtAssetMetadataFromFile,
  formatRuntimeArtAssetMetadataExportArtifactJson,
  type RuntimeArtAssetMetadataExportArtifact
} from '../../packages/asset-pipeline/src/index.js';

describe('Art asset runtime metadata export API contracts', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-runtime-export-api-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('exports the checked-in example manifests into deterministic runtime metadata', async () => {
    const result = await exportRuntimeArtAssetMetadataFromDirectory('assets/metadata/examples');

    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.artifact).toMatchObject({
      runtime_metadata_version: '0.1',
      generated_by: 'metadata:export-runtime',
      asset_count: 5
    });
    expect(result.artifact?.assets.map((asset) => asset.asset_id)).toEqual([
      'char_forest_npc_merchant_001',
      'env_forest_area_clearing_001',
      'material_forest_texture_wood_plank_001',
      'prop_forest_container_barrel_001',
      'ui_global_icon_inventory_001'
    ]);
    expect(formatRuntimeArtAssetMetadataExportArtifactJson(result.artifact!)).toBe(
      formatRuntimeArtAssetMetadataExportArtifactJson(result.artifact!)
    );
  });

  it('uses a grouped allowlisted runtime-safe shape', async () => {
    const filePath = await writeMetadata('prop.asset.json', createValidManifest('prop_forest_container_barrel_001'));

    const result = await exportRuntimeArtAssetMetadataFromFile(filePath);

    expect(result.ok).toBe(true);
    expect(result.artifact?.assets).toEqual([
      {
        runtime_metadata_version: '0.1',
        asset_id: 'prop_forest_container_barrel_001',
        asset_type: 'prop',
        title: 'Destructible Wooden Barrel',
        description: 'A stylized wooden barrel for forest village loot scenes.',
        status: 'approved',
        version: '1.0.0',
        semantic: {
          tags: ['barrel', 'wood', 'storage'],
          visual_style: ['stylized', 'hand_painted'],
          world: 'forest_village',
          mood: ['warm']
        },
        gameplay: {
          role: ['loot_container', 'cover'],
          affordances: ['destructible', 'container'],
          allowed_contexts: ['forest_village'],
          blocked_contexts: ['sci_fi_city']
        },
        technical: {
          file_format: 'png',
          source_path: 'assets/art/props/barrel.png',
          thumbnail_path: 'assets/art/props/barrel_thumb.png',
          texture_resolution: '1024x1024',
          polycount_lod0: 0,
          platform_budget: ['desktop', 'mobile']
        },
        relations: {
          compatible_with: ['env_forest_area_clearing_001']
        }
      }
    ]);
  });

  it('excludes AI generation, rights, workflow, search, and non-allowlisted relation fields', async () => {
    const filePath = await writeMetadata('prop.asset.json', createValidManifest('prop_forest_container_barrel_001'));

    const result = await exportRuntimeArtAssetMetadataFromFile(filePath);
    const artifactJson = JSON.stringify(result.artifact);

    expect(result.ok).toBe(true);
    for (const forbidden of [
      'ai_generation',
      'prompt_summary',
      'negative_prompt_summary',
      'seed',
      'ai_system_used',
      'rights',
      'creator',
      'owner',
      'third_party_sources',
      'workflow',
      'reviewed_by',
      'review_notes',
      'search',
      'embedding_input',
      'derived_from',
      'depends_on',
      'used_by',
      'engine_targets'
    ]) {
      expect(artifactJson).not.toContain(forbidden);
    }
  });

  it('blocks invalid metadata, malformed JSON, and duplicate asset_id before export', async () => {
    const invalidPath = await writeMetadata('invalid.asset.json', {
      ...createValidManifest('prop_forest_container_barrel_001'),
      title: undefined
    });
    await writeFile(join(root, 'malformed.asset.json'), '{ "asset_id": ', 'utf8');
    await writeMetadata('dupe-a.asset.json', createValidManifest('ui_global_icon_inventory_001', 'ui'));
    await writeMetadata('nested/dupe-b.asset.json', createValidManifest('ui_global_icon_inventory_001', 'ui'));

    await expect(exportRuntimeArtAssetMetadataFromFile(invalidPath)).resolves.toMatchObject({
      ok: false,
      diagnostics: [expect.objectContaining({ code: 'ART_ASSET_METADATA_RUNTIME_EXPORT_VALIDATION_FAILED', jsonPath: '$.title' })]
    });
    await expect(exportRuntimeArtAssetMetadataFromFile(join(root, 'malformed.asset.json'))).resolves.toMatchObject({
      ok: false,
      diagnostics: [expect.objectContaining({ code: 'ART_ASSET_METADATA_RUNTIME_EXPORT_VALIDATION_FAILED' })]
    });
    const duplicateResult = await exportRuntimeArtAssetMetadataFromDirectory(root);
    expect(duplicateResult.ok).toBe(false);
    expect(duplicateResult.artifact).toBeUndefined();
    expect(duplicateResult.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ART_ASSET_METADATA_RUNTIME_EXPORT_DUPLICATE_ASSET_ID', assetId: 'ui_global_icon_inventory_001' })
      ])
    );
  });

  it('rejects unsafe absolute or non-project-relative exported path-like fields', async () => {
    const absolutePathManifest = createValidManifest('prop_forest_container_barrel_001');
    absolutePathManifest.technical.source_path = '/tmp/barrel.png';
    const filePath = await writeMetadata('absolute.asset.json', absolutePathManifest);

    const result = await exportRuntimeArtAssetMetadataFromFile(filePath);

    expect(result.ok).toBe(false);
    expect(result.artifact).toBeUndefined();
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'ART_ASSET_METADATA_RUNTIME_EXPORT_ABSOLUTE_PATH_REJECTED',
        jsonPath: '$.technical.source_path',
        assetId: 'prop_forest_container_barrel_001'
      })
    ]);
  });

  it('keeps path existence checks explicit and passes projectRoot through when enabled', async () => {
    const filePath = await writeMetadata('prop.asset.json', createValidManifest('prop_forest_container_barrel_001'));

    await expect(exportRuntimeArtAssetMetadataFromFile(filePath)).resolves.toMatchObject({ ok: true });
    await expect(exportRuntimeArtAssetMetadataFromFile(filePath, { checkPaths: true, projectRoot: root })).resolves.toMatchObject({
      ok: false,
      diagnostics: expect.arrayContaining([expect.objectContaining({ code: 'ART_ASSET_METADATA_RUNTIME_EXPORT_VALIDATION_FAILED' })])
    });

    await mkdir(join(root, 'assets/art/props'), { recursive: true });
    await writeFile(join(root, 'assets/art/props/barrel.png'), 'source', 'utf8');
    await writeFile(join(root, 'assets/art/props/barrel_thumb.png'), 'thumb', 'utf8');
    await expect(exportRuntimeArtAssetMetadataFromFile(filePath, { checkPaths: true, projectRoot: root })).resolves.toMatchObject({
      ok: true,
      diagnostics: []
    });
  });

  it('sorts assets by asset_id and produces repeatable JSON', async () => {
    await writeMetadata('b.asset.json', createValidManifest('ui_global_icon_inventory_001', 'ui'));
    await writeMetadata('a.asset.json', createValidManifest('prop_forest_container_barrel_001'));

    const first = await exportRuntimeArtAssetMetadataFromDirectory(root);
    const second = await exportRuntimeArtAssetMetadataFromDirectory(root);

    expect(first.ok).toBe(true);
    expect(first.artifact?.assets.map((asset) => asset.asset_id)).toEqual(['prop_forest_container_barrel_001', 'ui_global_icon_inventory_001']);
    expect(formatRuntimeArtAssetMetadataExportArtifactJson(first.artifact!)).toBe(
      formatRuntimeArtAssetMetadataExportArtifactJson(second.artifact!)
    );
  });

  it('writes outputPath artifacts only after a successful export and may overwrite on success', async () => {
    await writeMetadata('prop.asset.json', createValidManifest('prop_forest_container_barrel_001'));
    const outputPath = join(root, 'dist/metadata/runtime-art-assets.json');

    const first = await exportRuntimeArtAssetMetadataFromDirectory(root, { outputPath });
    expect(first.ok).toBe(true);
    expect(JSON.parse(await readFile(outputPath, 'utf8')) as RuntimeArtAssetMetadataExportArtifact).toMatchObject({ asset_count: 1 });

    await writeFile(outputPath, 'old artifact', 'utf8');
    const second = await exportRuntimeArtAssetMetadataFromDirectory(root, { outputPath });
    expect(second.ok).toBe(true);
    expect(await readFile(outputPath, 'utf8')).toContain('"generated_by": "metadata:export-runtime"');
  });

  it('does not create or overwrite outputPath artifacts when validation fails', async () => {
    await writeMetadata('invalid.asset.json', { ...createValidManifest('prop_forest_container_barrel_001'), title: undefined });
    const missingOutputPath = join(root, 'dist/missing/runtime-art-assets.json');
    const existingOutputPath = join(root, 'existing/runtime-art-assets.json');
    await mkdir(dirname(existingOutputPath), { recursive: true });
    await writeFile(existingOutputPath, 'keep me', 'utf8');

    await expect(exportRuntimeArtAssetMetadataFromDirectory(root, { outputPath: missingOutputPath })).resolves.toMatchObject({ ok: false });
    await expect(readFile(missingOutputPath, 'utf8')).rejects.toThrow();

    await expect(exportRuntimeArtAssetMetadataFromDirectory(root, { outputPath: existingOutputPath })).resolves.toMatchObject({ ok: false });
    expect(await readFile(existingOutputPath, 'utf8')).toBe('keep me');
  });

  async function writeMetadata(relativePath: string, value: unknown): Promise<string> {
    const filePath = join(root, relativePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    return filePath;
  }
});

function createValidManifest(assetId: string, assetType: 'prop' | 'ui' = 'prop') {
  return {
    asset_id: assetId,
    asset_type: assetType,
    asset_subtype: assetType === 'ui' ? 'icon' : 'container',
    title: assetType === 'ui' ? 'Inventory Bag Icon' : 'Destructible Wooden Barrel',
    description:
      assetType === 'ui'
        ? 'A readable inventory bag icon for global game UI.'
        : 'A stylized wooden barrel for forest village loot scenes.',
    version: '1.0.0',
    status: 'approved',
    semantic: {
      world: 'forest_village',
      semantic_tags: assetType === 'ui' ? ['inventory', 'bag', 'ui'] : ['barrel', 'wood', 'storage'],
      visual_style: ['stylized', 'hand_painted'],
      mood: ['warm']
    },
    gameplay: {
      gameplay_role: assetType === 'ui' ? ['ui', 'icon'] : ['loot_container', 'cover'],
      affordances: assetType === 'ui' ? ['inventory_action', 'interactable'] : ['destructible', 'container'],
      allowed_contexts: assetType === 'ui' ? ['global_ui'] : ['forest_village'],
      blocked_contexts: assetType === 'ui' ? [] : ['sci_fi_city']
    },
    technical: {
      source_path: assetType === 'ui' ? 'assets/art/ui/inventory.png' : 'assets/art/props/barrel.png',
      thumbnail_path: assetType === 'ui' ? 'assets/art/ui/inventory_thumb.png' : 'assets/art/props/barrel_thumb.png',
      file_format: 'png',
      engine_targets: ['web'],
      texture_resolution: '1024x1024',
      polycount_lod0: 0,
      platform_budget: ['desktop', 'mobile']
    },
    ai_generation: {
      generated_by_ai: true,
      ai_system_used: 'internal_image_pipeline',
      ai_system_version: 'v0_3',
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
    },
    relations: {
      variant_of: null,
      derived_from: ['material_forest_texture_wood_plank_001'],
      depends_on: ['material_forest_texture_wood_plank_001'],
      compatible_with: assetType === 'ui' ? [] : ['env_forest_area_clearing_001'],
      used_by: ['demo_project']
    },
    search: {
      embedding_input: 'internal embedding text'
    }
  };
}
