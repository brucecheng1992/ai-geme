import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { NotFoundException } from '@nestjs/common';

import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import { DslLiveEditService } from './dsl-live-edit.service.js';
import { ProjectStoreService } from './project-store.service.js';
import { ProjectRequestError } from './project-request.error.js';
import { RunStoreService } from './run-store.service.js';
import { resolveLiveRuntimeCapabilityReport } from './runtime-capability-resolution.js';
import {
  buildSemanticAmendmentReviewArtifactRef,
  readSemanticAmendmentProposal,
  readSemanticAmendmentReviewArtifact,
  writeSemanticAmendmentCandidateArtifact,
  writeSemanticAmendmentProposal,
  writeSemanticAmendmentReviewArtifact
} from './semantic-amendment-artifacts.js';
import {
  assertRunBelongsToProject,
  readLiveCurrentVersionIfPresent,
  readRequiredLiveCurrentVersion,
  restoreLiveVersion
} from './semantic-amendment-live-state.js';
import {
  type AcceptSemanticAmendmentResponse,
  type PreviewSemanticAmendmentResponse,
  type RejectSemanticAmendmentResponse,
  type SemanticAmendmentAcceptLog,
  type SemanticAmendmentCandidateArtifactCheckpoint,
  type SemanticAmendmentPreparedLiveEdit,
  type SemanticAmendmentPreviewState,
  type SemanticAmendmentRejectLog,
  type SemanticAmendmentUndoCheckpoint,
  type SemanticAmendmentUndoCheckpointArtifact,
  type SemanticAmendmentUndoLog,
  type SemanticAmendmentUndoLogArtifact,
  type SemanticAmendmentVersionSummary,
  type UndoSemanticAmendmentResponse
} from './semantic-amendment.types.js';
import {
  DslPatchV1Schema,
  GameDslArtifactSchema,
  SemanticEditProposalSchema,
  buildRuntimeCapabilityReport,
  validateGameDslArtifact,
  type GameDslArtifact,
  type SceneIr,
  type SemanticEditProposal
} from '../../../../packages/game-dsl/src/index.js';
import type { AssetIntentManifest } from '../../../../packages/asset-pipeline/src/index.js';
import type { RunRecord } from './project-state.types.js';
import { buildCandidateArtifactBundle, buildPlayerThemeCandidateDsl } from './semantic-amendment-candidate-artifacts.js';

export type SemanticAmendmentLifecycleDeps = {
  projectStore: ProjectStoreService;
  runStore: RunStoreService;
  workspace: LocalWorkspaceService;
  liveEdit: DslLiveEditService;
  now: () => Date;
};

export async function previewSemanticAmendment(
  deps: SemanticAmendmentLifecycleDeps,
  projectId: string,
  runId: string,
  proposalId: string
): Promise<PreviewSemanticAmendmentResponse> {
  await assertRunBelongsToProject(deps.runStore, projectId, runId);
  const proposal = await readProposal(deps.workspace, projectId, runId, proposalId);
  if (proposal.reviewState !== 'proposed') {
    throw new ProjectRequestError(`proposal cannot be previewed from state: ${proposal.reviewState}`);
  }
  if (proposal.execution.mode === 'candidate_regeneration') {
    return await previewCandidateAmendment(deps, projectId, runId, proposalId, proposal);
  }
  if (proposal.execution.mode !== 'hot_runtime_patch' && proposal.execution.mode !== 'dsl_patch_warm_restart') {
    throw new ProjectRequestError(`proposal mode is not previewable by the live-edit lifecycle: ${proposal.execution.mode}`);
  }
  if (proposal.candidate?.dslPatch === undefined) {
    throw new ProjectRequestError('proposal does not contain a DSL patch candidate.');
  }

  const current = await deps.liveEdit.ensureLiveVersion({ projectId, runId });
  const baseDsl = GameDslArtifactSchema.parse(JSON.parse(await readFile(current.dslArtifactPath, 'utf8')));
  const patch = DslPatchV1Schema.parse({
    artifactKind: 'dsl_patch',
    schemaVersion: 'dsl_patch.v1',
    patchId: patchIdForProposal(proposal.id),
    runId,
    baseDslId: baseDsl.dslId,
    baseVersionId: current.versionId,
    source: 'workbench',
    intent: proposal.understanding.summary,
    ops: proposal.candidate.dslPatch.ops
  });
  const capabilityReport = await resolveLiveRuntimeCapabilityReport({ projectId, runId, gameDsl: baseDsl, workspace: deps.workspace });
  const prepared = await deps.liveEdit.prepareLiveEditPatch({ projectId, runId, patch, capabilityReport });
  const preparedLiveEdit = toPreparedLiveEdit(prepared);
  const previewState: SemanticAmendmentPreviewState = {
    proposalId,
    projectId,
    runId,
    reviewState: prepared.validationReport.status === 'valid' && prepared.status !== 'unsupported' ? 'previewing' : 'failed',
    executionMode: proposal.execution.mode,
    preparedLiveEdit,
    ...(prepared.validationReport.status === 'valid' && prepared.status !== 'unsupported'
      ? {}
      : { failureReason: prepared.validationReport.errors[0]?.message ?? prepared.liveUpdatePlan.reason ?? 'Preview preparation failed.' }),
    createdAt: deps.now().toISOString()
  };
  const nextProposal = withReviewState(proposal, previewState.reviewState, {
    schemaValid: prepared.validationReport.status === 'valid',
    runtimeNoException: false
  });
  const previewRef = await writeSemanticAmendmentReviewArtifact(deps.workspace, projectId, runId, proposalId, 'previewState', previewState);
  await writeSemanticAmendmentProposal(deps.workspace, projectId, runId, nextProposal);

  return {
    ok: true,
    proposal: nextProposal,
    preview_state: previewState,
    artifact_refs: [previewRef]
  };
}

