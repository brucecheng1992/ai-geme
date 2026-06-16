import { describe, expect, it } from 'vitest';

import {
  parseLiveSemanticEditText,
  runLiveSemanticEdit,
  type SemanticIndex,
  type SemanticIndexEntry,
  type SemanticPatchValidator
} from '../../packages/game-dsl/src/index.js';

describe('Natural-language live semantic editing', () => {
  it('parses fix blank preview commands', () => {
    const result = parseLiveSemanticEditText('fix blank preview');

    expect(result).toMatchObject({
      ok: true,
      command: {
        kind: 'fix_blank_preview',
        target: 'scene:main'
      }
    });
  });

  it('parses move player commands', () => {
    const result = parseLiveSemanticEditText('move player to 160, 320');

    expect(result).toMatchObject({
      ok: true,
      command: {
        kind: 'move_entity',
        entityId: 'entity:player',
        x: 160,
        y: 320
      }
    });
  });

  it('parses Chinese move commands', () => {
    const result = parseLiveSemanticEditText('把玩家移动到 160, 320');

    expect(result).toMatchObject({
      ok: true,
      command: {
        kind: 'move_entity',
        entityId: 'entity:player',
        x: 160,
        y: 320
      }
    });
  });

  it('does not silently map unsupported move targets to player', () => {
    const result = parseLiveSemanticEditText('move enemy to 160, 320');

    expect(result).toMatchObject({
      ok: false,
      reason: 'ambiguous_command'
    });
  });

  it('parses camera follow commands', () => {
    const result = parseLiveSemanticEditText('set camera to follow player');

    expect(result).toMatchObject({
      ok: true,
      command: {
        kind: 'adjust_camera',
        entityId: 'entity:player'
      }
    });
  });

  it('parses bind asset commands', () => {
    const result = parseLiveSemanticEditText('bind player sprite to asset:player_sprite');

    expect(result).toMatchObject({
      ok: true,
      command: {
        kind: 'bind_asset',
        entityId: 'entity:player',
        assetId: 'asset:player_sprite'
      }
    });
  });

  it('keeps default scene target on bind asset commands', () => {
    const result = parseLiveSemanticEditText('bind player sprite to asset:player_sprite', {
      defaultSceneTarget: 'scene:level_2'
    });

    expect(result).toMatchObject({
      ok: true,
      command: {
        kind: 'bind_asset',
        sceneTarget: 'scene:level_2',
        assetId: 'asset:player_sprite'
      }
    });
  });

  it('rejects unsafe asset file paths', () => {
    const result = parseLiveSemanticEditText('bind player sprite to ./assets/player.png');

    expect(result).toMatchObject({
      ok: false,
      reason: 'unsafe_target'
    });
  });

  it('applies move entity patches in memory without mutating the input document', () => {
    const document = createDocument();
    const before = structuredClone(document);
    const result = runLiveSemanticEdit({
      text: 'move player to 160, 320',
      document,
      semanticIndex: createSemanticIndexForDocument(document),
      ...createDeterministicOptions()
    });

    expect(result.ok).toBe(true);
    expect(result.stage).toBe('applied');
    if (!result.ok || result.stage !== 'applied') {
      throw new Error('expected applied result');
    }
    if (result.intent === undefined) {
      throw new Error('expected live edit intent');
    }

    expect(result.intent.kind).toBe('move_entity');
    expect(result.validation?.ok).toBe(true);
    expect(result.apply?.ok).toBe(true);
    expect(asDocument(result.document).scenes.main.entities.player.components.transform).toMatchObject({
      x: 160,
      y: 320
    });
    expect(document).toEqual(before);
    expect(result.diff?.operations.map((operation) => operation.path)).toContain(
      '/scenes/main/entities/player/components/transform'
    );
  });

  it('applies fix blank preview through the repair pack', () => {
    const document = createBlankPreviewDocument();
    const result = runLiveSemanticEdit({
      text: 'fix blank preview',
      document,
      semanticIndex: createSemanticIndexForDocument(document),
      ...createDeterministicOptions()
    });

    expect(result.ok).toBe(true);
    expect(result.stage).toBe('applied');
    if (!result.ok || result.stage !== 'applied') {
      throw new Error('expected applied result');
    }

    const edited = asDocument(result.document);
    expect(edited.scenes.main.background?.visible).toBe(true);
    expect(edited.scenes.main.camera).toMatchObject({
      id: 'camera:main',
      follow: 'entity:player'
    });
    expect(edited.scenes.main.entities.debug_visible_marker).toBeDefined();
    expect(edited.assets?.fallbacks?.missing_sprite).toMatchObject({
      type: 'generated_shape'
    });
  });

  it('updates sprite asset bindings and leaves Resolver V2 ready when the asset exists', () => {
    const document = createDocument({
      assets: {
        sprites: {
          player_sprite: {
            id: 'asset:player_sprite',
            type: 'image',
            source: './assets/player.png'
          }
        }
      }
    });
    const result = runLiveSemanticEdit({
      text: 'bind player sprite to asset:player_sprite',
      document,
      semanticIndex: createSemanticIndexForDocument(document),
      ...createDeterministicOptions()
    });

    expect(result.ok).toBe(true);
    expect(result.stage).toBe('applied');
    if (!result.ok || result.stage !== 'applied') {
      throw new Error('expected applied result');
    }

    expect(asDocument(result.document).scenes.main.entities.player.components.sprite?.asset).toBe('asset:player_sprite');
    expect(result.resolver?.references).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'sprite_asset',
        targetId: 'asset:player_sprite',
        status: 'resolved'
      })
    ]));
    expect(result.irGate?.status).toBe('ready');
  });

  it('stops before apply when validation fails', () => {
    const document = createDocument();
    const before = structuredClone(document);
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

    const result = runLiveSemanticEdit({
      text: 'move player to 160, 320',
      document,
      semanticIndex: createSemanticIndexForDocument(document),
      validator,
      ...createDeterministicOptions()
    });

    expect(result).toMatchObject({
      ok: false,
      stage: 'validation_failed',
      error: { code: 'LIVE_SEMANTIC_EDIT_VALIDATION_FAILED' }
    });
    expect(result.apply).toBeUndefined();
    expect(document).toEqual(before);
  });

  it('returns structured resolver_blocked failures after successful apply', () => {
    const document = createDocument();
    const result = runLiveSemanticEdit({
      text: 'bind player sprite to asset:missing_sprite',
      document,
      semanticIndex: createSemanticIndexForDocument(document),
      ...createDeterministicOptions()
    });

    expect(result).toMatchObject({
      ok: false,
      stage: 'resolver_blocked',
      error: { code: 'LIVE_SEMANTIC_EDIT_RESOLVER_BLOCKED' }
    });
    expect(result.apply?.ok).toBe(true);
    expect(result.document).toBeDefined();
    expect(result.diff).toBeDefined();
    expect(result.diagnostics).toBeDefined();
    expect(result.irGate?.status).toBe('blocked');
  });

  it('uses deterministic ids and event timestamps', () => {
    const result = runLiveSemanticEdit({
      text: 'move player to 160, 320',
      document: createDocument(),
      semanticIndex: createSemanticIndexForDocument(createDocument()),
      ...createDeterministicOptions()
    });

    expect(result.ok).toBe(true);
    if (!result.ok || result.stage !== 'applied') {
      throw new Error('expected applied result');
    }
    if (result.intent === undefined || result.plan === undefined || !result.plan.ok || result.apply === undefined || !result.apply.ok) {
      throw new Error('expected deterministic intent, plan, and apply result');
    }

    expect(result.intent.id).toBe('intent:move_entity:0');
    expect(result.plan.patch.id).toBe('patch:move_entity');
    expect(result.apply.rollbackPatch.id).toBe('rollback:patch:move_entity');
    expect(result.traceEvents.every((event) => event.at === '2026-01-01T00:00:00.000Z')).toBe(true);
    expect(result.resolverTraceEvents.every((event) => event.at === '2026-01-01T00:00:00.000Z')).toBe(true);
    expect(result.traceEvents.map((event) => event.id)).toEqual([
      'trace_1_semantic_edit.intent.created',
      'trace_2_semantic_edit.intent.resolved',
      'trace_3_semantic_edit.patch.proposed',
      'trace_4_semantic_edit.patch.validation_started',
      'trace_5_semantic_edit.patch.validated',
      'trace_6_semantic_edit.patch.apply_started',
      'trace_7_semantic_edit.patch.applied'
    ]);
  });

  it('does not mutate input document or SemanticIndex entries', () => {
    const document = createDocument();
    const semanticIndex = createSemanticIndexForDocument(document);
    const before = {
      document: structuredClone(document),
      entry: structuredClone(semanticIndex.resolve('entity:player'))
    };

    runLiveSemanticEdit({
      text: 'move player to 160, 320',
      document,
      semanticIndex,
      ...createDeterministicOptions()
    });

    expect(document).toEqual(before.document);
    expect(semanticIndex.resolve('entity:player')).toEqual(before.entry);
  });

  it('returns unsupported text as a parse_failed no-op', () => {
    const result = runLiveSemanticEdit({
      text: 'make it more fun',
      document: createDocument(),
      semanticIndex: createSemanticIndexForDocument(createDocument()),
      ...createDeterministicOptions()
    });

    expect(result).toMatchObject({
      ok: false,
      stage: 'parse_failed',
      parse: {
        ok: false,
        reason: 'unsupported_command'
      }
    });
    expect(result.plan).toBeUndefined();
    expect(result.apply).toBeUndefined();
  });

  it('keeps trace, diff, and diagnostics view models audit-safe', () => {
    const document = createDocument({
      marker: 'FULL_DOCUMENT_SECRET_MARKER',
      assets: {
        sprites: {
          player_sprite: {
            id: 'asset:player_sprite',
            type: 'image',
            source: './assets/VERY_SECRET_ASSET_SOURCE.png'
          }
        }
      }
    });

    const result = runLiveSemanticEdit({
      text: 'move player to 160, 320 SECRET_TEXT_MARKER',
      document,
      semanticIndex: createSemanticIndexForDocument(document),
      ...createDeterministicOptions()
    });

    expect(result.ok).toBe(true);
    if (!result.ok || result.stage !== 'applied') {
      throw new Error('expected applied result');
    }

    expect(JSON.stringify(result.traceEvents)).not.toContain('FULL_DOCUMENT_SECRET_MARKER');
    expect(JSON.stringify(result.resolverTraceEvents)).not.toContain('VERY_SECRET_ASSET_SOURCE');
    expect(JSON.stringify(result.diff)).not.toContain('FULL_DOCUMENT_SECRET_MARKER');
    expect(JSON.stringify(result.diff)).not.toContain('"value"');
    expect(JSON.stringify(result.diagnostics)).not.toContain('VERY_SECRET_ASSET_SOURCE');
    expect(JSON.stringify(result.diagnostics)).not.toContain('cause');
  });
});

