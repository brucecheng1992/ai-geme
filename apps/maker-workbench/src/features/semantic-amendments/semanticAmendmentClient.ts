import { buildRuntimeApplyReportFromPatchResult } from '../../live-edit-client.js';
import { requestJson, type RuntimeApplyReport, type RuntimePatch, type RuntimePatchResult } from '../../workbench-api.js';

export type SemanticAmendmentExecutionMode =
  | 'hot_runtime_patch'
  | 'dsl_patch_warm_restart'
  | 'candidate_regeneration'
  | 'unsupported_capability'
  | 'needs_clarification';

export type SemanticAmendmentReviewState = 'proposed' | 'previewing' | 'accepted' | 'rejected' | 'undone' | 'failed';

export type SemanticAmendmentArtifactRef = {
  id: string;
  artifactRoot: 'model-output';
  path: string;
  format: 'json';
};

export type SemanticAmendmentDesignDelta = {
  kind: string;
  targetDomain?: string;
  targetRef?: string;
  stat?: string;
  direction?: string;
  amount?: number | string;
  reason?: string;
  target?: string;
  themeDescription?: string;
  mechanic?: string;
  description?: string;
  feedback?: string;
  event?: string;
  targetGenre?: string;
  inferredGoals?: string[];
  inferredDeltas?: SemanticAmendmentDesignDelta[];
};

export type SemanticAmendmentOperation = {
  kind: string;
  target?: string;
  stat?: string;
  event?: string;
  behavior?: string;
  themePrompt?: string;
  change?: {
    direction?: string;
    amount?: number | string;
  };
};

export type SemanticEditProposal = {
  id: string;
  projectId: string;
  runId: string;
  createdAt: string;
  sourceText: string;
  language: 'zh' | 'en';
  understanding: {
    understood: boolean;
    confidence: number;
    summary: string;
    affectedDomains: string[];
    designDeltas: SemanticAmendmentDesignDelta[];
    operations: SemanticAmendmentOperation[];
    clarificationQuestion?: string;
  };
  execution: {
    mode: SemanticAmendmentExecutionMode;
    reason: string;
    supportedNow: boolean;
    requiresPreviewReload: boolean;
    requiresCandidateRun: boolean;
    missingCapabilities: string[];
    rejectedUnsafeFallbacks: string[];
  };
  candidate?: {
    dslPatch?: {
      ops: Array<{ op: 'replace'; path: string; value: unknown }>;
      reason: string;
    };
    candidateBrief?: {
      sourceText: string;
      amendmentSummary: string;
      preserveGameplay: boolean;
    };
    candidateRunId?: string;
    expectedChangeSummary?: string[];
    artifactRefs?: Record<string, string>;
  };
  reviewState: SemanticAmendmentReviewState;
  validation?: {
    schemaValid?: boolean;
    compilePassed?: boolean;
    previewBooted?: boolean;
    runtimeNoException?: boolean;
    gameplayTelemetryPassed?: boolean;
    qaReportPath?: string;
  };
  userMessage: string;
};

export type SemanticAmendmentPreparedLiveEdit = {
  patch_id: string;
  status: string;
  apply_mode: 'hot' | 'warm_restart' | 'rebuild' | 'none';
  runtime_patch?: RuntimePatch;
  live_update_plan_ref: { artifact: string; patchId: string };
  validation_report?: {
    status: 'valid' | 'invalid';
    errors: Array<{ code: string; path: string; message: string }>;
  };
  live_update_plan?: {
    status: string;
    applyMode: 'hot' | 'warm_restart' | 'rebuild' | 'none';
    reason?: string;
    affectedPaths: string[];
  };
};

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
  executionMode: SemanticAmendmentExecutionMode;
  preparedLiveEdit?: SemanticAmendmentPreparedLiveEdit;
  candidatePreview?: SemanticAmendmentCandidatePreview;
  failureReason?: string;
  createdAt: string;
};

export type PlanSemanticAmendmentResponse = {
  ok: true;
  proposal: SemanticEditProposal;
  artifact_refs: SemanticAmendmentArtifactRef[];
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
  accept_log: {
    proposalId: string;
    projectId: string;
    runId: string;
    acceptedAt: string;
    previousReviewState: SemanticAmendmentReviewState;
    runtimeApplyResult?: {
      status: RuntimeApplyReport['status'];
      apply_mode: RuntimeApplyReport['applyMode'];
      version_id?: string;
    };
    candidatePromotionResult?: {
      status: 'promoted_candidate';
      previousRunId: string;
      candidateRunId: string;
      activeRunId: string;
    };
    candidateArtifactCheckpoint?: SemanticAmendmentCandidateArtifactCheckpoint;
  };
  undo_checkpoint?: {
    proposalId: string;
    projectId: string;
    runId: string;
    acceptedAt: string;
    beforeActiveRunId?: string;
    acceptedRunId?: string;
    acceptedVersionId?: string;
    candidateArtifactCheckpoint?: SemanticAmendmentCandidateArtifactCheckpoint;
  };
  artifact_refs: SemanticAmendmentArtifactRef[];
};

