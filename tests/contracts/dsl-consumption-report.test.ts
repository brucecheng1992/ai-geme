import { describe, expect, it } from 'vitest';

import {
  DslConsumptionReportSchema,
  buildDslConsumptionReport,
  validateAndNormalizeRawGameDsl
} from '../../packages/game-dsl/src/index.js';
import { createCollectorRawDsl, createShooterRawDsl, createSideScrollingRunAndGunRawDsl } from './fixtures.js';

describe('Step 33 DSL consumption report', () => {
  it('records side-scrolling authoritative DSL paths without silent ignored content', () => {
    const rawDsl = createSideScrollingRunAndGunRawDsl();
    const normalized = validateAndNormalizeRawGameDsl(rawDsl);

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const report = buildDslConsumptionReport({
      projectId: 'proj_20260618_step33',
      runId: 'run_20260618_step33',
      rawDsl: normalized.rawDsl,
      ir: normalized.ir
    });

    expect(DslConsumptionReportSchema.parse(report)).toEqual(report);
    expect(report).toMatchObject({
      schemaVersion: 'step33.dsl-consumption.v1',
      projectId: 'proj_20260618_step33',
      runId: 'run_20260618_step33',
      runtimeProfile: 'side_scrolling_run_and_gun.v1',
      summary: {
        ignoredAuthoritativeCount: 0
      }
    });
    expect(report.dslHash).toMatch(/^fnv1a64:[0-9a-f]{16}$/);
    expect(report.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/world/visual_theme', status: 'consumed', authoritative: true }),
        expect.objectContaining({ path: '/level/terrain', status: 'compiled', outputRefs: ['runtime_plan.side_scrolling.platforms'] }),
        expect.objectContaining({ path: '/level/spawns', status: 'compiled', outputRefs: ['runtime_plan.side_scrolling.waves'] }),
        expect.objectContaining({ path: '/level/segments', status: 'deferred', authoritative: true }),
        expect.objectContaining({ path: '/metadata', status: 'ignored_non_authoritative', authoritative: false })
      ])
    );
    expect(report.summary.authoritativePathCount).toBeGreaterThan(0);
    expect(report.summary.coverageRatio).toBeLessThan(1);
  });

  it('makes optional unsupported visual/audio domains explicit instead of hiding them', () => {
    const rawDsl = {
      ...createSideScrollingRunAndGunRawDsl(),
      feedback: { cameraShake: { enabled: true, intensity: 0.5, durationMs: 200 } },
      audio: { events: { shoot: { volume: 0.8, enabled: true } } },
      effects: { explosion: { enabled: true, scale: 1, durationMs: 250 } }
    };
    const normalized = validateAndNormalizeRawGameDsl(rawDsl);

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const report = buildDslConsumptionReport({
      projectId: 'proj_20260618_step33_unsupported',
      runId: 'run_20260618_step33_unsupported',
      rawDsl: normalized.rawDsl,
      ir: normalized.ir
    });

    expect(report.summary.ignoredAuthoritativeCount).toBe(0);
    expect(report.summary.unsupportedCount).toBeGreaterThanOrEqual(3);
    expect(report.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/feedback', status: 'unsupported' }),
        expect.objectContaining({ path: '/audio', status: 'unsupported' }),
        expect.objectContaining({ path: '/effects', status: 'unsupported' })
      ])
    );
  });

  it('does not let a compiled parent path hide an unsupported authoritative child path', () => {
    const rawDsl = {
      ...createSideScrollingRunAndGunRawDsl(),
      player: {
        ...createSideScrollingRunAndGunRawDsl().player,
        invulnerabilityFrames: { durationMs: 1200, flashEnabled: true }
      }
    };
    const normalized = validateAndNormalizeRawGameDsl(rawDsl);

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const report = buildDslConsumptionReport({
      projectId: 'proj_20260618_step33_child',
      runId: 'run_20260618_step33_child',
      rawDsl: normalized.rawDsl,
      ir: normalized.ir
    });

    expect(report.summary.ignoredAuthoritativeCount).toBe(0);
    expect(report.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/player', status: 'compiled', authoritative: true }),
        expect.objectContaining({ path: '/player/invulnerabilityFrames', status: 'unsupported', authoritative: true }),
        expect.objectContaining({ path: '/player/invulnerabilityFrames/durationMs', status: 'unsupported', authoritative: true }),
        expect.objectContaining({ path: '/player/invulnerabilityFrames/flashEnabled', status: 'unsupported', authoritative: true }),
        expect.objectContaining({ path: '/entities/1/count', status: 'unsupported', authoritative: true })
      ])
    );
  });

  it('does not let player action parent paths hide unsupported action fields', () => {
    const base = createCollectorRawDsl();
    const rawDsl = {
      ...base,
      player: {
        ...base.player,
        actions: [{ ...base.player.actions[0], cooldown_ms: 250 }]
      }
    };
    const normalized = validateAndNormalizeRawGameDsl(rawDsl);

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const report = buildDslConsumptionReport({
      projectId: 'proj_20260618_step33_player_action',
      runId: 'run_20260618_step33_player_action',
      rawDsl: normalized.rawDsl,
      ir: normalized.ir
    });

    expect(report.summary.ignoredAuthoritativeCount).toBe(0);
    expect(report.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/player/actions', status: 'compiled', authoritative: true }),
        expect.objectContaining({ path: '/player/actions/0', status: 'compiled', authoritative: true }),
        expect.objectContaining({ path: '/player/actions/0/id', status: 'consumed', authoritative: true }),
        expect.objectContaining({ path: '/player/actions/0/type', status: 'compiled', authoritative: true }),
        expect.objectContaining({ path: '/player/actions/0/cooldown_ms', status: 'unsupported', authoritative: true })
      ])
    );
  });

  it('surfaces default weapon runtime consumer evidence and normalized M3 weapon evidence in target profile support', () => {
    const normalized = validateAndNormalizeRawGameDsl(createSideScrollingRunAndGunRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const report = buildDslConsumptionReport({
      projectId: 'proj_20260625_m3_weapon_support',
      runId: 'run_20260625_m3_weapon_support',
      rawDsl: normalized.rawDsl,
      ir: normalized.ir
    });
    const capabilities = new Map(report.targetProfileSupport?.capabilities.map((capability) => [capability.capabilityId, capability]));

    expect(report.targetProfileSupport).toMatchObject({
      requiredCapabilityCount: 59,
      registeredCapabilityCount: 18,
      completeSupportedCount: 0,
      completePackageClosure: {
        status: 'blocked_incomplete_target_profile',
        exactLockAllowed: false,
        incompleteCapabilityIds: expect.arrayContaining(['weapon.default_straight_single.v1']),
        blockers: [
          'complete_package_closure_incomplete',
          'complete_supported_count:0/59',
          'stage5_exact_lock_blocked'
        ]
      }
    });
    expect(capabilities.get('weapon.default_straight_single.v1')).toMatchObject({
      classification: 'DEFERRED',
      completeSupported: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
    expect(capabilities.get('weapon.spread_shot.v1')).toMatchObject({
      classification: 'DEFERRED',
      completeSupported: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
    expect(capabilities.get('weapon.rapid_fire.v1')).toMatchObject({
      classification: 'DEFERRED',
      completeSupported: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
    expect(capabilities.get('weapon.replacement_rule.v1')).toMatchObject({
      classification: 'DEFERRED',
      completeSupported: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
  });

  it('parses older target profile support reports without prerequisite blockers', () => {
    const normalized = validateAndNormalizeRawGameDsl(createSideScrollingRunAndGunRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const report = buildDslConsumptionReport({
      projectId: 'proj_20260625_legacy_prerequisites',
      runId: 'run_20260625_legacy_prerequisites',
      rawDsl: normalized.rawDsl,
      ir: normalized.ir
    });
    const legacyReport = {
      ...report,
      targetProfileSupport: {
        ...report.targetProfileSupport,
        capabilities: report.targetProfileSupport?.capabilities.map(({ missingSupportEvidencePrerequisites: _omitted, ...capability }) => capability)
      }
    };

    const parsed = DslConsumptionReportSchema.parse(legacyReport);
    const weapon = parsed.targetProfileSupport?.capabilities.find((capability) => capability.capabilityId === 'weapon.default_straight_single.v1');
    expect(weapon?.missingSupportEvidencePrerequisites).toEqual([]);
  });

  it('does not point non-side-scrolling world gravity to side-scrolling runtime refs', () => {
    const base = createShooterRawDsl();
    const rawDsl = {
      ...base,
      world: {
        ...base.world,
        gravity: 800
      },
      entities: [base.entities[0], { ...base.entities[1], damage: 2 }],
      rules: {
        collisions: [
          {
            ...base.rules.collisions[0],
            effects: [...base.rules.collisions[0].effects, { type: 'heal' as const, value: 1 }]
          }
        ]
      }
    };
    const normalized = validateAndNormalizeRawGameDsl(rawDsl);

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const report = buildDslConsumptionReport({
      projectId: 'proj_20260618_step33_gravity',
      runId: 'run_20260618_step33_gravity',
      rawDsl: normalized.rawDsl,
      ir: normalized.ir
    });

    const gravityEntry = report.entries.find((entry) => entry.path === '/world/gravity');
    expect(gravityEntry).toMatchObject({
      path: '/world/gravity',
      status: 'unsupported',
      authoritative: true
    });
    expect(JSON.stringify(gravityEntry)).not.toContain('runtime_plan.side_scrolling');
    expect(report.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/entities/1/damage', status: 'unsupported', authoritative: true }),
        expect.objectContaining({ path: '/rules/collisions/0/effects/3/type', status: 'unsupported', authoritative: true })
      ])
    );
  });
});
