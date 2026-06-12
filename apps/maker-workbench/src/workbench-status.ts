import type { QaAssetSemanticSummary, QaReport } from './workbench-api.js';

export type WorkbenchStatusTone = 'good' | 'warn' | 'bad' | 'neutral';

export function resolveWorkbenchDisplayStatus(projectStatus: string | undefined, qaReport?: QaReport): string {
  if (qaReport?.overall_status !== undefined) {
    return qaReport.overall_status;
  }

  if (qaReport?.visual_status === 'VISUAL_QA_FAILED') {
    return 'VISUAL_QA_FAILED';
  }

  return projectStatus ?? 'LOCAL';
}

export function getWorkbenchStatusTone(status: string): WorkbenchStatusTone {
  if (['PLAYABLE', 'PASSED', 'DONE'].includes(status)) {
    return 'good';
  }

  if (['PLAYABLE_WITH_FALLBACK_ASSETS', 'PLAYABLE_WITH_ART_WARNINGS'].includes(status)) {
    return 'warn';
  }

  if (['QA_FAILED', 'BUILD_FAILED', 'PREVIEW_ARTIFACT_MISSING', 'DSL_VALIDATION_FAILED', 'FAILED', 'VISUAL_QA_FAILED', 'NEEDS_ASSET_REPAIR'].includes(status)) {
    return 'bad';
  }

  return 'neutral';
}

export function formatAssetSemanticFitSummary(asset: QaAssetSemanticSummary): string {
  const fit = asset.semantic_fit;
  if (fit === undefined) {
    return 'no semanticFit';
  }

  return [
    fit.status,
    fit.strictness,
    fit.expectedConcept === undefined ? undefined : `expected ${fit.expectedConcept}`,
    formatTagList('missing', fit.missingTags),
    formatTagList('conflict', fit.conflictingTags)
  ]
    .filter((part): part is string => part !== undefined && part.length > 0)
    .join(' ');
}

function formatTagList(label: string, values: string[] | undefined): string | undefined {
  return values === undefined || values.length === 0 ? undefined : `${label} ${values.join(', ')}`;
}
