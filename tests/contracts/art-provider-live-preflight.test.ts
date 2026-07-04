import { describe, expect, it } from 'vitest';

import {
  readArtProviderLivePreflightFromEnv,
  resolveArtProviderLivePreflight
} from '../../packages/asset-pipeline/src/index.js';

describe('Loop8 art provider live-lane preflight gate', () => {
  it('fails closed by default with every live-lane prerequisite missing', () => {
    const result = resolveArtProviderLivePreflight();

    expect(result).toMatchObject({
      ok: false,
      version: 'art-provider-live-preflight-v0.1',
      requestedProvider: 'live',
      effectiveProvider: 'live_disabled',
      liveProviderRequested: true,
      allowLiveProvider: false,
      executionEnabled: false,
      status: 'blocked',
      blockers: [
        'art_provider_live_call_not_allowed',
        'art_provider_live_network_not_allowed',
        'art_provider_live_credentials_missing',
        'art_provider_live_cost_not_acknowledged',
        'art_provider_live_artifact_write_not_approved'
      ],
      errorCode: 'art_provider_live_call_not_allowed'
    });
  });

  it('blocks live requests until explicit allow, network, credential, cost, and artifact-write prerequisites are present', () => {
    const otherwiseReady = {
      requestedProvider: 'live',
      allowNetwork: true,
      credentialAvailable: true,
      costAcknowledged: true,
      budgetLimitCents: 2500,
      artifactWriteIntent: 'write-through-approved'
    };

    expect(resolveArtProviderLivePreflight(otherwiseReady)).toMatchObject({
      ok: false,
      blockers: ['art_provider_live_call_not_allowed'],
      network: { status: 'allowed' },
      credential: { status: 'available_without_ref' },
      cost: { status: 'acknowledged' },
      artifactWrite: { status: 'approved' }
    });

    expect(resolveArtProviderLivePreflight({ ...otherwiseReady, allowLiveProvider: true, allowNetwork: false })).toMatchObject({
      ok: false,
      blockers: ['art_provider_live_network_not_allowed'],
      network: { status: 'missing' }
    });

    expect(
      resolveArtProviderLivePreflight({
        ...otherwiseReady,
        allowLiveProvider: true,
        credentialAvailable: false,
        credentialRef: undefined
      })
    ).toMatchObject({
      ok: false,
      blockers: ['art_provider_live_credentials_missing'],
      credential: { status: 'missing' }
    });

    expect(resolveArtProviderLivePreflight({ ...otherwiseReady, allowLiveProvider: true, costAcknowledged: false })).toMatchObject({
      ok: false,
      blockers: ['art_provider_live_cost_not_acknowledged'],
      cost: { status: 'missing' }
    });

    expect(resolveArtProviderLivePreflight({ ...otherwiseReady, allowLiveProvider: true, budgetLimitCents: undefined })).toMatchObject({
      ok: false,
      blockers: ['art_provider_live_cost_not_acknowledged'],
      cost: { status: 'missing' }
    });

    expect(resolveArtProviderLivePreflight({ ...otherwiseReady, allowLiveProvider: true, artifactWriteIntent: 'dry-run' })).toMatchObject({
      ok: false,
      blockers: ['art_provider_live_artifact_write_not_approved'],
      artifactWrite: { status: 'not_approved' }
    });
  });

  it('keeps fake and disabled-live selections deterministic without live prerequisites', () => {
    expect(resolveArtProviderLivePreflight({ requestedProvider: 'fake' })).toMatchObject({
      ok: true,
      requestedProvider: 'fake',
      effectiveProvider: 'deterministic_fake',
      liveProviderRequested: false,
      executionEnabled: false,
      status: 'not_required',
      blockers: [],
      network: { status: 'not_required' },
      credential: { status: 'not_required' },
      cost: { status: 'not_required' },
      artifactWrite: { status: 'not_required' }
    });

    expect(resolveArtProviderLivePreflight({ requestedProvider: 'disabled-live' })).toMatchObject({
      ok: true,
      requestedProvider: 'disabled-live',
      effectiveProvider: 'live_disabled',
      liveProviderRequested: false,
      executionEnabled: false,
      status: 'disabled',
      blockers: []
    });
  });

  it('marks fully satisfied live preflight ready while still disabling live execution', () => {
    const result = resolveArtProviderLivePreflight({
      requestedProvider: 'live',
      allowLiveProvider: true,
      allowNetwork: true,
      credentialRef: 'credential-ref-live-art-provider',
      costAcknowledged: true,
      budgetLimitCents: 2500,
      artifactWriteIntent: 'write-through-approved'
    });

    expect(result).toMatchObject({
      ok: true,
      requestedProvider: 'live',
      effectiveProvider: 'live_disabled',
      liveProviderRequested: true,
      allowLiveProvider: true,
      executionEnabled: false,
      status: 'preflight_ready_provider_unimplemented',
      blockers: [],
      credential: {
        status: 'referenced',
        credentialRefPresent: true
      },
      cost: {
        status: 'acknowledged',
        budgetLimitCents: 2500
      },
      artifactWrite: {
        status: 'approved',
        intent: 'write-through-approved'
      }
    });
    expect(JSON.stringify(result)).not.toContain('credential-ref-live-art-provider');
  });

  it('returns typed invalid results for malformed provider modes or preflight fields', () => {
    expect(resolveArtProviderLivePreflight({ requestedProvider: 'cloud-real-vendor' })).toMatchObject({
      ok: false,
      status: 'invalid',
      requestedProviderRaw: 'cloud-real-vendor',
      blockers: ['art_provider_policy_invalid_mode'],
      errorCode: 'art_provider_policy_invalid_mode'
    });

    expect(
      resolveArtProviderLivePreflight({
        requestedProvider: 'live',
        allowLiveProvider: true,
        allowNetwork: true,
        credentialAvailable: true,
        costAcknowledged: true,
        budgetLimitCents: -1,
        artifactWriteIntent: 'teleport-assets'
      })
    ).toMatchObject({
      ok: false,
      status: 'invalid',
      blockers: ['art_provider_live_preflight_invalid'],
      errorCode: 'art_provider_live_preflight_invalid',
      invalidFields: ['budgetLimitCents', 'artifactWriteIntent']
    });
  });

  it('builds env-like preflight input from a plain object without reading or leaking global secrets', () => {
    const envInput = readArtProviderLivePreflightFromEnv({
      AI_GEME_ART_PROVIDER: 'live',
      AI_GEME_ALLOW_LIVE_ART_PROVIDER: 'true',
      AI_GEME_ALLOW_LIVE_ART_NETWORK: 'true',
      AI_GEME_ART_PROVIDER_CREDENTIAL_REF: 'secret-value-must-not-be-returned',
      AI_GEME_ART_PROVIDER_COST_ACKNOWLEDGED: 'true',
      AI_GEME_ART_PROVIDER_BUDGET_LIMIT_CENTS: '2500',
      AI_GEME_ART_PROVIDER_ARTIFACT_WRITE_INTENT: 'write-through-approved',
      DEEPSEEK_API_KEY: 'must-not-be-read'
    });

    expect(envInput).toEqual({
      requestedProvider: 'live',
      allowLiveProvider: true,
      allowNetwork: true,
      credentialAvailable: true,
      costAcknowledged: true,
      budgetLimitCents: 2500,
      artifactWriteIntent: 'write-through-approved'
    });
    expect(JSON.stringify(envInput)).not.toContain('secret-value-must-not-be-returned');
    expect(JSON.stringify(envInput)).not.toContain('must-not-be-read');
  });
});
