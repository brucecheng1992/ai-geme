export function createCollectorRawDsl() {
  return {
    dsl_version: 'game-dsl-v0.1',
    metadata: {
      title: 'Gem Run',
      description: 'Collect gems before time runs out.',
      language: 'en'
    },
    game: {
      genre: 'collector',
      camera: 'top_down',
      difficulty: 'easy',
      target_play_time_sec: 60
    },
    world: {
      width: 960,
      height: 540,
      visual_theme: 'neon garden'
    },
    player: {
      id: 'player',
      label: 'Hero',
      movement: {
        type: 'eight_direction',
        speed_px_per_sec: 240
      },
      actions: [{ id: 'collect', type: 'collect' }]
    },
    entities: [
      {
        id: 'gem',
        kind: 'collectible',
        label: 'Gem',
        count: 8,
        movement: { type: 'static' }
      }
    ],
    rules: {
      collisions: [
        {
          id: 'collect_gem',
          source: 'player',
          target: 'gem',
          type: 'overlap',
          effects: [
            { type: 'score_add', value: 1 },
            { type: 'destroy' }
          ]
        }
      ]
    },
    objectives: {
      win: { type: 'target_score', target: 8 },
      lose: { type: 'none' }
    },
    ui: {
      hud: ['score', 'objective'],
      restart: true,
      screens: {
        win: { title: 'VICTORY', subtitle: 'All gems collected' },
        lose: { title: 'DEFEAT', subtitle: 'Try again' }
      }
    }
  };
}

export function createDodgerRawDsl() {
  return {
    dsl_version: 'game-dsl-v0.1',
    metadata: {
      title: 'Road Run',
      description: 'Survive traffic while picking up coins.',
      language: 'en'
    },
    game: {
      genre: 'dodger',
      camera: 'top_down',
      difficulty: 'normal',
      target_play_time_sec: 60
    },
    world: {
      width: 960,
      height: 540,
      visual_theme: 'urban street'
    },
    player: {
      id: 'player',
      label: 'Runner',
      health: 3,
      movement: {
        type: 'horizontal',
        speed_px_per_sec: 300
      },
      actions: [{ id: 'collect', type: 'collect' }]
    },
    entities: [
      {
        id: 'coin',
        kind: 'collectible',
        label: 'Coin',
        count: 10,
        movement: { type: 'static' },
        spawn: { strategy: 'fixed_positions', max_active: 2, interval_ms: 900 }
      },
      {
        id: 'obstacle',
        kind: 'hazard',
        label: 'Obstacle',
        count: 5,
        movement: { type: 'fall_down' },
        spawn: { strategy: 'right_edge_wave', max_active: 3, interval_ms: 700, lane_count: 3 }
      }
    ],
    rules: {
      collisions: [
        {
          id: 'collect_coin',
          source: 'player',
          target: 'coin',
          type: 'overlap',
          effects: [{ type: 'score_add', value: 1 }, { type: 'destroy' }]
        },
        {
          id: 'hit_obstacle',
          source: 'player',
          target: 'obstacle',
          type: 'overlap',
          effects: [{ type: 'damage', value: 1 }, { type: 'destroy' }]
        }
      ]
    },
    objectives: {
      win: { type: 'survive_duration' },
      lose: { type: 'player_health_zero' }
    },
    ui: {
      hud: ['score', 'health', 'timer'],
      restart: true,
      screens: {
        win: { title: 'VICTORY', subtitle: 'Survived the timer' },
        lose: { title: 'DEFEAT', subtitle: 'Health depleted' }
      }
    }
  };
}

