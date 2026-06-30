import { Injectable } from '@nestjs/common';
import type { ZodIssue, ZodType } from 'zod';

import {
  CAPABILITY_GAME_DSL_DRAFT_RAW_PATH,
  CAPABILITY_GAME_DSL_DRAFT_SCHEMA_VERSION,
  CapabilityGameDslDraftV1Schema,
  GAME_BRIEF_V02_SCHEMA_VERSION,
  GameBriefIngressValidationError,
  LEGACY_DSL_NONREPRESENTABLE,
  RawGameDslSchema,
  classifyLegacyRawGameDslRepresentability,
  parseAndNormalizeGameBrief,
  toLegacyTargetPlayTimeSec,
  validateAuthorityBundleForRun,
  type AuthorityBundle,
  type CapabilityGameDslDraftV1,
  type GameBrief,
  type GameBriefIngressResult,
  type GameBriefV02,
  type RawGameDsl
} from '../../../../packages/game-dsl/src/index.js';
import { DeepSeekClient } from './deepseek.client.js';
import type { GenerateJsonFailure, GenerateJsonResult } from './model-provider.types.js';
import { buildIntentPlan, normalizeBriefWithIntentPlan } from './intent-plan.js';
import { buildRawDslPromptContext } from './prompt-context.builder.js';

type Language = 'zh' | 'en';

type GenerateGameBriefParams = {
  projectId: string;
  runId: string;
  idea: string;
  language: Language;
};

type GenerateRawGameDslParams = GenerateGameBriefParams & {
  brief: ProviderGameBrief;
  authorityBundle: AuthorityBundle;
};

type CapabilityDraftAuthorityContext = {
  activeProfileLock: Pick<AuthorityBundle['activeProfileLock'], 'profileId'>;
};

type GenerateCapabilityGameDslDraftParams = GenerateGameBriefParams & {
  brief: GameBriefV02;
  authorityBundle: CapabilityDraftAuthorityContext;
  capabilityIds: string[];
};

type SchemaValidationFailure = {
  ok: false;
  code: 'MODEL_SCHEMA_VALIDATION_FAILED' | typeof LEGACY_DSL_NONREPRESENTABLE;
  message: string;
  rawText?: string;
  rawOutputPath?: string;
  issues: string[];
};

type GameDslProviderFailure = GenerateJsonFailure | SchemaValidationFailure;

type GameDslProviderSuccess<T> = {
  ok: true;
  value: T;
  rawText: string;
  rawOutputPath: string;
  sourceFormat?: GameBriefIngressResult['sourceFormat'];
};

export type GameDslProviderResult<T> = GameDslProviderSuccess<T> | GameDslProviderFailure;

type JsonModelClient = Pick<DeepSeekClient, 'generateJson'>;
export type ProviderGameBrief = GameBrief | GameBriefV02;
const runAndGunSourceReferencePattern = /魂斗罗式?|contra-like|contra/gi;

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const knownDeclarativeModelKeyRewrites: Record<string, string> = {
  on_contact: 'contact_result',
  on_zero_retries: 'zero_retries_result'
};

function normalizeKnownDeclarativeModelKeys(value: unknown): { value: unknown; changed: boolean } {
  if (Array.isArray(value)) {
    let changed = false;
    const normalized = value.map((child) => {
      const result = normalizeKnownDeclarativeModelKeys(child);
      changed ||= result.changed;
      return result.value;
    });
    return changed ? { value: normalized, changed } : { value, changed: false };
  }

  if (!isJsonObject(value)) {
    return { value, changed: false };
  }

  let changed = false;
  const normalized = Object.fromEntries(
    Object.entries(value).map(([key, child]) => {
      const normalizedKey = knownDeclarativeModelKeyRewrites[key] ?? key;
      const normalizedChild = normalizeKnownDeclarativeModelKeys(child);
      changed ||= normalizedKey !== key || normalizedChild.changed;
      return [normalizedKey, normalizedChild.value];
    })
  );
  return changed ? { value: normalized, changed } : { value, changed: false };
}

