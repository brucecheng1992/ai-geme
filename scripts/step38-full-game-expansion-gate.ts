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

export type Step38EncounterCoverageRuntimeFailureReason =
  | 'qa_report_run_id_missing'
  | 'encounter_coverage_missing'
  | 'encounter_coverage_status_not_passed'
  | 'full_game_expansion_evidence_missing'
  | 'full_game_expansion_evidence_malformed'
  | 'full_game_expansion_evidence_source_mismatch'
  | 'full_game_expansion_generated_by_mismatch'
  | 'full_game_expansion_run_id_mismatch'
  | 'full_game_expansion_evaluator_failed'
  | 'product_duration_coverage_missing_or_failed'
  | 'full_duration_runtime_proof_missing'
  | 'preview_visual_slice_deferred_boundary_missing'
  | 'preview_visual_slice_coverage_failed'
  | 'expected_enemy_count_missing'
  | 'realized_enemy_count_missing'
  | 'minimum_enemy_count_for_duration_missing'
  | 'encounter_band_count_missing'
  | 'minimum_encounter_band_count_missing'
  | 'enemy_spawn_count_insufficient'
  | 'enemy_defeat_count_insufficient'
  | 'encounter_band_count_insufficient'
  | 'wave_segment_coverage_insufficient'
  | 'encounter_gap_exceeds_limit'
  | 'segments_below_minimum_band_count_malformed'
  | 'encounter_segments_below_minimum'
  | 'first_encounter_too_late'
  | 'first_viewport_enemy_count_insufficient'
  | 'static_enemy_node_coverage_insufficient'
  | 'wave_node_coverage_insufficient'
  | 'pickup_node_coverage_insufficient'
  | 'boss_coverage_insufficient'
  | 'encounter_coverage_outer_checks_failed';

export type Step38EncounterCoverageRuntimeEvaluation = {
  status: Step38FullDurationRuntimeCoverageStatus;
  blocker_category?: 'encounter_coverage_evidence_missing';
  failure_reasons: Step38EncounterCoverageRuntimeFailureReason[];
  provenance: {
    expected_run_id?: string;
    actual_run_id?: string;
    evidence_source?: unknown;
    generated_by?: unknown;
    producer_identity_passed: boolean;
    run_id_matches: boolean;
    evidence_source_matches: boolean;
    generated_by_matches: boolean;
  };
  expected_encounter_summary: Record<string, number>;
  observed_encounter_summary: Record<string, number | string[]>;
  proof_boundary: {
    visual_slice_preview_mode: boolean;
    product_duration_coverage_status?: unknown;
    full_duration_runtime_coverage_status?: unknown;
    full_duration_runtime_coverage_disposition?: unknown;
    preview_visual_slice_coverage_status?: Step38PreviewVisualSliceCoverageStatus;
    preview_deferred_non_blocking_accepted: boolean;
  };
  full_game_expansion_gate: Step38FullGameExpansionGateResult;
};

