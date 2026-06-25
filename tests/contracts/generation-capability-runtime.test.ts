import { describe, expect, it } from 'vitest';

import {
  GenerationCapabilityRuntimeReportSchema,
  buildGenerationCapabilityPreflight,
  buildGenerationCapabilityResolutionShadow,
  buildGenerationCapabilityRuntimeShadow,
  type GameplayCapabilityDescriptor,
  type GameplayCapabilityPackageContract,
  type GameplayCapabilityRegistry,
  type PhaserRuntimeSystemManifest
} from '../../packages/game-dsl/src/index.js';

describe('Step 37 generation capability runtime shadow evidence', () => {
  it('blocks active profile-bound production requirements until QA observes runtime authority', () => {
    const preflight = buildGenerationCapabilityPreflight({
      projectId: 'proj_20260619_capability_runtime',
      runId: 'run_20260619_capability_runtime',
      normalizedGenre: 'side_scrolling_run_and_gun'
    });
    const resolution = buildGenerationCapabilityResolutionShadow({
      projectId: 'proj_20260619_capability_runtime',
      runId: 'run_20260619_capability_runtime',
      normalizedGenre: 'side_scrolling_run_and_gun',
      registrySnapshot: preflight.registrySnapshot,
      readinessReport: preflight.readinessReport
    });

    const runtime = buildGenerationCapabilityRuntimeShadow({
      projectId: 'proj_20260619_capability_runtime',
      runId: 'run_20260619_capability_runtime',
      normalizedGenre: 'side_scrolling_run_and_gun',
      resolutionReport: resolution.resolutionReport
    });

    expect(GenerationCapabilityRuntimeReportSchema.parse(runtime.runtimeReport)).toEqual(runtime.runtimeReport);
    expect(runtime).toMatchObject({
      runtimeReport: {
        artifactKind: 'generation_capability_runtime_report',
        schemaVersion: 'generation_capability_runtime_report.v0.1',
        selectedPath: 'capability_composed_v1',
        targetPath: 'capability_composed_v1',
        shadowMode: false,
        activeRuntimeManifestWritten: false,
        activeCapabilityQaWritten: false,
        runtimeManifestStatus: 'active_profile_bound',
        runtimeLoaderStatus: 'not_attempted',
        capabilityQaPlanStatus: 'not_attempted',
        capabilityQaReportStatus: 'not_attempted',
        qaRuntimeAuthorityStatus: 'missing',
        runtimeEvidenceStatus: 'not_attempted',
        lockCapabilityIds: expect.arrayContaining(['camera.side_follow.v1', 'health.player_health_points.v1', 'rules.restart_loop.v1']),
        runtimeSystemCapabilityIds: [],
        blockers: ['runtime_authority_not_observed']
      }
    });
    expect(runtime.runtimeReport.resolutionReportHash).toBe(resolution.resolutionReport.reportHash);
    expect(runtime.shadowRuntimeSystemManifest).toBeUndefined();
    expect(runtime.shadowRuntimeLoaderReport).toBeUndefined();
    expect(runtime.shadowCapabilityQaPlan).toBeUndefined();
    expect(runtime.shadowCapabilityQaReport).toBeUndefined();
  });

  it('observes active profile runtime evidence only when QA returns the same runtime authority refs', () => {
    const preflight = buildGenerationCapabilityPreflight({
      projectId: 'proj_20260619_capability_runtime',
      runId: 'run_20260619_capability_runtime',
      normalizedGenre: 'side_scrolling_run_and_gun'
    });
    const resolution = buildGenerationCapabilityResolutionShadow({
      projectId: 'proj_20260619_capability_runtime',
      runId: 'run_20260619_capability_runtime',
      normalizedGenre: 'side_scrolling_run_and_gun',
      registrySnapshot: preflight.registrySnapshot,
      readinessReport: preflight.readinessReport
    });

    const runtime = buildGenerationCapabilityRuntimeShadow({
      projectId: 'proj_20260619_capability_runtime',
      runId: 'run_20260619_capability_runtime',
      normalizedGenre: 'side_scrolling_run_and_gun',
      resolutionReport: resolution.resolutionReport,
      activeRuntimeAuthority: activeRuntimeAuthorityEvidence()
    });

    expect(runtime.runtimeReport).toMatchObject({
      selectedPath: 'capability_composed_v1',
      shadowMode: false,
      activeRuntimeManifestWritten: true,
      activeCapabilityQaWritten: true,
      runtimeLoaderStatus: 'ready',
      capabilityQaPlanStatus: 'ready',
      capabilityQaReportStatus: 'passed',
      qaRuntimeAuthorityStatus: 'matched',
      authorityBundleRef: { bundleHash: 'fnv1a_12345678' },
      activeProfileLockRef: { lockHash: 'fnv1a_87654321' },
      runtimeEvidenceStatus: 'observed',
      runtimeSystemCapabilityIds: expect.arrayContaining(['camera.side_follow.v1', 'health.player_health_points.v1', 'rules.restart_loop.v1']),
      blockers: []
    });
  });

  it('blocks a resolved shadow lock when no runtime manifest is supplied', () => {
    const resolved = buildResolvedCollectorResolution();
    const runtime = buildGenerationCapabilityRuntimeShadow({
      projectId: 'proj_20260619_capability_runtime',
      runId: 'run_20260619_missing_manifest_capability_runtime',
      normalizedGenre: 'collector',
      resolutionReport: resolved.resolutionReport,
      approvedInstalledPackages: createCollectorPackages()
    });

    expect(runtime.runtimeReport).toMatchObject({
      profileId: 'collector.v1',
      runtimeManifestStatus: 'missing',
      runtimeLoaderStatus: 'not_attempted',
      capabilityQaPlanStatus: 'not_attempted',
      capabilityQaReportStatus: 'not_attempted',
      runtimeEvidenceStatus: 'not_attempted',
      blockers: ['runtime_manifest_missing_or_invalid']
    });
    expect(runtime.runtimeReport.exactLockHash).toBe(resolved.shadowGameplayCapabilityLock?.lockHash);
  });

  it('validates runtime manifest, loader, and capability-owned QA against the same shadow lock', () => {
    const packages = createCollectorPackages();
    const resolved = buildResolvedCollectorResolution(packages);
    const runtime = buildGenerationCapabilityRuntimeShadow({
      projectId: 'proj_20260619_capability_runtime',
      runId: 'run_20260619_ready_capability_runtime',
      normalizedGenre: 'collector',
      resolutionReport: resolved.resolutionReport,
      runtimeSystemManifest: createRuntimeManifest(packages),
      approvedInstalledPackages: packages,
      capabilityQaProbeResults: passedProbeResults(packages)
    });

    expect(runtime.runtimeReport).toMatchObject({
      profileId: 'collector.v1',
      selectedPath: 'capability_composed_v1',
      targetPath: 'capability_composed_v1',
      exactLockHash: resolved.shadowGameplayCapabilityLock?.lockHash,
      lockCapabilityIds: ['camera.top_down_follow.v1', 'movement.eight_direction.v1', 'pickup.collectible.v1'],
      runtimeManifestStatus: 'exact_lock_match',
      runtimeLoaderStatus: 'ready',
      capabilityQaPlanStatus: 'ready',
      capabilityQaReportStatus: 'passed',
      runtimeEvidenceStatus: 'observed',
      runtimeSystemCapabilityIds: ['camera.top_down_follow.v1', 'movement.eight_direction.v1', 'pickup.collectible.v1'],
      shadowRuntimeSystemManifestRef: 'shadow_phaser_runtime_system_manifest.json',
      shadowRuntimeLoaderReportRef: 'shadow_phaser_runtime_loader_report.json',
      shadowCapabilityQaPlanRef: 'shadow_capability_qa_plan.json',
      shadowCapabilityQaReportRef: 'shadow_capability_qa_report.json',
      blockers: []
    });
    expect(runtime.shadowRuntimeSystemManifest).toBeDefined();
    expect(runtime.shadowRuntimeLoaderReport?.status).toBe('ready');
    expect(runtime.shadowCapabilityQaPlan?.status).toBe('ready');
    expect(runtime.shadowCapabilityQaReport?.status).toBe('passed');
  });

  it('blocks runtime evidence when the manifest capability owners do not match the shadow lock', () => {
    const packages = createCollectorPackages();
    const resolved = buildResolvedCollectorResolution(packages);
    const manifest = createRuntimeManifest(packages);
    const runtime = buildGenerationCapabilityRuntimeShadow({
      projectId: 'proj_20260619_capability_runtime',
      runId: 'run_20260619_manifest_mismatch_capability_runtime',
      normalizedGenre: 'collector',
      resolutionReport: resolved.resolutionReport,
      runtimeSystemManifest: {
        ...manifest,
        systems: manifest.systems.filter((system) => system.capabilityId !== 'pickup.collectible.v1')
      },
      approvedInstalledPackages: packages,
      capabilityQaProbeResults: passedProbeResults(packages)
    });

    expect(runtime.runtimeReport.runtimeManifestStatus).toBe('lock_mismatch');
    expect(runtime.runtimeReport.runtimeEvidenceStatus).toBe('blocked');
    expect(runtime.runtimeReport.blockers).toContain('runtime_manifest_missing_capability:pickup.collectible.v1');
  });
});

