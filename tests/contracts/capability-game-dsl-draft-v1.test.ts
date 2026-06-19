import { describe, expect, it } from 'vitest';

import {
  CapabilityGameDslDraftComposedSchemaIdentitySchema,
  CapabilityGameDslDraftV1Schema,
  buildCapabilityGameDslDraftComposedSchemaIdentity
} from '../../packages/game-dsl/src/index.js';

describe('CapabilityGameDslDraft v1 contract', () => {
  it('accepts a capability-backed draft with range duration, progression, waves, pickups, objectives and boss phases', () => {
    const draft = CapabilityGameDslDraftV1Schema.parse(createDraft());

    expect(draft.artifactKind).toBe('capability_game_dsl_draft');
    expect(draft.schemaVersion).toBe('capability-game-dsl-draft.v1');
    expect(draft.play_time_intent).toEqual({ mode: 'range', min_sec: 480, max_sec: 720 });
    expect(draft.progression.estimated_total_sec).toEqual({ min_sec: 480, max_sec: 720 });
    expect(draft.progression.segments.map((segment) => segment.duration_target_sec)).toEqual([
      { min_sec: 160, max_sec: 240 },
      { min_sec: 160, max_sec: 240 },
      { min_sec: 160, max_sec: 240 }
    ]);
    expect(draft.waves).toHaveLength(3);
    expect(draft.pickups).toHaveLength(1);
    expect(draft.objectives).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'target_score', target: { score: 3800 } })]));
    expect(draft.bosses[0]?.phases).toHaveLength(2);
  });

  it('rejects drafts that collapse a range play-time intent into a shorter progression estimate', () => {
    const baseProgression = createDraft().progression;
    if (typeof baseProgression !== 'object' || baseProgression === null || Array.isArray(baseProgression)) {
      throw new Error('test fixture progression must be an object');
    }
    const draft = createDraft({
      progression: {
        ...baseProgression,
        estimated_total_sec: { min_sec: 120, max_sec: 120 }
      }
    });

    const result = CapabilityGameDslDraftV1Schema.safeParse(draft);

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['progression', 'estimated_total_sec'] })]));
  });

  it('rejects arbitrary script-like keys in capability-owned config', () => {
    const result = CapabilityGameDslDraftV1Schema.safeParse(
      createDraft({
        capability_configs: [
          {
            id: 'movement_config',
            capability_id: 'movement.run_jump.v1',
            applies_to: ['player'],
            config: { move_speed: 260, script: 'player.x += 1' }
          }
        ]
      })
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path.includes('script'))).toBe(true);
  });

  it('rejects trusted evidence fields that only the system may produce', () => {
    const result = CapabilityGameDslDraftV1Schema.safeParse(
      createDraft({
        capability_configs: [
          {
            id: 'fake_evidence_config',
            capability_id: 'telemetry.gameplay_events.v1',
            config: {
              capabilityLockHash: 'fnv1a_deadbeef',
              'runtime manifest hash': 'fnv1a_deadbeef',
              'trusted artifact refs': ['runtime-system-manifest.json']
            }
          }
        ]
      })
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining('cannot contain trusted evidence') })])
    );
  });

  it('rejects active runtime and cutover evidence claims from model-owned draft fields', () => {
    const result = CapabilityGameDslDraftV1Schema.safeParse(
      createDraft({
        capability_configs: [
          {
            id: 'fake_active_cutover',
            capability_id: 'telemetry.gameplay_events.v1',
            config: {
              activeRuntimeEvidence: true,
              canaryReady: true,
              buildStatus: 'passed',
              defaultCutoverAllowed: true,
              moduleLoadStatus: 'passed',
              qaStatus: 'passed',
              rollbackPassed: true
            }
          }
        ]
      })
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining('cannot contain trusted evidence') })])
    );
  });

  it('requires capability-owned references to be declared by the draft capability list', () => {
    const result = CapabilityGameDslDraftV1Schema.safeParse(
      createDraft({
        capabilities: createCapabilityIds().filter((capabilityId) => capabilityId !== 'combat.projectile.v1')
      })
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: 'Capability combat.projectile.v1 is referenced but not declared in capabilities.' })])
    );
  });

  it('rejects duplicate capability declarations before composing schema identity', () => {
    const result = CapabilityGameDslDraftV1Schema.safeParse(
      createDraft({
        capabilities: [...createCapabilityIds(), 'movement.run_jump.v1']
      })
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['capabilities', 14] })]));
  });

  it('rejects disconnected local references before canonical normalization', () => {
    const result = CapabilityGameDslDraftV1Schema.safeParse(
      createDraft({
        capability_configs: [
          {
            id: 'broken_applies_to',
            capability_id: 'movement.run_jump.v1',
            applies_to: ['missing_entity'],
            config: { move_speed: 260, jump_velocity: 520 }
          }
        ],
        waves: [{ id: 'broken_wave', segment_id: 'missing_segment', enemy_entity_id: 'weapon_pickup', count: 1, spawn: { x: 0, y: 0 } }],
        pickups: [{ id: 'broken_pickup', segment_id: 'approach', pickup_entity_id: 'rifle_soldier' }],
        bosses: [
          {
            id: 'broken_boss',
            boss_entity_id: 'rifle_soldier',
            segment_refs: ['missing_segment'],
            phases: [{ id: 'broken_phase', order: 0, health_threshold_pct: 100, pattern: { attack: 'slow_burst' } }]
          }
        ]
      })
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ['waves', 0, 'segment_id'] }),
        expect.objectContaining({ path: ['waves', 0, 'enemy_entity_id'] }),
        expect.objectContaining({ path: ['pickups', 0, 'pickup_entity_id'] }),
        expect.objectContaining({ path: ['bosses', 0, 'boss_entity_id'] }),
        expect.objectContaining({ path: ['bosses', 0, 'segment_refs', 0] }),
        expect.objectContaining({ path: ['capability_configs', 0, 'applies_to', 0] })
      ])
    );
  });

  it('builds a deterministic system-owned composed schema identity outside the model draft', () => {
    const first = buildCapabilityGameDslDraftComposedSchemaIdentity({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityIds: ['movement.run_jump.v1', 'combat.projectile.v1', 'movement.run_jump.v1']
    });
    const second = buildCapabilityGameDslDraftComposedSchemaIdentity({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityIds: ['combat.projectile.v1', 'movement.run_jump.v1']
    });

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      artifactKind: 'composed_game_dsl_schema',
      schemaVersion: 'composed-game-dsl-schema.v1',
      draftSchemaVersion: 'capability-game-dsl-draft.v1',
      capabilityIds: ['combat.projectile.v1', 'movement.run_jump.v1']
    });
    expect(first.schemaHash).toMatch(/^fnv1a_[a-f0-9]{8}$/);
  });

  it('keeps composed schema identity capability IDs sorted', () => {
    const identity = buildCapabilityGameDslDraftComposedSchemaIdentity({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityIds: ['combat.projectile.v1', 'movement.run_jump.v1']
    });
    const result = CapabilityGameDslDraftComposedSchemaIdentitySchema.safeParse({
      ...identity,
      capabilityIds: [...identity.capabilityIds].reverse()
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['capabilityIds'] })]));
  });

  it('rejects composed schema identity artifacts with a stale schema hash', () => {
    const identity = buildCapabilityGameDslDraftComposedSchemaIdentity({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityIds: ['combat.projectile.v1', 'movement.run_jump.v1']
    });
    const result = CapabilityGameDslDraftComposedSchemaIdentitySchema.safeParse({
      ...identity,
      schemaHash: 'fnv1a_deadbeef'
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['schemaHash'] })]));
  });
});

