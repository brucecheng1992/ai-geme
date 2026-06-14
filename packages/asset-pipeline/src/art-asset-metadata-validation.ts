import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { ArtAssetMetadataSchema, type ArtAssetMetadata } from './art-asset-metadata.schema.js';
import {
  createArtAssetMetadataValidationDiagnostic,
  createSchemaDiagnostic,
  readAssetId,
  sortValidatedFiles,
  sortValidationDiagnostics
} from './art-asset-metadata-validation.diagnostics.js';
import { discoverArtAssetMetadataFiles } from './art-asset-metadata-validation.discovery.js';
import {
  ART_ASSET_METADATA_VALIDATION_VERSION,
  type ArtAssetMetadataValidatedFile,
  type ArtAssetMetadataValidationDiagnostic,
  type ArtAssetMetadataValidationDiagnosticCode,
  type ArtAssetMetadataValidationExitCode,
  type ArtAssetMetadataValidationOptions,
  type ArtAssetMetadataValidationResult
} from './art-asset-metadata-validation.types.js';

type ValidManifestRecord = {
  filePath: string;
  metadata: ArtAssetMetadata;
};

type AssetIdRecord = {
  filePath: string;
  assetId: string;
};

const COMMAND_ERROR_CODES: ReadonlySet<ArtAssetMetadataValidationDiagnosticCode> = new Set([
  'INPUT_PATH_NOT_FOUND',
  'UNSUPPORTED_INPUT_PATH',
  'NO_METADATA_FILES'
]);

export async function validateArtAssetMetadataFiles(
  options: ArtAssetMetadataValidationOptions
): Promise<ArtAssetMetadataValidationResult> {
  const cwd = options.cwd ?? process.cwd();
  const projectRoot = options.projectRoot ?? cwd;
  const diagnostics: ArtAssetMetadataValidationDiagnostic[] = [];
  const discoveredFiles = await discoverArtAssetMetadataFiles(options.targets, cwd, diagnostics);
  const files: ArtAssetMetadataValidatedFile[] = [];
  const validManifests: ValidManifestRecord[] = [];
  const assetIdRecords: AssetIdRecord[] = [];

  for (const filePath of discoveredFiles) {
    const parsed = await parseMetadataFile(filePath);
    if (!parsed.ok) {
      files.push({ filePath });
      diagnostics.push(parsed.diagnostic);
      continue;
    }

    const assetId = readAssetId(parsed.value);
    files.push({ filePath, ...(assetId === undefined ? {} : { assetId }) });
    if (assetId !== undefined) {
      assetIdRecords.push({ filePath, assetId });
    }

    const schemaResult = ArtAssetMetadataSchema.safeParse(parsed.value);
    if (!schemaResult.success) {
      diagnostics.push(...schemaResult.error.issues.map((issue) => createSchemaDiagnostic(issue, filePath, assetId, parsed.value)));
      continue;
    }

    validManifests.push({ filePath, metadata: schemaResult.data });
  }

  diagnostics.push(...findDuplicateAssetIds(assetIdRecords));

  if (options.checkPaths === true) {
    diagnostics.push(...(await checkReferencedPaths(validManifests, projectRoot)));
  }

  sortValidatedFiles(files);
  sortValidationDiagnostics(diagnostics);

  return {
    version: ART_ASSET_METADATA_VALIDATION_VERSION,
    ok: diagnostics.length === 0,
    files,
    diagnostics
  };
}

export function formatArtAssetMetadataValidationJson(result: ArtAssetMetadataValidationResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}

export function formatArtAssetMetadataValidationText(result: ArtAssetMetadataValidationResult): string {
  if (result.ok) {
    return `OK ${result.files.length} metadata files\n`;
  }

  const lines = [`FAILED ${result.diagnostics.length} diagnostics across ${result.files.length} metadata files`];
  for (const diagnostic of result.diagnostics) {
    lines.push(
      [
        diagnostic.severity.toUpperCase(),
        diagnostic.code,
        diagnostic.filePath,
        diagnostic.jsonPath ?? '-',
        diagnostic.assetId ?? '-',
        diagnostic.message
      ].join(' ')
    );
  }
  return `${lines.join('\n')}\n`;
}

export function getArtAssetMetadataValidationExitCode(
  result: ArtAssetMetadataValidationResult
): ArtAssetMetadataValidationExitCode {
  if (result.ok) {
    return 0;
  }

  return result.diagnostics.some((diagnostic) => COMMAND_ERROR_CODES.has(diagnostic.code)) ? 2 : 1;
}

async function parseMetadataFile(
  filePath: string
): Promise<{ ok: true; value: unknown } | { ok: false; diagnostic: ArtAssetMetadataValidationDiagnostic }> {
  const content = await readFile(filePath, 'utf8');
  try {
    return { ok: true, value: JSON.parse(content) as unknown };
  } catch {
    return {
      ok: false,
      diagnostic: createArtAssetMetadataValidationDiagnostic('MALFORMED_JSON', filePath, 'Metadata file is not valid JSON.')
    };
  }
}

function findDuplicateAssetIds(assetIdRecords: readonly AssetIdRecord[]): ArtAssetMetadataValidationDiagnostic[] {
  const byAssetId = new Map<string, AssetIdRecord[]>();
  for (const record of assetIdRecords) {
    const existing = byAssetId.get(record.assetId) ?? [];
    existing.push(record);
    byAssetId.set(record.assetId, existing);
  }

  return [...byAssetId.entries()].flatMap(([assetId, records]) => {
    if (records.length < 2) {
      return [];
    }

    return records.map((record) =>
      createArtAssetMetadataValidationDiagnostic(
        'DUPLICATE_ASSET_ID',
        record.filePath,
        `Duplicate asset_id "${assetId}" found.`,
        '$.asset_id',
        assetId
      )
    );
  });
}

async function checkReferencedPaths(
  validManifests: readonly ValidManifestRecord[],
  projectRoot: string
): Promise<ArtAssetMetadataValidationDiagnostic[]> {
  const diagnostics: ArtAssetMetadataValidationDiagnostic[] = [];

  for (const record of validManifests) {
    await pushMissingPathDiagnostic(
      diagnostics,
      record.filePath,
      record.metadata.asset_id,
      resolve(projectRoot, record.metadata.technical.source_path),
      '$.technical.source_path',
      'SOURCE_PATH_MISSING'
    );
    await pushMissingPathDiagnostic(
      diagnostics,
      record.filePath,
      record.metadata.asset_id,
      resolve(projectRoot, record.metadata.technical.thumbnail_path),
      '$.technical.thumbnail_path',
      'THUMBNAIL_PATH_MISSING'
    );
  }

  return diagnostics;
}

async function pushMissingPathDiagnostic(
  diagnostics: ArtAssetMetadataValidationDiagnostic[],
  manifestPath: string,
  assetId: string,
  referencedPath: string,
  jsonPath: string,
  code: Extract<ArtAssetMetadataValidationDiagnosticCode, 'SOURCE_PATH_MISSING' | 'THUMBNAIL_PATH_MISSING'>
): Promise<void> {
  try {
    await access(referencedPath);
  } catch {
    diagnostics.push(
      createArtAssetMetadataValidationDiagnostic(code, manifestPath, `Referenced path does not exist: ${referencedPath}`, jsonPath, assetId)
    );
  }
}