function buildResolvedCollectorResolution(packages: GameplayCapabilityPackageContract[] = createCollectorPackages()) {
  const preflight = buildGenerationCapabilityPreflight({
    projectId: 'proj_20260619_capability_runtime',
    runId: 'run_20260619_ready_capability_runtime',
    normalizedGenre: 'collector',
    registry: completeCollectorRegistry()
  });
  return buildGenerationCapabilityResolutionShadow({
    projectId: 'proj_20260619_capability_runtime',
    runId: 'run_20260619_ready_capability_runtime',
    normalizedGenre: 'collector',
    registrySnapshot: preflight.registrySnapshot,
    readinessReport: preflight.readinessReport,
    approvedInstalledPackages: packages
  });
}

function activeRuntimeAuthorityEvidence() {
  return {
    authorityBundleRef: {
      artifactKind: 'authority_bundle' as const,
      path: 'authority_bundle.json' as const,
      bundleHash: 'fnv1a_12345678'
    },
    activeProfileLockRef: {
      artifactKind: 'active_profile_lock' as const,
      path: 'active_profile_lock.json' as const,
      lockHash: 'fnv1a_87654321'
    }
  };
}

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
    runtimeFamilies: ['phaser_2d_action_arcade.v1'],
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

function createRuntimeManifest(packages: readonly GameplayCapabilityPackageContract[]): PhaserRuntimeSystemManifest {
  return {
    artifactKind: 'phaser_runtime_system_manifest',
    schemaVersion: 'phaser_runtime_system_manifest.v0.1',
    runtimeFamily: 'phaser_2d_action_arcade.v1',
    kernel: {
      id: 'phaser_2d_action_arcade.kernel.v1',
      version: 'v1',
      runtimeFamily: 'phaser_2d_action_arcade.v1',
      templateBoundary: 'universal_kernel',
      profileBranching: 'forbidden',
      defaultGameplayObjects: 'forbidden',
      services: ['entity_registry', 'event_bus', 'scheduler', 'runtime_patch', 'qa_observer']
    },
    compatibilityMode: {
      selection: 'universal_composition',
      selectedBy: 'profile_compiler_version',
      selectorValue: 'capability-profile-compiler.v0.1',
      universalTemplatePath: 'templates/phaser/universal-2d-action'
    },
    systems: packages.map((contract) => ({
      id: `${contract.manifest.id}.system`,
      version: 'v1',
      capabilityId: contract.manifest.id,
      runtimeFamily: 'phaser_2d_action_arcade.v1',
      phase: 'gameplay',
      dependencies: [],
      services: ['entity_registry'],
      authoritativeConfig: 'capability_ir',
      qaProbeIds: [`${contract.manifest.id}.qa.required`]
    }))
  };
}

function passedProbeResults(packages: readonly GameplayCapabilityPackageContract[]) {
  return packages.map((contract) => ({
    probeId: `${contract.manifest.id}.qa.required`,
    status: 'passed' as const,
    assertionResults: [{ assertionId: `${contract.manifest.id}.qa.required.assertion`, status: 'passed' as const }]
  }));
}
