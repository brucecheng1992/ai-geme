import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createAssetPackMetadataBridgeSummary,
  createAssetResolverDiagnosticsSummary,
  exportRuntimeArtAssetMetadataFromDirectory,
  validateArtAssetMetadataFiles,
  type AssetPackBridgeCandidate,
  type RuntimeArtAssetMetadataExportArtifact
} from '../../packages/asset-pipeline/src/index.js';
import { buildAssetSemanticCanaryComparison, renderAssetSemanticCanaryComparisonJson } from '../../scripts/asset-semantic-canary-comparison.js';
import { buildArtLibraryMetadataCanaryDryRunSummary, isArtLibraryMetadataFixtureRoot } from '../../scripts/asset-semantic-small-art-library-dry-run.js';

const fixtureRoot = 'tests/fixtures/art-library-batch-zero-pirate-kit-v0.1';
const metadataDir = `${fixtureRoot}/metadata`;
const outputRoot = 'artifacts/asset-semantic-canary';
const missingAssetId = 'pirate_kit_missing_requested_asset_001';
const missingCandidateAssetId = 'pirate_kit_barrel_001';
const candidateWithoutRuntimeId = 'pirate_kit_candidate_without_runtime_001';
const blockedContextId = 'production_default_runtime';
const blockedContextAssetId = 'pirate_kit_barrel_001';
const expectedValidationAssetIds = [
  'pirate_kit_barrel_001',
  'pirate_kit_boat_row_small_001',
  'pirate_kit_bottle_001',
  'pirate_kit_cannon_ball_001',
  'pirate_kit_cannon_mobile_001',
  'pirate_kit_cannon_001',
  'pirate_kit_chest_001',
  'pirate_kit_crate_bottles_001',
  'pirate_kit_crate_001',
  'pirate_kit_flag_pirate_001',
  'pirate_kit_mast_001',
  'pirate_kit_palm_straight_001',
  'pirate_kit_patch_sand_001',
  'pirate_kit_rocks_a_001',
  'pirate_kit_rocks_b_001',
  'pirate_kit_rocks_c_001',
  'pirate_kit_ship_pirate_small_001',
  'pirate_kit_structure_platform_dock_small_001',
  'pirate_kit_tool_paddle_001',
  'pirate_kit_tower_complete_small_001'
] as const;
const expectedRuntimeAssetIds = [
  'pirate_kit_barrel_001',
  'pirate_kit_boat_row_small_001',
  'pirate_kit_bottle_001',
  'pirate_kit_cannon_001',
  'pirate_kit_cannon_ball_001',
  'pirate_kit_cannon_mobile_001',
  'pirate_kit_chest_001',
  'pirate_kit_crate_001',
  'pirate_kit_crate_bottles_001',
  'pirate_kit_flag_pirate_001',
  'pirate_kit_mast_001',
  'pirate_kit_palm_straight_001',
  'pirate_kit_patch_sand_001',
  'pirate_kit_rocks_a_001',
  'pirate_kit_rocks_b_001',
  'pirate_kit_rocks_c_001',
  'pirate_kit_ship_pirate_small_001',
  'pirate_kit_structure_platform_dock_small_001',
  'pirate_kit_tool_paddle_001',
  'pirate_kit_tower_complete_small_001'
] as const;
const expectedAssetCount = expectedValidationAssetIds.length;

