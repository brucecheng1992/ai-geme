import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DslLiveEditService } from '../../apps/maker-api/src/projects/dsl-live-edit.service.js';
import { LocalWorkspaceService } from '../../apps/maker-api/src/workspace/local-workspace.service.js';
import {
  buildGameDslArtifact,
  buildRuntimeCapabilityReport,
  DslPatchV1Schema,
  RawGameDslSchema,
  validateAndPlanDslPatch,
  validateGameDslArtifact,
  type DslPatchV1,
  type GameDslArtifact
} from '../../packages/game-dsl/src/index.js';
import { createDodgerRawDsl, createShooterRawDsl, createSideScrollingRunAndGunRawDsl } from '../contracts/fixtures.js';

const projectId = 'proj_20260614_120000_live';
const runId = 'run_20260614_120000_live';

describe('DSL live edit pipeline', () => {
  let root: string;
  let workspace: LocalWorkspaceService;
  let service: DslLiveEditService;
  let baseDsl: GameDslArtifact;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-live-edit-'));
    workspace = new LocalWorkspaceService(root);
    service = new DslLiveEditService(workspace);
    baseDsl = buildTopDownShooterDsl();
    await service.initializeLiveVersion({ projectId, runId, artifact: baseDsl });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('exposes top_down_shooter liveEditCapabilities in runtime_capability_report', () => {
    const report = buildRuntimeCapabilityReport({ runId, validatedDsl: baseDsl });

    expect(report).toMatchObject({
      artifactKind: 'runtime_capability_report',
      schemaVersion: 'runtime_capability_report.v1',
      runId,
      validatedDslRef: { artifactKind: 'game_dsl', schemaVersion: 'game_dsl.v1', dslId: baseDsl.dslId },
      selectedAdapterId: 'top_down_shooter.phaser.v1',
      status: 'supported',
      requiredCapabilities: expect.arrayContaining(['projectile_combat']),
      liveEditCapabilities: {
        hot: expect.arrayContaining(['/player/physics/maxSpeed', '/projectiles/*/damage']),
        assetSwap: expect.arrayContaining(['/assets/roles/player']),
        warmRestart: expect.arrayContaining(['/player/label', '/enemyTypes/*/label', '/level/waves', '/level/waves/*/count', '/world/width']),
        rebuildRequired: expect.arrayContaining(['/genre', '/world/coordinateSystem'])
      }
    });
  });

  it('keeps runtime unsupported separate from DSL validation', () => {
    const sideScrolling = buildGameDslArtifact({
      rawDsl: RawGameDslSchema.parse(createSideScrollingRunAndGunRawDsl()),
      runId,
      intentPlan: { normalizedGenre: 'side_scrolling_run_and_gun', matchedAlias: '魂斗罗式' }
    });

    expect(buildRuntimeCapabilityReport({ runId, validatedDsl: sideScrolling })).toMatchObject({
      status: 'unsupported',
      unsupportedCapabilities: expect.arrayContaining([expect.objectContaining({ capability: 'side_view_camera' })]),
      liveEditCapabilities: { hot: [], assetSwap: [], warmRestart: [], rebuildRequired: [] }
    });
    const patch = DslPatchV1Schema.parse({
      artifactKind: 'dsl_patch',
      schemaVersion: 'dsl_patch.v1',
      patchId: 'patch_unsupported_runtime',
      runId,
      baseDslId: sideScrolling.dslId,
      baseVersionId: 'v_initial',
      source: 'workbench',
      intent: 'try live edit on unsupported runtime',
      ops: [{ op: 'replace', path: '/player/render/scale', value: 1.2 }]
    });

    expect(validateGameDslArtifact(sideScrolling).report).toMatchObject({ status: 'valid', errorCount: 0 });
    expect(validateAndPlanDslPatch({ baseDsl: sideScrolling, patch, baseVersionId: 'v_initial' })).toMatchObject({
      ok: true,
      report: { status: 'valid', errorCount: 0 },
      plan: { status: 'unsupported', applyMode: 'none' }
    });
  });

  it('keeps dodger_collector runtime reports aligned with the executable registry', () => {
    const dodger = buildGameDslArtifact({
      rawDsl: RawGameDslSchema.parse(createDodgerRawDsl()),
      runId,
      intentPlan: { normalizedGenre: 'dodger_collector' }
    });

    expect(buildRuntimeCapabilityReport({ runId, validatedDsl: dodger })).toMatchObject({
      status: 'supported',
      runtimeSupportStatus: 'supported',
      runtimeTemplateId: 'phaser/dodger_v1',
      qaProfile: 'dodger_collector_smoke',
      selectedAdapterId: 'dodger_collector.phaser.v1',
      unsupportedCapabilities: [],
      liveEditCapabilities: { hot: [], assetSwap: [], warmRestart: [], rebuildRequired: [] }
    });
  });

  it('applies a valid hot patch after runtime confirmation, emits artifacts, and records patch history', async () => {
    const patch = makePatch([
      { op: 'replace', path: '/player/render/scale', value: 1.4 },
      { op: 'replace', path: '/player/physics/maxSpeed', value: 360 },
      { op: 'replace', path: '/enemyTypes/alien/physics/speed', value: 180 },
      { op: 'replace', path: '/enemyTypes/alien/health/max', value: 3 },
      { op: 'replace', path: '/projectiles/bolt/speed', value: 760 },
      { op: 'replace', path: '/projectiles/bolt/damage', value: 2 }
    ]);

    const prepared = await service.prepareLiveEditPatch({ projectId, runId, patch });

    expect(prepared).toMatchObject({
      status: 'hot_patchable',
      applyMode: 'hot',
      validationReport: { status: 'valid', errorCount: 0 },
      liveUpdatePlan: {
        artifactKind: 'live_update_plan',
        status: 'hot_patchable',
        runtimePatch: {
          player: { scale: 1.4, maxSpeed: 360 },
          enemyTypes: { alien: { speed: 180, maxHealth: 3 } },
          projectiles: { bolt: { speed: 760, damage: 2 } }
        }
      }
    });
    await expect(readFile(workspace.getLivePatchHistoryPath(projectId, runId), 'utf8')).rejects.toThrow();
    const result = await service.recordRuntimeApplyResult({
      projectId,
      runId,
      patchId: patch.patchId,
      report: {
        artifactKind: 'runtime_apply_report',
        schemaVersion: 'runtime_apply_report.v1',
        runId,
        patchId: patch.patchId,
        liveUpdatePlanRef: { artifact: `${patch.patchId}.live_update_plan.json`, patchId: patch.patchId },
        status: 'applied_hot',
        applyMode: 'hot',
        runtimeTarget: 'mock-runtime',
        appliedPaths: [
          '/player/render/scale',
          '/player/physics/maxSpeed',
          '/enemyTypes/alien/physics/speed',
          '/enemyTypes/alien/health/max',
          '/projectiles/bolt/speed',
          '/projectiles/bolt/damage'
        ],
        warnings: [],
        errors: []
      }
    });
    await expect(readCurrentVersion()).resolves.toMatchObject({
      versionId: result.versionId,
      baseVersionId: 'v_initial',
      dslId: expect.any(String)
    });
    const patchedDsl = JSON.parse(await readFile(workspace.getLiveArtifactPath(projectId, runId, `${result.versionId}.game_dsl.json`), 'utf8')) as GameDslArtifact;
    expect(patchedDsl).toMatchObject({
      player: { render: { scale: 1.4 }, physics: { maxSpeed: 360 } },
      enemyTypes: { alien: { physics: { speed: 180 }, health: { max: 3 } } },
      projectiles: { bolt: { speed: 760, damage: 2 } }
    });
    expect(validateGameDslArtifact(patchedDsl).report).toMatchObject({
      artifactKind: 'dsl_validation_report',
      status: 'valid',
      errorCount: 0
    });
    const historyLines = (await readFile(workspace.getLivePatchHistoryPath(projectId, runId), 'utf8')).trim().split('\n');
    expect(historyLines).toHaveLength(1);
    expect(JSON.parse(historyLines[0])).toMatchObject({
      patchId: patch.patchId,
      versionId: result.versionId,
      baseVersionId: 'v_initial',
      status: 'applied',
      ops: patch.ops,
      artifactRefs: expect.objectContaining({
        patch: expect.stringContaining('dsl_patch'),
        validationReport: expect.stringContaining('patch_validation_report'),
        liveUpdatePlan: expect.stringContaining('live_update_plan')
      })
    });
    await expect(readAuditLog()).resolves.toEqual([
      expect.objectContaining({
        patchId: patch.patchId,
        status: 'applied',
        artifactRefs: expect.objectContaining({ dsl: expect.stringContaining(`${result.versionId}.game_dsl.json`) })
      })
    ]);
    await expect(readFile(workspace.getLiveArtifactPath(projectId, runId, `${patch.patchId}.patch_validation_report.json`), 'utf8')).resolves.toContain('"status": "valid"');
    await expect(readFile(workspace.getLiveArtifactPath(projectId, runId, `${patch.patchId}.live_update_plan.json`), 'utf8')).resolves.toContain('"applyMode": "hot"');
    await expect(readFile(workspace.getLiveArtifactPath(projectId, runId, `${patch.patchId}.runtime_apply_report.json`), 'utf8')).resolves.toContain('"status": "applied_hot"');
  });

  it('prepares a hot patch and only advances current_version after runtime apply success', async () => {
    const before = await readCurrentVersion();
    const patch = makePatch([{ op: 'replace', path: '/player/render/scale', value: 1.3 }]);

    const prepared = await service.prepareLiveEditPatch({ projectId, runId, patch });

    expect(prepared).toMatchObject({
      patchId: patch.patchId,
      status: 'hot_patchable',
      applyMode: 'hot',
      runtimePatch: { player: { scale: 1.3 } },
      validationReport: { status: 'valid' }
    });
    await expect(readCurrentVersion()).resolves.toEqual(before);
    await expect(readFile(workspace.getLivePatchHistoryPath(projectId, runId), 'utf8')).rejects.toThrow();

    const recorded = await service.recordRuntimeApplyResult({
      projectId,
      runId,
      patchId: patch.patchId,
      report: {
        artifactKind: 'runtime_apply_report',
        schemaVersion: 'runtime_apply_report.v1',
        runId,
        patchId: patch.patchId,
        liveUpdatePlanRef: { artifact: `${patch.patchId}.live_update_plan.json`, patchId: patch.patchId },
        status: 'applied_hot',
        applyMode: 'hot',
        runtimeTarget: 'mock-runtime',
        appliedPaths: ['/player/render/scale'],
        warnings: [],
        errors: []
      }
    });

    expect(recorded).toMatchObject({ status: 'applied_hot', versionId: expect.stringContaining(patch.patchId) });
    await expect(readCurrentVersion()).resolves.toMatchObject({ versionId: recorded.versionId, baseVersionId: 'v_initial' });
    await expect(readPatchHistory()).resolves.toEqual([expect.objectContaining({ patchId: patch.patchId, status: 'applied' })]);
    await expect(readAuditLog()).resolves.toEqual([expect.objectContaining({ patchId: patch.patchId, status: 'applied' })]);
    await expect(readFile(workspace.getLiveArtifactPath(projectId, runId, `${patch.patchId}.runtime_apply_report.json`), 'utf8')).resolves.toContain('"status": "applied_hot"');
  });

  it('keeps repeated runtime results idempotent after a patch was applied', async () => {
    const patch = makePatch([{ op: 'replace', path: '/player/render/scale', value: 1.3 }]);
    await service.prepareLiveEditPatch({ projectId, runId, patch });
    const successReport = {
      artifactKind: 'runtime_apply_report',
      schemaVersion: 'runtime_apply_report.v1',
      runId,
      patchId: patch.patchId,
      liveUpdatePlanRef: { artifact: `${patch.patchId}.live_update_plan.json`, patchId: patch.patchId },
      status: 'applied_hot',
      applyMode: 'hot',
      runtimeTarget: 'mock-runtime',
      appliedPaths: ['/player/render/scale'],
      warnings: [],
      errors: []
    };
    const first = await service.recordRuntimeApplyResult({ projectId, runId, patchId: patch.patchId, report: successReport });
    const reportPath = workspace.getLiveArtifactPath(projectId, runId, `${patch.patchId}.runtime_apply_report.json`);
    const reportAfterSuccess = await readFile(reportPath, 'utf8');
    const historyAfterSuccess = await readPatchHistory();
    const auditAfterSuccess = await readAuditLog();

    const replay = await service.recordRuntimeApplyResult({
      projectId,
      runId,
      patchId: patch.patchId,
      report: {
        ...successReport,
        status: 'failed_runtime_apply',
        appliedPaths: [],
        errors: [{ code: 'LATE_RUNTIME_FAILURE', path: '/player/render/scale', message: 'late failure should not overwrite applied evidence' }]
      }
    });

    expect(replay).toMatchObject({ status: 'applied_hot', versionId: first.versionId });
    await expect(readFile(reportPath, 'utf8')).resolves.toBe(reportAfterSuccess);
    await expect(readPatchHistory()).resolves.toEqual(historyAfterSuccess);
    await expect(readAuditLog()).resolves.toEqual(auditAfterSuccess);
  });

  it('records runtime apply failure without advancing current_version or patch_history', async () => {
    const before = await readCurrentVersion();
    const patch = makePatch([{ op: 'replace', path: '/player/physics/maxSpeed', value: 320 }]);
    await service.prepareLiveEditPatch({ projectId, runId, patch });

    const recorded = await service.recordRuntimeApplyResult({
      projectId,
      runId,
      patchId: patch.patchId,
      report: {
        artifactKind: 'runtime_apply_report',
        schemaVersion: 'runtime_apply_report.v1',
        runId,
        patchId: patch.patchId,
        liveUpdatePlanRef: { artifact: `${patch.patchId}.live_update_plan.json`, patchId: patch.patchId },
        status: 'failed_runtime_apply',
        applyMode: 'hot',
        runtimeTarget: 'mock-runtime',
        appliedPaths: [],
        warnings: [],
        errors: [{ code: 'MOCK_RUNTIME_FAILURE', path: '/player/physics/maxSpeed', message: 'mock failure' }]
      }
    });

    expect(recorded).toMatchObject({ status: 'failed_runtime_apply' });
    await expect(readCurrentVersion()).resolves.toEqual(before);
    await expect(readFile(workspace.getLivePatchHistoryPath(projectId, runId), 'utf8')).rejects.toThrow();
    await expect(readAuditLog()).resolves.toEqual([expect.objectContaining({ patchId: patch.patchId, status: 'failed_runtime_apply' })]);
  });

  it('rejects invalid paths without mutating current_version', async () => {
    const before = await readCurrentVersion();
    const patch = makePatch([{ op: 'replace', path: '/player/name', value: 'Nope' }]);

    const result = await service.applyPatch({ projectId, runId, patch });

    expect(result).toMatchObject({
      status: 'failed_validation',
      validationReport: {
        status: 'invalid',
        errors: expect.arrayContaining([expect.objectContaining({ code: 'PATCH_PATH_NOT_ALLOWED' })])
      },
      liveUpdatePlan: { applyMode: 'none' }
    });
    await expect(readCurrentVersion()).resolves.toEqual(before);
    await expect(readFile(workspace.getLivePatchHistoryPath(projectId, runId), 'utf8')).rejects.toThrow();
    await expect(readAuditLog()).resolves.toEqual([expect.objectContaining({ patchId: patch.patchId, status: 'invalid' })]);
  });

  it('rejects invalid value types without mutating current_version', async () => {
    const before = await readCurrentVersion();
    const patch = makePatch([{ op: 'replace', path: '/projectiles/bolt/damage', value: 'hard' }]);

    const result = await service.applyPatch({ projectId, runId, patch });

    expect(result).toMatchObject({
      status: 'failed_validation',
      validationReport: {
        status: 'invalid',
        errors: expect.arrayContaining([expect.objectContaining({ code: 'PATCH_VALUE_INVALID' })])
      }
    });
    await expect(readCurrentVersion()).resolves.toEqual(before);
    await expect(readAuditLog()).resolves.toEqual([expect.objectContaining({ patchId: patch.patchId, status: 'invalid' })]);
  });

  it('writes validation artifacts for schema-invalid patches without mutating current_version', async () => {
    const before = await readCurrentVersion();
    const result = await service.applyPatch({
      projectId,
      runId,
      patch: {
        artifactKind: 'dsl_patch',
        schemaVersion: 'dsl_patch.v1',
        patchId: 'not/a/safe/id',
        runId,
        baseDslId: baseDsl.dslId,
        baseVersionId: 'v_initial',
        source: 'workbench',
        intent: 'schema invalid patch',
        ops: [{ op: 'move', path: '/player/render/scale', value: 1.3 }]
      }
    });

    expect(result).toMatchObject({
      patchId: 'patch_invalid',
      status: 'failed_validation',
      applyMode: 'none',
      validationReport: {
        status: 'invalid',
        errors: expect.arrayContaining([expect.objectContaining({ code: 'PATCH_SCHEMA_INVALID' })])
      }
    });
    await expect(readCurrentVersion()).resolves.toEqual(before);
    await expect(readFile(workspace.getLiveArtifactPath(projectId, runId, 'patch_invalid.dsl_patch.candidate.json'), 'utf8')).resolves.toContain('"op": "move"');
    await expect(readFile(workspace.getLiveArtifactPath(projectId, runId, 'patch_invalid.patch_validation_report.json'), 'utf8')).resolves.toContain('"status": "invalid"');
    await expect(readAuditLog()).resolves.toEqual([expect.objectContaining({ patchId: 'patch_invalid', status: 'invalid' })]);
  });

  it('rejects code-like patch values on whitelisted asset swap paths', async () => {
    const before = await readCurrentVersion();
    const patch = makePatch([{ op: 'replace', path: '/assets/roles/player', value: 'javascript:eval(code)' }]);

    const result = await service.applyPatch({ projectId, runId, patch });

    expect(result).toMatchObject({
      status: 'failed_validation',
      validationReport: {
        status: 'invalid',
        errors: expect.arrayContaining([expect.objectContaining({ code: 'ARBITRARY_CODE_NOT_ALLOWED' })])
      }
    });
    await expect(readCurrentVersion()).resolves.toEqual(before);
    await expect(readAuditLog()).resolves.toEqual([expect.objectContaining({ patchId: patch.patchId, status: 'invalid' })]);
  });

  it('writes pending candidate DSL for rebuild_required patches without mutating current_version', async () => {
    const before = await readCurrentVersion();
    const patch = makePatch([{ op: 'replace', path: '/genre', value: 'vertical_shooter' }]);

    const result = await service.applyPatch({ projectId, runId, patch });

    expect(result).toMatchObject({
      status: 'rebuild_required',
      applyMode: 'rebuild',
      validationReport: { status: 'valid' },
      liveUpdatePlan: { status: 'rebuild_required', reason: expect.stringContaining('rebuild') }
    });
    await expect(readCurrentVersion()).resolves.toEqual(before);
    const candidatePath = workspace.getLivePendingArtifactPath(projectId, runId, patch.patchId, 'game_dsl.candidate.json');
    const reportPath = workspace.getLivePendingArtifactPath(projectId, runId, patch.patchId, 'dsl_validation_report.json');
    const planPath = workspace.getLivePendingArtifactPath(projectId, runId, patch.patchId, 'live_update_plan.json');
    await expect(readFile(candidatePath, 'utf8')).resolves.toContain('"genre": "vertical_shooter"');
    await expect(readFile(reportPath, 'utf8')).resolves.toContain('"artifactKind": "dsl_validation_report"');
    await expect(readFile(planPath, 'utf8')).resolves.toContain('"status": "rebuild_required"');
    await expect(readFile(workspace.getLivePatchHistoryPath(projectId, runId), 'utf8')).rejects.toThrow();
    await expect(readAuditLog()).resolves.toEqual([
      expect.objectContaining({
        patchId: patch.patchId,
        status: 'rebuild_required',
        artifactRefs: expect.objectContaining({
          pendingDslCandidate: candidatePath,
          pendingDslValidationReport: reportPath,
          pendingLiveUpdatePlan: planPath
        })
      })
    ]);
  });

  it('commits a warm restart wave-count patch after runtime confirmation', async () => {
    const before = await readCurrentVersion();
    const patch = makePatch([{ op: 'replace', path: '/level/waves/alien_wave/count', value: 9 }]);

    const prepared = await service.applyPatch({ projectId, runId, patch });

    expect(prepared).toMatchObject({
      status: 'warm_restart_required',
      applyMode: 'warm_restart',
      runtimePatch: { level: { waves: { alien_wave: { count: 9 } } } },
      validationReport: { status: 'valid' },
      liveUpdatePlan: {
        status: 'warm_restart_required',
        applyMode: 'warm_restart',
        affectedPaths: ['/level/waves/alien_wave/count']
      }
    });
    await expect(readCurrentVersion()).resolves.toEqual(before);
    const pendingCandidatePath = workspace.getLivePendingArtifactPath(projectId, runId, patch.patchId, 'game_dsl.candidate.json');
    await expect(readFile(pendingCandidatePath, 'utf8')).resolves.toContain('"count": 9');
    await expect(readAuditLog()).resolves.toEqual([
      expect.objectContaining({
        patchId: patch.patchId,
        status: 'warm_restart_required',
        applyMode: 'warm_restart'
      })
    ]);

    const recorded = await service.recordRuntimeApplyResult({
      projectId,
      runId,
      patchId: patch.patchId,
      report: {
        artifactKind: 'runtime_apply_report',
        schemaVersion: 'runtime_apply_report.v1',
        runId,
        patchId: patch.patchId,
        liveUpdatePlanRef: { artifact: `${patch.patchId}.live_update_plan.json`, patchId: patch.patchId },
        status: 'applied_warm_restart',
        applyMode: 'warm_restart',
        runtimeTarget: 'phaser:top_down_shooter',
        appliedPaths: ['/level/waves/alien_wave/count'],
        warnings: [],
        errors: []
      }
    });

    expect(recorded).toMatchObject({ status: 'applied_warm_restart', versionId: expect.stringContaining(patch.patchId) });
    const patchedDsl = JSON.parse(await readFile(workspace.getLiveArtifactPath(projectId, runId, `${recorded.versionId}.game_dsl.json`), 'utf8')) as GameDslArtifact;
    expect(patchedDsl.level.waves.alien_wave.count).toBe(9);
    expect(patchedDsl.sourceDsl.entities.find((entity) => entity.id === 'alien')).toMatchObject({ count: 9 });
    expect(patchedDsl.sourceDsl.objectives.win).toMatchObject({ target: 9 });
    expect(patchedDsl.winLose).toMatchObject({ target: 9 });
    await expect(readPatchHistory()).resolves.toEqual([expect.objectContaining({ patchId: patch.patchId, status: 'applied' })]);
    await expect(readAuditLog()).resolves.toEqual([
      expect.objectContaining({ patchId: patch.patchId, status: 'warm_restart_required' }),
      expect.objectContaining({ patchId: patch.patchId, status: 'applied', applyMode: 'warm_restart' })
    ]);
  });

  it('commits a warm restart world width patch after runtime confirmation', async () => {
    const before = await readCurrentVersion();
    const patch = makePatch([{ op: 'replace', path: '/world/width', value: 1120 }]);

    const prepared = await service.applyPatch({ projectId, runId, patch });

    expect(prepared).toMatchObject({
      status: 'warm_restart_required',
      applyMode: 'warm_restart',
      runtimePatch: { world: { width: 1120 } },
      validationReport: { status: 'valid' },
      liveUpdatePlan: {
        status: 'warm_restart_required',
        applyMode: 'warm_restart',
        affectedPaths: ['/world/width']
      }
    });
    await expect(readCurrentVersion()).resolves.toEqual(before);

    const recorded = await service.recordRuntimeApplyResult({
      projectId,
      runId,
      patchId: patch.patchId,
      report: {
        artifactKind: 'runtime_apply_report',
        schemaVersion: 'runtime_apply_report.v1',
        runId,
        patchId: patch.patchId,
        liveUpdatePlanRef: { artifact: `${patch.patchId}.live_update_plan.json`, patchId: patch.patchId },
        status: 'applied_warm_restart',
        applyMode: 'warm_restart',
        runtimeTarget: 'phaser:top_down_shooter',
        appliedPaths: ['/world/width'],
        warnings: [],
        errors: []
      }
    });

    const patchedDsl = JSON.parse(await readFile(workspace.getLiveArtifactPath(projectId, runId, `${recorded.versionId}.game_dsl.json`), 'utf8')) as GameDslArtifact;
    expect(patchedDsl.world.width).toBe(1120);
    expect(patchedDsl.sourceDsl.world.width).toBe(1120);
  });

  it('validates a side-scrolling pickup kind patch while keeping unsupported runtime separate', async () => {
    const pickupRunId = `${runId}_pickup`;
    const pickupDsl = buildPickupSideScrollingDsl(pickupRunId);
    await service.initializeLiveVersion({ projectId, runId: pickupRunId, artifact: pickupDsl });
    const patch = DslPatchV1Schema.parse({
      artifactKind: 'dsl_patch',
      schemaVersion: 'dsl_patch.v1',
      patchId: 'patch_pickup_kind',
      runId: pickupRunId,
      baseDslId: pickupDsl.dslId,
      baseVersionId: 'v_initial',
      source: 'workbench',
      intent: 'turn the field pickup into a weapon pickup',
      ops: [{ op: 'replace', path: '/pickups/field_medkit/kind', value: 'weapon' }]
    });

    const prepared = await service.applyPatch({ projectId, runId: pickupRunId, patch });

    expect(prepared).toMatchObject({
      status: 'unsupported',
      applyMode: 'none',
      validationReport: { status: 'valid', errorCount: 0 },
      liveUpdatePlan: {
        status: 'unsupported',
        applyMode: 'none',
        affectedPaths: ['/pickups/field_medkit/kind']
      }
    });
    expect(prepared.runtimePatch).toBeUndefined();
    const pendingCandidatePath = workspace.getLivePendingArtifactPath(projectId, pickupRunId, patch.patchId, 'game_dsl.candidate.json');
    const pendingCandidate = JSON.parse(await readFile(pendingCandidatePath, 'utf8')) as GameDslArtifact;
    expect(pendingCandidate.pickups?.field_medkit).toMatchObject({ kind: 'weapon' });
    expect(pendingCandidate.sourceDsl.pickups?.find((pickup) => pickup.id === 'field_medkit')).toMatchObject({ kind: 'weapon' });
    await expect(readFile(workspace.getLivePatchHistoryPath(projectId, pickupRunId), 'utf8')).rejects.toThrow();
    await expect(readAuditLog(pickupRunId)).resolves.toEqual([expect.objectContaining({ patchId: patch.patchId, status: 'unsupported', applyMode: 'none' })]);
  });

  it('rejects pickup patches for missing ids and unsupported kinds', () => {
    const pickupDsl = buildPickupSideScrollingDsl(`${runId}_pickup_contract`);
    const validPatchBase = {
      artifactKind: 'dsl_patch',
      schemaVersion: 'dsl_patch.v1',
      runId: `${runId}_pickup_contract`,
      baseDslId: pickupDsl.dslId,
      baseVersionId: 'v_initial',
      source: 'workbench',
      intent: 'pickup contract regression'
    } as const;

    expect(
      validateAndPlanDslPatch({
        baseDsl: pickupDsl,
        baseVersionId: 'v_initial',
        patch: DslPatchV1Schema.parse({
          ...validPatchBase,
          patchId: 'patch_pickup_kind_bad',
          ops: [{ op: 'replace', path: '/pickups/field_medkit/kind', value: 'shield' }]
        })
      })
    ).toMatchObject({
      ok: false,
      report: { status: 'invalid', errors: [expect.objectContaining({ code: 'PATCH_VALUE_INVALID', path: 'ops.0.value' })] },
      plan: { status: 'failed_validation', applyMode: 'none' }
    });

    expect(
      validateAndPlanDslPatch({
        baseDsl: pickupDsl,
        baseVersionId: 'v_initial',
        patch: DslPatchV1Schema.parse({
          ...validPatchBase,
          patchId: 'patch_pickup_missing',
          ops: [{ op: 'replace', path: '/pickups/missing/kind', value: 'weapon' }]
        })
      })
    ).toMatchObject({
      ok: false,
      report: { status: 'invalid', errors: [expect.objectContaining({ code: 'PATCH_VALUE_INVALID', path: 'ops.0.value' })] },
      plan: { status: 'failed_validation', applyMode: 'none' }
    });

    expect(
      validateAndPlanDslPatch({
        baseDsl: pickupDsl,
        baseVersionId: 'v_initial',
        patch: DslPatchV1Schema.parse({
          ...validPatchBase,
          patchId: 'patch_pickup_value_blocked',
          ops: [{ op: 'replace', path: '/pickups/field_medkit/value', value: 99 }]
        })
      })
    ).toMatchObject({
      ok: false,
      report: { status: 'invalid', errors: [expect.objectContaining({ code: 'PATCH_PATH_NOT_ALLOWED', path: 'ops.0.path' })] },
      plan: { status: 'failed_validation', applyMode: 'none' }
    });
  });

  it('commits an enemy concept replacement as a warm restart semantic live edit', async () => {
    const before = await readCurrentVersion();
    const patch = makePatch([{ op: 'replace', path: '/enemyTypes/alien/label', value: '猫' }]);

    const prepared = await service.applyPatch({ projectId, runId, patch });

    expect(prepared).toMatchObject({
      status: 'warm_restart_required',
      applyMode: 'warm_restart',
      runtimePatch: {
        enemyTypes: {
          alien: {
            label: '猫',
            visual: { kind: 'cat', fillColor: 0xffd28a, accentColor: 0xffc36b }
          }
        }
      },
      validationReport: { status: 'valid' },
      liveUpdatePlan: {
        status: 'warm_restart_required',
        applyMode: 'warm_restart',
        affectedPaths: ['/enemyTypes/alien/label']
      }
    });
    await expect(readCurrentVersion()).resolves.toEqual(before);
    const pendingCandidatePath = workspace.getLivePendingArtifactPath(projectId, runId, patch.patchId, 'game_dsl.candidate.json');
    const pendingCandidate = JSON.parse(await readFile(pendingCandidatePath, 'utf8')) as GameDslArtifact;
    expect(pendingCandidate.enemyTypes.alien.label).toBe('猫');
    expect(pendingCandidate.sourceDsl.entities.find((entity) => entity.id === 'alien')).toMatchObject({ label: '猫' });

    const recorded = await service.recordRuntimeApplyResult({
      projectId,
      runId,
      patchId: patch.patchId,
      report: {
        artifactKind: 'runtime_apply_report',
        schemaVersion: 'runtime_apply_report.v1',
        runId,
        patchId: patch.patchId,
        liveUpdatePlanRef: { artifact: `${patch.patchId}.live_update_plan.json`, patchId: patch.patchId },
        status: 'applied_warm_restart',
        applyMode: 'warm_restart',
        runtimeTarget: 'phaser:top_down_shooter',
        appliedPaths: ['/enemyTypes/alien/label'],
        warnings: [],
        errors: []
      }
    });

    expect(recorded).toMatchObject({ status: 'applied_warm_restart', versionId: expect.stringContaining(patch.patchId) });
    const patchedDsl = JSON.parse(await readFile(workspace.getLiveArtifactPath(projectId, runId, `${recorded.versionId}.game_dsl.json`), 'utf8')) as GameDslArtifact;
    expect(patchedDsl.enemyTypes.alien.label).toBe('猫');
    expect(patchedDsl.sourceDsl.entities.find((entity) => entity.id === 'alien')).toMatchObject({ label: '猫' });
    expect(validateGameDslArtifact(patchedDsl).report).toMatchObject({ status: 'valid', errorCount: 0 });
    await expect(readPatchHistory()).resolves.toEqual([expect.objectContaining({ patchId: patch.patchId, status: 'applied' })]);
    await expect(readAuditLog()).resolves.toEqual([
      expect.objectContaining({ patchId: patch.patchId, status: 'warm_restart_required' }),
      expect.objectContaining({ patchId: patch.patchId, status: 'applied', applyMode: 'warm_restart' })
    ]);
  });

  it('commits a player concept replacement as a warm restart semantic live edit', async () => {
    const before = await readCurrentVersion();
    const patch = makePatch([{ op: 'replace', path: '/player/label', value: '小猫' }]);

    const prepared = await service.applyPatch({ projectId, runId, patch });

    expect(prepared).toMatchObject({
      status: 'warm_restart_required',
      applyMode: 'warm_restart',
      runtimePatch: {
        player: {
          label: '小猫',
          visual: { kind: 'cat', fillColor: 0xffd28a, accentColor: 0xffc36b }
        }
      },
      validationReport: { status: 'valid' },
      liveUpdatePlan: {
        status: 'warm_restart_required',
        applyMode: 'warm_restart',
        affectedPaths: ['/player/label']
      }
    });
    await expect(readCurrentVersion()).resolves.toEqual(before);
    const pendingCandidatePath = workspace.getLivePendingArtifactPath(projectId, runId, patch.patchId, 'game_dsl.candidate.json');
    const pendingCandidate = JSON.parse(await readFile(pendingCandidatePath, 'utf8')) as GameDslArtifact;
    expect(pendingCandidate.player.label).toBe('小猫');
    expect(pendingCandidate.sourceDsl.player.label).toBe('小猫');

    const recorded = await service.recordRuntimeApplyResult({
      projectId,
      runId,
      patchId: patch.patchId,
      report: {
        artifactKind: 'runtime_apply_report',
        schemaVersion: 'runtime_apply_report.v1',
        runId,
        patchId: patch.patchId,
        liveUpdatePlanRef: { artifact: `${patch.patchId}.live_update_plan.json`, patchId: patch.patchId },
        status: 'applied_warm_restart',
        applyMode: 'warm_restart',
        runtimeTarget: 'phaser:top_down_shooter',
        appliedPaths: ['/player/label'],
        warnings: [],
        errors: []
      }
    });

    expect(recorded).toMatchObject({ status: 'applied_warm_restart', versionId: expect.stringContaining(patch.patchId) });
    const patchedDsl = JSON.parse(await readFile(workspace.getLiveArtifactPath(projectId, runId, `${recorded.versionId}.game_dsl.json`), 'utf8')) as GameDslArtifact;
    expect(patchedDsl.player.label).toBe('小猫');
    expect(patchedDsl.sourceDsl.player.label).toBe('小猫');
    expect(validateGameDslArtifact(patchedDsl).report).toMatchObject({ status: 'valid', errorCount: 0 });
  });

  it('keeps mixed warm and hot candidate patches source-consistent', async () => {
    const patch = makePatch([
      { op: 'replace', path: '/player/label', value: '小猫' },
      { op: 'replace', path: '/player/physics/maxSpeed', value: 320 },
      { op: 'replace', path: '/enemyTypes/alien/health/max', value: 4 }
    ]);

    const prepared = await service.applyPatch({ projectId, runId, patch });

    expect(prepared).toMatchObject({
      status: 'warm_restart_required',
      validationReport: { status: 'valid' },
      runtimePatch: {
        player: { label: '小猫', maxSpeed: 320 },
        enemyTypes: { alien: { maxHealth: 4 } }
      }
    });
    const pendingCandidatePath = workspace.getLivePendingArtifactPath(projectId, runId, patch.patchId, 'game_dsl.candidate.json');
    const pendingCandidate = JSON.parse(await readFile(pendingCandidatePath, 'utf8')) as GameDslArtifact;
    expect(pendingCandidate.player.physics.maxSpeed).toBe(320);
    expect(pendingCandidate.sourceDsl.player.movement.speed_px_per_sec).toBe(320);
    expect(pendingCandidate.enemyTypes.alien.health.max).toBe(4);
    expect(pendingCandidate.sourceDsl.entities.find((entity) => entity.id === 'alien')).toMatchObject({ health: 4 });
    expect(validateGameDslArtifact(pendingCandidate).report).toMatchObject({ status: 'valid', errorCount: 0 });
  });

  it('records unsupported patches in edit_audit_log without patch_history', async () => {
    const unsupportedRunId = `${runId}_unsupported`;
    const sideScrolling = buildGameDslArtifact({
      rawDsl: RawGameDslSchema.parse(createSideScrollingRunAndGunRawDsl()),
      runId: unsupportedRunId,
      intentPlan: { normalizedGenre: 'side_scrolling_run_and_gun', matchedAlias: '魂斗罗式' }
    });
    await service.initializeLiveVersion({ projectId, runId: unsupportedRunId, artifact: sideScrolling });
    const patch = DslPatchV1Schema.parse({
      artifactKind: 'dsl_patch',
      schemaVersion: 'dsl_patch.v1',
      patchId: 'patch_unsupported_service',
      runId: unsupportedRunId,
      baseDslId: sideScrolling.dslId,
      baseVersionId: 'v_initial',
      source: 'workbench',
      intent: 'unsupported live edit attempt',
      ops: [{ op: 'replace', path: '/player/render/scale', value: 1.3 }]
    });

    const result = await service.applyPatch({ projectId, runId: unsupportedRunId, patch });

    expect(result).toMatchObject({ status: 'unsupported', applyMode: 'none', validationReport: { status: 'valid' } });
    await expect(readFile(workspace.getLivePatchHistoryPath(projectId, unsupportedRunId), 'utf8')).rejects.toThrow();
    await expect(readAuditLog(unsupportedRunId)).resolves.toEqual([expect.objectContaining({ patchId: patch.patchId, status: 'unsupported' })]);
    await expect(readFile(workspace.getLivePendingArtifactPath(projectId, unsupportedRunId, patch.patchId, 'game_dsl.candidate.json'), 'utf8')).resolves.toContain('"scale": 1.3');
  });

  it('runs a deterministic cat-vs-tank hot patch flow through runtime-confirmed commit', async () => {
    const tankRunId = `${runId}_tank`;
    const tankDsl = buildCatVsTankDsl(tankRunId);
    const tankService = new DslLiveEditService(workspace);
    await tankService.initializeLiveVersion({ projectId, runId: tankRunId, artifact: tankDsl });
    const patch = DslPatchV1Schema.parse({
      artifactKind: 'dsl_patch',
      schemaVersion: 'dsl_patch.v1',
      patchId: 'patch_cat_tank_hot',
      runId: tankRunId,
      baseDslId: tankDsl.dslId,
      baseVersionId: 'v_initial',
      source: 'workbench',
      intent: 'scale cat, speed player, slow tank',
      ops: [
        { op: 'replace', path: '/player/render/scale', value: 1.3 },
        { op: 'replace', path: '/player/physics/maxSpeed', value: 320 },
        { op: 'replace', path: '/enemyTypes/tank_basic/physics/speed', value: 80 }
      ]
    });

    const prepared = await tankService.prepareLiveEditPatch({ projectId, runId: tankRunId, patch });

    expect(prepared).toMatchObject({
      status: 'hot_patchable',
      runtimePatch: {
        player: { scale: 1.3, maxSpeed: 320 },
        enemyTypes: { tank_basic: { speed: 80 } }
      },
      validationReport: { status: 'valid' }
    });
    await expect(readFile(workspace.getLiveArtifactPath(projectId, tankRunId, `${patch.patchId}.dsl_patch.json`), 'utf8')).resolves.toContain('"patch_cat_tank_hot"');
    await expect(readFile(workspace.getLiveArtifactPath(projectId, tankRunId, `${patch.patchId}.patch_validation_report.json`), 'utf8')).resolves.toContain('"status": "valid"');
    await expect(readFile(workspace.getLiveArtifactPath(projectId, tankRunId, `${patch.patchId}.live_update_plan.json`), 'utf8')).resolves.toContain('"status": "hot_patchable"');
    await expect(readFile(workspace.getLivePatchHistoryPath(projectId, tankRunId), 'utf8')).rejects.toThrow();

    const result = await tankService.recordRuntimeApplyResult({
      projectId,
      runId: tankRunId,
      patchId: patch.patchId,
      report: {
        artifactKind: 'runtime_apply_report',
        schemaVersion: 'runtime_apply_report.v1',
        runId: tankRunId,
        patchId: patch.patchId,
        liveUpdatePlanRef: { artifact: `${patch.patchId}.live_update_plan.json`, patchId: patch.patchId },
        status: 'applied_hot',
        applyMode: 'hot',
        runtimeTarget: 'phaser:top_down_shooter',
        appliedPaths: ['/player/render/scale', '/player/physics/maxSpeed', '/enemyTypes/tank_basic/physics/speed'],
        warnings: [],
        errors: []
      }
    });

    expect(result).toMatchObject({ status: 'applied_hot', versionId: expect.stringContaining(patch.patchId) });
    await expect(readFile(workspace.getLiveArtifactPath(projectId, tankRunId, `${patch.patchId}.runtime_apply_report.json`), 'utf8')).resolves.toContain('"status": "applied_hot"');
    await expect(readJsonLines(workspace.getLivePatchHistoryPath(projectId, tankRunId))).resolves.toEqual([expect.objectContaining({ patchId: patch.patchId, status: 'applied' })]);
    await expect(readJsonLines(workspace.getLiveEditAuditLogPath(projectId, tankRunId))).resolves.toEqual([expect.objectContaining({ patchId: patch.patchId, status: 'applied' })]);
  });

  it('keeps patch_history replay scoped to applied versions only', async () => {
    const invalidPatch = makePatch([{ op: 'replace', path: '/player/name', value: 'Nope' }]);
    const hotPatch = makePatch([{ op: 'replace', path: '/projectiles/bolt/damage', value: 3 }]);

    await service.applyPatch({ projectId, runId, patch: invalidPatch });
    await service.prepareLiveEditPatch({ projectId, runId, patch: hotPatch });
    const result = await service.recordRuntimeApplyResult({
      projectId,
      runId,
      patchId: hotPatch.patchId,
      report: {
        artifactKind: 'runtime_apply_report',
        schemaVersion: 'runtime_apply_report.v1',
        runId,
        patchId: hotPatch.patchId,
        liveUpdatePlanRef: { artifact: `${hotPatch.patchId}.live_update_plan.json`, patchId: hotPatch.patchId },
        status: 'applied_hot',
        applyMode: 'hot',
        runtimeTarget: 'mock-runtime',
        appliedPaths: ['/projectiles/bolt/damage'],
        warnings: [],
        errors: []
      }
    });

    const replayRecords = await readPatchHistory();
    expect(replayRecords).toEqual([
      expect.objectContaining({
        patchId: hotPatch.patchId,
        versionId: result.versionId,
        status: 'applied'
      })
    ]);
    expect(replayRecords).not.toEqual(expect.arrayContaining([expect.objectContaining({ patchId: invalidPatch.patchId })]));
    await expect(readAuditLog()).resolves.toEqual([
      expect.objectContaining({ patchId: invalidPatch.patchId, status: 'invalid' }),
      expect.objectContaining({ patchId: hotPatch.patchId, status: 'applied' })
    ]);
  });

  function makePatch(ops: DslPatchV1['ops']): DslPatchV1 {
    return DslPatchV1Schema.parse({
      artifactKind: 'dsl_patch',
      schemaVersion: 'dsl_patch.v1',
      patchId: `patch_${Math.random().toString(36).slice(2, 10)}`,
      runId,
      baseDslId: baseDsl.dslId,
      baseVersionId: 'v_initial',
      source: 'workbench',
      intent: 'test patch',
      ops
    });
  }

  async function readCurrentVersion() {
    return JSON.parse(await readFile(workspace.getLiveCurrentVersionPath(projectId, runId), 'utf8'));
  }

  async function readAuditLog(targetRunId = runId) {
    return readJsonLines(workspace.getLiveEditAuditLogPath(projectId, targetRunId));
  }

  async function readPatchHistory(targetRunId = runId) {
    return readJsonLines(workspace.getLivePatchHistoryPath(projectId, targetRunId));
  }
});

