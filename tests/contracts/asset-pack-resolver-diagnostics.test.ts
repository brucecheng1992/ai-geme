import { describe, expect, it } from 'vitest';

import {
  createAssetResolverDiagnosticsSummary,
  exportRuntimeArtAssetMetadataFromDirectory,
  type RuntimeArtAssetMetadataExportArtifact
} from '../../packages/asset-pipeline/src/index.js';

const SMALL_LIBRARY_METADATA_DIR = 'tests/fixtures/art-library-small-v0.1/metadata';
const CAT_ASSET_ID = 'creature_kenney_cube_pet_cat_001';
const BLOCKED_CONTEXT_ASSET_ID = 'creature_kenney_cube_pet_bee_001';

describe('asset resolver diagnostics contracts', () => {
  it('resolves existing requested asset_id values without diagnostics', async () => {
    const artifact = await loadSmallLibraryArtifact();

    const summary = createAssetResolverDiagnosticsSummary({
      runtimeMetadataArtifact: artifact,
      requestedAssetIds: [CAT_ASSET_ID]
    });

    expect(summary).toEqual({
      diagnostics_version: '0.1',
      ok: true,
      requested_count: 1,
      resolved_count: 1,
      diagnostic_count: 0,
      diagnostics: []
    });
    expect(JSON.stringify({ artifact, summary })).not.toContain('assets/asset-packs');
  });

  it('reports missing requested asset_id values deterministically', async () => {
    const artifact = await loadSmallLibraryArtifact();

    const summary = createAssetResolverDiagnosticsSummary({
      runtimeMetadataArtifact: artifact,
      requestedAssetIds: ['creature_kenney_cube_pet_otter_001']
    });

    expect(summary).toMatchObject({
      ok: false,
      requested_count: 1,
      resolved_count: 0,
      diagnostic_count: 1,
      diagnostics: [
        {
          severity: 'error',
          code: 'ASSET_RESOLVER_DIAGNOSTIC_MISSING_ASSET_ID',
          message: 'Requested asset_id "creature_kenney_cube_pet_otter_001" is not present in runtime metadata.',
          assetId: 'creature_kenney_cube_pet_otter_001',
          jsonPath: '$.requestedAssetIds'
        }
      ]
    });
  });

  it('reports duplicate runtime asset_id values from defensive artifact input', async () => {
    const artifact = await loadSmallLibraryArtifact();
    const duplicateArtifact = cloneArtifact(artifact);
    duplicateArtifact.assets.push({ ...duplicateArtifact.assets[0] });
    duplicateArtifact.asset_count = duplicateArtifact.assets.length;

    const summary = createAssetResolverDiagnosticsSummary({
      runtimeMetadataArtifact: duplicateArtifact,
      requestedAssetIds: [duplicateArtifact.assets[0].asset_id]
    });

    expect(summary.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        code: 'ASSET_RESOLVER_DIAGNOSTIC_DUPLICATE_ASSET_ID',
        assetId: duplicateArtifact.assets[0].asset_id,
        jsonPath: '$.runtimeMetadataArtifact.assets'
      })
    );
  });

  it('rejects absolute runtime metadata paths without leaking local paths', async () => {
    const artifact = await loadSmallLibraryArtifact();
    const absoluteRuntimeArtifact = cloneArtifact(artifact);
    absoluteRuntimeArtifact.assets[0] = {
      ...absoluteRuntimeArtifact.assets[0],
      technical: {
        ...absoluteRuntimeArtifact.assets[0].technical,
        source_path: '/Users/example/private/animal-cat.glb'
      }
    };

    const summary = createAssetResolverDiagnosticsSummary({
      runtimeMetadataArtifact: absoluteRuntimeArtifact,
      requestedAssetIds: [absoluteRuntimeArtifact.assets[0].asset_id]
    });

    expect(summary.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        code: 'ASSET_RESOLVER_DIAGNOSTIC_ABSOLUTE_PATH_REJECTED',
        assetId: absoluteRuntimeArtifact.assets[0].asset_id,
        jsonPath: '$.runtimeMetadataArtifact.assets[0].technical.source_path'
      })
    );
    expect(JSON.stringify(summary)).not.toContain('/Users/example');
  });

  it('reports blocked context only when runtime metadata explicitly blocks the requested context', async () => {
    const artifact = await loadSmallLibraryArtifact();

    const unblockedSummary = createAssetResolverDiagnosticsSummary({
      runtimeMetadataArtifact: artifact,
      requestedAssetIds: [CAT_ASSET_ID]
    });
    expect(unblockedSummary.diagnostics).toEqual([]);

    const blockedSummary = createAssetResolverDiagnosticsSummary({
      runtimeMetadataArtifact: artifact,
      requestedAssetIds: [BLOCKED_CONTEXT_ASSET_ID],
      context: { contextId: 'production_default_runtime' }
    });

    expect(blockedSummary.diagnostics).toEqual([
      expect.objectContaining({
        severity: 'error',
        code: 'ASSET_RESOLVER_DIAGNOSTIC_BLOCKED_CONTEXT',
        assetId: BLOCKED_CONTEXT_ASSET_ID,
        jsonPath: '$.runtimeMetadataArtifact.assets[0].gameplay.blocked_contexts'
      })
    ]);
  });

  it('does not fabricate unsupported semantic diagnostics without explicit expected semantic input', async () => {
    const artifact = await loadSmallLibraryArtifact();

    const summary = createAssetResolverDiagnosticsSummary({
      runtimeMetadataArtifact: artifact,
      requestedAssetIds: [CAT_ASSET_ID],
      context: { contextId: 'small_art_library_fixture' }
    });

    expect(summary.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('ASSET_RESOLVER_DIAGNOSTIC_UNSUPPORTED_SEMANTIC');
  });

  it('is deterministic and does not mutate diagnostic inputs', async () => {
    const artifact = await loadSmallLibraryArtifact();
    const requestedAssetIds = [CAT_ASSET_ID, 'creature_kenney_cube_pet_otter_001'];
    const artifactBefore = JSON.stringify(artifact);
    const requestedBefore = JSON.stringify(requestedAssetIds);

    const first = createAssetResolverDiagnosticsSummary({ runtimeMetadataArtifact: artifact, requestedAssetIds });
    const second = createAssetResolverDiagnosticsSummary({ runtimeMetadataArtifact: artifact, requestedAssetIds });

    expect(first).toEqual(second);
    expect(JSON.stringify(artifact)).toBe(artifactBefore);
    expect(JSON.stringify(requestedAssetIds)).toBe(requestedBefore);
  });
});

async function loadSmallLibraryArtifact(): Promise<RuntimeArtAssetMetadataExportArtifact> {
  const result = await exportRuntimeArtAssetMetadataFromDirectory(SMALL_LIBRARY_METADATA_DIR);
  expect(result.ok).toBe(true);
  expect(result.artifact).toBeDefined();
  return result.artifact!;
}

function cloneArtifact(artifact: RuntimeArtAssetMetadataExportArtifact): RuntimeArtAssetMetadataExportArtifact {
  return JSON.parse(JSON.stringify(artifact)) as RuntimeArtAssetMetadataExportArtifact;
}
