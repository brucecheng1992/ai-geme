import { describe, expect, it } from 'vitest';

import {
  buildSemanticIndex,
  createSemanticPatchApplier,
  hashSemanticPatchDocument,
  type SemanticEditIntent,
  type SemanticPatch,
  type SemanticPatchOperation
} from '../../packages/game-dsl/src/index.js';
import { createShooterRawDsl } from './fixtures.js';

describe('Semantic patch applier', () => {
  it('applies a valid proposed patch to a cloned document', () => {
    const document = createDocument();
    const patch = createPatchForDocument(document, [
      {
        op: 'set',
        path: '/scenes/main/entities/player/components/transform',
        value: { x: 160, y: 320 }
      }
    ]);

    const result = createSemanticPatchApplier().apply({
      document,
      patch,
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex()
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(`expected apply success, got ${result.error.code}`);
    }
    expect(getTransform(result.document)).toEqual({ x: 160, y: 320 });
    expect(getTransform(document)).toEqual({ x: 120, y: 300 });
    expect(result.beforeHash).toBe(patch.beforeHash);
    expect(result.afterHash).toBe(hashSemanticPatchDocument(result.document));
    expect(result.appliedPatch).toMatchObject({ status: 'applied', afterHash: result.afterHash });
    expect(result.rollbackPatch).toMatchObject({ status: 'proposed', beforeHash: result.afterHash });
    expect(result.rollbackPatch.afterHash).toBeUndefined();
  });

  it('rolls back an applied patch and returns a rolled_back lifecycle view', () => {
    const document = createDocument();
    const applier = createSemanticPatchApplier();
    const applyResult = applier.apply({
      document,
      patch: createPatchForDocument(document, [
        {
          op: 'set',
          path: '/scenes/main/entities/player/components/transform',
          value: { x: 160, y: 320 }
        }
      ]),
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex()
    });

    expect(applyResult.ok).toBe(true);
    if (!applyResult.ok) {
      throw new Error(`expected apply success, got ${applyResult.error.code}`);
    }

    const rollbackResult = applier.rollback({
      document: applyResult.document,
      appliedPatch: applyResult.appliedPatch,
      rollbackPatch: applyResult.rollbackPatch,
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex()
    });

    expect(rollbackResult.ok).toBe(true);
    if (!rollbackResult.ok) {
      throw new Error(`expected rollback success, got ${rollbackResult.error.code}`);
    }
    expect(rollbackResult.document).toEqual(document);
    expect(rollbackResult.appliedRollbackPatch.status).toBe('applied');
    expect(rollbackResult.appliedRollbackPatch.afterHash).toBe(applyResult.beforeHash);
    expect(rollbackResult.rolledBackPatch.status).toBe('rolled_back');
    expect(rollbackResult.rolledBackPatch.beforeHash).toBe(applyResult.beforeHash);
    expect(rollbackResult.rolledBackPatch.afterHash).toBe(applyResult.afterHash);
  });

  it('fails before applying when beforeHash does not match the current document', () => {
    const document = createDocument();
    const result = createSemanticPatchApplier().apply({
      document,
      patch: createPatchForDocument(document, [{ op: 'set', path: '/scenes/main/background', value: { type: 'solid' } }], {
        beforeHash: 'wrong_hash'
      }),
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex()
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'PATCH_BEFORE_HASH_MISMATCH' } });
    expect(document).toEqual(createDocument());
  });

  it('does not apply when validator rejects the patch', () => {
    const document = createDocument();
    const result = createSemanticPatchApplier().apply({
      document,
      patch: createPatchForDocument(document, [
        {
          op: 'set',
          path: '/scenes/main/phaser/create',
          value: {}
        }
      ]),
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex()
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected apply failure');
    }
    expect(result.error.code).toBe('PATCH_VALIDATION_FAILED');
    expect(result.error.validation?.errors.map((issue) => issue.code)).toContain('GENERATED_CODE_EDIT_FORBIDDEN');
    expect(document).toEqual(createDocument());
  });

  it('keeps operation failure atomic', () => {
    const document = createDocument();
    const result = createSemanticPatchApplier().apply({
      document,
      patch: createPatchForDocument(document, [
        { op: 'set', path: '/scenes/main/background', value: { type: 'solid' } },
        { op: 'replace', path: '/scenes/main/entities/missing', value: { id: 'missing' } }
      ]),
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex()
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_OPERATION_FAILED', operationIndex: 1 } });
    expect('document' in result).toBe(false);
    expect(document).toEqual(createDocument());
  });

  it('allows set to create a missing final key and rollback removes it', () => {
    const document = createDocument();
    const applier = createSemanticPatchApplier();
    const applyResult = applier.apply({
      document,
      patch: createPatchForDocument(document, [
        { op: 'set', path: '/scenes/main/background', value: { type: 'solid', visible: true } }
      ]),
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex()
    });

    expect(applyResult.ok).toBe(true);
    if (!applyResult.ok) {
      throw new Error(`expected apply success, got ${applyResult.error.code}`);
    }
    expect(getMainScene(applyResult.document).background).toEqual({ type: 'solid', visible: true });
    expect(applyResult.rollbackPatch.operations).toEqual([{ op: 'remove', path: '/scenes/main/background' }]);

    const rollbackResult = applier.rollback({
      document: applyResult.document,
      appliedPatch: applyResult.appliedPatch,
      rollbackPatch: applyResult.rollbackPatch,
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex()
    });

    expect(rollbackResult.ok).toBe(true);
    if (!rollbackResult.ok) {
      throw new Error(`expected rollback success, got ${rollbackResult.error.code}`);
    }
    expect(rollbackResult.document).toEqual(document);
  });

  it('rejects add when the final key already exists', () => {
    const document = createDocument();
    const result = createSemanticPatchApplier().apply({
      document,
      patch: createPatchForDocument(document, [{ op: 'add', path: '/scenes/main/entities/player', value: { id: 'player' } }]),
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex()
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_OPERATION_FAILED' } });
  });

  it('rejects replace when the final key is missing', () => {
    const document = createDocument();
    const result = createSemanticPatchApplier().apply({
      document,
      patch: createPatchForDocument(document, [{ op: 'replace', path: '/scenes/main/entities/missing', value: { id: 'missing' } }]),
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex()
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_OPERATION_FAILED' } });
  });

  it('captures removed values so rollback can add them back', () => {
    const document = createDocument();
    const applier = createSemanticPatchApplier();
    const applyResult = applier.apply({
      document,
      patch: createPatchForDocument(document, [{ op: 'remove', path: '/scenes/main/entities/player/components/transform' }]),
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex()
    });

    expect(applyResult.ok).toBe(true);
    if (!applyResult.ok) {
      throw new Error(`expected apply success, got ${applyResult.error.code}`);
    }
    expect('transform' in getPlayerComponents(applyResult.document)).toBe(false);
    expect(applyResult.rollbackPatch.operations).toEqual([
      { op: 'add', path: '/scenes/main/entities/player/components/transform', value: { x: 120, y: 300 } }
    ]);

    const rollbackResult = applier.rollback({
      document: applyResult.document,
      appliedPatch: applyResult.appliedPatch,
      rollbackPatch: applyResult.rollbackPatch,
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex()
    });

    expect(rollbackResult.ok).toBe(true);
    if (!rollbackResult.ok) {
      throw new Error(`expected rollback success, got ${rollbackResult.error.code}`);
    }
    expect(rollbackResult.document).toEqual(document);
  });

  it('does not mutate patch, intent, or semanticIndex', () => {
    const document = createDocument();
    const patch = createPatchForDocument(document, [{ op: 'set', path: '/scenes/main/background', value: { type: 'solid' } }]);
    const intent = createValidIntent();
    const semanticIndex = createSemanticIndex();
    const patchBefore = structuredClone(patch);
    const intentBefore = structuredClone(intent);
    const entryBefore = structuredClone(semanticIndex.resolve('entity:player'));

    const result = createSemanticPatchApplier().apply({ document, patch, intent, semanticIndex });

    expect(result.ok).toBe(true);
    expect(patch).toEqual(patchBefore);
    expect(intent).toEqual(intentBefore);
    expect(semanticIndex.resolve('entity:player')).toEqual(entryBefore);
  });

  it('deep-clones operation values into the result document', () => {
    const document = createDocument();
    const transform = { x: 160, y: 320 };
    const patch = createPatchForDocument(document, [
      {
        op: 'set',
        path: '/scenes/main/entities/player/components/transform',
        value: transform
      }
    ]);
    const result = createSemanticPatchApplier().apply({
      document,
      patch,
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex()
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(`expected apply success, got ${result.error.code}`);
    }
    getTransform(result.document).x = 999;

    expect(patch.operations[0]).toEqual({
      op: 'set',
      path: '/scenes/main/entities/player/components/transform',
      value: { x: 160, y: 320 }
    });
  });

  it('fails rollback when document hash no longer matches appliedPatch.afterHash', () => {
    const document = createDocument();
    const applier = createSemanticPatchApplier();
    const applyResult = applyTransformPatch(applier, document);
    const tamperedDocument = structuredClone(applyResult.document);
    getTransform(tamperedDocument).x = 999;

    const rollbackResult = applier.rollback({
      document: tamperedDocument,
      appliedPatch: applyResult.appliedPatch,
      rollbackPatch: applyResult.rollbackPatch,
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex()
    });

    expect(rollbackResult).toMatchObject({ ok: false, error: { code: 'ROLLBACK_DOCUMENT_HASH_MISMATCH' } });
  });

  it('fails rollback when rollbackPatch.beforeHash does not match appliedPatch.afterHash', () => {
    const document = createDocument();
    const applier = createSemanticPatchApplier();
    const applyResult = applyTransformPatch(applier, document);

    const rollbackResult = applier.rollback({
      document: applyResult.document,
      appliedPatch: applyResult.appliedPatch,
      rollbackPatch: { ...applyResult.rollbackPatch, beforeHash: 'wrong_hash' },
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex()
    });

    expect(rollbackResult).toMatchObject({ ok: false, error: { code: 'PATCH_BEFORE_HASH_MISMATCH' } });
  });

  it('fails rollback when rollback operations do not restore the original document hash', () => {
    const document = createDocument();
    const applier = createSemanticPatchApplier();
    const applyResult = applyTransformPatch(applier, document);

    const rollbackResult = applier.rollback({
      document: applyResult.document,
      appliedPatch: applyResult.appliedPatch,
      rollbackPatch: {
        ...applyResult.rollbackPatch,
        operations: [
          {
            op: 'set',
            path: '/scenes/main/entities/player/components/transform',
            value: { x: 180, y: 340 }
          }
        ]
      },
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex()
    });

    expect(rollbackResult).toMatchObject({ ok: false, error: { code: 'INVALID_ROLLBACK_PATCH' } });
  });

  it('rejects rollback patches that do not belong to the applied patch intent and target', () => {
    const document = createDocument();
    const applier = createSemanticPatchApplier();
    const applyResult = applyTransformPatch(applier, document);

    const rollbackResult = applier.rollback({
      document: applyResult.document,
      appliedPatch: applyResult.appliedPatch,
      rollbackPatch: {
        ...applyResult.rollbackPatch,
        intentId: 'edit_scene_001',
        target: 'scene:main'
      },
      intent: createValidIntent({
        id: 'edit_scene_001',
        target: 'scene:main'
      }),
      semanticIndex: createSemanticIndex()
    });

    expect(rollbackResult).toMatchObject({ ok: false, error: { code: 'INVALID_ROLLBACK_PATCH' } });
  });

  it('keeps rollback inverse operations in reverse success order', () => {
    const document = createDocument();
    const applier = createSemanticPatchApplier();
    const applyResult = applier.apply({
      document,
      patch: createPatchForDocument(document, [
        { op: 'set', path: '/scenes/main/background', value: { type: 'solid', visible: true } },
        {
          op: 'replace',
          path: '/scenes/main/entities/player/components/transform',
          value: { x: 160, y: 320 }
        }
      ]),
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex()
    });

    expect(applyResult.ok).toBe(true);
    if (!applyResult.ok) {
      throw new Error(`expected apply success, got ${applyResult.error.code}`);
    }
    expect(applyResult.rollbackPatch.operations).toEqual([
      {
        op: 'replace',
        path: '/scenes/main/entities/player/components/transform',
        value: { x: 120, y: 300 }
      },
      { op: 'remove', path: '/scenes/main/background' }
    ]);

    const rollbackResult = applier.rollback({
      document: applyResult.document,
      appliedPatch: applyResult.appliedPatch,
      rollbackPatch: applyResult.rollbackPatch,
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex()
    });

    expect(rollbackResult.ok).toBe(true);
    if (!rollbackResult.ok) {
      throw new Error(`expected rollback success, got ${rollbackResult.error.code}`);
    }
    expect(rollbackResult.document).toEqual(document);
  });

  it('returns a failure result for invalid documents without throwing', () => {
    const result = createSemanticPatchApplier().apply({
      document: { scenes: { main: () => undefined } },
      patch: createPatchForDocument(createDocument(), [{ op: 'set', path: '/scenes/main/background', value: { type: 'solid' } }]),
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex()
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected apply failure');
    }
    expect(['INVALID_SEMANTIC_PATCH_DOCUMENT', 'SEMANTIC_PATCH_OPERATION_FAILED']).toContain(result.error.code);
  });

  it('supports deterministic rollback id and time injection', () => {
    const document = createDocument();
    const result = createSemanticPatchApplier({
      now: () => new Date('2026-01-01T00:00:00.000Z'),
      createRollbackPatchId: () => 'semantic_rollback:test_001'
    }).apply({
      document,
      patch: createPatchForDocument(document, [{ op: 'set', path: '/scenes/main/background', value: { type: 'solid' } }]),
      intent: createValidIntent(),
      semanticIndex: createSemanticIndex()
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(`expected apply success, got ${result.error.code}`);
    }
    expect(result.rollbackPatch.id).toBe('semantic_rollback:test_001');
    expect(result.rollbackPatch.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('hashes object keys by code-unit order for cross-locale determinism', () => {
    expect(hashSemanticPatchDocument({ Z: 1, a: 2 })).toBe('semantic_hash:0t0tgqz');
  });
});

function createDocument() {
  return {
    scenes: {
      main: {
        entities: {
          player: {
            components: {
              transform: {
                x: 120,
                y: 300
              }
            }
          }
        }
      }
    }
  };
}

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

function createPatchForDocument(
  document: unknown,
  operations: SemanticPatchOperation[],
  overrides: Partial<SemanticPatch> = {}
): SemanticPatch {
  return {
    id: 'semantic_patch:edit_001',
    intentId: 'edit_001',
    target: 'entity:player',
    operations,
    beforeHash: hashSemanticPatchDocument(document),
    status: 'proposed',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

function applyTransformPatch(applier: ReturnType<typeof createSemanticPatchApplier>, document: ReturnType<typeof createDocument>) {
  const result = applier.apply({
    document,
    patch: createPatchForDocument(document, [
      {
        op: 'set',
        path: '/scenes/main/entities/player/components/transform',
        value: { x: 160, y: 320 }
      }
    ]),
    intent: createValidIntent(),
    semanticIndex: createSemanticIndex()
  });

  if (!result.ok) {
    throw new Error(`expected apply success, got ${result.error.code}`);
  }

  return result;
}

function getMainScene(document: unknown): { background?: unknown; entities: Record<string, unknown> } {
  return (document as ReturnType<typeof createDocument>).scenes.main;
}

function getPlayerComponents(document: unknown): Record<string, unknown> {
  const player = getMainScene(document).entities.player as { components: Record<string, unknown> };
  return player.components;
}

function getTransform(document: unknown): { x: number; y: number } {
  return getPlayerComponents(document).transform as { x: number; y: number };
}
