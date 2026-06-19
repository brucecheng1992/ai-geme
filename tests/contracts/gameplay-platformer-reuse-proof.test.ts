import { describe, expect, it } from 'vitest';

import {
  buildRunAndGunCapabilityMigrationReport,
  buildPlatformerReuseProofReport,
  PLATFORMER_PROFILE_ID,
  PLATFORMER_REQUIRED_AMENDMENT_SCENARIOS,
  PLATFORMER_REQUIRED_ARTIFACT_KINDS,
  PLATFORMER_REQUIRED_CAPABILITY_IDS,
  PLATFORMER_REUSE_PROOF_REPORT_KIND,
  PLATFORMER_SHOOTING_ADDITION_CAPABILITY_IDS,
  RUN_AND_GUN_REFERENCE_CAPABILITY_IDS,
  RUN_AND_GUN_REQUIRED_AMENDMENT_SCENARIOS,
  RUN_AND_GUN_REQUIRED_CAPABILITY_ARTIFACTS,
  RUN_AND_GUN_REQUIRED_PARITY_GATES,
  type GameplayCapabilityPackageContract,
  type PhaserRuntimeSystemManifest,
  type PlatformerAmendmentScenarioEvidence,
  type RunAndGunAmendmentScenarioEvidence,
  type RunAndGunParityGateEvidence
} from '../../packages/game-dsl/src/index.js';

