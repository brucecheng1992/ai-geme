import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AssetPipelineReportSchema, writeAssetPipelineReport } from '../../apps/maker-api/src/compiler/asset-pipeline-report.js';
import { AssetManifestSchema, type AssetManifest } from '../../packages/asset-pipeline/src/index.js';

const projectId = 'proj_20260614_asset_report';
const compileFiles = [
  'asset_plan.json',
  'public/asset_manifest.json',
  'asset_resolution_report.json',
  'public/assets/player.svg',
  'asset_pipeline_report.json'
];

describe('Asset pipeline report writer', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-asset-report-'));
    await writeReportFixture(root, createManifest(projectId), collectorMainEntry());
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes a verifiable asset pipeline report', async () => {
    const report = await writeAssetPipelineReport({
      projectId,
      templateId: 'collector_v1',
      genre: 'collector',
      outputDir: root,
      compileFiles
    });

    expect(report).toMatchObject({
      version: 'asset-pipeline-report-v0.1',
      projectId,
      templateId: 'collector_v1',
      checks: {
        publicManifestMatchesPreviewManifest: true,
        catalogIdentityMatchesPreviewManifest: true,
        previewManifestConsumedByTemplate: true,
        assetFilesListedInCompileResult: true
      },
      manifest: {
        assetIds: ['player'],
        requiredAssetIds: ['player'],
        loadKeys: ['agm.player'],
        assetFiles: ['public/assets/player.svg']
      }
    });
    await expect(readFile(join(root, 'asset_pipeline_report.json'), 'utf8')).resolves.toContain('"asset-pipeline-report-v0.1"');
  });

  it('rejects a manifest with a different projectId', async () => {
    await writeReportFixture(root, createManifest('proj_other'), collectorMainEntry());

    await expect(
      writeAssetPipelineReport({
        projectId,
        templateId: 'collector_v1',
        genre: 'collector',
        outputDir: root,
        compileFiles
      })
    ).rejects.toThrow(`Generated asset manifest projectId proj_other does not match project ${projectId}.`);
  });

  it('rejects a preview entry that does not pass the generated manifest into the art runtime', async () => {
    await writeReportFixture(root, createManifest(projectId), "import generatedAssetManifest from './asset-manifest.generated.json';\n");

    await expect(
      writeAssetPipelineReport({
        projectId,
        templateId: 'collector_v1',
        genre: 'collector',
        outputDir: root,
        compileFiles
      })
    ).rejects.toThrow('Generated collector preview entry does not pass asset-manifest.generated.json into createCollectorArtRuntime.');
  });

  it('rejects preview manifests that drop public manifest catalog identity', async () => {
    const manifest = createManifest(projectId);
    const previewManifest = {
      ...manifest,
      assets: manifest.assets.map((asset) => ({ ...asset, catalogRef: undefined }))
    };
    await writeFile(join(root, 'collector', 'src', 'asset-manifest.generated.json'), `${JSON.stringify(previewManifest, null, 2)}\n`, 'utf8');

    await expect(
      writeAssetPipelineReport({
        projectId,
        templateId: 'collector_v1',
        genre: 'collector',
        outputDir: root,
        compileFiles
      })
    ).rejects.toThrow('Generated asset manifest catalog identity for player does not match the Phaser preview manifest.');
  });

  it('rejects when the final compile file list omits a generated asset', async () => {
    await expect(
      writeAssetPipelineReport({
        projectId,
        templateId: 'collector_v1',
        genre: 'collector',
        outputDir: root,
        compileFiles: compileFiles.filter((file) => file !== 'public/assets/player.svg')
      })
    ).rejects.toThrow('Compile result is missing asset pipeline files: public/assets/player.svg');
  });
});

async function writeReportFixture(rootDir: string, manifest: AssetManifest, mainEntry: string): Promise<void> {
  await mkdir(join(rootDir, 'public', 'assets'), { recursive: true });
  await mkdir(join(rootDir, 'collector', 'src'), { recursive: true });
  await writeFile(join(rootDir, 'public', 'assets', 'player.svg'), '<svg role="img"></svg>\n', 'utf8');
  await writeFile(join(rootDir, 'public', 'asset_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeFile(join(rootDir, 'collector', 'src', 'asset-manifest.generated.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeFile(join(rootDir, 'collector', 'src', 'main.ts'), mainEntry, 'utf8');
}

function createManifest(id: string): AssetManifest {
  return AssetManifestSchema.parse({
    version: 'asset-manifest-v0.1',
    projectId: id,
    strict: true,
    assets: [
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
    summary: {
      required: 1,
      ready: 1,
      fallback_used: 0,
      missing: 0,
      placeholder_used: 0
    }
  });
}

function collectorMainEntry(): string {
  return [
    "import generatedAssetManifest from './asset-manifest.generated.json';",
    "import { createCollectorArtRuntime } from './collector-art-library.js';",
    'const collectorArt = createCollectorArtRuntime(generatedAssetManifest);',
    'collectorArt.preload(this);'
  ].join('\n');
}
