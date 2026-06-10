import { describe, expect, it } from 'vitest';
import collectorContract from '../../packages/game-dsl/src/contracts/collector.contract.json' with { type: 'json' };
import shooterContract from '../../packages/game-dsl/src/contracts/shooter.contract.json' with { type: 'json' };
import {
  DslValidationError,
  normalizeRawGameDsl,
  validateAndNormalizeRawGameDsl,
  validateRawGameDsl
} from '../../packages/game-dsl/src/index.js';
import { createCollectorRawDsl, createDodgerRawDsl, createShooterRawDsl } from './fixtures.js';

function expectIssue(result: ReturnType<typeof validateRawGameDsl>, code: string, messagePart?: string) {
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.issues.some((issue) => issue.code === code && (messagePart === undefined || issue.message.includes(messagePart)))).toBe(true);
  }
}

describe('DSL Validator and Normalizer', () => {
  it('validates and normalizes a collector DSL into trusted IR', () => {
    const result = validateAndNormalizeRawGameDsl(createCollectorRawDsl());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ir).toMatchObject({
        ir_version: 'game-ir-v0.1',
        source_dsl_version: 'game-dsl-v0.1',
        game: { genre: 'collector', camera: 'top_down', difficulty: 'easy' },
        template_params: { template_id: 'collector_v1' },
        telemetry_contract: {
          required_events_all: collectorContract.required_telemetry_all,
          required_events_any_groups: collectorContract.required_telemetry_any_groups
        },
        qa_plan: {
          mode: 'deterministic',
          seed: 'golden',
          required_events_all: collectorContract.required_telemetry_all
        }
      });
      expect(result.ir.runtime_requirements.actions).toEqual(['collect', 'restart']);
      expect(result.ir.runtime_requirements.collision).toEqual(['overlap']);
    }
  });

  it('maps engine leakage and arbitrary code schema failures to stable issue codes', () => {
    const rawDsl = createCollectorRawDsl();

    expectIssue(
      validateRawGameDsl({ ...rawDsl, metadata: { ...rawDsl.metadata, description: 'Use Phaser sprite callbacks.' } }),
      'ENGINE_LEAKAGE_DETECTED',
      'forbidden term'
    );
    expectIssue(validateRawGameDsl({ ...rawDsl, script: 'return true' }), 'ARBITRARY_CODE_NOT_ALLOWED', 'script');
  });

  it('rejects duplicate ids and unresolved references before normalization', () => {
    const rawDsl = createCollectorRawDsl();

    expectIssue(
      validateRawGameDsl({
        ...rawDsl,
        entities: [{ ...rawDsl.entities[0], id: 'player' }]
      }),
      'DUPLICATE_ID',
      'player'
    );
    expectIssue(
      validateRawGameDsl({
        ...rawDsl,
        rules: { collisions: [{ ...rawDsl.rules.collisions[0], target: 'missing_item' }] }
      }),
      'UNRESOLVED_REFERENCE',
      'missing_item'
    );
  });

  it('rejects collector objectives that cannot be reached from collectible count', () => {
    const rawDsl = createCollectorRawDsl();

    expectIssue(
      validateRawGameDsl({
        ...rawDsl,
        objectives: { ...rawDsl.objectives, win: { type: 'target_score', target: 99 } }
      }),
      'UNREACHABLE_OBJECTIVE',
      'target_score cannot be reached from scoring rules'
    );
  });

  it('rejects scoring rules that cannot make score progress', () => {
    const rawDsl = createCollectorRawDsl();
    const zeroScoreCollision = {
      ...rawDsl.rules.collisions[0],
      effects: rawDsl.rules.collisions[0].effects.map((effect) =>
        effect.type === 'score_add' ? { ...effect, value: 0 } : effect
      )
    };

    expectIssue(
      validateRawGameDsl({ ...rawDsl, rules: { collisions: [zeroScoreCollision] } }),
      'MECHANIC_CONTRACT_FAILED',
      'score.changed'
    );
  });

  it('rejects shooter shells that do not contain a real firing and enemy-hit chain', () => {
    const rawDsl = createCollectorRawDsl();
    const shellShooter = {
      ...rawDsl,
      game: { ...rawDsl.game, genre: 'shooter' },
      objectives: { win: { type: 'target_score', target: 8 }, lose: { type: 'none' } }
    };

    const result = validateRawGameDsl(shellShooter);

    expectIssue(result, 'MECHANIC_CONTRACT_FAILED', 'player.can_fire');
    expectIssue(result, 'MECHANIC_CONTRACT_FAILED', 'collision.projectile_hits_enemy');
  });

  it('rejects shooter target_score without scoring and reverse projectile hits', () => {
    const shooterDsl = createShooterRawDsl();

    expectIssue(
      validateRawGameDsl({
        ...shooterDsl,
        rules: {
          collisions: [
            {
              ...shooterDsl.rules.collisions[0],
              effects: shooterDsl.rules.collisions[0].effects.filter((effect) => effect.type !== 'score_add')
            }
          ]
        },
        objectives: { ...shooterDsl.objectives, win: { type: 'target_score', target: 6 } }
      }),
      'MECHANIC_CONTRACT_FAILED',
      'score_or_objective_progress.exists'
    );

    expectIssue(
      validateRawGameDsl({
        ...shooterDsl,
        rules: {
          collisions: [
            {
              ...shooterDsl.rules.collisions[0],
              source: 'alien',
              target: 'bolt'
            }
          ]
        }
      }),
      'MECHANIC_CONTRACT_FAILED',
      'collision.projectile_hits_enemy'
    );
  });

  it('rejects shooter target_score when model scoring rules cannot reach the target', () => {
    const shooterDsl = createShooterRawDsl();

    expectIssue(
      validateRawGameDsl({
        ...shooterDsl,
        entities: [
          ...shooterDsl.entities,
          { id: 'fast_alien', kind: 'enemy', label: 'Fast Alien', count: 4, health: 1, movement: { type: 'chase_player', speed_px_per_sec: 180 } }
        ],
        rules: {
          collisions: [
            ...shooterDsl.rules.collisions,
            {
              id: 'bolt_hits_fast_alien',
              source: 'bolt',
              target: 'fast_alien',
              type: 'projectile_hit',
              effects: [{ type: 'damage', value: 1 }, { type: 'destroy' }, { type: 'score_add', value: 2 }]
            }
          ]
        },
        objectives: { ...shooterDsl.objectives, win: { type: 'target_score', target: 100 } }
      }),
      'UNREACHABLE_OBJECTIVE',
      'target_score cannot be reached from primary shooter enemy wave'
    );
  });

  it('rejects shooter target_score that depends on secondary enemies outside the runtime envelope', () => {
    const shooterDsl = createShooterRawDsl();

    expectIssue(
      validateRawGameDsl({
        ...shooterDsl,
        entities: [
          ...shooterDsl.entities,
          { id: 'fast_alien', kind: 'enemy', label: 'Fast Alien', count: 4, health: 1, movement: { type: 'chase_player', speed_px_per_sec: 180 } }
        ],
        rules: {
          collisions: [
            ...shooterDsl.rules.collisions,
            {
              id: 'bolt_hits_fast_alien',
              source: 'bolt',
              target: 'fast_alien',
              type: 'projectile_hit',
              effects: [{ type: 'damage', value: 1 }, { type: 'destroy' }, { type: 'score_add', value: 2 }]
            }
          ]
        },
        objectives: { ...shooterDsl.objectives, win: { type: 'target_score', target: 14 } }
      }),
      'MECHANIC_CONTRACT_FAILED',
      'enemy.single_primary'
    );
  });

  it('rejects shooter enemy_cleared targets above the primary enemy wave budget', () => {
    const shooterDsl = createShooterRawDsl();

    expectIssue(
      validateRawGameDsl({
        ...shooterDsl,
        objectives: { ...shooterDsl.objectives, win: { type: 'enemy_cleared', target: 99 } }
      }),
      'UNREACHABLE_OBJECTIVE',
      'enemy_cleared target cannot exceed primary enemy count'
    );
  });

  it('accepts shooter target_score when the primary enemy wave budget can reach the target', () => {
    const shooterDsl = createShooterRawDsl();

    expect(
      validateRawGameDsl({
        ...shooterDsl,
        objectives: { ...shooterDsl.objectives, win: { type: 'target_score', target: 6 } }
      }).ok
    ).toBe(true);
  });

  it('maps id format and numeric range schema failures to stable issue codes', () => {
    const rawDsl = createCollectorRawDsl();

    expectIssue(validateRawGameDsl({ ...rawDsl, player: { ...rawDsl.player, id: 'Bad Id' } }), 'INVALID_ID_FORMAT');
    expectIssue(validateRawGameDsl({ ...rawDsl, world: { ...rawDsl.world, width: 200 } }), 'NUMERIC_RANGE_INVALID');
  });

  it('does not let normalizeRawGameDsl bypass validation', () => {
    const rawDsl = createCollectorRawDsl();

    expect(() =>
      normalizeRawGameDsl({
        ...rawDsl,
        rules: { collisions: [{ ...rawDsl.rules.collisions[0], target: 'missing_item' }] }
      })
    ).toThrow(DslValidationError);
  });

  it('normalizes a valid shooter DSL with the shooter telemetry contract', () => {
    const shooterDsl = createShooterRawDsl();

    const result = validateAndNormalizeRawGameDsl(shooterDsl);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ir.template_params.template_id).toBe('shooter_v1');
      expect(result.ir.telemetry_contract).toEqual({
        required_events_all: shooterContract.required_telemetry_all,
        required_events_any_groups: shooterContract.required_telemetry_any_groups
      });
      expect(result.ir.runtime_requirements.actions).toEqual(['shoot_projectile', 'restart']);
      expect(result.ir.runtime_requirements.collision).toEqual(['projectile_hit']);
      expect(result.ir.runtime_plan.enemy_waves).toEqual([
        {
          derived_from: [
            'entities.enemy.id',
            'entities.enemy.count',
            'entities.enemy.health',
            'entities.enemy.movement.speed_px_per_sec',
            'game.difficulty',
            'game.target_play_time_sec'
          ],
          entity_id: 'alien',
          strategy: 'right_edge_wave',
          count: 6,
          max_active: 3,
          interval_ms: 1594,
          speed_multiplier: 1.15
        }
      ]);
      expect(JSON.stringify(result.ir.template_params.params)).not.toContain('enemy_waves');
    }
  });

  it('preserves optional dodger collectible scoring in template params', () => {
    const result = validateAndNormalizeRawGameDsl(createDodgerRawDsl());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ir.template_params).toMatchObject({
        template_id: 'dodger_v1',
        params: {
          player: { label: 'Runner', speedPxPerSec: 300 },
          hazard: { label: 'Obstacle', damage: 1 },
          collectible: { label: 'Coin', count: 10, scorePerItem: 1 },
          objective: { surviveDurationMs: 60000 }
        }
      });
      expect(result.ir.runtime_requirements.actions).toEqual(['collect', 'restart']);
    }
  });

  it('preserves dodger entity spawn semantics in runtime plan instead of template-only params', () => {
    const result = validateAndNormalizeRawGameDsl(createDodgerRawDsl());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ir.runtime_plan.spawn_rules).toEqual([
        {
          entity_id: 'coin',
          entity_kind: 'collectible',
          strategy: 'fixed_positions',
          count: 10,
          max_active: 2,
          interval_ms: 900
        },
        {
          entity_id: 'obstacle',
          entity_kind: 'hazard',
          strategy: 'right_edge_wave',
          count: 5,
          max_active: 3,
          interval_ms: 700,
          lane_count: 3
        }
      ]);
      expect(JSON.stringify(result.ir.template_params.params)).not.toContain('"spawn"');
    }
  });

  it('derives dodger difficulty curve runtime hints from model-authored game fields', () => {
    const result = validateAndNormalizeRawGameDsl(createDodgerRawDsl());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ir.runtime_plan.difficulty_curve).toEqual({
        derived_from: ['game.difficulty', 'game.target_play_time_sec'],
        level: 'normal',
        speed_multiplier_start: 1,
        speed_multiplier_end: 1.25,
        spawn_interval_multiplier_start: 1,
        spawn_interval_multiplier_end: 0.8,
        ramp_duration_ms: 60000
      });
      expect(JSON.stringify(result.ir.template_params.params)).not.toContain('difficulty_curve');
    }
  });

  it('rejects spawn semantics outside the current dodger runtime plan slice', () => {
    const shooterDsl = createShooterRawDsl();

    expectIssue(
      validateRawGameDsl({
        ...shooterDsl,
        entities: [
          { ...shooterDsl.entities[0], spawn: { strategy: 'right_edge_wave', max_active: 2, interval_ms: 800 } },
          shooterDsl.entities[1]
        ]
      }),
      'SCHEMA_VALIDATION_FAILED',
      'entity.spawn is currently supported only for dodger'
    );
  });

  it('maps spawn numeric range failures to stable issue codes', () => {
    const dodgerDsl = createDodgerRawDsl();

    expectIssue(
      validateRawGameDsl({
        ...dodgerDsl,
        entities: [
          { ...dodgerDsl.entities[0], spawn: { strategy: 'right_edge_wave', interval_ms: 50 } },
          dodgerDsl.entities[1]
        ]
      }),
      'NUMERIC_RANGE_INVALID',
      'Too small'
    );
  });

  it('uses stable normalizer-derived defaults for partial dodger spawn rules', () => {
    const dodgerDsl = createDodgerRawDsl();

    const result = validateAndNormalizeRawGameDsl({
      ...dodgerDsl,
      entities: [
        { ...dodgerDsl.entities[0], spawn: { strategy: 'fixed_positions' } },
        { ...dodgerDsl.entities[1], spawn: { strategy: 'right_edge_wave' } }
      ]
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ir.runtime_plan.spawn_rules).toEqual([
        {
          entity_id: 'coin',
          entity_kind: 'collectible',
          strategy: 'fixed_positions',
          count: 10,
          max_active: 3,
          interval_ms: 1200
        },
        {
          entity_id: 'obstacle',
          entity_kind: 'hazard',
          strategy: 'right_edge_wave',
          count: 5,
          max_active: 2,
          interval_ms: 1000
        }
      ]);
    }
  });

  it('derives shooter primitive visuals from DSL labels and theme', () => {
    const shooterDsl = {
      ...createShooterRawDsl(),
      metadata: { title: 'Tank Battle', description: 'Tank duel.', language: 'en' },
      world: { width: 960, height: 540, visual_theme: 'battlefield' },
      player: {
        ...createShooterRawDsl().player,
        label: '坦克',
        actions: [{ id: 'fire', type: 'shoot_projectile', cooldown_ms: 500, spawns: 'shell' }]
      },
      entities: [
        { id: 'shell', kind: 'projectile', label: '炮弹', damage: 1, movement: { type: 'move_right', speed_px_per_sec: 400 } },
        { id: 'enemy_tank', kind: 'enemy', label: '敌方坦克', count: 8, health: 1, movement: { type: 'chase_player', speed_px_per_sec: 100 } }
      ],
      rules: {
        collisions: [
          {
            id: 'shell_hits_enemy',
            source: 'shell',
            target: 'enemy_tank',
            type: 'projectile_hit',
            effects: [{ type: 'damage', value: 1 }, { type: 'destroy' }, { type: 'score_add', value: 1 }]
          }
        ]
      },
      objectives: { win: { type: 'enemy_cleared', target: 8 }, lose: { type: 'player_health_zero' } }
    };

    const result = validateAndNormalizeRawGameDsl(shooterDsl);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ir.template_params.params).toMatchObject({
        player: { label: '坦克', visual: { kind: 'tank' } },
        projectile: { label: '炮弹', visual: { kind: 'shell' } },
        enemy: { label: '敌方坦克', visual: { kind: 'tank' } }
      });
    }
  });

  it('keeps explicit shooter labels ahead of broad visual themes', () => {
    const shooterDsl = {
      ...createShooterRawDsl(),
      world: { width: 960, height: 540, visual_theme: 'battlefield' },
      player: {
        ...createShooterRawDsl().player,
        actions: [{ id: 'fire', type: 'shoot_projectile', cooldown_ms: 300, spawns: 'laser' }]
      },
      entities: [
        { id: 'laser', kind: 'projectile', label: 'Laser', damage: 1, movement: { type: 'move_right', speed_px_per_sec: 520 } },
        { id: 'alien', kind: 'enemy', label: 'Alien', count: 6, health: 1, movement: { type: 'chase_player', speed_px_per_sec: 120 } }
      ],
      rules: {
        collisions: [
          {
            id: 'laser_hits_alien',
            source: 'laser',
            target: 'alien',
            type: 'projectile_hit',
            effects: [{ type: 'damage', value: 1 }, { type: 'destroy' }, { type: 'score_add', value: 1 }]
          }
        ]
      }
    };

    const result = validateAndNormalizeRawGameDsl(shooterDsl);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ir.template_params.params).toMatchObject({
        player: { label: 'Cat', visual: { kind: 'cat' } },
        projectile: { label: 'Laser', visual: { kind: 'beam' } },
        enemy: { label: 'Alien', visual: { kind: 'alien' } }
      });
    }
  });

  it('uses shooter projectile theme fallback only when the label has no visual signal', () => {
    const shooterDsl = {
      ...createShooterRawDsl(),
      world: { width: 960, height: 540, visual_theme: 'battlefield' },
      player: {
        ...createShooterRawDsl().player,
        actions: [{ id: 'fire', type: 'shoot_projectile', cooldown_ms: 300, spawns: 'round' }]
      },
      entities: [
        { id: 'round', kind: 'projectile', label: 'Round', damage: 1, movement: { type: 'move_right', speed_px_per_sec: 520 } },
        { id: 'alien', kind: 'enemy', label: 'Alien', count: 6, health: 1, movement: { type: 'chase_player', speed_px_per_sec: 120 } }
      ],
      rules: {
        collisions: [
          {
            id: 'round_hits_alien',
            source: 'round',
            target: 'alien',
            type: 'projectile_hit',
            effects: [{ type: 'damage', value: 1 }, { type: 'destroy' }, { type: 'score_add', value: 1 }]
          }
        ]
      }
    };

    const result = validateAndNormalizeRawGameDsl(shooterDsl);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ir.template_params.params).toMatchObject({
        projectile: { label: 'Round', visual: { kind: 'shell' } }
      });
    }
  });

  it('still rejects a collector whose base loop is broken (no scoring collision)', () => {
    const brokenCollector = {
      ...createCollectorRawDsl(),
      rules: {
        collisions: [
          { id: 'collect_gem', source: 'player', target: 'gem', type: 'overlap', effects: [{ type: 'destroy' }] }
        ]
      }
    };

    expectIssue(validateRawGameDsl(brokenCollector), 'MECHANIC_CONTRACT_FAILED', 'score.changed');
  });

  it('still rejects an unreachable collector target_score', () => {
    const unreachable = {
      ...createCollectorRawDsl(),
      objectives: { win: { type: 'target_score', target: 9999 }, lose: { type: 'none' } }
    };

    expectIssue(validateRawGameDsl(unreachable), 'UNREACHABLE_OBJECTIVE');
  });
});