describe('Side-scrolling platformer second profile reuse proof', () => {
  it('proves the platformer profile reuses the universal runtime without projectile modules or a new template', () => {
    const report = buildPlatformerReuseProofReport(createProofInput());

    expect(report.status).toBe('ready');
    expect(report.profileId).toBe(PLATFORMER_PROFILE_ID);
    expect(report.reuseRatio).toBeGreaterThanOrEqual(0.7);
    expect(report.reusedCapabilityIds).toEqual([
      'asset.sprite_binding.v1',
      'camera.side_follow.v1',
      'collision.platform.v1',
      'health.damage_invulnerability.v1',
      'movement.run_jump.v1',
      'physics.gravity_platformer.v1',
      'scene.parallax_background.v1',
      'telemetry.gameplay_events.v1'
    ]);
    expect(report.newCapabilityIds).toEqual(['goal.reach_exit.v1', 'pickup.collectible.v1']);
    expect(report.noProjectileModulesLoaded).toBe(true);
    expect(report.noNewTemplateDirectory).toBe(true);
    expect(report.noGenreSwitchRegression).toBe(true);
    expect(report.profileCompilationReport.status).toBe('compiled');
    expect(report.shootingAdditionCandidate.status).toBe('resolved');
    expect(report.shootingActualAddedCapabilityIds).toEqual([...PLATFORMER_SHOOTING_ADDITION_CAPABILITY_IDS]);
    expect(report.referenceCompositionReady).toBe(true);
    expect(report.referenceCompositionReportHash).toBeTruthy();
    expect(report.referenceCapabilityLockHash).toBeTruthy();
    expect(report.missingArtifactKinds).toEqual([]);
    expect(report.failedAmendmentScenarioIds).toEqual([]);
  });

  it('blocks the proof when projectile modules are loaded in the base platformer profile', () => {
    const packages = createPackages();
    const report = buildPlatformerReuseProofReport({
      ...createProofInput(packages),
      runtimeManifest: createRuntimeManifest(packages, { includeProjectileModules: true })
    });

    expect(report.status).toBe('blocked');
    expect(report.noProjectileModulesLoaded).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining(['projectile_modules_loaded_in_base_profile']));
  });

  it('blocks a new genre-specific platformer template directory', () => {
    const report = buildPlatformerReuseProofReport({
      ...createProofInput(),
      templateDirs: ['collector', 'side_scrolling_run_and_gun', 'templates/phaser/side_scrolling_platformer']
    });

    expect(report.status).toBe('blocked');
    expect(report.noNewTemplateDirectory).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining(['new_genre_template_directory_detected']));
  });

  it('blocks a top-level compiler genre switch regression', () => {
    const report = buildPlatformerReuseProofReport({
      ...createProofInput(),
      compilerGenreSwitches: ['side_scrolling_platformer']
    });

    expect(report.status).toBe('blocked');
    expect(report.noGenreSwitchRegression).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining(['compiler_genre_switch_detected']));
  });

  it('requires all platformer amendment scenarios including capability addition', () => {
    const report = buildPlatformerReuseProofReport({
      ...createProofInput(),
      amendmentScenarios: createAmendmentScenarios().filter((scenario) => scenario.scenarioId !== 'collectible_count_to_8')
    });

    expect(report.status).toBe('blocked');
    expect(report.missingAmendmentScenarioIds).toEqual(['collectible_count_to_8']);
  });

  it('blocks failed platformer amendment scenarios from producing a ready proof', () => {
    const report = buildPlatformerReuseProofReport({
      ...createProofInput(),
      amendmentScenarios: createAmendmentScenarios().map((scenario) =>
        scenario.scenarioId === 'jump_height_increase' ? { ...scenario, status: 'failed' } : scenario
      )
    });

    expect(report.status).toBe('blocked');
    expect(report.failedAmendmentScenarioIds).toEqual(['jump_height_increase']);
    expect(report.blockers).toEqual(expect.arrayContaining(['amendment_scenarios_incomplete']));
  });

  it('requires collect-exit QA and render fidelity artifact refs even when summary booleans are true', () => {
    const report = buildPlatformerReuseProofReport({
      ...createProofInput(),
      artifactRefs: createArtifactRefs().filter((ref) => ref.artifactKind === PLATFORMER_REUSE_PROOF_REPORT_KIND)
    });

    expect(report.status).toBe('blocked');
    expect(report.collectAndExitQaPassed).toBe(true);
    expect(report.renderFidelityPassed).toBe(true);
    expect(report.missingArtifactKinds).toEqual(['platformer_collect_exit_qa_report', 'render_fidelity_report']);
    expect(report.blockers).toEqual(expect.arrayContaining(['platformer_evidence_artifact_refs_incomplete']));
  });

  it('calculates reuse from matching package hashes against the run-and-gun reference lock', () => {
    const packages = createPackages();
    const runAndGunReferenceReport = createRunAndGunReferenceReport({
      packages: createRunAndGunReferencePackages({
        mutatePackages: (contract) =>
          contract.manifest.id === 'camera.side_follow.v1' || contract.manifest.id === 'movement.run_jump.v1'
            ? {
                ...contract,
                manifest: {
                  ...contract.manifest,
                  description: `${contract.manifest.description} changed for reference lock`
                }
              }
            : contract
      })
    });
    const report = buildPlatformerReuseProofReport({
      ...createProofInput(packages),
      runAndGunReferenceReport
    });

    expect(report.status).toBe('blocked');
    expect(report.reuseRatio).toBe(0.6);
    expect(report.missingReferencePackageIds).toEqual(['camera.side_follow.v1', 'movement.run_jump.v1']);
    expect(report.blockers).toEqual(expect.arrayContaining(['reuse_ratio_below_threshold']));
  });

  it('blocks self-supplied platformer packages without a ready run-and-gun reference composition report', () => {
    const packages = createPackages();
    const report = buildPlatformerReuseProofReport({
      ...createProofInput(packages),
      runAndGunReferenceReport: createRunAndGunReferenceReport({ packages })
    });

    expect(report.status).toBe('blocked');
    expect(report.referenceCompositionReady).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining(['run_and_gun_reference_composition_missing']));
  });

  it('requires the shooting amendment declared additions to exactly match the resolver candidate', () => {
    const report = buildPlatformerReuseProofReport({
      ...createProofInput(),
      amendmentScenarios: createAmendmentScenarios().map((scenario) =>
        scenario.scenarioId === 'add_shooting_capability'
          ? { ...scenario, addedCapabilityIds: [...PLATFORMER_SHOOTING_ADDITION_CAPABILITY_IDS, 'enemy.ranged_attack.v1'] }
          : scenario
      )
    });

    expect(report.status).toBe('blocked');
    expect(report.blockers).toEqual(expect.arrayContaining(['shooting_capability_addition_candidate_missing']));
  });

  it('blocks shooting additions when resolver lock diff pulls extra undeclared capabilities', () => {
    const packages = [...createPackages(), createPackage('enemy.ranged_attack.v1')].map((contract) =>
      contract.manifest.id === 'combat.projectile.v1'
        ? {
            ...contract,
            dependencies: [{ capabilityId: 'enemy.ranged_attack.v1', range: '^v1' }]
          }
        : contract
    );
    const report = buildPlatformerReuseProofReport(createProofInput(packages));

    expect(report.status).toBe('blocked');
    expect(report.shootingAdditionCandidate.status).toBe('resolved');
    expect(report.shootingActualAddedCapabilityIds).toEqual(['combat.projectile.v1', 'enemy.ranged_attack.v1', 'weapon.cooldown.v1']);
    expect(report.blockers).toEqual(expect.arrayContaining(['shooting_capability_addition_candidate_missing']));
  });

  it('blocks shooting capability addition when the required packages are unavailable', () => {
    const packages = createPackages({ includeShootingPackages: false });
    const report = buildPlatformerReuseProofReport(createProofInput(packages));

    expect(report.status).toBe('blocked');
    expect(report.shootingAdditionCandidate.status).toBe('blocked');
    expect(report.blockers).toEqual(expect.arrayContaining(['shooting_capability_addition_candidate_missing']));
  });
});

function createProofInput(packages = createPackages()) {
  return {
    packages,
    runtimeManifest: createRuntimeManifest(packages),
    referenceAcceptance: { passed: true, evidenceRefs: ['platformer_acceptance_report.json'] },
    runAndGunReferenceReport: createRunAndGunReferenceReport(),
    amendmentScenarios: createAmendmentScenarios(),
    artifactRefs: createArtifactRefs(),
    templateDirs: ['collector', 'dodger', 'shooter', 'side_scrolling_run_and_gun'],
    compilerGenreSwitches: [],
    collectAndExitQaPassed: true,
    renderFidelityPassed: true
  };
}

