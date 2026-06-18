import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import {
  SemanticAmendmentArtifactRefSchema,
  type SemanticAmendmentArtifactRef
} from './semantic-amendment.types.js';
import {
  SemanticEditProposalSchema,
  type AmendmentContextPack,
  type SemanticEditProposal
} from '../../../../packages/game-dsl/src/index.js';

type PlanArtifactId = Extract<
  SemanticAmendmentArtifactRef['id'],
  'sourceRequest' | 'contextPack' | 'understanding' | 'designDeltas' | 'gameOperations' | 'executionRoute' | 'rejectedUnsafeFallbacks' | 'proposal'
>;
type ReviewArtifactId = Extract<SemanticAmendmentArtifactRef['id'], 'previewState' | 'acceptLog' | 'rejectLog' | 'undoCheckpoint' | 'undoLog'>;
type CandidateArtifactId = Extract<
  SemanticAmendmentArtifactRef['id'],
  | 'candidateBrief'
  | 'candidateDsl'
  | 'candidateDslDiff'
  | 'candidateSceneIr'
  | 'candidateSceneIrDiff'
  | 'candidateAssetIntentManifest'
  | 'candidateAssetDiff'
  | 'candidateRun'
  | 'candidateRuntimeCapabilityReport'
>;

const planArtifactFileNameById: Record<PlanArtifactId, string> = {
  sourceRequest: 'source_request.json',
  contextPack: 'context_pack.json',
  understanding: 'understanding.json',
  designDeltas: 'design_deltas.json',
  gameOperations: 'game_operations.json',
  executionRoute: 'execution_route.json',
  rejectedUnsafeFallbacks: 'rejected_unsafe_fallbacks.json',
  proposal: 'proposal.json'
};

const reviewArtifactFileNameById: Record<ReviewArtifactId, string> = {
  previewState: 'preview_state.json',
  acceptLog: 'accept_log.json',
  rejectLog: 'reject_log.json',
  undoCheckpoint: 'undo_checkpoint.json',
  undoLog: 'undo_log.json'
};

const candidateArtifactFileNameById: Record<CandidateArtifactId, string> = {
  candidateBrief: 'candidate_brief.json',
  candidateDsl: 'candidate_dsl.json',
  candidateDslDiff: 'candidate_dsl_diff.json',
  candidateSceneIr: 'candidate_scene_ir.json',
  candidateSceneIrDiff: 'candidate_scene_ir_diff.json',
  candidateAssetIntentManifest: 'candidate_asset_intent_manifest.json',
  candidateAssetDiff: 'candidate_asset_diff.json',
  candidateRun: 'candidate_run.json',
  candidateRuntimeCapabilityReport: 'candidate_runtime_capability_report.json'
};

export type SemanticAmendmentPlanArtifactInput = {
  projectId: string;
  runId: string;
  proposal: SemanticEditProposal;
  context: AmendmentContextPack;
  request: { projectId: string; runId: string; sourceText: string; language: 'zh' | 'en'; requestedAt: string };
};

export function buildSemanticAmendmentArtifactRefs(proposalId: string): SemanticAmendmentArtifactRef[] {
  return Object.entries(planArtifactFileNameById).map(([id, fileName]) =>
    SemanticAmendmentArtifactRefSchema.parse({
      id,
      artifactRoot: 'model-output',
      path: `${semanticAmendmentSandboxRelativePath(proposalId)}/${fileName}`,
      format: 'json'
    })
  );
}

export function attachSemanticAmendmentArtifactRefs(
  proposal: SemanticEditProposal,
  artifactRefs: SemanticAmendmentArtifactRef[]
): SemanticEditProposal {
  if (proposal.candidate === undefined) {
    return proposal;
  }

  const artifactRefById = Object.fromEntries(artifactRefs.map((artifact) => [artifact.id, artifact.path]));
  return SemanticEditProposalSchema.parse({
    ...proposal,
    candidate: {
      ...proposal.candidate,
      artifactSandboxPath: semanticAmendmentSandboxRelativePath(proposal.id),
      artifactRefs: artifactRefById
    }
  });
}

