import { describe, expect, it } from 'vitest';

import {
  resolveSemanticDocumentV2,
  evaluateResolverV2IrIntegrationGate,
  createResolverV2IrIntegrationGate,
  createResolverV2,
  extractResolverV2AssetCatalog,
  extractResolverV2SceneGraph,
  type ResolverV2,
  type ResolverV2Diagnostic,
  type ResolverV2Reference,
  type ResolverV2Result,
  type ResolverV2SceneGraph,
  type ResolverV2SceneGraphEdge,
  type ResolverV2SceneGraphNode,
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
            id: 'asset:player_sprite',
            type: 'image',
            source: './assets/player.png'
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
      },
      resolvedAsset: {
        id: 'asset:player_sprite',
        kind: 'image',
        path: '/assets/player_sprite',
        sourceKind: 'file'
      }
    });
  });

  it('resolves audio and font asset references from entity components', () => {
    const result = resolveSemanticDocumentV2({
      document: {
        scenes: {
          main: {
            entities: {
              announcer: {
                id: 'entity:announcer',
                components: {
                  audio: {
                    asset: 'asset:voice_over'
                  },
                  text: {
                    fontAsset: 'asset:ui_font'
                  }
                }
              }
            }
          }
        },
        assets: {
          audio: {
            voice_over: {
              id: 'asset:voice_over',
              type: 'audio',
              source: './assets/voice-over.mp3'
            }
          },
          fonts: {
            ui_font: {
              id: 'asset:ui_font',
              type: 'font',
              source: './assets/ui.woff2'
            }
          }
        }
      },
      semanticIndex: createSemanticIndex([
        { id: 'entity:announcer', kind: 'entity', path: '/scenes/main/entities/announcer', value: {} },
        { id: 'asset:voice_over', kind: 'asset', path: '/assets/audio/voice_over', value: {} },
        { id: 'asset:ui_font', kind: 'asset', path: '/assets/fonts/ui_font', value: {} }
      ])
    });

    expect(result.ok).toBe(true);
    expect(result.references.map((reference) => reference.kind)).toEqual(['audio_asset', 'font_asset']);
    expect(result.references).toEqual([
      expect.objectContaining({
        id: 'resolver_ref:audio_asset:0',
        kind: 'audio_asset',
        sourceId: 'entity:announcer',
        sourcePath: '/scenes/main/entities/announcer',
        fieldPath: '/scenes/main/entities/announcer/components/audio/asset',
        targetId: 'asset:voice_over',
        status: 'resolved',
        resolvedAsset: expect.objectContaining({ id: 'asset:voice_over', kind: 'audio', sourceKind: 'file' })
      }),
      expect.objectContaining({
        id: 'resolver_ref:font_asset:1',
        kind: 'font_asset',
        sourceId: 'entity:announcer',
        sourcePath: '/scenes/main/entities/announcer',
        fieldPath: '/scenes/main/entities/announcer/components/text/fontAsset',
        targetId: 'asset:ui_font',
        status: 'resolved',
        resolvedAsset: expect.objectContaining({ id: 'asset:ui_font', kind: 'font', sourceKind: 'file' })
      })
    ]);
  });

  it('reports asset type mismatch diagnostics for incompatible sprite targets', () => {
    const result = resolveSemanticDocumentV2({
      document: {
        scenes: {
          main: {
            entities: {
              player: {
                id: 'entity:player',
                components: {
                  sprite: {
                    asset: 'asset:jump_sfx'
                  }
                }
              }
            }
          }
        },
        assets: {
          audio: {
            jump_sfx: {
              id: 'asset:jump_sfx',
              type: 'audio',
              source: './assets/jump.wav'
            }
          }
        }
      },
      semanticIndex: createSemanticIndex([
        { id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: {} },
        { id: 'asset:jump_sfx', kind: 'asset', path: '/assets/audio/jump_sfx', value: {} }
      ])
    });

    expect(result.ok).toBe(false);
    expect(result.references).toEqual([
      expect.objectContaining({
        kind: 'sprite_asset',
        targetId: 'asset:jump_sfx',
        expectedAssetKinds: ['image', 'sprite', 'generated_shape', 'atlas'],
        status: 'unresolved'
      })
    ]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: 'error',
        code: 'RESOLVER_ASSET_TYPE_MISMATCH',
        targetId: 'asset:jump_sfx',
        expectedAssetKinds: ['image', 'sprite', 'generated_shape', 'atlas'],
        actualAssetKind: 'audio'
      })
    ]);
  });

  it('reports missing asset definitions after SemanticIndex target resolution', () => {
    const result = resolveSemanticDocumentV2({
      document: createDocument({
        spriteAsset: 'asset:player_sprite'
      }),
      semanticIndex: createSemanticIndex([
        { id: 'asset:player_sprite', kind: 'asset', path: '/assets/player_sprite', value: {} }
      ])
    });

    expect(result.ok).toBe(false);
    expect(result.references).toEqual([
      expect.objectContaining({
        kind: 'sprite_asset',
        targetId: 'asset:player_sprite',
        status: 'unresolved'
      })
    ]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: 'error',
        code: 'RESOLVER_ASSET_DEFINITION_NOT_FOUND',
        targetId: 'asset:player_sprite'
      })
    ]);
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
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          code: 'RESOLVER_REFERENCE_TARGET_NOT_FOUND',
          targetId: 'entity:missing',
          expectedTargetKind: 'entity',
          fieldPath: '/scenes/main/camera/follow'
        })
      ])
    );
    expect(result.summary).toMatchObject({ unresolvedCount: 1 });
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
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          code: 'RESOLVER_REFERENCE_KIND_MISMATCH',
          expectedTargetKind: 'entity',
          actualTargetKind: 'asset',
          targetId: 'asset:player_sprite'
        })
      ])
    );
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
      },
      assets: {
        sprites: {
          b_sprite: {
            id: 'asset:b_sprite',
            type: 'image',
            source: './assets/b.png'
          },
          a_sprite: {
            id: 'asset:a_sprite',
            type: 'image',
            source: './assets/a.png'
          },
          a_b_sprite: {
            id: 'asset:a_b_sprite',
            type: 'image',
            source: './assets/a-b.png'
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
          fallbacks: {
            missing_sprite: {
              id: 'asset:missing_sprite',
              type: 'generated_shape',
              shape: 'rectangle',
              width: 32,
              height: 32
            }
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
    expect(result.references.find((reference) => reference.kind === 'sprite_asset')).toMatchObject({
      targetId: 'asset:missing_sprite',
      status: 'resolved',
      resolvedAsset: expect.objectContaining({ kind: 'generated_shape', sourceKind: 'generated' })
    });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('UNSAFE_RESOLVER_REFERENCE');
  });

  it('extracts deterministic grouped asset catalog without reading ordinary source paths', () => {
    const result = extractResolverV2AssetCatalog({
      assets: {
        sprites: {
          player_sprite: {
            id: 'asset:player_sprite',
            type: 'image',
            source: './assets/player.png'
          }
        },
        audio: {
          jump_sfx: {
            id: 'asset:jump_sfx',
            type: 'audio',
            source: './assets/jump.wav'
          }
        },
        fonts: {
          ui_font: {
            id: 'asset:ui_font',
            type: 'font',
            source: './assets/ui.woff2'
          }
        }
      }
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.assets.map((asset) => asset.id)).toEqual(['asset:jump_sfx', 'asset:ui_font', 'asset:player_sprite']);
    expect(result.assets).toEqual([
      expect.objectContaining({
        id: 'asset:jump_sfx',
        key: 'jump_sfx',
        path: '/assets/audio/jump_sfx',
        kind: 'audio',
        sourceKind: 'file',
        sourcePreview: './assets/jump.wav'
      }),
      expect.objectContaining({
        id: 'asset:ui_font',
        key: 'ui_font',
        path: '/assets/fonts/ui_font',
        kind: 'font',
        sourceKind: 'file',
        sourcePreview: './assets/ui.woff2'
      }),
      expect.objectContaining({
        id: 'asset:player_sprite',
        key: 'player_sprite',
        path: '/assets/sprites/player_sprite',
        kind: 'image',
        sourceKind: 'file',
        sourcePreview: './assets/player.png'
      })
    ]);
  });

  it('resolves sound.asset and nested text.font.asset references', () => {
    const result = resolveSemanticDocumentV2({
      document: {
        scenes: {
          main: {
            entities: {
              announcer: {
                id: 'entity:announcer',
                components: {
                  sound: {
                    asset: 'asset:jump_sfx'
                  },
                  text: {
                    font: {
                      asset: 'asset:ui_font'
                    }
                  }
                }
              }
            }
          }
        },
        assets: {
          audio: {
            jump_sfx: {
              id: 'asset:jump_sfx',
              type: 'audio',
              source: './assets/jump.wav'
            }
          },
          fonts: {
            ui_font: {
              id: 'asset:ui_font',
              type: 'font',
              source: './assets/ui.woff2'
            }
          }
        }
      },
      semanticIndex: createSemanticIndex([
        { id: 'asset:jump_sfx', kind: 'asset', path: '/assets/audio/jump_sfx', value: {} },
        { id: 'asset:ui_font', kind: 'asset', path: '/assets/fonts/ui_font', value: {} }
      ])
    });

    expect(result.ok).toBe(true);
    expect(result.references).toEqual([
      expect.objectContaining({
        kind: 'audio_asset',
        fieldPath: '/scenes/main/entities/announcer/components/sound/asset',
        targetId: 'asset:jump_sfx',
        resolvedAsset: expect.objectContaining({ kind: 'audio' })
      }),
      expect.objectContaining({
        kind: 'font_asset',
        fieldPath: '/scenes/main/entities/announcer/components/text/font/asset',
        targetId: 'asset:ui_font',
        resolvedAsset: expect.objectContaining({ kind: 'font' })
      })
    ]);
  });

  it('classifies asset file reference targets as unsafe rather than invalid semantic ids', () => {
    const result = resolveSemanticDocumentV2({
      document: createDocument({
        spriteAsset: './assets/player.png'
      }),
      semanticIndex: createSemanticIndex()
    });

    expect(result.ok).toBe(false);
    expect(result.references[0]).toMatchObject({ targetId: './assets/player.png', status: 'unresolved' });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('UNSAFE_RESOLVER_REFERENCE');
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('INVALID_RESOLVER_SEMANTIC_ID');
  });

  it('does not call SemanticIndex.resolve for unsafe asset reference targets', () => {
    const semanticIndex: SemanticIndex = {
      resolve(id) {
        throw new Error(`SemanticIndex.resolve should not be called for ${id}`);
      },
      has() {
        return false;
      },
      list() {
        return [];
      }
    };

    const result = resolveSemanticDocumentV2({
      document: createDocument({
        spriteAsset: './assets/player.png'
      }),
      semanticIndex
    });

    expect(result.ok).toBe(false);
    expect(result.references[0]).toMatchObject({ targetId: './assets/player.png', status: 'unresolved' });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('UNSAFE_RESOLVER_REFERENCE');
  });

  it('classifies plain non-semantic reference targets as invalid semantic ids', () => {
    const result = resolveSemanticDocumentV2({
      document: createDocument({
        spriteAsset: 'player_sprite'
      }),
      semanticIndex: createSemanticIndex()
    });

    expect(result.ok).toBe(false);
    expect(result.references[0]).toMatchObject({ targetId: 'player_sprite', status: 'unresolved' });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('INVALID_RESOLVER_SEMANTIC_ID');
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('UNSAFE_RESOLVER_REFERENCE');
  });

  it('does not reject valid semantic ids whose names match unsafe path segments', () => {
    const document = createSpriteDocument({
      assetId: 'asset:generated',
      assetKey: 'generated',
      assetSource: './assets/player.png'
    });
    const result = resolveSemanticDocumentV2({
      document,
      semanticIndex: createSemanticIndex([{ id: 'asset:generated', kind: 'asset', path: '/assets/sprites/generated', value: {} }])
    });

    expect(result.ok).toBe(true);
    expect(result.references[0]).toMatchObject({
      targetId: 'asset:generated',
      status: 'resolved',
      resolvedAsset: expect.objectContaining({ id: 'asset:generated', kind: 'image' })
    });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('UNSAFE_RESOLVER_REFERENCE');
  });

  it('returns expectedAssetKinds snapshots that cannot mutate resolver rules', () => {
    const document = createSpriteDocument({ assetSource: './assets/player.png' });
    const semanticIndex = createSemanticIndex([{ id: 'asset:player_sprite', kind: 'asset', path: '/assets/sprites/player_sprite', value: {} }]);
    const first = resolveSemanticDocumentV2({ document, semanticIndex });

    first.references[0].expectedAssetKinds?.pop();
    const second = resolveSemanticDocumentV2({ document, semanticIndex });

    expect(first.references[0].expectedAssetKinds).toEqual(['image', 'sprite', 'generated_shape']);
    expect(second.references[0].expectedAssetKinds).toEqual(['image', 'sprite', 'generated_shape', 'atlas']);
    expect(second.references[0]).toMatchObject({ status: 'resolved' });
  });

  it('rejects unsafe generated code asset sources while allowing ordinary asset source paths', () => {
    const safe = resolveSemanticDocumentV2({
      document: createSpriteDocument({
        assetSource: './assets/player.png'
      }),
      semanticIndex: createSemanticIndex([
        { id: 'asset:player_sprite', kind: 'asset', path: '/assets/sprites/player_sprite', value: {} }
      ])
    });
    const unsafe = resolveSemanticDocumentV2({
      document: createSpriteDocument({
        assetSource: '/packages/game-runtime/src/generated/phaser/MainScene.ts'
      }),
      semanticIndex: createSemanticIndex([
        { id: 'asset:player_sprite', kind: 'asset', path: '/assets/sprites/player_sprite', value: {} }
      ])
    });

    expect(safe.ok).toBe(true);
    expect(safe.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain('RESOLVER_ASSET_SOURCE_UNSAFE');
    expect(safe.references[0]).toMatchObject({
      status: 'resolved',
      resolvedAsset: expect.objectContaining({ sourceKind: 'file' })
    });
    expect(unsafe.ok).toBe(false);
    expect(unsafe.references[0]).toMatchObject({ status: 'unresolved' });
    expect(unsafe.diagnostics.map((diagnostic) => diagnostic.code)).toContain('RESOLVER_ASSET_SOURCE_UNSAFE');
  });

  it('reports duplicate asset ids and leaves matching references unresolved', () => {
    const result = resolveSemanticDocumentV2({
      document: {
        scenes: {
          main: {
            entities: {
              player: {
                id: 'entity:player',
                components: {
                  sprite: {
                    asset: 'asset:shared'
                  }
                }
              }
            }
          }
        },
        assets: {
          sprites: {
            player_sprite: {
              id: 'asset:shared',
              type: 'image',
              source: './assets/player.png'
            }
          },
          images: {
            player_copy: {
              id: 'asset:shared',
              type: 'image',
              source: './assets/player-copy.png'
            }
          }
        }
      },
      semanticIndex: createSemanticIndex([{ id: 'asset:shared', kind: 'asset', path: '/assets/sprites/player_sprite', value: {} }])
    });

    expect(result.ok).toBe(false);
    expect(result.references[0]).toMatchObject({ targetId: 'asset:shared', status: 'unresolved' });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('RESOLVER_DUPLICATE_ASSET_ID');
  });

  it('warns for unsupported asset reference shapes and continues resolving valid references', () => {
    const result = resolveSemanticDocumentV2({
      document: {
        scenes: {
          main: {
            entities: {
              player: {
                id: 'entity:player',
                components: {
                  sprite: {
                    asset: { id: 'asset:player_sprite' }
                  },
                  audio: {
                    asset: 123
                  },
                  text: {
                    fontAsset: 'asset:ui_font'
                  }
                }
              }
            }
          }
        },
        assets: {
          fonts: {
            ui_font: {
              id: 'asset:ui_font',
              type: 'font',
              source: './assets/ui.woff2'
            }
          }
        }
      },
      semanticIndex: createSemanticIndex([{ id: 'asset:ui_font', kind: 'asset', path: '/assets/fonts/ui_font', value: {} }])
    });

    expect(result.ok).toBe(true);
    expect(result.references).toEqual([
      expect.objectContaining({ kind: 'font_asset', targetId: 'asset:ui_font', status: 'resolved' })
    ]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ severity: 'warning', code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE' }),
      expect.objectContaining({ severity: 'warning', code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE' })
    ]);
  });

  it('warns for malformed assets root and continues resolving non-asset references', () => {
    const result = resolveSemanticDocumentV2({
      document: {
        scenes: {
          main: {
            camera: {
              follow: 'entity:player'
            },
            entities: {
              player: {
                id: 'entity:player'
              }
            }
          }
        },
        assets: []
      },
      semanticIndex: createSemanticIndex([
        { id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: {} }
      ])
    });

    expect(result.ok).toBe(true);
    expect(result.references).toEqual([
      expect.objectContaining({ kind: 'camera_follow_entity', targetId: 'entity:player', status: 'resolved' })
    ]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: 'warning',
        code: 'RESOLVER_REFERENCE_EXTRACTION_FAILED',
        sourcePath: '/assets'
      })
    ]);
    expect(result.summary).toMatchObject({
      resolvedCount: 1,
      unresolvedCount: 0,
      errorCount: 0,
      warningCount: 1
    });
  });

  it('does not expose original asset definition objects through resolvedAsset snapshots', () => {
    const document = createSpriteDocument({ assetSource: './assets/player.png' });
    const semanticIndex = createSemanticIndex([{ id: 'asset:player_sprite', kind: 'asset', path: '/assets/sprites/player_sprite', value: {} }]);
    const result = resolveSemanticDocumentV2({ document, semanticIndex });

    expect(result.references[0].resolvedAsset).toEqual({
      id: 'asset:player_sprite',
      kind: 'image',
      path: '/assets/sprites/player_sprite',
      sourceKind: 'file'
    });
    (result.references[0].resolvedAsset as { id: string }).id = 'asset:mutated';

    expect(extractResolverV2AssetCatalog(document).assets[0]).toMatchObject({ id: 'asset:player_sprite' });
    expect(semanticIndex.resolve('asset:player_sprite')).toMatchObject({ id: 'asset:player_sprite' });
  });
});

