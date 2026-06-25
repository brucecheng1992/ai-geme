import { describe, expect, it } from 'vitest';

import {
  CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID,
  COLLISION_PLATFORM_REQUIRED_PROBE_ID,
  COMBAT_AIRBORNE_FIRE_REQUIRED_PROBE_ID,
  COMBAT_PROJECTILE_REQUIRED_PROBE_ID,
  DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID,
  GenerationTargetProfileRuntimeSupportReportSchema,
  HEALTH_DAMAGE_INVULNERABILITY_REQUIRED_PROBE_ID,
  HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID,
  MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID,
  SPAWN_STATIC_REQUIRED_PROBE_ID,
  buildCapabilityQaProbeResultsFromRuntimeEvidence,
  buildCapabilityRuntimeQaPlan,
  buildGenerationTargetProfileRuntimeSupportReport,
  createCameraSideFollowPackageContract,
  createCollisionPlatformPackageContract,
  createCombatAirborneFirePackageContract,
  createCombatProjectilePackageContract,
  createDefaultStraightSingleWeaponPackageContract,
  createHealthDamageInvulnerabilityPackageContract,
  createHealthPlayerHealthPointsPackageContract,
  createMovementRunJumpPackageContract,
  createSpawnStaticPackageContract,
  evaluateCapabilityQaReport,
  resolveGameplayCapabilityGraph
} from '../../packages/game-dsl/src/index.js';

const cameraCapabilityId = 'camera.side_follow.v1';
const collisionCapabilityId = 'collision.platform.v1';
const airborneFireCapabilityId = 'combat.airborne_fire.v1';
const defaultWeaponCapabilityId = 'weapon.default_straight_single.v1';
const projectileCapabilityId = 'combat.projectile.v1';
const movementCapabilityId = 'movement.run_jump.v1';
const spawnStaticCapabilityId = 'spawn.static.v1';
const damageInvulnerabilityCapabilityId = 'health.damage_invulnerability.v1';
const healthCapabilityId = 'health.player_health_points.v1';

describe('Step 37 target profile runtime support overlay', () => {
  it('records runtime-observed support without mutating static completeSupported evidence', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport([
      'camera.side_follow.active',
      'collision.platform.grounded',
      'combat.airborne_fire.fired',
      'player.fired',
      'projectile.spawned',
      'player.jumped',
      'spawn.static.triggered',
      'health.damage_invulnerability.activated',
      'health.damage_invulnerability.blocked',
      'health.player_health.current'
    ]);
    const report = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260625_target_runtime_support',
      runId: 'run_20260625_target_runtime_support',
      capabilityQaReport
    });
    const camera = report.capabilities.find((entry) => entry.capabilityId === cameraCapabilityId);
    const collision = report.capabilities.find((entry) => entry.capabilityId === collisionCapabilityId);
    const defaultWeapon = report.capabilities.find((entry) => entry.capabilityId === defaultWeaponCapabilityId);
    const projectile = report.capabilities.find((entry) => entry.capabilityId === projectileCapabilityId);
    const movement = report.capabilities.find((entry) => entry.capabilityId === movementCapabilityId);
    const spawnStatic = report.capabilities.find((entry) => entry.capabilityId === spawnStaticCapabilityId);
    const damageInvulnerability = report.capabilities.find((entry) => entry.capabilityId === damageInvulnerabilityCapabilityId);
    const health = report.capabilities.find((entry) => entry.capabilityId === healthCapabilityId);

    expect(GenerationTargetProfileRuntimeSupportReportSchema.parse(report)).toEqual(report);
    expect(report).toMatchObject({
      artifactKind: 'generation_target_profile_runtime_support_report',
      schemaVersion: 'generation_target_profile_runtime_support_report.v0.1',
      status: 'blocked_incomplete_target_profile',
      requiredCapabilityCount: 59,
      staticCompleteSupportedCount: 0,
      observedCompleteSupportedCount: 9,
      targetProfileCompleteSupported: false,
      capabilityQaReportHash: capabilityQaReport.reportHash,
      observedCapabilityIds: [
        cameraCapabilityId,
        collisionCapabilityId,
        airborneFireCapabilityId,
        projectileCapabilityId,
        damageInvulnerabilityCapabilityId,
        healthCapabilityId,
        movementCapabilityId,
        spawnStaticCapabilityId,
        defaultWeaponCapabilityId
      ],
      blockers: ['target_profile_runtime_support_incomplete:9/59']
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
      blockers: [
        `capability_qa_report_missing_required_probe:${CAMERA_SIDE_FOLLOW_REQUIRED_PROBE_ID}`,
        `capability_qa_report_missing_required_probe:${COLLISION_PLATFORM_REQUIRED_PROBE_ID}`,
        `capability_qa_report_missing_required_probe:${COMBAT_AIRBORNE_FIRE_REQUIRED_PROBE_ID}`,
        `capability_qa_report_missing_required_probe:${COMBAT_PROJECTILE_REQUIRED_PROBE_ID}`,
        `capability_qa_report_missing_required_probe:${HEALTH_DAMAGE_INVULNERABILITY_REQUIRED_PROBE_ID}`,
        `capability_qa_report_missing_required_probe:${HEALTH_PLAYER_HEALTH_POINTS_REQUIRED_PROBE_ID}`,
        `capability_qa_report_missing_required_probe:${MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID}`,
        `capability_qa_report_missing_required_probe:${SPAWN_STATIC_REQUIRED_PROBE_ID}`,
        `capability_qa_report_missing_required_probe:${DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:0/59'
      ]
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
      'camera.side_follow.active',
      'collision.platform.grounded',
      'combat.airborne_fire.fired',
      'player.fired',
      'projectile.spawned',
      'player.jumped',
      'spawn.static.triggered',
      'health.damage_invulnerability.blocked',
      'health.player_health.current'
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
      observedCompleteSupportedCount: 8,
      targetProfileCompleteSupported: false,
      observedCapabilityIds: [
        cameraCapabilityId,
        collisionCapabilityId,
        airborneFireCapabilityId,
        projectileCapabilityId,
        healthCapabilityId,
        movementCapabilityId,
        spawnStaticCapabilityId,
        defaultWeaponCapabilityId
      ],
      blockers: [
        `capability_qa_report_missing_required_probe:${HEALTH_DAMAGE_INVULNERABILITY_REQUIRED_PROBE_ID}`,
        'target_profile_runtime_support_incomplete:8/59'
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
});

function buildDefaultWeaponQaReport(eventTypes: readonly string[]) {
  const packages = [
    createCameraSideFollowPackageContract(),
    createCollisionPlatformPackageContract(),
    createCombatAirborneFirePackageContract(),
    createDefaultStraightSingleWeaponPackageContract(),
    createCombatProjectilePackageContract(),
    createHealthDamageInvulnerabilityPackageContract(),
    createMovementRunJumpPackageContract(),
    createSpawnStaticPackageContract(),
    createHealthPlayerHealthPointsPackageContract()
  ];
  const lockReport = resolveGameplayCapabilityGraph({
    requestedCapabilities: [
      cameraCapabilityId,
      collisionCapabilityId,
      airborneFireCapabilityId,
      defaultWeaponCapabilityId,
      projectileCapabilityId,
      damageInvulnerabilityCapabilityId,
      movementCapabilityId,
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
  const observed = [
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
