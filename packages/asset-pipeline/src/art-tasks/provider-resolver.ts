import type { ArtProviderAdapter, ProviderProfile } from '../art-providers/index.js';
import type { ArtTask, ProviderResolution, ProviderResolver } from './types.js';

export type StaticProviderResolverOptions = {
  providers: ArtProviderAdapter[];
  defaultProfile?: ProviderProfile;
  profiles?: ProviderProfile[];
  defaultProviderId?: string;
};

export function createStaticProviderResolver(options: StaticProviderResolverOptions): ProviderResolver {
  return new StaticProviderResolver(options);
}

class StaticProviderResolver implements ProviderResolver {
  private readonly providers: Map<string, ArtProviderAdapter>;
  private readonly profiles: ProviderProfile[];
  private readonly defaultProfile: ProviderProfile | undefined;
  private readonly defaultProviderId: string | undefined;

  constructor(options: StaticProviderResolverOptions) {
    this.providers = new Map(options.providers.map((provider) => [provider.providerId, provider]));
    this.profiles = options.profiles ?? [];
    this.defaultProfile = options.defaultProfile;
    this.defaultProviderId = options.defaultProviderId;
  }

  resolve(task: ArtTask): ProviderResolution {
    const explicitProfile = this.findProfile(task.providerSelection?.providerProfileId);
    const providerId = task.providerSelection?.providerId ?? explicitProfile?.providerId ?? this.defaultProfile?.providerId ?? this.defaultProviderId;
    if (providerId === undefined) {
      throw new Error(`No provider configured for ArtTask ${task.taskId}.`);
    }

    const adapter = this.providers.get(providerId);
    if (adapter === undefined) {
      throw new Error(`Art provider is not registered: ${providerId}.`);
    }

    const providerProfile = explicitProfile ?? (this.defaultProfile?.providerId === providerId ? this.defaultProfile : undefined);
    if (providerProfile !== undefined && !providerProfile.enabled) {
      throw new Error(`Art provider profile is disabled: ${providerProfile.providerProfileId}.`);
    }

    const manifestModel = adapter.getManifest().models.find((model) => model.capabilities.includes(task.requiredCapability));
    const modelId = task.providerSelection?.modelId ?? providerProfile?.defaults?.modelId ?? manifestModel?.modelId;
    if (modelId === undefined) {
      throw new Error(`Art provider ${providerId} does not expose a model for ${task.requiredCapability}.`);
    }

    return {
      providerId,
      modelId,
      providerProfile,
      adapter
    };
  }

  private findProfile(providerProfileId: string | undefined): ProviderProfile | undefined {
    if (providerProfileId === undefined) {
      return undefined;
    }
    const profile = this.profiles.find((candidate) => candidate.providerProfileId === providerProfileId);
    if (profile === undefined) {
      throw new Error(`Art provider profile not found: ${providerProfileId}.`);
    }
    return profile;
  }
}
