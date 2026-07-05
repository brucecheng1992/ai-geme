import type { ArtProviderErrorCode, ArtProviderMode, ArtProviderResolutionBlocker } from './art-provider-contract.js';

export const ART_PROVIDER_LIVE_PREFLIGHT_VERSION = 'art-provider-live-preflight-v0.1' as const;

export type ArtProviderLivePreflightRequestedProvider = 'fake' | 'live' | 'disabled-live';
export type ArtProviderLivePreflightArtifactWriteIntent = 'none' | 'dry-run' | 'write-through-approved';
export type ArtProviderLivePreflightStatus = 'not_required' | 'disabled' | 'blocked' | 'invalid' | 'preflight_ready_provider_unimplemented';
export type ArtProviderLivePreflightBlocker = Extract<
  ArtProviderResolutionBlocker,
  | 'art_provider_live_call_not_allowed'
  | 'art_provider_live_network_not_allowed'
  | 'art_provider_live_credentials_missing'
  | 'art_provider_live_cost_not_acknowledged'
  | 'art_provider_live_artifact_write_not_approved'
  | 'art_provider_live_preflight_invalid'
  | 'art_provider_policy_invalid_mode'
>;
export type ArtProviderLivePreflightErrorCode = Extract<ArtProviderErrorCode, ArtProviderLivePreflightBlocker>;

export type ArtProviderLivePreflightInput = {
  requestedProvider?: string;
  allowLiveProvider?: boolean;
  allowNetwork?: boolean;
  credentialRef?: string;
  credentialAvailable?: boolean;
  costAcknowledged?: boolean;
  budgetLimitCents?: number;
  artifactWriteIntent?: string;
  invalidEnvFields?: string[];
};

export type ArtProviderLivePreflightResult = {
  ok: boolean;
  version: typeof ART_PROVIDER_LIVE_PREFLIGHT_VERSION;
  requestedProvider: ArtProviderLivePreflightRequestedProvider;
  requestedProviderRaw?: string;
  effectiveProvider: ArtProviderMode;
  liveProviderRequested: boolean;
  allowLiveProvider: boolean;
  executionEnabled: false;
  status: ArtProviderLivePreflightStatus;
  blockers: ArtProviderLivePreflightBlocker[];
  errorCode?: ArtProviderLivePreflightErrorCode;
  invalidFields: string[];
  network: {
    status: 'allowed' | 'missing' | 'not_required';
    allowNetwork: boolean;
  };
  credential: {
    status: 'ready' | 'referenced_unavailable' | 'available_without_ref' | 'missing' | 'not_required';
    credentialRefPresent: boolean;
    credentialAvailable: boolean;
  };
  cost: {
    status: 'acknowledged' | 'missing' | 'invalid' | 'not_required';
    costAcknowledged: boolean;
    budgetLimitCents?: number;
  };
  artifactWrite: {
    status: 'approved' | 'not_approved' | 'missing' | 'invalid' | 'not_required';
    intent?: ArtProviderLivePreflightArtifactWriteIntent;
  };
};

type LiveAuditState = Pick<ArtProviderLivePreflightResult, 'network' | 'credential' | 'cost' | 'artifactWrite'>;

/**
 * Evaluates future live-provider prerequisites without reading secrets, touching
 * process.env, calling the network, or writing artifacts.
 */
