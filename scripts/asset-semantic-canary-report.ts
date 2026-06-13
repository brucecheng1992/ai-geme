import { z } from 'zod';

const OverallStatusSchema = z.enum(['PLAYABLE', 'PLAYABLE_WITH_FALLBACK_ASSETS', 'PLAYABLE_WITH_ART_WARNINGS', 'NEEDS_ASSET_REPAIR', 'QA_FAILED']);
const RuntimeStatusSchema = z.enum(['PASSED', 'FAILED']);
const AssetSemanticStatusSchema = z.enum(['PASSED', 'WARNING', 'FAILED']);

const ExpectedCoreSchema = z.strictObject({
  role: z.enum(['player', 'enemy', 'projectile', 'background']),
  concept: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
  strictness: z.enum(['hard', 'medium', 'soft']),
  allowFallbackGenerated: z.boolean(),
  forbiddenConcepts: z.array(z.string().regex(/^[a-z][a-z0-9_]{1,39}$/)).optional()
});

export const AssetSemanticCanaryBriefSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9_]{1,63}$/),
  brief: z.string().trim().min(1),
  category: z.enum(['supported_core_semantic', 'generic_shooter', 'mixed_core_semantic', 'medium_theme_semantic']),
  expectedUnsupported: z.boolean().optional(),
  unsupportedReason: z.string().trim().min(1).optional(),
  expect: z.strictObject({
    disallowOverall: z.array(OverallStatusSchema).min(1),
    hardMismatchAllowed: z.boolean(),
    requiredAssetMissingAllowed: z.boolean(),
    assetLoadFailureAllowed: z.boolean(),
    placeholderAllowed: z.boolean(),
    allowedOverall: z.array(OverallStatusSchema).optional(),
    expectedCore: z.array(ExpectedCoreSchema).optional(),
    preferredPack: z
      .strictObject({
        packId: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
        soft: z.boolean(),
        roles: z.array(z.enum(['player', 'enemy', 'projectile', 'background'])).optional()
      })
      .optional(),
    notes: z.string().trim().min(1).optional()
  })
});
export const AssetSemanticCanaryBriefsSchema = z.array(AssetSemanticCanaryBriefSchema).min(1);

const SemanticFitSchema = z
  .strictObject({
    status: z.enum(['exact', 'compatible', 'fallback_generated', 'not_applicable', 'unknown', 'mismatch']),
    strictness: z.enum(['hard', 'medium', 'soft']).optional()
  })
  .passthrough();
const ManifestAssetSchema = z
  .strictObject({
    id: z.string(),
    required: z.boolean().optional(),
    status: z.string().optional(),
    source: z.string().optional(),
    sourcePack: z.string().optional(),
    semanticFit: SemanticFitSchema.optional()
  })
  .passthrough();
const MinimalManifestSchema = z.strictObject({ assets: z.array(ManifestAssetSchema).default([]) }).passthrough();
const QaAssetSummarySchema = z
  .strictObject({
    id: z.string().optional(),
    source_pack: z.string().optional(),
    semantic_fit: SemanticFitSchema.optional()
  })
  .passthrough();
const QaSemanticIssueSchema = z
  .strictObject({
    severity: z.enum(['warning', 'failure']),
    semantic_fit_status: z.enum(['exact', 'compatible', 'fallback_generated', 'not_applicable', 'unknown', 'mismatch']).optional(),
    strictness: z.enum(['hard', 'medium', 'soft']).optional()
  })
  .passthrough();
const QaAssetFailureSchema = z.strictObject({ code: z.string(), asset_ids: z.array(z.string()).optional() }).passthrough();
const QaAssetSemanticRepairRequirementSchema = z
  .strictObject({
    requirementId: z.string(),
    role: z.string(),
    expectedConcept: z.string().optional(),
    previousAssetId: z.string().optional(),
    previousSource: z.string().optional(),
    previousSemanticFitStatus: z.string().optional(),
    action: z.string().optional(),
    newAssetId: z.string().optional(),
    newSource: z.string().optional(),
    newSemanticFitStatus: z.string().optional()
  })
  .passthrough();
