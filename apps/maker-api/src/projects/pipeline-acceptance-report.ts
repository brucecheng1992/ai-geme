import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { z } from 'zod';

import type { PipelineArtifactIndex, PipelineArtifactRef } from './pipeline-artifact-index.js';

const PipelineAcceptanceStatusSchema = z.enum(['pass', 'warn', 'fail']);
const PipelineAcceptanceCheckStatusSchema = z.enum(['pass', 'warn', 'fail', 'skipped']);
const PipelineAcceptanceCategorySchema = z.enum(['prompt', 'dsl', 'runtime', 'assets', 'preview', 'qa', 'artifacts']);

export const PipelineAcceptanceCheckedArtifactSchema = z.strictObject({
  artifactId: z.string().min(1),
  artifactPath: z.string().min(1).refine(isSafeRelativeArtifactPath, 'artifactPath must be relative and safe').nullable(),
  status: z.string().min(1).refine(isSafeText, 'status must not expose sensitive content'),
  required: z.boolean()
});

export const PipelineAcceptanceCheckSchema = z.strictObject({
  id: z.enum([
    'generation_input',
    'dsl_validation',
    'dsl_artifact',
    'runtime_capability',
    'asset_pipeline',
    'asset_library_usage',
    'asset_binding_trace',
    'preview_manifest',
    'artifact_index_consistency',
    'build_log',
    'qa_report'
  ]),
  category: PipelineAcceptanceCategorySchema,
  status: PipelineAcceptanceCheckStatusSchema,
  required: z.boolean(),
  artifactId: z.string().min(1),
  artifactPath: z.string().min(1).refine(isSafeRelativeArtifactPath, 'artifactPath must be relative and safe').nullable(),
  reason: z.string().min(1).refine(isSafeText, 'reason must not expose sensitive content'),
  evidenceRefs: z.array(z.string().min(1).refine(isSafeEvidenceRef, 'evidenceRefs must not expose unsafe paths or sensitive content'))
});

const PipelineAcceptanceReportBaseSchema = z.strictObject({
  reportVersion: z.literal('pipeline_acceptance_report.v1'),
  projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
  runId: z.string().regex(/^run_[A-Za-z0-9_-]+$/),
  overallStatus: PipelineAcceptanceStatusSchema,
  previewable: z.boolean(),
  checkedArtifacts: z.array(PipelineAcceptanceCheckedArtifactSchema),
  checks: z.array(PipelineAcceptanceCheckSchema),
  errors: z.array(z.string().min(1).refine(isSafeText, 'errors must not expose sensitive content')),
  warnings: z.array(z.string().min(1).refine(isSafeText, 'warnings must not expose sensitive content'))
});

export const PipelineAcceptanceReportSchema = PipelineAcceptanceReportBaseSchema.superRefine((report, ctx) => {
  const expectedOverallStatus = deriveOverallStatus(report.checks);
  if (report.overallStatus !== expectedOverallStatus) {
    ctx.addIssue({
      code: 'custom',
      path: ['overallStatus'],
      message: `overallStatus must be derived from checks: ${expectedOverallStatus}`
    });
  }

  const expectedPreviewable = derivePreviewable(report.checks);
  if (report.previewable !== expectedPreviewable) {
    ctx.addIssue({
      code: 'custom',
      path: ['previewable'],
      message: `previewable must be derived from required checks: ${String(expectedPreviewable)}`
    });
  }
});

export type PipelineAcceptanceReport = z.infer<typeof PipelineAcceptanceReportSchema>;
export type PipelineAcceptanceCheck = z.infer<typeof PipelineAcceptanceCheckSchema>;

type BuildPipelineAcceptanceReportInput = {
  projectId: string;
  runId: string;
  artifactIndex: PipelineArtifactIndex;
  dslValidation: {
    valid: boolean;
    sourceArtifact?: string;
  };
  generationInput: {
    projectId: string;
    runId: string;
    source?: string;
  };
  assetLibraryUsage?: {
    status?: 'pass' | 'warn' | 'fail';
  };
  assetBindingTrace?: {
    status?: 'pass' | 'warn' | 'fail';
  };
};

