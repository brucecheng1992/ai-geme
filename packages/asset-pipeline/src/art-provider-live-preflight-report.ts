import type { ArtProviderLivePreflightEvidence } from './art-provider-live-preflight-evidence.js';

export const ART_PROVIDER_LIVE_PREFLIGHT_REPORT_VERSION = 'art-provider-live-preflight-report-v0.1' as const;

export type ArtProviderLivePreflightReport = {
  contractVersion: typeof ART_PROVIDER_LIVE_PREFLIGHT_REPORT_VERSION;
  source: 'art_provider_live_preflight_report';
  evidenceContractVersion: ArtProviderLivePreflightEvidence['contractVersion'];
  requestedProvider: ArtProviderLivePreflightEvidence['requestedProvider'];
  effectiveProvider: ArtProviderLivePreflightEvidence['effectiveProvider'];
  readinessStatus: ArtProviderLivePreflightEvidence['readinessStatus'];
  summaryCode: ArtProviderLivePreflightEvidence['summaryCode'];
  blockerCodes: ArtProviderLivePreflightEvidence['blockerCodes'];
  errorCode?: ArtProviderLivePreflightEvidence['errorCode'];
  invalidFieldNames: ArtProviderLivePreflightEvidence['invalidFieldNames'];
  liveExecution: {
    requested: boolean;
    allowed: boolean;
    enabled: false;
  };
  credentialEvidence: ArtProviderLivePreflightEvidence['credentialEvidence'];
  networkPermission: boolean;
  costAcknowledged: boolean;
  artifactWriteApproved: boolean;
  blockerCount: number;
  invalidFieldCount: number;
};

/**
 * Builds a stable report from sanitized evidence only. It does not inspect raw
 * env values, credential references, provider output, files, or network state.
 */
export function createArtProviderLivePreflightReport(evidence: ArtProviderLivePreflightEvidence): ArtProviderLivePreflightReport {
  const blockerCodes = sortedUnique(evidence.blockerCodes);
  const invalidFieldNames = sortedUnique(evidence.invalidFieldNames);
  return {
    contractVersion: ART_PROVIDER_LIVE_PREFLIGHT_REPORT_VERSION,
    source: 'art_provider_live_preflight_report',
    evidenceContractVersion: evidence.contractVersion,
    requestedProvider: evidence.requestedProvider,
    effectiveProvider: evidence.effectiveProvider,
    readinessStatus: evidence.readinessStatus,
    summaryCode: evidence.summaryCode,
    blockerCodes,
    ...(evidence.errorCode === undefined ? {} : { errorCode: evidence.errorCode }),
    invalidFieldNames,
    liveExecution: {
      requested: evidence.liveRequested,
      allowed: evidence.liveAllowed,
      enabled: false
    },
    credentialEvidence: { ...evidence.credentialEvidence },
    networkPermission: evidence.networkPermission,
    costAcknowledged: evidence.costAcknowledged,
    artifactWriteApproved: evidence.artifactWriteApproved,
    blockerCount: blockerCodes.length,
    invalidFieldCount: invalidFieldNames.length
  };
}

function sortedUnique<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
