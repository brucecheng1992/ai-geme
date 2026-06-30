import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { z } from 'zod';

import type { PipelineArtifactIndex, PipelineArtifactRef } from './pipeline-artifact-index.js';

const PipelineAcceptanceStatusSchema = z.enum(['pass', 'warn', 'fail']);
const PipelineAcceptanceCheckStatusSchema = z.enum(['pass', 'warn', 'fail', 'skipped']);
const PipelineAcceptanceCategorySchema = z.enum(['prompt', 'dsl', 'runtime', 'assets', 'preview', 'qa', 'artifacts']);
const RenderFidelityStatusSchema = z.enum(['PASSED', 'PASSED_WITH_OPTIONAL_FALLBACKS', 'VISUALLY_DEGRADED', 'FAILED']);
const RenderFidelityEvidenceStatusSchema = z.enum(['pass', 'warn', 'fail', 'unavailable']);

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
    'dsl_consumption',
    'scene_ir',
    'required_artifacts',
    'runtime_scene_binding',
    'runtime_capability',
    'asset_intent_resolution',
    'asset_pipeline',
    'asset_library_usage',
    'asset_binding_trace',
    'preview_manifest',
    'artifact_index_consistency',
    'build_log',
    'qa_report',
    'render_fidelity_report'
  ]),
  category: PipelineAcceptanceCategorySchema,
  status: PipelineAcceptanceCheckStatusSchema,
  required: z.boolean(),
  artifactId: z.string().min(1),
  artifactPath: z.string().min(1).refine(isSafeRelativeArtifactPath, 'artifactPath must be relative and safe').nullable(),
  reason: z.string().min(1).refine(isSafeText, 'reason must not expose sensitive content'),
  evidenceRefs: z.array(z.string().min(1).refine(isSafeEvidenceRef, 'evidenceRefs must not expose unsafe paths or sensitive content'))
});

export const PipelineRenderFidelitySchema = z.strictObject({
  status: RenderFidelityStatusSchema,
  reason: z.string().min(1).refine(isSafeText, 'reason must not expose sensitive content'),
  evidenceRefs: z.array(z.string().min(1).refine(isSafeEvidenceRef, 'evidenceRefs must not expose unsafe paths or sensitive content')),
  coreRequiredFallbackCount: z.number().int().min(0),
  requestRequiredFallbackCount: z.number().int().min(0),
  optionalFallbackCount: z.number().int().min(0),
  runtimeUnboundCount: z.number().int().min(0),
  assetBindingStatus: RenderFidelityEvidenceStatusSchema,
  assetLibraryStatus: RenderFidelityEvidenceStatusSchema
});

const PipelineAcceptanceReportBaseSchema = z.strictObject({
  reportVersion: z.literal('pipeline_acceptance_report.v1'),
  projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
  runId: z.string().regex(/^run_[A-Za-z0-9_-]+$/),
  overallStatus: PipelineAcceptanceStatusSchema,
  previewable: z.boolean(),
  renderFidelity: PipelineRenderFidelitySchema,
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

  const expectedRenderFidelityStatus = deriveRenderFidelityStatus(report.renderFidelity, report.checks);
  if (report.renderFidelity.status !== expectedRenderFidelityStatus) {
    ctx.addIssue({
      code: 'custom',
      path: ['renderFidelity', 'status'],
      message: `renderFidelity.status must be derived from evidence: ${expectedRenderFidelityStatus}`
    });
  }
});

export type PipelineAcceptanceReport = z.infer<typeof PipelineAcceptanceReportSchema>;
export type PipelineAcceptanceCheck = z.infer<typeof PipelineAcceptanceCheckSchema>;
export type PipelineRenderFidelity = z.infer<typeof PipelineRenderFidelitySchema>;

type BuildPipelineAcceptanceReportInput = {
  projectId: string;
  runId: string;
  artifactIndex: PipelineArtifactIndex;
  dslValidation: {
    valid: boolean;
    sourceArtifact?: string;
  };
  dslConsumption?: {
    ignoredAuthoritativeCount?: number;
    coverageRatio?: number;
  };
  generationInput: {
    projectId: string;
    runId: string;
    source?: string;
  };
  runtimeCapability?: {
    status?: 'supported' | 'unsupported';
  };
  assetLibraryUsage?: {
    status?: 'pass' | 'warn' | 'fail';
  };
  assetIntentResolution?: {
    coreRequiredFallbackCount?: number;
    requestRequiredFallbackCount?: number;
    optionalFallbackCount?: number;
  };
  runtimeSceneBinding?: {
    status?: 'pass' | 'fail';
    unboundCount?: number;
  };
  renderFidelityQa?: {
    status?: PipelineRenderFidelity['status'];
  };
  assetBindingTrace?: {
    status?: 'pass' | 'warn' | 'fail';
  };
};

