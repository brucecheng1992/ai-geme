import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { NormalizedGameIr } from '../../game-dsl/src/index.js';
import { buildAssetPlanFromIr } from './plan.js';
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
}): Promise<WriteAssetArtifactsResult> {
  const plan = buildAssetPlanFromIr(input.projectId, input.ir);
  const publicDir = join(input.projectDir, 'public');
  const assetsDir = join(publicDir, 'assets');
  const manifest = buildTemplateSvgManifest(plan);

  await mkdir(assetsDir, { recursive: true });
  await writeFile(join(input.projectDir, 'asset_plan.json'), `${JSON.stringify(plan, null, 2)}\n`, 'utf8');

  const assetFiles: string[] = [];
  for (const item of plan.items) {
    const fileName = `${item.id}.svg`;
    await writeFile(join(assetsDir, fileName), renderTemplateSvg(item), 'utf8');
    assetFiles.push(`public/assets/${fileName}`);
  }

  await writeFile(join(publicDir, 'asset_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return {
    plan,
    manifest,
    files: ['asset_plan.json', 'public/asset_manifest.json', ...assetFiles]
  };
}

function buildTemplateSvgManifest(plan: AssetPlan): AssetManifest {
  const assets: AssetManifestAsset[] = plan.items.map((item) => ({
    id: item.id,
    role: item.role,
    type: 'image',
    format: item.format,
    path: `assets/${item.id}.svg`,
    source: 'template_svg',
    required: item.required,
    status: 'ready',
    size: item.size
  }));

  return AssetManifestSchema.parse({
    version: 'asset-manifest-v0.1',
    projectId: plan.projectId,
    strict: true,
    assets,
    summary: summarizeManifestAssets(assets)
  });
}
