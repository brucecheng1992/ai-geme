import { describe, expect, it } from 'vitest';

import { buildSemanticIndex, isSemanticId, makeSemanticId, parseSemanticId } from '../../packages/game-dsl/src/index.js';
import { createShooterRawDsl, createSideScrollingRunAndGunRawDsl } from './fixtures.js';

describe('Semantic editing address and index', () => {
  it('parses stable semantic ids and rejects generated-code addresses', () => {
    expect(parseSemanticId('scene:main')).toEqual({ kind: 'scene', name: 'main' });
    expect(isSemanticId('entity:player')).toBe(true);
    expect(makeSemanticId('camera', 'main')).toBe('camera:main');

    expect(parseSemanticId('src/scenes/MainScene.ts:83')).toBeNull();
    expect(parseSemanticId('/generated/MainScene.ts')).toBeNull();
    expect(parseSemanticId('unknown:main')).toBeNull();
    expect(parseSemanticId('scene:')).toBeNull();
    expect(parseSemanticId('scene:bad-name')).toBeNull();
  });

  it('indexes project, scene, player, entity, rule, camera, input, physics, and systems from Raw DSL SSOT', () => {
    const raw = createShooterRawDsl();
    const index = buildSemanticIndex(raw);

    expect(index.resolve('project:default')).toMatchObject({ kind: 'project', path: '/' });
    expect(index.resolve('scene:main')).toMatchObject({ kind: 'scene', path: '/' });
    expect(index.resolve('entity:player')).toMatchObject({ kind: 'entity', path: '/player' });
    expect(index.resolve('entity:alien')).toMatchObject({ kind: 'entity', path: '/entities/1' });
    expect(index.resolve('rule:bolt_hits_alien')).toMatchObject({ kind: 'rule', path: '/rules/collisions/0' });
    expect(index.resolve('camera:main')).toMatchObject({ kind: 'camera', path: '/game/camera' });
    expect(index.resolve('input:keyboard')).toMatchObject({ kind: 'input', path: '/player/actions' });
    expect(index.resolve('physics:arcade')).toMatchObject({ kind: 'physics', path: '/world' });
    expect(index.resolve('system:movement')).toMatchObject({ kind: 'system', path: '/player/movement' });
    expect(index.resolve('system:collision')).toMatchObject({ kind: 'system', path: '/rules/collisions' });
  });

  it('indexes optional side-scrolling SSOT nodes without inventing generated file paths', () => {
    const index = buildSemanticIndex({
      ...createSideScrollingRunAndGunRawDsl(),
      bosses: {
        items: [
          {
            id: 'boss_alpha',
            label: 'Sentinel Boss',
            health: 30,
            movement: { type: 'patrol', speed_px_per_sec: 80 },
            phases: [{ healthThresholdPct: 100, attacks: ['spread_shot'] }]
          }
        ]
      }
    });

    expect(index.resolve('camera:main')).toMatchObject({ path: '/camera' });
    expect(index.resolve('scene:segment_intro')).toMatchObject({ kind: 'scene', path: '/level/segments/0' });
    expect(index.resolve('entity:field_medkit')).toMatchObject({ kind: 'entity', path: '/pickups/0' });
    expect(index.resolve('entity:boss_alpha')).toMatchObject({ kind: 'entity', path: '/bosses/items/0' });
    expect(index.list('entity').map((ref) => ref.id)).toEqual(
      expect.arrayContaining(['entity:player', 'entity:drone', 'entity:pulse_bolt', 'entity:field_medkit', 'entity:boss_alpha'])
    );
    expect(index.list().every((ref) => !ref.path.endsWith('.ts') && !ref.path.includes('/generated/'))).toBe(true);
  });

  it('does not throw or invent ids for malformed unknown SSOT input', () => {
    expect(() =>
      buildSemanticIndex({
        metadata: {},
        game: { camera: 'top_down' },
        world: {},
        player: { id: 'player', movement: {}, actions: [] },
        entities: [{}],
        rules: { collisions: [{}] },
        projectiles: {},
        level: {}
      })
    ).not.toThrow();

    const missingIds = buildSemanticIndex({
      metadata: {},
      game: { camera: 'top_down' },
      world: {},
      player: { id: 'player', movement: {}, actions: [] },
      entities: [{}],
      rules: { collisions: [{}] }
    });

    expect(missingIds.has('entity:undefined')).toBe(false);
    expect(missingIds.has('rule:undefined')).toBe(false);
    expect(missingIds.resolve('entity:player')).toMatchObject({ path: '/player' });
  });
});
