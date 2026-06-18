import { ProjectRequestError } from './project-request.error.js';
import {
  buildSceneIr,
  buildGameDslArtifact,
  validateAndNormalizeRawGameDsl,
  type GameDslArtifact,
  type RawGameDsl,
  type SceneIr,
  type SemanticEditProposal
} from '../../../../packages/game-dsl/src/index.js';
import { buildAssetIntentManifest, buildAssetPlanFromIr, type AssetIntentManifest } from '../../../../packages/asset-pipeline/src/index.js';

type CandidateDiffChange = { path: string; before: unknown; after: unknown };

export type CandidateArtifactBundle = {
  candidateDslDiff: ReturnType<typeof buildCandidateDslDiff>;
  candidateSceneIr?: SceneIr;
  candidateSceneIrDiff?: ReturnType<typeof buildCandidateSceneIrDiff>;
  candidateAssetIntentManifest?: AssetIntentManifest;
  candidateAssetDiff?: ReturnType<typeof buildCandidateAssetDiff>;
  hasVisibleEffect: boolean;
};

export function buildPlayerThemeCandidateDsl(baseDsl: GameDslArtifact, candidateRunId: string): GameDslArtifact {
  const rawDsl = JSON.parse(JSON.stringify(baseDsl.sourceDsl)) as GameDslArtifact['sourceDsl'];
  rawDsl.player = {
    ...rawDsl.player,
    label: '小猫',
    visual: {
      ...(rawDsl.player.visual ?? {}),
      assetIntentRef: 'player_cat',
      styleRef: rawDsl.player.visual?.styleRef ?? 'style_pixel_16',
      facingMode: rawDsl.player.visual?.facingMode ?? 'flip_x',
      animationSetRef: rawDsl.player.visual?.animationSetRef ?? 'anim_cat_run_jump_shoot'
    }
  };

  return buildGameDslArtifact({
    rawDsl,
    runId: candidateRunId,
    intentPlan: {
      normalizedGenre: baseDsl.intentPlanRef.normalizedGenre,
      ...(baseDsl.intentPlanRef.matchedAlias === undefined ? {} : { matchedAlias: baseDsl.intentPlanRef.matchedAlias })
    }
  });
}

export function buildCandidateArtifactBundle(input: {
  projectId: string;
  sourceRunId: string;
  candidateRunId: string;
  proposal: SemanticEditProposal;
  baseDsl: GameDslArtifact;
  candidateDsl: GameDslArtifact;
}): CandidateArtifactBundle {
  const candidateDslDiff = buildCandidateDslDiff(input.baseDsl, input.candidateDsl, input.proposal);
  const visualArtifacts = buildSideScrollingCandidateVisualArtifacts(input);
  const visualChangeCount = (visualArtifacts?.candidateSceneIrDiff.changes.length ?? 0) + (visualArtifacts?.candidateAssetDiff.changes.length ?? 0);

  return {
    candidateDslDiff,
    ...(visualArtifacts === undefined
      ? {}
      : {
          candidateSceneIr: visualArtifacts.candidateSceneIr,
          candidateSceneIrDiff: visualArtifacts.candidateSceneIrDiff,
          candidateAssetIntentManifest: visualArtifacts.candidateAssetIntentManifest,
          candidateAssetDiff: visualArtifacts.candidateAssetDiff
        }),
    hasVisibleEffect: visualArtifacts === undefined ? candidateDslDiff.changes.length > 0 : visualChangeCount > 0
  };
}

function buildCandidateDslDiff(
  baseDsl: GameDslArtifact,
  candidateDsl: GameDslArtifact,
  proposal: SemanticEditProposal
): {
  schemaVersion: 'semantic_amendment_candidate_dsl_diff.v1';
  proposalId: string;
  sourceRunId: string;
  candidateRunId: string;
  summary: string;
  changes: CandidateDiffChange[];
  noVisibleEffectCode?: 'AMENDMENT_NO_VISIBLE_EFFECT';
} {
  const changes = [
    changedValue('/player/label', baseDsl.player.label, candidateDsl.player.label),
    changedValue('/sourceDsl/player/label', baseDsl.sourceDsl.player.label, candidateDsl.sourceDsl.player.label),
    changedValue('/sourceDsl/player/visual/assetIntentRef', baseDsl.sourceDsl.player.visual?.assetIntentRef, candidateDsl.sourceDsl.player.visual?.assetIntentRef)
  ].filter((change): change is CandidateDiffChange => change !== undefined);

  return {
    schemaVersion: 'semantic_amendment_candidate_dsl_diff.v1',
    proposalId: proposal.id,
    sourceRunId: proposal.runId,
    candidateRunId: candidateDsl.runId,
    summary: proposal.understanding.summary,
    changes,
    ...(changes.length === 0 ? { noVisibleEffectCode: 'AMENDMENT_NO_VISIBLE_EFFECT' as const } : {})
  };
}

