import { z } from 'zod';

import type { AssetSemanticCanaryCaseSummary, AssetSemanticCanaryFixtureKind, AssetSemanticCanarySummary } from './asset-semantic-canary-report.js';

const NonNegativeIntSchema = z.number().int().min(0);

const AssetSemanticCanaryComparisonCountsSchema = z
  .strictObject({
    needsAssetRepair: NonNegativeIntSchema,
    qaFailed: NonNegativeIntSchema,
    hardMismatch: NonNegativeIntSchema,
    hardUnknown: NonNegativeIntSchema,
    mediumWarnings: NonNegativeIntSchema,
    placeholderUsed: NonNegativeIntSchema,
    requiredAssetMissing: NonNegativeIntSchema,
    assetLoadFailures: NonNegativeIntSchema
  })
  .passthrough();

const AssetSemanticCanaryComparisonCaseRepairRequirementSchema = z
  .strictObject({
    action: z.string().trim().min(1).optional()
  })
  .passthrough();

const AssetSemanticCanaryComparisonCaseRepairSchema = z
  .strictObject({
    repairedRequirements: z.array(AssetSemanticCanaryComparisonCaseRepairRequirementSchema).optional()
  })
  .passthrough();

const AssetSemanticCanaryComparisonCaseSchema = z
  .strictObject({
    id: z.string().trim().min(1),
    skipped: z.boolean(),
    experimental: z.boolean().optional(),
    repair: AssetSemanticCanaryComparisonCaseRepairSchema.optional()
  })
  .passthrough();

const AssetSemanticCanaryComparisonRepairSchema = z
  .strictObject({
    enabled: z.boolean(),
    attemptedCount: NonNegativeIntSchema,
    failedCount: NonNegativeIntSchema
  })
  .passthrough();
const AssetSemanticCanaryComparisonFixtureSchema = z
  .strictObject({
    kind: z.enum(['canary_briefs', 'small_art_library', 'large_art_library_batch_zero']),
    identity: z.string().trim().min(1),
    assetCount: NonNegativeIntSchema.optional()
  })
  .passthrough();

export const AssetSemanticCanaryComparisonSummarySchema = z
  .strictObject({
    version: z.literal('asset-semantic-canary-v0.1'),
    total: NonNegativeIntSchema,
    runnable: NonNegativeIntSchema,
    passed: NonNegativeIntSchema,
    failed: NonNegativeIntSchema,
    skipped: NonNegativeIntSchema,
    experimental: NonNegativeIntSchema,
    exitCode: z.number().int(),
    repairEnabled: z.boolean(),
    fixturePath: z.string().trim().min(1),
    fixture: AssetSemanticCanaryComparisonFixtureSchema.optional(),
    counts: AssetSemanticCanaryComparisonCountsSchema,
    repair: AssetSemanticCanaryComparisonRepairSchema,
    cases: z.array(AssetSemanticCanaryComparisonCaseSchema)
  })
  .passthrough();

export type AssetSemanticCanaryComparisonCliOptions = {
  defaultSummaryPath: string;
  repairEnabledSummaryPath: string;
  outPath?: string;
};

export type AssetSemanticCanaryComparisonRun = {
  ok: boolean;
  total: number;
  runnable: number;
  skipped: number;
  experimental: number;
  passed: number;
  failed: number;
  exitCode: number;
  failure_diagnostic_count: number;
  diagnostic_codes: string[];
  medium_warning_count: number;
  repair: {
    enabled: boolean;
    attemptedCount: number;
    failedCount: number;
    actionsAccepted: string[];
  };
};

export type AssetSemanticCanaryComparison = {
  comparison_version: 'asset-semantic-canary-comparison-v0.1';
  canary_pack: 'asset-semantic-canary-v0.2';
  fixture?: {
    kind: AssetSemanticCanaryFixtureKind;
    identity: string;
    asset_count?: number;
  };
  case_set: {
    total: number;
    ids: string[];
    skipped: number;
    experimental: number;
  };
  ok: boolean;
  default_run: AssetSemanticCanaryComparisonRun;
  repair_enabled_run: AssetSemanticCanaryComparisonRun;
  delta: {
    runnable: number;
    passed: number;
    failed: number;
    failure_diagnostic_count: number;
    medium_warning_count: number;
    repair_attempted_count: number;
    repair_failed_count: number;
    new_diagnostic_codes: string[];
    resolved_diagnostic_codes: string[];
    new_repair_actions_accepted: string[];
    resolved_repair_actions_accepted: string[];
  };
};

type DiagnosticCountKey = keyof Pick<
  AssetSemanticCanarySummary['counts'],
  'needsAssetRepair' | 'qaFailed' | 'hardMismatch' | 'hardUnknown' | 'requiredAssetMissing' | 'assetLoadFailures' | 'placeholderUsed'
>;

