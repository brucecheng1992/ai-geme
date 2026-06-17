import type { RawGameDsl } from './schemas/raw-game-dsl-v0.1.schema.js';

export type ShooterVisualKind = 'cat' | 'dog' | 'alien' | 'tank' | 'ship' | 'circle';
type ShooterProjectileVisualKind = 'bolt' | 'shell' | 'beam';

export type ShooterEntityVisualParams = {
  kind: ShooterVisualKind;
  fillColor: number;
  accentColor: number;
};

type ProjectileVisualParams = {
  kind: ShooterProjectileVisualKind;
  fillColor: number;
  accentColor: number;
};

export type ShooterVisualParams = {
  player: ShooterEntityVisualParams;
  projectile: ProjectileVisualParams;
  enemy: ShooterEntityVisualParams;
};

/** Derives deterministic primitive-shape visuals from validated DSL semantics. */
export function buildShooterVisualParams(raw: RawGameDsl): ShooterVisualParams {
  const projectile = raw.entities.find((entity) => entity.kind === 'projectile');
  const enemy = raw.entities.find((entity) => entity.kind === 'enemy');

  return {
    player: buildShooterEntityVisualParams(raw.player.label, raw.world.visual_theme, 'player'),
    projectile: projectileVisual(projectile?.label ?? '', raw.world.visual_theme),
    enemy: buildShooterEntityVisualParams(enemy?.label ?? '', raw.world.visual_theme, 'enemy')
  };
}

export function buildShooterEntityVisualParams(label: string, theme: string, role: 'player' | 'enemy'): ShooterEntityVisualParams {
  if (hasAny(label, ['坦克', 'tank'])) {
    return role === 'player'
      ? { kind: 'tank', fillColor: 0x728a45, accentColor: 0x2c3824 }
      : { kind: 'tank', fillColor: 0x8a4d45, accentColor: 0x3c2424 };
  }

  if (hasAny(label, ['猫', 'cat'])) {
    return { kind: 'cat', fillColor: 0xffd28a, accentColor: 0xffc36b };
  }

  if (hasAny(label, ['狗', 'dog', 'puppy', 'canine'])) {
    return { kind: 'dog', fillColor: 0xc58a55, accentColor: 0x8a5a35 };
  }

  if (hasAny(label, ['外星', 'alien'])) {
    return { kind: 'alien', fillColor: 0x72f28f, accentColor: 0x86ffb7 };
  }

  if (hasAny(label, ['飞船', 'ship'])) {
    return role === 'player'
      ? { kind: 'ship', fillColor: 0x82d8ff, accentColor: 0xffffff }
      : { kind: 'ship', fillColor: 0xff7a9a, accentColor: 0xffd6df };
  }

  if (hasAny(theme, ['battlefield', '战场'])) {
    return role === 'player'
      ? { kind: 'tank', fillColor: 0x728a45, accentColor: 0x2c3824 }
      : { kind: 'tank', fillColor: 0x8a4d45, accentColor: 0x3c2424 };
  }

  if (hasAny(theme, ['space', '宇宙', '太空'])) {
    return role === 'player'
      ? { kind: 'ship', fillColor: 0x82d8ff, accentColor: 0xffffff }
      : { kind: 'ship', fillColor: 0xff7a9a, accentColor: 0xffd6df };
  }

  return role === 'player'
    ? { kind: 'circle', fillColor: 0xffd28a, accentColor: 0xffffff }
    : { kind: 'circle', fillColor: 0x72f28f, accentColor: 0x102334 };
}

function projectileVisual(label: string, theme: string): ProjectileVisualParams {
  if (hasAny(label, ['炮弹', 'shell'])) {
    return { kind: 'shell', fillColor: 0xffd166, accentColor: 0xffffff };
  }

  if (hasAny(label, ['laser', 'beam', '激光'])) {
    return { kind: 'beam', fillColor: 0x89e7ff, accentColor: 0xffffff };
  }

  if (hasAny(theme, ['tank', 'battlefield', '战场'])) {
    return { kind: 'shell', fillColor: 0xffd166, accentColor: 0xffffff };
  }

  return { kind: 'bolt', fillColor: 0x89e7ff, accentColor: 0xffffff };
}

function hasAny(value: string, candidates: string[]): boolean {
  const normalized = value.toLowerCase();

  return candidates.some((candidate) => normalized.includes(candidate.toLowerCase()));
}
