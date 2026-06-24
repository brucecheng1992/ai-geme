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

export type DefaultStraightSingleWeaponFireInput = {
  ownerEntityId: string;
  action: string;
  origin: {
    x: number;
    y: number;
  };
  nowMs: number;
};

export type DefaultStraightSingleWeaponProjectileSpawn = {
  id: string;
  owner: 'player';
  sourceCapabilityId: typeof DEFAULT_STRAIGHT_SINGLE_WEAPON_CAPABILITY_ID;
  weaponSlot: 'primary';
  pattern: 'straight';
  projectileCount: 1;
  firedAtMs: number;
  position: {
    x: number;
    y: number;
  };
  trajectory: {
    kind: 'straight';
    vx: 1;
    vy: 0;
  };
};

export type DefaultStraightSingleWeaponTelemetryEvent =
  | {
      type: 'player.fired';
      payload: {
        owner: 'player';
        weaponSlot: 'primary';
        sourceCapabilityId: typeof DEFAULT_STRAIGHT_SINGLE_WEAPON_CAPABILITY_ID;
      };
    }
  | {
      type: 'projectile.spawned';
      payload: {
        projectileId: string;
        owner: 'player';
        sourceCapabilityId: typeof DEFAULT_STRAIGHT_SINGLE_WEAPON_CAPABILITY_ID;
        pattern: 'straight';
        projectileCount: 1;
      };
    };

export type DefaultStraightSingleWeaponFireResult =
  | {
      status: 'fired';
      projectileSpawns: [DefaultStraightSingleWeaponProjectileSpawn];
      telemetryEvents: [DefaultStraightSingleWeaponTelemetryEvent, DefaultStraightSingleWeaponTelemetryEvent];
    }
  | {
      status: 'blocked';
      reason: 'not_installed' | 'owner_mismatch' | 'action_mismatch';
      projectileSpawns: [];
      telemetryEvents: [];
    };

export type DefaultStraightSingleWeaponRuntimeModule = PhaserRuntimeSystemModule & {
  fire: (input: DefaultStraightSingleWeaponFireInput) => DefaultStraightSingleWeaponFireResult;
};

export function createDefaultStraightSingleWeaponRuntimeModule(): DefaultStraightSingleWeaponRuntimeModule {
  let state: DefaultStraightSingleWeaponRuntimeState | undefined;
  let fireSequence = 0;

  return {
    id: DEFAULT_STRAIGHT_SINGLE_WEAPON_RUNTIME_SYSTEM_ID,
    install: (_context, config) => {
      state = interpretDefaultStraightSingleWeaponConfig(config);
      fireSequence = 0;
    },
    fire: (input) => {
      const result = fireDefaultStraightSingleWeapon(state, input, fireSequence);
      if (result.status === 'fired') {
        fireSequence += 1;
      }
      return result;
    },
    snapshot: () => snapshotDefaultStraightSingleWeaponRuntimeState(state),
    dispose: () => {
      state = undefined;
      fireSequence = 0;
    }
  };
}

function fireDefaultStraightSingleWeapon(
  state: DefaultStraightSingleWeaponRuntimeState | undefined,
  input: DefaultStraightSingleWeaponFireInput,
  sequence: number
): DefaultStraightSingleWeaponFireResult {
  if (state === undefined) {
    return blockedFire('not_installed');
  }
  if (input.ownerEntityId !== state.owner.entityId) {
    return blockedFire('owner_mismatch');
  }
  if (input.action !== state.fireAction) {
    return blockedFire('action_mismatch');
  }

  const projectileId = `weapon_default_straight_single_${state.owner.entityId}_${input.nowMs}_${sequence}`;
  const projectileSpawn: DefaultStraightSingleWeaponProjectileSpawn = {
    id: projectileId,
    owner: state.owner.entityId,
    sourceCapabilityId: DEFAULT_STRAIGHT_SINGLE_WEAPON_CAPABILITY_ID,
    weaponSlot: state.loadout.slot,
    pattern: state.projectilePattern.kind,
    projectileCount: state.projectilePattern.projectileCount,
    firedAtMs: input.nowMs,
    position: { ...input.origin },
    trajectory: { kind: 'straight', vx: 1, vy: 0 }
  };

  return {
    status: 'fired',
    projectileSpawns: [projectileSpawn],
    telemetryEvents: [
      {
        type: 'player.fired',
        payload: {
          owner: state.owner.entityId,
          weaponSlot: state.loadout.slot,
          sourceCapabilityId: DEFAULT_STRAIGHT_SINGLE_WEAPON_CAPABILITY_ID
        }
      },
      {
        type: 'projectile.spawned',
        payload: {
          projectileId,
          owner: state.owner.entityId,
          sourceCapabilityId: DEFAULT_STRAIGHT_SINGLE_WEAPON_CAPABILITY_ID,
          pattern: state.projectilePattern.kind,
          projectileCount: state.projectilePattern.projectileCount
        }
      }
    ]
  };
}

function blockedFire(reason: Extract<DefaultStraightSingleWeaponFireResult, { status: 'blocked' }>['reason']): DefaultStraightSingleWeaponFireResult {
  return { status: 'blocked', reason, projectileSpawns: [], telemetryEvents: [] };
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