const diagnosticCodes: Array<{ key: DiagnosticCountKey; code: string }> = [
  { key: 'assetLoadFailures', code: 'ASSET_LOAD_FAILED' },
  { key: 'hardMismatch', code: 'HARD_SEMANTIC_MISMATCH' },
  { key: 'hardUnknown', code: 'HARD_SEMANTIC_UNKNOWN' },
  { key: 'needsAssetRepair', code: 'NEEDS_ASSET_REPAIR' },
  { key: 'placeholderUsed', code: 'PLACEHOLDER_USED' },
  { key: 'qaFailed', code: 'QA_FAILED' },
  { key: 'requiredAssetMissing', code: 'REQUIRED_ASSET_MISSING' }
];

export function buildAssetSemanticCanaryComparison(input: {
  defaultSummary: AssetSemanticCanarySummary;
  repairEnabledSummary: AssetSemanticCanarySummary;
}): AssetSemanticCanaryComparison {
  const defaultSummary = AssetSemanticCanaryComparisonSummarySchema.parse(input.defaultSummary) as AssetSemanticCanarySummary;
  const repairEnabledSummary = AssetSemanticCanaryComparisonSummarySchema.parse(input.repairEnabledSummary) as AssetSemanticCanarySummary;
  assertRepairMode(defaultSummary, false, 'default');
  assertRepairMode(repairEnabledSummary, true, 'repair-enabled');
  assertComparableFixture(defaultSummary, repairEnabledSummary);
  assertComparableCaseSet(defaultSummary, repairEnabledSummary);

  const defaultRun = summarizeRun(defaultSummary);
  const repairEnabledRun = summarizeRun(repairEnabledSummary);
  const fixture = summarizeComparisonFixture(defaultSummary);

  return {
    comparison_version: 'asset-semantic-canary-comparison-v0.1',
    canary_pack: 'asset-semantic-canary-v0.2',
    ...(fixture === undefined ? {} : { fixture }),
    case_set: {
      total: defaultSummary.cases.length,
      ids: defaultSummary.cases.map((item) => item.id),
      skipped: defaultSummary.skipped,
      experimental: defaultSummary.experimental
    },
    ok: defaultRun.ok && repairEnabledRun.ok,
    default_run: defaultRun,
    repair_enabled_run: repairEnabledRun,
    delta: {
      runnable: repairEnabledRun.runnable - defaultRun.runnable,
      passed: repairEnabledRun.passed - defaultRun.passed,
      failed: repairEnabledRun.failed - defaultRun.failed,
      failure_diagnostic_count: repairEnabledRun.failure_diagnostic_count - defaultRun.failure_diagnostic_count,
      medium_warning_count: repairEnabledRun.medium_warning_count - defaultRun.medium_warning_count,
      repair_attempted_count: repairEnabledRun.repair.attemptedCount - defaultRun.repair.attemptedCount,
      repair_failed_count: repairEnabledRun.repair.failedCount - defaultRun.repair.failedCount,
      new_diagnostic_codes: sortedDifference(repairEnabledRun.diagnostic_codes, defaultRun.diagnostic_codes),
      resolved_diagnostic_codes: sortedDifference(defaultRun.diagnostic_codes, repairEnabledRun.diagnostic_codes),
      new_repair_actions_accepted: sortedDifference(repairEnabledRun.repair.actionsAccepted, defaultRun.repair.actionsAccepted),
      resolved_repair_actions_accepted: sortedDifference(defaultRun.repair.actionsAccepted, repairEnabledRun.repair.actionsAccepted)
    }
  };
}

export function renderAssetSemanticCanaryComparisonJson(comparison: AssetSemanticCanaryComparison): string {
  return `${JSON.stringify(comparison, null, 2)}\n`;
}

export function parseAssetSemanticCanaryComparisonArgs(args: string[]): AssetSemanticCanaryComparisonCliOptions | 'help' {
  const options: Partial<AssetSemanticCanaryComparisonCliOptions> = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help') {
      return 'help';
    }
    if (arg === '--default-summary') {
      options.defaultSummaryPath = requireValue(args, (index += 1), arg);
    } else if (arg === '--repair-enabled-summary') {
      options.repairEnabledSummaryPath = requireValue(args, (index += 1), arg);
    } else if (arg === '--out') {
      options.outPath = requireValue(args, (index += 1), arg);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.defaultSummaryPath === undefined) {
    throw new Error('Expected --default-summary <path>');
  }
  if (options.repairEnabledSummaryPath === undefined) {
    throw new Error('Expected --repair-enabled-summary <path>');
  }

  return {
    defaultSummaryPath: options.defaultSummaryPath,
    repairEnabledSummaryPath: options.repairEnabledSummaryPath,
    outPath: options.outPath
  };
}

export function printAssetSemanticCanaryComparisonHelp(): void {
  console.log(`Usage: npm run qa:asset-semantic:compare -- --default-summary <path> --repair-enabled-summary <path> [--out <path>]

Options:
  --default-summary <path>          Default canary summary.json generated without --repair-enabled.
  --repair-enabled-summary <path>   Repair-enabled canary summary.json generated with --repair-enabled.
  --out <path>                      Optional comparison.json output path. Without this, JSON is printed to stdout.
`);
}

