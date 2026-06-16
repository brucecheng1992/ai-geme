export { createResolverV2, resolveSemanticDocumentV2 } from './resolver-v2.js';
export { extractResolverV2AssetCatalog } from './asset-catalog.js';
export { extractResolverV2SceneGraph } from './scene-graph.js';
export { extractResolverV2References, type ResolverV2ReferenceExtractionResult } from './reference-extractor.js';
export { createResolverV2Diagnostic, type CreateResolverV2DiagnosticInput } from './diagnostics.js';
export type {
  ExtractedResolverV2Reference,
  ResolverV2AssetCatalogResult,
  ResolverV2AssetDefinition,
  ResolverV2AssetKind,
  ResolverV2AssetSourceKind,
  ResolverV2,
  ResolverV2Diagnostic,
  ResolverV2DiagnosticCode,
  ResolverV2DiagnosticSeverity,
  ResolverV2Reference,
  ResolverV2ReferenceKind,
  ResolverV2Request,
  ResolverV2Result,
  ResolverV2SceneGraph,
  ResolverV2SceneGraphEdge,
  ResolverV2SceneGraphEdgeKind,
  ResolverV2SceneGraphNode,
  ResolverV2SceneGraphNodeKind,
  ResolverV2SceneGraphResult,
  ResolverV2SemanticKind,
  ResolverV2Summary,
  ResolverV2TransformSummary
} from './types.js';
