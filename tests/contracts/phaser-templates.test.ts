import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import collectorContract from '../../packages/game-dsl/src/contracts/collector.contract.json' with { type: 'json' };
import dodgerContract from '../../packages/game-dsl/src/contracts/dodger.contract.json' with { type: 'json' };
import shooterContract from '../../packages/game-dsl/src/contracts/shooter.contract.json' with { type: 'json' };
import collectorManifest from '../../templates/phaser/collector/template-manifest.json' with { type: 'json' };
import dodgerManifest from '../../templates/phaser/dodger/template-manifest.json' with { type: 'json' };
import shooterManifest from '../../templates/phaser/shooter/template-manifest.json' with { type: 'json' };

const root = new URL('../../templates/phaser/', import.meta.url);
const manifests = [
  { genre: 'collector', manifest: collectorManifest, contract: collectorContract },
  { genre: 'dodger', manifest: dodgerManifest, contract: dodgerContract },
  { genre: 'shooter', manifest: shooterManifest, contract: shooterContract }
] as const;

const requiredSystems = [
  'InputSystem',
  'MovementSystem',
  'SpawnSystem',
  'CollisionSystem',
  'ScoreSystem',
  'ObjectiveSystem',
  'TelemetrySystem',
  'GameStateSystem',
  'QaBridge'
];

type TemplateTelemetryEvent = {
  type: string;
  timestamp_ms: number;
  frame: number;
  payload?: Record<string, unknown>;
};

type TemplateSnapshot = {
  gameStatus: 'READY' | 'PLAYING' | 'WON' | 'LOST';
  score: number;
  health: number;
  frame: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __GAME_TELEMETRY__: { readonly events: TemplateTelemetryEvent[]; readonly state: TemplateSnapshot } | undefined;
  // eslint-disable-next-line no-var
  var __GAME_QA__:
    | {
        start(): void;
        restart(): void;
        snapshot(): TemplateSnapshot;
        telemetry(): TemplateTelemetryEvent[];
      }
    | undefined;
}

