import { describe, expect, it } from 'vitest';

import {
  promoteCapabilityLockForAmendment,
  resolveGameplayCapabilityGraph,
  routeCapabilityOwnedAmendment,
  type GameAmendmentIr,
  type GameAmendmentOperation,
  type GameplayCapabilityPackageContract
} from '../../packages/game-dsl/src/index.js';

describe('Capability-owned amendment operations', () => {
  it('routes Step34 amendment operations to owner capability packages', () => {
    const movement = createPackage('movement.run_jump.v1', {
      operations: [{ operation: 'SetComponentProperty:moveSpeed', executionPolicy: 'hot_runtime_patch' }]
    });
    const activeLock = createLock([movement], ['movement.run_jump.v1']);
    const plan = routeCapabilityOwnedAmendment({
      amendmentIr: createAmendmentIr([createSetComponentPropertyOperation('op_speed', 'moveSpeed')]),
      activeLock,
      packages: [movement],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });

    expect(plan.status).toBe('routed');
    expect(plan.executionMode).toBe('hot_runtime_patch');
    expect(plan.operationRoutes).toEqual([
      expect.objectContaining({
        operationId: 'op_speed',
        operationKey: 'SetComponentProperty:moveSpeed',
        ownerCapabilityId: 'movement.run_jump.v1',
        compilerId: 'movement.run_jump.v1.amendments'
      })
    ]);
    expect(plan.provenance?.deepSeekInvocationIds).toEqual(['deepseek_invocation_001']);
  });

  it('blocks field-first fallback when the required owner does not support the operation', () => {
    const movement = createPackage('movement.run_jump.v1', {
      operations: [{ operation: 'SetComponentProperty:moveSpeed', executionPolicy: 'hot_runtime_patch' }]
    });
    const activeLock = createLock([movement], ['movement.run_jump.v1']);
    const plan = routeCapabilityOwnedAmendment({
      amendmentIr: createAmendmentIr([createSetComponentPropertyOperation('op_jump', 'jumpVelocity')]),
      activeLock,
      packages: [movement],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });

    expect(plan.status).toBe('blocked');
    expect(plan.operationRoutes).toEqual([]);
    expect(plan.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'OPERATION_UNSUPPORTED', operationId: 'op_jump', capabilityId: 'movement.run_jump.v1' })]));
  });

  it('adds capability candidates and records lock diff provenance', () => {
    const movement = createPackage('movement.run_jump.v1', {
      operations: [{ operation: 'SetComponentProperty:moveSpeed', executionPolicy: 'hot_runtime_patch' }]
    });
    const pickup = createPackage('pickup.drop_collect.v1', {
      operations: [{ operation: 'AddRule', executionPolicy: 'regeneration_required' }]
    });
    const activeLock = createLock([movement], ['movement.run_jump.v1']);
    const plan = routeCapabilityOwnedAmendment({
      amendmentIr: createAmendmentIr([createRuleOperation('op_add_pickup_rule')]),
      activeLock,
      packages: [movement, pickup],
      runtimeFamily: 'phaser_2d_action_arcade.v1',
      requestedCapabilityChanges: { add: ['pickup.drop_collect.v1'] }
    });

    expect(plan.status).toBe('routed');
    expect(plan.executionMode).toBe('candidate_regeneration');
    expect(plan.lockDiff?.addedCapabilityIds).toEqual(['pickup.drop_collect.v1']);
    expect(plan.provenance?.ownerCapabilityPackages).toEqual(['pickup.drop_collect.v1@1.0.0']);
  });

  it('routes operations through the exact locked package version and hash', () => {
    const lockedMovement = createPackage('movement.run_jump.v1', {
      packageVersion: '1.0.0',
      operations: [{ operation: 'SetComponentProperty:moveSpeed', executionPolicy: 'hot_runtime_patch' }]
    });
    const newerMovement = createPackage('movement.run_jump.v1', {
      packageVersion: '1.2.0',
      operations: [{ operation: 'SetComponentProperty:moveSpeed', executionPolicy: 'warm_restart' }]
    });
    const activeLock = createLock([lockedMovement], ['movement.run_jump.v1']);
    const plan = routeCapabilityOwnedAmendment({
      amendmentIr: createAmendmentIr([createSetComponentPropertyOperation('op_speed', 'moveSpeed')]),
      activeLock,
      packages: [lockedMovement, newerMovement],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });

    expect(plan.status).toBe('routed');
    expect(plan.operationRoutes).toEqual([
      expect.objectContaining({
        ownerCapabilityId: 'movement.run_jump.v1',
        packageVersion: '1.0.0',
        executionPolicy: 'hot_runtime_patch'
      })
    ]);
    expect(plan.executionMode).toBe('hot_runtime_patch');
  });

  it('fails closed when generic operation ownership is ambiguous across locked packages', () => {
    const rules = createPackage('rules.event_condition_action.v1', {
      operations: [{ operation: 'AddRule', executionPolicy: 'regeneration_required' }]
    });
    const pickup = createPackage('pickup.drop_collect.v1', {
      operations: [{ operation: 'AddRule', executionPolicy: 'regeneration_required' }]
    });
    const activeLock = createLock([rules, pickup], ['rules.event_condition_action.v1', 'pickup.drop_collect.v1']);
    const plan = routeCapabilityOwnedAmendment({
      amendmentIr: createAmendmentIr([createRuleOperation('op_add_rule', 'amendment.add_rule.v1', false)]),
      activeLock,
      packages: [rules, pickup],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });

    expect(plan.status).toBe('blocked');
    expect(plan.operationRoutes).toEqual([]);
    expect(plan.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'OPERATION_OWNER_AMBIGUOUS', operationId: 'op_add_rule' })]));
  });

  it('uses operation capability requirements to disambiguate shared generic operations', () => {
    const rules = createPackage('rules.event_condition_action.v1', {
      operations: [{ operation: 'AddRule', executionPolicy: 'regeneration_required' }]
    });
    const pickup = createPackage('pickup.drop_collect.v1', {
      operations: [{ operation: 'AddRule', executionPolicy: 'regeneration_required' }]
    });
    const activeLock = createLock([rules, pickup], ['rules.event_condition_action.v1', 'pickup.drop_collect.v1']);
    const plan = routeCapabilityOwnedAmendment({
      amendmentIr: createAmendmentIr([createRuleOperation('op_add_pickup_rule', 'pickup.drop_collect.v1')]),
      activeLock,
      packages: [rules, pickup],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });

    expect(plan.status).toBe('routed');
    expect(plan.operationRoutes).toEqual([expect.objectContaining({ operationId: 'op_add_pickup_rule', ownerCapabilityId: 'pickup.drop_collect.v1' })]);
  });

  it('blocks required owner fallback when the locked owner does not support the operation', () => {
    const rules = createPackage('rules.event_condition_action.v1', {
      operations: [{ operation: 'AddRule', executionPolicy: 'regeneration_required' }]
    });
    const pickup = createPackage('pickup.drop_collect.v1', {
      operations: [{ operation: 'ModifyRule', executionPolicy: 'regeneration_required' }]
    });
    const activeLock = createLock([rules, pickup], ['rules.event_condition_action.v1', 'pickup.drop_collect.v1']);
    const plan = routeCapabilityOwnedAmendment({
      amendmentIr: createAmendmentIr([createRuleOperation('op_add_pickup_rule', 'pickup.drop_collect.v1')]),
      activeLock,
      packages: [rules, pickup],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });

    expect(plan.status).toBe('blocked');
    expect(plan.operationRoutes).toEqual([]);
    expect(plan.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'OPERATION_UNSUPPORTED', operationId: 'op_add_pickup_rule', capabilityId: 'pickup.drop_collect.v1' })]));
  });

  it('blocks required owner fallback when the required capability is not locked', () => {
    const rules = createPackage('rules.event_condition_action.v1', {
      operations: [{ operation: 'AddRule', executionPolicy: 'regeneration_required' }]
    });
    const pickup = createPackage('pickup.drop_collect.v1', {
      operations: [{ operation: 'AddRule', executionPolicy: 'regeneration_required' }]
    });
    const activeLock = createLock([rules], ['rules.event_condition_action.v1']);
    const plan = routeCapabilityOwnedAmendment({
      amendmentIr: createAmendmentIr([createRuleOperation('op_add_pickup_rule', 'pickup.drop_collect.v1')]),
      activeLock,
      packages: [rules, pickup],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });

    expect(plan.status).toBe('blocked');
    expect(plan.operationRoutes).toEqual([]);
    expect(plan.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'OPERATION_OWNER_NOT_LOCKED', operationId: 'op_add_pickup_rule', capabilityId: 'pickup.drop_collect.v1' })]));
  });

  it('guards capability removal when another selected package still depends on it', () => {
    const physics = createPackage('physics.gravity_platformer.v1');
    const movement = createPackage('movement.run_jump.v1', {
      operations: [{ operation: 'SetComponentProperty:moveSpeed', executionPolicy: 'hot_runtime_patch' }],
      dependencies: [{ capabilityId: 'physics.gravity_platformer.v1', range: '^v1' }]
    });
    const activeLock = createLock([movement, physics], ['movement.run_jump.v1']);
    const plan = routeCapabilityOwnedAmendment({
      amendmentIr: createAmendmentIr([createSetComponentPropertyOperation('op_speed', 'moveSpeed')]),
      activeLock,
      packages: [movement, physics],
      runtimeFamily: 'phaser_2d_action_arcade.v1',
      requestedCapabilityChanges: { remove: ['physics.gravity_platformer.v1'] }
    });

    expect(plan.status).toBe('blocked');
    expect(plan.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'REMOVE_DEPENDENCY_BLOCKED', capabilityId: 'physics.gravity_platformer.v1' })]));
  });

  it('derives hot versus warm execution policy from package descriptors', () => {
    const movement = createPackage('movement.run_jump.v1', {
      operations: [
        { operation: 'SetComponentProperty:moveSpeed', executionPolicy: 'hot_runtime_patch' },
        { operation: 'SetComponentProperty:jumpVelocity', executionPolicy: 'warm_restart' }
      ]
    });
    const activeLock = createLock([movement], ['movement.run_jump.v1']);
    const plan = routeCapabilityOwnedAmendment({
      amendmentIr: createAmendmentIr([
        createSetComponentPropertyOperation('op_speed', 'moveSpeed'),
        createSetComponentPropertyOperation('op_jump', 'jumpVelocity')
      ]),
      activeLock,
      packages: [movement],
      runtimeFamily: 'phaser_2d_action_arcade.v1'
    });

    expect(plan.status).toBe('routed');
    expect(plan.executionMode).toBe('dsl_patch_warm_restart');
    expect(plan.operationRoutes.map((route) => route.executionPolicy)).toEqual(['hot_runtime_patch', 'warm_restart']);
  });

  it('promotes candidate lock only on accept and leaves active lock unchanged on reject', () => {
    const movement = createPackage('movement.run_jump.v1', {
      operations: [{ operation: 'SetComponentProperty:moveSpeed', executionPolicy: 'hot_runtime_patch' }]
    });
    const pickup = createPackage('pickup.drop_collect.v1', {
      operations: [{ operation: 'AddRule', executionPolicy: 'regeneration_required' }]
    });
    const activeLock = createLock([movement], ['movement.run_jump.v1']);
    const plan = routeCapabilityOwnedAmendment({
      amendmentIr: createAmendmentIr([createRuleOperation('op_add_pickup_rule')]),
      activeLock,
      packages: [movement, pickup],
      runtimeFamily: 'phaser_2d_action_arcade.v1',
      requestedCapabilityChanges: { add: ['pickup.drop_collect.v1'] }
    });
    const accepted = promoteCapabilityLockForAmendment({ activeLock, plan, decision: 'accept' });
    const rejected = promoteCapabilityLockForAmendment({ activeLock, plan, decision: 'reject' });

    expect(accepted.promoted).toBe(true);
    expect(accepted.activeLock.capabilityIds).toEqual(['movement.run_jump.v1', 'pickup.drop_collect.v1']);
    expect(rejected.promoted).toBe(false);
    expect(rejected.activeLock.capabilityIds).toEqual(['movement.run_jump.v1']);
  });
});

