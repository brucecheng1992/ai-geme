import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ART_PROVIDER_CONTRACT_VERSION,
  createArtProviderRequest,
  createDeterministicFakeArtProvider,
  createDisabledLiveArtProvider,
  exportRuntimeArtAssetMetadataFromResolvedSources,
  resolveArtSources,
  type ArtAssetMetadata,
  type ArtProvider,
  type ArtProviderRequest,
  type ArtSourceManifest,
  type AssetIntent,
  type AssetIntentManifest,
  type AssetPlan
} from '../../packages/asset-pipeline/src/index.js';

describe('Loop6 art provider contract and no-network safety skeleton', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-art-provider-contract-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('builds provider-neutral no-network requests and deterministic fake provider results', async () => {
    const request = createArtProviderRequest(assetIntent(), 'deterministic_fake');
    const firstProvider = createDeterministicFakeArtProvider();
    const secondProvider = createDeterministicFakeArtProvider();

    expect(request).toMatchObject({
      contractVersion: ART_PROVIDER_CONTRACT_VERSION,
      mode: 'deterministic_fake',
      safety: {
        allowNetwork: false,
        allowCredentialRead: false,
        allowArtifactWrite: false
      }
    });
    expect(firstProvider).toMatchObject({
      providerId: 'deterministic_fake_art_provider',
      mode: 'deterministic_fake',
      capabilities: {
        deterministic: true,
        network: 'forbidden',
        credentials: 'not_required',
        binaryWrites: 'forbidden',
        rawOutputMayBypassNormalization: false
      }
    });

    const first = await firstProvider.generate(request);
    const second = await secondProvider.generate(request);

    expect(first).toMatchObject({
      ok: true,
      providerId: 'deterministic_fake_art_provider',
      providerMode: 'deterministic_fake',
      assetIntentId: 'player_sprite',
      outputKind: 'art_source_manifest_record'
    });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(JSON.stringify(first)).not.toMatch(/OPENAI|GOOGLE|ADOBE|STABILITY|API_KEY|secret|authorization|Bearer/i);
  });

  it('fails disabled live provider closed without network calls or credential values', async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      throw new Error('network calls are forbidden in provider contract tests');
    }) as typeof fetch;

    try {
      const provider = createDisabledLiveArtProvider({
        providerId: 'future_live_art_provider',
        credentialRefName: 'fake-live-secret-value'
      });
      const result = await resolveArtSources({
        projectRoot: root,
        plan: assetPlan(),
        intentManifest: assetIntentManifest(),
        provider
      });

      expect(fetchCalls).toBe(0);
      expect(provider.calls).toBe(1);
      expect(result).toMatchObject({
        ok: false,
        blockers: ['art_provider_live_call_not_allowed'],
        failures: [
          {
            assetId: 'player',
            assetIntentId: 'player_sprite',
            blockers: ['art_provider_live_call_not_allowed']
          }
        ]
      });
      expect(JSON.stringify(result)).not.toContain('fake-live-secret-value');

      const directProvider = createDisabledLiveArtProvider({
        providerId: 'future_live_art_provider',
        credentialRefName: 'fake-live-secret-value'
      });
      const directResult = await directProvider.generate(createArtProviderRequest(assetIntent(), 'live_disabled'));
      expect(directResult).toMatchObject({
        ok: false,
        credentialRef: {
          status: 'not_read'
        }
      });
      expect(JSON.stringify(directResult)).not.toContain('fake-live-secret-value');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('rejects raw provider output before runtime export can consume it', async () => {
    const provider = providerReturningRawOutput();
    const result = await resolveArtSources({
      projectRoot: root,
      plan: assetPlan(),
      intentManifest: assetIntentManifest(),
      provider
    });

    expect(result).toMatchObject({
      ok: false,
      blockers: ['provider_output_malformed'],
      summary: { providerCalls: 1 }
    });

    await expect(
      exportRuntimeArtAssetMetadataFromResolvedSources([
        {
          providerId: 'raw_output_provider',
          raw_provider_output: {
            prompt: 'raw provider payload must not enter runtime export',
            asset_id: 'asset_player_001'
          }
        }
      ])
    ).resolves.toMatchObject({
      ok: false,
      diagnostics: [expect.objectContaining({ code: 'ART_ASSET_METADATA_RUNTIME_EXPORT_RAW_PROVIDER_OUTPUT_REJECTED' })]
    });
  });

  it('fails closed when provider success envelope does not match the request', async () => {
    const provider = providerReturningMismatchedEnvelope();

    await expect(
      resolveArtSources({
        projectRoot: root,
        plan: assetPlan(),
        intentManifest: assetIntentManifest(),
        provider
      })
    ).resolves.toMatchObject({
      ok: false,
      blockers: ['provider_output_malformed'],
      failures: [
        {
          assetId: 'player',
          assetIntentId: 'player_sprite',
          blockers: ['provider_output_malformed']
        }
      ]
    });
  });

  it('does not call providers when manual_locked and provider-generated candidates both exist', async () => {
    await writeLocalAsset('artist_drop/manual_player.png', 'manual-player-art');
    const provider = createDisabledLiveArtProvider({ providerId: 'future_live_art_provider' });

    const result = await resolveArtSources({
      projectRoot: root,
      plan: assetPlan(),
      intentManifest: assetIntentManifest(),
      sourceManifest: artSourceManifest([providerSourceRecord(), manualSourceRecord()]),
      provider
    });

    expect(provider.calls).toBe(0);
    expect(result).toMatchObject({
      ok: true,
      blockers: [],
      assets: [
        {
          selectedSourceType: 'manual_locked',
          sourcePriority: 1,
          sourceManifestId: 'manual_player_sprite',
          providerId: undefined,
          locked: true,
          providerMayReplace: false
        }
      ]
    });
  });

  async function writeLocalAsset(relativePath: string, content: string): Promise<void> {
    const filePath = join(root, relativePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content, 'utf8');
  }
});

