import { describe, expect, it } from 'vitest';

import {
  buildAmendmentVerificationReport,
  buildCapabilityQaProbeResultsFromRuntimeEvidence,
  buildCapabilityRuntimeQaPlan,
  evaluateCapabilityQaReport,
  resolveGameplayCapabilityGraph,
  validateGameplayCapabilityPackage,
  WEAPON_DEATH_RESET_EVENT_TYPE,
  WEAPON_DEATH_RESET_INITIAL_WEAPON_ID,
  WEAPON_DEATH_RESET_NON_INITIAL_WEAPON_ID,
  WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE,
  WEAPON_DEATH_RESET_REQUIRED_PROBE_ID,
  createWeaponDeathResetPackageContract,
  WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
  WEAPON_RAPID_FIRE_BURST_SHOT_COUNT,
  WEAPON_RAPID_FIRE_BURST_WINDOW_MS,
  WEAPON_RAPID_FIRE_COOLDOWN_MS,
  WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID,
  createWeaponRapidFirePackageContract,
  WEAPON_SPREAD_SHOT_EVENT_TYPE,
  WEAPON_SPREAD_SHOT_PROJECTILE_COUNT,
  WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID,
  WEAPON_SPREAD_SHOT_SPREAD_ARC_DEGREES,
  WEAPON_SPREAD_SHOT_SPREAD_ANGLES_DEGREES,
  createWeaponSpreadShotPackageContract,
  WEAPON_REPLACEMENT_RULE_EVENT_TYPE,
  WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
  WEAPON_REPLACEMENT_RULE_PREVIOUS_WEAPON_ID,
  WEAPON_REPLACEMENT_RULE_REPLACEMENT_WEAPON_ID,
  WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID,
  createWeaponReplacementRulePackageContract,
  ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
  ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID,
  createArtifactLineageNoManualPatchPackageContract,
  ARTIFACT_NO_HIDDEN_SCRIPT_EVENT_TYPE,
  ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID,
  createArtifactNoHiddenScriptPackageContract,
  CAMERA_BOUNDS_CLAMP_EVENT_TYPE,
  CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID,
  createCameraBoundsClampPackageContract,
  COLLISION_PLATFORM_REQUIRED_PROBE_ID,
  CANONICAL_SEMANTIC_PRESERVATION_EVENT_TYPE,
  CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID,
  createCanonicalSemanticPreservationPackageContract,
  COLLISION_DAMAGE_AFFINITY_MATRIX_EVENT_TYPE,
  COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID,
  createCollisionDamageAffinityMatrixPackageContract,
  ENEMY_BOSS_ATTACK_PATTERN_CADENCE_MS,
  ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
  ENEMY_BOSS_ATTACK_PATTERN_PHASE_ID,
  ENEMY_BOSS_ATTACK_PATTERN_PATTERN_ID,
  ENEMY_BOSS_ATTACK_PATTERN_REQUIRED_PROBE_ID,
  createEnemyBossAttackPatternPackageContract,
  ENEMY_BOSS_LIFECYCLE_BOSS_ENTITY_ID,
  ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
  ENEMY_BOSS_LIFECYCLE_MAX_HEALTH,
  ENEMY_BOSS_LIFECYCLE_REQUIRED_PROBE_ID,
  createEnemyBossLifecyclePackageContract,
  ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
  ENEMY_BOSS_PHASE_TRANSITION_FROM_PHASE_ID,
  ENEMY_BOSS_PHASE_TRANSITION_HEALTH_THRESHOLD_RATIO,
  ENEMY_BOSS_PHASE_TRANSITION_REQUIRED_PROBE_ID,
  ENEMY_BOSS_PHASE_TRANSITION_SPEED_MULTIPLIER,
  ENEMY_BOSS_PHASE_TRANSITION_TO_PHASE_ID,
  createEnemyBossPhaseTransitionPackageContract,
  ENEMY_FIXED_TURRET_ARCHETYPE_ID,
  ENEMY_FIXED_TURRET_ENTITY_ID,
  ENEMY_FIXED_TURRET_EVENT_TYPE,
  ENEMY_FIXED_TURRET_FIRE_CADENCE_MS,
  ENEMY_FIXED_TURRET_PROJECTILE_PATTERN_ID,
  ENEMY_FIXED_TURRET_REQUIRED_PROBE_ID,
  createEnemyFixedTurretPackageContract,
  ENEMY_FLYING_RIGHT_ENTRY_ARCHETYPE_ID,
  ENEMY_FLYING_RIGHT_ENTRY_ENEMY_ID,
  ENEMY_FLYING_RIGHT_ENTRY_ENTRY_SIDE,
  ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
  ENEMY_FLYING_RIGHT_ENTRY_MOVEMENT_PATTERN_ID,
  ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID,
  ENEMY_FLYING_RIGHT_ENTRY_SEGMENT_ID,
  ENEMY_FLYING_RIGHT_ENTRY_WAVE_ID,
  createEnemyFlyingRightEntryPackageContract,
  ENEMY_PATROL_INFANTRY_ARCHETYPE_ID,
  ENEMY_PATROL_INFANTRY_ENEMY_ID,
  ENEMY_PATROL_INFANTRY_EVENT_TYPE,
  ENEMY_PATROL_INFANTRY_MOVEMENT_PATTERN_ID,
  ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID,
  ENEMY_PATROL_INFANTRY_ROUTE_ID,
  ENEMY_PATROL_INFANTRY_SEGMENT_ID,
  createEnemyPatrolInfantryPackageContract,
  FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
  FEEDBACK_VICTORY_DECLARATION_OUTCOME,
  FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID,
  FEEDBACK_VICTORY_DECLARATION_TEXT,
  FEEDBACK_VICTORY_DECLARATION_TRIGGER,
  createFeedbackVictoryDeclarationPackageContract,
  GENERATION_FALLBACK_POLICY_FAIL_CLOSED_ERROR_CODE,
  GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
  GENERATION_FALLBACK_POLICY_FAIL_CLOSED_POLICY,
  GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID,
  createGenerationFallbackPolicyFailClosedPackageContract,
  GOAL_BOSS_UNLOCK_BOSS_ENTITY_ID,
  GOAL_BOSS_UNLOCK_EVENT_TYPE,
  GOAL_BOSS_UNLOCK_REASON,
  GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID,
  GOAL_BOSS_UNLOCK_REQUIRED_WAVE_COUNT,
  GOAL_BOSS_UNLOCK_WAVE_ID,
  createGoalBossUnlockPackageContract,
  HAZARD_FALLING_AREA_BOSS_PHASE_ID,
  HAZARD_FALLING_AREA_DAMAGE,
  HAZARD_FALLING_AREA_EVENT_TYPE,
  HAZARD_FALLING_AREA_HAZARD_ID,
  HAZARD_FALLING_AREA_PATTERN_ID,
  HAZARD_FALLING_AREA_REQUIRED_PROBE_ID,
  HAZARD_FALLING_AREA_TELEGRAPH_MS,
  createHazardFallingAreaPackageContract,
  HAZARD_TIMED_EXPLOSION_COUNTDOWN_MS,
  HAZARD_TIMED_EXPLOSION_DAMAGE,
  HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
  HAZARD_TIMED_EXPLOSION_HAZARD_ID,
  HAZARD_TIMED_EXPLOSION_RADIUS,
  HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID,
  HAZARD_TIMED_EXPLOSION_TIMER_ID,
  HAZARD_TIMED_EXPLOSION_TRIGGER_CONDITION,
  createHazardTimedExplosionPackageContract,
  createCollisionPlatformPackageContract,
  DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID,
  createDefaultStraightSingleWeaponPackageContract,
  PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID,
  createPickupCollectiblePackageContract,
  PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
  PICKUP_WEAPON_SUPPLY_NODE_ID,
  PICKUP_WEAPON_SUPPLY_PICKUP_ID,
  PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID,
  PICKUP_WEAPON_SUPPLY_WEAPON_ID,
  createPickupWeaponSupplyPackageContract,
  COMBAT_PROJECTILE_REQUIRED_PROBE_ID,
  SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID,
  SPAWN_STATIC_REQUIRED_PROBE_ID,
  createCombatProjectilePackageContract,
  createSpawnEnemyWavePackageContract,
  createSpawnStaticPackageContract,
  type CapabilityQaProbeDescriptor,
  type GameplayCapabilityPackageContract
} from '../../packages/game-dsl/src/index.js';