const QaAssetSemanticRepairSchema = z
  .strictObject({
    enabled: z.boolean(),
    attempted: z.boolean(),
    skippedReason: z.string().optional(),
    attemptCount: z.number().int().min(0).optional(),
    beforeOverallStatus: z.string().optional(),
    beforeAssetSemanticStatus: z.string().optional(),
    afterOverallStatus: z.string().optional(),
    afterAssetSemanticStatus: z.string().optional(),
    repairedRequirements: z.array(QaAssetSemanticRepairRequirementSchema).optional(),
    failureReasons: z.array(z.string()).optional()
  })
  .passthrough();
const QaAssetReportSchema = z
  .strictObject({
    missing: z.array(z.string()).default([]),
    placeholder_used: z.array(z.string()).default([]),
    runtime: z.strictObject({ failed: z.array(z.string()).default([]) }).passthrough().optional(),
    assets: z.array(QaAssetSummarySchema).default([]),
    semantic_issues: z.array(QaSemanticIssueSchema).default([]),
    failures: z.array(QaAssetFailureSchema).default([])
  })
  .passthrough();
const MinimalQaReportSchema = z
  .strictObject({
    runtime_status: RuntimeStatusSchema,
    asset_semantic_status: AssetSemanticStatusSchema,
    overall_status: OverallStatusSchema,
    asset_semantic_repair: QaAssetSemanticRepairSchema.optional(),
    asset_report: QaAssetReportSchema.optional()
  })
  .passthrough();

export type AssetSemanticCanaryBrief = z.infer<typeof AssetSemanticCanaryBriefSchema>;
export type AssetSemanticCanaryExecution =
  | { brief: AssetSemanticCanaryBrief; state: 'skipped'; reason: string }
  | {
      brief: AssetSemanticCanaryBrief;
      state: 'completed';
      projectId: string;
      projectStatus: string;
      reportPath: string;
      manifestPath: string;
      qaReportPath?: string;
      assetManifest?: unknown;
      qaReport?: unknown;
      error?: { code: string; message: string };
    };

export type AssetSemanticCanarySummary = {
  version: 'asset-semantic-canary-v0.1';
  createdAt: string;
  fixturePath: string;
  fixture?: AssetSemanticCanaryFixtureSummary;
  total: number;
  runnable: number;
  passed: number;
  failed: number;
  skipped: number;
  experimental: number;
  exitCode: number;
  repairEnabled: boolean;
  repairAttempted: boolean;
  repairAttemptedCount: number;
  repairSucceededCount: number;
  repairFailedCount: number;
  repairSkippedReasons: Record<string, number>;
  counts: {
    playable: number;
    playableWithFallbackAssets: number;
    playableWithArtWarnings: number;
    needsAssetRepair: number;
    qaFailed: number;
    hardMismatch: number;
    hardUnknown: number;
    mediumWarnings: number;
    fallbackGenerated: number;
    placeholderUsed: number;
    requiredAssetMissing: number;
    assetLoadFailures: number;
  };
  repair: {
    enabled: boolean;
    attemptedCount: number;
    succeededCount: number;
    failedCount: number;
    skippedCount: number;
    skippedReasons: Record<string, number>;
  };
  cases: AssetSemanticCanaryCaseSummary[];
};

export type AssetSemanticCanaryFixtureSummary = {
  kind: 'canary_briefs' | 'small_art_library';
  identity: string;
  assetCount?: number;
};

export type AssetSemanticCanaryRepairRequirementSummary = z.infer<typeof QaAssetSemanticRepairRequirementSchema>;

export type AssetSemanticCanaryCaseRepairSummary = {
  enabled: boolean;
  attempted: boolean;
  attemptCount?: number;
  skippedReason?: string;
  beforeOverallStatus?: string;
  beforeAssetSemanticStatus?: string;
  afterOverallStatus?: string;
  afterAssetSemanticStatus?: string;
  repairedRequirements?: AssetSemanticCanaryRepairRequirementSummary[];
  failureReasons?: string[];
};

