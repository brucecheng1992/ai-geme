import { describe, expect, it } from 'vitest';

import {
  buildAssetSemanticCanaryComparison,
  parseAssetSemanticCanaryComparisonArgs,
  renderAssetSemanticCanaryComparisonJson
} from '../../scripts/asset-semantic-canary-comparison.js';
import type { AssetSemanticCanaryCaseSummary, AssetSemanticCanarySummary } from '../../scripts/asset-semantic-canary-report.js';

const step8cCaseIds = [
  'cat_alien_shooter',
  'cat_alien_space_shooter',
  'cat_fishbone_alien_shooter',
  'kitten_extraterrestrial_shooter',
  'orange_cat_starfield_alien_shooter',
  'tank_vs_tank_shooter',
  'tank_battle',
  'armored_vehicle_vs_tank',
  'tank_shoots_alien',
  'alien_shoots_tank',
  'cat_shoots_tank',
  'generic_shooter',
  'space_shooter_generic',
  'cat_space_alien_fishbone',
  'tank_battlefield_shooter',
  'tank_fishbone_battlefield_shooter',
  'cat_vs_tank_space_shooter',
  'alien_vs_alien_space_shooter'
];

describe('asset semantic canary comparison', () => {
  it('builds a deterministic green comparison for the Step 8c v0.2 canary pack', () => {
    const defaultSummary = canarySummary({ repairEnabled: false, mediumWarnings: 1 });
    const repairEnabledSummary = canarySummary({ repairEnabled: true, mediumWarnings: 1 });

    const comparison = buildAssetSemanticCanaryComparison({ defaultSummary, repairEnabledSummary });

    expect(comparison).toEqual({
      comparison_version: 'asset-semantic-canary-comparison-v0.1',
      canary_pack: 'asset-semantic-canary-v0.2',
      case_set: {
        total: 18,
        ids: step8cCaseIds,
        skipped: 0,
        experimental: 0
      },
      ok: true,
      default_run: {
        ok: true,
        total: 18,
        runnable: 18,
        skipped: 0,
        experimental: 0,
        passed: 18,
        failed: 0,
        exitCode: 0,
        failure_diagnostic_count: 0,
        diagnostic_codes: [],
        medium_warning_count: 1,
        repair: {
          enabled: false,
          attemptedCount: 0,
          failedCount: 0,
          actionsAccepted: []
        }
      },
      repair_enabled_run: {
        ok: true,
        total: 18,
        runnable: 18,
        skipped: 0,
        experimental: 0,
        passed: 18,
        failed: 0,
        exitCode: 0,
        failure_diagnostic_count: 0,
        diagnostic_codes: [],
        medium_warning_count: 1,
        repair: {
          enabled: true,
          attemptedCount: 0,
          failedCount: 0,
          actionsAccepted: []
        }
      },
      delta: {
        runnable: 0,
        passed: 0,
        failed: 0,
        failure_diagnostic_count: 0,
        medium_warning_count: 0,
        repair_attempted_count: 0,
        repair_failed_count: 0,
        new_diagnostic_codes: [],
        resolved_diagnostic_codes: [],
        new_repair_actions_accepted: [],
        resolved_repair_actions_accepted: []
      }
    });

    const json = renderAssetSemanticCanaryComparisonJson(comparison);
    expect(json).toBe(`${JSON.stringify(comparison, null, 2)}\n`);
    expect(json).not.toContain('2026-06-13T');
    expect(json).not.toContain('/Users/');
    expect(json).not.toContain('summary.json');
  });

  it('rejects summaries that are not a comparable default versus repair-enabled pair', () => {
    expect(() =>
      buildAssetSemanticCanaryComparison({
        defaultSummary: canarySummary({ repairEnabled: true }),
        repairEnabledSummary: canarySummary({ repairEnabled: true })
      })
    ).toThrow('Expected default canary summary repair.enabled=false');

    expect(() =>
      buildAssetSemanticCanaryComparison({
        defaultSummary: canarySummary({ repairEnabled: false }),
        repairEnabledSummary: canarySummary({ repairEnabled: false })
      })
    ).toThrow('Expected repair-enabled canary summary repair.enabled=true');

    expect(() =>
      buildAssetSemanticCanaryComparison({
        defaultSummary: canarySummary({ repairEnabled: false }),
        repairEnabledSummary: canarySummary({
          repairEnabled: true,
          cases: step8cCaseIds.map((id) => canaryCase(id)).slice(1)
        })
      })
    ).toThrow('Canary comparison requires identical case id order');

    expect(() =>
      buildAssetSemanticCanaryComparison({
        defaultSummary: canarySummary({ repairEnabled: false }),
        repairEnabledSummary: canarySummary({
          repairEnabled: true,
          cases: step8cCaseIds.map((id, index) => canaryCase(id, { experimental: index === 0 }))
        })
      })
    ).toThrow('Canary comparison requires identical skipped and experimental flags');

    const mismatchedFixturePathSummary = canarySummary({ repairEnabled: true });
    mismatchedFixturePathSummary.fixturePath = 'tests/fixtures/art-library-small-v0.1';
    expect(() =>
      buildAssetSemanticCanaryComparison({
        defaultSummary: canarySummary({ repairEnabled: false }),
        repairEnabledSummary: mismatchedFixturePathSummary
      })
    ).toThrow('Canary comparison requires identical fixture path');
  });

  it('keeps medium warnings out of failure diagnostics and reports sorted code deltas', () => {
    const defaultSummary = canarySummary({
      repairEnabled: false,
      failed: 2,
      exitCode: 1,
      mediumWarnings: 4,
      counts: {
        qaFailed: 1,
        hardMismatch: 1
      }
    });
    const repairEnabledSummary = canarySummary({
      repairEnabled: true,
      failed: 2,
      exitCode: 1,
      mediumWarnings: 1,
      counts: {
        hardUnknown: 1,
        requiredAssetMissing: 1
      }
    });

    const comparison = buildAssetSemanticCanaryComparison({ defaultSummary, repairEnabledSummary });

    expect(comparison.default_run).toMatchObject({
      ok: false,
      failure_diagnostic_count: 2,
      diagnostic_codes: ['HARD_SEMANTIC_MISMATCH', 'QA_FAILED'],
      medium_warning_count: 4
    });
    expect(comparison.repair_enabled_run).toMatchObject({
      ok: false,
      failure_diagnostic_count: 2,
      diagnostic_codes: ['HARD_SEMANTIC_UNKNOWN', 'REQUIRED_ASSET_MISSING'],
      medium_warning_count: 1
    });
    expect(comparison.delta).toMatchObject({
      medium_warning_count: -3,
      new_diagnostic_codes: ['HARD_SEMANTIC_UNKNOWN', 'REQUIRED_ASSET_MISSING'],
      resolved_diagnostic_codes: ['HARD_SEMANTIC_MISMATCH', 'QA_FAILED']
    });
  });

  it('normalizes repair actions from case-level repaired requirements without inventing empty aggregates', () => {
    const repairEnabledSummary = canarySummary({
      repairEnabled: true,
      repairAttemptedCount: 2,
      cases: step8cCaseIds.map((id, index) =>
        canaryCase(id, {
          repair:
            index === 0
              ? repairAttempt(['force_template_svg_fallback', 'blacklist_candidate_then_reresolve'])
              : index === 1
                ? repairAttempt(['force_template_svg_fallback'])
                : repairSkipped()
        })
      )
    });

    const comparison = buildAssetSemanticCanaryComparison({
      defaultSummary: canarySummary({ repairEnabled: false }),
      repairEnabledSummary
    });

    expect(comparison.repair_enabled_run.repair).toEqual({
      enabled: true,
      attemptedCount: 2,
      failedCount: 0,
      actionsAccepted: ['blacklist_candidate_then_reresolve', 'force_template_svg_fallback']
    });
    expect(comparison.delta.new_repair_actions_accepted).toEqual(['blacklist_candidate_then_reresolve', 'force_template_svg_fallback']);
    expect(Object.keys(comparison.repair_enabled_run.repair)).not.toContain('actionsProposed');
    expect(Object.keys(comparison.repair_enabled_run.repair)).not.toContain('actionsRejected');
  });

  it('parses comparison CLI arguments without running canaries', () => {
    expect(
      parseAssetSemanticCanaryComparisonArgs([
        '--default-summary',
        'artifacts/asset-semantic-canary/default/summary.json',
        '--repair-enabled-summary',
        'artifacts/asset-semantic-canary/repair/summary.json',
        '--out',
        'artifacts/asset-semantic-canary-comparison/repair/comparison.json'
      ])
    ).toEqual({
      defaultSummaryPath: 'artifacts/asset-semantic-canary/default/summary.json',
      repairEnabledSummaryPath: 'artifacts/asset-semantic-canary/repair/summary.json',
      outPath: 'artifacts/asset-semantic-canary-comparison/repair/comparison.json'
    });
    expect(parseAssetSemanticCanaryComparisonArgs(['--help'])).toBe('help');
    expect(() => parseAssetSemanticCanaryComparisonArgs(['--default-summary'])).toThrow('Expected a value after --default-summary');
    expect(() => parseAssetSemanticCanaryComparisonArgs(['--unknown'])).toThrow('Unknown argument: --unknown');
  });
});

