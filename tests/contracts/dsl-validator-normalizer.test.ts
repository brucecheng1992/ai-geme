import { describe, expect, it } from 'vitest';
import collectorContract from '../../packages/game-dsl/src/contracts/collector.contract.json' with { type: 'json' };
import shooterContract from '../../packages/game-dsl/src/contracts/shooter.contract.json' with { type: 'json' };
import {
  DslValidationError,
  normalizeRawGameDsl,
  validateAndNormalizeRawGameDsl,
  validateRawGameDsl
} from '../../packages/game-dsl/src/index.js';
import { createCollectorRawDsl, createShooterRawDsl } from './fixtures.js';

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
      'target_score cannot be reached from scoring rules'
    );
  });

  it('accepts shooter target_score when multiple enemy scoring rules can reach the target', () => {
    const shooterDsl = createShooterRawDsl();

    expect(
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
    }
  });
});
