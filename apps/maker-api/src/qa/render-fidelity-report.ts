import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { z } from 'zod';

import type { AssetBindingTraceReport } from '../compiler/asset-binding-trace-report.js';
import type { RuntimeSceneBindingReport } from '../compiler/runtime-scene-binding-report.js';
import type { QaReport, QaRenderFidelitySummary, QaVisualMetrics } from './qa.types.js';

const RenderFidelityStatusSchema = z.enum(['PASSED', 'PASSED_WITH_OPTIONAL_FALLBACKS', 'VISUALLY_DEGRADED', 'FAILED']);
const RenderFidelityCheckStatusSchema = z.enum(['pass', 'warn', 'fail', 'skipped']);
const RenderFidelityRequestedEffectStatusSchema = z.enum(['matched', 'degraded', 'failed']);
const RenderFidelityCheckIdSchema = z.enum(['dsl_consumption', 'asset_binding', 'runtime_structure', 'screenshot', 'scene_snapshot']);
const SafeTextSchema = z.string().min(1).refine(isSafeText, 'text must not expose sensitive content');
const SafeRelativePathSchema = z.string().min(1).refine(isSafeRelativeArtifactPath, 'path must be relative and safe');
const SafeEvidenceRefSchema = z.string().min(1).refine(isSafeEvidenceRef, 'evidence ref must be relative and safe');

const RenderFidelityCheckSchema = z.strictObject({
  id: RenderFidelityCheckIdSchema,
  status: RenderFidelityCheckStatusSchema,
  expected: SafeTextSchema,
  observed: SafeTextSchema,
  evidenceRefs: z.array(SafeEvidenceRefSchema)
});

const RenderFidelityVisualEvidenceSchema = z.strictObject({
  visualStatus: z.enum(['PASSED', 'VISUAL_QA_FAILED']).optional(),
  screenshotRef: SafeRelativePathSchema.optional(),
  metrics: z
    .strictObject({
      canvas_width: z.number().min(0),
      canvas_height: z.number().min(0),
      screenshot_width: z.number().min(0),
      screenshot_height: z.number().min(0),
      non_background_pixel_ratio: z.number().min(0).max(1),
      varied_pixel_ratio: z.number().min(0).max(1),
      transparent_pixel_ratio: z.number().min(0).max(1)
    })
    .optional()
});

export const RenderFidelityReportSchema = z.strictObject({
  reportVersion: z.literal('render-fidelity-report.v1'),
  projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
  runId: z.string().regex(/^run_[A-Za-z0-9_-]+$/),
  status: RenderFidelityStatusSchema,
  requestedEffect: z.strictObject({
    status: RenderFidelityRequestedEffectStatusSchema,
    expected: z.array(SafeTextSchema).min(1),
    observed: z.array(SafeTextSchema).min(1),
    missing: z.array(SafeTextSchema),
    evidenceRefs: z.array(SafeEvidenceRefSchema)
  }),
  sourceArtifacts: z.strictObject({
    qaReport: SafeRelativePathSchema,
    dslConsumptionReport: z.literal('dsl_consumption_report.json').optional(),
    assetBindingTraceReport: z.literal('asset_binding_trace_report.json').optional(),
    runtimeSceneBindingReport: z.literal('runtime_scene_binding_report.json').optional()
  }),
  visualEvidence: RenderFidelityVisualEvidenceSchema,
  checks: z.array(RenderFidelityCheckSchema).min(1)
});

export type RenderFidelityReport = z.infer<typeof RenderFidelityReportSchema>;

export type BuildRenderFidelityReportInput = {
  projectId: string;
  runId: string;
  qaReport: QaReport;
  dslConsumption?: {
    ignoredAuthoritativeCount: number;
    coverageRatio?: number;
  };
  assetBindingTrace?: {
    status: AssetBindingTraceReport['status'];
    warningCount: number;
    errorCount: number;
  };
  runtimeSceneBinding?: {
    status: RuntimeSceneBindingReport['status'];
    boundCount: number;
    unboundCount: number;
  };
};

