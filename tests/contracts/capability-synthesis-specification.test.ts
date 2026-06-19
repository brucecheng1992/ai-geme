import { describe, expect, it } from 'vitest';

import {
  CAPABILITY_SPECIFICATION_SCHEMA_VERSION,
  CAPABILITY_SPECIFICATION_CONTRACT_VERSION,
  CAPABILITY_SPECIFICATION_VALIDATION_ATTESTATION_KIND,
  CAPABILITY_SPECIFICATION_VALIDATION_ATTESTATION_SCHEMA_VERSION,
  CAPABILITY_SPECIFICATION_VALIDATION_CANONICALIZATION_VERSION,
  CAPABILITY_SPECIFICATION_VALIDATION_RULESET_HASH,
  CAPABILITY_SPECIFICATION_VALIDATOR_ID,
  GAMEPLAY_DESIGN_PLAN_SCHEMA_VERSION,
  buildCapabilityGapAnalysis,
  buildCapabilityGapRegistrySnapshot,
  buildCapabilitySpecificationCandidate,
  buildCapabilitySpecificationValidationAttestation,
  validateCapabilitySpecificationCandidate,
  validateGameplayDesignPlan,
  type CapabilityGapAnalysis,
  type CapabilityGapRegistryPackage,
  type CapabilitySpecificationCandidate,
  type GameplayDesignPlan,
  type GameplayDesignRequestContext,
  type MissingCapabilityPrimitive
} from '../../packages/game-dsl/src/index.js';

