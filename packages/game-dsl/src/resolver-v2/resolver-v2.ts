import { isSemanticId, parseSemanticId } from '../semantic-editing/index.js';
import type { SemanticId } from '../semantic-editing/index.js';
import { createResolverV2Diagnostic } from './diagnostics.js';
import { extractResolverV2References } from './reference-extractor.js';
import type {
  ExtractedResolverV2Reference,
  ResolverV2,
  ResolverV2Diagnostic,
  ResolverV2Reference,
  ResolverV2Request,
  ResolverV2Result,
  ResolverV2Summary
} from './types.js';

const UNSAFE_REFERENCE_SEGMENTS = new Set(['src', 'dist', 'build', 'apps', 'packages', 'generated', 'phaser']);
const CODE_FILE_EXTENSION_PATTERN = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/i;
const ASSET_FILE_EXTENSION_PATTERN = /\.(?:png|jpg|jpeg|gif|webp|svg|mp3|wav|ogg|json)$/i;

export function createResolverV2(): ResolverV2 {
  return {
    resolve: resolveSemanticDocumentV2
  };
}

export function resolveSemanticDocumentV2(request: ResolverV2Request): ResolverV2Result {
  const extraction = extractResolverV2References(request.document);
  const extractedReferences = [...extraction.references].sort((left, right) => compareCodeUnits(left.fieldPath, right.fieldPath));
  const diagnostics: ResolverV2Diagnostic[] = [...extraction.diagnostics];
  const references = extractedReferences.map((reference, index) =>
    resolveReference({
      reference,
      index,
      request,
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
  diagnostics: ResolverV2Diagnostic[];
}): ResolverV2Reference {
  const id = `resolver_ref:${input.reference.kind}:${input.index}`;
  const unresolved = createUnresolvedReference(id, input.reference);

  if (!isSafeResolverV2ReferenceTarget(input.reference.targetId)) {
    input.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'error',
        code: 'UNSAFE_RESOLVER_REFERENCE',
        message: 'Resolver V2 reference target must be a semantic id, not a path or generated-code address.',
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

  const target = input.request.semanticIndex.resolve(input.reference.targetId);
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

  return {
    ...unresolved,
    status: 'resolved',
    resolvedTarget: {
      id: target.id,
      kind: target.kind,
      path: target.path
    }
  };
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
    status: 'unresolved'
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

function isSafeResolverV2ReferenceTarget(targetId: string): targetId is SemanticId {
  if (!isSemanticId(targetId)) {
    return false;
  }

  if (targetId.startsWith('/') || targetId.includes('\\') || targetId.includes('\0') || targetId.includes('..')) {
    return false;
  }

  if (CODE_FILE_EXTENSION_PATTERN.test(targetId) || ASSET_FILE_EXTENSION_PATTERN.test(targetId)) {
    return false;
  }

  return !targetId
    .split(/[/:]/)
    .some((segment) => UNSAFE_REFERENCE_SEGMENTS.has(segment));
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
