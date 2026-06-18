import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { z } from 'zod';

const PipelineArtifactStatusSchema = z.enum(['present', 'missing', 'skipped']);
const PipelineArtifactRootSchema = z.enum(['model-output', 'generated-project', 'qa-report', 'build-log']);

export const PipelineArtifactRefSchema = z.strictObject({
  id: z.enum([
    'gameDsl',
    'intentPlan',
    'generationInputReport',
    'gameDslCandidate',
    'dslValidationReport',
    'dslConsumptionReport',
    'sceneIr',
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
    'semanticExtractionTraceReport',
    'semanticModelReport',
    'buildLog',
    'qaReport',
    'renderFidelityReport',
    'pipelineAcceptanceReport',
    'pipelineArtifactIndex'
  ]),
  role: z.enum(['dsl', 'prompt', 'validation', 'runtime', 'asset', 'preview', 'qa', 'build', 'index']),
  artifactRoot: PipelineArtifactRootSchema,
  path: z.string().min(1).refine(isSafeRelativeArtifactPath, 'artifact path must be relative and stay inside its artifact root'),
  status: PipelineArtifactStatusSchema,
  required: z.boolean(),
  producedBy: z.enum([
    'generation',
    'dsl-consumption',
    'compiler',
    'asset-pipeline',
    'asset-binding-trace',
    'runtime-capability',
    'runtime-scene-binding',
    'build',
    'qa',
    'pipeline-acceptance',
    'pipeline-artifact-index'
  ]),
  format: z.enum(['json', 'log']),
  reason: z.string().min(1).optional()
});

export const PipelineArtifactIndexSchema = z.strictObject({
  indexVersion: z.literal('pipeline-artifact-index-v0.1'),
  projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
  runId: z.string().regex(/^run_[A-Za-z0-9_-]+$/),
  artifacts: z.array(PipelineArtifactRefSchema)
});

export type PipelineArtifactRef = z.infer<typeof PipelineArtifactRefSchema>;
export type PipelineArtifactIndex = z.infer<typeof PipelineArtifactIndexSchema>;

type ArtifactStatus = PipelineArtifactRef['status'];

type ArtifactInput = {
  id: PipelineArtifactRef['id'];
  role: PipelineArtifactRef['role'];
  artifactRoot: PipelineArtifactRef['artifactRoot'];
  path: string;
  status: ArtifactStatus;
  required: boolean;
  producedBy: PipelineArtifactRef['producedBy'];
  format: PipelineArtifactRef['format'];
  reason?: string;
};

const GENERATED_ARTIFACTS = {
  assetIntentManifest: 'asset_intent_manifest.json',
  assetPlan: 'asset_plan.json',
  publicAssetManifest: 'public/asset_manifest.json',
  assetResolutionReport: 'asset_resolution_report.json',
  assetPipelineReport: 'asset_pipeline_report.json',
  assetLibraryUsageReport: 'asset_library_usage_report.json',
  assetBindingTraceReport: 'asset_binding_trace_report.json',
  sceneIr: 'game.scene.ir.json',
  runtimeSceneBindingReport: 'runtime_scene_binding_report.json',
  semanticExtractionTraceReport: 'semantic_extraction_trace_report.json',
  semanticModelReport: 'semantic_model_report.json'
} as const;

