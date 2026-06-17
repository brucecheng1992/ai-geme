export type SideScrollingTemplateParams = {
  style: { visualTheme: string };
  player: { sourceEntityId?: string; label: string };
  assetLabels: {
    enemy?: { sourceEntityId?: string; label: string };
    projectile?: { sourceEntityId?: string; label: string };
    pickup?: { sourceEntityId?: string; label: string };
  };
  ui: {
    hud: Array<'score' | 'health' | 'timer' | 'objective'>;
    restart: boolean;
    screens: {
      win: { title: string; subtitle: string };
      lose: { title: string; subtitle: string };
    };
  };
};

export const defaultSideScrollingParams: SideScrollingTemplateParams = {
  style: { visualTheme: 'generic alien frontier' },
  player: { sourceEntityId: 'player', label: 'Runner' },
  assetLabels: {
    enemy: { sourceEntityId: 'drone', label: 'Alien Drone' },
    projectile: { sourceEntityId: 'pulse_bolt', label: 'Pulse Bolt' },
    pickup: { sourceEntityId: 'field_medkit', label: 'Medkit' }
  },
  ui: {
    hud: ['score', 'health', 'objective'],
    restart: true,
    screens: {
      win: { title: 'VICTORY', subtitle: 'Exit reached' },
      lose: { title: 'DEFEAT', subtitle: 'Lives depleted' }
    }
  }
};