export type AssetSemanticCanaryCaseSummary = {
  id: string;
  brief: string;
  category?: string;
  skipped: boolean;
  experimental?: boolean;
  skipReason?: string;
  projectId?: string;
  runtimeStatus?: z.infer<typeof RuntimeStatusSchema>;
  assetSemanticStatus?: z.infer<typeof AssetSemanticStatusSchema>;
  overallStatus?: z.infer<typeof OverallStatusSchema>;
  fallbackGeneratedCount?: number;
  mismatchCount?: number;
  unknownCount?: number;
  warningCount?: number;
  placeholderUsedCount?: number;
  requiredAssetMissingCount?: number;
  assetLoadFailureCount?: number;
  selectedPacks?: string[];
  reportPath?: string;
  manifestPath?: string;
  qaReportPath?: string;
  repair?: AssetSemanticCanaryCaseRepairSummary;
  pass: boolean;
  failureReasons?: string[];
};

type AssetSemanticCanaryCaseRecord = {
  summary: AssetSemanticCanaryCaseSummary;
  counts: ArtifactCounts;
};

export function selectAssetSemanticCanaryBriefs(
  briefs: AssetSemanticCanaryBrief[],
  options: { includeUnsupported: boolean; caseId?: string; limit?: number }
): { runnable: AssetSemanticCanaryBrief[]; skipped: Array<{ brief: AssetSemanticCanaryBrief; reason: string }> } {
  const filtered = options.caseId === undefined ? briefs : briefs.filter((brief) => brief.id === options.caseId);
  if (options.caseId !== undefined && filtered.length === 0) {
    throw new Error(`Unknown asset semantic canary case: ${options.caseId}`);
  }

  const supported = options.includeUnsupported ? filtered : filtered.filter((brief) => brief.expectedUnsupported !== true);
  const runnable = options.limit === undefined ? supported : supported.slice(0, options.limit);
  const runnableIds = new Set(runnable.map((brief) => brief.id));
  const skipped = filtered
    .filter((brief) => !runnableIds.has(brief.id))
    .map((brief) => ({
      brief,
      reason: brief.expectedUnsupported === true ? `expectedUnsupported: ${brief.unsupportedReason ?? 'unsupported by current taxonomy baseline'}` : 'not selected'
    }));

  return { runnable, skipped };
}

export function buildAssetSemanticCanarySummary(input: {
  fixturePath: string;
  outputDir: string;
  includeUnsupported: boolean;
  repairEnabled: boolean;
  createdAt: string;
  executions: AssetSemanticCanaryExecution[];
}): AssetSemanticCanarySummary {
  const records = input.executions.map((execution) => summarizeExecution(execution, input.repairEnabled));
  const cases = records.map((record) => record.summary);
  const runnableCases = cases.filter((item) => !item.skipped);
  const supportedFailures = runnableCases.filter((item) => !item.experimental && !item.pass);
  const repair = summarizeRepair(cases, input.repairEnabled);

  return {
    version: 'asset-semantic-canary-v0.1',
    createdAt: input.createdAt,
    fixturePath: input.fixturePath,
    total: cases.length,
    runnable: runnableCases.length,
    passed: runnableCases.filter((item) => item.pass).length,
    failed: runnableCases.filter((item) => !item.pass).length,
    skipped: cases.filter((item) => item.skipped).length,
    experimental: runnableCases.filter((item) => item.experimental === true).length,
    exitCode: supportedFailures.length > 0 ? 1 : 0,
    repairEnabled: repair.enabled,
    repairAttempted: repair.attemptedCount > 0,
    repairAttemptedCount: repair.attemptedCount,
    repairSucceededCount: repair.succeededCount,
    repairFailedCount: repair.failedCount,
    repairSkippedReasons: repair.skippedReasons,
    counts: {
      playable: countOverall(cases, 'PLAYABLE'),
      playableWithFallbackAssets: countOverall(cases, 'PLAYABLE_WITH_FALLBACK_ASSETS'),
      playableWithArtWarnings: countOverall(cases, 'PLAYABLE_WITH_ART_WARNINGS'),
      needsAssetRepair: countOverall(cases, 'NEEDS_ASSET_REPAIR'),
      qaFailed: countOverall(cases, 'QA_FAILED'),
      hardMismatch: sumRecords(records, 'hardMismatch'),
      hardUnknown: sumRecords(records, 'hardUnknown'),
      mediumWarnings: sumRecords(records, 'mediumWarnings'),
      fallbackGenerated: sumCases(cases, 'fallbackGeneratedCount'),
      placeholderUsed: sumCases(cases, 'placeholderUsedCount'),
      requiredAssetMissing: sumCases(cases, 'requiredAssetMissingCount'),
      assetLoadFailures: sumCases(cases, 'assetLoadFailureCount')
    },
    repair,
    cases
  };
}

