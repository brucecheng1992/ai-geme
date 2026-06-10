import { Injectable } from '@nestjs/common';
import type { ZodType } from 'zod';

import { GameBriefSchema, RawGameDslSchema, type GameBrief, type RawGameDsl } from '../../../../packages/game-dsl/src/index.js';
import { DeepSeekClient } from './deepseek.client.js';
import type { GenerateJsonFailure, GenerateJsonResult } from './model-provider.types.js';
import { buildRawDslPromptContext } from './prompt-context.builder.js';

type Language = 'zh' | 'en';

type GenerateGameBriefParams = {
  projectId: string;
  runId: string;
  idea: string;
  language: Language;
};

type GenerateRawGameDslParams = GenerateGameBriefParams & {
  brief: GameBrief;
};

type SchemaValidationFailure = {
  ok: false;
  code: 'MODEL_SCHEMA_VALIDATION_FAILED';
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

@Injectable()
export class GameDslProviderService {
  constructor(private readonly modelClient: JsonModelClient) {}

  async generateGameBrief(params: GenerateGameBriefParams): Promise<GameDslProviderResult<GameBrief>> {
    const result = await this.modelClient.generateJson({
      projectId: params.projectId,
      runId: params.runId,
      outputName: 'game-brief.raw.json',
      system: [
        'You generate Game Brief JSON for ai-game-maker P0.',
        'Return one JSON object matching game-brief-v0.1.',
        'P0 only supports collector, dodger and shooter with top_down camera.'
      ].join('\n'),
      user: {
        idea: params.idea,
        language: params.language,
        output_json_rule: 'Return one JSON object only. Do not wrap JSON in markdown.',
        schema_name: 'game-brief-v0.1',
        required_fields: ['brief_version', 'title', 'genre', 'camera', 'core_loop', 'difficulty', 'target_play_time_sec'],
        exact_output_shape: {
          brief_version: 'game-brief-v0.1',
          title: '1-80 character game title',
          genre: 'collector | dodger | shooter',
          camera: 'top_down',
          core_loop: ['2-8 short gameplay loop steps, each 1-120 characters'],
          difficulty: 'easy | normal',
          target_play_time_sec: 'integer from 30 to 120'
        },
        forbidden_fields: ['player_character', 'enemies', 'collectibles', 'mechanics', 'visual_style', 'sound_effects', 'background_music'],
        allowed_genres: ['collector', 'dodger', 'shooter'],
        allowed_camera: 'top_down',
        allowed_difficulties: ['easy', 'normal'],
        target_play_time_sec_range: [30, 120]
      },
      temperature: 0.1,
      maxTokens: 1000
    });

    return this.parseSchemaResult(result, GameBriefSchema, 'Game Brief schema validation failed.');
  }

  async generateRawGameDsl(params: GenerateRawGameDslParams): Promise<GameDslProviderResult<RawGameDsl>> {
    const result = await this.modelClient.generateJson({
      projectId: params.projectId,
      runId: params.runId,
      outputName: 'raw-game-dsl.raw.json',
      system: [
        'You generate engine-agnostic Raw Game DSL JSON for ai-game-maker P0.',
        'Return one JSON object matching game-dsl-v0.1.',
        'Do not include runtime engine names, scripts, callbacks, functions or executable expressions.'
      ].join('\n'),
      user: buildRawDslPromptContext(params),
      temperature: 0.1,
      maxTokens: 3500
    });

    const parsed = this.parseSchemaResult(result, RawGameDslSchema, 'Raw Game DSL schema validation failed.');

    if (!parsed.ok) {
      return parsed;
    }

    const scoped = this.checkRawDslMatchesVerifiedPromptScope(parsed);
    if (!scoped.ok) {
      return scoped;
    }

    return this.checkRawDslMatchesBrief(this.normalizeRawDslForP0Runtime(scoped), params.brief);
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

  private checkRawDslMatchesBrief(
    result: GameDslProviderSuccess<RawGameDsl>,
    brief: GameBrief
  ): GameDslProviderResult<RawGameDsl> {
    const issues = [
      this.matchIssue('game.genre', result.value.game.genre, brief.genre),
      this.matchIssue('game.camera', result.value.game.camera, brief.camera),
      this.matchIssue('game.difficulty', result.value.game.difficulty, brief.difficulty),
      this.matchIssue('game.target_play_time_sec', result.value.game.target_play_time_sec, brief.target_play_time_sec)
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
    if (result.value.game.genre !== 'shooter' || result.value.objectives.win.type !== 'target_score') {
      return result;
    }

    const enemy = result.value.entities.find((entity) => entity.kind === 'enemy');
    const enemyCount = enemy?.count ?? 0;

    if (enemy === undefined || maxReachablePrimaryShooterScore(result.value, enemy.id) >= (result.value.objectives.win.target ?? 1)) {
      return result;
    }

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
