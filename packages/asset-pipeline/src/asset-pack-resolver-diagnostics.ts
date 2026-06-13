import type { RuntimeArtAssetMetadata, RuntimeArtAssetMetadataExportArtifact } from './art-asset-metadata.runtime-export.js';

export type AssetResolverDiagnosticsInput = {
  runtimeMetadataArtifact: RuntimeArtAssetMetadataExportArtifact;
  requestedAssetIds: string[];
  context?: {
    contextId?: string;
  };
};

export type AssetResolverDiagnosticSeverity = 'error' | 'warning';

export type AssetResolverDiagnosticCode =
  | 'ASSET_RESOLVER_DIAGNOSTIC_MISSING_ASSET_ID'
  | 'ASSET_RESOLVER_DIAGNOSTIC_BLOCKED_CONTEXT'
  | 'ASSET_RESOLVER_DIAGNOSTIC_DUPLICATE_ASSET_ID'
  | 'ASSET_RESOLVER_DIAGNOSTIC_ABSOLUTE_PATH_REJECTED';

export type AssetResolverDiagnostic = {
  severity: AssetResolverDiagnosticSeverity;
  code: AssetResolverDiagnosticCode;
  message: string;
  assetId?: string;
  jsonPath?: string;
};

export type AssetResolverDiagnosticsSummary = {
  diagnostics_version: '0.1';
  ok: boolean;
  requested_count: number;
  resolved_count: number;
  diagnostic_count: number;
  diagnostics: AssetResolverDiagnostic[];
};

type IndexedRuntimeAsset = {
  asset: RuntimeArtAssetMetadata;
  index: number;
};

/**
 * Builds deterministic resolver-adjacent diagnostics from runtime-safe metadata
 * and explicit requested IDs. It is report-only and never calls resolver paths,
 * reads packs, writes assets, or changes runtime behavior.
 */
export function createAssetResolverDiagnosticsSummary(input: AssetResolverDiagnosticsInput): AssetResolverDiagnosticsSummary {
  const runtimeAssets = input.runtimeMetadataArtifact.assets.map((asset, index) => ({ asset, index })).sort(compareRuntimeAssets);
  const diagnostics: AssetResolverDiagnostic[] = [];
  const runtimeByAssetId = new Map<string, IndexedRuntimeAsset>();
  const duplicateRuntimeAssetIds = collectDuplicateAssetIds(runtimeAssets.map(({ asset }) => asset.asset_id));

  for (const runtimeAsset of runtimeAssets) {
    if (!runtimeByAssetId.has(runtimeAsset.asset.asset_id)) {
      runtimeByAssetId.set(runtimeAsset.asset.asset_id, runtimeAsset);
    }
    diagnostics.push(...validateRuntimePaths(runtimeAsset));
  }

  for (const assetId of duplicateRuntimeAssetIds) {
    diagnostics.push(
      createDiagnostic(
        'ASSET_RESOLVER_DIAGNOSTIC_DUPLICATE_ASSET_ID',
        `Runtime metadata contains duplicate asset_id "${assetId}".`,
        { assetId, jsonPath: '$.runtimeMetadataArtifact.assets' }
      )
    );
  }

  const requestedAssetIds = [...input.requestedAssetIds].sort((left, right) => left.localeCompare(right));
  for (const assetId of requestedAssetIds) {
    const runtimeAsset = runtimeByAssetId.get(assetId);
    if (runtimeAsset === undefined) {
      diagnostics.push(
        createDiagnostic(
          'ASSET_RESOLVER_DIAGNOSTIC_MISSING_ASSET_ID',
          `Requested asset_id "${assetId}" is not present in runtime metadata.`,
          { assetId, jsonPath: '$.requestedAssetIds' }
        )
      );
      continue;
    }

    if (input.context?.contextId !== undefined && runtimeAsset.asset.gameplay.blocked_contexts.includes(input.context.contextId)) {
      diagnostics.push(
        createDiagnostic(
          'ASSET_RESOLVER_DIAGNOSTIC_BLOCKED_CONTEXT',
          `Requested asset_id "${assetId}" is blocked in context "${input.context.contextId}".`,
          { assetId, jsonPath: `$.runtimeMetadataArtifact.assets[${runtimeAsset.index}].gameplay.blocked_contexts` }
        )
      );
    }
  }

  const sortedDiagnostics = sortDiagnostics(diagnostics);

  return {
    diagnostics_version: '0.1',
    ok: sortedDiagnostics.length === 0,
    requested_count: input.requestedAssetIds.length,
    resolved_count: input.requestedAssetIds.filter((assetId) => runtimeByAssetId.has(assetId)).length,
    diagnostic_count: sortedDiagnostics.length,
    diagnostics: sortedDiagnostics
  };
}

function validateRuntimePaths({ asset, index }: IndexedRuntimeAsset): AssetResolverDiagnostic[] {
  return [
    validatePath(asset.technical.source_path, `$.runtimeMetadataArtifact.assets[${index}].technical.source_path`, asset.asset_id, 'Runtime metadata source_path'),
    validatePath(
      asset.technical.thumbnail_path,
      `$.runtimeMetadataArtifact.assets[${index}].technical.thumbnail_path`,
      asset.asset_id,
      'Runtime metadata thumbnail_path'
    )
  ].filter((diagnostic): diagnostic is AssetResolverDiagnostic => diagnostic !== undefined);
}

function validatePath(
  value: string,
  jsonPath: string,
  assetId: string,
  fieldLabel: string
): AssetResolverDiagnostic | undefined {
  if (isRuntimeSafeRelativePath(value)) {
    return undefined;
  }

  return createDiagnostic(
    'ASSET_RESOLVER_DIAGNOSTIC_ABSOLUTE_PATH_REJECTED',
    `${fieldLabel} must be project-relative and non-absolute.`,
    { assetId, jsonPath }
  );
}

function collectDuplicateAssetIds(assetIds: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const assetId of assetIds) {
    if (seen.has(assetId)) {
      duplicates.add(assetId);
    } else {
      seen.add(assetId);
    }
  }
  return [...duplicates].sort((left, right) => left.localeCompare(right));
}

function createDiagnostic(
  code: AssetResolverDiagnosticCode,
  message: string,
  options: Omit<AssetResolverDiagnostic, 'severity' | 'code' | 'message'>
): AssetResolverDiagnostic {
  return {
    severity: 'error',
    code,
    message,
    ...(options.assetId === undefined ? {} : { assetId: options.assetId }),
    ...(options.jsonPath === undefined ? {} : { jsonPath: options.jsonPath })
  };
}

function compareRuntimeAssets(left: IndexedRuntimeAsset, right: IndexedRuntimeAsset): number {
  return left.asset.asset_id.localeCompare(right.asset.asset_id) || left.index - right.index;
}

function sortDiagnostics(diagnostics: AssetResolverDiagnostic[]): AssetResolverDiagnostic[] {
  return [...diagnostics].sort((left, right) => {
    return (
      left.code.localeCompare(right.code) ||
      (left.assetId ?? '').localeCompare(right.assetId ?? '') ||
      (left.jsonPath ?? '').localeCompare(right.jsonPath ?? '') ||
      left.message.localeCompare(right.message)
    );
  });
}

function isRuntimeSafeRelativePath(value: string): boolean {
  if (value.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(value) || /^[A-Za-z]:[\\/]/.test(value) || value.includes('\\')) {
    return false;
  }
  return value.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}
