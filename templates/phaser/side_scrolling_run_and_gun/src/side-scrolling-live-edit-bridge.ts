import type { SideScrollingEnemyDefinition, SideScrollingRuntimeSlice } from './side-scrolling-runtime-plan.js';
import type { SideScrollingTemplateParams } from './template-params.js';

type EnemyRuntimePatch = {
  speed?: number;
  maxHealth?: number;
  label?: string;
};

type PlayerRuntimePatch = {
  maxSpeed?: number;
  maxHealth?: number;
  label?: string;
};

export type SideScrollingRuntimePatch = {
  player?: PlayerRuntimePatch;
  enemyTypes?: Record<string, EnemyRuntimePatch>;
  projectiles?: Record<string, { speed?: number; damage?: number }>;
  level?: { waves?: Record<string, { count?: number }> };
  world?: { width?: number };
};

type RuntimeEnemyActor = {
  entityId: string;
  health: number;
  vx: number;
  definition: SideScrollingEnemyDefinition;
};

type RuntimeProjectileActor = {
  id: string;
  owner: 'player' | 'enemy';
  vx: number;
  damage: number;
  sourceId?: string;
};

export type SideScrollingRuntimeBridgeResult = {
  status: 'applied_hot' | 'applied_warm_restart' | 'failed_runtime_apply' | 'unsupported';
  applyMode: 'hot' | 'warm_restart' | 'none';
  runtimeTarget: 'phaser:side_scrolling_run_and_gun';
  appliedPaths: string[];
  warnings: Array<{ code: string; path: string; message: string }>;
  errors: Array<{ code: string; path: string; message: string }>;
};

type BridgeInput = {
  params: SideScrollingTemplateParams;
  plan: SideScrollingRuntimeSlice;
  getEnemies: () => RuntimeEnemyActor[];
  getProjectiles: () => RuntimeProjectileActor[];
  setPlayerMaxHealth: (maxHealth: number) => void;
  setWorldWidth: (width: number) => void;
};

const liveEditCapabilities = {
  hot: [
    '/player/physics/maxSpeed',
    '/player/health/max',
    '/enemyTypes/*/physics/speed',
    '/enemyTypes/*/health/max',
    '/projectiles/*/speed',
    '/projectiles/*/damage'
  ],
  assetSwap: [],
  warmRestart: ['/player/label', '/enemyTypes/*/label', '/level/waves/*/count', '/world/width'],
  rebuildRequired: ['/genre', '/world/coordinateSystem', '/world/physics/mode', '/player/controller']
} as const;

