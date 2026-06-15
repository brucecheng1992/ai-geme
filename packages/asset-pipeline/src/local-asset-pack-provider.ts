import { copyFile, readdir, readFile, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

import type { AssetManifestAsset, AssetPlan } from './schemas.js';
import { exportRuntimeArtAssetMetadataFromDirectory, type RuntimeArtAssetMetadata } from './art-asset-metadata.runtime-export.js';
import { indexLocalAssetPackMetadata, LocalAssetPackSchema, type LocalAssetPack } from './local-asset-pack.schema.js';
import { buildHardSemanticRejection, buildLocalAssetSemanticFit, type AssetResolutionCandidate, type AssetResolutionMissingAsset } from './resolution-report.js';

const SMALL_LIBRARY_METADATA_DIR = 'tests/fixtures/art-library-small-v0.1/metadata';
const RUNTIME_CONTEXT = 'production_default_runtime';
const TEMPLATE_ASSET_CATALOG_VERSION = 'template_asset_catalog.v1';

export type LocalAssetSelection = {
  manifestAssets: AssetManifestAsset[];
  files: string[];
  provider: 'local_asset_pack' | 'local_mixed_assets';
};

export type LocalAssetResolution = {
  selection?: LocalAssetSelection;
  candidates: AssetResolutionCandidate[];
};

export type ProjectLocalAssetBlacklist = {
  candidates: Array<{ packId: string; assetId: string; role: string; reason: string }>;
};

type ResolveLocalAssetPackInput = {
  plan: AssetPlan;
  projectAssetsDir: string;
  packsDir?: string;
  blacklist?: ProjectLocalAssetBlacklist;
  enableMixed?: boolean;
};

export async function selectLocalAssetPack(input: ResolveLocalAssetPackInput): Promise<LocalAssetSelection | undefined> {
  return (await resolveLocalAssetPack(input)).selection;
}

export async function resolveLocalAssetPack(input: ResolveLocalAssetPackInput): Promise<LocalAssetResolution> {
  const packsRoot = resolve(input.packsDir ?? process.env.AGM_ASSET_PACKS_DIR ?? join(process.cwd(), 'assets', 'asset-packs'));
  const packs = await readLocalPacks(packsRoot);
  const genre = assetPlanGenre(input.plan);
  const candidates: AssetResolutionCandidate[] = [];

  for (const pack of packs) {
    const blacklisted = input.blacklist?.candidates.filter((candidate) => candidate.packId === pack.id) ?? [];
    if (blacklisted.length > 0) {
      candidates.push(buildBlacklistedCandidate(pack, blacklisted));
      continue;
    }

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
        provider: 'local_asset_pack',
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
            catalogRef: localPackCatalogRef(pack.id, planItem.id),
            required: planItem.required,
            status: 'ready',
            size: planItem.size,
            semanticFit: buildLocalAssetSemanticFit(planItem, packAsset.semantic)
          };
        })
      }
    };
  }

  if (input.enableMixed === false) {
    return { candidates };
  }

  const mixedSelection = await selectMixedAssetsByRole({ ...input, packs });
  return mixedSelection === undefined ? { candidates } : { candidates, selection: mixedSelection };
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

async function selectMixedAssetsByRole(input: ResolveLocalAssetPackInput & { packs: LocalAssetPack[] }): Promise<LocalAssetSelection | undefined> {
  const packsRoot = resolve(input.packsDir ?? process.env.AGM_ASSET_PACKS_DIR ?? join(process.cwd(), 'assets', 'asset-packs'));
  const runtimeLibrary = await readRuntimeSmallLibraryAssets(packsRoot);
  const manifestAssets: AssetManifestAsset[] = [];
  const files: string[] = [];
  let usedLocalAsset = false;

  for (const planItem of input.plan.items) {
    const localAsset = findMixedLocalPackAsset(input.plan, planItem, input.packs);
    if (localAsset !== undefined) {
      const sourcePath = resolve(input.packsDir ?? process.env.AGM_ASSET_PACKS_DIR ?? join(process.cwd(), 'assets', 'asset-packs'), localAsset.pack.id, localAsset.packAsset.file);
      const packRoot = resolve(input.packsDir ?? process.env.AGM_ASSET_PACKS_DIR ?? join(process.cwd(), 'assets', 'asset-packs'), localAsset.pack.id);
      assertInside(packRoot, sourcePath, `asset ${planItem.id}`);
      await copyFile(sourcePath, join(input.projectAssetsDir, `${planItem.id}.svg`));
      files.push(`public/assets/${planItem.id}.svg`);
      manifestAssets.push(buildMixedLocalPackManifestAsset(planItem, localAsset.pack, localAsset.packAsset));
      usedLocalAsset = true;
      continue;
    }

    const runtimeAsset = findRuntimeAsset(planItem, runtimeLibrary.assets);
    if (runtimeAsset !== undefined) {
      const thumbnailPath = resolve(runtimeLibrary.projectRoot, runtimeAsset.technical.thumbnail_path);
      assertInside(runtimeLibrary.projectRoot, thumbnailPath, `runtime asset ${runtimeAsset.asset_id}`);
      await copyFile(thumbnailPath, join(input.projectAssetsDir, `${planItem.id}.png`));
      files.push(`public/assets/${planItem.id}.png`);
      manifestAssets.push(buildRuntimeManifestAsset(planItem, runtimeAsset));
      usedLocalAsset = true;
    }
  }

  if (!usedLocalAsset) {
    return undefined;
  }

  return {
    provider: 'local_mixed_assets',
    files,
    manifestAssets
  };
}

