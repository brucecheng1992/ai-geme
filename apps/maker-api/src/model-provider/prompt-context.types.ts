import type { ActiveProfileLock, AuthorityBundle, AuthorityBundleRef, GameBrief, GenerationScopePlan } from '../../../../packages/game-dsl/src/index.js';

export type SupportedGameGenre = GameBrief['genre'];

export type RawDslPromptContext = {
  idea: string;
  language: 'zh' | 'en';
  brief: GameBrief;
  canonical_brief_ref?: {
    artifactKind: 'canonical_game_brief';
    path: 'canonical_game_brief.json';
    contentHash: string;
  };
  authority_bundle_ref?: AuthorityBundleRef;
  active_profile_lock_ref?: {
    artifactKind: 'active_profile_lock';
    path: 'active_profile_lock.json';
    lockHash: string;
  };
  active_profile_lock?: ActiveProfileLock;
  generation_scope_plan?: GenerationScopePlan;
  raw_dsl_authority?: AuthorityBundle['rawDslConsumption'];
  selected_contract: unknown;
  runtime_generation_context?: DslGenerationContext;
  allowed_enums: {
    genres: SupportedGameGenre[];
    cameras: Array<GameBrief['camera']>;
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
    coordinate_systems: string[];
    camera_modes: string[];
    player_controllers: string[];
    aiming_modes: string[];
    terrain_kinds: string[];
    spawn_triggers: string[];
    pickup_kinds: string[];
    scene_background_roles: string[];
    scene_platform_shapes: string[];
    scene_goal_kinds: string[];
    scene_theme_time_of_day: string[];
    visual_facing_modes: string[];
  };
  forbidden_terms: string[];
  forbidden_fields: string[];
  output_json_rule: string;
  valid_example: unknown;
  invalid_examples_summary: string[];
  p0_scope: string[];
  anti_shell_rules: string[];
  composable_mechanics: string[];
  spawn_generation_guidance: string[];
  difficulty_runtime_guidance: string[];
  enemy_wave_runtime_guidance: string[];
};

export type DslGenerationContext = {
  normalizedGenre: string;
  profileVersion: string;
  dslProfile: string;
  irProfile: string;
  runtimeTemplate: string;
  supportedCapabilities: string[];
  deferredCapabilities: string[];
  requiredCapabilities: string[];
  schema: unknown;
};

export type BuildRawDslPromptContextParams = {
  idea: string;
  language: 'zh' | 'en';
  brief: GameBrief;
  authorityBundle?: AuthorityBundle;
};
