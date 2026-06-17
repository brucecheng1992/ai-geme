import { describe, expect, it } from 'vitest';

import {
  buildConversationEditableFields,
  buildEditableFields,
  buildLiveObjectTree,
  buildReplacePrepareBodyForEdits,
  buildReplacePrepareBody,
  buildRuntimeApplyReportFromPatchResult
} from '../../apps/maker-workbench/src/live-edit-client.js';
import type { GameDslArtifact, LiveEditCapabilities } from '../../apps/maker-workbench/src/workbench-api.js';

describe('Workbench live edit client helpers', () => {
  it('builds the object tree from canonical stable ids', () => {
    expect(buildLiveObjectTree(makeDsl()).map((node) => `${node.kind}:${node.id}`)).toEqual([
      'world:world',
      'player:player_main',
      'enemyType:tank_basic',
      'projectile:fishbone',
      'wave:wave_1'
    ]);
  });

  it('builds wave nodes from record-shaped Game DSL artifacts', () => {
    expect(buildLiveObjectTree(makeDsl({ waves: { wave_1: { id: 'wave_1' } } })).map((node) => `${node.kind}:${node.id}`)).toEqual([
      'world:world',
      'player:player_main',
      'enemyType:tank_basic',
      'projectile:fishbone',
      'wave:wave_1'
    ]);
  });

  it('hides unsupported property inspector fields', () => {
    expect(buildEditableFields(makeDsl(), { ...capabilities, hot: ['/player/render/scale'] }, '/player')).toEqual([
      expect.objectContaining({ path: '/player/label', label: 'Player concept', value: '小猫', enabled: true, applyMode: 'warm_restart' }),
      expect.objectContaining({ path: '/player/render/scale', label: 'Scale', value: 1, enabled: true, applyMode: 'hot' }),
      expect.objectContaining({ path: '/player/physics/maxSpeed', label: 'Max speed', value: 220, enabled: false, applyMode: 'none' }),
      expect.objectContaining({ path: '/player/health/max', label: 'Max health', value: 3, enabled: false, applyMode: 'none' })
    ]);
  });

  it('builds conversation fields from the full live DSL including warm restart wave count and spawn position', () => {
    expect(buildConversationEditableFields(makeDsl(), capabilities)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/player/label', value: '小猫', valueKind: 'label', applyMode: 'warm_restart', targetKind: 'player' }),
        expect.objectContaining({ path: '/world/width', value: 960, valueKind: 'number', applyMode: 'warm_restart', targetKind: 'world' }),
        expect.objectContaining({ path: '/player/physics/maxSpeed', applyMode: 'hot', targetKind: 'player' }),
        expect.objectContaining({ path: '/enemyTypes/tank_basic/label', value: '坦克', valueKind: 'label', applyMode: 'warm_restart', targetKind: 'enemyType' }),
        expect.objectContaining({ path: '/enemyTypes/tank_basic/health/max', applyMode: 'hot', targetKind: 'enemyType' }),
        expect.objectContaining({ path: '/projectiles/fishbone/damage', applyMode: 'hot', targetKind: 'projectile' }),
        expect.objectContaining({ path: '/level/waves/wave_1/count', value: 8, valueKind: 'number', applyMode: 'warm_restart', targetKind: 'wave' }),
        expect.objectContaining({ path: '/level/waves/wave_1/x', value: 640, valueKind: 'number', applyMode: 'warm_restart', targetKind: 'wave' })
      ])
    );
  });

  it('builds a replace prepare body without runtime code', () => {
    expect(buildReplacePrepareBody('/player/render/scale', 1.3)).toEqual({
      op: 'replace',
      path: '/player/render/scale',
      value: 1.3,
      intent: 'Workbench replace /player/render/scale'
    });
  });

  it('builds a label replace prepare body for semantic live edits', () => {
    expect(buildReplacePrepareBody('/enemyTypes/tank_basic/label', '猫', '把敌人从坦克修改成猫')).toEqual({
      op: 'replace',
      path: '/enemyTypes/tank_basic/label',
      value: '猫',
      intent: '把敌人从坦克修改成猫'
    });
  });

  it('builds a multi-replace prepare body for one natural-language command', () => {
    expect(
      buildReplacePrepareBodyForEdits(
        [
          { path: '/level/waves/wave_1/count', value: 9 },
          { path: '/world/width', value: 1120 }
        ],
        '增加敌人数量，增加游戏x轴'
      )
    ).toEqual({
      ops: [
        { op: 'replace', path: '/level/waves/wave_1/count', value: 9 },
        { op: 'replace', path: '/world/width', value: 1120 }
      ],
      intent: '增加敌人数量，增加游戏x轴'
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

  it('builds a warm restart runtime_apply_report from a successful iframe result', () => {
    expect(
      buildRuntimeApplyReportFromPatchResult(
        'run_20260614_120000_live',
        {
          patch_id: 'patch_workbench_abcd1234',
          live_update_plan_ref: { artifact: 'patch_workbench_abcd1234.live_update_plan.json', patchId: 'patch_workbench_abcd1234' },
          apply_mode: 'warm_restart'
        },
        {
          status: 'applied_warm_restart',
          applyMode: 'warm_restart',
          appliedPaths: ['/level/waves/wave_1/count'],
          runtimeTarget: 'phaser:top_down_shooter',
          warnings: [],
          errors: []
        }
      )
    ).toMatchObject({
      status: 'applied_warm_restart',
      applyMode: 'warm_restart',
      appliedPaths: ['/level/waves/wave_1/count']
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
  warmRestart: ['/player/label', '/enemyTypes/*/label', '/level/waves', '/level/waves/*/count', '/level/waves/*/x', '/world/width'],
  rebuildRequired: []
};

function makeDsl(overrides: { waves?: GameDslArtifact['level']['waves'] } = {}): GameDslArtifact {
  return {
    dslId: 'dsl_test',
    runId: 'run_20260614_120000_live',
    genre: 'top_down_shooter',
    world: { width: 960, height: 540 },
    player: { id: 'player_main', label: '小猫', render: { scale: 1 }, physics: { maxSpeed: 220 }, health: { max: 3 } },
    enemyTypes: { tank_basic: { id: 'tank_basic', label: '坦克', physics: { speed: 100 }, health: { max: 2 } } },
    projectiles: { fishbone: { id: 'fishbone', label: '鱼骨头', speed: 520, damage: 1 } },
    level: { id: 'level_1', waves: overrides.waves ?? [{ id: 'wave_1', enemyTypeRef: 'tank_basic', count: 8, x: 640 }] }
  };
}