export function renderAssetSemanticCanaryMarkdown(summary: AssetSemanticCanarySummary): string {
  const caseRows = summary.cases
    .map((item) =>
      `| ${item.id} | ${item.overallStatus ?? '-'} | ${item.runtimeStatus ?? '-'} | ${item.assetSemanticStatus ?? '-'} | ${item.pass ? 'yes' : 'no'} | ${item.selectedPacks?.join(', ') || '-'} | ${repairLabel(item.repair)} | ${item.failureReasons?.join('; ') || item.skipReason || '-'} |`
    )
    .join('\n');
  const repairSkippedReasonRows =
    Object.entries(summary.repair.skippedReasons)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([reason, count]) => `- ${reason}: ${count}`)
      .join('\n') || '- None';
  const skippedRows = summary.cases.filter((item) => item.skipped).map((item) => `- ${item.id}: ${item.skipReason ?? 'skipped'}`).join('\n') || '- None';
  const failureRows =
    summary.cases
      .filter((item) => !item.skipped && !item.pass)
      .map((item) => `- ${item.id}: ${item.failureReasons?.join('; ') || 'failed'}`)
      .join('\n') || '- None';

  return `# Asset Semantic Canary Summary

CreatedAt: ${summary.createdAt}
Fixture path: ${summary.fixturePath}
${summary.fixture === undefined ? '' : `Fixture identity: ${summary.fixture.kind} / ${summary.fixture.identity}${summary.fixture.assetCount === undefined ? '' : ` / assets=${summary.fixture.assetCount}`}\n`}Total / runnable / passed / failed / skipped / experimental: ${summary.total} / ${summary.runnable} / ${summary.passed} / ${summary.failed} / ${summary.skipped} / ${summary.experimental}

## Status Counts
- PLAYABLE: ${summary.counts.playable}
- PLAYABLE_WITH_FALLBACK_ASSETS: ${summary.counts.playableWithFallbackAssets}
- PLAYABLE_WITH_ART_WARNINGS: ${summary.counts.playableWithArtWarnings}
- NEEDS_ASSET_REPAIR: ${summary.counts.needsAssetRepair}
- QA_FAILED: ${summary.counts.qaFailed}

## Semantic Counts
- hard mismatch: ${summary.counts.hardMismatch}
- hard unknown: ${summary.counts.hardUnknown}
- medium warnings: ${summary.counts.mediumWarnings}
- fallback_generated: ${summary.counts.fallbackGenerated}
- placeholder used: ${summary.counts.placeholderUsed}
- required asset missing: ${summary.counts.requiredAssetMissing}
- asset load failures: ${summary.counts.assetLoadFailures}

## Repair
- Enabled: ${summary.repair.enabled}
- Attempted: ${summary.repair.attemptedCount}
- Succeeded: ${summary.repair.succeededCount}
- Failed: ${summary.repair.failedCount}
- Skipped: ${summary.repair.skippedCount}

## Repair skipped reasons
${repairSkippedReasonRows}

## Cases
| id | overall | runtime | asset semantic | pass | selected packs | repair | failure reasons |
| --- | --- | --- | --- | --- | --- | --- | --- |
${caseRows}

## Skipped
${skippedRows}

## Failures
${failureRows}

## Notes
- fallback_generated is acceptable.
- hard mismatch is not acceptable.
- expectedUnsupported is skipped by default.
`;
}

