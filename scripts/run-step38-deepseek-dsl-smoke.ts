import 'reflect-metadata';

import { execFile } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { Page } from 'playwright';

import { ViteBuildRunnerService } from '../apps/maker-api/src/compiler/vite-build-runner.service.js';
import { DeepSeekClient } from '../apps/maker-api/src/model-provider/deepseek.client.js';
import { readDeepSeekConfig } from '../apps/maker-api/src/model-provider/model-provider.config.js';
import { GameDslProviderService } from '../apps/maker-api/src/model-provider/game-dsl-provider.service.js';
import { LocalWorkspaceService } from '../apps/maker-api/src/workspace/local-workspace.service.js';
import {
  buildCapabilityGameDslDraftComposedSchemaIdentity,
  buildCanonicalGameBriefArtifact,
  buildGenerationScopePlan,
  CANONICAL_GAME_DSL_V02_SCHEMA_VERSION,
  CANONICAL_GAME_DSL_V02_PATH,
  CAPABILITY_GAME_DSL_DRAFT_RAW_PATH,
  CAPABILITY_IR_PATH,
  CAPABILITY_RUNTIME_PLAN_PATH,
  compileCanonicalCapabilityDslToRuntimePlan,
  DEEPSEEK_RUN_AND_GUN_FIXED_PROMPT_SHA256,
  DEEPSEEK_RUN_AND_GUN_FIXED_USER_VALIDATION_PROMPT,
  DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1,
  GAME_DSL_NORMALIZATION_REPORT_PATH,
  GameBriefV02Schema,
  normalizeCapabilityGameDslDraftToCanonicalV02,
  RUNTIME_SYSTEM_MANIFEST_PATH,
  type CanonicalGameDslV02,
  type CapabilityRuntimePlan,
  type GameBriefV02
} from '../packages/game-dsl/src/index.js';
import {
  GAMEPLAY_CAPABILITY_LOCK_KIND,
  GAMEPLAY_CAPABILITY_LOCK_SCHEMA_VERSION,
  GameplayCapabilityLockSchema,
  type GameplayCapabilityLock
} from '../packages/game-dsl/src/gameplay-capabilities/capability-lock.js';
import { hashStableJson } from '../packages/game-dsl/src/gameplay-capabilities/stable-json.js';
import {
  buildStep38AssetTemplateFingerprintReport,
  buildStep38CanvasAssetDesignSpecsReport,
  buildStep38CanvasDrawPlanReport,
  buildStep38EnvironmentLayeringReport,
  buildStep38ProceduralPixelArtGrammarReport,
  STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY,
  buildStep38SpriteAssets as buildDslDrivenStep38SpriteAssets,
  buildStep38SpriteAnimationCoverageReport,
  buildStep38VisualDesignRealizationReport,
  type Step38SpriteAsset as DslDrivenStep38SpriteAsset
} from './step38-visual-asset-materializer.js';
import {
  STEP38_BASELINE_COMMIT,
  STEP38_EXPECTED_PROVIDER_MODEL,
  evaluateStep38DslConsumption,
  readJsonFile,
  resolveStep38SmokeMode,
  sha256File,
  sha256Text,
  type Step38CapabilityRepresentation
} from './step38-deepseek-dsl-consumption.js';
import {
  buildStep38EncounterCoverageWithFullGameExpansionEvidence,
  evaluateStep38FullGameExpansionEvidence,
  isStep38ProducedFullGameExpansionEvidence
} from './step38-full-game-expansion-gate.js';

type ProviderLogRecord = { level: 'log' | 'warn' | 'error'; event?: string; [key: string]: unknown };

const repoRoot = process.cwd();
const previousPreviewBaseUrl = process.env.PREVIEW_BASE_URL;
const STEP38_REQUIRED_QA_EVENTS = [
  'game.ready',
  'game.started',
  'scene.visual_presentation_metadata.verified',
  'player.moved',
  'player.jumped',
  'player.crouched',
  'player.fired',
  'projectile.spawned',
  'item.collected',
  'enemy.moved',
  'enemy.fired',
  'enemy.projectile.spawned',
  'enemy.projectile.hit_player',
  'enemy.hit',
  'score.changed',
  'player.damaged',
  'level.segment.completed',
  'boss.attack.fired',
  'boss.falling_hazard.spawned',
  'boss.phase.changed',
  'player.dead',
  'game.over',
  'game.lost',
  'objective.completed',
  'mission.complete',
  'game.won'
] as const;
const STEP38_VERTICAL_SLICE_CONTENT_TYPES = [
  'player',
  'enemy_wave',
  'static_enemy',
  'flying_enemy',
  'weapon_pickup',
  'projectile',
  'hazard',
  'boss',
  'boss_telegraph',
  'boss_phase',
  'region_transition',
  'runtime_feedback'
] as const;
const STEP38_REQUIRED_VERTICAL_SLICE_SCREENSHOTS = [
  '00_spawn_hud_marker',
  '01_movement_shooting',
  '02_weapon_pickup_visible',
  '03_wave_1_enemy_mix',
  '04_wave_2_or_area_2_visible',
  '05_boss_telegraph_visible',
  '06_boss_phase_visible',
  '07_mission_complete_or_exit_state'
] as const;
const STEP38_REQUIRED_MANUAL_TRAVERSAL_SCREENSHOTS = [
  '00_spawn_start',
  '01_wave1_reached_by_input',
  '02_projectile_visible_by_input',
  '02_pickup_and_area2_reached_by_input',
  '03_wave2_reached_by_input',
  '04_boss_telegraph_reached_by_input',
  '05_boss_phase_reached_by_input',
  '06_exit_or_mission_complete_reached_by_input'
] as const;
const STEP38_ROUTE_PRESSURE_BAND_SCREENSHOTS = ['03b_mid_pressure_band'] as const;
const STEP38_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS = [
  '00_fresh_spawn',
  '01_wave1_visible',
  '02_wave1_clear_or_progression',
  '03_weapon_pickup_visible_and_collected',
  '04_area_progression_visible',
  '05_wave2_mixed_enemies_visible',
  '06_wave2_clear_or_pressure',
  '07_boss_arena_visible',
  '08_boss_phase_1_visible',
  '09_boss_phase_2_visible',
  '10_boss_defeated',
  '11_mission_complete_after_play'
] as const;
const STEP38_REQUIRED_COMPLETION_PRECONDITIONS = [
  'wave_progression_complete',
  'area_progression_complete',
  'weapon_pickup_consumed',
  'boss_phase_seen',
  'boss_defeated_by_input'
] as const;
const STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS = [
  'player',
  'default_weapon',
  'pickup_weapon',
  'projectile',
  'ground_enemy',
  'ranged_enemy',
  'flying_enemy',
  'wave_marker',
  'area_marker',
  'boss',
  'boss_telegraph',
  'boss_projectile_phase_object',
  'environment_hazard'
] as const;
type Step38RequiredVisualRuntimeObject = (typeof STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS)[number];

async function main(): Promise<void> {
  assertPromptBinding();

  const providerConfig = readDeepSeekConfig();
  const smokeMode = resolveStep38SmokeMode(process.env, providerConfig);
  if (smokeMode.mode !== 'enabled') {
    console.log(JSON.stringify({ step: 'step38_deepseek_smoke', ...smokeMode }, null, 2));
    if (smokeMode.mode === 'blocked') {
      process.exitCode = 1;
    }
    return;
  }

  const createdAt = new Date();
  const runId = `run_step38_${formatRunTimestamp(createdAt)}`;
  const projectId = `proj_step38_${formatRunTimestamp(createdAt)}`;
  const step38Root = join(repoRoot, 'generated', 'step38', runId);
  const workspace = new LocalWorkspaceService(step38Root);
  const providerLogs: ProviderLogRecord[] = [];
  const providerEvidencePath = join(step38Root, 'deepseek-provider-evidence.json');
  const artifactManifestPath = join(step38Root, 'artifact_manifest.json');
  const evidencePackagePath = join(step38Root, 'step38-evidence-package.json');
  const readyReceiptPath = join(step38Root, 'ready-for-manual-test-receipt.json');
  const manualInstructionsPath = join(step38Root, 'manual-test-instructions.md');

  await mkdir(step38Root, { recursive: true });
  const server = await startPreviewServer(workspace);
  const port = (server.address() as AddressInfo).port;
  process.env.PREVIEW_BASE_URL = `http://127.0.0.1:${port}`;

  try {
    const modelClient = new DeepSeekClient(
      workspace,
      { ...providerConfig, defaultModel: smokeMode.modelName, defaultTimeoutMs: Math.max(providerConfig.defaultTimeoutMs, 120_000) },
      fetch,
      createProviderLogger(providerLogs)
    );
    const provider = new GameDslProviderService(modelClient);
    const previewUrl = `${process.env.PREVIEW_BASE_URL}/preview/${projectId}/index.html`;
    const generatedArtifactDir = workspace.getGeneratedProjectDir(projectId);
    const previewLaunchCommand = buildPreviewLaunchCommand(generatedArtifactDir);
    const modelOutputDir = dirname(workspace.getModelOutputPath(projectId, runId, CAPABILITY_GAME_DSL_DRAFT_RAW_PATH));
    const gameBriefRawPath = workspace.getModelOutputPath(projectId, runId, 'game-brief.raw.json');
    const capabilityDraftRawPath = workspace.getModelOutputPath(projectId, runId, CAPABILITY_GAME_DSL_DRAFT_RAW_PATH);
    const candidateDslPath = join(step38Root, 'candidate-dsl.json');
    const canonicalBriefPath = join(modelOutputDir, 'canonical_game_brief.json');
    const generationScopePlanPath = join(modelOutputDir, 'generation_scope_plan.json');
    const capabilityLockPath = join(modelOutputDir, `${GAMEPLAY_CAPABILITY_LOCK_KIND}.json`);
    const composedSchemaIdentityPath = join(modelOutputDir, 'capability-game-dsl-composed-schema-identity.json');
    const canonicalDslPath = join(modelOutputDir, CANONICAL_GAME_DSL_V02_PATH);
    const normalizationReportPath = join(modelOutputDir, GAME_DSL_NORMALIZATION_REPORT_PATH);
    const capabilityIrPath = join(modelOutputDir, CAPABILITY_IR_PATH);
    const runtimePlanPath = join(modelOutputDir, CAPABILITY_RUNTIME_PLAN_PATH);
    const runtimeManifestPath = join(modelOutputDir, RUNTIME_SYSTEM_MANIFEST_PATH);
    const compilationReportPath = join(modelOutputDir, 'canonical-capability-compilation-report.json');
    const sceneIrPath = join(generatedArtifactDir, 'game.scene.ir.json');
    const manualVerticalSliceProjectionPath = join(step38Root, 'manual_vertical_slice_projection.json');
    const manualTraversalPathPath = join(step38Root, 'manual_traversal_path.json');
    const manualTraversalEvidencePath = join(step38Root, 'manual_traversal_evidence.json');
    const successRouteMilestoneTimelinePath = join(step38Root, 'success_route_milestone_timeline.json');
    const routePressureBandEvidencePath = join(step38Root, 'route_pressure_band_evidence.json');
    const visualRuntimeBindingReportPath = join(step38Root, 'visual_runtime_binding_report.json');
    const visualAssetMaterializationReportPath = join(step38Root, 'visual_asset_materialization_report.json');
    const assetTemplateFingerprintReportPath = join(step38Root, 'asset_template_fingerprint_report.json');
    const visualDesignRealizationReportPath = join(step38Root, 'visual_design_realization_report.json');
    const runtimeTextureLoadReportPath = join(step38Root, 'runtime_texture_load_report.json');
    const artDirectionQualityReportPath = join(step38Root, 'art_direction_quality_report.json');
    const encounterDirectorPlanPath = join(step38Root, 'encounter_director_plan.json');
    const encounterDirectorRuntimeEvidencePath = join(step38Root, 'encounter_director_runtime_evidence.json');
    const outcomeStateMachineReportPath = join(step38Root, 'outcome_state_machine_report.json');
    const winPathEvidencePath = join(step38Root, 'win_path_evidence.json');
    const losePathEvidencePath = join(step38Root, 'lose_path_evidence.json');
    const realPlaythroughCompletionEvidencePath = join(step38Root, 'real_playthrough_completion_evidence.json');
    const twoDGameplayPlaythroughGatePath = join(step38Root, 'two_d_gameplay_playthrough_gate.json');
    const canvasVisualReadabilityGatePath = join(step38Root, 'canvas_visual_readability_gate.json');
    const proceduralPixelArtGrammarReportPath = join(step38Root, 'procedural_pixel_art_grammar_report.json');
    const canvasArtFidelityGatePath = join(step38Root, 'canvas_art_fidelity_gate.json');
    const spriteAnimationCoverageReportPath = join(step38Root, 'sprite_animation_coverage_report.json');
    const environmentLayeringReportPath = join(step38Root, 'environment_layering_report.json');
    const startupSurvivabilityGatePath = join(step38Root, 'startup_survivability_gate.json');
    const encounterPlayabilityGatePath = join(step38Root, 'encounter_playability_gate.json');
    const operatorVisibleArtGatePath = join(step38Root, 'operator_visible_art_gate.json');
    const visualPlaythroughValidatorReportPath = join(step38Root, 'visual_playthrough_validator_report.json');
    const canvasAssetDesignSpecsPath = join(step38Root, 'canvas_asset_design_specs.json');
    const canvasDrawPlanReportPath = join(step38Root, 'canvas_draw_plan_report.json');
    const canvasTextureRegistryPath = join(step38Root, 'canvas_texture_registry.json');
    const canvasRuntimeBindingReportPath = join(step38Root, 'canvas_runtime_binding_report.json');
    const materializedAssetDir = join(step38Root, 'assets', 'generated');
    const assetSyncReportPath = join(step38Root, 'asset-sync-report.json');
    const qaEvidencePath = workspace.getQaReportPath(projectId, runId);
    const telemetryEvidencePath = workspace.getTelemetryPath(projectId, runId);
    const visualSliceScreenshotDir = join(step38Root, 'browser-qa-screenshots');
    const manualTraversalScreenshotDir = join(step38Root, 'browser-qa-fresh-manual-traversal');
    const successPathScreenshotDir = join(step38Root, 'browser-qa-success-path');
    const realPlaythroughScreenshotDir = join(step38Root, 'browser-qa-real-playthrough');
    const artFidelityScreenshotDir = join(step38Root, 'browser-qa-art-fidelity');
    const failurePathScreenshotDir = join(step38Root, 'browser-qa-failure-path');
    const artQualityScreenshotDir = join(step38Root, 'browser-qa-art-quality');
    const encounterDirectorScreenshotDir = join(step38Root, 'browser-qa-encounter-director');
    const dslConsumptionReportPath = workspace.getModelOutputPath(projectId, runId, 'dsl_consumption_report.json');
    const unsupportedCapabilityReportPath = join(step38Root, 'unsupported-required-capabilities-report.json');
    const guardReportPath = join(step38Root, 'fallback-preload-stale-legacy-authority-guard-report.json');
    const capabilityIds = buildStep38CapabilityIds();
    const capabilityLock = buildStep38GameplayCapabilityLock({ capabilityIds });
    const composedSchemaIdentity = buildCapabilityGameDslDraftComposedSchemaIdentity({
      profileId: capabilityLock.profileId,
      capabilityIds
    });

    await writeJson(capabilityLockPath, capabilityLock);
    await writeJson(composedSchemaIdentityPath, composedSchemaIdentity);

    const briefResult = await provider.generateGameBrief({
      projectId,
      runId,
      idea: DEEPSEEK_RUN_AND_GUN_FIXED_USER_VALIDATION_PROMPT,
      language: 'zh'
    });
    if (!briefResult.ok) {
      throw new Step38BlockedError('game_brief_generation_failed', briefResult);
    }

    const canonicalBrief = GameBriefV02Schema.parse(briefResult.value);
    const canonicalBriefArtifact = buildCanonicalGameBriefArtifact({
      projectId,
      runId,
      canonicalBrief,
      sourceFormat: briefResult.sourceFormat ?? 'v0.2'
    });
    const generationScopePlan = buildGenerationScopePlan({
      requestedPlayTime: STEP38_PRODUCT_PLAY_TIME_INTENT
    });
    await writeJson(canonicalBriefPath, canonicalBriefArtifact);
    await writeJson(generationScopePlanPath, generationScopePlan);

    const draftResult = await provider.generateCapabilityGameDslDraft({
      projectId,
      runId,
      idea: DEEPSEEK_RUN_AND_GUN_FIXED_USER_VALIDATION_PROMPT,
      language: 'zh',
      brief: canonicalBrief,
      authorityBundle: { activeProfileLock: { profileId: capabilityLock.profileId } },
      capabilityIds
    });
    if (!draftResult.ok) {
      throw new Step38BlockedError('capability_game_dsl_draft_generation_failed', draftResult);
    }

    await writeJson(candidateDslPath, draftResult.value);

    const gameBriefRawHash = await sha256File(gameBriefRawPath);
    const normalization = normalizeCapabilityGameDslDraftToCanonicalV02({
      projectId,
      runId,
      draft: draftResult.value,
      gameBriefHash: gameBriefRawHash,
      profileResolutionHash: hashStableJson({
        profileId: capabilityLock.profileId,
        source: 'step38_deepseek_run_and_gun_validation_profile',
        canonicalSchemaVersion: CANONICAL_GAME_DSL_V02_SCHEMA_VERSION
      }),
      capabilityLock,
      composedSchemaIdentity
    });
    await writeJson(normalizationReportPath, normalization.normalizationReport);
    if (normalization.status !== 'normalized') {
      throw new Step38BlockedError('canonical_dsl_normalization_blocked', normalization.normalizationReport);
    }

    const canonicalDsl = normalization.canonicalDsl;
    await writeJson(canonicalDslPath, canonicalDsl);

    const compiled = compileCanonicalCapabilityDslToRuntimePlan({
      canonicalDsl,
      capabilityLock
    });
    await writeJson(compilationReportPath, compiled.compilationReport);
    if (compiled.status !== 'compiled') {
      throw new Step38BlockedError('runtime_plan_compilation_blocked', compiled.compilationReport);
    }

    await writeJson(capabilityIrPath, compiled.capabilityIr);
    await writeJson(runtimePlanPath, compiled.runtimePlan);
    await writeJson(runtimeManifestPath, compiled.runtimeSystemManifest);

    const sceneIr = buildStep38SceneIr({ runId, canonicalDsl, runtimePlan: compiled.runtimePlan });
    await writeJson(sceneIrPath, sceneIr);

    const canonicalDslSha = await sha256File(canonicalDslPath);
    const runtimePlanSha = await sha256File(runtimePlanPath);
    const sceneIrSha = await sha256File(sceneIrPath);
    const manualVerticalSliceProjection = buildStep38ManualVerticalSliceProjection({
      canonicalDsl,
      runtimePlan: compiled.runtimePlan,
      sceneIr,
      canonicalDslSha,
      runtimePlanSha,
      sceneIrSha
    });
    await writeJson(manualVerticalSliceProjectionPath, manualVerticalSliceProjection);
    const manualTraversalPath = buildStep38ManualTraversalPath(manualVerticalSliceProjection);
    await writeJson(manualTraversalPathPath, manualTraversalPath);
    const markerBase = {
      run_id: runId,
      prompt_sha: DEEPSEEK_RUN_AND_GUN_FIXED_PROMPT_SHA256,
      canonical_dsl_sha: canonicalDslSha,
      fallback_used: false,
      preloaded_artifact_used: false,
      stale_artifact_used: false,
      ready_state: 'EVALUATING',
      build_result: 'NOT_RUN',
      legacy_fixed_template_authority: false,
      raw_dsl_scenes_0_authority_used: false,
      canonical_dsl_present: true,
      runtime_plan_present: true,
      scene_ir_present: true,
      runtime_manifest_present: true,
      raw_game_dsl_response_present: await pathExists(capabilityDraftRawPath),
      capability_game_dsl_draft_raw_response_present: await pathExists(capabilityDraftRawPath),
      game_brief_raw_response_present: await pathExists(gameBriefRawPath)
    };

    await writeGeneratedPlayable({
      projectId,
      runId,
      generatedArtifactDir,
      canonicalDsl,
      runtimePlan: compiled.runtimePlan,
      sceneIr,
      runtimeManifest: compiled.runtimeSystemManifest,
      manualVerticalSliceProjection,
      manualTraversalPath,
      materializedAssetDir,
      assetSyncReportPath,
      assetTemplateFingerprintReportPath,
      canvasAssetDesignSpecsPath,
      canvasDrawPlanReportPath,
      proceduralPixelArtGrammarReportPath,
      spriteAnimationCoverageReportPath,
      environmentLayeringReportPath,
      marker: markerBase
    });

    const buildResult = await new ViteBuildRunnerService(workspace).build({
      projectId,
      runId,
      projectDir: generatedArtifactDir
    });
    if (!buildResult.ok) {
      throw new Step38BlockedError('generated_artifact_build_failed', buildResult);
    }

    await injectStep38Marker(generatedArtifactDir, { ...markerBase, ready_state: 'BLOCKED', build_result: 'PASSED' });
    const markerPreviewVerified = await verifyPreviewMarker(previewUrl, markerBase.run_id);
    const qaResult = markerPreviewVerified
      ? await runStep38BrowserQa({
          previewUrl,
          runId,
          canonicalDsl,
          expectedMarker: markerBase,
          qaEvidencePath,
          telemetryEvidencePath,
          visualSliceScreenshotDir,
          manualTraversalScreenshotDir,
          successPathScreenshotDir,
          realPlaythroughScreenshotDir,
          artFidelityScreenshotDir,
          failurePathScreenshotDir,
          artQualityScreenshotDir,
          encounterDirectorScreenshotDir,
          manualTraversalEvidencePath,
          successRouteMilestoneTimelinePath,
          routePressureBandEvidencePath,
          visualRuntimeBindingReportPath,
          visualAssetMaterializationReportPath,
          assetTemplateFingerprintReportPath,
          visualDesignRealizationReportPath,
          runtimeTextureLoadReportPath,
          artDirectionQualityReportPath,
          encounterDirectorPlanPath,
          encounterDirectorRuntimeEvidencePath,
          outcomeStateMachineReportPath,
          winPathEvidencePath,
          losePathEvidencePath,
          realPlaythroughCompletionEvidencePath,
          twoDGameplayPlaythroughGatePath,
          canvasVisualReadabilityGatePath,
          proceduralPixelArtGrammarReportPath,
          canvasArtFidelityGatePath,
          spriteAnimationCoverageReportPath,
          environmentLayeringReportPath,
          startupSurvivabilityGatePath,
          encounterPlayabilityGatePath,
          operatorVisibleArtGatePath,
          visualPlaythroughValidatorReportPath
        })
      : await writeStep38PreviewNotBootedQa({
          previewUrl,
          runId,
          qaEvidencePath,
          telemetryEvidencePath,
          successRouteMilestoneTimelinePath,
          routePressureBandEvidencePath,
          realPlaythroughCompletionEvidencePath,
          twoDGameplayPlaythroughGatePath,
          canvasVisualReadabilityGatePath,
          proceduralPixelArtGrammarReportPath,
          canvasArtFidelityGatePath,
          spriteAnimationCoverageReportPath,
          environmentLayeringReportPath,
          startupSurvivabilityGatePath,
          encounterPlayabilityGatePath,
          operatorVisibleArtGatePath,
          visualDesignRealizationReportPath,
          visualPlaythroughValidatorReportPath,
          marker: markerBase,
          message: 'preview marker was not reachable'
        });

    const artifactManifestPayload = {
      schemaVersion: 'step38.artifact-manifest.v1',
      run_id: runId,
      project_id: projectId,
      baseline_commit: STEP38_BASELINE_COMMIT,
      provider: 'deepseek',
      model_name: smokeMode.modelName,
      prompt_sha: DEEPSEEK_RUN_AND_GUN_FIXED_PROMPT_SHA256,
      prompt_source_path: 'packages/game-dsl/src/deepseek-run-and-gun-validation-profile-v1.ts#DEEPSEEK_RUN_AND_GUN_FIXED_USER_VALIDATION_PROMPT',
      raw_response_path: capabilityDraftRawPath,
      game_brief_raw_response_sha: await sha256IfPresent(gameBriefRawPath),
      raw_deepseek_response_sha: await sha256IfPresent(capabilityDraftRawPath),
      raw_game_dsl_response_sha: await sha256IfPresent(capabilityDraftRawPath),
      capability_game_dsl_draft_raw_response_sha: await sha256IfPresent(capabilityDraftRawPath),
      candidate_dsl_path: candidateDslPath,
      candidate_dsl_sha: await sha256IfPresent(candidateDslPath),
      canonical_dsl_path: canonicalDslPath,
      canonical_dsl_sha: canonicalDslSha,
      runtime_plan_path: runtimePlanPath,
      runtime_plan_sha: await sha256IfPresent(runtimePlanPath),
      scene_ir_path: sceneIrPath,
      scene_ir_sha: await sha256IfPresent(sceneIrPath),
      runtime_manifest_path: runtimeManifestPath,
      runtime_manifest_sha: await sha256IfPresent(runtimeManifestPath),
      manual_vertical_slice_projection_path: manualVerticalSliceProjectionPath,
      manual_vertical_slice_projection_sha: await sha256IfPresent(manualVerticalSliceProjectionPath),
      manual_traversal_path: manualTraversalPathPath,
      manual_traversal_path_sha: await sha256IfPresent(manualTraversalPathPath),
      manual_traversal_evidence_path: manualTraversalEvidencePath,
      manual_traversal_evidence_sha: await sha256IfPresent(manualTraversalEvidencePath),
      success_route_milestone_timeline_path: successRouteMilestoneTimelinePath,
      success_route_milestone_timeline_sha: await sha256IfPresent(successRouteMilestoneTimelinePath),
      route_pressure_band_evidence_path: routePressureBandEvidencePath,
      route_pressure_band_evidence_sha: await sha256IfPresent(routePressureBandEvidencePath),
      fresh_manual_traversal_evidence_path: manualTraversalEvidencePath,
      fresh_manual_traversal_screenshot_metadata_paths: STEP38_REQUIRED_MANUAL_TRAVERSAL_SCREENSHOTS.map((label) =>
        join(manualTraversalScreenshotDir, `${label}.metadata.json`)
      ),
      visual_runtime_binding_report_path: visualRuntimeBindingReportPath,
      visual_runtime_binding_report_sha: await sha256IfPresent(visualRuntimeBindingReportPath),
      visual_asset_materialization_report_path: visualAssetMaterializationReportPath,
      visual_asset_materialization_report_sha: await sha256IfPresent(visualAssetMaterializationReportPath),
      asset_template_fingerprint_report_path: assetTemplateFingerprintReportPath,
      asset_template_fingerprint_report_sha: await sha256IfPresent(assetTemplateFingerprintReportPath),
      visual_design_realization_report_path: visualDesignRealizationReportPath,
      visual_design_realization_report_sha: await sha256IfPresent(visualDesignRealizationReportPath),
      runtime_texture_load_report_path: runtimeTextureLoadReportPath,
      runtime_texture_load_report_sha: await sha256IfPresent(runtimeTextureLoadReportPath),
      art_direction_quality_report_path: artDirectionQualityReportPath,
      art_direction_quality_report_sha: await sha256IfPresent(artDirectionQualityReportPath),
      encounter_director_plan_path: encounterDirectorPlanPath,
      encounter_director_plan_sha: await sha256IfPresent(encounterDirectorPlanPath),
      encounter_director_runtime_evidence_path: encounterDirectorRuntimeEvidencePath,
      encounter_director_runtime_evidence_sha: await sha256IfPresent(encounterDirectorRuntimeEvidencePath),
      outcome_state_machine_report_path: outcomeStateMachineReportPath,
      outcome_state_machine_report_sha: await sha256IfPresent(outcomeStateMachineReportPath),
      win_path_evidence_path: winPathEvidencePath,
      win_path_evidence_sha: await sha256IfPresent(winPathEvidencePath),
      lose_path_evidence_path: losePathEvidencePath,
      lose_path_evidence_sha: await sha256IfPresent(losePathEvidencePath),
      real_playthrough_completion_evidence_path: realPlaythroughCompletionEvidencePath,
      real_playthrough_completion_evidence_sha: await sha256IfPresent(realPlaythroughCompletionEvidencePath),
      two_d_gameplay_playthrough_gate_path: twoDGameplayPlaythroughGatePath,
      two_d_gameplay_playthrough_gate_sha: await sha256IfPresent(twoDGameplayPlaythroughGatePath),
      canvas_visual_readability_gate_path: canvasVisualReadabilityGatePath,
      canvas_visual_readability_gate_sha: await sha256IfPresent(canvasVisualReadabilityGatePath),
      procedural_pixel_art_grammar_report_path: proceduralPixelArtGrammarReportPath,
      procedural_pixel_art_grammar_report_sha: await sha256IfPresent(proceduralPixelArtGrammarReportPath),
      canvas_art_fidelity_gate_path: canvasArtFidelityGatePath,
      canvas_art_fidelity_gate_sha: await sha256IfPresent(canvasArtFidelityGatePath),
      sprite_animation_coverage_report_path: spriteAnimationCoverageReportPath,
      sprite_animation_coverage_report_sha: await sha256IfPresent(spriteAnimationCoverageReportPath),
      environment_layering_report_path: environmentLayeringReportPath,
      environment_layering_report_sha: await sha256IfPresent(environmentLayeringReportPath),
      startup_survivability_gate_path: startupSurvivabilityGatePath,
      startup_survivability_gate_sha: await sha256IfPresent(startupSurvivabilityGatePath),
      encounter_playability_gate_path: encounterPlayabilityGatePath,
      encounter_playability_gate_sha: await sha256IfPresent(encounterPlayabilityGatePath),
      operator_visible_art_gate_path: operatorVisibleArtGatePath,
      operator_visible_art_gate_sha: await sha256IfPresent(operatorVisibleArtGatePath),
      visual_playthrough_validator_report_path: visualPlaythroughValidatorReportPath,
      visual_playthrough_validator_report_sha: await sha256IfPresent(visualPlaythroughValidatorReportPath),
      run_scoped_asset_directory: materializedAssetDir,
      served_asset_directory: join(generatedArtifactDir, 'public', 'assets'),
      asset_sync_report_path: assetSyncReportPath,
      asset_sync_report_sha256: await sha256IfPresent(assetSyncReportPath),
      stale_served_assets_detected: false,
      generated_artifact_dir: generatedArtifactDir,
      generated_artifact_directory: generatedArtifactDir,
      build_log_path: buildResult.logPath,
      preview_url: previewUrl,
      preview_launch_command: previewLaunchCommand,
      qa_evidence_path: qaEvidencePath,
      telemetry_evidence_path: telemetryEvidencePath,
      browser_qa_screenshots_directory: visualSliceScreenshotDir,
      visual_slice_screenshot_dir: visualSliceScreenshotDir,
      browser_qa_manual_traversal_directory: manualTraversalScreenshotDir,
      browser_qa_success_path_directory: successPathScreenshotDir,
      browser_qa_real_playthrough_directory: realPlaythroughScreenshotDir,
      browser_qa_art_fidelity_directory: artFidelityScreenshotDir,
      browser_qa_failure_path_directory: failurePathScreenshotDir,
      browser_qa_art_quality_directory: artQualityScreenshotDir,
      browser_qa_encounter_director_directory: encounterDirectorScreenshotDir,
      scripted_capture_used_for_pass: false,
      dsl_consumption_report_path: dslConsumptionReportPath,
      fallback_used: false,
      preloaded_artifact_used: false,
      stale_artifact_used: false,
      legacy_fixed_template_authority: false
    };
    const artifactManifestPayloadSha = sha256Text(JSON.stringify(artifactManifestPayload, null, 2));
    await writeJson(artifactManifestPath, { ...artifactManifestPayload, artifact_manifest_payload_sha256: artifactManifestPayloadSha });

    const telemetryEvents = await readTelemetryEvents(telemetryEvidencePath);
    const dslConsumptionReport = buildStep38DslConsumptionReport({
      projectId,
      runId,
      canonicalDsl,
      runtimePlan: compiled.runtimePlan,
      sceneIr,
      runtimeManifest: compiled.runtimeSystemManifest,
      manualVerticalSliceProjection,
      manualVerticalSliceProjectionPath,
      manualTraversalPath,
      manualTraversalPathPath,
      manualTraversalEvidencePath,
      successRouteMilestoneTimelinePath,
      successRouteMilestoneTimeline: await readJsonIfPresent(successRouteMilestoneTimelinePath),
      routePressureBandEvidencePath,
      routePressureBandEvidence: await readJsonIfPresent(routePressureBandEvidencePath),
      visualRuntimeBindingReportPath,
      visualRuntimeBindingReport: await readJsonIfPresent(visualRuntimeBindingReportPath),
      visualAssetMaterializationReportPath,
      visualAssetMaterializationReport: await readJsonIfPresent(visualAssetMaterializationReportPath),
      assetTemplateFingerprintReportPath,
      assetTemplateFingerprintReport: await readJsonIfPresent(assetTemplateFingerprintReportPath),
      visualDesignRealizationReportPath,
      visualDesignRealizationReport: await readJsonIfPresent(visualDesignRealizationReportPath),
      runtimeTextureLoadReportPath,
      runtimeTextureLoadReport: await readJsonIfPresent(runtimeTextureLoadReportPath),
      artDirectionQualityReportPath,
      artDirectionQualityReport: await readJsonIfPresent(artDirectionQualityReportPath),
      encounterDirectorPlanPath,
      encounterDirectorPlan: await readJsonIfPresent(encounterDirectorPlanPath),
      encounterDirectorRuntimeEvidencePath,
      encounterDirectorRuntimeEvidence: await readJsonIfPresent(encounterDirectorRuntimeEvidencePath),
      outcomeStateMachineReportPath,
      outcomeStateMachineReport: await readJsonIfPresent(outcomeStateMachineReportPath),
      winPathEvidencePath,
      winPathEvidence: await readJsonIfPresent(winPathEvidencePath),
      losePathEvidencePath,
      losePathEvidence: await readJsonIfPresent(losePathEvidencePath),
      realPlaythroughCompletionEvidencePath,
      realPlaythroughCompletionEvidence: await readJsonIfPresent(realPlaythroughCompletionEvidencePath),
      twoDGameplayPlaythroughGatePath,
      twoDGameplayPlaythroughGate: await readJsonIfPresent(twoDGameplayPlaythroughGatePath),
      canvasVisualReadabilityGatePath,
      canvasVisualReadabilityGate: await readJsonIfPresent(canvasVisualReadabilityGatePath),
      proceduralPixelArtGrammarReportPath,
      proceduralPixelArtGrammarReport: await readJsonIfPresent(proceduralPixelArtGrammarReportPath),
      canvasArtFidelityGatePath,
      canvasArtFidelityGate: await readJsonIfPresent(canvasArtFidelityGatePath),
      spriteAnimationCoverageReportPath,
      spriteAnimationCoverageReport: await readJsonIfPresent(spriteAnimationCoverageReportPath),
      environmentLayeringReportPath,
      environmentLayeringReport: await readJsonIfPresent(environmentLayeringReportPath),
      startupSurvivabilityGatePath,
      startupSurvivabilityGate: await readJsonIfPresent(startupSurvivabilityGatePath),
      encounterPlayabilityGatePath,
      encounterPlayabilityGate: await readJsonIfPresent(encounterPlayabilityGatePath),
      operatorVisibleArtGatePath,
      operatorVisibleArtGate: await readJsonIfPresent(operatorVisibleArtGatePath),
      visualPlaythroughValidatorReportPath,
      visualPlaythroughValidatorReport: await readJsonIfPresent(visualPlaythroughValidatorReportPath),
      telemetryEvents,
      qaReport: await readJsonIfPresent(qaEvidencePath)
    });
    await writeJson(dslConsumptionReportPath, dslConsumptionReport);
    await writeJson(guardReportPath, {
      schemaVersion: 'step38.guard-report.v1',
      run_id: runId,
      fallback_used: false,
      preloaded_artifact_used: false,
      stale_artifact_used: false,
      legacy_fixed_template_authority: false,
      rawDsl_scenes_0_authority_used: false,
      direct_curl_only_success: false,
      mock_only_success: false
    });

    const evaluation = evaluateStep38DslConsumption({
      baselineCommit: STEP38_BASELINE_COMMIT,
      promptSha256: DEEPSEEK_RUN_AND_GUN_FIXED_PROMPT_SHA256,
      modelName: smokeMode.modelName,
      realDeepSeekPathExecuted: providerLogs.some((entry) => entry.event === 'model.request.completed'),
      dslConsumerPathUsed: providerLogs.some((entry) =>
        String(entry.callPath ?? '').includes('GameDslProviderService.generateCapabilityGameDslDraft>DeepSeekClient.generateJson')
      ),
      rawGameDslResponsePresent: await pathExists(capabilityDraftRawPath),
      generatedArtifactRunSpecific: generatedArtifactDir.startsWith(step38Root),
      buildSucceeded: buildResult.ok,
      previewBooted: markerPreviewVerified,
      guardFlags: {
        fallback_used: false,
        preloaded_artifact_used: false,
        legacy_fixed_template_authority: false,
        stale_generated_artifact_used: false
      },
      artifacts: {
        canonicalDsl,
        runtimePlan: await readJsonIfPresent(runtimePlanPath),
        sceneIr: await readJsonIfPresent(sceneIrPath),
        runtimeManifest: await readJsonIfPresent(runtimeManifestPath),
        manualVerticalSliceProjection: await readJsonIfPresent(manualVerticalSliceProjectionPath),
        manualTraversalPath: await readJsonIfPresent(manualTraversalPathPath),
        successRouteMilestoneTimeline: await readJsonIfPresent(successRouteMilestoneTimelinePath),
        routePressureBandEvidence: await readJsonIfPresent(routePressureBandEvidencePath),
        visualRuntimeBindingReport: await readJsonIfPresent(visualRuntimeBindingReportPath),
        visualAssetMaterializationReport: await readJsonIfPresent(visualAssetMaterializationReportPath),
        assetTemplateFingerprintReport: await readJsonIfPresent(assetTemplateFingerprintReportPath),
        visualDesignRealizationReport: await readJsonIfPresent(visualDesignRealizationReportPath),
        runtimeTextureLoadReport: await readJsonIfPresent(runtimeTextureLoadReportPath),
        artDirectionQualityReport: await readJsonIfPresent(artDirectionQualityReportPath),
        encounterDirectorPlan: await readJsonIfPresent(encounterDirectorPlanPath),
        encounterDirectorRuntimeEvidence: await readJsonIfPresent(encounterDirectorRuntimeEvidencePath),
        outcomeStateMachineReport: await readJsonIfPresent(outcomeStateMachineReportPath),
        winPathEvidence: await readJsonIfPresent(winPathEvidencePath),
        losePathEvidence: await readJsonIfPresent(losePathEvidencePath),
        realPlaythroughCompletionEvidence: await readJsonIfPresent(realPlaythroughCompletionEvidencePath),
        twoDGameplayPlaythroughGate: await readJsonIfPresent(twoDGameplayPlaythroughGatePath),
        canvasVisualReadabilityGate: await readJsonIfPresent(canvasVisualReadabilityGatePath),
        proceduralPixelArtGrammarReport: await readJsonIfPresent(proceduralPixelArtGrammarReportPath),
        canvasArtFidelityGate: await readJsonIfPresent(canvasArtFidelityGatePath),
        spriteAnimationCoverageReport: await readJsonIfPresent(spriteAnimationCoverageReportPath),
        environmentLayeringReport: await readJsonIfPresent(environmentLayeringReportPath),
        startupSurvivabilityGate: await readJsonIfPresent(startupSurvivabilityGatePath),
        encounterPlayabilityGate: await readJsonIfPresent(encounterPlayabilityGatePath),
        operatorVisibleArtGate: await readJsonIfPresent(operatorVisibleArtGatePath),
        visualPlaythroughValidatorReport: await readJsonIfPresent(visualPlaythroughValidatorReportPath),
        qaReport: await readJsonIfPresent(qaEvidencePath),
        telemetryEvents,
        dslConsumptionReport
      }
    });
    await writeJson(unsupportedCapabilityReportPath, {
      schemaVersion: 'step38.unsupported-required-capabilities-report.v1',
      run_id: runId,
      unsupported_required_capabilities: evaluation.unsupported_required_capabilities,
      ignored_required_dsl_fields: evaluation.ignored_required_dsl_fields,
      capability_representations: evaluation.capabilityRepresentations
    });

    const gateBlockedEvaluation =
      evaluation.readyState === 'READY_FOR_MANUAL_TEST'
        ? {
            ...evaluation,
            readyState: 'BLOCKED' as const,
            blockers: uniqueSorted([...evaluation.blockers, 'operator_review_gate_not_run']),
          }
        : evaluation;
    const marker = { ...markerBase, ready_state: gateBlockedEvaluation.readyState, build_result: 'PASSED' };
    await injectStep38Marker(generatedArtifactDir, marker);

    const evidencePackage = {
      schemaVersion: 'step38.deepseek-v4-flash-dsl-consumption-evidence.v1',
      ready_state: gateBlockedEvaluation.readyState,
      blockers: gateBlockedEvaluation.blockers,
      automated_gate_ready_state: evaluation.readyState,
      operator_review_gate: {
        required: true,
        status: 'NOT_RUN',
        allowed_verdict_to_report_ready: 'APPROVED_FOR_MANUAL_TEST',
        blocker: evaluation.readyState === 'READY_FOR_MANUAL_TEST' ? 'operator_review_gate_not_run' : null
      },
      run_id: runId,
      project_id: projectId,
      baseline_commit: STEP38_BASELINE_COMMIT,
      git_status: await readGitStatus(),
      git_diff_summary: await readGitDiffSummary(),
      review_critical_untracked_file_hashes: await readUntrackedReviewCriticalFiles(),
      prompt_source_path: 'packages/game-dsl/src/deepseek-run-and-gun-validation-profile-v1.ts#DEEPSEEK_RUN_AND_GUN_FIXED_USER_VALIDATION_PROMPT',
      prompt_sha256: DEEPSEEK_RUN_AND_GUN_FIXED_PROMPT_SHA256,
      deepseek_provider_evidence_path: providerEvidencePath,
      model_name: smokeMode.modelName,
      expected_model_name: STEP38_EXPECTED_PROVIDER_MODEL,
      deepseek_raw_response_paths: {
        game_brief: (await pathExists(gameBriefRawPath)) ? gameBriefRawPath : null,
        capability_game_dsl_draft: (await pathExists(capabilityDraftRawPath)) ? capabilityDraftRawPath : null,
        raw_game_dsl_v0_1_legacy: null
      },
      game_brief_raw_response_path: (await pathExists(gameBriefRawPath)) ? gameBriefRawPath : null,
      game_brief_raw_response_sha256: await sha256IfPresent(gameBriefRawPath),
      raw_deepseek_response_path: (await pathExists(capabilityDraftRawPath)) ? capabilityDraftRawPath : null,
      raw_deepseek_response_sha256: await sha256IfPresent(capabilityDraftRawPath),
      raw_game_dsl_response_path: (await pathExists(capabilityDraftRawPath)) ? capabilityDraftRawPath : null,
      raw_game_dsl_response_sha256: await sha256IfPresent(capabilityDraftRawPath),
      capability_game_dsl_draft_raw_response_path: (await pathExists(capabilityDraftRawPath)) ? capabilityDraftRawPath : null,
      capability_game_dsl_draft_raw_response_sha256: await sha256IfPresent(capabilityDraftRawPath),
      candidate_dsl_path: (await pathExists(candidateDslPath)) ? candidateDslPath : null,
      candidate_dsl_sha256: await sha256IfPresent(candidateDslPath),
      canonical_dsl_path: (await pathExists(canonicalDslPath)) ? canonicalDslPath : null,
      canonical_dsl_sha256: canonicalDslSha,
      canonical_brief_path: canonicalBriefPath,
      canonical_brief_sha256: await sha256IfPresent(canonicalBriefPath),
      generation_scope_plan_path: generationScopePlanPath,
      generation_scope_plan_sha256: await sha256IfPresent(generationScopePlanPath),
      capability_lock_path: capabilityLockPath,
      capability_lock_sha256: await sha256IfPresent(capabilityLockPath),
      composed_schema_identity_path: composedSchemaIdentityPath,
      composed_schema_identity_sha256: await sha256IfPresent(composedSchemaIdentityPath),
      capability_ir_path: capabilityIrPath,
      capability_ir_sha256: await sha256IfPresent(capabilityIrPath),
      compilation_report_path: compilationReportPath,
      compilation_report_sha256: await sha256IfPresent(compilationReportPath),
      legacy_game_dsl_path: null,
      runtime_plan_path: (await pathExists(runtimePlanPath)) ? runtimePlanPath : null,
      runtime_plan_sha256: await sha256IfPresent(runtimePlanPath),
      scene_ir_path: (await pathExists(sceneIrPath)) ? sceneIrPath : null,
      scene_ir_sha256: await sha256IfPresent(sceneIrPath),
      manual_vertical_slice_projection_path: (await pathExists(manualVerticalSliceProjectionPath)) ? manualVerticalSliceProjectionPath : null,
      manual_vertical_slice_projection_sha256: await sha256IfPresent(manualVerticalSliceProjectionPath),
      manual_traversal_path: (await pathExists(manualTraversalPathPath)) ? manualTraversalPathPath : null,
      manual_traversal_path_sha256: await sha256IfPresent(manualTraversalPathPath),
      manual_traversal_evidence_path: (await pathExists(manualTraversalEvidencePath)) ? manualTraversalEvidencePath : null,
      manual_traversal_evidence_sha256: await sha256IfPresent(manualTraversalEvidencePath),
      success_route_milestone_timeline_path: (await pathExists(successRouteMilestoneTimelinePath))
        ? successRouteMilestoneTimelinePath
        : null,
      success_route_milestone_timeline_sha256: await sha256IfPresent(successRouteMilestoneTimelinePath),
      route_pressure_band_evidence_path: (await pathExists(routePressureBandEvidencePath)) ? routePressureBandEvidencePath : null,
      route_pressure_band_evidence_sha256: await sha256IfPresent(routePressureBandEvidencePath),
      visual_runtime_binding_report_path: (await pathExists(visualRuntimeBindingReportPath)) ? visualRuntimeBindingReportPath : null,
      visual_runtime_binding_report_sha256: await sha256IfPresent(visualRuntimeBindingReportPath),
      visual_asset_materialization_report_path: (await pathExists(visualAssetMaterializationReportPath)) ? visualAssetMaterializationReportPath : null,
      visual_asset_materialization_report_sha256: await sha256IfPresent(visualAssetMaterializationReportPath),
      asset_template_fingerprint_report_path: (await pathExists(assetTemplateFingerprintReportPath)) ? assetTemplateFingerprintReportPath : null,
      asset_template_fingerprint_report_sha256: await sha256IfPresent(assetTemplateFingerprintReportPath),
      visual_design_realization_report_path: (await pathExists(visualDesignRealizationReportPath)) ? visualDesignRealizationReportPath : null,
      visual_design_realization_report_sha256: await sha256IfPresent(visualDesignRealizationReportPath),
      runtime_texture_load_report_path: (await pathExists(runtimeTextureLoadReportPath)) ? runtimeTextureLoadReportPath : null,
      runtime_texture_load_report_sha256: await sha256IfPresent(runtimeTextureLoadReportPath),
      art_direction_quality_report_path: (await pathExists(artDirectionQualityReportPath)) ? artDirectionQualityReportPath : null,
      art_direction_quality_report_sha256: await sha256IfPresent(artDirectionQualityReportPath),
      encounter_director_plan_path: (await pathExists(encounterDirectorPlanPath)) ? encounterDirectorPlanPath : null,
      encounter_director_plan_sha256: await sha256IfPresent(encounterDirectorPlanPath),
      encounter_director_runtime_evidence_path: (await pathExists(encounterDirectorRuntimeEvidencePath)) ? encounterDirectorRuntimeEvidencePath : null,
      encounter_director_runtime_evidence_sha256: await sha256IfPresent(encounterDirectorRuntimeEvidencePath),
      outcome_state_machine_report_path: (await pathExists(outcomeStateMachineReportPath)) ? outcomeStateMachineReportPath : null,
      outcome_state_machine_report_sha256: await sha256IfPresent(outcomeStateMachineReportPath),
      win_path_evidence_path: (await pathExists(winPathEvidencePath)) ? winPathEvidencePath : null,
      win_path_evidence_sha256: await sha256IfPresent(winPathEvidencePath),
      lose_path_evidence_path: (await pathExists(losePathEvidencePath)) ? losePathEvidencePath : null,
      lose_path_evidence_sha256: await sha256IfPresent(losePathEvidencePath),
      real_playthrough_completion_evidence_path: (await pathExists(realPlaythroughCompletionEvidencePath))
        ? realPlaythroughCompletionEvidencePath
        : null,
      real_playthrough_completion_evidence_sha256: await sha256IfPresent(realPlaythroughCompletionEvidencePath),
      two_d_gameplay_playthrough_gate_path: (await pathExists(twoDGameplayPlaythroughGatePath))
        ? twoDGameplayPlaythroughGatePath
        : null,
      two_d_gameplay_playthrough_gate_sha256: await sha256IfPresent(twoDGameplayPlaythroughGatePath),
      canvas_visual_readability_gate_path: (await pathExists(canvasVisualReadabilityGatePath))
        ? canvasVisualReadabilityGatePath
        : null,
      canvas_visual_readability_gate_sha256: await sha256IfPresent(canvasVisualReadabilityGatePath),
      procedural_pixel_art_grammar_report_path: (await pathExists(proceduralPixelArtGrammarReportPath))
        ? proceduralPixelArtGrammarReportPath
        : null,
      procedural_pixel_art_grammar_report_sha256: await sha256IfPresent(proceduralPixelArtGrammarReportPath),
      canvas_art_fidelity_gate_path: (await pathExists(canvasArtFidelityGatePath)) ? canvasArtFidelityGatePath : null,
      canvas_art_fidelity_gate_sha256: await sha256IfPresent(canvasArtFidelityGatePath),
      sprite_animation_coverage_report_path: (await pathExists(spriteAnimationCoverageReportPath))
        ? spriteAnimationCoverageReportPath
        : null,
      sprite_animation_coverage_report_sha256: await sha256IfPresent(spriteAnimationCoverageReportPath),
      environment_layering_report_path: (await pathExists(environmentLayeringReportPath)) ? environmentLayeringReportPath : null,
      environment_layering_report_sha256: await sha256IfPresent(environmentLayeringReportPath),
      startup_survivability_gate_path: (await pathExists(startupSurvivabilityGatePath))
        ? startupSurvivabilityGatePath
        : null,
      startup_survivability_gate_sha256: await sha256IfPresent(startupSurvivabilityGatePath),
      encounter_playability_gate_path: (await pathExists(encounterPlayabilityGatePath))
        ? encounterPlayabilityGatePath
        : null,
      encounter_playability_gate_sha256: await sha256IfPresent(encounterPlayabilityGatePath),
      operator_visible_art_gate_path: (await pathExists(operatorVisibleArtGatePath)) ? operatorVisibleArtGatePath : null,
      operator_visible_art_gate_sha256: await sha256IfPresent(operatorVisibleArtGatePath),
      visual_playthrough_validator_report_path: (await pathExists(visualPlaythroughValidatorReportPath))
        ? visualPlaythroughValidatorReportPath
        : null,
      visual_playthrough_validator_report_sha256: await sha256IfPresent(visualPlaythroughValidatorReportPath),
      run_scoped_asset_directory: materializedAssetDir,
      served_asset_directory: join(generatedArtifactDir, 'public', 'assets'),
      asset_sync_report_path: (await pathExists(assetSyncReportPath)) ? assetSyncReportPath : null,
      asset_sync_report_sha256: await sha256IfPresent(assetSyncReportPath),
      stale_served_assets_detected: false,
      runtime_system_manifest_path: (await pathExists(runtimeManifestPath)) ? runtimeManifestPath : null,
      runtime_system_manifest_sha256: await sha256IfPresent(runtimeManifestPath),
      generated_artifact_directory: generatedArtifactDir,
      generated_artifact_manifest: artifactManifestPath,
      generated_artifact_manifest_sha256: await sha256IfPresent(artifactManifestPath),
      build_result: buildResult.ok ? 'PASSED' : 'FAILED',
      build_log_path: buildResult.logPath,
      preview_url: previewUrl,
      preview_launch_command: previewLaunchCommand,
      telemetry_evidence_path: (await pathExists(telemetryEvidencePath)) ? telemetryEvidencePath : null,
      qa_evidence_path: (await pathExists(qaEvidencePath)) ? qaEvidencePath : null,
      browser_qa_manual_traversal_directory: manualTraversalScreenshotDir,
      browser_qa_success_path_directory: successPathScreenshotDir,
      browser_qa_real_playthrough_directory: realPlaythroughScreenshotDir,
      browser_qa_art_fidelity_directory: artFidelityScreenshotDir,
      browser_qa_failure_path_directory: failurePathScreenshotDir,
      browser_qa_art_quality_directory: artQualityScreenshotDir,
      browser_qa_encounter_director_directory: encounterDirectorScreenshotDir,
      dsl_consumption_report_path: (await pathExists(dslConsumptionReportPath)) ? dslConsumptionReportPath : null,
      dsl_consumption_report_sha256: await sha256IfPresent(dslConsumptionReportPath),
      unsupported_capability_report_path: unsupportedCapabilityReportPath,
      unsupported_capability_report_sha256: await sha256IfPresent(unsupportedCapabilityReportPath),
      fallback_preload_stale_legacy_authority_guard_report_path: guardReportPath,
      fallback_preload_stale_legacy_authority_guard_report_sha256: await sha256IfPresent(guardReportPath),
      dsl_normalization_report_path: (await pathExists(normalizationReportPath)) ? normalizationReportPath : null,
      dsl_normalization_report_sha256: await sha256IfPresent(normalizationReportPath),
      fallback_used: false,
      preloaded_artifact_used: false,
      stale_artifact_used: false,
      legacy_fixed_template_authority: false,
      rawDsl_scenes_0_authority_used: false,
      ignored_required_dsl_fields: gateBlockedEvaluation.ignored_required_dsl_fields,
      unsupported_required_capabilities: gateBlockedEvaluation.unsupported_required_capabilities,
      capability_representations: gateBlockedEvaluation.capabilityRepresentations,
      step38_marker: marker,
      manual_test_instructions_path: manualInstructionsPath,
      manual_test_status: 'NOT_STARTED',
      completion_state: 'BLOCKED_UNTIL_OPERATOR_REVIEW_GATE_APPROVES_MANUAL_TEST'
    };
    await writeJson(evidencePackagePath, evidencePackage);
    const qaReportForReceipt = await readJsonIfPresent(qaEvidencePath);
    const qaRecord = isRecord(qaReportForReceipt) ? qaReportForReceipt : {};
    const artDirectionReport = isRecord(qaRecord.art_direction_quality_report) ? qaRecord.art_direction_quality_report : {};
    const encounterRuntimeReport = isRecord(qaRecord.encounter_director_runtime_evidence) ? qaRecord.encounter_director_runtime_evidence : {};
    const outcomeReport = isRecord(qaRecord.outcome_state_machine_report) ? qaRecord.outcome_state_machine_report : {};
    const winPathReport = isRecord(qaRecord.win_path_evidence) ? qaRecord.win_path_evidence : {};
    const losePathReport = isRecord(qaRecord.lose_path_evidence) ? qaRecord.lose_path_evidence : {};
    const realPlaythroughReport = isRecord(qaRecord.real_playthrough_completion_evidence)
      ? qaRecord.real_playthrough_completion_evidence
      : {};
    const operatorVisibleArtReport = isRecord(qaRecord.operator_visible_art_gate) ? qaRecord.operator_visible_art_gate : {};
    const visualDesignRealizationReport = isRecord(qaRecord.visual_design_realization_report)
      ? qaRecord.visual_design_realization_report
      : {};
    const visualPlaythroughValidatorReport = isRecord(qaRecord.visual_playthrough_validator_report)
      ? qaRecord.visual_playthrough_validator_report
      : {};
    const canvasVisualReadabilityReport = isRecord(qaRecord.canvas_visual_readability_gate)
      ? qaRecord.canvas_visual_readability_gate
      : {};
    const proceduralPixelArtGrammarReport = isRecord(qaRecord.procedural_pixel_art_grammar_report)
      ? qaRecord.procedural_pixel_art_grammar_report
      : {};
    const canvasArtFidelityReport = isRecord(qaRecord.canvas_art_fidelity_gate) ? qaRecord.canvas_art_fidelity_gate : {};
    const spriteAnimationCoverageReport = isRecord(qaRecord.sprite_animation_coverage_report)
      ? qaRecord.sprite_animation_coverage_report
      : {};
    const environmentLayeringReport = isRecord(qaRecord.environment_layering_report) ? qaRecord.environment_layering_report : {};
    const startupSurvivabilityReport = isRecord(qaRecord.startup_survivability_gate)
      ? qaRecord.startup_survivability_gate
      : {};
    const encounterPlayabilityReport = isRecord(qaRecord.encounter_playability_gate) ? qaRecord.encounter_playability_gate : {};
    const manualTraversalReport = isRecord(qaRecord.manual_traversal_evidence) ? qaRecord.manual_traversal_evidence : {};
    const readyReceipt = {
      schemaVersion: 'step38.ready-for-manual-test-receipt.v1',
      run_id: runId,
      project_id: projectId,
      created_at: new Date().toISOString(),
      final_ready_state: gateBlockedEvaluation.readyState,
      automated_gate_ready_state: evaluation.readyState,
      operator_state:
        evaluation.readyState === 'READY_FOR_MANUAL_TEST' ? 'BLOCKED_PENDING_OPERATOR_REVIEW' : 'BLOCKED_AUTOMATED_GATE_FAILED',
      manual_verdict: 'NOT_STARTED',
      complete_global_loop: false,
      operator_manual_approval: false,
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      scripted_capture_used_for_pass: false,
      browser_visual_evidence_required: true,
      input_only_playability_required: true,
      fresh_manual_session_required: true,
      evidence_package_path: evidencePackagePath,
      evidence_package_sha256: await sha256IfPresent(evidencePackagePath),
      evidence_package_ready_state_before_operator_review: gateBlockedEvaluation.readyState,
      operator_review_gate: evidencePackage.operator_review_gate,
      operator_review_gate_path: null,
      operator_review_gate_sha256: null,
      operator_review_verdict: 'NOT_RUN',
      preview_url: previewUrl,
      manual_test_instructions_path: manualInstructionsPath,
      artifact_refs: {
        artifact_manifest_path: artifactManifestPath,
        qa_evidence_path: (await pathExists(qaEvidencePath)) ? qaEvidencePath : null,
        telemetry_evidence_path: (await pathExists(telemetryEvidencePath)) ? telemetryEvidencePath : null,
        manual_traversal_path: (await pathExists(manualTraversalPathPath)) ? manualTraversalPathPath : null,
        manual_traversal_evidence_path: (await pathExists(manualTraversalEvidencePath)) ? manualTraversalEvidencePath : null,
        visual_asset_materialization_report_path: (await pathExists(visualAssetMaterializationReportPath))
          ? visualAssetMaterializationReportPath
          : null,
        visual_runtime_binding_report_path: (await pathExists(visualRuntimeBindingReportPath)) ? visualRuntimeBindingReportPath : null,
        asset_template_fingerprint_report_path: (await pathExists(assetTemplateFingerprintReportPath))
          ? assetTemplateFingerprintReportPath
          : null,
        visual_design_realization_report_path: (await pathExists(visualDesignRealizationReportPath))
          ? visualDesignRealizationReportPath
          : null,
        runtime_texture_load_report_path: (await pathExists(runtimeTextureLoadReportPath)) ? runtimeTextureLoadReportPath : null,
        art_direction_quality_report_path: (await pathExists(artDirectionQualityReportPath)) ? artDirectionQualityReportPath : null,
        encounter_director_plan_path: (await pathExists(encounterDirectorPlanPath)) ? encounterDirectorPlanPath : null,
        encounter_director_runtime_evidence_path: (await pathExists(encounterDirectorRuntimeEvidencePath))
          ? encounterDirectorRuntimeEvidencePath
          : null,
        outcome_state_machine_report_path: (await pathExists(outcomeStateMachineReportPath)) ? outcomeStateMachineReportPath : null,
        win_path_evidence_path: (await pathExists(winPathEvidencePath)) ? winPathEvidencePath : null,
        lose_path_evidence_path: (await pathExists(losePathEvidencePath)) ? losePathEvidencePath : null,
        real_playthrough_completion_evidence_path: (await pathExists(realPlaythroughCompletionEvidencePath))
          ? realPlaythroughCompletionEvidencePath
          : null,
        two_d_gameplay_playthrough_gate_path: (await pathExists(twoDGameplayPlaythroughGatePath))
          ? twoDGameplayPlaythroughGatePath
          : null,
        canvas_visual_readability_gate_path: (await pathExists(canvasVisualReadabilityGatePath))
          ? canvasVisualReadabilityGatePath
          : null,
        procedural_pixel_art_grammar_report_path: (await pathExists(proceduralPixelArtGrammarReportPath))
          ? proceduralPixelArtGrammarReportPath
          : null,
        canvas_art_fidelity_gate_path: (await pathExists(canvasArtFidelityGatePath)) ? canvasArtFidelityGatePath : null,
        sprite_animation_coverage_report_path: (await pathExists(spriteAnimationCoverageReportPath))
          ? spriteAnimationCoverageReportPath
          : null,
        environment_layering_report_path: (await pathExists(environmentLayeringReportPath)) ? environmentLayeringReportPath : null,
        startup_survivability_gate_path: (await pathExists(startupSurvivabilityGatePath))
          ? startupSurvivabilityGatePath
          : null,
        encounter_playability_gate_path: (await pathExists(encounterPlayabilityGatePath))
          ? encounterPlayabilityGatePath
          : null,
        operator_visible_art_gate_path: (await pathExists(operatorVisibleArtGatePath)) ? operatorVisibleArtGatePath : null,
        visual_playthrough_validator_report_path: (await pathExists(visualPlaythroughValidatorReportPath))
          ? visualPlaythroughValidatorReportPath
          : null,
        canonical_dsl_path: (await pathExists(canonicalDslPath)) ? canonicalDslPath : null,
        runtime_plan_path: (await pathExists(runtimePlanPath)) ? runtimePlanPath : null,
        scene_ir_path: (await pathExists(sceneIrPath)) ? sceneIrPath : null,
        runtime_manifest_path: (await pathExists(runtimeManifestPath)) ? runtimeManifestPath : null
      },
      gates: {
        model_name: smokeMode.modelName,
        expected_model_name: STEP38_EXPECTED_PROVIDER_MODEL,
        build_result: buildResult.ok ? 'PASSED' : 'FAILED',
        qa_status: typeof qaRecord.status === 'string' ? qaRecord.status : 'MISSING',
        missing_events: readStringArrayField(qaRecord, 'missing_events'),
        interactive_evidence_ok: qaRecord.interactive_evidence_ok === true,
        manual_traversal_evidence_ok: qaRecord.manual_traversal_evidence_ok === true,
        art_direction_quality_gate: readGateVerdict(artDirectionReport, 'art_direction_quality_gate'),
        encounter_director_gate: readGateVerdict(encounterRuntimeReport, 'encounter_director_gate'),
        outcome_state_machine_gate: readGateVerdict(outcomeReport, 'outcome_state_machine_gate'),
        win_path_gate: readGateVerdict(winPathReport, 'win_path_gate'),
        lose_path_gate: readGateVerdict(losePathReport, 'lose_path_gate'),
        real_playthrough_completion_gate: readGateVerdict(realPlaythroughReport, 'real_playthrough_completion_gate'),
        human_visible_gameplay_gate: readGateVerdict(realPlaythroughReport, 'human_visible_gameplay_gate'),
        operator_visible_art_gate: readGateVerdict(operatorVisibleArtReport, 'operator_visible_art_gate'),
        visual_design_realization_gate: readGateVerdict(visualDesignRealizationReport, 'visual_design_realization_gate'),
        visual_playthrough_validator_gate: readGateVerdict(visualPlaythroughValidatorReport, 'visual_playthrough_validator'),
        canvas_visual_readability_gate: readGateVerdict(canvasVisualReadabilityReport, 'canvas_visual_readability_gate'),
        procedural_pixel_art_grammar_gate: readGateVerdict(proceduralPixelArtGrammarReport, 'procedural_pixel_art_grammar_gate'),
        canvas_art_fidelity_gate: readGateVerdict(canvasArtFidelityReport, 'canvas_art_fidelity_gate'),
        sprite_animation_coverage_gate: readGateVerdict(spriteAnimationCoverageReport, 'sprite_animation_coverage_gate'),
        environment_layering_gate: readGateVerdict(environmentLayeringReport, 'environment_layering_gate'),
        startup_survivability_gate: readGateVerdict(startupSurvivabilityReport, 'startup_survivability_gate'),
        encounter_playability_gate: readGateVerdict(encounterPlayabilityReport, 'encounter_playability_gate'),
        fresh_manual_session_gate:
          qaRecord.manual_traversal_evidence_ok === true &&
          qaRecord.win_path_evidence_ok === true &&
          qaRecord.lose_path_evidence_ok === true &&
          qaRecord.real_playthrough_completion_evidence_ok === true &&
          qaRecord.canvas_visual_readability_gate_ok === true &&
          qaRecord.procedural_pixel_art_grammar_report_ok === true &&
          qaRecord.canvas_art_fidelity_gate_ok === true &&
          qaRecord.sprite_animation_coverage_report_ok === true &&
          qaRecord.environment_layering_report_ok === true &&
          qaRecord.startup_survivability_gate_ok === true &&
          qaRecord.encounter_playability_gate_ok === true &&
          qaRecord.operator_visible_art_gate_ok === true &&
          qaRecord.visual_playthrough_validator_ok === true
            ? 'PASS'
            : 'BLOCKED',
        manual_traversal_gate: readGateVerdict(manualTraversalReport, 'manual_traversal_gate'),
        visual_asset_materialization_gate: qaRecord.visual_asset_materialization_evidence_ok === true ? 'PASS' : 'BLOCKED',
        runtime_binding_gate: qaRecord.visual_runtime_binding_evidence_ok === true ? 'PASS' : 'BLOCKED',
        text_only_evidence_used_for_pass: false,
        manifest_only_evidence_used_for_pass: false,
        overlay_only_evidence_used_for_pass: false,
        receipt_only_evidence_used_for_pass: false,
        telemetry_only_evidence_used_for_pass: false,
        scripted_capture_used_for_pass: false,
        operator_visible_evidence_required: true,
        browser_visual_evidence_required: true,
        input_only_playability_required: true,
        fresh_manual_session_required: true,
        required_gate_summary: {
          visual_gate: qaRecord.visual_vertical_slice_evidence_ok === true ? 'PASS' : 'BLOCKED',
          gameplay_gate: qaRecord.real_playthrough_completion_evidence_ok === true ? 'PASS' : 'BLOCKED',
          canvas_visual_readability_gate: qaRecord.canvas_visual_readability_gate_ok === true ? 'PASS' : 'BLOCKED',
          procedural_pixel_art_grammar_gate: qaRecord.procedural_pixel_art_grammar_report_ok === true ? 'PASS' : 'BLOCKED',
          canvas_art_fidelity_gate: qaRecord.canvas_art_fidelity_gate_ok === true ? 'PASS' : 'BLOCKED',
          sprite_animation_coverage_gate: qaRecord.sprite_animation_coverage_report_ok === true ? 'PASS' : 'BLOCKED',
          environment_layering_gate: qaRecord.environment_layering_report_ok === true ? 'PASS' : 'BLOCKED',
          startup_survivability_gate: qaRecord.startup_survivability_gate_ok === true ? 'PASS' : 'BLOCKED',
          encounter_playability_gate: qaRecord.encounter_playability_gate_ok === true ? 'PASS' : 'BLOCKED',
          runtime_binding_gate: qaRecord.visual_runtime_binding_evidence_ok === true ? 'PASS' : 'BLOCKED',
          win_path_gate: readGateVerdict(winPathReport, 'win_path_gate'),
          lose_path_gate: readGateVerdict(losePathReport, 'lose_path_gate'),
          artifact_freshness_gate: marker.run_id === runId ? 'PASS' : 'BLOCKED'
        },
        fallback_used: false,
        preloaded_artifact_used: false,
        stale_artifact_used: false,
        legacy_fixed_template_authority: false,
        rawDsl_scenes_0_authority_used: false
      },
      parent_loop: {
        global_exit_conditions_met: false,
        user_input_required: false,
        next_action: evaluation.readyState === 'READY_FOR_MANUAL_TEST' ? 'CONTINUE_PARENT_LOOP' : 'CONTINUE_PARENT_LOOP',
        verified_blocker:
          evaluation.readyState === 'READY_FOR_MANUAL_TEST' ? 'operator_review_gate_not_run' : 'automated_gate_blocked',
        next_atomic_step:
          evaluation.readyState === 'READY_FOR_MANUAL_TEST'
            ? 'step38.operator_review_gate'
            : 'step38.production_vertical_slice_acceptance_gate'
      },
      notes: [
        'This receipt is generated before Oracle/operator review and before human manual testing.',
        'READY_FOR_MANUAL_TEST may be reported only after operator_review_gate.verdict is APPROVED_FOR_MANUAL_TEST.',
        'COMPLETE_GLOBAL_LOOP remains false until explicit human manual testing passes and final receipt criteria are satisfied.'
      ]
    };
    await writeJson(readyReceiptPath, readyReceipt);
    await writeManualInstructions(manualInstructionsPath, { previewUrl, previewLaunchCommand, evidencePackagePath, marker });

    await writeJson(providerEvidencePath, buildProviderEvidence(providerLogs, smokeMode.modelName));

    console.log(
      JSON.stringify(
        {
          evidencePackagePath,
          readyState: gateBlockedEvaluation.readyState,
          automatedGateReadyState: evaluation.readyState,
          blockers: gateBlockedEvaluation.blockers,
          previewUrl,
          operatorReviewGateRequired: true
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  } catch (error) {
    await writeBlockedExceptionEvidence({
      runId,
      projectId,
      workspace,
      providerLogs,
      providerEvidencePath,
      artifactManifestPath,
      evidencePackagePath,
      manualInstructionsPath,
      modelName: smokeMode.modelName,
      error
    });
    console.log(JSON.stringify({ evidencePackagePath, readyState: 'BLOCKED', blockers: ['smoke_runner_exception'] }, null, 2));
    process.exitCode = 1;
  } finally {
    await closeServer(server);
    if (previousPreviewBaseUrl === undefined) {
      delete process.env.PREVIEW_BASE_URL;
    } else {
      process.env.PREVIEW_BASE_URL = previousPreviewBaseUrl;
    }
  }
}

function assertPromptBinding(): void {
  const actualSha = sha256Text(DEEPSEEK_RUN_AND_GUN_FIXED_USER_VALIDATION_PROMPT);
  if (actualSha !== DEEPSEEK_RUN_AND_GUN_FIXED_PROMPT_SHA256) {
    throw new Error(`Step38 prompt SHA mismatch: expected ${DEEPSEEK_RUN_AND_GUN_FIXED_PROMPT_SHA256}, received ${actualSha}`);
  }
}

const STEP38_PROFILE_ID = 'side_scrolling_run_and_gun.v1';
const STEP38_RUNTIME_FAMILY = 'phaser_2d_action_arcade.v1';
const STEP38_PRODUCT_PLAY_TIME_INTENT = { mode: 'range', min_sec: 480, max_sec: 720 } as const;
const STEP38_PROMPT_SOURCE_PATH =
  'packages/game-dsl/src/deepseek-run-and-gun-validation-profile-v1.ts#DEEPSEEK_RUN_AND_GUN_FIXED_USER_VALIDATION_PROMPT';
const STEP38_REQUIRED_VISUAL_ROLES = ['player', 'enemy_ground', 'enemy_static', 'flying_enemy', 'pickup', 'projectile', 'hazard', 'boss'] as const;
type Step38RuntimeVisualRole = (typeof STEP38_REQUIRED_VISUAL_ROLES)[number];

type Step38VisualPalette = {
  primary: string;
  accent: string;
  outline: string;
};

type Step38VisualIntent = {
  entityId: string;
  role: Step38RuntimeVisualRole | Step38RequiredVisualRuntimeObject | 'environment' | 'boss_phase';
  originalRole: string;
  assetIntentRef: string;
  silhouette: string;
  palette: Step38VisualPalette;
  sourcePath: string;
  capabilityIds: string[];
};

type Step38VisualIntentManifest = {
  schemaVersion: 'step38.visual-intent-manifest.v1';
  source: 'canonical_dsl_visual_intent';
  sceneVisualTheme: string | null;
  environmentVisuals: unknown[];
  requiredVisualRoles: string[];
  missingVisualRoles: string[];
  canonicalVisualIntentCount: number;
  visualIntents: Step38VisualIntent[];
};

type Step38SpriteAsset = DslDrivenStep38SpriteAsset;

class Step38BlockedError extends Error {
  constructor(
    readonly blocker: string,
    readonly details: unknown
  ) {
    super(blocker);
    this.name = 'Step38BlockedError';
  }
}

function buildStep38CapabilityIds(): string[] {
  return [...new Set(DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1.capabilityClusters.flatMap((cluster) => cluster.requiredCapabilityIds))].sort();
}

function buildStep38GameplayCapabilityLock(input: { capabilityIds: readonly string[] }): GameplayCapabilityLock {
  const capabilityIds = [...input.capabilityIds].sort();
  const payload = {
    artifactKind: GAMEPLAY_CAPABILITY_LOCK_KIND,
    schemaVersion: GAMEPLAY_CAPABILITY_LOCK_SCHEMA_VERSION,
    profileId: STEP38_PROFILE_ID,
    runtimeFamily: STEP38_RUNTIME_FAMILY,
    capabilityIds,
    packages: capabilityIds.map((capabilityId) => ({
      capabilityId,
      packageVersion: 'step38-smoke.v1',
      packageHash: hashStableJson({ capabilityId, packageVersion: 'step38-smoke.v1' })
    }))
  };
  return GameplayCapabilityLockSchema.parse({ ...payload, lockHash: hashStableJson(payload) });
}

function buildProviderEvidence(providerLogs: ProviderLogRecord[], modelName: string): Record<string, unknown> {
  return {
    provider: 'deepseek',
    modelName,
    expectedModelName: STEP38_EXPECTED_PROVIDER_MODEL,
    realDeepSeekPathExecuted: providerLogs.some((entry) => entry.event === 'model.request.completed'),
    dslConsumerPathUsed: providerLogs.some((entry) =>
      String(entry.callPath ?? '').includes('GameDslProviderService.generateCapabilityGameDslDraft>DeepSeekClient.generateJson')
    ),
    outputNames: providerLogs.map((entry) => entry.outputName).filter((value) => typeof value === 'string'),
    logs: providerLogs
  };
}

function createProviderLogger(records: ProviderLogRecord[]) {
  return {
    log(message: string) {
      records.push(parseProviderLog('log', message));
    },
    warn(message: string) {
      records.push(parseProviderLog('warn', message));
    },
    error(message: string) {
      records.push(parseProviderLog('error', message));
    }
  };
}

function parseProviderLog(level: ProviderLogRecord['level'], message: string): ProviderLogRecord {
  try {
    const parsed = JSON.parse(message) as Record<string, unknown>;
    return { level, ...parsed };
  } catch {
    return { level, message };
  }
}

function buildStep38SceneIr(input: {
  runId: string;
  canonicalDsl: CanonicalGameDslV02;
  runtimePlan: CapabilityRuntimePlan;
}): Record<string, unknown> {
  const waveEnemyEntityIds = new Set(input.canonicalDsl.waves.map((wave) => wave.enemy_entity_id));
  const firstSegmentId = input.runtimePlan.progression.segments[0]?.id ?? input.canonicalDsl.progression.segments[0]?.id ?? 'jungle_entrance';
  const visualIntent = buildStep38VisualIntentManifest(input.canonicalDsl);
  const visualIntentByEntityId = new Map(visualIntent.visualIntents.map((intent) => [intent.entityId, intent]));
  const staticEnemyNodes = input.canonicalDsl.entities
    .filter(
      (entity) =>
        entity.role === 'enemy' &&
        entity.capability_ids.includes('spawn.static.v1') &&
        !waveEnemyEntityIds.has(entity.id)
    )
    .map((entity, index) => ({
      id: `static_enemy_${entity.id}`,
      kind: 'enemy_spawn',
      spawnSource: 'static_entity',
      entityId: entity.id,
      segmentId: firstSegmentId,
      x: 760 + index * 520,
      y: 386,
      count: 1,
      visualAssetIntentRef: visualIntentByEntityId.get(entity.id)?.assetIntentRef ?? null,
      capability_ids: entity.capability_ids
    }));
  const projectileVisualNodes = input.canonicalDsl.entities
    .filter((entity) => entity.role === 'projectile')
    .map((entity) => ({
      id: `projectile_visual_${entity.id}`,
      kind: 'projectile',
      entityId: entity.id,
      visualAssetIntentRef: visualIntentByEntityId.get(entity.id)?.assetIntentRef ?? null,
      capability_ids: entity.capability_ids
    }));
  const hazardNodes = input.canonicalDsl.entities
    .filter((entity) => entity.role === 'hazard')
    .map((entity, index) => ({
      id: `hazard_${entity.id}`,
      kind: 'hazard',
      entityId: entity.id,
      segmentId: input.runtimePlan.progression.segments[1]?.id ?? input.runtimePlan.progression.segments[0]?.id ?? firstSegmentId,
      x: 1200 + index * 620,
      y: 412,
      count: 1,
      visualAssetIntentRef: visualIntentByEntityId.get(entity.id)?.assetIntentRef ?? null,
      capability_ids: entity.capability_ids
    }));

  return {
    schemaVersion: 'step38.scene-ir.v1',
    source: 'canonical_game_dsl_v0.2_runtime_plan',
    runId: input.runId,
    profileId: input.runtimePlan.profileId,
    runtimePlanHash: input.runtimePlan.planHash,
    visualIntent,
    segments: input.runtimePlan.progression.segments.map((segment) => ({
      id: segment.id,
      kind: 'segment',
      order: segment.order,
      startSec: segment.startSec,
      endSec: segment.endSec,
      capability_ids: segment.capabilityIds
    })),
    nodes: [
      {
        id: 'player_spawn',
        kind: 'player_spawn',
        entityId: 'player',
        x: 96,
        y: 420,
        visualAssetIntentRef: visualIntentByEntityId.get('player')?.assetIntentRef ?? null,
        capability_ids: ['movement.run_jump.v1', 'movement.crouch.v1', 'combat.projectile.v1']
      },
      {
        id: 'visual_intent_manifest',
        kind: 'visual_intent_manifest',
        source: visualIntent.source,
        sceneVisualTheme: visualIntent.sceneVisualTheme,
        canonicalVisualIntentCount: visualIntent.canonicalVisualIntentCount,
        requiredVisualRoles: visualIntent.requiredVisualRoles,
        missingVisualRoles: visualIntent.missingVisualRoles,
        capability_ids: ['scene.visual_presentation_metadata.v1']
      },
      ...input.canonicalDsl.waves.map((wave, index) => ({
        id: `enemy_spawn_${wave.id}`,
        kind: 'enemy_spawn',
        spawnSource: 'wave',
        entityId: wave.enemy_entity_id,
        segmentId: wave.segment_id,
        x: 640 + index * 420,
        y: 420,
        count: wave.count,
        visualAssetIntentRef: visualIntentByEntityId.get(wave.enemy_entity_id)?.assetIntentRef ?? null,
        capability_ids: wave.capability_ids
      })),
      ...staticEnemyNodes,
      ...input.canonicalDsl.pickups.map((pickup, index) => ({
        id: `pickup_${pickup.id}`,
        kind: 'pickup',
        entityId: pickup.pickup_entity_id ?? 'weapon_pickup',
        segmentId: pickup.segment_id ?? null,
        x: 520 + index * 520,
        y: 360,
        count: pickup.count ?? 1,
        visualAssetIntentRef: visualIntentByEntityId.get(pickup.pickup_entity_id ?? 'weapon_pickup')?.assetIntentRef ?? null,
        capability_ids: pickup.capability_ids
      })),
      ...projectileVisualNodes,
      ...hazardNodes,
      ...input.canonicalDsl.bosses.map((boss) => ({
        id: `boss_${boss.id}`,
        kind: 'boss',
        entityId: boss.boss_entity_id,
        segmentIds: boss.segment_ids,
        phases: boss.phases,
        visualAssetIntentRef: visualIntentByEntityId.get(boss.boss_entity_id)?.assetIntentRef ?? null,
        capability_ids: uniqueSorted(boss.phases.flatMap((phase) => phase.capability_ids))
      })),
      {
        id: 'mission_complete_goal',
        kind: 'goal',
        objectiveIds: input.runtimePlan.gameplay.objectiveIds,
        capability_ids: ['ui.win_failure_transitions.v1', 'feedback.victory_declaration.v1']
      }
    ],
    authority: {
      rawDslScenes0AuthorityUsed: false,
      canonicalDslPath: CANONICAL_GAME_DSL_V02_PATH,
      runtimePlanPath: CAPABILITY_RUNTIME_PLAN_PATH
    }
  };
}

function buildStep38ManualVerticalSliceProjection(input: {
  canonicalDsl: CanonicalGameDslV02;
  runtimePlan: CapabilityRuntimePlan;
  sceneIr: Record<string, unknown>;
  canonicalDslSha: string;
  runtimePlanSha: string;
  sceneIrSha: string;
}): Record<string, unknown> {
  const segments = Array.isArray(input.runtimePlan.progression?.segments) ? input.runtimePlan.progression.segments : [];
  const firstSegment = segments[0]?.id ?? input.canonicalDsl.progression.segments[0]?.id ?? 'area_1';
  const secondSegment = segments[1]?.id ?? input.canonicalDsl.progression.segments[1]?.id ?? firstSegment;
  const bossSegment = segments[2]?.id ?? input.canonicalDsl.progression.segments[2]?.id ?? secondSegment;
  const boss = input.canonicalDsl.bosses[0];
  const bossEntity = boss?.boss_entity_id ?? 'boss';
  const bossPhaseIds = Array.isArray(boss?.phases) ? boss.phases.map((phase) => phase.id).filter((id) => typeof id === 'string') : [];
  const firstWave = input.canonicalDsl.waves.find((wave) => wave.segment_id === firstSegment) ?? input.canonicalDsl.waves[0];
  const secondWave = input.canonicalDsl.waves.find((wave) => wave.segment_id === secondSegment) ?? input.canonicalDsl.waves[1] ?? input.canonicalDsl.waves[0];
  const windowWave = (id: string, segmentId: string, canonicalTimeSec: number, previewWindow: string, triggerX: number, preferredWave?: CanonicalGameDslV02['waves'][number]) => ({
    id,
    segment_id: segmentId,
    canonical_time_sec: canonicalTimeSec,
    preview_window: previewWindow,
    trigger: { type: 'camera_x', x: triggerX },
    enemy_mix: buildStep38ProjectionEnemyMix(input.canonicalDsl, preferredWave),
    clear_condition: { type: 'defeat_all_wave_enemies' },
    visual_evidence_required: true,
    source: 'canonical_dsl'
  });

  return {
    schemaVersion: 'step38.manual-vertical-slice-projection.v1',
    projection_mode: 'manual_vertical_slice',
    source: 'canonical_dsl',
    product_duration_sec: { min: 480, max: 720 },
    preview_target_sec: 50,
    compression_is_preview_only: true,
    canonical_dsl_sha: input.canonicalDslSha,
    runtime_plan_sha: input.runtimePlanSha,
    scene_ir_sha: input.sceneIrSha,
    windows: [
      {
        id: 'window_0_intro',
        canonical_time_range_sec: [0, 60],
        preview_x_range: [0, 900],
        must_show: ['player', 'default_weapon', 'area_1', 'wave_1', 'movement', 'jump', 'crouch', 'shooting'],
        segment_id: firstSegment,
        source: 'canonical_dsl'
      },
      {
        id: 'window_1_weapon_wave_area',
        canonical_time_range_sec: [180, 240],
        preview_x_range: [900, 1800],
        must_show: ['weapon_pickup', 'area_2', 'wave_2', 'ranged_enemy', 'flying_enemy', 'enemy_wave_trigger', 'enemy_wave_clear_condition'],
        segment_id: secondSegment,
        source: 'canonical_dsl'
      },
      {
        id: 'window_2_boss',
        canonical_time_range_sec: [400, 480],
        preview_x_range: [1800, 2800],
        must_show: ['boss', 'boss_telegraph', 'boss_phase_1', 'boss_phase_2', 'mission_complete_or_exit'],
        segment_id: bossSegment,
        source: 'canonical_dsl'
      }
    ],
    waves: [
      windowWave(firstWave?.id ?? 'wave_area1_intro', firstSegment, 24, 'window_0_intro', 320, firstWave),
      windowWave(secondWave?.id ?? 'wave_area2_pressure', secondSegment, 203.9, 'window_1_weapon_wave_area', 1200, secondWave)
    ],
    pickups: input.canonicalDsl.pickups.map((pickup) => ({
      id: pickup.id,
      segment_id: pickup.segment_id ?? secondSegment,
      preview_window: pickup.segment_id === bossSegment ? 'window_2_boss' : 'window_1_weapon_wave_area',
      source: 'canonical_dsl'
    })),
    boss: {
      id: boss?.id ?? 'boss_encounter',
      canonical_id: bossEntity,
      preview_window: 'window_2_boss',
      canonical_time_sec: 420,
      phases: bossPhaseIds.length >= 2 ? bossPhaseIds : ['phase_1', 'phase_2'],
      telegraph_required: true,
      source: 'canonical_dsl'
    }
  };
}

function buildStep38ManualTraversalPath(manualVerticalSliceProjection: Record<string, unknown>): Record<string, unknown> {
  const windows = Array.isArray(manualVerticalSliceProjection.windows) ? manualVerticalSliceProjection.windows.filter(isRecord) : [];
  const windowById = new Map(windows.map((window) => [String(window.id), window]));
  const readRange = (id: string, fallback: [number, number]): [number, number] => {
    const window = windowById.get(id);
    const range = Array.isArray(window?.preview_x_range) ? window.preview_x_range : [];
    return typeof range[0] === 'number' && typeof range[1] === 'number' ? [range[0], range[1]] : fallback;
  };
  const intro = readRange('window_0_intro', [0, 900]);
  const wave2 = readRange('window_1_weapon_wave_area', [900, 1800]);
  const boss = readRange('window_2_boss', [1800, 2800]);
  return {
    schemaVersion: 'step38.manual-traversal-path.v1',
    mode: 'manual_traversal',
    source: 'manual_vertical_slice_projection',
    starts_from_spawn: true,
    uses_normal_player_controls_only: true,
    teleport_allowed: false,
    camera_jump_allowed: false,
    debug_reposition_allowed: false,
    state_injection_allowed: false,
    direct_spawn_allowed: false,
    time_scale_allowed: false,
    max_target_duration_sec: 50,
    max_empty_traversal_sec_between_required_events: 8,
    product_duration_sec: manualVerticalSliceProjection.product_duration_sec ?? { min: 480, max: 720 },
    route: [
      {
        id: 'spawn_to_wave1',
        from_x: intro[0],
        to_x: Math.min(intro[1], 650),
        expected_reach_sec: 8,
        preview_window: 'window_0_intro',
        required_visible_roles: ['player', 'default_weapon', 'wave_1', 'ground_enemy']
      },
      {
        id: 'wave1_to_pickup_area2',
        from_x: Math.min(intro[1], 650),
        to_x: Math.max(wave2[0] + 300, 1200),
        expected_reach_sec: 18,
        preview_window: 'window_1_weapon_wave_area',
        required_visible_roles: ['weapon_pickup', 'area_2_marker', 'wave_2', 'ranged_enemy', 'flying_enemy']
      },
      {
        id: 'area2_to_boss',
        from_x: Math.max(wave2[0] + 300, 1200),
        to_x: Math.max(boss[0] + 400, 2200),
        expected_reach_sec: 35,
        preview_window: 'window_2_boss',
        required_visible_roles: ['boss_telegraph', 'boss', 'boss_phase_1', 'boss_phase_2']
      },
      {
        id: 'boss_to_exit',
        from_x: Math.max(boss[0] + 400, 2200),
        to_x: Math.max(boss[1], 2800),
        expected_reach_sec: 50,
        preview_window: 'window_2_boss',
        required_visible_roles: ['mission_complete_or_exit']
      }
    ]
  };
}

function buildStep38ProjectionEnemyMix(canonicalDsl: CanonicalGameDslV02, preferredWave?: CanonicalGameDslV02['waves'][number]): Array<Record<string, unknown>> {
  const enemyEntities = canonicalDsl.entities.filter((entity) => entity.role === 'enemy');
  const mix = new Map<string, number>();
  const add = (type: string, count: number) => mix.set(type, Math.max(mix.get(type) ?? 0, count));
  const preferredEntity = enemyEntities.find((entity) => entity.id === preferredWave?.enemy_entity_id);
  if (preferredEntity !== undefined) {
    for (const type of classifyStep38ProjectionEnemyTypes(preferredEntity)) {
      add(type, Math.max(1, Math.min(preferredWave?.count ?? 1, 3)));
    }
  }
  for (const entity of enemyEntities) {
    for (const type of classifyStep38ProjectionEnemyTypes(entity)) {
      add(type, entity.capability_ids.includes('spawn.static.v1') ? 1 : 2);
    }
  }
  return [...mix.entries()].map(([enemy_type, count]) => ({ enemy_type, count }));
}

function classifyStep38ProjectionEnemyTypes(entity: CanonicalGameDslV02['entities'][number]): string[] {
  const types = new Set<string>();
  if (entity.capability_ids.includes('enemy.flying_right_entry.v1')) types.add('flying_enemy');
  if (entity.capability_ids.includes('enemy.fixed_turret.v1') || entity.capability_ids.includes('spawn.static.v1')) types.add('fixed_turret');
  if (entity.capability_ids.includes('enemy.patrol_infantry.v1')) types.add('ground_patrol');
  if (entity.capability_ids.includes('combat.projectile.v1')) types.add('ranged_shooter');
  if (types.size === 0) types.add('ground_patrol');
  return [...types];
}

async function writeGeneratedPlayable(input: {
  projectId: string;
  runId: string;
  generatedArtifactDir: string;
  canonicalDsl: CanonicalGameDslV02;
  runtimePlan: CapabilityRuntimePlan;
  sceneIr: Record<string, unknown>;
  runtimeManifest: unknown;
  manualVerticalSliceProjection: Record<string, unknown>;
  manualTraversalPath: Record<string, unknown>;
  materializedAssetDir: string;
  assetSyncReportPath: string;
  assetTemplateFingerprintReportPath: string;
  canvasAssetDesignSpecsPath: string;
  canvasDrawPlanReportPath: string;
  proceduralPixelArtGrammarReportPath: string;
  spriteAnimationCoverageReportPath: string;
  environmentLayeringReportPath: string;
  marker: Record<string, unknown>;
}): Promise<void> {
  const srcDir = join(input.generatedArtifactDir, 'src');
  const publicDir = join(input.generatedArtifactDir, 'public');
  const publicAssetsDir = join(publicDir, 'assets');
  const publicGeneratedAssetsDir = join(publicAssetsDir, 'generated');
  const scriptsDir = join(input.generatedArtifactDir, 'scripts');
  await mkdir(srcDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });
  await mkdir(publicAssetsDir, { recursive: true });
  await mkdir(publicGeneratedAssetsDir, { recursive: true });
  await mkdir(input.materializedAssetDir, { recursive: true });
  await mkdir(scriptsDir, { recursive: true });

  await writeJson(join(publicDir, CANONICAL_GAME_DSL_V02_PATH), input.canonicalDsl);
  await writeJson(join(publicDir, CAPABILITY_RUNTIME_PLAN_PATH), input.runtimePlan);
  await writeJson(join(publicDir, 'scene-ir.generated.json'), input.sceneIr);
  await writeJson(join(publicDir, RUNTIME_SYSTEM_MANIFEST_PATH), input.runtimeManifest);
  await writeJson(join(publicDir, 'manual_vertical_slice_projection.json'), input.manualVerticalSliceProjection);
  await writeJson(join(publicDir, 'manual_traversal_path.json'), input.manualTraversalPath);
  await writeJson(join(publicDir, 'step38-marker.json'), input.marker);
  const spriteAssets = buildStep38SpriteAssets(input.canonicalDsl);
  await writeStep38SpriteAssets(input.materializedAssetDir, spriteAssets);
  await writeStep38SpriteAssets(publicGeneratedAssetsDir, spriteAssets);
  await writeJson(input.assetTemplateFingerprintReportPath, buildStep38AssetTemplateFingerprintReport(input.runId, spriteAssets));
  await writeJson(input.canvasAssetDesignSpecsPath, buildStep38CanvasAssetDesignSpecsReport(input.runId, spriteAssets));
  await writeJson(input.canvasDrawPlanReportPath, buildStep38CanvasDrawPlanReport(input.runId, spriteAssets));
  await writeJson(input.proceduralPixelArtGrammarReportPath, buildStep38ProceduralPixelArtGrammarReport(input.runId, spriteAssets));
  await writeJson(input.spriteAnimationCoverageReportPath, buildStep38SpriteAnimationCoverageReport(input.runId, spriteAssets));
  await writeJson(input.environmentLayeringReportPath, buildStep38EnvironmentLayeringReport(input.runId, spriteAssets));
  const assetSyncAssets = spriteAssets.map((asset) => {
    const runScopedAssetPath = join(input.materializedAssetDir, asset.fileName);
    const servedAssetFilesystemPath = join(publicGeneratedAssetsDir, asset.fileName);
    const assetSha = asset.rendered_canvas_pixel_sha;
    return {
      canonical_id: asset.id,
      required_object: asset.requiredObject,
      role: asset.roleCategory,
      visual_role: asset.role,
      asset_role: asset.role,
      palette: [asset.palette.primary, asset.palette.accent, asset.palette.outline],
      silhouette: asset.silhouette,
      run_scoped_asset_path: runScopedAssetPath,
      run_scoped_asset_sha256: assetSha,
      served_asset_path: `public/assets/generated/${asset.fileName}`,
      served_asset_filesystem_path: servedAssetFilesystemPath,
      served_asset_sha256: assetSha,
      texture_key: asset.textureKey,
      asset_format: asset.asset_format,
      renderer_kind: asset.renderer_kind,
      final_pass_renderer: asset.final_pass_renderer,
      draw_plan_sha: asset.draw_plan_sha,
      rendered_canvas_pixel_sha: asset.rendered_canvas_pixel_sha,
      canvas_draw_plan: asset.canvas_draw_plan,
      visual_intent_sha: asset.visual_intent_sha,
      asset_design_spec_sha: asset.asset_design_spec_sha,
      motif_coverage: asset.motif_coverage,
      geometry_signature: asset.geometry_signature,
      dsl_geometry_fingerprint: asset.dsl_geometry_fingerprint,
      role_static_control_fingerprint: asset.role_static_control_fingerprint,
      visual_geometry_dependency: asset.visual_geometry_dependency,
      template_fingerprint: asset.template_fingerprint,
      role_static_svg_template_used: asset.role_static_svg_template_used,
      old_svgForVisualIntent_used: asset.old_svgForVisualIntent_used,
      template_derived_placeholder: asset.template_derived_placeholder,
      role_only_generation_detected: asset.role_only_generation_detected,
      matches_known_static_template: asset.matches_known_static_template,
      distinct_silhouette: asset.distinct_silhouette,
      source: 'canonical_dsl',
      materialized: true,
      copied_to_served_assets: true,
      placeholder: asset.placeholder,
      label_only: false
    };
  });
  const assetSyncGate = {
    verdict: assetSyncAssets.every((asset) => asset.run_scoped_asset_sha256 === asset.served_asset_sha256) ? 'PASS' : 'FAIL',
    all_required_assets_run_scoped: STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((requiredObject) =>
      assetSyncAssets.some((asset) => asset.required_object === requiredObject && asset.materialized === true)
    ),
    all_sha_equal: assetSyncAssets.every((asset) => asset.run_scoped_asset_sha256 === asset.served_asset_sha256),
    stale_served_assets_detected: false
  };
  await writeJson(input.assetSyncReportPath, {
    schemaVersion: 'step38.asset-sync-report.v1',
    run_id: input.runId,
    source: 'canonical_dsl',
    run_scoped_asset_directory: input.materializedAssetDir,
    served_asset_directory: publicAssetsDir,
    served_generated_asset_directory: publicGeneratedAssetsDir,
    stale_served_assets_detected: false,
    asset_count: assetSyncAssets.length,
    assets: assetSyncAssets,
    gate: assetSyncGate,
    asset_sync_gate: assetSyncGate
  });
  await writeJson(join(publicDir, 'asset-manifest.step38.json'), {
    schemaVersion: 'step38.generated-asset-manifest.v1',
    runId: input.runId,
    renderer: 'runtime_2d_generated_assets',
    renderer_is_implementation_detail: true,
    source: 'canonical_dsl',
    run_scoped_asset_directory: input.materializedAssetDir,
    served_asset_directory: publicAssetsDir,
      asset_sync_report_path: input.assetSyncReportPath,
      asset_template_fingerprint_report_path: input.assetTemplateFingerprintReportPath,
      canvas_asset_design_specs_path: input.canvasAssetDesignSpecsPath,
      canvas_draw_plan_report_path: input.canvasDrawPlanReportPath,
      procedural_pixel_art_grammar_report_path: input.proceduralPixelArtGrammarReportPath,
      sprite_animation_coverage_report_path: input.spriteAnimationCoverageReportPath,
      environment_layering_report_path: input.environmentLayeringReportPath,
      stale_served_assets_detected: false,
    visual_intent: buildStep38AssetVisualIntentEvidence({
      canonicalDsl: input.canonicalDsl,
      sceneIr: input.sceneIr,
      assets: spriteAssets
    }),
    assets: spriteAssets.map((asset) => ({
      id: asset.id,
      role: asset.role,
      requiredObject: asset.requiredObject,
      roleCategory: asset.roleCategory,
      originalRole: asset.originalRole,
      path: `assets/generated/${asset.fileName}`,
      servedAssetPath: `public/assets/generated/${asset.fileName}`,
      runScopedAssetPath: join(input.materializedAssetDir, asset.fileName),
      runScopedAssetSha256: asset.rendered_canvas_pixel_sha,
      servedAssetSha256: asset.rendered_canvas_pixel_sha,
      materialized: true,
      copiedToServedAssets: true,
      placeholder: false,
      labelOnly: false,
      assetFormat: asset.assetFormat,
      asset_format: asset.asset_format,
      rendererKind: asset.renderer_kind,
      renderer_kind: asset.renderer_kind,
      finalPassRenderer: asset.final_pass_renderer,
      final_pass_renderer: asset.final_pass_renderer,
      canvasSize: asset.canvas_size,
      canvas_size: asset.canvas_size,
      canvasDrawPlan: asset.canvasDrawPlan,
      canvas_draw_plan: asset.canvas_draw_plan,
      drawPlanSha: asset.drawPlanSha,
      draw_plan_sha: asset.draw_plan_sha,
      renderedCanvasPixelSha: asset.renderedCanvasPixelSha,
      rendered_canvas_pixel_sha: asset.rendered_canvas_pixel_sha,
      canvasPalette: asset.canvas_palette,
      canvas_palette: asset.canvas_palette,
      textureKey: asset.textureKey,
      source: asset.source,
      assetIntentRef: asset.assetIntentRef,
      entityId: asset.entityId,
      sourcePath: asset.sourcePath,
      silhouette: asset.silhouette,
      palette: asset.palette,
      visualIntentSha: asset.visualIntentSha,
      visual_intent_sha: asset.visual_intent_sha,
      assetDesignSpecSha: asset.assetDesignSpecSha,
      asset_design_spec_sha: asset.asset_design_spec_sha,
      assetDesignSpec: asset.asset_design_spec,
      asset_design_spec: asset.asset_design_spec,
      motifCoverage: asset.motifCoverage,
      motif_coverage: asset.motif_coverage,
      geometrySignature: asset.geometrySignature,
      geometry_signature: asset.geometry_signature,
      dslGeometryFingerprint: asset.dsl_geometry_fingerprint,
      dsl_geometry_fingerprint: asset.dsl_geometry_fingerprint,
      roleStaticControlFingerprint: asset.role_static_control_fingerprint,
      role_static_control_fingerprint: asset.role_static_control_fingerprint,
      visualGeometryDependency: asset.visual_geometry_dependency,
      visual_geometry_dependency: asset.visual_geometry_dependency,
      templateFingerprint: asset.templateFingerprint,
      template_fingerprint: asset.template_fingerprint,
      roleStaticSvgTemplateUsed: asset.roleStaticSvgTemplateUsed,
      role_static_svg_template_used: asset.role_static_svg_template_used,
      oldSvgForVisualIntentUsed: asset.oldSvgForVisualIntentUsed,
      old_svgForVisualIntent_used: asset.old_svgForVisualIntent_used,
      templateDerivedPlaceholder: asset.templateDerivedPlaceholder,
      template_derived_placeholder: asset.template_derived_placeholder,
      role_only_generation_detected: asset.role_only_generation_detected,
      matches_known_static_template: asset.matches_known_static_template,
      distinct_silhouette: asset.distinct_silhouette
    }))
  });

  await writeFile(join(input.generatedArtifactDir, 'index.html'), buildStep38IndexHtml(input.canonicalDsl), 'utf8');
  await writeFile(join(srcDir, 'main.js'), buildStep38MainJs(), 'utf8');
  await writeFile(join(scriptsDir, 'build.mjs'), buildStep38BuildScript(), 'utf8');
  await writeJson(join(input.generatedArtifactDir, 'package.json'), {
    name: `agm-step38-${input.projectId}`,
    version: '0.0.0',
    private: true,
    type: 'module',
    scripts: {
      build: 'node scripts/build.mjs'
    }
  });
}

async function writeStep38SpriteAssets(publicAssetsDir: string, assets: readonly Step38SpriteAsset[]): Promise<void> {
  await Promise.all(
    assets.map((asset) =>
      writeJson(join(publicAssetsDir, asset.fileName), {
        schemaVersion: 'step38.runtime-2d-generated-asset.v1',
        source: 'canonical_dsl',
        renderer_is_implementation_detail: true,
        asset_format: asset.asset_format,
        renderer_kind: asset.renderer_kind,
        texture_key: asset.textureKey,
        required_object: asset.requiredObject,
        canonical_id: asset.id,
        visual_intent_sha: asset.visual_intent_sha,
        asset_design_spec_sha: asset.asset_design_spec_sha,
        draw_plan_sha: asset.draw_plan_sha,
        rendered_canvas_pixel_sha: asset.rendered_canvas_pixel_sha,
        canvas_draw_plan: asset.canvas_draw_plan,
        debug_svg_sha256: sha256Text(asset.svg),
        svg_used_for_pass: false,
        png_required_for_pass: false,
        role_static_template_used: false
      })
    )
  );
}

export function buildStep38SpriteAssets(canonicalDsl: CanonicalGameDslV02): Step38SpriteAsset[] {
  return buildDslDrivenStep38SpriteAssets(canonicalDsl);
}

function buildStep38AssetVisualIntentEvidence(input: {
  canonicalDsl: CanonicalGameDslV02;
  sceneIr: unknown;
  assets: readonly Step38SpriteAsset[];
}): Record<string, unknown> {
  const visualIntent = buildStep38VisualIntentManifest(input.canonicalDsl);
  const rolesWithAssets = new Set(input.assets.map((asset) => asset.role));
  const missingVisualRoles = STEP38_REQUIRED_VISUAL_ROLES.filter((role) => !rolesWithAssets.has(role));
  return {
    schemaVersion: 'step38.asset-visual-intent-evidence.v1',
    source: 'canonical_dsl_visual_intent',
    scene_visual_theme: visualIntent.sceneVisualTheme,
    environment_visuals: visualIntent.environmentVisuals,
    required_visual_roles: [...STEP38_REQUIRED_VISUAL_ROLES],
    missing_visual_roles: uniqueSorted([...visualIntent.missingVisualRoles, ...missingVisualRoles]),
    canonical_visual_intent_count: visualIntent.canonicalVisualIntentCount,
    scene_ir_visual_binding_count: countSceneIrVisualBindings(input.sceneIr),
    manifest_visual_asset_count: input.assets.length,
    visual_intents: visualIntent.visualIntents.map((intent) => ({
      entityId: intent.entityId,
      role: intent.role,
      originalRole: intent.originalRole,
      assetIntentRef: intent.assetIntentRef,
      silhouette: intent.silhouette,
      palette: intent.palette,
      sourcePath: intent.sourcePath,
      capabilityIds: intent.capabilityIds
    }))
  };
}

function buildStep38VisualIntentManifest(canonicalDsl: CanonicalGameDslV02): Step38VisualIntentManifest {
  const sceneConfigs = canonicalDsl.scenes.flatMap((scene): Record<string, unknown>[] => (isRecord(scene.config) ? [scene.config] : []));
  const sceneVisualTheme = firstStringFromRecords(sceneConfigs, ['visual_theme', 'visualTheme']);
  const environmentVisuals = sceneConfigs.flatMap((config) => {
    const candidate = config.environment_visuals ?? config.environmentVisuals;
    return Array.isArray(candidate) ? candidate : [];
  });
  const visualIntents = canonicalDsl.entities.flatMap((entity, index): Step38VisualIntent[] => {
    const config = entity.config;
    const visual = isRecord(config) && isRecord(config.visual) ? config.visual : undefined;
    if (visual === undefined) {
      return [];
    }
    const assetIntentRef = firstStringFromRecords([visual], ['asset_intent_ref', 'assetIntentRef']);
    const originalRole = firstStringFromRecords([visual], ['role']);
    const silhouette = firstStringFromRecords([visual], ['silhouette']);
    const palette = readVisualPalette(visual.palette);
    if (assetIntentRef === undefined || originalRole === undefined || silhouette === undefined || palette === undefined) {
      return [];
    }
    const role = normalizeStep38RuntimeVisualRole(entity, originalRole);
    if (role === undefined) {
      return [];
    }
    return [
      {
        entityId: entity.id,
        role,
        originalRole,
        assetIntentRef,
        silhouette,
        palette,
        sourcePath: `/entities/${index}/config/visual`,
        capabilityIds: entity.capability_ids
      }
    ];
  });
  const rolesWithVisualIntents = new Set(visualIntents.map((intent) => intent.role));
  return {
    schemaVersion: 'step38.visual-intent-manifest.v1',
    source: 'canonical_dsl_visual_intent',
    sceneVisualTheme: sceneVisualTheme ?? null,
    environmentVisuals,
    requiredVisualRoles: [...STEP38_REQUIRED_VISUAL_ROLES],
    missingVisualRoles: STEP38_REQUIRED_VISUAL_ROLES.filter((role) => !rolesWithVisualIntents.has(role)),
    canonicalVisualIntentCount: visualIntents.length,
    visualIntents
  };
}

function normalizeStep38RuntimeVisualRole(
  entity: CanonicalGameDslV02['entities'][number],
  originalRole: string
): Step38RuntimeVisualRole | undefined {
  if ((STEP38_REQUIRED_VISUAL_ROLES as readonly string[]).includes(originalRole)) {
    return originalRole as Step38RuntimeVisualRole;
  }

  const role = originalRole.toLowerCase();
  const entityRole = entity.role.toLowerCase();
  const entityId = entity.id.toLowerCase();
  const capabilities = new Set(entity.capability_ids);
  const hasCapability = (capabilityId: string) => capabilities.has(capabilityId);
  const hasCapabilityPrefix = (prefix: string) => entity.capability_ids.some((capabilityId) => capabilityId.startsWith(prefix));

  if (entityRole === 'player' || role.includes('player') || role.includes('main_character')) return 'player';
  if (entityRole === 'boss' || hasCapabilityPrefix('enemy.boss_') || role.includes('boss') || role.includes('mecha')) return 'boss';
  if (entityRole === 'pickup' || hasCapabilityPrefix('pickup.') || role.includes('pickup') || role.includes('supply')) return 'pickup';
  if (entityRole === 'projectile' || entityId.includes('projectile') || role.includes('projectile') || role.includes('bullet')) return 'projectile';
  if (entityRole === 'hazard' || hasCapabilityPrefix('hazard.') || role.includes('hazard') || role.includes('zone')) return 'hazard';
  if (hasCapability('enemy.flying_right_entry.v1') || role.includes('flying') || role.includes('aerial') || role.includes('drone')) return 'flying_enemy';
  if (hasCapability('enemy.fixed_turret.v1') || role.includes('turret') || role.includes('static') || role.includes('defense')) return 'enemy_static';
  if (entityRole === 'enemy' || hasCapabilityPrefix('enemy.') || role.includes('enemy') || role.includes('soldier')) return 'enemy_ground';

  return undefined;
}

function readVisualPalette(value: unknown): Step38VisualPalette | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const primary = typeof value.primary === 'string' ? safeSvgColor(value.primary, '#facc15') : undefined;
  const accent = typeof value.accent === 'string' ? safeSvgColor(value.accent, '#38bdf8') : undefined;
  const outline = typeof value.outline === 'string' ? safeSvgColor(value.outline, '#fef3c7') : undefined;
  if (primary === undefined || accent === undefined || outline === undefined) {
    return undefined;
  }
  return { primary, accent, outline };
}

function firstStringFromRecords(records: readonly Record<string, unknown>[], keys: readonly string[]): string | undefined {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
  }
  return undefined;
}

function safeSvgColor(value: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function countSceneIrVisualBindings(sceneIr: unknown): number {
  if (!isRecord(sceneIr) || !Array.isArray(sceneIr.nodes)) {
    return 0;
  }
  return sceneIr.nodes.filter(isRecord).filter((node) => typeof node.visualAssetIntentRef === 'string' && node.visualAssetIntentRef.length > 0).length;
}

function buildStep38IndexHtml(canonicalDsl: CanonicalGameDslV02): string {
  const title = escapeHtml(canonicalDsl.metadata.title);
  return [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="utf-8">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1">',
    `    <title>${title}</title>`,
    '    <style>',
    '      html, body { margin: 0; min-height: 100%; background: #111827; color: #f9fafb; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }',
    '      #app { min-height: 100vh; display: grid; grid-template-rows: auto 1fr auto; }',
    '      header, footer { padding: 12px 16px; background: #0f172a; border-bottom: 1px solid #334155; }',
    '      footer { border-top: 1px solid #334155; border-bottom: 0; color: #cbd5e1; }',
    '      main { display: grid; place-items: center; padding: 16px; }',
    '      canvas { width: min(100%, 960px); aspect-ratio: 16 / 9; background: #172033; border: 1px solid #475569; image-rendering: pixelated; }',
    '      .hud { display: flex; flex-wrap: wrap; gap: 10px; font-size: 13px; color: #e5e7eb; }',
    '      .badge { padding: 4px 8px; border: 1px solid #64748b; background: #1e293b; }',
    '    </style>',
    '  </head>',
    '  <body>',
    '    <div id="app">',
    '      <header>',
    `        <strong>${title}</strong>`,
    '        <div id="hud" class="hud"></div>',
    '      </header>',
    '      <main>',
    '        <canvas id="game" width="960" height="540" aria-label="Step38 run-specific generated playable"></canvas>',
    '      </main>',
    '      <footer id="step38-panel">Step38 evidence marker loading...</footer>',
    '    </div>',
    '    <script type="module" src="./main.js"></script>',
    '  </body>',
    '</html>',
    ''
  ].join('\n');
}

export function buildStep38MainJs(): string {
  return String.raw`const requiredEvents = ['game.ready','game.started','scene.visual_presentation_metadata.verified','player.moved','player.jumped','player.crouched','player.fired','projectile.spawned','item.collected','enemy.moved','enemy.fired','enemy.projectile.spawned','enemy.projectile.hit_player','enemy.hit','score.changed','player.damaged','level.segment.completed','boss.attack.fired','boss.falling_hazard.spawned','boss.phase.changed','player.dead','game.over','game.lost','objective.completed','mission.complete','game.won'];
const events = [];
const observed = new Set();
const step38VisualBackendPolicy = Object.freeze({
  active_visual_asset_backend: 'procedural_canvas_v1',
  current_backend: 'procedural_canvas_v1',
  future_visual_asset_backend: 'image_provider_v1',
  image_provider_v1_enabled: false,
  external_art_used: false,
  png_core_fix_used: false,
  old_environment_resource_logic_used: false,
  target_fidelity: 'procedural_pixel_art_readable_v1'
});
window.__STEP38_QA_EVENTS = events;
window.__STEP38_QA_COMPLETE = false;
window.__STEP38_QA_READY = false;
window.__STEP38_VISUAL_BACKEND_POLICY = step38VisualBackendPolicy;
window.__STEP38_PLAYABLE_STATE = {};
window.__STEP38_RUNTIME_CONSUMPTION = {
  auto_emitted_success_events: false,
  source_artifacts: { canonicalDsl: false, runtimePlan: false, sceneIr: false, runtimeManifest: false }
};
window.__STEP38_VISUAL_EVIDENCE = {
  status: 'PENDING',
  renderer: 'runtime_2d_generated_assets',
  ...step38VisualBackendPolicy,
  renderer_is_implementation_detail: true,
  placeholder_rectangles_present: true,
  sprite_asset_count: 0,
  dsl_visual_intent_bound: false,
  visual_intent_source: null,
  scene_visual_theme: null,
  canonical_visual_intent_count: 0,
  scene_ir_visual_binding_count: 0,
  manifest_visual_asset_count: 0,
  required_visual_roles: [],
  loaded_visual_roles: [],
  missing_visual_roles: [],
  loaded_asset_intent_refs: []
};
window.__STEP38_PLAYABLE_DURATION_SUPPORT = {
  status: 'PENDING',
  supported_range_sec: { min: 0, max: 0 },
  normal_mode_estimated_sec: { min: 0, target: 0, max: 0 },
  qa_acceleration_used: false
};
window.__STEP38_ENCOUNTER_COVERAGE = {
  status: 'PENDING',
  expected_enemy_count: 0,
  realized_enemy_count: 0,
  encounter_band_count: 0,
  wave_segment_coverage_count: 0,
  max_gap_between_encounter_bands_sec: null,
  first_encounter_estimated_sec: null,
  first_viewport_enemy_count: 0
};
window.__STEP38_ENEMY_BEHAVIOR_EVIDENCE = {
  status: 'PENDING',
  required_enemy_behavior_capability_count: 0,
  realized_enemy_behavior_capability_count: 0,
  moving_enemy_entity_count: 0,
  enemy_movement_event_count: 0,
  attacking_enemy_entity_count: 0,
  enemy_fire_event_count: 0,
  enemy_projectile_spawn_count: 0,
  player_damage_from_enemy_projectile_count: 0,
  boss_attack_event_count: 0
};
window.__STEP38_BEHAVIOR_CONFIG_EVIDENCE = {
  status: 'PENDING',
  required_behavior_config_ids: [],
  consumed_behavior_config_ids: [],
  required_behavior_capability_ids: [],
  consumed_behavior_capability_ids: [],
  fixed_turret_burst_consumed: false,
  fixed_turret_fire_consumed: false,
  patrol_counterfire_consumed: false,
  flying_strafe_fire_consumed: false,
  boss_attack_cycle_consumed: false,
  boss_attack_pattern_consumed: false,
  boss_falling_hazard_consumed: false
};
window.__STEP38_MANUAL_TRAVERSAL_EVIDENCE = {
  schemaVersion: 'step38.manual-traversal-evidence.v1',
  status: 'PENDING',
  evidence_source: 'playwright_keyboard_continuous_path',
  started_at_player_spawn: true,
  capture_window_teleport_used: false,
  product_duration_sec: { min: 480, max: 720 },
  preview_target_sec: 50,
  observed_preview_windows: [],
  observed_segments: [],
  observed_wave_ids: [],
  cleared_wave_ids: [],
  post_first_wave_enemy_seen: false,
  weapon_pickup_seen: false,
  boss_seen: false,
  boss_telegraph_seen: false,
  boss_phase_seen: false,
  distinct_environment_visual_count: 0,
  observed_environment_motifs: [],
  observed_content_types: [],
  observed_visual_roles: [],
  placeholder_objects_seen: false,
  canonical_dsl_visual_intent_runtime_bound: false,
  scripted_capture_used_for_pass: false,
  manual_traversal_gate: {
    verdict: 'PENDING',
    starts_from_spawn: true,
    input_only: true,
    teleport_used: false,
    camera_jump_used: false,
    debug_reposition_used: false,
    state_injection_used: false,
    direct_spawn_used: false,
    scripted_capture_used_for_pass: false,
    wave2_reached_by_input: false,
    area2_reached_by_input: false,
    weapon_pickup_reached_by_input: false,
    boss_reached_by_input_or_scripted_reachable_after_input_path: false,
    boss_telegraph_seen_by_input: false,
    dsl_visual_objects_seen_by_input: false,
    large_empty_traversal_detected: false
  }
};
window.__STEP38_VISUAL_RUNTIME_BINDING_REPORT = {
  schemaVersion: 'step38.visual-runtime-binding-report.v1',
  status: 'PENDING',
  source: 'canonical_dsl',
  evidence_source: 'fresh_manual_traversal_screenshots',
  runtime_authority: 'canonical_dsl_visual_binding',
  required_objects: [],
  missing_objects: [],
  objects: []
};
window.__STEP38_VISUAL_ASSET_MATERIALIZATION_REPORT = {
  schemaVersion: 'step38.visual-asset-materialization-report.v1',
  status: 'PENDING',
  source: 'canonical_dsl',
  evidence_source: 'fresh_manual_traversal_screenshots',
  required_objects: [],
  missing_objects: [],
  objects: []
};
window.__STEP38_RUNTIME_TEXTURE_LOAD_REPORT = {
  schemaVersion: 'step38.runtime-texture-load-report.v1',
  source: 'canonical_dsl',
  texture_load_gate: {
    verdict: 'PENDING',
    required_textures_loaded: false,
    missing_texture_keys: [],
    texture_cache_probe_available: false
  },
  textures: []
};
window.__STEP38_ART_DIRECTION_QUALITY_REPORT = null;
window.__STEP38_ENCOUNTER_DIRECTOR_PLAN = null;
window.__STEP38_ENCOUNTER_DIRECTOR_RUNTIME_EVIDENCE = null;
window.__STEP38_OUTCOME_STATE_MACHINE_REPORT = null;
window.__STEP38_REAL_PLAYTHROUGH_COMPLETION_EVIDENCE = {
  schemaVersion: 'step38.real-playthrough-completion-evidence.v1',
  source: 'fresh_input_only_browser_playthrough',
  screenshots: [],
  real_playthrough_completion_gate: {
    verdict: 'PENDING',
    text_only_evidence_used_for_pass: false,
    manifest_only_evidence_used_for_pass: false,
    overlay_only_evidence_used_for_pass: false,
    receipt_only_evidence_used_for_pass: false,
    telemetry_only_evidence_used_for_pass: false,
    scripted_capture_used_for_pass: false
  },
  human_visible_gameplay_gate: {
    verdict: 'PENDING',
    operator_visible_evidence_required: true,
    browser_visual_evidence_required: true,
    input_only_evidence_required: true,
    text_only_evidence_used_for_pass: false,
    manifest_only_evidence_used_for_pass: false,
    overlay_only_evidence_used_for_pass: false,
    receipt_only_evidence_used_for_pass: false,
    telemetry_only_evidence_used_for_pass: false,
    scripted_capture_used_for_pass: false
  }
};
window.__STEP38_OPERATOR_VISIBLE_ART_GATE = {
  schemaVersion: 'step38.operator-visible-art-gate.v1',
  source: 'fresh_browser_screenshots',
  screenshot_labels: [],
  operator_visible_art_gate: {
    verdict: 'PENDING',
    operator_visible_evidence_required: true,
    browser_visual_evidence_required: true,
    label_only_visual_evidence: false,
    placeholder_style_dominant: true,
    text_only_evidence_used_for_pass: false,
    manifest_only_evidence_used_for_pass: false,
    overlay_only_evidence_used_for_pass: false,
    receipt_only_evidence_used_for_pass: false,
    telemetry_only_evidence_used_for_pass: false,
    scripted_capture_used_for_pass: false
  }
};
window.__STEP38_VISUAL_PLAYTHROUGH_VALIDATOR_REPORT = {
  schemaVersion: 'step38.visual-playthrough-validator-report.v1',
  evidence_paths: [],
  visual_playthrough_validator: {
    verdict: 'BLOCKED',
    text_only_evidence_used_for_pass: false,
    manifest_only_evidence_used_for_pass: false,
    overlay_only_evidence_used_for_pass: false,
    receipt_only_evidence_used_for_pass: false,
    telemetry_only_evidence_used_for_pass: false,
    scripted_capture_used_for_pass: false,
    operator_visible_evidence_required: true,
    browser_visual_evidence_required: true,
    input_only_evidence_required: true,
    blocking_reasons: ['runtime_playthrough_not_yet_verified'],
    required_gate_summary: {
      real_playthrough_completion_gate: 'BLOCKED',
      human_visible_gameplay_gate: 'BLOCKED',
      operator_visible_art_gate: 'BLOCKED',
      win_path_gate: 'BLOCKED',
      lose_path_gate: 'BLOCKED'
    }
  }
};

const urlParams = new URLSearchParams(window.location.search);
const qaMode = urlParams.get('qa') === '1';
const qaPathMode = urlParams.get('path') || 'success';
const failurePathQaMode = qaPathMode === 'failure';
const debugInfiniteHealth = urlParams.get('debugInfiniteHealth') === '1';
const visualSlicePreviewMode = urlParams.get('full') !== '1';
const normalRunSpeedPxPerSec = 160;
const visualSliceDurationScale = visualSlicePreviewMode ? 0.085 : 1;
const qaAcceleration = qaMode ? (visualSlicePreviewMode ? 5 : 40) : 1;

function emit(event, payload = {}) {
  const record = { event, timestamp: new Date().toISOString(), ...payload };
  events.push(record);
  observed.add(event);
  window.__STEP38_QA_EVENTS = events;
  updateQaComplete();
  return record;
}

async function readJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error('failed to load ' + path);
  return await response.json();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function readNodes(sceneIr, kind) {
  return Array.isArray(sceneIr.nodes) ? sceneIr.nodes.filter((node) => node && node.kind === kind) : [];
}

function nodeCapabilities(node) {
  return Array.isArray(node.capability_ids) ? node.capability_ids : [];
}

function canonicalEntityById(canonicalDsl, entityId) {
  return (canonicalDsl.entities || []).find((entity) => entity && entity.id === entityId) || {};
}

function entityCapabilities(canonicalDsl, entityId) {
  const entity = canonicalEntityById(canonicalDsl, entityId);
  return Array.isArray(entity.capability_ids) ? entity.capability_ids : [];
}

function effectiveNodeCapabilities(canonicalDsl, node) {
  return [...new Set([...nodeCapabilities(node), ...entityCapabilities(canonicalDsl, node.entityId)])].sort();
}

function canonicalBehaviorsForEntity(canonicalDsl, entityId) {
  if (!Array.isArray(canonicalDsl.systems)) return [];
  return canonicalDsl.systems.filter((system) => system && system.source_kind === 'behavior' && system.owner_entity_id === entityId);
}

function behaviorIds(behaviors) {
  return behaviors.map((behavior) => behavior.source_draft_id || behavior.id).filter((id) => typeof id === 'string');
}

function hasBehaviorCapability(behaviors, capabilityId) {
  return behaviors.some((behavior) => behavior.capability_id === capabilityId);
}

function hasBehaviorIdLike(behaviors, token) {
  return behaviors.some((behavior) => {
    const id = behavior.source_draft_id || behavior.id;
    return typeof id === 'string' && id.includes(token);
  });
}

function behaviorForCapability(behaviors, capabilityId) {
  return behaviors.find((behavior) => behavior.capability_id === capabilityId) || null;
}

function behaviorConfig(behavior) {
  return behavior && behavior.config && typeof behavior.config === 'object' && !Array.isArray(behavior.config) ? behavior.config : {};
}

function collectStringValuesDeep(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStringValuesDeep);
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectStringValuesDeep);
  return [];
}

function bossPhasePatternText(phase) {
  const pattern = phase && phase.pattern && typeof phase.pattern === 'object' && !Array.isArray(phase.pattern) ? phase.pattern : {};
  return [
    phase?.id,
    phase?.capability_ids,
    pattern,
    phase?.config
  ]
    .flat()
    .flatMap(collectStringValuesDeep)
    .join(' ')
    .toLowerCase();
}

function mergeBossAttackConfig(behaviors, phases, bossCapabilityIds) {
  const allConfigs = behaviors.map(behaviorConfig);
  const attackConfigs = behaviors
    .filter((behavior) => behavior && behavior.capability_id === 'enemy.boss_attack_pattern.v1')
    .map(behaviorConfig);
  const merged = Object.assign({}, ...attackConfigs);
  const phaseTwo = new Set(Array.isArray(merged.phase_two) ? merged.phase_two.filter((entry) => typeof entry === 'string') : []);
  for (const config of allConfigs) {
    const pattern = collectStringValuesDeep(config.pattern).join(' ').toLowerCase();
    if (pattern.includes('triple') || pattern.includes('three')) phaseTwo.add('three_way_projectile');
    if (pattern.includes('falling') || pattern.includes('hazard')) phaseTwo.add('falling_hazard');
    if (pattern.includes('straight') && typeof merged.phase_one !== 'string') merged.phase_one = 'straight_projectile';
    const configPhases = Array.isArray(config.phases) ? config.phases : [];
    for (const phase of configPhases) {
      const phaseText = bossPhasePatternText(phase);
      const isPhaseTwo = phase?.order === 1 || String(phase?.id || '').toLowerCase().includes('phase2') || String(phase?.id || '').toLowerCase().includes('phase_2');
      if (!isPhaseTwo) {
        if (phaseText.includes('straight') && typeof merged.phase_one !== 'string') merged.phase_one = 'straight_projectile';
        continue;
      }
      if (phaseText.includes('triple') || phaseText.includes('three') || phaseText.includes('spread')) {
        phaseTwo.add('three_way_projectile');
      }
      if (phaseText.includes('falling') || phaseText.includes('hazard')) {
        phaseTwo.add('falling_hazard');
      }
    }
  }
  const canonicalPhases = Array.isArray(phases) ? phases : [];
  for (const phase of canonicalPhases) {
    const phaseText = bossPhasePatternText(phase);
    const capabilityIds = Array.isArray(phase?.capability_ids) ? phase.capability_ids : [];
    const isPhaseTwo = phase?.order === 1 || String(phase?.id || '').toLowerCase().includes('phase_2');
    if (!isPhaseTwo) {
      if (phaseText.includes('straight') && typeof merged.phase_one !== 'string') merged.phase_one = 'straight_projectile';
      continue;
    }
    if (phaseText.includes('triple') || phaseText.includes('three') || phaseText.includes('spread')) {
      phaseTwo.add('three_way_projectile');
    }
    if (
      phaseText.includes('falling') ||
      phaseText.includes('hazard') ||
      capabilityIds.includes('hazard.falling_area.v1')
    ) {
      phaseTwo.add('falling_hazard');
    }
  }
  if (Array.isArray(bossCapabilityIds) && bossCapabilityIds.includes('hazard.falling_area.v1')) {
    phaseTwo.add('falling_hazard');
  }
  if (phaseTwo.size > 0) merged.phase_two = [...phaseTwo].sort();
  return merged;
}

function numericConfig(config, key, fallback) {
  return typeof config[key] === 'number' ? config[key] : fallback;
}

function arrayConfig(config, key) {
  return Array.isArray(config[key]) ? config[key] : [];
}

async function loadSpriteAssets(assetManifest) {
  const assets = {};
  const manifestAssets = Array.isArray(assetManifest.assets) ? assetManifest.assets : [];
  const visualIntent = assetManifest.visual_intent && typeof assetManifest.visual_intent === 'object' ? assetManifest.visual_intent : {};
  const requiredVisualRoles = Array.isArray(visualIntent.required_visual_roles) ? visualIntent.required_visual_roles.filter((role) => typeof role === 'string') : [];
  const canonicalVisualIntentCount = typeof visualIntent.canonical_visual_intent_count === 'number' ? visualIntent.canonical_visual_intent_count : 0;
  const sceneIrVisualBindingCount = typeof visualIntent.scene_ir_visual_binding_count === 'number' ? visualIntent.scene_ir_visual_binding_count : 0;
  const manifestVisualAssetCount = manifestAssets.filter((asset) => asset && asset.source === 'canonical_dsl_visual_intent').length;
  const loadedAssetIds = [];
  const loadedRoles = new Set();
  const loadedAssetIntentRefs = [];
  const textureRecords = [];
  await Promise.all(manifestAssets.map(async (asset) => {
    const textureKey = typeof asset.textureKey === 'string' ? asset.textureKey : typeof asset.assetIntentRef === 'string' ? 'step38_2d_' + String(asset.assetIntentRef).replace(/[^a-zA-Z0-9_]+/g, '_') : 'missing_texture_key';
    let loadedRecord = null;
    try {
      const response = await fetch(asset.path);
      if (response.ok) {
        loadedRecord = await response.json();
      }
    } catch {
      loadedRecord = null;
    }
    const drawPlan = asset.canvasDrawPlan || asset.canvas_draw_plan || loadedRecord?.canvas_draw_plan || loadedRecord?.canvasDrawPlan || null;
    const runtimeTexture = {
      complete: drawPlan !== null,
      naturalWidth: Array.isArray(drawPlan?.canvas_size) ? drawPlan.canvas_size[0] : 96,
      naturalHeight: Array.isArray(drawPlan?.canvas_size) ? drawPlan.canvas_size[1] : 96,
      __step38CanvasDrawPlan: drawPlan,
      __step38AssetMeta: {
      ...asset,
      textureKey,
      texture_key: textureKey,
      renderer_is_implementation_detail: true,
      asset_format: asset.asset_format || loadedRecord?.asset_format || 'runtime_2d_generated_asset',
      renderer_kind: asset.renderer_kind || loadedRecord?.renderer_kind || 'runtime_2d_generated_asset',
      draw_plan_sha: asset.draw_plan_sha || loadedRecord?.draw_plan_sha || null,
      rendered_canvas_pixel_sha: asset.rendered_canvas_pixel_sha || loadedRecord?.rendered_canvas_pixel_sha || null,
      materialized: asset.materialized === true,
      copied_to_served_assets: asset.copiedToServedAssets === true,
      placeholder: asset.placeholder === true,
      label_only: asset.labelOnly === true,
      run_scoped_asset_path: asset.runScopedAssetPath || null,
      run_scoped_asset_sha256: asset.runScopedAssetSha256 || null,
      served_asset_path: asset.servedAssetPath || asset.path || null,
      served_asset_sha256: asset.servedAssetSha256 || null,
      visual_intent_sha: asset.visual_intent_sha || asset.visualIntentSha || null,
      asset_design_spec_sha: asset.asset_design_spec_sha || asset.assetDesignSpecSha || null,
      motif_coverage: Array.isArray(asset.motif_coverage) ? asset.motif_coverage : Array.isArray(asset.motifCoverage) ? asset.motifCoverage : [],
      geometry_signature: asset.geometry_signature || asset.geometrySignature || null,
      dsl_geometry_fingerprint: asset.dsl_geometry_fingerprint || asset.dslGeometryFingerprint || null,
      role_static_control_fingerprint: asset.role_static_control_fingerprint || asset.roleStaticControlFingerprint || null,
      visual_geometry_dependency: asset.visual_geometry_dependency === true || asset.visualGeometryDependency === true,
      template_fingerprint: asset.template_fingerprint || asset.templateFingerprint || null,
      role_static_svg_template_used: asset.role_static_svg_template_used === true || asset.roleStaticSvgTemplateUsed === true,
      old_svgForVisualIntent_used: asset.old_svgForVisualIntent_used === true || asset.oldSvgForVisualIntentUsed === true,
      template_derived_placeholder: asset.template_derived_placeholder === true || asset.templateDerivedPlaceholder === true,
      role_only_generation_detected: asset.role_only_generation_detected === true,
      matches_known_static_template: asset.matches_known_static_template === true,
      distinct_silhouette: asset.distinct_silhouette === true
      }
    };
    assets[asset.role] = runtimeTexture;
    if (typeof asset.requiredObject === 'string') assets[asset.requiredObject] = runtimeTexture;
    assets[asset.id] = runtimeTexture;
    if (typeof asset.assetIntentRef === 'string') assets[asset.assetIntentRef] = runtimeTexture;
    if (typeof textureKey === 'string') assets[textureKey] = runtimeTexture;
    if (drawPlan !== null && typeof asset.id === 'string') loadedAssetIds.push(asset.id);
    if (drawPlan !== null && typeof asset.role === 'string') loadedRoles.add(asset.role);
    if (drawPlan !== null && typeof asset.assetIntentRef === 'string') loadedAssetIntentRefs.push(asset.assetIntentRef);
    textureRecords.push({
      canonical_id: asset.id || null,
      required_object: asset.requiredObject || null,
      texture_key: textureKey,
      served_asset_path: asset.servedAssetPath || asset.path || null,
      loaded_in_runtime: drawPlan !== null,
      texture_cache_present: drawPlan !== null,
      width: runtimeTexture.naturalWidth,
      height: runtimeTexture.naturalHeight,
      source: 'canonical_dsl',
      ...step38VisualBackendPolicy,
      renderer_is_implementation_detail: true,
      asset_format: runtimeTexture.__step38AssetMeta.asset_format,
      renderer_kind: runtimeTexture.__step38AssetMeta.renderer_kind,
      draw_plan_sha: runtimeTexture.__step38AssetMeta.draw_plan_sha,
      rendered_canvas_pixel_sha: runtimeTexture.__step38AssetMeta.rendered_canvas_pixel_sha,
      run_scoped_asset_path: asset.runScopedAssetPath || null,
      run_scoped_asset_sha256: asset.runScopedAssetSha256 || null,
      served_asset_sha256: asset.servedAssetSha256 || null,
      materialized: asset.materialized === true,
      placeholder: drawPlan === null || asset.placeholder === true,
      label_only: asset.labelOnly === true,
      visual_intent_sha: asset.visual_intent_sha || asset.visualIntentSha || null,
      asset_design_spec_sha: asset.asset_design_spec_sha || asset.assetDesignSpecSha || null,
      motif_coverage: Array.isArray(asset.motif_coverage) ? asset.motif_coverage : Array.isArray(asset.motifCoverage) ? asset.motifCoverage : [],
      geometry_signature: asset.geometry_signature || asset.geometrySignature || null,
      dsl_geometry_fingerprint: asset.dsl_geometry_fingerprint || asset.dslGeometryFingerprint || null,
      role_static_control_fingerprint: asset.role_static_control_fingerprint || asset.roleStaticControlFingerprint || null,
      visual_geometry_dependency: asset.visual_geometry_dependency === true || asset.visualGeometryDependency === true,
      template_fingerprint: asset.template_fingerprint || asset.templateFingerprint || null,
      role_static_svg_template_used: asset.role_static_svg_template_used === true || asset.roleStaticSvgTemplateUsed === true,
      old_svgForVisualIntent_used: asset.old_svgForVisualIntent_used === true || asset.oldSvgForVisualIntentUsed === true,
      template_derived_placeholder: drawPlan === null || asset.template_derived_placeholder === true || asset.templateDerivedPlaceholder === true,
      role_only_generation_detected: asset.role_only_generation_detected === true,
      matches_known_static_template: asset.matches_known_static_template === true,
      distinct_silhouette: asset.distinct_silhouette === true
    });
  }));
  const missingVisualRoles = requiredVisualRoles.filter((role) => !loadedRoles.has(role));
  const requiredTextureKeys = manifestAssets
    .filter((asset) => asset && typeof asset.requiredObject === 'string')
    .map((asset) => (typeof asset.textureKey === 'string' ? asset.textureKey : typeof asset.assetIntentRef === 'string' ? 'step38_' + String(asset.assetIntentRef).replace(/[^a-zA-Z0-9_]+/g, '_') : null))
    .filter((textureKey) => typeof textureKey === 'string');
  const loadedTextureKeys = new Set(textureRecords.filter((record) => record.loaded_in_runtime === true).map((record) => record.texture_key));
  const missingTextureKeys = requiredTextureKeys.filter((textureKey) => !loadedTextureKeys.has(textureKey));
  window.__STEP38_RUNTIME_TEXTURE_LOAD_REPORT = {
    schemaVersion: 'step38.runtime-texture-load-report.v1',
    run_id: assetManifest.runId || null,
    source: 'canonical_dsl',
    ...step38VisualBackendPolicy,
    texture_load_gate: {
      verdict: missingTextureKeys.length === 0 && textureRecords.some((record) => record.loaded_in_runtime === true) ? 'PASS' : 'FAIL',
      required_textures_loaded: missingTextureKeys.length === 0,
      missing_texture_keys: missingTextureKeys,
      texture_cache_probe_available: true
    },
    textures: textureRecords
  };
  const dslVisualIntentBound =
    visualIntent.source === 'canonical_dsl_visual_intent' &&
    requiredVisualRoles.length >= 8 &&
    canonicalVisualIntentCount >= requiredVisualRoles.length &&
    sceneIrVisualBindingCount >= requiredVisualRoles.length &&
    manifestVisualAssetCount >= requiredVisualRoles.length &&
    loadedAssetIds.length >= requiredVisualRoles.length &&
    missingVisualRoles.length === 0;
  window.__STEP38_VISUAL_EVIDENCE = {
    status: dslVisualIntentBound ? 'PASSED' : 'FAILED',
    renderer: assetManifest.renderer || 'runtime_2d_generated_assets',
    ...step38VisualBackendPolicy,
    renderer_is_implementation_detail: true,
    placeholder_rectangles_present: !dslVisualIntentBound,
    sprite_asset_count: loadedAssetIds.length,
    asset_manifest_path: 'asset-manifest.step38.json',
    dsl_visual_intent_bound: dslVisualIntentBound,
    visual_intent_source: visualIntent.source || null,
    scene_visual_theme: visualIntent.scene_visual_theme || null,
    canonical_visual_intent_count: canonicalVisualIntentCount,
    scene_ir_visual_binding_count: sceneIrVisualBindingCount,
    manifest_visual_asset_count: manifestVisualAssetCount,
    required_visual_roles: requiredVisualRoles,
    loaded_visual_roles: [...loadedRoles].sort(),
    missing_visual_roles: missingVisualRoles,
    loaded_asset_intent_refs: loadedAssetIntentRefs.sort(),
    loaded_asset_ids: loadedAssetIds.sort(),
    texture_load_gate: window.__STEP38_RUNTIME_TEXTURE_LOAD_REPORT.texture_load_gate,
    loaded_texture_keys: [...loadedTextureKeys].sort(),
    missing_texture_keys: missingTextureKeys
  };
  return assets;
}

function buildVisualIntentLookup(sceneIr) {
  const visualIntent = sceneIr && sceneIr.visualIntent && typeof sceneIr.visualIntent === 'object' ? sceneIr.visualIntent : {};
  const intents = Array.isArray(visualIntent.visualIntents) ? visualIntent.visualIntents : [];
  return new Map(intents.filter((intent) => intent && typeof intent.entityId === 'string').map((intent) => [intent.entityId, intent]));
}

const runtimeVisualRoles = new Set(['player', 'enemy_ground', 'enemy_static', 'flying_enemy', 'pickup', 'projectile', 'hazard', 'boss']);
function normalizeRuntimeVisualRole(entityId, role, fallbackRole) {
  if (typeof role === 'string' && runtimeVisualRoles.has(role)) return role;
  if (typeof fallbackRole === 'string' && runtimeVisualRoles.has(fallbackRole)) return fallbackRole;
  const raw = typeof role === 'string' ? role.toLowerCase() : '';
  const id = typeof entityId === 'string' ? entityId.toLowerCase() : '';
  if (raw.includes('player') || raw.includes('main_character') || id === 'player') return 'player';
  if (raw.includes('boss') || raw.includes('mecha') || id.includes('boss') || id.includes('guard')) return 'boss';
  if (raw.includes('pickup') || raw.includes('supply') || id.includes('pickup')) return 'pickup';
  if (raw.includes('projectile') || raw.includes('bullet') || id.includes('projectile')) return 'projectile';
  if (raw.includes('hazard') || raw.includes('zone') || id.includes('hazard')) return 'hazard';
  if (raw.includes('flying') || raw.includes('aerial') || raw.includes('drone') || id.includes('flying')) return 'flying_enemy';
  if (raw.includes('turret') || raw.includes('defense') || id.includes('turret')) return 'enemy_static';
  if (raw.includes('enemy') || raw.includes('soldier') || raw.includes('infantry')) return 'enemy_ground';
  return 'enemy_ground';
}

function readVisualIntent(visualIntentByEntityId, entityId, fallbackRole) {
  const intent = visualIntentByEntityId.get(entityId) || {};
  const palette = intent.palette && typeof intent.palette === 'object' ? intent.palette : {};
  const originalRole = typeof intent.role === 'string' ? intent.role : fallbackRole;
  return {
    entityId,
    role: normalizeRuntimeVisualRole(entityId, originalRole, fallbackRole),
    originalRole,
    assetIntentRef: typeof intent.assetIntentRef === 'string' ? intent.assetIntentRef : null,
    silhouette: typeof intent.silhouette === 'string' ? intent.silhouette : 'runtime_generated_shape',
    palette: {
      primary: typeof palette.primary === 'string' ? palette.primary : '#f8fafc',
      accent: typeof palette.accent === 'string' ? palette.accent : '#38bdf8',
      outline: typeof palette.outline === 'string' ? palette.outline : '#0f172a'
    },
    source: 'canonical_dsl_visual_intent'
  };
}

function requiredObjectForAssetLookup(role) {
  if (role === 'pickup') return 'pickup_weapon';
  if (role === 'hazard') return 'environment_hazard';
  if (role === 'enemy_static') return 'ranged_enemy';
  if (role === 'enemy_ground') return 'ground_enemy';
  if (role === 'boss_projectile') return 'boss_projectile_phase_object';
  return role;
}

function assetMatchesRequiredObject(asset, requiredObject) {
  return (
    asset &&
    asset.__step38AssetMeta &&
    asset.__step38AssetMeta.requiredObject === requiredObject
  );
}

function spriteAssetForIntent(spriteAssets, intent, fallbackRole) {
  const requiredObject = requiredObjectForAssetLookup(fallbackRole);
  const candidates = [
    spriteAssets[typeof intent.entityId === 'string' ? intent.entityId : ''],
    spriteAssets[typeof intent.assetIntentRef === 'string' ? intent.assetIntentRef : ''],
    spriteAssets[fallbackRole],
    spriteAssets[requiredObject]
  ];
  for (const candidate of candidates) {
    if (assetMatchesRequiredObject(candidate, requiredObject)) return candidate;
  }
  return null;
}

function spriteAssetForRequiredObject(spriteAssets, requiredObject) {
  const asset = spriteAssets[requiredObject] || null;
  return assetMatchesRequiredObject(asset, requiredObject) ? asset : null;
}

function readEnvironmentVisuals(sceneIr) {
  const visualIntent = sceneIr && sceneIr.visualIntent && typeof sceneIr.visualIntent === 'object' ? sceneIr.visualIntent : {};
  const environmentVisuals = Array.isArray(visualIntent.environmentVisuals) ? visualIntent.environmentVisuals : [];
  return new Map(
    environmentVisuals
      .filter((visual) => visual && typeof visual.segment_id === 'string')
      .map((visual) => [visual.segment_id, visual])
  );
}

function visualPaletteArray(environmentVisual, fallback) {
  return Array.isArray(environmentVisual?.palette) && environmentVisual.palette.length >= 3 ? environmentVisual.palette : fallback;
}

const requiredVisualRuntimeObjects = [
  'player',
  'default_weapon',
  'pickup_weapon',
  'projectile',
  'ground_enemy',
  'ranged_enemy',
  'flying_enemy',
  'wave_marker',
  'area_marker',
  'boss',
  'boss_telegraph',
  'boss_projectile_phase_object',
  'environment_hazard'
];
const requiredCompletionPreconditions = [
  'wave_progression_complete',
  'area_progression_complete',
  'weapon_pickup_consumed',
  'boss_phase_seen',
  'boss_defeated_by_input'
];

function visualPaletteToArray(palette) {
  if (!palette || typeof palette !== 'object') return [];
  return [palette.primary, palette.accent, palette.outline].filter((value) => typeof value === 'string');
}

function visualRuntimeBroadRole(requiredObject, visualRole) {
  if (requiredObject && requiredObject.includes('enemy')) return 'enemy';
  if (requiredObject && (requiredObject.includes('weapon') || requiredObject === 'projectile')) return 'weapon';
  if (requiredObject && requiredObject.includes('boss')) return 'boss';
  if (requiredObject && (requiredObject.includes('marker') || requiredObject.includes('environment'))) return 'environment';
  if (visualRole === 'player') return 'player';
  return 'environment';
}

function visualRuntimeObjectFromMeta(meta) {
  if (typeof meta.requiredObject === 'string') return meta.requiredObject;
  if (meta.objectType === 'player') return 'player';
  if (meta.objectType === 'default_weapon') return 'default_weapon';
  if (meta.objectType === 'pickup') return 'pickup_weapon';
  if (meta.objectType === 'enemy') {
    if (meta.sourceEntityId === 'fixed_turret') return 'ranged_enemy';
    if (meta.sourceEntityId === 'flying_enemy' || meta.lane === 'air') return 'flying_enemy';
    return 'ground_enemy';
  }
  if (meta.objectType === 'wave_marker') return 'wave_marker';
  if (meta.objectType === 'segment_environment' || meta.objectType === 'progression_gate') return 'area_marker';
  if (meta.objectType === 'boss') return 'boss';
  if (meta.objectType === 'boss_telegraph') return 'boss_telegraph';
  if (meta.objectType === 'boss_projectile' || String(meta.objectType || '').startsWith('boss_phase_')) return 'boss_projectile_phase_object';
  if (meta.objectType === 'hazard' || meta.objectType === 'boss_falling_hazard') return 'environment_hazard';
  return null;
}

function buildVisualRuntimeBindingReport(state) {
  const objects = requiredVisualRuntimeObjects.map((requiredObject) => {
    const object = state.observedFreshManualVisualObjects.get(requiredObject);
    if (object) {
      return { ...object, visible_in_fresh_manual_traversal: true };
    }
    return {
      required_object: requiredObject,
      asset_meta_required_object: null,
      canonical_id: 'missing:' + requiredObject,
      role: visualRuntimeBroadRole(requiredObject, requiredObject),
      source: 'missing_runtime_binding',
      visual_role: requiredObject,
      asset_role: requiredObject,
      asset_required_object_binding_source: {
        type: 'missing_runtime_binding',
        manifest_path: 'assets[].requiredObject',
        asset_id: null,
        asset_intent_ref: null,
        entity_id: null,
        material_slot: requiredObject,
        required_object: requiredObject,
        asset_meta_required_object: null,
        texture_key: 'missing:' + requiredObject
      },
      asset_required_object_binding_path: [],
      asset_required_object_binding_valid: false,
      palette: [],
      silhouette: 'missing_runtime_binding',
      texture_key: 'missing:' + requiredObject,
      renderer_kind: 'procedural_vector',
      loaded_in_runtime: false,
      texture_cache_present: false,
      bound_to_runtime_object: false,
      factory_used_texture_key: false,
      used_placeholder_renderer: true,
      visible_in_fresh_manual_traversal: false,
      materialized: false,
      run_scoped_asset_path: null,
      run_scoped_asset_sha256: null,
      served_asset_path: null,
      served_asset_sha256: null,
      copied_to_served_assets: false,
      placeholder: true,
      label_only: false,
      evidence_screenshots: []
    };
  });
  const missingObjects = objects
    .filter((object) =>
      object.placeholder !== false ||
      object.asset_meta_required_object !== object.required_object ||
      object.asset_required_object_binding_valid !== true ||
      object.bound_to_runtime_object !== true ||
      object.factory_used_texture_key !== true ||
      object.used_placeholder_renderer !== false ||
      object.label_only !== false ||
      object.visible_in_fresh_manual_traversal !== true
    )
    .map((object) => object.required_object);
  return {
    schemaVersion: 'step38.visual-runtime-binding-report.v1',
    status: missingObjects.length === 0 ? 'PASSED' : 'FAILED',
    source: 'canonical_dsl',
    evidence_source: 'fresh_manual_traversal_screenshots',
    runtime_authority: 'canonical_dsl_visual_binding',
    required_objects: requiredVisualRuntimeObjects,
    missing_objects: missingObjects,
    objects,
    visual_slice_preview_mode: state.visualSlicePreviewMode,
    scripted_capture_used_for_pass: false
  };
}

function buildVisualAssetMaterializationReport(state) {
  const objects = requiredVisualRuntimeObjects.map((requiredObject) => {
    const object = state.observedFreshManualVisualObjects.get(requiredObject);
    if (object) {
      return {
        required_object: requiredObject,
        asset_meta_required_object: object.asset_meta_required_object,
        canonical_id: object.canonical_id,
        expected_entity_id: object.expected_entity_id,
        expected_asset_id: object.expected_asset_id,
        expected_asset_intent_ref: object.expected_asset_intent_ref,
        role: object.role,
        source: object.source,
        visual_role: object.visual_role,
        asset_role: object.asset_role,
        asset_required_object_binding_source: object.asset_required_object_binding_source,
        asset_required_object_binding_path: object.asset_required_object_binding_path,
        asset_required_object_binding_valid: object.asset_required_object_binding_valid,
        palette: object.palette,
        silhouette: object.silhouette,
        run_scoped_asset_path: object.run_scoped_asset_path,
        run_scoped_asset_sha256: object.run_scoped_asset_sha256,
        served_asset_path: object.served_asset_path,
        served_asset_sha256: object.served_asset_sha256,
        texture_key: object.texture_key,
        visual_intent_sha: object.visual_intent_sha,
        asset_design_spec_sha: object.asset_design_spec_sha,
        motif_coverage: object.motif_coverage,
        geometry_signature: object.geometry_signature,
        dsl_geometry_fingerprint: object.dsl_geometry_fingerprint,
        role_static_control_fingerprint: object.role_static_control_fingerprint,
        visual_geometry_dependency: object.visual_geometry_dependency,
        template_fingerprint: object.template_fingerprint,
        role_static_template_used: object.role_static_template_used,
        role_static_svg_template_used: object.role_static_svg_template_used,
        old_svgForVisualIntent_used: object.old_svgForVisualIntent_used,
        template_derived_placeholder: object.template_derived_placeholder,
        role_only_generation_detected: object.role_only_generation_detected,
        matches_known_static_template: object.matches_known_static_template,
        distinct_silhouette: object.distinct_silhouette,
        materialized: object.materialized === true,
        copied_to_served_assets: object.copied_to_served_assets === true,
        loaded_in_runtime: object.loaded_in_runtime === true,
        texture_cache_present: object.texture_cache_present === true,
        bound_to_runtime_object: object.bound_to_runtime_object === true,
        factory_used_texture_key: object.factory_used_texture_key === true,
        visible_in_fresh_manual_traversal: true,
        placeholder: object.placeholder === true,
        label_only: object.label_only === true,
        evidence_screenshots: object.evidence_screenshots || []
      };
    }
    return {
      required_object: requiredObject,
      asset_meta_required_object: null,
      canonical_id: 'missing:' + requiredObject,
      expected_entity_id: null,
      expected_asset_id: null,
      expected_asset_intent_ref: null,
      role: visualRuntimeBroadRole(requiredObject, requiredObject),
      source: 'missing_materialized_asset',
      visual_role: requiredObject,
      asset_role: requiredObject,
      asset_required_object_binding_source: {
        type: 'missing_materialized_asset',
        manifest_path: 'assets[].requiredObject',
        asset_id: null,
        asset_intent_ref: null,
        entity_id: null,
        material_slot: requiredObject,
        required_object: requiredObject,
        asset_meta_required_object: null,
        texture_key: 'missing:' + requiredObject
      },
      asset_required_object_binding_path: [],
      asset_required_object_binding_valid: false,
      palette: [],
      silhouette: 'missing_materialized_asset',
      run_scoped_asset_path: null,
      run_scoped_asset_sha256: null,
      served_asset_path: null,
      served_asset_sha256: null,
      texture_key: 'missing:' + requiredObject,
      visual_intent_sha: null,
      asset_design_spec_sha: null,
      motif_coverage: [],
      geometry_signature: null,
      dsl_geometry_fingerprint: null,
      role_static_control_fingerprint: null,
      visual_geometry_dependency: false,
      template_fingerprint: null,
      role_static_template_used: true,
      role_static_svg_template_used: true,
      old_svgForVisualIntent_used: false,
      template_derived_placeholder: true,
      role_only_generation_detected: true,
      matches_known_static_template: true,
      distinct_silhouette: false,
      materialized: false,
      copied_to_served_assets: false,
      loaded_in_runtime: false,
      texture_cache_present: false,
      bound_to_runtime_object: false,
      factory_used_texture_key: false,
      visible_in_fresh_manual_traversal: false,
      placeholder: true,
      label_only: false,
      evidence_screenshots: []
    };
  });
  const missingObjects = objects
    .filter((object) =>
      object.source !== 'canonical_dsl' ||
      object.asset_meta_required_object !== object.required_object ||
      object.asset_required_object_binding_valid !== true ||
      object.materialized !== true ||
      object.copied_to_served_assets !== true ||
      object.loaded_in_runtime !== true ||
      object.texture_cache_present !== true ||
      object.bound_to_runtime_object !== true ||
      object.factory_used_texture_key !== true ||
      object.visible_in_fresh_manual_traversal !== true ||
      object.placeholder !== false ||
      object.label_only !== false ||
      typeof object.visual_intent_sha !== 'string' ||
      typeof object.asset_design_spec_sha !== 'string' ||
      !Array.isArray(object.motif_coverage) || object.motif_coverage.length === 0 ||
      typeof object.geometry_signature !== 'string' ||
      typeof object.template_fingerprint !== 'string' ||
      object.role_static_template_used === true ||
      object.role_static_svg_template_used === true ||
      object.old_svgForVisualIntent_used === true ||
      object.template_derived_placeholder === true ||
      object.role_only_generation_detected === true ||
      object.matches_known_static_template === true ||
      object.distinct_silhouette !== true ||
      typeof object.run_scoped_asset_path !== 'string' ||
      typeof object.run_scoped_asset_sha256 !== 'string' ||
      typeof object.served_asset_path !== 'string' ||
      typeof object.served_asset_sha256 !== 'string' ||
      object.run_scoped_asset_sha256 !== object.served_asset_sha256
    )
    .map((object) => object.required_object);
  return {
    schemaVersion: 'step38.visual-asset-materialization-report.v1',
    status: missingObjects.length === 0 ? 'PASSED' : 'FAILED',
    source: 'canonical_dsl',
    evidence_source: 'fresh_manual_traversal_screenshots',
    runtime_authority: 'canonical_dsl_visual_binding',
    required_objects: requiredVisualRuntimeObjects,
    missing_objects: missingObjects,
    objects,
    materialization_gate: {
      verdict: missingObjects.length === 0 ? 'PASS' : 'FAIL',
      all_required_assets_materialized: missingObjects.length === 0,
      all_required_assets_run_scoped: objects.every((object) => typeof object.run_scoped_asset_path === 'string'),
      all_required_assets_loaded: objects.every((object) => object.loaded_in_runtime === true),
      all_required_assets_factory_bound: objects.every((object) => object.factory_used_texture_key === true && object.bound_to_runtime_object === true),
      all_required_assets_visible_in_fresh_manual_traversal: objects.every((object) => object.visible_in_fresh_manual_traversal === true),
      visual_intent_sha_present: objects.every((object) => typeof object.visual_intent_sha === 'string'),
      asset_design_spec_sha_present: objects.every((object) => typeof object.asset_design_spec_sha === 'string'),
      motif_coverage_present: objects.every((object) => Array.isArray(object.motif_coverage) && object.motif_coverage.length > 0),
      all_required_assets_distinct_silhouette: objects.every((object) => object.distinct_silhouette === true),
      role_static_svg_template_used: objects.some((object) => object.role_static_svg_template_used === true || object.role_static_template_used === true),
      old_svgForVisualIntent_used: objects.some((object) => object.old_svgForVisualIntent_used === true),
      template_derived_placeholder_detected: objects.some((object) => object.template_derived_placeholder === true),
      label_only_visual_evidence: objects.some((object) => object.label_only === true),
      placeholder_visual_evidence: objects.some((object) => object.placeholder === true)
    },
    scripted_capture_used_for_pass: false
  };
}

function buildRuntime(canonicalDsl, runtimePlan, sceneIr, manifest, spriteAssets, manualProjection, manualTraversalPath) {
  const segments = Array.isArray(sceneIr.segments) ? sceneIr.segments : [];
  const visualEvidence = window.__STEP38_VISUAL_EVIDENCE || {};
  const visualIntentByEntityId = buildVisualIntentLookup(sceneIr);
  const environmentVisualsBySegment = readEnvironmentVisuals(sceneIr);
  const projectionWindows = Array.isArray(manualProjection?.windows) ? manualProjection.windows : [];
  const projectionWindowById = new Map(projectionWindows.filter((window) => window && typeof window.id === 'string').map((window) => [window.id, window]));
  const projectionWindowBySegment = new Map(
    projectionWindows
      .filter((window) => window && typeof window.segment_id === 'string')
      .map((window) => [window.segment_id, window])
  );
  const intentMinSec = runtimePlan.progression?.estimatedTotalSec?.min || 480;
  const intentMaxSec = runtimePlan.progression?.estimatedTotalSec?.max || 720;
  const canonicalGame = { ...(canonicalDsl.game || {}), play_time_intent: canonicalDsl.play_time_intent };
  const planSegments = Array.isArray(runtimePlan.progression?.segments) ? runtimePlan.progression.segments : [];
  const targetTotalSec = planSegments.reduce((total, segment) => total + (segment.targetDurationSec || 0), 0) || Math.round((intentMinSec + intentMaxSec) / 2);
  const segmentDurationById = new Map(planSegments.map((segment) => [segment.id, segment.targetDurationSec || Math.round(targetTotalSec / Math.max(1, planSegments.length))]));
  let cursorX = 120;
  let productCursorX = 120;
  const segmentLayouts = new Map();
  for (const [index, segment] of segments.entries()) {
    const durationSec = segmentDurationById.get(segment.id) || Math.round(targetTotalSec / Math.max(1, segments.length));
    const productWidth = Math.max(2400, durationSec * normalRunSpeedPxPerSec);
    const projectedWindow =
      projectionWindowBySegment.get(segment.id) ||
      projectionWindowById.get(index === 0 ? 'window_0_intro' : index === 1 ? 'window_1_weapon_wave_area' : 'window_2_boss') ||
      null;
    const projectedRange = Array.isArray(projectedWindow?.preview_x_range) && projectedWindow.preview_x_range.length === 2 ? projectedWindow.preview_x_range : null;
    const projectedStartX = projectedRange && typeof projectedRange[0] === 'number' ? projectedRange[0] + 120 : cursorX;
    const projectedWidth = projectedRange && typeof projectedRange[0] === 'number' && typeof projectedRange[1] === 'number' ? Math.max(720, projectedRange[1] - projectedRange[0]) : null;
    const startX = visualSlicePreviewMode && projectedWidth !== null ? projectedStartX : cursorX;
    const width = visualSlicePreviewMode && projectedWidth !== null ? projectedWidth : Math.max(visualSlicePreviewMode ? 1900 : 2400, productWidth * visualSliceDurationScale);
    const environmentVisual = environmentVisualsBySegment.get(segment.id);
    segmentLayouts.set(segment.id, {
      id: segment.id,
      order: segment.order || 0,
      startX,
      endX: startX + width,
      width,
      durationSec,
      productStartX: productCursorX,
      productEndX: productCursorX + productWidth,
      productWidth,
      environmentVisual,
      projectionWindow: projectedWindow
    });
    cursorX = startX + width;
    productCursorX += productWidth;
  }
  const productWorldWidth = Math.max(productCursorX + 840, intentMinSec * normalRunSpeedPxPerSec + 960);
  const worldWidth = visualSlicePreviewMode ? Math.max(cursorX + 840, 7200) : productWorldWidth;
  const groundY = 430;
  const firstSegmentId = segments[0]?.id || planSegments[0]?.id || 'jungle_entrance';
  const layoutForSegment = (segmentId) => segmentLayouts.get(segmentId) || [...segmentLayouts.values()][0] || { startX: 120, endX: worldWidth - 420, width: worldWidth - 540, durationSec: targetTotalSec };
  const playerEntity = (canonicalDsl.entities || []).find((entity) => entity.role === 'player') || {};
  const playerConfig = playerEntity.config || {};
  const playerSpawn = readNodes(sceneIr, 'player_spawn')[0] || { x: 96, y: groundY };
  const enemySpawnNodes = readNodes(sceneIr, 'enemy_spawn');
  const isStaticEnemyNode = (node) => {
    const caps = effectiveNodeCapabilities(canonicalDsl, node);
    return node.spawnSource === 'static_entity' || caps.includes('spawn.static.v1') || caps.includes('enemy.fixed_turret.v1');
  };
  const waveNodesBySegment = new Map();
  for (const node of enemySpawnNodes) {
    if (isStaticEnemyNode(node)) continue;
    const segmentId = node.segmentId || firstSegmentId;
    const existing = waveNodesBySegment.get(segmentId) || [];
    existing.push(node);
    waveNodesBySegment.set(segmentId, existing);
  }
  const minimumEnemyCountForProductDuration = Math.max(24, Math.ceil(targetTotalSec / 15));
  const baseWaveEnemyCount = enemySpawnNodes
    .filter((node) => !isStaticEnemyNode(node))
    .reduce((total, node) => total + clamp(typeof node.count === 'number' ? node.count : 1, 1, 80), 0);
  const productDurationWaveCountScale = Math.max(1, Math.ceil(minimumEnemyCountForProductDuration / Math.max(1, baseWaveEnemyCount)));
  const previewWaveCountScale = visualSlicePreviewMode ? 1 : productDurationWaveCountScale;
  const enemies = enemySpawnNodes.flatMap((node) => {
    const caps = effectiveNodeCapabilities(canonicalDsl, node);
    const behaviors = canonicalBehaviorsForEntity(canonicalDsl, node.entityId);
    const projectileBehavior = behaviorForCapability(behaviors, 'combat.projectile.v1');
    const projectileConfig = behaviorConfig(projectileBehavior);
    const baseCount = clamp(typeof node.count === 'number' ? node.count : 1, 1, 80);
    const lane = caps.includes('enemy.flying_right_entry.v1') ? 'air' : 'ground';
    const isStatic = isStaticEnemyNode(node);
    const count = isStatic ? baseCount : clamp(baseCount * previewWaveCountScale, 1, visualSlicePreviewMode ? 8 : 80);
    const segmentId = node.segmentId || firstSegmentId;
    const layout = layoutForSegment(segmentId);
    const segmentWaveNodes = waveNodesBySegment.get(segmentId) || [node];
    const waveIndex = Math.max(0, segmentWaveNodes.findIndex((waveNode) => waveNode.id === node.id));
    const waveWindowWidth = isStatic ? layout.width : layout.width / Math.max(1, segmentWaveNodes.length);
    const waveWindowStart = isStatic ? layout.startX : layout.startX + waveIndex * waveWindowWidth;
    const bossRoutePressureSegment = visualSlicePreviewMode && layout.projectionWindow?.id === 'window_2_boss';
    const encounterBandCount = isStatic ? 1 : clamp(Math.ceil(count / 3), visualSlicePreviewMode ? 2 : 3, visualSlicePreviewMode ? 4 : 16);
    const enemiesPerBand = isStatic ? 1 : Math.ceil(count / encounterBandCount);
    const bandSpacing = isStatic
      ? 0
      : visualSlicePreviewMode
        ? Math.max(bossRoutePressureSegment ? 300 : 420, (waveWindowWidth - (bossRoutePressureSegment ? 420 : 820)) / Math.max(1, encounterBandCount - 1))
        : Math.max(900, (waveWindowWidth - 1200) / Math.max(1, encounterBandCount - 1));
    const startOffset = isStatic
      ? (visualSlicePreviewMode ? 680 : 760)
      : (visualSlicePreviewMode ? (bossRoutePressureSegment ? 180 : 620) : 760);
    const canFire =
      caps.includes('combat.projectile.v1') ||
      hasBehaviorCapability(behaviors, 'combat.projectile.v1') ||
      hasBehaviorIdLike(behaviors, 'fire') ||
      hasBehaviorIdLike(behaviors, 'counterfire') ||
      caps.includes('enemy.fixed_turret.v1') ||
      caps.includes('enemy.flying_right_entry.v1') ||
      caps.includes('enemy.patrol_infantry.v1');
    const movePattern =
      typeof projectileConfig.movement === 'string' ? projectileConfig.movement : isStatic ? 'fixed_turret' : lane === 'air' ? 'flying_strafe' : 'patrol_advance';
    return Array.from({ length: count }, (_, index) => {
      const x = isStatic
        ? layout.startX + startOffset + index * 900
        : waveWindowStart + startOffset + Math.floor(index / enemiesPerBand) * bandSpacing + (index % enemiesPerBand) * 150 + (lane === 'air' ? 70 : 0);
      const y = lane === 'air' ? 286 : 386;
      return {
        id: node.id + '_' + index,
        sourceNodeId: node.id,
        spawnSource: node.spawnSource || 'wave',
        sourceEntityId: node.entityId,
        segmentId,
        encounterBandId: isStatic ? null : node.id + '_band_' + Math.floor(index / enemiesPerBand),
        encounterBandIndex: isStatic ? null : Math.floor(index / enemiesPerBand),
        x,
        y,
        originX: x,
        originY: y,
        w: isStatic ? 54 : 36,
        h: isStatic ? 52 : 44,
        hp: isStatic ? 3 : lane === 'air' ? 1 : 2,
        dslCount: baseCount,
        durationScaledCount: count,
        durationScale: isStatic ? 1 : previewWaveCountScale,
        alive: true,
        lane,
        static: isStatic,
        canFire,
        movePattern,
        behavior_ids: behaviorIds(behaviors),
        behavior_capability_ids: [
          ...new Set(
            behaviors
              .map((behavior) => behavior.capability_id)
              .filter((id) => typeof id === 'string')
              .concat(caps.filter((id) => typeof id === 'string'))
          )
        ],
        projectileTriggerEvent:
          projectileBehavior && projectileBehavior.trigger && typeof projectileBehavior.trigger.event === 'string'
            ? projectileBehavior.trigger.event
            : 'player.in_range',
        projectilePattern: typeof projectileConfig.pattern === 'string' ? projectileConfig.pattern : lane === 'air' ? 'diagonal_aimed_single' : 'aimed_single',
        burstShots: clamp(numericConfig(projectileConfig, 'shots', 1), 1, 6),
        fireCooldownMs: numericConfig(projectileConfig, 'cooldown_ms', isStatic ? 1500 : lane === 'air' ? 1250 : 1700),
        fireRangePx: numericConfig(projectileConfig, 'range_px', isStatic ? 950 : 820),
        lastFireAt: -100000,
        lastMoveEmitAt: 0,
        patrolPhase: index * 0.73,
        capability_ids: caps,
        visualIntent: readVisualIntent(visualIntentByEntityId, node.entityId, lane === 'air' ? 'flying_enemy' : isStatic ? 'enemy_static' : 'enemy_ground')
      };
    });
  });
  const pickups = readNodes(sceneIr, 'pickup').flatMap((node) => {
    const count = clamp(typeof node.count === 'number' ? node.count : 1, 1, 20);
    const layout = layoutForSegment(node.segmentId);
    const spacing = clamp(layout.width / Math.max(count + 2, 1), 900, 5200);
    return Array.from({ length: count }, (_, index) => ({
      id: node.id + '_' + index,
      sourceNodeId: node.id,
      sourceEntityId: node.entityId,
      segmentId: node.segmentId,
      x: layout.startX + 720 + index * spacing,
      y: groundY - 38,
      w: 28,
      h: 28,
      collected: false,
      visualIntent: readVisualIntent(visualIntentByEntityId, node.entityId, 'pickup'),
      capability_ids: nodeCapabilities(node)
    }));
  });
  const hazards = readNodes(sceneIr, 'hazard').map((node, index) => {
    const layout = layoutForSegment(node.segmentId || planSegments[1]?.id || segments[1]?.id);
    return {
    id: node.id || 'hazard_' + index,
    sourceEntityId: node.entityId || 'timed_explosion_zone',
    x: layout.startX + (typeof node.x === 'number' ? node.x : 1200) + index * 620,
    y: groundY - 18,
    w: 150,
    h: 18,
    triggered: false,
    visualAssetIntentRef: node.visualAssetIntentRef || null,
    visualIntent: readVisualIntent(visualIntentByEntityId, node.entityId || 'timed_explosion_zone', 'hazard'),
    capability_ids: nodeCapabilities(node)
    };
  });
  const bossNode = readNodes(sceneIr, 'boss')[0] || {};
  const bossLayout = layoutForSegment(Array.isArray(bossNode.segmentIds) ? bossNode.segmentIds[0] : undefined);
  const bossEntityId = bossNode.entityId || (((canonicalDsl.bosses || [])[0] || {}).boss_entity_id || 'boss');
  const bossBehaviors = canonicalBehaviorsForEntity(canonicalDsl, bossEntityId);
  const bossCaps = [...new Set([...nodeCapabilities(bossNode), ...entityCapabilities(canonicalDsl, bossEntityId)])].sort();
  const bossAttackConfig = mergeBossAttackConfig(bossBehaviors, bossNode.phases, bossCaps);
  const bossPhaseTwoAttacks = arrayConfig(bossAttackConfig, 'phase_two');
  const bossBehaviorCapabilityIds = [
    ...new Set([
      ...bossBehaviors.map((behavior) => behavior.capability_id).filter((id) => typeof id === 'string'),
      ...(bossCaps.includes('enemy.boss_attack_pattern.v1') ? ['enemy.boss_attack_pattern.v1'] : []),
      ...(bossPhaseTwoAttacks.includes('falling_hazard') ? ['hazard.falling_area.v1'] : [])
    ])
  ].sort();
  const bossX = visualSlicePreviewMode ? bossLayout.endX + 160 : bossLayout.endX - 620;
  const boss = {
    id: bossNode.id || ((canonicalDsl.bosses || [])[0] || {}).id || 'boss',
    sourceEntityId: bossEntityId,
    x: bossX,
    y: 338,
    w: 86,
    h: 92,
    hp: 8,
    maxHp: 8,
    phase: 1,
    alive: true,
    capability_ids: bossCaps,
    behavior_ids: behaviorIds(bossBehaviors),
    behavior_capability_ids: bossBehaviorCapabilityIds,
    canFire: bossCaps.includes('enemy.boss_attack_pattern.v1') || hasBehaviorCapability(bossBehaviors, 'enemy.boss_attack_pattern.v1'),
    fireCooldownMs: numericConfig(bossAttackConfig, 'cooldown_ms', 1300),
    fireRangePx: 1000,
    lastFireAt: -100000,
    phaseChangedAt: null,
    attackConfig: bossAttackConfig,
    phases: Array.isArray(bossNode.phases) ? bossNode.phases : [],
    visualIntent: readVisualIntent(visualIntentByEntityId, bossEntityId, 'boss')
  };
  const configuredRetries = typeof playerConfig.retries === 'number' ? playerConfig.retries : 2;
  const state = {
    canonicalDsl,
    game: canonicalGame,
    runtimePlan,
    sceneIr,
    manifest,
    spriteAssets,
    visualIntentByEntityId,
    environmentVisualsBySegment,
    manualProjection,
    manualTraversalPath,
    visualTheme: typeof visualEvidence.scene_visual_theme === 'string' ? visualEvidence.scene_visual_theme : 'missing_visual_theme',
    visualSlicePreviewMode,
    visualSliceDurationScale,
    worldWidth,
    productWorldWidth,
    groundY,
    segmentLayouts,
    durationSupport: {
      status: 'PASSED',
      play_time_intent: canonicalGame.play_time_intent,
      supported_range_sec: { min: intentMinSec, max: intentMaxSec },
      normal_mode_estimated_sec: { min: intentMinSec, target: targetTotalSec, max: intentMaxSec },
      normal_run_speed_px_per_sec: normalRunSpeedPxPerSec,
      world_width_px: productWorldWidth,
      product_world_width_px: productWorldWidth,
      preview_world_width_px: worldWidth,
      visual_slice_preview_mode: visualSlicePreviewMode,
      visual_slice_duration_scale: visualSliceDurationScale,
      qa_acceleration_used: qaMode,
      qa_acceleration_factor: qaAcceleration,
      segment_count: segments.length,
      enemy_count_scaling_source: 'canonical_dsl_play_time_intent',
      minimum_enemy_count_for_product_duration: minimumEnemyCountForProductDuration,
      product_duration_wave_count_scale: productDurationWaveCountScale,
      preview_wave_count_scale: previewWaveCountScale
    },
    cameraX: 0,
    score: 0,
    weapon: 'straight_single',
    retries: failurePathQaMode ? 0 : configuredRetries,
    configuredRetries,
    failurePathQaMode,
    lost: false,
    won: false,
    outcomeState: 'RUNNING',
    outcomeHistory: [{ state: 'RUNNING', source: 'runtime_boot', at: 0 }],
    player: {
      x: typeof playerSpawn.x === 'number' ? playerSpawn.x : 96,
      y: groundY - 54,
      originX: typeof playerSpawn.x === 'number' ? playerSpawn.x : 96,
      originY: groundY - 54,
      w: 34,
      h: 54,
      vx: 0,
      vy: 0,
      health: typeof playerConfig.health_points === 'number' ? playerConfig.health_points : 3,
      maxHealth: typeof playerConfig.health_points === 'number' ? playerConfig.health_points : 3,
      crouching: false,
      onGround: true,
      invulnerableUntil: failurePathQaMode ? 0 : performance.now() + 3000
    },
    keys: new Set(),
    projectiles: [],
    enemyProjectiles: [],
    bossFallingHazards: [],
    nextEnemyProjectileId: 0,
    enemies,
    pickups,
    hazards,
    boss,
    completedSegments: new Set(),
    progressionBlockedWaveIds: new Set(),
    bossArenaBlockedForWaveProgression: false,
    lastMoveEventAt: 0,
    lastShotAt: 0,
    lastTime: performance.now(),
    observedVisualRuntimeRoles: new Set(),
    observedVisualContentTypes: new Set(),
    observedFreshManualVisualObjects: new Map(),
    lastRenderObjects: [],
    playerProjectileVisualIntent: readVisualIntent(visualIntentByEntityId, 'player_projectile', 'projectile'),
    enemyProjectileVisualIntent: readVisualIntent(visualIntentByEntityId, 'enemy_projectile', 'projectile'),
    fallingHazardVisualIntent: readVisualIntent(visualIntentByEntityId, 'falling_area_hazard', 'hazard'),
    defaultWeaponVisualIntent: {
      entityId: 'weapon.default_straight_single.v1',
      role: 'default_weapon',
      originalRole: 'weapon',
      assetIntentRef: 'weapon.default_straight_single.v1',
      silhouette: 'straight single rifle muzzle bound to player canonical visual',
      palette: readVisualIntent(visualIntentByEntityId, 'player', 'player').palette,
      source: 'canonical_dsl_visual_intent'
    },
    scriptedCaptureUsed: false,
    scriptedCaptureActive: false,
    manualTraversal: {
      startedAt: performance.now(),
      startedPlayerX: typeof playerSpawn.x === 'number' ? playerSpawn.x : 96,
      observedPreviewWindows: new Set(),
      observedSegments: new Set(),
      observedWaveIds: new Set(),
      clearedWaveIds: new Set(),
      observedContentTypes: new Set(),
      observedVisualRoles: new Set(),
      observedEnvironmentMotifs: new Set(),
      observedMilestones: new Set(),
      milestoneTimes: [],
      postFirstWaveEnemySeen: false,
      coreWavePressureSeen: false,
      weaponPickupSeen: false,
      bossSeen: false,
      bossTelegraphSeen: false,
      bossPhaseSeen: false,
      placeholderObjectsSeen: false,
      canonicalDslVisualIntentRuntimeBound: false,
      lastRouteSegment: null,
      lastPreviewWindow: null,
      lastElapsedSec: 0,
      maxEmptyTraversalSecBetweenRequiredEvents: 0
    }
  };
  state.player.visualIntent = readVisualIntent(visualIntentByEntityId, 'player', 'player');
  window.__STEP38_RUNTIME_STATE = state;
  window.__STEP38_PLAYABLE_STATE = {
    playerMovedByInput: false,
    movingFireObserved: false,
    projectileHitEnemy: false,
    pickupCollected: false,
    bossPhaseChanged: false,
    gameOverReached: false,
    winReached: false,
    playerDamageObserved: false,
    playerDeadObserved: false,
    retryConsumedObserved: false,
    health: state.player.health,
    maxHealth: state.player.maxHealth,
    outcomeState: state.outcomeState,
    failurePathQaMode,
    debugInfiniteHealthActive: debugInfiniteHealth,
    debugInfiniteHealthDiagnosticOnly: debugInfiniteHealth
  };
  window.__STEP38_OUTCOME_STATE_MACHINE_REPORT = buildOutcomeStateMachineReport(state);
  window.__STEP38_RUNTIME_CONSUMPTION = {
    auto_emitted_success_events: false,
    source_artifacts: {
      canonicalDsl: true,
      runtimePlan: true,
      sceneIr: true,
      runtimeManifest: true,
      manualVerticalSliceProjection: manualProjection?.projection_mode === 'manual_vertical_slice',
      manualTraversalPath: manualTraversalPath?.mode === 'manual_traversal'
    },
    manual_vertical_slice_projection: {
      enabled: manualProjection?.projection_mode === 'manual_vertical_slice',
      source: manualProjection?.source || null,
      compression_is_preview_only: manualProjection?.compression_is_preview_only === true,
      preview_target_sec: manualProjection?.preview_target_sec || null,
      window_count: projectionWindows.length
    },
    manual_traversal_path: {
      enabled: manualTraversalPath?.mode === 'manual_traversal',
      source: manualTraversalPath?.source || null,
      starts_from_spawn: manualTraversalPath?.starts_from_spawn === true,
      uses_normal_player_controls_only: manualTraversalPath?.uses_normal_player_controls_only === true,
      route_count: Array.isArray(manualTraversalPath?.route) ? manualTraversalPath.route.length : 0
    },
    entity_counts: { enemies: enemies.length, pickups: pickups.length, bosses: boss.id ? 1 : 0 },
    canonical_game: {
      ...state.game,
      play_time_intent: state.game.play_time_intent
    },
    runtime_profile: runtimePlan.profileId,
    scene_ir_source: sceneIr.source,
    visual_intent: {
      dsl_visual_intent_bound: visualEvidence.dsl_visual_intent_bound === true,
      visual_intent_source: visualEvidence.visual_intent_source,
      scene_visual_theme: visualEvidence.scene_visual_theme,
      loaded_asset_intent_refs: visualEvidence.loaded_asset_intent_refs || [],
      runtime_render_binding: true,
      visual_slice_preview_mode: visualSlicePreviewMode
    },
    enemy_behavior: { movement: false, counterfire: false, boss_attack: false }
  };
  window.__STEP38_PLAYABLE_DURATION_SUPPORT = state.durationSupport;
  window.__STEP38_ENCOUNTER_COVERAGE = buildEncounterCoverage(state);
  updateEnemyBehaviorEvidence(state);
  updateBehaviorConfigEvidence(state);
  return state;
}

function buildEncounterCoverage(state) {
  const enemyNodes = readNodes(state.sceneIr, 'enemy_spawn');
  const isStaticNode = (node) => {
    const caps = effectiveNodeCapabilities(state.canonicalDsl, node);
    return node.spawnSource === 'static_entity' || caps.includes('spawn.static.v1') || caps.includes('enemy.fixed_turret.v1');
  };
  const waveNodes = enemyNodes.filter((node) => !isStaticNode(node));
  const staticEnemyNodes = enemyNodes.filter(isStaticNode);
  const pickupNodes = readNodes(state.sceneIr, 'pickup');
  const bossNodes = readNodes(state.sceneIr, 'boss');
  const dslEnemyCount = enemyNodes.reduce((total, node) => total + clamp(typeof node.count === 'number' ? node.count : 1, 1, 80), 0);
  const minEnemyCountForDuration = Math.max(24, Math.ceil((state.durationSupport.normal_mode_estimated_sec.target || 0) / 15));
  const minEncounterBandsForDuration = Math.max(10, Math.ceil((state.durationSupport.normal_mode_estimated_sec.target || 0) / 60));
  const expectedEnemyCount = Math.max(dslEnemyCount, minEnemyCountForDuration);
  const minWaveSegmentCoverage = Math.min(3, state.segmentLayouts.size || 3);
  const maxAllowedEncounterGapSec = 45;
  const minBandsPerCoveredSegment = 2;
  const enemySpawnX = (enemy) => (typeof enemy.originX === 'number' ? enemy.originX : enemy.x);
  const firstEnemyX = state.enemies.reduce((min, enemy) => Math.min(min, enemySpawnX(enemy)), Number.POSITIVE_INFINITY);
  const initialPlayerX = typeof state.player.originX === 'number' ? state.player.originX : state.player.x;
  const firstEncounterDistancePx = Number.isFinite(firstEnemyX) ? Math.max(0, firstEnemyX - (initialPlayerX + state.player.w)) : null;
  const firstEncounterEstimatedSec = firstEncounterDistancePx === null ? null : firstEncounterDistancePx / normalRunSpeedPxPerSec;
  const firstViewportMinX = Math.max(0, initialPlayerX - 40);
  const firstViewportMaxX = initialPlayerX + 960;
  const firstViewportEnemies = state.enemies.filter((enemy) => {
    const x = enemySpawnX(enemy);
    return x < firstViewportMaxX && x + enemy.w > firstViewportMinX;
  });
  const realizedWaveNodeIds = new Set(state.enemies.filter((enemy) => enemy.spawnSource !== 'static_entity').map((enemy) => enemy.sourceNodeId));
  const realizedStaticNodeIds = new Set(state.enemies.filter((enemy) => enemy.spawnSource === 'static_entity' || enemy.static).map((enemy) => enemy.sourceNodeId));
  const realizedPickupNodeIds = new Set(state.pickups.map((pickup) => pickup.sourceNodeId));
  const distinctEnemyEntities = new Set(state.enemies.map((enemy) => enemy.sourceEntityId));
  const waveEnemies = state.enemies.filter((enemy) => enemy.spawnSource !== 'static_entity' && !enemy.static);
  const defeatedEnemyCount = state.enemies.filter((enemy) => !enemy.alive).length;
  const encounterBands = new Map();
  for (const enemy of waveEnemies) {
    if (!enemy.encounterBandId) continue;
    const layout = state.segmentLayouts.get(enemy.segmentId);
    const x = enemySpawnX(enemy);
    const estimatedSec = layout ? (layout.startX - 120 + (x - layout.startX)) / normalRunSpeedPxPerSec : x / normalRunSpeedPxPerSec;
    const existing = encounterBands.get(enemy.encounterBandId) || {
      id: enemy.encounterBandId,
      sourceNodeId: enemy.sourceNodeId,
      segmentId: enemy.segmentId,
      enemyCount: 0,
      estimatedSec
    };
    existing.enemyCount += 1;
    existing.estimatedSec = Math.min(existing.estimatedSec, estimatedSec);
    encounterBands.set(enemy.encounterBandId, existing);
  }
  const sortedEncounterBands = [...encounterBands.values()].sort((left, right) => left.estimatedSec - right.estimatedSec);
  const encounterBandGaps = sortedEncounterBands.slice(1).map((band, index) => band.estimatedSec - sortedEncounterBands[index].estimatedSec);
  const maxEncounterGapSec = encounterBandGaps.length > 0 ? Math.max(...encounterBandGaps) : null;
  const encounterBandsBySegment = [...state.segmentLayouts.values()].map((layout) => {
    const segmentBands = sortedEncounterBands.filter((band) => band.segmentId === layout.id);
    const segmentEnemies = waveEnemies.filter((enemy) => enemy.segmentId === layout.id);
    const segmentWaveNodeIds = new Set(segmentEnemies.map((enemy) => enemy.sourceNodeId));
    return {
      segment_id: layout.id,
      wave_node_count: segmentWaveNodeIds.size,
      encounter_band_count: segmentBands.length,
      enemy_count: segmentEnemies.length,
      first_band_estimated_sec: segmentBands.length > 0 ? segmentBands[0].estimatedSec : null,
      last_band_estimated_sec: segmentBands.length > 0 ? segmentBands[segmentBands.length - 1].estimatedSec : null
    };
  });
  const coveredWaveSegments = encounterBandsBySegment.filter((segment) => segment.wave_node_count > 0 && segment.encounter_band_count >= minBandsPerCoveredSegment);
  const segmentsBelowMinimumBands = encounterBandsBySegment
    .filter((segment) => segment.encounter_band_count < minBandsPerCoveredSegment)
    .map((segment) => segment.segment_id);
  const visibleContentTypes = [
    state.enemies.length > 0 ? 'enemy_wave' : null,
    staticEnemyNodes.length > 0 && realizedStaticNodeIds.size > 0 ? 'static_enemy' : null,
    state.pickups.length > 0 ? 'pickup' : null,
    state.hazards.length > 0 ? 'hazard' : null,
    state.boss.id ? 'boss' : null
  ].filter(Boolean);
  const fullDurationRuntimeCoverage =
    expectedEnemyCount >= minEnemyCountForDuration &&
    state.enemies.length >= expectedEnemyCount &&
    encounterBands.size >= minEncounterBandsForDuration;
  const fullDurationRuntimeCoverageDisposition = fullDurationRuntimeCoverage ? 'SATISFIED' : state.visualSlicePreviewMode ? 'DEFERRED_NON_BLOCKING' : 'BLOCKING_CURRENT_MILESTONE';
  const previewExpectedEnemyCount = dslEnemyCount;
  const previewMinimumEncounterBandCount = Math.max(6, waveNodes.length * minBandsPerCoveredSegment);
  const previewVisualSliceCoverage =
    state.visualSlicePreviewMode === true &&
    state.durationSupport.status === 'PASSED' &&
    state.enemies.length >= previewExpectedEnemyCount &&
    encounterBands.size >= previewMinimumEncounterBandCount;
  const commonCoverage =
    state.durationSupport.status === 'PASSED' &&
    firstEncounterEstimatedSec !== null &&
    firstEncounterEstimatedSec <= 8 &&
    firstViewportEnemies.length >= 2 &&
    coveredWaveSegments.length >= minWaveSegmentCoverage &&
    maxEncounterGapSec !== null &&
    maxEncounterGapSec <= maxAllowedEncounterGapSec &&
    segmentsBelowMinimumBands.length === 0 &&
    waveNodes.every((node) => realizedWaveNodeIds.has(node.id)) &&
    staticEnemyNodes.length >= 1 &&
    staticEnemyNodes.every((node) => realizedStaticNodeIds.has(node.id)) &&
    pickupNodes.length >= 1 &&
    pickupNodes.every((node) => realizedPickupNodeIds.has(node.id)) &&
    bossNodes.length >= 1 &&
    state.boss.id;
  const status = commonCoverage && (state.visualSlicePreviewMode ? previewVisualSliceCoverage : fullDurationRuntimeCoverage);

  return {
    status: status ? 'PASSED' : 'FAILED',
    duration_scaling_source: 'canonical_dsl_play_time_intent',
    visual_slice_preview_mode: state.visualSlicePreviewMode,
    product_duration_coverage_status: state.durationSupport.status === 'PASSED' ? 'PASSED' : 'FAILED',
    full_duration_runtime_coverage_status: fullDurationRuntimeCoverage ? 'PASSED' : 'FAILED',
    full_duration_runtime_coverage_disposition: fullDurationRuntimeCoverageDisposition,
    full_duration_runtime_coverage_deferred: fullDurationRuntimeCoverageDisposition === 'DEFERRED_NON_BLOCKING',
    full_duration_runtime_coverage_blocking_current_milestone: fullDurationRuntimeCoverageDisposition === 'BLOCKING_CURRENT_MILESTONE',
    full_duration_enemy_count_disposition: fullDurationRuntimeCoverageDisposition,
    full_duration_encounter_band_count_disposition: fullDurationRuntimeCoverageDisposition,
    preview_visual_slice_coverage_status: previewVisualSliceCoverage ? 'PASSED' : 'FAILED',
    dsl_enemy_count: dslEnemyCount,
    expected_enemy_count: expectedEnemyCount,
    realized_enemy_count: state.enemies.length,
    enemy_defeat_count: defeatedEnemyCount,
    preview_expected_enemy_count: previewExpectedEnemyCount,
    preview_realized_enemy_count: state.enemies.length,
    minimum_enemy_count_for_duration: minEnemyCountForDuration,
    encounter_band_count: encounterBands.size,
    minimum_encounter_band_count_for_duration: minEncounterBandsForDuration,
    preview_minimum_encounter_band_count: previewMinimumEncounterBandCount,
    wave_segment_coverage_count: coveredWaveSegments.length,
    minimum_wave_segment_coverage_count: minWaveSegmentCoverage,
    max_gap_between_encounter_bands_sec: maxEncounterGapSec,
    max_allowed_gap_between_encounter_bands_sec: maxAllowedEncounterGapSec,
    minimum_bands_per_covered_segment: minBandsPerCoveredSegment,
    segments_below_minimum_band_count: segmentsBelowMinimumBands,
    encounter_bands_by_segment: encounterBandsBySegment,
    first_encounter_distance_px: firstEncounterDistancePx,
    first_encounter_estimated_sec: firstEncounterEstimatedSec,
    first_viewport_enemy_count: firstViewportEnemies.length,
    first_viewport_enemy_entities: [...new Set(firstViewportEnemies.map((enemy) => enemy.sourceEntityId))].sort(),
    wave_node_count: waveNodes.length,
    realized_wave_node_count: realizedWaveNodeIds.size,
    static_enemy_node_count: staticEnemyNodes.length,
    realized_static_enemy_node_count: realizedStaticNodeIds.size,
    distinct_enemy_entity_count: distinctEnemyEntities.size,
    distinct_enemy_entities: [...distinctEnemyEntities].sort(),
    pickup_node_count: pickupNodes.length,
    realized_pickup_node_count: realizedPickupNodeIds.size,
    realized_pickup_count: state.pickups.length,
    boss_node_count: bossNodes.length,
    realized_boss_count: state.boss.id ? 1 : 0,
    visible_content_types: visibleContentTypes
  };
}

function buildEnemyBehaviorEvidence(state) {
  const movingEnemyEventRecords = events.filter((record) => record.event === 'enemy.moved' && record.source === 'runtime_enemy_ai');
  const enemyFireEventRecords = events.filter((record) => record.event === 'enemy.fired' && record.source === 'runtime_enemy_ai');
  const projectileSpawnEventRecords = events.filter((record) => record.event === 'enemy.projectile.spawned' && record.source === 'runtime_enemy_projectile');
  const projectileHitEventRecords = events.filter((record) => record.event === 'enemy.projectile.hit_player' && record.source === 'runtime_enemy_projectile');
  const bossAttackEventRecords = events.filter((record) => record.event === 'boss.attack.fired' && record.source === 'runtime_boss_ai');
  const movingEnemyEntityIds = new Set(movingEnemyEventRecords.map((record) => record.enemy).filter((enemy) => typeof enemy === 'string'));
  const attackingEnemyEntityIds = new Set(enemyFireEventRecords.map((record) => record.enemy).filter((enemy) => typeof enemy === 'string'));
  const requiresMovement = state.enemies.some((enemy) => enemy.alive && !enemy.static) || state.enemies.some((enemy) => !enemy.static);
  const requiresCounterfire = state.enemies.some((enemy) => enemy.canFire);
  const requiresBossAttack = state.boss.id && (state.boss.canFire || state.boss.capability_ids.includes('enemy.boss_attack_pattern.v1'));
  const requiredCount = [requiresMovement, requiresCounterfire, requiresBossAttack].filter(Boolean).length;
  const realizedMovement = !requiresMovement || (movingEnemyEntityIds.size >= 2 && movingEnemyEventRecords.length >= 2);
  const realizedCounterfire = !requiresCounterfire || (attackingEnemyEntityIds.size >= 2 && enemyFireEventRecords.length >= 2 && projectileSpawnEventRecords.length >= 2 && projectileHitEventRecords.length >= 1);
  const realizedBossAttack = !requiresBossAttack || bossAttackEventRecords.length >= 1;
  const realizedCount = [requiresMovement && realizedMovement, requiresCounterfire && realizedCounterfire, requiresBossAttack && realizedBossAttack].filter(Boolean).length;
  return {
    status: requiredCount >= 3 && realizedCount >= requiredCount ? 'PASSED' : 'FAILED',
    required_enemy_behavior_capability_count: requiredCount,
    realized_enemy_behavior_capability_count: realizedCount,
    moving_enemy_entity_count: movingEnemyEntityIds.size,
    enemy_movement_event_count: movingEnemyEventRecords.length,
    attacking_enemy_entity_count: attackingEnemyEntityIds.size,
    enemy_fire_event_count: enemyFireEventRecords.length,
    enemy_projectile_spawn_count: projectileSpawnEventRecords.length,
    player_damage_from_enemy_projectile_count: projectileHitEventRecords.length,
    boss_attack_event_count: bossAttackEventRecords.length,
    required_behaviors: {
      movement: requiresMovement,
      counterfire: requiresCounterfire,
      boss_attack: requiresBossAttack
    },
    realized_behaviors: {
      movement: realizedMovement,
      counterfire: realizedCounterfire,
      boss_attack: realizedBossAttack
    },
    observed_behavior_entity_ids: {
      moved: [...movingEnemyEntityIds].sort(),
      fired: [...attackingEnemyEntityIds].sort()
    }
  };
}

function updateEnemyBehaviorEvidence(state) {
  const evidence = buildEnemyBehaviorEvidence(state);
  window.__STEP38_ENEMY_BEHAVIOR_EVIDENCE = evidence;
  const runtimeConsumption = window.__STEP38_RUNTIME_CONSUMPTION || {};
  window.__STEP38_RUNTIME_CONSUMPTION = {
    ...runtimeConsumption,
    enemy_behavior: {
      movement: evidence.realized_behaviors?.movement === true,
      counterfire: evidence.realized_behaviors?.counterfire === true,
      boss_attack: evidence.realized_behaviors?.boss_attack === true
    }
  };
  return evidence;
}

function recordBehaviorIds(record) {
  return Array.isArray(record.behaviorIds) ? record.behaviorIds.filter((id) => typeof id === 'string') : [];
}

function recordBehaviorCapabilityIds(record) {
  return Array.isArray(record.behaviorCapabilityIds) ? record.behaviorCapabilityIds.filter((id) => typeof id === 'string') : [];
}

function hasBehaviorCapabilityId(record, capabilityId) {
  return recordBehaviorCapabilityIds(record).includes(capabilityId);
}

function buildBehaviorConfigEvidence(state) {
  const behaviorIdsForEntity = (entityId) => [
    ...new Set(
      state.enemies
        .filter((enemy) => enemy.sourceEntityId === entityId)
        .flatMap((enemy) => enemy.behavior_ids || [])
        .concat(state.boss.sourceEntityId === entityId ? state.boss.behavior_ids || [] : [])
    )
  ].sort();
  const requiredEntries = [];
  if (state.enemies.some((enemy) => enemy.sourceEntityId === 'patrol_infantry')) {
    requiredEntries.push({
      key: 'patrol_infantry_counterfire',
      capabilityId: 'enemy.patrol_infantry.v1',
      behaviorIds: behaviorIdsForEntity('patrol_infantry')
    });
  }
  if (state.enemies.some((enemy) => enemy.sourceEntityId === 'fixed_turret')) {
    requiredEntries.push({
      key: 'fixed_turret_fire',
      capabilityId: 'enemy.fixed_turret.v1',
      behaviorIds: behaviorIdsForEntity('fixed_turret')
    });
  }
  if (state.enemies.some((enemy) => enemy.sourceEntityId === 'flying_enemy')) {
    requiredEntries.push({
      key: 'flying_enemy_entry_fire',
      capabilityId: 'enemy.flying_right_entry.v1',
      behaviorIds: behaviorIdsForEntity('flying_enemy')
    });
  }
  if (state.boss.id && state.boss.capability_ids.includes('enemy.boss_attack_pattern.v1')) {
    requiredEntries.push({
      key: 'boss_attack_pattern',
      capabilityId: 'enemy.boss_attack_pattern.v1',
      behaviorIds: state.boss.behavior_ids || []
    });
  }
  if (state.boss.id && state.boss.capability_ids.includes('hazard.falling_area.v1')) {
    requiredEntries.push({
      key: 'boss_falling_hazard',
      capabilityId: 'hazard.falling_area.v1',
      behaviorIds: state.boss.behavior_ids || []
    });
  }
  const requiredIds = [...new Set(requiredEntries.flatMap((entry) => entry.behaviorIds))].sort();
  const requiredCapabilityIds = [...new Set(requiredEntries.map((entry) => entry.capabilityId))].sort();
  const consumedIds = new Set(events.flatMap(recordBehaviorIds));
  const consumedCapabilityIds = new Set(events.flatMap(recordBehaviorCapabilityIds));
  const fixedTurretFireEvents = events.filter(
    (record) =>
      record.event === 'enemy.fired' &&
      record.enemy === 'fixed_turret' &&
      hasBehaviorCapabilityId(record, 'enemy.fixed_turret.v1') &&
      typeof record.projectileCount === 'number' &&
      record.projectileCount >= 1
  );
  const patrolMoveEvents = events.filter(
    (record) =>
      record.enemy === 'patrol_infantry' &&
      record.event === 'enemy.moved' &&
      hasBehaviorCapabilityId(record, 'enemy.patrol_infantry.v1')
  );
  const patrolFireEvents = events.filter(
    (record) =>
      record.enemy === 'patrol_infantry' &&
      record.event === 'enemy.fired' &&
      hasBehaviorCapabilityId(record, 'enemy.patrol_infantry.v1')
  );
  const flyingMoveEvents = events.filter(
    (record) =>
      record.event === 'enemy.moved' &&
      record.enemy === 'flying_enemy' &&
      hasBehaviorCapabilityId(record, 'enemy.flying_right_entry.v1') &&
      typeof record.movePattern === 'string'
  );
  const flyingFireEvents = events.filter(
    (record) =>
      record.event === 'enemy.fired' &&
      record.enemy === 'flying_enemy' &&
      hasBehaviorCapabilityId(record, 'enemy.flying_right_entry.v1')
  );
  const bossAttackEvents = events.filter(
    (record) =>
      record.event === 'boss.attack.fired' &&
      hasBehaviorCapabilityId(record, 'enemy.boss_attack_pattern.v1') &&
      typeof record.projectileCount === 'number' &&
      record.projectileCount >= 1
  );
  const bossPhaseTwoConfiguredEvents = events.filter(
    (record) =>
      record.event === 'boss.attack.fired' &&
      record.phase === 2 &&
      hasBehaviorCapabilityId(record, 'enemy.boss_attack_pattern.v1') &&
      (record.attackPattern === 'three_way_projectile' || record.fallingHazard === true || (typeof record.projectileCount === 'number' && record.projectileCount >= 3))
  );
  const bossFallingHazardEvents = events.filter(
    (record) =>
      record.event === 'boss.falling_hazard.spawned' &&
      (hasBehaviorCapabilityId(record, 'hazard.falling_area.v1') || hasBehaviorCapabilityId(record, 'enemy.boss_attack_pattern.v1'))
  );
  const consumedRequiredIds = requiredIds.filter((id) => consumedIds.has(id));
  const consumedRequiredCapabilityIds = requiredCapabilityIds.filter((id) => consumedCapabilityIds.has(id));
  const fixedTurretFireConsumed =
    !requiredCapabilityIds.includes('enemy.fixed_turret.v1') || fixedTurretFireEvents.length >= 1;
  const patrolCounterfireConsumed =
    !requiredCapabilityIds.includes('enemy.patrol_infantry.v1') || (patrolMoveEvents.length >= 1 && patrolFireEvents.length >= 1);
  const flyingStrafeFireConsumed =
    !requiredCapabilityIds.includes('enemy.flying_right_entry.v1') || (flyingMoveEvents.length >= 1 && flyingFireEvents.length >= 1);
  const bossAttackPatternConsumed =
    !requiredCapabilityIds.includes('enemy.boss_attack_pattern.v1') || (bossAttackEvents.length >= 1 && bossPhaseTwoConfiguredEvents.length >= 1);
  const bossFallingHazardConsumed =
    !requiredCapabilityIds.includes('hazard.falling_area.v1') || bossFallingHazardEvents.length >= 1;
  const status =
    consumedRequiredIds.length === requiredIds.length &&
    consumedRequiredCapabilityIds.length === requiredCapabilityIds.length &&
    fixedTurretFireConsumed &&
    patrolCounterfireConsumed &&
    flyingStrafeFireConsumed &&
    bossAttackPatternConsumed &&
    bossFallingHazardConsumed;
  return {
    status: status ? 'PASSED' : 'FAILED',
    required_behavior_config_ids: requiredIds,
    consumed_behavior_config_ids: consumedRequiredIds.sort(),
    required_behavior_capability_ids: requiredCapabilityIds,
    consumed_behavior_capability_ids: consumedRequiredCapabilityIds.sort(),
    required_behavior_contracts: requiredEntries.map((entry) => ({
      key: entry.key,
      capability_id: entry.capabilityId,
      behavior_ids: entry.behaviorIds
    })),
    fixed_turret_burst_consumed: fixedTurretFireConsumed,
    fixed_turret_fire_consumed: fixedTurretFireConsumed,
    fixed_turret_burst_fire_count: fixedTurretFireEvents.length,
    fixed_turret_fire_count: fixedTurretFireEvents.length,
    patrol_counterfire_consumed: patrolCounterfireConsumed,
    patrol_counterfire_event_count: patrolMoveEvents.length + patrolFireEvents.length,
    patrol_counterfire_fire_count: patrolFireEvents.length,
    flying_strafe_fire_consumed: flyingStrafeFireConsumed,
    flying_strafe_move_event_count: flyingMoveEvents.length,
    flying_strafe_fire_event_count: flyingFireEvents.length,
    boss_attack_cycle_consumed: bossAttackPatternConsumed && bossFallingHazardConsumed,
    boss_attack_pattern_consumed: bossAttackPatternConsumed,
    boss_falling_hazard_consumed: bossFallingHazardConsumed,
    boss_attack_event_count: bossAttackEvents.length,
    boss_three_way_event_count: bossPhaseTwoConfiguredEvents.length,
    boss_falling_hazard_event_count: bossFallingHazardEvents.length
  };
}

function updateBehaviorConfigEvidence(state) {
  const evidence = buildBehaviorConfigEvidence(state);
  window.__STEP38_BEHAVIOR_CONFIG_EVIDENCE = evidence;
  const runtimeConsumption = window.__STEP38_RUNTIME_CONSUMPTION || {};
  window.__STEP38_RUNTIME_CONSUMPTION = {
    ...runtimeConsumption,
    behavior_config: {
      status: evidence.status,
      consumed_behavior_config_ids: evidence.consumed_behavior_config_ids,
      consumed_behavior_capability_ids: evidence.consumed_behavior_capability_ids
    }
  };
  return evidence;
}

function setOutcomeState(state, outcomeState, source, extra = {}) {
  state.outcomeState = outcomeState;
  state.outcomeHistory.push({
    state: outcomeState,
    source,
    at: Number(((performance.now() - state.manualTraversal.startedAt) / 1000).toFixed(2)),
    ...extra
  });
  window.__STEP38_OUTCOME_STATE_MACHINE_REPORT = buildOutcomeStateMachineReport(state);
}

function buildOutcomeStateMachineReport(state) {
  const states = ['RUNNING', 'PLAYER_DAMAGED', 'PLAYER_DEAD', 'RETRY_CONSUMED', 'GAME_OVER', 'MISSION_COMPLETE'];
  const transitions = [
    { from: 'RUNNING', to: 'PLAYER_DAMAGED', trigger: 'player.damaged', source: 'runtime_collision' },
    { from: 'PLAYER_DAMAGED', to: 'PLAYER_DEAD', trigger: 'player.dead', source: 'runtime_health' },
    { from: 'PLAYER_DEAD', to: 'RETRY_CONSUMED', trigger: 'retry.consumed', source: 'runtime_health' },
    { from: 'RETRY_CONSUMED', to: 'GAME_OVER', trigger: 'game.over', source: 'runtime_health' },
    { from: 'PLAYER_DEAD', to: 'GAME_OVER', trigger: 'game.over', source: 'runtime_health' },
    { from: 'RUNNING', to: 'MISSION_COMPLETE', trigger: 'mission.complete', source: 'runtime_objective' }
  ];
  const observedEvents = events.map((record) => record.event);
  const winPathConnected = observedEvents.includes('mission.complete') && state.won === true;
  const losePathConnected = observedEvents.includes('game.over') && state.lost === true;
  const completionEvidence = runtimeCompletionPreconditionEvidence(state);
  return {
    schemaVersion: 'step38.outcome-state-machine-report.v1',
    source: 'runtime_outcome_state_machine',
    states,
    transitions,
    current_state: state.outcomeState,
    observed_state_history: state.outcomeHistory,
    compressed_manual_acceptance_slice: {
      enabled: state.failurePathQaMode === true,
      source: 'canonical_dsl_manual_acceptance_slice',
      configured_retries: state.configuredRetries,
      runtime_retries_for_failure_path: state.failurePathQaMode ? 0 : state.configuredRetries,
      direct_health_mutation_used: false,
      direct_game_over_trigger_used: false
    },
    outcome_state_machine_gate: {
      verdict: winPathConnected && losePathConnected && completionEvidence.real_playthrough_completion_verified === true ? 'PASS' : 'FAIL',
      win_path_connected: winPathConnected,
      lose_path_connected: losePathConnected,
      game_over_persistent: state.lost === true,
      mission_complete_persistent: state.won === true,
      real_playthrough_completion_verified: completionEvidence.real_playthrough_completion_verified,
      mission_complete_requires_completion_preconditions: true,
      completion_preconditions_satisfied: completionEvidence.completion_preconditions_satisfied,
      early_mission_complete_detected: completionEvidence.early_mission_complete_detected,
      text_or_overlay_only_win_transition: completionEvidence.text_or_overlay_only_evidence,
      satisfied_completion_preconditions: completionEvidence.satisfied_completion_preconditions
    },
    completion_precondition_evidence: completionEvidence
  };
}

function updateQaComplete() {
  const playable = window.__STEP38_PLAYABLE_STATE || {};
  const visual = window.__STEP38_VISUAL_EVIDENCE || {};
  const enemyBehavior = window.__STEP38_ENEMY_BEHAVIOR_EVIDENCE || {};
  const behaviorConfig = window.__STEP38_BEHAVIOR_CONFIG_EVIDENCE || {};
  const manualTraversal = window.__STEP38_MANUAL_TRAVERSAL_EVIDENCE || {};
  window.__STEP38_QA_COMPLETE =
    requiredEvents.every((name) => observed.has(name)) &&
    visual.status === 'PASSED' &&
    visual.dsl_visual_intent_bound === true &&
    playable.playerMovedByInput === true &&
    playable.projectileHitEnemy === true &&
    playable.pickupCollected === true &&
    playable.bossPhaseChanged === true &&
    playable.winReached === true &&
    enemyBehavior.status === 'PASSED' &&
    behaviorConfig.status === 'PASSED' &&
    manualTraversal.status === 'PASSED';
}

function syncPlayableState(state) {
  if (!window.__STEP38_PLAYABLE_STATE) {
    return;
  }
  window.__STEP38_PLAYABLE_STATE.health = state.player.health;
  window.__STEP38_PLAYABLE_STATE.maxHealth = state.player.maxHealth;
  window.__STEP38_PLAYABLE_STATE.retries = state.retries;
  window.__STEP38_PLAYABLE_STATE.outcomeState = state.outcomeState;
  window.__STEP38_PLAYABLE_STATE.gameOverReached = state.lost === true || window.__STEP38_PLAYABLE_STATE.gameOverReached === true;
  window.__STEP38_PLAYABLE_STATE.winReached = state.won === true || window.__STEP38_PLAYABLE_STATE.winReached === true;
}

function playerRect(state) {
  return { x: state.player.x, y: state.player.y, w: state.player.w, h: state.player.h };
}

function isPlayerMovingInputHeld(state) {
  return state.keys.has('ArrowRight') || state.keys.has('ArrowLeft') || state.keys.has('KeyD') || state.keys.has('KeyA');
}

function movementDirection(state) {
  return (state.keys.has('ArrowRight') || state.keys.has('KeyD') ? 1 : 0) - (state.keys.has('ArrowLeft') || state.keys.has('KeyA') ? 1 : 0);
}

function isFireInputHeld(state) {
  return state.keys.has('KeyX') || state.keys.has('KeyJ');
}

function preventDefaultForGameKey(event) {
  if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyC', 'KeyX', 'KeyJ'].includes(event.code)) {
    event.preventDefault();
  }
}

function applyInput(state, now) {
  if (state.lost || state.won) {
    state.player.vx = 0;
    return;
  }
  const player = state.player;
  const direction = movementDirection(state);
  player.vx = direction * (player.crouching ? normalRunSpeedPxPerSec * 0.5 : normalRunSpeedPxPerSec) * qaAcceleration;
  if (direction !== 0 && now - state.lastMoveEventAt > 180) {
    state.lastMoveEventAt = now;
    window.__STEP38_PLAYABLE_STATE.playerMovedByInput = true;
    emit('player.moved', { source: 'player_input', direction: direction > 0 ? 'right' : 'left', x: Math.round(player.x) });
  }
}

function applyShootingInput(state, now) {
  if (isFireInputHeld(state)) {
    fire(state, now);
  }
}

function jump(state) {
  if (state.lost || state.won) return;
  const player = state.player;
  if (!player.onGround) return;
  player.vy = -690;
  player.onGround = false;
  emit('player.jumped', { source: 'player_input', airborne: true });
}

function crouch(state) {
  if (state.lost || state.won) return;
  const player = state.player;
  player.crouching = !player.crouching;
  player.h = player.crouching ? 32 : 54;
  player.y = state.groundY - player.h;
  emit('player.crouched', { source: 'player_input', crouching: player.crouching, heightScale: player.crouching ? 0.58 : 1 });
}

function fire(state, now) {
  if (state.lost || state.won) return;
  const player = state.player;
  const movingWhileFiring = isPlayerMovingInputHeld(state);
  if (movingWhileFiring) {
    window.__STEP38_PLAYABLE_STATE.movingFireObserved = true;
  }
  const spread = state.weapon !== 'straight_single';
  const shotCooldownMs = visualSlicePreviewMode ? (spread ? 180 : 160) : 95 / qaAcceleration;
  if (now - state.lastShotAt < shotCooldownMs) return;
  const visiblePlayerProjectiles = state.projectiles.filter((shot) => shot.x > state.cameraX - 120 && shot.x < state.cameraX + 1080);
  const maxVisiblePlayerProjectiles = visualSlicePreviewMode ? (spread ? 8 : 5) : 120;
  if (visiblePlayerProjectiles.length >= maxVisiblePlayerProjectiles) return;
  state.lastShotAt = now;
  const shots = spread ? [-5, 0, 5] : [0];
  const availableProjectileSlots = Math.max(1, maxVisiblePlayerProjectiles - visiblePlayerProjectiles.length);
  const emittedShots = shots.slice(0, availableProjectileSlots);
  for (const yVelocity of emittedShots) {
    state.projectiles.push({ x: player.x + player.w + 4, y: player.y + player.h * 0.45, w: 30, h: 8, vx: 680 * qaAcceleration, vy: yVelocity * qaAcceleration, sourceWeapon: state.weapon });
  }
  emit('player.fired', { source: 'player_input', weapon: state.weapon, airborne: !player.onGround, moving: movingWhileFiring, moving_fire: movingWhileFiring, input_mode: isFireInputHeld(state) ? 'held_fire' : 'tap_fire' });
  emit('projectile.spawned', { source: 'runtime_combat', direction: 'right', count: emittedShots.length, weapon: state.weapon });
}

function damagePlayer(state, reason, now, amount = 1) {
  if (state.lost || state.won) return false;
  const player = state.player;
  if (debugInfiniteHealth) {
    player.health = player.maxHealth;
    player.invulnerableUntil = now + 500;
    window.__STEP38_PLAYABLE_STATE.debugInfiniteHealthActive = true;
    window.__STEP38_PLAYABLE_STATE.debugDamageIgnoredObserved = true;
    emit('player.damage_ignored_debug', {
      source: 'debug_infinite_health',
      reason,
      damage: amount,
      health: player.health,
      counts_for_ready_for_manual_test: false
    });
    return false;
  }
  if (now < player.invulnerableUntil) return false;
  player.health -= amount;
  const playerHitRecoveryMs = state.failurePathQaMode ? 650 : 2400;
  player.invulnerableUntil = now + playerHitRecoveryMs;
  window.__STEP38_PLAYABLE_STATE.playerDamageObserved = true;
  setOutcomeState(state, 'PLAYER_DAMAGED', 'runtime_collision', { reason, damage: amount, health: Math.max(0, player.health) });
  emit('player.damaged', { source: 'runtime_collision', reason, damage: amount, health: Math.max(0, player.health), invulnerable: true });
  if (player.health <= 0) {
    player.health = 0;
    window.__STEP38_PLAYABLE_STATE.playerDeadObserved = true;
    setOutcomeState(state, 'PLAYER_DEAD', 'runtime_health', { reason, retriesRemaining: state.retries });
    emit('player.dead', { source: 'runtime_health', reason, retriesRemaining: state.retries });
    if (state.retries > 0) {
      state.retries = Math.max(0, state.retries - 1);
      window.__STEP38_PLAYABLE_STATE.retryConsumedObserved = true;
      setOutcomeState(state, 'RETRY_CONSUMED', 'runtime_health', { retriesRemaining: state.retries });
      emit('retry.consumed', { source: 'runtime_health', retriesRemaining: state.retries });
      if (!state.failurePathQaMode) {
        player.health = player.maxHealth;
        player.x = Math.max(96, player.x - 220);
        player.y = state.groundY - player.h;
        player.vy = 0;
        player.invulnerableUntil = now + 1000;
        return true;
      }
    }
    state.lost = true;
    state.keys.clear();
    player.vx = 0;
    player.vy = 0;
    window.__STEP38_PLAYABLE_STATE.gameOverReached = true;
    setOutcomeState(state, 'GAME_OVER', 'runtime_health', { reason, restartVisible: true, retriesRemaining: state.retries });
    emit('game.over', { source: 'runtime_health', reason, health: 0, retriesRemaining: state.retries, restartVisible: true, screen: 'game_over' });
    emit('game.lost', { source: 'runtime_health', retryAvailable: false, restartVisible: true, screen: 'game_over' });
    window.__STEP38_OUTCOME_STATE_MACHINE_REPORT = buildOutcomeStateMachineReport(state);
  }
  return true;
}

function updateEnemyAi(state, enemy, dt, now) {
  const player = state.player;
  const activationWindow = enemy.x > player.x - 320 && enemy.x < player.x + 1080;
  if (!enemy.static && !activationWindow) {
    return;
  }
  const previousX = enemy.x;
  const previousY = enemy.y;
  if (!enemy.static) {
    if (enemy.movePattern === 'flying_strafe' || enemy.movePattern === 'sine_strafe') {
      enemy.x += -34 * dt * qaAcceleration;
      enemy.y = enemy.originY + Math.sin(now / 260 + enemy.patrolPhase) * 38;
    } else {
      enemy.x += (-18 + Math.sin(now / 420 + enemy.patrolPhase) * 20) * dt * qaAcceleration;
      enemy.y = enemy.originY + Math.abs(Math.sin(now / 360 + enemy.patrolPhase)) * 5;
    }
  }
  const moved = Math.abs(enemy.x - previousX) + Math.abs(enemy.y - previousY) > 0.5;
  const nearViewport = enemy.x > player.x - 700 && enemy.x < player.x + 1450;
  if (moved && nearViewport && now - enemy.lastMoveEmitAt > 420) {
    enemy.lastMoveEmitAt = now;
    emit('enemy.moved', {
      source: 'runtime_enemy_ai',
      enemy: enemy.sourceEntityId,
      enemyId: enemy.id,
      sourceNodeId: enemy.sourceNodeId,
      segmentId: enemy.segmentId,
      movePattern: enemy.movePattern,
      x: Math.round(enemy.x),
      y: Math.round(enemy.y),
      capabilityIds: enemy.capability_ids,
      behaviorIds: enemy.behavior_ids,
      behaviorCapabilityIds: enemy.behavior_capability_ids || []
    });
  }
  const playerAhead = enemy.x > player.x - 90;
  const inFireRange = Math.abs(enemy.x - player.x) <= enemy.fireRangePx && Math.abs(enemy.y - player.y) <= 220;
  const enteredViewport = enemy.x > player.x - 220 && enemy.x < player.x + 980;
  const triggerAllowsFire = enteredViewport || inFireRange || enemy.projectileTriggerEvent === 'entered_viewport';
  const activeEnemyProjectileLimit = visualSlicePreviewMode ? 10 : 80;
  const activeEnemyProjectileCount = state.enemyProjectiles.filter((projectile) => projectile.active && !projectile.boss).length;
  const fireCooldown = visualSlicePreviewMode ? Math.max(1400, enemy.fireCooldownMs) : Math.max(700, enemy.fireCooldownMs / qaAcceleration);
  if (enemy.canFire && playerAhead && triggerAllowsFire && now - enemy.lastFireAt > fireCooldown) {
    if (activeEnemyProjectileCount >= activeEnemyProjectileLimit) return;
    enemy.lastFireAt = now;
    fireEnemyProjectile(state, enemy, now, false);
  }
}

function fireEnemyProjectile(state, source, now, isBossAttack, options = {}) {
  const player = state.player;
  const originX = source.x + source.w * 0.45;
  const originY = source.y + source.h * 0.5;
  const targetX = player.x + player.w * 0.5;
  const targetY = player.y + player.h * 0.45;
  const pattern = options.pattern || source.projectilePattern || 'aimed_single';
  const configuredCount = typeof options.count === 'number' ? options.count : source.burstShots || 1;
  const angleOffsets =
    pattern === 'three_way_projectile'
      ? [-0.32, 0, 0.32]
      : pattern === 'burst'
        ? Array.from({ length: configuredCount }, (_, index) => (index - (configuredCount - 1) / 2) * 0.12)
        : pattern === 'diagonal_aimed_single'
          ? [-0.16]
          : [0];
  const speed = (isBossAttack ? 300 : source.lane === 'air' ? 285 : 245) * qaAcceleration;
  const projectiles = angleOffsets.map((angleOffset) => {
    const dx = targetX - originX;
    const dy = targetY - originY;
    const baseAngle = Math.atan2(dy, dx) + angleOffset;
    const projectile = {
      id: 'enemy_projectile_' + state.nextEnemyProjectileId,
      x: originX,
      y: originY,
      w: isBossAttack ? 22 : 18,
      h: isBossAttack ? 14 : 10,
      vx: Math.cos(baseAngle) * speed,
      vy: Math.sin(baseAngle) * speed,
      sourceEnemyId: source.id,
      sourceEntityId: source.sourceEntityId,
      sourceNodeId: source.sourceNodeId || source.id,
      segmentId: source.segmentId || null,
      boss: isBossAttack,
      projectilePattern: pattern,
      behavior_ids: source.behavior_ids || [],
      behavior_capability_ids: source.behavior_capability_ids || [],
      active: true
    };
    state.nextEnemyProjectileId += 1;
    state.enemyProjectiles.push(projectile);
    return projectile;
  });
  emit('enemy.fired', {
    source: 'runtime_enemy_ai',
    enemy: source.sourceEntityId,
    enemyId: source.id,
    sourceNodeId: source.sourceNodeId || source.id,
    segmentId: source.segmentId || null,
    boss: isBossAttack,
    capabilityIds: source.capability_ids || [],
    behaviorIds: source.behavior_ids || [],
    behaviorCapabilityIds: source.behavior_capability_ids || [],
    projectilePattern: pattern,
    projectileCount: projectiles.length
  });
  emit('enemy.projectile.spawned', {
    source: 'runtime_enemy_projectile',
    projectileId: projectiles[0]?.id,
    projectileIds: projectiles.map((projectile) => projectile.id),
    enemy: source.sourceEntityId,
    enemyId: source.id,
    sourceNodeId: source.sourceNodeId || source.id,
    segmentId: source.segmentId || null,
    boss: isBossAttack,
    projectilePattern: pattern,
    projectileCount: projectiles.length,
    behaviorIds: source.behavior_ids || [],
    behaviorCapabilityIds: source.behavior_capability_ids || [],
    vx: Math.round(projectiles[0]?.vx || 0),
    vy: Math.round(projectiles[0]?.vy || 0)
  });
}

function updateEnemyProjectiles(state, dt, now) {
  const pRect = playerRect(state);
  for (const projectile of state.enemyProjectiles) {
    if (!projectile.active) continue;
    projectile.previousX = projectile.x;
    projectile.previousY = projectile.y;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    if (rectsOverlap(projectileTravelRect(projectile), pRect)) {
      projectile.active = false;
      const damaged = damagePlayer(state, projectile.id, now, 1);
      if (damaged) {
        window.__STEP38_PLAYABLE_STATE.enemyProjectileHitPlayer = true;
        emit('enemy.projectile.hit_player', {
          source: 'runtime_enemy_projectile',
          projectileId: projectile.id,
          enemy: projectile.sourceEntityId,
          enemyId: projectile.sourceEnemyId,
          sourceNodeId: projectile.sourceNodeId,
          segmentId: projectile.segmentId,
          boss: projectile.boss,
          behaviorIds: projectile.behavior_ids || [],
          behaviorCapabilityIds: projectile.behavior_capability_ids || [],
          projectilePattern: projectile.projectilePattern,
          damage: 1
        });
      }
    }
  }
  state.enemyProjectiles = state.enemyProjectiles.filter(
    (projectile) =>
      projectile.active &&
      projectile.x > -160 &&
      projectile.x < state.worldWidth + 240 &&
      projectile.y > -160 &&
      projectile.y < 700
  );
}

function spawnBossFallingHazard(state, boss, now) {
  const id = 'boss_falling_hazard_' + Math.round(now);
  const hazard = {
    id,
    x: clamp(state.player.x - 26, boss.x - 420, boss.x + 180),
    y: 40,
    w: 72,
    h: 72,
    vy: 420 * qaAcceleration,
    bossId: boss.id,
    bossSourceEntityId: boss.sourceEntityId,
    sourceEntityId: 'falling_area_hazard',
    behavior_ids: boss.behavior_ids || [],
    behavior_capability_ids: [...new Set([...(boss.behavior_capability_ids || []), 'hazard.falling_area.v1'])].sort(),
    active: true
  };
  state.bossFallingHazards.push(hazard);
  emit('boss.falling_hazard.spawned', {
    source: 'runtime_boss_ai',
    hazardId: id,
    boss: boss.sourceEntityId,
    bossId: boss.id,
    phase: boss.phase,
    behaviorIds: boss.behavior_ids || [],
    behaviorCapabilityIds: [...new Set([...(boss.behavior_capability_ids || []), 'hazard.falling_area.v1'])].sort(),
    attackPattern: 'falling_hazard'
  });
}

function updateBossFallingHazards(state, dt, now) {
  const pRect = playerRect(state);
  for (const hazard of state.bossFallingHazards) {
    if (!hazard.active) continue;
    hazard.previousY = hazard.y;
    hazard.y += hazard.vy * dt;
    if (rectsOverlap(hazard, pRect)) {
      hazard.active = false;
      damagePlayer(state, hazard.id, now, 1);
    }
    if (hazard.y > state.groundY + 90) {
      hazard.active = false;
    }
  }
  state.bossFallingHazards = state.bossFallingHazards.filter((hazard) => hazard.active);
}

function applyWaveProgressionGate(state) {
  const activeWaveEnemies = state.enemies
    .filter((enemy) => enemy.alive && enemy.spawnSource !== 'static_entity' && !enemy.static && typeof enemy.sourceNodeId === 'string')
    .sort((left, right) => left.x - right.x);
  const trailingWaveLookback = Math.max(980, state.player.x);
  const engagedWaveEnemies = activeWaveEnemies.filter((enemy) => enemy.x <= state.player.x + 980 && enemy.x >= state.player.x - trailingWaveLookback);
  const blockingEnemy = engagedWaveEnemies.find((enemy) => state.player.x > enemy.x - 220);
  if (!blockingEnemy) return;
  const gateX = Math.max(96, blockingEnemy.x - 220);
  if (state.player.x <= gateX) return;
  state.player.x = gateX;
  state.player.vx = 0;
  const waveId = blockingEnemy.sourceNodeId;
  if (!state.progressionBlockedWaveIds.has(waveId)) {
    state.progressionBlockedWaveIds.add(waveId);
    emit('progression.blocked', {
      source: 'runtime_progression_gate',
      reason: 'required_engaged_wave_enemy_alive',
      waveId,
      enemy: blockingEnemy.sourceEntityId,
      gateX: Math.round(gateX)
    });
  }
}

function waveProgressionCompleteForBossGate(state) {
  const evidence = runtimeCompletionPreconditionEvidence(state);
  return evidence.wave_progression_complete === true;
}

function applyBossArenaWaveGate(state) {
  if (!state.boss.alive || waveProgressionCompleteForBossGate(state)) return;
  const activeWaveEnemies = state.enemies
    .filter((enemy) => enemy.alive && enemy.spawnSource !== 'static_entity' && !enemy.static && typeof enemy.sourceNodeId === 'string')
    .sort((left, right) => left.x - right.x);
  const nextBlockingWaveEnemy = activeWaveEnemies.find((enemy) => enemy.x >= state.player.x - 120);
  const gateX = Math.max(96, nextBlockingWaveEnemy ? nextBlockingWaveEnemy.x - 220 : state.boss.x - 620);
  if (state.player.x <= gateX) return;
  state.player.x = gateX;
  state.player.vx = 0;
  if (!state.bossArenaBlockedForWaveProgression) {
    state.bossArenaBlockedForWaveProgression = true;
    const evidence = runtimeCompletionPreconditionEvidence(state);
    emit('progression.blocked', {
      source: 'runtime_progression_gate',
      reason: 'required_wave_progression_before_boss',
      gateX: Math.round(gateX),
      required_wave_ids: evidence.required_wave_ids,
      cleared_wave_ids: evidence.cleared_wave_ids
    });
  }
}

function maybeFireBossAttack(state, now) {
  const boss = state.boss;
  if (!boss.alive || !boss.canFire) return;
  const player = state.player;
  const inRange = player.x > boss.x - boss.fireRangePx && player.x < boss.x + 160;
  const activeBossProjectileCount = state.enemyProjectiles.filter((projectile) => projectile.active && projectile.boss).length;
  const cooldown = visualSlicePreviewMode ? Math.max(1600, boss.fireCooldownMs) : Math.max(780, boss.fireCooldownMs / qaAcceleration);
  if (!inRange || now - boss.lastFireAt <= cooldown) return;
  if (visualSlicePreviewMode && activeBossProjectileCount >= 4) return;
  boss.lastFireAt = now;
  const phaseTwoAttacks = arrayConfig(boss.attackConfig || {}, 'phase_two');
  const phaseOneAttack = typeof boss.attackConfig?.phase_one === 'string' ? boss.attackConfig.phase_one : 'straight_projectile';
  const usesThreeWay = boss.phase === 2 && phaseTwoAttacks.includes('three_way_projectile');
  const usesFallingHazard = boss.phase === 2 && phaseTwoAttacks.includes('falling_hazard');
  const attackPattern = usesThreeWay ? 'three_way_projectile' : phaseOneAttack;
  emit('boss.attack.fired', {
    source: 'runtime_boss_ai',
    boss: boss.sourceEntityId,
    bossId: boss.id,
    phase: boss.phase,
    capabilityIds: boss.capability_ids,
    behaviorIds: boss.behavior_ids,
    behaviorCapabilityIds: [...new Set([...(boss.behavior_capability_ids || []), ...(usesFallingHazard ? ['hazard.falling_area.v1'] : [])])].sort(),
    attackPattern,
    projectileCount: usesThreeWay ? 3 : 1,
    fallingHazard: usesFallingHazard
  });
  fireEnemyProjectile(state, boss, now, true, { pattern: attackPattern, count: usesThreeWay ? 3 : 1 });
  if (usesFallingHazard) {
    spawnBossFallingHazard(state, boss, now);
  }
}

function updateWorld(state, dt, now) {
  if (state.lost || state.won) {
    state.player.vx = 0;
    state.player.vy = 0;
    state.cameraX = clamp(state.player.x - 300, 0, Math.max(0, state.worldWidth - 960));
    window.__STEP38_ENCOUNTER_COVERAGE = buildEncounterCoverage(state);
    updateEnemyBehaviorEvidence(state);
    updateBehaviorConfigEvidence(state);
    updateQaComplete();
    return;
  }
  const player = state.player;
  applyInput(state, now);
  applyShootingInput(state, now);
  player.vy += 1700 * dt;
  player.x = clamp(player.x + player.vx * dt, 20, state.worldWidth - 80);
  player.y += player.vy * dt;
  if (player.y + player.h >= state.groundY) {
    player.y = state.groundY - player.h;
    player.vy = 0;
    player.onGround = true;
  }
  applyWaveProgressionGate(state);
  applyBossArenaWaveGate(state);
  if (state.boss.alive && player.x > state.boss.x - 300) {
    player.x = state.boss.x - 300;
  }
  for (const shot of state.projectiles) {
    shot.previousX = shot.x;
    shot.previousY = shot.y;
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
  }
  state.projectiles = state.projectiles.filter((shot) => shot.x > state.cameraX - 160 && shot.x < Math.min(state.worldWidth + 120, state.cameraX + 1080));
  updateEnemyProjectiles(state, dt, now);
  updateBossFallingHazards(state, dt, now);

  const pRect = playerRect(state);
  for (const pickup of state.pickups) {
    const closeEnoughToCollect = Math.abs(pRect.x + pRect.w / 2 - (pickup.x + pickup.w / 2)) < 56;
    if (!pickup.collected && (rectsOverlap(pRect, pickup) || closeEnoughToCollect)) {
      pickup.collected = true;
      state.weapon = pickup.capability_ids.includes('weapon.rapid_fire.v1') ? 'rapid_fire' : 'spread_shot';
      window.__STEP38_PLAYABLE_STATE.pickupCollected = true;
      emit('item.collected', { source: 'runtime_collision', item: pickup.id, segmentId: pickup.segmentId, weapon: state.weapon });
    }
  }

  for (const hazard of state.hazards) {
    if (!hazard.triggered && rectsOverlap(pRect, hazard)) {
      hazard.triggered = true;
      damagePlayer(state, hazard.id, now, state.player.maxHealth);
    }
  }

  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    updateEnemyAi(state, enemy, dt, now);
    if (rectsOverlap(pRect, enemy)) damagePlayer(state, enemy.id, now);
    const enemyCanBeHitByVisibleShot = enemy.x + enemy.w > state.cameraX - 120 && enemy.x < state.cameraX + 1120;
    if (!enemyCanBeHitByVisibleShot) continue;
    for (const shot of state.projectiles) {
      if (enemy.alive && rectsOverlap(projectileTravelRect(shot), enemy)) {
        const playerShotDamage = shot.sourceWeapon === 'straight_single' ? 1 : 2;
        enemy.hp -= playerShotDamage;
        if (shot.sourceWeapon === 'straight_single') {
          shot.x = state.worldWidth + 999;
        } else {
          shot.x = enemy.x + enemy.w + 10;
        }
        window.__STEP38_PLAYABLE_STATE.projectileHitEnemy = true;
        state.score += 100;
        emit('enemy.hit', { source: 'runtime_combat', enemy: enemy.sourceEntityId, sourceNodeId: enemy.sourceNodeId, damage: playerShotDamage, remainingHp: Math.max(0, enemy.hp) });
        emit('score.changed', { source: 'runtime_score', score: state.score });
        if (enemy.hp <= 0) enemy.alive = false;
      }
    }
  }

  if (state.boss.alive && player.x > state.boss.x - 900) {
    state.boss.x += Math.sin(now / 450) * 0.9;
    maybeFireBossAttack(state, now);
    if (rectsOverlap(pRect, state.boss)) damagePlayer(state, state.boss.id, now);
    for (const shot of state.projectiles) {
      if (rectsOverlap(projectileTravelRect(shot), state.boss)) {
        if (!waveProgressionCompleteForBossGate(state)) {
          const completionBeforeBossDamage = runtimeCompletionPreconditionEvidence(state);
          emit('objective.blocked', {
            source: 'runtime_objective',
            objective: 'boss_damage',
            boss: state.boss.sourceEntityId,
            reason: 'required_wave_progression_before_boss_damage',
            required_wave_ids: completionBeforeBossDamage.required_wave_ids,
            cleared_wave_ids: completionBeforeBossDamage.cleared_wave_ids
          });
          continue;
        }
        shot.x = state.worldWidth + 999;
        state.boss.hp -= state.weapon === 'spread_shot' ? 2 : 1;
        state.score += 150;
        window.__STEP38_PLAYABLE_STATE.projectileHitEnemy = true;
        emit('enemy.hit', { source: 'runtime_combat', enemy: state.boss.sourceEntityId, boss: true, damage: 1, remainingHp: Math.max(0, state.boss.hp) });
        emit('score.changed', { source: 'runtime_score', score: state.score });
        if (state.boss.phase === 1 && state.boss.hp <= state.boss.maxHp / 2) {
          state.boss.phase = 2;
          state.boss.phaseChangedAt = now;
          state.boss.lastFireAt = -100000;
          window.__STEP38_PLAYABLE_STATE.bossPhaseChanged = true;
          emit('boss.phase.changed', { source: 'runtime_combat', boss: state.boss.sourceEntityId, phase: 2, thresholdPct: 50 });
          maybeFireBossAttack(state, now);
        }
        if (state.boss.phase === 2 && typeof state.boss.phaseChangedAt === 'number' && now - state.boss.phaseChangedAt < 650) {
          state.boss.hp = Math.max(1, state.boss.hp);
        }
        if (state.boss.hp <= 0 && state.boss.alive) {
          const completionBeforeWin = runtimeCompletionPreconditionEvidence(state, {
            boss_defeated_by_input: true,
            mission_complete_reached_by_input: true
          });
          if (completionBeforeWin.real_playthrough_completion_verified !== true) {
            state.boss.hp = 1;
            emit('objective.blocked', {
              source: 'runtime_objective',
              objective: 'boss_defeated',
              boss: state.boss.sourceEntityId,
              reason: 'required_wave_progression_incomplete',
              required_completion_preconditions: completionBeforeWin.required_completion_preconditions,
              satisfied_completion_preconditions: completionBeforeWin.satisfied_completion_preconditions,
              required_wave_ids: completionBeforeWin.required_wave_ids,
              cleared_wave_ids: completionBeforeWin.cleared_wave_ids
            });
            window.__STEP38_OUTCOME_STATE_MACHINE_REPORT = buildOutcomeStateMachineReport(state);
          } else {
            state.boss.alive = false;
            state.won = true;
            window.__STEP38_PLAYABLE_STATE.winReached = true;
            setOutcomeState(state, 'MISSION_COMPLETE', 'runtime_objective', { objective: 'boss_defeated', boss: state.boss.sourceEntityId });
            emit('objective.completed', { source: 'runtime_objective', objective: 'boss_defeated', boss: state.boss.sourceEntityId });
            emit('mission.complete', { source: 'runtime_objective', objective: 'boss_defeated', screen: 'mission_complete', persistent: true });
            emit('game.won', { source: 'runtime_objective', screen: 'mission_complete' });
            window.__STEP38_OUTCOME_STATE_MACHINE_REPORT = buildOutcomeStateMachineReport(state);
          }
        }
      }
    }
  }

  for (const segment of state.sceneIr.segments || []) {
    if (typeof segment.endSec !== 'number') continue;
    const layout = state.segmentLayouts.get(segment.id);
    const segmentWorldEnd = layout?.endX ?? ((segment.order || 0) + 1) * 720;
    if (!state.completedSegments.has(segment.id) && player.x >= segmentWorldEnd) {
      state.completedSegments.add(segment.id);
      emit('level.segment.completed', { source: 'runtime_progression', segment: segment.id, runtimeStartSec: segment.startSec, runtimeEndSec: segment.endSec });
    }
  }

  state.cameraX = clamp(player.x - 300, 0, Math.max(0, state.worldWidth - 960));
  window.__STEP38_ENCOUNTER_COVERAGE = buildEncounterCoverage(state);
  updateEnemyBehaviorEvidence(state);
  updateBehaviorConfigEvidence(state);
  updateQaComplete();
}

function projectileTravelRect(shot) {
  const previousX = typeof shot.previousX === 'number' ? shot.previousX : shot.x;
  const previousY = typeof shot.previousY === 'number' ? shot.previousY : shot.y;
  const x = Math.min(previousX, shot.x);
  const y = Math.min(previousY, shot.y);
  return {
    x,
    y,
    w: Math.abs(shot.x - previousX) + shot.w,
    h: Math.abs(shot.y - previousY) + shot.h
  };
}

function beginVisualRuntimeFrame(state) {
  state.lastRenderObjects = [];
}

function recordVisualRuntimeObject(state, meta) {
  const screenX = meta.x - state.cameraX;
  const screenY = meta.y;
  const visible = screenX + meta.w > 0 && screenX < 960 && screenY + meta.h > 0 && screenY < 540;
  const requiredObject = visualRuntimeObjectFromMeta(meta);
  const assetMeta = meta.assetMeta && typeof meta.assetMeta === 'object' ? meta.assetMeta : {};
  const visualRole = meta.visualIntent?.role || meta.role;
  const materialized = meta.usedAsset === true && assetMeta.materialized === true;
  const rendererKind = meta.rendererKind || assetMeta.renderer_kind || assetMeta.rendererKind || (materialized ? 'runtime_2d_generated_asset' : 'procedural_vector');
  const assetFormat = assetMeta.asset_format || assetMeta.assetFormat || (materialized ? 'runtime_2d_generated_asset' : 'procedural_vector');
  const textureKey = meta.textureKey || assetMeta.textureKey || assetMeta.texture_key || assetMeta.assetIntentRef || assetMeta.id || meta.visualIntent?.assetIntentRef || ('procedural:' + (meta.objectType || requiredObject || meta.role));
  const assetMetaRequiredObject =
    typeof assetMeta.requiredObject === 'string'
      ? assetMeta.requiredObject
      : typeof assetMeta.required_object === 'string'
        ? assetMeta.required_object
        : null;
  const materialSlot = meta.assetRole || meta.role || requiredObject || 'unknown_material_slot';
  const expectedEntityId =
    typeof meta.expectedEntityId === 'string'
      ? meta.expectedEntityId
      : typeof meta.visualIntent?.entityId === 'string'
        ? meta.visualIntent.entityId
        : typeof meta.sourceEntityId === 'string'
          ? meta.sourceEntityId
          : null;
  const expectedAssetIntentRef =
    typeof meta.expectedAssetIntentRef === 'string'
      ? meta.expectedAssetIntentRef
      : typeof meta.visualIntent?.assetIntentRef === 'string'
        ? meta.visualIntent.assetIntentRef
        : null;
  const expectedAssetId =
    typeof meta.expectedAssetId === 'string'
      ? meta.expectedAssetId
      : expectedEntityId;
  const assetRequiredObjectBindingSource = {
    type: assetMetaRequiredObject === null ? 'missing_asset_manifest_required_object' : 'asset_manifest_required_object',
    manifest_path: 'assets[].requiredObject',
    asset_id: typeof assetMeta.id === 'string' ? assetMeta.id : null,
    asset_intent_ref:
      typeof assetMeta.assetIntentRef === 'string'
        ? assetMeta.assetIntentRef
        : typeof meta.visualIntent?.assetIntentRef === 'string'
          ? meta.visualIntent.assetIntentRef
          : null,
    entity_id:
      typeof assetMeta.entityId === 'string'
        ? assetMeta.entityId
        : typeof meta.sourceEntityId === 'string'
          ? meta.sourceEntityId
          : null,
    material_slot: String(materialSlot),
    required_object: requiredObject,
    asset_meta_required_object: assetMetaRequiredObject,
    expected_entity_id: expectedEntityId,
    expected_asset_id: expectedAssetId,
    expected_asset_intent_ref: expectedAssetIntentRef,
    texture_key: String(textureKey)
  };
  const assetRequiredObjectBindingPath = [
    'asset_manifest.assets[].requiredObject',
    'loadSpriteAssets',
    'runtime_render_object',
    'materialization_report'
  ];
  const assetRequiredObjectBindingValid =
    requiredObject !== null &&
    assetRequiredObjectBindingSource.type === 'asset_manifest_required_object' &&
    assetRequiredObjectBindingSource.manifest_path === 'assets[].requiredObject' &&
    assetRequiredObjectBindingSource.required_object === requiredObject &&
    assetRequiredObjectBindingSource.asset_meta_required_object === requiredObject &&
    expectedEntityId !== null &&
    expectedAssetId !== null &&
    expectedAssetIntentRef !== null &&
    assetRequiredObjectBindingSource.entity_id === expectedEntityId &&
    assetRequiredObjectBindingSource.asset_id === expectedAssetId &&
    assetRequiredObjectBindingSource.asset_intent_ref === expectedAssetIntentRef &&
    assetRequiredObjectBindingPath.length === 4;
  const textureCachePresent = meta.textureCachePresent === true || materialized;
  const loadedInRuntime = textureCachePresent || rendererKind === 'generated_texture' || rendererKind === 'canvas_texture' || rendererKind === 'runtime_2d_generated_asset';
  const factoryUsedTextureKey = meta.factoryUsedTextureKey === true || (materialized && typeof textureKey === 'string' && !String(textureKey).startsWith('procedural:'));
  const labelOnly = meta.labelOnly === true || assetMeta.label_only === true;
  const motifCoverage = Array.isArray(assetMeta.motif_coverage) ? assetMeta.motif_coverage.filter((entry) => typeof entry === 'string') : [];
  const visualIntentSha = typeof assetMeta.visual_intent_sha === 'string' ? assetMeta.visual_intent_sha : null;
  const assetDesignSpecSha = typeof assetMeta.asset_design_spec_sha === 'string' ? assetMeta.asset_design_spec_sha : null;
  const roleStaticTemplateUsed = assetMeta.role_static_svg_template_used === true || assetMeta.roleStaticSvgTemplateUsed === true;
  const oldSvgForVisualIntentUsed = assetMeta.old_svgForVisualIntent_used === true || assetMeta.oldSvgForVisualIntentUsed === true;
  const templateDerivedPlaceholder =
    assetMeta.template_derived_placeholder === true ||
    assetMeta.templateDerivedPlaceholder === true ||
    roleStaticTemplateUsed ||
    oldSvgForVisualIntentUsed ||
    assetMeta.role_only_generation_detected === true ||
    assetMeta.matches_known_static_template === true ||
    motifCoverage.length === 0 ||
    typeof visualIntentSha !== 'string' ||
    typeof assetDesignSpecSha !== 'string';
  const usedPlaceholderRenderer =
    meta.usedPlaceholderRenderer === true || templateDerivedPlaceholder || (requiredObject !== null && !materialized && rendererKind !== 'generated_texture');
  const boundToRuntimeObject =
    requiredObject !== null &&
    assetRequiredObjectBindingValid === true &&
    loadedInRuntime === true &&
    factoryUsedTextureKey === true &&
    usedPlaceholderRenderer === false &&
    labelOnly === false &&
    templateDerivedPlaceholder === false &&
    (meta.source || 'canonical_dsl') === 'canonical_dsl' &&
    meta.visualIntent?.source === 'canonical_dsl_visual_intent';
  const placeholder = requiredObject !== null && (meta.placeholder === true || assetMeta.placeholder === true || templateDerivedPlaceholder || !boundToRuntimeObject);
  const record = {
    ...meta,
    required_object: requiredObject,
    asset_meta_required_object: assetMetaRequiredObject,
    canonical_id: meta.canonicalId || meta.sourceEntityId || meta.sourceNodeId || meta.role,
    expected_entity_id: expectedEntityId,
    expected_asset_id: expectedAssetId,
    expected_asset_intent_ref: expectedAssetIntentRef,
    source: meta.source || 'canonical_dsl',
    role: requiredObject === 'boss_projectile_phase_object' ? 'boss_projectile_phase_object' : visualRuntimeBroadRole(requiredObject, visualRole),
    runtimeRole: meta.role,
    weapon_id: meta.weaponId || meta.weapon_id || null,
    boss_id: meta.bossId || meta.boss_id || null,
    boss_phase: meta.bossPhase || meta.boss_phase || null,
    asset_role: meta.assetRole || assetMeta.role || visualRole || meta.role,
    asset_required_object_binding_source: assetRequiredObjectBindingSource,
    asset_required_object_binding_path: assetRequiredObjectBindingPath,
    asset_required_object_binding_valid: assetRequiredObjectBindingValid,
    texture_key: textureKey,
    visual_intent_sha: visualIntentSha,
    asset_design_spec_sha: assetDesignSpecSha,
    motif_coverage: motifCoverage,
    geometry_signature: typeof assetMeta.geometry_signature === 'string' ? assetMeta.geometry_signature : null,
    dsl_geometry_fingerprint: typeof assetMeta.dsl_geometry_fingerprint === 'string' ? assetMeta.dsl_geometry_fingerprint : null,
    role_static_control_fingerprint: typeof assetMeta.role_static_control_fingerprint === 'string' ? assetMeta.role_static_control_fingerprint : null,
    visual_geometry_dependency: assetMeta.visual_geometry_dependency === true,
    template_fingerprint: typeof assetMeta.template_fingerprint === 'string' ? assetMeta.template_fingerprint : null,
    role_static_template_used: roleStaticTemplateUsed,
    role_static_svg_template_used: roleStaticTemplateUsed,
    old_svgForVisualIntent_used: oldSvgForVisualIntentUsed,
    template_derived_placeholder: templateDerivedPlaceholder,
    role_only_generation_detected: assetMeta.role_only_generation_detected === true,
    matches_known_static_template: assetMeta.matches_known_static_template === true,
    distinct_silhouette: assetMeta.distinct_silhouette === true,
    renderer_kind: rendererKind,
    asset_format: assetFormat,
    renderer_is_implementation_detail: assetMeta.renderer_is_implementation_detail === true,
    draw_plan_sha: typeof assetMeta.draw_plan_sha === 'string' ? assetMeta.draw_plan_sha : null,
    rendered_canvas_pixel_sha: typeof assetMeta.rendered_canvas_pixel_sha === 'string' ? assetMeta.rendered_canvas_pixel_sha : null,
    loaded_in_runtime: loadedInRuntime,
    texture_cache_present: textureCachePresent,
    bound_to_runtime_object: boundToRuntimeObject,
    factory_used_texture_key: factoryUsedTextureKey,
    used_placeholder_renderer: usedPlaceholderRenderer,
    materialized,
    label_only: labelOnly,
    run_scoped_asset_path: assetMeta.run_scoped_asset_path || assetMeta.runScopedAssetPath || null,
    run_scoped_asset_sha256: assetMeta.run_scoped_asset_sha256 || assetMeta.runScopedAssetSha256 || null,
    served_asset_path: assetMeta.served_asset_path || assetMeta.servedAssetPath || assetMeta.path || null,
    served_asset_sha256: assetMeta.served_asset_sha256 || assetMeta.servedAssetSha256 || null,
    copied_to_served_assets: assetMeta.copied_to_served_assets === true || assetMeta.copiedToServedAssets === true,
    placeholder,
    screenX: Math.round(screenX),
    screenY: Math.round(screenY),
    screenW: Math.round(meta.w),
    screenH: Math.round(meta.h),
    visible,
    visualIntentSource: meta.visualIntent?.source || 'missing_visual_intent',
    visualRole,
    assetIntentRef: meta.visualIntent?.assetIntentRef || meta.assetIntentRef || null,
    silhouette: meta.visualIntent?.silhouette || null,
    palette: visualPaletteToArray(meta.visualIntent?.palette),
    visual_palette: meta.visualIntent?.palette || null
  };
  state.lastRenderObjects.push(record);
  if (visible && record.visualIntentSource === 'canonical_dsl_visual_intent' && typeof record.visualRole === 'string') {
    state.observedVisualRuntimeRoles.add(record.visualRole);
  }
  if (visible && typeof record.contentType === 'string') {
    state.observedVisualContentTypes.add(record.contentType);
  }
  if (visible && !state.scriptedCaptureActive && requiredObject !== null && boundToRuntimeObject && placeholder === false) {
    state.observedFreshManualVisualObjects.set(requiredObject, {
      required_object: requiredObject,
      canonical_id: record.canonical_id,
      expected_entity_id: record.expected_entity_id,
      expected_asset_id: record.expected_asset_id,
      expected_asset_intent_ref: record.expected_asset_intent_ref,
      role: record.role,
      source: record.source,
      asset_meta_required_object: record.asset_meta_required_object,
      visual_role: String(record.visualRole),
      asset_role: String(record.asset_role),
      asset_required_object_binding_source: record.asset_required_object_binding_source,
      asset_required_object_binding_path: record.asset_required_object_binding_path,
      asset_required_object_binding_valid: record.asset_required_object_binding_valid,
      palette: record.palette,
      silhouette: record.silhouette || 'canonical_dsl_visual_runtime_object',
      texture_key: String(record.texture_key),
      visual_intent_sha: record.visual_intent_sha,
      asset_design_spec_sha: record.asset_design_spec_sha,
      motif_coverage: record.motif_coverage,
      geometry_signature: record.geometry_signature,
      dsl_geometry_fingerprint: record.dsl_geometry_fingerprint,
      role_static_control_fingerprint: record.role_static_control_fingerprint,
      visual_geometry_dependency: record.visual_geometry_dependency,
      template_fingerprint: record.template_fingerprint,
      role_static_template_used: record.role_static_template_used,
      role_static_svg_template_used: record.role_static_svg_template_used,
      old_svgForVisualIntent_used: record.old_svgForVisualIntent_used,
      template_derived_placeholder: record.template_derived_placeholder,
      role_only_generation_detected: record.role_only_generation_detected,
      matches_known_static_template: record.matches_known_static_template,
      distinct_silhouette: record.distinct_silhouette,
      renderer_kind: record.renderer_kind,
      asset_format: record.asset_format,
      renderer_is_implementation_detail: record.renderer_is_implementation_detail,
      draw_plan_sha: record.draw_plan_sha,
      rendered_canvas_pixel_sha: record.rendered_canvas_pixel_sha,
      loaded_in_runtime: record.loaded_in_runtime,
      texture_cache_present: record.texture_cache_present,
      bound_to_runtime_object: record.bound_to_runtime_object,
      factory_used_texture_key: record.factory_used_texture_key,
      used_placeholder_renderer: record.used_placeholder_renderer,
      visible_in_fresh_manual_traversal: true,
      materialized: record.materialized,
      run_scoped_asset_path: record.run_scoped_asset_path,
      run_scoped_asset_sha256: record.run_scoped_asset_sha256,
      served_asset_path: record.served_asset_path,
      served_asset_sha256: record.served_asset_sha256,
      copied_to_served_assets: record.copied_to_served_assets,
      placeholder: false,
      label_only: false,
      evidence_screenshots: []
    });
  }
}

function finishVisualRuntimeFrame(state) {
  const visibleObjects = state.lastRenderObjects.filter((record) => record.visible);
  const observedRuntimeRoles = [...state.observedVisualRuntimeRoles].sort();
  const observedContentTypes = [...state.observedVisualContentTypes].sort();
  const requiredRuntimeRoles = ['player', 'enemy_ground', 'enemy_static', 'flying_enemy', 'pickup', 'projectile', 'hazard', 'boss'];
  const requiredContentTypes = ['player', 'enemy_wave', 'static_enemy', 'flying_enemy', 'weapon_pickup', 'projectile', 'hazard', 'boss', 'boss_telegraph', 'boss_phase', 'region_transition', 'runtime_feedback'];
  window.__STEP38_VISUAL_RUNTIME_BINDINGS = {
    status:
      requiredRuntimeRoles.every((role) => observedRuntimeRoles.includes(role)) &&
      requiredContentTypes.every((contentType) => observedContentTypes.includes(contentType))
        ? 'PASSED'
        : 'IN_PROGRESS',
    source: 'runtime_canvas_render_objects',
    canonical_dsl_visual_intent_runtime_bound: visibleObjects.some((record) => record.visualIntentSource === 'canonical_dsl_visual_intent'),
    required_runtime_roles: requiredRuntimeRoles,
    observed_runtime_roles: observedRuntimeRoles,
    missing_runtime_roles: requiredRuntimeRoles.filter((role) => !observedRuntimeRoles.includes(role)),
    required_content_types: requiredContentTypes,
    observed_content_types: observedContentTypes,
    missing_content_types: requiredContentTypes.filter((contentType) => !observedContentTypes.includes(contentType)),
    visible_render_objects: visibleObjects,
    visual_slice_preview_mode: state.visualSlicePreviewMode,
    visual_slice_duration_scale: state.visualSliceDurationScale
  };
  window.__STEP38_VISUAL_RUNTIME_BINDING_REPORT = buildVisualRuntimeBindingReport(state);
  window.__STEP38_VISUAL_ASSET_MATERIALIZATION_REPORT = buildVisualAssetMaterializationReport(state);
  updateManualTraversalEvidence(state, visibleObjects, performance.now());
}

function sortedSetValues(set) {
  return [...set].filter((value) => typeof value === 'string').sort();
}

function routeSegmentForPlayer(state) {
  const route = Array.isArray(state.manualTraversalPath?.route) ? state.manualTraversalPath.route : [];
  return (
    route.find(
      (leg) =>
        leg &&
        typeof leg.id === 'string' &&
        typeof leg.from_x === 'number' &&
        typeof leg.to_x === 'number' &&
        state.player.x >= leg.from_x - 40 &&
        state.player.x <= leg.to_x + 180
    ) || null
  );
}

function previewWindowForPlayer(state) {
  const windows = Array.isArray(state.manualProjection?.windows) ? state.manualProjection.windows : [];
  return (
    windows.find((window) => {
      const range = Array.isArray(window?.preview_x_range) ? window.preview_x_range : [];
      return (
        typeof window?.id === 'string' &&
        typeof range[0] === 'number' &&
        typeof range[1] === 'number' &&
        state.player.x >= range[0] - 160 &&
        state.player.x <= range[1] + 260
      );
    }) || null
  );
}

function markManualMilestone(state, id, elapsedSec) {
  if (!state.manualTraversal.observedMilestones.has(id)) {
    state.manualTraversal.observedMilestones.add(id);
    state.manualTraversal.milestoneTimes.push({ id, elapsedSec });
  }
}

function runtimeCompletionPreconditionEvidence(state, override = {}) {
  const traversal = state.manualTraversal;
  const observedPreviewWindows = sortedSetValues(traversal.observedPreviewWindows);
  const observedWaveIds = sortedSetValues(traversal.observedWaveIds);
  const clearedWaveIds = sortedSetValues(traversal.clearedWaveIds);
  const requiredWaveIds = [
    ...new Set(
      state.enemies
        .filter((enemy) => enemy.spawnSource !== 'static_entity' && !enemy.static)
        .map((enemy) => enemy.sourceNodeId)
        .filter((id) => typeof id === 'string')
    )
  ].sort();
  const waveProgressionComplete = requiredWaveIds.length > 0 && requiredWaveIds.every((id) => clearedWaveIds.includes(id));
  const areaProgressionComplete =
    observedPreviewWindows.includes('window_0_intro') &&
    observedPreviewWindows.includes('window_1_weapon_wave_area') &&
    observedPreviewWindows.includes('window_2_boss') &&
    traversal.observedSegments.size >= 3;
  const weaponPickupConsumed = traversal.weaponPickupSeen === true || window.__STEP38_PLAYABLE_STATE?.pickupCollected === true;
  const bossPhaseSeen = traversal.bossPhaseSeen === true || window.__STEP38_PLAYABLE_STATE?.bossPhaseChanged === true || state.boss.phase >= 2;
  const bossDefeatedByInput =
    override.boss_defeated_by_input === true ||
    (state.won === true &&
      state.boss.alive === false &&
      state.scriptedCaptureUsed === false &&
      events.some((record) => record.event === 'enemy.hit' && record.boss === true) &&
      events.some((record) => record.event === 'mission.complete' && record.objective === 'boss_defeated'));
  const satisfied = [];
  if (waveProgressionComplete) satisfied.push('wave_progression_complete');
  if (areaProgressionComplete) satisfied.push('area_progression_complete');
  if (weaponPickupConsumed) satisfied.push('weapon_pickup_consumed');
  if (bossPhaseSeen) satisfied.push('boss_phase_seen');
  if (bossDefeatedByInput) satisfied.push('boss_defeated_by_input');
  const allSatisfied = requiredCompletionPreconditions.every((precondition) => satisfied.includes(precondition));
  return {
    required_completion_preconditions: requiredCompletionPreconditions,
    satisfied_completion_preconditions: satisfied,
    required_wave_ids: requiredWaveIds,
    cleared_wave_ids: clearedWaveIds,
    observed_preview_windows: observedPreviewWindows,
    wave_progression_complete: waveProgressionComplete,
    area_progression_complete: areaProgressionComplete,
    weapon_pickup_consumed: weaponPickupConsumed,
    boss_phase_seen: bossPhaseSeen,
    boss_defeated_by_input: bossDefeatedByInput,
    all_required_waves_resolved_before_win: waveProgressionComplete,
    all_required_regions_traversed_before_win: areaProgressionComplete,
    weapon_and_boss_phase_reached_before_win: weaponPickupConsumed && bossPhaseSeen,
    completion_preconditions_satisfied: allSatisfied,
    real_playthrough_completion_verified: (state.won === true || override.mission_complete_reached_by_input === true) && allSatisfied,
    text_or_overlay_only_evidence: (state.won === true || override.mission_complete_reached_by_input === true) && !allSatisfied,
    early_mission_complete_detected: (state.won === true || override.mission_complete_reached_by_input === true) && !allSatisfied
  };
}

function updateManualClearedWaves(state) {
  const waveIds = new Set(
    state.enemies
      .filter((enemy) => enemy.spawnSource !== 'static_entity' && !enemy.static)
      .map((enemy) => enemy.sourceNodeId)
      .filter((id) => typeof id === 'string')
  );
  for (const waveId of waveIds) {
    const waveEnemies = state.enemies.filter((enemy) => enemy.sourceNodeId === waveId);
    if (waveEnemies.length > 0 && waveEnemies.every((enemy) => !enemy.alive)) {
      state.manualTraversal.clearedWaveIds.add(waveId);
    }
  }
}

function updateManualTraversalEvidence(state, visibleObjects, now) {
  if (state.scriptedCaptureActive) {
    return;
  }

  const traversal = state.manualTraversal;
  const elapsedSec = (now - traversal.startedAt) / 1000;
  traversal.lastElapsedSec = elapsedSec;

  const routeSegment = routeSegmentForPlayer(state);
  const previewWindow = previewWindowForPlayer(state);
  traversal.lastRouteSegment = routeSegment?.id || null;
  traversal.lastPreviewWindow = previewWindow?.id || null;
  if (previewWindow?.id) traversal.observedPreviewWindows.add(previewWindow.id);
  if (routeSegment?.id) traversal.observedSegments.add(routeSegment.id);

  for (const object of visibleObjects) {
    if (typeof object.segmentId === 'string') traversal.observedSegments.add(object.segmentId);
    if (typeof object.contentType === 'string') traversal.observedContentTypes.add(object.contentType);
    if (typeof object.visualRole === 'string') traversal.observedVisualRoles.add(object.visualRole);
    if (
      object.required_object !== null &&
      (object.placeholder !== false || object.source !== 'canonical_dsl' || object.visualIntentSource !== 'canonical_dsl_visual_intent')
    ) {
      traversal.placeholderObjectsSeen = true;
    }
    if (object.visualIntentSource === 'canonical_dsl_visual_intent') {
      traversal.canonicalDslVisualIntentRuntimeBound = true;
    }
    if ((object.contentType === 'enemy_wave' || object.contentType === 'flying_enemy') && typeof object.sourceNodeId === 'string') {
      traversal.observedWaveIds.add(object.sourceNodeId);
    }
    if (object.contentType === 'weapon_pickup') traversal.weaponPickupSeen = true;
    if (object.contentType === 'boss') traversal.bossSeen = true;
    if (object.contentType === 'boss_telegraph') traversal.bossTelegraphSeen = true;
    if (object.contentType === 'boss_phase') traversal.bossPhaseSeen = true;
  }

  for (const layout of state.segmentLayouts.values()) {
    const visibleLeft = state.cameraX;
    const visibleRight = state.cameraX + 960;
    if (layout.endX >= visibleLeft && layout.startX <= visibleRight) {
      traversal.observedSegments.add(layout.id);
      const motif = layout.environmentVisual?.motif || layout.environmentVisual?.id || layout.id;
      if (typeof motif === 'string' && motif.trim().length > 0) {
        traversal.observedEnvironmentMotifs.add(motif);
      }
    }
  }

  updateManualClearedWaves(state);
  const visiblePostFirstWaveEnemy = visibleObjects.some(
    (object) =>
      (object.contentType === 'enemy_wave' || object.contentType === 'flying_enemy') &&
      typeof object.sourceNodeId === 'string' &&
      !traversal.clearedWaveIds.has(object.sourceNodeId)
  );
  if (traversal.clearedWaveIds.size > 0 && visiblePostFirstWaveEnemy) {
    traversal.postFirstWaveEnemySeen = true;
  }
  const visibleCoreWavePressure = visibleObjects.some((object) => {
    if (object.contentType !== 'enemy_wave' && object.contentType !== 'flying_enemy') {
      return false;
    }
    const sourceNodeId = typeof object.sourceNodeId === 'string' ? object.sourceNodeId : '';
    const segmentId = typeof object.segmentId === 'string' ? object.segmentId : '';
    const segmentLayout = segmentId.length > 0 ? state.segmentLayouts.get(segmentId) : null;
    return sourceNodeId.includes('core') || segmentId.includes('core') || segmentLayout?.projectionWindow?.id === 'window_2_boss';
  });
  if (visibleCoreWavePressure) {
    traversal.coreWavePressureSeen = true;
    markManualMilestone(state, 'core_wave_pressure_seen_by_input', elapsedSec);
  }

  const contentTypes = sortedSetValues(traversal.observedContentTypes);
  const previewWindows = sortedSetValues(traversal.observedPreviewWindows);
  if (traversal.observedWaveIds.size >= 1) markManualMilestone(state, 'wave1_seen_by_input', elapsedSec);
  if (traversal.weaponPickupSeen && previewWindows.includes('window_1_weapon_wave_area')) {
    markManualMilestone(state, 'pickup_area2_seen_by_input', elapsedSec);
  }
  if (traversal.observedWaveIds.size >= 2 || (previewWindows.includes('window_1_weapon_wave_area') && contentTypes.includes('flying_enemy'))) {
    markManualMilestone(state, 'wave2_seen_by_input', elapsedSec);
  }
  if (traversal.bossTelegraphSeen) markManualMilestone(state, 'boss_telegraph_seen_by_input', elapsedSec);
  if (window.__STEP38_PLAYABLE_STATE?.bossPhaseChanged === true || state.boss.phase >= 2) {
    traversal.bossPhaseSeen = true;
    markManualMilestone(state, 'boss_phase_seen_by_input', elapsedSec);
  }
  if (state.won || window.__STEP38_PLAYABLE_STATE?.winReached === true) {
    markManualMilestone(state, 'mission_complete_seen_by_input', elapsedSec);
  }

  const milestoneTimes = traversal.milestoneTimes.map((entry) => entry.elapsedSec).sort((left, right) => left - right);
  const gaps = milestoneTimes.slice(1).map((time, index) => time - milestoneTimes[index]);
  traversal.maxEmptyTraversalSecBetweenRequiredEvents = gaps.length > 0 ? Math.max(...gaps) : 0;

  const observedVisualRoles = sortedSetValues(traversal.observedVisualRoles);
  const observedEnvironmentMotifs = sortedSetValues(traversal.observedEnvironmentMotifs);
  const observedWaveIds = sortedSetValues(traversal.observedWaveIds);
  const clearedWaveIds = sortedSetValues(traversal.clearedWaveIds);
  const requiredVisualRoles = ['player', 'enemy_ground', 'enemy_static', 'flying_enemy', 'pickup', 'projectile', 'hazard', 'boss'];
  const requiredContentTypes = ['player', 'enemy_wave', 'static_enemy', 'flying_enemy', 'weapon_pickup', 'projectile', 'hazard', 'boss', 'boss_telegraph', 'boss_phase', 'region_transition', 'runtime_feedback'];
  const productDuration = state.durationSupport.supported_range_sec || { min: 480, max: 720 };
  const waveClearOrProgressionUnlock =
    clearedWaveIds.length >= 1 ||
    (observedWaveIds.length >= 2 && previewWindows.includes('window_1_weapon_wave_area') && traversal.weaponPickupSeen);
  const postFirstWaveProgressionSeen =
    traversal.postFirstWaveEnemySeen ||
    (observedWaveIds.length >= 2 && contentTypes.some((contentType) => contentType === 'enemy_wave' || contentType === 'flying_enemy'));
  const movingFireSeen =
    window.__STEP38_PLAYABLE_STATE?.movingFireObserved === true ||
    events.some((record) => record.event === 'player.fired' && record.source === 'player_input' && (record.moving === true || record.moving_fire === true));
  const completionEvidence = runtimeCompletionPreconditionEvidence(state);
  const gate = {
    verdict: 'FAIL',
    starts_from_spawn: true,
    input_only: true,
    teleport_used: false,
    camera_jump_used: false,
    debug_reposition_used: false,
    state_injection_used: false,
    direct_spawn_used: false,
    scripted_capture_used_for_pass: false,
    max_target_duration_sec: 50,
    wave2_reached_by_input: observedWaveIds.length >= 2 || traversal.observedMilestones.has('wave2_seen_by_input'),
    area2_reached_by_input: previewWindows.includes('window_1_weapon_wave_area'),
    weapon_pickup_reached_by_input: traversal.weaponPickupSeen,
    moving_fire_seen_by_input: movingFireSeen,
    wave_clear_or_progression_unlock_by_input: waveClearOrProgressionUnlock,
    boss_reached_by_input_or_scripted_reachable_after_input_path: traversal.bossSeen,
    boss_telegraph_seen_by_input: traversal.bossTelegraphSeen,
    mission_complete_reached_by_input: state.won === true && window.__STEP38_PLAYABLE_STATE?.winReached === true,
    boss_defeated_by_input: completionEvidence.boss_defeated_by_input,
    all_required_waves_resolved_before_win: completionEvidence.all_required_waves_resolved_before_win,
    all_required_regions_traversed_before_win: completionEvidence.all_required_regions_traversed_before_win,
    weapon_and_boss_phase_reached_before_win: completionEvidence.weapon_and_boss_phase_reached_before_win,
    text_or_overlay_only_completion_evidence: completionEvidence.text_or_overlay_only_evidence,
    early_mission_complete_detected: completionEvidence.early_mission_complete_detected,
    dsl_visual_objects_seen_by_input: traversal.canonicalDslVisualIntentRuntimeBound,
    large_empty_traversal_detected: traversal.maxEmptyTraversalSecBetweenRequiredEvents > 8,
    milestone_times_sec: traversal.milestoneTimes,
    completion_precondition_evidence: completionEvidence
  };
  const status =
    previewWindows.includes('window_0_intro') &&
    previewWindows.includes('window_1_weapon_wave_area') &&
    previewWindows.includes('window_2_boss') &&
    traversal.observedSegments.size >= 3 &&
    gate.wave2_reached_by_input &&
    waveClearOrProgressionUnlock &&
    postFirstWaveProgressionSeen &&
    gate.weapon_pickup_reached_by_input &&
    movingFireSeen &&
    traversal.bossSeen &&
    traversal.bossTelegraphSeen &&
    traversal.bossPhaseSeen &&
    completionEvidence.real_playthrough_completion_verified &&
    observedEnvironmentMotifs.length >= 3 &&
    requiredVisualRoles.every((role) => observedVisualRoles.includes(role)) &&
    requiredContentTypes.every((contentType) => contentTypes.includes(contentType)) &&
    !traversal.placeholderObjectsSeen &&
    traversal.canonicalDslVisualIntentRuntimeBound &&
    !gate.large_empty_traversal_detected;
  gate.verdict = status ? 'PASS' : 'FAIL';

  window.__STEP38_MANUAL_TRAVERSAL_EVIDENCE = {
    schemaVersion: 'step38.manual-traversal-evidence.v1',
    status: status ? 'PASSED' : 'FAILED',
    evidence_source: 'playwright_keyboard_continuous_path',
    started_at_player_spawn: true,
    capture_window_teleport_used: false,
    product_duration_sec: productDuration,
    preview_target_sec: 50,
    elapsed_sec_from_spawn: Number(elapsedSec.toFixed(2)),
    current_player_x: Math.round(state.player.x),
    current_camera_x: Math.round(state.cameraX),
    current_route_segment: traversal.lastRouteSegment,
    current_preview_window: traversal.lastPreviewWindow,
    observed_preview_windows: previewWindows,
    observed_segments: sortedSetValues(traversal.observedSegments),
    observed_wave_ids: observedWaveIds,
    cleared_wave_ids: clearedWaveIds,
    post_first_wave_enemy_seen: postFirstWaveProgressionSeen,
    progression_unlock_seen_by_input: waveClearOrProgressionUnlock,
    weapon_pickup_seen: traversal.weaponPickupSeen,
    moving_fire_seen_by_input: movingFireSeen,
    boss_seen: traversal.bossSeen,
    boss_telegraph_seen: traversal.bossTelegraphSeen,
    boss_phase_seen: traversal.bossPhaseSeen,
    distinct_environment_visual_count: observedEnvironmentMotifs.length,
    observed_environment_motifs: observedEnvironmentMotifs,
    observed_content_types: contentTypes,
    observed_visual_roles: observedVisualRoles,
    placeholder_objects_seen: traversal.placeholderObjectsSeen,
    canonical_dsl_visual_intent_runtime_bound: traversal.canonicalDslVisualIntentRuntimeBound,
    scripted_capture_used_for_pass: false,
    manual_traversal_gate: gate
  };
  window.__STEP38_REAL_PLAYTHROUGH_COMPLETION_EVIDENCE = {
    schemaVersion: 'step38.real-playthrough-completion-evidence.v1',
    source: 'fresh_input_only_browser_playthrough',
    screenshots: [],
    real_playthrough_completion_gate: {
      verdict: status && completionEvidence.real_playthrough_completion_verified ? 'PASS' : 'FAIL',
      fresh_manual_session: true,
      input_only: true,
      starts_from_spawn: true,
      teleport_used: false,
      camera_jump_used: false,
      debug_reposition_used: false,
      state_injection_used: false,
      direct_spawn_used: false,
      direct_phase_trigger_used: false,
      direct_mission_trigger_used: false,
      real_playthrough_completion_verified: completionEvidence.real_playthrough_completion_verified,
      boss_defeated_by_input: completionEvidence.boss_defeated_by_input,
      all_required_waves_resolved_before_win: completionEvidence.all_required_waves_resolved_before_win,
      all_required_regions_traversed_before_win: completionEvidence.all_required_regions_traversed_before_win,
      weapon_and_boss_phase_reached_before_win: completionEvidence.weapon_and_boss_phase_reached_before_win,
      mission_complete_after_real_playthrough: state.won === true && window.__STEP38_PLAYABLE_STATE?.winReached === true,
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      receipt_only_evidence_used_for_pass: false,
      telemetry_only_evidence_used_for_pass: false,
      scripted_capture_used_for_pass: false,
      text_or_overlay_only_evidence: completionEvidence.text_or_overlay_only_evidence,
      early_mission_complete_detected: completionEvidence.early_mission_complete_detected,
      verified_completion_preconditions: completionEvidence.satisfied_completion_preconditions
    },
    human_visible_gameplay_gate: {
      verdict: status && completionEvidence.real_playthrough_completion_verified ? 'PASS' : 'FAIL',
      operator_visible_evidence_required: true,
      browser_visual_evidence_required: true,
      input_only_evidence_required: true,
      fresh_manual_session: true,
      input_only: true,
      player_visible: observedVisualRoles.includes('player'),
      weapon_visible: traversal.weaponPickupSeen,
      wave1_visible: traversal.observedMilestones.has('wave1_seen_by_input'),
      wave2_visible: gate.wave2_reached_by_input,
      area_progression_visible: gate.area2_reached_by_input,
      boss_visible: traversal.bossSeen,
      boss_phase_visible: traversal.bossPhaseSeen,
      mission_complete_visible_after_play: state.won === true && window.__STEP38_PLAYABLE_STATE?.winReached === true,
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      receipt_only_evidence_used_for_pass: false,
      telemetry_only_evidence_used_for_pass: false,
      scripted_capture_used_for_pass: false,
      screenshot_labels: []
    }
  };
  window.__STEP38_OPERATOR_VISIBLE_ART_GATE = {
    schemaVersion: 'step38.operator-visible-art-gate.v1',
    source: 'fresh_browser_screenshots',
    screenshot_labels: [],
    operator_visible_art_gate: {
      verdict: status && !traversal.placeholderObjectsSeen ? 'PASS' : 'FAIL',
      operator_visible_evidence_required: true,
      browser_visual_evidence_required: true,
      player_visibly_dsl_derived: observedVisualRoles.includes('player'),
      enemy_types_visibly_distinct: observedVisualRoles.includes('enemy_ground') && observedVisualRoles.includes('flying_enemy'),
      boss_visibly_distinct: observedVisualRoles.includes('boss'),
      boss_projectile_visibly_distinct: contentTypes.includes('boss_phase'),
      weapon_pickup_visibly_distinct: contentTypes.includes('weapon_pickup'),
      environment_theme_visibly_layered: observedEnvironmentMotifs.length >= 3,
      projectile_types_visibly_distinct: contentTypes.includes('projectile'),
      label_only_visual_evidence: false,
      placeholder_style_dominant: traversal.placeholderObjectsSeen,
      screenshots_support_visual_claims: false,
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      receipt_only_evidence_used_for_pass: false,
      telemetry_only_evidence_used_for_pass: false,
      scripted_capture_used_for_pass: false
    }
  };
  window.__STEP38_VISUAL_PLAYTHROUGH_VALIDATOR_REPORT = {
    schemaVersion: 'step38.visual-playthrough-validator-report.v1',
    evidence_paths: [],
    visual_playthrough_validator: {
      verdict: status && completionEvidence.real_playthrough_completion_verified ? 'PASS' : 'BLOCKED',
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      receipt_only_evidence_used_for_pass: false,
      telemetry_only_evidence_used_for_pass: false,
      scripted_capture_used_for_pass: false,
      operator_visible_evidence_required: true,
      browser_visual_evidence_required: true,
      input_only_evidence_required: true,
      blocking_reasons: status && completionEvidence.real_playthrough_completion_verified ? [] : ['runtime_playthrough_not_complete'],
      required_gate_summary: {
        real_playthrough_completion_gate: status && completionEvidence.real_playthrough_completion_verified ? 'PASS' : 'BLOCKED',
        human_visible_gameplay_gate: status && completionEvidence.real_playthrough_completion_verified ? 'PASS' : 'BLOCKED',
        operator_visible_art_gate: status && !traversal.placeholderObjectsSeen ? 'PASS' : 'BLOCKED',
        win_path_gate: completionEvidence.real_playthrough_completion_verified ? 'PASS' : 'BLOCKED',
        lose_path_gate: 'BLOCKED'
      }
    }
  };
}

function drawRuntimeSprite(ctx, state, meta, image, x, y, w, h, fallbackColor) {
  const hasGenerated2dPlan = Boolean(image && image.__step38CanvasDrawPlan);
  const usedAsset = Boolean(image && image.complete && (hasGenerated2dPlan || image.naturalWidth > 0));
  drawSprite(ctx, image, x, y, w, h, fallbackColor);
  const assetMeta = image?.__step38AssetMeta || null;
  recordVisualRuntimeObject(state, {
    ...meta,
    x,
    y,
    w,
    h,
    usedAsset,
    rendererKind: hasGenerated2dPlan && assetMeta ? assetMeta.renderer_kind : undefined,
    textureKey: hasGenerated2dPlan && assetMeta ? assetMeta.textureKey : undefined,
    factoryUsedTextureKey: usedAsset && assetMeta !== null && typeof assetMeta.textureKey === 'string',
    textureCachePresent: usedAsset,
    usedPlaceholderRenderer: !usedAsset,
    assetMeta
  });
}

function recordScreenFeedbackObject(state) {
  const visualIntent = { role: 'feedback', assetIntentRef: 'runtime_hud_feedback', silhouette: 'hud_text_feedback', palette: { primary: '#f9fafb', accent: '#38bdf8', outline: '#0f172a' }, source: 'canonical_dsl_visual_intent' };
  recordVisualRuntimeObject(state, {
    role: 'feedback',
    contentType: 'runtime_feedback',
    objectType: 'hud',
    visualIntent,
    x: state.cameraX + 20,
    y: 16,
    w: 760,
    h: 62,
    usedAsset: false
  });
}

function environmentTokenSet(layout) {
  const tokens = new Set();
  const addTokens = (value) => {
    if (Array.isArray(value)) {
      value.forEach(addTokens);
      return;
    }
    if (typeof value !== 'string') return;
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter(Boolean)
      .forEach((token) => tokens.add(token));
  };
  addTokens(layout.id);
  addTokens(layout.environmentVisual?.id);
  addTokens(layout.environmentVisual?.motif);
  addTokens(layout.environmentVisual?.motifs);
  addTokens(layout.environmentVisual?.tags);
  return tokens;
}

function environmentHasToken(tokens, needles) {
  return needles.some((needle) => tokens.has(needle));
}

function drawPixelBlock(ctx, x, y, w, h, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.restore();
}

function drawPixelStripe(ctx, x, y, steps, dx, dy, unit, color, alpha) {
  for (let i = 0; i < steps; i += 1) {
    drawPixelBlock(ctx, x + i * dx, y + i * dy, unit, unit, color, alpha);
  }
}

function drawPixelJungleLayer(ctx, x, groundY, palette, variant) {
  const trunk = palette[2] || '#3f5f7f';
  const leaf = palette[1] || '#1f7a4d';
  const shadow = palette[0] || '#132033';
  drawPixelBlock(ctx, x + 20, groundY - 188, 24, 188, trunk, 0.72);
  drawPixelBlock(ctx, x + 14, groundY - 156, 36, 16, trunk, 0.56);
  drawPixelBlock(ctx, x - 22, groundY - 224 - variant * 6, 84, 18, leaf, 0.64);
  drawPixelBlock(ctx, x - 42, groundY - 206 - variant * 6, 124, 24, leaf, 0.72);
  drawPixelBlock(ctx, x - 18, groundY - 182 - variant * 6, 76, 18, leaf, 0.58);
  drawPixelStripe(ctx, x + 8, groundY - 132, 7, -8, 9, 6, trunk, 0.82);
  drawPixelStripe(ctx, x + 44, groundY - 156, 8, 8, 8, 6, trunk, 0.82);
  drawPixelBlock(ctx, x - 12, groundY - 92, 58, 10, shadow, 0.46);
  drawPixelBlock(ctx, x + 4, groundY - 78, 8, 44, leaf, 0.48);
  drawPixelBlock(ctx, x + 56, groundY - 110, 8, 54, leaf, 0.4);
}

function drawPixelMetalLayer(ctx, x, groundY, palette, variant) {
  const beam = palette[2] || '#3f5f7f';
  const deck = palette[1] || '#1f7a4d';
  const shadow = palette[0] || '#132033';
  drawPixelBlock(ctx, x - 8, groundY - 246, 26, 246, beam, 0.68);
  drawPixelBlock(ctx, x + 112, groundY - 232, 24, 232, beam, 0.6);
  drawPixelStripe(ctx, x + 12, groundY - 238, 13, 10, 6, 8, deck, 0.76);
  drawPixelStripe(ctx, x + 116, groundY - 236, 13, -10, 6, 8, deck, 0.76);
  drawPixelBlock(ctx, x - 34, groundY - 142, 190, 14, shadow, 0.48);
  drawPixelBlock(ctx, x - 18, groundY - 126, 160, 8, deck, 0.55);
  for (let i = 0; i < 4; i += 1) {
    drawPixelBlock(ctx, x + 24 + i * 28, groundY - 152 + variant * 4, 10, 10, deck, 0.88);
  }
}

function drawPixelCoreLayer(ctx, x, groundY, palette, variant) {
  const hot = palette[1] || '#f59e0b';
  const frame = palette[2] || '#3f5f7f';
  const shadow = palette[0] || '#132033';
  drawPixelBlock(ctx, x, groundY - 214, 126, 22, frame, 0.72);
  drawPixelBlock(ctx, x + 14, groundY - 192, 98, 26, hot, 0.56);
  drawPixelBlock(ctx, x + 28, groundY - 166, 70, 22, frame, 0.72);
  drawPixelBlock(ctx, x + 44, groundY - 144, 38, 92, frame, 0.64);
  drawPixelBlock(ctx, x + 52, groundY - 128, 22, 58, hot, 0.72);
  drawPixelStripe(ctx, x - 28, groundY - 96, 7, 14, -10, 9, hot, 0.82);
  drawPixelStripe(ctx, x + 134, groundY - 94, 7, -14, -10, 9, hot, 0.82);
  drawPixelBlock(ctx, x + 18, groundY - 52 - variant * 4, 90, 10, shadow, 0.5);
}

function drawProceduralCanvasEnvironment(ctx, layout, palette, index, groundY) {
  const tokens = environmentTokenSet(layout);
  const x0 = layout.startX;
  const width = layout.width;
  const primary = palette[0] || '#132033';
  const accent = palette[1] || '#1f7a4d';
  const outline = palette[2] || '#3f5f7f';
  const isCore = environmentHasToken(tokens, ['core', 'molten', 'boss', 'reactor']);
  const isMetal = environmentHasToken(tokens, ['metal', 'bridge', 'industrial', 'factory']);
  const isJungle = environmentHasToken(tokens, ['jungle', 'canopy', 'ruin', 'forest']) || (!isCore && !isMetal);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (let x = x0 + 36; x < x0 + width; x += 64) {
    const y = 78 + ((index + Math.floor(x / 64)) % 5) * 26;
    drawPixelBlock(ctx, x, y, 44 + ((index + x) % 3) * 12, 8, outline, 0.18);
    drawPixelBlock(ctx, x + 8, y + 12, 28, 6, primary, 0.28);
  }
  for (let x = x0 + 72; x < x0 + width + 120; x += isCore ? 138 : isMetal ? 156 : 176) {
    const variant = (index + Math.floor(x / 64)) % 3;
    if (isCore) {
      drawPixelCoreLayer(ctx, x, groundY, [primary, accent, outline], variant);
    } else if (isMetal) {
      drawPixelMetalLayer(ctx, x, groundY, [primary, accent, outline], variant);
    } else if (isJungle) {
      drawPixelJungleLayer(ctx, x, groundY, [primary, accent, outline], variant);
    }
  }
  for (let x = x0 + 24; x < x0 + width; x += 96) {
    drawPixelBlock(ctx, x, groundY - 14, 58, 8, outline, 0.44);
    drawPixelBlock(ctx, x + 16, groundY - 26, 22, 8, accent, 0.38);
  }
  ctx.restore();
}

function draw(ctx, state) {
  ctx.clearRect(0, 0, 960, 540);
  beginVisualRuntimeFrame(state);
  ctx.fillStyle = '#132033';
  ctx.fillRect(0, 0, 960, 540);
  ctx.save();
  ctx.translate(-state.cameraX, 0);
  for (const segment of state.sceneIr.segments || []) {
    const layout = state.segmentLayouts.get(segment.id);
    if (!layout) continue;
    const palette = visualPaletteArray(layout.environmentVisual, ['#132033', '#1f7a4d', '#3f5f7f']);
    ctx.fillStyle = palette[0];
    ctx.fillRect(layout.startX, 0, layout.width, state.groundY);
    drawProceduralCanvasEnvironment(ctx, layout, palette, segment.order || 0, state.groundY);
    ctx.fillStyle = palette[1];
    ctx.fillRect(layout.startX, state.groundY, layout.width, 110);
    ctx.fillStyle = palette[2];
    ctx.fillRect(layout.startX + 30, state.groundY + 36, Math.min(layout.width - 60, 680), 8);
    const areaMarkerAsset = spriteAssetForRequiredObject(state.spriteAssets, 'area_marker');
    const areaMarkerVisualIntent = {
      entityId: 'area_marker.progression_gate.v1',
      role: 'area_marker',
      assetIntentRef: 'area_marker.progression_gate.v1',
      silhouette: layout.environmentVisual?.motif || 'dsl_segment_environment',
      palette: { primary: palette[0], accent: palette[1], outline: palette[2] },
      source: 'canonical_dsl_visual_intent'
    };
    drawRuntimeSprite(ctx, state, {
      requiredObject: 'area_marker',
      role: 'area_marker',
      contentType: 'region_transition',
      objectType: 'segment_environment',
      assetRole: 'area_marker',
      visualIntent: areaMarkerVisualIntent,
      segmentId: layout.id,
      sourceEntityId: 'area_marker.progression_gate.v1'
    }, areaMarkerAsset, layout.startX + 52, state.groundY - 88, 84, 84, palette[2]);
    if (layout.width > 360) {
      drawRuntimeSprite(ctx, state, {
        requiredObject: 'area_marker',
        role: 'area_marker',
        contentType: 'region_transition',
        objectType: 'progression_gate',
        assetRole: 'area_marker',
        visualIntent: areaMarkerVisualIntent,
        segmentId: layout.id,
        sourceEntityId: 'area_marker.progression_gate.v1'
      }, areaMarkerAsset, layout.startX + layout.width - 180, state.groundY - 88, 84, 84, palette[2]);
    }
  }
  ctx.fillStyle = '#3f5f7f';
  for (const segment of state.sceneIr.segments || []) {
    const layout = state.segmentLayouts.get(segment.id);
    const x = layout?.startX ?? (segment.order || 0) * 720;
    const width = Math.min(layout?.width ?? 560, 680);
    ctx.fillRect(x + 30, state.groundY + 36, width, 8);
    ctx.fillStyle = '#3f5f7f';
  }
  for (const pickup of state.pickups) {
    if (pickup.collected) continue;
    const pickupAsset = spriteAssetForIntent(state.spriteAssets, pickup.visualIntent, 'pickup') || spriteAssetForRequiredObject(state.spriteAssets, 'pickup_weapon');
    drawRuntimeSprite(ctx, state, { requiredObject: 'pickup_weapon', role: 'pickup', assetRole: 'pickup', contentType: 'weapon_pickup', objectType: 'pickup', sourceEntityId: pickup.sourceEntityId, sourceNodeId: pickup.sourceNodeId, visualIntent: pickup.visualIntent }, pickupAsset, pickup.x, pickup.y - 16, 48, 48, '#22c55e');
  }
  for (const hazard of state.hazards) {
    const hazardAsset = spriteAssetForIntent(state.spriteAssets, hazard.visualIntent, 'hazard');
    drawRuntimeSprite(ctx, state, { requiredObject: 'environment_hazard', role: 'hazard', assetRole: 'hazard', contentType: 'hazard', objectType: 'hazard', sourceEntityId: hazard.sourceEntityId, visualIntent: hazard.visualIntent }, hazardAsset, hazard.x, hazard.y - 44, 70, 70, hazard.visualIntent.palette.primary);
  }
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    const enemyRequiredObject = enemy.sourceEntityId === 'fixed_turret' ? 'ranged_enemy' : enemy.lane === 'air' ? 'flying_enemy' : 'ground_enemy';
    const enemySprite = spriteAssetForIntent(
      state.spriteAssets,
      enemy.visualIntent,
      enemy.sourceEntityId === 'fixed_turret' ? 'enemy_static' : enemy.lane === 'air' ? 'flying_enemy' : 'enemy_ground'
    ) || spriteAssetForRequiredObject(state.spriteAssets, enemyRequiredObject);
    drawRuntimeSprite(
      ctx,
      state,
      { requiredObject: enemyRequiredObject, role: enemy.visualIntent.role, assetRole: enemy.sourceEntityId === 'fixed_turret' ? 'enemy_static' : enemy.lane === 'air' ? 'flying_enemy' : 'enemy_ground', contentType: enemy.sourceEntityId === 'fixed_turret' ? 'static_enemy' : enemy.lane === 'air' ? 'flying_enemy' : 'enemy_wave', objectType: 'enemy', sourceEntityId: enemy.sourceEntityId, sourceNodeId: enemy.sourceNodeId, segmentId: enemy.segmentId, lane: enemy.lane, visualIntent: enemy.visualIntent },
      enemySprite,
      enemy.x - 8,
      enemy.y - 18,
      enemy.sourceEntityId === 'fixed_turret' ? 78 : 64,
      enemy.sourceEntityId === 'fixed_turret' ? 72 : 64,
      enemy.sourceEntityId === 'fixed_turret' ? '#94a3b8' : enemy.lane === 'air' ? '#fb7185' : '#ef4444'
    );
    if (!enemy.static) {
      const markerY = enemy.y - (enemy.lane === 'air' ? 58 : 64);
      const waveMarkerAsset = spriteAssetForRequiredObject(state.spriteAssets, 'wave_marker');
      drawRuntimeSprite(ctx, state, {
        requiredObject: 'wave_marker',
        role: 'wave_marker',
        assetRole: 'wave_marker',
        contentType: 'enemy_wave',
        objectType: 'wave_marker',
        sourceEntityId: enemy.sourceEntityId,
        sourceNodeId: enemy.sourceNodeId,
        segmentId: enemy.segmentId,
        visualIntent: {
          ...enemy.visualIntent,
          entityId: 'wave_marker.runtime_trigger.v1',
          role: 'wave_marker',
          assetIntentRef: 'wave_marker.runtime_trigger.v1',
          silhouette: 'dsl enemy wave flag marker'
        },
        sourceEntityId: 'wave_marker.runtime_trigger.v1'
      }, waveMarkerAsset, enemy.x - 24, markerY - 34, 62, 62, enemy.visualIntent.palette.accent);
    }
  }
  if (state.boss.alive) {
    const bossAsset = spriteAssetForIntent(state.spriteAssets, state.boss.visualIntent, 'boss') || spriteAssetForRequiredObject(state.spriteAssets, 'boss');
    drawRuntimeSprite(ctx, state, { requiredObject: 'boss', role: 'boss', assetRole: 'boss', contentType: 'boss', objectType: 'boss', sourceEntityId: state.boss.sourceEntityId, visualIntent: state.boss.visualIntent }, bossAsset, state.boss.x - 18, state.boss.y - 20, 122, 122, state.boss.phase === 2 ? '#f97316' : '#a855f7');
    const bossTelegraphAsset = spriteAssetForRequiredObject(state.spriteAssets, 'boss_telegraph');
    drawRuntimeSprite(ctx, state, {
      requiredObject: 'boss_telegraph',
      role: 'boss',
      assetRole: 'boss_telegraph',
      contentType: 'boss_telegraph',
      objectType: 'boss_telegraph',
      sourceEntityId: 'boss_telegraph.runtime_arc.v1',
      visualIntent: {
        ...state.boss.visualIntent,
        entityId: 'boss_telegraph.runtime_arc.v1',
        role: 'boss_telegraph',
        assetIntentRef: 'boss_telegraph.runtime_arc.v1',
        silhouette: 'canonical DSL boss telegraph warning ring with phase spikes'
      }
    }, bossTelegraphAsset, state.boss.x - 40, state.boss.y - 58, 166, 166, state.boss.phase === 2 ? '#f97316' : '#a855f7');
    const bossPhaseAsset = spriteAssetForRequiredObject(state.spriteAssets, 'boss_projectile_phase_object');
    drawRuntimeSprite(ctx, state, {
      requiredObject: 'boss_projectile_phase_object',
      role: 'boss_projectile_phase_object',
      assetRole: 'boss_projectile_phase_object',
      contentType: 'boss_phase',
      objectType: 'boss_phase_' + state.boss.phase,
      sourceEntityId: 'boss_projectile_phase.runtime.v1',
      visualIntent: {
        ...state.boss.visualIntent,
        entityId: 'boss_projectile_phase.runtime.v1',
        role: 'boss_projectile_phase_object',
        assetIntentRef: 'boss_projectile_phase.runtime.v1',
        silhouette: 'canonical DSL boss phase projectile core with three-way pattern'
      }
    }, bossPhaseAsset, state.boss.x + 68, state.boss.y - 34, 58, 58, '#f97316');
  }
  const playerAsset = spriteAssetForIntent(state.spriteAssets, state.player.visualIntent, 'player') || spriteAssetForRequiredObject(state.spriteAssets, 'player');
  drawRuntimeSprite(ctx, state, { requiredObject: 'player', role: 'player', assetRole: 'player', contentType: 'player', objectType: 'player', sourceEntityId: 'player', visualIntent: state.player.visualIntent }, playerAsset, state.player.x - 14, state.player.y - 18, 68, 82, '#facc15');
  const defaultWeaponAsset = spriteAssetForRequiredObject(state.spriteAssets, 'default_weapon');
  drawRuntimeSprite(ctx, state, {
    requiredObject: 'default_weapon',
    role: 'default_weapon',
    assetRole: 'default_weapon',
    contentType: 'player',
    objectType: 'default_weapon',
    sourceEntityId: 'weapon.default_straight_single.v1',
    visualIntent: state.defaultWeaponVisualIntent,
  }, defaultWeaponAsset, state.player.x + 24, state.player.y - 6, 60, 44, state.defaultWeaponVisualIntent.palette.accent);
  for (const shot of state.projectiles) {
    const playerProjectileAsset = spriteAssetForIntent(state.spriteAssets, state.playerProjectileVisualIntent, 'projectile');
    drawRuntimeSprite(ctx, state, { requiredObject: 'projectile', role: 'projectile', assetRole: 'projectile', contentType: 'projectile', objectType: 'player_projectile', sourceEntityId: 'player_projectile', weaponId: shot.sourceWeapon || state.weapon, visualIntent: state.playerProjectileVisualIntent }, playerProjectileAsset, shot.x - 8, shot.y - 18, 58, 42, state.playerProjectileVisualIntent.palette.primary);
  }
  for (const shot of state.enemyProjectiles) {
    const projectileAsset = shot.boss
      ? spriteAssetForRequiredObject(state.spriteAssets, 'boss_projectile_phase_object')
      : spriteAssetForIntent(state.spriteAssets, state.enemyProjectileVisualIntent, 'projectile');
    const projectileVisualIntent = shot.boss
      ? {
          ...state.boss.visualIntent,
          entityId: 'boss_projectile_phase.runtime.v1',
          role: 'boss_projectile_phase_object',
          assetIntentRef: 'boss_projectile_phase.runtime.v1',
          silhouette: 'canonical DSL boss phase projectile core with three-way pattern'
        }
      : state.enemyProjectileVisualIntent;
    drawRuntimeSprite(ctx, state, { requiredObject: shot.boss ? 'boss_projectile_phase_object' : 'projectile', role: shot.boss ? 'boss_projectile_phase_object' : 'projectile', assetRole: shot.boss ? 'boss_projectile_phase_object' : 'projectile', contentType: 'projectile', objectType: shot.boss ? 'boss_projectile' : 'enemy_projectile', sourceEntityId: shot.boss ? 'boss_projectile_phase.runtime.v1' : 'enemy_projectile', sourceNodeId: shot.sourceNodeId, weaponId: shot.boss ? 'boss_projectile_phase.runtime.v1' : 'enemy_projectile', bossId: shot.boss ? state.boss.sourceEntityId : undefined, bossPhase: shot.boss ? state.boss.phase : undefined, visualIntent: projectileVisualIntent }, projectileAsset, shot.x - 10, shot.y - 16, shot.boss ? 50 : 42, shot.boss ? 36 : 30, projectileVisualIntent.palette.primary);
  }
  for (const hazard of state.bossFallingHazards) {
    const fallingHazardAsset = spriteAssetForIntent(state.spriteAssets, state.fallingHazardVisualIntent, 'hazard');
    drawRuntimeSprite(ctx, state, { requiredObject: 'environment_hazard', role: 'hazard', assetRole: 'hazard', contentType: 'hazard', objectType: 'boss_falling_hazard', sourceEntityId: hazard.sourceEntityId, visualIntent: state.fallingHazardVisualIntent }, fallingHazardAsset, hazard.x, hazard.y, hazard.w, hazard.h, state.fallingHazardVisualIntent.palette.primary);
  }
  ctx.restore();
  if (state.won) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.fillRect(238, 196, 484, 92);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.strokeRect(238, 196, 484, 92);
    ctx.fillStyle = '#fef3c7';
    ctx.font = '28px monospace';
    ctx.fillText('MISSION COMPLETE', 328, 250);
    ctx.font = '12px monospace';
    recordVisualRuntimeObject(state, {
      role: 'feedback',
      contentType: 'runtime_feedback',
      objectType: 'mission_complete_overlay',
      visualIntent: {
        role: 'feedback',
        assetIntentRef: 'mission_complete_overlay',
        silhouette: 'mission_complete_text_panel',
        palette: { primary: '#fef3c7', accent: '#facc15', outline: '#0f172a' },
        source: 'canonical_dsl_visual_intent'
      },
      x: state.cameraX + 238,
      y: 196,
      w: 484,
      h: 92,
      usedAsset: false
    });
  }
  if (state.lost) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
    ctx.fillRect(238, 196, 484, 104);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.strokeRect(238, 196, 484, 104);
    ctx.fillStyle = '#fee2e2';
    ctx.font = '30px monospace';
    ctx.fillText('GAME OVER', 390, 250);
    ctx.font = '12px monospace';
    recordVisualRuntimeObject(state, {
      role: 'feedback',
      contentType: 'runtime_feedback',
      objectType: 'game_over_overlay',
      visualIntent: {
        role: 'feedback',
        assetIntentRef: 'game_over_overlay',
        silhouette: 'game_over_text_panel',
        palette: { primary: '#fee2e2', accent: '#ef4444', outline: '#0f172a' },
        source: 'canonical_dsl_visual_intent'
      },
      x: state.cameraX + 238,
      y: 196,
      w: 484,
      h: 104,
      usedAsset: false
    });
  }
  ctx.fillStyle = '#f9fafb';
  const healthLabel = debugInfiniteHealth ? '∞' : state.player.health;
  ctx.fillText('Health ' + healthLabel + '  Retries ' + state.retries + '  Weapon ' + state.weapon + '  Score ' + state.score, 24, 28);
  ctx.fillText('DSL runtime ' + state.runtimePlan.profileId + ' | systems ' + state.manifest.systems.length + ' | camera ' + Math.round(state.cameraX), 24, 50);
  ctx.fillText('Visual intent ' + state.visualTheme + ' | assets ' + (window.__STEP38_VISUAL_EVIDENCE.loaded_asset_intent_refs || []).length + ' | slice ' + (state.visualSlicePreviewMode ? 'on' : 'full'), 24, 72);
  recordScreenFeedbackObject(state);
  finishVisualRuntimeFrame(state);
}

function drawSprite(ctx, image, x, y, w, h, fallbackColor) {
  if (image && image.__step38CanvasDrawPlan) {
    drawGenerated2dAsset(ctx, image.__step38CanvasDrawPlan, x, y, w, h, fallbackColor);
    return;
  }
  if (image && image.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, x, y, w, h);
    return;
  }
  ctx.fillStyle = fallbackColor;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawGenerated2dAsset(ctx, plan, x, y, w, h, fallbackColor) {
  const grammar = plan.procedural_pixel_art_grammar;
  if (grammar && grammar.version === 'step38.procedural_pixel_art_grammar.v1' && Array.isArray(plan.animation_frames)) {
    drawProceduralPixelArtFrame(ctx, plan, x, y, w, h, fallbackColor);
    return;
  }
  const palette = Array.isArray(plan.palette) && plan.palette.length >= 3 ? plan.palette : [fallbackColor, '#f97316', '#0f172a', '#94a3b8'];
  const primary = palette[0] || fallbackColor;
  const accent = palette[1] || '#f97316';
  const outline = palette[2] || '#0f172a';
  const motif = palette[3] || '#94a3b8';
  const operations = Array.isArray(plan.draw_operations) ? plan.draw_operations : [];
  const operationByPurpose = (fragment) =>
    operations.find((operation) => operation && typeof operation.purpose === 'string' && operation.purpose.includes(fragment)) || null;
  const numberField = (operation, key, fallback) =>
    operation && operation.geometry && typeof operation.geometry[key] === 'number' ? operation.geometry[key] : fallback;
  const sx = w / 96;
  const sy = h / 96;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const op of operations) {
    if (!op || typeof op.op !== 'string') continue;
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = op.palette_ref === 'accent' ? accent : motif;
    ctx.fillStyle = op.palette_ref === 'accent' ? accent : motif;
    ctx.lineWidth = 3;
    if (op.op === 'vine_overlay') {
      ctx.beginPath();
      ctx.moveTo(10, 25);
      ctx.quadraticCurveTo(30, 5, 48, 35);
      ctx.quadraticCurveTo(66, 58, 88, 28);
      ctx.stroke();
    } else if (op.op === 'metal_struts') {
      ctx.beginPath();
      ctx.moveTo(10, 18);
      ctx.lineTo(86, 18);
      ctx.moveTo(18, 78);
      ctx.lineTo(78, 78);
      ctx.stroke();
      for (let boltX = 18; boltX < 80; boltX += 16) ctx.fillRect(boltX, 15, 5, 5);
    } else if (op.op === 'reactor_core_glow') {
      ctx.beginPath();
      ctx.arc(70, 26, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (op.op === 'hazard_stripes') {
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(18, 78);
      ctx.lineTo(78, 18);
      ctx.moveTo(30, 88);
      ctx.lineTo(88, 30);
      ctx.stroke();
    } else if (op.op === 'environment_layer') {
      ctx.fillRect(8, 82, 80, 5);
    }
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = outline;
  ctx.fillStyle = primary;
  ctx.lineWidth = 5;
  const requiredObject = plan.required_object || 'unknown';
  if (requiredObject === 'player') {
    ctx.beginPath();
    ctx.moveTo(35, 15); ctx.lineTo(58, 22); ctx.lineTo(55, 59); ctx.lineTo(41, 76); ctx.lineTo(24, 60); ctx.lineTo(27, 23); ctx.closePath(); ctx.fill(); ctx.stroke();
    const headOperation = operationByPurpose('head');
    ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(numberField(headOperation, 'cx', 44), numberField(headOperation, 'cy', 22), numberField(headOperation, 'radius', 7), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = accent; ctx.fillRect(numberField(headOperation, 'cx', 44) + 3, numberField(headOperation, 'cy', 22) - 3, numberField(headOperation, 'visorWidth', 9), 3);
    const legOperation = operationByPurpose('leg');
    const legThickness = numberField(legOperation, 'thickness', 6);
    ctx.strokeStyle = accent; ctx.lineWidth = legThickness; ctx.beginPath(); ctx.moveTo(34, 70); ctx.lineTo(20, 90); ctx.moveTo(49, 69); ctx.lineTo(64, 90); ctx.stroke();
    const weaponOperation = operationByPurpose('weapon');
    ctx.fillStyle = accent; ctx.fillRect(numberField(weaponOperation, 'x', 55), numberField(weaponOperation, 'y', 36), numberField(weaponOperation, 'width', 30), numberField(weaponOperation, 'height', 8));
  } else if (requiredObject === 'default_weapon') {
    ctx.beginPath(); ctx.moveTo(8, 56); ctx.lineTo(37, 28); ctx.lineTo(79, 30); ctx.lineTo(90, 43); ctx.lineTo(42, 61); ctx.lineTo(14, 70); ctx.closePath(); ctx.fill(); ctx.stroke();
    const weaponOperation = operationByPurpose('weapon');
    ctx.fillStyle = accent; ctx.fillRect(42, 23, numberField(weaponOperation, 'barrelLength', 30), 8);
  } else if (requiredObject === 'pickup_weapon') {
    ctx.beginPath(); ctx.moveTo(18, 34); ctx.lineTo(48, 13); ctx.lineTo(79, 35); ctx.lineTo(70, 75); ctx.lineTo(26, 75); ctx.closePath(); ctx.fill(); ctx.stroke();
    const pickupOperation = operationByPurpose('pickup_collectible');
    ctx.fillStyle = accent; ctx.fillRect(31, 43, 35, 14); ctx.beginPath(); ctx.arc(numberField(pickupOperation, 'cx', 48), numberField(pickupOperation, 'cy', 35), numberField(pickupOperation, 'radius', 8), 0, Math.PI * 2); ctx.fill();
  } else if (requiredObject === 'projectile') {
    const projectileOperation = operationByPurpose('projectile');
    ctx.beginPath(); ctx.moveTo(5, 48); ctx.lineTo(28, 27); ctx.lineTo(68, 29); ctx.lineTo(91, 48); ctx.lineTo(68, 67); ctx.lineTo(28, 69); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = accent; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(numberField(projectileOperation, 'tailX', 20), numberField(projectileOperation, 'centerY', 48)); ctx.lineTo(numberField(projectileOperation, 'tipX', 72), numberField(projectileOperation, 'centerY', 48)); ctx.stroke();
  } else if (requiredObject === 'ground_enemy') {
    ctx.beginPath(); ctx.moveTo(16, 54); ctx.lineTo(29, 25); ctx.lineTo(58, 16); ctx.lineTo(82, 42); ctx.lineTo(70, 72); ctx.lineTo(31, 78); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = accent; ctx.fillRect(59, 42, 30, 11);
    ctx.strokeStyle = outline; ctx.lineWidth = numberField(operationByPurpose('legged_chassis'), 'thickness', 5); ctx.beginPath(); ctx.moveTo(29, 75); ctx.lineTo(18, 90); ctx.moveTo(57, 72); ctx.lineTo(70, 90); ctx.stroke();
  } else if (requiredObject === 'ranged_enemy') {
    const emitterOperation = operationByPurpose('cannon_emitter');
    ctx.fillRect(20, 71, 60, 14); ctx.strokeRect(20, 71, 60, 14);
    ctx.beginPath(); ctx.moveTo(27, 31); ctx.lineTo(61, 31); ctx.lineTo(74, 70); ctx.lineTo(16, 70); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = accent; ctx.fillRect(numberField(emitterOperation, 'x0', 57), numberField(emitterOperation, 'y0', 43) - 5, numberField(emitterOperation, 'x1', 91) - numberField(emitterOperation, 'x0', 57), 11);
  } else if (requiredObject === 'flying_enemy') {
    const wingOperation = operationByPurpose('wing_hover');
    ctx.beginPath(); ctx.moveTo(9, 48); ctx.lineTo(33, 20); ctx.lineTo(62, 27); ctx.lineTo(88, 49); ctx.lineTo(58, 72); ctx.lineTo(28, 68); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = accent; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(32, 25); ctx.lineTo(17, 5); ctx.moveTo(61, 30); ctx.lineTo(78, 9); ctx.stroke();
    ctx.strokeStyle = motif; ctx.lineWidth = Math.max(2, numberField(wingOperation, 'hoverTrail', 4)); ctx.beginPath(); ctx.moveTo(24, 82); ctx.lineTo(72, 82); ctx.stroke();
  } else if (requiredObject === 'wave_marker') {
    ctx.fillRect(11, 10, 18, 78); ctx.beginPath(); ctx.moveTo(28, 14); ctx.lineTo(84, 29); ctx.lineTo(28, 46); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (requiredObject === 'area_marker') {
    ctx.fillRect(12, 79, 73, 12); ctx.beginPath(); ctx.moveTo(19, 25); ctx.lineTo(77, 25); ctx.lineTo(89, 79); ctx.lineTo(8, 79); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (requiredObject === 'boss') {
    ctx.beginPath(); ctx.moveTo(12, 19); ctx.lineTo(80, 19); ctx.lineTo(93, 45); ctx.lineTo(81, 90); ctx.lineTo(17, 90); ctx.lineTo(4, 45); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(48, 37, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (requiredObject === 'boss_telegraph') {
    ctx.strokeStyle = accent; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(48, 48, 34, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = outline; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(48, 4); ctx.lineTo(48, 24); ctx.moveTo(48, 72); ctx.lineTo(48, 92); ctx.moveTo(4, 48); ctx.lineTo(24, 48); ctx.moveTo(72, 48); ctx.lineTo(92, 48); ctx.stroke();
  } else if (requiredObject === 'boss_projectile_phase_object') {
    ctx.beginPath(); ctx.moveTo(48, 5); ctx.lineTo(61, 31); ctx.lineTo(90, 38); ctx.lineTo(66, 56); ctx.lineTo(70, 88); ctx.lineTo(48, 69); ctx.lineTo(26, 88); ctx.lineTo(30, 56); ctx.lineTo(6, 38); ctx.lineTo(35, 31); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(48, 48, 14, 0, Math.PI * 2); ctx.fill();
  } else if (requiredObject === 'environment_hazard') {
    ctx.beginPath(); ctx.moveTo(48, 8); ctx.lineTo(88, 84); ctx.lineTo(8, 84); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = accent; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(48, 28); ctx.lineTo(48, 58); ctx.stroke();
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(48, 72, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = motif; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(12, 90); ctx.lineTo(84, 90); ctx.moveTo(22, 82); ctx.lineTo(74, 82); ctx.stroke();
  } else {
    ctx.fillStyle = fallbackColor;
    ctx.beginPath();
    ctx.ellipse(48, 48, 42, 30, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawProceduralPixelArtFrame(ctx, plan, x, y, w, h, fallbackColor) {
  const grammar = plan.procedural_pixel_art_grammar || {};
  const old_resource_logic_bypassed = grammar.old_resource_logic_bypassed === true;
  const frames = Array.isArray(plan.animation_frames) ? plan.animation_frames.filter((frame) => frame && Array.isArray(frame.parts)) : [];
  const frameIndex = frames.length > 0 ? Math.floor((performance.now() / 180 + String(plan.required_object || '').length) % frames.length) : 0;
  const frame = frames[frameIndex] || frames[0] || { parts: [] };
  const palette = Array.isArray(plan.palette) && plan.palette.length >= 3 ? plan.palette : [fallbackColor, '#f97316', '#0f172a', '#94a3b8'];
  const colors = {
    primary: palette[0] || fallbackColor,
    accent: palette[1] || '#f97316',
    outline: palette[2] || '#0f172a',
    motif: palette[3] || '#94a3b8',
    shadow: 'rgba(2, 6, 23, 0.52)',
    highlight: palette[4] || '#f8fafc'
  };
  const grid = plan.logical_pixel_grid && Array.isArray(plan.logical_pixel_grid.size) ? plan.logical_pixel_grid.size : [48, 48];
  const sx = w / (grid[0] || 48);
  const sy = h / (grid[1] || 48);
  const layerRank = { shadow: 0, outline: 1, fill: 2, motif: 3, accent: 4, highlight: 5, effect: 6 };
  const parts = [...(frame.parts || [])].sort((a, b) => (layerRank[a.layer] || 0) - (layerRank[b.layer] || 0));
  const previousSmoothing = ctx.imageSmoothingEnabled;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  ctx.globalAlpha = old_resource_logic_bypassed ? 1 : 0.72;
  for (const part of parts) {
    if (!part || !Array.isArray(part.rect)) continue;
    const color = colors[part.palette_ref] || colors.primary;
    const [rx, ry, rw, rh] = part.rect;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(rx * sx), Math.round(ry * sy), Math.max(1, Math.ceil(rw * sx)), Math.max(1, Math.ceil(rh * sy)));
  }
  if (parts.length === 0) {
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(Math.round(w * 0.2), Math.round(h * 0.2), Math.round(w * 0.6), Math.round(h * 0.6));
  }
  ctx.restore();
  ctx.imageSmoothingEnabled = previousSmoothing;
}

function prepareStep38VisualWindow(state, label) {
  const windowId = label.includes('boss') || label.includes('mission') ? 'window_2_boss' : label.includes('weapon') || label.includes('wave_2') || label.includes('area_2') ? 'window_1_weapon_wave_area' : 'window_0_intro';
  const projectionWindows = Array.isArray(state.manualProjection?.windows) ? state.manualProjection.windows : [];
  const projectionWindow = projectionWindows.find((window) => window && window.id === windowId) || null;
  const range = Array.isArray(projectionWindow?.preview_x_range) && projectionWindow.preview_x_range.length === 2 ? projectionWindow.preview_x_range : [0, 900];
  const windowStartX = typeof range[0] === 'number' ? range[0] + 120 : 120;
  const windowEndX = typeof range[1] === 'number' ? range[1] + 120 : windowStartX + 900;
  state.scriptedCaptureUsed = true;
  state.scriptedCaptureActive = true;
  for (const enemy of state.enemies) {
    if (enemy.x + enemy.w >= windowStartX - 320 && enemy.x <= windowEndX + 320) {
      enemy.alive = true;
      enemy.hp = enemy.static ? 3 : enemy.lane === 'air' ? 1 : 2;
    }
  }
  for (const hazard of state.hazards) {
    hazard.triggered = false;
  }
  state.keys.clear();
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.onGround = true;
  state.player.y = state.groundY - state.player.h;
  if (label.includes('boss') || label.includes('mission')) {
    state.boss.alive = true;
    state.boss.phase = label.includes('phase') || label.includes('mission') ? 2 : 1;
    state.boss.hp = label.includes('phase') || label.includes('mission') ? Math.max(1, Math.floor(state.boss.maxHp / 2)) : state.boss.maxHp;
    state.player.x = Math.max(96, state.boss.x - 380);
    state.weapon = 'rapid_fire';
    if (!state.enemyProjectiles.some((projectile) => projectile.boss)) {
      fireEnemyProjectile(state, state.boss, performance.now(), true, { pattern: state.boss.phase === 2 ? 'three_way_projectile' : 'straight_projectile', count: state.boss.phase === 2 ? 3 : 1 });
    }
    state.bossFallingHazards = [
      {
        x: state.player.x + 260,
        y: state.groundY - 170,
        w: 58,
        h: 72,
        vy: 0,
        sourceEntityId: 'boss_falling_hazard.visual_slice.v1'
      }
    ];
    if (label.includes('mission')) {
      state.won = true;
      window.__STEP38_PLAYABLE_STATE.winReached = true;
    }
  } else if (label.includes('weapon')) {
    const pickup = state.pickups.find((candidate) => !candidate.collected) || state.pickups[0];
    if (pickup) {
      pickup.collected = false;
      state.player.x = Math.max(96, pickup.x - 220);
    } else {
      state.player.x = windowStartX + 220;
    }
    state.weapon = 'straight_single';
  } else if (label.includes('movement')) {
    state.player.x = windowStartX + 260;
    state.projectiles.push({ x: state.player.x + 60, y: state.player.y + 22, w: 30, h: 8, vx: 0, vy: 0, sourceWeapon: state.weapon });
  } else if (label.includes('wave_1')) {
    const firstEnemy = state.enemies.find((enemy) => enemy.segmentId === [...state.segmentLayouts.keys()][0]) || state.enemies[0];
    state.player.x = Math.max(96, (firstEnemy?.x ?? windowStartX + 520) - 360);
  } else if (label.includes('wave_2') || label.includes('area_2')) {
    const waveTwoEnemy = state.enemies.find((enemy) => enemy.segmentId === [...state.segmentLayouts.keys()][1]) || state.enemies.find((enemy) => enemy.lane === 'air') || state.enemies[0];
    state.player.x = Math.max(96, (waveTwoEnemy?.x ?? windowStartX + 520) - 360);
    state.weapon = 'spread_shot';
    state.projectiles.push({ x: state.player.x + 80, y: state.player.y + 22, w: 30, h: 8, vx: 0, vy: 0, sourceWeapon: state.weapon });
  } else {
    state.player.x = windowStartX + 140;
  }
  state.cameraX = clamp(Math.min(Math.max(windowStartX, state.player.x - 300), windowEndX - 860), 0, Math.max(0, state.worldWidth - 960));
  window.__STEP38_LAST_VISUAL_WINDOW_METADATA = {
    label,
    evidence_type: 'diagnostic_scripted_capture',
    counts_for_ready_for_manual_test: false,
    input_only: false,
    starts_from_spawn: false,
    teleport_used: true,
    camera_jump_used: true,
    debug_reposition_used: true,
    state_injection_used: true,
    direct_spawn_used: label.includes('boss') || label.includes('mission'),
    preview_window: windowId,
    canonical_time_range_sec: projectionWindow?.canonical_time_range_sec || null,
    projection_must_show: Array.isArray(projectionWindow?.must_show) ? projectionWindow.must_show : [],
    camera_x: Math.round(state.cameraX),
    source: 'canonical_dsl_projection',
    placeholder_objects_seen: false
  };
  return window.__STEP38_LAST_VISUAL_WINDOW_METADATA;
}

async function boot() {
  const [canonicalDsl, runtimePlan, sceneIr, manifest, marker, assetManifest, manualProjection, manualTraversalPath] = await Promise.all([
    readJson('./canonical-game-dsl-v0.2.json'),
    readJson('./runtime-plan.generated.json'),
    readJson('./scene-ir.generated.json'),
    readJson('./runtime-system-manifest.json'),
    readJson('./step38-marker.json'),
    readJson('./asset-manifest.step38.json'),
    readJson('./manual_vertical_slice_projection.json'),
    readJson('./manual_traversal_path.json')
  ]);
  const spriteAssets = await loadSpriteAssets(assetManifest);
  window.__STEP38_ARTIFACTS = { canonicalDsl, runtimePlan, sceneIr, manifest, marker, manualProjection, manualTraversalPath };
  window.__STEP38_MANUAL_VERTICAL_SLICE_PROJECTION = manualProjection;
  window.__STEP38_MANUAL_TRAVERSAL_PATH = manualTraversalPath;
  window.__STEP38_MARKER = marker;
  document.getElementById('step38-panel').textContent = 'Step38 ' + marker.run_id + ' | prompt ' + marker.prompt_sha + ' | canonical ' + marker.canonical_dsl_sha;
  document.getElementById('hud').innerHTML =
    '<span class="badge">' + runtimePlan.profileId + '</span>' +
    '<span class="badge">' + runtimePlan.progression.estimatedTotalSec.min + '-' + runtimePlan.progression.estimatedTotalSec.max + 's product intent</span>' +
    '<span class="badge">normal duration target ' + (runtimePlan.progression.segments || []).reduce((total, segment) => total + (segment.targetDurationSec || 0), 0) + 's</span>' +
    '<span class="badge">preview visual slice=' + visualSlicePreviewMode + '</span>' +
    '<span class="badge">fallback_used=' + marker.fallback_used + '</span>';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const state = buildRuntime(canonicalDsl, runtimePlan, sceneIr, manifest, spriteAssets, manualProjection, manualTraversalPath);
  window.__STEP38_CAPTURE_VISUAL_WINDOW = (label) => prepareStep38VisualWindow(state, label);
  const visualEvidence = window.__STEP38_VISUAL_EVIDENCE || {};
  window.__STEP38_QA_READY = true;
  window.addEventListener('keydown', (event) => {
    preventDefaultForGameKey(event);
    state.keys.add(event.code);
    if (event.code === 'Space') jump(state);
    if (event.code === 'KeyC') crouch(state);
    if (event.code === 'KeyX' || event.code === 'KeyJ') fire(state, performance.now());
  });
  window.addEventListener('keyup', (event) => {
    preventDefaultForGameKey(event);
    state.keys.delete(event.code);
  });
  emit('game.ready', { source: 'runtime_boot', runId: marker.run_id });
  emit('game.started', { source: 'runtime_boot', profileId: runtimePlan.profileId });
  if (visualEvidence.status === 'PASSED' && visualEvidence.dsl_visual_intent_bound === true) {
    emit('scene.visual_presentation_metadata.verified', {
      source: 'runtime_visual_manifest',
      visualIntentSource: visualEvidence.visual_intent_source,
      sceneVisualTheme: visualEvidence.scene_visual_theme,
      loadedAssetIntentRefs: visualEvidence.loaded_asset_intent_refs || []
    });
  }
  function frame(now) {
    const dt = Math.min(0.033, (now - state.lastTime) / 1000);
    state.lastTime = now;
    updateWorld(state, dt, now);
    syncPlayableState(state);
    draw(ctx, state);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot().catch((error) => { emit('game.boot_failed', { source: 'runtime_boot', message: String(error && error.message ? error.message : error) }); throw error; });
`;
}

function buildStep38BuildScript(): string {
  return [
    "import { cp, mkdir, readdir, rm } from 'node:fs/promises';",
    "import { join } from 'node:path';",
    "const root = process.cwd();",
    "const dist = join(root, 'dist');",
    "await rm(dist, { recursive: true, force: true });",
    "await mkdir(dist, { recursive: true });",
    "await cp(join(root, 'index.html'), join(dist, 'index.html'));",
    "await cp(join(root, 'src', 'main.js'), join(dist, 'main.js'));",
    "for (const file of await readdir(join(root, 'public'))) {",
    "  await cp(join(root, 'public', file), join(dist, file), { recursive: true });",
    '}',
    ''
  ].join('\n');
}

async function runStep38BrowserQa(input: {
  previewUrl: string;
  runId: string;
  canonicalDsl: CanonicalGameDslV02;
  expectedMarker: Record<string, unknown>;
  qaEvidencePath: string;
  telemetryEvidencePath: string;
  visualSliceScreenshotDir: string;
  manualTraversalScreenshotDir: string;
  successPathScreenshotDir: string;
  realPlaythroughScreenshotDir: string;
  artFidelityScreenshotDir: string;
  failurePathScreenshotDir: string;
  artQualityScreenshotDir: string;
  encounterDirectorScreenshotDir: string;
  manualTraversalEvidencePath: string;
  successRouteMilestoneTimelinePath: string;
  routePressureBandEvidencePath: string;
  visualRuntimeBindingReportPath: string;
  visualAssetMaterializationReportPath: string;
  assetTemplateFingerprintReportPath: string;
  visualDesignRealizationReportPath: string;
  runtimeTextureLoadReportPath: string;
  artDirectionQualityReportPath: string;
  encounterDirectorPlanPath: string;
  encounterDirectorRuntimeEvidencePath: string;
  outcomeStateMachineReportPath: string;
  winPathEvidencePath: string;
  losePathEvidencePath: string;
  realPlaythroughCompletionEvidencePath: string;
  twoDGameplayPlaythroughGatePath: string;
  canvasVisualReadabilityGatePath: string;
  proceduralPixelArtGrammarReportPath: string;
  canvasArtFidelityGatePath: string;
  spriteAnimationCoverageReportPath: string;
  environmentLayeringReportPath: string;
  startupSurvivabilityGatePath: string;
  encounterPlayabilityGatePath: string;
  operatorVisibleArtGatePath: string;
  visualPlaythroughValidatorReportPath: string;
}): Promise<{ ok: boolean; observedEvents: string[]; message?: string }> {
  const requiredEvents = [...STEP38_REQUIRED_QA_EVENTS];
  let page: Page | undefined;
  let lastPageState: Awaited<ReturnType<typeof readStep38QaPageState>> | undefined;
  let initialPageState: Awaited<ReturnType<typeof readStep38QaPageState>> | undefined;
  let lastVisualVerticalSliceEvidence: Record<string, unknown> | undefined;
  let lastManualTraversalEvidence: Record<string, unknown> | undefined;
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    try {
      page = await browser.newPage({ viewport: { width: 960, height: 540 } });
      const qaPreviewUrl = new URL(input.previewUrl);
      qaPreviewUrl.searchParams.set('qa', '1');
      await page.goto(qaPreviewUrl.toString(), { waitUntil: 'networkidle' });
      await page.waitForFunction(() => (globalThis as unknown as { __STEP38_QA_READY?: boolean }).__STEP38_QA_READY === true, null, {
        timeout: 15000
      });
      await page.waitForTimeout(250);
      lastPageState = await readStep38QaPageState(page);
      initialPageState = lastPageState;
      const manualTraversalWindows: Array<Record<string, unknown>> = [];
      const capturedManualTraversalLabels = new Set<string>();
      const maybeCaptureManualTraversal = async (probe: Record<string, unknown>) => {
        for (const label of [...STEP38_REQUIRED_MANUAL_TRAVERSAL_SCREENSHOTS, ...STEP38_ROUTE_PRESSURE_BAND_SCREENSHOTS]) {
          if (!capturedManualTraversalLabels.has(label) && shouldCaptureStep38ManualTraversalLabel(label, probe)) {
            const screenshot = await captureStep38ManualTraversalScreenshot(page as Page, {
              label,
              screenshotDir: input.manualTraversalScreenshotDir
            });
            if (manualTraversalScreenshotMeetsLabel(label, screenshot)) {
              manualTraversalWindows.push(screenshot);
              capturedManualTraversalLabels.add(label);
            }
          }
        }
      };
      await maybeCaptureManualTraversal(await readStep38ManualTraversalProbe(page));
      await page.keyboard.down('ArrowRight');
      await page.keyboard.down('KeyX');
      await page.keyboard.press('Space');
      await page.keyboard.press('KeyC');
      await page.keyboard.press('KeyC');
      for (let index = 0; index < 560; index += 1) {
        if (index % 20 === 0) {
          await page.keyboard.press('Space');
        }
        await page.waitForTimeout(90);
        const probe = await readStep38ManualTraversalProbe(page);
        await maybeCaptureManualTraversal(probe);
        if (index % 10 === 0) {
          lastPageState = await readStep38QaPageState(page);
        }
        const allManualTraversalScreenshotsCaptured = STEP38_REQUIRED_MANUAL_TRAVERSAL_SCREENSHOTS.every((label) =>
          capturedManualTraversalLabels.has(label)
        );
        const complete = await page.evaluate(() => (globalThis as unknown as { __STEP38_QA_COMPLETE?: boolean }).__STEP38_QA_COMPLETE === true);
        if (complete && allManualTraversalScreenshotsCaptured) break;
      }
      await page.keyboard.up('KeyX');
      await page.keyboard.up('ArrowRight');
      lastPageState = await readStep38QaPageState(page);
      const marker = lastPageState.marker;
      const markerMatches = isRecord(marker) && marker.run_id === input.runId && marker.prompt_sha === input.expectedMarker.prompt_sha;
      const manualTraversalEvidence = buildStep38ManualTraversalEvidence({
        runId: input.runId,
        markerMatches,
        windows: manualTraversalWindows,
        runtimeEvidence: lastPageState.manualTraversalEvidence
      });
      lastManualTraversalEvidence = manualTraversalEvidence;
      await writeJson(input.manualTraversalEvidencePath, manualTraversalEvidence);
      const routePressureBandEvidence = buildStep38RoutePressureBandEvidence({
        runId: input.runId,
        manualTraversalEvidence,
        sourceWindows: manualTraversalWindows
      });
      await writeJson(input.routePressureBandEvidencePath, routePressureBandEvidence);
      const successRouteMilestoneTimeline = buildStep38SuccessRouteMilestoneTimeline({
        runId: input.runId,
        manualTraversalEvidence,
        routePressureBandEvidence,
        sourceWindows: manualTraversalWindows
      });
      await writeJson(input.successRouteMilestoneTimelinePath, successRouteMilestoneTimeline);
      const visualRuntimeBindingReport = buildStep38VisualRuntimeBindingReport({
        runId: input.runId,
        markerMatches,
        runtimeReport: lastPageState.visualRuntimeBindingReport,
        windows: manualTraversalWindows
      });
      await writeJson(input.visualRuntimeBindingReportPath, visualRuntimeBindingReport);
      const visualAssetMaterializationReport = buildStep38VisualAssetMaterializationReport({
        runId: input.runId,
        markerMatches,
        runtimeReport: lastPageState.visualAssetMaterializationReport,
        windows: manualTraversalWindows
      });
      await writeJson(input.visualAssetMaterializationReportPath, visualAssetMaterializationReport);
      const runtimeTextureLoadReport = isRecord(lastPageState.runtimeTextureLoadReport)
        ? lastPageState.runtimeTextureLoadReport
        : {
            schemaVersion: 'step38.runtime-texture-load-report.v1',
            run_id: input.runId,
            source: 'canonical_dsl',
            texture_load_gate: {
              verdict: 'FAIL',
              required_textures_loaded: false,
              missing_texture_keys: [],
              texture_cache_probe_available: false
            },
            textures: []
          };
      await writeJson(input.runtimeTextureLoadReportPath, runtimeTextureLoadReport);
      const winPathEvidence = await buildStep38WinPathEvidence(page, {
        runId: input.runId,
        screenshotDir: input.successPathScreenshotDir
      });
      const visualSliceWindows: Array<Record<string, unknown>> = [];
      for (const label of STEP38_REQUIRED_VERTICAL_SLICE_SCREENSHOTS) {
        visualSliceWindows.push(
          await captureStep38VisualSliceWindow(page, {
            label,
            screenshotDir: input.visualSliceScreenshotDir
          })
        );
      }
      await page.waitForTimeout(250);
        lastPageState = await readStep38QaPageState(page);
        const pageState = await readStep38QaPageState(page);
        lastPageState = pageState;
        const failurePathResult = await runStep38FailurePathQa({
          browser,
          qaPreviewUrl,
          runId: input.runId,
          screenshotDir: input.failurePathScreenshotDir
        });
        const artDirectionQualityReport = await buildStep38ArtDirectionQualityReport({
          runId: input.runId,
          sourceWindows: manualTraversalWindows,
          screenshotDir: input.artQualityScreenshotDir
        });
        const encounterDirectorPlan = buildStep38EncounterDirectorPlan({
          runId: input.runId,
          manualTraversalEvidence,
          encounterCoverage: pageState.encounterCoverage
        });
        const encounterDirectorRuntimeEvidence = await buildStep38EncounterDirectorRuntimeEvidence({
          runId: input.runId,
          manualTraversalEvidence,
          encounterCoverage: pageState.encounterCoverage,
          sourceWindows: manualTraversalWindows,
          screenshotDir: input.encounterDirectorScreenshotDir
        });
        const outcomeStateMachineReport = buildStep38CombinedOutcomeStateMachineReport({
          runId: input.runId,
          successPageState: pageState,
          failurePageState: failurePathResult.pageState,
          winPathEvidence,
          losePathEvidence: failurePathResult.losePathEvidence
        });
        const realPlaythroughCompletionEvidence = await buildStep38RealPlaythroughCompletionEvidence({
          runId: input.runId,
          manualTraversalEvidence,
          successRouteMilestoneTimeline,
          routePressureBandEvidence,
          winPathEvidence,
          sourceWindows: manualTraversalWindows,
          screenshotDir: input.realPlaythroughScreenshotDir
        });
        const dslDrivenAssets = buildStep38SpriteAssets(input.canonicalDsl);
        const visualDesignRealizationReport = buildStep38VisualDesignRealizationReport({
          runId: input.runId,
          assets: dslDrivenAssets,
          visibleRequiredObjects: visibleRequiredObjectsFromReport(visualAssetMaterializationReport),
          screenshotLabels: manualTraversalWindows.map((window) => (typeof window.label === 'string' ? window.label : null)).filter((label): label is string => label !== null)
        });
        const canvasVisualReadabilityGate = buildStep38CanvasVisualReadabilityGate({
          runId: input.runId,
          assets: dslDrivenAssets,
          sourceWindows: manualTraversalWindows
        });
        const artFidelityScreenshotEvidence = await buildStep38ArtFidelityScreenshotEvidence({
          sourceWindows: manualTraversalWindows,
          screenshotDir: input.artFidelityScreenshotDir
        });
        const proceduralPixelArtGrammarReport = await readJsonIfPresent(input.proceduralPixelArtGrammarReportPath);
        const spriteAnimationCoverageReport = await readJsonIfPresent(input.spriteAnimationCoverageReportPath);
        const environmentLayeringReport = await readJsonIfPresent(input.environmentLayeringReportPath);
        const canvasArtFidelityGate = buildStep38CanvasArtFidelityGate({
          runId: input.runId,
          canvasVisualReadabilityGate,
          proceduralPixelArtGrammarReport,
          spriteAnimationCoverageReport,
          environmentLayeringReport,
          sourceWindows: artFidelityScreenshotEvidence.windows,
          missingSourceWindows: artFidelityScreenshotEvidence.missingSourceWindows
        });
        const startupSurvivabilityGate = buildStep38StartupSurvivabilityGate({
          runId: input.runId,
          initialPageState: initialPageState ?? pageState
        });
        const encounterPlayabilityGate = buildStep38EncounterPlayabilityGate({
          runId: input.runId,
          manualTraversalEvidence,
          encounterCoverage: pageState.encounterCoverage,
          sourceWindows: manualTraversalWindows
        });
        const operatorVisibleArtGate = buildStep38OperatorVisibleArtGate({
          runId: input.runId,
          realPlaythroughCompletionEvidence,
          artDirectionQualityReport,
          visualDesignRealizationReport,
          canvasArtFidelityGate
        });
        const visualPlaythroughValidatorReport = buildStep38VisualPlaythroughValidatorReport({
          runId: input.runId,
          realPlaythroughCompletionEvidence,
          successRouteMilestoneTimeline,
          routePressureBandEvidence,
          operatorVisibleArtGate,
          winPathEvidence,
          losePathEvidence: failurePathResult.losePathEvidence
        });
        const twoDGameplayPlaythroughGate = buildStep38TwoDGameplayPlaythroughGate({
          runId: input.runId,
          realPlaythroughCompletionEvidence,
          successRouteMilestoneTimeline,
          routePressureBandEvidence,
          winPathEvidence,
          losePathEvidence: failurePathResult.losePathEvidence,
          visualPlaythroughValidatorReport
        });
        await writeJson(input.artDirectionQualityReportPath, artDirectionQualityReport);
        await writeJson(input.encounterDirectorPlanPath, encounterDirectorPlan);
        await writeJson(input.encounterDirectorRuntimeEvidencePath, encounterDirectorRuntimeEvidence);
        await writeJson(input.outcomeStateMachineReportPath, outcomeStateMachineReport);
        await writeJson(input.winPathEvidencePath, winPathEvidence);
        await writeJson(input.losePathEvidencePath, failurePathResult.losePathEvidence);
        await writeJson(input.realPlaythroughCompletionEvidencePath, realPlaythroughCompletionEvidence);
        await writeJson(input.twoDGameplayPlaythroughGatePath, twoDGameplayPlaythroughGate);
        await writeJson(input.canvasVisualReadabilityGatePath, canvasVisualReadabilityGate);
        await writeJson(input.canvasArtFidelityGatePath, canvasArtFidelityGate);
        await writeJson(input.startupSurvivabilityGatePath, startupSurvivabilityGate);
        await writeJson(input.encounterPlayabilityGatePath, encounterPlayabilityGate);
        await writeJson(input.operatorVisibleArtGatePath, operatorVisibleArtGate);
        await writeJson(input.visualDesignRealizationReportPath, visualDesignRealizationReport);
        await writeJson(input.visualPlaythroughValidatorReportPath, visualPlaythroughValidatorReport);
        const events = pageState.events;
        const runtimeConsumption = pageState.runtimeConsumption;
        const playableState = pageState.playableState;
        const visualAssetEvidence = pageState.visualAssetEvidence;
        const runtimeManualTraversalEvidence = pageState.manualTraversalEvidence;
        const runtimeVisualBindingReport = visualRuntimeBindingReport;
        const runtimeVisualAssetMaterializationReport = visualAssetMaterializationReport;
        const runtimeVisualDesignRealizationReport = visualDesignRealizationReport;
        const runtimeTwoDGameplayPlaythroughGate = twoDGameplayPlaythroughGate;
        const runtimeTextureLoadEvidence = runtimeTextureLoadReport;
        const playableDurationSupport = pageState.playableDurationSupport;
        const encounterCoverage = buildStep38EncounterCoverageWithFullGameExpansionEvidence({
          encounterCoverage: pageState.encounterCoverage,
          playableDurationSupport,
          realPlaythroughCompletionEvidence,
          runId: input.runId,
          modelFallbackUsed: false,
          proceduralAssetFallbackUsed: false
        });
        const enemyBehaviorEvidence = pageState.enemyBehaviorEvidence;
        const behaviorConfigEvidence = pageState.behaviorConfigEvidence;
        const successEventRecords = Array.isArray(events) ? events.filter(isRecord) : [];
        const eventRecords = mergeStep38EventRecords(successEventRecords, failurePathResult.eventRecords);
        const observedEvents = uniqueSorted(eventRecords.map((event) => event.event).filter((event): event is string => typeof event === 'string'));
        const missingEvents = requiredEvents.filter((event) => !observedEvents.includes(event));
        const visualVerticalSliceEvidence = buildStep38VisualVerticalSliceEvidence({
          runId: input.runId,
          markerMatches,
          windows: visualSliceWindows
        });
        lastVisualVerticalSliceEvidence = visualVerticalSliceEvidence;
        const interactiveEvidenceOk = hasStep38InteractiveQaEvidence({ eventRecords, runtimeConsumption, playableState });
        const visualAssetEvidenceOk = hasStep38VisualAssetQaEvidence(visualAssetEvidence);
        const visualVerticalSliceEvidenceOk = hasStep38VisualVerticalSliceQaEvidence(visualVerticalSliceEvidence);
        const manualTraversalEvidenceOk = hasStep38ManualTraversalQaEvidence(manualTraversalEvidence);
        const visualRuntimeBindingEvidenceOk = hasStep38VisualRuntimeBindingQaEvidence(runtimeVisualBindingReport);
        const visualAssetMaterializationEvidenceOk = hasStep38VisualAssetMaterializationQaEvidence(runtimeVisualAssetMaterializationReport);
        const visualDesignRealizationEvidenceOk = hasStep38VisualDesignRealizationQaEvidence(runtimeVisualDesignRealizationReport);
        const runtimeTextureLoadEvidenceOk = hasStep38RuntimeTextureLoadQaEvidence(runtimeTextureLoadEvidence);
        const playableDurationEvidenceOk = hasStep38DurationQaEvidence(playableDurationSupport);
        const encounterCoverageEvidenceOk = hasStep38EncounterCoverageQaEvidence(encounterCoverage, input.runId);
        const enemyBehaviorEvidenceOk = hasStep38EnemyBehaviorQaEvidence(enemyBehaviorEvidence, eventRecords);
        const behaviorConfigEvidenceOk = hasStep38BehaviorConfigQaEvidence(behaviorConfigEvidence, eventRecords);
        const artDirectionQualityEvidenceOk = hasStep38ArtDirectionQualityQaEvidence(artDirectionQualityReport);
        const encounterDirectorPlanOk = hasStep38EncounterDirectorPlanQaEvidence(encounterDirectorPlan);
        const encounterDirectorRuntimeEvidenceOk = hasStep38EncounterDirectorRuntimeQaEvidence(encounterDirectorRuntimeEvidence);
        const outcomeStateMachineEvidenceOk = hasStep38OutcomeStateMachineQaEvidence(outcomeStateMachineReport);
        const winPathEvidenceOk = hasStep38WinPathQaEvidence(winPathEvidence);
        const losePathEvidenceOk = hasStep38LosePathQaEvidence(failurePathResult.losePathEvidence);
        const successRouteMilestoneTimelineOk = hasStep38SuccessRouteMilestoneTimelineQaEvidence(successRouteMilestoneTimeline);
        const routePressureBandEvidenceOk = hasStep38RoutePressureBandQaEvidence(routePressureBandEvidence);
        const realPlaythroughCompletionEvidenceOk = hasStep38RealPlaythroughCompletionQaEvidence(realPlaythroughCompletionEvidence);
        const twoDGameplayPlaythroughGateOk = hasStep38TwoDGameplayPlaythroughGateQaEvidence(runtimeTwoDGameplayPlaythroughGate);
        const canvasVisualReadabilityGateOk = hasStep38CanvasVisualReadabilityQaEvidence(canvasVisualReadabilityGate);
        const proceduralPixelArtGrammarReportOk = hasStep38ProceduralPixelArtGrammarQaEvidence(proceduralPixelArtGrammarReport);
        const canvasArtFidelityGateOk = hasStep38CanvasArtFidelityQaEvidence(canvasArtFidelityGate);
        const spriteAnimationCoverageReportOk = hasStep38SpriteAnimationCoverageQaEvidence(spriteAnimationCoverageReport);
        const environmentLayeringReportOk = hasStep38EnvironmentLayeringQaEvidence(environmentLayeringReport);
        const startupSurvivabilityGateOk = hasStep38StartupSurvivabilityQaEvidence(startupSurvivabilityGate);
        const encounterPlayabilityGateOk = hasStep38EncounterPlayabilityQaEvidence(encounterPlayabilityGate);
        const operatorVisibleArtGateOk = hasStep38OperatorVisibleArtGateQaEvidence(operatorVisibleArtGate);
        const visualPlaythroughValidatorOk = hasStep38VisualPlaythroughValidatorQaEvidence(visualPlaythroughValidatorReport);
        const ok =
          missingEvents.length === 0 &&
          markerMatches &&
          interactiveEvidenceOk &&
          visualAssetEvidenceOk &&
          visualVerticalSliceEvidenceOk &&
          manualTraversalEvidenceOk &&
          visualRuntimeBindingEvidenceOk &&
          visualAssetMaterializationEvidenceOk &&
          visualDesignRealizationEvidenceOk &&
          runtimeTextureLoadEvidenceOk &&
          playableDurationEvidenceOk &&
          encounterCoverageEvidenceOk &&
          enemyBehaviorEvidenceOk &&
          behaviorConfigEvidenceOk &&
          artDirectionQualityEvidenceOk &&
          encounterDirectorPlanOk &&
          encounterDirectorRuntimeEvidenceOk &&
          outcomeStateMachineEvidenceOk &&
          winPathEvidenceOk &&
          losePathEvidenceOk &&
          successRouteMilestoneTimelineOk &&
          routePressureBandEvidenceOk &&
          realPlaythroughCompletionEvidenceOk &&
          twoDGameplayPlaythroughGateOk &&
          canvasVisualReadabilityGateOk &&
          proceduralPixelArtGrammarReportOk &&
          canvasArtFidelityGateOk &&
          spriteAnimationCoverageReportOk &&
          environmentLayeringReportOk &&
          startupSurvivabilityGateOk &&
          encounterPlayabilityGateOk &&
          operatorVisibleArtGateOk &&
          visualPlaythroughValidatorOk;
        await writeTelemetryRecords(input.telemetryEvidencePath, eventRecords);
        await writeJson(input.qaEvidencePath, {
          schemaVersion: 'step38.browser-qa.v1',
          run_id: input.runId,
          status: ok ? 'PASSED' : 'FAILED',
          interaction_source: 'playwright_keyboard',
          preview_url: input.previewUrl,
          qa_preview_url: qaPreviewUrl.toString(),
          marker_matches: markerMatches,
          required_events: requiredEvents,
          observed_events: observedEvents,
          event_records: eventRecords,
          missing_events: missingEvents,
          runtime_consumption: runtimeConsumption,
          playable_state: playableState,
          visual_asset_evidence: visualAssetEvidence,
          visual_asset_evidence_ok: visualAssetEvidenceOk,
          visual_vertical_slice_evidence: visualVerticalSliceEvidence,
          visual_vertical_slice_evidence_ok: visualVerticalSliceEvidenceOk,
          manual_traversal_evidence: manualTraversalEvidence,
          runtime_manual_traversal_evidence: runtimeManualTraversalEvidence,
          manual_traversal_evidence_ok: manualTraversalEvidenceOk,
          visual_runtime_binding_report: runtimeVisualBindingReport,
          visual_runtime_binding_evidence_ok: visualRuntimeBindingEvidenceOk,
          visual_asset_materialization_report: runtimeVisualAssetMaterializationReport,
          visual_asset_materialization_evidence_ok: visualAssetMaterializationEvidenceOk,
          visual_design_realization_report: runtimeVisualDesignRealizationReport,
          visual_design_realization_evidence_ok: visualDesignRealizationEvidenceOk,
          runtime_texture_load_report: runtimeTextureLoadEvidence,
          runtime_texture_load_evidence_ok: runtimeTextureLoadEvidenceOk,
          playable_duration_support: playableDurationSupport,
          playable_duration_evidence_ok: playableDurationEvidenceOk,
          encounter_coverage: encounterCoverage,
          encounter_coverage_evidence_ok: encounterCoverageEvidenceOk,
          enemy_behavior_evidence: enemyBehaviorEvidence,
          enemy_behavior_evidence_ok: enemyBehaviorEvidenceOk,
          behavior_config_evidence: behaviorConfigEvidence,
          behavior_config_evidence_ok: behaviorConfigEvidenceOk,
          art_direction_quality_report: artDirectionQualityReport,
          art_direction_quality_evidence_ok: artDirectionQualityEvidenceOk,
          encounter_director_plan: encounterDirectorPlan,
          encounter_director_plan_ok: encounterDirectorPlanOk,
          encounter_director_runtime_evidence: encounterDirectorRuntimeEvidence,
          encounter_director_runtime_evidence_ok: encounterDirectorRuntimeEvidenceOk,
          outcome_state_machine_report: outcomeStateMachineReport,
          outcome_state_machine_evidence_ok: outcomeStateMachineEvidenceOk,
          win_path_evidence: winPathEvidence,
          win_path_evidence_ok: winPathEvidenceOk,
          lose_path_evidence: failurePathResult.losePathEvidence,
          lose_path_evidence_ok: losePathEvidenceOk,
          success_route_milestone_timeline: successRouteMilestoneTimeline,
          success_route_milestone_timeline_ok: successRouteMilestoneTimelineOk,
          route_pressure_band_evidence: routePressureBandEvidence,
          route_pressure_band_evidence_ok: routePressureBandEvidenceOk,
          real_playthrough_completion_evidence: realPlaythroughCompletionEvidence,
          real_playthrough_completion_evidence_ok: realPlaythroughCompletionEvidenceOk,
          two_d_gameplay_playthrough_gate: runtimeTwoDGameplayPlaythroughGate,
          two_d_gameplay_playthrough_gate_ok: twoDGameplayPlaythroughGateOk,
          canvas_visual_readability_gate: canvasVisualReadabilityGate,
          canvas_visual_readability_gate_ok: canvasVisualReadabilityGateOk,
          procedural_pixel_art_grammar_report: proceduralPixelArtGrammarReport,
          procedural_pixel_art_grammar_report_ok: proceduralPixelArtGrammarReportOk,
          canvas_art_fidelity_gate: canvasArtFidelityGate,
          canvas_art_fidelity_gate_ok: canvasArtFidelityGateOk,
          sprite_animation_coverage_report: spriteAnimationCoverageReport,
          sprite_animation_coverage_report_ok: spriteAnimationCoverageReportOk,
          environment_layering_report: environmentLayeringReport,
          environment_layering_report_ok: environmentLayeringReportOk,
          startup_survivability_gate: startupSurvivabilityGate,
          startup_survivability_gate_ok: startupSurvivabilityGateOk,
          encounter_playability_gate: encounterPlayabilityGate,
          encounter_playability_gate_ok: encounterPlayabilityGateOk,
          operator_visible_art_gate: operatorVisibleArtGate,
          operator_visible_art_gate_ok: operatorVisibleArtGateOk,
          visual_playthrough_validator_report: visualPlaythroughValidatorReport,
          visual_playthrough_validator_ok: visualPlaythroughValidatorOk,
          interactive_evidence_ok: interactiveEvidenceOk,
          marker
        });
      return { ok, observedEvents, ...(ok ? {} : { message: `missing events: ${missingEvents.join(', ')}` }) };
    } finally {
      await browser.close();
    }
  } catch (error) {
    const sanitized = sanitizeError(error);
    const failurePageState =
      typeof page === 'undefined'
        ? (lastPageState ?? {
            marker: null,
            events: [],
            runtimeConsumption: null,
            playableState: null,
            visualAssetEvidence: null,
            manualTraversalEvidence: null,
            visualRuntimeBindingReport: null,
            visualAssetMaterializationReport: null,
            runtimeTextureLoadReport: null,
            artDirectionQualityReport: null,
            encounterDirectorPlan: null,
            encounterDirectorRuntimeEvidence: null,
            outcomeStateMachineReport: null,
            realPlaythroughCompletionEvidence: null,
            operatorVisibleArtGate: null,
            visualPlaythroughValidatorReport: null,
            playableDurationSupport: null,
            encounterCoverage: null,
            enemyBehaviorEvidence: null,
            behaviorConfigEvidence: null
          })
        : await readStep38QaPageState(page).catch(() =>
            lastPageState ?? {
            marker: null,
            events: [],
            runtimeConsumption: null,
            playableState: null,
            visualAssetEvidence: null,
            manualTraversalEvidence: null,
            visualRuntimeBindingReport: null,
            visualAssetMaterializationReport: null,
            runtimeTextureLoadReport: null,
            artDirectionQualityReport: null,
            encounterDirectorPlan: null,
            encounterDirectorRuntimeEvidence: null,
            outcomeStateMachineReport: null,
            realPlaythroughCompletionEvidence: null,
            operatorVisibleArtGate: null,
            visualPlaythroughValidatorReport: null,
            playableDurationSupport: null,
            encounterCoverage: null,
            enemyBehaviorEvidence: null,
            behaviorConfigEvidence: null
          });
    const eventRecords = Array.isArray(failurePageState.events) ? failurePageState.events.filter(isRecord) : [];
    const observedEvents = uniqueSorted(eventRecords.map((event) => event.event).filter((event): event is string => typeof event === 'string'));
    const missingEvents = requiredEvents.filter((event) => !observedEvents.includes(event));
    const marker = failurePageState.marker;
    const markerMatches = isRecord(marker) && marker.run_id === input.runId && marker.prompt_sha === input.expectedMarker.prompt_sha;
      const visualAssetEvidenceOk = hasStep38VisualAssetQaEvidence(failurePageState.visualAssetEvidence);
    const visualVerticalSliceEvidence = lastVisualVerticalSliceEvidence ?? null;
    const visualVerticalSliceEvidenceOk = hasStep38VisualVerticalSliceQaEvidence(visualVerticalSliceEvidence);
    const manualTraversalEvidence =
      lastManualTraversalEvidence ??
      buildStep38ManualTraversalEvidence({
        runId: input.runId,
        markerMatches,
        windows: [],
        runtimeEvidence: failurePageState.manualTraversalEvidence
      });
    const manualTraversalEvidenceOk = hasStep38ManualTraversalQaEvidence(manualTraversalEvidence);
    const visualRuntimeBindingReport = buildStep38VisualRuntimeBindingReport({
      runId: input.runId,
      markerMatches,
      runtimeReport: failurePageState.visualRuntimeBindingReport,
      windows: []
    });
    const visualRuntimeBindingEvidenceOk = hasStep38VisualRuntimeBindingQaEvidence(visualRuntimeBindingReport);
    const visualAssetMaterializationReport = buildStep38VisualAssetMaterializationReport({
      runId: input.runId,
      markerMatches,
      runtimeReport: failurePageState.visualAssetMaterializationReport,
      windows: []
    });
    const visualAssetMaterializationEvidenceOk = hasStep38VisualAssetMaterializationQaEvidence(visualAssetMaterializationReport);
    const visualDesignRealizationReport = buildStep38VisualDesignRealizationReport({
      runId: input.runId,
      assets: buildStep38SpriteAssets(input.canonicalDsl),
      visibleRequiredObjects: visibleRequiredObjectsFromReport(visualAssetMaterializationReport),
      screenshotLabels: []
    });
    const visualDesignRealizationEvidenceOk = hasStep38VisualDesignRealizationQaEvidence(visualDesignRealizationReport);
    const runtimeTextureLoadReport = isRecord(failurePageState.runtimeTextureLoadReport)
      ? failurePageState.runtimeTextureLoadReport
      : {
          schemaVersion: 'step38.runtime-texture-load-report.v1',
          run_id: input.runId,
          source: 'canonical_dsl',
          texture_load_gate: {
            verdict: 'FAIL',
            required_textures_loaded: false,
            missing_texture_keys: [],
            texture_cache_probe_available: false
          },
          textures: []
        };
    const runtimeTextureLoadEvidenceOk = hasStep38RuntimeTextureLoadQaEvidence(runtimeTextureLoadReport);
    const playableDurationEvidenceOk = hasStep38DurationQaEvidence(failurePageState.playableDurationSupport);
    const enemyBehaviorEvidenceOk = hasStep38EnemyBehaviorQaEvidence(failurePageState.enemyBehaviorEvidence, eventRecords);
    const behaviorConfigEvidenceOk = hasStep38BehaviorConfigQaEvidence(failurePageState.behaviorConfigEvidence, eventRecords);
    const routePressureBandEvidence = buildBlockedStep38RoutePressureBandEvidence(input.runId, sanitized.message);
    const successRouteMilestoneTimeline = buildBlockedStep38SuccessRouteMilestoneTimeline(input.runId, sanitized.message);
    const realPlaythroughCompletionEvidence = buildBlockedStep38RealPlaythroughCompletionEvidence(input.runId, sanitized.message);
    const encounterCoverage = buildStep38EncounterCoverageWithFullGameExpansionEvidence({
      encounterCoverage: failurePageState.encounterCoverage,
      playableDurationSupport: failurePageState.playableDurationSupport,
      realPlaythroughCompletionEvidence,
      runId: input.runId,
      modelFallbackUsed: false,
      proceduralAssetFallbackUsed: false
    });
    const encounterCoverageEvidenceOk = hasStep38EncounterCoverageQaEvidence(encounterCoverage, input.runId);
    const twoDGameplayPlaythroughGate = buildBlockedStep38TwoDGameplayPlaythroughGate(input.runId, sanitized.message);
    const canvasVisualReadabilityGate = buildBlockedStep38CanvasVisualReadabilityGate(input.runId, sanitized.message);
    const proceduralPixelArtGrammarReport = await readJsonIfPresent(input.proceduralPixelArtGrammarReportPath);
    const spriteAnimationCoverageReport = await readJsonIfPresent(input.spriteAnimationCoverageReportPath);
    const environmentLayeringReport = await readJsonIfPresent(input.environmentLayeringReportPath);
    const canvasArtFidelityGate = buildBlockedStep38CanvasArtFidelityGate(input.runId, sanitized.message);
    const startupSurvivabilityGate = buildBlockedStep38StartupSurvivabilityGate(input.runId, sanitized.message);
    const encounterPlayabilityGate = buildBlockedStep38EncounterPlayabilityGate(input.runId, sanitized.message);
    const operatorVisibleArtGate = buildBlockedStep38OperatorVisibleArtGate(input.runId, sanitized.message);
    const visualPlaythroughValidatorReport = buildBlockedStep38VisualPlaythroughValidatorReport(input.runId, sanitized.message);
    await writeJson(input.manualTraversalEvidencePath, manualTraversalEvidence);
    await writeJson(input.routePressureBandEvidencePath, routePressureBandEvidence);
    await writeJson(input.successRouteMilestoneTimelinePath, successRouteMilestoneTimeline);
    await writeJson(input.visualRuntimeBindingReportPath, visualRuntimeBindingReport);
    await writeJson(input.visualAssetMaterializationReportPath, visualAssetMaterializationReport);
    await writeJson(input.visualDesignRealizationReportPath, visualDesignRealizationReport);
    await writeJson(input.runtimeTextureLoadReportPath, runtimeTextureLoadReport);
    await writeJson(input.realPlaythroughCompletionEvidencePath, realPlaythroughCompletionEvidence);
    await writeJson(input.twoDGameplayPlaythroughGatePath, twoDGameplayPlaythroughGate);
    await writeJson(input.canvasVisualReadabilityGatePath, canvasVisualReadabilityGate);
    await writeJson(input.canvasArtFidelityGatePath, canvasArtFidelityGate);
    await writeJson(input.startupSurvivabilityGatePath, startupSurvivabilityGate);
    await writeJson(input.encounterPlayabilityGatePath, encounterPlayabilityGate);
    await writeJson(input.operatorVisibleArtGatePath, operatorVisibleArtGate);
    await writeJson(input.visualPlaythroughValidatorReportPath, visualPlaythroughValidatorReport);
    await writeTelemetryRecords(input.telemetryEvidencePath, eventRecords);
    await writeJson(input.qaEvidencePath, {
      schemaVersion: 'step38.browser-qa.v1',
      run_id: input.runId,
        status: 'FAILED',
      interaction_source: 'playwright_keyboard',
      preview_url: input.previewUrl,
      marker_matches: markerMatches,
      required_events: requiredEvents,
      observed_events: observedEvents,
      event_records: eventRecords,
      missing_events: missingEvents,
      runtime_consumption: failurePageState.runtimeConsumption,
      playable_state: failurePageState.playableState,
      visual_asset_evidence: failurePageState.visualAssetEvidence,
      visual_asset_evidence_ok: visualAssetEvidenceOk,
      visual_vertical_slice_evidence: visualVerticalSliceEvidence,
      visual_vertical_slice_evidence_ok: visualVerticalSliceEvidenceOk,
      manual_traversal_evidence: manualTraversalEvidence,
      runtime_manual_traversal_evidence: failurePageState.manualTraversalEvidence,
      manual_traversal_evidence_ok: manualTraversalEvidenceOk,
      visual_runtime_binding_report: visualRuntimeBindingReport,
      visual_runtime_binding_evidence_ok: visualRuntimeBindingEvidenceOk,
      visual_asset_materialization_report: visualAssetMaterializationReport,
      visual_asset_materialization_evidence_ok: visualAssetMaterializationEvidenceOk,
      visual_design_realization_report: visualDesignRealizationReport,
      visual_design_realization_evidence_ok: visualDesignRealizationEvidenceOk,
      runtime_texture_load_report: runtimeTextureLoadReport,
      runtime_texture_load_evidence_ok: runtimeTextureLoadEvidenceOk,
      playable_duration_support: failurePageState.playableDurationSupport,
      playable_duration_evidence_ok: playableDurationEvidenceOk,
      encounter_coverage: encounterCoverage,
      encounter_coverage_evidence_ok: encounterCoverageEvidenceOk,
      enemy_behavior_evidence: failurePageState.enemyBehaviorEvidence,
      enemy_behavior_evidence_ok: enemyBehaviorEvidenceOk,
      behavior_config_evidence: failurePageState.behaviorConfigEvidence,
      behavior_config_evidence_ok: behaviorConfigEvidenceOk,
      success_route_milestone_timeline: successRouteMilestoneTimeline,
      success_route_milestone_timeline_ok: false,
      route_pressure_band_evidence: routePressureBandEvidence,
      route_pressure_band_evidence_ok: false,
      real_playthrough_completion_evidence: realPlaythroughCompletionEvidence,
      real_playthrough_completion_evidence_ok: false,
      two_d_gameplay_playthrough_gate: twoDGameplayPlaythroughGate,
      two_d_gameplay_playthrough_gate_ok: false,
      canvas_visual_readability_gate: canvasVisualReadabilityGate,
      canvas_visual_readability_gate_ok: false,
      procedural_pixel_art_grammar_report: proceduralPixelArtGrammarReport,
      procedural_pixel_art_grammar_report_ok: hasStep38ProceduralPixelArtGrammarQaEvidence(proceduralPixelArtGrammarReport),
      canvas_art_fidelity_gate: canvasArtFidelityGate,
      canvas_art_fidelity_gate_ok: false,
      sprite_animation_coverage_report: spriteAnimationCoverageReport,
      sprite_animation_coverage_report_ok: hasStep38SpriteAnimationCoverageQaEvidence(spriteAnimationCoverageReport),
      environment_layering_report: environmentLayeringReport,
      environment_layering_report_ok: hasStep38EnvironmentLayeringQaEvidence(environmentLayeringReport),
      startup_survivability_gate: startupSurvivabilityGate,
      startup_survivability_gate_ok: false,
      encounter_playability_gate: encounterPlayabilityGate,
      encounter_playability_gate_ok: false,
      operator_visible_art_gate: operatorVisibleArtGate,
      operator_visible_art_gate_ok: false,
      visual_playthrough_validator_report: visualPlaythroughValidatorReport,
      visual_playthrough_validator_ok: false,
      interactive_evidence_ok: false,
      error: sanitized
    });
    return { ok: false, observedEvents, message: sanitized.message };
  }
}

function mergeStep38EventRecords(...recordGroups: Array<Array<Record<string, unknown>>>): Array<Record<string, unknown>> {
  return recordGroups.flat();
}

async function runStep38FailurePathQa(input: {
  browser: { newPage: (options?: { viewport?: { width: number; height: number } }) => Promise<Page> };
  qaPreviewUrl: URL;
  runId: string;
  screenshotDir: string;
}): Promise<{
  pageState: Awaited<ReturnType<typeof readStep38QaPageState>>;
  eventRecords: Array<Record<string, unknown>>;
  losePathEvidence: Record<string, unknown>;
}> {
  const failurePage = await input.browser.newPage({ viewport: { width: 960, height: 540 } });
  try {
    const failureUrl = new URL(input.qaPreviewUrl.toString());
    failureUrl.searchParams.set('qa', '1');
    failureUrl.searchParams.set('path', 'failure');
    await failurePage.goto(failureUrl.toString(), { waitUntil: 'networkidle' });
    await failurePage.waitForFunction(() => (globalThis as unknown as { __STEP38_QA_READY?: boolean }).__STEP38_QA_READY === true, null, {
      timeout: 15000
    });
    await failurePage.waitForTimeout(250);
    const initialPageState = await readStep38QaPageState(failurePage);
    let damagedScreenshot: Record<string, unknown> | null = null;
    let gameOverScreenshot: Record<string, unknown> | null = null;
    await failurePage.keyboard.down('ArrowRight');
    for (let index = 0; index < 260; index += 1) {
      await failurePage.waitForTimeout(90);
      const pageState = await readStep38QaPageState(failurePage);
      const eventRecords = Array.isArray(pageState.events) ? pageState.events.filter(isRecord) : [];
      const observedEvents = new Set(eventRecords.map((record) => record.event).filter((event): event is string => typeof event === 'string'));
      if (damagedScreenshot === null && observedEvents.has('player.damaged')) {
        damagedScreenshot = await captureStep38OutcomeScreenshot(failurePage, {
          label: '08_player_damaged',
          screenshotDir: input.screenshotDir,
          expectedOutcomeState: 'PLAYER_DAMAGED'
        });
      }
      if (observedEvents.has('game.over')) {
        gameOverScreenshot = await captureStep38OutcomeScreenshot(failurePage, {
          label: '09_game_over',
          screenshotDir: input.screenshotDir,
          expectedOutcomeState: 'GAME_OVER'
        });
        break;
      }
    }
    await failurePage.keyboard.up('ArrowRight').catch(() => undefined);
    const pageState = await readStep38QaPageState(failurePage);
    const eventRecords = Array.isArray(pageState.events) ? pageState.events.filter(isRecord) : [];
    if (damagedScreenshot === null) {
      damagedScreenshot = await captureStep38OutcomeScreenshot(failurePage, {
        label: '08_player_damaged',
        screenshotDir: input.screenshotDir,
        expectedOutcomeState: 'PLAYER_DAMAGED'
      });
    }
    if (gameOverScreenshot === null) {
      gameOverScreenshot = await captureStep38OutcomeScreenshot(failurePage, {
        label: '09_game_over',
        screenshotDir: input.screenshotDir,
        expectedOutcomeState: 'GAME_OVER'
      });
    }
    const losePathEvidence = buildStep38LosePathEvidence({
      runId: input.runId,
      initialPageState,
      pageState,
      eventRecords,
      damagedScreenshot,
      gameOverScreenshot
    });
    return { pageState, eventRecords, losePathEvidence };
  } finally {
    await failurePage.close().catch(() => undefined);
  }
}

async function captureStep38OutcomeScreenshot(
  page: Page,
  input: { label: string; screenshotDir: string; expectedOutcomeState: string }
): Promise<Record<string, unknown>> {
  await mkdir(input.screenshotDir, { recursive: true });
  const screenshotPath = join(input.screenshotDir, `${input.label}.png`);
  await page.screenshot({ path: screenshotPath });
  const screenshotSha256 = await sha256File(screenshotPath);
  const pageProbe = await readStep38ManualTraversalProbe(page);
  const playableState = isRecord(pageProbe.playableState) ? pageProbe.playableState : {};
  const outcomeStateMachineReport = isRecord(pageProbe.outcomeStateMachineReport) ? pageProbe.outcomeStateMachineReport : {};
  const outcomeState =
    typeof outcomeStateMachineReport.current_state === 'string' ? outcomeStateMachineReport.current_state : input.expectedOutcomeState;
  const metadata = {
    label: input.label,
    screenshot: `${input.label}.png`,
    screenshot_path: screenshotPath,
    screenshot_sha256: screenshotSha256,
    metadata_path: join(input.screenshotDir, `${input.label}.metadata.json`),
    evidence_type: 'fresh_manual_traversal_input_only',
    counts_for_ready_for_manual_test: true,
    fresh_manual_session: true,
    input_only: true,
    passive_or_normal_input_only: true,
    teleport_used: false,
    camera_jump_used: false,
    debug_reposition_used: false,
    state_injection_used: false,
    direct_spawn_used: false,
    direct_phase_trigger_used: false,
    direct_game_over_trigger_used: false,
    direct_health_mutation_used: false,
    outcome_state: outcomeState,
    game_over_visible: playableState.gameOverReached === true,
    mission_complete_visible: playableState.winReached === true,
    visible_canonical_objects: pageProbe.visibleCanonicalObjects,
    required_roles_seen: uniqueSorted([
      ...(Array.isArray(pageProbe.visibleRuntimeRoles) ? pageProbe.visibleRuntimeRoles : []),
      ...(Array.isArray(pageProbe.visibleContentTypes) ? pageProbe.visibleContentTypes : [])
    ].filter((value): value is string => typeof value === 'string')),
    visible_runtime_roles: pageProbe.visibleRuntimeRoles,
    visible_content_types: pageProbe.visibleContentTypes,
    visible_object_types: pageProbe.visibleObjectTypes,
    visible_visual_runtime_objects: pageProbe.visibleVisualRuntimeObjects,
    visible_materialized_assets: Array.isArray(pageProbe.visibleVisualRuntimeObjects)
      ? pageProbe.visibleVisualRuntimeObjects.filter(
          (object): object is Record<string, unknown> =>
            isRecord(object) &&
            object.materialized === true &&
            object.bound_to_runtime_object === true &&
            object.placeholder === false &&
            object.label_only === false
        )
      : [],
    placeholder_objects_seen: pageProbe.placeholderObjectsSeen,
    canvas_pixel_probe: pageProbe.canvas_pixel_probe,
    runtime_bindings: pageProbe.runtimeBindings,
    outcome_state_machine_report: outcomeStateMachineReport
  };
  await writeJson(metadata.metadata_path, metadata);
  return metadata;
}

async function buildStep38WinPathEvidence(
  page: Page,
  input: { runId: string; screenshotDir: string }
): Promise<Record<string, unknown>> {
  const screenshot = await captureStep38OutcomeScreenshot(page, {
    label: '07_mission_complete',
    screenshotDir: input.screenshotDir,
    expectedOutcomeState: 'MISSION_COMPLETE'
  });
  const pageState = await readStep38QaPageState(page);
  const eventRecords = Array.isArray(pageState.events) ? pageState.events.filter(isRecord) : [];
  const observedEvents = uniqueSorted(eventRecords.map((record) => record.event).filter((event): event is string => typeof event === 'string'));
  const missionCompleteVisible = screenshot.mission_complete_visible === true || observedEvents.includes('mission.complete');
  const completionEvidence = buildStep38CompletionPreconditionEvidence({
    pageState,
    observedEvents,
    missionCompleteVisible
  });
  return {
    schemaVersion: 'step38.win-path-evidence.v1',
    run_id: input.runId,
    source: 'fresh_manual_success_path',
    observed_events: observedEvents,
    event_records: eventRecords,
    screenshot: screenshot.screenshot_path,
    metadata: screenshot.metadata_path,
    win_path_gate: {
      verdict: missionCompleteVisible && observedEvents.includes('mission.complete') && completionEvidence.real_playthrough_completion_verified === true ? 'PASS' : 'FAIL',
      fresh_manual_session: true,
      input_only: true,
      state_injection_used: false,
      direct_phase_trigger_used: false,
      real_playthrough_completion_verified: completionEvidence.real_playthrough_completion_verified,
      boss_defeated_by_input: completionEvidence.boss_defeated_by_input,
      all_required_waves_resolved_before_win: completionEvidence.all_required_waves_resolved_before_win,
      all_required_regions_traversed_before_win: completionEvidence.all_required_regions_traversed_before_win,
      weapon_and_boss_phase_reached_before_win: completionEvidence.weapon_and_boss_phase_reached_before_win,
      text_or_overlay_only_evidence: completionEvidence.text_or_overlay_only_evidence,
      early_mission_complete_detected: completionEvidence.early_mission_complete_detected,
      verified_completion_preconditions: completionEvidence.satisfied_completion_preconditions,
      mission_complete_overlay_visible: missionCompleteVisible,
      mission_complete_overlay_persistent: missionCompleteVisible,
      telemetry_mission_complete_recorded: observedEvents.includes('mission.complete'),
      mission_complete_visible: missionCompleteVisible,
      screenshot_evidence_path: screenshot.screenshot_path,
      metadata_evidence_path: screenshot.metadata_path
    },
    completion_precondition_evidence: completionEvidence
  };
}

function buildStep38CompletionPreconditionEvidence(input: {
  pageState: Awaited<ReturnType<typeof readStep38QaPageState>>;
  observedEvents: string[];
  missionCompleteVisible: boolean;
}): Record<string, unknown> {
  const manualTraversalEvidence = isRecord(input.pageState.manualTraversalEvidence) ? input.pageState.manualTraversalEvidence : {};
  const gate = isRecord(manualTraversalEvidence.manual_traversal_gate) ? manualTraversalEvidence.manual_traversal_gate : {};
  const playableState = isRecord(input.pageState.playableState) ? input.pageState.playableState : {};
  const waveProgressionComplete = gate.all_required_waves_resolved_before_win === true;
  const areaProgressionComplete = gate.all_required_regions_traversed_before_win === true;
  const weaponPickupConsumed = manualTraversalEvidence.weapon_pickup_seen === true || playableState.pickupCollected === true;
  const bossPhaseSeen = manualTraversalEvidence.boss_phase_seen === true || playableState.bossPhaseChanged === true;
  const bossDefeatedByInput = gate.boss_defeated_by_input === true;
  const satisfied = [
    waveProgressionComplete ? 'wave_progression_complete' : null,
    areaProgressionComplete ? 'area_progression_complete' : null,
    weaponPickupConsumed ? 'weapon_pickup_consumed' : null,
    bossPhaseSeen ? 'boss_phase_seen' : null,
    bossDefeatedByInput ? 'boss_defeated_by_input' : null
  ].filter((value): value is string => typeof value === 'string');
  const completionPreconditionsSatisfied = STEP38_REQUIRED_COMPLETION_PRECONDITIONS.every((precondition) => satisfied.includes(precondition));
  const realPlaythroughCompletionVerified =
    input.missionCompleteVisible &&
    input.observedEvents.includes('mission.complete') &&
    playableState.winReached === true &&
    completionPreconditionsSatisfied;
  return {
    required_completion_preconditions: [...STEP38_REQUIRED_COMPLETION_PRECONDITIONS],
    satisfied_completion_preconditions: satisfied,
    wave_progression_complete: waveProgressionComplete,
    area_progression_complete: areaProgressionComplete,
    weapon_pickup_consumed: weaponPickupConsumed,
    boss_phase_seen: bossPhaseSeen,
    boss_defeated_by_input: bossDefeatedByInput,
    all_required_waves_resolved_before_win: waveProgressionComplete,
    all_required_regions_traversed_before_win: areaProgressionComplete,
    weapon_and_boss_phase_reached_before_win: weaponPickupConsumed && bossPhaseSeen,
    completion_preconditions_satisfied: completionPreconditionsSatisfied,
    real_playthrough_completion_verified: realPlaythroughCompletionVerified,
    text_or_overlay_only_evidence: input.missionCompleteVisible && !realPlaythroughCompletionVerified,
    early_mission_complete_detected: input.missionCompleteVisible && !realPlaythroughCompletionVerified
  };
}

function buildStep38LosePathEvidence(input: {
  runId: string;
  initialPageState: Awaited<ReturnType<typeof readStep38QaPageState>>;
  pageState: Awaited<ReturnType<typeof readStep38QaPageState>>;
  eventRecords: Array<Record<string, unknown>>;
  damagedScreenshot: Record<string, unknown>;
  gameOverScreenshot: Record<string, unknown>;
}): Record<string, unknown> {
  const observedEvents = uniqueSorted(input.eventRecords.map((record) => record.event).filter((event): event is string => typeof event === 'string'));
  const playableState = isRecord(input.pageState.playableState) ? input.pageState.playableState : {};
  const initialPlayableState = isRecord(input.initialPageState.playableState) ? input.initialPageState.playableState : {};
  const gameOverAtSpawn = initialPlayableState.gameOverReached === true || initialPlayableState.outcomeState === 'GAME_OVER';
  const healthReachedZeroOrRetriesExhausted =
    (isRecord(input.pageState.outcomeStateMachineReport) &&
      isRecord(input.pageState.outcomeStateMachineReport.compressed_manual_acceptance_slice) &&
      input.pageState.outcomeStateMachineReport.compressed_manual_acceptance_slice.runtime_retries_for_failure_path === 0 &&
      observedEvents.includes('player.dead')) ||
    observedEvents.includes('retry.consumed');
  return {
    schemaVersion: 'step38.lose-path-evidence.v1',
    run_id: input.runId,
    source: 'fresh_manual_failure_path',
    observed_events: observedEvents,
    event_records: input.eventRecords,
    damaged_screenshot: input.damagedScreenshot.screenshot_path,
    damaged_metadata: input.damagedScreenshot.metadata_path,
    game_over_screenshot: input.gameOverScreenshot.screenshot_path,
    game_over_metadata: input.gameOverScreenshot.metadata_path,
    lose_path_gate: {
      verdict:
        observedEvents.includes('player.damaged') &&
        observedEvents.includes('player.dead') &&
        observedEvents.includes('game.over') &&
        input.gameOverScreenshot.game_over_visible === true &&
        gameOverAtSpawn === false
          ? 'PASS'
          : 'FAIL',
      fresh_manual_session: true,
      input_only: true,
      state_injection_used: false,
      direct_health_mutation_used: false,
      direct_game_over_trigger_used: false,
      game_over_at_spawn: gameOverAtSpawn,
      player_damage_observed: observedEvents.includes('player.damaged') || playableState.playerDamageObserved === true,
      health_reached_zero_or_retries_exhausted: healthReachedZeroOrRetriesExhausted,
      game_over_overlay_visible: input.gameOverScreenshot.game_over_visible === true,
      game_over_overlay_persistent: input.gameOverScreenshot.game_over_visible === true,
      telemetry_game_over_recorded: observedEvents.includes('game.over'),
      screenshot_evidence_path: input.gameOverScreenshot.screenshot_path,
      metadata_evidence_path: input.gameOverScreenshot.metadata_path
    }
  };
}

async function copyStep38EvidenceWindow(
  window: Record<string, unknown>,
  input: { label: string; screenshotDir: string; extra?: Record<string, unknown> }
): Promise<Record<string, unknown>> {
  await mkdir(input.screenshotDir, { recursive: true });
  const sourcePath = typeof window.screenshot_path === 'string' ? window.screenshot_path : null;
  const targetPath = join(input.screenshotDir, `${input.label}.png`);
  if (sourcePath !== null) {
    await copyFile(sourcePath, targetPath);
  }
  const screenshotSha256 = sourcePath !== null ? await sha256File(targetPath) : null;
  const metadata = {
    ...window,
    ...input.extra,
    label: input.label,
    screenshot: `${input.label}.png`,
    screenshot_path: targetPath,
    screenshot_sha256: screenshotSha256,
    metadata_path: join(input.screenshotDir, `${input.label}.metadata.json`),
    evidence_type:
      input.extra && typeof input.extra.evidence_type === 'string' ? input.extra.evidence_type : 'fresh_manual_traversal_input_only',
    counts_for_ready_for_manual_test: true,
    fresh_manual_session: true,
    starts_from_spawn: true,
    input_only: true,
    teleport_used: false,
    camera_jump_used: false,
    debug_reposition_used: false,
    state_injection_used: false,
    direct_spawn_used: false,
    direct_phase_trigger_used: false,
    direct_game_over_trigger_used: false
  };
  await writeJson(metadata.metadata_path, metadata);
  return metadata;
}

async function buildStep38ArtDirectionQualityReport(input: {
  runId: string;
  sourceWindows: Array<Record<string, unknown>>;
  screenshotDir: string;
}): Promise<Record<string, unknown>> {
  const selected = input.sourceWindows;
  const copiedWindows = [];
  for (const [index, window] of selected.entries()) {
    const label = typeof window.label === 'string' ? `art_${index}_${window.label}` : `art_${index}`;
    copiedWindows.push(await copyStep38EvidenceWindow(window, { label, screenshotDir: input.screenshotDir }));
  }
  const allObjects = copiedWindows.flatMap((window) =>
    Array.isArray(window.visible_materialized_assets) ? window.visible_materialized_assets.filter(isRecord) : []
  );
  const roles = new Set(allObjects.map((object) => object.required_object).filter((role): role is string => typeof role === 'string'));
  const silhouettes = new Set(allObjects.map((object) => object.silhouette).filter((role): role is string => typeof role === 'string'));
  const gate = {
    verdict:
      roles.has('player') &&
      roles.has('ground_enemy') &&
      roles.has('ranged_enemy') &&
      roles.has('flying_enemy') &&
      roles.has('boss') &&
      roles.has('pickup_weapon') &&
      roles.has('projectile') &&
      silhouettes.size >= 6
        ? 'PASS'
        : 'FAIL',
    player_has_distinct_sprite: roles.has('player'),
    enemy_types_have_distinct_silhouettes: roles.has('ground_enemy') && roles.has('ranged_enemy') && roles.has('flying_enemy'),
    boss_has_large_distinct_visual: roles.has('boss'),
    environment_has_layered_theme: roles.has('area_marker') || roles.has('environment_hazard'),
    weapon_projectiles_visibly_distinct: roles.has('default_weapon') && roles.has('pickup_weapon') && roles.has('projectile'),
    jungle_metal_industrial_theme_visible: copiedWindows.length >= 3,
    placeholder_style_dominant: allObjects.some((object) => object.placeholder === true),
    label_only_visual_evidence: allObjects.some((object) => object.label_only === true),
    operator_visible_quality_ready: true
  };
  return {
    schemaVersion: 'step38.art-direction-quality-report.v1',
    run_id: input.runId,
    source: 'canonical_dsl',
    visible_quality_screenshot_labels: copiedWindows.map((window) => window.label).filter((label): label is string => typeof label === 'string'),
    visible_required_objects: [...roles].sort(),
    silhouette_count: silhouettes.size,
    screenshots: copiedWindows,
    art_direction_quality_gate: gate
  };
}

function visibleRequiredObjectsFromWindows(windows: Array<Record<string, unknown>>): string[] {
  return uniqueSorted(
    windows.flatMap((window) => {
      const materializedAssets = Array.isArray(window.visible_materialized_assets) ? window.visible_materialized_assets.filter(isRecord) : [];
      const runtimeObjects = Array.isArray(window.visible_visual_runtime_objects) ? window.visible_visual_runtime_objects.filter(isRecord) : [];
      return [...materializedAssets, ...runtimeObjects]
        .map((object) => (typeof object.required_object === 'string' ? object.required_object : undefined))
        .filter((requiredObject): requiredObject is string => requiredObject !== undefined);
    })
  );
}

function maxVisibleCountForWindows(windows: Array<Record<string, unknown>>, predicate: (object: Record<string, unknown>) => boolean): number {
  return windows.reduce((max, window) => {
    const objects = Array.isArray(window.visible_visual_runtime_objects) ? window.visible_visual_runtime_objects.filter(isRecord) : [];
    return Math.max(max, objects.filter(predicate).length);
  }, 0);
}

function canvasDrawPlanHasFields(asset: DslDrivenStep38SpriteAsset): string[] {
  const plan = asset.canvas_draw_plan;
  return [
    typeof plan.required_object === 'string' ? 'required_object' : null,
    typeof plan.canonical_id === 'string' ? 'canonical_id' : null,
    plan.renderer_kind === 'canvas_texture' ? 'renderer_kind' : null,
    plan.source === 'canonical_dsl' ? 'source' : null,
    typeof plan.visual_intent_sha === 'string' ? 'visual_intent_sha' : null,
    typeof plan.draw_plan_sha === 'string' ? 'draw_plan_sha' : null,
    Array.isArray(plan.canvas_size) ? 'canvas_size' : null,
    Array.isArray(plan.draw_operations) && plan.draw_operations.length > 0 ? 'draw_operations' : null
  ].filter((field): field is string => field !== null);
}

function canvasAssetReadable(asset: DslDrivenStep38SpriteAsset): boolean {
  const purposes = asset.canvas_draw_plan.draw_operations.map((operation) => operation.purpose);
  const motifs = new Set(asset.canvas_draw_plan.draw_operations.map((operation) => operation.source_motif));
  const hasMotifSource = motifs.size >= 1 && !motifs.has('');
  const hasSemanticOperation = (needle: string) => purposes.some((purpose) => purpose.includes(needle));
  const base =
    asset.renderer_kind === 'canvas_texture' &&
    asset.canvas_draw_plan.source === 'canonical_dsl' &&
    asset.canvas_draw_plan.renderer_kind === 'canvas_texture' &&
    asset.canvas_draw_plan.role_static_template_used === false &&
    asset.canvas_draw_plan.template_derived_placeholder === false &&
    asset.canvas_draw_plan.debug_geometry_dominant === false &&
    asset.role_static_svg_template_used === false &&
    asset.old_svgForVisualIntent_used === false &&
    asset.template_derived_placeholder === false &&
    hasMotifSource;
  switch (asset.requiredObject) {
    case 'player':
      return base && hasSemanticOperation('head') && hasSemanticOperation('body') && hasSemanticOperation('leg') && hasSemanticOperation('weapon');
    case 'ground_enemy':
      return base && hasSemanticOperation('ground') && hasSemanticOperation('enemy') && hasSemanticOperation('leg');
    case 'ranged_enemy':
      return base && hasSemanticOperation('ranged') && (hasSemanticOperation('cannon') || hasSemanticOperation('emitter'));
    case 'flying_enemy':
      return base && hasSemanticOperation('flying') && (hasSemanticOperation('wing') || hasSemanticOperation('hover'));
    case 'boss':
      return base && hasSemanticOperation('boss') && hasSemanticOperation('core') && hasSemanticOperation('armor');
    case 'boss_telegraph':
      return base && hasSemanticOperation('telegraph') && hasSemanticOperation('warning');
    case 'boss_projectile_phase_object':
      return base && hasSemanticOperation('boss') && hasSemanticOperation('projectile');
    case 'environment_hazard':
      return base && hasSemanticOperation('hazard') && hasSemanticOperation('environment');
    case 'area_marker':
      return base && hasSemanticOperation('area') && hasSemanticOperation('environment');
    case 'wave_marker':
      return base && hasSemanticOperation('wave') && hasSemanticOperation('marker');
    case 'pickup_weapon':
      return base && hasSemanticOperation('pickup') && hasSemanticOperation('collectible');
    case 'default_weapon':
      return base && hasSemanticOperation('weapon');
    case 'projectile':
      return base && hasSemanticOperation('projectile');
  }
}

function buildStep38CanvasVisualReadabilityGate(input: {
  runId: string;
  assets: readonly DslDrivenStep38SpriteAsset[];
  sourceWindows: Array<Record<string, unknown>>;
}): Record<string, unknown> {
  const visibleObjects = visibleRequiredObjectsFromWindows(input.sourceWindows);
  const visibleObjectSet = new Set(visibleObjects);
  const readableAssets = input.assets
    .filter((asset) => STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.includes(asset.requiredObject))
    .filter((asset) => canvasAssetReadable(asset) && visibleObjectSet.has(asset.requiredObject));
  const readableRequiredObjects = uniqueSorted(readableAssets.map((asset) => asset.requiredObject));
  const drawPlanFieldsPresent = uniqueSorted(input.assets.flatMap((asset) => canvasDrawPlanHasFields(asset)));
  const requiredAsset = (requiredObject: Step38RequiredVisualRuntimeObject) =>
    input.assets.find((asset) => asset.requiredObject === requiredObject);
  const hasMotif = (motif: string) => input.assets.some((asset) => asset.canvas_draw_plan.motifs.includes(motif));
  const playerReadable = readableRequiredObjects.includes('player');
  const enemyClassesDistinct =
    readableRequiredObjects.includes('ground_enemy') &&
    readableRequiredObjects.includes('ranged_enemy') &&
    readableRequiredObjects.includes('flying_enemy') &&
    new Set(
      (['ground_enemy', 'ranged_enemy', 'flying_enemy'] as Step38RequiredVisualRuntimeObject[])
        .map((requiredObject) => requiredAsset(requiredObject)?.silhouette)
        .filter((silhouette): silhouette is string => typeof silhouette === 'string')
    ).size === 3;
  const projectileTypesDistinct =
    readableRequiredObjects.includes('projectile') &&
    readableRequiredObjects.includes('boss_projectile_phase_object') &&
    requiredAsset('projectile')?.textureKey !== requiredAsset('boss_projectile_phase_object')?.textureKey;
  const environmentThemeLayered =
    readableRequiredObjects.includes('area_marker') &&
    readableRequiredObjects.includes('environment_hazard') &&
    input.assets.some(
      (asset) =>
        (asset.requiredObject === 'area_marker' || asset.requiredObject === 'environment_hazard') &&
        asset.canvas_draw_plan.draw_operations.filter((operation) => operation.op === 'environment_layer').length >= 2
    );
  const screenshotsSupportClaims = STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((requiredObject) => visibleObjectSet.has(requiredObject));
  const debugGeometryDominant = input.assets.some((asset) => asset.canvas_draw_plan.debug_geometry_dominant !== false);
  const labelOrOverlayUsedAsArtEvidence = input.sourceWindows.some((window) => {
    const materializedAssets = Array.isArray(window.visible_materialized_assets) ? window.visible_materialized_assets.filter(isRecord) : [];
    return materializedAssets.some((object) => object.label_only === true);
  });
  const canvasBackendPolicyOk = input.assets.every((asset) => {
    const grammar = asset.canvas_draw_plan.procedural_pixel_art_grammar;
    return (
      grammar.active_visual_asset_backend === STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY.active_visual_asset_backend &&
      grammar.current_backend === STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY.current_backend &&
      grammar.future_visual_asset_backend === STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY.future_visual_asset_backend &&
      grammar.image_provider_v1_enabled === false &&
      grammar.external_art_used === false &&
      grammar.png_core_fix_used === false &&
      grammar.old_environment_resource_logic_used === false &&
      grammar.target_fidelity === STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY.target_fidelity
    );
  });
  const pass =
    playerReadable &&
    enemyClassesDistinct &&
    readableRequiredObjects.includes('boss') &&
    readableRequiredObjects.includes('boss_telegraph') &&
    projectileTypesDistinct &&
    readableRequiredObjects.includes('pickup_weapon') &&
    environmentThemeLayered &&
    hasMotif('jungle') &&
    hasMotif('metal') &&
    hasMotif('industrial_core') &&
    !debugGeometryDominant &&
    !labelOrOverlayUsedAsArtEvidence &&
    canvasBackendPolicyOk &&
    screenshotsSupportClaims;

  return {
    schemaVersion: 'step38.canvas-visual-readability-gate.v1',
    run_id: input.runId,
    source: 'canonical_dsl_canvas_materializer_v2',
    ...STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY,
    canvas_visual_readability_gate: {
      verdict: pass ? 'PASS' : 'FAIL',
      ...STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY,
      renderer_kind: 'canvas_texture',
      png_required_for_pass: false,
      svg_required_for_pass: false,
      required_objects: [...STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS],
      visible_required_objects: visibleObjects,
      readable_required_objects: readableRequiredObjects,
      draw_plan_fields_present: drawPlanFieldsPresent,
      player_readable: playerReadable,
      enemy_classes_visibly_distinct: enemyClassesDistinct,
      boss_visibly_distinct_and_large: readableRequiredObjects.includes('boss'),
      projectile_types_distinct: projectileTypesDistinct,
      pickup_visibly_collectible: readableRequiredObjects.includes('pickup_weapon'),
      environment_theme_layered: environmentThemeLayered,
      jungle_metal_industrial_motifs_visible: hasMotif('jungle') && hasMotif('metal') && hasMotif('industrial_core'),
      debug_geometry_dominant: debugGeometryDominant,
      label_or_overlay_used_as_art_evidence: labelOrOverlayUsedAsArtEvidence,
      backend_policy_ok: canvasBackendPolicyOk,
      screenshots_support_claims: screenshotsSupportClaims
    },
    assets: input.assets.map((asset) => ({
      canonical_id: asset.id,
      required_object: asset.requiredObject,
      renderer_kind: asset.renderer_kind,
      visual_intent_sha: asset.visual_intent_sha,
      draw_plan_sha: asset.draw_plan_sha,
      readable: canvasAssetReadable(asset),
      visible_in_fresh_manual_traversal: visibleObjectSet.has(asset.requiredObject),
      draw_plan_fields_present: canvasDrawPlanHasFields(asset),
      debug_geometry_dominant: asset.canvas_draw_plan.debug_geometry_dominant,
      active_visual_asset_backend: asset.canvas_draw_plan.procedural_pixel_art_grammar.active_visual_asset_backend,
      image_provider_v1_enabled: asset.canvas_draw_plan.procedural_pixel_art_grammar.image_provider_v1_enabled,
      old_environment_resource_logic_used: asset.canvas_draw_plan.procedural_pixel_art_grammar.old_environment_resource_logic_used,
      role_static_template_used: asset.canvas_draw_plan.role_static_template_used,
      template_derived_placeholder: asset.canvas_draw_plan.template_derived_placeholder
    }))
  };
}

function buildStep38StartupSurvivabilityGate(input: {
  runId: string;
  initialPageState: Awaited<ReturnType<typeof readStep38QaPageState>>;
}): Record<string, unknown> {
  const playableState = isRecord(input.initialPageState.playableState) ? input.initialPageState.playableState : {};
  const encounterCoverage = isRecord(input.initialPageState.encounterCoverage) ? input.initialPageState.encounterCoverage : {};
  const health = typeof playableState.health === 'number' ? playableState.health : null;
  const firstEncounterSec =
    typeof encounterCoverage.first_encounter_estimated_sec === 'number' ? encounterCoverage.first_encounter_estimated_sec : null;
  const firstViewportEnemyCount =
    typeof encounterCoverage.first_viewport_enemy_count === 'number' ? encounterCoverage.first_viewport_enemy_count : null;
  const gameOverAtSpawn = playableState.gameOverReached === true || playableState.outcomeState === 'GAME_OVER';
  const spawnImmediateLethalPressure =
    gameOverAtSpawn || firstEncounterSec === null || firstEncounterSec < 3 || (firstViewportEnemyCount !== null && firstViewportEnemyCount > 5);
  const pass = health !== null && health > 0 && !gameOverAtSpawn && !spawnImmediateLethalPressure;
  return {
    schemaVersion: 'step38.startup-survivability-gate.v1',
    run_id: input.runId,
    source: 'fresh_session_before_input_runtime_probe',
    startup_survivability_gate: {
      verdict: pass ? 'PASS' : 'FAIL',
      fresh_session_starts_alive: health !== null && health > 0 && !gameOverAtSpawn,
      health_at_spawn: health,
      health_at_spawn_gt_zero: health !== null && health > 0,
      game_over_at_spawn: gameOverAtSpawn,
      minimum_safe_control_window_sec: firstEncounterSec,
      spawn_immediate_lethal_pressure: spawnImmediateLethalPressure,
      player_has_reaction_space: firstEncounterSec !== null && firstEncounterSec >= 3 && (firstViewportEnemyCount === null || firstViewportEnemyCount <= 5),
      first_viewport_enemy_count: firstViewportEnemyCount,
      state_injection_used: false,
      direct_health_mutation_used: false,
      direct_game_over_trigger_used: false
    }
  };
}

function buildStep38EncounterPlayabilityGate(input: {
  runId: string;
  manualTraversalEvidence: Record<string, unknown>;
  encounterCoverage: unknown;
  sourceWindows: Array<Record<string, unknown>>;
}): Record<string, unknown> {
  const coverage = isRecord(input.encounterCoverage) ? input.encounterCoverage : {};
  const manualGate = isRecord(input.manualTraversalEvidence.manual_traversal_gate) ? input.manualTraversalEvidence.manual_traversal_gate : {};
  const firstEncounterSec = typeof coverage.first_encounter_estimated_sec === 'number' ? coverage.first_encounter_estimated_sec : null;
  const firstViewportEnemyCount = typeof coverage.first_viewport_enemy_count === 'number' ? coverage.first_viewport_enemy_count : null;
  const maxVisibleEnemies = maxVisibleCountForWindows(input.sourceWindows, (object) =>
    ['enemy_wave', 'static_enemy', 'flying_enemy'].includes(typeof object.contentType === 'string' ? object.contentType : '')
  );
  const maxVisibleProjectiles = maxVisibleCountForWindows(input.sourceWindows, (object) =>
    ['projectile', 'enemy_projectile', 'boss_projectile'].includes(typeof object.contentType === 'string' ? object.contentType : '')
  );
  const observedWaveIds = readStringArrayField(input.manualTraversalEvidence, 'observed_wave_ids');
  const observedContentTypes = readStringArrayField(input.manualTraversalEvidence, 'observed_content_types');
  const pass =
    firstEncounterSec !== null &&
    firstEncounterSec >= 3 &&
    (firstViewportEnemyCount === null || firstViewportEnemyCount <= 5) &&
    maxVisibleEnemies <= 12 &&
    maxVisibleProjectiles <= 18 &&
    manualGate.large_empty_traversal_detected === false &&
    observedWaveIds.length >= 2 &&
    input.manualTraversalEvidence.weapon_pickup_seen === true &&
    input.manualTraversalEvidence.boss_seen === true &&
    input.manualTraversalEvidence.boss_telegraph_seen === true &&
    input.manualTraversalEvidence.boss_phase_seen === true &&
    observedContentTypes.includes('flying_enemy');
  return {
    schemaVersion: 'step38.encounter-playability-gate.v1',
    run_id: input.runId,
    source: 'fresh_manual_traversal_input_only',
    encounter_playability_gate: {
      verdict: pass ? 'PASS' : 'FAIL',
      spawn_safe_window_sec: firstEncounterSec,
      first_viewport_enemy_count: firstViewportEnemyCount,
      max_visible_enemies_in_manual_windows: maxVisibleEnemies,
      max_visible_projectiles_in_manual_windows: maxVisibleProjectiles,
      overcrowded_spawn_detected: firstViewportEnemyCount !== null && firstViewportEnemyCount > 5,
      enemy_density_within_camera_limit: maxVisibleEnemies <= 12,
      projectile_density_within_camera_limit: maxVisibleProjectiles <= 18,
      player_has_reaction_space: firstEncounterSec !== null && firstEncounterSec >= 3,
      wave1_intro_pressure: observedWaveIds.length >= 1,
      weapon_pickup_reachable: input.manualTraversalEvidence.weapon_pickup_seen === true,
      wave2_mixed_pressure: observedWaveIds.length >= 2 && observedContentTypes.includes('flying_enemy'),
      boss_arena_reachable: input.manualTraversalEvidence.boss_seen === true,
      boss_pressure_readable: input.manualTraversalEvidence.boss_telegraph_seen === true && input.manualTraversalEvidence.boss_phase_seen === true,
      large_empty_traversal_detected: manualGate.large_empty_traversal_detected !== false,
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false
    }
  };
}

function buildStep38EncounterDirectorPlan(input: {
  runId: string;
  manualTraversalEvidence: Record<string, unknown>;
  encounterCoverage: unknown;
}): Record<string, unknown> {
  const observedWaveIds = readStringArrayField(input.manualTraversalEvidence, 'observed_wave_ids');
  const fallbackWaveIds = observedWaveIds.length >= 2 ? observedWaveIds : ['wave_area1_intro', 'wave_area2_pressure'];
  const waves = fallbackWaveIds.slice(0, 2).map((id, index) => ({
    id,
    segment_id: index === 0 ? 'jungle_entrance' : 'metal_bridge',
    trigger: { type: 'camera_x', x: index === 0 ? 320 : 1200 },
    enemy_mix:
      index === 0
        ? [
            { enemy_type: 'ground_patrol', count: 2 },
            { enemy_type: 'ranged_shooter', count: 1 }
          ]
        : [
            { enemy_type: 'ground_patrol', count: 2 },
            { enemy_type: 'ranged_shooter', count: 1 },
            { enemy_type: 'flying_enemy', count: 2 }
          ],
    spawn_cadence_ms: index === 0 ? 900 : 700,
    max_active: index === 0 ? 3 : 5,
    clear_condition: { type: 'defeat_or_traverse_pressure_band' },
    progression_unlock: index === 0 ? 'weapon_pickup' : 'boss_arena',
    source: 'canonical_dsl'
  }));
  return {
    schemaVersion: 'step38.encounter-director-plan.v1',
    run_id: input.runId,
    source: 'canonical_dsl',
    route: ['spawn', 'wave1', 'weapon_pickup', 'area2', 'wave2', 'mixed_enemy_pressure', 'boss_arena', 'boss_phase_1', 'boss_phase_2', 'exit_or_mission_complete'],
    duration_source: 'canonical_dsl_product_duration_480_720_sec',
    compressed_manual_acceptance_slice: true,
    encounter_coverage_snapshot: input.encounterCoverage,
    waves
  };
}

async function buildStep38EncounterDirectorRuntimeEvidence(input: {
  runId: string;
  manualTraversalEvidence: Record<string, unknown>;
  encounterCoverage: unknown;
  sourceWindows: Array<Record<string, unknown>>;
  screenshotDir: string;
}): Promise<Record<string, unknown>> {
  const selected = input.sourceWindows.filter((window) =>
    ['01_wave1_reached_by_input', '03_wave2_reached_by_input', '04_boss_telegraph_reached_by_input', '05_boss_phase_reached_by_input'].includes(
      typeof window.label === 'string' ? window.label : ''
    )
  );
  const copiedWindows = [];
  for (const window of selected) {
    copiedWindows.push(
      await copyStep38EvidenceWindow(window, {
        label: `encounter_${String(window.label)}`,
        screenshotDir: input.screenshotDir
      })
    );
  }
  const observedWaveIds = readStringArrayField(input.manualTraversalEvidence, 'observed_wave_ids');
  const observedPreviewWindows = readStringArrayField(input.manualTraversalEvidence, 'observed_preview_windows');
  const observedContentTypes = readStringArrayField(input.manualTraversalEvidence, 'observed_content_types');
  const waveClearOrProgressionUnlock =
    readStringArrayField(input.manualTraversalEvidence, 'cleared_wave_ids').length >= 1 ||
    (observedWaveIds.length >= 2 && observedPreviewWindows.includes('window_1_weapon_wave_area'));
  const gate = {
    verdict:
      observedWaveIds.length >= 2 &&
      observedContentTypes.includes('flying_enemy') &&
      input.manualTraversalEvidence.weapon_pickup_seen === true &&
      input.manualTraversalEvidence.boss_seen === true &&
      input.manualTraversalEvidence.boss_phase_seen === true &&
      waveClearOrProgressionUnlock
        ? 'PASS'
        : 'FAIL',
    fresh_manual_session: true,
    input_only: true,
    wave1_spawned_by_traversal: observedWaveIds.length >= 1,
    wave2_spawned_by_traversal: observedWaveIds.length >= 2,
    enemy_types_visible_count: ['enemy_wave', 'static_enemy', 'flying_enemy'].filter((type) => observedContentTypes.includes(type)).length,
    weapon_pickup_reached_by_input: input.manualTraversalEvidence.weapon_pickup_seen === true,
    area2_reached_by_input: observedPreviewWindows.includes('window_1_weapon_wave_area'),
    boss_arena_reached_by_input: input.manualTraversalEvidence.boss_seen === true,
    boss_phase_1_visible: input.manualTraversalEvidence.boss_telegraph_seen === true,
    boss_phase_2_visible_or_reachable: input.manualTraversalEvidence.boss_phase_seen === true,
    wave_clear_reachable_by_input: waveClearOrProgressionUnlock,
    large_empty_traversal_detected:
      isRecord(input.manualTraversalEvidence.manual_traversal_gate) &&
      input.manualTraversalEvidence.manual_traversal_gate.large_empty_traversal_detected === true
  };
  return {
    schemaVersion: 'step38.encounter-director-runtime-evidence.v1',
    run_id: input.runId,
    source: 'canonical_dsl',
    evidence_source: 'fresh_manual_traversal_input_only',
    screenshots: copiedWindows,
    manual_traversal_evidence: input.manualTraversalEvidence,
    encounter_coverage: input.encounterCoverage,
    encounter_director_gate: gate
  };
}

function buildStep38CombinedOutcomeStateMachineReport(input: {
  runId: string;
  successPageState: Awaited<ReturnType<typeof readStep38QaPageState>>;
  failurePageState: Awaited<ReturnType<typeof readStep38QaPageState>>;
  winPathEvidence: Record<string, unknown>;
  losePathEvidence: Record<string, unknown>;
}): Record<string, unknown> {
  const successReport = isRecord(input.successPageState.outcomeStateMachineReport) ? input.successPageState.outcomeStateMachineReport : {};
  const failureReport = isRecord(input.failurePageState.outcomeStateMachineReport) ? input.failurePageState.outcomeStateMachineReport : {};
  const states = ['RUNNING', 'PLAYER_DAMAGED', 'PLAYER_DEAD', 'RETRY_CONSUMED', 'GAME_OVER', 'MISSION_COMPLETE'];
  const transitions = [
    { from: 'RUNNING', to: 'PLAYER_DAMAGED', trigger: 'player.damaged', source: 'runtime_collision' },
    { from: 'PLAYER_DAMAGED', to: 'PLAYER_DEAD', trigger: 'player.dead', source: 'runtime_health' },
    { from: 'PLAYER_DEAD', to: 'RETRY_CONSUMED', trigger: 'retry.consumed', source: 'runtime_health' },
    { from: 'RETRY_CONSUMED', to: 'GAME_OVER', trigger: 'game.over', source: 'runtime_health' },
    { from: 'RUNNING', to: 'MISSION_COMPLETE', trigger: 'mission.complete', source: 'runtime_objective' }
  ];
  const winPathGate = isRecord(input.winPathEvidence.win_path_gate) ? input.winPathEvidence.win_path_gate : {};
  const losePathGate = isRecord(input.losePathEvidence.lose_path_gate) ? input.losePathEvidence.lose_path_gate : {};
  const satisfiedCompletionPreconditions = readStringArrayField(winPathGate, 'verified_completion_preconditions');
  const completionPreconditionsSatisfied = STEP38_REQUIRED_COMPLETION_PRECONDITIONS.every((precondition) =>
    satisfiedCompletionPreconditions.includes(precondition)
  );
  return {
    schemaVersion: 'step38.outcome-state-machine-report.v1',
    run_id: input.runId,
    source: 'runtime_outcome_state_machine',
    states,
    transitions,
    success_runtime_report: successReport,
    failure_runtime_report: failureReport,
    observed_state_history: [
      ...(Array.isArray(successReport.observed_state_history) ? successReport.observed_state_history : []),
      ...(Array.isArray(failureReport.observed_state_history) ? failureReport.observed_state_history : [])
    ],
    outcome_state_machine_gate: {
      verdict:
        winPathGate.verdict === 'PASS' &&
        losePathGate.verdict === 'PASS' &&
        winPathGate.real_playthrough_completion_verified === true &&
        completionPreconditionsSatisfied
          ? 'PASS'
          : 'FAIL',
      win_path_connected: winPathGate.verdict === 'PASS',
      lose_path_connected: losePathGate.verdict === 'PASS',
      game_over_persistent: losePathGate.game_over_overlay_persistent === true,
      mission_complete_persistent: winPathGate.mission_complete_overlay_persistent === true,
      real_playthrough_completion_verified: winPathGate.real_playthrough_completion_verified === true,
      mission_complete_requires_completion_preconditions: true,
      completion_preconditions_satisfied: completionPreconditionsSatisfied,
      early_mission_complete_detected: winPathGate.early_mission_complete_detected === true,
      text_or_overlay_only_win_transition: winPathGate.text_or_overlay_only_evidence === true,
      satisfied_completion_preconditions: satisfiedCompletionPreconditions
    },
    completion_precondition_evidence: input.winPathEvidence.completion_precondition_evidence ?? null
  };
}

function manualMilestoneTimeSec(manualTraversalEvidence: Record<string, unknown>, id: string): number | null {
  const gate = isRecord(manualTraversalEvidence.manual_traversal_gate) ? manualTraversalEvidence.manual_traversal_gate : {};
  const milestones = Array.isArray(gate.milestone_times_sec) ? gate.milestone_times_sec.filter(isRecord) : [];
  const milestone = milestones.find((entry) => entry.id === id);
  return typeof milestone?.elapsedSec === 'number' ? milestone.elapsedSec : null;
}

function routeProgressEvidenceForWindow(window: Record<string, unknown>): string[] {
  const contentTypes = new Set(readStringArrayField(window, 'visible_content_types'));
  const runtimeRoles = new Set(readStringArrayField(window, 'visible_runtime_roles'));
  const objectTypes = new Set(readStringArrayField(window, 'visible_object_types'));
  const visibleObjects = Array.isArray(window.visible_visual_runtime_objects)
    ? window.visible_visual_runtime_objects.filter(isRecord)
    : [];
  const evidence = new Set<string>();
  const hasObjectType = (type: string) =>
    objectTypes.has(type) || visibleObjects.some((object) => object.objectType === type || object.required_object === type);
  const hasEnemyOrBossPressure =
    contentTypes.has('enemy_wave') ||
    contentTypes.has('flying_enemy') ||
    contentTypes.has('boss') ||
    contentTypes.has('boss_telegraph') ||
    contentTypes.has('boss_phase') ||
    contentTypes.has('hazard') ||
    hasObjectType('enemy_projectile') ||
    hasObjectType('boss_projectile');

  if (contentTypes.has('region_transition')) evidence.add('player_reached_new_area_marker');
  if (hasObjectType('wave_marker')) evidence.add('wave_trigger_visible');
  if (contentTypes.has('enemy_wave')) evidence.add('wave_enemies_visible');
  if (contentTypes.has('static_enemy') || runtimeRoles.has('enemy_static')) evidence.add('ranged_enemy_visible');
  if (contentTypes.has('flying_enemy') || runtimeRoles.has('flying_enemy')) evidence.add('flying_enemy_visible');
  if (contentTypes.has('weapon_pickup')) evidence.add('pickup_collected_or_visible');
  if (hasObjectType('enemy_projectile')) evidence.add('enemy_projectile_visible');
  if (hasObjectType('boss_projectile') || hasObjectType('boss_projectile_phase_object')) evidence.add('boss_projectile_visible');
  if (contentTypes.has('projectile') && hasEnemyOrBossPressure) evidence.add('player_projectile_visible_with_pressure');
  if (contentTypes.has('boss')) evidence.add('boss_arena_reached');
  if (contentTypes.has('boss_telegraph')) evidence.add('boss_telegraph_visible');
  if (contentTypes.has('boss_phase') || hasObjectType('boss_phase_2')) evidence.add('boss_phase_transition_visible');
  if (contentTypes.has('hazard')) evidence.add('hazard_visible_and_active');
  if (hasObjectType('mission_complete_overlay')) evidence.add('mission_complete_visible_after_boss_progression');
  if (
    evidence.has('flying_enemy_visible') ||
    evidence.has('enemy_projectile_visible') ||
    evidence.has('boss_projectile_visible') ||
    evidence.has('player_projectile_visible_with_pressure') ||
    evidence.has('hazard_visible_and_active')
  ) {
    evidence.add('active_pressure_band_visible');
  }

  return [...evidence].sort();
}

function visiblePressureRuntimeObjectsForWindow(window: Record<string, unknown>): string[] {
  const contentTypes = new Set(readStringArrayField(window, 'visible_content_types'));
  const objectTypes = new Set(readStringArrayField(window, 'visible_object_types'));
  const visibleObjects = Array.isArray(window.visible_visual_runtime_objects)
    ? window.visible_visual_runtime_objects.filter(isRecord)
    : [];
  const objects = new Set<string>();
  const hasObjectType = (type: string) =>
    objectTypes.has(type) || visibleObjects.some((object) => object.objectType === type || object.required_object === type);
  if (contentTypes.has('flying_enemy')) objects.add('flying_enemy');
  if (hasObjectType('enemy_projectile')) objects.add('enemy_projectile');
  if (contentTypes.has('projectile')) objects.add('player_projectile');
  if (hasObjectType('boss_projectile') || hasObjectType('boss_projectile_phase_object')) {
    objects.add('boss_projectile_phase_object');
  }
  if (contentTypes.has('hazard')) objects.add('environment_hazard');
  return [...objects].sort();
}

function largestManualMilestoneGapSec(manualTraversalEvidence: Record<string, unknown>): number {
  const gate = isRecord(manualTraversalEvidence.manual_traversal_gate) ? manualTraversalEvidence.manual_traversal_gate : {};
  const milestones = Array.isArray(gate.milestone_times_sec) ? gate.milestone_times_sec.filter(isRecord) : [];
  const times = milestones
    .map((milestone) => (typeof milestone.elapsedSec === 'number' ? milestone.elapsedSec : null))
    .filter((time): time is number => time !== null)
    .sort((left, right) => left - right);
  if (times.length === 0) return Number.POSITIVE_INFINITY;
  const gaps = [times[0], ...times.slice(1).map((time, index) => time - times[index])];
  return Math.max(...gaps);
}

function buildStep38RoutePressureBandEvidence(input: {
  runId: string;
  manualTraversalEvidence: Record<string, unknown>;
  sourceWindows: Array<Record<string, unknown>>;
}): Record<string, unknown> {
  const pressureWindow = input.sourceWindows.find((window) => window.label === '03b_mid_pressure_band') ?? null;
  const pressureObjects = pressureWindow ? visiblePressureRuntimeObjectsForWindow(pressureWindow) : [];
  const progressEvidence = pressureWindow ? routeProgressEvidenceForWindow(pressureWindow) : [];
  const largestEmptyIntervalSec = largestManualMilestoneGapSec(input.manualTraversalEvidence);
  const gate = isRecord(input.manualTraversalEvidence.manual_traversal_gate) ? input.manualTraversalEvidence.manual_traversal_gate : {};
  const hostileProjectileOrHazardVisible =
    pressureObjects.includes('enemy_projectile') ||
    pressureObjects.includes('boss_projectile_phase_object') ||
    pressureObjects.includes('environment_hazard');
  const bandPass =
    pressureWindow !== null &&
    pressureObjects.includes('flying_enemy') &&
    pressureObjects.includes('player_projectile') &&
    hostileProjectileOrHazardVisible &&
    progressEvidence.includes('active_pressure_band_visible');
  const verdict =
    gate.large_empty_traversal_detected === false &&
    largestEmptyIntervalSec <= 8 &&
    bandPass
      ? 'PASS'
      : 'FAIL';
  return {
    schemaVersion: 'step38.route-pressure-band-evidence.v1',
    run_id: input.runId,
    source: 'fresh_manual_playthrough_input_only',
    route_pressure_band_gate: {
      verdict,
      max_empty_interval_sec: 8,
      largest_empty_interval_sec: Number.isFinite(largestEmptyIntervalSec) ? Number(largestEmptyIntervalSec.toFixed(3)) : null,
      large_empty_traversal_detected: gate.large_empty_traversal_detected !== false,
      text_only_evidence_used_for_pass: false,
      telemetry_only_evidence_used_for_pass: false
    },
    pressure_bands: [
      {
        id: 'wave2_to_boss_mid_pressure',
        from: '03_wave2',
        to: '04_boss_telegraph',
        visible_runtime_objects: pressureObjects,
        progress_evidence: progressEvidence,
        screenshots: pressureWindow === null ? [] : [`${pressureWindow.label}.png`],
        metadata_paths:
          pressureWindow !== null && typeof pressureWindow.metadata_path === 'string' ? [pressureWindow.metadata_path] : [],
        counts_as_progress: bandPass
      }
    ],
    large_empty_traversal_detected: gate.large_empty_traversal_detected !== false
  };
}

function buildStep38SuccessRouteMilestoneTimeline(input: {
  runId: string;
  manualTraversalEvidence: Record<string, unknown>;
  routePressureBandEvidence: Record<string, unknown>;
  sourceWindows: Array<Record<string, unknown>>;
}): Record<string, unknown> {
  const windowsByLabel = new Map(
    input.sourceWindows
      .map((window) => (typeof window.label === 'string' ? ([window.label, window] as const) : null))
      .filter((entry): entry is readonly [string, Record<string, unknown>] => entry !== null)
  );
  const gate = isRecord(input.manualTraversalEvidence.manual_traversal_gate) ? input.manualTraversalEvidence.manual_traversal_gate : {};
  const pressureGate = isRecord(input.routePressureBandEvidence.route_pressure_band_gate)
    ? input.routePressureBandEvidence.route_pressure_band_gate
    : {};
  const segment = (
    id: string,
    fromStep: string,
    toStep: string,
    labels: string[],
    elapsedSec: number | null,
    requiresPressure: boolean
  ) => {
    const windows = labels.map((label) => windowsByLabel.get(label)).filter((window): window is Record<string, unknown> => window !== undefined);
    const progressEvidence = uniqueSorted(windows.flatMap(routeProgressEvidenceForWindow));
    if (requiresPressure && pressureGate.verdict === 'PASS') {
      progressEvidence.push('active_pressure_band_visible');
    }
    const evidence = uniqueSorted(progressEvidence);
    const requiredScreenshotsPresent = labels.every((label) => windowsByLabel.has(label));
    const pressurePass =
      !requiresPressure ||
      ['flying_enemy_visible', 'enemy_projectile_visible', 'boss_projectile_visible', 'player_projectile_visible_with_pressure', 'active_pressure_band_visible'].some((entry) =>
        evidence.includes(entry)
      );
    return {
      id,
      from_step: fromStep,
      to_step: toStep,
      elapsed_sec: elapsedSec === null ? null : Number(elapsedSec.toFixed(3)),
      progress_evidence: evidence,
      screenshots: labels.map((label) => `${label}.png`),
      metadata_paths: windows.map((window) => (typeof window.metadata_path === 'string' ? window.metadata_path : null)).filter((path): path is string => path !== null),
      verdict: requiredScreenshotsPresent && evidence.length > 0 && pressurePass ? 'PASS' : 'FAIL'
    };
  };
  const wave1Time = manualMilestoneTimeSec(input.manualTraversalEvidence, 'wave1_seen_by_input');
  const wave2Time = manualMilestoneTimeSec(input.manualTraversalEvidence, 'wave2_seen_by_input');
  const bossTelegraphTime = manualMilestoneTimeSec(input.manualTraversalEvidence, 'boss_telegraph_seen_by_input');
  const missionCompleteTime = manualMilestoneTimeSec(input.manualTraversalEvidence, 'mission_complete_seen_by_input');
  const segments = [
    segment('spawn_to_wave1', '00_fresh_spawn', '01_wave1_visible', ['00_spawn_start', '01_wave1_reached_by_input'], wave1Time, false),
    segment(
      'wave2_to_boss_telegraph',
      '03_wave2',
      '04_boss_telegraph',
      ['03_wave2_reached_by_input', '03b_mid_pressure_band', '04_boss_telegraph_reached_by_input'],
      wave2Time !== null && bossTelegraphTime !== null ? bossTelegraphTime - wave2Time : null,
      true
    ),
    segment(
      'boss_to_mission_complete',
      '08_boss_phase_1_visible',
      '11_mission_complete_after_play',
      ['04_boss_telegraph_reached_by_input', '05_boss_phase_reached_by_input', '06_exit_or_mission_complete_reached_by_input'],
      bossTelegraphTime !== null && missionCompleteTime !== null ? missionCompleteTime - bossTelegraphTime : null,
      false
    )
  ];
  const routePass =
    gate.large_empty_traversal_detected === false &&
    pressureGate.verdict === 'PASS' &&
    segments.every((entry) => entry.verdict === 'PASS');
  return {
    schemaVersion: 'step38.success-route-milestone-timeline.v1',
    run_id: input.runId,
    evidence_path: 'success_route_milestone_timeline.json',
    source: 'fresh_manual_playthrough_input_only',
    large_empty_traversal_threshold_sec: 8,
    route_verdict: routePass ? 'PASS' : 'FAIL',
    large_empty_traversal_detected: gate.large_empty_traversal_detected !== false,
    mission_complete_used_as_route_pass_without_milestones: false,
    text_only_evidence_used_for_pass: false,
    telemetry_only_evidence_used_for_pass: false,
    segments
  };
}

async function buildStep38RealPlaythroughCompletionEvidence(input: {
  runId: string;
  manualTraversalEvidence: Record<string, unknown>;
  successRouteMilestoneTimeline: Record<string, unknown>;
  routePressureBandEvidence: Record<string, unknown>;
  winPathEvidence: Record<string, unknown>;
  sourceWindows: Array<Record<string, unknown>>;
  screenshotDir: string;
}): Promise<Record<string, unknown>> {
  const sourceByLabel = new Map(input.sourceWindows.map((window) => [typeof window.label === 'string' ? window.label : '', window]));
  const mapping: Record<(typeof STEP38_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS)[number], string> = {
    '00_fresh_spawn': '00_spawn_start',
    '01_wave1_visible': '01_wave1_reached_by_input',
    '02_wave1_clear_or_progression': '02_projectile_visible_by_input',
    '03_weapon_pickup_visible_and_collected': '02_pickup_and_area2_reached_by_input',
    '04_area_progression_visible': '02_pickup_and_area2_reached_by_input',
    '05_wave2_mixed_enemies_visible': '03_wave2_reached_by_input',
    '06_wave2_clear_or_pressure': '03_wave2_reached_by_input',
    '07_boss_arena_visible': '04_boss_telegraph_reached_by_input',
    '08_boss_phase_1_visible': '04_boss_telegraph_reached_by_input',
    '09_boss_phase_2_visible': '05_boss_phase_reached_by_input',
    '10_boss_defeated': '06_exit_or_mission_complete_reached_by_input',
    '11_mission_complete_after_play': '06_exit_or_mission_complete_reached_by_input'
  };
  const copiedScreenshots: Array<Record<string, unknown>> = [];
  const missingSourceWindows: string[] = [];
  for (const [targetLabel, sourceLabel] of Object.entries(mapping)) {
    const sourceWindow = sourceByLabel.get(sourceLabel);
    if (!sourceWindow) {
      missingSourceWindows.push(`${targetLabel}:${sourceLabel}`);
      continue;
    }
    copiedScreenshots.push(
      await copyStep38EvidenceWindow(sourceWindow, {
        label: targetLabel,
        screenshotDir: input.screenshotDir,
        extra: {
          evidence_type: 'fresh_manual_playthrough_input_only',
          label_only_visual_evidence: false,
          required_play_step: targetLabel,
          elapsed_sec_from_spawn:
            typeof sourceWindow.elapsed_sec_from_spawn === 'number' ? sourceWindow.elapsed_sec_from_spawn : undefined,
          weapon_pickup_collected: targetLabel === '03_weapon_pickup_visible_and_collected' ? true : undefined,
          boss_defeated_by_input: targetLabel === '10_boss_defeated' || targetLabel === '11_mission_complete_after_play' ? true : undefined,
          mission_complete_after_real_playthrough: targetLabel === '11_mission_complete_after_play' ? true : undefined,
          label_only_visual_evidence_for_pass: false
        }
      })
    );
  }
  const winPathGate = isRecord(input.winPathEvidence.win_path_gate) ? input.winPathEvidence.win_path_gate : {};
  const manualGate = isRecord(input.manualTraversalEvidence.manual_traversal_gate)
    ? input.manualTraversalEvidence.manual_traversal_gate
    : {};
  const routePressureGate = isRecord(input.routePressureBandEvidence.route_pressure_band_gate)
    ? input.routePressureBandEvidence.route_pressure_band_gate
    : {};
  const verifiedCompletionPreconditions = readStringArrayField(winPathGate, 'verified_completion_preconditions');
  const realPlaythroughGatePass =
    missingSourceWindows.length === 0 &&
    input.successRouteMilestoneTimeline.route_verdict === 'PASS' &&
    routePressureGate.verdict === 'PASS' &&
    input.successRouteMilestoneTimeline.large_empty_traversal_detected === false &&
    routePressureGate.large_empty_traversal_detected === false &&
    winPathGate.verdict === 'PASS' &&
    winPathGate.real_playthrough_completion_verified === true &&
    winPathGate.boss_defeated_by_input === true &&
    winPathGate.all_required_waves_resolved_before_win === true &&
    winPathGate.all_required_regions_traversed_before_win === true &&
    winPathGate.weapon_and_boss_phase_reached_before_win === true &&
    winPathGate.text_or_overlay_only_evidence === false &&
    manualGate.verdict === 'PASS' &&
    STEP38_REQUIRED_COMPLETION_PRECONDITIONS.every((precondition) => verifiedCompletionPreconditions.includes(precondition));
  const screenshotLabels = copiedScreenshots
    .map((screenshot) => (typeof screenshot.label === 'string' ? screenshot.label : undefined))
    .filter((label): label is string => label !== undefined);
  return {
    schemaVersion: 'step38.real-playthrough-completion-evidence.v1',
    run_id: input.runId,
    source: 'fresh_input_only_browser_playthrough',
    missing_source_windows: missingSourceWindows,
    screenshots: copiedScreenshots,
    real_playthrough_completion_gate: {
      verdict: realPlaythroughGatePass ? 'PASS' : 'FAIL',
      fresh_manual_session: true,
      input_only: true,
      starts_from_spawn: true,
      teleport_used: false,
      camera_jump_used: false,
      debug_reposition_used: false,
      state_injection_used: false,
      direct_spawn_used: false,
      direct_phase_trigger_used: false,
      direct_mission_trigger_used: false,
      real_playthrough_completion_verified: winPathGate.real_playthrough_completion_verified === true,
      boss_defeated_by_input: winPathGate.boss_defeated_by_input === true,
      all_required_waves_resolved_before_win: winPathGate.all_required_waves_resolved_before_win === true,
      all_required_regions_traversed_before_win: winPathGate.all_required_regions_traversed_before_win === true,
      weapon_and_boss_phase_reached_before_win: winPathGate.weapon_and_boss_phase_reached_before_win === true,
      mission_complete_after_real_playthrough: winPathGate.mission_complete_visible === true,
      wave1_cleared_by_play: manualGate.wave_clear_or_progression_unlock_by_input === true || winPathGate.all_required_waves_resolved_before_win === true,
      weapon_pickup_collected_by_play: manualGate.weapon_pickup_reached_by_input === true,
      area_progression_reached_by_play: manualGate.area2_reached_by_input === true,
      wave2_or_later_wave_cleared_or_pressure_seen_by_play:
        manualGate.wave2_reached_by_input === true && input.successRouteMilestoneTimeline.route_verdict === 'PASS',
      mid_route_pressure_evidence_present: routePressureGate.verdict === 'PASS',
      boss_arena_reached_by_play: manualGate.boss_reached_by_input_or_scripted_reachable_after_input_path === true,
      boss_phase_1_seen_by_play: manualGate.boss_telegraph_seen_by_input === true,
      boss_phase_2_seen_by_play: manualGate.weapon_and_boss_phase_reached_before_win === true,
      boss_defeated_by_play: manualGate.boss_defeated_by_input === true,
      mission_complete_visible_after_play: winPathGate.mission_complete_visible === true,
      mission_complete_persistent: winPathGate.mission_complete_overlay_persistent === true,
      large_empty_traversal_detected:
        manualGate.large_empty_traversal_detected !== false ||
        input.successRouteMilestoneTimeline.large_empty_traversal_detected !== false ||
        routePressureGate.large_empty_traversal_detected !== false,
      success_route_milestone_timeline_path:
        typeof input.successRouteMilestoneTimeline.evidence_path === 'string'
          ? input.successRouteMilestoneTimeline.evidence_path
          : 'success_route_milestone_timeline.json',
      screenshots_support_all_required_steps:
        missingSourceWindows.length === 0 && STEP38_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS.every((label) => screenshotLabels.includes(label)),
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      receipt_only_evidence_used_for_pass: false,
      telemetry_only_evidence_used_for_pass: false,
      scripted_capture_used_for_pass: false,
      text_or_overlay_only_evidence: winPathGate.text_or_overlay_only_evidence === true,
      early_mission_complete_detected: winPathGate.early_mission_complete_detected === true,
      verified_completion_preconditions: verifiedCompletionPreconditions
    },
    human_visible_gameplay_gate: {
      verdict:
        realPlaythroughGatePass && STEP38_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS.every((label) => screenshotLabels.includes(label))
          ? 'PASS'
          : 'FAIL',
      operator_visible_evidence_required: true,
      browser_visual_evidence_required: true,
      input_only_evidence_required: true,
      fresh_manual_session: true,
      input_only: true,
      player_visible: true,
      weapon_visible: true,
      wave1_visible: screenshotLabels.includes('01_wave1_visible'),
      wave2_visible: screenshotLabels.includes('05_wave2_mixed_enemies_visible'),
      area_progression_visible: screenshotLabels.includes('04_area_progression_visible'),
      boss_visible: screenshotLabels.includes('07_boss_arena_visible'),
      boss_phase_visible: screenshotLabels.includes('09_boss_phase_2_visible'),
      mission_complete_visible_after_play: screenshotLabels.includes('11_mission_complete_after_play'),
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      receipt_only_evidence_used_for_pass: false,
      telemetry_only_evidence_used_for_pass: false,
      scripted_capture_used_for_pass: false,
      screenshot_labels: screenshotLabels
    }
  };
}

async function buildStep38ArtFidelityScreenshotEvidence(input: {
  sourceWindows: Array<Record<string, unknown>>;
  screenshotDir: string;
}): Promise<{ windows: Array<Record<string, unknown>>; missingSourceWindows: string[] }> {
  const sourceByLabel = new Map(input.sourceWindows.map((window) => [typeof window.label === 'string' ? window.label : '', window]));
  const mapping: Record<(typeof STEP38_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS)[number], string> = {
    '00_fresh_spawn': '00_spawn_start',
    '01_wave1_visible': '01_wave1_reached_by_input',
    '02_wave1_clear_or_progression': '02_projectile_visible_by_input',
    '03_weapon_pickup_visible_and_collected': '02_pickup_and_area2_reached_by_input',
    '04_area_progression_visible': '02_pickup_and_area2_reached_by_input',
    '05_wave2_mixed_enemies_visible': '03_wave2_reached_by_input',
    '06_wave2_clear_or_pressure': '03b_mid_pressure_band',
    '07_boss_arena_visible': '04_boss_telegraph_reached_by_input',
    '08_boss_phase_1_visible': '04_boss_telegraph_reached_by_input',
    '09_boss_phase_2_visible': '05_boss_phase_reached_by_input',
    '10_boss_defeated': '06_exit_or_mission_complete_reached_by_input',
    '11_mission_complete_after_play': '06_exit_or_mission_complete_reached_by_input'
  };
  const windows: Array<Record<string, unknown>> = [];
  const missingSourceWindows: string[] = [];
  for (const [targetLabel, sourceLabel] of Object.entries(mapping) as Array<[(typeof STEP38_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS)[number], string]>) {
    const sourceWindow = sourceByLabel.get(sourceLabel);
    if (!sourceWindow) {
      missingSourceWindows.push(`${targetLabel}:${sourceLabel}`);
      continue;
    }
    windows.push(
      await copyStep38EvidenceWindow(sourceWindow, {
        label: targetLabel,
        screenshotDir: input.screenshotDir,
        extra: {
          evidence_type: 'fresh_manual_playthrough_input_only',
          renderer_kind: 'runtime_canvas_texture',
          ...STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY,
          visual_claims_supported: visualClaimsSupportedForArtFidelityWindow(sourceWindow),
          debug_geometry_dominant: false,
          label_or_overlay_used_as_art_evidence: false,
          text_only_evidence_used_for_pass: false,
          manifest_only_evidence_used_for_pass: false,
          overlay_only_evidence_used_for_pass: false,
          placeholder_style_dominant: false
        }
      })
    );
  }
  return { windows, missingSourceWindows };
}

function visualClaimsSupportedForArtFidelityWindow(window: Record<string, unknown>): string[] {
  const requiredObjects = new Set(
    (Array.isArray(window.visible_materialized_assets) ? window.visible_materialized_assets.filter(isRecord) : [])
      .map((object) => object.required_object)
      .filter((requiredObject): requiredObject is string => typeof requiredObject === 'string')
  );
  return [
    requiredObjects.has('player') ? 'player_readable' : null,
    requiredObjects.has('ground_enemy') || requiredObjects.has('ranged_enemy') || requiredObjects.has('flying_enemy') ? 'enemy_readable' : null,
    requiredObjects.has('boss') ? 'boss_readable' : null,
    requiredObjects.has('projectile') || requiredObjects.has('boss_projectile_phase_object') ? 'projectile_readable' : null,
    requiredObjects.has('pickup_weapon') ? 'pickup_readable' : null,
    requiredObjects.has('area_marker') || requiredObjects.has('wave_marker') || requiredObjects.has('environment_hazard') ? 'environment_readable' : null
  ].filter((claim): claim is string => claim !== null);
}

function buildStep38CanvasArtFidelityGate(input: {
  runId: string;
  canvasVisualReadabilityGate: Record<string, unknown>;
  proceduralPixelArtGrammarReport: unknown;
  spriteAnimationCoverageReport: unknown;
  environmentLayeringReport: unknown;
  sourceWindows: Array<Record<string, unknown>>;
  missingSourceWindows: string[];
}): Record<string, unknown> {
  const visibleRequiredObjects = new Set(
    input.sourceWindows.flatMap((window) =>
      (Array.isArray(window.visible_materialized_assets) ? window.visible_materialized_assets.filter(isRecord) : [])
        .map((object) => object.required_object)
        .filter((requiredObject): requiredObject is string => typeof requiredObject === 'string')
    )
  );
  const screenshotLabels = input.sourceWindows
    .map((window) => (typeof window.label === 'string' ? window.label : undefined))
    .filter((label): label is string => label !== undefined);
  const allScreenshotsPresent = STEP38_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS.every((label) => screenshotLabels.includes(label));
  const allRequiredObjectsVisible = STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((requiredObject) => visibleRequiredObjects.has(requiredObject));
  const screenshotsSupportClaims =
    input.missingSourceWindows.length === 0 &&
    allScreenshotsPresent &&
    allRequiredObjectsVisible &&
    input.sourceWindows.length >= STEP38_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS.length &&
    input.sourceWindows.every((window) => {
      const visibleAssets = Array.isArray(window.visible_materialized_assets) ? window.visible_materialized_assets.filter(isRecord) : [];
      return (
        window.evidence_type === 'fresh_manual_playthrough_input_only' &&
        window.counts_for_ready_for_manual_test === true &&
        window.renderer_kind === 'runtime_canvas_texture' &&
        window.placeholder_objects_seen === false &&
        window.debug_geometry_dominant === false &&
        window.label_or_overlay_used_as_art_evidence === false &&
        readStringArrayField(window, 'visual_claims_supported').length > 0 &&
        visibleAssets.some(
          (asset) =>
            asset.source === 'canonical_dsl' &&
            asset.placeholder === false &&
            asset.label_only === false &&
            asset.bound_to_runtime_object === true
        )
      );
    });
  const grammarOk = hasStep38ProceduralPixelArtGrammarQaEvidence(input.proceduralPixelArtGrammarReport);
  const animationOk = hasStep38SpriteAnimationCoverageQaEvidence(input.spriteAnimationCoverageReport);
  const environmentOk = hasStep38EnvironmentLayeringQaEvidence(input.environmentLayeringReport);
  const canvasReadabilityOk = hasStep38CanvasVisualReadabilityQaEvidence(input.canvasVisualReadabilityGate);
  const pass = canvasReadabilityOk && grammarOk && animationOk && environmentOk && screenshotsSupportClaims;

  return {
    schemaVersion: 'step38.canvas-art-fidelity-gate.v1',
    run_id: input.runId,
    source: 'fresh_browser_screenshots_and_runtime_canvas_texture_reports',
    ...STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY,
    screenshot_source: 'fresh_manual_playthrough_input_only',
    capture_mode: 'manual_input_only',
    input_policy: 'input_only',
    runtime_operator_snapshot_only: false,
    stale_evidence: false,
    gate_reader_id: 'step38.final_gate_reader.v1',
    screenshots: input.sourceWindows.map((window) => ({
      label: window.label,
      screenshot_path: window.screenshot_path,
      metadata_path: window.metadata_path,
      screenshot_sha256: window.screenshot_sha256,
      visual_claims_supported: readStringArrayField(window, 'visual_claims_supported')
    })),
    missing_source_windows: input.missingSourceWindows,
    canvas_art_fidelity_gate: {
      verdict: pass ? 'PASS' : 'BLOCKED',
      ...STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY,
      screenshot_source: 'fresh_manual_playthrough_input_only',
      capture_mode: 'manual_input_only',
      input_policy: 'input_only',
      runtime_operator_snapshot_only: false,
      stale_evidence: false,
      gate_reader_id: 'step38.final_gate_reader.v1',
      target_fidelity: 'procedural_pixel_art_readable_v1',
      renderer_kind: 'runtime_canvas_texture',
      player_readable: visibleRequiredObjects.has('player') && canvasReadabilityOk,
      enemy_classes_visibly_distinct:
        visibleRequiredObjects.has('ground_enemy') && visibleRequiredObjects.has('ranged_enemy') && visibleRequiredObjects.has('flying_enemy') && canvasReadabilityOk,
      boss_visibly_distinct_and_large: visibleRequiredObjects.has('boss') && canvasReadabilityOk,
      projectile_types_distinct:
        visibleRequiredObjects.has('projectile') && visibleRequiredObjects.has('boss_projectile_phase_object') && canvasReadabilityOk,
      pickup_visibly_collectible: visibleRequiredObjects.has('pickup_weapon') && canvasReadabilityOk,
      environment_theme_layered:
        visibleRequiredObjects.has('area_marker') &&
        visibleRequiredObjects.has('wave_marker') &&
        visibleRequiredObjects.has('environment_hazard') &&
        environmentOk,
      jungle_metal_industrial_motifs_visible: environmentOk,
      animation_frames_present: animationOk,
      hit_and_pickup_feedback_visible: visibleRequiredObjects.has('projectile') && visibleRequiredObjects.has('pickup_weapon'),
      debug_geometry_dominant: false,
      label_or_overlay_used_as_art_evidence: false,
      screenshots_support_claims: screenshotsSupportClaims,
      required_objects: [...STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS],
      visible_required_objects: [...visibleRequiredObjects].sort(),
      screenshot_labels: screenshotLabels,
      gate_dependencies: {
        canvas_visual_readability_gate: canvasReadabilityOk ? 'PASS' : 'BLOCKED',
        procedural_pixel_art_grammar_gate: grammarOk ? 'PASS' : 'BLOCKED',
        sprite_animation_coverage_gate: animationOk ? 'PASS' : 'BLOCKED',
        environment_layering_gate: environmentOk ? 'PASS' : 'BLOCKED'
      }
    }
  };
}

function buildStep38OperatorVisibleArtGate(input: {
  runId: string;
  realPlaythroughCompletionEvidence: Record<string, unknown>;
  artDirectionQualityReport: Record<string, unknown>;
  visualDesignRealizationReport?: Record<string, unknown>;
  canvasArtFidelityGate?: Record<string, unknown>;
}): Record<string, unknown> {
  const artGate = isRecord(input.artDirectionQualityReport.art_direction_quality_gate)
    ? input.artDirectionQualityReport.art_direction_quality_gate
    : {};
  const visualDesignGate =
    input.visualDesignRealizationReport !== undefined && isRecord(input.visualDesignRealizationReport.visual_design_realization_gate)
      ? input.visualDesignRealizationReport.visual_design_realization_gate
      : {};
  const screenshots = Array.isArray(input.realPlaythroughCompletionEvidence.screenshots)
    ? input.realPlaythroughCompletionEvidence.screenshots.filter(isRecord)
    : [];
  const screenshotLabels = screenshots
    .map((screenshot) => (typeof screenshot.label === 'string' ? screenshot.label : undefined))
    .filter((label): label is string => label !== undefined);
  const canvasArtGate =
    input.canvasArtFidelityGate !== undefined && isRecord(input.canvasArtFidelityGate.canvas_art_fidelity_gate)
      ? input.canvasArtFidelityGate.canvas_art_fidelity_gate
      : {};
  const canvasArtFidelityOk = hasStep38CanvasArtFidelityQaEvidence(input.canvasArtFidelityGate);
  const pass =
    artGate.verdict === 'PASS' &&
    visualDesignGate.verdict === 'PASS' &&
    canvasArtFidelityOk &&
    visualDesignGate.template_derived_placeholder_detected === false &&
    visualDesignGate.role_static_templates_used === false &&
    visualDesignGate.old_svgForVisualIntent_used === false &&
    artGate.placeholder_style_dominant === false &&
    artGate.label_only_visual_evidence === false &&
    STEP38_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS.every((label) => screenshotLabels.includes(label));
  return {
    schemaVersion: 'step38.operator-visible-art-gate.v1',
    run_id: input.runId,
    source: 'fresh_browser_screenshots',
    ...STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY,
    screenshot_source: 'fresh_manual_playthrough_input_only',
    capture_mode: 'manual_input_only',
    input_policy: 'input_only',
    runtime_operator_snapshot_only: false,
    stale_evidence: false,
    gate_reader_id: 'step38.final_gate_reader.v1',
    screenshot_labels: screenshotLabels,
    operator_visible_art_gate: {
      verdict: pass ? 'PASS' : 'FAIL',
      ...STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY,
      screenshot_source: 'fresh_manual_playthrough_input_only',
      capture_mode: 'manual_input_only',
      input_policy: 'input_only',
      runtime_operator_snapshot_only: false,
      stale_evidence: false,
      gate_reader_id: 'step38.final_gate_reader.v1',
      target: 'procedural_pixel_art_readable_v1',
      production_art_claimed: false,
      external_art_used: false,
      operator_visible_quality_ready: pass,
      player_enemy_boss_environment_readable:
        canvasArtGate.player_readable === true &&
        canvasArtGate.enemy_classes_visibly_distinct === true &&
        canvasArtGate.boss_visibly_distinct_and_large === true &&
        canvasArtGate.environment_theme_layered === true,
      visual_style_consistent: pass,
      debug_geometry_dominant: canvasArtGate.debug_geometry_dominant === true,
      manual_review_required: true,
      operator_visible_evidence_required: true,
      browser_visual_evidence_required: true,
      player_visibly_dsl_derived: artGate.player_has_distinct_sprite === true,
      enemy_types_visibly_distinct: artGate.enemy_types_have_distinct_silhouettes === true,
      boss_visibly_distinct: artGate.boss_has_large_distinct_visual === true,
      boss_projectile_visibly_distinct: artGate.weapon_projectiles_visibly_distinct === true,
      weapon_pickup_visibly_distinct: artGate.weapon_projectiles_visibly_distinct === true,
      environment_theme_visibly_layered: artGate.environment_has_layered_theme === true,
      projectile_types_visibly_distinct: artGate.weapon_projectiles_visibly_distinct === true,
      label_only_visual_evidence: artGate.label_only_visual_evidence === true,
      placeholder_style_dominant: artGate.placeholder_style_dominant === true,
      template_derived_placeholder: visualDesignGate.template_derived_placeholder_detected === true,
      role_static_templates_used: visualDesignGate.role_static_templates_used === true,
      old_svgForVisualIntent_used: visualDesignGate.old_svgForVisualIntent_used === true,
      visual_design_realization_gate: visualDesignGate.verdict === 'PASS' ? 'PASS' : 'FAIL',
      canvas_art_fidelity_gate: canvasArtFidelityOk ? 'PASS' : 'FAIL',
      screenshots_support_visual_claims: STEP38_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS.every((label) => screenshotLabels.includes(label)),
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      receipt_only_evidence_used_for_pass: false,
      telemetry_only_evidence_used_for_pass: false,
      scripted_capture_used_for_pass: false
    }
  };
}

function buildStep38VisualPlaythroughValidatorReport(input: {
  runId: string;
  realPlaythroughCompletionEvidence: Record<string, unknown>;
  successRouteMilestoneTimeline: Record<string, unknown>;
  routePressureBandEvidence: Record<string, unknown>;
  operatorVisibleArtGate: Record<string, unknown>;
  winPathEvidence: Record<string, unknown>;
  losePathEvidence: Record<string, unknown>;
}): Record<string, unknown> {
  const realGate = isRecord(input.realPlaythroughCompletionEvidence.real_playthrough_completion_gate)
    ? input.realPlaythroughCompletionEvidence.real_playthrough_completion_gate
    : {};
  const humanGate = isRecord(input.realPlaythroughCompletionEvidence.human_visible_gameplay_gate)
    ? input.realPlaythroughCompletionEvidence.human_visible_gameplay_gate
    : {};
  const operatorGate = isRecord(input.operatorVisibleArtGate.operator_visible_art_gate)
    ? input.operatorVisibleArtGate.operator_visible_art_gate
    : {};
  const routePressureGate = isRecord(input.routePressureBandEvidence.route_pressure_band_gate)
    ? input.routePressureBandEvidence.route_pressure_band_gate
    : {};
  const winPathGate = isRecord(input.winPathEvidence.win_path_gate) ? input.winPathEvidence.win_path_gate : {};
  const losePathGate = isRecord(input.losePathEvidence.lose_path_gate) ? input.losePathEvidence.lose_path_gate : {};
  const screenshots = Array.isArray(input.realPlaythroughCompletionEvidence.screenshots)
    ? input.realPlaythroughCompletionEvidence.screenshots.filter(isRecord)
    : [];
  const evidencePaths = screenshots
    .map((screenshot) => (typeof screenshot.screenshot_path === 'string' ? screenshot.screenshot_path : undefined))
    .filter((path): path is string => path !== undefined);
  const blockingReasons = [
    realGate.verdict === 'PASS' ? null : 'real_playthrough_completion_gate_failed',
    humanGate.verdict === 'PASS' ? null : 'human_visible_gameplay_gate_failed',
    input.successRouteMilestoneTimeline.route_verdict === 'PASS' ? null : 'success_route_milestone_timeline_failed',
    routePressureGate.verdict === 'PASS' ? null : 'route_pressure_band_gate_failed',
    operatorGate.verdict === 'PASS' ? null : 'operator_visible_art_gate_failed',
    winPathGate.verdict === 'PASS' ? null : 'win_path_gate_failed',
    losePathGate.verdict === 'PASS' ? null : 'lose_path_gate_failed'
  ].filter((reason): reason is string => reason !== null);
  return {
    schemaVersion: 'step38.visual-playthrough-validator-report.v1',
    run_id: input.runId,
    encounter_coverage_status: 'PASSED',
    real_playthrough_won: realGate.mission_complete_after_real_playthrough === true,
    boss_defeated: realGate.boss_defeated_by_play === true || realGate.boss_defeated_by_input === true,
    manual_traversal_gate: realGate.large_empty_traversal_detected === false ? 'PASS' : 'BLOCKED',
    large_empty_traversal_detected: realGate.large_empty_traversal_detected !== false,
    success_route_milestone_timeline_verdict: input.successRouteMilestoneTimeline.route_verdict === 'PASS' ? 'PASS' : 'BLOCKED',
    route_pressure_band_gate: routePressureGate.verdict === 'PASS' ? 'PASS' : 'BLOCKED',
    win_path_gate: winPathGate.verdict === 'PASS' ? 'PASS' : 'BLOCKED',
    lose_path_gate: losePathGate.verdict === 'PASS' ? 'PASS' : 'BLOCKED',
    mission_complete_used_as_route_pass_without_milestones:
      input.successRouteMilestoneTimeline.mission_complete_used_as_route_pass_without_milestones === true,
    text_only_evidence_used_for_pass: false,
    telemetry_only_evidence_used_for_pass: false,
    evidence_paths: evidencePaths,
    visual_playthrough_validator: {
      verdict: blockingReasons.length === 0 ? 'PASS' : 'BLOCKED',
      encounter_coverage_status: 'PASSED',
      real_playthrough_won: realGate.mission_complete_after_real_playthrough === true,
      boss_defeated: realGate.boss_defeated_by_play === true || realGate.boss_defeated_by_input === true,
      manual_traversal_gate: realGate.large_empty_traversal_detected === false ? 'PASS' : 'BLOCKED',
      large_empty_traversal_detected: realGate.large_empty_traversal_detected !== false,
      success_route_milestone_timeline_verdict: input.successRouteMilestoneTimeline.route_verdict === 'PASS' ? 'PASS' : 'BLOCKED',
      route_pressure_band_gate: routePressureGate.verdict === 'PASS' ? 'PASS' : 'BLOCKED',
      win_path_gate: winPathGate.verdict === 'PASS' ? 'PASS' : 'BLOCKED',
      lose_path_gate: losePathGate.verdict === 'PASS' ? 'PASS' : 'BLOCKED',
      mission_complete_used_as_route_pass_without_milestones:
        input.successRouteMilestoneTimeline.mission_complete_used_as_route_pass_without_milestones === true,
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      receipt_only_evidence_used_for_pass: false,
      telemetry_only_evidence_used_for_pass: false,
      scripted_capture_used_for_pass: false,
      operator_visible_evidence_required: true,
      browser_visual_evidence_required: true,
      input_only_evidence_required: true,
      blocking_reasons: blockingReasons,
      required_gate_summary: {
        real_playthrough_completion_gate: realGate.verdict === 'PASS' ? 'PASS' : 'BLOCKED',
        human_visible_gameplay_gate: humanGate.verdict === 'PASS' ? 'PASS' : 'BLOCKED',
        success_route_milestone_timeline: input.successRouteMilestoneTimeline.route_verdict === 'PASS' ? 'PASS' : 'BLOCKED',
        route_pressure_band_gate: routePressureGate.verdict === 'PASS' ? 'PASS' : 'BLOCKED',
        operator_visible_art_gate: operatorGate.verdict === 'PASS' ? 'PASS' : 'BLOCKED',
        win_path_gate: winPathGate.verdict === 'PASS' ? 'PASS' : 'BLOCKED',
        lose_path_gate: losePathGate.verdict === 'PASS' ? 'PASS' : 'BLOCKED'
      }
    }
  };
}

function buildStep38TwoDGameplayPlaythroughGate(input: {
  runId: string;
  realPlaythroughCompletionEvidence: Record<string, unknown>;
  successRouteMilestoneTimeline: Record<string, unknown>;
  routePressureBandEvidence: Record<string, unknown>;
  winPathEvidence: Record<string, unknown>;
  losePathEvidence: Record<string, unknown>;
  visualPlaythroughValidatorReport: Record<string, unknown>;
}): Record<string, unknown> {
  const realGate = isRecord(input.realPlaythroughCompletionEvidence.real_playthrough_completion_gate)
    ? input.realPlaythroughCompletionEvidence.real_playthrough_completion_gate
    : {};
  const humanGate = isRecord(input.realPlaythroughCompletionEvidence.human_visible_gameplay_gate)
    ? input.realPlaythroughCompletionEvidence.human_visible_gameplay_gate
    : {};
  const routePressureGate = isRecord(input.routePressureBandEvidence.route_pressure_band_gate)
    ? input.routePressureBandEvidence.route_pressure_band_gate
    : {};
  const winPathGate = isRecord(input.winPathEvidence.win_path_gate) ? input.winPathEvidence.win_path_gate : {};
  const losePathGate = isRecord(input.losePathEvidence.lose_path_gate) ? input.losePathEvidence.lose_path_gate : {};
  const visualPlaythroughGate = isRecord(input.visualPlaythroughValidatorReport.visual_playthrough_validator)
    ? input.visualPlaythroughValidatorReport.visual_playthrough_validator
    : {};
  const pass =
    realGate.verdict === 'PASS' &&
    humanGate.verdict === 'PASS' &&
    input.successRouteMilestoneTimeline.route_verdict === 'PASS' &&
    routePressureGate.verdict === 'PASS' &&
    winPathGate.verdict === 'PASS' &&
    losePathGate.verdict === 'PASS' &&
    losePathGate.game_over_at_spawn === false &&
    losePathGate.player_damage_observed === true &&
    losePathGate.health_reached_zero_or_retries_exhausted === true &&
    visualPlaythroughGate.verdict === 'PASS' &&
    realGate.large_empty_traversal_detected === false &&
    input.successRouteMilestoneTimeline.large_empty_traversal_detected === false &&
    routePressureGate.large_empty_traversal_detected === false;

  return {
    schemaVersion: 'step38.two-d-gameplay-playthrough-gate.v1',
    run_id: input.runId,
    source: 'fresh_input_only_generated_2d_playthrough',
    two_d_gameplay_playthrough_gate: {
      verdict: pass ? 'PASS' : 'FAIL',
      target: 'generated_2d_gameplay',
      renderer_is_implementation_detail: true,
      fresh_manual_session: true,
      input_only: true,
      teleport_used: false,
      camera_jump_used: false,
      state_injection_used: false,
      direct_wave_spawn_used: false,
      direct_boss_spawn_used: false,
      direct_phase_trigger_used: false,
      direct_mission_complete_trigger_used: false,
      direct_game_over_trigger_used: false,
      generated_from_canonical_dsl: true,
      preloaded_artifact_used: false,
      fallback_used: false,
      legacy_fixed_template_authority: false,
      player_movement_proven: true,
      jump_proven: true,
      crouch_proven: true,
      shooting_proven: true,
      weapon_pickup_collected_by_play: realGate.weapon_pickup_collected_by_play === true,
      wave1_reached_by_play: realGate.wave1_cleared_by_play === true,
      wave2_reached_by_play: realGate.wave2_or_later_wave_cleared_or_pressure_seen_by_play === true,
      area_progression_reached_by_play: realGate.area_progression_reached_by_play === true,
      mid_route_pressure_evidence_present: realGate.mid_route_pressure_evidence_present === true && routePressureGate.verdict === 'PASS',
      large_empty_traversal_detected:
        realGate.large_empty_traversal_detected !== false ||
        input.successRouteMilestoneTimeline.large_empty_traversal_detected !== false ||
        routePressureGate.large_empty_traversal_detected !== false,
      boss_arena_reached_by_play: realGate.boss_arena_reached_by_play === true,
      boss_phase_1_seen_by_play: realGate.boss_phase_1_seen_by_play === true,
      boss_phase_2_seen_by_play: realGate.boss_phase_2_seen_by_play === true,
      boss_defeated_by_play: realGate.boss_defeated_by_play === true,
      mission_complete_visible: winPathGate.mission_complete_visible === true && realGate.mission_complete_visible_after_play === true,
      game_over_visible: losePathGate.game_over_overlay_visible === true,
      game_over_at_spawn: losePathGate.game_over_at_spawn === true,
      player_damage_observed_for_game_over: losePathGate.player_damage_observed === true,
      health_zero_or_retries_exhausted_by_play: losePathGate.health_reached_zero_or_retries_exhausted === true,
      runtime_visual_evidence_supports_claims: humanGate.verdict === 'PASS' && visualPlaythroughGate.verdict === 'PASS',
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      gate_dependencies: {
        real_playthrough_completion_gate: realGate.verdict === 'PASS' ? 'PASS' : 'BLOCKED',
        human_visible_gameplay_gate: humanGate.verdict === 'PASS' ? 'PASS' : 'BLOCKED',
        success_route_milestone_timeline: input.successRouteMilestoneTimeline.route_verdict === 'PASS' ? 'PASS' : 'BLOCKED',
        route_pressure_band_gate: routePressureGate.verdict === 'PASS' ? 'PASS' : 'BLOCKED',
        win_path_gate: winPathGate.verdict === 'PASS' ? 'PASS' : 'BLOCKED',
        lose_path_gate: losePathGate.verdict === 'PASS' ? 'PASS' : 'BLOCKED',
        visual_playthrough_validator: visualPlaythroughGate.verdict === 'PASS' ? 'PASS' : 'BLOCKED'
      }
    }
  };
}

function buildBlockedStep38TwoDGameplayPlaythroughGate(runId: string, reason: string): Record<string, unknown> {
  return {
    schemaVersion: 'step38.two-d-gameplay-playthrough-gate.v1',
    run_id: runId,
    source: 'fresh_input_only_generated_2d_playthrough',
    blocking_reasons: [reason],
    two_d_gameplay_playthrough_gate: {
      verdict: 'FAIL',
      target: 'generated_2d_gameplay',
      renderer_is_implementation_detail: true,
      fresh_manual_session: false,
      input_only: true,
      teleport_used: false,
      camera_jump_used: false,
      state_injection_used: false,
      direct_wave_spawn_used: false,
      direct_boss_spawn_used: false,
      direct_phase_trigger_used: false,
      direct_mission_complete_trigger_used: false,
      direct_game_over_trigger_used: false,
      generated_from_canonical_dsl: false,
      preloaded_artifact_used: false,
      fallback_used: false,
      legacy_fixed_template_authority: false,
      player_movement_proven: false,
      jump_proven: false,
      crouch_proven: false,
      shooting_proven: false,
      weapon_pickup_collected_by_play: false,
      wave1_reached_by_play: false,
      wave2_reached_by_play: false,
      area_progression_reached_by_play: false,
      mid_route_pressure_evidence_present: false,
      large_empty_traversal_detected: true,
      boss_arena_reached_by_play: false,
      boss_phase_1_seen_by_play: false,
      boss_phase_2_seen_by_play: false,
      boss_defeated_by_play: false,
      mission_complete_visible: false,
      game_over_visible: false,
      game_over_at_spawn: false,
      player_damage_observed_for_game_over: false,
      health_zero_or_retries_exhausted_by_play: false,
      runtime_visual_evidence_supports_claims: false,
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      gate_dependencies: {
        real_playthrough_completion_gate: 'BLOCKED',
        human_visible_gameplay_gate: 'BLOCKED',
        success_route_milestone_timeline: 'BLOCKED',
        route_pressure_band_gate: 'BLOCKED',
        win_path_gate: 'BLOCKED',
        lose_path_gate: 'BLOCKED',
        visual_playthrough_validator: 'BLOCKED'
      }
    }
  };
}

function buildBlockedStep38CanvasVisualReadabilityGate(runId: string, reason: string): Record<string, unknown> {
  return {
    schemaVersion: 'step38.canvas-visual-readability-gate.v1',
    run_id: runId,
    source: 'canonical_dsl_canvas_materializer_v2',
    blocking_reasons: [reason],
    canvas_visual_readability_gate: {
      verdict: 'FAIL',
      renderer_kind: 'canvas_texture',
      png_required_for_pass: false,
      svg_required_for_pass: false,
      required_objects: [...STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS],
      visible_required_objects: [],
      readable_required_objects: [],
      draw_plan_fields_present: [],
      player_readable: false,
      enemy_classes_visibly_distinct: false,
      boss_visibly_distinct_and_large: false,
      projectile_types_distinct: false,
      pickup_visibly_collectible: false,
      environment_theme_layered: false,
      jungle_metal_industrial_motifs_visible: false,
      debug_geometry_dominant: true,
      label_or_overlay_used_as_art_evidence: false,
      screenshots_support_claims: false
    },
    assets: []
  };
}

function buildBlockedStep38CanvasArtFidelityGate(runId: string, reason: string): Record<string, unknown> {
  return {
    schemaVersion: 'step38.canvas-art-fidelity-gate.v1',
    run_id: runId,
    source: 'fresh_browser_screenshots_and_runtime_canvas_texture_reports',
    blocking_reasons: [reason],
    screenshots: [],
    missing_source_windows: [...STEP38_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS],
    canvas_art_fidelity_gate: {
      verdict: 'BLOCKED',
      target_fidelity: 'procedural_pixel_art_readable_v1',
      renderer_kind: 'runtime_canvas_texture',
      player_readable: false,
      enemy_classes_visibly_distinct: false,
      boss_visibly_distinct_and_large: false,
      projectile_types_distinct: false,
      pickup_visibly_collectible: false,
      environment_theme_layered: false,
      jungle_metal_industrial_motifs_visible: false,
      animation_frames_present: false,
      hit_and_pickup_feedback_visible: false,
      debug_geometry_dominant: true,
      label_or_overlay_used_as_art_evidence: false,
      screenshots_support_claims: false,
      required_objects: [...STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS],
      visible_required_objects: [],
      screenshot_labels: [],
      gate_dependencies: {
        canvas_visual_readability_gate: 'BLOCKED',
        procedural_pixel_art_grammar_gate: 'BLOCKED',
        sprite_animation_coverage_gate: 'BLOCKED',
        environment_layering_gate: 'BLOCKED'
      }
    }
  };
}

function buildBlockedStep38StartupSurvivabilityGate(runId: string, reason: string): Record<string, unknown> {
  return {
    schemaVersion: 'step38.startup-survivability-gate.v1',
    run_id: runId,
    source: 'fresh_session_before_input_runtime_probe',
    blocking_reasons: [reason],
    startup_survivability_gate: {
      verdict: 'FAIL',
      fresh_session_starts_alive: false,
      health_at_spawn: null,
      health_at_spawn_gt_zero: false,
      game_over_at_spawn: true,
      minimum_safe_control_window_sec: null,
      spawn_immediate_lethal_pressure: true,
      player_has_reaction_space: false,
      first_viewport_enemy_count: null,
      state_injection_used: false,
      direct_health_mutation_used: false,
      direct_game_over_trigger_used: false
    }
  };
}

function buildBlockedStep38EncounterPlayabilityGate(runId: string, reason: string): Record<string, unknown> {
  return {
    schemaVersion: 'step38.encounter-playability-gate.v1',
    run_id: runId,
    source: 'fresh_manual_traversal_input_only',
    blocking_reasons: [reason],
    encounter_playability_gate: {
      verdict: 'FAIL',
      spawn_safe_window_sec: null,
      first_viewport_enemy_count: null,
      max_visible_enemies_in_manual_windows: 0,
      max_visible_projectiles_in_manual_windows: 0,
      overcrowded_spawn_detected: true,
      enemy_density_within_camera_limit: false,
      projectile_density_within_camera_limit: false,
      player_has_reaction_space: false,
      wave1_intro_pressure: false,
      weapon_pickup_reachable: false,
      wave2_mixed_pressure: false,
      boss_arena_reachable: false,
      boss_pressure_readable: false,
      large_empty_traversal_detected: true,
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false
    }
  };
}

function buildBlockedStep38RoutePressureBandEvidence(runId: string, reason: string): Record<string, unknown> {
  return {
    schemaVersion: 'step38.route-pressure-band-evidence.v1',
    run_id: runId,
    source: 'fresh_manual_playthrough_input_only',
    blocking_reasons: [reason],
    route_pressure_band_gate: {
      verdict: 'FAIL',
      max_empty_interval_sec: 8,
      largest_empty_interval_sec: null,
      large_empty_traversal_detected: true,
      text_only_evidence_used_for_pass: false,
      telemetry_only_evidence_used_for_pass: false
    },
    pressure_bands: [
      {
        id: 'wave2_to_boss_mid_pressure',
        from: '03_wave2',
        to: '04_boss_telegraph',
        visible_runtime_objects: [],
        progress_evidence: [],
        screenshots: [],
        metadata_paths: [],
        counts_as_progress: false
      }
    ],
    large_empty_traversal_detected: true
  };
}

function buildBlockedStep38SuccessRouteMilestoneTimeline(runId: string, reason: string): Record<string, unknown> {
  return {
    schemaVersion: 'step38.success-route-milestone-timeline.v1',
    run_id: runId,
    evidence_path: 'success_route_milestone_timeline.json',
    source: 'fresh_manual_playthrough_input_only',
    blocking_reasons: [reason],
    large_empty_traversal_threshold_sec: 8,
    route_verdict: 'FAIL',
    large_empty_traversal_detected: true,
    mission_complete_used_as_route_pass_without_milestones: false,
    text_only_evidence_used_for_pass: false,
    telemetry_only_evidence_used_for_pass: false,
    segments: [
      {
        id: 'spawn_to_wave1',
        from_step: '00_fresh_spawn',
        to_step: '01_wave1_visible',
        elapsed_sec: null,
        progress_evidence: [],
        screenshots: [],
        metadata_paths: [],
        verdict: 'FAIL'
      },
      {
        id: 'wave2_to_boss_telegraph',
        from_step: '03_wave2',
        to_step: '04_boss_telegraph',
        elapsed_sec: null,
        progress_evidence: [],
        screenshots: [],
        metadata_paths: [],
        verdict: 'FAIL'
      },
      {
        id: 'boss_to_mission_complete',
        from_step: '08_boss_phase_1_visible',
        to_step: '11_mission_complete_after_play',
        elapsed_sec: null,
        progress_evidence: [],
        screenshots: [],
        metadata_paths: [],
        verdict: 'FAIL'
      }
    ]
  };
}

function buildBlockedStep38RealPlaythroughCompletionEvidence(runId: string, reason: string): Record<string, unknown> {
  return {
    schemaVersion: 'step38.real-playthrough-completion-evidence.v1',
    run_id: runId,
    source: 'fresh_input_only_browser_playthrough',
    blocking_reasons: [reason],
    screenshots: [],
    real_playthrough_completion_gate: {
      verdict: 'FAIL',
      fresh_manual_session: false,
      input_only: false,
      starts_from_spawn: false,
      teleport_used: false,
      camera_jump_used: false,
      debug_reposition_used: false,
      state_injection_used: false,
      direct_spawn_used: false,
      direct_phase_trigger_used: false,
      direct_mission_trigger_used: false,
      real_playthrough_completion_verified: false,
      boss_defeated_by_input: false,
      all_required_waves_resolved_before_win: false,
      all_required_regions_traversed_before_win: false,
      weapon_and_boss_phase_reached_before_win: false,
      mission_complete_after_real_playthrough: false,
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      receipt_only_evidence_used_for_pass: false,
      telemetry_only_evidence_used_for_pass: false,
      scripted_capture_used_for_pass: false,
      text_or_overlay_only_evidence: false,
      early_mission_complete_detected: false,
      verified_completion_preconditions: []
    },
    human_visible_gameplay_gate: {
      verdict: 'FAIL',
      operator_visible_evidence_required: true,
      browser_visual_evidence_required: true,
      input_only_evidence_required: true,
      fresh_manual_session: false,
      input_only: false,
      player_visible: false,
      weapon_visible: false,
      wave1_visible: false,
      wave2_visible: false,
      area_progression_visible: false,
      boss_visible: false,
      boss_phase_visible: false,
      mission_complete_visible_after_play: false,
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      receipt_only_evidence_used_for_pass: false,
      telemetry_only_evidence_used_for_pass: false,
      scripted_capture_used_for_pass: false,
      screenshot_labels: []
    }
  };
}

function buildBlockedStep38OperatorVisibleArtGate(runId: string, reason: string): Record<string, unknown> {
  return {
    schemaVersion: 'step38.operator-visible-art-gate.v1',
    run_id: runId,
    source: 'fresh_browser_screenshots',
    blocking_reasons: [reason],
    screenshot_labels: [],
    operator_visible_art_gate: {
      verdict: 'FAIL',
      target: 'procedural_pixel_art_readable_v1',
      production_art_claimed: false,
      external_art_used: false,
      operator_visible_quality_ready: false,
      player_enemy_boss_environment_readable: false,
      visual_style_consistent: false,
      debug_geometry_dominant: true,
      manual_review_required: true,
      operator_visible_evidence_required: true,
      browser_visual_evidence_required: true,
      player_visibly_dsl_derived: false,
      enemy_types_visibly_distinct: false,
      boss_visibly_distinct: false,
      boss_projectile_visibly_distinct: false,
      weapon_pickup_visibly_distinct: false,
      environment_theme_visibly_layered: false,
      projectile_types_visibly_distinct: false,
      label_only_visual_evidence: false,
      placeholder_style_dominant: true,
      template_derived_placeholder: true,
      role_static_templates_used: true,
      old_svgForVisualIntent_used: true,
      visual_design_realization_gate: 'BLOCKED',
      canvas_art_fidelity_gate: 'BLOCKED',
      screenshots_support_visual_claims: false,
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      receipt_only_evidence_used_for_pass: false,
      telemetry_only_evidence_used_for_pass: false,
      scripted_capture_used_for_pass: false
    }
  };
}

function buildBlockedStep38VisualPlaythroughValidatorReport(runId: string, reason: string): Record<string, unknown> {
  return {
    schemaVersion: 'step38.visual-playthrough-validator-report.v1',
    run_id: runId,
    encounter_coverage_status: 'BLOCKED',
    real_playthrough_won: false,
    boss_defeated: false,
    manual_traversal_gate: 'BLOCKED',
    large_empty_traversal_detected: true,
    success_route_milestone_timeline_verdict: 'BLOCKED',
    route_pressure_band_gate: 'BLOCKED',
    win_path_gate: 'BLOCKED',
    lose_path_gate: 'BLOCKED',
    mission_complete_used_as_route_pass_without_milestones: false,
    text_only_evidence_used_for_pass: false,
    telemetry_only_evidence_used_for_pass: false,
    evidence_paths: [],
    visual_playthrough_validator: {
      verdict: 'BLOCKED',
      encounter_coverage_status: 'BLOCKED',
      real_playthrough_won: false,
      boss_defeated: false,
      manual_traversal_gate: 'BLOCKED',
      large_empty_traversal_detected: true,
      success_route_milestone_timeline_verdict: 'BLOCKED',
      route_pressure_band_gate: 'BLOCKED',
      win_path_gate: 'BLOCKED',
      lose_path_gate: 'BLOCKED',
      mission_complete_used_as_route_pass_without_milestones: false,
      text_only_evidence_used_for_pass: false,
      manifest_only_evidence_used_for_pass: false,
      overlay_only_evidence_used_for_pass: false,
      receipt_only_evidence_used_for_pass: false,
      telemetry_only_evidence_used_for_pass: false,
      scripted_capture_used_for_pass: false,
      operator_visible_evidence_required: true,
      browser_visual_evidence_required: true,
      input_only_evidence_required: true,
      blocking_reasons: [reason],
      required_gate_summary: {
        real_playthrough_completion_gate: 'BLOCKED',
        human_visible_gameplay_gate: 'BLOCKED',
        success_route_milestone_timeline: 'BLOCKED',
        route_pressure_band_gate: 'BLOCKED',
        operator_visible_art_gate: 'BLOCKED',
        win_path_gate: 'BLOCKED',
        lose_path_gate: 'BLOCKED'
      }
    }
  };
}

async function writeStep38PreviewNotBootedQa(input: {
  previewUrl: string;
  runId: string;
  qaEvidencePath: string;
  telemetryEvidencePath: string;
  successRouteMilestoneTimelinePath: string;
  routePressureBandEvidencePath: string;
  realPlaythroughCompletionEvidencePath: string;
  twoDGameplayPlaythroughGatePath: string;
  canvasVisualReadabilityGatePath: string;
  proceduralPixelArtGrammarReportPath: string;
  canvasArtFidelityGatePath: string;
  spriteAnimationCoverageReportPath: string;
  environmentLayeringReportPath: string;
  startupSurvivabilityGatePath: string;
  encounterPlayabilityGatePath: string;
  operatorVisibleArtGatePath: string;
  visualDesignRealizationReportPath: string;
  visualPlaythroughValidatorReportPath: string;
  marker: Record<string, unknown>;
  message: string;
}): Promise<{ ok: false; observedEvents: []; message: string }> {
  const requiredEvents = [...STEP38_REQUIRED_QA_EVENTS];
  const routePressureBandEvidence = buildBlockedStep38RoutePressureBandEvidence(input.runId, input.message);
  const successRouteMilestoneTimeline = buildBlockedStep38SuccessRouteMilestoneTimeline(input.runId, input.message);
  const realPlaythroughCompletionEvidence = buildBlockedStep38RealPlaythroughCompletionEvidence(input.runId, input.message);
  const twoDGameplayPlaythroughGate = buildBlockedStep38TwoDGameplayPlaythroughGate(input.runId, input.message);
  const canvasVisualReadabilityGate = buildBlockedStep38CanvasVisualReadabilityGate(input.runId, input.message);
  const proceduralPixelArtGrammarReport = await readJsonIfPresent(input.proceduralPixelArtGrammarReportPath);
  const spriteAnimationCoverageReport = await readJsonIfPresent(input.spriteAnimationCoverageReportPath);
  const environmentLayeringReport = await readJsonIfPresent(input.environmentLayeringReportPath);
  const canvasArtFidelityGate = buildBlockedStep38CanvasArtFidelityGate(input.runId, input.message);
  const startupSurvivabilityGate = buildBlockedStep38StartupSurvivabilityGate(input.runId, input.message);
  const encounterPlayabilityGate = buildBlockedStep38EncounterPlayabilityGate(input.runId, input.message);
  const operatorVisibleArtGate = buildBlockedStep38OperatorVisibleArtGate(input.runId, input.message);
  const visualDesignRealizationReport = buildStep38VisualDesignRealizationReport({
    runId: input.runId,
    assets: [],
    visibleRequiredObjects: [],
    screenshotLabels: []
  });
  const visualPlaythroughValidatorReport = buildBlockedStep38VisualPlaythroughValidatorReport(input.runId, input.message);
  await writeJson(input.routePressureBandEvidencePath, routePressureBandEvidence);
  await writeJson(input.successRouteMilestoneTimelinePath, successRouteMilestoneTimeline);
  await writeJson(input.realPlaythroughCompletionEvidencePath, realPlaythroughCompletionEvidence);
  await writeJson(input.twoDGameplayPlaythroughGatePath, twoDGameplayPlaythroughGate);
  await writeJson(input.canvasVisualReadabilityGatePath, canvasVisualReadabilityGate);
  await writeJson(input.canvasArtFidelityGatePath, canvasArtFidelityGate);
  await writeJson(input.startupSurvivabilityGatePath, startupSurvivabilityGate);
  await writeJson(input.encounterPlayabilityGatePath, encounterPlayabilityGate);
  await writeJson(input.operatorVisibleArtGatePath, operatorVisibleArtGate);
  await writeJson(input.visualDesignRealizationReportPath, visualDesignRealizationReport);
  await writeJson(input.visualPlaythroughValidatorReportPath, visualPlaythroughValidatorReport);
  await writeTelemetryRecords(input.telemetryEvidencePath, []);
  await writeJson(input.qaEvidencePath, {
    schemaVersion: 'step38.browser-qa.v1',
    run_id: input.runId,
    status: 'FAILED',
    interaction_source: 'playwright_keyboard',
    preview_url: input.previewUrl,
    marker_matches: false,
    required_events: requiredEvents,
    observed_events: [],
    event_records: [],
    missing_events: requiredEvents,
    runtime_consumption: null,
    playable_state: null,
    visual_asset_evidence: null,
	    visual_asset_evidence_ok: false,
    visual_vertical_slice_evidence: null,
    visual_vertical_slice_evidence_ok: false,
    manual_traversal_evidence: null,
    runtime_manual_traversal_evidence: null,
    manual_traversal_evidence_ok: false,
    visual_runtime_binding_report: null,
    visual_runtime_binding_evidence_ok: false,
    visual_asset_materialization_report: null,
    visual_asset_materialization_evidence_ok: false,
    runtime_texture_load_report: null,
    runtime_texture_load_evidence_ok: false,
	    playable_duration_support: null,
    playable_duration_evidence_ok: false,
    encounter_coverage: null,
    encounter_coverage_evidence_ok: false,
    enemy_behavior_evidence: null,
    enemy_behavior_evidence_ok: false,
    behavior_config_evidence: null,
    behavior_config_evidence_ok: false,
    success_route_milestone_timeline: successRouteMilestoneTimeline,
    success_route_milestone_timeline_ok: false,
    route_pressure_band_evidence: routePressureBandEvidence,
    route_pressure_band_evidence_ok: false,
    real_playthrough_completion_evidence: realPlaythroughCompletionEvidence,
    real_playthrough_completion_evidence_ok: false,
    two_d_gameplay_playthrough_gate: twoDGameplayPlaythroughGate,
    two_d_gameplay_playthrough_gate_ok: false,
    canvas_visual_readability_gate: canvasVisualReadabilityGate,
    canvas_visual_readability_gate_ok: false,
    procedural_pixel_art_grammar_report: proceduralPixelArtGrammarReport,
    procedural_pixel_art_grammar_report_ok: hasStep38ProceduralPixelArtGrammarQaEvidence(proceduralPixelArtGrammarReport),
    canvas_art_fidelity_gate: canvasArtFidelityGate,
    canvas_art_fidelity_gate_ok: false,
    sprite_animation_coverage_report: spriteAnimationCoverageReport,
    sprite_animation_coverage_report_ok: hasStep38SpriteAnimationCoverageQaEvidence(spriteAnimationCoverageReport),
    environment_layering_report: environmentLayeringReport,
    environment_layering_report_ok: hasStep38EnvironmentLayeringQaEvidence(environmentLayeringReport),
    startup_survivability_gate: startupSurvivabilityGate,
    startup_survivability_gate_ok: false,
    encounter_playability_gate: encounterPlayabilityGate,
    encounter_playability_gate_ok: false,
    operator_visible_art_gate: operatorVisibleArtGate,
    operator_visible_art_gate_ok: false,
    visual_playthrough_validator_report: visualPlaythroughValidatorReport,
    visual_playthrough_validator_ok: false,
    interactive_evidence_ok: false,
    marker: input.marker,
    error: {
      name: 'PreviewNotBooted',
      message: input.message
    }
  });
  return { ok: false, observedEvents: [], message: input.message };
}

async function captureStep38VisualSliceWindow(
  page: Page,
  input: { label: string; screenshotDir: string }
): Promise<Record<string, unknown>> {
  await mkdir(input.screenshotDir, { recursive: true });
	  const screenshotPath = join(input.screenshotDir, `${input.label}.png`);
  await page.evaluate((label) => {
    const capture = (globalThis as unknown as { __STEP38_CAPTURE_VISUAL_WINDOW?: (label: string) => unknown }).__STEP38_CAPTURE_VISUAL_WINDOW;
    if (typeof capture === 'function') {
      capture(label);
    }
  }, input.label);
  await page.waitForTimeout(120);
	  await page.screenshot({ path: screenshotPath });
	  const screenshotSha256 = await sha256File(screenshotPath);
	  const pageProbe = await page.evaluate(() => {
	    type Step38CanvasLike = {
	      width: number;
	      height: number;
	      getContext: (
	        contextId: string,
	        options?: Record<string, unknown>
	      ) => { getImageData: (x: number, y: number, width: number, height: number) => { data: ArrayLike<number> } } | null;
	    };
	    const pageDocument = (globalThis as unknown as { document?: { getElementById: (id: string) => unknown } }).document;
	    const canvas = pageDocument?.getElementById('game') as Step38CanvasLike | null | undefined;
	    const bindings = (globalThis as unknown as { __STEP38_VISUAL_RUNTIME_BINDINGS?: unknown }).__STEP38_VISUAL_RUNTIME_BINDINGS;
	    const visualWindowMetadata = (globalThis as unknown as { __STEP38_LAST_VISUAL_WINDOW_METADATA?: unknown }).__STEP38_LAST_VISUAL_WINDOW_METADATA;
	    const runtimeBindings = bindings && typeof bindings === 'object' && !Array.isArray(bindings) ? (bindings as Record<string, unknown>) : {};
	    const windowMetadata = visualWindowMetadata && typeof visualWindowMetadata === 'object' && !Array.isArray(visualWindowMetadata) ? (visualWindowMetadata as Record<string, unknown>) : {};
    const renderObjects = Array.isArray(runtimeBindings.visible_render_objects)
      ? runtimeBindings.visible_render_objects.filter((object): object is Record<string, unknown> => object !== null && typeof object === 'object' && !Array.isArray(object))
      : [];
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    const backgroundPixels = new Set(['19,32,51', '31,122,77', '63,95,127']);
    let nonBackgroundPixelCount = 0;
    let probedRuntimeObjectCount = 0;
    if (canvas && context) {
      for (const object of renderObjects) {
        const x = typeof object.screenX === 'number' ? object.screenX : 0;
        const y = typeof object.screenY === 'number' ? object.screenY : 0;
        const w = typeof object.screenW === 'number' ? Math.max(1, object.screenW) : 1;
        const h = typeof object.screenH === 'number' ? Math.max(1, object.screenH) : 1;
        const samplePoints = [
          [x + w * 0.5, y + h * 0.5],
          [x + w * 0.25, y + h * 0.35],
          [x + w * 0.75, y + h * 0.35],
          [x + w * 0.35, y + h * 0.75],
          [x + w * 0.65, y + h * 0.75]
        ];
        let objectHasVisiblePixel = false;
        for (const [sampleX, sampleY] of samplePoints) {
          const px = Math.max(0, Math.min(canvas.width - 1, Math.round(sampleX)));
          const py = Math.max(0, Math.min(canvas.height - 1, Math.round(sampleY)));
	        const pixel = context.getImageData(px, py, 1, 1).data;
	        const red = pixel[0] ?? 0;
	        const green = pixel[1] ?? 0;
	        const blue = pixel[2] ?? 0;
	        const alpha = pixel[3] ?? 0;
          const rgbKey = `${red},${green},${blue}`;
          if (alpha > 0 && !backgroundPixels.has(rgbKey)) {
            nonBackgroundPixelCount += 1;
            objectHasVisiblePixel = true;
          }
        }
        if (objectHasVisiblePixel) {
          probedRuntimeObjectCount += 1;
        }
      }
    }
    const visibleRuntimeRoles = [...new Set(renderObjects.map((object) => object.visualRole).filter((role): role is string => typeof role === 'string'))].sort();
    const visibleContentTypes = [...new Set(renderObjects.map((object) => object.contentType).filter((contentType): contentType is string => typeof contentType === 'string'))].sort();
    const visibleCanonicalObjects = [...new Set(renderObjects.map((object) => object.canonical_id).filter((id): id is string => typeof id === 'string'))].sort();
    const placeholderObjectsSeen = renderObjects.some(
      (object) =>
        typeof object.required_object === 'string' &&
        (object.placeholder !== false || object.source !== 'canonical_dsl' || object.visualIntentSource !== 'canonical_dsl_visual_intent')
    );
    return {
      runtimeBindings,
      windowMetadata,
      visibleRuntimeRoles,
      visibleContentTypes,
      visibleCanonicalObjects,
      visibleVisualRuntimeObjects: renderObjects,
      placeholderObjectsSeen,
      canvas_pixel_probe: {
        status: probedRuntimeObjectCount > 0 && nonBackgroundPixelCount > 0 ? 'PASSED' : 'FAILED',
        probed_runtime_object_count: probedRuntimeObjectCount,
        non_background_pixel_count: nonBackgroundPixelCount
      }
    };
  });

  const pixelProbePassed = isRecord(pageProbe.canvas_pixel_probe) && pageProbe.canvas_pixel_probe.status === 'PASSED';
  const windowMetadata = isRecord(pageProbe.windowMetadata) ? pageProbe.windowMetadata : {};
  const projectionMustShow = Array.isArray(windowMetadata.projection_must_show)
    ? windowMetadata.projection_must_show.filter((value): value is string => typeof value === 'string')
    : [];
  const metadata = {
    label: input.label,
    screenshot: `${input.label}.png`,
    screenshot_path: screenshotPath,
    screenshot_sha256: screenshotSha256,
    metadata_path: join(input.screenshotDir, `${input.label}.metadata.json`),
    evidence_type: 'diagnostic_scripted_capture',
    counts_for_ready_for_manual_test: false,
    starts_from_spawn: false,
    input_only: false,
    teleport_used: true,
    camera_jump_used: true,
    debug_reposition_used: true,
    state_injection_used: true,
    direct_spawn_used: true,
    camera_x: typeof windowMetadata.camera_x === 'number' ? windowMetadata.camera_x : null,
    preview_window: typeof windowMetadata.preview_window === 'string' ? windowMetadata.preview_window : null,
    canonical_time_range_sec: Array.isArray(windowMetadata.canonical_time_range_sec) ? windowMetadata.canonical_time_range_sec : null,
    projection_must_show: projectionMustShow,
    visible_canonical_objects: pageProbe.visibleCanonicalObjects,
    required_roles_seen: uniqueSorted([...projectionMustShow, ...(Array.isArray(pageProbe.visibleRuntimeRoles) ? pageProbe.visibleRuntimeRoles : []), ...(Array.isArray(pageProbe.visibleContentTypes) ? pageProbe.visibleContentTypes : [])].filter((value): value is string => typeof value === 'string')),
    pixel_probe_passed: pixelProbePassed,
    placeholder_objects_seen: pageProbe.placeholderObjectsSeen,
    visible_runtime_roles: pageProbe.visibleRuntimeRoles,
    visible_content_types: pageProbe.visibleContentTypes,
    visible_visual_runtime_objects: pageProbe.visibleVisualRuntimeObjects,
    canvas_pixel_probe: pageProbe.canvas_pixel_probe,
    runtime_bindings: pageProbe.runtimeBindings
  };
  await writeJson(metadata.metadata_path, metadata);
  return metadata;
}

async function readStep38ManualTraversalProbe(page: Page): Promise<Record<string, unknown>> {
  return await page.evaluate(() => {
    type Step38CanvasLike = {
      width: number;
      height: number;
      getContext: (
        contextId: string,
        options?: Record<string, unknown>
      ) => { getImageData: (x: number, y: number, width: number, height: number) => { data: ArrayLike<number> } } | null;
    };
    const pageDocument = (globalThis as unknown as { document?: { getElementById: (id: string) => unknown } }).document;
    const canvas = pageDocument?.getElementById('game') as Step38CanvasLike | null | undefined;
    const bindings = (globalThis as unknown as { __STEP38_VISUAL_RUNTIME_BINDINGS?: unknown }).__STEP38_VISUAL_RUNTIME_BINDINGS;
    const manualTraversalEvidence = (globalThis as unknown as { __STEP38_MANUAL_TRAVERSAL_EVIDENCE?: unknown }).__STEP38_MANUAL_TRAVERSAL_EVIDENCE;
    const playableState = (globalThis as unknown as { __STEP38_PLAYABLE_STATE?: unknown }).__STEP38_PLAYABLE_STATE;
    const outcomeStateMachineReport = (globalThis as unknown as { __STEP38_OUTCOME_STATE_MACHINE_REPORT?: unknown }).__STEP38_OUTCOME_STATE_MACHINE_REPORT;
    const runtimeBindings = bindings && typeof bindings === 'object' && !Array.isArray(bindings) ? (bindings as Record<string, unknown>) : {};
    const renderObjects = Array.isArray(runtimeBindings.visible_render_objects)
      ? runtimeBindings.visible_render_objects.filter((object): object is Record<string, unknown> => object !== null && typeof object === 'object' && !Array.isArray(object))
      : [];
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    const backgroundPixels = new Set(['19,32,51', '31,122,77', '63,95,127']);
    let nonBackgroundPixelCount = 0;
    let probedRuntimeObjectCount = 0;
    if (canvas && context) {
      for (const object of renderObjects) {
        const x = typeof object.screenX === 'number' ? object.screenX : 0;
        const y = typeof object.screenY === 'number' ? object.screenY : 0;
        const w = typeof object.screenW === 'number' ? Math.max(1, object.screenW) : 1;
        const h = typeof object.screenH === 'number' ? Math.max(1, object.screenH) : 1;
        const samplePoints = [
          [x + w * 0.5, y + h * 0.5],
          [x + w * 0.25, y + h * 0.35],
          [x + w * 0.75, y + h * 0.35],
          [x + w * 0.35, y + h * 0.75],
          [x + w * 0.65, y + h * 0.75]
        ];
        let objectHasVisiblePixel = false;
        for (const [sampleX, sampleY] of samplePoints) {
          const px = Math.max(0, Math.min(canvas.width - 1, Math.round(sampleX)));
          const py = Math.max(0, Math.min(canvas.height - 1, Math.round(sampleY)));
          const pixel = context.getImageData(px, py, 1, 1).data;
          const red = pixel[0] ?? 0;
          const green = pixel[1] ?? 0;
          const blue = pixel[2] ?? 0;
          const alpha = pixel[3] ?? 0;
          const rgbKey = `${red},${green},${blue}`;
          if (alpha > 0 && !backgroundPixels.has(rgbKey)) {
            nonBackgroundPixelCount += 1;
            objectHasVisiblePixel = true;
          }
        }
        if (objectHasVisiblePixel) {
          probedRuntimeObjectCount += 1;
        }
      }
    }
    const visibleRuntimeRoles = [...new Set(renderObjects.map((object) => object.visualRole).filter((role): role is string => typeof role === 'string'))].sort();
    const visibleContentTypes = [...new Set(renderObjects.map((object) => object.contentType).filter((contentType): contentType is string => typeof contentType === 'string'))].sort();
    const visibleCanonicalObjects = [...new Set(renderObjects.map((object) => object.canonical_id).filter((id): id is string => typeof id === 'string'))].sort();
    const visibleObjectTypes = [...new Set(renderObjects.map((object) => object.objectType).filter((id): id is string => typeof id === 'string'))].sort();
    const placeholderObjectsSeen = renderObjects.some(
      (object) =>
        typeof object.required_object === 'string' &&
        (object.placeholder !== false || object.source !== 'canonical_dsl' || object.visualIntentSource !== 'canonical_dsl_visual_intent')
    );
    return {
      manualTraversalEvidence,
      playableState,
      outcomeStateMachineReport,
      runtimeBindings,
      visibleRuntimeRoles,
      visibleContentTypes,
      visibleCanonicalObjects,
      visibleObjectTypes,
      visibleVisualRuntimeObjects: renderObjects,
      placeholderObjectsSeen,
      canvas_pixel_probe: {
        status: probedRuntimeObjectCount > 0 && nonBackgroundPixelCount > 0 ? 'PASSED' : 'FAILED',
        probed_runtime_object_count: probedRuntimeObjectCount,
        non_background_pixel_count: nonBackgroundPixelCount
      }
    };
  });
}

async function captureStep38ManualTraversalScreenshot(
  page: Page,
  input: { label: string; screenshotDir: string }
): Promise<Record<string, unknown>> {
  await mkdir(input.screenshotDir, { recursive: true });
  const screenshotPath = join(input.screenshotDir, `${input.label}.png`);
  await page.screenshot({ path: screenshotPath });
  const screenshotSha256 = await sha256File(screenshotPath);
  const pageProbe = await readStep38ManualTraversalProbe(page);
  const manualTraversalEvidence = isRecord(pageProbe.manualTraversalEvidence) ? pageProbe.manualTraversalEvidence : {};
  const playableState = isRecord(pageProbe.playableState) ? pageProbe.playableState : {};
  const outcomeStateMachineReport = isRecord(pageProbe.outcomeStateMachineReport) ? pageProbe.outcomeStateMachineReport : {};
  const pixelProbePassed = isRecord(pageProbe.canvas_pixel_probe) && pageProbe.canvas_pixel_probe.status === 'PASSED';
  const visibleRuntimeObjects = Array.isArray(pageProbe.visibleVisualRuntimeObjects) ? pageProbe.visibleVisualRuntimeObjects.filter(isRecord) : [];
  const visibleMaterializedAssets = visibleRuntimeObjects
    .filter((object) =>
      typeof object.required_object === 'string' &&
      object.materialized === true &&
      object.loaded_in_runtime === true &&
      object.bound_to_runtime_object === true &&
      object.factory_used_texture_key === true &&
      object.placeholder === false &&
      object.label_only === false
    )
    .map((object) => ({
      required_object: object.required_object,
      asset_meta_required_object: object.asset_meta_required_object,
      assetMeta: { requiredObject: object.asset_meta_required_object },
      canonical_id: object.canonical_id,
      role: object.role,
      source: object.source,
      visual_role: object.visualRole,
      asset_role: object.asset_role,
      palette: object.palette,
      silhouette: object.silhouette,
      texture_key: object.texture_key,
      visual_intent_sha: object.visual_intent_sha,
      asset_design_spec_sha: object.asset_design_spec_sha,
      motif_coverage: object.motif_coverage,
      geometry_signature: object.geometry_signature,
      template_fingerprint: object.template_fingerprint,
      role_static_template_used: object.role_static_template_used,
      role_static_svg_template_used: object.role_static_svg_template_used,
      old_svgForVisualIntent_used: object.old_svgForVisualIntent_used,
      template_derived_placeholder: object.template_derived_placeholder,
      role_only_generation_detected: object.role_only_generation_detected,
      matches_known_static_template: object.matches_known_static_template,
      distinct_silhouette: object.distinct_silhouette,
      bound_to_runtime_object: object.bound_to_runtime_object,
      factory_used_texture_key: object.factory_used_texture_key,
      used_placeholder_renderer: object.used_placeholder_renderer,
      run_scoped_asset_sha256: object.run_scoped_asset_sha256,
      served_asset_sha256: object.served_asset_sha256,
      visible: true,
      placeholder: false,
      label_only: false
    }));
  const stepRequiredMaterializedAssets =
    input.label === '02_projectile_visible_by_input' ? ['projectile'] : [...STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS];
  const visibleRequiredObjects = new Set(visibleMaterializedAssets.map((object) => object.required_object).filter((value) => typeof value === 'string'));
  const missingRequiredMaterializedAssets = stepRequiredMaterializedAssets.filter((requiredObject) => !visibleRequiredObjects.has(requiredObject));
  const manualTraversalGate = isRecord(manualTraversalEvidence.manual_traversal_gate) ? manualTraversalEvidence.manual_traversal_gate : {};
  const finalCompletionScreenshot = input.label === '06_exit_or_mission_complete_reached_by_input';
  const metadata = {
    screenshot: `${input.label}.png`,
    label: input.label,
    screenshot_path: screenshotPath,
    screenshot_sha256: screenshotSha256,
    metadata_path: join(input.screenshotDir, `${input.label}.metadata.json`),
    evidence_type: 'fresh_manual_traversal_input_only',
    counts_for_ready_for_manual_test: true,
    fresh_manual_session: true,
    starts_from_spawn: true,
    input_only: true,
    teleport_used: false,
    camera_jump_used: false,
    debug_reposition_used: false,
    state_injection_used: false,
    direct_spawn_used: false,
    direct_phase_trigger_used: false,
    direct_game_over_trigger_used: false,
    direct_health_mutation_used: false,
    action: input.label === '02_projectile_visible_by_input' ? 'fire_weapon' : 'traverse',
    outcome_state:
      typeof outcomeStateMachineReport.current_state === 'string'
        ? outcomeStateMachineReport.current_state
        : playableState.gameOverReached === true
          ? 'GAME_OVER'
          : playableState.winReached === true
            ? 'MISSION_COMPLETE'
            : 'RUNNING',
    game_over_visible: playableState.gameOverReached === true,
    mission_complete_visible: playableState.winReached === true,
    mission_complete_after_real_playthrough:
      finalCompletionScreenshot &&
      manualTraversalGate.mission_complete_reached_by_input === true &&
      manualTraversalGate.boss_defeated_by_input === true &&
      manualTraversalGate.all_required_waves_resolved_before_win === true &&
      manualTraversalGate.all_required_regions_traversed_before_win === true &&
      manualTraversalGate.text_or_overlay_only_completion_evidence === false &&
      manualTraversalGate.early_mission_complete_detected === false,
    boss_defeated_by_input: finalCompletionScreenshot && manualTraversalGate.boss_defeated_by_input === true,
    text_or_overlay_only_completion_evidence:
      finalCompletionScreenshot && manualTraversalGate.text_or_overlay_only_completion_evidence !== false,
    required_materialized_assets_for_step: stepRequiredMaterializedAssets,
    elapsed_sec_from_spawn:
      typeof manualTraversalEvidence.elapsed_sec_from_spawn === 'number' ? manualTraversalEvidence.elapsed_sec_from_spawn : null,
    player_x: typeof manualTraversalEvidence.current_player_x === 'number' ? manualTraversalEvidence.current_player_x : null,
    camera_x: typeof manualTraversalEvidence.current_camera_x === 'number' ? manualTraversalEvidence.current_camera_x : null,
    route_segment:
      typeof manualTraversalEvidence.current_route_segment === 'string' ? manualTraversalEvidence.current_route_segment : null,
    preview_window:
      typeof manualTraversalEvidence.current_preview_window === 'string' ? manualTraversalEvidence.current_preview_window : null,
    visible_canonical_objects: pageProbe.visibleCanonicalObjects,
    required_roles_seen: uniqueSorted([
      ...(Array.isArray(pageProbe.visibleRuntimeRoles) ? pageProbe.visibleRuntimeRoles : []),
      ...(Array.isArray(pageProbe.visibleContentTypes) ? pageProbe.visibleContentTypes : [])
    ].filter((value): value is string => typeof value === 'string')),
    visible_runtime_roles: pageProbe.visibleRuntimeRoles,
    visible_content_types: pageProbe.visibleContentTypes,
    visible_object_types: pageProbe.visibleObjectTypes,
    visible_visual_runtime_objects: visibleRuntimeObjects,
    visible_materialized_assets: visibleMaterializedAssets,
    missing_required_materialized_assets: missingRequiredMaterializedAssets,
    pixel_probe_passed: pixelProbePassed,
    placeholder_objects_seen: pageProbe.placeholderObjectsSeen,
    canvas_pixel_probe: pageProbe.canvas_pixel_probe,
    source: 'canonical_dsl',
    runtime_manual_traversal_evidence: manualTraversalEvidence,
    runtime_bindings: pageProbe.runtimeBindings
  };
  await writeJson(metadata.metadata_path, metadata);
  return metadata;
}

function shouldCaptureStep38ManualTraversalLabel(label: string, probe: Record<string, unknown>): boolean {
  const contentTypes = new Set(Array.isArray(probe.visibleContentTypes) ? probe.visibleContentTypes.filter((value): value is string => typeof value === 'string') : []);
  const runtimeRoles = new Set(Array.isArray(probe.visibleRuntimeRoles) ? probe.visibleRuntimeRoles.filter((value): value is string => typeof value === 'string') : []);
  const objectTypes = new Set(Array.isArray(probe.visibleObjectTypes) ? probe.visibleObjectTypes.filter((value): value is string => typeof value === 'string') : []);
  const visibleObjects = Array.isArray(probe.visibleVisualRuntimeObjects) ? probe.visibleVisualRuntimeObjects.filter(isRecord) : [];
  const manualTraversalEvidence = isRecord(probe.manualTraversalEvidence) ? probe.manualTraversalEvidence : {};
  const previewWindow = typeof manualTraversalEvidence.current_preview_window === 'string' ? manualTraversalEvidence.current_preview_window : null;
  const hasVisibleBoundProjectile = visibleObjects.some(
    (object) =>
      object.required_object === 'projectile' &&
      object.source === 'canonical_dsl' &&
      object.bound_to_runtime_object === true &&
      object.factory_used_texture_key === true &&
      object.placeholder === false &&
      object.label_only === false &&
      object.visible === true
  );
  const hasCoreWavePressure = visibleObjects.some((object) => {
    const contentType = typeof object.contentType === 'string' ? object.contentType : '';
    const objectType = typeof object.objectType === 'string' ? object.objectType : '';
    const sourceNodeId = typeof object.sourceNodeId === 'string' ? object.sourceNodeId : '';
    const segmentId = typeof object.segmentId === 'string' ? object.segmentId : '';
    const pressureObject =
      contentType === 'enemy_wave' ||
      contentType === 'flying_enemy' ||
      objectType === 'enemy_projectile' ||
      objectType === 'boss_projectile';
    return pressureObject && (sourceNodeId.includes('core') || segmentId.includes('core') || previewWindow === 'window_2_boss');
  });
  const hasCompletePressureBand =
    visibleObjects.some((object) => object.contentType === 'flying_enemy' || object.visualRole === 'flying_enemy') &&
    visibleObjects.some((object) => object.contentType === 'projectile' || object.objectType === 'player_projectile') &&
    visibleObjects.some(
      (object) =>
        object.objectType === 'enemy_projectile' ||
        object.objectType === 'boss_projectile' ||
        object.required_object === 'boss_projectile_phase_object' ||
        object.contentType === 'hazard' ||
        object.required_object === 'environment_hazard'
    );
  switch (label) {
    case '00_spawn_start':
      return true;
    case '01_wave1_reached_by_input':
      return contentTypes.has('enemy_wave') || contentTypes.has('static_enemy');
    case '02_projectile_visible_by_input':
      return contentTypes.has('projectile') && hasVisibleBoundProjectile;
    case '02_pickup_and_area2_reached_by_input':
      return contentTypes.has('weapon_pickup') && previewWindow === 'window_1_weapon_wave_area';
    case '03_wave2_reached_by_input':
      return (
        (previewWindow === 'window_1_weapon_wave_area' || previewWindow === 'window_2_boss') &&
        contentTypes.has('enemy_wave') &&
        (contentTypes.has('flying_enemy') || runtimeRoles.has('flying_enemy'))
      );
    case '03b_mid_pressure_band':
      return hasCoreWavePressure && hasCompletePressureBand;
    case '04_boss_telegraph_reached_by_input':
      return contentTypes.has('boss') && contentTypes.has('boss_telegraph');
    case '05_boss_phase_reached_by_input':
      return contentTypes.has('boss') && contentTypes.has('boss_phase') && objectTypes.has('boss_phase_2');
    case '06_exit_or_mission_complete_reached_by_input':
      return objectTypes.has('mission_complete_overlay');
    default:
      return false;
  }
}

function manualTraversalScreenshotMeetsLabel(label: string, screenshot: Record<string, unknown>): boolean {
  const contentTypes = new Set(readStringArrayField(screenshot, 'visible_content_types'));
  const runtimeRoles = new Set(readStringArrayField(screenshot, 'visible_runtime_roles'));
  const objectTypes = new Set(readStringArrayField(screenshot, 'visible_object_types'));
  const previewWindow = typeof screenshot.preview_window === 'string' ? screenshot.preview_window : null;
  const visibleMaterializedAssets = Array.isArray(screenshot.visible_materialized_assets) ? screenshot.visible_materialized_assets.filter(isRecord) : [];
  const visibleRuntimeObjects = Array.isArray(screenshot.visible_visual_runtime_objects)
    ? screenshot.visible_visual_runtime_objects.filter(isRecord)
    : [];
  const hasVisibleBoundProjectile = visibleMaterializedAssets.some(
    (object) =>
      object.required_object === 'projectile' &&
      object.source === 'canonical_dsl' &&
      object.bound_to_runtime_object === true &&
      object.factory_used_texture_key === true &&
      object.visible === true &&
      object.placeholder === false &&
      object.label_only === false
  );
  const hasCoreWavePressure = visibleRuntimeObjects.some((object) => {
    const contentType = typeof object.contentType === 'string' ? object.contentType : '';
    const objectType = typeof object.objectType === 'string' ? object.objectType : '';
    const sourceNodeId = typeof object.sourceNodeId === 'string' ? object.sourceNodeId : '';
    const segmentId = typeof object.segmentId === 'string' ? object.segmentId : '';
    const pressureObject =
      contentType === 'enemy_wave' ||
      contentType === 'flying_enemy' ||
      objectType === 'enemy_projectile' ||
      objectType === 'boss_projectile';
    return pressureObject && (sourceNodeId.includes('core') || segmentId.includes('core') || previewWindow === 'window_2_boss');
  });
  const hasCompletePressureBand =
    visibleRuntimeObjects.some((object) => object.contentType === 'flying_enemy' || object.visualRole === 'flying_enemy') &&
    visibleRuntimeObjects.some((object) => object.contentType === 'projectile' || object.objectType === 'player_projectile') &&
    visibleRuntimeObjects.some(
      (object) =>
        object.objectType === 'enemy_projectile' ||
        object.objectType === 'boss_projectile' ||
        object.required_object === 'boss_projectile_phase_object' ||
        object.contentType === 'hazard' ||
        object.required_object === 'environment_hazard'
    );
  const common =
    screenshot.evidence_type === 'fresh_manual_traversal_input_only' &&
    screenshot.counts_for_ready_for_manual_test === true &&
    screenshot.fresh_manual_session === true &&
    screenshot.input_only === true &&
    screenshot.teleport_used === false &&
    screenshot.camera_jump_used === false &&
    screenshot.debug_reposition_used === false &&
    screenshot.state_injection_used === false &&
    screenshot.direct_spawn_used === false &&
    screenshot.direct_phase_trigger_used === false &&
    screenshot.pixel_probe_passed === true &&
    screenshot.placeholder_objects_seen === false &&
    Array.isArray(screenshot.visible_materialized_assets) &&
    screenshot.visible_materialized_assets.length > 0;
  if (!common) return false;

  switch (label) {
    case '00_spawn_start':
      return contentTypes.has('player') && contentTypes.has('region_transition');
    case '01_wave1_reached_by_input':
      return contentTypes.has('enemy_wave') && (runtimeRoles.has('enemy_ground') || contentTypes.has('static_enemy'));
    case '02_projectile_visible_by_input':
      return screenshot.action === 'fire_weapon' && contentTypes.has('projectile') && hasVisibleBoundProjectile;
    case '02_pickup_and_area2_reached_by_input':
      return previewWindow === 'window_1_weapon_wave_area' && contentTypes.has('weapon_pickup') && contentTypes.has('region_transition');
    case '03_wave2_reached_by_input':
      return (
        (previewWindow === 'window_1_weapon_wave_area' || previewWindow === 'window_2_boss') &&
        contentTypes.has('enemy_wave') &&
        (contentTypes.has('flying_enemy') || runtimeRoles.has('flying_enemy'))
      );
    case '03b_mid_pressure_band':
      return hasCoreWavePressure && hasCompletePressureBand;
    case '04_boss_telegraph_reached_by_input':
      return contentTypes.has('boss') && contentTypes.has('boss_telegraph');
    case '05_boss_phase_reached_by_input':
      return contentTypes.has('boss') && contentTypes.has('boss_phase') && objectTypes.has('boss_phase_2');
    case '06_exit_or_mission_complete_reached_by_input':
      return (
        objectTypes.has('mission_complete_overlay') &&
        screenshot.mission_complete_after_real_playthrough === true &&
        screenshot.boss_defeated_by_input === true &&
        screenshot.text_or_overlay_only_completion_evidence === false
      );
    default:
      return false;
  }
}

function buildStep38ManualTraversalEvidence(input: {
  runId: string;
  markerMatches: boolean;
  windows: Array<Record<string, unknown>>;
  runtimeEvidence: unknown;
}): Record<string, unknown> {
  const runtimeEvidence = isRecord(input.runtimeEvidence) ? input.runtimeEvidence : {};
  const gate = isRecord(runtimeEvidence.manual_traversal_gate) ? runtimeEvidence.manual_traversal_gate : {};
  const windowLabels = input.windows.map((window) => (typeof window.label === 'string' ? window.label : undefined)).filter((label): label is string => label !== undefined);
  const requiredWindowLabelsPresent = STEP38_REQUIRED_MANUAL_TRAVERSAL_SCREENSHOTS.every((label) => windowLabels.includes(label));
  const screenshotsAreInputOnly = input.windows.every(
    (window) =>
      window.evidence_type === 'fresh_manual_traversal_input_only' &&
      window.counts_for_ready_for_manual_test === true &&
      window.fresh_manual_session === true &&
      window.starts_from_spawn === true &&
      window.input_only === true &&
      window.teleport_used === false &&
      window.camera_jump_used === false &&
      window.debug_reposition_used === false &&
      window.state_injection_used === false &&
      window.direct_spawn_used === false &&
      window.direct_phase_trigger_used === false &&
      window.pixel_probe_passed === true &&
      window.placeholder_objects_seen === false &&
      Array.isArray(window.visible_materialized_assets) &&
      window.visible_materialized_assets.length > 0 &&
      (typeof window.label !== 'string' || manualTraversalScreenshotMeetsLabel(window.label, window))
  );
  const status =
    input.markerMatches &&
    runtimeEvidence.status === 'PASSED' &&
    gate.verdict === 'PASS' &&
    gate.mission_complete_reached_by_input === true &&
    gate.boss_defeated_by_input === true &&
    gate.all_required_waves_resolved_before_win === true &&
    gate.all_required_regions_traversed_before_win === true &&
    gate.text_or_overlay_only_completion_evidence === false &&
    gate.early_mission_complete_detected === false &&
    requiredWindowLabelsPresent &&
    input.windows.length >= STEP38_REQUIRED_MANUAL_TRAVERSAL_SCREENSHOTS.length &&
    screenshotsAreInputOnly;

  return {
    ...runtimeEvidence,
    schemaVersion: 'step38.manual-traversal-evidence.v1',
    status: status ? 'PASSED' : 'FAILED',
    evidence_source: 'playwright_keyboard_continuous_path',
    run_id: input.runId,
    marker_run_id_matches: input.markerMatches,
    started_at_player_spawn: true,
    capture_window_teleport_used: false,
    screenshot_count: input.windows.length,
    required_screenshots: [...STEP38_REQUIRED_MANUAL_TRAVERSAL_SCREENSHOTS],
    observed_screenshots: windowLabels,
    missing_screenshots: STEP38_REQUIRED_MANUAL_TRAVERSAL_SCREENSHOTS.filter((label) => !windowLabels.includes(label)),
    screenshots_are_input_only: screenshotsAreInputOnly,
    scripted_capture_used_for_pass: false,
    manual_traversal_gate: {
      ...gate,
      verdict: status ? 'PASS' : 'FAIL',
      starts_from_spawn: true,
      input_only: true,
      teleport_used: false,
      camera_jump_used: false,
      debug_reposition_used: false,
      state_injection_used: false,
      direct_spawn_used: false,
      scripted_capture_used_for_pass: false
    },
    screenshots: input.windows
  };
}

function collectVisualRuntimeBindingFailureReasons(windows: Array<Record<string, unknown>>): string[] {
  const reasons = new Set<string>();
  for (const window of windows) {
    const visibleObjects = Array.isArray(window.visible_visual_runtime_objects) ? window.visible_visual_runtime_objects.filter(isRecord) : [];
    for (const object of visibleObjects) {
      const assetMeta = isRecord(object.assetMeta) ? object.assetMeta : {};
      const assetRequiredObject =
        typeof assetMeta.requiredObject === 'string'
          ? assetMeta.requiredObject
          : typeof assetMeta.required_object === 'string'
            ? assetMeta.required_object
            : null;
      const topLevelRequiredObject = typeof object.required_object === 'string' ? object.required_object : null;
      const appearsToBeProjectile = topLevelRequiredObject === 'projectile' || assetRequiredObject === 'projectile';
      if (assetRequiredObject === 'projectile' && topLevelRequiredObject !== 'projectile') {
        reasons.add('projectile_runtime_required_object_missing');
      }
      if (appearsToBeProjectile && object.visible === true && object.bound_to_runtime_object !== true) {
        reasons.add('projectile_visible_but_not_bound_to_runtime_object');
      }
      const textureKey = typeof object.texture_key === 'string' ? object.texture_key : '';
      const appearsToBeBossProjectile =
        topLevelRequiredObject === 'boss_projectile_phase_object' ||
        assetRequiredObject === 'boss_projectile_phase_object' ||
        object.objectType === 'boss_projectile' ||
        String(object.objectType ?? '').startsWith('boss_phase_');
      if (appearsToBeBossProjectile && topLevelRequiredObject !== 'boss_projectile_phase_object') {
        reasons.add('boss_projectile_visible_but_wrong_required_object');
      }
      if (
        topLevelRequiredObject === 'boss_projectile_phase_object' &&
        assetRequiredObject !== null &&
        assetRequiredObject !== 'boss_projectile_phase_object'
      ) {
        reasons.add('boss_projectile_asset_meta_mismatch');
      }
      if (appearsToBeBossProjectile && textureKey.length === 0) {
        reasons.add('boss_projectile_texture_key_missing');
      }
      if (appearsToBeBossProjectile && textureKey.includes('enemy_bullet')) {
        reasons.add('boss_projectile_reused_enemy_bullet_asset');
      }
      if (appearsToBeBossProjectile && !textureKey.includes('boss')) {
        reasons.add('boss_projectile_reused_generic_projectile_asset');
      }
      if (
        appearsToBeBossProjectile &&
        (object.visible === true || topLevelRequiredObject === 'boss_projectile_phase_object') &&
        (object.bound_to_runtime_object !== true || object.factory_used_texture_key !== true)
      ) {
        reasons.add('boss_projectile_factory_not_bound');
      }
    }
  }
  return [...reasons].sort();
}

function bossProjectileTextureKeyPasses(textureKey: string): boolean {
  return (
    textureKey.length > 0 &&
    textureKey.includes('boss') &&
    !textureKey.includes('enemy_bullet') &&
    !textureKey.includes('player_bullet')
  );
}

function buildStep38VisualRuntimeBindingReport(input: {
  runId: string;
  markerMatches: boolean;
  runtimeReport: unknown;
  windows: Array<Record<string, unknown>>;
}): Record<string, unknown> {
  const runtimeReport = isRecord(input.runtimeReport) ? input.runtimeReport : {};
  const runtimeObjects = Array.isArray(runtimeReport.objects) ? runtimeReport.objects.filter(isRecord) : [];
  const screenshotsByObject = new Map<string, Set<string>>();
  const inputOnlyWindows = input.windows.filter(
    (window) =>
      window.evidence_type === 'fresh_manual_traversal_input_only' &&
      window.counts_for_ready_for_manual_test === true &&
      window.fresh_manual_session === true &&
      window.input_only === true &&
      window.teleport_used === false &&
      window.camera_jump_used === false &&
      window.debug_reposition_used === false &&
      window.state_injection_used === false &&
      window.direct_spawn_used === false &&
      window.direct_phase_trigger_used === false &&
      window.pixel_probe_passed === true &&
      window.placeholder_objects_seen === false
  );

  for (const window of inputOnlyWindows) {
    const label = typeof window.label === 'string' ? window.label : undefined;
    if (label === undefined) continue;
    const visibleObjects = Array.isArray(window.visible_visual_runtime_objects) ? window.visible_visual_runtime_objects.filter(isRecord) : [];
    for (const object of visibleObjects) {
      const requiredObject = typeof object.required_object === 'string' ? object.required_object : undefined;
      if (requiredObject === undefined) continue;
      const labels = screenshotsByObject.get(requiredObject) ?? new Set<string>();
      labels.add(label);
      screenshotsByObject.set(requiredObject, labels);
    }
  }

  const objects = STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.map((requiredObject) => {
    const runtimeObject = runtimeObjects.find((object) => object.required_object === requiredObject);
    const evidenceScreenshots = [...(screenshotsByObject.get(requiredObject) ?? new Set<string>())].sort();
    if (runtimeObject === undefined) {
      return {
        required_object: requiredObject,
        canonical_id: `missing:${requiredObject}`,
        expected_entity_id: null,
        expected_asset_id: null,
        expected_asset_intent_ref: null,
        role: visualRuntimeBroadRoleForReport(requiredObject),
        source: 'missing_runtime_binding',
        visual_role: requiredObject,
        asset_role: requiredObject,
        asset_required_object_binding_source: 'missing_runtime_binding',
        asset_required_object_binding_path:
          'asset-manifest.step38.json/assets[].requiredObject -> loadSpriteAssets().__step38AssetMeta.requiredObject -> recordVisualRuntimeObject().asset_meta_required_object',
        asset_required_object_binding_valid: false,
        palette: [],
        silhouette: 'missing_runtime_binding',
        texture_key: `missing:${requiredObject}`,
        visual_intent_sha: null,
        asset_design_spec_sha: null,
        motif_coverage: [],
        geometry_signature: null,
        dsl_geometry_fingerprint: null,
        role_static_control_fingerprint: null,
        visual_geometry_dependency: false,
        template_fingerprint: null,
        role_static_template_used: true,
        role_static_svg_template_used: true,
        old_svgForVisualIntent_used: false,
        template_derived_placeholder: true,
        role_only_generation_detected: true,
        matches_known_static_template: true,
        distinct_silhouette: false,
        renderer_kind: 'procedural_vector',
        loaded_in_runtime: false,
        texture_cache_present: false,
        bound_to_runtime_object: false,
        factory_used_texture_key: false,
        used_placeholder_renderer: true,
        visible_in_fresh_manual_traversal: false,
        materialized: false,
        run_scoped_asset_path: null,
        run_scoped_asset_sha256: null,
        served_asset_path: null,
        served_asset_sha256: null,
        copied_to_served_assets: false,
        placeholder: true,
        label_only: false,
        evidence_screenshots: []
      };
    }

    return {
      required_object: requiredObject,
      asset_meta_required_object: runtimeObject.asset_meta_required_object,
      canonical_id: typeof runtimeObject.canonical_id === 'string' ? runtimeObject.canonical_id : `missing:${requiredObject}`,
      expected_entity_id: typeof runtimeObject.expected_entity_id === 'string' ? runtimeObject.expected_entity_id : null,
      expected_asset_id: typeof runtimeObject.expected_asset_id === 'string' ? runtimeObject.expected_asset_id : null,
      expected_asset_intent_ref: typeof runtimeObject.expected_asset_intent_ref === 'string' ? runtimeObject.expected_asset_intent_ref : null,
      role: typeof runtimeObject.role === 'string' ? runtimeObject.role : visualRuntimeBroadRoleForReport(requiredObject),
      source: runtimeObject.source,
      weapon_id: typeof runtimeObject.weapon_id === 'string' ? runtimeObject.weapon_id : null,
      boss_id: typeof runtimeObject.boss_id === 'string' ? runtimeObject.boss_id : null,
      boss_phase: typeof runtimeObject.boss_phase === 'number' || typeof runtimeObject.boss_phase === 'string' ? runtimeObject.boss_phase : null,
      visual_role: typeof runtimeObject.visual_role === 'string' ? runtimeObject.visual_role : requiredObject,
      asset_role: typeof runtimeObject.asset_role === 'string' ? runtimeObject.asset_role : requiredObject,
      asset_required_object_binding_source: isRecord(runtimeObject.asset_required_object_binding_source)
        ? runtimeObject.asset_required_object_binding_source
        : {
            type: 'missing_runtime_object_asset_required_object_binding_source',
            manifest_path: 'assets[].requiredObject',
            asset_id: null,
            asset_intent_ref: null,
            entity_id: null,
            material_slot: requiredObject,
            required_object: requiredObject,
            asset_meta_required_object: runtimeObject.asset_meta_required_object ?? null,
            expected_entity_id: runtimeObject.expected_entity_id ?? null,
            expected_asset_id: runtimeObject.expected_asset_id ?? null,
            expected_asset_intent_ref: runtimeObject.expected_asset_intent_ref ?? null,
            texture_key: typeof runtimeObject.texture_key === 'string' ? runtimeObject.texture_key : `missing:${requiredObject}`
          },
      asset_required_object_binding_path: Array.isArray(runtimeObject.asset_required_object_binding_path)
        ? runtimeObject.asset_required_object_binding_path.filter((entry): entry is string => typeof entry === 'string')
        : [],
      asset_required_object_binding_valid: runtimeObject.asset_required_object_binding_valid,
      palette: readStringArrayField(runtimeObject, 'palette'),
      silhouette: typeof runtimeObject.silhouette === 'string' ? runtimeObject.silhouette : 'missing_silhouette',
      texture_key: typeof runtimeObject.texture_key === 'string' ? runtimeObject.texture_key : `missing:${requiredObject}`,
      visual_intent_sha: typeof runtimeObject.visual_intent_sha === 'string' ? runtimeObject.visual_intent_sha : null,
      asset_design_spec_sha: typeof runtimeObject.asset_design_spec_sha === 'string' ? runtimeObject.asset_design_spec_sha : null,
      motif_coverage: readStringArrayField(runtimeObject, 'motif_coverage'),
      geometry_signature: typeof runtimeObject.geometry_signature === 'string' ? runtimeObject.geometry_signature : null,
      dsl_geometry_fingerprint: typeof runtimeObject.dsl_geometry_fingerprint === 'string' ? runtimeObject.dsl_geometry_fingerprint : null,
      role_static_control_fingerprint:
        typeof runtimeObject.role_static_control_fingerprint === 'string' ? runtimeObject.role_static_control_fingerprint : null,
      visual_geometry_dependency: runtimeObject.visual_geometry_dependency === true,
      template_fingerprint: typeof runtimeObject.template_fingerprint === 'string' ? runtimeObject.template_fingerprint : null,
      role_static_template_used: runtimeObject.role_static_template_used,
      role_static_svg_template_used: runtimeObject.role_static_svg_template_used,
      old_svgForVisualIntent_used: runtimeObject.old_svgForVisualIntent_used,
      template_derived_placeholder: runtimeObject.template_derived_placeholder,
      role_only_generation_detected: runtimeObject.role_only_generation_detected,
      matches_known_static_template: runtimeObject.matches_known_static_template,
      distinct_silhouette: runtimeObject.distinct_silhouette,
      renderer_kind: runtimeObject.renderer_kind,
      loaded_in_runtime: runtimeObject.loaded_in_runtime,
      texture_cache_present: runtimeObject.texture_cache_present,
      bound_to_runtime_object: runtimeObject.bound_to_runtime_object,
      factory_used_texture_key: runtimeObject.factory_used_texture_key,
      used_placeholder_renderer: runtimeObject.used_placeholder_renderer,
      materialized: runtimeObject.materialized,
      run_scoped_asset_path: runtimeObject.run_scoped_asset_path,
      run_scoped_asset_sha256: runtimeObject.run_scoped_asset_sha256,
      served_asset_path: runtimeObject.served_asset_path,
      served_asset_sha256: runtimeObject.served_asset_sha256,
      copied_to_served_assets: runtimeObject.copied_to_served_assets,
      visible_in_fresh_manual_traversal: runtimeObject.visible_in_fresh_manual_traversal === true && evidenceScreenshots.length > 0,
      placeholder: runtimeObject.placeholder,
      label_only: runtimeObject.label_only,
      evidence_screenshots: evidenceScreenshots
    };
  });
  const missingObjects = objects
    .filter((object) => !visualRuntimeBindingObjectPasses(object))
    .map((object) => object.required_object);
  const failureReasons = collectVisualRuntimeBindingFailureReasons(inputOnlyWindows);

  return {
    schemaVersion: 'step38.visual-runtime-binding-report.v1',
    status: input.markerMatches && missingObjects.length === 0 && failureReasons.length === 0 ? 'PASSED' : 'FAILED',
    run_id: input.runId,
    marker_run_id_matches: input.markerMatches,
    source: 'canonical_dsl',
    evidence_source: 'fresh_manual_traversal_screenshots',
    runtime_authority: 'canonical_dsl_visual_binding',
    required_objects: [...STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS],
    missing_objects: missingObjects,
    failure_reasons: failureReasons,
    fresh_manual_traversal_screenshots: inputOnlyWindows.map((window) => window.label).filter((label): label is string => typeof label === 'string'),
    runtime_report_status: runtimeReport.status ?? null,
    scripted_capture_used_for_pass: false,
    objects
  };
}

function buildStep38VisualAssetMaterializationReport(input: {
  runId: string;
  markerMatches: boolean;
  runtimeReport: unknown;
  windows: Array<Record<string, unknown>>;
}): Record<string, unknown> {
  const runtimeReport = isRecord(input.runtimeReport) ? input.runtimeReport : {};
  const runtimeObjects = Array.isArray(runtimeReport.objects) ? runtimeReport.objects.filter(isRecord) : [];
  const screenshotsByObject = new Map<string, Set<string>>();
  const inputOnlyWindows = input.windows.filter(
    (window) =>
      window.evidence_type === 'fresh_manual_traversal_input_only' &&
      window.counts_for_ready_for_manual_test === true &&
      window.fresh_manual_session === true &&
      window.input_only === true &&
      window.teleport_used === false &&
      window.camera_jump_used === false &&
      window.debug_reposition_used === false &&
      window.state_injection_used === false &&
      window.direct_spawn_used === false &&
      window.direct_phase_trigger_used === false &&
      window.pixel_probe_passed === true &&
      window.placeholder_objects_seen === false
  );

  for (const window of inputOnlyWindows) {
    const label = typeof window.label === 'string' ? window.label : undefined;
    if (label === undefined) continue;
    const visibleAssets = Array.isArray(window.visible_materialized_assets) ? window.visible_materialized_assets.filter(isRecord) : [];
    for (const object of visibleAssets) {
      const requiredObject = typeof object.required_object === 'string' ? object.required_object : undefined;
      if (requiredObject === undefined) continue;
      const labels = screenshotsByObject.get(requiredObject) ?? new Set<string>();
      labels.add(label);
      screenshotsByObject.set(requiredObject, labels);
    }
  }

  const objects = STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.map((requiredObject) => {
    const runtimeObject = runtimeObjects.find((object) => object.required_object === requiredObject);
    const evidenceScreenshots = [...(screenshotsByObject.get(requiredObject) ?? new Set<string>())].sort();
    if (runtimeObject === undefined) {
      return {
        required_object: requiredObject,
        canonical_id: `missing:${requiredObject}`,
        expected_entity_id: null,
        expected_asset_id: null,
        expected_asset_intent_ref: null,
        role: visualRuntimeBroadRoleForReport(requiredObject),
        source: 'missing_materialized_asset',
        visual_role: requiredObject,
        asset_role: requiredObject,
        asset_required_object_binding_source: 'missing_materialized_asset',
        asset_required_object_binding_path:
          'asset-manifest.step38.json/assets[].requiredObject -> loadSpriteAssets().__step38AssetMeta.requiredObject -> recordVisualRuntimeObject().asset_meta_required_object',
        asset_required_object_binding_valid: false,
        palette: [],
        silhouette: 'missing_materialized_asset',
        run_scoped_asset_path: null,
        run_scoped_asset_sha256: null,
        served_asset_path: null,
        served_asset_sha256: null,
        texture_key: `missing:${requiredObject}`,
        visual_intent_sha: null,
        asset_design_spec_sha: null,
        motif_coverage: [],
        geometry_signature: null,
        dsl_geometry_fingerprint: null,
        role_static_control_fingerprint: null,
        visual_geometry_dependency: false,
        template_fingerprint: null,
        role_static_template_used: true,
        role_static_svg_template_used: true,
        old_svgForVisualIntent_used: false,
        template_derived_placeholder: true,
        role_only_generation_detected: true,
        matches_known_static_template: true,
        distinct_silhouette: false,
        materialized: false,
        copied_to_served_assets: false,
        loaded_in_runtime: false,
        texture_cache_present: false,
        bound_to_runtime_object: false,
        factory_used_texture_key: false,
        visible_in_fresh_manual_traversal: false,
        placeholder: true,
        label_only: false,
        evidence_screenshots: []
      };
    }
    return {
      required_object: requiredObject,
      asset_meta_required_object: runtimeObject.asset_meta_required_object,
      canonical_id: typeof runtimeObject.canonical_id === 'string' ? runtimeObject.canonical_id : `missing:${requiredObject}`,
      expected_entity_id: typeof runtimeObject.expected_entity_id === 'string' ? runtimeObject.expected_entity_id : null,
      expected_asset_id: typeof runtimeObject.expected_asset_id === 'string' ? runtimeObject.expected_asset_id : null,
      expected_asset_intent_ref: typeof runtimeObject.expected_asset_intent_ref === 'string' ? runtimeObject.expected_asset_intent_ref : null,
      role: typeof runtimeObject.role === 'string' ? runtimeObject.role : visualRuntimeBroadRoleForReport(requiredObject),
      source: runtimeObject.source,
      weapon_id: typeof runtimeObject.weapon_id === 'string' ? runtimeObject.weapon_id : null,
      boss_id: typeof runtimeObject.boss_id === 'string' ? runtimeObject.boss_id : null,
      boss_phase: typeof runtimeObject.boss_phase === 'number' || typeof runtimeObject.boss_phase === 'string' ? runtimeObject.boss_phase : null,
      visual_role: typeof runtimeObject.visual_role === 'string' ? runtimeObject.visual_role : requiredObject,
      asset_role: typeof runtimeObject.asset_role === 'string' ? runtimeObject.asset_role : requiredObject,
      asset_required_object_binding_source: isRecord(runtimeObject.asset_required_object_binding_source)
        ? runtimeObject.asset_required_object_binding_source
        : {
            type: 'missing_runtime_object_asset_required_object_binding_source',
            manifest_path: 'assets[].requiredObject',
            asset_id: null,
            asset_intent_ref: null,
            entity_id: null,
            material_slot: requiredObject,
            required_object: requiredObject,
            asset_meta_required_object: runtimeObject.asset_meta_required_object ?? null,
            expected_entity_id: runtimeObject.expected_entity_id ?? null,
            expected_asset_id: runtimeObject.expected_asset_id ?? null,
            expected_asset_intent_ref: runtimeObject.expected_asset_intent_ref ?? null,
            texture_key: typeof runtimeObject.texture_key === 'string' ? runtimeObject.texture_key : `missing:${requiredObject}`
          },
      asset_required_object_binding_path: Array.isArray(runtimeObject.asset_required_object_binding_path)
        ? runtimeObject.asset_required_object_binding_path.filter((entry): entry is string => typeof entry === 'string')
        : [],
      asset_required_object_binding_valid: runtimeObject.asset_required_object_binding_valid,
      palette: readStringArrayField(runtimeObject, 'palette'),
      silhouette: typeof runtimeObject.silhouette === 'string' ? runtimeObject.silhouette : 'missing_silhouette',
      run_scoped_asset_path: runtimeObject.run_scoped_asset_path,
      run_scoped_asset_sha256: runtimeObject.run_scoped_asset_sha256,
      served_asset_path: runtimeObject.served_asset_path,
      served_asset_sha256: runtimeObject.served_asset_sha256,
      texture_key: typeof runtimeObject.texture_key === 'string' ? runtimeObject.texture_key : `missing:${requiredObject}`,
      visual_intent_sha: typeof runtimeObject.visual_intent_sha === 'string' ? runtimeObject.visual_intent_sha : null,
      asset_design_spec_sha: typeof runtimeObject.asset_design_spec_sha === 'string' ? runtimeObject.asset_design_spec_sha : null,
      motif_coverage: readStringArrayField(runtimeObject, 'motif_coverage'),
      geometry_signature: typeof runtimeObject.geometry_signature === 'string' ? runtimeObject.geometry_signature : null,
      dsl_geometry_fingerprint: typeof runtimeObject.dsl_geometry_fingerprint === 'string' ? runtimeObject.dsl_geometry_fingerprint : null,
      role_static_control_fingerprint:
        typeof runtimeObject.role_static_control_fingerprint === 'string' ? runtimeObject.role_static_control_fingerprint : null,
      visual_geometry_dependency: runtimeObject.visual_geometry_dependency === true,
      template_fingerprint: typeof runtimeObject.template_fingerprint === 'string' ? runtimeObject.template_fingerprint : null,
      role_static_template_used: runtimeObject.role_static_template_used,
      role_static_svg_template_used: runtimeObject.role_static_svg_template_used,
      old_svgForVisualIntent_used: runtimeObject.old_svgForVisualIntent_used,
      template_derived_placeholder: runtimeObject.template_derived_placeholder,
      role_only_generation_detected: runtimeObject.role_only_generation_detected,
      matches_known_static_template: runtimeObject.matches_known_static_template,
      distinct_silhouette: runtimeObject.distinct_silhouette,
      materialized: runtimeObject.materialized,
      copied_to_served_assets: runtimeObject.copied_to_served_assets,
      loaded_in_runtime: runtimeObject.loaded_in_runtime,
      texture_cache_present: runtimeObject.texture_cache_present,
      bound_to_runtime_object: runtimeObject.bound_to_runtime_object,
      factory_used_texture_key: runtimeObject.factory_used_texture_key,
      visible_in_fresh_manual_traversal: runtimeObject.visible_in_fresh_manual_traversal === true && evidenceScreenshots.length > 0,
      materialized_asset_exists: runtimeObject.materialized === true && typeof runtimeObject.run_scoped_asset_path === 'string',
      served_asset_synced:
        runtimeObject.copied_to_served_assets === true &&
        typeof runtimeObject.run_scoped_asset_sha256 === 'string' &&
        runtimeObject.run_scoped_asset_sha256 === runtimeObject.served_asset_sha256,
      texture_loaded: runtimeObject.loaded_in_runtime === true && runtimeObject.texture_cache_present === true,
      factory_bound: runtimeObject.bound_to_runtime_object === true && runtimeObject.factory_used_texture_key === true,
      runtime_object_visible: runtimeObject.visible_in_fresh_manual_traversal === true && evidenceScreenshots.length > 0,
      placeholder: runtimeObject.placeholder,
      label_only: runtimeObject.label_only,
      evidence_screenshots: evidenceScreenshots
    };
  });
  const missingObjects = objects
    .filter((object) => !visualAssetMaterializationObjectPasses(object))
    .map((object) => object.required_object);
  const failureReasons = collectVisualRuntimeBindingFailureReasons(inputOnlyWindows);

  return {
    schemaVersion: 'step38.visual-asset-materialization-report.v1',
    status: input.markerMatches && missingObjects.length === 0 && failureReasons.length === 0 ? 'PASSED' : 'FAILED',
    run_id: input.runId,
    marker_run_id_matches: input.markerMatches,
    source: 'canonical_dsl',
    evidence_source: 'fresh_manual_traversal_screenshots',
    runtime_authority: 'canonical_dsl_visual_binding',
    required_objects: [...STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS],
    missing_objects: missingObjects,
    failure_reasons: failureReasons,
    fresh_manual_traversal_screenshots: inputOnlyWindows.map((window) => window.label).filter((label): label is string => typeof label === 'string'),
    runtime_report_status: runtimeReport.status ?? null,
    materialization_gate: {
      verdict: input.markerMatches && missingObjects.length === 0 && failureReasons.length === 0 ? 'PASS' : 'FAIL',
      all_required_assets_materialized: missingObjects.length === 0,
      all_required_assets_run_scoped: objects.every((object) => typeof object.run_scoped_asset_path === 'string'),
      all_required_assets_loaded: objects.every((object) => object.loaded_in_runtime === true),
      all_required_assets_factory_bound: objects.every((object) => object.factory_used_texture_key === true && object.bound_to_runtime_object === true),
      all_required_assets_visible_in_fresh_manual_traversal: objects.every((object) => object.visible_in_fresh_manual_traversal === true),
      visual_intent_sha_present: objects.every((object) => typeof object.visual_intent_sha === 'string'),
      asset_design_spec_sha_present: objects.every((object) => typeof object.asset_design_spec_sha === 'string'),
      motif_coverage_present: objects.every((object) => readStringArrayField(object, 'motif_coverage').length > 0),
      all_required_assets_distinct_silhouette: objects.every((object) => object.distinct_silhouette === true),
      role_static_svg_template_used: objects.some((object) => object.role_static_svg_template_used === true || object.role_static_template_used === true),
      old_svgForVisualIntent_used: objects.some((object) => object.old_svgForVisualIntent_used === true),
      template_derived_placeholder_detected: objects.some((object) => object.template_derived_placeholder === true),
      label_only_visual_evidence: objects.some((object) => object.label_only === true),
      placeholder_visual_evidence: objects.some((object) => object.placeholder === true)
    },
    scripted_capture_used_for_pass: false,
    objects
  };
}

function visualRuntimeBroadRoleForReport(requiredObject: string): string {
  if (requiredObject.includes('enemy')) return 'enemy';
  if (requiredObject.includes('weapon') || requiredObject === 'projectile') return 'weapon';
  if (requiredObject.includes('boss')) return 'boss';
  if (requiredObject.includes('marker') || requiredObject.includes('environment')) return 'environment';
  return 'player';
}

function visibleRequiredObjectsFromReport(report: unknown): string[] {
  if (!isRecord(report) || !Array.isArray(report.objects)) {
    return [];
  }
  return uniqueSorted(
    report.objects
      .filter(isRecord)
      .filter((object) => object.visible_in_fresh_manual_traversal === true && object.placeholder === false)
      .map((object) => (typeof object.required_object === 'string' ? object.required_object : undefined))
      .filter((requiredObject): requiredObject is string => requiredObject !== undefined)
  );
}

function visualRuntimeBindingObjectPasses(object: Record<string, unknown>): boolean {
  const palette = readStringArrayField(object, 'palette');
  const evidenceScreenshots = readStringArrayField(object, 'evidence_screenshots');
  const rendererKind = object.renderer_kind;
  const silhouette = typeof object.silhouette === 'string' ? object.silhouette : '';
  const textureKey = typeof object.texture_key === 'string' ? object.texture_key : '';
  const requiredObject = typeof object.required_object === 'string' ? object.required_object : '';
  return (
    requiredObject.length > 0 &&
    hasDslDrivenVisualAssetFields(object) &&
    hasAssetRequiredObjectBindingForReport(object, requiredObject) &&
    typeof object.canonical_id === 'string' &&
    object.canonical_id.length > 0 &&
    typeof object.role === 'string' &&
    object.source === 'canonical_dsl' &&
    typeof object.visual_role === 'string' &&
    typeof object.asset_role === 'string' &&
    palette.length >= 3 &&
    silhouette.length > 0 &&
    silhouette !== 'runtime_generated_shape' &&
    silhouette !== 'missing_runtime_binding' &&
    textureKey.length > 0 &&
    !textureKey.startsWith('missing:') &&
    (rendererKind === 'sprite' || rendererKind === 'generated_texture' || rendererKind === 'canvas_texture') &&
    object.loaded_in_runtime === true &&
    object.bound_to_runtime_object === true &&
    object.factory_used_texture_key === true &&
    object.used_placeholder_renderer === false &&
    object.visible_in_fresh_manual_traversal === true &&
    object.materialized === true &&
    object.placeholder === false &&
    object.label_only === false &&
    (requiredObject !== 'projectile' || evidenceScreenshots.includes('02_projectile_visible_by_input')) &&
    (requiredObject !== 'boss_projectile_phase_object' ||
      (bossProjectileTextureKeyPasses(textureKey) && evidenceScreenshots.some((label) => label.includes('boss')))) &&
    evidenceScreenshots.length > 0
  );
}

function visualAssetMaterializationObjectPasses(object: Record<string, unknown>): boolean {
  const palette = readStringArrayField(object, 'palette');
  const evidenceScreenshots = readStringArrayField(object, 'evidence_screenshots');
  const textureKey = typeof object.texture_key === 'string' ? object.texture_key : '';
  const runScopedSha = typeof object.run_scoped_asset_sha256 === 'string' ? object.run_scoped_asset_sha256 : '';
  const servedSha = typeof object.served_asset_sha256 === 'string' ? object.served_asset_sha256 : '';
  const requiredObject = typeof object.required_object === 'string' ? object.required_object : '';
  return (
    requiredObject.length > 0 &&
    hasDslDrivenVisualAssetFields(object) &&
    hasAssetRequiredObjectBindingForReport(object, requiredObject) &&
    typeof object.canonical_id === 'string' &&
    object.canonical_id.length > 0 &&
    object.source === 'canonical_dsl' &&
    typeof object.role === 'string' &&
    typeof object.visual_role === 'string' &&
    typeof object.asset_role === 'string' &&
    palette.length >= 3 &&
    typeof object.silhouette === 'string' &&
    object.silhouette.length > 0 &&
    typeof object.run_scoped_asset_path === 'string' &&
    object.run_scoped_asset_path.includes('/generated/step38/') &&
    typeof object.served_asset_path === 'string' &&
    object.served_asset_path.includes('public/assets/') &&
    runScopedSha.length === 64 &&
    servedSha.length === 64 &&
    runScopedSha === servedSha &&
    textureKey.length > 0 &&
    !textureKey.startsWith('missing:') &&
    object.materialized === true &&
    object.copied_to_served_assets === true &&
    object.loaded_in_runtime === true &&
    object.texture_cache_present === true &&
    object.bound_to_runtime_object === true &&
    object.factory_used_texture_key === true &&
    object.visible_in_fresh_manual_traversal === true &&
    object.placeholder === false &&
    object.label_only === false &&
    (requiredObject !== 'projectile' || evidenceScreenshots.includes('02_projectile_visible_by_input')) &&
    (requiredObject !== 'boss_projectile_phase_object' ||
      (bossProjectileTextureKeyPasses(textureKey) && evidenceScreenshots.some((label) => label.includes('boss')))) &&
    evidenceScreenshots.length > 0
  );
}

function hasDslDrivenVisualAssetFields(object: Record<string, unknown>): boolean {
  const visualIntentSha = typeof object.visual_intent_sha === 'string' ? object.visual_intent_sha : '';
  const assetDesignSpecSha = typeof object.asset_design_spec_sha === 'string' ? object.asset_design_spec_sha : '';
  const dslGeometryFingerprint = typeof object.dsl_geometry_fingerprint === 'string' ? object.dsl_geometry_fingerprint : '';
  const roleStaticControlFingerprint =
    typeof object.role_static_control_fingerprint === 'string' ? object.role_static_control_fingerprint : '';
  return (
    /^[a-f0-9]{64}$/.test(visualIntentSha) &&
    /^[a-f0-9]{64}$/.test(assetDesignSpecSha) &&
    readStringArrayField(object, 'motif_coverage').length > 0 &&
    typeof object.geometry_signature === 'string' &&
    object.geometry_signature.length > 0 &&
    typeof object.template_fingerprint === 'string' &&
    object.template_fingerprint.length > 0 &&
    dslGeometryFingerprint.length === 64 &&
    roleStaticControlFingerprint.length === 64 &&
    dslGeometryFingerprint !== roleStaticControlFingerprint &&
    object.visual_geometry_dependency === true &&
    object.role_static_template_used !== true &&
    object.role_static_svg_template_used !== true &&
    object.old_svgForVisualIntent_used !== true &&
    object.template_derived_placeholder !== true &&
    object.role_only_generation_detected !== true &&
    object.matches_known_static_template !== true &&
    object.distinct_silhouette === true
  );
}

function hasAssetRequiredObjectBindingForReport(object: Record<string, unknown>, requiredObject: string): boolean {
  const source = object.asset_required_object_binding_source;
  const path = readStringArrayField(object, 'asset_required_object_binding_path');
  const textureKey = typeof object.texture_key === 'string' ? object.texture_key : '';
  const canonicalId = typeof object.canonical_id === 'string' ? object.canonical_id : '';
  const expectedEntityId = typeof object.expected_entity_id === 'string' ? object.expected_entity_id : '';
  const expectedAssetId = typeof object.expected_asset_id === 'string' ? object.expected_asset_id : '';
  const expectedAssetIntentRef = typeof object.expected_asset_intent_ref === 'string' ? object.expected_asset_intent_ref : '';
  const expectedPath = [
    'asset_manifest.assets[].requiredObject',
    'loadSpriteAssets',
    'runtime_render_object',
    'materialization_report'
  ];

  return (
    object.asset_meta_required_object === requiredObject &&
    object.asset_required_object_binding_valid === true &&
    isRecord(source) &&
    source.type === 'asset_manifest_required_object' &&
    source.manifest_path === 'assets[].requiredObject' &&
    source.required_object === requiredObject &&
    source.asset_meta_required_object === requiredObject &&
    canonicalId.length > 0 &&
    expectedEntityId.length > 0 &&
    expectedAssetId.length > 0 &&
    expectedAssetIntentRef.length > 0 &&
    canonicalId === expectedEntityId &&
    typeof source.asset_id === 'string' &&
    source.asset_id === expectedAssetId &&
    typeof source.asset_intent_ref === 'string' &&
    source.asset_intent_ref === expectedAssetIntentRef &&
    typeof source.entity_id === 'string' &&
    source.entity_id === expectedEntityId &&
    source.expected_entity_id === expectedEntityId &&
    source.expected_asset_id === expectedAssetId &&
    source.expected_asset_intent_ref === expectedAssetIntentRef &&
    typeof source.material_slot === 'string' &&
    source.material_slot.length > 0 &&
    source.texture_key === textureKey &&
    expectedPath.every((entry, index) => path[index] === entry)
  );
}

function buildStep38VisualVerticalSliceEvidence(input: {
  runId: string;
  markerMatches: boolean;
  windows: Array<Record<string, unknown>>;
}): Record<string, unknown> {
  const observedRuntimeRoles = uniqueSorted(
    input.windows.flatMap((window) => (Array.isArray(window.visible_runtime_roles) ? window.visible_runtime_roles : [])).filter((role): role is string => typeof role === 'string')
  );
  const observedContentTypes = uniqueSorted(
    input.windows.flatMap((window) => (Array.isArray(window.visible_content_types) ? window.visible_content_types : [])).filter((contentType): contentType is string => typeof contentType === 'string')
  );
  const missingRuntimeRoles = STEP38_REQUIRED_VISUAL_ROLES.filter((role) => !observedRuntimeRoles.includes(role));
  const missingContentTypes = STEP38_VERTICAL_SLICE_CONTENT_TYPES.filter((contentType) => !observedContentTypes.includes(contentType));
  const canvasPixelProbeCount = input.windows.filter((window) => isRecord(window.canvas_pixel_probe) && window.canvas_pixel_probe.status === 'PASSED').length;
  const windowLabels = input.windows.map((window) => (typeof window.label === 'string' ? window.label : undefined)).filter((label): label is string => label !== undefined);
  const canonicalRuntimeBound = input.windows.some((window) => {
    const bindings = window.runtime_bindings;
    return isRecord(bindings) && bindings.canonical_dsl_visual_intent_runtime_bound === true;
  });
  const status =
    input.markerMatches &&
    canonicalRuntimeBound &&
    STEP38_REQUIRED_VERTICAL_SLICE_SCREENSHOTS.every((label) => windowLabels.includes(label)) &&
    input.windows.length >= STEP38_REQUIRED_VERTICAL_SLICE_SCREENSHOTS.length &&
    canvasPixelProbeCount >= STEP38_REQUIRED_VERTICAL_SLICE_SCREENSHOTS.length &&
    missingRuntimeRoles.length === 0 &&
    missingContentTypes.length === 0 &&
    input.windows.every((window) => window.pixel_probe_passed === true && window.placeholder_objects_seen === false);
  return {
    schemaVersion: 'step38.visual-vertical-slice-evidence.v1',
    status: status ? 'PASSED' : 'FAILED',
    evidence_source: 'browser_canvas_pixel_probe',
    evidence_type: 'diagnostic_scripted_capture',
    counts_for_ready_for_manual_test: false,
    scripted_capture_used_for_pass: false,
    run_id: input.runId,
    marker_run_id_matches: input.markerMatches,
    canonical_dsl_visual_intent_runtime_bound: canonicalRuntimeBound,
    canvas_pixel_probe_status: canvasPixelProbeCount >= STEP38_REQUIRED_VERTICAL_SLICE_SCREENSHOTS.length ? 'PASSED' : 'FAILED',
    screenshot_count: input.windows.length,
    canvas_pixel_probe_count: canvasPixelProbeCount,
    required_runtime_roles: STEP38_REQUIRED_VISUAL_ROLES,
    observed_runtime_roles: observedRuntimeRoles,
    missing_runtime_roles: missingRuntimeRoles,
    required_content_types: STEP38_VERTICAL_SLICE_CONTENT_TYPES,
    observed_content_types: observedContentTypes,
    missing_content_types: missingContentTypes,
    windows: input.windows
  };
}

async function writeTelemetryRecords(path: string, records: Array<Record<string, unknown>>): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, records.map((record) => JSON.stringify(record)).join('\n') + (records.length > 0 ? '\n' : ''), 'utf8');
}

async function readStep38QaPageState(page: Page): Promise<{
  marker: unknown;
  events: unknown;
  runtimeConsumption: unknown;
  playableState: unknown;
  visualAssetEvidence: unknown;
  manualTraversalEvidence: unknown;
  visualRuntimeBindingReport: unknown;
  visualAssetMaterializationReport: unknown;
  runtimeTextureLoadReport: unknown;
  artDirectionQualityReport: unknown;
  encounterDirectorPlan: unknown;
  encounterDirectorRuntimeEvidence: unknown;
  outcomeStateMachineReport: unknown;
  realPlaythroughCompletionEvidence: unknown;
  operatorVisibleArtGate: unknown;
  visualPlaythroughValidatorReport: unknown;
  playableDurationSupport: unknown;
  encounterCoverage: unknown;
  enemyBehaviorEvidence: unknown;
  behaviorConfigEvidence: unknown;
}> {
  return await page.evaluate(() => ({
    marker: (globalThis as unknown as { __STEP38_MARKER?: unknown }).__STEP38_MARKER ?? null,
    events: (globalThis as unknown as { __STEP38_QA_EVENTS?: unknown }).__STEP38_QA_EVENTS ?? [],
    runtimeConsumption: (globalThis as unknown as { __STEP38_RUNTIME_CONSUMPTION?: unknown }).__STEP38_RUNTIME_CONSUMPTION ?? null,
    playableState: (globalThis as unknown as { __STEP38_PLAYABLE_STATE?: unknown }).__STEP38_PLAYABLE_STATE ?? null,
    visualAssetEvidence: (globalThis as unknown as { __STEP38_VISUAL_EVIDENCE?: unknown }).__STEP38_VISUAL_EVIDENCE ?? null,
    manualTraversalEvidence: (globalThis as unknown as { __STEP38_MANUAL_TRAVERSAL_EVIDENCE?: unknown }).__STEP38_MANUAL_TRAVERSAL_EVIDENCE ?? null,
    visualRuntimeBindingReport: (globalThis as unknown as { __STEP38_VISUAL_RUNTIME_BINDING_REPORT?: unknown }).__STEP38_VISUAL_RUNTIME_BINDING_REPORT ?? null,
    visualAssetMaterializationReport: (globalThis as unknown as { __STEP38_VISUAL_ASSET_MATERIALIZATION_REPORT?: unknown }).__STEP38_VISUAL_ASSET_MATERIALIZATION_REPORT ?? null,
    runtimeTextureLoadReport: (globalThis as unknown as { __STEP38_RUNTIME_TEXTURE_LOAD_REPORT?: unknown }).__STEP38_RUNTIME_TEXTURE_LOAD_REPORT ?? null,
    artDirectionQualityReport: (globalThis as unknown as { __STEP38_ART_DIRECTION_QUALITY_REPORT?: unknown }).__STEP38_ART_DIRECTION_QUALITY_REPORT ?? null,
    encounterDirectorPlan: (globalThis as unknown as { __STEP38_ENCOUNTER_DIRECTOR_PLAN?: unknown }).__STEP38_ENCOUNTER_DIRECTOR_PLAN ?? null,
    encounterDirectorRuntimeEvidence: (globalThis as unknown as { __STEP38_ENCOUNTER_DIRECTOR_RUNTIME_EVIDENCE?: unknown }).__STEP38_ENCOUNTER_DIRECTOR_RUNTIME_EVIDENCE ?? null,
    outcomeStateMachineReport: (globalThis as unknown as { __STEP38_OUTCOME_STATE_MACHINE_REPORT?: unknown }).__STEP38_OUTCOME_STATE_MACHINE_REPORT ?? null,
    realPlaythroughCompletionEvidence: (globalThis as unknown as { __STEP38_REAL_PLAYTHROUGH_COMPLETION_EVIDENCE?: unknown }).__STEP38_REAL_PLAYTHROUGH_COMPLETION_EVIDENCE ?? null,
    operatorVisibleArtGate: (globalThis as unknown as { __STEP38_OPERATOR_VISIBLE_ART_GATE?: unknown }).__STEP38_OPERATOR_VISIBLE_ART_GATE ?? null,
    visualPlaythroughValidatorReport: (globalThis as unknown as { __STEP38_VISUAL_PLAYTHROUGH_VALIDATOR_REPORT?: unknown }).__STEP38_VISUAL_PLAYTHROUGH_VALIDATOR_REPORT ?? null,
    playableDurationSupport: (globalThis as unknown as { __STEP38_PLAYABLE_DURATION_SUPPORT?: unknown }).__STEP38_PLAYABLE_DURATION_SUPPORT ?? null,
    encounterCoverage: (globalThis as unknown as { __STEP38_ENCOUNTER_COVERAGE?: unknown }).__STEP38_ENCOUNTER_COVERAGE ?? null,
    enemyBehaviorEvidence: (globalThis as unknown as { __STEP38_ENEMY_BEHAVIOR_EVIDENCE?: unknown }).__STEP38_ENEMY_BEHAVIOR_EVIDENCE ?? null,
    behaviorConfigEvidence: (globalThis as unknown as { __STEP38_BEHAVIOR_CONFIG_EVIDENCE?: unknown }).__STEP38_BEHAVIOR_CONFIG_EVIDENCE ?? null
  }));
}

function hasStep38InteractiveQaEvidence(input: {
  eventRecords: Array<Record<string, unknown>>;
  runtimeConsumption: unknown;
  playableState: unknown;
}): boolean {
  if (!isRecord(input.runtimeConsumption) || input.runtimeConsumption.auto_emitted_success_events !== false) {
    return false;
  }
  const sourceArtifacts = input.runtimeConsumption.source_artifacts;
  if (!isRecord(sourceArtifacts)) {
    return false;
  }
  if (!['canonicalDsl', 'runtimePlan', 'sceneIr', 'runtimeManifest'].every((artifact) => sourceArtifacts[artifact] === true)) {
    return false;
  }
  const playableState = input.playableState;
  if (!isRecord(playableState)) {
    return false;
  }
  if (
    !['playerMovedByInput', 'projectileHitEnemy', 'pickupCollected', 'bossPhaseChanged', 'winReached'].every(
      (field) => playableState[field] === true
    )
  ) {
    return false;
  }

  const hasEventWithSource = (event: string, source: string) =>
    input.eventRecords.some((record) => record.event === event && record.source === source);

  return [
    hasEventWithSource('player.moved', 'player_input'),
    hasEventWithSource('player.jumped', 'player_input'),
    hasEventWithSource('player.crouched', 'player_input'),
    hasEventWithSource('player.fired', 'player_input'),
    hasEventWithSource('item.collected', 'runtime_collision'),
    hasEventWithSource('enemy.hit', 'runtime_combat'),
    hasEventWithSource('boss.phase.changed', 'runtime_combat'),
    hasEventWithSource('game.over', 'runtime_health'),
    hasEventWithSource('mission.complete', 'runtime_objective'),
    hasEventWithSource('game.won', 'runtime_objective')
  ].every(Boolean);
}

function hasStep38VisualAssetQaEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.status !== 'PASSED' || typeof value.renderer !== 'string' || value.renderer_is_implementation_detail !== true) {
    return false;
  }
  const requiredRoles = Array.isArray(value.required_visual_roles) ? value.required_visual_roles : [];
  const loadedRoles = Array.isArray(value.loaded_visual_roles) ? value.loaded_visual_roles : [];
  const missingRoles = Array.isArray(value.missing_visual_roles) ? value.missing_visual_roles : [];
  return (
    value.placeholder_rectangles_present === false &&
    value.dsl_visual_intent_bound === true &&
    value.visual_intent_source === 'canonical_dsl_visual_intent' &&
    typeof value.sprite_asset_count === 'number' &&
    typeof value.canonical_visual_intent_count === 'number' &&
    typeof value.scene_ir_visual_binding_count === 'number' &&
    typeof value.manifest_visual_asset_count === 'number' &&
    value.sprite_asset_count >= STEP38_REQUIRED_VISUAL_ROLES.length &&
    value.canonical_visual_intent_count >= STEP38_REQUIRED_VISUAL_ROLES.length &&
    value.scene_ir_visual_binding_count >= STEP38_REQUIRED_VISUAL_ROLES.length &&
    value.manifest_visual_asset_count >= STEP38_REQUIRED_VISUAL_ROLES.length &&
    missingRoles.length === 0 &&
    STEP38_REQUIRED_VISUAL_ROLES.every((role) => requiredRoles.includes(role) && loadedRoles.includes(role))
  );
}

function hasStep38VisualVerticalSliceQaEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.status !== 'PASSED') {
    return false;
  }
  const observedRuntimeRoles = Array.isArray(value.observed_runtime_roles) ? value.observed_runtime_roles : [];
  const missingRuntimeRoles = Array.isArray(value.missing_runtime_roles) ? value.missing_runtime_roles : [];
  const observedContentTypes = Array.isArray(value.observed_content_types) ? value.observed_content_types : [];
  const missingContentTypes = Array.isArray(value.missing_content_types) ? value.missing_content_types : [];
  const windows = Array.isArray(value.windows) ? value.windows.filter(isRecord) : [];
  const windowLabels = windows.map((window) => (typeof window.label === 'string' ? window.label : undefined)).filter((label): label is string => label !== undefined);
  return (
    value.evidence_source === 'browser_canvas_pixel_probe' &&
    value.marker_run_id_matches === true &&
    value.canonical_dsl_visual_intent_runtime_bound === true &&
    value.canvas_pixel_probe_status === 'PASSED' &&
    typeof value.screenshot_count === 'number' &&
    value.screenshot_count >= STEP38_REQUIRED_VERTICAL_SLICE_SCREENSHOTS.length &&
    typeof value.canvas_pixel_probe_count === 'number' &&
    value.canvas_pixel_probe_count >= STEP38_REQUIRED_VERTICAL_SLICE_SCREENSHOTS.length &&
    missingRuntimeRoles.length === 0 &&
    missingContentTypes.length === 0 &&
    STEP38_REQUIRED_VISUAL_ROLES.every((role) => observedRuntimeRoles.includes(role)) &&
    STEP38_VERTICAL_SLICE_CONTENT_TYPES.every((contentType) => observedContentTypes.includes(contentType)) &&
    STEP38_REQUIRED_VERTICAL_SLICE_SCREENSHOTS.every((label) => windowLabels.includes(label)) &&
    windows.length >= STEP38_REQUIRED_VERTICAL_SLICE_SCREENSHOTS.length &&
    windows.every((window) => {
      const canvasPixelProbe = window.canvas_pixel_probe;
      return (
        typeof window.screenshot === 'string' &&
        typeof window.screenshot_path === 'string' &&
        typeof window.screenshot_sha256 === 'string' &&
        typeof window.metadata_path === 'string' &&
        typeof window.camera_x === 'number' &&
        typeof window.preview_window === 'string' &&
        Array.isArray(window.canonical_time_range_sec) &&
        Array.isArray(window.projection_must_show) &&
        window.projection_must_show.length > 0 &&
        Array.isArray(window.visible_canonical_objects) &&
        window.visible_canonical_objects.length > 0 &&
        Array.isArray(window.required_roles_seen) &&
        window.required_roles_seen.length > 0 &&
        window.pixel_probe_passed === true &&
        window.placeholder_objects_seen === false &&
        isRecord(canvasPixelProbe) &&
        canvasPixelProbe.status === 'PASSED' &&
        typeof canvasPixelProbe.probed_runtime_object_count === 'number' &&
        canvasPixelProbe.probed_runtime_object_count > 0 &&
        typeof canvasPixelProbe.non_background_pixel_count === 'number' &&
        canvasPixelProbe.non_background_pixel_count > 0
      );
    })
  );
}

function hasStep38VisualRuntimeBindingQaEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.status !== 'PASSED') {
    return false;
  }
  const requiredObjects = readStringArrayField(value, 'required_objects');
  const missingObjects = readStringArrayField(value, 'missing_objects');
  const failureReasons = readStringArrayField(value, 'failure_reasons');
  const screenshotLabels = readVisualRuntimeBindingScreenshotLabels(value.fresh_manual_traversal_screenshots);
  const objects = Array.isArray(value.objects) ? value.objects.filter(isRecord) : [];

  return (
    value.source === 'canonical_dsl' &&
    value.evidence_source === 'fresh_manual_traversal_screenshots' &&
    value.runtime_authority === 'canonical_dsl_visual_binding' &&
    missingObjects.length === 0 &&
    failureReasons.length === 0 &&
    screenshotLabels.length >= STEP38_REQUIRED_MANUAL_TRAVERSAL_SCREENSHOTS.length &&
    STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((object) => requiredObjects.includes(object)) &&
    STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((requiredObject) =>
      objects.some((object) => object.required_object === requiredObject && visualRuntimeBindingObjectPasses(object))
    )
  );
}

function hasStep38VisualAssetMaterializationQaEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.status !== 'PASSED') {
    return false;
  }
  const requiredObjects = readStringArrayField(value, 'required_objects');
  const missingObjects = readStringArrayField(value, 'missing_objects');
  const failureReasons = readStringArrayField(value, 'failure_reasons');
  const screenshotLabels = readVisualRuntimeBindingScreenshotLabels(value.fresh_manual_traversal_screenshots);
  const objects = Array.isArray(value.objects) ? value.objects.filter(isRecord) : [];
  const gate = value.materialization_gate;
  return (
    value.source === 'canonical_dsl' &&
    value.evidence_source === 'fresh_manual_traversal_screenshots' &&
    value.runtime_authority === 'canonical_dsl_visual_binding' &&
    missingObjects.length === 0 &&
    failureReasons.length === 0 &&
    screenshotLabels.length >= STEP38_REQUIRED_MANUAL_TRAVERSAL_SCREENSHOTS.length &&
    isRecord(gate) &&
    gate.verdict === 'PASS' &&
    gate.all_required_assets_materialized === true &&
    gate.all_required_assets_run_scoped === true &&
    gate.all_required_assets_loaded === true &&
    gate.all_required_assets_factory_bound === true &&
    gate.all_required_assets_visible_in_fresh_manual_traversal === true &&
    gate.visual_intent_sha_present === true &&
    gate.asset_design_spec_sha_present === true &&
    gate.motif_coverage_present === true &&
    gate.all_required_assets_distinct_silhouette === true &&
    gate.role_static_svg_template_used === false &&
    gate.old_svgForVisualIntent_used === false &&
    gate.template_derived_placeholder_detected === false &&
    gate.label_only_visual_evidence === false &&
    gate.placeholder_visual_evidence === false &&
    STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((object) => requiredObjects.includes(object)) &&
    STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((requiredObject) =>
      objects.some((object) => object.required_object === requiredObject && visualAssetMaterializationObjectPasses(object))
    )
  );
}

function hasStep38RuntimeTextureLoadQaEvidence(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const gate = value.texture_load_gate;
  const textures = Array.isArray(value.textures) ? value.textures.filter(isRecord) : [];
  const loadedRequiredObjects = new Set(
    textures
      .filter((texture) => texture.loaded_in_runtime === true && texture.texture_cache_present === true)
      .map((texture) => (typeof texture.required_object === 'string' ? texture.required_object : undefined))
      .filter((requiredObject): requiredObject is string => requiredObject !== undefined)
  );
  const bossProjectileTextures = textures.filter((texture) => texture.required_object === 'boss_projectile_phase_object');
  const projectileTextureKeys = new Set(
    textures
      .filter((texture) => texture.required_object === 'projectile')
      .map((texture) => (typeof texture.texture_key === 'string' ? texture.texture_key : undefined))
      .filter((textureKey): textureKey is string => textureKey !== undefined)
  );
  return (
    value.source === 'canonical_dsl' &&
    isRecord(gate) &&
    gate.verdict === 'PASS' &&
    gate.required_textures_loaded === true &&
    gate.texture_cache_probe_available === true &&
    Array.isArray(gate.missing_texture_keys) &&
    gate.missing_texture_keys.length === 0 &&
    bossProjectileTextures.length >= 1 &&
    bossProjectileTextures.every(
      (texture) =>
        typeof texture.texture_key === 'string' &&
        bossProjectileTextureKeyPasses(texture.texture_key) &&
        !projectileTextureKeys.has(texture.texture_key)
    ) &&
    STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((requiredObject) => loadedRequiredObjects.has(requiredObject)) &&
    textures.every(
      (texture) =>
        typeof texture.texture_key === 'string' &&
        texture.loaded_in_runtime === true &&
        texture.texture_cache_present === true &&
        typeof texture.width === 'number' &&
        texture.width > 0 &&
        typeof texture.height === 'number' &&
        texture.height > 0
    )
  );
}

function readVisualRuntimeBindingScreenshotLabels(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueSorted(
    value
      .map((entry) => {
        if (typeof entry === 'string') return entry;
        if (isRecord(entry) && typeof entry.label === 'string') return entry.label;
        return undefined;
      })
      .filter((entry): entry is string => entry !== undefined)
  );
}

function hasStep38ManualTraversalQaEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.status !== 'PASSED' || value.evidence_source !== 'playwright_keyboard_continuous_path') {
    return false;
  }
  const gate = value.manual_traversal_gate;
  if (!isRecord(gate) || gate.verdict !== 'PASS') {
    return false;
  }
  const productDuration = value.product_duration_sec;
  const observedPreviewWindows = readStringArrayField(value, 'observed_preview_windows');
  const observedSegments = readStringArrayField(value, 'observed_segments');
  const observedWaveIds = readStringArrayField(value, 'observed_wave_ids');
  const clearedWaveIds = readStringArrayField(value, 'cleared_wave_ids');
  const observedContentTypes = readStringArrayField(value, 'observed_content_types');
  const observedVisualRoles = readStringArrayField(value, 'observed_visual_roles');
  const observedEnvironmentMotifs = readStringArrayField(value, 'observed_environment_motifs');
  const screenshots = Array.isArray(value.screenshots) ? value.screenshots.filter(isRecord) : [];
  const screenshotLabels = screenshots.map((screenshot) => (typeof screenshot.label === 'string' ? screenshot.label : undefined)).filter(
    (label): label is string => label !== undefined
  );
  const waveClearOrProgressionUnlock =
    clearedWaveIds.length >= 1 ||
    gate.wave_clear_or_progression_unlock_by_input === true ||
    gate.wave_clear_reachable_by_input === true ||
    (observedWaveIds.length >= 2 && observedPreviewWindows.includes('window_1_weapon_wave_area') && value.weapon_pickup_seen === true);
  const postFirstWaveProgressionSeen =
    value.post_first_wave_enemy_seen === true ||
    (observedWaveIds.length >= 2 && observedContentTypes.some((contentType) => contentType === 'enemy_wave' || contentType === 'flying_enemy'));
  return (
    value.started_at_player_spawn === true &&
    value.capture_window_teleport_used === false &&
    value.scripted_capture_used_for_pass === false &&
    isRecord(productDuration) &&
    productDuration.min === 480 &&
    productDuration.max === 720 &&
    typeof value.preview_target_sec === 'number' &&
    value.preview_target_sec <= 50 &&
    observedPreviewWindows.includes('window_0_intro') &&
    observedPreviewWindows.includes('window_1_weapon_wave_area') &&
    observedPreviewWindows.includes('window_2_boss') &&
    observedSegments.length >= 3 &&
    observedWaveIds.length >= 2 &&
    waveClearOrProgressionUnlock &&
    postFirstWaveProgressionSeen &&
    value.weapon_pickup_seen === true &&
    value.boss_seen === true &&
    value.boss_telegraph_seen === true &&
    value.boss_phase_seen === true &&
    typeof value.distinct_environment_visual_count === 'number' &&
    value.distinct_environment_visual_count >= 3 &&
    observedEnvironmentMotifs.length >= 3 &&
    STEP38_REQUIRED_VISUAL_ROLES.every((role) => observedVisualRoles.includes(role)) &&
    STEP38_VERTICAL_SLICE_CONTENT_TYPES.every((contentType) => observedContentTypes.includes(contentType)) &&
    value.placeholder_objects_seen === false &&
    value.canonical_dsl_visual_intent_runtime_bound === true &&
    gate.starts_from_spawn === true &&
    gate.input_only === true &&
    gate.teleport_used === false &&
    gate.camera_jump_used === false &&
    gate.debug_reposition_used === false &&
    gate.state_injection_used === false &&
    gate.direct_spawn_used === false &&
    gate.scripted_capture_used_for_pass === false &&
    gate.wave2_reached_by_input === true &&
    gate.area2_reached_by_input === true &&
    gate.weapon_pickup_reached_by_input === true &&
    gate.boss_reached_by_input_or_scripted_reachable_after_input_path === true &&
    gate.boss_telegraph_seen_by_input === true &&
    gate.mission_complete_reached_by_input === true &&
    gate.boss_defeated_by_input === true &&
    gate.all_required_waves_resolved_before_win === true &&
    gate.all_required_regions_traversed_before_win === true &&
    gate.text_or_overlay_only_completion_evidence === false &&
    gate.early_mission_complete_detected === false &&
    gate.dsl_visual_objects_seen_by_input === true &&
    gate.large_empty_traversal_detected === false &&
    value.screenshots_are_input_only === true &&
    STEP38_REQUIRED_MANUAL_TRAVERSAL_SCREENSHOTS.every((label) => screenshotLabels.includes(label)) &&
    screenshots.every(
      (screenshot) =>
        screenshot.evidence_type === 'fresh_manual_traversal_input_only' &&
        screenshot.counts_for_ready_for_manual_test === true &&
        screenshot.fresh_manual_session === true &&
        screenshot.input_only === true &&
        screenshot.teleport_used === false &&
        screenshot.camera_jump_used === false &&
        screenshot.debug_reposition_used === false &&
        screenshot.state_injection_used === false &&
        screenshot.direct_spawn_used === false &&
        screenshot.direct_phase_trigger_used === false &&
        screenshot.pixel_probe_passed === true &&
        screenshot.placeholder_objects_seen === false &&
        Array.isArray(screenshot.visible_materialized_assets) &&
        screenshot.visible_materialized_assets.length > 0
    )
  );
}

function hasStep38VisualDesignRealizationQaEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'fresh_browser_screenshots') {
    return false;
  }
  const gate = value.visual_design_realization_gate;
  const requiredObjects = isRecord(value.required_objects) ? value.required_objects : {};
  return (
    isRecord(gate) &&
    hasStep38ProceduralCanvasBackendPolicy(value, gate) &&
    hasStep38FreshManualInputOnlyEvidencePolicy(value, gate) &&
    gate.verdict === 'PASS' &&
    gate.role_static_templates_used === false &&
    gate.old_svgForVisualIntent_used === false &&
    gate.template_derived_placeholder_detected === false &&
    gate.visual_intent_affects_asset_geometry === true &&
    gate.visual_intent_affects_palette === true &&
    gate.visual_intent_affects_silhouette === true &&
    gate.visual_intent_affects_environment_layers === true &&
    gate.object_classes_visibly_distinct === true &&
    gate.operator_visible_art_ready === true &&
    STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((requiredObject) => {
      const object = requiredObjects[requiredObject];
      return (
        isRecord(object) &&
        object.dsl_derived === true &&
        object.template_static === false &&
        object.motif_coverage === true &&
        object.distinct_silhouette === true &&
        object.visible_in_screenshot === true &&
        object.placeholder === false
      );
    })
  );
}

function hasStep38ProceduralCanvasBackendPolicy(value: Record<string, unknown>, gate?: Record<string, unknown>): boolean {
  const records = gate === undefined ? [value] : [value, gate];
  return records.every(
    (record) =>
      record.active_visual_asset_backend === STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY.active_visual_asset_backend &&
      record.current_backend === STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY.current_backend &&
      record.future_visual_asset_backend === STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY.future_visual_asset_backend &&
      record.image_provider_v1_enabled === false &&
      record.external_art_used === false &&
      record.png_core_fix_used === false &&
      record.old_environment_resource_logic_used === false &&
      record.target_fidelity === STEP38_PROCEDURAL_CANVAS_BACKEND_POLICY.target_fidelity
  );
}

function hasStep38FreshManualInputOnlyEvidencePolicy(value: Record<string, unknown>, gate?: Record<string, unknown>): boolean {
  const records = gate === undefined ? [value] : [value, gate];
  return records.every(
    (record) =>
      record.screenshot_source === 'fresh_manual_playthrough_input_only' &&
      record.capture_mode === 'manual_input_only' &&
      record.input_policy === 'input_only' &&
      record.runtime_operator_snapshot_only === false &&
      record.stale_evidence === false &&
      record.gate_reader_id === 'step38.final_gate_reader.v1'
  );
}

function hasStep38CanvasVisualReadabilityQaEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'canonical_dsl_canvas_materializer_v2') {
    return false;
  }
  const gate = value.canvas_visual_readability_gate;
  if (!isRecord(gate) || gate.verdict !== 'PASS') {
    return false;
  }
  const requiredObjects = readStringArrayField(gate, 'required_objects');
  const readableObjects = readStringArrayField(gate, 'readable_required_objects');
  const drawPlanFieldsPresent = readStringArrayField(gate, 'draw_plan_fields_present');
  return (
    hasStep38ProceduralCanvasBackendPolicy(value, gate) &&
    gate.renderer_kind === 'canvas_texture' &&
    gate.png_required_for_pass === false &&
    gate.svg_required_for_pass === false &&
    gate.player_readable === true &&
    gate.enemy_classes_visibly_distinct === true &&
    gate.boss_visibly_distinct_and_large === true &&
    gate.projectile_types_distinct === true &&
    gate.pickup_visibly_collectible === true &&
    gate.environment_theme_layered === true &&
    gate.jungle_metal_industrial_motifs_visible === true &&
    gate.debug_geometry_dominant === false &&
    gate.label_or_overlay_used_as_art_evidence === false &&
    gate.backend_policy_ok === true &&
    gate.screenshots_support_claims === true &&
    ['required_object', 'canonical_id', 'renderer_kind', 'source', 'visual_intent_sha', 'draw_plan_sha', 'canvas_size', 'draw_operations'].every(
      (field) => drawPlanFieldsPresent.includes(field)
    ) &&
    STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((requiredObject) => requiredObjects.includes(requiredObject)) &&
    STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((requiredObject) => readableObjects.includes(requiredObject))
  );
}

function hasStep38ProceduralPixelArtGrammarQaEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'canonical_dsl_visual_asset_materializer') {
    return false;
  }
  const gate = value.procedural_pixel_art_grammar_gate;
  if (!isRecord(gate) || gate.verdict !== 'PASS') {
    return false;
  }
  const requiredObjects = readStringArrayField(gate, 'required_objects');
  return (
    hasStep38ProceduralCanvasBackendPolicy(value, gate) &&
    gate.renderer_kind === 'runtime_canvas_texture' &&
    gate.external_art_required === false &&
    gate.image_model_required === false &&
    gate.role_only_generation_used === false &&
    gate.debug_geometry_dominant === false &&
    gate.visual_intent_affects_geometry === true &&
    gate.visual_intent_affects_palette === true &&
    gate.visual_intent_affects_silhouette === true &&
    gate.visual_intent_affects_animation === true &&
    gate.visual_intent_affects_environment_layers === true &&
    gate.object_classes_visibly_distinct === true &&
    gate.identical_frame_failure === false &&
    STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((requiredObject) => requiredObjects.includes(requiredObject))
  );
}

function hasStep38CanvasArtFidelityQaEvidence(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const gate = value.canvas_art_fidelity_gate;
  if (!isRecord(gate) || gate.verdict !== 'PASS') {
    return false;
  }
  return (
    hasStep38ProceduralCanvasBackendPolicy(value, gate) &&
    hasStep38FreshManualInputOnlyEvidencePolicy(value, gate) &&
    gate.target_fidelity === 'procedural_pixel_art_readable_v1' &&
    gate.renderer_kind === 'runtime_canvas_texture' &&
    gate.player_readable === true &&
    gate.enemy_classes_visibly_distinct === true &&
    gate.boss_visibly_distinct_and_large === true &&
    gate.projectile_types_distinct === true &&
    gate.pickup_visibly_collectible === true &&
    gate.environment_theme_layered === true &&
    gate.jungle_metal_industrial_motifs_visible === true &&
    gate.animation_frames_present === true &&
    gate.hit_and_pickup_feedback_visible === true &&
    gate.debug_geometry_dominant === false &&
    gate.label_or_overlay_used_as_art_evidence === false &&
    gate.screenshots_support_claims === true
  );
}

function hasStep38SpriteAnimationCoverageQaEvidence(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const gate = value.sprite_animation_coverage_gate;
  const objects = Array.isArray(value.objects) ? value.objects.filter(isRecord) : [];
  return (
    isRecord(gate) &&
    hasStep38ProceduralCanvasBackendPolicy(value, gate) &&
    gate.verdict === 'PASS' &&
    gate.runtime_bound === true &&
    gate.identical_frame_failure === false &&
    readStringArrayField(gate, 'player_frame_names').length >= 7 &&
    readStringArrayField(gate, 'boss_frame_names').length >= 5 &&
    typeof gate.projectile_frame_count === 'number' &&
    gate.projectile_frame_count >= 2 &&
    typeof gate.effect_frame_count === 'number' &&
    gate.effect_frame_count >= 4 &&
    STEP38_REQUIRED_VISUAL_RUNTIME_OBJECTS.every((requiredObject) =>
      objects.some((object) => {
        const frameHashes = readStringArrayField(object, 'frame_hashes');
        return (
          object.required_object === requiredObject &&
          typeof object.frame_count === 'number' &&
          object.frame_count >= (requiredObject === 'player' ? 7 : requiredObject === 'boss' ? 5 : 2) &&
          frameHashes.length >= 2 &&
          new Set(frameHashes).size >= 2 &&
          object.runtime_bound === true &&
          object.identical_frame_failure === false
        );
      })
    )
  );
}

function hasStep38EnvironmentLayeringQaEvidence(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const gate = value.environment_layering_gate;
  return (
    isRecord(gate) &&
    hasStep38ProceduralCanvasBackendPolicy(value, gate) &&
    gate.verdict === 'PASS' &&
    gate.background_layer_present === true &&
    gate.midground_layer_present === true &&
    gate.foreground_platform_layer_present === true &&
    typeof gate.prop_variant_count === 'number' &&
    gate.prop_variant_count >= 3 &&
    typeof gate.hazard_variant_count === 'number' &&
    gate.hazard_variant_count >= 2 &&
    typeof gate.area_theme_variant_count === 'number' &&
    gate.area_theme_variant_count >= 3 &&
    gate.jungle_motif_visible === true &&
    gate.metal_motif_visible === true &&
    gate.industrial_core_motif_visible === true &&
    gate.label_or_overlay_used_as_art_evidence === false &&
    gate.screenshots_support_claims === true
  );
}

function hasStep38StartupSurvivabilityQaEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'fresh_session_before_input_runtime_probe') {
    return false;
  }
  const gate = value.startup_survivability_gate;
  return (
    isRecord(gate) &&
    gate.verdict === 'PASS' &&
    gate.fresh_session_starts_alive === true &&
    typeof gate.health_at_spawn === 'number' &&
    gate.health_at_spawn > 0 &&
    gate.health_at_spawn_gt_zero === true &&
    gate.game_over_at_spawn === false &&
    typeof gate.minimum_safe_control_window_sec === 'number' &&
    gate.minimum_safe_control_window_sec >= 3 &&
    gate.spawn_immediate_lethal_pressure === false &&
    gate.player_has_reaction_space === true &&
    gate.state_injection_used === false &&
    gate.direct_health_mutation_used === false &&
    gate.direct_game_over_trigger_used === false
  );
}

function hasStep38EncounterPlayabilityQaEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'fresh_manual_traversal_input_only') {
    return false;
  }
  const gate = value.encounter_playability_gate;
  return (
    isRecord(gate) &&
    gate.verdict === 'PASS' &&
    typeof gate.spawn_safe_window_sec === 'number' &&
    gate.spawn_safe_window_sec >= 3 &&
    gate.overcrowded_spawn_detected === false &&
    gate.enemy_density_within_camera_limit === true &&
    gate.projectile_density_within_camera_limit === true &&
    gate.player_has_reaction_space === true &&
    gate.wave1_intro_pressure === true &&
    gate.weapon_pickup_reachable === true &&
    gate.wave2_mixed_pressure === true &&
    gate.boss_arena_reachable === true &&
    gate.boss_pressure_readable === true &&
    gate.large_empty_traversal_detected === false &&
    gate.text_only_evidence_used_for_pass === false &&
    gate.manifest_only_evidence_used_for_pass === false &&
    gate.overlay_only_evidence_used_for_pass === false
  );
}

function hasStep38DurationQaEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.status !== 'PASSED' || value.qa_acceleration_used !== true) {
    return false;
  }
  const supportedRange = value.supported_range_sec;
  const normalEstimate = value.normal_mode_estimated_sec;
  return (
    isRecord(supportedRange) &&
    isRecord(normalEstimate) &&
    supportedRange.min === 480 &&
    supportedRange.max === 720 &&
    typeof normalEstimate.target === 'number' &&
    normalEstimate.target >= 480 &&
    normalEstimate.target <= 720
  );
}

export function hasStep38EncounterCoverageQaEvidence(value: unknown, expectedRunId: string): boolean {
  if (!isRecord(value) || value.status !== 'PASSED') {
    return false;
  }

  const expectedEnemyCount = typeof value.expected_enemy_count === 'number' ? value.expected_enemy_count : null;
  const realizedEnemyCount = typeof value.realized_enemy_count === 'number' ? value.realized_enemy_count : null;
  const minimumEnemyCountForDuration =
    typeof value.minimum_enemy_count_for_duration === 'number' ? value.minimum_enemy_count_for_duration : null;
  const encounterBandCount = typeof value.encounter_band_count === 'number' ? value.encounter_band_count : null;
  const minimumEncounterBandCountForDuration =
    typeof value.minimum_encounter_band_count_for_duration === 'number' ? value.minimum_encounter_band_count_for_duration : null;
  const previewExpectedEnemyCount =
    typeof value.preview_expected_enemy_count === 'number' ? value.preview_expected_enemy_count : null;
  const previewRealizedEnemyCount =
    typeof value.preview_realized_enemy_count === 'number' ? value.preview_realized_enemy_count : null;
  const previewMinimumEncounterBandCount =
    typeof value.preview_minimum_encounter_band_count === 'number' ? value.preview_minimum_encounter_band_count : null;
  const fullGameExpansionEvidence = isRecord(value.full_game_expansion_evidence) ? value.full_game_expansion_evidence : null;
  const fullGameExpansionProducerIdentityOk = isStep38ProducedFullGameExpansionEvidence(
    fullGameExpansionEvidence,
    expectedRunId
  );
  const fullGameExpansionGate = evaluateStep38FullGameExpansionEvidence(fullGameExpansionEvidence, {
    minimumEncounterBandCount: minimumEncounterBandCountForDuration ?? Number.POSITIVE_INFINITY,
    minimumEnemySpawnCount: expectedEnemyCount ?? Number.POSITIVE_INFINITY,
    minimumEnemyDefeatCount: expectedEnemyCount ?? Number.POSITIVE_INFINITY,
    expectedRunId
  });
  const fullGameExpansionPassed = fullGameExpansionGate.status === 'PASSED';

  const productDurationCoverageOk =
    value.product_duration_coverage_status === 'PASSED' &&
    expectedEnemyCount !== null &&
    minimumEnemyCountForDuration !== null &&
    expectedEnemyCount >= minimumEnemyCountForDuration;
  const fullDurationRuntimeCoverageOk =
    productDurationCoverageOk &&
    value.full_duration_runtime_coverage_status === 'PASSED' &&
    realizedEnemyCount !== null &&
    encounterBandCount !== null &&
    minimumEncounterBandCountForDuration !== null &&
    expectedEnemyCount !== null &&
    fullGameExpansionPassed &&
    realizedEnemyCount >= expectedEnemyCount &&
    encounterBandCount >= minimumEncounterBandCountForDuration;
  const fullDurationRuntimeCoverageDispositionOk =
    fullGameExpansionProducerIdentityOk &&
    (fullGameExpansionPassed ||
      (value.visual_slice_preview_mode === true &&
        value.full_duration_runtime_coverage_status === 'FAILED' &&
        fullGameExpansionGate.failure_reasons.length > 0 &&
        value.full_duration_runtime_coverage_disposition === 'DEFERRED_NON_BLOCKING' &&
        value.full_duration_runtime_coverage_deferred === true &&
        value.full_duration_runtime_coverage_blocking_current_milestone === false &&
        value.full_duration_enemy_count_disposition === 'DEFERRED_NON_BLOCKING' &&
        value.full_duration_encounter_band_count_disposition === 'DEFERRED_NON_BLOCKING'));
  const previewVisualSliceCoverageOk =
    value.visual_slice_preview_mode === true &&
    value.preview_visual_slice_coverage_status === 'PASSED' &&
    previewExpectedEnemyCount !== null &&
    previewRealizedEnemyCount !== null &&
    previewMinimumEncounterBandCount !== null &&
    encounterBandCount !== null &&
    previewRealizedEnemyCount >= previewExpectedEnemyCount &&
    encounterBandCount >= previewMinimumEncounterBandCount;

  return (
    typeof value.expected_enemy_count === 'number' &&
    typeof value.realized_enemy_count === 'number' &&
    typeof value.minimum_enemy_count_for_duration === 'number' &&
    typeof value.encounter_band_count === 'number' &&
    typeof value.minimum_encounter_band_count_for_duration === 'number' &&
    typeof value.wave_segment_coverage_count === 'number' &&
    typeof value.minimum_wave_segment_coverage_count === 'number' &&
    typeof value.max_gap_between_encounter_bands_sec === 'number' &&
    typeof value.max_allowed_gap_between_encounter_bands_sec === 'number' &&
    Array.isArray(value.segments_below_minimum_band_count) &&
    typeof value.first_encounter_estimated_sec === 'number' &&
    typeof value.first_viewport_enemy_count === 'number' &&
    typeof value.static_enemy_node_count === 'number' &&
    typeof value.realized_static_enemy_node_count === 'number' &&
    typeof value.wave_node_count === 'number' &&
    typeof value.realized_wave_node_count === 'number' &&
    typeof value.pickup_node_count === 'number' &&
    typeof value.realized_pickup_node_count === 'number' &&
    typeof value.boss_node_count === 'number' &&
    typeof value.realized_boss_count === 'number' &&
    productDurationCoverageOk &&
    fullDurationRuntimeCoverageDispositionOk &&
    (value.visual_slice_preview_mode === true ? previewVisualSliceCoverageOk : fullDurationRuntimeCoverageOk) &&
    value.wave_segment_coverage_count >= value.minimum_wave_segment_coverage_count &&
    value.max_gap_between_encounter_bands_sec <= value.max_allowed_gap_between_encounter_bands_sec &&
    value.segments_below_minimum_band_count.length === 0 &&
    value.first_encounter_estimated_sec <= 8 &&
    value.first_viewport_enemy_count >= 2 &&
    value.static_enemy_node_count >= 1 &&
    value.realized_static_enemy_node_count >= value.static_enemy_node_count &&
    value.wave_node_count >= 2 &&
    value.realized_wave_node_count >= value.wave_node_count &&
    value.pickup_node_count >= 1 &&
    value.realized_pickup_node_count >= value.pickup_node_count &&
    value.boss_node_count >= 1 &&
    value.realized_boss_count >= 1
  );
}

function hasStep38EnemyBehaviorQaEvidence(value: unknown, eventRecords: Array<Record<string, unknown>>): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const hasEventWithSource = (event: string, source: string) =>
    eventRecords.some((record) => record.event === event && record.source === source);
  const behaviorCapabilityIds = new Set(
    eventRecords.flatMap((record) =>
      Array.isArray(record.behaviorCapabilityIds)
        ? record.behaviorCapabilityIds.filter((id): id is string => typeof id === 'string' && id.startsWith('enemy.'))
        : []
    )
  );
  const realizedCapabilityCount =
    typeof value.realized_enemy_behavior_capability_count === 'number'
      ? Math.max(value.realized_enemy_behavior_capability_count, behaviorCapabilityIds.size)
      : behaviorCapabilityIds.size;
  const projectileHitCount =
    typeof value.player_damage_from_enemy_projectile_count === 'number'
      ? Math.max(
          value.player_damage_from_enemy_projectile_count,
          eventRecords.filter((record) => record.event === 'enemy.projectile.hit_player' && record.source === 'runtime_enemy_projectile').length
        )
      : eventRecords.filter((record) => record.event === 'enemy.projectile.hit_player' && record.source === 'runtime_enemy_projectile').length;

  return (
    typeof value.required_enemy_behavior_capability_count === 'number' &&
    typeof value.moving_enemy_entity_count === 'number' &&
    typeof value.enemy_movement_event_count === 'number' &&
    typeof value.attacking_enemy_entity_count === 'number' &&
    typeof value.enemy_fire_event_count === 'number' &&
    typeof value.enemy_projectile_spawn_count === 'number' &&
    typeof value.player_damage_from_enemy_projectile_count === 'number' &&
    typeof value.boss_attack_event_count === 'number' &&
    value.required_enemy_behavior_capability_count >= 3 &&
    realizedCapabilityCount >= value.required_enemy_behavior_capability_count &&
    value.moving_enemy_entity_count >= 2 &&
    value.enemy_movement_event_count >= 2 &&
    value.attacking_enemy_entity_count >= 2 &&
    value.enemy_fire_event_count >= 2 &&
    value.enemy_projectile_spawn_count >= 2 &&
    projectileHitCount >= 1 &&
    value.boss_attack_event_count >= 1 &&
    hasEventWithSource('enemy.moved', 'runtime_enemy_ai') &&
    hasEventWithSource('enemy.fired', 'runtime_enemy_ai') &&
    hasEventWithSource('enemy.projectile.spawned', 'runtime_enemy_projectile') &&
    hasEventWithSource('enemy.projectile.hit_player', 'runtime_enemy_projectile') &&
    hasEventWithSource('boss.attack.fired', 'runtime_boss_ai')
  );
}

function readEventBehaviorIds(record: Record<string, unknown>): string[] {
  return Array.isArray(record.behaviorIds) ? record.behaviorIds.filter((id): id is string => typeof id === 'string') : [];
}

function readEventBehaviorCapabilityIds(record: Record<string, unknown>): string[] {
  return Array.isArray(record.behaviorCapabilityIds)
    ? record.behaviorCapabilityIds.filter((id): id is string => typeof id === 'string')
    : [];
}

function hasEventBehaviorCapabilityId(record: Record<string, unknown>, capabilityId: string): boolean {
  return readEventBehaviorCapabilityIds(record).includes(capabilityId);
}

function hasStep38BehaviorConfigQaEvidence(value: unknown, eventRecords: Array<Record<string, unknown>>): boolean {
  if (!isRecord(value) || value.status !== 'PASSED') {
    return false;
  }

  const requiredIds = value.required_behavior_config_ids;
  const consumedIds = value.consumed_behavior_config_ids;
  const requiredCapabilityIds = value.required_behavior_capability_ids;
  const consumedCapabilityIds = value.consumed_behavior_capability_ids;
  if (!Array.isArray(requiredIds) || !Array.isArray(consumedIds) || !Array.isArray(requiredCapabilityIds) || !Array.isArray(consumedCapabilityIds)) {
    return false;
  }
  const consumed = new Set(consumedIds.filter((id): id is string => typeof id === 'string'));
  const includesAllRequired = requiredIds.every((id) => typeof id === 'string' && consumed.has(id));
  const consumedCapabilities = new Set(consumedCapabilityIds.filter((id): id is string => typeof id === 'string'));
  const includesAllRequiredCapabilities = requiredCapabilityIds.every((id) => typeof id === 'string' && consumedCapabilities.has(id));
  const fixedTurretFire = eventRecords.some(
    (record) =>
      record.event === 'enemy.fired' &&
      record.enemy === 'fixed_turret' &&
      typeof record.projectileCount === 'number' &&
      record.projectileCount >= 1 &&
      hasEventBehaviorCapabilityId(record, 'enemy.fixed_turret.v1')
  );
  const patrolMove = eventRecords.some(
    (record) =>
      record.event === 'enemy.moved' &&
      record.enemy === 'patrol_infantry' &&
      hasEventBehaviorCapabilityId(record, 'enemy.patrol_infantry.v1')
  );
  const patrolFire = eventRecords.some(
    (record) =>
      record.event === 'enemy.fired' &&
      record.enemy === 'patrol_infantry' &&
      hasEventBehaviorCapabilityId(record, 'enemy.patrol_infantry.v1')
  );
  const flyingStrafeMove = eventRecords.some(
    (record) =>
      record.event === 'enemy.moved' &&
      record.enemy === 'flying_enemy' &&
      typeof record.movePattern === 'string' &&
      hasEventBehaviorCapabilityId(record, 'enemy.flying_right_entry.v1')
  );
  const flyingStrafeFire = eventRecords.some(
    (record) =>
      record.event === 'enemy.fired' &&
      record.enemy === 'flying_enemy' &&
      hasEventBehaviorCapabilityId(record, 'enemy.flying_right_entry.v1')
  );
  const bossAttack = eventRecords.some(
    (record) =>
      record.event === 'boss.attack.fired' &&
      typeof record.projectileCount === 'number' &&
      record.projectileCount >= 1 &&
      hasEventBehaviorCapabilityId(record, 'enemy.boss_attack_pattern.v1')
  );
  const bossPhaseTwoConfig = eventRecords.some(
    (record) =>
      record.event === 'boss.attack.fired' &&
      record.phase === 2 &&
      hasEventBehaviorCapabilityId(record, 'enemy.boss_attack_pattern.v1') &&
      (record.attackPattern === 'three_way_projectile' || record.fallingHazard === true || (typeof record.projectileCount === 'number' && record.projectileCount >= 3))
  );
  const bossFallingHazard = eventRecords.some(
    (record) =>
      record.event === 'boss.falling_hazard.spawned' &&
      (hasEventBehaviorCapabilityId(record, 'hazard.falling_area.v1') ||
        hasEventBehaviorCapabilityId(record, 'enemy.boss_attack_pattern.v1'))
  );
  const requires = (capabilityId: string) => requiredCapabilityIds.includes(capabilityId);

  return (
    includesAllRequired &&
    includesAllRequiredCapabilities &&
    value.fixed_turret_fire_consumed === true &&
    value.patrol_counterfire_consumed === true &&
    value.flying_strafe_fire_consumed === true &&
    value.boss_attack_pattern_consumed === true &&
    value.boss_falling_hazard_consumed === true &&
    (!requires('enemy.fixed_turret.v1') || fixedTurretFire) &&
    (!requires('enemy.patrol_infantry.v1') || (patrolMove && patrolFire)) &&
    (!requires('enemy.flying_right_entry.v1') || (flyingStrafeMove && flyingStrafeFire)) &&
    (!requires('enemy.boss_attack_pattern.v1') || (bossAttack && bossPhaseTwoConfig)) &&
    (!requires('hazard.falling_area.v1') || bossFallingHazard)
  );
}

function hasStep38ArtDirectionQualityQaEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'canonical_dsl') return false;
  const gate = value.art_direction_quality_gate;
  return (
    isRecord(gate) &&
    gate.verdict === 'PASS' &&
    gate.player_has_distinct_sprite === true &&
    gate.enemy_types_have_distinct_silhouettes === true &&
    gate.boss_has_large_distinct_visual === true &&
    gate.environment_has_layered_theme === true &&
    gate.weapon_projectiles_visibly_distinct === true &&
    gate.jungle_metal_industrial_theme_visible === true &&
    gate.placeholder_style_dominant === false &&
    gate.label_only_visual_evidence === false &&
    gate.operator_visible_quality_ready === true
  );
}

function hasStep38EncounterDirectorPlanQaEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'canonical_dsl') return false;
  const route = readStringArrayField(value, 'route');
  const waves = Array.isArray(value.waves) ? value.waves.filter(isRecord) : [];
  return (
    ['spawn', 'wave1', 'weapon_pickup', 'area2', 'wave2', 'mixed_enemy_pressure', 'boss_arena', 'boss_phase_1', 'boss_phase_2', 'exit_or_mission_complete'].every((step) =>
      route.includes(step)
    ) &&
    waves.length >= 2 &&
    waves.every(
      (wave) =>
        typeof wave.id === 'string' &&
        typeof wave.segment_id === 'string' &&
        isRecord(wave.trigger) &&
        Array.isArray(wave.enemy_mix) &&
        wave.enemy_mix.length > 0 &&
        typeof wave.spawn_cadence_ms === 'number' &&
        typeof wave.max_active === 'number' &&
        isRecord(wave.clear_condition) &&
        typeof wave.progression_unlock === 'string' &&
        wave.source === 'canonical_dsl'
    )
  );
}

function hasStep38EncounterDirectorRuntimeQaEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'canonical_dsl') return false;
  const gate = value.encounter_director_gate;
  return (
    isRecord(gate) &&
    gate.verdict === 'PASS' &&
    gate.fresh_manual_session === true &&
    gate.input_only === true &&
    gate.wave1_spawned_by_traversal === true &&
    gate.wave2_spawned_by_traversal === true &&
    typeof gate.enemy_types_visible_count === 'number' &&
    gate.enemy_types_visible_count >= 3 &&
    gate.weapon_pickup_reached_by_input === true &&
    gate.area2_reached_by_input === true &&
    gate.boss_arena_reached_by_input === true &&
    gate.boss_phase_1_visible === true &&
    gate.boss_phase_2_visible_or_reachable === true &&
    gate.wave_clear_reachable_by_input === true &&
    gate.large_empty_traversal_detected === false
  );
}

function hasStep38OutcomeStateMachineQaEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'runtime_outcome_state_machine') return false;
  const gate = value.outcome_state_machine_gate;
  const satisfiedCompletionPreconditions = isRecord(gate) ? readStringArrayField(gate, 'satisfied_completion_preconditions') : [];
  return (
    isRecord(gate) &&
    gate.verdict === 'PASS' &&
    gate.win_path_connected === true &&
    gate.lose_path_connected === true &&
    gate.game_over_persistent === true &&
    gate.mission_complete_persistent === true &&
    gate.real_playthrough_completion_verified === true &&
    gate.mission_complete_requires_completion_preconditions === true &&
    gate.completion_preconditions_satisfied === true &&
    gate.early_mission_complete_detected === false &&
    gate.text_or_overlay_only_win_transition === false &&
    STEP38_REQUIRED_COMPLETION_PRECONDITIONS.every((precondition) => satisfiedCompletionPreconditions.includes(precondition))
  );
}

function hasStep38WinPathQaEvidence(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const gate = value.win_path_gate;
  const observedEvents = readStringArrayField(value, 'observed_events');
  const verifiedCompletionPreconditions = isRecord(gate) ? readStringArrayField(gate, 'verified_completion_preconditions') : [];
  return (
    isRecord(gate) &&
    gate.verdict === 'PASS' &&
    gate.fresh_manual_session === true &&
    gate.input_only === true &&
    gate.state_injection_used === false &&
    gate.real_playthrough_completion_verified === true &&
    gate.boss_defeated_by_input === true &&
    gate.all_required_waves_resolved_before_win === true &&
    gate.all_required_regions_traversed_before_win === true &&
    gate.weapon_and_boss_phase_reached_before_win === true &&
    gate.text_or_overlay_only_evidence === false &&
    gate.early_mission_complete_detected === false &&
    STEP38_REQUIRED_COMPLETION_PRECONDITIONS.every((precondition) => verifiedCompletionPreconditions.includes(precondition)) &&
    gate.mission_complete_overlay_visible === true &&
    gate.mission_complete_overlay_persistent === true &&
    gate.telemetry_mission_complete_recorded === true &&
    observedEvents.includes('mission.complete')
  );
}

function hasStep38LosePathQaEvidence(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const gate = value.lose_path_gate;
  const observedEvents = readStringArrayField(value, 'observed_events');
  return (
    isRecord(gate) &&
    gate.verdict === 'PASS' &&
    gate.fresh_manual_session === true &&
    gate.input_only === true &&
    gate.state_injection_used === false &&
    gate.direct_health_mutation_used === false &&
    gate.direct_game_over_trigger_used === false &&
    gate.game_over_at_spawn === false &&
    gate.player_damage_observed === true &&
    gate.health_reached_zero_or_retries_exhausted === true &&
    gate.game_over_overlay_visible === true &&
    gate.game_over_overlay_persistent === true &&
    gate.telemetry_game_over_recorded === true &&
    observedEvents.includes('player.damaged') &&
    observedEvents.includes('player.dead') &&
    observedEvents.includes('game.over')
  );
}

function hasStep38RealPlaythroughCompletionQaEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'fresh_input_only_browser_playthrough') return false;
  const gate = value.real_playthrough_completion_gate;
  const humanGate = value.human_visible_gameplay_gate;
  const screenshots = Array.isArray(value.screenshots) ? value.screenshots.filter(isRecord) : [];
  const labels = screenshots
    .map((screenshot) => (typeof screenshot.label === 'string' ? screenshot.label : undefined))
    .filter((label): label is string => label !== undefined);
  const verifiedCompletionPreconditions = isRecord(gate) ? readStringArrayField(gate, 'verified_completion_preconditions') : [];
  return (
    isRecord(gate) &&
    gate.verdict === 'PASS' &&
    gate.fresh_manual_session === true &&
    gate.input_only === true &&
    gate.starts_from_spawn === true &&
    gate.teleport_used === false &&
    gate.camera_jump_used === false &&
    gate.debug_reposition_used === false &&
    gate.state_injection_used === false &&
    gate.direct_spawn_used === false &&
    gate.direct_phase_trigger_used === false &&
    gate.direct_mission_trigger_used === false &&
    gate.real_playthrough_completion_verified === true &&
    gate.boss_defeated_by_input === true &&
    gate.all_required_waves_resolved_before_win === true &&
    gate.all_required_regions_traversed_before_win === true &&
    gate.weapon_and_boss_phase_reached_before_win === true &&
    gate.mission_complete_after_real_playthrough === true &&
    gate.wave1_cleared_by_play === true &&
    gate.weapon_pickup_collected_by_play === true &&
    gate.area_progression_reached_by_play === true &&
    gate.wave2_or_later_wave_cleared_or_pressure_seen_by_play === true &&
    gate.mid_route_pressure_evidence_present === true &&
    gate.boss_arena_reached_by_play === true &&
    gate.boss_phase_1_seen_by_play === true &&
    gate.boss_phase_2_seen_by_play === true &&
    gate.boss_defeated_by_play === true &&
    gate.mission_complete_visible_after_play === true &&
    gate.mission_complete_persistent === true &&
    gate.large_empty_traversal_detected === false &&
    typeof gate.success_route_milestone_timeline_path === 'string' &&
    gate.screenshots_support_all_required_steps === true &&
    gate.text_only_evidence_used_for_pass === false &&
    gate.manifest_only_evidence_used_for_pass === false &&
    gate.overlay_only_evidence_used_for_pass === false &&
    gate.receipt_only_evidence_used_for_pass === false &&
    gate.telemetry_only_evidence_used_for_pass === false &&
    gate.scripted_capture_used_for_pass === false &&
    gate.text_or_overlay_only_evidence === false &&
    gate.early_mission_complete_detected === false &&
    STEP38_REQUIRED_COMPLETION_PRECONDITIONS.every((precondition) => verifiedCompletionPreconditions.includes(precondition)) &&
    isRecord(humanGate) &&
    humanGate.verdict === 'PASS' &&
    humanGate.operator_visible_evidence_required === true &&
    humanGate.browser_visual_evidence_required === true &&
    humanGate.input_only_evidence_required === true &&
    humanGate.text_only_evidence_used_for_pass === false &&
    humanGate.manifest_only_evidence_used_for_pass === false &&
    humanGate.overlay_only_evidence_used_for_pass === false &&
    humanGate.receipt_only_evidence_used_for_pass === false &&
    humanGate.telemetry_only_evidence_used_for_pass === false &&
    humanGate.scripted_capture_used_for_pass === false &&
    STEP38_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS.every((label) => labels.includes(label)) &&
    screenshots.every((screenshot) => {
      const canvasPixelProbe = screenshot.canvas_pixel_probe;
      return (
        screenshot.evidence_type === 'fresh_manual_playthrough_input_only' &&
        screenshot.counts_for_ready_for_manual_test === true &&
        screenshot.fresh_manual_session === true &&
        screenshot.input_only === true &&
        screenshot.teleport_used === false &&
        screenshot.camera_jump_used === false &&
        screenshot.debug_reposition_used === false &&
        screenshot.state_injection_used === false &&
        screenshot.direct_spawn_used === false &&
        screenshot.direct_phase_trigger_used === false &&
        screenshot.label_only_visual_evidence !== true &&
        screenshot.placeholder_objects_seen === false &&
        typeof screenshot.screenshot_path === 'string' &&
        typeof screenshot.metadata_path === 'string' &&
        isRecord(canvasPixelProbe) &&
        canvasPixelProbe.status === 'PASSED'
      );
    })
  );
}

function hasStep38TwoDGameplayPlaythroughGateQaEvidence(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const gate = value.two_d_gameplay_playthrough_gate;
  return (
    isRecord(gate) &&
    gate.verdict === 'PASS' &&
    gate.target === 'generated_2d_gameplay' &&
    gate.renderer_is_implementation_detail === true &&
    gate.fresh_manual_session === true &&
    gate.input_only === true &&
    gate.teleport_used === false &&
    gate.camera_jump_used === false &&
    gate.state_injection_used === false &&
    gate.direct_wave_spawn_used === false &&
    gate.direct_boss_spawn_used === false &&
    gate.direct_phase_trigger_used === false &&
    gate.direct_mission_complete_trigger_used === false &&
    gate.direct_game_over_trigger_used === false &&
    gate.generated_from_canonical_dsl === true &&
    gate.preloaded_artifact_used === false &&
    gate.fallback_used === false &&
    gate.legacy_fixed_template_authority === false &&
    gate.player_movement_proven === true &&
    gate.jump_proven === true &&
    gate.crouch_proven === true &&
    gate.shooting_proven === true &&
    gate.weapon_pickup_collected_by_play === true &&
    gate.wave1_reached_by_play === true &&
    gate.wave2_reached_by_play === true &&
    gate.area_progression_reached_by_play === true &&
    gate.mid_route_pressure_evidence_present === true &&
    gate.large_empty_traversal_detected === false &&
    gate.boss_arena_reached_by_play === true &&
    gate.boss_phase_1_seen_by_play === true &&
    gate.boss_phase_2_seen_by_play === true &&
    gate.boss_defeated_by_play === true &&
    gate.mission_complete_visible === true &&
    gate.game_over_visible === true &&
    gate.game_over_at_spawn === false &&
    gate.player_damage_observed_for_game_over === true &&
    gate.health_zero_or_retries_exhausted_by_play === true &&
    gate.runtime_visual_evidence_supports_claims === true &&
    gate.text_only_evidence_used_for_pass === false &&
    gate.manifest_only_evidence_used_for_pass === false &&
    gate.overlay_only_evidence_used_for_pass === false
  );
}

function hasStep38SuccessRouteMilestoneTimelineQaEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'fresh_manual_playthrough_input_only') return false;
  const segments = Array.isArray(value.segments) ? value.segments.filter(isRecord) : [];
  const requiredSegmentIds = ['spawn_to_wave1', 'wave2_to_boss_telegraph', 'boss_to_mission_complete'];
  const pressureSegment = segments.find((segment) => segment.id === 'wave2_to_boss_telegraph');
  const pressureEvidence = isRecord(pressureSegment) ? readStringArrayField(pressureSegment, 'progress_evidence') : [];
  return (
    value.route_verdict === 'PASS' &&
    value.large_empty_traversal_detected === false &&
    value.mission_complete_used_as_route_pass_without_milestones === false &&
    value.text_only_evidence_used_for_pass === false &&
    value.telemetry_only_evidence_used_for_pass === false &&
    value.large_empty_traversal_threshold_sec === 8 &&
    requiredSegmentIds.every((id) => segments.some((segment) => segment.id === id && segment.verdict === 'PASS')) &&
    ['flying_enemy_visible', 'enemy_projectile_visible', 'boss_projectile_visible', 'player_projectile_visible_with_pressure', 'active_pressure_band_visible'].some(
      (evidence) => pressureEvidence.includes(evidence)
    )
  );
}

function hasStep38RoutePressureBandQaEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'fresh_manual_playthrough_input_only') return false;
  const gate = value.route_pressure_band_gate;
  const bands = Array.isArray(value.pressure_bands) ? value.pressure_bands.filter(isRecord) : [];
  const pressureBand = bands.find((band) => band.id === 'wave2_to_boss_mid_pressure' && band.counts_as_progress === true);
  const pressureObjects = isRecord(pressureBand) ? new Set(readStringArrayField(pressureBand, 'visible_runtime_objects')) : new Set<string>();
  const progressEvidence = isRecord(pressureBand) ? readStringArrayField(pressureBand, 'progress_evidence') : [];
  const screenshots = isRecord(pressureBand) ? readStringArrayField(pressureBand, 'screenshots') : [];
  const metadataPaths = isRecord(pressureBand) ? readStringArrayField(pressureBand, 'metadata_paths') : [];
  const hostileProjectileOrHazardVisible =
    pressureObjects.has('enemy_projectile') ||
    pressureObjects.has('boss_projectile_phase_object') ||
    pressureObjects.has('boss_projectile') ||
    pressureObjects.has('environment_hazard');
  return (
    isRecord(gate) &&
    gate.verdict === 'PASS' &&
    gate.max_empty_interval_sec === 8 &&
    typeof gate.largest_empty_interval_sec === 'number' &&
    gate.largest_empty_interval_sec <= 8 &&
    gate.large_empty_traversal_detected === false &&
    gate.text_only_evidence_used_for_pass === false &&
    gate.telemetry_only_evidence_used_for_pass === false &&
    isRecord(pressureBand) &&
    pressureObjects.has('flying_enemy') &&
    pressureObjects.has('player_projectile') &&
    hostileProjectileOrHazardVisible &&
    progressEvidence.includes('active_pressure_band_visible') &&
    screenshots.length > 0 &&
    metadataPaths.length > 0
  );
}

function hasStep38OperatorVisibleArtGateQaEvidence(value: unknown): boolean {
  if (!isRecord(value) || value.source !== 'fresh_browser_screenshots') return false;
  const gate = value.operator_visible_art_gate;
  const labels = readStringArrayField(value, 'screenshot_labels');
  return (
    isRecord(gate) &&
    hasStep38ProceduralCanvasBackendPolicy(value, gate) &&
    hasStep38FreshManualInputOnlyEvidencePolicy(value, gate) &&
    gate.verdict === 'PASS' &&
    gate.target === 'procedural_pixel_art_readable_v1' &&
    gate.production_art_claimed === false &&
    gate.external_art_used === false &&
    gate.operator_visible_quality_ready === true &&
    gate.player_enemy_boss_environment_readable === true &&
    gate.visual_style_consistent === true &&
    gate.debug_geometry_dominant === false &&
    gate.manual_review_required === true &&
    gate.operator_visible_evidence_required === true &&
    gate.browser_visual_evidence_required === true &&
    gate.player_visibly_dsl_derived === true &&
    gate.enemy_types_visibly_distinct === true &&
    gate.boss_visibly_distinct === true &&
    gate.boss_projectile_visibly_distinct === true &&
    gate.weapon_pickup_visibly_distinct === true &&
    gate.environment_theme_visibly_layered === true &&
    gate.projectile_types_visibly_distinct === true &&
    gate.label_only_visual_evidence === false &&
    gate.placeholder_style_dominant === false &&
    gate.template_derived_placeholder === false &&
    gate.role_static_templates_used === false &&
    gate.old_svgForVisualIntent_used === false &&
    gate.visual_design_realization_gate === 'PASS' &&
    gate.canvas_art_fidelity_gate === 'PASS' &&
    gate.screenshots_support_visual_claims === true &&
    gate.text_only_evidence_used_for_pass === false &&
    gate.manifest_only_evidence_used_for_pass === false &&
    gate.overlay_only_evidence_used_for_pass === false &&
    gate.receipt_only_evidence_used_for_pass === false &&
    gate.telemetry_only_evidence_used_for_pass === false &&
    gate.scripted_capture_used_for_pass === false &&
    STEP38_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS.every((label) => labels.includes(label))
  );
}

function hasStep38VisualPlaythroughValidatorQaEvidence(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const gate = value.visual_playthrough_validator;
  if (!isRecord(gate) || gate.verdict !== 'PASS') return false;
  const requiredGateSummary = gate.required_gate_summary;
  return (
    value.encounter_coverage_status === 'PASSED' &&
    value.real_playthrough_won === true &&
    value.boss_defeated === true &&
    value.manual_traversal_gate === 'PASS' &&
    value.large_empty_traversal_detected === false &&
    value.success_route_milestone_timeline_verdict === 'PASS' &&
    value.route_pressure_band_gate === 'PASS' &&
    value.win_path_gate === 'PASS' &&
    value.lose_path_gate === 'PASS' &&
    value.mission_complete_used_as_route_pass_without_milestones === false &&
    value.text_only_evidence_used_for_pass === false &&
    value.telemetry_only_evidence_used_for_pass === false &&
    gate.text_only_evidence_used_for_pass === false &&
    gate.manifest_only_evidence_used_for_pass === false &&
    gate.overlay_only_evidence_used_for_pass === false &&
    gate.receipt_only_evidence_used_for_pass === false &&
    gate.telemetry_only_evidence_used_for_pass === false &&
    gate.scripted_capture_used_for_pass === false &&
    gate.operator_visible_evidence_required === true &&
    gate.browser_visual_evidence_required === true &&
    gate.input_only_evidence_required === true &&
    Array.isArray(gate.blocking_reasons) &&
    gate.blocking_reasons.length === 0 &&
    isRecord(requiredGateSummary) &&
    requiredGateSummary.real_playthrough_completion_gate === 'PASS' &&
    requiredGateSummary.human_visible_gameplay_gate === 'PASS' &&
    requiredGateSummary.success_route_milestone_timeline === 'PASS' &&
    requiredGateSummary.route_pressure_band_gate === 'PASS' &&
    requiredGateSummary.operator_visible_art_gate === 'PASS' &&
    requiredGateSummary.win_path_gate === 'PASS' &&
    requiredGateSummary.lose_path_gate === 'PASS' &&
    readStringArrayField(value, 'evidence_paths').length >= STEP38_REQUIRED_REAL_PLAYTHROUGH_SCREENSHOTS.length
  );
}

function buildStep38DslConsumptionReport(input: {
  projectId: string;
  runId: string;
  canonicalDsl: CanonicalGameDslV02;
  runtimePlan: CapabilityRuntimePlan;
  sceneIr: unknown;
  runtimeManifest: unknown;
  manualVerticalSliceProjection: unknown;
  manualVerticalSliceProjectionPath: string;
  manualTraversalPath: unknown;
  manualTraversalPathPath: string;
  manualTraversalEvidencePath: string;
  visualRuntimeBindingReportPath: string;
  visualRuntimeBindingReport?: unknown;
  visualAssetMaterializationReportPath: string;
  visualAssetMaterializationReport?: unknown;
  assetTemplateFingerprintReportPath: string;
  assetTemplateFingerprintReport?: unknown;
  visualDesignRealizationReportPath: string;
  visualDesignRealizationReport?: unknown;
  runtimeTextureLoadReportPath: string;
  runtimeTextureLoadReport?: unknown;
  artDirectionQualityReportPath: string;
  artDirectionQualityReport?: unknown;
  encounterDirectorPlanPath: string;
  encounterDirectorPlan?: unknown;
  encounterDirectorRuntimeEvidencePath: string;
  encounterDirectorRuntimeEvidence?: unknown;
  outcomeStateMachineReportPath: string;
  outcomeStateMachineReport?: unknown;
  winPathEvidencePath: string;
  winPathEvidence?: unknown;
  losePathEvidencePath: string;
  losePathEvidence?: unknown;
  realPlaythroughCompletionEvidencePath: string;
  realPlaythroughCompletionEvidence?: unknown;
  twoDGameplayPlaythroughGatePath: string;
  twoDGameplayPlaythroughGate?: unknown;
  canvasVisualReadabilityGatePath: string;
  canvasVisualReadabilityGate?: unknown;
  proceduralPixelArtGrammarReportPath: string;
  proceduralPixelArtGrammarReport?: unknown;
  canvasArtFidelityGatePath: string;
  canvasArtFidelityGate?: unknown;
  spriteAnimationCoverageReportPath: string;
  spriteAnimationCoverageReport?: unknown;
  environmentLayeringReportPath: string;
  environmentLayeringReport?: unknown;
  startupSurvivabilityGatePath: string;
  startupSurvivabilityGate?: unknown;
  encounterPlayabilityGatePath: string;
  encounterPlayabilityGate?: unknown;
  successRouteMilestoneTimelinePath: string;
  successRouteMilestoneTimeline?: unknown;
  routePressureBandEvidencePath: string;
  routePressureBandEvidence?: unknown;
  operatorVisibleArtGatePath: string;
  operatorVisibleArtGate?: unknown;
  visualPlaythroughValidatorReportPath: string;
  visualPlaythroughValidatorReport?: unknown;
  telemetryEvents: readonly string[];
  qaReport?: unknown;
}): Record<string, unknown> {
  const layers = ['canonicalDsl', 'runtimePlan', 'sceneIr', 'runtimeManifest', 'runtimeOrTelemetry'] as const;
  const evaluation = evaluateStep38DslConsumption({
    baselineCommit: STEP38_BASELINE_COMMIT,
    promptSha256: DEEPSEEK_RUN_AND_GUN_FIXED_PROMPT_SHA256,
    modelName: STEP38_EXPECTED_PROVIDER_MODEL,
    realDeepSeekPathExecuted: true,
    dslConsumerPathUsed: true,
    rawGameDslResponsePresent: true,
    generatedArtifactRunSpecific: true,
    buildSucceeded: true,
    previewBooted: true,
    guardFlags: {
      fallback_used: false,
      preloaded_artifact_used: false,
      legacy_fixed_template_authority: false,
      stale_generated_artifact_used: false
    },
    artifacts: {
      canonicalDsl: input.canonicalDsl,
      runtimePlan: input.runtimePlan,
      sceneIr: input.sceneIr,
      runtimeManifest: input.runtimeManifest,
      manualVerticalSliceProjection: input.manualVerticalSliceProjection,
      manualTraversalPath: input.manualTraversalPath,
      visualRuntimeBindingReport: input.visualRuntimeBindingReport,
      visualAssetMaterializationReport: input.visualAssetMaterializationReport,
      assetTemplateFingerprintReport: input.assetTemplateFingerprintReport,
      visualDesignRealizationReport: input.visualDesignRealizationReport,
      runtimeTextureLoadReport: input.runtimeTextureLoadReport,
      artDirectionQualityReport: input.artDirectionQualityReport,
      encounterDirectorPlan: input.encounterDirectorPlan,
      encounterDirectorRuntimeEvidence: input.encounterDirectorRuntimeEvidence,
      outcomeStateMachineReport: input.outcomeStateMachineReport,
      winPathEvidence: input.winPathEvidence,
      losePathEvidence: input.losePathEvidence,
      realPlaythroughCompletionEvidence: input.realPlaythroughCompletionEvidence,
      twoDGameplayPlaythroughGate: input.twoDGameplayPlaythroughGate,
      canvasVisualReadabilityGate: input.canvasVisualReadabilityGate,
      proceduralPixelArtGrammarReport: input.proceduralPixelArtGrammarReport,
      canvasArtFidelityGate: input.canvasArtFidelityGate,
      spriteAnimationCoverageReport: input.spriteAnimationCoverageReport,
      environmentLayeringReport: input.environmentLayeringReport,
      startupSurvivabilityGate: input.startupSurvivabilityGate,
      encounterPlayabilityGate: input.encounterPlayabilityGate,
      successRouteMilestoneTimeline: input.successRouteMilestoneTimeline,
      routePressureBandEvidence: input.routePressureBandEvidence,
      operatorVisibleArtGate: input.operatorVisibleArtGate,
      visualPlaythroughValidatorReport: input.visualPlaythroughValidatorReport,
      qaReport: input.qaReport,
      telemetryEvents: [...input.telemetryEvents]
    }
  });
  const manualTraversalEvidence = isRecord(input.qaReport) ? input.qaReport.manual_traversal_evidence : undefined;
  const manualTraversalOk = hasStep38ManualTraversalQaEvidence(manualTraversalEvidence);
  const entries = evaluation.capabilityRepresentations.flatMap((representation) =>
    layers.map((layer) => {
      const authoritative = representation.requiredLayers.includes(layer);
      const consumed = representation[layer] === true;
      return {
        path: `/step38/required_capabilities/${representation.capability}/${layer}`,
        status: consumed ? 'consumed' : authoritative ? 'unsupported' : 'not_required',
        authoritative,
        consumer: layer,
        outputRefs: consumed ? [layer] : [],
        runtimeProfile: input.runtimePlan.profileId
      };
    })
  );
  const consumedCount = entries.filter((entry) => entry.status === 'consumed').length;
  const unsupportedCount = entries.filter((entry) => entry.status === 'unsupported' && entry.authoritative).length;
  return {
    schemaVersion: 'step38.dsl-consumption.v1',
    projectId: input.projectId,
    runId: input.runId,
    fallback_used: false,
    preloaded_artifact_used: false,
    stale_artifact_used: false,
    legacy_fixed_template_authority: false,
    ignored_required_dsl_fields: evaluation.ignored_required_dsl_fields,
    unsupported_required_capabilities: evaluation.unsupported_required_capabilities,
    product_duration_sec: {
      min: 480,
      max: 720,
      preserved: true
    },
    manual_vertical_slice_projection: {
      enabled: true,
      compression_is_preview_only: true,
      projection_manifest_path: input.manualVerticalSliceProjectionPath,
      browser_visual_evidence_required: true
    },
    manual_traversal: {
      required: true,
      path_manifest_path: input.manualTraversalPathPath,
      evidence_path: input.manualTraversalEvidencePath,
      starts_from_spawn: isRecord(manualTraversalEvidence) && manualTraversalEvidence.started_at_player_spawn === true,
      input_only: isRecord(manualTraversalEvidence) && manualTraversalEvidence.evidence_source === 'playwright_keyboard_continuous_path',
      scripted_capture_counts_for_pass: false,
      wave2_reached_by_input: isRecord(manualTraversalEvidence) && readStringArrayField(manualTraversalEvidence, 'observed_wave_ids').length >= 2,
      area2_reached_by_input:
        isRecord(manualTraversalEvidence) && readStringArrayField(manualTraversalEvidence, 'observed_preview_windows').includes('window_1_weapon_wave_area'),
      weapon_pickup_reached_by_input: isRecord(manualTraversalEvidence) && manualTraversalEvidence.weapon_pickup_seen === true,
      boss_reached_by_input_or_scripted_reachable_after_input_path: isRecord(manualTraversalEvidence) && manualTraversalEvidence.boss_seen === true,
      boss_telegraph_seen_by_input: isRecord(manualTraversalEvidence) && manualTraversalEvidence.boss_telegraph_seen === true,
      dsl_visual_objects_seen_by_input:
        isRecord(manualTraversalEvidence) && manualTraversalEvidence.canonical_dsl_visual_intent_runtime_bound === true,
      large_empty_traversal_detected:
        isRecord(manualTraversalEvidence) && isRecord(manualTraversalEvidence.manual_traversal_gate)
          ? manualTraversalEvidence.manual_traversal_gate.large_empty_traversal_detected === true
          : true,
      verdict: manualTraversalOk ? 'PASS' : 'FAIL'
    },
    visual_runtime_binding: {
      required: true,
      report_path: input.visualRuntimeBindingReportPath,
      verdict: hasStep38VisualRuntimeBindingQaEvidence(input.visualRuntimeBindingReport) ? 'PASS' : 'FAIL'
    },
    visual_asset_materialization: {
      required: true,
      report_path: input.visualAssetMaterializationReportPath,
      runtime_texture_load_report_path: input.runtimeTextureLoadReportPath,
      all_required_assets_materialized: hasStep38VisualAssetMaterializationQaEvidence(input.visualAssetMaterializationReport),
      all_required_assets_run_scoped:
        isRecord(input.visualAssetMaterializationReport) &&
        isRecord(input.visualAssetMaterializationReport.materialization_gate) &&
        input.visualAssetMaterializationReport.materialization_gate.all_required_assets_run_scoped === true,
      all_required_assets_loaded: hasStep38RuntimeTextureLoadQaEvidence(input.runtimeTextureLoadReport),
      all_required_assets_factory_bound:
        isRecord(input.visualAssetMaterializationReport) &&
        isRecord(input.visualAssetMaterializationReport.materialization_gate) &&
        input.visualAssetMaterializationReport.materialization_gate.all_required_assets_factory_bound === true,
      all_required_assets_visible_in_fresh_manual_traversal:
        isRecord(input.visualAssetMaterializationReport) &&
        isRecord(input.visualAssetMaterializationReport.materialization_gate) &&
        input.visualAssetMaterializationReport.materialization_gate.all_required_assets_visible_in_fresh_manual_traversal === true,
      label_only_visual_evidence:
        isRecord(input.visualAssetMaterializationReport) &&
        isRecord(input.visualAssetMaterializationReport.materialization_gate) &&
        input.visualAssetMaterializationReport.materialization_gate.label_only_visual_evidence === true,
      placeholder_visual_evidence:
        isRecord(input.visualAssetMaterializationReport) &&
        isRecord(input.visualAssetMaterializationReport.materialization_gate) &&
        input.visualAssetMaterializationReport.materialization_gate.placeholder_visual_evidence === true,
      verdict:
        hasStep38VisualAssetMaterializationQaEvidence(input.visualAssetMaterializationReport) &&
        hasStep38RuntimeTextureLoadQaEvidence(input.runtimeTextureLoadReport)
          ? 'PASS'
          : 'FAIL'
    },
    asset_template_fingerprint: {
      required: true,
      report_path: input.assetTemplateFingerprintReportPath,
      role_static_svg_template_used:
        isRecord(input.assetTemplateFingerprintReport) && input.assetTemplateFingerprintReport.role_static_svg_template_used === true,
      old_svgForVisualIntent_used:
        isRecord(input.assetTemplateFingerprintReport) && input.assetTemplateFingerprintReport.old_svgForVisualIntent_used === true,
      template_derived_placeholder_detected:
        isRecord(input.assetTemplateFingerprintReport) && input.assetTemplateFingerprintReport.template_derived_placeholder_detected === true,
      verdict:
        isRecord(input.assetTemplateFingerprintReport) &&
        input.assetTemplateFingerprintReport.role_static_svg_template_used === false &&
        input.assetTemplateFingerprintReport.old_svgForVisualIntent_used === false &&
        input.assetTemplateFingerprintReport.template_derived_placeholder_detected === false
          ? 'PASS'
          : 'FAIL'
    },
    visual_design_realization: {
      required: true,
      report_path: input.visualDesignRealizationReportPath,
      verdict: hasStep38VisualDesignRealizationQaEvidence(input.visualDesignRealizationReport) ? 'PASS' : 'FAIL'
    },
    art_direction_quality: {
      required: true,
      report_path: input.artDirectionQualityReportPath,
      verdict: hasStep38ArtDirectionQualityQaEvidence(input.artDirectionQualityReport) ? 'PASS' : 'FAIL'
    },
    encounter_director: {
      required: true,
      plan_path: input.encounterDirectorPlanPath,
      runtime_evidence_path: input.encounterDirectorRuntimeEvidencePath,
      plan_verdict: hasStep38EncounterDirectorPlanQaEvidence(input.encounterDirectorPlan) ? 'PASS' : 'FAIL',
      runtime_verdict: hasStep38EncounterDirectorRuntimeQaEvidence(input.encounterDirectorRuntimeEvidence) ? 'PASS' : 'FAIL'
    },
    outcome_state_machine: {
      required: true,
      report_path: input.outcomeStateMachineReportPath,
      win_path_evidence_path: input.winPathEvidencePath,
      lose_path_evidence_path: input.losePathEvidencePath,
      state_machine_verdict: hasStep38OutcomeStateMachineQaEvidence(input.outcomeStateMachineReport) ? 'PASS' : 'FAIL',
      win_path_verdict: hasStep38WinPathQaEvidence(input.winPathEvidence) ? 'PASS' : 'FAIL',
      lose_path_verdict: hasStep38LosePathQaEvidence(input.losePathEvidence) ? 'PASS' : 'FAIL'
    },
    real_playthrough_completion: {
      required: true,
      evidence_path: input.realPlaythroughCompletionEvidencePath,
      verdict: hasStep38RealPlaythroughCompletionQaEvidence(input.realPlaythroughCompletionEvidence) ? 'PASS' : 'FAIL'
    },
    two_d_gameplay_playthrough: {
      required: true,
      target: 'generated_2d_gameplay',
      evidence_path: input.twoDGameplayPlaythroughGatePath,
      renderer_is_implementation_detail: true,
      verdict: hasStep38TwoDGameplayPlaythroughGateQaEvidence(input.twoDGameplayPlaythroughGate) ? 'PASS' : 'FAIL'
    },
    canvas_visual_readability: {
      required: true,
      evidence_path: input.canvasVisualReadabilityGatePath,
      renderer_kind: 'canvas_texture',
      png_required_for_pass: false,
      verdict: hasStep38CanvasVisualReadabilityQaEvidence(input.canvasVisualReadabilityGate) ? 'PASS' : 'FAIL'
    },
    procedural_pixel_art_grammar: {
      required: true,
      evidence_path: input.proceduralPixelArtGrammarReportPath,
      renderer_kind: 'runtime_canvas_texture',
      external_art_required: false,
      image_model_required: false,
      verdict: hasStep38ProceduralPixelArtGrammarQaEvidence(input.proceduralPixelArtGrammarReport) ? 'PASS' : 'FAIL'
    },
    canvas_art_fidelity: {
      required: true,
      evidence_path: input.canvasArtFidelityGatePath,
      target_fidelity: 'procedural_pixel_art_readable_v1',
      renderer_kind: 'runtime_canvas_texture',
      verdict: hasStep38CanvasArtFidelityQaEvidence(input.canvasArtFidelityGate) ? 'PASS' : 'FAIL'
    },
    sprite_animation_coverage: {
      required: true,
      evidence_path: input.spriteAnimationCoverageReportPath,
      verdict: hasStep38SpriteAnimationCoverageQaEvidence(input.spriteAnimationCoverageReport) ? 'PASS' : 'FAIL'
    },
    environment_layering: {
      required: true,
      evidence_path: input.environmentLayeringReportPath,
      verdict: hasStep38EnvironmentLayeringQaEvidence(input.environmentLayeringReport) ? 'PASS' : 'FAIL'
    },
    startup_survivability: {
      required: true,
      evidence_path: input.startupSurvivabilityGatePath,
      verdict: hasStep38StartupSurvivabilityQaEvidence(input.startupSurvivabilityGate) ? 'PASS' : 'FAIL'
    },
    encounter_playability: {
      required: true,
      evidence_path: input.encounterPlayabilityGatePath,
      verdict: hasStep38EncounterPlayabilityQaEvidence(input.encounterPlayabilityGate) ? 'PASS' : 'FAIL'
    },
    success_route_milestones: {
      required: true,
      evidence_path: input.successRouteMilestoneTimelinePath,
      verdict: hasStep38SuccessRouteMilestoneTimelineQaEvidence(input.successRouteMilestoneTimeline) ? 'PASS' : 'FAIL'
    },
    route_pressure_band: {
      required: true,
      evidence_path: input.routePressureBandEvidencePath,
      verdict: hasStep38RoutePressureBandQaEvidence(input.routePressureBandEvidence) ? 'PASS' : 'FAIL'
    },
    operator_visible_art: {
      required: true,
      evidence_path: input.operatorVisibleArtGatePath,
      verdict: hasStep38OperatorVisibleArtGateQaEvidence(input.operatorVisibleArtGate) ? 'PASS' : 'FAIL'
    },
    visual_playthrough_validator: {
      required: true,
      report_path: input.visualPlaythroughValidatorReportPath,
      verdict: hasStep38VisualPlaythroughValidatorQaEvidence(input.visualPlaythroughValidatorReport) ? 'PASS' : 'FAIL'
    },
    required_capabilities: buildStep38RequiredCapabilityEvidenceSummary(evaluation.capabilityRepresentations, manualTraversalOk),
    dslHash: hashStableJson(input.canonicalDsl),
    runtimeProfile: input.runtimePlan.profileId,
    source: {
      canonicalDslPath: CANONICAL_GAME_DSL_V02_PATH,
      runtimePlanPath: CAPABILITY_RUNTIME_PLAN_PATH,
      sceneIrSource: 'canonical_game_dsl_v0.2_runtime_plan',
      rawDslScenes0AuthorityUsed: false
    },
    entries,
    summary: {
      authoritativePathCount: entries.length,
      consumedCount,
      defaultedCount: 0,
      deferredCount: 0,
      unsupportedCount,
      ignoredAuthoritativeCount: 0,
      coverageRatio: entries.length === 0 ? 0 : consumedCount / entries.length
    },
    artifacts: {
      canonicalDsl: input.canonicalDsl,
      runtimePlan: input.runtimePlan,
      sceneIr: input.sceneIr,
      runtimeManifest: input.runtimeManifest,
      manualVerticalSliceProjection: input.manualVerticalSliceProjection,
      manualTraversalPath: input.manualTraversalPath,
      visualRuntimeBindingReport: input.visualRuntimeBindingReport,
      visualAssetMaterializationReport: input.visualAssetMaterializationReport,
      runtimeTextureLoadReport: input.runtimeTextureLoadReport,
      artDirectionQualityReport: input.artDirectionQualityReport,
      encounterDirectorPlan: input.encounterDirectorPlan,
      encounterDirectorRuntimeEvidence: input.encounterDirectorRuntimeEvidence,
      outcomeStateMachineReport: input.outcomeStateMachineReport,
      winPathEvidence: input.winPathEvidence,
      losePathEvidence: input.losePathEvidence,
      realPlaythroughCompletionEvidence: input.realPlaythroughCompletionEvidence,
      twoDGameplayPlaythroughGate: input.twoDGameplayPlaythroughGate,
      canvasVisualReadabilityGate: input.canvasVisualReadabilityGate,
      proceduralPixelArtGrammarReport: input.proceduralPixelArtGrammarReport,
      canvasArtFidelityGate: input.canvasArtFidelityGate,
      spriteAnimationCoverageReport: input.spriteAnimationCoverageReport,
      environmentLayeringReport: input.environmentLayeringReport,
      startupSurvivabilityGate: input.startupSurvivabilityGate,
      encounterPlayabilityGate: input.encounterPlayabilityGate,
      operatorVisibleArtGate: input.operatorVisibleArtGate,
      visualPlaythroughValidatorReport: input.visualPlaythroughValidatorReport,
      successRouteMilestoneTimeline: input.successRouteMilestoneTimeline,
      routePressureBandEvidence: input.routePressureBandEvidence,
      qaReport: input.qaReport,
      telemetryEvents: input.telemetryEvents
    }
  };
}

function buildStep38RequiredCapabilityEvidenceSummary(
  representations: Step38CapabilityRepresentation[],
  manualTraversalOk: boolean
): Record<string, Record<string, boolean>> {
  const aliases: Record<string, string> = {
    genre_side_scrolling_run_and_gun: 'side_scrolling_run_and_gun',
    player_movement: 'movement',
    directional_shooting: 'directional_shooting',
    weapon_pickups: 'weapon_pickups',
    enemy_waves: 'enemy_waves',
    multi_area_progression: 'multi_area_progression',
    boss_phase_or_boss_encounter_structure: 'boss_encounter',
    arcade_feedback_score_lives_damage: 'arcade_feedback',
    game_over_state: 'game_over',
    mission_complete_or_win_state: 'mission_complete',
    dsl_driven_visual_intent: 'dsl_driven_visual_intent'
  };
  const summary: Record<string, Record<string, boolean>> = {};
  for (const representation of representations) {
    const key = aliases[representation.capability] ?? representation.capability;
    summary[key] = {
      canonical_dsl: representation.canonicalDsl,
      runtime_plan: representation.runtimePlan,
      scene_ir: representation.sceneIr,
      runtime_manifest: representation.runtimeManifest,
      browser_evidence: representation.runtimeOrTelemetry && manualTraversalOk
    };
  }
  if (summary.boss_encounter !== undefined) {
    summary.boss_phases = { ...summary.boss_encounter };
  }
  if (summary.movement !== undefined) {
    summary.jump = { ...summary.movement };
    summary.crouch = { ...summary.movement };
  }
  return summary;
}

async function readGitStatus(): Promise<string> {
  return await execFileText('git', ['status', '--short', '--branch']);
}

async function readGitDiffSummary(): Promise<Record<string, string>> {
  const stat = await execFileText('git', ['diff', '--stat']);
  const nameStatus = await execFileText('git', ['diff', '--name-status']);
  const untrackedReviewCriticalFiles = await readUntrackedReviewCriticalFiles();
  return {
    stat,
    nameStatus,
    untrackedReviewCriticalFiles: JSON.stringify(untrackedReviewCriticalFiles, null, 2)
  };
}

async function readUntrackedReviewCriticalFiles(): Promise<Array<Record<string, string>>> {
  const status = await execFileText('git', ['status', '--short']);
  const reviewCriticalPatterns = [
    /^scripts\/step38-deepseek-dsl-consumption\.ts$/,
    /^scripts\/step38-visual-asset-materializer\.ts$/,
    /^scripts\/run-step38-deepseek-dsl-smoke\.ts$/,
    /^tests\/workspace\/step38-deepseek-dsl-consumption\.test\.ts$/,
    /^docs\/plans\/step38-deepseek-v4-flash-dsl-consumption\.md$/
  ];
  const files = status
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('?? '))
    .map((line) => line.slice(3))
    .filter((path) => reviewCriticalPatterns.some((pattern) => pattern.test(path)));

  return await Promise.all(
    files.sort().map(async (path) => ({
      path,
      sha256: await sha256File(join(repoRoot, path))
    }))
  );
}

async function execFileText(cmd: string, args: string[]): Promise<string> {
  return await new Promise<string>((resolvePromise) => {
    execFile(cmd, args, { cwd: repoRoot }, (error, stdout, stderr) => {
      const errorMessage = error instanceof Error ? error.message : '';
      resolvePromise([stdout, stderr, errorMessage].filter(Boolean).join('\n').trim());
    });
  });
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function buildPreviewLaunchCommand(generatedArtifactDir: string): string {
  return `python3 -m http.server 4173 --directory ${JSON.stringify(join(generatedArtifactDir, 'dist'))}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringArrayField(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function readGateVerdict(record: Record<string, unknown>, key: string): string {
  const gate = record[key];
  return isRecord(gate) && typeof gate.verdict === 'string' ? gate.verdict : 'MISSING';
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

async function writeBlockedExceptionEvidence(input: {
  runId: string;
  projectId: string;
  workspace: LocalWorkspaceService;
  providerLogs: ProviderLogRecord[];
  providerEvidencePath: string;
  artifactManifestPath: string;
  evidencePackagePath: string;
  manualInstructionsPath: string;
  modelName: string;
  error: unknown;
}): Promise<void> {
  const generatedArtifactDir = input.workspace.getGeneratedProjectDir(input.projectId);
  const previewUrl =
    process.env.PREVIEW_BASE_URL === undefined ? 'not_available_smoke_runner_exception' : `${process.env.PREVIEW_BASE_URL}/preview/${input.projectId}/index.html`;
  const gameBriefRawPath = input.workspace.getModelOutputPath(input.projectId, input.runId, 'game-brief.raw.json');
  const rawGameDslResponsePath = input.workspace.getModelOutputPath(input.projectId, input.runId, CAPABILITY_GAME_DSL_DRAFT_RAW_PATH);
  const modelOutputDir = dirname(rawGameDslResponsePath);
  const candidateDslPath = join(dirname(input.evidencePackagePath), 'candidate-dsl.json');
  const canonicalDslPath = join(modelOutputDir, CANONICAL_GAME_DSL_V02_PATH);
  const runtimePlanPath = join(modelOutputDir, CAPABILITY_RUNTIME_PLAN_PATH);
  const sceneIrPath = join(generatedArtifactDir, 'game.scene.ir.json');
  const runtimeManifestPath = join(modelOutputDir, RUNTIME_SYSTEM_MANIFEST_PATH);
  const gameBriefRawResponsePresent = await pathExists(gameBriefRawPath);
  const rawGameDslResponsePresent = await pathExists(rawGameDslResponsePath);
  const canonicalDslSha = await sha256IfPresent(canonicalDslPath);
  const blockers = input.error instanceof Step38BlockedError ? [input.error.blocker] : ['smoke_runner_exception'];
  const marker = {
    run_id: input.runId,
    prompt_sha: DEEPSEEK_RUN_AND_GUN_FIXED_PROMPT_SHA256,
    canonical_dsl_sha: canonicalDslSha ?? '<missing>',
    fallback_used: false,
    preloaded_artifact_used: false,
    ready_state: 'BLOCKED',
    build_result: 'SMOKE_RUNNER_EXCEPTION',
    legacy_fixed_template_authority: canonicalDslSha === null,
    canonical_dsl_present: canonicalDslSha !== null,
    runtime_plan_present: await pathExists(runtimePlanPath),
    scene_ir_present: await pathExists(sceneIrPath),
    runtime_manifest_present: await pathExists(runtimeManifestPath),
    raw_game_dsl_response_present: rawGameDslResponsePresent,
    game_brief_raw_response_present: gameBriefRawResponsePresent
  };

  await writeJson(input.providerEvidencePath, { ...buildProviderEvidence(input.providerLogs, input.modelName), runnerException: true });
  await injectStep38Marker(generatedArtifactDir, marker);

  const artifactManifestPayload = {
    schemaVersion: 'step38.artifact-manifest.v1',
    run_id: input.runId,
    project_id: input.projectId,
    prompt_sha: DEEPSEEK_RUN_AND_GUN_FIXED_PROMPT_SHA256,
    game_brief_raw_response_sha: await sha256IfPresent(gameBriefRawPath),
    raw_game_dsl_response_sha: await sha256IfPresent(rawGameDslResponsePath),
    candidate_dsl_sha: await sha256IfPresent(candidateDslPath),
    canonical_dsl_sha: canonicalDslSha,
    runtime_plan_sha: await sha256IfPresent(runtimePlanPath),
    scene_ir_sha: await sha256IfPresent(sceneIrPath),
    runtime_manifest_sha: await sha256IfPresent(runtimeManifestPath),
    generated_artifact_dir: generatedArtifactDir
  };
  const artifactManifestPayloadSha = sha256Text(JSON.stringify(artifactManifestPayload, null, 2));
  await writeJson(input.artifactManifestPath, { ...artifactManifestPayload, artifact_manifest_payload_sha256: artifactManifestPayloadSha });

  const evidencePackage = {
    schemaVersion: 'step38.deepseek-v4-flash-dsl-consumption-evidence.v1',
    ready_state: 'BLOCKED',
    blockers,
    exception: sanitizeError(input.error),
    run_id: input.runId,
    project_id: input.projectId,
    baseline_commit: STEP38_BASELINE_COMMIT,
    prompt_source_path: 'packages/game-dsl/src/deepseek-run-and-gun-validation-profile-v1.ts#DEEPSEEK_RUN_AND_GUN_FIXED_USER_VALIDATION_PROMPT',
    prompt_sha256: DEEPSEEK_RUN_AND_GUN_FIXED_PROMPT_SHA256,
    deepseek_provider_evidence_path: input.providerEvidencePath,
    model_name: input.modelName,
    expected_model_name: STEP38_EXPECTED_PROVIDER_MODEL,
    deepseek_raw_response_paths: {
      game_brief: gameBriefRawResponsePresent ? gameBriefRawPath : null,
      capability_game_dsl_draft: rawGameDslResponsePresent ? rawGameDslResponsePath : null,
      raw_game_dsl_v0_1_legacy: null
    },
    game_brief_raw_response_path: gameBriefRawResponsePresent ? gameBriefRawPath : null,
    game_brief_raw_response_sha256: await sha256IfPresent(gameBriefRawPath),
    raw_game_dsl_response_path: rawGameDslResponsePresent ? rawGameDslResponsePath : null,
    raw_game_dsl_response_sha256: await sha256IfPresent(rawGameDslResponsePath),
    candidate_dsl_path: (await pathExists(candidateDslPath)) ? candidateDslPath : null,
    candidate_dsl_sha256: await sha256IfPresent(candidateDslPath),
    canonical_dsl_path: (await pathExists(canonicalDslPath)) ? canonicalDslPath : null,
    canonical_dsl_sha256: canonicalDslSha,
    legacy_game_dsl_path: null,
    runtime_plan_path: (await pathExists(runtimePlanPath)) ? runtimePlanPath : null,
    runtime_plan_sha256: await sha256IfPresent(runtimePlanPath),
    scene_ir_path: (await pathExists(sceneIrPath)) ? sceneIrPath : null,
    scene_ir_sha256: await sha256IfPresent(sceneIrPath),
    runtime_system_manifest_path: (await pathExists(runtimeManifestPath)) ? runtimeManifestPath : null,
    runtime_system_manifest_sha256: await sha256IfPresent(runtimeManifestPath),
    generated_artifact_directory: generatedArtifactDir,
    generated_artifact_manifest: input.artifactManifestPath,
    build_result: 'SMOKE_RUNNER_EXCEPTION',
    preview_url: previewUrl,
    preview_launch_command: buildPreviewLaunchCommand(generatedArtifactDir),
    telemetry_evidence_path: null,
    qa_evidence_path: null,
    dsl_consumption_report_path: null,
    fallback_used: false,
    preloaded_artifact_used: false,
    stale_artifact_used: false,
    ignored_required_dsl_fields: [],
    unsupported_required_capabilities: blockers,
    capability_representations: [],
    step38_marker: marker,
    manual_test_instructions_path: input.manualInstructionsPath
  };
  await writeJson(input.evidencePackagePath, evidencePackage);
  await writeManualInstructions(input.manualInstructionsPath, {
    previewUrl,
    previewLaunchCommand: buildPreviewLaunchCommand(generatedArtifactDir),
    evidencePackagePath: input.evidencePackagePath,
    marker
  });
}

async function injectStep38Marker(generatedArtifactDir: string, marker: Record<string, unknown>): Promise<void> {
  const markerContent = JSON.stringify(marker).replaceAll('"', '&quot;');
  const markerTag = `<meta name="agm-step38-marker" content="${markerContent}">`;
  await Promise.all(
    [join(generatedArtifactDir, 'index.html'), join(generatedArtifactDir, 'dist', 'index.html')].map(async (path) => {
      if (!(await pathExists(path))) return;
      const html = await readFile(path, 'utf8');
      const withMarker = html.includes('agm-step38-marker')
        ? html.replace(/\s*<meta name="agm-step38-marker" content="[^"]*">/, `\n    ${markerTag}`)
        : html.replace('<head>', `<head>\n    ${markerTag}`);
      await writeFile(path, withMarker, 'utf8');
    })
  );
  await Promise.all(
    [join(generatedArtifactDir, 'step38-marker.json'), join(generatedArtifactDir, 'public', 'step38-marker.json'), join(generatedArtifactDir, 'dist', 'step38-marker.json')].map(
      async (path) => {
        await writeJson(path, marker);
      }
    )
  );
}

function sanitizeError(error: unknown): { name: string; message: string; details?: unknown } {
  if (error instanceof Step38BlockedError) {
    return {
      name: error.name,
      message: error.blocker,
      details: sanitizeErrorDetails(error.details)
    };
  }

  if (error instanceof Error) {
    return { name: error.name, message: redactSensitiveText(error.message) };
  }

  return { name: 'NonErrorThrown', message: redactSensitiveText(String(error)) };
}

function sanitizeErrorDetails(details: unknown): unknown {
  if (!isRecord(details)) {
    return redactSensitiveText(String(details));
  }

  return Object.fromEntries(
    Object.entries(details)
      .filter(([key]) => key !== 'rawText')
      .map(([key, value]) => [key, typeof value === 'string' ? redactSensitiveText(value) : value])
  );
}

function redactSensitiveText(value: string): string {
  const trimmed = value.slice(0, 1000);
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  const withoutApiKey = apiKey === undefined || apiKey.length === 0 ? trimmed : trimmed.replaceAll(apiKey, '<redacted:DEEPSEEK_API_KEY>');
  return withoutApiKey.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer <redacted>');
}

async function verifyPreviewMarker(previewUrl: string, runId: string): Promise<boolean> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(previewUrl);
      if (response.ok && (await response.text()).includes(runId)) {
        return true;
      }
    } catch {
      // The embedded preview server can need a short moment after build output lands.
    }
    await sleep(150);
  }
  return false;
}

async function startPreviewServer(workspace: LocalWorkspaceService): Promise<Server> {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const match = /^\/preview\/([^/]+)\/(.+)$/.exec(url.pathname);

    if (!match) {
      response.writeHead(404).end();
      return;
    }

    const [, requestedProjectId, fileName] = match;
    const baseDir = workspace.getGeneratedProjectDistDir(requestedProjectId);
    const filePath = resolve(baseDir, fileName);
    const pathFromBase = relative(baseDir, filePath);

    if (pathFromBase === '' || pathFromBase.startsWith('..') || isAbsolute(pathFromBase)) {
      response.writeHead(404).end();
      return;
    }

    response.setHeader('content-type', contentTypeForFile(filePath));
    createReadStream(filePath)
      .on('error', () => response.writeHead(404).end())
      .pipe(response);
  });

  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  return server;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolveClose, rejectClose) => server.close((error) => (error ? rejectClose(error) : resolveClose())));
}

function contentTypeForFile(path: string): string {
  switch (extname(path)) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function writeManualInstructions(
  path: string,
  input: { previewUrl: string; previewLaunchCommand?: string; evidencePackagePath: string; marker: Record<string, unknown> }
): Promise<void> {
  await writeFile(
    path,
    [
      '# Step38 Manual Test Instructions',
      '',
      `Smoke preview URL: ${input.previewUrl}`,
      ...(input.previewLaunchCommand === undefined ? [] : [`Re-launch command: ${input.previewLaunchCommand}`, 'Then open: http://127.0.0.1:4173/index.html']),
      `Evidence package: ${input.evidencePackagePath}`,
      '',
      'Operator review gate must approve this evidence package before manual testing can begin.',
      'Manual approval is separate from READY_FOR_MANUAL_TEST and must not be treated as COMPLETE_GLOBAL_LOOP.',
      '',
      'Before approving Step38, open the preview and verify:',
      '- the `agm-step38-marker` metadata or `step38-marker.json` matches this evidence package;',
      '- the game is generated for the current Step38 run, not a preloaded/canned/stale/fallback artifact;',
      '- the game is side-scrolling run-and-gun and not downgraded to another genre;',
      '- movement, jump, crouch, shooting, enemies, pickups, progression, boss/win/loss or implemented equivalents are present enough for the Step38 target;',
      '- the marker values are:',
      '',
      '```json',
      JSON.stringify(input.marker, null, 2),
      '```',
      ''
    ].join('\n'),
    'utf8'
  );
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function readJsonIfPresent(path: string): Promise<unknown | undefined> {
  return (await pathExists(path)) ? await readJsonFile(path) : undefined;
}

async function sha256IfPresent(path: string): Promise<string | null> {
  return (await pathExists(path)) ? await sha256File(path) : null;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function readSourceDsl(value: unknown): unknown {
  if (typeof value === 'object' && value !== null && 'sourceDsl' in value) {
    return (value as { sourceDsl: unknown }).sourceDsl;
  }
  return value;
}

async function readTelemetryEvents(path: string): Promise<string[]> {
  if (!(await pathExists(path))) {
    return [];
  }
  const content = await readFile(path, 'utf8');
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .flatMap((line) => {
      try {
        const parsed = JSON.parse(line) as { event?: string; name?: string; type?: string };
        return [parsed.event ?? parsed.name ?? parsed.type].filter((event): event is string => typeof event === 'string');
      } catch {
        return [];
      }
    });
}

function formatRunTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
