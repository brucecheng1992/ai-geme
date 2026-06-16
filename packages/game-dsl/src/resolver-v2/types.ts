import type { SemanticIdKind } from '../semantic-editing/index.js';
import type { SemanticIndex } from '../semantic-editing/semantic-index.js';

export type ResolverV2SemanticKind = SemanticIdKind;

export type ResolverV2ReferenceKind =
  | 'camera_follow_entity'
  | 'sprite_asset'
  | 'audio_asset'
  | 'font_asset'
  | 'entity_reference'
  | 'asset_reference'
  | 'unknown_reference';

export type ResolverV2AssetKind =
  | 'image'
  | 'sprite'
  | 'audio'
  | 'font'
  | 'atlas'
  | 'tilemap'
  | 'tileset'
  | 'generated_shape'
  | 'unknown';

export type ResolverV2AssetSourceKind = 'file' | 'generated' | 'inline' | 'unknown';

export type ResolverV2AssetDefinition = {
  id: string;
  key: string;
  path: string;
  kind: ResolverV2AssetKind;
  sourceKind: ResolverV2AssetSourceKind;
  sourcePreview?: string;
  sourceRedacted?: boolean;
};

export type ResolverV2AssetCatalogResult = {
  assets: ResolverV2AssetDefinition[];
  diagnostics: ResolverV2Diagnostic[];
};

export type ResolverV2SceneGraphNodeKind = 'scene' | 'entity' | 'camera' | 'spawn';

export type ResolverV2SceneGraphEdgeKind =
  | 'scene_contains_entity'
  | 'scene_has_camera'
  | 'scene_has_spawn'
  | 'camera_follows_entity'
  | 'entity_parent'
  | 'entity_child';

export type ResolverV2TransformSummary = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
};

export type ResolverV2SceneGraphNode = {
  id: string;
  kind: ResolverV2SceneGraphNodeKind;
  semanticId?: string;
  path: string;
  sceneId?: string;
  transform?: ResolverV2TransformSummary;
  visible?: boolean;
  metadata?: {
    entityKey?: string;
    sceneKey?: string;
    componentKeys?: string[];
  };
};

export type ResolverV2SceneGraphEdge = {
  id: string;
  kind: ResolverV2SceneGraphEdgeKind;
  from: string;
  to: string;
  path: string;
};

export type ResolverV2SceneGraph = {
  nodes: ResolverV2SceneGraphNode[];
  edges: ResolverV2SceneGraphEdge[];
};

export type ResolverV2SceneGraphResult = {
  graph: ResolverV2SceneGraph;
  diagnostics: ResolverV2Diagnostic[];
};

export type ResolverV2Reference = {
  id: string;
  kind: ResolverV2ReferenceKind;
  sourceId?: string;
  sourcePath: string;
  fieldPath: string;
  targetId: string;
  expectedTargetKind: ResolverV2SemanticKind;
  expectedAssetKinds?: ResolverV2AssetKind[];
  status: 'resolved' | 'unresolved';
  resolvedTarget?: {
    id: string;
    kind?: string;
    path?: string;
  };
  resolvedAsset?: {
    id: string;
    kind: ResolverV2AssetKind;
    path?: string;
    sourceKind?: ResolverV2AssetSourceKind;
  };
};

export type ResolverV2DiagnosticSeverity = 'error' | 'warning' | 'info';

export type ResolverV2DiagnosticCode =
  | 'INVALID_RESOLVER_DOCUMENT'
  | 'INVALID_RESOLVER_SEMANTIC_ID'
  | 'UNSAFE_RESOLVER_REFERENCE'
  | 'RESOLVER_REFERENCE_TARGET_NOT_FOUND'
  | 'RESOLVER_REFERENCE_KIND_MISMATCH'
  | 'RESOLVER_ASSET_DEFINITION_NOT_FOUND'
  | 'RESOLVER_ASSET_TYPE_MISMATCH'
  | 'RESOLVER_ASSET_SOURCE_UNSAFE'
  | 'RESOLVER_DUPLICATE_ASSET_ID'
  | 'RESOLVER_DUPLICATE_ENTITY_ID'
  | 'RESOLVER_ENTITY_PARENT_NOT_FOUND'
  | 'RESOLVER_ENTITY_PARENT_CYCLE'
  | 'RESOLVER_INVALID_TRANSFORM'
  | 'RESOLVER_CAMERA_TARGET_NOT_FOUND'
  | 'RESOLVER_SPAWN_TARGET_NOT_FOUND'
  | 'RESOLVER_SPAWN_OUT_OF_BOUNDS'
  | 'RESOLVER_SCENE_BOUNDS_INVALID'
  | 'RESOLVER_REFERENCE_EXTRACTION_FAILED'
  | 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE'
  | string;

export type ResolverV2Diagnostic = {
  severity: ResolverV2DiagnosticSeverity;
  code: ResolverV2DiagnosticCode;
  message: string;
  referenceId?: string;
  sourceId?: string;
  sourcePath?: string;
  fieldPath?: string;
  targetId?: string;
  expectedTargetKind?: string;
  actualTargetKind?: string;
  expectedAssetKinds?: ResolverV2AssetKind[];
  actualAssetKind?: ResolverV2AssetKind;
  cause?: unknown;
};

export type ResolverV2Summary = {
  referenceCount: number;
  resolvedCount: number;
  unresolvedCount: number;
  errorCount: number;
  warningCount: number;
  sceneCount?: number;
  entityCount?: number;
  sceneGraphNodeCount?: number;
  sceneGraphEdgeCount?: number;
};

export type ResolverV2Result = {
  ok: boolean;
  references: ResolverV2Reference[];
  diagnostics: ResolverV2Diagnostic[];
  summary: ResolverV2Summary;
  sceneGraph?: ResolverV2SceneGraph;
};

export type ResolverV2Request = {
  document: unknown;
  semanticIndex: SemanticIndex;
};

export type ResolverV2 = {
  resolve(request: ResolverV2Request): ResolverV2Result;
};

export type ExtractedResolverV2Reference = Omit<ResolverV2Reference, 'id' | 'status' | 'resolvedTarget'>;