describe('Resolver V2 scene graph resolver', () => {
  it('extracts scene and entity graph nodes', () => {
    const result = resolveSceneGraphTestResult({
      document: {
        scenes: {
          main: {
            entities: {
              player: {
                id: 'entity:player',
                components: {
                  transform: { x: 120, y: 300 }
                }
              }
            }
          }
        }
      },
      semanticIndex: createSemanticIndex([{ id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: {} }])
    });

    expect(result.ok).toBe(true);
    expect(result.sceneGraph?.nodes).toEqual([
      expect.objectContaining({
        id: 'scene_node:scene:main',
        kind: 'scene',
        semanticId: 'scene:main',
        path: '/scenes/main'
      }),
      expect.objectContaining({
        id: 'entity_node:main:entity:player',
        kind: 'entity',
        semanticId: 'entity:player',
        path: '/scenes/main/entities/player',
        transform: { x: 120, y: 300 }
      })
    ]);
    expect(result.sceneGraph?.edges).toEqual([
      expect.objectContaining({
        kind: 'scene_contains_entity',
        from: 'scene_node:scene:main',
        to: 'entity_node:main:entity:player',
        path: '/scenes/main/entities/player'
      })
    ]);
    expect(result.summary).toMatchObject({
      sceneCount: 1,
      entityCount: 1
    });
  });

  it('creates camera follow graph edges', () => {
    const result = resolveSceneGraphTestResult({
      document: {
        scenes: {
          main: {
            camera: {
              id: 'camera:main',
              follow: 'entity:player'
            },
            entities: {
              player: {
                id: 'entity:player'
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

    expect(result.sceneGraph?.nodes).toContainEqual(
      expect.objectContaining({
        id: 'camera_node:main:camera:main',
        kind: 'camera',
        semanticId: 'camera:main',
        path: '/scenes/main/camera'
      })
    );
    expect(result.sceneGraph?.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'scene_has_camera',
          from: 'scene_node:scene:main',
          to: 'camera_node:main:camera:main'
        }),
        expect.objectContaining({
          kind: 'camera_follows_entity',
          from: 'camera_node:main:camera:main',
          to: 'entity_node:main:entity:player',
          path: '/scenes/main/camera/follow'
        })
      ])
    );
    expect(diagnosticCodes(result)).not.toContain('RESOLVER_CAMERA_TARGET_NOT_FOUND');
  });

  it('reports missing camera follow targets', () => {
    const result = resolveSceneGraphTestResult({
      document: {
        scenes: {
          main: {
            camera: {
              follow: 'entity:missing'
            },
            entities: {}
          }
        }
      },
      semanticIndex: createSemanticIndex([{ id: 'scene:main', kind: 'scene', path: '/scenes/main', value: {} }])
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          code: 'RESOLVER_CAMERA_TARGET_NOT_FOUND',
          targetId: 'entity:missing',
          fieldPath: '/scenes/main/camera/follow'
        })
      ])
    );
  });

  it('extracts spawn graph nodes and edges', () => {
    const result = resolveSceneGraphTestResult({
      document: {
        scenes: {
          main: {
            world: { width: 800, height: 600 },
            entities: {
              player: { id: 'entity:player' }
            },
            spawn: {
              player: { x: 160, y: 320 }
            }
          }
        }
      },
      semanticIndex: createSemanticIndex([{ id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: {} }])
    });

    expect(result.sceneGraph?.nodes).toContainEqual(
      expect.objectContaining({
        id: 'spawn_node:main:player',
        kind: 'spawn',
        sceneId: 'scene:main',
        path: '/scenes/main/spawn/player',
        transform: { x: 160, y: 320 }
      })
    );
    expect(result.sceneGraph?.edges).toContainEqual(
      expect.objectContaining({
        kind: 'scene_has_spawn',
        from: 'scene_node:scene:main',
        to: 'spawn_node:main:player',
        path: '/scenes/main/spawn/player'
      })
    );
    expect(diagnosticCodes(result)).not.toContain('RESOLVER_SPAWN_OUT_OF_BOUNDS');
  });

  it('reports spawn points outside valid scene bounds', () => {
    const result = resolveSceneGraphTestResult({
      document: {
        scenes: {
          main: {
            world: { width: 800, height: 600 },
            entities: {
              player: { id: 'entity:player' }
            },
            spawn: {
              player: { x: 9999, y: 320 }
            }
          }
        }
      },
      semanticIndex: createSemanticIndex([{ id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: {} }])
    });

    expect(result.ok).toBe(false);
    expect(diagnosticCodes(result)).toContain('RESOLVER_SPAWN_OUT_OF_BOUNDS');
  });

  it('reports invalid scene bounds', () => {
    const result = resolveSceneGraphTestResult({
      document: {
        scenes: {
          main: {
            world: { width: -1, height: 600 }
          }
        }
      },
      semanticIndex: createSemanticIndex()
    });

    expect(result.ok).toBe(false);
    expect(diagnosticCodes(result)).toContain('RESOLVER_SCENE_BOUNDS_INVALID');
  });

  it('reports duplicate entity ids', () => {
    const result = resolveSceneGraphTestResult({
      document: {
        scenes: {
          main: {
            entities: {
              player: { id: 'entity:hero' },
              hero: { id: 'entity:hero' }
            }
          }
        }
      },
      semanticIndex: createSemanticIndex([{ id: 'entity:hero', kind: 'entity', path: '/scenes/main/entities/player', value: {} }])
    });

    expect(result.ok).toBe(false);
    expect(diagnosticCodes(result)).toContain('RESOLVER_DUPLICATE_ENTITY_ID');
  });

  it('resolves entity parent graph edges', () => {
    const result = resolveSceneGraphTestResult({
      document: {
        scenes: {
          main: {
            entities: {
              child: { id: 'entity:child', parent: 'entity:parent' },
              parent: { id: 'entity:parent' }
            }
          }
        }
      },
      semanticIndex: createSemanticIndex([
        { id: 'entity:child', kind: 'entity', path: '/scenes/main/entities/child', value: {} },
        { id: 'entity:parent', kind: 'entity', path: '/scenes/main/entities/parent', value: {} }
      ])
    });

    expect(result.sceneGraph?.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'entity_parent',
          from: 'entity_node:main:entity:child',
          to: 'entity_node:main:entity:parent',
          path: '/scenes/main/entities/child/parent'
        }),
        expect.objectContaining({
          kind: 'entity_child',
          from: 'entity_node:main:entity:parent',
          to: 'entity_node:main:entity:child',
          path: '/scenes/main/entities/child/parent'
        })
      ])
    );
    expect(diagnosticCodes(result)).not.toContain('RESOLVER_ENTITY_PARENT_NOT_FOUND');
  });

  it('reports missing entity parents', () => {
    const result = resolveSceneGraphTestResult({
      document: {
        scenes: {
          main: {
            entities: {
              child: { id: 'entity:child', parent: 'entity:missing' }
            }
          }
        }
      },
      semanticIndex: createSemanticIndex([{ id: 'entity:child', kind: 'entity', path: '/scenes/main/entities/child', value: {} }])
    });

    expect(result.ok).toBe(false);
    expect(diagnosticCodes(result)).toContain('RESOLVER_ENTITY_PARENT_NOT_FOUND');
  });

  it('reports entity parent cycles without throwing', () => {
    expect(() =>
      resolveSceneGraphTestResult({
        document: {
          scenes: {
            main: {
              entities: {
                a: { id: 'entity:a', parent: 'entity:b' },
                b: { id: 'entity:b', parent: 'entity:a' }
              }
            }
          }
        },
        semanticIndex: createSemanticIndex([
          { id: 'entity:a', kind: 'entity', path: '/scenes/main/entities/a', value: {} },
          { id: 'entity:b', kind: 'entity', path: '/scenes/main/entities/b', value: {} }
        ])
      })
    ).not.toThrow();

    const result = resolveSceneGraphTestResult({
      document: {
        scenes: {
          main: {
            entities: {
              a: { id: 'entity:a', parent: 'entity:b' },
              b: { id: 'entity:b', parent: 'entity:a' }
            }
          }
        }
      },
      semanticIndex: createSemanticIndex([
        { id: 'entity:a', kind: 'entity', path: '/scenes/main/entities/a', value: {} },
        { id: 'entity:b', kind: 'entity', path: '/scenes/main/entities/b', value: {} }
      ])
    });

    expect(result.ok).toBe(false);
    expect(diagnosticCodes(result)).toContain('RESOLVER_ENTITY_PARENT_CYCLE');
  });

  it('reports invalid entity transforms', () => {
    const result = resolveSceneGraphTestResult({
      document: {
        scenes: {
          main: {
            entities: {
              player: {
                id: 'entity:player',
                components: {
                  transform: { x: 'bad' }
                }
              }
            }
          }
        }
      },
      semanticIndex: createSemanticIndex([{ id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: {} }])
    });

    expect(result.ok).toBe(false);
    expect(diagnosticCodes(result)).toContain('RESOLVER_INVALID_TRANSFORM');
  });

  it('reports invalid fallback semantic ids from malformed scene graph keys', () => {
    const result = resolveSceneGraphTestResult({
      document: {
        scenes: {
          'bad-key': {
            camera: {},
            entities: {
              'bad-key': {}
            }
          }
        }
      },
      semanticIndex: createSemanticIndex()
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'INVALID_RESOLVER_SEMANTIC_ID',
          targetId: 'scene:bad-key',
          fieldPath: '/scenes/bad-key/id'
        }),
        expect.objectContaining({
          code: 'INVALID_RESOLVER_SEMANTIC_ID',
          targetId: 'camera:bad-key',
          fieldPath: '/scenes/bad-key/camera/id'
        }),
        expect.objectContaining({
          code: 'INVALID_RESOLVER_SEMANTIC_ID',
          targetId: 'entity:bad-key',
          fieldPath: '/scenes/bad-key/entities/bad-key/id'
        })
      ])
    );
  });

  it('reports wrong-kind camera follow targets when extracting scene graph directly', () => {
    const extraction = extractResolverV2SceneGraph({
      scenes: {
        main: {
          camera: {
            follow: 'asset:player_sprite'
          }
        }
      }
    });

    expect(extraction.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          code: 'INVALID_RESOLVER_SEMANTIC_ID',
          targetId: 'asset:player_sprite',
          expectedTargetKind: 'entity',
          actualTargetKind: 'asset',
          fieldPath: '/scenes/main/camera/follow'
        })
      ])
    );
  });

  it('does not resolve invalid inferred spawn targets through malformed entity fallback ids', () => {
    const result = resolveSceneGraphTestResult({
      document: {
        scenes: {
          main: {
            entities: {
              'bad-key': {}
            },
            spawn: {
              'bad-key': { x: 1, y: 2 }
            }
          }
        }
      },
      semanticIndex: createSemanticIndex()
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'INVALID_RESOLVER_SEMANTIC_ID',
          targetId: 'entity:bad-key',
          sourcePath: '/scenes/main/spawn/bad-key'
        }),
        expect.objectContaining({
          severity: 'warning',
          code: 'RESOLVER_SPAWN_TARGET_NOT_FOUND',
          targetId: 'entity:bad-key',
          sourcePath: '/scenes/main/spawn/bad-key'
        })
      ])
    );
  });

  it('orders scene graph nodes and edges deterministically', () => {
    const document = {
      scenes: {
        z: {
          spawn: {
            player: { x: 8, y: 9 }
          },
          entities: {
            b: { id: 'entity:z_b' },
            a: { id: 'entity:z_a', parent: 'entity:z_b' }
          }
        },
        a: {
          spawns: {
            hero: { entityId: 'entity:a_hero', x: 1, y: 2 }
          },
          camera: {
            follow: 'entity:a_hero'
          },
          entities: {
            hero: { id: 'entity:a_hero' }
          }
        }
      }
    };
    const semanticIndex = createSemanticIndex([
      { id: 'entity:a_hero', kind: 'entity', path: '/scenes/a/entities/hero', value: {} },
      { id: 'entity:z_a', kind: 'entity', path: '/scenes/z/entities/a', value: {} },
      { id: 'entity:z_b', kind: 'entity', path: '/scenes/z/entities/b', value: {} }
    ]);

    const first = resolveSceneGraphTestResult({ document, semanticIndex });
    const second = resolveSceneGraphTestResult({ document, semanticIndex });
    const nodePaths = first.sceneGraph?.nodes.map((node) => node.path) ?? [];
    const edgeOrderKeys =
      first.sceneGraph?.edges.map((edge) => `${edge.kind}\0${edge.path}\0${edge.from}\0${edge.to}`) ?? [];

    expect(first).toEqual(second);
    expect(nodePaths).toEqual([...nodePaths].sort());
    expect(edgeOrderKeys).toEqual([...edgeOrderKeys].sort());
    expect(first.sceneGraph?.edges.map((edge) => edge.id)).toEqual(
      first.sceneGraph?.edges.map((edge, index) => `scene_edge:${edge.kind}:${index}`)
    );
  });

  it('does not mutate scene graph documents or SemanticIndex entries', () => {
    const document = {
      scenes: {
        main: {
          world: { width: 800, height: 600 },
          camera: { follow: 'entity:player' },
          entities: {
            player: {
              id: 'entity:player',
              components: {
                transform: { x: 10, y: 20 }
              }
            }
          },
          spawn: {
            player: { x: 10, y: 20 }
          }
        }
      }
    };
    const semanticIndex = createSemanticIndex([{ id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: { marker: 'entry' } }]);
    const before = {
      document: structuredClone(document),
      entry: structuredClone(semanticIndex.resolve('entity:player'))
    };

    resolveSceneGraphTestResult({ document, semanticIndex });

    expect(document).toEqual(before.document);
    expect(semanticIndex.resolve('entity:player')).toEqual(before.entry);
  });

  it('returns scene graph nodes as snapshots', () => {
    const document = {
      scenes: {
        main: {
          entities: {
            player: { id: 'entity:player' }
          }
        }
      }
    };
    const semanticIndex = createSemanticIndex([{ id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: {} }]);
    const first = resolveSceneGraphTestResult({ document, semanticIndex });

    if (first.sceneGraph?.nodes[0] !== undefined) {
      first.sceneGraph.nodes[0].semanticId = 'mutated';
    }

    const second = resolveSceneGraphTestResult({ document, semanticIndex });
    expect(document.scenes.main.entities.player.id).toBe('entity:player');
    expect(second.sceneGraph?.nodes.find((node) => node.kind === 'entity')).toMatchObject({
      semanticId: 'entity:player'
    });
  });

  it('extracts a visible scene graph from a static fix_blank_preview repaired document fixture', () => {
    const result = resolveSceneGraphTestResult({
      document: {
        scenes: {
          main: {
            world: { width: 1024, height: 768 },
            background: { visible: true },
            camera: {
              id: 'camera:main',
              follow: 'entity:player'
            },
            spawn: {
              player: { x: 256, y: 384 }
            },
            entities: {
              player: {
                id: 'entity:player',
                components: {
                  transform: { x: 256, y: 384 },
                  sprite: { asset: 'asset:missing_sprite' }
                }
              },
              debug_visible_marker: {
                id: 'entity:debug_visible_marker',
                components: {
                  transform: { x: 10, y: 20 },
                  renderable: { visible: true },
                  sprite: { asset: 'asset:missing_sprite' }
                }
              }
            }
          }
        },
        assets: {
          fallbacks: {
            missing_sprite: {
              id: 'asset:missing_sprite',
              type: 'generated_shape',
              shape: 'rectangle',
              width: 32,
              height: 32
            }
          }
        }
      },
      semanticIndex: createSemanticIndex([
        { id: 'scene:main', kind: 'scene', path: '/scenes/main', value: {} },
        { id: 'camera:main', kind: 'camera', path: '/scenes/main/camera', value: {} },
        { id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: {} },
        { id: 'entity:debug_visible_marker', kind: 'entity', path: '/scenes/main/entities/debug_visible_marker', value: {} },
        { id: 'asset:missing_sprite', kind: 'asset', path: '/assets/fallbacks/missing_sprite', value: {} }
      ])
    });

    expect(result.ok).toBe(true);
    expect(result.sceneGraph?.nodes.map((node) => node.kind)).toEqual(
      expect.arrayContaining(['scene', 'entity', 'camera', 'spawn'])
    );
    expect(result.sceneGraph?.edges).toContainEqual(
      expect.objectContaining({
        kind: 'camera_follows_entity',
        to: 'entity_node:main:entity:player'
      })
    );
    expect(result.sceneGraph?.nodes.find((node) => node.semanticId === 'entity:debug_visible_marker')).toMatchObject({
      visible: true
    });
    expect(diagnosticCodes(result)).not.toContain('UNSAFE_RESOLVER_REFERENCE');
    expect(diagnosticCodes(result)).not.toContain('RESOLVER_ASSET_SOURCE_UNSAFE');
  });
});

