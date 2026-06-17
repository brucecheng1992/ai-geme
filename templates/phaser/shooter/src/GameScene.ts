import type Phaser from 'phaser';

import {
  CollisionSystem,
  GameStateSystem,
  InputSystem,
  MovementSystem,
  ObjectiveSystem,
  QaBridge,
  ScoreSystem,
  SpawnSystem,
  TelemetrySystem,
  createRuntimeState,
  exposeRuntime
} from '../../shared/kernel.js';
import { EndScreenRenderer } from '../../shared/end-screen.js';
import {
  advanceShooterWorld,
  createShooterRuntimeState,
  moveShooterPlayer,
  primeShooterEnemyWave,
  tryFireShooterProjectile,
  type ShooterDirection,
  type ShooterRuntimeState
} from './shooter-runtime.js';
import {
  defaultShooterRuntimePlan,
  resolveShooterEnemyWave,
  type ResolvedShooterEnemyWave,
  type ShooterRuntimePlan
} from './shooter-runtime-plan.js';
import type { ShooterArtRuntime } from './shooter-art-library.js';
import { createShooterRuntimeBridge, type ShooterLiveEditRegistry } from './live-edit-bridge.js';
import { ShooterRenderer } from './shooter-renderer.js';
import type { ShooterTemplateParams } from './template-params.js';

export class ShooterGameScene {
  private readonly state;
  private readonly telemetry;
  private readonly input;
  private readonly movement;
  private readonly spawn;
  private readonly collision;
  private readonly score;
  private readonly gameState;
  private readonly objective;
  private readonly renderer;
  private readonly endScreen: EndScreenRenderer;
  private enemyWave: ResolvedShooterEnemyWave;
  private readonly liveEditBridge;
  private runtime: ShooterRuntimeState;
  private readonly moveInput: Record<ShooterDirection, boolean> = { left: false, right: false, up: false, down: false };
  private phaserScene?: Phaser.Scene;

  constructor(
    private readonly params: ShooterTemplateParams,
    runtimePlan: ShooterRuntimePlan = defaultShooterRuntimePlan,
    private readonly art?: ShooterArtRuntime,
    liveEditRegistry?: Partial<ShooterLiveEditRegistry>
  ) {
    this.state = createRuntimeState(params.player.health);
    this.telemetry = new TelemetrySystem(this.state);
    this.input = new InputSystem(this.telemetry);
    this.movement = new MovementSystem(this.telemetry);
    this.spawn = new SpawnSystem(this.telemetry);
    this.collision = new CollisionSystem(this.telemetry);
    this.score = new ScoreSystem(this.state, this.telemetry);
    this.gameState = new GameStateSystem(this.state, this.telemetry);
    this.objective = new ObjectiveSystem(this.state, this.gameState);
    this.renderer = new ShooterRenderer(params, art);
    this.endScreen = new EndScreenRenderer(params.world, params.ui.screens);
    this.enemyWave = resolveShooterEnemyWave(runtimePlan, params);
    this.runtime = createShooterRuntimeState(params);
    this.liveEditBridge = createShooterRuntimeBridge({
      params,
      getRuntime: () => this.runtime,
      registry: {
        playerId: 'player_main',
        enemyTypeId: liveEditRegistry?.enemyTypeId ?? this.enemyWave.entityId,
        projectileId: liveEditRegistry?.projectileId ?? 'projectile',
        waveId: liveEditRegistry?.waveId ?? `${this.enemyWave.entityId}_wave`
      },
      renderer: this.renderer,
      setPlayerMaxHealth: (maxHealth) => {
        this.state.maxHealth = maxHealth;
        this.state.health = Math.min(this.state.health, maxHealth);
        this.renderHud();
      },
      setPlayerAppearance: () => {
        this.applyPlayerAppearance();
      },
      setEnemyAppearance: () => {
        this.applyEnemyAppearance();
      },
      setEnemyWaveCount: (count) => {
        this.applyEnemyWaveCount(count);
      },
      setWorldWidth: (width) => {
        this.applyWorldWidth(width);
      }
    });
    primeShooterEnemyWave(this.runtime, this.enemyWave);
  }