const ARTIFACT_ORDER = [
  'generationInputReport',
  'gameDsl',
  'gameDslCandidate',
  'dslValidationReport',
  'runtimeCapabilityReport',
  'assetPlan',
  'publicAssetManifest',
  'phaserPreviewManifest',
  'assetResolutionReport',
  'assetPipelineReport',
  'assetLibraryUsageReport',
  'assetBindingTraceReport',
  'buildLog',
  'qaReport',
  'pipelineAcceptanceReport',
  'pipelineArtifactIndex'
] as const satisfies readonly PipelineArtifactRef['id'][];

export function buildPipelineAcceptanceReport(input: BuildPipelineAcceptanceReportInput): PipelineAcceptanceReport {
  const artifacts = new Map(input.artifactIndex.artifacts.map((artifact) => [artifact.id, artifact]));
  const checks: PipelineAcceptanceCheck[] = [
    buildGenerationInputCheck(input, artifacts.get('generationInputReport')),
    buildDslValidationCheck(input, artifacts.get('dslValidationReport')),
    buildDslArtifactCheck(input, artifacts),
    buildArtifactCheck('runtime_capability', 'runtime', true, artifacts.get('runtimeCapabilityReport')),
    buildArtifactCheck('asset_pipeline', 'assets', true, artifacts.get('assetPipelineReport')),
    buildAssetLibraryUsageCheck(input, artifacts.get('assetLibraryUsageReport')),
    buildAssetBindingTraceCheck(input, artifacts.get('assetBindingTraceReport')),
    buildPreviewManifestCheck(artifacts),
    buildArtifactIndexConsistencyCheck(input, artifacts.get('pipelineArtifactIndex'), artifacts.get('pipelineAcceptanceReport')),
    buildArtifactCheck('build_log', 'artifacts', false, artifacts.get('buildLog')),
    buildArtifactCheck('qa_report', 'qa', false, artifacts.get('qaReport'))
  ];
  const report = {
    reportVersion: 'pipeline_acceptance_report.v1',
    projectId: input.projectId,
    runId: input.runId,
    overallStatus: deriveOverallStatus(checks),
    previewable: derivePreviewable(checks),
    checkedArtifacts: buildCheckedArtifacts(input.artifactIndex.artifacts),
    checks,
    errors: checks
      .filter((check) => check.required && (check.status === 'fail' || check.status === 'skipped'))
      .map((check) => `${check.id}: ${check.reason}`),
    warnings: checks.filter((check) => check.status === 'warn').map((check) => `${check.id}: ${check.reason}`)
  };

  return PipelineAcceptanceReportSchema.parse(report);
}

function buildAssetBindingTraceCheck(input: BuildPipelineAcceptanceReportInput, artifact: PipelineArtifactRef | undefined): PipelineAcceptanceCheck {
  const artifactCheck = buildArtifactCheck('asset_binding_trace', 'assets', true, artifact);
  if (artifactCheck.status !== 'pass') {
    return artifactCheck;
  }

  if (input.assetBindingTrace?.status === undefined) {
    return {
      ...artifactCheck,
      status: 'fail',
      reason: 'asset_binding_trace_report.json status is unavailable.'
    };
  }

  if (input.assetBindingTrace.status === 'fail') {
    return {
      ...artifactCheck,
      status: 'fail',
      reason: 'asset_binding_trace_report.json status is fail.'
    };
  }

  if (input.assetBindingTrace.status === 'warn') {
    return {
      ...artifactCheck,
      status: 'warn',
      reason: 'asset_binding_trace_report.json status is warn.'
    };
  }

  return {
    ...artifactCheck,
    reason: 'asset_binding_trace_report.json status is pass.'
  };
}

function buildAssetLibraryUsageCheck(input: BuildPipelineAcceptanceReportInput, artifact: PipelineArtifactRef | undefined): PipelineAcceptanceCheck {
  const artifactCheck = buildArtifactCheck('asset_library_usage', 'assets', true, artifact);
  if (artifactCheck.status !== 'pass') {
    return artifactCheck;
  }

  if (input.assetLibraryUsage?.status === undefined) {
    return {
      ...artifactCheck,
      status: 'fail',
      reason: 'asset_library_usage_report.json status is unavailable.'
    };
  }

  if (input.assetLibraryUsage?.status === 'fail') {
    return {
      ...artifactCheck,
      status: 'fail',
      reason: 'asset_library_usage_report.json status is fail.'
    };
  }

  if (input.assetLibraryUsage?.status === 'warn') {
    return {
      ...artifactCheck,
      status: 'warn',
      reason: 'asset_library_usage_report.json status is warn.'
    };
  }

  return {
    ...artifactCheck,
    reason: 'asset_library_usage_report.json status is pass.'
  };
}

