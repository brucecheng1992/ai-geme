export type Step38PreviewVisualSliceCoverageStatus = 'PASSED' | 'FAILED' | 'NOT_APPLICABLE';
export type Step38FullDurationRuntimeCoverageStatus = 'PASSED' | 'FAILED';

export type Step38FullGameExpansionFailureReason =
  | 'missing_play_time_intent'
  | 'missing_runtime_coverage'
  | 'runtime_coverage_below_play_time_intent_min'
  | 'runtime_coverage_above_play_time_intent_max'
  | 'mission_complete_not_reached'
  | 'mission_complete_time_missing'
  | 'encounter_band_count_below_threshold'
  | 'enemy_spawn_count_below_threshold'
  | 'enemy_defeat_count_below_threshold'
  | 'full_duration_evidence_missing'
  | 'full_duration_runtime_coverage_not_passed';

export type Step38FullGameExpansionEvidence = {
  play_time_intent_seconds?: {
    min?: number;
    max?: number;
  };
  runtime_coverage_seconds?: number;
  mission_complete_reached?: boolean;
  mission_complete_time_seconds?: number;
  encounter_band_count?: number;
  enemy_spawn_count?: number;
  enemy_defeat_count?: number;
  preview_visual_slice_coverage_status?: Step38PreviewVisualSliceCoverageStatus;
  full_duration_runtime_coverage_status?: Step38FullDurationRuntimeCoverageStatus;
  model_fallback_used?: boolean;
  procedural_asset_fallback_used?: boolean;
  failure_reasons?: Step38FullGameExpansionFailureReason[];
};

export type Step38FullGameExpansionGateThresholds = {
  minimumEncounterBandCount: number;
  minimumEnemySpawnCount: number;
  minimumEnemyDefeatCount: number;
};

export type Step38FullGameExpansionGateResult = {
  status: Step38FullDurationRuntimeCoverageStatus;
  preview_visual_slice_coverage_status: Step38PreviewVisualSliceCoverageStatus;
  full_duration_runtime_coverage_status: Step38FullDurationRuntimeCoverageStatus;
  model_fallback_used: boolean;
  procedural_asset_fallback_used: boolean;
  failure_reasons: Step38FullGameExpansionFailureReason[];
};

const FAILURE_REASON_ORDER: readonly Step38FullGameExpansionFailureReason[] = [
  'full_duration_evidence_missing',
  'missing_play_time_intent',
  'missing_runtime_coverage',
  'runtime_coverage_below_play_time_intent_min',
  'runtime_coverage_above_play_time_intent_max',
  'mission_complete_not_reached',
  'mission_complete_time_missing',
  'encounter_band_count_below_threshold',
  'enemy_spawn_count_below_threshold',
  'enemy_defeat_count_below_threshold',
  'full_duration_runtime_coverage_not_passed'
];

const FAILURE_REASON_SET = new Set<string>(FAILURE_REASON_ORDER);

export function evaluateStep38FullGameExpansionEvidence(
  value: unknown,
  thresholds: Step38FullGameExpansionGateThresholds
): Step38FullGameExpansionGateResult {
  const evidence = isRecord(value) ? value : {};
  const failureReasons = new Set<Step38FullGameExpansionFailureReason>(readFailureReasons(evidence.failure_reasons));

  if (!isRecord(value)) {
    failureReasons.add('full_duration_evidence_missing');
  }

  const playTimeIntent = isRecord(evidence.play_time_intent_seconds) ? evidence.play_time_intent_seconds : {};
  const playTimeIntentMin = readFiniteNumber(playTimeIntent.min);
  const playTimeIntentMax = readFiniteNumber(playTimeIntent.max);
  if (playTimeIntentMin === null || playTimeIntentMax === null || playTimeIntentMin > playTimeIntentMax) {
    failureReasons.add('missing_play_time_intent');
  }

  const runtimeCoverageSeconds = readFiniteNumber(evidence.runtime_coverage_seconds);
  if (runtimeCoverageSeconds === null) {
    failureReasons.add('missing_runtime_coverage');
  } else {
    if (playTimeIntentMin !== null && runtimeCoverageSeconds < playTimeIntentMin) {
      failureReasons.add('runtime_coverage_below_play_time_intent_min');
    }
    if (playTimeIntentMax !== null && runtimeCoverageSeconds > playTimeIntentMax) {
      failureReasons.add('runtime_coverage_above_play_time_intent_max');
    }
  }

  if (evidence.mission_complete_reached !== true) {
    failureReasons.add('mission_complete_not_reached');
  }
  if (evidence.mission_complete_reached === true && readFiniteNumber(evidence.mission_complete_time_seconds) === null) {
    failureReasons.add('mission_complete_time_missing');
  }

  if (!meetsThreshold(evidence.encounter_band_count, thresholds.minimumEncounterBandCount)) {
    failureReasons.add('encounter_band_count_below_threshold');
  }
  if (!meetsThreshold(evidence.enemy_spawn_count, thresholds.minimumEnemySpawnCount)) {
    failureReasons.add('enemy_spawn_count_below_threshold');
  }
  if (!meetsThreshold(evidence.enemy_defeat_count, thresholds.minimumEnemyDefeatCount)) {
    failureReasons.add('enemy_defeat_count_below_threshold');
  }

  const inputFullDurationStatus =
    evidence.full_duration_runtime_coverage_status === 'PASSED' || evidence.full_duration_runtime_coverage_status === 'FAILED'
      ? evidence.full_duration_runtime_coverage_status
      : 'FAILED';
  if (inputFullDurationStatus !== 'PASSED') {
    failureReasons.add('full_duration_runtime_coverage_not_passed');
  }

  const status: Step38FullDurationRuntimeCoverageStatus = failureReasons.size === 0 ? 'PASSED' : 'FAILED';

  return {
    status,
    preview_visual_slice_coverage_status: readPreviewVisualSliceCoverageStatus(evidence.preview_visual_slice_coverage_status),
    full_duration_runtime_coverage_status: status,
    model_fallback_used: evidence.model_fallback_used === true,
    procedural_asset_fallback_used: evidence.procedural_asset_fallback_used === true,
    failure_reasons: sortFailureReasons(failureReasons)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function meetsThreshold(value: unknown, threshold: number): boolean {
  const numericValue = readFiniteNumber(value);
  return numericValue !== null && numericValue >= threshold;
}

function readPreviewVisualSliceCoverageStatus(value: unknown): Step38PreviewVisualSliceCoverageStatus {
  if (value === 'PASSED' || value === 'FAILED' || value === 'NOT_APPLICABLE') {
    return value;
  }
  return 'FAILED';
}

function readFailureReasons(value: unknown): Step38FullGameExpansionFailureReason[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is Step38FullGameExpansionFailureReason => typeof entry === 'string' && FAILURE_REASON_SET.has(entry));
}

function sortFailureReasons(reasons: Set<Step38FullGameExpansionFailureReason>): Step38FullGameExpansionFailureReason[] {
  return FAILURE_REASON_ORDER.filter((reason) => reasons.has(reason));
}