describe('Step36 capability specification synthesis contract', () => {
  it('validates an end-to-end ricochet specification and keeps hashes deterministic', () => {
    const context = createSpecContext();
    const spec = createValidSpecification(context);
    const first = validateCapabilitySpecificationCandidate({ candidate: spec, context });
    const second = validateCapabilitySpecificationCandidate({ candidate: structuredClone(spec), context });

    expect(first.status).toBe('valid');
    expect(first.issues).toEqual([]);
    expect(first.specificationHash).toBe(spec.specificationHash);
    expect(first.normalizedSpec?.explicitNonGoals).toEqual(['does not add new projectile asset roles', 'does not change fire cadence']);
    expect(first.reportHash).toBe(second.reportHash);
  });

  it('emits a deterministic trusted validation attestation bound to report, specification and attempt context', () => {
    const context = createSpecContext();
    const spec = createValidSpecification(context);
    const report = validateCapabilitySpecificationCandidate({ candidate: spec, context });
    const first = buildCapabilitySpecificationValidationAttestation({
      report,
      attemptId: 'capsyn_attempt_spec_validation_00000001',
      issuer: { serviceId: 'maker-api.capability-specification-validator', issuedAt: '2026-06-19T00:00:00.000Z' }
    });
    const second = buildCapabilitySpecificationValidationAttestation({
      report,
      attemptId: 'capsyn_attempt_spec_validation_00000001',
      issuer: { serviceId: 'maker-api.capability-specification-validator', issuedAt: '2026-06-19T00:00:00.000Z' }
    });

    expect(first.artifactKind).toBe(CAPABILITY_SPECIFICATION_VALIDATION_ATTESTATION_KIND);
    expect(first.schemaVersion).toBe(CAPABILITY_SPECIFICATION_VALIDATION_ATTESTATION_SCHEMA_VERSION);
    expect(first.attestationHash).toBe(second.attestationHash);
    expect(first.subject).toMatchObject({
      requestId: context.requestContext.requestId,
      attemptId: 'capsyn_attempt_spec_validation_00000001',
      canonicalSpecificationHash: spec.specificationHash,
      registrySnapshotHash: context.gapAnalysis.registrySnapshotHash
    });
    expect(first.predicate).toMatchObject({
      validationReportHash: report.reportHash,
      validationStatus: 'PASSED',
      validatorId: CAPABILITY_SPECIFICATION_VALIDATOR_ID,
      validationRulesetHash: CAPABILITY_SPECIFICATION_VALIDATION_RULESET_HASH,
      canonicalizationVersion: CAPABILITY_SPECIFICATION_VALIDATION_CANONICALIZATION_VERSION
    });
    expect(first.issuer.serviceId).toBe('maker-api.capability-specification-validator');
  });

  it('does not allow specification synthesis from a non-gap outcome', () => {
    const context = createSpecContext();
    const blockedContext = {
      ...context,
      gapAnalysis: {
        ...context.gapAnalysis,
        outcome: 'NO_NEW_CAPABILITY_REQUIRED' as const
      }
    };
    const report = validateCapabilitySpecificationCandidate({
      candidate: createValidSpecification(context),
      context: blockedContext
    });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_OUTCOME_INVALID' })]));
  });

  it('rejects missing package sections and forbidden authority fields', () => {
    const context = createSpecContext();
    const { runtime: _runtime, ...withoutRuntime } = createValidSpecification(context);
    const report = validateCapabilitySpecificationCandidate({
      candidate: {
        ...withoutRuntime,
        sourceCode: 'export function install() {}',
        shellCommand: 'npm install left-pad',
        approvalStatus: 'approved'
      },
      context
    });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_REQUIRED_FIELD_MISSING', path: 'runtime' })]));
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_FORBIDDEN_FIELD' })]));
  });

  it('fails closed instead of throwing on malformed nested sections', () => {
    const context = createSpecContext();
    const report = validateCapabilitySpecificationCandidate({
      candidate: {
        ...createValidSpecification(context),
        runtime: { patchPolicy: 'warm' },
        qa: { requiredProbes: [{}] },
        acceptanceScenarios: [{}],
        security: { requiredPrivileges: 'network' }
      },
      context
    });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_REQUIRED_FIELD_MISSING', path: 'runtime' })]));
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_QA_INSUFFICIENT' })]));
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_REQUIRED_FIELD_MISSING', path: 'security' })]));
  });

  it('rejects invalid profile, engine, template, or marketing capability ids', () => {
    const context = createSpecContext();
    const spec = buildCapabilitySpecificationCandidate({
      ...specPayload(context),
      proposedCapabilityId: 'phaser.magic_script.v1'
    });
    const report = validateCapabilitySpecificationCandidate({ candidate: spec, context });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_ID_FORBIDDEN_TERM' })]));
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_PRIMITIVE_MISMATCH' })]));
  });

  it('rejects specs that are not bound to the selected missing primitive', () => {
    const context = createSpecContext();
    const spec = buildCapabilitySpecificationCandidate({
      ...specPayload(context),
      proposedCapabilityId: 'combat.wall_bounce.v1',
      semanticContract: 'wall bounce'
    });
    const report = validateCapabilitySpecificationCandidate({ candidate: spec, context });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_PRIMITIVE_MISMATCH' })]));
  });

  it('rejects selected primitive drift from the source gap report', () => {
    const context = createSpecContext();
    const driftedContext = {
      ...context,
      selectedPrimitive: {
        ...context.selectedPrimitive,
        ownedDslPaths: ['/entities/components/overbroad_ricochet'],
        providedInterfaces: ['OverbroadInterface.v1']
      }
    };
    const report = validateCapabilitySpecificationCandidate({
      candidate: createValidSpecification(context),
      context: driftedContext
    });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_PRIMITIVE_MISMATCH', path: 'selectedPrimitive' })]));
  });

  it('rejects ownership overlap and owned paths outside the missing primitive boundary', () => {
    const context = createSpecContext();
    const spec = buildCapabilitySpecificationCandidate({
      ...specPayload(context),
      dsl: {
        ...specPayload(context).dsl,
        ownedPaths: ['/entities/components/projectile']
      }
    });
    const report = validateCapabilitySpecificationCandidate({
      candidate: spec,
      context: {
        ...context,
        existingOwnedDslPaths: ['/entities/components/projectile']
      }
    });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_OWNERSHIP_OVERLAP' })]));
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_OWNED_PATH_OUTSIDE_DOMAIN' })]));
  });

  it('rejects ownership expansion beyond the selected missing primitive', () => {
    const context = createSpecContext();
    const spec = buildCapabilitySpecificationCandidate({
      ...specPayload(context),
      dsl: {
        ...specPayload(context).dsl,
        ownedPaths: [...context.selectedPrimitive.ownedDslPaths, '/entities/components/projectile_ricochet_extra']
      },
      ir: {
        ...specPayload(context).ir,
        ownedNodeKinds: [...context.selectedPrimitive.ownedIrNodeKinds, 'component.projectile.extra']
      }
    });
    const report = validateCapabilitySpecificationCandidate({ candidate: spec, context });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_OWNERSHIP_OVERLAP', path: 'dsl.ownedPaths' })]));
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_OWNERSHIP_OVERLAP', path: 'ir.ownedNodeKinds' })]));
  });

  it('rejects dependency cycles and dependencies that do not provide the required interface', () => {
    const context = createSpecContext();
    const spec = buildCapabilitySpecificationCandidate({
      ...specPayload(context),
      dependencies: [
        {
          capabilityId: context.selectedPrimitive.proposedId,
          versionRange: '^1.0.0',
          requiredInterface: 'ProjectileLifecycle.v1',
          reason: 'Invalid self dependency.'
        },
        {
          capabilityId: 'combat.projectile.v1',
          versionRange: '^1.0.0',
          requiredInterface: 'MissingInterface.v1',
          reason: 'Invalid interface.'
        }
      ]
    });
    const report = validateCapabilitySpecificationCandidate({ candidate: spec, context });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_DEPENDENCY_CYCLE' })]));
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_DEPENDENCY_INTERFACE_MISSING' })]));
  });

  it('rejects unknown runtime services and missing performance budgets', () => {
    const context = createSpecContext();
    const spec = buildCapabilitySpecificationCandidate({
      ...specPayload(context),
      runtime: {
        ...specPayload(context).runtime,
        requiredServices: ['network.fetch']
      },
      budgets: {}
    });
    const report = validateCapabilitySpecificationCandidate({ candidate: spec, context });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_RUNTIME_SERVICE_UNKNOWN' })]));
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_PERFORMANCE_BUDGET_MISSING' })]));
  });

  it('fails closed instead of throwing on malformed dependency, provides, DSL, and IR sections', () => {
    const context = createSpecContext();
    const report = validateCapabilitySpecificationCandidate({
      candidate: {
        ...createValidSpecification(context),
        dependencies: { capabilityId: 'combat.projectile.v1' },
        optionalDependencies: {},
        provides: {},
        dsl: { ownedPaths: {} },
        ir: { ownedNodeKinds: {} }
      },
      context
    });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_ARRAY_INVALID', path: 'dependencies' })]));
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_ARRAY_INVALID', path: 'provides' })]));
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_OWNED_PATH_OUTSIDE_DOMAIN', path: 'dsl.ownedPaths' })]));
  });

  it('rejects QA-free specs and missing negative assertions for state-changing behavior', () => {
    const context = createSpecContext();
    const spec = buildCapabilitySpecificationCandidate({
      ...specPayload(context),
      qa: {
        ...specPayload(context).qa,
        requiredProbes: []
      },
      acceptanceScenarios: [
        {
          ...specPayload(context).acceptanceScenarios[0],
          negativeAssertions: []
        }
      ]
    });
    const report = validateCapabilitySpecificationCandidate({ candidate: spec, context });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_QA_INSUFFICIENT' })]));
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_NEGATIVE_ASSERTION_MISSING' })]));
  });

  it('rejects visual specs without render and Step33 evidence contract', () => {
    const context = createSpecContext({ semanticName: 'visual projectile ricochet feedback' });
    const { render: _render, ...withoutRender } = specPayload(context);
    const spec = buildCapabilitySpecificationCandidate(withoutRender);
    const report = validateCapabilitySpecificationCandidate({ candidate: spec, context });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_RENDER_CONTRACT_MISSING' })]));
  });

  it('rejects hot patch specs without reversible state and teardown', () => {
    const context = createSpecContext();
    const spec = buildCapabilitySpecificationCandidate({
      ...specPayload(context),
      runtime: {
        ...specPayload(context).runtime,
        patchPolicy: 'hot',
        stateModel: { reversible: false },
        teardownRequirements: []
      }
    });
    const report = validateCapabilitySpecificationCandidate({ candidate: spec, context });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_PATCH_POLICY_INVALID' })]));
  });

  it('rejects specs that request forbidden privileges or omit explicit forbidden privileges', () => {
    const context = createSpecContext();
    const spec = buildCapabilitySpecificationCandidate({
      ...specPayload(context),
      security: {
        requiredPrivileges: ['network'],
        forbiddenPrivileges: ['network'],
        dataAccess: ['candidate_spec_only']
      }
    });
    const report = validateCapabilitySpecificationCandidate({ candidate: spec, context });

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CAPABILITY_SPEC_SECURITY_PRIVILEGE_INVALID' })]));
  });
});

