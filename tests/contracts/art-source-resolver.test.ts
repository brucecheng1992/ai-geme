import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ArtSourceManifestSchema,
  AssetManifestAssetSchema,
  createDeterministicFakeArtProvider,
  exportRuntimeArtAssetMetadataFromResolvedSources,
  resolveArtSources,
  type ArtAssetMetadata,
  type ArtProvider,
  type ArtSourceManifest,
  type AssetIntent,
  type AssetIntentManifest,
  type AssetManifestAsset,
  type AssetPlan
} from '../../packages/asset-pipeline/src/index.js';

describe('Loop4 source-resolved art pipeline contracts', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-art-source-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('recognizes agent-readable manual/local art source manifests and asset manifest source metadata', () => {
    const manifest = artSourceManifest([manualSourceRecord()]);

    expect(ArtSourceManifestSchema.parse(manifest)).toMatchObject({
      version: 'art-source-manifest-v0.1',
      records: [
        {
          source_id: 'manual_player_sprite',
          asset_id: 'player',
          asset_intent_id: 'player_sprite',
          source_type: 'manual_locked',
          locked: true,
          provider_may_replace: false,
          provenance: ['artist_drop/manual_player.png']
        }
      ]
    });
    expect(ArtSourceManifestSchema.safeParse(artSourceManifestInput([{ ...manualSourceRecord(), metadata: undefined }])).success).toBe(false);

    const runtimeManifestAsset: AssetManifestAsset = {
      id: 'player',
      loadKey: 'agm.player',
      role: 'player_character',
      type: 'image',
      format: 'png',
      path: 'assets/player.png',
      source: 'runtime_asset',
      required: true,
      status: 'ready',
      size: { w: 128, h: 128 },
      artSource: {
        type: 'manual_locked',
        assetIntentId: 'player_sprite',
        sourceManifestId: 'manual_player_sprite',
        contentSha256: manualSourceRecord().content_sha256,
        locked: true,
        providerMayReplace: false,
        normalizedMetadataRef: 'metadata/asset_player_001.asset.json',
        provenance: ['artist_drop/manual_player.png']
      }
    };

    expect(AssetManifestAssetSchema.parse(runtimeManifestAsset).artSource).toEqual(runtimeManifestAsset.artSource);
  });

  it('keeps manual_locked ownership ahead of provider output and normalizes local metadata', async () => {
    await writeLocalAsset('artist_drop/manual_player.png', 'manual-player-art');
    const provider = createDeterministicFakeArtProvider();
    const manifest = artSourceManifest([manualSourceRecord()]);

    const result = await resolveArtSources({
      projectRoot: root,
      plan: assetPlan(),
      intentManifest: assetIntentManifest(),
      sourceManifest: manifest,
      provider
    });

    expect(result.ok).toBe(true);
    expect(provider.calls).toBe(0);
    expect(result.blockers).toEqual([]);
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]).toMatchObject({
      assetId: 'player',
      assetIntentId: 'player_sprite',
      selectedSourceType: 'manual_locked',
      sourcePriority: 1,
      sourceManifestId: 'manual_player_sprite',
      contentSha256: manualSourceRecord().content_sha256,
      providerId: undefined,
      placeholder: false,
      fallback: false
    });
    expect(result.assets[0]?.normalizedMetadata).toMatchObject({
      asset_id: 'asset_player_001',
      asset_type: 'character',
      status: 'approved',
      technical: {
        source_path: 'artist_drop/manual_player.png',
        file_format: 'png'
      },
      ai_generation: {
        generated_by_ai: false,
        ai_system_used: null
      }
    });
  });

  it('fails closed for missing, checksum-mismatched, or malformed local metadata', async () => {
    const missing = await resolveArtSources({
      projectRoot: root,
      plan: assetPlan(),
      intentManifest: assetIntentManifest(),
      sourceManifest: artSourceManifest([manualSourceRecord()])
    });
    expect(missing).toMatchObject({ ok: false, blockers: ['local_asset_path_missing'] });

    await writeLocalAsset('artist_drop/manual_player.png', 'wrong-bytes');
    const checksumMismatch = await resolveArtSources({
      projectRoot: root,
      plan: assetPlan(),
      intentManifest: assetIntentManifest(),
      sourceManifest: artSourceManifest([manualSourceRecord()])
    });
    expect(checksumMismatch).toMatchObject({ ok: false, blockers: ['local_asset_sha256_mismatch'] });

    await writeLocalAsset('artist_drop/manual_player.png', 'manual-player-art');
    const missingMetadata = await resolveArtSources({
      projectRoot: root,
      plan: assetPlan(),
      intentManifest: assetIntentManifest(),
      sourceManifest: artSourceManifestInput([{ ...manualSourceRecord(), metadata: undefined }])
    });
    expect(missingMetadata).toMatchObject({ ok: false, blockers: ['local_asset_metadata_malformed'] });

    const malformedMetadata = await resolveArtSources({
      projectRoot: root,
      plan: assetPlan(),
      intentManifest: assetIntentManifest(),
      sourceManifest: artSourceManifest([
        {
          ...manualSourceRecord(),
          metadata: {
            ...metadataFor('manual_locked'),
            technical: {
              ...metadataFor('manual_locked').technical,
              source_path: 'artist_drop/other.png'
            }
          }
        }
      ])
    });
    expect(malformedMetadata).toMatchObject({ ok: false, blockers: ['local_asset_metadata_malformed'] });
  });

  it('uses deterministic fake provider metadata without network, API keys, or secret leakage', async () => {
    const originalFetch = globalThis.fetch;
    const originalSecret = process.env.DEEPSEEK_API_KEY;
    let fetchCalls = 0;
    process.env.DEEPSEEK_API_KEY = 'loop4-secret-that-must-not-appear';
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      throw new Error('network calls are forbidden in fake art provider tests');
    }) as typeof fetch;

    try {
      const firstProvider = createDeterministicFakeArtProvider();
      const secondProvider = createDeterministicFakeArtProvider();
      const first = await resolveArtSources({
        projectRoot: root,
        plan: assetPlan(),
        intentManifest: assetIntentManifest(),
        provider: firstProvider
      });
      const second = await resolveArtSources({
        projectRoot: root,
        plan: assetPlan(),
        intentManifest: assetIntentManifest(),
        provider: secondProvider
      });

      expect(fetchCalls).toBe(0);
      expect(firstProvider.calls).toBe(1);
      expect(first).toMatchObject({ ok: true, blockers: [] });
      expect(second).toMatchObject({ ok: true, blockers: [] });
      expect(first.assets[0]).toMatchObject({
        selectedSourceType: 'provider_generated',
        sourcePriority: 3,
        providerId: 'deterministic_fake_art_provider',
        placeholder: false,
        fallback: false
      });
      expect(first.assets[0]?.contentSha256).toBe(second.assets[0]?.contentSha256);
      expect(first.assets[0]?.normalizedMetadata).toMatchObject({
        asset_id: 'asset_player_001',
        ai_generation: {
          generated_by_ai: true,
          ai_system_used: 'deterministic_fake_art_provider'
        }
      });
      const providerJson = JSON.stringify(first);
      expect(providerJson).toContain('deterministic_fake_art_provider');
      expect(providerJson).not.toContain('loop4-secret-that-must-not-appear');
      expect(providerJson).not.toContain('DEEPSEEK_API_KEY');
    } finally {
      if (originalSecret === undefined) {
        delete process.env.DEEPSEEK_API_KEY;
      } else {
        process.env.DEEPSEEK_API_KEY = originalSecret;
      }
      globalThis.fetch = originalFetch;
    }
  });

  it('fails closed for malformed provider output or deterministic provider failure', async () => {
    await expect(
      resolveArtSources({
        projectRoot: root,
        plan: assetPlan(),
        intentManifest: assetIntentManifest(),
        provider: createDeterministicFakeArtProvider({ mode: 'malformed' })
      })
    ).resolves.toMatchObject({ ok: false, blockers: ['provider_output_malformed'] });

    await expect(
      resolveArtSources({
        projectRoot: root,
        plan: assetPlan(),
        intentManifest: assetIntentManifest(),
        provider: providerMissingMetadata()
      })
    ).resolves.toMatchObject({ ok: false, blockers: ['provider_output_malformed'] });

    await expect(
      resolveArtSources({
        projectRoot: root,
        plan: assetPlan(),
        intentManifest: assetIntentManifest(),
        provider: createDeterministicFakeArtProvider({ mode: 'failure' })
      })
    ).resolves.toMatchObject({ ok: false, blockers: ['provider_generation_failed'] });
  });

  it('keeps placeholders explicit and rejects placeholder masquerading', async () => {
    const placeholder = await resolveArtSources({
      projectRoot: root,
      plan: optionalAssetPlan(),
      intentManifest: optionalAssetIntentManifest(),
      sourceManifest: artSourceManifest([placeholderSourceRecord()]),
      allowExplicitPlaceholder: true
    });

    expect(placeholder).toMatchObject({
      ok: true,
      blockers: [],
      assets: [
        {
          selectedSourceType: 'explicit_placeholder',
          sourcePriority: 5,
          placeholder: true,
          fallback: true
        }
      ]
    });

    const masquerade = await resolveArtSources({
      projectRoot: root,
      plan: optionalAssetPlan(),
      intentManifest: optionalAssetIntentManifest(),
      sourceManifest: artSourceManifest([{ ...placeholderSourceRecord(), source_type: 'provider_generated' }]),
      allowExplicitPlaceholder: true
    });

    expect(masquerade).toMatchObject({ ok: false, blockers: ['placeholder_art_not_explicit'] });
  });

  it('exports normalized provider and manual/local metadata but rejects raw provider output', async () => {
    await writeLocalAsset('artist_drop/manual_player.png', 'manual-player-art');
    const manual = await resolveArtSources({
      projectRoot: root,
      plan: assetPlan(),
      intentManifest: assetIntentManifest(),
      sourceManifest: artSourceManifest([manualSourceRecord()])
    });
    const provider = await resolveArtSources({
      projectRoot: root,
      plan: optionalAssetPlan(),
      intentManifest: optionalAssetIntentManifest(),
      provider: createDeterministicFakeArtProvider()
    });

    await expect(exportRuntimeArtAssetMetadataFromResolvedSources(manual.assets)).resolves.toMatchObject({
      ok: true,
      artifact: {
        asset_count: 1,
        assets: [expect.objectContaining({ asset_id: 'asset_player_001' })]
      }
    });
    await expect(exportRuntimeArtAssetMetadataFromResolvedSources(provider.assets)).resolves.toMatchObject({
      ok: true,
      artifact: {
        asset_count: 1,
        assets: [expect.objectContaining({ asset_id: 'asset_goal_001' })]
      }
    });

    const rawProviderOutput = {
      providerId: 'deterministic_fake_art_provider',
      raw_provider_output: {
        prompt: 'secret prompt that must not enter runtime export',
        asset_id: 'asset_player_001'
      }
    };

    await expect(exportRuntimeArtAssetMetadataFromResolvedSources([rawProviderOutput])).resolves.toMatchObject({
      ok: false,
      diagnostics: [expect.objectContaining({ code: 'ART_ASSET_METADATA_RUNTIME_EXPORT_RAW_PROVIDER_OUTPUT_REJECTED' })]
    });

    await expect(exportRuntimeArtAssetMetadataFromResolvedSources([{ normalizedMetadata: metadataFor('provider_generated') }])).resolves.toMatchObject({
      ok: false,
      diagnostics: [expect.objectContaining({ code: 'ART_ASSET_METADATA_RUNTIME_EXPORT_RAW_PROVIDER_OUTPUT_REJECTED' })]
    });
  });

  async function writeLocalAsset(relativePath: string, content: string): Promise<void> {
    const filePath = join(root, relativePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content, 'utf8');
  }
});

