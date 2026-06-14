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
import { createDodgerArtRuntime, emitCoinSpark, type DodgerArtRuntime } from './dodger-art-library.js';
import {
  defaultDodgerRuntimePlan,
  resolveDodgerDifficultyCurve,
  resolveDodgerDifficultyState,
  resolveDodgerSpawnRule,
  type DodgerDifficultyState,
  type DodgerRuntimePlan,
  type ResolvedDodgerSpawnRule
} from './dodger-runtime-plan.js';
import type { DodgerTemplateParams } from './template-params.js';

type Hitbox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type HazardSprite = {
  graphics?: Phaser.GameObjects.Graphics;
  image?: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  x: number;
  laneIndex: number;
  yOffset: number;
  speedPxPerSec: number;
  resolved: boolean;
  impactHoldMs: number;
  active: boolean;
};

type CollectibleSprite = {
  graphics?: Phaser.GameObjects.Graphics;
  image?: Phaser.GameObjects.Image;
  label?: Phaser.GameObjects.Text;
  x: number;
  y: number;
  slotIndex: number;
  speedPxPerSec: number;
  active: boolean;
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
  private playerImage?: Phaser.GameObjects.Image;
  private playerLabel?: Phaser.GameObjects.Text;
  private scoreText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private readonly endScreen: EndScreenRenderer;
  private playerLaneIndex = 1;
  private readonly hazards: HazardSprite[] = [];
  private nextHazardSpawnMs = 0;
  private lastHazardLaneIndex = -1;
  private hazardsSpawned = 0;
  private readonly collectibles: CollectibleSprite[] = [];
  private nextCollectibleSpawnMs = 0;
  private nextCollectibleSlotIndex = 0;
  private collectiblesSpawned = 0;
  private survivalElapsedMs = 0;
  private survivalHudSeconds = 0;

  constructor(
    private readonly params: DodgerTemplateParams,
    private readonly runtimePlan: DodgerRuntimePlan = defaultDodgerRuntimePlan,
    private readonly art: DodgerArtRuntime = createDodgerArtRuntime({ version: 'asset-manifest-v0.1', assets: [] })
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
    this.endScreen = new EndScreenRenderer(params.world, params.ui.screens);
  }

  create(phaserScene?: Phaser.Scene): void {
    this.phaserScene = phaserScene;
    this.gameState.ready();
    exposeRuntime(
      this.state,
      new QaBridge(this.state, () => this.start(), () => this.restart(), () => ({
        player: { x: this.params.player.startX, y: this.playerY, lane: this.playerLaneIndex },
        hazard: this.primaryHazardSnapshot,
        hazards: this.hazards.map((hazard) => this.hazardSnapshot(hazard)),
        collectibles: this.collectibles.map((collectible) => this.collectibleSnapshot(collectible)),
        difficultyPlan: this.difficultySnapshot(this.currentDifficultyState),
        spawnPlan: {
          hazard: this.spawnRuleSnapshot(this.hazardSpawnRule),
          ...(this.params.collectible ? { collectible: this.spawnRuleSnapshot(this.collectibleSpawnRule) } : {})
        }
      })),
      () => ({ assets: this.art.telemetry() })
    );
    this.renderFirstFrame();
    if (this.phaserScene === undefined) {
      this.spawnNextCollectible();
    }
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
    this.advanceCollectible(deltaMs);
    this.renderHud();
  }

  dodgeFrame(): void {
    this.input.receive('move');
    this.movePlayerToLane(this.playerLaneIndex === 1 ? 2 : 1);
    this.advanceSurvival(1000);
    this.advanceHazard(200);
    this.advanceCollectible(200);
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
    this.collectOverlappingItem();
    this.renderHud();
  }

  restart(): void {
    this.input.receive('restart');
    this.gameState.restart();
    this.survivalElapsedMs = 0;
    this.survivalHudSeconds = 0;
    this.lastHazardLaneIndex = -1;
    this.hazardsSpawned = 0;
    this.collectiblesSpawned = 0;
    this.nextCollectibleSpawnMs = 0;
    this.nextCollectibleSlotIndex = 0;
    this.clearHazards();
    this.clearCollectibles();
    this.endScreen.clear();
    this.movePlayerToLane(1);
    this.spawnNextHazard();
    this.spawnNextCollectible();
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
    const hasBackgroundImage = this.art.drawBackground(scene, this.params.world.width, this.params.world.height);
    const frameGraphics = scene.add.graphics();
    if (!hasBackgroundImage) {
      frameGraphics.fillStyle(0x07111f, 1).fillRect(0, 0, this.params.world.width, this.params.world.height);
    }
    frameGraphics
      .fillStyle(0x2a2438, 0.94)
      .fillRoundedRect(24, 24, this.params.world.width - 48, this.params.world.height - 48, 24)
      .lineStyle(4, 0xffcf6b, 0.5)
      .strokeRoundedRect(24, 24, this.params.world.width - 48, this.params.world.height - 48, 24);

    this.drawLaneGuides();
    this.drawCatPlayer(this.params.player.startX, this.playerY);
    this.scoreText = scene.add.text(40, 32, '', { fontFamily: 'Arial, sans-serif', fontSize: '28px', color: '#f8fbff' });
    this.statusText = scene.add.text(40, this.params.world.height - 74, '', { fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#f8fbff' });
    this.spawnNextHazard();
    this.spawnNextCollectible();
    this.renderHud();
  }

  private drawCatPlayer(x: number, y: number): void {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return;
    }

    this.playerImage = this.art.addImage(scene, 'player_character', x, y, 86, 86);
    if (this.playerImage !== undefined) {
      this.playerLabel = scene.add.text(x - 44, y + 54, this.params.player.label, { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#ffe8bc' });
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

  private createHazardSprite(x: number, laneIndex: number): HazardSprite | undefined {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return undefined;
    }

    const hazard: HazardSprite = {
      label: scene.add.text(x - 48, this.hazardY(laneIndex, 0) + 54, this.params.hazard.label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#e5e7eb'
      }),
      x,
      laneIndex,
      yOffset: randomBetween(-18, 18),
      speedPxPerSec: this.params.hazard.speedPxPerSec * randomBetween(0.82, 1.22) * this.currentDifficultyState.speedMultiplier,
      resolved: false,
      impactHoldMs: 0,
      active: true
    };
    hazard.image = this.art.addImage(scene, 'hazard', x, this.hazardY(laneIndex, hazard.yOffset), 78, 78);
    if (hazard.image === undefined) {
      hazard.graphics = scene.add.graphics();
    }
    this.renderHazardShape(hazard, false);
    return hazard;
  }

  private renderHazardShape(hazard: HazardSprite, isImpact: boolean): void {
    const x = hazard.x;
    const y = this.hazardY(hazard.laneIndex, hazard.yOffset);
    const outerColor = isImpact ? 0xff4f5f : 0x9ca3af;
    const innerColor = isImpact ? 0x7f1d1d : 0x4b5563;

    hazard.image?.setPosition(x, y);
    if (isImpact) {
      hazard.image?.setTint(0xff6b6b);
    } else {
      hazard.image?.clearTint();
    }
    hazard.graphics
      ?.clear()
      .fillStyle(outerColor, 1)
      .fillTriangle(x - 48, y + 36, x - 6, y - 50, x + 54, y + 28)
      .fillStyle(innerColor, 1)
      .fillTriangle(x - 28, y + 24, x + 6, y - 28, x + 34, y + 20);
    hazard.label.setX(x - 48);
    hazard.label.setY(y + 54);
  }

  private drawCollectible(collectible: CollectibleSprite): void {
    const scene = this.phaserScene;
    if (scene === undefined || !this.params.collectible) {
      return;
    }

    collectible.image = this.art.addImage(scene, 'collectible', collectible.x, collectible.y, 58, 58);
    if (collectible.image === undefined) {
      collectible.graphics = scene.add.graphics();
    }
    collectible.label = scene.add.text(collectible.x - 38, collectible.y + 50, this.params.collectible.label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#fff0a3'
    });
    this.renderCollectibleShape(collectible);
  }

  private renderCollectibleShape(collectible: CollectibleSprite): void {
    collectible.image?.setPosition(collectible.x, collectible.y);
    collectible.graphics
      ?.clear()
      .fillStyle(0xffd95a, 1)
      .fillCircle(collectible.x, collectible.y, 36)
      .lineStyle(5, 0xfff0a3, 1)
      .strokeCircle(collectible.x, collectible.y, 26)
      .lineStyle(4, 0x8f5a00, 1)
      .lineBetween(collectible.x - 14, collectible.y, collectible.x + 14, collectible.y);
    collectible.label?.setX(collectible.x - 38);
    collectible.label?.setY(collectible.y + 50);
  }

  private renderHud(): void {
    const collectHint = this.params.collectible ? '  Touch coins' : '';
    this.scoreText?.setText(this.params.collectible ? `Score ${Math.min(this.state.score, this.collectibleTargetScore)}/${this.collectibleTargetScore}` : '');

    if (this.state.gameStatus === 'WON') {
      this.statusText?.setText(`Health ${this.state.health}  Time ${this.state.frame}s  COMPLETE  R restart`);
      this.renderEndScreen('win');
      return;
    }

    if (this.state.gameStatus === 'LOST') {
      this.statusText?.setText(`Health ${this.state.health}  Time ${this.state.frame}s  GAME OVER  R restart`);
      this.renderEndScreen('lose');
      return;
    }

    this.endScreen.clear();
    this.statusText?.setText(`Health ${this.state.health}  Time ${this.state.frame}s  Running  ArrowUp/Down dodge  ArrowRight quick dodge  H hit${collectHint}  R restart`);
  }

  private renderEndScreen(state: 'win' | 'lose'): void {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return;
    }

    this.endScreen.show(scene, state);
  }

  private advanceSurvival(deltaMs: number): void {
    this.survivalElapsedMs += deltaMs;
    const nextHudSeconds = Math.floor(this.survivalElapsedMs / 1000);

    if (nextHudSeconds > this.survivalHudSeconds) {
      this.survivalHudSeconds = nextHudSeconds;
      this.state.frame = nextHudSeconds;
      this.telemetry.emit('survival_time.changed', { frame: this.state.frame });
      if (this.params.collectible === undefined) {
        this.objective.completeWhen(this.survivalElapsedMs >= this.params.objective.surviveDurationMs);
      } else {
        this.objective.loseWhen(this.survivalElapsedMs >= this.params.objective.surviveDurationMs && this.state.score < this.collectibleTargetScore);
      }
    }
  }

  private advanceHazard(deltaMs: number): void {
    const spawnRule = this.hazardSpawnRule;
    this.nextHazardSpawnMs = Math.max(0, this.nextHazardSpawnMs - deltaMs);
    if (this.nextHazardSpawnMs === 0 && this.activeHazardCount < spawnRule.maxActive && this.hazardsSpawned < spawnRule.count) {
      this.spawnNextHazard(spawnRule);
    }

    for (const hazard of this.hazards) {
      if (hazard.impactHoldMs > 0) {
        hazard.impactHoldMs = Math.max(0, hazard.impactHoldMs - deltaMs);
        if (hazard.impactHoldMs === 0) {
          this.hideHazard(hazard);
        }
        continue;
      }

      if (!hazard.active) {
        continue;
      }

      hazard.x -= (hazard.speedPxPerSec * deltaMs) / 1000;
      this.resolveHazardCollision(hazard);

      if (hazard.x < -90) {
        this.hideHazard(hazard);
        continue;
      }

      if (!hazard.resolved) {
        this.renderHazardShape(hazard, false);
      }
    }

    this.removeInactiveHazards();
  }

  private advanceCollectible(deltaMs: number): void {
    if (!this.params.collectible) {
      return;
    }

    const spawnRule = this.collectibleSpawnRule;
    this.nextCollectibleSpawnMs = Math.max(0, this.nextCollectibleSpawnMs - deltaMs);
    if (this.nextCollectibleSpawnMs === 0 && this.activeCollectibleCount < spawnRule.maxActive && this.collectiblesSpawned < this.collectibleSpawnBudget(spawnRule)) {
      this.spawnNextCollectible(spawnRule);
    }

    for (const collectible of this.collectibles) {
      if (!collectible.active) {
        continue;
      }

      collectible.x -= (collectible.speedPxPerSec * deltaMs) / 1000;
      if (this.collectOverlappingItem(collectible)) {
        continue;
      }

      if (collectible.x < -70) {
        this.hideCollectible(collectible);
        continue;
      }

      this.renderCollectibleShape(collectible);
    }

    this.removeInactiveCollectibles();
  }

  private spawnNextHazard(spawnRule = this.hazardSpawnRule): void {
    if (this.activeHazardCount >= spawnRule.maxActive || this.hazardsSpawned >= spawnRule.count) {
      return;
    }

    const hazard = this.createHazardSprite(this.nextHazardStartX, this.nextHazardLaneIndex(spawnRule));
    if (hazard === undefined) {
      return;
    }

    this.hazards.push(hazard);
    this.hazardsSpawned += 1;
    const difficulty = this.currentDifficultyState;
    const effectiveIntervalMs = this.effectiveHazardIntervalMs(spawnRule, difficulty);
    this.nextHazardSpawnMs = effectiveIntervalMs;
    this.spawn.spawn('hazard', {
      entityId: spawnRule.entityId,
      strategy: spawnRule.strategy,
      source: spawnRule.source,
      spawned: this.hazardsSpawned,
      count: spawnRule.count,
      maxActive: spawnRule.maxActive,
      intervalMs: spawnRule.intervalMs,
      effectiveIntervalMs,
      laneCount: spawnRule.laneCount,
      difficultyLevel: difficulty.level,
      difficultySource: difficulty.source,
      rampProgress: difficulty.rampProgress,
      speedMultiplier: difficulty.speedMultiplier,
      spawnIntervalMultiplier: difficulty.spawnIntervalMultiplier
    });
  }

  private spawnNextCollectible(spawnRule = this.collectibleSpawnRule): void {
    const spawnBudget = this.collectibleSpawnBudget(spawnRule);
    if (!this.params.collectible || this.activeCollectibleCount >= spawnRule.maxActive || this.collectiblesSpawned >= spawnBudget) {
      return;
    }

    const slot = this.nextCollectibleSlot;
    const collectible: CollectibleSprite = {
      x: this.nextCollectibleStartX,
      y: slot.y,
      slotIndex: slot.index,
      speedPxPerSec: this.params.player.speedPxPerSec * randomBetween(0.72, 1.08),
      active: true
    };
    this.drawCollectible(collectible);
    this.collectibles.push(collectible);
    this.collectiblesSpawned += 1;
    this.nextCollectibleSpawnMs = spawnRule.intervalMs;
    this.spawn.spawn('item', {
      entityId: spawnRule.entityId,
      strategy: spawnRule.strategy,
      source: spawnRule.source,
      spawned: this.collectiblesSpawned,
      count: spawnBudget,
      maxActive: spawnRule.maxActive,
      intervalMs: spawnRule.intervalMs
    });
  }

  private collectOverlappingItem(
    collectible = this.collectibles.find((candidate) => candidate.active && hitboxesOverlap(this.playerHitbox, this.collectibleHitbox(candidate)))
  ): boolean {
    if (
      this.state.gameStatus !== 'PLAYING' ||
      !this.params.collectible ||
      collectible === undefined ||
      !collectible.active ||
      this.state.score >= this.collectibleTargetScore ||
      !hitboxesOverlap(this.playerHitbox, this.collectibleHitbox(collectible))
    ) {
      return false;
    }

    const scoreToAdd = Math.min(this.params.collectible.scorePerItem, this.collectibleTargetScore - this.state.score);
    this.collision.collide({ source: 'player', target: this.collectibleSpawnRule.entityId });
    this.telemetry.emit('item.collected', {
      entityId: this.collectibleSpawnRule.entityId,
      label: this.params.collectible.label,
      source: this.collectibleSpawnRule.source,
      slotIndex: collectible.slotIndex
    });
    this.score.add(scoreToAdd);
    emitCoinSpark(this.phaserScene, collectible.x, collectible.y);
    this.hideCollectible(collectible);
    this.nextCollectibleSpawnMs = Math.max(this.nextCollectibleSpawnMs, this.collectibleSpawnRule.intervalMs);
    this.objective.completeWhen(this.state.score >= this.collectibleTargetScore);
    return true;
  }

  private hideHazard(hazard: HazardSprite): void {
    hazard.active = false;
    hazard.resolved = false;
    hazard.impactHoldMs = 0;
    hazard.graphics?.setVisible(false);
    hazard.image?.setVisible(false);
    hazard.label.setVisible(false);
  }

  private hideCollectible(collectible: CollectibleSprite): void {
    collectible.active = false;
    collectible.graphics?.setVisible(false);
    collectible.image?.setVisible(false);
    collectible.label?.setVisible(false);
  }

  private removeInactiveHazards(): void {
    for (let index = this.hazards.length - 1; index >= 0; index -= 1) {
      const hazard = this.hazards[index];
      if (hazard !== undefined && !hazard.active && hazard.impactHoldMs === 0) {
        hazard.graphics?.destroy();
        hazard.image?.destroy();
        hazard.label.destroy();
        this.hazards.splice(index, 1);
      }
    }
  }

  private clearHazards(): void {
    for (const hazard of this.hazards) {
      hazard.graphics?.destroy();
      hazard.image?.destroy();
      hazard.label.destroy();
    }
    this.hazards.length = 0;
    this.nextHazardSpawnMs = 0;
  }

  private removeInactiveCollectibles(): void {
    for (let index = this.collectibles.length - 1; index >= 0; index -= 1) {
      const collectible = this.collectibles[index];
      if (collectible !== undefined && !collectible.active) {
        collectible.graphics?.destroy();
        collectible.image?.destroy();
        collectible.label?.destroy();
        this.collectibles.splice(index, 1);
      }
    }
  }

  private clearCollectibles(): void {
    for (const collectible of this.collectibles) {
      collectible.graphics?.destroy();
      collectible.image?.destroy();
      collectible.label?.destroy();
    }
    this.collectibles.length = 0;
    this.nextCollectibleSpawnMs = 0;
  }

  private nextHazardLaneIndex(spawnRule: ResolvedDodgerSpawnRule): number {
    const activeLaneCounts = this.laneYValues.map((_laneY, index) => this.hazards.filter((hazard) => hazard.active && hazard.laneIndex === index).length);
    const maxPerLane = Math.max(1, Math.ceil(spawnRule.maxActive / Math.max(1, spawnRule.laneCount ?? 3)));
    let candidates = this.laneYValues
      .map((_laneY, index) => index)
      .filter((index) => activeLaneCounts[index] < maxPerLane && index !== this.lastHazardLaneIndex);
    if (candidates.length === 0) {
      candidates = this.laneYValues.map((_laneY, index) => index).filter((index) => activeLaneCounts[index] < maxPerLane);
    }
    if (candidates.length === 0) {
      candidates = this.laneYValues.map((_laneY, index) => index);
    }

    const laneIndex = candidates[Math.floor(Math.random() * candidates.length)] ?? 1;
    this.lastHazardLaneIndex = laneIndex;
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
    this.playerImage?.setY(this.playerY);
    this.playerLabel?.setY(this.playerY + 54);
    this.movement.move({ lane: this.playerLaneIndex, y: this.playerY });
  }

  private resolveHazardCollision(hazard: HazardSprite): void {
    if (!hazard.active || hazard.resolved || !hitboxesOverlap(this.playerHitbox, this.hazardHitbox(hazard))) {
      return;
    }

    hazard.resolved = true;
    hazard.impactHoldMs = 1200;
    this.renderHazardShape(hazard, true);
    this.hitHazard();
  }

  private get laneYValues(): number[] {
    const spawnRule = this.hazardSpawnRule;
    const laneCount = spawnRule.laneCount ?? 3;
    if (laneCount <= 1) {
      return [this.params.player.startY];
    }

    if (spawnRule.source === 'template_default' && laneCount === 3) {
      return [this.params.player.startY - 110, this.params.player.startY, this.params.player.startY + 110];
    }

    const laneSpacing = 110;
    const centerOffset = (laneCount - 1) / 2;
    return Array.from({ length: laneCount }, (_value, index) => this.params.player.startY + (index - centerOffset) * laneSpacing);
  }

  private get playerY(): number {
    return this.laneYValues[this.playerLaneIndex] ?? this.params.player.startY;
  }

  private hazardY(laneIndex: number, yOffset: number): number {
    return (this.laneYValues[laneIndex] ?? this.params.player.startY) + yOffset;
  }

  private get playerHitbox(): Hitbox {
    return {
      left: this.params.player.startX - 30,
      right: this.params.player.startX + 30,
      top: this.playerY - 30,
      bottom: this.playerY + 34
    };
  }

  private hazardHitbox(hazard: HazardSprite): Hitbox {
    const y = this.hazardY(hazard.laneIndex, hazard.yOffset);
    return {
      left: hazard.x - 24,
      right: hazard.x + 30,
      top: y - 24,
      bottom: y + 26
    };
  }

  private collectibleHitbox(collectible: CollectibleSprite): Hitbox {
    return {
      left: collectible.x - 28,
      right: collectible.x + 28,
      top: collectible.y - 28,
      bottom: collectible.y + 28
    };
  }

  private get activeHazardCount(): number {
    return this.hazards.filter((hazard) => hazard.active).length;
  }

  private get activeCollectibleCount(): number {
    return this.collectibles.filter((collectible) => collectible.active).length;
  }

  private get collectibleTargetScore(): number {
    return this.params.collectible === undefined ? 0 : this.params.collectible.count * this.params.collectible.scorePerItem;
  }

  private collectibleSpawnBudget(spawnRule: ResolvedDodgerSpawnRule): number {
    if (this.params.collectible === undefined) {
      return spawnRule.count;
    }

    const targetItems = Math.ceil(this.collectibleTargetScore / this.params.collectible.scorePerItem);
    return Math.max(spawnRule.count, targetItems * 2, targetItems + spawnRule.maxActive + 2);
  }

  private get nextHazardStartX(): number {
    return this.params.world.width + randomBetween(70, 230);
  }

  private get nextCollectibleStartX(): number {
    return this.params.world.width + randomBetween(80, 260);
  }

  private get nextCollectibleSlot(): { index: number; y: number } {
    const slots = this.collectibleSlots;
    const slot = slots[this.nextCollectibleSlotIndex % slots.length] ?? slots[0];
    this.nextCollectibleSlotIndex += 1;
    return slot;
  }

  private get collectibleSlots(): Array<{ index: number; y: number }> {
    return this.laneYValues.map((laneY, index) => ({
      index,
      y: laneY
    }));
  }

  private get primaryHazardSnapshot(): { x: number; y: number; lane: number; active: boolean } {
    const hazard = this.hazards.find((candidate) => candidate.active) ?? this.hazards[0];
    return hazard === undefined ? { x: this.params.world.width + 90, y: this.params.player.startY, lane: -1, active: false } : this.hazardSnapshot(hazard);
  }

  private hazardSnapshot(hazard: HazardSprite): { x: number; y: number; lane: number; active: boolean } {
    return {
      x: hazard.x,
      y: this.hazardY(hazard.laneIndex, hazard.yOffset),
      lane: hazard.laneIndex,
      active: hazard.active
    };
  }

  private collectibleSnapshot(collectible: CollectibleSprite): { x: number; y: number; slot: number; speedPxPerSec: number; active: boolean } {
    return {
      x: collectible.x,
      y: collectible.y,
      slot: collectible.slotIndex,
      speedPxPerSec: collectible.speedPxPerSec,
      active: collectible.active
    };
  }

  private get hazardSpawnRule(): ResolvedDodgerSpawnRule {
    return resolveDodgerSpawnRule(this.runtimePlan, 'hazard', {
      entityId: 'hazard',
      strategy: 'right_edge_wave',
      count: Number.MAX_SAFE_INTEGER,
      maxActive: 3,
      intervalMs: this.params.hazard.spawnIntervalMs,
      laneCount: 3
    });
  }

  private get collectibleSpawnRule(): ResolvedDodgerSpawnRule {
    return resolveDodgerSpawnRule(this.runtimePlan, 'collectible', {
      entityId: 'collectible',
      strategy: 'fixed_positions',
      count: this.params.collectible?.count ?? 1,
      maxActive: 1,
      intervalMs: 1200
    });
  }

  private get currentDifficultyState(): DodgerDifficultyState {
    return resolveDodgerDifficultyState(resolveDodgerDifficultyCurve(this.runtimePlan), this.survivalElapsedMs);
  }

  private effectiveHazardIntervalMs(rule: ResolvedDodgerSpawnRule, difficulty: DodgerDifficultyState): number {
    return Math.max(200, Math.round(rule.intervalMs * difficulty.spawnIntervalMultiplier));
  }

  private spawnRuleSnapshot(rule: ResolvedDodgerSpawnRule): Record<string, string | number> {
    const count = rule.entityKind === 'collectible' ? this.collectibleSpawnBudget(rule) : rule.count;
    const snapshot: Record<string, string | number> = {
      entityId: rule.entityId,
      strategy: rule.strategy,
      count,
      maxActive: rule.maxActive,
      intervalMs: rule.intervalMs,
      source: rule.source,
      spawned: rule.entityKind === 'hazard' ? this.hazardsSpawned : this.collectiblesSpawned
    };
    if (rule.laneCount !== undefined) {
      snapshot.laneCount = rule.laneCount;
    }
    return snapshot;
  }

  private difficultySnapshot(difficulty: DodgerDifficultyState): Record<string, string | number> {
    return {
      level: difficulty.level,
      source: difficulty.source,
      derivedFrom: difficulty.derivedFrom.join(','),
      rampDurationMs: difficulty.rampDurationMs,
      rampProgress: difficulty.rampProgress,
      speedMultiplierStart: difficulty.speedMultiplierStart,
      speedMultiplierEnd: difficulty.speedMultiplierEnd,
      speedMultiplier: difficulty.speedMultiplier,
      spawnIntervalMultiplierStart: difficulty.spawnIntervalMultiplierStart,
      spawnIntervalMultiplierEnd: difficulty.spawnIntervalMultiplierEnd,
      spawnIntervalMultiplier: difficulty.spawnIntervalMultiplier
    };
  }
}

function hitboxesOverlap(a: Hitbox, b: Hitbox): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
