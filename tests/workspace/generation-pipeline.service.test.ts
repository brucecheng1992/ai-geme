import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createCollectorRawDsl, createShooterRawDsl, createSideScrollingRunAndGunRawDsl } from '../contracts/fixtures.js';
import {
  GenerationPipelineService,
  readAssetSemanticRepairConfig,
  type AssetSemanticRepairConfig
} from '../../apps/maker-api/src/projects/generation-pipeline.service.js';
import { ProjectStoreService } from '../../apps/maker-api/src/projects/project-store.service.js';
import { RunStoreService } from '../../apps/maker-api/src/projects/run-store.service.js';
import { LocalWorkspaceService } from '../../apps/maker-api/src/workspace/local-workspace.service.js';
import { TemplateCompilerService } from '../../apps/maker-api/src/compiler/template-compiler.service.js';
import type { RuntimeCompileResult } from '../../apps/maker-api/src/compiler/compiler.types.js';
import type {
  QaCapabilityRuntimeEvidence,
  QaCapabilityRuntimeExpectation,
  QaGenre,
  QaReport,
  QaRuntimeAuthorityExpectation
} from '../../apps/maker-api/src/qa/qa.types.js';
import {
  AssetManifestSchema,
  AssetResolutionReportSchema,
  buildAssetIntentManifest,
  buildAssetPlanFromIr,
  buildAssetResolutionReport,
  type AssetManifest,
  type AssetPlan,
  type AssetResolutionReport
} from '../../packages/asset-pipeline/src/index.js';
import { GameBriefSchema, RawGameDslSchema, SceneIrSchema, buildGameDslArtifact, type GameBriefV02, type GameDslArtifact, type NormalizedGameIr, type RawGameDsl, type SceneIr } from '../../packages/game-dsl/src/index.js';

const projectId = 'proj_20260610_050000_pipe';
const runId = 'run_20260610_050000_pipe';
const templateRoot = join(process.cwd(), 'templates', 'phaser');

type PipelineOverrides = {
  modelProvider?: ConstructorParameters<typeof GenerationPipelineService>[3];
  compiler?: ConstructorParameters<typeof GenerationPipelineService>[4];
  buildRunner?: ConstructorParameters<typeof GenerationPipelineService>[5];
  qaRunner?: ConstructorParameters<typeof GenerationPipelineService>[6];
  assetSemanticRepairConfig?: AssetSemanticRepairConfig;
};

