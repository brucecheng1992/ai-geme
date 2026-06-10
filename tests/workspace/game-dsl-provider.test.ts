import { describe, expect, it } from 'vitest';

import { GameDslProviderService } from '../../apps/maker-api/src/model-provider/game-dsl-provider.service.js';
import { buildRawDslPromptContext } from '../../apps/maker-api/src/model-provider/prompt-context.builder.js';
import type { GenerateJsonResult, JsonChatParams } from '../../apps/maker-api/src/model-provider/model-provider.types.js';
import type { GameBrief } from '../../packages/game-dsl/src/index.js';
import { createCollectorRawDsl, createShooterRawDsl } from '../contracts/fixtures.js';

const brief: GameBrief = {
  brief_version: 'game-brief-v0.1',
  title: 'Gem Run',
  genre: 'collector',
  camera: 'top_down',
  core_loop: ['Move around the arena.', 'Collect enough gems to win.'],
  difficulty: 'easy',
  target_play_time_sec: 60
};

const shooterBrief: GameBrief = {
  ...brief,
  title: 'Alien Clear',
  genre: 'shooter',
  core_loop: ['Move around the arena.', 'Fire projectiles at enemies.', 'Clear enemies to win.']
};

const requestBase = {
  projectId: 'proj_20260609_153000_abcd',
  runId: 'run_20260609_153000_abcd',
  idea: 'make a gem collector',
  language: 'en' as const
};

function createModelClient(result: GenerateJsonResult, calls: JsonChatParams[] = []) {
  return {
    async generateJson(params: JsonChatParams) {
      calls.push(params);
      return result;
    }
  };
}

function success(json: unknown): GenerateJsonResult {
  return {
    ok: true,
    json,
    rawText: JSON.stringify(json),
    rawOutputPath: '/tmp/model-output.json'
  };
}

describe('buildRawDslPromptContext', () => {
  it('includes selected contract, schema enums, forbidden lists and anti-shell rules', () => {
    const context = buildRawDslPromptContext({ idea: requestBase.idea, language: requestBase.language, brief });

    expect(context).toMatchObject({
      idea: requestBase.idea,
      language: 'en',
      brief,
      output_json_rule: expect.stringContaining('JSON object')
    });
    expect(context.selected_contract).toMatchObject({ genre: 'collector', contract_version: 'mechanic-contract-v0.1' });
    expect(context.allowed_enums.genres).toEqual(['collector', 'dodger', 'shooter']);
    expect(context.allowed_enums.action_types).toContain('shoot_projectile');
    expect(context.forbidden_terms).toContain('phaser');
    expect(context.forbidden_fields).toContain('onUpdate');
    expect(context.invalid_examples_summary.join(' ')).toContain('unsupported mechanics');
    expect(context.anti_shell_rules.join('\n')).toContain('Do not simulate one genre by renaming another genre.');
    expect(context.anti_shell_rules.join('\n')).toContain('If genre is shooter');
  });

  it('selects the matching genre contract for shooter prompts', () => {
    const context = buildRawDslPromptContext({ idea: 'cat shooter', language: requestBase.language, brief: shooterBrief });

    expect(context.selected_contract).toMatchObject({
      genre: 'shooter',
      required_mechanics: expect.arrayContaining(['player.can_fire', 'collision.projectile_hits_enemy'])
    });
    expect(context.valid_example).toMatchObject({
      game: { genre: 'shooter' },
      player: { actions: [expect.objectContaining({ type: 'shoot_projectile', spawns: expect.any(String) })] }
    });
    expect((context.valid_example as { entities: Array<{ kind: string }> }).entities.filter((entity) => entity.kind === 'enemy')).toHaveLength(1);
    expect((context.valid_example as { entities: Array<{ kind: string }> }).entities.some((entity) => entity.kind === 'collectible')).toBe(false);
    expect(context.forbidden_fields).toEqual(expect.arrayContaining(['projectile_id', 'cooldown_sec', 'duration_sec']));
    expect(context.invalid_examples_summary.join('\n')).toContain('Collision effects only support type and optional value.');
    expect(context.invalid_examples_summary.join('\n')).toContain('required fire-hit-clear loop');
    expect(context.invalid_examples_summary.join('\n')).toContain('target must be less than or equal to the sum');
    expect(context.composable_mechanics.join('\n')).toContain('Select genre from the base loop');
  });
});

