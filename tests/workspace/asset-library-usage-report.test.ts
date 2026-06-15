import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  AssetLibraryUsageReportSchema,
  writeAssetLibraryUsageReport
} from '../../apps/maker-api/src/compiler/asset-library-usage-report.js';
import type { TemplateAssetCatalog } from '../../apps/maker-api/src/compiler/template-asset-catalog.js';
import { AssetManifestSchema, AssetPlanSchema, type AssetManifest } from '../../packages/asset-pipeline/src/index.js';

const projectId = 'proj_20260615_asset_usage';
const runId = 'run_20260615_asset_usage';

describe('Asset library usage report', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-asset-usage-'));
    await writeUsageFixture(root, createManifest());
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes deterministic usage evidence aligned with AssetManifest and preview manifest refs', async () => {
    const first = await writeAssetLibraryUsageReport({
      projectId,
      runId,
      genre: 'shooter',
      outputDir: root,
      workspaceRoot: root,
      catalog: createCatalog()
    });
    const second = await writeAssetLibraryUsageReport({
      projectId,
      runId,
      genre: 'shooter',
      outputDir: root,
      workspaceRoot: root,
      catalog: createCatalog()
    });

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      reportVersion: 'asset-library-usage-report.v1',
      projectId,
      runId,
      catalogVersion: 'template_asset_catalog.v1',
      manifestRefs: {
        assetPlanPath: 'asset_plan.json',
        publicAssetManifestPath: 'public/asset_manifest.json',
        previewManifestPath: 'shooter/src/asset-manifest.generated.json'
      },
      status: 'warn'
    });
    expect(first.usedAssets).toEqual([
      expect.objectContaining({ manifestAssetId: 'background_main', status: 'fallback', source: 'template_svg', catalogAssetId: null }),
      expect.objectContaining({ manifestAssetId: 'enemy', status: 'matched', source: 'runtime_asset', catalogAssetId: 'runtime-small-library:creature_kenney_cube_pet_cat_001' }),
      expect.objectContaining({ manifestAssetId: 'player', status: 'matched', source: 'local_asset_pack', catalogAssetId: 'local-pack:agm-mini:player' })
    ]);
    expect(first.usedAssets.find((asset) => asset.manifestAssetId === 'player')?.reason).toBe('player is backed by manifest catalogRef local-pack:agm-mini:player.');
    expect(first.warnings).toEqual(['background_main uses explicit deterministic fallback source template_svg.']);
    expect(first.errors).toEqual([]);
    const raw = await readFile(join(root, 'asset_library_usage_report.json'), 'utf8');
    expect(raw.endsWith('\n')).toBe(true);
    expect(raw).not.toContain('"relativePath"');
    assertUsageReportIsSafe(first);
  });

  it('marks unmatched catalog assets as deterministic errors', async () => {
    const manifest = createManifest({ playerSourcePack: 'missing-pack' });
    await writeUsageFixture(root, manifest);

    const report = await writeAssetLibraryUsageReport({
      projectId,
      runId,
      genre: 'shooter',
      outputDir: root,
      workspaceRoot: root,
      catalog: createCatalog()
    });

    expect(report).toMatchObject({
      status: 'fail',
      missingCatalogEntries: ['local-pack:missing-pack:player'],
      unresolvedAssets: ['player'],
      errors: ['player references missing template asset catalog entry local-pack:missing-pack:player.']
    });
  });

  it('fails local/template assets that omit manifest catalog identity', async () => {
    const manifest = createManifest({ omitPlayerCatalogRef: true });
    await writeUsageFixture(root, manifest);

    const report = await writeAssetLibraryUsageReport({
      projectId,
      runId,
      genre: 'shooter',
      outputDir: root,
      workspaceRoot: root,
      catalog: createCatalog()
    });

    expect(report).toMatchObject({
      status: 'fail',
      missingCatalogEntries: [],
      unresolvedAssets: ['player'],
      errors: ['player is missing manifest catalogRef local-pack:agm-mini:player.']
    });
  });

  it('fails catalog identity that contradicts the manifest source', async () => {
    const manifest = createManifest({ playerCatalogAssetId: 'local-pack:agm-mini:enemy' });
    await writeUsageFixture(root, manifest);

    const report = await writeAssetLibraryUsageReport({
      projectId,
      runId,
      genre: 'shooter',
      outputDir: root,
      workspaceRoot: root,
      catalog: createCatalog()
    });

    expect(report).toMatchObject({
      status: 'fail',
      missingCatalogEntries: [],
      unresolvedAssets: ['player'],
      errors: ['player catalogRef local-pack:agm-mini:enemy does not match manifest source local-pack:agm-mini:player.']
    });
  });

  it('fails catalog entries whose source path no longer matches manifest identity', async () => {
    const catalog = createCatalog();
    catalog.entries[0] = { ...catalog.entries[0], relativePath: 'assets/asset-packs/agm-mini/enemy.svg' };

    const report = await writeAssetLibraryUsageReport({
      projectId,
      runId,
      genre: 'shooter',
      outputDir: root,
      workspaceRoot: root,
      catalog
    });

    expect(report).toMatchObject({
      status: 'fail',
      missingCatalogEntries: [],
      unresolvedAssets: ['player'],
      errors: ['player catalog entry path does not match manifest source identity.']
    });
  });

  it('fails runtime assets that cannot prove catalog source path identity', async () => {
    const manifest = createManifest({ omitRuntimeSourcePath: true });
    await writeUsageFixture(root, manifest);

    const report = await writeAssetLibraryUsageReport({
      projectId,
      runId,
      genre: 'shooter',
      outputDir: root,
      workspaceRoot: root,
      catalog: createCatalog()
    });

    expect(report).toMatchObject({
      status: 'fail',
      missingCatalogEntries: [],
      unresolvedAssets: ['enemy'],
      errors: ['enemy is missing manifest source path for catalog identity validation.']
    });
  });

  it('fails runtime catalog entries whose source path no longer matches manifest identity', async () => {
    const catalog = createCatalog();
    catalog.entries[1] = { ...catalog.entries[1], relativePath: 'tests/fixtures/art-library-small-v0.1/thumbnails/animal-dog.png' };

    const report = await writeAssetLibraryUsageReport({
      projectId,
      runId,
      genre: 'shooter',
      outputDir: root,
      workspaceRoot: root,
      catalog
    });

    expect(report).toMatchObject({
      status: 'fail',
      missingCatalogEntries: [],
      unresolvedAssets: ['enemy'],
      errors: ['enemy catalog entry path does not match manifest source identity.']
    });
  });

  it('rejects mismatched preview manifests and project identities', async () => {
    const mismatched = createManifest();
    await writeFile(
      join(root, 'shooter', 'src', 'asset-manifest.generated.json'),
      `${JSON.stringify({ ...mismatched, assets: [...mismatched.assets].reverse() }, null, 2)}\n`,
      'utf8'
    );

    await expect(
      writeAssetLibraryUsageReport({
        projectId,
        runId,
        genre: 'shooter',
        outputDir: root,
        workspaceRoot: root,
        catalog: createCatalog()
      })
    ).rejects.toThrow('asset library usage report requires matching public and preview manifests.');

    await writeUsageFixture(root, createManifest({ projectId: 'proj_20260615_other_usage' }));
    await expect(
      writeAssetLibraryUsageReport({
        projectId,
        runId,
        genre: 'shooter',
        outputDir: root,
        workspaceRoot: root,
        catalog: createCatalog()
      })
    ).rejects.toThrow('asset library usage report inputs do not match the current project.');
  });

  it('rejects contradictory status and unsafe report text at the schema boundary', () => {
    const report = {
      reportVersion: 'asset-library-usage-report.v1',
      projectId,
      runId,
      catalogVersion: 'template_asset_catalog.v1',
      manifestRefs: {
        assetPlanPath: 'asset_plan.json',
        publicAssetManifestPath: 'public/asset_manifest.json',
        previewManifestPath: 'shooter/src/asset-manifest.generated.json'
      },
      usedAssets: [],
      missingCatalogEntries: [],
      unresolvedAssets: [],
      warnings: [],
      errors: ['secret DEEPSEEK_API_KEY leaked'],
      status: 'pass'
    };

    expect(() => AssetLibraryUsageReportSchema.parse(report)).toThrow();
  });
});

