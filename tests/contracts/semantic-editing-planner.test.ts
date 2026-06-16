import { describe, expect, it } from 'vitest';

import {
  buildSemanticIndex,
  createSemanticPatchPlanner,
  type SemanticEditIntent,
  type SemanticPatchOperation
} from '../../packages/game-dsl/src/index.js';
import { createShooterRawDsl } from './fixtures.js';

describe('Semantic patch planner', () => {
  it('returns INVALID_SEMANTIC_EDIT_INTENT for invalid intent without calling handlers', () => {
    let handlerCalled = false;
    const result = createSemanticPatchPlanner({
      move_entity: () => {
        handlerCalled = true;
        return validOperations();
      }
    }).plan({ intent: { id: 'edit_001' }, semanticIndex: createSemanticIndex(), beforeHash: 'hash_before_001' });

    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_SEMANTIC_EDIT_INTENT' } });
    expect(handlerCalled).toBe(false);
  });

  it('returns SEMANTIC_TARGET_NOT_FOUND without calling handlers when target is missing', () => {
    let handlerCalled = false;
    const result = createSemanticPatchPlanner({
      move_entity: () => {
        handlerCalled = true;
        return validOperations();
      }
    }).plan({
      intent: createValidIntent({ target: 'entity:missing' }),
      semanticIndex: createSemanticIndex(),
      beforeHash: 'hash_before_001'
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'SEMANTIC_TARGET_NOT_FOUND' } });
    expect(handlerCalled).toBe(false);
  });

  it('returns UNSUPPORTED_SEMANTIC_EDIT_KIND without creating an empty patch', () => {
    const result = createSemanticPatchPlanner().plan({
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex(),
      beforeHash: 'hash_before_001'
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED_SEMANTIC_EDIT_KIND' } });
    expect('patch' in result).toBe(false);
  });

  it('returns EMPTY_SEMANTIC_PATCH_OPERATIONS when handler returns no operations', () => {
    const result = createSemanticPatchPlanner({ move_entity: () => [] }).plan({
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex(),
      beforeHash: 'hash_before_001'
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'EMPTY_SEMANTIC_PATCH_OPERATIONS' } });
    expect('patch' in result).toBe(false);
  });

  it('converts handler throws to SEMANTIC_PATCH_HANDLER_EXCEPTION', () => {
    const result = createSemanticPatchPlanner({
      move_entity: () => {
        throw new Error('boom');
      }
    }).plan({ intent: createValidIntent(), semanticIndex: createSemanticIndex(), beforeHash: 'hash_before_001' });

    expect(result).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });
    expect('patch' in result).toBe(false);
  });

  it('generates a deterministic proposed patch from handler operations', () => {
    const intent = createValidIntent();
    const result = createSemanticPatchPlanner({ move_entity: () => validOperations() }).plan({
      intent,
      semanticIndex: createSemanticIndex(),
      beforeHash: 'hash_before_001',
      now: () => new Date('2026-01-01T00:00:00.000Z'),
      createPatchId: () => 'semantic_patch:test_001'
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected planner to return a patch');
    }
    expect(result.patch).toMatchObject({
      id: 'semantic_patch:test_001',
      intentId: intent.id,
      target: intent.target,
      beforeHash: 'hash_before_001',
      status: 'proposed',
      createdAt: '2026-01-01T00:00:00.000Z'
    });
    expect(result.patch.afterHash).toBeUndefined();
    expect(result.patch.operations).toHaveLength(1);
  });

  it('does not mutate intent', () => {
    const intent = createValidIntent();
    const before = structuredClone(intent);

    createSemanticPatchPlanner({ move_entity: () => validOperations() }).plan({
      intent,
      semanticIndex: createSemanticIndex(),
      beforeHash: 'hash_before_001'
    });

    expect(intent).toEqual(before);
  });

  it('does not mutate semanticIndex entries', () => {
    const semanticIndex = createSemanticIndex();
    const before = structuredClone(semanticIndex.resolve('entity:player'));

    createSemanticPatchPlanner({ move_entity: () => validOperations() }).plan({
      intent: createValidIntent(),
      semanticIndex,
      beforeHash: 'hash_before_001'
    });

    expect(semanticIndex.resolve('entity:player')).toEqual(before);
  });

  it('does not expose mutable semanticIndex entries to handlers', () => {
    const semanticIndex = createSemanticIndex();
    const before = structuredClone(semanticIndex.resolve('entity:player'));

    const result = createSemanticPatchPlanner({
      move_entity: ({ target }) => {
        (target.value as { label: string }).label = 'Mutated';
        return validOperations();
      }
    }).plan({ intent: createValidIntent(), semanticIndex, beforeHash: 'hash_before_001' });

    expect(result).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });
    expect(semanticIndex.resolve('entity:player')).toEqual(before);
  });

  it('passes the resolved semantic target to handlers', () => {
    const semanticIndex = createSemanticIndex();
    const expectedTarget = semanticIndex.resolve('entity:player');
    const seenTargets: Array<{ id: string; kind: string; path: string }> = [];

    createSemanticPatchPlanner({
      move_entity: ({ target }) => {
        seenTargets.push({ id: target.id, kind: target.kind, path: target.path });
        return validOperations();
      }
    }).plan({ intent: createValidIntent(), semanticIndex, beforeHash: 'hash_before_001' });

    expect(seenTargets).toEqual([{ id: expectedTarget?.id, kind: expectedTarget?.kind, path: expectedTarget?.path }]);
  });

  it('returns INVALID_SEMANTIC_PATCH when handler operations fail SemanticPatchSchema', () => {
    const result = createSemanticPatchPlanner({
      move_entity: () => [{ op: 'set', path: '', value: { x: 160, y: 320 } }]
    }).plan({ intent: createValidIntent(), semanticIndex: createSemanticIndex(), beforeHash: 'hash_before_001' });

    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_SEMANTIC_PATCH' } });
  });

  it('returns INVALID_SEMANTIC_PATCH when handler returns a non-array value', () => {
    const result = createSemanticPatchPlanner({
      move_entity: () => undefined as unknown as SemanticPatchOperation[]
    }).plan({ intent: createValidIntent(), semanticIndex: createSemanticIndex(), beforeHash: 'hash_before_001' });

    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_SEMANTIC_PATCH' } });
  });
});

function createSemanticIndex() {
  return buildSemanticIndex(createShooterRawDsl());
}

function createValidIntent(overrides: Partial<SemanticEditIntent> = {}): SemanticEditIntent {
  return {
    id: 'edit_001',
    kind: 'move_entity',
    target: 'entity:player',
    reason: {
      source: 'user',
      message: 'Move player to visible spawn.'
    },
    payload: {
      x: 160,
      y: 320
    },
    constraints: {
      noGeneratedCodeEdit: true
    },
    ...overrides
  };
}

function validOperations(): SemanticPatchOperation[] {
  return [
    {
      op: 'set',
      path: '/scenes/main/entities/player/components/transform',
      value: {
        x: 160,
        y: 320
      }
    }
  ];
}
