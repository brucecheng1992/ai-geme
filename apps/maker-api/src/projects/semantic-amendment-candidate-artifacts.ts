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
type CandidateAmendmentVerificationCheck = {
  checkId: string;
  target: string;
  status: 'passed' | 'failed';
  expected?: string;
  reason?: string;
  evidenceRefs: string[];
};
type CapabilityEffectVerificationCheck = {
  checkId: string;
  effectKind: string;
  status: 'passed' | 'failed' | 'inconclusive';
  expected: unknown;
  observed?: unknown;
  reason?: string;
  evidenceRefs: string[];
};

export type CandidateArtifactBundle = {
  preservationContract: ReturnType<typeof buildPreservationContract>;
  candidateArtifactPlan: ReturnType<typeof buildCandidateArtifactPlan>;
  candidateDslDiff: ReturnType<typeof buildCandidateDslDiff>;
  candidateSceneIr?: SceneIr;
  candidateSceneIrDiff?: ReturnType<typeof buildCandidateSceneIrDiff>;
  candidateAssetIntentManifest?: AssetIntentManifest;
  candidateAssetDiff?: ReturnType<typeof buildCandidateAssetDiff>;
  amendmentEffectDiff: ReturnType<typeof buildAmendmentEffectDiff>;
  capabilityEffectVerification: ReturnType<typeof buildCapabilityEffectVerification>;
  candidateAmendmentVerification: ReturnType<typeof buildCandidateAmendmentVerification>;
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
  const amendmentEffectDiff = buildAmendmentEffectDiff({
    proposal: input.proposal,
    sourceRunId: input.sourceRunId,
    candidateRunId: input.candidateRunId,
    baseDsl: input.baseDsl,
    candidateDsl: input.candidateDsl,
    candidateDslDiff,
    candidateSceneIrDiff: visualArtifacts?.candidateSceneIrDiff,
    candidateAssetDiff: visualArtifacts?.candidateAssetDiff
  });
  const capabilityEffectVerification = buildCapabilityEffectVerification({
    proposal: input.proposal,
    sourceRunId: input.sourceRunId,
    candidateRunId: input.candidateRunId,
    candidateDsl: input.candidateDsl,
    amendmentEffectDiff,
    candidateSceneIrDiff: visualArtifacts?.candidateSceneIrDiff,
    candidateAssetDiff: visualArtifacts?.candidateAssetDiff
  });

  return {
    preservationContract: buildPreservationContract(input.proposal),
    candidateArtifactPlan: buildCandidateArtifactPlan({
      proposal: input.proposal,
      sourceRunId: input.sourceRunId,
      candidateRunId: input.candidateRunId,
      hasSceneArtifacts: visualArtifacts !== undefined,
      hasAssetArtifacts: visualArtifacts !== undefined
    }),
    candidateDslDiff,
    ...(visualArtifacts === undefined
      ? {}
      : {
          candidateSceneIr: visualArtifacts.candidateSceneIr,
          candidateSceneIrDiff: visualArtifacts.candidateSceneIrDiff,
          candidateAssetIntentManifest: visualArtifacts.candidateAssetIntentManifest,
          candidateAssetDiff: visualArtifacts.candidateAssetDiff
        }),
    amendmentEffectDiff,
    capabilityEffectVerification,
    candidateAmendmentVerification: buildCandidateAmendmentVerification({
      proposal: input.proposal,
      sourceRunId: input.sourceRunId,
      candidateRunId: input.candidateRunId,
      candidateDslDiff,
      amendmentEffectDiff,
      capabilityEffectVerification,
      candidateSceneIrDiff: visualArtifacts?.candidateSceneIrDiff,
      candidateAssetDiff: visualArtifacts?.candidateAssetDiff
    }),
    hasVisibleEffect: visualArtifacts === undefined ? candidateDslDiff.changes.length > 0 : visualChangeCount > 0
  };
}

