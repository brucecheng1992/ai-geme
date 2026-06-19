import { describe, expect, it } from 'vitest';

import {
  buildLegacyVsComposedParityReport,
  buildRunAndGunCapabilityMigrationReport,
  RUN_AND_GUN_REFERENCE_CAPABILITY_IDS,
  RUN_AND_GUN_REQUIRED_AMENDMENT_SCENARIOS,
  RUN_AND_GUN_REQUIRED_CAPABILITY_ARTIFACTS,
  RUN_AND_GUN_REQUIRED_PARITY_GATES,
  type GameplayCapabilityPackageContract,
  type PhaserRuntimeSystemManifest,
  type RunAndGunAmendmentScenarioEvidence,
  type RunAndGunParityGateEvidence
} from '../../packages/game-dsl/src/index.js';

describe('Run-and-gun reference capability composition migration', () => {
  it('builds a ready reference composition report without selecting the genre-specific template', () => {
    const report = buildRunAndGunCapabilityMigrationReport(createMigrationInput());

    expect(report.status).toBe('ready');
    expect(report.strategy).toBe('dual_run_legacy_default_composed_flagged');
    expect(report.noGenreSpecificTemplateSelected).toBe(true);
    expect(report.runtimeManifestComplete).toBe(true);
    expect(report.gameplayQaPassed).toBe(true);
    expect(report.renderFidelityPassed).toBe(true);
    expect(report.amendmentLifecyclePassed).toBe(true);
    expect(report.profileCompilationReport.status).toBe('compiled');
    expect(report.profileCompilationReport.artifacts?.resolvedCapabilityGraph.status).toBe('resolved');
    expect(report.selectedCapabilityIds).toEqual([...RUN_AND_GUN_REFERENCE_CAPABILITY_IDS]);
  });

  it('blocks migration when the composed runtime manifest falls back to the legacy template', () => {
    const report = buildRunAndGunCapabilityMigrationReport({
      ...createMigrationInput(),
      runtimeManifest: {
        ...createRuntimeManifest(createPackages()),
        compatibilityMode: {
          ...createRuntimeManifest(createPackages()).compatibilityMode,
          selection: 'legacy_template',
          legacyTemplatePath: 'templates/phaser/side_scrolling_run_and_gun'
        }
      }
    });

    expect(report.status).toBe('blocked');
    expect(report.noGenreSpecificTemplateSelected).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining(['genre_specific_template_selected']));
  });

  it('blocks universal manifests that still carry a legacy template path', () => {
    const report = buildRunAndGunCapabilityMigrationReport({
      ...createMigrationInput(),
      runtimeManifest: {
        ...createRuntimeManifest(createPackages()),
        compatibilityMode: {
          ...createRuntimeManifest(createPackages()).compatibilityMode,
          legacyTemplatePath: 'phaser/side_scrolling_run_and_gun'
        }
      }
    });

    expect(report.status).toBe('blocked');
    expect(report.noGenreSpecificTemplateSelected).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining(['genre_specific_template_selected']));
  });

  it('fails parity when render fidelity evidence fails', () => {
    const report = buildRunAndGunCapabilityMigrationReport({
      ...createMigrationInput(),
      parityGates: createParityGates({ render_fidelity: 'failed' })
    });

    expect(report.status).toBe('blocked');
    expect(report.renderFidelityPassed).toBe(false);
    expect(report.parityReport.failedGateIds).toEqual(['render_fidelity']);
  });

  it('requires every Step34 amendment lifecycle scenario before migration is ready', () => {
    const report = buildRunAndGunCapabilityMigrationReport({
      ...createMigrationInput(),
      amendmentScenarios: createAmendmentScenarios().filter((scenario) => scenario.scenarioId !== 'accept_reject_undo')
    });

    expect(report.status).toBe('blocked');
    expect(report.amendmentLifecyclePassed).toBe(false);
    expect(report.parityReport.missingAmendmentScenarioIds).toEqual(['accept_reject_undo']);
  });

  it('requires capability artifact refs before migration can be marked ready', () => {
    const report = buildRunAndGunCapabilityMigrationReport({
      ...createMigrationInput(),
      artifactRefs: createArtifactRefs().filter((ref) => ref.artifactKind !== 'capability_qa_report')
    });

    expect(report.status).toBe('blocked');
    expect(report.artifactRefsComplete).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining(['capability_artifact_refs_incomplete']));
  });

  it('blocks migration when parity evidence refs are empty', () => {
    const report = buildRunAndGunCapabilityMigrationReport({
      ...createMigrationInput(),
      parityGates: createParityGates().map((gate) => (gate.gateId === 'runtime_events' ? { ...gate, legacyEvidenceRef: '' } : gate))
    });

    expect(report.status).toBe('blocked');
    expect(report.parityReport.invalidGateIds).toEqual(['runtime_events']);
  });

  it('blocks migration when amendment scenario evidence refs are empty', () => {
    const report = buildRunAndGunCapabilityMigrationReport({
      ...createMigrationInput(),
      amendmentScenarios: createAmendmentScenarios().map((scenario) => (scenario.scenarioId === 'accept_reject_undo' ? { ...scenario, evidenceRef: '' } : scenario))
    });

    expect(report.status).toBe('blocked');
    expect(report.parityReport.invalidAmendmentScenarioIds).toEqual(['accept_reject_undo']);
  });

  it('blocks migration when required artifact refs have empty paths', () => {
    const report = buildRunAndGunCapabilityMigrationReport({
      ...createMigrationInput(),
      artifactRefs: createArtifactRefs().map((ref) => (ref.artifactKind === 'capability_qa_report' ? { ...ref, path: '' } : ref))
    });

    expect(report.status).toBe('blocked');
    expect(report.invalidArtifactRefKinds).toEqual(['capability_qa_report']);
    expect(report.artifactRefsComplete).toBe(false);
  });

  it('keeps parity and migration reports deterministic', () => {
    const first = buildRunAndGunCapabilityMigrationReport(createMigrationInput());
    const second = buildRunAndGunCapabilityMigrationReport({
      ...createMigrationInput(),
      parityGates: [...createParityGates()].reverse(),
      amendmentScenarios: [...createAmendmentScenarios()].reverse(),
      artifactRefs: [...createArtifactRefs()].reverse()
    });
    const parity = buildLegacyVsComposedParityReport({
      gates: [...createParityGates()].reverse(),
      amendmentScenarios: [...createAmendmentScenarios()].reverse()
    });

    expect(first.reportHash).toBe(second.reportHash);
    expect(parity.status).toBe('passed');
  });
});

function createMigrationInput() {
  const packages = createPackages();
  return {
    packages,
    runtimeManifest: createRuntimeManifest(packages),
    referenceAcceptance: { passed: true, evidenceRefs: ['reference_acceptance_report.json'] },
    parityGates: createParityGates(),
    amendmentScenarios: createAmendmentScenarios(),
    artifactRefs: createArtifactRefs()
  };
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

function createPackages(): GameplayCapabilityPackageContract[] {
  return RUN_AND_GUN_REFERENCE_CAPABILITY_IDS.map((id) => createPackage(id));
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
