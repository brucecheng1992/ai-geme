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

    const parsed = this.parseSchemaResult(this.stripUnsupportedRawDslFields(result), RawGameDslSchema, 'Raw Game DSL schema validation failed.');

    if (!parsed.ok) {
      return parsed;
    }

    return this.checkRawDslMatchesBrief(this.normalizeRawDslForP0Runtime(parsed), params.brief);
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

  private stripUnsupportedRawDslFields(result: GenerateJsonResult): GenerateJsonResult {
    if (!result.ok || !isRecord(result.json) || !isRecord(result.json.rules) || !('spawns' in result.json.rules)) {
      return result;
    }

    const { spawns: _spawns, ...rules } = result.json.rules;

    return {
      ...result,
      json: {
        ...result.json,
        rules
      }
    };
  }

  /** Keeps valid model DSL inside the current P0 runtime envelope without weakening core validation. */
  private normalizeRawDslForP0Runtime(result: GameDslProviderSuccess<RawGameDsl>): GameDslProviderSuccess<RawGameDsl> {
    if (result.value.game.genre !== 'shooter' || result.value.objectives.win.type !== 'target_score') {
      return result;
    }

    const enemyCount = totalEntityCount(result.value, 'enemy');

    if (enemyCount === 0 || maxReachableScore(result.value, 'enemy') >= (result.value.objectives.win.target ?? 1)) {
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

function totalEntityCount(raw: RawGameDsl, kind: RawGameDsl['entities'][number]['kind']): number {
  return raw.entities.filter((entity) => entity.kind === kind).reduce((sum, entity) => sum + (entity.count ?? 1), 0);
}

function maxReachableScore(raw: RawGameDsl, kind: RawGameDsl['entities'][number]['kind']): number {
  return raw.entities
    .filter((entity) => entity.kind === kind)
    .reduce((sum, entity) => {
      const score = raw.rules.collisions
        .filter((collision) => collision.source === entity.id || collision.target === entity.id)
        .reduce((best, collision) => Math.max(best, collision.effects.find((effect) => effect.type === 'score_add')?.value ?? 0), 0);

      return sum + (entity.count ?? 1) * score;
    }, 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