export function buildRenderFidelityReport(input: BuildRenderFidelityReportInput): RenderFidelityReport {
  const checks = [
    buildDslConsumptionCheck(input.dslConsumption),
    buildAssetBindingCheck(input.assetBindingTrace),
    buildRuntimeStructureCheck(input.qaReport, input.runtimeSceneBinding),
    buildScreenshotCheck(input.qaReport),
    buildSceneSnapshotCheck(input.qaReport)
  ];
  const status = deriveStatus(checks);

  return RenderFidelityReportSchema.parse({
    reportVersion: 'render-fidelity-report.v1',
    projectId: input.projectId,
    runId: input.runId,
    status,
    requestedEffect: {
      status: status === 'FAILED' ? 'failed' : status === 'PASSED' ? 'matched' : 'degraded',
      expected: checks.map((check) => check.expected),
      observed: checks.map((check) => check.observed),
      missing: checks.filter((check) => check.status === 'fail').map((check) => check.expected),
      evidenceRefs: sortedUnique(checks.flatMap((check) => check.evidenceRefs))
    },
    sourceArtifacts: {
      qaReport: `${input.runId}.json`,
      dslConsumptionReport: input.dslConsumption === undefined ? undefined : 'dsl_consumption_report.json',
      assetBindingTraceReport: input.assetBindingTrace === undefined ? undefined : 'asset_binding_trace_report.json',
      runtimeSceneBindingReport: input.runtimeSceneBinding === undefined ? undefined : 'runtime_scene_binding_report.json'
    },
    visualEvidence: {
      visualStatus: input.qaReport.visual_status,
      screenshotRef: input.qaReport.screenshot_path === undefined ? undefined : 'qa/screenshot.png',
      metrics: input.qaReport.visual_metrics
    },
    checks
  });
}

export function summarizeRenderFidelityForQaReport(report: RenderFidelityReport): QaRenderFidelitySummary {
  return {
    status: report.status,
    reason: reasonForStatus(report),
    expected: report.requestedEffect.expected,
    observed: report.requestedEffect.observed,
    missing: report.requestedEffect.missing
  };
}

