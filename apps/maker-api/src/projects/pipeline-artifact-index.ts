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
    'capability-readiness',
    'capability-resolution',
    'capability-runtime',
    'capability-gap',
    'capability-cutover',
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
  sceneIrAuthorityReport: 'scene_ir_authority_report.json',
  sceneIrCoverageReport: 'scene_ir_coverage_report.json',
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
  shadowCapabilityLockPresent?: boolean;
  shadowRuntimeSystemManifestPresent?: boolean;
  shadowRuntimeLoaderReportPresent?: boolean;
  shadowCapabilityQaPlanPresent?: boolean;
  shadowCapabilityQaReportPresent?: boolean;
  targetProfileRuntimeSupportReportPresent?: boolean;
}): PipelineArtifactIndex {
  const compileFiles = new Set(input.compileFiles);
  const sideScrollingCompile = input.compileFiles.some((file) => file.startsWith('side_scrolling_run_and_gun/'));
  const previewManifest = input.compileFiles
    .filter((file) => /^(collector|dodger|shooter|side_scrolling_run_and_gun)\/src\/asset-manifest\.generated\.json$/.test(file))
    .sort((left, right) => left.localeCompare(right))[0];

  return parseIndex(input.projectId, input.runId, [
    artifact('generationInputReport', 'prompt', 'model-output', 'generation_input_report.json', 'present', true, 'generation', 'json'),
    artifact('intentPlan', 'prompt', 'model-output', 'intent_plan.json', 'present', true, 'generation', 'json'),
    ...stageOneAuthorityArtifacts('present'),
    artifact('generationPathReceipt', 'runtime', 'model-output', 'generation_path_receipt.json', 'present', true, 'generation', 'json'),
    artifact('capabilityRegistrySnapshot', 'runtime', 'model-output', 'capability_registry_snapshot.json', 'present', true, 'capability-readiness', 'json'),
    artifact('generationCapabilityReadinessReport', 'runtime', 'model-output', 'generation_capability_readiness_report.json', 'present', true, 'capability-readiness', 'json'),
    artifact('generationCapabilityResolutionReport', 'runtime', 'model-output', 'generation_capability_resolution_report.json', 'present', true, 'capability-resolution', 'json'),
    artifact(
      'shadowGameplayCapabilityLock',
      'runtime',
      'model-output',
      'shadow_gameplay_capability_lock.json',
      input.shadowCapabilityLockPresent === true ? 'present' : 'skipped',
      false,
      'capability-resolution',
      'json',
      input.shadowCapabilityLockPresent === true ? undefined : 'capability_resolution_shadow_lock_not_resolved'
    ),
    artifact('generationCapabilityRuntimeReport', 'runtime', 'model-output', 'generation_capability_runtime_report.json', 'present', true, 'capability-runtime', 'json'),
    artifact('generationCapabilityGapReport', 'runtime', 'model-output', 'generation_capability_gap_report.json', 'present', true, 'capability-gap', 'json'),
    artifact('generationCapabilityCutoverReport', 'runtime', 'model-output', 'generation_capability_cutover_report.json', 'present', true, 'capability-cutover', 'json'),
    artifact(
      'shadowRuntimeSystemManifest',
      'runtime',
      'model-output',
      'shadow_phaser_runtime_system_manifest.json',
      input.shadowRuntimeSystemManifestPresent === true ? 'present' : 'skipped',
      false,
      'capability-runtime',
      'json',
      input.shadowRuntimeSystemManifestPresent === true ? undefined : 'capability_runtime_shadow_artifact_not_resolved'
    ),
    artifact(
      'shadowRuntimeLoaderReport',
      'runtime',
      'model-output',
      'shadow_phaser_runtime_loader_report.json',
      input.shadowRuntimeLoaderReportPresent === true ? 'present' : 'skipped',
      false,
      'capability-runtime',
      'json',
      input.shadowRuntimeLoaderReportPresent === true ? undefined : 'capability_runtime_shadow_artifact_not_resolved'
    ),
    artifact(
      'shadowCapabilityQaPlan',
      'runtime',
      'model-output',
      'shadow_capability_qa_plan.json',
      input.shadowCapabilityQaPlanPresent === true ? 'present' : 'skipped',
      false,
      'capability-runtime',
      'json',
      input.shadowCapabilityQaPlanPresent === true ? undefined : 'capability_runtime_shadow_artifact_not_resolved'
    ),
    artifact(
      'shadowCapabilityQaReport',
      'runtime',
      'model-output',
      'shadow_capability_qa_report.json',
      input.shadowCapabilityQaReportPresent === true ? 'present' : 'skipped',
      false,
      'capability-runtime',
      'json',
      input.shadowCapabilityQaReportPresent === true ? undefined : 'capability_runtime_shadow_artifact_not_resolved'
    ),
    artifact(
      'targetProfileRuntimeSupportReport',
      'runtime',
      'model-output',
      'generation_target_profile_runtime_support_report.json',
      input.targetProfileRuntimeSupportReportPresent === true ? 'present' : 'skipped',
      false,
      'capability-runtime',
      'json',
      input.targetProfileRuntimeSupportReportPresent === true ? undefined : 'target_profile_runtime_support_overlay_not_resolved'
    ),
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
      'sceneIrAuthorityReport',
      'runtime',
      'generated-project',
      GENERATED_ARTIFACTS.sceneIrAuthorityReport,
      sideScrollingCompile ? (compileFiles.has(GENERATED_ARTIFACTS.sceneIrAuthorityReport) ? 'present' : 'missing') : 'skipped',
      sideScrollingCompile,
      'compiler',
      'json',
      sideScrollingCompile
        ? compileFiles.has(GENERATED_ARTIFACTS.sceneIrAuthorityReport)
          ? undefined
          : 'compile_files_missing_sceneIrAuthorityReport'
        : 'scene_ir_authority_currently_side_scrolling_only'
    ),
    artifact(
      'sceneIrCoverageReport',
      'runtime',
      'generated-project',
      GENERATED_ARTIFACTS.sceneIrCoverageReport,
      sideScrollingCompile ? (compileFiles.has(GENERATED_ARTIFACTS.sceneIrCoverageReport) ? 'present' : 'missing') : 'skipped',
      sideScrollingCompile,
      'compiler',
      'json',
      sideScrollingCompile
        ? compileFiles.has(GENERATED_ARTIFACTS.sceneIrCoverageReport)
          ? undefined
          : 'compile_files_missing_sceneIrCoverageReport'
        : 'scene_ir_coverage_currently_side_scrolling_only'
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
    ...stageOneAuthorityArtifacts('present'),
    artifact('generationPathReceipt', 'runtime', 'model-output', 'generation_path_receipt.json', 'present', true, 'generation', 'json'),
    artifact('capabilityRegistrySnapshot', 'runtime', 'model-output', 'capability_registry_snapshot.json', 'present', true, 'capability-readiness', 'json'),
    artifact('generationCapabilityReadinessReport', 'runtime', 'model-output', 'generation_capability_readiness_report.json', 'present', true, 'capability-readiness', 'json'),
    artifact('generationCapabilityResolutionReport', 'runtime', 'model-output', 'generation_capability_resolution_report.json', 'present', true, 'capability-resolution', 'json'),
    artifact('shadowGameplayCapabilityLock', 'runtime', 'model-output', 'shadow_gameplay_capability_lock.json', 'skipped', false, 'capability-resolution', 'json', 'capability_resolution_shadow_lock_not_resolved'),
    artifact('generationCapabilityRuntimeReport', 'runtime', 'model-output', 'generation_capability_runtime_report.json', 'present', true, 'capability-runtime', 'json'),
    artifact('generationCapabilityGapReport', 'runtime', 'model-output', 'generation_capability_gap_report.json', 'present', true, 'capability-gap', 'json'),
    artifact('generationCapabilityCutoverReport', 'runtime', 'model-output', 'generation_capability_cutover_report.json', 'present', true, 'capability-cutover', 'json'),
    artifact('shadowRuntimeSystemManifest', 'runtime', 'model-output', 'shadow_phaser_runtime_system_manifest.json', 'skipped', false, 'capability-runtime', 'json', 'capability_runtime_shadow_artifact_not_resolved'),
    artifact('shadowRuntimeLoaderReport', 'runtime', 'model-output', 'shadow_phaser_runtime_loader_report.json', 'skipped', false, 'capability-runtime', 'json', 'capability_runtime_shadow_artifact_not_resolved'),
    artifact('shadowCapabilityQaPlan', 'runtime', 'model-output', 'shadow_capability_qa_plan.json', 'skipped', false, 'capability-runtime', 'json', 'capability_runtime_shadow_artifact_not_resolved'),
    artifact('shadowCapabilityQaReport', 'runtime', 'model-output', 'shadow_capability_qa_report.json', 'skipped', false, 'capability-runtime', 'json', 'capability_runtime_shadow_artifact_not_resolved'),
    artifact('targetProfileRuntimeSupportReport', 'runtime', 'model-output', 'generation_target_profile_runtime_support_report.json', 'skipped', false, 'capability-runtime', 'json', 'target_profile_runtime_support_overlay_not_resolved'),
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
    skippedGeneratedArtifact('sceneIrAuthorityReport'),
    skippedGeneratedArtifact('sceneIrCoverageReport'),
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
    ...stageOneAuthorityArtifacts('skipped', 'runtime_unsupported_before_canonical_brief'),
    artifact('generationPathReceipt', 'runtime', 'model-output', 'generation_path_receipt.json', 'present', true, 'generation', 'json'),
    artifact('capabilityRegistrySnapshot', 'runtime', 'model-output', 'capability_registry_snapshot.json', 'present', true, 'capability-readiness', 'json'),
    artifact('generationCapabilityReadinessReport', 'runtime', 'model-output', 'generation_capability_readiness_report.json', 'present', true, 'capability-readiness', 'json'),
    artifact('generationCapabilityResolutionReport', 'runtime', 'model-output', 'generation_capability_resolution_report.json', 'present', true, 'capability-resolution', 'json'),
    artifact('shadowGameplayCapabilityLock', 'runtime', 'model-output', 'shadow_gameplay_capability_lock.json', 'skipped', false, 'capability-resolution', 'json', 'capability_resolution_shadow_lock_not_resolved'),
    artifact('generationCapabilityRuntimeReport', 'runtime', 'model-output', 'generation_capability_runtime_report.json', 'present', true, 'capability-runtime', 'json'),
    artifact('generationCapabilityGapReport', 'runtime', 'model-output', 'generation_capability_gap_report.json', 'present', true, 'capability-gap', 'json'),
    artifact('generationCapabilityCutoverReport', 'runtime', 'model-output', 'generation_capability_cutover_report.json', 'present', true, 'capability-cutover', 'json'),
    artifact('shadowRuntimeSystemManifest', 'runtime', 'model-output', 'shadow_phaser_runtime_system_manifest.json', 'skipped', false, 'capability-runtime', 'json', 'capability_runtime_shadow_artifact_not_resolved'),
    artifact('shadowRuntimeLoaderReport', 'runtime', 'model-output', 'shadow_phaser_runtime_loader_report.json', 'skipped', false, 'capability-runtime', 'json', 'capability_runtime_shadow_artifact_not_resolved'),
    artifact('shadowCapabilityQaPlan', 'runtime', 'model-output', 'shadow_capability_qa_plan.json', 'skipped', false, 'capability-runtime', 'json', 'capability_runtime_shadow_artifact_not_resolved'),
    artifact('shadowCapabilityQaReport', 'runtime', 'model-output', 'shadow_capability_qa_report.json', 'skipped', false, 'capability-runtime', 'json', 'capability_runtime_shadow_artifact_not_resolved'),
    artifact('targetProfileRuntimeSupportReport', 'runtime', 'model-output', 'generation_target_profile_runtime_support_report.json', 'skipped', false, 'capability-runtime', 'json', 'target_profile_runtime_support_overlay_not_resolved'),
    artifact('gameDsl', 'dsl', 'model-output', 'game_dsl.json', 'skipped', true, 'generation', 'json', 'runtime_unsupported_before_dsl_generation'),
    artifact('gameDslCandidate', 'dsl', 'model-output', 'game_dsl.candidate.json', 'skipped', false, 'generation', 'json', 'runtime_unsupported_before_dsl_generation'),
    artifact('dslValidationReport', 'validation', 'model-output', 'dsl_validation_report.json', 'skipped', true, 'generation', 'json', 'runtime_unsupported_before_dsl_validation'),
    artifact('dslConsumptionReport', 'validation', 'model-output', 'dsl_consumption_report.json', 'skipped', true, 'dsl-consumption', 'json', 'runtime_unsupported_before_consumption_audit'),
    skippedGeneratedArtifact('sceneIr', 'runtime_unsupported_before_compile'),
    skippedGeneratedArtifact('sceneIrAuthorityReport', 'runtime_unsupported_before_compile'),
    skippedGeneratedArtifact('sceneIrCoverageReport', 'runtime_unsupported_before_compile'),
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

export function buildModelGenerationFailedPipelineArtifactIndex(input: {
  projectId: string;
  runId: string;
  stageOneAuthorityPresent?: boolean;
}): PipelineArtifactIndex {
  return buildPreDslBlockedPipelineArtifactIndex({
    ...input,
    reasonPrefix: 'model_generation_failed',
    previewDirectory: 'model_generation_failed',
    stageOneAuthorityStatus: input.stageOneAuthorityPresent === true ? 'present' : 'skipped'
  });
}

export function buildDslPreconditionBlockedPipelineArtifactIndex(input: { projectId: string; runId: string }): PipelineArtifactIndex {
  return buildPreDslBlockedPipelineArtifactIndex({
    ...input,
    reasonPrefix: 'dsl_precondition_blocked',
    previewDirectory: 'dsl_precondition_blocked'
  });
}

export function buildActiveProfileLockBlockedPipelineArtifactIndex(input: { projectId: string; runId: string }): PipelineArtifactIndex {
  return buildPreDslBlockedPipelineArtifactIndex({
    ...input,
    reasonPrefix: 'active_profile_lock_blocked',
    previewDirectory: 'active_profile_lock_blocked',
    stageOneAuthorityStatus: 'present',
    activeProfileLockStatus: 'skipped',
    activeProfileLockSkippedReason: 'active_profile_lock_unresolved_before_raw_dsl'
  });
}

function buildPreDslBlockedPipelineArtifactIndex(input: {
  projectId: string;
  runId: string;
  reasonPrefix: 'model_generation_failed' | 'dsl_precondition_blocked' | 'active_profile_lock_blocked';
  previewDirectory: string;
  stageOneAuthorityStatus?: Extract<ArtifactStatus, 'present' | 'skipped'>;
  activeProfileLockStatus?: Extract<ArtifactStatus, 'present' | 'skipped'>;
  activeProfileLockSkippedReason?: string;
}): PipelineArtifactIndex {
  const beforeDsl = `${input.reasonPrefix}_before_dsl`;
  const beforeDslValidation = `${input.reasonPrefix}_before_dsl_validation`;
  const beforeConsumption = `${input.reasonPrefix}_before_consumption_audit`;
  const beforeCompile = `${input.reasonPrefix}_before_compile`;
  const beforeRuntimeCapability = `${input.reasonPrefix}_before_runtime_capability`;
  const beforeBuild = `${input.reasonPrefix}_before_build`;
  const beforeQa = `${input.reasonPrefix}_before_qa`;

  return parseIndex(input.projectId, input.runId, [
    artifact('generationInputReport', 'prompt', 'model-output', 'generation_input_report.json', 'present', true, 'generation', 'json'),
    artifact('intentPlan', 'prompt', 'model-output', 'intent_plan.json', 'present', true, 'generation', 'json'),
    ...stageOneAuthorityArtifacts(
      input.stageOneAuthorityStatus ?? (input.reasonPrefix === 'dsl_precondition_blocked' ? 'present' : 'skipped'),
      `${input.reasonPrefix}_before_canonical_brief`,
      input.activeProfileLockStatus,
      input.activeProfileLockSkippedReason
    ),
    artifact('generationPathReceipt', 'runtime', 'model-output', 'generation_path_receipt.json', 'present', true, 'generation', 'json'),
    artifact('capabilityRegistrySnapshot', 'runtime', 'model-output', 'capability_registry_snapshot.json', 'present', true, 'capability-readiness', 'json'),
    artifact('generationCapabilityReadinessReport', 'runtime', 'model-output', 'generation_capability_readiness_report.json', 'present', true, 'capability-readiness', 'json'),
    artifact('generationCapabilityResolutionReport', 'runtime', 'model-output', 'generation_capability_resolution_report.json', 'present', true, 'capability-resolution', 'json'),
    artifact('shadowGameplayCapabilityLock', 'runtime', 'model-output', 'shadow_gameplay_capability_lock.json', 'skipped', false, 'capability-resolution', 'json', 'capability_resolution_shadow_lock_not_resolved'),
    artifact('generationCapabilityRuntimeReport', 'runtime', 'model-output', 'generation_capability_runtime_report.json', 'present', true, 'capability-runtime', 'json'),
    artifact('generationCapabilityGapReport', 'runtime', 'model-output', 'generation_capability_gap_report.json', 'present', true, 'capability-gap', 'json'),
    artifact('generationCapabilityCutoverReport', 'runtime', 'model-output', 'generation_capability_cutover_report.json', 'present', true, 'capability-cutover', 'json'),
    artifact('shadowRuntimeSystemManifest', 'runtime', 'model-output', 'shadow_phaser_runtime_system_manifest.json', 'skipped', false, 'capability-runtime', 'json', 'capability_runtime_shadow_artifact_not_resolved'),
    artifact('shadowRuntimeLoaderReport', 'runtime', 'model-output', 'shadow_phaser_runtime_loader_report.json', 'skipped', false, 'capability-runtime', 'json', 'capability_runtime_shadow_artifact_not_resolved'),
    artifact('shadowCapabilityQaPlan', 'runtime', 'model-output', 'shadow_capability_qa_plan.json', 'skipped', false, 'capability-runtime', 'json', 'capability_runtime_shadow_artifact_not_resolved'),
    artifact('shadowCapabilityQaReport', 'runtime', 'model-output', 'shadow_capability_qa_report.json', 'skipped', false, 'capability-runtime', 'json', 'capability_runtime_shadow_artifact_not_resolved'),
    artifact('targetProfileRuntimeSupportReport', 'runtime', 'model-output', 'generation_target_profile_runtime_support_report.json', 'skipped', false, 'capability-runtime', 'json', 'target_profile_runtime_support_overlay_not_resolved'),
    artifact('gameDsl', 'dsl', 'model-output', 'game_dsl.json', 'skipped', true, 'generation', 'json', beforeDsl),
    artifact('gameDslCandidate', 'dsl', 'model-output', 'game_dsl.candidate.json', 'skipped', false, 'generation', 'json', beforeDsl),
    artifact('dslValidationReport', 'validation', 'model-output', 'dsl_validation_report.json', 'skipped', true, 'generation', 'json', beforeDslValidation),
    artifact('dslConsumptionReport', 'validation', 'model-output', 'dsl_consumption_report.json', 'skipped', true, 'dsl-consumption', 'json', beforeConsumption),
    skippedGeneratedArtifact('sceneIr', beforeCompile),
    skippedGeneratedArtifact('sceneIrAuthorityReport', beforeCompile),
    skippedGeneratedArtifact('sceneIrCoverageReport', beforeCompile),
    skippedGeneratedArtifact('runtimeSceneBindingReport', beforeCompile),
    artifact('runtimeCapabilityReport', 'runtime', 'model-output', 'runtime_capability_report.json', 'skipped', true, 'runtime-capability', 'json', beforeRuntimeCapability),
    skippedGeneratedArtifact('assetIntentManifest', beforeCompile),
    skippedGeneratedArtifact('assetPlan', beforeCompile),
    skippedGeneratedArtifact('publicAssetManifest', beforeCompile),
    artifact('phaserPreviewManifest', 'preview', 'generated-project', `${input.previewDirectory}/src/asset-manifest.generated.json`, 'skipped', true, 'compiler', 'json', beforeCompile),
    skippedGeneratedArtifact('assetResolutionReport', beforeCompile),
    skippedGeneratedArtifact('assetPipelineReport', beforeCompile),
    skippedGeneratedArtifact('assetLibraryUsageReport', beforeCompile),
    skippedGeneratedArtifact('assetBindingTraceReport', beforeCompile),
    skippedGeneratedArtifact('semanticExtractionTraceReport', beforeCompile),
    skippedGeneratedArtifact('semanticModelReport', beforeCompile),
    artifact('buildLog', 'build', 'build-log', `${input.runId}.log`, 'skipped', false, 'build', 'log', beforeBuild),
    artifact('qaReport', 'qa', 'qa-report', `${input.runId}.json`, 'skipped', false, 'qa', 'json', beforeQa),
    artifact('renderFidelityReport', 'qa', 'model-output', 'render_fidelity_report.json', 'skipped', false, 'qa', 'json', beforeQa),
    artifact('pipelineAcceptanceReport', 'index', 'model-output', 'pipeline_acceptance_report.json', 'present', true, 'pipeline-acceptance', 'json'),
    artifact('pipelineArtifactIndex', 'index', 'model-output', 'pipeline_artifact_index.json', 'present', true, 'pipeline-artifact-index', 'json')
  ]);
}

export function buildCompileFailedPipelineArtifactIndex(input: { projectId: string; runId: string; reason: string }): PipelineArtifactIndex {
  return parseIndex(input.projectId, input.runId, [
    artifact('generationInputReport', 'prompt', 'model-output', 'generation_input_report.json', 'present', true, 'generation', 'json'),
    artifact('intentPlan', 'prompt', 'model-output', 'intent_plan.json', 'present', true, 'generation', 'json'),
    ...stageOneAuthorityArtifacts('present'),
    artifact('generationPathReceipt', 'runtime', 'model-output', 'generation_path_receipt.json', 'present', true, 'generation', 'json'),
    artifact('capabilityRegistrySnapshot', 'runtime', 'model-output', 'capability_registry_snapshot.json', 'present', true, 'capability-readiness', 'json'),
    artifact('generationCapabilityReadinessReport', 'runtime', 'model-output', 'generation_capability_readiness_report.json', 'present', true, 'capability-readiness', 'json'),
    artifact('generationCapabilityResolutionReport', 'runtime', 'model-output', 'generation_capability_resolution_report.json', 'present', true, 'capability-resolution', 'json'),
    artifact('shadowGameplayCapabilityLock', 'runtime', 'model-output', 'shadow_gameplay_capability_lock.json', 'skipped', false, 'capability-resolution', 'json', 'capability_resolution_shadow_lock_not_resolved'),
    artifact('generationCapabilityRuntimeReport', 'runtime', 'model-output', 'generation_capability_runtime_report.json', 'present', true, 'capability-runtime', 'json'),
    artifact('generationCapabilityGapReport', 'runtime', 'model-output', 'generation_capability_gap_report.json', 'present', true, 'capability-gap', 'json'),
    artifact('generationCapabilityCutoverReport', 'runtime', 'model-output', 'generation_capability_cutover_report.json', 'present', true, 'capability-cutover', 'json'),
    artifact('shadowRuntimeSystemManifest', 'runtime', 'model-output', 'shadow_phaser_runtime_system_manifest.json', 'skipped', false, 'capability-runtime', 'json', 'capability_runtime_shadow_artifact_not_resolved'),
    artifact('shadowRuntimeLoaderReport', 'runtime', 'model-output', 'shadow_phaser_runtime_loader_report.json', 'skipped', false, 'capability-runtime', 'json', 'capability_runtime_shadow_artifact_not_resolved'),
    artifact('shadowCapabilityQaPlan', 'runtime', 'model-output', 'shadow_capability_qa_plan.json', 'skipped', false, 'capability-runtime', 'json', 'capability_runtime_shadow_artifact_not_resolved'),
    artifact('shadowCapabilityQaReport', 'runtime', 'model-output', 'shadow_capability_qa_report.json', 'skipped', false, 'capability-runtime', 'json', 'capability_runtime_shadow_artifact_not_resolved'),
    artifact('targetProfileRuntimeSupportReport', 'runtime', 'model-output', 'generation_target_profile_runtime_support_report.json', 'skipped', false, 'capability-runtime', 'json', 'target_profile_runtime_support_overlay_not_resolved'),
    artifact('gameDsl', 'dsl', 'model-output', 'game_dsl.json', 'present', true, 'generation', 'json'),
    artifact('gameDslCandidate', 'dsl', 'model-output', 'game_dsl.candidate.json', 'skipped', false, 'generation', 'json', 'valid_dsl_path_uses_game_dsl_json'),
    artifact('dslValidationReport', 'validation', 'model-output', 'dsl_validation_report.json', 'present', true, 'generation', 'json'),
    artifact('dslConsumptionReport', 'validation', 'model-output', 'dsl_consumption_report.json', 'present', true, 'dsl-consumption', 'json'),
    skippedGeneratedArtifact('sceneIr', input.reason),
    skippedGeneratedArtifact('sceneIrAuthorityReport', input.reason),
    skippedGeneratedArtifact('sceneIrCoverageReport', input.reason),
    skippedGeneratedArtifact('runtimeSceneBindingReport', input.reason),
    artifact('runtimeCapabilityReport', 'runtime', 'model-output', 'runtime_capability_report.json', 'present', true, 'runtime-capability', 'json'),
    skippedGeneratedArtifact('assetIntentManifest', input.reason),
    skippedGeneratedArtifact('assetPlan', input.reason),
    skippedGeneratedArtifact('publicAssetManifest', input.reason),
    artifact('phaserPreviewManifest', 'preview', 'generated-project', 'compile_failed/src/asset-manifest.generated.json', 'skipped', true, 'compiler', 'json', input.reason),
    skippedGeneratedArtifact('assetResolutionReport', input.reason),
    skippedGeneratedArtifact('assetPipelineReport', input.reason),
    skippedGeneratedArtifact('assetLibraryUsageReport', input.reason),
    skippedGeneratedArtifact('assetBindingTraceReport', input.reason),
    skippedGeneratedArtifact('semanticExtractionTraceReport', input.reason),
    skippedGeneratedArtifact('semanticModelReport', input.reason),
    artifact('buildLog', 'build', 'build-log', `${input.runId}.log`, 'skipped', false, 'build', 'log', `${input.reason}_before_build`),
    artifact('qaReport', 'qa', 'qa-report', `${input.runId}.json`, 'skipped', false, 'qa', 'json', `${input.reason}_before_qa`),
    artifact('renderFidelityReport', 'qa', 'model-output', 'render_fidelity_report.json', 'skipped', false, 'qa', 'json', `${input.reason}_before_qa`),
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

function stageOneAuthorityArtifacts(
  status: Extract<ArtifactStatus, 'present' | 'skipped'>,
  skippedReason = 'canonical_brief_not_available_before_raw_dsl',
  activeProfileLockStatus = status,
  activeProfileLockSkippedReason = skippedReason,
  authorityBundleStatus = activeProfileLockStatus,
  authorityBundleSkippedReason = activeProfileLockSkippedReason
): ArtifactInput[] {
  return [
    artifact(
      'canonicalGameBrief',
      'prompt',
      'model-output',
      'canonical_game_brief.json',
      status,
      true,
      'generation',
      'json',
      status === 'present' ? undefined : skippedReason
    ),
    artifact(
      'generationScopePlan',
      'runtime',
      'model-output',
      'generation_scope_plan.json',
      status,
      true,
      'generation',
      'json',
      status === 'present' ? undefined : skippedReason
    ),
    artifact(
      'activeProfileLock',
      'runtime',
      'model-output',
      'active_profile_lock.json',
      activeProfileLockStatus,
      true,
      'generation',
      'json',
      activeProfileLockStatus === 'present' ? undefined : activeProfileLockSkippedReason
    ),
    artifact(
      'authorityBundle',
      'runtime',
      'model-output',
      'authority_bundle.json',
      authorityBundleStatus,
      true,
      'generation',
      'json',
      authorityBundleStatus === 'present' ? undefined : authorityBundleSkippedReason
    )
  ];
}

function roleForGeneratedArtifact(id: keyof typeof GENERATED_ARTIFACTS): ArtifactInput['role'] {
  return id === 'sceneIr' || id === 'sceneIrAuthorityReport' || id === 'sceneIrCoverageReport' || id === 'runtimeSceneBindingReport' ? 'runtime' : 'asset';
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
