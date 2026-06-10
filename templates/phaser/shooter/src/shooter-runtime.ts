import type { ShooterTemplateParams } from './template-params.js';
import type { ResolvedShooterEnemyWave } from './shooter-runtime-plan.js';

export type ShooterDirection = 'left' | 'right' | 'up' | 'down';

export type ShooterPosition = {
  x: number;
  y: number;
};

export type ShooterEnemyState = ShooterPosition & {
  id: number;
  entityId: string;
  waveSource: ResolvedShooterEnemyWave['source'];
  waveStrategy: ResolvedShooterEnemyWave['strategy'];
  speedMultiplier: number;
  health: number;
  active: boolean;
};

export type ShooterProjectileState = ShooterPosition & {
  id: number;
  active: boolean;
};

export type ShooterRuntimeState = {
  player: ShooterPosition;
  facingX: 1 | -1;
  enemies: ShooterEnemyState[];
  projectiles: ShooterProjectileState[];
  enemiesSpawned: number;
  enemiesCleared: number;
  nextEnemyId: number;
  nextProjectileId: number;
  lastEnemySpawnAtMs: number;
  lastFireAtMs: number;
};

export type ShooterStepResult = {
  spawnedEnemy?: ShooterEnemyState;
  hits: Array<{
    enemyId: number;
    projectileId: number;
    cleared: boolean;
    entityId: string;
    waveSource: ResolvedShooterEnemyWave['source'];
    waveStrategy: ResolvedShooterEnemyWave['strategy'];
    speedMultiplier: number;
  }>;
  playerHits: number[];
};

const PLAYER_RADIUS = 48;
const ENEMY_RADIUS = 54;
const PROJECTILE_RADIUS = 16;
const FIRE_OFFSET_X = 62;
const FIRE_COOLDOWN_FALLBACK_MS = 300;

export function createShooterRuntimeState(params: ShooterTemplateParams): ShooterRuntimeState {
  return {
    player: { x: params.player.startX, y: params.player.startY },
    facingX: 1,
    enemies: [],
    projectiles: [],
    enemiesSpawned: 0,
    enemiesCleared: 0,
    nextEnemyId: 1,
    nextProjectileId: 1,
    lastEnemySpawnAtMs: 0,
    lastFireAtMs: -fireCooldownMs(params)
  };
}

export function primeShooterEnemyWave(state: ShooterRuntimeState, enemyWave: ResolvedShooterEnemyWave): void {
  state.lastEnemySpawnAtMs = -enemyWave.intervalMs;
}

export function moveShooterPlayer(
  state: ShooterRuntimeState,
  params: ShooterTemplateParams,
  input: Partial<Record<ShooterDirection, boolean>>,
  deltaMs: number
): boolean {
  const horizontal = Number(input.right === true) - Number(input.left === true);
  const vertical = Number(input.down === true) - Number(input.up === true);

  if (horizontal === 0 && vertical === 0) {
    return false;
  }

  const magnitude = Math.hypot(horizontal, vertical) || 1;
  const distance = params.player.speedPxPerSec * (deltaMs / 1000);
  const previous = { ...state.player };
  state.player.x = clamp(state.player.x + (horizontal / magnitude) * distance, PLAYER_RADIUS, params.world.width - PLAYER_RADIUS);
  state.player.y = clamp(state.player.y + (vertical / magnitude) * distance, PLAYER_RADIUS, params.world.height - PLAYER_RADIUS);

  if (horizontal !== 0) {
    state.facingX = horizontal > 0 ? 1 : -1;
  }

  return previous.x !== state.player.x || previous.y !== state.player.y;
}

export function trySpawnShooterEnemy(
  state: ShooterRuntimeState,
  params: ShooterTemplateParams,
  enemyWave: ResolvedShooterEnemyWave,
  elapsedMs: number
): ShooterEnemyState | undefined {
  if (state.enemiesSpawned >= enemyWave.count || state.enemies.filter((enemy) => enemy.active).length >= enemyWave.maxActive) {
    return undefined;
  }

  const hasActiveEnemy = state.enemies.some((enemy) => enemy.active);
  if (hasActiveEnemy && elapsedMs - state.lastEnemySpawnAtMs < enemyWave.intervalMs) {
    return undefined;
  }

  const enemy = createEnemy(state, params, enemyWave);
  state.enemies.push(enemy);
  state.enemiesSpawned += 1;
  state.lastEnemySpawnAtMs = elapsedMs;
  return enemy;
}

