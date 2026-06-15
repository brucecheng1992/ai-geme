import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { AssetManifestSchema, AssetPlanSchema, type AssetManifest, type AssetManifestAsset, type AssetPlan } from '../../../../packages/asset-pipeline/src/index.js';
import { AssetLibraryUsageReportSchema, type AssetLibraryUsageReport } from './asset-library-usage-report.js';
import { AssetBindingTraceReportSchema, AssetBindingTraceRowSchema, type AssetBindingTraceReport } from './asset-binding-trace-report.schema.js';

export { AssetBindingTraceReportSchema, AssetBindingTraceRowSchema, type AssetBindingTraceReport } from './asset-binding-trace-report.schema.js';

type WriteAssetBindingTraceReportInput = {
  projectId: string;
  runId: string;
  genre: 'collector' | 'dodger' | 'shooter';
  outputDir: string;
};

/** Writes deterministic binding evidence from asset plan rows through public/preview manifests and catalog usage. */
export async function writeAssetBindingTraceReport(input: WriteAssetBindingTraceReportInput): Promise<AssetBindingTraceReport> {
  const previewManifestPath = `${input.genre}/src/asset-manifest.generated.json` as const;
  const assetPlan = AssetPlanSchema.parse(JSON.parse(await readFile(join(input.outputDir, 'asset_plan.json'), 'utf8')));
  const publicManifest = AssetManifestSchema.parse(JSON.parse(await readFile(join(input.outputDir, 'public', 'asset_manifest.json'), 'utf8')));
  const previewManifest = AssetManifestSchema.parse(JSON.parse(await readFile(join(input.outputDir, previewManifestPath), 'utf8')));
  const usageReport = AssetLibraryUsageReportSchema.parse(JSON.parse(await readFile(join(input.outputDir, 'asset_library_usage_report.json'), 'utf8')));

  assertTraceInputIdentity(input, assetPlan, publicManifest, previewManifest, usageReport);

  const planById = new Map(assetPlan.items.map((item, index) => [item.id, { item, index }]));
  const publicById = new Map(publicManifest.assets.map((asset) => [asset.id, asset]));
  const previewById = new Map(previewManifest.assets.map((asset) => [asset.id, asset]));
  const usageByManifestId = new Map(usageReport.usedAssets.map((asset) => [asset.manifestAssetId, asset]));
  const traceKeys = sortedUnique([...assetPlan.items.map((item) => item.id), ...publicManifest.assets.map((asset) => asset.id), ...previewManifest.assets.map((asset) => asset.id), ...usageReport.usedAssets.map((asset) => asset.manifestAssetId)]);

  const traces = traceKeys.map((assetId) =>
    buildTraceRow({
      assetId,
      planEntry: planById.get(assetId),
      manifestAsset: publicById.get(assetId),
      previewAsset: previewById.get(assetId),
      usageAsset: usageByManifestId.get(assetId)
    })
  );
  const warnings = sortedUnique(traces.filter((trace) => trace.status === 'warning' || trace.status === 'skipped').map((trace) => trace.reason));
  const errors = sortedUnique([...buildSourceArtifactErrors(usageReport, previewManifestPath), ...traces.filter((trace) => trace.status === 'missing' || trace.status === 'mismatch').map((trace) => trace.reason)]);
  const report = AssetBindingTraceReportSchema.parse({
    reportVersion: 'asset-binding-trace-report.v1',
    projectId: input.projectId,
    runId: input.runId,
    status: errors.length > 0 ? 'fail' : warnings.length > 0 ? 'warn' : 'pass',
    sourceArtifacts: {
      gameDslPath: 'game_dsl.json',
      assetPlanPath: 'asset_plan.json',
      publicAssetManifestPath: 'public/asset_manifest.json',
      previewManifestPath,
      assetLibraryUsageReportPath: 'asset_library_usage_report.json'
    },
    traces,
    orphanManifestAssets: sortedUnique(
      traces
        .filter((trace) => trace.assetPlanId === null && trace.manifestAssetId !== null)
        .map((trace) => `${trace.manifestAssetId ?? 'unknown'}: ${trace.reason}`)
    ),
    missingManifestAssets: sortedUnique(
      traces
        .filter((trace) => trace.assetPlanId !== null && trace.manifestAssetId === null)
        .map((trace) => `${trace.assetPlanId ?? 'unknown'}: ${trace.reason}`)
    ),
    warnings,
    errors,
    checkedPaths: ['asset_plan.json', 'public/asset_manifest.json', previewManifestPath, 'asset_library_usage_report.json']
  });

  await writeFile(join(input.outputDir, 'asset_binding_trace_report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}

function assertTraceInputIdentity(
  input: WriteAssetBindingTraceReportInput,
  assetPlan: AssetPlan,
  publicManifest: AssetManifest,
  previewManifest: AssetManifest,
  usageReport: AssetLibraryUsageReport
): void {
  if (assetPlan.projectId !== input.projectId || publicManifest.projectId !== input.projectId || previewManifest.projectId !== input.projectId || usageReport.projectId !== input.projectId || usageReport.runId !== input.runId) {
    throw new Error('asset binding trace report inputs do not match the current project and run.');
  }
}

function buildTraceRow(input: {
  assetId: string;
  planEntry: { item: AssetPlan['items'][number]; index: number } | undefined;
  manifestAsset: AssetManifestAsset | undefined;
  previewAsset: AssetManifestAsset | undefined;
  usageAsset: AssetLibraryUsageReport['usedAssets'][number] | undefined;
}): AssetBindingTraceReport['traces'][number] {
  const category = classifyTrace(input.planEntry, input.manifestAsset);
  const status = deriveTraceStatus(input, category);
  const catalogRef = input.manifestAsset?.catalogRef;
  return AssetBindingTraceRowSchema.parse({
    traceId: `trace:${input.assetId}`,
    category,
    status,
    dslStableId: category === 'dsl-bound' ? input.planEntry?.item.id ?? null : null,
    dslObjectPath: category === 'dsl-bound' ? input.usageAsset?.boundObjectPath ?? planPath(input.planEntry) : null,
    assetPlanId: input.planEntry?.item.id ?? null,
    assetPlanPath: planPath(input.planEntry),
    manifestAssetId: input.manifestAsset?.id ?? null,
    previewAssetId: input.previewAsset?.id ?? null,
    catalogAssetId: catalogRef?.catalogAssetId ?? input.usageAsset?.catalogAssetId ?? null,
    catalogVersion: catalogRef?.catalogVersion ?? null,
    source: traceSource(input.manifestAsset, category),
    reason: buildTraceReason(input, status, category)
  });
}

function classifyTrace(
  planEntry: { item: AssetPlan['items'][number]; index: number } | undefined,
  manifestAsset: AssetManifestAsset | undefined
): AssetBindingTraceReport['traces'][number]['category'] {
  if (manifestAsset?.source === 'template_svg' || manifestAsset?.source === 'placeholder') {
    return manifestAsset.source === 'template_svg' ? 'fallback' : 'unresolved';
  }
  if (planEntry === undefined && manifestAsset?.source === 'runtime_asset') {
    return 'runtime-system';
  }
  if (planEntry === undefined) {
    return 'unresolved';
  }
  return 'dsl-bound';
}

function deriveTraceStatus(
  input: {
    assetId: string;
    planEntry: { item: AssetPlan['items'][number]; index: number } | undefined;
    manifestAsset: AssetManifestAsset | undefined;
    previewAsset: AssetManifestAsset | undefined;
    usageAsset: AssetLibraryUsageReport['usedAssets'][number] | undefined;
  },
  category: AssetBindingTraceReport['traces'][number]['category']
): AssetBindingTraceReport['traces'][number]['status'] {
  if (input.planEntry?.item.required === true && input.manifestAsset === undefined) {
    return 'missing';
  }
  if (usageMismatchReason(input) !== undefined) {
    return 'mismatch';
  }
  if (input.planEntry !== undefined && input.manifestAsset === undefined) {
    return 'warning';
  }
  if (input.manifestAsset !== undefined && input.previewAsset === undefined) {
    return 'mismatch';
  }
  if (input.manifestAsset === undefined && input.previewAsset !== undefined) {
    return 'mismatch';
  }
  if (input.manifestAsset !== undefined && input.previewAsset !== undefined && JSON.stringify(input.manifestAsset.catalogRef ?? null) !== JSON.stringify(input.previewAsset.catalogRef ?? null)) {
    return 'mismatch';
  }
  if (category === 'dsl-bound' && input.usageAsset?.status === 'unmatched') {
    return 'mismatch';
  }
  if (input.manifestAsset?.source === 'local_asset_pack' && input.manifestAsset.catalogRef === undefined) {
    return 'mismatch';
  }
  if (input.manifestAsset?.source === 'runtime_asset' && input.manifestAsset.catalogRef === undefined && category !== 'runtime-system') {
    return 'mismatch';
  }
  if (category === 'unresolved' && input.manifestAsset !== undefined) {
    return 'mismatch';
  }
  if (input.usageAsset?.status === 'fallback') {
    return 'warning';
  }
  if (category === 'runtime-system') {
    return 'warning';
  }
  return 'matched';
}

function buildTraceReason(
  input: {
    assetId: string;
    planEntry: { item: AssetPlan['items'][number]; index: number } | undefined;
    manifestAsset: AssetManifestAsset | undefined;
    previewAsset: AssetManifestAsset | undefined;
    usageAsset: AssetLibraryUsageReport['usedAssets'][number] | undefined;
  },
  status: AssetBindingTraceReport['traces'][number]['status'],
  category: AssetBindingTraceReport['traces'][number]['category']
): string {
  if (input.planEntry?.item.required === true && input.manifestAsset === undefined) {
    return `${input.assetId} is required by asset_plan.json but missing from public asset manifest.`;
  }
  const usageMismatch = usageMismatchReason(input);
  if (usageMismatch !== undefined) {
    return usageMismatch;
  }
  if (input.planEntry !== undefined && input.manifestAsset === undefined) {
    return `${input.assetId} is optional in asset_plan.json and has no public asset manifest binding.`;
  }
  if (input.manifestAsset !== undefined && input.previewAsset === undefined) {
    return `${input.assetId} is present in public asset manifest but missing from preview manifest.`;
  }
  if (input.manifestAsset === undefined && input.previewAsset !== undefined) {
    return `${input.assetId} is present in preview manifest but missing from public asset manifest.`;
  }
  if (input.manifestAsset !== undefined && input.previewAsset !== undefined && JSON.stringify(input.manifestAsset.catalogRef ?? null) !== JSON.stringify(input.previewAsset.catalogRef ?? null)) {
    return `${input.assetId} catalogRef does not match between public and preview manifests.`;
  }
  if (input.usageAsset?.status === 'unmatched') {
    return input.usageAsset.reason;
  }
  if (input.manifestAsset?.source === 'local_asset_pack' && input.manifestAsset.catalogRef === undefined) {
    return `${input.assetId} local-template asset is missing catalogRef.`;
  }
  if (input.manifestAsset?.source === 'runtime_asset' && input.manifestAsset.catalogRef === undefined && category !== 'runtime-system') {
    return `${input.assetId} runtime asset is missing catalogRef for a DSL-bound asset.`;
  }
  if (category === 'unresolved' && input.manifestAsset !== undefined) {
    return `${input.assetId} is in public asset manifest without an AssetPlan binding.`;
  }
  if (input.usageAsset?.status === 'fallback') {
    return input.usageAsset.reason;
  }
  if (category === 'runtime-system') {
    return `${input.assetId} is classified as runtime/system asset outside AssetPlan binding.`;
  }
  return status === 'matched' ? `${input.assetId} binding trace matches AssetPlan, manifests, and catalog usage.` : `${input.assetId} binding trace was skipped.`;
}

function buildSourceArtifactErrors(usageReport: AssetLibraryUsageReport, previewManifestPath: string): string[] {
  const refs = usageReport.manifestRefs;
  return [
    ...(refs.assetPlanPath === 'asset_plan.json' && refs.publicAssetManifestPath === 'public/asset_manifest.json' && refs.previewManifestPath === previewManifestPath
      ? []
      : ['asset_library_usage_report.json manifestRefs do not match current trace source artifacts.']),
    ...duplicateIds(usageReport.usedAssets.map((asset) => asset.manifestAssetId)).map((assetId) => `${assetId} appears more than once in asset_library_usage_report.json.`)
  ];
}

function usageMismatchReason(input: {
  assetId: string;
  planEntry: { item: AssetPlan['items'][number]; index: number } | undefined;
  manifestAsset: AssetManifestAsset | undefined;
  usageAsset: AssetLibraryUsageReport['usedAssets'][number] | undefined;
}): string | undefined {
  const asset = input.manifestAsset;
  const usage = input.usageAsset;
  if (asset === undefined && usage !== undefined) {
    return `${input.assetId} is present in asset_library_usage_report.json but missing from public asset manifest.`;
  }
  if (asset !== undefined && usage === undefined) {
    return `${input.assetId} is present in public asset manifest but missing from asset_library_usage_report.json.`;
  }
  if (asset === undefined || usage === undefined) {
    return undefined;
  }

  if (usage.source !== asset.source) {
    return `${input.assetId} source does not match asset_library_usage_report.json.`;
  }

  const expectedCatalogAssetId = asset.catalogRef?.catalogAssetId ?? null;
  if (usage.catalogAssetId !== expectedCatalogAssetId) {
    return `${input.assetId} catalogAssetId does not match asset_library_usage_report.json.`;
  }

  const expectedBoundStableId = input.planEntry?.item.id;
  if (usage.boundDslStableId !== expectedBoundStableId) {
    return `${input.assetId} boundDslStableId does not match asset_library_usage_report.json.`;
  }

  const expectedBoundObjectPath = input.planEntry === undefined ? `public/asset_manifest.json#assets.${asset.id}` : planPath(input.planEntry);
  if (usage.boundObjectPath !== expectedBoundObjectPath) {
    return `${input.assetId} boundObjectPath does not match asset_library_usage_report.json.`;
  }

  return undefined;
}

function traceSource(asset: AssetManifestAsset | undefined, category: AssetBindingTraceReport['traces'][number]['category']): AssetBindingTraceReport['traces'][number]['source'] {
  if (category === 'runtime-system') {
    return 'runtime-system';
  }
  if (asset?.source === 'local_asset_pack' || asset?.source === 'runtime_asset') {
    return asset.catalogRef === undefined ? 'unresolved' : 'local-template';
  }
  if (asset?.source === 'template_svg' || asset?.source === 'placeholder') {
    return 'template-fallback';
  }
  return 'unresolved';
}

function planPath(planEntry: { item: AssetPlan['items'][number]; index: number } | undefined): string | null {
  return planEntry === undefined ? null : `asset_plan.json#items.${planEntry.index}`;
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function duplicateIds(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates].sort((left, right) => left.localeCompare(right));
}