function summarizeExecution(execution: AssetSemanticCanaryExecution, repairEnabled: boolean): AssetSemanticCanaryCaseRecord {
  if (execution.state === 'skipped') {
    return {
      summary: {
        id: execution.brief.id,
        brief: execution.brief.brief,
        category: execution.brief.category,
        skipped: true,
        skipReason: execution.reason,
        pass: true
      },
      counts: emptyArtifactCounts()
    };
  }

  const qaReport = MinimalQaReportSchema.safeParse(execution.qaReport);
  const manifest = MinimalManifestSchema.safeParse(execution.assetManifest);
  const counts = countArtifacts(qaReport.success ? qaReport.data : undefined, manifest.success ? manifest.data : undefined);
  const repair = normalizeRepairReport(qaReport.success ? qaReport.data : undefined, repairEnabled);
  const failureReasons = qaReport.success ? evaluateFailures(execution.brief, qaReport.data, counts, repair) : ['QA report is missing or invalid'];
  if (execution.error !== undefined) {
    failureReasons.push(`${execution.error.code}: ${execution.error.message}`);
  }

  return {
    summary: {
      id: execution.brief.id,
      brief: execution.brief.brief,
      category: execution.brief.category,
      skipped: false,
      experimental: execution.brief.expectedUnsupported === true,
      projectId: execution.projectId,
      runtimeStatus: qaReport.success ? qaReport.data.runtime_status : undefined,
      assetSemanticStatus: qaReport.success ? qaReport.data.asset_semantic_status : undefined,
      overallStatus: qaReport.success ? qaReport.data.overall_status : undefined,
      fallbackGeneratedCount: counts.fallbackGenerated,
      mismatchCount: counts.mismatch,
      unknownCount: counts.unknown,
      warningCount: counts.warnings,
      placeholderUsedCount: counts.placeholder,
      requiredAssetMissingCount: counts.requiredMissing,
      assetLoadFailureCount: counts.assetLoadFailures,
      selectedPacks: counts.selectedPacks,
      reportPath: execution.reportPath,
      manifestPath: execution.manifestPath,
      qaReportPath: execution.qaReportPath,
      repair,
      pass: failureReasons.length === 0,
      failureReasons: failureReasons.length > 0 ? failureReasons : undefined
    },
    counts
  };
}

function normalizeRepairReport(
  qaReport: z.infer<typeof MinimalQaReportSchema> | undefined,
  repairEnabled: boolean
): AssetSemanticCanaryCaseRepairSummary {
  const reported = qaReport?.asset_semantic_repair;
  if (reported === undefined) {
    return {
      enabled: repairEnabled,
      attempted: false,
      skippedReason: 'missing_repair_metadata'
    };
  }

  return {
    enabled: reported.enabled,
    attempted: reported.attempted,
    attemptCount: reported.attemptCount,
    skippedReason: reported.skippedReason ?? (reported.attempted ? undefined : 'not_reported'),
    beforeOverallStatus: reported.beforeOverallStatus,
    beforeAssetSemanticStatus: reported.beforeAssetSemanticStatus,
    afterOverallStatus: reported.afterOverallStatus,
    afterAssetSemanticStatus: reported.afterAssetSemanticStatus,
    repairedRequirements: reported.repairedRequirements,
    failureReasons: reported.failureReasons
  };
}

function summarizeRepair(cases: AssetSemanticCanaryCaseSummary[], repairEnabled: boolean): AssetSemanticCanarySummary['repair'] {
  const repairs = cases.map((item) => item.repair).filter((repair) => repair !== undefined);
  const attempted = repairs.filter((repair) => repair.attempted);
  const succeeded = attempted.filter(isRepairSuccess);
  const failed = attempted.filter(isRepairFailure);
  const skippedReasons: Record<string, number> = {};

  for (const repair of repairs) {
    if (repair.attempted || repair.skippedReason === undefined) {
      continue;
    }

    skippedReasons[repair.skippedReason] = (skippedReasons[repair.skippedReason] ?? 0) + 1;
  }

  return {
    enabled: repairEnabled || repairs.some((repair) => repair.enabled),
    attemptedCount: attempted.length,
    succeededCount: succeeded.length,
    failedCount: failed.length,
    skippedCount: repairs.filter((repair) => !repair.attempted).length,
    skippedReasons
  };
}

