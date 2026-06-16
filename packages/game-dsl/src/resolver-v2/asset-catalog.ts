import { isSemanticId } from '../semantic-editing/index.js';
import { createResolverV2Diagnostic } from './diagnostics.js';
import { isUnsafeResolverV2AssetSource } from './asset-reference-rules.js';
import { compareCodeUnits, hasOwn, isPlainRecord, readString, sortedKeys } from './reference-extractor-shared.js';
import type {
  ResolverV2AssetCatalogResult,
  ResolverV2AssetDefinition,
  ResolverV2AssetKind,
  ResolverV2AssetSourceKind,
  ResolverV2Diagnostic
} from './types.js';

const KNOWN_ASSET_KINDS = new Set<ResolverV2AssetKind>([
  'image',
  'sprite',
  'audio',
  'font',
  'atlas',
  'tilemap',
  'tileset',
  'generated_shape',
  'unknown'
]);
const IMAGE_EXTENSION_PATTERN = /\.(?:png|jpg|jpeg|webp|gif|svg)$/i;
const AUDIO_EXTENSION_PATTERN = /\.(?:mp3|wav|ogg|m4a)$/i;
const FONT_EXTENSION_PATTERN = /\.(?:ttf|otf|woff|woff2)$/i;
const MAX_SOURCE_PREVIEW_LENGTH = 96;

/**
 * Extracts a deterministic in-memory asset catalog from SSOT-like `/assets` data.
 */
export function extractResolverV2AssetCatalog(document: unknown): ResolverV2AssetCatalogResult {
  if (!isPlainRecord(document)) {
    return {
      assets: [],
      diagnostics: [
        createResolverV2Diagnostic({
          severity: 'error',
          code: 'INVALID_RESOLVER_DOCUMENT',
          message: 'Resolver V2 document must be an object.'
        })
      ]
    };
  }

  const assets = document.assets;
  if (assets === undefined) {
    return { assets: [], diagnostics: [] };
  }

  if (!isPlainRecord(assets)) {
    return {
      assets: [],
      diagnostics: [
        createResolverV2Diagnostic({
          severity: 'warning',
          code: 'RESOLVER_REFERENCE_EXTRACTION_FAILED',
          message: 'Resolver V2 assets must be an object.',
          sourcePath: '/assets'
        })
      ]
    };
  }

  const result: ResolverV2AssetCatalogResult = { assets: [], diagnostics: [] };
  for (const assetGroupKey of sortedKeys(assets)) {
    collectAssetCatalogGroup(assets[assetGroupKey], assetGroupKey, result);
  }

  result.assets.sort(compareAssetDefinitions);
  result.diagnostics.push(...createDuplicateAssetDiagnostics(result.assets));
  return result;
}

function collectAssetCatalogGroup(
  value: unknown,
  key: string,
  result: ResolverV2AssetCatalogResult
): void {
  const path = `/assets/${key}`;
  if (!isPlainRecord(value)) {
    result.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'warning',
        code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
        message: 'Resolver V2 asset definition must be an object.',
        sourcePath: path
      })
    );
    return;
  }

  if (looksLikeAssetDefinition(value)) {
    addAssetDefinition({ asset: value, key, path, groupKey: undefined, result });
    return;
  }

  for (const assetKey of sortedKeys(value)) {
    const asset = value[assetKey];
    const assetPath = `${path}/${assetKey}`;
    if (!isPlainRecord(asset)) {
      result.diagnostics.push(
        createResolverV2Diagnostic({
          severity: 'warning',
          code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
          message: 'Resolver V2 asset definition must be an object.',
          sourcePath: assetPath
        })
      );
      continue;
    }

    addAssetDefinition({ asset, key: assetKey, path: assetPath, groupKey: key, result });
  }
}

function addAssetDefinition(input: {
  asset: Record<string, unknown>;
  key: string;
  path: string;
  groupKey?: string;
  result: ResolverV2AssetCatalogResult;
}): void {
  const id = readString(input.asset, 'id') ?? `asset:${input.key}`;
  if (!isSemanticId(id)) {
    input.result.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'error',
        code: 'INVALID_RESOLVER_SEMANTIC_ID',
        message: 'Resolver V2 asset definition id must be a semantic asset id.',
        sourcePath: input.path,
        targetId: id,
        expectedTargetKind: 'asset'
      })
    );
  }

  const source = readString(input.asset, 'source');
  const sourcePreview = createSourcePreview(source);
  const sourceKind = inferAssetSourceKind(input.asset, source);
  const kind = inferAssetKind(input.asset, input.groupKey, source);
  const definition: ResolverV2AssetDefinition = {
    id,
    key: input.key,
    path: input.path,
    kind,
    sourceKind,
    ...(sourcePreview === undefined ? {} : sourcePreview)
  };

  input.result.assets.push(definition);
  if (source !== undefined && isUnsafeResolverV2AssetSource(source)) {
    input.result.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'error',
        code: 'RESOLVER_ASSET_SOURCE_UNSAFE',
        message: 'Resolver V2 asset source points at generated code or workspace implementation path.',
        sourcePath: input.path,
        fieldPath: `${input.path}/source`,
        targetId: id
      })
    );
  }
}

