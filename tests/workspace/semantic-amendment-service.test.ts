import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ProjectRequestError } from '../../apps/maker-api/src/projects/project-request.error.js';
import { ProjectStoreService } from '../../apps/maker-api/src/projects/project-store.service.js';
import { RunStoreService } from '../../apps/maker-api/src/projects/run-store.service.js';
import { DslLiveEditService } from '../../apps/maker-api/src/projects/dsl-live-edit.service.js';
import { SemanticAmendmentService } from '../../apps/maker-api/src/projects/semantic-amendment.service.js';
import { LocalWorkspaceService } from '../../apps/maker-api/src/workspace/local-workspace.service.js';
import {
  buildSceneIr,
  buildGameDslArtifact,
  buildRuntimeCapabilityReport,
  RawGameDslSchema,
  SemanticEditProposalSchema,
  validateAndNormalizeRawGameDsl,
  type GameDslArtifact,
  type RawGameDsl
} from '../../packages/game-dsl/src/index.js';
import { buildAssetIntentManifest, buildAssetPlanFromIr } from '../../packages/asset-pipeline/src/index.js';
import { createShooterRawDsl, createSideScrollingRunAndGunRawDsl } from '../contracts/fixtures.js';

const projectId = 'proj_20260618_120000_step32b';
const runId = 'run_20260618_120000_step32b';
const proposalId = 'amend_20260618_120000_step32b';
const candidateRunId = 'run_candidate_20260618_120000_step32b';

