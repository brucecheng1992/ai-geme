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
    expect(collectorMain).toContain('asset-manifest.generated.json');
    expect(collectorMain).toContain('collectorArt.preload(this)');
    expect(dodgerMain).toContain('scene.dodgeFrame()');
    expect(dodgerMain).toContain('scene.update(delta)');
    expect(dodgerMain).toContain('asset-manifest.generated.json');
    expect(dodgerMain).toContain('dodgerArt.preload(this, { collectible: dodgerParams.collectible !== undefined })');
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
      if (genre === 'dodger') {
        expect(main).toContain("from './runtime-plan.generated.json'");
        expect(main).toContain('new DodgerGameScene(dodgerParams, dodgerRuntimePlan, dodgerArt)');
      } else if (genre === 'shooter') {
        expect(main).toContain("from './runtime-plan.generated.json'");
        expect(main).toContain('new ShooterGameScene(shooterParams, shooterRuntimePlan)');
      } else if (genre === 'collector') {
        expect(main).toContain("from './asset-manifest.generated.json'");
        expect(main).toContain('new CollectorGameScene(collectorParams, collectorArt)');
      } else {
        expect(main).toContain(`new ${capitalizeGenre(genre)}GameScene(${genre}Params)`);
      }
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
    expect(scene).toContain('hideHazard(hazard)');
    expect(scene).toContain('activeHazardCount < spawnRule.maxActive');
    expect(scene).toContain('nextHazardLaneIndex');
    expect(scene).toContain('Math.random()');
    expect(scene).toContain('randomBetween');
    expect(scene).toContain('speedPxPerSec');
    expect(scene).toContain('yOffset');
    expect(scene).toContain('nextHazardStartX');
    expect(scene).toContain('lastHazardLaneIndex');
    expect(scene).toContain('activeLaneCounts');
    expect(scene).toContain('hitboxesOverlap(this.playerHitbox, this.hazardHitbox(hazard))');
    expect(scene).toContain('hitboxesOverlap(this.playerHitbox, this.collectibleHitbox');
    expect(scene).toContain('collectOverlappingItem');
    expect(scene).toContain('renderCollectibleShape');
    expect(scene).toContain("this.art.addImage(scene, 'player_character'");
    expect(scene).toContain('emitCoinSpark');
    expect(scene).toContain('emitClearBurst');
    expect(scene).toContain('Math.min(this.state.score, this.collectibleTargetScore)');
    expect(scene).toContain('impactHoldMs');
    expect(scene).toContain('player: { x: this.params.player.startX, y: this.playerY');
    expect(scene).toContain('hazards: this.hazards.map');
    expect(scene).toContain('spawnPlan');
    expect(scene).toContain('resolveDodgerSpawnRule(this.runtimePlan');
    expect(scene).toContain('hitHazard()');
    expect(scene).toContain('collectItem()');
    expect(scene).toContain("this.spawn.spawn('hazard', {");
    expect(scene).toContain("this.spawn.spawn('item', {");
    expect(scene).toContain("this.telemetry.emit('player.damaged'");
    expect(scene).toContain("this.telemetry.emit('item.collected'");
  });

  it('resolves dodger spawn rules from runtime_plan before falling back to template defaults', async () => {
    const { resolveDodgerSpawnRule } = await import('../../templates/phaser/dodger/src/dodger-runtime-plan.js');

    expect(
      resolveDodgerSpawnRule(
        {
          spawn_rules: [
            {
              entity_id: 'obstacle',
              entity_kind: 'hazard',
              strategy: 'right_edge_wave',
              count: 5,
              max_active: 2,
              interval_ms: 700,
              lane_count: 4
            }
          ]
        },
        'hazard',
        { entityId: 'hazard', strategy: 'right_edge_wave', count: 99, maxActive: 3, intervalMs: 1000, laneCount: 3 }
      )
    ).toEqual({
      entityId: 'obstacle',
      entityKind: 'hazard',
      strategy: 'right_edge_wave',
      count: 5,
      maxActive: 2,
      intervalMs: 700,
      laneCount: 4,
      source: 'runtime_plan'
    });

    expect(
      resolveDodgerSpawnRule(
        { spawn_rules: [] },
        'hazard',
        { entityId: 'hazard', strategy: 'right_edge_wave', count: 99, maxActive: 3, intervalMs: 1000, laneCount: 3 }
      )
    ).toMatchObject({ entityId: 'hazard', source: 'template_default' });

    expect(
      resolveDodgerSpawnRule(
        {
          spawn_rules: [
            {
              entity_id: 'obstacle',
              entity_kind: 'hazard',
              strategy: 'top_edge_stream',
              count: 5,
              max_active: 2,
              interval_ms: 700,
              lane_count: 4
            }
          ]
        },
        'hazard',
        { entityId: 'hazard', strategy: 'right_edge_wave', count: 99, maxActive: 3, intervalMs: 1000, laneCount: 3 }
      )
    ).toMatchObject({ entityId: 'hazard', strategy: 'right_edge_wave', source: 'template_default' });

    expect(
      resolveDodgerSpawnRule(
        {
          spawn_rules: [
            {
              entity_id: 'coin',
              entity_kind: 'collectible',
              strategy: 'fixed_positions',
              count: 6,
              max_active: 2,
              interval_ms: 900
            }
          ]
        },
        'collectible',
        { entityId: 'collectible', strategy: 'fixed_positions', count: 1, maxActive: 1, intervalMs: 1200 }
      )
    ).toEqual({
      entityId: 'coin',
      entityKind: 'collectible',
      strategy: 'fixed_positions',
      count: 6,
      maxActive: 2,
      intervalMs: 900,
      source: 'runtime_plan'
    });
  });

  it('resolves dodger difficulty curves from runtime_plan and interpolates over survival time', async () => {
    const { resolveDodgerDifficultyCurve, resolveDodgerDifficultyState } = await import('../../templates/phaser/dodger/src/dodger-runtime-plan.js');
    const curve = resolveDodgerDifficultyCurve({
      difficulty_curve: {
        derived_from: ['game.difficulty', 'game.target_play_time_sec'],
        level: 'normal',
        speed_multiplier_start: 1,
        speed_multiplier_end: 1.25,
        spawn_interval_multiplier_start: 1,
        spawn_interval_multiplier_end: 0.8,
        ramp_duration_ms: 60000
      }
    });

    expect(curve).toMatchObject({ level: 'normal', source: 'runtime_plan' });
    expect(resolveDodgerDifficultyState(curve, 0)).toMatchObject({
      rampProgress: 0,
      speedMultiplier: 1,
      spawnIntervalMultiplier: 1
    });
    expect(resolveDodgerDifficultyState(curve, 30000)).toMatchObject({
      rampProgress: 0.5,
      speedMultiplier: 1.125,
      spawnIntervalMultiplier: 0.9
    });
    expect(resolveDodgerDifficultyState(curve, 60000)).toMatchObject({
      rampProgress: 1,
      speedMultiplier: 1.25,
      spawnIntervalMultiplier: 0.8
    });
  });

  it('exposes dodger runtime_plan spawn metadata through the QA snapshot', async () => {
    const { DodgerGameScene } = await import('../../templates/phaser/dodger/src/GameScene.js');
    const { defaultDodgerParams } = await import('../../templates/phaser/dodger/src/template-params.js');
    const scene = new DodgerGameScene(
      { ...defaultDodgerParams, collectible: { label: 'Coin', count: 6, scorePerItem: 1 } },
      {
        spawn_rules: [
        {
          entity_id: 'obstacle',
          entity_kind: 'hazard',
          strategy: 'right_edge_wave',
          count: 5,
          max_active: 2,
          interval_ms: 700,
          lane_count: 4
        },
        {
          entity_id: 'coin',
          entity_kind: 'collectible',
          strategy: 'fixed_positions',
          count: 6,
          max_active: 2,
          interval_ms: 900
        }
        ]
      }
    );

    scene.create();

    const snapshot = globalThis.__GAME_QA__?.snapshot() as { spawnPlan?: { hazard?: Record<string, unknown>; collectible?: Record<string, unknown> } } | undefined;
    expect(snapshot?.spawnPlan?.hazard).toMatchObject({
      entityId: 'obstacle',
      strategy: 'right_edge_wave',
      count: 5,
      maxActive: 2,
      intervalMs: 700,
      laneCount: 4,
      source: 'runtime_plan'
    });
    expect(snapshot?.spawnPlan?.collectible).toMatchObject({
      entityId: 'coin',
      strategy: 'fixed_positions',
      count: 12,
      maxActive: 2,
      intervalMs: 900,
      source: 'runtime_plan'
    });
  });

  it('executes dodger difficulty curve in hazard spawn telemetry and resets it on restart', async () => {
    const { DodgerGameScene } = await import('../../templates/phaser/dodger/src/GameScene.js');
    const { defaultDodgerParams } = await import('../../templates/phaser/dodger/src/template-params.js');
    const scene = new DodgerGameScene(defaultDodgerParams, {
      spawn_rules: [
        {
          entity_id: 'obstacle',
          entity_kind: 'hazard',
          strategy: 'right_edge_wave',
          count: 3,
          max_active: 1,
          interval_ms: 1000,
          lane_count: 3
        }
      ],
      difficulty_curve: {
        derived_from: ['game.difficulty', 'game.target_play_time_sec'],
        level: 'normal',
        speed_multiplier_start: 2,
        speed_multiplier_end: 2,
        spawn_interval_multiplier_start: 0.5,
        spawn_interval_multiplier_end: 0.5,
        ramp_duration_ms: 1000
      }
    });

    scene.create(createPhaserSceneMock() as unknown as Parameters<typeof scene.create>[0]);
    scene.update(16);

    expect(globalThis.__GAME_QA__?.snapshot()).toMatchObject({
      difficultyPlan: expect.objectContaining({
        level: 'normal',
        source: 'runtime_plan',
        speedMultiplier: 2,
        spawnIntervalMultiplier: 0.5
      })
    });
    expect(globalThis.__GAME_QA__?.telemetry()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'hazard.spawned',
          payload: expect.objectContaining({
            entityId: 'obstacle',
            difficultyLevel: 'normal',
            difficultySource: 'runtime_plan',
            speedMultiplier: 2,
            spawnIntervalMultiplier: 0.5,
            effectiveIntervalMs: 500
          })
        })
      ])
    );

    scene.update(1000);
    expect(globalThis.__GAME_QA__?.snapshot()).toMatchObject({
      difficultyPlan: expect.objectContaining({ rampProgress: 1 })
    });
    scene.restart();
    expect(globalThis.__GAME_QA__?.snapshot()).toMatchObject({
      difficultyPlan: expect.objectContaining({ rampProgress: 0 })
    });
  });

  it('uses the ramped dodger difficulty curve for later hazard spawn scheduling', async () => {
    const { DodgerGameScene } = await import('../../templates/phaser/dodger/src/GameScene.js');
    const { defaultDodgerParams } = await import('../../templates/phaser/dodger/src/template-params.js');
    const scene = new DodgerGameScene(defaultDodgerParams, {
      spawn_rules: [
        {
          entity_id: 'obstacle',
          entity_kind: 'hazard',
          strategy: 'right_edge_wave',
          count: 3,
          max_active: 3,
          interval_ms: 1000,
          lane_count: 3
        }
      ],
      difficulty_curve: {
        derived_from: ['game.difficulty', 'game.target_play_time_sec'],
        level: 'normal',
        speed_multiplier_start: 1,
        speed_multiplier_end: 1.5,
        spawn_interval_multiplier_start: 1,
        spawn_interval_multiplier_end: 0.5,
        ramp_duration_ms: 1000
      }
    });

    scene.create(createPhaserSceneMock() as unknown as Parameters<typeof scene.create>[0]);
    scene.update(16);
    scene.update(1000);

    const hazardSpawnPayloads = globalThis.__GAME_QA__?.telemetry().filter((event) => event.type === 'hazard.spawned').map((event) => event.payload) ?? [];
    expect(hazardSpawnPayloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rampProgress: expect.closeTo(1, 5), speedMultiplier: 1.5, spawnIntervalMultiplier: 0.5, effectiveIntervalMs: 500 })
      ])
    );
  });

  it('moves dodger runtime_plan collectibles into player overlap before collecting them', async () => {
    const { DodgerGameScene } = await import('../../templates/phaser/dodger/src/GameScene.js');
    const { defaultDodgerParams } = await import('../../templates/phaser/dodger/src/template-params.js');
    const scene = new DodgerGameScene(
      { ...defaultDodgerParams, collectible: { label: 'Coin', count: 6, scorePerItem: 1 } },
      {
        spawn_rules: [
          {
            entity_id: 'coin',
            entity_kind: 'collectible',
            strategy: 'fixed_positions',
            count: 6,
            max_active: 2,
            interval_ms: 900
          }
        ]
      }
    );

    scene.create();
    scene.moveUp();
    const beforeMove = globalThis.__GAME_QA__?.snapshot() as { collectibles?: Array<{ x: number }> } | undefined;
    scene.update(1000);
    const afterMove = globalThis.__GAME_QA__?.snapshot() as { collectibles?: Array<{ x: number }> } | undefined;
    expect(afterMove?.collectibles?.[0]?.x).toBeLessThan(beforeMove?.collectibles?.[0]?.x ?? Number.POSITIVE_INFINITY);

    for (let frame = 0; frame < 80 && !(globalThis.__GAME_QA__?.telemetry().some((event) => event.type === 'item.collected') ?? false); frame += 1) {
      scene.update(100);
    }

    expect(globalThis.__GAME_QA__?.telemetry()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'item.spawned',
          payload: expect.objectContaining({
            entityId: 'coin',
            strategy: 'fixed_positions',
            source: 'runtime_plan',
            count: 12,
            maxActive: 2,
            intervalMs: 900
          })
        }),
        expect.objectContaining({
          type: 'item.collected',
          payload: expect.objectContaining({ entityId: 'coin', source: 'runtime_plan', slotIndex: expect.any(Number) })
        }),
        expect.objectContaining({
          type: 'score.changed'
        })
      ])
    );
  });

  it('uses dodger collectible runtime_plan count as the score target while keeping extra spawn budget', async () => {
    const { DodgerGameScene } = await import('../../templates/phaser/dodger/src/GameScene.js');
    const { defaultDodgerParams } = await import('../../templates/phaser/dodger/src/template-params.js');
    const scene = new DodgerGameScene(
      { ...defaultDodgerParams, collectible: { label: 'Coin', count: 3, scorePerItem: 1 } },
      {
        spawn_rules: [
          {
            entity_id: 'coin',
            entity_kind: 'collectible',
            strategy: 'fixed_positions',
            count: 3,
            max_active: 2,
            interval_ms: 900
          }
        ]
      }
    );

    scene.create();
    expect(spawnedItems()).toHaveLength(1);
    scene.update(899);
    expect(spawnedItems()).toHaveLength(1);
    scene.update(1);
    expect(spawnedItems()).toHaveLength(2);
    scene.update(900);
    expect(spawnedItems()).toHaveLength(2);
    scene.moveUp();
    for (let frame = 0; frame < 80 && spawnedItems().length < 4; frame += 1) {
      scene.update(100);
    }
    expect(spawnedItems()).toHaveLength(4);
    scene.update(900);
    expect(spawnedItems()).toHaveLength(4);
    expect(spawnedItems()[0]?.payload).toMatchObject({ count: 7 });
  });

  it('wins the dodger collectible objective when the score target is reached', async () => {
    const { DodgerGameScene } = await import('../../templates/phaser/dodger/src/GameScene.js');
    const { defaultDodgerParams } = await import('../../templates/phaser/dodger/src/template-params.js');
    const scene = new DodgerGameScene(
      { ...defaultDodgerParams, collectible: { label: 'Coin', count: 3, scorePerItem: 1 } },
      {
        spawn_rules: [
          {
            entity_id: 'coin',
            entity_kind: 'collectible',
            strategy: 'fixed_positions',
            count: 3,
            max_active: 2,
            interval_ms: 300
          }
        ]
      }
    );

    scene.create();
    for (let frame = 0; frame < 140 && globalThis.__GAME_QA__?.snapshot().gameStatus !== 'WON'; frame += 1) {
      const snapshot = globalThis.__GAME_QA__?.snapshot() as
        | (TemplateSnapshot & {
            player?: { x: number; y: number };
            collectibles?: Array<{ x: number; y: number; active: boolean }>;
          })
        | undefined;
      const activeCollectible = snapshot?.collectibles
        ?.filter((collectible) => collectible.active)
        .sort((left, right) => Math.abs(left.x - (snapshot.player?.x ?? 0)) - Math.abs(right.x - (snapshot.player?.x ?? 0)))[0];
      if (activeCollectible !== undefined && snapshot?.player !== undefined) {
        if (activeCollectible.y < snapshot.player.y) {
          scene.moveUp();
        } else if (activeCollectible.y > snapshot.player.y) {
          scene.moveDown();
        }
      }
      scene.update(100);
    }

    const snapshot = globalThis.__GAME_QA__?.snapshot();
    expect(snapshot).toMatchObject({ gameStatus: 'WON', score: 3 });
    expect(globalThis.__GAME_QA__?.telemetry().map((event) => event.type)).toEqual(expect.arrayContaining(['objective.completed', 'game.won']));
  });

  it('loses dodger collectible runs when time expires before the score target', async () => {
    const { DodgerGameScene } = await import('../../templates/phaser/dodger/src/GameScene.js');
    const { defaultDodgerParams } = await import('../../templates/phaser/dodger/src/template-params.js');
    const scene = new DodgerGameScene({
      ...defaultDodgerParams,
      collectible: { label: 'Coin', count: 3, scorePerItem: 1 },
      objective: { surviveDurationMs: 1000 }
    });

    scene.create();
    scene.update(1000);

    expect(globalThis.__GAME_QA__?.snapshot()).toMatchObject({ gameStatus: 'LOST', score: 0 });
    expect(globalThis.__GAME_QA__?.telemetry().map((event) => event.type)).toContain('game.lost');
  });

  it('preserves the dodger fallback lane geometry without a runtime_plan rule', async () => {
    const { DodgerGameScene } = await import('../../templates/phaser/dodger/src/GameScene.js');
    const { defaultDodgerParams } = await import('../../templates/phaser/dodger/src/template-params.js');
    const scene = new DodgerGameScene(defaultDodgerParams);

    scene.create();
    scene.moveDown();
    const afterMoveDown = globalThis.__GAME_QA__?.snapshot() as { player?: { y?: number }; spawnPlan?: { hazard?: Record<string, unknown> } } | undefined;
    scene.moveUp();
    const afterMoveUp = globalThis.__GAME_QA__?.snapshot() as { player?: { y?: number } } | undefined;

    expect(afterMoveDown?.player?.y).toBe(defaultDodgerParams.player.startY + 110);
    expect(afterMoveUp?.player?.y).toBe(defaultDodgerParams.player.startY);
    expect(afterMoveDown?.spawnPlan?.hazard).toMatchObject({ laneCount: 3, source: 'template_default' });
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

  it('resolves shooter enemy waves from runtime_plan before falling back to template defaults', async () => {
    const { resolveShooterEnemyWave } = await import('../../templates/phaser/shooter/src/shooter-runtime-plan.js');
    const { defaultShooterParams } = await import('../../templates/phaser/shooter/src/template-params.js');
    const derivedFrom: [
      'entities.enemy.id',
      'entities.enemy.count',
      'entities.enemy.health',
      'entities.enemy.movement.speed_px_per_sec',
      'game.difficulty',
      'game.target_play_time_sec'
    ] = [
      'entities.enemy.id',
      'entities.enemy.count',
      'entities.enemy.health',
      'entities.enemy.movement.speed_px_per_sec',
      'game.difficulty',
      'game.target_play_time_sec'
    ];

    expect(
      resolveShooterEnemyWave(
        {
          enemy_waves: [
            {
              derived_from: derivedFrom,
              entity_id: 'alien',
              strategy: 'right_edge_wave',
              count: 4,
              max_active: 1,
              interval_ms: 700,
              speed_multiplier: 1.4
            }
          ]
        },
        defaultShooterParams
      )
    ).toEqual({
      derivedFrom,
      entityId: 'alien',
      strategy: 'right_edge_wave',
      count: 4,
      maxActive: 1,
      intervalMs: 700,
      speedMultiplier: 1.4,
      source: 'runtime_plan'
    });

    expect(resolveShooterEnemyWave({ enemy_waves: [] }, defaultShooterParams)).toMatchObject({
      entityId: 'enemy',
      count: defaultShooterParams.enemy.count,
      maxActive: defaultShooterParams.enemy.count,
      intervalMs: defaultShooterParams.enemy.spawnIntervalMs,
      speedMultiplier: 1,
      source: 'template_default'
    });
  });

  it('uses shooter runtime_plan enemy wave maxActive and speed multiplier during simulation', async () => {
    const { advanceShooterWorld, createShooterRuntimeState } = await import('../../templates/phaser/shooter/src/shooter-runtime.js');
    const { resolveShooterEnemyWave } = await import('../../templates/phaser/shooter/src/shooter-runtime-plan.js');
    const { defaultShooterParams } = await import('../../templates/phaser/shooter/src/template-params.js');
    const derivedFrom: [
      'entities.enemy.id',
      'entities.enemy.count',
      'entities.enemy.health',
      'entities.enemy.movement.speed_px_per_sec',
      'game.difficulty',
      'game.target_play_time_sec'
    ] = [
      'entities.enemy.id',
      'entities.enemy.count',
      'entities.enemy.health',
      'entities.enemy.movement.speed_px_per_sec',
      'game.difficulty',
      'game.target_play_time_sec'
    ];
    const runtimeWave = resolveShooterEnemyWave(
      {
        enemy_waves: [
          {
            derived_from: derivedFrom,
            entity_id: 'alien',
            strategy: 'right_edge_wave',
            count: 3,
            max_active: 1,
            interval_ms: 500,
            speed_multiplier: 2
          }
        ]
      },
      defaultShooterParams
    );
    const fallbackWave = resolveShooterEnemyWave({ enemy_waves: [] }, defaultShooterParams);

    const state = createShooterRuntimeState(defaultShooterParams);
    advanceShooterWorld(state, defaultShooterParams, runtimeWave, 16, 0);
    advanceShooterWorld(state, defaultShooterParams, runtimeWave, 16, 1000);
    expect(state.enemiesSpawned).toBe(1);
    expect(state.enemies).toHaveLength(1);
    expect(state.enemies[0]).toMatchObject({
      entityId: 'alien',
      waveSource: 'runtime_plan',
      waveStrategy: 'right_edge_wave',
      speedMultiplier: 2
    });

    const slowState = createShooterRuntimeState(defaultShooterParams);
    const fastState = createShooterRuntimeState(defaultShooterParams);
    advanceShooterWorld(slowState, defaultShooterParams, fallbackWave, 100, 0);
    advanceShooterWorld(fastState, defaultShooterParams, runtimeWave, 100, 0);

    expect(fastState.enemies[0].x).toBeLessThan(slowState.enemies[0].x);
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
    const { resolveShooterEnemyWave } = await import('../../templates/phaser/shooter/src/shooter-runtime-plan.js');
    const { defaultShooterParams } = await import('../../templates/phaser/shooter/src/template-params.js');
    const state = createShooterRuntimeState(defaultShooterParams);
    const enemyWave = resolveShooterEnemyWave({ enemy_waves: [] }, defaultShooterParams);

    const originalX = state.player.x;
    expect(moveShooterPlayer(state, defaultShooterParams, { right: true }, 250)).toBe(true);
    expect(state.player.x).toBeGreaterThan(originalX);

    expect(advanceShooterWorld(state, defaultShooterParams, enemyWave, 16, 0).hits).toHaveLength(0);
    expect(tryFireShooterProjectile(state, defaultShooterParams, 500)).toBeTruthy();

    let hits = 0;
    for (let frame = 1; frame <= 80 && hits === 0; frame += 1) {
      hits = advanceShooterWorld(state, defaultShooterParams, enemyWave, 16, frame * 16).hits.length;
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

function spawnedItems(): TemplateTelemetryEvent[] {
  return globalThis.__GAME_QA__?.telemetry().filter((event) => event.type === 'item.spawned') ?? [];
}

function createPhaserSceneMock() {
  type ChainMock = Record<string, (...args: unknown[]) => unknown>;
  const graphics: ChainMock = {
    fillStyle: () => graphics,
    fillRect: () => graphics,
    fillRoundedRect: () => graphics,
    fillCircle: () => graphics,
    fillTriangle: () => graphics,
    lineStyle: () => graphics,
    lineBetween: () => graphics,
    strokeCircle: () => graphics,
    strokeRoundedRect: () => graphics,
    clear: () => graphics,
    setVisible: () => graphics,
    setY: () => graphics,
    destroy: () => undefined
  };
  const text: ChainMock = {
    setText: () => text,
    setX: () => text,
    setY: () => text,
    setVisible: () => text,
    destroy: () => undefined
  };

  return {
    cameras: { main: { setBackgroundColor: () => undefined } },
    add: {
      graphics: () => graphics,
      text: () => text
    }
  };
}