export function buildValidPipelineArtifactIndex(input: {
  projectId: string;
  runId: string;
  compileFiles: string[];
  buildLogPresent?: boolean;
  qaReportPresent?: boolean;
  renderFidelityReportPresent?: boolean;
}): PipelineArtifactIndex {
  const compileFiles = new Set(input.compileFiles);
  const sideScrollingCompile = input.compileFiles.some((file) => file.startsWith('side_scrolling_run_and_gun/'));
  const previewManifest = input.compileFiles
    .filter((file) => /^(collector|dodger|shooter|side_scrolling_run_and_gun)\/src\/asset-manifest\.generated\.json$/.test(file))
    .sort((left, right) => left.localeCompare(right))[0];

  return parseIndex(input.projectId, input.runId, [
    artifact('generationInputReport', 'prompt', 'model-output', 'generation_input_report.json', 'present', true, 'generation', 'json'),
    artifact('intentPlan', 'prompt', 'model-output', 'intent_plan.json', 'present', true, 'generation', 'json'),
    artifact('gameDsl', 'dsl', 'model-output', 'game_dsl.json', 'present', true, 'generation', 'json'),
    artifact('gameDslCandidate', 'dsl', 'model-output', 'game_dsl.candidate.json', 'skipped', false, 'generation', 'json', 'valid_dsl_path_uses_game_dsl_json'),
    artifact('dslValidationReport', 'validation', 'model-output', 'dsl_validation_report.json', 'present', true, 'generation', 'json'),
    artifact('dslConsumptionReport', 'validation', 'model-output', 'dsl_consumption_report.json', 'present', true, 'dsl-consumption', 'json'),
    artifact(
      'sceneIr',
      'runtime',
      'generated-project',
      GENERATED_ARTIFACTS.sceneIr,
      sideScrollingCompile ? (compileFiles.has(GENERATED_ARTIFACTS.sceneIr) ? 'present' : 'missing') : 'skipped',
      sideScrollingCompile,
      'compiler',
      'json',
      sideScrollingCompile
        ? compileFiles.has(GENERATED_ARTIFACTS.sceneIr)
          ? undefined
          : 'compile_files_missing_sceneIr'
        : 'scene_ir_currently_side_scrolling_only'
    ),
    artifact(
      'runtimeSceneBindingReport',
      'runtime',
      'generated-project',
      GENERATED_ARTIFACTS.runtimeSceneBindingReport,
      sideScrollingCompile ? (compileFiles.has(GENERATED_ARTIFACTS.runtimeSceneBindingReport) ? 'present' : 'missing') : 'skipped',
      sideScrollingCompile,
      'runtime-scene-binding',
      'json',
      sideScrollingCompile
        ? compileFiles.has(GENERATED_ARTIFACTS.runtimeSceneBindingReport)
          ? undefined
          : 'compile_files_missing_runtimeSceneBindingReport'
        : 'runtime_scene_binding_currently_side_scrolling_only'
    ),
    artifact('runtimeCapabilityReport', 'runtime', 'model-output', 'runtime_capability_report.json', 'present', true, 'runtime-capability', 'json'),
    generatedArtifact('assetIntentManifest', GENERATED_ARTIFACTS.assetIntentManifest, compileFiles.has(GENERATED_ARTIFACTS.assetIntentManifest)),
    generatedArtifact('assetPlan', GENERATED_ARTIFACTS.assetPlan, compileFiles.has(GENERATED_ARTIFACTS.assetPlan)),
    generatedArtifact('publicAssetManifest', GENERATED_ARTIFACTS.publicAssetManifest, compileFiles.has(GENERATED_ARTIFACTS.publicAssetManifest)),
    artifact(
      'phaserPreviewManifest',
      'preview',
      'generated-project',
      previewManifest ?? 'shooter/src/asset-manifest.generated.json',
      previewManifest === undefined ? 'missing' : 'present',
      true,
      'compiler',
      'json',
      previewManifest === undefined ? 'compile_files_missing_phaser_preview_manifest' : undefined
    ),
    generatedArtifact('assetResolutionReport', GENERATED_ARTIFACTS.assetResolutionReport, compileFiles.has(GENERATED_ARTIFACTS.assetResolutionReport)),
    generatedArtifact('assetPipelineReport', GENERATED_ARTIFACTS.assetPipelineReport, compileFiles.has(GENERATED_ARTIFACTS.assetPipelineReport)),
    generatedArtifact('assetLibraryUsageReport', GENERATED_ARTIFACTS.assetLibraryUsageReport, compileFiles.has(GENERATED_ARTIFACTS.assetLibraryUsageReport)),
    generatedArtifact('assetBindingTraceReport', GENERATED_ARTIFACTS.assetBindingTraceReport, compileFiles.has(GENERATED_ARTIFACTS.assetBindingTraceReport)),
    generatedArtifact('semanticExtractionTraceReport', GENERATED_ARTIFACTS.semanticExtractionTraceReport, compileFiles.has(GENERATED_ARTIFACTS.semanticExtractionTraceReport)),
    generatedArtifact('semanticModelReport', GENERATED_ARTIFACTS.semanticModelReport, compileFiles.has(GENERATED_ARTIFACTS.semanticModelReport)),
    artifact('buildLog', 'build', 'build-log', `${input.runId}.log`, input.buildLogPresent === true ? 'present' : 'missing', false, 'build', 'log', input.buildLogPresent === true ? undefined : 'build_log_not_available_yet'),
    artifact('qaReport', 'qa', 'qa-report', `${input.runId}.json`, input.qaReportPresent === true ? 'present' : 'missing', false, 'qa', 'json', input.qaReportPresent === true ? undefined : 'qa_report_not_available_yet'),
    artifact(
      'renderFidelityReport',
      'qa',
      'model-output',
      'render_fidelity_report.json',
      input.renderFidelityReportPresent === true ? 'present' : 'missing',
      false,
      'qa',
      'json',
      input.renderFidelityReportPresent === true ? undefined : 'render_fidelity_report_not_available_yet'
    ),
    artifact('pipelineAcceptanceReport', 'index', 'model-output', 'pipeline_acceptance_report.json', 'present', true, 'pipeline-acceptance', 'json'),
    artifact('pipelineArtifactIndex', 'index', 'model-output', 'pipeline_artifact_index.json', 'present', true, 'pipeline-artifact-index', 'json')
  ]);
}

