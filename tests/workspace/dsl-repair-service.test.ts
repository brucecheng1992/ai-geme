import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyDslPatch } from '../../apps/maker-api/src/repair/dsl-patch-apply.js';
import { DslRepairService } from '../../apps/maker-api/src/repair/dsl-repair.service.js';
import { MAX_REPAIR_ATTEMPTS } from '../../apps/maker-api/src/repair/dsl-repair.types.js';
import { LocalWorkspaceService } from '../../apps/maker-api/src/workspace/local-workspace.service.js';
import { DslPatchSchema, validateAndNormalizeRawGameDsl } from '../../packages/game-dsl/src/index.js';
import { createCollectorRawDsl, createShooterRawDsl } from '../contracts/fixtures.js';

const projectId = 'proj_20260610_040000_repair';
const runId = 'run_20260610_040000_repair';

describe('DslRepairService', () => {
  let root: string;
  let workspace: LocalWorkspaceService;
  let service: DslRepairService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-repair-'));
    workspace = new LocalWorkspaceService(root);
    service = new DslRepairService(workspace);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('repairs a shooter DSL missing projectile mechanics and writes a report', async () => {
    const raw = createShooterRawDsl();
    raw.entities = raw.entities.filter((entity) => entity.kind !== 'projectile');
    raw.rules.collisions = [];
    const failed = validateAndNormalizeRawGameDsl(raw);
    expect(failed.ok).toBe(false);

    const report = await service.repair({ projectId, runId, attempt: 1, rawDsl: raw, source: 'validation', issues: failed.ok ? [] : failed.issues });

    expect(report.status).toBe('REPAIRED');
    expect(report.repaired_dsl?.game.genre).toBe('shooter');
    expect(report.repaired_dsl?.entities.some((entity) => entity.kind === 'projectile')).toBe(true);
    expect(report.attempts[0]?.patch?.changes.length).toBeLessThanOrEqual(10);
    await expect(readFile(workspace.getRepairReportPath(projectId, runId), 'utf8')).resolves.toContain('"status": "REPAIRED"');
  });

  it('repairs collector scoring reachability without changing genre', async () => {
    const raw = createCollectorRawDsl();
    raw.rules.collisions = [];
    const report = await service.repair({ projectId, runId, attempt: 1, rawDsl: raw, source: 'qa' });

    expect(report.status).toBe('REPAIRED');
    expect(report.repaired_dsl?.game.genre).toBe('collector');
    expect(report.repaired_dsl?.rules.collisions.some((collision) => collision.effects.some((effect) => effect.type === 'score_add'))).toBe(true);
  });

  it('fails closed outside the repair attempt range', async () => {
    const report = await service.repair({
      projectId,
      runId,
      attempt: MAX_REPAIR_ATTEMPTS + 1,
      rawDsl: createCollectorRawDsl(),
      source: 'validation'
    });

    expect(report).toMatchObject({ status: 'REPAIR_FAILED', attempts: [] });

    const zeroAttempt = await service.repair({ projectId, runId, attempt: 0, rawDsl: createCollectorRawDsl(), source: 'validation' });
    expect(zeroAttempt).toMatchObject({
      status: 'REPAIR_FAILED',
      message: `Repair attempt must be an integer between 1 and ${MAX_REPAIR_ATTEMPTS}.`
    });
  });

  it('rejects patches that try to modify protected paths', () => {
    const patch = DslPatchSchema.parse({
      patch_version: 'game-dsl-patch-v0.1',
      target_dsl_version: 'game-dsl-v0.1',
      reason: 'illegal genre change',
      changes: [{ op: 'replace', path: 'game.genre', value: 'collector' }]
    });

    expect(() => applyDslPatch(createShooterRawDsl(), patch)).toThrow('Repair patch cannot modify protected path: game.genre');
  });

  it('rejects prototype pollution patch paths', () => {
    const patch = DslPatchSchema.parse({
      patch_version: 'game-dsl-patch-v0.1',
      target_dsl_version: 'game-dsl-v0.1',
      reason: 'illegal prototype write',
      changes: [{ op: 'replace', path: '__proto__.polluted', value: true }]
    });

    expect(() => applyDslPatch(createShooterRawDsl(), patch)).toThrow('Repair patch cannot modify unsafe path segment: __proto__');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
