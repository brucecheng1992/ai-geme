export type DodgerTemplateParams = {
  world: { width: number; height: number };
  player: { label: string; health: number; speedPxPerSec: number; startX: number; startY: number };
  hazard: { label: string; speedPxPerSec: number; spawnIntervalMs: number; damage: number };
  collectible?: { label: string; count: number; scorePerItem: number };
  objective: { surviveDurationMs: number };
  ui: {
    screens: {
      win: { title: string; subtitle: string };
      lose: { title: string; subtitle: string };
    };
  };
};

export const defaultDodgerParams: DodgerTemplateParams = {
  world: { width: 960, height: 540 },
  player: { label: 'Hero', health: 3, speedPxPerSec: 260, startX: 480, startY: 270 },
  hazard: { label: 'Hazard', speedPxPerSec: 180, spawnIntervalMs: 1000, damage: 1 },
  objective: { surviveDurationMs: 30000 },
  ui: {
    screens: {
      win: { title: 'VICTORY', subtitle: 'Survived the timer' },
      lose: { title: 'DEFEAT', subtitle: 'Health depleted' }
    }
  }
};
