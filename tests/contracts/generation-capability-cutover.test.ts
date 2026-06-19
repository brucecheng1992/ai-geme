import { describe, expect, it } from 'vitest';

import {
  GenerationCapabilityCutoverReportSchema,
  buildGenerationCapabilityCutoverReport,
  buildGenerationCapabilityGapReport,
  buildGenerationCapabilityPreflight,
  buildGenerationCapabilityResolutionShadow,
  buildGenerationCapabilityRollbackDrillReport,
  buildGenerationCapabilityRuntimeShadow,
  buildRunAndGunCapabilityMigrationReport,
  RUN_AND_GUN_REFERENCE_CAPABILITY_IDS,
  RUN_AND_GUN_REQUIRED_AMENDMENT_SCENARIOS,
  RUN_AND_GUN_REQUIRED_CAPABILITY_ARTIFACTS,
  RUN_AND_GUN_REQUIRED_PARITY_GATES,
  type GameplayCapabilityDescriptor,
  type GameplayCapabilityPackageContract,
  type GameplayCapabilityRegistry,
  type PhaserRuntimeSystemManifest,
  type RunAndGunAmendmentScenarioEvidence,
  type RunAndGunParityGateEvidence
} from '../../packages/game-dsl/src/index.js';

const RUN_AND_GUN_PROFILE_CAPABILITY_IDS = [
  ...new Set([...RUN_AND_GUN_REFERENCE_CAPABILITY_IDS, 'pickup.drop_collect.v1', 'rules.restart_loop.v1'])
].sort();

const RUN_AND_GUN_LEGACY_ALIASES_BY_CAPABILITY_ID: Partial<Record<string, string[]>> = {
  'camera.side_follow.v1': ['side_view_camera'],
  'collision.platform.v1': ['platform_collision', 'terrain_collision', 'platforms_terrain_collision'],
  'combat.projectile.v1': ['projectile_combat', 'multi_direction_shooting'],
  'health.damage_invulnerability.v1': ['player_health'],
  'movement.run_jump.v1': ['run_jump_controller'],
  'physics.gravity_platformer.v1': ['gravity_platformer_physics'],
  'rules.restart_loop.v1': ['restart_loop', 'checkpoint_or_lives_system'],
  'spawn.static.v1': ['enemy_spawn', 'enemy_spawn_triggers']
};

