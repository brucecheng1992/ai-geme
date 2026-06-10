import Phaser from 'phaser';

import { DodgerGameScene } from './GameScene.js';
import { defaultDodgerParams } from './template-params.js';

const scene = new DodgerGameScene(defaultDodgerParams);

if (typeof window !== 'undefined') {
  class DodgerPhaserScene extends Phaser.Scene {
    constructor() {
      super('DodgerPhaserScene');
    }

    create(): void {
      scene.create(this);
    }
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: defaultDodgerParams.world.width,
    height: defaultDodgerParams.world.height,
    backgroundColor: '#07111f',
    scene: DodgerPhaserScene
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      scene.start();
    }

    if (event.key === 'ArrowRight') {
      scene.dodgeFrame();
    }

    if (event.key.toLowerCase() === 'h') {
      scene.hitHazard();
    }

    if (event.key.toLowerCase() === 'r') {
      scene.restart();
    }
  });
} else {
  scene.create();
}

export { scene };