export async function acceptSemanticAmendment(
  deps: SemanticAmendmentLifecycleDeps,
  projectId: string,
  runId: string,
  proposalId: string,
  body: unknown
): Promise<AcceptSemanticAmendmentResponse> {
  await assertRunBelongsToProject(deps.runStore, projectId, runId);
  const proposal = await readProposal(deps.workspace, projectId, runId, proposalId);
  if (proposal.reviewState !== 'previewing') {
    throw new ProjectRequestError(`proposal cannot be accepted from state: ${proposal.reviewState}`);
  }
  if (proposal.execution.mode === 'candidate_regeneration') {
    return await acceptCandidateAmendment(deps, projectId, runId, proposalId, proposal);
  }
  const previewState = await readSemanticAmendmentReviewArtifact<SemanticAmendmentPreviewState>(
    deps.workspace,
    projectId,
    runId,
    proposalId,
    'previewState'
  );
  if (previewState.preparedLiveEdit === undefined) {
    throw new ProjectRequestError('proposal preview does not contain a prepared live edit.');
  }

  const beforeAcceptVersion = await readRequiredLiveCurrentVersion(deps.workspace, projectId, runId);
  const runtimeApplyReport = parseRuntimeApplyReport(body);
  const recorded = await deps.liveEdit.recordRuntimeApplyResult({
    projectId,
    runId,
    patchId: previewState.preparedLiveEdit.patch_id,
    report: runtimeApplyReport
  });
  const runtimeApplyResult = {
    ok: true as const,
    patch_id: recorded.patchId,
    status: recorded.status,
    apply_mode: recorded.applyMode,
    ...(recorded.versionId === undefined ? {} : { version_id: recorded.versionId }),
    runtime_apply_report: recorded.runtimeApplyReport
  };
  const accepted = recorded.status === 'applied_hot' || recorded.status === 'applied_warm_restart';
  const acceptedAt = deps.now().toISOString();
  const nextProposal = withReviewState(proposal, accepted ? 'accepted' : 'failed', {
    runtimeNoException: accepted,
    previewBooted: accepted
  });
  const acceptLog: SemanticAmendmentAcceptLog = {
    proposalId,
    projectId,
    runId,
    acceptedAt,
    previousReviewState: proposal.reviewState,
    runtimeApplyResult
  };
  const acceptRef = await writeSemanticAmendmentReviewArtifact(deps.workspace, projectId, runId, proposalId, 'acceptLog', acceptLog);
  const artifactRefs = [acceptRef];
  let undoCheckpoint: SemanticAmendmentUndoCheckpoint | undefined;

  if (accepted) {
    const undoCheckpointArtifact: SemanticAmendmentUndoCheckpointArtifact = {
      proposalId,
      projectId,
      runId,
      acceptedAt,
      beforeAcceptVersion,
      acceptedVersionId: recorded.versionId
    };
    undoCheckpoint = sanitizeUndoCheckpoint(undoCheckpointArtifact);
    artifactRefs.push(await writeSemanticAmendmentReviewArtifact(deps.workspace, projectId, runId, proposalId, 'undoCheckpoint', undoCheckpointArtifact));
  }

  await writeSemanticAmendmentProposal(deps.workspace, projectId, runId, nextProposal);

  return {
    ok: true,
    proposal: nextProposal,
    accept_log: acceptLog,
    ...(undoCheckpoint === undefined ? {} : { undo_checkpoint: undoCheckpoint }),
    artifact_refs: artifactRefs
  };
}

