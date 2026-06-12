import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  parseAssetSemanticCanaryArgs,
  resolveCanaryAssetSemanticRepairConfig,
  type AssetSemanticCanaryCliOptions
} from '../../scripts/asset-semantic-canary-options.js';
import {
  AssetSemanticCanaryBriefsSchema,
  buildAssetSemanticCanarySummary,
  renderAssetSemanticCanaryMarkdown,
  selectAssetSemanticCanaryBriefs,
  type AssetSemanticCanaryBrief,
  type AssetSemanticCanaryCaseRepairSummary,
  type AssetSemanticCanaryExecution
} from '../../scripts/asset-semantic-canary-report.js';

const supportedBrief = canaryBrief('cat_alien_shooter', false);
const unsupportedBrief = canaryBrief('cat_fishbone_alien_shooter', true);

describe('Asset semantic canary runner summary', () => {
  it('keeps runner repair disabled by default and enables it with --repair-enabled', () => {
    const defaults = parseOptions([]);
    const repairEnabled = parseOptions(['--repair-enabled']);

    expect(resolveCanaryAssetSemanticRepairConfig(defaults, {} as NodeJS.ProcessEnv)).toMatchObject({
      enabled: false,
      maxAttempts: 1
    });
    expect(resolveCanaryAssetSemanticRepairConfig(repairEnabled, {} as NodeJS.ProcessEnv)).toMatchObject({
      enabled: true,
      maxAttempts: 1
    });
    expect(resolveCanaryAssetSemanticRepairConfig(defaults, { ASSET_SEMANTIC_REPAIR_ENABLED: 'true' } as NodeJS.ProcessEnv)).toMatchObject({
      enabled: true,
      maxAttempts: 1
    });
  });

  it('locks parser help, timestamp override, unknown args, and missing values', () => {
    expect(parseAssetSemanticCanaryArgs(['--help'], '20260612T010203Z')).toBe('help');
    expect(parseOptions(['--timestamp', '20260612TfixedZ'])).toMatchObject({
      timestamp: '20260612TfixedZ'
    });
    expect(() => parseAssetSemanticCanaryArgs(['--unknown'], '20260612T010203Z')).toThrow('Unknown argument: --unknown');
    expect(() => parseAssetSemanticCanaryArgs(['--case'], '20260612T010203Z')).toThrow('Expected a value after --case');
  });

  it('loads the fixture through the runner schema', async () => {
    const parsed = AssetSemanticCanaryBriefsSchema.parse(JSON.parse(await readFile('tests/fixtures/asset-semantic-canary.briefs.json', 'utf8')));
    const selected = selectAssetSemanticCanaryBriefs(parsed, { includeUnsupported: false });

    expect(parsed).toHaveLength(14);
    expect(parsed.filter((item) => item.expectedUnsupported === true)).toHaveLength(0);
    expect(selected.runnable).toHaveLength(14);
    expect(selected.skipped).toEqual([]);
  });

  it('skips expectedUnsupported by default and marks them experimental when included', () => {
    expect(selectAssetSemanticCanaryBriefs([supportedBrief, unsupportedBrief], { includeUnsupported: false })).toEqual({
      runnable: [supportedBrief],
      skipped: [{ brief: unsupportedBrief, reason: 'expectedUnsupported: fishbone is not canonical yet' }]
    });
    expect(selectAssetSemanticCanaryBriefs([supportedBrief, unsupportedBrief], { includeUnsupported: true })).toEqual({
      runnable: [supportedBrief, unsupportedBrief],
      skipped: []
    });
  });

  it('keeps expectedUnsupported skipped by default in repair-enabled mode', () => {
    const summary = buildAssetSemanticCanarySummary(
      summaryInput(
        [
          completedCase(supportedBrief, 'PLAYABLE', {
            repair: repairSkipped('no_asset_semantic_repair_needed')
          }),
          { brief: unsupportedBrief, state: 'skipped', reason: 'expectedUnsupported: fishbone is not canonical yet' }
        ],
        false,
        true
      )
    );

    expect(summary).toMatchObject({
      runnable: 1,
      skipped: 1,
      experimental: 0,
      passed: 1,
      failed: 0,
      repairEnabled: true,
      repairAttemptedCount: 0,
      repairFailedCount: 0
    });
    expect(summary.cases[1]).toMatchObject({
      id: 'cat_fishbone_alien_shooter',
      skipped: true,
      pass: true
    });
  });

  it('marks unsupported cases experimental when --include-unsupported and --repair-enabled are combined', () => {
    const summary = buildAssetSemanticCanarySummary(
      summaryInput(
        [
          completedCase(supportedBrief, 'PLAYABLE', {
            repair: repairSkipped('no_asset_semantic_repair_needed')
          }),
          completedCase(unsupportedBrief, 'NEEDS_ASSET_REPAIR', {
            semanticStatus: 'FAILED',
            repair: repairSkipped('no_executable_repair_items')
          })
        ],
        true,
        true
      )
    );

    expect(summary).toMatchObject({
      runnable: 2,
      skipped: 0,
      experimental: 1,
      failed: 1,
      exitCode: 0,
      repairEnabled: true
    });
    expect(summary.cases[1]).toMatchObject({
      experimental: true,
      pass: false
    });
  });

  it('supports --case style filtering and --limit style smoke selection', () => {
    const briefs = [supportedBrief, canaryBrief('tank_vs_tank_shooter', false), unsupportedBrief];

    expect(selectAssetSemanticCanaryBriefs(briefs, { includeUnsupported: false, caseId: 'tank_vs_tank_shooter' }).runnable.map((item) => item.id)).toEqual([
      'tank_vs_tank_shooter'
    ]);
    expect(selectAssetSemanticCanaryBriefs(briefs, { includeUnsupported: false, limit: 1 }).runnable.map((item) => item.id)).toEqual(['cat_alien_shooter']);
    expect(() => selectAssetSemanticCanaryBriefs(briefs, { includeUnsupported: false, caseId: 'missing_case' })).toThrow(
      'Unknown asset semantic canary case: missing_case'
    );
  });

  it('keeps fallback and art warning outcomes passing while counting warnings', () => {
    const summary = buildAssetSemanticCanarySummary(summaryInput([completedCase(supportedBrief, 'PLAYABLE_WITH_ART_WARNINGS')]));

    expect(summary).toMatchObject({
      version: 'asset-semantic-canary-v0.1',
      total: 1,
      runnable: 1,
      passed: 1,
      failed: 0,
      skipped: 0,
      experimental: 0,
      exitCode: 0,
      counts: {
        playableWithArtWarnings: 1,
        fallbackGenerated: 1,
        mediumWarnings: 1
      }
    });
    expect(summary.cases[0]).toMatchObject({
      id: 'cat_alien_shooter',
      pass: true,
      overallStatus: 'PLAYABLE_WITH_ART_WARNINGS',
      fallbackGeneratedCount: 1,
      warningCount: 1
    });
  });

  it('keeps soft warnings out of the medium warning aggregate', () => {
    const summary = buildAssetSemanticCanarySummary(
      summaryInput([completedCase(supportedBrief, 'PLAYABLE_WITH_ART_WARNINGS', { warningStrictness: 'soft' })])
    );

    expect(summary.counts.mediumWarnings).toBe(0);
    expect(summary.cases[0]).toMatchObject({
      pass: true,
      warningCount: 1
    });
  });

  it('fails supported cases on repair, QA, hard mismatch, hard unknown, missing assets, load failures, or placeholders', () => {
    const summary = buildAssetSemanticCanarySummary(
      summaryInput([
        completedCase(supportedBrief, 'NEEDS_ASSET_REPAIR', { semanticStatus: 'FAILED' }),
        completedCase(canaryBrief('qa_failed_case', false), 'QA_FAILED', { runtimeStatus: 'FAILED' }),
        completedCase(canaryBrief('hard_mismatch_case', false), 'PLAYABLE', { hardMismatch: true }),
        completedCase(canaryBrief('hard_unknown_case', false), 'PLAYABLE', { hardUnknown: true }),
        completedCase(canaryBrief('missing_case', false), 'PLAYABLE', { requiredMissing: true }),
        completedCase(canaryBrief('load_failure_case', false), 'PLAYABLE', { assetLoadFailure: true }),
        completedCase(canaryBrief('placeholder_case', false), 'PLAYABLE', { placeholder: true })
      ])
    );

    expect(summary.failed).toBe(7);
    expect(summary.exitCode).toBe(1);
    expect(summary.counts).toMatchObject({
      needsAssetRepair: 1,
      qaFailed: 1,
      hardMismatch: 1,
      hardUnknown: 1,
      requiredAssetMissing: 1,
      assetLoadFailures: 1,
      placeholderUsed: 1
    });
    expect(summary.cases.map((item) => item.pass)).toEqual([false, false, false, false, false, false, false]);
  });

  it('does not let experimental unsupported failures drive the exit code', () => {
    const summary = buildAssetSemanticCanarySummary(summaryInput([completedCase(unsupportedBrief, 'NEEDS_ASSET_REPAIR', { semanticStatus: 'FAILED' })], true));

    expect(summary.experimental).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.exitCode).toBe(0);
    expect(summary.cases[0]).toMatchObject({ experimental: true, pass: false });
  });

  it('summarizes repair metadata without making old reports invalid', () => {
    const summary = buildAssetSemanticCanarySummary(
      summaryInput(
        [
          completedCase(supportedBrief, 'PLAYABLE_WITH_FALLBACK_ASSETS', {
            repair: {
              enabled: true,
              attempted: false,
              attemptCount: 0,
              skippedReason: 'no_asset_semantic_repair_needed',
              beforeOverallStatus: 'PLAYABLE_WITH_FALLBACK_ASSETS',
              beforeAssetSemanticStatus: 'PASSED'
            }
          }),
          completedCase(canaryBrief('repaired_case', false), 'PLAYABLE_WITH_FALLBACK_ASSETS', {
            repair: {
              enabled: true,
              attempted: true,
              attemptCount: 1,
              beforeOverallStatus: 'NEEDS_ASSET_REPAIR',
              beforeAssetSemanticStatus: 'FAILED',
              afterOverallStatus: 'PLAYABLE_WITH_FALLBACK_ASSETS',
              afterAssetSemanticStatus: 'PASSED',
              repairedRequirements: [
                {
                  requirementId: 'player',
                  role: 'player_character',
                  expectedConcept: 'cat',
                  previousAssetId: 'player',
                  previousSource: 'local_asset_pack',
                  previousSemanticFitStatus: 'mismatch',
                  action: 'force_template_svg_fallback',
                  newAssetId: 'player',
                  newSource: 'template_svg',
                  newSemanticFitStatus: 'fallback_generated'
                }
              ]
            }
          }),
          completedCase(canaryBrief('repair_failed_case', false), 'NEEDS_ASSET_REPAIR', {
            semanticStatus: 'FAILED',
            repair: {
              enabled: true,
              attempted: true,
              attemptCount: 1,
              skippedReason: 'repair_execution_failed',
              beforeOverallStatus: 'NEEDS_ASSET_REPAIR',
              beforeAssetSemanticStatus: 'FAILED',
              failureReasons: ['repair failed']
            }
          }),
          completedCase(canaryBrief('repair_incomplete_metadata_case', false), 'PLAYABLE', {
            repair: {
              enabled: true,
              attempted: true,
              attemptCount: 1,
              beforeOverallStatus: 'NEEDS_ASSET_REPAIR',
              beforeAssetSemanticStatus: 'FAILED'
            }
          }),
          completedCase(canaryBrief('old_report_case', false), 'PLAYABLE')
        ],
        false,
        true
      )
    );

    expect(summary.repair).toEqual({
      enabled: true,
      attemptedCount: 3,
      succeededCount: 1,
      failedCount: 1,
      skippedCount: 2,
      skippedReasons: {
        missing_repair_metadata: 1,
        no_asset_semantic_repair_needed: 1
      }
    });
    expect(summary).toMatchObject({
      repairEnabled: true,
      repairAttempted: true,
      repairAttemptedCount: 3,
      repairSucceededCount: 1,
      repairFailedCount: 1,
      repairSkippedReasons: {
        missing_repair_metadata: 1,
        no_asset_semantic_repair_needed: 1
      }
    });
    expect(summary.cases[0].repair).toMatchObject({
      enabled: true,
      attempted: false,
      skippedReason: 'no_asset_semantic_repair_needed'
    });
    expect(summary.cases[1].repair?.repairedRequirements?.[0]).toMatchObject({
      requirementId: 'player',
      action: 'force_template_svg_fallback',
      newSemanticFitStatus: 'fallback_generated'
    });
    expect(summary.cases[3].repair).toMatchObject({
      enabled: true,
      attempted: true,
      skippedReason: undefined
    });
    expect(summary.cases[4].repair).toMatchObject({
      enabled: true,
      attempted: false,
      skippedReason: 'missing_repair_metadata'
    });
  });

  it('passes a repair-enabled green summary when no repair is attempted', () => {
    const summary = buildAssetSemanticCanarySummary(
      summaryInput(
        [
          completedCase(supportedBrief, 'PLAYABLE_WITH_FALLBACK_ASSETS', {
            repair: repairSkipped('no_asset_semantic_repair_needed')
          }),
          completedCase(canaryBrief('art_warning_case', false), 'PLAYABLE_WITH_ART_WARNINGS', {
            repair: repairSkipped('no_asset_semantic_repair_needed')
          })
        ],
        false,
        true
      )
    );

    expect(summary).toMatchObject({
      passed: 2,
      failed: 0,
      exitCode: 0,
      repairEnabled: true,
      repairAttempted: false,
      repairAttemptedCount: 0,
      repairFailedCount: 0,
      repairSkippedReasons: {
        no_asset_semantic_repair_needed: 2
      }
    });
  });

  it('represents successful repair attempts without failing the summary', () => {
    const summary = buildAssetSemanticCanarySummary(
      summaryInput(
        [
          completedCase(supportedBrief, 'PLAYABLE_WITH_FALLBACK_ASSETS', {
            repair: repairSucceeded()
          })
        ],
        false,
        true
      )
    );

    expect(summary).toMatchObject({
      passed: 1,
      failed: 0,
      exitCode: 0,
      repairAttempted: true,
      repairAttemptedCount: 1,
      repairSucceededCount: 1,
      repairFailedCount: 0
    });
  });

  it('fails supported summaries when repair failed even if the overall status is playable', () => {
    const summary = buildAssetSemanticCanarySummary(
      summaryInput(
        [
          completedCase(supportedBrief, 'PLAYABLE_WITH_FALLBACK_ASSETS', {
            repair: {
              ...repairSucceeded(),
              afterOverallStatus: 'QA_FAILED',
              failureReasons: ['repair rebuild failed']
            }
          })
        ],
        false,
        true
      )
    );

    expect(summary).toMatchObject({
      passed: 0,
      failed: 1,
      exitCode: 1,
      repairAttemptedCount: 1,
      repairFailedCount: 1
    });
    expect(summary.cases[0].failureReasons).toContain('semantic asset repair failure is not allowed');
  });

  it('allows placeholders only when the fixture explicitly allows them', () => {
    const brief = canaryBrief('placeholder_allowed', false);
    brief.expect.placeholderAllowed = true;
    const summary = buildAssetSemanticCanarySummary(summaryInput([completedCase(brief, 'PLAYABLE', { placeholder: true })]));

    expect(summary.passed).toBe(1);
    expect(summary.exitCode).toBe(0);
  });

  it('renders status counts, skipped cases, failures, and notes in markdown', () => {
    const summary = buildAssetSemanticCanarySummary(
      summaryInput([
        completedCase(supportedBrief, 'QA_FAILED', { runtimeStatus: 'FAILED' }),
        { brief: unsupportedBrief, state: 'skipped', reason: 'expectedUnsupported: fishbone is not canonical yet' }
      ])
    );
    const markdown = renderAssetSemanticCanaryMarkdown(summary);

    expect(markdown).toContain('# Asset Semantic Canary Summary');
    expect(markdown).toContain('## Status Counts');
    expect(markdown).toContain('## Semantic Counts');
    expect(markdown).toContain('## Repair');
    expect(markdown).toContain('## Repair skipped reasons');
    expect(markdown).toContain('## Cases');
    expect(markdown).toContain('## Skipped');
    expect(markdown).toContain('## Failures');
    expect(markdown).toContain('fallback_generated is acceptable.');
    expect(markdown).toContain('cat_fishbone_alien_shooter');
    expect(markdown).toContain('overall_status QA_FAILED is disallowed');
  });
});