const ARTIFACT_ORDER = [
  'generationInputReport',
  'intentPlan',
  'canonicalGameBrief',
  'generationScopePlan',
  'activeProfileLock',
  'authorityBundle',
  'generationPathReceipt',
  'capabilityRegistrySnapshot',
  'generationCapabilityReadinessReport',
  'generationCapabilityResolutionReport',
  'shadowGameplayCapabilityLock',
  'generationCapabilityRuntimeReport',
  'generationCapabilityGapReport',
  'generationCapabilityCutoverReport',
  'shadowRuntimeSystemManifest',
  'shadowRuntimeLoaderReport',
  'shadowCapabilityQaPlan',
  'shadowCapabilityQaReport',
  'targetProfileRuntimeSupportReport',
  'gameDsl',
  'gameDslCandidate',
  'dslValidationReport',
  'dslConsumptionReport',
  'sceneIr',
  'sceneIrAuthorityReport',
  'sceneIrCoverageReport',
  'runtimeSceneBindingReport',
  'runtimeCapabilityReport',
  'assetIntentManifest',
  'assetPlan',
  'publicAssetManifest',
  'phaserPreviewManifest',
  'assetResolutionReport',
  'assetPipelineReport',
  'assetLibraryUsageReport',
  'assetBindingTraceReport',
  'buildLog',
  'qaReport',
  'renderFidelityReport',
  'pipelineAcceptanceReport',
  'pipelineArtifactIndex'
] as const satisfies readonly PipelineArtifactRef['id'][];

export function buildPipelineAcceptanceReport(input: BuildPipelineAcceptanceReportInput): PipelineAcceptanceReport {
  const artifacts = new Map(input.artifactIndex.artifacts.map((artifact) => [artifact.id, artifact]));
  const checks: PipelineAcceptanceCheck[] = [
    buildGenerationInputCheck(input, artifacts.get('generationInputReport')),
    buildDslValidationCheck(input, artifacts.get('dslValidationReport')),
    buildDslArtifactCheck(input, artifacts),
    buildDslConsumptionCheck(input, artifacts.get('dslConsumptionReport')),
    buildSceneIrCheck(artifacts.get('sceneIr')),
    buildRequiredArtifactsCheck(input.artifactIndex.artifacts),
    buildRuntimeSceneBindingCheck(input, artifacts.get('runtimeSceneBindingReport')),
    buildRuntimeCapabilityCheck(input, artifacts.get('runtimeCapabilityReport')),
    buildAssetIntentResolutionCheck(input, artifacts),
    buildArtifactCheck('asset_pipeline', 'assets', true, artifacts.get('assetPipelineReport')),
    buildAssetLibraryUsageCheck(input, artifacts.get('assetLibraryUsageReport')),
    buildAssetBindingTraceCheck(input, artifacts.get('assetBindingTraceReport')),
    buildPreviewManifestCheck(artifacts),
    buildArtifactIndexConsistencyCheck(input, artifacts.get('pipelineArtifactIndex'), artifacts.get('pipelineAcceptanceReport')),
    buildArtifactCheck('build_log', 'artifacts', false, artifacts.get('buildLog')),
    buildArtifactCheck('qa_report', 'qa', false, artifacts.get('qaReport')),
    buildRenderFidelityReportCheck(input, artifacts.get('renderFidelityReport'))
  ];
  const report = {
    reportVersion: 'pipeline_acceptance_report.v1',
    projectId: input.projectId,
    runId: input.runId,
    overallStatus: deriveOverallStatus(checks),
    previewable: derivePreviewable(checks),
    renderFidelity: buildRenderFidelity(input, checks),
    checkedArtifacts: buildCheckedArtifacts(input.artifactIndex.artifacts),
    checks,
    errors: checks
      .filter((check) => check.required && (check.status === 'fail' || check.status === 'skipped'))
      .map((check) => `${check.id}: ${check.reason}`),
    warnings: checks.filter((check) => check.status === 'warn').map((check) => `${check.id}: ${check.reason}`)
  };

  return PipelineAcceptanceReportSchema.parse(report);
}