function createLock(packages: readonly GameplayCapabilityPackageContract[], requestedCapabilities: readonly string[]) {
  const report = resolveGameplayCapabilityGraph({
    requestedCapabilities,
    packages,
    runtimeFamily: 'phaser_2d_action_arcade.v1'
  });
  if (report.lock === undefined) {
    throw new Error(`expected resolver lock, got diagnostics: ${JSON.stringify(report.diagnostics)}`);
  }
  return report.lock;
}

function createAmendmentIr(operations: GameAmendmentOperation[]): GameAmendmentIr {
  return {
    schemaVersion: 'step34.game-amendment-ir.v1',
    proposalId: 'proposal_step35_8',
    requestId: 'proposal_step35_8',
    baseRunId: 'run_base',
    baseArtifactHashes: { currentDsl: 'hash_current_dsl' },
    modelInvocationIds: ['deepseek_invocation_001'],
    operations,
    operationDependencies: operations.map((operation, index) => ({
      operationId: operation.id,
      dependsOn: index === 0 ? [] : [operations[index - 1].id]
    })),
    preservedConstraints: [{ id: 'preserve_core_loop', description: 'Preserve core loop.' }],
    rejectedUnsafeFallbacks: [],
    provenance: {
      sourceTextHash: 'hash_source',
      semanticUnderstandingHash: 'hash_understanding',
      designDeltasHash: 'hash_deltas'
    }
  };
}

