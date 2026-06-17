import { describe, expect, it } from 'vitest';
import collectorContract from '../../packages/game-dsl/src/contracts/collector.contract.json' with { type: 'json' };
import shooterContract from '../../packages/game-dsl/src/contracts/shooter.contract.json' with { type: 'json' };
import sideScrollingRunAndGunContract from '../../packages/game-dsl/src/contracts/side_scrolling_run_and_gun.contract.json' with { type: 'json' };
import {
  buildGameDslArtifact,
  DslValidationError,
  normalizeRawGameDsl,
  validateAndNormalizeRawGameDsl,
  validateRawGameDsl
} from '../../packages/game-dsl/src/index.js';
import { createCollectorRawDsl, createDodgerRawDsl, createShooterRawDsl, createSideScrollingRunAndGunRawDsl } from './fixtures.js';

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

  it('accepts structured feedback and audio DSL contracts without changing normalized runtime requirements', () => {
    const rawDsl = createShooterRawDsl();
    const baseline = validateAndNormalizeRawGameDsl(rawDsl);
    const result = validateAndNormalizeRawGameDsl({
      ...rawDsl,
      player: {
        ...rawDsl.player,
        invulnerabilityFrames: {
          durationMs: 1200,
          flashEnabled: true
        }
      },
      feedback: {
        cameraShake: {
          enabled: true,
          intensity: 0.5,
          durationMs: 500
        },
        hitFlash: {
          enabled: true,
          durationMs: 900,
          flashCount: 6
        }
      },
      effects: {
        explosion: {
          enabled: true,
          scale: 1.5,
          durationMs: 800,
          audioEvent: 'explosion',
          cameraShake: {
            enabled: true,
            intensity: 0.35,
            durationMs: 300
          }
        }
      },
      audio: {
        events: {
          warning: {
            assetRef: 'asset:warning_sfx',
            volume: 0.85,
            enabled: true
          },
          explosion: {
            volume: 0.7,
            enabled: true
          }
        }
      },
      ui: {
        ...rawDsl.ui,
        warningBanner: {
          enabled: true,
          text: 'WARNING',
          durationMs: 1200
        }
      }
    });

    expect(baseline.ok).toBe(true);
    expect(result.ok).toBe(true);
    if (!baseline.ok || !result.ok) {
      throw new Error('expected feedback/audio DSL contract to validate');
    }

    expect(result.rawDsl.feedback?.cameraShake?.intensity).toBe(0.5);
    expect(result.rawDsl.audio?.events.warning?.assetRef).toBe('asset:warning_sfx');
    expect(result.rawDsl.effects?.explosion?.audioEvent).toBe('explosion');
    expect(result.rawDsl.player.invulnerabilityFrames?.durationMs).toBe(1200);
    expect(result.rawDsl.ui.warningBanner?.text).toBe('WARNING');
    expect(result.ir.runtime_requirements).toEqual(baseline.ir.runtime_requirements);
    expect(result.ir.runtime_plan).toEqual(baseline.ir.runtime_plan);
  });

  it('rejects invalid feedback and audio DSL contract boundaries', () => {
    const rawDsl = createShooterRawDsl();

    expectIssue(
      validateRawGameDsl({
        ...rawDsl,
        feedback: {
          cameraShake: {
            enabled: true,
            intensity: 1.5,
            durationMs: 500
          }
        }
      }),
      'NUMERIC_RANGE_INVALID',
      'Too big'
    );
    expectIssue(
      validateRawGameDsl({
        ...rawDsl,
        audio: {
          events: {
            warning: {
              volume: 1.2,
              enabled: true
            }
          }
        }
      }),
      'NUMERIC_RANGE_INVALID',
      'Too big'
    );
    expectIssue(
      validateRawGameDsl({
        ...rawDsl,
        audio: {
          events: {
            screenShake: {
              volume: 0.8,
              enabled: true
            }
          }
        }
      }),
      'SCHEMA_VALIDATION_FAILED'
    );
    expectIssue(
      validateRawGameDsl({
        ...rawDsl,
        effects: {
          explosion: {
            enabled: true,
            scale: 0,
            durationMs: 500
          }
        }
      }),
      'NUMERIC_RANGE_INVALID'
    );
  });

  it('accepts structured boss DSL contracts without changing normalized runtime requirements', () => {
    const rawDsl = createSideScrollingRunAndGunRawDsl();
    const baseline = validateAndNormalizeRawGameDsl(rawDsl);
    const result = validateAndNormalizeRawGameDsl({
      ...rawDsl,
      bosses: {
        items: [
          {
            id: 'boss_alpha',
            label: 'Sentinel Boss',
            health: 30,
            movement: { type: 'patrol', speed_px_per_sec: 80 },
            healthBar: { enabled: true },
            phases: [
              { healthThresholdPct: 100, attacks: ['spread_shot'] },
              { healthThresholdPct: 50, attacks: ['charge', 'laser_burst'] }
            ],
            intro: { warningEnabled: true, warningText: 'WARNING', audioEvent: 'bossIntro' },
            defeat: { explosionEffect: true, audioEvent: 'bossDefeated' }
          }
        ]
      }
    });

    expect(baseline.ok).toBe(true);
    expect(result.ok).toBe(true);
    if (!baseline.ok || !result.ok) {
      throw new Error('expected boss DSL contract to validate');
    }

    expect(result.rawDsl.bosses?.items[0]).toMatchObject({
      id: 'boss_alpha',
      health: 30,
      healthBar: { enabled: true },
      intro: { warningEnabled: true },
      defeat: { explosionEffect: true }
    });
    expect(result.ir.runtime_requirements).toEqual(baseline.ir.runtime_requirements);
    expect(result.ir.runtime_plan).toEqual(baseline.ir.runtime_plan);

    const artifact = buildGameDslArtifact({
      rawDsl: result.rawDsl,
      runId: 'run_boss_contract',
      intentPlan: { normalizedGenre: 'side_scrolling_run_and_gun' }
    });
    expect(artifact.bosses?.boss_alpha).toMatchObject({
      id: 'boss_alpha',
      label: 'Sentinel Boss',
      health: { max: 30 },
      physics: { speed: 80 },
      phases: 2
    });
  });

  it('rejects invalid boss DSL contract boundaries', () => {
    const rawDsl = createSideScrollingRunAndGunRawDsl();

    expectIssue(
      validateRawGameDsl({
        ...rawDsl,
        bosses: {
          items: [
            {
              id: 'boss_alpha',
              label: 'Sentinel Boss',
              health: 0,
              movement: { type: 'patrol', speed_px_per_sec: 80 },
              phases: [{ healthThresholdPct: 100, attacks: ['spread_shot'] }]
            }
          ]
        }
      }),
      'NUMERIC_RANGE_INVALID'
    );
    expectIssue(
      validateRawGameDsl({
        ...rawDsl,
        bosses: {
          items: [
            {
              id: 'boss_alpha',
              label: 'Sentinel Boss',
              health: 30,
              movement: { type: 'patrol', speed_px_per_sec: 80 },
              phases: [{ healthThresholdPct: 100, attacks: ['teleport_script'] }]
            }
          ]
        }
      }),
      'SCHEMA_VALIDATION_FAILED'
    );
    expectIssue(
      validateRawGameDsl({
        ...rawDsl,
        bosses: {
          items: [
            {
              id: 'boss_alpha',
              label: 'Sentinel Boss',
              health: 30,
              movement: { type: 'patrol', speed_px_per_sec: 80 },
              phases: [{ healthThresholdPct: 100, attacks: ['spread_shot'], timeline: 'phase script' }]
            }
          ]
        }
      }),
      'SCHEMA_VALIDATION_FAILED'
    );
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

  it('derives conservative default semantic model for generic shooter actors', () => {
    const shooterDsl = {
      ...createShooterRawDsl(),
      player: {
        ...createShooterRawDsl().player,
        label: 'Pilot',
        actions: [{ id: 'fire', type: 'shoot_projectile', cooldown_ms: 300, spawns: 'round' }]
      },
      entities: [
        { id: 'round', kind: 'projectile', label: 'Round', damage: 1, movement: { type: 'move_right', speed_px_per_sec: 520 } },
        { id: 'raider', kind: 'enemy', label: 'Raider', count: 6, health: 1, movement: { type: 'chase_player', speed_px_per_sec: 120 } }
      ],
      rules: {
        collisions: [
          {
            id: 'round_hits_raider',
            source: 'round',
            target: 'raider',
            type: 'projectile_hit',
            effects: [{ type: 'damage', value: 1 }, { type: 'destroy' }, { type: 'score_add', value: 1 }]
          }
        ]
      }
    };

    const result = validateAndNormalizeRawGameDsl(shooterDsl);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ir.semanticModel?.entities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ entityId: 'player', role: 'player', concept: 'generic_actor', strictness: 'soft' }),
          expect.objectContaining({ entityId: 'raider', role: 'enemy', concept: 'generic_actor', strictness: 'soft' }),
          expect.objectContaining({ entityId: 'round', role: 'projectile', concept: 'bullet', strictness: 'medium' })
        ])
      );
      expect(result.ir.semanticModel?.entities.find((entity) => entity.entityId === 'player')?.concept).not.toBe('tank');
    }
  });

  it('derives known visual concepts without relying on broad themes', () => {
    for (const [label, concept] of [
      ['Human Hero', 'human_character'],
      ['Tank', 'tank'],
      ['Cat', 'cat']
    ] as const) {
      const result = validateAndNormalizeRawGameDsl({
        ...createShooterRawDsl(),
        player: { ...createShooterRawDsl().player, label }
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.ir.semanticModel?.entities.find((entity) => entity.entityId === 'player')?.concept).toBe(concept);
        expect(result.ir.semanticModel?.entities.find((entity) => entity.entityId === 'alien')?.concept).toBe('alien');
      }
    }
  });

  it('preserves explicit DSL semanticModel into normalized IR', () => {
    const semanticModel = {
      schemaVersion: 'game-semantic-model-v0.1',
      entities: [
        {
          entityId: 'player',
          role: 'player',
          concept: 'human_character',
          tags: ['human', 'person', 'hero'],
          strictness: 'hard',
          source: 'model_explicit',
          sourcePaths: ['semanticModel.entities.0']
        }
      ]
    };

    const result = validateAndNormalizeRawGameDsl({ ...createShooterRawDsl(), semanticModel });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ir.semanticModel).toEqual(semanticModel);
    }
  });

  it('rejects semanticModel profiles that do not reference a DSL entity', () => {
    const result = validateRawGameDsl({
      ...createShooterRawDsl(),
      semanticModel: {
        schemaVersion: 'game-semantic-model-v0.1',
        entities: [
          {
            entityId: 'missing_actor',
            role: 'player',
            concept: 'generic_actor',
            tags: ['generic_actor'],
            strictness: 'soft',
            source: 'model_explicit',
            sourcePaths: ['semanticModel.entities.0']
          }
        ]
      }
    });

    expectIssue(result, 'UNRESOLVED_REFERENCE', 'missing_actor');
  });

  it('rejects semanticModel roles that do not match the referenced DSL entity kind', () => {
    const result = validateRawGameDsl({
      ...createShooterRawDsl(),
      semanticModel: {
        schemaVersion: 'game-semantic-model-v0.1',
        entities: [
          {
            entityId: 'bolt',
            role: 'enemy',
            concept: 'alien',
            tags: ['alien'],
            strictness: 'hard',
            source: 'model_explicit',
            sourcePaths: ['semanticModel.entities.0']
          }
        ]
      }
    });

    expectIssue(result, 'INVALID_GAME_SEMANTICS', 'must be "projectile"');
  });

  it('normalizes generic side-scrolling run-and-gun DSL without downgrading to top_down shooter', () => {
    const result = validateAndNormalizeRawGameDsl(createSideScrollingRunAndGunRawDsl());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rawDsl.game.genre).toBe('side_scrolling_run_and_gun');
      expect(result.rawDsl.world.coordinateSystem).toBe('side_view_2d');
      expect(result.rawDsl.world.gravity).toBeGreaterThan(0);
      expect(result.rawDsl.world.width).toBeGreaterThan(960);
      expect(result.rawDsl.world.height).toBeGreaterThanOrEqual(540);
      expect(result.rawDsl.player.controller).toBe('run_jump_shoot');
      expect(['multi_direction', 'eight_direction']).toContain(result.rawDsl.player.aiming?.mode);
      expect(result.rawDsl.level?.terrain.some((terrain) => terrain.kind === 'platform' || terrain.kind === 'ground')).toBe(true);
      expect(result.rawDsl.level?.spawns.length).toBeGreaterThan(0);
      expect(result.rawDsl.objectives.win.target).toBeLessThanOrEqual(result.rawDsl.world.width);
      expect((result.rawDsl.player as Record<string, unknown>).spawn).toBeUndefined();
      expect((result.rawDsl.player as Record<string, unknown>).jumpVelocity).toBeUndefined();
      expect((result.rawDsl.player as Record<string, unknown>).weapon).toBeUndefined();
      expect(JSON.stringify(result.rawDsl).toLowerCase()).not.toContain('contra');
      expect(JSON.stringify(result.rawDsl)).not.toContain('魂斗罗');
      expect(result.ir).toMatchObject({
        game: { genre: 'side_scrolling_run_and_gun', camera: 'side_view' },
        template_params: { template_id: 'side_scrolling_run_and_gun.v1' },
        telemetry_contract: {
          required_events_all: sideScrollingRunAndGunContract.required_telemetry_all,
          required_events_any_groups: sideScrollingRunAndGunContract.required_telemetry_any_groups
        },
        runtime_requirements: {
          camera: 'side_view',
          capabilities: expect.arrayContaining([
            'side_view_camera',
            'gravity_platformer_physics',
            'run_jump_controller',
            'multi_direction_shooting',
            'projectile_combat',
            'enemy_spawn_triggers',
            'terrain_collision',
            'checkpoint_or_lives_system'
          ])
        }
      });
      expect(result.ir.runtime_plan.side_scrolling).toMatchObject({
        scene: {
          viewport: { width: 960, height: 540 },
          world: { width: 1280, height: 540, gravityY: 1200 }
        },
        camera: {
          mode: 'side_follow',
          followTarget: 'player',
          bounds: { x: 0, y: 0, width: 1280, height: 540 }
        },
        physics: {
          mode: 'gravity_platformer',
          colliders: [
            ['player', 'platforms'],
            ['enemies', 'platforms'],
            ['projectiles', 'platforms']
          ],
          overlaps: [
            ['playerProjectiles', 'enemies'],
            ['player', 'enemies'],
            ['player', 'pickups']
          ]
        },
        player: {
          entityId: 'player',
          spawn: { x: 120, y: 452 },
          speedPxPerSec: 260,
          jumpVelocity: -540,
          health: 3,
          lives: 3,
          fireCooldownMs: 260,
          projectileEntityId: 'pulse_bolt',
          projectileSpeedPxPerSec: 620,
          projectileDamage: 1
        },
        platforms: expect.arrayContaining([
          expect.objectContaining({ id: 'ground_intro', kind: 'ground', x: 0, y: 500, width: 1280, height: 40 }),
          expect.objectContaining({ id: 'platform_bridge', kind: 'platform', x: 980, y: 380, width: 280, height: 24 })
        ]),
        enemyDefinitions: [
          {
            id: 'drone_type',
            label: 'Alien Drone',
            health: 1,
            movement: { type: 'patrol', speedPxPerSec: 90 },
            firing: { projectileEntityId: 'pulse_bolt', cooldownMs: 1400, speedPxPerSec: 372, damage: 1, rangePx: 520 }
          }
        ],
        waves: [
          { id: 'spawn_intro_drone', enemyTypeId: 'drone_type', trigger: 'enter_segment', triggerX: 640, spawnX: 640, count: 3 },
          { id: 'spawn_bridge_drone', enemyTypeId: 'drone_type', trigger: 'reach_x', triggerX: 1080, spawnX: 1080, count: 5 }
        ],
        pickups: [{ id: 'field_medkit', kind: 'health', x: 720, y: 450 }],
        winCondition: { kind: 'reach_exit', targetX: 1240 },
        telemetry: { profile: 'side_scrolling_run_and_gun_smoke' }
      });
      expect(result.ir.template_params.params).toMatchObject({
        style: { visualTheme: 'generic alien frontier' },
        player: { sourceEntityId: 'player', label: 'Runner' },
        assetLabels: {
          enemy: { sourceEntityId: 'drone', label: 'Alien Drone' },
          projectile: { sourceEntityId: 'pulse_bolt', label: 'Pulse Bolt' },
          pickup: { sourceEntityId: 'field_medkit', label: 'Medkit' }
        }
      });
      for (const runtimeOwnedKey of ['side_scrolling', 'camera', 'projectiles', 'enemyTypes', 'level', 'pickups', 'winLose']) {
        expect(result.ir.template_params.params).not.toHaveProperty(runtimeOwnedKey);
      }
    }
  });

  it('rejects side-scrolling worlds and level content outside playable bounds', () => {
    const rawDsl = createSideScrollingRunAndGunRawDsl();

    expectIssue(
      validateRawGameDsl({
        ...rawDsl,
        world: { ...rawDsl.world, width: 960 }
      }),
      'NUMERIC_RANGE_INVALID',
      'greater than 960'
    );
    expectIssue(
      validateRawGameDsl({
        ...rawDsl,
        level: {
          ...rawDsl.level,
          segments: [rawDsl.level.segments[0], { ...rawDsl.level.segments[1], endX: 1400 }]
        }
      }),
      'NUMERIC_RANGE_INVALID',
      'level segment must stay within world width'
    );
    expectIssue(
      validateRawGameDsl({
        ...rawDsl,
        objectives: { ...rawDsl.objectives, win: { type: 'reach_exit', target: 1400 } }
      }),
      'NUMERIC_RANGE_INVALID',
      'reach_exit target must stay inside world width'
    );
  });

  it('rejects side-scrolling DSL without minimum playable terrain, movement, and checkpoint facts', () => {
    const rawDsl = createSideScrollingRunAndGunRawDsl();

    expectIssue(
      validateRawGameDsl({
        ...rawDsl,
        level: {
          ...rawDsl.level,
          terrain: rawDsl.level.terrain.map((terrain) => ({ ...terrain, kind: 'slope' as const }))
        }
      }),
      'SCHEMA_VALIDATION_FAILED',
      'ground or platform terrain'
    );
    expectIssue(
      validateRawGameDsl({
        ...rawDsl,
        player: {
          ...rawDsl.player,
          movement: { ...rawDsl.player.movement, speed_px_per_sec: 0 }
        }
      }),
      'NUMERIC_RANGE_INVALID',
      'positive player horizontal speed'
    );
    expectIssue(
      validateRawGameDsl({
        ...rawDsl,
        entities: rawDsl.entities.map((entity) =>
          entity.kind === 'projectile' ? { ...entity, movement: { ...entity.movement, speed_px_per_sec: 0 } } : entity
        )
      }),
      'SCHEMA_VALIDATION_FAILED',
      'fired projectile entity speed'
    );
    expectIssue(
      validateRawGameDsl({
        ...rawDsl,
        winLose: { win: 'reach_exit', lose: 'player_health_zero' }
      }),
      'SCHEMA_VALIDATION_FAILED',
      'winLose.lives or checkpoints'
    );
  });

  it('rejects side-scrolling invalid waves and unsupported win objectives', () => {
    const rawDsl = createSideScrollingRunAndGunRawDsl();

    expectIssue(
      validateRawGameDsl({
        ...rawDsl,
        level: {
          ...rawDsl.level,
          spawns: [{ ...rawDsl.level.spawns[0], enemyType: 'missing_drone_type' }]
        }
      }),
      'UNRESOLVED_REFERENCE',
      'missing_drone_type'
    );
    expectIssue(
      validateRawGameDsl({
        ...rawDsl,
        objectives: { ...rawDsl.objectives, win: { type: 'target_score', target: 8 } }
      }),
      'SCHEMA_VALIDATION_FAILED',
      'supports only reach_exit or enemy_cleared'
    );
    expectIssue(
      validateRawGameDsl({
        ...rawDsl,
        objectives: { ...rawDsl.objectives, win: { type: 'enemy_cleared', target: 8 } }
      }),
      'SCHEMA_VALIDATION_FAILED',
      'winLose.win must match objectives.win.type'
    );
  });

  it('rejects copyrighted source terms inside generic side-scrolling run-and-gun DSL', () => {
    expectIssue(
      validateRawGameDsl({
        ...createSideScrollingRunAndGunRawDsl(),
        metadata: { ...createSideScrollingRunAndGunRawDsl().metadata, title: '魂斗罗式 Mission' }
      }),
      'SCHEMA_VALIDATION_FAILED',
      'copyrighted source term'
    );
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
