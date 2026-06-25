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
import type { SideScrollingRuntimeSceneBindingState } from './side-scrolling-scene-ir.js';
import { createSideScrollingRuntimeBridge } from './side-scrolling-live-edit-bridge.js';
import type { SideScrollingArtRuntime } from './side-scrolling-art-library.js';
import {
  defaultSideScrollingRuntimePlan,
  resolveSideScrollingRuntimeSlice,
  type SideScrollingEnemyDefinition,
  type SideScrollingRuntimePlan,
  type SideScrollingRuntimeSlice,
  type SideScrollingWave
} from './side-scrolling-runtime-plan.js';
import type { SideScrollingTemplateParams } from './template-params.js';

export type SideScrollingDirection = 'left' | 'right';

type RuntimeActor = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  health: number;
};

type EnemyActor = RuntimeActor & {
  entityId: string;
  waveId: string;
  definition: SideScrollingEnemyDefinition;
  nextFireAtMs: number;
  cleared: boolean;
};

type ProjectileActor = RuntimeActor & {
  owner: 'player' | 'enemy';
  damage: number;
  sourceId?: string;
  capabilityId?: string;
  probeId?: string;
};

type CapabilityRuntimeProbe = {
  capabilityId: string;
  probeId: string;
  runtimeModuleId: string;
  action: 'fire' | 'jump';
  eventType: 'player.fired' | 'projectile.spawned' | 'player.jumped';
  projectileEntityId?: string;
  projectileId?: string;
  sourceRef: string;
  status: 'observed';
};

const DEFAULT_WEAPON_CAPABILITY_ID = 'weapon.default_straight_single.v1';
const DEFAULT_WEAPON_CAPABILITY_PROBE_ID = 'weapon.default_straight_single.v1.fire.browser_qa.v1';
const DEFAULT_WEAPON_RUNTIME_MODULE_ID = 'weapon.default_straight_single';
const DEFAULT_WEAPON_PROJECTILE_SOURCE_REF = 'runtime_plan.side_scrolling.player.projectileEntityId';
const COMBAT_PROJECTILE_CAPABILITY_ID = 'combat.projectile.v1';
const COMBAT_PROJECTILE_CAPABILITY_PROBE_ID = 'combat.projectile.v1.spawn.browser_qa.v1';
const COMBAT_PROJECTILE_RUNTIME_MODULE_ID = 'combat.projectile';
const MOVEMENT_RUN_JUMP_CAPABILITY_ID = 'movement.run_jump.v1';
const MOVEMENT_RUN_JUMP_CAPABILITY_PROBE_ID = 'movement.run_jump.v1.jump.browser_qa.v1';
const MOVEMENT_RUN_JUMP_RUNTIME_MODULE_ID = 'movement.run_jump';
const MOVEMENT_RUN_JUMP_SOURCE_REF = 'runtime_plan.side_scrolling.player.jumpVelocity';

export class SideScrollingRunAndGunScene {
  private readonly plan: SideScrollingRuntimeSlice;
  private readonly state;
  private readonly telemetry;
  private readonly input;
  private readonly movement;
  private readonly spawn;
  private readonly collision;
  private readonly score;
  private readonly gameState;
  private readonly objective;
  private readonly endScreen: EndScreenRenderer;
  private readonly liveEditBridge;
  private phaserScene?: Phaser.Scene;
  private player: RuntimeActor;
  private lives: number;
  private runtimeClockMs = 0;
  private nextProjectileAtMs = 0;
  private readonly runInput: Record<SideScrollingDirection, boolean> = { left: false, right: false };
  private readonly triggeredWaves = new Set<string>();
  private readonly checkpointsReached = new Set<number>();
  private readonly enemies: EnemyActor[] = [];
  private readonly projectiles: ProjectileActor[] = [];
  private readonly staticSprites = new Set<Phaser.GameObjects.GameObject>();
  private readonly enemySprites = new Map<string, Phaser.GameObjects.GameObject>();
  private readonly projectileSprites = new Map<string, Phaser.GameObjects.GameObject>();
  private readonly capabilityRuntimeProbes = new Map<string, CapabilityRuntimeProbe>();
  private playerSprite?: Phaser.GameObjects.GameObject;
  private hudText?: Phaser.GameObjects.Text;
  private cameraScrollX = 0;

