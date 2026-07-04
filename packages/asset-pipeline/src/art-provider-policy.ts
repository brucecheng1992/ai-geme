import type { ArtProviderErrorCode, ArtProviderMode, ArtProviderResolutionBlocker } from './art-provider-contract.js';

export const ART_PROVIDER_POLICY_VERSION = 'art-provider-policy-v0.1' as const;

export type ArtProviderPolicyRequestedMode = 'fake' | 'live' | 'disabled-live';
export type ArtProviderPolicySource = 'default' | 'caller' | 'env';
export type ArtProviderPolicyReason =
  | 'default_fake_provider'
  | 'explicit_fake_provider'
  | 'disabled_live_provider_selected'
  | 'live_provider_requires_explicit_allow'
  | 'live_provider_disabled_pending_implementation'
  | 'invalid_provider_mode';
export type ArtProviderPolicyBlocker = Extract<
  ArtProviderResolutionBlocker,
  'art_provider_live_call_not_allowed' | 'art_provider_policy_invalid_mode'
>;
export type ArtProviderPolicyErrorCode = Extract<
  ArtProviderErrorCode,
  'art_provider_live_call_not_allowed' | 'art_provider_policy_invalid_mode'
>;

export type ArtProviderPolicyInput = {
  requestedMode?: string;
  allowLiveProvider?: boolean;
  source?: ArtProviderPolicySource;
};

export type ArtProviderPolicySuccess = {
  ok: true;
  version: typeof ART_PROVIDER_POLICY_VERSION;
  source: ArtProviderPolicySource;
  requestedMode: ArtProviderPolicyRequestedMode;
  selectedMode: ArtProviderMode;
  providerMode: ArtProviderMode;
  allowLiveProvider: boolean;
  reason: ArtProviderPolicyReason;
  requestedModeRaw?: string;
};

export type ArtProviderPolicyFailure = {
  ok: false;
  version: typeof ART_PROVIDER_POLICY_VERSION;
  source: ArtProviderPolicySource;
  selectedMode: 'live_disabled';
  providerMode: 'live_disabled';
  allowLiveProvider: boolean;
  reason: ArtProviderPolicyReason;
  blocker: ArtProviderPolicyBlocker;
  errorCode: ArtProviderPolicyErrorCode;
  message: string;
  requestedMode?: ArtProviderPolicyRequestedMode;
  requestedModeRaw?: string;
};

export type ArtProviderPolicyResult = ArtProviderPolicySuccess | ArtProviderPolicyFailure;

/**
 * Resolves caller-supplied provider policy into a deterministic, auditable decision.
 * This pure boundary helper never reads process.env, credentials, SDKs, fetch, or files.
 */
export function resolveArtProviderPolicy(input: ArtProviderPolicyInput = {}): ArtProviderPolicyResult {
  const source = policySourceFor(input);
  const allowLiveProvider = input.allowLiveProvider === true;
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
        reason: 'disabled_live_provider_selected'
      },
      requestedModeRaw,
      requestedMode
    );
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
        reason: 'live_provider_requires_explicit_allow',
        blocker: 'art_provider_live_call_not_allowed',
        errorCode: 'art_provider_live_call_not_allowed',
        message: 'Live art provider selection requires explicit allowLiveProvider=true.'
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
      reason: 'live_provider_disabled_pending_implementation'
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
  const allowLiveProvider = parseBooleanEnv(env.AI_GEME_ALLOW_LIVE_ART_PROVIDER);

  return {
    source: 'env',
    ...(requestedMode === undefined ? {} : { requestedMode }),
    ...(allowLiveProvider === undefined ? {} : { allowLiveProvider })
  };
}

function policySourceFor(input: ArtProviderPolicyInput): ArtProviderPolicySource {
  if (input.source !== undefined) {
    return input.source;
  }
  if (input.requestedMode === undefined && input.allowLiveProvider === undefined) {
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

function parseBooleanEnv(value: string | undefined): boolean | undefined {
  const normalized = value?.trim().toLowerCase();
  if (normalized === undefined || normalized.length === 0) {
    return undefined;
  }
  return normalized === 'true';
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