describe('SemanticAmendmentService', () => {
  let root: string;
  let workspace: LocalWorkspaceService;
  let projectStore: ProjectStoreService;
  let runStore: RunStoreService;
  let service: SemanticAmendmentService;
  let liveEdit: DslLiveEditService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-amendments-'));
    workspace = new LocalWorkspaceService(root);
    projectStore = new ProjectStoreService(workspace);
    runStore = new RunStoreService(workspace);
    liveEdit = new DslLiveEditService(workspace);
    service = new SemanticAmendmentService(
      projectStore,
      runStore,
      workspace,
      liveEdit,
      () => new Date('2026-06-18T12:00:00.000Z'),
      () => proposalId
    );
    await projectStore.createProject({
      projectId,
      runId,
      idea: '小猫大战坦克',
      language: 'zh',
      createdAt: '2026-06-18T12:00:00.000Z'
    });
    const run = await runStore.createRun({ projectId, runId, createdAt: '2026-06-18T12:00:00.000Z' });
    await projectStore.writeLatestRun(projectId, run);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('plans a semantic amendment into proposal artifacts without mutating live current state', async () => {
    const gameDsl = await writeShooterArtifacts(workspace, { writeGeneratedRegistry: true });

    const planned = await service.plan(projectId, runId, { text: '提高玩家速度', language: 'zh' });

    expect(planned).toMatchObject({
      ok: true,
      proposal: {
        id: proposalId,
        projectId,
        runId,
        sourceText: '提高玩家速度',
        execution: { mode: 'hot_runtime_patch', supportedNow: true },
        candidate: {
          dslPatch: {
            ops: [expect.objectContaining({ path: '/player/physics/maxSpeed' })]
          },
          artifactSandboxPath: `semantic-amendments/${proposalId}`,
          artifactRefs: expect.objectContaining({
            proposal: `semantic-amendments/${proposalId}/proposal.json`
          })
        }
      },
      artifact_refs: expect.arrayContaining([
        expect.objectContaining({ id: 'sourceRequest', path: `semantic-amendments/${proposalId}/source_request.json` }),
        expect.objectContaining({ id: 'contextPack', path: `semantic-amendments/${proposalId}/context_pack.json` }),
        expect.objectContaining({ id: 'proposal', path: `semantic-amendments/${proposalId}/proposal.json` })
      ])
    });
    expect(SemanticEditProposalSchema.parse(planned.proposal).execution.mode).toBe('hot_runtime_patch');
    expect(JSON.stringify(planned)).not.toContain(root);

    const proposalArtifact = SemanticEditProposalSchema.parse(
      JSON.parse(await readFile(workspace.getSemanticAmendmentArtifactPath(projectId, runId, proposalId, 'proposal.json'), 'utf8'))
    );
    const contextPack = JSON.parse(await readFile(workspace.getSemanticAmendmentArtifactPath(projectId, runId, proposalId, 'context_pack.json'), 'utf8')) as {
      currentDsl?: { dslId?: string };
      runtimeCapabilityReport?: { liveEditCapabilities?: { hot?: string[] } };
    };
    const sourceRequest = JSON.parse(await readFile(workspace.getSemanticAmendmentArtifactPath(projectId, runId, proposalId, 'source_request.json'), 'utf8')) as {
      sourceText?: string;
    };

    expect(proposalArtifact.userMessage).toContain('已理解，可实时预览');
    expect(contextPack.currentDsl?.dslId).toBe(gameDsl.dslId);
    expect(contextPack.runtimeCapabilityReport?.liveEditCapabilities?.hot).toContain('/player/physics/maxSpeed');
    expect(sourceRequest.sourceText).toBe('提高玩家速度');
    await expect(readFile(workspace.getLiveCurrentVersionPath(projectId, runId), 'utf8')).rejects.toThrow();
  });

  it('does not bypass generated runtime capability gates when planning hot-path intents', async () => {
    await writeShooterArtifacts(workspace, { writeGeneratedRegistry: false });

    const planned = await service.plan(projectId, runId, { text: '提高玩家速度' });

    expect(planned.proposal).toMatchObject({
      understanding: { understood: true },
      execution: {
        mode: 'unsupported_capability',
        missingCapabilities: ['live_edit_path:/player/physics/maxSpeed']
      }
    });
    expect(planned.proposal.userMessage).not.toContain('没有找到');
    await expect(readFile(workspace.getSemanticAmendmentArtifactPath(projectId, runId, proposalId, 'execution_route.json'), 'utf8')).resolves.toContain(
      'live_edit_path:/player/physics/maxSpeed'
    );
  });

  it('plans player theme regeneration as a candidate run when backend generator capabilities exist', async () => {
    await writeShooterArtifacts(workspace, { writeGeneratedRegistry: true });

    const planned = await service.plan(projectId, runId, { text: '把玩家变成小猫' });

    expect(planned.proposal).toMatchObject({
      understanding: {
        understood: true,
        designDeltas: [expect.objectContaining({ kind: 'reskin_or_theme', target: 'player' })]
      },
      execution: {
        mode: 'candidate_regeneration',
        supportedNow: true,
        requiresCandidateRun: true,
        missingCapabilities: [],
        rejectedUnsafeFallbacks: ['player.scale']
      },
      candidate: {
        candidateBrief: expect.objectContaining({
          amendmentSummary: '把玩家角色改成小猫主题',
          preserveGameplay: true
        })
      }
    });
    expect(planned.proposal.userMessage).toContain('将生成候选新版本');
  });

  it('previews, accepts, and undoes a player theme candidate run without mutating the source run before accept', async () => {
    await writeShooterArtifacts(workspace, { writeGeneratedRegistry: true });
    await service.plan(projectId, runId, { text: '把玩家变成小猫', language: 'zh' });

    const previewed = await service.preview(projectId, runId, proposalId);

    expect(previewed).toMatchObject({
      ok: true,
      proposal: {
        reviewState: 'previewing',
        candidate: {
          candidateRunId,
          candidateDsl: { runId: candidateRunId, player: { label: '小猫' } }
        }
      },
      preview_state: {
        reviewState: 'previewing',
        executionMode: 'candidate_regeneration',
        candidatePreview: {
          candidateRunId,
          previewAvailable: true,
          qaStatus: 'not_run'
        }
      },
      artifact_refs: expect.arrayContaining([
        expect.objectContaining({ id: 'candidateBrief', path: `semantic-amendments/${proposalId}/candidate/candidate_brief.json` }),
        expect.objectContaining({ id: 'candidateDsl', path: `semantic-amendments/${proposalId}/candidate/candidate_dsl.json` }),
        expect.objectContaining({ id: 'candidateDslDiff', path: `semantic-amendments/${proposalId}/candidate/candidate_dsl_diff.json` }),
        expect.objectContaining({ id: 'candidateRun', path: `semantic-amendments/${proposalId}/candidate/candidate_run.json` }),
        expect.objectContaining({ id: 'candidateRuntimeCapabilityReport', path: `semantic-amendments/${proposalId}/candidate/candidate_runtime_capability_report.json` }),
        expect.objectContaining({ id: 'previewState', path: `semantic-amendments/${proposalId}/review/preview_state.json` })
      ])
    });
    expect(JSON.stringify(previewed)).not.toContain(root);
    await expect(readFile(workspace.getLiveCurrentVersionPath(projectId, runId), 'utf8')).resolves.toContain('"versionId": "v_initial"');
    await expect(projectStore.readLatestRun(projectId)).resolves.toMatchObject({ run_id: runId });
    await expect(runStore.readRun(candidateRunId)).resolves.toMatchObject({ run_id: candidateRunId, project_id: projectId, status: 'PREVIEW_READY' });
    const candidateDsl = JSON.parse(await readFile(workspace.getSemanticAmendmentCandidateArtifactPath(projectId, runId, proposalId, 'candidate_dsl.json'), 'utf8')) as GameDslArtifact;
    expect(candidateDsl).toMatchObject({ runId: candidateRunId, player: { label: '小猫' }, sourceDsl: { player: { label: '小猫' } } });
    await expect(readFile(workspace.getModelOutputPath(projectId, candidateRunId, 'game_dsl.json'), 'utf8')).resolves.toContain('"runId": "run_candidate_20260618_120000_step32b"');

    const accepted = await service.accept(projectId, runId, proposalId, {});

    expect(accepted).toMatchObject({
      proposal: { reviewState: 'accepted', validation: { schemaValid: true } },
      accept_log: {
        candidatePromotionResult: {
          status: 'promoted_candidate',
          previousRunId: runId,
          candidateRunId,
          activeRunId: candidateRunId
        },
        candidateArtifactCheckpoint: expect.objectContaining({
          candidateRunId,
          candidateDslRef: `semantic-amendments/${proposalId}/candidate/candidate_dsl.json`
        })
      },
      undo_checkpoint: {
        beforeActiveRunId: runId,
        acceptedRunId: candidateRunId,
        candidateArtifactCheckpoint: expect.objectContaining({
          candidateRunId,
          candidateDslRef: `semantic-amendments/${proposalId}/candidate/candidate_dsl.json`
        })
      }
    });
    expect(accepted.proposal.validation?.previewBooted).toBeUndefined();
    expect(accepted.proposal.validation?.runtimeNoException).toBeUndefined();
    expect(JSON.stringify(accepted)).not.toContain(root);
    await expect(projectStore.readLatestRun(projectId)).resolves.toMatchObject({ run_id: candidateRunId });
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ latest_run_id: candidateRunId, status: 'PREVIEW_READY' });
    const candidateCurrent = JSON.parse(await readFile(workspace.getLiveCurrentVersionPath(projectId, candidateRunId), 'utf8')) as { versionId: string };
    expect(candidateCurrent.versionId).toBe('v_initial');

    const undone = await service.undo(projectId, runId, proposalId, { reason: 'restore previous active run' });

    expect(undone).toMatchObject({
      proposal: { reviewState: 'undone' },
      undo_log: {
        restoredRunId: runId,
        reason: 'restore previous active run',
        candidateArtifactCheckpoint: expect.objectContaining({
          candidateRunId,
          candidateDslRef: `semantic-amendments/${proposalId}/candidate/candidate_dsl.json`
        })
      }
    });
    await expect(projectStore.readLatestRun(projectId)).resolves.toMatchObject({ run_id: runId });
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ latest_run_id: runId });
  });

  it('builds side-scrolling candidate Scene IR and asset diffs without mutating active artifacts before accept', async () => {
    const activeDsl = await writeSideScrollingSceneArtifacts(workspace);
    const activeDslBeforePreview = await readFile(workspace.getModelOutputPath(projectId, runId, 'game_dsl.json'), 'utf8');
    const activeAssetIntentBeforePreview = await readFile(workspace.getModelOutputPath(projectId, runId, 'asset_intent_manifest.json'), 'utf8');
    await service.plan(projectId, runId, { text: '把玩家变成小猫', language: 'zh' });

    const previewed = await service.preview(projectId, runId, proposalId);

    expect(previewed).toMatchObject({
      proposal: {
        reviewState: 'previewing',
        candidate: {
          candidateRunId,
          artifactRefs: expect.objectContaining({
            candidateSceneIr: `semantic-amendments/${proposalId}/candidate/candidate_scene_ir.json`,
            candidateSceneIrDiff: `semantic-amendments/${proposalId}/candidate/candidate_scene_ir_diff.json`,
            candidateAssetIntentManifest: `semantic-amendments/${proposalId}/candidate/candidate_asset_intent_manifest.json`,
            candidateAssetDiff: `semantic-amendments/${proposalId}/candidate/candidate_asset_diff.json`
          })
        }
      },
      preview_state: {
        reviewState: 'previewing',
        candidatePreview: {
          candidateRunId,
          previewAvailable: true,
          qaStatus: 'not_run',
          candidateSceneIrRef: `semantic-amendments/${proposalId}/candidate/candidate_scene_ir.json`,
          candidateAssetDiffRef: `semantic-amendments/${proposalId}/candidate/candidate_asset_diff.json`
        }
      },
      artifact_refs: expect.arrayContaining([
        expect.objectContaining({ id: 'candidateSceneIr' }),
        expect.objectContaining({ id: 'candidateSceneIrDiff' }),
        expect.objectContaining({ id: 'candidateAssetIntentManifest' }),
        expect.objectContaining({ id: 'candidateAssetDiff' })
      ])
    });

    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'game_dsl.json'), 'utf8')).resolves.toBe(activeDslBeforePreview);
    await expect(readFile(workspace.getModelOutputPath(projectId, runId, 'asset_intent_manifest.json'), 'utf8')).resolves.toBe(activeAssetIntentBeforePreview);
    await expect(projectStore.readLatestRun(projectId)).resolves.toMatchObject({ run_id: runId });

    const candidateDsl = JSON.parse(await readFile(workspace.getSemanticAmendmentCandidateArtifactPath(projectId, runId, proposalId, 'candidate_dsl.json'), 'utf8')) as GameDslArtifact;
    expect(candidateDsl).toMatchObject({
      runId: candidateRunId,
      player: { label: '小猫' },
      sourceDsl: { player: { label: '小猫', visual: expect.objectContaining({ assetIntentRef: 'player_cat' }) } }
    });
    expect(activeDsl.sourceDsl.player.visual?.assetIntentRef).toBe('player_red_runner');

    const candidateSceneIr = JSON.parse(await readFile(workspace.getSemanticAmendmentCandidateArtifactPath(projectId, runId, proposalId, 'candidate_scene_ir.json'), 'utf8')) as {
      runId?: string;
      scenes?: Array<{ player?: { visualAssetIntentRef?: string } }>;
    };
    expect(candidateSceneIr.runId).toBe(candidateRunId);
    expect(candidateSceneIr.scenes?.[0]?.player?.visualAssetIntentRef).toBe('player_cat');

    const candidateSceneIrDiff = JSON.parse(await readFile(workspace.getSemanticAmendmentCandidateArtifactPath(projectId, runId, proposalId, 'candidate_scene_ir_diff.json'), 'utf8')) as {
      changedRuntimeIds?: string[];
      changes?: Array<{ path: string; before: unknown; after: unknown }>;
    };
    expect(candidateSceneIrDiff.changedRuntimeIds).toContain('entity.player');
    expect(candidateSceneIrDiff.changes).toContainEqual({
      path: '/scenes/0/player/visualAssetIntentRef',
      before: 'player_red_runner',
      after: 'player_cat'
    });

    const candidateAssetManifest = JSON.parse(
      await readFile(workspace.getSemanticAmendmentCandidateArtifactPath(projectId, runId, proposalId, 'candidate_asset_intent_manifest.json'), 'utf8')
    ) as { intents?: Array<{ id: string; requiredLevel: string; sourceDslPaths: string[] }> };
    expect(candidateAssetManifest.intents).toContainEqual(
      expect.objectContaining({ id: 'player_cat', requiredLevel: 'request_required', sourceDslPaths: expect.arrayContaining(['/player/visual']) })
    );

    const candidateAssetDiff = JSON.parse(await readFile(workspace.getSemanticAmendmentCandidateArtifactPath(projectId, runId, proposalId, 'candidate_asset_diff.json'), 'utf8')) as {
      invalidatedAssetIntentRefs?: string[];
      createdAssetIntentRefs?: string[];
      activeRunMutation?: boolean;
    };
    expect(candidateAssetDiff).toMatchObject({
      invalidatedAssetIntentRefs: ['player_red_runner'],
      createdAssetIntentRefs: ['player_cat'],
      activeRunMutation: false
    });
    await expect(readFile(workspace.getModelOutputPath(projectId, candidateRunId, 'game.scene.ir.json'), 'utf8')).resolves.toContain('"player_cat"');
    await expect(readFile(workspace.getModelOutputPath(projectId, candidateRunId, 'asset_intent_manifest.json'), 'utf8')).resolves.toContain('"player_cat"');
  });

  it('marks a no-op player theme candidate as AMENDMENT_NO_VISIBLE_EFFECT without creating a candidate run', async () => {
    await writeSideScrollingSceneArtifacts(workspace, { playerLabel: '小猫', playerVisualAssetIntentRef: 'player_cat' });
    await service.plan(projectId, runId, { text: '把玩家变成小猫', language: 'zh' });

    const previewed = await service.preview(projectId, runId, proposalId);

    expect(previewed).toMatchObject({
      proposal: {
        reviewState: 'failed',
        validation: { schemaValid: true, runtimeNoException: false, previewBooted: false }
      },
      preview_state: {
        reviewState: 'failed',
        executionMode: 'candidate_regeneration',
        failureReason: 'AMENDMENT_NO_VISIBLE_EFFECT'
      },
      artifact_refs: expect.arrayContaining([
        expect.objectContaining({ id: 'candidateDslDiff' }),
        expect.objectContaining({ id: 'candidateSceneIrDiff' }),
        expect.objectContaining({ id: 'candidateAssetDiff' }),
        expect.objectContaining({ id: 'previewState' })
      ])
    });
    await expect(runStore.readRun(candidateRunId)).rejects.toThrow();
    await expect(projectStore.readLatestRun(projectId)).resolves.toMatchObject({ run_id: runId });
  });

  it('builds legacy side-scrolling candidate visual artifacts when the active DSL has no scenes contract', async () => {
    await writeSideScrollingSceneArtifacts(workspace, { includeScenes: false });
    await service.plan(projectId, runId, { text: '把玩家变成小猫', language: 'zh' });

    const previewed = await service.preview(projectId, runId, proposalId);

    expect(previewed).toMatchObject({
      proposal: { reviewState: 'previewing' },
      preview_state: {
        reviewState: 'previewing',
        candidatePreview: {
          candidateRunId,
          candidateSceneIrRef: `semantic-amendments/${proposalId}/candidate/candidate_scene_ir.json`,
          candidateAssetIntentManifestRef: `semantic-amendments/${proposalId}/candidate/candidate_asset_intent_manifest.json`
        }
      }
    });

    const candidateSceneIr = JSON.parse(await readFile(workspace.getSemanticAmendmentCandidateArtifactPath(projectId, runId, proposalId, 'candidate_scene_ir.json'), 'utf8')) as {
      source?: string;
      scenes?: Array<{ player?: { visualAssetIntentRef?: string } }>;
    };
    expect(candidateSceneIr).toMatchObject({
      source: 'runtime_plan_derived',
      scenes: [expect.objectContaining({ player: expect.objectContaining({ visualAssetIntentRef: 'player_cat' }) })]
    });
    const candidateAssetManifest = JSON.parse(
      await readFile(workspace.getSemanticAmendmentCandidateArtifactPath(projectId, runId, proposalId, 'candidate_asset_intent_manifest.json'), 'utf8')
    ) as { intents?: Array<{ id: string; requiredLevel: string; sourceDslPaths: string[] }> };
    expect(candidateAssetManifest.intents).toContainEqual(
      expect.objectContaining({ id: 'player_cat', requiredLevel: 'request_required', sourceDslPaths: expect.arrayContaining(['/player/visual']) })
    );
    await expect(runStore.readRun(candidateRunId)).resolves.toMatchObject({ run_id: candidateRunId, status: 'PREVIEW_READY' });
  });

  it('rejects a previewed player theme candidate without promoting the candidate run', async () => {
    await writeShooterArtifacts(workspace, { writeGeneratedRegistry: true });
    await service.plan(projectId, runId, { text: '把玩家变成小猫', language: 'zh' });
    await service.preview(projectId, runId, proposalId);

    const rejected = await service.reject(projectId, runId, proposalId, { reason: 'try another theme' });

    expect(rejected).toMatchObject({
      proposal: { reviewState: 'rejected' },
      reject_log: {
        previousReviewState: 'previewing',
        reason: 'try another theme',
        requiresRuntimeRevert: false,
        candidateArtifactCheckpoint: expect.objectContaining({
          candidateRunId,
          candidateDslRef: `semantic-amendments/${proposalId}/candidate/candidate_dsl.json`
        })
      }
    });
    await expect(projectStore.readLatestRun(projectId)).resolves.toMatchObject({ run_id: runId });
    await expect(runStore.readRun(candidateRunId)).resolves.toMatchObject({ status: 'PREVIEW_READY' });
  });

  it('blocks candidate undo when active run advanced after accept', async () => {
    await writeShooterArtifacts(workspace, { writeGeneratedRegistry: true });
    await service.plan(projectId, runId, { text: '把玩家变成小猫', language: 'zh' });
    await service.preview(projectId, runId, proposalId);
    await service.accept(projectId, runId, proposalId, {});
    const externalRun = await runStore.createRun({ projectId, runId: 'run_external_after_candidate', createdAt: '2026-06-18T12:01:00.000Z' });
    await projectStore.writeLatestRun(projectId, externalRun);
    const project = await projectStore.readProject(projectId);
    await projectStore.writeProject({ ...project, latest_run_id: externalRun.run_id });

    await expect(service.undo(projectId, runId, proposalId, { reason: 'too late' })).rejects.toThrow(ProjectRequestError);
    await expect(projectStore.readLatestRun(projectId)).resolves.toMatchObject({ run_id: externalRun.run_id });
  });

  it('blocks candidate accept when candidate DSL identity does not match the candidate run', async () => {
    await writeShooterArtifacts(workspace, { writeGeneratedRegistry: true });
    await service.plan(projectId, runId, { text: '把玩家变成小猫', language: 'zh' });
    await service.preview(projectId, runId, proposalId);
    const candidatePath = workspace.getModelOutputPath(projectId, candidateRunId, 'game_dsl.json');
    const candidateDsl = JSON.parse(await readFile(candidatePath, 'utf8')) as GameDslArtifact;
    await writeFile(candidatePath, `${JSON.stringify({ ...candidateDsl, runId: 'run_tampered_candidate' }, null, 2)}\n`, 'utf8');

    await expect(service.accept(projectId, runId, proposalId, {})).rejects.toThrow(ProjectRequestError);
    await expect(projectStore.readLatestRun(projectId)).resolves.toMatchObject({ run_id: runId });
    await expect(readFile(workspace.getLiveCurrentVersionPath(projectId, candidateRunId), 'utf8')).rejects.toThrow();
  });

  it('previews, accepts, and undoes a hot semantic amendment through backend lifecycle artifacts', async () => {
    await writeShooterArtifacts(workspace, { writeGeneratedRegistry: true });
    await service.plan(projectId, runId, { text: '提高玩家速度', language: 'zh' });

    const previewed = await service.preview(projectId, runId, proposalId);

    expect(previewed).toMatchObject({
      ok: true,
      proposal: { reviewState: 'previewing' },
      preview_state: {
        reviewState: 'previewing',
        preparedLiveEdit: {
          status: 'hot_patchable',
          apply_mode: 'hot',
          live_update_plan: { affectedPaths: ['/player/physics/maxSpeed'] }
        }
      },
      artifact_refs: [expect.objectContaining({ id: 'previewState', path: `semantic-amendments/${proposalId}/review/preview_state.json` })]
    });
    const beforeAccept = JSON.parse(await readFile(workspace.getLiveCurrentVersionPath(projectId, runId), 'utf8')) as { versionId: string };
    expect(beforeAccept.versionId).toBe('v_initial');
    const prepared = previewed.preview_state.preparedLiveEdit;
    if (prepared === undefined) {
      throw new Error('expected prepared live edit');
    }

    const accepted = await service.accept(projectId, runId, proposalId, {
      runtimeApplyReport: {
        artifactKind: 'runtime_apply_report',
        schemaVersion: 'runtime_apply_report.v1',
        runId,
        patchId: prepared.patch_id,
        liveUpdatePlanRef: prepared.live_update_plan_ref,
        status: 'applied_hot',
        applyMode: 'hot',
        runtimeTarget: 'vitest-runtime',
        appliedPaths: prepared.live_update_plan.affectedPaths,
        warnings: [],
        errors: []
      }
    });

    expect(accepted).toMatchObject({
      proposal: { reviewState: 'accepted', validation: { runtimeNoException: true, previewBooted: true } },
      accept_log: { runtimeApplyResult: { status: 'applied_hot', apply_mode: 'hot' } },
      undo_checkpoint: { beforeAcceptVersion: { versionId: 'v_initial' } },
      artifact_refs: expect.arrayContaining([
        expect.objectContaining({ id: 'acceptLog' }),
        expect.objectContaining({ id: 'undoCheckpoint' })
      ])
    });
    expect(JSON.stringify(accepted)).not.toContain(root);
    const afterAccept = JSON.parse(await readFile(workspace.getLiveCurrentVersionPath(projectId, runId), 'utf8')) as { versionId: string };
    expect(afterAccept.versionId).toContain(prepared.patch_id);

    const undone = await service.undo(projectId, runId, proposalId, { reason: 'restore baseline' });

    expect(undone).toMatchObject({
      proposal: { reviewState: 'undone' },
      undo_log: { restoredVersion: { versionId: 'v_initial' }, reason: 'restore baseline' },
      artifact_refs: expect.arrayContaining([expect.objectContaining({ id: 'undoLog' })])
    });
    expect(JSON.stringify(undone)).not.toContain(root);
    const afterUndo = JSON.parse(await readFile(workspace.getLiveCurrentVersionPath(projectId, runId), 'utf8')) as { versionId: string };
    expect(afterUndo.versionId).toBe('v_initial');
  });

  it.each([
    { label: 'enemy speed', text: '提高敌人速度', expectedPath: '/enemyTypes/alien/physics/speed' },
    { label: 'enemy health', text: '提高敌人生命值', expectedPath: '/enemyTypes/alien/health/max' },
    { label: 'player health', text: '提高玩家生命值', expectedPath: '/player/health/max' },
    { label: 'projectile damage', text: '提高子弹伤害', expectedPath: '/projectiles/bolt/damage' }
  ])('previews and accepts planner hot fast path for $label', async ({ text, expectedPath }) => {
    await writeShooterArtifacts(workspace, { writeGeneratedRegistry: true });

    const planned = await service.plan(projectId, runId, { text, language: 'zh' });

    expect(planned.proposal).toMatchObject({
      execution: { mode: 'hot_runtime_patch', supportedNow: true },
      candidate: {
        dslPatch: {
          ops: [expect.objectContaining({ path: expectedPath, value: expect.any(Number) })]
        }
      }
    });
    const plannedOp = planned.proposal.candidate?.dslPatch?.ops.find((op) => op.path === expectedPath);
    if (plannedOp === undefined) {
      throw new Error('expected planned DSL patch op');
    }

    const previewed = await service.preview(projectId, runId, proposalId);

    expect(previewed.preview_state).toMatchObject({
      reviewState: 'previewing',
      preparedLiveEdit: {
        status: 'hot_patchable',
        apply_mode: 'hot',
        live_update_plan: { affectedPaths: [expectedPath] }
      }
    });
    const prepared = previewed.preview_state.preparedLiveEdit;
    if (prepared === undefined) {
      throw new Error('expected prepared live edit');
    }

    const accepted = await service.accept(projectId, runId, proposalId, {
      runtimeApplyReport: {
        artifactKind: 'runtime_apply_report',
        schemaVersion: 'runtime_apply_report.v1',
        runId,
        patchId: prepared.patch_id,
        liveUpdatePlanRef: prepared.live_update_plan_ref,
        status: 'applied_hot',
        applyMode: 'hot',
        runtimeTarget: 'vitest-runtime',
        appliedPaths: prepared.live_update_plan.affectedPaths,
        warnings: [],
        errors: []
      }
    });

    expect(accepted).toMatchObject({
      proposal: { reviewState: 'accepted', validation: { runtimeNoException: true, previewBooted: true } },
      accept_log: { runtimeApplyResult: { status: 'applied_hot', apply_mode: 'hot' } }
    });
    const current = JSON.parse(await readFile(workspace.getLiveCurrentVersionPath(projectId, runId), 'utf8')) as { versionId: string; dslArtifactPath: string };
    expect(current.versionId).toContain(prepared.patch_id);
    const acceptedDsl = JSON.parse(await readFile(current.dslArtifactPath, 'utf8')) as unknown;
    expect(valueAtJsonPointer(acceptedDsl, expectedPath)).toBe(plannedOp.value);
  });

  it('previews and accepts weapon fire rate through a warm restart without projectile fallback', async () => {
    await writeShooterArtifacts(workspace, { writeGeneratedRegistry: true });

    const planned = await service.plan(projectId, runId, { text: '增加武器射速', language: 'zh' });

    expect(planned.proposal).toMatchObject({
      understanding: {
        designDeltas: [expect.objectContaining({ kind: 'tune_stat', targetDomain: 'weapon', stat: 'fireRate' })]
      },
      execution: {
        mode: 'dsl_patch_warm_restart',
        supportedNow: true,
        rejectedUnsafeFallbacks: ['projectile.speed', 'projectile.damage']
      },
      candidate: {
        dslPatch: {
          ops: [expect.objectContaining({ path: '/player/actions/0/cooldownMs', value: 225 })]
        }
      }
    });
    const plannedOp = planned.proposal.candidate?.dslPatch?.ops.find((op) => op.path === '/player/actions/0/cooldownMs');
    if (plannedOp === undefined) {
      throw new Error('expected weapon fire-rate DSL patch op');
    }

    const previewed = await service.preview(projectId, runId, proposalId);

    expect(previewed.preview_state).toMatchObject({
      reviewState: 'previewing',
      preparedLiveEdit: {
        status: 'warm_restart_required',
        apply_mode: 'warm_restart',
        live_update_plan: { affectedPaths: ['/player/actions/0/cooldownMs'] }
      }
    });
    const beforeAccept = JSON.parse(await readFile(workspace.getLiveCurrentVersionPath(projectId, runId), 'utf8')) as { versionId: string };
    expect(beforeAccept.versionId).toBe('v_initial');
    const prepared = previewed.preview_state.preparedLiveEdit;
    if (prepared === undefined) {
      throw new Error('expected prepared live edit');
    }

    const accepted = await service.accept(projectId, runId, proposalId, {
      runtimeApplyReport: {
        artifactKind: 'runtime_apply_report',
        schemaVersion: 'runtime_apply_report.v1',
        runId,
        patchId: prepared.patch_id,
        liveUpdatePlanRef: prepared.live_update_plan_ref,
        status: 'applied_warm_restart',
        applyMode: 'warm_restart',
        runtimeTarget: 'vitest-runtime',
        appliedPaths: prepared.live_update_plan.affectedPaths,
        warnings: [],
        errors: []
      }
    });

    expect(accepted).toMatchObject({
      proposal: { reviewState: 'accepted', validation: { runtimeNoException: true, previewBooted: true } },
      accept_log: { runtimeApplyResult: { status: 'applied_warm_restart', apply_mode: 'warm_restart' } }
    });
    const current = JSON.parse(await readFile(workspace.getLiveCurrentVersionPath(projectId, runId), 'utf8')) as { versionId: string; dslArtifactPath: string };
    expect(current.versionId).toContain(prepared.patch_id);
    const acceptedDsl = JSON.parse(await readFile(current.dslArtifactPath, 'utf8')) as GameDslArtifact;
    expect(valueAtJsonPointer(acceptedDsl, '/player/actions/0/cooldownMs')).toBe(plannedOp.value);
    expect(acceptedDsl.sourceDsl.player.actions[0]).toMatchObject({ cooldown_ms: plannedOp.value });
    expect(acceptedDsl.projectiles.bolt).toMatchObject({ speed: 520, damage: 1 });
  });

  it('does not accept a failed runtime apply or write an undo checkpoint', async () => {
    await writeShooterArtifacts(workspace, { writeGeneratedRegistry: true });
    await service.plan(projectId, runId, { text: '提高玩家速度', language: 'zh' });
    const previewed = await service.preview(projectId, runId, proposalId);
    const prepared = previewed.preview_state.preparedLiveEdit;
    if (prepared === undefined) {
      throw new Error('expected prepared live edit');
    }

    const accepted = await service.accept(projectId, runId, proposalId, {
      runtimeApplyReport: {
        artifactKind: 'runtime_apply_report',
        schemaVersion: 'runtime_apply_report.v1',
        runId,
        patchId: prepared.patch_id,
        liveUpdatePlanRef: prepared.live_update_plan_ref,
        status: 'failed_runtime_apply',
        applyMode: 'hot',
        runtimeTarget: 'vitest-runtime',
        appliedPaths: [],
        warnings: [],
        errors: [{ code: 'RUNTIME_REJECTED', path: '/player/physics/maxSpeed', message: 'Runtime rejected preview patch.' }]
      }
    });

    expect(accepted).toMatchObject({
      proposal: { reviewState: 'failed', validation: { runtimeNoException: false, previewBooted: false } },
      accept_log: { runtimeApplyResult: { status: 'failed_runtime_apply' } }
    });
    expect(accepted.undo_checkpoint).toBeUndefined();
    await expect(readFile(workspace.getSemanticAmendmentReviewArtifactPath(projectId, runId, proposalId, 'undo_checkpoint.json'), 'utf8')).rejects.toThrow();
    const current = JSON.parse(await readFile(workspace.getLiveCurrentVersionPath(projectId, runId), 'utf8')) as { versionId: string };
    expect(current.versionId).toBe('v_initial');
  });

  it('blocks undo when live current has advanced after the proposal was accepted', async () => {
    await writeShooterArtifacts(workspace, { writeGeneratedRegistry: true });
    await service.plan(projectId, runId, { text: '提高玩家速度', language: 'zh' });
    const previewed = await service.preview(projectId, runId, proposalId);
    const prepared = previewed.preview_state.preparedLiveEdit;
    if (prepared === undefined) {
      throw new Error('expected prepared live edit');
    }
    await service.accept(projectId, runId, proposalId, {
      runtimeApplyReport: {
        artifactKind: 'runtime_apply_report',
        schemaVersion: 'runtime_apply_report.v1',
        runId,
        patchId: prepared.patch_id,
        liveUpdatePlanRef: prepared.live_update_plan_ref,
        status: 'applied_hot',
        applyMode: 'hot',
        runtimeTarget: 'vitest-runtime',
        appliedPaths: prepared.live_update_plan.affectedPaths,
        warnings: [],
        errors: []
      }
    });
    const acceptedCurrent = JSON.parse(await readFile(workspace.getLiveCurrentVersionPath(projectId, runId), 'utf8')) as Record<string, unknown>;
    await writeFile(workspace.getLiveCurrentVersionPath(projectId, runId), `${JSON.stringify({ ...acceptedCurrent, versionId: 'v_external_followup' }, null, 2)}\n`, 'utf8');

    await expect(service.undo(projectId, runId, proposalId, { reason: 'too late' })).rejects.toThrow(ProjectRequestError);
    const currentAfterRejectedUndo = JSON.parse(await readFile(workspace.getLiveCurrentVersionPath(projectId, runId), 'utf8')) as { versionId: string };
    expect(currentAfterRejectedUndo.versionId).toBe('v_external_followup');
  });

  it('rejects a previewed amendment with a backend log without advancing active state', async () => {
    await writeShooterArtifacts(workspace, { writeGeneratedRegistry: true });
    await service.plan(projectId, runId, { text: '提高玩家速度', language: 'zh' });
    await service.preview(projectId, runId, proposalId);
    const beforeReject = await readFile(workspace.getLiveCurrentVersionPath(projectId, runId), 'utf8');

    const rejected = await service.reject(projectId, runId, proposalId, { reason: 'player rejected preview' });

    expect(rejected).toMatchObject({
      proposal: { reviewState: 'rejected' },
      reject_log: {
        previousReviewState: 'previewing',
        reason: 'player rejected preview',
        requiresRuntimeRevert: true
      },
      artifact_refs: [expect.objectContaining({ id: 'rejectLog', path: `semantic-amendments/${proposalId}/review/reject_log.json` })]
    });
    await expect(readFile(workspace.getLiveCurrentVersionPath(projectId, runId), 'utf8')).resolves.toBe(beforeReject);
  });

  it('rejects invalid plan requests before writing proposal artifacts', async () => {
    await writeShooterArtifacts(workspace, { writeGeneratedRegistry: true });

    await expect(service.plan(projectId, runId, { text: '' })).rejects.toThrow(ProjectRequestError);
    await expect(readFile(workspace.getSemanticAmendmentArtifactPath(projectId, runId, proposalId, 'proposal.json'), 'utf8')).rejects.toThrow();
  });
});