  constructor(
    private readonly params: SideScrollingTemplateParams,
    runtimePlan: SideScrollingRuntimePlan = defaultSideScrollingRuntimePlan,
    private readonly art?: SideScrollingArtRuntime,
    private readonly sceneBindingState?: SideScrollingRuntimeSceneBindingState,
    private readonly runtimeAuthority?: RuntimeAuthoritySnapshot
  ) {
    this.plan = resolveSideScrollingRuntimeSlice(runtimePlan);
    this.state = createRuntimeState(this.plan.player.health);
    this.telemetry = new TelemetrySystem(this.state);
    this.input = new InputSystem(this.telemetry);
    this.movement = new MovementSystem(this.telemetry);
    this.spawn = new SpawnSystem(this.telemetry);
    this.collision = new CollisionSystem(this.telemetry);
    this.score = new ScoreSystem(this.state, this.telemetry);
    this.gameState = new GameStateSystem(this.state, this.telemetry);
    this.objective = new ObjectiveSystem(this.state, this.gameState);
    this.player = this.createPlayerActor();
    this.lives = this.plan.player.lives;
    this.endScreen = new EndScreenRenderer(this.plan.scene.viewport, params.ui.screens);
    this.liveEditBridge = createSideScrollingRuntimeBridge({
      params,
      plan: this.plan,
      getEnemies: () => this.enemies,
      getProjectiles: () => this.projectiles,
      setPlayerMaxHealth: (maxHealth) => this.setPlayerMaxHealth(maxHealth),
      setWorldWidth: (width) => this.setWorldWidth(width)
    });
  }

  create(phaserScene?: Phaser.Scene): void {
    this.phaserScene = phaserScene;
    this.gameState.ready();
    exposeRuntime(
      this.state,
      new QaBridge(this.state, () => this.start(), () => this.restart(), () => ({
        player: { x: this.player.x, y: this.player.y, onGround: this.player.vy === 0 },
        camera: this.cameraSnapshot(),
        gravity: this.plan.scene.world.gravityY,
        backgrounds: this.plan.backgrounds ?? [],
        platforms: this.plan.platforms,
        goals: this.plan.goals ?? [],
        sceneBindings: this.sceneBindingState,
        runtimeAuthority: this.runtimeAuthority,
        enemies: this.enemies.map((enemy) => this.enemySnapshot(enemy)),
        capabilityRuntime: this.capabilityRuntimeSnapshot(),
        projectiles: this.projectiles.map((projectile) => ({
          id: projectile.id,
          owner: projectile.owner,
          x: projectile.x,
          y: projectile.y,
          ...(projectile.sourceId === undefined ? {} : { sourceId: projectile.sourceId }),
          ...(projectile.capabilityId === undefined ? {} : { capabilityId: projectile.capabilityId }),
          ...(projectile.probeId === undefined ? {} : { probeId: projectile.probeId })
        })),
        waves: this.plan.waves.map((wave) => ({ ...wave, triggered: this.triggeredWaves.has(wave.id) })),
        lives: this.lives,
        winCondition: this.plan.winCondition,
        telemetryProfile: this.plan.telemetry.profile
      })),
      () => ({ assets: this.art?.telemetry() })
    );
    this.renderFirstFrame();
  }

  start(): void {
    if (this.state.gameStatus === 'PLAYING') {
      return;
    }

    this.input.receive('start');
    this.gameState.start();
    this.reachCheckpoint(0);
    this.renderHud();
  }

  setRunInput(direction: SideScrollingDirection, pressed: boolean): void {
    this.runInput[direction] = pressed;
  }

  jump(): void {
    this.input.receive('move');
    if (this.state.gameStatus !== 'PLAYING' || this.player.vy !== 0) {
      return;
    }

    this.player.vy = this.plan.player.jumpVelocity;
    const capabilityRuntime = this.createMovementRunJumpCapabilityRuntimeProbe();
    this.capabilityRuntimeProbes.set(capabilityRuntime.probeId, capabilityRuntime);
    this.telemetry.emit('player.jumped', { velocityY: this.player.vy, capabilityRuntime });
  }

