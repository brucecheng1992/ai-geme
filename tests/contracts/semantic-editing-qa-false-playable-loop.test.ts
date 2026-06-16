import { describe, expect, it } from 'vitest';

import {
  createSemanticPatchApplier,
  detectSemanticFalsePlayableFindings,
  runSemanticFalsePlayableRepairLoop,
  SemanticEditingTraceEventSchema,
  type SemanticEditIntent,
  type SemanticIndex,
  type SemanticIndexEntry,
  type SemanticPatch,
  type SemanticPatchApplier,
  type SemanticPatchValidator
} from '../../packages/game-dsl/src/index.js';

describe('Semantic editing QA FALSE_PLAYABLE loop', () => {
  it('detects explicit FALSE_PLAYABLE findings', () => {
    const detection = detectSemanticFalsePlayableFindings({
      id: 'qa_001',
      status: 'PLAYABLE',
      findings: [
        {
          id: 'finding_001',
          code: 'FALSE_PLAYABLE',
          message: 'Preview is marked playable but visual output is blank.',
          sceneId: 'main'
        }
      ]
    });

    expect(detection.detected).toBe(true);
    expect(detection.findings).toHaveLength(1);
    expect(detection.findings[0]).toMatchObject({
      id: 'false_playable:0',
      code: 'FALSE_PLAYABLE',
      sceneTarget: 'scene:main',
      source: {
        hasReportId: true,
        hasFindingId: true,
        status: 'PLAYABLE',
        evidenceCodes: expect.arrayContaining(['FALSE_PLAYABLE'])
      }
    });
  });

  it.each(['NOT_FALSE_PLAYABLE', 'PREVIEW_NOT_BLANK_CANVAS', 'FALSE_PLAYABLE_RESOLVED'])(
    'does not detect negative explicit code %s',
    (code) => {
      const detection = detectSemanticFalsePlayableFindings({
        id: 'qa_negative',
        status: 'PLAYABLE',
        findings: [
          {
            id: 'finding_negative',
            code,
            sceneId: 'main'
          }
        ]
      });

      expect(detection.detected).toBe(false);
      expect(detection.findings).toEqual([]);
    }
  );

  it('detects PLAYABLE reports with blank visual evidence', () => {
    const detection = detectSemanticFalsePlayableFindings({
      id: 'qa_002',
      previewStatus: 'PLAYABLE',
      visual: {
        blank: true
      },
      sceneId: 'main'
    });

    expect(detection.detected).toBe(true);
    expect(detection.findings[0]).toMatchObject({
      sceneTarget: 'scene:main',
      source: {
        previewStatus: 'PLAYABLE',
        evidenceCodes: expect.arrayContaining(['visual.blank'])
      }
    });
  });

  it('does not trigger on non-playable blank reports without explicit findings', () => {
    const detection = detectSemanticFalsePlayableFindings({
      id: 'qa_003',
      status: 'FAILED',
      visual: {
        blank: true
      }
    });

    expect(detection.detected).toBe(false);
    expect(detection.findings).toEqual([]);
  });

  it.each([null, undefined, 'bad', { foo: 'bar' }])('does not throw for malformed report: %s', (qaReport) => {
    expect(() => detectSemanticFalsePlayableFindings(qaReport)).not.toThrow();
    const detection = detectSemanticFalsePlayableFindings(qaReport);
    expect(detection.detected).toBe(false);
  });

  it('returns not_detected without planning or applying when no false-playable finding exists', () => {
    const result = runSemanticFalsePlayableRepairLoop({
      qaReport: { id: 'qa_noop', status: 'PASSED', visual: { blank: false } },
      document: createDocument(),
      semanticIndex: createTestSemanticIndex(),
      ...createDeterministicOptions()
    });

    expect(result).toMatchObject({
      ok: true,
      stage: 'not_detected',
      reason: 'NO_FALSE_PLAYABLE_FINDING'
    });
    const eventTypes = result.traceEvents.map((event) => event.type);
    expect(eventTypes).toContain('semantic_edit.qa.false_playable.not_detected');
    expect(eventTypes).not.toContain('semantic_edit.patch.proposed');
    expect(eventTypes).not.toContain('semantic_edit.patch.applied');
  });

  it('repairs a false-playable document in memory', () => {
    const result = runSuccessfulLoop();

    expect(result.ok).toBe(true);
    expect(result.stage).toBe('repaired');
    if (!result.ok || result.stage !== 'repaired') {
      throw new Error('expected repaired result');
    }

    expect(result.intent.kind).toBe('fix_blank_preview');
    expect(result.intent.reason.source).toBe('qa');
    expect(result.plan.ok).toBe(true);
    expect(result.validation.ok).toBe(true);
    expect(result.apply.ok).toBe(true);
    const repaired = result.apply.document as RepairDocument;
    expect(repaired.scenes.main.background?.visible).toBe(true);
    expect(repaired.scenes.main.camera?.width).toBe(800);
    expect(repaired.scenes.main.entities.debug_visible_marker).toBeDefined();
    expect(repaired.assets?.fallbacks?.missing_sprite).toBeDefined();
  });

  it('returns a safe patch diff view model with the repair result', () => {
    const result = runSuccessfulLoop();
    if (!result.ok || result.stage !== 'repaired') {
      throw new Error('expected repaired result');
    }

    expect(result.diff.patch.operationCount).toBeGreaterThan(0);
    expect(result.diff.operations.map((operation) => operation.path)).toEqual(
      expect.arrayContaining([
        '/scenes/main/background',
        '/scenes/main/camera',
        '/scenes/main/entities/debug_visible_marker'
      ])
    );
    expect(Object.prototype.hasOwnProperty.call(result.diff, 'document')).toBe(false);
    expect(result.diff.operations.every((operation) => typeof operation.before.preview === 'string' && typeof operation.after.preview === 'string')).toBe(true);
    expect(JSON.stringify(result.diff)).not.toContain('"operation.value"');
  });

  it('emits the expected trace lifecycle without payload bodies', () => {
    const result = runSuccessfulLoop();
    if (!result.ok || result.stage !== 'repaired') {
      throw new Error('expected repaired result');
    }

    expect(result.traceEvents.map((event) => event.type)).toEqual([
      'semantic_edit.qa.false_playable.detected',
      'semantic_edit.intent.created',
      'semantic_edit.intent.resolved',
      'semantic_edit.patch.proposed',
      'semantic_edit.patch.validation_started',
      'semantic_edit.patch.validated',
      'semantic_edit.patch.apply_started',
      'semantic_edit.patch.applied',
      'semantic_edit.qa.false_playable.repair_completed'
    ]);
    expect(result.traceEvents.every((event) => event.correlationId === 'corr_false_playable_001')).toBe(true);
    expect(result.traceEvents.every((event) => SemanticEditingTraceEventSchema.safeParse(event).success)).toBe(true);
    expect(JSON.stringify(result.traceEvents)).not.toContain('"document"');
    expect(JSON.stringify(result.traceEvents)).not.toContain('"value"');
    expect(JSON.stringify(result.traceEvents)).not.toContain('data:image/png;base64');
  });

  it('uses deterministic id and time injection', () => {
    const result = runSuccessfulLoop();
    if (!result.ok || result.stage !== 'repaired') {
      throw new Error('expected repaired result');
    }

    expect(result.intent.id).toBe('semantic_edit:false_playable:test_001');
    expect(result.plan.patch.id).toBe('semantic_patch:false_playable:test_001');
    expect(result.apply.rollbackPatch.id).toBe('semantic_rollback:false_playable:test_001');
    expect(result.traceEvents.every((event) => event.at === '2026-01-01T00:00:00.000Z')).toBe(true);
    expect(result.traceEvents.map((event) => event.id)).toEqual([
      'trace_1_semantic_edit.qa.false_playable.detected',
      'trace_2_semantic_edit.intent.created',
      'trace_3_semantic_edit.intent.resolved',
      'trace_4_semantic_edit.patch.proposed',
      'trace_5_semantic_edit.patch.validation_started',
      'trace_6_semantic_edit.patch.validated',
      'trace_7_semantic_edit.patch.apply_started',
      'trace_8_semantic_edit.patch.applied',
      'trace_9_semantic_edit.qa.false_playable.repair_completed'
    ]);
  });

  it('returns plan_failed when the semantic scene target is missing', () => {
    const result = runSemanticFalsePlayableRepairLoop({
      qaReport: createFalsePlayableReport({ sceneTarget: 'scene:missing' }),
      document: createDocument(),
      semanticIndex: createTestSemanticIndex({ includeMissingScene: false }),
      ...createDeterministicOptions()
    });

    expect(result).toMatchObject({
      ok: false,
      stage: 'plan_failed',
      error: { code: 'FALSE_PLAYABLE_PLAN_FAILED' }
    });
    expect(result.traceEvents.map((event) => event.type)).toEqual([
      'semantic_edit.qa.false_playable.detected',
      'semantic_edit.intent.created',
      'semantic_edit.intent.rejected',
      'semantic_edit.patch.plan_failed',
      'semantic_edit.qa.false_playable.repair_failed'
    ]);
    expect(result.traceEvents.map((event) => event.type)).not.toContain('semantic_edit.patch.applied');
  });

  it('stops before apply when validation fails', () => {
    const document = createDocument();
    const original = structuredClone(document);
    const validator: SemanticPatchValidator = {
      validate: () => ({
        ok: false,
        errors: [
          {
            severity: 'error',
            code: 'TEST_VALIDATION_FAILED',
            message: 'test validation failure'
          }
        ],
        warnings: []
      })
    };
    const result = runSemanticFalsePlayableRepairLoop({
      qaReport: createFalsePlayableReport(),
      document,
      semanticIndex: createTestSemanticIndex(),
      validator,
      ...createDeterministicOptions()
    });

    expect(result).toMatchObject({
      ok: false,
      stage: 'validation_failed',
      error: { code: 'FALSE_PLAYABLE_VALIDATION_FAILED' }
    });
    expect(result.traceEvents.map((event) => event.type)).toContain('semantic_edit.patch.rejected');
    expect(result.traceEvents.map((event) => event.type)).not.toContain('semantic_edit.patch.applied');
    expect(document).toEqual(original);
  });

  it('returns apply_failed when the applier rejects the patch', () => {
    const document = createDocument();
    const original = structuredClone(document);
    const applier: SemanticPatchApplier = {
      apply: () => ({
        ok: false,
        error: {
          code: 'SEMANTIC_PATCH_OPERATION_FAILED',
          message: 'test apply failure',
          operationIndex: 0
        }
      }),
      rollback: () => {
        throw new Error('not used');
      }
    };
    const result = runSemanticFalsePlayableRepairLoop({
      qaReport: createFalsePlayableReport(),
      document,
      semanticIndex: createTestSemanticIndex(),
      applier,
      ...createDeterministicOptions()
    });

    expect(result).toMatchObject({
      ok: false,
      stage: 'apply_failed',
      error: { code: 'FALSE_PLAYABLE_APPLY_FAILED' }
    });
    expect(result.traceEvents.map((event) => event.type)).toContain('semantic_edit.patch.apply_failed');
    expect(result.traceEvents.map((event) => event.type)).toContain('semantic_edit.qa.false_playable.repair_failed');
    expect(document).toEqual(original);
  });

  it('returns a rollback patch that can restore the original document', () => {
    const document = createDocument();
    const original = structuredClone(document);
    const semanticIndex = createTestSemanticIndex();
    const result = runSemanticFalsePlayableRepairLoop({
      qaReport: createFalsePlayableReport(),
      document,
      semanticIndex,
      ...createDeterministicOptions()
    });
    if (!result.ok || result.stage !== 'repaired') {
      throw new Error('expected repaired result');
    }

    const rollbackResult = createSemanticPatchApplier(createApplierOptions()).rollback({
      document: result.apply.document,
      appliedPatch: result.apply.appliedPatch,
      rollbackPatch: result.apply.rollbackPatch,
      intent: result.intent,
      semanticIndex
    });

    expect(rollbackResult.ok).toBe(true);
    if (!rollbackResult.ok) {
      throw new Error(`expected rollback success, got ${rollbackResult.error.code}`);
    }
    expect(rollbackResult.document).toEqual(original);
    expect(rollbackResult.rolledBackPatch.status).toBe('rolled_back');
  });

  it('does not mutate qaReport, document, or SemanticIndex entries', () => {
    const qaReport = createFalsePlayableReport();
    const document = createDocument();
    const semanticIndex = createTestSemanticIndex();
    const before = {
      qaReport: structuredClone(qaReport),
      document: structuredClone(document),
      sceneEntry: structuredClone(semanticIndex.resolve('scene:main'))
    };

    runSemanticFalsePlayableRepairLoop({
      qaReport,
      document,
      semanticIndex,
      ...createDeterministicOptions()
    });

    expect(qaReport).toEqual(before.qaReport);
    expect(document).toEqual(before.document);
    expect(semanticIndex.resolve('scene:main')).toEqual(before.sceneEntry);
  });

  it('summarizes screenshot and canvas data without retaining raw payloads', () => {
    const result = runSemanticFalsePlayableRepairLoop({
      qaReport: createFalsePlayableReport({
        screenshot: 'data:image/png;base64,VERY_SECRET_SCREENSHOT_DATA',
        canvasSnapshot: {
          pixels: 'VERY_SECRET_CANVAS_DATA'
        }
      }),
      document: createDocument(),
      semanticIndex: createTestSemanticIndex(),
      ...createDeterministicOptions()
    });

    expect(result.ok).toBe(true);
    if (!result.ok || result.stage !== 'repaired') {
      throw new Error('expected repaired result');
    }
    expect(result.finding.source.hasScreenshot).toBe(true);
    expect(result.finding.source.hasCanvasSnapshot).toBe(true);
    expect(JSON.stringify(result.traceEvents)).not.toContain('VERY_SECRET_SCREENSHOT_DATA');
    expect(JSON.stringify(result.traceEvents)).not.toContain('VERY_SECRET_CANVAS_DATA');
    expect(JSON.stringify(result.diff)).not.toContain('VERY_SECRET_SCREENSHOT_DATA');
    expect(JSON.stringify(result.diff)).not.toContain('VERY_SECRET_CANVAS_DATA');
  });

  it('does not retain raw QA ids in generated ids, trace, or diff', () => {
    const rawReportId = `data:image/png;base64,SECRET_REPORT_${'x'.repeat(240)}`;
    const rawFindingId = `SECRET_FINDING_${'y'.repeat(180)}`;
    const result = runSemanticFalsePlayableRepairLoop({
      qaReport: {
        id: rawReportId,
        status: 'PLAYABLE',
        findings: [
          {
            id: rawFindingId,
            code: 'FALSE_PLAYABLE',
            message: 'blank preview',
            sceneId: 'main'
          }
        ]
      },
      document: createDocument(),
      semanticIndex: createTestSemanticIndex(),
      now: () => new Date('2026-01-01T00:00:00.000Z'),
      createTraceEventId: (type: string, sequence: number) => `trace_${sequence}_${type}`,
      correlationId: 'corr_secret_qa_ids'
    });

    expect(result.ok).toBe(true);
    if (!result.ok || result.stage !== 'repaired') {
      throw new Error('expected repaired result');
    }
    expect(result.finding.id).toBe('false_playable:0');
    expect(result.finding.source.hasReportId).toBe(true);
    expect(result.finding.source.hasFindingId).toBe(true);
    expect(JSON.stringify(result)).not.toContain(rawReportId);
    expect(JSON.stringify(result)).not.toContain(rawFindingId);
    expect(result.intent.id.length).toBeLessThanOrEqual(120);
    expect(result.plan.patch.id.length).toBeLessThanOrEqual(120);
  });

  it('rejects unsafe scene targets before planning', () => {
    const detection = detectSemanticFalsePlayableFindings({
      id: 'qa_unsafe',
      status: 'PLAYABLE',
      findings: [
        {
          id: 'finding_unsafe',
          code: 'FALSE_PLAYABLE',
          message: 'blank preview',
          sceneTarget: '/packages/game-runtime/src/generated/phaser/MainScene.ts'
        }
      ]
    });

    expect(detection.detected).toBe(false);
    expect(detection.warnings.length).toBeGreaterThan(0);

    const loop = runSemanticFalsePlayableRepairLoop({
      qaReport: {
        id: 'qa_unsafe',
        status: 'PLAYABLE',
        findings: [
          {
            id: 'finding_unsafe',
            code: 'FALSE_PLAYABLE',
            message: 'blank preview',
            sceneTarget: '/packages/game-runtime/src/generated/phaser/MainScene.ts'
          }
        ]
      },
      document: createDocument(),
      semanticIndex: createTestSemanticIndex(),
      ...createDeterministicOptions()
    });

    expect(loop).toMatchObject({
      ok: true,
      stage: 'not_detected',
      reason: 'NO_FALSE_PLAYABLE_FINDING'
    });
    expect(loop.traceEvents.map((event) => event.type)).not.toContain('semantic_edit.patch.proposed');
  });

  it('repairs only the first detected finding', () => {
    const result = runSemanticFalsePlayableRepairLoop({
      qaReport: {
        id: 'qa_multi',
        status: 'PLAYABLE',
        findings: [
          {
            id: 'finding_main',
            code: 'FALSE_PLAYABLE',
            message: 'main is blank',
            sceneTarget: 'scene:main'
          },
          {
            id: 'finding_level_2',
            code: 'FALSE_PLAYABLE',
            message: 'level 2 is blank',
            sceneTarget: 'scene:level_2'
          }
        ]
      },
      document: createDocument(),
      semanticIndex: createTestSemanticIndex({ includeLevel2: true }),
      ...createDeterministicOptions()
    });

    expect(result.ok).toBe(true);
    if (!result.ok || result.stage !== 'repaired') {
      throw new Error('expected repaired result');
    }
    expect(result.detection.findings).toHaveLength(2);
    expect(result.intent.target).toBe('scene:main');
    expect(result.plan.patch.target).toBe('scene:main');
  });
});