describe('GenerationPipelineService failure states', () => {
  let root: string;
  let workspace: LocalWorkspaceService;
  let projectStore: ProjectStoreService;
  let runStore: RunStoreService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-pipeline-'));
    workspace = new LocalWorkspaceService(root);
    projectStore = new ProjectStoreService(workspace);
    runStore = new RunStoreService(workspace);
    await projectStore.createProject({ projectId, runId, idea: 'cat shooter', language: 'en' });
    const run = await runStore.createRun({ projectId, runId });
    await projectStore.writeLatestRun(projectId, run);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function resetStores(): Promise<void> {
    await rm(root, { recursive: true, force: true });
    await mkdir(root, { recursive: true });
    workspace = new LocalWorkspaceService(root);
    projectStore = new ProjectStoreService(workspace);
    runStore = new RunStoreService(workspace);
    await projectStore.createProject({ projectId, runId, idea: 'cat shooter', language: 'en' });
    const run = await runStore.createRun({ projectId, runId });
    await projectStore.writeLatestRun(projectId, run);
  }

  it('keeps semantic asset repair disabled by default config and clamps explicit attempts to one', () => {
    expect(readAssetSemanticRepairConfig({} as NodeJS.ProcessEnv)).toMatchObject({
      enabled: false,
      maxAttempts: 1
    });
    expect(
      readAssetSemanticRepairConfig({
        ASSET_SEMANTIC_REPAIR_ENABLED: 'true',
        ASSET_SEMANTIC_REPAIR_MAX_ATTEMPTS: '5',
        AGM_ASSET_PACKS_DIR: '/tmp/asset-packs'
      } as NodeJS.ProcessEnv)
    ).toEqual({
      enabled: true,
      maxAttempts: 1,
      assetPacksDir: '/tmp/asset-packs'
    });
  });

  it('does not execute repair when the explicit max attempt budget is zero', async () => {
    let qaRuns = 0;
    const pipeline = createPipeline({
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre; expectedRuntimeAuthority?: QaRuntimeAuthorityExpectation }) {
          qaRuns += 1;
          return createQaReport(input.genre, {
            asset_semantic_status: 'FAILED',
            overall_status: 'NEEDS_ASSET_REPAIR'
          }, input.expectedRuntimeAuthority);
        }
      },
      assetSemanticRepairConfig: { enabled: true, maxAttempts: 0 }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('PLAYABLE');
    expect(qaRuns).toBe(1);
    await expect(runStore.readEvents(runId)).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'asset-repair.started' })])
    );
    await expect(readQaReport()).resolves.toMatchObject({
      asset_semantic_repair: {
        enabled: true,
        attempted: false,
        skippedReason: 'max_attempts_exhausted',
        attemptCount: 0,
        maxAttempts: 0,
        beforeOverallStatus: 'NEEDS_ASSET_REPAIR',
        beforeAssetSemanticStatus: 'FAILED'
      }
    });
  });

  it('rewrites side-scrolling runtime scene binding report from QA snapshot evidence', async () => {
    const rawDsl = RawGameDslSchema.parse(createSideScrollingRunAndGunRawDsl());
    const pipeline = createPipeline({
      modelProvider: createModelProviderForRawDsl(rawDsl),
      compiler: new TemplateCompilerService(workspace, templateRoot),
      buildRunner: {
        async build() {
          const distDir = workspace.getGeneratedProjectDistDir(projectId);
          const logPath = workspace.getBuildLogPath(projectId, runId);
          await mkdir(distDir, { recursive: true });
          await writeFile(join(distDir, 'index.html'), '<html></html>', 'utf8');
          await mkdir(dirname(logPath), { recursive: true });
          await writeFile(logPath, 'vite build ok', 'utf8');
          return { ok: true, projectId, distDir, logPath };
        }
      },
      qaRunner: {
        async run(input: {
          genre: QaGenre;
          expectedRuntimeAuthority?: QaRuntimeAuthorityExpectation;
          expectedCapabilityRuntime?: QaCapabilityRuntimeExpectation;
        }) {
          const sceneIr = SceneIrSchema.parse(JSON.parse(await readFile(join(workspace.getGeneratedProjectDir(projectId), 'game.scene.ir.json'), 'utf8')));
          return createQaReport(input.genre, {
            observed_events: ['game.started', 'player.jumped', 'player.fired', 'projectile.spawned'],
            snapshot: {
              sceneBindings: buildObservedSceneBindings(sceneIr),
              runtimeAuthority: input.expectedRuntimeAuthority,
              capabilityRuntime: {
                source: 'side_scrolling_runtime',
                probes: [projectileObservedProbe(), movementRunJumpObservedProbe(), defaultWeaponObservedProbe()]
              }
            },
            capability_runtime: defaultWeaponCapabilityRuntimeEvidence(input.expectedCapabilityRuntime)
          }, input.expectedRuntimeAuthority);
        }
      }
    });

    await expect(runPipeline(pipeline, { idea: '横版跑枪', language: 'zh' })).resolves.toBe('PLAYABLE');

    const generationPathReceipt = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_path_receipt.json'), 'utf8'));
    const capabilityReadiness = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_capability_readiness_report.json'), 'utf8'));
    const capabilityResolution = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_capability_resolution_report.json'), 'utf8'));
    const capabilityRuntime = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_capability_runtime_report.json'), 'utf8'));
    const capabilityQaReport = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'shadow_capability_qa_report.json'), 'utf8'));
    const targetRuntimeSupport = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_target_profile_runtime_support_report.json'), 'utf8'));
    const capabilityGap = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_capability_gap_report.json'), 'utf8'));
    const capabilityCutover = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_capability_cutover_report.json'), 'utf8'));
    const runtimeSceneBindingReport = JSON.parse(await readFile(join(workspace.getGeneratedProjectDir(projectId), 'runtime_scene_binding_report.json'), 'utf8'));
    const acceptance = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_acceptance_report.json'), 'utf8'));
    const artifactIndex = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_artifact_index.json'), 'utf8'));
    const qaReport = await readQaReport();
    expect(generationPathReceipt).toMatchObject({
      artifactKind: 'generation_path_receipt',
      projectId,
      runId,
      selectedPath: 'capability_composed_v1',
      targetPath: 'capability_composed_v1',
      dslSource: 'model_provider',
      defaultPathForSupportedProfiles: 'capability_composed_v1',
      capabilityReadiness: 'ready'
    });
    expect(capabilityReadiness).toMatchObject({
      artifactKind: 'generation_capability_readiness_report',
      profileResolution: {
        profileId: 'side_scrolling_run_and_gun.v1',
        runtimeExecutable: true,
        profileSupportStatus: 'active_profile_supported'
      },
      targetDefaultPath: 'capability_composed_v1',
      selectedDefaultPath: 'capability_composed_v1',
      capabilityPathReadiness: 'ready_for_active_profile',
      exactLockStatus: 'not_required_active_profile_bound'
    });
    expect(capabilityReadiness.blockers).toEqual([]);
    expect(capabilityResolution).toMatchObject({
      artifactKind: 'generation_capability_resolution_report',
      selectedPath: 'capability_composed_v1',
      targetPath: 'capability_composed_v1',
      shadowMode: true,
      activeLockWritten: false,
      candidatePackagePolicy: 'approved_installed_packages_only',
      resolverAttempt: 'skipped_active_profile_bound',
      resolutionStatus: 'resolved',
      exactLockStatus: 'not_required_active_profile_bound'
    });
    expect(capabilityResolution.registrySnapshotHash).toBe(capabilityReadiness.registrySnapshotHash);
    expect(capabilityResolution.readinessReportHash).toBe(capabilityReadiness.reportHash);
    expect(capabilityRuntime).toMatchObject({
      artifactKind: 'generation_capability_runtime_report',
      selectedPath: 'capability_composed_v1',
      targetPath: 'capability_composed_v1',
      shadowMode: false,
      activeRuntimeManifestWritten: true,
      activeCapabilityQaWritten: true,
      runtimeManifestStatus: 'active_profile_bound',
      runtimeLoaderStatus: 'ready',
      capabilityQaPlanStatus: 'ready',
      capabilityQaReportStatus: 'passed',
      qaRuntimeAuthorityStatus: 'matched',
      runtimeEvidenceStatus: 'observed',
      shadowCapabilityQaReportRef: 'shadow_capability_qa_report.json'
    });
    expect(capabilityQaReport).toMatchObject({
      artifactKind: 'capability_qa_report',
      status: 'passed',
      missingRequiredProbeIds: []
    });
    expect(capabilityQaReport.requiredResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          probeId: 'combat.projectile.v1.spawn.browser_qa.v1',
          status: 'passed',
          assertionResults: expect.arrayContaining([
            expect.objectContaining({
              assertionId: 'combat.projectile.v1.spawn.browser_qa.v1.assertion.projectile_spawned',
              status: 'passed'
            })
          ])
        }),
        expect.objectContaining({
          probeId: 'movement.run_jump.v1.jump.browser_qa.v1',
          status: 'passed',
          assertionResults: expect.arrayContaining([
            expect.objectContaining({
              assertionId: 'movement.run_jump.v1.jump.browser_qa.v1.assertion.player_jumped',
              status: 'passed'
            })
          ])
        }),
        expect.objectContaining({
          probeId: 'weapon.default_straight_single.v1.fire.browser_qa.v1',
          status: 'passed',
          assertionResults: expect.arrayContaining([
            expect.objectContaining({
              assertionId: 'weapon.default_straight_single.v1.fire.browser_qa.v1.assertion.player_fired',
              status: 'passed'
            }),
            expect.objectContaining({
              assertionId: 'weapon.default_straight_single.v1.fire.browser_qa.v1.assertion.projectile_spawned',
              status: 'passed'
            })
          ])
        })
      ])
    );
    expect(capabilityQaReport.requiredResults).toHaveLength(3);
    expect(capabilityRuntime.resolutionReportHash).toBe(capabilityResolution.reportHash);
    expect(capabilityRuntime.authorityBundleRef).toEqual(qaReport.runtime_authority?.expected?.authorityBundleRef);
    expect(capabilityRuntime.activeProfileLockRef).toEqual(qaReport.runtime_authority?.expected?.activeProfileLockRef);
    expect(targetRuntimeSupport).toMatchObject({
      artifactKind: 'generation_target_profile_runtime_support_report',
      status: 'blocked_incomplete_target_profile',
      staticCompleteSupportedCount: 0,
      observedCompleteSupportedCount: 3,
      targetProfileCompleteSupported: false,
      capabilityQaReportHash: capabilityQaReport.reportHash,
      observedCapabilityIds: ['combat.projectile.v1', 'movement.run_jump.v1', 'weapon.default_straight_single.v1'],
      capabilities: expect.arrayContaining([
        expect.objectContaining({
          capabilityId: 'combat.projectile.v1',
          runtimeVerified: true,
          observedCompleteSupported: true,
          verifiedRequiredProbeIds: ['combat.projectile.v1.spawn.browser_qa.v1'],
          missingRequiredProbeIds: []
        }),
        expect.objectContaining({
          capabilityId: 'movement.run_jump.v1',
          runtimeVerified: true,
          observedCompleteSupported: true,
          verifiedRequiredProbeIds: ['movement.run_jump.v1.jump.browser_qa.v1'],
          missingRequiredProbeIds: []
        }),
        expect.objectContaining({
          capabilityId: 'weapon.default_straight_single.v1',
          runtimeVerified: true,
          observedCompleteSupported: true,
          verifiedRequiredProbeIds: ['weapon.default_straight_single.v1.fire.browser_qa.v1'],
          missingRequiredProbeIds: []
        })
      ])
    });
    expect(capabilityGap).toMatchObject({
      artifactKind: 'generation_capability_gap_report',
      selectedPath: 'capability_composed_v1',
      targetPath: 'capability_composed_v1',
      shadowMode: false,
      capabilityPathGate: 'ready_for_active_profile_provider',
      gapStatus: 'not_required',
      providerInvocationPolicy: 'active_profile_provider_allowed',
      step36EscalationStatus: 'not_required',
      productionMutation: {
        activeRegistryMutation: false,
        activeExactLockMutation: false,
        fixedTemplateFallbackOnGap: false
      }
    });
    expect(capabilityGap.missingRequiredCapabilityIds).toEqual([]);
    expect(capabilityGap.readinessReportHash).toBe(capabilityReadiness.reportHash);
    expect(capabilityGap.resolutionReportHash).toBe(capabilityResolution.reportHash);
    expect(capabilityGap.runtimeReportHash).toBe(capabilityRuntime.reportHash);
    expect(capabilityCutover).toMatchObject({
      artifactKind: 'generation_capability_cutover_report',
      activeSelectedPath: 'capability_composed_v1',
      targetPath: 'capability_composed_v1',
      defaultCutoverAllowed: true,
      activePathMutation: false,
      shadowOutputMutation: false,
      cutoverStage: 'active_profile_authoritative',
      candidateCanaryStatus: 'ready',
      parityStatus: 'not_required_active_profile',
      rollbackDrillStatus: 'not_required_active_profile',
      blockers: []
    });
    expect(capabilityCutover.gapReportHash).toBe(capabilityGap.reportHash);
    expect(capabilityCutover.runtimeReportHash).toBe(capabilityRuntime.reportHash);
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'shadow_gameplay_capability_lock.json'), 'utf8')).rejects.toThrow();
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'shadow_phaser_runtime_system_manifest.json'), 'utf8')).rejects.toThrow();
    expect(runtimeSceneBindingReport).toMatchObject({
      reportVersion: 'runtime-scene-binding-report.v1',
      projectId,
      runId,
      status: 'pass',
      summary: expect.objectContaining({ unboundCount: 0 })
    });
    expect(acceptance.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'runtime_scene_binding',
          status: 'pass',
          reason: 'runtime_scene_binding_report.json has no unbound scene nodes.'
        })
      ])
    );
    expect(artifactIndex.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'shadowCapabilityQaPlan', status: 'present', path: 'shadow_capability_qa_plan.json', required: false }),
        expect.objectContaining({ id: 'shadowCapabilityQaReport', status: 'present', path: 'shadow_capability_qa_report.json', required: false }),
        expect.objectContaining({
          id: 'targetProfileRuntimeSupportReport',
          status: 'present',
          path: 'generation_target_profile_runtime_support_report.json',
          required: false
        })
      ])
    );
  });

  it('maps compiler exceptions to BUILD_FAILED and records build.failed', async () => {
    const pipeline = createPipeline({
      compiler: {
        async compile() {
          throw new Error('compile exploded');
        }
      }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('BUILD_FAILED');
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ status: 'BUILD_FAILED' });
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'generation_path_receipt.json'), 'utf8')).resolves.toContain('"selectedPath": "fail_closed_compile_failed"');
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_artifact_index.json'), 'utf8')).resolves.toContain('"generationPathReceipt"');
    await expect(runStore.readEvents(runId)).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ type: 'build.failed' })]));
  });

  it('maps runtime capability gate failures to RUNTIME_UNSUPPORTED without building or running QA', async () => {
    let buildRuns = 0;
    let qaRuns = 0;
    const pipeline = createPipeline({
      compiler: {
        async compile(input) {
          return {
            ok: false,
            code: 'RUNTIME_UNSUPPORTED',
            projectId,
            templateId: input.ir.template_params.template_id,
            unsupportedCapabilities: [
              { capability: 'side_view_camera', path: 'runtime_requirements.capabilities', reason: 'Phaser adapter does not support "side_view_camera".' }
            ]
          };
        }
      },
      buildRunner: {
        async build() {
          buildRuns += 1;
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre; expectedRuntimeAuthority?: QaRuntimeAuthorityExpectation }) {
          qaRuns += 1;
          return createQaReport(input.genre, {}, input.expectedRuntimeAuthority);
        }
      }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('RUNTIME_UNSUPPORTED');
    expect(buildRuns).toBe(0);
    expect(qaRuns).toBe(0);
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ status: 'RUNTIME_UNSUPPORTED' });
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'generation_path_receipt.json'), 'utf8')).resolves.toContain('"selectedPath": "fail_closed_runtime_unsupported"');
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_artifact_index.json'), 'utf8')).resolves.toContain('"generationPathReceipt"');
    await expect(runStore.readEvents(runId)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'runtime.unsupported', message: expect.stringContaining('side_view_camera') })])
    );
  });

  it('fails closed instead of using deterministic Raw DSL fallback when the model is unavailable', async () => {
    let compileRuns = 0;
    let buildRuns = 0;
    const pipeline = createPipeline({
      modelProvider: {
        async generateGameBrief() {
          return { ok: false, code: 'MODEL_NOT_AVAILABLE', message: 'unit test unavailable' };
        },
        async generateRawGameDsl() {
          throw new Error('Raw DSL should not be requested when GameBrief generation is unavailable.');
        }
      },
      compiler: {
        async compile() {
          compileRuns += 1;
          return compileWithDist();
        }
      },
      buildRunner: {
        async build() {
          buildRuns += 1;
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('FAILED');
    expect(compileRuns).toBe(0);
    expect(buildRuns).toBe(0);
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ status: 'FAILED' });

    const receipt = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_path_receipt.json'), 'utf8'));
    expect(receipt).toMatchObject({
      selectedPath: 'fail_closed_model_unavailable',
      dslSource: 'not_generated',
      modelFailureCode: 'MODEL_NOT_AVAILABLE'
    });
    expect(receipt.artifactRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ artifactKind: 'generation_input_report', path: 'generation_input_report.json' }),
        expect.objectContaining({ artifactKind: 'intent_plan', path: 'intent_plan.json' })
      ])
    );
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'raw-game-dsl.raw.json'), 'utf8')).rejects.toThrow();
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'game_dsl.json'), 'utf8')).rejects.toThrow();
    await expect(runStore.readEvents(runId)).resolves.toEqual(expect.not.arrayContaining([expect.objectContaining({ type: 'model.fallback' })]));
  });

  it('stores model-generated raw DSL snapshots under data/local-data/result by time', async () => {
    const rawDsl = RawGameDslSchema.parse(createCollectorRawDsl());
    const brief = GameBriefSchema.parse({
      brief_version: 'game-brief-v0.1',
      title: rawDsl.metadata.title,
      genre: rawDsl.game.genre,
      camera: rawDsl.game.camera,
      core_loop: ['Collect stars before the timer ends.', 'Avoid hazards to keep the score growing.'],
      difficulty: rawDsl.game.difficulty,
      target_play_time_sec: rawDsl.game.target_play_time_sec
    });
    const pipeline = createPipeline({
      modelProvider: {
        async generateGameBrief() {
          return {
            ok: true,
            value: brief,
            rawText: '{}',
            rawOutputPath: workspace.getModelOutputPath(projectId, runId, 'game-brief.raw.json')
          };
        },
        async generateRawGameDsl() {
          return {
            ok: true,
            value: rawDsl,
            rawText: JSON.stringify(rawDsl),
            rawOutputPath: workspace.getModelOutputPath(projectId, runId, 'raw-game-dsl.raw.json')
          };
        }
      },
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      }
    });

    await expect(runPipeline(pipeline, { idea: 'collect gems', language: 'en' })).resolves.toBe('PLAYABLE');

    const resultFiles = await collectFiles(join(root, 'data/local-data/result'));
    expect(resultFiles).toHaveLength(1);
    expect(resultFiles[0]).toContain('/data/local-data/result/');
    expect(resultFiles[0]).toContain(`__${projectId}__${runId}__raw-game-dsl.json`);
    await expect(readFile(resultFiles[0], 'utf8')).resolves.toContain(`"title": "${rawDsl.metadata.title}"`);
  });

  it('stores intent_plan.json before DSL generation', async () => {
    const rawDsl = RawGameDslSchema.parse(createShooterRawDsl());
    const pipeline = createPipeline({
      modelProvider: createModelProviderForRawDsl(rawDsl),
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      }
    });

    await expect(runPipeline(pipeline, { idea: '小猫大战坦克', language: 'zh' })).resolves.toBe('PLAYABLE');

    const intentPlan = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'intent_plan.json'), 'utf8'));
    const generationInputReport = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_input_report.json'), 'utf8'));
    const gameDsl = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'game_dsl.json'), 'utf8'));
    const validationReport = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'dsl_validation_report.json'), 'utf8'));
    const runtimeCapabilityReport = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'runtime_capability_report.json'), 'utf8'));
    expect(generationInputReport).toEqual({
      reportVersion: 'generation_input_report.v1',
      projectId,
      runId,
      source: 'manual',
      effectivePrompt: '小猫大战坦克',
      promptOptimizationRef: null,
      candidatePromptMatchesEffectivePrompt: false,
      checkedPaths: ['effectivePrompt', 'source'],
      status: 'accepted',
      warnings: [],
      errors: []
    });
    expect(JSON.stringify(generationInputReport)).not.toContain('raw-game-dsl');
    expect(intentPlan).toMatchObject({
      schemaVersion: 'intent-plan-v0.1',
      sourcePrompt: '小猫大战坦克',
      normalizedGenre: 'top_down_shooter',
      runtimeDslSupport: 'supported'
    });
    expect(gameDsl).toMatchObject({
      artifactKind: 'game_dsl',
      schemaVersion: 'game_dsl.v1',
      runId,
      intentPlanRef: { artifact: 'intent_plan.json', normalizedGenre: 'top_down_shooter' },
      genre: 'top_down_shooter',
      player: { id: 'player' },
      enemyTypes: { alien: expect.objectContaining({ id: 'alien' }) },
      projectiles: { bolt: expect.objectContaining({ id: 'bolt' }) },
      level: { id: 'level_main', waves: { alien_wave: expect.objectContaining({ id: 'alien_wave' }) } }
    });
    expect(validationReport).toMatchObject({
      artifactKind: 'dsl_validation_report',
      reportVersion: 'dsl-validation-report-v1',
      schemaVersion: 'dsl_validation_report.v1',
      runId,
      sourceArtifact: 'game_dsl.json',
      validatedArtifact: { artifactKind: 'game_dsl', schemaVersion: 'game_dsl.v1', dslId: gameDsl.dslId },
      status: 'valid',
      valid: true,
      errorCount: 0,
      checkedPaths: expect.arrayContaining(['schemaVersion', 'player.id', 'level.waves.alien_wave.id']),
      stableIdSummary: expect.objectContaining({
        duplicateIds: [],
        checked: expect.arrayContaining([{ path: 'player.id', id: 'player' }])
      }),
      objectCounts: expect.objectContaining({
        player: 1,
        enemyTypes: 1,
        projectiles: 1,
        waves: 1
      }),
      requiredCapabilities: expect.arrayContaining(['top_down_camera', 'projectile_combat'])
    });
    expect(runtimeCapabilityReport).toMatchObject({
      artifactKind: 'runtime_capability_report',
      schemaVersion: 'runtime_capability_report.v1',
      runId,
      validatedDslRef: { artifactKind: 'game_dsl', schemaVersion: 'game_dsl.v1', dslId: gameDsl.dslId },
      selectedAdapterId: 'top_down_shooter.phaser.v1',
      status: 'supported',
      liveEditCapabilities: {
        hot: expect.arrayContaining(['/player/render/scale', '/projectiles/*/damage']),
        warmRestart: expect.arrayContaining(['/player/label', '/enemyTypes/*/label', '/level/waves', '/level/waves/*/count']),
        rebuildRequired: expect.arrayContaining(['/genre', '/world/coordinateSystem'])
      }
    });
    await expect(runStore.readEvents(runId)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'intent.planned', message: 'Intent normalized to top_down_shooter.' })])
    );
  });

  it('persists canonical GameBrief and GenerationScopePlan evidence before Raw DSL generation', async () => {
    const rawDsl = RawGameDslSchema.parse(createShooterRawDsl());
    const briefV02: GameBriefV02 = {
      brief_version: 'game-brief-v0.1',
      schema_version: '0.2',
      title: 'Alien Clear',
      genre: 'shooter',
      camera: 'top_down',
      core_loop: ['Move around the arena.', 'Fire projectiles at enemies.', 'Clear enemies to win.'],
      difficulty: 'normal',
      play_time_intent: { mode: 'target', target_sec: 90 }
    };
    let rawDslBrief: unknown;
    let rawDslAuthorityBundle: unknown;
    const pipeline = createPipeline({
      modelProvider: {
        async generateGameBrief() {
          return {
            ok: true,
            value: briefV02,
            rawText: JSON.stringify(briefV02),
            rawOutputPath: workspace.getModelOutputPath(projectId, runId, 'game-brief.raw.json'),
            sourceFormat: 'v0.2' as const
          };
        },
        async generateRawGameDsl(input) {
          rawDslBrief = input.brief;
          rawDslAuthorityBundle = input.authorityBundle;
          return {
            ok: true,
            value: rawDsl,
            rawText: JSON.stringify(rawDsl),
            rawOutputPath: workspace.getModelOutputPath(projectId, runId, 'raw-game-dsl.raw.json')
          };
        }
      },
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      }
    });

    await expect(runPipeline(pipeline, { idea: 'cat shooter for 90 seconds', language: 'en' })).resolves.toBe('PLAYABLE');

    const canonicalBrief = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'canonical_game_brief.json'), 'utf8'));
    const generationScopePlan = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_scope_plan.json'), 'utf8'));
    const authorityBundle = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'authority_bundle.json'), 'utf8'));
    const dslConsumptionReport = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'dsl_consumption_report.json'), 'utf8'));
    const receipt = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_path_receipt.json'), 'utf8'));
    const index = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_artifact_index.json'), 'utf8'));

    expect(canonicalBrief).toMatchObject({
      artifactKind: 'canonical_game_brief',
      schemaVersion: 'canonical_game_brief.v1',
      projectId,
      runId,
      briefSchemaVersion: '0.2',
      sourceFormat: 'v0.2',
      rawOutputRef: { artifactKind: 'game_brief_raw_model_output', path: 'game-brief.raw.json' },
      canonicalBrief: briefV02,
      contentHash: expect.stringMatching(/^fnv1a_[0-9a-f]{8}$/)
    });
    expect(generationScopePlan).toMatchObject({
      schemaVersion: 'step37.generation-scope-plan.v1',
      requestedPlayTime: briefV02.play_time_intent,
      deliveryMode: 'single_pass',
      qaProbeWindowSec: 90,
      preservesRequestedPlayTime: true
    });
    expect(rawDslBrief).toEqual(briefV02);
    expect(rawDslAuthorityBundle).toEqual(authorityBundle);
    expect(authorityBundle).toMatchObject({
      artifactKind: 'authority_bundle',
      schemaVersion: 'step37.authority-bundle.v1',
      projectId,
      runId,
      canonicalBrief,
      generationScopePlan,
      refs: {
        canonicalBrief: { artifactKind: 'canonical_game_brief', path: 'canonical_game_brief.json', contentHash: canonicalBrief.contentHash },
        generationScopePlan: { artifactKind: 'generation_scope_plan', path: 'generation_scope_plan.json' }
      },
      rawDslConsumption: {
        mode: 'complete_active_profile_lock',
        canonicalBriefRef: { artifactKind: 'canonical_game_brief', path: 'canonical_game_brief.json', contentHash: canonicalBrief.contentHash }
      },
      bundleHash: expect.stringMatching(/^fnv1a_[0-9a-f]{8}$/)
    });
    expect(dslConsumptionReport.authorityBundleRef).toEqual({
      artifactKind: 'authority_bundle',
      path: 'authority_bundle.json',
      bundleHash: authorityBundle.bundleHash
    });
    expect(receipt.artifactRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ artifactKind: 'canonical_game_brief', path: 'canonical_game_brief.json' }),
        expect.objectContaining({ artifactKind: 'generation_scope_plan', path: 'generation_scope_plan.json' }),
        expect.objectContaining({ artifactKind: 'authority_bundle', path: 'authority_bundle.json' })
      ])
    );
    expect(index.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'canonicalGameBrief', status: 'present', path: 'canonical_game_brief.json', required: true }),
        expect.objectContaining({ id: 'generationScopePlan', status: 'present', path: 'generation_scope_plan.json', required: true }),
        expect.objectContaining({ id: 'authorityBundle', status: 'present', path: 'authority_bundle.json', required: true })
      ])
    );
  });

  it('requires active profile lock and scope as behavior-driving inputs on supported production success', async () => {
    const rawDsl = RawGameDslSchema.parse(createShooterRawDsl());
    const briefV02: GameBriefV02 = {
      brief_version: 'game-brief-v0.1',
      schema_version: '0.2',
      title: 'Scoped Alien Clear',
      genre: 'shooter',
      camera: 'top_down',
      core_loop: ['Move around the arena.', 'Fire projectiles at enemies.', 'Clear enemies to win.'],
      difficulty: 'normal',
      play_time_intent: { mode: 'target', target_sec: 45 }
    };
    let rawDslAuthorityBundle: unknown;
    let compileAuthorityBundle: unknown;
    let qaTimeoutMs: number | undefined;
    const pipeline = createPipeline({
      modelProvider: {
        async generateGameBrief() {
          return {
            ok: true,
            value: briefV02,
            rawText: JSON.stringify(briefV02),
            rawOutputPath: workspace.getModelOutputPath(projectId, runId, 'game-brief.raw.json'),
            sourceFormat: 'v0.2' as const
          };
        },
        async generateRawGameDsl(input) {
          rawDslAuthorityBundle = input.authorityBundle;
          return {
            ok: true,
            value: rawDsl,
            rawText: JSON.stringify(rawDsl),
            rawOutputPath: workspace.getModelOutputPath(projectId, runId, 'raw-game-dsl.raw.json')
          };
        }
      },
      compiler: {
        async compile(input) {
          compileAuthorityBundle = input.authorityBundle;
          return compileWithDist();
        }
      },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input) {
          qaTimeoutMs = input.timeoutMs;
          return createQaReport(input.genre, {}, input.expectedRuntimeAuthority);
        }
      }
    });

    await expect(runPipeline(pipeline, { idea: 'cat shooter for 45 seconds', language: 'en' })).resolves.toBe('PLAYABLE');

    const activeProfileLock = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'active_profile_lock.json'), 'utf8'));
    const generationScopePlan = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_scope_plan.json'), 'utf8'));
    const authorityBundle = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'authority_bundle.json'), 'utf8'));
    const receipt = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_path_receipt.json'), 'utf8'));

    expect(activeProfileLock).toMatchObject({
      artifactKind: 'active_profile_lock',
      schemaVersion: 'step37.active-profile-lock.v1',
      projectId,
      runId,
      profileId: 'shooter.v1',
      runtimeGenre: 'top_down_shooter',
      selectedPath: 'capability_composed_v1',
      legacyAdapterPolicy: 'legacy_forbidden'
    });
    expect(rawDslAuthorityBundle).toEqual(authorityBundle);
    expect(compileAuthorityBundle).toEqual(authorityBundle);
    expect(authorityBundle).toMatchObject({
      activeProfileLock,
      generationScopePlan,
      rawDslConsumption: {
        mode: 'complete_active_profile_lock',
        activeProfileLockRef: {
          artifactKind: 'active_profile_lock',
          path: 'active_profile_lock.json',
          lockHash: activeProfileLock.lockHash
        }
      }
    });
    expect(qaTimeoutMs).toBe(generationScopePlan.qaProbeWindowSec * 1000);
    expect(receipt).toMatchObject({
      selectedPath: 'capability_composed_v1',
      targetPath: 'capability_composed_v1',
      profileId: 'shooter.v1',
      capabilityReadiness: 'ready'
    });
    expect(receipt.artifactRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ artifactKind: 'active_profile_lock', path: 'active_profile_lock.json' }),
        expect.objectContaining({ artifactKind: 'generation_scope_plan', path: 'generation_scope_plan.json' }),
        expect.objectContaining({ artifactKind: 'authority_bundle', path: 'authority_bundle.json' })
      ])
    );
  });

  it('fails closed when a QA report claims PASSED runtime authority for the wrong lock hash', async () => {
    const pipeline = createPipeline({
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre; expectedRuntimeAuthority?: QaRuntimeAuthorityExpectation }) {
          const report = createQaReport(input.genre, {}, input.expectedRuntimeAuthority);
          if (input.expectedRuntimeAuthority === undefined) {
            return report;
          }
          return {
            ...report,
            runtime_authority: {
              status: 'PASSED' as const,
              expected: input.expectedRuntimeAuthority,
              observed: {
                ...input.expectedRuntimeAuthority,
                activeProfileLockRef: {
                  ...input.expectedRuntimeAuthority.activeProfileLockRef,
                  lockHash: 'fnv1a_bad00000'
                }
              },
              mismatches: []
            }
          };
        }
      }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('QA_FAILED');
    await expect(readQaReport()).resolves.toMatchObject({
      status: 'QA_FAILED',
      code: 'RUNTIME_AUTHORITY_MISMATCH',
      runtime_authority: {
        status: 'FAILED',
        mismatches: expect.arrayContaining([
          expect.stringContaining('observed.activeProfileLockRef.lockHash')
        ])
      }
    });
    const cutover = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_capability_cutover_report.json'), 'utf8'));
    expect(cutover).toMatchObject({
      defaultCutoverAllowed: false,
      cutoverStage: 'blocked_by_gap'
    });
  });

  it('keeps canonical GameBrief and scope evidence when Raw DSL generation fails after canonicalization', async () => {
    const briefV02: GameBriefV02 = {
      brief_version: 'game-brief-v0.1',
      schema_version: '0.2',
      title: 'Blocked Alien Clear',
      genre: 'shooter',
      camera: 'top_down',
      core_loop: ['Move around the arena.', 'Fire projectiles at enemies.', 'Clear enemies to win.'],
      difficulty: 'normal',
      play_time_intent: { mode: 'target', target_sec: 90 }
    };
    let compileRuns = 0;
    const pipeline = createPipeline({
      modelProvider: {
        async generateGameBrief() {
          return {
            ok: true,
            value: briefV02,
            rawText: JSON.stringify(briefV02),
            rawOutputPath: workspace.getModelOutputPath(projectId, runId, 'game-brief.raw.json'),
            sourceFormat: 'v0.2' as const
          };
        },
        async generateRawGameDsl() {
          return {
            ok: false,
            code: 'MODEL_SCHEMA_VALIDATION_FAILED',
            message: 'Raw DSL schema validation failed.',
            issues: ['raw DSL invalid']
          };
        }
      },
      compiler: {
        async compile() {
          compileRuns += 1;
          return compileWithDist();
        }
      }
    });

    await expect(runPipeline(pipeline, { idea: 'cat shooter for 90 seconds', language: 'en' })).resolves.toBe('FAILED');
    expect(compileRuns).toBe(0);

    const canonicalBrief = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'canonical_game_brief.json'), 'utf8'));
    const generationScopePlan = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_scope_plan.json'), 'utf8'));
    const receipt = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_path_receipt.json'), 'utf8'));
    const index = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_artifact_index.json'), 'utf8'));

    expect(canonicalBrief).toMatchObject({ artifactKind: 'canonical_game_brief', projectId, runId, canonicalBrief: briefV02 });
    expect(generationScopePlan).toMatchObject({ schemaVersion: 'step37.generation-scope-plan.v1', requestedPlayTime: briefV02.play_time_intent });
    expect(receipt).toMatchObject({
      selectedPath: 'fail_closed_model_generation_failed',
      dslSource: 'not_generated',
      modelFailureCode: 'MODEL_SCHEMA_VALIDATION_FAILED'
    });
    expect(receipt.artifactRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ artifactKind: 'canonical_game_brief', path: 'canonical_game_brief.json' }),
        expect.objectContaining({ artifactKind: 'generation_scope_plan', path: 'generation_scope_plan.json' })
      ])
    );
    expect(index.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'canonicalGameBrief', status: 'present', path: 'canonical_game_brief.json' }),
        expect.objectContaining({ id: 'generationScopePlan', status: 'present', path: 'generation_scope_plan.json' }),
        expect.objectContaining({ id: 'gameDsl', status: 'skipped', reason: 'model_generation_failed_before_dsl' })
      ])
    );
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'raw-game-dsl.raw.json'), 'utf8')).rejects.toThrow();
  });

  it('routes supported side-scrolling run-and-gun prompts through compile, build, and QA', async () => {
    const rawDsl = RawGameDslSchema.parse(createSideScrollingRunAndGunRawDsl());
    let compiledTemplateId: string | undefined;
    let qaGenre: QaGenre | undefined;
    let qaCapabilityRuntimeExpectation: QaCapabilityRuntimeExpectation | undefined;
    const pipeline = createPipeline({
      modelProvider: createModelProviderForRawDsl(rawDsl),
      compiler: {
        async compile(input) {
          compiledTemplateId = input.ir.template_params.template_id;
          expect(input.ir.runtime_plan.side_scrolling).toBeDefined();
          return {
            ok: true,
            projectId,
            outputDir: workspace.getGeneratedProjectDir(projectId),
            distDir: workspace.getGeneratedProjectDistDir(projectId),
            templateId: 'side_scrolling_run_and_gun.v1',
            files: [
              'side_scrolling_run_and_gun/src/asset-manifest.generated.json',
              'side_scrolling_run_and_gun/src/runtime-plan.generated.json'
            ]
          };
        }
      },
      buildRunner: {
        async build() {
          const distDir = workspace.getGeneratedProjectDistDir(projectId);
          await mkdir(distDir, { recursive: true });
          await writeFile(join(distDir, 'index.html'), '<html></html>', 'utf8');
          return { ok: true, projectId, distDir, logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: {
          genre: QaGenre;
          expectedRuntimeAuthority?: QaRuntimeAuthorityExpectation;
          expectedCapabilityRuntime?: QaCapabilityRuntimeExpectation;
        }) {
          qaGenre = input.genre;
          qaCapabilityRuntimeExpectation = input.expectedCapabilityRuntime;
          return createQaReport(input.genre, {}, input.expectedRuntimeAuthority);
        }
      }
    });

    await expect(runPipeline(pipeline, { idea: '横版跑枪打外星人', language: 'zh' })).resolves.toBe('PLAYABLE');

    const intentPlan = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'intent_plan.json'), 'utf8'));
    const runtimeCapabilityReport = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'runtime_capability_report.json'), 'utf8'));
    const index = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_artifact_index.json'), 'utf8'));
    expect(compiledTemplateId).toBe('side_scrolling_run_and_gun.v1');
    expect(qaGenre).toBe('side_scrolling_run_and_gun');
    expect(qaCapabilityRuntimeExpectation).toEqual({
      requiredProbes: expect.arrayContaining([
        {
          capabilityId: 'combat.projectile.v1',
          probeId: 'combat.projectile.v1.spawn.browser_qa.v1',
          action: 'fire',
          eventType: 'projectile.spawned'
        },
        {
          capabilityId: 'movement.run_jump.v1',
          probeId: 'movement.run_jump.v1.jump.browser_qa.v1',
          action: 'jump',
          eventType: 'player.jumped'
        },
        {
          capabilityId: 'weapon.default_straight_single.v1',
          probeId: 'weapon.default_straight_single.v1.fire.browser_qa.v1',
          action: 'fire',
          eventType: 'player.fired'
        }
      ])
    });
    expect(qaCapabilityRuntimeExpectation?.requiredProbes).toHaveLength(3);
    expect(intentPlan).toMatchObject({
      normalizedGenre: 'side_scrolling_run_and_gun',
      runtimeDslSupport: 'supported',
      runtimeTemplateId: 'phaser/side_scrolling_run_and_gun.v1',
      qaProfile: 'side_scrolling_run_and_gun_smoke',
      unsupportedCapabilities: []
    });
    expect(runtimeCapabilityReport).toMatchObject({
      status: 'supported',
      runtimeSupportStatus: 'supported',
      runtimeTemplateId: 'phaser/side_scrolling_run_and_gun.v1',
      qaProfile: 'side_scrolling_run_and_gun_smoke',
      selectedAdapterId: 'side_scrolling_run_and_gun.phaser.v1',
      liveEditCapabilities: {
        hot: expect.arrayContaining(['/player/physics/maxSpeed', '/enemyTypes/*/health/max', '/projectiles/*/damage']),
        assetSwap: [],
        warmRestart: expect.arrayContaining(['/player/label', '/enemyTypes/*/label', '/level/waves/*/count', '/world/width']),
        rebuildRequired: expect.arrayContaining(['/genre', '/world/coordinateSystem'])
      }
    });
    expect(index.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'phaserPreviewManifest', path: 'side_scrolling_run_and_gun/src/asset-manifest.generated.json' })
      ])
    );
  });

  it('writes a pipeline artifact index for the valid generation path without stale or absolute refs', async () => {
    const rawDsl = RawGameDslSchema.parse(createShooterRawDsl());
    const pipeline = createPipeline({
      modelProvider: createModelProviderForRawDsl(rawDsl),
      compiler: { compile: compileWithArtifactFiles },
      buildRunner: {
        async build() {
          await writeTextFile(workspace.getBuildLogPath(projectId, runId), 'vite build ok');
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      }
    });

    await expect(runPipeline(pipeline, { idea: '小猫大战坦克', language: 'zh' })).resolves.toBe('PLAYABLE');

    const index = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_artifact_index.json'), 'utf8'));
    expect(index).toMatchObject({
      indexVersion: 'pipeline-artifact-index-v0.1',
      projectId,
      runId,
      artifacts: expect.arrayContaining([
        expect.objectContaining({ id: 'gameDsl', status: 'present', path: 'game_dsl.json' }),
        expect.objectContaining({ id: 'generationInputReport', status: 'present', path: 'generation_input_report.json' }),
        expect.objectContaining({ id: 'generationCapabilityResolutionReport', status: 'present', path: 'generation_capability_resolution_report.json' }),
        expect.objectContaining({ id: 'shadowGameplayCapabilityLock', status: 'skipped', path: 'shadow_gameplay_capability_lock.json' }),
        expect.objectContaining({ id: 'generationCapabilityRuntimeReport', status: 'present', path: 'generation_capability_runtime_report.json' }),
        expect.objectContaining({ id: 'generationCapabilityGapReport', status: 'present', path: 'generation_capability_gap_report.json' }),
        expect.objectContaining({ id: 'generationCapabilityCutoverReport', status: 'present', path: 'generation_capability_cutover_report.json' }),
        expect.objectContaining({ id: 'shadowRuntimeSystemManifest', status: 'skipped', path: 'shadow_phaser_runtime_system_manifest.json' }),
        expect.objectContaining({ id: 'shadowRuntimeLoaderReport', status: 'skipped', path: 'shadow_phaser_runtime_loader_report.json' }),
        expect.objectContaining({ id: 'shadowCapabilityQaPlan', status: 'skipped', path: 'shadow_capability_qa_plan.json' }),
        expect.objectContaining({ id: 'shadowCapabilityQaReport', status: 'skipped', path: 'shadow_capability_qa_report.json' }),
        expect.objectContaining({ id: 'dslValidationReport', status: 'present', path: 'dsl_validation_report.json' }),
        expect.objectContaining({ id: 'runtimeCapabilityReport', status: 'present', path: 'runtime_capability_report.json' }),
        expect.objectContaining({ id: 'assetPlan', status: 'present', path: 'asset_plan.json' }),
        expect.objectContaining({ id: 'publicAssetManifest', status: 'present', path: 'public/asset_manifest.json' }),
        expect.objectContaining({ id: 'phaserPreviewManifest', status: 'present', path: 'shooter/src/asset-manifest.generated.json' }),
        expect.objectContaining({ id: 'assetResolutionReport', status: 'present', path: 'asset_resolution_report.json' }),
        expect.objectContaining({ id: 'assetPipelineReport', status: 'present', path: 'asset_pipeline_report.json' }),
        expect.objectContaining({ id: 'assetLibraryUsageReport', status: 'present', path: 'asset_library_usage_report.json' }),
        expect.objectContaining({ id: 'buildLog', status: 'present', artifactRoot: 'build-log' }),
        expect.objectContaining({ id: 'qaReport', status: 'present', artifactRoot: 'qa-report' }),
        expect.objectContaining({ id: 'pipelineArtifactIndex', status: 'present', path: 'pipeline_artifact_index.json' })
      ])
    });
    expect(JSON.stringify(index)).not.toContain(root);
    expect(JSON.stringify(index)).not.toContain('stale_asset_pipeline_report');
  });

  it('writes game_dsl.candidate.json and blocks downstream steps when artifact validation fails', async () => {
    const rawDsl = {
      ...RawGameDslSchema.parse(createShooterRawDsl()),
      player: {
        ...createShooterRawDsl().player,
        actions: [{ id: 'fire', type: 'shoot_projectile', cooldown_ms: 300, spawns: 'ghost_projectile' }]
      }
    } as RawGameDsl;
    let compileRuns = 0;
    await mkdir(workspace.getGeneratedProjectDir(projectId), { recursive: true });
    await writeFile(join(workspace.getGeneratedProjectDir(projectId), 'asset_pipeline_report.json'), 'stale_asset_pipeline_report', 'utf8');
    await writeFile(join(workspace.getGeneratedProjectDir(projectId), 'asset_library_usage_report.json'), 'stale_asset_library_usage_report', 'utf8');
    const pipeline = createPipeline({
      modelProvider: createModelProviderForRawDsl(rawDsl),
      compiler: {
        async compile() {
          compileRuns += 1;
          return compileResult();
        }
      },
      buildRunner: {
        async build() {
          throw new Error('invalid DSL should not build');
        }
      }
    });

    await expect(runPipeline(pipeline, { idea: '小猫大战坦克', language: 'zh' })).resolves.toBe('DSL_VALIDATION_FAILED');
    expect(compileRuns).toBe(0);

    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'game_dsl.json'), 'utf8')).rejects.toThrow();
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'runtime_capability_report.json'), 'utf8')).rejects.toThrow();
    const candidate = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'game_dsl.candidate.json'), 'utf8'));
    const generationInputReport = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_input_report.json'), 'utf8'));
    const validationReport = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'dsl_validation_report.json'), 'utf8'));
    const index = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_artifact_index.json'), 'utf8'));
    const acceptance = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_acceptance_report.json'), 'utf8'));
    expect(generationInputReport).toMatchObject({
      reportVersion: 'generation_input_report.v1',
      projectId,
      runId,
      source: 'manual',
      effectivePrompt: '小猫大战坦克'
    });
    expect(candidate).toMatchObject({
      artifactKind: 'game_dsl',
      schemaVersion: 'game_dsl.v1',
      player: { actions: [expect.objectContaining({ projectileRef: 'ghost_projectile' })] }
    });
    expect(validationReport).toMatchObject({
      sourceArtifact: 'game_dsl.candidate.json',
      status: 'invalid',
      valid: false,
      errorCount: expect.any(Number),
      errors: expect.arrayContaining([
        expect.objectContaining({ code: 'UNRESOLVED_REFERENCE', path: 'sourceDsl.player.actions.0.spawns' }),
        expect.objectContaining({ code: 'UNRESOLVED_PROJECTILE_REFERENCE' })
      ])
    });
    expect(index).toMatchObject({
      projectId,
      runId,
      artifacts: expect.arrayContaining([
        expect.objectContaining({ id: 'gameDslCandidate', status: 'present', path: 'game_dsl.candidate.json' }),
        expect.objectContaining({ id: 'generationInputReport', status: 'present', path: 'generation_input_report.json' }),
        expect.objectContaining({ id: 'dslValidationReport', status: 'present', path: 'dsl_validation_report.json' }),
        expect.objectContaining({ id: 'runtimeCapabilityReport', status: 'skipped', reason: 'dsl_validation_failed_before_runtime_capability' }),
        expect.objectContaining({ id: 'assetPipelineReport', status: 'skipped', reason: 'dsl_validation_failed_before_compile' }),
        expect.objectContaining({ id: 'assetLibraryUsageReport', status: 'skipped', reason: 'dsl_validation_failed_before_compile' }),
        expect.objectContaining({ id: 'pipelineAcceptanceReport', status: 'present', path: 'pipeline_acceptance_report.json' }),
        expect.objectContaining({ id: 'pipelineArtifactIndex', status: 'present', path: 'pipeline_artifact_index.json' })
      ])
    });
    expect(acceptance).toMatchObject({
      projectId,
      runId,
      overallStatus: 'fail',
      previewable: false,
      checks: expect.arrayContaining([
        expect.objectContaining({ id: 'dsl_validation', status: 'fail', reason: 'DSL validation report is invalid.' }),
        expect.objectContaining({ id: 'asset_pipeline', status: 'skipped', reason: 'dsl_validation_failed_before_compile' })
      ])
    });
    expect(JSON.stringify(index)).not.toContain('stale_asset_pipeline_report');
    expect(JSON.stringify(acceptance)).not.toContain('stale_asset_pipeline_report');
    expect(JSON.stringify(index)).not.toContain('stale_asset_library_usage_report');
    expect(JSON.stringify(acceptance)).not.toContain('stale_asset_library_usage_report');
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ status: 'DSL_VALIDATION_FAILED' });
  });

  it('writes acceptance evidence when raw DSL normalization fails after artifact generation', async () => {
    const rawDsl = {
      ...RawGameDslSchema.parse(createShooterRawDsl()),
      player: {
        ...createShooterRawDsl().player,
        actions: [{ id: 'fire', type: 'shoot_projectile', cooldown_ms: 300, spawns: 'ghost_projectile' }]
      }
    } as RawGameDsl;
    const artifact = buildGameDslArtifact({
      rawDsl,
      runId,
      intentPlan: { normalizedGenre: 'top_down_shooter' }
    });
    let compileRuns = 0;
    const pipeline = createPipeline({
      compiler: {
        async compile() {
          compileRuns += 1;
          return compileResult();
        }
      }
    });
    Object.defineProperty(pipeline, 'generateRawDsl', {
      value: async () => ({ ok: true, artifact, dslSource: 'model_provider' }),
      configurable: true
    });

    await expect(runPipeline(pipeline)).resolves.toBe('DSL_VALIDATION_FAILED');
    expect(compileRuns).toBe(0);
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_acceptance_report.json'), 'utf8')).resolves.toContain('"overallStatus": "fail"');

    const validationReport = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'dsl_validation_report.json'), 'utf8'));
    const generationPathReceipt = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_path_receipt.json'), 'utf8'));
    const index = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_artifact_index.json'), 'utf8'));
    const acceptance = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_acceptance_report.json'), 'utf8'));
    expect(generationPathReceipt).toMatchObject({
      selectedPath: 'fail_closed_invalid_dsl',
      dslSource: 'model_provider'
    });
    expect(validationReport).toMatchObject({
      sourceArtifact: 'game_dsl.json',
      status: 'invalid',
      valid: false,
      errors: expect.arrayContaining([expect.objectContaining({ code: 'UNRESOLVED_REFERENCE', path: 'sourceDsl.player.actions.0.spawns' })])
    });
    expect(index.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'gameDsl', status: 'present', path: 'game_dsl.json' }),
        expect.objectContaining({ id: 'gameDslCandidate', status: 'skipped', reason: 'invalid_dsl_path_uses_game_dsl_json' }),
        expect.objectContaining({ id: 'runtimeCapabilityReport', status: 'present', path: 'runtime_capability_report.json' }),
        expect.objectContaining({ id: 'pipelineAcceptanceReport', status: 'present', path: 'pipeline_acceptance_report.json' }),
        expect.objectContaining({ id: 'assetPipelineReport', status: 'skipped', reason: 'dsl_validation_failed_before_compile' }),
        expect.objectContaining({ id: 'assetLibraryUsageReport', status: 'skipped', reason: 'dsl_validation_failed_before_compile' })
      ])
    );
    expect(acceptance).toMatchObject({
      overallStatus: 'fail',
      previewable: false,
      checks: expect.arrayContaining([
        expect.objectContaining({ id: 'dsl_validation', status: 'fail' }),
        expect.objectContaining({ id: 'dsl_artifact', status: 'fail', artifactId: 'gameDsl', artifactPath: 'game_dsl.json' }),
        expect.objectContaining({ id: 'asset_library_usage', status: 'skipped', reason: 'dsl_validation_failed_before_compile' })
      ])
    });
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'game_dsl.candidate.json'), 'utf8')).rejects.toThrow();
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'runtime_capability_report.json'), 'utf8')).resolves.toContain('"status": "supported"');
  });

  it.each([
    ['飞机大战', 'vertical_shooter', 'vertical_scroll_camera'],
    ['马里奥式平台跳跃', 'side_scrolling_platformer', 'gravity_platformer_physics'],
    ['平台跳跃', 'side_scrolling_platformer', 'gravity_platformer_physics']
  ] as const)(
    'returns explicit unsupported capabilities for normalized genres outside the current runtime DSL envelope: %s',
    async (idea, normalizedGenre, expectedCapability) => {
      await resetStores();
      const pipeline = createPipeline({
        modelProvider: {
          async generateGameBrief() {
            throw new Error('unsupported intent should not request a Game Brief');
          },
          async generateRawGameDsl() {
            throw new Error('unsupported intent should not request Raw DSL');
          }
        }
      });

      await expect(runPipeline(pipeline, { idea, language: 'zh' })).resolves.toBe('RUNTIME_UNSUPPORTED');

      const intentPlan = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'intent_plan.json'), 'utf8'));
      expect(intentPlan).toMatchObject({
        normalizedGenre,
        runtimeDslSupport: 'unsupported',
        unsupportedCapabilities: expect.arrayContaining([expectedCapability])
      });
      await expectUnsupportedIntentArtifacts({
        normalizedGenre,
        expectedCapability,
        expectedRuntimeSupportStatus: 'unsupported'
      });
      await expect(runStore.readEvents(runId)).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'intent.planned', message: `Intent normalized to ${normalizedGenre}.` }),
          expect.objectContaining({ type: 'runtime.unsupported', message: expect.stringContaining(expectedCapability) })
        ])
      );
    }
  );

  it('returns explicit unsupported capabilities for unrecognized prompts instead of downgrading to shooter', async () => {
    const pipeline = createPipeline({
      modelProvider: {
        async generateGameBrief() {
          throw new Error('unsupported intent should not request a Game Brief');
        },
        async generateRawGameDsl() {
          throw new Error('unsupported intent should not request Raw DSL');
        }
      }
    });

    await expect(runPipeline(pipeline, { idea: '做一个全新的二维游戏', language: 'zh' })).resolves.toBe('RUNTIME_UNSUPPORTED');

    const intentPlan = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'intent_plan.json'), 'utf8'));
    expect(intentPlan).toMatchObject({
      normalizedGenre: 'unrecognized_2d_genre',
      runtimeDslSupport: 'unsupported',
      unsupportedCapabilities: ['recognized_2d_genre']
    });
    await expectUnsupportedIntentArtifacts({
      normalizedGenre: 'unrecognized_2d_genre',
      expectedCapability: 'recognized_2d_genre',
      expectedRuntimeSupportStatus: 'unsupported'
    });
    await expect(runStore.readEvents(runId)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'intent.planned', message: 'Intent normalized to unrecognized_2d_genre.' }),
        expect.objectContaining({ type: 'runtime.unsupported', message: expect.stringContaining('recognized_2d_genre') })
      ])
    );
  });

  it('fails production generation instead of falling back when the model returns invalid DSL', async () => {
    const pipeline = createPipeline({
      modelProvider: {
        async generateGameBrief() {
          return { ok: false, code: 'MODEL_SCHEMA_VALIDATION_FAILED', message: 'Game Brief schema validation failed.', issues: ['genre invalid'] };
        },
        async generateRawGameDsl() {
          throw new Error('raw DSL should not be requested');
        }
      }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('FAILED');
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ status: 'FAILED' });
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'generation_path_receipt.json'), 'utf8')).resolves.toContain(
      '"selectedPath": "fail_closed_model_generation_failed"'
    );
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'generation_path_receipt.json'), 'utf8')).resolves.toContain(
      '"modelFailureCode": "MODEL_SCHEMA_VALIDATION_FAILED"'
    );
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_artifact_index.json'), 'utf8')).resolves.toContain('"generationPathReceipt"');
    await expect(runStore.readEvents(runId)).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ type: 'model.failed' })]));
  });

  it('records legacy DSL nonrepresentability as a DSL precondition block, not a model failure', async () => {
    const pipeline = createPipeline({
      modelProvider: {
        async generateGameBrief() {
          return {
            ok: true,
            value: {
              brief_version: 'game-brief-v0.1',
              schema_version: '0.2',
              title: 'Long Mission',
              genre: 'collector',
              camera: 'top_down',
              core_loop: ['move', 'collect', 'win'],
              difficulty: 'normal',
              play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 }
            },
            rawText: '{}',
            rawOutputPath: workspace.getModelOutputPath(projectId, runId, 'game-brief.raw.json')
          };
        },
        async generateRawGameDsl() {
          return {
            ok: false,
            code: 'LEGACY_DSL_NONREPRESENTABLE',
            message: 'Raw Game DSL v0.1 cannot preserve the requested play-time intent.',
            issues: ['legacy_representability: RANGE_PLAY_TIME_NOT_REPRESENTABLE']
          };
        }
      }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('FAILED');
    const receipt = await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_path_receipt.json'), 'utf8');
    expect(receipt).toContain('"selectedPath": "blocked"');
    expect(receipt).toContain('"targetPath": "capability_composed_v1"');
    expect(receipt).toContain('"legacyRepresentable": false');
    expect(receipt).toContain('"blocker": "CAPABILITY_COMPOSED_PATH_NOT_ACTIVE"');
    expect(receipt).not.toContain('modelFailureCode');

    const artifactIndex = await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_artifact_index.json'), 'utf8');
    expect(artifactIndex).toContain('dsl_precondition_blocked_before_dsl');
    expect(artifactIndex).toContain('dsl_precondition_blocked_before_compile');
    expect(artifactIndex).not.toContain('model_generation_failed');

    const acceptanceReport = await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_acceptance_report.json'), 'utf8');
    expect(acceptanceReport).toContain('dsl_precondition_blocked_before_dsl');
    expect(acceptanceReport).not.toContain('model_generation_failed');

    const events = await runStore.readEvents(runId);
    expect(events).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'dsl.blocked_precondition' })]));
    expect(events).not.toEqual(expect.arrayContaining([expect.objectContaining({ type: 'model.failed' })]));
  });

  it('maps missing dist/index.html to PREVIEW_ARTIFACT_MISSING', async () => {
    const pipeline = createPipeline({
      compiler: { compile: compileWithoutDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('PREVIEW_ARTIFACT_MISSING');
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ status: 'PREVIEW_ARTIFACT_MISSING' });
    await expect(runStore.readEvents(runId)).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ type: 'build.failed' })]));
  });

  it('refreshes the pipeline artifact index with a build log ref when build fails', async () => {
    const pipeline = createPipeline({
      compiler: { compile: compileWithArtifactFiles },
      buildRunner: {
        async build() {
          await writeTextFile(workspace.getBuildLogPath(projectId, runId), 'vite build failed');
          return { ok: false, projectId, logPath: workspace.getBuildLogPath(projectId, runId), message: 'build failed' };
        }
      }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('BUILD_FAILED');

    const index = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_artifact_index.json'), 'utf8'));
    const acceptance = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_acceptance_report.json'), 'utf8'));
    expect(index.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'buildLog', status: 'present', artifactRoot: 'build-log', path: `${runId}.log` }),
        expect.objectContaining({ id: 'qaReport', status: 'missing', reason: 'qa_report_not_available_yet' }),
        expect.objectContaining({ id: 'pipelineAcceptanceReport', status: 'present', path: 'pipeline_acceptance_report.json' })
      ])
    );
    expect(acceptance).toMatchObject({
      projectId,
      runId,
      overallStatus: 'pass',
      previewable: true,
      checks: expect.arrayContaining([
        expect.objectContaining({ id: 'build_log', status: 'pass' }),
        expect.objectContaining({ id: 'qa_report', status: 'skipped' })
      ])
    });
  });

  it('maps QA runner exceptions to QA_FAILED and writes a QA report', async () => {
    const pipeline = createPipeline({
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run() {
          throw new Error('browser launch failed');
        }
      }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('QA_FAILED');
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ status: 'QA_FAILED' });
    await expect(readFile(workspace.getQaReportPath(projectId, runId), 'utf8')).resolves.toContain('"code": "QA_RUNNER_FAILED"');
    await expect(runStore.readEvents(runId)).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ type: 'qa.failed' })]));
  });

  it('does not mark blank-preview visual QA failures as PLAYABLE', async () => {
    const pipeline = createPipeline({
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre; expectedRuntimeAuthority?: QaRuntimeAuthorityExpectation }) {
          return {
            status: 'QA_FAILED',
            runtime_status: 'FAILED',
            asset_semantic_status: 'PASSED',
            overall_status: 'QA_FAILED',
            visual_status: 'VISUAL_QA_FAILED',
            project_id: projectId,
            run_id: runId,
            genre: input.genre,
            preview_url: 'http://localhost/preview/index.html',
            seed: 'golden',
            required_events: { all: [], any_groups: [] },
            observed_events: ['game.ready', 'player.fired', 'projectile.spawned', 'enemy.hit', 'score.changed'],
            missing_events: [],
            missing_any_groups: [],
            console_errors: [],
            code: 'PREVIEW_BLANK_SCREEN',
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
          };
        }
      }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('QA_FAILED');
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ status: 'QA_FAILED' });
    await expect(runStore.readEvents(runId)).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ type: 'qa.failed', message: 'PREVIEW_BLANK_SCREEN' })]));
  });

  it('keeps project status PLAYABLE when runtime QA passes but asset semantic QA needs repair', async () => {
    let qaRuns = 0;
    const pipeline = createPipeline({
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre; expectedRuntimeAuthority?: QaRuntimeAuthorityExpectation }) {
          qaRuns += 1;
          return createQaReport(input.genre, {
            asset_semantic_status: 'FAILED',
            overall_status: 'NEEDS_ASSET_REPAIR'
          }, input.expectedRuntimeAuthority);
        }
      }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('PLAYABLE');
    expect(qaRuns).toBe(1);
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ status: 'PLAYABLE' });
    await expect(runStore.readEvents(runId)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'qa.passed' })])
    );
    await expect(runStore.readEvents(runId)).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'asset-repair.started' })])
    );
    await expect(readQaReport()).resolves.toMatchObject({
      asset_semantic_repair: {
        enabled: false,
        attempted: false,
        skippedReason: 'asset_semantic_repair_disabled',
        attemptCount: 0,
        maxAttempts: 1,
        beforeOverallStatus: 'NEEDS_ASSET_REPAIR',
        beforeAssetSemanticStatus: 'FAILED'
      }
    });
  });

  it('runs one semantic asset repair attempt behind the explicit flag and reruns QA once', async () => {
    const rawDsl = RawGameDslSchema.parse(createShooterRawDsl());
    let buildRuns = 0;
    let qaRuns = 0;
    const pipeline = createPipeline({
      modelProvider: createModelProviderForRawDsl(rawDsl),
      compiler: {
        async compile(input) {
          return await compileWithHardSemanticMismatchArtifacts(input.ir);
        }
      },
      buildRunner: {
        async build() {
          buildRuns += 1;
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre; expectedRuntimeAuthority?: QaRuntimeAuthorityExpectation }) {
          qaRuns += 1;
          if (qaRuns === 1) {
            return createQaReport(input.genre, {
              asset_semantic_status: 'FAILED',
              overall_status: 'NEEDS_ASSET_REPAIR'
            }, input.expectedRuntimeAuthority);
          }

          return createQaReport(input.genre, {
            overall_status: 'PLAYABLE_WITH_FALLBACK_ASSETS'
          }, input.expectedRuntimeAuthority);
        }
      },
      assetSemanticRepairConfig: { enabled: true, maxAttempts: 3 }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('PLAYABLE');

    expect(buildRuns).toBe(2);
    expect(qaRuns).toBe(2);
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ status: 'PLAYABLE' });
    const repairedReport = await readResolutionReport();
    expect(repairedReport.repair).toMatchObject({
      status: 'repaired',
      attempts: 1,
      maxAttempts: 1
    });
    expect(repairedReport.repair?.items.length).toBeGreaterThan(0);
    const repairedManifest = await readManifest(join(workspace.getGeneratedProjectPublicDir(projectId), 'asset_manifest.json'));
    expect(repairedManifest.assets.some((asset) => asset.semanticFit?.status === 'fallback_generated')).toBe(true);
    await expect(runStore.readEvents(runId)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'asset-repair.started' }),
        expect.objectContaining({ type: 'asset-repair.applied' }),
        expect.objectContaining({ type: 'qa.rerun.started' }),
        expect.objectContaining({ type: 'qa.passed' })
      ])
    );
    await expect(readQaReport()).resolves.toMatchObject({
      asset_semantic_repair: {
        enabled: true,
        attempted: true,
        attemptCount: 1,
        maxAttempts: 1,
        repairPlanTriggered: true,
        beforeOverallStatus: 'NEEDS_ASSET_REPAIR',
        beforeAssetSemanticStatus: 'FAILED',
        afterOverallStatus: 'PLAYABLE_WITH_FALLBACK_ASSETS',
        afterAssetSemanticStatus: 'PASSED',
        repairedRequirements: expect.arrayContaining([
          expect.objectContaining({
            requirementId: 'player',
            role: 'player_character',
            expectedConcept: 'cat',
            previousSource: 'local_asset_pack',
            previousSemanticFitStatus: 'mismatch',
            newSource: 'template_svg',
            newSemanticFitStatus: 'fallback_generated'
          })
        ])
      }
    });
  });

  it('does not repair fallback or warning playable statuses even when the flag is enabled', async () => {
    for (const report of [
      createQaReport('shooter', { overall_status: 'PLAYABLE_WITH_FALLBACK_ASSETS' }),
      createQaReport('shooter', { asset_semantic_status: 'WARNING', overall_status: 'PLAYABLE_WITH_ART_WARNINGS' }),
      createQaReport('shooter', { asset_semantic_status: 'FAILED', overall_status: 'PLAYABLE_WITH_FALLBACK_ASSETS' }),
      createQaReport('shooter', { asset_semantic_status: 'FAILED', overall_status: 'PLAYABLE_WITH_ART_WARNINGS' })
    ]) {
      await resetStores();
      let qaRuns = 0;
      const pipeline = createPipeline({
        compiler: { compile: compileWithDist },
        buildRunner: {
          async build() {
            return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
          }
        },
        qaRunner: {
          async run(input: { genre: QaGenre; expectedRuntimeAuthority?: QaRuntimeAuthorityExpectation }) {
            qaRuns += 1;
            return createQaReport(input.genre, {
              asset_semantic_status: report.asset_semantic_status,
              overall_status: report.overall_status
            }, input.expectedRuntimeAuthority);
          }
        },
        assetSemanticRepairConfig: { enabled: true, maxAttempts: 1 }
      });

      await expect(runPipeline(pipeline)).resolves.toBe('PLAYABLE');
      expect(qaRuns).toBe(1);
      await expect(runStore.readEvents(runId)).resolves.not.toEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'asset-repair.started' })])
      );
      await expect(readQaReport()).resolves.toMatchObject({
        asset_semantic_repair: {
          enabled: true,
          attempted: false,
          skippedReason: 'no_asset_semantic_repair_needed',
          attemptCount: 0,
          maxAttempts: 1,
          beforeOverallStatus: report.overall_status,
          beforeAssetSemanticStatus: report.asset_semantic_status
        }
      });
    }
  });

  it('does not repair runtime QA failures even when semantic fields are failed', async () => {
    let qaRuns = 0;
    const pipeline = createPipeline({
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre; expectedRuntimeAuthority?: QaRuntimeAuthorityExpectation }) {
          qaRuns += 1;
          return createQaReport(input.genre, {
            status: 'QA_FAILED',
            runtime_status: 'FAILED',
            asset_semantic_status: 'FAILED',
            overall_status: 'QA_FAILED',
            code: 'PREVIEW_BLANK_SCREEN'
          }, input.expectedRuntimeAuthority);
        }
      },
      assetSemanticRepairConfig: { enabled: true, maxAttempts: 1 }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('QA_FAILED');
    expect(qaRuns).toBe(1);
    await expect(runStore.readEvents(runId)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'qa.failed', message: 'PREVIEW_BLANK_SCREEN' })])
    );
    await expect(runStore.readEvents(runId)).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'asset-repair.started' })])
    );
    await expect(readQaReport()).resolves.toMatchObject({
      asset_semantic_repair: {
        enabled: true,
        attempted: false,
        skippedReason: 'runtime_failed_not_asset_semantic_repair',
        attemptCount: 0,
        maxAttempts: 1
      }
    });
  });

  it('does not repair asset load failures even when semantic fields are failed', async () => {
    let qaRuns = 0;
    const pipeline = createPipeline({
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre; expectedRuntimeAuthority?: QaRuntimeAuthorityExpectation }) {
          qaRuns += 1;
          return createQaReport(input.genre, {
            asset_semantic_status: 'FAILED',
            overall_status: 'NEEDS_ASSET_REPAIR',
            asset_report: {
              semantic_status: 'FAILED',
              required: ['player'],
              ready: ['player'],
              fallback_used: [],
              placeholder_used: [],
              missing: [],
              assets: [],
              semantic_issues: [],
              failures: [
                {
                  code: 'ASSET_LOAD_FAILED',
                  message: 'Runtime failed to load player asset.',
                  asset_ids: ['player'],
                  roles: ['player_character']
                }
              ]
            }
          }, input.expectedRuntimeAuthority);
        }
      },
      assetSemanticRepairConfig: { enabled: true, maxAttempts: 1 }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('PLAYABLE');
    expect(qaRuns).toBe(1);
    await expect(runStore.readEvents(runId)).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'asset-repair.started' })])
    );
    await expect(readQaReport()).resolves.toMatchObject({
      asset_semantic_repair: {
        enabled: true,
        attempted: false,
        skippedReason: 'runtime_asset_failure_not_asset_semantic_repair',
        attemptCount: 0,
        maxAttempts: 1
      }
    });
  });

  it('records no executable item when QA asks for repair without hard semantic evidence', async () => {
    const rawDsl = RawGameDslSchema.parse(createShooterRawDsl());
    let qaRuns = 0;
    const pipeline = createPipeline({
      modelProvider: createModelProviderForRawDsl(rawDsl),
      compiler: {
        async compile(input) {
          return await compileWithExactSemanticArtifacts(input.ir);
        }
      },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre; expectedRuntimeAuthority?: QaRuntimeAuthorityExpectation }) {
          qaRuns += 1;
          return createQaReport(input.genre, {
            asset_semantic_status: 'FAILED',
            overall_status: 'NEEDS_ASSET_REPAIR'
          }, input.expectedRuntimeAuthority);
        }
      },
      assetSemanticRepairConfig: { enabled: true, maxAttempts: 1 }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('PLAYABLE');
    expect(qaRuns).toBe(1);
    await expect(runStore.readEvents(runId)).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'asset-repair.started' })])
    );
    await expect(readQaReport()).resolves.toMatchObject({
      asset_semantic_repair: {
        enabled: true,
        attempted: false,
        skippedReason: 'no_executable_repair_items',
        repairPlanTriggered: true,
        executableItemCount: 0
      }
    });
  });

  it('records executor failures without rerunning QA', async () => {
    const rawDsl = RawGameDslSchema.parse(createShooterRawDsl());
    let qaRuns = 0;
    const pipeline = createPipeline({
      modelProvider: createModelProviderForRawDsl(rawDsl),
      compiler: {
        async compile(input) {
          return await compileWithHardSemanticMismatchArtifacts(input.ir, { assetPlanProjectId: 'proj_other' });
        }
      },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre; expectedRuntimeAuthority?: QaRuntimeAuthorityExpectation }) {
          qaRuns += 1;
          return createQaReport(input.genre, {
            asset_semantic_status: 'FAILED',
            overall_status: 'NEEDS_ASSET_REPAIR'
          }, input.expectedRuntimeAuthority);
        }
      },
      assetSemanticRepairConfig: { enabled: true, maxAttempts: 1 }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('PLAYABLE');
    expect(qaRuns).toBe(1);
    await expect(runStore.readEvents(runId)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'asset-repair.failed' })])
    );
    await expect(readQaReport()).resolves.toMatchObject({
      asset_semantic_repair: {
        enabled: true,
        attempted: true,
        skippedReason: 'repair_execution_failed',
        attemptCount: 1,
        failureReasons: [expect.stringContaining('Asset repair project identity mismatch')]
      }
    });
  });

  it('records rebuild failure after a successful repair without rerunning QA', async () => {
    const rawDsl = RawGameDslSchema.parse(createShooterRawDsl());
    let buildRuns = 0;
    let qaRuns = 0;
    const pipeline = createPipeline({
      modelProvider: createModelProviderForRawDsl(rawDsl),
      compiler: {
        async compile(input) {
          return await compileWithHardSemanticMismatchArtifacts(input.ir);
        }
      },
      buildRunner: {
        async build() {
          buildRuns += 1;
          if (buildRuns === 1) {
            return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
          }

          return { ok: false, projectId, logPath: workspace.getBuildLogPath(projectId, runId), message: 'repair rebuild failed' };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre; expectedRuntimeAuthority?: QaRuntimeAuthorityExpectation }) {
          qaRuns += 1;
          return createQaReport(input.genre, {
            asset_semantic_status: 'FAILED',
            overall_status: 'NEEDS_ASSET_REPAIR'
          }, input.expectedRuntimeAuthority);
        }
      },
      assetSemanticRepairConfig: { enabled: true, maxAttempts: 1 }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('BUILD_FAILED');
    expect(buildRuns).toBe(2);
    expect(qaRuns).toBe(1);
    await expect(readQaReport()).resolves.toMatchObject({
      asset_semantic_repair: {
        enabled: true,
        attempted: true,
        skippedReason: 'repair_rebuild_failed',
        attemptCount: 1,
        failureReasons: ['Repair build/preview ended with status BUILD_FAILED.']
      }
    });
    await expect(runStore.readRun(runId)).resolves.toMatchObject({
      status: 'BUILD_FAILED',
      steps: expect.arrayContaining([
        { name: 'build', status: 'FAILED' },
        { name: 'qa', status: 'DONE' }
      ])
    });
  });

  it('records force template fallback repair actions through pipeline metadata', async () => {
    const rawDsl = RawGameDslSchema.parse(createShooterRawDsl());
    let qaRuns = 0;
    const pipeline = createPipeline({
      modelProvider: createModelProviderForRawDsl(rawDsl),
      compiler: {
        async compile(input) {
          return await compileWithHardSemanticMismatchArtifacts(input.ir, { source: 'template_svg' });
        }
      },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre; expectedRuntimeAuthority?: QaRuntimeAuthorityExpectation }) {
          qaRuns += 1;
          return qaRuns === 1
            ? createQaReport(input.genre, {
                asset_semantic_status: 'FAILED',
                overall_status: 'NEEDS_ASSET_REPAIR'
              }, input.expectedRuntimeAuthority)
            : createQaReport(input.genre, {}, input.expectedRuntimeAuthority);
        }
      },
      assetSemanticRepairConfig: { enabled: true, maxAttempts: 1 }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('PLAYABLE');
    expect(qaRuns).toBe(2);
    await expect(readQaReport()).resolves.toMatchObject({
      asset_semantic_repair: {
        enabled: true,
        attempted: true,
        repairedRequirements: expect.arrayContaining([
          expect.objectContaining({
            requirementId: 'player',
            action: 'force_template_svg_fallback',
            previousSource: 'template_svg',
            newSource: 'template_svg',
            newSemanticFitStatus: 'fallback_generated'
          })
        ])
      }
    });
  });

  it('does not repair inconsistent QA_FAILED overall status', async () => {
    let qaRuns = 0;
    const pipeline = createPipeline({
      compiler: { compile: compileWithDist },
      buildRunner: {
        async build() {
          return { ok: true, projectId, distDir: workspace.getGeneratedProjectDistDir(projectId), logPath: workspace.getBuildLogPath(projectId, runId) };
        }
      },
      qaRunner: {
        async run(input: { genre: QaGenre; expectedRuntimeAuthority?: QaRuntimeAuthorityExpectation }) {
          qaRuns += 1;
          return createQaReport(input.genre, {
            asset_semantic_status: 'FAILED',
            overall_status: 'QA_FAILED'
          }, input.expectedRuntimeAuthority);
        }
      },
      assetSemanticRepairConfig: { enabled: true, maxAttempts: 1 }
    });

    await expect(runPipeline(pipeline)).resolves.toBe('PLAYABLE');
    expect(qaRuns).toBe(1);
    await expect(readQaReport()).resolves.toMatchObject({
      asset_semantic_repair: {
        enabled: true,
        attempted: false,
        skippedReason: 'runtime_failed_not_asset_semantic_repair'
      }
    });
  });

  function createPipeline(overrides: PipelineOverrides = {}): GenerationPipelineService {
    return new GenerationPipelineService(
      projectStore,
      runStore,
      workspace,
      overrides.modelProvider ?? createModelProviderForRawDsl(RawGameDslSchema.parse(createShooterRawDsl())),
      overrides.compiler ?? { compile: compileWithDist },
      overrides.buildRunner ?? {
        async build() {
          return { ok: false, projectId, logPath: workspace.getBuildLogPath(projectId, runId), message: 'build failed' };
        }
      },
      overrides.qaRunner ?? {
        async run(input: { genre: QaGenre; expectedRuntimeAuthority?: QaRuntimeAuthorityExpectation }) {
          return createQaReport(input.genre, {}, input.expectedRuntimeAuthority);
        }
      },
      overrides.assetSemanticRepairConfig ?? { enabled: false, maxAttempts: 1 }
    );
  }

  async function runPipeline(pipeline: GenerationPipelineService, input: Partial<{ idea: string; language: string }> = {}) {
    return await pipeline.run({ projectId, runId, idea: input.idea ?? 'cat shooter', language: input.language ?? 'en' });
  }

  async function expectUnsupportedIntentArtifacts(input: {
    normalizedGenre: string;
    expectedCapability: string;
    expectedRuntimeSupportStatus: string;
  }): Promise<void> {
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'game_dsl.json'), 'utf8')).rejects.toThrow();
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'dsl_validation_report.json'), 'utf8')).rejects.toThrow();
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'dsl_consumption_report.json'), 'utf8')).rejects.toThrow();

    const runtimeCapabilityReport = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'runtime_capability_report.json'), 'utf8'));
    const capabilityReadiness = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_capability_readiness_report.json'), 'utf8'));
    const capabilityResolution = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_capability_resolution_report.json'), 'utf8'));
    const capabilityRuntime = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_capability_runtime_report.json'), 'utf8'));
    const capabilityGap = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_capability_gap_report.json'), 'utf8'));
    const capabilityCutover = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'generation_capability_cutover_report.json'), 'utf8'));
    expect(runtimeCapabilityReport).toMatchObject({
      artifactKind: 'runtime_capability_report',
      schemaVersion: 'runtime_capability_report.v1',
      runId,
      intentPlanRef: { artifact: 'intent_plan.json', normalizedGenre: input.normalizedGenre },
      runtimeSupportStatus: input.expectedRuntimeSupportStatus,
      status: 'unsupported',
      requiredCapabilities: expect.arrayContaining([input.expectedCapability]),
      unsupportedCapabilities: expect.arrayContaining([
        expect.objectContaining({ capability: input.expectedCapability, path: 'intentPlan.normalizedGenre' })
      ]),
      liveEditCapabilities: { hot: [], assetSwap: [], warmRestart: [], rebuildRequired: [] }
    });
    expect(capabilityReadiness).toMatchObject({
      normalizedGenre: input.normalizedGenre,
      selectedDefaultPath: 'fail_closed_unsupported_intent',
      capabilityPathReadiness: 'blocked'
    });
    expect(capabilityResolution).toMatchObject({
      normalizedGenre: input.normalizedGenre,
      selectedPath: 'fail_closed_unsupported_intent',
      resolverAttempt: 'skipped_unsupported_intent',
      resolutionStatus: 'blocked',
      exactLockStatus: 'not_applicable_unsupported_intent',
      activeLockWritten: false
    });
    expect(capabilityRuntime).toMatchObject({
      normalizedGenre: input.normalizedGenre,
      selectedPath: 'fail_closed_unsupported_intent',
      runtimeManifestStatus: 'not_attempted_no_shadow_lock',
      runtimeLoaderStatus: 'not_attempted',
      capabilityQaPlanStatus: 'not_attempted',
      capabilityQaReportStatus: 'not_attempted',
      runtimeEvidenceStatus: 'not_attempted'
    });
    expect(capabilityGap).toMatchObject({
      normalizedGenre: input.normalizedGenre,
      selectedPath: 'fail_closed_unsupported_intent',
      capabilityPathGate: 'unsupported_intent_fail_closed',
      gapStatus: 'unsupported_intent',
      providerInvocationPolicy: 'unsupported_intent_not_sent_to_provider',
      step36EscalationStatus: 'not_applicable_unsupported_intent'
    });
    expect(capabilityCutover).toMatchObject({
      normalizedGenre: input.normalizedGenre,
      activeSelectedPath: 'fail_closed_unsupported_intent',
      cutoverStage: 'blocked_by_gap',
      candidateCanaryStatus: 'not_started_gap_blocked',
      parityStatus: 'not_comparable_gap_blocked',
      defaultCutoverAllowed: false
    });

    const index = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_artifact_index.json'), 'utf8'));
    const acceptance = JSON.parse(await readFile(workspace.getModelOutputPath(projectId, runId, 'pipeline_acceptance_report.json'), 'utf8'));

    expect(index).toMatchObject({
      projectId,
      runId,
      artifacts: expect.arrayContaining([
        expect.objectContaining({ id: 'intentPlan', status: 'present', path: 'intent_plan.json' }),
        expect.objectContaining({ id: 'capabilityRegistrySnapshot', status: 'present', path: 'capability_registry_snapshot.json' }),
        expect.objectContaining({ id: 'generationCapabilityReadinessReport', status: 'present', path: 'generation_capability_readiness_report.json' }),
        expect.objectContaining({ id: 'generationCapabilityResolutionReport', status: 'present', path: 'generation_capability_resolution_report.json' }),
        expect.objectContaining({ id: 'shadowGameplayCapabilityLock', status: 'skipped', path: 'shadow_gameplay_capability_lock.json' }),
        expect.objectContaining({ id: 'generationCapabilityRuntimeReport', status: 'present', path: 'generation_capability_runtime_report.json' }),
        expect.objectContaining({ id: 'generationCapabilityGapReport', status: 'present', path: 'generation_capability_gap_report.json' }),
        expect.objectContaining({ id: 'generationCapabilityCutoverReport', status: 'present', path: 'generation_capability_cutover_report.json' }),
        expect.objectContaining({ id: 'shadowRuntimeSystemManifest', status: 'skipped', path: 'shadow_phaser_runtime_system_manifest.json' }),
        expect.objectContaining({ id: 'shadowRuntimeLoaderReport', status: 'skipped', path: 'shadow_phaser_runtime_loader_report.json' }),
        expect.objectContaining({ id: 'shadowCapabilityQaPlan', status: 'skipped', path: 'shadow_capability_qa_plan.json' }),
        expect.objectContaining({ id: 'shadowCapabilityQaReport', status: 'skipped', path: 'shadow_capability_qa_report.json' }),
        expect.objectContaining({ id: 'runtimeCapabilityReport', status: 'present', path: 'runtime_capability_report.json' }),
        expect.objectContaining({ id: 'gameDsl', status: 'skipped', reason: 'runtime_unsupported_before_dsl_generation' }),
        expect.objectContaining({ id: 'dslValidationReport', status: 'skipped', reason: 'runtime_unsupported_before_dsl_validation' }),
        expect.objectContaining({ id: 'dslConsumptionReport', status: 'skipped', reason: 'runtime_unsupported_before_consumption_audit' }),
        expect.objectContaining({ id: 'phaserPreviewManifest', status: 'skipped', reason: 'runtime_unsupported_before_compile' }),
        expect.objectContaining({ id: 'qaReport', status: 'skipped', reason: 'runtime_unsupported_before_qa' }),
        expect.objectContaining({ id: 'pipelineAcceptanceReport', status: 'present', path: 'pipeline_acceptance_report.json' }),
        expect.objectContaining({ id: 'pipelineArtifactIndex', status: 'present', path: 'pipeline_artifact_index.json' })
      ])
    });
    expect(acceptance).toMatchObject({
      projectId,
      runId,
      overallStatus: 'fail',
      previewable: false,
      checks: expect.arrayContaining([
        expect.objectContaining({ id: 'runtime_capability', status: 'fail', reason: 'runtime_capability_report.json status is unsupported.' }),
        expect.objectContaining({ id: 'dsl_validation', status: 'skipped', reason: 'runtime_unsupported_before_dsl_validation' }),
        expect.objectContaining({ id: 'dsl_artifact', status: 'skipped', reason: 'runtime_unsupported_before_dsl_generation' }),
        expect.objectContaining({ id: 'dsl_consumption', status: 'skipped', reason: 'runtime_unsupported_before_consumption_audit' }),
        expect.objectContaining({ id: 'preview_manifest', status: 'skipped', reason: 'runtime_unsupported_before_compile' })
      ])
    });
    if (input.normalizedGenre !== 'side_scrolling_run_and_gun') {
      expect(index.artifacts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'phaserPreviewManifest', path: 'runtime_unsupported/src/asset-manifest.generated.json' })
        ])
      );
    }
  }

  async function compileWithDist(): Promise<RuntimeCompileResult> {
    const distDir = workspace.getGeneratedProjectDistDir(projectId);
    await mkdir(distDir, { recursive: true });
    await writeFile(join(distDir, 'index.html'), '<html></html>', 'utf8');
    return compileResult();
  }

  async function compileWithArtifactFiles(input: { ir: NormalizedGameIr }): Promise<RuntimeCompileResult> {
    const distDir = workspace.getGeneratedProjectDistDir(projectId);
    await mkdir(distDir, { recursive: true });
    await writeFile(join(distDir, 'index.html'), '<html></html>', 'utf8');
    await writePassingAssetArtifacts(buildAssetPlanFromIr(projectId, input.ir));
    await writeAssetLibraryUsageReportFixture();
    await writeAssetBindingTraceReportFixture();
    await writeTextFile(join(workspace.getGeneratedProjectDir(projectId), 'semantic_extraction_trace_report.json'), '{}');
    await writeTextFile(join(workspace.getGeneratedProjectDir(projectId), 'semantic_model_report.json'), '{}');
    return compileResult([
      'asset_intent_manifest.json',
      'asset_plan.json',
      'public/asset_manifest.json',
      'asset_resolution_report.json',
      'shooter/src/asset-manifest.generated.json',
      'asset_pipeline_report.json',
      'asset_library_usage_report.json',
      'asset_binding_trace_report.json',
      'semantic_extraction_trace_report.json',
      'semantic_model_report.json',
      'pipeline_artifact_index.json'
    ]);
  }

  async function compileWithHardSemanticMismatchArtifacts(
    ir: NormalizedGameIr,
    options: { source?: 'local_asset_pack' | 'template_svg'; assetPlanProjectId?: string } = {}
  ): Promise<RuntimeCompileResult> {
    const distDir = workspace.getGeneratedProjectDistDir(projectId);
    await mkdir(distDir, { recursive: true });
    await writeFile(join(distDir, 'index.html'), '<html></html>', 'utf8');
    await writeHardSemanticMismatchArtifacts(buildAssetPlanFromIr(projectId, ir), options);
    return compileResult();
  }

  async function compileWithExactSemanticArtifacts(ir: NormalizedGameIr): Promise<RuntimeCompileResult> {
    const distDir = workspace.getGeneratedProjectDistDir(projectId);
    await mkdir(distDir, { recursive: true });
    await writeFile(join(distDir, 'index.html'), '<html></html>', 'utf8');
    await writeExactSemanticArtifacts(buildAssetPlanFromIr(projectId, ir));
    return compileResult();
  }

  async function compileWithoutDist(): Promise<RuntimeCompileResult> {
    await mkdir(workspace.getGeneratedProjectDir(projectId), { recursive: true });
    return compileResult();
  }

  function compileResult(files: string[] = []): RuntimeCompileResult {
    return {
      ok: true,
      projectId,
      outputDir: workspace.getGeneratedProjectDir(projectId),
      distDir: workspace.getGeneratedProjectDistDir(projectId),
      templateId: 'shooter_v1',
      files
    };
  }

  async function writePassingAssetArtifacts(plan: AssetPlan): Promise<void> {
    const outputDir = workspace.getGeneratedProjectDir(projectId);
    const assetsDir = join(outputDir, 'public', 'assets');
    const sourcePack = 'kenney-tiny-shooter-tanks';
    await mkdir(assetsDir, { recursive: true });
    await mkdir(join(outputDir, 'shooter', 'src'), { recursive: true });
    await writeFile(join(outputDir, 'asset_plan.json'), `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
    await writeFile(join(outputDir, 'asset_intent_manifest.json'), `${JSON.stringify(buildAssetIntentManifest({ projectId, plan }), null, 2)}\n`, 'utf8');

    const assets = plan.items.map((item) => ({
      id: item.id,
      loadKey: `agm.${item.id}`,
      role: item.role,
      type: 'image' as const,
      format: item.format,
      path: `assets/${item.id}.svg`,
      source: 'local_asset_pack' as const,
      sourcePack,
      licenseId: 'CC0-1.0',
      licenseName: 'Creative Commons CC0 1.0 Universal',
      attribution: 'Kenney Tanks by Kenney Vleugels',
      sourceUrl: 'https://kenney.nl/assets/tanks',
      catalogRef: {
        catalogVersion: 'template_asset_catalog.v1' as const,
        catalogAssetId: `local-pack:${sourcePack}:${item.id}`,
        source: 'local-template' as const
      },
      required: item.required,
      status: 'ready' as const,
      size: item.size,
      semanticFit: {
        status: 'exact' as const,
        confidence: 1,
        strictness: item.semantic?.strictness,
        expectedConcept: item.semantic?.expectedConcept,
        expectedAnyTags: item.semantic?.expectedAnyTags,
        actualTags: item.semantic?.expectedAnyTags,
        reason: `Test asset semantic tags exactly match expected ${item.semantic?.expectedConcept ?? item.id}.`
      }
    }));
    const manifest = AssetManifestSchema.parse({
      version: 'asset-manifest-v0.1',
      projectId,
      strict: true,
      assets,
      summary: {
        required: assets.filter((asset) => asset.required).length,
        ready: assets.length,
        fallback_used: 0,
        missing: 0,
        placeholder_used: 0
      }
    });

    for (const asset of manifest.assets) {
      await writeFile(join(outputDir, 'public', asset.path), '<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf8');
    }
    await writeFile(join(outputDir, 'public', 'asset_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    await writeFile(join(outputDir, 'shooter', 'src', 'asset-manifest.generated.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    await writeFile(
      join(outputDir, 'asset_resolution_report.json'),
      `${JSON.stringify(
        buildAssetResolutionReport({
          plan,
          manifest,
          candidates: [
            {
              packId: sourcePack,
              status: 'selected',
              reason: 'selected',
              message: `Selected complete local asset pack ${sourcePack}.`
            }
          ]
        }),
        null,
        2
      )}\n`,
      'utf8'
    );
  }

  async function writeAssetLibraryUsageReportFixture(): Promise<void> {
    const outputDir = workspace.getGeneratedProjectDir(projectId);
    await mkdir(outputDir, { recursive: true });
    await writeFile(
      join(outputDir, 'asset_library_usage_report.json'),
      `${JSON.stringify(
        {
          reportVersion: 'asset-library-usage-report.v1',
          projectId,
          runId,
          catalogVersion: 'template_asset_catalog.v1',
          manifestRefs: {
            assetPlanPath: 'asset_plan.json',
            publicAssetManifestPath: 'public/asset_manifest.json',
            previewManifestPath: 'shooter/src/asset-manifest.generated.json'
          },
          usedAssets: [
            {
              manifestAssetId: 'player',
              kind: 'sprite',
              resolvedPath: 'assets/player.svg',
              catalogAssetId: 'local-pack:kenney-tiny-shooter-tanks:player',
              source: 'local_asset_pack',
              status: 'matched',
              boundDslStableId: 'player',
              boundObjectPath: 'asset_plan.json#items.0',
              reason: 'player is backed by manifest catalogRef local-pack:kenney-tiny-shooter-tanks:player.'
            }
          ],
          missingCatalogEntries: [],
          unresolvedAssets: [],
          warnings: [],
          errors: [],
          status: 'pass'
        },
        null,
        2
      )}\n`,
      'utf8'
    );
  }

  async function writeAssetBindingTraceReportFixture(): Promise<void> {
    const outputDir = workspace.getGeneratedProjectDir(projectId);
    await mkdir(outputDir, { recursive: true });
    await writeFile(
      join(outputDir, 'asset_binding_trace_report.json'),
      `${JSON.stringify(
        {
          reportVersion: 'asset-binding-trace-report.v1',
          projectId,
          runId,
          status: 'pass',
          sourceArtifacts: {
            gameDslPath: 'game_dsl.json',
            assetPlanPath: 'asset_plan.json',
            publicAssetManifestPath: 'public/asset_manifest.json',
            previewManifestPath: 'shooter/src/asset-manifest.generated.json',
            assetLibraryUsageReportPath: 'asset_library_usage_report.json'
          },
          traces: [
            {
              traceId: 'trace:player',
              category: 'dsl-bound',
              status: 'matched',
              dslStableId: 'player',
              dslObjectPath: 'asset_plan.json#items.0',
              assetPlanId: 'player',
              assetPlanPath: 'asset_plan.json#items.0',
              manifestAssetId: 'player',
              previewAssetId: 'player',
              catalogAssetId: 'local-pack:kenney-tiny-shooter-tanks:player',
              catalogVersion: 'template_asset_catalog.v1',
              source: 'local-template',
              reason: 'player binding trace matches AssetPlan, manifests, and catalog usage.'
            }
          ],
          orphanManifestAssets: [],
          missingManifestAssets: [],
          warnings: [],
          errors: [],
          checkedPaths: ['asset_plan.json', 'public/asset_manifest.json', 'shooter/src/asset-manifest.generated.json', 'asset_library_usage_report.json']
        },
        null,
        2
      )}\n`,
      'utf8'
    );
  }

  function createModelProviderForRawDsl(rawDsl: RawGameDsl): NonNullable<PipelineOverrides['modelProvider']> {
    const brief = GameBriefSchema.parse({
      brief_version: 'game-brief-v0.1',
      title: rawDsl.metadata.title,
      genre: rawDsl.game.genre,
      camera: rawDsl.game.camera,
      core_loop: [rawDsl.metadata.description, 'Use the generated mechanics to satisfy the objective.'],
      difficulty: rawDsl.game.difficulty,
      target_play_time_sec: rawDsl.game.target_play_time_sec
    });

    return {
      async generateGameBrief() {
        return {
          ok: true,
          value: brief,
          rawText: '{}',
          rawOutputPath: workspace.getModelOutputPath(projectId, runId, 'game-brief.raw.json')
        };
      },
      async generateRawGameDsl() {
        return {
          ok: true,
          value: rawDsl,
          rawText: JSON.stringify(rawDsl),
          rawOutputPath: workspace.getModelOutputPath(projectId, runId, 'raw-game-dsl.raw.json')
        };
      }
    };
  }

  function createQaReport(
    genre: QaGenre,
    patch: Partial<QaReport> = {},
    expectedRuntimeAuthority?: QaRuntimeAuthorityExpectation
  ): QaReport {
    const now = new Date().toISOString();
    const runtimeAuthority =
      expectedRuntimeAuthority === undefined
        ? undefined
        : {
            status: 'PASSED' as const,
            expected: expectedRuntimeAuthority,
            observed: expectedRuntimeAuthority,
            mismatches: []
          };
    return {
      status: 'PASSED',
      runtime_status: 'PASSED',
      asset_semantic_status: 'PASSED',
      overall_status: 'PLAYABLE',
      project_id: projectId,
      run_id: runId,
      genre,
      preview_url: 'http://localhost/preview/index.html',
      seed: 'golden',
      required_events: { all: [], any_groups: [] },
      observed_events: [],
      missing_events: [],
      missing_any_groups: [],
      console_errors: [],
      ...(runtimeAuthority === undefined ? {} : { runtime_authority: runtimeAuthority }),
      started_at: now,
      completed_at: now,
      ...patch
    };
  }

  function defaultWeaponCapabilityRuntimeEvidence(expected: QaCapabilityRuntimeExpectation | undefined): QaCapabilityRuntimeEvidence {
    return {
      status: 'PASSED',
      ...(expected === undefined ? {} : { expected }),
      observed: [projectileObservedProbe(), movementRunJumpObservedProbe(), defaultWeaponObservedProbe()],
      missingProbeIds: [],
      mismatches: []
    };
  }

  function defaultWeaponObservedProbe(): QaCapabilityRuntimeEvidence['observed'][number] {
    return {
      capabilityId: 'weapon.default_straight_single.v1',
      probeId: 'weapon.default_straight_single.v1.fire.browser_qa.v1',
      runtimeModuleId: 'weapon.default_straight_single',
      action: 'fire',
      eventType: 'player.fired',
      eventTypes: ['player.fired', 'projectile.spawned'],
      sourceRef: 'runtime_plan.side_scrolling.player.projectileEntityId',
      status: 'observed',
      observedIn: ['snapshot', 'telemetry']
    };
  }

  function projectileObservedProbe(): QaCapabilityRuntimeEvidence['observed'][number] {
    return {
      capabilityId: 'combat.projectile.v1',
      probeId: 'combat.projectile.v1.spawn.browser_qa.v1',
      runtimeModuleId: 'combat.projectile',
      action: 'fire',
      eventType: 'projectile.spawned',
      eventTypes: ['projectile.spawned'],
      sourceRef: 'runtime_plan.side_scrolling.player.projectileEntityId',
      status: 'observed',
      observedIn: ['snapshot', 'telemetry']
    };
  }

  function movementRunJumpObservedProbe(): QaCapabilityRuntimeEvidence['observed'][number] {
    return {
      capabilityId: 'movement.run_jump.v1',
      probeId: 'movement.run_jump.v1.jump.browser_qa.v1',
      runtimeModuleId: 'movement.run_jump',
      action: 'jump',
      eventType: 'player.jumped',
      eventTypes: ['player.jumped'],
      sourceRef: 'runtime_plan.side_scrolling.player.jumpVelocity',
      status: 'observed',
      observedIn: ['snapshot', 'telemetry']
    };
  }

  function buildObservedSceneBindings(sceneIr: SceneIr) {
    const scene = sceneIr.scenes[0];
    const binding = (kind: string, sceneRuntimeId: string, provenanceRef: string) => {
      const provenance = sceneIr.provenance[provenanceRef] ?? sceneIr.provenance[sceneRuntimeId];
      return {
        kind,
        sceneRuntimeId,
        runtimeInstanceId: sceneRuntimeId,
        source: provenance?.source ?? 'system',
        sourceDslPath: provenance?.dslPath,
        status: 'bound'
      };
    };

    return {
      source: 'scene_ir',
      bindings: [
        ...scene.backgrounds.map((background) => binding('background', background.runtimeId, background.provenanceRef)),
        ...scene.platforms.map((platform) => binding('platform', platform.runtimeId, platform.provenanceRef)),
        binding('player', scene.player.runtimeId, scene.player.provenanceRef),
        ...scene.enemyInstances.map((enemy) => binding('enemy', enemy.runtimeId, enemy.provenanceRef)),
        ...scene.pickups.map((pickup) => binding('pickup', pickup.runtimeId, pickup.provenanceRef)),
        ...scene.goals.map((goal) => binding('goal', goal.runtimeId, goal.provenanceRef))
      ]
    };
  }

  async function writeHardSemanticMismatchArtifacts(
    plan: AssetPlan,
    options: { source?: 'local_asset_pack' | 'template_svg'; assetPlanProjectId?: string } = {}
  ): Promise<void> {
    const projectDir = workspace.getGeneratedProjectDir(projectId);
    const publicAssetsDir = join(projectDir, 'public', 'assets');
    const source = options.source ?? 'local_asset_pack';
    const writtenPlan = options.assetPlanProjectId === undefined ? plan : { ...plan, projectId: options.assetPlanProjectId };
    await mkdir(publicAssetsDir, { recursive: true });
    await writeFile(join(projectDir, 'asset_plan.json'), `${JSON.stringify(writtenPlan, null, 2)}\n`, 'utf8');

    const assets = plan.items.map((item) => ({
      id: item.id,
      loadKey: `agm.${item.id}`,
      role: item.role,
      type: 'image' as const,
      format: item.format,
      path: `assets/${item.id}.svg`,
      source,
      ...(source === 'local_asset_pack'
        ? {
            sourcePack: 'kenney-tiny-shooter-tanks',
            licenseId: 'CC0-1.0',
            licenseName: 'Creative Commons CC0 1.0 Universal',
            attribution: 'Kenney Tanks by Kenney Vleugels',
            sourceUrl: 'https://kenney.nl/assets/tanks'
          }
        : {}),
      required: item.required,
      status: 'ready' as const,
      size: item.size,
      semanticFit:
        item.semantic?.strictness === 'hard'
          ? {
              status: 'mismatch' as const,
              confidence: 0,
              strictness: 'hard' as const,
              expectedConcept: item.semantic.expectedConcept,
              expectedAnyTags: item.semantic.expectedAnyTags,
              actualTags: ['tank', 'vehicle', 'turret'],
              missingTags: item.semantic.expectedAnyTags,
              conflictingTags: ['tank', 'vehicle'],
              reason: `Local asset semantic tags do not satisfy expected ${item.semantic.expectedConcept}.`
            }
          : {
              status: 'exact' as const,
              confidence: 1,
              strictness: item.semantic?.strictness,
              expectedConcept: item.semantic?.expectedConcept,
              expectedAnyTags: item.semantic?.expectedAnyTags,
              actualTags: item.semantic?.expectedAnyTags,
              reason: `Local asset semantic tags exactly match expected ${item.semantic?.expectedConcept ?? item.id}.`
            }
    }));
    const manifest = AssetManifestSchema.parse({
      version: 'asset-manifest-v0.1',
      projectId,
      strict: true,
      assets,
      summary: {
        required: assets.filter((asset) => asset.required).length,
        ready: assets.length,
        fallback_used: 0,
        missing: 0,
        placeholder_used: 0
      }
    });

    for (const asset of manifest.assets) {
      await writeFile(join(projectDir, 'public', asset.path), '<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf8');
    }
    await writeFile(join(projectDir, 'public', 'asset_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    await writeFile(join(projectDir, 'asset_resolution_report.json'), `${JSON.stringify(createBadResolutionReport(plan, manifest), null, 2)}\n`, 'utf8');
  }

  async function writeExactSemanticArtifacts(plan: AssetPlan): Promise<void> {
    const projectDir = workspace.getGeneratedProjectDir(projectId);
    const publicAssetsDir = join(projectDir, 'public', 'assets');
    await mkdir(publicAssetsDir, { recursive: true });
    await writeFile(join(projectDir, 'asset_plan.json'), `${JSON.stringify(plan, null, 2)}\n`, 'utf8');

    const assets = plan.items.map((item) => ({
      id: item.id,
      loadKey: `agm.${item.id}`,
      role: item.role,
      type: 'image' as const,
      format: item.format,
      path: `assets/${item.id}.svg`,
      source: 'template_svg' as const,
      required: item.required,
      status: 'ready' as const,
      size: item.size,
      semanticFit: {
        status: 'exact' as const,
        confidence: 1,
        strictness: item.semantic?.strictness,
        expectedConcept: item.semantic?.expectedConcept,
        expectedAnyTags: item.semantic?.expectedAnyTags,
        actualTags: item.semantic?.expectedAnyTags,
        reason: `Test asset semantic tags exactly match expected ${item.semantic?.expectedConcept ?? item.id}.`
      }
    }));
    const manifest = AssetManifestSchema.parse({
      version: 'asset-manifest-v0.1',
      projectId,
      strict: true,
      assets,
      summary: {
        required: assets.filter((asset) => asset.required).length,
        ready: assets.length,
        fallback_used: 0,
        missing: 0,
        placeholder_used: 0
      }
    });

    for (const asset of manifest.assets) {
      await writeFile(join(projectDir, 'public', asset.path), '<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf8');
    }
    await writeFile(join(projectDir, 'public', 'asset_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    await writeFile(join(projectDir, 'asset_resolution_report.json'), `${JSON.stringify(createBadResolutionReport(plan, manifest), null, 2)}\n`, 'utf8');
  }

  function createBadResolutionReport(plan: AssetPlan, manifest: AssetManifest): AssetResolutionReport {
    const planById = new Map(plan.items.map((item) => [item.id, item]));
    const hasSelectedPack = manifest.assets.some((asset) => asset.sourcePack !== undefined);
    return AssetResolutionReportSchema.parse({
      version: 'asset-resolution-report-v0.1',
      projectId,
      summary: {
        selectedProvider: hasSelectedPack ? 'local_asset_pack' : 'template_svg',
        selectedPackId: hasSelectedPack ? 'kenney-tiny-shooter-tanks' : undefined,
        fallbackUsed: false,
        reason: 'Selected complete local asset pack kenney-tiny-shooter-tanks.'
      },
      assets: manifest.assets.map((asset) => ({
        id: asset.id,
        role: asset.role,
        selected: {
          source: asset.source,
          sourcePack: asset.sourcePack,
          path: asset.path,
          status: asset.status
        },
        expectedSemantic: planById.get(asset.id)?.semantic,
        semanticFit: asset.semanticFit
      })),
      candidates: hasSelectedPack
        ? [
            {
              packId: 'kenney-tiny-shooter-tanks',
              status: 'selected',
              reason: 'selected',
              message: 'Selected complete local asset pack kenney-tiny-shooter-tanks.'
            }
          ]
        : []
    });
  }

  async function readManifest(path: string): Promise<AssetManifest> {
    return AssetManifestSchema.parse(JSON.parse(await readFile(path, 'utf8')));
  }

  async function readQaReport(): Promise<QaReport> {
    return JSON.parse(await readFile(workspace.getQaReportPath(projectId, runId), 'utf8')) as QaReport;
  }

  async function readResolutionReport(): Promise<AssetResolutionReport> {
    return AssetResolutionReportSchema.parse(JSON.parse(await readFile(join(workspace.getGeneratedProjectDir(projectId), 'asset_resolution_report.json'), 'utf8')));
  }
});

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? await collectFiles(path) : [path];
    })
  );

  return files.flat();
}

async function writeTextFile(path: string, value: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, 'utf8');
}
