import { describe, expect, it } from 'vitest';

import {
  validateGameplayCapabilityPackage,
  validateGameplayCapabilityPackages,
  type GameplayCapabilityPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/package-contract.js';
import {
  DEFAULT_STRAIGHT_SINGLE_WEAPON_PACKAGE_REQUIRED_EVIDENCE_ID,
  DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID,
  createDefaultStraightSingleWeaponPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/default-straight-single-weapon-package.js';
import {
  DEFAULT_STRAIGHT_SINGLE_WEAPON_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/default-straight-single-weapon-runtime-module.js';
import {
  WEAPON_DEATH_RESET_PACKAGE_REQUIRED_EVIDENCE_ID,
  WEAPON_DEATH_RESET_REQUIRED_PROBE_ID,
  createWeaponDeathResetPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/weapon-death-reset-package.js';
import {
  WEAPON_DEATH_RESET_EVENT_TYPE,
  WEAPON_DEATH_RESET_INITIAL_WEAPON_ID,
  WEAPON_DEATH_RESET_NON_INITIAL_WEAPON_ID,
  WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
  WEAPON_DEATH_RESET_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/weapon-death-reset-runtime-module.js';
import {
  WEAPON_RAPID_FIRE_PACKAGE_REQUIRED_EVIDENCE_ID,
  WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID,
  createWeaponRapidFirePackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/weapon-rapid-fire-package.js';
import {
  WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
  WEAPON_RAPID_FIRE_BURST_SHOT_COUNT,
  WEAPON_RAPID_FIRE_BURST_WINDOW_MS,
  WEAPON_RAPID_FIRE_COOLDOWN_MS,
  WEAPON_RAPID_FIRE_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/weapon-rapid-fire-runtime-module.js';
import {
  WEAPON_SPREAD_SHOT_PACKAGE_REQUIRED_EVIDENCE_ID,
  WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID,
  createWeaponSpreadShotPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/weapon-spread-shot-package.js';
import {
  WEAPON_SPREAD_SHOT_EVENT_TYPE,
  WEAPON_SPREAD_SHOT_PROJECTILE_COUNT,
  WEAPON_SPREAD_SHOT_RUNTIME_SYSTEM_ID,
  WEAPON_SPREAD_SHOT_SPREAD_ARC_DEGREES,
  WEAPON_SPREAD_SHOT_SPREAD_ANGLES_DEGREES
} from '../../packages/game-dsl/src/gameplay-capabilities/weapon-spread-shot-runtime-module.js';
import {
  WEAPON_REPLACEMENT_RULE_PACKAGE_REQUIRED_EVIDENCE_ID,
  WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID,
  createWeaponReplacementRulePackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/weapon-replacement-rule-package.js';
import {
  WEAPON_REPLACEMENT_RULE_EVENT_TYPE,
  WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
  WEAPON_REPLACEMENT_RULE_PREVIOUS_WEAPON_ID,
  WEAPON_REPLACEMENT_RULE_REPLACEMENT_WEAPON_ID,
  WEAPON_REPLACEMENT_RULE_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/weapon-replacement-rule-runtime-module.js';
import {
  CAMERA_SIDE_FOLLOW_PACKAGE_REQUIRED_EVIDENCE_ID,
  CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID,
  createCameraSideFollowPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/camera-side-follow-package.js';
import {
  CAMERA_SIDE_FOLLOW_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/camera-side-follow-runtime-module.js';
import {
  CAMERA_BOUNDS_CLAMP_PACKAGE_REQUIRED_EVIDENCE_ID,
  CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID,
  createCameraBoundsClampPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/camera-bounds-clamp-package.js';
import {
  CAMERA_BOUNDS_CLAMP_EVENT_TYPE,
  CAMERA_BOUNDS_CLAMP_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/camera-bounds-clamp-runtime-module.js';
import {
  CANONICAL_SEMANTIC_PRESERVATION_PACKAGE_REQUIRED_EVIDENCE_ID,
  CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID,
  createCanonicalSemanticPreservationPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/canonical-semantic-preservation-package.js';
import {
  CANONICAL_SEMANTIC_PRESERVATION_EVENT_TYPE,
  CANONICAL_SEMANTIC_PRESERVATION_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/canonical-semantic-preservation-runtime-module.js';
import {
  COLLISION_DAMAGE_AFFINITY_MATRIX_PACKAGE_REQUIRED_EVIDENCE_ID,
  COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID,
  createCollisionDamageAffinityMatrixPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/collision-damage-affinity-matrix-package.js';
import {
  COLLISION_DAMAGE_AFFINITY_MATRIX_EVENT_TYPE,
  COLLISION_DAMAGE_AFFINITY_MATRIX_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/collision-damage-affinity-matrix-runtime-module.js';
import {
  ENEMY_BOSS_ATTACK_PATTERN_PACKAGE_REQUIRED_EVIDENCE_ID,
  ENEMY_BOSS_ATTACK_PATTERN_REQUIRED_PROBE_ID,
  createEnemyBossAttackPatternPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/enemy-boss-attack-pattern-package.js';
import {
  ENEMY_BOSS_ATTACK_PATTERN_CADENCE_MS,
  ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
  ENEMY_BOSS_ATTACK_PATTERN_PHASE_ID,
  ENEMY_BOSS_ATTACK_PATTERN_PATTERN_ID,
  ENEMY_BOSS_ATTACK_PATTERN_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/enemy-boss-attack-pattern-runtime-module.js';
import {
  ENEMY_BOSS_LIFECYCLE_PACKAGE_REQUIRED_EVIDENCE_ID,
  ENEMY_BOSS_LIFECYCLE_REQUIRED_PROBE_ID,
  createEnemyBossLifecyclePackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/enemy-boss-lifecycle-package.js';
import {
  ENEMY_BOSS_LIFECYCLE_BOSS_ENTITY_ID,
  ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
  ENEMY_BOSS_LIFECYCLE_MAX_HEALTH,
  ENEMY_BOSS_LIFECYCLE_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/enemy-boss-lifecycle-runtime-module.js';
import {
  ENEMY_BOSS_PHASE_TRANSITION_PACKAGE_REQUIRED_EVIDENCE_ID,
  ENEMY_BOSS_PHASE_TRANSITION_REQUIRED_PROBE_ID,
  createEnemyBossPhaseTransitionPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/enemy-boss-phase-transition-package.js';
import {
  ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
  ENEMY_BOSS_PHASE_TRANSITION_FROM_PHASE_ID,
  ENEMY_BOSS_PHASE_TRANSITION_HEALTH_THRESHOLD_RATIO,
  ENEMY_BOSS_PHASE_TRANSITION_RUNTIME_SYSTEM_ID,
  ENEMY_BOSS_PHASE_TRANSITION_SPEED_MULTIPLIER,
  ENEMY_BOSS_PHASE_TRANSITION_TO_PHASE_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/enemy-boss-phase-transition-runtime-module.js';
import {
  ENEMY_FIXED_TURRET_PACKAGE_REQUIRED_EVIDENCE_ID,
  ENEMY_FIXED_TURRET_REQUIRED_PROBE_ID,
  createEnemyFixedTurretPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/enemy-fixed-turret-package.js';
import {
  ENEMY_FIXED_TURRET_ARCHETYPE_ID,
  ENEMY_FIXED_TURRET_ENTITY_ID,
  ENEMY_FIXED_TURRET_EVENT_TYPE,
  ENEMY_FIXED_TURRET_FIRE_CADENCE_MS,
  ENEMY_FIXED_TURRET_PROJECTILE_PATTERN_ID,
  ENEMY_FIXED_TURRET_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/enemy-fixed-turret-runtime-module.js';
import {
  ENEMY_FLYING_RIGHT_ENTRY_PACKAGE_REQUIRED_EVIDENCE_ID,
  ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID,
  createEnemyFlyingRightEntryPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/enemy-flying-right-entry-package.js';
import {
  ENEMY_FLYING_RIGHT_ENTRY_ARCHETYPE_ID,
  ENEMY_FLYING_RIGHT_ENTRY_ENEMY_ID,
  ENEMY_FLYING_RIGHT_ENTRY_ENTRY_SIDE,
  ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
  ENEMY_FLYING_RIGHT_ENTRY_MOVEMENT_PATTERN_ID,
  ENEMY_FLYING_RIGHT_ENTRY_RUNTIME_SYSTEM_ID,
  ENEMY_FLYING_RIGHT_ENTRY_SEGMENT_ID,
  ENEMY_FLYING_RIGHT_ENTRY_WAVE_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/enemy-flying-right-entry-runtime-module.js';
import {
  ENEMY_PATROL_INFANTRY_PACKAGE_REQUIRED_EVIDENCE_ID,
  ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID,
  createEnemyPatrolInfantryPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/enemy-patrol-infantry-package.js';
import {
  ENEMY_PATROL_INFANTRY_ARCHETYPE_ID,
  ENEMY_PATROL_INFANTRY_ENEMY_ID,
  ENEMY_PATROL_INFANTRY_EVENT_TYPE,
  ENEMY_PATROL_INFANTRY_MOVEMENT_PATTERN_ID,
  ENEMY_PATROL_INFANTRY_ROUTE_ID,
  ENEMY_PATROL_INFANTRY_RUNTIME_SYSTEM_ID,
  ENEMY_PATROL_INFANTRY_SEGMENT_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/enemy-patrol-infantry-runtime-module.js';
import {
  FEEDBACK_VICTORY_DECLARATION_PACKAGE_REQUIRED_EVIDENCE_ID,
  FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID,
  createFeedbackVictoryDeclarationPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/feedback-victory-declaration-package.js';
import {
  FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
  FEEDBACK_VICTORY_DECLARATION_OUTCOME,
  FEEDBACK_VICTORY_DECLARATION_RUNTIME_SYSTEM_ID,
  FEEDBACK_VICTORY_DECLARATION_TEXT,
  FEEDBACK_VICTORY_DECLARATION_TRIGGER
} from '../../packages/game-dsl/src/gameplay-capabilities/feedback-victory-declaration-runtime-module.js';
import {
  GENERATION_FALLBACK_POLICY_FAIL_CLOSED_PACKAGE_REQUIRED_EVIDENCE_ID,
  GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID,
  createGenerationFallbackPolicyFailClosedPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/generation-fallback-policy-fail-closed-package.js';
import {
  GENERATION_FALLBACK_POLICY_FAIL_CLOSED_ERROR_CODE,
  GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
  GENERATION_FALLBACK_POLICY_FAIL_CLOSED_POLICY,
  GENERATION_FALLBACK_POLICY_FAIL_CLOSED_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/generation-fallback-policy-fail-closed-runtime-module.js';
import {
  GOAL_BOSS_UNLOCK_PACKAGE_REQUIRED_EVIDENCE_ID,
  GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID,
  createGoalBossUnlockPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/goal-boss-unlock-package.js';
import {
  GOAL_BOSS_UNLOCK_BOSS_ENTITY_ID,
  GOAL_BOSS_UNLOCK_EVENT_TYPE,
  GOAL_BOSS_UNLOCK_REASON,
  GOAL_BOSS_UNLOCK_REQUIRED_WAVE_COUNT,
  GOAL_BOSS_UNLOCK_RUNTIME_SYSTEM_ID,
  GOAL_BOSS_UNLOCK_WAVE_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/goal-boss-unlock-runtime-module.js';
import {
  HAZARD_FALLING_AREA_PACKAGE_REQUIRED_EVIDENCE_ID,
  HAZARD_FALLING_AREA_REQUIRED_PROBE_ID,
  createHazardFallingAreaPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/hazard-falling-area-package.js';
import {
  HAZARD_FALLING_AREA_BOSS_PHASE_ID,
  HAZARD_FALLING_AREA_DAMAGE,
  HAZARD_FALLING_AREA_EVENT_TYPE,
  HAZARD_FALLING_AREA_HAZARD_ID,
  HAZARD_FALLING_AREA_PATTERN_ID,
  HAZARD_FALLING_AREA_RUNTIME_SYSTEM_ID,
  HAZARD_FALLING_AREA_TELEGRAPH_MS
} from '../../packages/game-dsl/src/gameplay-capabilities/hazard-falling-area-runtime-module.js';
import {
  HAZARD_TIMED_EXPLOSION_PACKAGE_REQUIRED_EVIDENCE_ID,
  HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID,
  createHazardTimedExplosionPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/hazard-timed-explosion-package.js';
import {
  HAZARD_TIMED_EXPLOSION_COUNTDOWN_MS,
  HAZARD_TIMED_EXPLOSION_DAMAGE,
  HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
  HAZARD_TIMED_EXPLOSION_HAZARD_ID,
  HAZARD_TIMED_EXPLOSION_RADIUS,
  HAZARD_TIMED_EXPLOSION_RUNTIME_SYSTEM_ID,
  HAZARD_TIMED_EXPLOSION_TIMER_ID,
  HAZARD_TIMED_EXPLOSION_TRIGGER_CONDITION
} from '../../packages/game-dsl/src/gameplay-capabilities/hazard-timed-explosion-runtime-module.js';
import {
  RULES_CHECKPOINT_RESTORE_PACKAGE_REQUIRED_EVIDENCE_ID,
  RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID,
  createRulesCheckpointRestorePackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/rules-checkpoint-restore-package.js';
import {
  RULES_CHECKPOINT_RESTORE_CHECKPOINT_ID,
  RULES_CHECKPOINT_RESTORE_DAMAGE_EVENT_TYPE,
  RULES_CHECKPOINT_RESTORE_EVENT_TYPE,
  RULES_CHECKPOINT_RESTORE_RETRY_COUNT_AFTER,
  RULES_CHECKPOINT_RESTORE_RETRY_COUNT_BEFORE,
  RULES_CHECKPOINT_RESTORE_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/rules-checkpoint-restore-runtime-module.js';
import {
  RULES_ENCOUNTER_GATE_PACKAGE_REQUIRED_EVIDENCE_ID,
  RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID,
  createRulesEncounterGatePackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/rules-encounter-gate-package.js';
import {
  RULES_ENCOUNTER_GATE_ENTRANCE_ID,
  RULES_ENCOUNTER_GATE_EVENT_TYPE,
  RULES_ENCOUNTER_GATE_GATE_ID,
  RULES_ENCOUNTER_GATE_RUNTIME_SYSTEM_ID,
  RULES_ENCOUNTER_GATE_SEQUENCE_INDEX,
  RULES_ENCOUNTER_GATE_WAVE_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/rules-encounter-gate-runtime-module.js';
import {
  RULES_RETRY_COUNT_PACKAGE_REQUIRED_EVIDENCE_ID,
  RULES_RETRY_COUNT_REQUIRED_PROBE_ID,
  createRulesRetryCountPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/rules-retry-count-package.js';
import {
  RULES_RETRY_COUNT_AFTER,
  RULES_RETRY_COUNT_BEFORE,
  RULES_RETRY_COUNT_DAMAGE_EVENT_TYPE,
  RULES_RETRY_COUNT_EVENT_TYPE,
  RULES_RETRY_COUNT_INITIAL_RETRIES,
  RULES_RETRY_COUNT_REMAINING,
  RULES_RETRY_COUNT_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/rules-retry-count-runtime-module.js';
import {
  RULES_STATE_TRANSITION_GRAPH_PACKAGE_REQUIRED_EVIDENCE_ID,
  RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID,
  createRulesStateTransitionGraphPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/rules-state-transition-graph-package.js';
import {
  RULES_STATE_TRANSITION_GRAPH_EVENT_TYPE,
  RULES_STATE_TRANSITION_GRAPH_FROM_STATE,
  RULES_STATE_TRANSITION_GRAPH_ID,
  RULES_STATE_TRANSITION_GRAPH_RUNTIME_SYSTEM_ID,
  RULES_STATE_TRANSITION_GRAPH_STATE_COUNT,
  RULES_STATE_TRANSITION_GRAPH_TO_STATE,
  RULES_STATE_TRANSITION_GRAPH_TRANSITION_COUNT,
  RULES_STATE_TRANSITION_GRAPH_TRIGGER
} from '../../packages/game-dsl/src/gameplay-capabilities/rules-state-transition-graph-runtime-module.js';
import {
  COLLISION_PLATFORM_PACKAGE_REQUIRED_EVIDENCE_ID,
  COLLISION_PLATFORM_REQUIRED_PROBE_ID,
  createCollisionPlatformPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/collision-platform-package.js';
import {
  COLLISION_PLATFORM_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/collision-platform-runtime-module.js';
import {
  COMBAT_PROJECTILE_PACKAGE_REQUIRED_EVIDENCE_ID,
  COMBAT_PROJECTILE_REQUIRED_PROBE_ID,
  createCombatProjectilePackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/combat-projectile-package.js';
import {
  COMBAT_PROJECTILE_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/combat-projectile-runtime-module.js';
import {
  COMBAT_AIRBORNE_FIRE_PACKAGE_REQUIRED_EVIDENCE_ID,
  COMBAT_AIRBORNE_FIRE_REQUIRED_PROBE_ID,
  createCombatAirborneFirePackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/combat-airborne-fire-package.js';
import {
  COMBAT_AIRBORNE_FIRE_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/combat-airborne-fire-runtime-module.js';
import {
  MOVEMENT_CROUCH_PACKAGE_REQUIRED_EVIDENCE_ID,
  MOVEMENT_CROUCH_REQUIRED_PROBE_ID,
  createMovementCrouchPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/movement-crouch-package.js';
import {
  MOVEMENT_CROUCH_HEIGHT_SCALE,
  MOVEMENT_CROUCH_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/movement-crouch-runtime-module.js';
import {
  MOVEMENT_RUN_JUMP_PACKAGE_REQUIRED_EVIDENCE_ID,
  MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID,
  createMovementRunJumpPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/movement-run-jump-package.js';
import {
  MOVEMENT_RUN_JUMP_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/movement-run-jump-runtime-module.js';
import {
  SPAWN_STATIC_PACKAGE_REQUIRED_EVIDENCE_ID,
  SPAWN_STATIC_REQUIRED_PROBE_ID,
  createSpawnStaticPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/spawn-static-package.js';
import {
  SPAWN_STATIC_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/spawn-static-runtime-module.js';
import {
  SPAWN_ENEMY_WAVE_PACKAGE_REQUIRED_EVIDENCE_ID,
  SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID,
  createSpawnEnemyWavePackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/spawn-enemy-wave-package.js';
import {
  SPAWN_ENEMY_WAVE_ORDERED_EVENT_TYPE,
  SPAWN_ENEMY_WAVE_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/spawn-enemy-wave-runtime-module.js';
import {
  HEALTH_PLAYER_HEALTH_POINTS_PACKAGE_REQUIRED_EVIDENCE_ID,
  HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID,
  createHealthPlayerHealthPointsPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/health-player-health-points-package.js';
import {
  HEALTH_PLAYER_HEALTH_POINTS_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/health-player-health-points-runtime-module.js';
import {
  HEALTH_DAMAGE_INVULNERABILITY_PACKAGE_REQUIRED_EVIDENCE_ID,
  HEALTH_DAMAGE_INVULNERABILITY_REQUIRED_PROBE_ID,
  createHealthDamageInvulnerabilityPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/health-damage-invulnerability-package.js';
import {
  HEALTH_DAMAGE_INVULNERABILITY_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/health-damage-invulnerability-runtime-module.js';
import {
  PICKUP_COLLECTIBLE_PACKAGE_REQUIRED_EVIDENCE_ID,
  PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID,
  createPickupCollectiblePackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/pickup-collectible-package.js';
import {
  PICKUP_COLLECTIBLE_COLLECTED_EVENT_TYPE,
  PICKUP_COLLECTIBLE_RUNTIME_SYSTEM_ID,
  PICKUP_COLLECTIBLE_STATE_CHANGED_EVENT_TYPE
} from '../../packages/game-dsl/src/gameplay-capabilities/pickup-collectible-runtime-module.js';
import {
  PICKUP_WEAPON_SUPPLY_PACKAGE_REQUIRED_EVIDENCE_ID,
  PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID,
  createPickupWeaponSupplyPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/pickup-weapon-supply-package.js';
import {
  PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
  PICKUP_WEAPON_SUPPLY_NODE_ID,
  PICKUP_WEAPON_SUPPLY_PICKUP_ID,
  PICKUP_WEAPON_SUPPLY_RUNTIME_SYSTEM_ID,
  PICKUP_WEAPON_SUPPLY_WEAPON_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/pickup-weapon-supply-runtime-module.js';
import {
  FIXED_PROMPT_BINDING_PACKAGE_REQUIRED_EVIDENCE_ID,
  FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID,
  createFixedPromptBindingPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/fixed-prompt-binding-package.js';
import {
  FIXED_PROMPT_BINDING_EVENT_TYPE,
  FIXED_PROMPT_BINDING_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/fixed-prompt-binding-runtime-module.js';
import {
  PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_PACKAGE_REQUIRED_EVIDENCE_ID,
  PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID,
  createProfileDeepSeekRunAndGunValidationPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/profile-deepseek-run-and-gun-validation-package.js';
import {
  PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
  PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/profile-deepseek-run-and-gun-validation-runtime-module.js';
import {
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PACKAGE_REQUIRED_EVIDENCE_ID,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID,
  createProviderDeepSeekAuthoritativeDraftPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/provider-deepseek-authoritative-draft-package.js';
import {
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_ARTIFACT_KIND,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_CANONICAL_SCHEMA_VERSION,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_EVENT_TYPE,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PROVIDER_ID,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_RUNTIME_SYSTEM_ID,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_SCHEMA_VERSION
} from '../../packages/game-dsl/src/gameplay-capabilities/provider-deepseek-authoritative-draft-runtime-module.js';
import {
  REVIEW_ORACLE_FINAL_GATE_PACKAGE_REQUIRED_EVIDENCE_ID,
  REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID,
  createReviewOracleFinalGatePackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/review-oracle-final-gate-package.js';
import {
  REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
  REVIEW_ORACLE_FINAL_GATE_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/review-oracle-final-gate-runtime-module.js';
import {
  RUNTIME_MANIFEST_BINDING_PACKAGE_REQUIRED_EVIDENCE_ID,
  RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID,
  createRuntimeManifestBindingPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/runtime-manifest-binding-package.js';
import {
  RUNTIME_MANIFEST_BINDING_CAPABILITY_ID,
  RUNTIME_MANIFEST_BINDING_EVENT_TYPE,
  RUNTIME_MANIFEST_BINDING_PROFILE_ID,
  RUNTIME_MANIFEST_BINDING_RUNTIME_FAMILY,
  RUNTIME_MANIFEST_BINDING_RUNTIME_SYSTEM_ID,
  RUNTIME_MANIFEST_BINDING_SYSTEM_DEPENDENCY_COUNT,
  RUNTIME_MANIFEST_BINDING_SYSTEM_PHASE,
  RUNTIME_MANIFEST_BINDING_SYSTEM_VERSION,
  RUNTIME_MANIFEST_BINDING_TEMPLATE_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/runtime-manifest-binding-runtime-module.js';
import {
  RUNTIME_MODULE_LOAD_RECEIPT_PACKAGE_REQUIRED_EVIDENCE_ID,
  RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID,
  createRuntimeModuleLoadReceiptPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/runtime-module-load-receipt-package.js';
import {
  RUNTIME_MODULE_LOAD_RECEIPT_CAPABILITY_ID,
  RUNTIME_MODULE_LOAD_RECEIPT_EVENT_TYPE,
  RUNTIME_MODULE_LOAD_RECEIPT_KIND,
  RUNTIME_MODULE_LOAD_RECEIPT_MIN_LIFECYCLE_EVENT_COUNT,
  RUNTIME_MODULE_LOAD_RECEIPT_MIN_LOAD_ORDER_COUNT,
  RUNTIME_MODULE_LOAD_RECEIPT_PROFILE_ID,
  RUNTIME_MODULE_LOAD_RECEIPT_RUNTIME_FAMILY,
  RUNTIME_MODULE_LOAD_RECEIPT_RUNTIME_SYSTEM_ID,
  RUNTIME_MODULE_LOAD_RECEIPT_SCHEMA_VERSION,
  RUNTIME_MODULE_LOAD_RECEIPT_SYSTEM_PHASE,
  RUNTIME_MODULE_LOAD_RECEIPT_SYSTEM_VERSION
} from '../../packages/game-dsl/src/gameplay-capabilities/runtime-module-load-receipt-runtime-module.js';
import {
  RUNTIME_PLAN_COVERAGE_PACKAGE_REQUIRED_EVIDENCE_ID,
  RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID,
  createRuntimePlanCoveragePackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/runtime-plan-coverage-package.js';
import {
  RUNTIME_PLAN_COVERAGE_CAPABILITY_ID,
  RUNTIME_PLAN_COVERAGE_EVENT_TYPE,
  RUNTIME_PLAN_COVERAGE_KIND,
  RUNTIME_PLAN_COVERAGE_PROFILE_ID,
  RUNTIME_PLAN_COVERAGE_RUNTIME_FAMILY,
  RUNTIME_PLAN_COVERAGE_RUNTIME_SYSTEM_ID,
  RUNTIME_PLAN_COVERAGE_SCHEMA_VERSION,
  RUNTIME_PLAN_COVERAGE_SYSTEM_PHASE,
  RUNTIME_PLAN_COVERAGE_SYSTEM_VERSION
} from '../../packages/game-dsl/src/gameplay-capabilities/runtime-plan-coverage-runtime-module.js';
import {
  ARTIFACT_LINEAGE_NO_MANUAL_PATCH_PACKAGE_REQUIRED_EVIDENCE_ID,
  ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID,
  createArtifactLineageNoManualPatchPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/artifact-lineage-no-manual-patch-package.js';
import {
  ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
  ARTIFACT_LINEAGE_NO_MANUAL_PATCH_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/artifact-lineage-no-manual-patch-runtime-module.js';
import {
  ARTIFACT_NO_HIDDEN_SCRIPT_PACKAGE_REQUIRED_EVIDENCE_ID,
  ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID,
  createArtifactNoHiddenScriptPackageContract
} from '../../packages/game-dsl/src/gameplay-capabilities/artifact-no-hidden-script-package.js';
import {
  ARTIFACT_NO_HIDDEN_SCRIPT_EVENT_TYPE,
  ARTIFACT_NO_HIDDEN_SCRIPT_RUNTIME_SYSTEM_ID
} from '../../packages/game-dsl/src/gameplay-capabilities/artifact-no-hidden-script-runtime-module.js';

describe('Gameplay capability package contract', () => {
  it('accepts a complete supported package and keeps hashes deterministic', () => {
    const contract = createPackageContract();
    const first = validateGameplayCapabilityPackage(contract);
    const second = validateGameplayCapabilityPackage(structuredClone(contract));

    expect(first.status).toBe('valid');
    expect(first.completeness).toBe('COMPLETE_SUPPORTED');
    expect(first.supportEligible).toBe(true);
    expect(first.manifestHash).toMatch(/^fnv1a_[a-f0-9]{8}$/);
    expect(first.packageHash).toBe(second.packageHash);
  });

  it('accepts the default straight single weapon package prerequisite contract', () => {
    const contract = createDefaultStraightSingleWeaponPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'weapon.default_straight_single.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([DEFAULT_STRAIGHT_SINGLE_WEAPON_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: DEFAULT_STRAIGHT_SINGLE_WEAPON_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'weapon.default_straight_single.v1',
      severity: 'required',
      observations: expect.arrayContaining([expect.objectContaining({ runtimeSystemId: DEFAULT_STRAIGHT_SINGLE_WEAPON_RUNTIME_SYSTEM_ID })])
    });
  });

  it('accepts the weapon death reset package-owned QA contract', () => {
    const contract = createWeaponDeathResetPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === WEAPON_DEATH_RESET_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'weapon.death_reset.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([WEAPON_DEATH_RESET_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: WEAPON_DEATH_RESET_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'weapon.death_reset.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
          parameters: expect.objectContaining({
            previousWeaponId: WEAPON_DEATH_RESET_NON_INITIAL_WEAPON_ID,
            initialWeaponId: WEAPON_DEATH_RESET_INITIAL_WEAPON_ID
          })
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: WEAPON_DEATH_RESET_RUNTIME_SYSTEM_ID,
          ref: WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE
        }),
        expect.objectContaining({
          kind: 'state_probe',
          runtimeSystemId: WEAPON_DEATH_RESET_RUNTIME_SYSTEM_ID,
          ref: WEAPON_DEATH_RESET_EVENT_TYPE
        })
      ]
    });
  });

  it('accepts the weapon rapid fire package-owned QA contract', () => {
    const contract = createWeaponRapidFirePackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'weapon.rapid_fire.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([WEAPON_RAPID_FIRE_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: WEAPON_RAPID_FIRE_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'weapon.rapid_fire.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
          parameters: expect.objectContaining({
            cooldownMs: WEAPON_RAPID_FIRE_COOLDOWN_MS,
            burstShotCount: WEAPON_RAPID_FIRE_BURST_SHOT_COUNT,
            burstWindowMs: WEAPON_RAPID_FIRE_BURST_WINDOW_MS
          })
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'state_probe',
          runtimeSystemId: WEAPON_RAPID_FIRE_RUNTIME_SYSTEM_ID,
          ref: WEAPON_RAPID_FIRE_BURST_EVENT_TYPE
        })
      ]
    });
  });

  it('accepts the weapon spread shot package-owned QA contract', () => {
    const contract = createWeaponSpreadShotPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'weapon.spread_shot.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([WEAPON_SPREAD_SHOT_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: WEAPON_SPREAD_SHOT_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'weapon.spread_shot.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: WEAPON_SPREAD_SHOT_EVENT_TYPE,
          parameters: expect.objectContaining({
            projectileCount: WEAPON_SPREAD_SHOT_PROJECTILE_COUNT,
            spreadArcDeg: WEAPON_SPREAD_SHOT_SPREAD_ARC_DEGREES,
            spreadAnglesDeg: WEAPON_SPREAD_SHOT_SPREAD_ANGLES_DEGREES
          })
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'state_probe',
          runtimeSystemId: WEAPON_SPREAD_SHOT_RUNTIME_SYSTEM_ID,
          ref: WEAPON_SPREAD_SHOT_EVENT_TYPE
        })
      ]
    });
  });

  it('accepts the weapon replacement rule package-owned QA contract', () => {
    const contract = createWeaponReplacementRulePackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'weapon.replacement_rule.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([WEAPON_REPLACEMENT_RULE_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: WEAPON_REPLACEMENT_RULE_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'weapon.replacement_rule.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
          parameters: expect.objectContaining({
            previousWeaponId: WEAPON_REPLACEMENT_RULE_PREVIOUS_WEAPON_ID,
            replacementWeaponId: WEAPON_REPLACEMENT_RULE_REPLACEMENT_WEAPON_ID
          })
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: WEAPON_REPLACEMENT_RULE_RUNTIME_SYSTEM_ID,
          ref: WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE
        }),
        expect.objectContaining({
          kind: 'state_probe',
          runtimeSystemId: WEAPON_REPLACEMENT_RULE_RUNTIME_SYSTEM_ID,
          ref: WEAPON_REPLACEMENT_RULE_EVENT_TYPE
        })
      ]
    });
  });

  it('accepts the camera side follow package-owned QA contract', () => {
    const contract = createCameraSideFollowPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'camera.side_follow.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([CAMERA_SIDE_FOLLOW_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: CAMERA_SIDE_FOLLOW_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'camera.side_follow.v1',
      severity: 'required',
      observations: [expect.objectContaining({ kind: 'camera_scroll', runtimeSystemId: CAMERA_SIDE_FOLLOW_RUNTIME_SYSTEM_ID, ref: 'camera.side_follow.active' })]
    });
  });

  it('accepts the camera bounds-clamp package-owned QA contract', () => {
    const contract = createCameraBoundsClampPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'camera.bounds_clamp.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([CAMERA_BOUNDS_CLAMP_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: CAMERA_BOUNDS_CLAMP_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'camera.bounds_clamp.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: CAMERA_BOUNDS_CLAMP_EVENT_TYPE,
          parameters: expect.objectContaining({
            boundaryPolicy: 'world_bounds',
            clampRequired: true
          })
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'camera_scroll',
          runtimeSystemId: CAMERA_BOUNDS_CLAMP_RUNTIME_SYSTEM_ID,
          ref: CAMERA_BOUNDS_CLAMP_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID}.assertion.bounds_clamped`,
          expected: {
            cameraWithinWorldBounds: true,
            leftBoundaryClamped: true,
            rightBoundaryClamped: true
          }
        })
      ]
    });
  });

  it('accepts the canonical semantic-preservation package-owned QA contract', () => {
    const contract = createCanonicalSemanticPreservationPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'canonical.semantic_preservation.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([CANONICAL_SEMANTIC_PRESERVATION_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: CANONICAL_SEMANTIC_PRESERVATION_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'canonical.semantic_preservation.v1',
      severity: 'required',
      actions: [expect.objectContaining({ target: CANONICAL_SEMANTIC_PRESERVATION_EVENT_TYPE })],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: CANONICAL_SEMANTIC_PRESERVATION_RUNTIME_SYSTEM_ID,
          ref: CANONICAL_SEMANTIC_PRESERVATION_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID}.assertion.semantic_preserved`,
          expected: {
            canonicalHashMatched: true,
            semanticIntentPreserved: true,
            droppedCanonicalNodes: false
          }
        })
      ]
    });
  });

  it('accepts the collision damage-affinity-matrix package-owned QA contract', () => {
    const contract = createCollisionDamageAffinityMatrixPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'collision.damage_affinity_matrix.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([COLLISION_DAMAGE_AFFINITY_MATRIX_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: COLLISION_DAMAGE_AFFINITY_MATRIX_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'collision.damage_affinity_matrix.v1',
      severity: 'required',
      actions: [expect.objectContaining({ target: COLLISION_DAMAGE_AFFINITY_MATRIX_EVENT_TYPE })],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: COLLISION_DAMAGE_AFFINITY_MATRIX_RUNTIME_SYSTEM_ID,
          ref: COLLISION_DAMAGE_AFFINITY_MATRIX_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID}.assertion.affinity_matrix_enforced`,
          expected: {
            playerProjectilesDamageEnemies: true,
            playerProjectilesDamagePlayer: false,
            enemyProjectilesDamagePlayer: true,
            enemyProjectilesDamageEnemies: false,
            hazardsDamagePlayer: true,
            hazardsDamageEnemies: false
          }
        })
      ]
    });
  });

  it('accepts the enemy boss attack-pattern package-owned QA contract', () => {
    const contract = createEnemyBossAttackPatternPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === ENEMY_BOSS_ATTACK_PATTERN_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'enemy.boss_attack_pattern.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([ENEMY_BOSS_ATTACK_PATTERN_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: ENEMY_BOSS_ATTACK_PATTERN_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'enemy.boss_attack_pattern.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
          parameters: expect.objectContaining({
            phaseId: ENEMY_BOSS_ATTACK_PATTERN_PHASE_ID,
            patternId: ENEMY_BOSS_ATTACK_PATTERN_PATTERN_ID,
            cadenceMs: ENEMY_BOSS_ATTACK_PATTERN_CADENCE_MS,
            targetsPlayer: true
          })
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: ENEMY_BOSS_ATTACK_PATTERN_RUNTIME_SYSTEM_ID,
          ref: ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${ENEMY_BOSS_ATTACK_PATTERN_REQUIRED_PROBE_ID}.assertion.pattern_state_verified`,
          expected: {
            bossAttackPatternActive: true,
            bossAttackPhaseId: ENEMY_BOSS_ATTACK_PATTERN_PHASE_ID,
            bossAttackPatternId: ENEMY_BOSS_ATTACK_PATTERN_PATTERN_ID,
            bossAttackCadenceMs: ENEMY_BOSS_ATTACK_PATTERN_CADENCE_MS,
            bossAttackTargetsPlayer: true
          }
        })
      ]
    });
  });

  it('accepts the enemy boss lifecycle package-owned QA contract', () => {
    const contract = createEnemyBossLifecyclePackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === ENEMY_BOSS_LIFECYCLE_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'enemy.boss_lifecycle.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([ENEMY_BOSS_LIFECYCLE_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: ENEMY_BOSS_LIFECYCLE_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'enemy.boss_lifecycle.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
          parameters: expect.objectContaining({
            bossEntityId: ENEMY_BOSS_LIFECYCLE_BOSS_ENTITY_ID,
            maxHealth: ENEMY_BOSS_LIFECYCLE_MAX_HEALTH,
            defeated: true
          })
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: ENEMY_BOSS_LIFECYCLE_RUNTIME_SYSTEM_ID,
          ref: ENEMY_BOSS_LIFECYCLE_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${ENEMY_BOSS_LIFECYCLE_REQUIRED_PROBE_ID}.assertion.lifecycle_verified`,
          expected: {
            bossLifecycleStarted: true,
            bossEntityId: ENEMY_BOSS_LIFECYCLE_BOSS_ENTITY_ID,
            bossMaxHealth: ENEMY_BOSS_LIFECYCLE_MAX_HEALTH,
            bossHealthInitialized: true,
            bossDefeated: true
          }
        })
      ]
    });
  });

  it('accepts the enemy boss phase-transition package-owned QA contract', () => {
    const contract = createEnemyBossPhaseTransitionPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === ENEMY_BOSS_PHASE_TRANSITION_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'enemy.boss_phase_transition.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([ENEMY_BOSS_PHASE_TRANSITION_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: ENEMY_BOSS_PHASE_TRANSITION_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'enemy.boss_phase_transition.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
          parameters: expect.objectContaining({
            fromPhaseId: ENEMY_BOSS_PHASE_TRANSITION_FROM_PHASE_ID,
            toPhaseId: ENEMY_BOSS_PHASE_TRANSITION_TO_PHASE_ID,
            healthThresholdRatio: ENEMY_BOSS_PHASE_TRANSITION_HEALTH_THRESHOLD_RATIO,
            speedMultiplier: ENEMY_BOSS_PHASE_TRANSITION_SPEED_MULTIPLIER
          })
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: ENEMY_BOSS_PHASE_TRANSITION_RUNTIME_SYSTEM_ID,
          ref: ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${ENEMY_BOSS_PHASE_TRANSITION_REQUIRED_PROBE_ID}.assertion.phase_transition_verified`,
          expected: {
            bossPhaseTransitioned: true,
            bossPreviousPhaseId: ENEMY_BOSS_PHASE_TRANSITION_FROM_PHASE_ID,
            bossCurrentPhaseId: ENEMY_BOSS_PHASE_TRANSITION_TO_PHASE_ID,
            bossHealthThresholdRatio: ENEMY_BOSS_PHASE_TRANSITION_HEALTH_THRESHOLD_RATIO,
            bossSpeedMultiplier: ENEMY_BOSS_PHASE_TRANSITION_SPEED_MULTIPLIER,
            bossSpeedMultiplierApplied: true
          }
        })
      ]
    });
  });

  it('accepts the enemy fixed-turret package-owned QA contract', () => {
    const contract = createEnemyFixedTurretPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === ENEMY_FIXED_TURRET_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'enemy.fixed_turret.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([ENEMY_FIXED_TURRET_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: ENEMY_FIXED_TURRET_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'enemy.fixed_turret.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: ENEMY_FIXED_TURRET_EVENT_TYPE,
          parameters: expect.objectContaining({
            turretEntityId: ENEMY_FIXED_TURRET_ENTITY_ID,
            turretArchetypeId: ENEMY_FIXED_TURRET_ARCHETYPE_ID,
            projectilePatternId: ENEMY_FIXED_TURRET_PROJECTILE_PATTERN_ID,
            fireCadenceMs: ENEMY_FIXED_TURRET_FIRE_CADENCE_MS
          })
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: ENEMY_FIXED_TURRET_RUNTIME_SYSTEM_ID,
          ref: ENEMY_FIXED_TURRET_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${ENEMY_FIXED_TURRET_REQUIRED_PROBE_ID}.assertion.fixed_turret_verified`,
          expected: {
            fixedTurretSpawned: true,
            fixedTurretEntityId: ENEMY_FIXED_TURRET_ENTITY_ID,
            fixedTurretArchetypeId: ENEMY_FIXED_TURRET_ARCHETYPE_ID,
            fixedTurretStationary: true,
            fixedTurretTargetsPlayer: true,
            fixedTurretProjectilePatternId: ENEMY_FIXED_TURRET_PROJECTILE_PATTERN_ID,
            fixedTurretFireCadenceMs: ENEMY_FIXED_TURRET_FIRE_CADENCE_MS
          }
        })
      ]
    });
  });

  it('accepts the enemy flying-right-entry package-owned QA contract', () => {
    const contract = createEnemyFlyingRightEntryPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'enemy.flying_right_entry.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([ENEMY_FLYING_RIGHT_ENTRY_RUNTIME_SYSTEM_ID]);
    expect(contract.dependencies).toEqual([{ capabilityId: 'spawn.enemy_wave.v1', range: '^v1' }]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: ENEMY_FLYING_RIGHT_ENTRY_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'enemy.flying_right_entry.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
          parameters: expect.objectContaining({
            enemyId: ENEMY_FLYING_RIGHT_ENTRY_ENEMY_ID,
            archetypeId: ENEMY_FLYING_RIGHT_ENTRY_ARCHETYPE_ID,
            segmentId: ENEMY_FLYING_RIGHT_ENTRY_SEGMENT_ID,
            entrySide: ENEMY_FLYING_RIGHT_ENTRY_ENTRY_SIDE,
            movementPatternId: ENEMY_FLYING_RIGHT_ENTRY_MOVEMENT_PATTERN_ID,
            waveId: ENEMY_FLYING_RIGHT_ENTRY_WAVE_ID
          })
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: ENEMY_FLYING_RIGHT_ENTRY_RUNTIME_SYSTEM_ID,
          ref: ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID}.assertion.right_entry_verified`,
          expected: {
            flyingRightEntrySpawned: true,
            flyingRightEntryEnemyId: ENEMY_FLYING_RIGHT_ENTRY_ENEMY_ID,
            flyingRightEntryArchetypeId: ENEMY_FLYING_RIGHT_ENTRY_ARCHETYPE_ID,
            flyingRightEntrySegmentId: ENEMY_FLYING_RIGHT_ENTRY_SEGMENT_ID,
            flyingRightEntryEnteredFromRight: true,
            flyingRightEntryEntrySide: ENEMY_FLYING_RIGHT_ENTRY_ENTRY_SIDE,
            flyingRightEntryMovementPatternId: ENEMY_FLYING_RIGHT_ENTRY_MOVEMENT_PATTERN_ID,
            flyingRightEntryWaveId: ENEMY_FLYING_RIGHT_ENTRY_WAVE_ID
          }
        })
      ]
    });
  });

  it('accepts the enemy patrol-infantry package-owned QA contract', () => {
    const contract = createEnemyPatrolInfantryPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'enemy.patrol_infantry.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([ENEMY_PATROL_INFANTRY_RUNTIME_SYSTEM_ID]);
    expect(contract.dependencies).toEqual([{ capabilityId: 'spawn.enemy_wave.v1', range: '^v1' }]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: ENEMY_PATROL_INFANTRY_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'enemy.patrol_infantry.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: ENEMY_PATROL_INFANTRY_EVENT_TYPE,
          parameters: expect.objectContaining({
            enemyId: ENEMY_PATROL_INFANTRY_ENEMY_ID,
            archetypeId: ENEMY_PATROL_INFANTRY_ARCHETYPE_ID,
            segmentId: ENEMY_PATROL_INFANTRY_SEGMENT_ID,
            movementPatternId: ENEMY_PATROL_INFANTRY_MOVEMENT_PATTERN_ID,
            routeId: ENEMY_PATROL_INFANTRY_ROUTE_ID
          })
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: ENEMY_PATROL_INFANTRY_RUNTIME_SYSTEM_ID,
          ref: ENEMY_PATROL_INFANTRY_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID}.assertion.patrol_infantry_verified`,
          expected: {
            patrolInfantrySpawned: true,
            patrolInfantryEnemyId: ENEMY_PATROL_INFANTRY_ENEMY_ID,
            patrolInfantryArchetypeId: ENEMY_PATROL_INFANTRY_ARCHETYPE_ID,
            patrolInfantrySegmentId: ENEMY_PATROL_INFANTRY_SEGMENT_ID,
            patrolInfantryGrounded: true,
            patrolInfantryMovementPatternId: ENEMY_PATROL_INFANTRY_MOVEMENT_PATTERN_ID,
            patrolInfantryRouteId: ENEMY_PATROL_INFANTRY_ROUTE_ID
          }
        })
      ]
    });
  });

  it('accepts the feedback victory-declaration package-owned QA contract', () => {
    const contract = createFeedbackVictoryDeclarationPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'feedback.victory_declaration.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([FEEDBACK_VICTORY_DECLARATION_RUNTIME_SYSTEM_ID]);
    expect(contract.dependencies).toEqual([{ capabilityId: 'enemy.boss_lifecycle.v1', range: '^v1' }]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: FEEDBACK_VICTORY_DECLARATION_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'feedback.victory_declaration.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
          parameters: expect.objectContaining({
            trigger: FEEDBACK_VICTORY_DECLARATION_TRIGGER,
            outcome: FEEDBACK_VICTORY_DECLARATION_OUTCOME,
            declarationText: FEEDBACK_VICTORY_DECLARATION_TEXT
          })
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: FEEDBACK_VICTORY_DECLARATION_RUNTIME_SYSTEM_ID,
          ref: FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID}.assertion.victory_declaration_verified`,
          expected: {
            victoryDeclarationShown: true,
            victoryDeclarationText: FEEDBACK_VICTORY_DECLARATION_TEXT,
            victoryDeclarationTrigger: FEEDBACK_VICTORY_DECLARATION_TRIGGER,
            victoryDeclarationOutcome: FEEDBACK_VICTORY_DECLARATION_OUTCOME,
            victoryDeclarationObjectiveCompleted: true
          }
        })
      ]
    });
  });

  it('accepts the generation fallback fail-closed package-owned QA contract', () => {
    const contract = createGenerationFallbackPolicyFailClosedPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'generation.fallback_policy_fail_closed.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([GENERATION_FALLBACK_POLICY_FAIL_CLOSED_RUNTIME_SYSTEM_ID]);
    expect(contract.render.fallbackPolicy).toBe('not_applicable');
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'generation.fallback_policy_fail_closed.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
          parameters: expect.objectContaining({
            source: 'generation_path_receipt',
            fallbackPolicy: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_POLICY
          })
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_RUNTIME_SYSTEM_ID,
          ref: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID}.assertion.fail_closed_policy`,
          expected: {
            fallbackPolicy: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_POLICY,
            fallbackPolicyVerified: true,
            undeclaredFallbackDetected: false,
            fallbackOutputGenerated: false,
            fallbackFailureCode: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_ERROR_CODE
          }
        })
      ]
    });
  });

  it('accepts the goal boss unlock package-owned QA contract', () => {
    const contract = createGoalBossUnlockPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'goal.boss_unlock.v1'
    });
    expect(contract.runtime.systems).toEqual([
      {
        id: GOAL_BOSS_UNLOCK_RUNTIME_SYSTEM_ID,
        version: 'v1',
        phase: 'gameplay',
        dependencies: ['spawn.enemy_wave', 'enemy.boss_lifecycle']
      }
    ]);
    expect(contract.dependencies.map((dependency) => dependency.capabilityId)).toEqual(['spawn.enemy_wave.v1', 'enemy.boss_lifecycle.v1']);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: GOAL_BOSS_UNLOCK_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'goal.boss_unlock.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: GOAL_BOSS_UNLOCK_EVENT_TYPE,
          parameters: {
            waveId: GOAL_BOSS_UNLOCK_WAVE_ID,
            bossEntityId: GOAL_BOSS_UNLOCK_BOSS_ENTITY_ID,
            unlockReason: GOAL_BOSS_UNLOCK_REASON
          }
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: GOAL_BOSS_UNLOCK_RUNTIME_SYSTEM_ID,
          ref: GOAL_BOSS_UNLOCK_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID}.assertion.boss_unlock_verified`,
          expected: {
            wavesCleared: true,
            clearedWaveCount: GOAL_BOSS_UNLOCK_REQUIRED_WAVE_COUNT,
            requiredWaveCount: GOAL_BOSS_UNLOCK_REQUIRED_WAVE_COUNT,
            bossUnlockTriggered: true,
            bossUnlockReason: GOAL_BOSS_UNLOCK_REASON,
            bossEncounterUnlocked: true,
            bossUnlockWaveId: GOAL_BOSS_UNLOCK_WAVE_ID,
            bossUnlockBossEntityId: GOAL_BOSS_UNLOCK_BOSS_ENTITY_ID
          }
        })
      ]
    });
  });

  it('accepts the hazard falling area package-owned QA contract', () => {
    const contract = createHazardFallingAreaPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === HAZARD_FALLING_AREA_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'hazard.falling_area.v1'
    });
    expect(contract.runtime.systems).toEqual([
      {
        id: HAZARD_FALLING_AREA_RUNTIME_SYSTEM_ID,
        version: 'v1',
        phase: 'gameplay',
        dependencies: ['enemy.boss_phase_transition', 'collision.damage_affinity_matrix']
      }
    ]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: HAZARD_FALLING_AREA_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'hazard.falling_area.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: HAZARD_FALLING_AREA_EVENT_TYPE,
          parameters: {
            hazardId: HAZARD_FALLING_AREA_HAZARD_ID,
            bossPhaseId: HAZARD_FALLING_AREA_BOSS_PHASE_ID,
            patternId: HAZARD_FALLING_AREA_PATTERN_ID,
            dropsFromAbove: true,
            damage: HAZARD_FALLING_AREA_DAMAGE
          }
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: HAZARD_FALLING_AREA_RUNTIME_SYSTEM_ID,
          ref: HAZARD_FALLING_AREA_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${HAZARD_FALLING_AREA_REQUIRED_PROBE_ID}.assertion.falling_area_verified`,
          expected: {
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
        })
      ]
    });
  });

  it('accepts the hazard timed explosion package-owned QA contract', () => {
    const contract = createHazardTimedExplosionPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'hazard.timed_explosion.v1'
    });
    expect(contract.runtime.systems).toEqual([
      {
        id: HAZARD_TIMED_EXPLOSION_RUNTIME_SYSTEM_ID,
        version: 'v1',
        phase: 'gameplay',
        dependencies: ['collision.damage_affinity_matrix']
      }
    ]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: HAZARD_TIMED_EXPLOSION_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'hazard.timed_explosion.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
          parameters: {
            hazardId: HAZARD_TIMED_EXPLOSION_HAZARD_ID,
            timerId: HAZARD_TIMED_EXPLOSION_TIMER_ID,
            countdownMs: HAZARD_TIMED_EXPLOSION_COUNTDOWN_MS,
            triggerCondition: HAZARD_TIMED_EXPLOSION_TRIGGER_CONDITION,
            damage: HAZARD_TIMED_EXPLOSION_DAMAGE,
            radius: HAZARD_TIMED_EXPLOSION_RADIUS
          }
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: HAZARD_TIMED_EXPLOSION_RUNTIME_SYSTEM_ID,
          ref: HAZARD_TIMED_EXPLOSION_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID}.assertion.timed_explosion_verified`,
          expected: {
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
        })
      ]
    });
  });

  it('accepts the rules checkpoint restore package-owned QA contract', () => {
    const contract = createRulesCheckpointRestorePackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'rules.checkpoint_restore.v1'
    });
    expect(contract.runtime.systems).toEqual([
      {
        id: RULES_CHECKPOINT_RESTORE_RUNTIME_SYSTEM_ID,
        version: 'v1',
        phase: 'gameplay',
        dependencies: ['health.player_health_points', 'checkpoint_or_lives_system']
      }
    ]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: RULES_CHECKPOINT_RESTORE_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'rules.checkpoint_restore.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: RULES_CHECKPOINT_RESTORE_DAMAGE_EVENT_TYPE,
          parameters: {
            damageEvent: RULES_CHECKPOINT_RESTORE_DAMAGE_EVENT_TYPE,
            retryCountBefore: RULES_CHECKPOINT_RESTORE_RETRY_COUNT_BEFORE,
            retryCountAfter: RULES_CHECKPOINT_RESTORE_RETRY_COUNT_AFTER,
            expectedCheckpointId: RULES_CHECKPOINT_RESTORE_CHECKPOINT_ID
          }
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: RULES_CHECKPOINT_RESTORE_RUNTIME_SYSTEM_ID,
          ref: RULES_CHECKPOINT_RESTORE_DAMAGE_EVENT_TYPE
        }),
        expect.objectContaining({
          kind: 'state_probe',
          runtimeSystemId: RULES_CHECKPOINT_RESTORE_RUNTIME_SYSTEM_ID,
          ref: RULES_CHECKPOINT_RESTORE_EVENT_TYPE
        })
      ],
      assertions: expect.arrayContaining([
        expect.objectContaining({
          id: `${RULES_CHECKPOINT_RESTORE_REQUIRED_PROBE_ID}.assertion.restored_checkpoint`,
          expected: {
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
        })
      ])
    });
  });

  it('accepts the rules encounter gate package-owned QA contract', () => {
    const contract = createRulesEncounterGatePackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'rules.encounter_gate.v1'
    });
    expect(contract.runtime.systems).toEqual([
      {
        id: RULES_ENCOUNTER_GATE_RUNTIME_SYSTEM_ID,
        version: 'v1',
        phase: 'gameplay',
        dependencies: ['spawn.enemy_wave']
      }
    ]);
    expect(contract.dependencies).toEqual([{ capabilityId: 'spawn.enemy_wave.v1', range: '^v1' }]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: RULES_ENCOUNTER_GATE_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'rules.encounter_gate.v1',
      severity: 'required',
      observations: expect.arrayContaining([
        expect.objectContaining({
          kind: 'state_probe',
          runtimeSystemId: RULES_ENCOUNTER_GATE_RUNTIME_SYSTEM_ID,
          ref: RULES_ENCOUNTER_GATE_EVENT_TYPE
        }),
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: RULES_ENCOUNTER_GATE_RUNTIME_SYSTEM_ID,
          ref: 'spawn.enemy_wave.ordered'
        })
      ]),
      assertions: [
        expect.objectContaining({
          id: `${RULES_ENCOUNTER_GATE_REQUIRED_PROBE_ID}.assertion.closed_before_wave`,
          expected: {
            encounterGateClosedEntrance: true,
            encounterGateGateId: RULES_ENCOUNTER_GATE_GATE_ID,
            encounterGateEntranceId: RULES_ENCOUNTER_GATE_ENTRANCE_ID,
            encounterGateClosedBeforeWaveSpawn: true,
            encounterGateWaveSequenceBlockedUntilClosed: true,
            encounterGateNextWaveId: RULES_ENCOUNTER_GATE_WAVE_ID,
            encounterGateSequenceIndex: RULES_ENCOUNTER_GATE_SEQUENCE_INDEX,
            encounterGatePlayerBacktrackingBlocked: true
          }
        })
      ]
    });
  });

  it('accepts the rules retry count package-owned QA contract', () => {
    const contract = createRulesRetryCountPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === RULES_RETRY_COUNT_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'rules.retry_count.v1'
    });
    expect(contract.runtime.systems).toEqual([
      {
        id: RULES_RETRY_COUNT_RUNTIME_SYSTEM_ID,
        version: 'v1',
        phase: 'gameplay',
        dependencies: ['health.player_health_points', 'checkpoint_or_lives_system']
      }
    ]);
    expect(contract.dependencies).toEqual([{ capabilityId: 'health.player_health_points.v1', range: '^v1' }]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: RULES_RETRY_COUNT_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'rules.retry_count.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: RULES_RETRY_COUNT_DAMAGE_EVENT_TYPE,
          parameters: {
            damageEvent: RULES_RETRY_COUNT_DAMAGE_EVENT_TYPE,
            initialRetries: RULES_RETRY_COUNT_INITIAL_RETRIES,
            retryCountBefore: RULES_RETRY_COUNT_BEFORE,
            retryCountAfter: RULES_RETRY_COUNT_AFTER
          }
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: RULES_RETRY_COUNT_RUNTIME_SYSTEM_ID,
          ref: RULES_RETRY_COUNT_DAMAGE_EVENT_TYPE
        }),
        expect.objectContaining({
          kind: 'state_probe',
          runtimeSystemId: RULES_RETRY_COUNT_RUNTIME_SYSTEM_ID,
          ref: RULES_RETRY_COUNT_EVENT_TYPE
        })
      ],
      assertions: expect.arrayContaining([
        expect.objectContaining({
          id: `${RULES_RETRY_COUNT_REQUIRED_PROBE_ID}.assertion.retry_consumed`,
          expected: {
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
        })
      ])
    });
  });

  it('accepts the rules state transition graph package-owned QA contract', () => {
    const contract = createRulesStateTransitionGraphPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'rules.state_transition_graph.v1'
    });
    expect(contract.runtime.systems).toEqual([
      {
        id: RULES_STATE_TRANSITION_GRAPH_RUNTIME_SYSTEM_ID,
        version: 'v1',
        phase: 'gameplay',
        dependencies: ['runtime_plan', 'win_lose_system']
      }
    ]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: RULES_STATE_TRANSITION_GRAPH_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'rules.state_transition_graph.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: RULES_STATE_TRANSITION_GRAPH_EVENT_TYPE,
          parameters: {
            graphId: RULES_STATE_TRANSITION_GRAPH_ID,
            fromState: RULES_STATE_TRANSITION_GRAPH_FROM_STATE,
            toState: RULES_STATE_TRANSITION_GRAPH_TO_STATE,
            trigger: RULES_STATE_TRANSITION_GRAPH_TRIGGER
          }
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'state_probe',
          runtimeSystemId: RULES_STATE_TRANSITION_GRAPH_RUNTIME_SYSTEM_ID,
          ref: RULES_STATE_TRANSITION_GRAPH_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${RULES_STATE_TRANSITION_GRAPH_REQUIRED_PROBE_ID}.assertion.explicit_graph`,
          expected: {
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
        })
      ]
    });
  });

  it('accepts the runtime manifest binding package-owned QA contract', () => {
    const contract = createRuntimeManifestBindingPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: RUNTIME_MANIFEST_BINDING_CAPABILITY_ID
    });
    expect(contract.runtime.systems).toEqual([
      {
        id: RUNTIME_MANIFEST_BINDING_RUNTIME_SYSTEM_ID,
        version: RUNTIME_MANIFEST_BINDING_SYSTEM_VERSION,
        phase: RUNTIME_MANIFEST_BINDING_SYSTEM_PHASE,
        dependencies: ['runtime_plan']
      }
    ]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: RUNTIME_MANIFEST_BINDING_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: RUNTIME_MANIFEST_BINDING_CAPABILITY_ID,
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: RUNTIME_MANIFEST_BINDING_EVENT_TYPE,
          parameters: {
            profileId: RUNTIME_MANIFEST_BINDING_PROFILE_ID,
            runtimeFamily: RUNTIME_MANIFEST_BINDING_RUNTIME_FAMILY,
            templateId: RUNTIME_MANIFEST_BINDING_TEMPLATE_ID,
            runtimeSystemId: RUNTIME_MANIFEST_BINDING_RUNTIME_SYSTEM_ID
          }
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'state_probe',
          runtimeSystemId: RUNTIME_MANIFEST_BINDING_RUNTIME_SYSTEM_ID,
          ref: RUNTIME_MANIFEST_BINDING_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${RUNTIME_MANIFEST_BINDING_REQUIRED_PROBE_ID}.assertion.binding`,
          expected: {
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
          }
        })
      ]
    });
  });

  it('accepts the runtime module load receipt package-owned QA contract', () => {
    const contract = createRuntimeModuleLoadReceiptPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: RUNTIME_MODULE_LOAD_RECEIPT_CAPABILITY_ID
    });
    expect(contract.dependencies).toEqual([{ capabilityId: RUNTIME_MANIFEST_BINDING_CAPABILITY_ID, range: '^v1' }]);
    expect(contract.runtime.systems).toEqual([
      {
        id: RUNTIME_MODULE_LOAD_RECEIPT_RUNTIME_SYSTEM_ID,
        version: RUNTIME_MODULE_LOAD_RECEIPT_SYSTEM_VERSION,
        phase: RUNTIME_MODULE_LOAD_RECEIPT_SYSTEM_PHASE,
        dependencies: ['runtime.manifest_binding']
      }
    ]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: RUNTIME_MODULE_LOAD_RECEIPT_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: RUNTIME_MODULE_LOAD_RECEIPT_CAPABILITY_ID,
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: RUNTIME_MODULE_LOAD_RECEIPT_EVENT_TYPE,
          parameters: {
            artifactKind: RUNTIME_MODULE_LOAD_RECEIPT_KIND,
            schemaVersion: RUNTIME_MODULE_LOAD_RECEIPT_SCHEMA_VERSION,
            profileId: RUNTIME_MODULE_LOAD_RECEIPT_PROFILE_ID,
            runtimeFamily: RUNTIME_MODULE_LOAD_RECEIPT_RUNTIME_FAMILY
          }
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'state_probe',
          runtimeSystemId: RUNTIME_MODULE_LOAD_RECEIPT_RUNTIME_SYSTEM_ID,
          ref: RUNTIME_MODULE_LOAD_RECEIPT_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${RUNTIME_MODULE_LOAD_RECEIPT_REQUIRED_PROBE_ID}.assertion.receipt`,
          expected: {
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
          }
        })
      ]
    });
  });

  it('accepts the runtime plan coverage package-owned QA contract', () => {
    const contract = createRuntimePlanCoveragePackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: RUNTIME_PLAN_COVERAGE_CAPABILITY_ID
    });
    expect(contract.dependencies).toEqual([]);
    expect(contract.runtime.systems).toEqual([
      {
        id: RUNTIME_PLAN_COVERAGE_RUNTIME_SYSTEM_ID,
        version: RUNTIME_PLAN_COVERAGE_SYSTEM_VERSION,
        phase: RUNTIME_PLAN_COVERAGE_SYSTEM_PHASE,
        dependencies: ['capability_lock', 'capability_registry', 'runtime_manifest']
      }
    ]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: RUNTIME_PLAN_COVERAGE_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: RUNTIME_PLAN_COVERAGE_CAPABILITY_ID,
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: RUNTIME_PLAN_COVERAGE_EVENT_TYPE,
          parameters: {
            artifactKind: RUNTIME_PLAN_COVERAGE_KIND,
            schemaVersion: RUNTIME_PLAN_COVERAGE_SCHEMA_VERSION,
            profileId: RUNTIME_PLAN_COVERAGE_PROFILE_ID,
            runtimeFamily: RUNTIME_PLAN_COVERAGE_RUNTIME_FAMILY
          }
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'state_probe',
          runtimeSystemId: RUNTIME_PLAN_COVERAGE_RUNTIME_SYSTEM_ID,
          ref: RUNTIME_PLAN_COVERAGE_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${RUNTIME_PLAN_COVERAGE_REQUIRED_PROBE_ID}.assertion.coverage`,
          expected: {
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
          }
        })
      ]
    });
  });

  it('accepts the collision platform package-owned QA contract', () => {
    const contract = createCollisionPlatformPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === COLLISION_PLATFORM_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'collision.platform.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([COLLISION_PLATFORM_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: COLLISION_PLATFORM_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'collision.platform.v1',
      severity: 'required',
      observations: [
        expect.objectContaining({ kind: 'state_probe', runtimeSystemId: COLLISION_PLATFORM_RUNTIME_SYSTEM_ID, ref: 'collision.platform.grounded' })
      ]
    });
  });

  it('accepts the combat projectile package-owned QA contract', () => {
    const contract = createCombatProjectilePackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === COMBAT_PROJECTILE_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'combat.projectile.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([COMBAT_PROJECTILE_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: COMBAT_PROJECTILE_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'combat.projectile.v1',
      severity: 'required',
      observations: [expect.objectContaining({ runtimeSystemId: COMBAT_PROJECTILE_RUNTIME_SYSTEM_ID, ref: 'projectile.spawned' })]
    });
  });

  it('accepts the combat airborne fire package-owned QA contract', () => {
    const contract = createCombatAirborneFirePackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === COMBAT_AIRBORNE_FIRE_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'combat.airborne_fire.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([COMBAT_AIRBORNE_FIRE_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: COMBAT_AIRBORNE_FIRE_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'combat.airborne_fire.v1',
      severity: 'required',
      actions: [expect.objectContaining({ target: 'combat.airborne_fire.fired', parameters: expect.objectContaining({ airborne: true }) })],
      observations: [expect.objectContaining({ runtimeSystemId: COMBAT_AIRBORNE_FIRE_RUNTIME_SYSTEM_ID, ref: 'combat.airborne_fire.fired' })]
    });
  });

  it('accepts the movement run jump package-owned QA contract', () => {
    const contract = createMovementRunJumpPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'movement.run_jump.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([MOVEMENT_RUN_JUMP_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: MOVEMENT_RUN_JUMP_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'movement.run_jump.v1',
      severity: 'required',
      observations: [expect.objectContaining({ runtimeSystemId: MOVEMENT_RUN_JUMP_RUNTIME_SYSTEM_ID, ref: 'player.jumped' })]
    });
  });

  it('accepts the movement crouch package-owned QA contract', () => {
    const contract = createMovementCrouchPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === MOVEMENT_CROUCH_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'movement.crouch.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([MOVEMENT_CROUCH_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: MOVEMENT_CROUCH_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'movement.crouch.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: 'movement.crouch.entered',
          parameters: expect.objectContaining({ action: 'crouch', crouching: true, heightScale: MOVEMENT_CROUCH_HEIGHT_SCALE })
        })
      ],
      observations: [expect.objectContaining({ runtimeSystemId: MOVEMENT_CROUCH_RUNTIME_SYSTEM_ID, ref: 'movement.crouch.entered' })]
    });
  });

  it('accepts the spawn static package-owned QA contract', () => {
    const contract = createSpawnStaticPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === SPAWN_STATIC_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'spawn.static.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([SPAWN_STATIC_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: SPAWN_STATIC_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'spawn.static.v1',
      severity: 'required',
      observations: [expect.objectContaining({ kind: 'state_probe', runtimeSystemId: SPAWN_STATIC_RUNTIME_SYSTEM_ID, ref: 'spawn.static.triggered' })]
    });
  });

  it('accepts the spawn enemy wave package-owned QA contract with ordered gate evidence', () => {
    const contract = createSpawnEnemyWavePackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'spawn.enemy_wave.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([SPAWN_ENEMY_WAVE_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: SPAWN_ENEMY_WAVE_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'spawn.enemy_wave.v1',
      severity: 'required',
      observations: [expect.objectContaining({ kind: 'state_probe', runtimeSystemId: SPAWN_ENEMY_WAVE_RUNTIME_SYSTEM_ID, ref: SPAWN_ENEMY_WAVE_ORDERED_EVENT_TYPE })],
      assertions: [
        expect.objectContaining({
          id: `${SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID}.assertion.ordered_wave`,
          expected: { orderedWaveSequence: true, gateTriggered: true, waveSpawned: true, sequenceIndex: 0 }
        })
      ]
    });
  });

  it('accepts the health player health points package-owned QA contract', () => {
    const contract = createHealthPlayerHealthPointsPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'health.player_health_points.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([HEALTH_PLAYER_HEALTH_POINTS_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: HEALTH_PLAYER_HEALTH_POINTS_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'health.player_health_points.v1',
      severity: 'required',
      observations: [expect.objectContaining({ kind: 'state_probe', runtimeSystemId: HEALTH_PLAYER_HEALTH_POINTS_RUNTIME_SYSTEM_ID, ref: 'health.player_health.current' })]
    });
  });

  it('accepts the health damage invulnerability package-owned QA contract', () => {
    const contract = createHealthDamageInvulnerabilityPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === HEALTH_DAMAGE_INVULNERABILITY_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'health.damage_invulnerability.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([HEALTH_DAMAGE_INVULNERABILITY_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: HEALTH_DAMAGE_INVULNERABILITY_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'health.damage_invulnerability.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: 'health.damage_invulnerability.blocked',
          parameters: expect.objectContaining({ invulnerable: true, damagePrevented: true })
        })
      ],
      observations: expect.arrayContaining([
        expect.objectContaining({ runtimeSystemId: HEALTH_DAMAGE_INVULNERABILITY_RUNTIME_SYSTEM_ID, ref: 'health.damage_invulnerability.activated' }),
        expect.objectContaining({ runtimeSystemId: HEALTH_DAMAGE_INVULNERABILITY_RUNTIME_SYSTEM_ID, ref: 'health.damage_invulnerability.blocked' })
      ]),
      assertions: expect.arrayContaining([
        expect.objectContaining({
          id: 'health.damage_invulnerability.v1.window.browser_qa.v1.assertion.window_activated',
          observationId: 'health.damage_invulnerability.v1.window.browser_qa.v1.observation.window_activated'
        }),
        expect.objectContaining({
          id: 'health.damage_invulnerability.v1.window.browser_qa.v1.assertion.damage_blocked',
          observationId: 'health.damage_invulnerability.v1.window.browser_qa.v1.observation.damage_blocked'
        })
      ])
    });
  });

  it('accepts the pickup collectible package-owned QA contract', () => {
    const contract = createPickupCollectiblePackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'pickup.collectible.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([PICKUP_COLLECTIBLE_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: PICKUP_COLLECTIBLE_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'pickup.collectible.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: PICKUP_COLLECTIBLE_COLLECTED_EVENT_TYPE,
          parameters: expect.objectContaining({ action: 'collect', pickupCollected: true, pickupConsumed: true, pickupStateChanged: true })
        })
      ],
      observations: expect.arrayContaining([
        expect.objectContaining({ runtimeSystemId: PICKUP_COLLECTIBLE_RUNTIME_SYSTEM_ID, ref: PICKUP_COLLECTIBLE_COLLECTED_EVENT_TYPE }),
        expect.objectContaining({ runtimeSystemId: PICKUP_COLLECTIBLE_RUNTIME_SYSTEM_ID, ref: PICKUP_COLLECTIBLE_STATE_CHANGED_EVENT_TYPE })
      ]),
      assertions: expect.arrayContaining([
        expect.objectContaining({
          id: 'pickup.collectible.v1.collection.browser_qa.v1.assertion.collected',
          expected: { pickupCollected: true }
        }),
        expect.objectContaining({
          id: 'pickup.collectible.v1.collection.browser_qa.v1.assertion.state_changed',
          expected: { pickupConsumed: true, pickupStateChanged: true }
        })
      ])
    });
  });

  it('accepts the pickup weapon supply package-owned QA contract', () => {
    const contract = createPickupWeaponSupplyPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'pickup.weapon_supply.v1'
    });
    expect(contract.runtime.systems).toEqual([
      {
        id: PICKUP_WEAPON_SUPPLY_RUNTIME_SYSTEM_ID,
        version: 'v1',
        phase: 'gameplay',
        dependencies: ['pickup.collectible', 'weapon.default_straight_single']
      }
    ]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: PICKUP_WEAPON_SUPPLY_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'pickup.weapon_supply.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
          parameters: {
            supplyNodeId: PICKUP_WEAPON_SUPPLY_NODE_ID,
            pickupId: PICKUP_WEAPON_SUPPLY_PICKUP_ID,
            weaponId: PICKUP_WEAPON_SUPPLY_WEAPON_ID,
            action: 'collect_weapon_supply'
          }
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: PICKUP_WEAPON_SUPPLY_RUNTIME_SYSTEM_ID,
          ref: PICKUP_WEAPON_SUPPLY_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID}.assertion.weapon_supply_verified`,
          expected: {
            weaponSupplyAvailable: true,
            weaponSupplyNodeId: PICKUP_WEAPON_SUPPLY_NODE_ID,
            weaponSupplyPickupId: PICKUP_WEAPON_SUPPLY_PICKUP_ID,
            weaponSupplyWeaponId: PICKUP_WEAPON_SUPPLY_WEAPON_ID,
            weaponSupplyCollected: true,
            weaponSupplyConsumed: true,
            weaponSupplyGranted: true
          }
        })
      ]
    });
  });

  it('accepts the fixed prompt binding package-owned artifact QA contract', () => {
    const contract = createFixedPromptBindingPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'metadata.fixed_prompt_binding.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([FIXED_PROMPT_BINDING_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: FIXED_PROMPT_BINDING_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'metadata.fixed_prompt_binding.v1',
      severity: 'required',
      actions: [expect.objectContaining({ target: FIXED_PROMPT_BINDING_EVENT_TYPE })],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: FIXED_PROMPT_BINDING_RUNTIME_SYSTEM_ID,
          ref: FIXED_PROMPT_BINDING_EVENT_TYPE
        })
      ]
    });
  });

  it('accepts the DeepSeek run-and-gun validation profile package-owned artifact QA contract', () => {
    const contract = createProfileDeepSeekRunAndGunValidationPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'profile.deepseek_run_and_gun_validation.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_RUNTIME_SYSTEM_ID]);
    expect(contract.dsl.ownedPaths).toEqual(['/profile/id', '/profile/runtime_family']);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'profile.deepseek_run_and_gun_validation.v1',
      severity: 'required',
      actions: [expect.objectContaining({ target: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE })],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_RUNTIME_SYSTEM_ID,
          ref: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE
        })
      ]
    });
  });

  it('accepts the DeepSeek authoritative draft provider package-owned artifact QA contract', () => {
    const contract = createProviderDeepSeekAuthoritativeDraftPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'provider.deepseek_authoritative_draft.v1'
    });
    expect(contract.dependencies).toEqual([
      { capabilityId: 'metadata.fixed_prompt_binding.v1', range: '^v1' },
      { capabilityId: 'profile.deepseek_run_and_gun_validation.v1', range: '^v1' }
    ]);
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_RUNTIME_SYSTEM_ID]);
    expect(contract.dsl.ownedPaths).toEqual(['/provider/deepseek_authoritative_draft']);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'provider.deepseek_authoritative_draft.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_EVENT_TYPE,
          parameters: {
            providerId: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_PROVIDER_ID,
            draftArtifactKind: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_ARTIFACT_KIND,
            draftSchemaVersion: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_SCHEMA_VERSION,
            canonicalSchemaVersion: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_CANONICAL_SCHEMA_VERSION
          }
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_RUNTIME_SYSTEM_ID,
          ref: PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID}.assertion.authoritative_draft_verified`,
          expected: {
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
        })
      ]
    });
  });

  it('accepts the final Oracle gate package only when approval is bound to reviewed candidate and Skill revisions', () => {
    const contract = createReviewOracleFinalGatePackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'review.oracle_final_gate.v1'
    });
    expect(contract.dependencies).toEqual([]);
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([REVIEW_ORACLE_FINAL_GATE_RUNTIME_SYSTEM_ID]);
    expect(contract.dsl.ownedPaths).toEqual(['/review/oracle_final_gate']);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: REVIEW_ORACLE_FINAL_GATE_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'oracle_final_gate',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'review.oracle_final_gate.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE,
          parameters: {
            evidenceKind: 'oracle_final_gate',
            profileId: 'side_scrolling_run_and_gun.v1'
          }
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: REVIEW_ORACLE_FINAL_GATE_RUNTIME_SYSTEM_ID,
          ref: REVIEW_ORACLE_FINAL_GATE_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${REVIEW_ORACLE_FINAL_GATE_REQUIRED_PROBE_ID}.assertion.final_gate_bound_to_candidate_and_skill`,
          expected: {
            finalOracleGateApproved: true,
            finalOracleReviewedCommitShaPresent: true,
            finalOracleReviewedSkillRevisionPresent: true,
            finalOracleResultMatchesReviewedCommit: true,
            finalOracleResultMatchesReviewedSkillRevision: true,
            finalOracleCheckpointMatched: true,
            finalOracleResultIdPresent: true,
            finalOracleReviewedCommitIsNotReceipt: true,
            finalOracleP0Count: 0,
            finalOracleP1Count: 0,
            finalOracleP2Count: 0
          }
        })
      ]
    });
    expect(contract.defaults.requiredStateFields).toEqual([
      'finalOracleGateApproved',
      'finalOracleReviewedCommitShaPresent',
      'finalOracleReviewedSkillRevisionPresent',
      'finalOracleResultMatchesReviewedCommit',
      'finalOracleResultMatchesReviewedSkillRevision',
      'finalOracleCheckpointMatched',
      'finalOracleResultIdPresent',
      'finalOracleReviewedCommitIsNotReceipt',
      'finalOracleP0Count',
      'finalOracleP1Count',
      'finalOracleP2Count',
      'finalOracleGateStatus',
      'finalOracleCandidateCommitSha',
      'finalOracleReviewedCommitSha',
      'finalOracleCandidateSkillRevision',
      'finalOracleReviewedSkillRevision',
      'finalOracleResultId',
      'finalOracleCheckpointId',
      'finalOracleExpectedCheckpointId'
    ]);
  });

  it('accepts the artifact lineage no-manual-patch package-owned artifact QA contract', () => {
    const contract = createArtifactLineageNoManualPatchPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'artifact.lineage_no_manual_patch.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([ARTIFACT_LINEAGE_NO_MANUAL_PATCH_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: ARTIFACT_LINEAGE_NO_MANUAL_PATCH_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'artifact.lineage_no_manual_patch.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
          parameters: expect.objectContaining({
            source: 'pipeline_artifact_lineage',
            manualPatchPolicy: 'forbidden'
          })
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: ARTIFACT_LINEAGE_NO_MANUAL_PATCH_RUNTIME_SYSTEM_ID,
          ref: ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID}.assertion.no_manual_patch`,
          expected: {
            pipelineProduced: true,
            manualPatchDetected: false,
            lineageVerified: true
          }
        })
      ]
    });
  });

  it('accepts the artifact no-hidden-script package-owned manifest QA contract', () => {
    const contract = createArtifactNoHiddenScriptPackageContract();
    const report = validateGameplayCapabilityPackage(contract);
    const requiredProbe = contract.qa.probes.find((probe) => probe.id === ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID);

    expect(report).toMatchObject({
      status: 'valid',
      completeness: 'COMPLETE_SUPPORTED',
      supportEligible: true,
      packageId: 'artifact.no_hidden_script.v1'
    });
    expect(contract.runtime.systems.map((system) => system.id)).toEqual([ARTIFACT_NO_HIDDEN_SCRIPT_RUNTIME_SYSTEM_ID]);
    expect(contract.qa.requiredEvidence).toEqual([
      {
        id: ARTIFACT_NO_HIDDEN_SCRIPT_PACKAGE_REQUIRED_EVIDENCE_ID,
        artifactKind: 'capability_qa_report',
        required: true
      }
    ]);
    expect(requiredProbe).toMatchObject({
      capabilityId: 'artifact.no_hidden_script.v1',
      severity: 'required',
      actions: [
        expect.objectContaining({
          target: ARTIFACT_NO_HIDDEN_SCRIPT_EVENT_TYPE,
          parameters: expect.objectContaining({
            source: 'runtime_manifest_module_load_receipt',
            hiddenScriptPolicy: 'forbidden'
          })
        })
      ],
      observations: [
        expect.objectContaining({
          kind: 'runtime_event',
          runtimeSystemId: ARTIFACT_NO_HIDDEN_SCRIPT_RUNTIME_SYSTEM_ID,
          ref: ARTIFACT_NO_HIDDEN_SCRIPT_EVENT_TYPE
        })
      ],
      assertions: [
        expect.objectContaining({
          id: `${ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID}.assertion.no_hidden_script`,
          expected: {
            declaredModulesOnly: true,
            hiddenScriptDetected: false,
            moduleLoadManifestVerified: true
          }
        })
      ]
    });
  });

  it('does not let manifest.status supported bypass missing QA and evidence', () => {
    const report = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      qa: { probes: [], requiredEvidence: [] }
    });

    expect(report.status).toBe('invalid');
    expect(report.supportEligible).toBe(false);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PACKAGE_SCHEMA_INVALID'
        })
      ])
    );
  });

  it('rejects supported packages that parse but are not complete supported', () => {
    const report = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      qa: {
        probes: [createQaProbe('movement.run_jump.v1.qa.optional', { severity: 'optional' })],
        requiredEvidence: [{ id: 'movement.run_jump.v1.evidence.optional', artifactKind: 'capability_qa_report', required: false }]
      }
    });

    expect(report.status).toBe('invalid');
    expect(report.supportEligible).toBe(false);
    expect(report.completeness).toBe('RUNTIME_WITHOUT_QA');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'SUPPORTED_PACKAGE_INCOMPLETE'
        })
      ])
    );
  });

  it('rejects manifest capability version drift and extra arbitrary fields', () => {
    const versionDrift = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      manifest: { ...createPackageContract().manifest, capabilityVersion: 'v2' }
    });
    const arbitraryScript = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      runtime: {
        ...createPackageContract().runtime,
        systems: [{ ...createPackageContract().runtime.systems[0], script: 'Math.random()' }]
      }
    });

    expect(versionDrift.status).toBe('invalid');
    expect(versionDrift.issues.some((issue) => issue.path.endsWith('capabilityVersion'))).toBe(true);
    expect(arbitraryScript.status).toBe('invalid');
    expect(arbitraryScript.issues.some((issue) => issue.path.includes('runtime.systems.0'))).toBe(true);
  });

  it('rejects patch descriptors without owned paths or outside the package DSL ownership', () => {
    const emptyPatchPaths = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      patch: { descriptors: [{ id: 'movement.run_jump.v1.patch.move_speed', policy: 'warm_restart', ownedPaths: [] }] }
    });
    const outsidePatchPath = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      patch: { descriptors: [{ id: 'movement.run_jump.v1.patch.enemy_speed', policy: 'warm_restart', ownedPaths: ['/entities/components/enemy.speed'] }] }
    });

    expect(emptyPatchPaths.status).toBe('invalid');
    expect(emptyPatchPaths.issues.some((issue) => issue.path.includes('patch.descriptors.0.ownedPaths'))).toBe(true);
    expect(outsidePatchPath.status).toBe('invalid');
    expect(outsidePatchPath.issues.some((issue) => issue.path.includes('patch.descriptors.0.ownedPaths.0'))).toBe(true);
  });

  it('rejects non-json defaults and executable-looking defaults keys', () => {
    const functionDefault = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      defaults: { value: () => 1 }
    });
    const scriptKeyDefault = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      defaults: { nested: { script: 'Math.random()' } }
    });

    expect(functionDefault.status).toBe('invalid');
    expect(functionDefault.issues.some((issue) => issue.path.includes('defaults.value'))).toBe(true);
    expect(scriptKeyDefault.status).toBe('invalid');
    expect(scriptKeyDefault.issues.some((issue) => issue.path.includes('defaults.nested.script'))).toBe(true);
  });

  it('requires capability-owned QA probes and required evidence', () => {
    const foreignProbe = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      qa: {
        probes: [createQaProbe('other.capability.v1.qa.required', { capabilityId: 'other.capability.v1' })],
        requiredEvidence: [{ id: 'movement.run_jump.v1.evidence.runtime', artifactKind: 'capability_qa_report', required: true }]
      }
    });
    const foreignEvidence = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      qa: {
        probes: [createQaProbe('movement.run_jump.v1.qa.required')],
        requiredEvidence: [{ id: 'other.capability.v1.evidence.runtime', artifactKind: 'capability_qa_report', required: true }]
      }
    });

    expect(foreignProbe.status).toBe('invalid');
    expect(foreignProbe.issues.some((issue) => issue.path.includes('qa.probes.0.id'))).toBe(true);
    expect(foreignEvidence.status).toBe('invalid');
    expect(foreignEvidence.issues.some((issue) => issue.path.includes('qa.requiredEvidence.0.id'))).toBe(true);
  });

  it('rejects owned DSL path overlap across packages', () => {
    const first = createPackageContract();
    const second = createPackageContract({
      id: 'movement.wall_jump.v1',
      ownedPath: '/entities/components/movement.run_jump'
    });
    const report = validateGameplayCapabilityPackages([first, second]);

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'OWNED_DSL_PATH_CONFLICT',
          path: 'dsl.ownedPaths'
        })
      ])
    );
  });

  it('rejects parent-child owned DSL path overlap across packages', () => {
    const first = createPackageContract({
      ownedPath: '/entities/components'
    });
    const second = createPackageContract({
      id: 'movement.wall_jump.v1',
      ownedPath: '/entities/components/movement.wall_jump'
    });
    const report = validateGameplayCapabilityPackages([first, second]);

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'OWNED_DSL_PATH_CONFLICT'
        })
      ])
    );
  });

  it('rejects duplicate package IDs in a package set', () => {
    const report = validateGameplayCapabilityPackages([createPackageContract(), createPackageContract({ ownedPath: '/entities/components/movement.run_jump.alt' })]);

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'DUPLICATE_PACKAGE_ID',
          path: 'manifest.id'
        })
      ])
    );
  });

  it('keeps experimental complete packages out of production support eligibility', () => {
    const report = validateGameplayCapabilityPackage({
      ...createPackageContract(),
      manifest: { ...createPackageContract().manifest, status: 'experimental' }
    });

    expect(report.status).toBe('valid');
    expect(report.completeness).toBe('COMPLETE_EXPERIMENTAL');
    expect(report.supportEligible).toBe(false);
  });
});

