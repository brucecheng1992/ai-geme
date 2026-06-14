import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  formatArtAssetMetadataValidationText,
  formatArtAssetMetadataValidationJson,
  getArtAssetMetadataValidationExitCode,
  validateArtAssetMetadataFiles
} from '../../packages/asset-pipeline/src/index.js';

describe('Art asset metadata validation command contracts', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-art-metadata-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('validates the checked-in example manifest directory', async () => {
    const result = await validateArtAssetMetadataFiles({ targets: ['assets/metadata/examples'] });

    expect(result.ok).toBe(true);
    expect(result.files.map((file) => file.assetId)).toEqual([
      'char_forest_npc_merchant_001',
      'env_forest_area_clearing_001',
      'material_forest_texture_wood_plank_001',
      'prop_forest_container_barrel_001',
      'ui_global_icon_inventory_001'
    ]);
    expect(result.diagnostics).toEqual([]);
    expect(getArtAssetMetadataValidationExitCode(result)).toBe(0);
  });

  it('reports missing required fields and invalid controlled vocabulary values with json paths', async () => {
    const invalidPath = await writeMetadata('invalid.asset.json', {
      ...createValidManifest('prop_forest_container_barrel_001'),
      title: undefined,
      asset_type: 'npc'
    });

    const result = await validateArtAssetMetadataFiles({ targets: [invalidPath], cwd: root });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'error', code: 'REQUIRED_FIELD_MISSING', filePath: invalidPath, jsonPath: '$.title', assetId: 'prop_forest_container_barrel_001' }),
        expect.objectContaining({ severity: 'error', code: 'INVALID_CONTROLLED_VOCABULARY', filePath: invalidPath, jsonPath: '$.asset_type', assetId: 'prop_forest_container_barrel_001' })
      ])
    );
    expect(getArtAssetMetadataValidationExitCode(result)).toBe(1);
  });

  it('reports duplicate asset_id across directory validation', async () => {
    await writeMetadata('a.asset.json', createValidManifest('prop_forest_container_barrel_001'));
    await writeMetadata('nested/b.asset.json', createValidManifest('prop_forest_container_barrel_001'));

    const result = await validateArtAssetMetadataFiles({ targets: [root], cwd: root });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ severity: 'error', code: 'DUPLICATE_ASSET_ID', jsonPath: '$.asset_id', assetId: 'prop_forest_container_barrel_001' }),
      expect.objectContaining({ severity: 'error', code: 'DUPLICATE_ASSET_ID', jsonPath: '$.asset_id', assetId: 'prop_forest_container_barrel_001' })
    ]);
  });

  it('reports duplicate asset_id even when one manifest has schema errors', async () => {
    await writeMetadata('a.asset.json', createValidManifest('prop_forest_container_barrel_001'));
    await writeMetadata('nested/b.asset.json', { ...createValidManifest('prop_forest_container_barrel_001'), title: undefined });

    const result = await validateArtAssetMetadataFiles({ targets: [root], cwd: root });

    expect(result.ok).toBe(false);
    expect(result.diagnostics.filter((diagnostic) => diagnostic.code === 'DUPLICATE_ASSET_ID')).toHaveLength(2);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'REQUIRED_FIELD_MISSING', jsonPath: '$.title', assetId: 'prop_forest_container_barrel_001' })
      ])
    );
    expect(getArtAssetMetadataValidationExitCode(result)).toBe(1);
  });

  it('returns command error exit code for invalid input targets', async () => {
    const result = await validateArtAssetMetadataFiles({ targets: [join(root, 'missing.asset.json')], cwd: root });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: 'error',
        code: 'INPUT_PATH_NOT_FOUND',
        filePath: join(root, 'missing.asset.json')
      })
    ]);
    expect(getArtAssetMetadataValidationExitCode(result)).toBe(2);
  });

  it('reports malformed JSON with a stable diagnostic', async () => {
    const malformedPath = join(root, 'malformed.asset.json');
    await writeFile(malformedPath, '{ "asset_id": ', 'utf8');

    const result = await validateArtAssetMetadataFiles({ targets: [malformedPath], cwd: root });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual([
      {
        severity: 'error',
        code: 'MALFORMED_JSON',
        message: 'Metadata file is not valid JSON.',
        filePath: malformedPath
      }
    ]);
  });

  it('renders deterministic JSON output for CI', async () => {
    const invalidPath = await writeMetadata('invalid.asset.json', {
      ...createValidManifest('prop_forest_container_barrel_001'),
      semantic: {
        ...createValidManifest('prop_forest_container_barrel_001').semantic,
        semantic_tags: ['cat-player']
      }
    });

    const result = await validateArtAssetMetadataFiles({ targets: [invalidPath], cwd: root });
    const output = formatArtAssetMetadataValidationJson(result);

    expect(output).toBe(`${JSON.stringify(result, null, 2)}\n`);
    expect(JSON.parse(output)).toMatchObject({
      version: 'art-asset-metadata-validation-v0.1',
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          code: 'INVALID_FIELD_FORMAT',
          filePath: invalidPath,
          jsonPath: '$.semantic.semantic_tags.0',
          assetId: 'prop_forest_container_barrel_001'
        }
      ]
    });
  });

  it('renders human-readable validation output', async () => {
    const invalidPath = await writeMetadata('invalid.asset.json', {
      ...createValidManifest('prop_forest_container_barrel_001'),
      technical: {
        ...createValidManifest('prop_forest_container_barrel_001').technical,
        source_path: '../outside.png'
      }
    });

    const result = await validateArtAssetMetadataFiles({ targets: [invalidPath], cwd: root });

    expect(formatArtAssetMetadataValidationText(result)).toContain('FAILED 1 diagnostics across 1 metadata files');
    expect(formatArtAssetMetadataValidationText(result)).toContain(
      `INVALID_FIELD_FORMAT ${invalidPath} $.technical.source_path prop_forest_container_barrel_001`
    );
  });

  it('checks source and thumbnail path existence only when explicitly enabled', async () => {
    const manifestPath = await writeMetadata('prop.asset.json', createValidManifest('prop_forest_container_barrel_001'));

    await expect(validateArtAssetMetadataFiles({ targets: [manifestPath], cwd: root })).resolves.toMatchObject({ ok: true });

    const missingPathResult = await validateArtAssetMetadataFiles({ targets: [manifestPath], cwd: root, checkPaths: true, projectRoot: root });
    expect(missingPathResult.ok).toBe(false);
    expect(missingPathResult.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(['SOURCE_PATH_MISSING', 'THUMBNAIL_PATH_MISSING']);

    await mkdir(join(root, 'assets/art/props'), { recursive: true });
    await writeFile(join(root, 'assets/art/props/barrel.png'), 'source', 'utf8');
    await writeFile(join(root, 'assets/art/props/barrel_thumb.png'), 'thumb', 'utf8');

    await expect(
      validateArtAssetMetadataFiles({ targets: [manifestPath], cwd: root, checkPaths: true, projectRoot: root })
    ).resolves.toMatchObject({ ok: true, diagnostics: [] });
  });

  async function writeMetadata(relativePath: string, value: unknown): Promise<string> {
    const filePath = join(root, relativePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    return filePath;
  }
});

function createValidManifest(assetId: string) {
  return {
    asset_id: assetId,
    asset_type: 'prop',
    asset_subtype: 'container',
    title: 'Destructible Wooden Barrel',
    description: 'A stylized wooden barrel for forest village loot scenes.',
    version: '1.0.0',
    status: 'approved',
    semantic: { world: 'forest_village', semantic_tags: ['barrel', 'wood', 'storage'], visual_style: ['stylized', 'hand_painted'] },
    gameplay: { gameplay_role: ['loot_container', 'cover'], affordances: ['destructible', 'container'], allowed_contexts: ['forest_village'], blocked_contexts: ['sci_fi_city'] },
    technical: { source_path: 'assets/art/props/barrel.png', thumbnail_path: 'assets/art/props/barrel_thumb.png', file_format: 'png' },
    ai_generation: { generated_by_ai: true },
    rights: { creator: 'internal_art_team', license: 'internal_project_only', commercial_use: true, training_use_allowed: false, rights_risk_level: 'low' },
    workflow: { owner: 'lead_prop_artist', updated_at: '2026-06-12' }
  };
}