function createSetComponentPropertyOperation(id: string, property: string): GameAmendmentOperation {
  return {
    id,
    operation: 'setComponentProperty',
    target: { scope: 'component', role: 'player' },
    componentType: 'movement.run_jump',
    property,
    value: { direction: 'increase', amount: 20 },
    preconditions: [{ kind: 'component_exists', target: { scope: 'component', role: 'player' }, componentType: 'movement.run_jump' }],
    requiresCapabilities: [{ capabilityId: 'movement.run_jump.v1', reason: `Change ${property}.`, required: true }],
    expectedEffects: [
      {
        kind: 'property_changed',
        target: { scope: 'component', role: 'player' },
        property,
        comparison: 'increased',
        expectedValue: 20
      }
    ]
  };
}

function createRuleOperation(id: string, capabilityId = 'pickup.drop_collect.v1', required = true): GameAmendmentOperation {
  return {
    id,
    operation: 'addRule',
    target: { scope: 'game', id: 'rules' },
    value: { rule: 'drop pickup when enemy defeated' },
    preconditions: [{ kind: 'target_exists', target: { scope: 'game', id: 'rules' } }],
    requiresCapabilities: [{ capabilityId, reason: 'Add pickup drop rule.', required }],
    expectedEffects: [{ kind: 'runtime_event', eventName: 'pickup_collected', minimumCount: 0 }]
  };
}

