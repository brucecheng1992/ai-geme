import type { ShooterRuntimeState } from './shooter-runtime.js';
import type { ShooterEntityVisualParams, ShooterTemplateParams } from './template-params.js';

type EnemyRuntimePatch = {
  speed?: number;
  maxHealth?: number;
  label?: string;
  visual?: ShooterEntityVisualParams;
};

type PlayerRuntimePatch = {
  scale?: number;
  maxSpeed?: number;
  maxHealth?: number;
  label?: string;
  visual?: ShooterEntityVisualParams;
};

export type ShooterRuntimePatch = {
  player?: PlayerRuntimePatch;
  enemyTypes?: Record<string, EnemyRuntimePatch>;
  projectiles?: Record<string, { speed?: number; damage?: number }>;
  level?: { waves?: Record<string, { count?: number }> };
  world?: { width?: number };
};

export type ShooterLiveEditRegistry = {
  playerId: 'player_main';
  enemyTypeId: string;
  projectileId: string;
  waveId?: string;
  runId?: string;
};

export type ShooterRuntimeBridgeResult = {
  status: 'applied_hot' | 'applied_warm_restart' | 'failed_runtime_apply' | 'unsupported';
  applyMode: 'hot' | 'warm_restart' | 'none';
  runtimeTarget: 'phaser:top_down_shooter';
  appliedPaths: string[];
  warnings: Array<{ code: string; path: string; message: string }>;
  errors: Array<{ code: string; path: string; message: string }>;
};

export type ShooterRuntimeBridgeState = {
  params: ShooterTemplateParams;
  runtime: ShooterRuntimeState;
};

type BridgeRenderer = {
  setPlayerScale?: (scale: number) => void;
};

type BridgeInput = {
  params: ShooterTemplateParams;
  runtime?: ShooterRuntimeState;
  getRuntime?: () => ShooterRuntimeState;
  registry: ShooterLiveEditRegistry;
  renderer?: BridgeRenderer;
  setPlayerMaxHealth?: (maxHealth: number) => void;
  setPlayerAppearance?: () => void;
  setEnemyAppearance?: () => void;
  setEnemyWaveCount?: (count: number) => void;
  setWorldWidth?: (width: number) => void;
};

const liveEditCapabilities = {
  hot: [
    '/player/physics/maxSpeed',
    '/player/render/scale',
    '/player/health/max',
    '/enemyTypes/*/physics/speed',
    '/enemyTypes/*/health/max',
    '/projectiles/*/speed',
    '/projectiles/*/damage'
  ],
  assetSwap: ['/assets/roles/player', '/assets/roles/enemy', '/assets/roles/projectile', '/assets/roles/background'],
  warmRestart: ['/player/label', '/enemyTypes/*/label', '/level/waves', '/level/waves/*/count', '/world/width', '/level/spawnRules', '/pickups', '/bosses'],
  rebuildRequired: ['/genre', '/world/coordinateSystem', '/world/physics/mode', '/player/controller']
} as const;

