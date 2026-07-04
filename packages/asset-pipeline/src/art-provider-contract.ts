import type { AssetIntent } from './asset-intent-manifest.js';

export const ART_PROVIDER_CONTRACT_VERSION = 'art-provider-contract-v0.1' as const;

export type ArtProviderMode = 'deterministic_fake' | 'live_disabled';

export type ArtProviderErrorCode =
  | 'art_provider_live_call_not_allowed'
  | 'art_provider_policy_invalid_mode'
  | 'art_provider_generation_failed'
  | 'art_provider_output_malformed'
  | 'art_provider_secret_access_not_allowed';

export type ArtProviderResolutionBlocker =
  | 'art_provider_live_call_not_allowed'
  | 'art_provider_policy_invalid_mode'
  | 'provider_generation_failed'
  | 'provider_output_malformed';

export type ArtProviderCapabilities = {
  deterministic: boolean;
  network: 'forbidden' | 'requires_future_approval';
  credentials: 'not_required' | 'read_forbidden';
  binaryWrites: 'forbidden';
  rawOutputMayBypassNormalization: false;
};

export type ArtProviderRequest = {
  contractVersion: typeof ART_PROVIDER_CONTRACT_VERSION;
  mode: ArtProviderMode;
  intent: AssetIntent;
  safety: {
    allowNetwork: false;
    allowCredentialRead: false;
    allowArtifactWrite: false;
  };
};

export type ArtProviderFailure = {
  ok: false;
  providerId: string;
  providerMode: ArtProviderMode;
  assetIntentId: string;
  errorCode: ArtProviderErrorCode;
  blocker: ArtProviderResolutionBlocker;
  message: string;
  credentialRef?: {
    status: 'not_read';
  };
};

export type ArtProviderSuccess = {
  ok: true;
  providerId: string;
  providerMode: ArtProviderMode;
  assetIntentId: string;
  outputKind: 'art_source_manifest_record';
  source: unknown;
};

export type ArtProviderResult = ArtProviderFailure | ArtProviderSuccess;

export type ArtProvider = {
  readonly providerId: string;
  readonly mode: ArtProviderMode;
  readonly capabilities: ArtProviderCapabilities;
  readonly calls: number;
  generate(request: ArtProviderRequest): Promise<ArtProviderResult>;
};

export type DisabledLiveArtProviderOptions = {
  providerId?: string;
  credentialRefName?: string;
};

export const DETERMINISTIC_FAKE_ART_PROVIDER_CAPABILITIES: ArtProviderCapabilities = {
  deterministic: true,
  network: 'forbidden',
  credentials: 'not_required',
  binaryWrites: 'forbidden',
  rawOutputMayBypassNormalization: false
};

export const DISABLED_LIVE_ART_PROVIDER_CAPABILITIES: ArtProviderCapabilities = {
  deterministic: false,
  network: 'requires_future_approval',
  credentials: 'read_forbidden',
  binaryWrites: 'forbidden',
  rawOutputMayBypassNormalization: false
};

export function createArtProviderRequest(intent: AssetIntent, mode: ArtProviderMode): ArtProviderRequest {
  return {
    contractVersion: ART_PROVIDER_CONTRACT_VERSION,
    mode,
    intent,
    safety: {
      allowNetwork: false,
      allowCredentialRead: false,
      allowArtifactWrite: false
    }
  };
}

/**
 * Represents the future live-provider lane while keeping Loop6 strictly no-network.
 * It never checks process.env, imports SDKs, writes artifacts, or calls fetch.
 */
export function createDisabledLiveArtProvider(options: DisabledLiveArtProviderOptions = {}): ArtProvider {
  const providerId = options.providerId ?? 'disabled_live_art_provider';
  let calls = 0;

  return {
    providerId,
    mode: 'live_disabled',
    capabilities: DISABLED_LIVE_ART_PROVIDER_CAPABILITIES,
    get calls() {
      return calls;
    },
    async generate(request: ArtProviderRequest): Promise<ArtProviderResult> {
      calls += 1;
      return {
        ok: false,
        providerId,
        providerMode: 'live_disabled',
        assetIntentId: request.intent.id,
        errorCode: 'art_provider_live_call_not_allowed',
        blocker: 'art_provider_live_call_not_allowed',
        message: 'Live art provider calls are disabled by policy.',
        ...(options.credentialRefName === undefined ? {} : { credentialRef: { status: 'not_read' } })
      };
    }
  };
}
