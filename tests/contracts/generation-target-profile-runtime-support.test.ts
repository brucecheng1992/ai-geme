import { describe, expect, it } from 'vitest';

import {
  ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
  ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID,
  ARTIFACT_NO_HIDDEN_SCRIPT_EVENT_TYPE,
  ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID,
  CAMERA_BOUNDS_CLAMP_EVENT_TYPE,
  CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID,
  CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID,
  CANONICAL_SEMANTIC_PRESERVATION_EVENT_TYPE,
  CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID,
  COLLISION_DAMAGE_AFFINITY_MATRIX_EVENT_TYPE,
  COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID,
  COLLISION_PLATFORM_REQUIRED_PROBE_ID,
  COMBAT_AIRBORNE_FIRE_REQUIRED_PROBE_ID,
  COMBAT_PROJECTILE_REQUIRED_PROBE_ID,
  DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID,
  ENEMY_BOSS_ATTACK_PATTERN_CADENCE_MS,
  ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
  ENEMY_BOSS_ATTACK_PATTERN_PHASE_ID,
  ENEMY_BOSS_ATTACK_PATTERN_PATTERN_ID,
  ENEMY_BOSS_ATTACK_PATTERN_REQUIRED_PROBE_ID,
  ENEMY_BOSS_LIFECYCLE_BOSS_ENTITY_ID,
  ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
  ENEMY_BOSS_LIFECYCLE_MAX_HEALTH,
  ENEMY_BOSS_LIFECYCLE_REQUIRED_PROBE_ID,
  ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
  ENEMY_BOSS_PHASE_TRANSITION_FROM_PHASE_ID,
  ENEMY_BOSS_PHASE_TRANSITION_HEALTH_THRESHOLD_RATIO,
  ENEMY_BOSS_PHASE_TRANSITION_REQUIRED_PROBE_ID,
  ENEMY_BOSS_PHASE_TRANSITION_SPEED_MULTIPLIER,
  ENEMY_BOSS_PHASE_TRANSITION_TO_PHASE_ID,
  ENEMY_FIXED_TURRET_ARCHETYPE_ID,
  ENEMY_FIXED_TURRET_ENTITY_ID,
  ENEMY_FIXED_TURRET_EVENT_TYPE,
  ENEMY_FIXED_TURRET_FIRE_CADENCE_MS,
  ENEMY_FIXED_TURRET_PROJECTILE_PATTERN_ID,
  ENEMY_FIXED_TURRET_REQUIRED_PROBE_ID,
  ENEMY_FLYING_RIGHT_ENTRY_ARCHETYPE_ID,
  ENEMY_FLYING_RIGHT_ENTRY_ENEMY_ID,
  ENEMY_FLYING_RIGHT_ENTRY_ENTRY_SIDE,
  ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
  ENEMY_PATROL_INFANTRY_EVENT_TYPE,
  ENEMY_FLYING_RIGHT_ENTRY_MOVEMENT_PATTERN_ID,
  ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID,
  ENEMY_FLYING_RIGHT_ENTRY_SEGMENT_ID,
  ENEMY_FLYING_RIGHT_ENTRY_WAVE_ID,
  ENEMY_PATROL_INFANTRY_ARCHETYPE_ID,
  ENEMY_PATROL_INFANTRY_ENEMY_ID,
  ENEMY_PATROL_INFANTRY_MOVEMENT_PATTERN_ID,
  ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID,
  ENEMY_PATROL_INFANTRY_ROUTE_ID,
  ENEMY_PATROL_INFANTRY_SEGMENT_ID,
  FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
  FEEDBACK_VICTORY_DECLARATION_OUTCOME,
  FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID,
  FEEDBACK_VICTORY_DECLARATION_TEXT,
  FEEDBACK_VICTORY_DECLARATION_TRIGGER,
  FIXED_PROMPT_BINDING_EVENT_TYPE,
  FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID,
  GENERATION_FALLBACK_POLICY_FAIL_CLOSED_ERROR_CODE,
  GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
  GENERATION_FALLBACK_POLICY_FAIL_CLOSED_POLICY,
  GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID,
  GOAL_BOSS_UNLOCK_BOSS_ENTITY_ID,
  GOAL_BOSS_UNLOCK_EVENT_TYPE,
  GOAL_BOSS_UNLOCK_REASON,
  GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID,
  GOAL_BOSS_UNLOCK_REQUIRED_WAVE_COUNT,
  GOAL_BOSS_UNLOCK_WAVE_ID,
  HAZARD_FALLING_AREA_BOSS_PHASE_ID,
  HAZARD_FALLING_AREA_DAMAGE,
  HAZARD_FALLING_AREA_EVENT_TYPE,
  HAZARD_FALLING_AREA_HAZARD_ID,
  HAZARD_FALLING_AREA_PATTERN_ID,
  HAZARD_FALLING_AREA_REQUIRED_PROBE_ID,
  HAZARD_FALLING_AREA_TELEGRAPH_MS,
  HAZARD_TIMED_EXPLOSION_COUNTDOWN_MS,
  HAZARD_TIMED_EXPLOSION_DAMAGE,
  HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
  HAZARD_TIMED_EXPLOSION_HAZARD_ID,
  HAZARD_TIMED_EXPLOSION_RADIUS,
  HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID,
  HAZARD_TIMED_EXPLOSION_TIMER_ID,
  HAZARD_TIMED_EXPLOSION_TRIGGER_CONDITION,
  RULES_CHECKPOINT_RESTORE_CHECKPOINT_ID,
  RULES_CHECKPOINT_RESTORE_DAMAGE_EVENT_TYPE,
  RULES_CHECKPOINT_RESTORE_EVENT_TYPE,
  RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID,
  RULES_CHECKPOINT_RESTORE_RETRY_COUNT_AFTER,
  RULES_CHECKPOINT_RESTORE_RETRY_COUNT_BEFORE,
  RULES_ENCOUNTER_GATE_ENTRANCE_ID,
  RULES_ENCOUNTER_GATE_EVENT_TYPE,
  RULES_ENCOUNTER_GATE_GATE_ID,
  RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID,
  RULES_ENCOUNTER_GATE_SEQUENCE_INDEX,
  RULES_ENCOUNTER_GATE_WAVE_ID,
  RULES_RETRY_COUNT_AFTER,
  RULES_RETRY_COUNT_BEFORE,
  RULES_RETRY_COUNT_DAMAGE_EVENT_TYPE,
  RULES_RETRY_COUNT_EVENT_TYPE,
  RULES_RETRY_COUNT_INITIAL_RETRIES,
  RULES_RETRY_COUNT_REMAINING,
  RULES_RETRY_COUNT_REQUIRED_PROBE_ID,
  RULES_STATE_TRANSITION_GRAPH_EVENT_TYPE,
  RULES_STATE_TRANSITION_GRAPH_FROM_STATE,
  RULES_STATE_TRANSITION_GRAPH_ID,
  RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID,
  RULES_STATE_TRANSITION_GRAPH_STATE_COUNT,
  RULES_STATE_TRANSITION_GRAPH_TO_STATE,
  RULES_STATE_TRANSITION_GRAPH_TRANSITION_COUNT,
  RULES_STATE_TRANSITION_GRAPH_TRIGGER,
  GenerationTargetProfileRuntimeSupportReportSchema,
  HEALTH_DAMAGE_INVULNERABILITY_REQUIRED_PROBE_ID,
  HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID,
  MOVEMENT_CROUCH_HEIGHT_SCALE,
  MOVEMENT_CROUCH_REQUIRED_PROBE_ID,
  MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID,
  PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID,
  PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
  PICKUP_WEAPON_SUPPLY_NODE_ID,
  PICKUP_WEAPON_SUPPLY_PICKUP_ID,
  PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID,
  PICKUP_WEAPON_SUPPLY_WEAPON_ID,
  PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
  PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_ARTIFACT_KIND,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_CANONICAL_SCHEMA_VERSION,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_EVENT_TYPE,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PROVIDER_ID,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_SCHEMA_VERSION,
  REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
  REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID,
  RUNTIME_MANIFEST_BINDING_CAPABILITY_ID,
  RUNTIME_MANIFEST_BINDING_EVENT_TYPE,
  RUNTIME_MANIFEST_BINDING_PROFILE_ID,
  RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID,
  RUNTIME_MANIFEST_BINDING_RUNTIME_FAMILY,
  RUNTIME_MANIFEST_BINDING_RUNTIME_SYSTEM_ID,
  RUNTIME_MANIFEST_BINDING_SYSTEM_DEPENDENCY_COUNT,
  RUNTIME_MANIFEST_BINDING_SYSTEM_PHASE,
  RUNTIME_MANIFEST_BINDING_SYSTEM_VERSION,
  RUNTIME_MANIFEST_BINDING_TEMPLATE_ID,
  RUNTIME_MODULE_LOAD_RECEIPT_CAPABILITY_ID,
  RUNTIME_MODULE_LOAD_RECEIPT_EVENT_TYPE,
  RUNTIME_MODULE_LOAD_RECEIPT_KIND,
  RUNTIME_MODULE_LOAD_RECEIPT_MIN_LIFECYCLE_EVENT_COUNT,
  RUNTIME_MODULE_LOAD_RECEIPT_MIN_LOAD_ORDER_COUNT,
  RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID,
  RUNTIME_MODULE_LOAD_RECEIPT_SCHEMA_VERSION,
  RUNTIME_PLAN_COVERAGE_CAPABILITY_ID,
  RUNTIME_PLAN_COVERAGE_EVENT_TYPE,
  RUNTIME_PLAN_COVERAGE_KIND,
  RUNTIME_PLAN_COVERAGE_PROFILE_ID,
  RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID,
  RUNTIME_PLAN_COVERAGE_RUNTIME_FAMILY,
  RUNTIME_PLAN_COVERAGE_SCHEMA_VERSION,
  createRuntimePlanCoveragePackageContract,
  SCENE_ORDERED_SEGMENTS_CAPABILITY_ID,
  SCENE_ORDERED_SEGMENTS_COUNT,
  SCENE_ORDERED_SEGMENTS_EVENT_TYPE,
  SCENE_ORDERED_SEGMENTS_FIRST_ID,
  SCENE_ORDERED_SEGMENTS_PROFILE_ID,
  SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID,
  SCENE_ORDERED_SEGMENTS_RUNTIME_FAMILY,
  SCENE_ORDERED_SEGMENTS_SCENE_ID,
  SCENE_ORDERED_SEGMENTS_SCHEMA_VERSION,
  SCENE_ORDERED_SEGMENTS_SECOND_ID,
  SCENE_ORDERED_SEGMENTS_THIRD_ID,
  createSceneOrderedSegmentsPackageContract,
  SCENE_VISUAL_PRESENTATION_METADATA_CAPABILITY_ID,
  SCENE_VISUAL_PRESENTATION_METADATA_COLOR_DEPTH_BITS,
  SCENE_VISUAL_PRESENTATION_METADATA_EVENT_TYPE,
  SCENE_VISUAL_PRESENTATION_METADATA_ORIGINALITY_POLICY,
  SCENE_VISUAL_PRESENTATION_METADATA_PROFILE_ID,
  SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID,
  SCENE_VISUAL_PRESENTATION_METADATA_RUNTIME_FAMILY,
  SCENE_VISUAL_PRESENTATION_METADATA_SCHEMA_VERSION,
  SCENE_VISUAL_PRESENTATION_METADATA_STYLE_ID,
  SCENE_VISUAL_PRESENTATION_METADATA_STYLE_LABEL,
  createSceneVisualPresentationMetadataPackageContract,
  SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID,
  SPAWN_STATIC_REQUIRED_PROBE_ID,
  WEAPON_DEATH_RESET_EVENT_TYPE,
  WEAPON_DEATH_RESET_INITIAL_WEAPON_ID,
  WEAPON_DEATH_RESET_NON_INITIAL_WEAPON_ID,
  WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
  WEAPON_DEATH_RESET_REQUIRED_PROBE_ID,
  WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
  WEAPON_RAPID_FIRE_BURST_SHOT_COUNT,
  WEAPON_RAPID_FIRE_BURST_WINDOW_MS,
  WEAPON_RAPID_FIRE_COOLDOWN_MS,
  WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID,
  WEAPON_SPREAD_SHOT_EVENT_TYPE,
  WEAPON_SPREAD_SHOT_PROJECTILE_COUNT,
  WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID,
  WEAPON_SPREAD_SHOT_SPREAD_ARC_DEGREES,
  WEAPON_SPREAD_SHOT_SPREAD_ANGLES_DEGREES,
  WEAPON_REPLACEMENT_RULE_EVENT_TYPE,
  WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
  WEAPON_REPLACEMENT_RULE_PREVIOUS_WEAPON_ID,
  WEAPON_REPLACEMENT_RULE_REPLACEMENT_WEAPON_ID,
  WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID,
  buildCapabilityQaProbeResultsFromRuntimeEvidence,
  buildCapabilityRuntimeQaPlan,
  buildGenerationTargetProfileRuntimeSupportReport,
  createArtifactLineageNoManualPatchPackageContract,
  createArtifactNoHiddenScriptPackageContract,
  createCameraBoundsClampPackageContract,
  createCameraSideFollowPackageContract,
  createCanonicalSemanticPreservationPackageContract,
  createCollisionDamageAffinityMatrixPackageContract,
  createCollisionPlatformPackageContract,
  createCombatAirborneFirePackageContract,
  createCombatProjectilePackageContract,
  createDefaultStraightSingleWeaponPackageContract,
  createEnemyBossAttackPatternPackageContract,
  createEnemyBossLifecyclePackageContract,
  createEnemyBossPhaseTransitionPackageContract,
  createEnemyFixedTurretPackageContract,
  createEnemyFlyingRightEntryPackageContract,
  createEnemyPatrolInfantryPackageContract,
  createFeedbackVictoryDeclarationPackageContract,
  createFixedPromptBindingPackageContract,
  createGenerationFallbackPolicyFailClosedPackageContract,
  createGoalBossUnlockPackageContract,
  createHazardFallingAreaPackageContract,
  createHazardTimedExplosionPackageContract,
  createHealthDamageInvulnerabilityPackageContract,
  createHealthPlayerHealthPointsPackageContract,
  createMovementCrouchPackageContract,
  createMovementRunJumpPackageContract,
  createPickupCollectiblePackageContract,
  createPickupWeaponSupplyPackageContract,
  createProfileDeepSeekRunAndGunValidationPackageContract,
  createProviderDeepSeekAuthoritativeDraftPackageContract,
  createReviewOracleFinalGatePackageContract,
  createRuntimeManifestBindingPackageContract,
  createRuntimeModuleLoadReceiptPackageContract,
  createRulesCheckpointRestorePackageContract,
  createRulesEncounterGatePackageContract,
  createRulesRetryCountPackageContract,
  createRulesStateTransitionGraphPackageContract,
  createSpawnEnemyWavePackageContract,
  createSpawnStaticPackageContract,
  createWeaponDeathResetPackageContract,
  createWeaponRapidFirePackageContract,
  createWeaponSpreadShotPackageContract,
  createWeaponReplacementRulePackageContract,
  evaluateCapabilityQaReport,
  resolveGameplayCapabilityGraph,
  type CapabilityRuntimeObservedProbeEvidence,
  type GameplayCapabilityPackageContract
} from '../../packages/game-dsl/src/index.js';

const artifactLineageNoManualPatchCapabilityId = 'artifact.lineage_no_manual_patch.v1';
const artifactNoHiddenScriptCapabilityId = 'artifact.no_hidden_script.v1';
const cameraBoundsClampCapabilityId = 'camera.bounds_clamp.v1';
const canonicalSemanticPreservationCapabilityId = 'canonical.semantic_preservation.v1';
const collisionDamageAffinityMatrixCapabilityId = 'collision.damage_affinity_matrix.v1';
const enemyBossAttackPatternCapabilityId = 'enemy.boss_attack_pattern.v1';
const enemyBossLifecycleCapabilityId = 'enemy.boss_lifecycle.v1';
const enemyBossPhaseTransitionCapabilityId = 'enemy.boss_phase_transition.v1';
const enemyFixedTurretCapabilityId = 'enemy.fixed_turret.v1';
const enemyFlyingRightEntryCapabilityId = 'enemy.flying_right_entry.v1';
const enemyPatrolInfantryCapabilityId = 'enemy.patrol_infantry.v1';
const feedbackVictoryDeclarationCapabilityId = 'feedback.victory_declaration.v1';
const generationFallbackPolicyFailClosedCapabilityId = 'generation.fallback_policy_fail_closed.v1';
const goalBossUnlockCapabilityId = 'goal.boss_unlock.v1';
const hazardFallingAreaCapabilityId = 'hazard.falling_area.v1';
const hazardTimedExplosionCapabilityId = 'hazard.timed_explosion.v1';
const rulesCheckpointRestoreCapabilityId = 'rules.checkpoint_restore.v1';
const rulesEncounterGateCapabilityId = 'rules.encounter_gate.v1';
const rulesRetryCountCapabilityId = 'rules.retry_count.v1';
const rulesStateTransitionGraphCapabilityId = 'rules.state_transition_graph.v1';
const cameraCapabilityId = 'camera.side_follow.v1';
const collisionCapabilityId = 'collision.platform.v1';
const airborneFireCapabilityId = 'combat.airborne_fire.v1';
const defaultWeaponCapabilityId = 'weapon.default_straight_single.v1';
const projectileCapabilityId = 'combat.projectile.v1';
const crouchCapabilityId = 'movement.crouch.v1';
const movementCapabilityId = 'movement.run_jump.v1';
const spawnEnemyWaveCapabilityId = 'spawn.enemy_wave.v1';
const spawnStaticCapabilityId = 'spawn.static.v1';
const damageInvulnerabilityCapabilityId = 'health.damage_invulnerability.v1';
const healthCapabilityId = 'health.player_health_points.v1';
const pickupCapabilityId = 'pickup.collectible.v1';
const pickupWeaponSupplyCapabilityId = 'pickup.weapon_supply.v1';
const fixedPromptBindingCapabilityId = 'metadata.fixed_prompt_binding.v1';
const profileBindingCapabilityId = 'profile.deepseek_run_and_gun_validation.v1';
const providerDeepSeekAuthoritativeDraftCapabilityId = 'provider.deepseek_authoritative_draft.v1';
const reviewOracleFinalGateCapabilityId = 'review.oracle_final_gate.v1';
const runtimeManifestBindingCapabilityId = RUNTIME_MANIFEST_BINDING_CAPABILITY_ID;
const runtimeModuleLoadReceiptCapabilityId = RUNTIME_MODULE_LOAD_RECEIPT_CAPABILITY_ID;
const runtimePlanCoverageCapabilityId = RUNTIME_PLAN_COVERAGE_CAPABILITY_ID;
const sceneOrderedSegmentsCapabilityId = SCENE_ORDERED_SEGMENTS_CAPABILITY_ID;
const sceneVisualPresentationMetadataCapabilityId = SCENE_VISUAL_PRESENTATION_METADATA_CAPABILITY_ID;
const deathResetCapabilityId = 'weapon.death_reset.v1';
const rapidFireCapabilityId = 'weapon.rapid_fire.v1';
const spreadShotCapabilityId = 'weapon.spread_shot.v1';
const replacementRuleCapabilityId = 'weapon.replacement_rule.v1';

