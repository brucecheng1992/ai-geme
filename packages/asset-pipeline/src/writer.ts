import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { NormalizedGameIr } from '../../game-dsl/src/index.js';
import { resolveLocalAssetPack } from './local-asset-pack-provider.js';
import { buildAssetPlanFromIr } from './plan.js';
import { buildAssetResolutionReport, buildTemplateSemanticFit } from './resolution-report.js';
import { AssetManifestSchema, summarizeManifestAssets, type AssetManifest, type AssetManifestAsset, type AssetPlan } from './schemas.js';
import { renderTemplateSvg } from './template-svg-provider.js';

export type WriteAssetArtifactsResult = {
  plan: AssetPlan;
  manifest: AssetManifest;
  files: string[];
};

export async function writeAssetArtifacts(input: {
  projectId: string;
  projectDir: string;
  ir: NormalizedGameIr;
  assetPacksDir?: string;
}): Promise<WriteAssetArtifactsResult> {
  const plan = buildAssetPlanFromIr(input.projectId, input.ir);
  const publicDir = join(input.projectDir, 'public');
  const assetsDir = join(publicDir, 'assets');

  await mkdir(assetsDir, { recursive: true });
  await writeFile(join(input.projectDir, 'asset_plan.json'), `${JSON.stringify(plan, null, 2)}\n`, 'utf8');

  const localPackResolution = await resolveLocalAssetPack({ plan, projectAssetsDir: assetsDir, packsDir: input.assetPacksDir });
  const manifest =
    localPackResolution.selection === undefined ? await writeTemplateSvgAssets(plan, assetsDir) : buildManifest(plan, localPackResolution.selection.manifestAssets);
  const report = buildAssetResolutionReport({ plan, manifest, candidates: localPackResolution.candidates });
  const assetFiles = localPackResolution.selection?.files ?? plan.items.map((item) => `public/assets/${item.id}.svg`);

  await writeFile(join(publicDir, 'asset_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeFile(join(input.projectDir, 'asset_resolution_report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  return {
    plan,
    manifest,
    files: ['asset_plan.json', 'public/asset_manifest.json', 'asset_resolution_report.json', ...assetFiles]
  };
}

async function writeTemplateSvgAssets(plan: AssetPlan, assetsDir: string): Promise<AssetManifest> {
  const assets: AssetManifestAsset[] = [];
  for (const item of plan.items) {
    const fileName = `${item.id}.svg`;
    await writeFile(join(assetsDir, fileName), renderTemplateSvg(item), 'utf8');
    assets.push({
      id: item.id,
      loadKey: `agm.${item.id}`,
      role: item.role,
      type: 'image',
      format: item.format,
      path: `assets/${item.id}.svg`,
      source: 'template_svg',
      required: item.required,
      status: 'ready',
      size: item.size,
      semanticFit: buildTemplateSemanticFit(item)
    });
  }

  return buildManifest(plan, assets);
}

function buildManifest(plan: AssetPlan, assets: AssetManifestAsset[]): AssetManifest {
  return AssetManifestSchema.parse({
    version: 'asset-manifest-v0.1',
    projectId: plan.projectId,
    strict: true,
    assets,
    summary: summarizeManifestAssets(assets)
  });
}
