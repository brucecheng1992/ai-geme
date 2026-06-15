import { readdir, readFile, stat } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';

import { z } from 'zod';

import {
  exportRuntimeArtAssetMetadataFromDirectory,
  LocalAssetPackSchema,
  type LocalAssetPack,
  type RuntimeArtAssetMetadata
} from '../../../../packages/asset-pipeline/src/index.js';

const CatalogAssetKindSchema = z.enum(['sprite', 'background', 'audio', 'ui', 'other']);
const CatalogSourceSchema = z.literal('local-template');
const SafeCatalogRelativePathSchema = z.string().min(1).refine(isSafeRelativeCatalogPath, 'catalog relativePath must be safe and relative');

export const TemplateAssetCatalogEntrySchema = z.strictObject({
  id: z.string().min(1),
  kind: CatalogAssetKindSchema,
  source: CatalogSourceSchema,
  relativePath: SafeCatalogRelativePathSchema,
  tags: z.array(z.string().min(1)),
  supportedGenres: z.array(z.string().min(1)),
  purpose: z.string().min(1),
  required: z.boolean()
});

export const TemplateAssetCatalogSchema = z
  .strictObject({
    catalogVersion: z.literal('template_asset_catalog.v1'),
    entries: z.array(TemplateAssetCatalogEntrySchema)
  })
  .superRefine((catalog, ctx) => {
    const ids = new Set<string>();
    for (const [index, entry] of catalog.entries.entries()) {
      if (ids.has(entry.id)) {
        ctx.addIssue({ code: 'custom', path: ['entries', index, 'id'], message: `duplicate catalog asset id: ${entry.id}` });
      }
      ids.add(entry.id);
    }
  });

export type TemplateAssetCatalog = z.infer<typeof TemplateAssetCatalogSchema>;
export type TemplateAssetCatalogEntry = z.infer<typeof TemplateAssetCatalogEntrySchema>;

type BuildTemplateAssetCatalogInput = {
  workspaceRoot: string;
  assetPacksDir?: string;
  runtimeMetadataDir?: string;
};

/** Builds the deterministic local/template asset catalog used only as evidence, not as resolver policy. */
export async function buildTemplateAssetCatalog(input: BuildTemplateAssetCatalogInput): Promise<TemplateAssetCatalog> {
  const workspaceRoot = resolve(input.workspaceRoot);
  const assetPacksDir = resolve(input.assetPacksDir ?? join(workspaceRoot, 'assets', 'asset-packs'));
  const runtimeMetadataDir = resolve(input.runtimeMetadataDir ?? join(workspaceRoot, 'tests', 'fixtures', 'art-library-small-v0.1', 'metadata'));
  const entries = [
    ...(await buildLocalPackEntries(workspaceRoot, assetPacksDir)),
    ...(await buildRuntimeFixtureEntries(workspaceRoot, runtimeMetadataDir))
  ].sort(compareCatalogEntries);

  return TemplateAssetCatalogSchema.parse({ catalogVersion: 'template_asset_catalog.v1', entries });
}

async function buildLocalPackEntries(workspaceRoot: string, assetPacksDir: string): Promise<TemplateAssetCatalogEntry[]> {
  const packs = await readLocalPacks(assetPacksDir);
  return packs.flatMap((pack) =>
    pack.assets.map((asset) => {
      const relativePath = toWorkspaceRelativePath(workspaceRoot, resolve(assetPacksDir, pack.id, asset.file));
      return TemplateAssetCatalogEntrySchema.parse({
        id: localPackCatalogAssetId(pack.id, asset.id),
        kind: kindForPurpose(asset.role),
        source: 'local-template',
        relativePath,
        tags: sortedUnique([asset.role, ...pack.style.tags, ...(asset.semantic?.subjectTags ?? []), ...(asset.semantic?.themeTags ?? [])]),
        supportedGenres: [...pack.style.genres].sort((left, right) => left.localeCompare(right)),
        purpose: purposeForRole(asset.role),
        required: true
      });
    })
  );
}

