import { describe, expect, it } from 'vitest';

import { buildAssetRepairPlan, type AssetRepairPlannerQaReport } from '../../packages/asset-pipeline/src/index.js';
import type { AssetManifest, AssetResolutionReport } from '../../packages/asset-pipeline/src/index.js';

const projectId = 'proj_20260612_repair_001';

describe('Asset repair planner', () => {
  it('plans a blacklist-and-reresolve action for selected local-pack hard semantic mismatches', () => {
    const manifest = createManifest([
      createAsset({
        id: 'player',
        semanticFit: {
          status: 'mismatch',
          confidence: 0,
          strictness: 'hard',
          expectedConcept: 'cat',
          expectedAnyTags: ['cat', 'kitten', 'feline'],
          actualTags: ['tank', 'vehicle'],
          missingTags: ['cat', 'kitten', 'feline'],
          conflictingTags: ['tank', 'vehicle'],
          reason: 'Local asset semantic tags do not satisfy expected cat.'
        }
      })
    ]);
    const report = createResolutionReport(manifest);

    const plan = buildAssetRepairPlan({
      qaReport: createQaReport({ overall_status: 'NEEDS_ASSET_REPAIR', asset_semantic_status: 'FAILED' }),
      manifest,
      resolutionReport: report,
      createdAt: '2026-06-12T06:00:00.000Z',
      maxAttempts: 2
    });

    expect(plan).toMatchObject({
      version: 'asset-repair-plan-v0.1',
      projectId,
      createdAt: '2026-06-12T06:00:00.000Z',
      triggered: true,
      trigger: 'hard_semantic_mismatch',
      maxAttempts: 2,
      items: [
        {
          requirementId: 'player',
          role: 'player_character',
          assetId: 'player',
          source: 'local_asset_pack',
          packId: 'kenney-tiny-shooter-tanks',
          expectedConcept: 'cat',
          semanticFitStatus: 'mismatch',
          strictness: 'hard',
          action: 'blacklist_candidate_then_reresolve',
          actualTags: ['tank', 'vehicle'],
          missingTags: ['cat', 'kitten', 'feline'],
          conflictingTags: ['tank', 'vehicle'],
          selectedPath: 'assets/player.svg',
          semanticFitReason: 'Local asset semantic tags do not satisfy expected cat.'
        }
      ]
    });
    expect(plan.ignored).toEqual([]);
  });

  it('treats a hard requirement without semanticFit as hard unknown', () => {
    const manifest = createManifest([createAsset({ id: 'enemy', role: 'enemy', semanticFit: undefined })]);
    const report = createResolutionReport(manifest, [
      {
        id: 'enemy',
        role: 'enemy',
        selected: {
          source: 'local_asset_pack',
          sourcePack: 'kenney-tiny-shooter-tanks',
          path: 'assets/enemy.svg',
          status: 'ready'
        },
        expectedSemantic: {
          expectedConcept: 'alien',
          expectedAnyTags: ['alien', 'extraterrestrial', 'ufo_creature'],
          forbiddenTags: ['tank', 'vehicle'],
          strictness: 'hard'
        },
        semanticFit: {
          status: 'unknown',
          confidence: 0,
          reason: 'Manifest asset did not include semantic fit metadata.'
        }
      }
    ]);

    const plan = buildAssetRepairPlan({
      qaReport: createQaReport({ asset_semantic_status: 'FAILED' }),
      manifest,
      resolutionReport: report,
      createdAt: '2026-06-12T06:00:00.000Z'
    });

    expect(plan).toMatchObject({
      triggered: true,
      trigger: 'hard_semantic_unknown',
      items: [
        {
          requirementId: 'enemy',
          role: 'enemy',
          expectedConcept: 'alien',
          semanticFitStatus: 'unknown',
          strictness: 'hard',
          action: 'blacklist_candidate_then_reresolve'
        }
      ]
    });
  });

  it('forces template SVG fallback for hard unknown assets without a selected local pack', () => {
    const manifest = createManifest([
      createAsset({
        id: 'player',
        source: 'placeholder',
        sourcePack: undefined,
        semanticFit: {
          status: 'unknown',
          confidence: 0,
          strictness: 'hard',
          expectedConcept: 'cat',
          expectedAnyTags: ['cat', 'kitten', 'feline'],
          missingTags: ['cat', 'kitten', 'feline'],
          reason: 'No asset-level semantic metadata is available for expected cat.'
        }
      })
    ]);

    const plan = buildAssetRepairPlan({
      qaReport: createQaReport({ asset_semantic_status: 'FAILED' }),
      manifest,
      resolutionReport: createResolutionReport(manifest),
      createdAt: '2026-06-12T06:00:00.000Z'
    });

    expect(plan).toMatchObject({
      triggered: true,
      trigger: 'hard_semantic_unknown',
      items: [
        {
          requirementId: 'player',
          semanticFitStatus: 'unknown',
          strictness: 'hard',
          action: 'force_template_svg_fallback',
          semanticFitReason: 'No asset-level semantic metadata is available for expected cat.'
        }
      ]
    });
  });

  it('does not trigger for playable fallback assets or playable art warnings', () => {
    const manifest = createManifest([
      createAsset({
        id: 'player',
        source: 'template_svg',
        sourcePack: undefined,
        semanticFit: {
          status: 'fallback_generated',
          confidence: 1,
          strictness: 'hard',
          expectedConcept: 'cat',
          expectedAnyTags: ['cat', 'kitten', 'feline'],
          actualTags: ['template_svg'],
          reason: 'Generated deterministic template SVG fallback for expected cat.'
        }
      }),
      createAsset({
        id: 'background_main',
        role: 'background',
        semanticFit: {
          status: 'mismatch',
          confidence: 0,
          strictness: 'medium',
          expectedConcept: 'space',
          expectedAnyTags: ['space', 'stars'],
          actualTags: ['battlefield'],
          missingTags: ['space', 'stars'],
          reason: 'Medium background semantic mismatch.'
        }
      })
    ]);

    const fallbackPlan = buildAssetRepairPlan({
      qaReport: createQaReport({ overall_status: 'PLAYABLE_WITH_FALLBACK_ASSETS', asset_semantic_status: 'PASSED' }),
      manifest,
      resolutionReport: createResolutionReport(manifest),
      createdAt: '2026-06-12T06:00:00.000Z'
    });
    const warningPlan = buildAssetRepairPlan({
      qaReport: createQaReport({ overall_status: 'PLAYABLE_WITH_ART_WARNINGS', asset_semantic_status: 'WARNING' }),
      manifest,
      resolutionReport: createResolutionReport(manifest),
      createdAt: '2026-06-12T06:00:00.000Z'
    });

    expect(fallbackPlan).toMatchObject({ triggered: false, trigger: 'none', items: [] });
    expect(warningPlan).toMatchObject({ triggered: false, trigger: 'none', items: [] });
    expect(warningPlan.ignored).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirementId: 'player',
          role: 'player_character',
          semanticFitStatus: 'fallback_generated',
          strictness: 'hard'
        }),
        expect.objectContaining({
          requirementId: 'background_main',
          role: 'background',
          semanticFitStatus: 'mismatch',
          strictness: 'medium'
        })
      ])
    );
  });

  it('does not trigger for passing semantic fit statuses or non-hard unknown statuses', () => {
    const manifest = createManifest([
      createAsset({ id: 'player', semanticFit: createSemanticFit('exact', 'hard') }),
      createAsset({ id: 'enemy', role: 'enemy', semanticFit: createSemanticFit('compatible', 'hard') }),
      createAsset({ id: 'projectile', role: 'projectile', semanticFit: createSemanticFit('not_applicable', undefined) }),
      createAsset({ id: 'background_main', role: 'background', semanticFit: createSemanticFit('unknown', 'medium') })
    ]);

    const plan = buildAssetRepairPlan({
      qaReport: createQaReport({ overall_status: 'PLAYABLE_WITH_ART_WARNINGS', asset_semantic_status: 'WARNING' }),
      manifest,
      resolutionReport: createResolutionReport(manifest),
      createdAt: '2026-06-12T06:00:00.000Z'
    });

    expect(plan).toMatchObject({ triggered: false, trigger: 'none', items: [] });
    expect(plan.ignored).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirementId: 'background_main',
          semanticFitStatus: 'unknown',
          strictness: 'medium'
        })
      ])
    );
  });

  it('keeps status-only repair signals diagnostic-only when no hard semantic evidence exists', () => {
    const manifest = createManifest([createAsset({ id: 'player', semanticFit: createSemanticFit('exact', 'hard') })]);

    const plan = buildAssetRepairPlan({
      qaReport: createQaReport({ overall_status: 'NEEDS_ASSET_REPAIR', asset_semantic_status: 'FAILED' }),
      manifest,
      resolutionReport: createResolutionReport(manifest),
      createdAt: '2026-06-12T06:00:00.000Z'
    });

    expect(plan).toMatchObject({
      triggered: true,
      trigger: 'asset_semantic_failed',
      items: [
        {
          requirementId: 'qa_status',
          role: 'asset_report',
          action: 'no_action'
        }
      ]
    });
  });
});

