import { CANONICAL_GAME_DSL_V02_SCHEMA_VERSION } from './schemas/game-dsl-v0.2.schema.js';
import {
  GAMEPLAY_CAPABILITY_SUPPORT_EVIDENCE_DIMENSIONS,
  GameplayCapabilityRegistry as DEFAULT_GAMEPLAY_CAPABILITY_REGISTRY,
  deriveGameplayCapabilitySupportClassification,
  deriveGameplayCapabilitySupportEvidenceDimensions,
  findGameplayCapability,
  getMissingGameplayCapabilitySupportEvidenceDimensions,
  getMissingGameplayCapabilitySupportEvidencePrerequisites,
  isCompleteSupportedEvidenceDimensions,
  type GameplayCapabilityDerivedSupportClassification,
  type GameplayCapabilityRegistry,
  type GameplayCapabilitySupportEvidenceDimension,
  type GameplayCapabilitySupportEvidenceDimensions,
  type GameplayCapabilitySupportEvidencePrerequisite
} from './gameplay-capabilities/registry.js';

export const DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1_ID = 'DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1';
export const DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1_VERSION = 'v1';
export const DEEPSEEK_RUN_AND_GUN_FIXED_PROMPT_CHARACTER_COUNT = 580;
export const DEEPSEEK_RUN_AND_GUN_FIXED_PROMPT_SHA256 = '5bff34f8b97ea7ee5b0e66b5a17b893eda11fd327d3dadc128c30f3123c64686';

export const DEEPSEEK_RUN_AND_GUN_FIXED_USER_VALIDATION_PROMPT = [
  '请生成一款原创的16位像素风横版跑射游戏，节奏参考经典街机跑射作品，但不得复用任何现有作品的角色、名称、美术、音乐、关卡布局或台词。游戏名为《赤焰突围》，单人游玩。',
  '玩家从左向右推进，可左右移动、跳跃、下蹲和射击；空中可射击，受击后短暂无敌。初始武器为直线单发，关卡中可拾取散射弹和连射弹；拾取新武器时替换当前武器，死亡后恢复初始武器。玩家有3点生命和2次重试机会，生命归零时消耗一次重试并从最近检查点复活；无重试时进入失败界面，可重新开始。',
  '制作一个连续关卡，分为丛林入口、金属桥和敌军核心三段。镜头跟随玩家且不能越过关卡边界。丛林入口包含巡逻步兵、固定炮台、跳台和一个检查点；金属桥包含从右侧进入的飞行敌人、间歇爆炸区域和武器补给；敌军核心先关闭入口，再生成两波敌人，清空后开启首领战。',
  '首领为原创机械体“熔核守卫”，有两个阶段。第一阶段在地面左右移动并发射直线弹；生命低于一半后进入第二阶段，提高移动速度，并交替使用三向弹与从上方落下的危险区域。首领被击败后停止生成敌人，播放简短胜利反馈并进入通关界面。',
  'HUD 显示玩家生命、剩余重试、当前武器和首领生命。玩家子弹只伤害敌人，敌方子弹和危险区域只伤害玩家；敌人与玩家接触也造成伤害。所有生成、碰撞、状态切换、检查点、胜负条件和界面跳转必须显式表达，不得依赖人工补丁、隐藏脚本或未声明的回退路径。'
].join('\n\n');

export type DeepSeekRunAndGunVerificationClass = 'EXECUTABLE' | 'CONTRACT_VERIFIABLE' | 'ARTIFACT_VERIFIABLE' | 'USER_VERIFIABLE';
export type DeepSeekRunAndGunRequirementCompletionState =
  | 'CONDITIONAL_LEGACY_BACKED'
  | 'REQUIRES_EXPANSION'
  | 'REQUIRES_PIPELINE_EVIDENCE'
  | 'SCHEMA_EXPRESSIBLE_ONLY'
  | 'USER_VERIFIABLE_NOT_AUTOMATED';

export type DeepSeekRunAndGunCapabilityCluster = {
  id: string;
  title: string;
  requiredCapabilityIds: string[];
  targetCompletionCondition: string;
};

export type DeepSeekRunAndGunRequirement = {
  id: string;
  text: string;
  verificationClass: DeepSeekRunAndGunVerificationClass;
  primaryClusterId: string;
  existingConstruct: string;
  requiredNewConstruct: string;
  completionState: DeepSeekRunAndGunRequirementCompletionState;
};