export async function writePipelineAcceptanceReport(path: string, report: PipelineAcceptanceReport): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(PipelineAcceptanceReportSchema.parse(report), null, 2)}\n`, 'utf8');
}

function buildGenerationInputCheck(input: BuildPipelineAcceptanceReportInput, artifact: PipelineArtifactRef | undefined): PipelineAcceptanceCheck {
  const artifactCheck = buildArtifactCheck('generation_input', 'prompt', true, artifact);
  if (artifactCheck.status !== 'pass') {
    return artifactCheck;
  }

  if (input.generationInput.projectId !== input.projectId || input.generationInput.runId !== input.runId) {
    return {
      ...artifactCheck,
      status: 'fail',
      reason: 'generation_input_report identity does not match the current project and run.'
    };
  }

  return {
    ...artifactCheck,
    reason: 'generation_input_report identity matches the current project and run.'
  };
}

function buildDslValidationCheck(input: BuildPipelineAcceptanceReportInput, artifact: PipelineArtifactRef | undefined): PipelineAcceptanceCheck {
  const artifactCheck = buildArtifactCheck('dsl_validation', 'dsl', true, artifact);
  if (artifactCheck.status !== 'pass') {
    return artifactCheck;
  }

  return input.dslValidation.valid
    ? { ...artifactCheck, reason: 'DSL validation report is valid.' }
    : { ...artifactCheck, status: 'fail', reason: 'DSL validation report is invalid.' };
}

function buildDslArtifactCheck(input: BuildPipelineAcceptanceReportInput, artifacts: Map<string, PipelineArtifactRef>): PipelineAcceptanceCheck {
  const artifactId = input.dslValidation.sourceArtifact === 'game_dsl.candidate.json' ? 'gameDslCandidate' : 'gameDsl';
  const artifactCheck = buildArtifactCheck('dsl_artifact', 'dsl', true, artifacts.get(artifactId));
  if (artifactCheck.status !== 'pass') {
    return artifactCheck;
  }

  return input.dslValidation.valid
    ? { ...artifactCheck, reason: 'Validated Game DSL artifact is present.' }
    : { ...artifactCheck, status: 'fail', reason: `DSL validation failed for ${artifactCheck.artifactPath}.` };
}

function buildPreviewManifestCheck(artifacts: Map<string, PipelineArtifactRef>): PipelineAcceptanceCheck {
  const publicManifest = artifacts.get('publicAssetManifest');
  const previewManifest = artifacts.get('phaserPreviewManifest');
  const evidenceRefs = [publicManifest, previewManifest].filter((artifact): artifact is PipelineArtifactRef => artifact !== undefined).map(toEvidenceRef);
  const artifactPath = previewManifest?.path ?? publicManifest?.path ?? null;
  const skippedReason = previewManifest?.status === 'skipped' ? previewManifest.reason : publicManifest?.status === 'skipped' ? publicManifest.reason : undefined;

  if (skippedReason !== undefined) {
    return {
      id: 'preview_manifest',
      category: 'preview',
      status: 'skipped',
      required: true,
      artifactId: 'phaserPreviewManifest',
      artifactPath,
      reason: skippedReason,
      evidenceRefs
    };
  }

  if (publicManifest?.status === 'present' && previewManifest?.status === 'present') {
    return {
      id: 'preview_manifest',
      category: 'preview',
      status: 'pass',
      required: true,
      artifactId: 'phaserPreviewManifest',
      artifactPath,
      reason: 'Public AssetManifest and Phaser preview manifest refs are present.',
      evidenceRefs
    };
  }

  return {
    id: 'preview_manifest',
    category: 'preview',
    status: 'fail',
    required: true,
    artifactId: 'phaserPreviewManifest',
    artifactPath,
    reason: 'Preview manifest refs are missing.',
    evidenceRefs
  };
}

function buildArtifactIndexConsistencyCheck(
  input: BuildPipelineAcceptanceReportInput,
  indexArtifact: PipelineArtifactRef | undefined,
  acceptanceArtifact: PipelineArtifactRef | undefined
): PipelineAcceptanceCheck {
  const artifactCheck = buildArtifactCheck('artifact_index_consistency', 'artifacts', true, indexArtifact);
  if (artifactCheck.status !== 'pass') {
    return artifactCheck;
  }

  if (input.artifactIndex.projectId !== input.projectId || input.artifactIndex.runId !== input.runId) {
    return {
      ...artifactCheck,
      status: 'fail',
      reason: 'pipeline_artifact_index identity does not match the current project and run.'
    };
  }

  if (acceptanceArtifact?.status !== 'present' || acceptanceArtifact.path !== 'pipeline_acceptance_report.json') {
    return {
      ...artifactCheck,
      status: 'fail',
      reason: 'pipeline_artifact_index is missing the pipeline_acceptance_report.json ref.'
    };
  }

  return {
    ...artifactCheck,
    reason: 'Pipeline artifact index matches the current project and run.'
  };
}

function buildArtifactCheck(
  id: PipelineAcceptanceCheck['id'],
  category: PipelineAcceptanceCheck['category'],
  required: boolean,
  artifact: PipelineArtifactRef | undefined
): PipelineAcceptanceCheck {
  if (artifact === undefined) {
    return {
      id,
      category,
      status: required ? 'fail' : 'skipped',
      required,
      artifactId: id,
      artifactPath: null,
      reason: `${id} artifact ref is missing.`,
      evidenceRefs: []
    };
  }

  if (artifact.status === 'present') {
    return {
      id,
      category,
      status: 'pass',
      required,
      artifactId: artifact.id,
      artifactPath: artifact.path,
      reason: `${artifact.id} artifact ref is present.`,
      evidenceRefs: [toEvidenceRef(artifact)]
    };
  }

  if (artifact.status === 'skipped') {
    return {
      id,
      category,
      status: required ? 'skipped' : 'skipped',
      required,
      artifactId: artifact.id,
      artifactPath: artifact.path,
      reason: artifact.reason ?? `${artifact.id} artifact ref is skipped.`,
      evidenceRefs: [toEvidenceRef(artifact)]
    };
  }

  return {
    id,
    category,
    status: required ? 'fail' : 'skipped',
    required,
    artifactId: artifact.id,
    artifactPath: artifact.path,
    reason: artifact.reason ?? `${artifact.id} artifact ref is missing.`,
    evidenceRefs: [toEvidenceRef(artifact)]
  };
}

function buildCheckedArtifacts(artifacts: PipelineArtifactRef[]): PipelineAcceptanceReport['checkedArtifacts'] {
  const byId = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  return ARTIFACT_ORDER.flatMap((id) => {
    const artifact = byId.get(id);
    return artifact === undefined
      ? []
      : [
          {
            artifactId: artifact.id,
            artifactPath: artifact.path,
            status: artifact.status,
            required: artifact.required
          }
        ];
  });
}

function deriveOverallStatus(checks: PipelineAcceptanceCheck[]): PipelineAcceptanceReport['overallStatus'] {
  if (checks.some((check) => check.required && (check.status === 'fail' || check.status === 'skipped'))) {
    return 'fail';
  }
  if (checks.some((check) => check.status === 'warn')) {
    return 'warn';
  }
  return 'pass';
}

function derivePreviewable(checks: PipelineAcceptanceCheck[]): boolean {
  return checks.filter((check) => check.required).every((check) => check.status === 'pass' || check.status === 'warn');
}

function toEvidenceRef(artifact: PipelineArtifactRef): string {
  return `${artifact.id}:${artifact.path}`;
}

function isSafeEvidenceRef(ref: string): boolean {
  const separator = ref.indexOf(':');
  if (separator <= 0) {
    return false;
  }

  return isSafeText(ref) && isSafeRelativeArtifactPath(ref.slice(separator + 1));
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
