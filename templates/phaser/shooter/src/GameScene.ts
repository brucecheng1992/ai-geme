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
  private enemiesCleared = 0;
  private projectileInFlight = false;
  private phaserScene?: Phaser.Scene;
  private scoreText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private projectileGraphics?: Phaser.GameObjects.Graphics;

  constructor(private readonly params: ShooterTemplateParams) {
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
    this.spawn.spawn('enemy');
    exposeRuntime(this.state, new QaBridge(this.state, () => this.start(), () => this.restart()));
    this.renderFirstFrame();
  }

  start(): void {
    this.input.receive('start');
    this.gameState.start();
    this.renderHud();
  }

  fire(): void {
    this.input.receive('fire');
    this.telemetry.emit('player.fired');
    this.spawn.spawn('projectile');
    this.projectileInFlight = true;
    this.renderProjectile(true);
  }

  hitEnemy(): void {
    if (!this.projectileInFlight) {
      return;
    }

    this.projectileInFlight = false;
    this.movement.move();
    this.collision.collide({ source: 'projectile', target: 'enemy' });
    this.telemetry.emit('enemy.hit', { damage: this.params.projectile.damage });
    this.enemiesCleared += 1;
    this.telemetry.emit('enemy.cleared', { count: this.enemiesCleared });
    this.score.add(this.params.scoring.scorePerEnemy);
    this.objective.completeWhen(this.enemiesCleared >= (this.params.objective.targetCount ?? this.params.enemy.count));
    this.renderProjectile(false);
    this.renderHud();
  }

  restart(): void {
    this.input.receive('restart');
    this.enemiesCleared = 0;
    this.projectileInFlight = false;
    this.gameState.restart();
    this.renderProjectile(false);
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
      .fillStyle(0x152945, 1)
      .fillRoundedRect(24, 24, this.params.world.width - 48, this.params.world.height - 48, 24)
      .lineStyle(4, 0x74d7ff, 0.45)
      .strokeRoundedRect(24, 24, this.params.world.width - 48, this.params.world.height - 48, 24);

    this.drawCatPlayer(this.params.player.startX, this.params.player.startY);
    this.drawAlienEnemy(this.params.world.width - 180, this.params.player.startY);

    this.scoreText = scene.add.text(40, 32, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#f8fbff'
    });
    this.statusText = scene.add.text(40, this.params.world.height - 74, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#d6ecff'
    });
    this.renderHud();
  }

  private drawCatPlayer(x: number, y: number): void {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return;
    }

    const graphics = scene.add.graphics();
    graphics
      .fillStyle(0xffc36b, 1)
      .fillTriangle(x - 34, y - 38, x - 16, y - 72, x + 2, y - 36)
      .fillTriangle(x + 34, y - 38, x + 16, y - 72, x - 2, y - 36)
      .fillStyle(0xffd28a, 1)
      .fillCircle(x, y, 44)
      .fillStyle(0xffffff, 1)
      .fillCircle(x - 15, y - 8, 8)
      .fillCircle(x + 15, y - 8, 8)
      .fillStyle(0x122033, 1)
      .fillCircle(x - 15, y - 8, 4)
      .fillCircle(x + 15, y - 8, 4)
      .fillStyle(0xff7aa7, 1)
      .fillTriangle(x - 6, y + 8, x + 6, y + 8, x, y + 18)
      .lineStyle(4, 0xffd28a, 1)
      .strokeCircle(x - 42, y + 24, 16);
    scene.add.text(x - 48, y + 56, this.params.player.label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#ffe8bc'
    });
  }

  private drawAlienEnemy(x: number, y: number): void {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return;
    }

    const graphics = scene.add.graphics();
    graphics
      .lineStyle(5, 0x86ffb7, 1)
      .lineBetween(x - 22, y - 42, x - 50, y - 74)
      .lineBetween(x + 22, y - 42, x + 50, y - 74)
      .fillStyle(0x72f28f, 1)
      .fillCircle(x - 54, y - 78, 8)
      .fillCircle(x + 54, y - 78, 8)
      .fillRoundedRect(x - 54, y - 42, 108, 86, 34)
      .fillStyle(0x102334, 1)
      .fillCircle(x - 20, y - 8, 10)
      .fillCircle(x + 20, y - 8, 10)
      .lineStyle(4, 0x102334, 1)
      .lineBetween(x - 20, y + 22, x + 20, y + 22);
    scene.add.text(x - 42, y + 56, this.params.enemy.label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#c9ffd7'
    });
  }

  private renderProjectile(visible: boolean): void {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return;
    }

    this.projectileGraphics?.destroy();
    this.projectileGraphics = undefined;

    if (!visible) {
      return;
    }

    this.projectileGraphics = scene.add.graphics();
    this.projectileGraphics
      .fillStyle(0x89e7ff, 1)
      .fillRoundedRect(this.params.player.startX + 62, this.params.player.startY - 8, 420, 16, 8)
      .fillStyle(0xffffff, 1)
      .fillCircle(this.params.world.width - 230, this.params.player.startY, 14);
  }

  private renderHud(): void {
    this.scoreText?.setText(`Score ${this.state.score}`);
    this.statusText?.setText('Enter start  Space fire  ArrowRight hit  R restart');
  }
}