export async function writeRenderFidelityReport(path: string, report: RenderFidelityReport): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(RenderFidelityReportSchema.parse(report), null, 2)}\n`, 'utf8');
}

function buildDslConsumptionCheck(input: BuildRenderFidelityReportInput['dslConsumption']): RenderFidelityReport['checks'][number] {
  if (input === undefined) {
    return check('dsl_consumption', 'fail', 'Authoritative DSL paths are consumed.', 'dsl_consumption_report.json is unavailable.', [
      'dslConsumptionReport:dsl_consumption_report.json'
    ]);
  }

  if (input.ignoredAuthoritativeCount > 0) {
    return check(
      'dsl_consumption',
      'fail',
      'Authoritative DSL paths are consumed.',
      `DSL consumption ignored ${input.ignoredAuthoritativeCount} authoritative path(s).`,
      ['dslConsumptionReport:dsl_consumption_report.json']
    );
  }

  const coverage = input.coverageRatio === undefined ? 'available' : `${Math.round(input.coverageRatio * 10000) / 100}%`;
  return check('dsl_consumption', 'pass', 'Authoritative DSL paths are consumed.', `DSL consumption coverage ${coverage}.`, [
    'dslConsumptionReport:dsl_consumption_report.json'
  ]);
}

function buildAssetBindingCheck(input: BuildRenderFidelityReportInput['assetBindingTrace']): RenderFidelityReport['checks'][number] {
  if (input === undefined) {
    return check('asset_binding', 'fail', 'Asset binding trace is clean.', 'asset_binding_trace_report.json is unavailable.', [
      'assetBindingTraceReport:asset_binding_trace_report.json'
    ]);
  }

  if (input.status === 'fail') {
    return check('asset_binding', 'fail', 'Asset binding trace is clean.', `Asset binding trace has ${input.errorCount} error(s).`, [
      'assetBindingTraceReport:asset_binding_trace_report.json'
    ]);
  }

  if (input.status === 'warn') {
    return check('asset_binding', 'warn', 'Asset binding trace is clean.', `Asset binding trace has ${input.warningCount} warning(s).`, [
      'assetBindingTraceReport:asset_binding_trace_report.json'
    ]);
  }

  return check('asset_binding', 'pass', 'Asset binding trace is clean.', 'Asset binding trace passed.', [
    'assetBindingTraceReport:asset_binding_trace_report.json'
  ]);
}

function buildRuntimeStructureCheck(
  qaReport: QaReport,
  input: BuildRenderFidelityReportInput['runtimeSceneBinding']
): RenderFidelityReport['checks'][number] {
  if (input === undefined) {
    return check(
      'runtime_structure',
      qaReport.genre === 'side_scrolling_run_and_gun' ? 'fail' : 'skipped',
      'Runtime scene structure is bound.',
      qaReport.genre === 'side_scrolling_run_and_gun'
        ? 'runtime_scene_binding_report.json is unavailable.'
        : 'Runtime scene binding report is not required for this runtime.',
      ['runtimeSceneBindingReport:runtime_scene_binding_report.json']
    );
  }

  const observed = `Runtime scene bindings: ${input.boundCount} bound / ${input.unboundCount} unbound.`;
  return check('runtime_structure', input.status === 'fail' || input.unboundCount > 0 ? 'fail' : 'pass', 'Runtime scene structure is bound.', observed, [
    'runtimeSceneBindingReport:runtime_scene_binding_report.json'
  ]);
}

function buildScreenshotCheck(qaReport: QaReport): RenderFidelityReport['checks'][number] {
  const metrics = qaReport.visual_metrics;
  if (qaReport.visual_status !== 'PASSED' || metrics === undefined || qaReport.screenshot_path === undefined) {
    return check('screenshot', 'fail', 'QA screenshot evidence is non-blank.', 'QA screenshot evidence is missing or failed visual gate.', [
      'qaReport:qa/screenshot.png'
    ]);
  }

  return check('screenshot', 'pass', 'QA screenshot is non-blank.', `Screenshot metrics: ${formatMetrics(metrics)}.`, [
    'qaReport:qa/screenshot.png'
  ]);
}

function buildSceneSnapshotCheck(qaReport: QaReport): RenderFidelityReport['checks'][number] {
  if (qaReport.snapshot === undefined || qaReport.snapshot === null || typeof qaReport.snapshot !== 'object') {
    return check('scene_snapshot', 'fail', 'Runtime scene snapshot is captured.', 'Runtime scene snapshot is unavailable.', ['qaReport:scene_snapshot']);
  }

  return check('scene_snapshot', 'pass', 'Runtime scene snapshot is captured.', 'Runtime scene snapshot is captured.', ['qaReport:scene_snapshot']);
}

function check(
  id: RenderFidelityReport['checks'][number]['id'],
  status: RenderFidelityReport['checks'][number]['status'],
  expected: string,
  observed: string,
  evidenceRefs: string[]
): RenderFidelityReport['checks'][number] {
  return { id, status, expected, observed, evidenceRefs };
}

function deriveStatus(checks: RenderFidelityReport['checks']): RenderFidelityReport['status'] {
  if (checks.some((candidate) => candidate.status === 'fail')) {
    return 'FAILED';
  }
  if (checks.some((candidate) => candidate.status === 'warn')) {
    return 'VISUALLY_DEGRADED';
  }
  return 'PASSED';
}

function reasonForStatus(report: RenderFidelityReport): string {
  if (report.status === 'FAILED') {
    return `Render fidelity failed: ${report.requestedEffect.missing.join(' ')}`;
  }
  if (report.status === 'VISUALLY_DEGRADED') {
    return 'Render fidelity degraded by warning evidence.';
  }
  if (report.status === 'PASSED_WITH_OPTIONAL_FALLBACKS') {
    return 'Render fidelity passed with optional fallback evidence.';
  }
  return 'Render fidelity passed with requested evidence observed.';
}

function formatMetrics(metrics: QaVisualMetrics): string {
  return `nonBackground=${round(metrics.non_background_pixel_ratio)}, varied=${round(metrics.varied_pixel_ratio)}`;
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function isSafeEvidenceRef(ref: string): boolean {
  const separator = ref.indexOf(':');
  return separator > 0 && isSafeText(ref) && isSafeRelativeArtifactPath(ref.slice(separator + 1));
}

function isSafeRelativeArtifactPath(path: string): boolean {
  return (
    path.length > 0 &&
    !path.startsWith('/') &&
    !/^[A-Za-z]:\//.test(path) &&
    !/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(path) &&
    !path.includes('\\') &&
    !path.split('/').includes('..') &&
    isSafeText(path)
  );
}

function isSafeText(value: string): boolean {
  return !/authorization|api key|secret|DEEPSEEK_API_KEY|raw provider|\/Users\/|[A-Za-z]:\\/i.test(value);
}
