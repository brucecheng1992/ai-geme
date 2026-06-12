import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  AssetSemanticCanaryBriefsSchema,
  buildAssetSemanticCanarySummary,
  renderAssetSemanticCanaryMarkdown,
  selectAssetSemanticCanaryBriefs,
  type AssetSemanticCanaryBrief,
  type AssetSemanticCanaryExecution
} from '../../scripts/asset-semantic-canary-report.js';

const supportedBrief = canaryBrief('cat_alien_shooter', false);
const unsupportedBrief = canaryBrief('cat_fishbone_alien_shooter', true);

describe('Asset semantic canary runner summary', () => {
  it('loads the fixture through the runner schema', async () => {
    const parsed = AssetSemanticCanaryBriefsSchema.parse(JSON.parse(await readFile('tests/fixtures/asset-semantic-canary.briefs.json', 'utf8')));

    expect(parsed).toHaveLength(14);
    expect(parsed.filter((item) => item.expectedUnsupported === true)).toHaveLength(5);
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
    expect(markdown).toContain('## Cases');
    expect(markdown).toContain('## Skipped');
    expect(markdown).toContain('## Failures');
    expect(markdown).toContain('fallback_generated is acceptable.');
    expect(markdown).toContain('cat_fishbone_alien_shooter');
    expect(markdown).toContain('overall_status QA_FAILED is disallowed');
  });
});

function summaryInput(executions: AssetSemanticCanaryExecution[], includeUnsupported = false) {
  return {
    fixturePath: 'tests/fixtures/asset-semantic-canary.briefs.json',
    outputDir: 'artifacts/asset-semantic-canary/20260612T010203Z',
    includeUnsupported,
    createdAt: '2026-06-12T01:02:03.000Z',
    executions
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
