import { createResolverV2Diagnostic } from './diagnostics.js';
import type { ExtractedResolverV2Reference, ResolverV2Diagnostic } from './types.js';

export type ResolverV2ReferenceExtractionResult = {
  references: ExtractedResolverV2Reference[];
  diagnostics: ResolverV2Diagnostic[];
};

export type CollectStringReferenceInput = Pick<
  ExtractedResolverV2Reference,
  'kind' | 'sourceId' | 'sourcePath' | 'fieldPath' | 'expectedTargetKind' | 'expectedAssetKinds'
> & {
  value: unknown;
  result: ResolverV2ReferenceExtractionResult;
};

export function collectStringReference(input: CollectStringReferenceInput): void {
  if (typeof input.value === 'string' && input.value.trim().length > 0) {
    input.result.references.push({
      kind: input.kind,
      sourceId: input.sourceId,
      sourcePath: input.sourcePath,
      fieldPath: input.fieldPath,
      targetId: input.value,
      expectedTargetKind: input.expectedTargetKind,
      ...(input.expectedAssetKinds === undefined ? {} : { expectedAssetKinds: [...input.expectedAssetKinds] })
    });
    return;
  }

  if (input.value !== undefined) {
    input.result.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'warning',
        code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
        message: 'Resolver V2 reference value must be a non-empty string.',
        sourceId: input.sourceId,
        sourcePath: input.sourcePath,
        fieldPath: input.fieldPath,
        expectedTargetKind: input.expectedTargetKind
      })
    );
  }
}

export function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

export function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

export function sortedKeys(record: Record<string, unknown>): string[] {
  return Object.keys(record).sort(compareCodeUnits);
}

export function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
