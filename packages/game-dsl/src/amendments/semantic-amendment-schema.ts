import { z } from 'zod';

import { GameDslArtifactSchema } from '../artifact-contract.js';

export const GameDomainSchema = z.enum([
  'player',
  'weapon',
  'projectile',
  'enemy',
  'boss',
  'pickup',
  'world',
  'level',
  'camera',
  'audio',
  'visual_effect',
  'ui',
  'rules',
  'difficulty',
  'pacing',
  'genre',
  'theme'
]);

export type GameDomain = z.infer<typeof GameDomainSchema>;

export const NumericChangeSchema = z.strictObject({
  direction: z.enum(['increase', 'decrease', 'set']),
  amount: z.union([z.number(), z.enum(['small', 'moderate', 'large'])]).optional()
});

export type NumericChange = z.infer<typeof NumericChangeSchema>;

export type TuneStatDelta = {
  kind: 'tune_stat';
  targetDomain: 'player' | 'enemy' | 'projectile' | 'weapon' | 'world' | 'boss' | 'pickup';
  targetRef?: string;
  stat: string;
  direction: 'increase' | 'decrease' | 'set';
  amount?: number | 'small' | 'moderate' | 'large';
  reason?: string;
};

export type AddMechanicDelta = {
  kind: 'add_mechanic';
  mechanic:
    | 'pickup'
    | 'weapon_upgrade'
    | 'shield'
    | 'boss'
    | 'hazard'
    | 'platforming'
    | 'multi_direction_shooting'
    | 'invulnerability'
    | 'screen_shake'
    | 'audio_feedback';
  description: string;
};

export type ModifyPacingDelta = {
  kind: 'modify_pacing';
  direction: 'faster' | 'slower' | 'harder' | 'easier' | 'more_chaotic' | 'more_fair' | 'more_arcade';
  inferredDeltas: GameDesignDelta[];
  description: string;
};

export type ReskinOrThemeDelta = {
  kind: 'reskin_or_theme';
  target: 'player' | 'enemy' | 'projectile' | 'world' | 'level' | 'ui' | 'audio';
  themeDescription: string;
};

export type AddFeedbackDelta = {
  kind: 'add_feedback';
  event: 'player_hit' | 'enemy_hit' | 'enemy_defeated' | 'pickup_collected' | 'boss_intro' | 'boss_defeated' | 'level_complete' | 'game_over';
  feedback: 'screen_shake' | 'flash' | 'invulnerability_flash' | 'audio_cue' | 'explosion' | 'particle' | 'ui_warning';
  description: string;
};

export type ChangeGenreOrPerspectiveDelta = {
  kind: 'change_genre_or_perspective';
  targetGenre: string;
  description: string;
};

export type OpenDesignRequestDelta = {
  kind: 'open_design_request';
  description: string;
  inferredGoals: string[];
};

export type GameDesignDelta =
  | TuneStatDelta
  | AddMechanicDelta
  | ModifyPacingDelta
  | ReskinOrThemeDelta
  | AddFeedbackDelta
  | ChangeGenreOrPerspectiveDelta
  | OpenDesignRequestDelta;

const TuneStatDeltaSchema = z.strictObject({
  kind: z.literal('tune_stat'),
  targetDomain: z.enum(['player', 'enemy', 'projectile', 'weapon', 'world', 'boss', 'pickup']),
  targetRef: z.string().min(1).optional(),
  stat: z.string().min(1),
  direction: z.enum(['increase', 'decrease', 'set']),
  amount: z.union([z.number(), z.enum(['small', 'moderate', 'large'])]).optional(),
  reason: z.string().min(1).optional()
});

const AddMechanicDeltaSchema = z.strictObject({
  kind: z.literal('add_mechanic'),
  mechanic: z.enum([
    'pickup',
    'weapon_upgrade',
    'shield',
    'boss',
    'hazard',
    'platforming',
    'multi_direction_shooting',
    'invulnerability',
    'screen_shake',
    'audio_feedback'
  ]),
  description: z.string().min(1)
});

