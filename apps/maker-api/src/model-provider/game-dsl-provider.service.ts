import { Injectable } from '@nestjs/common';
import type { ZodIssue, ZodType } from 'zod';

import {
  GAME_BRIEF_V02_SCHEMA_VERSION,
  GameBriefIngressValidationError,
  LEGACY_DSL_NONREPRESENTABLE,
  RawGameDslSchema,
  classifyLegacyRawGameDslRepresentability,
  parseAndNormalizeGameBrief,
  toLegacyTargetPlayTimeSec,
  type GameBrief,
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
};

export type GameDslProviderResult<T> = GameDslProviderSuccess<T> | GameDslProviderFailure;

type JsonModelClient = Pick<DeepSeekClient, 'generateJson'>;
export type ProviderGameBrief = GameBrief | GameBriefV02;
const runAndGunSourceReferencePattern = /魂斗罗式?|contra-like|contra/gi;

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeRunAndGunDescription(description: string, language: Language): string {
  const replacement = language === 'zh' ? '原创横版跑枪' : 'generic side-scrolling run-and-gun';
  return description.replace(runAndGunSourceReferencePattern, replacement);
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
    const legacyBrief = toLegacyRawDslBrief(params.brief);
    if (!legacyBrief.ok) {
      return legacyBrief;
    }

    const result = await this.modelClient.generateJson({
      projectId: params.projectId,
      runId: params.runId,
      outputName: 'raw-game-dsl.raw.json',
      system: [
        'You generate engine-agnostic Raw Game DSL JSON for ai-game-maker P0.',
        'Return one JSON object matching game-dsl-v0.1.',
        'Do not include runtime engine names, scripts, callbacks, functions or executable expressions.'
      ].join('\n'),
      user: buildRawDslPromptContext({ ...params, brief: legacyBrief.value }),
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
        rawOutputPath: result.rawOutputPath
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
