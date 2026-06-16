import { extractResolverV2AssetCatalog } from './asset-catalog.js';
import { compareCodeUnits } from './reference-extractor-shared.js';
import type {
  ResolverV2AssetDefinition,
  ResolverV2Diagnostic,
  ResolverV2IrGateAssetSummary,
  ResolverV2IrGateDiagnosticSummary,
  ResolverV2IrGateReferenceSummary,
  ResolverV2IrGateSceneGraphEdgeSummary,
  ResolverV2IrGateSceneGraphNodeSummary,
  ResolverV2IrGateSceneGraphSummary,
  ResolverV2IrGateStatus,
  ResolverV2IrHandoffSummary,
  ResolverV2Reference,
  ResolverV2Result,
  ResolverV2SceneGraph,
  ResolverV2SceneGraphEdge,
  ResolverV2SceneGraphNode
} from './types.js';

export function buildResolverV2IrHandoffSummary(input: {
  status: ResolverV2IrGateStatus;
  resolverResult: ResolverV2Result;
  document?: unknown;
}): ResolverV2IrHandoffSummary {
  return {
    status: input.status,
    referenceCount: input.resolverResult.summary.referenceCount,
    resolvedReferenceCount: input.resolverResult.summary.resolvedCount,
    unresolvedReferenceCount: input.resolverResult.summary.unresolvedCount,
    errorCount: input.resolverResult.summary.errorCount,
    warningCount: input.resolverResult.summary.warningCount,
    references: [...input.resolverResult.references].sort(compareReferences).map(summarizeReference),
    diagnostics: [...input.resolverResult.diagnostics].sort(compareDiagnostics).map(summarizeDiagnostic),
    ...(input.resolverResult.sceneGraph === undefined
      ? {}
      : { sceneGraph: summarizeSceneGraph(input.resolverResult.sceneGraph) }),
    ...(input.document === undefined ? {} : { assets: summarizeAssets(input.document) })
  };
}

function summarizeReference(reference: ResolverV2Reference): ResolverV2IrGateReferenceSummary {
  return {
    id: reference.id,
    kind: reference.kind,
    status: reference.status,
    sourcePath: reference.sourcePath,
    fieldPath: reference.fieldPath,
    targetId: reference.targetId,
    ...(reference.resolvedTarget?.id === undefined ? {} : { resolvedTargetId: reference.resolvedTarget.id }),
    ...(reference.resolvedAsset?.id === undefined ? {} : { resolvedAssetId: reference.resolvedAsset.id })
  };
}

function summarizeDiagnostic(diagnostic: ResolverV2Diagnostic): ResolverV2IrGateDiagnosticSummary {
  return {
    severity: diagnostic.severity,
    code: diagnostic.code,
    message: diagnostic.message,
    ...(diagnostic.referenceId === undefined ? {} : { referenceId: diagnostic.referenceId }),
    ...(diagnostic.sourcePath === undefined ? {} : { sourcePath: diagnostic.sourcePath }),
    ...(diagnostic.fieldPath === undefined ? {} : { fieldPath: diagnostic.fieldPath }),
    ...(diagnostic.targetId === undefined ? {} : { targetId: diagnostic.targetId }),
    ...(diagnostic.expectedTargetKind === undefined ? {} : { expectedTargetKind: diagnostic.expectedTargetKind }),
    ...(diagnostic.actualTargetKind === undefined ? {} : { actualTargetKind: diagnostic.actualTargetKind })
  };
}

function summarizeAssets(document: unknown): ResolverV2IrGateAssetSummary[] {
  return extractResolverV2AssetCatalog(document).assets.sort(compareAssets).map((asset) => ({
    id: asset.id,
    key: asset.key,
    path: asset.path,
    kind: asset.kind,
    sourceKind: asset.sourceKind
  }));
}

function summarizeSceneGraph(sceneGraph: ResolverV2SceneGraph): ResolverV2IrGateSceneGraphSummary {
  const nodes = [...sceneGraph.nodes].sort(compareSceneGraphNodes);
  const edges = [...sceneGraph.edges].sort(compareSceneGraphEdges);

  return {
    sceneCount: nodes.filter((node) => node.kind === 'scene').length,
    entityCount: nodes.filter((node) => node.kind === 'entity').length,
    cameraCount: nodes.filter((node) => node.kind === 'camera').length,
    spawnCount: nodes.filter((node) => node.kind === 'spawn').length,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodes: nodes.map(summarizeSceneGraphNode),
    edges: edges.map(summarizeSceneGraphEdge)
  };
}

function summarizeSceneGraphNode(node: ResolverV2SceneGraphNode): ResolverV2IrGateSceneGraphNodeSummary {
  return {
    id: node.id,
    kind: node.kind,
    ...(node.semanticId === undefined ? {} : { semanticId: node.semanticId }),
    path: node.path,
    ...(node.sceneId === undefined ? {} : { sceneId: node.sceneId }),
    ...(node.visible === undefined ? {} : { visible: node.visible })
  };
}

function summarizeSceneGraphEdge(edge: ResolverV2SceneGraphEdge): ResolverV2IrGateSceneGraphEdgeSummary {
  return {
    id: edge.id,
    kind: edge.kind,
    from: edge.from,
    to: edge.to,
    path: edge.path
  };
}

function compareReferences(left: ResolverV2Reference, right: ResolverV2Reference): number {
  return (
    compareCodeUnits(left.kind, right.kind) ||
    compareCodeUnits(left.sourcePath, right.sourcePath) ||
    compareCodeUnits(left.fieldPath, right.fieldPath) ||
    compareCodeUnits(left.targetId, right.targetId) ||
    compareCodeUnits(left.id, right.id)
  );
}

function compareAssets(left: ResolverV2AssetDefinition, right: ResolverV2AssetDefinition): number {
  return compareCodeUnits(left.path, right.path) || compareCodeUnits(left.id, right.id);
}

function compareDiagnostics(left: ResolverV2Diagnostic, right: ResolverV2Diagnostic): number {
  return (
    compareCodeUnits(left.code, right.code) ||
    compareCodeUnits(left.referenceId ?? '', right.referenceId ?? '') ||
    compareCodeUnits(left.sourcePath ?? '', right.sourcePath ?? '') ||
    compareCodeUnits(left.fieldPath ?? '', right.fieldPath ?? '') ||
    compareCodeUnits(left.targetId ?? '', right.targetId ?? '') ||
    compareCodeUnits(left.message, right.message)
  );
}

function compareSceneGraphNodes(left: ResolverV2SceneGraphNode, right: ResolverV2SceneGraphNode): number {
  return compareCodeUnits(left.path, right.path) || compareCodeUnits(left.kind, right.kind) || compareCodeUnits(left.id, right.id);
}

function compareSceneGraphEdges(left: ResolverV2SceneGraphEdge, right: ResolverV2SceneGraphEdge): number {
  return (
    compareCodeUnits(left.kind, right.kind) ||
    compareCodeUnits(left.path, right.path) ||
    compareCodeUnits(left.from, right.from) ||
    compareCodeUnits(left.to, right.to) ||
    compareCodeUnits(left.id, right.id)
  );
}