const ReskinOrThemeDeltaSchema = z.strictObject({
  kind: z.literal('reskin_or_theme'),
  target: z.enum(['player', 'enemy', 'projectile', 'world', 'level', 'ui', 'audio']),
  themeDescription: z.string().min(1)
});

const AddFeedbackDeltaSchema = z.strictObject({
  kind: z.literal('add_feedback'),
  event: z.enum(['player_hit', 'enemy_hit', 'enemy_defeated', 'pickup_collected', 'boss_intro', 'boss_defeated', 'level_complete', 'game_over']),
  feedback: z.enum(['screen_shake', 'flash', 'invulnerability_flash', 'audio_cue', 'explosion', 'particle', 'ui_warning']),
  description: z.string().min(1)
});

const ChangeGenreOrPerspectiveDeltaSchema = z.strictObject({
  kind: z.literal('change_genre_or_perspective'),
  targetGenre: z.string().min(1),
  description: z.string().min(1)
});

const OpenDesignRequestDeltaSchema = z.strictObject({
  kind: z.literal('open_design_request'),
  description: z.string().min(1),
  inferredGoals: z.array(z.string().min(1))
});

export const GameDesignDeltaSchema: z.ZodType<GameDesignDelta> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    TuneStatDeltaSchema,
    AddMechanicDeltaSchema,
    z.strictObject({
      kind: z.literal('modify_pacing'),
      direction: z.enum(['faster', 'slower', 'harder', 'easier', 'more_chaotic', 'more_fair', 'more_arcade']),
      inferredDeltas: z.array(GameDesignDeltaSchema),
      description: z.string().min(1)
    }),
    ReskinOrThemeDeltaSchema,
    AddFeedbackDeltaSchema,
    ChangeGenreOrPerspectiveDeltaSchema,
    OpenDesignRequestDeltaSchema
  ])
);

export const GameEventSchema = z.enum([
  'game_start',
  'player_hit',
  'enemy_hit',
  'enemy_defeated',
  'pickup_collected',
  'boss_intro',
  'boss_defeated',
  'level_complete',
  'game_over'
]);

export const GameConditionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('random_chance'), value: z.number().min(0).max(1) }),
  z.strictObject({ kind: z.literal('target_matches'), target: z.string().min(1) }),
  z.strictObject({ kind: z.literal('health_below_ratio'), target: z.string().min(1), ratio: z.number().min(0).max(1) })
]);

export const GameActionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('spawn_pickup'), pickup: z.string().min(1) }),
  z.strictObject({ kind: z.literal('play_audio'), audioEvent: z.string().min(1) }),
  z.strictObject({ kind: z.literal('camera_shake'), intensity: z.number().min(0).max(1), durationMs: z.number().int().min(0) }),
  z.strictObject({ kind: z.literal('show_ui_warning'), message: z.string().min(1), durationMs: z.number().int().min(0) }),
  z.strictObject({ kind: z.literal('grant_effect'), effect: z.string().min(1), durationMs: z.number().int().min(0).optional() })
]);

export const GameOperationSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('event_action'),
    event: GameEventSchema,
    conditions: z.array(GameConditionSchema).optional(),
    actions: z.array(GameActionSchema).min(1)
  }),
  z.strictObject({
    kind: z.literal('behavior_change'),
    target: z.string().min(1),
    behavior: z.string().min(1),
    parameters: z.record(z.string(), z.unknown())
  }),
  z.strictObject({
    kind: z.literal('stat_tuning'),
    target: z.string().min(1),
    stat: z.string().min(1),
    change: NumericChangeSchema
  }),
  z.strictObject({
    kind: z.literal('theme_regeneration'),
    target: z.string().min(1),
    themePrompt: z.string().min(1)
  })
]);

export type GameOperation = z.infer<typeof GameOperationSchema>;

function isStableSemanticRef(value: string): boolean {
  if (value.startsWith('/') || value.includes('/')) {
    return false;
  }
  return value.split('.').every((segment) => segment.length > 0 && !/^\d+$/.test(segment));
}

