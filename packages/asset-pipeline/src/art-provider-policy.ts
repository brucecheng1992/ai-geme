import type { ArtProviderErrorCode, ArtProviderMode, ArtProviderResolutionBlocker } from './art-provider-contract.js';
import {
  createArtProviderLivePreflightEvidence,
  type ArtProviderLivePreflightEvidence
} from './art-provider-live-preflight-evidence.js';
import {
  readArtProviderLivePreflightFromEnv,
  resolveArtProviderLivePreflight,
  type ArtProviderLivePreflightInput,
  type ArtProviderLivePreflightResult
} from './art-provider-live-preflight.js';

export const ART_PROVIDER_POLICY_VERSION = 'art-provider-policy-v0.1' as const;

export type ArtProviderPolicyRequestedMode = 'fake' | 'live' | 'disabled-live';
export type ArtProviderPolicySource = 'default' | 'caller' | 'env';
export type ArtProviderPolicyReason =
  | 'default_fake_provider'
  | 'explicit_fake_provider'
  | 'disabled_live_provider_selected'
  | 'live_provider_requires_explicit_allow'
  | 'live_provider_preflight_blocked'
  | 'live_provider_disabled_pending_implementation'
  | 'live_provider_dry_run_enabled'
  | 'invalid_provider_mode';
export type ArtProviderPolicyBlocker = Extract<
  ArtProviderResolutionBlocker,
  | 'art_provider_live_call_not_allowed'
  | 'art_provider_policy_invalid_mode'
  | 'art_provider_live_network_not_allowed'
  | 'art_provider_live_credentials_missing'
  | 'art_provider_live_cost_not_acknowledged'
  | 'art_provider_live_artifact_write_not_approved'
  | 'art_provider_live_preflight_invalid'
>;
export type ArtProviderPolicyErrorCode = Extract<ArtProviderErrorCode, ArtProviderPolicyBlocker>;

export type ArtProviderPolicyInput = {
  requestedMode?: string;
  allowLiveProvider?: boolean;
  allowLiveDryRun?: boolean;
  source?: ArtProviderPolicySource;
} & Pick<
  ArtProviderLivePreflightInput,
  | 'allowNetwork'
  | 'credentialRef'
  | 'credentialAvailable'
  | 'costAcknowledged'
  | 'budgetLimitCents'
  | 'artifactWriteIntent'
  | 'invalidEnvFields'
>;

export type ArtProviderPolicySuccess = {
  ok: true;
  version: typeof ART_PROVIDER_POLICY_VERSION;
  source: ArtProviderPolicySource;
  requestedMode: ArtProviderPolicyRequestedMode;
  selectedMode: ArtProviderMode;
  providerMode: ArtProviderMode;
  allowLiveProvider: boolean;
  allowLiveDryRun: boolean;
  reason: ArtProviderPolicyReason;
  requestedModeRaw?: string;
  preflight?: ArtProviderLivePreflightResult;
  livePreflightEvidence?: ArtProviderLivePreflightEvidence;
};

export type ArtProviderPolicyFailure = {
  ok: false;
  version: typeof ART_PROVIDER_POLICY_VERSION;
  source: ArtProviderPolicySource;
  selectedMode: 'live_disabled';
  providerMode: 'live_disabled';
  allowLiveProvider: boolean;
  allowLiveDryRun: boolean;
  reason: ArtProviderPolicyReason;
  blocker: ArtProviderPolicyBlocker;
  errorCode: ArtProviderPolicyErrorCode;
  message: string;
  requestedMode?: ArtProviderPolicyRequestedMode;
  requestedModeRaw?: string;
  preflight?: ArtProviderLivePreflightResult;
  livePreflightEvidence?: ArtProviderLivePreflightEvidence;
};

export type ArtProviderPolicyResult = ArtProviderPolicySuccess | ArtProviderPolicyFailure;

/**
 * Resolves caller-supplied provider policy into a deterministic, auditable decision.
 * This pure boundary helper never reads process.env, credentials, SDKs, fetch, or files.
 */