export function tryFireShooterProjectile(state: ShooterRuntimeState, params: ShooterTemplateParams, elapsedMs: number): ShooterProjectileState | undefined {
  if (elapsedMs - state.lastFireAtMs < fireCooldownMs(params)) {
    return undefined;
  }

  const projectile = {
    id: state.nextProjectileId,
    x: state.player.x + FIRE_OFFSET_X,
    y: state.player.y,
    active: true
  };
  state.nextProjectileId += 1;
  state.projectiles.push(projectile);
  state.lastFireAtMs = elapsedMs;
  return projectile;
}

export function advanceShooterWorld(
  state: ShooterRuntimeState,
  params: ShooterTemplateParams,
  enemyWave: ResolvedShooterEnemyWave,
  deltaMs: number,
  elapsedMs: number
): ShooterStepResult {
  const spawnedEnemy = trySpawnShooterEnemy(state, params, enemyWave, elapsedMs);
  const projectileDistance = params.projectile.speedPxPerSec * (deltaMs / 1000);
  const enemyDistance = params.enemy.speedPxPerSec * enemyWave.speedMultiplier * (deltaMs / 1000);
  const hits: ShooterStepResult['hits'] = [];
  const playerHits: number[] = [];

  for (const projectile of state.projectiles) {
    if (projectile.active) {
      projectile.x += projectileDistance;
      projectile.active = projectile.x <= params.world.width + PROJECTILE_RADIUS;
    }
  }

  for (const enemy of state.enemies) {
    if (!enemy.active) {
      continue;
    }

    const distanceToPlayer = Math.hypot(state.player.x - enemy.x, state.player.y - enemy.y) || 1;
    enemy.x += ((state.player.x - enemy.x) / distanceToPlayer) * enemyDistance;
    enemy.y += ((state.player.y - enemy.y) / distanceToPlayer) * enemyDistance;

    if (distanceBetween(state.player, enemy) <= ENEMY_RADIUS + PLAYER_RADIUS) {
      enemy.active = false;
      playerHits.push(enemy.id);
    }
  }

  for (const projectile of state.projectiles) {
    if (!projectile.active) {
      continue;
    }

    const enemy = state.enemies.find((candidate) => candidate.active && distanceBetween(projectile, candidate) <= ENEMY_RADIUS + PROJECTILE_RADIUS);
    if (enemy === undefined) {
      continue;
    }

    projectile.active = false;
    enemy.health -= params.projectile.damage;
    const cleared = enemy.health <= 0;
    if (enemy.health <= 0) {
      enemy.active = false;
      state.enemiesCleared += 1;
    }
    hits.push({
      enemyId: enemy.id,
      projectileId: projectile.id,
      cleared,
      entityId: enemy.entityId,
      waveSource: enemy.waveSource,
      waveStrategy: enemy.waveStrategy,
      speedMultiplier: enemy.speedMultiplier
    });
  }

  state.projectiles = state.projectiles.filter((projectile) => projectile.active);
  state.enemies = state.enemies.filter((enemy) => enemy.active);

  return { spawnedEnemy, hits, playerHits };
}

function createEnemy(state: ShooterRuntimeState, params: ShooterTemplateParams, enemyWave: ResolvedShooterEnemyWave): ShooterEnemyState {
  const verticalSpan = params.world.height - ENEMY_RADIUS * 2;
  const centerY = params.world.height / 2;
  const spawnOffsets = [0, -0.28, 0.28, -0.42, 0.42];
  const slot = state.enemiesSpawned % 5;
  const y = clamp(centerY + verticalSpan * (spawnOffsets[slot] ?? 0), ENEMY_RADIUS, params.world.height - ENEMY_RADIUS);

  return {
    id: state.nextEnemyId++,
    entityId: enemyWave.entityId,
    waveSource: enemyWave.source,
    waveStrategy: enemyWave.strategy,
    speedMultiplier: enemyWave.speedMultiplier,
    x: params.world.width - ENEMY_RADIUS - 24,
    y,
    health: params.enemy.health,
    active: true
  };
}

function distanceBetween(a: ShooterPosition, b: ShooterPosition): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function fireCooldownMs(params: ShooterTemplateParams): number {
  return params.projectile.cooldownMs ?? FIRE_COOLDOWN_FALLBACK_MS;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
