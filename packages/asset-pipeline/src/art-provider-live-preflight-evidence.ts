import { z } from 'zod';

import type { ArtProviderLivePreflightResult } from './art-provider-live-preflight.js';

export const ART_PROVIDER_LIVE_PREFLIGHT_EVIDENCE_VERSION = 'art-provider-live-preflight-evidence-v0.1' as const;

const LivePreflightRequestedProviderSchema = z.enum(['fake', 'live', 'disabled-live']);
const ArtProviderModeSchema = z.enum(['deterministic_fake', 'live_disabled']);
const LivePreflightStatusSchema = z.enum(['not_required', 'disabled', 'blocked', 'invalid', 'preflight_ready_provider_unimplemented']);
const LivePreflightBlockerSchema = z.enum([
  'art_provider_live_artifact_write_not_approved',
  'art_provider_live_call_not_allowed',
  'art_provider_live_cost_not_acknowledged',
  'art_provider_live_credentials_missing',
  'art_provider_live_network_not_allowed',
  'art_provider_live_preflight_invalid',
  'art_provider_policy_invalid_mode'
]);
const LivePreflightSummaryCodeSchema = z.enum([
  'live_preflight_not_required',
  'disabled_live_provider_selected',
  'live_preflight_invalid',
  'live_preflight_blocked',
  'live_provider_disabled_pending_implementation'
]);

export const ArtProviderLivePreflightEvidenceSchema = z.strictObject({
  contractVersion: z.literal(ART_PROVIDER_LIVE_PREFLIGHT_EVIDENCE_VERSION),
  source: z.literal('art_provider_live_preflight'),
  requestedProvider: LivePreflightRequestedProviderSchema,
  effectiveProvider: ArtProviderModeSchema,
  liveRequested: z.boolean(),
  liveAllowed: z.boolean(),
  executionEnabled: z.literal(false),
  readinessStatus: LivePreflightStatusSchema,
  blockerCodes: z.array(LivePreflightBlockerSchema),
  errorCode: LivePreflightBlockerSchema.optional(),
  invalidFieldNames: z.array(z.string().min(1)),
  credentialEvidence: z.strictObject({
    credentialRefPresent: z.boolean(),
    credentialAvailable: z.boolean(),
    credentialRefKind: z.enum(['env', 'marker', 'unknown']).optional()
  }),
  networkPermission: z.boolean(),
  costAcknowledged: z.boolean(),
  artifactWriteApproved: z.boolean(),
  summaryCode: LivePreflightSummaryCodeSchema
});

export type ArtProviderLivePreflightEvidence = z.infer<typeof ArtProviderLivePreflightEvidenceSchema>;
export type ArtProviderLivePreflightEvidenceSummaryCode = ArtProviderLivePreflightEvidence['summaryCode'];

/**
 * Converts the live-preflight result into a consumer-facing evidence contract.
 * The result only carries presence/status facts, so this function never sees or
 * emits raw credential references, raw env values, provider payloads, or assets.
 */
export function createArtProviderLivePreflightEvidence(preflight: ArtProviderLivePreflightResult): ArtProviderLivePreflightEvidence {
  const credentialEvidence = {
    credentialRefPresent: preflight.credential.credentialRefPresent,
    credentialAvailable: preflight.credential.credentialAvailable,
    ...(preflight.credential.credentialRefPresent ? { credentialRefKind: 'unknown' as const } : {})
  };

  return ArtProviderLivePreflightEvidenceSchema.parse({
    contractVersion: ART_PROVIDER_LIVE_PREFLIGHT_EVIDENCE_VERSION,
    source: 'art_provider_live_preflight',
    requestedProvider: preflight.requestedProvider,
    effectiveProvider: preflight.effectiveProvider,
    liveRequested: preflight.liveProviderRequested,
    liveAllowed: preflight.allowLiveProvider,
    executionEnabled: false,
    readinessStatus: preflight.status,
    blockerCodes: sortedUnique(preflight.blockers),
    ...(preflight.errorCode === undefined ? {} : { errorCode: preflight.errorCode }),
    invalidFieldNames: sortedUnique(preflight.invalidFields),
    credentialEvidence,
    networkPermission: preflight.network.allowNetwork,
    costAcknowledged: preflight.cost.costAcknowledged,
    artifactWriteApproved: preflight.artifactWrite.status === 'approved',
    summaryCode: summaryCodeFor(preflight)
  });
}

function summaryCodeFor(preflight: ArtProviderLivePreflightResult): ArtProviderLivePreflightEvidenceSummaryCode {
  if (preflight.status === 'not_required') return 'live_preflight_not_required';
  if (preflight.status === 'disabled') return 'disabled_live_provider_selected';
  if (preflight.status === 'invalid') return 'live_preflight_invalid';
  if (preflight.status === 'preflight_ready_provider_unimplemented') return 'live_provider_disabled_pending_implementation';
  return 'live_preflight_blocked';
}

function sortedUnique<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