type TestDocument = {
  scenes: {
    main: {
      marker?: string;
      background?: { visible?: boolean };
      camera?: Record<string, unknown>;
      entities: {
        player: {
          id: 'entity:player';
          kind: 'entity';
          components: {
            transform: Record<string, unknown>;
            sprite?: {
              asset?: string;
            };
          };
        };
        debug_visible_marker?: unknown;
      };
    };
  };
  assets?: {
    sprites?: Record<string, { id: string; type: string; source: string }>;
    fallbacks?: Record<string, unknown>;
  };
};

function createDocument(overrides: Partial<TestDocument['scenes']['main']> & { assets?: TestDocument['assets'] } = {}): TestDocument {
  const document: TestDocument = {
    scenes: {
      main: {
        camera: {
          id: 'camera:main',
          x: 0,
          y: 0,
          width: 800,
          height: 600,
          zoom: 1,
          follow: 'entity:player'
        },
        entities: {
          player: {
            id: 'entity:player',
            kind: 'entity',
            components: {
              transform: {
                x: 120,
                y: 300,
                z: 1
              }
            }
          }
        },
      }
    }
  };

  if (overrides.marker !== undefined) {
    document.scenes.main.marker = overrides.marker;
  }
  if (overrides.background !== undefined) {
    document.scenes.main.background = overrides.background;
  }
  if (overrides.assets !== undefined) {
    document.assets = overrides.assets;
  }

  return document;
}

