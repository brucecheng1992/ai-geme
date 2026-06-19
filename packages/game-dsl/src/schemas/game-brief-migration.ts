import type { z } from 'zod';

import { GameBriefSchema as GameBriefV01Schema } from './game-brief-v0.1.schema.js';
import {
  GAME_BRIEF_V02_SCHEMA_VERSION,
  GameBriefV02Schema,
  type GameBriefV02
} from './game-brief-v0.2.schema.js';

type GameBriefV01 = z.infer<typeof GameBriefV01Schema>;

export function migrateGameBriefV01ToV02(input: GameBriefV01): GameBriefV02 {
  const { target_play_time_sec: targetPlayTimeSec, ...rest } = input;

  return GameBriefV02Schema.parse({
    ...rest,
    schema_version: GAME_BRIEF_V02_SCHEMA_VERSION,
    play_time_intent: {
      mode: 'target',
      target_sec: targetPlayTimeSec
    }
  });
}