export function createShooterRuntimeBridge(input: BridgeInput) {
  const getRuntime = input.getRuntime ?? (() => {
    if (input.runtime === undefined) {
      throw new Error('Shooter runtime bridge requires runtime or getRuntime.');
    }
    return input.runtime;
  });

  return {
    getCapabilities() {
      return liveEditCapabilities;
    },
    applyPatch(patch: unknown): ShooterRuntimeBridgeResult {
      const parsed = parseRuntimePatch(patch, input.registry);
      if (!parsed.ok) {
        return parsed.result;
      }

      const runtime = getRuntime();
      const appliedPaths: string[] = [];
      const { params, registry } = input;
      let applyMode: 'hot' | 'warm_restart' = 'hot';
      const playerPatch = parsed.patch.player;
      if (playerPatch?.scale !== undefined) {
        input.renderer?.setPlayerScale?.(playerPatch.scale);
        appliedPaths.push('/player/render/scale');
      }
      if (playerPatch?.maxSpeed !== undefined) {
        params.player.speedPxPerSec = playerPatch.maxSpeed;
        appliedPaths.push('/player/physics/maxSpeed');
      }
      if (playerPatch?.maxHealth !== undefined) {
        params.player.health = playerPatch.maxHealth;
        input.setPlayerMaxHealth?.(playerPatch.maxHealth);
        appliedPaths.push('/player/health/max');
      }
      if (playerPatch?.label !== undefined) {
        params.player.label = playerPatch.label;
        if (playerPatch.visual !== undefined) {
          params.player.visual = playerPatch.visual;
        }
        input.setPlayerAppearance?.();
        appliedPaths.push('/player/label');
        applyMode = 'warm_restart';
      }

      const enemyPatch = parsed.patch.enemyTypes?.[registry.enemyTypeId];
      if (enemyPatch?.speed !== undefined) {
        params.enemy.speedPxPerSec = enemyPatch.speed;
        appliedPaths.push(`/enemyTypes/${registry.enemyTypeId}/physics/speed`);
      }
      if (enemyPatch?.maxHealth !== undefined) {
        params.enemy.health = enemyPatch.maxHealth;
        for (const enemy of runtime.enemies) {
          if (enemy.entityId === registry.enemyTypeId) {
            enemy.health = Math.max(1, enemyPatch.maxHealth);
          }
        }
        appliedPaths.push(`/enemyTypes/${registry.enemyTypeId}/health/max`);
      }
      if (enemyPatch?.label !== undefined) {
        params.enemy.label = enemyPatch.label;
        if (enemyPatch.visual !== undefined) {
          params.enemy.visual = enemyPatch.visual;
        }
        input.setEnemyAppearance?.();
        appliedPaths.push(`/enemyTypes/${registry.enemyTypeId}/label`);
        applyMode = 'warm_restart';
      }

      const projectilePatch = parsed.patch.projectiles?.[registry.projectileId];
      if (projectilePatch?.speed !== undefined) {
        params.projectile.speedPxPerSec = projectilePatch.speed;
        for (const projectile of runtime.projectiles) {
          const direction = projectile.velocityX < 0 ? -1 : 1;
          const multiplier = projectile.owner === 'enemy' ? 0.8 : 1;
          projectile.velocityX = direction * projectilePatch.speed * multiplier;
        }
        appliedPaths.push(`/projectiles/${registry.projectileId}/speed`);
      }
      if (projectilePatch?.damage !== undefined) {
        params.projectile.damage = projectilePatch.damage;
        appliedPaths.push(`/projectiles/${registry.projectileId}/damage`);
      }

      const waveId = registry.waveId ?? `${registry.enemyTypeId}_wave`;
      const wavePatch = parsed.patch.level?.waves?.[waveId];
      if (wavePatch?.count !== undefined) {
        params.enemy.count = wavePatch.count;
        if (params.objective.winType === 'enemy_cleared') {
          params.objective.targetCount = wavePatch.count;
        }
        input.setEnemyWaveCount?.(wavePatch.count);
        appliedPaths.push(`/level/waves/${waveId}/count`);
        applyMode = 'warm_restart';
      }

      if (parsed.patch.world?.width !== undefined) {
        params.world.width = parsed.patch.world.width;
        input.setWorldWidth?.(parsed.patch.world.width);
        appliedPaths.push('/world/width');
        applyMode = 'warm_restart';
      }

      return {
        status: applyMode === 'warm_restart' ? 'applied_warm_restart' : 'applied_hot',
        applyMode,
        runtimeTarget: 'phaser:top_down_shooter',
        appliedPaths,
        warnings: [],
        errors: []
      };
    },
    snapshotState(): ShooterRuntimeBridgeState {
      return cloneState({ params: input.params, runtime: getRuntime() });
    },
    restoreState(state: ShooterRuntimeBridgeState): void {
      Object.assign(input.params.player, state.params.player);
      Object.assign(input.params.enemy, state.params.enemy);
      Object.assign(input.params.projectile, state.params.projectile);
      const runtime = getRuntime();
      Object.assign(runtime, cloneState(state).runtime);
    }
  };
}