function createRunAndGunReferenceReport(input: { packages?: readonly GameplayCapabilityPackageContract[] } = {}) {
  const packages = input.packages ?? createRunAndGunReferencePackages();
  return buildRunAndGunCapabilityMigrationReport({
    packages,
    runtimeManifest: createRunAndGunRuntimeManifest(packages),
    referenceAcceptance: { passed: true, evidenceRefs: ['reference_acceptance_report.json'] },
    parityGates: createRunAndGunParityGates(),
    amendmentScenarios: createRunAndGunAmendmentScenarios(),
    artifactRefs: createRunAndGunArtifactRefs()
  });
}

function createRunAndGunReferencePackages(input: { mutatePackages?: (contract: GameplayCapabilityPackageContract) => GameplayCapabilityPackageContract } = {}) {
  return RUN_AND_GUN_REFERENCE_CAPABILITY_IDS.map((id) => input.mutatePackages?.(createPackage(id)) ?? createPackage(id));
}

function createRunAndGunParityGates(): RunAndGunParityGateEvidence[] {
  return RUN_AND_GUN_REQUIRED_PARITY_GATES.map((gateId) => ({
    gateId,
    status: 'passed',
    legacyEvidenceRef: `legacy/${gateId}.json`,
    composedEvidenceRef: `composed/${gateId}.json`,
    summary: `${gateId} parity evidence`
  }));
}

function createRunAndGunAmendmentScenarios(): RunAndGunAmendmentScenarioEvidence[] {
  return RUN_AND_GUN_REQUIRED_AMENDMENT_SCENARIOS.map((scenarioId) => ({
    scenarioId,
    status: 'passed',
    evidenceRef: `amendments/run-and-gun/${scenarioId}.json`
  }));
}

function createRunAndGunArtifactRefs() {
  return RUN_AND_GUN_REQUIRED_CAPABILITY_ARTIFACTS.map((artifactKind) => ({
    artifactKind,
    path: `artifacts/run-and-gun/${artifactKind}.json`
  }));
}

function createArtifactRefs() {
  return PLATFORMER_REQUIRED_ARTIFACT_KINDS.map((artifactKind) => ({
    artifactKind,
    path: `artifacts/${artifactKind}.json`
  }));
}

function createAmendmentScenarios(): PlatformerAmendmentScenarioEvidence[] {
  return PLATFORMER_REQUIRED_AMENDMENT_SCENARIOS.map((scenarioId) => ({
    scenarioId,
    status: scenarioId === 'add_shooting_capability' ? 'candidate_generated' : 'passed',
    evidenceRef: `amendments/${scenarioId}.json`,
    ...(scenarioId === 'add_shooting_capability' ? { addedCapabilityIds: [...PLATFORMER_SHOOTING_ADDITION_CAPABILITY_IDS] } : {})
  }));
}

function createPackages(input: { includeShootingPackages?: boolean } = {}): GameplayCapabilityPackageContract[] {
  const baseCapabilities = [...PLATFORMER_REQUIRED_CAPABILITY_IDS];
  const shootingCapabilities = input.includeShootingPackages === false ? [] : [...PLATFORMER_SHOOTING_ADDITION_CAPABILITY_IDS];
  return [...baseCapabilities, ...shootingCapabilities].map((id) => createPackage(id));
}

function createPackage(id: string): GameplayCapabilityPackageContract {
  const ownedPath = `/platformer/capabilities/${id}`;
  return {
    manifest: {
      id,
      packageVersion: '1.0.0',
      capabilityVersion: 'v1',
      status: 'supported',
      description: `${id} platformer reuse package.`,
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
    prerequisites: ['platformer runtime scene started'],
    actions: [{ id: `${id}.action`, kind: 'runtime_event', target: `${capabilityId}.probe`, parameters: { event: 'probe_start' } }],
    observations: [{ id: `${id}.observation`, kind: 'runtime_event', runtimeSystemId: `${capabilityId}.system`, ref: `${capabilityId}.observed` }],
    assertions: [{ id: `${id}.assertion`, observationId: `${id}.observation`, comparator: 'exists', message: `${capabilityId} observed` }]
  };
}

function createRuntimeManifest(
  packages: readonly GameplayCapabilityPackageContract[],
  input: { includeProjectileModules?: boolean } = {}
): PhaserRuntimeSystemManifest {
  const baseCapabilities = new Set<string>(PLATFORMER_REQUIRED_CAPABILITY_IDS);
  const allowedCapabilities = input.includeProjectileModules === true ? new Set(packages.map((contract) => contract.manifest.id)) : baseCapabilities;
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
      selectorValue: PLATFORMER_PROFILE_ID,
      universalTemplatePath: 'templates/phaser/universal-2d-action'
    },
    systems: packages
      .filter((contract) => allowedCapabilities.has(contract.manifest.id))
      .map((contract) => ({
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

function createRunAndGunRuntimeManifest(packages: readonly GameplayCapabilityPackageContract[]): PhaserRuntimeSystemManifest {
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
