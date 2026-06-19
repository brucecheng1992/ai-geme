import { describe, expect, it } from 'vitest';

import {
  RAW_GAME_DSL_V01_CONTRACT_STATUS,
  RAW_GAME_DSL_V01_DIALECT,
  RAW_GAME_DSL_V01_TARGET_PLAY_TIME_MAX_SEC,
  RAW_GAME_DSL_V01_TARGET_PLAY_TIME_MIN_SEC,
  RawGameDslSchema,
  classifyLegacyRawGameDslRepresentability,
  type GameBrief,
  type GameBriefV02
} from '../../packages/game-dsl/src/index.js';
import { createCollectorRawDsl } from './fixtures.js';

const v01Brief: GameBrief = {
  brief_version: 'game-brief-v0.1',
  title: 'Reference Run',
  genre: 'collector',
  camera: 'top_down',
  core_loop: ['move', 'collect', 'win'],
  difficulty: 'normal',
  target_play_time_sec: 60
};

const v02Brief: GameBriefV02 = {
  brief_version: 'game-brief-v0.1',
  schema_version: '0.2',
  title: 'Reference Run',
  genre: 'collector',
  camera: 'top_down',
  core_loop: ['move', 'collect', 'win'],
  difficulty: 'normal',
  play_time_intent: { mode: 'target', target_sec: 60 }
};

describe('Legacy Raw Game DSL representability', () => {
  it('marks Raw Game DSL v0.1 as a legacy bounded contract', () => {
    expect(RAW_GAME_DSL_V01_DIALECT).toBe('game-dsl-v0.1');
    expect(RAW_GAME_DSL_V01_CONTRACT_STATUS).toBe('legacy');
    expect(RAW_GAME_DSL_V01_TARGET_PLAY_TIME_MIN_SEC).toBe(30);
    expect(RAW_GAME_DSL_V01_TARGET_PLAY_TIME_MAX_SEC).toBe(120);

    expect(() =>
      RawGameDslSchema.parse({
        ...createCollectorRawDsl(),
        game: { ...createCollectorRawDsl().game, target_play_time_sec: RAW_GAME_DSL_V01_TARGET_PLAY_TIME_MAX_SEC + 1 }
      })
    ).toThrow();
  });

  it('keeps v0.1 briefs losslessly representable by the legacy contract', () => {
    expect(classifyLegacyRawGameDslRepresentability(v01Brief)).toMatchObject({
      representable: true,
      disposition: 'LOSSLESS_COMPATIBLE',
      legacyDialect: 'game-dsl-v0.1',
      contractStatus: 'legacy',
      reason: 'LEGACY_V01_BRIEF',
      projectedBrief: v01Brief,
      projectedTargetPlayTimeSec: 60,
      issues: []
    });
  });

  it('requires an adapter for short v0.2 target intents', () => {
    expect(classifyLegacyRawGameDslRepresentability(v02Brief)).toMatchObject({
      representable: true,
      disposition: 'ADAPTER_REQUIRED',
      reason: 'TARGET_PLAY_TIME_PROJECTABLE',
      projectedBrief: {
        target_play_time_sec: 60
      },
      projectedTargetPlayTimeSec: 60,
      issues: []
    });
  });

  it.each([
    ['long target', { mode: 'target', target_sec: 600 }, 'TARGET_PLAY_TIME_OUT_OF_RANGE'],
    ['range', { mode: 'range', min_sec: 480, max_sec: 720 }, 'RANGE_PLAY_TIME_NOT_REPRESENTABLE'],
    ['endless', { mode: 'endless' }, 'ENDLESS_PLAY_TIME_NOT_REPRESENTABLE'],
    ['unspecified', { mode: 'unspecified' }, 'UNSPECIFIED_PLAY_TIME_NOT_REPRESENTABLE']
  ] as const)('classifies %s v0.2 play-time intent as nonrepresentable', (_label, playTimeIntent, reason) => {
    expect(classifyLegacyRawGameDslRepresentability({ ...v02Brief, play_time_intent: playTimeIntent })).toMatchObject({
      representable: false,
      disposition: 'NEW_CONSUMER_REQUIRED',
      code: 'LEGACY_DSL_NONREPRESENTABLE',
      reason,
      legacyDialect: 'game-dsl-v0.1',
      contractStatus: 'legacy'
    });
  });
});
