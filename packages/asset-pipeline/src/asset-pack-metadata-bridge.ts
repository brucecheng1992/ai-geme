import type { RuntimeArtAssetMetadata, RuntimeArtAssetMetadataExportArtifact } from './art-asset-metadata.runtime-export.js';

export type AssetPackBridgeCandidate = {
  asset_id?: string;
  source_path?: string;
  thumbnail_path?: string;
  asset_type?: string;
};

export type AssetPackMetadataBridgeInput = {
  runtimeMetadataArtifact: RuntimeArtAssetMetadataExportArtifact;
  candidates: AssetPackBridgeCandidate[];
};

export type AssetPackBridgeDiagnosticSeverity = 'error' | 'warning';

export type AssetPackBridgeDiagnosticCode =
  | 'ASSET_PACK_METADATA_BRIDGE_DUPLICATE_RUNTIME_ASSET_ID'
  | 'ASSET_PACK_METADATA_BRIDGE_DUPLICATE_CANDIDATE_ASSET_ID'
  | 'ASSET_PACK_METADATA_BRIDGE_RUNTIME_ASSET_WITHOUT_CANDIDATE'
  | 'ASSET_PACK_METADATA_BRIDGE_CANDIDATE_WITHOUT_RUNTIME_ASSET'
  | 'ASSET_PACK_METADATA_BRIDGE_SOURCE_PATH_MISMATCH'
  | 'ASSET_PACK_METADATA_BRIDGE_THUMBNAIL_PATH_MISMATCH'
  | 'ASSET_PACK_METADATA_BRIDGE_ABSOLUTE_PATH_REJECTED'
  | 'ASSET_PACK_METADATA_BRIDGE_MISSING_ASSET_ID';

export type AssetPackBridgeDiagnostic = {
  severity: AssetPackBridgeDiagnosticSeverity;
  code: AssetPackBridgeDiagnosticCode;
  message: string;
  assetId?: string;
  candidatePath?: string;
  runtimePath?: string;
  jsonPath?: string;
};

export type AssetPackMetadataBridgeSummary = {
  bridge_version: '0.1';
  ok: boolean;
  runtime_asset_count: number;
  candidate_count: number;
  matched_count: number;
  diagnostic_count: number;
  diagnostics: AssetPackBridgeDiagnostic[];
};

type IndexedRuntimeAsset = {
  asset: RuntimeArtAssetMetadata;
  index: number;
};

type IndexedCandidate = {
  candidate: AssetPackBridgeCandidate;
  index: number;
};

/**
 * Builds a deterministic, report-only bridge summary from runtime-safe metadata
 * and explicit asset-pack-like candidates. This helper never discovers packs,
 * checks the filesystem, mutates metadata, or changes resolver decisions.
 */
