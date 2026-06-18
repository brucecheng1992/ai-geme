import { createHash } from 'node:crypto';
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
  buildGameDslArtifact,
  buildRuntimeCapabilityReport,
  validateGameDslArtifact,
  type DslPatchV1Operation,
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
  if (proposal.execution.mode === 'dsl_patch_warm_restart') {
    return await previewWarmRestartCandidateAmendment(deps, projectId, runId, proposalId, proposal);
  }
  if (proposal.execution.mode !== 'hot_runtime_patch') {
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
  const runtimePatchPlan = buildRuntimePatchPlan({
    projectId,
    runId,
    proposal,
    current,
    baseDsl,
    preparedLiveEdit
  });
  const runtimePatchPlanRef = await writeSemanticAmendmentReviewArtifact(deps.workspace, projectId, runId, proposalId, 'runtimePatchPlan', runtimePatchPlan);
  const previewState: SemanticAmendmentPreviewState = {
    proposalId,
    projectId,
    runId,
    reviewState: prepared.validationReport.status === 'valid' && prepared.status !== 'unsupported' ? 'previewing' : 'failed',
    executionMode: proposal.execution.mode,
    preparedLiveEdit,
    runtimePatchPlanRef: runtimePatchPlanRef.path,
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
    artifact_refs: [runtimePatchPlanRef, previewRef]
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
  if (proposal.execution.mode === 'candidate_regeneration' || proposal.execution.mode === 'dsl_patch_warm_restart') {
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
  const runtimeAccepted = recorded.status === 'applied_hot' || recorded.status === 'applied_warm_restart';
  const acceptedAt = deps.now().toISOString();
  let amendmentVerificationRef: Awaited<ReturnType<typeof writeSemanticAmendmentReviewArtifact>> | undefined;
  let amendmentVerification: ReturnType<typeof buildLiveEditAmendmentVerification> | undefined;
  let capabilityEffectVerificationRef: Awaited<ReturnType<typeof writeSemanticAmendmentReviewArtifact>> | undefined;
  let capabilityEffectVerification: ReturnType<typeof buildPatchCapabilityEffectVerification> | undefined;
  let authoritativePromotionRef: Awaited<ReturnType<typeof writeSemanticAmendmentReviewArtifact>> | undefined;
  if (runtimeAccepted) {
    const acceptedVersion = await readRequiredLiveCurrentVersion(deps.workspace, projectId, runId);
    const acceptedDsl = GameDslArtifactSchema.parse(JSON.parse(await readFile(acceptedVersion.dslArtifactPath, 'utf8')));
    capabilityEffectVerification = buildPatchCapabilityEffectVerification({
      proposal,
      sourceRunId: runId,
      patchId: previewState.preparedLiveEdit.patch_id,
      acceptedDsl,
      patchOps: proposal.candidate?.dslPatch?.ops ?? [],
      runtimeApplyReport: recorded.runtimeApplyReport,
      evidenceRoot: 'accepted_game_dsl'
    });
    amendmentVerification = buildLiveEditAmendmentVerification({
      proposal,
      runId,
      patchId: previewState.preparedLiveEdit.patch_id,
      runtimeApplyReport: recorded.runtimeApplyReport,
      acceptedDsl,
      ops: proposal.candidate?.dslPatch?.ops ?? [],
      capabilityEffectVerification
    });
    capabilityEffectVerificationRef = await writeSemanticAmendmentReviewArtifact(
      deps.workspace,
      projectId,
      runId,
      proposalId,
      'capabilityEffectVerification',
      capabilityEffectVerification
    );
    amendmentVerificationRef = await writeSemanticAmendmentReviewArtifact(
      deps.workspace,
      projectId,
      runId,
      proposalId,
      'amendmentVerification',
      amendmentVerification
    );
    if (amendmentVerification.status !== 'passed') {
      await restoreLiveVersion({
        workspace: deps.workspace,
        projectId,
        runId,
        version: beforeAcceptVersion,
        updatedAt: deps.now().toISOString()
      });
    }
  }
  const accepted = runtimeAccepted && amendmentVerification?.status === 'passed' && capabilityEffectVerification?.status === 'passed';
  if (accepted) {
    const acceptedVersion = await readRequiredLiveCurrentVersion(deps.workspace, projectId, runId);
    authoritativePromotionRef = await writeSemanticAmendmentReviewArtifact(
      deps.workspace,
      projectId,
      runId,
      proposalId,
      'authoritativePromotion',
      buildLiveVersionAuthoritativePromotion({
        proposal,
        projectId,
        runId,
        acceptedAt,
        beforeAcceptVersion,
        acceptedVersion,
        runtimePatchPlanRef: previewState.runtimePatchPlanRef,
        amendmentVerificationRef: amendmentVerificationRef?.path,
        capabilityEffectVerificationRef: capabilityEffectVerificationRef?.path
      })
    );
  }
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
    runtimeApplyResult,
    ...(previewState.runtimePatchPlanRef === undefined ? {} : { runtimePatchPlanRef: previewState.runtimePatchPlanRef }),
    ...(amendmentVerificationRef === undefined ? {} : { amendmentVerificationRef: amendmentVerificationRef.path }),
    ...(capabilityEffectVerificationRef === undefined ? {} : { capabilityEffectVerificationRef: capabilityEffectVerificationRef.path }),
    ...(authoritativePromotionRef === undefined ? {} : { authoritativePromotionRef: authoritativePromotionRef.path })
  };
  const acceptRef = await writeSemanticAmendmentReviewArtifact(deps.workspace, projectId, runId, proposalId, 'acceptLog', acceptLog);
  const artifactRefs = [
    ...(previewState.runtimePatchPlanRef === undefined ? [] : [buildSemanticAmendmentReviewArtifactRef(proposalId, 'runtimePatchPlan')]),
    ...(capabilityEffectVerificationRef === undefined ? [] : [capabilityEffectVerificationRef]),
    ...(amendmentVerificationRef === undefined ? [] : [amendmentVerificationRef]),
    ...(authoritativePromotionRef === undefined ? [] : [authoritativePromotionRef]),
    acceptRef
  ];
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

function buildRuntimePatchPlan(input: {
  projectId: string;
  runId: string;
  proposal: SemanticEditProposal;
  current: SemanticAmendmentVersionSummary;
  baseDsl: GameDslArtifact;
  preparedLiveEdit: SemanticAmendmentPreparedLiveEdit;
}) {
  const runtimeSessionId = `local-live-edit:${input.projectId}:${input.runId}:${input.current.versionId}`;
  const ops = input.proposal.candidate?.dslPatch?.ops ?? [];
  return {
    schemaVersion: 'step34.runtime-patch-plan.v1',
    proposalId: input.proposal.id,
    sessionKind: 'local_live_edit',
    handshakeStatus: 'not_run',
    runtimeSessionId,
    baseDslHash: stableSha256(input.baseDsl),
    patchId: input.preparedLiveEdit.patch_id,
    lifecycle: [
      'PATCH_PREPARING',
      input.preparedLiveEdit.status === 'unsupported' ? 'PATCH_PREPARE_FAILED' : 'PATCH_PREPARED',
      'PATCH_APPLYING',
      'PATCH_ACKNOWLEDGED',
      'PATCH_VERIFYING',
      'PATCH_PREVIEWING',
      'REVIEWABLE'
    ],
    operations: ops.map((op, index) => {
      const operationId = input.proposal.amendmentIr.operations[index]?.id ?? `op_${index}`;
      return {
        operationId,
        adapterId: input.proposal.executionPlan.operationPlan[index]?.patchAdapterId ?? `dsl-json-patch.${index}.v1`,
        targetRuntimeId: input.proposal.amendmentIr.operations[index]?.target?.id ?? input.proposal.amendmentIr.operations[index]?.target?.role ?? op.path,
        before: valueAtJsonPointer(input.baseDsl, op.path),
        after: op.value,
        reversible: true as const,
        runtimeSessionId,
        baseDslHash: stableSha256(input.baseDsl),
        verificationProbeIds: [`runtime_apply_report.appliedPaths#${op.path}`, `accepted_game_dsl#${op.path}`]
      };
    })
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
    proposal.reviewState === 'previewing' && (proposal.execution.mode === 'candidate_regeneration' || proposal.execution.mode === 'dsl_patch_warm_restart')
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
    requiresRuntimeRevert: proposal.reviewState === 'previewing' && proposal.execution.mode === 'hot_runtime_patch',
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
    writeSemanticAmendmentCandidateArtifact(deps.workspace, projectId, runId, proposalId, 'preservationContract', candidateArtifacts.preservationContract),
    writeSemanticAmendmentCandidateArtifact(deps.workspace, projectId, runId, proposalId, 'candidateArtifactPlan', candidateArtifacts.candidateArtifactPlan),
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
      : [writeSemanticAmendmentCandidateArtifact(deps.workspace, projectId, runId, proposalId, 'candidateAssetDiff', candidateArtifacts.candidateAssetDiff)]),
    writeSemanticAmendmentCandidateArtifact(deps.workspace, projectId, runId, proposalId, 'amendmentEffectDiff', candidateArtifacts.amendmentEffectDiff),
    writeSemanticAmendmentCandidateArtifact(
      deps.workspace,
      projectId,
      runId,
      proposalId,
      'capabilityEffectVerification',
      candidateArtifacts.capabilityEffectVerification
    ),
    writeSemanticAmendmentCandidateArtifact(
      deps.workspace,
      projectId,
      runId,
      proposalId,
      'candidateAmendmentVerification',
      candidateArtifacts.candidateAmendmentVerification
    )
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
    preservationContractRef: candidateRefById.preservationContract,
    candidateArtifactPlanRef: candidateRefById.candidateArtifactPlan,
    candidateDslRef: candidateRefById.candidateDsl,
    candidateDslDiffRef: candidateRefById.candidateDslDiff,
    ...(candidateRefById.candidateSceneIr === undefined ? {} : { candidateSceneIrRef: candidateRefById.candidateSceneIr }),
    ...(candidateRefById.candidateSceneIrDiff === undefined ? {} : { candidateSceneIrDiffRef: candidateRefById.candidateSceneIrDiff }),
    ...(candidateRefById.candidateAssetIntentManifest === undefined ? {} : { candidateAssetIntentManifestRef: candidateRefById.candidateAssetIntentManifest }),
    ...(candidateRefById.candidateAssetDiff === undefined ? {} : { candidateAssetDiffRef: candidateRefById.candidateAssetDiff }),
    amendmentEffectDiffRef: candidateRefById.amendmentEffectDiff,
    capabilityEffectVerificationRef: candidateRefById.capabilityEffectVerification,
    candidateAmendmentVerificationRef: candidateRefById.candidateAmendmentVerification,
    candidateRunRef: candidateRefById.candidateRun,
    candidateRuntimeCapabilityReportRef: candidateRefById.candidateRuntimeCapabilityReport,
    previewAvailable: validation.ok,
    qaStatus: candidateArtifacts.candidateAmendmentVerification.status
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

async function previewWarmRestartCandidateAmendment(
  deps: SemanticAmendmentLifecycleDeps,
  projectId: string,
  runId: string,
  proposalId: string,
  proposal: SemanticEditProposal
): Promise<PreviewSemanticAmendmentResponse> {
  if (proposal.candidate?.dslPatch === undefined) {
    throw new ProjectRequestError('warm restart proposal is missing DSL patch candidate.');
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
  if (prepared.status !== 'warm_restart_required' || prepared.applyMode !== 'warm_restart') {
    throw new ProjectRequestError(`warm restart proposal prepared unexpected mode: ${prepared.status}/${prepared.applyMode}`);
  }
  const candidateRunId = candidateRunIdForProposal(proposalId);
  const preparedCandidateDsl = GameDslArtifactSchema.parse(JSON.parse(await readFile(prepared.artifactRefs.pendingDslCandidate, 'utf8')));
  const candidateDsl = buildGameDslArtifact({
    rawDsl: preparedCandidateDsl.sourceDsl,
    runId: candidateRunId,
    intentPlan: {
      normalizedGenre: preparedCandidateDsl.intentPlanRef.normalizedGenre,
      ...(preparedCandidateDsl.intentPlanRef.matchedAlias === undefined ? {} : { matchedAlias: preparedCandidateDsl.intentPlanRef.matchedAlias })
    }
  });
  const candidateDslDiff = buildWarmRestartCandidateDslDiff({ proposal, sourceRunId: runId, candidateRunId, baseDsl, patchOps: proposal.candidate.dslPatch.ops });
  const capabilityEffectVerification = buildPatchCapabilityEffectVerification({
    proposal,
    sourceRunId: runId,
    candidateRunId,
    candidateDsl,
    patchOps: proposal.candidate.dslPatch.ops,
    evidenceRoot: 'candidate_game_dsl'
  });
  const amendmentVerification = buildWarmRestartAmendmentVerification({
    proposal,
    sourceRunId: runId,
    candidateRunId,
    candidateDsl,
    patchOps: proposal.candidate.dslPatch.ops,
    capabilityEffectVerification
  });
  const createdAt = deps.now().toISOString();
  const candidateRuntimeCapabilityReport = buildRuntimeCapabilityReport({ runId: candidateRunId, validatedDsl: candidateDsl });
  const candidateRun = await writeCandidateRunArtifacts(deps, {
    projectId,
    sourceRunId: runId,
    candidateRunId,
    proposalId,
    candidateDsl,
    candidateRuntimeCapabilityReport,
    createdAt
  });
  const candidateRefs = await Promise.all([
    writeSemanticAmendmentCandidateArtifact(deps.workspace, projectId, runId, proposalId, 'candidateDsl', candidateDsl),
    writeSemanticAmendmentCandidateArtifact(deps.workspace, projectId, runId, proposalId, 'candidateDslDiff', candidateDslDiff),
    writeSemanticAmendmentCandidateArtifact(deps.workspace, projectId, runId, proposalId, 'capabilityEffectVerification', capabilityEffectVerification),
    writeSemanticAmendmentCandidateArtifact(deps.workspace, projectId, runId, proposalId, 'candidateAmendmentVerification', amendmentVerification),
    writeSemanticAmendmentCandidateArtifact(deps.workspace, projectId, runId, proposalId, 'candidateRun', candidateRun),
    writeSemanticAmendmentCandidateArtifact(deps.workspace, projectId, runId, proposalId, 'candidateRuntimeCapabilityReport', candidateRuntimeCapabilityReport)
  ]);
  const candidateRefById = Object.fromEntries(candidateRefs.map((artifact) => [artifact.id, artifact.path]));
  const candidatePreview = {
    candidateRunId,
    candidateDslRef: candidateRefById.candidateDsl,
    candidateDslDiffRef: candidateRefById.candidateDslDiff,
    capabilityEffectVerificationRef: candidateRefById.capabilityEffectVerification,
    candidateAmendmentVerificationRef: candidateRefById.candidateAmendmentVerification,
    candidateRunRef: candidateRefById.candidateRun,
    candidateRuntimeCapabilityReportRef: candidateRefById.candidateRuntimeCapabilityReport,
    previewAvailable: true,
    qaStatus: amendmentVerification.status
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
    { schemaValid: true }
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
  if (previewState.candidatePreview.qaStatus !== 'passed' || previewState.candidatePreview.candidateAmendmentVerificationRef === undefined) {
    throw new ProjectRequestError('candidate amendment verification must pass before accepting candidate regeneration.');
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
  const sandboxCandidateDsl = GameDslArtifactSchema.parse(
    JSON.parse(await readFile(deps.workspace.getSemanticAmendmentCandidateArtifactPath(projectId, runId, proposalId, 'candidate_dsl.json'), 'utf8'))
  );
  if (JSON.stringify(candidateDsl) !== JSON.stringify(sandboxCandidateDsl)) {
    throw new ProjectRequestError(`candidate run DSL does not match semantic amendment candidate artifact: ${candidateRun.run_id}`);
  }
  const amendmentVerification = parseCandidateAmendmentVerification(
    JSON.parse(await readFile(deps.workspace.getSemanticAmendmentCandidateArtifactPath(projectId, runId, proposalId, 'candidate_amendment_verification.json'), 'utf8'))
  );
  const capabilityEffectVerification = parseCapabilityEffectVerification(
    JSON.parse(await readFile(deps.workspace.getSemanticAmendmentCandidateArtifactPath(projectId, runId, proposalId, 'capability_effect_verification.json'), 'utf8'))
  );
  if (
    amendmentVerification.proposalId !== proposalId ||
    amendmentVerification.sourceRunId !== runId ||
    amendmentVerification.candidateRunId !== candidateRun.run_id ||
    amendmentVerification.status !== 'passed'
  ) {
    throw new ProjectRequestError(`candidate amendment verification does not match accepted candidate run: ${candidateRun.run_id}`);
  }
  if (
    capabilityEffectVerification.proposalId !== proposalId ||
    capabilityEffectVerification.sourceRunId !== runId ||
    capabilityEffectVerification.candidateRunId !== candidateRun.run_id ||
    capabilityEffectVerification.status !== 'passed'
  ) {
    throw new ProjectRequestError(`capability-effect verification does not match accepted candidate run: ${candidateRun.run_id}`);
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
  const authoritativePromotionRef = await writeSemanticAmendmentReviewArtifact(
    deps.workspace,
    projectId,
    runId,
    proposalId,
    'authoritativePromotion',
    buildCandidateRunAuthoritativePromotion({
      proposal,
      projectId,
      runId,
      acceptedAt,
      beforeActiveRunId: beforeActiveRun.run_id,
      acceptedRunId: activeRun.run_id,
      afterActiveRunId: activeRun.run_id,
      candidateArtifactCheckpoint
    })
  );
  const nextProposal = withReviewState(proposal, 'accepted', {
    schemaValid: true
  });
  const acceptLog: SemanticAmendmentAcceptLog = {
    proposalId,
    projectId,
    runId,
    acceptedAt,
    previousReviewState: proposal.reviewState,
    authoritativePromotionRef: authoritativePromotionRef.path,
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
    artifact_refs: [authoritativePromotionRef, acceptRef, checkpointRef]
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

function buildWarmRestartCandidateDslDiff(input: {
  proposal: SemanticEditProposal;
  sourceRunId: string;
  candidateRunId: string;
  baseDsl: GameDslArtifact;
  patchOps: DslPatchV1Operation[];
}) {
  return {
    schemaVersion: 'semantic_amendment_candidate_dsl_diff.v1',
    proposalId: input.proposal.id,
    sourceRunId: input.sourceRunId,
    candidateRunId: input.candidateRunId,
    summary: input.proposal.understanding.summary,
    changes: input.patchOps.map((op) => ({
      path: op.path,
      before: valueAtJsonPointer(input.baseDsl, op.path),
      after: op.value
    }))
  };
}

function buildPatchCapabilityEffectVerification(input: {
  proposal: SemanticEditProposal;
  sourceRunId: string;
  candidateRunId?: string;
  patchId?: string;
  candidateDsl?: GameDslArtifact;
  acceptedDsl?: GameDslArtifact;
  patchOps: DslPatchV1Operation[];
  runtimeApplyReport?: NonNullable<SemanticAmendmentAcceptLog['runtimeApplyResult']>['runtime_apply_report'];
  evidenceRoot: 'candidate_game_dsl' | 'accepted_game_dsl';
}) {
  const effectChecks = input.proposal.executionPlan.verificationRequirements.map((effect, index) => {
    if (effect.kind !== 'property_changed') {
      return {
        checkId: `capability_effect_${index}`,
        effectKind: effect.kind,
        status: 'inconclusive' as const,
        expected: effect,
        evidenceRefs: [],
        reason: `No patch verifier is implemented for expected effect kind: ${effect.kind}.`
      };
    }
    const patchOp = input.patchOps.find((op) => patchOperationMatchesExpectedPropertyEffect(op, effect));
    const dsl = input.acceptedDsl ?? input.candidateDsl;
    const observed = patchOp === undefined || dsl === undefined ? undefined : valueAtJsonPointer(dsl, patchOp.path);
    const valueMatches = patchOp !== undefined && JSON.stringify(observed) === JSON.stringify(patchOp.value);
    const runtimeConfirmed = input.runtimeApplyReport === undefined || (patchOp !== undefined && input.runtimeApplyReport.appliedPaths.includes(patchOp.path));
    const status = patchOp !== undefined && valueMatches && runtimeConfirmed ? ('passed' as const) : ('failed' as const);
    return {
      checkId: `capability_effect_${index}`,
      effectKind: effect.kind,
      status,
      expected: effect,
      observed: {
        path: patchOp?.path,
        value: observed,
        runtimeConfirmed
      },
      evidenceRefs: [
        `${input.evidenceRoot}${patchOp === undefined ? '' : `#${patchOp.path}`}`,
        ...(input.runtimeApplyReport === undefined ? [] : ['runtime_apply_report.appliedPaths'])
      ],
      ...(status === 'passed' ? {} : { reason: `Expected property effect was not observed for ${effect.property}.` })
    };
  });
  const failed = effectChecks.filter((check) => check.status !== 'passed');

  return {
    schemaVersion: 'step34.capability-effect-verification.v1',
    proposalId: input.proposal.id,
    sourceRunId: input.sourceRunId,
    ...(input.candidateRunId === undefined ? {} : { candidateRunId: input.candidateRunId }),
    ...(input.patchId === undefined ? {} : { patchId: input.patchId }),
    executionMode: input.proposal.execution.mode,
    verificationRequirements: input.proposal.executionPlan.verificationRequirements,
    status: failed.length === 0 ? ('passed' as const) : ('failed' as const),
    checks: effectChecks,
    failureReasons: failed.map((check) => `${check.checkId}: ${check.reason ?? 'expected effect evidence was not observed'}`)
  };
}

function patchOperationMatchesExpectedPropertyEffect(
  op: DslPatchV1Operation,
  effect: SemanticEditProposal['executionPlan']['verificationRequirements'][number] & { kind: 'property_changed' }
): boolean {
  if (effect.property === 'speed') {
    return op.path.endsWith('/maxSpeed') || op.path.endsWith('/speed');
  }
  if (effect.property === 'health') {
    return op.path.endsWith('/health/max');
  }
  if (effect.property === 'fireRate') {
    return op.path.includes('/actions/') && op.path.endsWith('/cooldownMs');
  }
  if (effect.property === 'damage') {
    return op.path.endsWith('/damage');
  }
  if (effect.property === 'count') {
    return op.path.endsWith('/count') || op.path.endsWith('/quantity');
  }
  return op.path.endsWith(`/${effect.property}`);
}

function buildWarmRestartAmendmentVerification(input: {
  proposal: SemanticEditProposal;
  sourceRunId: string;
  candidateRunId: string;
  candidateDsl: GameDslArtifact;
  patchOps: DslPatchV1Operation[];
  capabilityEffectVerification: ReturnType<typeof buildPatchCapabilityEffectVerification>;
}) {
  const operationChecks = input.patchOps.map((op, index) => {
    const observed = valueAtJsonPointer(input.candidateDsl, op.path);
    const status = JSON.stringify(observed) === JSON.stringify(op.value) ? ('passed' as const) : ('failed' as const);
    return {
      checkId: `warm_restart_operation_${index}`,
      target: op.path,
      status,
      expected: op.value,
      observed,
      evidenceRefs: [`candidate_game_dsl#${op.path}`, '/candidate_dsl_diff.json#/changes'],
      ...(status === 'passed' ? {} : { reason: 'Candidate DSL does not contain the requested warm restart value.' })
    };
  });
  const capabilityEffectCheck = {
    checkId: 'capability_effect_verification',
    target: 'capability_effect_verification.status',
    status: input.capabilityEffectVerification.status === 'passed' ? ('passed' as const) : ('failed' as const),
    expected: 'passed',
    observed: input.capabilityEffectVerification.status,
    evidenceRefs: ['/capability_effect_verification.json#/checks'],
    ...(input.capabilityEffectVerification.status === 'passed' ? {} : { reason: 'One or more expected effects are missing or inconclusive.' })
  };
  const checks = [...operationChecks, capabilityEffectCheck];
  const failed = checks.filter((check) => check.status === 'failed');
  return {
    schemaVersion: 'semantic_amendment_verification.v1',
    proposalId: input.proposal.id,
    sourceRunId: input.sourceRunId,
    candidateRunId: input.candidateRunId,
    requestedSummary: input.proposal.understanding.summary,
    executionMode: input.proposal.execution.mode,
    status: failed.length === 0 ? ('passed' as const) : ('failed' as const),
    checks,
    failureReasons: failed.map((check) => `${check.checkId}: ${check.reason ?? 'expected candidate DSL value was not observed'}`)
  };
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

function buildLiveVersionAuthoritativePromotion(input: {
  proposal: SemanticEditProposal;
  projectId: string;
  runId: string;
  acceptedAt: string;
  beforeAcceptVersion: Awaited<ReturnType<typeof readRequiredLiveCurrentVersion>>;
  acceptedVersion: Awaited<ReturnType<typeof readRequiredLiveCurrentVersion>>;
  runtimePatchPlanRef?: string;
  amendmentVerificationRef?: string;
  capabilityEffectVerificationRef?: string;
}) {
  return {
    schemaVersion: 'step34.authoritative-promotion.v1',
    proposalId: input.proposal.id,
    projectId: input.projectId,
    sourceRunId: input.runId,
    acceptedAt: input.acceptedAt,
    promotionKind: 'live_version' as const,
    before: {
      activeRunId: input.runId,
      liveVersionId: input.beforeAcceptVersion.versionId
    },
    after: {
      activeRunId: input.runId,
      liveVersionId: input.acceptedVersion.versionId
    },
    invariants: {
      activeRunChanged: false,
      acceptedVersionChanged: input.beforeAcceptVersion.versionId !== input.acceptedVersion.versionId,
      sourceRunMutated: true
    },
    promotedArtifactSet: {
      ...(input.runtimePatchPlanRef === undefined ? {} : { runtimePatchPlanRef: input.runtimePatchPlanRef }),
      ...(input.capabilityEffectVerificationRef === undefined ? {} : { capabilityEffectVerificationRef: input.capabilityEffectVerificationRef }),
      ...(input.amendmentVerificationRef === undefined ? {} : { amendmentVerificationRef: input.amendmentVerificationRef })
    }
  };
}

function buildCandidateRunAuthoritativePromotion(input: {
  proposal: SemanticEditProposal;
  projectId: string;
  runId: string;
  acceptedAt: string;
  beforeActiveRunId: string;
  acceptedRunId: string;
  afterActiveRunId: string;
  candidateArtifactCheckpoint: SemanticAmendmentCandidateArtifactCheckpoint;
}) {
  return {
    schemaVersion: 'step34.authoritative-promotion.v1',
    proposalId: input.proposal.id,
    projectId: input.projectId,
    sourceRunId: input.runId,
    acceptedAt: input.acceptedAt,
    promotionKind: 'candidate_run' as const,
    before: {
      activeRunId: input.beforeActiveRunId
    },
    after: {
      activeRunId: input.afterActiveRunId,
      acceptedRunId: input.acceptedRunId
    },
    invariants: {
      activeRunChanged: input.beforeActiveRunId !== input.afterActiveRunId,
      acceptedRunPromoted: input.acceptedRunId === input.afterActiveRunId,
      sourceRunMutated: false
    },
    promotedArtifactSet: {
      candidateArtifactCheckpoint: input.candidateArtifactCheckpoint
    }
  };
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
    ...(candidatePreview.preservationContractRef === undefined ? {} : { preservationContractRef: candidatePreview.preservationContractRef }),
    ...(candidatePreview.candidateArtifactPlanRef === undefined ? {} : { candidateArtifactPlanRef: candidatePreview.candidateArtifactPlanRef }),
    ...(candidatePreview.candidateSceneIrRef === undefined ? {} : { candidateSceneIrRef: candidatePreview.candidateSceneIrRef }),
    ...(candidatePreview.candidateSceneIrDiffRef === undefined ? {} : { candidateSceneIrDiffRef: candidatePreview.candidateSceneIrDiffRef }),
    ...(candidatePreview.candidateAssetIntentManifestRef === undefined ? {} : { candidateAssetIntentManifestRef: candidatePreview.candidateAssetIntentManifestRef }),
    ...(candidatePreview.candidateAssetDiffRef === undefined ? {} : { candidateAssetDiffRef: candidatePreview.candidateAssetDiffRef }),
    ...(candidatePreview.amendmentEffectDiffRef === undefined ? {} : { amendmentEffectDiffRef: candidatePreview.amendmentEffectDiffRef }),
    ...(candidatePreview.capabilityEffectVerificationRef === undefined
      ? {}
      : { capabilityEffectVerificationRef: candidatePreview.capabilityEffectVerificationRef }),
    ...(candidatePreview.candidateAmendmentVerificationRef === undefined
      ? {}
      : { candidateAmendmentVerificationRef: candidatePreview.candidateAmendmentVerificationRef }),
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

function buildLiveEditAmendmentVerification(input: {
  proposal: SemanticEditProposal;
  runId: string;
  patchId: string;
  runtimeApplyReport: NonNullable<SemanticAmendmentAcceptLog['runtimeApplyResult']>['runtime_apply_report'];
  acceptedDsl: GameDslArtifact;
  ops: DslPatchV1Operation[];
  capabilityEffectVerification: ReturnType<typeof buildPatchCapabilityEffectVerification>;
}) {
  const operationChecks = input.ops.map((op, index) => {
    const actual = valueAtJsonPointer(input.acceptedDsl, op.path);
    const valueMatches = op.op === 'remove' ? actual === undefined : JSON.stringify(actual) === JSON.stringify(op.value);
    const runtimeConfirmed = input.runtimeApplyReport.appliedPaths.includes(op.path);
    const status = valueMatches && runtimeConfirmed ? ('passed' as const) : ('failed' as const);

    return {
      checkId: `live_edit_operation_${index}`,
      target: op.path,
      status,
      expected: op.op === 'remove' ? undefined : op.value,
      observed: actual,
      evidenceRefs: [`runtime_apply_report.appliedPaths#${op.path}`, `accepted_game_dsl#${op.path}`],
      ...(runtimeConfirmed ? {} : { reason: 'Runtime apply report did not confirm this path.' })
    };
  });
  const runtimeStatusPassed = input.runtimeApplyReport.status === 'applied_hot' || input.runtimeApplyReport.status === 'applied_warm_restart';
  const checks = [
    {
      checkId: 'runtime_apply_status',
      target: input.patchId,
      status: runtimeStatusPassed ? ('passed' as const) : ('failed' as const),
      expected: input.proposal.execution.mode === 'hot_runtime_patch' ? 'applied_hot' : 'applied_warm_restart',
      observed: input.runtimeApplyReport.status,
      evidenceRefs: ['runtime_apply_report.status']
    },
    ...operationChecks,
    {
      checkId: 'capability_effect_verification',
      target: 'capability_effect_verification.status',
      status: input.capabilityEffectVerification.status === 'passed' ? ('passed' as const) : ('failed' as const),
      expected: 'passed',
      observed: input.capabilityEffectVerification.status,
      evidenceRefs: ['/capability_effect_verification.json#/checks'],
      ...(input.capabilityEffectVerification.status === 'passed' ? {} : { reason: 'One or more expected effects are missing or inconclusive.' })
    }
  ];
  const failed = checks.filter((check) => check.status === 'failed');

  return {
    schemaVersion: 'semantic_amendment_verification.v1',
    proposalId: input.proposal.id,
    sourceRunId: input.runId,
    patchId: input.patchId,
    requestedSummary: input.proposal.understanding.summary,
    executionMode: input.proposal.execution.mode,
    status: failed.length === 0 ? ('passed' as const) : ('failed' as const),
    checks,
    failureReasons: failed.map((check) => `${check.checkId}: ${check.reason ?? 'expected accepted DSL value was not observed'}`)
  };
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

function parseCandidateAmendmentVerification(value: unknown): {
  schemaVersion: 'semantic_amendment_verification.v1';
  proposalId: string;
  sourceRunId: string;
  candidateRunId: string;
  status: 'passed' | 'failed';
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ProjectRequestError('candidate amendment verification must be an object.');
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== 'semantic_amendment_verification.v1') {
    throw new ProjectRequestError('candidate amendment verification schema version is unsupported.');
  }
  if (typeof record.proposalId !== 'string' || typeof record.sourceRunId !== 'string' || typeof record.candidateRunId !== 'string') {
    throw new ProjectRequestError('candidate amendment verification identity is incomplete.');
  }
  if (record.status !== 'passed' && record.status !== 'failed') {
    throw new ProjectRequestError('candidate amendment verification status is invalid.');
  }

  return {
    schemaVersion: record.schemaVersion,
    proposalId: record.proposalId,
    sourceRunId: record.sourceRunId,
    candidateRunId: record.candidateRunId,
    status: record.status
  };
}

function parseCapabilityEffectVerification(value: unknown): {
  schemaVersion: 'step34.capability-effect-verification.v1';
  proposalId: string;
  sourceRunId: string;
  candidateRunId?: string;
  status: 'passed' | 'failed';
} {
  if (!isRecord(value)) {
    throw new ProjectRequestError('capability-effect verification must be an object.');
  }
  if (value.schemaVersion !== 'step34.capability-effect-verification.v1') {
    throw new ProjectRequestError('capability-effect verification schema version is unsupported.');
  }
  if (typeof value.proposalId !== 'string' || typeof value.sourceRunId !== 'string') {
    throw new ProjectRequestError('capability-effect verification identity is incomplete.');
  }
  if (value.candidateRunId !== undefined && typeof value.candidateRunId !== 'string') {
    throw new ProjectRequestError('capability-effect verification candidate run identity is invalid.');
  }
  if (value.status !== 'passed' && value.status !== 'failed') {
    throw new ProjectRequestError('capability-effect verification status is invalid.');
  }
  if (!Array.isArray(value.verificationRequirements) || !Array.isArray(value.checks)) {
    throw new ProjectRequestError('capability-effect verification must include requirements and checks.');
  }
  if (value.checks.length !== value.verificationRequirements.length) {
    throw new ProjectRequestError('capability-effect verification check count does not match requirements.');
  }
  const checkStatuses = value.checks.map((check) => (isRecord(check) ? check.status : undefined));
  if (checkStatuses.some((status) => status !== 'passed' && status !== 'failed' && status !== 'inconclusive')) {
    throw new ProjectRequestError('capability-effect verification check status is invalid.');
  }
  const allChecksPassed = checkStatuses.every((status) => status === 'passed');
  if ((value.status === 'passed') !== allChecksPassed) {
    throw new ProjectRequestError('capability-effect verification status does not match check results.');
  }

  return {
    schemaVersion: value.schemaVersion,
    proposalId: value.proposalId,
    sourceRunId: value.sourceRunId,
    ...(value.candidateRunId === undefined ? {} : { candidateRunId: value.candidateRunId }),
    status: value.status
  };
}

function stableSha256(value: unknown): string {
  return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === code;
}
