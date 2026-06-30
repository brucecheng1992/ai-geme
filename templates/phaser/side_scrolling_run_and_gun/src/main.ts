import Phaser from 'phaser';

import { SideScrollingRunAndGunScene, type SideScrollingDirection } from './GameScene.js';
import { buildRuntimeAuthoritySnapshot } from '../../shared/runtime-authority.js';
import generatedAssetManifest from './asset-manifest.generated.json';
import generatedLiveEditRegistry from './live-edit-registry.generated.json';
import generatedRuntimeAuthority from './runtime-authority.generated.json';
import generatedRuntimePlan from './runtime-plan.generated.json';
import generatedSceneIr from './scene-ir.generated.json';
import { createSideScrollingArtRuntime } from './side-scrolling-art-library.js';
import { resolveSideScrollingRuntimeSliceWithSceneIr, type SideScrollingSceneIr } from './side-scrolling-scene-ir.js';
import {
  defaultSideScrollingRuntimePlan,
  type SideScrollingRuntimePlan
} from './side-scrolling-runtime-plan.js';
import generatedParams from './template-params.generated.json';
import { defaultSideScrollingParams, type SideScrollingTemplateParams } from './template-params.js';

const sideScrollingParams = mergeSideScrollingParams(generatedParams as Partial<SideScrollingTemplateParams>);
const sideScrollingRuntimePlan = mergeSideScrollingRuntimePlan(generatedRuntimePlan as Partial<SideScrollingRuntimePlan>);
const sideScrollingSceneRuntime = resolveSideScrollingRuntimeSliceWithSceneIr(sideScrollingRuntimePlan, generatedSceneIr as SideScrollingSceneIr);
const sideScrollingRuntimeSlice = sideScrollingSceneRuntime.plan;
const sideScrollingArt = createSideScrollingArtRuntime(generatedAssetManifest);
const runtimeAuthority = buildRuntimeAuthoritySnapshot(generatedRuntimeAuthority);
const scene = new SideScrollingRunAndGunScene(
  sideScrollingParams,
  { side_scrolling: sideScrollingRuntimeSlice },
  sideScrollingArt,
  sideScrollingSceneRuntime.bindingState,
  runtimeAuthority
);

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
  installLiveEditProtocol(scene);

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

    if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
      event.preventDefault();
      scene.crouch();
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
    if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
      event.preventDefault();
      scene.stand();
    }

    const direction = directionFromKey(event.key);
    if (direction !== undefined) {
      scene.setRunInput(direction, false);
    }
  });
} else {
  scene.create();
}

export { scene };

function installLiveEditProtocol(gameScene: SideScrollingRunAndGunScene): void {
  const bridge = gameScene.getLiveEditBridge();
  const runtimeRunId = typeof generatedLiveEditRegistry.runId === 'string' ? generatedLiveEditRegistry.runId : '';
  const previewInstanceId = `preview_${Math.random().toString(36).slice(2, 10)}`;
  window.parent?.postMessage({ type: 'AIGAME_RUNTIME_READY', runId: runtimeRunId, previewInstanceId, runtimeTarget: 'phaser:side_scrolling_run_and_gun' }, '*');
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (data === null || typeof data !== 'object' || typeof data.type !== 'string') {
      return;
    }
    const requestPatchId = 'patchId' in data && typeof data.patchId === 'string' ? data.patchId : undefined;
    const requestRunId = 'runId' in data && typeof data.runId === 'string' ? data.runId : undefined;
    const requestPreviewInstanceId = 'previewInstanceId' in data && typeof data.previewInstanceId === 'string' ? data.previewInstanceId : undefined;

    try {
      if (data.type === 'AIGAME_GET_CAPABILITIES') {
        if (!messageTargetsThisPreview(requestRunId, requestPreviewInstanceId, runtimeRunId, previewInstanceId)) {
          return;
        }
        event.source?.postMessage(
          { type: 'AIGAME_PATCH_RESULT', runId: runtimeRunId, patchId: requestPatchId, previewInstanceId, status: 'capabilities', capabilities: bridge.getCapabilities() },
          { targetOrigin: event.origin || '*' }
        );
      } else if (data.type === 'AIGAME_APPLY_PATCH') {
        if (requestPatchId === undefined || !messageTargetsThisPreview(requestRunId, requestPreviewInstanceId, runtimeRunId, previewInstanceId)) {
          return;
        }
        const result = bridge.applyPatch('runtimePatch' in data ? data.runtimePatch : undefined);
        event.source?.postMessage({ type: 'AIGAME_PATCH_RESULT', runId: runtimeRunId, patchId: requestPatchId, previewInstanceId, result }, { targetOrigin: event.origin || '*' });
      }
    } catch (error) {
      event.source?.postMessage(
        {
          type: 'AIGAME_RUNTIME_ERROR',
          runId: runtimeRunId,
          patchId: requestPatchId,
          previewInstanceId,
          message: error instanceof Error ? error.message : 'Unknown runtime bridge error.'
        },
        { targetOrigin: event.origin || '*' }
      );
    }
  });
}

function messageTargetsThisPreview(requestRunId: string | undefined, requestPreviewInstanceId: string | undefined, runtimeRunId: string, previewInstanceId: string): boolean {
  return requestRunId !== undefined && requestPreviewInstanceId !== undefined && (runtimeRunId === '' || requestRunId === runtimeRunId) && requestPreviewInstanceId === previewInstanceId;
}

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
