import { describe, expect, it } from 'vitest';

import {
  ArtProviderLiveDryRunResultSchema,
  createArtProviderLivePreflightEvidence,
  createArtProviderRequest,
  createLiveDryRunArtProvider,
  resolveArtProviderLivePreflight,
  resolveArtProviderPolicy,
  resolveArtSources,
  type AssetIntent,
  type AssetIntentManifest,
  type AssetPlan
} from '../../packages/asset-pipeline/src/index.js';

describe('Loop10 live provider dry-run adapter', () => {
  it('returns deterministic metadata-only dry-run results without network, credentials, binary payloads, or writes', async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      throw new Error('network calls are forbidden in live dry-run adapter tests');
    }) as typeof fetch;

    try {
      const evidence = readyLivePreflightEvidence('sk-live-secret-123');
      const firstProvider = createLiveDryRunArtProvider({ livePreflightEvidence: evidence });
      const secondProvider = createLiveDryRunArtProvider({ livePreflightEvidence: evidence });
      const request = createArtProviderRequest(assetIntent(), 'live_dry_run');

      const first = await firstProvider.generate(request);
      const second = await secondProvider.generate(request);

      expect(fetchCalls).toBe(0);
      expect(firstProvider.calls).toBe(1);
      expect(first).toEqual(second);
      expect(first).toMatchObject({
        ok: true,
        providerId: 'live_dry_run_art_provider',
        providerMode: 'live_dry_run',
        assetIntentId: 'player_sprite',
        outputKind: 'art_source_manifest_record',
        liveDryRunResult: {
          adapterMode: 'live-dry-run',
          executionMode: 'dry-run',
          dryRun: true,
          realLiveExecutionEnabled: false,
          status: 'ready',
          requestedProvider: 'live',
          providerMode: 'live_dry_run',
          artifactWrite: {
            artifactWriteApproved: true,
            wouldWriteArtifact: false
          },
          normalizedProviderResult: {
            outputKind: 'art_source_manifest_record',
            sourceType: 'provider_generated',
            contentType: 'metadata/json'
          },
          evidence: {
            summaryCode: 'live_provider_disabled_pending_implementation',
            blockerCodes: [],
            invalidFieldNames: []
          }
        }
      });
      expect(ArtProviderLiveDryRunResultSchema.parse(first.liveDryRunResult)).toEqual(first.liveDryRunResult);
      expect(JSON.stringify(first)).not.toContain('sk-live-secret-123');
      expect(JSON.stringify(first)).not.toMatch(/API_KEY|authorization|Bearer|secret|base64|Uint8Array|ArrayBuffer/i);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('fails closed with typed dry-run evidence when live preflight evidence is not ready', async () => {
    const evidence = createArtProviderLivePreflightEvidence(resolveArtProviderLivePreflight());
    const provider = createLiveDryRunArtProvider({ livePreflightEvidence: evidence });
    const result = await provider.generate(createArtProviderRequest(assetIntent(), 'live_dry_run'));

    expect(result).toMatchObject({
      ok: false,
      providerId: 'live_dry_run_art_provider',
      providerMode: 'live_dry_run',
      assetIntentId: 'player_sprite',
      errorCode: 'art_provider_live_call_not_allowed',
      blocker: 'art_provider_live_call_not_allowed',
      liveDryRunResult: {
        adapterMode: 'live-dry-run',
        executionMode: 'dry-run',
        dryRun: true,
        realLiveExecutionEnabled: false,
        status: 'blocked',
        evidence: {
          summaryCode: 'live_preflight_blocked',
          blockerCodes: expect.arrayContaining(['art_provider_live_call_not_allowed'])
        }
      }
    });
    expect(ArtProviderLiveDryRunResultSchema.parse(result.liveDryRunResult)).toEqual(result.liveDryRunResult);
  });

  it('keeps live policy fail-closed unless dry-run is explicitly requested and preflight-ready', () => {
    const readyPolicyInput = readyLivePolicyInput('sk-live-secret-123');

    expect(resolveArtProviderPolicy(readyPolicyInput)).toMatchObject({
      ok: true,
      selectedMode: 'live_disabled',
      providerMode: 'live_disabled',
      reason: 'live_provider_disabled_pending_implementation',
      livePreflightEvidence: {
        executionEnabled: false,
        summaryCode: 'live_provider_disabled_pending_implementation'
      }
    });

    const dryRunPolicy = resolveArtProviderPolicy({ ...readyPolicyInput, allowLiveDryRun: true });
    expect(dryRunPolicy).toMatchObject({
      ok: true,
      selectedMode: 'live_dry_run',
      providerMode: 'live_dry_run',
      reason: 'live_provider_dry_run_enabled',
      livePreflightEvidence: {
        executionEnabled: false,
        summaryCode: 'live_provider_disabled_pending_implementation',
        blockerCodes: []
      }
    });
    expect(JSON.stringify(dryRunPolicy)).not.toContain('sk-live-secret-123');
  });

  it('lets resolver/report consumers expose sanitized dry-run result and evidence without real live execution', async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      throw new Error('network calls are forbidden in resolver dry-run tests');
    }) as typeof fetch;

    try {
      const result = await resolveArtSources({
        plan: assetPlan(),
        intentManifest: assetIntentManifest(),
        providerPolicy: { ...readyLivePolicyInput('sk-live-secret-123'), allowLiveDryRun: true }
      });

      expect(fetchCalls).toBe(0);
      expect(result).toMatchObject({
        ok: true,
        blockers: [],
        summary: { providerCalls: 1 },
        assets: [
          {
            selectedSourceType: 'provider_generated',
            providerId: 'live_dry_run_art_provider',
            placeholder: false,
            fallback: false,
            liveDryRunResult: {
              adapterMode: 'live-dry-run',
              executionMode: 'dry-run',
              dryRun: true,
              realLiveExecutionEnabled: false,
              status: 'ready'
            }
          }
        ],
        livePreflightEvidence: [
          {
            executionEnabled: false,
            summaryCode: 'live_provider_disabled_pending_implementation',
            blockerCodes: []
          }
        ],
        liveDryRunResults: [
          {
            adapterMode: 'live-dry-run',
            executionMode: 'dry-run',
            dryRun: true,
            realLiveExecutionEnabled: false,
            status: 'ready'
          }
        ]
      });
      expect(JSON.stringify(result)).not.toContain('sk-live-secret-123');
      expect(JSON.stringify(result)).not.toMatch(/API_KEY|authorization|Bearer|secret|base64|Uint8Array|ArrayBuffer/i);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('lets resolver/report consumers expose blocked dry-run evidence without leaking credentials', async () => {
    const result = await resolveArtSources({
      plan: assetPlan(),
      intentManifest: assetIntentManifest(),
      providerPolicy: {
        requestedMode: 'live',
        allowLiveProvider: true,
        allowLiveDryRun: true,
        allowNetwork: false,
        credentialRef: 'sk-live-secret-123',
        credentialAvailable: false,
        costAcknowledged: false,
        budgetLimitCents: 2500,
        artifactWriteIntent: 'none'
      }
    });

    expect(result).toMatchObject({
      ok: false,
      blockers: ['art_provider_live_network_not_allowed'],
      summary: { providerCalls: 1 },
      failures: [
        {
          assetId: 'player',
          assetIntentId: 'player_sprite',
          blockers: ['art_provider_live_network_not_allowed'],
          liveDryRunResult: {
            adapterMode: 'live-dry-run',
            executionMode: 'dry-run',
            dryRun: true,
            realLiveExecutionEnabled: false,
            status: 'blocked',
            evidence: {
              summaryCode: 'live_preflight_blocked',
              blockerCodes: expect.arrayContaining(['art_provider_live_network_not_allowed', 'art_provider_live_credentials_missing']),
              invalidFieldNames: []
            }
          }
        }
      ],
      livePreflightEvidence: [
        {
          executionEnabled: false,
          summaryCode: 'live_preflight_blocked',
          blockerCodes: expect.arrayContaining(['art_provider_live_network_not_allowed', 'art_provider_live_credentials_missing'])
        }
      ],
      liveDryRunResults: [
        {
          adapterMode: 'live-dry-run',
          executionMode: 'dry-run',
          dryRun: true,
          realLiveExecutionEnabled: false,
          status: 'blocked'
        }
      ]
    });
    expect(JSON.stringify(result)).not.toContain('sk-live-secret-123');
    expect(JSON.stringify(result)).not.toMatch(/API_KEY|authorization|Bearer|secret|base64|Uint8Array|ArrayBuffer/i);
  });

  it('keeps fake and disabled-live behavior unaffected by dry-run-only live fields', async () => {
    const fake = await resolveArtSources({
      plan: assetPlan(),
      intentManifest: assetIntentManifest(),
      providerPolicy: {
        requestedMode: 'fake',
        allowLiveDryRun: true,
        invalidEnvFields: ['allowNetwork', 'credentialAvailable']
      }
    });
    expect(fake).toMatchObject({
      ok: true,
      blockers: [],
      summary: { providerCalls: 1 },
      assets: [{ providerId: 'deterministic_fake_art_provider' }]
    });

    const disabledLive = await resolveArtSources({
      plan: assetPlan(),
      intentManifest: assetIntentManifest(),
      providerPolicy: {
        requestedMode: 'disabled-live',
        allowLiveDryRun: true,
        invalidEnvFields: ['allowNetwork', 'credentialAvailable']
      }
    });
    expect(disabledLive).toMatchObject({
      ok: false,
      blockers: ['art_provider_live_call_not_allowed'],
      summary: { providerCalls: 1 },
      failures: [{ blockers: ['art_provider_live_call_not_allowed'] }]
    });

    expect(resolveArtProviderPolicy({ ...readyLivePolicyInput('sk-live-secret-123'), allowLiveDryRun: true, invalidEnvFields: ['allowNetwork'] })).toMatchObject({
      ok: false,
      selectedMode: 'live_disabled',
      providerMode: 'live_disabled',
      blocker: 'art_provider_live_preflight_invalid',
      preflight: {
        status: 'invalid',
        invalidFields: ['allowNetwork']
      }
    });
  });
});

function readyLivePreflightEvidence(credentialRef: string) {
  return createArtProviderLivePreflightEvidence(
    resolveArtProviderLivePreflight({
      requestedProvider: 'live',
      allowLiveProvider: true,
      allowNetwork: true,
      credentialRef,
      credentialAvailable: true,
      costAcknowledged: true,
      budgetLimitCents: 2500,
      artifactWriteIntent: 'write-through-approved'
    })
  );
}

function readyLivePolicyInput(credentialRef: string) {
  return {
    requestedMode: 'live',
    allowLiveProvider: true,
    allowNetwork: true,
    credentialRef,
    credentialAvailable: true,
    costAcknowledged: true,
    budgetLimitCents: 2500,
    artifactWriteIntent: 'write-through-approved'
  };
}

function assetPlan(): AssetPlan {
  return {
    version: 'asset-plan-v0.1',
    projectId: 'proj_loop10',
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
    projectId: 'proj_loop10',
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
