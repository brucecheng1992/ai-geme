import { describe, expect, it } from 'vitest';

import {
  createArtProviderLivePreflightEvidence,
  createArtProviderLivePreflightReport,
  readArtProviderPolicyFromEnv,
  resolveArtProviderLivePreflight,
  resolveArtProviderPolicy,
  resolveArtSources,
  type AssetIntent,
  type AssetIntentManifest,
  type AssetPlan
} from '../../packages/asset-pipeline/src/index.js';

describe('Loop9 live-preflight consumer evidence', () => {
  it('builds typed deterministic fail-closed evidence for missing live allow', () => {
    const preflight = resolveArtProviderLivePreflight();
    const first = createArtProviderLivePreflightEvidence(preflight);
    const second = createArtProviderLivePreflightEvidence(preflight);

    expect(first).toEqual(second);
    expect(first).toEqual({
      contractVersion: 'art-provider-live-preflight-evidence-v0.1',
      source: 'art_provider_live_preflight',
      requestedProvider: 'live',
      effectiveProvider: 'live_disabled',
      liveRequested: true,
      liveAllowed: false,
      executionEnabled: false,
      readinessStatus: 'blocked',
      blockerCodes: [
        'art_provider_live_artifact_write_not_approved',
        'art_provider_live_call_not_allowed',
        'art_provider_live_cost_not_acknowledged',
        'art_provider_live_credentials_missing',
        'art_provider_live_network_not_allowed'
      ],
      errorCode: 'art_provider_live_call_not_allowed',
      invalidFieldNames: [],
      credentialEvidence: {
        credentialRefPresent: false,
        credentialAvailable: false
      },
      networkPermission: false,
      costAcknowledged: false,
      artifactWriteApproved: false,
      summaryCode: 'live_preflight_blocked'
    });
  });

  it('does not expose secret-like credential references in evidence or reports', () => {
    const preflight = resolveArtProviderLivePreflight({
      requestedProvider: 'live',
      allowLiveProvider: true,
      allowNetwork: false,
      credentialRef: 'sk-live-secret-123',
      credentialAvailable: true,
      costAcknowledged: true,
      budgetLimitCents: 2500,
      artifactWriteIntent: 'write-through-approved'
    });
    const evidence = createArtProviderLivePreflightEvidence(preflight);
    const report = createArtProviderLivePreflightReport(evidence);

    expect(evidence).toMatchObject({
      blockerCodes: ['art_provider_live_network_not_allowed'],
      credentialEvidence: {
        credentialRefPresent: true,
        credentialAvailable: true,
        credentialRefKind: 'unknown'
      },
      networkPermission: false,
      costAcknowledged: true,
      artifactWriteApproved: true
    });
    expect(report).toMatchObject({
      contractVersion: 'art-provider-live-preflight-report-v0.1',
      source: 'art_provider_live_preflight_report',
      evidenceContractVersion: 'art-provider-live-preflight-evidence-v0.1',
      blockerCodes: ['art_provider_live_network_not_allowed'],
      invalidFieldNames: [],
      liveExecution: {
        requested: true,
        allowed: true,
        enabled: false
      },
      blockerCount: 1,
      invalidFieldCount: 0
    });
    expect(JSON.stringify({ evidence, report })).not.toContain('sk-live-secret-123');
  });

  it('keeps credentialAvailable-without-ref fail-closed without leaking credential values', () => {
    const evidence = createArtProviderLivePreflightEvidence(
      resolveArtProviderLivePreflight({
        requestedProvider: 'live',
        allowLiveProvider: true,
        allowNetwork: true,
        credentialAvailable: true,
        costAcknowledged: true,
        budgetLimitCents: 2500,
        artifactWriteIntent: 'write-through-approved'
      })
    );

    expect(evidence).toMatchObject({
      blockerCodes: ['art_provider_live_credentials_missing'],
      credentialEvidence: {
        credentialRefPresent: false,
        credentialAvailable: true
      },
      executionEnabled: false
    });
    expect(JSON.stringify(evidence)).not.toMatch(/credentialRef[^P]/);
  });

  it('sorts malformed env-like field evidence and ignores live-only invalid fields for fake or disabled-live', () => {
    const liveInput = readArtProviderPolicyFromEnv({
      AI_GEME_ART_PROVIDER: 'live',
      AI_GEME_ALLOW_LIVE_ART_PROVIDER: 'maybe',
      AI_GEME_ALLOW_LIVE_ART_NETWORK: '1',
      AI_GEME_ART_PROVIDER_CREDENTIAL_AVAILABLE: 'yes',
      AI_GEME_ART_PROVIDER_COST_ACKNOWLEDGED: 'no',
      AI_GEME_ART_PROVIDER_BUDGET_LIMIT_CENTS: 'not-a-number'
    });
    const liveEvidence = createArtProviderLivePreflightEvidence(resolveArtProviderLivePreflight({ requestedProvider: 'live', ...liveInput }));

    expect(liveEvidence).toMatchObject({
      readinessStatus: 'invalid',
      blockerCodes: ['art_provider_live_preflight_invalid'],
      invalidFieldNames: ['allowLiveProvider', 'allowNetwork', 'budgetLimitCents', 'costAcknowledged', 'credentialAvailable'],
      summaryCode: 'live_preflight_invalid'
    });

    expect(
      createArtProviderLivePreflightEvidence(
        resolveArtProviderLivePreflight({
          requestedProvider: 'fake',
          invalidEnvFields: ['allowNetwork', 'credentialAvailable']
        })
      )
    ).toMatchObject({
      liveRequested: false,
      readinessStatus: 'not_required',
      blockerCodes: [],
      invalidFieldNames: []
    });

    expect(
      createArtProviderLivePreflightEvidence(
        resolveArtProviderLivePreflight({
          requestedProvider: 'disabled-live',
          invalidEnvFields: ['allowNetwork', 'credentialAvailable']
        })
      )
    ).toMatchObject({
      liveRequested: false,
      readinessStatus: 'disabled',
      blockerCodes: [],
      invalidFieldNames: []
    });
  });

  it('reports fully satisfied live preflight as execution-disabled pending implementation', () => {
    const evidence = createArtProviderLivePreflightEvidence(
      resolveArtProviderLivePreflight({
        requestedProvider: 'live',
        allowLiveProvider: true,
        allowNetwork: true,
        credentialRef: 'env:AI_GEME_ART_PROVIDER_CREDENTIAL_REF',
        credentialAvailable: true,
        costAcknowledged: true,
        budgetLimitCents: 2500,
        artifactWriteIntent: 'write-through-approved'
      })
    );

    expect(evidence).toMatchObject({
      liveRequested: true,
      liveAllowed: true,
      executionEnabled: false,
      readinessStatus: 'preflight_ready_provider_unimplemented',
      blockerCodes: [],
      invalidFieldNames: [],
      credentialEvidence: {
        credentialRefPresent: true,
        credentialAvailable: true,
        credentialRefKind: 'unknown'
      },
      summaryCode: 'live_provider_disabled_pending_implementation'
    });
  });

  it('attaches sanitized evidence to policy and resolver consumers without enabling live execution', async () => {
    const policyFailure = resolveArtProviderPolicy({ requestedMode: 'live' });
    expect(policyFailure).toMatchObject({
      ok: false,
      blocker: 'art_provider_live_call_not_allowed',
      livePreflightEvidence: {
        executionEnabled: false,
        summaryCode: 'live_preflight_blocked',
        blockerCodes: expect.arrayContaining(['art_provider_live_call_not_allowed'])
      }
    });

    const policyReady = resolveArtProviderPolicy({
      requestedMode: 'live',
      allowLiveProvider: true,
      allowNetwork: true,
      credentialRef: 'sk-live-secret-123',
      credentialAvailable: true,
      costAcknowledged: true,
      budgetLimitCents: 2500,
      artifactWriteIntent: 'write-through-approved'
    });
    expect(policyReady).toMatchObject({
      ok: true,
      providerMode: 'live_disabled',
      livePreflightEvidence: {
        executionEnabled: false,
        summaryCode: 'live_provider_disabled_pending_implementation',
        blockerCodes: []
      }
    });
    expect(JSON.stringify(policyReady)).not.toContain('sk-live-secret-123');

    const resolverReport = await resolveArtSources({
      plan: assetPlan(),
      intentManifest: assetIntentManifest(),
      providerPolicy: {
        requestedMode: 'live',
        allowLiveProvider: true,
        allowNetwork: true,
        credentialRef: 'sk-live-secret-123',
        credentialAvailable: true,
        costAcknowledged: true,
        budgetLimitCents: 2500,
        artifactWriteIntent: 'write-through-approved'
      }
    });

    expect(resolverReport).toMatchObject({
      ok: false,
      blockers: ['art_provider_live_call_not_allowed'],
      summary: { providerCalls: 1 },
      livePreflightEvidence: [
        {
          executionEnabled: false,
          summaryCode: 'live_provider_disabled_pending_implementation',
          blockerCodes: []
        }
      ]
    });
    expect(JSON.stringify(resolverReport)).not.toContain('sk-live-secret-123');
  });
});

function assetPlan(): AssetPlan {
  return {
    version: 'asset-plan-v0.1',
    projectId: 'proj_loop9',
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
    projectId: 'proj_loop9',
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
