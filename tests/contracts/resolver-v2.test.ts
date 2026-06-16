import { describe, expect, it } from 'vitest';

import {
  resolveSemanticDocumentV2,
  createResolverV2,
  extractResolverV2AssetCatalog,
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