export function createShooterRawDsl() {
  return {
    dsl_version: 'game-dsl-v0.1',
    metadata: { title: 'Alien Clear', description: 'Clear enemies with projectiles.', language: 'en' },
    game: { genre: 'shooter', camera: 'top_down', difficulty: 'normal', target_play_time_sec: 90 },
    world: { width: 960, height: 540, visual_theme: 'neon arena' },
    player: {
      id: 'player',
      label: 'Cat',
      health: 3,
      movement: { type: 'eight_direction', speed_px_per_sec: 260 },
      actions: [{ id: 'fire', type: 'shoot_projectile', cooldown_ms: 300, spawns: 'bolt' }]
    },
    entities: [
      { id: 'bolt', kind: 'projectile', label: 'Bolt', damage: 1, movement: { type: 'move_right', speed_px_per_sec: 520 } },
      { id: 'alien', kind: 'enemy', label: 'Alien', count: 6, health: 1, movement: { type: 'chase_player', speed_px_per_sec: 120 } }
    ],
    rules: {
      collisions: [
        {
          id: 'bolt_hits_alien',
          source: 'bolt',
          target: 'alien',
          type: 'projectile_hit',
          effects: [{ type: 'damage', value: 1 }, { type: 'destroy' }, { type: 'score_add', value: 1 }]
        }
      ]
    },
    objectives: { win: { type: 'enemy_cleared', target: 6 }, lose: { type: 'player_health_zero' } },
    ui: {
      hud: ['score', 'health', 'objective'],
      restart: true,
      screens: {
        win: { title: 'VICTORY', subtitle: 'Enemies cleared' },
        lose: { title: 'DEFEAT', subtitle: 'Health depleted' }
      }
    }
  };
}

export function createSideScrollingRunAndGunRawDsl() {
  return {
    dsl_version: 'game-dsl-v0.1',
    metadata: {
      title: 'Frontier Blast',
      description: 'Run, jump, and shoot through generic side-view platform segments.',
      language: 'en'
    },
    game: { genre: 'side_scrolling_run_and_gun', camera: 'side_view', difficulty: 'normal', target_play_time_sec: 60 },
    world: {
      width: 1280,
      height: 540,
      visual_theme: 'generic alien frontier',
      coordinateSystem: 'side_view_2d',
      gravity: 1200
    },
    camera: { mode: 'follow_player_x' },
    player: {
      id: 'player',
      label: 'Runner',
      health: 3,
      movement: { type: 'horizontal', speed_px_per_sec: 260 },
      controller: 'run_jump_shoot',
      aiming: { mode: 'multi_direction' },
      actions: [{ id: 'fire', type: 'shoot_projectile', cooldown_ms: 260, spawns: 'pulse_bolt' }]
    },
    entities: [
      { id: 'pulse_bolt', kind: 'projectile', label: 'Pulse Bolt', damage: 1, movement: { type: 'move_right', speed_px_per_sec: 620 } },
      { id: 'drone', kind: 'enemy', label: 'Alien Drone', count: 8, health: 1, movement: { type: 'patrol', speed_px_per_sec: 90 } }
    ],
    projectiles: [{ id: 'pulse_bolt_spec', label: 'Pulse Bolt', damage: 1, speed_px_per_sec: 620 }],
    enemyTypes: [{ id: 'drone_type', label: 'Alien Drone', health: 1, movement: { type: 'patrol', speed_px_per_sec: 90 } }],
    level: {
      segments: [
        { id: 'segment_intro', startX: 0, endX: 720 },
        { id: 'segment_bridge', startX: 720, endX: 1280 }
      ],
      terrain: [
        { id: 'ground_intro', kind: 'ground', x: 0, y: 500, width: 1280, height: 40 },
        { id: 'platform_bridge', kind: 'platform', x: 980, y: 380, width: 280, height: 24 }
      ],
      spawns: [
        { id: 'spawn_intro_drone', enemyType: 'drone_type', trigger: 'enter_segment', x: 640, count: 3 },
        { id: 'spawn_bridge_drone', enemyType: 'drone_type', trigger: 'reach_x', x: 1080, count: 5 }
      ]
    },
    pickups: [{ id: 'field_medkit', label: 'Medkit', kind: 'health', x: 720, y: 450 }],
    winLose: { win: 'reach_exit', lose: 'player_health_zero', lives: 3, checkpoints: [0, 720] },
    rules: {
      collisions: [
        {
          id: 'bolt_hits_drone',
          source: 'pulse_bolt',
          target: 'drone',
          type: 'projectile_hit',
          effects: [{ type: 'damage', value: 1 }, { type: 'destroy' }, { type: 'score_add', value: 1 }]
        },
        {
          id: 'drone_hits_player',
          source: 'drone',
          target: 'player',
          type: 'overlap',
          effects: [{ type: 'damage', value: 1 }]
        }
      ]
    },
    objectives: { win: { type: 'reach_exit', target: 1240 }, lose: { type: 'player_health_zero' } },
    ui: {
      hud: ['score', 'health', 'objective'],
      restart: true,
      screens: {
        win: { title: 'VICTORY', subtitle: 'Exit reached' },
        lose: { title: 'DEFEAT', subtitle: 'Lives depleted' }
      }
    }
  };
}