function normalizeCapabilityDraftForSchemaIngress(result: GenerateJsonResult): GenerateJsonResult {
  if (!result.ok || !isJsonObject(result.json)) {
    return result;
  }

  const scenes = Array.isArray(result.json.scenes) ? result.json.scenes : [];
  const sceneIds = new Set(scenes.flatMap((scene) => (isJsonObject(scene) && typeof scene.id === 'string' ? [scene.id] : [])));
  const entities = Array.isArray(result.json.entities) ? result.json.entities : [];
  const entityIds = new Set(entities.flatMap((entity) => (isJsonObject(entity) && typeof entity.id === 'string' ? [entity.id] : [])));
  const capabilityConfigs = Array.isArray(result.json.capability_configs) ? result.json.capability_configs : null;

  if (capabilityConfigs === null || sceneIds.size === 0) {
    return result;
  }

  let changed = false;
  const normalizedConfigs = capabilityConfigs.map((config) => {
    if (!isJsonObject(config)) {
      return config;
    }

    let normalizedConfig = config;
    if ('config' in config) {
      const normalizedConfigValue = normalizeKnownDeclarativeModelKeys(config.config);
      if (normalizedConfigValue.changed) {
        changed = true;
        normalizedConfig = { ...normalizedConfig, config: normalizedConfigValue.value };
      }
    }

    if (!Array.isArray(normalizedConfig.applies_to)) {
      return normalizedConfig;
    }

    const appliesTo = normalizedConfig.applies_to;
    const isEmptyScope = appliesTo.length === 0;
    const pointsOnlyToSceneIds =
      appliesTo.length > 0 && appliesTo.every((id) => typeof id === 'string' && sceneIds.has(id) && !entityIds.has(id));

    if (!isEmptyScope && !pointsOnlyToSceneIds) {
      return normalizedConfig;
    }

    changed = true;
    const configWithoutAppliesTo = { ...normalizedConfig };
    delete configWithoutAppliesTo.applies_to;
    return configWithoutAppliesTo;
  });

  return changed ? { ...result, json: { ...result.json, capability_configs: normalizedConfigs } } : result;
}

function normalizeRunAndGunDescription(description: string, language: Language): string {
  const replacement = language === 'zh' ? '原创横版跑枪' : 'generic side-scrolling run-and-gun';
  return description.replace(runAndGunSourceReferencePattern, replacement);
}

function validateRawDslAuthorityPrerequisites(params: GenerateRawGameDslParams): { ok: true } | SchemaValidationFailure {
  const validation = validateAuthorityBundleForRun({
    projectId: params.projectId,
    runId: params.runId,
    bundle: params.authorityBundle,
    brief: params.brief
  });

  return validation.ok
    ? { ok: true }
    : {
        ok: false,
        code: 'MODEL_SCHEMA_VALIDATION_FAILED',
        message: 'Raw Game DSL authority bundle is invalid.',
        issues: validation.issues
      };
}

function buildCapabilityGameDslDraftOutputContract(profileId: string, capabilityIds: readonly string[]): Record<string, unknown> {
  return {
    artifactKind: 'capability_game_dsl_draft',
    schemaVersion: CAPABILITY_GAME_DSL_DRAFT_SCHEMA_VERSION,
    profile: { id: profileId },
    play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 },
    capabilities: [...capabilityIds].sort(),
    progression: {
      estimated_total_sec: { min_sec: 480, max_sec: 720 },
      segments: [
        {
          id: '<model_defined_segment_id>',
          order: '<0-based integer>',
          label: '<short original area label>',
          duration_target_sec: { min_sec: '<number>', max_sec: '<number>' },
          capability_refs: ['<capability id from capability_ids>']
        }
      ]
    },
    scenes: [
      {
        id: '<model_defined_scene_id>',
        segment_refs: ['<declared segment id>'],
        entity_refs: ['<declared entity id>'],
        capability_refs: ['<capability id from capability_ids>'],
        config: {
          direction: 'left_to_right',
          originality: 'no_existing_ip',
          visual_theme: '<original visual theme string>',
          environment_visuals: [
            { segment_id: '<declared segment id>', motif: '<original environment motif>', palette: ['#RRGGBB', '#RRGGBB', '#RRGGBB'] }
          ]
        }
      }
    ],
    entities: [
      {
        id: '<model_defined_entity_id>',
        role: 'player',
        label: '<original entity label>',
        tags: ['<semantic tag>'],
        capability_refs: ['<capability id from capability_ids>'],
        config: {
          health_points: '<number when applicable>',
          retries: '<number when applicable>',
          default_weapon: '<weapon id when applicable>',
          visual: {
            asset_intent_ref: '<original_asset_intent_ref>',
            role: '<visual role>',
            silhouette: '<original silhouette description>',
            palette: { primary: '#RRGGBB', accent: '#RRGGBB', outline: '#RRGGBB' }
          }
        }
      }
    ],
    behaviors: [
      {
        id: '<model_defined_behavior_id>',
        owner_entity_id: '<declared entity id>',
        capability_id: '<capability id from capability_ids>',
        trigger: { event: '<runtime event>' },
        config: { '<capability-specific key>': '<value>' }
      }
    ],
    waves: [
      {
        id: '<model_defined_wave_id>',
        segment_id: '<declared segment id>',
        enemy_entity_id: '<declared enemy entity id>',
        count: '<positive integer>',
        spawn: { '<spawn semantic key>': '<value>' },
        capability_refs: ['<capability id from capability_ids>']
      }
    ],
    pickups: [
      {
        id: '<model_defined_pickup_id>',
        segment_id: '<declared segment id>',
        pickup_entity_id: '<declared pickup entity id>',
        count: '<positive integer>',
        spawn: { '<pickup placement key>': '<value>' },
        capability_refs: ['<capability id from capability_ids>']
      }
    ],
    objectives: [
      {
        id: '<model_defined_objective_id>',
        kind: 'target_score | destroy_target | survive_duration | reach_exit | collect_items | boss_defeated',
        target: { '<target key>': '<declared id or value>' },
        success_condition: { event: '<runtime event>' },
        capability_refs: ['<capability id from capability_ids>']
      }
    ],
    bosses: [
      {
        id: '<model_defined_boss_id>',
        boss_entity_id: '<declared boss entity id>',
        segment_refs: ['<declared segment id>'],
        phases: [
          {
            id: '<phase id>',
            order: '<0-based integer>',
            health_threshold_pct: '<number>',
            pattern: { '<pattern key>': '<value>' },
            capability_refs: ['<capability id from capability_ids>']
          }
        ]
      }
    ],
    capability_configs: [
      {
        id: '<model_defined_config_id>',
        capability_id: '<capability id from capability_ids>',
        applies_to: ['<declared entity id>'],
        config: { '<capability-specific key>': '<value>' }
      },
      {
        id: 'default_straight_single_weapon',
        capability_id: 'weapon.default_straight_single.v1',
        applies_to: ['<declared player entity id>'],
        config: { slot: 'primary', pattern: 'straight', projectile_count: 1, fire_action: 'shoot_projectile' }
      }
    ],
    metadata: {
      title: '<original title>',
      summary: '<short original summary>',
      language: '<BCP-47 language tag>',
      tags: ['original', 'no_existing_ip', 'side_scrolling_run_and_gun']
    }
  };
}

