import { describe, expect, it } from 'vitest';

import { ArtAssetPreviewService } from '../../apps/maker-api/src/art-asset-preview/art-asset-preview.service.js';
import {
  createSmallLibraryWorkbenchPreview,
  exportRuntimeArtAssetMetadataFromDirectory,
  SMALL_LIBRARY_WORKBENCH_PREVIEW_FIXTURE_ROOT,
  type ArtAssetWorkbenchPreview,
  type RuntimeArtAssetMetadataExportArtifact
} from '../../packages/asset-pipeline/src/index.js';

const SMALL_LIBRARY_METADATA_DIR = `${SMALL_LIBRARY_WORKBENCH_PREVIEW_FIXTURE_ROOT}/metadata`;

describe('Step 12B Workbench small-library asset preview', () => {
  it('builds a read-only preview from runtime-safe small fixture metadata', async () => {
    const artifact = await loadSmallLibraryArtifact();
    const preview = createSmallLibraryWorkbenchPreview(artifact);

    expect(preview).toMatchObject({
      preview_version: '0.1',
      source: 'small-library-runtime-safe-export',
      fixture: SMALL_LIBRARY_WORKBENCH_PREVIEW_FIXTURE_ROOT,
      read_only: true,
      ok: true,
      runtime_metadata_version: '0.1',
      asset_count: 10,
      diagnostics: {
        bridge: {
          ok: true,
          matched_count: 10,
          diagnostic_count: 0,
          items: []
        },
        resolver: {
          ok: true,
          resolved_count: 10,
          diagnostic_count: 0,
          items: []
        }
      }
    });
    expect(preview.assets).toHaveLength(10);
    expect(preview.assets.every((asset) => asset.technical.thumbnail_path.startsWith(`${SMALL_LIBRARY_WORKBENCH_PREVIEW_FIXTURE_ROOT}/thumbnails/`))).toBe(true);
    expect(preview.allowed_fields).toContain('technical.thumbnail_path');
    expect(preview.blocked_fields).toContain('technical.source_path');
    assertPreviewDoesNotExposeSensitiveFields(preview);
  });

  it('keeps preview generation deterministic and non-mutating', async () => {
    const artifact = await loadSmallLibraryArtifact();
    const before = JSON.stringify(artifact);
    const first = createSmallLibraryWorkbenchPreview(artifact);
    const second = createSmallLibraryWorkbenchPreview(artifact);

    expect(JSON.stringify(artifact)).toBe(before);
    expect(first).toEqual(second);
    assertPreviewDoesNotExposeSensitiveFields(first);
  });

  it('fails closed before exposing out-of-scope runtime metadata paths', async () => {
    const artifact = await loadSmallLibraryArtifact();
    const invalidArtifact: RuntimeArtAssetMetadataExportArtifact = {
      ...artifact,
      assets: artifact.assets.map((asset, index) =>
        index === 0
          ? {
              ...asset,
              technical: {
                ...asset.technical,
                source_path: 'assets/asset-packs/large-library/cat.glb',
                thumbnail_path: 'assets/asset-packs/large-library/cat.png'
              }
            }
          : asset
      )
    };
    const before = JSON.stringify(invalidArtifact);

    expect(() => createSmallLibraryWorkbenchPreview(invalidArtifact)).toThrow('Small library Workbench preview rejected an out-of-scope runtime metadata path.');
    expect(() => createSmallLibraryWorkbenchPreview(invalidArtifact)).not.toThrow('assets/asset-packs/large-library');
    expect(JSON.stringify(invalidArtifact)).toBe(before);
  });

  it('serves the same safe preview through the maker-api service', async () => {
    const response = await new ArtAssetPreviewService().getSmallLibraryPreview();

    expect(response.ok).toBe(true);
    expect(response.preview.source).toBe('small-library-runtime-safe-export');
    expect(response.preview.fixture).toBe(SMALL_LIBRARY_WORKBENCH_PREVIEW_FIXTURE_ROOT);
    expect(response.preview.asset_count).toBe(10);
    expect(response.preview.assets).toHaveLength(10);
    assertPreviewDoesNotExposeSensitiveFields(response.preview);
  });
});

async function loadSmallLibraryArtifact(): Promise<RuntimeArtAssetMetadataExportArtifact> {
  const result = await exportRuntimeArtAssetMetadataFromDirectory(SMALL_LIBRARY_METADATA_DIR);
  expect(result.ok).toBe(true);
  expect(result.diagnostics).toEqual([]);
  expect(result.artifact).toBeDefined();
  return result.artifact!;
}

function assertPreviewDoesNotExposeSensitiveFields(preview: ArtAssetWorkbenchPreview): void {
  const json = JSON.stringify(preview);
  for (const asset of preview.assets) {
    expect(asset.technical).not.toHaveProperty('source_path');
  }
  expect(json).not.toContain('"source_path":');
  expect(json).not.toContain('"review_notes"');
  expect(json).not.toContain('"third_party_sources"');
  expect(json).not.toContain('"embedding_input"');
  expect(json).not.toContain('"generated_by_ai"');
  expect(json).not.toContain('"created_at"');
  expect(json).not.toContain('"updated_at"');
  expect(json).not.toContain('https://kenney.nl');
  expect(json).not.toContain('/Users/');
  expect(json).not.toContain('assets/asset-packs');
  expect(json).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
}
