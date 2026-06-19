import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import {
  compileCapabilityDrivenGameIr,
  type CapabilityDslSchemaFragment,
  type CapabilityIrCompiler,
  type CapabilityIrFragment
} from '../../packages/game-dsl/src/index.js';

describe('Capability-driven Game IR', () => {
  it('compiles capability-owned DSL nodes through deterministic compiler dispatch', () => {
    const first = compileCapabilityDrivenGameIr(createCompileInput());
    const second = compileCapabilityDrivenGameIr({ ...createCompileInput(), compilers: [...testCompilers()].reverse() });

    expect(first.status).toBe('compiled');
    expect(first.compilerPlan?.artifactKind).toBe('capability_ir_compiler_plan');
    expect(first.outputIr?.contractVersion).toBe('capability-game-ir.v0.1');
    expect(first.consumedSourcePaths).toEqual(['/entities/0/components/0', '/rules/0/actions/0']);
    expect(first.uncompiledSourcePaths).toEqual([]);
    expect(first.outputIrHash).toBe(second.outputIrHash);
    expect(first.compilerPlanHash).toBe(second.compilerPlanHash);
  });

  it('fails when a DSL node has no capability IR compiler', () => {
    const report = compileCapabilityDrivenGameIr(createCompileInput({ compilers: testCompilers().filter((compiler) => compiler.capabilityId !== 'rules.restart_loop.v1') }));

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'IR_COMPILER_MISSING', path: '/rules/0/actions/0' })]));
    expect(report.uncompiledSourcePaths).toContain('/rules/0/actions/0');
  });

  it('rejects duplicate IR compiler ownership', () => {
    const duplicate: CapabilityIrCompiler = {
      ...testCompilers()[0],
      compilerId: 'movement.run_jump.compiler.loose'
    };
    const report = compileCapabilityDrivenGameIr(createCompileInput({ compilers: [...testCompilers(), duplicate] }));

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'IR_COMPILER_DUPLICATE', capabilityId: 'movement.run_jump.v1' })]));
  });

  it('rejects fragments that omit their source path so nodes cannot be silently dropped', () => {
    const report = compileCapabilityDrivenGameIr(
      createCompileInput({
        compilers: testCompilers().map((compiler) =>
          compiler.capabilityId === 'movement.run_jump.v1'
            ? {
                ...compiler,
                compile: (input) => ({ ...compiler.compile(input), sourcePaths: ['/some/other/path'] })
              }
            : compiler
        )
      })
    );

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'IR_FRAGMENT_SOURCE_UNOWNED', path: '/entities/0/components/0' })]));
  });

  it('rejects duplicate IR output ownership instead of last-write-wins merging', () => {
    const report = compileCapabilityDrivenGameIr(
      createCompileInput({
        compilers: testCompilers({
          actionOutputId: 'component.player_movement'
        })
      })
    );

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'IR_OUTPUT_CONFLICT', path: 'component.player_movement' })]));
  });

  it('rejects duplicate output IDs from the same capability', () => {
    const report = compileCapabilityDrivenGameIr(
      createCompileInput({
        compilers: testCompilers().map((compiler) =>
          compiler.capabilityId === 'movement.run_jump.v1'
            ? {
                ...compiler,
                compile: ({ path }): CapabilityIrFragment => ({
                  capabilityId: 'movement.run_jump.v1',
                  sourcePaths: [path],
                  entityComponents: [
                    { id: 'component.duplicate', capabilityId: 'movement.run_jump.v1', config: { source: path } },
                    { id: 'component.duplicate', capabilityId: 'movement.run_jump.v1', config: { source: path } }
                  ]
                })
              }
            : compiler
        )
      })
    );

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'IR_OUTPUT_CONFLICT', path: 'component.duplicate' })]));
  });

  it('rejects fragments or outputs that claim a different capability owner', () => {
    const fragmentOwnerMismatch = compileCapabilityDrivenGameIr(
      createCompileInput({
        compilers: testCompilers().map((compiler) =>
          compiler.capabilityId === 'movement.run_jump.v1'
            ? {
                ...compiler,
                compile: ({ path }): CapabilityIrFragment => ({
                  capabilityId: 'rules.restart_loop.v1',
                  sourcePaths: [path],
                  entityComponents: [{ id: 'component.fake', capabilityId: 'rules.restart_loop.v1', config: { source: path } }]
                })
              }
            : compiler
        )
      })
    );
    const outputOwnerMismatch = compileCapabilityDrivenGameIr(
      createCompileInput({
        compilers: testCompilers().map((compiler) =>
          compiler.capabilityId === 'movement.run_jump.v1'
            ? {
                ...compiler,
                compile: ({ path }): CapabilityIrFragment => ({
                  capabilityId: 'movement.run_jump.v1',
                  sourcePaths: [path],
                  entityComponents: [{ id: 'component.fake', capabilityId: 'rules.restart_loop.v1', config: { source: path } }]
                })
              }
            : compiler
        )
      })
    );

    expect(fragmentOwnerMismatch.status).toBe('invalid');
    expect(fragmentOwnerMismatch.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'IR_FRAGMENT_OWNER_MISMATCH' })]));
    expect(outputOwnerMismatch.status).toBe('invalid');
    expect(outputOwnerMismatch.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'IR_FRAGMENT_OWNER_MISMATCH' })]));
  });

  it('converts compiler exceptions into invalid compilation reports', () => {
    const report = compileCapabilityDrivenGameIr(
      createCompileInput({
        compilers: testCompilers().map((compiler) =>
          compiler.capabilityId === 'movement.run_jump.v1'
            ? {
                ...compiler,
                compile: () => {
                  throw new Error('compiler exploded');
                }
              }
            : compiler
        )
      })
    );

    expect(report.status).toBe('invalid');
    expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'IR_COMPILER_EXCEPTION', path: '/entities/0/components/0' })]));
    expect(report.uncompiledSourcePaths).toContain('/entities/0/components/0');
  });
});