@Injectable()
export class GameDslProviderService {
  constructor(private readonly modelClient: JsonModelClient) {}

  async generateGameBrief(params: GenerateGameBriefParams): Promise<GameDslProviderResult<ProviderGameBrief>> {
    const intentPlan = buildIntentPlan({ idea: params.idea, language: params.language });
    const result = await this.modelClient.generateJson({
      projectId: params.projectId,
      runId: params.runId,
      outputName: 'game-brief.raw.json',
      callPath: 'GameDslProviderService.generateGameBrief>DeepSeekClient.generateJson',
      system: [
        'You generate Game Brief JSON for ai-game-maker P0.',
        'Return one JSON object matching GameBrief v0.2.',
        'P0 supports collector, dodger, shooter, and generic side_scrolling_run_and_gun.',
        'Normalize 魂斗罗, 魂斗罗式, 横版跑枪, 横版射击, run and gun, and contra-like to side_scrolling_run_and_gun without copyrighted names.',
        'Preserve the user play-time intent. Do not shorten it to fit model, generation, preview, or QA budgets.'
      ].join('\n'),
      user: {
        idea: params.idea,
        language: params.language,
        output_json_rule: 'Return one JSON object only. Do not wrap JSON in markdown.',
        schema_name: 'game-brief-v0.2',
        intent_plan: intentPlan,
        required_fields: ['brief_version', 'schema_version', 'title', 'genre', 'camera', 'core_loop', 'difficulty', 'play_time_intent'],
        exact_output_shape: {
          brief_version: 'game-brief-v0.1',
          schema_version: GAME_BRIEF_V02_SCHEMA_VERSION,
          title: '1-80 character game title',
          genre: 'collector | dodger | shooter | side_scrolling_run_and_gun',
          camera: 'top_down | side_view',
          core_loop: ['2-8 short gameplay loop steps, each 1-120 characters'],
          difficulty: 'easy | normal',
          play_time_intent: 'exactly one object from play_time_intent_examples'
        },
        play_time_intent_examples: [
          { mode: 'target', target_sec: 600 },
          { mode: 'range', min_sec: 480, max_sec: 720 },
          { mode: 'endless' },
          { mode: 'unspecified' }
        ],
        forbidden_fields: [
          'target_play_time_sec',
          'player_character',
          'enemies',
          'collectibles',
          'mechanics',
          'visual_style',
          'sound_effects',
          'background_music'
        ],
        aliases: {
          top_down_shooter: ['小猫大战坦克'],
          side_scrolling_run_and_gun: ['魂斗罗', '魂斗罗式', '横版跑枪', '横版射击', 'run and gun', 'contra-like'],
          vertical_shooter: ['飞机大战'],
          side_scrolling_platformer: ['马里奥式', '平台跳跃']
        },
        copyright_safety: 'Do not emit Contra, 魂斗罗, copyrighted character names, copied levels, or copyrighted assets.',
        allowed_genres: ['collector', 'dodger', 'shooter', 'side_scrolling_run_and_gun'],
        allowed_camera: ['top_down', 'side_view'],
        allowed_difficulties: ['easy', 'normal'],
        play_time_intent_rules: [
          'Use mode target for fixed or approximate requested durations.',
          'Use mode range for explicit ranges such as 8 to 12 minutes.',
          'Use mode endless only when the user asks for endless gameplay.',
          'Use mode unspecified when no duration is stated.',
          'For 8 to 12 minutes, output { "mode": "range", "min_sec": 480, "max_sec": 720 }.'
        ]
      },
      temperature: 0.1,
      maxTokens: 1000
    });

    const parsed = this.parseGameBriefResult(this.normalizeGameBriefCandidateWithIntentPlan(result, intentPlan));
    return parsed.ok ? { ...parsed, value: normalizeBriefWithIntentPlan(parsed.value, intentPlan) } : parsed;
  }

