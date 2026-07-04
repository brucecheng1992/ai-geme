import { describe, expect, it } from 'vitest';

import {
  resolveArtSources,
  type AssetIntent,
  type AssetIntentManifest,
  type AssetPlan,
  type ResolveArtSourcesInput
} from '../../packages/asset-pipeline/src/index.js';
import * as assetPipeline from '../../packages/asset-pipeline/src/index.js';

type PolicyApi = {
  resolveArtProviderPolicy?: (input?: unknown) => PolicyDecision;
  readArtProviderPolicyFromEnv?: (env: Record<string, string | undefined>) => unknown;
};

type PolicyDecision = {
  ok: boolean;
  version: string;
  source: string;
  requestedMode?: string;
  requestedModeRaw?: string;
  selectedMode: string;
  providerMode: string;
  allowLiveProvider: boolean;
  reason: string;
  blocker?: string;
  errorCode?: string;
};

const policyApi = assetPipeline as unknown as PolicyApi;

describe('Loop7 art provider policy gate', () => {
  it('defaults to deterministic fake policy without process env or network state', () => {
    expect(policyApi.resolveArtProviderPolicy).toBeTypeOf('function');

    const first = policyApi.resolveArtProviderPolicy?.();
    const second = policyApi.resolveArtProviderPolicy?.();

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      ok: true,
      version: 'art-provider-policy-v0.1',
      source: 'default',
      requestedMode: 'fake',
      selectedMode: 'deterministic_fake',
      providerMode: 'deterministic_fake',
      allowLiveProvider: false,
      reason: 'default_fake_provider'
    });
  });

  it('normalizes explicit and env-like policy input without reading global process.env', () => {
    expect(policyApi.resolveArtProviderPolicy).toBeTypeOf('function');
    expect(policyApi.readArtProviderPolicyFromEnv).toBeTypeOf('function');

    const fakePolicy = policyApi.resolveArtProviderPolicy?.({ requestedMode: 'fake', source: 'caller' });
    expect(fakePolicy).toMatchObject({
      ok: true,
      source: 'caller',
      requestedMode: 'fake',
      selectedMode: 'deterministic_fake',
      reason: 'explicit_fake_provider'
    });

    const envInput = policyApi.readArtProviderPolicyFromEnv?.({
      AI_GEME_ART_PROVIDER: 'live',
      AI_GEME_ALLOW_LIVE_ART_PROVIDER: 'true',
      DEEPSEEK_API_KEY: 'must-not-be-copied'
    });
    expect(envInput).toEqual({
      source: 'env',
      requestedMode: 'live',
      allowLiveProvider: true
    });

    const livePolicy = policyApi.resolveArtProviderPolicy?.(envInput);
    expect(livePolicy).toMatchObject({
      ok: true,
      source: 'env',
      requestedMode: 'live',
      selectedMode: 'live_disabled',
      providerMode: 'live_disabled',
      allowLiveProvider: true,
      reason: 'live_provider_disabled_pending_implementation'
    });
    expect(JSON.stringify({ envInput, livePolicy })).not.toContain('must-not-be-copied');
  });

  it('fails closed for live policy without explicit allow and for invalid provider modes', () => {
    expect(policyApi.resolveArtProviderPolicy).toBeTypeOf('function');

    expect(policyApi.resolveArtProviderPolicy?.({ requestedMode: 'live' })).toMatchObject({
      ok: false,
      requestedMode: 'live',
      selectedMode: 'live_disabled',
      providerMode: 'live_disabled',
      allowLiveProvider: false,
      blocker: 'art_provider_live_call_not_allowed',
      errorCode: 'art_provider_live_call_not_allowed',
      reason: 'live_provider_requires_explicit_allow'
    });

    expect(policyApi.resolveArtProviderPolicy?.({ requestedMode: 'cloud-real-vendor' })).toMatchObject({
      ok: false,
      requestedModeRaw: 'cloud-real-vendor',
      selectedMode: 'live_disabled',
      providerMode: 'live_disabled',
      blocker: 'art_provider_policy_invalid_mode',
      errorCode: 'art_provider_policy_invalid_mode',
      reason: 'invalid_provider_mode'
    });
  });

  it('routes explicit fake policy through deterministic provider behavior', async () => {
    const result = await resolveArtSources({
      plan: assetPlan(),
      intentManifest: assetIntentManifest(),
      providerPolicy: { requestedMode: 'fake' }
    } satisfies ResolveArtSourcesInput & { providerPolicy: { requestedMode: string } });

    expect(result).toMatchObject({
      ok: true,
      blockers: [],
      summary: { providerCalls: 1 },
      assets: [
        {
          selectedSourceType: 'provider_generated',
          providerId: 'deterministic_fake_art_provider',
          placeholder: false,
          fallback: false
        }
      ]
    });
  });

  it('routes live policy to fail-closed resolver blockers without network calls', async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      throw new Error('network calls are forbidden in art provider policy tests');
    }) as typeof fetch;

    try {
      const blockedLive = await resolveArtSources({
        plan: assetPlan(),
        intentManifest: assetIntentManifest(),
        providerPolicy: { requestedMode: 'live' }
      } satisfies ResolveArtSourcesInput & { providerPolicy: { requestedMode: string } });

      expect(fetchCalls).toBe(0);
      expect(blockedLive).toMatchObject({
        ok: false,
        blockers: ['art_provider_live_call_not_allowed'],
        summary: { providerCalls: 0 },
        failures: [
          {
            assetId: 'player',
            assetIntentId: 'player_sprite',
            blockers: ['art_provider_live_call_not_allowed']
          }
        ]
      });

      const allowedLive = await resolveArtSources({
        plan: assetPlan(),
        intentManifest: assetIntentManifest(),
        providerPolicy: { requestedMode: 'live', allowLiveProvider: true }
      } satisfies ResolveArtSourcesInput & { providerPolicy: { requestedMode: string; allowLiveProvider: boolean } });

      expect(fetchCalls).toBe(0);
      expect(allowedLive).toMatchObject({
        ok: false,
        blockers: ['art_provider_live_call_not_allowed'],
        summary: { providerCalls: 1 },
        failures: [
          {
            assetId: 'player',
            assetIntentId: 'player_sprite',
            blockers: ['art_provider_live_call_not_allowed']
          }
        ]
      });
      expect(JSON.stringify(allowedLive)).not.toMatch(/API_KEY|authorization|Bearer|secret/i);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns typed resolver blockers for invalid policy modes', async () => {
    const result = await resolveArtSources({
      plan: assetPlan(),
      intentManifest: assetIntentManifest(),
      providerPolicy: { requestedMode: 'cloud-real-vendor' }
    } satisfies ResolveArtSourcesInput & { providerPolicy: { requestedMode: string } });

    expect(result).toMatchObject({
      ok: false,
      blockers: ['art_provider_policy_invalid_mode'],
      summary: { providerCalls: 0 },
      failures: [
        {
          assetId: 'player',
          assetIntentId: 'player_sprite',
          blockers: ['art_provider_policy_invalid_mode']
        }
      ]
    });
  });
});

function assetPlan(): AssetPlan {
  return {
    version: 'asset-plan-v0.1',
    projectId: 'proj_loop7',
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
    projectId: 'proj_loop7',
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
