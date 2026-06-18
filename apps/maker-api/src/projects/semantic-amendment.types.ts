import { z } from 'zod';

import type { SemanticEditProposal } from '../../../../packages/game-dsl/src/index.js';
import type { LiveVersionRecord } from './dsl-live-edit.service.js';
import type { PrepareDeterministicPatchResponse, RuntimeApplyResultResponse } from './project-api.types.js';

export const SemanticAmendmentArtifactRefSchema = z.strictObject({
  id: z.enum([
    'sourceRequest',
    'contextPack',
    'understanding',
    'designDeltas',
    'gameOperations',
    'executionRoute',
    'rejectedUnsafeFallbacks',
    'proposal',
    'candidateBrief',
    'candidateDsl',
    'candidateDslDiff',
    'candidateSceneIr',
    'candidateSceneIrDiff',
    'candidateAssetIntentManifest',
    'candidateAssetDiff',
    'candidateRun',
    'candidateRuntimeCapabilityReport',
    'previewState',
    'acceptLog',
    'rejectLog',
    'undoCheckpoint',
    'undoLog'
  ]),
  artifactRoot: z.literal('model-output'),
  path: z.string().min(1).refine(isSafeRelativeArtifactPath, 'artifact path must be relative and stay inside its artifact root'),
  format: z.literal('json')
});

export type SemanticAmendmentArtifactRef = z.infer<typeof SemanticAmendmentArtifactRefSchema>;

export type PlanSemanticAmendmentRequest = {
  text?: string;
  language?: 'zh' | 'en';
};

export type PlanSemanticAmendmentResponse = {
  ok: true;
  proposal: SemanticEditProposal;
  artifact_refs: SemanticAmendmentArtifactRef[];
};

export type SemanticAmendmentPreparedLiveEdit = Omit<PrepareDeterministicPatchResponse, 'ok' | 'artifact_refs'>;

export type SemanticAmendmentCandidatePreview = {
  candidateRunId: string;
  candidateBriefRef: string;
  candidateDslRef: string;
  candidateDslDiffRef: string;
  candidateSceneIrRef?: string;
  candidateSceneIrDiffRef?: string;
  candidateAssetIntentManifestRef?: string;
  candidateAssetDiffRef?: string;
  candidateRunRef: string;
  candidateRuntimeCapabilityReportRef: string;
  previewAvailable: boolean;
  qaStatus: 'not_run' | 'passed' | 'failed';
};

export type SemanticAmendmentCandidateArtifactCheckpoint = {
  proposalId: string;
  projectId: string;
  sourceRunId: string;
  candidateRunId: string;
  candidateDslRef: string;
  candidateDslDiffRef: string;
  candidateBriefRef?: string;
  candidateSceneIrRef?: string;
  candidateSceneIrDiffRef?: string;
  candidateAssetIntentManifestRef?: string;
  candidateAssetDiffRef?: string;
  candidateRunRef?: string;
  candidateRuntimeCapabilityReportRef?: string;
  activeRunMutation: false;
};

export type SemanticAmendmentPreviewState = {
  proposalId: string;
  projectId: string;
  runId: string;
  reviewState: 'previewing' | 'failed';
  executionMode: SemanticEditProposal['execution']['mode'];
  preparedLiveEdit?: SemanticAmendmentPreparedLiveEdit;
  candidatePreview?: SemanticAmendmentCandidatePreview;
  failureReason?: string;
  createdAt: string;
};

export type SemanticAmendmentAcceptLog = {
  proposalId: string;
  projectId: string;
  runId: string;
  acceptedAt: string;
  previousReviewState: SemanticEditProposal['reviewState'];
  runtimeApplyResult?: RuntimeApplyResultResponse;
  candidatePromotionResult?: {
    status: 'promoted_candidate';
    previousRunId: string;
    candidateRunId: string;
    activeRunId: string;
  };
  candidateArtifactCheckpoint?: SemanticAmendmentCandidateArtifactCheckpoint;
};

export type SemanticAmendmentRejectLog = {
  proposalId: string;
  projectId: string;
  runId: string;
  rejectedAt: string;
  previousReviewState: SemanticEditProposal['reviewState'];
  reason?: string;
  requiresRuntimeRevert: boolean;
  candidateArtifactCheckpoint?: SemanticAmendmentCandidateArtifactCheckpoint;
};

export type SemanticAmendmentVersionSummary = Omit<LiveVersionRecord, 'dslArtifactPath'>;

export type SemanticAmendmentUndoCheckpoint = {
  proposalId: string;
  projectId: string;
  runId: string;
  acceptedAt: string;
  beforeAcceptVersion?: SemanticAmendmentVersionSummary;
  beforeActiveRunId?: string;
  acceptedRunId?: string;
  acceptedVersionId?: string;
  candidateArtifactCheckpoint?: SemanticAmendmentCandidateArtifactCheckpoint;
};

export type SemanticAmendmentUndoCheckpointArtifact = Omit<SemanticAmendmentUndoCheckpoint, 'beforeAcceptVersion'> & {
  beforeAcceptVersion?: LiveVersionRecord;
};

export type SemanticAmendmentUndoLog = {
  proposalId: string;
  projectId: string;
  runId: string;
  undoneAt: string;
  restoredVersion?: SemanticAmendmentVersionSummary;
  restoredRunId?: string;
  reason?: string;
  candidateArtifactCheckpoint?: SemanticAmendmentCandidateArtifactCheckpoint;
};

export type SemanticAmendmentUndoLogArtifact = Omit<SemanticAmendmentUndoLog, 'restoredVersion'> & {
  restoredVersion?: LiveVersionRecord;
};

export type PreviewSemanticAmendmentResponse = {
  ok: true;
  proposal: SemanticEditProposal;
  preview_state: SemanticAmendmentPreviewState;
  artifact_refs: SemanticAmendmentArtifactRef[];
};

export type AcceptSemanticAmendmentResponse = {
  ok: true;
  proposal: SemanticEditProposal;
  accept_log: SemanticAmendmentAcceptLog;
  undo_checkpoint?: SemanticAmendmentUndoCheckpoint;
  artifact_refs: SemanticAmendmentArtifactRef[];
};

export type RejectSemanticAmendmentResponse = {
  ok: true;
  proposal: SemanticEditProposal;
  reject_log: SemanticAmendmentRejectLog;
  artifact_refs: SemanticAmendmentArtifactRef[];
};

export type UndoSemanticAmendmentResponse = {
  ok: true;
  proposal: SemanticEditProposal;
  undo_log: SemanticAmendmentUndoLog;
  artifact_refs: SemanticAmendmentArtifactRef[];
};

function isSafeRelativeArtifactPath(path: string): boolean {
  return !path.startsWith('/') && !/^[A-Za-z]:\//.test(path) && !path.split('/').includes('..') && !path.includes('\\');
}