export async function rejectSemanticAmendment(
  deps: SemanticAmendmentLifecycleDeps,
  projectId: string,
  runId: string,
  proposalId: string,
  body: unknown
): Promise<RejectSemanticAmendmentResponse> {
  await assertRunBelongsToProject(deps.runStore, projectId, runId);
  const proposal = await readProposal(deps.workspace, projectId, runId, proposalId);
  if (proposal.reviewState === 'accepted' || proposal.reviewState === 'undone') {
    throw new ProjectRequestError(`proposal cannot be rejected from state: ${proposal.reviewState}`);
  }
  const candidateArtifactCheckpoint =
    proposal.reviewState === 'previewing' && proposal.execution.mode === 'candidate_regeneration'
      ? buildCandidateArtifactCheckpoint(
          await readSemanticAmendmentReviewArtifact<SemanticAmendmentPreviewState>(
            deps.workspace,
            projectId,
            runId,
            proposalId,
            'previewState'
          )
        )
      : undefined;

  const rejectLog: SemanticAmendmentRejectLog = {
    proposalId,
    projectId,
    runId,
    rejectedAt: deps.now().toISOString(),
    previousReviewState: proposal.reviewState,
    ...parseOptionalReason(body),
    requiresRuntimeRevert: proposal.reviewState === 'previewing' && proposal.execution.mode !== 'candidate_regeneration',
    ...(candidateArtifactCheckpoint === undefined ? {} : { candidateArtifactCheckpoint })
  };
  const nextProposal = withReviewState(proposal, 'rejected');
  const rejectRef = await writeSemanticAmendmentReviewArtifact(deps.workspace, projectId, runId, proposalId, 'rejectLog', rejectLog);
  await writeSemanticAmendmentProposal(deps.workspace, projectId, runId, nextProposal);

  return {
    ok: true,
    proposal: nextProposal,
    reject_log: rejectLog,
    artifact_refs: [rejectRef]
  };
}

export async function undoSemanticAmendment(
  deps: SemanticAmendmentLifecycleDeps,
  projectId: string,
  runId: string,
  proposalId: string,
  body: unknown
): Promise<UndoSemanticAmendmentResponse> {
  await assertRunBelongsToProject(deps.runStore, projectId, runId);
  const proposal = await readProposal(deps.workspace, projectId, runId, proposalId);
  if (proposal.reviewState !== 'accepted') {
    throw new ProjectRequestError(`proposal cannot be undone from state: ${proposal.reviewState}`);
  }
  const checkpoint = await readSemanticAmendmentReviewArtifact<SemanticAmendmentUndoCheckpointArtifact>(
    deps.workspace,
    projectId,
    runId,
    proposalId,
    'undoCheckpoint'
  );
  if (checkpoint.proposalId !== proposalId || checkpoint.projectId !== projectId || checkpoint.runId !== runId) {
    throw new ProjectRequestError(`undo checkpoint identity does not match run: ${projectId}/${runId}/${proposalId}`);
  }
  if (checkpoint.acceptedRunId !== undefined) {
    return await undoCandidateAmendment(deps, projectId, runId, proposalId, proposal, checkpoint, body);
  }
  if (checkpoint.acceptedVersionId === undefined) {
    throw new ProjectRequestError('undo checkpoint is missing the accepted version id.');
  }
  if (checkpoint.beforeAcceptVersion === undefined) {
    throw new ProjectRequestError('undo checkpoint is missing the previous live version.');
  }
  const currentVersion = await readRequiredLiveCurrentVersion(deps.workspace, projectId, runId);
  if (currentVersion.versionId !== checkpoint.acceptedVersionId) {
    throw new ProjectRequestError('cannot undo semantic amendment because live current has advanced after this proposal was accepted.');
  }
  const restoredVersion = await restoreLiveVersion({
    workspace: deps.workspace,
    projectId,
    runId,
    version: checkpoint.beforeAcceptVersion,
    updatedAt: deps.now().toISOString()
  });
  const undoLogArtifact: SemanticAmendmentUndoLogArtifact = {
    proposalId,
    projectId,
    runId,
    undoneAt: deps.now().toISOString(),
    restoredVersion,
    ...parseOptionalReason(body)
  };
  const undoLog: SemanticAmendmentUndoLog = sanitizeUndoLog(undoLogArtifact);
  const nextProposal = withReviewState(proposal, 'undone');
  const undoRef = await writeSemanticAmendmentReviewArtifact(deps.workspace, projectId, runId, proposalId, 'undoLog', undoLogArtifact);
  await writeSemanticAmendmentProposal(deps.workspace, projectId, runId, nextProposal);

  return {
    ok: true,
    proposal: nextProposal,
    undo_log: undoLog,
    artifact_refs: [undoRef, buildSemanticAmendmentReviewArtifactRef(proposalId, 'undoCheckpoint')]
  };
}

