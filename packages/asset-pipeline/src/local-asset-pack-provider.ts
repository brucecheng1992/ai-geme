import { copyFile, readdir, readFile, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

import type { AssetManifestAsset, AssetPlan, AssetPlanItem } from './schemas.js';
import { indexLocalAssetPackMetadata, LocalAssetPackSchema, type LocalAssetPack, type LocalPackAssetSemanticMetadata } from './local-asset-pack.schema.js';

export type LocalAssetSelection = {
  manifestAssets: AssetManifestAsset[];
  files: string[];
};

export async function selectLocalAssetPack(input: {
  plan: AssetPlan;
  projectAssetsDir: string;
  packsDir?: string;
}): Promise<LocalAssetSelection | undefined> {
  const packsRoot = resolve(input.packsDir ?? process.env.AGM_ASSET_PACKS_DIR ?? join(process.cwd(), 'assets', 'asset-packs'));
  const packs = await readLocalPacks(packsRoot);
  const genre = assetPlanGenre(input.plan);

  for (const pack of packs) {
    if (!pack.style.genres.includes(genre) || pack.style.camera !== input.plan.style.camera) {
      continue;
    }

    const selected = selectCompletePackAssets(input.plan, pack);
    if (selected === undefined) {
      continue;
    }

    const files: string[] = [];
    for (const asset of selected) {
      const sourcePath = resolve(packsRoot, pack.id, asset.packAsset.file);
      assertInside(resolve(packsRoot, pack.id), sourcePath, `asset ${asset.planItem.id}`);
      await copyFile(sourcePath, join(input.projectAssetsDir, `${asset.planItem.id}.svg`));
      files.push(`public/assets/${asset.planItem.id}.svg`);
    }

    return {
      files,
      manifestAssets: selected.map(({ planItem, packAsset }) => {
        const license = packAsset.license ?? pack.license;
        return {
          id: planItem.id,
          loadKey: `agm.${planItem.id}`,
          role: planItem.role,
          type: 'image',
          format: planItem.format,
          path: `assets/${planItem.id}.svg`,
          source: 'local_asset_pack',
          sourcePack: pack.id,
          licenseId: license.id,
          licenseName: license.name,
          attribution: license.attribution,
          sourceUrl: license.sourceUrl,
          required: planItem.required,
          status: 'ready',
          size: planItem.size
        };
      })
    };
  }

  return undefined;
}

async function readLocalPacks(packsRoot: string): Promise<LocalAssetPack[]> {
  let entries: string[];
  try {
    entries = await readdir(packsRoot);
  } catch {
    return [];
  }

  const packs: LocalAssetPack[] = [];
  for (const entry of entries.sort()) {
    const packDir = resolve(packsRoot, entry);
    const entryStat = await stat(packDir);
    if (!entryStat.isDirectory()) {
      continue;
    }

    const manifestPath = resolve(packDir, 'pack.json');
    const parsed = LocalAssetPackSchema.safeParse(JSON.parse(await readFile(manifestPath, 'utf8')));
    if (!parsed.success) {
      throw new Error(`Local asset pack manifest is invalid at ${manifestPath}: ${parsed.error.message}`);
    }

    if (parsed.data.id !== entry) {
      throw new Error(`Local asset pack id ${parsed.data.id} must match directory ${entry}.`);
    }

    packs.push(parsed.data);
  }

  return packs.sort(compareLocalAssetPacks);
}

function compareLocalAssetPacks(left: LocalAssetPack, right: LocalAssetPack): number {
  const priorityDelta = (right.priority ?? 0) - (left.priority ?? 0);
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return left.id.localeCompare(right.id);
}

function selectCompletePackAssets(plan: AssetPlan, pack: LocalAssetPack) {
  const { assetsById } = indexLocalAssetPackMetadata(pack);
  const selected = [];

  for (const planItem of plan.items) {
    const packAsset = assetsById.get(planItem.id);
    if (packAsset === undefined || packAsset.role !== planItem.role || packAsset.format !== planItem.format) {
      return undefined;
    }

    if (!assetSatisfiesHardSemanticConstraint(planItem, packAsset.semantic)) {
      return undefined;
    }

    selected.push({ planItem, packAsset });
  }

  return selected;
}

function assetSatisfiesHardSemanticConstraint(planItem: AssetPlanItem, assetSemantic: LocalPackAssetSemanticMetadata | undefined): boolean {
  const constraint = planItem.semantic;
  if (constraint?.strictness !== 'hard') {
    return true;
  }

  if (assetSemantic === undefined) {
    return false;
  }

  if (!hasAnyTag(assetSemantic.subjectTags, constraint.expectedAnyTags)) {
    return false;
  }

  if (hasAnyTag([...assetSemantic.subjectTags, ...assetSemantic.themeTags], constraint.forbiddenTags)) {
    return false;
  }

  return !hasAnyTag(assetSemantic.forbiddenTags, constraint.expectedAnyTags);
}

function hasAnyTag(left: readonly string[], right: readonly string[]): boolean {
  return left.some((tag) => right.includes(tag));
}

function assetPlanGenre(plan: AssetPlan): 'collector' | 'dodger' | 'shooter' {
  const [genre] = plan.style.visual_theme.split('_');
  if (genre === 'collector' || genre === 'dodger' || genre === 'shooter') {
    return genre;
  }

  throw new Error(`Unsupported asset plan genre: ${plan.style.visual_theme}`);
}

function assertInside(root: string, candidate: string, label: string): void {
  const pathFromRoot = relative(root, candidate);
  if (pathFromRoot === '' || pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
    throw new Error(`Local asset pack ${label} must stay inside ${root}.`);
  }
}