function createDuplicateAssetDiagnostics(assets: ResolverV2AssetDefinition[]): ResolverV2Diagnostic[] {
  const seen = new Map<string, ResolverV2AssetDefinition>();
  const duplicateIds = new Set<string>();
  const diagnostics: ResolverV2Diagnostic[] = [];

  for (const asset of assets) {
    const existing = seen.get(asset.id);
    if (existing === undefined) {
      seen.set(asset.id, asset);
      continue;
    }

    if (duplicateIds.has(asset.id)) {
      continue;
    }

    duplicateIds.add(asset.id);
    diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'error',
        code: 'RESOLVER_DUPLICATE_ASSET_ID',
        message: 'Resolver V2 asset catalog contains duplicate semantic asset ids.',
        sourcePath: existing.path,
        targetId: asset.id
      })
    );
  }

  return diagnostics;
}

function inferAssetKind(asset: Record<string, unknown>, groupKey: string | undefined, source: string | undefined): ResolverV2AssetKind {
  const explicitKind = normalizeAssetKind(readString(asset, 'kind')) ?? normalizeAssetKind(readString(asset, 'type'));
  if (explicitKind !== undefined) {
    return explicitKind;
  }

  const groupKind = inferAssetKindFromGroup(groupKey);
  if (groupKind !== undefined) {
    return groupKind;
  }

  return inferAssetKindFromSource(source) ?? 'unknown';
}

function inferAssetSourceKind(asset: Record<string, unknown>, source: string | undefined): ResolverV2AssetSourceKind {
  if (normalizeAssetKind(readString(asset, 'kind')) === 'generated_shape' || normalizeAssetKind(readString(asset, 'type')) === 'generated_shape') {
    return 'generated';
  }

  if (typeof asset.inline === 'string' || typeof asset.data === 'string') {
    return 'inline';
  }

  if (typeof source === 'string') {
    return source.startsWith('data:') ? 'inline' : 'file';
  }

  return 'unknown';
}

function inferAssetKindFromGroup(groupKey: string | undefined): ResolverV2AssetKind | undefined {
  switch (groupKey) {
    case 'sprites':
    case 'images':
    case 'image':
    case 'fallback':
    case 'fallbacks':
      return 'image';
    case 'audio':
    case 'sounds':
    case 'music':
      return 'audio';
    case 'font':
    case 'fonts':
      return 'font';
    case 'atlas':
    case 'atlases':
      return 'atlas';
    case 'tilemaps':
    case 'maps':
      return 'tilemap';
    case 'tilesets':
      return 'tileset';
    default:
      return undefined;
  }
}

function inferAssetKindFromSource(source: string | undefined): ResolverV2AssetKind | undefined {
  if (source === undefined) {
    return undefined;
  }

  if (IMAGE_EXTENSION_PATTERN.test(source)) {
    return 'image';
  }

  if (AUDIO_EXTENSION_PATTERN.test(source)) {
    return 'audio';
  }

  if (FONT_EXTENSION_PATTERN.test(source)) {
    return 'font';
  }

  return undefined;
}

function normalizeAssetKind(value: string | undefined): ResolverV2AssetKind | undefined {
  return value !== undefined && KNOWN_ASSET_KINDS.has(value as ResolverV2AssetKind) ? (value as ResolverV2AssetKind) : undefined;
}

function createSourcePreview(source: string | undefined): Pick<ResolverV2AssetDefinition, 'sourcePreview' | 'sourceRedacted'> | undefined {
  if (source === undefined) {
    return undefined;
  }

  if (source.startsWith('data:') || source.length > MAX_SOURCE_PREVIEW_LENGTH) {
    return {
      sourcePreview: `${source.slice(0, MAX_SOURCE_PREVIEW_LENGTH)}...`,
      sourceRedacted: true
    };
  }

  return { sourcePreview: source };
}

function compareAssetDefinitions(left: ResolverV2AssetDefinition, right: ResolverV2AssetDefinition): number {
  return compareCodeUnits(left.path, right.path) || compareCodeUnits(left.id, right.id);
}

function looksLikeAssetDefinition(value: Record<string, unknown>): boolean {
  return (
    typeof value.id === 'string' ||
    typeof value.kind === 'string' ||
    typeof value.type === 'string' ||
    hasOwn(value, 'source') ||
    hasOwn(value, 'inline') ||
    hasOwn(value, 'data') ||
    hasOwn(value, 'shape')
  );
}
