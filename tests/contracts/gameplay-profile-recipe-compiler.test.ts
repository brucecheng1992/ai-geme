import { describe, expect, it } from 'vitest';

import {
  compileGameplayProfileRecipe,
  mergeGameplayProfileDefaults,
  type GameplayCapabilityPackageContract,
  type GameplayProfileRecipe,
  type PhaserRuntimeSystemManifest
} from '../../packages/game-dsl/src/index.js';

describe('Gameplay profile recipe compiler', () => {
  it('compiles deterministic profile artifacts from supported capability packages', () => {
    const first = compileGameplayProfileRecipe(createCompileInput());
    const second = compileGameplayProfileRecipe({
      ...createCompileInput(),
      packages: [...createPackages()].reverse()
    });

    expect(first.status).toBe('compiled');
    expect(first.support.supported).toBe(true);
    expect(first.artifacts?.resolvedCapabilityGraph.status).toBe('resolved');
    expect(first.artifacts?.gameplayCapabilityLock.capabilityIds).toEqual([
      'camera.side_follow.v1',
      'movement.run_jump.v1',
      'physics.gravity_platformer.v1'
    ]);
    expect(first.artifacts?.gameplayCapabilityLock.lockHash).toBe(second.artifacts?.gameplayCapabilityLock.lockHash);
    expect(first.artifacts?.capabilityIrCompilerPlan.planHash).toBe(second.artifacts?.capabilityIrCompilerPlan.planHash);
    expect(first.artifacts?.capabilityQaPlan.schemaVersion).toBe('capability_qa_plan.v0.2');
    expect(first.artifacts?.capabilityQaPlan.status).toBe('ready');
  });

  it('composes profile QA plan with profile scenarios, Step33 refs, and Step34 amendment refs', () => {
    const report = compileGameplayProfileRecipe({
      ...createCompileInput(),
      profileQaScenarios: [createProfileQaScenario()],
      step33RenderFidelityEvidenceRefs: ['render_fidelity_report.json'],
      step34AmendmentVerificationRefs: ['amendment_verification_report.json']
    });

    expect(report.status).toBe('compiled');
    expect(report.artifacts?.capabilityQaPlan.profileScenarioProbes.map((probe) => probe.id)).toEqual(['side_scrolling_run_and_gun.v1.qa.destroy_target']);
    expect(report.artifacts?.capabilityQaPlan.step33RenderFidelityEvidenceRefs).toEqual(['render_fidelity_report.json']);
    expect(report.artifacts?.capabilityQaPlan.step34AmendmentVerificationRefs).toEqual(['amendment_verification_report.json']);
  });

  it('blocks unsupported required capabilities before profile support can be forced', () => {
    const report = compileGameplayProfileRecipe({
      ...createCompileInput(),
      recipe: createRecipe({ requiredCapabilities: ['movement.run_jump.v1', 'combat.projectile.v1'] })
    });

    expect(report.status).toBe('blocked');
    expect(report.support.supported).toBe(false);
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'PROFILE_REQUIRED_CAPABILITY_MISSING', capabilityId: 'combat.projectile.v1' })]));
  });

  it('defers unsupported optional capabilities without adding them to the exact supported set', () => {
    const report = compileGameplayProfileRecipe({
      ...createCompileInput(),
      recipe: createRecipe({ optionalCapabilities: ['pickup.drop_collect.v1'] })
    });

    expect(report.status).toBe('compiled');
    expect(report.support.supported).toBe(true);
    expect(report.artifacts?.generationCapabilityContext.deferredCapabilities).toEqual(['pickup.drop_collect.v1']);
    expect(report.artifacts?.generationCapabilityContext.supportedCapabilities).not.toContain('pickup.drop_collect.v1');
    expect(report.artifacts?.generationCapabilityContext.prohibitedUnsupportedFallbacks).toEqual([
      'Do not synthesize unsupported fallback for pickup.drop_collect.v1.'
    ]);
  });

  it('does not let profile or capability defaults overwrite explicit user values', () => {
    const merged = mergeGameplayProfileDefaults({
      capabilityDefaults: { player: { moveSpeed: 180, jumpVelocity: 420 }, world: { gravityY: 900 } },
      profileDefaults: { player: { moveSpeed: 220, color: 'blue' } },
      acceptedAmendmentValues: { player: { moveSpeed: 260 } },
      userValues: { player: { moveSpeed: 300 } }
    });
    const report = compileGameplayProfileRecipe({
      ...createCompileInput(),
      recipe: createRecipe({ defaults: { player: { moveSpeed: 220, color: 'blue' } } }),
      acceptedAmendmentValues: { player: { moveSpeed: 260 } },
      userValues: { player: { moveSpeed: 300 } }
    });

    expect(merged).toEqual({ player: { moveSpeed: 300, jumpVelocity: 420, color: 'blue' }, world: { gravityY: 900 } });
    expect(report.artifacts?.generationCapabilityContext.defaults).toMatchObject({ player: { moveSpeed: 300, jumpVelocity: 420, color: 'blue' } });
  });

  it('keeps generation context capability-facing and hides runtime implementation details', () => {
    const report = compileGameplayProfileRecipe(createCompileInput());
    const context = report.artifacts?.generationCapabilityContext;

    expect(context?.supportedCapabilities).toEqual(['camera.side_follow.v1', 'movement.run_jump.v1', 'physics.gravity_platformer.v1']);
    expect(context?.supportedDslNodeKinds).toEqual(['component.camera.side_follow', 'component.movement.run_jump', 'component.physics.gravity_platformer']);
    expect(JSON.stringify(context)).not.toContain('templates/phaser');
    expect(JSON.stringify(context)).not.toContain('movement.run_jump.v1.system');
  });

  it('inherits 35.5 runtime loader fail-closed checks before deriving profile support', () => {
    const packages = createPackages();
    const legacyRuntime = compileGameplayProfileRecipe({
      ...createCompileInput(),
      runtimeManifest: {
        ...createRuntimeManifest(packages),
        compatibilityMode: {
          ...createRuntimeManifest(packages).compatibilityMode,
          selection: 'legacy_template',
          legacyTemplatePath: 'templates/phaser/side_scrolling_run_and_gun'
        }
      }
    });
    const templateDefault = compileGameplayProfileRecipe({
      ...createCompileInput(),
      runtimeManifest: {
        ...createRuntimeManifest(packages),
        systems: createRuntimeManifest(packages).systems.map((system) =>
          system.id === 'movement.run_jump.v1.system' ? { ...system, authoritativeConfig: 'template_default' } : system
        )
      }
    });

    expect(legacyRuntime.status).toBe('blocked');
    expect(legacyRuntime.support.runtimeManifestComplete).toBe(false);
    expect(legacyRuntime.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'PROFILE_RUNTIME_LOADER_INVALID' })]));
    expect(templateDefault.status).toBe('blocked');
    expect(templateDefault.support.runtimeManifestComplete).toBe(false);
    expect(templateDefault.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'PROFILE_RUNTIME_LOADER_INVALID' })]));
  });

  it('validates user and amendment default values as declarative JSON before merging', () => {
    const scriptValue = compileGameplayProfileRecipe({
      ...createCompileInput(),
      userValues: { player: { script: 'steal defaults' } }
    });
    const functionValue = compileGameplayProfileRecipe({
      ...createCompileInput(),
      acceptedAmendmentValues: { player: { moveSpeed: () => 999 } }
    });

    expect(scriptValue.status).toBe('blocked');
    expect(scriptValue.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'PROFILE_DEFAULTS_INVALID', path: 'userValues.player.script' })]));
    expect(functionValue.status).toBe('blocked');
    expect(functionValue.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'PROFILE_DEFAULTS_INVALID' })]));
  });

  it('derives profile support from reference acceptance instead of a manual support flag', () => {
    const report = compileGameplayProfileRecipe({
      ...createCompileInput(),
      referenceAcceptance: { passed: false }
    });
    const missingEvidence = compileGameplayProfileRecipe({
      ...createCompileInput(),
      referenceAcceptance: { passed: true, evidenceRefs: [] }
    });

    expect(report.status).toBe('blocked');
    expect(report.support).toMatchObject({
      graphResolved: true,
      allRequiredPackagesComplete: true,
      runtimeManifestComplete: true,
      qaPlanComplete: true,
      referenceAcceptancePassed: false,
      supported: false
    });
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'PROFILE_REFERENCE_ACCEPTANCE_MISSING' })]));
    expect(missingEvidence.status).toBe('blocked');
    expect(missingEvidence.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'PROFILE_REFERENCE_ACCEPTANCE_MISSING' })]));
  });
});

