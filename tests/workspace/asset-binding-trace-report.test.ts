import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  AssetBindingTraceReportSchema,
  writeAssetBindingTraceReport
} from '../../apps/maker-api/src/compiler/asset-binding-trace-report.js';
import { AssetLibraryUsageReportSchema, type AssetLibraryUsageReport } from '../../apps/maker-api/src/compiler/asset-library-usage-report.js';
import { AssetManifestSchema, AssetPlanSchema, type AssetManifest, type AssetPlan } from '../../packages/asset-pipeline/src/index.js';

const projectId = 'proj_20260615_binding_trace';
const runId = 'run_20260615_binding_trace';

describe('Asset binding trace report', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-binding-trace-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes deterministic DSL-bound traces through plan, manifests, preview, and catalog usage', async () => {
    await writeTraceFixture(root);

    const first = await writeAssetBindingTraceReport({ projectId, runId, genre: 'shooter', outputDir: root });
    const second = await writeAssetBindingTraceReport({ projectId, runId, genre: 'shooter', outputDir: root });

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      reportVersion: 'asset-binding-trace-report.v1',
      projectId,
      runId,
      status: 'warn',
      sourceArtifacts: {
        gameDslPath: 'game_dsl.json',
        assetPlanPath: 'asset_plan.json',
        publicAssetManifestPath: 'public/asset_manifest.json',
        previewManifestPath: 'shooter/src/asset-manifest.generated.json',
        assetLibraryUsageReportPath: 'asset_library_usage_report.json'
      },
      checkedPaths: ['asset_plan.json', 'public/asset_manifest.json', 'shooter/src/asset-manifest.generated.json', 'asset_library_usage_report.json']
    });
    expect(first.traces.map((trace) => trace.traceId)).toEqual(['trace:background_main', 'trace:enemy', 'trace:player']);
    expect(first.traces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          traceId: 'trace:player',
          category: 'dsl-bound',
          status: 'matched',
          dslStableId: 'player',
          dslObjectPath: 'asset_plan.json#items.2',
          assetPlanId: 'player',
          manifestAssetId: 'player',
          previewAssetId: 'player',
          catalogAssetId: 'local-pack:agm-mini:player',
          catalogVersion: 'template_asset_catalog.v1',
          source: 'local-template'
        }),
        expect.objectContaining({
          traceId: 'trace:background_main',
          category: 'fallback',
          status: 'warning',
          dslStableId: null,
          catalogAssetId: null,
          source: 'template-fallback'
        })
      ])
    );
    expect(first.errors).toEqual([]);
    expect(first.warnings).toEqual(['background_main uses explicit deterministic fallback source template_svg.']);
    assertTraceReportIsSafe(first);
    await expect(readFile(join(root, 'asset_binding_trace_report.json'), 'utf8')).resolves.toContain('"asset-binding-trace-report.v1"');
  });

  it('derives fail status from missing required manifest assets and DSL-bound orphans', async () => {
    const manifest = createManifest();
    const plan = createPlan([
      ...manifest.assets.map((asset) => asset.id),
      'projectile'
    ]);
    const manifestWithBonus = AssetManifestSchema.parse({
        ...manifest,
        assets: [
          ...manifest.assets,
          {
            ...manifest.assets.find((asset) => asset.id === 'player')!,
            id: 'bonus',
            loadKey: 'agm.bonus',
            path: 'assets/bonus.svg',
            catalogRef: {
              catalogVersion: 'template_asset_catalog.v1',
              catalogAssetId: 'local-pack:agm-mini:bonus',
              source: 'local-template'
            }
          }
        ],
        summary: { required: 4, ready: 4, fallback_used: 0, missing: 0, placeholder_used: 0 }
      });
    const usageReport = createUsageReport(manifestWithBonus);
    usageReport.usedAssets = usageReport.usedAssets.map((asset) =>
      asset.manifestAssetId === 'bonus'
        ? {
            ...asset,
            boundDslStableId: undefined,
            boundObjectPath: 'public/asset_manifest.json#assets.bonus'
          }
        : asset
    );
    await writeTraceFixture(root, { plan, manifest: manifestWithBonus, usageReport: AssetLibraryUsageReportSchema.parse(usageReport) });

    const report = await writeAssetBindingTraceReport({ projectId, runId, genre: 'shooter', outputDir: root });

    expect(report.status).toBe('fail');
    expect(report.missingManifestAssets).toEqual(['projectile: projectile is required by asset_plan.json but missing from public asset manifest.']);
    expect(report.orphanManifestAssets).toEqual(['bonus: bonus is in public asset manifest without an AssetPlan binding.']);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        'projectile is required by asset_plan.json but missing from public asset manifest.',
        'bonus is in public asset manifest without an AssetPlan binding.'
      ])
    );
  });

  it('fails preview/public catalog mismatches and usage report catalog mismatches', async () => {
    const manifest = createManifest();
    const previewManifest = AssetManifestSchema.parse({
      ...manifest,
      assets: manifest.assets.map((asset) =>
        asset.id === 'player'
          ? {
              ...asset,
              catalogRef: {
                catalogVersion: 'template_asset_catalog.v1',
                catalogAssetId: 'local-pack:agm-mini:enemy',
                source: 'local-template'
              }
            }
          : asset
      )
    });
    await writeTraceFixture(root, {
      manifest,
      previewManifest,
      usageReport: createUsageReport(manifest, {
        playerStatus: 'unmatched',
        playerReason: 'player catalogRef local-pack:agm-mini:enemy does not match manifest source local-pack:agm-mini:player.'
      })
    });

    const report = await writeAssetBindingTraceReport({ projectId, runId, genre: 'shooter', outputDir: root });

    expect(report.status).toBe('fail');
    expect(report.errors).toEqual(
      expect.arrayContaining([
        'player catalogRef does not match between public and preview manifests.'
      ])
    );
  });

  it('fails stale or incomplete usage report rows instead of ignoring them', async () => {
    const manifest = createManifest();
    const usageReport = createUsageReport(manifest);
    usageReport.usedAssets = [
      ...usageReport.usedAssets.filter((asset) => asset.manifestAssetId !== 'player'),
      {
        manifestAssetId: 'ghost_usage',
        kind: 'sprite',
        resolvedPath: 'assets/ghost_usage.svg',
        catalogAssetId: null,
        source: 'template_svg',
        status: 'fallback',
        boundObjectPath: 'public/asset_manifest.json#assets.ghost_usage',
        reason: 'ghost_usage uses explicit deterministic fallback source template_svg.'
      }
    ];
    usageReport.warnings = [...usageReport.warnings, 'ghost_usage uses explicit deterministic fallback source template_svg.'];
    await writeTraceFixture(root, { manifest, usageReport: AssetLibraryUsageReportSchema.parse(usageReport) });

    const report = await writeAssetBindingTraceReport({ projectId, runId, genre: 'shooter', outputDir: root });

    expect(report.status).toBe('fail');
    expect(report.errors).toEqual(
      expect.arrayContaining([
        'player is present in public asset manifest but missing from asset_library_usage_report.json.',
        'ghost_usage is present in asset_library_usage_report.json but missing from public asset manifest.'
      ])
    );
  });

  it('fails usage report rows whose source, catalog, or binding fields drift from manifest inputs', async () => {
    const manifest = createManifest();
    const usageReport = createUsageReport(manifest);
    usageReport.usedAssets = usageReport.usedAssets.map((asset) =>
      asset.manifestAssetId === 'player'
        ? {
            ...asset,
            catalogAssetId: 'local-pack:agm-mini:enemy'
          }
        : asset
    );
    await writeTraceFixture(root, { manifest, usageReport: AssetLibraryUsageReportSchema.parse(usageReport) });

    const catalogReport = await writeAssetBindingTraceReport({ projectId, runId, genre: 'shooter', outputDir: root });
    expect(catalogReport.errors).toContain('player catalogAssetId does not match asset_library_usage_report.json.');

    usageReport.usedAssets = usageReport.usedAssets.map((asset) =>
      asset.manifestAssetId === 'player'
        ? {
            ...asset,
            catalogAssetId: 'local-pack:agm-mini:player',
            source: 'template_svg'
          }
        : asset
    );
    await writeTraceFixture(root, { manifest, usageReport: AssetLibraryUsageReportSchema.parse(usageReport) });
    const sourceReport = await writeAssetBindingTraceReport({ projectId, runId, genre: 'shooter', outputDir: root });
    expect(sourceReport.errors).toContain('player source does not match asset_library_usage_report.json.');

    usageReport.usedAssets = usageReport.usedAssets.map((asset) =>
      asset.manifestAssetId === 'player'
        ? {
            ...asset,
            source: 'local_asset_pack',
            boundDslStableId: 'enemy',
            boundObjectPath: 'asset_plan.json#items.2'
          }
        : asset
    );
    await writeTraceFixture(root, { manifest, usageReport: AssetLibraryUsageReportSchema.parse(usageReport) });
    const boundReport = await writeAssetBindingTraceReport({ projectId, runId, genre: 'shooter', outputDir: root });
    expect(boundReport.errors).toContain('player boundDslStableId does not match asset_library_usage_report.json.');
  });

  it('warns for optional AssetPlan items that have no manifest binding', async () => {
    const manifest = createManifest();
    await writeTraceFixture(root, {
      plan: AssetPlanSchema.parse({
        ...createPlan(manifest.assets.map((asset) => asset.id)),
        items: [
          ...createPlan(manifest.assets.map((asset) => asset.id)).items,
          {
            id: 'pickup',
            role: 'pickup',
            subject: 'pickup',
            size: { w: 64, h: 64 },
            format: 'svg',
            required: false,
            provider_priority: ['local_asset_pack', 'runtime_asset', 'template_svg']
          }
        ]
      }),
      manifest
    });

    const report = await writeAssetBindingTraceReport({ projectId, runId, genre: 'shooter', outputDir: root });

    expect(report.status).toBe('warn');
    expect(report.traces).toContainEqual(
      expect.objectContaining({
        traceId: 'trace:pickup',
        status: 'warning',
        reason: 'pickup is optional in asset_plan.json and has no public asset manifest binding.'
      })
    );
    expect(report.missingManifestAssets).toContain('pickup: pickup is optional in asset_plan.json and has no public asset manifest binding.');
  });

  it('fails optional AssetPlan items when a stale usage row claims a missing manifest asset', async () => {
    const manifest = createManifest();
    const plan = AssetPlanSchema.parse({
      ...createPlan(manifest.assets.map((asset) => asset.id)),
      items: [
        ...createPlan(manifest.assets.map((asset) => asset.id)).items,
        {
          id: 'pickup',
          role: 'pickup',
          subject: 'pickup',
          size: { w: 64, h: 64 },
          format: 'svg',
          required: false,
          provider_priority: ['local_asset_pack', 'runtime_asset', 'template_svg']
        }
      ]
    });
    const usageReport = createUsageReport(manifest);
    usageReport.usedAssets = [
      ...usageReport.usedAssets,
      {
        manifestAssetId: 'pickup',
        kind: 'sprite',
        resolvedPath: 'assets/pickup.svg',
        catalogAssetId: null,
        source: 'template_svg',
        status: 'fallback',
        boundDslStableId: 'pickup',
        boundObjectPath: 'asset_plan.json#items.3',
        reason: 'pickup uses explicit deterministic fallback source template_svg.'
      }
    ];
    usageReport.warnings = [...usageReport.warnings, 'pickup uses explicit deterministic fallback source template_svg.'];
    await writeTraceFixture(root, { plan, manifest, usageReport: AssetLibraryUsageReportSchema.parse(usageReport) });

    const report = await writeAssetBindingTraceReport({ projectId, runId, genre: 'shooter', outputDir: root });

    expect(report.status).toBe('fail');
    expect(report.errors).toContain('pickup is present in asset_library_usage_report.json but missing from public asset manifest.');
  });


  it('classifies runtime/system manifest assets without faking DSL stable ids or catalog refs', async () => {
    const manifest = AssetManifestSchema.parse({
      ...createManifest(),
      assets: [
        ...createManifest().assets,
        {
          id: 'runtime_ui',
          loadKey: 'agm.runtime_ui',
          role: 'ui_panel',
          type: 'image',
          format: 'png',
          path: 'assets/runtime_ui.png',
          source: 'runtime_asset',
          runtimeAssetId: 'runtime-ui-panel',
          runtimeContext: 'runtime_system',
          required: false,
          status: 'ready',
          size: { w: 64, h: 64 }
        }
      ],
      summary: { required: 3, ready: 4, fallback_used: 0, missing: 0, placeholder_used: 0 }
    });
    const usageReport = createUsageReport(manifest);
    usageReport.usedAssets = [
      ...usageReport.usedAssets,
      {
        manifestAssetId: 'runtime_ui',
        kind: 'ui',
        resolvedPath: 'assets/runtime_ui.png',
        catalogAssetId: null,
        source: 'runtime_asset',
        status: 'fallback',
        boundObjectPath: 'public/asset_manifest.json#assets.runtime_ui',
        reason: 'runtime_ui is classified as runtime/system asset outside AssetPlan binding.'
      }
    ];
    usageReport.warnings = [...usageReport.warnings, 'runtime_ui is classified as runtime/system asset outside AssetPlan binding.'];
    await writeTraceFixture(root, { manifest, usageReport: AssetLibraryUsageReportSchema.parse(usageReport) });

    const report = await writeAssetBindingTraceReport({ projectId, runId, genre: 'shooter', outputDir: root });
    const runtimeTrace = report.traces.find((trace) => trace.traceId === 'trace:runtime_ui');

    expect(runtimeTrace).toMatchObject({
      category: 'runtime-system',
      status: 'warning',
      dslStableId: null,
      dslObjectPath: null,
      assetPlanId: null,
      catalogAssetId: null,
      catalogVersion: null,
      source: 'runtime-system'
    });
  });

  it('rejects contradictory status and unsafe report text at the schema boundary', () => {
    expect(() =>
      AssetBindingTraceReportSchema.parse({
        reportVersion: 'asset-binding-trace-report.v1',
        projectId,
        runId,
        status: 'pass',
        sourceArtifacts: {
          gameDslPath: 'game_dsl.json',
          assetPlanPath: 'asset_plan.json',
          publicAssetManifestPath: 'public/asset_manifest.json',
          previewManifestPath: 'shooter/src/asset-manifest.generated.json',
          assetLibraryUsageReportPath: 'asset_library_usage_report.json'
        },
        traces: [],
        orphanManifestAssets: [],
        missingManifestAssets: [],
        warnings: [],
        errors: ['raw provider leaked Bearer token'],
        checkedPaths: ['asset_plan.json']
      })
    ).toThrow();
    const safeReport = {
      reportVersion: 'asset-binding-trace-report.v1',
      projectId,
      runId,
      status: 'pass',
      sourceArtifacts: {
        gameDslPath: 'game_dsl.json',
        assetPlanPath: 'asset_plan.json',
        publicAssetManifestPath: 'public/asset_manifest.json',
        previewManifestPath: 'shooter/src/asset-manifest.generated.json',
        assetLibraryUsageReportPath: 'asset_library_usage_report.json'
      },
      traces: [],
      orphanManifestAssets: [],
      missingManifestAssets: [],
      warnings: [],
      errors: [],
      checkedPaths: ['asset_plan.json']
    };

    expect(() => AssetBindingTraceReportSchema.parse({ ...safeReport, checkedPaths: ['https://example.test/trace.json'] })).toThrow();
    expect(() => AssetBindingTraceReportSchema.parse({ ...safeReport, checkedPaths: ['file:trace.json'] })).toThrow();
    expect(() => AssetBindingTraceReportSchema.parse({ ...safeReport, checkedPaths: ['data:application/json'] })).toThrow();
    expect(() =>
      AssetBindingTraceReportSchema.parse({
        ...safeReport,
        traces: [
          {
            traceId: 'trace:player',
            category: 'dsl-bound',
            status: 'matched',
            dslStableId: 'player',
            dslObjectPath: 'asset_plan.json#items.0#extra',
            assetPlanId: 'player',
            assetPlanPath: 'asset_plan.json#items.0',
            manifestAssetId: 'player',
            previewAssetId: 'player',
            catalogAssetId: 'local-pack:agm-mini:player',
            catalogVersion: 'template_asset_catalog.v1',
            source: 'local-template',
            reason: 'player binding trace matches AssetPlan, manifests, and catalog usage.'
          }
        ]
      })
    ).toThrow();
    expect(() => AssetBindingTraceReportSchema.parse({ ...safeReport, warnings: ['C:\\Users\\dahufa\\secret'], status: 'warn' })).toThrow();
    expect(() => AssetBindingTraceReportSchema.parse({ ...safeReport, warnings: ['/home/dahufa/secret'], status: 'warn' })).toThrow();
  });
});

