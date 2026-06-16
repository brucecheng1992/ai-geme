import { describe, expect, it } from 'vitest';

import {
  buildSemanticIndex,
  createSemanticPatchValidator,
  defaultSemanticPatchGuards,
  type SemanticEditIntent,
  type SemanticPatch,
  type SemanticPatchGuard,
  type SemanticPatchValidationIssueCode
} from '../../packages/game-dsl/src/index.js';
import { createShooterRawDsl } from './fixtures.js';

describe('Semantic patch validator', () => {
  it('accepts a valid proposed patch without mutating patch, intent, or semanticIndex', () => {
    const validator = createSemanticPatchValidator();
    const intent = createValidIntent();
    const patch = createValidPatch();
    const semanticIndex = createSemanticIndex();
    const beforeIntent = structuredClone(intent);
    const beforePatch = structuredClone(patch);
    const beforeEntry = structuredClone(semanticIndex.resolve('entity:player'));

    const result = validator.validate({ intent, patch, semanticIndex });

    expect(result).toEqual({ ok: true, errors: [], warnings: [] });
    expect(intent).toEqual(beforeIntent);
    expect(patch).toEqual(beforePatch);
    expect(semanticIndex.resolve('entity:player')).toEqual(beforeEntry);
    expect(patch.status).toBe('proposed');
    expect(patch.afterHash).toBeUndefined();
  });

  it('passes read-only SemanticIndex entry snapshots to custom guards', () => {
    const semanticIndex = createSemanticIndex();
    const beforeEntry = structuredClone(semanticIndex.resolve('entity:player'));

    const result = createSemanticPatchValidator({
      includeDefaultGuards: false,
      guards: [
        {
          id: 'mutating-index-guard',
          validate: ({ semanticIndex }) => {
            const entry = semanticIndex.resolve('entity:player');
            (entry?.value as { id: string }).id = 'mutated-player';
            return [];
          }
        }
      ]
    }).validate({ intent: createValidIntent(), patch: createValidPatch(), semanticIndex });

    expect(errorCodes(result)).toContain('GUARD_EXCEPTION');
    expect(semanticIndex.resolve('entity:player')).toEqual(beforeEntry);
  });

  it('returns INVALID_SEMANTIC_EDIT_INTENT_SCHEMA for invalid intent and skips guards', () => {
    const result = createSemanticPatchValidator({ guards: [throwingGuard()] }).validate({
      intent: { id: 'edit_001' },
      patch: createValidPatch(),
      semanticIndex: createSemanticIndex()
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('INVALID_SEMANTIC_EDIT_INTENT_SCHEMA');
    expect(result.warnings).toEqual([]);
    expect(errorCodes(result)).not.toContain('GUARD_EXCEPTION');
  });

  it('returns INVALID_SEMANTIC_EDIT_INTENT_SCHEMA when intent contains non-cloneable payload values', () => {
    const result = createSemanticPatchValidator({ guards: [throwingGuard()] }).validate({
      intent: createValidIntent({ payload: { callback: () => undefined } }),
      patch: createValidPatch(),
      semanticIndex: createSemanticIndex()
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('INVALID_SEMANTIC_EDIT_INTENT_SCHEMA');
    expect(errorCodes(result)).not.toContain('GUARD_EXCEPTION');
  });

  it('returns INVALID_SEMANTIC_PATCH_SCHEMA for invalid patch and skips guards', () => {
    const result = createSemanticPatchValidator({ guards: [throwingGuard()] }).validate({
      intent: createValidIntent(),
      patch: { id: 'patch_001' },
      semanticIndex: createSemanticIndex()
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('INVALID_SEMANTIC_PATCH_SCHEMA');
    expect(result.warnings).toEqual([]);
    expect(errorCodes(result)).not.toContain('GUARD_EXCEPTION');
  });

  it('returns INVALID_SEMANTIC_PATCH_SCHEMA when patch contains non-cloneable operation values', () => {
    const result = createSemanticPatchValidator({ guards: [throwingGuard()] }).validate({
      intent: createValidIntent(),
      patch: createValidPatch({ operations: [{ op: 'set', path: '/scenes/main/spawn', value: () => undefined }] }),
      semanticIndex: createSemanticIndex()
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('INVALID_SEMANTIC_PATCH_SCHEMA');
    expect(errorCodes(result)).not.toContain('GUARD_EXCEPTION');
  });

  it('rejects missing semantic patch targets without fallback lookup', () => {
    const result = validatePatch(createValidPatch({ target: 'entity:missing' }));

    expect(errorCodes(result)).toContain('SEMANTIC_PATCH_TARGET_NOT_FOUND');
  });

  it('rejects patch intentId mismatch', () => {
    const result = validatePatch(createValidPatch({ intentId: 'edit_other' }));

    expect(errorCodes(result)).toContain('PATCH_INTENT_MISMATCH');
  });

  it('rejects patch target mismatch when both targets exist', () => {
    const result = createSemanticPatchValidator().validate({
      intent: createValidIntent({ target: 'entity:player' }),
      patch: createValidPatch({ target: 'scene:main' }),
      semanticIndex: createSemanticIndex()
    });

    expect(errorCodes(result)).toContain('PATCH_TARGET_MISMATCH');
  });

  it('lets schema reject empty traceability reasons before guards run', () => {
    const result = createSemanticPatchValidator().validate({
      intent: createValidIntent({ reason: { source: 'user', message: '' } }),
      patch: createValidPatch(),
      semanticIndex: createSemanticIndex()
    });

    expect(result.errors[0]?.code).toBe('INVALID_SEMANTIC_EDIT_INTENT_SCHEMA');
    expect(errorCodes(result)).not.toContain('MISSING_TRACEABILITY_REASON');
  });

  it('rejects whitespace-only traceability reasons in the guard phase', () => {
    const result = createSemanticPatchValidator().validate({
      intent: createValidIntent({ reason: { source: 'user', message: '   ' } }),
      patch: createValidPatch(),
      semanticIndex: createSemanticIndex()
    });

    expect(errorCodes(result)).toContain('MISSING_TRACEABILITY_REASON');
  });

  it('rejects non-proposed lifecycle status', () => {
    const result = validatePatch(createValidPatch({ status: 'applied' }));

    expect(errorCodes(result)).toContain('PATCH_STATUS_NOT_PROPOSED');
  });

  it('rejects afterHash before apply', () => {
    const result = validatePatch(createValidPatch({ afterHash: 'hash_after_001' }));

    expect(errorCodes(result)).toContain('PATCH_AFTER_HASH_SET_BEFORE_APPLY');
  });

  it('rejects invalid semantic operation paths not already covered by patch schema', () => {
    const result = validatePatch(createValidPatch({ operations: [{ op: 'set', path: '/scenes//main', value: { x: 160 } }] }));

    expect(errorCodes(result)).toContain('INVALID_SEMANTIC_OPERATION_PATH');
  });

  it('rejects generated code path segments', () => {
    const result = validatePatch(createValidPatch({ operations: [{ op: 'set', path: '/scenes/main/phaser/create', value: {} }] }));

    expect(errorCodes(result)).toContain('GENERATED_CODE_EDIT_FORBIDDEN');
  });

  it('does not reject asset file paths inside operation values', () => {
    const result = validatePatch(createValidPatch({ operations: [{ op: 'set', path: '/assets/player/source', value: './assets/player.png' }] }));

    expect(result.ok).toBe(true);
    expect(errorCodes(result)).not.toContain('GENERATED_CODE_EDIT_FORBIDDEN');
  });

  it('keeps custom warning guards non-blocking', () => {
    const result = validateWithCustomGuard({
      id: 'test-warning',
      validate: () => [{ severity: 'warning', code: 'CUSTOM_WARNING', message: 'test warning' }]
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings.map((issue) => issue.code)).toEqual(['CUSTOM_WARNING']);
  });

  it('blocks validation on custom error guards', () => {
    const result = validateWithCustomGuard({
      id: 'test-error',
      validate: () => [{ severity: 'error', code: 'CUSTOM_ERROR', message: 'test error' }]
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toEqual(['CUSTOM_ERROR']);
  });

  it('converts guard throws to GUARD_EXCEPTION issues and keeps collecting later guards', () => {
    const result = createSemanticPatchValidator({
      includeDefaultGuards: false,
      guards: [
        throwingGuard(),
        { id: 'guard-after-throw', validate: () => [{ severity: 'warning', code: 'AFTER_THROW', message: 'after throw' }] }
      ]
    }).validate({ intent: createValidIntent(), patch: createValidPatch(), semanticIndex: createSemanticIndex() });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatchObject({ code: 'GUARD_EXCEPTION', guardId: 'throwing-guard' });
    expect(result.warnings.map((issue) => issue.code)).toEqual(['AFTER_THROW']);
  });

  it('keeps custom guard execution order deterministic', () => {
    const result = createSemanticPatchValidator({
      includeDefaultGuards: false,
      guards: [
        { id: 'guard-a', validate: () => [{ severity: 'warning', code: 'A', message: 'a' }] },
        { id: 'guard-b', validate: () => [{ severity: 'warning', code: 'B', message: 'b' }] }
      ]
    }).validate({ intent: createValidIntent(), patch: createValidPatch(), semanticIndex: createSemanticIndex() });

    expect(result.warnings.map((issue) => issue.code)).toEqual(['A', 'B']);
  });

  it('keeps the exported default guard list immutable and ordered', () => {
    expect(Object.isFrozen(defaultSemanticPatchGuards)).toBe(true);
    expect(defaultSemanticPatchGuards.map((guard) => guard.id)).toEqual([
      'semantic-target-exists',
      'semantic-traceability',
      'semantic-patch-lifecycle',
      'semantic-operation-path',
      'no-generated-code-edit'
    ]);
  });
});

function validatePatch(patch: SemanticPatch) {
  return createSemanticPatchValidator().validate({ intent: createValidIntent({ target: patch.target }), patch, semanticIndex: createSemanticIndex() });
}

function validateWithCustomGuard(guard: SemanticPatchGuard) {
  return createSemanticPatchValidator({ includeDefaultGuards: false, guards: [guard] }).validate({
    intent: createValidIntent(),
    patch: createValidPatch(),
    semanticIndex: createSemanticIndex()
  });
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

function createValidPatch(overrides: Partial<SemanticPatch> = {}): SemanticPatch {
  return {
    id: 'patch_edit_001',
    intentId: 'edit_001',
    target: 'entity:player',
    operations: [
      {
        op: 'set',
        path: '/scenes/main/entities/player/components/transform',
        value: { x: 160, y: 320 }
      }
    ],
    beforeHash: 'hash_before_001',
    status: 'proposed',
    createdAt: '2026-06-16T00:00:00.000Z',
    ...overrides
  };
}

function throwingGuard(): SemanticPatchGuard {
  return {
    id: 'throwing-guard',
    validate: () => {
      throw new Error('boom');
    }
  };
}

function errorCodes(result: { errors: Array<{ code: SemanticPatchValidationIssueCode }> }) {
  return result.errors.map((issue) => issue.code);
}
