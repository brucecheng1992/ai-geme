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
  evidence_source?: 'runtime_qa_encounter_coverage';
  run_id?: string;
  generated_by?: 'step38_full_game_expansion_evidence_builder';
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

export type Step38FullGameExpansionEvidenceInput = {
  encounterCoverage: unknown;
  playableDurationSupport: unknown;
  realPlaythroughCompletionEvidence?: unknown;
  runId?: string;
  modelFallbackUsed?: boolean;
  proceduralAssetFallbackUsed?: boolean;
};

export type Step38ProducedFullGameExpansionEvidence = Step38FullGameExpansionEvidence & {
  evidence_source: 'runtime_qa_encounter_coverage';
  generated_by: 'step38_full_game_expansion_evidence_builder';
  full_duration_runtime_verified: boolean;
  preview_visual_slice_only: boolean;
  coverage_passed: boolean;
  runtime_coverage_source: string;
  mission_complete_source: string;
  enemy_spawn_count_source: string;
  enemy_defeat_count_source: string;
};

export type Step38FullGameExpansionGateThresholds = {
  minimumEncounterBandCount: number;
  minimumEnemySpawnCount: number;
  minimumEnemyDefeatCount: number;
  expectedRunId?: string;
};

export type Step38FullGameExpansionGateResult = {
  status: Step38FullDurationRuntimeCoverageStatus;
  preview_visual_slice_coverage_status: Step38PreviewVisualSliceCoverageStatus;
  full_duration_runtime_coverage_status: Step38FullDurationRuntimeCoverageStatus;
  model_fallback_used: boolean;
  procedural_asset_fallback_used: boolean;
  failure_reasons: Step38FullGameExpansionFailureReason[];
};

export function buildStep38EncounterCoverageWithFullGameExpansionEvidence(
  input: Step38FullGameExpansionEvidenceInput
): Record<string, unknown> & { full_game_expansion_evidence: Step38ProducedFullGameExpansionEvidence } {
  const encounterCoverage = isRecord(input.encounterCoverage) ? input.encounterCoverage : {};
  return {
    ...encounterCoverage,
    full_game_expansion_evidence: buildStep38FullGameExpansionEvidenceFromQaArtifacts(input)
  };
}

export function buildStep38FullGameExpansionEvidenceFromQaArtifacts(
  input: Step38FullGameExpansionEvidenceInput
): Step38ProducedFullGameExpansionEvidence {
  const encounterCoverage = isRecord(input.encounterCoverage) ? input.encounterCoverage : {};
  const durationSupport = isRecord(input.playableDurationSupport) ? input.playableDurationSupport : {};
  const realPlaythroughCompletionEvidence = isRecord(input.realPlaythroughCompletionEvidence)
    ? input.realPlaythroughCompletionEvidence
    : {};
  const realPlaythroughGate = isRecord(realPlaythroughCompletionEvidence.real_playthrough_completion_gate)
    ? realPlaythroughCompletionEvidence.real_playthrough_completion_gate
    : {};
  const playTimeIntentSeconds = readPlayTimeIntentSeconds(durationSupport);
  const runtimeCoverageSeconds = readRuntimeCoverageSeconds(encounterCoverage, durationSupport);
  const missionCompleteReached =
    realPlaythroughGate.verdict === 'PASS' &&
    realPlaythroughGate.mission_complete_after_real_playthrough === true &&
    realPlaythroughGate.mission_complete_visible_after_play === true;
  const enemySpawnCount = readFiniteNumber(encounterCoverage.realized_enemy_count);
  const enemyDefeatCount = readFiniteNumber(encounterCoverage.enemy_defeat_count);
  const previewVisualSliceCoverageStatus = readPreviewVisualSliceCoverageStatus(
    encounterCoverage.preview_visual_slice_coverage_status
  );
  const fullDurationRuntimeCoverageStatus =
    encounterCoverage.full_duration_runtime_coverage_status === 'PASSED' ||
    encounterCoverage.full_duration_runtime_coverage_status === 'FAILED'
      ? encounterCoverage.full_duration_runtime_coverage_status
      : 'FAILED';
  const runtimeCoverageSource =
    encounterCoverage.visual_slice_preview_mode !== true
      ? 'playable_duration_support.normal_mode_estimated_sec.target'
      : readFiniteNumber(encounterCoverage.preview_target_sec) !== null
        ? 'encounter_coverage.preview_target_sec'
        : 'playable_duration_support.normal_mode_estimated_sec.target_scaled_to_preview';
  const evidence: Step38ProducedFullGameExpansionEvidence = {
    evidence_source: 'runtime_qa_encounter_coverage',
    ...(typeof input.runId === 'string' ? { run_id: input.runId } : {}),
    generated_by: 'step38_full_game_expansion_evidence_builder',
    play_time_intent_seconds: playTimeIntentSeconds,
    ...(runtimeCoverageSeconds === null ? {} : { runtime_coverage_seconds: runtimeCoverageSeconds }),
    mission_complete_reached: missionCompleteReached,
    ...(missionCompleteReached ? optionalNumberField('mission_complete_time_seconds', readMissionCompleteTimeSeconds(realPlaythroughCompletionEvidence)) : {}),
    ...(optionalNumberField('encounter_band_count', readFiniteNumber(encounterCoverage.encounter_band_count))),
    ...(optionalNumberField('enemy_spawn_count', enemySpawnCount)),
    ...(optionalNumberField('enemy_defeat_count', enemyDefeatCount)),
    preview_visual_slice_coverage_status: previewVisualSliceCoverageStatus,
    full_duration_runtime_coverage_status: fullDurationRuntimeCoverageStatus,
    full_duration_runtime_verified: false,
    preview_visual_slice_only: encounterCoverage.visual_slice_preview_mode === true,
    coverage_passed: encounterCoverage.status === 'PASSED',
    model_fallback_used: input.modelFallbackUsed === true,
    procedural_asset_fallback_used: input.proceduralAssetFallbackUsed === true,
    runtime_coverage_source: runtimeCoverageSource,
    mission_complete_source: 'real_playthrough_completion_evidence.real_playthrough_completion_gate',
    enemy_spawn_count_source: 'encounter_coverage.realized_enemy_count',
    enemy_defeat_count_source: 'encounter_coverage.enemy_defeat_count',
    failure_reasons: []
  };
  const thresholds = {
    minimumEncounterBandCount:
      readFiniteNumber(encounterCoverage.minimum_encounter_band_count_for_duration) ?? Number.POSITIVE_INFINITY,
    minimumEnemySpawnCount: readFiniteNumber(encounterCoverage.expected_enemy_count) ?? Number.POSITIVE_INFINITY,
    minimumEnemyDefeatCount: readFiniteNumber(encounterCoverage.expected_enemy_count) ?? Number.POSITIVE_INFINITY,
    ...(typeof input.runId === 'string' ? { expectedRunId: input.runId } : {})
  };
  const gate = evaluateStep38FullGameExpansionEvidence(evidence, thresholds);
  return {
    ...evidence,
    full_duration_runtime_verified: gate.status === 'PASSED',
    failure_reasons: gate.failure_reasons
  };
}