export function resolveArtProviderPolicy(input: ArtProviderPolicyInput = {}): ArtProviderPolicyResult {
  const source = policySourceFor(input);
  const allowLiveProvider = input.allowLiveProvider === true;
  const allowLiveDryRun = input.allowLiveDryRun === true;
  const requestedModeRaw = normalizeRawMode(input.requestedMode);
  const requestedMode = requestedModeRaw === undefined ? 'fake' : parseRequestedMode(requestedModeRaw);

  if (requestedMode === undefined) {
    return {
      ok: false,
      version: ART_PROVIDER_POLICY_VERSION,
      source,
      selectedMode: 'live_disabled',
      providerMode: 'live_disabled',
      allowLiveProvider,
      allowLiveDryRun,
      reason: 'invalid_provider_mode',
      blocker: 'art_provider_policy_invalid_mode',
      errorCode: 'art_provider_policy_invalid_mode',
      message: `Unsupported art provider mode: ${requestedModeRaw ?? 'undefined'}.`,
      ...(requestedModeRaw === undefined ? {} : { requestedModeRaw })
    };
  }

  if (requestedMode === 'fake') {
    return withOptionalRawMode(
      {
        ok: true,
        version: ART_PROVIDER_POLICY_VERSION,
        source,
        requestedMode,
        selectedMode: 'deterministic_fake',
        providerMode: 'deterministic_fake',
        allowLiveProvider,
        allowLiveDryRun,
        reason: source === 'default' ? 'default_fake_provider' : 'explicit_fake_provider'
      },
      requestedModeRaw,
      requestedMode
    );
  }

  if (requestedMode === 'disabled-live') {
    return withOptionalRawMode(
      {
        ok: true,
        version: ART_PROVIDER_POLICY_VERSION,
        source,
        requestedMode,
        selectedMode: 'live_disabled',
        providerMode: 'live_disabled',
        allowLiveProvider,
        allowLiveDryRun,
        reason: 'disabled_live_provider_selected'
      },
      requestedModeRaw,
      requestedMode
    );
  }

  const preflightInput: ArtProviderLivePreflightInput = {
    requestedProvider: requestedMode,
    allowLiveProvider,
    allowNetwork: input.allowNetwork,
    credentialRef: input.credentialRef,
    credentialAvailable: input.credentialAvailable,
    costAcknowledged: input.costAcknowledged,
    budgetLimitCents: input.budgetLimitCents,
    artifactWriteIntent: input.artifactWriteIntent,
    invalidEnvFields: input.invalidEnvFields
  };
  const preflight = resolveArtProviderLivePreflight(preflightInput);
  const livePreflightEvidence = createArtProviderLivePreflightEvidence(preflight);

  if (input.invalidEnvFields !== undefined && input.invalidEnvFields.length > 0) {
    return preflightPolicyFailure(preflight, {
      source,
      requestedMode,
      requestedModeRaw,
      allowLiveProvider,
      allowLiveDryRun
    });
  }

  if (!allowLiveProvider) {
    return withOptionalRawMode(
      {
        ok: false,
        version: ART_PROVIDER_POLICY_VERSION,
        source,
        requestedMode,
        selectedMode: 'live_disabled',
        providerMode: 'live_disabled',
        allowLiveProvider,
        allowLiveDryRun,
        reason: 'live_provider_requires_explicit_allow',
        blocker: 'art_provider_live_call_not_allowed',
        errorCode: 'art_provider_live_call_not_allowed',
        message: 'Live art provider selection requires explicit allowLiveProvider=true.',
        preflight,
        livePreflightEvidence
      },
      requestedModeRaw,
      requestedMode
    );
  }

  if (!preflight.ok) {
    return preflightPolicyFailure(preflight, {
      source,
      requestedMode,
      requestedModeRaw,
      allowLiveProvider,
      allowLiveDryRun
    });
  }

  if (allowLiveDryRun) {
    return withOptionalRawMode(
      {
        ok: true,
        version: ART_PROVIDER_POLICY_VERSION,
        source,
        requestedMode,
        selectedMode: 'live_dry_run',
        providerMode: 'live_dry_run',
        allowLiveProvider,
        allowLiveDryRun,
        reason: 'live_provider_dry_run_enabled',
        preflight,
        livePreflightEvidence
      },
      requestedModeRaw,
      requestedMode
    );
  }

  return withOptionalRawMode(
    {
      ok: true,
      version: ART_PROVIDER_POLICY_VERSION,
      source,
      requestedMode,
      selectedMode: 'live_disabled',
      providerMode: 'live_disabled',
      allowLiveProvider,
      allowLiveDryRun,
      reason: 'live_provider_disabled_pending_implementation',
      preflight,
      livePreflightEvidence
    },
    requestedModeRaw,
    requestedMode
  );
}

