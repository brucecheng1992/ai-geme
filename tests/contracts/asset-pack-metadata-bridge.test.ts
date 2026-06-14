import { describe, expect, it } from 'vitest';

import {
  createAssetPackMetadataBridgeSummary,
  exportRuntimeArtAssetMetadataFromDirectory,
  type AssetPackBridgeCandidate,
  type RuntimeArtAssetMetadataExportArtifact
} from '../../packages/asset-pipeline/src/index.js';

const SMALL_LIBRARY_METADATA_DIR = 'tests/fixtures/art-library-small-v0.1/metadata';

describe('asset pack metadata bridge contracts', () => {
  it('matches small-library runtime metadata against explicit test-only candidates', async () => {
    const artifact = await loadSmallLibraryArtifact();
    const candidates = candidatesFromArtifact(artifact);

    const summary = createAssetPackMetadataBridgeSummary({ runtimeMetadataArtifact: artifact, candidates });

    expect(summary).toEqual({
      bridge_version: '0.1',
      ok: true,
      runtime_asset_count: 10,
      candidate_count: 10,
      matched_count: 10,
      diagnostic_count: 0,
      diagnostics: []
    });
    expect(candidates.every((candidate) => candidate.source_path?.startsWith('tests/fixtures/art-library-small-v0.1/assets/'))).toBe(true);
    expect(JSON.stringify({ artifact, candidates, summary })).not.toContain('assets/asset-packs');
  });

  it('reports runtime metadata assets without candidates deterministically', async () => {
    const artifact = await loadSmallLibraryArtifact();
    const candidates = candidatesFromArtifact(artifact).filter((candidate) => candidate.asset_id !== 'creature_kenney_cube_pet_cat_001');

    const summary = createAssetPackMetadataBridgeSummary({ runtimeMetadataArtifact: artifact, candidates });

    expect(summary).toMatchObject({
      ok: false,
      matched_count: 9,
      diagnostic_count: 1,
      diagnostics: [
        {
          severity: 'error',
          code: 'ASSET_PACK_METADATA_BRIDGE_RUNTIME_ASSET_WITHOUT_CANDIDATE',
          assetId: 'creature_kenney_cube_pet_cat_001',
          runtimePath: 'tests/fixtures/art-library-small-v0.1/assets/animal-cat.glb',
          jsonPath: '$.runtimeMetadataArtifact.assets[2].asset_id'
        }
      ]
    });
  });

  it('reports candidates without runtime metadata deterministically', async () => {
    const artifact = await loadSmallLibraryArtifact();
    const candidates = [
      ...candidatesFromArtifact(artifact),
      {
        asset_id: 'creature_kenney_cube_pet_otter_001',
        source_path: 'tests/fixtures/art-library-small-v0.1/assets/animal-otter.glb',
        thumbnail_path: 'tests/fixtures/art-library-small-v0.1/thumbnails/animal-otter.png',
        asset_type: 'creature'
      }
    ];

    const summary = createAssetPackMetadataBridgeSummary({ runtimeMetadataArtifact: artifact, candidates });

    expect(summary.diagnostics).toEqual([
      expect.objectContaining({
        severity: 'error',
        code: 'ASSET_PACK_METADATA_BRIDGE_CANDIDATE_WITHOUT_RUNTIME_ASSET',
        assetId: 'creature_kenney_cube_pet_otter_001',
        candidatePath: 'tests/fixtures/art-library-small-v0.1/assets/animal-otter.glb',
        jsonPath: '$.candidates[10].asset_id'
      })
    ]);
  });

  it('reports missing and duplicate candidate asset_id values', async () => {
    const artifact = await loadSmallLibraryArtifact();
    const candidates = [
      ...candidatesFromArtifact(artifact),
      { source_path: 'tests/fixtures/art-library-small-v0.1/assets/missing-id.glb' },
      { ...candidatesFromArtifact(artifact)[0] }
    ];

    const summary = createAssetPackMetadataBridgeSummary({ runtimeMetadataArtifact: artifact, candidates });

    expect(summary.diagnostics).toEqual([
      expect.objectContaining({
        severity: 'error',
        code: 'ASSET_PACK_METADATA_BRIDGE_DUPLICATE_CANDIDATE_ASSET_ID',
        assetId: candidatesFromArtifact(artifact)[0].asset_id,
        jsonPath: '$.candidates'
      }),
      expect.objectContaining({
        severity: 'error',
        code: 'ASSET_PACK_METADATA_BRIDGE_MISSING_ASSET_ID',
        jsonPath: '$.candidates[10].asset_id'
      })
    ]);
  });

  it('reports duplicate runtime asset_id values from defensive artifact input', async () => {
    const artifact = await loadSmallLibraryArtifact();
    const duplicateArtifact = cloneArtifact(artifact);
    duplicateArtifact.assets.push({ ...duplicateArtifact.assets[0] });
    duplicateArtifact.asset_count = duplicateArtifact.assets.length;

    const summary = createAssetPackMetadataBridgeSummary({
      runtimeMetadataArtifact: duplicateArtifact,
      candidates: candidatesFromArtifact(artifact)
    });

    expect(summary.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        code: 'ASSET_PACK_METADATA_BRIDGE_DUPLICATE_RUNTIME_ASSET_ID',
        assetId: duplicateArtifact.assets[0].asset_id,
        jsonPath: '$.runtimeMetadataArtifact.assets'
      })
    );
  });

  it('reports source and thumbnail path mismatches without reading files', async () => {
    const artifact = await loadSmallLibraryArtifact();
    const candidates = candidatesFromArtifact(artifact);
    candidates[0] = {
      ...candidates[0],
      source_path: 'tests/fixtures/art-library-small-v0.1/assets/wrong.glb',
      thumbnail_path: 'tests/fixtures/art-library-small-v0.1/thumbnails/wrong.png'
    };

    const summary = createAssetPackMetadataBridgeSummary({ runtimeMetadataArtifact: artifact, candidates });

    expect(summary.diagnostics).toEqual([
      expect.objectContaining({
        severity: 'error',
        code: 'ASSET_PACK_METADATA_BRIDGE_SOURCE_PATH_MISMATCH',
        assetId: candidates[0].asset_id,
        candidatePath: 'tests/fixtures/art-library-small-v0.1/assets/wrong.glb',
        jsonPath: '$.candidates[0].source_path'
      }),
      expect.objectContaining({
        severity: 'error',
        code: 'ASSET_PACK_METADATA_BRIDGE_THUMBNAIL_PATH_MISMATCH',
        assetId: candidates[0].asset_id,
        candidatePath: 'tests/fixtures/art-library-small-v0.1/thumbnails/wrong.png',
        jsonPath: '$.candidates[0].thumbnail_path'
      })
    ]);
  });

  it('rejects absolute paths in candidate and runtime bridge fields without leaking local paths', async () => {
    const artifact = await loadSmallLibraryArtifact();
    const candidates = candidatesFromArtifact(artifact);
    candidates[0] = { ...candidates[0], source_path: '/Users/example/private/animal-cat.glb' };

    const candidateSummary = createAssetPackMetadataBridgeSummary({ runtimeMetadataArtifact: artifact, candidates });
    expect(candidateSummary.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        code: 'ASSET_PACK_METADATA_BRIDGE_ABSOLUTE_PATH_REJECTED',
        assetId: candidates[0].asset_id,
        jsonPath: '$.candidates[0].source_path'
      })
    );
    expect(JSON.stringify(candidateSummary)).not.toContain('/Users/example');

    const absoluteRuntimeArtifact = cloneArtifact(artifact);
    absoluteRuntimeArtifact.assets[0] = {
      ...absoluteRuntimeArtifact.assets[0],
      technical: {
        ...absoluteRuntimeArtifact.assets[0].technical,
        source_path: '/Users/example/private/animal-cat.glb'
      }
    };
    const runtimeSummary = createAssetPackMetadataBridgeSummary({
      runtimeMetadataArtifact: absoluteRuntimeArtifact,
      candidates: candidatesFromArtifact(artifact)
    });
    expect(runtimeSummary.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        code: 'ASSET_PACK_METADATA_BRIDGE_ABSOLUTE_PATH_REJECTED',
        assetId: absoluteRuntimeArtifact.assets[0].asset_id,
        jsonPath: '$.runtimeMetadataArtifact.assets[0].technical.source_path'
      })
    );
    expect(JSON.stringify(runtimeSummary)).not.toContain('/Users/example');
  });

  it('is deterministic and does not mutate bridge inputs', async () => {
    const artifact = await loadSmallLibraryArtifact();
    const candidates = candidatesFromArtifact(artifact).reverse();
    const artifactBefore = JSON.stringify(artifact);
    const candidatesBefore = JSON.stringify(candidates);

    const first = createAssetPackMetadataBridgeSummary({ runtimeMetadataArtifact: artifact, candidates });
    const second = createAssetPackMetadataBridgeSummary({ runtimeMetadataArtifact: artifact, candidates });

    expect(first).toEqual(second);
    expect(JSON.stringify(artifact)).toBe(artifactBefore);
    expect(JSON.stringify(candidates)).toBe(candidatesBefore);
  });
});

async function loadSmallLibraryArtifact(): Promise<RuntimeArtAssetMetadataExportArtifact> {
  const result = await exportRuntimeArtAssetMetadataFromDirectory(SMALL_LIBRARY_METADATA_DIR);
  expect(result.ok).toBe(true);
  expect(result.artifact).toBeDefined();
  return result.artifact!;
}

function candidatesFromArtifact(artifact: RuntimeArtAssetMetadataExportArtifact): AssetPackBridgeCandidate[] {
  return artifact.assets.map((asset) => ({
    asset_id: asset.asset_id,
    source_path: asset.technical.source_path,
    thumbnail_path: asset.technical.thumbnail_path,
    asset_type: asset.asset_type
  }));
}

function cloneArtifact(artifact: RuntimeArtAssetMetadataExportArtifact): RuntimeArtAssetMetadataExportArtifact {
  return JSON.parse(JSON.stringify(artifact)) as RuntimeArtAssetMetadataExportArtifact;
}
