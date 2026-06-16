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

export type ResolverV2Reference = {
  id: string;
  kind: ResolverV2ReferenceKind;
  sourceId?: string;
  sourcePath: string;
  fieldPath: string;
  targetId: string;
  expectedTargetKind: ResolverV2SemanticKind;
  status: 'resolved' | 'unresolved';
  resolvedTarget?: {
    id: string;
    kind?: string;
    path?: string;
  };
};

export type ResolverV2DiagnosticSeverity = 'error' | 'warning' | 'info';

export type ResolverV2DiagnosticCode =
  | 'INVALID_RESOLVER_DOCUMENT'
  | 'UNSAFE_RESOLVER_REFERENCE'
  | 'RESOLVER_REFERENCE_TARGET_NOT_FOUND'
  | 'RESOLVER_REFERENCE_KIND_MISMATCH'
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
  cause?: unknown;
};

export type ResolverV2Summary = {
  referenceCount: number;
  resolvedCount: number;
  unresolvedCount: number;
  errorCount: number;
  warningCount: number;
};

export type ResolverV2Result = {
  ok: boolean;
  references: ResolverV2Reference[];
  diagnostics: ResolverV2Diagnostic[];
  summary: ResolverV2Summary;
};

export type ResolverV2Request = {
  document: unknown;
  semanticIndex: SemanticIndex;
};

export type ResolverV2 = {
  resolve(request: ResolverV2Request): ResolverV2Result;
};

export type ExtractedResolverV2Reference = Omit<ResolverV2Reference, 'id' | 'status' | 'resolvedTarget'>;