type ContractTelemetry = {
  required_telemetry_all: string[];
  required_telemetry_any_groups: string[][];
};

type IrGenre = 'collector' | 'dodger' | 'shooter' | 'side_scrolling_run_and_gun';

export function createIrForGenre(genre: IrGenre, contract: ContractTelemetry) {
  const templateIdByGenre = {
    collector: 'collector_v1',
    dodger: 'dodger_v1',
    shooter: 'shooter_v1',
    side_scrolling_run_and_gun: 'side_scrolling_run_and_gun.v1'
  } as const;
  const objectivesByGenre = {
    collector: ['target_score', 'none'],
    dodger: ['survive_duration', 'player_health_zero'],
    shooter: ['enemy_cleared', 'player_health_zero'],
    side_scrolling_run_and_gun: ['reach_exit', 'player_health_zero']
  } as const;
  const cameraByGenre = {
    collector: 'top_down',
    dodger: 'top_down',
    shooter: 'top_down',
    side_scrolling_run_and_gun: 'side_view'
  } as const;

  const worldByGenre = {
    collector: { width: 960, height: 540 },
    dodger: { width: 960, height: 540 },
    shooter: { width: 960, height: 540 },
    side_scrolling_run_and_gun: { width: 1280, height: 540 }
  } as const;

  return {
    ir_version: 'game-ir-v0.1',
    source_dsl_version: 'game-dsl-v0.1',
    metadata: { title: 'Gem Run', language: 'en' },
    game: { genre, camera: cameraByGenre[genre], difficulty: 'easy' },
    world: worldByGenre[genre],
    runtime_requirements: {
      dimension: '2d',
      camera: cameraByGenre[genre],
      movement: genre === 'side_scrolling_run_and_gun' ? ['horizontal', 'run_jump_controller', 'multi_direction'] : ['eight_direction', 'static'],
      collision: genre === 'side_scrolling_run_and_gun' ? ['overlap', 'projectile_hit'] : ['overlap'],
      actions: genre === 'side_scrolling_run_and_gun' ? ['shoot_projectile', 'restart'] : ['collect', 'restart'],
      objectives: [...objectivesByGenre[genre]],
      capabilities: genre === 'side_scrolling_run_and_gun' ? ['side_view_camera'] : [],
      telemetry: true
    },
    runtime_plan: {
      spawn_rules: [],
      ...(genre === 'side_scrolling_run_and_gun' ? { side_scrolling: createSideScrollingRunAndGunRuntimePlan() } : {})
    },
    template_params: {
      template_id: templateIdByGenre[genre],
      params: {}
    },
    telemetry_contract: {
      required_events_all: contract.required_telemetry_all,
      required_events_any_groups: contract.required_telemetry_any_groups
    },
    qa_plan: {
      mode: 'deterministic',
      seed: 'golden',
      required_events_all: contract.required_telemetry_all,
      required_events_any_groups: contract.required_telemetry_any_groups
    }
  };
}

function createSideScrollingRunAndGunRuntimePlan() {
  return {
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
    platforms: [
      { id: 'ground_intro', kind: 'ground', x: 0, y: 500, width: 1280, height: 40 },
      { id: 'platform_bridge', kind: 'platform', x: 980, y: 380, width: 280, height: 24 }
    ],
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
  };
}

export function satisfiesGate(
  observedEvents: string[],
  requiredEventsAll: string[],
  requiredEventsAnyGroups: string[][]
) {
  const observed = new Set(observedEvents);

  return (
    requiredEventsAll.every((event) => observed.has(event)) &&
    requiredEventsAnyGroups.every((group) => group.some((event) => observed.has(event)))
  );
}