function createCompileInput() {
  const packages = createPackages();
  return {
    recipe: createRecipe(),
    packages,
    runtimeManifest: createRuntimeManifest(packages),
    referenceAcceptance: { passed: true, evidenceRefs: ['reference_acceptance_report.json'] }
  };
}

function createRecipe(input: Partial<GameplayProfileRecipe> = {}): GameplayProfileRecipe {
  return {
    contractVersion: 'gameplay-profile-recipe.v0.1',
    id: 'side_scrolling_run_and_gun.v1',
    runtimeFamily: 'phaser_2d_action_arcade.v1',
    requiredCapabilities: ['camera.side_follow.v1', 'movement.run_jump.v1', 'physics.gravity_platformer.v1'],
    optionalCapabilities: [],
    defaults: {},
    constraints: ['side-view 2d coordinate system'],
    acceptance: { requiredEvidence: ['reference_acceptance_report.json'] },
    ...input
  };
}

function createPackages(): GameplayCapabilityPackageContract[] {
  return [
    createPackageContract('camera.side_follow.v1', { defaults: { camera: { lerp: 0.18 } } }),
    createPackageContract('movement.run_jump.v1', {
      defaults: { player: { moveSpeed: 180, jumpVelocity: 420 } },
      dependencies: [{ capabilityId: 'physics.gravity_platformer.v1', range: '^v1' }]
    }),
    createPackageContract('physics.gravity_platformer.v1', { defaults: { world: { gravityY: 900 } } })
  ];
}

function createPackageContract(
  id: string,
  input: {
    defaults?: Record<string, unknown>;
    dependencies?: GameplayCapabilityPackageContract['dependencies'];
    status?: GameplayCapabilityPackageContract['manifest']['status'];
  } = {}
): GameplayCapabilityPackageContract {
  const ownedPath = `/entities/components/${id}`;
  return {
    manifest: {
      id,
      packageVersion: '1.0.0',
      capabilityVersion: 'v1',
      status: input.status ?? 'supported',
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
    dependencies: input.dependencies ?? [],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ id: `${id}.service`, version: 'v1' }],
    defaults: input.defaults ?? {},
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

function createProfileQaScenario() {
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
