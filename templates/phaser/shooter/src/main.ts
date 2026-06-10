import Phaser from 'phaser';

import { ShooterGameScene } from './GameScene.js';
import generatedParams from './template-params.generated.json';
import { defaultShooterParams, type ShooterTemplateParams } from './template-params.js';

const shooterParams = mergeShooterParams(generatedParams as Partial<ShooterTemplateParams>);
const scene = new ShooterGameScene(shooterParams);

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
    width: shooterParams.world.width,
    height: shooterParams.world.height,
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

function mergeShooterParams(params: Partial<ShooterTemplateParams>): ShooterTemplateParams {
  return {
    ...defaultShooterParams,
    ...params,
    world: { ...defaultShooterParams.world, ...params.world },
    player: { ...defaultShooterParams.player, ...params.player },
    projectile: { ...defaultShooterParams.projectile, ...params.projectile },
    enemy: { ...defaultShooterParams.enemy, ...params.enemy },
    scoring: { ...defaultShooterParams.scoring, ...params.scoring },
    objective: { ...defaultShooterParams.objective, ...params.objective }
  };
}