export async function writeSemanticAmendmentPlanArtifacts(
  workspace: LocalWorkspaceService,
  input: SemanticAmendmentPlanArtifactInput
): Promise<void> {
  await Promise.all([
    writeArtifact(workspace, input.projectId, input.runId, input.proposal.id, planArtifactFileNameById.sourceRequest, input.request),
    writeArtifact(workspace, input.projectId, input.runId, input.proposal.id, planArtifactFileNameById.contextPack, input.context),
    writeArtifact(workspace, input.projectId, input.runId, input.proposal.id, planArtifactFileNameById.understanding, input.proposal.understanding),
    writeArtifact(workspace, input.projectId, input.runId, input.proposal.id, planArtifactFileNameById.designDeltas, input.proposal.understanding.designDeltas),
    writeArtifact(workspace, input.projectId, input.runId, input.proposal.id, planArtifactFileNameById.gameOperations, input.proposal.understanding.operations),
    writeArtifact(workspace, input.projectId, input.runId, input.proposal.id, planArtifactFileNameById.executionRoute, input.proposal.execution),
    writeArtifact(workspace, input.projectId, input.runId, input.proposal.id, planArtifactFileNameById.rejectedUnsafeFallbacks, {
      rejectedUnsafeFallbacks: input.proposal.execution.rejectedUnsafeFallbacks
    }),
    writeArtifact(workspace, input.projectId, input.runId, input.proposal.id, planArtifactFileNameById.proposal, input.proposal)
  ]);
}

export function buildSemanticAmendmentReviewArtifactRef(proposalId: string, id: ReviewArtifactId): SemanticAmendmentArtifactRef {
  return SemanticAmendmentArtifactRefSchema.parse({
    id,
    artifactRoot: 'model-output',
    path: `${semanticAmendmentSandboxRelativePath(proposalId)}/review/${reviewArtifactFileNameById[id]}`,
    format: 'json'
  });
}

export function buildSemanticAmendmentCandidateArtifactRef(proposalId: string, id: CandidateArtifactId): SemanticAmendmentArtifactRef {
  return SemanticAmendmentArtifactRefSchema.parse({
    id,
    artifactRoot: 'model-output',
    path: `${semanticAmendmentSandboxRelativePath(proposalId)}/candidate/${candidateArtifactFileNameById[id]}`,
    format: 'json'
  });
}

export async function readSemanticAmendmentProposal(
  workspace: LocalWorkspaceService,
  projectId: string,
  runId: string,
  proposalId: string
): Promise<SemanticEditProposal> {
  return SemanticEditProposalSchema.parse(
    JSON.parse(await readFile(workspace.getSemanticAmendmentArtifactPath(projectId, runId, proposalId, planArtifactFileNameById.proposal), 'utf8'))
  );
}

export async function writeSemanticAmendmentProposal(
  workspace: LocalWorkspaceService,
  projectId: string,
  runId: string,
  proposal: SemanticEditProposal
): Promise<void> {
  await writeArtifact(workspace, projectId, runId, proposal.id, planArtifactFileNameById.proposal, proposal);
}

export async function readSemanticAmendmentReviewArtifact<T>(
  workspace: LocalWorkspaceService,
  projectId: string,
  runId: string,
  proposalId: string,
  id: ReviewArtifactId
): Promise<T> {
  return JSON.parse(await readFile(workspace.getSemanticAmendmentReviewArtifactPath(projectId, runId, proposalId, reviewArtifactFileNameById[id]), 'utf8')) as T;
}

export async function writeSemanticAmendmentReviewArtifact(
  workspace: LocalWorkspaceService,
  projectId: string,
  runId: string,
  proposalId: string,
  id: ReviewArtifactId,
  value: unknown
): Promise<SemanticAmendmentArtifactRef> {
  const artifactPath = workspace.getSemanticAmendmentReviewArtifactPath(projectId, runId, proposalId, reviewArtifactFileNameById[id]);
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return buildSemanticAmendmentReviewArtifactRef(proposalId, id);
}

export async function writeSemanticAmendmentCandidateArtifact(
  workspace: LocalWorkspaceService,
  projectId: string,
  runId: string,
  proposalId: string,
  id: CandidateArtifactId,
  value: unknown
): Promise<SemanticAmendmentArtifactRef> {
  const artifactPath = workspace.getSemanticAmendmentCandidateArtifactPath(projectId, runId, proposalId, candidateArtifactFileNameById[id]);
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return buildSemanticAmendmentCandidateArtifactRef(proposalId, id);
}

export function semanticAmendmentSandboxRelativePath(proposalId: string): string {
  return `semantic-amendments/${proposalId}`;
}

async function writeArtifact(
  workspace: LocalWorkspaceService,
  projectId: string,
  runId: string,
  proposalId: string,
  name: string,
  value: unknown
): Promise<void> {
  const artifactPath = workspace.getSemanticAmendmentArtifactPath(projectId, runId, proposalId, name);
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