function buildSideScrollingCandidateVisualArtifacts(input: {
  projectId: string;
  sourceRunId: string;
  candidateRunId: string;
  proposal: SemanticEditProposal;
  baseDsl: GameDslArtifact;
  candidateDsl: GameDslArtifact;
}):
  | {
      candidateSceneIr: SceneIr;
      candidateSceneIrDiff: ReturnType<typeof buildCandidateSceneIrDiff>;
      candidateAssetIntentManifest: AssetIntentManifest;
      candidateAssetDiff: ReturnType<typeof buildCandidateAssetDiff>;
    }
  | undefined {
  if (input.baseDsl.genre !== 'side_scrolling_run_and_gun' || input.candidateDsl.genre !== 'side_scrolling_run_and_gun') {
    return undefined;
  }

  const baseNormalized = normalizeCandidateSourceDsl(input.baseDsl.sourceDsl, 'base');
  const candidateNormalized = normalizeCandidateSourceDsl(input.candidateDsl.sourceDsl, 'candidate');
  const baseSceneIr = buildSceneIr({ projectId: input.projectId, runId: input.sourceRunId, rawDsl: input.baseDsl.sourceDsl, ir: baseNormalized.ir });
  const candidateSceneIr = buildSceneIr({
    projectId: input.projectId,
    runId: input.candidateRunId,
    rawDsl: input.candidateDsl.sourceDsl,
    ir: candidateNormalized.ir
  });
  const baseAssetIntentManifest = buildAssetIntentManifest({
    projectId: input.projectId,
    plan: buildAssetPlanFromIr(input.projectId, baseNormalized.ir),
    sceneIr: baseSceneIr
  });
  const candidateAssetIntentManifest = buildAssetIntentManifest({
    projectId: input.projectId,
    plan: buildAssetPlanFromIr(input.projectId, candidateNormalized.ir),
    sceneIr: candidateSceneIr
  });

  return {
    candidateSceneIr,
    candidateSceneIrDiff: buildCandidateSceneIrDiff({
      proposal: input.proposal,
      sourceRunId: input.sourceRunId,
      candidateRunId: input.candidateRunId,
      baseSceneIr,
      candidateSceneIr
    }),
    candidateAssetIntentManifest,
    candidateAssetDiff: buildCandidateAssetDiff({
      proposal: input.proposal,
      sourceRunId: input.sourceRunId,
      candidateRunId: input.candidateRunId,
      baseAssetIntentManifest,
      candidateAssetIntentManifest
    })
  };
}

function normalizeCandidateSourceDsl(rawDsl: RawGameDsl, label: 'base' | 'candidate') {
  const normalized = validateAndNormalizeRawGameDsl(rawDsl);
  if (!normalized.ok) {
    throw new ProjectRequestError(`semantic amendment ${label} DSL cannot be normalized: ${normalized.issues[0]?.message ?? 'unknown normalization error'}`);
  }
  return normalized;
}

function buildCandidateSceneIrDiff(input: {
  proposal: SemanticEditProposal;
  sourceRunId: string;
  candidateRunId: string;
  baseSceneIr: SceneIr;
  candidateSceneIr: SceneIr;
}) {
  const changes = [
    changedValue(
      '/scenes/0/player/visualAssetIntentRef',
      input.baseSceneIr.scenes[0]?.player.visualAssetIntentRef,
      input.candidateSceneIr.scenes[0]?.player.visualAssetIntentRef
    )
  ].filter((change): change is CandidateDiffChange => change !== undefined);

  return {
    schemaVersion: 'semantic_amendment_candidate_scene_ir_diff.v1',
    proposalId: input.proposal.id,
    sourceRunId: input.sourceRunId,
    candidateRunId: input.candidateRunId,
    changedRuntimeIds: changes.length === 0 ? [] : ['entity.player'],
    changes,
    ...(changes.length === 0 ? { noVisibleEffectCode: 'AMENDMENT_NO_VISIBLE_EFFECT' as const } : {})
  };
}

function buildCandidateAssetDiff(input: {
  proposal: SemanticEditProposal;
  sourceRunId: string;
  candidateRunId: string;
  baseAssetIntentManifest: AssetIntentManifest;
  candidateAssetIntentManifest: AssetIntentManifest;
}) {
  const basePlayerIntent = input.baseAssetIntentManifest.intents.find((intent) => intent.assetPlanId === 'player');
  const candidatePlayerIntent = input.candidateAssetIntentManifest.intents.find((intent) => intent.assetPlanId === 'player');
  const changes = [
    changedValue('/intents/player/id', basePlayerIntent?.id, candidatePlayerIntent?.id)
  ].filter((change): change is CandidateDiffChange => change !== undefined);

  return {
    schemaVersion: 'semantic_amendment_candidate_asset_diff.v1',
    proposalId: input.proposal.id,
    sourceRunId: input.sourceRunId,
    candidateRunId: input.candidateRunId,
    activeRunMutation: false as const,
    invalidatedAssetIntentRefs: basePlayerIntent !== undefined && candidatePlayerIntent !== undefined && basePlayerIntent.id !== candidatePlayerIntent.id ? [basePlayerIntent.id] : [],
    createdAssetIntentRefs: basePlayerIntent !== undefined && candidatePlayerIntent !== undefined && basePlayerIntent.id !== candidatePlayerIntent.id ? [candidatePlayerIntent.id] : [],
    changes,
    ...(changes.length === 0 ? { noVisibleEffectCode: 'AMENDMENT_NO_VISIBLE_EFFECT' as const } : {})
  };
}

function changedValue(path: string, before: unknown, after: unknown): CandidateDiffChange | undefined {
  return JSON.stringify(before) === JSON.stringify(after) ? undefined : { path, before, after };
}
