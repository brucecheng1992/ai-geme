import { describe, expect, it } from 'vitest';

import {
  GenerationCapabilityReadinessReportSchema,
  buildGenerationCapabilityPreflight,
  type GameplayCapabilityDescriptor,
  type GameplayCapabilityRegistry
} from '../../packages/game-dsl/src/index.js';

describe('Step 37 generation capability readiness preflight', () => {
  it('selects the active capability path for executable production profile requirements', () => {
    const { registrySnapshot, readinessReport } = buildGenerationCapabilityPreflight({
      projectId: 'proj_20260619_capability_readiness',
      runId: 'run_20260619_capability_readiness',
      normalizedGenre: 'side_scrolling_run_and_gun'
    });
    const second = buildGenerationCapabilityPreflight({
      projectId: 'proj_20260619_capability_readiness',
      runId: 'run_20260619_capability_readiness',
      normalizedGenre: 'side_scrolling_run_and_gun'
    });

    expect(GenerationCapabilityReadinessReportSchema.parse(readinessReport)).toEqual(readinessReport);
    expect(registrySnapshot.snapshotHash).toBe(second.registrySnapshot.snapshotHash);
    expect(readinessReport.reportHash).toBe(second.readinessReport.reportHash);
    expect(readinessReport).toMatchObject({
      artifactKind: 'generation_capability_readiness_report',
      schemaVersion: 'generation_capability_readiness_report.v0.1',
      normalizedGenre: 'side_scrolling_run_and_gun',
      profileResolution: {
        status: 'resolved',
        profileId: 'side_scrolling_run_and_gun.v1',
        runtimeExecutable: true,
        profileSupportStatus: 'active_profile_supported'
      },
      targetDefaultPath: 'capability_composed_v1',
      selectedDefaultPath: 'capability_composed_v1',
      capabilityPathReadiness: 'ready_for_active_profile',
      exactLockStatus: 'not_required_active_profile_bound'
    });
    expect(readinessReport.capabilityRequirements.requiredCapabilityIds).toEqual(
      expect.arrayContaining(['camera.side_follow.v1', 'movement.run_jump.v1', 'rules.restart_loop.v1'])
    );
    expect(readinessReport.capabilityRequirements.incompleteCapabilityIds).toEqual([]);
    expect(readinessReport.blockers).toEqual([]);
  });

  it('fails closed when no runtime profile resolves for the normalized genre', () => {
    const { readinessReport } = buildGenerationCapabilityPreflight({
      projectId: 'proj_20260619_capability_readiness',
      runId: 'run_20260619_unknown_capability_readiness',
      normalizedGenre: 'unrecognized_2d_genre'
    });

    expect(readinessReport).toMatchObject({
      profileResolution: {
        status: 'unresolved',
        runtimeSupportStatus: 'unsupported',
        runtimeExecutable: false
      },
      capabilityRequirements: {
        requiredCapabilityIds: [],
        completeSupportedCapabilityIds: [],
        incompleteCapabilityIds: [],
        missingRegistryCapabilityAliases: []
      },
      selectedDefaultPath: 'fail_closed_unsupported_intent',
      capabilityPathReadiness: 'blocked',
      exactLockStatus: 'not_applicable_unsupported_intent',
      blockers: ['runtime_profile_not_resolved']
    });
  });

  it('does not route complete-supported profiles through the legacy default', () => {
    const { readinessReport } = buildGenerationCapabilityPreflight({
      projectId: 'proj_20260619_capability_readiness',
      runId: 'run_20260619_ready_capability_readiness',
      normalizedGenre: 'collector',
      registry: completeCollectorRegistry()
    });

    expect(readinessReport).toMatchObject({
      profileResolution: {
        status: 'resolved',
        profileId: 'collector.v1',
        runtimeExecutable: true,
        profileSupportStatus: 'capability_complete_supported'
      },
      capabilityPathReadiness: 'ready_for_active_profile',
      selectedDefaultPath: 'capability_composed_v1',
      exactLockStatus: 'not_required_active_profile_bound',
      blockers: []
    });
    expect(readinessReport.capabilityRequirements.completeSupportedCapabilityIds).toEqual([
      'camera.top_down_follow.v1',
      'movement.eight_direction.v1',
      'pickup.collectible.v1'
    ]);
  });
});

function completeCollectorRegistry(): GameplayCapabilityRegistry {
  return {
    registryVersion: 'gameplay-capability-registry.v0.1',
    entries: [
      completeCapability('camera.top_down_follow.v1', 'camera', 'Top-down follow camera', ['top_down_camera']),
      completeCapability('movement.eight_direction.v1', 'movement', 'Eight-direction movement', ['eight_direction_movement']),
      completeCapability('pickup.collectible.v1', 'pickup', 'Collectible pickup', ['collectibles'])
    ]
  };
}

function completeCapability(
  id: GameplayCapabilityDescriptor['id'],
  domain: GameplayCapabilityDescriptor['domain'],
  label: string,
  legacyRuntimeCapabilities: string[]
): GameplayCapabilityDescriptor {
  return {
    id,
    version: 'v1',
    domain,
    status: 'complete_supported',
    label,
    runtimeFamilies: ['phaser_2d_top_down_arcade.v1'],
    profiles: ['collector.v1'],
    legacyRuntimeCapabilities,
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
    qa: {
      requiredProbeIds: [`${id}.qa.required`],
      requiredProbesVerified: true
    },
    blockers: [],
    notes: []
  };
}
