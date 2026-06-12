import { copyFile, readdir, readFile, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

import type { AssetManifestAsset, AssetPlan } from './schemas.js';
import { indexLocalAssetPackMetadata, LocalAssetPackSchema, type LocalAssetPack } from './local-asset-pack.schema.js';
import { buildHardSemanticRejection, buildLocalAssetSemanticFit, type AssetResolutionCandidate, type AssetResolutionMissingAsset } from './resolution-report.js';

export type LocalAssetSelection = {
  manifestAssets: AssetManifestAsset[];
  files: string[];
};

export type LocalAssetResolution = {
  selection?: LocalAssetSelection;
  candidates: AssetResolutionCandidate[];
};

export async function selectLocalAssetPack(input: { plan: AssetPlan; projectAssetsDir: string; packsDir?: string }): Promise<LocalAssetSelection | undefined> {
  return (await resolveLocalAssetPack(input)).selection;
}

export async function resolveLocalAssetPack(input: { plan: AssetPlan; projectAssetsDir: string; packsDir?: string }): Promise<LocalAssetResolution> {
  const packsRoot = resolve(input.packsDir ?? process.env.AGM_ASSET_PACKS_DIR ?? join(process.cwd(), 'assets', 'asset-packs'));
  const packs = await readLocalPacks(packsRoot);
  const genre = assetPlanGenre(input.plan);
  const candidates: AssetResolutionCandidate[] = [];

  for (const pack of packs) {
    if (!pack.style.genres.includes(genre) || pack.style.camera !== input.plan.style.camera) {
      candidates.push(buildStyleMismatchCandidate(pack, genre, input.plan.style.camera));
      continue;
    }

    const selected = selectCompletePackAssets(input.plan, pack);
    if (!selected.ok) {
      candidates.push(selected.candidate);
      continue;
    }

    const files: string[] = [];
    for (const asset of selected.assets) {
      const sourcePath = resolve(packsRoot, pack.id, asset.packAsset.file);
      assertInside(resolve(packsRoot, pack.id), sourcePath, `asset ${asset.planItem.id}`);
      await copyFile(sourcePath, join(input.projectAssetsDir, `${asset.planItem.id}.svg`));
      files.push(`public/assets/${asset.planItem.id}.svg`);
    }

    candidates.push({
      packId: pack.id,
      status: 'selected',
      reason: 'selected',
      message: `Selected complete local asset pack ${pack.id}.`
    });

    return {
      candidates,
      selection: {
        files,
        manifestAssets: selected.assets.map(({ planItem, packAsset }) => {
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
            size: planItem.size,
            semanticFit: buildLocalAssetSemanticFit(planItem, packAsset.semantic)
          };
        })
      }
    };
  }

  return { candidates };
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
  const assets = [];
  const missingAssets: AssetResolutionMissingAsset[] = [];
  const semanticRejections = [];
  let hasIncompleteCoverage = false;

  for (const planItem of plan.items) {
    const packAsset = assetsById.get(planItem.id);
    if (packAsset === undefined || packAsset.role !== planItem.role || packAsset.format !== planItem.format) {
      hasIncompleteCoverage = true;
      missingAssets.push({
        assetId: planItem.id,
        expectedRole: planItem.role,
        expectedFormat: planItem.format,
        actualRole: packAsset?.role,
        actualFormat: packAsset?.format,
        reason: packAsset === undefined ? 'missing' : packAsset.role !== planItem.role ? 'role_mismatch' : 'format_mismatch'
      });
      continue;
    }

    const semanticRejection = buildHardSemanticRejection(planItem, packAsset.semantic);
    if (semanticRejection !== undefined) {
      semanticRejections.push(semanticRejection);
    }

    assets.push({ planItem, packAsset });
  }

  if (hasIncompleteCoverage) {
    return { ok: false, candidate: buildIncompletePackCandidate(pack, missingAssets) } as const;
  }

  if (semanticRejections.length > 0) {
    return {
      ok: false,
      candidate: {
        packId: pack.id,
        status: 'rejected',
        reason: 'hard_semantic_mismatch',
        message: `Local asset pack ${pack.id} failed hard semantic constraints.`,
        assetRejections: semanticRejections
      }
    } as const;
  }

  return { ok: true, assets } as const;
}

function buildStyleMismatchCandidate(pack: LocalAssetPack, expectedGenre: string, expectedCamera: AssetPlan['style']['camera']): AssetResolutionCandidate {
  return {
    packId: pack.id,
    status: 'skipped',
    reason: 'style_mismatch',
    message: `Local asset pack ${pack.id} does not match ${expectedGenre}/${expectedCamera}.`,
    expectedStyle: { genre: expectedGenre, camera: expectedCamera },
    actualStyle: { genres: pack.style.genres, camera: pack.style.camera }
  };
}

function buildIncompletePackCandidate(pack: LocalAssetPack, missingAssets: AssetResolutionMissingAsset[]): AssetResolutionCandidate {
  return {
    packId: pack.id,
    status: 'rejected',
    reason: 'incomplete_pack',
    message: `Local asset pack ${pack.id} does not fully cover the asset plan.`,
    missingAssets
  };
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
