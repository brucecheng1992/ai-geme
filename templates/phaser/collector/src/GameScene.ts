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
import type { RuntimeAuthoritySnapshot } from '../../shared/runtime-authority.js';
import type { CollectorAssetTelemetry } from './collector-art-library.js';
import type { CollectorTemplateParams } from './template-params.js';

type CollectorArtRuntime = {
  addImage(scene: Phaser.Scene, role: 'background' | 'player_character' | 'collectible', x: number, y: number, displayWidth: number, displayHeight: number): Phaser.GameObjects.Image | undefined;
  telemetry(): CollectorAssetTelemetry;
};

type CollectorDirection = 'left' | 'right' | 'up' | 'down';
type CollectorPoint = { x: number; y: number };
type CollectorRenderObject = {
  setPosition(x: number, y: number): unknown;
};

const COLLECTOR_PLAYER_RADIUS = 42;
const COLLECTOR_ITEM_RADIUS = 42;

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
  private readonly moveInput: Record<CollectorDirection, boolean> = { left: false, right: false, up: false, down: false };
  private playerPosition: CollectorPoint;
  private collectiblePosition: CollectorPoint;
  private playerObject?: CollectorRenderObject;
  private playerLabel?: CollectorRenderObject;
  private collectibleObject?: CollectorRenderObject;
  private collectibleLabel?: CollectorRenderObject;

  constructor(
    private readonly params: CollectorTemplateParams,
    private readonly art?: CollectorArtRuntime,
    private readonly runtimeAuthority?: RuntimeAuthoritySnapshot
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
    this.playerPosition = { x: params.player.startX, y: params.player.startY };
    this.collectiblePosition = this.nextCollectiblePosition(0);
  }

  create(phaserScene?: Phaser.Scene): void {
    this.phaserScene = phaserScene;
    this.gameState.ready();
    this.spawn.spawn('item');
    exposeRuntime(
      this.state,
      new QaBridge(this.state, () => this.start(), () => this.restart(), () => ({
        player: { ...this.playerPosition },
        collectible: { ...this.collectiblePosition },
        runtimeAuthority: this.runtimeAuthority
      })),
      () => ({
        assets: this.art?.telemetry()
      })
    );
    this.renderFirstFrame();
  }

  start(): void {
    this.input.receive('start');
    this.gameState.start();
    this.renderHud();
  }

  collectItem(): void {
    this.collision.collide({ source: 'player', target: 'collectible' });
    this.telemetry.emit('item.collected');
    this.score.add(this.params.collectible.scorePerItem);
    this.objective.completeWhen(this.state.score >= this.params.objective.targetScore);
    this.moveCollectibleToNextPosition();
    this.renderEndScreenIfTerminal();
    this.renderHud();
  }

  setMoveInput(direction: CollectorDirection, pressed: boolean): void {
    if (pressed && !this.moveInput[direction]) {
      this.input.receive('move');
    }
    this.moveInput[direction] = pressed;
  }

  update(deltaMs: number): void {
    if (this.state.gameStatus !== 'PLAYING') {
      return;
    }

    this.state.frame += 1;
    const previous = { ...this.playerPosition };
    if (this.movePlayer(deltaMs)) {
      this.movement.move({ fromX: previous.x, fromY: previous.y, toX: this.playerPosition.x, toY: this.playerPosition.y });
    }

    if (this.playerOverlapsCollectible()) {
      this.collectItem();
    }
  }

  restart(): void {
    this.input.receive('restart');
    this.gameState.restart();
    this.resetMoveInput();
    this.playerPosition = { x: this.params.player.startX, y: this.params.player.startY };
    this.collectiblePosition = this.nextCollectiblePosition(0);
    this.syncPositions();
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

    this.drawPlayer(this.playerPosition.x, this.playerPosition.y);
    this.drawCollectible(this.collectiblePosition.x, this.collectiblePosition.y);
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
      this.playerObject = player;
      this.playerLabel = scene.add.text(x - 44, y + 54, this.params.player.label, { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#ffe8bc' });
      return;
    }

    this.playerObject = scene.add
      .graphics()
      .fillStyle(0xffd28a, 1)
      .fillCircle(0, 0, 42)
      .fillTriangle(-32, -32, -14, -66, 2, -30)
      .fillTriangle(32, -32, 14, -66, -2, -30)
      .fillStyle(0x112033, 1)
      .fillCircle(-14, -7, 5)
      .fillCircle(14, -7, 5)
      .fillStyle(0xff7aa7, 1)
      .fillTriangle(-6, 10, 6, 10, 0, 20)
      .setPosition(x, y);
    this.playerLabel = scene.add.text(x - 44, y + 54, this.params.player.label, { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#ffe8bc' });
  }

  private drawCollectible(x: number, y: number): void {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return;
    }

    const collectible = this.art?.addImage(scene, 'collectible', x, y, 84, 84);
    if (collectible !== undefined) {
      this.collectibleObject = collectible;
      this.collectibleLabel = scene.add.text(x - 42, y + 54, this.params.collectible.label, { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#fff0a3' });
      return;
    }

    this.collectibleObject = scene.add
      .graphics()
      .fillStyle(0xffd95a, 1)
      .fillCircle(0, 0, 42)
      .lineStyle(6, 0xfff0a3, 1)
      .strokeCircle(0, 0, 30)
      .lineStyle(4, 0x8f5a00, 1)
      .lineBetween(-16, 0, 16, 0)
      .setPosition(x, y);
    this.collectibleLabel = scene.add.text(x - 42, y + 54, this.params.collectible.label, { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#fff0a3' });
  }

  private renderHud(): void {
    this.scoreText?.setText(`Score ${this.state.score}/${this.params.objective.targetScore}`);
    this.statusText?.setText('Enter start  Arrow/WASD move  R restart');
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

  private movePlayer(deltaMs: number): boolean {
    const horizontal = Number(this.moveInput.right) - Number(this.moveInput.left);
    const vertical = Number(this.moveInput.down) - Number(this.moveInput.up);
    if (horizontal === 0 && vertical === 0) {
      return false;
    }

    const magnitude = Math.hypot(horizontal, vertical);
    const distance = this.params.player.speedPxPerSec * (deltaMs / 1000);
    this.playerPosition = {
      x: clamp(this.playerPosition.x + (horizontal / magnitude) * distance, COLLECTOR_PLAYER_RADIUS, this.params.world.width - COLLECTOR_PLAYER_RADIUS),
      y: clamp(this.playerPosition.y + (vertical / magnitude) * distance, COLLECTOR_PLAYER_RADIUS, this.params.world.height - COLLECTOR_PLAYER_RADIUS)
    };
    this.syncPlayerPosition();
    return true;
  }

  private playerOverlapsCollectible(): boolean {
    return Math.hypot(this.playerPosition.x - this.collectiblePosition.x, this.playerPosition.y - this.collectiblePosition.y) <= COLLECTOR_PLAYER_RADIUS + COLLECTOR_ITEM_RADIUS;
  }

  private moveCollectibleToNextPosition(): void {
    this.collectiblePosition = this.nextCollectiblePosition(this.state.score);
    this.syncCollectiblePosition();
  }

  private nextCollectiblePosition(index: number): CollectorPoint {
    const positions: CollectorPoint[] = [
      { x: this.params.world.width - 190, y: this.params.player.startY },
      { x: 190, y: 150 },
      { x: this.params.world.width - 220, y: this.params.world.height - 150 },
      { x: this.params.world.width / 2, y: 120 }
    ];
    return positions[index % positions.length];
  }

  private syncPositions(): void {
    this.syncPlayerPosition();
    this.syncCollectiblePosition();
  }

  private syncPlayerPosition(): void {
    this.playerObject?.setPosition(this.playerPosition.x, this.playerPosition.y);
    this.playerLabel?.setPosition(this.playerPosition.x - 44, this.playerPosition.y + 54);
  }

  private syncCollectiblePosition(): void {
    this.collectibleObject?.setPosition(this.collectiblePosition.x, this.collectiblePosition.y);
    this.collectibleLabel?.setPosition(this.collectiblePosition.x - 42, this.collectiblePosition.y + 54);
  }

  private resetMoveInput(): void {
    this.moveInput.left = false;
    this.moveInput.right = false;
    this.moveInput.up = false;
    this.moveInput.down = false;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
