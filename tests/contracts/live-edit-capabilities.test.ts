import { describe, expect, it } from 'vitest';

import {
  classifyLiveEditCapabilityRuntimeMode,
  findLiveEditCapabilityExposure,
  isLiveEditCapabilitySupportedEndToEnd,
  liveEditCapabilityExposureRegistry,
  summarizeLiveEditCapabilityExposure,
  topDownShooterPhaserLiveEditCapabilities
} from '../../packages/game-dsl/src/index.js';

describe('Live-edit capability exposure matrix', () => {
  it('marks current Workbench scalar and label fields as end-to-end live-edit supported', () => {
    expect(supportedKeys().sort()).toEqual(
      [
        'enemy.count',
        'enemy.health',
        'enemy.label',
        'enemy.speed',
        'player.health',
        'player.label',
        'player.scale',
        'player.speed',
        'projectile.damage',
        'projectile.speed',
        'world.width'
      ].sort()
    );

    expect(runtimeMode('player.speed')).toBe('hot');
    expect(runtimeMode('player.label')).toBe('warm-restart');
    expect(runtimeMode('enemy.count')).toBe('warm-restart');
    expect(runtimeMode('world.width')).toBe('warm-restart');
  });

  it('keeps warm restart placeholders from being reported as supported live-edit capabilities', () => {
    expect(topDownShooterPhaserLiveEditCapabilities.warmRestart).toEqual(expect.arrayContaining(['/pickups', '/bosses']));

    expect(findLiveEditCapabilityExposure('pickups.weapon')).toMatchObject({
      status: 'known-not-exposed',
      parserMapping: false,
      runtimePatchAdapter: false,
      phaserRuntimeBehavior: false
    });
    expect(runtimeMode('pickups.weapon')).toBe('warm-restart');
    expect(isLiveEditCapabilitySupportedEndToEnd('pickups.weapon')).toBe(false);

    expect(findLiveEditCapabilityExposure('bosses.enabled')).toMatchObject({
      status: 'warm-restart-only',
      parserMapping: false,
      runtimePatchAdapter: false,
      phaserRuntimeBehavior: false
    });
    expect(runtimeMode('bosses.enabled')).toBe('warm-restart');
    expect(isLiveEditCapabilitySupportedEndToEnd('bosses.enabled')).toBe(false);
  });

  it('keeps known advanced semantics out of nearby supported fallback fields', () => {
    expect(findLiveEditCapabilityExposure('audio.events.explosion')).toMatchObject({
      status: 'resolver-only',
      resolver: true,
      blockedFallbacks: ['projectile.damage']
    });
    expect(findLiveEditCapabilityExposure('feedback.cameraShake')).toMatchObject({
      status: 'known-not-exposed',
      blockedFallbacks: ['world.width']
    });
    expect(findLiveEditCapabilityExposure('hazards.movement')).toMatchObject({
      status: 'requires-generator-gate',
      blockedFallbacks: ['enemy.count']
    });
  });

  it('keeps registry keys unique and layer booleans conservative for unsupported domains', () => {
    const keys = liveEditCapabilityExposureRegistry.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);

    expect(findLiveEditCapabilityExposure('pickups.enabled')).toMatchObject({
      dslSchema: true,
      promptContext: true,
      artifactContract: true
    });
    expect(findLiveEditCapabilityExposure('pickups.dropRate')).toMatchObject({
      dslSchema: false,
      promptContext: true,
      artifactContract: false
    });
    expect(findLiveEditCapabilityExposure('pickups.weapon')).toMatchObject({
      dslSchema: false,
      artifactContract: false
    });
    expect(findLiveEditCapabilityExposure('bosses.enabled')).toMatchObject({
      dslSchema: false,
      promptContext: true,
      artifactContract: true
    });
    expect(findLiveEditCapabilityExposure('audio.events.explosion')).toMatchObject({
      dslSchema: false,
      artifactContract: false,
      resolver: true
    });
    expect(findLiveEditCapabilityExposure('collision.effects')).toMatchObject({
      dslSchema: true,
      artifactContract: true,
      resolver: true
    });
    expect(findLiveEditCapabilityExposure('effects.explosion')).toMatchObject({
      dslSchema: false,
      artifactContract: false
    });
  });

  it('summarizes capability status separately from runtime inventory mode', () => {
    const summaries = summarizeLiveEditCapabilityExposure(topDownShooterPhaserLiveEditCapabilities);

    expect(summaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'player.speed',
          status: 'supported-live-edit',
          runtimeCapabilityMode: 'hot',
          registrySupportedEndToEnd: true,
          supportedEndToEnd: true
        }),
        expect.objectContaining({
          key: 'pickups.enabled',
          status: 'known-not-exposed',
          runtimeCapabilityMode: 'warm-restart',
          registrySupportedEndToEnd: false,
          supportedEndToEnd: false
        }),
        expect.objectContaining({
          key: 'bosses.enabled',
          status: 'warm-restart-only',
          runtimeCapabilityMode: 'warm-restart',
          supportedEndToEnd: false
        })
      ])
    );
  });

  it('does not report registry-supported capabilities as currently supported when inventory is empty', () => {
    const summaries = summarizeLiveEditCapabilityExposure({ hot: [], assetSwap: [], warmRestart: [], rebuildRequired: [] });

    expect(summaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'player.speed',
          status: 'supported-live-edit',
          runtimeCapabilityMode: 'not-listed',
          registrySupportedEndToEnd: true,
          supportedEndToEnd: false
        })
      ])
    );
  });
});

function supportedKeys(): string[] {
  return liveEditCapabilityExposureRegistry.filter((entry) => entry.status === 'supported-live-edit').map((entry) => entry.key);
}

function runtimeMode(key: string) {
  const exposure = findLiveEditCapabilityExposure(key);
  if (exposure === undefined) {
    throw new Error(`Missing live-edit capability exposure: ${key}`);
  }
  return classifyLiveEditCapabilityRuntimeMode(exposure, topDownShooterPhaserLiveEditCapabilities);
}
