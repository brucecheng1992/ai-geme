import { describe, expect, it } from 'vitest';

import {
  GAME_BRIEF_V02_SCHEMA_VERSION,
  GameBriefIngressValidationError,
  parseAndNormalizeGameBrief
} from '../../packages/game-dsl/src/index.js';

const baseBrief = {
  brief_version: 'game-brief-v0.1',
  title: 'Long Form Run',
  genre: 'side_scrolling_run_and_gun',
  camera: 'side_view',
  core_loop: ['run', 'jump', 'shoot'],
  difficulty: 'normal'
} as const;

describe('Step37 GameBrief ingress normalization', () => {
  it('accepts canonical v0.2 brief output', () => {
    const result = parseAndNormalizeGameBrief({
      ...baseBrief,
      schema_version: GAME_BRIEF_V02_SCHEMA_VERSION,
      play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 }
    });

    expect(result.sourceFormat).toBe('v0.2');
    expect(result.canonical.play_time_intent).toEqual({ mode: 'range', min_sec: 480, max_sec: 720 });
  });

  it('accepts transitional old-key raw output above 120 without pretending it is valid v0.1', () => {
    const result = parseAndNormalizeGameBrief({
      ...baseBrief,
      target_play_time_sec: 600
    });

    expect(result.sourceFormat).toBe('legacy-open-duration');
    expect(result.canonical).toMatchObject({
      schema_version: GAME_BRIEF_V02_SCHEMA_VERSION,
      play_time_intent: { mode: 'target', target_sec: 600 }
    });
  });

  it('rejects mixed v0.2 play-time intent and legacy duration instead of collapsing a range', () => {
    expect(() =>
      parseAndNormalizeGameBrief({
        ...baseBrief,
        schema_version: GAME_BRIEF_V02_SCHEMA_VERSION,
        play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 },
        target_play_time_sec: 600
      })
    ).toThrow(GameBriefIngressValidationError);
  });

  it('fails closed with both parser issue sets for invalid ingress', () => {
    expect(() =>
      parseAndNormalizeGameBrief({
        ...baseBrief,
        target_play_time_sec: 0
      })
    ).toThrow(GameBriefIngressValidationError);
  });
});
