import { describe, expect, it } from 'vitest';

import {
  buildSemanticIndex,
  createLiveSemanticEditHandlers,
  createSemanticPatchApplier,
  createSemanticPatchPlanner,
  hashSemanticPatchDocument,
  validateRawGameDsl,
  type RawGameDsl,
  type SemanticEditIntent
} from '../../packages/game-dsl/src/index.js';
import { createSideScrollingRunAndGunRawDsl } from './fixtures.js';

describe('Live semantic editing boss configuration', () => {
  it('plans and applies a configure_boss patch without mutating the input Raw DSL', () => {
    const document = createBossRawDsl();
    const before = structuredClone(document);
    const semanticIndex = buildSemanticIndex(document);
    expect(semanticIndex.resolve('entity:boss_alpha')).toMatchObject({ kind: 'entity', path: '/bosses/items/0' });

    const intent = createConfigureBossIntent({
      health: 42,
      healthBar: { enabled: true },
      phases: [
        { healthThresholdPct: 100, attacks: ['spread_shot'] },
        { healthThresholdPct: 40, attacks: ['charge', 'ground_slam'] }
      ],
      intro: { warningEnabled: true, warningText: 'WARNING', audioEvent: 'bossIntro' },
      defeat: { explosionEffect: true, audioEvent: 'bossDefeated' }
    });

    const plan = createSemanticPatchPlanner(createLiveSemanticEditHandlers({ document })).plan({
      intent,
      semanticIndex,
      beforeHash: hashSemanticPatchDocument(document),
      now: () => new Date('2026-01-01T00:00:00.000Z'),
      createPatchId: () => 'semantic_patch:configure_boss'
    });

    if (!plan.ok) {
      const cause = plan.error.cause instanceof Error ? `: ${plan.error.cause.message}` : '';
      throw new Error(`expected configure_boss plan success, got ${plan.error.code}${cause}`);
    }
    expect(plan.patch).toMatchObject({
      id: 'semantic_patch:configure_boss',
      intentId: intent.id,
      target: 'entity:boss_alpha',
      status: 'proposed'
    });
    expect(plan.patch.operations.map((operation) => operation.path)).toEqual([
      '/bosses/items/0/health',
      '/bosses/items/0/healthBar/enabled',
      '/bosses/items/0/phases',
      '/bosses/items/0/intro/warningEnabled',
      '/bosses/items/0/intro/warningText',
      '/bosses/items/0/intro/audioEvent',
      '/bosses/items/0/defeat/explosionEffect',
      '/bosses/items/0/defeat/audioEvent'
    ]);

    const apply = createSemanticPatchApplier().apply({
      document,
      patch: plan.patch,
      intent,
      semanticIndex
    });

    expect(apply.ok).toBe(true);
    if (!apply.ok) {
      throw new Error(`expected configure_boss apply success, got ${apply.error.code}`);
    }

    const edited = apply.document as RawGameDsl;
    expect(validateRawGameDsl(edited).ok).toBe(true);
    expect(edited.bosses?.items[0]).toMatchObject({
      health: 42,
      healthBar: { enabled: true },
      intro: { warningEnabled: true, warningText: 'WARNING', audioEvent: 'bossIntro' },
      defeat: { explosionEffect: true, audioEvent: 'bossDefeated' }
    });
    expect(edited.bosses?.items[0]?.phases).toEqual([
      { healthThresholdPct: 100, attacks: ['spread_shot'] },
      { healthThresholdPct: 40, attacks: ['charge', 'ground_slam'] }
    ]);
    expect(document).toEqual(before);
  });

  it('rejects unsafe configure_boss targets and payloads', () => {
    const document = createBossRawDsl();
    const semanticIndex = buildSemanticIndex(document);
    const planner = createSemanticPatchPlanner(createLiveSemanticEditHandlers({ document }));

    expect(
      planner.plan({
        intent: createConfigureBossIntent({ health: 30 }, { target: 'entity:player' }),
        semanticIndex,
        beforeHash: hashSemanticPatchDocument(document)
      })
    ).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });

    expect(
      planner.plan({
        intent: createConfigureBossIntent({}),
        semanticIndex,
        beforeHash: hashSemanticPatchDocument(document)
      })
    ).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });

    expect(
      planner.plan({
        intent: createConfigureBossIntent({ health: 0 }),
        semanticIndex,
        beforeHash: hashSemanticPatchDocument(document)
      })
    ).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });

    expect(
      planner.plan({
        intent: createConfigureBossIntent({
          phases: [{ healthThresholdPct: 100, attacks: ['teleport_script'] }]
        }),
        semanticIndex,
        beforeHash: hashSemanticPatchDocument(document)
      })
    ).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });

    expect(
      planner.plan({
        intent: createConfigureBossIntent({
          phases: [{ healthThresholdPct: 100, attacks: ['spread_shot', 'spread_shot'] }]
        }),
        semanticIndex,
        beforeHash: hashSemanticPatchDocument(document)
      })
    ).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });

    expect(
      planner.plan({
        intent: createConfigureBossIntent({ health: 30, script: true }),
        semanticIndex,
        beforeHash: hashSemanticPatchDocument(document)
      })
    ).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });

    expect(
      planner.plan({
        intent: createConfigureBossIntent({ healthBar: { enabled: true, style: 'large' } }),
        semanticIndex,
        beforeHash: hashSemanticPatchDocument(document)
      })
    ).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });
  });
});

function createBossRawDsl(): RawGameDsl {
  const rawDsl = {
    ...createSideScrollingRunAndGunRawDsl(),
    bosses: {
      items: [
        {
          id: 'boss_alpha',
          label: 'Sentinel Boss',
          health: 30,
          movement: { type: 'patrol', speed_px_per_sec: 80 },
          healthBar: { enabled: false },
          phases: [{ healthThresholdPct: 100, attacks: ['spread_shot'] }],
          intro: { warningEnabled: false },
          defeat: { explosionEffect: false }
        }
      ]
    }
  };
  const validated = validateRawGameDsl(rawDsl);
  if (!validated.ok) {
    throw new Error(`expected boss fixture to validate: ${validated.issues.map((issue) => issue.message).join(', ')}`);
  }
  return validated.value;
}

function createConfigureBossIntent(
  payload: Record<string, unknown>,
  overrides: Partial<SemanticEditIntent> = {}
): SemanticEditIntent {
  return {
    id: 'edit_configure_boss',
    kind: 'configure_boss',
    target: 'entity:boss_alpha',
    reason: {
      source: 'workbench',
      message: 'Configure boss semantics.'
    },
    payload,
    constraints: {
      noGeneratedCodeEdit: true
    },
    ...overrides
  };
}
