import { z } from 'zod';

import { hashStableJson } from './stable-json.js';
import { DeclarativeJsonObjectSchema } from './declarative-json.js';
import {
  CapabilityBackedGameDslSchema,
  validateCapabilityBackedGameDsl,
  type CapabilityBackedGameDsl,
  type CapabilityDslNodeKind,
  type CapabilityDslSchemaFragment,
  type CapabilityTypedNode
} from './capability-dsl.js';
import { GameplayCapabilityIdSchema, RuntimeFamilyIdSchema } from './registry.js';

export const CAPABILITY_GAME_IR_CONTRACT_VERSION = 'capability-game-ir.v0.1';
export const CAPABILITY_IR_COMPILER_PLAN_KIND = 'capability_ir_compiler_plan';
export const CAPABILITY_IR_COMPILER_PLAN_SCHEMA_VERSION = 'capability_ir_compiler_plan.v0.1';
export const CAPABILITY_IR_COMPILATION_REPORT_KIND = 'capability_ir_compilation_report';
export const CAPABILITY_IR_COMPILATION_REPORT_SCHEMA_VERSION = 'capability_ir_compilation_report.v0.1';

const IrOutputSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9_.-]{1,119}$/),
  capabilityId: GameplayCapabilityIdSchema,
  config: DeclarativeJsonObjectSchema
});

