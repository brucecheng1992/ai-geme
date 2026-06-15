import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { z } from 'zod';

import { AssetManifestSchema, AssetPlanSchema, type AssetManifestAsset, type AssetPlan } from '../../../../packages/asset-pipeline/src/index.js';
import {
  buildTemplateAssetCatalog,
  localPackCatalogAssetId,
  runtimeCatalogAssetId,
  TemplateAssetCatalogSchema,
  type TemplateAssetCatalog
} from './template-asset-catalog.js';

const UsageStatusSchema = z.enum(['matched', 'fallback', 'unmatched']);
const ReportStatusSchema = z.enum(['pass', 'warn', 'fail']);
const SafeGeneratedAssetPathSchema = z.string().min(1).refine(isSafeGeneratedAssetPath, 'resolvedPath must be relative and safe');
const SafeReportTextSchema = z.string().min(1).max(240).refine(isSafeReportText, 'report text must not expose sensitive content');

export const AssetLibraryUsedAssetSchema = z.strictObject({
  manifestAssetId: z.string().min(1),
  kind: z.enum(['sprite', 'background', 'audio', 'ui', 'other']),
  resolvedPath: SafeGeneratedAssetPathSchema,
  catalogAssetId: z.string().min(1).nullable(),
  source: z.enum(['local_asset_pack', 'runtime_asset', 'template_svg', 'placeholder']),
  status: UsageStatusSchema,
  boundDslStableId: z.string().min(1).optional(),
  boundObjectPath: z.string().min(1).optional(),
  reason: SafeReportTextSchema
});

export const AssetLibraryUsageReportSchema = z
  .strictObject({
    reportVersion: z.literal('asset-library-usage-report.v1'),
    projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
    runId: z.string().regex(/^run_[A-Za-z0-9_-]+$/),
    catalogVersion: z.literal('template_asset_catalog.v1'),
    manifestRefs: z.strictObject({
      assetPlanPath: z.literal('asset_plan.json'),
      publicAssetManifestPath: z.literal('public/asset_manifest.json'),
      previewManifestPath: z.string().regex(/^(collector|dodger|shooter)\/src\/asset-manifest\.generated\.json$/)
    }),
    usedAssets: z.array(AssetLibraryUsedAssetSchema),
    missingCatalogEntries: z.array(z.string().min(1)),
    unresolvedAssets: z.array(z.string().min(1)),
    warnings: z.array(SafeReportTextSchema),
    errors: z.array(SafeReportTextSchema),
    status: ReportStatusSchema
  })
  .superRefine((report, ctx) => {
    const expected = report.errors.length > 0 ? 'fail' : report.warnings.length > 0 ? 'warn' : 'pass';
    if (report.status !== expected) {
      ctx.addIssue({ code: 'custom', path: ['status'], message: `status must be derived from errors/warnings: ${expected}` });
    }
  });

export type AssetLibraryUsageReport = z.infer<typeof AssetLibraryUsageReportSchema>;

type WriteAssetLibraryUsageReportInput = {
  projectId: string;
  runId: string;
  genre: 'collector' | 'dodger' | 'shooter';
  outputDir: string;
  workspaceRoot: string;
  catalog?: TemplateAssetCatalog;
  assetPacksDir?: string;
};

