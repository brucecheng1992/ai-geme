import type { RawGameDsl } from '../../../../packages/game-dsl/src/index.js';

export function createDeterministicRawGameDsl(idea: string, language: string): RawGameDsl {
  const dslLanguage = language === 'zh' ? 'zh' : 'en';
  return isShooterIdea(idea) ? createShooterRawDsl(dslLanguage) : createCollectorRawDsl(dslLanguage);
}

function isShooterIdea(idea: string): boolean {
  const normalized = idea.toLowerCase();
  return normalized.includes('射击') || normalized.includes('外星') || normalized.includes('shoot') || normalized.includes('alien');
}

function createShooterRawDsl(language: 'zh' | 'en'): RawGameDsl {
  return {
    dsl_version: 'game-dsl-v0.1',
    metadata: { title: 'Cat vs Aliens', description: 'A small cat shoots aliens in a neon arena.', language },
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

function createCollectorRawDsl(language: 'zh' | 'en'): RawGameDsl {
  return {
    dsl_version: 'game-dsl-v0.1',
    metadata: { title: 'Gem Run', description: 'Collect gems before time runs out.', language },
    game: { genre: 'collector', camera: 'top_down', difficulty: 'easy', target_play_time_sec: 60 },
    world: { width: 960, height: 540, visual_theme: 'bright garden' },
    player: {
      id: 'player',
      label: 'Hero',
      movement: { type: 'eight_direction', speed_px_per_sec: 240 },
      actions: [{ id: 'collect', type: 'collect' }]
    },
    entities: [{ id: 'gem', kind: 'collectible', label: 'Gem', count: 8, movement: { type: 'static' } }],
    rules: {
      collisions: [
        {
          id: 'collect_gem',
          source: 'player',
          target: 'gem',
          type: 'overlap',
          effects: [{ type: 'score_add', value: 1 }, { type: 'destroy' }]
        }
      ]
    },
    objectives: { win: { type: 'target_score', target: 8 }, lose: { type: 'none' } },
    ui: { hud: ['score', 'objective'], restart: true }
  };
}