/**
 * Converts env-like input into policy input without touching global process.env.
 */
export function readArtProviderPolicyFromEnv(env: Record<string, string | undefined>): ArtProviderPolicyInput {
  const requestedMode = normalizeRawMode(env.AI_GEME_ART_PROVIDER);
  const livePreflightInput = readArtProviderLivePreflightFromEnv(env);

  return {
    source: 'env',
    ...(requestedMode === undefined ? {} : { requestedMode }),
    ...(livePreflightInput.allowLiveProvider === undefined ? {} : { allowLiveProvider: livePreflightInput.allowLiveProvider }),
    ...(livePreflightInput.allowNetwork === undefined ? {} : { allowNetwork: livePreflightInput.allowNetwork }),
    ...(livePreflightInput.credentialRef === undefined ? {} : { credentialRef: livePreflightInput.credentialRef }),
    ...(livePreflightInput.credentialAvailable === undefined ? {} : { credentialAvailable: livePreflightInput.credentialAvailable }),
    ...(livePreflightInput.costAcknowledged === undefined ? {} : { costAcknowledged: livePreflightInput.costAcknowledged }),
    ...(livePreflightInput.budgetLimitCents === undefined ? {} : { budgetLimitCents: livePreflightInput.budgetLimitCents }),
    ...(livePreflightInput.artifactWriteIntent === undefined ? {} : { artifactWriteIntent: livePreflightInput.artifactWriteIntent }),
    ...(livePreflightInput.invalidEnvFields === undefined ? {} : { invalidEnvFields: livePreflightInput.invalidEnvFields })
  };
}

function policySourceFor(input: ArtProviderPolicyInput): ArtProviderPolicySource {
  if (input.source !== undefined) {
    return input.source;
  }
  if (
    input.requestedMode === undefined &&
    input.allowLiveProvider === undefined &&
    input.allowLiveDryRun === undefined &&
    input.allowNetwork === undefined &&
    input.credentialRef === undefined &&
    input.credentialAvailable === undefined &&
    input.costAcknowledged === undefined &&
    input.budgetLimitCents === undefined &&
    input.artifactWriteIntent === undefined &&
    input.invalidEnvFields === undefined
  ) {
    return 'default';
  }
  return 'caller';
}

function normalizeRawMode(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
}

function parseRequestedMode(value: string): ArtProviderPolicyRequestedMode | undefined {
  if (value === 'fake' || value === 'deterministic_fake') {
    return 'fake';
  }
  if (value === 'live') {
    return 'live';
  }
  if (value === 'disabled-live' || value === 'disabled_live' || value === 'live_disabled') {
    return 'disabled-live';
  }
  return undefined;
}

function withOptionalRawMode<T extends ArtProviderPolicyResult>(
  result: T,
  requestedModeRaw: string | undefined,
  requestedMode: ArtProviderPolicyRequestedMode
): T {
  if (requestedModeRaw === undefined || requestedModeRaw === requestedMode) {
    return result;
  }
  return { ...result, requestedModeRaw };
}

function preflightPolicyFailure(
  preflight: ArtProviderLivePreflightResult,
  context: {
    source: ArtProviderPolicySource;
    requestedMode: ArtProviderPolicyRequestedMode;
    requestedModeRaw: string | undefined;
    allowLiveProvider: boolean;
    allowLiveDryRun: boolean;
  }
): ArtProviderPolicyFailure {
  const blocker = preflight.blockers[0] ?? 'art_provider_live_preflight_invalid';
  return withOptionalRawMode(
    {
      ok: false,
      version: ART_PROVIDER_POLICY_VERSION,
      source: context.source,
      requestedMode: context.requestedMode,
      selectedMode: 'live_disabled',
      providerMode: 'live_disabled',
      allowLiveProvider: context.allowLiveProvider,
      allowLiveDryRun: context.allowLiveDryRun,
      reason: preflight.status === 'invalid' && blocker === 'art_provider_policy_invalid_mode' ? 'invalid_provider_mode' : 'live_provider_preflight_blocked',
      blocker,
      errorCode: blocker,
      message: `Live art provider preflight failed: ${preflight.blockers.join(', ')}.`,
      preflight,
      livePreflightEvidence: createArtProviderLivePreflightEvidence(preflight)
    },
    context.requestedModeRaw,
    context.requestedMode
  );
}
