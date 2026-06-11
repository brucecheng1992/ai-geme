import { copyFile, readdir, readFile, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

import { z } from 'zod';

import type { AssetManifestAsset, AssetPlan } from './schemas.js';

const PackAssetSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
  role: z.enum(['player_character', 'enemy', 'projectile', 'collectible', 'hazard', 'background', 'ui_panel']),
  file: z.string().min(1).refine(isSafePackAssetFile, {
    message: 'asset file must be a relative .svg path inside the local pack'
  }),
  format: z.literal('svg'),
  license: z
    .strictObject({
      id: z.string().min(1).max(40),
      name: z.string().min(1).max(120),
      attribution: z.string().min(1).max(160),
      sourceUrl: z.string().url()
    })
    .optional()
});

const LocalAssetPackSchema = z.strictObject({
  version: z.literal('local-asset-pack-v0.1'),
  id: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
  label: z.string().min(1).max(120),
  license: z.strictObject({
    id: z.string().min(1).max(40),
    name: z.string().min(1).max(120),
    attribution: z.string().min(1).max(160),
    sourceUrl: z.string().url()
  }),
  style: z.strictObject({
    genres: z.array(z.enum(['collector', 'dodger', 'shooter'])).min(1),
    camera: z.literal('top_down'),
    tags: z.array(z.string().min(1).max(40)).min(1)
  }),
  assets: z.array(PackAssetSchema).min(1)
});

type LocalAssetPack = z.infer<typeof LocalAssetPackSchema>;

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

  return packs;
}

function selectCompletePackAssets(plan: AssetPlan, pack: LocalAssetPack) {
  const assetsById = new Map(pack.assets.map((asset) => [asset.id, asset]));
  const selected = [];

  for (const planItem of plan.items) {
    const packAsset = assetsById.get(planItem.id);
    if (packAsset === undefined || packAsset.role !== planItem.role || packAsset.format !== planItem.format) {
      return undefined;
    }

    selected.push({ planItem, packAsset });
  }

  return selected;
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

function isSafePackAssetFile(value: string): boolean {
  if (isAbsolute(value) || value.includes('\\') || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return false;
  }

  if (!value.endsWith('.svg')) {
    return false;
  }

  return value.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}