async function writeTraceFixture(
  rootDir: string,
  input: {
    plan?: AssetPlan;
    manifest?: AssetManifest;
    previewManifest?: AssetManifest;
    usageReport?: AssetLibraryUsageReport;
  } = {}
): Promise<void> {
  const manifest = input.manifest ?? createManifest();
  const plan = input.plan ?? createPlan(manifest.assets.filter((asset) => asset.id !== 'runtime_ui').map((asset) => asset.id));
  const previewManifest = input.previewManifest ?? manifest;
  const usageReport = input.usageReport ?? createUsageReport(manifest);

  await mkdir(join(rootDir, 'public'), { recursive: true });
  await mkdir(join(rootDir, 'shooter', 'src'), { recursive: true });
  await writeFile(join(rootDir, 'asset_plan.json'), `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  await writeFile(join(rootDir, 'public', 'asset_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeFile(join(rootDir, 'shooter', 'src', 'asset-manifest.generated.json'), `${JSON.stringify(previewManifest, null, 2)}\n`, 'utf8');
  await writeFile(join(rootDir, 'asset_library_usage_report.json'), `${JSON.stringify(usageReport, null, 2)}\n`, 'utf8');
}

function createPlan(ids: string[]): AssetPlan {
  return AssetPlanSchema.parse({
    version: 'asset-plan-v0.1',
    projectId,
    style: { visual_theme: 'shooter_space', camera: 'top_down' },
    items: ids.map((id) => ({
      id,
      role: id === 'background_main' ? 'background' : id === 'projectile' ? 'projectile' : id === 'enemy' ? 'enemy' : 'player_character',
      subject: id,
      size: { w: 64, h: 64 },
      format: 'svg',
      required: true,
      provider_priority: ['local_asset_pack', 'runtime_asset', 'template_svg']
    }))
  });
}

function createUsageReport(
  manifest: AssetManifest,
  options: { playerStatus?: 'matched' | 'fallback' | 'unmatched'; playerReason?: string } = {}
): AssetLibraryUsageReport {
  return AssetLibraryUsageReportSchema.parse({
    reportVersion: 'asset-library-usage-report.v1',
    projectId,
    runId,
    catalogVersion: 'template_asset_catalog.v1',
    manifestRefs: {
      assetPlanPath: 'asset_plan.json',
      publicAssetManifestPath: 'public/asset_manifest.json',
      previewManifestPath: 'shooter/src/asset-manifest.generated.json'
    },
    usedAssets: manifest.assets
      .filter((asset) => asset.id !== 'runtime_ui')
      .map((asset, index) => ({
        manifestAssetId: asset.id,
        kind: asset.role === 'background' ? 'background' : asset.role === 'ui_panel' ? 'ui' : 'sprite',
        resolvedPath: asset.path,
        catalogAssetId: asset.catalogRef?.catalogAssetId ?? null,
        source: asset.source,
        status: asset.id === 'background_main' ? 'fallback' : asset.id === 'player' ? options.playerStatus ?? 'matched' : 'matched',
        boundDslStableId: asset.id,
        boundObjectPath: `asset_plan.json#items.${index}`,
        reason:
          asset.id === 'background_main'
            ? 'background_main uses explicit deterministic fallback source template_svg.'
            : asset.id === 'player' && options.playerReason !== undefined
              ? options.playerReason
              : `${asset.id} is backed by manifest catalogRef ${asset.catalogRef?.catalogAssetId ?? 'none'}.`
      })),
    missingCatalogEntries: [],
    unresolvedAssets: options.playerStatus === 'unmatched' ? ['player'] : [],
    warnings: ['background_main uses explicit deterministic fallback source template_svg.'],
    errors: options.playerStatus === 'unmatched' && options.playerReason !== undefined ? [options.playerReason] : [],
    status: options.playerStatus === 'unmatched' ? 'fail' : 'warn'
  });
}