describe('Resolver V2 IR integration gate', () => {
  it('marks a fully resolved document ready with a safe handoff summary', () => {
    const { document, semanticIndex } = createReadyIrGateInput();

    const result = evaluateResolverV2IrIntegrationGate({ document, semanticIndex });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('ready');
    expect(result.blockers).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.summary).toMatchObject({
      status: 'ready',
      referenceCount: 2,
      resolvedReferenceCount: 2,
      unresolvedReferenceCount: 0,
      errorCount: 0,
      warningCount: 0,
      sceneGraph: {
        sceneCount: 1,
        entityCount: 1,
        nodeCount: 3,
        edgeCount: 3
      }
    });
    expect(result.summary.references.map((reference) => reference.targetId)).toEqual([
      'entity:player',
      'asset:player_sprite'
    ]);
    expect(result.summary.assets).toEqual([
      {
        id: 'asset:player_sprite',
        key: 'player_sprite',
        kind: 'image',
        path: '/assets/sprites/player_sprite',
        sourceKind: 'file'
      }
    ]);
  });

  it('blocks resolver diagnostic errors before IR handoff', () => {
    const result = evaluateResolverV2IrIntegrationGate({
      document: createDocument({ spriteAsset: 'asset:missing_sprite' }),
      semanticIndex: createSemanticIndex([
        { id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: {} },
        { id: 'asset:missing_sprite', kind: 'asset', path: '/assets/sprites/missing_sprite', value: {} }
      ])
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'RESOLVER_V2_ASSET_ERROR',
          diagnosticCode: 'RESOLVER_ASSET_DEFINITION_NOT_FOUND',
          targetId: 'asset:missing_sprite'
        })
      ])
    );
  });

  it('blocks unresolved references even when a precomputed resolver result has no diagnostics', () => {
    const resolverResult = createIrGateResolverResult({
      references: [
        createIrGateReference({
          id: 'resolver_ref:sprite_asset:0',
          targetId: 'asset:missing_sprite',
          status: 'unresolved'
        })
      ]
    });

    const result = evaluateResolverV2IrIntegrationGate({ resolverResult });

    expect(result.ok).toBe(false);
    expect(result.blockers).toEqual([
      expect.objectContaining({
        code: 'RESOLVER_V2_UNRESOLVED_REFERENCE',
        referenceId: 'resolver_ref:sprite_asset:0',
        targetId: 'asset:missing_sprite'
      })
    ]);
  });

  it('keeps warnings non-blocking by default and blocks them when policy requires it', () => {
    const warning: ResolverV2Diagnostic = {
      severity: 'warning',
      code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
      message: 'Resolver V2 ignored an unsupported optional reference shape.',
      sourcePath: '/scenes/main/entities/player/components/optional'
    };
    const resolverResult = createIrGateResolverResult({
      diagnostics: [warning],
      summary: { warningCount: 1 }
    });

    const defaultResult = evaluateResolverV2IrIntegrationGate({ resolverResult });
    const strictResult = evaluateResolverV2IrIntegrationGate({
      resolverResult,
      policy: { blockOnWarnings: true }
    });

    expect(defaultResult.ok).toBe(true);
    expect(defaultResult.warnings).toEqual([
      expect.objectContaining({
        code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
        message: warning.message
      })
    ]);
    expect(strictResult.ok).toBe(false);
    expect(strictResult.blockers).toEqual([
      expect.objectContaining({
        code: 'RESOLVER_V2_DIAGNOSTIC_ERROR',
        diagnosticCode: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
        sourcePath: '/scenes/main/entities/player/components/optional'
      })
    ]);
  });

  it('blocks missing scene graphs by default', () => {
    const resolverResult = createIrGateResolverResult({ sceneGraph: undefined });

    const result = evaluateResolverV2IrIntegrationGate({ resolverResult });

    expect(result.ok).toBe(false);
    expect(result.blockers).toEqual([
      expect.objectContaining({
        code: 'RESOLVER_V2_MISSING_SCENE_GRAPH'
      })
    ]);
  });

  it('blocks empty scene graphs by default', () => {
    const resolverResult = createIrGateResolverResult({ sceneGraph: { nodes: [], edges: [] } });

    const result = evaluateResolverV2IrIntegrationGate({ resolverResult });

    expect(result.ok).toBe(false);
    expect(result.blockers).toEqual([
      expect.objectContaining({
        code: 'RESOLVER_V2_MISSING_SCENE'
      })
    ]);
  });

  it('allows scene-only graphs by default and blocks them when at least one entity is required', () => {
    const resolverResult = createIrGateResolverResult({
      sceneGraph: createIrGateSceneGraph({ includeEntity: false })
    });

    const defaultResult = evaluateResolverV2IrIntegrationGate({ resolverResult });
    const strictResult = evaluateResolverV2IrIntegrationGate({
      resolverResult,
      policy: { requireAtLeastOneEntity: true }
    });

    expect(defaultResult.ok).toBe(true);
    expect(strictResult.ok).toBe(false);
    expect(strictResult.blockers).toEqual([
      expect.objectContaining({
        code: 'RESOLVER_V2_MISSING_ENTITY'
      })
    ]);
  });

  it('returns a blocked gate result instead of throwing for missing inputs', () => {
    expect(() => evaluateResolverV2IrIntegrationGate({})).not.toThrow();

    const result = evaluateResolverV2IrIntegrationGate({});

    expect(result.ok).toBe(false);
    expect(result.blockers).toEqual([
      expect.objectContaining({
        code: 'RESOLVER_V2_GATE_MISSING_INPUT'
      })
    ]);
    expect(result.resolverResult.references).toEqual([]);
  });

  it('returns a blocked gate result instead of throwing when the resolver throws', () => {
    const resolver: ResolverV2 = {
      resolve() {
        throw new Error('RESOLVER_THROW_SECRET_MARKER');
      }
    };

    expect(() =>
      evaluateResolverV2IrIntegrationGate({
        document: {},
        semanticIndex: createSemanticIndex(),
        resolver
      })
    ).not.toThrow();

    const result = evaluateResolverV2IrIntegrationGate({
      document: {},
      semanticIndex: createSemanticIndex(),
      resolver
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.blockers).toEqual([
      expect.objectContaining({
        code: 'RESOLVER_V2_GATE_EXCEPTION'
      })
    ]);
    expect(JSON.stringify(result.summary)).not.toContain('RESOLVER_THROW_SECRET_MARKER');
    expect(JSON.stringify(result.blockers)).not.toContain('RESOLVER_THROW_SECRET_MARKER');
    expect(JSON.stringify(result.summary)).not.toContain('stack');
    expect(JSON.stringify(result.summary)).not.toContain('cause');
  });

  it('uses precomputed resolver results without rerunning a supplied resolver', () => {
    const resolverResult = createIrGateResolverResult();
    const resolver: ResolverV2 = {
      resolve() {
        throw new Error('precomputed resolver result should be used');
      }
    };

    const result = evaluateResolverV2IrIntegrationGate({
      resolverResult,
      resolver,
      document: { unexpected: true },
      semanticIndex: createSemanticIndex()
    });

    expect(result.ok).toBe(true);
    expect(result.resolverResult).toBe(resolverResult);
  });

  it('runs the supplied resolver when no precomputed resolver result is present', () => {
    const { document, semanticIndex } = createReadyIrGateInput();
    let callCount = 0;
    const resolver: ResolverV2 = {
      resolve(request) {
        callCount += 1;
        expect(request.document).toBe(document);
        expect(request.semanticIndex).toBe(semanticIndex);
        return createIrGateResolverResult();
      }
    };
    const gate = createResolverV2IrIntegrationGate();

    const result = gate.evaluate({ document, semanticIndex, resolver });

    expect(callCount).toBe(1);
    expect(result.ok).toBe(true);
  });

  it('excludes raw documents and diagnostic causes from the handoff summary', () => {
    const document = {
      scenes: {
        main: {
          marker: 'RAW_DOCUMENT_SECRET_MARKER'
        }
      }
    };
    const resolverResult = createIrGateResolverResult({
      diagnostics: [
        {
          severity: 'error',
          code: 'INVALID_RESOLVER_DOCUMENT',
          message: 'Resolver V2 document failed validation.',
          sourcePath: '/scenes/main',
          cause: new Error('CAUSE_SECRET_MARKER')
        }
      ],
      summary: { errorCount: 1 }
    });

    const result = evaluateResolverV2IrIntegrationGate({
      document,
      resolverResult
    });
    const summaryJson = JSON.stringify(result.summary);

    expect(summaryJson).not.toContain('RAW_DOCUMENT_SECRET_MARKER');
    expect(summaryJson).not.toContain('CAUSE_SECRET_MARKER');
    expect(summaryJson).not.toContain('cause');
    expect(summaryJson).not.toContain('stack');
  });

  it('summarizes assets without exposing raw source strings', () => {
    const document = {
      scenes: {
        main: {
          entities: {
            player: {
              id: 'entity:player'
            }
          }
        }
      },
      assets: {
        sprites: {
          player_sprite: {
            id: 'asset:player_sprite',
            type: 'image',
            source: './assets/DO_NOT_EXPOSE_RAW_SOURCE.png'
          }
        }
      }
    };

    const result = evaluateResolverV2IrIntegrationGate({
      document,
      resolverResult: createIrGateResolverResult()
    });

    expect(result.summary.assets).toEqual([
      {
        id: 'asset:player_sprite',
        key: 'player_sprite',
        kind: 'image',
        path: '/assets/sprites/player_sprite',
        sourceKind: 'file'
      }
    ]);
    expect(JSON.stringify(result.summary.assets)).not.toContain('DO_NOT_EXPOSE_RAW_SOURCE');
  });

  it('does not mutate precomputed resolver results', () => {
    const resolverResult = createIrGateResolverResult({
      diagnostics: [
        {
          severity: 'warning',
          code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
          message: 'Resolver V2 ignored an unsupported optional reference shape.'
        }
      ],
      references: [
        createIrGateReference({
          id: 'resolver_ref:sprite_asset:0',
          targetId: 'asset:player_sprite',
          status: 'resolved'
        })
      ],
      summary: {
        referenceCount: 1,
        resolvedCount: 1,
        warningCount: 1
      }
    });
    const before = structuredClone(resolverResult);

    evaluateResolverV2IrIntegrationGate({ resolverResult });

    expect(resolverResult).toEqual(before);
  });

  it('orders blockers and handoff summary content deterministically', () => {
    const resolverResult = createIrGateResolverResult({
      diagnostics: [
        {
          severity: 'error',
          code: 'RESOLVER_CAMERA_TARGET_NOT_FOUND',
          message: 'Resolver V2 camera target was not found.',
          targetId: 'entity:missing_camera_target',
          sourcePath: '/scenes/main/camera'
        },
        {
          severity: 'error',
          code: 'RESOLVER_ASSET_SOURCE_UNSAFE',
          message: 'Resolver V2 asset source is unsafe.',
          targetId: 'asset:unsafe_sprite',
          sourcePath: '/assets/sprites/unsafe_sprite'
        }
      ],
      references: [
        createIrGateReference({
          id: 'resolver_ref:sprite_asset:1',
          targetId: 'asset:unsafe_sprite',
          status: 'unresolved',
          fieldPath: '/scenes/main/entities/player/components/sprite/asset'
        }),
        createIrGateReference({
          id: 'resolver_ref:camera_follow_entity:0',
          kind: 'camera_follow_entity',
          targetId: 'entity:missing_camera_target',
          status: 'unresolved',
          fieldPath: '/scenes/main/camera/follow'
        })
      ],
      summary: {
        referenceCount: 2,
        unresolvedCount: 2,
        errorCount: 2
      }
    });

    const first = evaluateResolverV2IrIntegrationGate({ resolverResult });
    const second = evaluateResolverV2IrIntegrationGate({ resolverResult });
    const blockerKeys = first.blockers.map((blocker) =>
      [blocker.code, blocker.diagnosticCode ?? '', blocker.referenceId ?? '', blocker.sourcePath ?? '', blocker.targetId ?? ''].join('\0')
    );
    const referenceKeys = first.summary.references.map((reference) =>
      [reference.kind, reference.sourcePath, reference.fieldPath, reference.targetId].join('\0')
    );

    expect(first.blockers).toEqual(second.blockers);
    expect(first.summary).toEqual(second.summary);
    expect(blockerKeys).toEqual([...blockerKeys].sort());
    expect(referenceKeys).toEqual([...referenceKeys].sort());
  });

  it('maps scene graph diagnostics to scene graph blockers', () => {
    const resolverResult = createIrGateResolverResult({
      diagnostics: [
        {
          severity: 'error',
          code: 'RESOLVER_ENTITY_PARENT_CYCLE',
          message: 'Resolver V2 entity parent graph contains a cycle.',
          sourcePath: '/scenes/main/entities/player/parent',
          targetId: 'entity:player'
        }
      ],
      summary: { errorCount: 1 }
    });

    const result = evaluateResolverV2IrIntegrationGate({ resolverResult });

    expect(result.blockers).toEqual([
      expect.objectContaining({
        code: 'RESOLVER_V2_SCENE_GRAPH_ERROR',
        diagnosticCode: 'RESOLVER_ENTITY_PARENT_CYCLE',
        targetId: 'entity:player'
      })
    ]);
  });

  it('maps asset diagnostics to asset blockers', () => {
    const resolverResult = createIrGateResolverResult({
      diagnostics: [
        {
          severity: 'error',
          code: 'RESOLVER_ASSET_SOURCE_UNSAFE',
          message: 'Resolver V2 asset source points at generated code.',
          sourcePath: '/assets/sprites/player_sprite/source',
          targetId: 'asset:player_sprite'
        }
      ],
      summary: { errorCount: 1 }
    });

    const result = evaluateResolverV2IrIntegrationGate({ resolverResult });

    expect(result.blockers).toEqual([
      expect.objectContaining({
        code: 'RESOLVER_V2_ASSET_ERROR',
        diagnosticCode: 'RESOLVER_ASSET_SOURCE_UNSAFE',
        targetId: 'asset:player_sprite'
      })
    ]);
  });
});

