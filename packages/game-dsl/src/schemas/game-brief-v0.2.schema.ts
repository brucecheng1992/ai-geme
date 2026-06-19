import { z } from 'zod';

import { GameBriefSchema as GameBriefV01Schema } from './game-brief-v0.1.schema.js';

export const GAME_BRIEF_V02_SCHEMA_VERSION = '0.2' as const;

/**
 * Product-level duration intent. Generation and QA budgets are represented by
 * GenerationScopePlan, so this schema has no gameplay-duration policy ceiling.
 */
export const DurationSecondsSchema = z
  .number()
  .finite()
  .int()
  .positive()
  .refine(Number.isSafeInteger, { message: 'duration must be a JavaScript safe integer' });

const TargetPlayTimeIntentSchema = z.strictObject({
  mode: z.literal('target'),
  target_sec: DurationSecondsSchema
});

const RangePlayTimeIntentSchema = z.strictObject({
  mode: z.literal('range'),
  min_sec: DurationSecondsSchema,
  max_sec: DurationSecondsSchema
});

const EndlessPlayTimeIntentSchema = z.strictObject({
  mode: z.literal('endless')
});

const UnspecifiedPlayTimeIntentSchema = z.strictObject({
  mode: z.literal('unspecified')
});

export const PlayTimeIntentSchema = z
  .discriminatedUnion('mode', [
    TargetPlayTimeIntentSchema,
    RangePlayTimeIntentSchema,
    EndlessPlayTimeIntentSchema,
    UnspecifiedPlayTimeIntentSchema
  ])
  .superRefine((value, context) => {
    if (value.mode === 'range' && value.min_sec > value.max_sec) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['max_sec'],
        message: 'max_sec must be greater than or equal to min_sec'
      });
    }
  });

const GameBriefV02BaseSchema = GameBriefV01Schema.omit({
  target_play_time_sec: true
});

export const GameBriefV02Schema = GameBriefV02BaseSchema.extend({
  schema_version: z.literal(GAME_BRIEF_V02_SCHEMA_VERSION),
  play_time_intent: PlayTimeIntentSchema
}).strict();

export type DurationSeconds = z.infer<typeof DurationSecondsSchema>;
export type PlayTimeIntent = z.infer<typeof PlayTimeIntentSchema>;
export type GameBriefV02 = z.infer<typeof GameBriefV02Schema>;

export function getRepresentativePlayTimeSec(intent: PlayTimeIntent): number | null {
  switch (intent.mode) {
    case 'target':
      return intent.target_sec;
    case 'range':
      return Math.round((intent.min_sec + intent.max_sec) / 2);
    case 'endless':
    case 'unspecified':
      return null;
  }
}

export function getPlanningUpperBoundSec(intent: PlayTimeIntent): number | null {
  switch (intent.mode) {
    case 'target':
      return intent.target_sec;
    case 'range':
      return intent.max_sec;
    case 'endless':
    case 'unspecified':
      return null;
  }
}

/** Compatibility projection for legacy v0.1-only downstream prompts. */
export function toLegacyTargetPlayTimeSec(intent: PlayTimeIntent): number | null {
  return getRepresentativePlayTimeSec(intent);
}