export function buildInvalidDslPipelineArtifactIndex(input: { projectId: string; runId: string; sourceArtifact?: 'game_dsl.json' | 'game_dsl.candidate.json' }): PipelineArtifactIndex {
  const sourceArtifact = input.sourceArtifact ?? 'game_dsl.candidate.json';
  return parseIndex(input.projectId, input.runId, [
    artifact('generationInputReport', 'prompt', 'model-output', 'generation_input_report.json', 'present', true, 'generation', 'json'),
    artifact('intentPlan', 'prompt', 'model-output', 'intent_plan.json', 'present', true, 'generation', 'json'),
    artifact(
      'gameDsl',
      'dsl',
      'model-output',
      'game_dsl.json',
      sourceArtifact === 'game_dsl.json' ? 'present' : 'skipped',
      true,
      'generation',
      'json',
      sourceArtifact === 'game_dsl.json' ? undefined : 'invalid_dsl_path_uses_game_dsl_candidate_json'
    ),
    artifact(
      'gameDslCandidate',
      'dsl',
      'model-output',
      'game_dsl.candidate.json',
      sourceArtifact === 'game_dsl.candidate.json' ? 'present' : 'skipped',
      sourceArtifact === 'game_dsl.candidate.json',
      'generation',
      'json',
      sourceArtifact === 'game_dsl.candidate.json' ? undefined : 'invalid_dsl_path_uses_game_dsl_json'
    ),
    artifact('dslValidationReport', 'validation', 'model-output', 'dsl_validation_report.json', 'present', true, 'generation', 'json'),
    artifact('dslConsumptionReport', 'validation', 'model-output', 'dsl_consumption_report.json', 'skipped', true, 'dsl-consumption', 'json', 'dsl_validation_failed_before_consumption_audit'),
    skippedGeneratedArtifact('sceneIr'),
    skippedGeneratedArtifact('runtimeSceneBindingReport'),
    artifact(
      'runtimeCapabilityReport',
      'runtime',
      'model-output',
      'runtime_capability_report.json',
      sourceArtifact === 'game_dsl.json' ? 'present' : 'skipped',
      true,
      'runtime-capability',
      'json',
      sourceArtifact === 'game_dsl.json' ? undefined : 'dsl_validation_failed_before_runtime_capability'
    ),
    skippedGeneratedArtifact('assetIntentManifest'),
    skippedGeneratedArtifact('assetPlan'),
    skippedGeneratedArtifact('publicAssetManifest'),
    artifact('phaserPreviewManifest', 'preview', 'generated-project', 'shooter/src/asset-manifest.generated.json', 'skipped', true, 'compiler', 'json', 'dsl_validation_failed_before_compile'),
    skippedGeneratedArtifact('assetResolutionReport'),
    skippedGeneratedArtifact('assetPipelineReport'),
    skippedGeneratedArtifact('assetLibraryUsageReport'),
    skippedGeneratedArtifact('assetBindingTraceReport'),
    skippedGeneratedArtifact('semanticExtractionTraceReport'),
    skippedGeneratedArtifact('semanticModelReport'),
    artifact('buildLog', 'build', 'build-log', `${input.runId}.log`, 'skipped', false, 'build', 'log', 'dsl_validation_failed_before_build'),
    artifact('qaReport', 'qa', 'qa-report', `${input.runId}.json`, 'skipped', false, 'qa', 'json', 'dsl_validation_failed_before_qa'),
    artifact('renderFidelityReport', 'qa', 'model-output', 'render_fidelity_report.json', 'skipped', false, 'qa', 'json', 'dsl_validation_failed_before_qa'),
    artifact('pipelineAcceptanceReport', 'index', 'model-output', 'pipeline_acceptance_report.json', 'present', true, 'pipeline-acceptance', 'json'),
    artifact('pipelineArtifactIndex', 'index', 'model-output', 'pipeline_artifact_index.json', 'present', true, 'pipeline-artifact-index', 'json')
  ]);
}