export type DeepSeekRunAndGunTargetProfile = {
  id: typeof DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1_ID;
  version: typeof DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1_VERSION;
  authoritativeDsl: {
    family: 'CanonicalGameDsl';
    schemaVersion: typeof CANONICAL_GAME_DSL_V02_SCHEMA_VERSION;
  };
  fixedPrompt: {
    text: string;
    characterCount: typeof DEEPSEEK_RUN_AND_GUN_FIXED_PROMPT_CHARACTER_COUNT;
    sha256: typeof DEEPSEEK_RUN_AND_GUN_FIXED_PROMPT_SHA256;
  };
  targetCompletionCondition: 'all_required_capabilities_complete_supported';
  requirements: DeepSeekRunAndGunRequirement[];
  capabilityClusters: DeepSeekRunAndGunCapabilityCluster[];
};

export type DeepSeekRunAndGunProfileCapabilitySupport = {
  capabilityId: string;
  registered: boolean;
  classification: GameplayCapabilityDerivedSupportClassification;
  evidenceDimensions: GameplayCapabilitySupportEvidenceDimensions;
  missingEvidenceDimensions: GameplayCapabilitySupportEvidenceDimension[];
  missingSupportEvidencePrerequisites: GameplayCapabilitySupportEvidencePrerequisite[];
  completeSupported: boolean;
  legacyBacked: boolean;
};

export type DeepSeekRunAndGunProfileSupportSummary = {
  profileId: typeof DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1_ID;
  profileVersion: typeof DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1_VERSION;
  summary: {
    requirementCount: number;
    capabilityClusterCount: number;
    requiredCapabilityCount: number;
    registeredCapabilityCount: number;
    completeSupportedCount: number;
    legacyBackedCapabilityCount: number;
  };
  capabilities: DeepSeekRunAndGunProfileCapabilitySupport[];
};

const emptyEvidenceDimensions: GameplayCapabilitySupportEvidenceDimensions = {
  schema_expressible: false,
  normalized: false,
  compiled: false,
  runtime_consumed: false,
  qa_observed: false
};

const capabilityClusters: DeepSeekRunAndGunCapabilityCluster[] = [
  cluster('M1', 'support vocabulary and authoritative target profile', [
    'profile.deepseek_run_and_gun_validation.v1',
    'metadata.fixed_prompt_binding.v1'
  ]),
  cluster('M2', 'player movement and action state', [
    'movement.run_jump.v1',
    'movement.crouch.v1',
    'combat.projectile.v1',
    'combat.airborne_fire.v1',
    'health.damage_invulnerability.v1'
  ]),
  cluster('M3', 'weapon and loadout lifecycle', [
    'combat.projectile.v1',
    'pickup.collectible.v1',
    'weapon.default_straight_single.v1',
    'weapon.spread_shot.v1',
    'weapon.rapid_fire.v1',
    'weapon.replacement_rule.v1',
    'weapon.death_reset.v1'
  ]),
  cluster('M4', 'player health retry checkpoint failure and restart lifecycle', [
    'health.player_health_points.v1',
    'rules.retry_count.v1',
    'rules.checkpoint_restore.v1',
    'ui.failure_restart.v1'
  ]),
  cluster('M5', 'ordered level progression', [
    'scene.ordered_segments.v1',
    'camera.side_follow.v1',
    'camera.bounds_clamp.v1',
    'rules.encounter_gate.v1',
    'spawn.enemy_wave.v1',
    'goal.boss_unlock.v1'
  ]),
  cluster('M6', 'enemy hazard and supply archetypes', [
    'enemy.patrol_infantry.v1',
    'enemy.fixed_turret.v1',
    'enemy.flying_right_entry.v1',
    'hazard.timed_explosion.v1',
    'collision.platform.v1',
    'pickup.weapon_supply.v1',
    'spawn.static.v1'
  ]),
  cluster('M7', 'boss lifecycle and phase transitions', [
    'enemy.boss_lifecycle.v1',
    'enemy.boss_phase_transition.v1',
    'enemy.boss_attack_pattern.v1',
    'hazard.falling_area.v1',
    'spawn.stop_on_boss_defeat.v1'
  ]),
  cluster('M8', 'HUD victory failure transitions feedback and visual metadata', [
    'ui.hud_player_health.v1',
    'ui.hud_retries.v1',
    'ui.hud_current_weapon.v1',
    'ui.hud_boss_health.v1',
    'ui.win_failure_transitions.v1',
    'feedback.victory_declaration.v1',
    'scene.visual_presentation_metadata.v1'
  ]),
  cluster('M9', 'DeepSeek structured authoritative draft path', ['provider.deepseek_authoritative_draft.v1']),
  cluster('M10', 'canonical normalization compiler and runtime plan', [
    'canonical.semantic_preservation.v1',
    'runtime.plan_coverage.v1',
    'collision.damage_affinity_matrix.v1',
    'rules.state_transition_graph.v1'
  ]),
  cluster('M11', 'runtime manifest artifact binding and hash evidence', [
    'runtime.manifest_binding.v1',
    'runtime.module_load_receipt.v1',
    'artifact.lineage_no_manual_patch.v1',
    'artifact.no_hidden_script.v1',
    'spawn.explicit_declarations.v1'
  ]),
  cluster('M12', 'negative metamorphic replay and holdout validation', [
    'validation.fail_closed_unknown_nodes.v1',
    'validation.metamorphic_semantic_hash.v1',
    'validation.replay_stability.v1',
    'generation.fallback_policy_fail_closed.v1'
  ]),
  cluster('M13', 'fixed prompt automated validation', ['validation.fixed_prompt_end_to_end.v1']),
  cluster('M14', 'Oracle final review', ['review.oracle_final_gate.v1']),
  cluster('M15', 'user manual validation', ['validation.user_acceptance_gate.v1'])
];