async function previewCandidateAmendment(
  deps: SemanticAmendmentLifecycleDeps,
  projectId: string,
  runId: string,
  proposalId: string,
  proposal: SemanticEditProposal
): Promise<PreviewSemanticAmendmentResponse> {
  if (!isPlayerThemeRegeneration(proposal)) {
    throw new ProjectRequestError('candidate regeneration is only implemented for player theme amendments.');
  }
  if (proposal.candidate?.candidateBrief === undefined) {
    throw new ProjectRequestError('candidate regeneration proposal is missing candidate brief.');
  }

  const current = await deps.liveEdit.ensureLiveVersion({ projectId, runId });
  const baseDsl = GameDslArtifactSchema.parse(JSON.parse(await readFile(current.dslArtifactPath, 'utf8')));
  const candidateRunId = candidateRunIdForProposal(proposalId);
  const candidateDsl = buildPlayerThemeCandidateDsl(baseDsl, candidateRunId);
  const validation = validateGameDslArtifact(candidateDsl);
  const createdAt = deps.now().toISOString();
  if (!validation.ok) {
    const previewState: SemanticAmendmentPreviewState = {
      proposalId,
      projectId,
      runId,
      reviewState: 'failed',
      executionMode: proposal.execution.mode,
      failureReason: validation.report.errors[0]?.message ?? 'Candidate DSL validation failed.',
      createdAt
    };
    const nextProposal = withReviewState(proposal, 'failed', {
      schemaValid: false,
      runtimeNoException: false,
      previewBooted: false
    });
    const previewRef = await writeSemanticAmendmentReviewArtifact(deps.workspace, projectId, runId, proposalId, 'previewState', previewState);
    await writeSemanticAmendmentProposal(deps.workspace, projectId, runId, nextProposal);

    return {
      ok: true,
      proposal: nextProposal,
      preview_state: previewState,
      artifact_refs: [previewRef]
    };
  }

  const candidateArtifacts = buildCandidateArtifactBundle({
    projectId,
    sourceRunId: runId,
    candidateRunId,
    proposal,
    baseDsl,
    candidateDsl
  });
  const previewArtifactRefs = await Promise.all([
    writeSemanticAmendmentCandidateArtifact(deps.workspace, projectId, runId, proposalId, 'candidateBrief', proposal.candidate.candidateBrief),
    writeSemanticAmendmentCandidateArtifact(deps.workspace, projectId, runId, proposalId, 'candidateDsl', candidateDsl),
    writeSemanticAmendmentCandidateArtifact(deps.workspace, projectId, runId, proposalId, 'candidateDslDiff', candidateArtifacts.candidateDslDiff),
    ...(candidateArtifacts.candidateSceneIr === undefined
      ? []
      : [writeSemanticAmendmentCandidateArtifact(deps.workspace, projectId, runId, proposalId, 'candidateSceneIr', candidateArtifacts.candidateSceneIr)]),
    ...(candidateArtifacts.candidateSceneIrDiff === undefined
      ? []
      : [writeSemanticAmendmentCandidateArtifact(deps.workspace, projectId, runId, proposalId, 'candidateSceneIrDiff', candidateArtifacts.candidateSceneIrDiff)]),
    ...(candidateArtifacts.candidateAssetIntentManifest === undefined
      ? []
      : [
          writeSemanticAmendmentCandidateArtifact(
            deps.workspace,
            projectId,
            runId,
            proposalId,
            'candidateAssetIntentManifest',
            candidateArtifacts.candidateAssetIntentManifest
          )
        ]),
    ...(candidateArtifacts.candidateAssetDiff === undefined
      ? []
      : [writeSemanticAmendmentCandidateArtifact(deps.workspace, projectId, runId, proposalId, 'candidateAssetDiff', candidateArtifacts.candidateAssetDiff)])
  ]);
  const previewArtifactRefById = Object.fromEntries(previewArtifactRefs.map((artifact) => [artifact.id, artifact.path]));

  if (!candidateArtifacts.hasVisibleEffect) {
    const previewState: SemanticAmendmentPreviewState = {
      proposalId,
      projectId,
      runId,
      reviewState: 'failed',
      executionMode: proposal.execution.mode,
      failureReason: 'AMENDMENT_NO_VISIBLE_EFFECT',
      createdAt
    };
    const nextProposal = withReviewState(
      {
        ...proposal,
        candidate: {
          ...proposal.candidate,
          candidateDsl,
          artifactRefs: {
            ...(proposal.candidate.artifactRefs ?? {}),
            ...previewArtifactRefById
          }
        }
      },
      'failed',
      {
        schemaValid: true,
        runtimeNoException: false,
        previewBooted: false
      }
    );
    const previewRef = await writeSemanticAmendmentReviewArtifact(deps.workspace, projectId, runId, proposalId, 'previewState', previewState);
    await writeSemanticAmendmentProposal(deps.workspace, projectId, runId, nextProposal);

    return {
      ok: true,
      proposal: nextProposal,
      preview_state: previewState,
      artifact_refs: [...previewArtifactRefs, previewRef]
    };
  }

  const candidateRuntimeCapabilityReport = buildRuntimeCapabilityReport({ runId: candidateRunId, validatedDsl: candidateDsl });
  const candidateRun = await writeCandidateRunArtifacts(deps, {
    projectId,
    sourceRunId: runId,
    candidateRunId,
    proposalId,
    candidateDsl,
    candidateSceneIr: candidateArtifacts.candidateSceneIr,
    candidateAssetIntentManifest: candidateArtifacts.candidateAssetIntentManifest,
    candidateRuntimeCapabilityReport,
    createdAt
  });
  const runArtifactRefs = await Promise.all([
    writeSemanticAmendmentCandidateArtifact(deps.workspace, projectId, runId, proposalId, 'candidateRun', candidateRun),
    writeSemanticAmendmentCandidateArtifact(deps.workspace, projectId, runId, proposalId, 'candidateRuntimeCapabilityReport', candidateRuntimeCapabilityReport)
  ]);
  const candidateRefs = [...previewArtifactRefs, ...runArtifactRefs];
  const candidateRefById = Object.fromEntries(candidateRefs.map((artifact) => [artifact.id, artifact.path]));
  const candidatePreview = {
    candidateRunId,
    candidateBriefRef: candidateRefById.candidateBrief,
    candidateDslRef: candidateRefById.candidateDsl,
    candidateDslDiffRef: candidateRefById.candidateDslDiff,
    ...(candidateRefById.candidateSceneIr === undefined ? {} : { candidateSceneIrRef: candidateRefById.candidateSceneIr }),
    ...(candidateRefById.candidateSceneIrDiff === undefined ? {} : { candidateSceneIrDiffRef: candidateRefById.candidateSceneIrDiff }),
    ...(candidateRefById.candidateAssetIntentManifest === undefined ? {} : { candidateAssetIntentManifestRef: candidateRefById.candidateAssetIntentManifest }),
    ...(candidateRefById.candidateAssetDiff === undefined ? {} : { candidateAssetDiffRef: candidateRefById.candidateAssetDiff }),
    candidateRunRef: candidateRefById.candidateRun,
    candidateRuntimeCapabilityReportRef: candidateRefById.candidateRuntimeCapabilityReport,
    previewAvailable: validation.ok,
    qaStatus: 'not_run' as const
  };
  const previewState: SemanticAmendmentPreviewState = {
    proposalId,
    projectId,
    runId,
    reviewState: 'previewing',
    executionMode: proposal.execution.mode,
    candidatePreview,
    createdAt
  };
  const nextProposal = withReviewState(
    {
      ...proposal,
      candidate: {
        ...proposal.candidate,
        candidateRunId,
        candidateDsl,
        artifactRefs: {
          ...(proposal.candidate.artifactRefs ?? {}),
          ...candidateRefById
        }
      }
    },
    'previewing',
    {
      schemaValid: validation.ok
    }
  );
  const previewRef = await writeSemanticAmendmentReviewArtifact(deps.workspace, projectId, runId, proposalId, 'previewState', previewState);
  await writeSemanticAmendmentProposal(deps.workspace, projectId, runId, nextProposal);

  return {
    ok: true,
    proposal: nextProposal,
    preview_state: previewState,
    artifact_refs: [...candidateRefs, previewRef]
  };
}

