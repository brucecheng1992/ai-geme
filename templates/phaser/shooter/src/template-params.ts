export type ShooterTemplateParams = {
  world: { width: number; height: number };
  player: { label: string; health: number; speedPxPerSec: number; startX: number; startY: number; visual: ShooterEntityVisualParams };
  projectile: { label: string; speedPxPerSec: number; damage: number; lifetimeMs: number; cooldownMs: number; visual: ShooterProjectileVisualParams };
  enemy: {
    label: string;
    health: number;
    speedPxPerSec: number;
    count: number;
    spawnIntervalMs: number;
    spawnArea: 'right_edge' | 'random_edges';
    visual: ShooterEntityVisualParams;
  };
  scoring: { scorePerEnemy: number };
  objective: { winType: 'enemy_cleared' | 'target_score'; targetCount?: number; targetScore?: number };
};

export type ShooterEntityVisualParams = {
  kind: 'cat' | 'alien' | 'tank' | 'ship' | 'circle';
  fillColor: number;
  accentColor: number;
};

export type ShooterProjectileVisualParams = {
  kind: 'bolt' | 'shell' | 'beam';
  fillColor: number;
  accentColor: number;
};

export const defaultShooterParams: ShooterTemplateParams = {
  world: { width: 960, height: 540 },
  player: { label: 'Cat', health: 3, speedPxPerSec: 260, startX: 160, startY: 270, visual: { kind: 'cat', fillColor: 0xffd28a, accentColor: 0xffc36b } },
  projectile: { label: 'Bolt', speedPxPerSec: 520, damage: 1, lifetimeMs: 1200, cooldownMs: 300, visual: { kind: 'bolt', fillColor: 0x89e7ff, accentColor: 0xffffff } },
  enemy: {
    label: 'Alien',
    health: 1,
    speedPxPerSec: 120,
    count: 6,
    spawnIntervalMs: 800,
    spawnArea: 'right_edge',
    visual: { kind: 'alien', fillColor: 0x72f28f, accentColor: 0x86ffb7 }
  },
  scoring: { scorePerEnemy: 1 },
  objective: { winType: 'enemy_cleared', targetCount: 6 }
};
