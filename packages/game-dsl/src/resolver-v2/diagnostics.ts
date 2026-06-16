import type {
  ResolverV2AssetKind,
  ResolverV2Diagnostic,
  ResolverV2DiagnosticCode,
  ResolverV2DiagnosticSeverity
} from './types.js';

export type CreateResolverV2DiagnosticInput = {
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

export function createResolverV2Diagnostic(input: CreateResolverV2DiagnosticInput): ResolverV2Diagnostic {
  return {
    severity: input.severity,
    code: input.code,
    message: input.message,
    ...(input.referenceId === undefined ? {} : { referenceId: input.referenceId }),
    ...(input.sourceId === undefined ? {} : { sourceId: input.sourceId }),
    ...(input.sourcePath === undefined ? {} : { sourcePath: input.sourcePath }),
    ...(input.fieldPath === undefined ? {} : { fieldPath: input.fieldPath }),
    ...(input.targetId === undefined ? {} : { targetId: input.targetId }),
    ...(input.expectedTargetKind === undefined ? {} : { expectedTargetKind: input.expectedTargetKind }),
    ...(input.actualTargetKind === undefined ? {} : { actualTargetKind: input.actualTargetKind }),
    ...(input.expectedAssetKinds === undefined ? {} : { expectedAssetKinds: [...input.expectedAssetKinds] }),
    ...(input.actualAssetKind === undefined ? {} : { actualAssetKind: input.actualAssetKind }),
    ...(input.cause === undefined ? {} : { cause: input.cause })
  };
}