function createCompileInput(input: { compilers?: CapabilityIrCompiler[] } = {}) {
  return {
    dsl: createDsl(),
    schemaFragments: testSchemaFragments(),
    compilers: input.compilers ?? testCompilers(),
    runtimeFamily: 'phaser_2d_action_arcade.v1',
    capabilityLockRef: 'gameplay_capability_lock.json',
    capabilityLockHash: 'fnv1a_testlock',
    assetManifestRef: 'asset_manifest.json',
    telemetryPlanRef: 'telemetry_plan.json',
    qaPlanRef: 'capability_qa_plan.json'
  };
}

function testSchemaFragments(): CapabilityDslSchemaFragment[] {
  return [
    {
      capabilityId: 'movement.run_jump.v1',
      nodeKinds: ['component'],
      configSchema: z.strictObject({ moveSpeed: z.number().int(), jumpVelocity: z.number().int() })
    },
    {
      capabilityId: 'rules.restart_loop.v1',
      nodeKinds: ['action'],
      configSchema: z.strictObject({ checkpointId: z.string().min(1) })
    }
  ];
}

function testCompilers(input: { actionOutputId?: string } = {}): CapabilityIrCompiler[] {
  return [
    {
      compilerId: 'movement.run_jump.ir.v1',
      capabilityId: 'movement.run_jump.v1',
      nodeKinds: ['component'],
      compile: ({ node, path }): CapabilityIrFragment => ({
        capabilityId: 'movement.run_jump.v1',
        sourcePaths: [path],
        entityComponents: [{ id: `component.${node.id}`, capabilityId: 'movement.run_jump.v1', config: { ...(node.config as Record<string, unknown>), source: path } }],
        runtimeSystemConfigs: [{ id: 'system.run_jump', capabilityId: 'movement.run_jump.v1', config: { enabled: true } }]
      })
    },
    {
      compilerId: 'rules.restart_loop.ir.v1',
      capabilityId: 'rules.restart_loop.v1',
      nodeKinds: ['action'],
      compile: ({ node, path }): CapabilityIrFragment => ({
        capabilityId: 'rules.restart_loop.v1',
        sourcePaths: [path],
        rules: [{ id: input.actionOutputId ?? `rule.${node.id}`, capabilityId: 'rules.restart_loop.v1', config: { ...(node.config as Record<string, unknown>), source: path } }],
        telemetryRequirements: [{ id: 'telemetry.restart', capabilityId: 'rules.restart_loop.v1', config: { event: 'restart' } }]
      })
    }
  ];
}

function createDsl() {
  return {
    contractVersion: 'capability-game-dsl.v0.1',
    profile: { id: 'side_scrolling_run_and_gun.v1' },
    capabilities: ['movement.run_jump.v1', 'rules.restart_loop.v1'],
    scenes: [{ id: 'main_scene' }],
    entities: [
      {
        id: 'player',
        role: 'player',
        components: [{ id: 'player_movement', type: 'movement.run_jump.v1', config: { moveSpeed: 220, jumpVelocity: 420 } }],
        behaviors: []
      }
    ],
    rules: [
      {
        id: 'restart_rule',
        when: { event: 'player.defeated', sourceSelector: { role: 'player' } },
        conditions: [],
        actions: [{ id: 'restart_action', type: 'rules.restart_loop.v1', config: { checkpointId: 'start' } }]
      }
    ],
    goals: [],
    assets: {},
    ui: {},
    metadata: { title: 'Capability IR Test' }
  };
}
