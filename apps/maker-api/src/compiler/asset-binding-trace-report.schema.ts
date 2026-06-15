import { z } from 'zod';

const TraceStatusSchema = z.enum(['matched', 'warning', 'missing', 'mismatch', 'skipped']);
const ReportStatusSchema = z.enum(['pass', 'warn', 'fail']);
const SafeTraceTextSchema = z.string().min(1).max(240).refine(isSafeReportText, 'trace text must not expose sensitive content');
const SafeTracePathSchema = z.string().min(1).refine(isSafeTracePath, 'trace path must be a safe artifact-relative path or fragment');

export const AssetBindingTraceRowSchema = z.strictObject({
  traceId: z.string().regex(/^trace:[a-z0-9_.:-]+$/),
  category: z.enum(['dsl-bound', 'runtime-system', 'fallback', 'unresolved']),
  status: TraceStatusSchema,
  dslStableId: z.string().min(1).nullable(),
  dslObjectPath: SafeTracePathSchema.nullable(),
  assetPlanId: z.string().min(1).nullable(),
  assetPlanPath: SafeTracePathSchema.nullable(),
  manifestAssetId: z.string().min(1).nullable(),
  previewAssetId: z.string().min(1).nullable(),
  catalogAssetId: z.string().min(1).nullable(),
  catalogVersion: z.literal('template_asset_catalog.v1').nullable(),
  source: z.enum(['local-template', 'runtime-system', 'template-fallback', 'unresolved']),
  reason: SafeTraceTextSchema
});

export const AssetBindingTraceReportSchema = z
  .strictObject({
    reportVersion: z.literal('asset-binding-trace-report.v1'),
    projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
    runId: z.string().regex(/^run_[A-Za-z0-9_-]+$/),
    status: ReportStatusSchema,
    sourceArtifacts: z.strictObject({
      gameDslPath: z.literal('game_dsl.json'),
      assetPlanPath: z.literal('asset_plan.json'),
      publicAssetManifestPath: z.literal('public/asset_manifest.json'),
      previewManifestPath: z.string().regex(/^(collector|dodger|shooter)\/src\/asset-manifest\.generated\.json$/),
      assetLibraryUsageReportPath: z.literal('asset_library_usage_report.json')
    }),
    traces: z.array(AssetBindingTraceRowSchema),
    orphanManifestAssets: z.array(SafeTraceTextSchema),
    missingManifestAssets: z.array(SafeTraceTextSchema),
    warnings: z.array(SafeTraceTextSchema),
    errors: z.array(SafeTraceTextSchema),
    checkedPaths: z.array(SafeTracePathSchema)
  })
  .superRefine((report, ctx) => {
    const expected = report.errors.length > 0 ? 'fail' : report.warnings.length > 0 ? 'warn' : 'pass';
    if (report.status !== expected) {
      ctx.addIssue({ code: 'custom', path: ['status'], message: `status must be derived from errors/warnings: ${expected}` });
    }
  });

export type AssetBindingTraceReport = z.infer<typeof AssetBindingTraceReportSchema>;

function isSafeTracePath(path: string): boolean {
  const parts = path.split('#');
  if (parts.length > 2) {
    return false;
  }
  const [artifactPath, fragment] = parts;
  if (
    artifactPath === undefined ||
    artifactPath.length === 0 ||
    artifactPath.startsWith('/') ||
    /^[A-Za-z]:[\\/]/.test(artifactPath) ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/.test(artifactPath) ||
    artifactPath.includes('\\') ||
    artifactPath.split('/').includes('..')
  ) {
    return false;
  }
  return fragment === undefined || /^[A-Za-z0-9_.-]+$/.test(fragment);
}

function isSafeReportText(text: string): boolean {
  return !/(?:\/Users\/|\/home\/|\/tmp\/|[A-Za-z]:[\\/]|[A-Z_]*(?:API_KEY|SECRET|TOKEN)|raw provider|process\.env|Bearer|https?:\/\/)/i.test(text);
}