function createCapabilityIds(): string[] {
  return [
    'asset.sprite_binding.v1',
    'camera.side_follow.v1',
    'collision.platform.v1',
    'combat.projectile.v1',
    'goal.destroy_target.v1',
    'health.damage_invulnerability.v1',
    'movement.run_jump.v1',
    'physics.gravity_platformer.v1',
    'pickup.drop_collect.v1',
    'rules.restart_loop.v1',
    'scene.parallax_background.v1',
    'spawn.static.v1',
    'telemetry.gameplay_events.v1',
    'weapon.cooldown.v1'
  ];
}

function createDraft(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    artifactKind: 'capability_game_dsl_draft',
    schemaVersion: 'capability-game-dsl-draft.v1',
    profile: { id: 'side_scrolling_run_and_gun.v1' },
    play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 },
    capabilities: createCapabilityIds(),
    progression: {
      estimated_total_sec: { min_sec: 480, max_sec: 720 },
      segments: [
        {
          id: 'approach',
          order: 0,
          label: 'Forest approach',
          duration_target_sec: { min_sec: 160, max_sec: 240 },
          capability_refs: ['movement.run_jump.v1', 'collision.platform.v1', 'spawn.static.v1']
        },
        {
          id: 'base_assault',
          order: 1,
          duration_target_sec: { min_sec: 160, max_sec: 240 },
          capability_refs: ['combat.projectile.v1', 'weapon.cooldown.v1', 'pickup.drop_collect.v1']
        },
        {
          id: 'core_boss',
          order: 2,
          duration_target_sec: { min_sec: 160, max_sec: 240 },
          capability_refs: ['goal.destroy_target.v1', 'telemetry.gameplay_events.v1']
        }
      ]
    },
    scenes: [
      {
        id: 'main_scene',
        segment_refs: ['approach', 'base_assault', 'core_boss'],
        entity_refs: ['player', 'rifle_soldier', 'energy_core', 'weapon_pickup'],
        capability_refs: ['camera.side_follow.v1', 'scene.parallax_background.v1']
      }
    ],
    entities: [
      {
        id: 'player',
        role: 'player',
        label: 'Raider',
        capability_refs: ['movement.run_jump.v1', 'health.damage_invulnerability.v1', 'combat.projectile.v1']
      },
      {
        id: 'rifle_soldier',
        role: 'enemy',
        label: 'Rifle soldier',
        capability_refs: ['spawn.static.v1', 'combat.projectile.v1']
      },
      {
        id: 'player_projectile',
        role: 'projectile',
        capability_refs: ['combat.projectile.v1']
      },
      {
        id: 'weapon_pickup',
        role: 'pickup',
        capability_refs: ['pickup.drop_collect.v1']
      },
      {
        id: 'energy_core',
        role: 'boss',
        capability_refs: ['goal.destroy_target.v1', 'combat.projectile.v1']
      }
    ],
    behaviors: [
      {
        id: 'enemy_fires',
        owner_entity_id: 'rifle_soldier',
        capability_id: 'combat.projectile.v1',
        trigger: { event: 'player.in_range', cooldown_ms: 1400 },
        config: { projectile_entity_id: 'enemy_projectile', speed: 260 }
      }
    ],
    waves: [
      { id: 'wave_approach', segment_id: 'approach', enemy_entity_id: 'rifle_soldier', count: 4, spawn: { x: 720, y: 492 } },
      { id: 'wave_mid', segment_id: 'base_assault', enemy_entity_id: 'rifle_soldier', count: 6, spawn: { x: 1500, y: 492 } },
      { id: 'wave_core', segment_id: 'core_boss', enemy_entity_id: 'rifle_soldier', count: 5, spawn: { x: 2780, y: 492 } }
    ],
    pickups: [{ id: 'spread_pickup', segment_id: 'base_assault', pickup_entity_id: 'weapon_pickup', count: 1, spawn: { x: 1880, y: 440 } }],
    objectives: [
      {
        id: 'score_target',
        kind: 'target_score',
        target: { score: 3800 },
        success_condition: { event: 'score.reached', target_score: 3800 },
        capability_refs: ['goal.destroy_target.v1']
      }
    ],
    bosses: [
      {
        id: 'energy_core_boss',
        boss_entity_id: 'energy_core',
        segment_refs: ['core_boss'],
        phases: [
          { id: 'core_phase_one', order: 0, health_threshold_pct: 100, pattern: { attack: 'slow_burst' }, capability_refs: ['combat.projectile.v1'] },
          { id: 'core_phase_two', order: 1, health_threshold_pct: 50, pattern: { attack: 'wide_burst' }, capability_refs: ['combat.projectile.v1'] }
        ]
      }
    ],
    capability_configs: [
      {
        id: 'movement_config',
        capability_id: 'movement.run_jump.v1',
        applies_to: ['player'],
        config: { move_speed: 260, jump_velocity: 520 }
      }
    ],
    metadata: { title: 'Reference run-and-gun draft' },
    ...overrides
  };
}
