import { describe, expect, it } from 'vitest';
import collectorContract from '../../packages/game-dsl/src/contracts/collector.contract.json' with { type: 'json' };
import dodgerContract from '../../packages/game-dsl/src/contracts/dodger.contract.json' with { type: 'json' };
import shooterContract from '../../packages/game-dsl/src/contracts/shooter.contract.json' with { type: 'json' };
import { GameBriefSchema, NormalizedGameIrSchema, RawGameDslSchema } from '../../packages/game-dsl/src/index.js';
import { TelemetryEventSchema } from '../../packages/runtime-core/src/index.js';
import qaGate from '../../packages/runtime-core/src/qa/playable-qa-gate-v0.1.json' with { type: 'json' };
import phaserCapabilities from '../../packages/runtime-adapters/phaser/src/phaser-adapter-v0.1.capabilities.json' with { type: 'json' };
import collectorManifest from '../../templates/phaser/collector/template-manifest.json' with { type: 'json' };
import dodgerManifest from '../../templates/phaser/dodger/template-manifest.json' with { type: 'json' };
import shooterManifest from '../../templates/phaser/shooter/template-manifest.json' with { type: 'json' };
import { createCollectorRawDsl, createIrForGenre, satisfiesGate } from './fixtures.js';

const requiredSystems = [
  'InputSystem',
  'MovementSystem',
  'SpawnSystem',
  'CollisionSystem',
  'ScoreSystem',
  'ObjectiveSystem',
  'TelemetrySystem',
  'GameStateSystem',
  'QaBridge'
];