  async generateRawGameDsl(params: GenerateRawGameDslParams): Promise<GameDslProviderResult<RawGameDsl>> {
    const authority = validateRawDslAuthorityPrerequisites(params);
    if (!authority.ok) {
      return authority;
    }

    const legacyBrief = toLegacyRawDslBrief(params.brief);
    if (!legacyBrief.ok) {
      return legacyBrief;
    }

    const result = await this.modelClient.generateJson({
      projectId: params.projectId,
      runId: params.runId,
      outputName: 'raw-game-dsl.raw.json',
      callPath: 'GameDslProviderService.generateRawGameDsl>DeepSeekClient.generateJson',
      system: [
        'You generate engine-agnostic Raw Game DSL JSON for ai-game-maker P0.',
        'Return one JSON object matching game-dsl-v0.1.',
        'Do not include runtime engine names, scripts, callbacks, functions or executable expressions.'
      ].join('\n'),
      user: buildRawDslPromptContext({
        ...params,
        brief: legacyBrief.value,
        authorityBundle: params.authorityBundle
      }),
      temperature: 0.1,
      maxTokens: 3500
    });

    const parsed = this.parseSchemaResult(this.normalizeRawDslMetadataDescription(result, params), RawGameDslSchema, 'Raw Game DSL schema validation failed.');

    if (!parsed.ok) {
      return parsed;
    }

    const scoped = this.checkRawDslMatchesVerifiedPromptScope(parsed);
    if (!scoped.ok) {
      return scoped;
    }

    return this.checkRawDslMatchesBrief(this.normalizeRawDslForP0Runtime(scoped), params.brief);
  }