  create(phaserScene?: Phaser.Scene): void {
    this.phaserScene = phaserScene;
    this.gameState.ready();
    exposeRuntime(
      this.state,
      new QaBridge(this.state, () => this.start(), () => this.restart(), () => ({
        player: { ...this.runtime.player },
        enemiesActive: this.runtime.enemies.length,
        projectilesActive: this.runtime.projectiles.length,
        enemyProjectilesActive: this.runtime.projectiles.filter((projectile) => projectile.owner === 'enemy').length,
        enemiesCleared: this.runtime.enemiesCleared,
        enemyWavePlan: this.enemyWaveSnapshot()
      })),
      () => ({ assets: this.art?.telemetry() })
    );
    this.renderFirstFrame();
  }

  start(): void {
    this.input.receive('start');
    this.gameState.start();
    this.renderHud();
  }

  fire(): void {
    this.input.receive('fire');
    if (this.state.gameStatus !== 'PLAYING') {
      return;
    }

    const projectile = tryFireShooterProjectile(this.runtime, this.params, this.nowMs());
    if (projectile === undefined) {
      return;
    }

    this.telemetry.emit('player.fired');
    this.spawn.spawn('projectile');
    this.renderer.renderProjectile(this.requireScene(), projectile);
  }

  setMoveInput(direction: ShooterDirection, pressed: boolean): void {
    this.moveInput[direction] = pressed;
  }

  update(timeMs: number, deltaMs: number): void {
    if (this.state.gameStatus !== 'PLAYING') {
      return;
    }

    this.state.frame += 1;
    this.movePlayer(deltaMs);
    const step = advanceShooterWorld(this.runtime, this.params, this.enemyWave, deltaMs, timeMs);
    if (step.spawnedEnemy !== undefined) {
      this.spawn.spawn('enemy');
      this.renderer.renderEnemy(this.requireScene(), step.spawnedEnemy);
    }

    for (const projectile of step.enemyShots) {
      this.telemetry.emit('enemy.fired', { enemyId: projectile.sourceEnemyId, projectileId: projectile.id });
      this.spawn.spawn('projectile', { owner: 'enemy', enemyId: projectile.sourceEnemyId });
      this.renderer.renderProjectile(this.requireScene(), projectile);
    }

    for (const hit of step.hits) {
      this.collision.collide({ source: 'projectile', target: 'enemy', projectileId: hit.projectileId, enemyId: hit.enemyId });
      this.telemetry.emit('enemy.hit', {
        damage: this.params.projectile.damage,
        enemyId: hit.enemyId,
        entityId: hit.entityId,
        waveSource: hit.waveSource,
        strategy: hit.waveStrategy,
        speedMultiplier: hit.speedMultiplier
      });
      this.renderer.destroyProjectile(hit.projectileId);

      if (hit.cleared) {
        this.telemetry.emit('enemy.cleared', {
          count: this.runtime.enemiesCleared,
          enemyId: hit.enemyId,
          entityId: hit.entityId,
          waveSource: hit.waveSource,
          strategy: hit.waveStrategy,
          speedMultiplier: hit.speedMultiplier
        });
        this.score.add(this.params.scoring.scorePerEnemy);
        this.renderer.destroyEnemy(hit.enemyId);
      }
    }

    for (const enemyId of step.playerHits) {
      this.collision.collide({ source: 'enemy', target: 'player', enemyId });
      this.state.health = Math.max(0, this.state.health - 1);
      this.telemetry.emit('player.damaged', { health: this.state.health, enemyId });
      this.renderer.destroyEnemy(enemyId);
    }

    for (const projectile of step.playerProjectileHits) {
      this.collision.collide({ source: 'enemy_projectile', target: 'player', projectileId: projectile.id, enemyId: projectile.sourceEnemyId });
      this.state.health = Math.max(0, this.state.health - 1);
      this.telemetry.emit('player.damaged', { health: this.state.health, enemyId: projectile.sourceEnemyId, projectileId: projectile.id });
      this.renderer.destroyProjectile(projectile.id);
    }

    this.renderer.syncEntityPositions(this.requireScene(), this.runtime);
    this.objective.completeWhen(this.objectiveReached());
    this.objective.loseWhen(this.state.health <= 0);
    this.renderEndScreenIfTerminal();
    this.renderHud();
  }

