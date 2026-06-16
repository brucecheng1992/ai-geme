import { describe, expect, it } from 'vitest';

import { SemanticEditIntentSchema, type SemanticEditIntent } from '../../packages/game-dsl/src/index.js';

describe('Semantic edit intent schema', () => {
  it('accepts a traceable fix_blank_preview intent targeting a semantic scene', () => {
    const intent = SemanticEditIntentSchema.parse({
      id: 'edit_fix_blank_preview_001',
      kind: 'fix_blank_preview',
      target: 'scene:main',
      reason: {
        source: 'qa',
        message: 'Preview status is PLAYABLE but visual output is blank.',
        qaFindingIds: ['qa_finding_blank_preview_001']
      },
      payload: {
        ensureRenderableEntity: true,
        ensureCameraSeesSpawn: true,
        ensureBackgroundVisible: true,
        ensureAssetBindings: true
      },
      constraints: {
        preserveGameplay: true,
        noGeneratedCodeEdit: true
      }
    });

    expect(intent satisfies SemanticEditIntent).toMatchObject({
      kind: 'fix_blank_preview',
      target: 'scene:main',
      reason: { source: 'qa' }
    });
  });

  it('rejects missing reason, non-semantic targets, unknown kinds, and extra outer fields', () => {
    const baseIntent = {
      id: 'edit_adjust_camera_001',
      kind: 'adjust_camera',
      target: 'camera:main',
      reason: { source: 'agent', message: 'Camera does not include the player spawn.' },
      payload: { x: 0, y: 0 }
    };

    expect(SemanticEditIntentSchema.safeParse({ ...baseIntent, reason: undefined }).success).toBe(false);
    expect(SemanticEditIntentSchema.safeParse({ ...baseIntent, target: 'src/scenes/MainScene.ts:83' }).success).toBe(false);
    expect(SemanticEditIntentSchema.safeParse({ ...baseIntent, kind: 'patch_phaser_code' }).success).toBe(false);
    expect(SemanticEditIntentSchema.safeParse({ ...baseIntent, generatedPath: '/generated/MainScene.ts' }).success).toBe(false);
  });

  it('keeps payload extensible while validating traceability fields', () => {
    const extensible = SemanticEditIntentSchema.parse({
      id: 'edit_bind_asset_001',
      kind: 'bind_asset',
      target: 'asset:player_sprite',
      reason: {
        source: 'trace',
        message: 'Asset binding trace found an unresolved player asset.',
        traceEventIds: ['trace_asset_missing_player']
      },
      payload: {
        candidateAssetId: 'asset_pack_player_01',
        confidence: 0.82,
        metadata: { selectedBy: 'semantic_edit' }
      }
    });

    expect(extensible.payload).toMatchObject({
      candidateAssetId: 'asset_pack_player_01',
      metadata: { selectedBy: 'semantic_edit' }
    });
    expect(SemanticEditIntentSchema.safeParse({ ...extensible, reason: { source: 'trace', message: '' } }).success).toBe(false);
    expect(SemanticEditIntentSchema.safeParse({ ...extensible, reason: { source: 'unknown', message: 'No source.' } }).success).toBe(false);
  });
});