function summaryInput(executions: AssetSemanticCanaryExecution[], includeUnsupported = false, repairEnabled = false) {
  return {
    fixturePath: 'tests/fixtures/asset-semantic-canary.briefs.json',
    outputDir: 'artifacts/asset-semantic-canary/20260612T010203Z',
    includeUnsupported,
    repairEnabled,
    createdAt: '2026-06-12T01:02:03.000Z',
    executions
  };
}

function parseOptions(args: string[]): AssetSemanticCanaryCliOptions {
  const parsed = parseAssetSemanticCanaryArgs(args, '20260612T010203Z');
  if (parsed === 'help') {
    throw new Error('Expected parsed options, got help.');
  }

  return parsed;
}

function repairSkipped(skippedReason: string): AssetSemanticCanaryCaseRepairSummary {
  return {
    enabled: true,
    attempted: false,
    attemptCount: 0,
    skippedReason,
    beforeOverallStatus: 'PLAYABLE_WITH_FALLBACK_ASSETS',
    beforeAssetSemanticStatus: 'PASSED'
  };
}

function repairSucceeded(): AssetSemanticCanaryCaseRepairSummary {
  return {
    enabled: true,
    attempted: true,
    attemptCount: 1,
    beforeOverallStatus: 'NEEDS_ASSET_REPAIR',
    beforeAssetSemanticStatus: 'FAILED',
    afterOverallStatus: 'PLAYABLE_WITH_FALLBACK_ASSETS',
    afterAssetSemanticStatus: 'PASSED',
    repairedRequirements: [
      {
        requirementId: 'player',
        role: 'player_character',
        action: 'force_template_svg_fallback',
        newSemanticFitStatus: 'fallback_generated'
      }
    ]
  };
}