describe('Step 37 generation capability cutover readiness', () => {
  it('blocks current side-scrolling runs while the capability gap is unresolved', () => {
    const evidence = buildCurrentGapEvidence();
    const report = buildGenerationCapabilityCutoverReport({
      projectId: 'proj_20260619_cutover',
      runId: 'run_20260619_cutover',
      normalizedGenre: 'side_scrolling_run_and_gun',
      gapReport: evidence.gapReport,
      runtimeReport: evidence.runtimeReport
    });

    expect(GenerationCapabilityCutoverReportSchema.parse(report)).toEqual(report);
    expect(report).toMatchObject({
      artifactKind: 'generation_capability_cutover_report',
      schemaVersion: 'generation_capability_cutover_report.v0.1',
      activeSelectedPath: 'legacy_template_v1',
      targetPath: 'capability_composed_v1',
      defaultCutoverAllowed: false,
      activePathMutation: false,
      shadowOutputMutation: false,
      cutoverStage: 'blocked_by_gap',
      candidateCanaryStatus: 'not_started_gap_blocked',
      parityStatus: 'not_comparable_gap_blocked',
      rollbackDrillStatus: 'not_started_gap_blocked',
      legacyAuthorizationRequiredForRollback: true,
      capabilityPathComparable: false,
      blockers: ['capability_gap_not_resolved']
    });
    expect(report.gapReportHash).toBe(evidence.gapReport.reportHash);
    expect(report.runtimeReportHash).toBe(evidence.runtimeReport.reportHash);
  });

  it('marks a resolved side-scrolling shadow path ready for candidate canary only after parity and rollback pass', () => {
    const evidence = buildResolvedRunAndGunEvidence();
    const migration = buildRunAndGunCapabilityMigrationReport({
      packages: evidence.packages,
      runtimeManifest: evidence.runtimeManifest,
      referenceAcceptance: { passed: true, evidenceRefs: ['reference_acceptance_report.json'] },
      parityGates: createParityGates(),
      amendmentScenarios: createAmendmentScenarios(),
      artifactRefs: createArtifactRefs()
    });
    const rollback = createPassedRollbackDrill();
    const report = buildGenerationCapabilityCutoverReport({
      projectId: 'proj_20260619_cutover',
      runId: 'run_20260619_ready_cutover',
      normalizedGenre: 'side_scrolling_run_and_gun',
      gapReport: evidence.gapReport,
      runtimeReport: evidence.runtimeReport,
      migrationReport: migration,
      rollbackDrillReport: rollback
    });

    expect(report).toMatchObject({
      cutoverStage: 'candidate_canary_ready',
      candidateCanaryStatus: 'ready',
      parityStatus: 'passed',
      unresolvedParityP0Count: 0,
      unresolvedParityP1Count: 0,
      rollbackDrillStatus: 'passed',
      defaultCutoverAllowed: false,
      capabilityPathComparable: true,
      canaryProfileIds: ['side_scrolling_run_and_gun.v1'],
      blockers: []
    });
    expect(report.migrationReportHash).toBe(migration.reportHash);
    expect(report.parityReportHash).toBe(migration.parityReport.reportHash);
    expect(report.rollbackDrillHash).toBe(rollback.drillHash);
  });

  it('keeps parity failures as blockers before canary', () => {
    const evidence = buildResolvedRunAndGunEvidence();
    const migration = buildRunAndGunCapabilityMigrationReport({
      packages: evidence.packages,
      runtimeManifest: evidence.runtimeManifest,
      referenceAcceptance: { passed: true, evidenceRefs: ['reference_acceptance_report.json'] },
      parityGates: createParityGates({ runtime_events: 'failed' }),
      amendmentScenarios: createAmendmentScenarios(),
      artifactRefs: createArtifactRefs()
    });
    const report = buildGenerationCapabilityCutoverReport({
      projectId: 'proj_20260619_cutover',
      runId: 'run_20260619_ready_cutover',
      normalizedGenre: 'side_scrolling_run_and_gun',
      gapReport: evidence.gapReport,
      runtimeReport: evidence.runtimeReport,
      migrationReport: migration,
      rollbackDrillReport: createPassedRollbackDrill()
    });

    expect(report.cutoverStage).toBe('blocked_by_parity');
    expect(report.candidateCanaryStatus).toBe('blocked_parity');
    expect(report.parityStatus).toBe('failed');
    expect(report.unresolvedParityP1Count).toBeGreaterThan(0);
    expect(report.blockers).toContain('legacy_vs_composed_parity_unresolved_p1');
  });

  it('requires rollback to create a separate authorized legacy run before canary readiness', () => {
    const evidence = buildResolvedRunAndGunEvidence();
    const migration = buildRunAndGunCapabilityMigrationReport({
      packages: evidence.packages,
      runtimeManifest: evidence.runtimeManifest,
      referenceAcceptance: { passed: true, evidenceRefs: ['reference_acceptance_report.json'] },
      parityGates: createParityGates(),
      amendmentScenarios: createAmendmentScenarios(),
      artifactRefs: createArtifactRefs()
    });
    const failedRollback = buildGenerationCapabilityRollbackDrillReport({
      projectId: 'proj_20260619_cutover',
      sourceRunId: 'run_20260619_ready_cutover',
      rollbackRunId: 'run_20260619_ready_cutover',
      authorization: createLegacyAuthorization({
        sourceRunId: 'run_20260619_ready_cutover',
        newRunId: 'run_20260619_ready_cutover'
      }),
      historicalArtifactsPreserved: true,
      legacyOutputClearlyLabeled: true,
      exactLockPreserved: true
    });
    const report = buildGenerationCapabilityCutoverReport({
      projectId: 'proj_20260619_cutover',
      runId: 'run_20260619_ready_cutover',
      normalizedGenre: 'side_scrolling_run_and_gun',
      gapReport: evidence.gapReport,
      runtimeReport: evidence.runtimeReport,
      migrationReport: migration,
      rollbackDrillReport: failedRollback
    });

    expect(failedRollback.status).toBe('failed');
    expect(failedRollback.issues).toContain('rollback_run_must_be_new_run');
    expect(report.cutoverStage).toBe('blocked_by_rollback');
    expect(report.rollbackDrillStatus).toBe('failed');
    expect(report.blockers).toContain('rollback_drill_failed');
  });

  it('blocks canary readiness when evidence is not bound to the same source run and profile', () => {
    const evidence = buildResolvedRunAndGunEvidence();
    const migration = buildRunAndGunCapabilityMigrationReport({
      packages: evidence.packages,
      runtimeManifest: evidence.runtimeManifest,
      referenceAcceptance: { passed: true, evidenceRefs: ['reference_acceptance_report.json'] },
      parityGates: createParityGates(),
      amendmentScenarios: createAmendmentScenarios(),
      artifactRefs: createArtifactRefs()
    });
    const rollback = createPassedRollbackDrill();

    expectIdentityBlocked(
      buildGenerationCapabilityCutoverReport({
        projectId: 'proj_20260619_cutover',
        runId: 'run_20260619_ready_cutover',
        normalizedGenre: 'side_scrolling_run_and_gun',
        gapReport: { ...evidence.gapReport, runId: 'run_20260619_other_cutover' },
        runtimeReport: evidence.runtimeReport,
        migrationReport: migration,
        rollbackDrillReport: rollback
      }),
      'evidence_identity_mismatch:gap_run'
    );

    expectIdentityBlocked(
      buildGenerationCapabilityCutoverReport({
        projectId: 'proj_20260619_cutover',
        runId: 'run_20260619_ready_cutover',
        normalizedGenre: 'side_scrolling_run_and_gun',
        gapReport: evidence.gapReport,
        runtimeReport: { ...evidence.runtimeReport, runId: 'run_20260619_other_cutover' },
        migrationReport: migration,
        rollbackDrillReport: rollback
      }),
      'evidence_identity_mismatch:runtime_run'
    );

    const { profileId: _profileId, ...runtimeReportWithoutProfile } = evidence.runtimeReport;
    expectIdentityBlocked(
      buildGenerationCapabilityCutoverReport({
        projectId: 'proj_20260619_cutover',
        runId: 'run_20260619_ready_cutover',
        normalizedGenre: 'side_scrolling_run_and_gun',
        gapReport: evidence.gapReport,
        runtimeReport: runtimeReportWithoutProfile,
        migrationReport: migration,
        rollbackDrillReport: rollback
      }),
      'evidence_identity_mismatch:runtime_profile'
    );

    expectIdentityBlocked(
      buildGenerationCapabilityCutoverReport({
        projectId: 'proj_20260619_cutover',
        runId: 'run_20260619_ready_cutover',
        normalizedGenre: 'side_scrolling_run_and_gun',
        gapReport: evidence.gapReport,
        runtimeReport: evidence.runtimeReport,
        migrationReport: { ...migration, profileId: 'other_profile.v1' } as unknown as typeof migration,
        rollbackDrillReport: rollback
      }),
      'evidence_identity_mismatch:migration_profile'
    );

    const foreignRollback = buildGenerationCapabilityRollbackDrillReport({
      projectId: 'proj_20260619_cutover',
      sourceRunId: 'run_20260619_foreign_cutover',
      rollbackRunId: 'run_20260619_foreign_rollback_cutover',
      authorization: createLegacyAuthorization({
        sourceRunId: 'run_20260619_foreign_cutover',
        newRunId: 'run_20260619_foreign_rollback_cutover'
      }),
      historicalArtifactsPreserved: true,
      legacyOutputClearlyLabeled: true,
      exactLockPreserved: true
    });
    expect(foreignRollback.status).toBe('passed');
    expectIdentityBlocked(
      buildGenerationCapabilityCutoverReport({
        projectId: 'proj_20260619_cutover',
        runId: 'run_20260619_ready_cutover',
        normalizedGenre: 'side_scrolling_run_and_gun',
        gapReport: evidence.gapReport,
        runtimeReport: evidence.runtimeReport,
        migrationReport: migration,
        rollbackDrillReport: foreignRollback
      }),
      'evidence_identity_mismatch:rollback_source_run'
    );
  });

  it('fails rollback drills with an invalid legacy authorization time window', () => {
    const evidence = buildResolvedRunAndGunEvidence();
    const migration = buildRunAndGunCapabilityMigrationReport({
      packages: evidence.packages,
      runtimeManifest: evidence.runtimeManifest,
      referenceAcceptance: { passed: true, evidenceRefs: ['reference_acceptance_report.json'] },
      parityGates: createParityGates(),
      amendmentScenarios: createAmendmentScenarios(),
      artifactRefs: createArtifactRefs()
    });
    const failedRollback = buildGenerationCapabilityRollbackDrillReport({
      projectId: 'proj_20260619_cutover',
      sourceRunId: 'run_20260619_ready_cutover',
      rollbackRunId: 'run_20260619_rollback_cutover',
      authorization: createLegacyAuthorization({
        sourceRunId: 'run_20260619_ready_cutover',
        newRunId: 'run_20260619_rollback_cutover',
        createdAt: '2026-06-20T00:00:00.000Z',
        expiresAt: '2026-06-19T00:00:00.000Z'
      }),
      historicalArtifactsPreserved: true,
      legacyOutputClearlyLabeled: true,
      exactLockPreserved: true
    });
    const report = buildGenerationCapabilityCutoverReport({
      projectId: 'proj_20260619_cutover',
      runId: 'run_20260619_ready_cutover',
      normalizedGenre: 'side_scrolling_run_and_gun',
      gapReport: evidence.gapReport,
      runtimeReport: evidence.runtimeReport,
      migrationReport: migration,
      rollbackDrillReport: failedRollback
    });

    expect(failedRollback.status).toBe('failed');
    expect(failedRollback.issues).toContain('legacy_authorization_invalid_time_window');
    expect(report.cutoverStage).toBe('blocked_by_rollback');
    expect(report.blockers).toContain('rollback_drill_failed');
  });
});