function artSourceManifest(records: ArtSourceManifest['records']): ArtSourceManifest {
  return {
    version: 'art-source-manifest-v0.1',
    projectId: 'proj_loop4',
    records
  };
}

function artSourceManifestInput(records: unknown[]): unknown {
  return {
    version: 'art-source-manifest-v0.1',
    projectId: 'proj_loop4',
    records
  };
}

function manualSourceRecord(): ArtSourceManifest['records'][number] {
  return {
    source_id: 'manual_player_sprite',
    asset_id: 'player',
    asset_intent_id: 'player_sprite',
    source_type: 'manual_locked',
    locked: true,
    provider_may_replace: false,
    path: 'artist_drop/manual_player.png',
    content_type: 'image/png',
    width: 128,
    height: 128,
    intended_use: 'player_sprite',
    style_tags: ['stylized', 'side_view'],
    content_sha256: sha256('manual-player-art'),
    review_status: 'approved',
    provenance: ['artist_drop/manual_player.png'],
    metadata: metadataFor('manual_locked')
  };
}

function placeholderSourceRecord(): ArtSourceManifest['records'][number] {
  return {
    source_id: 'placeholder_goal_sprite',
    asset_id: 'goal',
    asset_intent_id: 'goal_sprite',
    source_type: 'explicit_placeholder',
    locked: false,
    provider_may_replace: true,
    path: 'assets/goal.svg',
    content_type: 'image/svg+xml',
    width: 96,
    height: 96,
    intended_use: 'goal_sprite',
    style_tags: ['placeholder'],
    content_sha256: sha256('placeholder-goal'),
    review_status: 'review_required',
    provenance: ['explicit_placeholder_fixture'],
    metadata: metadataFor('explicit_placeholder')
  };
}