async function buildRuntimeFixtureEntries(workspaceRoot: string, runtimeMetadataDir: string): Promise<TemplateAssetCatalogEntry[]> {
  const result = await exportRuntimeArtAssetMetadataFromDirectory(runtimeMetadataDir);
  if (!result.ok) {
    return [];
  }

  const entries: TemplateAssetCatalogEntry[] = [];
  for (const asset of (result.artifact?.assets ?? []).filter((candidate) => candidate.status === 'approved')) {
    const relativePath = toWorkspaceRelativePath(workspaceRoot, resolve(workspaceRoot, asset.technical.thumbnail_path));
    await assertRegularCatalogFile(resolve(workspaceRoot, relativePath), runtimeCatalogAssetId(asset.asset_id));
    entries.push(
      TemplateAssetCatalogEntrySchema.parse({
        id: runtimeCatalogAssetId(asset.asset_id),
        kind: kindForRuntimeAsset(asset),
        source: 'local-template',
        relativePath,
        tags: sortedUnique([...asset.semantic.tags, ...asset.gameplay.role]),
        supportedGenres: sortedUnique(asset.gameplay.allowed_contexts),
        purpose: asset.gameplay.role[0] ?? 'other',
        required: true
      })
    );
  }
  return entries;
}

async function readLocalPacks(assetPacksDir: string): Promise<LocalAssetPack[]> {
  let entries: string[];
  try {
    entries = await readdir(assetPacksDir);
  } catch {
    return [];
  }

  const packs: LocalAssetPack[] = [];
  for (const entry of entries.sort((left, right) => left.localeCompare(right))) {
    const packDir = resolve(assetPacksDir, entry);
    const packStat = await stat(packDir);
    if (!packStat.isDirectory()) {
      continue;
    }

    const pack = LocalAssetPackSchema.parse(JSON.parse(await readFile(resolve(packDir, 'pack.json'), 'utf8')));
    if (pack.id !== entry) {
      throw new Error(`Local asset pack id ${pack.id} must match directory ${entry}.`);
    }
    for (const asset of pack.assets) {
      await assertRegularCatalogFile(resolve(assetPacksDir, pack.id, asset.file), localPackCatalogAssetId(pack.id, asset.id));
    }
    packs.push(pack);
  }

  return packs.sort((left, right) => left.id.localeCompare(right.id));
}

async function assertRegularCatalogFile(path: string, id: string): Promise<void> {
  const fileStat = await stat(path);
  if (!fileStat.isFile()) {
    throw new Error(`Template asset catalog entry ${id} does not reference a regular file.`);
  }
}

function toWorkspaceRelativePath(workspaceRoot: string, absolutePath: string): string {
  if (!absolutePath.startsWith(`${workspaceRoot}/`)) {
    throw new Error('Template asset catalog paths must stay inside the workspace.');
  }

  const relativePath = absolutePath.slice(workspaceRoot.length + 1);
  if (!isSafeRelativeCatalogPath(relativePath)) {
    throw new Error(`Template asset catalog path is unsafe: ${relativePath}`);
  }
  return relativePath;
}

export function localPackCatalogAssetId(packId: string, assetId: string): string {
  return `local-pack:${packId}:${assetId}`;
}

export function runtimeCatalogAssetId(runtimeAssetId: string): string {
  return `runtime-small-library:${runtimeAssetId}`;
}

export function isSafeRelativeCatalogPath(path: string): boolean {
  return !isAbsolute(path) && !path.includes('\\') && !/^[a-z][a-z0-9+.-]*:/i.test(path) && path.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

function kindForPurpose(role: string): TemplateAssetCatalogEntry['kind'] {
  if (role === 'background') {
    return 'background';
  }
  if (role === 'ui_panel') {
    return 'ui';
  }
  return 'sprite';
}

function kindForRuntimeAsset(asset: RuntimeArtAssetMetadata): TemplateAssetCatalogEntry['kind'] {
  return asset.asset_type === 'ui' ? 'ui' : 'sprite';
}

function purposeForRole(role: string): string {
  if (role === 'player_character') {
    return 'player';
  }
  if (role === 'ui_panel') {
    return 'ui';
  }
  return role;
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function compareCatalogEntries(left: TemplateAssetCatalogEntry, right: TemplateAssetCatalogEntry): number {
  return left.id.localeCompare(right.id);
}
