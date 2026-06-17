import { readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { z } from 'zod';

import { AssetManifestSchema, type AssetManifest } from '../../../../packages/asset-pipeline/src/index.js';

export const AssetPipelineReportSchema = z.strictObject({
  version: z.literal('asset-pipeline-report-v0.1'),
  projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
  templateId: z.enum(['collector_v1', 'dodger_v1', 'shooter_v1', 'side_scrolling_run_and_gun.v1']),
  artifacts: z.strictObject({
    assetPlan: z.literal('asset_plan.json'),
    publicManifest: z.literal('public/asset_manifest.json'),
    previewManifest: z.string().regex(/^(collector|dodger|shooter|side_scrolling_run_and_gun)\/src\/asset-manifest\.generated\.json$/),
    resolutionReport: z.literal('asset_resolution_report.json')
  }),
  checks: z.strictObject({
    publicManifestMatchesPreviewManifest: z.literal(true),
    catalogIdentityMatchesPreviewManifest: z.literal(true),
    previewManifestConsumedByTemplate: z.literal(true),
    assetFilesListedInCompileResult: z.literal(true)
  }),
  manifest: z.strictObject({
    version: z.literal('asset-manifest-v0.1'),
    summary: AssetManifestSchema.shape.summary,
    assetIds: z.array(z.string().min(1)),
    requiredAssetIds: z.array(z.string().min(1)),
    loadKeys: z.array(z.string().min(1)),
    assetFiles: z.array(z.string().regex(/^public\/assets\/[a-z][a-z0-9_]{1,39}\.(svg|png)$/))
  })
});

export type AssetPipelineReport = z.infer<typeof AssetPipelineReportSchema>;

export async function writeAssetPipelineReport(input: {
  projectId: string;
  templateId: 'collector_v1' | 'dodger_v1' | 'shooter_v1' | 'side_scrolling_run_and_gun.v1';
  genre: 'collector' | 'dodger' | 'shooter' | 'side_scrolling_run_and_gun';
  outputDir: string;
  compileFiles: string[];
}): Promise<AssetPipelineReport> {
  const previewManifest = `${input.genre}/src/asset-manifest.generated.json`;
  const publicManifest = await readManifest(join(input.outputDir, 'public', 'asset_manifest.json'));
  const templateManifest = await readManifest(join(input.outputDir, previewManifest));
  const assetFiles = publicManifest.assets.map((asset) => `public/${asset.path}`);

  assertManifestProjectId(input.projectId, publicManifest);
  assertCatalogIdentityMatches(publicManifest, templateManifest);
  assertManifestIdentity(publicManifest, templateManifest);
  assertListedFiles(input.compileFiles, ['asset_plan.json', 'public/asset_manifest.json', 'asset_resolution_report.json', ...assetFiles]);
  await assertPreviewManifestConsumed(input.outputDir, input.genre);
  await assertAssetFilesExist(input.outputDir, assetFiles);

  const report = AssetPipelineReportSchema.parse({
    version: 'asset-pipeline-report-v0.1',
    projectId: input.projectId,
    templateId: input.templateId,
    artifacts: {
      assetPlan: 'asset_plan.json',
      publicManifest: 'public/asset_manifest.json',
      previewManifest,
      resolutionReport: 'asset_resolution_report.json'
    },
    checks: {
      publicManifestMatchesPreviewManifest: true,
      catalogIdentityMatchesPreviewManifest: true,
      previewManifestConsumedByTemplate: true,
      assetFilesListedInCompileResult: true
    },
    manifest: {
      version: publicManifest.version,
      summary: publicManifest.summary,
      assetIds: publicManifest.assets.map((asset) => asset.id),
      requiredAssetIds: publicManifest.assets.filter((asset) => asset.required).map((asset) => asset.id),
      loadKeys: publicManifest.assets.map((asset) => asset.loadKey),
      assetFiles
    }
  });

  await writeFile(join(input.outputDir, 'asset_pipeline_report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}

async function readManifest(path: string): Promise<AssetManifest> {
  return AssetManifestSchema.parse(JSON.parse(await readFile(path, 'utf8')));
}

function assertManifestProjectId(projectId: string, manifest: AssetManifest): void {
  if (manifest.projectId !== projectId) {
    throw new Error(`Generated asset manifest projectId ${manifest.projectId} does not match project ${projectId}.`);
  }
}

function assertManifestIdentity(publicManifest: AssetManifest, templateManifest: AssetManifest): void {
  if (JSON.stringify(publicManifest) !== JSON.stringify(templateManifest)) {
    throw new Error('Generated public asset manifest does not match the Phaser preview manifest.');
  }
}

function assertCatalogIdentityMatches(publicManifest: AssetManifest, templateManifest: AssetManifest): void {
  const templateAssetsById = new Map(templateManifest.assets.map((asset) => [asset.id, asset]));
  for (const publicAsset of publicManifest.assets) {
    const templateAsset = templateAssetsById.get(publicAsset.id);
    if (JSON.stringify(publicAsset.catalogRef ?? null) !== JSON.stringify(templateAsset?.catalogRef ?? null)) {
      throw new Error(`Generated asset manifest catalog identity for ${publicAsset.id} does not match the Phaser preview manifest.`);
    }
  }
}

function assertListedFiles(files: string[], expectedFiles: string[]): void {
  const listed = new Set(files);
  const missing = expectedFiles.filter((file) => !listed.has(file));
  if (missing.length > 0) {
    throw new Error(`Compile result is missing asset pipeline files: ${missing.join(', ')}`);
  }
}

async function assertPreviewManifestConsumed(
  outputDir: string,
  genre: 'collector' | 'dodger' | 'shooter' | 'side_scrolling_run_and_gun'
): Promise<void> {
  const mainEntry = await readFile(join(outputDir, genre, 'src', 'main.ts'), 'utf8');
  const artRuntime = artRuntimeByGenre[genre];

  if (!/import\s+generatedAssetManifest\s+from\s+['"]\.\/asset-manifest\.generated\.json['"];?/.test(mainEntry)) {
    throw new Error(`Generated ${genre} preview entry does not import asset-manifest.generated.json.`);
  }

  const runtimeCall = new RegExp(`const\\s+${artRuntime.variableName}\\s*=\\s*${artRuntime.factoryName}\\(generatedAssetManifest\\)`);
  if (!runtimeCall.test(mainEntry)) {
    throw new Error(`Generated ${genre} preview entry does not pass asset-manifest.generated.json into ${artRuntime.factoryName}.`);
  }

  if (!mainEntry.includes(`${artRuntime.variableName}.preload(this`)) {
    throw new Error(`Generated ${genre} preview entry does not preload assets from ${artRuntime.variableName}.`);
  }
}

async function assertAssetFilesExist(outputDir: string, assetFiles: string[]): Promise<void> {
  for (const file of assetFiles) {
    const fileStat = await stat(join(outputDir, file));
    if (!fileStat.isFile()) {
      throw new Error(`Generated asset pipeline file is not a regular file: ${file}`);
    }
  }
}

const artRuntimeByGenre = {
  collector: {
    factoryName: 'createCollectorArtRuntime',
    variableName: 'collectorArt'
  },
  dodger: {
    factoryName: 'createDodgerArtRuntime',
    variableName: 'dodgerArt'
  },
  shooter: {
    factoryName: 'createShooterArtRuntime',
    variableName: 'shooterArt'
  },
  side_scrolling_run_and_gun: {
    factoryName: 'createSideScrollingArtRuntime',
    variableName: 'sideScrollingArt'
  }
} as const;
