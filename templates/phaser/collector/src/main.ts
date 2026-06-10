import Phaser from 'phaser';

import { CollectorGameScene } from './GameScene.js';
import { defaultCollectorParams } from './template-params.js';

const scene = new CollectorGameScene(defaultCollectorParams);

if (typeof window !== 'undefined') {
  class CollectorPhaserScene extends Phaser.Scene {
    constructor() {
      super('CollectorPhaserScene');
    }

    create(): void {
      scene.create(this);
    }
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: defaultCollectorParams.world.width,
    height: defaultCollectorParams.world.height,
    backgroundColor: '#07111f',
    scene: CollectorPhaserScene
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      scene.start();
    }

    if (event.key === 'ArrowRight') {
      scene.collectItem();
    }

    if (event.key.toLowerCase() === 'r') {
      scene.restart();
    }
  });
} else {
  scene.create();
}

export { scene };