const contextRuntimeFamily = 'phaser_2d_action_arcade.v1';

function createSpecContext(input: { semanticName?: string } = {}) {
  const requestContext = createDesignContext(input.semanticName);
  const designReport = createDesignReport(requestContext, input.semanticName);
  const gapAnalysis = buildCapabilityGapAnalysis({
    designReport,
    requestContext,
    registrySnapshot: buildCapabilityGapRegistrySnapshot([]),
    runtimeFamily: contextRuntimeFamily,
    activeCapabilityLockHash: 'fnv1a_lock',
    expectedReuseProfiles: ['run_and_gun.v1', 'shooter.v1'],
    proposedOwnedDslPaths: ['/entities/components/projectile_ricochet']
  });
  if (gapAnalysis.outcome !== 'NEW_BOUNDED_CAPABILITY_REQUIRED' || gapAnalysis.missingPrimitives[0] === undefined) {
    throw new Error(`Expected missing primitive gap in fixture, got ${gapAnalysis.outcome}`);
  }
  return {
    gapAnalysis,
    requestContext,
    selectedPrimitive: gapAnalysis.missingPrimitives[0],
    existingOwnedDslPaths: ['/entities/components/projectile'],
    dependencyInterfaces: [{ capabilityId: 'combat.projectile.v1', interfaces: ['ProjectileLifecycle.v1'] }],
    allowedRuntimeServices: ['physics.arcade_collision', 'combat.damage_pipeline']
  };
}

