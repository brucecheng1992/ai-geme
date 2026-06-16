import { compareCodeUnits } from './reference-extractor-shared.js';
import { classifyResolverV2DiagnosticBlockerCode, type ResolvedResolverV2IrGatePolicy } from './ir-gate-policy.js';
import type {
  ResolverV2Diagnostic,
  ResolverV2IrGateBlocker,
  ResolverV2IrGateWarning,
  ResolverV2Result,
  ResolverV2SceneGraph
} from './types.js';

export function createResolverResultBlockers(
  resolverResult: ResolverV2Result,
  policy: ResolvedResolverV2IrGatePolicy
): ResolverV2IrGateBlocker[] {
  return [
    ...resolverResult.diagnostics.flatMap((diagnostic) => createDiagnosticBlockers(diagnostic, policy)),
    ...(policy.blockOnUnresolvedReferences ? createUnresolvedReferenceBlockers(resolverResult) : []),
    ...createSceneGraphBlockers(resolverResult.sceneGraph, policy)
  ].sort(compareBlockers);
}

export function createResolverResultWarnings(
  resolverResult: ResolverV2Result,
  policy: ResolvedResolverV2IrGatePolicy
): ResolverV2IrGateWarning[] {
  if (policy.blockOnWarnings) {
    return [];
  }

  return resolverResult.diagnostics
    .filter((diagnostic) => diagnostic.severity === 'warning')
    .map((diagnostic) => ({
      code: diagnostic.code,
      message: diagnostic.message,
      diagnosticCode: diagnostic.code,
      ...(diagnostic.referenceId === undefined ? {} : { referenceId: diagnostic.referenceId }),
      ...(diagnostic.sourcePath === undefined ? {} : { sourcePath: diagnostic.sourcePath }),
      ...(diagnostic.fieldPath === undefined ? {} : { fieldPath: diagnostic.fieldPath }),
      ...(diagnostic.targetId === undefined ? {} : { targetId: diagnostic.targetId })
    }))
    .sort(compareWarnings);
}

export function compareBlockers(left: ResolverV2IrGateBlocker, right: ResolverV2IrGateBlocker): number {
  return (
    compareCodeUnits(left.code, right.code) ||
    compareCodeUnits(left.diagnosticCode ?? '', right.diagnosticCode ?? '') ||
    compareCodeUnits(left.referenceId ?? '', right.referenceId ?? '') ||
    compareCodeUnits(left.sourcePath ?? '', right.sourcePath ?? '') ||
    compareCodeUnits(left.fieldPath ?? '', right.fieldPath ?? '') ||
    compareCodeUnits(left.targetId ?? '', right.targetId ?? '') ||
    compareCodeUnits(left.nodeId ?? '', right.nodeId ?? '') ||
    compareCodeUnits(left.message, right.message)
  );
}

function createDiagnosticBlockers(
  diagnostic: ResolverV2Diagnostic,
  policy: ResolvedResolverV2IrGatePolicy
): ResolverV2IrGateBlocker[] {
  if (diagnostic.severity === 'error') {
    return [createDiagnosticBlocker(diagnostic, policy)];
  }

  if (diagnostic.severity === 'warning' && policy.blockOnWarnings) {
    return [createDiagnosticBlocker(diagnostic, policy)];
  }

  return [];
}

function createDiagnosticBlocker(
  diagnostic: ResolverV2Diagnostic,
  policy: ResolvedResolverV2IrGatePolicy
): ResolverV2IrGateBlocker {
  return {
    code: classifyResolverV2DiagnosticBlockerCode(diagnostic, policy),
    message: diagnostic.message,
    severity: 'error',
    diagnosticCode: diagnostic.code,
    ...(diagnostic.referenceId === undefined ? {} : { referenceId: diagnostic.referenceId }),
    ...(diagnostic.sourcePath === undefined ? {} : { sourcePath: diagnostic.sourcePath }),
    ...(diagnostic.fieldPath === undefined ? {} : { fieldPath: diagnostic.fieldPath }),
    ...(diagnostic.targetId === undefined ? {} : { targetId: diagnostic.targetId })
  };
}

function createUnresolvedReferenceBlockers(resolverResult: ResolverV2Result): ResolverV2IrGateBlocker[] {
  return resolverResult.references
    .filter((reference) => reference.status === 'unresolved')
    .map((reference) => ({
      code: 'RESOLVER_V2_UNRESOLVED_REFERENCE',
      message: 'Resolver V2 reference must be resolved before IR handoff.',
      severity: 'error',
      referenceId: reference.id,
      sourcePath: reference.sourcePath,
      fieldPath: reference.fieldPath,
      targetId: reference.targetId
    }));
}

function createSceneGraphBlockers(
  sceneGraph: ResolverV2SceneGraph | undefined,
  policy: ResolvedResolverV2IrGatePolicy
): ResolverV2IrGateBlocker[] {
  if (sceneGraph === undefined) {
    return policy.requireSceneGraph
      ? [
          {
            code: 'RESOLVER_V2_MISSING_SCENE_GRAPH',
            message: 'Resolver V2 scene graph is required before IR handoff.',
            severity: 'error'
          }
        ]
      : [];
  }

  const sceneCount = sceneGraph.nodes.filter((node) => node.kind === 'scene').length;
  const entityCount = sceneGraph.nodes.filter((node) => node.kind === 'entity').length;
  const blockers: ResolverV2IrGateBlocker[] = [];

  if (policy.requireAtLeastOneScene && sceneCount === 0) {
    blockers.push({
      code: 'RESOLVER_V2_MISSING_SCENE',
      message: 'Resolver V2 scene graph must contain at least one scene before IR handoff.',
      severity: 'error'
    });
  }

  if (policy.requireAtLeastOneEntity && entityCount === 0) {
    blockers.push({
      code: 'RESOLVER_V2_MISSING_ENTITY',
      message: 'Resolver V2 scene graph must contain at least one entity before IR handoff.',
      severity: 'error'
    });
  }

  return blockers;
}

function compareWarnings(left: ResolverV2IrGateWarning, right: ResolverV2IrGateWarning): number {
  return (
    compareCodeUnits(left.code, right.code) ||
    compareCodeUnits(left.referenceId ?? '', right.referenceId ?? '') ||
    compareCodeUnits(left.sourcePath ?? '', right.sourcePath ?? '') ||
    compareCodeUnits(left.fieldPath ?? '', right.fieldPath ?? '') ||
    compareCodeUnits(left.targetId ?? '', right.targetId ?? '') ||
    compareCodeUnits(left.message, right.message)
  );
}