async function acceptCandidateAmendment(
  deps: SemanticAmendmentLifecycleDeps,
  projectId: string,
  runId: string,
  proposalId: string,
  proposal: SemanticEditProposal
): Promise<AcceptSemanticAmendmentResponse> {
  const previewState = await readSemanticAmendmentReviewArtifact<SemanticAmendmentPreviewState>(
    deps.workspace,
    projectId,
    runId,
    proposalId,
    'previewState'
  );
  if (previewState.candidatePreview === undefined) {
    throw new ProjectRequestError('candidate preview state is required to accept candidate regeneration.');
  }
  const acceptedAt = deps.now().toISOString();
  const candidateRun = await deps.runStore.readRun(previewState.candidatePreview.candidateRunId);
  if (candidateRun.project_id !== projectId) {
    throw new ProjectRequestError(`candidate run does not belong to project: ${candidateRun.run_id}`);
  }
  const candidateDsl = GameDslArtifactSchema.parse(
    JSON.parse(await readFile(deps.workspace.getModelOutputPath(projectId, candidateRun.run_id, 'game_dsl.json'), 'utf8'))
  );
  if (candidateDsl.runId !== candidateRun.run_id || candidateDsl.runId !== previewState.candidatePreview.candidateRunId) {
    throw new ProjectRequestError(`candidate DSL identity does not match candidate run: ${candidateRun.run_id}`);
  }
  const beforeActiveRun = await deps.projectStore.readLatestRun(projectId);
  const beforeAcceptVersion = await readLiveCurrentVersionIfPresent(deps.workspace, projectId, runId);
  await deps.liveEdit.initializeLiveVersion({ projectId, runId: candidateRun.run_id, artifact: candidateDsl });
  const activeRun = await deps.runStore.updateRunStatus(candidateRun.run_id, 'PREVIEW_READY');
  await promoteProjectLatestRun(deps, projectId, activeRun, acceptedAt);

  const candidatePromotionResult = {
    status: 'promoted_candidate' as const,
    previousRunId: beforeActiveRun.run_id,
    candidateRunId: candidateRun.run_id,
    activeRunId: activeRun.run_id
  };
  const candidateArtifactCheckpoint = buildCandidateArtifactCheckpoint(previewState);
  const nextProposal = withReviewState(proposal, 'accepted', {
    schemaValid: true
  });
  const acceptLog: SemanticAmendmentAcceptLog = {
    proposalId,
    projectId,
    runId,
    acceptedAt,
    previousReviewState: proposal.reviewState,
    candidatePromotionResult,
    candidateArtifactCheckpoint
  };
  const undoCheckpointArtifact: SemanticAmendmentUndoCheckpointArtifact = {
    proposalId,
    projectId,
    runId,
    acceptedAt,
    ...(beforeAcceptVersion === undefined ? {} : { beforeAcceptVersion }),
    beforeActiveRunId: beforeActiveRun.run_id,
    acceptedRunId: activeRun.run_id,
    candidateArtifactCheckpoint
  };
  const undoCheckpoint = sanitizeUndoCheckpoint(undoCheckpointArtifact);
  const acceptRef = await writeSemanticAmendmentReviewArtifact(deps.workspace, projectId, runId, proposalId, 'acceptLog', acceptLog);
  const checkpointRef = await writeSemanticAmendmentReviewArtifact(deps.workspace, projectId, runId, proposalId, 'undoCheckpoint', undoCheckpointArtifact);
  await writeSemanticAmendmentProposal(deps.workspace, projectId, runId, nextProposal);

  return {
    ok: true,
    proposal: nextProposal,
    accept_log: acceptLog,
    undo_checkpoint: undoCheckpoint,
    artifact_refs: [acceptRef, checkpointRef]
  };
}