function createQaReport(overrides: Partial<AssetRepairPlannerQaReport>): AssetRepairPlannerQaReport {
  return {
    project_id: projectId,
    overall_status: 'PLAYABLE',
    asset_semantic_status: 'PASSED',
    ...overrides
  };
}

function createManifest(assets: AssetManifest['assets']): AssetManifest {
  return {
    version: 'asset-manifest-v0.1',
    projectId,
    strict: true,
    assets,
    summary: {
      required: assets.filter((asset) => asset.required).length,
      ready: assets.filter((asset) => asset.status === 'ready').length,
      fallback_used: assets.filter((asset) => asset.status === 'fallback_used').length,
      missing: assets.filter((asset) => asset.status === 'missing').length,
      placeholder_used: assets.filter((asset) => asset.source === 'placeholder').length
    }
  };
}

function createAsset(overrides: Partial<AssetManifest['assets'][number]>): AssetManifest['assets'][number] {
  const id = overrides.id ?? 'player';
  return {
    id,
    loadKey: `agm.${id}`,
    role: 'player_character',
    type: 'image',
    format: 'svg',
    path: `assets/${id}.svg`,
    source: 'local_asset_pack',
    sourcePack: 'kenney-tiny-shooter-tanks',
    licenseId: 'CC0-1.0',
    licenseName: 'Creative Commons CC0 1.0 Universal',
    attribution: 'Kenney Tanks by Kenney Vleugels',
    sourceUrl: 'https://kenney.nl/assets/tanks',
    required: true,
    status: 'ready',
    size: { w: 64, h: 64 },
    semanticFit: {
      status: 'exact',
      confidence: 1,
      strictness: 'hard',
      expectedConcept: 'tank',
      expectedAnyTags: ['tank', 'vehicle'],
      actualTags: ['tank', 'vehicle'],
      reason: 'Local asset semantic tags exactly match expected tank.'
    },
    ...overrides
  };
}