function parseRuntimePatch(
  input: unknown,
  registry: ShooterLiveEditRegistry
): { ok: true; patch: ShooterRuntimePatch } | { ok: false; result: ShooterRuntimeBridgeResult } {
  if (hasUnsafeValue(input)) {
    return { ok: false, result: failed('RUNTIME_PATCH_INVALID', '<root>', 'Runtime patch cannot include code-like values.') };
  }
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, result: failed('RUNTIME_PATCH_INVALID', '<root>', 'Runtime patch must be an object.') };
  }

  const patch = input as Record<string, unknown>;
  const unsupportedKeys = Object.keys(patch).filter((key) => key !== 'player' && key !== 'enemyTypes' && key !== 'projectiles' && key !== 'level' && key !== 'world');
  if (unsupportedKeys.length > 0) {
    return { ok: false, result: unsupported(unsupportedKeys.map((key) => `/${key}`).join(',')) };
  }

  const normalized: ShooterRuntimePatch = {};
  if ('player' in patch) {
    if (!isRecord(patch.player)) {
      return { ok: false, result: failed('RUNTIME_PATCH_INVALID', '/player', 'player patch must be an object.') };
    }
    const player = pickPlayerPatch(patch.player);
    if (!player.ok || (player.value.scale !== undefined && !inRange(player.value.scale, 0.1, 5)) || (player.value.maxSpeed !== undefined && !intInRange(player.value.maxSpeed, 1, 2000)) || (player.value.maxHealth !== undefined && !intInRange(player.value.maxHealth, 1, 20))) {
      return { ok: false, result: failed('RUNTIME_PATCH_INVALID', '/player', 'player patch values are outside the allowed runtime ranges.') };
    }
    normalized.player = player.value;
  }

  if ('enemyTypes' in patch) {
    if (!isRecord(patch.enemyTypes)) {
      return { ok: false, result: failed('RUNTIME_PATCH_INVALID', '/enemyTypes', 'enemyTypes patch must be an object map.') };
    }
    const enemyPatch = patch.enemyTypes[registry.enemyTypeId];
    if (enemyPatch === undefined || Object.keys(patch.enemyTypes).some((key) => key !== registry.enemyTypeId) || !isRecord(enemyPatch)) {
      return { ok: false, result: unsupported('/enemyTypes') };
    }
    const enemy = pickEnemyPatch(enemyPatch);
    if (!enemy.ok || (enemy.value.speed !== undefined && !intInRange(enemy.value.speed, 1, 2000)) || (enemy.value.maxHealth !== undefined && !intInRange(enemy.value.maxHealth, 1, 50))) {
      return { ok: false, result: failed('RUNTIME_PATCH_INVALID', `/enemyTypes/${registry.enemyTypeId}`, 'enemy patch values are outside the allowed runtime ranges.') };
    }
    normalized.enemyTypes = { [registry.enemyTypeId]: enemy.value };
  }

  if ('projectiles' in patch) {
    if (!isRecord(patch.projectiles)) {
      return { ok: false, result: failed('RUNTIME_PATCH_INVALID', '/projectiles', 'projectiles patch must be an object map.') };
    }
    const projectilePatch = patch.projectiles[registry.projectileId];
    if (projectilePatch === undefined || Object.keys(patch.projectiles).some((key) => key !== registry.projectileId) || !isRecord(projectilePatch)) {
      return { ok: false, result: unsupported('/projectiles') };
    }
    const projectile = pickNumberPatch(projectilePatch, ['speed', 'damage']);
    if (!projectile.ok || (projectile.value.speed !== undefined && !intInRange(projectile.value.speed, 1, 2000)) || (projectile.value.damage !== undefined && !intInRange(projectile.value.damage, 1, 50))) {
      return { ok: false, result: failed('RUNTIME_PATCH_INVALID', `/projectiles/${registry.projectileId}`, 'projectile patch values are outside the allowed runtime ranges.') };
    }
    normalized.projectiles = { [registry.projectileId]: projectile.value };
  }

  if ('level' in patch) {
    const waveId = registry.waveId ?? `${registry.enemyTypeId}_wave`;
    if (!isRecord(patch.level) || !isRecord(patch.level.waves)) {
      return { ok: false, result: failed('RUNTIME_PATCH_INVALID', '/level', 'level patch must contain a waves object map.') };
    }
    const wavePatch = patch.level.waves[waveId];
    if (wavePatch === undefined || Object.keys(patch.level.waves).some((key) => key !== waveId) || !isRecord(wavePatch)) {
      return { ok: false, result: unsupported('/level/waves') };
    }
    const wave = pickNumberPatch(wavePatch, ['count']);
    if (!wave.ok || typeof wave.value.count !== 'number' || !intInRange(wave.value.count, 1, 100)) {
      return { ok: false, result: failed('RUNTIME_PATCH_INVALID', `/level/waves/${waveId}`, 'wave patch count is outside the allowed runtime range.') };
    }
    normalized.level = { waves: { [waveId]: { count: wave.value.count } } };
  }

  if ('world' in patch) {
    if (!isRecord(patch.world)) {
      return { ok: false, result: failed('RUNTIME_PATCH_INVALID', '/world', 'world patch must be an object.') };
    }
    const world = pickNumberPatch(patch.world, ['width']);
    if (!world.ok || typeof world.value.width !== 'number' || !intInRange(world.value.width, 320, 24000)) {
      return { ok: false, result: failed('RUNTIME_PATCH_INVALID', '/world/width', 'world width is outside the allowed runtime range.') };
    }
    normalized.world = { width: world.value.width };
  }

  return { ok: true, patch: normalized };
}