function summarizeRun(summary: AssetSemanticCanarySummary): AssetSemanticCanaryComparisonRun {
  const failureDiagnosticCount = countFailureDiagnostics(summary);
  const diagnostic_codes = diagnosticCodes
    .filter((item) => summary.counts[item.key] > 0)
    .map((item) => item.code)
    .sort((left, right) => left.localeCompare(right));

  return {
    ok: summary.exitCode === 0 && summary.failed === 0 && failureDiagnosticCount === 0,
    total: summary.total,
    runnable: summary.runnable,
    skipped: summary.skipped,
    experimental: summary.experimental,
    passed: summary.passed,
    failed: summary.failed,
    exitCode: summary.exitCode,
    failure_diagnostic_count: failureDiagnosticCount,
    diagnostic_codes,
    medium_warning_count: summary.counts.mediumWarnings,
    repair: {
      enabled: summary.repair.enabled,
      attemptedCount: summary.repair.attemptedCount,
      failedCount: summary.repair.failedCount,
      actionsAccepted: collectAcceptedRepairActions(summary.cases)
    }
  };
}

function assertRepairMode(summary: AssetSemanticCanarySummary, expectedEnabled: boolean, label: 'default' | 'repair-enabled'): void {
  if (summary.repair.enabled !== expectedEnabled || summary.repairEnabled !== expectedEnabled) {
    throw new Error(`Expected ${label} canary summary repair.enabled=${expectedEnabled}`);
  }
}

function assertComparableFixture(defaultSummary: AssetSemanticCanarySummary, repairEnabledSummary: AssetSemanticCanarySummary): void {
  if (defaultSummary.fixturePath !== repairEnabledSummary.fixturePath) {
    throw new Error('Canary comparison requires identical fixture path');
  }

  const defaultFixture = defaultSummary.fixture;
  const repairEnabledFixture = repairEnabledSummary.fixture;
  if ((defaultFixture === undefined) !== (repairEnabledFixture === undefined)) {
    throw new Error('Canary comparison requires identical fixture identity');
  }
  if (defaultFixture === undefined || repairEnabledFixture === undefined) {
    return;
  }
  if (
    defaultFixture.kind !== repairEnabledFixture.kind ||
    defaultFixture.identity !== repairEnabledFixture.identity ||
    defaultFixture.assetCount !== repairEnabledFixture.assetCount
  ) {
    throw new Error('Canary comparison requires identical fixture identity');
  }
}

function assertComparableCaseSet(defaultSummary: AssetSemanticCanarySummary, repairEnabledSummary: AssetSemanticCanarySummary): void {
  const defaultIds = defaultSummary.cases.map((item) => item.id);
  const repairEnabledIds = repairEnabledSummary.cases.map((item) => item.id);
  if (!arraysEqual(defaultIds, repairEnabledIds)) {
    throw new Error('Canary comparison requires identical case id order');
  }

  const defaultFlags = defaultSummary.cases.map(caseFlags);
  const repairEnabledFlags = repairEnabledSummary.cases.map(caseFlags);
  if (!arraysEqual(defaultFlags, repairEnabledFlags)) {
    throw new Error('Canary comparison requires identical skipped and experimental flags');
  }

  const scalarFields: Array<keyof Pick<AssetSemanticCanarySummary, 'total' | 'runnable' | 'skipped' | 'experimental'>> = [
    'total',
    'runnable',
    'skipped',
    'experimental'
  ];
  for (const field of scalarFields) {
    if (defaultSummary[field] !== repairEnabledSummary[field]) {
      throw new Error(`Canary comparison requires identical ${field}`);
    }
  }
}

function summarizeComparisonFixture(summary: AssetSemanticCanarySummary): AssetSemanticCanaryComparison['fixture'] {
  if (summary.fixture === undefined) {
    return undefined;
  }

  return {
    kind: summary.fixture.kind,
    identity: summary.fixture.identity,
    ...(summary.fixture.assetCount === undefined ? {} : { asset_count: summary.fixture.assetCount })
  };
}

function caseFlags(item: AssetSemanticCanaryCaseSummary): string {
  return `${item.id}|skipped=${item.skipped}|experimental=${item.experimental === true}`;
}

function countFailureDiagnostics(summary: AssetSemanticCanarySummary): number {
  return diagnosticCodes.reduce((total, item) => total + summary.counts[item.key], 0);
}

function collectAcceptedRepairActions(cases: AssetSemanticCanaryCaseSummary[]): string[] {
  return [
    ...new Set(
      cases.flatMap((item) =>
        (item.repair?.repairedRequirements ?? []).map((requirement) => requirement.action?.trim()).filter((action): action is string => action !== undefined && action.length > 0)
      )
    )
  ].sort((left, right) => left.localeCompare(right));
}

function sortedDifference(left: string[], right: string[]): string[] {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item)).sort((a, b) => a.localeCompare(b));
}

function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function requireValue(args: string[], index: number, flag: string): string {
  const value = args[index];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`Expected a value after ${flag}`);
  }
  return value;
}