function findMixedLocalPackAsset(plan: AssetPlan, planItem: AssetPlan['items'][number], packs: LocalAssetPack[]) {
  const genre = assetPlanGenre(plan);
  for (const pack of packs) {
    if (!pack.style.genres.includes(genre) || pack.style.camera !== plan.style.camera) {
      continue;
    }

    const packAsset = indexLocalAssetPackMetadata(pack).assetsById.get(planItem.id);
    if (packAsset === undefined || packAsset.role !== planItem.role || packAsset.format !== planItem.format) {
      continue;
    }

    if (buildHardSemanticRejection(planItem, packAsset.semantic) !== undefined) {
      continue;
    }

    if (planItem.role === 'projectile' && planItem.semantic?.expectedConcept === 'fishbone' && !packAsset.semantic?.subjectTags.includes('fishbone')) {
      continue;
    }

    return { pack, packAsset };
  }

  return undefined;
}

async function readRuntimeSmallLibraryAssets(packsRoot: string): Promise<{ assets: RuntimeArtAssetMetadata[]; projectRoot: string }> {
  const projectRoot = resolve(packsRoot, '..', '..');
  const metadataDir = resolve(projectRoot, SMALL_LIBRARY_METADATA_DIR);
  const result = await exportRuntimeArtAssetMetadataFromDirectory(metadataDir);
  return {
    assets: result.ok ? result.artifact?.assets ?? [] : [],
    projectRoot
  };
}

function findRuntimeAsset(planItem: AssetPlan['items'][number], runtimeAssets: RuntimeArtAssetMetadata[]): RuntimeArtAssetMetadata | undefined {
  const constraint = planItem.semantic;
  const runtimeRole = toRuntimeGameplayRole(planItem.role);
  if (constraint === undefined || runtimeRole === undefined) {
    return undefined;
  }

  return runtimeAssets.find((asset) => {
    if (asset.status !== 'approved') {
      return false;
    }
    if (!asset.gameplay.role.includes(runtimeRole)) {
      return false;
    }
    if (!asset.gameplay.allowed_contexts.includes(RUNTIME_CONTEXT) || asset.gameplay.blocked_contexts.includes(RUNTIME_CONTEXT)) {
      return false;
    }

    const tags = asset.semantic.tags;
    const hasExpectedTag = constraint.expectedAnyTags.some((tag) => tags.includes(tag));
    const hasForbiddenTag = constraint.forbiddenTags.some((tag) => tags.includes(tag));
    return hasExpectedTag && !hasForbiddenTag;
  });
}

function toRuntimeGameplayRole(role: AssetPlan['items'][number]['role']): RuntimeArtAssetMetadata['gameplay']['role'][number] | undefined {
  return role === 'player_character' || role === 'enemy' || role === 'projectile' || role === 'collectible' ? role : undefined;
}

function buildMixedLocalPackManifestAsset(
  planItem: AssetPlan['items'][number],
  pack: LocalAssetPack,
  packAsset: LocalAssetPack['assets'][number]
): AssetManifestAsset {
  const license = packAsset.license ?? pack.license;
  return {
    id: planItem.id,
    loadKey: `agm.${planItem.id}`,
    role: planItem.role,
    type: 'image',
    format: 'svg',
    path: `assets/${planItem.id}.svg`,
    source: 'local_asset_pack',
    sourcePack: pack.id,
    licenseId: license.id,
    licenseName: license.name,
    attribution: license.attribution,
    sourceUrl: license.sourceUrl,
    catalogRef: localPackCatalogRef(pack.id, planItem.id),
    required: planItem.required,
    status: 'ready',
    size: planItem.size,
    semanticFit: buildLocalAssetSemanticFit(planItem, packAsset.semantic)
  };
}

