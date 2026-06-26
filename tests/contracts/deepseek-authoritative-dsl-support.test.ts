import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1,
  GAMEPLAY_CAPABILITY_DERIVED_SUPPORT_CLASSIFICATIONS,
  GAMEPLAY_CAPABILITY_SUPPORT_EVIDENCE_DIMENSIONS,
  GameplayCapabilityRegistry,
  RuntimeGenreRegistry,
  buildDeepSeekRunAndGunValidationProfileSupportSummary,
  buildDslConsumptionReport,
  deriveGameplayCapabilitySupportClassification,
  deriveGameplayCapabilitySupportEvidenceDimensions,
  findGameplayCapability,
  getMissingGameplayCapabilitySupportEvidenceDimensions,
  isCompleteSupportedEvidenceDimensions,
  isCompleteSupportedGameplayCapability,
  type GameplayCapabilityDescriptor,
  validateAndNormalizeRawGameDsl
} from '../../packages/game-dsl/src/index.js';
import { createSideScrollingRunAndGunRawDsl } from './fixtures.js';

describe('DeepSeek authoritative DSL support vocabulary', () => {
  it('freezes the fixed target profile identity', () => {
    expect(DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1.id).toBe('DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1');
    expect(DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1.version).toBe('v1');
    expect(DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1.fixedPrompt.characterCount).toBe(580);
    expect(createHash('sha256').update(DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1.fixedPrompt.text).digest('hex')).toBe(
      '5bff34f8b97ea7ee5b0e66b5a17b893eda11fd327d3dadc128c30f3123c64686'
    );
  });

  it('keeps the fixed requirement and cluster identities one-to-one', () => {
    const requirements = DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1.requirements;
    const clusters = DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1.capabilityClusters;

    expect(requirements).toHaveLength(60);
    expect(new Set(requirements.map((requirement) => requirement.id)).size).toBe(60);
    expect(clusters).toHaveLength(15);
    expect(new Set(clusters.map((cluster) => cluster.id)).size).toBe(15);

    const clusterIds = new Set(clusters.map((cluster) => cluster.id));
    for (const requirement of requirements) {
      expect(clusterIds.has(requirement.primaryClusterId)).toBe(true);
      expect(requirement.primaryClusterId).toMatch(/^M(?:[1-9]|1[0-5])$/);
    }
  });

  it('derives complete_supported only from all five evidence dimensions', () => {
    expect(GAMEPLAY_CAPABILITY_SUPPORT_EVIDENCE_DIMENSIONS).toEqual([
      'schema_expressible',
      'normalized',
      'compiled',
      'runtime_consumed',
      'qa_observed'
    ]);
    expect(GAMEPLAY_CAPABILITY_DERIVED_SUPPORT_CLASSIFICATIONS).toEqual([
      'COMPLETE_SUPPORTED',
      'CONDITIONAL_LEGACY_BACKED',
      'UNSUPPORTED',
      'DEFERRED',
      'CONTRACT_SEEDED'
    ]);

    const completeEvidence = {
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: true
    };
    expect(isCompleteSupportedEvidenceDimensions(completeEvidence)).toBe(true);

    for (const dimension of GAMEPLAY_CAPABILITY_SUPPORT_EVIDENCE_DIMENSIONS) {
      expect(isCompleteSupportedEvidenceDimensions({ ...completeEvidence, [dimension]: false })).toBe(false);
    }
  });

  it('does not let status or partial evidence manually override complete_supported', () => {
    const base = cloneCapability('movement.run_jump.v1');
    const statusOnly = {
      ...base,
      status: 'complete_supported',
      evidence: {
        dslSchema: true,
        normalizer: false,
        irCompiler: false,
        runtimeModule: false,
        amendmentOperations: false,
        capabilityOwnedQa: false,
        artifactEvidence: false,
        renderContract: false
      },
      qa: { requiredProbeIds: [], requiredProbesVerified: false },
      blockers: []
    } satisfies GameplayCapabilityDescriptor;

    expect(isCompleteSupportedGameplayCapability(statusOnly)).toBe(false);
    expect(deriveGameplayCapabilitySupportClassification(statusOnly)).not.toBe('COMPLETE_SUPPORTED');
    expect(getMissingGameplayCapabilitySupportEvidenceDimensions(statusOnly)).toEqual([
      'normalized',
      'compiled',
      'runtime_consumed',
      'qa_observed'
    ]);
  });

  it('keeps legacy-backed, schema-only, and contract-seeded capabilities below complete_supported', () => {
    const legacyBacked = cloneCapability('pickup.collectible.v1');
    const contractSeeded = cloneCapability('health.damage_invulnerability.v1');
    const schemaOnly = {
      ...cloneCapability('goal.reach_exit.v1'),
      evidence: {
        dslSchema: true,
        normalizer: false,
        irCompiler: false,
        runtimeModule: false,
        amendmentOperations: false,
        capabilityOwnedQa: false,
        artifactEvidence: false,
        renderContract: false
      },
      qa: { requiredProbeIds: [], requiredProbesVerified: false }
    } satisfies GameplayCapabilityDescriptor;

    expect(deriveGameplayCapabilitySupportClassification(legacyBacked)).toBe('CONDITIONAL_LEGACY_BACKED');
    expect(isCompleteSupportedGameplayCapability(legacyBacked)).toBe(false);
    expect(deriveGameplayCapabilitySupportClassification(contractSeeded)).toBe('CONTRACT_SEEDED');
    expect(isCompleteSupportedGameplayCapability(contractSeeded)).toBe(false);
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(schemaOnly)).toMatchObject({ schema_expressible: true });
    expect(isCompleteSupportedGameplayCapability(schemaOnly)).toBe(false);
  });

  it('keeps the frozen target profile at zero complete_supported capabilities', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();

    expect(support.summary.completeSupportedCount).toBe(0);
    expect(support.summary.requirementCount).toBe(60);
    expect(support.summary.capabilityClusterCount).toBe(15);
    expect(support.summary.requiredCapabilityCount).toBe(59);
    expect(support.capabilities.some((capability) => capability.classification === 'CONDITIONAL_LEGACY_BACKED')).toBe(true);
    expect(support.capabilities.every((capability) => capability.completeSupported === false)).toBe(true);
  });

  it('registers fixed prompt metadata binding as package-backed but still incomplete support', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const capabilities = new Map(support.capabilities.map((capability) => [capability.capabilityId, capability]));

    expect(capabilities.get('metadata.fixed_prompt_binding.v1')).toMatchObject({
      registered: true,
      classification: 'CONTRACT_SEEDED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
  });

  it('registers the validation profile binding as package-backed but still incomplete support', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const capabilities = new Map(support.capabilities.map((capability) => [capability.capabilityId, capability]));

    expect(capabilities.get('profile.deepseek_run_and_gun_validation.v1')).toMatchObject({
      registered: true,
      classification: 'CONTRACT_SEEDED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
  });

  it('reports M2 action-state runtime loader evidence without QA completion', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const capabilities = new Map(support.capabilities.map((capability) => [capability.capabilityId, capability]));

    for (const capabilityId of ['movement.crouch.v1']) {
      expect(capabilities.get(capabilityId)).toMatchObject({
        registered: true,
        classification: 'DEFERRED',
        completeSupported: false,
        legacyBacked: false,
        evidenceDimensions: {
          schema_expressible: true,
          normalized: true,
          compiled: true,
          runtime_consumed: true,
          qa_observed: false
        },
        missingEvidenceDimensions: ['qa_observed']
      });
    }
    expect(capabilities.get('combat.airborne_fire.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
  });

  it('reports M2 damage invulnerability runtime loader evidence without QA completion', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const capabilities = new Map(support.capabilities.map((capability) => [capability.capabilityId, capability]));

    expect(capabilities.get('health.damage_invulnerability.v1')).toMatchObject({
      registered: true,
      classification: 'CONTRACT_SEEDED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
  });

  it('reports default straight single weapon runtime consumer evidence without QA completion', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const capabilities = new Map(support.capabilities.map((capability) => [capability.capabilityId, capability]));

    expect(capabilities.get('camera.side_follow.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
    expect(capabilities.get('weapon.default_straight_single.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
    expect(capabilities.get('combat.projectile.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
    expect(capabilities.get('movement.run_jump.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
  });

  it('reports spread-shot weapon package-backed evidence without QA completion', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const capabilities = new Map(support.capabilities.map((capability) => [capability.capabilityId, capability]));

    expect(capabilities.get('weapon.spread_shot.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
  });

  it('registers artifact lineage no-manual-patch as package-backed but still incomplete support', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const capabilities = new Map(support.capabilities.map((capability) => [capability.capabilityId, capability]));

    expect(capabilities.get('artifact.lineage_no_manual_patch.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
    expect(capabilities.get('artifact.no_hidden_script.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
    expect(capabilities.get('camera.bounds_clamp.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
    expect(capabilities.get('canonical.semantic_preservation.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
    expect(capabilities.get('collision.damage_affinity_matrix.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
    expect(capabilities.get('enemy.boss_attack_pattern.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
    expect(capabilities.get('enemy.boss_lifecycle.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
    expect(capabilities.get('enemy.boss_phase_transition.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
    expect(capabilities.get('enemy.fixed_turret.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
    expect(capabilities.get('enemy.flying_right_entry.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
    expect(capabilities.get('enemy.patrol_infantry.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
    expect(capabilities.get('feedback.victory_declaration.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
    expect(capabilities.get('generation.fallback_policy_fail_closed.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
    expect(capabilities.get('goal.boss_unlock.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
  });

  it('reports rapid-fire weapon package-backed evidence without QA completion', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const capabilities = new Map(support.capabilities.map((capability) => [capability.capabilityId, capability]));

    expect(capabilities.get('weapon.rapid_fire.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
  });

  it('registers weapon death reset as package-backed but still incomplete support', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const capabilities = new Map(support.capabilities.map((capability) => [capability.capabilityId, capability]));

    expect(capabilities.get('weapon.death_reset.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
  });

  it('registers weapon replacement rule as package-backed but still incomplete support', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const capabilities = new Map(support.capabilities.map((capability) => [capability.capabilityId, capability]));

    expect(capabilities.get('weapon.replacement_rule.v1')).toMatchObject({
      registered: true,
      classification: 'DEFERRED',
      completeSupported: false,
      legacyBacked: false,
      evidenceDimensions: {
        schema_expressible: true,
        normalized: true,
        compiled: true,
        runtime_consumed: true,
        qa_observed: false
      },
      missingEvidenceDimensions: ['qa_observed'],
      missingSupportEvidencePrerequisites: ['requiredProbesVerified']
    });
  });

  it('shows missing support dimensions in the DSL consumption report', () => {
    const normalized = validateAndNormalizeRawGameDsl(createSideScrollingRunAndGunRawDsl());
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const report = buildDslConsumptionReport({
      projectId: 'proj_20260625_m1',
      runId: 'run_20260625_m1',
      rawDsl: normalized.rawDsl,
      ir: normalized.ir
    });

    expect(report.targetProfileSupport).toMatchObject({
      profileId: 'DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1',
      completeSupportedCount: 0
    });
    expect(report.targetProfileSupport?.capabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capabilityId: 'movement.run_jump.v1',
          classification: 'DEFERRED',
          completeSupported: false,
          legacyBacked: false,
          missingEvidenceDimensions: expect.arrayContaining(['qa_observed']),
          missingSupportEvidencePrerequisites: ['requiredProbesVerified']
        })
      ])
    );
  });

  it('produces stable target profile support ordering', () => {
    const first = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const second = buildDeepSeekRunAndGunValidationProfileSupportSummary({
      entries: [...GameplayCapabilityRegistry.entries].reverse(),
      registryVersion: GameplayCapabilityRegistry.registryVersion
    });

    expect(second).toEqual(first);
    expect(second.capabilities.map((capability) => capability.capabilityId)).toEqual(
      [...second.capabilities.map((capability) => capability.capabilityId)].sort()
    );
  });

  it('fails closed for unknown or malformed evidence shapes', () => {
    const malformedEvidence = deriveGameplayCapabilitySupportEvidenceDimensions({ evidence: { dslSchema: true }, qa: {} });

    expect(malformedEvidence).toEqual({
      schema_expressible: true,
      normalized: false,
      compiled: false,
      runtime_consumed: false,
      qa_observed: false
    });
    expect(isCompleteSupportedEvidenceDimensions({ schema_expressible: true })).toBe(false);
  });

  it('does not delete or rename existing registry and runtime capability IDs', () => {
    expect(GameplayCapabilityRegistry.entries.map((entry) => entry.id)).toEqual([
      'artifact.lineage_no_manual_patch.v1',
      'artifact.no_hidden_script.v1',
      'asset.sprite_binding.v1',
      'camera.bounds_clamp.v1',
      'camera.side_follow.v1',
      'camera.top_down_follow.v1',
      'camera.vertical_scroll.v1',
      'canonical.semantic_preservation.v1',
      'collision.brick_grid.v1',
      'collision.damage_affinity_matrix.v1',
      'collision.platform.v1',
      'combat.airborne_fire.v1',
      'combat.projectile.v1',
      'enemy.boss_attack_pattern.v1',
      'enemy.boss_lifecycle.v1',
      'enemy.boss_phase_transition.v1',
      'enemy.chaser_pathfinding.v1',
      'enemy.fixed_turret.v1',
      'enemy.flying_right_entry.v1',
      'enemy.patrol_infantry.v1',
      'enemy.vertical_shooter_pattern.v1',
      'feedback.victory_declaration.v1',
      'generation.fallback_policy_fail_closed.v1',
      'goal.boss_unlock.v1',
      'goal.destroy_target.v1',
      'goal.reach_exit.v1',
      'hazard.contact_damage.v1',
      'health.damage_invulnerability.v1',
      'health.player_health_points.v1',
      'metadata.fixed_prompt_binding.v1',
      'movement.crouch.v1',
      'movement.eight_direction.v1',
      'movement.run_jump.v1',
      'movement.tilemap_maze_navigation.v1',
      'physics.gravity_platformer.v1',
      'physics.paddle_ball.v1',
      'pickup.collectible.v1',
      'pickup.drop_collect.v1',
      'profile.deepseek_run_and_gun_validation.v1',
      'rules.restart_loop.v1',
      'scene.parallax_background.v1',
      'spawn.enemy_wave.v1',
      'spawn.static.v1',
      'telemetry.gameplay_events.v1',
      'weapon.cooldown.v1',
      'weapon.death_reset.v1',
      'weapon.default_straight_single.v1',
      'weapon.rapid_fire.v1',
      'weapon.replacement_rule.v1',
      'weapon.spread_shot.v1'
    ]);
    expect(RuntimeGenreRegistry.find((entry) => entry.genre === 'side_scrolling_run_and_gun')?.requiredCapabilities).toEqual([
      'side_view_camera',
      'gravity_platformer_physics',
      'run_jump_controller',
      'platform_collision',
      'multi_direction_shooting',
      'projectile_combat',
      'enemy_spawn',
      'enemy_spawn_triggers',
      'terrain_collision',
      'platforms_terrain_collision',
      'player_health',
      'restart_loop',
      'checkpoint_or_lives_system'
    ]);
  });
});

function cloneCapability(id: string): GameplayCapabilityDescriptor {
  const capability = findGameplayCapability(id);
  if (capability === undefined) {
    throw new Error(`Missing test capability ${id}`);
  }
  return JSON.parse(JSON.stringify(capability)) as GameplayCapabilityDescriptor;
}
