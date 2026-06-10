import Phaser from 'phaser';

import { DodgerGameScene } from './GameScene.js';
import generatedParams from './template-params.generated.json';
import { defaultDodgerParams, type DodgerTemplateParams } from './template-params.js';

const dodgerParams = mergeDodgerParams(generatedParams as Partial<DodgerTemplateParams>);
const scene = new DodgerGameScene(dodgerParams);

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
    width: dodgerParams.world.width,
    height: dodgerParams.world.height,
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

function mergeDodgerParams(params: Partial<DodgerTemplateParams>): DodgerTemplateParams {
  return {
    ...defaultDodgerParams,
    ...params,
    world: { ...defaultDodgerParams.world, ...params.world },
    player: { ...defaultDodgerParams.player, ...params.player },
    hazard: { ...defaultDodgerParams.hazard, ...params.hazard },
    objective: { ...defaultDodgerParams.objective, ...params.objective }
  };
}