function createValidSpecification(context: ReturnType<typeof createSpecContext>): CapabilitySpecificationCandidate {
  return buildCapabilitySpecificationCandidate(specPayload(context));
}

function specPayload(context: ReturnType<typeof createSpecContext>): Omit<CapabilitySpecificationCandidate, 'specificationHash'> {
  const primitive = context.selectedPrimitive;
  return {
    schemaVersion: CAPABILITY_SPECIFICATION_SCHEMA_VERSION,
    specificationId: `spec_${primitive.proposedId.replaceAll('.', '_')}`,
    requestId: context.requestContext.requestId,
    sourceGapReportHash: context.gapAnalysis.reportHash,
    registrySnapshotHash: context.gapAnalysis.registrySnapshotHash,
    activeCapabilityLockHash: context.gapAnalysis.activeCapabilityLockHash,
    proposedCapabilityId: primitive.proposedId,
    proposedPackageVersion: '1.0.0',
    capabilityContractVersion: CAPABILITY_SPECIFICATION_CONTRACT_VERSION,
    title: 'Projectile Ricochet',
    description: 'Adds bounded projectile ricochet with deterministic damage falloff.',
    semanticContract: primitive.semanticContract,
    explicitNonGoals: ['does not change fire cadence', 'does not add new projectile asset roles'],
    runtimeFamilies: [contextRuntimeFamily],
    dependencies: [
      {
        capabilityId: 'combat.projectile.v1',
        versionRange: '^1.0.0',
        requiredInterface: 'ProjectileLifecycle.v1',
        reason: 'Ricochet augments existing projectile instances.'
      }
    ],
    optionalDependencies: [],
    conflictsWith: [],
    provides: [{ interfaceId: primitive.providedInterfaces[0] ?? 'ProjectileRicochet.v1', description: 'Bounded ricochet behavior for projectile entities.' }],
    dsl: {
      ownedPaths: primitive.ownedDslPaths,
      schema: { type: 'object', required: ['maxBounces', 'damageFalloff'] },
      defaults: { maxBounces: 2, damageFalloff: 0.25 },
      normalizationRules: ['maxBounces must be clamped to 0..5', 'damageFalloff must be normalized to ratio'],
      validationRules: [{ ruleId: 'ricochet_bounds', path: primitive.ownedDslPaths[0] ?? '/entities/components/projectile_ricochet', assertion: 'maxBounces <= 5' }],
      examples: [{ maxBounces: 2, damageFalloff: 0.25 }]
    },
    ir: {
      ownedNodeKinds: primitive.ownedIrNodeKinds,
      fragmentContract: { component: 'projectile.ricochet' },
      compileRules: ['compile projectile ricochet component into runtime system config'],
      mergePolicy: ['append runtime system config without overriding projectile lifecycle owner']
    },
    runtime: {
      requiredServices: ['physics.arcade_collision', 'combat.damage_pipeline'],
      lifecycle: ['create', 'update', 'teardown'],
      stateModel: { reversible: true, keys: ['bounceCount', 'currentDamage'] },
      deterministicRules: ['reflect velocity on wall collision', 'decrease damage after each bounce'],
      patchPolicy: 'warm',
      teardownRequirements: ['remove projectile collision listener'],
      ownedStateKeys: ['projectile.ricochet.bounceCount'],
      ownedEvents: ['projectile.ricochet']
    },
    amendments: {
      supportedOperations: ['set_ricochet_count', 'set_damage_falloff'],
      patchPolicy: 'warm',
      expectedEffects: ['projectile trajectory reflects after wall collision']
    },
    qa: {
      requiredProbes: [scenario('ricochet_twice')],
      externalAssertions: ['no third ricochet event after max bounce count'],
      mutationTargets: ['maxBounces', 'damageFalloff'],
      failureScenarios: ['projectile bounces more than configured max']
    },
    render: {
      assetRoles: [],
      sceneBindings: [],
      fallbackPolicy: 'not_applicable',
      renderEvidence: ['step33_render_fidelity_required']
    },
    security: {
      requiredPrivileges: [],
      forbiddenPrivileges: ['filesystem', 'network', 'package_manager', 'secrets', 'shell'],
      dataAccess: ['candidate_spec_only']
    },
    budgets: {
      maxRuntimeMsPerFrame: 0.4,
      maxTelemetryEventsPerSecond: 20
    },
    acceptanceScenarios: [scenario('ricochet_twice')],
    provenance: {
      provider: 'fixture',
      model: 'fixture',
      invocationId: 'spec_invocation_ricochet',
      promptVersion: 'step36.capability-specification.prompt.v1'
    }
  };
}