export function buildStep38EncounterCoverageWithFullGameExpansionEvidence(
  input: Step38FullGameExpansionEvidenceInput
): Record<string, unknown> & { full_game_expansion_evidence: Step38ProducedFullGameExpansionEvidence } {
  const encounterCoverage = isRecord(input.encounterCoverage) ? input.encounterCoverage : {};
  const coverageWithEvidence = {
    ...encounterCoverage,
    full_game_expansion_evidence: buildStep38FullGameExpansionEvidenceFromQaArtifacts(input)
  };
  return {
    ...coverageWithEvidence,
    runtime_evidence_evaluation: evaluateStep38EncounterCoverageRuntimeEvidence(
      coverageWithEvidence,
      typeof input.runId === 'string' && input.runId.length > 0 ? input.runId : null
    )
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

export function evaluateStep38EncounterCoverageRuntimeEvidence(
  value: unknown,
  expectedRunId: string | null
): Step38EncounterCoverageRuntimeEvaluation {
  const failureReasons = new Set<Step38EncounterCoverageRuntimeFailureReason>();
  const encounterCoverage = isRecord(value) ? value : {};

  if (typeof expectedRunId !== 'string' || expectedRunId.length === 0) {
    failureReasons.add('qa_report_run_id_missing');
  }
  if (!isRecord(value)) {
    failureReasons.add('encounter_coverage_missing');
  }
  if (encounterCoverage.status !== 'PASSED') {
    failureReasons.add('encounter_coverage_status_not_passed');
  }

  const expectedEnemyCount = readFiniteNumber(encounterCoverage.expected_enemy_count);
  const realizedEnemyCount = readFiniteNumber(encounterCoverage.realized_enemy_count);
  const minimumEnemyCountForDuration = readFiniteNumber(encounterCoverage.minimum_enemy_count_for_duration);
  const encounterBandCount = readFiniteNumber(encounterCoverage.encounter_band_count);
  const minimumEncounterBandCountForDuration = readFiniteNumber(
    encounterCoverage.minimum_encounter_band_count_for_duration
  );
  const previewExpectedEnemyCount = readFiniteNumber(encounterCoverage.preview_expected_enemy_count);
  const previewRealizedEnemyCount = readFiniteNumber(encounterCoverage.preview_realized_enemy_count);
  const previewMinimumEncounterBandCount = readFiniteNumber(encounterCoverage.preview_minimum_encounter_band_count);
  const waveSegmentCoverageCount = readFiniteNumber(encounterCoverage.wave_segment_coverage_count);
  const minimumWaveSegmentCoverageCount = readFiniteNumber(encounterCoverage.minimum_wave_segment_coverage_count);
  const maxGapBetweenEncounterBandsSec = readFiniteNumber(encounterCoverage.max_gap_between_encounter_bands_sec);
  const maxAllowedGapBetweenEncounterBandsSec = readFiniteNumber(encounterCoverage.max_allowed_gap_between_encounter_bands_sec);
  const segmentsBelowMinimumBandCountRaw = encounterCoverage.segments_below_minimum_band_count;
  const segmentsBelowMinimumBandCountMalformed =
    Array.isArray(segmentsBelowMinimumBandCountRaw) &&
    segmentsBelowMinimumBandCountRaw.some((segment) => typeof segment !== 'string');
  const segmentsBelowMinimumBandCount =
    Array.isArray(segmentsBelowMinimumBandCountRaw) && !segmentsBelowMinimumBandCountMalformed
      ? segmentsBelowMinimumBandCountRaw
      : null;
  const firstEncounterEstimatedSec = readFiniteNumber(encounterCoverage.first_encounter_estimated_sec);
  const firstViewportEnemyCount = readFiniteNumber(encounterCoverage.first_viewport_enemy_count);
  const staticEnemyNodeCount = readFiniteNumber(encounterCoverage.static_enemy_node_count);
  const realizedStaticEnemyNodeCount = readFiniteNumber(encounterCoverage.realized_static_enemy_node_count);
  const waveNodeCount = readFiniteNumber(encounterCoverage.wave_node_count);
  const realizedWaveNodeCount = readFiniteNumber(encounterCoverage.realized_wave_node_count);
  const pickupNodeCount = readFiniteNumber(encounterCoverage.pickup_node_count);
  const realizedPickupNodeCount = readFiniteNumber(encounterCoverage.realized_pickup_node_count);
  const bossNodeCount = readFiniteNumber(encounterCoverage.boss_node_count);
  const realizedBossCount = readFiniteNumber(encounterCoverage.realized_boss_count);
  const fullGameExpansionEvidenceRaw = encounterCoverage.full_game_expansion_evidence;
  const fullGameExpansionEvidence = isRecord(fullGameExpansionEvidenceRaw) ? fullGameExpansionEvidenceRaw : null;
  const fullGameExpansionEvidencePresent = Object.prototype.hasOwnProperty.call(
    encounterCoverage,
    'full_game_expansion_evidence'
  );

  if (!fullGameExpansionEvidencePresent) {
    failureReasons.add('full_game_expansion_evidence_missing');
  } else if (!isRecord(fullGameExpansionEvidenceRaw)) {
    failureReasons.add('full_game_expansion_evidence_malformed');
  }

  const evidenceSourceMatches = fullGameExpansionEvidence?.evidence_source === 'runtime_qa_encounter_coverage';
  const generatedByMatches =
    fullGameExpansionEvidence?.generated_by === 'step38_full_game_expansion_evidence_builder';
  const runIdMatches =
    typeof expectedRunId === 'string' &&
    expectedRunId.length > 0 &&
    fullGameExpansionEvidence?.run_id === expectedRunId;

  if (fullGameExpansionEvidence !== null) {
    if (!evidenceSourceMatches) failureReasons.add('full_game_expansion_evidence_source_mismatch');
    if (!generatedByMatches) failureReasons.add('full_game_expansion_generated_by_mismatch');
    if (!runIdMatches) failureReasons.add('full_game_expansion_run_id_mismatch');
  }

  const fullGameExpansionGate = evaluateStep38FullGameExpansionEvidence(fullGameExpansionEvidence, {
    minimumEncounterBandCount: minimumEncounterBandCountForDuration ?? Number.POSITIVE_INFINITY,
    minimumEnemySpawnCount: expectedEnemyCount ?? Number.POSITIVE_INFINITY,
    minimumEnemyDefeatCount: expectedEnemyCount ?? Number.POSITIVE_INFINITY,
    ...(typeof expectedRunId === 'string' && expectedRunId.length > 0 ? { expectedRunId } : {})
  });
  const fullGameExpansionPassed = fullGameExpansionGate.status === 'PASSED';
  const fullGameExpansionProducerIdentityOk =
    typeof expectedRunId === 'string' &&
    expectedRunId.length > 0 &&
    isStep38ProducedFullGameExpansionEvidence(fullGameExpansionEvidence, expectedRunId);

  if (!fullGameExpansionPassed) {
    failureReasons.add('full_game_expansion_evaluator_failed');
  }
  if (fullGameExpansionGate.failure_reasons.includes('enemy_spawn_count_below_threshold')) {
    failureReasons.add('enemy_spawn_count_insufficient');
  }
  if (fullGameExpansionGate.failure_reasons.includes('enemy_defeat_count_below_threshold')) {
    failureReasons.add('enemy_defeat_count_insufficient');
  }
  if (fullGameExpansionGate.failure_reasons.includes('encounter_band_count_below_threshold')) {
    failureReasons.add('encounter_band_count_insufficient');
  }
  if (
    fullGameExpansionGate.failure_reasons.includes('full_duration_runtime_coverage_not_passed') ||
    fullGameExpansionGate.failure_reasons.includes('runtime_coverage_below_play_time_intent_min') ||
    fullGameExpansionGate.failure_reasons.includes('missing_runtime_coverage')
  ) {
    failureReasons.add('full_duration_runtime_proof_missing');
  }

  const productDurationCoverageOk =
    encounterCoverage.product_duration_coverage_status === 'PASSED' &&
    expectedEnemyCount !== null &&
    minimumEnemyCountForDuration !== null &&
    expectedEnemyCount >= minimumEnemyCountForDuration;
  const fullDurationRuntimeCoverageOk =
    productDurationCoverageOk &&
    encounterCoverage.full_duration_runtime_coverage_status === 'PASSED' &&
    realizedEnemyCount !== null &&
    encounterBandCount !== null &&
    minimumEncounterBandCountForDuration !== null &&
    expectedEnemyCount !== null &&
    fullGameExpansionPassed &&
    realizedEnemyCount >= expectedEnemyCount &&
    encounterBandCount >= minimumEncounterBandCountForDuration;
  const previewDeferredNonBlockingAccepted =
    encounterCoverage.visual_slice_preview_mode === true &&
    encounterCoverage.full_duration_runtime_coverage_status === 'FAILED' &&
    fullGameExpansionGate.failure_reasons.length > 0 &&
    encounterCoverage.full_duration_runtime_coverage_disposition === 'DEFERRED_NON_BLOCKING' &&
    encounterCoverage.full_duration_runtime_coverage_deferred === true &&
    encounterCoverage.full_duration_runtime_coverage_blocking_current_milestone === false &&
    encounterCoverage.full_duration_enemy_count_disposition === 'DEFERRED_NON_BLOCKING' &&
    encounterCoverage.full_duration_encounter_band_count_disposition === 'DEFERRED_NON_BLOCKING';
  const fullDurationRuntimeCoverageDispositionOk =
    fullGameExpansionProducerIdentityOk && (fullGameExpansionPassed || previewDeferredNonBlockingAccepted);
  const previewVisualSliceCoverageOk =
    encounterCoverage.visual_slice_preview_mode === true &&
    encounterCoverage.preview_visual_slice_coverage_status === 'PASSED' &&
    previewExpectedEnemyCount !== null &&
    previewRealizedEnemyCount !== null &&
    previewMinimumEncounterBandCount !== null &&
    encounterBandCount !== null &&
    previewRealizedEnemyCount >= previewExpectedEnemyCount &&
    encounterBandCount >= previewMinimumEncounterBandCount;

  if (expectedEnemyCount === null) failureReasons.add('expected_enemy_count_missing');
  if (realizedEnemyCount === null) failureReasons.add('realized_enemy_count_missing');
  if (minimumEnemyCountForDuration === null) failureReasons.add('minimum_enemy_count_for_duration_missing');
  if (encounterBandCount === null) failureReasons.add('encounter_band_count_missing');
  if (minimumEncounterBandCountForDuration === null) failureReasons.add('minimum_encounter_band_count_missing');
  if (!productDurationCoverageOk) failureReasons.add('product_duration_coverage_missing_or_failed');
  if (!fullDurationRuntimeCoverageDispositionOk) {
    failureReasons.add(
      encounterCoverage.visual_slice_preview_mode === true
        ? 'preview_visual_slice_deferred_boundary_missing'
        : 'full_duration_runtime_proof_missing'
    );
  }
  if (encounterCoverage.visual_slice_preview_mode === true && !previewVisualSliceCoverageOk) {
    failureReasons.add('preview_visual_slice_coverage_failed');
  }

  const requiredShapeOk =
    typeof encounterCoverage.expected_enemy_count === 'number' &&
    typeof encounterCoverage.realized_enemy_count === 'number' &&
    typeof encounterCoverage.minimum_enemy_count_for_duration === 'number' &&
    typeof encounterCoverage.encounter_band_count === 'number' &&
    typeof encounterCoverage.minimum_encounter_band_count_for_duration === 'number' &&
    waveSegmentCoverageCount !== null &&
    minimumWaveSegmentCoverageCount !== null &&
    maxGapBetweenEncounterBandsSec !== null &&
    maxAllowedGapBetweenEncounterBandsSec !== null &&
    segmentsBelowMinimumBandCount !== null &&
    firstEncounterEstimatedSec !== null &&
    firstViewportEnemyCount !== null &&
    staticEnemyNodeCount !== null &&
    realizedStaticEnemyNodeCount !== null &&
    waveNodeCount !== null &&
    realizedWaveNodeCount !== null &&
    pickupNodeCount !== null &&
    realizedPickupNodeCount !== null &&
    bossNodeCount !== null &&
    realizedBossCount !== null;

  if (
    waveSegmentCoverageCount !== null &&
    minimumWaveSegmentCoverageCount !== null &&
    waveSegmentCoverageCount < minimumWaveSegmentCoverageCount
  ) {
    failureReasons.add('wave_segment_coverage_insufficient');
  }
  if (
    maxGapBetweenEncounterBandsSec !== null &&
    maxAllowedGapBetweenEncounterBandsSec !== null &&
    maxGapBetweenEncounterBandsSec > maxAllowedGapBetweenEncounterBandsSec
  ) {
    failureReasons.add('encounter_gap_exceeds_limit');
  }
  if (segmentsBelowMinimumBandCountMalformed) {
    failureReasons.add('segments_below_minimum_band_count_malformed');
  }
  if (segmentsBelowMinimumBandCount !== null && segmentsBelowMinimumBandCount.length > 0) {
    failureReasons.add('encounter_segments_below_minimum');
  }
  if (firstEncounterEstimatedSec !== null && firstEncounterEstimatedSec > 8) {
    failureReasons.add('first_encounter_too_late');
  }
  if (firstViewportEnemyCount !== null && firstViewportEnemyCount < 2) {
    failureReasons.add('first_viewport_enemy_count_insufficient');
  }
  if (
    staticEnemyNodeCount !== null &&
    realizedStaticEnemyNodeCount !== null &&
    (staticEnemyNodeCount < 1 || realizedStaticEnemyNodeCount < staticEnemyNodeCount)
  ) {
    failureReasons.add('static_enemy_node_coverage_insufficient');
  }
  if (
    waveNodeCount !== null &&
    realizedWaveNodeCount !== null &&
    (waveNodeCount < 2 || realizedWaveNodeCount < waveNodeCount)
  ) {
    failureReasons.add('wave_node_coverage_insufficient');
  }
  if (
    pickupNodeCount !== null &&
    realizedPickupNodeCount !== null &&
    (pickupNodeCount < 1 || realizedPickupNodeCount < pickupNodeCount)
  ) {
    failureReasons.add('pickup_node_coverage_insufficient');
  }
  if (
    bossNodeCount !== null &&
    realizedBossCount !== null &&
    (bossNodeCount < 1 || realizedBossCount < 1)
  ) {
    failureReasons.add('boss_coverage_insufficient');
  }

  const ready =
    requiredShapeOk &&
    productDurationCoverageOk &&
    fullDurationRuntimeCoverageDispositionOk &&
    (encounterCoverage.visual_slice_preview_mode === true ? previewVisualSliceCoverageOk : fullDurationRuntimeCoverageOk) &&
    waveSegmentCoverageCount !== null &&
    minimumWaveSegmentCoverageCount !== null &&
    waveSegmentCoverageCount >= minimumWaveSegmentCoverageCount &&
    maxGapBetweenEncounterBandsSec !== null &&
    maxAllowedGapBetweenEncounterBandsSec !== null &&
    maxGapBetweenEncounterBandsSec <= maxAllowedGapBetweenEncounterBandsSec &&
    segmentsBelowMinimumBandCount !== null &&
    segmentsBelowMinimumBandCount.length === 0 &&
    firstEncounterEstimatedSec !== null &&
    firstEncounterEstimatedSec <= 8 &&
    firstViewportEnemyCount !== null &&
    firstViewportEnemyCount >= 2 &&
    staticEnemyNodeCount !== null &&
    staticEnemyNodeCount >= 1 &&
    realizedStaticEnemyNodeCount !== null &&
    realizedStaticEnemyNodeCount >= staticEnemyNodeCount &&
    waveNodeCount !== null &&
    waveNodeCount >= 2 &&
    realizedWaveNodeCount !== null &&
    realizedWaveNodeCount >= waveNodeCount &&
    pickupNodeCount !== null &&
    pickupNodeCount >= 1 &&
    realizedPickupNodeCount !== null &&
    realizedPickupNodeCount >= pickupNodeCount &&
    bossNodeCount !== null &&
    bossNodeCount >= 1 &&
    realizedBossCount !== null &&
    realizedBossCount >= 1;

  if (!ready && failureReasons.size === 0) {
    failureReasons.add('encounter_coverage_outer_checks_failed');
  }

  const sortedFailureReasons = ready ? [] : sortEncounterCoverageRuntimeFailureReasons(failureReasons);
  return {
    status: ready ? 'PASSED' : 'FAILED',
    ...(ready ? {} : { blocker_category: 'encounter_coverage_evidence_missing' as const }),
    failure_reasons: sortedFailureReasons,
    provenance: {
      ...(typeof expectedRunId === 'string' && expectedRunId.length > 0 ? { expected_run_id: expectedRunId } : {}),
      ...(typeof fullGameExpansionEvidence?.run_id === 'string' ? { actual_run_id: fullGameExpansionEvidence.run_id } : {}),
      evidence_source: fullGameExpansionEvidence?.evidence_source,
      generated_by: fullGameExpansionEvidence?.generated_by,
      producer_identity_passed: fullGameExpansionProducerIdentityOk,
      run_id_matches: runIdMatches,
      evidence_source_matches: evidenceSourceMatches,
      generated_by_matches: generatedByMatches
    },
    expected_encounter_summary: {
      ...optionalNumberField('expected_enemy_count', expectedEnemyCount),
      ...optionalNumberField('minimum_enemy_count_for_duration', minimumEnemyCountForDuration),
      ...optionalNumberField('minimum_encounter_band_count_for_duration', minimumEncounterBandCountForDuration),
      ...optionalNumberField('preview_expected_enemy_count', previewExpectedEnemyCount),
      ...optionalNumberField('preview_minimum_encounter_band_count', previewMinimumEncounterBandCount),
      ...optionalNumberField('minimum_wave_segment_coverage_count', minimumWaveSegmentCoverageCount),
      ...optionalNumberField('max_allowed_gap_between_encounter_bands_sec', maxAllowedGapBetweenEncounterBandsSec)
    },
    observed_encounter_summary: {
      ...optionalNumberField('realized_enemy_count', realizedEnemyCount),
      ...optionalNumberField('enemy_defeat_count', readFiniteNumber(encounterCoverage.enemy_defeat_count)),
      ...optionalNumberField('encounter_band_count', encounterBandCount),
      ...optionalNumberField('preview_realized_enemy_count', previewRealizedEnemyCount),
      ...optionalNumberField('wave_segment_coverage_count', waveSegmentCoverageCount),
      ...optionalNumberField('max_gap_between_encounter_bands_sec', maxGapBetweenEncounterBandsSec),
      ...(segmentsBelowMinimumBandCount === null ? {} : { segments_below_minimum_band_count: segmentsBelowMinimumBandCount })
    },
    proof_boundary: {
      visual_slice_preview_mode: encounterCoverage.visual_slice_preview_mode === true,
      product_duration_coverage_status: encounterCoverage.product_duration_coverage_status,
      full_duration_runtime_coverage_status: encounterCoverage.full_duration_runtime_coverage_status,
      full_duration_runtime_coverage_disposition: encounterCoverage.full_duration_runtime_coverage_disposition,
      preview_visual_slice_coverage_status: readPreviewVisualSliceCoverageStatus(
        encounterCoverage.preview_visual_slice_coverage_status
      ),
      preview_deferred_non_blocking_accepted: previewDeferredNonBlockingAccepted
    },
    full_game_expansion_gate: fullGameExpansionGate
  };
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

const ENCOUNTER_COVERAGE_RUNTIME_FAILURE_REASON_ORDER: readonly Step38EncounterCoverageRuntimeFailureReason[] = [
  'qa_report_run_id_missing',
  'encounter_coverage_missing',
  'encounter_coverage_status_not_passed',
  'full_game_expansion_evidence_missing',
  'full_game_expansion_evidence_malformed',
  'full_game_expansion_evidence_source_mismatch',
  'full_game_expansion_generated_by_mismatch',
  'full_game_expansion_run_id_mismatch',
  'full_game_expansion_evaluator_failed',
  'product_duration_coverage_missing_or_failed',
  'full_duration_runtime_proof_missing',
  'preview_visual_slice_deferred_boundary_missing',
  'preview_visual_slice_coverage_failed',
  'expected_enemy_count_missing',
  'realized_enemy_count_missing',
  'minimum_enemy_count_for_duration_missing',
  'encounter_band_count_missing',
  'minimum_encounter_band_count_missing',
  'enemy_spawn_count_insufficient',
  'enemy_defeat_count_insufficient',
  'encounter_band_count_insufficient',
  'wave_segment_coverage_insufficient',
  'encounter_gap_exceeds_limit',
  'segments_below_minimum_band_count_malformed',
  'encounter_segments_below_minimum',
  'first_encounter_too_late',
  'first_viewport_enemy_count_insufficient',
  'static_enemy_node_coverage_insufficient',
  'wave_node_coverage_insufficient',
  'pickup_node_coverage_insufficient',
  'boss_coverage_insufficient',
  'encounter_coverage_outer_checks_failed'
];

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

function sortEncounterCoverageRuntimeFailureReasons(
  reasons: Set<Step38EncounterCoverageRuntimeFailureReason>
): Step38EncounterCoverageRuntimeFailureReason[] {
  return ENCOUNTER_COVERAGE_RUNTIME_FAILURE_REASON_ORDER.filter((reason) => reasons.has(reason));
}
