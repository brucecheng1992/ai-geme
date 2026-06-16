import { describe, expect, it } from 'vitest';

import {
  createResolverV2,
  createResolverV2DiagnosticsViewModel,
  createResolverV2IrIntegrationGate,
  createResolverV2TraceRecorder,
  evaluateResolverV2IrIntegrationGate,
  ResolverV2TraceEventSchema,
  traceResolverV2IrGate,
  traceResolverV2Resolve,
  type ResolverV2,
  type ResolverV2Diagnostic,
  type ResolverV2IrGateResult,
  type ResolverV2IrIntegrationGate,
  type ResolverV2Reference,
  type ResolverV2Result,
  type ResolverV2SceneGraph,
  type ResolverV2TraceSink,
  type SemanticIndex,
  type SemanticIndexEntry
} from '../../packages/game-dsl/src/index.js';

describe('Resolver V2 trace and diagnostics', () => {
  it('records deterministic trace ids, timestamps, correlation ids, and event order', () => {
    const trace = createDeterministicResolverTrace('corr_resolver_001');

    trace.emit({ type: 'resolver_v2.resolve.started', severity: 'info', payload: { step: 1 } });
    trace.emit({ type: 'resolver_v2.resolve.completed', severity: 'info', payload: { step: 2 } });

    const events = trace.getEvents();
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.id)).toEqual([
      'resolver_trace_1_resolver_v2.resolve.started',
      'resolver_trace_2_resolver_v2.resolve.completed'
    ]);
    expect(events.every((event) => event.at === '2026-01-01T00:00:00.000Z')).toBe(true);
    expect(events.every((event) => event.correlationId === 'corr_resolver_001')).toBe(true);
    expect(events.map((event) => event.type)).toEqual([
      'resolver_v2.resolve.started',
      'resolver_v2.resolve.completed'
    ]);
    expect(events.every((event) => ResolverV2TraceEventSchema.safeParse(event).success)).toBe(true);
  });

  it('captures sink errors without interrupting recorder emit', () => {
    const trace = createDeterministicResolverTrace('corr_sink', () => {
      throw new Error('sink boom');
    });

    expect(() => trace.emit({ type: 'resolver_v2.resolve.started', severity: 'info', payload: {} })).not.toThrow();
    expect(trace.getEvents()).toHaveLength(1);
    expect(trace.getSinkErrors()).toHaveLength(1);
  });

  it('traces resolver resolve lifecycle without document or raw asset source payloads', () => {
    const document = createReadyDocument({ marker: 'FULL_DOCUMENT_SECRET_MARKER', assetSource: './assets/VERY_SECRET_ASSET_SOURCE.png' });
    const semanticIndex = createReadySemanticIndex();
    const trace = createDeterministicResolverTrace('corr_resolve');

    const result = traceResolverV2Resolve({
      resolver: createResolverV2(),
      request: { document, semanticIndex },
      trace,
      resolverRunId: 'resolver_run_001'
    });

    expect(result.ok).toBe(true);
    expect(trace.getEvents().map((event) => event.type)).toEqual([
      'resolver_v2.resolve.started',
      'resolver_v2.resolve.completed'
    ]);
    const eventJson = JSON.stringify(trace.getEvents());
    expect(eventJson).not.toContain('FULL_DOCUMENT_SECRET_MARKER');
    expect(eventJson).not.toContain('VERY_SECRET_ASSET_SOURCE');
  });

  it('emits diagnostics.reported when resolver resolve returns diagnostics', () => {
    const document = createReadyDocument({ assetId: 'asset:missing_sprite' });
    const semanticIndex = createSemanticIndex([
      { id: 'scene:main', kind: 'scene', path: '/scenes/main', value: {} },
      { id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: {} },
      { id: 'asset:missing_sprite', kind: 'asset', path: '/assets/sprites/missing_sprite', value: {} }
    ]);
    const trace = createDeterministicResolverTrace('corr_diagnostics');

    const result = traceResolverV2Resolve({
      resolver: createResolverV2(),
      request: { document, semanticIndex },
      trace
    });

    expect(result.ok).toBe(false);
    expect(trace.getEvents().map((event) => event.type)).toEqual([
      'resolver_v2.resolve.started',
      'resolver_v2.resolve.completed',
      'resolver_v2.diagnostics.reported'
    ]);
    expect(JSON.stringify(trace.getEvents())).not.toContain('cause');
  });

  it('catches resolver throws and emits resolver failed without throwing', () => {
    const resolver: ResolverV2 = {
      resolve() {
        throw new Error('RESOLVER_THROW_SECRET_MARKER');
      }
    };
    const trace = createDeterministicResolverTrace('corr_resolver_throw');

    expect(() =>
      traceResolverV2Resolve({
        resolver,
        request: { document: {}, semanticIndex: createSemanticIndex() },
        trace
      })
    ).not.toThrow();

    const result = traceResolverV2Resolve({
      resolver,
      request: { document: {}, semanticIndex: createSemanticIndex() },
      trace: createDeterministicResolverTrace('corr_resolver_throw_result')
    });

    expect(result.ok).toBe(false);
    expect(trace.getEvents().map((event) => event.type)).toEqual([
      'resolver_v2.resolve.started',
      'resolver_v2.resolve.failed'
    ]);
    expect(JSON.stringify(trace.getEvents())).not.toContain('RESOLVER_THROW_SECRET_MARKER');
  });

  it('traces IR gate ready lifecycle as started and completed', () => {
    const trace = createDeterministicResolverTrace('corr_gate_ready');
    const result = traceResolverV2IrGate({
      gate: createResolverV2IrIntegrationGate(),
      request: {
        document: createReadyDocument(),
        semanticIndex: createReadySemanticIndex()
      },
      trace,
      gateRunId: 'gate_run_001'
    });

    expect(result.status).toBe('ready');
    expect(trace.getEvents().map((event) => event.type)).toEqual([
      'resolver_v2.ir_gate.started',
      'resolver_v2.ir_gate.completed'
    ]);
  });

  it('traces IR gate blocked lifecycle with blocker summaries only', () => {
    const trace = createDeterministicResolverTrace('corr_gate_blocked');
    const result = traceResolverV2IrGate({
      gate: createResolverV2IrIntegrationGate(),
      request: {},
      trace
    });

    expect(result.status).toBe('blocked');
    expect(trace.getEvents().map((event) => event.type)).toEqual([
      'resolver_v2.ir_gate.started',
      'resolver_v2.ir_gate.blocked'
    ]);
    expect(trace.getEvents()[1].payload).toMatchObject({
      gate: {
        gateStatus: 'blocked',
        blockerCount: 1
      },
      blockers: [expect.objectContaining({ code: 'RESOLVER_V2_GATE_MISSING_INPUT' })]
    });
    expect(JSON.stringify(trace.getEvents()[1].payload)).not.toContain('cause');
  });

  it('catches IR gate throws and returns a blocked gate result', () => {
    const gate: ResolverV2IrIntegrationGate = {
      evaluate() {
        throw new Error('GATE_THROW_SECRET_MARKER');
      }
    };
    const trace = createDeterministicResolverTrace('corr_gate_throw');

    expect(() => traceResolverV2IrGate({ gate, request: {}, trace })).not.toThrow();

    const result = traceResolverV2IrGate({
      gate,
      request: {},
      trace: createDeterministicResolverTrace('corr_gate_throw_result')
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.blockers).toEqual([
      expect.objectContaining({
        code: 'RESOLVER_V2_GATE_EXCEPTION'
      })
    ]);
    expect(trace.getEvents().map((event) => event.type)).toEqual([
      'resolver_v2.ir_gate.started',
      'resolver_v2.ir_gate.blocked'
    ]);
    expect(JSON.stringify(trace.getEvents())).not.toContain('GATE_THROW_SECRET_MARKER');
  });

  it('creates a diagnostics view model from resolver and gate results', () => {
    const document = createReadyDocument();
    const semanticIndex = createReadySemanticIndex();
    const resolverResult = createResolverV2().resolve({ document, semanticIndex });
    const gateResult = evaluateResolverV2IrIntegrationGate({ document, semanticIndex, resolverResult });

    const viewModel = createResolverV2DiagnosticsViewModel({ resolverResult, gateResult });

    expect(viewModel.summary.referenceCount).toBeGreaterThan(0);
    expect(viewModel.references.length).toBeGreaterThan(0);
    expect(viewModel.assets.length).toBeGreaterThan(0);
    expect(viewModel.sceneGraph?.nodeCount).toBeGreaterThan(0);
  });

  it('creates a diagnostics view model from gate blockers', () => {
    const gateResult = evaluateResolverV2IrIntegrationGate({});

    const viewModel = createResolverV2DiagnosticsViewModel({ gateResult });

    expect(viewModel.summary.gateStatus).toBe('blocked');
    expect(viewModel.summary.blockerCount).toBeGreaterThan(0);
    expect(viewModel.blockers).toEqual([
      expect.objectContaining({
        code: 'RESOLVER_V2_GATE_MISSING_INPUT'
      })
    ]);
  });

  it('redacts diagnostic causes and accidental raw asset source fields from the diagnostics view model', () => {
    const resolverResult = createResolverResult({
      diagnostics: [
        {
          severity: 'error',
          code: 'INVALID_RESOLVER_DOCUMENT',
          message: 'Resolver V2 failed safely.',
          cause: new Error('VERY_SECRET_CAUSE')
        }
      ],
      summary: { errorCount: 1 }
    });
    const gateResult = createGateResult({
      resolverResult,
      assets: [
        {
          id: 'asset:player_sprite',
          key: 'player_sprite',
          path: '/assets/sprites/player_sprite',
          kind: 'image',
          sourceKind: 'file',
          source: 'VERY_SECRET_ASSET_SOURCE'
        }
      ]
    });

    const viewModel = createResolverV2DiagnosticsViewModel({ resolverResult, gateResult });
    const viewModelJson = JSON.stringify(viewModel);

    expect(viewModelJson).not.toContain('VERY_SECRET_CAUSE');
    expect(viewModelJson).not.toContain('cause');
    expect(viewModelJson).not.toContain('VERY_SECRET_ASSET_SOURCE');
  });

  it('handles invalid unknown diagnostics view model input without throwing', () => {
    expect(() =>
      createResolverV2DiagnosticsViewModel({
        resolverResult: { bad: true },
        gateResult: { bad: true },
        traceEvents: [{ bad: true }]
      })
    ).not.toThrow();

    const viewModel = createResolverV2DiagnosticsViewModel({
      resolverResult: { bad: true },
      gateResult: { bad: true },
      traceEvents: [{ bad: true }]
    });

    expect(viewModel.warnings.length).toBeGreaterThan(0);
    expect(viewModel.summary.referenceCount).toBe(0);
    expect(viewModel.summary.blockerCount).toBe(0);
  });

  it('handles partially malformed diagnostics view model rows without throwing', () => {
    const input = {
      resolverResult: {
        ok: false,
        references: [null],
        diagnostics: [null],
        summary: {},
        sceneGraph: {}
      },
      gateResult: {
        ok: false,
        status: 'blocked',
        blockers: [null],
        warnings: [],
        summary: {
          sceneGraph: {}
        }
      },
      traceEvents: [{ bad: true }]
    };

    expect(() => createResolverV2DiagnosticsViewModel(input)).not.toThrow();

    const viewModel = createResolverV2DiagnosticsViewModel(input);
    expect(viewModel.warnings.length).toBeGreaterThan(0);
    expect(viewModel.references).toEqual([]);
    expect(viewModel.diagnostics).toEqual([]);
    expect(viewModel.blockers).toEqual([]);
    expect(viewModel.sceneGraph).toBeUndefined();
  });

  it('skips malformed diagnostics view model scene graph nodes without throwing', () => {
    const input = {
      resolverResult: {
        ok: false,
        references: [],
        diagnostics: [],
        summary: {},
        sceneGraph: { nodes: [null], edges: [] }
      },
      gateResult: {
        ok: false,
        status: 'blocked',
        blockers: [],
        warnings: [],
        summary: {
          sceneGraph: {
            nodeCount: 1,
            edgeCount: 0,
            nodes: [null],
            edges: []
          }
        }
      }
    };

    expect(() => createResolverV2DiagnosticsViewModel(input)).not.toThrow();

    const viewModel = createResolverV2DiagnosticsViewModel(input);
    expect(viewModel.sceneGraph).toMatchObject({
      nodeCount: 0,
      edgeCount: 0,
      scenes: [],
      entities: [],
      cameras: [],
      spawns: []
    });
    expect(viewModel.summary.referenceCount).toBe(0);
    expect(viewModel.summary.diagnosticErrorCount).toBe(0);
  });

  it('does not mutate diagnostics view model inputs', () => {
    const resolverResult = createResolverResult({
      references: [
        createReference({
          id: 'resolver_ref:sprite_asset:0',
          targetId: 'asset:player_sprite',
          status: 'resolved'
        })
      ]
    });
    const gateResult = createGateResult({ resolverResult });
    const traceEvents = createDeterministicResolverTrace('corr_mutation').getEvents();
    const before = {
      resolverResult: structuredClone(resolverResult),
      gateResult: structuredClone(gateResult),
      traceEvents: structuredClone(traceEvents)
    };

    createResolverV2DiagnosticsViewModel({ resolverResult, gateResult, traceEvents });

    expect(resolverResult).toEqual(before.resolverResult);
    expect(gateResult).toEqual(before.gateResult);
    expect(traceEvents).toEqual(before.traceEvents);
  });

  it('covers the full resolver trace, gate trace, and diagnostics view model lifecycle', () => {
    const document = createReadyDocument({ marker: 'FULL_DOCUMENT_SECRET_MARKER', assetSource: './assets/VERY_SECRET_ASSET_SOURCE.png' });
    const semanticIndex = createReadySemanticIndex();
    const trace = createDeterministicResolverTrace('corr_full_lifecycle');
    const resolverResult = traceResolverV2Resolve({
      resolver: createResolverV2(),
      request: { document, semanticIndex },
      trace,
      resolverRunId: 'resolver_run_full'
    });
    const gateResult = traceResolverV2IrGate({
      gate: createResolverV2IrIntegrationGate(),
      request: { document, semanticIndex, resolverResult },
      trace,
      gateRunId: 'gate_run_full'
    });

    const viewModel = createResolverV2DiagnosticsViewModel({
      resolverResult,
      gateResult,
      traceEvents: trace.getEvents()
    });

    expect(trace.getEvents().map((event) => event.type)).toEqual([
      'resolver_v2.resolve.started',
      'resolver_v2.resolve.completed',
      'resolver_v2.ir_gate.started',
      'resolver_v2.ir_gate.completed'
    ]);
    expect(viewModel.traceEvents.map((event) => event.type)).toEqual(trace.getEvents().map((event) => event.type));
    const viewModelJson = JSON.stringify(viewModel);
    expect(viewModelJson).not.toContain('FULL_DOCUMENT_SECRET_MARKER');
    expect(viewModelJson).not.toContain('VERY_SECRET_ASSET_SOURCE');
    expect(viewModelJson).not.toContain('cause');
  });
});

