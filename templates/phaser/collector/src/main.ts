import Phaser from 'phaser';

import { CollectorGameScene } from './GameScene.js';
import generatedAssetManifest from './asset-manifest.generated.json';
import generatedRuntimeAuthority from './runtime-authority.generated.json';
import { createCollectorArtRuntime } from './collector-art-library.js';
import { buildRuntimeAuthoritySnapshot } from '../../shared/runtime-authority.js';
import generatedParams from './template-params.generated.json';
import { defaultCollectorParams, type CollectorTemplateParams } from './template-params.js';

const collectorParams = mergeCollectorParams(generatedParams as Partial<CollectorTemplateParams>);
const collectorArt = createCollectorArtRuntime(generatedAssetManifest);
const runtimeAuthority = buildRuntimeAuthoritySnapshot(generatedRuntimeAuthority);
const scene = new CollectorGameScene(collectorParams, collectorArt, runtimeAuthority);

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

    update(_time: number, delta: number): void {
      scene.update(delta);
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

    const direction = directionFromKey(event.key);
    if (direction !== undefined) {
      event.preventDefault();
      scene.setMoveInput(direction, true);
    }

    if (event.key.toLowerCase() === 'r') {
      scene.restart();
    }
  });

  window.addEventListener('keyup', (event) => {
    const direction = directionFromKey(event.key);
    if (direction !== undefined) {
      scene.setMoveInput(direction, false);
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

function directionFromKey(key: string): 'left' | 'right' | 'up' | 'down' | undefined {
  const normalized = key.toLowerCase();
  if (key === 'ArrowLeft' || normalized === 'a') {
    return 'left';
  }
  if (key === 'ArrowRight' || normalized === 'd') {
    return 'right';
  }
  if (key === 'ArrowUp' || normalized === 'w') {
    return 'up';
  }
  if (key === 'ArrowDown' || normalized === 's') {
    return 'down';
  }
  return undefined;
}
