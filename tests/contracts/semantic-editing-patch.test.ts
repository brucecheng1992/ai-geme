import { describe, expect, it } from 'vitest';

import { SemanticPatchSchema, type SemanticPatch } from '../../packages/game-dsl/src/index.js';

describe('Semantic patch schema', () => {
  it('accepts a serializable proposed patch against SSOT paths', () => {
    const patch = SemanticPatchSchema.parse({
      id: 'patch_fix_blank_preview_001',
      intentId: 'edit_fix_blank_preview_001',
      target: 'scene:main',
      operations: [
        {
          op: 'set',
          path: '/world/visual_theme',
          value: 'visible neon arena'
        },
        {
          op: 'replace',
          path: '/camera',
          value: { mode: 'follow_player_x' }
        }
      ],
      beforeHash: 'hash_before_001',
      status: 'proposed',
      createdAt: '2026-06-16T13:58:00.000Z'
    });

    expect(patch satisfies SemanticPatch).toMatchObject({
      id: 'patch_fix_blank_preview_001',
      target: 'scene:main',
      status: 'proposed'
    });
  });

  it('rejects generated output, source code, and non-semantic targets', () => {
    const basePatch = {
      id: 'patch_adjust_camera_001',
      intentId: 'edit_adjust_camera_001',
      target: 'camera:main',
      operations: [{ op: 'set', path: '/camera', value: { mode: 'follow_player_x' } }],
      beforeHash: 'hash_before_001',
      status: 'proposed',
      createdAt: '2026-06-16T13:58:00.000Z'
    };

    expect(SemanticPatchSchema.safeParse({ ...basePatch, target: 'src/scenes/MainScene.ts:83' }).success).toBe(false);
    expect(SemanticPatchSchema.safeParse({ ...basePatch, operations: [{ op: 'set', path: '/generated/MainScene.ts', value: {} }] }).success).toBe(false);
    expect(SemanticPatchSchema.safeParse({ ...basePatch, operations: [{ op: 'set', path: '/src/scenes/MainScene.ts', value: {} }] }).success).toBe(false);
    expect(SemanticPatchSchema.safeParse({ ...basePatch, operations: [{ op: 'set', path: 'camera', value: {} }] }).success).toBe(false);
  });

  it('requires operation values only for mutating value operations and keeps validation serializable', () => {
    const removePatch = SemanticPatchSchema.parse({
      id: 'patch_remove_marker_001',
      intentId: 'edit_remove_entity_001',
      target: 'entity:debug_visible_marker',
      operations: [{ op: 'remove', path: '/entities/0' }],
      beforeHash: 'hash_before_002',
      afterHash: 'hash_after_002',
      status: 'validated',
      createdAt: '2026-06-16T13:59:00.000Z',
      validation: {
        ok: true,
        errors: [],
        warnings: ['debug marker can be removed after visible entity exists']
      }
    });

    expect(removePatch.operations).toEqual([{ op: 'remove', path: '/entities/0' }]);
    expect(SemanticPatchSchema.safeParse({ ...removePatch, operations: [{ op: 'remove', path: '/entities/0', value: null }] }).success).toBe(false);
    expect(SemanticPatchSchema.safeParse({ ...removePatch, operations: [{ op: 'replace', path: '/entities/0' }] }).success).toBe(false);
    expect(SemanticPatchSchema.safeParse({ ...removePatch, operations: [{ op: 'set', path: '/entities/0', value: undefined }] }).success).toBe(false);
    expect(SemanticPatchSchema.safeParse({ ...removePatch, operations: [{ op: 'add', path: '/entities/0', value: undefined }] }).success).toBe(false);
    expect(SemanticPatchSchema.safeParse({ ...removePatch, operations: [{ op: 'replace', path: '/entities/0', value: undefined }] }).success).toBe(false);
  });
});
