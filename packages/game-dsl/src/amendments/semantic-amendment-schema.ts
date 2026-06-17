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

export const ExecutionModeSchema = z.enum([
  'hot_runtime_patch',
  'dsl_patch_warm_restart',
  'candidate_regeneration',
  'unsupported_capability',
  'needs_clarification'
]);

export type SemanticAmendmentExecutionMode = z.infer<typeof ExecutionModeSchema>;

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
    affectedDomains: z.array(GameDomainSchema),
    designDeltas: z.array(GameDesignDeltaSchema),
    operations: z.array(GameOperationSchema),
    clarificationQuestion: z.string().min(1).optional()
  }),
  execution: z.strictObject({
    mode: ExecutionModeSchema,
    reason: z.string().min(1),
    supportedNow: z.boolean(),
    requiresPreviewReload: z.boolean(),
    requiresCandidateRun: z.boolean(),
    missingCapabilities: z.array(z.string()),
    rejectedUnsafeFallbacks: z.array(z.string())
  }),
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
