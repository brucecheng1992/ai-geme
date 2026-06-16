import type {
  ResolverV2Diagnostic,
  ResolverV2IrGateBlocker,
  ResolverV2IrGateResult,
  ResolverV2Result
} from './types.js';

export type ResolverV2TraceSummary = {
  ok?: boolean;
  referenceCount?: number;
  resolvedReferenceCount?: number;
  unresolvedReferenceCount?: number;
  diagnosticErrorCount?: number;
  diagnosticWarningCount?: number;
  assetCount?: number;
  sceneCount?: number;
  entityCount?: number;
  gateStatus?: string;
  blockerCount?: number;
  warningCount?: number;
};

export type ResolverV2TraceDiagnosticSummary = {
  severity: string;
  code: string;
  referenceId?: string;
  sourcePath?: string;
  fieldPath?: string;
  targetId?: string;
};

export type ResolverV2TraceBlockerSummary = {
  code: string;
  diagnosticCode?: string;
  referenceId?: string;
  sourcePath?: string;
  fieldPath?: string;
  targetId?: string;
  nodeId?: string;
};

export function summarizeResolverV2ResultForTrace(result: ResolverV2Result): ResolverV2TraceSummary {
  return {
    ok: result.ok,
    referenceCount: result.summary.referenceCount,
    resolvedReferenceCount: result.summary.resolvedCount,
    unresolvedReferenceCount: result.summary.unresolvedCount,
    diagnosticErrorCount: result.summary.errorCount,
    diagnosticWarningCount: result.summary.warningCount,
    sceneCount: result.summary.sceneCount,
    entityCount: result.summary.entityCount
  };
}

export function summarizeResolverV2GateResultForTrace(result: ResolverV2IrGateResult): ResolverV2TraceSummary {
  return {
    ok: result.ok,
    gateStatus: result.status,
    referenceCount: result.summary.referenceCount,
    resolvedReferenceCount: result.summary.resolvedReferenceCount,
    unresolvedReferenceCount: result.summary.unresolvedReferenceCount,
    diagnosticErrorCount: result.summary.errorCount,
    diagnosticWarningCount: result.summary.warningCount,
    assetCount: result.summary.assets?.length,
    sceneCount: result.summary.sceneGraph?.sceneCount,
    entityCount: result.summary.sceneGraph?.entityCount,
    blockerCount: result.blockers.length,
    warningCount: result.warnings.length
  };
}

export function summarizeResolverV2DiagnosticsForTrace(
  diagnostics: readonly ResolverV2Diagnostic[]
): ResolverV2TraceDiagnosticSummary[] {
  return diagnostics.map((diagnostic) => ({
    severity: diagnostic.severity,
    code: diagnostic.code,
    ...(diagnostic.referenceId === undefined ? {} : { referenceId: diagnostic.referenceId }),
    ...(diagnostic.sourcePath === undefined ? {} : { sourcePath: diagnostic.sourcePath }),
    ...(diagnostic.fieldPath === undefined ? {} : { fieldPath: diagnostic.fieldPath }),
    ...(diagnostic.targetId === undefined ? {} : { targetId: diagnostic.targetId })
  }));
}

export function summarizeResolverV2BlockersForTrace(
  blockers: readonly ResolverV2IrGateBlocker[]
): ResolverV2TraceBlockerSummary[] {
  return blockers.map((blocker) => ({
    code: blocker.code,
    ...(blocker.diagnosticCode === undefined ? {} : { diagnosticCode: blocker.diagnosticCode }),
    ...(blocker.referenceId === undefined ? {} : { referenceId: blocker.referenceId }),
    ...(blocker.sourcePath === undefined ? {} : { sourcePath: blocker.sourcePath }),
    ...(blocker.fieldPath === undefined ? {} : { fieldPath: blocker.fieldPath }),
    ...(blocker.targetId === undefined ? {} : { targetId: blocker.targetId }),
    ...(blocker.nodeId === undefined ? {} : { nodeId: blocker.nodeId })
  }));
}
