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
  private statusText?: Phaser.GameObjects.Text;

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
    this.spawn.spawn('hazard');
    exposeRuntime(this.state, new QaBridge(this.state, () => this.start(), () => this.restart()));
    this.renderFirstFrame();
  }

  start(): void {
    this.input.receive('start');
    this.gameState.start();
    this.renderHud();
  }

  dodgeFrame(): void {
    this.input.receive('move');
    this.movement.move();
    this.state.frame += 1;
    this.telemetry.emit('survival_time.changed', { frame: this.state.frame });
    this.objective.completeWhen(this.state.frame * 1000 >= this.params.objective.surviveDurationMs);
    this.renderHud();
  }

  hitHazard(): void {
    this.collision.collide({ source: 'player', target: 'hazard' });
    this.state.health -= this.params.hazard.damage;
    this.telemetry.emit('player.damaged', { health: this.state.health });
    this.objective.loseWhen(this.state.health <= 0);
    this.renderHud();
  }

  restart(): void {
    this.input.receive('restart');
    this.gameState.restart();
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

    this.drawCatPlayer(this.params.player.startX, this.params.player.startY);
    this.drawHazard(this.params.world.width - 190, 130);
    this.statusText = scene.add.text(40, this.params.world.height - 74, '', { fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#f8fbff' });
    this.renderHud();
  }

  private drawCatPlayer(x: number, y: number): void {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return;
    }

    scene.add
      .graphics()
      .fillStyle(0xffd28a, 1)
      .fillCircle(x, y, 42)
      .fillTriangle(x - 32, y - 32, x - 14, y - 66, x + 2, y - 30)
      .fillTriangle(x + 32, y - 32, x + 14, y - 66, x - 2, y - 30)
      .fillStyle(0x112033, 1)
      .fillCircle(x - 14, y - 7, 5)
      .fillCircle(x + 14, y - 7, 5)
      .fillStyle(0xff7aa7, 1)
      .fillTriangle(x - 6, y + 10, x + 6, y + 10, x, y + 20);
    scene.add.text(x - 44, y + 54, this.params.player.label, { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#ffe8bc' });
  }

  private drawHazard(x: number, y: number): void {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return;
    }

    scene.add
      .graphics()
      .fillStyle(0x9ca3af, 1)
      .fillTriangle(x - 48, y + 36, x - 6, y - 50, x + 54, y + 28)
      .fillStyle(0x4b5563, 1)
      .fillTriangle(x - 28, y + 24, x + 6, y - 28, x + 34, y + 20);
    scene.add.text(x - 48, y + 54, this.params.hazard.label, { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#e5e7eb' });
  }

  private renderHud(): void {
    this.statusText?.setText(`Health ${this.state.health}  Time ${this.state.frame}s  Enter start  ArrowRight dodge  H hit  R restart`);
  }
}