  async generateCapabilityGameDslDraft(params: GenerateCapabilityGameDslDraftParams): Promise<GameDslProviderResult<CapabilityGameDslDraftV1>> {
    const result = await this.modelClient.generateJson({
      projectId: params.projectId,
      runId: params.runId,
      outputName: CAPABILITY_GAME_DSL_DRAFT_RAW_PATH,
      callPath: 'GameDslProviderService.generateCapabilityGameDslDraft>DeepSeekClient.generateJson',
      system: [
        'You generate authoritative CapabilityGameDslDraft v1 JSON for ai-game-maker.',
        'Return one JSON object matching capability-game-dsl-draft.v1.',
        'Preserve the user prompt intent as structured gameplay semantics.',
        'Do not emit trusted evidence, hashes, manifests, build status, QA status, runtime receipts, or artifact references.',
        'Do not use existing protected IP names, characters, art, music, level layouts, logos, or copied lines.'
      ].join('\n'),
      user: {
        idea: params.idea,
        language: params.language,
        brief: params.brief,
        schema_name: CAPABILITY_GAME_DSL_DRAFT_SCHEMA_VERSION,
        output_json_rule: 'Return one JSON object only. Do not wrap JSON in markdown.',
        profile: { id: params.authorityBundle.activeProfileLock.profileId },
        capability_ids: [...params.capabilityIds].sort(),
        output_contract: buildCapabilityGameDslDraftOutputContract(params.authorityBundle.activeProfileLock.profileId, params.capabilityIds),
        strict_schema_rules: [
          'Top-level artifactKind must be "capability_game_dsl_draft".',
          'Top-level schemaVersion must be "capability-game-dsl-draft.v1".',
          'Use profile.id exactly as provided.',
          'Do not use scene-local keys such as segment, camera, spawns, platforms, type, description, or parameters.',
          'Use segment_refs, entity_refs, capability_refs, owner_entity_id, capability_id, trigger, config, duration_target_sec, and estimated_total_sec exactly.',
          'Entity role must be one of player, enemy, projectile, weapon, pickup, boss, terrain, hazard, camera, ui, or system.',
          'Objective kind must be one of target_score, destroy_target, survive_duration, reach_exit, collect_items, or boss_defeated.',
          'For this run-and-gun profile, prefer survive_duration for failure/life-loop evidence, reach_exit for segment/mission progress, and boss_defeated for victory.',
          'Set progression.estimated_total_sec to { min_sec: 480, max_sec: 720 }; the sum of progression.segments[].duration_target_sec must be between 480 and 720 seconds, for example 180 + 210 + 210 = 600.',
          'Do not put the compressed 50-second manual preview duration into play_time_intent, estimated_total_sec, or segment duration_target_sec.',
          'Every capability_refs, capability_id, and capabilities entry must be one of capability_ids.',
          'Every capability_refs array must stay concise and contain no more than 40 entries; scene capability_refs must include only scene-level capabilities, not the full capability_ids list.',
          'capability_configs.applies_to may reference declared entity ids only; for scene-level, camera-level, or system-wide configs, omit applies_to and put target_scene_id or target_segment_id inside config.',
          'Every entity named in capability_configs.applies_to must also declare that capability_id in its entity capability_refs when the role can own the capability.',
          'The player entity capability_refs must include weapon.default_straight_single.v1, weapon.spread_shot.v1, weapon.rapid_fire.v1, weapon.replacement_rule.v1, and weapon.death_reset.v1 when those weapon configs apply to player.',
          'Every waves[] entry must include a locked spawn capability in capability_refs: use spawn.enemy_wave.v1 for moving waves and spawn.static.v1 for fixed turret/static placements.',
          'The waves[] array must include at least one patrol_infantry wave, one fixed_turret wave/static placement, and one flying_enemy wave so the runtime can visibly consume all three enemy archetypes.',
          'Every stable id reference must point to a declared id.',
          'For weapon.default_straight_single.v1, emit exactly one capability_config id default_straight_single_weapon applying to player; its config must include slot: "primary", pattern: "straight", projectile_count: 1, and fire_action: "shoot_projectile"; do not emit a second behavior for that capability.',
          'Do not include trusted evidence, lock hashes, manifests, build results, QA results, runtime receipts, artifact refs, or package versions.'
        ],
        required_identity: {
          artifactKind: 'capability_game_dsl_draft',
          schemaVersion: CAPABILITY_GAME_DSL_DRAFT_SCHEMA_VERSION,
          profile: { id: params.authorityBundle.activeProfileLock.profileId }
        },
        required_semantics: [
          'side_scrolling_run_and_gun genre',
          '8-12 minute play-time intent as { mode: "range", min_sec: 480, max_sec: 720 }',
          'left/right movement, jump, crouch, directional shooting, and airborne shooting',
          'straight single default weapon, spread pickup, rapid-fire pickup, replacement rule, and death reset',
          '3 health points, 2 retries, checkpoint restore, failure screen, restart, mission complete, and win state',
          'three ordered areas: jungle_entrance, metal_bridge, enemy_core',
          'enemy waves, patrol infantry, fixed turret, flying enemy from right, timed explosion hazards, and weapon supply',
          'patrol infantry, fixed turret, flying enemy, and boss must declare movement or counterfire behaviors that the runtime can consume',
          'boss named molten_core_guard with two phases, below-half-health transition, alternating attacks, and spawn stop on defeat',
          'scene config must declare visual_theme and environment_visuals; player, enemies, weapon pickup, projectile, hazard, and boss entities must declare config.visual.asset_intent_ref, role, silhouette, and palette for DSL-driven runtime art',
          'HUD fields for health, retries, current weapon, and boss health',
          'explicit spawn, collision, state transition, checkpoint, win, loss, and UI transition declarations',
          'originality metadata; no existing IP names, assets, logos, music, copied level layouts, or copied lines'
        ],
        required_sections: [
          'play_time_intent',
          'capabilities',
          'progression.segments',
          'scenes',
          'entities',
          'behaviors',
          'waves',
          'pickups',
          'objectives',
          'bosses',
          'capability_configs',
          'metadata'
        ],
        compact_generation_rules: [
          'Keep the JSON concise enough to complete in one response; prefer semantic counts and cadence over explicit coordinate arrays.',
          'Emit exactly 3 progression segments, 1 scene, 8-14 entities, 6-14 behaviors, 3-5 waves, 2 pickups, 2-3 objectives, 1 boss, and 4-8 capability_configs.',
          'For waves and pickups, use count and semantic spawn descriptors instead of listing every spawn position.',
          'For config objects, include only runtime-consumable keys needed by the declared capability.',
          'Do not duplicate projectile entities when one generic player projectile and one enemy projectile can carry the semantics.'
        ],
        forbidden_authority_fields: [
          'runtimeManifestHash',
          'capabilityLockHash',
          'trustedArtifacts',
          'artifactRefs',
          'buildPassed',
          'qaPassed',
          'runtimeEvidence',
          'moduleLoadReceipt'
        ],
        stable_id_rules: [
          'Use lowercase stable ids with letters, numbers, dots, underscores, or hyphens.',
          'Do not use raw array index references.',
          'Every reference must point to a declared stable id.'
        ]
      },
      temperature: 0.1,
      maxTokens: 12000
    });

    return this.parseSchemaResult(
      normalizeCapabilityDraftForSchemaIngress(result),
      CapabilityGameDslDraftV1Schema,
      'CapabilityGameDslDraft v1 schema validation failed.'
    );
  }

