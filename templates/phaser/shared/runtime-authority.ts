export type RuntimeAuthoritySnapshot = {
  authorityBundleRef: { artifactKind: 'authority_bundle'; path: 'authority_bundle.json'; bundleHash: string };
  activeProfileLockRef: { artifactKind: 'active_profile_lock'; path: 'active_profile_lock.json'; lockHash: string };
  profileId: string;
  runtimeTemplateId: string;
  runtimeTemplateManifestId: string;
  qaProfile: string;
};

export function buildRuntimeAuthoritySnapshot(authority: unknown): RuntimeAuthoritySnapshot {
  if (authority === null || typeof authority !== 'object') {
    throw new Error('runtime-authority.generated.json must contain an authority bundle object.');
  }
  const bundle = authority as {
    bundleHash?: unknown;
    refs?: { activeProfileLock?: unknown };
    activeProfileLock?: {
      profileId?: unknown;
      runtimeTemplateId?: unknown;
      runtimeTemplateManifestId?: unknown;
      qaProfile?: unknown;
    };
  };
  const activeProfileLockRef = readActiveProfileLockRef(bundle.refs?.activeProfileLock);
  if (
    typeof bundle.bundleHash !== 'string' ||
    activeProfileLockRef === undefined ||
    bundle.activeProfileLock === undefined ||
    typeof bundle.activeProfileLock.profileId !== 'string' ||
    typeof bundle.activeProfileLock.runtimeTemplateId !== 'string' ||
    typeof bundle.activeProfileLock.runtimeTemplateManifestId !== 'string' ||
    typeof bundle.activeProfileLock.qaProfile !== 'string'
  ) {
    throw new Error('runtime-authority.generated.json is missing required active profile authority fields.');
  }

  return {
    authorityBundleRef: { artifactKind: 'authority_bundle', path: 'authority_bundle.json', bundleHash: bundle.bundleHash },
    activeProfileLockRef,
    profileId: bundle.activeProfileLock.profileId,
    runtimeTemplateId: bundle.activeProfileLock.runtimeTemplateId,
    runtimeTemplateManifestId: bundle.activeProfileLock.runtimeTemplateManifestId,
    qaProfile: bundle.activeProfileLock.qaProfile
  };
}

function readActiveProfileLockRef(value: unknown): RuntimeAuthoritySnapshot['activeProfileLockRef'] | undefined {
  if (value === null || typeof value !== 'object') {
    return undefined;
  }

  const ref = value as { artifactKind?: unknown; path?: unknown; lockHash?: unknown };
  if (ref.artifactKind !== 'active_profile_lock' || ref.path !== 'active_profile_lock.json' || typeof ref.lockHash !== 'string') {
    return undefined;
  }

  return {
    artifactKind: 'active_profile_lock',
    path: 'active_profile_lock.json',
    lockHash: ref.lockHash
  };
}