function createPackage(
  id: string,
  input: {
    packageVersion?: string;
    operations?: GameplayCapabilityPackageContract['amendments']['supportedOperations'];
    dependencies?: GameplayCapabilityPackageContract['dependencies'];
  } = {}
): GameplayCapabilityPackageContract {
  const ownedPath = `/entities/components/${id}`;
  return {
    manifest: {
      id,
      packageVersion: input.packageVersion ?? '1.0.0',
      capabilityVersion: 'v1',
      status: 'supported',
      description: `${id} amendment package.`,
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
      supportedOperations: input.operations ?? [{ operation: 'SetComponentProperty:moveSpeed', executionPolicy: 'hot_runtime_patch' }],
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
    defaults: {},
    diagnostics: {}
  } as GameplayCapabilityPackageContract;
}

function createQaProbe(id: string, capabilityId: string): GameplayCapabilityPackageContract['qa']['probes'][number] {
  return {
    id,
    capabilityId,
    severity: 'required',
    prerequisites: ['candidate runtime started'],
    actions: [{ id: `${id}.action`, kind: 'runtime_event', target: `${capabilityId}.amendment_probe`, parameters: { event: 'probe_start' } }],
    observations: [{ id: `${id}.observation`, kind: 'runtime_event', runtimeSystemId: `${capabilityId}.system`, ref: `${capabilityId}.amendment_observed` }],
    assertions: [{ id: `${id}.assertion`, observationId: `${id}.observation`, comparator: 'exists', message: `${capabilityId} amendment behavior verified` }]
  };
}
