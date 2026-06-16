import { describe, expect, it } from 'vitest';

import {
  createFixBlankPreviewRepairHandlers,
  createSemanticEditingTraceRecorder,
  createSemanticPatchApplier,
  createSemanticPatchPlanner,
  createSemanticPatchValidator,
  hashSemanticPatchDocument,
  SemanticEditingTraceEventSchema,
  traceSemanticPatchApply,
  traceSemanticPatchPlan,
  traceSemanticPatchRollback,
  traceSemanticPatchValidation,
  type SemanticEditIntent,
  type SemanticEditingTraceSink,
  type SemanticIndex,
  type SemanticIndexEntry,
  type SemanticPatch,
  type SemanticPatchOperation
} from '../../packages/game-dsl/src/index.js';

describe('Semantic editing trace events', () => {
  it('records deterministic ids, timestamps, correlation ids, and event order', () => {
    const trace = createDeterministicTrace('corr_001');

    trace.emit({ type: 'semantic_edit.intent.created', severity: 'info', payload: { step: 1 } });
    trace.emit({ type: 'semantic_edit.patch.proposed', severity: 'info', payload: { step: 2 } });

    const events = trace.getEvents();
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.id)).toEqual([
      'trace_1_semantic_edit.intent.created',
      'trace_2_semantic_edit.patch.proposed'
    ]);
    expect(events.every((event) => event.at === '2026-01-01T00:00:00.000Z')).toBe(true);
    expect(events.every((event) => event.correlationId === 'corr_001')).toBe(true);
    expect(events.map((event) => event.type)).toEqual(['semantic_edit.intent.created', 'semantic_edit.patch.proposed']);
    expect(events.every((event) => SemanticEditingTraceEventSchema.safeParse(event).success)).toBe(true);
  });

  it('accepts QA false-playable lifecycle event types', () => {
    const types = [
      'semantic_edit.qa.false_playable.detected',
      'semantic_edit.qa.false_playable.not_detected',
      'semantic_edit.qa.false_playable.repair_completed',
      'semantic_edit.qa.false_playable.repair_failed'
    ];

    for (const [index, type] of types.entries()) {
      expect(
        SemanticEditingTraceEventSchema.safeParse({
          id: `trace_qa_${index}`,
          type,
          at: '2026-01-01T00:00:00.000Z',
          severity: 'info',
          payload: { findingCount: index }
        }).success
      ).toBe(true);
    }
  });

  it('does not expose mutable recorder state through getEvents', () => {
    const trace = createDeterministicTrace();
    trace.emit({ type: 'semantic_edit.intent.created', severity: 'info', payload: { step: 1 } });

    const events = [...trace.getEvents()];
    events[0].type = 'semantic_edit.patch.proposed';
    events[0].payload.step = 999;
    events.push({ ...events[0], id: 'trace_extra', payload: {} });

    expect(trace.getEvents()).toHaveLength(1);
    expect(trace.getEvents()[0]).toMatchObject({
      type: 'semantic_edit.intent.created',
      payload: { step: 1 }
    });
  });

  it('captures sink errors without interrupting emit', () => {
    const trace = createDeterministicTrace('corr_001', () => {
      throw new Error('sink boom');
    });

    expect(() => trace.emit({ type: 'semantic_edit.intent.created', severity: 'info', payload: {} })).not.toThrow();
    expect(trace.getEvents()).toHaveLength(1);
    expect(trace.getSinkErrors()).toHaveLength(1);
  });

  it('traces successful planning as created, resolved, and proposed without operation values', () => {
    const document = createDocument();
    const trace = createDeterministicTrace('corr_plan_success');
    const result = traceSemanticPatchPlan({
      planner: createSemanticPatchPlanner(createFixBlankPreviewRepairHandlers({ document, scenePath: '/scenes/main' })),
      request: createPlanRequest(document),
      trace
    });

    expect(result.ok).toBe(true);
    expect(trace.getEvents().map((event) => event.type)).toEqual([
      'semantic_edit.intent.created',
      'semantic_edit.intent.resolved',
      'semantic_edit.patch.proposed'
    ]);
    const proposed = trace.getEvents()[2];
    expect(proposed.payload).toMatchObject({ patch: { operationCount: expect.any(Number) } });
    expect(JSON.stringify(proposed.payload)).not.toContain('"value"');
  });

  it('traces planning failure as intent rejection and plan failure without throwing', () => {
    const document = createDocument();
    const trace = createDeterministicTrace('corr_plan_failure');
    const result = traceSemanticPatchPlan({
      planner: createSemanticPatchPlanner(createFixBlankPreviewRepairHandlers({ document, scenePath: '/scenes/main' })),
      request: createPlanRequest(document, createFixBlankPreviewIntent({ target: 'scene:missing' })),
      trace
    });

    expect(result.ok).toBe(false);
    expect(trace.getEvents().map((event) => event.type)).toEqual([
      'semantic_edit.intent.created',
      'semantic_edit.intent.rejected',
      'semantic_edit.patch.plan_failed'
    ]);
  });

  it('traces successful validation as validation_started and validated', () => {
    const { intent, patch, semanticIndex } = createPlannedPatch();
    const trace = createDeterministicTrace('corr_validation_success');
    const validation = traceSemanticPatchValidation({
      validator: createSemanticPatchValidator(),
      request: { intent, patch, semanticIndex },
      trace
    });

    expect(validation.ok).toBe(true);
    expect(trace.getEvents().map((event) => event.type)).toEqual([
      'semantic_edit.patch.validation_started',
      'semantic_edit.patch.validated'
    ]);
    expect(trace.getEvents()[1].payload).toMatchObject({ validation: { ok: true } });
  });

  it('traces failed validation as validation_started and rejected without full causes', () => {
    const { intent, patch, semanticIndex } = createPlannedPatch({
      operations: [{ op: 'set', path: '/generated/MainScene.ts', value: { source: 'bad' } }]
    });
    const trace = createDeterministicTrace('corr_validation_failure');
    const validation = traceSemanticPatchValidation({
      validator: createSemanticPatchValidator(),
      request: { intent, patch, semanticIndex },
      trace
    });

    expect(validation.ok).toBe(false);
    expect(trace.getEvents().map((event) => event.type)).toEqual([
      'semantic_edit.patch.validation_started',
      'semantic_edit.patch.rejected'
    ]);
    expect(trace.getEvents()[1].payload).toMatchObject({ validation: { ok: false, errorCount: expect.any(Number) } });
    expect(JSON.stringify(trace.getEvents()[1].payload)).not.toContain('cause');
  });

  it('traces successful apply without emitting the result document', () => {
    const { document, intent, patch, semanticIndex } = createPlannedPatch();
    const trace = createDeterministicTrace('corr_apply_success');
    const applyResult = traceSemanticPatchApply({
      applier: createSemanticPatchApplier(createApplierOptions()),
      request: { document, intent, patch, semanticIndex },
      trace
    });

    expect(applyResult.ok).toBe(true);
    if (!applyResult.ok) {
      throw new Error(`expected apply success, got ${applyResult.error.code}`);
    }
    expect(trace.getEvents().map((event) => event.type)).toEqual([
      'semantic_edit.patch.apply_started',
      'semantic_edit.patch.applied'
    ]);
    expect(trace.getEvents()[1].payload).toMatchObject({
      apply: {
        beforeHash: applyResult.beforeHash,
        afterHash: applyResult.afterHash
      }
    });
    expect(JSON.stringify(trace.getEvents()[1].payload)).not.toContain('"document"');
  });

  it('traces failed apply with the stable apply error code', () => {
    const { document, intent, patch, semanticIndex } = createPlannedPatch({ patchOverrides: { beforeHash: 'wrong_hash' } });
    const trace = createDeterministicTrace('corr_apply_failure');
    const applyResult = traceSemanticPatchApply({
      applier: createSemanticPatchApplier(createApplierOptions()),
      request: { document, intent, patch, semanticIndex },
      trace
    });

    expect(applyResult.ok).toBe(false);
    expect(trace.getEvents().map((event) => event.type)).toEqual([
      'semantic_edit.patch.apply_started',
      'semantic_edit.patch.apply_failed'
    ]);
    expect(trace.getEvents()[1].payload).toMatchObject({ apply: { ok: false, errorCode: 'PATCH_BEFORE_HASH_MISMATCH' } });
  });

  it('redacts failure messages from planner and applier result summaries', () => {
    const secretMessage = 'document operation.value secret stack';
    const document = createDocument();
    const planTrace = createDeterministicTrace('corr_redact_plan');
    traceSemanticPatchPlan({
      planner: {
        plan: () => ({
          ok: false,
          error: {
            code: 'SEMANTIC_TARGET_NOT_FOUND',
            message: secretMessage,
            target: 'scene:main',
            kind: 'fix_blank_preview'
          }
        })
      },
      request: createPlanRequest(document),
      trace: planTrace
    });

    const { intent, patch, semanticIndex } = createPlannedPatch();
    const applyTrace = createDeterministicTrace('corr_redact_apply');
    traceSemanticPatchApply({
      applier: {
        apply: () => ({
          ok: false,
          error: {
            code: 'SEMANTIC_PATCH_APPLIER_EXCEPTION',
            message: secretMessage
          }
        }),
        rollback: () => {
          throw new Error('not used');
        }
      },
      request: { document, intent, patch, semanticIndex },
      trace: applyTrace
    });

    expect(JSON.stringify(planTrace.getEvents())).not.toContain(secretMessage);
    expect(JSON.stringify(applyTrace.getEvents())).not.toContain(secretMessage);
  });

  it('propagates wrapped implementation exceptions after emitting redacted failure events', () => {
    const secretMessage = 'document operation.value secret stack';
    const { document, intent, patch, semanticIndex } = createPlannedPatch();

    const planTrace = createDeterministicTrace('corr_throw_plan');
    expect(() =>
      traceSemanticPatchPlan({
        planner: {
          plan: () => {
            throw new Error(secretMessage);
          }
        },
        request: createPlanRequest(document, intent, semanticIndex),
        trace: planTrace
      })
    ).toThrow(secretMessage);
    expect(planTrace.getEvents().map((event) => event.type)).toEqual([
      'semantic_edit.intent.created',
      'semantic_edit.patch.plan_failed'
    ]);

    const validationTrace = createDeterministicTrace('corr_throw_validation');
    expect(() =>
      traceSemanticPatchValidation({
        validator: {
          validate: () => {
            throw new Error(secretMessage);
          }
        },
        request: { intent, patch, semanticIndex },
        trace: validationTrace
      })
    ).toThrow(secretMessage);
    expect(validationTrace.getEvents().map((event) => event.type)).toEqual([
      'semantic_edit.patch.validation_started',
      'semantic_edit.patch.rejected'
    ]);

    const throwingApplier = {
      apply: () => {
        throw new Error(secretMessage);
      },
      rollback: () => {
        throw new Error(secretMessage);
      }
    };
    const applyTrace = createDeterministicTrace('corr_throw_apply');
    expect(() =>
      traceSemanticPatchApply({
        applier: throwingApplier,
        request: { document, intent, patch, semanticIndex },
        trace: applyTrace
      })
    ).toThrow(secretMessage);
    expect(applyTrace.getEvents().map((event) => event.type)).toEqual([
      'semantic_edit.patch.apply_started',
      'semantic_edit.patch.apply_failed'
    ]);

    const rollbackTrace = createDeterministicTrace('corr_throw_rollback');
    expect(() =>
      traceSemanticPatchRollback({
        applier: throwingApplier,
        request: { document, appliedPatch: patch, rollbackPatch: patch, intent, semanticIndex },
        trace: rollbackTrace
      })
    ).toThrow(secretMessage);
    expect(rollbackTrace.getEvents().map((event) => event.type)).toEqual([
      'semantic_edit.rollback.started',
      'semantic_edit.rollback.failed'
    ]);

    for (const trace of [planTrace, validationTrace, applyTrace, rollbackTrace]) {
      expect(JSON.stringify(trace.getEvents())).not.toContain(secretMessage);
    }
  });

  it('traces successful rollback without emitting the result document', () => {
    const { document, intent, patch, semanticIndex } = createPlannedPatch();
    const applier = createSemanticPatchApplier(createApplierOptions());
    const applyResult = applier.apply({ document, intent, patch, semanticIndex });
    expect(applyResult.ok).toBe(true);
    if (!applyResult.ok) {
      throw new Error(`expected apply success, got ${applyResult.error.code}`);
    }
    const trace = createDeterministicTrace('corr_rollback_success');
    const rollbackResult = traceSemanticPatchRollback({
      applier,
      request: {
        document: applyResult.document,
        appliedPatch: applyResult.appliedPatch,
        rollbackPatch: applyResult.rollbackPatch,
        intent,
        semanticIndex
      },
      trace
    });

    expect(rollbackResult.ok).toBe(true);
    if (!rollbackResult.ok) {
      throw new Error(`expected rollback success, got ${rollbackResult.error.code}`);
    }
    expect(trace.getEvents().map((event) => event.type)).toEqual([
      'semantic_edit.rollback.started',
      'semantic_edit.rollback.completed'
    ]);
    expect(trace.getEvents()[1].payload).toMatchObject({
      rollback: {
        beforeHash: rollbackResult.beforeHash,
        afterHash: rollbackResult.afterHash
      }
    });
    expect(JSON.stringify(trace.getEvents()[1].payload)).not.toContain('"document"');
  });

  it('traces rollback failure with the stable rollback error code', () => {
    const { document, intent, patch, semanticIndex } = createPlannedPatch();
    const applier = createSemanticPatchApplier(createApplierOptions());
    const applyResult = applier.apply({ document, intent, patch, semanticIndex });
    expect(applyResult.ok).toBe(true);
    if (!applyResult.ok) {
      throw new Error(`expected apply success, got ${applyResult.error.code}`);
    }
    const tamperedDocument = structuredClone(applyResult.document);
    (tamperedDocument as { scenes: { main: { background: { visible: boolean } } } }).scenes.main.background.visible = false;
    const trace = createDeterministicTrace('corr_rollback_failure');
    const rollbackResult = traceSemanticPatchRollback({
      applier,
      request: {
        document: tamperedDocument,
        appliedPatch: applyResult.appliedPatch,
        rollbackPatch: applyResult.rollbackPatch,
        intent,
        semanticIndex
      },
      trace
    });

    expect(rollbackResult.ok).toBe(false);
    expect(trace.getEvents().map((event) => event.type)).toEqual([
      'semantic_edit.rollback.started',
      'semantic_edit.rollback.failed'
    ]);
    expect(trace.getEvents()[1].payload).toMatchObject({ rollback: { ok: false, errorCode: 'ROLLBACK_DOCUMENT_HASH_MISMATCH' } });
  });

  it('traces the full in-memory fix_blank_preview lifecycle with redacted payloads', () => {
    const document = createDocument();
    const intent = createFixBlankPreviewIntent();
    const semanticIndex = createTestSemanticIndex();
    const trace = createDeterministicTrace('corr_full_lifecycle');
    const planner = createSemanticPatchPlanner(createFixBlankPreviewRepairHandlers({ document, scenePath: '/scenes/main' }));
    const validator = createSemanticPatchValidator();
    const applier = createSemanticPatchApplier(createApplierOptions());

    const planResult = traceSemanticPatchPlan({ planner, request: createPlanRequest(document, intent, semanticIndex), trace });
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
    const rollbackResult = traceSemanticPatchRollback({
      applier,
      request: {
        document: applyResult.document,
        appliedPatch: applyResult.appliedPatch,
        rollbackPatch: applyResult.rollbackPatch,
        intent,
        semanticIndex
      },
      trace
    });
    expect(rollbackResult.ok).toBe(true);

    const events = trace.getEvents();
    expect(events.map((event) => event.type)).toEqual([
      'semantic_edit.intent.created',
      'semantic_edit.intent.resolved',
      'semantic_edit.patch.proposed',
      'semantic_edit.patch.validation_started',
      'semantic_edit.patch.validated',
      'semantic_edit.patch.apply_started',
      'semantic_edit.patch.applied',
      'semantic_edit.rollback.started',
      'semantic_edit.rollback.completed'
    ]);
    expect(events.every((event) => event.correlationId === 'corr_full_lifecycle')).toBe(true);
    expect(events.every((event) => SemanticEditingTraceEventSchema.safeParse(event).success)).toBe(true);
    expect(events.some((event) => JSON.stringify(event.payload).includes('"value"'))).toBe(false);
    expect(events.some((event) => Object.prototype.hasOwnProperty.call(event.payload, 'document'))).toBe(false);
  });

  it('does not mutate wrapper inputs', () => {
    const document = createDocument();
    const intent = createFixBlankPreviewIntent();
    const semanticIndex = createTestSemanticIndex();
    const documentBefore = structuredClone(document);
    const intentBefore = structuredClone(intent);
    const entryBefore = structuredClone(semanticIndex.resolve('scene:main'));
    const planner = createSemanticPatchPlanner(createFixBlankPreviewRepairHandlers({ document, scenePath: '/scenes/main' }));
    const planResult = traceSemanticPatchPlan({
      planner,
      request: createPlanRequest(document, intent, semanticIndex),
      trace: createDeterministicTrace('corr_mutation_plan')
    });
    expect(planResult.ok).toBe(true);
    if (!planResult.ok) {
      throw new Error(`expected plan success, got ${planResult.error.code}`);
    }
    const patch = planResult.patch;
    const patchBefore = structuredClone(patch);

    traceSemanticPatchValidation({
      validator: createSemanticPatchValidator(),
      request: { intent, patch, semanticIndex },
      trace: createDeterministicTrace('corr_mutation_validation')
    });
    traceSemanticPatchApply({
      applier: createSemanticPatchApplier(createApplierOptions()),
      request: { document, intent, patch, semanticIndex },
      trace: createDeterministicTrace('corr_mutation_apply')
    });

    expect(document).toEqual(documentBefore);
    expect(intent).toEqual(intentBefore);
    expect(patch).toEqual(patchBefore);
    expect(semanticIndex.resolve('scene:main')).toEqual(entryBefore);
  });
});

function createDeterministicTrace(correlationId?: string, sink?: SemanticEditingTraceSink) {
  return createSemanticEditingTraceRecorder({
    correlationId,
    now: () => new Date('2026-01-01T00:00:00.000Z'),
    createEventId: (type, sequence) => `trace_${sequence}_${type}`,
    sink
  });
}

function createDocument() {
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

function createPlannedPatch(options: { operations?: SemanticPatchOperation[]; patchOverrides?: Partial<SemanticPatch> } = {}) {
  const document = createDocument();
  const intent = createFixBlankPreviewIntent();
  const semanticIndex = createTestSemanticIndex();
  const planResult = createSemanticPatchPlanner(createFixBlankPreviewRepairHandlers({ document, scenePath: '/scenes/main' })).plan(
    createPlanRequest(document, intent, semanticIndex)
  );
  if (!planResult.ok) {
    throw new Error(`expected plan success, got ${planResult.error.code}`);
  }

  const patch: SemanticPatch = {
    ...planResult.patch,
    operations: options.operations ?? planResult.patch.operations,
    ...options.patchOverrides
  };

  return { document, intent, semanticIndex, patch };
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