  fire(nowMs = Date.now()): void {
    this.input.receive('fire');
    if (this.state.gameStatus !== 'PLAYING' || nowMs < this.nextProjectileAtMs) {
      return;
    }

    const projectile: ProjectileActor = {
      id: `projectile_${this.state.frame}_${this.projectiles.length}`,
      owner: 'player',
      x: this.player.x + this.player.width / 2,
      y: this.player.y + this.player.height / 2 - 5,
      vx: this.plan.player.projectileSpeedPxPerSec,
      vy: 0,
      width: 24,
      height: 10,
      health: 1,
      damage: this.plan.player.projectileDamage,
      sourceId: this.plan.player.projectileEntityId
    };
    const defaultWeaponRuntime = this.createDefaultWeaponCapabilityRuntimeProbe(projectile.id);
    const projectileRuntime = this.createCombatProjectileCapabilityRuntimeProbe(projectile.id);
    projectile.capabilityId = defaultWeaponRuntime.capabilityId;
    projectile.probeId = defaultWeaponRuntime.probeId;
    this.projectiles.push(projectile);
    this.capabilityRuntimeProbes.set(defaultWeaponRuntime.probeId, defaultWeaponRuntime);
    this.capabilityRuntimeProbes.set(projectileRuntime.probeId, projectileRuntime);
    this.nextProjectileAtMs = nowMs + this.plan.player.fireCooldownMs;
    this.telemetry.emit('player.fired', { projectileEntityId: this.plan.player.projectileEntityId, capabilityRuntime: defaultWeaponRuntime });
    this.spawn.spawn('projectile', {
      projectileId: projectile.id,
      capabilityRuntime: defaultWeaponRuntime,
      capabilityRuntimeProbes: [defaultWeaponRuntime, projectileRuntime]
    });
    this.renderProjectile(projectile);
  }

  damagePlayer(amount = 1, source = 'enemy', projectileId?: string): void {
    if (this.state.gameStatus !== 'PLAYING') {
      return;
    }

    this.collision.collide({ source, target: 'player', ...(projectileId === undefined ? {} : { projectileId }) });
    this.state.health = Math.max(0, this.state.health - amount);
    this.telemetry.emit('player.damaged', { health: this.state.health, lives: this.lives });
    if (this.state.health <= 0) {
      this.lives -= 1;
      if (this.lives <= 0) {
        this.objective.loseWhen(true);
        this.renderEndScreenIfTerminal();
        return;
      }
      this.state.health = this.state.maxHealth;
      this.resetPlayerToCheckpoint();
    }
    this.renderHud();
  }

  completeMission(): void {
    this.objective.completeWhen(true);
    this.telemetry.emit('level.segment.completed', { target: this.plan.winCondition });
    this.renderEndScreenIfTerminal();
  }

  update(_timeMs: number, deltaMs: number): void {
    if (this.state.gameStatus !== 'PLAYING') {
      return;
    }

    this.state.frame += 1;
    this.runtimeClockMs += deltaMs;
    this.movePlayer(deltaMs);
    this.spawnTriggeredWaves();
    this.advanceEnemies(deltaMs, this.runtimeClockMs);
    this.advanceProjectiles(deltaMs);
    this.checkObjective();
    this.renderHud();
  }

  restart(): void {
    this.input.receive('restart');
    this.gameState.restart();
    this.player = this.createPlayerActor();
    this.lives = this.plan.player.lives;
    this.runtimeClockMs = 0;
    this.nextProjectileAtMs = 0;
    this.triggeredWaves.clear();
    this.checkpointsReached.clear();
    this.capabilityRuntimeProbes.clear();
    this.clearDynamicSprites();
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.endScreen.clear();
    this.renderFirstFrame();
    this.updateCamera();
  }

  private createPlayerActor(): RuntimeActor {
    return {
      id: this.plan.player.entityId,
      x: this.plan.player.spawn.x,
      y: this.plan.player.spawn.y,
      vx: 0,
      vy: 0,
      width: 42,
      height: 56,
      health: this.plan.player.health
    };
  }