async function undoCandidateAmendment(
  deps: SemanticAmendmentLifecycleDeps,
  projectId: string,
  runId: string,
  proposalId: string,
  proposal: SemanticEditProposal,
  checkpoint: SemanticAmendmentUndoCheckpointArtifact,
  body: unknown
): Promise<UndoSemanticAmendmentResponse> {
  if (checkpoint.beforeActiveRunId === undefined || checkpoint.acceptedRunId === undefined) {
    throw new ProjectRequestError('candidate undo checkpoint is missing active run ids.');
  }
  const latestRun = await deps.projectStore.readLatestRun(projectId);
  if (latestRun.run_id !== checkpoint.acceptedRunId) {
    throw new ProjectRequestError('cannot undo semantic amendment because active run has advanced after this proposal was accepted.');
  }
  const restoredRun = await deps.runStore.readRun(checkpoint.beforeActiveRunId);
  await promoteProjectLatestRun(deps, projectId, restoredRun, deps.now().toISOString());
  const restoredVersion =
    checkpoint.beforeAcceptVersion === undefined
      ? undefined
      : await restoreLiveVersion({
          workspace: deps.workspace,
          projectId,
          runId,
          version: checkpoint.beforeAcceptVersion,
          updatedAt: deps.now().toISOString()
        });
  const undoLogArtifact: SemanticAmendmentUndoLogArtifact = {
    proposalId,
    projectId,
    runId,
    undoneAt: deps.now().toISOString(),
    ...(restoredVersion === undefined ? {} : { restoredVersion }),
    restoredRunId: restoredRun.run_id,
    ...(checkpoint.candidateArtifactCheckpoint === undefined ? {} : { candidateArtifactCheckpoint: checkpoint.candidateArtifactCheckpoint }),
    ...parseOptionalReason(body)
  };
  const undoLog = sanitizeUndoLog(undoLogArtifact);
  const nextProposal = withReviewState(proposal, 'undone');
  const undoRef = await writeSemanticAmendmentReviewArtifact(deps.workspace, projectId, runId, proposalId, 'undoLog', undoLogArtifact);
  await writeSemanticAmendmentProposal(deps.workspace, projectId, runId, nextProposal);

  return {
    ok: true,
    proposal: nextProposal,
    undo_log: undoLog,
    artifact_refs: [undoRef, buildSemanticAmendmentReviewArtifactRef(proposalId, 'undoCheckpoint')]
  };
}