export function isStep38ProducedFullGameExpansionEvidence(value: unknown, expectedRunId: string): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value.evidence_source === 'runtime_qa_encounter_coverage' &&
    value.generated_by === 'step38_full_game_expansion_evidence_builder' &&
    value.run_id === expectedRunId
  );
}

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
  if (typeof thresholds.expectedRunId === 'string' && !isStep38ProducedFullGameExpansionEvidence(value, thresholds.expectedRunId)) {
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

function optionalNumberField(key: string, value: number | null): Record<string, number> {
  return value === null ? {} : { [key]: value };
}

function readPlayTimeIntentSeconds(value: Record<string, unknown>): { min?: number; max?: number } {
  const supportedRange = isRecord(value.supported_range_sec) ? value.supported_range_sec : {};
  const supportedMin = readFiniteNumber(supportedRange.min);
  const supportedMax = readFiniteNumber(supportedRange.max);
  if (supportedMin !== null && supportedMax !== null) {
    return { min: supportedMin, max: supportedMax };
  }

  const playTimeIntent = isRecord(value.play_time_intent) ? value.play_time_intent : {};
  const intentMin = readFiniteNumber(playTimeIntent.min_sec) ?? readFiniteNumber(playTimeIntent.min);
  const intentMax = readFiniteNumber(playTimeIntent.max_sec) ?? readFiniteNumber(playTimeIntent.max);
  return {
    ...(intentMin === null ? {} : { min: intentMin }),
    ...(intentMax === null ? {} : { max: intentMax })
  };
}

function readRuntimeCoverageSeconds(encounterCoverage: Record<string, unknown>, durationSupport: Record<string, unknown>): number | null {
  const normalEstimate = isRecord(durationSupport.normal_mode_estimated_sec) ? durationSupport.normal_mode_estimated_sec : {};
  const target = readFiniteNumber(normalEstimate.target);
  if (target === null) {
    return null;
  }

  if (encounterCoverage.visual_slice_preview_mode !== true) {
    return target;
  }

  const previewTarget = readFiniteNumber(encounterCoverage.preview_target_sec);
  if (previewTarget !== null) {
    return previewTarget;
  }

  const previewScale = readFiniteNumber(durationSupport.visual_slice_duration_scale);
  return previewScale === null ? target : Number((target * previewScale).toFixed(3));
}

function readMissionCompleteTimeSeconds(value: Record<string, unknown>): number | null {
  const screenshots = Array.isArray(value.screenshots) ? value.screenshots.filter(isRecord) : [];
  const missionCompleteTimes = screenshots
    .filter(
      (screenshot) =>
        screenshot.label === '11_mission_complete_after_play' ||
        screenshot.mission_complete_after_real_playthrough === true
    )
    .map((screenshot) => readFiniteNumber(screenshot.elapsed_sec_from_spawn))
    .filter((time): time is number => time !== null);
  if (missionCompleteTimes.length === 0) {
    return null;
  }
  return Math.max(...missionCompleteTimes);
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
