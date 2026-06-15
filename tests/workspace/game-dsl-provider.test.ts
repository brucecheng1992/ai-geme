import { describe, expect, it } from 'vitest';

import { GameDslProviderService } from '../../apps/maker-api/src/model-provider/game-dsl-provider.service.js';
import { buildIntentPlan } from '../../apps/maker-api/src/model-provider/intent-plan.js';
import { buildRawDslPromptContext } from '../../apps/maker-api/src/model-provider/prompt-context.builder.js';
import type { GenerateJsonResult, JsonChatParams } from '../../apps/maker-api/src/model-provider/model-provider.types.js';
import {
  buildGameDslArtifact,
  checkPhaserRuntimeCapabilities,
  RawGameDslSchema,
  validateAndNormalizeRawGameDsl,
  validateGameDslArtifact,
  type GameBrief,
  type GameDslArtifact
} from '../../packages/game-dsl/src/index.js';
import { createCollectorRawDsl, createDodgerRawDsl, createShooterRawDsl, createSideScrollingRunAndGunRawDsl } from '../contracts/fixtures.js';

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

const dodgerBrief: GameBrief = {
  ...brief,
  title: 'Road Dodge',
  genre: 'dodger',
  core_loop: ['Move across lanes.', 'Avoid falling barriers.', 'Survive the timer.'],
  difficulty: 'normal'
};

const sideScrollingBrief: GameBrief = {
  ...brief,
  title: 'Contra Like Mission',
  genre: 'shooter',
  camera: 'top_down',
  core_loop: ['Move and shoot.', 'Clear enemies.'],
  difficulty: 'normal'
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

function omitSpawn<T extends { spawn?: unknown }>(entity: T): Omit<T, 'spawn'> {
  const { spawn: _spawn, ...rest } = entity;
  return rest;
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
    expect(context.allowed_enums.genres).toEqual(['collector', 'dodger', 'shooter', 'side_scrolling_run_and_gun']);
    expect(context.allowed_enums.action_types).toContain('shoot_projectile');
    expect(context.forbidden_terms).toContain('phaser');
    expect(context.forbidden_fields).toContain('onUpdate');
    expect(context.forbidden_fields).toEqual(
      expect.arrayContaining([
        'runtime_plan',
        'template_params',
        'enemy_waves',
        'waveSource',
        'difficulty_curve',
        'speed_multiplier',
        'spawn_interval_multiplier',
        'ramp_duration_ms'
      ])
    );
    expect(context.invalid_examples_summary.join(' ')).toContain('unsupported mechanics');
    expect(context.anti_shell_rules.join('\n')).toContain('Do not simulate one genre by renaming another genre.');
    expect(context.anti_shell_rules.join('\n')).toContain('If genre is shooter');
    expect(context.spawn_generation_guidance).toEqual(expect.arrayContaining(['Do not output entity.spawn for this genre.']));
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
    expect(context.invalid_examples_summary.join('\n')).toContain('Do not use survive_duration for shooter.');
    expect(context.invalid_examples_summary.join('\n')).toContain('primary enemy projectile_hit score_add value multiplied by the primary enemy count');
    expect(context.composable_mechanics.join('\n')).toContain('Select genre from the base loop');
    expect(context.spawn_generation_guidance).toEqual(expect.arrayContaining(['Do not output entity.spawn for this genre.']));
    expect(context.enemy_wave_runtime_guidance.join('\n')).toContain('runtime derives the enemy wave pressure');
    expect(context.enemy_wave_runtime_guidance.join('\n')).toContain('Do not output runtime_plan, enemy_waves');
  });

  it('selects a dodger-shaped valid example for dodger prompts', () => {
    const context = buildRawDslPromptContext({ idea: 'make a road dodger', language: requestBase.language, brief: dodgerBrief });

    expect(context.selected_contract).toMatchObject({
      genre: 'dodger',
      required_mechanics: expect.arrayContaining(['hazard.exists', 'win.survive_duration'])
    });
    expect(context.valid_example).toMatchObject({
      game: { genre: 'dodger' },
      objectives: { win: { type: 'survive_duration' }, lose: { type: 'player_health_zero' } },
      entities: [
        expect.objectContaining({ kind: 'collectible', spawn: { strategy: 'fixed_positions', max_active: 2, interval_ms: 1000 } }),
        expect.objectContaining({ kind: 'hazard', spawn: { strategy: 'right_edge_wave', max_active: 3, interval_ms: 800, lane_count: 3 } })
      ]
    });
    expect((context.valid_example as { entities: Array<{ kind: string }> }).entities.some((entity) => entity.kind === 'hazard')).toBe(true);
    expect((context.valid_example as { entities: Array<{ kind: string }> }).entities.some((entity) => entity.kind === 'collectible')).toBe(true);
    expect(context.invalid_examples_summary.join('\n')).toContain('Only dodger hazard right_edge_wave and dodger collectible fixed_positions may use spawn');
    expect(context.p0_scope.join('\n')).toContain(
      'Runtime plan spawn execution is currently verified for dodger hazard right_edge_wave, dodger collectible fixed_positions, and shooter enemy right_edge_wave.'
    );
    expect(context.spawn_generation_guidance.join('\n')).toContain('For dodger hazards, the only executable spawn strategy is right_edge_wave.');
    expect(context.spawn_generation_guidance.join('\n')).toContain('For dodger collectibles, the only executable spawn strategy is fixed_positions.');
    expect(context.spawn_generation_guidance.join('\n')).toContain('max_active between 2 and 4');
    expect(context.difficulty_runtime_guidance.join('\n')).toContain('runtime derives a dodger difficulty curve from game.difficulty and target_play_time_sec');
    expect(context.difficulty_runtime_guidance.join('\n')).toContain('Do not output runtime_plan, template_params, difficulty_curve');
  });

  it('selects the side-scrolling run-and-gun contract and schema envelope for alias prompts', () => {
    const normalizedBrief: GameBrief = {
      ...sideScrollingBrief,
      title: 'Generic Run And Gun',
      genre: 'side_scrolling_run_and_gun',
      camera: 'side_view'
    };
    const context = buildRawDslPromptContext({ idea: '做一个魂斗罗式横版射击游戏', language: 'zh', brief: normalizedBrief });

    expect(context.selected_contract).toMatchObject({
      genre: 'side_scrolling_run_and_gun',
      template_id: 'side_scrolling_run_and_gun.v1',
      aliases: expect.arrayContaining(['魂斗罗', '横版跑枪', 'contra-like'])
    });
    expect(context.allowed_enums.genres).toContain('side_scrolling_run_and_gun');
    expect(context.valid_example).toMatchObject({
      game: { genre: 'side_scrolling_run_and_gun', camera: 'side_view' },
      world: { coordinateSystem: 'side_view_2d', gravity: expect.any(Number) },
      camera: { mode: 'follow_player_x' },
      player: { controller: 'run_jump_shoot', aiming: { mode: 'multi_direction' } },
      level: {
        terrain: expect.arrayContaining([expect.objectContaining({ kind: 'platform' })]),
        spawns: expect.arrayContaining([expect.objectContaining({ trigger: expect.any(String) })])
      }
    });
    expect(context.anti_shell_rules.join('\n')).toContain('Do not output Contra');
    expect(context.spawn_generation_guidance.join('\n')).toContain('level.spawns');
  });
});