function isPlayerThemeRegeneration(proposal: SemanticEditProposal): boolean {
  return proposal.understanding.designDeltas.some((delta) => delta.kind === 'reskin_or_theme' && delta.target === 'player');
}

function candidateRunIdForProposal(proposalId: string): string {
  const suffix = proposalId
    .replace(/^amend_/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 48);
  return `run_candidate_${suffix}`;
}

async function writeCandidateRunArtifacts(
  deps: SemanticAmendmentLifecycleDeps,
  input: {
    projectId: string;
    sourceRunId: string;
    candidateRunId: string;
    proposalId: string;
    candidateDsl: GameDslArtifact;
    candidateSceneIr?: SceneIr;
    candidateAssetIntentManifest?: AssetIntentManifest;
    candidateRuntimeCapabilityReport: unknown;
    createdAt: string;
  }
): Promise<RunRecord & { sourceRunId: string; proposalId: string }> {
  const candidateRun = await deps.runStore.createRun({ projectId: input.projectId, runId: input.candidateRunId, createdAt: input.createdAt });
  const updatedRun = await deps.runStore.updateRunStatus(input.candidateRunId, 'PREVIEW_READY');
  await deps.runStore.appendEvent(input.candidateRunId, {
    timestamp: input.createdAt,
    type: 'semantic-amendment.candidate.created',
    message: `Candidate run generated from ${input.sourceRunId} for proposal ${input.proposalId}.`
  });
  await writeJson(deps.workspace.getModelOutputPath(input.projectId, input.candidateRunId, 'game_dsl.json'), input.candidateDsl);
  if (input.candidateSceneIr !== undefined) {
    await writeJson(deps.workspace.getModelOutputPath(input.projectId, input.candidateRunId, 'game.scene.ir.json'), input.candidateSceneIr);
  }
  if (input.candidateAssetIntentManifest !== undefined) {
    await writeJson(deps.workspace.getModelOutputPath(input.projectId, input.candidateRunId, 'asset_intent_manifest.json'), input.candidateAssetIntentManifest);
  }
  await writeJson(deps.workspace.getModelOutputPath(input.projectId, input.candidateRunId, 'runtime_capability_report.json'), input.candidateRuntimeCapabilityReport);
  return {
    ...updatedRun,
    sourceRunId: input.sourceRunId,
    proposalId: input.proposalId,
    created_at: candidateRun.created_at
  };
}

async function promoteProjectLatestRun(
  deps: SemanticAmendmentLifecycleDeps,
  projectId: string,
  run: RunRecord,
  updatedAt: string
): Promise<void> {
  await deps.projectStore.writeLatestRun(projectId, run);
  const project = await deps.projectStore.readProject(projectId);
  await deps.projectStore.writeProject({
    ...project,
    latest_run_id: run.run_id,
    status: run.status,
    updated_at: updatedAt
  });
}

async function readProposal(
  workspace: LocalWorkspaceService,
  projectId: string,
  runId: string,
  proposalId: string
): Promise<SemanticEditProposal> {
  let proposal: SemanticEditProposal;
  try {
    proposal = await readSemanticAmendmentProposal(workspace, projectId, runId, proposalId);
  } catch (error) {
    if (isNodeErrorCode(error, 'ENOENT')) {
      throw new NotFoundException('Semantic amendment proposal not found.');
    }
    throw error;
  }
  if (proposal.projectId !== projectId || proposal.runId !== runId || proposal.id !== proposalId) {
    throw new ProjectRequestError(`semantic amendment proposal identity does not match run: ${projectId}/${runId}/${proposalId}`);
  }
  return proposal;
}

function withReviewState(
  proposal: SemanticEditProposal,
  reviewState: SemanticEditProposal['reviewState'],
  validation: NonNullable<SemanticEditProposal['validation']> = {}
): SemanticEditProposal {
  return SemanticEditProposalSchema.parse({
    ...proposal,
    reviewState,
    validation: {
      ...(proposal.validation ?? {}),
      ...validation
    }
  });
}