function buildRuntimeManifestAsset(planItem: AssetPlan['items'][number], runtimeAsset: RuntimeArtAssetMetadata): AssetManifestAsset {
  return {
    id: planItem.id,
    loadKey: `agm.${planItem.id}`,
    role: planItem.role,
    type: 'image',
    format: 'png',
    path: `assets/${planItem.id}.png`,
    source: 'runtime_asset',
    licenseId: 'CC0-1.0',
    licenseName: 'Creative Commons CC0 1.0 Universal',
    attribution: runtimeAsset.title,
    sourceUrl: 'https://kenney.nl/assets/cube-pets',
    runtimeAssetId: runtimeAsset.asset_id,
    runtimeContext: RUNTIME_CONTEXT,
    catalogRef: runtimeCatalogRef(runtimeAsset.asset_id),
    conversion: {
      status: 'thumbnail_copied',
      sourcePath: runtimeAsset.technical.thumbnail_path,
      outputPath: `assets/${planItem.id}.png`
    },
    required: planItem.required,
    status: 'ready',
    size: planItem.size,
    renderTransform: runtimeAsset.asset_id === 'creature_kenney_cube_pet_cat_001' ? { rotationDegrees: 180 } : undefined,
    semanticFit: buildRuntimeAssetSemanticFit(planItem, runtimeAsset)
  };
}

function localPackCatalogRef(packId: string, assetId: string): AssetManifestAsset['catalogRef'] {
  return {
    catalogVersion: TEMPLATE_ASSET_CATALOG_VERSION,
    catalogAssetId: `local-pack:${packId}:${assetId}`,
    source: 'local-template'
  };
}

function runtimeCatalogRef(runtimeAssetId: string): AssetManifestAsset['catalogRef'] {
  return {
    catalogVersion: TEMPLATE_ASSET_CATALOG_VERSION,
    catalogAssetId: `runtime-small-library:${runtimeAssetId}`,
    source: 'local-template'
  };
}

function buildRuntimeAssetSemanticFit(planItem: AssetPlan['items'][number], runtimeAsset: RuntimeArtAssetMetadata) {
  const constraint = planItem.semantic;
  const actualTags = runtimeAsset.semantic.tags;
  if (constraint === undefined) {
    return {
      status: 'not_applicable' as const,
      confidence: 1,
      actualTags,
      reason: 'No semantic constraint was requested for this runtime asset.'
    };
  }

  const missingTags = constraint.expectedAnyTags.filter((tag) => !actualTags.includes(tag));
  const conflictingTags = actualTags.filter((tag) => constraint.forbiddenTags.includes(tag));
  const exact = actualTags.includes(constraint.expectedConcept);
  return {
    status: exact ? ('exact' as const) : ('compatible' as const),
    confidence: exact ? 1 : 0.85,
    strictness: constraint.strictness,
    expectedConcept: constraint.expectedConcept,
    expectedAnyTags: constraint.expectedAnyTags,
    actualTags,
    missingTags,
    conflictingTags,
    reason: exact
      ? `Runtime asset semantic tags exactly match expected ${constraint.expectedConcept}.`
      : `Runtime asset semantic tags are compatible with expected ${constraint.expectedConcept}.`
  };
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

function buildBlacklistedCandidate(pack: LocalAssetPack, blacklisted: ProjectLocalAssetBlacklist['candidates']): AssetResolutionCandidate {
  return {
    packId: pack.id,
    status: 'rejected',
    reason: 'hard_semantic_mismatch',
    message: `Local asset pack ${pack.id} is project-blacklisted by asset repair plan.`,
    assetRejections: blacklisted.map((candidate) => ({
      assetId: candidate.assetId,
      role: candidate.role,
      actualTags: [],
      missingTags: [],
      conflictingTags: [],
      reason: candidate.reason
    }))
  };
}

function assetPlanGenre(plan: AssetPlan): 'collector' | 'dodger' | 'shooter' | 'side_scrolling_run_and_gun' {
  if (plan.style.visual_theme.startsWith('side_scrolling_run_and_gun_')) {
    return 'side_scrolling_run_and_gun';
  }

  const [genre] = plan.style.visual_theme.split('_');
  if (genre === 'collector' || genre === 'dodger' || genre === 'shooter' || genre === 'side_scrolling_run_and_gun') {
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