describe('Step 37 target profile runtime support overlay', () => {
  it('records runtime-observed support without mutating static completeSupported evidence', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport([
      ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
      'camera.side_follow.active',
      'collision.platform.grounded',
      ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
      ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
      ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
      ENEMY_FIXED_TURRET_EVENT_TYPE,
      ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
      ENEMY_PATROL_INFANTRY_EVENT_TYPE,
      FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
      GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
      GOAL_BOSS_UNLOCK_EVENT_TYPE,
      HAZARD_FALLING_AREA_EVENT_TYPE,
      HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
      RULES_CHECKPOINT_RESTORE_DAMAGE_EVENT_TYPE,
      RULES_CHECKPOINT_RESTORE_EVENT_TYPE,
      RULES_RETRY_COUNT_DAMAGE_EVENT_TYPE,
      RULES_RETRY_COUNT_EVENT_TYPE,
      RULES_STATE_TRANSITION_GRAPH_EVENT_TYPE,
      'combat.airborne_fire.fired',
      'player.fired',
      'projectile.spawned',
      'movement.crouch.entered',
      'player.jumped',
      'pickup.collectible.collected',
      'pickup.collectible.state_changed',
      PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
      'spawn.enemy_wave.ordered',
      'spawn.static.triggered',
      'health.damage_invulnerability.activated',
      'health.damage_invulnerability.blocked',
      'health.player_health.current',
      FIXED_PROMPT_BINDING_EVENT_TYPE,
      PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
      PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_EVENT_TYPE,
      REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
      RUNTIME_MANIFEST_BINDING_EVENT_TYPE,
      RUNTIME_MODULE_LOAD_RECEIPT_EVENT_TYPE,
      RUNTIME_PLAN_COVERAGE_EVENT_TYPE,
      SCENE_ORDERED_SEGMENTS_EVENT_TYPE,
      SCENE_VISUAL_PRESENTATION_METADATA_EVENT_TYPE,
      WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
      WEAPON_DEATH_RESET_EVENT_TYPE,
      WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
      WEAPON_SPREAD_SHOT_EVENT_TYPE,
      WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
      WEAPON_REPLACEMENT_RULE_EVENT_TYPE
    ]);
    const report = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260625_target_runtime_support',
      runId: 'run_20260625_target_runtime_support',
      capabilityQaReport
    });
    const camera = report.capabilities.find((entry) => entry.capabilityId === cameraCapabilityId);
    const collision = report.capabilities.find((entry) => entry.capabilityId === collisionCapabilityId);
    const enemyBossAttackPattern = report.capabilities.find((entry) => entry.capabilityId === enemyBossAttackPatternCapabilityId);
    const enemyBossLifecycle = report.capabilities.find((entry) => entry.capabilityId === enemyBossLifecycleCapabilityId);
    const enemyBossPhaseTransition = report.capabilities.find((entry) => entry.capabilityId === enemyBossPhaseTransitionCapabilityId);
    const enemyFixedTurret = report.capabilities.find((entry) => entry.capabilityId === enemyFixedTurretCapabilityId);
    const enemyFlyingRightEntry = report.capabilities.find((entry) => entry.capabilityId === enemyFlyingRightEntryCapabilityId);
    const enemyPatrolInfantry = report.capabilities.find((entry) => entry.capabilityId === enemyPatrolInfantryCapabilityId);
    const feedbackVictoryDeclaration = report.capabilities.find((entry) => entry.capabilityId === feedbackVictoryDeclarationCapabilityId);
    const generationFallbackPolicyFailClosed = report.capabilities.find((entry) => entry.capabilityId === generationFallbackPolicyFailClosedCapabilityId);
    const goalBossUnlock = report.capabilities.find((entry) => entry.capabilityId === goalBossUnlockCapabilityId);
    const hazardFallingArea = report.capabilities.find((entry) => entry.capabilityId === hazardFallingAreaCapabilityId);
    const hazardTimedExplosion = report.capabilities.find((entry) => entry.capabilityId === hazardTimedExplosionCapabilityId);
    const rulesCheckpointRestore = report.capabilities.find((entry) => entry.capabilityId === rulesCheckpointRestoreCapabilityId);
    const rulesRetryCount = report.capabilities.find((entry) => entry.capabilityId === rulesRetryCountCapabilityId);
    const rulesStateTransitionGraph = report.capabilities.find((entry) => entry.capabilityId === rulesStateTransitionGraphCapabilityId);
    const defaultWeapon = report.capabilities.find((entry) => entry.capabilityId === defaultWeaponCapabilityId);
    const projectile = report.capabilities.find((entry) => entry.capabilityId === projectileCapabilityId);
    const movement = report.capabilities.find((entry) => entry.capabilityId === movementCapabilityId);
    const spawnStatic = report.capabilities.find((entry) => entry.capabilityId === spawnStaticCapabilityId);
    const damageInvulnerability = report.capabilities.find((entry) => entry.capabilityId === damageInvulnerabilityCapabilityId);
    const health = report.capabilities.find((entry) => entry.capabilityId === healthCapabilityId);
    const pickup = report.capabilities.find((entry) => entry.capabilityId === pickupCapabilityId);
    const pickupWeaponSupply = report.capabilities.find((entry) => entry.capabilityId === pickupWeaponSupplyCapabilityId);
    const fixedPromptBinding = report.capabilities.find((entry) => entry.capabilityId === fixedPromptBindingCapabilityId);
    const profileBinding = report.capabilities.find((entry) => entry.capabilityId === profileBindingCapabilityId);
    const providerDeepSeekAuthoritativeDraft = report.capabilities.find(
      (entry) => entry.capabilityId === providerDeepSeekAuthoritativeDraftCapabilityId
    );
    const reviewOracleFinalGate = report.capabilities.find((entry) => entry.capabilityId === reviewOracleFinalGateCapabilityId);
    const runtimeManifestBinding = report.capabilities.find((entry) => entry.capabilityId === runtimeManifestBindingCapabilityId);
    const runtimeModuleLoadReceipt = report.capabilities.find((entry) => entry.capabilityId === runtimeModuleLoadReceiptCapabilityId);
    const runtimePlanCoverage = report.capabilities.find((entry) => entry.capabilityId === runtimePlanCoverageCapabilityId);
    const sceneOrderedSegments = report.capabilities.find((entry) => entry.capabilityId === sceneOrderedSegmentsCapabilityId);
    const sceneVisualPresentationMetadata = report.capabilities.find(
      (entry) => entry.capabilityId === sceneVisualPresentationMetadataCapabilityId
    );
    const rulesEncounterGate = report.capabilities.find((entry) => entry.capabilityId === rulesEncounterGateCapabilityId);
    const deathReset = report.capabilities.find((entry) => entry.capabilityId === deathResetCapabilityId);
    const rapidFire = report.capabilities.find((entry) => entry.capabilityId === rapidFireCapabilityId);
    const spreadShot = report.capabilities.find((entry) => entry.capabilityId === spreadShotCapabilityId);
    const replacementRule = report.capabilities.find((entry) => entry.capabilityId === replacementRuleCapabilityId);
    const artifactLineageNoManualPatch = report.capabilities.find((entry) => entry.capabilityId === artifactLineageNoManualPatchCapabilityId);

    expect(GenerationTargetProfileRuntimeSupportReportSchema.parse(report)).toEqual(report);
    expect(report).toMatchObject({
      artifactKind: 'generation_target_profile_runtime_support_report',
      schemaVersion: 'generation_target_profile_runtime_support_report.v0.1',
      status: 'blocked_incomplete_target_profile',
      requiredCapabilityCount: 59,
      staticCompleteSupportedCount: 0,
      observedCompleteSupportedCount: 42,
      targetProfileCompleteSupported: false,
      capabilityQaReportHash: capabilityQaReport.reportHash,
      observedCapabilityIds: [
        artifactLineageNoManualPatchCapabilityId,
        cameraCapabilityId,
        collisionCapabilityId,
        airborneFireCapabilityId,
        projectileCapabilityId,
        enemyBossAttackPatternCapabilityId,
        enemyBossLifecycleCapabilityId,
        enemyBossPhaseTransitionCapabilityId,
        enemyFixedTurretCapabilityId,
        enemyFlyingRightEntryCapabilityId,
        enemyPatrolInfantryCapabilityId,
        feedbackVictoryDeclarationCapabilityId,
        generationFallbackPolicyFailClosedCapabilityId,
        goalBossUnlockCapabilityId,
        hazardFallingAreaCapabilityId,
        hazardTimedExplosionCapabilityId,
        damageInvulnerabilityCapabilityId,
        healthCapabilityId,
        fixedPromptBindingCapabilityId,
        crouchCapabilityId,
        movementCapabilityId,
        pickupCapabilityId,
        pickupWeaponSupplyCapabilityId,
        profileBindingCapabilityId,
        providerDeepSeekAuthoritativeDraftCapabilityId,
        reviewOracleFinalGateCapabilityId,
        rulesCheckpointRestoreCapabilityId,
        rulesEncounterGateCapabilityId,
        rulesRetryCountCapabilityId,
        rulesStateTransitionGraphCapabilityId,
        runtimeManifestBindingCapabilityId,
        runtimeModuleLoadReceiptCapabilityId,
        runtimePlanCoverageCapabilityId,
        sceneOrderedSegmentsCapabilityId,
        sceneVisualPresentationMetadataCapabilityId,
        spawnEnemyWaveCapabilityId,
        spawnStaticCapabilityId,
        deathResetCapabilityId,
        defaultWeaponCapabilityId,
        rapidFireCapabilityId,
        replacementRuleCapabilityId,
        spreadShotCapabilityId
      ],
      blockers: ['target_profile_runtime_support_incomplete:42/59']
    });
    expect(artifactLineageNoManualPatch).toMatchObject({
      capabilityId: artifactLineageNoManualPatchCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(rulesEncounterGate).toMatchObject({
      capabilityId: rulesEncounterGateCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(runtimeManifestBinding).toMatchObject({
      capabilityId: runtimeManifestBindingCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(runtimeModuleLoadReceipt).toMatchObject({
      capabilityId: runtimeModuleLoadReceiptCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(runtimePlanCoverage).toMatchObject({
      capabilityId: runtimePlanCoverageCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(sceneOrderedSegments).toMatchObject({
      capabilityId: sceneOrderedSegmentsCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(sceneVisualPresentationMetadata).toMatchObject({
      capabilityId: sceneVisualPresentationMetadataCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(rulesRetryCount).toMatchObject({
      capabilityId: rulesRetryCountCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [RULES_RETRY_COUNT_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [RULES_RETRY_COUNT_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(rulesStateTransitionGraph).toMatchObject({
      capabilityId: rulesStateTransitionGraphCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(camera).toMatchObject({
      capabilityId: cameraCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(collision).toMatchObject({
      capabilityId: collisionCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [COLLISION_PLATFORM_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [COLLISION_PLATFORM_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(enemyBossAttackPattern).toMatchObject({
      capabilityId: enemyBossAttackPatternCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [ENEMY_BOSS_ATTACK_PATTERN_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [ENEMY_BOSS_ATTACK_PATTERN_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(enemyBossLifecycle).toMatchObject({
      capabilityId: enemyBossLifecycleCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [ENEMY_BOSS_LIFECYCLE_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [ENEMY_BOSS_LIFECYCLE_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(enemyBossPhaseTransition).toMatchObject({
      capabilityId: enemyBossPhaseTransitionCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [ENEMY_BOSS_PHASE_TRANSITION_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [ENEMY_BOSS_PHASE_TRANSITION_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(defaultWeapon).toMatchObject({
      capabilityId: defaultWeaponCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(projectile).toMatchObject({
      capabilityId: projectileCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [COMBAT_PROJECTILE_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [COMBAT_PROJECTILE_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(report.capabilities.find((entry) => entry.capabilityId === airborneFireCapabilityId)).toMatchObject({
      capabilityId: airborneFireCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [COMBAT_AIRBORNE_FIRE_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [COMBAT_AIRBORNE_FIRE_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(movement).toMatchObject({
      capabilityId: movementCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(report.capabilities.find((entry) => entry.capabilityId === crouchCapabilityId)).toMatchObject({
      capabilityId: crouchCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [MOVEMENT_CROUCH_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [MOVEMENT_CROUCH_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(spawnStatic).toMatchObject({
      capabilityId: spawnStaticCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [SPAWN_STATIC_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [SPAWN_STATIC_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(report.capabilities.find((entry) => entry.capabilityId === spawnEnemyWaveCapabilityId)).toMatchObject({
      capabilityId: spawnEnemyWaveCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(enemyFixedTurret).toMatchObject({
      capabilityId: enemyFixedTurretCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [ENEMY_FIXED_TURRET_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [ENEMY_FIXED_TURRET_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(enemyFlyingRightEntry).toMatchObject({
      capabilityId: enemyFlyingRightEntryCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(enemyPatrolInfantry).toMatchObject({
      capabilityId: enemyPatrolInfantryCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(feedbackVictoryDeclaration).toMatchObject({
      capabilityId: feedbackVictoryDeclarationCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(generationFallbackPolicyFailClosed).toMatchObject({
      capabilityId: generationFallbackPolicyFailClosedCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(goalBossUnlock).toMatchObject({
      capabilityId: goalBossUnlockCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(hazardFallingArea).toMatchObject({
      capabilityId: hazardFallingAreaCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [HAZARD_FALLING_AREA_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [HAZARD_FALLING_AREA_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(hazardTimedExplosion).toMatchObject({
      capabilityId: hazardTimedExplosionCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(rulesCheckpointRestore).toMatchObject({
      capabilityId: rulesCheckpointRestoreCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(damageInvulnerability).toMatchObject({
      capabilityId: damageInvulnerabilityCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [HEALTH_DAMAGE_INVULNERABILITY_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [HEALTH_DAMAGE_INVULNERABILITY_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(health).toMatchObject({
      capabilityId: healthCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(pickup).toMatchObject({
      capabilityId: pickupCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(pickupWeaponSupply).toMatchObject({
      capabilityId: pickupWeaponSupplyCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(fixedPromptBinding).toMatchObject({
      capabilityId: fixedPromptBindingCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(profileBinding).toMatchObject({
      capabilityId: profileBindingCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(providerDeepSeekAuthoritativeDraft).toMatchObject({
      capabilityId: providerDeepSeekAuthoritativeDraftCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(reviewOracleFinalGate).toMatchObject({
      capabilityId: reviewOracleFinalGateCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(deathReset).toMatchObject({
      capabilityId: deathResetCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [WEAPON_DEATH_RESET_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [WEAPON_DEATH_RESET_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(rapidFire).toMatchObject({
      capabilityId: rapidFireCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(spreadShot).toMatchObject({
      capabilityId: spreadShotCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
    expect(replacementRule).toMatchObject({
      capabilityId: replacementRuleCapabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
  });

  it('keeps artifact lineage unverified when lineage evidence lacks no-manual-patch state proof', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport(
      [
        ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
        'camera.side_follow.active',
        'collision.platform.grounded',
        ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
        ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
        ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
      ENEMY_FIXED_TURRET_EVENT_TYPE,
      ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
      ENEMY_PATROL_INFANTRY_EVENT_TYPE,
      FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
      GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
      GOAL_BOSS_UNLOCK_EVENT_TYPE,
      HAZARD_FALLING_AREA_EVENT_TYPE,
      HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
      RULES_CHECKPOINT_RESTORE_EVENT_TYPE,
      'combat.airborne_fire.fired',
      'player.fired',
      'projectile.spawned',
      'movement.crouch.entered',
      'player.jumped',
      'pickup.collectible.collected',
      'pickup.collectible.state_changed',
      PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
      'spawn.enemy_wave.ordered',
        'spawn.static.triggered',
        'health.damage_invulnerability.activated',
        'health.damage_invulnerability.blocked',
        'health.player_health.current',
        FIXED_PROMPT_BINDING_EVENT_TYPE,
        PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
        REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
        WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
        WEAPON_DEATH_RESET_EVENT_TYPE,
        WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
        WEAPON_SPREAD_SHOT_EVENT_TYPE,
        WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
        WEAPON_REPLACEMENT_RULE_EVENT_TYPE
      ],
      { artifactLineageNoManualPatchStateFields: false }
    );
    const report = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260625_target_runtime_support',
      runId: 'run_20260625_artifact_lineage_missing_state',
      capabilityQaReport
    });
    const artifactLineageNoManualPatch = report.capabilities.find((entry) => entry.capabilityId === artifactLineageNoManualPatchCapabilityId);

    expect(capabilityQaReport.requiredResults.find((entry) => entry.probeId === ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID}.assertion.no_manual_patch`,
          status: 'failed',
          message: expect.stringContaining('expected pipelineProduced=true, observed <missing>')
        })
      ])
    });
    expect(report).toMatchObject({
      status: 'blocked_incomplete_target_profile',
      observedCompleteSupportedCount: 41,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:41/59'
      ]
    });
    expect(artifactLineageNoManualPatch).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
  });

  it('observes artifact no-hidden-script only when module load evidence includes manifest state proof', () => {
    const missingStateQaReport = buildSingleCapabilityQaReport({
      capabilityId: artifactNoHiddenScriptCapabilityId,
      packageContract: createArtifactNoHiddenScriptPackageContract(),
      eventType: ARTIFACT_NO_HIDDEN_SCRIPT_EVENT_TYPE,
      probeId: ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID,
      action: 'verify_no_hidden_script',
      sourceRef: 'runtime.manifest.module_load_receipt',
      stateFields: undefined
    });
    const observedStateQaReport = buildSingleCapabilityQaReport({
      capabilityId: artifactNoHiddenScriptCapabilityId,
      packageContract: createArtifactNoHiddenScriptPackageContract(),
      eventType: ARTIFACT_NO_HIDDEN_SCRIPT_EVENT_TYPE,
      probeId: ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID,
      action: 'verify_no_hidden_script',
      sourceRef: 'runtime.manifest.module_load_receipt',
      stateFields: {
        declaredModulesOnly: true,
        hiddenScriptDetected: false,
        moduleLoadManifestVerified: true
      }
    });
    const missingStateReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_no_hidden_script_missing_state',
      capabilityQaReport: missingStateQaReport
    });
    const observedStateReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_no_hidden_script_observed_state',
      capabilityQaReport: observedStateQaReport
    });
    const missingState = missingStateReport.capabilities.find((entry) => entry.capabilityId === artifactNoHiddenScriptCapabilityId);
    const observedState = observedStateReport.capabilities.find((entry) => entry.capabilityId === artifactNoHiddenScriptCapabilityId);

    expect(missingStateQaReport.requiredResults.find((entry) => entry.probeId === ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID}.assertion.no_hidden_script`,
          status: 'failed',
          message: expect.stringContaining('expected declaredModulesOnly=true, observed <missing>')
        })
      ])
    });
    expect(missingStateReport).toMatchObject({
      observedCompleteSupportedCount: 0,
      blockers: [
        `capability_qa_report_missing_required_probe:${ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:0/59'
      ]
    });
    expect(missingState).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
    expect(observedStateReport).toMatchObject({
      observedCompleteSupportedCount: 1,
      observedCapabilityIds: [artifactNoHiddenScriptCapabilityId],
      blockers: ['target_profile_runtime_support_incomplete:1/59']
    });
    expect(observedState).toMatchObject({
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
  });

  it('observes camera bounds clamp only when camera evidence includes boundary state proof', () => {
    const missingStateQaReport = buildSingleCapabilityQaReport({
      capabilityId: cameraBoundsClampCapabilityId,
      packageContract: createCameraBoundsClampPackageContract(),
      eventType: CAMERA_BOUNDS_CLAMP_EVENT_TYPE,
      probeId: CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID,
      action: 'verify_camera_bounds',
      sourceRef: 'runtime.camera.bounds',
      stateFields: undefined
    });
    const observedStateQaReport = buildSingleCapabilityQaReport({
      capabilityId: cameraBoundsClampCapabilityId,
      packageContract: createCameraBoundsClampPackageContract(),
      eventType: CAMERA_BOUNDS_CLAMP_EVENT_TYPE,
      probeId: CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID,
      action: 'verify_camera_bounds',
      sourceRef: 'runtime.camera.bounds',
      stateFields: {
        cameraWithinWorldBounds: true,
        leftBoundaryClamped: true,
        rightBoundaryClamped: true
      }
    });
    const missingStateReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_camera_bounds_missing_state',
      capabilityQaReport: missingStateQaReport
    });
    const observedStateReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_camera_bounds_observed_state',
      capabilityQaReport: observedStateQaReport
    });
    const missingState = missingStateReport.capabilities.find((entry) => entry.capabilityId === cameraBoundsClampCapabilityId);
    const observedState = observedStateReport.capabilities.find((entry) => entry.capabilityId === cameraBoundsClampCapabilityId);

    expect(missingStateQaReport.requiredResults.find((entry) => entry.probeId === CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID}.assertion.bounds_clamped`,
          status: 'failed',
          message: expect.stringContaining('expected cameraWithinWorldBounds=true, observed <missing>')
        })
      ])
    });
    expect(missingStateReport).toMatchObject({
      observedCompleteSupportedCount: 0,
      blockers: [
        `capability_qa_report_missing_required_probe:${CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:0/59'
      ]
    });
    expect(missingState).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
    expect(observedStateReport).toMatchObject({
      observedCompleteSupportedCount: 1,
      observedCapabilityIds: [cameraBoundsClampCapabilityId],
      blockers: ['target_profile_runtime_support_incomplete:1/59']
    });
    expect(observedState).toMatchObject({
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
  });

  it('observes canonical semantic preservation only when evidence includes semantic preservation state proof', () => {
    const missingStateQaReport = buildSingleCapabilityQaReport({
      capabilityId: canonicalSemanticPreservationCapabilityId,
      packageContract: createCanonicalSemanticPreservationPackageContract(),
      eventType: CANONICAL_SEMANTIC_PRESERVATION_EVENT_TYPE,
      probeId: CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID,
      action: 'verify_semantic_preservation',
      sourceRef: 'canonical.semantic.hash',
      stateFields: undefined
    });
    const observedStateQaReport = buildSingleCapabilityQaReport({
      capabilityId: canonicalSemanticPreservationCapabilityId,
      packageContract: createCanonicalSemanticPreservationPackageContract(),
      eventType: CANONICAL_SEMANTIC_PRESERVATION_EVENT_TYPE,
      probeId: CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID,
      action: 'verify_semantic_preservation',
      sourceRef: 'canonical.semantic.hash',
      stateFields: {
        canonicalHashMatched: true,
        semanticIntentPreserved: true,
        droppedCanonicalNodes: false
      }
    });
    const missingStateReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_canonical_semantic_missing_state',
      capabilityQaReport: missingStateQaReport
    });
    const observedStateReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_canonical_semantic_observed_state',
      capabilityQaReport: observedStateQaReport
    });
    const missingState = missingStateReport.capabilities.find((entry) => entry.capabilityId === canonicalSemanticPreservationCapabilityId);
    const observedState = observedStateReport.capabilities.find((entry) => entry.capabilityId === canonicalSemanticPreservationCapabilityId);

    expect(missingStateQaReport.requiredResults.find((entry) => entry.probeId === CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID}.assertion.semantic_preserved`,
          status: 'failed',
          message: expect.stringContaining('expected canonicalHashMatched=true, observed <missing>')
        })
      ])
    });
    expect(missingStateReport).toMatchObject({
      observedCompleteSupportedCount: 0,
      blockers: [
        `capability_qa_report_missing_required_probe:${CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:0/59'
      ]
    });
    expect(missingState).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
    expect(observedStateReport).toMatchObject({
      observedCompleteSupportedCount: 1,
      observedCapabilityIds: [canonicalSemanticPreservationCapabilityId],
      blockers: ['target_profile_runtime_support_incomplete:1/59']
    });
    expect(observedState).toMatchObject({
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
  });

  it('observes collision damage affinity only when evidence includes matrix state proof', () => {
    const missingStateQaReport = buildSingleCapabilityQaReport({
      capabilityId: collisionDamageAffinityMatrixCapabilityId,
      packageContract: createCollisionDamageAffinityMatrixPackageContract(),
      eventType: COLLISION_DAMAGE_AFFINITY_MATRIX_EVENT_TYPE,
      probeId: COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID,
      action: 'verify_damage_affinity_matrix',
      sourceRef: 'runtime.damage_affinity.matrix',
      stateFields: undefined
    });
    const observedStateQaReport = buildSingleCapabilityQaReport({
      capabilityId: collisionDamageAffinityMatrixCapabilityId,
      packageContract: createCollisionDamageAffinityMatrixPackageContract(),
      eventType: COLLISION_DAMAGE_AFFINITY_MATRIX_EVENT_TYPE,
      probeId: COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID,
      action: 'verify_damage_affinity_matrix',
      sourceRef: 'runtime.damage_affinity.matrix',
      stateFields: {
        playerProjectilesDamageEnemies: true,
        playerProjectilesDamagePlayer: false,
        enemyProjectilesDamagePlayer: true,
        enemyProjectilesDamageEnemies: false,
        hazardsDamagePlayer: true,
        hazardsDamageEnemies: false
      }
    });
    const missingStateReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_damage_affinity_missing_state',
      capabilityQaReport: missingStateQaReport
    });
    const observedStateReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_damage_affinity_observed_state',
      capabilityQaReport: observedStateQaReport
    });
    const missingState = missingStateReport.capabilities.find((entry) => entry.capabilityId === collisionDamageAffinityMatrixCapabilityId);
    const observedState = observedStateReport.capabilities.find((entry) => entry.capabilityId === collisionDamageAffinityMatrixCapabilityId);

    expect(missingStateQaReport.requiredResults.find((entry) => entry.probeId === COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID}.assertion.affinity_matrix_enforced`,
          status: 'failed',
          message: expect.stringContaining('expected playerProjectilesDamageEnemies=true, observed <missing>')
        })
      ])
    });
    expect(missingStateReport).toMatchObject({
      observedCompleteSupportedCount: 0,
      blockers: [
        `capability_qa_report_missing_required_probe:${COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:0/59'
      ]
    });
    expect(missingState).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
    expect(observedStateReport).toMatchObject({
      observedCompleteSupportedCount: 1,
      observedCapabilityIds: [collisionDamageAffinityMatrixCapabilityId],
      blockers: ['target_profile_runtime_support_incomplete:1/59']
    });
    expect(observedState).toMatchObject({
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
  });

  it('keeps fixed prompt binding unverified when the fixed prompt event is absent', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport([
      ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
      'camera.side_follow.active',
      'collision.platform.grounded',
      ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
      ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
      ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
      ENEMY_FIXED_TURRET_EVENT_TYPE,
      ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
      ENEMY_PATROL_INFANTRY_EVENT_TYPE,
      FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
      GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
      GOAL_BOSS_UNLOCK_EVENT_TYPE,
      HAZARD_FALLING_AREA_EVENT_TYPE,
      HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
      RULES_CHECKPOINT_RESTORE_EVENT_TYPE,
      'combat.airborne_fire.fired',
      'player.fired',
      'projectile.spawned',
      'movement.crouch.entered',
      'player.jumped',
      'pickup.collectible.collected',
      'pickup.collectible.state_changed',
      PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
      'spawn.enemy_wave.ordered',
      'spawn.static.triggered',
      'health.damage_invulnerability.activated',
      'health.damage_invulnerability.blocked',
      'health.player_health.current',
      PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
      REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
      WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
      WEAPON_DEATH_RESET_EVENT_TYPE,
      WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
      WEAPON_SPREAD_SHOT_EVENT_TYPE,
      WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
      WEAPON_REPLACEMENT_RULE_EVENT_TYPE
    ]);
    const report = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260625_target_runtime_support',
      runId: 'run_20260625_fixed_prompt_missing',
      capabilityQaReport
    });
    const fixedPromptBinding = report.capabilities.find((entry) => entry.capabilityId === fixedPromptBindingCapabilityId);

    expect(report).toMatchObject({
      status: 'blocked_incomplete_target_profile',
      observedCompleteSupportedCount: 41,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:41/59'
      ]
    });
    expect(fixedPromptBinding).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
  });

  it('keeps profile binding unverified when the DeepSeek validation profile event is absent', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport([
      ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
      'camera.side_follow.active',
      'collision.platform.grounded',
      ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
      ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
      ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
      ENEMY_FIXED_TURRET_EVENT_TYPE,
      ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
      ENEMY_PATROL_INFANTRY_EVENT_TYPE,
      FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
      GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
      GOAL_BOSS_UNLOCK_EVENT_TYPE,
      HAZARD_FALLING_AREA_EVENT_TYPE,
      HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
      RULES_CHECKPOINT_RESTORE_EVENT_TYPE,
      'combat.airborne_fire.fired',
      'player.fired',
      'projectile.spawned',
      'movement.crouch.entered',
      'player.jumped',
      'pickup.collectible.collected',
      'pickup.collectible.state_changed',
      PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
      'spawn.enemy_wave.ordered',
      'spawn.static.triggered',
      'health.damage_invulnerability.activated',
      'health.damage_invulnerability.blocked',
      'health.player_health.current',
      FIXED_PROMPT_BINDING_EVENT_TYPE,
      REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
      WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
      WEAPON_DEATH_RESET_EVENT_TYPE,
      WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
      WEAPON_SPREAD_SHOT_EVENT_TYPE,
      WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
      WEAPON_REPLACEMENT_RULE_EVENT_TYPE
    ]);
    const report = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260625_target_runtime_support',
      runId: 'run_20260625_profile_binding_missing',
      capabilityQaReport
    });
    const profileBinding = report.capabilities.find((entry) => entry.capabilityId === profileBindingCapabilityId);

    expect(report).toMatchObject({
      status: 'blocked_incomplete_target_profile',
      observedCompleteSupportedCount: 41,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:41/59'
      ]
    });
    expect(profileBinding).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
  });

  it('keeps DeepSeek provider draft unverified when generic model output lacks authoritative draft state proof', () => {
    const dependencyObserved: CapabilityRuntimeObservedProbeEvidence[] = [
      {
        capabilityId: fixedPromptBindingCapabilityId,
        probeId: FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID,
        action: 'observe',
        eventType: FIXED_PROMPT_BINDING_EVENT_TYPE,
        eventTypes: [FIXED_PROMPT_BINDING_EVENT_TYPE],
        status: 'observed',
        sourceRef: 'target_profile.fixedPrompt.sha256'
      },
      {
        capabilityId: profileBindingCapabilityId,
        probeId: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID,
        action: 'observe',
        eventType: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
        eventTypes: [PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE],
        status: 'observed',
        sourceRef: 'canonical_dsl.profile.id'
      }
    ];
    const genericProviderQaReport = buildSingleCapabilityQaReport({
      capabilityId: providerDeepSeekAuthoritativeDraftCapabilityId,
      dependencyPackages: [createFixedPromptBindingPackageContract(), createProfileDeepSeekRunAndGunValidationPackageContract()],
      additionalObserved: dependencyObserved,
      packageContract: createProviderDeepSeekAuthoritativeDraftPackageContract(),
      eventType: 'provider.model_output.generated',
      probeId: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID,
      action: 'verify_authoritative_draft',
      sourceRef: 'provider.deepseek.generic_model_output',
      stateFields: {
        deepSeekAuthoritativeDraftProduced: true
      }
    });
    const observedProviderQaReport = buildSingleCapabilityQaReport({
      capabilityId: providerDeepSeekAuthoritativeDraftCapabilityId,
      dependencyPackages: [createFixedPromptBindingPackageContract(), createProfileDeepSeekRunAndGunValidationPackageContract()],
      additionalObserved: dependencyObserved,
      packageContract: createProviderDeepSeekAuthoritativeDraftPackageContract(),
      eventType: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_EVENT_TYPE,
      probeId: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID,
      action: 'verify_authoritative_draft',
      sourceRef: 'normalization_report.capability_game_dsl_draft',
      stateFields: {
        deepSeekAuthoritativeDraftProduced: true,
        deepSeekProviderId: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PROVIDER_ID,
        deepSeekDraftArtifactKind: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_ARTIFACT_KIND,
        deepSeekDraftSchemaVersion: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_SCHEMA_VERSION,
        deepSeekDraftNormalized: true,
        deepSeekCanonicalSchemaVersion: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_CANONICAL_SCHEMA_VERSION,
        deepSeekComposedSchemaHashMatched: true,
        deepSeekCapabilityLockHashMatched: true,
        deepSeekTrustedEvidenceRejected: true
      }
    });
    const genericProviderReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_provider_deepseek_generic_model_output',
      capabilityQaReport: genericProviderQaReport
    });
    const observedProviderReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_provider_deepseek_authoritative_draft',
      capabilityQaReport: observedProviderQaReport
    });
    const genericProviderState = genericProviderReport.capabilities.find(
      (entry) => entry.capabilityId === providerDeepSeekAuthoritativeDraftCapabilityId
    );
    const observedProviderState = observedProviderReport.capabilities.find(
      (entry) => entry.capabilityId === providerDeepSeekAuthoritativeDraftCapabilityId
    );

    expect(genericProviderQaReport.requiredResults.find((entry) => entry.probeId === PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID))
      .toMatchObject({
        status: 'failed',
        assertionResults: expect.arrayContaining([
          expect.objectContaining({
            assertionId: `${PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID}.assertion.authoritative_draft_verified`,
            status: 'failed',
            message: expect.stringContaining(`observation ${PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_EVENT_TYPE} not observed`)
          }),
          expect.objectContaining({
            assertionId: `${PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID}.assertion.authoritative_draft_verified`,
            status: 'failed',
            message: expect.stringContaining(`expected deepSeekProviderId=${PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PROVIDER_ID}, observed <missing>`)
          })
        ])
      });
    expect(genericProviderReport).toMatchObject({
      observedCompleteSupportedCount: 2,
      blockers: [
        `capability_qa_report_missing_required_probe:${PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:2/59'
      ]
    });
    expect(genericProviderState).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
    expect(observedProviderReport).toMatchObject({
      observedCompleteSupportedCount: 3,
      observedCapabilityIds: [fixedPromptBindingCapabilityId, profileBindingCapabilityId, providerDeepSeekAuthoritativeDraftCapabilityId],
      blockers: ['target_profile_runtime_support_incomplete:3/59']
    });
    expect(observedProviderState).toMatchObject({
      runtimeVerified: true,
      observedCompleteSupported: true,
      verifiedRequiredProbeIds: [PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      observedEvidenceDimensions: { qa_observed: true }
    });
  });

  it('keeps final Oracle gate unverified until approval is bound to reviewed candidate and Skill revisions', () => {
    const receiptOnlyQaReport = buildSingleCapabilityQaReport({
      capabilityId: reviewOracleFinalGateCapabilityId,
      packageContract: createReviewOracleFinalGatePackageContract(),
      eventType: 'oracle.receipt.recorded',
      probeId: REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID,
      action: 'receipt_recorded',
      sourceRef: 'oracle.receipt.only',
      stateFields: {
        finalOracleP0Count: 0
      }
    });
    const observedFinalGateQaReport = buildSingleCapabilityQaReport({
      capabilityId: reviewOracleFinalGateCapabilityId,
      packageContract: createReviewOracleFinalGatePackageContract(),
      eventType: REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
      probeId: REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID,
      action: 'verify_final_gate',
      sourceRef: 'oracle.final_gate.approval',
      stateFields: finalOracleGateStateFields()
    });
    const receiptOnlyReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_oracle_receipt_only',
      capabilityQaReport: receiptOnlyQaReport
    });
    const observedFinalGateReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_final_oracle_gate',
      capabilityQaReport: observedFinalGateQaReport
    });
    const receiptOnlyState = receiptOnlyReport.capabilities.find((entry) => entry.capabilityId === reviewOracleFinalGateCapabilityId);
    const observedFinalGateState = observedFinalGateReport.capabilities.find((entry) => entry.capabilityId === reviewOracleFinalGateCapabilityId);

    expect(receiptOnlyQaReport.requiredResults.find((entry) => entry.probeId === REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID}.assertion.final_gate_bound_to_candidate_and_skill`,
          status: 'failed',
          message: expect.stringContaining(`observation ${REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE} not observed`)
        }),
        expect.objectContaining({
          assertionId: `${REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID}.assertion.final_gate_bound_to_candidate_and_skill`,
          status: 'failed',
          message: expect.stringContaining('expected finalOracleGateApproved=true, observed <missing>')
        })
      ])
    });
    expect(receiptOnlyReport).toMatchObject({
      observedCompleteSupportedCount: 0,
      blockers: [
        `capability_qa_report_missing_required_probe:${REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:0/59'
      ]
    });
    expect(receiptOnlyState).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
    expect(observedFinalGateReport).toMatchObject({
      observedCompleteSupportedCount: 1,
      observedCapabilityIds: [reviewOracleFinalGateCapabilityId],
      blockers: ['target_profile_runtime_support_incomplete:1/59']
    });
    expect(observedFinalGateState).toMatchObject({
      runtimeVerified: true,
      observedCompleteSupported: true,
      verifiedRequiredProbeIds: [REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      observedEvidenceDimensions: { qa_observed: true }
    });
  });

  it('keeps runtime support blocked when the required package QA assertion is missing', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport(['player.fired'], {
      includeDefaultSceneOrderedSegments: false,
      includeDefaultSceneVisualPresentationMetadata: false
    });
    const report = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260625_target_runtime_support',
      runId: 'run_20260625_target_runtime_support_missing',
      capabilityQaReport
    });
    const capability = report.capabilities.find((entry) => entry.capabilityId === defaultWeaponCapabilityId);

    expect(report).toMatchObject({
      status: 'blocked_incomplete_target_profile',
      staticCompleteSupportedCount: 0,
      observedCompleteSupportedCount: 0,
      targetProfileCompleteSupported: false,
      observedCapabilityIds: [],
      blockers: [...expectedMissingRequiredProbeBlockers(), 'target_profile_runtime_support_incomplete:0/59']
    });
    expect(capability).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: false }
    });
  });

  it('does not verify damage invulnerability when blocked evidence lacks window activation', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport([
      ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
      'camera.side_follow.active',
      'collision.platform.grounded',
      ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
      ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
      ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
      ENEMY_FIXED_TURRET_EVENT_TYPE,
      ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
      ENEMY_PATROL_INFANTRY_EVENT_TYPE,
      FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
      GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
      GOAL_BOSS_UNLOCK_EVENT_TYPE,
      HAZARD_FALLING_AREA_EVENT_TYPE,
      HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
      RULES_CHECKPOINT_RESTORE_EVENT_TYPE,
      'combat.airborne_fire.fired',
      'player.fired',
      'projectile.spawned',
      'movement.crouch.entered',
      'player.jumped',
      'pickup.collectible.collected',
      'pickup.collectible.state_changed',
      PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
      'spawn.enemy_wave.ordered',
      'spawn.static.triggered',
      'health.damage_invulnerability.blocked',
      'health.player_health.current',
      FIXED_PROMPT_BINDING_EVENT_TYPE,
      PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
      REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
      WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
      WEAPON_DEATH_RESET_EVENT_TYPE,
      WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
      WEAPON_SPREAD_SHOT_EVENT_TYPE,
      WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
      WEAPON_REPLACEMENT_RULE_EVENT_TYPE
    ]);
    const report = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260625_target_runtime_support',
      runId: 'run_20260625_damage_invulnerability_missing_activation',
      capabilityQaReport
    });
    const damageInvulnerability = report.capabilities.find((entry) => entry.capabilityId === damageInvulnerabilityCapabilityId);

    expect(capabilityQaReport.requiredResults.find((entry) => entry.probeId === HEALTH_DAMAGE_INVULNERABILITY_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: 'health.damage_invulnerability.v1.window.browser_qa.v1.assertion.window_activated',
          status: 'failed'
        }),
        expect.objectContaining({
          assertionId: 'health.damage_invulnerability.v1.window.browser_qa.v1.assertion.damage_blocked',
          status: 'passed'
        })
      ])
    });
    expect(report).toMatchObject({
      status: 'blocked_incomplete_target_profile',
      observedCompleteSupportedCount: 41,
      targetProfileCompleteSupported: false,
      observedCapabilityIds: [
        artifactLineageNoManualPatchCapabilityId,
        cameraCapabilityId,
        collisionCapabilityId,
        airborneFireCapabilityId,
        projectileCapabilityId,
        enemyBossAttackPatternCapabilityId,
        enemyBossLifecycleCapabilityId,
        enemyBossPhaseTransitionCapabilityId,
        enemyFixedTurretCapabilityId,
        enemyFlyingRightEntryCapabilityId,
        enemyPatrolInfantryCapabilityId,
        feedbackVictoryDeclarationCapabilityId,
        generationFallbackPolicyFailClosedCapabilityId,
        goalBossUnlockCapabilityId,
        hazardFallingAreaCapabilityId,
        hazardTimedExplosionCapabilityId,
        healthCapabilityId,
        fixedPromptBindingCapabilityId,
        crouchCapabilityId,
        movementCapabilityId,
        pickupCapabilityId,
        pickupWeaponSupplyCapabilityId,
        profileBindingCapabilityId,
        providerDeepSeekAuthoritativeDraftCapabilityId,
        reviewOracleFinalGateCapabilityId,
        rulesCheckpointRestoreCapabilityId,
        rulesEncounterGateCapabilityId,
        rulesRetryCountCapabilityId,
        rulesStateTransitionGraphCapabilityId,
        runtimeManifestBindingCapabilityId,
        runtimeModuleLoadReceiptCapabilityId,
        runtimePlanCoverageCapabilityId,
        sceneOrderedSegmentsCapabilityId,
        sceneVisualPresentationMetadataCapabilityId,
        spawnEnemyWaveCapabilityId,
        spawnStaticCapabilityId,
        deathResetCapabilityId,
        defaultWeaponCapabilityId,
        rapidFireCapabilityId,
        replacementRuleCapabilityId,
        spreadShotCapabilityId
      ],
      blockers: [
        `capability_qa_report_missing_required_probe:${HEALTH_DAMAGE_INVULNERABILITY_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:41/59'
      ]
    });
    expect(damageInvulnerability).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [HEALTH_DAMAGE_INVULNERABILITY_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
  });

  it('keeps pickup collectible unverified when collection events lack state evidence', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport(
      [
        ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
        'camera.side_follow.active',
        'collision.platform.grounded',
        ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
        ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
        ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
      ENEMY_FIXED_TURRET_EVENT_TYPE,
      ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
      ENEMY_PATROL_INFANTRY_EVENT_TYPE,
      FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
      GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
      GOAL_BOSS_UNLOCK_EVENT_TYPE,
      HAZARD_FALLING_AREA_EVENT_TYPE,
      HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
      RULES_CHECKPOINT_RESTORE_EVENT_TYPE,
      'combat.airborne_fire.fired',
        'player.fired',
        'projectile.spawned',
        'movement.crouch.entered',
        'player.jumped',
        'pickup.collectible.collected',
        'pickup.collectible.state_changed',
        PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
        'spawn.enemy_wave.ordered',
      'spawn.static.triggered',
      'health.damage_invulnerability.activated',
      'health.damage_invulnerability.blocked',
      'health.player_health.current',
      FIXED_PROMPT_BINDING_EVENT_TYPE,
      PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
      REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
      WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
      WEAPON_DEATH_RESET_EVENT_TYPE,
      WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
      WEAPON_SPREAD_SHOT_EVENT_TYPE,
      WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
      WEAPON_REPLACEMENT_RULE_EVENT_TYPE
    ],
      { pickupStateFields: false }
    );
    const report = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260625_target_runtime_support',
      runId: 'run_20260625_pickup_missing_state',
      capabilityQaReport
    });
    const pickup = report.capabilities.find((entry) => entry.capabilityId === pickupCapabilityId);

    expect(capabilityQaReport.requiredResults.find((entry) => entry.probeId === PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: 'pickup.collectible.v1.collection.browser_qa.v1.assertion.collected',
          status: 'failed'
        }),
        expect.objectContaining({
          assertionId: 'pickup.collectible.v1.collection.browser_qa.v1.assertion.state_changed',
          status: 'failed'
        })
      ])
    });
    expect(report).toMatchObject({
      status: 'blocked_incomplete_target_profile',
      observedCompleteSupportedCount: 41,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:41/59'
      ]
    });
    expect(pickup).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
  });

  it('keeps weapon supply unverified when generic pickup evidence lacks supply grant state proof', () => {
    const dependencyObserved: CapabilityRuntimeObservedProbeEvidence[] = [
      {
        capabilityId: collisionCapabilityId,
        probeId: COLLISION_PLATFORM_REQUIRED_PROBE_ID,
        action: 'collide',
        eventType: 'collision.platform.grounded',
        eventTypes: ['collision.platform.grounded'],
        status: 'observed'
      },
      {
        capabilityId: pickupCapabilityId,
        probeId: PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID,
        action: 'collect',
        eventType: 'pickup.collectible.collected',
        eventTypes: ['pickup.collectible.collected', 'pickup.collectible.state_changed'],
        pickupCollected: true,
        pickupConsumed: true,
        pickupStateChanged: true,
        status: 'observed'
      },
      {
        capabilityId: defaultWeaponCapabilityId,
        probeId: DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID,
        action: 'fire',
        eventType: 'player.fired',
        eventTypes: ['player.fired', 'projectile.spawned'],
        status: 'observed'
      }
    ];
    const genericPickupQaReport = buildSingleCapabilityQaReport({
      capabilityId: pickupWeaponSupplyCapabilityId,
      packageContract: createPickupWeaponSupplyPackageContract(),
      dependencyPackages: [
        createCollisionPlatformPackageContract(),
        createPickupCollectiblePackageContract(),
        createDefaultStraightSingleWeaponPackageContract()
      ],
      eventType: 'pickup.collectible.collected',
      probeId: PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID,
      action: 'collect',
      sourceRef: 'runtime.pickup.generic_collectible',
      additionalObserved: dependencyObserved,
      stateFields: {
        pickupCollected: true,
        pickupConsumed: true,
        pickupStateChanged: true,
        weaponReplaced: true
      }
    });
    const observedSupplyQaReport = buildSingleCapabilityQaReport({
      capabilityId: pickupWeaponSupplyCapabilityId,
      packageContract: createPickupWeaponSupplyPackageContract(),
      dependencyPackages: [
        createCollisionPlatformPackageContract(),
        createPickupCollectiblePackageContract(),
        createDefaultStraightSingleWeaponPackageContract()
      ],
      eventType: PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
      probeId: PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID,
      action: 'collect_weapon_supply',
      sourceRef: 'runtime.pickup.weapon_supply',
      additionalObserved: dependencyObserved,
      stateFields: {
        weaponSupplyAvailable: true,
        weaponSupplyNodeId: PICKUP_WEAPON_SUPPLY_NODE_ID,
        weaponSupplyPickupId: PICKUP_WEAPON_SUPPLY_PICKUP_ID,
        weaponSupplyWeaponId: PICKUP_WEAPON_SUPPLY_WEAPON_ID,
        weaponSupplyCollected: true,
        weaponSupplyConsumed: true,
        weaponSupplyGranted: true
      }
    });
    const genericReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260625_target_runtime_support',
      runId: 'run_20260626_weapon_supply_generic_pickup',
      capabilityQaReport: genericPickupQaReport
    });
    const observedReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260625_target_runtime_support',
      runId: 'run_20260626_weapon_supply_observed',
      capabilityQaReport: observedSupplyQaReport
    });
    const genericSupply = genericReport.capabilities.find((entry) => entry.capabilityId === pickupWeaponSupplyCapabilityId);
    const observedSupply = observedReport.capabilities.find((entry) => entry.capabilityId === pickupWeaponSupplyCapabilityId);

    expect(genericPickupQaReport.requiredResults.find((entry) => entry.probeId === PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID}.assertion.weapon_supply_verified`,
          status: 'failed',
          message: expect.stringContaining(`observation ${PICKUP_WEAPON_SUPPLY_EVENT_TYPE} not observed`)
        }),
        expect.objectContaining({
          assertionId: `${PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID}.assertion.weapon_supply_verified`,
          status: 'failed',
          message: expect.stringContaining('expected weaponSupplyGranted=true, observed <missing>')
        })
      ])
    });
    expect(genericReport).toMatchObject({
      status: 'blocked_incomplete_target_profile',
      observedCompleteSupportedCount: 3,
      targetProfileCompleteSupported: false,
      blockers: [`capability_qa_report_missing_required_probe:${PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID}`, 'target_profile_runtime_support_incomplete:3/59']
    });
    expect(genericSupply).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
    expect(observedReport).toMatchObject({
      observedCompleteSupportedCount: 4,
      blockers: ['target_profile_runtime_support_incomplete:4/59']
    });
    expect(observedSupply).toMatchObject({
      runtimeVerified: true,
      observedCompleteSupported: true,
      requiredProbeIds: [PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: []
    });
  });

  it('keeps spawn enemy wave unverified when ordered wave evidence lacks gate and order proof', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport(
      [
        ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
        'camera.side_follow.active',
        'collision.platform.grounded',
        ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
        ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
        ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
      ENEMY_FIXED_TURRET_EVENT_TYPE,
      ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
      ENEMY_PATROL_INFANTRY_EVENT_TYPE,
      FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
      GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
      GOAL_BOSS_UNLOCK_EVENT_TYPE,
      HAZARD_FALLING_AREA_EVENT_TYPE,
      HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
      RULES_CHECKPOINT_RESTORE_EVENT_TYPE,
      'combat.airborne_fire.fired',
        'player.fired',
        'projectile.spawned',
        'movement.crouch.entered',
        'player.jumped',
        'pickup.collectible.collected',
        'pickup.collectible.state_changed',
        PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
        'spawn.enemy_wave.ordered',
      'spawn.static.triggered',
      'health.damage_invulnerability.activated',
      'health.damage_invulnerability.blocked',
      'health.player_health.current',
      FIXED_PROMPT_BINDING_EVENT_TYPE,
      PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
      REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
      WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
      WEAPON_DEATH_RESET_EVENT_TYPE,
      WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
      WEAPON_SPREAD_SHOT_EVENT_TYPE,
      WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
      WEAPON_REPLACEMENT_RULE_EVENT_TYPE
    ],
      { spawnEnemyWaveOrderedFields: false }
    );
    const report = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260625_target_runtime_support',
      runId: 'run_20260625_spawn_enemy_wave_missing_order',
      capabilityQaReport
    });
    const spawnEnemyWave = report.capabilities.find((entry) => entry.capabilityId === spawnEnemyWaveCapabilityId);

    expect(capabilityQaReport.requiredResults.find((entry) => entry.probeId === SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: 'spawn.enemy_wave.v1.ordered.browser_qa.v1.assertion.ordered_wave',
          status: 'failed',
          message: expect.stringContaining('expected orderedWaveSequence=true, observed <missing>')
        })
      ])
    });
    expect(report).toMatchObject({
      status: 'blocked_incomplete_target_profile',
      observedCompleteSupportedCount: 41,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:41/59'
      ]
    });
    expect(spawnEnemyWave).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
  });

  it('keeps flying right entry unverified when wave evidence lacks right-entry state proof', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport(
      [
        ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
        'camera.side_follow.active',
        'collision.platform.grounded',
        ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
        ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
        ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
        ENEMY_FIXED_TURRET_EVENT_TYPE,
        ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
        ENEMY_PATROL_INFANTRY_EVENT_TYPE,
        FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
        GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
      GOAL_BOSS_UNLOCK_EVENT_TYPE,
      HAZARD_FALLING_AREA_EVENT_TYPE,
      HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
      RULES_CHECKPOINT_RESTORE_EVENT_TYPE,
      'combat.airborne_fire.fired',
        'player.fired',
        'projectile.spawned',
        'movement.crouch.entered',
        'player.jumped',
        'pickup.collectible.collected',
        'pickup.collectible.state_changed',
        PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
        'spawn.enemy_wave.ordered',
        'spawn.static.triggered',
        'health.damage_invulnerability.activated',
        'health.damage_invulnerability.blocked',
        'health.player_health.current',
        FIXED_PROMPT_BINDING_EVENT_TYPE,
        PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
        REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
        WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
        WEAPON_DEATH_RESET_EVENT_TYPE,
        WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
        WEAPON_SPREAD_SHOT_EVENT_TYPE,
        WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
        WEAPON_REPLACEMENT_RULE_EVENT_TYPE
      ],
      { enemyFlyingRightEntryStateFields: false }
    );
    const report = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260625_target_runtime_support',
      runId: 'run_20260625_enemy_flying_right_entry_missing_state',
      capabilityQaReport
    });
    const flyingRightEntry = report.capabilities.find((entry) => entry.capabilityId === enemyFlyingRightEntryCapabilityId);

    expect(capabilityQaReport.requiredResults.find((entry) => entry.probeId === ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID}.assertion.right_entry_verified`,
          status: 'failed',
          message: expect.stringContaining('expected flyingRightEntrySpawned=true, observed <missing>')
        }),
        expect.objectContaining({
          assertionId: `${ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID}.assertion.right_entry_verified`,
          status: 'failed',
          message: expect.stringContaining(`expected flyingRightEntryEntrySide=${ENEMY_FLYING_RIGHT_ENTRY_ENTRY_SIDE}, observed <missing>`)
        })
      ])
    });
    expect(report).toMatchObject({
      status: 'blocked_incomplete_target_profile',
      observedCompleteSupportedCount: 41,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:41/59'
      ]
    });
    expect(flyingRightEntry).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
  });

  it('keeps patrol infantry unverified when wave evidence lacks patrol state proof', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport(
      [
        ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
        'camera.side_follow.active',
        'collision.platform.grounded',
        ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
        ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
        ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
        ENEMY_FIXED_TURRET_EVENT_TYPE,
        ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
        ENEMY_PATROL_INFANTRY_EVENT_TYPE,
        FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
        GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
      GOAL_BOSS_UNLOCK_EVENT_TYPE,
      HAZARD_FALLING_AREA_EVENT_TYPE,
      HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
      RULES_CHECKPOINT_RESTORE_EVENT_TYPE,
      'combat.airborne_fire.fired',
        'player.fired',
        'projectile.spawned',
        'movement.crouch.entered',
        'player.jumped',
        'pickup.collectible.collected',
        'pickup.collectible.state_changed',
        PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
        'spawn.enemy_wave.ordered',
        'spawn.static.triggered',
        'health.damage_invulnerability.activated',
        'health.damage_invulnerability.blocked',
        'health.player_health.current',
        FIXED_PROMPT_BINDING_EVENT_TYPE,
        PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
        REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
        WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
        WEAPON_DEATH_RESET_EVENT_TYPE,
        WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
        WEAPON_SPREAD_SHOT_EVENT_TYPE,
        WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
        WEAPON_REPLACEMENT_RULE_EVENT_TYPE
      ],
      { enemyPatrolInfantryStateFields: false }
    );
    const report = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260625_target_runtime_support',
      runId: 'run_20260625_enemy_patrol_infantry_missing_state',
      capabilityQaReport
    });
    const patrolInfantry = report.capabilities.find((entry) => entry.capabilityId === enemyPatrolInfantryCapabilityId);

    expect(capabilityQaReport.requiredResults.find((entry) => entry.probeId === ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID}.assertion.patrol_infantry_verified`,
          status: 'failed',
          message: expect.stringContaining('expected patrolInfantrySpawned=true, observed <missing>')
        }),
        expect.objectContaining({
          assertionId: `${ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID}.assertion.patrol_infantry_verified`,
          status: 'failed',
          message: expect.stringContaining(`expected patrolInfantryMovementPatternId=${ENEMY_PATROL_INFANTRY_MOVEMENT_PATTERN_ID}, observed <missing>`)
        })
      ])
    });
    expect(report).toMatchObject({
      status: 'blocked_incomplete_target_profile',
      observedCompleteSupportedCount: 41,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:41/59'
      ]
    });
    expect(patrolInfantry).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
  });

  it('keeps victory declaration unverified when generic win evidence lacks declaration state proof', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport(
      [
        ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
        'camera.side_follow.active',
        'collision.platform.grounded',
        ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
        ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
        ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
        ENEMY_FIXED_TURRET_EVENT_TYPE,
        ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
        ENEMY_PATROL_INFANTRY_EVENT_TYPE,
        FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
        GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
      GOAL_BOSS_UNLOCK_EVENT_TYPE,
      HAZARD_FALLING_AREA_EVENT_TYPE,
      HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
      RULES_CHECKPOINT_RESTORE_EVENT_TYPE,
      'combat.airborne_fire.fired',
        'player.fired',
        'projectile.spawned',
        'movement.crouch.entered',
        'player.jumped',
        'pickup.collectible.collected',
        'pickup.collectible.state_changed',
        PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
        'spawn.enemy_wave.ordered',
        'spawn.static.triggered',
        'health.damage_invulnerability.activated',
        'health.damage_invulnerability.blocked',
        'health.player_health.current',
        'objective.completed',
        'game.won',
        FIXED_PROMPT_BINDING_EVENT_TYPE,
        PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
        REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
        WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
        WEAPON_DEATH_RESET_EVENT_TYPE,
        WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
        WEAPON_SPREAD_SHOT_EVENT_TYPE,
        WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
        WEAPON_REPLACEMENT_RULE_EVENT_TYPE
      ],
      { feedbackVictoryDeclarationStateFields: false }
    );
    const report = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260625_target_runtime_support',
      runId: 'run_20260625_feedback_victory_declaration_missing_state',
      capabilityQaReport
    });
    const victoryDeclaration = report.capabilities.find((entry) => entry.capabilityId === feedbackVictoryDeclarationCapabilityId);

    expect(capabilityQaReport.requiredResults.find((entry) => entry.probeId === FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID}.assertion.victory_declaration_verified`,
          status: 'failed',
          message: expect.stringContaining('expected victoryDeclarationShown=true, observed <missing>')
        }),
        expect.objectContaining({
          assertionId: `${FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID}.assertion.victory_declaration_verified`,
          status: 'failed',
          message: expect.stringContaining(`expected victoryDeclarationOutcome=${FEEDBACK_VICTORY_DECLARATION_OUTCOME}, observed <missing>`)
        })
      ])
    });
    expect(report).toMatchObject({
      status: 'blocked_incomplete_target_profile',
      observedCompleteSupportedCount: 41,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:41/59'
      ]
    });
    expect(victoryDeclaration).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
  });

  it('keeps generation fallback policy unverified when generic generation evidence lacks fail-closed state proof', () => {
    const genericReceiptQaReport = buildSingleCapabilityQaReport({
      capabilityId: generationFallbackPolicyFailClosedCapabilityId,
      packageContract: createGenerationFallbackPolicyFailClosedPackageContract(),
      eventType: 'generation.completed',
      probeId: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID,
      action: 'verify_fail_closed_policy',
      sourceRef: 'generation.path.generic_receipt',
      stateFields: undefined
    });
    const observedPolicyQaReport = buildSingleCapabilityQaReport({
      capabilityId: generationFallbackPolicyFailClosedCapabilityId,
      packageContract: createGenerationFallbackPolicyFailClosedPackageContract(),
      eventType: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
      probeId: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID,
      action: 'verify_fail_closed_policy',
      sourceRef: 'generation.path.fail_closed_policy',
      stateFields: {
        fallbackPolicy: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_POLICY,
        fallbackPolicyVerified: true,
        undeclaredFallbackDetected: false,
        fallbackOutputGenerated: false,
        fallbackFailureCode: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_ERROR_CODE
      }
    });
    const genericReceiptReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_generation_fallback_missing_state',
      capabilityQaReport: genericReceiptQaReport
    });
    const observedPolicyReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_generation_fallback_observed_state',
      capabilityQaReport: observedPolicyQaReport
    });
    const genericReceiptState = genericReceiptReport.capabilities.find((entry) => entry.capabilityId === generationFallbackPolicyFailClosedCapabilityId);
    const observedPolicyState = observedPolicyReport.capabilities.find((entry) => entry.capabilityId === generationFallbackPolicyFailClosedCapabilityId);

    expect(genericReceiptQaReport.requiredResults.find((entry) => entry.probeId === GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID}.assertion.fail_closed_policy`,
          status: 'failed',
          message: expect.stringContaining(`observation ${GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE} not observed`)
        }),
        expect.objectContaining({
          assertionId: `${GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID}.assertion.fail_closed_policy`,
          status: 'failed',
          message: expect.stringContaining(`expected fallbackPolicy=${GENERATION_FALLBACK_POLICY_FAIL_CLOSED_POLICY}, observed <missing>`)
        })
      ])
    });
    expect(genericReceiptReport).toMatchObject({
      observedCompleteSupportedCount: 0,
      blockers: [
        `capability_qa_report_missing_required_probe:${GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:0/59'
      ]
    });
    expect(genericReceiptState).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
    expect(observedPolicyReport).toMatchObject({
      observedCompleteSupportedCount: 1,
      observedCapabilityIds: [generationFallbackPolicyFailClosedCapabilityId],
      blockers: ['target_profile_runtime_support_incomplete:1/59']
    });
    expect(observedPolicyState).toMatchObject({
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
  });

  it('keeps boss unlock unverified when wave evidence lacks unlock state proof', () => {
    const bossUnlockDependencyEvidence: CapabilityRuntimeObservedProbeEvidence[] = [
      {
        capabilityId: spawnStaticCapabilityId,
        probeId: SPAWN_STATIC_REQUIRED_PROBE_ID,
        action: 'spawn',
        eventType: 'spawn.static.triggered',
        eventTypes: ['spawn.static.triggered'],
        sourceRef: 'runtime.spawn.static',
        status: 'observed'
      },
      {
        capabilityId: spawnEnemyWaveCapabilityId,
        probeId: SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID,
        action: 'spawn',
        eventType: 'spawn.enemy_wave.ordered',
        eventTypes: ['spawn.enemy_wave.ordered'],
        orderedWaveSequence: true,
        gateTriggered: true,
        waveSpawned: true,
        sequenceIndex: 0,
        waveId: GOAL_BOSS_UNLOCK_WAVE_ID,
        sourceRef: 'runtime.spawn.enemy_wave',
        status: 'observed'
      },
      {
        capabilityId: enemyBossLifecycleCapabilityId,
        probeId: ENEMY_BOSS_LIFECYCLE_REQUIRED_PROBE_ID,
        action: 'verify_boss_lifecycle',
        eventType: ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
        eventTypes: [ENEMY_BOSS_LIFECYCLE_EVENT_TYPE],
        bossLifecycleStarted: true,
        bossEntityId: ENEMY_BOSS_LIFECYCLE_BOSS_ENTITY_ID,
        bossMaxHealth: ENEMY_BOSS_LIFECYCLE_MAX_HEALTH,
        bossHealthInitialized: true,
        bossDefeated: true,
        sourceRef: 'runtime.enemy.boss_lifecycle',
        status: 'observed'
      }
    ];
    const genericWaveQaReport = buildSingleCapabilityQaReport({
      capabilityId: goalBossUnlockCapabilityId,
      packageContract: createGoalBossUnlockPackageContract(),
      dependencyPackages: [createSpawnStaticPackageContract(), createSpawnEnemyWavePackageContract(), createEnemyBossLifecyclePackageContract()],
      additionalObserved: bossUnlockDependencyEvidence,
      eventType: 'spawn.enemy_wave.ordered',
      probeId: GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID,
      action: 'spawn',
      sourceRef: 'runtime_plan.side_scrolling.waves.ordered_sequence',
      stateFields: {
        orderedWaveSequence: true,
        gateTriggered: true,
        waveSpawned: true,
        waveId: GOAL_BOSS_UNLOCK_WAVE_ID
      }
    });
    const observedUnlockQaReport = buildSingleCapabilityQaReport({
      capabilityId: goalBossUnlockCapabilityId,
      packageContract: createGoalBossUnlockPackageContract(),
      dependencyPackages: [createSpawnStaticPackageContract(), createSpawnEnemyWavePackageContract(), createEnemyBossLifecyclePackageContract()],
      additionalObserved: bossUnlockDependencyEvidence,
      eventType: GOAL_BOSS_UNLOCK_EVENT_TYPE,
      probeId: GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID,
      action: 'unlock_boss',
      sourceRef: 'runtime.goal.boss_unlock',
      stateFields: {
        wavesCleared: true,
        clearedWaveCount: GOAL_BOSS_UNLOCK_REQUIRED_WAVE_COUNT,
        requiredWaveCount: GOAL_BOSS_UNLOCK_REQUIRED_WAVE_COUNT,
        bossUnlockTriggered: true,
        bossUnlockReason: GOAL_BOSS_UNLOCK_REASON,
        bossEncounterUnlocked: true,
        bossUnlockWaveId: GOAL_BOSS_UNLOCK_WAVE_ID,
        bossUnlockBossEntityId: GOAL_BOSS_UNLOCK_BOSS_ENTITY_ID
      }
    });
    const genericWaveReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_boss_unlock_missing_state',
      capabilityQaReport: genericWaveQaReport
    });
    const observedUnlockReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_boss_unlock_observed_state',
      capabilityQaReport: observedUnlockQaReport
    });
    const genericWaveState = genericWaveReport.capabilities.find((entry) => entry.capabilityId === goalBossUnlockCapabilityId);
    const observedUnlockState = observedUnlockReport.capabilities.find((entry) => entry.capabilityId === goalBossUnlockCapabilityId);

    expect(genericWaveQaReport.requiredResults.find((entry) => entry.probeId === GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID}.assertion.boss_unlock_verified`,
          status: 'failed',
          message: expect.stringContaining(`observation ${GOAL_BOSS_UNLOCK_EVENT_TYPE} not observed`)
        }),
        expect.objectContaining({
          assertionId: `${GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID}.assertion.boss_unlock_verified`,
          status: 'failed',
          message: expect.stringContaining('expected bossUnlockTriggered=true, observed <missing>')
        })
      ])
    });
    expect(genericWaveReport).toMatchObject({
      observedCompleteSupportedCount: 3,
      observedCapabilityIds: [enemyBossLifecycleCapabilityId, spawnEnemyWaveCapabilityId, spawnStaticCapabilityId],
      blockers: [`capability_qa_report_missing_required_probe:${GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID}`, 'target_profile_runtime_support_incomplete:3/59']
    });
    expect(genericWaveState).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
    expect(observedUnlockReport).toMatchObject({
      observedCompleteSupportedCount: 4,
      observedCapabilityIds: [enemyBossLifecycleCapabilityId, goalBossUnlockCapabilityId, spawnEnemyWaveCapabilityId, spawnStaticCapabilityId],
      blockers: ['target_profile_runtime_support_incomplete:4/59']
    });
    expect(observedUnlockState).toMatchObject({
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
  });

  it('keeps falling hazard area unverified when generic hazard evidence lacks from-above state proof', () => {
    const genericHazardQaReport = buildSingleCapabilityQaReport({
      capabilityId: hazardFallingAreaCapabilityId,
      packageContract: createHazardFallingAreaPackageContract(),
      eventType: 'hazard.spawned',
      probeId: HAZARD_FALLING_AREA_REQUIRED_PROBE_ID,
      action: 'spawn',
      sourceRef: 'runtime.hazard.generic_spawn',
      stateFields: {
        hazardSpawned: true
      }
    });
    const observedFallingAreaQaReport = buildSingleCapabilityQaReport({
      capabilityId: hazardFallingAreaCapabilityId,
      packageContract: createHazardFallingAreaPackageContract(),
      eventType: HAZARD_FALLING_AREA_EVENT_TYPE,
      probeId: HAZARD_FALLING_AREA_REQUIRED_PROBE_ID,
      action: 'verify_falling_area',
      sourceRef: 'runtime.hazard.falling_area',
      stateFields: {
        fallingAreaActive: true,
        fallingAreaHazardId: HAZARD_FALLING_AREA_HAZARD_ID,
        fallingAreaBossPhaseId: HAZARD_FALLING_AREA_BOSS_PHASE_ID,
        fallingAreaPatternId: HAZARD_FALLING_AREA_PATTERN_ID,
        fallingAreaDropsFromAbove: true,
        fallingAreaArmed: true,
        fallingAreaDamagesPlayer: true,
        fallingAreaDamage: HAZARD_FALLING_AREA_DAMAGE,
        fallingAreaTelegraphMs: HAZARD_FALLING_AREA_TELEGRAPH_MS
      }
    });
    const genericHazardReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_falling_area_missing_state',
      capabilityQaReport: genericHazardQaReport
    });
    const observedFallingAreaReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_falling_area_observed_state',
      capabilityQaReport: observedFallingAreaQaReport
    });
    const genericHazardState = genericHazardReport.capabilities.find((entry) => entry.capabilityId === hazardFallingAreaCapabilityId);
    const observedFallingAreaState = observedFallingAreaReport.capabilities.find((entry) => entry.capabilityId === hazardFallingAreaCapabilityId);

    expect(genericHazardQaReport.requiredResults.find((entry) => entry.probeId === HAZARD_FALLING_AREA_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${HAZARD_FALLING_AREA_REQUIRED_PROBE_ID}.assertion.falling_area_verified`,
          status: 'failed',
          message: expect.stringContaining(`observation ${HAZARD_FALLING_AREA_EVENT_TYPE} not observed`)
        }),
        expect.objectContaining({
          assertionId: `${HAZARD_FALLING_AREA_REQUIRED_PROBE_ID}.assertion.falling_area_verified`,
          status: 'failed',
          message: expect.stringContaining('expected fallingAreaDropsFromAbove=true, observed <missing>')
        })
      ])
    });
    expect(genericHazardReport).toMatchObject({
      observedCompleteSupportedCount: 0,
      observedCapabilityIds: [],
      blockers: [`capability_qa_report_missing_required_probe:${HAZARD_FALLING_AREA_REQUIRED_PROBE_ID}`, 'target_profile_runtime_support_incomplete:0/59']
    });
    expect(genericHazardState).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [HAZARD_FALLING_AREA_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
    expect(observedFallingAreaReport).toMatchObject({
      observedCompleteSupportedCount: 1,
      observedCapabilityIds: [hazardFallingAreaCapabilityId],
      blockers: ['target_profile_runtime_support_incomplete:1/59']
    });
    expect(observedFallingAreaState).toMatchObject({
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [HAZARD_FALLING_AREA_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [HAZARD_FALLING_AREA_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
  });

  it('keeps timed explosion unverified when generic explosion evidence lacks timer causality proof', () => {
    const genericExplosionQaReport = buildSingleCapabilityQaReport({
      capabilityId: hazardTimedExplosionCapabilityId,
      packageContract: createHazardTimedExplosionPackageContract(),
      eventType: 'explosion.triggered',
      probeId: HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID,
      action: 'explode',
      sourceRef: 'runtime.hazard.generic_explosion',
      stateFields: {
        hazardSpawned: true,
        explosionOccurred: true
      }
    });
    const observedTimedExplosionQaReport = buildSingleCapabilityQaReport({
      capabilityId: hazardTimedExplosionCapabilityId,
      packageContract: createHazardTimedExplosionPackageContract(),
      eventType: HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
      probeId: HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID,
      action: 'verify_timed_explosion',
      sourceRef: 'runtime.hazard.timed_explosion',
      stateFields: {
        timedExplosionActive: true,
        timedExplosionHazardId: HAZARD_TIMED_EXPLOSION_HAZARD_ID,
        timedExplosionTimerId: HAZARD_TIMED_EXPLOSION_TIMER_ID,
        timedExplosionCountdownMs: HAZARD_TIMED_EXPLOSION_COUNTDOWN_MS,
        timedExplosionElapsedMs: HAZARD_TIMED_EXPLOSION_COUNTDOWN_MS,
        timedExplosionTriggerCondition: HAZARD_TIMED_EXPLOSION_TRIGGER_CONDITION,
        timedExplosionTriggeredByTimer: true,
        timedExplosionOccurred: true,
        timedExplosionDamagesPlayer: true,
        timedExplosionDamage: HAZARD_TIMED_EXPLOSION_DAMAGE,
        timedExplosionRadius: HAZARD_TIMED_EXPLOSION_RADIUS
      }
    });
    const genericExplosionReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_timed_explosion_missing_state',
      capabilityQaReport: genericExplosionQaReport
    });
    const observedTimedExplosionReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_timed_explosion_observed_state',
      capabilityQaReport: observedTimedExplosionQaReport
    });
    const genericExplosionState = genericExplosionReport.capabilities.find((entry) => entry.capabilityId === hazardTimedExplosionCapabilityId);
    const observedTimedExplosionState = observedTimedExplosionReport.capabilities.find((entry) => entry.capabilityId === hazardTimedExplosionCapabilityId);

    expect(genericExplosionQaReport.requiredResults.find((entry) => entry.probeId === HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID}.assertion.timed_explosion_verified`,
          status: 'failed',
          message: expect.stringContaining(`observation ${HAZARD_TIMED_EXPLOSION_EVENT_TYPE} not observed`)
        }),
        expect.objectContaining({
          assertionId: `${HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID}.assertion.timed_explosion_verified`,
          status: 'failed',
          message: expect.stringContaining('expected timedExplosionTriggeredByTimer=true, observed <missing>')
        })
      ])
    });
    expect(genericExplosionReport).toMatchObject({
      observedCompleteSupportedCount: 0,
      observedCapabilityIds: [],
      blockers: [`capability_qa_report_missing_required_probe:${HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID}`, 'target_profile_runtime_support_incomplete:0/59']
    });
    expect(genericExplosionState).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
    expect(observedTimedExplosionReport).toMatchObject({
      observedCompleteSupportedCount: 1,
      observedCapabilityIds: [hazardTimedExplosionCapabilityId],
      blockers: ['target_profile_runtime_support_incomplete:1/59']
    });
    expect(observedTimedExplosionState).toMatchObject({
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
  });

  it('keeps checkpoint restore unverified when checkpoint events lack zero-health retry restore state', () => {
    const genericCheckpointQaReport = buildSingleCapabilityQaReport({
      capabilityId: rulesCheckpointRestoreCapabilityId,
      packageContract: createRulesCheckpointRestorePackageContract(),
      eventType: 'checkpoint.reached',
      probeId: RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID,
      action: 'reach_checkpoint',
      sourceRef: 'runtime.rules.generic_checkpoint',
      stateFields: {
        checkpointReached: true
      }
    });
    const observedCheckpointRestoreQaReport = buildSingleCapabilityQaReport({
      capabilityId: rulesCheckpointRestoreCapabilityId,
      packageContract: createRulesCheckpointRestorePackageContract(),
      eventType: RULES_CHECKPOINT_RESTORE_EVENT_TYPE,
      eventTypes: [RULES_CHECKPOINT_RESTORE_DAMAGE_EVENT_TYPE, RULES_CHECKPOINT_RESTORE_EVENT_TYPE],
      probeId: RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID,
      action: 'restore_checkpoint',
      sourceRef: 'runtime.rules.checkpoint_restore',
      stateFields: {
        checkpointRestoreTriggeredByZeroHealth: true,
        checkpointRestoreRetryConsumed: true,
        checkpointRestoreRetryCountBefore: RULES_CHECKPOINT_RESTORE_RETRY_COUNT_BEFORE,
        checkpointRestoreRetryCountAfter: RULES_CHECKPOINT_RESTORE_RETRY_COUNT_AFTER,
        checkpointRestoreNearestCheckpointSelected: true,
        checkpointRestoreCheckpointId: RULES_CHECKPOINT_RESTORE_CHECKPOINT_ID,
        checkpointRestoreExpectedCheckpointId: RULES_CHECKPOINT_RESTORE_CHECKPOINT_ID,
        checkpointRestorePositionMatched: true,
        checkpointRestorePlayerRespawned: true,
        checkpointRestoreFailureScreenShown: false
      }
    });
    const genericCheckpointReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_checkpoint_restore_missing_state',
      capabilityQaReport: genericCheckpointQaReport
    });
    const observedCheckpointRestoreReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_checkpoint_restore_observed_state',
      capabilityQaReport: observedCheckpointRestoreQaReport
    });
    const genericCheckpointState = genericCheckpointReport.capabilities.find((entry) => entry.capabilityId === rulesCheckpointRestoreCapabilityId);
    const observedCheckpointRestoreState = observedCheckpointRestoreReport.capabilities.find(
      (entry) => entry.capabilityId === rulesCheckpointRestoreCapabilityId
    );

    expect(genericCheckpointQaReport.requiredResults.find((entry) => entry.probeId === RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID}.assertion.restored_checkpoint`,
          status: 'failed',
          message: expect.stringContaining(`observation ${RULES_CHECKPOINT_RESTORE_EVENT_TYPE} not observed`)
        }),
        expect.objectContaining({
          assertionId: `${RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID}.assertion.restored_checkpoint`,
          status: 'failed',
          message: expect.stringContaining('expected checkpointRestoreRetryConsumed=true, observed <missing>')
        })
      ])
    });
    expect(genericCheckpointReport).toMatchObject({
      observedCompleteSupportedCount: 0,
      observedCapabilityIds: [],
      blockers: [`capability_qa_report_missing_required_probe:${RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID}`, 'target_profile_runtime_support_incomplete:0/59']
    });
    expect(genericCheckpointState).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
    expect(observedCheckpointRestoreReport).toMatchObject({
      observedCompleteSupportedCount: 1,
      observedCapabilityIds: [rulesCheckpointRestoreCapabilityId],
      blockers: ['target_profile_runtime_support_incomplete:1/59']
    });
    expect(observedCheckpointRestoreState).toMatchObject({
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
  });

  it('keeps encounter gate unverified when wave evidence lacks closed-entrance state', () => {
    const dependencyEvidence: CapabilityRuntimeObservedProbeEvidence[] = [
      {
        capabilityId: spawnStaticCapabilityId,
        probeId: SPAWN_STATIC_REQUIRED_PROBE_ID,
        action: 'spawn',
        eventType: 'spawn.static.triggered',
        eventTypes: ['spawn.static.triggered'],
        sourceRef: 'runtime.spawn.static',
        status: 'observed'
      },
      {
        capabilityId: spawnEnemyWaveCapabilityId,
        probeId: SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID,
        action: 'spawn',
        eventType: 'spawn.enemy_wave.ordered',
        eventTypes: ['spawn.enemy_wave.ordered'],
        orderedWaveSequence: true,
        gateTriggered: true,
        waveSpawned: true,
        sequenceIndex: RULES_ENCOUNTER_GATE_SEQUENCE_INDEX,
        waveId: RULES_ENCOUNTER_GATE_WAVE_ID,
        sourceRef: 'runtime.spawn.enemy_wave',
        status: 'observed'
      }
    ];
    const genericWaveQaReport = buildSingleCapabilityQaReport({
      capabilityId: rulesEncounterGateCapabilityId,
      dependencyPackages: [createSpawnStaticPackageContract(), createSpawnEnemyWavePackageContract()],
      packageContract: createRulesEncounterGatePackageContract(),
      additionalObserved: dependencyEvidence,
      eventType: 'spawn.enemy_wave.ordered',
      probeId: RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID,
      action: 'spawn_wave',
      sourceRef: 'runtime_plan.side_scrolling.waves.ordered_sequence',
      stateFields: {
        orderedWaveSequence: true,
        gateTriggered: true,
        waveSpawned: true,
        sequenceIndex: RULES_ENCOUNTER_GATE_SEQUENCE_INDEX,
        waveId: RULES_ENCOUNTER_GATE_WAVE_ID
      }
    });
    const observedEncounterGateQaReport = buildSingleCapabilityQaReport({
      capabilityId: rulesEncounterGateCapabilityId,
      dependencyPackages: [createSpawnStaticPackageContract(), createSpawnEnemyWavePackageContract()],
      packageContract: createRulesEncounterGatePackageContract(),
      additionalObserved: dependencyEvidence,
      eventType: RULES_ENCOUNTER_GATE_EVENT_TYPE,
      eventTypes: [RULES_ENCOUNTER_GATE_EVENT_TYPE, 'spawn.enemy_wave.ordered'],
      probeId: RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID,
      action: 'close_gate',
      sourceRef: 'runtime.rules.encounter_gate',
      stateFields: {
        encounterGateClosedEntrance: true,
        encounterGateGateId: RULES_ENCOUNTER_GATE_GATE_ID,
        encounterGateEntranceId: RULES_ENCOUNTER_GATE_ENTRANCE_ID,
        encounterGateClosedBeforeWaveSpawn: true,
        encounterGateWaveSequenceBlockedUntilClosed: true,
        encounterGateNextWaveId: RULES_ENCOUNTER_GATE_WAVE_ID,
        encounterGateSequenceIndex: RULES_ENCOUNTER_GATE_SEQUENCE_INDEX,
        encounterGatePlayerBacktrackingBlocked: true
      }
    });
    const genericWaveReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_encounter_gate_missing_state',
      capabilityQaReport: genericWaveQaReport
    });
    const observedEncounterGateReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_encounter_gate_observed_state',
      capabilityQaReport: observedEncounterGateQaReport
    });
    const genericWaveState = genericWaveReport.capabilities.find((entry) => entry.capabilityId === rulesEncounterGateCapabilityId);
    const observedEncounterGateState = observedEncounterGateReport.capabilities.find((entry) => entry.capabilityId === rulesEncounterGateCapabilityId);

    expect(genericWaveQaReport.requiredResults.find((entry) => entry.probeId === SPAWN_STATIC_REQUIRED_PROBE_ID)).toMatchObject({ status: 'passed' });
    expect(genericWaveQaReport.requiredResults.find((entry) => entry.probeId === SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'passed'
    });
    expect(genericWaveQaReport.requiredResults.find((entry) => entry.probeId === RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID}.assertion.closed_before_wave`,
          status: 'failed',
          message: expect.stringContaining(`observation ${RULES_ENCOUNTER_GATE_EVENT_TYPE} not observed`)
        }),
        expect.objectContaining({
          assertionId: `${RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID}.assertion.closed_before_wave`,
          status: 'failed',
          message: expect.stringContaining('expected encounterGateClosedEntrance=true, observed <missing>')
        })
      ])
    });
    expect(genericWaveState).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
    expect(observedEncounterGateState).toMatchObject({
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
  });

  it('keeps retry count unverified when damage evidence lacks retry budget state', () => {
    const dependencyEvidence: CapabilityRuntimeObservedProbeEvidence[] = [
      {
        capabilityId: healthCapabilityId,
        probeId: HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID,
        action: 'observe_health_points',
        eventType: 'health.player_health.current',
        eventTypes: ['health.player_health.current'],
        sourceRef: 'runtime.health.player_health_points',
        status: 'observed'
      }
    ];
    const genericRetryQaReport = buildSingleCapabilityQaReport({
      capabilityId: rulesRetryCountCapabilityId,
      dependencyPackages: [createHealthPlayerHealthPointsPackageContract()],
      packageContract: createRulesRetryCountPackageContract(),
      additionalObserved: dependencyEvidence,
      eventType: RULES_RETRY_COUNT_DAMAGE_EVENT_TYPE,
      eventTypes: [RULES_RETRY_COUNT_DAMAGE_EVENT_TYPE, 'rules.checkpoint_restore.restored'],
      probeId: RULES_RETRY_COUNT_REQUIRED_PROBE_ID,
      action: 'zero_health_retry',
      sourceRef: 'runtime.rules.generic_checkpoint_retry',
      stateFields: undefined
    });
    const observedRetryCountQaReport = buildSingleCapabilityQaReport({
      capabilityId: rulesRetryCountCapabilityId,
      dependencyPackages: [createHealthPlayerHealthPointsPackageContract()],
      packageContract: createRulesRetryCountPackageContract(),
      additionalObserved: dependencyEvidence,
      eventType: RULES_RETRY_COUNT_EVENT_TYPE,
      eventTypes: [RULES_RETRY_COUNT_DAMAGE_EVENT_TYPE, RULES_RETRY_COUNT_EVENT_TYPE],
      probeId: RULES_RETRY_COUNT_REQUIRED_PROBE_ID,
      action: 'consume_retry',
      sourceRef: 'runtime.rules.retry_count',
      stateFields: {
        retryCountConfigured: true,
        retryCountInitial: RULES_RETRY_COUNT_INITIAL_RETRIES,
        retryCountBefore: RULES_RETRY_COUNT_BEFORE,
        retryCountAfter: RULES_RETRY_COUNT_AFTER,
        retryCountRemaining: RULES_RETRY_COUNT_REMAINING,
        retryCountConsumed: true,
        retryCountDecremented: true,
        retryCountExhausted: false,
        retryCountFailureScreenShown: false
      }
    });
    const genericRetryReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_retry_count_missing_state',
      capabilityQaReport: genericRetryQaReport
    });
    const observedRetryCountReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_retry_count_observed_state',
      capabilityQaReport: observedRetryCountQaReport
    });
    const genericRetryState = genericRetryReport.capabilities.find((entry) => entry.capabilityId === rulesRetryCountCapabilityId);
    const observedRetryCountState = observedRetryCountReport.capabilities.find((entry) => entry.capabilityId === rulesRetryCountCapabilityId);

    expect(genericRetryQaReport.requiredResults.find((entry) => entry.probeId === HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'passed'
    });
    expect(genericRetryQaReport.requiredResults.find((entry) => entry.probeId === RULES_RETRY_COUNT_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${RULES_RETRY_COUNT_REQUIRED_PROBE_ID}.assertion.retry_consumed`,
          status: 'failed',
          message: expect.stringContaining(`observation ${RULES_RETRY_COUNT_EVENT_TYPE} not observed`)
        }),
        expect.objectContaining({
          assertionId: `${RULES_RETRY_COUNT_REQUIRED_PROBE_ID}.assertion.retry_consumed`,
          status: 'failed',
          message: expect.stringContaining('expected retryCountConfigured=true, observed <missing>')
        })
      ])
    });
    expect(genericRetryState).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [RULES_RETRY_COUNT_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
    expect(observedRetryCountState).toMatchObject({
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [RULES_RETRY_COUNT_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [RULES_RETRY_COUNT_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
  });

  it('keeps state transition graph unverified when win lose evidence lacks explicit graph fields', () => {
    const genericGraphQaReport = buildSingleCapabilityQaReport({
      capabilityId: rulesStateTransitionGraphCapabilityId,
      packageContract: createRulesStateTransitionGraphPackageContract(),
      eventType: 'game.won',
      eventTypes: ['game.won', 'game.lost'],
      probeId: RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID,
      action: 'resolve_win_lose',
      sourceRef: 'runtime.win_lose.generic',
      stateFields: undefined
    });
    const observedGraphQaReport = buildSingleCapabilityQaReport({
      capabilityId: rulesStateTransitionGraphCapabilityId,
      packageContract: createRulesStateTransitionGraphPackageContract(),
      eventType: RULES_STATE_TRANSITION_GRAPH_EVENT_TYPE,
      eventTypes: [RULES_STATE_TRANSITION_GRAPH_EVENT_TYPE],
      probeId: RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID,
      action: 'verify_graph',
      sourceRef: 'runtime.rules.state_transition_graph',
      stateFields: {
        stateTransitionGraphDeclared: true,
        stateTransitionGraphId: RULES_STATE_TRANSITION_GRAPH_ID,
        stateTransitionGraphStateCount: RULES_STATE_TRANSITION_GRAPH_STATE_COUNT,
        stateTransitionGraphTransitionCount: RULES_STATE_TRANSITION_GRAPH_TRANSITION_COUNT,
        stateTransitionGraphFromState: RULES_STATE_TRANSITION_GRAPH_FROM_STATE,
        stateTransitionGraphToState: RULES_STATE_TRANSITION_GRAPH_TO_STATE,
        stateTransitionGraphTrigger: RULES_STATE_TRANSITION_GRAPH_TRIGGER,
        stateTransitionGraphTerminalStatesIncluded: true,
        stateTransitionGraphNoImplicitFallback: true,
        stateTransitionGraphReachabilityVerified: true
      }
    });
    const genericGraphReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_state_transition_graph_missing_state',
      capabilityQaReport: genericGraphQaReport
    });
    const observedGraphReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_state_transition_graph_observed_state',
      capabilityQaReport: observedGraphQaReport
    });
    const genericGraphState = genericGraphReport.capabilities.find((entry) => entry.capabilityId === rulesStateTransitionGraphCapabilityId);
    const observedGraphState = observedGraphReport.capabilities.find((entry) => entry.capabilityId === rulesStateTransitionGraphCapabilityId);

    expect(genericGraphQaReport.requiredResults.find((entry) => entry.probeId === RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID}.assertion.explicit_graph`,
          status: 'failed',
          message: expect.stringContaining(`observation ${RULES_STATE_TRANSITION_GRAPH_EVENT_TYPE} not observed`)
        }),
        expect.objectContaining({
          assertionId: `${RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID}.assertion.explicit_graph`,
          status: 'failed',
          message: expect.stringContaining('expected stateTransitionGraphDeclared=true, observed <missing>')
        })
      ])
    });
    expect(genericGraphState).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
    expect(observedGraphState).toMatchObject({
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
  });

  it('keeps runtime manifest binding unverified when manifest evidence lacks binding fields', () => {
    const genericManifestQaReport = buildSingleCapabilityQaReport({
      capabilityId: runtimeManifestBindingCapabilityId,
      packageContract: createRuntimeManifestBindingPackageContract(),
      eventType: 'profile.runtime_manifest.loaded',
      eventTypes: ['profile.runtime_manifest.loaded'],
      probeId: RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID,
      action: 'load_runtime_manifest',
      sourceRef: 'runtime.manifest.generic',
      stateFields: undefined
    });
    const observedBindingQaReport = buildSingleCapabilityQaReport({
      capabilityId: runtimeManifestBindingCapabilityId,
      packageContract: createRuntimeManifestBindingPackageContract(),
      eventType: RUNTIME_MANIFEST_BINDING_EVENT_TYPE,
      eventTypes: [RUNTIME_MANIFEST_BINDING_EVENT_TYPE],
      probeId: RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID,
      action: 'verify_binding',
      sourceRef: 'runtime.manifest.binding_report',
      stateFields: runtimeManifestBindingStateFields()
    });
    const genericManifestReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_runtime_manifest_binding_missing_state',
      capabilityQaReport: genericManifestQaReport
    });
    const observedBindingReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_runtime_manifest_binding_observed_state',
      capabilityQaReport: observedBindingQaReport
    });
    const genericManifestState = genericManifestReport.capabilities.find((entry) => entry.capabilityId === runtimeManifestBindingCapabilityId);
    const observedBindingState = observedBindingReport.capabilities.find((entry) => entry.capabilityId === runtimeManifestBindingCapabilityId);

    expect(genericManifestQaReport.requiredResults.find((entry) => entry.probeId === RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID}.assertion.binding`,
          status: 'failed',
          message: expect.stringContaining(`observation ${RUNTIME_MANIFEST_BINDING_EVENT_TYPE} not observed`)
        }),
        expect.objectContaining({
          assertionId: `${RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID}.assertion.binding`,
          status: 'failed',
          message: expect.stringContaining('expected runtimeManifestBound=true, observed <missing>')
        })
      ])
    });
    expect(genericManifestState).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
    expect(observedBindingState).toMatchObject({
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
  });

  it('keeps runtime module load receipt unverified when receipt evidence lacks integrity fields', () => {
    const genericReceiptQaReport = buildSingleCapabilityQaReport({
      capabilityId: runtimeModuleLoadReceiptCapabilityId,
      packageContract: createRuntimeModuleLoadReceiptPackageContract(),
      dependencyPackages: [createRuntimeManifestBindingPackageContract()],
      additionalObserved: [
        {
          capabilityId: runtimeManifestBindingCapabilityId,
          probeId: RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID,
          action: 'load_runtime_manifest',
          eventType: RUNTIME_MANIFEST_BINDING_EVENT_TYPE,
          eventTypes: [RUNTIME_MANIFEST_BINDING_EVENT_TYPE],
          ...runtimeManifestBindingStateFields(),
          status: 'observed',
          sourceRef: 'runtime.manifest_binding'
        }
      ],
      eventType: 'runtime.module_load_receipt.artifact_ref',
      eventTypes: ['runtime.module_load_receipt.artifact_ref'],
      probeId: RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID,
      action: 'verify_receipt',
      sourceRef: 'runtime.module_load_receipt',
      stateFields: undefined
    });
    const observedReceiptQaReport = buildSingleCapabilityQaReport({
      capabilityId: runtimeModuleLoadReceiptCapabilityId,
      packageContract: createRuntimeModuleLoadReceiptPackageContract(),
      dependencyPackages: [createRuntimeManifestBindingPackageContract()],
      additionalObserved: [
        {
          capabilityId: runtimeManifestBindingCapabilityId,
          probeId: RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID,
          action: 'load_runtime_manifest',
          eventType: RUNTIME_MANIFEST_BINDING_EVENT_TYPE,
          eventTypes: [RUNTIME_MANIFEST_BINDING_EVENT_TYPE],
          ...runtimeManifestBindingStateFields(),
          status: 'observed',
          sourceRef: 'runtime.manifest_binding'
        }
      ],
      eventType: RUNTIME_MODULE_LOAD_RECEIPT_EVENT_TYPE,
      eventTypes: [RUNTIME_MODULE_LOAD_RECEIPT_EVENT_TYPE],
      probeId: RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID,
      action: 'verify_receipt',
      sourceRef: 'runtime.module_load_receipt',
      stateFields: runtimeModuleLoadReceiptStateFields()
    });
    const genericReceiptReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_runtime_module_load_receipt_missing_state',
      capabilityQaReport: genericReceiptQaReport
    });
    const observedReceiptReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_runtime_module_load_receipt_observed_state',
      capabilityQaReport: observedReceiptQaReport
    });
    const genericReceiptState = genericReceiptReport.capabilities.find((entry) => entry.capabilityId === runtimeModuleLoadReceiptCapabilityId);
    const observedReceiptState = observedReceiptReport.capabilities.find((entry) => entry.capabilityId === runtimeModuleLoadReceiptCapabilityId);

    expect(genericReceiptQaReport.requiredResults.find((entry) => entry.probeId === RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID}.assertion.receipt`,
          status: 'failed',
          message: expect.stringContaining(`observation ${RUNTIME_MODULE_LOAD_RECEIPT_EVENT_TYPE} not observed`)
        }),
        expect.objectContaining({
          assertionId: `${RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID}.assertion.receipt`,
          status: 'failed',
          message: expect.stringContaining('expected runtimeModuleLoadReceiptLoaded=true, observed <missing>')
        })
      ])
    });
    expect(genericReceiptState).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
    expect(observedReceiptState).toMatchObject({
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
  });

  it('keeps runtime plan coverage unverified when coverage evidence lacks alignment fields', () => {
    const genericCoverageQaReport = buildSingleCapabilityQaReport({
      capabilityId: runtimePlanCoverageCapabilityId,
      packageContract: createRuntimePlanCoveragePackageContract(),
      eventType: 'runtime.plan.generated',
      eventTypes: ['runtime.plan.generated'],
      probeId: RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID,
      action: 'verify_coverage',
      sourceRef: 'runtime.plan',
      stateFields: undefined
    });
    const missingCoverageStateQaReport = buildSingleCapabilityQaReport({
      capabilityId: runtimePlanCoverageCapabilityId,
      packageContract: createRuntimePlanCoveragePackageContract(),
      eventType: RUNTIME_PLAN_COVERAGE_EVENT_TYPE,
      eventTypes: [RUNTIME_PLAN_COVERAGE_EVENT_TYPE],
      probeId: RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID,
      action: 'verify_coverage',
      sourceRef: 'runtime.plan_coverage',
      stateFields: undefined
    });
    const observedCoverageQaReport = buildSingleCapabilityQaReport({
      capabilityId: runtimePlanCoverageCapabilityId,
      packageContract: createRuntimePlanCoveragePackageContract(),
      eventType: RUNTIME_PLAN_COVERAGE_EVENT_TYPE,
      eventTypes: [RUNTIME_PLAN_COVERAGE_EVENT_TYPE],
      probeId: RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID,
      action: 'verify_coverage',
      sourceRef: 'runtime.plan_coverage',
      stateFields: runtimePlanCoverageStateFields()
    });
    const genericCoverageReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_runtime_plan_coverage_generic_event',
      capabilityQaReport: genericCoverageQaReport
    });
    const observedCoverageReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_runtime_plan_coverage_observed_state',
      capabilityQaReport: observedCoverageQaReport
    });
    const genericCoverageState = genericCoverageReport.capabilities.find((entry) => entry.capabilityId === runtimePlanCoverageCapabilityId);
    const observedCoverageState = observedCoverageReport.capabilities.find((entry) => entry.capabilityId === runtimePlanCoverageCapabilityId);

    expect(genericCoverageQaReport.requiredResults.find((entry) => entry.probeId === RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID}.assertion.coverage`,
          status: 'failed',
          message: expect.stringContaining(`observation ${RUNTIME_PLAN_COVERAGE_EVENT_TYPE} not observed`)
        })
      ])
    });
    expect(missingCoverageStateQaReport.requiredResults.find((entry) => entry.probeId === RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID}.assertion.coverage`,
          status: 'failed',
          message: expect.stringContaining('expected runtimePlanCoverageComputed=true, observed <missing>')
        }),
        expect.objectContaining({
          assertionId: `${RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID}.assertion.coverage`,
          status: 'failed',
          message: expect.stringContaining(`expected runtimePlanCoverageKind=${RUNTIME_PLAN_COVERAGE_KIND}`)
        })
      ])
    });
    expect(genericCoverageState).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
    expect(observedCoverageState).toMatchObject({
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
  });

  it('keeps scene ordered segments unverified when telemetry lacks ordered segment state fields', () => {
    const genericSegmentQaReport = buildSingleCapabilityQaReport({
      capabilityId: sceneOrderedSegmentsCapabilityId,
      packageContract: createSceneOrderedSegmentsPackageContract(),
      eventType: 'level.segment.completed',
      eventTypes: ['level.segment.completed'],
      probeId: SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID,
      action: 'complete_segment',
      sourceRef: 'telemetry.level.segment.completed',
      stateFields: undefined
    });
    const missingOrderedStateQaReport = buildSingleCapabilityQaReport({
      capabilityId: sceneOrderedSegmentsCapabilityId,
      packageContract: createSceneOrderedSegmentsPackageContract(),
      eventType: SCENE_ORDERED_SEGMENTS_EVENT_TYPE,
      eventTypes: [SCENE_ORDERED_SEGMENTS_EVENT_TYPE],
      probeId: SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID,
      action: 'verify_order',
      sourceRef: 'scene.ordered_segments',
      stateFields: undefined
    });
    const observedOrderedSegmentsQaReport = buildSingleCapabilityQaReport({
      capabilityId: sceneOrderedSegmentsCapabilityId,
      packageContract: createSceneOrderedSegmentsPackageContract(),
      eventType: SCENE_ORDERED_SEGMENTS_EVENT_TYPE,
      eventTypes: [SCENE_ORDERED_SEGMENTS_EVENT_TYPE],
      probeId: SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID,
      action: 'verify_order',
      sourceRef: 'scene.ordered_segments',
      stateFields: sceneOrderedSegmentsStateFields()
    });
    const genericSegmentReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_scene_ordered_segments_generic_event',
      capabilityQaReport: genericSegmentQaReport
    });
    const observedOrderedSegmentsReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_scene_ordered_segments_observed_state',
      capabilityQaReport: observedOrderedSegmentsQaReport
    });
    const genericSegmentState = genericSegmentReport.capabilities.find((entry) => entry.capabilityId === sceneOrderedSegmentsCapabilityId);
    const observedOrderedSegmentsState = observedOrderedSegmentsReport.capabilities.find(
      (entry) => entry.capabilityId === sceneOrderedSegmentsCapabilityId
    );

    expect(genericSegmentQaReport.requiredResults.find((entry) => entry.probeId === SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID}.assertion.ordered_segments`,
          status: 'failed',
          message: expect.stringContaining(`observation ${SCENE_ORDERED_SEGMENTS_EVENT_TYPE} not observed`)
        })
      ])
    });
    expect(missingOrderedStateQaReport.requiredResults.find((entry) => entry.probeId === SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID}.assertion.ordered_segments`,
          status: 'failed',
          message: expect.stringContaining('expected sceneOrderedSegmentsVerified=true, observed <missing>')
        }),
        expect.objectContaining({
          assertionId: `${SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID}.assertion.ordered_segments`,
          status: 'failed',
          message: expect.stringContaining(`expected sceneOrderedSegmentsFirstId=${SCENE_ORDERED_SEGMENTS_FIRST_ID}`)
        })
      ])
    });
    expect(genericSegmentState).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
    expect(observedOrderedSegmentsState).toMatchObject({
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
  });

  it('keeps scene visual presentation metadata unverified without 16-bit style and asset-plan state fields', () => {
    const genericVisualThemeQaReport = buildSingleCapabilityQaReport({
      capabilityId: sceneVisualPresentationMetadataCapabilityId,
      packageContract: createSceneVisualPresentationMetadataPackageContract(),
      eventType: 'world.visual_theme.bound',
      eventTypes: ['world.visual_theme.bound'],
      probeId: SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID,
      action: 'bind_visual_theme',
      sourceRef: 'world.visual_theme',
      stateFields: undefined
    });
    const missingVisualStateQaReport = buildSingleCapabilityQaReport({
      capabilityId: sceneVisualPresentationMetadataCapabilityId,
      packageContract: createSceneVisualPresentationMetadataPackageContract(),
      eventType: SCENE_VISUAL_PRESENTATION_METADATA_EVENT_TYPE,
      eventTypes: [SCENE_VISUAL_PRESENTATION_METADATA_EVENT_TYPE],
      probeId: SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID,
      action: 'verify_visual_metadata',
      sourceRef: 'scene.visual_presentation_metadata',
      stateFields: undefined
    });
    const observedVisualStateQaReport = buildSingleCapabilityQaReport({
      capabilityId: sceneVisualPresentationMetadataCapabilityId,
      packageContract: createSceneVisualPresentationMetadataPackageContract(),
      eventType: SCENE_VISUAL_PRESENTATION_METADATA_EVENT_TYPE,
      eventTypes: [SCENE_VISUAL_PRESENTATION_METADATA_EVENT_TYPE],
      probeId: SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID,
      action: 'verify_visual_metadata',
      sourceRef: 'scene.visual_presentation_metadata',
      stateFields: sceneVisualPresentationMetadataStateFields()
    });
    const genericVisualThemeReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_scene_visual_metadata_generic_event',
      capabilityQaReport: genericVisualThemeQaReport
    });
    const observedVisualStateReport = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260626_target_runtime_support',
      runId: 'run_20260626_scene_visual_metadata_observed_state',
      capabilityQaReport: observedVisualStateQaReport
    });
    const genericVisualThemeState = genericVisualThemeReport.capabilities.find(
      (entry) => entry.capabilityId === sceneVisualPresentationMetadataCapabilityId
    );
    const observedVisualState = observedVisualStateReport.capabilities.find(
      (entry) => entry.capabilityId === sceneVisualPresentationMetadataCapabilityId
    );

    expect(
      genericVisualThemeQaReport.requiredResults.find((entry) => entry.probeId === SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID)
    ).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID}.assertion.visual_metadata`,
          status: 'failed',
          message: expect.stringContaining(`observation ${SCENE_VISUAL_PRESENTATION_METADATA_EVENT_TYPE} not observed`)
        })
      ])
    });
    expect(
      missingVisualStateQaReport.requiredResults.find((entry) => entry.probeId === SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID)
    ).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID}.assertion.visual_metadata`,
          status: 'failed',
          message: expect.stringContaining('expected sceneVisualPresentationMetadataVerified=true, observed <missing>')
        }),
        expect.objectContaining({
          assertionId: `${SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID}.assertion.visual_metadata`,
          status: 'failed',
          message: expect.stringContaining(`expected sceneVisualPresentationStyleId=${SCENE_VISUAL_PRESENTATION_METADATA_STYLE_ID}`)
        }),
        expect.objectContaining({
          assertionId: `${SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID}.assertion.visual_metadata`,
          status: 'failed',
          message: expect.stringContaining('expected sceneVisualPresentationAssetPlanBound=true, observed <missing>')
        })
      ])
    });
    expect(genericVisualThemeState).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
    expect(observedVisualState).toMatchObject({
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID],
      missingRequiredProbeIds: [],
      staticEvidenceDimensions: { qa_observed: false },
      observedEvidenceDimensions: { qa_observed: true }
    });
  });

  it('keeps weapon death reset unverified when restore evidence lacks reset state fields', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport(
      [
        ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
        'camera.side_follow.active',
        'collision.platform.grounded',
        ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
        ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
        ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
        ENEMY_FIXED_TURRET_EVENT_TYPE,
        ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
        ENEMY_PATROL_INFANTRY_EVENT_TYPE,
        FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
        GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
      GOAL_BOSS_UNLOCK_EVENT_TYPE,
      HAZARD_FALLING_AREA_EVENT_TYPE,
      HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
      RULES_CHECKPOINT_RESTORE_EVENT_TYPE,
      'combat.airborne_fire.fired',
        'player.fired',
        'projectile.spawned',
        'movement.crouch.entered',
        'player.jumped',
        'pickup.collectible.collected',
        'pickup.collectible.state_changed',
        PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
        'spawn.enemy_wave.ordered',
        'spawn.static.triggered',
        'health.damage_invulnerability.activated',
        'health.damage_invulnerability.blocked',
        'health.player_health.current',
        FIXED_PROMPT_BINDING_EVENT_TYPE,
      PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
      REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
      WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
      WEAPON_DEATH_RESET_EVENT_TYPE,
      WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
      WEAPON_SPREAD_SHOT_EVENT_TYPE,
      WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
      WEAPON_REPLACEMENT_RULE_EVENT_TYPE
      ],
      { weaponDeathResetStateFields: false }
    );
    const report = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260625_target_runtime_support',
      runId: 'run_20260625_weapon_death_reset_missing_state',
      capabilityQaReport
    });
    const deathReset = report.capabilities.find((entry) => entry.capabilityId === deathResetCapabilityId);

    expect(capabilityQaReport.requiredResults.find((entry) => entry.probeId === WEAPON_DEATH_RESET_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: 'weapon.death_reset.v1.restore.browser_qa.v1.assertion.restored_initial_weapon',
          status: 'failed',
          message: expect.stringContaining('expected weaponReset=true, observed <missing>')
        })
      ])
    });
    expect(report).toMatchObject({
      status: 'blocked_incomplete_target_profile',
      observedCompleteSupportedCount: 41,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${WEAPON_DEATH_RESET_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:41/59'
      ]
    });
    expect(deathReset).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [WEAPON_DEATH_RESET_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
  });

  it('keeps weapon rapid fire unverified when burst evidence lacks rate fields', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport(
      [
        ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
        'camera.side_follow.active',
        'collision.platform.grounded',
        ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
        ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
        ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
        ENEMY_FIXED_TURRET_EVENT_TYPE,
        ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
        ENEMY_PATROL_INFANTRY_EVENT_TYPE,
        FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
        GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
      GOAL_BOSS_UNLOCK_EVENT_TYPE,
      HAZARD_FALLING_AREA_EVENT_TYPE,
      HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
      RULES_CHECKPOINT_RESTORE_EVENT_TYPE,
      'combat.airborne_fire.fired',
        'player.fired',
        'projectile.spawned',
        'movement.crouch.entered',
        'player.jumped',
        'pickup.collectible.collected',
        'pickup.collectible.state_changed',
        PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
        'spawn.enemy_wave.ordered',
        'spawn.static.triggered',
        'health.damage_invulnerability.activated',
        'health.damage_invulnerability.blocked',
        'health.player_health.current',
        FIXED_PROMPT_BINDING_EVENT_TYPE,
        PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
        REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
        WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
        WEAPON_DEATH_RESET_EVENT_TYPE,
        WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
        WEAPON_SPREAD_SHOT_EVENT_TYPE,
        WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
        WEAPON_REPLACEMENT_RULE_EVENT_TYPE
      ],
      { weaponRapidFireStateFields: false }
    );
    const report = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260625_target_runtime_support',
      runId: 'run_20260625_weapon_rapid_fire_missing_rate_state',
      capabilityQaReport
    });
    const rapidFire = report.capabilities.find((entry) => entry.capabilityId === rapidFireCapabilityId);

    expect(capabilityQaReport.requiredResults.find((entry) => entry.probeId === WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: 'weapon.rapid_fire.v1.burst.browser_qa.v1.assertion.rapid_burst',
          status: 'failed',
          message: expect.stringContaining('expected rapidFire=true, observed <missing>')
        })
      ])
    });
    expect(report).toMatchObject({
      status: 'blocked_incomplete_target_profile',
      observedCompleteSupportedCount: 41,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:41/59'
      ]
    });
    expect(rapidFire).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
  });

  it('keeps weapon spread shot unverified when fire evidence lacks spread state fields', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport(
      [
        ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
        'camera.side_follow.active',
        'collision.platform.grounded',
        ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
        ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
        ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
        ENEMY_FIXED_TURRET_EVENT_TYPE,
        ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
        ENEMY_PATROL_INFANTRY_EVENT_TYPE,
        FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
        GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
      GOAL_BOSS_UNLOCK_EVENT_TYPE,
      HAZARD_FALLING_AREA_EVENT_TYPE,
      HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
      RULES_CHECKPOINT_RESTORE_EVENT_TYPE,
      'combat.airborne_fire.fired',
        'player.fired',
        'projectile.spawned',
        'movement.crouch.entered',
        'player.jumped',
        'pickup.collectible.collected',
        'pickup.collectible.state_changed',
        PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
        'spawn.enemy_wave.ordered',
        'spawn.static.triggered',
        'health.damage_invulnerability.activated',
        'health.damage_invulnerability.blocked',
        'health.player_health.current',
        FIXED_PROMPT_BINDING_EVENT_TYPE,
        PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
        REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
        WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
        WEAPON_DEATH_RESET_EVENT_TYPE,
        WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
        WEAPON_SPREAD_SHOT_EVENT_TYPE,
        WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
        WEAPON_REPLACEMENT_RULE_EVENT_TYPE
      ],
      { weaponSpreadShotStateFields: false }
    );
    const report = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260625_target_runtime_support',
      runId: 'run_20260625_weapon_spread_shot_missing_state',
      capabilityQaReport
    });
    const spreadShot = report.capabilities.find((entry) => entry.capabilityId === spreadShotCapabilityId);

    expect(capabilityQaReport.requiredResults.find((entry) => entry.probeId === WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: 'weapon.spread_shot.v1.fire.browser_qa.v1.assertion.spread_projectiles',
          status: 'failed',
          message: expect.stringContaining('expected spreadShot=true, observed <missing>')
        })
      ])
    });
    expect(report).toMatchObject({
      status: 'blocked_incomplete_target_profile',
      observedCompleteSupportedCount: 41,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:41/59'
      ]
    });
    expect(spreadShot).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
  });

  it('keeps weapon replacement rule unverified when pickup evidence lacks replacement state fields', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport(
      [
        ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
        'camera.side_follow.active',
        'collision.platform.grounded',
        ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
        ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
        ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
        ENEMY_FIXED_TURRET_EVENT_TYPE,
        ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
        ENEMY_PATROL_INFANTRY_EVENT_TYPE,
        FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
        GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
      GOAL_BOSS_UNLOCK_EVENT_TYPE,
      HAZARD_FALLING_AREA_EVENT_TYPE,
      HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
      RULES_CHECKPOINT_RESTORE_EVENT_TYPE,
      'combat.airborne_fire.fired',
        'player.fired',
        'projectile.spawned',
        'movement.crouch.entered',
        'player.jumped',
        'pickup.collectible.collected',
        'pickup.collectible.state_changed',
        PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
        'spawn.enemy_wave.ordered',
        'spawn.static.triggered',
        'health.damage_invulnerability.activated',
        'health.damage_invulnerability.blocked',
        'health.player_health.current',
        FIXED_PROMPT_BINDING_EVENT_TYPE,
        PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
        REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
        WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
        WEAPON_DEATH_RESET_EVENT_TYPE,
        WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
        WEAPON_SPREAD_SHOT_EVENT_TYPE,
        WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
        WEAPON_REPLACEMENT_RULE_EVENT_TYPE
      ],
      { weaponReplacementStateFields: false }
    );
    const report = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260625_target_runtime_support',
      runId: 'run_20260625_weapon_replacement_rule_missing_state',
      capabilityQaReport
    });
    const replacementRule = report.capabilities.find((entry) => entry.capabilityId === replacementRuleCapabilityId);

    expect(capabilityQaReport.requiredResults.find((entry) => entry.probeId === WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: 'weapon.replacement_rule.v1.replace.browser_qa.v1.assertion.replaced_weapon',
          status: 'failed',
          message: expect.stringContaining('expected weaponReplaced=true, observed <missing>')
        })
      ])
    });
    expect(report).toMatchObject({
      status: 'blocked_incomplete_target_profile',
      observedCompleteSupportedCount: 41,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:41/59'
      ]
    });
    expect(replacementRule).toMatchObject({
      runtimeVerified: false,
      observedCompleteSupported: false,
      verifiedRequiredProbeIds: [],
      missingRequiredProbeIds: [WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID],
      observedEvidenceDimensions: { qa_observed: false }
    });
  });

  it('keeps missing required probe blockers in canonical QA plan order', () => {
    expect(expectedMissingRequiredProbeBlockers()).toEqual([
      `capability_qa_report_missing_required_probe:${ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${COLLISION_PLATFORM_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${COMBAT_AIRBORNE_FIRE_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${COMBAT_PROJECTILE_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${ENEMY_BOSS_ATTACK_PATTERN_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${ENEMY_BOSS_LIFECYCLE_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${ENEMY_BOSS_PHASE_TRANSITION_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${ENEMY_FIXED_TURRET_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${HAZARD_FALLING_AREA_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${HEALTH_DAMAGE_INVULNERABILITY_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${MOVEMENT_CROUCH_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${RULES_RETRY_COUNT_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${SPAWN_STATIC_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${WEAPON_DEATH_RESET_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID}`
    ]);
  });
});

