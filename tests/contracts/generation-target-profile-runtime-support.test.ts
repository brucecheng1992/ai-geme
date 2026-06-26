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
  FIXED_PROMPT_BINDING_EVENT_TYPE,
  FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID,
  GenerationTargetProfileRuntimeSupportReportSchema,
  HEALTH_DAMAGE_INVULNERABILITY_REQUIRED_PROBE_ID,
  HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID,
  MOVEMENT_CROUCH_HEIGHT_SCALE,
  MOVEMENT_CROUCH_REQUIRED_PROBE_ID,
  MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID,
  PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID,
  PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
  PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID,
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
  createFixedPromptBindingPackageContract,
  createHealthDamageInvulnerabilityPackageContract,
  createHealthPlayerHealthPointsPackageContract,
  createMovementCrouchPackageContract,
  createMovementRunJumpPackageContract,
  createPickupCollectiblePackageContract,
  createProfileDeepSeekRunAndGunValidationPackageContract,
  createSpawnEnemyWavePackageContract,
  createSpawnStaticPackageContract,
  createWeaponDeathResetPackageContract,
  createWeaponRapidFirePackageContract,
  createWeaponSpreadShotPackageContract,
  createWeaponReplacementRulePackageContract,
  evaluateCapabilityQaReport,
  resolveGameplayCapabilityGraph,
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
const fixedPromptBindingCapabilityId = 'metadata.fixed_prompt_binding.v1';
const profileBindingCapabilityId = 'profile.deepseek_run_and_gun_validation.v1';
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
      'combat.airborne_fire.fired',
      'player.fired',
      'projectile.spawned',
      'movement.crouch.entered',
      'player.jumped',
      'pickup.collectible.collected',
      'pickup.collectible.state_changed',
      'spawn.enemy_wave.ordered',
      'spawn.static.triggered',
      'health.damage_invulnerability.activated',
      'health.damage_invulnerability.blocked',
      'health.player_health.current',
      FIXED_PROMPT_BINDING_EVENT_TYPE,
      PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
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
    const defaultWeapon = report.capabilities.find((entry) => entry.capabilityId === defaultWeaponCapabilityId);
    const projectile = report.capabilities.find((entry) => entry.capabilityId === projectileCapabilityId);
    const movement = report.capabilities.find((entry) => entry.capabilityId === movementCapabilityId);
    const spawnStatic = report.capabilities.find((entry) => entry.capabilityId === spawnStaticCapabilityId);
    const damageInvulnerability = report.capabilities.find((entry) => entry.capabilityId === damageInvulnerabilityCapabilityId);
    const health = report.capabilities.find((entry) => entry.capabilityId === healthCapabilityId);
    const pickup = report.capabilities.find((entry) => entry.capabilityId === pickupCapabilityId);
    const fixedPromptBinding = report.capabilities.find((entry) => entry.capabilityId === fixedPromptBindingCapabilityId);
    const profileBinding = report.capabilities.find((entry) => entry.capabilityId === profileBindingCapabilityId);
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
      observedCompleteSupportedCount: 22,
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
        damageInvulnerabilityCapabilityId,
        healthCapabilityId,
        fixedPromptBindingCapabilityId,
        crouchCapabilityId,
        movementCapabilityId,
        pickupCapabilityId,
        profileBindingCapabilityId,
        spawnEnemyWaveCapabilityId,
        spawnStaticCapabilityId,
        deathResetCapabilityId,
        defaultWeaponCapabilityId,
        rapidFireCapabilityId,
        replacementRuleCapabilityId,
        spreadShotCapabilityId
      ],
      blockers: ['target_profile_runtime_support_incomplete:22/59']
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
        'combat.airborne_fire.fired',
        'player.fired',
        'projectile.spawned',
        'movement.crouch.entered',
        'player.jumped',
        'pickup.collectible.collected',
        'pickup.collectible.state_changed',
        'spawn.enemy_wave.ordered',
        'spawn.static.triggered',
        'health.damage_invulnerability.activated',
        'health.damage_invulnerability.blocked',
        'health.player_health.current',
        FIXED_PROMPT_BINDING_EVENT_TYPE,
        PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
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
      observedCompleteSupportedCount: 21,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:21/59'
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
      'combat.airborne_fire.fired',
      'player.fired',
      'projectile.spawned',
      'movement.crouch.entered',
      'player.jumped',
      'pickup.collectible.collected',
      'pickup.collectible.state_changed',
      'spawn.enemy_wave.ordered',
      'spawn.static.triggered',
      'health.damage_invulnerability.activated',
      'health.damage_invulnerability.blocked',
      'health.player_health.current',
      PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
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
      observedCompleteSupportedCount: 21,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:21/59'
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
      'combat.airborne_fire.fired',
      'player.fired',
      'projectile.spawned',
      'movement.crouch.entered',
      'player.jumped',
      'pickup.collectible.collected',
      'pickup.collectible.state_changed',
      'spawn.enemy_wave.ordered',
      'spawn.static.triggered',
      'health.damage_invulnerability.activated',
      'health.damage_invulnerability.blocked',
      'health.player_health.current',
      FIXED_PROMPT_BINDING_EVENT_TYPE,
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
      observedCompleteSupportedCount: 21,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:21/59'
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

  it('keeps runtime support blocked when the required package QA assertion is missing', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport(['player.fired']);
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
      'combat.airborne_fire.fired',
      'player.fired',
      'projectile.spawned',
      'movement.crouch.entered',
      'player.jumped',
      'pickup.collectible.collected',
      'pickup.collectible.state_changed',
      'spawn.enemy_wave.ordered',
      'spawn.static.triggered',
      'health.damage_invulnerability.blocked',
      'health.player_health.current',
      FIXED_PROMPT_BINDING_EVENT_TYPE,
      PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
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
      observedCompleteSupportedCount: 21,
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
        healthCapabilityId,
        fixedPromptBindingCapabilityId,
        crouchCapabilityId,
        movementCapabilityId,
        pickupCapabilityId,
        profileBindingCapabilityId,
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
        'target_profile_runtime_support_incomplete:21/59'
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
        'combat.airborne_fire.fired',
        'player.fired',
        'projectile.spawned',
        'movement.crouch.entered',
        'player.jumped',
        'pickup.collectible.collected',
        'pickup.collectible.state_changed',
        'spawn.enemy_wave.ordered',
      'spawn.static.triggered',
      'health.damage_invulnerability.activated',
      'health.damage_invulnerability.blocked',
      'health.player_health.current',
      FIXED_PROMPT_BINDING_EVENT_TYPE,
      PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
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
      observedCompleteSupportedCount: 21,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:21/59'
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

  it('keeps spawn enemy wave unverified when ordered wave evidence lacks gate and order proof', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport(
      [
        ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
        'camera.side_follow.active',
        'collision.platform.grounded',
        ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
        ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
        ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
        'combat.airborne_fire.fired',
        'player.fired',
        'projectile.spawned',
        'movement.crouch.entered',
        'player.jumped',
        'pickup.collectible.collected',
        'pickup.collectible.state_changed',
        'spawn.enemy_wave.ordered',
      'spawn.static.triggered',
      'health.damage_invulnerability.activated',
      'health.damage_invulnerability.blocked',
      'health.player_health.current',
      FIXED_PROMPT_BINDING_EVENT_TYPE,
      PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
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
      observedCompleteSupportedCount: 21,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:21/59'
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

  it('keeps weapon death reset unverified when restore evidence lacks reset state fields', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport(
      [
        ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
        'camera.side_follow.active',
        'collision.platform.grounded',
        ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
        ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
        ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
        'combat.airborne_fire.fired',
        'player.fired',
        'projectile.spawned',
        'movement.crouch.entered',
        'player.jumped',
        'pickup.collectible.collected',
        'pickup.collectible.state_changed',
        'spawn.enemy_wave.ordered',
        'spawn.static.triggered',
        'health.damage_invulnerability.activated',
        'health.damage_invulnerability.blocked',
        'health.player_health.current',
        FIXED_PROMPT_BINDING_EVENT_TYPE,
      PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
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
      observedCompleteSupportedCount: 21,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${WEAPON_DEATH_RESET_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:21/59'
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
        'combat.airborne_fire.fired',
        'player.fired',
        'projectile.spawned',
        'movement.crouch.entered',
        'player.jumped',
        'pickup.collectible.collected',
        'pickup.collectible.state_changed',
        'spawn.enemy_wave.ordered',
        'spawn.static.triggered',
        'health.damage_invulnerability.activated',
        'health.damage_invulnerability.blocked',
        'health.player_health.current',
        FIXED_PROMPT_BINDING_EVENT_TYPE,
        PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
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
      observedCompleteSupportedCount: 21,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:21/59'
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
        'combat.airborne_fire.fired',
        'player.fired',
        'projectile.spawned',
        'movement.crouch.entered',
        'player.jumped',
        'pickup.collectible.collected',
        'pickup.collectible.state_changed',
        'spawn.enemy_wave.ordered',
        'spawn.static.triggered',
        'health.damage_invulnerability.activated',
        'health.damage_invulnerability.blocked',
        'health.player_health.current',
        FIXED_PROMPT_BINDING_EVENT_TYPE,
        PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
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
      observedCompleteSupportedCount: 21,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:21/59'
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
        'combat.airborne_fire.fired',
        'player.fired',
        'projectile.spawned',
        'movement.crouch.entered',
        'player.jumped',
        'pickup.collectible.collected',
        'pickup.collectible.state_changed',
        'spawn.enemy_wave.ordered',
        'spawn.static.triggered',
        'health.damage_invulnerability.activated',
        'health.damage_invulnerability.blocked',
        'health.player_health.current',
        FIXED_PROMPT_BINDING_EVENT_TYPE,
        PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
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
      observedCompleteSupportedCount: 21,
      targetProfileCompleteSupported: false,
      blockers: [
        `capability_qa_report_missing_required_probe:${WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:21/59'
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
      `capability_qa_report_missing_required_probe:${HEALTH_DAMAGE_INVULNERABILITY_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${MOVEMENT_CROUCH_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID}`,
      `capability_qa_report_missing_required_probe:${PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID}`,
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
    pickupStateFields?: boolean;
    spawnEnemyWaveOrderedFields?: boolean;
    weaponDeathResetStateFields?: boolean;
    weaponRapidFireStateFields?: boolean;
    weaponSpreadShotStateFields?: boolean;
    weaponReplacementStateFields?: boolean;
  } = {}
) {
  const { plan } = buildDefaultWeaponQaPlan();
  const observed = [
    ...(eventTypes.includes(ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE)
      ? [
          {
            capabilityId: artifactLineageNoManualPatchCapabilityId,
            probeId: ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID,
            action: 'verify_lineage',
            eventType: ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
            eventTypes,
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
    ...(eventTypes.includes(ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE)
      ? [
          {
            capabilityId: enemyBossAttackPatternCapabilityId,
            probeId: ENEMY_BOSS_ATTACK_PATTERN_REQUIRED_PROBE_ID,
            action: 'verify_boss_attack_pattern',
            eventType: ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
            eventTypes,
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
    ...(eventTypes.includes(ENEMY_BOSS_LIFECYCLE_EVENT_TYPE)
      ? [
          {
            capabilityId: enemyBossLifecycleCapabilityId,
            probeId: ENEMY_BOSS_LIFECYCLE_REQUIRED_PROBE_ID,
            action: 'verify_boss_lifecycle',
            eventType: ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
            eventTypes,
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
    ...(eventTypes.includes(ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE)
      ? [
          {
            capabilityId: enemyBossPhaseTransitionCapabilityId,
            probeId: ENEMY_BOSS_PHASE_TRANSITION_REQUIRED_PROBE_ID,
            action: 'verify_boss_phase_transition',
            eventType: ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
            eventTypes,
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
    ...(eventTypes.includes('camera.side_follow.active')
      ? [
          {
            capabilityId: cameraCapabilityId,
            probeId: CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID,
            action: 'move',
            eventType: 'camera.side_follow.active',
            eventTypes,
            status: 'observed' as const,
            sourceRef: 'qa_report.snapshot.camera.scrollX'
          }
        ]
      : []),
    ...(eventTypes.includes('collision.platform.grounded')
      ? [
          {
            capabilityId: collisionCapabilityId,
            probeId: COLLISION_PLATFORM_REQUIRED_PROBE_ID,
            action: 'collide',
            eventType: 'collision.platform.grounded',
            eventTypes,
            status: 'observed' as const,
            sourceRef: 'qa_report.snapshot.player.onGround'
          }
        ]
      : []),
    ...(eventTypes.includes('player.fired')
      ? [
          {
            capabilityId: defaultWeaponCapabilityId,
            probeId: DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID,
            action: 'fire',
            eventType: 'player.fired',
            eventTypes,
            status: 'observed' as const,
            sourceRef: 'qa_report.capability_runtime'
          }
        ]
      : []),
    ...(eventTypes.includes('combat.airborne_fire.fired')
      ? [
          {
            capabilityId: airborneFireCapabilityId,
            probeId: COMBAT_AIRBORNE_FIRE_REQUIRED_PROBE_ID,
            action: 'fire',
            eventType: 'combat.airborne_fire.fired',
            eventTypes,
            status: 'observed' as const,
            sourceRef: 'qa_report.capability_runtime'
          }
        ]
      : []),
    ...(eventTypes.includes('projectile.spawned')
      ? [
          {
            capabilityId: projectileCapabilityId,
            probeId: COMBAT_PROJECTILE_REQUIRED_PROBE_ID,
            action: 'fire',
            eventType: 'projectile.spawned',
            eventTypes,
            status: 'observed' as const,
            sourceRef: 'qa_report.capability_runtime'
          }
        ]
      : []),
    ...(eventTypes.includes('movement.crouch.entered')
      ? [
          {
            capabilityId: crouchCapabilityId,
            probeId: MOVEMENT_CROUCH_REQUIRED_PROBE_ID,
            action: 'crouch',
            eventType: 'movement.crouch.entered',
            eventTypes,
            crouching: true,
            heightScale: MOVEMENT_CROUCH_HEIGHT_SCALE,
            status: 'observed' as const,
            sourceRef: 'qa_report.capability_runtime'
          }
        ]
      : []),
    ...(eventTypes.includes('health.damage_invulnerability.blocked')
      ? [
          {
            capabilityId: damageInvulnerabilityCapabilityId,
            probeId: HEALTH_DAMAGE_INVULNERABILITY_REQUIRED_PROBE_ID,
            action: 'block_damage',
            eventType: 'health.damage_invulnerability.blocked',
            eventTypes,
            status: 'observed' as const,
            sourceRef: 'qa_report.capability_runtime'
          }
        ]
      : []),
    ...(eventTypes.includes('pickup.collectible.collected')
      ? [
          {
            capabilityId: pickupCapabilityId,
            probeId: PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID,
            action: 'collect',
            eventType: 'pickup.collectible.collected',
            eventTypes,
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
    ...(eventTypes.includes('player.jumped')
      ? [
          {
            capabilityId: movementCapabilityId,
            probeId: MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID,
            action: 'jump',
            eventType: 'player.jumped',
            eventTypes,
            status: 'observed' as const,
            sourceRef: 'qa_report.capability_runtime'
          }
        ]
      : []),
    ...(eventTypes.includes('spawn.static.triggered')
      ? [
          {
            capabilityId: spawnStaticCapabilityId,
            probeId: SPAWN_STATIC_REQUIRED_PROBE_ID,
            action: 'spawn',
            eventType: 'spawn.static.triggered',
            eventTypes,
            status: 'observed' as const,
            sourceRef: 'qa_report.snapshot.waves'
          }
        ]
      : []),
    ...(eventTypes.includes('spawn.enemy_wave.ordered')
      ? [
          {
            capabilityId: spawnEnemyWaveCapabilityId,
            probeId: SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID,
            action: 'spawn',
            eventType: 'spawn.enemy_wave.ordered',
            eventTypes,
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
    ...(eventTypes.includes('health.player_health.current')
      ? [
          {
            capabilityId: healthCapabilityId,
            probeId: HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID,
            action: 'observe',
            eventType: 'health.player_health.current',
            eventTypes,
            status: 'observed' as const,
            sourceRef: 'qa_report.snapshot.health'
          }
        ]
      : []),
    ...(eventTypes.includes(FIXED_PROMPT_BINDING_EVENT_TYPE)
      ? [
          {
            capabilityId: fixedPromptBindingCapabilityId,
            probeId: FIXED_PROMPT_BINDING_REQUIRED_PROBE_ID,
            action: 'observe',
            eventType: FIXED_PROMPT_BINDING_EVENT_TYPE,
            eventTypes,
            status: 'observed' as const,
            sourceRef: 'target_profile.fixedPrompt.sha256'
          }
        ]
      : []),
    ...(eventTypes.includes(PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE)
      ? [
          {
            capabilityId: profileBindingCapabilityId,
            probeId: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_REQUIRED_PROBE_ID,
            action: 'observe',
            eventType: PROFILE_DEEPSEEK_RUN_AND_GUN_VALIDATION_EVENT_TYPE,
            eventTypes,
            status: 'observed' as const,
            sourceRef: 'canonical_dsl.profile.id'
          }
        ]
      : []),
    ...(eventTypes.includes(WEAPON_DEATH_RESET_EVENT_TYPE)
      ? [
          {
            capabilityId: deathResetCapabilityId,
            probeId: WEAPON_DEATH_RESET_REQUIRED_PROBE_ID,
            action: 'restore_initial_weapon',
            eventType: WEAPON_DEATH_RESET_EVENT_TYPE,
            eventTypes,
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
    ...(eventTypes.includes(WEAPON_RAPID_FIRE_BURST_EVENT_TYPE)
      ? [
          {
            capabilityId: rapidFireCapabilityId,
            probeId: WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID,
            action: 'fire_burst',
            eventType: WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
            eventTypes,
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
    ...(eventTypes.includes(WEAPON_SPREAD_SHOT_EVENT_TYPE)
      ? [
          {
            capabilityId: spreadShotCapabilityId,
            probeId: WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID,
            action: 'fire_spread',
            eventType: WEAPON_SPREAD_SHOT_EVENT_TYPE,
            eventTypes,
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
    ...(eventTypes.includes(WEAPON_REPLACEMENT_RULE_EVENT_TYPE)
      ? [
          {
            capabilityId: replacementRuleCapabilityId,
            probeId: WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID,
            action: 'collect_weapon_pickup',
            eventType: WEAPON_REPLACEMENT_RULE_EVENT_TYPE,
            eventTypes,
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

function buildSingleCapabilityQaReport(input: {
  capabilityId: string;
  packageContract: GameplayCapabilityPackageContract;
  eventType: string;
  probeId: string;
  action: string;
  sourceRef: string;
  stateFields: Record<string, unknown> | undefined;
}) {
  const packages = [input.packageContract];
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
          {
            capabilityId: input.capabilityId,
            probeId: input.probeId,
            action: input.action,
            eventType: input.eventType,
            eventTypes: [input.eventType],
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
    createCameraSideFollowPackageContract(),
    createCollisionPlatformPackageContract(),
    createCombatAirborneFirePackageContract(),
    createDefaultStraightSingleWeaponPackageContract(),
    createCombatProjectilePackageContract(),
    createFixedPromptBindingPackageContract(),
    createProfileDeepSeekRunAndGunValidationPackageContract(),
    createWeaponDeathResetPackageContract(),
    createWeaponRapidFirePackageContract(),
    createWeaponSpreadShotPackageContract(),
    createWeaponReplacementRulePackageContract(),
    createMovementCrouchPackageContract(),
    createHealthDamageInvulnerabilityPackageContract(),
    createPickupCollectiblePackageContract(),
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
      cameraCapabilityId,
      collisionCapabilityId,
      airborneFireCapabilityId,
      defaultWeaponCapabilityId,
      projectileCapabilityId,
      fixedPromptBindingCapabilityId,
      profileBindingCapabilityId,
      deathResetCapabilityId,
      rapidFireCapabilityId,
      spreadShotCapabilityId,
      replacementRuleCapabilityId,
      crouchCapabilityId,
      damageInvulnerabilityCapabilityId,
      pickupCapabilityId,
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