function providerSourceRecord(): ArtSourceManifest['records'][number] {
  return {
    source_id: 'provider_player_sprite',
    asset_id: 'player',
    asset_intent_id: 'player_sprite',
    source_type: 'provider_generated',
    locked: false,
    provider_may_replace: true,
    path: 'provider_generated/player.metadata.json',
    content_type: 'metadata/json',
    width: 128,
    height: 128,
    intended_use: 'player_sprite',
    style_tags: ['stylized', 'side_view'],
    content_sha256: sha256('provider-player-metadata'),
    review_status: 'review_required',
    provenance: ['deterministic_fake_art_provider:provider-player-metadata'],
    metadata: {
      ...metadataFor('provider_generated'),
      technical: {
        ...metadataFor('provider_generated').technical,
        source_path: 'provider_generated/player.metadata.json',
        thumbnail_path: 'provider_generated/player.metadata.json',
        file_format: 'json'
      }
    }
  };
}

function providerMissingMetadata(): ArtProvider {
  let calls = 0;
  return {
    providerId: 'missing_metadata_fake_provider',
    get calls() {
      return calls;
    },
    async generate(intent) {
      calls += 1;
      return {
        ok: true,
        providerId: 'missing_metadata_fake_provider',
        assetIntentId: intent.id,
        source: { ...providerSourceRecord(), metadata: undefined }
      };
    }
  };
}

