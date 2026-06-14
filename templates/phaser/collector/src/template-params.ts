export type CollectorTemplateParams = {
  world: { width: number; height: number };
  player: { label: string; speedPxPerSec: number; startX: number; startY: number };
  collectible: { label: string; count: number; scorePerItem: number };
  objective: { targetScore: number };
  ui: {
    screens: {
      win: { title: string; subtitle: string };
      lose: { title: string; subtitle: string };
    };
  };
};

export const defaultCollectorParams: CollectorTemplateParams = {
  world: { width: 960, height: 540 },
  player: { label: 'Hero', speedPxPerSec: 240, startX: 480, startY: 270 },
  collectible: { label: 'Gem', count: 8, scorePerItem: 1 },
  objective: { targetScore: 8 },
  ui: {
    screens: {
      win: { title: 'VICTORY', subtitle: 'All gems collected' },
      lose: { title: 'DEFEAT', subtitle: 'Try again' }
    }
  }
};
