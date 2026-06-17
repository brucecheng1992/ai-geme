import { describe, expect, it } from 'vitest';

import {
  buildSemanticIndex,
  createLiveSemanticEditHandlers,
  createSemanticPatchApplier,
  createSemanticPatchPlanner,
  hashSemanticPatchDocument,
  type SemanticEditIntent,
  type SemanticPatch
} from '../../packages/game-dsl/src/index.js';
import { createShooterRawDsl } from './fixtures.js';

describe('Live semantic editing collision rule effects', () => {
  it('plans and applies a modify_rule patch for existing collision effects', () => {
    const document = createShooterRawDsl();
    const before = structuredClone(document);
    const semanticIndex = buildSemanticIndex(document);
    const intent = createModifyRuleIntent({
      effects: [
        { type: 'damage', value: 2 },
        { type: 'knockback', value: 120 },
        { type: 'score_add', value: 5 }
      ]
    });

    const plan = createSemanticPatchPlanner(createLiveSemanticEditHandlers({ document })).plan({
      intent,
      semanticIndex,
      beforeHash: hashSemanticPatchDocument(document),
      now: () => new Date('2026-01-01T00:00:00.000Z'),
      createPatchId: () => 'semantic_patch:modify_rule:collision_effects'
    });

    if (!plan.ok) {
      const cause = plan.error.cause instanceof Error ? `: ${plan.error.cause.message}` : '';
      throw new Error(`expected modify_rule plan success, got ${plan.error.code}${cause}`);
    }
    expect(plan.ok).toBe(true);
    expect(plan.patch).toMatchObject({
      id: 'semantic_patch:modify_rule:collision_effects',
      intentId: intent.id,
      target: 'rule:bolt_hits_alien',
      status: 'proposed'
    });
    expect(plan.patch.operations).toEqual([
      {
        op: 'set',
        path: '/rules/collisions/0/effects',
        value: [
          { type: 'damage', value: 2 },
          { type: 'knockback', value: 120 },
          { type: 'score_add', value: 5 }
        ]
      }
    ]);

    const apply = createSemanticPatchApplier().apply({
      document,
      patch: plan.patch,
      intent,
      semanticIndex
    });

    expect(apply.ok).toBe(true);
    if (!apply.ok) {
      throw new Error(`expected modify_rule apply success, got ${apply.error.code}`);
    }
    const edited = apply.document as typeof document;
    expect(edited.rules.collisions[0].effects).toEqual([
      { type: 'damage', value: 2 },
      { type: 'knockback', value: 120 },
      { type: 'score_add', value: 5 }
    ]);
    expect(document).toEqual(before);
  });

  it('rejects non-collision targets and unsupported feedback effect payloads', () => {
    const document = createShooterRawDsl();
    const semanticIndex = buildSemanticIndex(document);
    const planner = createSemanticPatchPlanner(createLiveSemanticEditHandlers({ document }));

    expect(
      planner.plan({
        intent: createModifyRuleIntent({ target: 'entity:player', effects: [{ type: 'damage', value: 1 }] }),
        semanticIndex,
        beforeHash: hashSemanticPatchDocument(document)
      })
    ).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });

    expect(
      planner.plan({
        intent: createModifyRuleIntent({ effects: [{ type: 'camera_shake', value: 1 }] }),
        semanticIndex,
        beforeHash: hashSemanticPatchDocument(document)
      })
    ).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });

    expect(
      planner.plan({
        intent: createModifyRuleIntent({ effects: [{ type: 'damage', value: 1001 }] }),
        semanticIndex,
        beforeHash: hashSemanticPatchDocument(document)
      })
    ).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });

    expect(
      planner.plan({
        intent: createModifyRuleIntent({ effects: [{ type: 'damage', value: 1, cameraShake: true }] }),
        semanticIndex,
        beforeHash: hashSemanticPatchDocument(document)
      })
    ).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });
  });

  it('does not allow semantic patch apply to replace a rule array element directly', () => {
    const document = createShooterRawDsl();
    const intent = createModifyRuleIntent({ effects: [{ type: 'damage', value: 2 }] });
    const result = createSemanticPatchApplier().apply({
      document,
      intent,
      semanticIndex: buildSemanticIndex(document),
      patch: createPatchForDocument(document, {
        target: intent.target,
        intentId: intent.id,
        operations: [
          {
            op: 'set',
            path: '/rules/collisions/0',
            value: {
              id: 'bolt_hits_alien',
              source: 'bolt',
              target: 'alien',
              type: 'projectile_hit',
              effects: [{ type: 'damage', value: 2 }]
            }
          }
        ]
      })
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_OPERATION_FAILED' } });
  });
});

function createModifyRuleIntent(overrides: {
  target?: SemanticEditIntent['target'];
  effects: unknown;
}): SemanticEditIntent {
  return {
    id: 'edit_modify_rule_collision_effects',
    kind: 'modify_rule',
    target: overrides.target ?? 'rule:bolt_hits_alien',
    reason: {
      source: 'workbench',
      message: 'Modify collision rule effects.'
    },
    payload: {
      effects: overrides.effects
    },
    constraints: {
      noGeneratedCodeEdit: true
    }
  };
}

function createPatchForDocument(
  document: unknown,
  overrides: Pick<SemanticPatch, 'target' | 'intentId' | 'operations'>
): SemanticPatch {
  return {
    id: 'semantic_patch:direct_rule_element_write',
    beforeHash: hashSemanticPatchDocument(document),
    status: 'proposed',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}