async function writeUsageFixture(rootDir: string, manifest: AssetManifest): Promise<void> {
  await mkdir(join(rootDir, 'public'), { recursive: true });
  await mkdir(join(rootDir, 'shooter', 'src'), { recursive: true });
  const plan = AssetPlanSchema.parse({
    version: 'asset-plan-v0.1',
    projectId,
    style: { visual_theme: 'shooter_space', camera: 'top_down' },
    items: manifest.assets.map((asset) => ({
      id: asset.id,
      role: asset.role,
      subject: asset.id,
      size: asset.size,
      format: 'svg',
      required: asset.required,
      provider_priority: ['local_asset_pack', 'runtime_asset', 'template_svg']
    }))
  });
  await writeFile(join(rootDir, 'asset_plan.json'), `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  await writeFile(join(rootDir, 'public', 'asset_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeFile(join(rootDir, 'shooter', 'src', 'asset-manifest.generated.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function createManifest(
  input: { playerSourcePack?: string; projectId?: string; omitPlayerCatalogRef?: boolean; playerCatalogAssetId?: string; omitRuntimeSourcePath?: boolean } = {}
): AssetManifest {
  const playerSourcePack = input.playerSourcePack ?? 'agm-mini';
  const playerCatalogRef = input.omitPlayerCatalogRef
    ? undefined
    : {
        catalogVersion: 'template_asset_catalog.v1' as const,
        catalogAssetId: input.playerCatalogAssetId ?? `local-pack:${playerSourcePack}:player`,
        source: 'local-template' as const
      };
  return AssetManifestSchema.parse({
    version: 'asset-manifest-v0.1',
    projectId: input.projectId ?? projectId,
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
        conversion: input.omitRuntimeSourcePath
          ? { status: 'thumbnail_copied', outputPath: 'assets/enemy.png' }
          : { status: 'thumbnail_copied', sourcePath: 'tests/fixtures/art-library-small-v0.1/thumbnails/animal-cat.png', outputPath: 'assets/enemy.png' },
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
        sourcePack: playerSourcePack,
        licenseId: 'CC0-1.0',
        licenseName: 'Creative Commons CC0 1.0 Universal',
        attribution: 'test',
        sourceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
        catalogRef: playerCatalogRef,
        required: true,
        status: 'ready',
        size: { w: 64, h: 64 }
      }
    ],
    summary: { required: 3, ready: 3, fallback_used: 0, missing: 0, placeholder_used: 0 }
  });
}

function createCatalog(): TemplateAssetCatalog {
  return {
    catalogVersion: 'template_asset_catalog.v1',
    entries: [
      {
        id: 'local-pack:agm-mini:player',
        kind: 'sprite',
        source: 'local-template',
        relativePath: 'assets/asset-packs/agm-mini/player.svg',
        tags: ['player'],
        supportedGenres: ['shooter'],
        purpose: 'player',
        required: true
      },
      {
        id: 'runtime-small-library:creature_kenney_cube_pet_cat_001',
        kind: 'sprite',
        source: 'local-template',
        relativePath: 'tests/fixtures/art-library-small-v0.1/thumbnails/animal-cat.png',
        tags: ['cat'],
        supportedGenres: ['arcade'],
        purpose: 'enemy',
        required: true
      }
    ]
  };
}

function assertUsageReportIsSafe(report: unknown): void {
  const json = JSON.stringify(report);
  expect(json).not.toContain('timestamp');
  expect(json).not.toContain('asset-manifest-v0.1');
  expect(json).not.toContain('asset-pipeline-report-v0.1');
  expect(json).not.toContain('DEEPSEEK_API_KEY');
  expect(json).not.toContain('raw provider');
  expect(json).not.toContain('/Users/');
  for (const path of json.match(/"[A-Za-z0-9_./:-]+\\.(json|svg|png)"/g) ?? []) {
    expect(isAbsolute(path.slice(1, -1))).toBe(false);
  }
}