function createManifest(): AssetManifest {
  return AssetManifestSchema.parse({
    version: 'asset-manifest-v0.1',
    projectId,
    strict: true,
    assets: [
      {
        id: 'background_main',
        loadKey: 'agm.background_main',
        role: 'background',
        type: 'image',
        format: 'svg',
        path: 'assets/background_main.svg',
        source: 'template_svg',
        required: true,
        status: 'ready',
        size: { w: 64, h: 64 }
      },
      {
        id: 'enemy',
        loadKey: 'agm.enemy',
        role: 'enemy',
        type: 'image',
        format: 'png',
        path: 'assets/enemy.png',
        source: 'runtime_asset',
        runtimeAssetId: 'creature_kenney_cube_pet_cat_001',
        runtimeContext: 'production_default_runtime',
        catalogRef: {
          catalogVersion: 'template_asset_catalog.v1',
          catalogAssetId: 'runtime-small-library:creature_kenney_cube_pet_cat_001',
          source: 'local-template'
        },
        conversion: { status: 'thumbnail_copied', sourcePath: 'tests/fixtures/art-library-small-v0.1/thumbnails/animal-cat.png', outputPath: 'assets/enemy.png' },
        required: true,
        status: 'ready',
        size: { w: 64, h: 64 }
      },
      {
        id: 'player',
        loadKey: 'agm.player',
        role: 'player_character',
        type: 'image',
        format: 'svg',
        path: 'assets/player.svg',
        source: 'local_asset_pack',
        sourcePack: 'agm-mini',
        licenseId: 'CC0-1.0',
        licenseName: 'Creative Commons CC0 1.0 Universal',
        attribution: 'test',
        sourceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
        catalogRef: {
          catalogVersion: 'template_asset_catalog.v1',
          catalogAssetId: 'local-pack:agm-mini:player',
          source: 'local-template'
        },
        required: true,
        status: 'ready',
        size: { w: 64, h: 64 }
      }
    ],
    summary: { required: 3, ready: 3, fallback_used: 0, missing: 0, placeholder_used: 0 }
  });
}

function assertTraceReportIsSafe(report: unknown): void {
  const json = JSON.stringify(report);
  expect(json).not.toContain('timestamp');
  expect(json).not.toContain('asset-manifest-v0.1');
  expect(json).not.toContain('asset-library-usage-report.v1');
  expect(json).not.toContain('raw provider');
  expect(json).not.toContain('process.env');
  expect(json).not.toContain('DEEPSEEK_API_KEY');
  expect(json).not.toContain('Bearer');
  expect(json).not.toContain('/Users/');
  for (const path of json.match(/"[A-Za-z0-9_./:-]+\\.(json|svg|png)"/g) ?? []) {
    expect(isAbsolute(path.slice(1, -1))).toBe(false);
  }
}
