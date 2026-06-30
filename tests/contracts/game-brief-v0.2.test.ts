import { describe, expect, it } from 'vitest';

import {
  GAME_BRIEF_V02_SCHEMA_VERSION,
  GameBriefSchema,
  GameBriefV02Schema,
  getPlanningUpperBoundSec,
  getRepresentativePlayTimeSec,
  migrateGameBriefV01ToV02,
  toLegacyTargetPlayTimeSec
} from '../../packages/game-dsl/src/index.js';

const v01Brief = {
  brief_version: 'game-brief-v0.1',
  title: 'Reference Run',
  genre: 'side_scrolling_run_and_gun',
  camera: 'side_view',
  core_loop: ['run', 'jump', 'shoot'],
  difficulty: 'normal',
  target_play_time_sec: 60
} satisfies Parameters<typeof migrateGameBriefV01ToV02>[0];

describe('Step37 GameBrief v0.2 play-time intent contract', () => {
  it('keeps v0.1 historically capped while accepting v0.2 long target intent', () => {
    expect(() => GameBriefSchema.parse({ ...v01Brief, target_play_time_sec: 600 })).toThrow();

    const brief = GameBriefV02Schema.parse({
      ...stripV01Duration(v01Brief),
      schema_version: GAME_BRIEF_V02_SCHEMA_VERSION,
      play_time_intent: { mode: 'target', target_sec: 600 }
    });

    expect(brief.play_time_intent).toEqual({ mode: 'target', target_sec: 600 });
    expect(getRepresentativePlayTimeSec(brief.play_time_intent)).toBe(600);
    expect(getPlanningUpperBoundSec(brief.play_time_intent)).toBe(600);
    expect(toLegacyTargetPlayTimeSec(brief.play_time_intent)).toBe(600);
  });

  it('preserves an 8-12 minute range instead of collapsing it to one legacy number', () => {
    const brief = GameBriefV02Schema.parse({
      ...stripV01Duration(v01Brief),
      schema_version: GAME_BRIEF_V02_SCHEMA_VERSION,
      play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 }
    });

    expect(brief.play_time_intent).toEqual({ mode: 'range', min_sec: 480, max_sec: 720 });
    expect(getRepresentativePlayTimeSec(brief.play_time_intent)).toBe(600);
    expect(getPlanningUpperBoundSec(brief.play_time_intent)).toBe(720);
    expect(toLegacyTargetPlayTimeSec(brief.play_time_intent)).toBe(600);
  });

  it.each([
    ['target 5 seconds', { mode: 'target', target_sec: 5 }],
    ['endless', { mode: 'endless' }],
    ['unspecified', { mode: 'unspecified' }]
  ] as const)('accepts %s as explicit intent', (_label, playTimeIntent) => {
    expect(() =>
      GameBriefV02Schema.parse({
        ...stripV01Duration(v01Brief),
        schema_version: GAME_BRIEF_V02_SCHEMA_VERSION,
        play_time_intent: playTimeIntent
      })
    ).not.toThrow();
  });

  it.each([
    ['zero target', { mode: 'target', target_sec: 0 }],
    ['negative target', { mode: 'target', target_sec: -1 }],
    ['reversed range', { mode: 'range', min_sec: 720, max_sec: 480 }],
    ['unsafe integer', { mode: 'target', target_sec: Number.MAX_SAFE_INTEGER + 1 }]
  ] as const)('rejects %s', (_label, playTimeIntent) => {
    expect(() =>
      GameBriefV02Schema.parse({
        ...stripV01Duration(v01Brief),
        schema_version: GAME_BRIEF_V02_SCHEMA_VERSION,
        play_time_intent: playTimeIntent
      })
    ).toThrow();
  });

  it('migrates valid v0.1 deterministically without rewriting the source object', () => {
    const first = migrateGameBriefV01ToV02(v01Brief);
    const second = migrateGameBriefV01ToV02({ ...v01Brief });

    expect(first).toEqual(second);
    expect(first.play_time_intent).toEqual({ mode: 'target', target_sec: 60 });
    expect(first).not.toHaveProperty('target_play_time_sec');
    expect(v01Brief.target_play_time_sec).toBe(60);
  });

  it('projects unspecified intent to the normal legacy target without rewriting canonical intent', () => {
    const brief = GameBriefV02Schema.parse({
      ...stripV01Duration(v01Brief),
      schema_version: GAME_BRIEF_V02_SCHEMA_VERSION,
      play_time_intent: { mode: 'unspecified' }
    });

    expect(brief.play_time_intent).toEqual({ mode: 'unspecified' });
    expect(getRepresentativePlayTimeSec(brief.play_time_intent)).toBeNull();
    expect(toLegacyTargetPlayTimeSec(brief.play_time_intent)).toBe(60);
  });
});

function stripV01Duration(brief: typeof v01Brief) {
  const { target_play_time_sec: _targetPlayTimeSec, ...rest } = brief;
  return rest;
}