function buildTopDownShooterDsl(): GameDslArtifact {
  return buildGameDslArtifact({
    rawDsl: RawGameDslSchema.parse(createShooterRawDsl()),
    runId,
    intentPlan: { normalizedGenre: 'top_down_shooter', matchedAlias: '小猫大战坦克' }
  });
}

function buildPickupSideScrollingDsl(targetRunId: string): GameDslArtifact {
  return buildGameDslArtifact({
    rawDsl: RawGameDslSchema.parse(createSideScrollingRunAndGunRawDsl()),
    runId: targetRunId,
    intentPlan: { normalizedGenre: 'side_scrolling_run_and_gun', matchedAlias: 'pickup contract' }
  });
}

function buildCatVsTankDsl(targetRunId: string): GameDslArtifact {
  const rawDsl = RawGameDslSchema.parse(createShooterRawDsl());
  rawDsl.player.label = '小猫';
  rawDsl.entities = [
    { id: 'fishbone', kind: 'projectile', label: '鱼骨头', damage: 1, movement: { type: 'move_right', speed_px_per_sec: 520 } },
    { id: 'tank_basic', kind: 'enemy', label: '坦克', count: 8, health: 1, movement: { type: 'chase_player', speed_px_per_sec: 100 } }
  ];
  rawDsl.player.actions = rawDsl.player.actions.map((action) => ({ ...action, spawns: 'fishbone' }));
  rawDsl.rules.collisions = rawDsl.rules.collisions.map((collision) => ({ ...collision, source: 'fishbone', target: 'tank_basic' }));
  rawDsl.objectives.win = { type: 'enemy_cleared', target: 8 };
  return buildGameDslArtifact({
    rawDsl,
    runId: targetRunId,
    intentPlan: { normalizedGenre: 'top_down_shooter', matchedAlias: '小猫大战坦克' }
  });
}

async function readJsonLines(path: string): Promise<unknown[]> {
  const content = await readFile(path, 'utf8');
  return content
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