function createDeterministicResolverTrace(correlationId?: string, sink?: ResolverV2TraceSink) {
  return createResolverV2TraceRecorder({
    correlationId,
    now: () => new Date('2026-01-01T00:00:00.000Z'),
    createEventId: (type, sequence) => `resolver_trace_${sequence}_${type}`,
    sink
  });
}

function createReadyDocument(options: { marker?: string; assetId?: string; assetSource?: string } = {}) {
  const assetId = options.assetId ?? 'asset:player_sprite';
  return {
    scenes: {
      main: {
        marker: options.marker,
        camera: {
          follow: 'entity:player'
        },
        entities: {
          player: {
            id: 'entity:player',
            components: {
              sprite: {
                asset: assetId
              }
            }
          }
        }
      }
    },
    assets: {
      sprites: {
        player_sprite: {
          id: 'asset:player_sprite',
          type: 'image',
          source: options.assetSource ?? './assets/player.png'
        }
      }
    }
  };
}

function createReadySemanticIndex(): SemanticIndex {
  return createSemanticIndex([
    { id: 'scene:main', kind: 'scene', path: '/scenes/main', value: {} },
    { id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: {} },
    { id: 'asset:player_sprite', kind: 'asset', path: '/assets/sprites/player_sprite', value: {} }
  ]);
}