function isRepairFailure(repair: AssetSemanticCanaryCaseRepairSummary): boolean {
  const failedSkippedReasons = new Set(['repair_execution_failed', 'repair_rebuild_failed', 'repair_execution_not_repaired']);
  return (
    (repair.skippedReason !== undefined && failedSkippedReasons.has(repair.skippedReason)) ||
    repair.afterOverallStatus === 'NEEDS_ASSET_REPAIR' ||
    repair.afterOverallStatus === 'QA_FAILED' ||
    repair.afterAssetSemanticStatus === 'FAILED' ||
    (repair.failureReasons?.length ?? 0) > 0
  );
}

function isRepairSuccess(repair: AssetSemanticCanaryCaseRepairSummary): boolean {
  return (
    !isRepairFailure(repair) &&
    (repair.afterOverallStatus === 'PLAYABLE' ||
      repair.afterOverallStatus === 'PLAYABLE_WITH_FALLBACK_ASSETS' ||
      repair.afterOverallStatus === 'PLAYABLE_WITH_ART_WARNINGS') &&
    (repair.afterAssetSemanticStatus === 'PASSED' || repair.afterAssetSemanticStatus === 'WARNING')
  );
}

function repairLabel(repair: AssetSemanticCanaryCaseRepairSummary | undefined): string {
  if (repair === undefined) {
    return '-';
  }

  return [`attempted=${repair.attempted}`, repair.skippedReason === undefined ? undefined : `skipped=${repair.skippedReason}`].filter(Boolean).join(' / ');
}

function evaluateFailures(
  brief: AssetSemanticCanaryBrief,
  qaReport: z.infer<typeof MinimalQaReportSchema>,
  counts: ArtifactCounts,
  repair: AssetSemanticCanaryCaseRepairSummary
): string[] {
  const reasons: string[] = [];
  const allowedOverall = brief.expect.allowedOverall ?? [];

  if (brief.expect.disallowOverall.includes(qaReport.overall_status)) {
    reasons.push(`overall_status ${qaReport.overall_status} is disallowed`);
  }
  if (allowedOverall.length > 0 && !allowedOverall.includes(qaReport.overall_status)) {
    reasons.push(`overall_status ${qaReport.overall_status} is not allowed`);
  }
  if (qaReport.overall_status === 'NEEDS_ASSET_REPAIR') {
    reasons.push('NEEDS_ASSET_REPAIR is not allowed for supported canaries');
  }
  if (qaReport.overall_status === 'QA_FAILED') {
    reasons.push('QA_FAILED is not allowed for supported canaries');
  }
  if (!brief.expect.hardMismatchAllowed && counts.hardMismatch > 0) {
    reasons.push('hard semantic mismatch is not allowed');
  }
  if (counts.hardUnknown > 0) {
    reasons.push('hard semantic unknown is not allowed');
  }
  if (!brief.expect.requiredAssetMissingAllowed && counts.requiredMissing > 0) {
    reasons.push('required asset missing is not allowed');
  }
  if (!brief.expect.assetLoadFailureAllowed && counts.assetLoadFailures > 0) {
    reasons.push('asset load failure is not allowed');
  }
  if (!brief.expect.placeholderAllowed && counts.placeholder > 0) {
    reasons.push('placeholder asset is not allowed');
  }
  if (isRepairFailure(repair)) {
    reasons.push('semantic asset repair failure is not allowed');
  }

  return reasons;
}