const StableSemanticRefSchema = z.string().min(1).refine(isStableSemanticRef, 'value must be a stable semantic ref, not a raw path or array-index ref');

export const StableTargetSelectorSchema = z
  .strictObject({
    scope: z.enum(['game', 'scene', 'entity_archetype', 'entity_instance', 'component']),
    id: StableSemanticRefSchema.optional(),
    role: StableSemanticRefSchema.optional(),
    tags: z.array(StableSemanticRefSchema).optional(),
    parentRef: StableSemanticRefSchema.optional()
  })
  .refine((selector) => selector.id !== undefined || selector.role !== undefined || (selector.tags !== undefined && selector.tags.length > 0), {
    message: 'stable selector requires id, role, or tags'
  });

export type StableTargetSelector = z.infer<typeof StableTargetSelectorSchema>;

export const CapabilityRequirementSchema = z.strictObject({
  capabilityId: z.string().min(1),
  versionRange: z.string().min(1).optional(),
  reason: z.string().min(1),
  required: z.boolean()
});

export type CapabilityRequirement = z.infer<typeof CapabilityRequirementSchema>;

export const ExpectedEffectSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('property_changed'),
    target: StableTargetSelectorSchema,
    property: StableSemanticRefSchema,
    comparison: z.enum(['increased', 'decreased', 'equals', 'changed']),
    expectedValue: z.unknown().optional()
  }),
  z.strictObject({
    kind: z.literal('asset_binding'),
    target: StableTargetSelectorSchema,
    requiredAssetRoles: z.array(z.string().min(1)),
    allowRequiredFallback: z.boolean()
  }),
  z.strictObject({
    kind: z.literal('runtime_event'),
    eventName: z.string().min(1),
    minimumCount: z.number().int().min(0).optional()
  }),
  z.strictObject({
    kind: z.literal('constraint_preserved'),
    target: StableTargetSelectorSchema,
    property: StableSemanticRefSchema,
    expectedValue: z.unknown().optional()
  }),
  z.strictObject({
    kind: z.literal('no_regression'),
    checkId: StableSemanticRefSchema
  })
]);

export type ExpectedEffect = z.infer<typeof ExpectedEffectSchema>;

export const OperationPreconditionSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('target_exists'),
    target: StableTargetSelectorSchema
  }),
  z.strictObject({
    kind: z.literal('component_exists'),
    target: StableTargetSelectorSchema,
    componentType: StableSemanticRefSchema
  }),
  z.strictObject({
    kind: z.literal('current_value_equals'),
    target: StableTargetSelectorSchema,
    property: StableSemanticRefSchema,
    expectedValue: z.unknown()
  }),
  z.strictObject({
    kind: z.literal('required_scene_active'),
    sceneRef: StableSemanticRefSchema
  }),
  z.strictObject({
    kind: z.literal('asset_role_resolvable'),
    assetRole: StableSemanticRefSchema
  }),
  z.strictObject({
    kind: z.literal('entity_id_available'),
    entityId: StableSemanticRefSchema
  })
]);

export type OperationPrecondition = z.infer<typeof OperationPreconditionSchema>;

export const GameAmendmentOperationSchema = z.strictObject({
  operation: z.enum([
    'setComponentProperty',
    'addEntityArchetype',
    'removeEntityArchetype',
    'addEntityInstance',
    'removeEntityInstance',
    'addBehavior',
    'removeBehavior',
    'addRule',
    'modifyRule',
    'changeSceneTheme',
    'addSceneObject',
    'moveSceneObject',
    'removeSceneObject',
    'bindAsset',
    'replaceAsset',
    'changeSpawnPlan',
    'changeGoal'
  ]),
  id: z.string().min(1),
  target: StableTargetSelectorSchema,
  componentType: StableSemanticRefSchema.optional(),
  property: StableSemanticRefSchema.optional(),
  value: z.unknown().optional(),
  preconditions: z.array(OperationPreconditionSchema).min(1),
  requiresCapabilities: z.array(CapabilityRequirementSchema).min(1),
  expectedEffects: z.array(ExpectedEffectSchema).min(1)
});

