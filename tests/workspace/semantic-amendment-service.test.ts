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
  buildGameDslArtifact,
  buildRuntimeCapabilityReport,
  RawGameDslSchema,
  SemanticEditProposalSchema,
  type GameDslArtifact
} from '../../packages/game-dsl/src/index.js';
import { createShooterRawDsl } from '../contracts/fixtures.js';

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
      proposal: { reviewState: 'accepted', validation: { schemaValid: true, previewBooted: true, runtimeNoException: true } },
      accept_log: {
        candidatePromotionResult: {
          status: 'promoted_candidate',
          previousRunId: runId,
          candidateRunId,
          activeRunId: candidateRunId
        }
      },
      undo_checkpoint: {
        beforeActiveRunId: runId,
        acceptedRunId: candidateRunId
      }
    });
    expect(JSON.stringify(accepted)).not.toContain(root);
    await expect(projectStore.readLatestRun(projectId)).resolves.toMatchObject({ run_id: candidateRunId });
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ latest_run_id: candidateRunId, status: 'PREVIEW_READY' });
    const candidateCurrent = JSON.parse(await readFile(workspace.getLiveCurrentVersionPath(projectId, candidateRunId), 'utf8')) as { versionId: string };
    expect(candidateCurrent.versionId).toBe('v_initial');

    const undone = await service.undo(projectId, runId, proposalId, { reason: 'restore previous active run' });

    expect(undone).toMatchObject({
      proposal: { reviewState: 'undone' },
      undo_log: { restoredRunId: runId, reason: 'restore previous active run' }
    });
    await expect(projectStore.readLatestRun(projectId)).resolves.toMatchObject({ run_id: runId });
    await expect(projectStore.readProject(projectId)).resolves.toMatchObject({ latest_run_id: runId });
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
        requiresRuntimeRevert: false
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