async function writeShooterArtifacts(workspace: LocalWorkspaceService, input: { writeGeneratedRegistry: boolean }): Promise<GameDslArtifact> {
  const rawDsl = RawGameDslSchema.parse(createShooterRawDsl());
  const gameDsl = buildGameDslArtifact({
    rawDsl,
    runId,
    intentPlan: { normalizedGenre: 'top_down_shooter', matchedAlias: '小猫大战坦克' }
  });
  const runtimeCapabilityReport = buildRuntimeCapabilityReport({ runId, validatedDsl: gameDsl });

  await writeJsonFile(workspace.getModelOutputPath(projectId, runId, 'game_dsl.json'), gameDsl);
  await writeJsonFile(workspace.getModelOutputPath(projectId, runId, 'runtime_capability_report.json'), runtimeCapabilityReport);
  if (input.writeGeneratedRegistry) {
    await writeJsonFile(join(workspace.getGeneratedProjectDir(projectId), 'shooter', 'src', 'live-edit-registry.generated.json'), {
      runId,
      liveEditCapabilities: runtimeCapabilityReport.liveEditCapabilities
    });
  }

  return gameDsl;
}

async function writeSideScrollingSceneArtifacts(
  workspace: LocalWorkspaceService,
  input: { playerLabel?: string; playerVisualAssetIntentRef?: string; includeScenes?: boolean } = {}
): Promise<GameDslArtifact> {
  const rawDsl = RawGameDslSchema.parse(createSideScrollingSceneRawDsl(input));
  const gameDsl = buildGameDslArtifact({
    rawDsl,
    runId,
    intentPlan: { normalizedGenre: 'side_scrolling_run_and_gun', matchedAlias: '横版跑枪' }
  });
  const normalized = validateAndNormalizeRawGameDsl(rawDsl);
  if (!normalized.ok) {
    throw new Error(`expected side-scrolling fixture to normalize: ${normalized.issues.map((issue) => issue.message).join(', ')}`);
  }
  const sceneIr = buildSceneIr({ projectId, runId, rawDsl, ir: normalized.ir });
  const assetPlan = buildAssetPlanFromIr(projectId, normalized.ir);
  const assetIntentManifest = buildAssetIntentManifest({ projectId, plan: assetPlan, sceneIr });
  const runtimeCapabilityReport = buildRuntimeCapabilityReport({ runId, validatedDsl: gameDsl });

  await writeJsonFile(workspace.getModelOutputPath(projectId, runId, 'game_dsl.json'), gameDsl);
  await writeJsonFile(workspace.getModelOutputPath(projectId, runId, 'runtime_capability_report.json'), runtimeCapabilityReport);
  await writeJsonFile(workspace.getModelOutputPath(projectId, runId, 'game.scene.ir.json'), sceneIr);
  await writeJsonFile(workspace.getModelOutputPath(projectId, runId, 'asset_intent_manifest.json'), assetIntentManifest);
  await writeJsonFile(join(workspace.getGeneratedProjectDir(projectId), 'side_scrolling_run_and_gun', 'src', 'live-edit-registry.generated.json'), {
    runId,
    liveEditCapabilities: runtimeCapabilityReport.liveEditCapabilities
  });

  return gameDsl;
}

