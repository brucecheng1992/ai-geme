import { z } from 'zod';

import { GameBriefSchema as GameBriefV01Schema } from './game-brief-v0.1.schema.js';
import {
  DurationSecondsSchema,
  GAME_BRIEF_V02_SCHEMA_VERSION,
  GameBriefV02Schema,
  type GameBriefV02
} from './game-brief-v0.2.schema.js';

const LegacyOpenDurationIngressSchema = GameBriefV01Schema.omit({
  target_play_time_sec: true
}).extend({
  target_play_time_sec: DurationSecondsSchema
});

export type GameBriefIngressResult = Readonly<{
  canonical: GameBriefV02;
  sourceFormat: 'v0.2' | 'legacy-open-duration';
}>;

export function parseAndNormalizeGameBrief(input: unknown): GameBriefIngressResult {
  const v02 = GameBriefV02Schema.safeParse(input);
  if (v02.success) {
    return { canonical: v02.data, sourceFormat: 'v0.2' };
  }

  const legacy = LegacyOpenDurationIngressSchema.safeParse(input);
  if (hasV02OnlyFields(input)) {
    throw new GameBriefIngressValidationError({
      v02Issues: v02.error.issues,
      legacyIssues: legacy.success ? [] : legacy.error.issues
    });
  }

  if (legacy.success) {
    const { target_play_time_sec: targetPlayTimeSec, ...rest } = legacy.data;
    return {
      canonical: GameBriefV02Schema.parse({
        ...rest,
        schema_version: GAME_BRIEF_V02_SCHEMA_VERSION,
        play_time_intent: {
          mode: 'target',
          target_sec: targetPlayTimeSec
        }
      }),
      sourceFormat: 'legacy-open-duration'
    };
  }

  throw new GameBriefIngressValidationError({
    v02Issues: v02.error.issues,
    legacyIssues: legacy.error.issues
  });
}

function hasV02OnlyFields(input: unknown): boolean {
  return typeof input === 'object' && input !== null && ('schema_version' in input || 'play_time_intent' in input);
}

export class GameBriefIngressValidationError extends Error {
  readonly code = 'GAME_BRIEF_INGRESS_VALIDATION_FAILED' as const;

  constructor(
    readonly details: Readonly<{
      v02Issues: readonly z.ZodIssue[];
      legacyIssues: readonly z.ZodIssue[];
    }>
  ) {
    super('Game Brief ingress validation failed');
  }
}
