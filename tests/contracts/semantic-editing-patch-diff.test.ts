import { describe, expect, it } from 'vitest';

import {
  createFixBlankPreviewRepairHandlers,
  createSemanticEditingTraceRecorder,
  createSemanticPatchApplier,
  createSemanticPatchDiffValuePreview,
  createSemanticPatchDiffViewModel,
  createSemanticPatchPlanner,
  createSemanticPatchValidator,
  hashSemanticPatchDocument,
  traceSemanticPatchApply,
  traceSemanticPatchPlan,
  traceSemanticPatchValidation,
  type SemanticEditIntent,
  type SemanticEditingTraceEvent,
  type SemanticIndex,
  type SemanticIndexEntry,
  type SemanticPatch,
  type SemanticPatchApplyResult,
  type SemanticPatchOperation,
  type SemanticPatchValidationResult
} from '../../packages/game-dsl/src/index.js';

describe('Semantic patch diff view model', () => {
  it('creates operation rows with before and after previews for valid patches', () => {
    const beforeDocument = createDocument();
    const afterDocument = structuredClone(beforeDocument);
    afterDocument.scenes.main.entities.player.components.transform.x = 240;
    const patch = createPatch({
      operations: [{ op: 'set', path: '/scenes/main/entities/player/components/transform/x', value: 240 }]
    });

    const viewModel = createSemanticPatchDiffViewModel({ patch, beforeDocument, afterDocument });

    expect(viewModel.patch).toMatchObject({
      id: 'semantic_patch:001',
      intentId: 'edit_fix_blank_preview_001',
      target: 'scene:main',
      status: 'proposed',
      operationCount: 1,
      valid: true
    });
    expect(viewModel.operations).toHaveLength(1);
    expect(viewModel.operations[0]).toMatchObject({
      index: 0,
      op: 'set',
      path: '/scenes/main/entities/player/components/transform/x',
      effect: 'update',
      safePath: true,
      before: {
        kind: 'number',
        preview: '120'
      },
      after: {
        kind: 'number',
        preview: '240'
      }
    });
  });

  it('marks add operations against missing keys as creates', () => {
    const beforeDocument = createDocument();
    const afterDocument = structuredClone(beforeDocument);
    delete beforeDocument.scenes.main.background;
    afterDocument.scenes.main.background = { visible: true, color: '#111111' };
    const patch = createPatch({
      operations: [{ op: 'add', path: '/scenes/main/background', value: { visible: true, color: '#111111' } }]
    });

    const viewModel = createSemanticPatchDiffViewModel({ patch, beforeDocument, afterDocument });

    expect(viewModel.operations[0]).toMatchObject({
      op: 'add',
      effect: 'create',
      before: { kind: 'missing', preview: '(missing)' },
      after: { kind: 'object' }
    });
    expect(viewModel.operations[0].after.preview).toContain('"visible": true');
  });

  it('marks remove operations as deletes and shows a missing after preview', () => {
    const beforeDocument = createDocument();
    const afterDocument = structuredClone(beforeDocument);
    delete afterDocument.scenes.main.entities.player.components.renderable;
    const patch = createPatch({
      operations: [{ op: 'remove', path: '/scenes/main/entities/player/components/renderable' }]
    });

    const viewModel = createSemanticPatchDiffViewModel({ patch, beforeDocument, afterDocument });

    expect(viewModel.operations[0]).toMatchObject({
      op: 'remove',
      effect: 'delete',
      before: { kind: 'object' },
      after: { kind: 'missing', preview: '(missing)' }
    });
  });

  it('marks replace operations as replaces', () => {
    const beforeDocument = createDocument();
    const afterDocument = structuredClone(beforeDocument);
    afterDocument.scenes.main.camera = { width: 1024, height: 768, follow: 'entity:player' };
    const patch = createPatch({
      operations: [{ op: 'replace', path: '/scenes/main/camera', value: afterDocument.scenes.main.camera }]
    });

    const viewModel = createSemanticPatchDiffViewModel({ patch, beforeDocument, afterDocument });

    expect(viewModel.operations[0]).toMatchObject({
      op: 'replace',
      effect: 'replace',
      before: { kind: 'object' },
      after: { kind: 'object' }
    });
    expect(viewModel.operations[0].before.preview).toContain('"width": 800');
    expect(viewModel.operations[0].after.preview).toContain('"width": 1024');
  });

  it('does not throw on invalid patch input and returns warnings instead', () => {
    const viewModel = createSemanticPatchDiffViewModel({
      patch: {
        id: 'invalid_patch',
        operations: [{ op: 'set', path: 'not-absolute', value: 'bad' }]
      },
      beforeDocument: createDocument(),
      afterDocument: createDocument()
    });

    expect(viewModel.patch.valid).toBe(false);
    expect(viewModel.patch.operationCount).toBe(0);
    expect(viewModel.operations).toEqual([]);
    expect(viewModel.warnings.some((warning) => warning.includes('INVALID_SEMANTIC_PATCH_SCHEMA'))).toBe(true);
  });

  it('redacts sensitive keys from value previews', () => {
    const preview = createSemanticPatchDiffValuePreview({
      public: 'ok',
      password: 'super-secret',
      nested: {
        apiKey: 'api-secret',
        authorization: 'Bearer hidden',
        accessToken: 'access-secret',
        refresh_token: 'refresh-secret',
        clientSecret: 'client-secret'
      }
    });

    expect(preview.preview).toContain('"public": "ok"');
    expect(preview.preview).toContain('"password": "[REDACTED]"');
    expect(preview.preview).toContain('"apiKey": "[REDACTED]"');
    expect(preview.preview).toContain('"accessToken": "[REDACTED]"');
    expect(preview.preview).toContain('"refresh_token": "[REDACTED]"');
    expect(preview.preview).toContain('"clientSecret": "[REDACTED]"');
    expect(preview.preview).not.toContain('super-secret');
    expect(preview.preview).not.toContain('api-secret');
    expect(preview.preview).not.toContain('Bearer hidden');
    expect(preview.preview).not.toContain('access-secret');
    expect(preview.preview).not.toContain('refresh-secret');
    expect(preview.preview).not.toContain('client-secret');
  });

  it('redacts scalar previews when the operation path is sensitive', () => {
    const patch = createPatch({
      operations: [{ op: 'set', path: '/config/apiKey', value: 'provider-key-after-redacted' }]
    });
    const viewModel = createSemanticPatchDiffViewModel({
      patch,
      beforeDocument: { config: { apiKey: 'provider-key-before-redacted' } },
      afterDocument: { config: { apiKey: 'provider-key-after-redacted' } }
    });

    expect(viewModel.operations[0].before).toMatchObject({ kind: 'string', preview: '"[REDACTED]"', redacted: true });
    expect(viewModel.operations[0].after).toMatchObject({ kind: 'string', preview: '"[REDACTED]"', redacted: true });
    expect(JSON.stringify(viewModel)).not.toContain('provider-key-before-redacted');
    expect(JSON.stringify(viewModel)).not.toContain('provider-key-after-redacted');
  });

  it('truncates long value previews with explicit truncation metadata', () => {
    const preview = createSemanticPatchDiffValuePreview({ message: 'x'.repeat(500) }, { maxPreviewLength: 80 });

    expect(preview.truncated).toBe(true);
    expect(preview.preview.length).toBeLessThanOrEqual(83);
    expect(preview.preview.endsWith('...')).toBe(true);
  });

  it('does not retain raw operation value references in operation rows', () => {
    const value = { visible: true, token: 'do-not-leak' };
    const patch = createPatch({ operations: [{ op: 'set', path: '/scenes/main/background', value }] });
    const viewModel = createSemanticPatchDiffViewModel({ patch, beforeDocument: createDocument() });

    value.visible = false;
    value.token = 'changed';

    expect(viewModel.operations[0].after.preview).toContain('"visible": true');
    expect(viewModel.operations[0].after.preview).toContain('"token": "[REDACTED]"');
    expect(viewModel.operations[0].after.preview).not.toContain('changed');
  });

  it('does not mutate patch, documents, validation, apply result, or trace events', () => {
    const beforeDocument = createDocument();
    const afterDocument = structuredClone(beforeDocument);
    afterDocument.scenes.main.background = { visible: true };
    const patch = createPatch({
      operations: [{ op: 'set', path: '/scenes/main/background', value: { visible: true } }]
    });
    const validation = createValidation({
      warnings: [
        {
          severity: 'warning',
          code: 'PATCH_STATUS_NOT_PROPOSED',
          message: 'warning',
          operationIndex: 0
        }
      ]
    });
    const applyResult: SemanticPatchApplyResult = {
      ok: false,
      error: {
        code: 'PATCH_STATUS_NOT_PROPOSED',
        message: 'status mismatch',
        cause: { secret: 'hidden' }
      }
    };
    const traceEvents = [createTraceEvent({ payload: { operation: patch.operations[0], document: beforeDocument } })];
    const beforeSnapshot = {
      beforeDocument: structuredClone(beforeDocument),
      afterDocument: structuredClone(afterDocument),
      patch: structuredClone(patch),
      validation: structuredClone(validation),
      applyResult: structuredClone(applyResult),
      traceEvents: structuredClone(traceEvents)
    };

    createSemanticPatchDiffViewModel({ patch, beforeDocument, afterDocument, validation, applyResult, traceEvents });

    expect(beforeDocument).toEqual(beforeSnapshot.beforeDocument);
    expect(afterDocument).toEqual(beforeSnapshot.afterDocument);
    expect(patch).toEqual(beforeSnapshot.patch);
    expect(validation).toEqual(beforeSnapshot.validation);
    expect(applyResult).toEqual(beforeSnapshot.applyResult);
    expect(traceEvents).toEqual(beforeSnapshot.traceEvents);
  });

  it('maps validation issues onto operation rows without exposing causes', () => {
    const patch = createPatch({
      operations: [{ op: 'set', path: '/generated/MainScene.ts', value: { source: 'bad' } }]
    });
    const validation = createValidation({
      errors: [
        {
          severity: 'error',
          code: 'GENERATED_CODE_EDIT_FORBIDDEN',
          message: 'generated code edit is forbidden',
          path: '/generated/MainScene.ts',
          operationIndex: 0,
          cause: new Error('stack should stay hidden')
        }
      ]
    });

    const viewModel = createSemanticPatchDiffViewModel({ patch, beforeDocument: createDocument(), validation });

    expect(viewModel.validation).toMatchObject({
      ok: false,
      errorCount: 1,
      warningCount: 0
    });
    expect(viewModel.operations[0].safePath).toBe(false);
    expect(viewModel.operations[0].validationIssues).toEqual([
      {
        severity: 'error',
        code: 'GENERATED_CODE_EDIT_FORBIDDEN',
        path: '/generated/MainScene.ts'
      }
    ]);
    expect(JSON.stringify(viewModel.validation)).not.toContain('stack should stay hidden');
    expect(JSON.stringify(viewModel)).not.toContain('generated code edit is forbidden');
  });

  it('uses stable fallback warnings without leaking thrown error messages', () => {
    const leakingDocument = {
      scenes: {
        main: {}
      }
    };
    Object.defineProperty(leakingDocument.scenes.main, 'background', {
      enumerable: true,
      get() {
        throw new Error('Bearer secret-token-from-getter');
      }
    });

    const viewModel = createSemanticPatchDiffViewModel({
      patch: createPatch({
        operations: [{ op: 'set', path: '/scenes/main/background', value: { visible: true } }]
      }),
      beforeDocument: leakingDocument
    });

    expect(viewModel.operations).toEqual([]);
    expect(viewModel.warnings).toContain('SEMANTIC_PATCH_DIFF_VIEW_MODEL_ERROR');
    expect(JSON.stringify(viewModel)).not.toContain('secret-token-from-getter');
    expect(JSON.stringify(viewModel)).not.toContain('Bearer');
  });

  it('summarizes apply results without exposing the result document', () => {
    const { document, intent, patch, semanticIndex } = createPlannedPatch();
    const applyResult = createSemanticPatchApplier(createApplierOptions()).apply({ document, intent, patch, semanticIndex });

    const viewModel = createSemanticPatchDiffViewModel({
      patch,
      beforeDocument: document,
      afterDocument: applyResult.ok ? applyResult.document : undefined,
      applyResult
    });

    expect(applyResult.ok).toBe(true);
    expect(viewModel.apply).toMatchObject({
      ok: true,
      appliedPatchId: 'semantic_patch:fix_blank_preview_001',
      rollbackPatchId: 'semantic_rollback:fix_blank_preview_001'
    });
    expect(Object.prototype.hasOwnProperty.call(viewModel.apply ?? {}, 'document')).toBe(false);
    expect(JSON.stringify(viewModel.apply)).not.toContain('"scenes"');
  });

  it('summarizes trace events without payload details', () => {
    const traceEvents = [
      createTraceEvent({
        type: 'semantic_edit.patch.proposed',
        patchId: 'semantic_patch:001',
        target: 'scene:main',
        kind: 'fix_blank_preview',
        payload: {
          operation: { value: { secretMarker: 'raw-secret' } },
          document: { marker: 'document-only' }
        }
      })
    ];

    const viewModel = createSemanticPatchDiffViewModel({
      patch: createPatch(),
      beforeDocument: createDocument(),
      traceEvents
    });

    expect(viewModel.trace).toEqual([
      {
        id: 'trace_001',
        type: 'semantic_edit.patch.proposed',
        at: '2026-01-01T00:00:00.000Z',
        severity: 'info',
        patchId: 'semantic_patch:001',
        target: 'scene:main',
        kind: 'fix_blank_preview'
      }
    ]);
    expect(JSON.stringify(viewModel.trace)).not.toContain('raw-secret');
    expect(JSON.stringify(viewModel.trace)).not.toContain('document-only');
  });

  it('builds a diff model for the full in-memory fix_blank_preview lifecycle', () => {
    const document = createDocument();
    const intent = createFixBlankPreviewIntent();
    const semanticIndex = createTestSemanticIndex();
    const trace = createSemanticEditingTraceRecorder({
      correlationId: 'corr_patch_diff',
      now: () => new Date('2026-01-01T00:00:00.000Z'),
      createEventId: (type, sequence) => `trace_${sequence}_${type}`
    });
    const planner = createSemanticPatchPlanner(createFixBlankPreviewRepairHandlers({ document, scenePath: '/scenes/main' }));
    const validator = createSemanticPatchValidator();
    const applier = createSemanticPatchApplier(createApplierOptions());
    const planResult = traceSemanticPatchPlan({
      planner,
      request: createPlanRequest(document, intent, semanticIndex),
      trace
    });
    expect(planResult.ok).toBe(true);
    if (!planResult.ok) {
      throw new Error(`expected plan success, got ${planResult.error.code}`);
    }
    const validation = traceSemanticPatchValidation({
      validator,
      request: { intent, patch: planResult.patch, semanticIndex },
      trace
    });
    expect(validation.ok).toBe(true);
    const applyResult = traceSemanticPatchApply({
      applier,
      request: { document, intent, patch: planResult.patch, semanticIndex },
      trace
    });
    expect(applyResult.ok).toBe(true);
    if (!applyResult.ok) {
      throw new Error(`expected apply success, got ${applyResult.error.code}`);
    }

    const viewModel = createSemanticPatchDiffViewModel({
      patch: planResult.patch,
      beforeDocument: document,
      afterDocument: applyResult.document,
      validation,
      applyResult,
      traceEvents: trace.getEvents()
    });

    expect(viewModel.patch.operationCount).toBeGreaterThanOrEqual(4);
    expect(viewModel.validation?.ok).toBe(true);
    expect(viewModel.apply?.ok).toBe(true);
    expect(viewModel.trace?.map((event) => event.type)).toEqual([
      'semantic_edit.intent.created',
      'semantic_edit.intent.resolved',
      'semantic_edit.patch.proposed',
      'semantic_edit.patch.validation_started',
      'semantic_edit.patch.validated',
      'semantic_edit.patch.apply_started',
      'semantic_edit.patch.applied'
    ]);
    expect(viewModel.operations.map((operation) => operation.path)).toEqual(
      expect.arrayContaining([
        '/scenes/main/background',
        '/scenes/main/camera',
        '/scenes/main/spawn/player',
        '/scenes/main/entities/debug_visible_marker',
        '/assets/fallbacks/missing_sprite'
      ])
    );
    expect(JSON.stringify(viewModel)).not.toContain('operation.value');
  });
});