function scenario(id: string) {
  return {
    scenarioId: id,
    probeId: id,
    given: ['projectile is moving toward a wall'],
    when: 'projectile collides with wall',
    actions: ['spawn projectile', 'advance physics until wall collision'],
    observations: ['projectile emits projectile.ricochet event', 'projectile velocity reflects'],
    assertions: ['ricochet count is at most 2', 'damage falls by 25 percent after bounce'],
    negativeAssertions: ['projectile does not ricochet a third time'],
    tolerance: 'one physics tick',
    requiredEvidenceSource: 'capability_qa_report'
  };
}

function createDesignContext(semanticName = 'projectile ricochet'): GameplayDesignRequestContext {
  return {
    requestId: 'capsyn_req_spec_12345678',
    origin: 'step34_amendment',
    sourceText: `让子弹碰到墙后最多反弹两次，每次反弹后伤害降低 25%。${semanticName}`,
    selectedTargets: [{ kind: 'projectile', ref: 'player.projectile' }]
  };
}

function createDesignReport(context: GameplayDesignRequestContext, semanticName = 'projectile ricochet') {
  const report = validateGameplayDesignPlan(createDesignPlan(context.requestId, semanticName), context);
  if (report.status !== 'valid') {
    throw new Error(`Expected valid design report in test fixture: ${report.issues.map((issue) => issue.message).join(', ')}`);
  }
  return report;
}