export function resolveArtProviderLivePreflight(input: ArtProviderLivePreflightInput = {}): ArtProviderLivePreflightResult {
  const requestedProviderRaw = normalizeString(input.requestedProvider);
  const requestedProvider = requestedProviderRaw === undefined ? 'live' : parseRequestedProvider(requestedProviderRaw);
  const allowLiveProvider = input.allowLiveProvider === true;
  const invalidEnvFields = uniqueFields(input.invalidEnvFields ?? []);

  if (requestedProvider === undefined) {
    return buildPreflightResult({
      ok: false,
      requestedProvider: 'live',
      requestedProviderRaw,
      effectiveProvider: 'live_disabled',
      liveProviderRequested: true,
      allowLiveProvider,
      status: 'invalid',
      blockers: ['art_provider_policy_invalid_mode'],
      invalidFields: uniqueFields(['requestedProvider', ...invalidEnvFields]),
      audit: auditStateForLive(input)
    });
  }

  if (requestedProvider === 'fake') {
    return buildPreflightResult({
      ok: true,
      requestedProvider,
      requestedProviderRaw,
      effectiveProvider: 'deterministic_fake',
      liveProviderRequested: false,
      allowLiveProvider,
      status: 'not_required',
      blockers: [],
      invalidFields: [],
      audit: notRequiredAuditState(input)
    });
  }

  if (requestedProvider === 'disabled-live') {
    return buildPreflightResult({
      ok: true,
      requestedProvider,
      requestedProviderRaw,
      effectiveProvider: 'live_disabled',
      liveProviderRequested: false,
      allowLiveProvider,
      status: 'disabled',
      blockers: [],
      invalidFields: [],
      audit: notRequiredAuditState(input)
    });
  }

  if (invalidEnvFields.length > 0) {
    return buildPreflightResult({
      ok: false,
      requestedProvider,
      requestedProviderRaw,
      effectiveProvider: 'live_disabled',
      liveProviderRequested: true,
      allowLiveProvider,
      status: 'invalid',
      blockers: ['art_provider_live_preflight_invalid'],
      invalidFields: invalidEnvFields,
      audit: auditStateForLive(input)
    });
  }

  const audit = auditStateForLive(input);
  const invalidFields = invalidLivePreflightFields(input, audit);
  if (invalidFields.length > 0) {
    return buildPreflightResult({
      ok: false,
      requestedProvider,
      requestedProviderRaw,
      effectiveProvider: 'live_disabled',
      liveProviderRequested: true,
      allowLiveProvider,
      status: 'invalid',
      blockers: ['art_provider_live_preflight_invalid'],
      invalidFields,
      audit
    });
  }

  const blockers = livePreflightBlockers(allowLiveProvider, audit);
  return buildPreflightResult({
    ok: blockers.length === 0,
    requestedProvider,
    requestedProviderRaw,
    effectiveProvider: 'live_disabled',
    liveProviderRequested: true,
    allowLiveProvider,
    status: blockers.length === 0 ? 'preflight_ready_provider_unimplemented' : 'blocked',
    blockers,
    invalidFields: [],
    audit
  });
}

/**
 * Converts env-like input into sanitized preflight input without touching global
 * process.env or returning credential values.
 */
export function readArtProviderLivePreflightFromEnv(env: Record<string, string | undefined>): ArtProviderLivePreflightInput {
  const requestedProvider = normalizeString(env.AI_GEME_ART_PROVIDER);
  const allowLiveProvider = parseBooleanEnvField('allowLiveProvider', env.AI_GEME_ALLOW_LIVE_ART_PROVIDER);
  const allowNetwork = parseBooleanEnvField('allowNetwork', env.AI_GEME_ALLOW_LIVE_ART_NETWORK);
  const credentialRefPresent = hasNonEmptyString(env.AI_GEME_ART_PROVIDER_CREDENTIAL_REF);
  const credentialAvailable = parseBooleanEnvField('credentialAvailable', env.AI_GEME_ART_PROVIDER_CREDENTIAL_AVAILABLE);
  const costAcknowledged = parseBooleanEnvField('costAcknowledged', env.AI_GEME_ART_PROVIDER_COST_ACKNOWLEDGED);
  const budgetLimitCents = parseNumberEnvField('budgetLimitCents', env.AI_GEME_ART_PROVIDER_BUDGET_LIMIT_CENTS);
  const artifactWriteIntent = normalizeString(env.AI_GEME_ART_PROVIDER_ARTIFACT_WRITE_INTENT);
  const invalidEnvFields = uniqueFields([
    allowLiveProvider.invalidField,
    allowNetwork.invalidField,
    credentialAvailable.invalidField,
    costAcknowledged.invalidField,
    budgetLimitCents.invalidField
  ].filter((field): field is string => field !== undefined));

  return {
    ...(requestedProvider === undefined ? {} : { requestedProvider }),
    ...(allowLiveProvider.value === undefined ? {} : { allowLiveProvider: allowLiveProvider.value }),
    ...(allowNetwork.value === undefined ? {} : { allowNetwork: allowNetwork.value }),
    ...(credentialRefPresent ? { credentialRef: 'env:AI_GEME_ART_PROVIDER_CREDENTIAL_REF' } : {}),
    ...(credentialAvailable.value === undefined ? {} : { credentialAvailable: credentialAvailable.value }),
    ...(costAcknowledged.value === undefined ? {} : { costAcknowledged: costAcknowledged.value }),
    ...(budgetLimitCents.value === undefined ? {} : { budgetLimitCents: budgetLimitCents.value }),
    ...(artifactWriteIntent === undefined ? {} : { artifactWriteIntent }),
    ...(invalidEnvFields.length === 0 ? {} : { invalidEnvFields })
  };
}

