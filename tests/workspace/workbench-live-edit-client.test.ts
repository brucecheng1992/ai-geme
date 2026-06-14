import { describe, expect, it } from 'vitest';

import {
  buildEditableFields,
  buildLiveObjectTree,
  buildReplacePrepareBody,
  buildRuntimeApplyReportFromPatchResult
} from '../../apps/maker-workbench/src/live-edit-client.js';
import type { GameDslArtifact, LiveEditCapabilities } from '../../apps/maker-workbench/src/workbench-api.js';

describe('Workbench live edit client helpers', () => {
  it('builds the object tree from canonical stable ids', () => {
    expect(buildLiveObjectTree(makeDsl()).map((node) => `${node.kind}:${node.id}`)).toEqual([
      'player:player_main',
      'enemyType:tank_basic',
      'projectile:fishbone',
      'wave:wave_1'
    ]);
  });

  it('builds wave nodes from record-shaped Game DSL artifacts', () => {
    expect(buildLiveObjectTree(makeDsl({ waves: { wave_1: { id: 'wave_1' } } })).map((node) => `${node.kind}:${node.id}`)).toEqual([
      'player:player_main',
      'enemyType:tank_basic',
      'projectile:fishbone',
      'wave:wave_1'
    ]);
  });

  it('hides unsupported property inspector fields', () => {
    expect(buildEditableFields(makeDsl(), { ...capabilities, hot: ['/player/render/scale'] }, '/player')).toEqual([
      { path: '/player/render/scale', label: 'Scale', value: 1, enabled: true },
      { path: '/player/physics/maxSpeed', label: 'Max speed', value: 220, enabled: false },
      { path: '/player/health/max', label: 'Max health', value: 3, enabled: false }
    ]);
  });

  it('builds a replace prepare body without runtime code', () => {
    expect(buildReplacePrepareBody('/player/render/scale', 1.3)).toEqual({
      op: 'replace',
      path: '/player/render/scale',
      value: 1.3,
      intent: 'Workbench replace /player/render/scale'
    });
  });

  it('builds a runtime_apply_report from a successful iframe patch result', () => {
    expect(
      buildRuntimeApplyReportFromPatchResult(
        'run_20260614_120000_live',
        {
          patch_id: 'patch_workbench_abcd1234',
          live_update_plan_ref: { artifact: 'patch_workbench_abcd1234.live_update_plan.json', patchId: 'patch_workbench_abcd1234' },
          apply_mode: 'hot'
        },
        {
          status: 'applied_hot',
          applyMode: 'hot',
          appliedPaths: ['/player/render/scale'],
          runtimeTarget: 'phaser:top_down_shooter',
          warnings: [],
          errors: []
        }
      )
    ).toEqual({
      artifactKind: 'runtime_apply_report',
      schemaVersion: 'runtime_apply_report.v1',
      runId: 'run_20260614_120000_live',
      patchId: 'patch_workbench_abcd1234',
      liveUpdatePlanRef: { artifact: 'patch_workbench_abcd1234.live_update_plan.json', patchId: 'patch_workbench_abcd1234' },
      status: 'applied_hot',
      applyMode: 'hot',
      runtimeTarget: 'phaser:top_down_shooter',
      appliedPaths: ['/player/render/scale'],
      warnings: [],
      errors: []
    });
  });

  it('builds a failed runtime_apply_report when the iframe rejects the patch', () => {
    expect(
      buildRuntimeApplyReportFromPatchResult(
        'run_20260614_120000_live',
        {
          patch_id: 'patch_workbench_abcd1234',
          live_update_plan_ref: { artifact: 'patch_workbench_abcd1234.live_update_plan.json', patchId: 'patch_workbench_abcd1234' },
          apply_mode: 'hot'
        },
        {
          status: 'failed_runtime_apply',
          applyMode: 'none',
          appliedPaths: [],
          runtimeTarget: 'phaser:top_down_shooter',
          warnings: [],
          errors: [{ code: 'UNSUPPORTED_RUNTIME_PATCH', path: '/player/render/scale', message: 'No bridge.' }]
        }
      )
    ).toMatchObject({
      status: 'failed_runtime_apply',
      applyMode: 'hot',
      errors: [{ code: 'UNSUPPORTED_RUNTIME_PATCH' }]
    });
  });
});

const capabilities: LiveEditCapabilities = {
  hot: [
    '/player/render/scale',
    '/player/physics/maxSpeed',
    '/player/health/max',
    '/enemyTypes/*/physics/speed',
    '/enemyTypes/*/health/max',
    '/projectiles/*/speed',
    '/projectiles/*/damage'
  ],
  assetSwap: [],
  warmRestart: [],
  rebuildRequired: []
};

function makeDsl(overrides: { waves?: GameDslArtifact['level']['waves'] } = {}): GameDslArtifact {
  return {
    dslId: 'dsl_test',
    runId: 'run_20260614_120000_live',
    genre: 'top_down_shooter',
    player: { id: 'player_main', label: '小猫', render: { scale: 1 }, physics: { maxSpeed: 220 }, health: { max: 3 } },
    enemyTypes: { tank_basic: { id: 'tank_basic', label: '坦克', physics: { speed: 100 }, health: { max: 2 } } },
    projectiles: { fishbone: { id: 'fishbone', label: '鱼骨头', speed: 520, damage: 1 } },
    level: { id: 'level_1', waves: overrides.waves ?? [{ id: 'wave_1' }] }
  };
}
