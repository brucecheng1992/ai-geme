import { createHash } from 'node:crypto';
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
  | 'sourceRequest'
  | 'modelInvocationProvenance'
  | 'contextPack'
  | 'understanding'
  | 'designDeltas'
  | 'gameOperations'
  | 'executionRoute'
  | 'rejectedUnsafeFallbacks'
  | 'proposal'
>;
type ReviewArtifactId = Extract<
  SemanticAmendmentArtifactRef['id'],
  | 'previewState'
  | 'runtimePatchPlan'
  | 'amendmentVerification'
  | 'capabilityEffectVerification'
  | 'authoritativePromotion'
  | 'acceptLog'
  | 'rejectLog'
  | 'undoCheckpoint'
  | 'undoLog'
>;
type CandidateArtifactId = Extract<
  SemanticAmendmentArtifactRef['id'],
  | 'candidateBrief'
  | 'preservationContract'
  | 'candidateArtifactPlan'
  | 'candidateDsl'
  | 'candidateDslDiff'
  | 'candidateSceneIr'
  | 'candidateSceneIrDiff'
  | 'candidateAssetIntentManifest'
  | 'candidateAssetDiff'
  | 'amendmentEffectDiff'
  | 'capabilityEffectVerification'
  | 'candidateAmendmentVerification'
  | 'candidateRun'
  | 'candidateRuntimeCapabilityReport'
>;

const planArtifactFileNameById: Record<PlanArtifactId, string> = {
  sourceRequest: 'source_request.json',
  modelInvocationProvenance: 'model_invocation_provenance.json',
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
  runtimePatchPlan: 'runtime_patch_plan.json',
  amendmentVerification: 'amendment_verification.json',
  capabilityEffectVerification: 'capability_effect_verification.json',
  authoritativePromotion: 'authoritative_promotion.json',
  acceptLog: 'accept_log.json',
  rejectLog: 'reject_log.json',
  undoCheckpoint: 'undo_checkpoint.json',
  undoLog: 'undo_log.json'
};

const candidateArtifactFileNameById: Record<CandidateArtifactId, string> = {
  candidateBrief: 'candidate_brief.json',
  preservationContract: 'preservation_contract.json',
  candidateArtifactPlan: 'candidate_artifact_plan.json',
  candidateDsl: 'candidate_dsl.json',
  candidateDslDiff: 'candidate_dsl_diff.json',
  candidateSceneIr: 'candidate_scene_ir.json',
  candidateSceneIrDiff: 'candidate_scene_ir_diff.json',
  candidateAssetIntentManifest: 'candidate_asset_intent_manifest.json',
  candidateAssetDiff: 'candidate_asset_diff.json',
  amendmentEffectDiff: 'amendment_effect_diff.json',
  capabilityEffectVerification: 'capability_effect_verification.json',
  candidateAmendmentVerification: 'candidate_amendment_verification.json',
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
    writeArtifact(workspace, input.projectId, input.runId, input.proposal.id, planArtifactFileNameById.modelInvocationProvenance, {
      schemaVersion: 'step34.model-invocation.v1',
      invocationId: input.proposal.understanding.modelInvocationId,
      stage: 'semantic_understanding',
      provider: 'rules',
      promptVersion: 'deterministic-semantic-amendment-planner.v1',
      status: 'SUCCEEDED',
      fallbackUsed: false,
      inputHash: stableSha256(input.proposal.sourceText),
      baseDslHash: input.context.currentDsl === undefined ? 'missing-current-dsl' : stableSha256(input.context.currentDsl),
      runtimeProfileId: input.context.activeRuntimeTemplate ?? input.context.activeGenre ?? 'unknown',
      structuredOutputValidated: true
    }),
    writeArtifact(workspace, input.projectId, input.runId, input.proposal.id, planArtifactFileNameById.contextPack, input.context),
    writeArtifact(workspace, input.projectId, input.runId, input.proposal.id, planArtifactFileNameById.understanding, input.proposal.understanding),
    writeArtifact(workspace, input.projectId, input.runId, input.proposal.id, planArtifactFileNameById.designDeltas, input.proposal.understanding.designDeltas),
    writeArtifact(workspace, input.projectId, input.runId, input.proposal.id, planArtifactFileNameById.gameOperations, input.proposal.understanding.operations),
    writeArtifact(workspace, input.projectId, input.runId, input.proposal.id, planArtifactFileNameById.executionRoute, input.proposal.executionPlan),
    writeArtifact(workspace, input.projectId, input.runId, input.proposal.id, planArtifactFileNameById.rejectedUnsafeFallbacks, {
      rejectedUnsafeFallbacks: input.proposal.execution.rejectedUnsafeFallbacks
    }),
    writeArtifact(workspace, input.projectId, input.runId, input.proposal.id, planArtifactFileNameById.proposal, input.proposal)
  ]);
}

function stableSha256(value: unknown): string {
  return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
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
  const rawProposal = JSON.parse(await readFile(workspace.getSemanticAmendmentArtifactPath(projectId, runId, proposalId, planArtifactFileNameById.proposal), 'utf8'));
  const parsedProposal = SemanticEditProposalSchema.safeParse(rawProposal);
  if (parsedProposal.success) {
    return parsedProposal.data;
  }

  return SemanticEditProposalSchema.parse(backfillLegacySemanticEditProposal(rawProposal));
}