  private movePlayer(deltaMs: number): void {
    const previous = { x: this.player.x, y: this.player.y };
    const direction = (this.runInput.right ? 1 : 0) - (this.runInput.left ? 1 : 0);
    this.player.vx = direction * this.plan.player.speedPxPerSec;
    this.player.x = clamp(this.player.x + (this.player.vx * deltaMs) / 1000, 0, this.plan.scene.world.width - this.player.width);
    this.player.vy += (this.plan.scene.world.gravityY * deltaMs) / 1000;
    this.player.y += (this.player.vy * deltaMs) / 1000;
    this.resolveGroundCollision();

    if (previous.x !== this.player.x || previous.y !== this.player.y) {
      this.input.receive('move');
      this.movement.move({ fromX: previous.x, fromY: previous.y, toX: this.player.x, toY: this.player.y });
      this.syncPlayerSprite();
      this.updateCamera();
    }
  }

  private resolveGroundCollision(): void {
    const floor = this.plan.platforms.find((platform) => this.player.x + this.player.width > platform.x && this.player.x < platform.x + platform.width);
    if (floor === undefined) {
      return;
    }

    const standingY = floor.y - this.player.height + 4;
    if (this.player.y >= standingY) {
      this.player.y = standingY;
      this.player.vy = 0;
    }
  }

  private createDefaultWeaponCapabilityRuntimeProbe(projectileId: string): CapabilityRuntimeProbe {
    return {
      capabilityId: DEFAULT_WEAPON_CAPABILITY_ID,
      probeId: DEFAULT_WEAPON_CAPABILITY_PROBE_ID,
      runtimeModuleId: DEFAULT_WEAPON_RUNTIME_MODULE_ID,
      action: 'fire',
      eventType: 'player.fired',
      projectileEntityId: this.plan.player.projectileEntityId,
      projectileId,
      sourceRef: DEFAULT_WEAPON_PROJECTILE_SOURCE_REF,
      status: 'observed'
    };
  }

  private createCombatProjectileCapabilityRuntimeProbe(projectileId: string): CapabilityRuntimeProbe {
    return {
      capabilityId: COMBAT_PROJECTILE_CAPABILITY_ID,
      probeId: COMBAT_PROJECTILE_CAPABILITY_PROBE_ID,
      runtimeModuleId: COMBAT_PROJECTILE_RUNTIME_MODULE_ID,
      action: 'fire',
      eventType: 'projectile.spawned',
      projectileEntityId: this.plan.player.projectileEntityId,
      projectileId,
      sourceRef: DEFAULT_WEAPON_PROJECTILE_SOURCE_REF,
      status: 'observed'
    };
  }

  private createMovementRunJumpCapabilityRuntimeProbe(): CapabilityRuntimeProbe {
    return {
      capabilityId: MOVEMENT_RUN_JUMP_CAPABILITY_ID,
      probeId: MOVEMENT_RUN_JUMP_CAPABILITY_PROBE_ID,
      runtimeModuleId: MOVEMENT_RUN_JUMP_RUNTIME_MODULE_ID,
      action: 'jump',
      eventType: 'player.jumped',
      sourceRef: MOVEMENT_RUN_JUMP_SOURCE_REF,
      status: 'observed'
    };
  }

  private capabilityRuntimeSnapshot(): { source: 'side_scrolling_runtime'; probes: CapabilityRuntimeProbe[] } {
    return {
      source: 'side_scrolling_runtime',
      probes: [...this.capabilityRuntimeProbes.values()]
    };
  }

  private spawnTriggeredWaves(): void {
    for (const wave of this.plan.waves) {
      if (this.triggeredWaves.has(wave.id) || this.player.x < wave.triggerX - 160) {
        continue;
      }
      this.triggerWave(wave);
    }
  }