function buildCurrentGapEvidence() {
  const preflight = buildGenerationCapabilityPreflight({
    projectId: 'proj_20260619_cutover',
    runId: 'run_20260619_cutover',
    normalizedGenre: 'side_scrolling_run_and_gun'
  });
  const resolution = buildGenerationCapabilityResolutionShadow({
    projectId: 'proj_20260619_cutover',
    runId: 'run_20260619_cutover',
    normalizedGenre: 'side_scrolling_run_and_gun',
    registrySnapshot: preflight.registrySnapshot,
    readinessReport: preflight.readinessReport
  });
  const runtime = buildGenerationCapabilityRuntimeShadow({
    projectId: 'proj_20260619_cutover',
    runId: 'run_20260619_cutover',
    normalizedGenre: 'side_scrolling_run_and_gun',
    resolutionReport: resolution.resolutionReport
  });
  return {
    gapReport: buildGenerationCapabilityGapReport({
      projectId: 'proj_20260619_cutover',
      runId: 'run_20260619_cutover',
      normalizedGenre: 'side_scrolling_run_and_gun',
      readinessReport: preflight.readinessReport,
      resolutionReport: resolution.resolutionReport,
      runtimeReport: runtime.runtimeReport
    }),
    runtimeReport: runtime.runtimeReport
  };
}

