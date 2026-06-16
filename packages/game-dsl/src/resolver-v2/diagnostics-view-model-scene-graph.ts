import { compareCodeUnits, isPlainRecord } from './reference-extractor-shared.js';
import type { ResolverV2DiagnosticsViewModel } from './diagnostics-view-model-types.js';
import type {
  ResolverV2IrGateSceneGraphSummary,
  ResolverV2SceneGraph
} from './types.js';

type SafeSceneGraphNodeRow = {
  id: string;
  kind: string;
  semanticId?: string;
  path: string;
  sceneId?: string;
  visible?: boolean;
};

export function summarizeResolverSceneGraph(sceneGraph: ResolverV2SceneGraph | undefined): ResolverV2DiagnosticsViewModel['sceneGraph'] {
  if (!isValidSceneGraphLike(sceneGraph)) {
    return undefined;
  }

  const nodes = readSceneGraphNodeRows(sceneGraph.nodes);

  return {
    nodeCount: nodes.length,
    edgeCount: sceneGraph.edges.length,
    scenes: nodes.filter((node) => node.kind === 'scene').map(({ kind: _kind, sceneId: _sceneId, visible: _visible, ...node }) => node).sort(compareNodeRows),
    entities: nodes.filter((node) => node.kind === 'entity').map(({ kind: _kind, ...node }) => node).sort(compareNodeRows),
    cameras: nodes.filter((node) => node.kind === 'camera').map(({ kind: _kind, visible: _visible, ...node }) => node).sort(compareNodeRows),
    spawns: nodes.filter((node) => node.kind === 'spawn').map(({ kind: _kind, visible: _visible, ...node }) => node).sort(compareNodeRows)
  };
}

export function summarizeGateSceneGraph(
  sceneGraph: ResolverV2IrGateSceneGraphSummary | undefined
): ResolverV2DiagnosticsViewModel['sceneGraph'] {
  if (!isValidGateSceneGraphLike(sceneGraph)) {
    return undefined;
  }

  const nodes = readSceneGraphNodeRows(sceneGraph.nodes);

  return {
    nodeCount: nodes.length,
    edgeCount: sceneGraph.edgeCount,
    scenes: nodes
      .filter((node) => node.kind === 'scene')
      .map((node) => ({ id: node.id, semanticId: node.semanticId, path: node.path }))
      .sort(compareNodeRows),
    entities: nodes
      .filter((node) => node.kind === 'entity')
      .map((node) => ({ id: node.id, semanticId: node.semanticId, path: node.path, sceneId: node.sceneId, visible: node.visible }))
      .sort(compareNodeRows),
    cameras: nodes
      .filter((node) => node.kind === 'camera')
      .map((node) => ({ id: node.id, semanticId: node.semanticId, path: node.path, sceneId: node.sceneId }))
      .sort(compareNodeRows),
    spawns: nodes
      .filter((node) => node.kind === 'spawn')
      .map((node) => ({ id: node.id, semanticId: node.semanticId, path: node.path, sceneId: node.sceneId }))
      .sort(compareNodeRows)
  };
}

function readSceneGraphNodeRows(nodes: readonly unknown[]): SafeSceneGraphNodeRow[] {
  return nodes.flatMap((node) => {
    if (!isPlainRecord(node)) {
      return [];
    }

    const id = stringField(node, 'id');
    const kind = stringField(node, 'kind');
    const path = stringField(node, 'path');
    if (id === undefined || kind === undefined || path === undefined) {
      return [];
    }

    const row: SafeSceneGraphNodeRow = { id, kind, path };
    const semanticId = stringField(node, 'semanticId');
    const sceneId = stringField(node, 'sceneId');
    const visible = booleanField(node, 'visible');
    if (semanticId !== undefined) {
      row.semanticId = semanticId;
    }
    if (sceneId !== undefined) {
      row.sceneId = sceneId;
    }
    if (visible !== undefined) {
      row.visible = visible;
    }

    return [row];
  });
}

function compareNodeRows(left: { path: string; id: string }, right: { path: string; id: string }): number {
  return compareCodeUnits(left.path, right.path) || compareCodeUnits(left.id, right.id);
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function booleanField(record: Record<string, unknown>, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
}

function isValidSceneGraphLike(sceneGraph: unknown): sceneGraph is ResolverV2SceneGraph {
  return isPlainRecord(sceneGraph) && Array.isArray(sceneGraph.nodes) && Array.isArray(sceneGraph.edges);
}

function isValidGateSceneGraphLike(sceneGraph: unknown): sceneGraph is ResolverV2IrGateSceneGraphSummary {
  return isPlainRecord(sceneGraph) && Array.isArray(sceneGraph.nodes) && typeof sceneGraph.nodeCount === 'number' && typeof sceneGraph.edgeCount === 'number';
}
