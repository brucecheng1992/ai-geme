import { describe, expect, it } from 'vitest';

import {
  GAMEPLAY_DESIGN_PLAN_SCHEMA_VERSION,
  buildCapabilityGapAnalysis,
  buildCapabilityGapRegistrySnapshot,
  validateGameplayDesignPlan,
  type CapabilityGapRegistryPackage,
  type GameplayDesignPlan,
  type GameplayDesignRequestContext
} from '../../packages/game-dsl/src/index.js';

describe('Step36 reuse-first capability gap analysis contract', () => {
  it('uses an exact complete package and avoids synthesis', () => {
    const context = createDesignContext();
    const designReport = createDesignReport(context);
    const snapshot = buildCapabilityGapRegistrySnapshot([
      ricochetPackage(),
      projectilePackage({ dependencies: ['physics.arcade_projectile.v1'] }),
      physicsProjectilePackage()
    ]);
    const report = buildCapabilityGapAnalysis({
      designReport,
      requestContext: context,
      registrySnapshot: snapshot,
      runtimeFamily: contextRuntimeFamily,
      activeCapabilityLockHash: 'fnv1a_lock',
      expectedReuseProfiles: ['run_and_gun.v1', 'shooter.v1']
    });

    expect(report.schemaVersion).toBe('step36.capability-gap-analysis.v1');
    expect(report.requestId).toBe(context.requestId);
    expect(report.registrySnapshotHash).toBe(snapshot.snapshotHash);
    expect(report.activeCapabilityLockHash).toBe('fnv1a_lock');
    expect(report.outcome).toBe('NO_NEW_CAPABILITY_REQUIRED');
    expect(report.compositionPlan.strategy).toBe('EXACT_PACKAGE');
    expect(report.reuseMatches[0]).toMatchObject({
      candidateCapabilityId: 'combat.projectile_ricochet.v1',
      matchKind: 'EXACT',
      coverage: 1,
      contentHash: 'fnv1a_ricochet'
    });
    expect(report.compositionPlan.dependencyGraph).toEqual([
      {
        capabilityId: 'combat.projectile_ricochet.v1',
        dependencies: ['combat.projectile.v1', 'physics.arcade_projectile.v1']
      }
    ]);
    expect(report.missingPrimitives).toEqual([]);
  });

  it('uses deterministic package composition before proposing a new primitive', () => {
    const context = createDesignContext();
    const designReport = createDesignReport(context, {
      proposedCapabilityRequirements: [
        {
          semanticName: 'projectile ricochet',
          requiredInterfaces: ['ProjectileRicochet.v1'],
          requiredEvents: ['projectile.ricochet'],
          requiredRuntimeServices: ['physics.arcade_collision'],
          suggestedCapabilityIds: ['combat.projectile_ricochet.v1'],
          reason: 'Need bounded wall reflection for projectile instances.',
          proposed: true
        },
        {
          semanticName: 'damage falloff',
          requiredInterfaces: ['DamageFalloff.v1'],
          requiredEvents: ['damage.falloff_applied'],
          requiredRuntimeServices: ['combat.damage_pipeline'],
          suggestedCapabilityIds: ['combat.damage_falloff.v1'],
          reason: 'Need deterministic damage reduction after each bounce.',
          proposed: true
        }
      ]
    });
    const report = buildCapabilityGapAnalysis({
      designReport,
      requestContext: context,
      registrySnapshot: buildCapabilityGapRegistrySnapshot([
        damageFalloffPackage(),
        declarativeRicochetPackage(),
        ricochetPackage(),
        projectilePackage()
      ]),
      runtimeFamily: contextRuntimeFamily,
      expectedReuseProfiles: ['run_and_gun.v1', 'shooter.v1']
    });

    expect(report.outcome).toBe('NO_NEW_CAPABILITY_REQUIRED');
    expect(report.compositionPlan.strategy).toBe('COMPOSITION');
    expect(report.compositionPlan.selectedCapabilityIds).toEqual(expect.arrayContaining(['combat.projectile_ricochet.v1', 'combat.damage_falloff.v1']));
    expect(report.compositionPlan.selectedCapabilityIds).not.toContain('rules.event_condition_action.v1');
    expect(report.missingPrimitives).toEqual([]);
  });

  it('does not treat one package as exact when another requirement remains uncovered', () => {
    const context = createDesignContext();
    const designReport = createDesignReport(context, {
      proposedCapabilityRequirements: [
        {
          semanticName: 'projectile ricochet',
          requiredInterfaces: ['ProjectileRicochet.v1'],
          requiredEvents: ['projectile.ricochet'],
          requiredRuntimeServices: ['physics.arcade_collision'],
          suggestedCapabilityIds: ['combat.projectile_ricochet.v1'],
          reason: 'Need bounded wall reflection for projectile instances.',
          proposed: true
        },
        {
          semanticName: 'shield recharge',
          requiredInterfaces: ['ShieldRecharge.v1'],
          requiredEvents: ['shield.recharged'],
          requiredRuntimeServices: ['health.shield_pipeline'],
          suggestedCapabilityIds: ['health.shield_recharge.v1'],
          reason: 'Need timed shield recovery after avoiding hits.',
          proposed: true
        }
      ]
    });
    const report = buildCapabilityGapAnalysis({
      designReport,
      requestContext: context,
      registrySnapshot: buildCapabilityGapRegistrySnapshot([ricochetPackage(), projectilePackage()]),
      runtimeFamily: contextRuntimeFamily,
      expectedReuseProfiles: ['run_and_gun.v1', 'shooter.v1']
    });
    const ricochetMatch = report.reuseMatches.find((match) => match.candidateCapabilityId === 'combat.projectile_ricochet.v1');

    expect(report.outcome).toBe('NEW_BOUNDED_CAPABILITY_REQUIRED');
    expect(report.compositionPlan.strategy).toBe('NONE');
    expect(ricochetMatch).toMatchObject({
      coverage: 0.5,
      coveredRequirements: ['projectile ricochet'],
      uncoveredRequirements: ['shield recharge']
    });
    expect(ricochetMatch?.matchKind).not.toBe('EXACT');
  });

  it('does not select partial configuration or declarative matches as full reuse', () => {
    const context = createDesignContext();
    const designReport = createDesignReport(context, {
      proposedCapabilityRequirements: [
        {
          semanticName: 'projectile ricochet',
          requiredInterfaces: ['ProjectileRicochet.v1'],
          requiredEvents: ['projectile.ricochet'],
          requiredRuntimeServices: ['physics.arcade_collision'],
          suggestedCapabilityIds: ['combat.projectile_ricochet.v1'],
          reason: 'Need bounded wall reflection for projectile instances.',
          proposed: true
        },
        {
          semanticName: 'shield recharge',
          requiredInterfaces: ['ShieldRecharge.v1'],
          requiredEvents: [],
          requiredRuntimeServices: ['health.shield_pipeline'],
          suggestedCapabilityIds: ['health.shield_recharge.v1'],
          reason: 'Need timed shield recovery after avoiding hits.',
          proposed: true
        }
      ]
    });
    const partialConfig = buildCapabilityGapAnalysis({
      designReport,
      requestContext: context,
      registrySnapshot: buildCapabilityGapRegistrySnapshot([
        ricochetPackage({
          capabilityId: 'combat.projectile.v1',
          description: 'Projectile lifecycle package.',
          semanticTags: ['projectile'],
          configurationOptions: ['projectile ricochet'],
          providedInterfaces: [],
          emittedEvents: [],
          requiredRuntimeServices: [],
          dependencies: []
        })
      ]),
      runtimeFamily: contextRuntimeFamily,
      expectedReuseProfiles: ['run_and_gun.v1', 'shooter.v1']
    });
    const partialDeclarative = buildCapabilityGapAnalysis({
      designReport,
      requestContext: context,
      registrySnapshot: buildCapabilityGapRegistrySnapshot([declarativeRicochetPackage()]),
      runtimeFamily: contextRuntimeFamily,
      expectedReuseProfiles: ['run_and_gun.v1', 'shooter.v1']
    });

    expect(partialConfig.outcome).toBe('NEW_BOUNDED_CAPABILITY_REQUIRED');
    expect(partialConfig.compositionPlan.strategy).toBe('NONE');
    expect(partialConfig.reuseMatches[0]).toMatchObject({ matchKind: 'CONFIGURATION_ONLY', coverage: 0.5 });
    expect(partialDeclarative.outcome).toBe('NEW_BOUNDED_CAPABILITY_REQUIRED');
    expect(partialDeclarative.compositionPlan.strategy).toBe('NONE');
    expect(partialDeclarative.reuseMatches[0]).toMatchObject({ matchKind: 'DECLARATIVE_RULE', coverage: 0.5 });
  });

  it('rejects exact-looking packages when required dependencies are missing from the snapshot', () => {
    const context = createDesignContext();
    const report = buildCapabilityGapAnalysis({
      designReport: createDesignReport(context),
      requestContext: context,
      registrySnapshot: buildCapabilityGapRegistrySnapshot([ricochetPackage({ dependencies: ['combat.projectile.v1'] })]),
      runtimeFamily: contextRuntimeFamily,
      expectedReuseProfiles: ['run_and_gun.v1', 'shooter.v1']
    });

    expect(report.outcome).toBe('NEW_BOUNDED_CAPABILITY_REQUIRED');
    expect(report.compositionPlan.strategy).toBe('NONE');
    expect(report.rejectedAlternatives).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          candidateCapabilityId: 'combat.projectile_ricochet.v1',
          reason: 'DEPENDENCY_UNRESOLVED'
        })
      ])
    );
    expect(report.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'DEPENDENCY_UNRESOLVED', severity: 'warning' })]));
  });

  it('rejects exact-looking packages when transitive dependencies are missing from the snapshot', () => {
    const context = createDesignContext();
    const report = buildCapabilityGapAnalysis({
      designReport: createDesignReport(context),
      requestContext: context,
      registrySnapshot: buildCapabilityGapRegistrySnapshot([
        ricochetPackage(),
        projectilePackage({ dependencies: ['physics.arcade_projectile.v1'] })
      ]),
      runtimeFamily: contextRuntimeFamily,
      expectedReuseProfiles: ['run_and_gun.v1', 'shooter.v1']
    });

    expect(report.outcome).toBe('NEW_BOUNDED_CAPABILITY_REQUIRED');
    expect(report.compositionPlan.strategy).toBe('NONE');
    expect(report.rejectedAlternatives).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          candidateCapabilityId: 'combat.projectile_ricochet.v1',
          reason: 'DEPENDENCY_UNRESOLVED'
        })
      ])
    );
    expect(report.reuseMatches.find((match) => match.candidateCapabilityId === 'combat.projectile_ricochet.v1')?.evidence).toEqual(
      expect.arrayContaining([expect.stringContaining('physics.arcade_projectile.v1')])
    );
  });

  it('blocks configuration and declarative reuse when dependencies are unresolved', () => {
    const context = createDesignContext();
    const configReport = buildCapabilityGapAnalysis({
      designReport: createDesignReport(context),
      requestContext: context,
      registrySnapshot: buildCapabilityGapRegistrySnapshot([
        ricochetPackage({
          capabilityId: 'combat.projectile.v1',
          configurationOptions: ['projectile ricochet'],
          providedInterfaces: [],
          emittedEvents: [],
          requiredRuntimeServices: [],
          dependencies: ['combat.projectile_base.v1']
        })
      ]),
      runtimeFamily: contextRuntimeFamily,
      expectedReuseProfiles: ['run_and_gun.v1', 'shooter.v1']
    });
    const declarativeReport = buildCapabilityGapAnalysis({
      designReport: createDesignReport(context),
      requestContext: context,
      registrySnapshot: buildCapabilityGapRegistrySnapshot([
        declarativeRicochetPackage({ dependencies: ['rules.behavior_graph.v1'] })
      ]),
      runtimeFamily: contextRuntimeFamily,
      expectedReuseProfiles: ['run_and_gun.v1', 'shooter.v1']
    });

    expect(configReport.outcome).toBe('NEW_BOUNDED_CAPABILITY_REQUIRED');
    expect(configReport.compositionPlan.strategy).toBe('NONE');
    expect(configReport.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'DEPENDENCY_UNRESOLVED' })]));
    expect(declarativeReport.outcome).toBe('NEW_BOUNDED_CAPABILITY_REQUIRED');
    expect(declarativeReport.compositionPlan.strategy).toBe('NONE');
    expect(declarativeReport.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'DEPENDENCY_UNRESOLVED' })]));
  });

  it('records planned successors and deprecated packages as duplicate alternatives', () => {
    const context = createDesignContext();
    const report = buildCapabilityGapAnalysis({
      designReport: createDesignReport(context),
      requestContext: context,
      registrySnapshot: buildCapabilityGapRegistrySnapshot([
        ricochetPackage({
          plannedSuccessorId: 'combat.projectile_ricochet.v2',
          dependencies: []
        })
      ]),
      runtimeFamily: contextRuntimeFamily,
      expectedReuseProfiles: ['run_and_gun.v1', 'shooter.v1']
    });

    expect(report.rejectedAlternatives).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          candidateCapabilityId: 'combat.projectile_ricochet.v1',
          reason: 'DUPLICATE_PACKAGE_PROPOSAL'
        })
      ])
    );
    expect(report.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'DUPLICATE_SEMANTIC_ALIAS', severity: 'error' })]));
  });

  it('does not count schema-only or incomplete packages as reusable supported capability', () => {
    const context = createDesignContext();
    const report = buildCapabilityGapAnalysis({
      designReport: createDesignReport(context),
      requestContext: context,
      registrySnapshot: buildCapabilityGapRegistrySnapshot([ricochetPackage({ completeness: 'SCHEMA_ONLY', qaAvailable: false })]),
      runtimeFamily: contextRuntimeFamily,
      expectedReuseProfiles: ['run_and_gun.v1', 'shooter.v1']
    });

    expect(report.outcome).toBe('NEW_BOUNDED_CAPABILITY_REQUIRED');
    expect(report.rejectedAlternatives).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          candidateCapabilityId: 'combat.projectile_ricochet.v1',
          reason: 'INCOMPLETE_PACKAGE'
        })
      ])
    );
    expect(report.missingPrimitives[0]).toMatchObject({
      proposedId: 'combat.projectile_ricochet.v1',
      semanticContract: 'projectile ricochet',
      estimatedScope: 'medium'
    });
  });

  it('blocks semantic alias duplicate package creation', () => {
    const context = createDesignContext();
    const designReport = createDesignReport(context, {
      proposedCapabilityRequirements: [
        {
          semanticName: 'projectile ricochet',
          requiredInterfaces: ['ProjectileRicochet.v1'],
          requiredEvents: ['projectile.ricochet'],
          requiredRuntimeServices: ['physics.arcade_collision'],
          suggestedCapabilityIds: ['combat.bullet_bounce.v1'],
          reason: 'User called it bullet bounce.',
          proposed: true
        }
      ]
    });
    const report = buildCapabilityGapAnalysis({
      designReport,
      requestContext: context,
      registrySnapshot: buildCapabilityGapRegistrySnapshot([
        ricochetPackage({
          aliases: ['combat.bullet_bounce.v1'],
          providedInterfaces: [],
          emittedEvents: [],
          requiredRuntimeServices: []
        })
      ]),
      runtimeFamily: contextRuntimeFamily,
      expectedReuseProfiles: ['run_and_gun.v1', 'shooter.v1']
    });

    expect(report.outcome).toBe('POLICY_BLOCKED');
    expect(report.rejectedAlternatives).toEqual(expect.arrayContaining([expect.objectContaining({ reason: 'DUPLICATE_PACKAGE_PROPOSAL' })]));
    expect(report.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'DUPLICATE_SEMANTIC_ALIAS', severity: 'error' })]));
  });

  it('routes configuration-only and ECA-expressible requests away from typed code generation', () => {
    const context = createDesignContext();
    const configReport = buildCapabilityGapAnalysis({
      designReport: createDesignReport(context),
      requestContext: context,
      registrySnapshot: buildCapabilityGapRegistrySnapshot([
        ricochetPackage({
          capabilityId: 'combat.projectile.v1',
          description: 'Projectile lifecycle package.',
          semanticTags: ['projectile'],
          configurationOptions: ['projectile ricochet'],
          providedInterfaces: [],
          emittedEvents: [],
          requiredRuntimeServices: [],
          dependencies: []
        })
      ]),
      runtimeFamily: contextRuntimeFamily,
      expectedReuseProfiles: ['run_and_gun.v1', 'shooter.v1']
    });
    const ecaReport = buildCapabilityGapAnalysis({
      designReport: createDesignReport(context),
      requestContext: context,
      registrySnapshot: buildCapabilityGapRegistrySnapshot([
        ricochetPackage({
          capabilityId: 'rules.event_condition_action.v1',
          description: 'Event condition action rules.',
          semanticTags: ['rules'],
          declarativeRuleKinds: ['event_condition_action'],
          providedInterfaces: [],
          emittedEvents: [],
          requiredRuntimeServices: [],
          dependencies: []
        })
      ]),
      runtimeFamily: contextRuntimeFamily,
      expectedReuseProfiles: ['run_and_gun.v1', 'shooter.v1']
    });

    expect(configReport.outcome).toBe('NO_NEW_CAPABILITY_REQUIRED');
    expect(configReport.compositionPlan.strategy).toBe('CONFIGURATION_ONLY');
    expect(configReport.reuseMatches[0]).toMatchObject({ matchKind: 'CONFIGURATION_ONLY', coverage: 1 });
    expect(ecaReport.outcome).toBe('DECLARATIVE_EXTENSION_REQUIRED');
    expect(ecaReport.compositionPlan.strategy).toBe('DECLARATIVE_RULE');
    expect(ecaReport.reuseMatches[0]).toMatchObject({ matchKind: 'DECLARATIVE_RULE', coverage: 1 });
  });

  it('routes runtime-family mismatch and profile-specific primitive to manual review', () => {
    const context = createDesignContext();
    const runtimeMismatch = buildCapabilityGapAnalysis({
      designReport: createDesignReport(context),
      requestContext: context,
      registrySnapshot: buildCapabilityGapRegistrySnapshot([ricochetPackage({ runtimeFamilies: ['phaser_2d_top_down_arcade.v1'] })]),
      runtimeFamily: contextRuntimeFamily,
      expectedReuseProfiles: ['run_and_gun.v1', 'shooter.v1']
    });
    const profileSpecific = buildCapabilityGapAnalysis({
      designReport: createDesignReport(context),
      requestContext: context,
      registrySnapshot: buildCapabilityGapRegistrySnapshot([]),
      runtimeFamily: contextRuntimeFamily,
      expectedReuseProfiles: ['run_and_gun.v1']
    });

    expect(runtimeMismatch.outcome).toBe('MANUAL_ARCHITECTURE_REVIEW_REQUIRED');
    expect(runtimeMismatch.rejectedAlternatives).toEqual(expect.arrayContaining([expect.objectContaining({ reason: 'RUNTIME_FAMILY_MISMATCH' })]));
    expect(profileSpecific.outcome).toBe('MANUAL_ARCHITECTURE_REVIEW_REQUIRED');
    expect(profileSpecific.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'PROFILE_SPECIFIC_PRIMITIVE' })]));
  });

  it('blocks proposed ownership overlap before creating a new package', () => {
    const context = createDesignContext();
    const report = buildCapabilityGapAnalysis({
      designReport: createDesignReport(context),
      requestContext: context,
      registrySnapshot: buildCapabilityGapRegistrySnapshot([ricochetPackage({ providedInterfaces: [], emittedEvents: [], requiredRuntimeServices: [] })]),
      runtimeFamily: contextRuntimeFamily,
      expectedReuseProfiles: ['run_and_gun.v1', 'shooter.v1'],
      proposedOwnedDslPaths: ['/entities/components/projectile']
    });

    expect(report.outcome).toBe('POLICY_BLOCKED');
    expect(report.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'OWNERSHIP_OVERLAP', severity: 'error' })]));
  });

  it('keeps resolver output deterministic across registry insertion order', () => {
    const context = createDesignContext();
    const firstSnapshot = buildCapabilityGapRegistrySnapshot([ricochetPackage(), projectilePackage()]);
    const secondSnapshot = buildCapabilityGapRegistrySnapshot([projectilePackage(), ricochetPackage()]);
    const first = buildCapabilityGapAnalysis({
      designReport: createDesignReport(context),
      requestContext: context,
      registrySnapshot: firstSnapshot,
      runtimeFamily: contextRuntimeFamily,
      expectedReuseProfiles: ['run_and_gun.v1', 'shooter.v1']
    });
    const second = buildCapabilityGapAnalysis({
      designReport: createDesignReport(context),
      requestContext: context,
      registrySnapshot: secondSnapshot,
      runtimeFamily: contextRuntimeFamily,
      expectedReuseProfiles: ['run_and_gun.v1', 'shooter.v1']
    });

    expect(firstSnapshot.snapshotHash).toBe(secondSnapshot.snapshotHash);
    expect(first.reportHash).toBe(second.reportHash);
  });

  it('fails closed when design report integrity is forged or stale', () => {
    const context = createDesignContext();
    const designReport = createDesignReport(context);
    const forged = { ...designReport, requestId: 'other_request' };
    const report = buildCapabilityGapAnalysis({
      designReport: forged,
      requestContext: context,
      registrySnapshot: buildCapabilityGapRegistrySnapshot([ricochetPackage()]),
      runtimeFamily: contextRuntimeFamily
    });

    expect(report.outcome).toBe('AMBIGUOUS');
    expect(report.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'DESIGN_REPORT_INVALID', severity: 'error' })]));
    expect(report.reuseMatches).toEqual([]);
  });
});