function buildResolvedRunAndGunEvidence() {
  const packages = createPackages();
  const runtimeManifest = createRuntimeManifest(packages);
  const preflight = buildGenerationCapabilityPreflight({
    projectId: 'proj_20260619_cutover',
    runId: 'run_20260619_ready_cutover',
    normalizedGenre: 'side_scrolling_run_and_gun',
    registry: completeRunAndGunRegistry()
  });
  const resolution = buildGenerationCapabilityResolutionShadow({
    projectId: 'proj_20260619_cutover',
    runId: 'run_20260619_ready_cutover',
    normalizedGenre: 'side_scrolling_run_and_gun',
    registrySnapshot: preflight.registrySnapshot,
    readinessReport: preflight.readinessReport,
    approvedInstalledPackages: packages
  });
  const runtime = buildGenerationCapabilityRuntimeShadow({
    projectId: 'proj_20260619_cutover',
    runId: 'run_20260619_ready_cutover',
    normalizedGenre: 'side_scrolling_run_and_gun',
    resolutionReport: resolution.resolutionReport,
    runtimeSystemManifest: runtimeManifest,
    approvedInstalledPackages: packages,
    capabilityQaProbeResults: passedProbeResults(packages)
  });
  return {
    packages,
    runtimeManifest,
    gapReport: buildGenerationCapabilityGapReport({
      projectId: 'proj_20260619_cutover',
      runId: 'run_20260619_ready_cutover',
      normalizedGenre: 'side_scrolling_run_and_gun',
      readinessReport: preflight.readinessReport,
      resolutionReport: resolution.resolutionReport,
      runtimeReport: runtime.runtimeReport
    }),
    runtimeReport: runtime.runtimeReport
  };
}

