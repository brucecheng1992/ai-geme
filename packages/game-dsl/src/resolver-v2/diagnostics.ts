import type {
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
    ...(input.cause === undefined ? {} : { cause: input.cause })
  };
}