type PatchDiffTestDocument = {
  scenes: {
    main: {
      background?: {
        visible: boolean;
        color?: string;
      };
      camera: {
        width: number;
        height: number;
        follow: string;
      };
      entities: {
        player: {
          id: string;
          kind: string;
          components: {
            transform: {
              x: number;
              y: number;
            };
            renderable?: {
              visible: boolean;
            };
          };
        };
      };
      spawn?: {
        player: {
          x: number;
          y: number;
        };
      };
    };
  };
  assets?: {
    fallbacks?: Record<string, unknown>;
  };
};

function createDocument(): PatchDiffTestDocument {
  return {
    scenes: {
      main: {
        background: {
          visible: false,
          color: '#000000'
        },
        camera: {
          width: 800,
          height: 600,
          follow: 'entity:player'
        },
        entities: {
          player: {
            id: 'entity:player',
            kind: 'entity',
            components: {
              transform: {
                x: 120,
                y: 300
              },
              renderable: {
                visible: true
              }
            }
          }
        }
      }
    }
  };
}

function createPatch(options: { operations?: SemanticPatchOperation[]; overrides?: Partial<SemanticPatch> } = {}): SemanticPatch {
  return {
    id: 'semantic_patch:001',
    intentId: 'edit_fix_blank_preview_001',
    target: 'scene:main',
    operations:
      options.operations ?? [
        {
          op: 'set',
          path: '/scenes/main/background',
          value: { visible: true }
        }
      ],
    beforeHash: 'semantic_hash:before',
    status: 'proposed',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...options.overrides
  };
}