describe('Capability-owned runtime QA probes', () => {
  it('rejects probes that are not owned by their capability package', () => {
    const report = validateGameplayCapabilityPackage(
      createPackage('movement.run_jump.v1', {
        probes: [createProbe('other.capability.v1.qa.required', 'other.capability.v1', 'movement.run_jump.v1.system')]
      })
    );

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'PACKAGE_SCHEMA_INVALID' })]));
  });

  it('keeps supported packages incomplete when required probes are missing', () => {
    const report = validateGameplayCapabilityPackage(
      createPackage('movement.run_jump.v1', {
        probes: [createProbe('movement.run_jump.v1.qa.optional', 'movement.run_jump.v1', 'movement.run_jump.v1.system', { severity: 'optional' })]
      })
    );

    expect(report.status).toBe('invalid');
    expect(report.supportEligible).toBe(false);
    expect(report.completeness).toBe('RUNTIME_WITHOUT_QA');
  });

  it('requires probe prerequisites before package support can be derived', () => {
    const probe = createProbe('movement.run_jump.v1.qa.required', 'movement.run_jump.v1', 'movement.run_jump.v1.system');
    const report = validateGameplayCapabilityPackage(
      createPackage('movement.run_jump.v1', {
        probes: [{ ...probe, prerequisites: [] }]
      })
    );

    expect(report.status).toBe('invalid');
    expect(report.supportEligible).toBe(false);
  });

  it('composes deterministic profile QA plans from capability probes, profile scenarios, render refs, and amendment refs', () => {
    const packages = [createPackage('movement.run_jump.v1'), createPackage('camera.side_follow.v1')];
    const lock = createLock(packages, ['camera.side_follow.v1', 'movement.run_jump.v1']);
    const first = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: lock,
      packages,
      profileScenarios: [createProfileScenario()],
      step33RenderFidelityEvidenceRefs: ['render_fidelity_report.json'],
      step34AmendmentVerificationRefs: ['amendment_verification_report.json']
    });
    const second = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: lock,
      packages: [...packages].reverse(),
      profileScenarios: [createProfileScenario()],
      step33RenderFidelityEvidenceRefs: ['render_fidelity_report.json'],
      step34AmendmentVerificationRefs: ['amendment_verification_report.json']
    });

    expect(first.status).toBe('ready');
    expect(first.planHash).toBe(second.planHash);
    expect(first.requiredProbes.map((probe) => probe.capabilityId)).toEqual(['camera.side_follow.v1', 'movement.run_jump.v1']);
    expect(first.profileScenarioProbes.map((probe) => probe.id)).toEqual(['side_scrolling_run_and_gun.v1.qa.destroy_target']);
    expect(first.step33RenderFidelityEvidenceRefs).toEqual(['render_fidelity_report.json']);
    expect(first.step34AmendmentVerificationRefs).toEqual(['amendment_verification_report.json']);
  });

  it('detects duplicate conflicting QA actions across composed probes', () => {
    const sharedAction = 'shared.qa.action';
    const movement = createPackage('movement.run_jump.v1', {
      probes: [createProbe('movement.run_jump.v1.qa.required', 'movement.run_jump.v1', 'movement.run_jump.v1.system', { actionId: sharedAction, actionTarget: 'player' })]
    });
    const camera = createPackage('camera.side_follow.v1', {
      probes: [createProbe('camera.side_follow.v1.qa.required', 'camera.side_follow.v1', 'camera.side_follow.v1.system', { actionId: sharedAction, actionTarget: 'camera' })]
    });
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock([movement, camera], ['movement.run_jump.v1', 'camera.side_follow.v1']),
      packages: [movement, camera]
    });

    expect(plan.status).toBe('blocked');
    expect(plan.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'QA_ACTION_CONFLICT', actionId: sharedAction })]));
  });

  it('validates runtime observation refs against the owning package runtime systems', () => {
    const movement = createPackage('movement.run_jump.v1', {
      probes: [createProbe('movement.run_jump.v1.qa.required', 'movement.run_jump.v1', 'movement.run_jump.v1.missing_system')]
    });
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock([movement], ['movement.run_jump.v1']),
      packages: [movement]
    });

    expect(plan.status).toBe('blocked');
    expect(plan.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'RUNTIME_OBSERVATION_REF_INVALID', capabilityId: 'movement.run_jump.v1' })])
    );
  });

  it('builds amendment before/after verification from Step34 expected effects', () => {
    const report = buildAmendmentVerificationReport({
      operationId: 'op_jump_height',
      expectedEffects: [
        {
          kind: 'property_changed',
          target: { scope: 'component', role: 'player' },
          property: 'jumpVelocity',
          comparison: 'increased'
        }
      ],
      beforeObservations: { jumpVelocity: 420 },
      afterObservations: { jumpVelocity: 504 }
    });

    expect(report.status).toBe('passed');
    expect(report.checks).toEqual([expect.objectContaining({ effectKind: 'property_changed', ref: 'jumpVelocity', status: 'passed' })]);
  });

  it('does not let runtime event expected effects pass with minimum count zero and no observation', () => {
    const report = buildAmendmentVerificationReport({
      operationId: 'op_add_pickup_rule',
      expectedEffects: [{ kind: 'runtime_event', eventName: 'pickup_collected', minimumCount: 0 }],
      beforeObservations: {},
      afterObservations: {},
      runtimeEventCounts: {}
    });

    expect(report.status).toBe('failed');
    expect(report.checks).toEqual([expect.objectContaining({ effectKind: 'runtime_event', ref: 'pickup_collected', status: 'failed', after: 0 })]);
  });

  it('fails QA reports for blocked plans even when external probe results claim success', () => {
    const sharedAction = 'shared.qa.action';
    const movement = createPackage('movement.run_jump.v1', {
      probes: [createProbe('movement.run_jump.v1.qa.required', 'movement.run_jump.v1', 'movement.run_jump.v1.system', { actionId: sharedAction, actionTarget: 'player' })]
    });
    const camera = createPackage('camera.side_follow.v1', {
      probes: [createProbe('camera.side_follow.v1.qa.required', 'camera.side_follow.v1', 'camera.side_follow.v1.system', { actionId: sharedAction, actionTarget: 'camera' })]
    });
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock([movement, camera], ['movement.run_jump.v1', 'camera.side_follow.v1']),
      packages: [movement, camera]
    });
    const report = evaluateCapabilityQaReport({
      plan,
      probeResults: plan.requiredProbes.map((probe) => ({
        probeId: probe.id,
        status: 'passed',
        assertionResults: probe.assertions.map((assertion) => ({ assertionId: assertion.id, status: 'passed' }))
      }))
    });

    expect(plan.status).toBe('blocked');
    expect(report.status).toBe('failed');
    expect(report.planStatus).toBe('blocked');
  });

  it('requires required profile scenario probe results before the QA report can pass', () => {
    const movement = createPackage('movement.run_jump.v1');
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock([movement], ['movement.run_jump.v1']),
      packages: [movement],
      profileScenarios: [createProfileScenario()]
    });
    const report = evaluateCapabilityQaReport({
      plan,
      probeResults: [{ probeId: 'movement.run_jump.v1.qa.required', status: 'passed', assertionResults: passedAssertionsFor(plan, 'movement.run_jump.v1.qa.required') }]
    });

    expect(plan.status).toBe('ready');
    expect(report.status).toBe('failed');
    expect(report.missingRequiredProbeIds).toEqual(['side_scrolling_run_and_gun.v1.qa.destroy_target']);
  });

  it('keeps legacy unscoped probe results compatible unless current-plan evidence is required', () => {
    const movement = createPackage('movement.run_jump.v1');
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock([movement], ['movement.run_jump.v1']),
      packages: [movement]
    });
    const unscopedProbeResult = {
      probeId: 'movement.run_jump.v1.qa.required',
      status: 'passed' as const,
      assertionResults: passedAssertionsFor(plan, 'movement.run_jump.v1.qa.required')
    };
    const legacyReport = evaluateCapabilityQaReport({
      plan,
      probeResults: [unscopedProbeResult]
    });
    const planScopedReport = evaluateCapabilityQaReport({
      plan,
      probeResults: [unscopedProbeResult],
      requirePlanScopedResults: true
    });

    expect(legacyReport.status).toBe('passed');
    expect(legacyReport.requiredResults[0]).toMatchObject({
      probeId: 'movement.run_jump.v1.qa.required',
      status: 'passed'
    });
    expect(legacyReport.requiredResults[0]?.planHash).toBeUndefined();
    expect(planScopedReport.status).toBe('failed');
    expect(planScopedReport.missingRequiredProbeIds).toEqual(['movement.run_jump.v1.qa.required']);
    expect(planScopedReport.requiredResults[0]).toMatchObject({
      probeId: 'movement.run_jump.v1.qa.required',
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: 'movement.run_jump.v1.qa.required.plan_hash',
          failureKind: 'PLAN_SCOPE_REQUIRED',
          capabilityId: 'movement.run_jump.v1',
          expectedPlanHash: plan.planHash,
          actualPlanHash: '<missing>',
          resultSource: 'probe_result'
        })
      ])
    });
  });

  it('blocks malformed profile scenarios before external results can mark them passed', () => {
    const movement = createPackage('movement.run_jump.v1');
    const malformedScenario = { ...createProfileScenario(), prerequisites: [], actions: [] };
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock([movement], ['movement.run_jump.v1']),
      packages: [movement],
      profileScenarios: [malformedScenario]
    });
    const report = evaluateCapabilityQaReport({
      plan,
      probeResults: [
        { probeId: 'movement.run_jump.v1.qa.required', status: 'passed', assertionResults: passedAssertionsFor(plan, 'movement.run_jump.v1.qa.required') },
        {
          probeId: 'side_scrolling_run_and_gun.v1.qa.destroy_target',
          status: 'passed',
          assertionResults: [{ assertionId: 'side_scrolling_run_and_gun.v1.qa.destroy_target.assertion', status: 'passed' }]
        }
      ]
    });

    expect(plan.status).toBe('blocked');
    expect(plan.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'PROFILE_SCENARIO_INVALID' })]));
    expect(report.status).toBe('failed');
  });

  it('validates profile scenario runtime observation refs against selected locked packages', () => {
    const movement = createPackage('movement.run_jump.v1');
    const invalidRuntimeRefScenario = {
      ...createProfileScenario(),
      observations: [
        {
          ...createProfileScenario().observations[0],
          runtimeSystemId: 'missing.runtime_system'
        }
      ]
    };
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock([movement], ['movement.run_jump.v1']),
      packages: [movement],
      profileScenarios: [invalidRuntimeRefScenario]
    });
    const report = evaluateCapabilityQaReport({
      plan,
      probeResults: [
        { probeId: 'movement.run_jump.v1.qa.required', status: 'passed', assertionResults: passedAssertionsFor(plan, 'movement.run_jump.v1.qa.required') },
        {
          probeId: 'side_scrolling_run_and_gun.v1.qa.destroy_target',
          status: 'passed',
          assertionResults: [{ assertionId: 'side_scrolling_run_and_gun.v1.qa.destroy_target.assertion', status: 'passed' }]
        }
      ]
    });

    expect(plan.status).toBe('blocked');
    expect(plan.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'RUNTIME_OBSERVATION_REF_INVALID' })]));
    expect(report.status).toBe('failed');
  });

  it('blocks duplicate probe IDs across package and profile scenario probes', () => {
    const movement = createPackage('movement.run_jump.v1');
    const duplicateIdScenario = {
      ...createProfileScenario(),
      id: 'movement.run_jump.v1.qa.required',
      observations: [
        {
          ...createProfileScenario().observations[0],
          runtimeSystemId: 'movement.run_jump.v1.system'
        }
      ]
    };
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock([movement], ['movement.run_jump.v1']),
      packages: [movement],
      profileScenarios: [duplicateIdScenario]
    });
    const report = evaluateCapabilityQaReport({
      plan,
      probeResults: [
        {
          probeId: 'movement.run_jump.v1.qa.required',
          status: 'passed',
          assertionResults: [
            ...passedAssertionsFor(plan, 'movement.run_jump.v1.qa.required'),
            { assertionId: 'side_scrolling_run_and_gun.v1.qa.destroy_target.assertion', status: 'passed' as const }
          ]
        }
      ]
    });

    expect(plan.status).toBe('blocked');
    expect(plan.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'QA_PROBE_ID_CONFLICT', probeId: 'movement.run_jump.v1.qa.required' })]));
    expect(report.status).toBe('failed');
  });

  it('lets optional probe failures remain visible without masking required pass or fail status', () => {
    const movement = createPackage('movement.run_jump.v1', {
      probes: [
        createProbe('movement.run_jump.v1.qa.required', 'movement.run_jump.v1', 'movement.run_jump.v1.system'),
        createProbe('movement.run_jump.v1.qa.optional', 'movement.run_jump.v1', 'movement.run_jump.v1.system', { severity: 'optional' })
      ]
    });
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock([movement], ['movement.run_jump.v1']),
      packages: [movement]
    });
    const optionalFailure = evaluateCapabilityQaReport({
      plan,
      probeResults: [
        { probeId: 'movement.run_jump.v1.qa.required', status: 'passed', assertionResults: passedAssertionsFor(plan, 'movement.run_jump.v1.qa.required') },
        { probeId: 'movement.run_jump.v1.qa.optional', status: 'failed', assertionResults: failedAssertionsFor(plan, 'movement.run_jump.v1.qa.optional') }
      ]
    });
    const requiredFailure = evaluateCapabilityQaReport({
      plan,
      probeResults: [
        { probeId: 'movement.run_jump.v1.qa.required', status: 'failed', assertionResults: failedAssertionsFor(plan, 'movement.run_jump.v1.qa.required') },
        { probeId: 'movement.run_jump.v1.qa.optional', status: 'passed', assertionResults: passedAssertionsFor(plan, 'movement.run_jump.v1.qa.optional') }
      ]
    });
    const missingAssertionResults = evaluateCapabilityQaReport({
      plan,
      probeResults: [{ probeId: 'movement.run_jump.v1.qa.required', status: 'passed' }]
    });

    expect(optionalFailure.status).toBe('passed_with_optional_failures');
    expect(optionalFailure.failedOptionalProbeIds).toEqual(['movement.run_jump.v1.qa.optional']);
    expect(requiredFailure.status).toBe('failed');
    expect(requiredFailure.missingRequiredProbeIds).toEqual(['movement.run_jump.v1.qa.required']);
    expect(missingAssertionResults.status).toBe('failed');
  });

  it('derives package QA probe results from observed runtime event evidence without skipping assertion events', () => {
    const capabilityId = 'weapon.default_straight_single.v1';
    const probeId = 'weapon.default_straight_single.v1.fire.browser_qa.v1';
    const packages = [
      createPackage(capabilityId, {
        probes: [createRuntimeEventProbe(probeId, capabilityId, `${capabilityId}.system`, ['player.fired', 'projectile.spawned'])]
      })
    ];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });

    const passedReport = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'fire',
              eventType: 'player.fired',
              eventTypes: ['player.fired', 'projectile.spawned'],
              status: 'observed',
              sourceRef: 'qa_report.capability_runtime'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const failedReport = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'fire',
              eventType: 'player.fired',
              eventTypes: ['player.fired'],
              status: 'observed',
              sourceRef: 'qa_report.capability_runtime'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(passedReport.status).toBe('passed');
    expect(passedReport.requiredResults[0]?.assertionResults).toEqual([
      { assertionId: `${probeId}.assertion.player_fired`, status: 'passed' },
      { assertionId: `${probeId}.assertion.projectile_spawned`, status: 'passed' }
    ]);
    expect(failedReport.status).toBe('failed');
    expect(failedReport.missingRequiredProbeIds).toEqual([probeId]);
    expect(failedReport.requiredResults[0]?.assertionResults).toEqual([
      { assertionId: `${probeId}.assertion.player_fired`, status: 'passed' },
      expect.objectContaining({ assertionId: `${probeId}.assertion.projectile_spawned`, status: 'failed' })
    ]);
  });

  it('does not verify pickup collectible when event evidence lacks collection state fields', () => {
    const capabilityId = 'pickup.collectible.v1';
    const probeId = 'pickup.collectible.v1.collection.browser_qa.v1';
    const packages = [
      createPackage(capabilityId, {
        probes: [
          {
            ...createRuntimeEventProbe(probeId, capabilityId, `${capabilityId}.system`, ['pickup.collectible.collected', 'pickup.collectible.state_changed']),
            assertions: [
              {
                id: `${probeId}.assertion.collected`,
                observationId: `${probeId}.observation.pickup_collectible_collected`,
                comparator: 'exists',
                expected: { pickupCollected: true },
                message: 'pickup collected'
              },
              {
                id: `${probeId}.assertion.state_changed`,
                observationId: `${probeId}.observation.pickup_collectible_state_changed`,
                comparator: 'exists',
                expected: { pickupConsumed: true, pickupStateChanged: true },
                message: 'pickup consumed and state changed'
              }
            ]
          }
        ]
      })
    ];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const missingState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'collect',
              eventType: 'pickup.collectible.collected',
              eventTypes: ['pickup.collectible.collected', 'pickup.collectible.state_changed'],
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'collect',
              eventType: 'pickup.collectible.collected',
              eventTypes: ['pickup.collectible.collected', 'pickup.collectible.state_changed'],
              pickupCollected: true,
              pickupConsumed: true,
              pickupStateChanged: true,
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(missingState.status).toBe('failed');
    expect(missingState.missingRequiredProbeIds).toEqual([probeId]);
    expect(missingState.requiredResults[0]?.assertionResults).toEqual([
      expect.objectContaining({
        assertionId: `${probeId}.assertion.collected`,
        status: 'failed',
        message: expect.stringContaining('expected pickupCollected=true, observed <missing>')
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.state_changed`,
        status: 'failed',
        message: expect.stringContaining('expected pickupConsumed=true, observed <missing>')
      })
    ]);
    expect(observedState.status).toBe('passed');
  });

  it('does not verify spawn enemy wave when ordered event evidence lacks gate and sequence fields', () => {
    const capabilityId = 'spawn.enemy_wave.v1';
    const probeId = 'spawn.enemy_wave.v1.ordered.browser_qa.v1';
    const packages = [
      createPackage(capabilityId, {
        probes: [
          {
            ...createRuntimeEventProbe(probeId, capabilityId, `${capabilityId}.system`, ['spawn.enemy_wave.ordered']),
            assertions: [
              {
                id: `${probeId}.assertion.ordered_wave`,
                observationId: `${probeId}.observation.spawn_enemy_wave_ordered`,
                comparator: 'exists',
                expected: { orderedWaveSequence: true, gateTriggered: true, waveSpawned: true, sequenceIndex: 0 },
                message: 'ordered enemy wave observed after gate trigger'
              }
            ]
          }
        ]
      })
    ];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const missingOrder = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'spawn',
              eventType: 'spawn.enemy_wave.ordered',
              eventTypes: ['spawn.enemy_wave.ordered'],
              waveId: 'wave_approach',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedOrder = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'spawn',
              eventType: 'spawn.enemy_wave.ordered',
              eventTypes: ['spawn.enemy_wave.ordered'],
              orderedWaveSequence: true,
              gateTriggered: true,
              waveSpawned: true,
              sequenceIndex: 0,
              waveId: 'wave_approach',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(missingOrder.status).toBe('failed');
    expect(missingOrder.missingRequiredProbeIds).toEqual([probeId]);
    expect(missingOrder.requiredResults[0]?.assertionResults).toEqual([
      expect.objectContaining({
        assertionId: `${probeId}.assertion.ordered_wave`,
        status: 'failed',
        message: expect.stringContaining('expected orderedWaveSequence=true, observed <missing>')
      })
    ]);
    expect(observedOrder.status).toBe('passed');
  });

  it('does not verify weapon death reset when restore evidence lacks reset state fields', () => {
    const capabilityId = 'weapon.death_reset.v1';
    const probeId = WEAPON_DEATH_RESET_REQUIRED_PROBE_ID;
    const deathResetPackage = createWeaponDeathResetPackageContract();
    const packages = [{ ...deathResetPackage, dependencies: [] }];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const missingResetState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'restore_initial_weapon',
              eventType: WEAPON_DEATH_RESET_EVENT_TYPE,
              eventTypes: [WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE, WEAPON_DEATH_RESET_EVENT_TYPE],
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedResetState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'restore_initial_weapon',
              eventType: WEAPON_DEATH_RESET_EVENT_TYPE,
              eventTypes: [WEAPON_DEATH_RESET_PLAYER_DEFEATED_EVENT_TYPE, WEAPON_DEATH_RESET_EVENT_TYPE],
              weaponReset: true,
              currentWeaponId: WEAPON_DEATH_RESET_INITIAL_WEAPON_ID,
              initialWeaponId: WEAPON_DEATH_RESET_INITIAL_WEAPON_ID,
              previousWeaponId: WEAPON_DEATH_RESET_NON_INITIAL_WEAPON_ID,
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(missingResetState.status).toBe('failed');
    expect(missingResetState.missingRequiredProbeIds).toEqual([probeId]);
    expect(missingResetState.requiredResults[0]?.assertionResults).toEqual(expect.arrayContaining([
      expect.objectContaining({
        assertionId: `${probeId}.assertion.restored_initial_weapon`,
        status: 'failed',
        message: expect.stringContaining('expected weaponReset=true, observed <missing>')
      })
    ]));
    expect(observedResetState.status).toBe('passed');
  });

  it('does not verify weapon rapid fire when burst evidence lacks rate state fields', () => {
    const capabilityId = 'weapon.rapid_fire.v1';
    const probeId = WEAPON_RAPID_FIRE_REQUIRED_PROBE_ID;
    const rapidFirePackage = createWeaponRapidFirePackageContract();
    const packages = [{ ...rapidFirePackage, dependencies: [] }];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const missingRateState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'fire_burst',
              eventType: WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
              eventTypes: [WEAPON_RAPID_FIRE_BURST_EVENT_TYPE],
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedRateState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'fire_burst',
              eventType: WEAPON_RAPID_FIRE_BURST_EVENT_TYPE,
              eventTypes: [WEAPON_RAPID_FIRE_BURST_EVENT_TYPE],
              rapidFire: true,
              cooldownMs: WEAPON_RAPID_FIRE_COOLDOWN_MS,
              burstShotCount: WEAPON_RAPID_FIRE_BURST_SHOT_COUNT,
              burstWindowMs: WEAPON_RAPID_FIRE_BURST_WINDOW_MS,
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(missingRateState.status).toBe('failed');
    expect(missingRateState.missingRequiredProbeIds).toEqual([probeId]);
    expect(missingRateState.requiredResults[0]?.assertionResults).toEqual(expect.arrayContaining([
      expect.objectContaining({
        assertionId: `${probeId}.assertion.rapid_burst`,
        status: 'failed',
        message: expect.stringContaining('expected rapidFire=true, observed <missing>')
      })
    ]));
    expect(observedRateState.status).toBe('passed');
  });

  it('does not verify weapon spread shot when fire evidence lacks spread state fields', () => {
    const capabilityId = 'weapon.spread_shot.v1';
    const probeId = WEAPON_SPREAD_SHOT_REQUIRED_PROBE_ID;
    const spreadShotPackage = createWeaponSpreadShotPackageContract();
    const packages = [{ ...spreadShotPackage, dependencies: [] }];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const missingSpreadState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'fire_spread',
              eventType: WEAPON_SPREAD_SHOT_EVENT_TYPE,
              eventTypes: [WEAPON_SPREAD_SHOT_EVENT_TYPE],
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedSpreadState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'fire_spread',
              eventType: WEAPON_SPREAD_SHOT_EVENT_TYPE,
              eventTypes: [WEAPON_SPREAD_SHOT_EVENT_TYPE],
              spreadShot: true,
              projectileCount: WEAPON_SPREAD_SHOT_PROJECTILE_COUNT,
              spreadArcDeg: WEAPON_SPREAD_SHOT_SPREAD_ARC_DEGREES,
              spreadAnglesDeg: WEAPON_SPREAD_SHOT_SPREAD_ANGLES_DEGREES,
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(missingSpreadState.status).toBe('failed');
    expect(missingSpreadState.missingRequiredProbeIds).toEqual([probeId]);
    expect(missingSpreadState.requiredResults[0]?.assertionResults).toEqual(expect.arrayContaining([
      expect.objectContaining({
        assertionId: `${probeId}.assertion.spread_projectiles`,
        status: 'failed',
        message: expect.stringContaining('expected spreadShot=true, observed <missing>')
      })
    ]));
    expect(observedSpreadState.status).toBe('passed');
  });

  it('does not verify weapon replacement rule when pickup evidence lacks replacement state fields', () => {
    const capabilityId = 'weapon.replacement_rule.v1';
    const probeId = WEAPON_REPLACEMENT_RULE_REQUIRED_PROBE_ID;
    const replacementPackage = createWeaponReplacementRulePackageContract();
    const packages = [{ ...replacementPackage, dependencies: [] }];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const missingReplacementState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'collect_weapon_pickup',
              eventType: WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE,
              eventTypes: [WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE, WEAPON_REPLACEMENT_RULE_EVENT_TYPE],
              pickupCollected: true,
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedReplacementState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'collect_weapon_pickup',
              eventType: WEAPON_REPLACEMENT_RULE_EVENT_TYPE,
              eventTypes: [WEAPON_REPLACEMENT_RULE_PICKUP_EVENT_TYPE, WEAPON_REPLACEMENT_RULE_EVENT_TYPE],
              pickupCollected: true,
              weaponReplaced: true,
              previousWeaponId: WEAPON_REPLACEMENT_RULE_PREVIOUS_WEAPON_ID,
              currentWeaponId: WEAPON_REPLACEMENT_RULE_REPLACEMENT_WEAPON_ID,
              replacementWeaponId: WEAPON_REPLACEMENT_RULE_REPLACEMENT_WEAPON_ID,
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(missingReplacementState.status).toBe('failed');
    expect(missingReplacementState.missingRequiredProbeIds).toEqual([probeId]);
    expect(missingReplacementState.requiredResults[0]?.assertionResults).toEqual(expect.arrayContaining([
      expect.objectContaining({
        assertionId: `${probeId}.assertion.replaced_weapon`,
        status: 'failed',
        message: expect.stringContaining('expected weaponReplaced=true, observed <missing>')
      })
    ]));
    expect(observedReplacementState.status).toBe('passed');
  });

  it('resolves weapon supply only when the full dependency chain is present', () => {
    const report = resolveGameplayCapabilityGraph({
      requestedCapabilities: ['pickup.weapon_supply.v1'],
      packages: [
        createCollisionPlatformPackageContract(),
        createPickupCollectiblePackageContract(),
        createDefaultStraightSingleWeaponPackageContract(),
        createPickupWeaponSupplyPackageContract()
      ],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });

    expect(report.status).toBe('resolved');
    expect(report.diagnostics).toEqual([]);
    expect(report.selectedCapabilityIds).toEqual([
      'collision.platform.v1',
      'pickup.collectible.v1',
      'pickup.weapon_supply.v1',
      'weapon.default_straight_single.v1'
    ]);
  });

  it('fails closed when weapon supply is missing the transitive collision dependency', () => {
    const report = resolveGameplayCapabilityGraph({
      requestedCapabilities: ['pickup.weapon_supply.v1'],
      packages: [
        createPickupCollectiblePackageContract(),
        createDefaultStraightSingleWeaponPackageContract(),
        createPickupWeaponSupplyPackageContract()
      ],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });

    expect(report.status).toBe('blocked');
    expect(report.lock).toBeUndefined();
    expect(report.selectedCapabilityIds).toEqual([
      'pickup.collectible.v1',
      'pickup.weapon_supply.v1',
      'weapon.default_straight_single.v1'
    ]);
    expect(report.diagnostics.map((diagnostic) => diagnostic.capabilityId)).toEqual(['collision.platform.v1']);
    expect(report.diagnostics).not.toEqual(expect.arrayContaining([expect.objectContaining({ capabilityId: 'pickup.weapon_supply.v1' })]));
    expect(report.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MISSING_CAPABILITY',
          capabilityId: 'collision.platform.v1',
          requestedBy: ['pickup.collectible.v1']
        })
      ])
    );
    expect(report.diagnostics.find((diagnostic) => diagnostic.capabilityId === 'collision.platform.v1')?.explanation).toContain(
      'No package candidate exists'
    );
  });

  it('fails closed when pickup collectible declares package semver for a capability dependency range', () => {
    const packageSemverCollectible: GameplayCapabilityPackageContract = {
      ...createPickupCollectiblePackageContract(),
      dependencies: [{ capabilityId: 'collision.platform.v1', range: '^1.0.0' }]
    };
    const report = resolveGameplayCapabilityGraph({
      requestedCapabilities: ['pickup.weapon_supply.v1'],
      packages: [
        createCollisionPlatformPackageContract(),
        packageSemverCollectible,
        createDefaultStraightSingleWeaponPackageContract(),
        createPickupWeaponSupplyPackageContract()
      ],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });

    expect(report.status).toBe('blocked');
    expect(report.lock).toBeUndefined();
    expect(report.selectedCapabilityIds).toEqual([
      'pickup.collectible.v1',
      'pickup.weapon_supply.v1',
      'weapon.default_straight_single.v1'
    ]);
    expect(report.diagnostics.map((diagnostic) => diagnostic.capabilityId)).toEqual(['collision.platform.v1']);
    expect(report.diagnostics).not.toEqual(expect.arrayContaining([expect.objectContaining({ capabilityId: 'pickup.weapon_supply.v1' })]));
    expect(report.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'VERSION_CONFLICT',
          capabilityId: 'collision.platform.v1',
          requestedBy: ['pickup.collectible.v1']
        })
      ])
    );
    expect(report.diagnostics.find((diagnostic) => diagnostic.capabilityId === 'collision.platform.v1')?.explanation).toContain(
      'version range ^1.0.0'
    );
  });

  it('does not verify weapon supply from generic pickup or replacement evidence without supply grant state', () => {
    const capabilityId = 'pickup.weapon_supply.v1';
    const probeId = PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID;
    const packages = [
      createCollisionPlatformPackageContract(),
      createPickupCollectiblePackageContract(),
      createDefaultStraightSingleWeaponPackageContract(),
      createPickupWeaponSupplyPackageContract()
    ];
    const dependencyEvidence = [
      {
        capabilityId: 'collision.platform.v1',
        probeId: COLLISION_PLATFORM_REQUIRED_PROBE_ID,
        action: 'collide',
        eventType: 'collision.platform.grounded',
        eventTypes: ['collision.platform.grounded'],
        status: 'observed' as const
      },
      {
        capabilityId: 'pickup.collectible.v1',
        probeId: PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID,
        action: 'collect',
        eventType: 'pickup.collectible.collected',
        eventTypes: ['pickup.collectible.collected', 'pickup.collectible.state_changed'],
        pickupCollected: true,
        pickupConsumed: true,
        pickupStateChanged: true,
        status: 'observed' as const
      },
      {
        capabilityId: 'weapon.default_straight_single.v1',
        probeId: DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID,
        action: 'fire',
        eventType: 'player.fired',
        eventTypes: ['player.fired', 'projectile.spawned'],
        status: 'observed' as const
      }
    ];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    expect(plan.status).toBe('ready');
    expect(plan.requiredProbes.map((probe) => probe.id)).toEqual([
      COLLISION_PLATFORM_REQUIRED_PROBE_ID,
      PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID,
      PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID,
      DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID
    ]);
    const genericPickupEvidence = evaluateCapabilityQaReport({
      plan,
      requirePlanScopedResults: true,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            ...dependencyEvidence,
            {
              capabilityId,
              probeId,
              action: 'collect',
              eventType: 'pickup.collectible.collected',
              eventTypes: ['pickup.collectible.collected', WEAPON_REPLACEMENT_RULE_EVENT_TYPE],
              pickupCollected: true,
              pickupConsumed: true,
              pickupStateChanged: true,
              weaponReplaced: true,
              replacementWeaponId: WEAPON_REPLACEMENT_RULE_REPLACEMENT_WEAPON_ID,
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedWeaponSupply = evaluateCapabilityQaReport({
      plan,
      requirePlanScopedResults: true,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            ...dependencyEvidence,
            {
              capabilityId,
              probeId,
              action: 'collect_weapon_supply',
              eventType: PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
              eventTypes: [PICKUP_WEAPON_SUPPLY_EVENT_TYPE, 'pickup.collectible.collected'],
              weaponSupplyAvailable: true,
              weaponSupplyNodeId: PICKUP_WEAPON_SUPPLY_NODE_ID,
              weaponSupplyPickupId: PICKUP_WEAPON_SUPPLY_PICKUP_ID,
              weaponSupplyWeaponId: PICKUP_WEAPON_SUPPLY_WEAPON_ID,
              weaponSupplyCollected: true,
              weaponSupplyConsumed: true,
              weaponSupplyGranted: true,
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(genericPickupEvidence.status).toBe('failed');
    expect(genericPickupEvidence.missingRequiredProbeIds).toEqual([probeId]);
    expect(genericPickupEvidence.requiredResults.filter((entry) => entry.status === 'failed').map((entry) => entry.probeId)).toEqual([probeId]);
    for (const dependencyProbeId of [
      COLLISION_PLATFORM_REQUIRED_PROBE_ID,
      PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID,
      DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID
    ]) {
      expect(genericPickupEvidence.requiredResults.find((entry) => entry.probeId === dependencyProbeId)).toMatchObject({
        status: 'passed',
        planHash: plan.planHash
      });
    }
    expect(genericPickupEvidence.requiredResults.find((entry) => entry.probeId === probeId)).toMatchObject({
      status: 'failed',
      planHash: plan.planHash
    });
    expect(genericPickupEvidence.requiredResults.find((entry) => entry.probeId === probeId)?.assertionResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${probeId}.assertion.weapon_supply_verified`,
          status: 'failed',
          message: expect.stringContaining(`observation ${PICKUP_WEAPON_SUPPLY_EVENT_TYPE} not observed`)
        }),
        expect.objectContaining({
          assertionId: `${probeId}.assertion.weapon_supply_verified`,
          status: 'failed',
          message: expect.stringContaining('expected weaponSupplyGranted=true, observed <missing>')
        }),
        expect.objectContaining({
          assertionId: `${probeId}.assertion.weapon_supply_verified`,
          status: 'failed',
          message: expect.stringContaining(`expected weaponSupplyNodeId=${PICKUP_WEAPON_SUPPLY_NODE_ID}, observed <missing>`)
        })
      ])
    );
    expect(observedWeaponSupply.status).toBe('passed');
    for (const dependencyProbeId of [
      COLLISION_PLATFORM_REQUIRED_PROBE_ID,
      PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID,
      DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID
    ]) {
      expect(observedWeaponSupply.requiredResults.find((entry) => entry.probeId === dependencyProbeId)).toMatchObject({
        status: 'passed',
        planHash: plan.planHash
      });
    }
    expect(observedWeaponSupply.requiredResults.find((entry) => entry.probeId === probeId)).toMatchObject({
      status: 'passed',
      planHash: plan.planHash
    });
  });

  it('keeps stale weapon supply probe evidence from satisfying the current QA plan', () => {
    const capabilityId = 'pickup.weapon_supply.v1';
    const probeId = PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID;
    const packages = [
      createCollisionPlatformPackageContract(),
      createPickupCollectiblePackageContract(),
      createDefaultStraightSingleWeaponPackageContract(),
      createPickupWeaponSupplyPackageContract()
    ];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const currentPlanProbeResults = buildCapabilityQaProbeResultsFromRuntimeEvidence({
      plan,
      evidence: {
        status: 'PASSED',
        observed: [
          {
            capabilityId: 'collision.platform.v1',
            probeId: COLLISION_PLATFORM_REQUIRED_PROBE_ID,
            action: 'collide',
            eventType: 'collision.platform.grounded',
            eventTypes: ['collision.platform.grounded'],
            status: 'observed'
          },
          {
            capabilityId: 'pickup.collectible.v1',
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
            capabilityId: 'weapon.default_straight_single.v1',
            probeId: DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID,
            action: 'fire',
            eventType: 'player.fired',
            eventTypes: ['player.fired', 'projectile.spawned'],
            status: 'observed'
          },
          {
            capabilityId,
            probeId,
            action: 'collect_weapon_supply',
            eventType: PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
            eventTypes: [PICKUP_WEAPON_SUPPLY_EVENT_TYPE, 'pickup.collectible.collected'],
            weaponSupplyAvailable: true,
            weaponSupplyNodeId: PICKUP_WEAPON_SUPPLY_NODE_ID,
            weaponSupplyPickupId: PICKUP_WEAPON_SUPPLY_PICKUP_ID,
            weaponSupplyWeaponId: PICKUP_WEAPON_SUPPLY_WEAPON_ID,
            weaponSupplyCollected: true,
            weaponSupplyConsumed: true,
            weaponSupplyGranted: true,
            status: 'observed'
          }
        ],
        missingProbeIds: [],
        mismatches: []
      }
    });
    expect(currentPlanProbeResults.every((result) => result.planHash === plan.planHash)).toBe(true);
    const unscopedProbeResults = currentPlanProbeResults.map((result) => {
      if (result.probeId !== probeId) {
        return result;
      }
      const { planHash: _planHash, ...unscopedResult } = result;
      return unscopedResult;
    });
    const probeResults = currentPlanProbeResults.map((result) => (result.probeId === probeId ? { ...result, planHash: 'stale_plan_hash' } : result));
    const unscopedReport = evaluateCapabilityQaReport({ plan, probeResults: unscopedProbeResults, requirePlanScopedResults: true });
    const report = evaluateCapabilityQaReport({ plan, probeResults, requirePlanScopedResults: true });

    expect(unscopedReport.status).toBe('failed');
    expect(unscopedReport.missingRequiredProbeIds).toEqual([probeId]);
    expect(unscopedReport.requiredResults.find((entry) => entry.probeId === probeId)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${probeId}.plan_hash`,
          failureKind: 'PLAN_SCOPE_REQUIRED',
          capabilityId,
          expectedPlanHash: plan.planHash,
          actualPlanHash: '<missing>',
          resultSource: 'probe_result',
          status: 'failed'
        })
      ])
    });
    expect(report.status).toBe('failed');
    expect(report.missingRequiredProbeIds).toEqual([probeId]);
    for (const dependencyProbeId of [
      COLLISION_PLATFORM_REQUIRED_PROBE_ID,
      PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID,
      DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID
    ]) {
      expect(report.requiredResults.find((entry) => entry.probeId === dependencyProbeId)).toMatchObject({
        status: 'passed',
        planHash: plan.planHash
      });
    }
    expect(report.requiredResults.find((entry) => entry.probeId === probeId)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${probeId}.plan_hash`,
          failureKind: 'PLAN_MISMATCH',
          capabilityId,
          expectedPlanHash: plan.planHash,
          actualPlanHash: 'stale_plan_hash',
          resultSource: 'probe_result',
          status: 'failed',
          message: expect.stringContaining('expected')
        })
      ])
    });
  });

  it('does not treat stale dependency probe evidence as current weapon supply dependency success', () => {
    const capabilityId = 'pickup.weapon_supply.v1';
    const probeId = PICKUP_WEAPON_SUPPLY_REQUIRED_PROBE_ID;
    const packages = [
      createCollisionPlatformPackageContract(),
      createPickupCollectiblePackageContract(),
      createDefaultStraightSingleWeaponPackageContract(),
      createPickupWeaponSupplyPackageContract()
    ];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const currentPlanProbeResults = buildCapabilityQaProbeResultsFromRuntimeEvidence({
      plan,
      evidence: {
        status: 'PASSED',
        observed: [
          {
            capabilityId: 'collision.platform.v1',
            probeId: COLLISION_PLATFORM_REQUIRED_PROBE_ID,
            action: 'collide',
            eventType: 'collision.platform.grounded',
            eventTypes: ['collision.platform.grounded'],
            status: 'observed'
          },
          {
            capabilityId: 'pickup.collectible.v1',
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
            capabilityId: 'weapon.default_straight_single.v1',
            probeId: DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID,
            action: 'fire',
            eventType: 'player.fired',
            eventTypes: ['player.fired', 'projectile.spawned'],
            status: 'observed'
          },
          {
            capabilityId,
            probeId,
            action: 'collect_weapon_supply',
            eventType: PICKUP_WEAPON_SUPPLY_EVENT_TYPE,
            eventTypes: [PICKUP_WEAPON_SUPPLY_EVENT_TYPE, 'pickup.collectible.collected'],
            weaponSupplyAvailable: true,
            weaponSupplyNodeId: PICKUP_WEAPON_SUPPLY_NODE_ID,
            weaponSupplyPickupId: PICKUP_WEAPON_SUPPLY_PICKUP_ID,
            weaponSupplyWeaponId: PICKUP_WEAPON_SUPPLY_WEAPON_ID,
            weaponSupplyCollected: true,
            weaponSupplyConsumed: true,
            weaponSupplyGranted: true,
            status: 'observed'
          }
        ],
        missingProbeIds: [],
        mismatches: []
      }
    });
    expect(currentPlanProbeResults.every((result) => result.planHash === plan.planHash)).toBe(true);
    const probeResults = currentPlanProbeResults.map((result) =>
      result.probeId === PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID ? { ...result, planHash: 'stale_dependency_plan_hash' } : result
    );
    const report = evaluateCapabilityQaReport({ plan, probeResults, requirePlanScopedResults: true });

    expect(report.status).toBe('failed');
    expect(report.missingRequiredProbeIds).toEqual([PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID]);
    expect(report.requiredResults.find((entry) => entry.probeId === PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID)).toMatchObject({
      status: 'failed',
      assertionResults: expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${PICKUP_COLLECTIBLE_REQUIRED_PROBE_ID}.plan_hash`,
          failureKind: 'PLAN_MISMATCH',
          capabilityId: 'pickup.collectible.v1',
          expectedPlanHash: plan.planHash,
          actualPlanHash: 'stale_dependency_plan_hash',
          resultSource: 'probe_result',
          status: 'failed',
          message: expect.stringContaining('stale_dependency_plan_hash')
        })
      ])
    });
    expect(report.requiredResults.find((entry) => entry.probeId === probeId)).toMatchObject({
      status: 'passed',
      planHash: plan.planHash
    });
  });

  it('does not verify artifact lineage no-manual-patch when lineage evidence lacks no-manual-patch state fields', () => {
    const capabilityId = 'artifact.lineage_no_manual_patch.v1';
    const probeId = ARTIFACT_LINEAGE_NO_MANUAL_PATCH_REQUIRED_PROBE_ID;
    const lineagePackage = createArtifactLineageNoManualPatchPackageContract();
    const packages = [lineagePackage];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const missingNoManualPatchState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'verify_lineage',
              eventType: ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
              eventTypes: [ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE],
              sourceRef: 'artifact.lineage.hash',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedNoManualPatchState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'verify_lineage',
              eventType: ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE,
              eventTypes: [ARTIFACT_LINEAGE_NO_MANUAL_PATCH_EVENT_TYPE],
              pipelineProduced: true,
              manualPatchDetected: false,
              lineageVerified: true,
              sourceRef: 'artifact.lineage.hash',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(missingNoManualPatchState.status).toBe('failed');
    expect(missingNoManualPatchState.missingRequiredProbeIds).toEqual([probeId]);
    expect(missingNoManualPatchState.requiredResults[0]?.assertionResults).toEqual(expect.arrayContaining([
      expect.objectContaining({
        assertionId: `${probeId}.assertion.no_manual_patch`,
        status: 'failed',
        message: expect.stringContaining('expected pipelineProduced=true, observed <missing>')
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.no_manual_patch`,
        status: 'failed',
        message: expect.stringContaining('expected manualPatchDetected=false, observed <missing>')
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.no_manual_patch`,
        status: 'failed',
        message: expect.stringContaining('expected lineageVerified=true, observed <missing>')
      })
    ]));
    expect(observedNoManualPatchState.status).toBe('passed');
  });

  it('does not verify artifact no-hidden-script when module-load evidence lacks manifest state fields', () => {
    const capabilityId = 'artifact.no_hidden_script.v1';
    const probeId = ARTIFACT_NO_HIDDEN_SCRIPT_REQUIRED_PROBE_ID;
    const noHiddenScriptPackage = createArtifactNoHiddenScriptPackageContract();
    const packages = [noHiddenScriptPackage];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const missingManifestState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'verify_no_hidden_script',
              eventType: ARTIFACT_NO_HIDDEN_SCRIPT_EVENT_TYPE,
              eventTypes: [ARTIFACT_NO_HIDDEN_SCRIPT_EVENT_TYPE],
              sourceRef: 'runtime.manifest.module_load_receipt',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedManifestState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'verify_no_hidden_script',
              eventType: ARTIFACT_NO_HIDDEN_SCRIPT_EVENT_TYPE,
              eventTypes: [ARTIFACT_NO_HIDDEN_SCRIPT_EVENT_TYPE],
              declaredModulesOnly: true,
              hiddenScriptDetected: false,
              moduleLoadManifestVerified: true,
              sourceRef: 'runtime.manifest.module_load_receipt',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(missingManifestState.status).toBe('failed');
    expect(missingManifestState.missingRequiredProbeIds).toEqual([probeId]);
    expect(missingManifestState.requiredResults[0]?.assertionResults).toEqual(expect.arrayContaining([
      expect.objectContaining({
        assertionId: `${probeId}.assertion.no_hidden_script`,
        status: 'failed',
        message: expect.stringContaining('expected declaredModulesOnly=true, observed <missing>')
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.no_hidden_script`,
        status: 'failed',
        message: expect.stringContaining('expected hiddenScriptDetected=false, observed <missing>')
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.no_hidden_script`,
        status: 'failed',
        message: expect.stringContaining('expected moduleLoadManifestVerified=true, observed <missing>')
      })
    ]));
    expect(observedManifestState.status).toBe('passed');
  });

  it('does not verify camera bounds clamp when scroll evidence lacks boundary state fields', () => {
    const capabilityId = 'camera.bounds_clamp.v1';
    const probeId = CAMERA_BOUNDS_CLAMP_REQUIRED_PROBE_ID;
    const packageContract = createCameraBoundsClampPackageContract();
    const packages = [packageContract];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const missingBoundaryState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'verify_camera_bounds',
              eventType: CAMERA_BOUNDS_CLAMP_EVENT_TYPE,
              eventTypes: [CAMERA_BOUNDS_CLAMP_EVENT_TYPE, 'camera.side_follow.active'],
              sourceRef: 'runtime.camera.bounds',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedBoundaryState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'verify_camera_bounds',
              eventType: CAMERA_BOUNDS_CLAMP_EVENT_TYPE,
              eventTypes: [CAMERA_BOUNDS_CLAMP_EVENT_TYPE, 'camera.side_follow.active'],
              cameraWithinWorldBounds: true,
              leftBoundaryClamped: true,
              rightBoundaryClamped: true,
              sourceRef: 'runtime.camera.bounds',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(missingBoundaryState.status).toBe('failed');
    expect(missingBoundaryState.missingRequiredProbeIds).toEqual([probeId]);
    expect(missingBoundaryState.requiredResults[0]?.assertionResults).toEqual(expect.arrayContaining([
      expect.objectContaining({
        assertionId: `${probeId}.assertion.bounds_clamped`,
        status: 'failed',
        message: expect.stringContaining('expected cameraWithinWorldBounds=true, observed <missing>')
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.bounds_clamped`,
        status: 'failed',
        message: expect.stringContaining('expected leftBoundaryClamped=true, observed <missing>')
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.bounds_clamped`,
        status: 'failed',
        message: expect.stringContaining('expected rightBoundaryClamped=true, observed <missing>')
      })
    ]));
    expect(observedBoundaryState.status).toBe('passed');
  });

  it('does not verify canonical semantic preservation when evidence lacks semantic state fields', () => {
    const capabilityId = 'canonical.semantic_preservation.v1';
    const probeId = CANONICAL_SEMANTIC_PRESERVATION_REQUIRED_PROBE_ID;
    const packageContract = createCanonicalSemanticPreservationPackageContract();
    const packages = [packageContract];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const missingSemanticState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'verify_semantic_preservation',
              eventType: CANONICAL_SEMANTIC_PRESERVATION_EVENT_TYPE,
              eventTypes: [CANONICAL_SEMANTIC_PRESERVATION_EVENT_TYPE],
              sourceRef: 'canonical.semantic.hash',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedSemanticState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'verify_semantic_preservation',
              eventType: CANONICAL_SEMANTIC_PRESERVATION_EVENT_TYPE,
              eventTypes: [CANONICAL_SEMANTIC_PRESERVATION_EVENT_TYPE],
              canonicalHashMatched: true,
              semanticIntentPreserved: true,
              droppedCanonicalNodes: false,
              sourceRef: 'canonical.semantic.hash',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(missingSemanticState.status).toBe('failed');
    expect(missingSemanticState.missingRequiredProbeIds).toEqual([probeId]);
    expect(missingSemanticState.requiredResults[0]?.assertionResults).toEqual(expect.arrayContaining([
      expect.objectContaining({
        assertionId: `${probeId}.assertion.semantic_preserved`,
        status: 'failed',
        message: expect.stringContaining('expected canonicalHashMatched=true, observed <missing>')
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.semantic_preserved`,
        status: 'failed',
        message: expect.stringContaining('expected semanticIntentPreserved=true, observed <missing>')
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.semantic_preserved`,
        status: 'failed',
        message: expect.stringContaining('expected droppedCanonicalNodes=false, observed <missing>')
      })
    ]));
    expect(observedSemanticState.status).toBe('passed');
  });

  it('does not verify collision damage affinity when evidence lacks matrix state fields', () => {
    const capabilityId = 'collision.damage_affinity_matrix.v1';
    const probeId = COLLISION_DAMAGE_AFFINITY_MATRIX_REQUIRED_PROBE_ID;
    const packageContract = createCollisionDamageAffinityMatrixPackageContract();
    const packages = [packageContract];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const missingAffinityState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'verify_damage_affinity_matrix',
              eventType: COLLISION_DAMAGE_AFFINITY_MATRIX_EVENT_TYPE,
              eventTypes: [COLLISION_DAMAGE_AFFINITY_MATRIX_EVENT_TYPE],
              sourceRef: 'runtime.damage_affinity.matrix',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedAffinityState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'verify_damage_affinity_matrix',
              eventType: COLLISION_DAMAGE_AFFINITY_MATRIX_EVENT_TYPE,
              eventTypes: [COLLISION_DAMAGE_AFFINITY_MATRIX_EVENT_TYPE],
              playerProjectilesDamageEnemies: true,
              playerProjectilesDamagePlayer: false,
              enemyProjectilesDamagePlayer: true,
              enemyProjectilesDamageEnemies: false,
              hazardsDamagePlayer: true,
              hazardsDamageEnemies: false,
              sourceRef: 'runtime.damage_affinity.matrix',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(missingAffinityState.status).toBe('failed');
    expect(missingAffinityState.missingRequiredProbeIds).toEqual([probeId]);
    expect(missingAffinityState.requiredResults[0]?.assertionResults).toEqual(expect.arrayContaining([
      expect.objectContaining({
        assertionId: `${probeId}.assertion.affinity_matrix_enforced`,
        status: 'failed',
        message: expect.stringContaining('expected playerProjectilesDamageEnemies=true, observed <missing>')
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.affinity_matrix_enforced`,
        status: 'failed',
        message: expect.stringContaining('expected playerProjectilesDamagePlayer=false, observed <missing>')
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.affinity_matrix_enforced`,
        status: 'failed',
        message: expect.stringContaining('expected enemyProjectilesDamagePlayer=true, observed <missing>')
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.affinity_matrix_enforced`,
        status: 'failed',
        message: expect.stringContaining('expected hazardsDamageEnemies=false, observed <missing>')
      })
    ]));
    expect(observedAffinityState.status).toBe('passed');
  });

  it('does not verify enemy boss attack pattern when evidence lacks runtime pattern state fields', () => {
    const capabilityId = 'enemy.boss_attack_pattern.v1';
    const probeId = ENEMY_BOSS_ATTACK_PATTERN_REQUIRED_PROBE_ID;
    const packageContract = createEnemyBossAttackPatternPackageContract();
    const packages = [packageContract];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const missingPatternState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'verify_boss_attack_pattern',
              eventType: ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
              eventTypes: [ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE],
              sourceRef: 'runtime.boss.attack_pattern',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedPatternState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'verify_boss_attack_pattern',
              eventType: ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE,
              eventTypes: [ENEMY_BOSS_ATTACK_PATTERN_EVENT_TYPE],
              bossAttackPatternActive: true,
              bossAttackPhaseId: ENEMY_BOSS_ATTACK_PATTERN_PHASE_ID,
              bossAttackPatternId: ENEMY_BOSS_ATTACK_PATTERN_PATTERN_ID,
              bossAttackCadenceMs: ENEMY_BOSS_ATTACK_PATTERN_CADENCE_MS,
              bossAttackTargetsPlayer: true,
              sourceRef: 'runtime.boss.attack_pattern',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(missingPatternState.status).toBe('failed');
    expect(missingPatternState.missingRequiredProbeIds).toEqual([probeId]);
    expect(missingPatternState.requiredResults[0]?.assertionResults).toEqual(expect.arrayContaining([
      expect.objectContaining({
        assertionId: `${probeId}.assertion.pattern_state_verified`,
        status: 'failed',
        message: expect.stringContaining('expected bossAttackPatternActive=true, observed <missing>')
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.pattern_state_verified`,
        status: 'failed',
        message: expect.stringContaining(`expected bossAttackPhaseId=${ENEMY_BOSS_ATTACK_PATTERN_PHASE_ID}, observed <missing>`)
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.pattern_state_verified`,
        status: 'failed',
        message: expect.stringContaining(`expected bossAttackPatternId=${ENEMY_BOSS_ATTACK_PATTERN_PATTERN_ID}, observed <missing>`)
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.pattern_state_verified`,
        status: 'failed',
        message: expect.stringContaining('expected bossAttackTargetsPlayer=true, observed <missing>')
      })
    ]));
    expect(observedPatternState.status).toBe('passed');
  });

  it('does not verify enemy boss lifecycle when evidence lacks runtime lifecycle state fields', () => {
    const capabilityId = 'enemy.boss_lifecycle.v1';
    const probeId = ENEMY_BOSS_LIFECYCLE_REQUIRED_PROBE_ID;
    const packageContract = createEnemyBossLifecyclePackageContract();
    const packages = [packageContract];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const missingLifecycleState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'verify_boss_lifecycle',
              eventType: ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
              eventTypes: [ENEMY_BOSS_LIFECYCLE_EVENT_TYPE],
              sourceRef: 'runtime.boss.lifecycle',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedLifecycleState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'verify_boss_lifecycle',
              eventType: ENEMY_BOSS_LIFECYCLE_EVENT_TYPE,
              eventTypes: [ENEMY_BOSS_LIFECYCLE_EVENT_TYPE],
              bossLifecycleStarted: true,
              bossEntityId: ENEMY_BOSS_LIFECYCLE_BOSS_ENTITY_ID,
              bossMaxHealth: ENEMY_BOSS_LIFECYCLE_MAX_HEALTH,
              bossHealthInitialized: true,
              bossDefeated: true,
              sourceRef: 'runtime.boss.lifecycle',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(missingLifecycleState.status).toBe('failed');
    expect(missingLifecycleState.missingRequiredProbeIds).toEqual([probeId]);
    expect(missingLifecycleState.requiredResults[0]?.assertionResults).toEqual(expect.arrayContaining([
      expect.objectContaining({
        assertionId: `${probeId}.assertion.lifecycle_verified`,
        status: 'failed',
        message: expect.stringContaining('expected bossLifecycleStarted=true, observed <missing>')
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.lifecycle_verified`,
        status: 'failed',
        message: expect.stringContaining(`expected bossEntityId=${ENEMY_BOSS_LIFECYCLE_BOSS_ENTITY_ID}, observed <missing>`)
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.lifecycle_verified`,
        status: 'failed',
        message: expect.stringContaining(`expected bossMaxHealth=${ENEMY_BOSS_LIFECYCLE_MAX_HEALTH}, observed <missing>`)
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.lifecycle_verified`,
        status: 'failed',
        message: expect.stringContaining('expected bossDefeated=true, observed <missing>')
      })
    ]));
    expect(observedLifecycleState.status).toBe('passed');
  });

  it('does not verify enemy boss phase transition when evidence lacks runtime phase state fields', () => {
    const capabilityId = 'enemy.boss_phase_transition.v1';
    const probeId = ENEMY_BOSS_PHASE_TRANSITION_REQUIRED_PROBE_ID;
    const packages = [createEnemyBossLifecyclePackageContract(), createEnemyBossPhaseTransitionPackageContract()];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const missingPhaseState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'verify_boss_phase_transition',
              eventType: ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
              eventTypes: [ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE],
              sourceRef: 'runtime.boss.phase_transition',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedPhaseState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'verify_boss_phase_transition',
              eventType: ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE,
              eventTypes: [ENEMY_BOSS_PHASE_TRANSITION_EVENT_TYPE],
              bossPhaseTransitioned: true,
              bossPreviousPhaseId: ENEMY_BOSS_PHASE_TRANSITION_FROM_PHASE_ID,
              bossCurrentPhaseId: ENEMY_BOSS_PHASE_TRANSITION_TO_PHASE_ID,
              bossHealthThresholdRatio: ENEMY_BOSS_PHASE_TRANSITION_HEALTH_THRESHOLD_RATIO,
              bossSpeedMultiplier: ENEMY_BOSS_PHASE_TRANSITION_SPEED_MULTIPLIER,
              bossSpeedMultiplierApplied: true,
              sourceRef: 'runtime.boss.phase_transition',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(missingPhaseState.status).toBe('failed');
    expect(missingPhaseState.missingRequiredProbeIds).toEqual([probeId]);
    expect(missingPhaseState.requiredResults.find((entry) => entry.probeId === probeId)?.assertionResults).toEqual(expect.arrayContaining([
      expect.objectContaining({
        assertionId: `${probeId}.assertion.phase_transition_verified`,
        status: 'failed',
        message: expect.stringContaining('expected bossPhaseTransitioned=true, observed <missing>')
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.phase_transition_verified`,
        status: 'failed',
        message: expect.stringContaining(`expected bossPreviousPhaseId=${ENEMY_BOSS_PHASE_TRANSITION_FROM_PHASE_ID}, observed <missing>`)
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.phase_transition_verified`,
        status: 'failed',
        message: expect.stringContaining(`expected bossCurrentPhaseId=${ENEMY_BOSS_PHASE_TRANSITION_TO_PHASE_ID}, observed <missing>`)
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.phase_transition_verified`,
        status: 'failed',
        message: expect.stringContaining(`expected bossSpeedMultiplier=${ENEMY_BOSS_PHASE_TRANSITION_SPEED_MULTIPLIER}, observed <missing>`)
      })
    ]));
    expect(observedPhaseState.status).toBe('passed');
  });

  it('does not verify enemy fixed turret when evidence lacks stationary turret state fields', () => {
    const capabilityId = 'enemy.fixed_turret.v1';
    const probeId = ENEMY_FIXED_TURRET_REQUIRED_PROBE_ID;
    const packages = [createSpawnStaticPackageContract(), createCombatProjectilePackageContract(), createEnemyFixedTurretPackageContract()];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const missingTurretState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId: 'combat.projectile.v1',
              probeId: COMBAT_PROJECTILE_REQUIRED_PROBE_ID,
              action: 'fire',
              eventType: 'projectile.spawned',
              eventTypes: ['projectile.spawned'],
              sourceRef: 'runtime.projectile.spawn',
              status: 'observed'
            },
            {
              capabilityId: 'spawn.static.v1',
              probeId: SPAWN_STATIC_REQUIRED_PROBE_ID,
              action: 'reach_trigger',
              eventType: 'spawn.static.triggered',
              eventTypes: ['spawn.static.triggered'],
              sourceRef: 'runtime.spawn.static',
              status: 'observed'
            },
            {
              capabilityId,
              probeId,
              action: 'verify_fixed_turret',
              eventType: ENEMY_FIXED_TURRET_EVENT_TYPE,
              eventTypes: [ENEMY_FIXED_TURRET_EVENT_TYPE],
              sourceRef: 'runtime.enemy.fixed_turret',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedTurretState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId: 'combat.projectile.v1',
              probeId: COMBAT_PROJECTILE_REQUIRED_PROBE_ID,
              action: 'fire',
              eventType: 'projectile.spawned',
              eventTypes: ['projectile.spawned'],
              sourceRef: 'runtime.projectile.spawn',
              status: 'observed'
            },
            {
              capabilityId: 'spawn.static.v1',
              probeId: SPAWN_STATIC_REQUIRED_PROBE_ID,
              action: 'reach_trigger',
              eventType: 'spawn.static.triggered',
              eventTypes: ['spawn.static.triggered'],
              sourceRef: 'runtime.spawn.static',
              status: 'observed'
            },
            {
              capabilityId,
              probeId,
              action: 'verify_fixed_turret',
              eventType: ENEMY_FIXED_TURRET_EVENT_TYPE,
              eventTypes: [ENEMY_FIXED_TURRET_EVENT_TYPE],
              fixedTurretSpawned: true,
              fixedTurretEntityId: ENEMY_FIXED_TURRET_ENTITY_ID,
              fixedTurretArchetypeId: ENEMY_FIXED_TURRET_ARCHETYPE_ID,
              fixedTurretStationary: true,
              fixedTurretTargetsPlayer: true,
              fixedTurretProjectilePatternId: ENEMY_FIXED_TURRET_PROJECTILE_PATTERN_ID,
              fixedTurretFireCadenceMs: ENEMY_FIXED_TURRET_FIRE_CADENCE_MS,
              sourceRef: 'runtime.enemy.fixed_turret',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(missingTurretState.status).toBe('failed');
    expect(missingTurretState.missingRequiredProbeIds).toEqual([probeId]);
    expect(missingTurretState.requiredResults.find((entry) => entry.probeId === probeId)?.assertionResults).toEqual(expect.arrayContaining([
      expect.objectContaining({
        assertionId: `${probeId}.assertion.fixed_turret_verified`,
        status: 'failed',
        message: expect.stringContaining('expected fixedTurretSpawned=true, observed <missing>')
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.fixed_turret_verified`,
        status: 'failed',
        message: expect.stringContaining(`expected fixedTurretEntityId=${ENEMY_FIXED_TURRET_ENTITY_ID}, observed <missing>`)
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.fixed_turret_verified`,
        status: 'failed',
        message: expect.stringContaining('expected fixedTurretStationary=true, observed <missing>')
      }),
      expect.objectContaining({
        assertionId: `${probeId}.assertion.fixed_turret_verified`,
        status: 'failed',
        message: expect.stringContaining(`expected fixedTurretProjectilePatternId=${ENEMY_FIXED_TURRET_PROJECTILE_PATTERN_ID}, observed <missing>`)
      })
    ]));
    expect(observedTurretState.status).toBe('passed');
  });

  it('does not verify enemy flying right entry when wave evidence lacks right-entry state fields', () => {
    const capabilityId = 'enemy.flying_right_entry.v1';
    const probeId = ENEMY_FLYING_RIGHT_ENTRY_REQUIRED_PROBE_ID;
    const packages = [createSpawnStaticPackageContract(), createSpawnEnemyWavePackageContract(), createEnemyFlyingRightEntryPackageContract()];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, ['spawn.static.v1', 'spawn.enemy_wave.v1', capabilityId]),
      packages
    });
    const missingRightEntryState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId: 'spawn.static.v1',
              probeId: SPAWN_STATIC_REQUIRED_PROBE_ID,
              action: 'spawn',
              eventType: 'spawn.static.triggered',
              eventTypes: ['spawn.static.triggered'],
              sourceRef: 'runtime.spawn.static',
              status: 'observed'
            },
            {
              capabilityId: 'spawn.enemy_wave.v1',
              probeId: SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID,
              action: 'spawn',
              eventType: 'spawn.enemy_wave.ordered',
              eventTypes: ['spawn.enemy_wave.ordered'],
              orderedWaveSequence: true,
              gateTriggered: true,
              waveSpawned: true,
              sequenceIndex: 0,
              waveId: ENEMY_FLYING_RIGHT_ENTRY_WAVE_ID,
              sourceRef: 'runtime.spawn.enemy_wave',
              status: 'observed'
            },
            {
              capabilityId,
              probeId,
              action: 'verify_right_entry',
              eventType: ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
              eventTypes: [ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE],
              sourceRef: 'runtime.enemy.flying_right_entry',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedRightEntryState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId: 'spawn.static.v1',
              probeId: SPAWN_STATIC_REQUIRED_PROBE_ID,
              action: 'spawn',
              eventType: 'spawn.static.triggered',
              eventTypes: ['spawn.static.triggered'],
              sourceRef: 'runtime.spawn.static',
              status: 'observed'
            },
            {
              capabilityId: 'spawn.enemy_wave.v1',
              probeId: SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID,
              action: 'spawn',
              eventType: 'spawn.enemy_wave.ordered',
              eventTypes: ['spawn.enemy_wave.ordered'],
              orderedWaveSequence: true,
              gateTriggered: true,
              waveSpawned: true,
              sequenceIndex: 0,
              waveId: ENEMY_FLYING_RIGHT_ENTRY_WAVE_ID,
              sourceRef: 'runtime.spawn.enemy_wave',
              status: 'observed'
            },
            {
              capabilityId,
              probeId,
              action: 'verify_right_entry',
              eventType: ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE,
              eventTypes: [ENEMY_FLYING_RIGHT_ENTRY_EVENT_TYPE],
              flyingRightEntrySpawned: true,
              flyingRightEntryEnemyId: ENEMY_FLYING_RIGHT_ENTRY_ENEMY_ID,
              flyingRightEntryArchetypeId: ENEMY_FLYING_RIGHT_ENTRY_ARCHETYPE_ID,
              flyingRightEntrySegmentId: ENEMY_FLYING_RIGHT_ENTRY_SEGMENT_ID,
              flyingRightEntryEnteredFromRight: true,
              flyingRightEntryEntrySide: ENEMY_FLYING_RIGHT_ENTRY_ENTRY_SIDE,
              flyingRightEntryMovementPatternId: ENEMY_FLYING_RIGHT_ENTRY_MOVEMENT_PATTERN_ID,
              flyingRightEntryWaveId: ENEMY_FLYING_RIGHT_ENTRY_WAVE_ID,
              sourceRef: 'runtime.enemy.flying_right_entry',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(missingRightEntryState.status).toBe('failed');
    expect(missingRightEntryState.missingRequiredProbeIds).toEqual([probeId]);
    expect(missingRightEntryState.requiredResults.find((entry) => entry.probeId === probeId)?.assertionResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${probeId}.assertion.right_entry_verified`,
          status: 'failed',
          message: expect.stringContaining('expected flyingRightEntrySpawned=true, observed <missing>')
        }),
        expect.objectContaining({
          assertionId: `${probeId}.assertion.right_entry_verified`,
          status: 'failed',
          message: expect.stringContaining(`expected flyingRightEntryEntrySide=${ENEMY_FLYING_RIGHT_ENTRY_ENTRY_SIDE}, observed <missing>`)
        }),
        expect.objectContaining({
          assertionId: `${probeId}.assertion.right_entry_verified`,
          status: 'failed',
          message: expect.stringContaining(`expected flyingRightEntryMovementPatternId=${ENEMY_FLYING_RIGHT_ENTRY_MOVEMENT_PATTERN_ID}, observed <missing>`)
        })
      ])
    );
    expect(observedRightEntryState.status).toBe('passed');
  });

  it('does not verify enemy patrol infantry when wave evidence lacks patrol state fields', () => {
    const capabilityId = 'enemy.patrol_infantry.v1';
    const probeId = ENEMY_PATROL_INFANTRY_REQUIRED_PROBE_ID;
    const packages = [createSpawnStaticPackageContract(), createSpawnEnemyWavePackageContract(), createEnemyPatrolInfantryPackageContract()];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, ['spawn.static.v1', 'spawn.enemy_wave.v1', capabilityId]),
      packages
    });
    const missingPatrolState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId: 'spawn.static.v1',
              probeId: SPAWN_STATIC_REQUIRED_PROBE_ID,
              action: 'spawn',
              eventType: 'spawn.static.triggered',
              eventTypes: ['spawn.static.triggered'],
              sourceRef: 'runtime.spawn.static',
              status: 'observed'
            },
            {
              capabilityId: 'spawn.enemy_wave.v1',
              probeId: SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID,
              action: 'spawn',
              eventType: 'spawn.enemy_wave.ordered',
              eventTypes: ['spawn.enemy_wave.ordered'],
              orderedWaveSequence: true,
              gateTriggered: true,
              waveSpawned: true,
              sequenceIndex: 0,
              waveId: 'jungle_entrance_patrol_wave',
              sourceRef: 'runtime.spawn.enemy_wave',
              status: 'observed'
            },
            {
              capabilityId,
              probeId,
              action: 'verify_patrol_infantry',
              eventType: ENEMY_PATROL_INFANTRY_EVENT_TYPE,
              eventTypes: [ENEMY_PATROL_INFANTRY_EVENT_TYPE],
              sourceRef: 'runtime.enemy.patrol_infantry',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedPatrolState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId: 'spawn.static.v1',
              probeId: SPAWN_STATIC_REQUIRED_PROBE_ID,
              action: 'spawn',
              eventType: 'spawn.static.triggered',
              eventTypes: ['spawn.static.triggered'],
              sourceRef: 'runtime.spawn.static',
              status: 'observed'
            },
            {
              capabilityId: 'spawn.enemy_wave.v1',
              probeId: SPAWN_ENEMY_WAVE_REQUIRED_PROBE_ID,
              action: 'spawn',
              eventType: 'spawn.enemy_wave.ordered',
              eventTypes: ['spawn.enemy_wave.ordered'],
              orderedWaveSequence: true,
              gateTriggered: true,
              waveSpawned: true,
              sequenceIndex: 0,
              waveId: 'jungle_entrance_patrol_wave',
              sourceRef: 'runtime.spawn.enemy_wave',
              status: 'observed'
            },
            {
              capabilityId,
              probeId,
              action: 'verify_patrol_infantry',
              eventType: ENEMY_PATROL_INFANTRY_EVENT_TYPE,
              eventTypes: [ENEMY_PATROL_INFANTRY_EVENT_TYPE],
              patrolInfantrySpawned: true,
              patrolInfantryEnemyId: ENEMY_PATROL_INFANTRY_ENEMY_ID,
              patrolInfantryArchetypeId: ENEMY_PATROL_INFANTRY_ARCHETYPE_ID,
              patrolInfantrySegmentId: ENEMY_PATROL_INFANTRY_SEGMENT_ID,
              patrolInfantryGrounded: true,
              patrolInfantryMovementPatternId: ENEMY_PATROL_INFANTRY_MOVEMENT_PATTERN_ID,
              patrolInfantryRouteId: ENEMY_PATROL_INFANTRY_ROUTE_ID,
              sourceRef: 'runtime.enemy.patrol_infantry',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(missingPatrolState.status).toBe('failed');
    expect(missingPatrolState.missingRequiredProbeIds).toEqual([probeId]);
    expect(missingPatrolState.requiredResults.find((entry) => entry.probeId === probeId)?.assertionResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${probeId}.assertion.patrol_infantry_verified`,
          status: 'failed',
          message: expect.stringContaining('expected patrolInfantrySpawned=true, observed <missing>')
        }),
        expect.objectContaining({
          assertionId: `${probeId}.assertion.patrol_infantry_verified`,
          status: 'failed',
          message: expect.stringContaining(`expected patrolInfantrySegmentId=${ENEMY_PATROL_INFANTRY_SEGMENT_ID}, observed <missing>`)
        }),
        expect.objectContaining({
          assertionId: `${probeId}.assertion.patrol_infantry_verified`,
          status: 'failed',
          message: expect.stringContaining(`expected patrolInfantryMovementPatternId=${ENEMY_PATROL_INFANTRY_MOVEMENT_PATTERN_ID}, observed <missing>`)
        })
      ])
    );
    expect(observedPatrolState.status).toBe('passed');
  });

  it('does not verify victory declaration when generic win evidence lacks declaration state fields', () => {
    const capabilityId = 'feedback.victory_declaration.v1';
    const probeId = FEEDBACK_VICTORY_DECLARATION_REQUIRED_PROBE_ID;
    const packages = [createEnemyBossLifecyclePackageContract(), createFeedbackVictoryDeclarationPackageContract()];
    const bossLifecycleEvidence = {
      capabilityId: 'enemy.boss_lifecycle.v1',
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
      status: 'observed' as const
    };
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, ['enemy.boss_lifecycle.v1', capabilityId]),
      packages
    });
    const genericWinOnly = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            bossLifecycleEvidence,
            {
              capabilityId,
              probeId,
              action: 'verify_victory_declaration',
              eventType: 'game.won',
              eventTypes: ['game.won', 'objective.completed'],
              sourceRef: 'runtime.feedback.generic_win',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedDeclarationState = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            bossLifecycleEvidence,
            {
              capabilityId,
              probeId,
              action: 'verify_victory_declaration',
              eventType: FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE,
              eventTypes: [FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE, 'game.won', 'objective.completed'],
              victoryDeclarationShown: true,
              victoryDeclarationText: FEEDBACK_VICTORY_DECLARATION_TEXT,
              victoryDeclarationTrigger: FEEDBACK_VICTORY_DECLARATION_TRIGGER,
              victoryDeclarationOutcome: FEEDBACK_VICTORY_DECLARATION_OUTCOME,
              victoryDeclarationObjectiveCompleted: true,
              sourceRef: 'runtime.feedback.victory_declaration',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(genericWinOnly.status).toBe('failed');
    expect(genericWinOnly.missingRequiredProbeIds).toEqual([probeId]);
    expect(genericWinOnly.requiredResults.find((entry) => entry.probeId === probeId)?.assertionResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${probeId}.assertion.victory_declaration_verified`,
          status: 'failed',
          message: expect.stringContaining(`observation ${FEEDBACK_VICTORY_DECLARATION_EVENT_TYPE} not observed`)
        }),
        expect.objectContaining({
          assertionId: `${probeId}.assertion.victory_declaration_verified`,
          status: 'failed',
          message: expect.stringContaining('expected victoryDeclarationShown=true, observed <missing>')
        }),
        expect.objectContaining({
          assertionId: `${probeId}.assertion.victory_declaration_verified`,
          status: 'failed',
          message: expect.stringContaining(`expected victoryDeclarationText=${FEEDBACK_VICTORY_DECLARATION_TEXT}, observed <missing>`)
        })
      ])
    );
    expect(observedDeclarationState.status).toBe('passed');
  });

  it('does not verify generation fallback fail-closed when generic generation receipt lacks policy state fields', () => {
    const capabilityId = 'generation.fallback_policy_fail_closed.v1';
    const probeId = GENERATION_FALLBACK_POLICY_FAIL_CLOSED_REQUIRED_PROBE_ID;
    const packages = [createGenerationFallbackPolicyFailClosedPackageContract()];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const genericGenerationReceipt = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'verify_fail_closed_policy',
              eventType: 'generation.completed',
              eventTypes: ['generation.completed', 'model.unavailable'],
              sourceRef: 'generation.path.generic_receipt',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedFailClosedPolicy = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'verify_fail_closed_policy',
              eventType: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE,
              eventTypes: [GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE, 'model.unavailable'],
              fallbackPolicy: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_POLICY,
              fallbackPolicyVerified: true,
              undeclaredFallbackDetected: false,
              fallbackOutputGenerated: false,
              fallbackFailureCode: GENERATION_FALLBACK_POLICY_FAIL_CLOSED_ERROR_CODE,
              sourceRef: 'generation.path.fail_closed_policy',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(genericGenerationReceipt.status).toBe('failed');
    expect(genericGenerationReceipt.missingRequiredProbeIds).toEqual([probeId]);
    expect(genericGenerationReceipt.requiredResults.find((entry) => entry.probeId === probeId)?.assertionResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${probeId}.assertion.fail_closed_policy`,
          status: 'failed',
          message: expect.stringContaining(`observation ${GENERATION_FALLBACK_POLICY_FAIL_CLOSED_EVENT_TYPE} not observed`)
        }),
        expect.objectContaining({
          assertionId: `${probeId}.assertion.fail_closed_policy`,
          status: 'failed',
          message: expect.stringContaining(`expected fallbackPolicy=${GENERATION_FALLBACK_POLICY_FAIL_CLOSED_POLICY}, observed <missing>`)
        }),
        expect.objectContaining({
          assertionId: `${probeId}.assertion.fail_closed_policy`,
          status: 'failed',
          message: expect.stringContaining('expected undeclaredFallbackDetected=false, observed <missing>')
        })
      ])
    );
    expect(observedFailClosedPolicy.status).toBe('passed');
  });

  it('does not verify boss unlock when wave and boss evidence lacks unlock state fields', () => {
    const capabilityId = 'goal.boss_unlock.v1';
    const probeId = GOAL_BOSS_UNLOCK_REQUIRED_PROBE_ID;
    const packages = [
      createSpawnStaticPackageContract(),
      createSpawnEnemyWavePackageContract(),
      createEnemyBossLifecyclePackageContract(),
      createGoalBossUnlockPackageContract()
    ];
    const spawnStaticEvidence = {
      capabilityId: 'spawn.static.v1',
      probeId: SPAWN_STATIC_REQUIRED_PROBE_ID,
      action: 'spawn',
      eventType: 'spawn.static.triggered',
      eventTypes: ['spawn.static.triggered'],
      sourceRef: 'runtime.spawn.static',
      status: 'observed' as const
    };
    const spawnEnemyWaveEvidence = {
      capabilityId: 'spawn.enemy_wave.v1',
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
      status: 'observed' as const
    };
    const bossLifecycleEvidence = {
      capabilityId: 'enemy.boss_lifecycle.v1',
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
      status: 'observed' as const
    };
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const genericWaveAndBossEvidence = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            spawnStaticEvidence,
            spawnEnemyWaveEvidence,
            bossLifecycleEvidence,
            {
              capabilityId,
              probeId,
              action: 'spawn',
              eventType: 'spawn.enemy_wave.ordered',
              eventTypes: ['spawn.enemy_wave.ordered', 'enemy.boss_lifecycle.verified'],
              waveSpawned: true,
              orderedWaveSequence: true,
              sourceRef: 'runtime_plan.side_scrolling.waves.ordered_sequence',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedBossUnlock = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            spawnStaticEvidence,
            spawnEnemyWaveEvidence,
            bossLifecycleEvidence,
            {
              capabilityId,
              probeId,
              action: 'unlock_boss',
              eventType: GOAL_BOSS_UNLOCK_EVENT_TYPE,
              eventTypes: [GOAL_BOSS_UNLOCK_EVENT_TYPE, 'spawn.enemy_wave.ordered', 'enemy.boss_lifecycle.verified'],
              wavesCleared: true,
              clearedWaveCount: GOAL_BOSS_UNLOCK_REQUIRED_WAVE_COUNT,
              requiredWaveCount: GOAL_BOSS_UNLOCK_REQUIRED_WAVE_COUNT,
              bossUnlockTriggered: true,
              bossUnlockReason: GOAL_BOSS_UNLOCK_REASON,
              bossEncounterUnlocked: true,
              bossUnlockWaveId: GOAL_BOSS_UNLOCK_WAVE_ID,
              bossUnlockBossEntityId: GOAL_BOSS_UNLOCK_BOSS_ENTITY_ID,
              sourceRef: 'runtime.goal.boss_unlock',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(genericWaveAndBossEvidence.status).toBe('failed');
    expect(genericWaveAndBossEvidence.missingRequiredProbeIds).toEqual([probeId]);
    expect(genericWaveAndBossEvidence.requiredResults.find((entry) => entry.probeId === probeId)?.assertionResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${probeId}.assertion.boss_unlock_verified`,
          status: 'failed',
          message: expect.stringContaining(`observation ${GOAL_BOSS_UNLOCK_EVENT_TYPE} not observed`)
        }),
        expect.objectContaining({
          assertionId: `${probeId}.assertion.boss_unlock_verified`,
          status: 'failed',
          message: expect.stringContaining('expected bossUnlockTriggered=true, observed <missing>')
        }),
        expect.objectContaining({
          assertionId: `${probeId}.assertion.boss_unlock_verified`,
          status: 'failed',
          message: expect.stringContaining(`expected bossUnlockReason=${GOAL_BOSS_UNLOCK_REASON}, observed <missing>`)
        })
      ])
    );
    expect(observedBossUnlock.status).toBe('passed');
  });

  it('does not verify falling hazard area when generic hazard evidence lacks from-above state fields', () => {
    const capabilityId = 'hazard.falling_area.v1';
    const probeId = HAZARD_FALLING_AREA_REQUIRED_PROBE_ID;
    const packages = [createHazardFallingAreaPackageContract()];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const genericHazardEvidence = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'spawn',
              eventType: 'hazard.spawned',
              eventTypes: ['hazard.spawned', 'collision.detected'],
              sourceRef: 'runtime.hazard.generic_spawn',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedFallingArea = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'verify_falling_area',
              eventType: HAZARD_FALLING_AREA_EVENT_TYPE,
              eventTypes: [HAZARD_FALLING_AREA_EVENT_TYPE, 'hazard.spawned'],
              fallingAreaActive: true,
              fallingAreaHazardId: HAZARD_FALLING_AREA_HAZARD_ID,
              fallingAreaBossPhaseId: HAZARD_FALLING_AREA_BOSS_PHASE_ID,
              fallingAreaPatternId: HAZARD_FALLING_AREA_PATTERN_ID,
              fallingAreaDropsFromAbove: true,
              fallingAreaArmed: true,
              fallingAreaDamagesPlayer: true,
              fallingAreaDamage: HAZARD_FALLING_AREA_DAMAGE,
              fallingAreaTelegraphMs: HAZARD_FALLING_AREA_TELEGRAPH_MS,
              sourceRef: 'runtime.hazard.falling_area',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(genericHazardEvidence.status).toBe('failed');
    expect(genericHazardEvidence.missingRequiredProbeIds).toEqual([probeId]);
    expect(genericHazardEvidence.requiredResults.find((entry) => entry.probeId === probeId)?.assertionResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${probeId}.assertion.falling_area_verified`,
          status: 'failed',
          message: expect.stringContaining(`observation ${HAZARD_FALLING_AREA_EVENT_TYPE} not observed`)
        }),
        expect.objectContaining({
          assertionId: `${probeId}.assertion.falling_area_verified`,
          status: 'failed',
          message: expect.stringContaining('expected fallingAreaDropsFromAbove=true, observed <missing>')
        }),
        expect.objectContaining({
          assertionId: `${probeId}.assertion.falling_area_verified`,
          status: 'failed',
          message: expect.stringContaining(`expected fallingAreaBossPhaseId=${HAZARD_FALLING_AREA_BOSS_PHASE_ID}, observed <missing>`)
        })
      ])
    );
    expect(observedFallingArea.status).toBe('passed');
  });

  it('does not verify timed explosion hazards from generic hazard or explosion evidence without timer causality state', () => {
    const capabilityId = 'hazard.timed_explosion.v1';
    const probeId = HAZARD_TIMED_EXPLOSION_REQUIRED_PROBE_ID;
    const packages = [createHazardTimedExplosionPackageContract()];
    const plan = buildCapabilityRuntimeQaPlan({
      profileId: 'side_scrolling_run_and_gun.v1',
      capabilityLock: createLock(packages, [capabilityId]),
      packages
    });
    const genericExplosionEvidence = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'explode',
              eventType: 'explosion.triggered',
              eventTypes: ['hazard.spawned', 'explosion.triggered'],
              sourceRef: 'runtime.hazard.generic_explosion',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });
    const observedTimedExplosion = evaluateCapabilityQaReport({
      plan,
      probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
        plan,
        evidence: {
          status: 'PASSED',
          observed: [
            {
              capabilityId,
              probeId,
              action: 'verify_timed_explosion',
              eventType: HAZARD_TIMED_EXPLOSION_EVENT_TYPE,
              eventTypes: [HAZARD_TIMED_EXPLOSION_EVENT_TYPE, 'explosion.triggered'],
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
              timedExplosionRadius: HAZARD_TIMED_EXPLOSION_RADIUS,
              sourceRef: 'runtime.hazard.timed_explosion',
              status: 'observed'
            }
          ],
          missingProbeIds: [],
          mismatches: []
        }
      })
    });

    expect(genericExplosionEvidence.status).toBe('failed');
    expect(genericExplosionEvidence.missingRequiredProbeIds).toEqual([probeId]);
    expect(genericExplosionEvidence.requiredResults.find((entry) => entry.probeId === probeId)?.assertionResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assertionId: `${probeId}.assertion.timed_explosion_verified`,
          status: 'failed',
          message: expect.stringContaining(`observation ${HAZARD_TIMED_EXPLOSION_EVENT_TYPE} not observed`)
        }),
        expect.objectContaining({
          assertionId: `${probeId}.assertion.timed_explosion_verified`,
          status: 'failed',
          message: expect.stringContaining('expected timedExplosionTriggeredByTimer=true, observed <missing>')
        }),
        expect.objectContaining({
          assertionId: `${probeId}.assertion.timed_explosion_verified`,
          status: 'failed',
          message: expect.stringContaining(`expected timedExplosionTriggerCondition=${HAZARD_TIMED_EXPLOSION_TRIGGER_CONDITION}, observed <missing>`)
        })
      ])
    );
    expect(observedTimedExplosion.status).toBe('passed');
  });
});

function createLock(packages: readonly GameplayCapabilityPackageContract[], requestedCapabilities: readonly string[]) {
  const report = resolveGameplayCapabilityGraph({
    requestedCapabilities,
    packages,
    runtimeFamily: 'phaser_2d_action_arcade.v1'
  });
  if (report.lock === undefined) {
    throw new Error(`expected lock, got diagnostics ${JSON.stringify(report.diagnostics)}`);
  }
  return report.lock;
}

function createPackage(
  id: string,
  input: {
    probes?: GameplayCapabilityPackageContract['qa']['probes'];
  } = {}
): GameplayCapabilityPackageContract {
  const ownedPath = `/entities/components/${id}`;
  return {
    manifest: {
      id,
      packageVersion: '1.0.0',
      capabilityVersion: 'v1',
      status: 'supported',
      description: `${id} capability package.`,
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
      ownedNodeKinds: [`component.${id.replace(/\.v1$/, '')}`]
    },
    runtime: {
      families: ['phaser_2d_action_arcade.v1'],
      systems: [{ id: `${id}.system`, version: 'v1', phase: 'gameplay', dependencies: [] }]
    },
    amendments: {
      supportedOperations: [{ operation: `SetComponentProperty:${id}`, executionPolicy: 'hot_runtime_patch' }],
      compilerId: `${id}.amendments`
    },
    patch: {
      descriptors: [{ id: `${id}.patch`, policy: 'hot_runtime_patch', ownedPaths: [ownedPath] }]
    },
    qa: {
      probes: input.probes ?? [createProbe(`${id}.qa.required`, id, `${id}.system`)],
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
  } as GameplayCapabilityPackageContract;
}

function createProbe(
  id: string,
  capabilityId: string,
  runtimeSystemId: string,
  input: {
    severity?: 'required' | 'optional';
    actionId?: string;
    actionTarget?: string;
  } = {}
): CapabilityQaProbeDescriptor {
  return {
    id,
    capabilityId,
    severity: input.severity ?? 'required',
    prerequisites: ['runtime scene started'],
    actions: [
      {
        id: input.actionId ?? `${id}.action`,
        kind: 'input',
        target: input.actionTarget ?? 'player',
        parameters: { control: 'right', durationMs: 240 }
      }
    ],
    observations: [{ id: `${id}.observation`, kind: 'position_delta', runtimeSystemId, ref: 'player.x' }],
    assertions: [{ id: `${id}.assertion`, observationId: `${id}.observation`, comparator: 'increased', message: 'player x increased' }]
  };
}

function createRuntimeEventProbe(
  id: string,
  capabilityId: string,
  runtimeSystemId: string,
  eventRefs: readonly string[]
): CapabilityQaProbeDescriptor {
  return {
    id,
    capabilityId,
    severity: 'required',
    prerequisites: ['runtime scene started'],
    actions: [{ id: `${id}.action.fire`, kind: 'runtime_event', target: `${capabilityId}.fire`, parameters: {} }],
    observations: eventRefs.map((ref) => ({
      id: `${id}.observation.${ref.replaceAll('.', '_')}`,
      kind: 'runtime_event',
      runtimeSystemId,
      ref
    })),
    assertions: eventRefs.map((ref) => ({
      id: `${id}.assertion.${ref.replaceAll('.', '_')}`,
      observationId: `${id}.observation.${ref.replaceAll('.', '_')}`,
      comparator: 'exists',
      message: `${ref} observed`
    }))
  };
}

function createProfileScenario() {
  return {
    id: 'side_scrolling_run_and_gun.v1.qa.destroy_target',
    severity: 'required' as const,
    prerequisites: ['enemy target spawned'],
    actions: [{ id: 'side_scrolling_run_and_gun.v1.qa.destroy_target.action', kind: 'runtime_event' as const, target: 'weapon.fire', parameters: {} }],
    observations: [
      {
        id: 'side_scrolling_run_and_gun.v1.qa.destroy_target.observation',
        kind: 'runtime_event' as const,
        runtimeSystemId: 'movement.run_jump.v1.system',
        ref: 'enemy_defeated'
      }
    ],
    assertions: [
      {
        id: 'side_scrolling_run_and_gun.v1.qa.destroy_target.assertion',
        observationId: 'side_scrolling_run_and_gun.v1.qa.destroy_target.observation',
        comparator: 'minimum_count' as const,
        expected: 1,
        message: 'enemy defeat event observed'
      }
    ]
  };
}

function passedAssertionsFor(plan: ReturnType<typeof buildCapabilityRuntimeQaPlan>, probeId: string) {
  return assertionResultsFor(plan, probeId, 'passed');
}

function failedAssertionsFor(plan: ReturnType<typeof buildCapabilityRuntimeQaPlan>, probeId: string) {
  return assertionResultsFor(plan, probeId, 'failed');
}

function assertionResultsFor(plan: ReturnType<typeof buildCapabilityRuntimeQaPlan>, probeId: string, status: 'passed' | 'failed') {
  const probe = [...plan.requiredProbes, ...plan.optionalProbes].find((entry) => entry.id === probeId);
  return probe?.assertions.map((assertion) => ({ assertionId: assertion.id, status })) ?? [];
}
