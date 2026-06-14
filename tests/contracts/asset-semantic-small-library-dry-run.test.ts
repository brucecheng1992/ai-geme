import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { buildAssetSemanticCanaryComparison, renderAssetSemanticCanaryComparisonJson } from '../../scripts/asset-semantic-canary-comparison.js';
import { buildSmallArtLibraryCanaryDryRunSummary, isSmallArtLibraryFixtureRoot } from '../../scripts/asset-semantic-small-art-library-dry-run.js';

const fixtureRoot = 'tests/fixtures/art-library-small-v0.1';
const outputRoot = 'artifacts/asset-semantic-canary';
const assetIds = [
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

describe('Step 9C small art library dry-run', () => {
  it('treats only fixture roots with a metadata directory as small art library dry-run input', async () => {
    await expect(isSmallArtLibraryFixtureRoot(fixtureRoot)).resolves.toBe(true);
    await expect(isSmallArtLibraryFixtureRoot('tests/fixtures/asset-semantic-canary.briefs.json')).resolves.toBe(false);
  });

  it('builds default and repair-enabled summaries from the same small library fixture without runtime wiring', async () => {
    const defaultSummary = await buildSmallArtLibraryCanaryDryRunSummary({
      fixtureRoot,
      outputDir: `${outputRoot}/20260613Tstep9c-default`,
      repairEnabled: false,
      createdAt: '2026-06-13T01:02:03.000Z'
    });
    const repairEnabledSummary = await buildSmallArtLibraryCanaryDryRunSummary({
      fixtureRoot,
      outputDir: `${outputRoot}/20260613Tstep9c-repair`,
      repairEnabled: true,
      createdAt: '2026-06-13T01:02:03.000Z'
    });

    expect(defaultSummary).toMatchObject({
      version: 'asset-semantic-canary-v0.1',
      fixturePath: fixtureRoot,
      total: 10,
      runnable: 10,
      passed: 10,
      failed: 0,
      skipped: 0,
      experimental: 0,
      exitCode: 0,
      repairEnabled: false,
      fixture: {
        kind: 'small_art_library',
        identity: 'art-library-small-v0.1',
        assetCount: 10
      },
      counts: {
        needsAssetRepair: 0,
        qaFailed: 0,
        hardMismatch: 0,
        hardUnknown: 0,
        requiredAssetMissing: 0,
        assetLoadFailures: 0,
        placeholderUsed: 0
      }
    });
    expect(defaultSummary.cases.map((item) => item.id)).toEqual(assetIds);
    expect(defaultSummary.cases.every((item) => item.reportPath?.startsWith(`${outputRoot}/20260613Tstep9c-default/`))).toBe(true);
    expect(JSON.stringify(defaultSummary)).not.toContain('/Users/');

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
        skippedCount: 10,
        skippedReasons: {
          small_library_metadata_only_dry_run: 10
        }
      }
    });
  });

  it('compares small library default and repair-enabled summaries without timestamps or machine paths', async () => {
    const comparison = buildAssetSemanticCanaryComparison({
      defaultSummary: await buildSmallArtLibraryCanaryDryRunSummary({
        fixtureRoot,
        outputDir: `${outputRoot}/20260613Tstep9c-default`,
        repairEnabled: false,
        createdAt: '2026-06-13T01:02:03.000Z'
      }),
      repairEnabledSummary: await buildSmallArtLibraryCanaryDryRunSummary({
        fixtureRoot,
        outputDir: `${outputRoot}/20260613Tstep9c-repair`,
        repairEnabled: true,
        createdAt: '2026-06-13T01:02:03.000Z'
      })
    });

    expect(comparison).toMatchObject({
      ok: true,
      fixture: {
        kind: 'small_art_library',
        identity: 'art-library-small-v0.1',
        asset_count: 10
      },
      case_set: {
        total: 10,
        ids: assetIds,
        skipped: 0,
        experimental: 0
      },
      delta: {
        runnable: 0,
        passed: 0,
        failed: 0,
        failure_diagnostic_count: 0,
        medium_warning_count: 0,
        repair_failed_count: 0
      }
    });

    const json = renderAssetSemanticCanaryComparisonJson(comparison);
    expect(json).not.toContain('2026-06-13T');
    expect(json).not.toContain('/Users/');
    expect(json).not.toContain('summary.json');
  });

  it('keeps generated dry-run artifacts under ignored artifact paths', async () => {
    const gitignore = await readFile('.gitignore', 'utf8');
    const summary = await buildSmallArtLibraryCanaryDryRunSummary({
      fixtureRoot,
      outputDir: `${outputRoot}/20260613Tstep9c-default`,
      repairEnabled: false,
      createdAt: '2026-06-13T01:02:03.000Z'
    });

    expect(gitignore.split(/\r?\n/)).toContain('artifacts/');
    expect(summary.cases.flatMap((item) => [item.reportPath, item.manifestPath, item.qaReportPath]).filter(Boolean)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^artifacts\/asset-semantic-canary\/20260613Tstep9c-default\//)
      ])
    );
  });
});
