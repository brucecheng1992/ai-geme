import type { RuntimeArtAssetMetadata, RuntimeArtAssetMetadataExportArtifact } from './art-asset-metadata.runtime-export.js';
import type { AssetPackBridgeDiagnostic } from './asset-pack-metadata-bridge.js';
import type { AssetResolverDiagnostic } from './asset-pack-resolver-diagnostics.js';
import { createAssetPackMetadataBridgeSummary } from './asset-pack-metadata-bridge.js';
import { createAssetResolverDiagnosticsSummary } from './asset-pack-resolver-diagnostics.js';

export const ART_ASSET_WORKBENCH_PREVIEW_VERSION = '0.1' as const;
export const SMALL_LIBRARY_WORKBENCH_PREVIEW_FIXTURE_ROOT = 'tests/fixtures/art-library-small-v0.1' as const;

export const ART_ASSET_WORKBENCH_PREVIEW_ALLOWED_FIELDS = [
  'asset_id',
  'asset_type',
  'title',
  'description',
  'status',
  'version',
  'semantic.tags',
  'semantic.visual_style',
  'semantic.world',
  'semantic.mood',
  'gameplay.role',
  'gameplay.affordances',
  'gameplay.allowed_contexts',
  'gameplay.blocked_contexts',
  'technical.file_format',
  'technical.thumbnail_path',
  'technical.texture_resolution',
  'technical.polycount_lod0',
  'technical.platform_budget',
  'relations.variant_of',
  'relations.compatible_with',
  'runtime_metadata_version',
  'generated_by',
  'asset_count',
  'diagnostics.severity',
  'diagnostics.code',
  'diagnostics.assetId',
  'diagnostics.jsonPath',
  'diagnostics.message',
  'diagnostics.safePath'
] as const;

export const ART_ASSET_WORKBENCH_PREVIEW_BLOCKED_FIELDS = [
  'prompt',
  'seed',
  'ai_generation',
  'workflow',
  'rights',
  'search',
  'technical.source_path',
  'absolute_local_path',
  'production_default_asset_pack_path',
  'large_library_path',
  'raw_sidecar_json'
] as const;

export type ArtAssetWorkbenchPreviewAsset = {
  asset_id: string;
  asset_type: RuntimeArtAssetMetadata['asset_type'];
  title: string;
  description: string;
  status: RuntimeArtAssetMetadata['status'];
  version: string;
  semantic: {
    tags: string[];
    visual_style: string[];
    world: string;
    mood?: string[];
  };
  gameplay: {
    role: string[];
    affordances: string[];
    allowed_contexts: string[];
    blocked_contexts: string[];
  };
  technical: {
    file_format: RuntimeArtAssetMetadata['technical']['file_format'];
    thumbnail_path: string;
    texture_resolution?: NonNullable<RuntimeArtAssetMetadata['technical']['texture_resolution']>;
    polycount_lod0?: number;
    platform_budget?: string[];
  };
  relations?: {
    variant_of?: string;
    compatible_with?: string[];
  };
};

export type ArtAssetWorkbenchPreviewDiagnostic = {
  source: 'bridge' | 'resolver';
  severity: 'error' | 'warning';
  code: string;
  message: string;
  assetId?: string;
  jsonPath?: string;
  safePath?: string;
};

export type ArtAssetWorkbenchPreview = {
  preview_version: typeof ART_ASSET_WORKBENCH_PREVIEW_VERSION;
  source: 'small-library-runtime-safe-export';
  fixture: typeof SMALL_LIBRARY_WORKBENCH_PREVIEW_FIXTURE_ROOT;
  read_only: true;
  ok: boolean;
  runtime_metadata_version: RuntimeArtAssetMetadataExportArtifact['runtime_metadata_version'];
  generated_by: RuntimeArtAssetMetadataExportArtifact['generated_by'];
  asset_count: number;
  allowed_fields: typeof ART_ASSET_WORKBENCH_PREVIEW_ALLOWED_FIELDS;
  blocked_fields: typeof ART_ASSET_WORKBENCH_PREVIEW_BLOCKED_FIELDS;
  assets: ArtAssetWorkbenchPreviewAsset[];
  diagnostics: {
    bridge: {
      ok: boolean;
      matched_count: number;
      diagnostic_count: number;
      items: ArtAssetWorkbenchPreviewDiagnostic[];
    };
    resolver: {
      ok: boolean;
      resolved_count: number;
      diagnostic_count: number;
      items: ArtAssetWorkbenchPreviewDiagnostic[];
    };
  };
};

