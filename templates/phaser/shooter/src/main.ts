import Phaser from 'phaser';

import { ShooterGameScene } from './GameScene.js';
import generatedAssetManifest from './asset-manifest.generated.json';
import generatedLiveEditRegistry from './live-edit-registry.generated.json';
import { createShooterArtRuntime } from './shooter-art-library.js';
import generatedRuntimePlan from './runtime-plan.generated.json';
import type { ShooterDirection } from './shooter-runtime.js';
import { defaultShooterRuntimePlan, type ShooterRuntimePlan } from './shooter-runtime-plan.js';
import generatedParams from './template-params.generated.json';
import { defaultShooterParams, type ShooterTemplateParams } from './template-params.js';

const shooterParams = mergeShooterParams(generatedParams as Partial<ShooterTemplateParams>);
const shooterRuntimePlan = mergeShooterRuntimePlan(generatedRuntimePlan as Partial<ShooterRuntimePlan>);
const shooterArt = createShooterArtRuntime(generatedAssetManifest);
const scene = new ShooterGameScene(shooterParams, shooterRuntimePlan, shooterArt, generatedLiveEditRegistry);

if (typeof window !== 'undefined') {
  class ShooterPhaserScene extends Phaser.Scene {
    constructor() {
      super('ShooterPhaserScene');
    }

    preload(): void {
      shooterArt.preload(this);
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
    width: shooterParams.world.width,
    height: shooterParams.world.height,
    backgroundColor: '#07111f',
    scene: ShooterPhaserScene
  });
  installLiveEditProtocol(scene);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      scene.start();
    }

    if (event.key === ' ') {
      event.preventDefault();
      scene.fire();
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

function installLiveEditProtocol(gameScene: ShooterGameScene): void {
  const bridge = gameScene.getLiveEditBridge();
  window.parent?.postMessage({ type: 'AIGAME_RUNTIME_READY', runtimeTarget: 'phaser:top_down_shooter' }, '*');
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (data === null || typeof data !== 'object' || typeof data.type !== 'string') {
      return;
    }

    try {
      if (data.type === 'AIGAME_GET_CAPABILITIES') {
        event.source?.postMessage({ type: 'AIGAME_PATCH_RESULT', status: 'capabilities', capabilities: bridge.getCapabilities() }, { targetOrigin: event.origin || '*' });
      } else if (data.type === 'AIGAME_APPLY_PATCH') {
        const result = bridge.applyPatch('runtimePatch' in data ? data.runtimePatch : undefined);
        event.source?.postMessage({ type: 'AIGAME_PATCH_RESULT', result }, { targetOrigin: event.origin || '*' });
      }
    } catch (error) {
      event.source?.postMessage(
        {
          type: 'AIGAME_RUNTIME_ERROR',
          message: error instanceof Error ? error.message : 'Unknown runtime bridge error.'
        },
        { targetOrigin: event.origin || '*' }
      );
    }
  });
}

function mergeShooterParams(params: Partial<ShooterTemplateParams>): ShooterTemplateParams {
  return {
    ...defaultShooterParams,
    ...params,
    world: { ...defaultShooterParams.world, ...params.world },
    player: { ...defaultShooterParams.player, ...params.player, visual: { ...defaultShooterParams.player.visual, ...params.player?.visual } },
    projectile: { ...defaultShooterParams.projectile, ...params.projectile, visual: { ...defaultShooterParams.projectile.visual, ...params.projectile?.visual } },
    enemy: { ...defaultShooterParams.enemy, ...params.enemy, visual: { ...defaultShooterParams.enemy.visual, ...params.enemy?.visual } },
    scoring: { ...defaultShooterParams.scoring, ...params.scoring },
    objective: { ...defaultShooterParams.objective, ...params.objective },
    ui: {
      ...defaultShooterParams.ui,
      ...params.ui,
      screens: { ...defaultShooterParams.ui.screens, ...params.ui?.screens }
    }
  };
}

function mergeShooterRuntimePlan(plan: Partial<ShooterRuntimePlan>): ShooterRuntimePlan {
  return {
    ...defaultShooterRuntimePlan,
    ...plan,
    enemy_waves: plan.enemy_waves ?? defaultShooterRuntimePlan.enemy_waves
  };
}

function directionFromKey(key: string): ShooterDirection | undefined {
  const normalized = key.toLowerCase();
  if (normalized === 'arrowleft' || normalized === 'a') {
    return 'left';
  }

  if (normalized === 'arrowright' || normalized === 'd') {
    return 'right';
  }

  if (normalized === 'arrowup' || normalized === 'w') {
    return 'up';
  }

  if (normalized === 'arrowdown' || normalized === 's') {
    return 'down';
  }

  return undefined;
}