const requirements: DeepSeekRunAndGunRequirement[] = [
  req('R001', 'Original game with no reuse of existing protected creative material.', 'USER_VERIFIABLE', 'M8', 'Prompt policy text only', 'originality_provenance_metadata', 'USER_VERIFIABLE_NOT_AUTOMATED'),
  req('R002', '16-bit pixel style.', 'ARTIFACT_VERIFIABLE', 'M8', 'Visual hints only', 'visual_presentation_metadata', 'REQUIRES_EXPANSION'),
  req('R003', 'Side-scrolling run-and-gun game.', 'EXECUTABLE', 'M1', 'side_scrolling_run_and_gun legacy profile', 'target_profile_binding', 'CONDITIONAL_LEGACY_BACKED'),
  req('R004', 'Arcade-paced reference without copying existing works.', 'USER_VERIFIABLE', 'M8', 'Prompt policy text only', 'pacing_intent_metadata', 'USER_VERIFIABLE_NOT_AUTOMATED'),
  req('R005', 'Game title is Chi Yan Tu Wei.', 'CONTRACT_VERIFIABLE', 'M1', 'metadata/title', 'fixed_title_binding', 'SCHEMA_EXPRESSIBLE_ONLY'),
  req('R006', 'Single-player.', 'CONTRACT_VERIFIABLE', 'M1', 'profile/player count implied', 'player_count', 'REQUIRES_EXPANSION'),
  req('R007', 'Player advances from left to right.', 'EXECUTABLE', 'M5', 'side-scrolling direction implied', 'progression_direction', 'REQUIRES_EXPANSION'),
  req('R008', 'Player can move left and right.', 'EXECUTABLE', 'M2', 'movement.run_jump.v1 partially', 'horizontal_movement_action', 'CONDITIONAL_LEGACY_BACKED'),
  req('R009', 'Player can jump.', 'EXECUTABLE', 'M2', 'movement.run_jump.v1', 'jump_action', 'CONDITIONAL_LEGACY_BACKED'),
  req('R010', 'Player can crouch.', 'EXECUTABLE', 'M2', 'none', 'crouch_action', 'REQUIRES_EXPANSION'),
  req('R011', 'Player can shoot.', 'EXECUTABLE', 'M2', 'combat.projectile.v1', 'fire_action', 'CONDITIONAL_LEGACY_BACKED'),
  req('R012', 'Player can shoot while airborne.', 'EXECUTABLE', 'M2', 'projectile plus jump only implicit', 'airborne_fire_allowed', 'REQUIRES_EXPANSION'),
  req('R013', 'Player becomes briefly invulnerable after damage.', 'EXECUTABLE', 'M2', 'health.damage_invulnerability.v1 contract seeded', 'damage_invulnerability_window', 'REQUIRES_EXPANSION'),
  req('R014', 'Initial weapon is straight single shot.', 'EXECUTABLE', 'M3', 'projectile weapon hints', 'default_weapon_straight_single', 'REQUIRES_EXPANSION'),
  req('R015', 'Player can pick up spread shot.', 'EXECUTABLE', 'M3', 'pickup.collectible.v1 partially', 'spread_weapon_pickup', 'REQUIRES_EXPANSION'),
  req('R016', 'Player can pick up rapid-fire shot.', 'EXECUTABLE', 'M3', 'pickup.collectible.v1 partially', 'rapid_fire_weapon_pickup', 'REQUIRES_EXPANSION'),
  req('R017', 'New weapon pickup replaces current weapon.', 'EXECUTABLE', 'M3', 'none', 'weapon_replacement_rule', 'REQUIRES_EXPANSION'),
  req('R018', 'Death restores initial weapon.', 'EXECUTABLE', 'M3', 'none', 'loadout_reset_on_death', 'REQUIRES_EXPANSION'),
  req('R019', 'Player has 3 health points.', 'EXECUTABLE', 'M4', 'health partially implied', 'player_health_points', 'REQUIRES_EXPANSION'),
  req('R020', 'Player has 2 retries.', 'EXECUTABLE', 'M4', 'lives/restart loop partial legacy', 'retry_count', 'REQUIRES_EXPANSION'),
  req('R021', 'At zero health, consume one retry and respawn at nearest checkpoint.', 'EXECUTABLE', 'M4', 'rules.restart_loop.v1 partial', 'retry_checkpoint_respawn_rule', 'REQUIRES_EXPANSION'),
  req('R022', 'With no retries, enter failure screen.', 'EXECUTABLE', 'M4', 'win/lose partial', 'failure_state_screen', 'REQUIRES_EXPANSION'),
  req('R023', 'Failure screen can restart.', 'EXECUTABLE', 'M4', 'restart loop partial', 'restart_from_failure', 'REQUIRES_EXPANSION'),
  req('R024', 'One continuous level contains three named segments.', 'CONTRACT_VERIFIABLE', 'M5', 'scenes/segments deferred', 'ordered_named_segments', 'REQUIRES_EXPANSION'),
  req('R025', 'Camera follows player and cannot cross level boundaries.', 'EXECUTABLE', 'M5', 'camera.side_follow.v1', 'camera_bounds', 'CONDITIONAL_LEGACY_BACKED'),
  req('R026', 'Jungle entrance has patrol infantry.', 'EXECUTABLE', 'M6', 'enemy waves partial', 'enemy_archetype_patrol_infantry', 'REQUIRES_EXPANSION'),
  req('R027', 'Jungle entrance has fixed turret.', 'EXECUTABLE', 'M6', 'spawn.static.v1 partial', 'enemy_archetype_fixed_turret', 'REQUIRES_EXPANSION'),
  req('R028', 'Jungle entrance has jump platforms.', 'EXECUTABLE', 'M6', 'collision.platform.v1', 'platform_segment_placement', 'CONDITIONAL_LEGACY_BACKED'),
  req('R029', 'Jungle entrance has one checkpoint.', 'EXECUTABLE', 'M4', 'checkpoints deferred', 'checkpoint_node', 'REQUIRES_EXPANSION'),
  req('R030', 'Metal bridge has flying enemies entering from right.', 'EXECUTABLE', 'M6', 'enemy waves partial', 'flying_enemy_right_entry', 'REQUIRES_EXPANSION'),
  req('R031', 'Metal bridge has intermittent explosion areas.', 'EXECUTABLE', 'M6', 'hazard.contact_damage.v1 partial', 'timed_explosion_hazard', 'REQUIRES_EXPANSION'),
  req('R032', 'Metal bridge has weapon supply.', 'EXECUTABLE', 'M3', 'pickup.collectible.v1 partial', 'weapon_supply_node', 'REQUIRES_EXPANSION'),
  req('R033', 'Enemy core closes entrance first.', 'EXECUTABLE', 'M5', 'none', 'encounter_gate_close_entrance', 'REQUIRES_EXPANSION'),
  req('R034', 'Enemy core spawns two waves after entrance closes.', 'EXECUTABLE', 'M5', 'spawn.enemy_wave.v1 partial', 'ordered_wave_sequence', 'REQUIRES_EXPANSION'),
  req('R035', 'Clearing waves opens boss battle.', 'EXECUTABLE', 'M5', 'objective/wave partial', 'boss_unlock_on_wave_clear', 'REQUIRES_EXPANSION'),
  req('R036', 'Boss is original mechanical entity named Rong He Shou Wei.', 'CONTRACT_VERIFIABLE', 'M7', 'bosses schema expressible only', 'boss_identity_node', 'REQUIRES_EXPANSION'),
  req('R037', 'Boss has two phases.', 'EXECUTABLE', 'M7', 'boss phases schema expressible only', 'boss_phase_count', 'REQUIRES_EXPANSION'),
  req('R038', 'Phase 1 moves left/right on ground and fires straight bullets.', 'EXECUTABLE', 'M7', 'projectile and movement partial', 'boss_phase1_behavior', 'REQUIRES_EXPANSION'),
  req('R039', 'Below half health, boss enters phase 2.', 'EXECUTABLE', 'M7', 'boss phases schema expressible only', 'hp_threshold_phase_transition', 'REQUIRES_EXPANSION'),
  req('R040', 'Phase 2 increases movement speed.', 'EXECUTABLE', 'M7', 'none', 'boss_phase_speed_modifier', 'REQUIRES_EXPANSION'),
  req('R041', 'Phase 2 alternates three-way bullets and falling hazards from above.', 'EXECUTABLE', 'M7', 'projectile/hazard partial', 'boss_alternating_attack_pattern', 'REQUIRES_EXPANSION'),
  req('R042', 'Boss defeat stops enemy spawning.', 'EXECUTABLE', 'M7', 'none', 'stop_spawn_on_boss_defeat', 'REQUIRES_EXPANSION'),
  req('R043', 'Boss defeat plays short victory feedback.', 'ARTIFACT_VERIFIABLE', 'M8', 'feedback/effects unsupported', 'victory_feedback_declaration', 'REQUIRES_EXPANSION'),
  req('R044', 'Boss defeat enters win screen.', 'EXECUTABLE', 'M8', 'win/lose partial', 'win_screen_transition', 'REQUIRES_EXPANSION'),
  req('R045', 'HUD shows player health.', 'EXECUTABLE', 'M8', 'UI default partial', 'hud_player_health', 'REQUIRES_EXPANSION'),
  req('R046', 'HUD shows remaining retries.', 'EXECUTABLE', 'M8', 'none', 'hud_remaining_retries', 'REQUIRES_EXPANSION'),
  req('R047', 'HUD shows current weapon.', 'EXECUTABLE', 'M8', 'none', 'hud_current_weapon', 'REQUIRES_EXPANSION'),
  req('R048', 'HUD shows boss health.', 'EXECUTABLE', 'M8', 'boss HUD unsupported', 'hud_boss_health', 'REQUIRES_EXPANSION'),
  req('R049', 'Player bullets only damage enemies.', 'EXECUTABLE', 'M10', 'combat.projectile.v1 partial', 'damage_affinity_player_projectile', 'REQUIRES_EXPANSION'),
  req('R050', 'Enemy bullets and hazardous areas only damage player.', 'EXECUTABLE', 'M10', 'hazard.contact_damage.v1 partial', 'damage_affinity_enemy_hazard', 'REQUIRES_EXPANSION'),
  req('R051', 'Enemy contact damages player.', 'EXECUTABLE', 'M10', 'hazard.contact_damage.v1', 'enemy_contact_damage', 'CONDITIONAL_LEGACY_BACKED'),
  req('R052', 'All spawning is explicitly expressed.', 'CONTRACT_VERIFIABLE', 'M11', 'spawn rules partial', 'explicit_spawn_declarations', 'REQUIRES_EXPANSION'),
  req('R053', 'All collisions are explicitly expressed.', 'CONTRACT_VERIFIABLE', 'M10', 'collision partial', 'explicit_collision_matrix', 'REQUIRES_EXPANSION'),
  req('R054', 'All state transitions are explicitly expressed.', 'CONTRACT_VERIFIABLE', 'M10', 'partial win/lose', 'explicit_state_transition_graph', 'REQUIRES_EXPANSION'),
  req('R055', 'Checkpoints are explicitly expressed.', 'CONTRACT_VERIFIABLE', 'M4', 'checkpoints deferred', 'explicit_checkpoint_nodes', 'REQUIRES_EXPANSION'),
  req('R056', 'Win and lose conditions are explicitly expressed.', 'CONTRACT_VERIFIABLE', 'M8', 'winLose partial', 'explicit_terminal_conditions', 'REQUIRES_EXPANSION'),
  req('R057', 'UI transitions are explicitly expressed.', 'CONTRACT_VERIFIABLE', 'M8', 'UI partial', 'explicit_ui_transition_graph', 'REQUIRES_EXPANSION'),
  req('R058', 'No manual patch.', 'CONTRACT_VERIFIABLE', 'M11', 'pipeline policy partial', 'manual_patch_forbidden_evidence', 'REQUIRES_PIPELINE_EVIDENCE'),
  req('R059', 'No hidden script.', 'CONTRACT_VERIFIABLE', 'M11', 'pipeline policy partial', 'hidden_script_forbidden_evidence', 'REQUIRES_PIPELINE_EVIDENCE'),
  req('R060', 'No undeclared fallback path.', 'CONTRACT_VERIFIABLE', 'M12', 'generation path receipt partial', 'fallback_policy_fail_closed', 'REQUIRES_PIPELINE_EVIDENCE')
];