function buildDefaultWeaponQaReport(
  eventTypes: readonly string[],
  options: {
    artifactLineageNoManualPatchStateFields?: boolean;
    enemyBossAttackPatternStateFields?: boolean;
    enemyBossLifecycleStateFields?: boolean;
    enemyBossPhaseTransitionStateFields?: boolean;
    enemyFixedTurretStateFields?: boolean;
    enemyFlyingRightEntryStateFields?: boolean;
    enemyPatrolInfantryStateFields?: boolean;
    feedbackVictoryDeclarationStateFields?: boolean;
    generationFallbackPolicyFailClosedStateFields?: boolean;
    goalBossUnlockStateFields?: boolean;
    hazardFallingAreaStateFields?: boolean;
    hazardTimedExplosionStateFields?: boolean;
    rulesCheckpointRestoreStateFields?: boolean;
    rulesEncounterGateStateFields?: boolean;
    rulesRetryCountStateFields?: boolean;
    rulesStateTransitionGraphStateFields?: boolean;
    runtimeManifestBindingStateFields?: boolean;
    runtimeModuleLoadReceiptStateFields?: boolean;
    runtimePlanCoverageStateFields?: boolean;
    includeDefaultSceneOrderedSegments?: boolean;
    includeDefaultSceneVisualPresentationMetadata?: boolean;
    sceneOrderedSegmentsStateFields?: boolean;
    sceneVisualPresentationMetadataStateFields?: boolean;
    pickupStateFields?: boolean;
    pickupWeaponSupplyStateFields?: boolean;
    providerDeepSeekAuthoritativeDraftStateFields?: boolean;
    reviewOracleFinalGateStateFields?: boolean;
    spawnEnemyWaveOrderedFields?: boolean;
    weaponDeathResetStateFields?: boolean;
    weaponRapidFireStateFields?: boolean;
    weaponSpreadShotStateFields?: boolean;
    weaponReplacementStateFields?: boolean;
  } = {}
) {
  const { plan } = buildDefaultWeaponQaPlan();
  const effectiveEventTypes = withDefaultPackageOwnedEvents(eventTypes, options);
  const observed = [
    ...(effectiveEventTypes.includes(ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE)
      ? [
          {
            capabilityId: artifactLineageNoManualPatchCapabilityId,
            probeId: ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID,
            action: 'verify_lineage',
            eventType: ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.artifactLineageNoManualPatchStateFields === false
              ? {}
              : {
                  pipelineProduced: true,
                  manualPatchDetected: false,
                  lineageVerified: true
                }),
            status: 'observed' as const,
            sourceRef: 'artifact.lineage.no_manual_patch'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE)
      ? [
          {
            capabilityId: enemyBossAttackPatternCapabilityId,
            probeId: ENEMY_BOSS_ATTACK_PATTERN_REQUIRED_PROBE_ID,
            action: 'verify_boss_attack_pattern',
            eventType: ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.enemyBossAttackPatternStateFields === false
              ? {}
              : {
                  bossAttackPatternActive: true,
                  bossAttackPhaseId: ENEMY_BOSS_ATTACK_PATTERN_PHASE_ID,
                  bossAttackPatternId: ENEMY_BOSS_ATTACK_PATTERN_PATTERN_ID,
                  bossAttackCadenceMs: ENEMY_BOSS_ATTACK_PATTERN_CADENCE_MS,
                  bossAttackTargetsPlayer: true
                }),
            status: 'observed' as const,
            sourceRef: 'runtime.boss.attack_pattern'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(ENEMY_BOSS_LIFECYCLE_EVENT_TYPE)
      ? [
          {
            capabilityId: enemyBossLifecycleCapabilityId,
            probeId: ENEMY_BOSS_LIFECYCLE_REQUIRED_PROBE_ID,
            action: 'verify_boss_lifecycle',
            eventType: ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.enemyBossLifecycleStateFields === false
              ? {}
              : {
                  bossLifecycleStarted: true,
                  bossEntityId: ENEMY_BOSS_LIFECYCLE_BOSS_ENTITY_ID,
                  bossMaxHealth: ENEMY_BOSS_LIFECYCLE_MAX_HEALTH,
                  bossHealthInitialized: true,
                  bossDefeated: true
                }),
            status: 'observed' as const,
            sourceRef: 'runtime.boss.lifecycle'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE)
      ? [
          {
            capabilityId: enemyBossPhaseTransitionCapabilityId,
            probeId: ENEMY_BOSS_PHASE_TRANSITION_REQUIRED_PROBE_ID,
            action: 'verify_boss_phase_transition',
            eventType: ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.enemyBossPhaseTransitionStateFields === false
              ? {}
              : {
                  bossPhaseTransitioned: true,
                  bossPreviousPhaseId: ENEMY_BOSS_PHASE_TRANSITION_FROM_PHASE_ID,
                  bossCurrentPhaseId: ENEMY_BOSS_PHASE_TRANSITION_TO_PHASE_ID,
                  bossHealthThresholdRatio: ENEMY_BOSS_PHASE_TRANSITION_HEALTH_THRESHOLD_RATIO,
                  bossSpeedMultiplier: ENEMY_BOSS_PHASE_TRANSITION_SPEED_MULTIPLIER,
                  bossSpeedMultiplierApplied: true
                }),
            status: 'observed' as const,
            sourceRef: 'runtime.boss.phase_transition'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(ENEMY_FIXED_TURRET_EVENT_TYPE)
      ? [
          {
            capabilityId: enemyFixedTurretCapabilityId,
            probeId: ENEMY_FIXED_TURRET_REQUIRED_PROBE_ID,
            action: 'verify_fixed_turret',
            eventType: ENEMY_FIXED_TURRET_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.enemyFixedTurretStateFields === false
              ? {}
              : {
                  fixedTurretSpawned: true,
                  fixedTurretEntityId: ENEMY_FIXED_TURRET_ENTITY_ID,
                  fixedTurretArchetypeId: ENEMY_FIXED_TURRET_ARCHETYPE_ID,
                  fixedTurretStationary: true,
                  fixedTurretTargetsPlayer: true,
                  fixedTurretProjectilePatternId: ENEMY_FIXED_TURRET_PROJECTILE_PATTERN_ID,
                  fixedTurretFireCadenceMs: ENEMY_FIXED_TURRET_FIRE_CADENCE_MS
                }),
            status: 'observed' as const,
            sourceRef: 'runtime.enemy.fixed_turret'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE)
      ? [
          {
            capabilityId: enemyFlyingRightEntryCapabilityId,
            probeId: ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID,
            action: 'verify_right_entry',
            eventType: ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.enemyFlyingRightEntryStateFields === false
              ? {}
              : {
                  flyingRightEntrySpawned: true,
                  flyingRightEntryEnemyId: ENEMY_FLYING_RIGHT_ENTRY_ENEMY_ID,
                  flyingRightEntryArchetypeId: ENEMY_FLYING_RIGHT_ENTRY_ARCHETYPE_ID,
                  flyingRightEntrySegmentId: ENEMY_FLYING_RIGHT_ENTRY_SEGMENT_ID,
                  flyingRightEntryEnteredFromRight: true,
                  flyingRightEntryEntrySide: ENEMY_FLYING_RIGHT_ENTRY_ENTRY_SIDE,
                  flyingRightEntryMovementPatternId: ENEMY_FLYING_RIGHT_ENTRY_MOVEMENT_PATTERN_ID,
                  flyingRightEntryWaveId: ENEMY_FLYING_RIGHT_ENTRY_WAVE_ID
                }),
            status: 'observed' as const,
            sourceRef: 'runtime.enemy.flying_right_entry'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(ENEMY_PATROL_INFANTRY_EVENT_TYPE)
      ? [
          {
            capabilityId: enemyPatrolInfantryCapabilityId,
            probeId: ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID,
            action: 'verify_patrol_infantry',
            eventType: ENEMY_PATROL_INFANTRY_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.enemyPatrolInfantryStateFields === false
              ? {}
              : {
                  patrolInfantrySpawned: true,
                  patrolInfantryEnemyId: ENEMY_PATROL_INFANTRY_ENEMY_ID,
                  patrolInfantryArchetypeId: ENEMY_PATROL_INFANTRY_ARCHETYPE_ID,
                  patrolInfantrySegmentId: ENEMY_PATROL_INFANTRY_SEGMENT_ID,
                  patrolInfantryGrounded: true,
                  patrolInfantryMovementPatternId: ENEMY_PATROL_INFANTRY_MOVEMENT_PATTERN_ID,
                  patrolInfantryRouteId: ENEMY_PATROL_INFANTRY_ROUTE_ID
                }),
            status: 'observed' as const,
            sourceRef: 'runtime.enemy.patrol_infantry'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE)
      ? [
          {
            capabilityId: feedbackVictoryDeclarationCapabilityId,
            probeId: FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID,
            action: 'verify_victory_declaration',
            eventType: FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.feedbackVictoryDeclarationStateFields === false
              ? {}
              : {
                  victoryDeclarationShown: true,
                  victoryDeclarationText: FEEDBACK_VICTORY_DECLARATION_TEXT,
                  victoryDeclarationTrigger: FEEDBACK_VICTORY_DECLARATION_TRIGGER,
                  victoryDeclarationOutcome: FEEDBACK_VICTORY_DECLARATION_OUTCOME,
                  victoryDeclarationObjectiveCompleted: true
                }),
            status: 'observed' as const,
            sourceRef: 'runtime.feedback.victory_declaration'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE)
      ? [
          {
            capabilityId: generationFallbackPolicyFailClosedCapabilityId,
            probeId: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID,
            action: 'verify_fail_closed_policy',
            eventType: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.generationFallbackPolicyFailClosedStateFields === false
              ? {}
              : {
                  fallbackPolicy: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_POLICY,
                  fallbackPolicyVerified: true,
                  undeclaredFallbackDetected: false,
                  fallbackOutputGenerated: false,
                  fallbackFailureCode: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_ERROR_CODE
                }),
            status: 'observed' as const,
            sourceRef: 'generation.path.fail_closed_policy'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(GOAL_BOSS_UNLOCK_EVENT_TYPE)
      ? [
          {
            capabilityId: goalBossUnlockCapabilityId,
            probeId: GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID,
            action: 'unlock_boss',
            eventType: GOAL_BOSS_UNLOCK_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.goalBossUnlockStateFields === false
              ? {}
              : {
                  wavesCleared: true,
                  clearedWaveCount: GOAL_BOSS_UNLOCK_REQUIRED_WAVE_COUNT,
                  requiredWaveCount: GOAL_BOSS_UNLOCK_REQUIRED_WAVE_COUNT,
                  bossUnlockTriggered: true,
                  bossUnlockReason: GOAL_BOSS_UNLOCK_REASON,
                  bossEncounterUnlocked: true,
                  bossUnlockWaveId: GOAL_BOSS_UNLOCK_WAVE_ID,
                  bossUnlockBossEntityId: GOAL_BOSS_UNLOCK_BOSS_ENTITY_ID
                }),
            status: 'observed' as const,
            sourceRef: 'runtime.goal.boss_unlock'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(HAZARD_FALLING_AREA_EVENT_TYPE)
      ? [
          {
            capabilityId: hazardFallingAreaCapabilityId,
            probeId: HAZARD_FALLING_AREA_REQUIRED_PROBE_ID,
            action: 'verify_falling_area',
            eventType: HAZARD_FALLING_AREA_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.hazardFallingAreaStateFields === false
              ? {}
              : {
                  fallingAreaActive: true,
                  fallingAreaHazardId: HAZARD_FALLING_AREA_HAZARD_ID,
                  fallingAreaBossPhaseId: HAZARD_FALLING_AREA_BOSS_PHASE_ID,
                  fallingAreaPatternId: HAZARD_FALLING_AREA_PATTERN_ID,
                  fallingAreaDropsFromAbove: true,
                  fallingAreaArmed: true,
                  fallingAreaDamagesPlayer: true,
                  fallingAreaDamage: HAZARD_FALLING_AREA_DAMAGE,
                  fallingAreaTelegraphMs: HAZARD_FALLING_AREA_TELEGRAPH_MS
                }),
            status: 'observed' as const,
            sourceRef: 'runtime.hazard.falling_area'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(HAZARD_TIMED_EXPLOSION_EVENT_TYPE)
      ? [
          {
            capabilityId: hazardTimedExplosionCapabilityId,
            probeId: HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID,
            action: 'verify_timed_explosion',
            eventType: HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.hazardTimedExplosionStateFields === false
              ? {}
              : {
                  timedExplosionActive: true,
                  timedExplosionHazardId: HAZARD_TIMED_EXPLOSION_HAZARD_ID,
                  timedExplosionTimerId: HAZARD_TIMED_EXPLOSION_TIMER_ID,
                  timedExplosionCountdownMs: HAZARD_TIMED_EXPLOSION_COUNTDOWN_MS,
                  timedExplosionElapsedMs: HAZARD_TIMED_EXPLOSION_COUNTDOWN_MS,
                  timedExplosionTriggerCondition: HAZARD_TIMED_EXPLOSION_TRIGGER_CONDITION,
                  timedExplosionTriggeredByTimer: true,
                  timedExplosionOccurred: true,
                  timedExplosionDamagesPlayer: true,
                  timedExplosionDamage: HAZARD_TIMED_EXPLOSION_DAMAGE,
                  timedExplosionRadius: HAZARD_TIMED_EXPLOSION_RADIUS
                }),
            status: 'observed' as const,
            sourceRef: 'runtime.hazard.timed_explosion'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(RULES_CHECKPOINT_RESTORE_EVENT_TYPE)
      ? [
          {
            capabilityId: rulesCheckpointRestoreCapabilityId,
            probeId: RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID,
            action: 'restore_checkpoint',
            eventType: RULES_CHECKPOINT_RESTORE_EVENT_TYPE,
            eventTypes: effectiveEventTypes.includes(RULES_CHECKPOINT_RESTORE_DAMAGE_EVENT_TYPE)
              ? effectiveEventTypes
              : [...effectiveEventTypes, RULES_CHECKPOINT_RESTORE_DAMAGE_EVENT_TYPE],
            ...(options.rulesCheckpointRestoreStateFields === false
              ? {}
              : {
                  checkpointRestoreTriggeredByZeroHealth: true,
                  checkpointRestoreRetryConsumed: true,
                  checkpointRestoreRetryCountBefore: RULES_CHECKPOINT_RESTORE_RETRY_COUNT_BEFORE,
                  checkpointRestoreRetryCountAfter: RULES_CHECKPOINT_RESTORE_RETRY_COUNT_AFTER,
                  checkpointRestoreNearestCheckpointSelected: true,
                  checkpointRestoreCheckpointId: RULES_CHECKPOINT_RESTORE_CHECKPOINT_ID,
                  checkpointRestoreExpectedCheckpointId: RULES_CHECKPOINT_RESTORE_CHECKPOINT_ID,
                  checkpointRestorePositionMatched: true,
                  checkpointRestorePlayerRespawned: true,
                  checkpointRestoreFailureScreenShown: false
                }),
            status: 'observed' as const,
            sourceRef: 'runtime.rules.checkpoint_restore'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(RULES_ENCOUNTER_GATE_EVENT_TYPE)
      ? [
          {
            capabilityId: rulesEncounterGateCapabilityId,
            probeId: RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID,
            action: 'close_gate',
            eventType: RULES_ENCOUNTER_GATE_EVENT_TYPE,
            eventTypes: effectiveEventTypes.includes('spawn.enemy_wave.ordered')
              ? effectiveEventTypes
              : [...effectiveEventTypes, 'spawn.enemy_wave.ordered'],
            ...(options.rulesEncounterGateStateFields === false
              ? {}
              : {
                  encounterGateClosedEntrance: true,
                  encounterGateGateId: RULES_ENCOUNTER_GATE_GATE_ID,
                  encounterGateEntranceId: RULES_ENCOUNTER_GATE_ENTRANCE_ID,
                  encounterGateClosedBeforeWaveSpawn: true,
                  encounterGateWaveSequenceBlockedUntilClosed: true,
                  encounterGateNextWaveId: RULES_ENCOUNTER_GATE_WAVE_ID,
                  encounterGateSequenceIndex: RULES_ENCOUNTER_GATE_SEQUENCE_INDEX,
                  encounterGatePlayerBacktrackingBlocked: true
                }),
            status: 'observed' as const,
            sourceRef: 'runtime.rules.encounter_gate'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(RULES_RETRY_COUNT_EVENT_TYPE)
      ? [
          {
            capabilityId: rulesRetryCountCapabilityId,
            probeId: RULES_RETRY_COUNT_REQUIRED_PROBE_ID,
            action: 'consume_retry',
            eventType: RULES_RETRY_COUNT_EVENT_TYPE,
            eventTypes: effectiveEventTypes.includes(RULES_RETRY_COUNT_DAMAGE_EVENT_TYPE)
              ? effectiveEventTypes
              : [...effectiveEventTypes, RULES_RETRY_COUNT_DAMAGE_EVENT_TYPE],
            ...(options.rulesRetryCountStateFields === false
              ? {}
              : {
                  retryCountConfigured: true,
                  retryCountInitial: RULES_RETRY_COUNT_INITIAL_RETRIES,
                  retryCountBefore: RULES_RETRY_COUNT_BEFORE,
                  retryCountAfter: RULES_RETRY_COUNT_AFTER,
                  retryCountRemaining: RULES_RETRY_COUNT_REMAINING,
                  retryCountConsumed: true,
                  retryCountDecremented: true,
                  retryCountExhausted: false,
                  retryCountFailureScreenShown: false
                }),
            status: 'observed' as const,
            sourceRef: 'runtime.rules.retry_count'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(RULES_STATE_TRANSITION_GRAPH_EVENT_TYPE)
      ? [
          {
            capabilityId: rulesStateTransitionGraphCapabilityId,
            probeId: RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID,
            action: 'verify_graph',
            eventType: RULES_STATE_TRANSITION_GRAPH_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.rulesStateTransitionGraphStateFields === false
              ? {}
              : {
                  stateTransitionGraphDeclared: true,
                  stateTransitionGraphId: RULES_STATE_TRANSITION_GRAPH_ID,
                  stateTransitionGraphStateCount: RULES_STATE_TRANSITION_GRAPH_STATE_COUNT,
                  stateTransitionGraphTransitionCount: RULES_STATE_TRANSITION_GRAPH_TRANSITION_COUNT,
                  stateTransitionGraphFromState: RULES_STATE_TRANSITION_GRAPH_FROM_STATE,
                  stateTransitionGraphToState: RULES_STATE_TRANSITION_GRAPH_TO_STATE,
                  stateTransitionGraphTrigger: RULES_STATE_TRANSITION_GRAPH_TRIGGER,
                  stateTransitionGraphTerminalStatesIncluded: true,
                  stateTransitionGraphNoImplicitFallback: true,
                  stateTransitionGraphReachabilityVerified: true
                }),
            status: 'observed' as const,
            sourceRef: 'runtime.rules.state_transition_graph'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes('camera.side_follow.active')
      ? [
          {
            capabilityId: cameraCapabilityId,
            probeId: CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID,
            action: 'move',
            eventType: 'camera.side_follow.active',
            eventTypes: effectiveEventTypes,
            status: 'observed' as const,
            sourceRef: 'qa_report.snapshot.camera.scrollX'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes('collision.platform.grounded')
      ? [
          {
            capabilityId: collisionCapabilityId,
            probeId: COLLISION_PLATFORM_REQUIRED_PROBE_ID,
            action: 'collide',
            eventType: 'collision.platform.grounded',
            eventTypes: effectiveEventTypes,
            status: 'observed' as const,
            sourceRef: 'qa_report.snapshot.player.onGround'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes('player.fired')
      ? [
          {
            capabilityId: defaultWeaponCapabilityId,
            probeId: DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID,
            action: 'fire',
            eventType: 'player.fired',
            eventTypes: effectiveEventTypes,
            status: 'observed' as const,
            sourceRef: 'qa_report.capability_runtime'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes('combat.airborne_fire.fired')
      ? [
          {
            capabilityId: airborneFireCapabilityId,
            probeId: COMBAT_AIRBORNE_FIRE_REQUIRED_PROBE_ID,
            action: 'fire',
            eventType: 'combat.airborne_fire.fired',
            eventTypes: effectiveEventTypes,
            status: 'observed' as const,
            sourceRef: 'qa_report.capability_runtime'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes('projectile.spawned')
      ? [
          {
            capabilityId: projectileCapabilityId,
            probeId: COMBAT_PROJECTILE_REQUIRED_PROBE_ID,
            action: 'fire',
            eventType: 'projectile.spawned',
            eventTypes: effectiveEventTypes,
            status: 'observed' as const,
            sourceRef: 'qa_report.capability_runtime'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes('movement.crouch.entered')
      ? [
          {
            capabilityId: crouchCapabilityId,
            probeId: MOVEMENT_CROUCH_REQUIRED_PROBE_ID,
            action: 'crouch',
            eventType: 'movement.crouch.entered',
            eventTypes: effectiveEventTypes,
            crouching: true,
            heightScale: MOVEMENT_CROUCH_HEIGHT_SCALE,
            status: 'observed' as const,
            sourceRef: 'qa_report.capability_runtime'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes('health.damage_invulnerability.blocked')
      ? [
          {
            capabilityId: damageInvulnerabilityCapabilityId,
            probeId: HEALTH_DAMAGE_INVULNERABILITY_REQUIRED_PROBE_ID,
            action: 'block_damage',
            eventType: 'health.damage_invulnerability.blocked',
            eventTypes: effectiveEventTypes,
            status: 'observed' as const,
            sourceRef: 'qa_report.capability_runtime'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes('pickup.collectible.collected')
      ? [
          {
            capabilityId: pickupCapabilityId,
            probeId: PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID,
            action: 'collect',
            eventType: 'pickup.collectible.collected',
            eventTypes: effectiveEventTypes,
            ...(options.pickupStateFields === false
              ? {}
              : {
                  pickupCollected: true,
                  pickupConsumed: true,
                  pickupStateChanged: true
                }),
            status: 'observed' as const,
            sourceRef: 'qa_report.capability_runtime'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(PICKUP_WEAPON_SUPPLY_EVENT_TYPE)
      ? [
          {
            capabilityId: pickupWeaponSupplyCapabilityId,
            probeId: PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID,
            action: 'collect_weapon_supply',
            eventType: PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.pickupWeaponSupplyStateFields === false
              ? {}
              : {
                  weaponSupplyAvailable: true,
                  weaponSupplyNodeId: PICKUP_WEAPON_SUPPLY_NODE_ID,
                  weaponSupplyPickupId: PICKUP_WEAPON_SUPPLY_PICKUP_ID,
                  weaponSupplyWeaponId: PICKUP_WEAPON_SUPPLY_WEAPON_ID,
                  weaponSupplyCollected: true,
                  weaponSupplyConsumed: true,
                  weaponSupplyGranted: true
                }),
            status: 'observed' as const,
            sourceRef: 'qa_report.capability_runtime.pickup.weapon_supply'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes('player.jumped')
      ? [
          {
            capabilityId: movementCapabilityId,
            probeId: MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID,
            action: 'jump',
            eventType: 'player.jumped',
            eventTypes: effectiveEventTypes,
            status: 'observed' as const,
            sourceRef: 'qa_report.capability_runtime'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes('spawn.static.triggered')
      ? [
          {
            capabilityId: spawnStaticCapabilityId,
            probeId: SPAWN_STATIC_REQUIRED_PROBE_ID,
            action: 'spawn',
            eventType: 'spawn.static.triggered',
            eventTypes: effectiveEventTypes,
            status: 'observed' as const,
            sourceRef: 'qa_report.snapshot.waves'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes('spawn.enemy_wave.ordered')
      ? [
          {
            capabilityId: spawnEnemyWaveCapabilityId,
            probeId: SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID,
            action: 'spawn',
            eventType: 'spawn.enemy_wave.ordered',
            eventTypes: effectiveEventTypes,
            ...(options.spawnEnemyWaveOrderedFields === false
              ? {}
              : {
                  orderedWaveSequence: true,
                  gateTriggered: true,
                  waveSpawned: true,
                  sequenceIndex: 0,
                  waveId: 'wave_approach'
                }),
            status: 'observed' as const,
            sourceRef: 'runtime_plan.side_scrolling.waves.ordered_sequence'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes('health.player_health.current')
      ? [
          {
            capabilityId: healthCapabilityId,
            probeId: HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID,
            action: 'observe',
            eventType: 'health.player_health.current',
            eventTypes: effectiveEventTypes,
            status: 'observed' as const,
            sourceRef: 'qa_report.snapshot.health'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(FIXED_PROMPT_BINDING_EVENT_TYPE)
      ? [
          {
            capabilityId: fixedPromptBindingCapabilityId,
            probeId: FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID,
            action: 'observe',
            eventType: FIXED_PROMPT_BINDING_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            status: 'observed' as const,
            sourceRef: 'target_profile.fixedPrompt.sha256'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE)
      ? [
          {
            capabilityId: profileBindingCapabilityId,
            probeId: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID,
            action: 'observe',
            eventType: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            status: 'observed' as const,
            sourceRef: 'canonical_dsl.profile.id'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_EVENT_TYPE)
      ? [
          {
            capabilityId: providerDeepSeekAuthoritativeDraftCapabilityId,
            probeId: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID,
            action: 'verify_authoritative_draft',
            eventType: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.providerDeepSeekAuthoritativeDraftStateFields === false
              ? {}
              : {
                  deepSeekAuthoritativeDraftProduced: true,
                  deepSeekProviderId: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PROVIDER_ID,
                  deepSeekDraftArtifactKind: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_ARTIFACT_KIND,
                  deepSeekDraftSchemaVersion: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_SCHEMA_VERSION,
                  deepSeekDraftNormalized: true,
                  deepSeekCanonicalSchemaVersion: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_CANONICAL_SCHEMA_VERSION,
                  deepSeekComposedSchemaHashMatched: true,
                  deepSeekCapabilityLockHashMatched: true,
                  deepSeekTrustedEvidenceRejected: true
                }),
            status: 'observed' as const,
            sourceRef: 'normalization_report.capability_game_dsl_draft'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE)
      ? [
          {
            capabilityId: reviewOracleFinalGateCapabilityId,
            probeId: REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID,
            action: 'verify_final_gate',
            eventType: REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.reviewOracleFinalGateStateFields === false ? {} : finalOracleGateStateFields()),
            status: 'observed' as const,
            sourceRef: 'oracle.final_gate.approval'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(RUNTIME_MANIFEST_BINDING_EVENT_TYPE)
      ? [
          {
            capabilityId: runtimeManifestBindingCapabilityId,
            probeId: RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID,
            action: 'verify_binding',
            eventType: RUNTIME_MANIFEST_BINDING_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.runtimeManifestBindingStateFields === false ? {} : runtimeManifestBindingStateFields()),
            status: 'observed' as const,
            sourceRef: 'runtime.manifest.binding_report'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(RUNTIME_MODULE_LOAD_RECEIPT_EVENT_TYPE)
      ? [
          {
            capabilityId: runtimeModuleLoadReceiptCapabilityId,
            probeId: RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID,
            action: 'verify_receipt',
            eventType: RUNTIME_MODULE_LOAD_RECEIPT_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.runtimeModuleLoadReceiptStateFields === false ? {} : runtimeModuleLoadReceiptStateFields()),
            status: 'observed' as const,
            sourceRef: 'runtime.module_load_receipt'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(RUNTIME_PLAN_COVERAGE_EVENT_TYPE)
      ? [
          {
            capabilityId: runtimePlanCoverageCapabilityId,
            probeId: RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID,
            action: 'verify_coverage',
            eventType: RUNTIME_PLAN_COVERAGE_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.runtimePlanCoverageStateFields === false ? {} : runtimePlanCoverageStateFields()),
            status: 'observed' as const,
            sourceRef: 'runtime.plan_coverage'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(SCENE_ORDERED_SEGMENTS_EVENT_TYPE)
      ? [
          {
            capabilityId: sceneOrderedSegmentsCapabilityId,
            probeId: SCENE_ORDERED_SEGMENTS_REQUIRED_PROBE_ID,
            action: 'verify_order',
            eventType: SCENE_ORDERED_SEGMENTS_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.sceneOrderedSegmentsStateFields === false ? {} : sceneOrderedSegmentsStateFields()),
            status: 'observed' as const,
            sourceRef: 'scene.ordered_segments'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(SCENE_VISUAL_PRESENTATION_METADATA_EVENT_TYPE)
      ? [
          {
            capabilityId: sceneVisualPresentationMetadataCapabilityId,
            probeId: SCENE_VISUAL_PRESENTATION_METADATA_REQUIRED_PROBE_ID,
            action: 'verify_visual_metadata',
            eventType: SCENE_VISUAL_PRESENTATION_METADATA_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.sceneVisualPresentationMetadataStateFields === false ? {} : sceneVisualPresentationMetadataStateFields()),
            status: 'observed' as const,
            sourceRef: 'scene.visual_presentation_metadata'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(WEAPON_DEATH_RESET_EVENT_TYPE)
      ? [
          {
            capabilityId: deathResetCapabilityId,
            probeId: WEAPON_DEATH_RESET_REQUIRED_PROBE_ID,
            action: 'restore_initial_weapon',
            eventType: WEAPON_DEATH_RESET_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.weaponDeathResetStateFields === false
              ? {}
              : {
                  weaponReset: true,
                  currentWeaponId: WEAPON_DEATH_RESET_INITIAL_WEAPON_ID,
                  initialWeaponId: WEAPON_DEATH_RESET_INITIAL_WEAPON_ID,
                  previousWeaponId: WEAPON_DEATH_RESET_NON_INITIAL_WEAPON_ID
                }),
            status: 'observed' as const,
            sourceRef: 'qa_report.capability_runtime.weapon.loadout'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(WEAPON_RAPID_FIRE_BURST_EVENT_TYPE)
      ? [
          {
            capabilityId: rapidFireCapabilityId,
            probeId: WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID,
            action: 'fire_burst',
            eventType: WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.weaponRapidFireStateFields === false
              ? {}
              : {
                  rapidFire: true,
                  cooldownMs: WEAPON_RAPID_FIRE_COOLDOWN_MS,
                  burstShotCount: WEAPON_RAPID_FIRE_BURST_SHOT_COUNT,
                  burstWindowMs: WEAPON_RAPID_FIRE_BURST_WINDOW_MS
                }),
            status: 'observed' as const,
            sourceRef: 'qa_report.capability_runtime.weapon.rapid_fire'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(WEAPON_SPREAD_SHOT_EVENT_TYPE)
      ? [
          {
            capabilityId: spreadShotCapabilityId,
            probeId: WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID,
            action: 'fire_spread',
            eventType: WEAPON_SPREAD_SHOT_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            ...(options.weaponSpreadShotStateFields === false
              ? {}
              : {
                  spreadShot: true,
                  projectileCount: WEAPON_SPREAD_SHOT_PROJECTILE_COUNT,
                  spreadArcDeg: WEAPON_SPREAD_SHOT_SPREAD_ARC_DEGREES,
                  spreadAnglesDeg: WEAPON_SPREAD_SHOT_SPREAD_ANGLES_DEGREES
                }),
            status: 'observed' as const,
            sourceRef: 'qa_report.capability_runtime.weapon.spread_shot'
          }
        ]
      : []),
    ...(effectiveEventTypes.includes(WEAPON_REPLACEMENT_RULE_EVENT_TYPE)
      ? [
          {
            capabilityId: replacementRuleCapabilityId,
            probeId: WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID,
            action: 'collect_weapon_pickup',
            eventType: WEAPON_REPLACEMENT_RULE_EVENT_TYPE,
            eventTypes: effectiveEventTypes,
            pickupCollected: true,
            ...(options.weaponReplacementStateFields === false
              ? {}
              : {
                  weaponReplaced: true,
                  previousWeaponId: WEAPON_REPLACEMENT_RULE_PREVIOUS_WEAPON_ID,
                  currentWeaponId: WEAPON_REPLACEMENT_RULE_REPLACEMENT_WEAPON_ID,
                  replacementWeaponId: WEAPON_REPLACEMENT_RULE_REPLACEMENT_WEAPON_ID
                }),
            status: 'observed' as const,
            sourceRef: 'qa_report.capability_runtime.weapon.replacement_rule'
          }
        ]
      : [])
  ];
  return evaluateCapabilityQaReport({
    plan,
    probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
      plan,
      evidence: {
        status: 'PASSED',
        observed,
        missingProbeIds: [],
        mismatches: []
      }
    })
  });
}

function withDefaultPackageOwnedEvents(
  eventTypes: readonly string[],
  options: { includeDefaultSceneOrderedSegments?: boolean; includeDefaultSceneVisualPresentationMetadata?: boolean } = {}
): readonly string[] {
  const packageOwnedEvents = [
    ...(options.includeDefaultSceneOrderedSegments === false ? [] : [SCENE_ORDERED_SEGMENTS_EVENT_TYPE]),
    ...(options.includeDefaultSceneVisualPresentationMetadata === false ? [] : [SCENE_VISUAL_PRESENTATION_METADATA_EVENT_TYPE]),
    ...(eventTypes.includes(FIXED_PROMPT_BINDING_EVENT_TYPE) || eventTypes.includes(PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE)
      ? [
          PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_EVENT_TYPE,
          REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
          RUNTIME_MANIFEST_BINDING_EVENT_TYPE,
          RUNTIME_MODULE_LOAD_RECEIPT_EVENT_TYPE,
          RUNTIME_PLAN_COVERAGE_EVENT_TYPE
        ]
      : []),
    ...(eventTypes.includes(RULES_CHECKPOINT_RESTORE_EVENT_TYPE)
      ? [RULES_ENCOUNTER_GATE_EVENT_TYPE, RULES_RETRY_COUNT_EVENT_TYPE, RULES_STATE_TRANSITION_GRAPH_EVENT_TYPE]
      : [])
  ];
  return [...eventTypes, ...packageOwnedEvents.filter((eventType) => !eventTypes.includes(eventType))];
}

function buildSingleCapabilityQaReport(input: {
  capabilityId: string;
  packageContract: GameplayCapabilityPackageContract;
  dependencyPackages?: GameplayCapabilityPackageContract[];
  additionalObserved?: readonly CapabilityRuntimeObservedProbeEvidence[];
  eventType: string;
  eventTypes?: readonly string[];
  probeId: string;
  action: string;
  sourceRef: string;
  stateFields: Record<string, unknown> | undefined;
}) {
  const packages = [...(input.dependencyPackages ?? []), input.packageContract];
  const lockReport = resolveGameplayCapabilityGraph({
    requestedCapabilities: [input.capabilityId],
    packages,
    runtimeFamily: 'phaser_2d_action_arcade.v1'
  });
  if (lockReport.lock === undefined) {
    throw new Error(`expected single capability lock, got diagnostics ${JSON.stringify(lockReport.diagnostics)}`);
  }
  const plan = buildCapabilityRuntimeQaPlan({
    profileId: 'side_scrolling_run_and_gun.v1',
    capabilityLock: lockReport.lock,
    packages
  });

  return evaluateCapabilityQaReport({
    plan,
    probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
      plan,
      evidence: {
        status: 'PASSED',
        observed: [
          ...(input.additionalObserved ?? []),
          {
            capabilityId: input.capabilityId,
            probeId: input.probeId,
            action: input.action,
            eventType: input.eventType,
            eventTypes: input.eventTypes ?? [input.eventType],
            ...input.stateFields,
            status: 'observed',
            sourceRef: input.sourceRef
          }
        ],
        missingProbeIds: [],
        mismatches: []
      }
    })
  });
}

function expectedMissingRequiredProbeBlockers(): string[] {
  return buildDefaultWeaponQaPlan().plan.requiredProbes.map((probe) => `capability_qa_report_missing_required_probe:${probe.id}`);
}

function buildDefaultWeaponQaPlan() {
  const packages = [
    createArtifactLineageNoManualPatchPackageContract(),
    createEnemyBossAttackPatternPackageContract(),
    createEnemyBossLifecyclePackageContract(),
    createEnemyBossPhaseTransitionPackageContract(),
    createEnemyFixedTurretPackageContract(),
    createEnemyFlyingRightEntryPackageContract(),
    createEnemyPatrolInfantryPackageContract(),
    createFeedbackVictoryDeclarationPackageContract(),
    createGenerationFallbackPolicyFailClosedPackageContract(),
    createGoalBossUnlockPackageContract(),
    createHazardFallingAreaPackageContract(),
    createHazardTimedExplosionPackageContract(),
    createRulesCheckpointRestorePackageContract(),
    createRulesEncounterGatePackageContract(),
    createRulesRetryCountPackageContract(),
    createRulesStateTransitionGraphPackageContract(),
    createCameraSideFollowPackageContract(),
    createCollisionPlatformPackageContract(),
    createCombatAirborneFirePackageContract(),
    createDefaultStraightSingleWeaponPackageContract(),
    createCombatProjectilePackageContract(),
    createFixedPromptBindingPackageContract(),
    createProfileDeepSeekRunAndGunValidationPackageContract(),
    createProviderDeepSeekAuthoritativeDraftPackageContract(),
    createReviewOracleFinalGatePackageContract(),
    createRuntimeManifestBindingPackageContract(),
    createRuntimeModuleLoadReceiptPackageContract(),
    createRuntimePlanCoveragePackageContract(),
    createSceneOrderedSegmentsPackageContract(),
    createSceneVisualPresentationMetadataPackageContract(),
    createWeaponDeathResetPackageContract(),
    createWeaponRapidFirePackageContract(),
    createWeaponSpreadShotPackageContract(),
    createWeaponReplacementRulePackageContract(),
    createMovementCrouchPackageContract(),
    createHealthDamageInvulnerabilityPackageContract(),
    createPickupCollectiblePackageContract(),
    createPickupWeaponSupplyPackageContract(),
    createMovementRunJumpPackageContract(),
    createSpawnEnemyWavePackageContract(),
    createSpawnStaticPackageContract(),
    createHealthPlayerHealthPointsPackageContract()
  ];
  const lockReport = resolveGameplayCapabilityGraph({
    requestedCapabilities: [
      artifactLineageNoManualPatchCapabilityId,
      enemyBossAttackPatternCapabilityId,
      enemyBossLifecycleCapabilityId,
      enemyBossPhaseTransitionCapabilityId,
      enemyFixedTurretCapabilityId,
      enemyFlyingRightEntryCapabilityId,
      enemyPatrolInfantryCapabilityId,
      feedbackVictoryDeclarationCapabilityId,
      generationFallbackPolicyFailClosedCapabilityId,
      goalBossUnlockCapabilityId,
      hazardFallingAreaCapabilityId,
      hazardTimedExplosionCapabilityId,
      rulesCheckpointRestoreCapabilityId,
      rulesEncounterGateCapabilityId,
      rulesRetryCountCapabilityId,
      rulesStateTransitionGraphCapabilityId,
      cameraCapabilityId,
      collisionCapabilityId,
      airborneFireCapabilityId,
      defaultWeaponCapabilityId,
      projectileCapabilityId,
      fixedPromptBindingCapabilityId,
      profileBindingCapabilityId,
      providerDeepSeekAuthoritativeDraftCapabilityId,
      reviewOracleFinalGateCapabilityId,
      runtimeManifestBindingCapabilityId,
      runtimeModuleLoadReceiptCapabilityId,
      runtimePlanCoverageCapabilityId,
      sceneOrderedSegmentsCapabilityId,
      sceneVisualPresentationMetadataCapabilityId,
      deathResetCapabilityId,
      rapidFireCapabilityId,
      spreadShotCapabilityId,
      replacementRuleCapabilityId,
      crouchCapabilityId,
      damageInvulnerabilityCapabilityId,
      pickupCapabilityId,
      pickupWeaponSupplyCapabilityId,
      movementCapabilityId,
      spawnEnemyWaveCapabilityId,
      spawnStaticCapabilityId,
      healthCapabilityId
    ],
    packages,
    runtimeFamily: 'phaser_2d_action_arcade.v1'
  });
  if (lockReport.lock === undefined) {
    throw new Error(`expected default weapon lock, got diagnostics ${JSON.stringify(lockReport.diagnostics)}`);
  }

  const plan = buildCapabilityRuntimeQaPlan({
    profileId: 'side_scrolling_run_and_gun.v1',
    capabilityLock: lockReport.lock,
    packages
  });
  return { packages, plan };
}

function finalOracleGateStateFields(): Record<string, unknown> {
  return {
    finalOracleGateStatus: 'approved',
    finalOracleCandidateCommitSha: 'abc1234reviewedcandidate',
    finalOracleReviewedCommitSha: 'abc1234reviewedcandidate',
    finalOracleCandidateSkillRevision: 'sha256:current-skill-digest',
    finalOracleReviewedSkillRevision: 'sha256:current-skill-digest',
    finalOracleResultId: 'oracle_result_approved_current_candidate',
    finalOracleCheckpointId: 'stage4.review_oracle_final_gate_v1.complete_supported_package_slice',
    finalOracleExpectedCheckpointId: 'stage4.review_oracle_final_gate_v1.complete_supported_package_slice',
    finalOracleP0Count: 0,
    finalOracleP1Count: 0,
    finalOracleP2Count: 0
  };
}

function runtimeManifestBindingStateFields(): Record<string, unknown> {
  return {
    runtimeManifestBound: true,
    runtimeManifestRuntimeFamily: RUNTIME_MANIFEST_BINDING_RUNTIME_FAMILY,
    runtimeManifestProfileId: RUNTIME_MANIFEST_BINDING_PROFILE_ID,
    runtimeManifestTemplateId: RUNTIME_MANIFEST_BINDING_TEMPLATE_ID,
    runtimeManifestCapabilityLockBound: true,
    runtimeManifestCapabilityId: RUNTIME_MANIFEST_BINDING_CAPABILITY_ID,
    runtimeManifestSystemId: RUNTIME_MANIFEST_BINDING_RUNTIME_SYSTEM_ID,
    runtimeManifestSystemVersion: RUNTIME_MANIFEST_BINDING_SYSTEM_VERSION,
    runtimeManifestSystemPhase: RUNTIME_MANIFEST_BINDING_SYSTEM_PHASE,
    runtimeManifestSystemDependencyCount: RUNTIME_MANIFEST_BINDING_SYSTEM_DEPENDENCY_COUNT,
    runtimeManifestLoaderPlanBound: true
  };
}

function runtimeModuleLoadReceiptStateFields(): Record<string, unknown> {
  return {
    runtimeModuleLoadReceiptLoaded: true,
    runtimeModuleLoadReceiptKind: RUNTIME_MODULE_LOAD_RECEIPT_KIND,
    runtimeModuleLoadReceiptSchemaVersion: RUNTIME_MODULE_LOAD_RECEIPT_SCHEMA_VERSION,
    runtimeModuleLoadReceiptHashPresent: true,
    runtimeModuleLoadReceiptLoadOrderCount: RUNTIME_MODULE_LOAD_RECEIPT_MIN_LOAD_ORDER_COUNT,
    runtimeModuleLoadReceiptLifecycleEventCount: RUNTIME_MODULE_LOAD_RECEIPT_MIN_LIFECYCLE_EVENT_COUNT,
    runtimeModuleLoadReceiptIssuesCount: 0,
    runtimeModuleLoadReceiptCapabilityLockHashMatched: true,
    runtimeModuleLoadReceiptRuntimeManifestHashMatched: true,
    runtimeModuleLoadReceiptRuntimePlanHashMatched: true,
    runtimeModuleLoadReceiptLoaderPlanHashMatched: true,
    runtimeModuleLoadReceiptLifecycleComplete: true
  };
}

function runtimePlanCoverageStateFields(): Record<string, unknown> {
  return {
    runtimePlanCoverageComputed: true,
    runtimePlanCoverageKind: RUNTIME_PLAN_COVERAGE_KIND,
    runtimePlanCoverageSchemaVersion: RUNTIME_PLAN_COVERAGE_SCHEMA_VERSION,
    runtimePlanCoverageProfileId: RUNTIME_PLAN_COVERAGE_PROFILE_ID,
    runtimePlanCoverageRuntimeFamily: RUNTIME_PLAN_COVERAGE_RUNTIME_FAMILY,
    runtimePlanCoverageCapabilityLockMatched: true,
    runtimePlanCoverageRequiredCapabilitiesEnumerated: true,
    runtimePlanCoveragePackageInventoryMatched: true,
    runtimePlanCoverageMissingCapabilitiesReported: true,
    runtimePlanCoverageNoUnclassifiedRequiredCapabilities: true,
    runtimePlanCoverageReportHashPresent: true
  };
}

function sceneOrderedSegmentsStateFields(): Record<string, unknown> {
  return {
    sceneOrderedSegmentsVerified: true,
    sceneOrderedSegmentsSchemaVersion: SCENE_ORDERED_SEGMENTS_SCHEMA_VERSION,
    sceneOrderedSegmentsProfileId: SCENE_ORDERED_SEGMENTS_PROFILE_ID,
    sceneOrderedSegmentsRuntimeFamily: SCENE_ORDERED_SEGMENTS_RUNTIME_FAMILY,
    sceneOrderedSegmentsSceneId: SCENE_ORDERED_SEGMENTS_SCENE_ID,
    sceneOrderedSegmentsCount: SCENE_ORDERED_SEGMENTS_COUNT,
    sceneOrderedSegmentsFirstId: SCENE_ORDERED_SEGMENTS_FIRST_ID,
    sceneOrderedSegmentsSecondId: SCENE_ORDERED_SEGMENTS_SECOND_ID,
    sceneOrderedSegmentsThirdId: SCENE_ORDERED_SEGMENTS_THIRD_ID,
    sceneOrderedSegmentsOrderMatched: true,
    sceneOrderedSegmentsContinuous: true,
    sceneOrderedSegmentsAllNamed: true,
    sceneOrderedSegmentsSceneBindingMatched: true,
    sceneOrderedSegmentsNoGaps: true
  };
}

function sceneVisualPresentationMetadataStateFields(): Record<string, unknown> {
  return {
    sceneVisualPresentationMetadataVerified: true,
    sceneVisualPresentationSchemaVersion: SCENE_VISUAL_PRESENTATION_METADATA_SCHEMA_VERSION,
    sceneVisualPresentationProfileId: SCENE_VISUAL_PRESENTATION_METADATA_PROFILE_ID,
    sceneVisualPresentationRuntimeFamily: SCENE_VISUAL_PRESENTATION_METADATA_RUNTIME_FAMILY,
    sceneVisualPresentationStyleId: SCENE_VISUAL_PRESENTATION_METADATA_STYLE_ID,
    sceneVisualPresentationStyleLabel: SCENE_VISUAL_PRESENTATION_METADATA_STYLE_LABEL,
    sceneVisualPresentationPixelArt: true,
    sceneVisualPresentationColorDepthBits: SCENE_VISUAL_PRESENTATION_METADATA_COLOR_DEPTH_BITS,
    sceneVisualPresentationOriginalityPolicy: SCENE_VISUAL_PRESENTATION_METADATA_ORIGINALITY_POLICY,
    sceneVisualPresentationAssetPlanBound: true,
    sceneVisualPresentationNoProtectedReuse: true
  };
}
