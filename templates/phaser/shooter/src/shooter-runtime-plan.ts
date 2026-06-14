import type { ShooterTemplateParams } from './template-params.js';

export type ShooterRuntimePlan = {
  enemy_waves?: ShooterEnemyWave[];
};

export type ShooterEnemyWave = {
  derived_from: [
    'entities.enemy.id',
    'entities.enemy.count',
    'entities.enemy.health',
    'entities.enemy.movement.speed_px_per_sec',
    'game.difficulty',
    'game.target_play_time_sec'
  ];
  entity_id: string;
  strategy: 'right_edge_wave';
  count: number;
  max_active: number;
  interval_ms: number;
  speed_multiplier: number;
};

export type ResolvedShooterEnemyWave = {
  derivedFrom: ShooterEnemyWave['derived_from'];
  entityId: string;
  strategy: ShooterEnemyWave['strategy'];
  count: number;
  maxActive: number;
  intervalMs: number;
  speedMultiplier: number;
  source: 'runtime_plan' | 'template_default';
};

export const defaultShooterRuntimePlan: ShooterRuntimePlan = { enemy_waves: [] };

/**
 * Resolves the single shooter enemy wave currently supported by the runtime.
 * Template params stay as fallback/base stats; spawn pressure comes from this
 * resolved plan so runtime_plan and template_params do not become dual sources.
 */
export function resolveShooterEnemyWave(plan: ShooterRuntimePlan, params: ShooterTemplateParams): ResolvedShooterEnemyWave {
  const fallback = fallbackEnemyWave(params);
  const wave = plan.enemy_waves?.[0];
  if (wave === undefined) {
    return fallback;
  }

  return {
    derivedFrom: wave.derived_from,
    entityId: wave.entity_id,
    strategy: wave.strategy,
    count: wave.count,
    maxActive: wave.max_active,
    intervalMs: wave.interval_ms,
    speedMultiplier: wave.speed_multiplier,
    source: 'runtime_plan'
  };
}

function fallbackEnemyWave(params: ShooterTemplateParams): ResolvedShooterEnemyWave {
  return {
    derivedFrom: [
      'entities.enemy.id',
      'entities.enemy.count',
      'entities.enemy.health',
      'entities.enemy.movement.speed_px_per_sec',
      'game.difficulty',
      'game.target_play_time_sec'
    ],
    entityId: 'enemy',
    strategy: 'right_edge_wave',
    count: params.enemy.count,
    maxActive: params.enemy.count,
    intervalMs: params.enemy.spawnIntervalMs,
    speedMultiplier: 1,
    source: 'template_default'
  };
}