export function createAssetPackMetadataBridgeSummary(input: AssetPackMetadataBridgeInput): AssetPackMetadataBridgeSummary {
  const runtimeAssets = input.runtimeMetadataArtifact.assets.map((asset, index) => ({ asset, index })).sort(compareRuntimeAssets);
  const candidates = input.candidates.map((candidate, index) => ({ candidate, index })).sort(compareCandidates);
  const diagnostics: AssetPackBridgeDiagnostic[] = [];

  const runtimeByAssetId = new Map<string, IndexedRuntimeAsset>();
  const candidateByAssetId = new Map<string, IndexedCandidate>();
  const duplicateRuntimeAssetIds = collectDuplicateAssetIds(runtimeAssets.map(({ asset }) => asset.asset_id));
  const duplicateCandidateAssetIds = collectDuplicateAssetIds(
    candidates.map(({ candidate }) => candidate.asset_id).filter((assetId): assetId is string => assetId !== undefined && assetId.length > 0)
  );

  for (const runtimeAsset of runtimeAssets) {
    if (!runtimeByAssetId.has(runtimeAsset.asset.asset_id)) {
      runtimeByAssetId.set(runtimeAsset.asset.asset_id, runtimeAsset);
    }
    diagnostics.push(...validateRuntimePaths(runtimeAsset));
  }

  for (const candidate of candidates) {
    if (candidate.candidate.asset_id === undefined || candidate.candidate.asset_id.length === 0) {
      diagnostics.push(
        createDiagnostic(
          'ASSET_PACK_METADATA_BRIDGE_MISSING_ASSET_ID',
          'Bridge candidate is missing asset_id.',
          { jsonPath: `$.candidates[${candidate.index}].asset_id` }
        )
      );
    } else if (!candidateByAssetId.has(candidate.candidate.asset_id)) {
      candidateByAssetId.set(candidate.candidate.asset_id, candidate);
    }
    diagnostics.push(...validateCandidatePaths(candidate));
  }

  for (const assetId of duplicateRuntimeAssetIds) {
    diagnostics.push(
      createDiagnostic(
        'ASSET_PACK_METADATA_BRIDGE_DUPLICATE_RUNTIME_ASSET_ID',
        `Runtime metadata contains duplicate asset_id "${assetId}".`,
        { assetId, jsonPath: '$.runtimeMetadataArtifact.assets' }
      )
    );
  }

  for (const assetId of duplicateCandidateAssetIds) {
    diagnostics.push(
      createDiagnostic(
        'ASSET_PACK_METADATA_BRIDGE_DUPLICATE_CANDIDATE_ASSET_ID',
        `Bridge candidates contain duplicate asset_id "${assetId}".`,
        { assetId, jsonPath: '$.candidates' }
      )
    );
  }

  for (const { asset, index } of runtimeAssets) {
    const candidate = candidateByAssetId.get(asset.asset_id);
    if (candidate === undefined) {
      diagnostics.push(
        createDiagnostic(
          'ASSET_PACK_METADATA_BRIDGE_RUNTIME_ASSET_WITHOUT_CANDIDATE',
          `Runtime metadata asset "${asset.asset_id}" has no bridge candidate.`,
          {
            assetId: asset.asset_id,
            runtimePath: safeDiagnosticPath(asset.technical.source_path),
            jsonPath: `$.runtimeMetadataArtifact.assets[${index}].asset_id`
          }
        )
      );
      continue;
    }

    diagnostics.push(...compareBridgePaths(asset, candidate));
  }

  for (const { candidate, index } of candidates) {
    if (candidate.asset_id === undefined || candidate.asset_id.length === 0 || runtimeByAssetId.has(candidate.asset_id)) {
      continue;
    }
    diagnostics.push(
      createDiagnostic(
        'ASSET_PACK_METADATA_BRIDGE_CANDIDATE_WITHOUT_RUNTIME_ASSET',
        `Bridge candidate "${candidate.asset_id}" has no runtime metadata asset.`,
        {
          assetId: candidate.asset_id,
          candidatePath: safeDiagnosticPath(candidate.source_path),
          jsonPath: `$.candidates[${index}].asset_id`
        }
      )
    );
  }

  const sortedDiagnostics = sortDiagnostics(diagnostics);
  const matchedCount = [...runtimeByAssetId.keys()].filter((assetId) => candidateByAssetId.has(assetId)).length;

  return {
    bridge_version: '0.1',
    ok: sortedDiagnostics.length === 0,
    runtime_asset_count: input.runtimeMetadataArtifact.asset_count,
    candidate_count: input.candidates.length,
    matched_count: matchedCount,
    diagnostic_count: sortedDiagnostics.length,
    diagnostics: sortedDiagnostics
  };
}

function validateRuntimePaths({ asset, index }: IndexedRuntimeAsset): AssetPackBridgeDiagnostic[] {
  return [
    validatePath(asset.technical.source_path, `$.runtimeMetadataArtifact.assets[${index}].technical.source_path`, asset.asset_id, 'Runtime metadata source_path'),
    validatePath(
      asset.technical.thumbnail_path,
      `$.runtimeMetadataArtifact.assets[${index}].technical.thumbnail_path`,
      asset.asset_id,
      'Runtime metadata thumbnail_path'
    )
  ].filter((diagnostic): diagnostic is AssetPackBridgeDiagnostic => diagnostic !== undefined);
}

function validateCandidatePaths({ candidate, index }: IndexedCandidate): AssetPackBridgeDiagnostic[] {
  return [
    validatePath(candidate.source_path, `$.candidates[${index}].source_path`, candidate.asset_id, 'Bridge candidate source_path'),
    validatePath(candidate.thumbnail_path, `$.candidates[${index}].thumbnail_path`, candidate.asset_id, 'Bridge candidate thumbnail_path')
  ].filter((diagnostic): diagnostic is AssetPackBridgeDiagnostic => diagnostic !== undefined);
}