function createResolverResult(
  options: {
    diagnostics?: ResolverV2Diagnostic[];
    references?: ResolverV2Reference[];
    sceneGraph?: ResolverV2SceneGraph;
    summary?: Partial<ResolverV2Result['summary']>;
  } = {}
): ResolverV2Result {
  const references = options.references ?? [];
  const diagnostics = options.diagnostics ?? [];
  const sceneGraph = options.sceneGraph ?? createSceneGraph();

  return {
    ok: diagnostics.every((diagnostic) => diagnostic.severity !== 'error') && references.every((reference) => reference.status === 'resolved'),
    references,
    diagnostics,
    summary: {
      referenceCount: references.length,
      resolvedCount: references.filter((reference) => reference.status === 'resolved').length,
      unresolvedCount: references.filter((reference) => reference.status === 'unresolved').length,
      errorCount: diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length,
      warningCount: diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length,
      sceneCount: sceneGraph.nodes.filter((node) => node.kind === 'scene').length,
      entityCount: sceneGraph.nodes.filter((node) => node.kind === 'entity').length,
      sceneGraphNodeCount: sceneGraph.nodes.length,
      sceneGraphEdgeCount: sceneGraph.edges.length,
      ...options.summary
    },
    sceneGraph
  };
}

function createGateResult(options: { resolverResult: ResolverV2Result; assets?: unknown[] }): ResolverV2IrGateResult {
  return {
    ok: true,
    status: 'ready',
    blockers: [],
    warnings: [],
    resolverResult: options.resolverResult,
    summary: {
      status: 'ready',
      referenceCount: options.resolverResult.summary.referenceCount,
      resolvedReferenceCount: options.resolverResult.summary.resolvedCount,
      unresolvedReferenceCount: options.resolverResult.summary.unresolvedCount,
      errorCount: options.resolverResult.summary.errorCount,
      warningCount: options.resolverResult.summary.warningCount,
      references: [],
      diagnostics: [],
      assets: options.assets as never,
      sceneGraph: {
        sceneCount: 1,
        entityCount: 1,
        cameraCount: 0,
        spawnCount: 0,
        nodeCount: 2,
        edgeCount: 1,
        nodes: [
          { id: 'scene_node:scene:main', kind: 'scene', semanticId: 'scene:main', path: '/scenes/main', sceneId: 'scene:main' },
          {
            id: 'entity_node:main:entity:player',
            kind: 'entity',
            semanticId: 'entity:player',
            path: '/scenes/main/entities/player',
            sceneId: 'scene:main',
            visible: true
          }
        ],
        edges: [
          {
            id: 'scene_edge:scene_contains_entity:0',
            kind: 'scene_contains_entity',
            from: 'scene_node:scene:main',
            to: 'entity_node:main:entity:player',
            path: '/scenes/main/entities/player'
          }
        ]
      }
    }
  };
}