function createPackageContract(input: { id?: string; ownedPath?: string } = {}): GameplayCapabilityPackageContract {
  const id = input.id ?? 'movement.run_jump.v1';
  const ownedPath = input.ownedPath ?? '/entities/components/movement.run_jump';
  return {
    manifest: {
      id,
      packageVersion: '1.0.0',
      capabilityVersion: 'v1',
      status: 'supported',
      description: 'Run and jump movement capability.',
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: 'gameplay-capability-package.v1'
    },
    dsl: {
      schemaFragmentId: `${id}.schema`,
      ownedPaths: [ownedPath],
      normalizerId: `${id}.normalizer`,
      migrations: []
    },
    ir: {
      compilerId: `${id}.ir`,
      ownedNodeKinds: ['component.movement.run_jump']
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: `${id}.system`, version: 'v1', phase: 'gameplay', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: 'SetComponentProperty:moveSpeed', executionPolicy: 'warm_restart' }],
      compilerId: `${id}.amendments`
    },
    patch: {
      descriptors: [{ id: `${id}.patch.move_speed`, policy: 'warm_restart', ownedPaths: [ownedPath] }]
    },
    qa: {
      probes: [createQaProbe(`${id}.qa.required`, { capabilityId: id, runtimeSystemId: `${id}.system`, message: 'player x increases after move input' })],
      requiredEvidence: [{ id: `${id}.evidence.runtime`, artifactKind: 'capability_qa_report', required: true }]
    },
    render: {
      assetRoles: [],
      sceneBindings: [],
      fallbackPolicy: 'not_applicable'
    },
    dependencies: [],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: `${id}.service`, version: 'v1' }],
    defaults: {},
    diagnostics: {}
  };
}

function createQaProbe(
  id: string,
  input: {
    capabilityId?: string;
    runtimeSystemId?: string;
    severity?: 'required' | 'optional';
    message?: string;
  } = {}
): GameplayCapabilityPackageContract['qa']['probes'][number] {
  const capabilityId = input.capabilityId ?? 'movement.run_jump.v1';
  const runtimeSystemId = input.runtimeSystemId ?? 'movement.run_jump.v1.system';
  return {
    id,
    capabilityId,
    severity: input.severity ?? 'required',
    prerequisites: ['runtime scene started'],
    actions: [{ id: `${id}.action.move_right`, kind: 'input', target: 'player', parameters: { control: 'right', durationMs: 240 } }],
    observations: [{ id: `${id}.observation.player_x`, kind: 'position_delta', runtimeSystemId, ref: 'player.x' }],
    assertions: [
      {
        id: `${id}.assertion.player_x_increased`,
        observationId: `${id}.observation.player_x`,
        comparator: 'increased',
        message: input.message ?? 'player x increases after move input'
      }
    ]
  };
}