function validatePath(
  value: string | undefined,
  jsonPath: string,
  assetId: string | undefined,
  fieldLabel: string
): AssetPackBridgeDiagnostic | undefined {
  if (value === undefined || isRuntimeSafeRelativePath(value)) {
    return undefined;
  }

  return createDiagnostic(
    'ASSET_PACK_METADATA_BRIDGE_ABSOLUTE_PATH_REJECTED',
    `${fieldLabel} must be project-relative and non-absolute.`,
    { assetId, jsonPath }
  );
}

function compareBridgePaths(asset: RuntimeArtAssetMetadata, candidate: IndexedCandidate): AssetPackBridgeDiagnostic[] {
  const diagnostics: AssetPackBridgeDiagnostic[] = [];

  if (candidate.candidate.source_path !== undefined && candidate.candidate.source_path !== asset.technical.source_path) {
    diagnostics.push(
      createDiagnostic(
        'ASSET_PACK_METADATA_BRIDGE_SOURCE_PATH_MISMATCH',
        `Candidate source_path does not match runtime metadata source_path for asset "${asset.asset_id}".`,
        {
          assetId: asset.asset_id,
          candidatePath: safeDiagnosticPath(candidate.candidate.source_path),
          runtimePath: safeDiagnosticPath(asset.technical.source_path),
          jsonPath: `$.candidates[${candidate.index}].source_path`
        }
      )
    );
  }

  if (candidate.candidate.thumbnail_path !== undefined && candidate.candidate.thumbnail_path !== asset.technical.thumbnail_path) {
    diagnostics.push(
      createDiagnostic(
        'ASSET_PACK_METADATA_BRIDGE_THUMBNAIL_PATH_MISMATCH',
        `Candidate thumbnail_path does not match runtime metadata thumbnail_path for asset "${asset.asset_id}".`,
        {
          assetId: asset.asset_id,
          candidatePath: safeDiagnosticPath(candidate.candidate.thumbnail_path),
          runtimePath: safeDiagnosticPath(asset.technical.thumbnail_path),
          jsonPath: `$.candidates[${candidate.index}].thumbnail_path`
        }
      )
    );
  }

  return diagnostics;
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
  code: AssetPackBridgeDiagnosticCode,
  message: string,
  options: Omit<AssetPackBridgeDiagnostic, 'severity' | 'code' | 'message'>
): AssetPackBridgeDiagnostic {
  return {
    severity: 'error',
    code,
    message,
    ...(options.assetId === undefined ? {} : { assetId: options.assetId }),
    ...(options.candidatePath === undefined ? {} : { candidatePath: options.candidatePath }),
    ...(options.runtimePath === undefined ? {} : { runtimePath: options.runtimePath }),
    ...(options.jsonPath === undefined ? {} : { jsonPath: options.jsonPath })
  };
}

function compareRuntimeAssets(left: IndexedRuntimeAsset, right: IndexedRuntimeAsset): number {
  return left.asset.asset_id.localeCompare(right.asset.asset_id) || left.index - right.index;
}

function compareCandidates(left: IndexedCandidate, right: IndexedCandidate): number {
  return (
    (left.candidate.asset_id ?? '').localeCompare(right.candidate.asset_id ?? '') ||
    (left.candidate.source_path ?? '').localeCompare(right.candidate.source_path ?? '') ||
    (left.candidate.thumbnail_path ?? '').localeCompare(right.candidate.thumbnail_path ?? '') ||
    left.index - right.index
  );
}

function sortDiagnostics(diagnostics: AssetPackBridgeDiagnostic[]): AssetPackBridgeDiagnostic[] {
  return [...diagnostics].sort((left, right) => {
    return (
      left.code.localeCompare(right.code) ||
      (left.assetId ?? '').localeCompare(right.assetId ?? '') ||
      (left.candidatePath ?? '').localeCompare(right.candidatePath ?? '') ||
      (left.runtimePath ?? '').localeCompare(right.runtimePath ?? '') ||
      (left.jsonPath ?? '').localeCompare(right.jsonPath ?? '') ||
      left.message.localeCompare(right.message)
    );
  });
}

function safeDiagnosticPath(value: string | undefined): string | undefined {
  if (value === undefined || !isRuntimeSafeRelativePath(value)) {
    return undefined;
  }
  return value;
}

function isRuntimeSafeRelativePath(value: string): boolean {
  if (value.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(value) || /^[A-Za-z]:[\\/]/.test(value) || value.includes('\\')) {
    return false;
  }
  return value.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}
