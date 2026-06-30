import { z } from 'zod';

import {
  DEFAULT_UNSPECIFIED_PLAY_TIME_SEC,
  DurationSecondsSchema,
  PlayTimeIntentSchema,
  getPlanningUpperBoundSec,
  type PlayTimeIntent
} from './schemas/game-brief-v0.2.schema.js';

export const DurationResolutionGateSchema = z.strictObject({
  verdict: z.literal('PASS'),
  duration_intent_resolved: z.literal(true),
  explicit_duration_present: z.boolean(),
  duration_defaulted: z.boolean(),
  duration_source: z.enum(['explicit_user_prompt', 'profile_default', 'product_default']),
  resolution_status: z.enum(['explicit', 'profile_default', 'product_default']),
  requested_mode: z.enum(['target', 'range', 'endless', 'unspecified']),
  resolved_target_sec: DurationSecondsSchema.nullable(),
  default_target_sec: DurationSecondsSchema.nullable(),
  missing_duration_was_fatal: z.literal(false),
  duration_missing_was_fatal: z.literal(false),
  generation_failed_due_to_missing_duration: z.literal(false),
  unsupported_required_capabilities: z.tuple([])
});

export const GenerationScopePlanSchema = z.strictObject({
  schemaVersion: z.literal('step37.generation-scope-plan.v1'),
  deliveryMode: z.enum(['single_pass', 'staged', 'endless_system']),
  requestedPlayTime: PlayTimeIntentSchema,
  duration_resolution_gate: DurationResolutionGateSchema,
  qaProbeWindowSec: z.number().int().min(10).max(120),
  plannedContentStages: z.number().int().positive(),
  fullCompletionVerification: z.enum([
    'full_playthrough',
    'accelerated_simulation',
    'checkpoint_scenarios',
    'endless_invariant_suite'
  ]),
  preservesRequestedPlayTime: z.literal(true)
});

export type DurationResolutionGate = z.infer<typeof DurationResolutionGateSchema>;
export type GenerationScopePlan = z.infer<typeof GenerationScopePlanSchema>;

export function buildGenerationScopePlan(input: { requestedPlayTime: PlayTimeIntent }): GenerationScopePlan {
  const requestedPlayTime = PlayTimeIntentSchema.parse(input.requestedPlayTime);
  const durationResolutionGate = buildDurationResolutionGate({ requestedPlayTime });
  if (requestedPlayTime.mode === 'endless') {
    return GenerationScopePlanSchema.parse({
      schemaVersion: 'step37.generation-scope-plan.v1',
      deliveryMode: 'endless_system',
      requestedPlayTime,
      duration_resolution_gate: durationResolutionGate,
      qaProbeWindowSec: 120,
      plannedContentStages: 1,
      fullCompletionVerification: 'endless_invariant_suite',
      preservesRequestedPlayTime: true
    });
  }

  const upperBound = getPlanningUpperBoundSec(requestedPlayTime);
  const effectiveUpperBound = upperBound ?? durationResolutionGate.resolved_target_sec;
  const isLongForm = effectiveUpperBound !== null && effectiveUpperBound > 120;

  return GenerationScopePlanSchema.parse({
    schemaVersion: 'step37.generation-scope-plan.v1',
    deliveryMode: isLongForm ? 'staged' : 'single_pass',
    requestedPlayTime,
    duration_resolution_gate: durationResolutionGate,
    qaProbeWindowSec: effectiveUpperBound === null ? 30 : Math.min(120, Math.max(10, effectiveUpperBound)),
    plannedContentStages: isLongForm && effectiveUpperBound !== null ? Math.max(2, Math.ceil(effectiveUpperBound / 240)) : 1,
    fullCompletionVerification: isLongForm ? 'checkpoint_scenarios' : 'full_playthrough',
    preservesRequestedPlayTime: true
  });
}

export function buildDurationResolutionGate(input: { requestedPlayTime: PlayTimeIntent }): DurationResolutionGate {
  const requestedPlayTime = PlayTimeIntentSchema.parse(input.requestedPlayTime);
  if (requestedPlayTime.mode === 'unspecified') {
    return DurationResolutionGateSchema.parse({
      verdict: 'PASS',
      duration_intent_resolved: true,
      explicit_duration_present: false,
      duration_defaulted: true,
      duration_source: 'product_default',
      resolution_status: 'product_default',
      requested_mode: requestedPlayTime.mode,
      resolved_target_sec: DEFAULT_UNSPECIFIED_PLAY_TIME_SEC,
      default_target_sec: DEFAULT_UNSPECIFIED_PLAY_TIME_SEC,
      missing_duration_was_fatal: false,
      duration_missing_was_fatal: false,
      generation_failed_due_to_missing_duration: false,
      unsupported_required_capabilities: []
    });
  }

  return DurationResolutionGateSchema.parse({
    verdict: 'PASS',
    duration_intent_resolved: true,
    explicit_duration_present: true,
    duration_defaulted: false,
    duration_source: 'explicit_user_prompt',
    resolution_status: 'explicit',
    requested_mode: requestedPlayTime.mode,
    resolved_target_sec: requestedPlayTime.mode === 'target' ? requestedPlayTime.target_sec : null,
    default_target_sec: null,
    missing_duration_was_fatal: false,
    duration_missing_was_fatal: false,
    generation_failed_due_to_missing_duration: false,
    unsupported_required_capabilities: []
  });
}