export const DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1: DeepSeekRunAndGunTargetProfile = {
  id: DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1_ID,
  version: DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1_VERSION,
  authoritativeDsl: {
    family: 'CanonicalGameDsl',
    schemaVersion: CANONICAL_GAME_DSL_V02_SCHEMA_VERSION
  },
  fixedPrompt: {
    text: DEEPSEEK_RUN_AND_GUN_FIXED_USER_VALIDATION_PROMPT,
    characterCount: DEEPSEEK_RUN_AND_GUN_FIXED_PROMPT_CHARACTER_COUNT,
    sha256: DEEPSEEK_RUN_AND_GUN_FIXED_PROMPT_SHA256
  },
  targetCompletionCondition: 'all_required_capabilities_complete_supported',
  requirements,
  capabilityClusters
};

export function buildDeepSeekRunAndGunValidationProfileSupportSummary(
  registry: GameplayCapabilityRegistry = DEFAULT_GAMEPLAY_CAPABILITY_REGISTRY
): DeepSeekRunAndGunProfileSupportSummary {
  const capabilityIds = uniqueSortedStrings(capabilityClusters.flatMap((clusterItem) => clusterItem.requiredCapabilityIds));
  const capabilities = capabilityIds.map((capabilityId) => buildCapabilitySupport(capabilityId, registry));

  return {
    profileId: DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1_ID,
    profileVersion: DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1_VERSION,
    summary: {
      requirementCount: requirements.length,
      capabilityClusterCount: capabilityClusters.length,
      requiredCapabilityCount: capabilityIds.length,
      registeredCapabilityCount: capabilities.filter((capability) => capability.registered).length,
      completeSupportedCount: capabilities.filter((capability) => capability.completeSupported).length,
      legacyBackedCapabilityCount: capabilities.filter((capability) => capability.legacyBacked).length
    },
    capabilities
  };
}

