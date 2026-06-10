export type ShooterTemplateParams = {
  world: { width: number; height: number };
  player: { label: string; health: number; speedPxPerSec: number; startX: number; startY: number };
  projectile: { label: string; speedPxPerSec: number; damage: number; lifetimeMs: number; cooldownMs: number };
  enemy: { label: string; health: number; speedPxPerSec: number; count: number; spawnIntervalMs: number; spawnArea: 'right_edge' | 'random_edges' };
  scoring: { scorePerEnemy: number };
  objective: { winType: 'enemy_cleared' | 'target_score'; targetCount?: number; targetScore?: number };
};

export const defaultShooterParams: ShooterTemplateParams = {
  world: { width: 960, height: 540 },
  player: { label: 'Cat', health: 3, speedPxPerSec: 260, startX: 160, startY: 270 },
  projectile: { label: 'Bolt', speedPxPerSec: 520, damage: 1, lifetimeMs: 1200, cooldownMs: 300 },
  enemy: { label: 'Alien', health: 1, speedPxPerSec: 120, count: 6, spawnIntervalMs: 800, spawnArea: 'right_edge' },
  scoring: { scorePerEnemy: 1 },
  objective: { winType: 'enemy_cleared', targetCount: 6 }
};
