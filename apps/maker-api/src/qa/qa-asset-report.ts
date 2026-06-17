import { type AssetManifest, type AssetManifestValidationFailure } from '../../../../packages/asset-pipeline/src/index.js';
import { evaluateAssetSemanticQa, hasFallbackAssets, resolveQaOverallStatus, runtimeStatusFromQaStatus } from './asset-semantic-qa.js';
import type { QaAssetFailure, QaAssetReport, QaAssetRuntimeTelemetry, QaReport, QaStatus, RunQaInput } from './qa.types.js';

export function buildQaStatusFields(status: QaStatus, assetReport: QaAssetReport): Pick<QaReport, 'runtime_status' | 'asset_semantic_status' | 'overall_status'> {
  const runtimeStatus = runtimeStatusFromQaStatus(status);
  return {
    runtime_status: runtimeStatus,
    asset_semantic_status: assetReport.semantic_status,
    overall_status: resolveQaOverallStatus({
      runtimeStatus,
      assetSemanticStatus: assetReport.semantic_status,
      hasFallbackAssets: hasFallbackAssets(assetReport)
    })
  };
}

export function buildAssetReport(manifest: AssetManifest | undefined, runtime: QaAssetRuntimeTelemetry | undefined, failure?: QaAssetFailure): QaAssetReport {
  const assets = manifest?.assets ?? [];
  const semanticEvaluation = evaluateAssetSemanticQa(manifest);
  return {
    manifest_summary: manifest?.summary,
    semantic_status: semanticEvaluation.status,
    required: assets.filter((asset) => asset.required).map((asset) => asset.id),
    ready: assets.filter((asset) => asset.status === 'ready').map((asset) => asset.id),
    fallback_used: assets.filter((asset) => asset.status === 'fallback_used').map((asset) => asset.id),
    placeholder_used: assets.filter((asset) => asset.source === 'placeholder').map((asset) => asset.id),
    missing: assets.filter((asset) => asset.status === 'missing').map((asset) => asset.id),
    ...(runtime ? { runtime } : {}),
    assets: semanticEvaluation.assets,
    semantic_issues: semanticEvaluation.issues,
    sources: summarizeAssetSources(assets),
    failures: failure ? [failure] : []
  };
}

export function buildAssetGateFailure(failure: AssetManifestValidationFailure, messagePrefix?: string): QaAssetFailure {
  return {
    code: failure.code,
    message: messagePrefix === undefined ? failure.message : `${messagePrefix}: ${failure.message}`,
    asset_ids: failure.assetId === undefined ? [] : [failure.assetId],
    roles: failure.role === undefined ? [] : [failure.role]
  };
}

export function buildRuntimeAssetFailure(runtime: QaAssetRuntimeTelemetry | undefined, message: string | undefined): QaAssetFailure {
  if (runtime === undefined) {
    return {
      code: 'ASSET_LOAD_FAILED',
      message: message ?? 'Runtime asset validation failed.',
      asset_ids: [],
      roles: []
    };
  }

  const loaded = new Set(runtime.loaded);
  const notLoaded = runtime.required.filter((id) => !loaded.has(id));
  return {
    code: 'ASSET_LOAD_FAILED',
    message: message ?? 'Runtime asset validation failed.',
    asset_ids: uniqueStrings([...notLoaded, ...runtime.failed, ...runtime.missing]),
    roles: [...runtime.missing_required_roles]
  };
}

export function buildMissingRuntimeAssetFailure(
  genre: RunQaInput['genre'],
  browserResult: { visual_ok: boolean; interaction_ok: boolean; asset_runtime?: QaAssetRuntimeTelemetry }
): QaAssetFailure | undefined {
  if (
    (genre !== 'collector' && genre !== 'dodger' && genre !== 'shooter' && genre !== 'side_scrolling_run_and_gun') ||
    !browserResult.visual_ok ||
    !browserResult.interaction_ok ||
    browserResult.asset_runtime !== undefined
  ) {
    return undefined;
  }

  return {
    code: 'ASSET_LOAD_FAILED',
    message: `${qaGenreLabel(genre)} QA expected runtime asset telemetry in browser result.`,
    asset_ids: [],
    roles: []
  };
}

function summarizeAssetSources(assets: AssetManifest['assets']): QaAssetReport['sources'] {
  const sources = new Map<string, NonNullable<QaAssetReport['sources']>[number]>();

  for (const asset of assets) {
    if (
      asset.sourcePack === undefined ||
      asset.licenseId === undefined ||
      asset.licenseName === undefined ||
      asset.attribution === undefined ||
      asset.sourceUrl === undefined
    ) {
      continue;
    }

    sources.set([asset.sourcePack, asset.licenseId, asset.attribution, asset.sourceUrl].join('\u0000'), {
      source_pack: asset.sourcePack,
      license_id: asset.licenseId,
      license_name: asset.licenseName,
      attribution: asset.attribution,
      source_url: asset.sourceUrl
    });
  }

  return [...sources.values()];
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function qaGenreLabel(genre: RunQaInput['genre']): string {
  return `${genre.slice(0, 1).toUpperCase()}${genre.slice(1)}`;
}