type SceneGraphTestResult = ReturnType<typeof resolveSemanticDocumentV2> & {
  sceneGraph?: {
    nodes: ResolverV2SceneGraphNode[];
    edges: ResolverV2SceneGraphEdge[];
  };
  summary: ReturnType<typeof resolveSemanticDocumentV2>['summary'] & {
    sceneCount?: number;
    entityCount?: number;
    sceneGraphNodeCount?: number;
    sceneGraphEdgeCount?: number;
  };
};

function resolveSceneGraphTestResult(input: Parameters<typeof resolveSemanticDocumentV2>[0]): SceneGraphTestResult {
  return resolveSemanticDocumentV2(input) as SceneGraphTestResult;
}

function diagnosticCodes(result: SceneGraphTestResult): string[] {
  return result.diagnostics.map((diagnostic) => diagnostic.code);
}

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

function createSpriteDocument(options: { assetSource: unknown; assetId?: string; assetKey?: string }) {
  const assetId = options.assetId ?? 'asset:player_sprite';
  const assetKey = options.assetKey ?? 'player_sprite';
  return {
    scenes: {
      main: {
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
        [assetKey]: {
          id: assetId,
          type: 'image',
          source: options.assetSource
        }
      }
    }
  };
}

function createReadyIrGateInput(): { document: unknown; semanticIndex: SemanticIndex } {
  return {
    document: {
      scenes: {
        main: {
          camera: {
            follow: 'entity:player'
          },
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
        sprites: {
          player_sprite: {
            id: 'asset:player_sprite',
            type: 'image',
            source: './assets/player.png'
          }
        }
      }
    },
    semanticIndex: createSemanticIndex([
      { id: 'scene:main', kind: 'scene', path: '/scenes/main', value: {} },
      { id: 'entity:player', kind: 'entity', path: '/scenes/main/entities/player', value: {} },
      { id: 'asset:player_sprite', kind: 'asset', path: '/assets/sprites/player_sprite', value: {} }
    ])
  };
}

function createIrGateResolverResult(
  options: {
    diagnostics?: ResolverV2Diagnostic[];
    references?: ResolverV2Reference[];
    sceneGraph?: ResolverV2SceneGraph;
    summary?: Partial<ResolverV2Result['summary']>;
  } = {}
): ResolverV2Result {
  const references = options.references ?? [];
  const diagnostics = options.diagnostics ?? [];
  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;
  const warningCount = diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length;
  const sceneGraph = Object.prototype.hasOwnProperty.call(options, 'sceneGraph')
    ? options.sceneGraph
    : createIrGateSceneGraph();

  return {
    ok: errorCount === 0 && references.every((reference) => reference.status === 'resolved'),
    references,
    diagnostics,
    summary: {
      referenceCount: references.length,
      resolvedCount: references.filter((reference) => reference.status === 'resolved').length,
      unresolvedCount: references.filter((reference) => reference.status === 'unresolved').length,
      errorCount,
      warningCount,
      sceneCount: sceneGraph?.nodes.filter((node) => node.kind === 'scene').length,
      entityCount: sceneGraph?.nodes.filter((node) => node.kind === 'entity').length,
      sceneGraphNodeCount: sceneGraph?.nodes.length,
      sceneGraphEdgeCount: sceneGraph?.edges.length,
      ...options.summary
    },
    ...(sceneGraph === undefined ? {} : { sceneGraph })
  };
}

function createIrGateReference(options: {
  id: string;
  targetId: string;
  status: 'resolved' | 'unresolved';
  kind?: ResolverV2Reference['kind'];
  sourcePath?: string;
  fieldPath?: string;
}): ResolverV2Reference {
  return {
    id: options.id,
    kind: options.kind ?? 'sprite_asset',
    sourcePath: options.sourcePath ?? '/scenes/main/entities/player',
    fieldPath: options.fieldPath ?? '/scenes/main/entities/player/components/sprite/asset',
    targetId: options.targetId,
    expectedTargetKind: options.kind === 'camera_follow_entity' ? 'entity' : 'asset',
    status: options.status,
    ...(options.status === 'resolved'
      ? {
          resolvedTarget: {
            id: options.targetId,
            kind: options.kind === 'camera_follow_entity' ? 'entity' : 'asset',
            path: options.kind === 'camera_follow_entity' ? '/scenes/main/entities/player' : '/assets/sprites/player_sprite'
          }
        }
      : {})
  };
}

function createIrGateSceneGraph(options: { includeEntity?: boolean } = {}): ResolverV2SceneGraph {
  const includeEntity = options.includeEntity ?? true;
  return {
    nodes: [
      {
        id: 'scene_node:scene:main',
        kind: 'scene',
        semanticId: 'scene:main',
        path: '/scenes/main',
        sceneId: 'scene:main',
        metadata: { sceneKey: 'main' }
      },
      ...(includeEntity
        ? [
            {
              id: 'entity_node:main:entity:player',
              kind: 'entity' as const,
              semanticId: 'entity:player',
              path: '/scenes/main/entities/player',
              sceneId: 'scene:main',
              visible: true
            }
          ]
        : [])
    ],
    edges: includeEntity
      ? [
          {
            id: 'scene_edge:scene_contains_entity:0',
            kind: 'scene_contains_entity',
            from: 'scene_node:scene:main',
            to: 'entity_node:main:entity:player',
            path: '/scenes/main/entities/player'
          }
        ]
      : []
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