function backfillLegacySemanticEditProposal(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const proposalId = typeof value.id === 'string' ? value.id : 'unknown_proposal';
  const baseRunId = typeof value.runId === 'string' ? value.runId : 'unknown_run';
  const sourceText = typeof value.sourceText === 'string' ? value.sourceText : '';
  const rawUnderstanding = isRecord(value.understanding) ? value.understanding : {};
  const rawExecution = isRecord(value.execution) ? value.execution : {};
  const modelInvocationId = typeof rawUnderstanding.modelInvocationId === 'string' ? rawUnderstanding.modelInvocationId : `rules_${proposalId}`;
  const nextUnderstanding = {
    ...rawUnderstanding,
    intentClass: typeof rawUnderstanding.intentClass === 'string' ? rawUnderstanding.intentClass : inferLegacyIntentClass(rawUnderstanding),
    explicitConstraints: Array.isArray(rawUnderstanding.explicitConstraints) ? rawUnderstanding.explicitConstraints : [],
    inferredConstraints: Array.isArray(rawUnderstanding.inferredConstraints) ? rawUnderstanding.inferredConstraints : [],
    unresolvedReferences: Array.isArray(rawUnderstanding.unresolvedReferences) ? rawUnderstanding.unresolvedReferences : [],
    modelInvocationId,
    plannerProvenanceStatus: typeof rawUnderstanding.plannerProvenanceStatus === 'string' ? rawUnderstanding.plannerProvenanceStatus : 'RULE_FALLBACK'
  };
  const designDeltas = Array.isArray(rawUnderstanding.designDeltas) ? rawUnderstanding.designDeltas : [];
  const operations = Array.isArray(rawUnderstanding.operations) ? rawUnderstanding.operations : [];

  return {
    ...value,
    understanding: nextUnderstanding,
    executionPlan: isRecord(value.executionPlan)
      ? value.executionPlan
      : {
          schemaVersion: 'step34.execution-plan.v1',
          proposalId,
          mode: typeof rawExecution.mode === 'string' ? rawExecution.mode : 'unsupported_capability',
          reason: typeof rawExecution.reason === 'string' ? rawExecution.reason : 'Backfilled from legacy proposal execution.',
          requiredCapabilities: Array.isArray(rawExecution.missingCapabilities) ? rawExecution.missingCapabilities.map(String) : [],
          availableCapabilities: [],
          missingCapabilities: Array.isArray(rawExecution.missingCapabilities) ? rawExecution.missingCapabilities.map(String) : [],
          incompatibleCapabilities: [],
          runtimeSessionRequired: rawExecution.mode === 'hot_runtime_patch',
          candidateRunRequired: rawExecution.requiresCandidateRun === true,
          previewReloadRequired: rawExecution.requiresPreviewReload === true,
          operationPlan: [],
          verificationRequirements: [],
          rejectedUnsafeFallbacks: Array.isArray(rawExecution.rejectedUnsafeFallbacks) ? rawExecution.rejectedUnsafeFallbacks.map(String) : []
        },
    amendmentIr: isRecord(value.amendmentIr)
      ? value.amendmentIr
      : {
          schemaVersion: 'step34.game-amendment-ir.v1',
          proposalId,
          requestId: proposalId,
          baseRunId,
          baseArtifactHashes: {},
          modelInvocationIds: [modelInvocationId],
          operations: [],
          operationDependencies: [],
          preservedConstraints: [],
          rejectedUnsafeFallbacks: (Array.isArray(rawExecution.rejectedUnsafeFallbacks) ? rawExecution.rejectedUnsafeFallbacks : []).map((fallback) => ({
            requestedConcept: typeof rawUnderstanding.summary === 'string' ? rawUnderstanding.summary : 'legacy semantic amendment',
            rejectedFallback: String(fallback),
            reason: 'Backfilled from legacy proposal execution rejectedUnsafeFallbacks.'
          })),
          provenance: {
            sourceTextHash: stableSha256(sourceText),
            semanticUnderstandingHash: stableSha256(nextUnderstanding),
            designDeltasHash: stableSha256(designDeltas.length === 0 ? operations : designDeltas)
          }
        }
  };
}

function inferLegacyIntentClass(understanding: Record<string, unknown>): SemanticEditProposal['understanding']['intentClass'] {
  if (understanding.understood === false || typeof understanding.clarificationQuestion === 'string') {
    return 'ambiguous';
  }
  const designDeltas = Array.isArray(understanding.designDeltas) ? understanding.designDeltas : [];
  if (designDeltas.some((delta) => isRecord(delta) && delta.kind === 'change_genre_or_perspective')) {
    return 'genre_or_system_edit';
  }
  if (designDeltas.some((delta) => isRecord(delta) && delta.kind === 'open_design_request')) {
    return 'open_design_edit';
  }
  if (designDeltas.some((delta) => isRecord(delta) && (delta.kind === 'add_mechanic' || delta.kind === 'add_feedback'))) {
    return 'structural_edit';
  }
  return 'typed_edit';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
