import { describe, expect, it } from 'vitest';

import {
  COMBAT_PROJECTILE_REQUIRED_PROBE_ID,
  DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID,
  GenerationTargetProfileRuntimeSupportReportSchema,
  MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID,
  buildCapabilityQaProbeResultsFromRuntimeEvidence,
  buildCapabilityRuntimeQaPlan,
  buildGenerationTargetProfileRuntimeSupportReport,
  createCombatProjectilePackageContract,
  createDefaultStraightSingleWeaponPackageContract,
  createMovementRunJumpPackageContract,
  evaluateCapabilityQaReport,
  resolveGameplayCapabilityGraph
} from '../../packages/game-dsl/src/index.js';

const defaultWeaponCapabilityId = 'weapon.default_straight_single.v1';
const projectileCapabilityId = 'combat.projectile.v1';
const movementCapabilityId = 'movement.run_jump.v1';

describe('Step 37 target profile runtime support overlay', () => {
  it('records runtime-observed support without mutating static completeSupported evidence', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport(['player.fired', 'projectile.spawned', 'player.jumped']);
    const report = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260625_target_runtime_support',
      runId: 'run_20260625_target_runtime_support',
      capabilityQaReport
    });
    const defaultWeapon = report.capabilities.find((entry) => entry.capabilityId === defaultWeaponCapabilityId);
    const projectile = report.capabilities.find((entry) => entry.capabilityId === projectileCapabilityId);
    const movement = report.capabilities.find((entry) => entry.capabilityId === movementCapabilityId);

    expect(GenerationTargetProfileRuntimeSupportReportSchema.parse(report)).toEqual(report);
    expect(report).toMatchObject({
      artifactKind: 'generation_target_profile_runtime_support_report',
      schemaVersion: 'generation_target_profile_runtime_support_report.v0.1',
      status: 'blocked_incomplete_target_profile',
      requiredCapabilityCount: 59,
      staticCompleteSupportedCount: 0,
      observedCompleteSupportedCount: 3,
      targetProfileCompleteSupported: false,
      capabilityQaReportHash: capabilityQaReport.reportHash,
      observedCapabilityIds: [projectileCapabilityId, movementCapabilityId, defaultWeaponCapabilityId],
      blockers: ['target_profile_runtime_support_incomplete:3/59']
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
        `capability_qa_report_missing_required_probe:${COMBAT_PROJECTILE_REQUIRED_PROBE_ID}`,
        `capability_qa_report_missing_required_probe:${MOVEMENT_RUN_JUMP_REQUIRED_PROBE_ID}`,
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
});

function buildDefaultWeaponQaReport(eventTypes: readonly string[]) {
  const packages = [createDefaultStraightSingleWeaponPackageContract(), createCombatProjectilePackageContract(), createMovementRunJumpPackageContract()];
  const lockReport = resolveGameplayCapabilityGraph({
    requestedCapabilities: [defaultWeaponCapabilityId, projectileCapabilityId, movementCapabilityId],
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