type ArtifactCounts = {
  fallbackGenerated: number;
  mismatch: number;
  unknown: number;
  hardMismatch: number;
  hardUnknown: number;
  warnings: number;
  mediumWarnings: number;
  placeholder: number;
  requiredMissing: number;
  assetLoadFailures: number;
  selectedPacks: string[];
};

function emptyArtifactCounts(): ArtifactCounts {
  return {
    fallbackGenerated: 0,
    mismatch: 0,
    unknown: 0,
    hardMismatch: 0,
    hardUnknown: 0,
    warnings: 0,
    mediumWarnings: 0,
    placeholder: 0,
    requiredMissing: 0,
    assetLoadFailures: 0,
    selectedPacks: []
  };
}

function countArtifacts(
  qaReport: z.infer<typeof MinimalQaReportSchema> | undefined,
  manifest: z.infer<typeof MinimalManifestSchema> | undefined
): ArtifactCounts {
  const manifestAssets = manifest?.assets ?? [];
  const qaAssets = qaReport?.asset_report?.assets ?? [];
  const fits = manifestAssets.map((asset) => asset.semanticFit).filter((fit) => fit !== undefined);
  const qaFits = qaAssets.map((asset) => asset.semantic_fit).filter((fit) => fit !== undefined);
  const semanticFits = fits.length > 0 ? fits : qaFits;
  const semanticIssues = qaReport?.asset_report?.semantic_issues ?? [];
  const selectedPacks = [
    ...new Set([
      ...manifestAssets.map((asset) => asset.sourcePack).filter((pack) => pack !== undefined),
      ...qaAssets.map((asset) => asset.source_pack).filter((pack) => pack !== undefined)
    ])
  ].sort();
  const loadFailures = new Set(qaReport?.asset_report?.runtime?.failed ?? []);
  for (const failure of qaReport?.asset_report?.failures ?? []) {
    if (failure.code === 'ASSET_LOAD_FAILED') {
      for (const assetId of failure.asset_ids ?? []) {
        loadFailures.add(assetId);
      }
    }
  }

  return {
    fallbackGenerated: semanticFits.filter((fit) => fit.status === 'fallback_generated').length,
    mismatch: semanticFits.filter((fit) => fit.status === 'mismatch').length,
    unknown: semanticFits.filter((fit) => fit.status === 'unknown').length,
    hardMismatch: semanticFits.filter((fit) => fit.status === 'mismatch' && fit.strictness === 'hard').length,
    hardUnknown: semanticFits.filter((fit) => fit.status === 'unknown' && fit.strictness === 'hard').length,
    warnings: semanticIssues.filter((issue) => issue.severity === 'warning').length,
    mediumWarnings: semanticIssues.filter((issue) => issue.severity === 'warning' && issue.strictness === 'medium').length,
    placeholder: Math.max(qaReport?.asset_report?.placeholder_used.length ?? 0, manifestAssets.filter((asset) => asset.source === 'placeholder').length),
    requiredMissing: Math.max(
      qaReport?.asset_report?.missing.length ?? 0,
      manifestAssets.filter((asset) => asset.required === true && asset.status === 'missing').length
    ),
    assetLoadFailures: loadFailures.size,
    selectedPacks
  };
}

function countOverall(cases: AssetSemanticCanaryCaseSummary[], status: z.infer<typeof OverallStatusSchema>): number {
  return cases.filter((item) => item.overallStatus === status).length;
}

function sumCases(
  cases: AssetSemanticCanaryCaseSummary[],
  key: keyof Pick<
    AssetSemanticCanaryCaseSummary,
    | 'fallbackGeneratedCount'
    | 'mismatchCount'
    | 'unknownCount'
    | 'warningCount'
    | 'placeholderUsedCount'
    | 'requiredAssetMissingCount'
    | 'assetLoadFailureCount'
  >
): number {
  return cases.reduce((total, item) => total + (item[key] ?? 0), 0);
}

function sumRecords(records: AssetSemanticCanaryCaseRecord[], key: keyof Omit<ArtifactCounts, 'selectedPacks'>): number {
  return records.reduce((total, record) => total + record.counts[key], 0);
}
