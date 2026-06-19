import type { GameBrief } from './game-brief-v0.1.schema.js';
import type { GameBriefV02, PlayTimeIntent } from './game-brief-v0.2.schema.js';
import {
  RAW_GAME_DSL_V01_CONTRACT_STATUS,
  RAW_GAME_DSL_V01_DIALECT,
  RAW_GAME_DSL_V01_TARGET_PLAY_TIME_MAX_SEC,
  RAW_GAME_DSL_V01_TARGET_PLAY_TIME_MIN_SEC
} from './raw-game-dsl-v0.1.schema.js';

export const LEGACY_DSL_NONREPRESENTABLE = 'LEGACY_DSL_NONREPRESENTABLE' as const;

export type CompatibilityDisposition =
  | 'LOSSLESS_COMPATIBLE'
  | 'ADAPTER_REQUIRED'
  | 'NEW_CONSUMER_REQUIRED'
  | 'LEGACY_FORBIDDEN';

export type LegacyRepresentabilityReason =
  | 'LEGACY_V01_BRIEF'
  | 'TARGET_PLAY_TIME_PROJECTABLE'
  | 'TARGET_PLAY_TIME_OUT_OF_RANGE'
  | 'RANGE_PLAY_TIME_NOT_REPRESENTABLE'
  | 'ENDLESS_PLAY_TIME_NOT_REPRESENTABLE'
  | 'UNSPECIFIED_PLAY_TIME_NOT_REPRESENTABLE';

export type LegacyRepresentabilityResult =
  | {
      representable: true;
      disposition: Extract<CompatibilityDisposition, 'LOSSLESS_COMPATIBLE' | 'ADAPTER_REQUIRED'>;
      legacyDialect: typeof RAW_GAME_DSL_V01_DIALECT;
      contractStatus: typeof RAW_GAME_DSL_V01_CONTRACT_STATUS;
      reason: LegacyRepresentabilityReason;
      projectedBrief: GameBrief;
      projectedTargetPlayTimeSec: number;
      issues: [];
    }
  | {
      representable: false;
      disposition: Extract<CompatibilityDisposition, 'NEW_CONSUMER_REQUIRED' | 'LEGACY_FORBIDDEN'>;
      legacyDialect: typeof RAW_GAME_DSL_V01_DIALECT;
      contractStatus: typeof RAW_GAME_DSL_V01_CONTRACT_STATUS;
      code: typeof LEGACY_DSL_NONREPRESENTABLE;
      reason: LegacyRepresentabilityReason;
      projectedTargetPlayTimeSec?: number;
      issues: string[];
    };

export function classifyLegacyRawGameDslRepresentability(brief: GameBrief | GameBriefV02): LegacyRepresentabilityResult {
  if (!isGameBriefV02(brief)) {
    return {
      representable: true,
      disposition: 'LOSSLESS_COMPATIBLE',
      legacyDialect: RAW_GAME_DSL_V01_DIALECT,
      contractStatus: RAW_GAME_DSL_V01_CONTRACT_STATUS,
      reason: 'LEGACY_V01_BRIEF',
      projectedBrief: brief,
      projectedTargetPlayTimeSec: brief.target_play_time_sec,
      issues: []
    };
  }

  return classifyV02PlayTimeIntent(brief.play_time_intent, (targetPlayTimeSec) => {
    const { schema_version: _schemaVersion, play_time_intent: _playTimeIntent, ...legacyBrief } = brief;
    return {
      ...legacyBrief,
      target_play_time_sec: targetPlayTimeSec
    };
  });
}

function classifyV02PlayTimeIntent(
  playTimeIntent: PlayTimeIntent,
  projectBrief: (targetPlayTimeSec: number) => GameBrief
): LegacyRepresentabilityResult {
  if (playTimeIntent.mode === 'target') {
    const targetPlayTimeSec = playTimeIntent.target_sec;
    if (targetPlayTimeSec >= RAW_GAME_DSL_V01_TARGET_PLAY_TIME_MIN_SEC && targetPlayTimeSec <= RAW_GAME_DSL_V01_TARGET_PLAY_TIME_MAX_SEC) {
      return {
        representable: true,
        disposition: 'ADAPTER_REQUIRED',
        legacyDialect: RAW_GAME_DSL_V01_DIALECT,
        contractStatus: RAW_GAME_DSL_V01_CONTRACT_STATUS,
        reason: 'TARGET_PLAY_TIME_PROJECTABLE',
        projectedBrief: projectBrief(targetPlayTimeSec),
        projectedTargetPlayTimeSec: targetPlayTimeSec,
        issues: []
      };
    }

    return nonrepresentable('TARGET_PLAY_TIME_OUT_OF_RANGE', [
      `play_time_intent.target_sec: Raw Game DSL v0.1 supports only ${RAW_GAME_DSL_V01_TARGET_PLAY_TIME_MIN_SEC}..${RAW_GAME_DSL_V01_TARGET_PLAY_TIME_MAX_SEC} seconds, received ${targetPlayTimeSec}`
    ], targetPlayTimeSec);
  }

  if (playTimeIntent.mode === 'range') {
    return nonrepresentable('RANGE_PLAY_TIME_NOT_REPRESENTABLE', [
      'play_time_intent: Raw Game DSL v0.1 has one target_play_time_sec field and cannot preserve range intent',
      `play_time_intent.range: received ${playTimeIntent.min_sec}..${playTimeIntent.max_sec} seconds`
    ], Math.round((playTimeIntent.min_sec + playTimeIntent.max_sec) / 2));
  }

  if (playTimeIntent.mode === 'endless') {
    return nonrepresentable('ENDLESS_PLAY_TIME_NOT_REPRESENTABLE', [
      'play_time_intent: Raw Game DSL v0.1 has no endless play-time representation'
    ]);
  }

  return nonrepresentable('UNSPECIFIED_PLAY_TIME_NOT_REPRESENTABLE', [
    'play_time_intent: Raw Game DSL v0.1 requires target_play_time_sec and cannot preserve unspecified duration intent'
  ]);
}

function nonrepresentable(
  reason: Exclude<LegacyRepresentabilityReason, 'LEGACY_V01_BRIEF' | 'TARGET_PLAY_TIME_PROJECTABLE'>,
  issues: string[],
  projectedTargetPlayTimeSec?: number
): LegacyRepresentabilityResult {
  return {
    representable: false,
    disposition: 'NEW_CONSUMER_REQUIRED',
    legacyDialect: RAW_GAME_DSL_V01_DIALECT,
    contractStatus: RAW_GAME_DSL_V01_CONTRACT_STATUS,
    code: LEGACY_DSL_NONREPRESENTABLE,
    reason,
    ...(projectedTargetPlayTimeSec === undefined ? {} : { projectedTargetPlayTimeSec }),
    issues
  };
}

function isGameBriefV02(brief: GameBrief | GameBriefV02): brief is GameBriefV02 {
  return 'play_time_intent' in brief;
}