export type GameAmendmentOperation = z.infer<typeof GameAmendmentOperationSchema>;

export const GameAmendmentIrSchema = z.strictObject({
  schemaVersion: z.literal('step34.game-amendment-ir.v1'),
  proposalId: z.string().min(1),
  requestId: z.string().min(1),
  baseRunId: z.string().min(1),
  baseArtifactHashes: z.record(z.string().min(1), z.string().min(1)),
  modelInvocationIds: z.array(z.string().min(1)),
  operations: z.array(GameAmendmentOperationSchema),
  operationDependencies: z.array(
    z.strictObject({
      operationId: z.string().min(1),
      dependsOn: z.array(z.string().min(1))
    })
  ),
  preservedConstraints: z.array(
    z.strictObject({
      id: z.string().min(1),
      description: z.string().min(1),
      target: StableTargetSelectorSchema.optional()
    })
  ),
  rejectedUnsafeFallbacks: z.array(
    z.strictObject({
      requestedConcept: z.string().min(1),
      rejectedFallback: z.string().min(1),
      reason: z.string().min(1)
    })
  ),
  provenance: z.strictObject({
    sourceTextHash: z.string().min(1),
    semanticUnderstandingHash: z.string().min(1),
    designDeltasHash: z.string().min(1)
  })
});

export type GameAmendmentIr = z.infer<typeof GameAmendmentIrSchema>;

export const ExecutionModeSchema = z.enum([
  'hot_runtime_patch',
  'dsl_patch_warm_restart',
  'candidate_regeneration',
  'unsupported_capability',
  'needs_clarification'
]);

export type SemanticAmendmentExecutionMode = z.infer<typeof ExecutionModeSchema>;

export const AmendmentExecutionPlanSchema = z.strictObject({
  schemaVersion: z.literal('step34.execution-plan.v1'),
  proposalId: z.string().min(1),
  mode: ExecutionModeSchema,
  reason: z.string().min(1),
  requiredCapabilities: z.array(z.string().min(1)),
  availableCapabilities: z.array(z.string().min(1)),
  missingCapabilities: z.array(z.string().min(1)),
  incompatibleCapabilities: z.array(z.string().min(1)),
  runtimeSessionRequired: z.boolean(),
  candidateRunRequired: z.boolean(),
  previewReloadRequired: z.boolean(),
  operationPlan: z.array(
    z.strictObject({
      operationId: z.string().min(1),
      compilerId: z.string().min(1).optional(),
      patchAdapterId: z.string().min(1).optional(),
      executionMode: ExecutionModeSchema
    })
  ),
  verificationRequirements: z.array(ExpectedEffectSchema),
  rejectedUnsafeFallbacks: z.array(z.string())
});

export type AmendmentExecutionPlan = z.infer<typeof AmendmentExecutionPlanSchema>;

export const SemanticAmendmentReviewStateSchema = z.enum(['proposed', 'previewing', 'accepted', 'rejected', 'undone', 'failed']);

export type SemanticAmendmentReviewState = z.infer<typeof SemanticAmendmentReviewStateSchema>;

export const SemanticAmendmentDraftPatchSchema = z.strictObject({
  ops: z.array(z.strictObject({ op: z.literal('replace'), path: z.string().min(1), value: z.unknown() })).min(1),
  reason: z.string().min(1)
});

export type SemanticAmendmentDraftPatch = z.infer<typeof SemanticAmendmentDraftPatchSchema>;

export const SemanticAmendmentCandidateBriefSchema = z.strictObject({
  sourceText: z.string().min(1),
  amendmentSummary: z.string().min(1),
  preserveGameplay: z.boolean()
});

export type SemanticAmendmentCandidateBrief = z.infer<typeof SemanticAmendmentCandidateBriefSchema>;

