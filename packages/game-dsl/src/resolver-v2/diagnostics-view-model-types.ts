export type ResolverV2DiagnosticsViewModel = {
  summary: {
    resolverOk?: boolean;
    gateStatus?: string;
    referenceCount: number;
    unresolvedReferenceCount: number;
    diagnosticErrorCount: number;
    diagnosticWarningCount: number;
    blockerCount: number;
    warningCount: number;
    assetCount?: number;
    sceneCount?: number;
    entityCount?: number;
  };
  diagnostics: Array<{
    severity: string;
    code: string;
    message: string;
    referenceId?: string;
    sourcePath?: string;
    fieldPath?: string;
    targetId?: string;
    expectedTargetKind?: string;
    actualTargetKind?: string;
  }>;
  blockers: Array<{
    code: string;
    message: string;
    diagnosticCode?: string;
    referenceId?: string;
    sourcePath?: string;
    fieldPath?: string;
    targetId?: string;
    nodeId?: string;
  }>;
  references: Array<{
    id: string;
    kind: string;
    status: string;
    sourcePath: string;
    fieldPath: string;
    targetId: string;
  }>;
  assets: Array<{
    id: string;
    key: string;
    path: string;
    kind: string;
    sourceKind: string;
  }>;
  sceneGraph?: {
    nodeCount: number;
    edgeCount: number;
    scenes: Array<{ id: string; semanticId?: string; path: string }>;
    entities: Array<{ id: string; semanticId?: string; path: string; sceneId?: string; visible?: boolean }>;
    cameras: Array<{ id: string; semanticId?: string; path: string; sceneId?: string }>;
    spawns: Array<{ id: string; semanticId?: string; path: string; sceneId?: string }>;
  };
  traceEvents: Array<{
    id: string;
    type: string;
    at: string;
    severity: string;
  }>;
  warnings: string[];
};

export type CreateResolverV2DiagnosticsViewModelInput = {
  resolverResult?: unknown;
  gateResult?: unknown;
  traceEvents?: readonly unknown[];
};
