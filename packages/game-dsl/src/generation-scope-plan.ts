import { z } from 'zod';

import {
  PlayTimeIntentSchema,
  getPlanningUpperBoundSec,
  type PlayTimeIntent
} from './schemas/game-brief-v0.2.schema.js';

export const GenerationScopePlanSchema = z.strictObject({
  schemaVersion: z.literal('step37.generation-scope-plan.v1'),
  deliveryMode: z.enum(['single_pass', 'staged', 'endless_system']),
  requestedPlayTime: PlayTimeIntentSchema,
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

export type GenerationScopePlan = z.infer<typeof GenerationScopePlanSchema>;

export function buildGenerationScopePlan(input: { requestedPlayTime: PlayTimeIntent }): GenerationScopePlan {
  const requestedPlayTime = PlayTimeIntentSchema.parse(input.requestedPlayTime);
  if (requestedPlayTime.mode === 'endless') {
    return GenerationScopePlanSchema.parse({
      schemaVersion: 'step37.generation-scope-plan.v1',
      deliveryMode: 'endless_system',
      requestedPlayTime,
      qaProbeWindowSec: 120,
      plannedContentStages: 1,
      fullCompletionVerification: 'endless_invariant_suite',
      preservesRequestedPlayTime: true
    });
  }

  const upperBound = getPlanningUpperBoundSec(requestedPlayTime);
  const isLongForm = upperBound !== null && upperBound > 120;

  return GenerationScopePlanSchema.parse({
    schemaVersion: 'step37.generation-scope-plan.v1',
    deliveryMode: isLongForm ? 'staged' : 'single_pass',
    requestedPlayTime,
    qaProbeWindowSec: upperBound === null ? 30 : Math.min(120, Math.max(10, upperBound)),
    plannedContentStages: isLongForm ? Math.max(2, Math.ceil(upperBound / 240)) : 1,
    fullCompletionVerification: isLongForm ? 'checkpoint_scenarios' : 'full_playthrough',
    preservesRequestedPlayTime: true
  });
}
