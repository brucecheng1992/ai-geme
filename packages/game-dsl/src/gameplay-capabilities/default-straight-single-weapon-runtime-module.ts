import type { DeclarativeJsonValue } from './declarative-json.js';
import type { PhaserRuntimeSystemModule } from './phaser-runtime-loader.js';

export const DEFAULT_STRAIGHT_SINGLE_WEAPON_CAPABILITY_ID = 'weapon.default_straight_single.v1';
export const DEFAULT_STRAIGHT_SINGLE_WEAPON_RUNTIME_SYSTEM_ID = `system.${DEFAULT_STRAIGHT_SINGLE_WEAPON_CAPABILITY_ID}`;
export const DEFAULT_STRAIGHT_SINGLE_WEAPON_COMPILED_ARTIFACT_KIND = 'weapon.default_straight_single.compiled.v1';

type DeclarativeJsonObject = { [key: string]: DeclarativeJsonValue };

export type DefaultStraightSingleWeaponRuntimeState = {
  installed: true;
  owner: {
    entityId: 'player';
    role: 'player';
  };
  loadout: {
    slot: 'primary';
    equipPolicy: 'initial_spawn';
  };
  projectilePattern: {
    kind: 'straight';
    projectileCount: 1;
  };
  fireAction: 'shoot_projectile';
  provenance: {
    artifactKind: typeof DEFAULT_STRAIGHT_SINGLE_WEAPON_COMPILED_ARTIFACT_KIND;
    canonicalSystemId: string;
    sourceDraftId: string;
  };
};

export type DefaultStraightSingleWeaponRuntimeSnapshot = DefaultStraightSingleWeaponRuntimeState | { installed: false };

export function createDefaultStraightSingleWeaponRuntimeModule(): PhaserRuntimeSystemModule {
  let state: DefaultStraightSingleWeaponRuntimeState | undefined;

  return {
    id: DEFAULT_STRAIGHT_SINGLE_WEAPON_RUNTIME_SYSTEM_ID,
    install: (_context, config) => {
      state = interpretDefaultStraightSingleWeaponConfig(config);
    },
    snapshot: () => snapshotDefaultStraightSingleWeaponRuntimeState(state),
    dispose: () => {
      state = undefined;
    }
  };
}

function interpretDefaultStraightSingleWeaponConfig(config: DeclarativeJsonObject): DefaultStraightSingleWeaponRuntimeState {
  if (config.artifactKind !== DEFAULT_STRAIGHT_SINGLE_WEAPON_COMPILED_ARTIFACT_KIND) {
    throw invalidConfig('/artifactKind', `expected ${DEFAULT_STRAIGHT_SINGLE_WEAPON_COMPILED_ARTIFACT_KIND}`);
  }

  const source = requiredRecord(config.source, '/source');
  const canonicalSystemId = requiredString(source.canonicalSystemId, '/source/canonicalSystemId');
  const sourceDraftId = requiredString(source.sourceDraftId, '/source/sourceDraftId');

  const owner = requiredRecord(config.owner, '/owner');
  if (owner.entityId !== 'player' || owner.role !== 'player') {
    throw invalidConfig('/owner', 'expected player owner');
  }

  const loadout = requiredRecord(config.loadout, '/loadout');
  if (loadout.slot !== 'primary' || loadout.equipPolicy !== 'initial_spawn') {
    throw invalidConfig('/loadout', 'expected primary initial_spawn loadout');
  }

  const projectilePattern = requiredRecord(config.projectilePattern, '/projectilePattern');
  if (projectilePattern.kind !== 'straight' || projectilePattern.projectileCount !== 1) {
    throw invalidConfig('/projectilePattern', 'expected straight single-projectile pattern');
  }

  if (config.fireAction !== 'shoot_projectile') {
    throw invalidConfig('/fireAction', 'expected shoot_projectile');
  }

  return {
    installed: true,
    owner: { entityId: 'player', role: 'player' },
    loadout: { slot: 'primary', equipPolicy: 'initial_spawn' },
    projectilePattern: { kind: 'straight', projectileCount: 1 },
    fireAction: 'shoot_projectile',
    provenance: {
      artifactKind: DEFAULT_STRAIGHT_SINGLE_WEAPON_COMPILED_ARTIFACT_KIND,
      canonicalSystemId,
      sourceDraftId
    }
  };
}

function snapshotDefaultStraightSingleWeaponRuntimeState(
  state: DefaultStraightSingleWeaponRuntimeState | undefined
): DeclarativeJsonObject {
  if (state === undefined) {
    return { installed: false };
  }
  return {
    installed: true,
    owner: { ...state.owner },
    loadout: { ...state.loadout },
    projectilePattern: { ...state.projectilePattern },
    fireAction: state.fireAction,
    provenance: { ...state.provenance }
  };
}

function requiredRecord(value: DeclarativeJsonValue | undefined, path: string): DeclarativeJsonObject {
  if (!isRecord(value)) {
    throw invalidConfig(path, 'expected object');
  }
  return value;
}

function requiredString(value: DeclarativeJsonValue | undefined, path: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw invalidConfig(path, 'expected non-empty string');
  }
  return value;
}

function invalidConfig(path: string, reason: string): Error {
  return new Error(`Default straight single weapon runtime config invalid at ${path}: ${reason}.`);
}

function isRecord(value: DeclarativeJsonValue | undefined): value is DeclarativeJsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
