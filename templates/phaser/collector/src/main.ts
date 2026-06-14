import Phaser from 'phaser';

import { CollectorGameScene } from './GameScene.js';
import generatedAssetManifest from './asset-manifest.generated.json';
import { createCollectorArtRuntime } from './collector-art-library.js';
import generatedParams from './template-params.generated.json';
import { defaultCollectorParams, type CollectorTemplateParams } from './template-params.js';

const collectorParams = mergeCollectorParams(generatedParams as Partial<CollectorTemplateParams>);
const collectorArt = createCollectorArtRuntime(generatedAssetManifest);
const scene = new CollectorGameScene(collectorParams, collectorArt);

if (typeof window !== 'undefined') {
  class CollectorPhaserScene extends Phaser.Scene {
    constructor() {
      super('CollectorPhaserScene');
    }

    preload(): void {
      collectorArt.preload(this);
    }

    create(): void {
      scene.create(this);
    }
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: collectorParams.world.width,
    height: collectorParams.world.height,
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

function mergeCollectorParams(params: Partial<CollectorTemplateParams>): CollectorTemplateParams {
  return {
    ...defaultCollectorParams,
    ...params,
    world: { ...defaultCollectorParams.world, ...params.world },
    player: { ...defaultCollectorParams.player, ...params.player },
    collectible: { ...defaultCollectorParams.collectible, ...params.collectible },
    objective: { ...defaultCollectorParams.objective, ...params.objective },
    ui: {
      ...defaultCollectorParams.ui,
      ...params.ui,
      screens: { ...defaultCollectorParams.ui.screens, ...params.ui?.screens }
    }
  };
}