describe('buildIntentPlan', () => {
  it.each([
    ['小猫大战坦克', 'top_down_shooter'],
    ['魂斗罗', 'side_scrolling_run_and_gun'],
    ['横版跑枪', 'side_scrolling_run_and_gun'],
    ['contra-like', 'side_scrolling_run_and_gun'],
    ['飞机大战', 'vertical_shooter'],
    ['马里奥式', 'side_scrolling_platformer'],
    ['平台跳跃', 'side_scrolling_platformer'],
    ['打砖块', 'breakout'],
    ['迷宫追逐', 'maze_chase']
  ] as const)('normalizes multilingual aliases: %s', (idea, normalizedGenre) => {
    expect(buildIntentPlan({ idea, language: idea === 'contra-like' ? 'en' : 'zh' })).toMatchObject({
      schemaVersion: 'intent-plan-v0.1',
      sourcePrompt: idea,
      normalizedGenre
    });
  });

  it('marks currently unsupported normalized genres without downgrading them', () => {
    expect(buildIntentPlan({ idea: '飞机大战', language: 'zh' })).toMatchObject({
      normalizedGenre: 'vertical_shooter',
      runtimeDslSupport: 'unsupported',
      unsupportedCapabilities: expect.arrayContaining(['vertical_scroll_camera'])
    });
  });

  it('does not silently downgrade unrecognized prompts to a supported shooter genre', () => {
    expect(buildIntentPlan({ idea: '做一个全新的二维游戏', language: 'zh' })).toMatchObject({
      normalizedGenre: 'unrecognized_2d_genre',
      runtimeDslSupport: 'unsupported',
      unsupportedCapabilities: ['recognized_2d_genre']
    });
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
        camera: 'top_down | side_view'
      },
      intent_plan: expect.objectContaining({ normalizedGenre: 'dodger_collector' }),
      forbidden_fields: expect.arrayContaining(['player_character', 'mechanics', 'background_music'])
    });
  });

  it('normalizes top-down shooter aliases into the current executable brief genre', async () => {
    const service = new GameDslProviderService(createModelClient(success(brief)));

    await expect(service.generateGameBrief({ ...requestBase, idea: '小猫大战坦克', language: 'zh' })).resolves.toMatchObject({
      ok: true,
      value: {
        genre: 'shooter',
        camera: 'top_down',
        core_loop: ['Move in a top-down arena.', 'Fire projectiles at generic enemies.', 'Clear enemies to win.']
      }
    });
  });

  it('normalizes stable dodger-collector brief genre into an executable collector genre', async () => {
    const service = new GameDslProviderService(
      createModelClient(
        success({
          ...brief,
          genre: 'dodger_collector'
        })
      )
    );

    await expect(service.generateGameBrief({ ...requestBase, idea: '做一个 2D 收集游戏，避开敌人', language: 'zh' })).resolves.toMatchObject({
      ok: true,
      value: {
        genre: 'collector',
        camera: 'top_down'
      }
    });
  });

  it.each([
    '做一个魂斗罗式横版射击游戏',
    '魂斗罗一样的跑枪游戏',
    '横版跑枪打外星人',
    'contra-like run and gun'
  ])('normalizes run-and-gun aliases to the generic side-scrolling genre: %s', async (idea) => {
    const service = new GameDslProviderService(createModelClient(success(sideScrollingBrief)));

    const result = await service.generateGameBrief({ ...requestBase, idea, language: idea.includes('contra') ? 'en' : 'zh' });

    expect(result).toMatchObject({
      ok: true,
      value: {
        genre: 'side_scrolling_run_and_gun',
        camera: 'side_view',
        core_loop: [
          'Run through side-view platform segments.',
          'Jump across terrain while avoiding enemy fire.',
          'Shoot generic enemies and reach the exit.'
        ]
      }
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title.toLowerCase()).not.toContain('contra');
      expect(result.value.title).not.toContain('魂斗罗');
    }
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

  it.each(['做一个魂斗罗式横版射击游戏', '魂斗罗一样的跑枪游戏', '横版跑枪打外星人'])(
    'accepts generic side-scrolling run-and-gun Raw DSL for alias prompt: %s',
    async (idea) => {
      const rawDsl = createSideScrollingRunAndGunRawDsl();
      const sideBrief: GameBrief = {
        brief_version: 'game-brief-v0.1',
        title: 'Generic Run And Gun',
        genre: 'side_scrolling_run_and_gun',
        camera: 'side_view',
        core_loop: ['Run through side-view platform segments.', 'Shoot generic enemies and reach the exit.'],
        difficulty: 'normal',
        target_play_time_sec: rawDsl.game.target_play_time_sec
      };
      const service = new GameDslProviderService(createModelClient(success(rawDsl)));

      const result = await service.generateRawGameDsl({ ...requestBase, idea, language: 'zh', brief: sideBrief });

      expect(result).toMatchObject({
        ok: true,
        value: {
          game: { genre: 'side_scrolling_run_and_gun', camera: 'side_view' },
          world: { coordinateSystem: 'side_view_2d', gravity: expect.any(Number) },
          player: { controller: 'run_jump_shoot', aiming: { mode: expect.stringMatching(/multi_direction|eight_direction/) } },
          level: {
            terrain: expect.arrayContaining([expect.objectContaining({ kind: expect.stringMatching(/platform|ground/) })]),
            spawns: expect.arrayContaining([expect.objectContaining({ trigger: expect.any(String) })])
          }
        }
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const serialized = JSON.stringify(result.value).toLowerCase();
        expect(serialized).not.toContain('contra');
        expect(JSON.stringify(result.value)).not.toContain('魂斗罗');
      }
    }
  );

  it('accepts dodger Raw Game DSL with the verified right_edge_wave hazard spawn slice', async () => {
    const calls: JsonChatParams[] = [];
    const rawDsl = createDodgerRawDsl();
    const service = new GameDslProviderService(createModelClient(success(rawDsl), calls));

    await expect(service.generateRawGameDsl({ ...requestBase, brief: dodgerBrief })).resolves.toMatchObject({
      ok: true,
      value: {
        game: { genre: 'dodger' },
        entities: [
          expect.objectContaining({ kind: 'collectible', spawn: { strategy: 'fixed_positions', max_active: 2, interval_ms: 900 } }),
          expect.objectContaining({
            kind: 'hazard',
            spawn: { strategy: 'right_edge_wave', max_active: 3, interval_ms: 700, lane_count: 3 }
          })
        ]
      }
    });
    expect(calls[0]?.user).toMatchObject({
      brief: dodgerBrief,
      spawn_generation_guidance: expect.arrayContaining([expect.stringContaining('right_edge_wave')])
    });
  });

  it('rejects model Raw Game DSL spawn outside the verified entity scope', async () => {
    const base = createDodgerRawDsl();
    const rawDsl = {
      ...base,
      entities: base.entities.map((entity) =>
        entity.kind === 'collectible' ? { ...entity, spawn: { ...entity.spawn, strategy: 'right_edge_wave' as const, lane_count: 3 } } : entity
      )
    };
    const service = new GameDslProviderService(createModelClient(success(rawDsl)));

    const result = await service.generateRawGameDsl({ ...requestBase, brief: dodgerBrief });

    expect(result).toMatchObject({
      ok: false,
      code: 'MODEL_SCHEMA_VALIDATION_FAILED',
      message: 'Raw Game DSL uses unsupported spawn generation scope.'
    });
    expect(result.ok).toBe(false);
    if (!result.ok && 'issues' in result) {
      expect(result.issues).toContain('entities.0.spawn: only dodger hazard right_edge_wave and dodger collectible fixed_positions are currently exposed to model generation');
    }
  });

  it.each(['fixed_positions', 'top_edge_stream'] as const)('rejects schema-valid dodger hazard spawn strategy %s outside the verified prompt scope', async (strategy) => {
    const base = createDodgerRawDsl();
    const rawDsl = {
      ...base,
      entities: base.entities.map((entity) =>
        entity.kind === 'hazard' ? { ...entity, spawn: { ...entity.spawn, strategy } } : omitSpawn(entity)
      )
    };
    const service = new GameDslProviderService(createModelClient(success(rawDsl)));

    const result = await service.generateRawGameDsl({ ...requestBase, brief: dodgerBrief });

    expect(result).toMatchObject({
      ok: false,
      code: 'MODEL_SCHEMA_VALIDATION_FAILED',
      message: 'Raw Game DSL uses unsupported spawn generation scope.'
    });
    expect(result.ok).toBe(false);
    if (!result.ok && 'issues' in result) {
      expect(result.issues).toContain('entities.1.spawn: only dodger hazard right_edge_wave and dodger collectible fixed_positions are currently exposed to model generation');
    }
  });

  it.each([
    {
      label: 'count',
      patch: { count: 50 },
      issue: 'entities.1.count: dodger hazard spawn count must be between 5 and 12 for the verified prompt scope'
    },
    {
      label: 'max_active',
      patch: { spawn: { max_active: 12 } },
      issue: 'entities.1.spawn.max_active: must be between 2 and 4 for the verified prompt scope'
    },
    {
      label: 'interval_ms',
      patch: { spawn: { interval_ms: 200 } },
      issue: 'entities.1.spawn.interval_ms: must be between 600 and 1200 for the verified prompt scope'
    },
    {
      label: 'lane_count',
      patch: { spawn: { lane_count: 1 } },
      issue: 'entities.1.spawn.lane_count: must be between 3 and 4 for the verified prompt scope'
    }
  ])('rejects dodger hazard spawn %s outside the verified prompt range', async ({ patch, issue }) => {
    const base = createDodgerRawDsl();
    const rawDsl = {
      ...base,
      entities: base.entities.map((entity) =>
        entity.kind === 'hazard'
          ? {
              ...entity,
              ...('count' in patch ? { count: patch.count } : {}),
              spawn: { ...entity.spawn, strategy: 'right_edge_wave' as const, ...('spawn' in patch ? patch.spawn : {}) }
            }
          : entity
      )
    };
    const service = new GameDslProviderService(createModelClient(success(rawDsl)));

    const result = await service.generateRawGameDsl({ ...requestBase, brief: dodgerBrief });

    expect(result).toMatchObject({
      ok: false,
      code: 'MODEL_SCHEMA_VALIDATION_FAILED',
      message: 'Raw Game DSL uses unsupported spawn generation scope.'
    });
    expect(result.ok).toBe(false);
    if (!result.ok && 'issues' in result) {
      expect(result.issues).toContain(issue);
    }
  });

  it.each([
    {
      label: 'count',
      patch: { count: 50 },
      issue: 'entities.0.count: dodger collectible spawn count must be between 3 and 10 for the verified prompt scope'
    },
    {
      label: 'max_active',
      patch: { spawn: { max_active: 12 } },
      issue: 'entities.0.spawn.max_active: must be between 1 and 3 for the verified prompt scope'
    },
    {
      label: 'interval_ms',
      patch: { spawn: { interval_ms: 200 } },
      issue: 'entities.0.spawn.interval_ms: must be between 700 and 1600 for the verified prompt scope'
    },
    {
      label: 'lane_count',
      patch: { spawn: { lane_count: 3 } },
      issue: 'entities.0.spawn.lane_count: must be omitted for dodger collectible fixed_positions'
    }
  ])('rejects dodger collectible spawn %s outside the verified prompt range', async ({ patch, issue }) => {
    const base = createDodgerRawDsl();
    const rawDsl = {
      ...base,
      entities: base.entities.map((entity) =>
        entity.kind === 'collectible'
          ? {
              ...entity,
              ...('count' in patch ? { count: patch.count } : {}),
              spawn: { ...entity.spawn, strategy: 'fixed_positions' as const, ...('spawn' in patch ? patch.spawn : {}) }
            }
          : entity
      )
    };
    const service = new GameDslProviderService(createModelClient(success(rawDsl)));

    const result = await service.generateRawGameDsl({ ...requestBase, brief: dodgerBrief });

    expect(result).toMatchObject({
      ok: false,
      code: 'MODEL_SCHEMA_VALIDATION_FAILED',
      message: 'Raw Game DSL uses unsupported spawn generation scope.'
    });
    expect(result.ok).toBe(false);
    if (!result.ok && 'issues' in result) {
      expect(result.issues).toContain(issue);
    }
  });

  it('rejects duplicate dodger spawn rules for the same entity kind', async () => {
    const base = createDodgerRawDsl();
    const rawDsl = {
      ...base,
      entities: [
        ...base.entities,
        {
          id: 'bonus_coin',
          kind: 'collectible' as const,
          label: 'Bonus Coin',
          count: 3,
          movement: { type: 'static' as const },
          spawn: { strategy: 'fixed_positions' as const, max_active: 1, interval_ms: 1200 }
        }
      ]
    };
    const service = new GameDslProviderService(createModelClient(success(rawDsl)));

    const result = await service.generateRawGameDsl({ ...requestBase, brief: dodgerBrief });

    expect(result).toMatchObject({
      ok: false,
      code: 'MODEL_SCHEMA_VALIDATION_FAILED',
      message: 'Raw Game DSL uses unsupported spawn generation scope.'
    });
    expect(result.ok).toBe(false);
    if (!result.ok && 'issues' in result) {
      expect(result.issues).toContain('entities.2.spawn: duplicate collectible spawn rules are not supported by the verified runtime scope');
    }
  });

  it('rejects spawn-bearing dodger entities when the same kind has a different primary entity', async () => {
    const base = createDodgerRawDsl();
    const rawDsl = {
      ...base,
      entities: [
        omitSpawn(base.entities[0]),
        base.entities[1],
        {
          id: 'bonus_coin',
          kind: 'collectible' as const,
          label: 'Bonus Coin',
          count: 3,
          movement: { type: 'static' as const },
          spawn: { strategy: 'fixed_positions' as const, max_active: 1, interval_ms: 1200 }
        }
      ]
    };
    const service = new GameDslProviderService(createModelClient(success(rawDsl)));

    const result = await service.generateRawGameDsl({ ...requestBase, brief: dodgerBrief });

    expect(result).toMatchObject({
      ok: false,
      code: 'MODEL_SCHEMA_VALIDATION_FAILED',
      message: 'Raw Game DSL uses unsupported spawn generation scope.'
    });
    expect(result.ok).toBe(false);
    if (!result.ok && 'issues' in result) {
      expect(result.issues).toContain('entities.2.spawn: dodger collectible spawn requires exactly one collectible entity in the verified runtime scope');
    }
  });

  it('rejects spawn-bearing dodger hazards when the same kind has a different primary entity', async () => {
    const base = createDodgerRawDsl();
    const rawDsl = {
      ...base,
      entities: [
        base.entities[0],
        omitSpawn(base.entities[1]),
        {
          id: 'bonus_hazard',
          kind: 'hazard' as const,
          label: 'Bonus Hazard',
          count: 5,
          movement: { type: 'fall_down' as const },
          spawn: { strategy: 'right_edge_wave' as const, max_active: 2, interval_ms: 900, lane_count: 3 }
        }
      ]
    };
    const service = new GameDslProviderService(createModelClient(success(rawDsl)));

    const result = await service.generateRawGameDsl({ ...requestBase, brief: dodgerBrief });

    expect(result).toMatchObject({
      ok: false,
      code: 'MODEL_SCHEMA_VALIDATION_FAILED',
      message: 'Raw Game DSL uses unsupported spawn generation scope.'
    });
    expect(result.ok).toBe(false);
    if (!result.ok && 'issues' in result) {
      expect(result.issues).toContain('entities.2.spawn: dodger hazard spawn requires exactly one hazard entity in the verified runtime scope');
    }
  });

  it.each([
    {
      label: 'missing collect collision',
      patch: (rawDsl: ReturnType<typeof createDodgerRawDsl>) => ({
        ...rawDsl,
        rules: { collisions: rawDsl.rules.collisions.filter((collision) => collision.target !== 'coin') }
      })
    },
    {
      label: 'missing score_add',
      patch: (rawDsl: ReturnType<typeof createDodgerRawDsl>) => ({
        ...rawDsl,
        rules: {
          collisions: rawDsl.rules.collisions.map((collision) =>
            collision.target === 'coin' ? { ...collision, effects: [{ type: 'destroy' as const }] } : collision
          )
        }
      })
    },
    {
      label: 'zero score_add',
      patch: (rawDsl: ReturnType<typeof createDodgerRawDsl>) => ({
        ...rawDsl,
        rules: {
          collisions: rawDsl.rules.collisions.map((collision) =>
            collision.target === 'coin' ? { ...collision, effects: [{ type: 'score_add' as const, value: 0 }, { type: 'destroy' as const }] } : collision
          )
        }
      })
    }
  ])('rejects dodger collectible fixed_positions spawn when scoring collect semantics are invalid: $label', async ({ patch }) => {
    const service = new GameDslProviderService(createModelClient(success(patch(createDodgerRawDsl()))));

    const result = await service.generateRawGameDsl({ ...requestBase, brief: dodgerBrief });

    expect(result).toMatchObject({
      ok: false,
      code: 'MODEL_SCHEMA_VALIDATION_FAILED',
      message: 'Raw Game DSL uses unsupported spawn generation scope.'
    });
    expect(result.ok).toBe(false);
    if (!result.ok && 'issues' in result) {
      expect(result.issues).toContain('entities.0.spawn: dodger collectible fixed_positions requires a player overlap collision with score_add greater than 0');
    }
  });

  it('rejects model Raw Game DSL that puts spawn semantics under rules.spawns', async () => {
    const rawDsl = createDodgerRawDsl();
    const service = new GameDslProviderService(
      createModelClient(success({ ...rawDsl, rules: { ...rawDsl.rules, spawns: [{ entity: 'obstacle', strategy: 'right_edge_wave' }] } }))
    );

    const result = await service.generateRawGameDsl({ ...requestBase, brief: dodgerBrief });

    expect(result).toMatchObject({
      ok: false,
      code: 'MODEL_SCHEMA_VALIDATION_FAILED',
      message: 'Raw Game DSL schema validation failed.'
    });
    expect(result.ok).toBe(false);
    if (!result.ok && 'issues' in result) {
      expect(result.issues.join('\n')).toContain('Unrecognized key');
    }
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

  it('normalizes shooter survive_duration to enemy_cleared for the P0 runtime', async () => {
    const rawDsl = {
      ...createShooterRawDsl(),
      game: { ...createShooterRawDsl().game, difficulty: shooterBrief.difficulty, target_play_time_sec: shooterBrief.target_play_time_sec },
      objectives: { win: { type: 'survive_duration' as const, target: 60 }, lose: { type: 'player_health_zero' as const } }
    };
    const service = new GameDslProviderService(createModelClient(success(rawDsl)));

    await expect(service.generateRawGameDsl({ ...requestBase, brief: shooterBrief })).resolves.toMatchObject({
      ok: true,
      value: {
        objectives: { win: { type: 'enemy_cleared', target: 6 } }
      }
    });
  });

  it('rejects shooter model DSL with multiple enemies outside the verified runtime scope', async () => {
    const rawDsl = {
      ...createShooterRawDsl(),
      game: { ...createShooterRawDsl().game, difficulty: shooterBrief.difficulty, target_play_time_sec: shooterBrief.target_play_time_sec },
      entities: [
        ...createShooterRawDsl().entities,
        { id: 'fast_alien', kind: 'enemy' as const, label: 'Fast Alien', count: 4, health: 1, movement: { type: 'chase_player' as const, speed_px_per_sec: 180 } }
      ]
    };
    const service = new GameDslProviderService(createModelClient(success(rawDsl)));

    const result = await service.generateRawGameDsl({ ...requestBase, brief: shooterBrief });

    expect(result).toMatchObject({
      ok: false,
      code: 'MODEL_SCHEMA_VALIDATION_FAILED',
      message: 'Raw Game DSL uses unsupported spawn generation scope.'
    });
    expect(result.ok).toBe(false);
    if (!result.ok && 'issues' in result) {
      expect(result.issues).toContain('entities: shooter model generation requires exactly one primary enemy in the verified runtime scope');
    }
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

describe('game_dsl.v1 artifact contract', () => {
  it('validates 小猫大战坦克 as a stable top_down_shooter artifact', () => {
    const artifact = buildGameDslArtifact({
      rawDsl: RawGameDslSchema.parse(createShooterRawDsl()),
      runId: requestBase.runId,
      intentPlan: { normalizedGenre: 'top_down_shooter', matchedAlias: '小猫大战坦克' }
    });

    const result = validateGameDslArtifact(artifact);

    expect(result).toMatchObject({
      ok: true,
      artifact: {
        artifactKind: 'game_dsl',
        schemaVersion: 'game_dsl.v1',
        dslId: expect.any(String),
        runId: requestBase.runId,
        intentPlanRef: { artifact: 'intent_plan.json', normalizedGenre: 'top_down_shooter' },
        genre: 'top_down_shooter',
        world: { coordinateSystem: 'top_down_2d' },
        player: { id: 'player', controller: 'eight_direction_shoot' },
        enemyTypes: { alien: expect.objectContaining({ id: 'alien' }) },
        projectiles: { bolt: expect.objectContaining({ id: 'bolt' }) },
        level: { id: 'level_main', waves: { alien_wave: expect.objectContaining({ id: 'alien_wave', enemyTypeRef: 'alien' }) } },
        requiredCapabilities: expect.arrayContaining(['top_down_camera', 'projectile_combat'])
      },
      report: {
        artifactKind: 'dsl_validation_report',
        schemaVersion: 'dsl_validation_report.v1',
        status: 'valid',
        errorCount: 0,
        semanticChecks: expect.arrayContaining([
          expect.objectContaining({ name: 'source_dsl_validation', status: 'passed' }),
          expect.objectContaining({ name: 'source_projection_consistency', status: 'passed' })
        ])
      }
    });
  });

  it('validates 飞机大战 as a vertical_shooter artifact contract without requiring runtime support', () => {
    const artifact = buildGameDslArtifact({
      rawDsl: RawGameDslSchema.parse(createShooterRawDsl()),
      runId: requestBase.runId,
      intentPlan: { normalizedGenre: 'vertical_shooter', matchedAlias: '飞机大战' }
    });

    expect(validateGameDslArtifact(artifact)).toMatchObject({
      ok: true,
      artifact: {
        genre: 'vertical_shooter',
        world: { coordinateSystem: 'vertical_scroll_2d' },
        camera: { mode: 'vertical_scroll' },
        player: { controller: 'vertical_shooter' },
        level: { structure: 'vertical_scroll' },
        requiredCapabilities: expect.arrayContaining(['vertical_scroll_camera', 'projectile_combat'])
      }
    });
  });

  it('validates 马里奥式平台跳跃 as a side_scrolling_platformer artifact contract', () => {
    const artifact = platformerArtifact();

    expect(validateGameDslArtifact(artifact)).toMatchObject({
      ok: true,
      artifact: {
        genre: 'side_scrolling_platformer',
        world: { coordinateSystem: 'side_view_2d' },
        player: { controller: 'run_jump' },
        level: { structure: 'side_scrolling_stage', terrain: expect.arrayContaining([expect.objectContaining({ id: 'ground_intro' })]) },
        pickups: { field_medkit: expect.objectContaining({ id: 'field_medkit' }) },
        requiredCapabilities: expect.arrayContaining(['gravity_platformer_physics', 'platforms_terrain_collision'])
      }
    });
  });

  it('validates 魂斗罗式横版射击 as side_scrolling_run_and_gun even when runtime is unsupported later', () => {
    const rawDsl = RawGameDslSchema.parse(createSideScrollingRunAndGunRawDsl());
    const artifact = buildGameDslArtifact({
      rawDsl,
      runId: requestBase.runId,
      intentPlan: { normalizedGenre: 'side_scrolling_run_and_gun', matchedAlias: '魂斗罗式' }
    });
    const normalized = validateAndNormalizeRawGameDsl(rawDsl);

    expect(validateGameDslArtifact(artifact)).toMatchObject({
      ok: true,
      artifact: {
        genre: 'side_scrolling_run_and_gun',
        player: { controller: 'run_jump_shoot' },
        requiredCapabilities: expect.arrayContaining(['side_view_camera', 'checkpoint_or_lives_system'])
      }
    });
    expect(normalized.ok).toBe(true);
    if (normalized.ok) {
      expect(checkPhaserRuntimeCapabilities(normalized.ir)).toMatchObject({
        ok: false,
        unsupportedCapabilities: expect.arrayContaining([expect.objectContaining({ capability: 'side_view_camera' })])
      });
    }
  });

  it('rejects missing projectile references', () => {
    const artifact = buildGameDslArtifact({
      rawDsl: RawGameDslSchema.parse(createShooterRawDsl()),
      runId: requestBase.runId,
      intentPlan: { normalizedGenre: 'top_down_shooter' }
    });

    const result = validateGameDslArtifact({
      ...artifact,
      player: { ...artifact.player, actions: [{ ...artifact.player.actions[0], projectileRef: 'ghost_projectile' }] }
    });

    expect(result).toMatchObject({
      ok: false,
      report: {
        status: 'invalid',
        errors: expect.arrayContaining([expect.objectContaining({ code: 'UNRESOLVED_PROJECTILE_REFERENCE' })])
      }
    });
  });

  it('rejects missing enemyType references', () => {
    const artifact = buildGameDslArtifact({
      rawDsl: RawGameDslSchema.parse(createShooterRawDsl()),
      runId: requestBase.runId,
      intentPlan: { normalizedGenre: 'top_down_shooter' }
    });

    const result = validateGameDslArtifact({
      ...artifact,
      level: { ...artifact.level, waves: { alien_wave: { ...artifact.level.waves.alien_wave, enemyTypeRef: 'ghost_enemy' } } }
    });

    expect(result).toMatchObject({
      ok: false,
      report: {
        status: 'invalid',
        errors: expect.arrayContaining([expect.objectContaining({ code: 'UNRESOLVED_ENEMY_TYPE_REFERENCE' })])
      }
    });
  });

  it('rejects unknown critical fields', () => {
    const artifact = buildGameDslArtifact({
      rawDsl: RawGameDslSchema.parse(createShooterRawDsl()),
      runId: requestBase.runId,
      intentPlan: { normalizedGenre: 'top_down_shooter' }
    });

    expect(validateGameDslArtifact({ ...artifact, runtimeAdapter: 'phaser' })).toMatchObject({
      ok: false,
      report: {
        errors: expect.arrayContaining([expect.objectContaining({ code: 'UNKNOWN_CRITICAL_FIELD' })])
      }
    });
  });

  it('requires all editable and runtime-addressable objects to have stable IDs', () => {
    const artifact = buildGameDslArtifact({
      rawDsl: RawGameDslSchema.parse(createShooterRawDsl()),
      runId: requestBase.runId,
      intentPlan: { normalizedGenre: 'top_down_shooter' }
    });

    const result = validateGameDslArtifact({
      ...artifact,
      projectiles: { bolt: { ...artifact.projectiles.bolt, id: 'bolt_renamed' } }
    });

    expect(result).toMatchObject({
      ok: false,
      report: {
        errors: expect.arrayContaining([expect.objectContaining({ code: 'STABLE_ID_REQUIRED', path: 'projectiles.bolt.id' })])
      }
    });
  });

  it('rejects invalid camera target references', () => {
    const artifact = buildGameDslArtifact({
      rawDsl: RawGameDslSchema.parse(createShooterRawDsl()),
      runId: requestBase.runId,
      intentPlan: { normalizedGenre: 'top_down_shooter' }
    });

    expect(validateGameDslArtifact({ ...artifact, camera: { ...artifact.camera, targetRef: 'missing_target' } })).toMatchObject({
      ok: false,
      report: {
        errors: expect.arrayContaining([expect.objectContaining({ code: 'UNRESOLVED_CAMERA_TARGET_REFERENCE' })])
      }
    });
  });

  it('rejects duplicate IDs across editable artifact objects', () => {
    const artifact = buildGameDslArtifact({
      rawDsl: RawGameDslSchema.parse(createShooterRawDsl()),
      runId: requestBase.runId,
      intentPlan: { normalizedGenre: 'top_down_shooter' }
    });

    expect(
      validateGameDslArtifact({
        ...artifact,
        player: { ...artifact.player, actions: [{ ...artifact.player.actions[0], id: artifact.level.id }] }
      })
    ).toMatchObject({
      ok: false,
      report: {
        errors: expect.arrayContaining([expect.objectContaining({ code: 'DUPLICATE_ID', path: 'player.actions.0.id' })])
      }
    });
  });

  it('rejects genre coordinate system and controller mismatches', () => {
    const artifact = buildGameDslArtifact({
      rawDsl: RawGameDslSchema.parse(createShooterRawDsl()),
      runId: requestBase.runId,
      intentPlan: { normalizedGenre: 'top_down_shooter' }
    });

    expect(
      validateGameDslArtifact({
        ...artifact,
        world: { ...artifact.world, coordinateSystem: 'side_view_2d' },
        player: { ...artifact.player, controller: 'run_jump_shoot' }
      })
    ).toMatchObject({
      ok: false,
      report: {
        errors: expect.arrayContaining([
          expect.objectContaining({ code: 'GENRE_CONTRACT_MISMATCH', path: 'world.coordinateSystem' }),
          expect.objectContaining({ code: 'GENRE_CONTRACT_MISMATCH', path: 'player.controller' })
        ])
      }
    });
  });

  it('rejects protected source alias leakage into editable entity names', () => {
    const artifact = buildGameDslArtifact({
      rawDsl: RawGameDslSchema.parse(createShooterRawDsl()),
      runId: requestBase.runId,
      intentPlan: { normalizedGenre: 'top_down_shooter', matchedAlias: '小猫大战坦克' }
    });

    expect(validateGameDslArtifact({ ...artifact, player: { ...artifact.player, label: '小猫大战坦克 Hero' } })).toMatchObject({
      ok: false,
      report: {
        errors: expect.arrayContaining([expect.objectContaining({ code: 'IP_ALIAS_LEAKAGE', path: 'player.label' })])
      }
    });
  });

  it('rejects top-level projections that drift from sourceDsl', () => {
    const artifact = buildGameDslArtifact({
      rawDsl: RawGameDslSchema.parse(createShooterRawDsl()),
      runId: requestBase.runId,
      intentPlan: { normalizedGenre: 'top_down_shooter' }
    });

    expect(validateGameDslArtifact({ ...artifact, genre: 'vertical_shooter' })).toMatchObject({
      ok: false,
      report: {
        errors: expect.arrayContaining([expect.objectContaining({ code: 'SOURCE_PROJECTION_MISMATCH', path: 'genre' })])
      }
    });
  });

  it('rejects ipPolicy drift that would hide protected aliases', () => {
    const artifact = buildGameDslArtifact({
      rawDsl: RawGameDslSchema.parse(createShooterRawDsl()),
      runId: requestBase.runId,
      intentPlan: { normalizedGenre: 'top_down_shooter', matchedAlias: '小猫大战坦克' }
    });

    expect(validateGameDslArtifact({ ...artifact, ipPolicy: { ...artifact.ipPolicy, sourceAliases: [] } })).toMatchObject({
      ok: false,
      report: {
        errors: expect.arrayContaining([expect.objectContaining({ code: 'SOURCE_PROJECTION_MISMATCH', path: 'ipPolicy' })])
      }
    });
  });
});

function platformerArtifact(): GameDslArtifact {
  return buildGameDslArtifact({
    rawDsl: RawGameDslSchema.parse(createSideScrollingRunAndGunRawDsl()),
    runId: requestBase.runId,
    intentPlan: { normalizedGenre: 'side_scrolling_platformer', matchedAlias: '马里奥式' }
  });
}