function completedCase(
  brief: AssetSemanticCanaryBrief,
  overallStatus: 'PLAYABLE' | 'PLAYABLE_WITH_FALLBACK_ASSETS' | 'PLAYABLE_WITH_ART_WARNINGS' | 'NEEDS_ASSET_REPAIR' | 'QA_FAILED',
  options: {
    runtimeStatus?: 'PASSED' | 'FAILED';
    semanticStatus?: 'PASSED' | 'WARNING' | 'FAILED';
    hardMismatch?: boolean;
    hardUnknown?: boolean;
    requiredMissing?: boolean;
    assetLoadFailure?: boolean;
    placeholder?: boolean;
    warningStrictness?: 'medium' | 'soft';
    repair?: AssetSemanticCanaryCaseRepairSummary;
  } = {}
): AssetSemanticCanaryExecution {
  const semanticFit = options.hardUnknown
    ? { status: 'unknown', strictness: 'hard' }
    : options.hardMismatch
      ? { status: 'mismatch', strictness: 'hard' }
      : { status: 'fallback_generated', strictness: 'hard' };

  return {
    brief,
    state: 'completed',
    projectId: `proj_${brief.id}`,
    projectStatus: overallStatus === 'QA_FAILED' ? 'QA_FAILED' : 'PLAYABLE',
    reportPath: `artifacts/${brief.id}/asset_resolution_report.json`,
    manifestPath: `data/generated-projects/proj_${brief.id}/public/asset_manifest.json`,
    qaReportPath: `data/local-data/qa-reports/proj_${brief.id}/run_${brief.id}.json`,
    assetManifest: {
      assets: [
        {
          id: 'player',
          required: true,
          status: options.requiredMissing ? 'missing' : 'ready',
          source: options.placeholder ? 'placeholder' : 'template_svg',
          sourcePack: 'kenney-tiny-shooter-tanks',
          semanticFit
        }
      ]
    },
    qaReport: {
      runtime_status: options.runtimeStatus ?? 'PASSED',
      asset_semantic_status: options.semanticStatus ?? (overallStatus === 'PLAYABLE_WITH_ART_WARNINGS' ? 'WARNING' : 'PASSED'),
      overall_status: overallStatus,
      asset_semantic_repair: options.repair,
      asset_report: {
        missing: options.requiredMissing ? ['player'] : [],
        placeholder_used: options.placeholder ? ['player'] : [],
        runtime: { failed: options.assetLoadFailure ? ['player'] : [] },
        assets: [],
        semantic_issues: [
          ...(options.hardMismatch ? [{ severity: 'failure', semantic_fit_status: 'mismatch', strictness: 'hard' }] : []),
          ...(options.hardUnknown ? [{ severity: 'failure', semantic_fit_status: 'unknown', strictness: 'hard' }] : []),
          ...(overallStatus === 'PLAYABLE_WITH_ART_WARNINGS'
            ? [{ severity: 'warning', semantic_fit_status: 'mismatch', strictness: options.warningStrictness ?? 'medium' }]
            : [])
        ],
        failures: options.assetLoadFailure ? [{ code: 'ASSET_LOAD_FAILED', asset_ids: ['player'] }] : []
      }
    }
  };
}

function canaryBrief(id: string, expectedUnsupported: boolean): AssetSemanticCanaryBrief {
  return {
    id,
    brief: id,
    category: expectedUnsupported ? 'mixed_core_semantic' : 'supported_core_semantic',
    ...(expectedUnsupported ? { expectedUnsupported: true, unsupportedReason: 'fishbone is not canonical yet' } : {}),
    expect: {
      allowedOverall: ['PLAYABLE', 'PLAYABLE_WITH_FALLBACK_ASSETS', 'PLAYABLE_WITH_ART_WARNINGS'],
      disallowOverall: ['NEEDS_ASSET_REPAIR', 'QA_FAILED'],
      hardMismatchAllowed: false,
      requiredAssetMissingAllowed: false,
      assetLoadFailureAllowed: false,
      placeholderAllowed: false,
      expectedCore: []
    }
  };
}