describe('Contract Freeze', () => {
  it('accepts valid game brief payloads', () => {
    expect(() =>
      GameBriefSchema.parse({
        brief_version: 'game-brief-v0.1',
        title: 'Cat Alien Shooter',
        genre: 'shooter',
        camera: 'top_down',
        core_loop: ['move', 'fire', 'clear enemies'],
        difficulty: 'easy',
        target_play_time_sec: 60
      })
    ).not.toThrow();
  });

  it('rejects engine leakage in schema-adjacent raw DSL fields by keeping runtime concepts absent', () => {
    const rawDslKeys = Object.keys(RawGameDslSchema.shape);

    expect(rawDslKeys).not.toContain('scene');
    expect(rawDslKeys).not.toContain('sprite');
    expect(rawDslKeys).not.toContain('script');
  });

  it('rejects forbidden raw DSL fields and engine terms instead of stripping them', () => {
    const validRawDsl = createCollectorRawDsl();

    expect(() => RawGameDslSchema.parse({ ...validRawDsl, script: 'return true' })).toThrow();
    expect(() =>
      RawGameDslSchema.parse({
        ...validRawDsl,
        entities: [{ ...validRawDsl.entities[0], onUpdate: 'move()' }]
      })
    ).toThrow();
    expect(() =>
      RawGameDslSchema.parse({
        ...validRawDsl,
        metadata: { ...validRawDsl.metadata, description: 'Use Phaser sprite callbacks.' }
      })
    ).toThrow();
  });

  it('accepts representative raw DSL and normalized IR payloads', () => {
    expect(() => RawGameDslSchema.parse(createCollectorRawDsl())).not.toThrow();

    expect(() => NormalizedGameIrSchema.parse(createIrForGenre('collector', collectorContract))).not.toThrow();
  });

  it('accepts normalized IR only when telemetry comes from the matching genre contract', () => {
    expect(() => NormalizedGameIrSchema.parse(createIrForGenre('collector', collectorContract))).not.toThrow();
    expect(() => NormalizedGameIrSchema.parse(createIrForGenre('dodger', dodgerContract))).not.toThrow();
    expect(() => NormalizedGameIrSchema.parse(createIrForGenre('shooter', shooterContract))).not.toThrow();
  });

  it('keeps runtime plan spawn rules strict and enum-bounded', () => {
    const validIr = createIrForGenre('dodger', dodgerContract);

    expect(() =>
      NormalizedGameIrSchema.parse({
        ...validIr,
        runtime_plan: {
          spawn_rules: [
            {
              entity_id: 'obstacle',
              entity_kind: 'hazard',
              strategy: 'right_edge_wave',
              count: 5,
              max_active: 3,
              interval_ms: 700,
              lane_count: 3
            }
          ]
        }
      })
    ).not.toThrow();

    expect(() =>
      NormalizedGameIrSchema.parse({
        ...validIr,
        runtime_plan: {
          spawn_rules: [
            {
              entity_id: 'obstacle',
              entity_kind: 'hazard',
              strategy: 'scripted_spawn',
              count: 5,
              max_active: 3,
              interval_ms: 700
            }
          ]
        }
      })
    ).toThrow();

    expect(() =>
      NormalizedGameIrSchema.parse({
        ...validIr,
        runtime_plan: {
          spawn_rules: [
            {
              entity_id: 'obstacle',
              entity_kind: 'hazard',
              strategy: 'right_edge_wave',
              count: 5,
              max_active: 3,
              interval_ms: 700,
              expression: 'Math.random()'
            }
          ]
        }
      })
    ).toThrow();
  });

  it('keeps runtime plan difficulty curve strict and genre-gated', () => {
    const validIr = createIrForGenre('dodger', dodgerContract);
    const difficultyCurve = {
      derived_from: ['game.difficulty', 'game.target_play_time_sec'],
      level: 'easy',
      speed_multiplier_start: 0.9,
      speed_multiplier_end: 1,
      spawn_interval_multiplier_start: 1.15,
      spawn_interval_multiplier_end: 1.05,
      ramp_duration_ms: 60000
    };

    expect(() =>
      NormalizedGameIrSchema.parse({
        ...validIr,
        runtime_plan: {
          spawn_rules: [],
          difficulty_curve: difficultyCurve
        }
      })
    ).not.toThrow();

    expect(() =>
      NormalizedGameIrSchema.parse({
        ...validIr,
        runtime_plan: {
          spawn_rules: [],
          difficulty_curve: { ...difficultyCurve, script: 'Math.random()' }
        }
      })
    ).toThrow();

    expect(() =>
      NormalizedGameIrSchema.parse({
        ...createIrForGenre('collector', collectorContract),
        runtime_plan: {
          spawn_rules: [],
          difficulty_curve: difficultyCurve
        }
      })
    ).toThrow();
  });

  it('keeps shooter runtime plan enemy waves strict, genre-gated, and single-wave', () => {
    const shooterIr = createIrForGenre('shooter', shooterContract);
    const enemyWave = {
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
      interval_ms: 800,
      speed_multiplier: 1.15
    };

    expect(() =>
      NormalizedGameIrSchema.parse({
        ...shooterIr,
        runtime_plan: {
          spawn_rules: [],
          enemy_waves: [enemyWave]
        }
      })
    ).not.toThrow();

    expect(() =>
      NormalizedGameIrSchema.parse({
        ...shooterIr,
        runtime_plan: {
          spawn_rules: [],
          enemy_waves: [{ ...enemyWave, script: 'Math.random()' }]
        }
      })
    ).toThrow();

    expect(() =>
      NormalizedGameIrSchema.parse({
        ...shooterIr,
        runtime_plan: {
          spawn_rules: [],
          enemy_waves: [enemyWave, { ...enemyWave, entity_id: 'alien_two' }]
        }
      })
    ).toThrow();

    expect(() =>
      NormalizedGameIrSchema.parse({
        ...createIrForGenre('collector', collectorContract),
        runtime_plan: {
          spawn_rules: [],
          enemy_waves: [enemyWave]
        }
      })
    ).toThrow();
  });

  it('rejects non-dodger normalized IR with spawn rules in runtime plan v0', () => {
    const collectorIr = createIrForGenre('collector', collectorContract);
    const shooterIr = createIrForGenre('shooter', shooterContract);
    const spawnRule = {
      entity_id: 'obstacle',
      entity_kind: 'hazard',
      strategy: 'right_edge_wave',
      count: 5,
      max_active: 3,
      interval_ms: 700
    };

    expect(() =>
      NormalizedGameIrSchema.parse({
        ...collectorIr,
        runtime_plan: { spawn_rules: [spawnRule] }
      })
    ).toThrow();

    expect(() =>
      NormalizedGameIrSchema.parse({
        ...shooterIr,
        runtime_plan: { spawn_rules: [spawnRule] }
      })
    ).toThrow();
  });

  it('rejects normalized IR when genre, template, telemetry, and QA contracts drift', () => {
    const validIr = createIrForGenre('collector', collectorContract);

    expect(() =>
      NormalizedGameIrSchema.parse({
        ...validIr,
        template_params: { template_id: 'shooter_v1', params: {} }
      })
    ).toThrow();

    expect(() =>
      NormalizedGameIrSchema.parse({
        ...validIr,
        qa_plan: {
          ...validIr.qa_plan,
          required_events_all: ['game.started']
        }
      })
    ).toThrow();

    expect(() =>
      NormalizedGameIrSchema.parse({
        ...validIr,
        telemetry_contract: {
          required_events_all: shooterContract.required_telemetry_all,
          required_events_any_groups: shooterContract.required_telemetry_any_groups
        },
        qa_plan: {
          ...validIr.qa_plan,
          required_events_all: shooterContract.required_telemetry_all,
          required_events_any_groups: shooterContract.required_telemetry_any_groups
        }
      })
    ).toThrow();
  });

  it('keeps genre contracts aligned with QA gate requirements', () => {
    expect(qaGate.genre_required_events.collector.all).toEqual(collectorContract.required_telemetry_all);
    expect(qaGate.genre_required_events.collector.any_groups).toEqual(collectorContract.required_telemetry_any_groups);
    expect(qaGate.genre_required_events.dodger.all).toEqual(dodgerContract.required_telemetry_all);
    expect(qaGate.genre_required_events.dodger.any_groups).toEqual(dodgerContract.required_telemetry_any_groups);
    expect(qaGate.genre_required_events.shooter.all).toEqual(shooterContract.required_telemetry_all);
    expect(qaGate.genre_required_events.shooter.any_groups).toEqual(shooterContract.required_telemetry_any_groups);
  });

  it('defines telemetry event schema for every contract event', () => {
    const allEvents = new Set([
      ...qaGate.common_required_events_all,
      ...collectorContract.required_telemetry_all,
      ...collectorContract.required_telemetry_any_groups.flat(),
      ...dodgerContract.required_telemetry_all,
      ...dodgerContract.required_telemetry_any_groups.flat(),
      ...shooterContract.required_telemetry_all,
      ...shooterContract.required_telemetry_any_groups.flat()
    ]);

    for (const type of allEvents) {
      expect(() => TelemetryEventSchema.parse({ type, timestamp_ms: 0, frame: 0 })).not.toThrow();
    }
  });

  it('allows optional shooter enemy fire telemetry without making it a QA gate requirement', () => {
    expect(() => TelemetryEventSchema.parse({ type: 'enemy.fired', timestamp_ms: 0, frame: 0 })).not.toThrow();
    expect(shooterContract.required_telemetry_all).not.toContain('enemy.fired');
  });

  it('freezes QA gate all and any_groups evaluation semantics', () => {
    const shooterGate = qaGate.genre_required_events.shooter;
    const observedWithScore = [...shooterGate.all, 'score.changed'];
    const observedWithEnemyCleared = [...shooterGate.all, 'enemy.cleared'];
    const observedWithoutAlternative = [...shooterGate.all];

    expect(satisfiesGate(observedWithScore, shooterGate.all, shooterGate.any_groups)).toBe(true);
    expect(satisfiesGate(observedWithEnemyCleared, shooterGate.all, shooterGate.any_groups)).toBe(true);
    expect(satisfiesGate(observedWithoutAlternative, shooterGate.all, shooterGate.any_groups)).toBe(false);

    const dodgerGate = qaGate.genre_required_events.dodger;
    const onlyFirstDodgerGroup = [...dodgerGate.all, 'collision.detected'];
    const bothDodgerGroups = [...dodgerGate.all, 'collision.detected', 'game.lost'];

    expect(satisfiesGate(onlyFirstDodgerGroup, dodgerGate.all, dodgerGate.any_groups)).toBe(false);
    expect(satisfiesGate(bothDodgerGroups, dodgerGate.all, dodgerGate.any_groups)).toBe(true);
  });

  it('freezes Phaser capability and template manifest boundaries', () => {
    expect(phaserCapabilities.supports.telemetry).toBe(true);
    expect(phaserCapabilities.unsupported).toContain('network_multiplayer');

    for (const manifest of [collectorManifest, dodgerManifest, shooterManifest]) {
      expect(manifest.runtime).toBe('phaser');
      expect(manifest.deterministic_qa).toBe(true);
      expect(manifest.required_systems).toEqual(requiredSystems);
    }
  });

  it('keeps contract, manifest, and capability structures explicit', () => {
    expect([collectorContract.genre, dodgerContract.genre, shooterContract.genre]).toEqual([
      'collector',
      'dodger',
      'shooter'
    ]);
    expect([collectorManifest.template_id, dodgerManifest.template_id, shooterManifest.template_id]).toEqual([
      'collector_v1',
      'dodger_v1',
      'shooter_v1'
    ]);
    expect([collectorManifest.genre, dodgerManifest.genre, shooterManifest.genre]).toEqual([
      'collector',
      'dodger',
      'shooter'
    ]);
    expect(phaserCapabilities.supports.actions).toEqual(['shoot_projectile', 'collect', 'restart']);
    expect(phaserCapabilities.supports.collision).toEqual(['overlap', 'projectile_hit']);
    expect(phaserCapabilities.supports.objectives).toContain('none');
    expect(phaserCapabilities.supports.objectives).toContain('time_up');
  });
});