function completeRunAndGunRegistry(): GameplayCapabilityRegistry {
  return {
    registryVersion: 'gameplay-capability-registry.v0.1',
    entries: RUN_AND_GUN_PROFILE_CAPABILITY_IDS.map((id) => completeCapability(id))
  };
}

function completeCapability(id: GameplayCapabilityDescriptor['id']): GameplayCapabilityDescriptor {
  return {
    id,
    version: 'v1',
    domain: id.split('.')[0] as GameplayCapabilityDescriptor['domain'],
    status: 'complete_supported',
    label: id,
    runtimeFamilies: ['phaser_2d_action_arcade.v1'],
    profiles: ['side_scrolling_run_and_gun.v1'],
    legacyRuntimeCapabilities: RUN_AND_GUN_LEGACY_ALIASES_BY_CAPABILITY_ID[id] ?? [],
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

function createPackages(): GameplayCapabilityPackageContract[] {
  return RUN_AND_GUN_PROFILE_CAPABILITY_IDS.map((id) => createPackage(id));
}

function createPackage(id: string): GameplayCapabilityPackageContract {
  const ownedPath = `/capabilities/${id}`;
  return {
    manifest: {
      id,
      packageVersion: '1.0.0',
      capabilityVersion: 'v1',
      status: 'supported',
      description: `${id} reference composition package.`,
      owners: ['gameplay-platform'],
      runtimeFamilies: ['phaser_2d_action_arcade.v1'],
      contractVersion: 'gameplay-capability-package.v1'
    },
    dsl: { schemaFragmentId: `${id}.schema`, ownedPaths: [ownedPath], normalizerId: `${id}.normalizer`, migrations: [] },
    ir: { compilerId: `${id}.ir`, ownedNodeKinds: [`component.${id.replace(/\.v1$/, '')}`] },
    runtime: { families: ['phaser_2d_action_arcade.v1'], systems: [{ id: `${id}.system`, version: 'v1', phase: 'gameplay', dependencies: [] }] },
    amendments: { supportedOperations: [{ operation: `SetComponentProperty:${id}`, executionPolicy: 'hot_runtime_patch' }], compilerId: `${id}.amendments` },
    patch: { descriptors: [{ id: `${id}.patch`, policy: 'hot_runtime_patch', ownedPaths: [ownedPath] }] },
    qa: { probes: [createQaProbe(`${id}.qa.required`, id)], requiredEvidence: [{ id: `${id}.evidence.runtime`, artifactKind: 'capability_qa_report', required: true }] },
    render: { assetRoles: [], sceneBindings: [], fallbackPolicy: 'not_applicable' },
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
    prerequisites: ['reference runtime scene started'],
    actions: [{ id: `${id}.action`, kind: 'runtime_event', target: `${capabilityId}.probe`, parameters: { event: 'probe_start' } }],
    observations: [{ id: `${id}.observation`, kind: 'runtime_event', runtimeSystemId: `${capabilityId}.system`, ref: `${capabilityId}.observed` }],
    assertions: [{ id: `${id}.assertion`, observationId: `${id}.observation`, comparator: 'exists', message: `${capabilityId} observed` }]
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
      selectorValue: 'side_scrolling_run_and_gun.v1',
      universalTemplatePath: 'templates/phaser/universal-2d-action'
    },
    systems: packages.map((contract) => ({
      id: `${contract.manifest.id}.system`,
      version: 'v1',
      capabilityId: contract.manifest.id,
      runtimeFamily: 'phaser_2d_action_arcade.v1',
      phase: 'gameplay',
      dependencies: [],
      services: ['entity_registry', 'event_bus'],
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

function expectIdentityBlocked(report: ReturnType<typeof buildGenerationCapabilityCutoverReport>, expectedBlocker: string): void {
  expect(report).toMatchObject({
    cutoverStage: 'blocked_by_evidence_identity',
    candidateCanaryStatus: 'blocked_evidence_identity',
    parityStatus: 'not_comparable_evidence_identity',
    capabilityPathComparable: false,
    canaryProfileIds: []
  });
  expect(report.blockers).toContain(expectedBlocker);
}

function createParityGates(overrides: Partial<Record<RunAndGunParityGateEvidence['gateId'], 'passed' | 'failed'>> = {}): RunAndGunParityGateEvidence[] {
  return RUN_AND_GUN_REQUIRED_PARITY_GATES.map((gateId) => ({
    gateId,
    status: overrides[gateId] ?? 'passed',
    legacyEvidenceRef: `legacy/${gateId}.json`,
    composedEvidenceRef: `composed/${gateId}.json`,
    summary: `${gateId} parity evidence`
  }));
}

function createAmendmentScenarios(): RunAndGunAmendmentScenarioEvidence[] {
  return RUN_AND_GUN_REQUIRED_AMENDMENT_SCENARIOS.map((scenarioId) => ({
    scenarioId,
    status: 'passed',
    evidenceRef: `amendments/${scenarioId}.json`
  }));
}

function createArtifactRefs() {
  return RUN_AND_GUN_REQUIRED_CAPABILITY_ARTIFACTS.map((artifactKind) => ({
    artifactKind,
    path: `artifacts/${artifactKind}.json`
  }));
}

function createPassedRollbackDrill() {
  return buildGenerationCapabilityRollbackDrillReport({
    projectId: 'proj_20260619_cutover',
    sourceRunId: 'run_20260619_ready_cutover',
    rollbackRunId: 'run_20260619_rollback_cutover',
    authorization: createLegacyAuthorization({
      sourceRunId: 'run_20260619_ready_cutover',
      newRunId: 'run_20260619_rollback_cutover'
    }),
    historicalArtifactsPreserved: true,
    legacyOutputClearlyLabeled: true,
    exactLockPreserved: true
  });
}

function createLegacyAuthorization(input: { sourceRunId: string; newRunId: string; createdAt?: string; expiresAt?: string }) {
  return {
    schemaVersion: 'step37.legacy-authorization.v1' as const,
    sourceRunId: input.sourceRunId,
    newRunId: input.newRunId,
    projectId: 'proj_20260619_cutover',
    actorId: 'registry-admin:test',
    reasonCode: 'incident_rollback' as const,
    reasonText: 'Rollback drill for Step37 canary readiness.',
    createdAt: input.createdAt ?? '2026-06-19T00:00:00.000Z',
    expiresAt: input.expiresAt ?? '2026-06-20T00:00:00.000Z'
  };
}