  private parseGameBriefResult(result: GenerateJsonResult): GameDslProviderResult<GameBriefV02> {
    if (!result.ok) {
      return result;
    }

    try {
      const parsed = parseAndNormalizeGameBrief(result.json);
      return {
        ok: true,
        value: parsed.canonical,
        rawText: result.rawText,
        rawOutputPath: result.rawOutputPath,
        sourceFormat: parsed.sourceFormat
      };
    } catch (error) {
      return {
        ok: false,
        code: 'MODEL_SCHEMA_VALIDATION_FAILED',
        message: 'Game Brief schema validation failed.',
        rawText: result.rawText,
        rawOutputPath: result.rawOutputPath,
        issues:
          error instanceof GameBriefIngressValidationError
            ? [
                ...formatIngressIssues('v0.2', error.details.v02Issues),
                ...formatIngressIssues('legacy-open-duration', error.details.legacyIssues)
              ]
            : [
                error instanceof Error ? error.message : 'Game Brief ingress validation failed.'
              ]
      };
    }
  }

  private parseSchemaResult<T>(
    result: GenerateJsonResult,
    schema: ZodType<T>,
    message: string
  ): GameDslProviderResult<T> {
    if (!result.ok) {
      return result;
    }

    const parsed = schema.safeParse(result.json);

    if (!parsed.success) {
      return {
        ok: false,
        code: 'MODEL_SCHEMA_VALIDATION_FAILED',
        message,
        rawText: result.rawText,
        rawOutputPath: result.rawOutputPath,
        issues: parsed.error.issues.map((issue) => `${issue.path.map(String).join('.') || '<root>'}: ${issue.message}`)
      };
    }

    return {
      ok: true,
      value: parsed.data,
      rawText: result.rawText,
      rawOutputPath: result.rawOutputPath
    };
  }

  private normalizeGameBriefCandidateWithIntentPlan(result: GenerateJsonResult, intentPlan: ReturnType<typeof buildIntentPlan>): GenerateJsonResult {
    if (!result.ok || intentPlan.normalizedGenre !== 'dodger_collector' || !isJsonObject(result.json) || result.json.genre !== 'dodger_collector') {
      return result;
    }

    return {
      ...result,
      json: {
        ...result.json,
        genre: 'collector'
      }
    };
  }

  private normalizeRawDslMetadataDescription(result: GenerateJsonResult, params: GenerateRawGameDslParams): GenerateJsonResult {
    if (!result.ok || params.brief.genre !== 'side_scrolling_run_and_gun' || !isJsonObject(result.json) || !isJsonObject(result.json.metadata)) {
      return result;
    }
    const description = result.json.metadata.description;
    if (typeof description !== 'string') {
      return result;
    }

    return {
      ...result,
      json: {
        ...result.json,
        metadata: {
          ...result.json.metadata,
          description: normalizeRunAndGunDescription(description, params.language)
        }
      }
    };
  }

  private checkRawDslMatchesBrief(
    result: GameDslProviderSuccess<RawGameDsl>,
    brief: ProviderGameBrief
  ): GameDslProviderResult<RawGameDsl> {
    const targetPlayTimeSec = readLegacyTargetPlayTimeSec(brief);
    const issues = [
      this.matchIssue('game.genre', result.value.game.genre, brief.genre),
      this.matchIssue('game.camera', result.value.game.camera, brief.camera),
      this.matchIssue('game.difficulty', result.value.game.difficulty, brief.difficulty),
      targetPlayTimeSec === null ? null : this.matchIssue('game.target_play_time_sec', result.value.game.target_play_time_sec, targetPlayTimeSec)
    ].filter((issue): issue is string => issue !== null);

    if (issues.length === 0) {
      return result;
    }

    return {
      ok: false,
      code: 'MODEL_SCHEMA_VALIDATION_FAILED',
      message: 'Raw Game DSL does not match Game Brief.',
      rawText: result.rawText,
      rawOutputPath: result.rawOutputPath,
      issues
    };
  }