function buildCapabilitySupport(capabilityId: string, registry: GameplayCapabilityRegistry): DeepSeekRunAndGunProfileCapabilitySupport {
  const capability = findGameplayCapability(capabilityId, registry);
  if (capability === undefined) {
    return {
      capabilityId,
      registered: false,
      classification: 'UNSUPPORTED',
      evidenceDimensions: emptyEvidenceDimensions,
      missingEvidenceDimensions: [...GAMEPLAY_CAPABILITY_SUPPORT_EVIDENCE_DIMENSIONS],
      missingSupportEvidencePrerequisites: getMissingGameplayCapabilitySupportEvidencePrerequisites(undefined),
      completeSupported: false,
      legacyBacked: false
    };
  }

  const evidenceDimensions = deriveGameplayCapabilitySupportEvidenceDimensions(capability);
  return {
    capabilityId,
    registered: true,
    classification: deriveGameplayCapabilitySupportClassification(capability),
    evidenceDimensions,
    missingEvidenceDimensions: getMissingGameplayCapabilitySupportEvidenceDimensions(evidenceDimensions),
    missingSupportEvidencePrerequisites: getMissingGameplayCapabilitySupportEvidencePrerequisites(capability),
    completeSupported: isCompleteSupportedEvidenceDimensions(evidenceDimensions),
    legacyBacked: capability.status === 'runtime_backed'
  };
}

function cluster(id: string, title: string, requiredCapabilityIds: string[]): DeepSeekRunAndGunCapabilityCluster {
  return {
    id,
    title,
    requiredCapabilityIds: uniqueSortedStrings(requiredCapabilityIds),
    targetCompletionCondition: 'all required capability IDs reach complete_supported evidence for this cluster'
  };
}

function req(
  id: string,
  text: string,
  verificationClass: DeepSeekRunAndGunVerificationClass,
  primaryClusterId: string,
  existingConstruct: string,
  requiredNewConstruct: string,
  completionState: DeepSeekRunAndGunRequirementCompletionState
): DeepSeekRunAndGunRequirement {
  return {
    id,
    text,
    verificationClass,
    primaryClusterId,
    existingConstruct,
    requiredNewConstruct,
    completionState
  };
}

function uniqueSortedStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}
