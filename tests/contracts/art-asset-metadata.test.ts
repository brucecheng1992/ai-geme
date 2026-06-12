import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ART_ASSET_CONTROLLED_VOCABULARY,
  ArtAssetControlledVocabularySchema,
  ArtAssetMetadataSchema,
  parseArtAssetMetadata
} from '../../packages/asset-pipeline/src/index.js';

type JsonSchemaNode = {
  $id?: string;
  $ref?: string;
  enum?: string[];
  pattern?: string;
  required?: string[];
  additionalProperties?: boolean;
  properties?: Record<string, JsonSchemaNode>;
  $defs?: Record<string, JsonSchemaNode>;
};

const metadataRoot = join(process.cwd(), 'assets/metadata');
const examplesRoot = join(metadataRoot, 'examples');

describe('Art asset metadata v0.1 contracts', () => {
  it('publishes a JSON Schema artifact for non-TypeScript asset tooling', async () => {
    const jsonSchema = JSON.parse(await readFile(join(metadataRoot, 'schema/ai_game_art_asset.schema.json'), 'utf8')) as JsonSchemaNode;

    expect(jsonSchema.$id).toBe('https://ai-game-maker.local/schemas/ai-game-art-asset-metadata.v0.1.schema.json');
    expect(jsonSchema.required).toEqual(
      expect.arrayContaining(['asset_id', 'asset_type', 'title', 'description', 'semantic', 'gameplay', 'technical', 'rights', 'workflow'])
    );
    expect(jsonSchema.properties).toHaveProperty('ai_generation');
    const technicalProperties = jsonSchema.properties?.technical.properties;
    expect(jsonSchema.$defs?.slug.pattern).toBe('^[a-z][a-z0-9_]{1,63}$');
    expect(jsonSchema.$defs?.project_relative_path.pattern).toContain('(?![a-zA-Z][a-zA-Z0-9+.-]*:)');
    expect(technicalProperties?.source_path).toEqual({ '$ref': '#/$defs/project_relative_path' });
    expect(technicalProperties?.thumbnail_path).toEqual({ '$ref': '#/$defs/project_relative_path' });
    expect(jsonSchema.properties?.relations.additionalProperties).toBe(false);
    expect(jsonSchema.properties?.search.additionalProperties).toBe(false);
    for (const [definition, expected] of [
      ['asset_type', ART_ASSET_CONTROLLED_VOCABULARY.asset_type],
      ['visual_style', ART_ASSET_CONTROLLED_VOCABULARY.visual_style],
      ['mood', ART_ASSET_CONTROLLED_VOCABULARY.mood],
      ['gameplay_role', ART_ASSET_CONTROLLED_VOCABULARY.gameplay_role],
      ['affordance', ART_ASSET_CONTROLLED_VOCABULARY.affordances],
      ['workflow_status', ART_ASSET_CONTROLLED_VOCABULARY.workflow_status],
      ['license_type', ART_ASSET_CONTROLLED_VOCABULARY.license_type],
      ['human_edit_level', ART_ASSET_CONTROLLED_VOCABULARY.human_edit_level],
      ['rights_risk_level', ART_ASSET_CONTROLLED_VOCABULARY.rights_risk_level],
      ['file_format', ART_ASSET_CONTROLLED_VOCABULARY.file_format]
    ] as const) {
      expect(jsonSchema.$defs?.[definition].enum).toEqual(expected);
    }
  });

  it('validates the controlled vocabulary artifact used by metadata manifests', async () => {
    const vocabulary = JSON.parse(await readFile(join(metadataRoot, 'controlled_vocabulary.json'), 'utf8')) as unknown;
    const parsed = ArtAssetControlledVocabularySchema.parse(vocabulary);

    expect(parsed.version).toBe('art-asset-controlled-vocabulary-v0.1');
    expect(parsed.asset_type).toContain('character');
    expect(parsed.visual_style).toContain('stylized');
    expect(parsed.gameplay_role).toContain('npc');
    expect(parsed.affordances).toContain('talkable');
    expect(parsed.workflow_status).toContain('approved');
    expect(parsed.license_type).toContain('internal_project_only');
    expect(parsed.rights_risk_level).toContain('low');
    expect(parsed).toEqual(ART_ASSET_CONTROLLED_VOCABULARY);
  });

  it('validates the first five example sidecar manifests', async () => {
    const filenames = (await readdir(examplesRoot)).filter((filename) => filename.endsWith('.asset.json')).sort();
    expect(filenames).toEqual([
      'character_npc_merchant.asset.json',
      'environment_prop_forest_clearing.asset.json',
      'material_texture_wood_plank.asset.json',
      'prop_container_barrel.asset.json',
      'ui_icon_inventory.asset.json'
    ]);

    const parsed = await Promise.all(
      filenames.map(async (filename) => parseArtAssetMetadata(JSON.parse(await readFile(join(examplesRoot, filename), 'utf8'))))
    );

    expect(parsed.map((manifest) => manifest.asset_id)).toEqual([
      'char_forest_npc_merchant_001',
      'env_forest_area_clearing_001',
      'material_forest_texture_wood_plank_001',
      'prop_forest_container_barrel_001',
      'ui_global_icon_inventory_001'
    ]);
    expect(new Set(parsed.map((manifest) => manifest.asset_id)).size).toBe(parsed.length);
  });

  it('rejects manifests with missing required semantic tags or invalid enum values', () => {
    const manifest = createValidManifest();
    expect(ArtAssetMetadataSchema.parse(manifest).asset_id).toBe('prop_forest_container_barrel_001');

    expect(() =>
      ArtAssetMetadataSchema.parse({
        ...manifest,
        semantic: {
          ...manifest.semantic,
          semantic_tags: []
        }
      })
    ).toThrow();

    expect(() =>
      ArtAssetMetadataSchema.parse({
        ...manifest,
        asset_type: 'npc'
      })
    ).toThrow();
  });

  it('rejects unsafe project paths before metadata enters the asset library', () => {
    const manifest = createValidManifest();
    expect(ArtAssetMetadataSchema.parse(manifest).technical.source_path).toBe('assets/art/props/barrel.png');

    expect(() =>
      ArtAssetMetadataSchema.parse({
        ...manifest,
        technical: {
          ...manifest.technical,
          source_path: '../outside.png'
        }
      })
    ).toThrow();

    expect(() =>
      ArtAssetMetadataSchema.parse({
        ...manifest,
        technical: {
          ...manifest.technical,
          thumbnail_path: 'https://example.com/thumb.png'
        }
      })
    ).toThrow();
  });

  it('locks v0.1 semantic tags to lowercase underscore slugs', () => {
    const manifest = createValidManifest();
    expect(
      ArtAssetMetadataSchema.parse({
        ...manifest,
        semantic: {
          ...manifest.semantic,
          semantic_tags: ['cat_player', 'forest2']
        }
      }).semantic.semantic_tags
    ).toEqual(['cat_player', 'forest2']);

    for (const tag of ['3d_asset', 'x', 'cat-player']) {
      expect(() =>
        ArtAssetMetadataSchema.parse({
          ...manifest,
          semantic: {
            ...manifest.semantic,
            semantic_tags: [tag]
          }
        })
      ).toThrow();
    }
  });
});

function createValidManifest() {
  return {
    asset_id: 'prop_forest_container_barrel_001',
    asset_type: 'prop',
    asset_subtype: 'container',
    title: 'Destructible Wooden Barrel',
    description: 'A stylized wooden barrel for forest village loot scenes.',
    version: '1.0.0',
    status: 'approved',
    semantic: {
      world: 'forest_village',
      semantic_tags: ['barrel', 'wood', 'storage'],
      visual_style: ['stylized', 'hand_painted']
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
      generated_by_ai: true
    },
    rights: {
      creator: 'internal_art_team',
      license: 'internal_project_only',
      commercial_use: true,
      training_use_allowed: false,
      rights_risk_level: 'low'
    },
    workflow: {
      owner: 'lead_prop_artist',
      updated_at: '2026-06-12'
    }
  };
}
