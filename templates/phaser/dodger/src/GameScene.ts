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
import type { DodgerTemplateParams } from './template-params.js';

type Hitbox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export class DodgerGameScene {
  private readonly state;
  private readonly telemetry;
  private readonly input;
  private readonly movement;
  private readonly spawn;
  private readonly collision;
  private readonly score;
  private readonly gameState;
  private readonly objective;
  private phaserScene?: Phaser.Scene;
  private playerGraphics?: Phaser.GameObjects.Graphics;
  private playerLabel?: Phaser.GameObjects.Text;
  private hazardGraphics?: Phaser.GameObjects.Graphics;
  private hazardLabel?: Phaser.GameObjects.Text;
  private scoreText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private playerLaneIndex = 1;
  private hazardLaneIndex = 1;
  private hazardX = 0;
  private nextHazardDelayMs = 0;
  private hazardWaveIndex = 0;
  private survivalElapsedMs = 0;
  private survivalHudSeconds = 0;
  private hazardResolved = false;
  private hazardImpactHoldMs = 0;
  private hazardActive = false;

  constructor(private readonly params: DodgerTemplateParams) {
    this.state = createRuntimeState(params.player.health);
    this.telemetry = new TelemetrySystem(this.state);
    this.input = new InputSystem(this.telemetry);
    this.movement = new MovementSystem(this.telemetry);
    this.spawn = new SpawnSystem(this.telemetry);
    this.collision = new CollisionSystem(this.telemetry);
    this.score = new ScoreSystem(this.state, this.telemetry);
    this.gameState = new GameStateSystem(this.state, this.telemetry);
    this.objective = new ObjectiveSystem(this.state, this.gameState);
  }

  create(phaserScene?: Phaser.Scene): void {
    this.phaserScene = phaserScene;
    this.gameState.ready();
    if (this.params.collectible) {
      this.spawn.spawn('item');
    }
    exposeRuntime(
      this.state,
      new QaBridge(this.state, () => this.start(), () => this.restart(), () => ({
        player: { x: this.params.player.startX, y: this.playerY, lane: this.playerLaneIndex },
        hazard: { x: this.hazardX, y: this.hazardY, lane: this.hazardLaneIndex, active: this.hazardActive }
      }))
    );
    this.renderFirstFrame();
    this.start();
  }

  start(): void {
    if (this.state.gameStatus === 'PLAYING') {
      return;
    }

    this.input.receive('start');
    this.gameState.start();
    this.renderHud();
  }

  update(deltaMs: number): void {
    if (this.state.gameStatus !== 'PLAYING') {
      return;
    }

    this.advanceSurvival(deltaMs);
    this.advanceHazard(deltaMs);
    this.renderHud();
  }

  dodgeFrame(): void {
    this.input.receive('move');
    this.movePlayerToLane(this.playerLaneIndex === 1 ? 2 : 1);
    this.advanceSurvival(1000);
    this.advanceHazard(200);
    this.renderHud();
  }

  hitHazard(): void {
    this.collision.collide({ source: 'player', target: 'hazard' });
    this.state.health -= this.params.hazard.damage;
    this.telemetry.emit('player.damaged', { health: this.state.health });
    this.objective.loseWhen(this.state.health <= 0);
    this.renderHud();
  }

  collectItem(): void {
    if (!this.params.collectible) {
      return;
    }

    this.input.receive('move');
    this.movement.move();
    this.collision.collide({ source: 'player', target: 'collectible' });
    this.telemetry.emit('item.collected', { label: this.params.collectible.label });
    this.score.add(this.params.collectible.scorePerItem);
    this.renderHud();
  }

  restart(): void {
    this.input.receive('restart');
    this.gameState.restart();
    this.survivalElapsedMs = 0;
    this.survivalHudSeconds = 0;
    this.hazardWaveIndex = 0;
    this.movePlayerToLane(1);
    this.spawnNextHazard();
    this.start();
  }

  moveUp(): void {
    this.input.receive('move');
    this.movePlayerToLane(this.playerLaneIndex - 1);
    this.renderHud();
  }

  moveDown(): void {
    this.input.receive('move');
    this.movePlayerToLane(this.playerLaneIndex + 1);
    this.renderHud();
  }

  private renderFirstFrame(): void {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return;
    }

    scene.cameras.main.setBackgroundColor('#07111f');
    scene.add
      .graphics()
      .fillStyle(0x07111f, 1)
      .fillRect(0, 0, this.params.world.width, this.params.world.height)
      .fillStyle(0x2a2438, 1)
      .fillRoundedRect(24, 24, this.params.world.width - 48, this.params.world.height - 48, 24)
      .lineStyle(4, 0xffcf6b, 0.5)
      .strokeRoundedRect(24, 24, this.params.world.width - 48, this.params.world.height - 48, 24);

    this.drawLaneGuides();
    this.drawCatPlayer(this.params.player.startX, this.playerY);
    if (this.params.collectible) {
      this.drawCollectible(this.params.world.width - 360, this.params.player.startY);
    }
    this.spawnNextHazard();
    this.drawHazard(this.hazardX, this.hazardY);
    this.scoreText = scene.add.text(40, 32, '', { fontFamily: 'Arial, sans-serif', fontSize: '28px', color: '#f8fbff' });
    this.statusText = scene.add.text(40, this.params.world.height - 74, '', { fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#f8fbff' });
    this.renderHud();
  }

  private drawCatPlayer(x: number, y: number): void {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return;
    }

    this.playerGraphics = scene.add
      .graphics();
    this.playerGraphics
      .fillStyle(0xffd28a, 1)
      .fillCircle(x, y, 42)
      .fillTriangle(x - 32, y - 32, x - 14, y - 66, x + 2, y - 30)
      .fillTriangle(x + 32, y - 32, x + 14, y - 66, x - 2, y - 30)
      .fillStyle(0x112033, 1)
      .fillCircle(x - 14, y - 7, 5)
      .fillCircle(x + 14, y - 7, 5)
      .fillStyle(0xff7aa7, 1)
      .fillTriangle(x - 6, y + 10, x + 6, y + 10, x, y + 20);
    this.playerLabel = scene.add.text(x - 44, y + 54, this.params.player.label, { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#ffe8bc' });
  }

  private drawHazard(x: number, y: number): void {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return;
    }

    this.hazardGraphics = scene.add
      .graphics();
    this.renderHazardShape(false);
    this.hazardLabel = scene.add.text(x - 48, y + 54, this.params.hazard.label, { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#e5e7eb' });
  }

  private renderHazardShape(isImpact: boolean): void {
    if (this.hazardGraphics === undefined) {
      return;
    }

    const x = this.hazardX;
    const y = this.hazardY;
    const outerColor = isImpact ? 0xff4f5f : 0x9ca3af;
    const innerColor = isImpact ? 0x7f1d1d : 0x4b5563;

    this.hazardGraphics
      .clear()
      .fillStyle(0x9ca3af, 1)
      .fillStyle(outerColor, 1)
      .fillTriangle(x - 48, y + 36, x - 6, y - 50, x + 54, y + 28)
      .fillStyle(innerColor, 1)
      .fillTriangle(x - 28, y + 24, x + 6, y - 28, x + 34, y + 20);
  }

  private drawCollectible(x: number, y: number): void {
    const scene = this.phaserScene;
    if (scene === undefined || !this.params.collectible) {
      return;
    }

    scene.add
      .graphics()
      .fillStyle(0xffd95a, 1)
      .fillCircle(x, y, 36)
      .lineStyle(5, 0xfff0a3, 1)
      .strokeCircle(x, y, 26)
      .lineStyle(4, 0x8f5a00, 1)
      .lineBetween(x - 14, y, x + 14, y);
    scene.add.text(x - 38, y + 50, this.params.collectible.label, { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#fff0a3' });
  }

  private renderHud(): void {
    const collectHint = this.params.collectible ? '  C collect' : '';
    this.scoreText?.setText(this.params.collectible ? `Score ${this.state.score}/${this.params.collectible.count}` : '');
    this.statusText?.setText(`Health ${this.state.health}  Time ${this.state.frame}s  Running  ArrowUp/Down dodge  ArrowRight quick dodge  H hit${collectHint}  R restart`);
  }

  private advanceSurvival(deltaMs: number): void {
    this.survivalElapsedMs += deltaMs;
    const nextHudSeconds = Math.floor(this.survivalElapsedMs / 1000);

    if (nextHudSeconds > this.survivalHudSeconds) {
      this.survivalHudSeconds = nextHudSeconds;
      this.state.frame = nextHudSeconds;
      this.telemetry.emit('survival_time.changed', { frame: this.state.frame });
      this.objective.completeWhen(this.survivalElapsedMs >= this.params.objective.surviveDurationMs);
    }
  }

  private advanceHazard(deltaMs: number): void {
    if (this.hazardImpactHoldMs > 0) {
      this.hazardImpactHoldMs = Math.max(0, this.hazardImpactHoldMs - deltaMs);
      if (this.hazardImpactHoldMs === 0) {
        this.hideHazardForNextSpawn();
      }
      return;
    }

    if (!this.hazardActive) {
      this.nextHazardDelayMs = Math.max(0, this.nextHazardDelayMs - deltaMs);
      if (this.nextHazardDelayMs === 0) {
        this.spawnNextHazard();
      }
      return;
    }

    this.hazardX -= (this.params.hazard.speedPxPerSec * deltaMs) / 1000;
    this.resolveHazardCollision();

    if (this.hazardX < 70) {
      this.hideHazardForNextSpawn();
      return;
    }

    if (!this.hazardResolved) {
      this.renderHazardShape(false);
    }
    this.hazardLabel?.setX(this.hazardX - 48);
  }

  private spawnNextHazard(): void {
    this.hazardX = this.params.world.width + 90;
    this.hazardLaneIndex = this.nextHazardLaneIndex();
    this.hazardResolved = false;
    this.hazardImpactHoldMs = 0;
    this.hazardActive = true;
    this.nextHazardDelayMs = 0;
    this.renderHazardShape(false);
    this.hazardGraphics?.setVisible(true);
    this.hazardLabel?.setX(this.hazardX - 48);
    this.hazardLabel?.setY(this.hazardY + 54);
    this.hazardLabel?.setVisible(true);
    this.spawn.spawn('hazard');
  }

  private hideHazardForNextSpawn(): void {
    this.hazardActive = false;
    this.hazardResolved = false;
    this.nextHazardDelayMs = Math.max(260, this.params.hazard.spawnIntervalMs * 0.45);
    this.hazardGraphics?.setVisible(false);
    this.hazardLabel?.setVisible(false);
  }

  private nextHazardLaneIndex(): number {
    const laneIndex = (this.hazardWaveIndex + 1) % this.laneYValues.length;
    this.hazardWaveIndex += 1;
    return laneIndex;
  }

  private drawLaneGuides(): void {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return;
    }

    const graphics = scene.add.graphics().lineStyle(2, 0xffcf6b, 0.18);
    for (const laneY of this.laneYValues) {
      graphics.lineBetween(72, laneY + 70, this.params.world.width - 72, laneY + 70);
    }
  }

  private movePlayerToLane(nextLaneIndex: number): void {
    const boundedLaneIndex = Math.max(0, Math.min(this.laneYValues.length - 1, nextLaneIndex));
    if (boundedLaneIndex === this.playerLaneIndex) {
      return;
    }

    this.playerLaneIndex = boundedLaneIndex;
    this.playerGraphics?.setY(this.playerY - this.params.player.startY);
    this.playerLabel?.setY(this.playerY + 54);
    this.movement.move({ lane: this.playerLaneIndex, y: this.playerY });
  }

  private resolveHazardCollision(): void {
    if (!this.hazardActive || this.hazardResolved || !hitboxesOverlap(this.playerHitbox, this.hazardHitbox)) {
      return;
    }

    this.hazardResolved = true;
    this.hazardImpactHoldMs = 1200;
    this.renderHazardShape(true);
    this.hitHazard();
  }

  private get laneYValues(): number[] {
    return [this.params.player.startY - 110, this.params.player.startY, this.params.player.startY + 110];
  }

  private get playerY(): number {
    return this.laneYValues[this.playerLaneIndex] ?? this.params.player.startY;
  }

  private get hazardY(): number {
    return this.laneYValues[this.hazardLaneIndex] ?? this.params.player.startY;
  }

  private get playerHitbox(): Hitbox {
    return {
      left: this.params.player.startX - 30,
      right: this.params.player.startX + 30,
      top: this.playerY - 30,
      bottom: this.playerY + 34
    };
  }

  private get hazardHitbox(): Hitbox {
    return {
      left: this.hazardX - 24,
      right: this.hazardX + 30,
      top: this.hazardY - 24,
      bottom: this.hazardY + 26
    };
  }
}

function hitboxesOverlap(a: Hitbox, b: Hitbox): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
