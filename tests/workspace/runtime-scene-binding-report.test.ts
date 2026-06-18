import { describe, expect, it } from 'vitest';

import {
  buildRuntimeSceneBindingReport
} from '../../apps/maker-api/src/compiler/runtime-scene-binding-report.js';
import type { SceneIr } from '../../packages/game-dsl/src/index.js';

const projectId = 'proj_20260618_runtime_binding';
const runId = 'run_20260618_runtime_binding';

describe('Runtime scene binding report', () => {
  it('does not mark Scene IR nodes bound until runtime snapshot evidence is observed', async () => {
    const sceneIr = createSceneIr();
    const pending = buildRuntimeSceneBindingReport({ projectId, runId, sceneIr });

    expect(pending).toMatchObject({
      status: 'fail',
      summary: {
        backgroundCount: 1,
        platformCount: 1,
        enemyInstanceCount: 1,
        goalCount: 1,
        boundCount: 0,
        unboundCount: 5
      },
      bindings: expect.arrayContaining([
        expect.objectContaining({ sceneRuntimeId: 'entity.player', runtimeInstanceId: null, status: 'unbound', reason: 'runtime_observation_pending' })
      ])
    });

    const runtimeReportModule = await import('../../apps/maker-api/src/compiler/runtime-scene-binding-report.js');
    const observed = runtimeReportModule.buildRuntimeObservedSceneBindingReport({
      projectId,
      runId,
      sceneIr,
      snapshot: {
        sceneBindings: {
          source: 'scene_ir',
          bindings: [
            { kind: 'background', sceneRuntimeId: 'background.sky', runtimeInstanceId: 'background.sky', source: 'dsl', sourceDslPath: '/scenes/0/backgroundLayers/0', status: 'bound' },
            { kind: 'platform', sceneRuntimeId: 'platform.ground', runtimeInstanceId: 'platform.ground', source: 'dsl', sourceDslPath: '/scenes/0/platforms/0', status: 'bound' },
            { kind: 'player', sceneRuntimeId: 'entity.player', runtimeInstanceId: 'entity.player', source: 'dsl', sourceDslPath: '/scenes/0/playerSpawn', status: 'bound' },
            { kind: 'enemy', sceneRuntimeId: 'entity.enemy.scout', runtimeInstanceId: 'entity.enemy.scout', source: 'dsl', sourceDslPath: '/scenes/0/enemyInstances/0', status: 'bound' },
            { kind: 'goal', sceneRuntimeId: 'goal.exit', runtimeInstanceId: 'goal.exit', source: 'dsl', sourceDslPath: '/scenes/0/goal', status: 'bound' }
          ]
        }
      }
    });

    expect(observed).toMatchObject({
      status: 'pass',
      summary: { boundCount: 5, unboundCount: 0 },
      bindings: expect.arrayContaining([
        expect.objectContaining({ sceneRuntimeId: 'entity.player', runtimeInstanceId: 'entity.player', status: 'bound' })
      ])
    });
  });
});

function createSceneIr(): SceneIr {
  return {
    schemaVersion: 'step33.scene-ir.v1',
    projectId,
    runId,
    runtimeProfile: 'side_scrolling_run_and_gun.v1',
    source: 'dsl_scene_contract',
    scenes: [
      {
        id: 'runtime_binding_scene',
        world: { width: 1280, height: 540, viewportWidth: 960, viewportHeight: 540 },
        camera: { mode: 'side_follow', followTarget: 'player', bounds: { x: 0, y: 0, width: 1280, height: 540 } },
        backgrounds: [{ runtimeId: 'background.sky', role: 'sky', parallax: 0, depth: -40, provenanceRef: 'background.sky' }],
        platforms: [
          {
            runtimeId: 'platform.ground',
            kind: 'ground',
            x: 0,
            y: 500,
            width: 1280,
            height: 40,
            shape: 'rectangle',
            collider: { runtimeId: 'collider.ground', enabled: true },
            provenanceRef: 'platform.ground'
          }
        ],
        player: { runtimeId: 'entity.player', prefabRef: 'player.run_and_gun.v1', x: 120, y: 452, provenanceRef: 'entity.player' },
        enemyInstances: [
          {
            runtimeId: 'entity.enemy.scout',
            archetypeRef: 'drone_type',
            prefabRef: 'enemy.drone_type.v1',
            x: 640,
            y: 454,
            provenanceRef: 'entity.enemy.scout'
          }
        ],
        goals: [{ runtimeId: 'goal.exit', kind: 'reach', x: 1200, y: 460, provenanceRef: 'goal.exit' }]
      }
    ],
    provenance: {
      'background.sky': { source: 'dsl', dslPath: '/scenes/0/backgroundLayers/0' },
      'platform.ground': { source: 'dsl', dslPath: '/scenes/0/platforms/0' },
      'entity.player': { source: 'dsl', dslPath: '/scenes/0/playerSpawn' },
      'entity.enemy.scout': { source: 'dsl', dslPath: '/scenes/0/enemyInstances/0' },
      'goal.exit': { source: 'dsl', dslPath: '/scenes/0/goal' }
    }
  };
}
