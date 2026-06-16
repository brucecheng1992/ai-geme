export { createResolverV2, resolveSemanticDocumentV2 } from './resolver-v2.js';
export { extractResolverV2References, type ResolverV2ReferenceExtractionResult } from './reference-extractor.js';
export { createResolverV2Diagnostic, type CreateResolverV2DiagnosticInput } from './diagnostics.js';
export type {
  ExtractedResolverV2Reference,
  ResolverV2,
  ResolverV2Diagnostic,
  ResolverV2DiagnosticCode,
  ResolverV2DiagnosticSeverity,
  ResolverV2Reference,
  ResolverV2ReferenceKind,
  ResolverV2Request,
  ResolverV2Result,
  ResolverV2SemanticKind,
  ResolverV2Summary
} from './types.js';