function buildPreflightResult(input: {
  ok: boolean;
  requestedProvider: ArtProviderLivePreflightRequestedProvider;
  requestedProviderRaw: string | undefined;
  effectiveProvider: ArtProviderMode;
  liveProviderRequested: boolean;
  allowLiveProvider: boolean;
  status: ArtProviderLivePreflightStatus;
  blockers: ArtProviderLivePreflightBlocker[];
  invalidFields: string[];
  audit: LiveAuditState;
}): ArtProviderLivePreflightResult {
  const blockers = uniqueBlockers(input.blockers);
  const errorCode = blockers[0];
  return {
    ok: input.ok,
    version: ART_PROVIDER_LIVE_PREFLIGHT_VERSION,
    requestedProvider: input.requestedProvider,
    ...(input.requestedProviderRaw === undefined || input.requestedProviderRaw === input.requestedProvider ? {} : { requestedProviderRaw: input.requestedProviderRaw }),
    effectiveProvider: input.effectiveProvider,
    liveProviderRequested: input.liveProviderRequested,
    allowLiveProvider: input.allowLiveProvider,
    executionEnabled: false,
    status: input.status,
    blockers,
    ...(errorCode === undefined ? {} : { errorCode }),
    invalidFields: input.invalidFields,
    ...input.audit
  };
}

function livePreflightBlockers(
  allowLiveProvider: boolean,
  audit: LiveAuditState
): ArtProviderLivePreflightBlocker[] {
  const blockers: ArtProviderLivePreflightBlocker[] = [];
  if (!allowLiveProvider) blockers.push('art_provider_live_call_not_allowed');
  if (audit.network.status !== 'allowed') blockers.push('art_provider_live_network_not_allowed');
  if (audit.credential.status !== 'ready') blockers.push('art_provider_live_credentials_missing');
  if (audit.cost.status !== 'acknowledged') blockers.push('art_provider_live_cost_not_acknowledged');
  if (audit.artifactWrite.status !== 'approved') blockers.push('art_provider_live_artifact_write_not_approved');
  return blockers;
}