function createDesignPlan(requestId: string, semanticName: string): GameplayDesignPlan {
  return {
    schemaVersion: GAMEPLAY_DESIGN_PLAN_SCHEMA_VERSION,
    requestId,
    summary: 'Projectiles should ricochet from walls twice with lower damage after each bounce.',
    playerFantasy: 'The player can bank shots around corners.',
    coreLoop: ['shoot', 'bounce', 'hit enemy'],
    playerVerbs: ['shoot', 'aim'],
    challengeSources: ['wall angle'],
    successConditions: ['projectile bounces twice at most'],
    failureConditions: ['projectile bounces more than twice'],
    feedbackRequirements: ['bounce spark'],
    proposedMechanics: [
      {
        mechanicId: '',
        description: 'Projectile ricochet with bounded bounce count and damage falloff.',
        actors: ['projectile', 'wall', 'enemy'],
        trigger: 'projectile collides with wall',
        stateChanges: ['increment bounce count', 'reduce damage by 25%'],
        constraints: ['preserve fire cadence'],
        expectedEffects: [
          {
            subject: 'projectile',
            observableChange: 'trajectory reflects',
            measurement: 'projectile.ricochet event count',
            assertion: 'count <= 2'
          }
        ],
        balanceParameters: ['max bounces = 2', 'damage reduction = 25%'],
        existingMechanicInteractions: ['uses existing projectile collision']
      }
    ],
    preservedConstraints: ['保持射速不变'],
    acceptanceScenarios: [
      {
        scenarioId: 'ricochet_twice',
        action: 'Shoot a wall twice',
        observation: 'Projectile emits ricochet events',
        assertion: 'Exactly two ricochet events occur'
      }
    ],
    proposedCapabilityRequirements: [
      {
        semanticName,
        requiredInterfaces: ['ProjectileRicochet.v1'],
        requiredEvents: ['projectile.ricochet'],
        requiredRuntimeServices: ['physics.arcade_collision'],
        suggestedCapabilityIds: ['combat.projectile_ricochet.v1', 'combat.projectile.v1'],
        reason: 'Need bounded wall reflection for projectile instances.',
        proposed: true
      }
    ],
    modelProvenance: {
      provider: 'fixture',
      model: 'fixture',
      invocationId: 'invocation_ricochet',
      promptVersion: 'step36.gameplay-design.prompt.v1'
    }
  };
}

function ricochetPackage(overrides: Partial<CapabilityGapRegistryPackage> = {}): CapabilityGapRegistryPackage {
  return {
    capabilityId: 'combat.projectile_ricochet.v1',
    packageVersion: '1.0.0',
    contentHash: 'fnv1a_ricochet',
    aliases: ['combat.projectile_bounce.v1'],
    description: 'Projectile ricochet with bounded bounce count and damage falloff.',
    semanticTags: ['projectile ricochet', 'wall bounce'],
    runtimeFamilies: [contextRuntimeFamily],
    providedInterfaces: ['ProjectileRicochet.v1'],
    requiredRuntimeServices: ['physics.arcade_collision'],
    emittedEvents: ['projectile.ricochet'],
    consumedEvents: ['projectile.wall_collision'],
    ownedDslPaths: ['/entities/components/projectile'],
    ownedIrNodeKinds: ['component.projectile.ricochet'],
    amendmentOperations: ['set_ricochet_count'],
    profiles: ['run_and_gun.v1', 'shooter.v1'],
    dependencies: [],
    completeness: 'COMPLETE_SUPPORTED',
    qaAvailable: true,
    configurationOptions: [],
    declarativeRuleKinds: [],
    ...overrides
  };
}