export function createSmallLibraryWorkbenchPreview(
  artifact: RuntimeArtAssetMetadataExportArtifact
): ArtAssetWorkbenchPreview {
  assertSmallLibraryPreviewPaths(artifact);

  const candidates = artifact.assets.map((asset) => ({
    asset_id: asset.asset_id,
    source_path: asset.technical.source_path,
    thumbnail_path: asset.technical.thumbnail_path,
    asset_type: asset.asset_type
  }));
  const requestedAssetIds = artifact.assets.map((asset) => asset.asset_id).sort((left, right) => left.localeCompare(right));
  const bridge = createAssetPackMetadataBridgeSummary({ runtimeMetadataArtifact: artifact, candidates });
  const resolver = createAssetResolverDiagnosticsSummary({ runtimeMetadataArtifact: artifact, requestedAssetIds });

  return {
    preview_version: ART_ASSET_WORKBENCH_PREVIEW_VERSION,
    source: 'small-library-runtime-safe-export',
    fixture: SMALL_LIBRARY_WORKBENCH_PREVIEW_FIXTURE_ROOT,
    read_only: true,
    ok: bridge.ok && resolver.ok,
    runtime_metadata_version: artifact.runtime_metadata_version,
    generated_by: artifact.generated_by,
    asset_count: artifact.asset_count,
    allowed_fields: ART_ASSET_WORKBENCH_PREVIEW_ALLOWED_FIELDS,
    blocked_fields: ART_ASSET_WORKBENCH_PREVIEW_BLOCKED_FIELDS,
    assets: artifact.assets.map(toPreviewAsset),
    diagnostics: {
      bridge: {
        ok: bridge.ok,
        matched_count: bridge.matched_count,
        diagnostic_count: bridge.diagnostic_count,
        items: bridge.diagnostics.map((diagnostic) => toPreviewDiagnostic('bridge', diagnostic))
      },
      resolver: {
        ok: resolver.ok,
        resolved_count: resolver.resolved_count,
        diagnostic_count: resolver.diagnostic_count,
        items: resolver.diagnostics.map((diagnostic) => toPreviewDiagnostic('resolver', diagnostic))
      }
    }
  };
}

function assertSmallLibraryPreviewPaths(artifact: RuntimeArtAssetMetadataExportArtifact): void {
  const unsafePath = artifact.assets.some(
    (asset) => !isSmallLibraryFixturePath(asset.technical.source_path) || !isSmallLibraryFixturePath(asset.technical.thumbnail_path)
  );
  if (unsafePath) {
    throw new Error('Small library Workbench preview rejected an out-of-scope runtime metadata path.');
  }
}

function isSmallLibraryFixturePath(value: string): boolean {
  return value.startsWith(`${SMALL_LIBRARY_WORKBENCH_PREVIEW_FIXTURE_ROOT}/`);
}

function toPreviewAsset(asset: RuntimeArtAssetMetadata): ArtAssetWorkbenchPreviewAsset {
  return {
    asset_id: asset.asset_id,
    asset_type: asset.asset_type,
    title: asset.title,
    description: asset.description,
    status: asset.status,
    version: asset.version,
    semantic: {
      tags: [...asset.semantic.tags],
      visual_style: [...asset.semantic.visual_style],
      world: asset.semantic.world,
      ...(asset.semantic.mood === undefined ? {} : { mood: [...asset.semantic.mood] })
    },
    gameplay: {
      role: [...asset.gameplay.role],
      affordances: [...asset.gameplay.affordances],
      allowed_contexts: [...asset.gameplay.allowed_contexts],
      blocked_contexts: [...asset.gameplay.blocked_contexts]
    },
    technical: {
      file_format: asset.technical.file_format,
      thumbnail_path: asset.technical.thumbnail_path,
      ...(asset.technical.texture_resolution === undefined ? {} : { texture_resolution: asset.technical.texture_resolution }),
      ...(asset.technical.polycount_lod0 === undefined ? {} : { polycount_lod0: asset.technical.polycount_lod0 }),
      ...(asset.technical.platform_budget === undefined ? {} : { platform_budget: [...asset.technical.platform_budget] })
    },
    ...(asset.relations === undefined
      ? {}
      : {
          relations: {
            ...(asset.relations.variant_of === undefined ? {} : { variant_of: asset.relations.variant_of }),
            ...(asset.relations.compatible_with === undefined ? {} : { compatible_with: [...asset.relations.compatible_with] })
          }
        })
  };
}

function toPreviewDiagnostic(
  source: ArtAssetWorkbenchPreviewDiagnostic['source'],
  diagnostic: AssetPackBridgeDiagnostic | AssetResolverDiagnostic
): ArtAssetWorkbenchPreviewDiagnostic {
  return {
    source,
    severity: diagnostic.severity,
    code: diagnostic.code,
    message: diagnostic.message,
    ...(diagnostic.assetId === undefined ? {} : { assetId: diagnostic.assetId }),
    ...(diagnostic.jsonPath === undefined ? {} : { jsonPath: diagnostic.jsonPath }),
    ...diagnosticSafePath(diagnostic)
  };
}

function diagnosticSafePath(diagnostic: AssetPackBridgeDiagnostic | AssetResolverDiagnostic): Pick<ArtAssetWorkbenchPreviewDiagnostic, 'safePath'> {
  if ('candidatePath' in diagnostic && diagnostic.candidatePath !== undefined) {
    return { safePath: diagnostic.candidatePath };
  }
  if ('runtimePath' in diagnostic && diagnostic.runtimePath !== undefined) {
    return { safePath: diagnostic.runtimePath };
  }
  return {};
}