  private triggerWave(wave: SideScrollingWave): void {
    this.triggeredWaves.add(wave.id);
    const definition = this.plan.enemyDefinitions.find((enemy) => enemy.id === wave.enemyTypeId) ?? this.plan.enemyDefinitions[0];
    if (definition === undefined) {
      return;
    }

    for (let index = 0; index < wave.count; index += 1) {
      const enemy: EnemyActor = {
        id: `${wave.id}_${index}`,
        entityId: definition.id,
        waveId: wave.id,
        definition,
        x: wave.spawnX + index * 54,
        y: wave.spawnY ?? this.enemyY(),
        vx: -definition.movement.speedPxPerSec,
        vy: 0,
        width: 40,
        height: 46,
        health: definition.health,
        nextFireAtMs: this.runtimeClockMs + Math.min(120, definition.firing.cooldownMs) + index * 120,
        cleared: false
      };
      this.enemies.push(enemy);
      this.spawn.spawn('enemy', { enemyId: enemy.id, entityId: enemy.entityId, waveId: wave.id });
      this.renderEnemy(enemy);
    }
  }

  private advanceEnemies(deltaMs: number, nowMs: number): void {
    for (const enemy of this.enemies) {
      if (enemy.cleared) {
        continue;
      }
      enemy.x = Math.max(0, enemy.x + (enemy.vx * deltaMs) / 1000);
      this.setObjectPosition(this.enemySprites.get(enemy.id), enemy.x, enemy.y);
      if (hitboxesOverlap(this.player, enemy)) {
        enemy.cleared = true;
        this.destroyObject(this.enemySprites.get(enemy.id));
        this.enemySprites.delete(enemy.id);
        this.damagePlayer(1);
        continue;
      }
      this.fireEnemyProjectile(enemy, nowMs);
    }
  }

  private advanceProjectiles(deltaMs: number): void {
    for (const projectile of [...this.projectiles]) {
      projectile.x += (projectile.vx * deltaMs) / 1000;
      this.setObjectPosition(this.projectileSprites.get(projectile.id), projectile.x, projectile.y);
      if (projectile.owner === 'player') {
        const enemy = this.enemies.find((candidate) => !candidate.cleared && hitboxesOverlap(projectile, candidate));
        if (enemy !== undefined) {
          this.hitEnemy(projectile, enemy);
          continue;
        }
      } else if (hitboxesOverlap(projectile, this.player)) {
        this.removeProjectile(projectile);
        this.damagePlayer(projectile.damage, 'enemy_projectile', projectile.id);
        continue;
      }
      if (projectile.x > this.plan.scene.world.width || projectile.x + projectile.width < 0) {
        this.removeProjectile(projectile);
      }
    }
  }

  private fireEnemyProjectile(enemy: EnemyActor, nowMs: number): void {
    const firing = enemy.definition.firing;
    if (nowMs < enemy.nextFireAtMs || enemy.x < this.player.x || enemy.x - this.player.x > firing.rangePx) {
      return;
    }
    if (enemy.x < this.cameraScrollX - 80 || enemy.x > this.cameraScrollX + this.plan.scene.viewport.width + 80) {
      return;
    }

    const projectile: ProjectileActor = {
      id: `enemy_projectile_${enemy.id}_${this.state.frame}_${this.projectiles.length}`,
      owner: 'enemy',
      x: enemy.x - 18,
      y: enemy.y + enemy.height / 2 - 5,
      vx: -firing.speedPxPerSec,
      vy: 0,
      width: 18,
      height: 10,
      health: 1,
      damage: firing.damage,
      sourceId: firing.projectileEntityId
    };
    enemy.nextFireAtMs = nowMs + Math.max(120, firing.cooldownMs);
    this.projectiles.push(projectile);
    this.telemetry.emit('enemy.fired', { enemyId: enemy.id, entityId: enemy.entityId, projectileEntityId: firing.projectileEntityId, waveId: enemy.waveId });
    this.spawn.spawn('projectile', { source: 'enemy_projectile', projectileId: projectile.id, enemyId: enemy.id, entityId: enemy.entityId });
    this.renderProjectile(projectile);
  }

  private hitEnemy(projectile: ProjectileActor, enemy: EnemyActor): void {
    enemy.health -= projectile.damage;
    this.collision.collide({ source: 'projectile', target: 'enemy', projectileId: projectile.id, enemyId: enemy.id });
    this.telemetry.emit('enemy.hit', { enemyId: enemy.id, entityId: enemy.entityId, damage: projectile.damage, waveId: enemy.waveId });
    this.removeProjectile(projectile);
    if (enemy.health <= 0) {
      enemy.cleared = true;
      this.telemetry.emit('enemy.cleared', { enemyId: enemy.id, entityId: enemy.entityId, waveId: enemy.waveId });
      this.score.add(1);
      this.destroyObject(this.enemySprites.get(enemy.id));
      this.enemySprites.delete(enemy.id);
    }
  }

