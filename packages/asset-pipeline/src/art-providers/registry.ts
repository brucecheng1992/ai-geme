import type { ArtProviderAdapter } from './types.js';

const registeredProviders = new Map<string, ArtProviderAdapter>();

export function registerProvider(adapter: ArtProviderAdapter): void {
  if (registeredProviders.has(adapter.providerId)) {
    throw new Error(`Art provider already registered: ${adapter.providerId}.`);
  }
  registeredProviders.set(adapter.providerId, adapter);
}

export function getProvider(providerId: string): ArtProviderAdapter | undefined {
  return registeredProviders.get(providerId);
}

export function listProviders(): ArtProviderAdapter[] {
  return Array.from(registeredProviders.values());
}

export function clearRegisteredArtProvidersForTests(): void {
  registeredProviders.clear();
}