function canarySummary(options: {
  repairEnabled: boolean;
  cases?: AssetSemanticCanaryCaseSummary[];
  counts?: Partial<AssetSemanticCanarySummary['counts']>;
  mediumWarnings?: number;
  failed?: number;
  exitCode?: number;
  repairAttemptedCount?: number;
}): AssetSemanticCanarySummary {
  const cases = options.cases ?? step8cCaseIds.map((id) => canaryCase(id, { repair: options.repairEnabled ? repairSkipped() : undefined }));
  const failed = options.failed ?? 0;
  const passed = cases.filter((item) => !item.skipped).length - failed;
  const counts: AssetSemanticCanarySummary['counts'] = {
    playable: passed,
    playableWithFallbackAssets: 0,
    playableWithArtWarnings: options.mediumWarnings === undefined ? 0 : 1,
    needsAssetRepair: 0,
    qaFailed: 0,
    hardMismatch: 0,
    hardUnknown: 0,
    mediumWarnings: options.mediumWarnings ?? 0,
    fallbackGenerated: cases.length,
    placeholderUsed: 0,
    requiredAssetMissing: 0,
    assetLoadFailures: 0,
    ...options.counts
  };
  const repairAttemptedCount = options.repairAttemptedCount ?? cases.filter((item) => item.repair?.attempted === true).length;

  return {
    version: 'asset-semantic-canary-v0.1',
    createdAt: '2026-06-13T01:02:03.000Z',
    fixturePath: '/Users/example/ai-game-maker/tests/fixtures/asset-semantic-canary.briefs.json',
    total: cases.length,
    runnable: cases.filter((item) => !item.skipped).length,
    passed,
    failed,
    skipped: cases.filter((item) => item.skipped).length,
    experimental: cases.filter((item) => item.experimental === true).length,
    exitCode: options.exitCode ?? (failed > 0 ? 1 : 0),
    repairEnabled: options.repairEnabled,
    repairAttempted: repairAttemptedCount > 0,
    repairAttemptedCount,
    repairSucceededCount: repairAttemptedCount,
    repairFailedCount: 0,
    repairSkippedReasons: options.repairEnabled ? { no_asset_semantic_repair_needed: cases.length - repairAttemptedCount } : {},
    counts,
    repair: {
      enabled: options.repairEnabled,
      attemptedCount: repairAttemptedCount,
      succeededCount: repairAttemptedCount,
      failedCount: 0,
      skippedCount: options.repairEnabled ? cases.length - repairAttemptedCount : 0,
      skippedReasons: options.repairEnabled ? { no_asset_semantic_repair_needed: cases.length - repairAttemptedCount } : {}
    },
    cases
  };
}