  private checkObjective(): void {
    if (this.plan.winCondition.kind === 'reach_exit') {
      if (this.player.x >= this.plan.winCondition.targetX) {
        this.completeMission();
      }
      return;
    }
    const cleared = this.enemies.filter((enemy) => enemy.cleared).length;
    this.objective.completeWhen(cleared >= this.plan.winCondition.targetCount);
    this.renderEndScreenIfTerminal();
  }

  private reachCheckpoint(x: number): void {
    if (this.checkpointsReached.has(x)) {
      return;
    }
    this.checkpointsReached.add(x);
    this.telemetry.emit('checkpoint.reached', { x });
  }

  private resetPlayerToCheckpoint(): void {
    this.player.x = this.plan.player.spawn.x;
    this.player.y = this.plan.player.spawn.y;
    this.player.vy = 0;
    this.syncPlayerSprite();
  }

  private renderFirstFrame(): void {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return;
    }

    scene.cameras.main.setBackgroundColor('#10253a');
    this.configureCamera(scene);
    this.clearStaticSprites();
    const backgrounds = this.plan.backgrounds ?? [];
    if (backgrounds.length > 0) {
      for (const [index, background] of [...backgrounds].sort((left, right) => left.depth - right.depth).entries()) {
        const renderedBackground = index === 0 ? this.art?.drawBackground(scene, this.plan.scene.world.width, this.plan.scene.world.height) : undefined;
        this.trackStaticSprite(
          renderedBackground ??
            scene.add
              .graphics()
              .fillStyle(backgroundColor(background.role), background.opacity ?? 1)
              .fillRect(0, 0, this.plan.scene.world.width, this.plan.scene.world.height)
        );
      }
    } else {
      this.trackStaticSprite(scene.add.graphics().fillStyle(0x10253a, 1).fillRect(0, 0, this.plan.scene.world.width, this.plan.scene.world.height));
    }
    for (const platform of this.plan.platforms) {
      this.trackStaticSprite(
        scene.add.graphics().fillStyle(platform.kind === 'ground' ? 0x31613c : 0x7d8f75, 1).fillRect(platform.x, platform.y, platform.width, platform.height)
      );
    }
    this.playerSprite = this.trackStaticSprite(
      this.art?.addImage(scene, 'player', this.player.x, this.player.y) ??
        scene.add.graphics().fillStyle(0x49b6ff, 1).fillRect(this.player.x, this.player.y, this.player.width, this.player.height)
    );
    this.hudText = this.trackStaticSprite(scene.add.text(16, 16, '', { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#f8fbff' }));
    this.hudText.setScrollFactor(0);
    this.renderHud();
  }

  private configureCamera(scene: Phaser.Scene): void {
    const { x, y, width, height } = this.plan.camera.bounds;
    scene.cameras.main.setBounds(x, y, width, height);
    this.updateCamera();
  }

  private renderEnemy(enemy: EnemyActor): void {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return;
    }
    const object = this.art?.addImage(scene, 'enemy', enemy.x, enemy.y) ?? scene.add.graphics().fillStyle(0xdb5b58, 1).fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    this.enemySprites.set(enemy.id, object);
  }

  private renderProjectile(projectile: ProjectileActor): void {
    const scene = this.phaserScene;
    if (scene === undefined) {
      return;
    }
    const fallbackColor = projectile.owner === 'enemy' ? 0xff745c : 0xffef6e;
    const object =
      this.art?.addImage(scene, 'projectile', projectile.x, projectile.y) ??
      scene.add.graphics().fillStyle(fallbackColor, 1).fillRect(projectile.x, projectile.y, projectile.width, projectile.height);
    this.projectileSprites.set(projectile.id, object);
  }

  private renderHud(): void {
    this.hudText?.setText(`HP ${this.state.health}/${this.state.maxHealth}  Lives ${this.lives}  Score ${this.state.score}`);
    this.renderEndScreenIfTerminal();
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

  private clearDynamicSprites(): void {
    for (const object of [...this.enemySprites.values(), ...this.projectileSprites.values()]) {
      this.destroyObject(object);
    }
    this.enemySprites.clear();
    this.projectileSprites.clear();
  }

  private clearStaticSprites(): void {
    for (const object of this.staticSprites) {
      this.destroyObject(object);
    }
    this.staticSprites.clear();
    this.playerSprite = undefined;
    this.hudText = undefined;
  }

  private trackStaticSprite<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.staticSprites.add(object);
    return object;
  }

  private removeProjectile(projectile: ProjectileActor): void {
    const index = this.projectiles.indexOf(projectile);
    if (index >= 0) {
      this.projectiles.splice(index, 1);
    }
    this.destroyObject(this.projectileSprites.get(projectile.id));
    this.projectileSprites.delete(projectile.id);
  }

  getLiveEditBridge() {
    return this.liveEditBridge;
  }

  private setPlayerMaxHealth(maxHealth: number): void {
    this.plan.player.health = maxHealth;
    this.state.maxHealth = maxHealth;
    this.state.health = clamp(this.state.health, 0, maxHealth);
    this.player.health = clamp(this.player.health, 0, maxHealth);
    this.renderHud();
  }

  private setWorldWidth(width: number): void {
    this.plan.scene.world.width = width;
    this.plan.camera.bounds.width = width;
    this.phaserScene?.cameras.main.setBounds(this.plan.camera.bounds.x, this.plan.camera.bounds.y, width, this.plan.camera.bounds.height);
    this.updateCamera();
  }

  private syncPlayerSprite(): void {
    this.setObjectPosition(this.playerSprite, this.player.x, this.player.y);
  }

  private updateCamera(): void {
    const { x, y, width } = this.plan.camera.bounds;
    const maxScrollX = Math.max(x, x + width - this.plan.scene.viewport.width);
    const targetScrollX = this.player.x + this.player.width / 2 - this.plan.scene.viewport.width / 2;
    this.cameraScrollX = clamp(targetScrollX, x, maxScrollX);
    this.phaserScene?.cameras.main.setScroll(this.cameraScrollX, y);
  }

  private setObjectPosition(object: Phaser.GameObjects.GameObject | undefined, x: number, y: number): void {
    if (object !== undefined && 'setPosition' in object && typeof object.setPosition === 'function') {
      object.setPosition(x, y);
    }
  }

  private destroyObject(object: Phaser.GameObjects.GameObject | undefined): void {
    if (object !== undefined && 'destroy' in object && typeof object.destroy === 'function') {
      object.destroy();
    }
  }

  private enemyY(): number {
    const ground = this.plan.platforms.find((platform) => platform.kind === 'ground') ?? this.plan.platforms[0];
    return Math.max(0, (ground?.y ?? this.plan.scene.world.height - 40) - 42);
  }

  private cameraSnapshot(): Record<string, unknown> {
    return {
      mode: this.plan.camera.mode,
      followTarget: this.plan.camera.followTarget,
      bounds: this.plan.camera.bounds,
      viewport: this.plan.scene.viewport,
      playerX: this.player.x,
      scrollX: this.cameraScrollX,
      visibleLeft: this.cameraScrollX,
      visibleRight: this.cameraScrollX + this.plan.scene.viewport.width
    };
  }

  private enemySnapshot(enemy: EnemyActor): Record<string, unknown> {
    return { id: enemy.id, entityId: enemy.entityId, x: enemy.x, y: enemy.y, health: enemy.health, cleared: enemy.cleared };
  }
}

function hitboxesOverlap(a: RuntimeActor, b: RuntimeActor): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function backgroundColor(role: NonNullable<SideScrollingRuntimeSlice['backgrounds']>[number]['role']): number {
  switch (role) {
    case 'sky':
      return 0x10253a;
    case 'far':
      return 0x1f3f5f;
    case 'mid':
      return 0x27505d;
    case 'near':
      return 0x315f45;
    case 'overlay':
      return 0x07111f;
  }
}
