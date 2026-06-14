import type { AssetManifest } from '../../../../packages/asset-pipeline/src/index.js';
import type { AssetSemanticStatus, OverallStatus, QaAssetReport, QaAssetSemanticIssue, QaAssetSemanticSummary, QaStatus, RuntimeStatus } from './qa.types.js';

type AssetSemanticFit = NonNullable<AssetManifest['assets'][number]['semanticFit']>;

export type AssetSemanticEvaluation = {
  status: AssetSemanticStatus;
  assets: QaAssetSemanticSummary[];
  issues: QaAssetSemanticIssue[];
};

export function evaluateAssetSemanticQa(manifest: AssetManifest | undefined): AssetSemanticEvaluation {
  const assets = (manifest?.assets ?? []).map(toAssetSemanticSummary);
  const issues = assets.flatMap((asset) => {
    const issue = toAssetSemanticIssue(asset);
    return issue === undefined ? [] : [issue];
  });

  return {
    status: summarizeAssetSemanticStatus(assets),
    assets,
    issues
  };
}

export function runtimeStatusFromQaStatus(status: QaStatus): RuntimeStatus {
  return status === 'PASSED' ? 'PASSED' : 'FAILED';
}

export function resolveQaOverallStatus(input: {
  runtimeStatus: RuntimeStatus;
  assetSemanticStatus: AssetSemanticStatus;
  hasFallbackAssets: boolean;
}): OverallStatus {
  if (input.runtimeStatus === 'FAILED') {
    return 'QA_FAILED';
  }

  if (input.assetSemanticStatus === 'FAILED') {
    return 'NEEDS_ASSET_REPAIR';
  }

  if (input.assetSemanticStatus === 'WARNING') {
    return 'PLAYABLE_WITH_ART_WARNINGS';
  }

  return input.hasFallbackAssets ? 'PLAYABLE_WITH_FALLBACK_ASSETS' : 'PLAYABLE';
}

export function hasFallbackAssets(report: Pick<QaAssetReport, 'assets' | 'fallback_used'>): boolean {
  return report.fallback_used.length > 0 || report.assets.some((asset) => asset.semantic_fit?.status === 'fallback_generated');
}

function toAssetSemanticSummary(asset: AssetManifest['assets'][number]): QaAssetSemanticSummary {
  return {
    id: asset.id,
    role: asset.role,
    source: asset.source,
    source_pack: asset.sourcePack,
    semantic_status: classifySemanticFit(asset.semanticFit),
    ...(asset.semanticFit === undefined ? {} : { semantic_fit: asset.semanticFit })
  };
}

function toAssetSemanticIssue(asset: QaAssetSemanticSummary): QaAssetSemanticIssue | undefined {
  const semanticFit = asset.semantic_fit;
  if (asset.semantic_status === 'PASSED' || semanticFit === undefined) {
    return undefined;
  }

  return {
    severity: asset.semantic_status === 'FAILED' ? 'failure' : 'warning',
    asset_id: asset.id,
    role: asset.role,
    semantic_fit_status: semanticFit.status,
    strictness: semanticFit.strictness,
    expected_concept: semanticFit.expectedConcept,
    missing_tags: semanticFit.missingTags ?? [],
    conflicting_tags: semanticFit.conflictingTags ?? [],
    reason: semanticFit.reason ?? `Asset ${asset.id} semantic fit is ${semanticFit.status}.`
  };
}

function summarizeAssetSemanticStatus(assets: QaAssetSemanticSummary[]): AssetSemanticStatus {
  if (assets.some((asset) => asset.semantic_status === 'FAILED')) {
    return 'FAILED';
  }

  if (assets.some((asset) => asset.semantic_status === 'WARNING')) {
    return 'WARNING';
  }

  return 'PASSED';
}

function classifySemanticFit(semanticFit: AssetSemanticFit | undefined): AssetSemanticStatus {
  if (semanticFit === undefined) {
    return 'PASSED';
  }

  if (semanticFit.status === 'mismatch' || semanticFit.status === 'unknown') {
    return semanticFit.strictness === 'hard' ? 'FAILED' : 'WARNING';
  }

  return 'PASSED';
}
