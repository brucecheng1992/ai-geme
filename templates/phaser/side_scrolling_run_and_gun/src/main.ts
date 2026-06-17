import Phaser from 'phaser';

import { SideScrollingRunAndGunScene, type SideScrollingDirection } from './GameScene.js';
import generatedAssetManifest from './asset-manifest.generated.json';
import generatedRuntimePlan from './runtime-plan.generated.json';
import { createSideScrollingArtRuntime } from './side-scrolling-art-library.js';
import {
  defaultSideScrollingRuntimePlan,
  resolveSideScrollingRuntimeSlice,
  type SideScrollingRuntimePlan
} from './side-scrolling-runtime-plan.js';
import generatedParams from './template-params.generated.json';
import { defaultSideScrollingParams, type SideScrollingTemplateParams } from './template-params.js';

const sideScrollingParams = mergeSideScrollingParams(generatedParams as Partial<SideScrollingTemplateParams>);
const sideScrollingRuntimePlan = mergeSideScrollingRuntimePlan(generatedRuntimePlan as Partial<SideScrollingRuntimePlan>);
const sideScrollingRuntimeSlice = resolveSideScrollingRuntimeSlice(sideScrollingRuntimePlan);
const sideScrollingArt = createSideScrollingArtRuntime(generatedAssetManifest);
const scene = new SideScrollingRunAndGunScene(sideScrollingParams, sideScrollingRuntimePlan, sideScrollingArt);

if (typeof window !== 'undefined') {
  class SideScrollingPhaserScene extends Phaser.Scene {
    constructor() {
      super('SideScrollingPhaserScene');
    }

    preload(): void {
      sideScrollingArt.preload(this);
    }

    create(): void {
      scene.create(this);
    }

    update(time: number, delta: number): void {
      scene.update(time, delta);
    }
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: sideScrollingRuntimeSlice.scene.viewport.width,
    height: sideScrollingRuntimeSlice.scene.viewport.height,
    backgroundColor: '#10253a',
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: sideScrollingRuntimeSlice.scene.world.gravityY } }
    },
    scene: SideScrollingPhaserScene
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      scene.start();
    }

    if (event.key === ' ' || event.key.toLowerCase() === 'w' || event.key === 'ArrowUp') {
      event.preventDefault();
      scene.jump();
    }

    if (event.key.toLowerCase() === 'j') {
      event.preventDefault();
      scene.fire();
    }

    const direction = directionFromKey(event.key);
    if (direction !== undefined) {
      event.preventDefault();
      scene.setRunInput(direction, true);
    }

    if (event.key.toLowerCase() === 'r') {
      scene.restart();
    }
  });

  window.addEventListener('keyup', (event) => {
    const direction = directionFromKey(event.key);
    if (direction !== undefined) {
      scene.setRunInput(direction, false);
    }
  });
} else {
  scene.create();
}

export { scene };

function mergeSideScrollingParams(params: Partial<SideScrollingTemplateParams>): SideScrollingTemplateParams {
  return {
    ...defaultSideScrollingParams,
    ...params,
    style: { ...defaultSideScrollingParams.style, ...params.style },
    player: { ...defaultSideScrollingParams.player, ...params.player },
    assetLabels: {
      ...defaultSideScrollingParams.assetLabels,
      ...params.assetLabels
    },
    ui: {
      ...defaultSideScrollingParams.ui,
      ...params.ui,
      screens: { ...defaultSideScrollingParams.ui.screens, ...params.ui?.screens }
    }
  };
}

function mergeSideScrollingRuntimePlan(plan: Partial<SideScrollingRuntimePlan>): SideScrollingRuntimePlan {
  return {
    ...defaultSideScrollingRuntimePlan,
    ...plan,
    side_scrolling: plan.side_scrolling ?? defaultSideScrollingRuntimePlan.side_scrolling
  };
}

function directionFromKey(key: string): SideScrollingDirection | undefined {
  const normalized = key.toLowerCase();
  if (key === 'ArrowLeft' || normalized === 'a') {
    return 'left';
  }

  if (key === 'ArrowRight' || normalized === 'd') {
    return 'right';
  }

  return undefined;
}