function buildCandidateArtifactPlan(input: {
  proposal: SemanticEditProposal;
  sourceRunId: string;
  candidateRunId: string;
  hasSceneArtifacts: boolean;
  hasAssetArtifacts: boolean;
}) {
  const basePath = `semantic-amendments/${input.proposal.id}/candidate`;
  const produced = (kind: string, path: string) => ({ kind, path, status: 'produced' as const });
  const skipped = (kind: string, reason: string) => ({ kind, status: 'skipped' as const, reason });

  return {
    schemaVersion: 'step34.candidate-artifact-plan.v1',
    proposalId: input.proposal.id,
    baseRunId: input.sourceRunId,
    candidateRunId: input.candidateRunId,
    artifacts: [
      produced('candidate_game_brief', `${basePath}/candidate_brief.json`),
      produced('preservation_contract', `${basePath}/preservation_contract.json`),
      produced('capability_effect_verification', `${basePath}/capability_effect_verification.json`),
      produced('candidate_game_dsl', `${basePath}/candidate_dsl.json`),
      ...(input.hasSceneArtifacts ? [produced('candidate_scene_ir', `${basePath}/candidate_scene_ir.json`)] : [skipped('candidate_scene_ir', 'scene_ir_not_required_for_current_profile')]),
      ...(input.hasAssetArtifacts
        ? [produced('candidate_asset_manifest', `${basePath}/candidate_asset_intent_manifest.json`)]
        : [skipped('candidate_asset_manifest', 'asset_manifest_not_required_for_current_profile')]),
      skipped('candidate_asset_resolution_report', 'asset_resolution_not_run_in_step34_regeneration_preview'),
      skipped('candidate_runtime_binding_report', 'runtime_binding_not_run_in_step34_regeneration_preview'),
      skipped('candidate_render_fidelity_report', 'render_fidelity_not_run_in_step34_regeneration_preview'),
      skipped('candidate_runtime_project', 'runtime_project_build_not_run_in_step34_regeneration_preview'),
      skipped('candidate_preview_entry', 'preview_entry_not_materialized_in_step34_regeneration_preview')
    ],
    diffs: {
      dslDiff: `${basePath}/candidate_dsl_diff.json`,
      ...(input.hasSceneArtifacts ? { sceneDiff: `${basePath}/candidate_scene_ir_diff.json` } : {}),
      ...(input.hasAssetArtifacts ? { assetDiff: `${basePath}/candidate_asset_diff.json` } : {}),
      behaviorDiff: 'skipped:behavior_diff_not_required_for_player_theme'
    }
  };
}

function buildPreservationContract(proposal: SemanticEditProposal) {
  return {
    schemaVersion: 'step34.preservation-contract.v1',
    proposalId: proposal.id,
    preserve: ['/player/physics', '/player/health', '/player/actions', '/genre', '/projectiles'],
    allowChange: ['/player/label', '/sourceDsl/player/label', '/sourceDsl/player/visual', '/scenes/0/player/visualAssetIntentRef', '/intents/player/id'],
    forbiddenFallbacks: proposal.execution.rejectedUnsafeFallbacks,
    inferredConstraints: proposal.understanding.inferredConstraints,
    capabilityGate: {
      regenerationCannotBypassUnsupportedCapability: true,
      executionMode: proposal.execution.mode,
      missingCapabilities: proposal.execution.missingCapabilities
    }
  };
}

function buildAmendmentEffectDiff(input: {
  proposal: SemanticEditProposal;
  sourceRunId: string;
  candidateRunId: string;
  baseDsl: GameDslArtifact;
  candidateDsl: GameDslArtifact;
  candidateDslDiff: ReturnType<typeof buildCandidateDslDiff>;
  candidateSceneIrDiff?: ReturnType<typeof buildCandidateSceneIrDiff>;
  candidateAssetDiff?: ReturnType<typeof buildCandidateAssetDiff>;
}) {
  const changes = [
    ...input.candidateDslDiff.changes.map((change) => ({ artifact: 'candidate_dsl_diff', ...change })),
    ...(input.candidateSceneIrDiff?.changes.map((change) => ({ artifact: 'candidate_scene_ir_diff', ...change })) ?? []),
    ...(input.candidateAssetDiff?.changes.map((change) => ({ artifact: 'candidate_asset_diff', ...change })) ?? [])
  ];
  const expectedPaths = new Set(['/player/label', '/sourceDsl/player/label', '/sourceDsl/player/visual/assetIntentRef', '/scenes/0/player/visualAssetIntentRef', '/intents/player/id']);
  const noOpOperations = changes.length === 0 ? input.proposal.amendmentIr.operations.map((operation) => operation.id) : [];
  const preservedNodes = [
    preservedNode('/player/physics', input.baseDsl.player.physics, input.candidateDsl.player.physics),
    preservedNode('/player/health', input.baseDsl.player.health, input.candidateDsl.player.health),
    preservedNode('/player/actions', input.baseDsl.player.actions, input.candidateDsl.player.actions),
    preservedNode('/genre', input.baseDsl.genre, input.candidateDsl.genre),
    preservedNode('/projectiles', input.baseDsl.projectiles, input.candidateDsl.projectiles)
  ];
  const unexpectedChanges = changes.filter((change) => !expectedPaths.has(change.path));
  const removedNodes: Array<{ path: string; before: unknown }> = [];
  const hasPreservedNodeDrift = preservedNodes.some((node) => node.status !== 'preserved');

  return {
    schemaVersion: 'step34.amendment-effect-diff.v1',
    proposalId: input.proposal.id,
    sourceRunId: input.sourceRunId,
    candidateRunId: input.candidateRunId,
    requestedChanges: input.proposal.amendmentIr.operations.map((operation) => ({
      operationId: operation.id,
      expectedEffects: operation.expectedEffects
    })),
    actualChanges: changes,
    unexpectedChanges,
    preservedNodes,
    removedNodes,
    noOpOperations,
    activeRunMutation: false as const,
    driftStatus: unexpectedChanges.length > 0 || hasPreservedNodeDrift || removedNodes.length > 0 ? ('failed' as const) : ('passed' as const),
    noVisibleEffectCode: changes.length === 0 ? ('AMENDMENT_NO_VISIBLE_EFFECT' as const) : undefined
  };
}

