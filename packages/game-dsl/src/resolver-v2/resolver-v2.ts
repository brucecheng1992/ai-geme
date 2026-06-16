import { parseSemanticId } from '../semantic-editing/index.js';
import type { SemanticId } from '../semantic-editing/index.js';
import { extractResolverV2AssetCatalog } from './asset-catalog.js';
import { classifyResolverV2ReferenceTarget } from './asset-reference-rules.js';
import { createResolverV2Diagnostic } from './diagnostics.js';
import { extractResolverV2References } from './reference-extractor.js';
import type {
  ExtractedResolverV2Reference,
  ResolverV2AssetDefinition,
  ResolverV2,
  ResolverV2Diagnostic,
  ResolverV2Reference,
  ResolverV2Request,
  ResolverV2Result,
  ResolverV2Summary
} from './types.js';

type ResolverV2AssetCatalogLookup = {
  byId: Map<string, ResolverV2AssetDefinition[]>;
  duplicateIds: Set<string>;
  unsafeSourceIds: Set<string>;
};

export function createResolverV2(): ResolverV2 {
  return {
    resolve: resolveSemanticDocumentV2
  };
}

export function resolveSemanticDocumentV2(request: ResolverV2Request): ResolverV2Result {
  const extraction = extractResolverV2References(request.document);
  const assetCatalog = extractResolverV2AssetCatalog(request.document);
  const assetLookup = createAssetCatalogLookup(assetCatalog.assets, assetCatalog.diagnostics);
  const extractedReferences = [...extraction.references].sort((left, right) => compareCodeUnits(left.fieldPath, right.fieldPath));
  const diagnostics: ResolverV2Diagnostic[] = [...extraction.diagnostics, ...filterCatalogDiagnostics(extraction.diagnostics, assetCatalog.diagnostics)];
  const references = extractedReferences.map((reference, index) =>
    resolveReference({
      reference,
      index,
      request,
      assetLookup,
      diagnostics
    })
  );
  const summary = summarizeResolverV2Result(references, diagnostics);

  return {
    ok: summary.errorCount === 0,
    references,
    diagnostics,
    summary
  };
}

function resolveReference(input: {
  reference: ExtractedResolverV2Reference;
  index: number;
  request: ResolverV2Request;
  assetLookup: ResolverV2AssetCatalogLookup;
  diagnostics: ResolverV2Diagnostic[];
}): ResolverV2Reference {
  const id = `resolver_ref:${input.reference.kind}:${input.index}`;
  const unresolved = createUnresolvedReference(id, input.reference);

  const targetClassification = classifyResolverV2ReferenceTarget(input.reference.targetId);
  if (!targetClassification.ok) {
    input.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'error',
        code: targetClassification.code,
        message:
          targetClassification.code === 'UNSAFE_RESOLVER_REFERENCE'
            ? 'Resolver V2 reference target must be a semantic id, not a path or generated-code address.'
            : 'Resolver V2 reference target must be a valid semantic id.',
        referenceId: id,
        sourceId: input.reference.sourceId,
        sourcePath: input.reference.sourcePath,
        fieldPath: input.reference.fieldPath,
        targetId: input.reference.targetId,
        expectedTargetKind: input.reference.expectedTargetKind
      })
    );
    return unresolved;
  }

  const parsed = parseSemanticId(input.reference.targetId);
  if (parsed?.kind !== input.reference.expectedTargetKind) {
    input.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'error',
        code: 'RESOLVER_REFERENCE_KIND_MISMATCH',
        message: 'Resolver V2 reference target kind did not match the expected semantic kind.',
        referenceId: id,
        sourceId: input.reference.sourceId,
        sourcePath: input.reference.sourcePath,
        fieldPath: input.reference.fieldPath,
        targetId: input.reference.targetId,
        expectedTargetKind: input.reference.expectedTargetKind,
        actualTargetKind: parsed?.kind
      })
    );
    return unresolved;
  }

  const target = input.request.semanticIndex.resolve(input.reference.targetId as SemanticId);
  if (target === null) {
    input.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'error',
        code: 'RESOLVER_REFERENCE_TARGET_NOT_FOUND',
        message: 'Resolver V2 reference target was not found in SemanticIndex.',
        referenceId: id,
        sourceId: input.reference.sourceId,
        sourcePath: input.reference.sourcePath,
        fieldPath: input.reference.fieldPath,
        targetId: input.reference.targetId,
        expectedTargetKind: input.reference.expectedTargetKind
      })
    );
    return unresolved;
  }

  if (target.kind !== input.reference.expectedTargetKind) {
    input.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'error',
        code: 'RESOLVER_REFERENCE_KIND_MISMATCH',
        message: 'Resolver V2 SemanticIndex target kind did not match the expected semantic kind.',
        referenceId: id,
        sourceId: input.reference.sourceId,
        sourcePath: input.reference.sourcePath,
        fieldPath: input.reference.fieldPath,
        targetId: input.reference.targetId,
        expectedTargetKind: input.reference.expectedTargetKind,
        actualTargetKind: target.kind
      })
    );
    return unresolved;
  }

  const resolvedReference: ResolverV2Reference = {
    ...unresolved,
    status: 'resolved',
    resolvedTarget: {
      id: target.id,
      kind: target.kind,
      path: target.path
    }
  };

  if (input.reference.expectedTargetKind !== 'asset') {
    return resolvedReference;
  }

  return resolveAssetReference({
    reference: input.reference,
    resolvedReference,
    unresolved,
    referenceId: id,
    assetLookup: input.assetLookup,
    diagnostics: input.diagnostics
  });
}

