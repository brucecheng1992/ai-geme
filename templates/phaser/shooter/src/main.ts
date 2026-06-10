import Phaser from 'phaser';

import { ShooterGameScene } from './GameScene.js';
import { defaultShooterParams } from './template-params.js';

const scene = new ShooterGameScene(defaultShooterParams);

if (typeof window !== 'undefined') {
  class ShooterPhaserScene extends Phaser.Scene {
    constructor() {
      super('ShooterPhaserScene');
    }

    create(): void {
      scene.create(this);
    }
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: defaultShooterParams.world.width,
    height: defaultShooterParams.world.height,
    backgroundColor: '#07111f',
    scene: ShooterPhaserScene
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      scene.start();
    }

    if (event.key === ' ') {
      scene.fire();
    }

    if (event.key === 'ArrowRight') {
      scene.hitEnemy();
    }

    if (event.key.toLowerCase() === 'r') {
      scene.restart();
    }
  });
} else {
  scene.create();
}

export { scene };