describe('GameDslProviderService', () => {
  it('generates a schema-validated Game Brief from model JSON', async () => {
    const calls: JsonChatParams[] = [];
    const service = new GameDslProviderService(createModelClient(success(brief), calls));

    await expect(service.generateGameBrief(requestBase)).resolves.toMatchObject({
      ok: true,
      value: brief,
      rawOutputPath: '/tmp/model-output.json'
    });
    expect(calls[0]?.user).toMatchObject({
      required_fields: ['brief_version', 'title', 'genre', 'camera', 'core_loop', 'difficulty', 'target_play_time_sec'],
      exact_output_shape: {
        brief_version: 'game-brief-v0.1',
        camera: 'top_down'
      },
      forbidden_fields: expect.arrayContaining(['player_character', 'mechanics', 'background_music'])
    });
  });

  it('rejects invalid Game Brief JSON at the provider boundary', async () => {
    const service = new GameDslProviderService(createModelClient(success({ ...brief, genre: 'platformer' })));

    const result = await service.generateGameBrief(requestBase);

    expect(result).toMatchObject({
      ok: false,
      code: 'MODEL_SCHEMA_VALIDATION_FAILED',
      message: 'Game Brief schema validation failed.',
      rawOutputPath: '/tmp/model-output.json'
    });
    expect(result.ok).toBe(false);
    if (!result.ok && 'issues' in result) {
      expect(result.issues.join('\n')).toContain('genre');
    }
  });

  it('passes model provider failures through without schema parsing', async () => {
    const service = new GameDslProviderService(
      createModelClient({
        ok: false,
        code: 'MODEL_TIMEOUT',
        message: 'Model provider request timed out.'
      })
    );

    await expect(service.generateGameBrief(requestBase)).resolves.toEqual({
      ok: false,
      code: 'MODEL_TIMEOUT',
      message: 'Model provider request timed out.'
    });
  });

  it('generates schema-validated Raw Game DSL with the prompt context', async () => {
    const calls: JsonChatParams[] = [];
    const rawDsl = createCollectorRawDsl();
    const service = new GameDslProviderService(createModelClient(success(rawDsl), calls));

    await expect(service.generateRawGameDsl({ ...requestBase, brief })).resolves.toMatchObject({
      ok: true,
      value: rawDsl,
      rawOutputPath: '/tmp/model-output.json'
    });
    expect(calls[0]?.outputName).toBe('raw-game-dsl.raw.json');
    expect(calls[0]?.user).toMatchObject({
      idea: requestBase.idea,
      brief,
      selected_contract: { genre: 'collector' }
    });
  });

  it('normalizes unreachable shooter target_score to enemy_cleared for the P0 runtime', async () => {
    const rawDsl = {
      ...createShooterRawDsl(),
      game: { ...createShooterRawDsl().game, difficulty: shooterBrief.difficulty, target_play_time_sec: shooterBrief.target_play_time_sec },
      objectives: { win: { type: 'target_score' as const, target: 10 }, lose: { type: 'player_health_zero' as const } }
    };
    const service = new GameDslProviderService(createModelClient(success(rawDsl)));

    await expect(service.generateRawGameDsl({ ...requestBase, brief: shooterBrief })).resolves.toMatchObject({
      ok: true,
      value: {
        objectives: { win: { type: 'enemy_cleared', target: 6 } }
      }
    });
  });

  it('rejects Raw Game DSL that violates schema or forbidden engine terms', async () => {
    const rawDsl = createCollectorRawDsl();
    const service = new GameDslProviderService(
      createModelClient(success({ ...rawDsl, world: { ...rawDsl.world, visual_theme: 'phaser arcade garden' } }))
    );

    const result = await service.generateRawGameDsl({ ...requestBase, brief });

    expect(result).toMatchObject({
      ok: false,
      code: 'MODEL_SCHEMA_VALIDATION_FAILED',
      message: 'Raw Game DSL schema validation failed.'
    });
    expect(result.ok).toBe(false);
    if (!result.ok && 'issues' in result) {
      expect(result.issues.join('\n')).toContain('forbidden term');
    }
  });

  it('rejects valid Raw Game DSL when it does not match the Game Brief contract', async () => {
    const rawDsl = createCollectorRawDsl();
    const service = new GameDslProviderService(createModelClient(success(rawDsl)));

    const result = await service.generateRawGameDsl({ ...requestBase, brief: shooterBrief });

    expect(result).toMatchObject({
      ok: false,
      code: 'MODEL_SCHEMA_VALIDATION_FAILED',
      message: 'Raw Game DSL does not match Game Brief.'
    });
    expect(result.ok).toBe(false);
    if (!result.ok && 'issues' in result) {
      expect(result.issues).toContain('game.genre: expected shooter, received collector');
    }
  });
});
