import { describe, expect, it } from 'vitest';

import {
  GenerationCapabilityResolutionReportSchema,
  buildGenerationCapabilityPreflight,
  buildGenerationCapabilityResolutionShadow,
  type GameplayCapabilityDescriptor,
  type GameplayCapabilityPackageContract,
  type GameplayCapabilityRegistry
} from '../../packages/game-dsl/src/index.js';

describe('Step 37 generation capability resolution shadow artifacts', () => {
  it('skips resolver and exact lock when the current side-scrolling profile is not capability-ready', () => {
    const preflight = buildGenerationCapabilityPreflight({
      projectId: 'proj_20260619_capability_resolution',
      runId: 'run_20260619_capability_resolution',
      normalizedGenre: 'side_scrolling_run_and_gun'
    });

    const artifacts = buildGenerationCapabilityResolutionShadow({
      projectId: 'proj_20260619_capability_resolution',
      runId: 'run_20260619_capability_resolution',
      normalizedGenre: 'side_scrolling_run_and_gun',
      registrySnapshot: preflight.registrySnapshot,
      readinessReport: preflight.readinessReport
    });
    const second = buildGenerationCapabilityResolutionShadow({
      projectId: 'proj_20260619_capability_resolution',
      runId: 'run_20260619_capability_resolution',
      normalizedGenre: 'side_scrolling_run_and_gun',
      registrySnapshot: preflight.registrySnapshot,
      readinessReport: preflight.readinessReport
    });

    expect(GenerationCapabilityResolutionReportSchema.parse(artifacts.resolutionReport)).toEqual(artifacts.resolutionReport);
    expect(artifacts.resolutionReport.reportHash).toBe(second.resolutionReport.reportHash);
    expect(artifacts.shadowGameplayCapabilityLock).toBeUndefined();
    expect(artifacts.resolutionReport).toMatchObject({
      artifactKind: 'generation_capability_resolution_report',
      schemaVersion: 'generation_capability_resolution_report.v0.1',
      selectedPath: 'legacy_template_v1',
      targetPath: 'capability_composed_v1',
      shadowMode: true,
      activeLockWritten: false,
      candidatePackagePolicy: 'approved_installed_packages_only',
      resolverAttempt: 'skipped_readiness_blocked',
      resolutionStatus: 'blocked',
      exactLockStatus: 'not_attempted_requirements_incomplete',
      selectedCapabilityIds: [],
      deferredOptionalCapabilityIds: [],
      resolverDiagnostics: []
    });
    expect(artifacts.resolutionReport.registrySnapshotHash).toBe(preflight.registrySnapshot.snapshotHash);
    expect(artifacts.resolutionReport.readinessReportHash).toBe(preflight.readinessReport.reportHash);
    expect(artifacts.resolutionReport.blockers).toContain('incomplete_capability:telemetry.gameplay_events.v1');
  });

  it('fails closed without resolver or lock for unsupported intent', () => {
    const preflight = buildGenerationCapabilityPreflight({
      projectId: 'proj_20260619_capability_resolution',
      runId: 'run_20260619_unknown_capability_resolution',
      normalizedGenre: 'unrecognized_2d_genre'
    });

    const artifacts = buildGenerationCapabilityResolutionShadow({
      projectId: 'proj_20260619_capability_resolution',
      runId: 'run_20260619_unknown_capability_resolution',
      normalizedGenre: 'unrecognized_2d_genre',
      registrySnapshot: preflight.registrySnapshot,
      readinessReport: preflight.readinessReport
    });

    expect(artifacts.shadowGameplayCapabilityLock).toBeUndefined();
    expect(artifacts.resolutionReport).toMatchObject({
      selectedPath: 'fail_closed_unsupported_intent',
      resolverAttempt: 'skipped_unsupported_intent',
      resolutionStatus: 'blocked',
      exactLockStatus: 'not_applicable_unsupported_intent',
      requestedCapabilityIds: [],
      blockers: ['runtime_profile_not_resolved']
    });
  });

  it('attempts resolver but blocks ready profiles when approved installed packages are absent', () => {
    const preflight = buildGenerationCapabilityPreflight({
      projectId: 'proj_20260619_capability_resolution',
      runId: 'run_20260619_missing_packages_capability_resolution',
      normalizedGenre: 'collector',
      registry: completeCollectorRegistry()
    });

    const artifacts = buildGenerationCapabilityResolutionShadow({
      projectId: 'proj_20260619_capability_resolution',
      runId: 'run_20260619_missing_packages_capability_resolution',
      normalizedGenre: 'collector',
      registrySnapshot: preflight.registrySnapshot,
      readinessReport: preflight.readinessReport,
      approvedInstalledPackages: []
    });

    expect(artifacts.shadowGameplayCapabilityLock).toBeUndefined();
    expect(artifacts.resolutionReport).toMatchObject({
      profileId: 'collector.v1',
      runtimeFamily: 'phaser_2d_top_down_arcade.v1',
      selectedPath: 'legacy_template_v1',
      resolverAttempt: 'attempted',
      resolutionStatus: 'blocked',
      exactLockStatus: 'blocked_resolver_diagnostics',
      approvedInstalledPackageCount: 0
    });
    expect(artifacts.resolutionReport.resolverDiagnostics.map((diagnostic) => diagnostic.code)).toContain('MISSING_CAPABILITY');
    expect(artifacts.resolutionReport.blockers).toContain('resolver:MISSING_CAPABILITY:camera.top_down_follow.v1');
  });

  it('writes a profile-bound shadow exact lock when resolver succeeds', () => {
    const preflight = buildGenerationCapabilityPreflight({
      projectId: 'proj_20260619_capability_resolution',
      runId: 'run_20260619_resolved_capability_resolution',
      normalizedGenre: 'collector',
      registry: completeCollectorRegistry()
    });

    const artifacts = buildGenerationCapabilityResolutionShadow({
      projectId: 'proj_20260619_capability_resolution',
      runId: 'run_20260619_resolved_capability_resolution',
      normalizedGenre: 'collector',
      registrySnapshot: preflight.registrySnapshot,
      readinessReport: preflight.readinessReport,
      approvedInstalledPackages: createCollectorPackages()
    });

    expect(artifacts.shadowGameplayCapabilityLock).toBeDefined();
    expect(artifacts.resolutionReport).toMatchObject({
      profileId: 'collector.v1',
      runtimeFamily: 'phaser_2d_top_down_arcade.v1',
      selectedPath: 'legacy_template_v1',
      targetPath: 'capability_composed_v1',
      shadowMode: true,
      activeLockWritten: false,
      resolverAttempt: 'attempted',
      resolutionStatus: 'resolved',
      exactLockStatus: 'shadow_lock_resolved',
      selectedCapabilityIds: ['camera.top_down_follow.v1', 'movement.eight_direction.v1', 'pickup.collectible.v1'],
      deferredOptionalCapabilityIds: [],
      resolverDiagnostics: [],
      shadowLockRef: 'shadow_gameplay_capability_lock.json',
      blockers: []
    });
    expect(artifacts.resolutionReport.shadowLock?.profileId).toBe('collector.v1');
    expect(artifacts.resolutionReport.shadowLock?.capabilityIds).toEqual([
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

function createCollectorPackages(): GameplayCapabilityPackageContract[] {
  return [
    createPackageContract('camera.top_down_follow.v1'),
    createPackageContract('movement.eight_direction.v1'),
    createPackageContract('pickup.collectible.v1')
  ];
}

function createPackageContract(id: string): GameplayCapabilityPackageContract {
  const ownedPath = `/entities/components/${id}`;
  return {
    manifest: {
      id,
      packageVersion: '1.0.0',
      capabilityVersion: 'v1',
      status: 'supported',
      description: `${id} capability package.`,
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_top_down_arcade.v1'],
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
      families: ['phaser_2d_top_down_arcade.v1'],
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
      probes: [createQaProbe(`${id}.qa.required`, id)],
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

function createQaProbe(id: string, capabilityId: string): GameplayCapabilityPackageContract['qa']['probes'][number] {
  return {
    id,
    capabilityId,
    severity: 'required',
    prerequisites: ['runtime scene started'],
    actions: [{ id: `${id}.action`, kind: 'runtime_event', target: `${capabilityId}.probe`, parameters: { event: 'probe_start' } }],
    observations: [{ id: `${id}.observation`, kind: 'runtime_event', runtimeSystemId: `${capabilityId}.system`, ref: `${capabilityId}.observed` }],
    assertions: [{ id: `${id}.assertion`, observationId: `${id}.observation`, comparator: 'exists', message: `${capabilityId} is observed at runtime` }]
  };
}