/** Writes a deterministic report that verifies generated manifest asset usage against the local/template catalog. */
export async function writeAssetLibraryUsageReport(input: WriteAssetLibraryUsageReportInput): Promise<AssetLibraryUsageReport> {
  const catalog = TemplateAssetCatalogSchema.parse(input.catalog ?? (await buildTemplateAssetCatalog({ workspaceRoot: input.workspaceRoot, assetPacksDir: input.assetPacksDir })));
  const previewManifestPath = `${input.genre}/src/asset-manifest.generated.json` as const;
  const assetPlan = AssetPlanSchema.parse(JSON.parse(await readFile(join(input.outputDir, 'asset_plan.json'), 'utf8')));
  const publicManifest = AssetManifestSchema.parse(JSON.parse(await readFile(join(input.outputDir, 'public', 'asset_manifest.json'), 'utf8')));
  const previewManifest = AssetManifestSchema.parse(JSON.parse(await readFile(join(input.outputDir, previewManifestPath), 'utf8')));

  if (assetPlan.projectId !== input.projectId || publicManifest.projectId !== input.projectId || previewManifest.projectId !== input.projectId) {
    throw new Error('asset library usage report inputs do not match the current project.');
  }
  if (JSON.stringify(publicManifest) !== JSON.stringify(previewManifest)) {
    throw new Error('asset library usage report requires matching public and preview manifests.');
  }

  const catalogEntries = new Map(catalog.entries.map((entry) => [entry.id, entry]));
  const planItems = new Map(assetPlan.items.map((item, index) => [item.id, { item, index }]));
  const usedAssets = publicManifest.assets.map((asset) => buildUsedAsset(asset, planItems.get(asset.id), catalogEntries, catalog.catalogVersion));
  const missingCatalogEntries = sortedUnique(
    usedAssets
      .filter((asset) => asset.status === 'unmatched' && asset.catalogAssetId !== null && asset.reason.includes('references missing template asset catalog entry'))
      .map((asset) => asset.catalogAssetId as string)
  );
  const unresolvedAssets = sortedUnique(usedAssets.filter((asset) => asset.status === 'unmatched').map((asset) => asset.manifestAssetId));
  const warnings = sortedUnique(usedAssets.filter((asset) => asset.status === 'fallback').map((asset) => asset.reason));
  const semanticWarnings = sortedUnique(publicManifest.assets.map(buildSemanticFitWarning).filter((warning): warning is string => warning !== undefined));
  const allWarnings = sortedUnique([...warnings, ...semanticWarnings]);
  const errors = sortedUnique(usedAssets.filter((asset) => asset.status === 'unmatched').map((asset) => asset.reason));
  const report = AssetLibraryUsageReportSchema.parse({
    reportVersion: 'asset-library-usage-report.v1',
    projectId: input.projectId,
    runId: input.runId,
    catalogVersion: catalog.catalogVersion,
    manifestRefs: {
      assetPlanPath: 'asset_plan.json',
      publicAssetManifestPath: 'public/asset_manifest.json',
      previewManifestPath
    },
    usedAssets: usedAssets.sort((left, right) => left.manifestAssetId.localeCompare(right.manifestAssetId)),
    missingCatalogEntries,
    unresolvedAssets,
    warnings: allWarnings,
    errors,
    status: errors.length > 0 ? 'fail' : allWarnings.length > 0 ? 'warn' : 'pass'
  });

  await writeFile(join(input.outputDir, 'asset_library_usage_report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}

function buildSemanticFitWarning(asset: AssetManifestAsset): string | undefined {
  if (asset.semanticFit?.status !== 'mismatch') {
    return undefined;
  }

  const expected = asset.semanticFit.expectedConcept ?? 'requested semantics';
  return `${asset.id} semanticFit mismatch for expected ${expected}.`;
}

function buildUsedAsset(
  asset: AssetManifestAsset,
  planItem: { item: AssetPlan['items'][number]; index: number } | undefined,
  catalogEntries: Map<string, TemplateAssetCatalog['entries'][number]>,
  catalogVersion: TemplateAssetCatalog['catalogVersion']
): AssetLibraryUsageReport['usedAssets'][number] {
  const bound = planItem === undefined ? { boundObjectPath: `public/asset_manifest.json#assets.${asset.id}` } : { boundDslStableId: planItem.item.id, boundObjectPath: `asset_plan.json#items.${planItem.index}` };
  const expectedId = expectedCatalogAssetId(asset);
  if (expectedId === null) {
    return AssetLibraryUsedAssetSchema.parse({
      manifestAssetId: asset.id,
      kind: kindForAsset(asset),
      resolvedPath: asset.path,
      catalogAssetId: null,
      source: asset.source,
      status: 'fallback',
      ...bound,
      reason: `${asset.id} uses explicit deterministic fallback source ${asset.source}.`
    });
  }

  const catalogAssetId = asset.catalogRef?.catalogAssetId ?? expectedId;
  const validationError = validateCatalogBackedAsset(asset, expectedId, catalogEntries, catalogVersion);
  if (validationError === undefined) {
    return AssetLibraryUsedAssetSchema.parse({
      manifestAssetId: asset.id,
      kind: kindForAsset(asset),
      resolvedPath: asset.path,
      catalogAssetId,
      source: asset.source,
      status: 'matched',
      ...bound,
      reason: `${asset.id} is backed by manifest catalogRef ${catalogAssetId}.`
    });
  }

  return AssetLibraryUsedAssetSchema.parse({
    manifestAssetId: asset.id,
    kind: kindForAsset(asset),
    resolvedPath: asset.path,
    catalogAssetId,
    source: asset.source,
    status: 'unmatched',
    ...bound,
    reason: validationError
  });
}

function validateCatalogBackedAsset(
  asset: AssetManifestAsset,
  expectedId: string,
  catalogEntries: Map<string, TemplateAssetCatalog['entries'][number]>,
  catalogVersion: TemplateAssetCatalog['catalogVersion']
): string | undefined {
  const catalogRef = asset.catalogRef;
  if (catalogRef === undefined) {
    return `${asset.id} is missing manifest catalogRef ${expectedId}.`;
  }
  if (catalogRef.catalogVersion !== catalogVersion) {
    return `${asset.id} catalogRef version ${catalogRef.catalogVersion} does not match ${catalogVersion}.`;
  }
  if (catalogRef.source !== 'local-template') {
    return `${asset.id} catalogRef source ${catalogRef.source} is not local-template.`;
  }
  if (catalogRef.catalogAssetId !== expectedId) {
    return `${asset.id} catalogRef ${catalogRef.catalogAssetId} does not match manifest source ${expectedId}.`;
  }

  const entry = catalogEntries.get(catalogRef.catalogAssetId);
  if (entry === undefined) {
    return `${asset.id} references missing template asset catalog entry ${catalogRef.catalogAssetId}.`;
  }
  if (entry.source !== catalogRef.source) {
    return `${asset.id} catalog entry source ${entry.source} does not match manifest catalogRef.`;
  }

  const expectedSourcePath = expectedCatalogRelativePath(asset);
  if (expectedSourcePath === undefined) {
    return `${asset.id} is missing manifest source path for catalog identity validation.`;
  }
  if (entry.relativePath !== expectedSourcePath) {
    return `${asset.id} catalog entry path does not match manifest source identity.`;
  }
  return undefined;
}

function expectedCatalogRelativePath(asset: AssetManifestAsset): string | undefined {
  if (asset.source === 'local_asset_pack' && asset.sourcePack !== undefined) {
    return `assets/asset-packs/${asset.sourcePack}/${asset.id}.${asset.format}`;
  }
  if (asset.source === 'runtime_asset') {
    return asset.conversion?.sourcePath;
  }
  return undefined;
}

function expectedCatalogAssetId(asset: AssetManifestAsset): string | null {
  if (asset.source === 'local_asset_pack') {
    return asset.sourcePack === undefined ? `local-pack:missing-pack:${asset.id}` : localPackCatalogAssetId(asset.sourcePack, asset.id);
  }
  if (asset.source === 'runtime_asset') {
    return asset.runtimeAssetId === undefined ? `runtime-small-library:missing-runtime-asset:${asset.id}` : runtimeCatalogAssetId(asset.runtimeAssetId);
  }
  return null;
}

function kindForAsset(asset: AssetManifestAsset): AssetLibraryUsageReport['usedAssets'][number]['kind'] {
  if (asset.role === 'background') {
    return 'background';
  }
  if (asset.role === 'ui_panel') {
    return 'ui';
  }
  return 'sprite';
}

function isSafeGeneratedAssetPath(path: string): boolean {
  return /^assets\/[a-z][a-z0-9_]{1,39}\.(svg|png)$/.test(path) && !path.includes('\\') && !path.split('/').includes('..') && !/^[a-z][a-z0-9+.-]*:/i.test(path);
}

function isSafeReportText(text: string): boolean {
  return !/\/Users\/|[A-Z_]*(?:API_KEY|SECRET|TOKEN)|raw provider|https?:\/\//i.test(text);
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