type RepairDocument = {
  scenes: {
    main: {
      background?: { visible?: boolean };
      camera?: { width?: number };
      entities: Record<string, unknown>;
    };
  };
  assets?: {
    fallbacks?: Record<string, unknown>;
  };
};

function runSuccessfulLoop() {
  return runSemanticFalsePlayableRepairLoop({
    qaReport: createFalsePlayableReport(),
    document: createDocument(),
    semanticIndex: createTestSemanticIndex(),
    ...createDeterministicOptions()
  });
}

function createFalsePlayableReport(overrides: Record<string, unknown> = {}) {
  return {
    id: 'qa_false_playable_001',
    status: 'PLAYABLE',
    visual: {
      blank: true
    },
    sceneId: 'main',
    ...overrides
  };
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

function createTestSemanticIndex(options: { includeMissingScene?: boolean; includeLevel2?: boolean } = {}): SemanticIndex {
  const entries = new Map<string, SemanticIndexEntry>([
    ['scene:main', { id: 'scene:main', kind: 'scene', path: '/scenes/main', value: {} }],
    ['entity:player', { id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: {} }]
  ]);

  if (options.includeMissingScene !== false) {
    entries.set('scene:missing', { id: 'scene:missing', kind: 'scene', path: '/scenes/missing', value: {} });
  }
  if (options.includeLevel2 === true) {
    entries.set('scene:level_2', { id: 'scene:level_2', kind: 'scene', path: '/scenes/level_2', value: {} });
  }

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

function createDeterministicOptions() {
  return {
    now: () => new Date('2026-01-01T00:00:00.000Z'),
    createIntentId: () => 'semantic_edit:false_playable:test_001',
    createPatchId: () => 'semantic_patch:false_playable:test_001',
    createRollbackPatchId: () => 'semantic_rollback:false_playable:test_001',
    createTraceEventId: (type: string, sequence: number) => `trace_${sequence}_${type}`,
    correlationId: 'corr_false_playable_001'
  };
}

function createApplierOptions() {
  return {
    now: () => new Date('2026-01-01T00:00:00.000Z'),
    createRollbackPatchId: () => 'semantic_rollback:false_playable:test_001'
  };
}