export function createSideScrollingRuntimeBridge(input: BridgeInput) {
  return {
    getCapabilities() {
      return liveEditCapabilities;
    },
    applyPatch(patch: unknown): SideScrollingRuntimeBridgeResult {
      const parsed = parseRuntimePatch(patch, input.plan);
      if (!parsed.ok) {
        return parsed.result;
      }

      const appliedPaths: string[] = [];
      let applyMode: 'hot' | 'warm_restart' = 'hot';
      const { params, plan } = input;

      const playerPatch = parsed.patch.player;
      if (playerPatch?.maxSpeed !== undefined) {
        plan.player.speedPxPerSec = playerPatch.maxSpeed;
        appliedPaths.push('/player/physics/maxSpeed');
      }
      if (playerPatch?.maxHealth !== undefined) {
        input.setPlayerMaxHealth(playerPatch.maxHealth);
        appliedPaths.push('/player/health/max');
      }
      if (playerPatch?.label !== undefined) {
        params.player.label = playerPatch.label;
        appliedPaths.push('/player/label');
        applyMode = 'warm_restart';
      }

      for (const [enemyTypeId, enemyPatch] of Object.entries(parsed.patch.enemyTypes ?? {})) {
        const definition = plan.enemyDefinitions.find((item) => item.id === enemyTypeId);
        if (definition === undefined) {
          return unsupported(`/enemyTypes/${enemyTypeId}`);
        }
        if (enemyPatch.speed !== undefined) {
          definition.movement.speedPxPerSec = enemyPatch.speed;
          for (const enemy of input.getEnemies().filter((item) => item.entityId === enemyTypeId)) {
            enemy.vx = -enemyPatch.speed;
          }
          appliedPaths.push(`/enemyTypes/${enemyTypeId}/physics/speed`);
        }
        if (enemyPatch.maxHealth !== undefined) {
          definition.health = enemyPatch.maxHealth;
          for (const enemy of input.getEnemies().filter((item) => item.entityId === enemyTypeId)) {
            enemy.health = Math.max(1, Math.min(enemy.health, enemyPatch.maxHealth));
          }
          appliedPaths.push(`/enemyTypes/${enemyTypeId}/health/max`);
        }
        if (enemyPatch.label !== undefined) {
          definition.label = enemyPatch.label;
          appliedPaths.push(`/enemyTypes/${enemyTypeId}/label`);
          applyMode = 'warm_restart';
        }
      }

      for (const [projectileId, projectilePatch] of Object.entries(parsed.patch.projectiles ?? {})) {
        if (projectilePatch.speed !== undefined) {
          if (projectileId === plan.player.projectileEntityId) {
            plan.player.projectileSpeedPxPerSec = projectilePatch.speed;
          }
          for (const definition of plan.enemyDefinitions.filter((item) => item.firing.projectileEntityId === projectileId)) {
            definition.firing.speedPxPerSec = projectilePatch.speed;
          }
          for (const projectile of input.getProjectiles().filter((item) => item.sourceId === projectileId)) {
            projectile.vx = (projectile.owner === 'enemy' ? -1 : 1) * projectilePatch.speed;
          }
          appliedPaths.push(`/projectiles/${projectileId}/speed`);
        }
        if (projectilePatch.damage !== undefined) {
          if (projectileId === plan.player.projectileEntityId) {
            plan.player.projectileDamage = projectilePatch.damage;
          }
          for (const definition of plan.enemyDefinitions.filter((item) => item.firing.projectileEntityId === projectileId)) {
            definition.firing.damage = projectilePatch.damage;
          }
          for (const projectile of input.getProjectiles().filter((item) => item.sourceId === projectileId)) {
            projectile.damage = projectilePatch.damage;
          }
          appliedPaths.push(`/projectiles/${projectileId}/damage`);
        }
      }

      for (const [waveId, wavePatch] of Object.entries(parsed.patch.level?.waves ?? {})) {
        const wave = plan.waves.find((item) => item.id === waveId);
        if (wave === undefined || wavePatch.count === undefined) {
          return unsupported(`/level/waves/${waveId}`);
        }
        wave.count = wavePatch.count;
        if (plan.winCondition.kind === 'enemy_cleared') {
          plan.winCondition.targetCount = wavePatch.count;
        }
        appliedPaths.push(`/level/waves/${waveId}/count`);
        applyMode = 'warm_restart';
      }

      if (parsed.patch.world?.width !== undefined) {
        input.setWorldWidth(parsed.patch.world.width);
        appliedPaths.push('/world/width');
        applyMode = 'warm_restart';
      }

      return {
        status: applyMode === 'warm_restart' ? 'applied_warm_restart' : 'applied_hot',
        applyMode,
        runtimeTarget: 'phaser:side_scrolling_run_and_gun',
        appliedPaths,
        warnings: [],
        errors: []
      };
    }
  };
}