export const AmendmentContextPackSchema = z.strictObject({
  projectId: z.string().min(1),
  runId: z.string().min(1),
  currentBrief: z.unknown().optional(),
  currentDsl: GameDslArtifactSchema.optional(),
  currentIr: z.unknown().optional(),
  intentPlan: z
    .strictObject({
      normalizedGenre: z.string().min(1),
      matchedAlias: z.string().min(1).optional(),
      runtimeDslSupport: z.enum(['supported', 'unsupported'])
    })
    .optional(),
  runtimeCapabilityReport: z.unknown().optional(),
  pipelineArtifactIndex: z.unknown().optional(),
  hotPatchCapabilities: z.array(z.string()),
  dslPatchCapabilities: z.array(z.string()),
  generatorCapabilities: z.array(z.string()),
  runtimeTemplates: z.array(z.string()),
  preview: z.strictObject({
    available: z.boolean(),
    lastQaStatus: z.enum(['passed', 'failed', 'unknown']).optional()
  }),
  activeGenre: z.string().min(1).optional(),
  activeRuntimeTemplate: z.string().min(1).optional()
});

export type AmendmentContextPack = z.infer<typeof AmendmentContextPackSchema>;

export const SemanticEditProposalSchema = z.strictObject({
  id: z.string().min(1),
  projectId: z.string().min(1),
  runId: z.string().min(1),
  createdAt: z.string().min(1),
  sourceText: z.string().min(1),
  language: z.enum(['zh', 'en']),
  understanding: z.strictObject({
    understood: z.boolean(),
    confidence: z.number().min(0).max(1),
    summary: z.string().min(1),
    intentClass: z.enum(['typed_edit', 'open_design_edit', 'structural_edit', 'genre_or_system_edit', 'ambiguous']),
    affectedDomains: z.array(GameDomainSchema),
    designDeltas: z.array(GameDesignDeltaSchema),
    operations: z.array(GameOperationSchema),
    explicitConstraints: z.array(z.string()),
    inferredConstraints: z.array(z.string()),
    unresolvedReferences: z.array(z.string()),
    modelInvocationId: z.string().min(1),
    plannerProvenanceStatus: z.enum(['NOT_CALLED', 'CALLED_FAILED', 'CALLED_INVALID_OUTPUT', 'DEEPSEEK_PLANNED', 'HYBRID_DEEPSEEK_AND_RULES', 'RULE_FALLBACK', 'EXECUTED_FROM_DEEPSEEK_PLAN']),
    clarificationQuestion: z.string().min(1).optional()
  }),
  amendmentIr: GameAmendmentIrSchema,
  execution: z.strictObject({
    mode: ExecutionModeSchema,
    reason: z.string().min(1),
    supportedNow: z.boolean(),
    requiresPreviewReload: z.boolean(),
    requiresCandidateRun: z.boolean(),
    missingCapabilities: z.array(z.string()),
    rejectedUnsafeFallbacks: z.array(z.string())
  }),
  executionPlan: AmendmentExecutionPlanSchema,
  candidate: z
    .strictObject({
      dslPatch: SemanticAmendmentDraftPatchSchema.optional(),
      candidateDsl: GameDslArtifactSchema.optional(),
      candidateBrief: SemanticAmendmentCandidateBriefSchema.optional(),
      candidateRunId: z.string().min(1).optional(),
      expectedChangeSummary: z.array(z.string()).optional(),
      artifactSandboxPath: z.string().min(1).optional(),
      artifactRefs: z.record(z.string(), z.string()).optional()
    })
    .optional(),
  reviewState: SemanticAmendmentReviewStateSchema,
  validation: z
    .strictObject({
      schemaValid: z.boolean().optional(),
      compilePassed: z.boolean().optional(),
      previewBooted: z.boolean().optional(),
      runtimeNoException: z.boolean().optional(),
      gameplayTelemetryPassed: z.boolean().optional(),
      qaReportPath: z.string().min(1).optional()
    })
    .optional(),
  userMessage: z.string().min(1)
});

export type SemanticEditProposal = z.infer<typeof SemanticEditProposalSchema>;