export const CapabilityIrFragmentSchema = z.strictObject({
  capabilityId: GameplayCapabilityIdSchema,
  sourcePaths: z.array(z.string().regex(/^\//)).min(1),
  runtimeSystemConfigs: z.array(IrOutputSchema).default([]),
  entityComponents: z.array(IrOutputSchema).default([]),
  rules: z.array(IrOutputSchema).default([]),
  goals: z.array(IrOutputSchema).default([]),
  assetRequirements: z.array(IrOutputSchema).default([]),
  telemetryRequirements: z.array(IrOutputSchema).default([])
});

export type ParsedCapabilityIrFragment = z.infer<typeof CapabilityIrFragmentSchema>;
export type CapabilityIrFragment = z.input<typeof CapabilityIrFragmentSchema>;

export type CapabilityIrCompiler = {
  compilerId: string;
  capabilityId: string;
  nodeKinds: CapabilityDslNodeKind[];
  compile: (input: {
    node: CapabilityTypedNode;
    path: string;
    nodeKind: CapabilityDslNodeKind;
    dsl: CapabilityBackedGameDsl;
  }) => CapabilityIrFragment;
};

export type CapabilityIrCompilerPlanEntry = {
  compilerId: string;
  capabilityId: string;
  nodeKind: CapabilityDslNodeKind;
  sourcePaths: string[];
  outputMergeTargets: string[];
  conflictPolicy: 'append_only' | 'declared_extension_point';
};

export type CapabilityIrCompilerPlan = {
  artifactKind: typeof CAPABILITY_IR_COMPILER_PLAN_KIND;
  schemaVersion: typeof CAPABILITY_IR_COMPILER_PLAN_SCHEMA_VERSION;
  compilerOrder: CapabilityIrCompilerPlanEntry[];
  planHash: string;
};

export type CapabilityDrivenGameIr = {
  contractVersion: typeof CAPABILITY_GAME_IR_CONTRACT_VERSION;
  runtimeFamily: string;
  profileId: string;
  capabilityLockRef: string;
  runtimeSystemConfigs: z.infer<typeof IrOutputSchema>[];
  entityComponents: z.infer<typeof IrOutputSchema>[];
  rules: z.infer<typeof IrOutputSchema>[];
  goals: z.infer<typeof IrOutputSchema>[];
  assetRequirements: z.infer<typeof IrOutputSchema>[];
  telemetryRequirements: z.infer<typeof IrOutputSchema>[];
  assetManifestRef: string;
  telemetryPlanRef: string;
  qaPlanRef: string;
};

export type CapabilityIrCompilationIssue = {
  code:
    | 'DSL_VALIDATION_FAILED'
    | 'IR_COMPILER_DUPLICATE'
    | 'IR_COMPILER_MISSING'
    | 'IR_COMPILER_EXCEPTION'
    | 'IR_FRAGMENT_INVALID'
    | 'IR_FRAGMENT_OWNER_MISMATCH'
    | 'IR_FRAGMENT_SOURCE_UNOWNED'
    | 'IR_OUTPUT_CONFLICT';
  path: string;
  message: string;
  capabilityId?: string;
};

export type CapabilityIrCompilationReport = {
  artifactKind: typeof CAPABILITY_IR_COMPILATION_REPORT_KIND;
  schemaVersion: typeof CAPABILITY_IR_COMPILATION_REPORT_SCHEMA_VERSION;
  status: 'compiled' | 'invalid';
  dslHash?: string;
  capabilityLockHash: string;
  compilerPlanHash?: string;
  outputIrHash?: string;
  compilerPlan?: CapabilityIrCompilerPlan;
  outputIr?: CapabilityDrivenGameIr;
  consumedSourcePaths: string[];
  uncompiledSourcePaths: string[];
  issues: CapabilityIrCompilationIssue[];
};

export function compileCapabilityDrivenGameIr(input: {
  dsl: unknown;
  schemaFragments: readonly CapabilityDslSchemaFragment[];
  compilers: readonly CapabilityIrCompiler[];
  runtimeFamily: string;
  capabilityLockRef: string;
  capabilityLockHash: string;
  assetManifestRef: string;
  telemetryPlanRef: string;
  qaPlanRef: string;
}): CapabilityIrCompilationReport {
  const runtimeFamily = RuntimeFamilyIdSchema.parse(input.runtimeFamily);
  const dslValidation = validateCapabilityBackedGameDsl({ dsl: input.dsl, schemaFragments: input.schemaFragments });
  if (dslValidation.status !== 'valid') {
    return {
      artifactKind: CAPABILITY_IR_COMPILATION_REPORT_KIND,
      schemaVersion: CAPABILITY_IR_COMPILATION_REPORT_SCHEMA_VERSION,
      status: 'invalid',
      dslHash: dslValidation.dslHash,
      capabilityLockHash: input.capabilityLockHash,
      consumedSourcePaths: [],
      uncompiledSourcePaths: dslValidation.ownedNodes.map((node) => node.path),
      issues: dslValidation.issues.map((issue) => ({
        code: 'DSL_VALIDATION_FAILED',
        path: issue.path,
        capabilityId: issue.capabilityId,
        message: issue.message
      }))
    };
  }

  const parsedDsl = CapabilityBackedGameDslSchema.parse(input.dsl);
  const compilerMapResult = buildCompilerMap(input.compilers);
  const issues: CapabilityIrCompilationIssue[] = [...compilerMapResult.issues];
  const sourceNodes = collectCapabilityIrSourceNodes(parsedDsl);
  const fragments: ParsedCapabilityIrFragment[] = [];
  const consumedSourcePaths: string[] = [];
  const uncompiledSourcePaths: string[] = [];

  for (const sourceNode of sourceNodes) {
    const compiler = compilerMapResult.compilers.get(compilerKey(sourceNode.node.type, sourceNode.nodeKind));
    if (compiler === undefined) {
      issues.push({
        code: 'IR_COMPILER_MISSING',
        path: sourceNode.path,
        capabilityId: sourceNode.node.type,
        message: `No IR compiler is registered for ${sourceNode.node.type}:${sourceNode.nodeKind}.`
      });
      uncompiledSourcePaths.push(sourceNode.path);
      continue;
    }
    let rawFragment: CapabilityIrFragment;
    try {
      rawFragment = compiler.compile({ ...sourceNode, dsl: parsedDsl });
    } catch (error) {
      issues.push({
        code: 'IR_COMPILER_EXCEPTION',
        path: sourceNode.path,
        capabilityId: sourceNode.node.type,
        message: error instanceof Error ? error.message : 'IR compiler threw an unknown error.'
      });
      uncompiledSourcePaths.push(sourceNode.path);
      continue;
    }
    const parsedFragment = CapabilityIrFragmentSchema.safeParse(rawFragment);
    if (!parsedFragment.success) {
      issues.push({
        code: 'IR_FRAGMENT_INVALID',
        path: sourceNode.path,
        capabilityId: sourceNode.node.type,
        message: parsedFragment.error.issues.map((issue) => issue.message).join('; ')
      });
      uncompiledSourcePaths.push(sourceNode.path);
      continue;
    }
    const ownerIssues = validateFragmentOwnership(parsedFragment.data, sourceNode);
    if (ownerIssues.length > 0) {
      issues.push(...ownerIssues);
      uncompiledSourcePaths.push(sourceNode.path);
      continue;
    }
    if (!parsedFragment.data.sourcePaths.includes(sourceNode.path)) {
      issues.push({
        code: 'IR_FRAGMENT_SOURCE_UNOWNED',
        path: sourceNode.path,
        capabilityId: sourceNode.node.type,
        message: `Compiler ${compiler.compilerId} did not include source path ${sourceNode.path}.`
      });
      uncompiledSourcePaths.push(sourceNode.path);
      continue;
    }
    fragments.push(parsedFragment.data);
    consumedSourcePaths.push(sourceNode.path);
  }

  issues.push(...findOutputConflicts(fragments));
  const compilerPlan = buildCapabilityIrCompilerPlan(sourceNodes, input.compilers);
  if (issues.length > 0) {
    return {
      artifactKind: CAPABILITY_IR_COMPILATION_REPORT_KIND,
      schemaVersion: CAPABILITY_IR_COMPILATION_REPORT_SCHEMA_VERSION,
      status: 'invalid',
      dslHash: dslValidation.dslHash,
      capabilityLockHash: input.capabilityLockHash,
      compilerPlanHash: compilerPlan.planHash,
      compilerPlan,
      consumedSourcePaths: [...consumedSourcePaths].sort(),
      uncompiledSourcePaths: [...new Set([...uncompiledSourcePaths, ...sourceNodes.filter((node) => !consumedSourcePaths.includes(node.path)).map((node) => node.path)])].sort(),
      issues
    };
  }

  const outputIr = mergeCapabilityIrFragments({
    fragments,
    runtimeFamily,
    profileId: parsedDsl.profile.id,
    capabilityLockRef: input.capabilityLockRef,
    assetManifestRef: input.assetManifestRef,
    telemetryPlanRef: input.telemetryPlanRef,
    qaPlanRef: input.qaPlanRef
  });

  return {
    artifactKind: CAPABILITY_IR_COMPILATION_REPORT_KIND,
    schemaVersion: CAPABILITY_IR_COMPILATION_REPORT_SCHEMA_VERSION,
    status: 'compiled',
    dslHash: dslValidation.dslHash,
    capabilityLockHash: input.capabilityLockHash,
    compilerPlanHash: compilerPlan.planHash,
    outputIrHash: hashStableJson(outputIr),
    compilerPlan,
    outputIr,
    consumedSourcePaths: [...consumedSourcePaths].sort(),
    uncompiledSourcePaths: [],
    issues: []
  };
}

function buildCompilerMap(compilers: readonly CapabilityIrCompiler[]): {
  compilers: Map<string, CapabilityIrCompiler>;
  issues: CapabilityIrCompilationIssue[];
} {
  const compilerMap = new Map<string, CapabilityIrCompiler>();
  const issues: CapabilityIrCompilationIssue[] = [];
  for (const compiler of compilers) {
    for (const nodeKind of compiler.nodeKinds) {
      const key = compilerKey(compiler.capabilityId, nodeKind);
      if (compilerMap.has(key)) {
        issues.push({
          code: 'IR_COMPILER_DUPLICATE',
          path: 'compilers',
          capabilityId: compiler.capabilityId,
          message: `Duplicate IR compiler for ${compiler.capabilityId}:${nodeKind}.`
        });
        continue;
      }
      compilerMap.set(key, compiler);
    }
  }
  return { compilers: compilerMap, issues };
}

function buildCapabilityIrCompilerPlan(sourceNodes: readonly CapabilityIrSourceNode[], compilers: readonly CapabilityIrCompiler[]): CapabilityIrCompilerPlan {
  const entries: CapabilityIrCompilerPlanEntry[] = sourceNodes
    .flatMap((node) => {
      const compiler = compilers.find((candidate) => candidate.capabilityId === node.node.type && candidate.nodeKinds.includes(node.nodeKind));
      return compiler === undefined
        ? []
        : [
            {
              compilerId: compiler.compilerId,
              capabilityId: compiler.capabilityId,
              nodeKind: node.nodeKind,
              sourcePaths: [node.path],
              outputMergeTargets: outputMergeTargetsForNodeKind(node.nodeKind),
              conflictPolicy: 'append_only' as const
            }
          ];
    })
    .sort((left, right) => `${left.capabilityId}:${left.nodeKind}:${left.sourcePaths[0]}`.localeCompare(`${right.capabilityId}:${right.nodeKind}:${right.sourcePaths[0]}`));
  const payload: Omit<CapabilityIrCompilerPlan, 'planHash'> = {
    artifactKind: CAPABILITY_IR_COMPILER_PLAN_KIND,
    schemaVersion: CAPABILITY_IR_COMPILER_PLAN_SCHEMA_VERSION,
    compilerOrder: entries
  };
  return {
    ...payload,
    planHash: hashStableJson(payload)
  };
}

function mergeCapabilityIrFragments(input: {
  fragments: readonly ParsedCapabilityIrFragment[];
  runtimeFamily: string;
  profileId: string;
  capabilityLockRef: string;
  assetManifestRef: string;
  telemetryPlanRef: string;
  qaPlanRef: string;
}): CapabilityDrivenGameIr {
  const sortedFragments = [...input.fragments].sort((left, right) => `${left.capabilityId}:${left.sourcePaths.join(',')}`.localeCompare(`${right.capabilityId}:${right.sourcePaths.join(',')}`));
  return {
    contractVersion: CAPABILITY_GAME_IR_CONTRACT_VERSION,
    runtimeFamily: input.runtimeFamily,
    profileId: input.profileId,
    capabilityLockRef: input.capabilityLockRef,
    runtimeSystemConfigs: sortedFragments.flatMap((fragment) => fragment.runtimeSystemConfigs),
    entityComponents: sortedFragments.flatMap((fragment) => fragment.entityComponents),
    rules: sortedFragments.flatMap((fragment) => fragment.rules),
    goals: sortedFragments.flatMap((fragment) => fragment.goals),
    assetRequirements: sortedFragments.flatMap((fragment) => fragment.assetRequirements),
    telemetryRequirements: sortedFragments.flatMap((fragment) => fragment.telemetryRequirements),
    assetManifestRef: input.assetManifestRef,
    telemetryPlanRef: input.telemetryPlanRef,
    qaPlanRef: input.qaPlanRef
  };
}

function findOutputConflicts(fragments: readonly ParsedCapabilityIrFragment[]): CapabilityIrCompilationIssue[] {
  const owners = new Map<string, string>();
  const issues: CapabilityIrCompilationIssue[] = [];
  for (const fragment of fragments) {
    for (const output of [
      ...fragment.runtimeSystemConfigs,
      ...fragment.entityComponents,
      ...fragment.rules,
      ...fragment.goals,
      ...fragment.assetRequirements,
      ...fragment.telemetryRequirements
    ]) {
      const existingOwner = owners.get(output.id);
      if (existingOwner !== undefined) {
        issues.push({
          code: 'IR_OUTPUT_CONFLICT',
          path: output.id,
          capabilityId: fragment.capabilityId,
          message: `IR output ${output.id} is produced more than once by ${existingOwner} and ${fragment.capabilityId}.`
        });
      }
      owners.set(output.id, fragment.capabilityId);
    }
  }
  return issues;
}

function validateFragmentOwnership(fragment: ParsedCapabilityIrFragment, sourceNode: CapabilityIrSourceNode): CapabilityIrCompilationIssue[] {
  const issues: CapabilityIrCompilationIssue[] = [];
  if (fragment.capabilityId !== sourceNode.node.type) {
    issues.push({
      code: 'IR_FRAGMENT_OWNER_MISMATCH',
      path: sourceNode.path,
      capabilityId: sourceNode.node.type,
      message: `Compiler for ${sourceNode.node.type} returned fragment owner ${fragment.capabilityId}.`
    });
  }
  for (const output of [
    ...fragment.runtimeSystemConfigs,
    ...fragment.entityComponents,
    ...fragment.rules,
    ...fragment.goals,
    ...fragment.assetRequirements,
    ...fragment.telemetryRequirements
  ]) {
    if (output.capabilityId !== fragment.capabilityId) {
      issues.push({
        code: 'IR_FRAGMENT_OWNER_MISMATCH',
        path: sourceNode.path,
        capabilityId: sourceNode.node.type,
        message: `IR output ${output.id} owner ${output.capabilityId} does not match fragment owner ${fragment.capabilityId}.`
      });
    }
  }
  return issues;
}

type CapabilityIrSourceNode = {
  path: string;
  nodeKind: CapabilityDslNodeKind;
  node: CapabilityTypedNode;
};

function collectCapabilityIrSourceNodes(dsl: CapabilityBackedGameDsl): CapabilityIrSourceNode[] {
  const nodes: CapabilityIrSourceNode[] = [];
  dsl.entities.forEach((entity, entityIndex) => {
    entity.components.forEach((node, nodeIndex) => nodes.push({ path: `/entities/${entityIndex}/components/${nodeIndex}`, nodeKind: 'component', node }));
    entity.behaviors.forEach((node, nodeIndex) => nodes.push({ path: `/entities/${entityIndex}/behaviors/${nodeIndex}`, nodeKind: 'behavior', node }));
  });
  dsl.rules.forEach((rule, ruleIndex) => {
    rule.conditions.forEach((node, nodeIndex) => nodes.push({ path: `/rules/${ruleIndex}/conditions/${nodeIndex}`, nodeKind: 'condition', node }));
    rule.actions.forEach((node, nodeIndex) => nodes.push({ path: `/rules/${ruleIndex}/actions/${nodeIndex}`, nodeKind: 'action', node }));
  });
  dsl.goals.forEach((node, nodeIndex) => nodes.push({ path: `/goals/${nodeIndex}`, nodeKind: 'goal', node }));
  return nodes;
}

function compilerKey(capabilityId: string, nodeKind: CapabilityDslNodeKind): string {
  return `${capabilityId}:${nodeKind}`;
}

function outputMergeTargetsForNodeKind(nodeKind: CapabilityDslNodeKind): string[] {
  if (nodeKind === 'component' || nodeKind === 'behavior') {
    return ['entityComponents', 'runtimeSystemConfigs'];
  }
  if (nodeKind === 'action' || nodeKind === 'condition') {
    return ['rules', 'telemetryRequirements'];
  }
  return ['goals'];
}
