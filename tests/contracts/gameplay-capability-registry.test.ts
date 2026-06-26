import { describe, expect, it } from 'vitest';

import {
  buildGameplayCapabilityInventoryReport,
  buildGameplayCapabilityRegistrySnapshot,
  createGameplayCapabilityRegistry,
  findGameplayCapability,
  GameplayCapabilityRegistry,
  deriveGameplayCapabilitySupportEvidenceDimensions,
  getMissingGameplayCapabilitySupportEvidencePrerequisites,
  isCompleteSupportedGameplayCapability,
  isRuntimeGenreExecutable,
  listGameplayProfileRuntimeStatuses,
  RuntimeGenreRegistry,
  validateGameplayCapabilityRegistry,
  ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID,
  ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID,
  CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID,
  CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID,
  COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID,
  ENEMY_BOSS_ATTACK_PATTERN_REQUIRED_PROBE_ID,
  ENEMY_BOSS_LIFECYCLE_REQUIRED_PROBE_ID,
  ENEMY_BOSS_PHASE_TRANSITION_REQUIRED_PROBE_ID,
  ENEMY_FIXED_TURRET_REQUIRED_PROBE_ID,
  ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID,
  ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID,
  FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID,
  GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID,
  GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID,
  HAZARD_FALLING_AREA_REQUIRED_PROBE_ID,
  HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID,
  MOVEMENT_CROUCH_REQUIRED_PROBE_ID,
  PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID,
  PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID,
  PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID,
  SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID,
  WEAPON_DEATH_RESET_REQUIRED_PROBE_ID,
  WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID,
  WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID,
  WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID,
  type GameplayCapabilityDescriptor,
  type RuntimeGenreCapability
} from '../../packages/game-dsl/src/index.js';