  private matchIssue(path: string, actual: string | number, expected: string | number): string | null {
    return actual === expected ? null : `${path}: expected ${expected}, received ${actual}`;
  }

  private checkRawDslMatchesVerifiedPromptScope(result: GameDslProviderSuccess<RawGameDsl>): GameDslProviderResult<RawGameDsl> {
    const seenSpawnKinds = new Set<RawGameDsl['entities'][number]['kind']>();
    const entityKindCounts = countEntityKinds(result.value.entities);
    const shooterScopeIssues =
      result.value.game.genre === 'shooter'
        ? [
            ...(entityKindCounts.enemy === 1 ? [] : ['entities: shooter model generation requires exactly one primary enemy in the verified runtime scope']),
            ...(entityKindCounts.projectile === 1 ? [] : ['entities: shooter model generation requires exactly one primary projectile in the verified runtime scope'])
          ]
        : [];
    const issues = [
      ...shooterScopeIssues,
      ...result.value.entities.flatMap((entity, index) => {
        if (entity.spawn === undefined) {
          return [];
        }

        const prefix = `entities.${index}.spawn`;
        const duplicateIssue = seenSpawnKinds.has(entity.kind) ? [`${prefix}: duplicate ${entity.kind} spawn rules are not supported by the verified runtime scope`] : [];
        seenSpawnKinds.add(entity.kind);

        const primaryEntityIssue =
          (entity.kind === 'hazard' || entity.kind === 'collectible') && entityKindCounts[entity.kind] !== 1
            ? [`${prefix}: dodger ${entity.kind} spawn requires exactly one ${entity.kind} entity in the verified runtime scope`]
            : [];

        return [...duplicateIssue, ...primaryEntityIssue, ...this.checkDodgerSpawnScope(result.value, entity, index)];
      })
    ];

    if (issues.length === 0) {
      return result;
    }

    return {
      ok: false,
      code: 'MODEL_SCHEMA_VALIDATION_FAILED',
      message: 'Raw Game DSL uses unsupported spawn generation scope.',
      rawText: result.rawText,
      rawOutputPath: result.rawOutputPath,
      issues
    };
  }

  private checkDodgerSpawnScope(
    raw: RawGameDsl,
    entity: RawGameDsl['entities'][number],
    index: number
  ): string[] {
    const prefix = `entities.${index}.spawn`;
    if (raw.game.genre !== 'dodger') {
      return [`${prefix}: entity.spawn is currently exposed only for dodger model generation`];
    }

    if (entity.kind === 'hazard' && entity.spawn?.strategy === 'right_edge_wave') {
      return this.checkDodgerHazardSpawnScope(entity, index);
    }

    if (entity.kind === 'collectible' && entity.spawn?.strategy === 'fixed_positions') {
      return this.checkDodgerCollectibleSpawnScope(raw, entity, index);
    }

    return [`${prefix}: only dodger hazard right_edge_wave and dodger collectible fixed_positions are currently exposed to model generation`];
  }

  private checkDodgerHazardSpawnScope(entity: RawGameDsl['entities'][number], index: number): string[] {
    const prefix = `entities.${index}.spawn`;
    const issues: string[] = [];
    if ((entity.count ?? 1) < 5 || (entity.count ?? 1) > 12) {
      issues.push(`entities.${index}.count: dodger hazard spawn count must be between 5 and 12 for the verified prompt scope`);
    }

    const maxActive = entity.spawn?.max_active ?? 2;
    if (maxActive < 2 || maxActive > 4) {
      issues.push(`${prefix}.max_active: must be between 2 and 4 for the verified prompt scope`);
    }

    const intervalMs = entity.spawn?.interval_ms ?? 1000;
    if (intervalMs < 600 || intervalMs > 1200) {
      issues.push(`${prefix}.interval_ms: must be between 600 and 1200 for the verified prompt scope`);
    }

    if ((entity.spawn?.lane_count ?? 3) < 3 || (entity.spawn?.lane_count ?? 3) > 4) {
      issues.push(`${prefix}.lane_count: must be between 3 and 4 for the verified prompt scope`);
    }

    return issues;
  }