export function buildUnsupportedIntentPipelineArtifactIndex(input: { projectId: string; runId: string; normalizedGenre: string }): PipelineArtifactIndex {
  return parseIndex(input.projectId, input.runId, [
    artifact('generationInputReport', 'prompt', 'model-output', 'generation_input_report.json', 'present', true, 'generation', 'json'),
    artifact('intentPlan', 'prompt', 'model-output', 'intent_plan.json', 'present', true, 'generation', 'json'),
    artifact('gameDsl', 'dsl', 'model-output', 'game_dsl.json', 'skipped', true, 'generation', 'json', 'runtime_unsupported_before_dsl_generation'),
    artifact('gameDslCandidate', 'dsl', 'model-output', 'game_dsl.candidate.json', 'skipped', false, 'generation', 'json', 'runtime_unsupported_before_dsl_generation'),
    artifact('dslValidationReport', 'validation', 'model-output', 'dsl_validation_report.json', 'skipped', true, 'generation', 'json', 'runtime_unsupported_before_dsl_validation'),
    artifact('dslConsumptionReport', 'validation', 'model-output', 'dsl_consumption_report.json', 'skipped', true, 'dsl-consumption', 'json', 'runtime_unsupported_before_consumption_audit'),
    skippedGeneratedArtifact('sceneIr', 'runtime_unsupported_before_compile'),
    skippedGeneratedArtifact('runtimeSceneBindingReport', 'runtime_unsupported_before_compile'),
    artifact('runtimeCapabilityReport', 'runtime', 'model-output', 'runtime_capability_report.json', 'present', true, 'runtime-capability', 'json'),
    skippedGeneratedArtifact('assetIntentManifest', 'runtime_unsupported_before_compile'),
    skippedGeneratedArtifact('assetPlan', 'runtime_unsupported_before_compile'),
    skippedGeneratedArtifact('publicAssetManifest', 'runtime_unsupported_before_compile'),
    artifact('phaserPreviewManifest', 'preview', 'generated-project', previewManifestPathForUnsupportedGenre(input.normalizedGenre), 'skipped', true, 'compiler', 'json', 'runtime_unsupported_before_compile'),
    skippedGeneratedArtifact('assetResolutionReport', 'runtime_unsupported_before_compile'),
    skippedGeneratedArtifact('assetPipelineReport', 'runtime_unsupported_before_compile'),
    skippedGeneratedArtifact('assetLibraryUsageReport', 'runtime_unsupported_before_compile'),
    skippedGeneratedArtifact('assetBindingTraceReport', 'runtime_unsupported_before_compile'),
    skippedGeneratedArtifact('semanticExtractionTraceReport', 'runtime_unsupported_before_compile'),
    skippedGeneratedArtifact('semanticModelReport', 'runtime_unsupported_before_compile'),
    artifact('buildLog', 'build', 'build-log', `${input.runId}.log`, 'skipped', false, 'build', 'log', 'runtime_unsupported_before_build'),
    artifact('qaReport', 'qa', 'qa-report', `${input.runId}.json`, 'skipped', false, 'qa', 'json', 'runtime_unsupported_before_qa'),
    artifact('renderFidelityReport', 'qa', 'model-output', 'render_fidelity_report.json', 'skipped', false, 'qa', 'json', 'runtime_unsupported_before_qa'),
    artifact('pipelineAcceptanceReport', 'index', 'model-output', 'pipeline_acceptance_report.json', 'present', true, 'pipeline-acceptance', 'json'),
    artifact('pipelineArtifactIndex', 'index', 'model-output', 'pipeline_artifact_index.json', 'present', true, 'pipeline-artifact-index', 'json')
  ]);
}