describe('Gameplay capability registry', () => {
  it('keeps capability IDs unique, sorted, and conservatively statused', () => {
    const ids = GameplayCapabilityRegistry.entries.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...ids].sort());
    expect(findGameplayCapability('artifact.lineage_no_manual_patch.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: []
    });
    expect(findGameplayCapability('artifact.no_hidden_script.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: []
    });
    expect(findGameplayCapability('camera.bounds_clamp.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: []
    });
    expect(findGameplayCapability('canonical.semantic_preservation.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: []
    });
    expect(findGameplayCapability('camera.side_follow.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: ['side_view_camera']
    });
    expect(findGameplayCapability('collision.platform.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: ['platform_collision', 'terrain_collision', 'platforms_terrain_collision']
    });
    expect(findGameplayCapability('collision.damage_affinity_matrix.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: []
    });
    expect(findGameplayCapability('enemy.boss_attack_pattern.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: []
    });
    expect(findGameplayCapability('enemy.boss_lifecycle.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: []
    });
    expect(findGameplayCapability('enemy.boss_phase_transition.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: []
    });
    expect(findGameplayCapability('enemy.fixed_turret.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: []
    });
    expect(findGameplayCapability('enemy.flying_right_entry.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: []
    });
    expect(findGameplayCapability('enemy.patrol_infantry.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: []
    });
    expect(findGameplayCapability('feedback.victory_declaration.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: []
    });
    expect(findGameplayCapability('generation.fallback_policy_fail_closed.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: []
    });
    expect(findGameplayCapability('movement.run_jump.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: ['run_jump_controller']
    });
    expect(findGameplayCapability('spawn.static.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: ['enemy_spawn', 'enemy_spawn_triggers']
    });
    expect(findGameplayCapability('spawn.enemy_wave.v1')).toMatchObject({
      status: 'planned',
      profiles: ['side_scrolling_run_and_gun.v1', 'shooter.v1'],
      legacyRuntimeCapabilities: ['enemy_waves']
    });
    expect(findGameplayCapability('health.player_health_points.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: ['player_health']
    });
    expect(findGameplayCapability('health.damage_invulnerability.v1')).toMatchObject({
      status: 'contract_seeded',
      legacyRuntimeCapabilities: []
    });
    expect(findGameplayCapability('combat.airborne_fire.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: []
    });
    expect(findGameplayCapability('movement.crouch.v1')).toMatchObject({
      status: 'planned',
      legacyRuntimeCapabilities: []
    });
    expect(findGameplayCapability('pickup.collectible.v1')).toMatchObject({
      status: 'runtime_backed',
      legacyRuntimeCapabilities: ['collectibles']
    });
    expect(findGameplayCapability('provider.deepseek_authoritative_draft.v1')).toMatchObject({
      status: 'planned',
      domain: 'provider',
      legacyRuntimeCapabilities: []
    });
    expect(GameplayCapabilityRegistry.entries.some(isCompleteSupportedGameplayCapability)).toBe(false);
  });

  it('rejects duplicate capability IDs', () => {
    const base = cloneCapability('movement.run_jump.v1');
    const result = validateGameplayCapabilityRegistry([base, { ...base }]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'DUPLICATE_CAPABILITY_ID',
            path: 'entries.1.id'
          })
        ])
      );
    }
  });

  it('rejects invalid IDs and version drift', () => {
    const base = cloneCapability('movement.run_jump.v1');
    const badId = validateGameplayCapabilityRegistry([{ ...base, id: 'movement.run_jump' }]);
    const badVersion = validateGameplayCapabilityRegistry([{ ...base, id: 'movement.run_jump.v2', version: 'v1' }]);
    const badDomain = validateGameplayCapabilityRegistry([{ ...base, domain: 'combat' }]);

    expect(badId.ok).toBe(false);
    expect(badVersion.ok).toBe(false);
    expect(badDomain.ok).toBe(false);
    if (!badId.ok) {
      expect(badId.issues.some((issue) => issue.code === 'CAPABILITY_SCHEMA_INVALID' && issue.path.endsWith('.id'))).toBe(true);
    }
    if (!badVersion.ok) {
      expect(badVersion.issues.some((issue) => issue.code === 'CAPABILITY_SCHEMA_INVALID' && issue.path.endsWith('.version'))).toBe(true);
    }
    if (!badDomain.ok) {
      expect(badDomain.issues.some((issue) => issue.code === 'CAPABILITY_SCHEMA_INVALID' && issue.path.endsWith('.domain'))).toBe(true);
    }
  });

  it('audits profile membership against RuntimeGenreRegistry profile IDs and legacy aliases', () => {
    const base = cloneCapability('movement.run_jump.v1');
    const unknownProfile = validateGameplayCapabilityRegistry([{ ...base, profiles: ['unknown_profile.v1'] }]);
    const missingLegacyProfile = validateGameplayCapabilityRegistry([{ ...base, profiles: [] }]);

    expect(unknownProfile.ok).toBe(false);
    if (!unknownProfile.ok) {
      expect(unknownProfile.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'UNKNOWN_GAMEPLAY_PROFILE'
          })
        ])
      );
    }

    expect(missingLegacyProfile.ok).toBe(false);
    if (!missingLegacyProfile.ok) {
      expect(missingLegacyProfile.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'LEGACY_PROFILE_MEMBERSHIP_MISMATCH'
          })
        ])
      );
    }
  });

  it('rejects complete supported capabilities without verified capability-owned QA', () => {
    const base = cloneCapability('movement.run_jump.v1');
    const result = validateGameplayCapabilityRegistry([
      {
        ...base,
        status: 'complete_supported',
        evidence: {
          dslSchema: true,
          normalizer: true,
          irCompiler: true,
          runtimeModule: true,
          amendmentOperations: true,
          capabilityOwnedQa: false,
          artifactEvidence: true,
          renderContract: true
        },
        qa: { requiredProbeIds: [], requiredProbesVerified: false },
        blockers: []
      }
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.message).join('\n')).toContain('complete_supported capability requires capabilityOwnedQa evidence');
      expect(result.issues.map((issue) => issue.message).join('\n')).toContain('complete_supported capability requires verified required QA probes');
    }
  });

  it('builds deterministic snapshot and inventory report artifacts', () => {
    const first = buildGameplayCapabilityRegistrySnapshot();
    const second = buildGameplayCapabilityRegistrySnapshot();
    const inventory = buildGameplayCapabilityInventoryReport();

    expect(first).toEqual(second);
    expect(first.artifactKind).toBe('capability_registry_snapshot');
    expect(first.snapshotHash).toMatch(/^fnv1a_[a-f0-9]{8}$/);
    expect(inventory.artifactKind).toBe('capability_inventory_report');
    expect(inventory.completeSupportedCapabilityIds).toEqual([]);
    expect(inventory.incompleteRuntimeBackedCapabilityIds).toEqual(inventory.runtimeBackedCapabilityIds);
  });

  it('scopes default straight weapon runtime evidence without completing M3 weapon support', () => {
    const defaultWeapon = findGameplayCapability('weapon.default_straight_single.v1');

    if (defaultWeapon === undefined) {
      throw new Error('Expected weapon.default_straight_single.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(defaultWeapon)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(defaultWeapon.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(defaultWeapon.qa).toEqual({
      requiredProbeIds: ['weapon.default_straight_single.v1.fire.browser_qa.v1'],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(defaultWeapon)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(defaultWeapon)).toBe(false);

    expect(findGameplayCapability('weapon.spread_shot.v1')).toBeDefined();
  });

  it('scopes artifact lineage no-manual-patch package-owned QA without static support promotion', () => {
    const noManualPatch = findGameplayCapability('artifact.lineage_no_manual_patch.v1');

    if (noManualPatch === undefined) {
      throw new Error('Expected artifact.lineage_no_manual_patch.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(noManualPatch)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(noManualPatch.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(noManualPatch.qa).toEqual({
      requiredProbeIds: [ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(noManualPatch)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(noManualPatch)).toBe(false);
  });

  it('scopes artifact no-hidden-script package-owned QA without static support promotion', () => {
    const noHiddenScript = findGameplayCapability('artifact.no_hidden_script.v1');

    if (noHiddenScript === undefined) {
      throw new Error('Expected artifact.no_hidden_script.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(noHiddenScript)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(noHiddenScript.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(noHiddenScript.qa).toEqual({
      requiredProbeIds: [ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(noHiddenScript)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(noHiddenScript)).toBe(false);
  });

  it('scopes camera bounds-clamp package-owned QA without static support promotion', () => {
    const boundsClamp = findGameplayCapability('camera.bounds_clamp.v1');

    if (boundsClamp === undefined) {
      throw new Error('Expected camera.bounds_clamp.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(boundsClamp)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(boundsClamp.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(boundsClamp.qa).toEqual({
      requiredProbeIds: [CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(boundsClamp)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(boundsClamp)).toBe(false);
  });

  it('scopes canonical semantic-preservation package-owned QA without static support promotion', () => {
    const semanticPreservation = findGameplayCapability('canonical.semantic_preservation.v1');

    if (semanticPreservation === undefined) {
      throw new Error('Expected canonical.semantic_preservation.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(semanticPreservation)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(semanticPreservation.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(semanticPreservation.qa).toEqual({
      requiredProbeIds: [CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(semanticPreservation)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(semanticPreservation)).toBe(false);
  });

  it('scopes collision damage-affinity-matrix package-owned QA without static support promotion', () => {
    const damageAffinity = findGameplayCapability('collision.damage_affinity_matrix.v1');

    if (damageAffinity === undefined) {
      throw new Error('Expected collision.damage_affinity_matrix.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(damageAffinity)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(damageAffinity.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(damageAffinity.qa).toEqual({
      requiredProbeIds: [COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(damageAffinity)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(damageAffinity)).toBe(false);
  });

  it('scopes enemy boss attack-pattern package-owned QA without static support promotion', () => {
    const attackPattern = findGameplayCapability('enemy.boss_attack_pattern.v1');

    if (attackPattern === undefined) {
      throw new Error('Expected enemy.boss_attack_pattern.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(attackPattern)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(attackPattern.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(attackPattern.qa).toEqual({
      requiredProbeIds: [ENEMY_BOSS_ATTACK_PATTERN_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(attackPattern)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(attackPattern)).toBe(false);
  });

  it('scopes enemy boss lifecycle package-owned QA without static support promotion', () => {
    const lifecycle = findGameplayCapability('enemy.boss_lifecycle.v1');

    if (lifecycle === undefined) {
      throw new Error('Expected enemy.boss_lifecycle.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(lifecycle)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(lifecycle.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(lifecycle.qa).toEqual({
      requiredProbeIds: [ENEMY_BOSS_LIFECYCLE_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(lifecycle)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(lifecycle)).toBe(false);
  });

  it('scopes enemy boss phase-transition package-owned QA without static support promotion', () => {
    const phaseTransition = findGameplayCapability('enemy.boss_phase_transition.v1');

    if (phaseTransition === undefined) {
      throw new Error('Expected enemy.boss_phase_transition.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(phaseTransition)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(phaseTransition.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(phaseTransition.qa).toEqual({
      requiredProbeIds: [ENEMY_BOSS_PHASE_TRANSITION_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(phaseTransition)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(phaseTransition)).toBe(false);
  });

  it('scopes enemy fixed-turret package-owned QA without static support promotion', () => {
    const fixedTurret = findGameplayCapability('enemy.fixed_turret.v1');

    if (fixedTurret === undefined) {
      throw new Error('Expected enemy.fixed_turret.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(fixedTurret)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(fixedTurret.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(fixedTurret.qa).toEqual({
      requiredProbeIds: [ENEMY_FIXED_TURRET_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(fixedTurret)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(fixedTurret)).toBe(false);
  });

  it('scopes enemy flying-right-entry package-owned QA without static support promotion', () => {
    const flyingRightEntry = findGameplayCapability('enemy.flying_right_entry.v1');

    if (flyingRightEntry === undefined) {
      throw new Error('Expected enemy.flying_right_entry.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(flyingRightEntry)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(flyingRightEntry.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(flyingRightEntry.qa).toEqual({
      requiredProbeIds: [ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(flyingRightEntry)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(flyingRightEntry)).toBe(false);
  });

  it('scopes enemy patrol-infantry package-owned QA without static support promotion', () => {
    const patrolInfantry = findGameplayCapability('enemy.patrol_infantry.v1');

    if (patrolInfantry === undefined) {
      throw new Error('Expected enemy.patrol_infantry.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(patrolInfantry)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(patrolInfantry.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(patrolInfantry.qa).toEqual({
      requiredProbeIds: [ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(patrolInfantry)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(patrolInfantry)).toBe(false);
  });

  it('scopes feedback victory declaration package-owned QA without static support promotion', () => {
    const victoryDeclaration = findGameplayCapability('feedback.victory_declaration.v1');

    if (victoryDeclaration === undefined) {
      throw new Error('Expected feedback.victory_declaration.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(victoryDeclaration)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(victoryDeclaration.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(victoryDeclaration.qa).toEqual({
      requiredProbeIds: [FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(victoryDeclaration)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(victoryDeclaration)).toBe(false);
  });

  it('scopes generation fallback fail-closed package-owned QA without static support promotion', () => {
    const fallbackPolicy = findGameplayCapability('generation.fallback_policy_fail_closed.v1');

    if (fallbackPolicy === undefined) {
      throw new Error('Expected generation.fallback_policy_fail_closed.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(fallbackPolicy)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(fallbackPolicy.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(fallbackPolicy.qa).toEqual({
      requiredProbeIds: [GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(fallbackPolicy)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(fallbackPolicy)).toBe(false);
  });

  it('scopes goal boss unlock package-owned QA without static support promotion', () => {
    const bossUnlock = findGameplayCapability('goal.boss_unlock.v1');

    if (bossUnlock === undefined) {
      throw new Error('Expected goal.boss_unlock.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(bossUnlock)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(bossUnlock.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(bossUnlock.qa).toEqual({
      requiredProbeIds: [GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(bossUnlock)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(bossUnlock)).toBe(false);
  });

  it('scopes hazard falling area package-owned QA without static support promotion', () => {
    const fallingArea = findGameplayCapability('hazard.falling_area.v1');

    if (fallingArea === undefined) {
      throw new Error('Expected hazard.falling_area.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(fallingArea)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(fallingArea.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(fallingArea.qa).toEqual({
      requiredProbeIds: [HAZARD_FALLING_AREA_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(fallingArea)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(fallingArea)).toBe(false);
  });

  it('scopes hazard timed explosion package-owned QA without static support promotion', () => {
    const timedExplosion = findGameplayCapability('hazard.timed_explosion.v1');

    if (timedExplosion === undefined) {
      throw new Error('Expected hazard.timed_explosion.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(timedExplosion)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(timedExplosion.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(timedExplosion.qa).toEqual({
      requiredProbeIds: [HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(timedExplosion)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(timedExplosion)).toBe(false);
  });

  it('scopes pickup weapon supply package-owned QA without static support promotion', () => {
    const weaponSupply = findGameplayCapability('pickup.weapon_supply.v1');

    if (weaponSupply === undefined) {
      throw new Error('Expected pickup.weapon_supply.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(weaponSupply)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(weaponSupply.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(weaponSupply.qa).toEqual({
      requiredProbeIds: [PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(weaponSupply)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(weaponSupply)).toBe(false);
  });

  it('scopes DeepSeek authoritative draft provider package-owned QA without static support promotion', () => {
    const providerDraft = findGameplayCapability('provider.deepseek_authoritative_draft.v1');

    if (providerDraft === undefined) {
      throw new Error('Expected provider.deepseek_authoritative_draft.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(providerDraft)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(providerDraft.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(providerDraft.qa).toEqual({
      requiredProbeIds: [PROVIDER_DEEPSEEK_AUTHORITATIVE_DRAFT_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(providerDraft)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(providerDraft)).toBe(false);
  });

  it('scopes weapon rapid fire package-owned QA without static support promotion', () => {
    const rapidFire = findGameplayCapability('weapon.rapid_fire.v1');

    if (rapidFire === undefined) {
      throw new Error('Expected weapon.rapid_fire.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(rapidFire)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(rapidFire.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(rapidFire.qa).toEqual({
      requiredProbeIds: [WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(rapidFire)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(rapidFire)).toBe(false);
  });

  it('scopes weapon spread shot package-owned QA without static support promotion', () => {
    const spreadShot = findGameplayCapability('weapon.spread_shot.v1');

    if (spreadShot === undefined) {
      throw new Error('Expected weapon.spread_shot.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(spreadShot)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(spreadShot.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(spreadShot.qa).toEqual({
      requiredProbeIds: [WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(spreadShot)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(spreadShot)).toBe(false);
  });

  it('scopes weapon replacement rule package-owned QA without static support promotion', () => {
    const replacementRule = findGameplayCapability('weapon.replacement_rule.v1');

    if (replacementRule === undefined) {
      throw new Error('Expected weapon.replacement_rule.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(replacementRule)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(replacementRule.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(replacementRule.qa).toEqual({
      requiredProbeIds: [WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(replacementRule)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(replacementRule)).toBe(false);
  });

  it('scopes weapon death reset package-owned QA without static support promotion', () => {
    const deathReset = findGameplayCapability('weapon.death_reset.v1');

    if (deathReset === undefined) {
      throw new Error('Expected weapon.death_reset.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(deathReset)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(deathReset.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(deathReset.qa).toEqual({
      requiredProbeIds: [WEAPON_DEATH_RESET_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(deathReset)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(deathReset)).toBe(false);
  });

  it('scopes collision platform package-owned QA without static support promotion', () => {
    const collision = findGameplayCapability('collision.platform.v1');

    if (collision === undefined) {
      throw new Error('Expected collision.platform.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(collision)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(collision.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(collision.qa).toEqual({
      requiredProbeIds: ['collision.platform.v1.grounded.browser_qa.v1'],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(collision)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(collision)).toBe(false);
  });

  it('scopes spawn static package-owned QA without static support promotion', () => {
    const spawnStatic = findGameplayCapability('spawn.static.v1');

    if (spawnStatic === undefined) {
      throw new Error('Expected spawn.static.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(spawnStatic)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(spawnStatic.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(spawnStatic.qa).toEqual({
      requiredProbeIds: ['spawn.static.v1.triggered.browser_qa.v1'],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(spawnStatic)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(spawnStatic)).toBe(false);
  });

  it('scopes spawn enemy wave package-owned QA without static support promotion', () => {
    const spawnEnemyWave = findGameplayCapability('spawn.enemy_wave.v1');

    if (spawnEnemyWave === undefined) {
      throw new Error('Expected spawn.enemy_wave.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(spawnEnemyWave)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(spawnEnemyWave.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(spawnEnemyWave.qa).toEqual({
      requiredProbeIds: [SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(spawnEnemyWave)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(spawnEnemyWave)).toBe(false);
  });

  it('scopes health player health points package-owned QA without static support promotion', () => {
    const health = findGameplayCapability('health.player_health_points.v1');

    if (health === undefined) {
      throw new Error('Expected health.player_health_points.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(health)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(health.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(health.qa).toEqual({
      requiredProbeIds: ['health.player_health_points.v1.current.browser_qa.v1'],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(health)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(health)).toBe(false);
  });

  it('scopes health damage invulnerability package-owned QA without static support promotion', () => {
    const invulnerability = findGameplayCapability('health.damage_invulnerability.v1');

    if (invulnerability === undefined) {
      throw new Error('Expected health.damage_invulnerability.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(invulnerability)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(invulnerability.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      renderContract: true
    });
    expect(invulnerability.qa).toEqual({
      requiredProbeIds: ['health.damage_invulnerability.v1.window.browser_qa.v1'],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(invulnerability)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(invulnerability)).toBe(false);
  });

  it('scopes combat airborne fire package-owned QA without static support promotion', () => {
    const airborneFire = findGameplayCapability('combat.airborne_fire.v1');

    if (airborneFire === undefined) {
      throw new Error('Expected combat.airborne_fire.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(airborneFire)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(airborneFire.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(airborneFire.qa).toEqual({
      requiredProbeIds: ['combat.airborne_fire.v1.fired.browser_qa.v1'],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(airborneFire)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(airborneFire)).toBe(false);
  });

  it('scopes movement crouch package-owned QA without static support promotion', () => {
    const crouch = findGameplayCapability('movement.crouch.v1');

    if (crouch === undefined) {
      throw new Error('Expected movement.crouch.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(crouch)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(crouch.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(crouch.qa).toEqual({
      requiredProbeIds: [MOVEMENT_CROUCH_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(crouch)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(crouch)).toBe(false);
  });

  it('scopes pickup collectible package-owned QA without static support promotion or weapon overclaim', () => {
    const pickup = findGameplayCapability('pickup.collectible.v1');

    if (pickup === undefined) {
      throw new Error('Expected pickup.collectible.v1 in registry.');
    }
    expect(deriveGameplayCapabilitySupportEvidenceDimensions(pickup)).toEqual({
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    });
    expect(pickup.evidence).toMatchObject({
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    });
    expect(pickup.qa).toEqual({
      requiredProbeIds: [PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID],
      requiredProbesVerified: false
    });
    expect(pickup.legacyRuntimeCapabilities).toEqual(['collectibles']);
    expect(getMissingGameplayCapabilitySupportEvidencePrerequisites(pickup)).toEqual(['requiredProbesVerified']);
    expect(isCompleteSupportedGameplayCapability(pickup)).toBe(false);

    expect(isCompleteSupportedGameplayCapability(findGameplayCapability('weapon.spread_shot.v1')!)).toBe(false);
  });

  it('derives profile runtime status from RuntimeGenreRegistry instead of a second supported list', () => {
    const statuses = listGameplayProfileRuntimeStatuses();
    const executableGenres = RuntimeGenreRegistry.filter(isRuntimeGenreExecutable).map((entry) => entry.genre);

    expect(statuses.filter((status) => status.runtimeExecutable).map((status) => status.runtimeGenre)).toEqual(executableGenres);
    for (const status of statuses) {
      const runtimeGenre = RuntimeGenreRegistry.find((entry) => entry.genre === status.runtimeGenre);
      expect(runtimeGenre).toBeDefined();
      if (runtimeGenre !== undefined) {
        expect(status.runtimeSupportStatus).toBe(runtimeGenre.status);
        expect(status.runtimeExecutable).toBe(isRuntimeGenreExecutable(runtimeGenre));
      }
    }

    expect(statuses.find((status) => status.runtimeGenre === 'side_scrolling_run_and_gun')).toMatchObject({
      runtimeSupportStatus: 'supported',
      profileSupportStatus: 'active_profile_supported',
      activeRequirementCapabilityIds: expect.arrayContaining(['health.player_health_points.v1']),
      declaredProfileCapabilityIds: expect.arrayContaining(['health.damage_invulnerability.v1'])
    });
    expect(statuses.find((status) => status.runtimeGenre === 'side_scrolling_platformer')).toMatchObject({
      runtimeSupportStatus: 'unsupported',
      profileSupportStatus: 'unsupported',
      declaredProfileCapabilityIds: expect.arrayContaining(['goal.reach_exit.v1', 'pickup.drop_collect.v1']),
      incompleteCapabilityIds: expect.arrayContaining(['goal.reach_exit.v1', 'pickup.drop_collect.v1'])
    });
  });

  it('marks active runtime requirements complete without hiding planned profile-owned gaps', () => {
    const platformerRuntime = RuntimeGenreRegistry.find((entry) => entry.genre === 'side_scrolling_platformer');
    if (platformerRuntime === undefined) {
      throw new Error('expected side_scrolling_platformer runtime registry entry');
    }

    const legacyRequiredAliases = new Set(platformerRuntime.requiredCapabilities);
    const registry = createGameplayCapabilityRegistry(
      GameplayCapabilityRegistry.entries.map((entry) =>
        entry.legacyRuntimeCapabilities.some((alias) => legacyRequiredAliases.has(alias)) ? completeCapability(entry) : entry
      )
    );
    const [status] = listGameplayProfileRuntimeStatuses({
      registry,
      runtimeGenres: [
        {
          ...platformerRuntime,
          status: 'supported',
          missingCapabilities: [],
          implementedCapabilities: [...platformerRuntime.requiredCapabilities],
          templateId: 'phaser/universal_platformer_test.v1',
          qaProfile: 'platformer_capability_smoke'
        } satisfies RuntimeGenreCapability
      ]
    });

    expect(status.runtimeExecutable).toBe(true);
    expect(status.profileSupportStatus).toBe('capability_complete_supported');
    expect(status.activeRequirementCapabilityIds).toEqual(
      expect.arrayContaining(['camera.side_follow.v1', 'collision.platform.v1', 'movement.run_jump.v1', 'physics.gravity_platformer.v1'])
    );
    expect(status.declaredProfileCapabilityIds).toEqual(expect.arrayContaining(['goal.reach_exit.v1', 'pickup.drop_collect.v1']));
    expect(status.incompleteCapabilityIds).toEqual(expect.arrayContaining(['goal.reach_exit.v1', 'pickup.drop_collect.v1']));
    expect(status.completeSupportedCapabilityIds).toEqual(
      expect.arrayContaining(['camera.side_follow.v1', 'collision.platform.v1', 'movement.run_jump.v1', 'physics.gravity_platformer.v1'])
    );
  });
});

function cloneCapability(id: string): GameplayCapabilityDescriptor {
  const capability = findGameplayCapability(id);
  if (capability === undefined) {
    throw new Error(`Missing test capability ${id}`);
  }
  return JSON.parse(JSON.stringify(capability)) as GameplayCapabilityDescriptor;
}

function completeCapability(capability: GameplayCapabilityDescriptor): GameplayCapabilityDescriptor {
  return {
    ...JSON.parse(JSON.stringify(capability)),
    status: 'complete_supported',
    evidence: {
      dslSchema: true,
      normalizer: true,
      irCompiler: true,
      runtimeModule: true,
      amendmentOperations: true,
      capabilityOwnedQa: true,
      artifactEvidence: true,
      renderContract: true
    },
    qa: { requiredProbeIds: [`probe.${capability.id}`], requiredProbesVerified: true },
    blockers: []
  } as GameplayCapabilityDescriptor;
}