function parseRuntimePatch(
  input: unknown,
  plan: SideScrollingRuntimeSlice
): { ok: true; patch: SideScrollingRuntimePatch } | { ok: false; result: SideScrollingRuntimeBridgeResult } {
  if (hasUnsafeValue(input)) {
    return { ok: false, result: failed('RUNTIME_PATCH_INVALID', '<root>', 'Runtime patch cannot include code-like values.') };
  }
  if (!isRecord(input)) {
    return { ok: false, result: failed('RUNTIME_PATCH_INVALID', '<root>', 'Runtime patch must be an object.') };
  }

  const unsupportedKeys = Object.keys(input).filter((key) => key !== 'player' && key !== 'enemyTypes' && key !== 'projectiles' && key !== 'level' && key !== 'world');
  if (unsupportedKeys.length > 0) {
    return { ok: false, result: unsupported(unsupportedKeys.map((key) => `/${key}`).join(',')) };
  }

  const normalized: SideScrollingRuntimePatch = {};
  if ('player' in input) {
    if (!isRecord(input.player)) {
      return { ok: false, result: failed('RUNTIME_PATCH_INVALID', '/player', 'player patch must be an object.') };
    }
    const player = pickPlayerPatch(input.player);
    if (!player.ok || (player.value.maxSpeed !== undefined && !intInRange(player.value.maxSpeed, 1, 2000)) || (player.value.maxHealth !== undefined && !intInRange(player.value.maxHealth, 1, 20))) {
      return { ok: false, result: failed('RUNTIME_PATCH_INVALID', '/player', 'player patch values are outside the allowed runtime ranges.') };
    }
    normalized.player = player.value;
  }

  if ('enemyTypes' in input) {
    if (!isRecord(input.enemyTypes)) {
      return { ok: false, result: failed('RUNTIME_PATCH_INVALID', '/enemyTypes', 'enemyTypes patch must be an object map.') };
    }
    const enemyTypes: Record<string, EnemyRuntimePatch> = {};
    for (const [enemyTypeId, enemyPatch] of Object.entries(input.enemyTypes)) {
      if (!plan.enemyDefinitions.some((definition) => definition.id === enemyTypeId) || !isRecord(enemyPatch)) {
        return { ok: false, result: unsupported(`/enemyTypes/${enemyTypeId}`) };
      }
      const enemy = pickEnemyPatch(enemyPatch);
      if (!enemy.ok || (enemy.value.speed !== undefined && !intInRange(enemy.value.speed, 1, 2000)) || (enemy.value.maxHealth !== undefined && !intInRange(enemy.value.maxHealth, 1, 50))) {
        return { ok: false, result: failed('RUNTIME_PATCH_INVALID', `/enemyTypes/${enemyTypeId}`, 'enemy patch values are outside the allowed runtime ranges.') };
      }
      enemyTypes[enemyTypeId] = enemy.value;
    }
    normalized.enemyTypes = enemyTypes;
  }

  if ('projectiles' in input) {
    if (!isRecord(input.projectiles)) {
      return { ok: false, result: failed('RUNTIME_PATCH_INVALID', '/projectiles', 'projectiles patch must be an object map.') };
    }
    const projectiles: NonNullable<SideScrollingRuntimePatch['projectiles']> = {};
    const knownProjectileIds = collectKnownProjectileIds(plan);
    for (const [projectileId, projectilePatch] of Object.entries(input.projectiles)) {
      if (!knownProjectileIds.has(projectileId) || !isRecord(projectilePatch)) {
        return { ok: false, result: unsupported(`/projectiles/${projectileId}`) };
      }
      const projectile = pickNumberPatch(projectilePatch, ['speed', 'damage']);
      if (!projectile.ok || (projectile.value.speed !== undefined && !intInRange(projectile.value.speed, 1, 2000)) || (projectile.value.damage !== undefined && !intInRange(projectile.value.damage, 1, 50))) {
        return { ok: false, result: failed('RUNTIME_PATCH_INVALID', `/projectiles/${projectileId}`, 'projectile patch values are outside the allowed runtime ranges.') };
      }
      projectiles[projectileId] = projectile.value;
    }
    normalized.projectiles = projectiles;
  }

  if ('level' in input) {
    if (!isRecord(input.level) || !isRecord(input.level.waves)) {
      return { ok: false, result: failed('RUNTIME_PATCH_INVALID', '/level', 'level patch must contain a waves object map.') };
    }
    const waves: NonNullable<NonNullable<SideScrollingRuntimePatch['level']>['waves']> = {};
    for (const [waveId, wavePatch] of Object.entries(input.level.waves)) {
      if (!plan.waves.some((wave) => wave.id === waveId) || !isRecord(wavePatch)) {
        return { ok: false, result: unsupported(`/level/waves/${waveId}`) };
      }
      const wave = pickNumberPatch(wavePatch, ['count']);
      if (!wave.ok || typeof wave.value.count !== 'number' || !intInRange(wave.value.count, 1, 100)) {
        return { ok: false, result: failed('RUNTIME_PATCH_INVALID', `/level/waves/${waveId}`, 'wave patch count is outside the allowed runtime range.') };
      }
      waves[waveId] = { count: wave.value.count };
    }
    normalized.level = { waves };
  }

  if ('world' in input) {
    if (!isRecord(input.world)) {
      return { ok: false, result: failed('RUNTIME_PATCH_INVALID', '/world', 'world patch must be an object.') };
    }
    const world = pickNumberPatch(input.world, ['width']);
    if (!world.ok || typeof world.value.width !== 'number' || !intInRange(world.value.width, 960, 24000)) {
      return { ok: false, result: failed('RUNTIME_PATCH_INVALID', '/world/width', 'world width is outside the allowed runtime range.') };
    }
    normalized.world = { width: world.value.width };
  }

  return { ok: true, patch: normalized };
}

function collectKnownProjectileIds(plan: SideScrollingRuntimeSlice): Set<string> {
  return new Set([plan.player.projectileEntityId, ...plan.enemyDefinitions.map((definition) => definition.firing.projectileEntityId)]);
}

function pickPlayerPatch(record: Record<string, unknown>): { ok: true; value: PlayerRuntimePatch } | { ok: false } {
  const value: PlayerRuntimePatch = {};
  for (const [key, child] of Object.entries(record)) {
    if (key === 'maxSpeed' || key === 'maxHealth') {
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
    return { ok: false };
  }
  return { ok: true, value };
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

function failed(code: string, path: string, message: string): SideScrollingRuntimeBridgeResult {
  return { status: 'failed_runtime_apply', applyMode: 'none', runtimeTarget: 'phaser:side_scrolling_run_and_gun', appliedPaths: [], warnings: [], errors: [{ code, path, message }] };
}

function unsupported(path: string): SideScrollingRuntimeBridgeResult {
  return {
    status: 'unsupported',
    applyMode: 'none',
    runtimeTarget: 'phaser:side_scrolling_run_and_gun',
    appliedPaths: [],
    warnings: [],
    errors: [{ code: 'UNSUPPORTED_RUNTIME_PATCH', path, message: `Runtime patch path is not supported by the side-scrolling bridge: ${path}` }]
  };
}

function intInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
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