function createUnresolvedReference(id: string, reference: ExtractedResolverV2Reference): ResolverV2Reference {
  return {
    id,
    kind: reference.kind,
    ...(reference.sourceId === undefined ? {} : { sourceId: reference.sourceId }),
    sourcePath: reference.sourcePath,
    fieldPath: reference.fieldPath,
    targetId: reference.targetId,
    expectedTargetKind: reference.expectedTargetKind,
    ...(reference.expectedAssetKinds === undefined ? {} : { expectedAssetKinds: reference.expectedAssetKinds }),
    status: 'unresolved'
  };
}

function resolveAssetReference(input: {
  reference: ExtractedResolverV2Reference;
  resolvedReference: ResolverV2Reference;
  unresolved: ResolverV2Reference;
  referenceId: string;
  assetLookup: ResolverV2AssetCatalogLookup;
  diagnostics: ResolverV2Diagnostic[];
}): ResolverV2Reference {
  const assetDefinitions = input.assetLookup.byId.get(input.reference.targetId) ?? [];
  if (assetDefinitions.length === 0) {
    input.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'error',
        code: 'RESOLVER_ASSET_DEFINITION_NOT_FOUND',
        message: 'Resolver V2 asset reference target has no asset definition in document.assets.',
        referenceId: input.referenceId,
        sourceId: input.reference.sourceId,
        sourcePath: input.reference.sourcePath,
        fieldPath: input.reference.fieldPath,
        targetId: input.reference.targetId,
        expectedTargetKind: 'asset'
      })
    );
    return input.unresolved;
  }

  if (input.assetLookup.duplicateIds.has(input.reference.targetId)) {
    input.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'error',
        code: 'RESOLVER_DUPLICATE_ASSET_ID',
        message: 'Resolver V2 asset reference target is ambiguous because document.assets contains duplicate ids.',
        referenceId: input.referenceId,
        sourceId: input.reference.sourceId,
        sourcePath: input.reference.sourcePath,
        fieldPath: input.reference.fieldPath,
        targetId: input.reference.targetId,
        expectedTargetKind: 'asset'
      })
    );
    return input.unresolved;
  }

  const asset = assetDefinitions[0];
  if (asset === undefined) {
    return input.unresolved;
  }

  if (input.assetLookup.unsafeSourceIds.has(input.reference.targetId)) {
    input.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'error',
        code: 'RESOLVER_ASSET_SOURCE_UNSAFE',
        message: 'Resolver V2 asset reference target has an unsafe source path.',
        referenceId: input.referenceId,
        sourceId: input.reference.sourceId,
        sourcePath: input.reference.sourcePath,
        fieldPath: input.reference.fieldPath,
        targetId: input.reference.targetId,
        expectedTargetKind: 'asset'
      })
    );
    return input.unresolved;
  }

  if (input.reference.expectedAssetKinds !== undefined && !input.reference.expectedAssetKinds.includes(asset.kind)) {
    input.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'error',
        code: 'RESOLVER_ASSET_TYPE_MISMATCH',
        message: 'Resolver V2 asset reference target kind did not match the expected asset kinds.',
        referenceId: input.referenceId,
        sourceId: input.reference.sourceId,
        sourcePath: input.reference.sourcePath,
        fieldPath: input.reference.fieldPath,
        targetId: input.reference.targetId,
        expectedTargetKind: 'asset',
        expectedAssetKinds: input.reference.expectedAssetKinds,
        actualAssetKind: asset.kind
      })
    );
    return input.unresolved;
  }

  return {
    ...input.resolvedReference,
    resolvedAsset: {
      id: asset.id,
      kind: asset.kind,
      path: asset.path,
      sourceKind: asset.sourceKind
    }
  };
}

function summarizeResolverV2Result(
  references: ResolverV2Reference[],
  diagnostics: ResolverV2Diagnostic[]
): ResolverV2Summary {
  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;
  const warningCount = diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length;
  const resolvedCount = references.filter((reference) => reference.status === 'resolved').length;

  return {
    referenceCount: references.length,
    resolvedCount,
    unresolvedCount: references.length - resolvedCount,
    errorCount,
    warningCount
  };
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function createAssetCatalogLookup(
  assets: ResolverV2AssetDefinition[],
  diagnostics: ResolverV2Diagnostic[]
): ResolverV2AssetCatalogLookup {
  const byId = new Map<string, ResolverV2AssetDefinition[]>();
  for (const asset of assets) {
    byId.set(asset.id, [...(byId.get(asset.id) ?? []), asset]);
  }

  return {
    byId,
    duplicateIds: new Set(diagnostics.filter((diagnostic) => diagnostic.code === 'RESOLVER_DUPLICATE_ASSET_ID').map((diagnostic) => diagnostic.targetId).filter(isString)),
    unsafeSourceIds: new Set(diagnostics.filter((diagnostic) => diagnostic.code === 'RESOLVER_ASSET_SOURCE_UNSAFE').map((diagnostic) => diagnostic.targetId).filter(isString))
  };
}

function filterCatalogDiagnostics(
  extractionDiagnostics: ResolverV2Diagnostic[],
  catalogDiagnostics: ResolverV2Diagnostic[]
): ResolverV2Diagnostic[] {
  const extractionHasInvalidDocument = extractionDiagnostics.some((diagnostic) => diagnostic.code === 'INVALID_RESOLVER_DOCUMENT');
  if (!extractionHasInvalidDocument) {
    return catalogDiagnostics;
  }

  return catalogDiagnostics.filter((diagnostic) => diagnostic.code !== 'INVALID_RESOLVER_DOCUMENT');
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}