describe('Phaser templates', () => {
  it('keeps manifests aligned with source files and genre telemetry contracts', async () => {
    for (const { genre, manifest, contract } of manifests) {
      expect(manifest.required_systems).toEqual(requiredSystems);
      expect(manifest.required_telemetry_all).toEqual(contract.required_telemetry_all);
      expect(manifest.required_telemetry_any_groups).toEqual(contract.required_telemetry_any_groups);

      for (const source of manifest.source_files) {
        await expect(readFile(new URL(`${genre}/${source}`, root), 'utf8')).resolves.toBeTruthy();
      }

      for (const source of manifest.shared_files) {
        await expect(readFile(new URL(`${genre}/${source}`, root), 'utf8')).resolves.toBeTruthy();
      }
    }
  });

  it('maps deterministic keyboard input to real template runtime actions', async () => {
    const collectorMain = await readFile('templates/phaser/collector/src/main.ts', 'utf8');
    const dodgerMain = await readFile('templates/phaser/dodger/src/main.ts', 'utf8');
    const shooterMain = await readFile('templates/phaser/shooter/src/main.ts', 'utf8');

    expect(collectorMain).toContain("event.key === 'ArrowRight'");
    expect(collectorMain).toContain('scene.collectItem()');
    expect(dodgerMain).toContain('scene.dodgeFrame()');
    expect(dodgerMain).toContain('scene.update(delta)');
    expect(dodgerMain).toContain('scene.moveUp()');
    expect(dodgerMain).toContain('scene.moveDown()');
    expect(dodgerMain).toContain('scene.hitHazard()');
    expect(shooterMain).toContain('scene.fire()');
    expect(shooterMain).toContain('scene.setMoveInput');
    expect(shooterMain).toContain('directionFromKey');
  });

  it('lets shooter template render generated primitive visuals instead of fixed shells', async () => {
    const renderer = await readFile(new URL('shooter/src/shooter-renderer.ts', root), 'utf8');
    const visuals = await readFile(new URL('shooter/src/template-visuals.ts', root), 'utf8');
    const params = await readFile(new URL('shooter/src/template-params.ts', root), 'utf8');

    expect(renderer).toContain('drawShooterPlayer');
    expect(renderer).toContain('drawShooterEnemy');
    expect(renderer).toContain('drawShooterProjectile');
    expect(renderer).not.toContain('drawCatPlayer');
    expect(renderer).not.toContain('drawAlienEnemy');
    expect(visuals).toContain("visual.kind === 'tank'");
    expect(visuals).toContain("visual.kind === 'cat'");
    expect(visuals).toContain("visual.kind === 'alien'");
    expect(visuals).toContain("visual.kind === 'ship'");
    expect(visuals).toContain("visual.kind === 'shell'");
    expect(visuals).toContain('drawCircleEntity');
    expect(params).toContain('visual: ShooterEntityVisualParams');
  });

  it('passes generated model params into each playable template entrypoint', async () => {
    for (const { genre } of manifests) {
      const main = await readFile(new URL(`${genre}/src/main.ts`, root), 'utf8');

      expect(main).toContain("from './template-params.generated.json'");
      expect(main).toContain(`new ${capitalizeGenre(genre)}GameScene(${genre}Params)`);
      expect(main).toContain(`${genre}Params.world.width`);
      expect(main).toContain(`${genre}Params.world.height`);
      expect(main).not.toContain(`new ${capitalizeGenre(genre)}GameScene(default`);
    }
  });

  it('exposes telemetry and QA bridge from the shared template kernel', async () => {
    const kernel = await readFile(new URL('shared/kernel.ts', root), 'utf8');

    expect(kernel).toContain('__GAME_TELEMETRY__');
    expect(kernel).toContain('__GAME_QA__');
    expect(kernel).toContain('class QaBridge');
    expect(kernel).not.toContain('enemy.spawned');
    expect(kernel).toContain('snapshot(): GameSnapshot');
    expect(kernel).toContain('telemetry(): TelemetryEvent[]');
    expect(kernel).toContain("emit('game.ready')");
    expect(kernel).toContain("emit('game.restarted')");
  });

  it('collector template emits the required collector gameplay telemetry', async () => {
    const scene = await readGenreScene('collector');
    const source = scene + (await readSharedKernel());

    for (const event of collectorContract.required_telemetry_all) {
      expect(source).toContain(event);
    }
    expect(scene).toContain('collectItem()');
    expect(scene).toContain("this.spawn.spawn('item')");
    expect(scene).toContain("this.telemetry.emit('item.collected')");
  });

  it('dodger template emits the required dodger gameplay telemetry', async () => {
    const scene = await readGenreScene('dodger');
    const source = scene + (await readSharedKernel());

    for (const event of dodgerContract.required_telemetry_all) {
      expect(source).toContain(event);
    }
    expect(scene).toContain('dodgeFrame()');
    expect(scene).toContain('update(deltaMs: number)');
    expect(scene).toContain('this.advanceHazard(deltaMs)');
    expect(scene).toContain('movePlayerToLane');
    expect(scene).toContain('resolveHazardCollision');
    expect(scene).toContain('spawnNextHazard');
    expect(scene).toContain('hideHazardForNextSpawn');
    expect(scene).toContain('nextHazardLaneIndex');
    expect(scene).toContain('hitboxesOverlap(this.playerHitbox, this.hazardHitbox)');
    expect(scene).toContain('hazardImpactHoldMs');
    expect(scene).toContain('player: { x: this.params.player.startX, y: this.playerY');
    expect(scene).toContain('hazard: { x: this.hazardX, y: this.hazardY');
    expect(scene).toContain('hitHazard()');
    expect(scene).toContain('collectItem()');
    expect(scene).toContain("this.spawn.spawn('hazard')");
    expect(scene).toContain("this.spawn.spawn('item')");
    expect(scene).toContain("this.telemetry.emit('player.damaged'");
    expect(scene).toContain("this.telemetry.emit('item.collected'");
  });

  it('shooter template preserves the real fire, projectile, enemy-hit chain', async () => {
    const scene = await readGenreScene('shooter');
    const source = scene + (await readSharedKernel());

    for (const event of shooterContract.required_telemetry_all) {
      expect(source).toContain(event);
    }
    expect(scene).toContain('fire()');
    expect(scene).toContain('setMoveInput');
    expect(scene).toContain('moveShooterPlayer');
    expect(scene).toContain("this.telemetry.emit('player.fired')");
    expect(scene).toContain("this.spawn.spawn('projectile')");
    expect(scene).toContain('advanceShooterWorld');
    expect(scene).toContain("this.telemetry.emit('enemy.hit'");
    expect(scene).toContain("this.telemetry.emit('enemy.cleared'");
  });

  it('exposes telemetry as read-only snapshots through QA bridge', async () => {
    const { CollectorGameScene } = await import('../../templates/phaser/collector/src/GameScene.js');
    const { defaultCollectorParams } = await import('../../templates/phaser/collector/src/template-params.js');
    const scene = new CollectorGameScene(defaultCollectorParams);

    scene.create();
    scene.start();
    scene.collectItem();

    const telemetry = globalThis.__GAME_TELEMETRY__;
    const qa = globalThis.__GAME_QA__;
    const initialCount = telemetry?.events.length ?? 0;
    expect(initialCount).toBeGreaterThan(0);
    telemetry?.events.push({ type: 'fake.event', timestamp_ms: 0, frame: 0 });
    expect(telemetry?.events).toHaveLength(initialCount);
    expect(qa?.telemetry().some((event) => event.type === 'fake.event')).toBe(false);
    const firstEvent = qa?.telemetry()[0];
    if (firstEvent !== undefined) {
      firstEvent.type = 'mutated.event';
    }
    expect(qa?.telemetry()[0]?.type).not.toBe('mutated.event');

    const state = telemetry?.state;
    if (state !== undefined) {
      state.gameStatus = 'LOST';
    }
    expect(qa?.snapshot().gameStatus).not.toBe('LOST');
  });

  it('shooter runtime requires real movement and projectile collision before enemy clear', async () => {
    const {
      advanceShooterWorld,
      createShooterRuntimeState,
      moveShooterPlayer,
      tryFireShooterProjectile
    } = await import('../../templates/phaser/shooter/src/shooter-runtime.js');
    const { defaultShooterParams } = await import('../../templates/phaser/shooter/src/template-params.js');
    const state = createShooterRuntimeState(defaultShooterParams);

    const originalX = state.player.x;
    expect(moveShooterPlayer(state, defaultShooterParams, { right: true }, 250)).toBe(true);
    expect(state.player.x).toBeGreaterThan(originalX);

    expect(advanceShooterWorld(state, defaultShooterParams, 16, 0).hits).toHaveLength(0);
    expect(tryFireShooterProjectile(state, defaultShooterParams, 500)).toBeTruthy();

    let hits = 0;
    for (let frame = 1; frame <= 80 && hits === 0; frame += 1) {
      hits = advanceShooterWorld(state, defaultShooterParams, 16, frame * 16).hits.length;
    }

    expect(hits).toBeGreaterThan(0);
    expect(state.enemiesCleared).toBe(1);
  });
});

async function readGenreScene(genre: 'collector' | 'dodger' | 'shooter') {
  return await readFile(new URL(`${genre}/src/GameScene.ts`, root), 'utf8');
}

async function readSharedKernel() {
  return await readFile(new URL('shared/kernel.ts', root), 'utf8');
}

function capitalizeGenre(genre: 'collector' | 'dodger' | 'shooter') {
  return `${genre[0].toUpperCase()}${genre.slice(1)}`;
}
