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
      restart: true
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
    ui: { hud: ['score', 'health', 'objective'], restart: true }
  };
}

type ContractTelemetry = {
  required_telemetry_all: string[];
  required_telemetry_any_groups: string[][];
};

type IrGenre = 'collector' | 'dodger' | 'shooter';

export function createIrForGenre(genre: IrGenre, contract: ContractTelemetry) {
  const templateIdByGenre = {
    collector: 'collector_v1',
    dodger: 'dodger_v1',
    shooter: 'shooter_v1'
  } as const;
  const objectivesByGenre = {
    collector: ['target_score', 'none'],
    dodger: ['survive_duration', 'player_health_zero'],
    shooter: ['enemy_cleared', 'player_health_zero']
  } as const;

  return {
    ir_version: 'game-ir-v0.1',
    source_dsl_version: 'game-dsl-v0.1',
    metadata: { title: 'Gem Run', language: 'en' },
    game: { genre, camera: 'top_down', difficulty: 'easy' },
    world: { width: 960, height: 540 },
    runtime_requirements: {
      dimension: '2d',
      camera: 'top_down',
      movement: ['eight_direction', 'static'],
      collision: ['overlap'],
      actions: ['collect', 'restart'],
      objectives: [...objectivesByGenre[genre]],
      telemetry: true
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