function canaryCase(
  id: string,
  options: {
    skipped?: boolean;
    experimental?: boolean;
    repair?: AssetSemanticCanaryCaseSummary['repair'];
  } = {}
): AssetSemanticCanaryCaseSummary {
  return {
    id,
    brief: id,
    category: 'supported_core_semantic',
    skipped: options.skipped ?? false,
    experimental: options.experimental,
    runtimeStatus: 'PASSED',
    assetSemanticStatus: 'PASSED',
    overallStatus: 'PLAYABLE',
    fallbackGeneratedCount: 1,
    mismatchCount: 0,
    unknownCount: 0,
    warningCount: 0,
    placeholderUsedCount: 0,
    requiredAssetMissingCount: 0,
    assetLoadFailureCount: 0,
    selectedPacks: ['kenney-tiny-shooter-tanks'],
    reportPath: `artifacts/${id}/asset_resolution_report.json`,
    manifestPath: `data/generated-projects/proj_${id}/public/asset_manifest.json`,
    qaReportPath: `data/local-data/qa-reports/proj_${id}/run_${id}.json`,
    repair: options.repair,
    pass: true
  };
}

function repairSkipped(): AssetSemanticCanaryCaseSummary['repair'] {
  return {
    enabled: true,
    attempted: false,
    attemptCount: 0,
    skippedReason: 'no_asset_semantic_repair_needed'
  };
}

function repairAttempt(actions: string[]): AssetSemanticCanaryCaseSummary['repair'] {
  return {
    enabled: true,
    attempted: true,
    attemptCount: 1,
    beforeOverallStatus: 'NEEDS_ASSET_REPAIR',
    beforeAssetSemanticStatus: 'FAILED',
    afterOverallStatus: 'PLAYABLE_WITH_FALLBACK_ASSETS',
    afterAssetSemanticStatus: 'PASSED',
    repairedRequirements: actions.map((action, index) => ({
      requirementId: `requirement_${index}`,
      role: index === 0 ? 'player' : 'enemy',
      action,
      newSemanticFitStatus: 'fallback_generated'
    }))
  };
}