function createReference(options: { id: string; targetId: string; status: 'resolved' | 'unresolved' }): ResolverV2Reference {
  return {
    id: options.id,
    kind: 'sprite_asset',
    sourcePath: '/scenes/main/entities/player',
    fieldPath: '/scenes/main/entities/player/components/sprite/asset',
    targetId: options.targetId,
    expectedTargetKind: 'asset',
    status: options.status,
    ...(options.status === 'resolved'
      ? {
          resolvedTarget: {
            id: options.targetId,
            kind: 'asset',
            path: '/assets/sprites/player_sprite'
          }
        }
      : {})
  };
}

function createSceneGraph(): ResolverV2SceneGraph {
  return {
    nodes: [
      {
        id: 'scene_node:scene:main',
        kind: 'scene',
        semanticId: 'scene:main',
        path: '/scenes/main',
        sceneId: 'scene:main'
      },
      {
        id: 'entity_node:main:entity:player',
        kind: 'entity',
        semanticId: 'entity:player',
        path: '/scenes/main/entities/player',
        sceneId: 'scene:main',
        visible: true
      }
    ],
    edges: [
      {
        id: 'scene_edge:scene_contains_entity:0',
        kind: 'scene_contains_entity',
        from: 'scene_node:scene:main',
        to: 'entity_node:main:entity:player',
        path: '/scenes/main/entities/player'
      }
    ]
  };
}

function createSemanticIndex(entries: SemanticIndexEntry[] = []): SemanticIndex {
  const entryMap = new Map(entries.map((entry) => [entry.id, entry]));
  return {
    resolve(id) {
      return entryMap.get(id) ?? null;
    },
    has(id) {
      return entryMap.has(id);
    },
    list(kind) {
      const values = [...entryMap.values()];
      return kind === undefined ? values : values.filter((entry) => entry.kind === kind);
    }
  };
}