  getLiveEditBridge(): ReturnType<typeof createShooterRuntimeBridge> {
    return this.liveEditBridge;
  }

  restart(): void {
    this.input.receive('restart');
    this.runtime = createShooterRuntimeState(this.params);
    primeShooterEnemyWave(this.runtime, this.enemyWave);
    this.resetMoveInput();
    this.renderer.clearDynamicObjects();
    this.renderer.setPlayerPosition(this.runtime.player.x, this.runtime.player.y);
    this.endScreen.clear();
    this.gameState.restart();
    this.renderHud();
  }

  private renderFirstFrame(): void {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return;
    }

    this.renderer.renderFirstFrame(scene, this.runtime);
    this.renderHud();
  }

  private movePlayer(deltaMs: number): void {
    const previous = { ...this.runtime.player };
    const moved = moveShooterPlayer(this.runtime, this.params, this.moveInput, deltaMs);
    if (!moved) {
      return;
    }

    this.renderer.setPlayerPosition(this.runtime.player.x, this.runtime.player.y);
    this.movement.move({ fromX: previous.x, fromY: previous.y, toX: this.runtime.player.x, toY: this.runtime.player.y });
  }

  private resetMoveInput(): void {
    this.moveInput.left = false;
    this.moveInput.right = false;
    this.moveInput.up = false;
    this.moveInput.down = false;
  }

  private applyEnemyWaveCount(count: number): void {
    this.params.enemy.count = count;
    if (this.params.objective.winType === 'enemy_cleared') {
      this.params.objective.targetCount = count;
    }
    this.enemyWave = {
      ...this.enemyWave,
      count,
      maxActive: Math.min(count, Math.max(1, this.enemyWave.maxActive))
    };
    this.restart();
  }

  private applyWorldWidth(width: number): void {
    this.params.world.width = width;
    this.phaserScene?.scale.resize(width, this.params.world.height);
    this.phaserScene?.cameras.main.setBounds(0, 0, width, this.params.world.height);
    this.restart();
  }

  private applyPlayerAppearance(): void {
    this.renderer.usePrimitivePlayerVisual();
    this.restart();
    this.renderer.renderPlayer(this.requireScene(), this.runtime);
  }

  private applyEnemyAppearance(): void {
    this.renderer.usePrimitiveEnemyVisual();
    this.restart();
  }

  private objectiveReached(): boolean {
    if (this.params.objective.winType === 'target_score') {
      return this.state.score >= (this.params.objective.targetScore ?? 1);
    }

    return this.runtime.enemiesCleared >= (this.params.objective.targetCount ?? this.params.enemy.count);
  }

  private requireScene(): Phaser.Scene {
    if (this.phaserScene === undefined) {
      throw new Error('Shooter scene is not initialized.');
    }

    return this.phaserScene;
  }

  private nowMs(): number {
    return this.phaserScene?.time.now ?? Date.now();
  }

  private renderHud(): void {
    this.renderer.renderHud(this.state.score, this.state.health, this.objectiveText());
  }

  private renderEndScreenIfTerminal(): void {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return;
    }
    if (this.state.gameStatus === 'WON') {
      this.endScreen.show(scene, 'win');
    } else if (this.state.gameStatus === 'LOST') {
      this.endScreen.show(scene, 'lose');
    }
  }

  private objectiveText(): string {
    if (this.params.objective.winType === 'target_score') {
      return `Objective Score ${this.state.score}/${this.params.objective.targetScore ?? 1}`;
    }

    return `Objective Clear enemies ${this.runtime.enemiesCleared}/${this.params.objective.targetCount ?? this.params.enemy.count}`;
  }

  private enemyWaveSnapshot() {
    return {
      derivedFrom: this.enemyWave.derivedFrom.join(','),
      entityId: this.enemyWave.entityId,
      strategy: this.enemyWave.strategy,
      count: this.enemyWave.count,
      maxActive: this.enemyWave.maxActive,
      intervalMs: this.enemyWave.intervalMs,
      speedMultiplier: this.enemyWave.speedMultiplier,
      source: this.enemyWave.source,
      spawned: this.runtime.enemiesSpawned,
      active: this.runtime.enemies.length
    };
  }
}
