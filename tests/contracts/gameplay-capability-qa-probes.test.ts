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