function buildCandidateArtifactCheckpoint(previewState: SemanticAmendmentPreviewState): SemanticAmendmentCandidateArtifactCheckpoint {
  const candidatePreview = previewState.candidatePreview;
  if (candidatePreview === undefined) {
    throw new ProjectRequestError('candidate artifact checkpoint requires a candidate preview state.');
  }

  return {
    proposalId: previewState.proposalId,
    projectId: previewState.projectId,
    sourceRunId: previewState.runId,
    candidateRunId: candidatePreview.candidateRunId,
    candidateDslRef: candidatePreview.candidateDslRef,
    candidateDslDiffRef: candidatePreview.candidateDslDiffRef,
    ...(candidatePreview.candidateBriefRef === undefined ? {} : { candidateBriefRef: candidatePreview.candidateBriefRef }),
    ...(candidatePreview.candidateSceneIrRef === undefined ? {} : { candidateSceneIrRef: candidatePreview.candidateSceneIrRef }),
    ...(candidatePreview.candidateSceneIrDiffRef === undefined ? {} : { candidateSceneIrDiffRef: candidatePreview.candidateSceneIrDiffRef }),
    ...(candidatePreview.candidateAssetIntentManifestRef === undefined ? {} : { candidateAssetIntentManifestRef: candidatePreview.candidateAssetIntentManifestRef }),
    ...(candidatePreview.candidateAssetDiffRef === undefined ? {} : { candidateAssetDiffRef: candidatePreview.candidateAssetDiffRef }),
    ...(candidatePreview.candidateRunRef === undefined ? {} : { candidateRunRef: candidatePreview.candidateRunRef }),
    ...(candidatePreview.candidateRuntimeCapabilityReportRef === undefined
      ? {}
      : { candidateRuntimeCapabilityReportRef: candidatePreview.candidateRuntimeCapabilityReportRef }),
    activeRunMutation: false
  };
}

function parseRuntimeApplyReport(body: unknown): unknown {
  if (!isRecord(body) || body.runtimeApplyReport === undefined) {
    throw new ProjectRequestError('runtimeApplyReport is required to accept a previewed semantic amendment.');
  }
  return body.runtimeApplyReport;
}

function parseOptionalReason(body: unknown): { reason?: string } {
  if (body === undefined || body === null) {
    return {};
  }
  if (!isRecord(body)) {
    throw new ProjectRequestError('Request body must be an object when provided.');
  }
  if (body.reason === undefined) {
    return {};
  }
  if (typeof body.reason !== 'string' || body.reason.trim().length === 0) {
    throw new ProjectRequestError('reason must be a non-empty string when provided.');
  }
  return { reason: body.reason.trim() };
}

function patchIdForProposal(proposalId: string): string {
  const suffix = proposalId
    .replace(/^amend_/, 'am_')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 34);
  return `patch_${suffix}`;
}

function toPreparedLiveEdit(prepared: Awaited<ReturnType<DslLiveEditService['prepareLiveEditPatch']>>): SemanticAmendmentPreparedLiveEdit {
  return {
    patch_id: prepared.patchId,
    status: prepared.status,
    apply_mode: prepared.applyMode,
    runtime_patch: prepared.runtimePatch,
    validation_report: prepared.validationReport,
    live_update_plan: prepared.liveUpdatePlan,
    live_update_plan_ref: { artifact: `${prepared.patchId}.live_update_plan.json`, patchId: prepared.patchId }
  };
}

function sanitizeUndoCheckpoint(checkpoint: SemanticAmendmentUndoCheckpointArtifact): SemanticAmendmentUndoCheckpoint {
  return {
    ...checkpoint,
    ...(checkpoint.beforeAcceptVersion === undefined ? {} : { beforeAcceptVersion: summarizeLiveVersion(checkpoint.beforeAcceptVersion) })
  };
}

function sanitizeUndoLog(undoLog: SemanticAmendmentUndoLogArtifact): SemanticAmendmentUndoLog {
  return {
    ...undoLog,
    ...(undoLog.restoredVersion === undefined ? {} : { restoredVersion: summarizeLiveVersion(undoLog.restoredVersion) })
  };
}

function summarizeLiveVersion(version: SemanticAmendmentUndoCheckpointArtifact['beforeAcceptVersion']): SemanticAmendmentVersionSummary {
  if (version === undefined) {
    throw new ProjectRequestError('live version summary requires a version.');
  }
  return {
    versionId: version.versionId,
    ...(version.baseVersionId === undefined ? {} : { baseVersionId: version.baseVersionId }),
    dslId: version.dslId,
    updatedAt: version.updatedAt
  };
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === code;
}