function assetPlan(): AssetPlan {
  return {
    version: 'asset-plan-v0.1',
    projectId: 'proj_loop4',
    style: {
      visual_theme: 'bright arcade forest',
      camera: 'side_view'
    },
    items: [
      {
        id: 'player',
        role: 'player_character',
        subject: 'runner player',
        view: 'side_view',
        size: { w: 128, h: 128 },
        format: 'svg',
        required: true,
        provider_priority: ['runtime_asset', 'template_svg']
      }
    ]
  };
}

function optionalAssetPlan(): AssetPlan {
  return {
    ...assetPlan(),
    items: [
      {
        id: 'goal',
        role: 'collectible',
        subject: 'finish star',
        view: 'side_view',
        size: { w: 96, h: 96 },
        format: 'svg',
        required: false,
        provider_priority: ['runtime_asset', 'template_svg']
      }
    ]
  };
}

function assetIntentManifest(): AssetIntentManifest {
  return {
    version: 'asset-intent-manifest-v0.1',
    projectId: 'proj_loop4',
    sourceArtifacts: {
      assetPlan: 'asset_plan.json'
    },
    summary: {
      total: 1,
      coreRequired: 1,
      requestRequired: 0,
      optional: 0,
      fallbackAllowed: 0,
      cacheKeyVersion: 'asset-intent-cache-v0.1'
    },
    intents: [assetIntent()]
  };
}

function optionalAssetIntentManifest(): AssetIntentManifest {
  return {
    ...assetIntentManifest(),
    summary: {
      total: 1,
      coreRequired: 0,
      requestRequired: 0,
      optional: 1,
      fallbackAllowed: 1,
      cacheKeyVersion: 'asset-intent-cache-v0.1'
    },
    intents: [
      {
        ...assetIntent(),
        id: 'goal_sprite',
        assetPlanId: 'goal',
        role: 'goal_sprite',
        requiredLevel: 'optional',
        subject: 'finish star',
        dimensions: { width: 96, height: 96 },
        sourceDslPaths: ['/visual/goals/0'],
        fallbackPolicy: {
          allowed: true,
          reason: 'allowed_for_optional'
        },
        cacheKey: {
          version: 'asset-intent-cache-v0.1',
          intentHash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          styleProfileVersion: 'asset-style-profile-v0.1',
          providerPolicyVersion: 'asset-provider-policy-v0.1'
        }
      }
    ]
  };
}

