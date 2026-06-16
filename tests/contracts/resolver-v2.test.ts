import { describe, expect, it } from 'vitest';

import {
  resolveSemanticDocumentV2,
  createResolverV2,
  type ResolverV2Reference,
  type SemanticIndex,
  type SemanticIndexEntry
} from '../../packages/game-dsl/src/index.js';

describe('Resolver V2 contract', () => {
  it('resolves camera.follow entity reference', () => {
    const result = resolveSemanticDocumentV2({
      document: {
        scenes: {
          main: {
            camera: {
              follow: 'entity:player'
            },
            entities: {
              player: {
                id: 'entity:player',
                kind: 'entity'
              }
            }
          }
        }
      },
      semanticIndex: createSemanticIndex([
        { id: 'scene:main', kind: 'scene', path: '/scenes/main', value: {} },
        { id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: {} }
      ])
    });

    expect(result).toMatchObject({
      ok: true,
      summary: {
        referenceCount: 1,
        resolvedCount: 1,
        unresolvedCount: 0,
        errorCount: 0,
        warningCount: 0
      }
    });
    expect(result.references).toHaveLength(1);
    expect(result.references[0]).toMatchObject({
      id: 'resolver_ref:camera_follow_entity:0',
      kind: 'camera_follow_entity',
      sourceId: 'scene:main',
      sourcePath: '/scenes/main/camera',
      fieldPath: '/scenes/main/camera/follow',
      targetId: 'entity:player',
      expectedTargetKind: 'entity',
      status: 'resolved',
      resolvedTarget: {
        id: 'entity:player',
        kind: 'entity',
        path: '/scenes/main/entities/player'
      }
    });
  });

  it('resolves sprite.asset reference', () => {
    const result = resolveSemanticDocumentV2({
      document: {
        scenes: {
          main: {
            entities: {
              player: {
                id: 'entity:player',
                components: {
                  sprite: {
                    asset: 'asset:player_sprite'
                  }
                }
              }
            }
          }
        },
        assets: {
          player_sprite: {
            id: 'asset:player_sprite'
          }
        }
      },
      semanticIndex: createSemanticIndex([
        { id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: {} },
        { id: 'asset:player_sprite', kind: 'asset', path: '/assets/player_sprite', value: {} }
      ])
    });

    expect(result.ok).toBe(true);
    expect(result.references).toHaveLength(1);
    expect(result.references[0]).toMatchObject({
      id: 'resolver_ref:sprite_asset:0',
      kind: 'sprite_asset',
      sourceId: 'entity:player',
      sourcePath: '/scenes/main/entities/player',
      fieldPath: '/scenes/main/entities/player/components/sprite/asset',
      targetId: 'asset:player_sprite',
      expectedTargetKind: 'asset',
      status: 'resolved',
      resolvedTarget: {
        id: 'asset:player_sprite',
        kind: 'asset',
        path: '/assets/player_sprite'
      }
    });
  });

  it('reports missing reference targets', () => {
    const result = resolveSemanticDocumentV2({
      document: createDocument({
        cameraFollow: 'entity:missing'
      }),
      semanticIndex: createSemanticIndex([{ id: 'scene:main', kind: 'scene', path: '/scenes/main', value: {} }])
    });

    expect(result.ok).toBe(false);
    expect(result.references[0]).toMatchObject({ targetId: 'entity:missing', status: 'unresolved' });
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: 'error',
        code: 'RESOLVER_REFERENCE_TARGET_NOT_FOUND',
        targetId: 'entity:missing',
        expectedTargetKind: 'entity',
        fieldPath: '/scenes/main/camera/follow'
      })
    ]);
    expect(result.summary).toMatchObject({ errorCount: 1, unresolvedCount: 1 });
  });

  it('reports kind mismatch diagnostics', () => {
    const result = resolveSemanticDocumentV2({
      document: createDocument({
        cameraFollow: 'asset:player_sprite'
      }),
      semanticIndex: createSemanticIndex([
        { id: 'asset:player_sprite', kind: 'asset', path: '/assets/player_sprite', value: {} }
      ])
    });

    expect(result.ok).toBe(false);
    expect(result.references[0]).toMatchObject({ targetId: 'asset:player_sprite', status: 'unresolved' });
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: 'error',
        code: 'RESOLVER_REFERENCE_KIND_MISMATCH',
        expectedTargetKind: 'entity',
        actualTargetKind: 'asset',
        targetId: 'asset:player_sprite'
      })
    ]);
  });

  it('rejects unsafe generated code references', () => {
    const result = resolveSemanticDocumentV2({
      document: createDocument({
        spriteAsset: '/packages/game-runtime/src/generated/phaser/MainScene.ts'
      }),
      semanticIndex: createSemanticIndex()
    });

    expect(result.ok).toBe(false);
    expect(result.references[0]).toMatchObject({
      kind: 'sprite_asset',
      targetId: '/packages/game-runtime/src/generated/phaser/MainScene.ts',
      status: 'unresolved'
    });
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: 'error',
        code: 'UNSAFE_RESOLVER_REFERENCE',
        targetId: '/packages/game-runtime/src/generated/phaser/MainScene.ts'
      })
    ]);
  });

  it('rejects asset file paths as semantic asset ids', () => {
    const result = resolveSemanticDocumentV2({
      document: createDocument({
        spriteAsset: './assets/player.png'
      }),
      semanticIndex: createSemanticIndex()
    });

    expect(result.ok).toBe(false);
    expect(result.references[0]).toMatchObject({ targetId: './assets/player.png', status: 'unresolved' });
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: 'error',
        code: 'UNSAFE_RESOLVER_REFERENCE',
        expectedTargetKind: 'asset'
      })
    ]);
  });

  it.each([null, undefined, 'bad', 42])('does not throw for malformed document: %s', (document) => {
    expect(() =>
      resolveSemanticDocumentV2({
        document,
        semanticIndex: createSemanticIndex()
      })
    ).not.toThrow();

    const result = resolveSemanticDocumentV2({
      document,
      semanticIndex: createSemanticIndex()
    });
    expect(result.ok).toBe(false);
    expect(result.references).toEqual([]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: 'error',
        code: 'INVALID_RESOLVER_DOCUMENT'
      })
    ]);
  });

  it('returns an empty ok result for documents without scenes', () => {
    const result = resolveSemanticDocumentV2({
      document: {
        assets: {}
      },
      semanticIndex: createSemanticIndex()
    });

    expect(result).toEqual({
      ok: true,
      references: [],
      diagnostics: [],
      summary: {
        referenceCount: 0,
        resolvedCount: 0,
        unresolvedCount: 0,
        errorCount: 0,
        warningCount: 0
      }
    });
  });

  it('orders references deterministically by fieldPath', () => {
    const document = {
      scenes: {
        z: {
          entities: {
            b: {
              components: {
                sprite: {
                  asset: 'asset:b_sprite'
                }
              }
            },
            a: {
              components: {
                sprite: {
                  asset: 'asset:a_sprite'
                }
              }
            }
          },
          camera: {
            follow: 'entity:b'
          }
        },
        a: {
          entities: {
            b: {
              components: {
                sprite: {
                  asset: 'asset:a_b_sprite'
                }
              }
            }
          },
          camera: {
            follow: 'entity:a_player'
          }
        }
      }
    };
    const semanticIndex = createSemanticIndex([
      { id: 'entity:a_player', kind: 'entity', path: '/scenes/a/entities/player', value: {} },
      { id: 'asset:a_b_sprite', kind: 'asset', path: '/assets/a_b_sprite', value: {} },
      { id: 'entity:b', kind: 'entity', path: '/scenes/z/entities/b', value: {} },
      { id: 'asset:a_sprite', kind: 'asset', path: '/assets/a_sprite', value: {} },
      { id: 'asset:b_sprite', kind: 'asset', path: '/assets/b_sprite', value: {} }
    ]);

    const first = resolveSemanticDocumentV2({ document, semanticIndex });
    const second = resolveSemanticDocumentV2({ document, semanticIndex });

    expect(first).toEqual(second);
    expect(first.references.map((reference) => reference.fieldPath)).toEqual([
      '/scenes/a/camera/follow',
      '/scenes/a/entities/b/components/sprite/asset',
      '/scenes/z/camera/follow',
      '/scenes/z/entities/a/components/sprite/asset',
      '/scenes/z/entities/b/components/sprite/asset'
    ]);
    expect(first.references.map((reference) => reference.id)).toEqual([
      'resolver_ref:camera_follow_entity:0',
      'resolver_ref:sprite_asset:1',
      'resolver_ref:camera_follow_entity:2',
      'resolver_ref:sprite_asset:3',
      'resolver_ref:sprite_asset:4'
    ]);
  });

  it('does not mutate document or SemanticIndex entries', () => {
    const document = createDocument({
      cameraFollow: 'entity:player',
      spriteAsset: 'asset:player_sprite'
    });
    const semanticIndex = createSemanticIndex([
      { id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: { marker: 'entry' } },
      { id: 'asset:player_sprite', kind: 'asset', path: '/assets/player_sprite', value: { marker: 'asset' } }
    ]);
    const before = {
      document: structuredClone(document),
      entry: structuredClone(semanticIndex.resolve('entity:player'))
    };

    resolveSemanticDocumentV2({ document, semanticIndex });

    expect(document).toEqual(before.document);
    expect(semanticIndex.resolve('entity:player')).toEqual(before.entry);
  });

  it('returns resolvedTarget snapshots instead of original SemanticIndex entries', () => {
    const semanticIndex = createSemanticIndex([
      { id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: { marker: 'entry' } }
    ]);
    const result = resolveSemanticDocumentV2({
      document: createDocument({
        cameraFollow: 'entity:player'
      }),
      semanticIndex
    });

    expect(result.references[0].resolvedTarget).toEqual({
      id: 'entity:player',
      kind: 'entity',
      path: '/scenes/main/entities/player'
    });
    (result.references[0].resolvedTarget as { id: string }).id = 'mutated';

    expect(semanticIndex.resolve('entity:player')).toMatchObject({ id: 'entity:player' });
  });

  it('resolves camera follow in a static fix_blank_preview repaired document fixture', () => {
    const result = createResolverV2().resolve({
      document: {
        scenes: {
          main: {
            camera: {
              follow: 'entity:player'
            },
            entities: {
              player: {
                id: 'entity:player'
              },
              debug_visible_marker: {
                id: 'entity:debug_visible_marker',
                components: {
                  sprite: {
                    asset: 'asset:missing_sprite'
                  }
                }
              }
            }
          }
        },
        assets: {
          missing_sprite: {
            id: 'asset:missing_sprite'
          }
        }
      },
      semanticIndex: createSemanticIndex([
        { id: 'scene:main', kind: 'scene', path: '/scenes/main', value: {} },
        { id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: {} },
        { id: 'entity:debug_visible_marker', kind: 'entity', path: '/scenes/main/entities/debug_visible_marker', value: {} },
        { id: 'asset:missing_sprite', kind: 'asset', path: '/assets/fallbacks/missing_sprite', value: {} }
      ])
    });

    expect(result.ok).toBe(true);
    expect(result.references.map((reference) => reference.kind)).toEqual(['camera_follow_entity', 'sprite_asset']);
    expect(result.references.find((reference) => reference.kind === 'camera_follow_entity')).toMatchObject({
      targetId: 'entity:player',
      status: 'resolved'
    });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('UNSAFE_RESOLVER_REFERENCE');
  });
});

function createDocument(options: { cameraFollow?: unknown; spriteAsset?: unknown } = {}) {
  return {
    scenes: {
      main: {
        camera: options.cameraFollow === undefined ? {} : { follow: options.cameraFollow },
        entities: {
          player: {
            id: 'entity:player',
            components: options.spriteAsset === undefined ? {} : { sprite: { asset: options.spriteAsset } }
          }
        }
      }
    }
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