export type RejectSemanticAmendmentResponse = {
  ok: true;
  proposal: SemanticEditProposal;
  reject_log: {
    proposalId: string;
    projectId: string;
    runId: string;
    rejectedAt: string;
    previousReviewState: SemanticAmendmentReviewState;
    reason?: string;
    requiresRuntimeRevert: boolean;
    candidateArtifactCheckpoint?: SemanticAmendmentCandidateArtifactCheckpoint;
  };
  artifact_refs: SemanticAmendmentArtifactRef[];
};

export type UndoSemanticAmendmentResponse = {
  ok: true;
  proposal: SemanticEditProposal;
  undo_log: {
    proposalId: string;
    projectId: string;
    runId: string;
    undoneAt: string;
    restoredRunId?: string;
    reason?: string;
    candidateArtifactCheckpoint?: SemanticAmendmentCandidateArtifactCheckpoint;
  };
  artifact_refs: SemanticAmendmentArtifactRef[];
};

export async function planSemanticAmendment(input: {
  apiBase: string;
  projectId: string;
  runId: string;
  text: string;
  language: string;
}): Promise<PlanSemanticAmendmentResponse> {
  return await requestJson<PlanSemanticAmendmentResponse>(semanticAmendmentUrl(input, 'plan'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: input.text, language: input.language === 'en' ? 'en' : 'zh' })
  });
}

export async function previewSemanticAmendment(input: {
  apiBase: string;
  projectId: string;
  runId: string;
  proposalId: string;
}): Promise<PreviewSemanticAmendmentResponse> {
  return await requestJson<PreviewSemanticAmendmentResponse>(semanticAmendmentUrl(input, `${input.proposalId}/preview`), {
    method: 'POST'
  });
}

export async function acceptSemanticAmendment(input: {
  apiBase: string;
  projectId: string;
  runId: string;
  proposalId: string;
  runtimeApplyReport?: RuntimeApplyReport;
}): Promise<AcceptSemanticAmendmentResponse> {
  return await requestJson<AcceptSemanticAmendmentResponse>(semanticAmendmentUrl(input, `${input.proposalId}/accept`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input.runtimeApplyReport === undefined ? {} : { runtimeApplyReport: input.runtimeApplyReport })
  });
}

export async function rejectSemanticAmendment(input: {
  apiBase: string;
  projectId: string;
  runId: string;
  proposalId: string;
  reason?: string;
}): Promise<RejectSemanticAmendmentResponse> {
  return await requestJson<RejectSemanticAmendmentResponse>(semanticAmendmentUrl(input, `${input.proposalId}/reject`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input.reason === undefined ? {} : { reason: input.reason })
  });
}

export async function undoSemanticAmendment(input: {
  apiBase: string;
  projectId: string;
  runId: string;
  proposalId: string;
  reason?: string;
}): Promise<UndoSemanticAmendmentResponse> {
  return await requestJson<UndoSemanticAmendmentResponse>(semanticAmendmentUrl(input, `${input.proposalId}/undo`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input.reason === undefined ? {} : { reason: input.reason })
  });
}

export function isPreviewableSemanticAmendment(proposal: SemanticEditProposal): boolean {
  return (
    proposal.execution.mode === 'hot_runtime_patch' ||
    proposal.execution.mode === 'dsl_patch_warm_restart' ||
    proposal.execution.mode === 'candidate_regeneration'
  );
}

export function requiresRuntimeApplyReport(proposal: SemanticEditProposal): boolean {
  return proposal.execution.mode === 'hot_runtime_patch' || proposal.execution.mode === 'dsl_patch_warm_restart';
}

export function buildSemanticAmendmentRuntimeApplyReport(
  runId: string,
  previewState: SemanticAmendmentPreviewState,
  result: RuntimePatchResult
): RuntimeApplyReport {
  if (previewState.preparedLiveEdit === undefined) {
    throw new Error('Semantic amendment preview does not contain a prepared live edit.');
  }

  return buildRuntimeApplyReportFromPatchResult(runId, previewState.preparedLiveEdit, result);
}

function semanticAmendmentUrl(input: { apiBase: string; projectId: string; runId: string }, suffix: string): string {
  return `${input.apiBase}/api/projects/${encodeURIComponent(input.projectId)}/runs/${encodeURIComponent(input.runId)}/semantic-amendments/${suffix}`;
}
