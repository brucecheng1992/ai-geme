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
import { drawShooterEnemy, drawShooterPlayer, drawShooterProjectile } from './template-visuals.js';

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

    drawShooterPlayer(scene, this.params.player.startX, this.params.player.startY, this.params.player.label, this.params.player.visual);
    drawShooterEnemy(scene, this.params.world.width - 180, this.params.player.startY, this.params.enemy.label, this.params.enemy.visual);

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

    this.projectileGraphics = drawShooterProjectile(
      scene,
      this.params.player.startX + 62,
      this.params.player.startY,
      420,
      this.params.projectile.visual
    );
  }

  private renderHud(): void {
    this.scoreText?.setText(`Score ${this.state.score}`);
    this.statusText?.setText('Enter start  Space fire  ArrowRight hit  R restart');
  }
}