describe('Step 13D-B large library batch-zero semantic dry-run', () => {
  it('validates and exports the exact 20 expanded fixture sidecars without source metadata writeback', async () => {
    await expect(isArtLibraryMetadataFixtureRoot(fixtureRoot)).resolves.toBe(true);
    await expect(isArtLibraryMetadataFixtureRoot('tests/fixtures/asset-semantic-canary.briefs.json')).resolves.toBe(false);

    const validationResult = await validateArtAssetMetadataFiles({
      targets: [metadataDir],
      checkPaths: true,
      projectRoot: process.cwd()
    });
    const artifact = await loadBatchZeroArtifact();

    expect(validationResult.ok).toBe(true);
    expect(validationResult.diagnostics).toEqual([]);
    expect(validationResult.files).toHaveLength(expectedAssetCount);
    expect(validationResult.files.map((file) => file.assetId)).toEqual(expectedValidationAssetIds);
    expect(artifact.asset_count).toBe(expectedAssetCount);
    expect(artifact.assets.map((asset) => asset.asset_id)).toEqual(expectedRuntimeAssetIds);
  });

  it('builds default and repair-enabled canary summaries from the same batch-zero fixture', async () => {
    const defaultSummary = await buildArtLibraryMetadataCanaryDryRunSummary({
      fixtureRoot,
      outputDir: `${outputRoot}/20260614Tstep13d-default`,
      repairEnabled: false,
      createdAt: '2026-06-14T01:02:03.000Z'
    });
    const repairEnabledSummary = await buildArtLibraryMetadataCanaryDryRunSummary({
      fixtureRoot,
      outputDir: `${outputRoot}/20260614Tstep13d-repair`,
      repairEnabled: true,
      createdAt: '2026-06-14T01:02:03.000Z'
    });
    const comparison = buildAssetSemanticCanaryComparison({ defaultSummary, repairEnabledSummary });

    expect(defaultSummary).toMatchObject({
      version: 'asset-semantic-canary-v0.1',
      fixturePath: fixtureRoot,
      fixture: {
        kind: 'large_art_library_batch_zero',
        identity: 'art-library-batch-zero-pirate-kit-v0.1',
        assetCount: expectedAssetCount
      },
      total: expectedAssetCount,
      runnable: expectedAssetCount,
      passed: expectedAssetCount,
      failed: 0,
      skipped: 0,
      experimental: 0,
      exitCode: 0,
      repairEnabled: false
    });
    expect(defaultSummary.cases.map((item) => item.id)).toEqual(expectedRuntimeAssetIds);
    expect(defaultSummary.cases.every((item) => item.selectedPacks?.[0] === 'art-library-batch-zero-pirate-kit-v0.1')).toBe(true);

    expect(repairEnabledSummary.fixturePath).toBe(defaultSummary.fixturePath);
    expect(repairEnabledSummary.fixture).toEqual(defaultSummary.fixture);
    expect(repairEnabledSummary.cases.map((item) => item.id)).toEqual(defaultSummary.cases.map((item) => item.id));
    expect(repairEnabledSummary).toMatchObject({
      repairEnabled: true,
      repairAttemptedCount: 0,
      repairFailedCount: 0,
      repair: {
        enabled: true,
        attemptedCount: 0,
        failedCount: 0,
        skippedCount: expectedAssetCount,
        skippedReasons: {
          large_art_library_batch_zero_metadata_only_dry_run: expectedAssetCount
        }
      }
    });
    expect(comparison).toMatchObject({
      ok: true,
      fixture: {
        kind: 'large_art_library_batch_zero',
        identity: 'art-library-batch-zero-pirate-kit-v0.1',
        asset_count: expectedAssetCount
      },
      case_set: {
        total: expectedAssetCount,
        ids: expectedRuntimeAssetIds,
        skipped: 0,
        experimental: 0
      },
      default_run: {
        ok: true,
        failed: 0,
        repair: { enabled: false, attemptedCount: 0, failedCount: 0 }
      },
      repair_enabled_run: {
        ok: true,
        failed: 0,
        repair: { enabled: true, attemptedCount: 0, failedCount: 0 }
      },
      delta: {
        runnable: 0,
        passed: 0,
        failed: 0,
        failure_diagnostic_count: 0,
        repair_failed_count: 0
      }
    });

    assertStableReportJson({
      canary_version: '0.1',
      fixture: fixtureRoot,
      asset_count: defaultSummary.fixture?.assetCount,
      metadata: {
        validated: true,
        runtime_export_asset_count: expectedAssetCount
      },
      canary: {
        default_failed: defaultSummary.failed,
        repair_enabled_failed: repairEnabledSummary.failed,
        comparison_ok: comparison.ok
      }
    });
    assertStableReportJson(renderAssetSemanticCanaryComparisonJson(comparison));
  });

  it('builds green bridge and resolver-adjacent summaries from the same runtime export', async () => {
    const artifact = await loadBatchZeroArtifact();
    const candidates = candidatesFromArtifact(artifact);
    const requestedAssetIds = requestedIdsFromArtifact(artifact);
    const bridge = createAssetPackMetadataBridgeSummary({ runtimeMetadataArtifact: artifact, candidates });
    const resolverDiagnostics = createAssetResolverDiagnosticsSummary({
      runtimeMetadataArtifact: artifact,
      requestedAssetIds
    });

    expect(candidates).toEqual(
      artifact.assets.map((asset) => ({
        asset_id: asset.asset_id,
        source_path: asset.technical.source_path,
        thumbnail_path: asset.technical.thumbnail_path,
        asset_type: asset.asset_type
      }))
    );
    expect(requestedAssetIds).toEqual(expectedRuntimeAssetIds);
    expect(bridge).toEqual({
      bridge_version: '0.1',
      ok: true,
      runtime_asset_count: expectedAssetCount,
      candidate_count: expectedAssetCount,
      matched_count: expectedAssetCount,
      diagnostic_count: 0,
      diagnostics: []
    });
    expect(resolverDiagnostics).toEqual({
      diagnostics_version: '0.1',
      ok: true,
      requested_count: expectedAssetCount,
      resolved_count: expectedAssetCount,
      diagnostic_count: 0,
      diagnostics: []
    });
    assertStableReportJson({ candidates, requestedAssetIds, bridge, resolverDiagnostics });
  });

  it('keeps missing requested id diagnostics deterministic and separate from the green path', async () => {
    const artifact = await loadBatchZeroArtifact();
    const summary = expectDeterministic(() =>
      createAssetResolverDiagnosticsSummary({
        runtimeMetadataArtifact: artifact,
        requestedAssetIds: [missingAssetId]
      })
    );

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
          message: `Requested asset_id "${missingAssetId}" is not present in runtime metadata.`,
          assetId: missingAssetId,
          jsonPath: '$.requestedAssetIds'
        }
      ]
    });
    assertStableReportJson(summary);
  });

  it('keeps bridge negative diagnostics deterministic and separate from the green path', async () => {
    const artifact = await loadBatchZeroArtifact();
    const missingCandidateSummary = expectDeterministic(() =>
      createAssetPackMetadataBridgeSummary({
        runtimeMetadataArtifact: artifact,
        candidates: candidatesFromArtifact(artifact).filter((candidate) => candidate.asset_id !== missingCandidateAssetId)
      })
    );
    const candidateWithoutRuntimeSummary = expectDeterministic(() =>
      createAssetPackMetadataBridgeSummary({
        runtimeMetadataArtifact: artifact,
        candidates: [
          ...candidatesFromArtifact(artifact),
          {
            asset_id: candidateWithoutRuntimeId,
            source_path: `${fixtureRoot}/assets/candidate-without-runtime.glb`,
            thumbnail_path: `${fixtureRoot}/thumbnails/candidate-without-runtime.png`,
            asset_type: 'prop_3d'
          }
        ]
      })
    );

    expect(missingCandidateSummary).toMatchObject({
      bridge_version: '0.1',
      ok: false,
      runtime_asset_count: expectedAssetCount,
      candidate_count: expectedAssetCount - 1,
      matched_count: expectedAssetCount - 1,
      diagnostic_count: 1,
      diagnostics: [
        {
          severity: 'error',
          code: 'ASSET_PACK_METADATA_BRIDGE_RUNTIME_ASSET_WITHOUT_CANDIDATE',
          assetId: missingCandidateAssetId,
          runtimePath: `${fixtureRoot}/assets/barrel.glb`
        }
      ]
    });
    expect(candidateWithoutRuntimeSummary).toMatchObject({
      bridge_version: '0.1',
      ok: false,
      runtime_asset_count: expectedAssetCount,
      candidate_count: expectedAssetCount + 1,
      matched_count: expectedAssetCount,
      diagnostic_count: 1,
      diagnostics: [
        {
          severity: 'error',
          code: 'ASSET_PACK_METADATA_BRIDGE_CANDIDATE_WITHOUT_RUNTIME_ASSET',
          assetId: candidateWithoutRuntimeId,
          candidatePath: `${fixtureRoot}/assets/candidate-without-runtime.glb`
        }
      ]
    });
    assertStableReportJson({ missingCandidateSummary, candidateWithoutRuntimeSummary });
  });

  it('keeps blocked-context diagnostics deterministic and separate when metadata supports it', async () => {
    const artifact = await loadBatchZeroArtifact();
    const summary = expectDeterministic(() =>
      createAssetResolverDiagnosticsSummary({
        runtimeMetadataArtifact: artifact,
        requestedAssetIds: [blockedContextAssetId],
        context: { contextId: blockedContextId }
      })
    );

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
          message: `Requested asset_id "${blockedContextAssetId}" is blocked in context "${blockedContextId}".`,
          assetId: blockedContextAssetId,
          jsonPath: '$.runtimeMetadataArtifact.assets[0].gameplay.blocked_contexts'
        }
      ]
    });
    assertStableReportJson(summary);
  });

  it('keeps generated dry-run artifacts ignored and out of tracked test summaries', async () => {
    const gitignore = await readFile('.gitignore', 'utf8');
    const summary = await buildArtLibraryMetadataCanaryDryRunSummary({
      fixtureRoot,
      outputDir: `${outputRoot}/20260614Tstep13d-default`,
      repairEnabled: false,
      createdAt: '2026-06-14T01:02:03.000Z'
    });

    expect(gitignore.split(/\r?\n/)).toContain('artifacts/');
    expect(summary.cases.flatMap((item) => [item.reportPath, item.manifestPath, item.qaReportPath]).filter(Boolean)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^artifacts\/asset-semantic-canary\/20260614Tstep13d-default\//)
      ])
    );
    assertStableReportJson({
      fixture: summary.fixturePath,
      asset_count: summary.fixture?.assetCount,
      case_ids: summary.cases.map((item) => item.id)
    });
  });
});

async function loadBatchZeroArtifact(): Promise<RuntimeArtAssetMetadataExportArtifact> {
  const result = await exportRuntimeArtAssetMetadataFromDirectory(metadataDir, {
    checkPaths: true,
    projectRoot: process.cwd()
  });
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
  const json = typeof value === 'string' ? value : JSON.stringify(value);
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