function providerReturningRawOutput(): ArtProvider {
  let calls = 0;
  return {
    providerId: 'raw_output_provider',
    mode: 'deterministic_fake',
    capabilities: {
      deterministic: true,
      network: 'forbidden',
      credentials: 'not_required',
      binaryWrites: 'forbidden',
      rawOutputMayBypassNormalization: false
    },
    get calls() {
      return calls;
    },
    async generate(request: ArtProviderRequest) {
      calls += 1;
      return {
        ok: true,
        providerId: 'raw_output_provider',
        providerMode: 'deterministic_fake',
        assetIntentId: request.intent.id,
        outputKind: 'art_source_manifest_record',
        source: {
          raw_provider_output: {
            prompt: 'raw provider payload must fail normalization',
            assetPlanId: request.intent.assetPlanId
          }
        }
      };
    }
  };
}

function providerReturningMismatchedEnvelope(): ArtProvider {
  let calls = 0;
  return {
    providerId: 'mismatched_envelope_provider',
    mode: 'deterministic_fake',
    capabilities: {
      deterministic: true,
      network: 'forbidden',
      credentials: 'not_required',
      binaryWrites: 'forbidden',
      rawOutputMayBypassNormalization: false
    },
    get calls() {
      return calls;
    },
    async generate(request: ArtProviderRequest) {
      calls += 1;
      return {
        ok: true,
        providerId: 'mismatched_envelope_provider',
        providerMode: 'deterministic_fake',
        assetIntentId: `${request.intent.id}_other`,
        outputKind: 'art_source_manifest_record',
        source: providerSourceRecord()
      };
    }
  };
}

function artSourceManifest(records: ArtSourceManifest['records']): ArtSourceManifest {
  return {
    version: 'art-source-manifest-v0.1',
    projectId: 'proj_loop6',
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

function assetPlan(): AssetPlan {
  return {
    version: 'asset-plan-v0.1',
    projectId: 'proj_loop6',
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

function assetIntentManifest(): AssetIntentManifest {
  return {
    version: 'asset-intent-manifest-v0.1',
    projectId: 'proj_loop6',
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
  return {
    asset_id: 'asset_player_001',
    project_code: 'proj_loop6',
    asset_type: 'character',
    asset_subtype: 'sprite',
    title: sourceType === 'provider_generated' ? 'Provider Player Sprite' : 'Manual Locked Player Sprite',
    description:
      sourceType === 'provider_generated'
        ? 'Provider-generated player sprite metadata for Loop6 resolver tests.'
        : 'Manual locked local player sprite metadata for Loop6 resolver tests.',
    version: '1.0.0',
    status: sourceType === 'provider_generated' ? 'generated' : 'approved',
    semantic: {
      world: 'loop6_test_world',
      subject: ['player', 'runner'],
      semantic_tags: ['player', 'runner'],
      visual_style: ['stylized'],
      mood: ['heroic']
    },
    gameplay: {
      gameplay_role: ['player_character'],
      affordances: ['animated'],
      allowed_contexts: ['loop6_test_world'],
      blocked_contexts: []
    },
    technical: {
      source_path: 'artist_drop/manual_player.png',
      thumbnail_path: 'artist_drop/manual_player.png',
      file_format: 'png',
      engine_targets: ['web'],
      texture_resolution: '128x128',
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
      owner: 'loop6_test',
      license: 'internal_project_only',
      commercial_use: false,
      training_use_allowed: false,
      third_party_sources: [],
      rights_risk_level: 'low'
    },
    workflow: {
      owner: 'loop6_test',
      reviewed_by: sourceType === 'provider_generated' ? null : 'art_director',
      review_notes: sourceType === 'provider_generated' ? 'Provider-generated test metadata requires review.' : 'Approved manual source.',
      updated_at: '2026-07-04',
      approved_at: sourceType === 'provider_generated' ? null : '2026-07-04'
    },
    relations: {
      derived_from: [],
      depends_on: [],
      compatible_with: [],
      used_by: ['loop6_test']
    },
    search: {
      embedding_input: 'loop6 player runner'
    }
  };
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
