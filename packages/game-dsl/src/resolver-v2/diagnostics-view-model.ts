import {
  readAssetRows,
  readGateResult,
  readResolverResult,
  readTraceEvents,
  toBlockerRows,
  toDiagnosticRows,
  toReferenceRows
} from './diagnostics-view-model-mappers.js';
import {
  summarizeGateSceneGraph,
  summarizeResolverSceneGraph
} from './diagnostics-view-model-scene-graph.js';
import type {
  CreateResolverV2DiagnosticsViewModelInput,
  ResolverV2DiagnosticsViewModel
} from './diagnostics-view-model-types.js';

export type {
  CreateResolverV2DiagnosticsViewModelInput,
  ResolverV2DiagnosticsViewModel
} from './diagnostics-view-model-types.js';

/**
 * Builds a read-only, audit-safe diagnostics view model from Resolver V2 outputs.
 */
export function createResolverV2DiagnosticsViewModel(
  input: CreateResolverV2DiagnosticsViewModelInput
): ResolverV2DiagnosticsViewModel {
  const warnings: string[] = [];
  const resolverResult = readResolverResult(input.resolverResult, warnings);
  const gateResult = readGateResult(input.gateResult, warnings);
  const diagnostics = toDiagnosticRows(resolverResult?.diagnostics ?? []);
  const blockers = toBlockerRows(gateResult?.blockers ?? []);
  const references = toReferenceRows(resolverResult?.references ?? []);
  const assets = readAssetRows(gateResult?.summary.assets);
  const sceneGraph = summarizeResolverSceneGraph(resolverResult?.sceneGraph) ?? summarizeGateSceneGraph(gateResult?.summary.sceneGraph);
  const traceEvents = readTraceEvents(input.traceEvents, warnings);

  return {
    summary: {
      ...(resolverResult === undefined ? {} : { resolverOk: resolverResult.ok }),
      ...(gateResult === undefined ? {} : { gateStatus: gateResult.status }),
      referenceCount: resolverResult?.summary.referenceCount ?? references.length,
      unresolvedReferenceCount: resolverResult?.summary.unresolvedCount ?? references.filter((reference) => reference.status === 'unresolved').length,
      diagnosticErrorCount: resolverResult?.summary.errorCount ?? diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length,
      diagnosticWarningCount: resolverResult?.summary.warningCount ?? diagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length,
      blockerCount: blockers.length,
      warningCount: gateResult?.warnings.length ?? 0,
      ...(assets.length === 0 ? {} : { assetCount: assets.length }),
      ...(sceneGraph === undefined ? {} : { sceneCount: sceneGraph.scenes.length, entityCount: sceneGraph.entities.length })
    },
    diagnostics,
    blockers,
    references,
    assets,
    ...(sceneGraph === undefined ? {} : { sceneGraph }),
    traceEvents,
    warnings
  };
}
