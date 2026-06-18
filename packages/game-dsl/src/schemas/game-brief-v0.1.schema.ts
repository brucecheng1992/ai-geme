import { z } from 'zod';

import { RAW_DSL_GAME_GENRES } from '../runtime-capabilities.js';

/** Game Brief 是用户自然语言和 P0 DSL 之间的收敛契约。 */
export const GameBriefSchema = z.object({
  brief_version: z.literal('game-brief-v0.1'),
  title: z.string().min(1).max(80),
  genre: z.enum(RAW_DSL_GAME_GENRES),
  camera: z.enum(['top_down', 'side_view']),
  core_loop: z.array(z.string().min(1).max(120)).min(2).max(8),
  difficulty: z.enum(['easy', 'normal']),
  target_play_time_sec: z.number().int().min(30).max(120)
});

export type GameBrief = z.infer<typeof GameBriefSchema>;