function createValidation(input: Partial<SemanticPatchValidationResult> = {}): SemanticPatchValidationResult {
  return {
    ok: input.ok ?? (input.errors?.length ?? 0) === 0,
    errors: input.errors ?? [],
    warnings: input.warnings ?? []
  };
}

function createTraceEvent(overrides: Partial<SemanticEditingTraceEvent> = {}): SemanticEditingTraceEvent {
  return {
    id: 'trace_001',
    type: 'semantic_edit.patch.proposed',
    at: '2026-01-01T00:00:00.000Z',
    severity: 'info',
    payload: {},
    ...overrides
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

function createPlanRequest(document: unknown, intent = createFixBlankPreviewIntent(), semanticIndex = createTestSemanticIndex()) {
  return {
    intent,
    semanticIndex,
    beforeHash: hashSemanticPatchDocument(document),
    now: () => new Date('2026-01-01T00:00:00.000Z'),
    createPatchId: () => 'semantic_patch:fix_blank_preview_001'
  };
}

function createPlannedPatch() {
  const document = createDocument();
  const intent = createFixBlankPreviewIntent();
  const semanticIndex = createTestSemanticIndex();
  const planResult = createSemanticPatchPlanner(createFixBlankPreviewRepairHandlers({ document, scenePath: '/scenes/main' })).plan(
    createPlanRequest(document, intent, semanticIndex)
  );
  if (!planResult.ok) {
    throw new Error(`expected plan success, got ${planResult.error.code}`);
  }

  return { document, intent, semanticIndex, patch: planResult.patch };
}

function createApplierOptions() {
  return {
    now: () => new Date('2026-01-01T00:00:00.000Z'),
    createRollbackPatchId: () => 'semantic_rollback:fix_blank_preview_001'
  };
}

function createTestSemanticIndex(): SemanticIndex {
  const entries = new Map<string, SemanticIndexEntry>([
    ['scene:main', { id: 'scene:main', kind: 'scene', path: '/scenes/main', value: {} }],
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