function buildRuntimeCapabilityCheck(input: BuildPipelineAcceptanceReportInput, artifact: PipelineArtifactRef | undefined): PipelineAcceptanceCheck {
  const artifactCheck = buildArtifactCheck('runtime_capability', 'runtime', true, artifact);
  if (artifactCheck.status !== 'pass') {
    return artifactCheck;
  }

  if (input.runtimeCapability?.status === 'supported') {
    return {
      ...artifactCheck,
      reason: 'runtime_capability_report.json status is supported.'
    };
  }

  if (input.runtimeCapability?.status === 'unsupported') {
    return {
      ...artifactCheck,
      status: 'fail',
      reason: 'runtime_capability_report.json status is unsupported.'
    };
  }

  return {
    ...artifactCheck,
    status: 'fail',
    reason: 'runtime_capability_report.json status is unavailable.'
  };
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

function buildAssetIntentResolutionCheck(input: BuildPipelineAcceptanceReportInput, artifacts: Map<string, PipelineArtifactRef>): PipelineAcceptanceCheck {
  const intentArtifact = artifacts.get('assetIntentManifest');
  const resolutionArtifact = artifacts.get('assetResolutionReport');
  const artifactCheck = buildArtifactCheck('asset_intent_resolution', 'assets', true, intentArtifact);
  const evidenceRefs = [intentArtifact, resolutionArtifact].filter((artifact): artifact is PipelineArtifactRef => artifact !== undefined).map(toEvidenceRef);

  if (artifactCheck.status !== 'pass') {
    return { ...artifactCheck, evidenceRefs };
  }

  if (resolutionArtifact?.status !== 'present') {
    return {
      id: 'asset_intent_resolution',
      category: 'assets',
      status: resolutionArtifact?.status === 'skipped' ? 'skipped' : 'fail',
      required: true,
      artifactId: 'assetResolutionReport',
      artifactPath: resolutionArtifact?.path ?? intentArtifact?.path ?? null,
      reason: resolutionArtifact?.reason ?? 'asset_resolution_report.json is unavailable for asset intent resolution.',
      evidenceRefs
    };
  }

  if (
    input.assetIntentResolution?.coreRequiredFallbackCount === undefined ||
    input.assetIntentResolution.requestRequiredFallbackCount === undefined ||
    input.assetIntentResolution.optionalFallbackCount === undefined
  ) {
    return {
      ...artifactCheck,
      status: 'fail',
      reason: 'asset_intent_manifest.json fallback summary is unavailable.',
      evidenceRefs
    };
  }

  const blockingFallbacks =
    input.assetIntentResolution.coreRequiredFallbackCount + input.assetIntentResolution.requestRequiredFallbackCount;
  if (blockingFallbacks > 0) {
    return {
      ...artifactCheck,
      status: 'fail',
      reason: `asset_intent_manifest.json has ${blockingFallbacks} core/request-required fallback asset(s).`,
      evidenceRefs
    };
  }

  return {
    ...artifactCheck,
    reason: 'asset_intent_manifest.json has no core/request-required fallback assets.',
    evidenceRefs
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

function buildRenderFidelityReportCheck(input: BuildPipelineAcceptanceReportInput, artifact: PipelineArtifactRef | undefined): PipelineAcceptanceCheck {
  const artifactCheck = buildArtifactCheck('render_fidelity_report', 'qa', false, artifact);
  if (artifactCheck.status !== 'pass') {
    return {
      ...artifactCheck,
      status: 'fail',
      reason: 'render_fidelity_report.json status is unavailable.'
    };
  }

  if (input.renderFidelityQa?.status === undefined) {
    return {
      ...artifactCheck,
      status: 'fail',
      reason: 'render_fidelity_report.json status is unavailable.'
    };
  }

  if (input.renderFidelityQa.status === 'FAILED') {
    return {
      ...artifactCheck,
      status: 'fail',
      reason: 'render_fidelity_report.json status is FAILED.'
    };
  }

  if (input.renderFidelityQa.status === 'VISUALLY_DEGRADED' || input.renderFidelityQa.status === 'PASSED_WITH_OPTIONAL_FALLBACKS') {
    return {
      ...artifactCheck,
      status: 'warn',
      reason: `render_fidelity_report.json status is ${input.renderFidelityQa.status}.`
    };
  }

  return {
    ...artifactCheck,
    reason: 'render_fidelity_report.json status is PASSED.'
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

function buildDslConsumptionCheck(input: BuildPipelineAcceptanceReportInput, artifact: PipelineArtifactRef | undefined): PipelineAcceptanceCheck {
  const artifactCheck = buildArtifactCheck('dsl_consumption', 'dsl', true, artifact);
  if (artifactCheck.status !== 'pass') {
    return artifactCheck;
  }

  if (input.dslConsumption?.ignoredAuthoritativeCount === undefined) {
    return {
      ...artifactCheck,
      status: 'fail',
      reason: 'dsl_consumption_report.json summary is unavailable.'
    };
  }

  if (input.dslConsumption.ignoredAuthoritativeCount > 0) {
    return {
      ...artifactCheck,
      status: 'fail',
      reason: `dsl_consumption_report.json has ${input.dslConsumption.ignoredAuthoritativeCount} ignored authoritative path(s).`
    };
  }

  const coverage =
    input.dslConsumption.coverageRatio === undefined ? 'available' : `${Math.round(input.dslConsumption.coverageRatio * 10000) / 100}%`;
  return {
    ...artifactCheck,
    reason: `dsl_consumption_report.json has no ignored authoritative paths; coverage ${coverage}.`
  };
}

function buildSceneIrCheck(artifact: PipelineArtifactRef | undefined): PipelineAcceptanceCheck {
  return buildArtifactCheck('scene_ir', 'runtime', artifact?.required === true, artifact);
}

function buildRequiredArtifactsCheck(artifacts: PipelineArtifactRef[]): PipelineAcceptanceCheck {
  const requiredArtifacts = sortArtifactsForAcceptance(artifacts.filter((artifact) => artifact.required));
  const unresolved = requiredArtifacts.filter((artifact) => artifact.status !== 'present');
  const evidenceRefs = requiredArtifacts.map(toEvidenceRef);

  if (unresolved.length > 0) {
    return {
      id: 'required_artifacts',
      category: 'artifacts',
      status: 'fail',
      required: true,
      artifactId: 'pipelineArtifactIndex',
      artifactPath: 'pipeline_artifact_index.json',
      reason: `pipeline_artifact_index has ${unresolved.length} required artifact ref(s) not present: ${unresolved.map((artifact) => artifact.id).join(', ')}.`,
      evidenceRefs
    };
  }

  return {
    id: 'required_artifacts',
    category: 'artifacts',
    status: 'pass',
    required: true,
    artifactId: 'pipelineArtifactIndex',
    artifactPath: 'pipeline_artifact_index.json',
    reason: 'pipeline_artifact_index has all required artifact refs present.',
    evidenceRefs
  };
}

function buildRuntimeSceneBindingCheck(input: BuildPipelineAcceptanceReportInput, artifact: PipelineArtifactRef | undefined): PipelineAcceptanceCheck {
  const artifactCheck = buildArtifactCheck('runtime_scene_binding', 'runtime', artifact?.required === true, artifact);
  if (artifactCheck.status !== 'pass') {
    return artifactCheck;
  }

  if (input.runtimeSceneBinding?.status === undefined || input.runtimeSceneBinding.unboundCount === undefined) {
    return {
      ...artifactCheck,
      status: 'fail',
      reason: 'runtime_scene_binding_report.json status is unavailable.'
    };
  }

  if (input.runtimeSceneBinding.status === 'fail' || input.runtimeSceneBinding.unboundCount > 0) {
    return {
      ...artifactCheck,
      status: 'fail',
      reason: `runtime_scene_binding_report.json has ${input.runtimeSceneBinding.unboundCount} unbound scene node(s).`
    };
  }

  return {
    ...artifactCheck,
    reason: 'runtime_scene_binding_report.json has no unbound scene nodes.'
  };
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

function sortArtifactsForAcceptance(artifacts: PipelineArtifactRef[]): PipelineArtifactRef[] {
  return [...artifacts].sort((left, right) => artifactOrderRank(left.id) - artifactOrderRank(right.id) || left.id.localeCompare(right.id));
}

function artifactOrderRank(id: PipelineArtifactRef['id']): number {
  const index = ARTIFACT_ORDER.findIndex((candidate) => candidate === id);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
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

function buildRenderFidelity(input: BuildPipelineAcceptanceReportInput, checks: PipelineAcceptanceCheck[]): PipelineRenderFidelity {
  const evidence = {
    coreRequiredFallbackCount: input.assetIntentResolution?.coreRequiredFallbackCount ?? 0,
    requestRequiredFallbackCount: input.assetIntentResolution?.requestRequiredFallbackCount ?? 0,
    optionalFallbackCount: input.assetIntentResolution?.optionalFallbackCount ?? 0,
    runtimeUnboundCount: input.runtimeSceneBinding?.unboundCount ?? 0,
    assetBindingStatus: toRenderFidelityEvidenceStatus(input.assetBindingTrace?.status),
    assetLibraryStatus: toRenderFidelityEvidenceStatus(input.assetLibraryUsage?.status)
  } satisfies Omit<PipelineRenderFidelity, 'status' | 'reason' | 'evidenceRefs'>;

  const status = deriveRenderFidelityStatus(evidence, checks);
  return {
    status,
    reason: reasonForRenderFidelityStatus(status, evidence, checks),
    evidenceRefs: renderFidelityEvidenceRefs(checks),
    ...evidence
  };
}

function deriveRenderFidelityStatus(
  evidence: Pick<
    PipelineRenderFidelity,
    | 'coreRequiredFallbackCount'
    | 'requestRequiredFallbackCount'
    | 'optionalFallbackCount'
    | 'runtimeUnboundCount'
    | 'assetBindingStatus'
    | 'assetLibraryStatus'
  >,
  checks: PipelineAcceptanceCheck[]
): PipelineRenderFidelity['status'] {
  if (
    evidence.coreRequiredFallbackCount > 0 ||
    evidence.requestRequiredFallbackCount > 0 ||
    evidence.runtimeUnboundCount > 0 ||
    evidence.assetBindingStatus === 'fail' ||
    evidence.assetBindingStatus === 'unavailable' ||
    evidence.assetLibraryStatus === 'fail' ||
    evidence.assetLibraryStatus === 'unavailable' ||
    checks.some((check) => isRenderFidelityCheck(check.id) && check.required && (check.status === 'fail' || check.status === 'skipped')) ||
    checks.some((check) => check.id === 'render_fidelity_report' && check.status === 'fail')
  ) {
    return 'FAILED';
  }

  if (
    evidence.assetBindingStatus === 'warn' ||
    evidence.assetLibraryStatus === 'warn' ||
    checks.some((check) => check.id === 'render_fidelity_report' && check.status === 'warn')
  ) {
    return 'VISUALLY_DEGRADED';
  }

  if (evidence.optionalFallbackCount > 0) {
    return 'PASSED_WITH_OPTIONAL_FALLBACKS';
  }

  return 'PASSED';
}

function reasonForRenderFidelityStatus(
  status: PipelineRenderFidelity['status'],
  evidence: Pick<
    PipelineRenderFidelity,
    | 'coreRequiredFallbackCount'
    | 'requestRequiredFallbackCount'
    | 'optionalFallbackCount'
    | 'runtimeUnboundCount'
    | 'assetBindingStatus'
      | 'assetLibraryStatus'
  >,
  checks: PipelineAcceptanceCheck[]
): string {
  if (status === 'FAILED') {
    const renderFidelityCheck = checks.find((check) => check.id === 'render_fidelity_report' && check.status === 'fail');
    if (renderFidelityCheck !== undefined) {
      return `Render fidelity failed: ${renderFidelityCheck.reason}`;
    }
    return `Render fidelity failed: core=${evidence.coreRequiredFallbackCount}, request=${evidence.requestRequiredFallbackCount}, runtimeUnbound=${evidence.runtimeUnboundCount}, assetBinding=${evidence.assetBindingStatus}, assetLibrary=${evidence.assetLibraryStatus}.`;
  }
  if (status === 'VISUALLY_DEGRADED') {
    return `Render fidelity degraded: assetBinding=${evidence.assetBindingStatus}, assetLibrary=${evidence.assetLibraryStatus}.`;
  }
  if (status === 'PASSED_WITH_OPTIONAL_FALLBACKS') {
    return `Render fidelity passed with ${evidence.optionalFallbackCount} optional fallback asset(s).`;
  }
  return 'Render fidelity passed with required assets and runtime bindings intact.';
}

function toRenderFidelityEvidenceStatus(status: 'pass' | 'warn' | 'fail' | undefined): PipelineRenderFidelity['assetBindingStatus'] {
  return status ?? 'unavailable';
}

function renderFidelityEvidenceRefs(checks: PipelineAcceptanceCheck[]): string[] {
  return checks
    .filter((check) => isRenderFidelityCheck(check.id))
    .flatMap((check) => check.evidenceRefs);
}

function isRenderFidelityCheck(id: PipelineAcceptanceCheck['id']): boolean {
  return (
    id === 'scene_ir' ||
    id === 'runtime_scene_binding' ||
    id === 'asset_intent_resolution' ||
    id === 'asset_pipeline' ||
    id === 'asset_library_usage' ||
    id === 'asset_binding_trace' ||
    id === 'preview_manifest' ||
    id === 'render_fidelity_report'
  );
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