function pickNumberPatch(record: Record<string, unknown>, allowedKeys: string[]): { ok: true; value: Record<string, number> } | { ok: false } {
  const value: Record<string, number> = {};
  for (const [key, child] of Object.entries(record)) {
    if (!allowedKeys.includes(key) || typeof child !== 'number') {
      return { ok: false };
    }
    value[key] = child;
  }
  return { ok: true, value };
}

function pickPlayerPatch(record: Record<string, unknown>): { ok: true; value: PlayerRuntimePatch } | { ok: false } {
  const value: PlayerRuntimePatch = {};
  for (const [key, child] of Object.entries(record)) {
    if (key === 'scale' || key === 'maxSpeed' || key === 'maxHealth') {
      if (typeof child !== 'number') {
        return { ok: false };
      }
      value[key] = child;
      continue;
    }
    if (key === 'label') {
      if (typeof child !== 'string' || child.trim().length === 0 || child.trim().length > 40) {
        return { ok: false };
      }
      value.label = child.trim();
      continue;
    }
    if (key === 'visual') {
      if (!isShooterEntityVisualParams(child)) {
        return { ok: false };
      }
      value.visual = child;
      continue;
    }
    return { ok: false };
  }
  return { ok: true, value };
}

function pickEnemyPatch(record: Record<string, unknown>): { ok: true; value: EnemyRuntimePatch } | { ok: false } {
  const value: EnemyRuntimePatch = {};
  for (const [key, child] of Object.entries(record)) {
    if (key === 'speed' || key === 'maxHealth') {
      if (typeof child !== 'number') {
        return { ok: false };
      }
      value[key] = child;
      continue;
    }
    if (key === 'label') {
      if (typeof child !== 'string' || child.trim().length === 0 || child.trim().length > 40) {
        return { ok: false };
      }
      value.label = child.trim();
      continue;
    }
    if (key === 'visual') {
      if (!isShooterEntityVisualParams(child)) {
        return { ok: false };
      }
      value.visual = child;
      continue;
    }
    return { ok: false };
  }
  return { ok: true, value };
}

function isShooterEntityVisualParams(value: unknown): value is ShooterEntityVisualParams {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.kind === 'string' &&
    ['cat', 'dog', 'alien', 'tank', 'ship', 'circle'].includes(value.kind) &&
    typeof value.fillColor === 'number' &&
    Number.isInteger(value.fillColor) &&
    inRange(value.fillColor, 0, 0xffffff) &&
    typeof value.accentColor === 'number' &&
    Number.isInteger(value.accentColor) &&
    inRange(value.accentColor, 0, 0xffffff)
  );
}

function failed(code: string, path: string, message: string): ShooterRuntimeBridgeResult {
  return { status: 'failed_runtime_apply', applyMode: 'none', runtimeTarget: 'phaser:top_down_shooter', appliedPaths: [], warnings: [], errors: [{ code, path, message }] };
}

function unsupported(path: string): ShooterRuntimeBridgeResult {
  return {
    status: 'unsupported',
    applyMode: 'none',
    runtimeTarget: 'phaser:top_down_shooter',
    appliedPaths: [],
    warnings: [],
    errors: [{ code: 'UNSUPPORTED_RUNTIME_PATCH', path, message: `Runtime patch path is not supported by the shooter bridge: ${path}` }]
  };
}

function intInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasUnsafeValue(value: unknown): boolean {
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return lower.includes('eval') || lower.includes('function') || lower.includes('=>') || lower.includes('<script') || lower.includes('script') || lower.includes('javascript:') || lower.includes('code');
  }
  if (Array.isArray(value)) {
    return value.some(hasUnsafeValue);
  }
  if (isRecord(value)) {
    return Object.entries(value).some(([key, child]) => ['__proto__', 'prototype', 'constructor', 'script', 'eval', 'function', 'code'].includes(key) || hasUnsafeValue(child));
  }
  return false;
}

function cloneState<T>(state: T): T {
  return JSON.parse(JSON.stringify(state)) as T;
}
