import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { AssetManifestSchema, AssetPlanSchema, type AssetManifest, type AssetManifestAsset, type AssetPlan } from './schemas.js';

export type AssetManifestFailureCode = 'ASSET_MANIFEST_INVALID' | 'ASSET_MISSING' | 'REQUIRED_CORE_ASSET_PLACEHOLDER_USED';
export type AssetManifestValidationResult =
  | { ok: true; manifest: AssetManifest }
  | { ok: false; code: AssetManifestFailureCode; message: string };
type AssetContractCheckResult = { ok: true } | { ok: false; code: AssetManifestFailureCode; message: string };

export async function validateGeneratedProjectAssets(input: {
  projectId: string;
  projectDir: string;
  assetRootDir?: string;
  allowPlaceholderPlayable?: boolean;
}): Promise<AssetManifestValidationResult> {
  const assetRootDir = input.assetRootDir ?? join(input.projectDir, 'public');
  const plan = await readAssetPlan(input.projectId, input.projectDir);
  if (!plan.ok) {
    return plan;
  }

  const manifest = await readAssetManifest(input.projectId, assetRootDir);
  if (!manifest.ok) {
    return manifest;
  }

  const manifestById = new Map(manifest.manifest.assets.map((asset) => [asset.id, asset]));
  const coverage = validateRequiredPlanAssets(plan.plan.items, manifestById);
  if (!coverage.ok) {
    return coverage;
  }

  for (const asset of manifest.manifest.assets) {
    if (asset.required && asset.status !== 'ready') {
      return {
        ok: false,
        code: 'ASSET_MANIFEST_INVALID',
        message: `Required asset ${asset.id} is not ready.`
      };
    }

    if (asset.source === 'placeholder' && isCoreRole(asset.role) && input.allowPlaceholderPlayable !== true) {
      return {
        ok: false,
        code: 'REQUIRED_CORE_ASSET_PLACEHOLDER_USED',
        message: `Required core asset ${asset.id} uses placeholder provider.`
      };
    }

    const fileResult = await validateAssetFile(assetRootDir, asset);
    if (!fileResult.ok) {
      return fileResult;
    }
  }

  return { ok: true, manifest: manifest.manifest };
}

async function readAssetPlan(projectId: string, projectDir: string) {
  let rawPlan: unknown;

  try {
    rawPlan = JSON.parse(await readFile(join(projectDir, 'asset_plan.json'), 'utf8'));
  } catch (error) {
    return {
      ok: false,
      code: 'ASSET_MANIFEST_INVALID',
      message: `Asset plan is missing or unreadable: ${errorMessage(error)}`
    } as const;
  }

  const parsedPlan = AssetPlanSchema.safeParse(rawPlan);
  if (!parsedPlan.success) {
    return {
      ok: false,
      code: 'ASSET_MANIFEST_INVALID',
      message: parsedPlan.error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; ')
    } as const;
  }

  if (parsedPlan.data.projectId !== projectId) {
    return {
      ok: false,
      code: 'ASSET_MANIFEST_INVALID',
      message: `Asset plan projectId ${parsedPlan.data.projectId} does not match project ${projectId}.`
    } as const;
  }

  return { ok: true, plan: parsedPlan.data } as const;
}

async function readAssetManifest(projectId: string, publicDir: string) {
  let rawManifest: unknown;

  try {
    rawManifest = JSON.parse(await readFile(join(publicDir, 'asset_manifest.json'), 'utf8'));
  } catch (error) {
    return {
      ok: false,
      code: 'ASSET_MANIFEST_INVALID',
      message: `Asset manifest is missing or unreadable: ${errorMessage(error)}`
    } as const;
  }

  const parsed = AssetManifestSchema.safeParse(rawManifest);
  if (!parsed.success) {
    return {
      ok: false,
      code: 'ASSET_MANIFEST_INVALID',
      message: parsed.error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; ')
    } as const;
  }

  if (parsed.data.projectId !== projectId) {
    return {
      ok: false,
      code: 'ASSET_MANIFEST_INVALID',
      message: `Asset manifest projectId ${parsed.data.projectId} does not match project ${projectId}.`
    } as const;
  }

  return { ok: true, manifest: parsed.data } as const;
}

function validateRequiredPlanAssets(
  items: AssetPlan['items'],
  manifestById: Map<string, AssetManifestAsset>
): AssetContractCheckResult {
  for (const item of items) {
    if (!item.required) {
      continue;
    }

    const asset = manifestById.get(item.id);
    if (asset === undefined) {
      return {
        ok: false,
        code: 'ASSET_MANIFEST_INVALID',
        message: `Required asset ${item.id} from asset_plan.json is missing from asset_manifest.json.`
      };
    }

    if (!asset.required || asset.status !== 'ready') {
      return {
        ok: false,
        code: 'ASSET_MANIFEST_INVALID',
        message: `Required asset ${item.id} from asset_plan.json is not ready in asset_manifest.json.`
      };
    }

    if (asset.role !== item.role || asset.format !== item.format || asset.size.w !== item.size.w || asset.size.h !== item.size.h) {
      return {
        ok: false,
        code: 'ASSET_MANIFEST_INVALID',
        message: `Required asset ${item.id} manifest metadata does not match asset_plan.json.`
      };
    }
  }

  return { ok: true };
}

async function validateAssetFile(publicDir: string, asset: AssetManifestAsset): Promise<AssetContractCheckResult> {
  try {
    const assetStat = await stat(join(publicDir, asset.path));
    if (!assetStat.isFile()) {
      return {
        ok: false,
        code: 'ASSET_MISSING',
        message: `Asset path is not a regular file for ${asset.id}: ${asset.path}`
      };
    }
  } catch {
    return {
      ok: false,
      code: 'ASSET_MISSING',
      message: `Asset file is missing for ${asset.id}: ${asset.path}`
    };
  }

  return { ok: true };
}

function isCoreRole(role: AssetManifestAsset['role']): boolean {
  return role === 'player_character' || role === 'enemy' || role === 'projectile' || role === 'collectible' || role === 'hazard';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
