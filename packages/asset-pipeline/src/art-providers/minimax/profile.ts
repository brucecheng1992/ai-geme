import type { ProviderProfile } from '../types.js';
import { MINIMAX_DEFAULT_IMAGE_MODEL, MINIMAX_PROVIDER_ID } from './manifest.js';

export function createMiniMaxProviderProfileFromEnv(env: Record<string, string | undefined> = process.env): ProviderProfile {
  return {
    providerProfileId: 'minimax-env',
    providerId: MINIMAX_PROVIDER_ID,
    auth: {
      mode: 'env',
      apiKeyRef: 'MINIMAX_API_KEY'
    },
    defaults: {
      modelId: normalizeEnvValue(env.MINIMAX_IMAGE_MODEL) ?? MINIMAX_DEFAULT_IMAGE_MODEL,
      imageCount: 1,
      aspectRatio: '1:1',
      responseFormat: 'base64'
    },
    enabled: env.RUN_MINIMAX_LIVE_TESTS === '1'
  };
}

function normalizeEnvValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}
