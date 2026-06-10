export type DodgerRuntimePlan = {
  spawn_rules?: DodgerSpawnRule[];
  difficulty_curve?: DodgerDifficultyCurve;
};

export type DodgerDifficultyCurve = {
  derived_from: ['game.difficulty', 'game.target_play_time_sec'];
  level: 'easy' | 'normal';
  speed_multiplier_start: number;
  speed_multiplier_end: number;
  spawn_interval_multiplier_start: number;
  spawn_interval_multiplier_end: number;
  ramp_duration_ms: number;
};

export type DodgerSpawnRule = {
  entity_id: string;
  entity_kind: 'enemy' | 'projectile' | 'collectible' | 'hazard';
  strategy: 'fixed_positions' | 'right_edge_wave' | 'top_edge_stream';
  count: number;
  max_active: number;
  interval_ms: number;
  lane_count?: number;
};

export type DodgerRuntimeSpawnKind = 'collectible' | 'hazard';

export type ResolvedDodgerSpawnRule = {
  entityId: string;
  entityKind: DodgerRuntimeSpawnKind;
  strategy: DodgerSpawnRule['strategy'];
  count: number;
  maxActive: number;
  intervalMs: number;
  laneCount?: number;
  source: 'runtime_plan' | 'template_default';
};

export type ResolvedDodgerDifficultyCurve = {
  derivedFrom: ['game.difficulty', 'game.target_play_time_sec'];
  level: 'easy' | 'normal';
  speedMultiplierStart: number;
  speedMultiplierEnd: number;
  spawnIntervalMultiplierStart: number;
  spawnIntervalMultiplierEnd: number;
  rampDurationMs: number;
  source: 'runtime_plan' | 'template_default';
};

export type DodgerDifficultyState = ResolvedDodgerDifficultyCurve & {
  rampProgress: number;
  speedMultiplier: number;
  spawnIntervalMultiplier: number;
};

export const defaultDodgerRuntimePlan: DodgerRuntimePlan = { spawn_rules: [] };

const defaultDifficultyCurve: ResolvedDodgerDifficultyCurve = {
  derivedFrom: ['game.difficulty', 'game.target_play_time_sec'],
  level: 'easy',
  speedMultiplierStart: 1,
  speedMultiplierEnd: 1,
  spawnIntervalMultiplierStart: 1,
  spawnIntervalMultiplierEnd: 1,
  rampDurationMs: 30000,
  source: 'template_default'
};

/**
 * Resolves a DSL-authored spawn rule into the small shape the dodger runtime can execute.
 * Each entity kind passes its executable strategy as the fallback; unsupported
 * strategies stay in IR but must not be reported as runtime_plan execution.
 */
export function resolveDodgerSpawnRule(
  plan: DodgerRuntimePlan,
  entityKind: DodgerRuntimeSpawnKind,
  fallback: Omit<ResolvedDodgerSpawnRule, 'entityKind' | 'source'>
): ResolvedDodgerSpawnRule {
  const rule = plan.spawn_rules?.find((candidate) => candidate.entity_kind === entityKind);
  if (rule === undefined) {
    return { ...fallback, entityKind, source: 'template_default' };
  }

  if (rule.strategy !== fallback.strategy) {
    return { ...fallback, entityKind, source: 'template_default' };
  }

  return {
    entityId: rule.entity_id,
    entityKind,
    strategy: rule.strategy,
    count: rule.count,
    maxActive: rule.max_active,
    intervalMs: rule.interval_ms,
    laneCount: rule.lane_count ?? fallback.laneCount,
    source: 'runtime_plan'
  };
}

export function resolveDodgerDifficultyCurve(plan: DodgerRuntimePlan): ResolvedDodgerDifficultyCurve {
  const curve = plan.difficulty_curve;
  if (curve === undefined) {
    return defaultDifficultyCurve;
  }

  return {
    derivedFrom: curve.derived_from,
    level: curve.level,
    speedMultiplierStart: curve.speed_multiplier_start,
    speedMultiplierEnd: curve.speed_multiplier_end,
    spawnIntervalMultiplierStart: curve.spawn_interval_multiplier_start,
    spawnIntervalMultiplierEnd: curve.spawn_interval_multiplier_end,
    rampDurationMs: curve.ramp_duration_ms,
    source: 'runtime_plan'
  };
}

export function resolveDodgerDifficultyState(curve: ResolvedDodgerDifficultyCurve, elapsedMs: number): DodgerDifficultyState {
  const rampProgress = curve.rampDurationMs <= 0 ? 1 : Math.max(0, Math.min(1, elapsedMs / curve.rampDurationMs));

  return {
    ...curve,
    rampProgress,
    speedMultiplier: interpolate(curve.speedMultiplierStart, curve.speedMultiplierEnd, rampProgress),
    spawnIntervalMultiplier: interpolate(curve.spawnIntervalMultiplierStart, curve.spawnIntervalMultiplierEnd, rampProgress)
  };
}

function interpolate(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}