function buildCapabilityEffectVerification(input: {
  proposal: SemanticEditProposal;
  sourceRunId: string;
  candidateRunId: string;
  candidateDsl: GameDslArtifact;
  amendmentEffectDiff: ReturnType<typeof buildAmendmentEffectDiff>;
  candidateSceneIrDiff?: ReturnType<typeof buildCandidateSceneIrDiff>;
  candidateAssetDiff?: ReturnType<typeof buildCandidateAssetDiff>;
}) {
  const checks: CapabilityEffectVerificationCheck[] = input.proposal.executionPlan.verificationRequirements.map((effect, index) => {
    if (effect.kind === 'asset_binding') {
      const dslAssetBinding = effect.requiredAssetRoles.every((role) => role !== 'player' || input.candidateDsl.sourceDsl.player.visual?.assetIntentRef === 'player_cat');
      const sceneEvidence = input.candidateSceneIrDiff?.changes.some(
        (change) => change.path === '/scenes/0/player/visualAssetIntentRef' && typeof change.after === 'string'
      );
      const assetEvidence = effect.requiredAssetRoles.every((role) => {
        if (role === 'player') {
          return input.candidateAssetDiff?.createdAssetIntentRefs.includes('player_cat') === true;
        }
        return input.candidateAssetDiff?.createdAssetIntentRefs.some((assetRef) => assetRef.includes(role)) === true;
      });
      const status = dslAssetBinding && (input.candidateAssetDiff === undefined || (sceneEvidence === true && assetEvidence)) ? ('passed' as const) : ('failed' as const);
      return {
        checkId: `capability_effect_${index}`,
        effectKind: effect.kind,
        status,
        expected: effect,
        observed: {
          dslAssetIntentRef: input.candidateDsl.sourceDsl.player.visual?.assetIntentRef,
          sceneBindingChanged: sceneEvidence === true,
          createdAssetIntentRefs: input.candidateAssetDiff?.createdAssetIntentRefs ?? []
        },
        evidenceRefs: ['/candidate_dsl.json#/sourceDsl/player/visual/assetIntentRef', '/candidate_scene_ir_diff.json#/changes', '/candidate_asset_diff.json#/createdAssetIntentRefs'],
        ...(status === 'passed' ? {} : { reason: 'Required asset binding evidence was not observed in candidate scene and asset artifacts.' })
      };
    }
    if (effect.kind === 'property_changed') {
      const actualChange = input.amendmentEffectDiff.actualChanges.find((change) => change.path.endsWith(`/${effect.property}`) || change.path.includes(`/${effect.property}/`));
      const status = actualChange === undefined ? ('failed' as const) : ('passed' as const);
      return {
        checkId: `capability_effect_${index}`,
        effectKind: effect.kind,
        status,
        expected: effect,
        observed: actualChange,
        evidenceRefs: ['/amendment_effect_diff.json#/actualChanges'],
        ...(status === 'passed' ? {} : { reason: `Expected property change was not observed for ${effect.property}.` })
      };
    }
    return {
      checkId: `capability_effect_${index}`,
      effectKind: effect.kind,
      status: 'inconclusive' as const,
      expected: effect,
      evidenceRefs: [],
      reason: `No candidate artifact verifier is implemented for expected effect kind: ${effect.kind}.`
    };
  });
  const failed = checks.filter((check) => check.status !== 'passed');

  return {
    schemaVersion: 'step34.capability-effect-verification.v1',
    proposalId: input.proposal.id,
    sourceRunId: input.sourceRunId,
    candidateRunId: input.candidateRunId,
    executionMode: input.proposal.execution.mode,
    verificationRequirements: input.proposal.executionPlan.verificationRequirements,
    status: failed.length === 0 ? ('passed' as const) : ('failed' as const),
    checks,
    failureReasons: failed.map((check) => `${check.checkId}: ${check.reason ?? 'expected effect evidence was not observed'}`)
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

function buildCandidateAmendmentVerification(input: {
  proposal: SemanticEditProposal;
  sourceRunId: string;
  candidateRunId: string;
  candidateDslDiff: ReturnType<typeof buildCandidateDslDiff>;
  amendmentEffectDiff: ReturnType<typeof buildAmendmentEffectDiff>;
  capabilityEffectVerification: ReturnType<typeof buildCapabilityEffectVerification>;
  candidateSceneIrDiff?: ReturnType<typeof buildCandidateSceneIrDiff>;
  candidateAssetDiff?: ReturnType<typeof buildCandidateAssetDiff>;
}) {
  const checks: CandidateAmendmentVerificationCheck[] = input.proposal.understanding.designDeltas.flatMap((delta): CandidateAmendmentVerificationCheck[] => {
    if (delta.kind !== 'reskin_or_theme' || delta.target !== 'player') {
      return [
        {
          checkId: `unsupported_delta_${delta.kind}`,
          target: delta.kind,
          status: 'failed' as const,
          reason: `No amendment-specific verification is implemented for delta kind: ${delta.kind}.`,
          evidenceRefs: [] as string[]
        }
      ];
    }

    const labelChanged = input.candidateDslDiff.changes.some((change) => change.path === '/player/label' && change.after === '小猫');
    const checks: CandidateAmendmentVerificationCheck[] = [
      {
        checkId: 'player_theme_label_changed',
        target: 'player.label',
        status: labelChanged ? ('passed' as const) : ('failed' as const),
        expected: '小猫',
        evidenceRefs: ['/candidate_dsl_diff.json#/changes']
      }
    ];
    if (input.candidateSceneIrDiff !== undefined) {
      const sceneIntentChanged = input.candidateSceneIrDiff.changes.some((change) => change.path === '/scenes/0/player/visualAssetIntentRef' && change.after === 'player_cat');
      checks.push({
        checkId: 'player_theme_visual_intent_changed',
        target: 'scene.player.visualAssetIntentRef',
        status: sceneIntentChanged ? ('passed' as const) : ('failed' as const),
        expected: 'player_cat',
        evidenceRefs: ['/candidate_scene_ir_diff.json#/changes']
      });
    }
    if (input.candidateAssetDiff !== undefined) {
      const assetIntentCreated = input.candidateAssetDiff.createdAssetIntentRefs.includes('player_cat');
      checks.push({
        checkId: 'player_theme_asset_intent_created',
        target: 'asset_intent_manifest.player',
        status: assetIntentCreated ? ('passed' as const) : ('failed' as const),
        expected: 'player_cat',
        evidenceRefs: ['/candidate_asset_diff.json#/createdAssetIntentRefs']
      });
    }

    return checks;
  });
  checks.push({
    checkId: 'amendment_effect_drift_guard',
    target: 'amendment_effect_diff.driftStatus',
    status: input.amendmentEffectDiff.driftStatus === 'passed' ? ('passed' as const) : ('failed' as const),
    expected: 'passed',
    reason: input.amendmentEffectDiff.driftStatus === 'passed' ? undefined : 'Candidate changed preserved nodes or introduced unexpected changes.',
    evidenceRefs: ['/amendment_effect_diff.json#/driftStatus', '/amendment_effect_diff.json#/preservedNodes', '/amendment_effect_diff.json#/unexpectedChanges']
  });
  checks.push({
    checkId: 'capability_effect_verification',
    target: 'capability_effect_verification.status',
    status: input.capabilityEffectVerification.status === 'passed' ? ('passed' as const) : ('failed' as const),
    expected: 'passed',
    reason: input.capabilityEffectVerification.status === 'passed' ? undefined : 'One or more expected effects are missing or inconclusive.',
    evidenceRefs: ['/capability_effect_verification.json#/checks', '/capability_effect_verification.json#/verificationRequirements']
  });
  const failed = checks.filter((check) => check.status === 'failed');

  return {
    schemaVersion: 'semantic_amendment_verification.v1',
    proposalId: input.proposal.id,
    sourceRunId: input.sourceRunId,
    candidateRunId: input.candidateRunId,
    requestedSummary: input.proposal.understanding.summary,
    status: failed.length === 0 ? ('passed' as const) : ('failed' as const),
    checks,
    failureReasons: failed.map((check) => `${check.checkId}: ${check.reason ?? 'expected evidence was not observed'}`)
  };
}

function changedValue(path: string, before: unknown, after: unknown): CandidateDiffChange | undefined {
  return JSON.stringify(before) === JSON.stringify(after) ? undefined : { path, before, after };
}

function preservedNode(path: string, before: unknown, after: unknown) {
  const preserved = JSON.stringify(before) === JSON.stringify(after);
  return {
    path,
    status: preserved ? ('preserved' as const) : ('changed' as const),
    ...(preserved ? {} : { before, after })
  };
}