function assetIntent(): AssetIntent {
  return {
    id: 'player_sprite',
    assetPlanId: 'player',
    role: 'player_sprite',
    requiredLevel: 'core_required',
    style: 'bright arcade forest',
    subject: 'runner player',
    dimensions: { width: 128, height: 128 },
    sourceDslPaths: ['/visual/player'],
    fallbackPolicy: {
      allowed: false,
      reason: 'not_allowed_for_core_required'
    },
    cacheKey: {
      version: 'asset-intent-cache-v0.1',
      intentHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      styleProfileVersion: 'asset-style-profile-v0.1',
      providerPolicyVersion: 'asset-provider-policy-v0.1'
    }
  };
}

function metadataFor(sourceType: ArtSourceManifest['records'][number]['source_type']): ArtAssetMetadata {
  const isGoal = sourceType === 'explicit_placeholder';
  return {
    asset_id: isGoal ? 'asset_goal_001' : 'asset_player_001',
    project_code: 'proj_loop4',
    asset_type: isGoal ? 'prop' : 'character',
    asset_subtype: isGoal ? 'collectible' : 'sprite',
    title: isGoal ? 'Explicit Placeholder Goal' : 'Manual Locked Player Sprite',
    description: isGoal
      ? 'Explicit placeholder metadata for an optional goal asset.'
      : 'Manual locked local player sprite metadata for Loop4 resolver tests.',
    version: '1.0.0',
    status: sourceType === 'explicit_placeholder' ? 'needs_review' : 'approved',
    semantic: {
      world: 'loop4_test_world',
      subject: isGoal ? ['goal', 'star'] : ['player', 'runner'],
      semantic_tags: isGoal ? ['goal', 'placeholder'] : ['player', 'runner'],
      visual_style: ['stylized'],
      mood: ['heroic']
    },
    gameplay: {
      gameplay_role: isGoal ? ['collectible'] : ['player_character'],
      affordances: isGoal ? ['collectible'] : ['animated'],
      allowed_contexts: ['loop4_test_world'],
      blocked_contexts: []
    },
    technical: {
      source_path: isGoal ? 'assets/goal.svg' : 'artist_drop/manual_player.png',
      thumbnail_path: isGoal ? 'assets/goal.svg' : 'artist_drop/manual_player.png',
      file_format: isGoal ? 'svg' : 'png',
      engine_targets: ['web'],
      texture_resolution: isGoal ? '96x96' : '128x128',
      polycount_lod0: 0,
      platform_budget: ['desktop', 'mobile']
    },
    ai_generation: {
      generated_by_ai: sourceType === 'provider_generated',
      ai_system_used: sourceType === 'provider_generated' ? 'deterministic_fake_art_provider' : null,
      ai_system_version: sourceType === 'provider_generated' ? 'v0.1' : null,
      prompt_summary: sourceType === 'provider_generated' ? 'deterministic test art metadata' : null,
      negative_prompt_summary: null,
      seed: null,
      human_edit_level: sourceType === 'provider_generated' ? 'ai_generated' : 'human_made'
    },
    rights: {
      creator: sourceType === 'provider_generated' ? 'deterministic_fake_art_provider' : 'local_artist',
      owner: 'loop4_test',
      license: 'internal_project_only',
      commercial_use: false,
      training_use_allowed: false,
      third_party_sources: [],
      rights_risk_level: 'low'
    },
    workflow: {
      owner: 'loop4_test',
      reviewed_by: sourceType === 'explicit_placeholder' ? null : 'art_director',
      review_notes: sourceType === 'explicit_placeholder' ? 'Explicit placeholder only.' : 'Approved manual source.',
      updated_at: '2026-07-04',
      approved_at: sourceType === 'explicit_placeholder' ? null : '2026-07-04'
    },
    relations: {
      derived_from: [],
      depends_on: [],
      compatible_with: [],
      used_by: ['loop4_test']
    },
    search: {
      embedding_input: isGoal ? 'explicit placeholder goal' : 'manual locked player sprite'
    }
  };
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
