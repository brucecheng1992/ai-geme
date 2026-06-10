import type { GameBrief } from '../../../../packages/game-dsl/src/index.js';

export type SupportedGameGenre = GameBrief['genre'];

export type RawDslPromptContext = {
  idea: string;
  language: 'zh' | 'en';
  brief: GameBrief;
  selected_contract: unknown;
  allowed_enums: {
    genres: SupportedGameGenre[];
    cameras: ['top_down'];
    difficulties: Array<GameBrief['difficulty']>;
    languages: Array<'zh' | 'en'>;
    movement_types: string[];
    action_types: string[];
    entity_kinds: string[];
    collision_types: string[];
    effect_types: string[];
    win_types: string[];
    lose_types: string[];
    hud_items: string[];
  };
  forbidden_terms: string[];
  forbidden_fields: string[];
  output_json_rule: string;
  valid_example: unknown;
  invalid_examples_summary: string[];
  p0_scope: string[];
  anti_shell_rules: string[];
  composable_mechanics: string[];
};

export type BuildRawDslPromptContextParams = {
  idea: string;
  language: 'zh' | 'en';
  brief: GameBrief;
};