function createBlankPreviewDocument(): TestDocument {
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

function createSemanticIndexForDocument(document: TestDocument): SemanticIndex {
  const entries: SemanticIndexEntry[] = [
    { id: 'scene:main', kind: 'scene', path: '/scenes/main', value: {} },
    { id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: {} }
  ];

  if (document.assets?.sprites?.player_sprite !== undefined) {
    entries.push({ id: 'asset:player_sprite', kind: 'asset', path: '/assets/sprites/player_sprite', value: {} });
  }

  return createSemanticIndex(entries);
}

function createSemanticIndex(entries: SemanticIndexEntry[]): SemanticIndex {
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

function createDeterministicOptions() {
  return {
    now: () => new Date('2026-01-01T00:00:00.000Z'),
    createIntentId: (command: { kind: string }, sequence: number) => `intent:${command.kind}:${sequence}`,
    createPatchId: (intent: { kind: string }) => `patch:${intent.kind}`,
    createRollbackPatchId: (patch: { id: string }) => `rollback:${patch.id}`,
    createTraceEventId: (type: string, sequence: number) => `trace_${sequence}_${type}`,
    createResolverTraceEventId: (type: string, sequence: number) => `resolver_trace_${sequence}_${type}`,
    correlationId: 'corr_live_edit_001'
  };
}

function asDocument(document: unknown): TestDocument {
  return document as TestDocument;
}
