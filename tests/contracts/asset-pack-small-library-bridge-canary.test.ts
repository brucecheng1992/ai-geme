import { describe, expect, it } from 'vitest';

import {
  createAssetPackMetadataBridgeSummary,
  createAssetResolverDiagnosticsSummary,
  exportRuntimeArtAssetMetadataFromDirectory,
  type AssetPackBridgeCandidate,
  type RuntimeArtAssetMetadataExportArtifact
} from '../../packages/asset-pipeline/src/index.js';

const FIXTURE_ROOT = 'tests/fixtures/art-library-small-v0.1';
const SMALL_LIBRARY_METADATA_DIR = `${FIXTURE_ROOT}/metadata`;
const MISSING_ASSET_ID = 'creature_kenney_cube_pet_otter_001';
const BLOCKED_CONTEXT_ID = 'production_default_runtime';
const BLOCKED_CONTEXT_ASSET_ID = 'creature_kenney_cube_pet_cat_001';
const EXPECTED_ASSET_IDS = [
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
] as const;

describe('Step 10B small library bridge canary', () => {
  it('builds a fixture-only green canary from runtime-safe metadata and explicit candidates', async () => {
    const artifact = await loadSmallLibraryArtifact();
    const candidates = candidatesFromArtifact(artifact);
    const requestedAssetIds = requestedIdsFromArtifact(artifact);
    const bridge = createAssetPackMetadataBridgeSummary({ runtimeMetadataArtifact: artifact, candidates });
    const resolverDiagnostics = createAssetResolverDiagnosticsSummary({
      runtimeMetadataArtifact: artifact,
      requestedAssetIds
    });

    expect(artifact.asset_count).toBe(10);
    expect(requestedAssetIds).toEqual(EXPECTED_ASSET_IDS);
    expect(candidates).toEqual(
      artifact.assets.map((asset) => ({
        asset_id: asset.asset_id,
        source_path: asset.technical.source_path,
        thumbnail_path: asset.technical.thumbnail_path,
        asset_type: asset.asset_type
      }))
    );
    expect(candidates).toHaveLength(10);
    expect(candidates.every((candidate) => candidate.source_path?.startsWith(`${FIXTURE_ROOT}/assets/`))).toBe(true);
    expect(candidates.every((candidate) => candidate.thumbnail_path?.startsWith(`${FIXTURE_ROOT}/thumbnails/`))).toBe(true);

    const canarySummary = {
      canary_version: '0.1',
      fixture: FIXTURE_ROOT,
      asset_count: artifact.asset_count,
      bridge: {
        ok: bridge.ok,
        matched_count: bridge.matched_count,
        diagnostic_count: bridge.diagnostic_count
      },
      resolver_diagnostics: {
        ok: resolverDiagnostics.ok,
        requested_count: resolverDiagnostics.requested_count,
        resolved_count: resolverDiagnostics.resolved_count,
        diagnostic_count: resolverDiagnostics.diagnostic_count
      }
    };

    expect(bridge).toEqual({
      bridge_version: '0.1',
      ok: true,
      runtime_asset_count: 10,
      candidate_count: 10,
      matched_count: 10,
      diagnostic_count: 0,
      diagnostics: []
    });
    expect(resolverDiagnostics).toEqual({
      diagnostics_version: '0.1',
      ok: true,
      requested_count: 10,
      resolved_count: 10,
      diagnostic_count: 0,
      diagnostics: []
    });
    expect(canarySummary).toEqual({
      canary_version: '0.1',
      fixture: FIXTURE_ROOT,
      asset_count: 10,
      bridge: {
        ok: true,
        matched_count: 10,
        diagnostic_count: 0
      },
      resolver_diagnostics: {
        ok: true,
        requested_count: 10,
        resolved_count: 10,
        diagnostic_count: 0
      }
    });
    assertStableReportJson({ candidates, requestedAssetIds, canarySummary, bridge, resolverDiagnostics });
  });

  it('keeps missing requested id diagnostics separate from the green canary', async () => {
    const artifact = await loadSmallLibraryArtifact();
    const summary = expectDeterministic(() => createAssetResolverDiagnosticsSummary({
      runtimeMetadataArtifact: artifact,
      requestedAssetIds: [MISSING_ASSET_ID]
    }));

    expect(summary).toEqual({
      diagnostics_version: '0.1',
      ok: false,
      requested_count: 1,
      resolved_count: 0,
      diagnostic_count: 1,
      diagnostics: [
        {
          severity: 'error',
          code: 'ASSET_RESOLVER_DIAGNOSTIC_MISSING_ASSET_ID',
          message: `Requested asset_id "${MISSING_ASSET_ID}" is not present in runtime metadata.`,
          assetId: MISSING_ASSET_ID,
          jsonPath: '$.requestedAssetIds'
        }
      ]
    });
    assertStableReportJson(summary);
  });

  it('keeps bridge negative diagnostics separate from the green canary', async () => {
    const artifact = await loadSmallLibraryArtifact();
    const candidates = candidatesFromArtifact(artifact).filter((candidate) => candidate.asset_id !== BLOCKED_CONTEXT_ASSET_ID);
    const summary = expectDeterministic(() => createAssetPackMetadataBridgeSummary({ runtimeMetadataArtifact: artifact, candidates }));

    expect(summary).toMatchObject({
      bridge_version: '0.1',
      ok: false,
      runtime_asset_count: 10,
      candidate_count: 9,
      matched_count: 9,
      diagnostic_count: 1,
      diagnostics: [
        {
          severity: 'error',
          code: 'ASSET_PACK_METADATA_BRIDGE_RUNTIME_ASSET_WITHOUT_CANDIDATE',
          message: `Runtime metadata asset "${BLOCKED_CONTEXT_ASSET_ID}" has no bridge candidate.`,
          assetId: BLOCKED_CONTEXT_ASSET_ID,
          runtimePath: `${FIXTURE_ROOT}/assets/animal-cat.glb`,
          jsonPath: '$.runtimeMetadataArtifact.assets[2].asset_id'
        }
      ]
    });
    assertStableReportJson(summary);
  });

  it('keeps blocked-context diagnostics separate from the green canary when fixture metadata supports it', async () => {
    const artifact = await loadSmallLibraryArtifact();
    const summary = expectDeterministic(() => createAssetResolverDiagnosticsSummary({
      runtimeMetadataArtifact: artifact,
      requestedAssetIds: [BLOCKED_CONTEXT_ASSET_ID],
      context: { contextId: BLOCKED_CONTEXT_ID }
    }));

    expect(summary).toEqual({
      diagnostics_version: '0.1',
      ok: false,
      requested_count: 1,
      resolved_count: 1,
      diagnostic_count: 1,
      diagnostics: [
        {
          severity: 'error',
          code: 'ASSET_RESOLVER_DIAGNOSTIC_BLOCKED_CONTEXT',
          message: `Requested asset_id "${BLOCKED_CONTEXT_ASSET_ID}" is blocked in context "${BLOCKED_CONTEXT_ID}".`,
          assetId: BLOCKED_CONTEXT_ASSET_ID,
          jsonPath: '$.runtimeMetadataArtifact.assets[2].gameplay.blocked_contexts'
        }
      ]
    });
    assertStableReportJson(summary);
  });
});

async function loadSmallLibraryArtifact(): Promise<RuntimeArtAssetMetadataExportArtifact> {
  const result = await exportRuntimeArtAssetMetadataFromDirectory(SMALL_LIBRARY_METADATA_DIR);
  expect(result.ok).toBe(true);
  expect(result.diagnostics).toEqual([]);
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

function requestedIdsFromArtifact(artifact: RuntimeArtAssetMetadataExportArtifact): string[] {
  return artifact.assets.map((asset) => asset.asset_id).sort((left, right) => left.localeCompare(right));
}

function assertStableReportJson(value: unknown): void {
  const json = JSON.stringify(value);
  expect(json).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  expect(json).not.toContain(process.cwd());
  expect(json).not.toContain('/Users/');
  expect(json).not.toContain('assets/asset-packs');
}

function expectDeterministic<T>(build: () => T): T {
  const first = build();
  expect(first).toEqual(build());
  return first;
}
