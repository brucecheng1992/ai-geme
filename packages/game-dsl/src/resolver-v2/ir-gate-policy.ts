import type {
  ResolverV2Diagnostic,
  ResolverV2IrGateBlockerCode,
  ResolverV2IrGatePolicy
} from './types.js';

export type ResolvedResolverV2IrGatePolicy = Required<ResolverV2IrGatePolicy>;

export const DEFAULT_RESOLVER_V2_IR_GATE_POLICY: ResolvedResolverV2IrGatePolicy = {
  blockOnWarnings: false,
  requireSceneGraph: true,
  requireAtLeastOneScene: true,
  requireAtLeastOneEntity: false,
  blockOnUnresolvedReferences: true,
  blockOnAssetDiagnostics: true,
  blockOnSceneGraphDiagnostics: true
};

const ASSET_DIAGNOSTIC_CODES = new Set<string>([
  'RESOLVER_ASSET_DEFINITION_NOT_FOUND',
  'RESOLVER_ASSET_TYPE_MISMATCH',
  'RESOLVER_ASSET_SOURCE_UNSAFE',
  'RESOLVER_DUPLICATE_ASSET_ID'
]);

const SCENE_GRAPH_DIAGNOSTIC_CODES = new Set<string>([
  'RESOLVER_DUPLICATE_ENTITY_ID',
  'RESOLVER_ENTITY_PARENT_NOT_FOUND',
  'RESOLVER_ENTITY_PARENT_CYCLE',
  'RESOLVER_INVALID_TRANSFORM',
  'RESOLVER_CAMERA_TARGET_NOT_FOUND',
  'RESOLVER_SPAWN_TARGET_NOT_FOUND',
  'RESOLVER_SPAWN_OUT_OF_BOUNDS',
  'RESOLVER_SCENE_BOUNDS_INVALID'
]);

export function mergeResolverV2IrGatePolicy(
  basePolicy: ResolverV2IrGatePolicy | undefined,
  overridePolicy: ResolverV2IrGatePolicy | undefined
): ResolvedResolverV2IrGatePolicy {
  return {
    ...DEFAULT_RESOLVER_V2_IR_GATE_POLICY,
    ...(basePolicy ?? {}),
    ...(overridePolicy ?? {})
  };
}

export function classifyResolverV2DiagnosticBlockerCode(
  diagnostic: ResolverV2Diagnostic,
  policy: ResolvedResolverV2IrGatePolicy
): ResolverV2IrGateBlockerCode {
  if (policy.blockOnAssetDiagnostics && isAssetDiagnostic(diagnostic)) {
    return 'RESOLVER_V2_ASSET_ERROR';
  }

  if (policy.blockOnSceneGraphDiagnostics && isSceneGraphDiagnostic(diagnostic)) {
    return 'RESOLVER_V2_SCENE_GRAPH_ERROR';
  }

  return 'RESOLVER_V2_DIAGNOSTIC_ERROR';
}

function isAssetDiagnostic(diagnostic: ResolverV2Diagnostic): boolean {
  return ASSET_DIAGNOSTIC_CODES.has(diagnostic.code) || diagnostic.sourcePath?.startsWith('/assets/') === true;
}

function isSceneGraphDiagnostic(diagnostic: ResolverV2Diagnostic): boolean {
  return SCENE_GRAPH_DIAGNOSTIC_CODES.has(diagnostic.code);
}
