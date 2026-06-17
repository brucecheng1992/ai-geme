import { describe, expect, it } from 'vitest';

import { buildLiveEditCapabilityDiagnostics } from '../liveEditDiagnostics.js';
import type { LiveEditCapabilities } from '../../../workbench-api.js';

describe('Live edit capability diagnostics', () => {
  it('separates supported fields, warm restart placeholders, and known blocked concepts', () => {
    const groups = buildLiveEditCapabilityDiagnostics(capabilities);

    expect(groupKeys(groups, 'supported-live-edit')).toEqual(
      expect.arrayContaining(['player.speed', 'player.label', 'enemy.count', 'world.width'])
    );
    expect(groupKeys(groups, 'supported-live-edit')).not.toEqual(expect.arrayContaining(['pickups.weapon', 'bosses.enabled']));

    expect(groupKeys(groups, 'warm-restart-only')).toEqual(expect.arrayContaining(['bosses.enabled']));
    expect(groupKeys(groups, 'known-not-exposed')).toEqual(expect.arrayContaining(['pickups.weapon', 'feedback.cameraShake']));
    expect(groupKeys(groups, 'resolver-only')).toEqual(expect.arrayContaining(['audio.events.explosion']));
    expect(groupKeys(groups, 'requires-generator-gate')).toEqual(expect.arrayContaining(['hazards.movement', 'obstacles.platforms']));
  });

  it('keeps runtime capability mode separate from end-to-end support', () => {
    const groups = buildLiveEditCapabilityDiagnostics(capabilities);
    const supportedPlayerSpeed = findItem(groups, 'player.speed');
    const pickupWeapon = findItem(groups, 'pickups.weapon');
    const bossEnabled = findItem(groups, 'bosses.enabled');

    expect(supportedPlayerSpeed).toMatchObject({
      status: 'supported-live-edit',
      runtimeCapabilityMode: 'hot',
      supportedEndToEnd: true
    });
    expect(pickupWeapon).toMatchObject({
      status: 'known-not-exposed',
      runtimeCapabilityMode: 'warm-restart',
      supportedEndToEnd: false,
      blockedFallbacks: ['enemy.count', 'projectile.damage']
    });
    expect(bossEnabled).toMatchObject({
      status: 'warm-restart-only',
      runtimeCapabilityMode: 'warm-restart',
      supportedEndToEnd: false,
      blockedFallbacks: ['enemy.count']
    });
  });

  it('downgrades registry-supported fields when the current run has no matching runtime inventory', () => {
    const groups = buildLiveEditCapabilityDiagnostics(emptyCapabilities, { runtimeStatus: 'unsupported' });

    expect(groupKeys(groups, 'supported-live-edit')).toEqual([]);

    const playerSpeed = findItem(groups, 'player.speed');
    expect(playerSpeed).toMatchObject({
      status: 'runtime-adapter-missing',
      registryStatus: 'supported-live-edit',
      runtimeCapabilityMode: 'not-listed',
      supportedEndToEnd: false
    });
  });
});

const capabilities: LiveEditCapabilities = {
  hot: [
    '/player/render/scale',
    '/player/physics/maxSpeed',
    '/player/health/max',
    '/enemyTypes/*/physics/speed',
    '/enemyTypes/*/health/max',
    '/projectiles/*/speed',
    '/projectiles/*/damage'
  ],
  assetSwap: [],
  warmRestart: ['/player/label', '/enemyTypes/*/label', '/level/waves', '/level/waves/*/count', '/world/width', '/pickups', '/bosses'],
  rebuildRequired: ['/genre']
};

const emptyCapabilities: LiveEditCapabilities = {
  hot: [],
  assetSwap: [],
  warmRestart: [],
  rebuildRequired: []
};

function groupKeys(groups: ReturnType<typeof buildLiveEditCapabilityDiagnostics>, status: string): string[] {
  return groups.find((group) => group.status === status)?.items.map((item) => item.key) ?? [];
}

function findItem(groups: ReturnType<typeof buildLiveEditCapabilityDiagnostics>, key: string) {
  const item = groups.flatMap((group) => group.items).find((candidate) => candidate.key === key);
  if (item === undefined) {
    throw new Error(`Missing capability diagnostic item: ${key}`);
  }
  return item;
}
