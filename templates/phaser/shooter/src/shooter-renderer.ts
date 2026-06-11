import type Phaser from 'phaser';

import type { ShooterEnemyState, ShooterProjectileState, ShooterRuntimeState } from './shooter-runtime.js';
import type { ShooterArtRuntime } from './shooter-art-library.js';
import type { ShooterTemplateParams } from './template-params.js';
import { drawShooterEnemy, drawShooterPlayer, drawShooterProjectile } from './template-visuals.js';

type ShooterRenderObject = Phaser.GameObjects.Container | Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;

export class ShooterRenderer {
  private scoreText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private playerObject?: ShooterRenderObject;
  private readonly enemyObjects = new Map<number, ShooterRenderObject>();
  private readonly projectileObjects = new Map<number, ShooterRenderObject>();

  constructor(
    private readonly params: ShooterTemplateParams,
    private readonly art?: ShooterArtRuntime
  ) {}

  renderFirstFrame(scene: Phaser.Scene, runtime: ShooterRuntimeState): void {
    scene.cameras.main.setBackgroundColor('#07111f');
    const backgroundDrawn = this.art?.drawBackground(scene, this.params.world.width, this.params.world.height) ?? false;
    if (!backgroundDrawn) {
      scene.add
        .graphics()
        .fillStyle(0x07111f, 1)
        .fillRect(0, 0, this.params.world.width, this.params.world.height)
        .fillStyle(0x152945, 1)
        .fillRoundedRect(24, 24, this.params.world.width - 48, this.params.world.height - 48, 24)
        .lineStyle(4, 0x74d7ff, 0.45)
        .strokeRoundedRect(24, 24, this.params.world.width - 48, this.params.world.height - 48, 24);
    }

    this.playerObject = this.art?.addImage(scene, 'player_character', runtime.player.x, runtime.player.y, 92, 74);
    if (this.playerObject === undefined) {
      this.playerObject = drawShooterPlayer(scene, runtime.player.x, runtime.player.y, this.params.player.label, this.params.player.visual);
    }
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
  }

  setPlayerPosition(x: number, y: number): void {
    this.playerObject?.setPosition(x, y);
  }

  renderEnemy(scene: Phaser.Scene, enemy: ShooterEnemyState): void {
    const image = this.art?.addImage(scene, 'enemy', enemy.x, enemy.y, 88, 70);
    this.enemyObjects.set(enemy.id, image ?? drawShooterEnemy(scene, enemy.x, enemy.y, this.params.enemy.label, this.params.enemy.visual));
  }

  renderProjectile(scene: Phaser.Scene, projectile: ShooterProjectileState): void {
    const image = this.art?.addImage(scene, 'projectile', projectile.x, projectile.y, 36, 18);
    this.projectileObjects.set(projectile.id, image ?? drawShooterProjectile(scene, projectile.x, projectile.y, 46, this.params.projectile.visual));
  }

  syncEntityPositions(scene: Phaser.Scene, runtime: ShooterRuntimeState): void {
    for (const enemy of runtime.enemies) {
      this.enemyObjects.get(enemy.id)?.setPosition(enemy.x, enemy.y);
    }

    for (const projectile of runtime.projectiles) {
      const projectileObject = this.projectileObjects.get(projectile.id);
      if (projectileObject === undefined) {
        this.renderProjectile(scene, projectile);
      } else {
        projectileObject.setPosition(projectile.x, projectile.y);
      }
    }

    for (const [id] of this.enemyObjects) {
      if (!runtime.enemies.some((enemy) => enemy.id === id)) {
        this.destroyEnemy(id);
      }
    }

    for (const [id] of this.projectileObjects) {
      if (!runtime.projectiles.some((projectile) => projectile.id === id)) {
        this.destroyProjectile(id);
      }
    }
  }

  destroyEnemy(id: number): void {
    this.enemyObjects.get(id)?.destroy();
    this.enemyObjects.delete(id);
  }

  destroyProjectile(id: number): void {
    this.projectileObjects.get(id)?.destroy();
    this.projectileObjects.delete(id);
  }

  clearDynamicObjects(): void {
    for (const id of this.enemyObjects.keys()) {
      this.destroyEnemy(id);
    }

    for (const id of this.projectileObjects.keys()) {
      this.destroyProjectile(id);
    }
  }

  renderHud(score: number, health: number): void {
    this.scoreText?.setText(`Score ${score}  HP ${health}`);
    this.statusText?.setText('Enter start  Arrow/WASD move  Space fire  R restart');
  }
}