function auditStateForLive(input: ArtProviderLivePreflightInput): LiveAuditState {
  const credentialRefPresent = hasNonEmptyString(input.credentialRef);
  const credentialAvailable = input.credentialAvailable === true;
  const credentialReady = credentialRefPresent && credentialAvailable;
  const artifactWriteIntent = parseArtifactWriteIntent(input.artifactWriteIntent);
  const budgetLimitCents = input.budgetLimitCents;
  const budgetValid = isValidBudgetLimitCents(budgetLimitCents);
  const budgetInvalid = budgetLimitCents !== undefined && !budgetValid;
  const artifactIntentInvalid = input.artifactWriteIntent !== undefined && artifactWriteIntent === undefined;

  return {
    network: {
      status: input.allowNetwork === true ? 'allowed' : 'missing',
      allowNetwork: input.allowNetwork === true
    },
    credential: {
      status: credentialReady
        ? 'ready'
        : credentialRefPresent
          ? 'referenced_unavailable'
          : credentialAvailable
            ? 'available_without_ref'
            : 'missing',
      credentialRefPresent,
      credentialAvailable
    },
    cost: {
      status: budgetInvalid ? 'invalid' : input.costAcknowledged === true && budgetValid ? 'acknowledged' : 'missing',
      costAcknowledged: input.costAcknowledged === true,
      ...(budgetLimitCents === undefined ? {} : { budgetLimitCents })
    },
    artifactWrite: {
      status: artifactIntentInvalid
        ? 'invalid'
        : artifactWriteIntent === 'write-through-approved'
          ? 'approved'
          : artifactWriteIntent === undefined || artifactWriteIntent === 'none'
            ? 'missing'
            : 'not_approved',
      ...(artifactWriteIntent === undefined ? {} : { intent: artifactWriteIntent })
    }
  };
}

function notRequiredAuditState(input: ArtProviderLivePreflightInput): LiveAuditState {
  return {
    network: { status: 'not_required', allowNetwork: input.allowNetwork === true },
    credential: {
      status: 'not_required',
      credentialRefPresent: hasNonEmptyString(input.credentialRef),
      credentialAvailable: input.credentialAvailable === true
    },
    cost: {
      status: 'not_required',
      costAcknowledged: input.costAcknowledged === true,
      ...(input.budgetLimitCents === undefined ? {} : { budgetLimitCents: input.budgetLimitCents })
    },
    artifactWrite: { status: 'not_required' }
  };
}

function invalidLivePreflightFields(input: ArtProviderLivePreflightInput, audit: LiveAuditState): string[] {
  const invalidFields: string[] = [...(input.invalidEnvFields ?? [])];
  if (input.budgetLimitCents !== undefined && audit.cost.status === 'invalid') invalidFields.push('budgetLimitCents');
  if (input.artifactWriteIntent !== undefined && audit.artifactWrite.status === 'invalid') invalidFields.push('artifactWriteIntent');
  return uniqueFields(invalidFields);
}

function parseRequestedProvider(value: string): ArtProviderLivePreflightRequestedProvider | undefined {
  if (value === 'fake' || value === 'deterministic_fake') return 'fake';
  if (value === 'live') return 'live';
  if (value === 'disabled-live' || value === 'disabled_live' || value === 'live_disabled') return 'disabled-live';
  return undefined;
}

function parseArtifactWriteIntent(value: string | undefined): ArtProviderLivePreflightArtifactWriteIntent | undefined {
  const normalized = normalizeString(value);
  if (normalized === undefined) return undefined;
  if (normalized === 'none' || normalized === 'dry-run' || normalized === 'dry_run' || normalized === 'write-through-approved' || normalized === 'write_through_approved') {
    return normalized.replace(/_/g, '-') as ArtProviderLivePreflightArtifactWriteIntent;
  }
  return undefined;
}

function parseBooleanEnvField(field: string, value: string | undefined): { value?: boolean; invalidField?: string } {
  const normalized = normalizeString(value);
  if (normalized === undefined) return {};
  if (normalized === 'true') return { value: true };
  if (normalized === 'false') return { value: false };
  return { invalidField: field };
}

function parseNumberEnvField(field: string, value: string | undefined): { value?: number; invalidField?: string } {
  const normalized = normalizeString(value);
  if (normalized === undefined) return {};
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? { value: parsed } : { invalidField: field };
}

function normalizeString(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
}

function hasNonEmptyString(value: string | undefined): boolean {
  return normalizeString(value) !== undefined;
}

function isValidBudgetLimitCents(value: number | undefined): value is number {
  return value !== undefined && Number.isInteger(value) && value > 0;
}

function uniqueBlockers(blockers: readonly ArtProviderLivePreflightBlocker[]): ArtProviderLivePreflightBlocker[] {
  return [...new Set(blockers)];
}

function uniqueFields(fields: readonly string[]): string[] {
  return [...new Set(fields)];
}