function createSideScrollingSceneRawDsl(input: { playerLabel?: string; playerVisualAssetIntentRef?: string; includeScenes?: boolean } = {}): RawGameDsl {
  const base = createSideScrollingRunAndGunRawDsl();
  const enemyType = base.enemyTypes[0];
  const playerVisualAssetIntentRef = input.playerVisualAssetIntentRef ?? 'player_red_runner';

  return RawGameDslSchema.parse({
    ...base,
    player: {
      ...base.player,
      label: input.playerLabel ?? base.player.label,
      visual: {
        assetIntentRef: playerVisualAssetIntentRef,
        styleRef: 'style_pixel_16',
        facingMode: 'flip_x',
        animationSetRef: 'anim_run_jump_shoot'
      }
    },
    enemyTypes: [
      {
        ...enemyType,
        behaviorRef: 'behavior_ground_patrol',
        visual: {
          assetIntentRef: 'enemy_mech_drone',
          styleRef: 'style_pixel_16',
          facingMode: 'flip_x',
          animationSetRef: 'anim_enemy_patrol'
        },
        colliderRef: 'collider_small_enemy',
        movementRef: 'movement_ground_patrol',
        tags: ['mechanical']
      }
    ],
    ...(input.includeScenes === false
      ? {}
      : {
          scenes: [
            {
              id: 'level_01',
              theme: {
                id: 'snow_base_night',
                style: 'pixel art 16 bit',
                biome: 'snow base',
                timeOfDay: 'night',
                terrainMaterialSet: 'terrain_snow_metal'
              },
              backgroundLayers: [
                {
                  id: 'sky_night',
                  role: 'sky',
                  assetIntentRef: 'scene_night_sky',
                  parallax: 0,
                  fixedToCamera: true,
                  repeatX: true,
                  depth: -40
                }
              ],
              platforms: [
                {
                  id: 'ground_intro_visual',
                  x: 0,
                  y: 500,
                  width: 1280,
                  height: 40,
                  shape: 'rectangle',
                  materialRef: 'terrain_snow_metal',
                  visualAssetIntentRef: 'tile_snow_metal_ground',
                  collision: { enabled: true },
                  tags: ['ground']
                }
              ],
              playerSpawn: { x: 120, y: 452 },
              enemyInstances: [{ id: 'enemy_intro_01', archetypeRef: enemyType.id, x: 720, y: 450, spawnRule: 'spawn_intro_drone' }],
              goal: { id: 'goal_exit_01', kind: 'reach', x: 1240, y: 460, visualAssetIntentRef: 'goal_exit_beacon' }
            }
          ]
        })
  });
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function valueAtJsonPointer(root: unknown, path: string): unknown {
  return path
    .split('/')
    .slice(1)
    .map(decodeJsonPointerSegment)
    .reduce<unknown>((cursor, segment) => {
      if (cursor === null || typeof cursor !== 'object') {
        return undefined;
      }
      return (cursor as Record<string, unknown>)[segment];
    }, root);
}

function decodeJsonPointerSegment(segment: string): string {
  return segment.replace(/~1/gu, '/').replace(/~0/gu, '~');
}