const contextRuntimeFamily = 'phaser_2d_action_arcade.v1';

function createDesignContext(): GameplayDesignRequestContext {
  return {
    requestId: 'capsyn_req_12345678',
    origin: 'step34_amendment',
    sourceText: '让子弹碰到墙后最多反弹两次，每次反弹后伤害降低 25%。',
    selectedTargets: [{ kind: 'projectile', ref: 'player.projectile' }]
  };
}

function createDesignReport(context: GameplayDesignRequestContext, overrides: Partial<GameplayDesignPlan> = {}) {
  const report = validateGameplayDesignPlan(createDesignPlan(context.requestId, overrides), context);
  if (report.status !== 'valid') {
    throw new Error(`Expected valid design report in test fixture: ${report.issues.map((issue) => issue.message).join(', ')}`);
  }
  return report;
}

function createDesignPlan(requestId: string, overrides: Partial<GameplayDesignPlan> = {}): GameplayDesignPlan {
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
        semanticName: 'projectile ricochet',
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
    },
    ...overrides
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
    dependencies: ['combat.projectile.v1'],
    completeness: 'COMPLETE_SUPPORTED',
    qaAvailable: true,
    configurationOptions: [],
    declarativeRuleKinds: [],
    ...overrides
  };
}

function projectilePackage(overrides: Partial<CapabilityGapRegistryPackage> = {}): CapabilityGapRegistryPackage {
  return {
    ...ricochetPackage({
      capabilityId: 'combat.projectile.v1',
      contentHash: 'fnv1a_projectile',
      aliases: [],
      semanticTags: ['projectile'],
      providedInterfaces: ['ProjectileLifecycle.v1'],
      emittedEvents: ['projectile.fired'],
      consumedEvents: [],
      ownedDslPaths: ['/entities/components/projectile_base'],
      dependencies: [],
      ...overrides
    })
  };
}

