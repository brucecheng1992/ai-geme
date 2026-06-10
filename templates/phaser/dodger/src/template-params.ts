export type DodgerTemplateParams = {
  world: { width: number; height: number };
  player: { label: string; health: number; speedPxPerSec: number; startX: number; startY: number };
  hazard: { label: string; speedPxPerSec: number; spawnIntervalMs: number; damage: number };
  objective: { surviveDurationMs: number };
};

export const defaultDodgerParams: DodgerTemplateParams = {
  world: { width: 960, height: 540 },
  player: { label: 'Hero', health: 3, speedPxPerSec: 260, startX: 480, startY: 270 },
  hazard: { label: 'Hazard', speedPxPerSec: 180, spawnIntervalMs: 1000, damage: 1 },
  objective: { surviveDurationMs: 30000 }
};