  private checkDodgerCollectibleSpawnScope(raw: RawGameDsl, entity: RawGameDsl['entities'][number], index: number): string[] {
    const prefix = `entities.${index}.spawn`;
    const issues: string[] = [];
    if ((entity.count ?? 1) < 3 || (entity.count ?? 1) > 10) {
      issues.push(`entities.${index}.count: dodger collectible spawn count must be between 3 and 10 for the verified prompt scope`);
    }

    const maxActive = entity.spawn?.max_active ?? 3;
    if (maxActive < 1 || maxActive > 3) {
      issues.push(`${prefix}.max_active: must be between 1 and 3 for the verified prompt scope`);
    }

    const intervalMs = entity.spawn?.interval_ms ?? 1200;
    if (intervalMs < 700 || intervalMs > 1600) {
      issues.push(`${prefix}.interval_ms: must be between 700 and 1600 for the verified prompt scope`);
    }

    if (entity.spawn?.lane_count !== undefined) {
      issues.push(`${prefix}.lane_count: must be omitted for dodger collectible fixed_positions`);
    }

    if (collectibleScoreAddValue(raw, entity.id) <= 0) {
      issues.push(`${prefix}: dodger collectible fixed_positions requires a player overlap collision with score_add greater than 0`);
    }

    return issues;
  }

  /** Keeps valid model DSL inside the current P0 runtime envelope without weakening core validation. */
  private normalizeRawDslForP0Runtime(result: GameDslProviderSuccess<RawGameDsl>): GameDslProviderSuccess<RawGameDsl> {
    if (result.value.game.genre !== 'shooter') {
      return result;
    }

    const enemy = result.value.entities.find((entity) => entity.kind === 'enemy');
    const enemyCount = enemy?.count ?? 0;

    if (enemy === undefined) {
      return result;
    }

    if (result.value.objectives.win.type === 'survive_duration') {
      return normalizeShooterWinToEnemyCleared(result, enemyCount);
    }

    if (result.value.objectives.win.type !== 'target_score' || maxReachablePrimaryShooterScore(result.value, enemy.id) >= (result.value.objectives.win.target ?? 1)) {
      return result;
    }

    return normalizeShooterWinToEnemyCleared(result, enemyCount);
  }
}

function normalizeShooterWinToEnemyCleared(result: GameDslProviderSuccess<RawGameDsl>, enemyCount: number): GameDslProviderSuccess<RawGameDsl> {
  return {
    ...result,
    value: {
      ...result.value,
      objectives: {
        ...result.value.objectives,
        win: { type: 'enemy_cleared', target: enemyCount }
      }
    }
  };
}

function formatIngressIssues(source: string, issues: readonly ZodIssue[]): string[] {
  return issues.map((issue) => `${source}.${issue.path.map(String).join('.') || '<root>'}: ${issue.message}`);
}

function toLegacyRawDslBrief(brief: ProviderGameBrief): GameDslProviderResult<GameBrief> {
  const representability = classifyLegacyRawGameDslRepresentability(brief);
  if (!representability.representable) {
    return {
      ok: false,
      code: LEGACY_DSL_NONREPRESENTABLE,
      message: 'Raw Game DSL v0.1 cannot preserve the requested play-time intent.',
      issues: [
        `legacy_representability: ${representability.reason}`,
        ...representability.issues
      ]
    };
  }

  return {
    ok: true,
    value: representability.projectedBrief,
    rawText: '',
    rawOutputPath: ''
  };
}

function readLegacyTargetPlayTimeSec(brief: ProviderGameBrief): number | null {
  return isGameBriefV02(brief) ? toLegacyTargetPlayTimeSec(brief.play_time_intent) : brief.target_play_time_sec;
}

function isGameBriefV02(brief: ProviderGameBrief): brief is GameBriefV02 {
  return 'play_time_intent' in brief;
}

function countEntityKinds(entities: RawGameDsl['entities']): Record<RawGameDsl['entities'][number]['kind'], number> {
  return entities.reduce(
    (counts, entity) => ({
      ...counts,
      [entity.kind]: counts[entity.kind] + 1
    }),
    { enemy: 0, projectile: 0, collectible: 0, hazard: 0 }
  );
}

function collectibleScoreAddValue(raw: RawGameDsl, collectibleId: string): number {
  const collision = raw.rules.collisions.find((rule) => {
    if (rule.type !== 'overlap') {
      return false;
    }

    return (
      (rule.source === raw.player.id && rule.target === collectibleId) ||
      (rule.source === collectibleId && rule.target === raw.player.id)
    );
  });

  return collision?.effects.find((effect) => effect.type === 'score_add')?.value ?? 0;
}

function maxReachablePrimaryShooterScore(raw: RawGameDsl, enemyId: string): number {
  const enemy = raw.entities.find((entity) => entity.id === enemyId && entity.kind === 'enemy');
  if (enemy === undefined) {
    return 0;
  }

  const score = raw.rules.collisions
    .filter((collision) => collision.type === 'projectile_hit' && collision.target === enemyId)
    .reduce((best, collision) => Math.max(best, collision.effects.find((effect) => effect.type === 'score_add')?.value ?? 0), 0);

  return (enemy.count ?? 1) * score;
}