function damageFalloffPackage(): CapabilityGapRegistryPackage {
  return {
    ...ricochetPackage({
      capabilityId: 'combat.damage_falloff.v1',
      contentHash: 'fnv1a_damage_falloff',
      aliases: [],
      description: 'Damage falloff after projectile bounce.',
      semanticTags: ['damage falloff'],
      providedInterfaces: ['DamageFalloff.v1'],
      requiredRuntimeServices: ['combat.damage_pipeline'],
      emittedEvents: ['damage.falloff_applied'],
      consumedEvents: ['projectile.ricochet'],
      ownedDslPaths: ['/entities/components/damage_falloff'],
      ownedIrNodeKinds: ['component.damage.falloff'],
      amendmentOperations: ['set_damage_falloff']
    })
  };
}

function physicsProjectilePackage(): CapabilityGapRegistryPackage {
  return {
    ...ricochetPackage({
      capabilityId: 'physics.arcade_projectile.v1',
      contentHash: 'fnv1a_physics_projectile',
      aliases: [],
      description: 'Arcade projectile physics integration.',
      semanticTags: ['projectile physics'],
      providedInterfaces: ['ArcadeProjectilePhysics.v1'],
      requiredRuntimeServices: ['physics.arcade_collision'],
      emittedEvents: [],
      consumedEvents: [],
      ownedDslPaths: ['/entities/components/projectile_physics'],
      ownedIrNodeKinds: ['component.physics.projectile'],
      amendmentOperations: [],
      dependencies: []
    })
  };
}

function declarativeRicochetPackage(overrides: Partial<CapabilityGapRegistryPackage> = {}): CapabilityGapRegistryPackage {
  return {
    ...ricochetPackage({
      capabilityId: 'rules.event_condition_action.v1',
      contentHash: 'fnv1a_eca',
      aliases: [],
      description: 'Event condition action rules for projectile ricochet.',
      semanticTags: ['projectile ricochet'],
      declarativeRuleKinds: ['event_condition_action'],
      providedInterfaces: [],
      emittedEvents: [],
      requiredRuntimeServices: [],
      ownedDslPaths: ['/rules/event_condition_action'],
      ownedIrNodeKinds: ['rule.event_condition_action'],
      amendmentOperations: ['add_eca_rule'],
      dependencies: [],
      ...overrides
    })
  };
}