function createSemanticFit(
  status: NonNullable<AssetManifest['assets'][number]['semanticFit']>['status'],
  strictness: NonNullable<AssetManifest['assets'][number]['semanticFit']>['strictness']
): NonNullable<AssetManifest['assets'][number]['semanticFit']> {
  return {
    status,
    confidence: status === 'exact' ? 1 : 0.5,
    strictness,
    expectedConcept: strictness === undefined ? undefined : 'tank',
    expectedAnyTags: strictness === undefined ? undefined : ['tank', 'vehicle'],
    actualTags: status === 'unknown' ? undefined : ['tank', 'vehicle'],
    missingTags: status === 'unknown' ? ['tank'] : [],
    reason: `${status} semantic fit for test.`
  };
}

function createResolutionReport(manifest: AssetManifest, assets: AssetResolutionReport['assets'] = manifest.assets.map(createResolutionAsset)): AssetResolutionReport {
  return {
    version: 'asset-resolution-report-v0.1',
    projectId,
    summary: {
      selectedProvider: 'local_asset_pack',
      selectedPackId: 'kenney-tiny-shooter-tanks',
      fallbackUsed: false,
      reason: 'Selected complete local asset pack kenney-tiny-shooter-tanks.'
    },
    assets,
    candidates: []
  };
}

function createResolutionAsset(asset: AssetManifest['assets'][number]): AssetResolutionReport['assets'][number] {
  return {
    id: asset.id,
    role: asset.role,
    selected: {
      source: asset.source,
      sourcePack: asset.sourcePack,
      path: asset.path,
      status: asset.status
    },
    expectedSemantic: asset.semanticFit?.expectedConcept
      ? {
          expectedConcept: asset.semanticFit.expectedConcept,
          expectedAnyTags: asset.semanticFit.expectedAnyTags ?? [asset.semanticFit.expectedConcept],
          forbiddenTags: [],
          strictness: asset.semanticFit.strictness ?? 'soft'
        }
      : undefined,
    semanticFit: asset.semanticFit ?? {
      status: 'unknown',
      confidence: 0,
      reason: 'Manifest asset did not include semantic fit metadata.'
    }
  };
}
