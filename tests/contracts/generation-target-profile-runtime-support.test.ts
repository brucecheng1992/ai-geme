import { describe, expect, it } from 'vitest';

import {
  DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID,
  GenerationTargetProfileRuntimeSupportReportSchema,
  buildCapabilityQaProbeResultsFromRuntimeEvidence,
  buildCapabilityRuntimeQaPlan,
  buildGenerationTargetProfileRuntimeSupportReport,
  createDefaultStraightSingleWeaponPackageContract,
  evaluateCapabilityQaReport,
  resolveGameplayCapabilityGraph
} from '../../packages/game-dsl/src/index.js';

const capabilityId = 'weapon.default_straight_single.v1';

describe('Step 37 target profile runtime support overlay', () => {
  it('records runtime-observed support without mutating static completeSupported evidence', () => {
    const capabilityQaReport = buildDefaultWeaponQaReport(['player.fired', 'projectile.spawned']);
    const report = buildGenerationTargetProfileRuntimeSupportReport({
      projectId: 'proj_20260625_target_runtime_support',
      runId: 'run_20260625_target_runtime_support',
      capabilityQaReport
    });
    const capability = report.capabilities.find((entry) => entry.capabilityId === capabilityId);

    expect(GenerationTargetProfileRuntimeSupportReportSchema.parse(report)).toEqual(report);
    expect(report).toMatchObject({
      artifactKind: 'generation_target_profile_runtime_support_report',
      schemaVersion: 'generation_target_profile_runtime_support_report.v0.1',
      status: 'blocked_incomplete_target_profile',
      requiredCapabilityCount: 59,
      staticCompleteSupportedCount: 0,
      observedCompleteSupportedCount: 1,
      targetProfileCompleteSupported: false,
      capabilityQaReportHash: capabilityQaReport.reportHash,
      observedCapabilityIds: [capabilityId],
      blockers: ['target_profile_runtime_support_incomplete:1/59']
    });
    expect(capability).toMatchObject({
      capabilityId,
      runtimeVerified: true,
      staticCompleteSupported: false,
      observedCompleteSupported: true,
      requiredProbeIds: [DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID],
      verifiedRequiredProbeIds: [DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID],
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
    const capability = report.capabilities.find((entry) => entry.capabilityId === capabilityId);

    expect(report).toMatchObject({
      status: 'blocked_incomplete_target_profile',
      staticCompleteSupportedCount: 0,
      observedCompleteSupportedCount: 0,
      targetProfileCompleteSupported: false,
      observedCapabilityIds: [],
      blockers: [
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
  const packages = [createDefaultStraightSingleWeaponPackageContract()];
  const lockReport = resolveGameplayCapabilityGraph({
    requestedCapabilities: [capabilityId],
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
  return evaluateCapabilityQaReport({
    plan,
    probeResults: buildCapabilityQaProbeResultsFromRuntimeEvidence({
      plan,
      evidence: {
        status: 'PASSED',
        observed: [
          {
            capabilityId,
            probeId: DEFAULT_STRAIGHT_SINGLE_WEAPON_REQUIRED_PROBE_ID,
            action: 'fire',
            eventType: eventTypes[0] ?? '',
            eventTypes,
            status: 'observed',
            sourceRef: 'qa_report.capability_runtime'
          }
        ],
        missingProbeIds: [],
        mismatches: []
      }
    })
  });
}
