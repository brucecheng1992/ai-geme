import { describe, expect, it } from 'vitest';

import {
  buildSemanticIndex,
  createFixBlankPreviewRepairHandlers,
  createSemanticPatchApplier,
  createSemanticPatchPlanner,
  createSemanticPatchValidator,
  hashSemanticPatchDocument,
  type SemanticEditIntent,
  type SemanticIndex,
  type SemanticIndexEntry,
  type SemanticPatch,
  type SemanticPatchOperation
} from '../../packages/game-dsl/src/index.js';
import { createShooterRawDsl } from './fixtures.js';

describe('fix_blank_preview repair pack', () => {
  it('generates a deterministic proposed patch through the planner', () => {
    const document = createBlankPreviewDocument();
    const planResult = planRepair(document);

    expect(planResult.ok).toBe(true);
    if (!planResult.ok) {
      throw new Error(`expected plan success, got ${planResult.error.code}`);
    }
    expect(planResult.patch).toMatchObject({
      id: 'semantic_patch:fix_blank_preview_001',
      intentId: 'edit_fix_blank_preview_001',
      target: 'scene:main',
      status: 'proposed',
      createdAt: '2026-01-01T00:00:00.000Z'
    });
    expect(planResult.patch.afterHash).toBeUndefined();
    expect(planResult.patch.operations.length).toBeGreaterThan(0);
  });

  it('produces a repair patch accepted by validator guards', () => {
    const { intent, semanticIndex, patch } = planRepairPatch(createBlankPreviewDocument());

    const validation = createSemanticPatchValidator().validate({ intent, patch, semanticIndex });

    expect(validation.ok).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(validation.errors.map((issue) => issue.code)).not.toContain('GENERATED_CODE_EDIT_FORBIDDEN');
    expect(validation.errors.map((issue) => issue.code)).not.toContain('INVALID_SEMANTIC_OPERATION_PATH');
  });

  it('applies the repair patch through the applier without mutating the original document', () => {
    const document = createBlankPreviewDocument();
    const original = jsonClone(document);
    const { applyResult } = applyRepair(document);

    expect(applyResult.ok).toBe(true);
    if (!applyResult.ok) {
      throw new Error(`expected apply success, got ${applyResult.error.code}`);
    }
    expect(applyResult.appliedPatch.status).toBe('applied');
    expect(applyResult.rollbackPatch.status).toBe('proposed');
    expect(applyResult.afterHash).toBe(hashSemanticPatchDocument(applyResult.document));
    expect(document).toEqual(original);
  });

  it('adds the minimum visible scene semantics after apply', () => {
    const { applyResult } = applyRepair(createBlankPreviewDocument());

    expect(applyResult.ok).toBe(true);
    if (!applyResult.ok) {
      throw new Error(`expected apply success, got ${applyResult.error.code}`);
    }

    const repaired = asRepairDocument(applyResult.document);
    const scene = repaired.scenes.main;
    const marker = getMarker(scene.entities, 'debug_visible_marker');

    expect(scene.background?.visible).toBe(true);
    expect(scene.camera?.width).toBe(800);
    expect(scene.camera?.height).toBe(600);
    expect(scene.camera?.follow).toBe('entity:player');
    expect(scene.spawn?.player).toEqual({ x: 160, y: 320 });
    expect(marker.components.renderable.visible).toBe(true);
    expect(marker.components.transform.x).toBeGreaterThanOrEqual(0);
    expect(marker.components.transform.x).toBeLessThanOrEqual(800);
    expect(marker.components.transform.y).toBeGreaterThanOrEqual(0);
    expect(marker.components.transform.y).toBeLessThanOrEqual(600);
    expect(repaired.assets?.fallbacks?.missing_sprite?.type).toBe('generated_shape');
  });

  it('rolls the repair patch back to the original document', () => {
    const document = createBlankPreviewDocument();
    const { applier, intent, semanticIndex, applyResult } = applyRepair(document);

    expect(applyResult.ok).toBe(true);
    if (!applyResult.ok) {
      throw new Error(`expected apply success, got ${applyResult.error.code}`);
    }

    const rollbackResult = applier.rollback({
      document: applyResult.document,
      appliedPatch: applyResult.appliedPatch,
      rollbackPatch: applyResult.rollbackPatch,
      intent,
      semanticIndex
    });

    expect(rollbackResult.ok).toBe(true);
    if (!rollbackResult.ok) {
      throw new Error(`expected rollback success, got ${rollbackResult.error.code}`);
    }
    expect(rollbackResult.document).toEqual(document);
    expect(rollbackResult.rolledBackPatch.status).toBe('rolled_back');
  });

  it('creates missing containers before child repair values', () => {
    const document = createSparseDocument();
    const { patch, applyResult } = applyRepair(document);

    expect(applyResult.ok).toBe(true);
    if (!applyResult.ok) {
      throw new Error(`expected apply success, got ${applyResult.error.code}`);
    }
    const repaired = asRepairDocument(applyResult.document);
    expect(repaired.scenes.main.background?.visible).toBe(true);
    expect(repaired.scenes.main.camera?.width).toBe(800);
    expect(repaired.scenes.main.spawn?.player).toEqual({ x: 160, y: 320 });
    expect(getMarker(repaired.scenes.main.entities, 'debug_visible_marker').components.renderable.visible).toBe(true);
    expect(repaired.assets?.fallbacks?.missing_sprite?.type).toBe('generated_shape');

    expect(operationIndex(patch, '/assets')).toBeLessThan(operationIndex(patch, '/assets/fallbacks'));
    expect(operationIndex(patch, '/scenes/main/entities')).toBeLessThan(
      operationIndex(patch, '/scenes/main/entities/debug_visible_marker')
    );
    expect(operationIndex(patch, '/scenes/main/spawn')).toBeLessThan(operationIndex(patch, '/scenes/main/spawn/player'));
  });

  it('preserves existing gameplay data and unknown fields', () => {
    const document = createDocumentWithExistingGameplayData();
    const { applyResult } = applyRepair(document);

    expect(applyResult.ok).toBe(true);
    if (!applyResult.ok) {
      throw new Error(`expected apply success, got ${applyResult.error.code}`);
    }
    const repaired = asRepairDocument(applyResult.document);

    expect(repaired.scenes.main.entities.player).toEqual(document.scenes.main.entities.player);
    expect(repaired.scenes.main.entities.player.components.health).toEqual({ hp: 3 });
    expect(repaired.scenes.main.camera?.customField).toBe('keep-me');
    expect(repaired.scenes.main.background?.customTheme).toBe('keep-me');
    expect(repaired.assets?.sprites?.player?.source).toBe('./assets/player.png');
  });

  it('applies payload overrides to viewport, spawn, marker, and fallback asset', () => {
    const document = createBlankPreviewDocument();
    const { applyResult } = applyRepair(
      document,
      createFixBlankPreviewIntent({
        payload: {
          viewport: { width: 1024, height: 768 },
          spawn: { x: 256, y: 384 },
          primaryEntityId: 'entity:hero',
          marker: {
            key: 'visible_marker',
            id: 'entity:visible_marker',
            width: 48,
            height: 48
          },
          fallbackAsset: {
            key: 'fallback_box',
            width: 40,
            height: 40
          }
        }
      })
    );

    expect(applyResult.ok).toBe(true);
    if (!applyResult.ok) {
      throw new Error(`expected apply success, got ${applyResult.error.code}`);
    }
    const repaired = asRepairDocument(applyResult.document);

    expect(repaired.scenes.main.camera?.width).toBe(1024);
    expect(repaired.scenes.main.camera?.height).toBe(768);
    expect(repaired.scenes.main.camera?.follow).toBe('entity:hero');
    expect(repaired.scenes.main.spawn?.player).toEqual({ x: 256, y: 384 });
    const marker = getMarker(repaired.scenes.main.entities, 'visible_marker');
    expect(marker.id).toBe('entity:visible_marker');
    expect(marker.components.shape.width).toBe(48);
    expect(repaired.assets?.fallbacks?.fallback_box?.width).toBe(40);
  });

  it('skips asset binding operations when that section is disabled', () => {
    const planResult = planRepair(
      createBlankPreviewDocument(),
      createFixBlankPreviewIntent({
        payload: {
          ensureAssetBindings: false
        }
      })
    );

    expect(planResult.ok).toBe(true);
    if (!planResult.ok) {
      throw new Error(`expected plan success, got ${planResult.error.code}`);
    }
    expect(planResult.patch.operations.some((operation) => operation.path.includes('/assets/fallbacks/missing_sprite'))).toBe(false);
    expect(planResult.patch.operations.some((operation) => operation.path === '/scenes/main/background')).toBe(true);
    expect(planResult.patch.operations.some((operation) => operation.path === '/scenes/main/camera')).toBe(true);
    expect(planResult.patch.operations.some((operation) => operation.path === '/scenes/main/spawn/player')).toBe(true);
    expect(planResult.patch.operations.some((operation) => operation.path === '/scenes/main/entities/debug_visible_marker')).toBe(true);
  });

  it('lets planner reject an empty repair when all sections are disabled', () => {
    const planResult = planRepair(
      {},
      createFixBlankPreviewIntent({
        payload: {
          ensureRenderableEntity: false,
          ensureCameraSeesSpawn: false,
          ensureBackgroundVisible: false,
          ensureAssetBindings: false
        }
      })
    );

    expect(planResult).toMatchObject({ ok: false, error: { code: 'EMPTY_SEMANTIC_PATCH_OPERATIONS' } });
  });

  it('rejects real SemanticIndex scene targets whose SSOT path is not an explicit scene container', () => {
    const planResult = planRepair(createBlankPreviewDocument(), createFixBlankPreviewIntent(), {
      semanticIndex: buildSemanticIndex(createShooterRawDsl())
    });

    expect(planResult).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });
  });

  it('rejects known payload fields with invalid values instead of silently using defaults', () => {
    const planResult = planRepair(
      createBlankPreviewDocument(),
      createFixBlankPreviewIntent({
        payload: {
          ensureRenderableEntity: false,
          ensureCameraSeesSpawn: false,
          ensureBackgroundVisible: false,
          ensureAssetBindings: false,
          viewport: { width: -1 }
        }
      })
    );

    expect(planResult).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });
  });

  it('rejects marker keys that collide with existing gameplay entities', () => {
    const planResult = planRepair(
      createBlankPreviewDocument(),
      createFixBlankPreviewIntent({
        payload: {
          marker: {
            key: 'player'
          }
        }
      })
    );

    expect(planResult).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });
  });

  it('rejects nested explicit scenePath values that are not scene containers', () => {
    const planResult = planRepair(createBlankPreviewDocument(), createFixBlankPreviewIntent(), {
      scenePath: '/scenes/main/entities'
    });

    expect(planResult).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });
  });

  it.each(['scenes/main', '/scenes//main', '/scenes/main/'])(
    'rejects non-canonical explicit scenePath values: %s',
    (scenePath) => {
      const planResult = planRepair(createBlankPreviewDocument(), createFixBlankPreviewIntent(), {
        scenePath
      });

      expect(planResult).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });
    }
  );

  it('does not mutate document, intent, or semanticIndex', () => {
    const document = createBlankPreviewDocument();
    const intent = createFixBlankPreviewIntent();
    const semanticIndex = createTestSemanticIndex();
    const documentBefore = jsonClone(document);
    const intentBefore = jsonClone(intent);
    const entryBefore = jsonClone(semanticIndex.resolve('scene:main'));

    const planner = createSemanticPatchPlanner(createFixBlankPreviewRepairHandlers({ document }));
    const result = planner.plan({
      intent,
      semanticIndex,
      beforeHash: hashSemanticPatchDocument(document)
    });

    expect(result.ok).toBe(true);
    expect(document).toEqual(documentBefore);
    expect(intent).toEqual(intentBefore);
    expect(semanticIndex.resolve('scene:main')).toEqual(entryBefore);
  });

  it('can be applied repeatedly without duplicating the marker or failing on add existing key', () => {
    const first = applyRepair(createBlankPreviewDocument());
    expect(first.applyResult.ok).toBe(true);
    if (!first.applyResult.ok) {
      throw new Error(`expected first apply success, got ${first.applyResult.error.code}`);
    }

    const second = applyRepair(first.applyResult.document);
    expect(second.applyResult.ok).toBe(true);
    if (!second.applyResult.ok) {
      throw new Error(`expected second apply success, got ${second.applyResult.error.code}`);
    }

    const entities = asRepairDocument(second.applyResult.document).scenes.main.entities;
    expect(Object.keys(entities).filter((key) => key === 'debug_visible_marker')).toHaveLength(1);
  });

  it('returns a planner handler exception when scene path cannot be inferred', () => {
    const document = createBlankPreviewDocument();
    const planResult = planRepair(
      document,
      createFixBlankPreviewIntent({
        target: 'entity:player'
      })
    );

    expect(planResult).toMatchObject({ ok: false, error: { code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION' } });
  });

  it('uses an explicit scenePath instead of target-derived scene paths', () => {
    const document = {
      scenes: {
        custom_level: {}
      }
    };
    const planResult = planRepair(
      document,
      createFixBlankPreviewIntent({
        target: 'scene:level_1'
      }),
      { scenePath: '/scenes/custom_level' }
    );

    expect(planResult.ok).toBe(true);
    if (!planResult.ok) {
      throw new Error(`expected plan success, got ${planResult.error.code}`);
    }
    expect(planResult.patch.operations.every((operation) => !operation.path.startsWith('/scenes/level_1'))).toBe(true);
    expect(planResult.patch.operations.some((operation) => operation.path.startsWith('/scenes/custom_level'))).toBe(true);
  });
});

type RepairDocument = {
  scenes: Record<
    string,
    {
      background?: Record<string, unknown> & { visible?: boolean };
      camera?: Record<string, unknown> & { width?: number; height?: number; follow?: string; customField?: string };
      spawn?: Record<string, { x: number; y: number }>;
      entities: Record<
        string,
        {
          id: string;
          kind: string;
          components: {
            transform: { x: number; y: number };
            shape?: { type: string; width: number; height: number };
            renderable?: { visible: boolean };
            health?: { hp: number };
          };
        }
      >;
    }
  >;
  assets?: {
    fallbacks?: Record<string, { type?: string; shape?: string; width?: number; height?: number }>;
    sprites?: Record<string, { source: string }>;
  };
};

type RepairMarkerEntity = {
  id: string;
  kind: string;
  components: {
    transform: { x: number; y: number };
    shape: { type: string; width: number; height: number };
    renderable: { visible: boolean };
  };
};

type PlanRepairOptions = {
  scenePath?: string;
  semanticIndex?: SemanticIndex;
};

function createBlankPreviewDocument() {
  return {
    scenes: {
      main: {
        entities: {
          player: {
            id: 'entity:player',
            kind: 'entity',
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

function createSparseDocument() {
  return {
    scenes: {
      main: {}
    }
  };
}

function createDocumentWithExistingGameplayData() {
  return {
    scenes: {
      main: {
        camera: {
          id: 'camera:main',
          customField: 'keep-me'
        },
        background: {
          customTheme: 'keep-me'
        },
        entities: {
          player: {
            id: 'entity:player',
            kind: 'entity',
            components: {
              transform: { x: 10, y: 20 },
              health: { hp: 3 }
            }
          }
        }
      }
    },
    assets: {
      sprites: {
        player: {
          source: './assets/player.png'
        }
      }
    }
  };
}

function createFixBlankPreviewIntent(overrides: Partial<SemanticEditIntent> = {}): SemanticEditIntent {
  return {
    id: 'edit_fix_blank_preview_001',
    kind: 'fix_blank_preview',
    target: 'scene:main',
    reason: {
      source: 'qa',
      message: 'Preview status is PLAYABLE but visual output is blank.'
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
    },
    ...overrides
  };
}

function planRepair(document: unknown, intent = createFixBlankPreviewIntent(), options: PlanRepairOptions = {}) {
  const planner = createSemanticPatchPlanner(
    createFixBlankPreviewRepairHandlers({
      document,
      ...options
    })
  );

  return planner.plan({
    intent,
    semanticIndex: options.semanticIndex ?? createTestSemanticIndex(),
    beforeHash: hashSemanticPatchDocument(document),
    now: () => new Date('2026-01-01T00:00:00.000Z'),
    createPatchId: () => 'semantic_patch:fix_blank_preview_001'
  });
}

function planRepairPatch(document: unknown, intent = createFixBlankPreviewIntent(), options: PlanRepairOptions = {}) {
  const planResult = planRepair(document, intent, options);
  if (!planResult.ok) {
    throw new Error(`expected plan success, got ${planResult.error.code}`);
  }

  return {
    intent,
    semanticIndex: createTestSemanticIndex(),
    patch: planResult.patch
  };
}

function applyRepair(document: unknown, intent = createFixBlankPreviewIntent(), options: PlanRepairOptions = {}) {
  const semanticIndex = createTestSemanticIndex();
  const { patch } = planRepairPatch(document, intent, options);
  const applier = createSemanticPatchApplier({
    now: () => new Date('2026-01-01T00:00:00.000Z'),
    createRollbackPatchId: () => 'semantic_rollback:fix_blank_preview_001'
  });
  const applyResult = applier.apply({
    document,
    patch,
    intent,
    semanticIndex
  });

  return {
    applier,
    intent,
    semanticIndex,
    patch,
    applyResult
  };
}

function createTestSemanticIndex(): SemanticIndex {
  const entries = new Map<string, SemanticIndexEntry>([
    ['scene:main', { id: 'scene:main', kind: 'scene', path: '/scenes/main', value: {} }],
    ['scene:level_1', { id: 'scene:level_1', kind: 'scene', path: '/scenes/level_1', value: {} }],
    ['entity:player', { id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: {} }]
  ]);

  return {
    resolve(id) {
      return entries.get(id) ?? null;
    },
    has(id) {
      return entries.has(id);
    },
    list(kind) {
      const values = [...entries.values()];
      return kind === undefined ? values : values.filter((entry) => entry.kind === kind);
    }
  };
}

function operationIndex(patch: SemanticPatch, path: string): number {
  const index = patch.operations.findIndex((operation) => operation.path === path);
  if (index === -1) {
    throw new Error(`expected operation for path ${path}`);
  }

  return index;
}

function asRepairDocument(document: unknown): RepairDocument {
  return document as RepairDocument;
}

function getMarker(entities: RepairDocument['scenes'][string]['entities'], key: string): RepairMarkerEntity {
  return entities[key] as RepairMarkerEntity;
}

function jsonClone<T>(value: T): T {
  return structuredClone(value);
}
