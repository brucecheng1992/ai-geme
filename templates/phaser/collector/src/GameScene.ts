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
import type { CollectorAssetTelemetry } from './collector-art-library.js';
import type { CollectorTemplateParams } from './template-params.js';

type CollectorArtRuntime = {
  addImage(scene: Phaser.Scene, role: 'background' | 'player_character' | 'collectible', x: number, y: number, displayWidth: number, displayHeight: number): Phaser.GameObjects.Image | undefined;
  telemetry(): CollectorAssetTelemetry;
};

export class CollectorGameScene {
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
  private scoreText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private readonly endScreen: EndScreenRenderer;

  constructor(
    private readonly params: CollectorTemplateParams,
    private readonly art?: CollectorArtRuntime
  ) {
    this.state = createRuntimeState(1);
    this.telemetry = new TelemetrySystem(this.state);
    this.input = new InputSystem(this.telemetry);
    this.movement = new MovementSystem(this.telemetry);
    this.spawn = new SpawnSystem(this.telemetry);
    this.collision = new CollisionSystem(this.telemetry);
    this.score = new ScoreSystem(this.state, this.telemetry);
    this.gameState = new GameStateSystem(this.state, this.telemetry);
    this.objective = new ObjectiveSystem(this.state, this.gameState);
    this.endScreen = new EndScreenRenderer(params.world, params.ui.screens);
  }

  create(phaserScene?: Phaser.Scene): void {
    this.phaserScene = phaserScene;
    this.gameState.ready();
    this.spawn.spawn('item');
    exposeRuntime(this.state, new QaBridge(this.state, () => this.start(), () => this.restart()), () => ({
      assets: this.art?.telemetry()
    }));
    this.renderFirstFrame();
  }

  start(): void {
    this.input.receive('start');
    this.gameState.start();
    this.renderHud();
  }

  collectItem(): void {
    this.input.receive('move');
    this.movement.move();
    this.collision.collide({ source: 'player', target: 'collectible' });
    this.telemetry.emit('item.collected');
    this.score.add(this.params.collectible.scorePerItem);
    this.objective.completeWhen(this.state.score >= this.params.objective.targetScore);
    this.renderEndScreenIfTerminal();
    this.renderHud();
  }

  restart(): void {
    this.input.receive('restart');
    this.gameState.restart();
    this.endScreen.clear();
    this.renderHud();
  }

  private renderFirstFrame(): void {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return;
    }

    scene.cameras.main.setBackgroundColor('#07111f');
    const background = this.art?.addImage(scene, 'background', this.params.world.width / 2, this.params.world.height / 2, this.params.world.width, this.params.world.height);
    if (background === undefined) {
      scene.add
        .graphics()
        .fillStyle(0x07111f, 1)
        .fillRect(0, 0, this.params.world.width, this.params.world.height)
        .fillStyle(0x123323, 1)
        .fillRoundedRect(24, 24, this.params.world.width - 48, this.params.world.height - 48, 24)
        .lineStyle(4, 0x7cff9b, 0.45)
        .strokeRoundedRect(24, 24, this.params.world.width - 48, this.params.world.height - 48, 24);
    }

    this.drawPlayer(this.params.player.startX, this.params.player.startY);
    this.drawCollectible(this.params.world.width - 190, this.params.player.startY);
    this.scoreText = scene.add.text(40, 32, '', { fontFamily: 'Arial, sans-serif', fontSize: '28px', color: '#f8fbff' });
    this.statusText = scene.add.text(40, this.params.world.height - 74, '', { fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#d6ecff' });
    this.renderHud();
  }

  private drawPlayer(x: number, y: number): void {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return;
    }

    const player = this.art?.addImage(scene, 'player_character', x, y, 86, 86);
    if (player !== undefined) {
      scene.add.text(x - 44, y + 54, this.params.player.label, { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#ffe8bc' });
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

  private drawCollectible(x: number, y: number): void {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return;
    }

    const collectible = this.art?.addImage(scene, 'collectible', x, y, 84, 84);
    if (collectible !== undefined) {
      scene.add.text(x - 42, y + 54, this.params.collectible.label, { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#fff0a3' });
      return;
    }

    scene.add
      .graphics()
      .fillStyle(0xffd95a, 1)
      .fillCircle(x, y, 42)
      .lineStyle(6, 0xfff0a3, 1)
      .strokeCircle(x, y, 30)
      .lineStyle(4, 0x8f5a00, 1)
      .lineBetween(x - 16, y, x + 16, y);
    scene.add.text(x - 42, y + 54, this.params.collectible.label, { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#fff0a3' });
  }

  private renderHud(): void {
    this.scoreText?.setText(`Score ${this.state.score}/${this.params.objective.targetScore}`);
    this.statusText?.setText('Enter start  ArrowRight collect  R restart');
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
}