export async function writePipelineArtifactIndex(path: string, index: PipelineArtifactIndex): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(PipelineArtifactIndexSchema.parse(index), null, 2)}\n`, 'utf8');
}

function parseIndex(projectId: string, runId: string, artifacts: ArtifactInput[]): PipelineArtifactIndex {
  return PipelineArtifactIndexSchema.parse({
    indexVersion: 'pipeline-artifact-index-v0.1',
    projectId,
    runId,
    artifacts
  });
}

function generatedArtifact(id: keyof typeof GENERATED_ARTIFACTS, path: string, present: boolean): ArtifactInput {
  return artifact(
    id,
    roleForGeneratedArtifact(id),
    'generated-project',
    path,
    present ? 'present' : 'missing',
    true,
    producedByForGeneratedArtifact(id),
    'json',
    present ? undefined : `compile_files_missing_${id}`
  );
}

function skippedGeneratedArtifact(id: keyof typeof GENERATED_ARTIFACTS, reason = 'dsl_validation_failed_before_compile'): ArtifactInput {
  return artifact(
    id,
    roleForGeneratedArtifact(id),
    'generated-project',
    GENERATED_ARTIFACTS[id],
    'skipped',
    true,
    producedByForGeneratedArtifact(id),
    'json',
    reason
  );
}

function roleForGeneratedArtifact(id: keyof typeof GENERATED_ARTIFACTS): ArtifactInput['role'] {
  return id === 'sceneIr' || id === 'runtimeSceneBindingReport' ? 'runtime' : 'asset';
}

function producedByForGeneratedArtifact(id: keyof typeof GENERATED_ARTIFACTS): ArtifactInput['producedBy'] {
  if (id === 'runtimeSceneBindingReport') {
    return 'runtime-scene-binding';
  }
  if (id === 'assetBindingTraceReport') {
    return 'asset-binding-trace';
  }
  if (id === 'assetPipelineReport' || id === 'assetLibraryUsageReport') {
    return 'asset-pipeline';
  }
  return 'compiler';
}

function previewManifestPathForUnsupportedGenre(genre: string): string {
  return genre === 'side_scrolling_run_and_gun'
    ? 'side_scrolling_run_and_gun/src/asset-manifest.generated.json'
    : 'runtime_unsupported/src/asset-manifest.generated.json';
}

function artifact(
  id: ArtifactInput['id'],
  role: ArtifactInput['role'],
  artifactRoot: ArtifactInput['artifactRoot'],
  path: string,
  status: ArtifactStatus,
  required: boolean,
  producedBy: ArtifactInput['producedBy'],
  format: ArtifactInput['format'],
  reason?: string
): ArtifactInput {
  return reason === undefined ? { id, role, artifactRoot, path, status, required, producedBy, format } : { id, role, artifactRoot, path, status, required, producedBy, format, reason };
}

function isSafeRelativeArtifactPath(path: string): boolean {
  return !path.startsWith('/') && !/^[A-Za-z]:\//.test(path) && !path.split('/').includes('..') && !path.includes('\\');
}
