import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';

import { ArtAssetMetadataSchema, type ArtAssetMetadata } from './art-asset-metadata.schema.js';
import { validateArtAssetMetadataFiles } from './art-asset-metadata-validation.js';
import type { ArtAssetMetadataValidationDiagnostic } from './art-asset-metadata-validation.types.js';

export const ART_ASSET_RUNTIME_METADATA_VERSION = '0.1' as const;
export const ART_ASSET_RUNTIME_METADATA_GENERATOR = 'metadata:export-runtime' as const;

export type ArtAssetRuntimeExportDiagnosticSeverity = 'error';

export type ArtAssetRuntimeExportDiagnosticCode =
  | 'ART_ASSET_METADATA_RUNTIME_EXPORT_VALIDATION_FAILED'
  | 'ART_ASSET_METADATA_RUNTIME_EXPORT_UNSAFE_FIELD_DETECTED'
  | 'ART_ASSET_METADATA_RUNTIME_EXPORT_OUTPUT_WRITE_FAILED'
  | 'ART_ASSET_METADATA_RUNTIME_EXPORT_DUPLICATE_ASSET_ID'
  | 'ART_ASSET_METADATA_RUNTIME_EXPORT_EMPTY_INPUT'
  | 'ART_ASSET_METADATA_RUNTIME_EXPORT_ABSOLUTE_PATH_REJECTED'
  | 'ART_ASSET_METADATA_RUNTIME_EXPORT_USAGE_ERROR';

export type ArtAssetRuntimeExportDiagnostic = {
  severity: ArtAssetRuntimeExportDiagnosticSeverity;
  code: ArtAssetRuntimeExportDiagnosticCode;
  message: string;
  filePath?: string;
  jsonPath?: string;
  assetId?: string;
};

export type RuntimeArtAssetSemanticMetadata = {
  tags: string[];
  visual_style: ArtAssetMetadata['semantic']['visual_style'];
  world: string;
  mood?: NonNullable<ArtAssetMetadata['semantic']['mood']>;
};

export type RuntimeArtAssetGameplayMetadata = {
  role: ArtAssetMetadata['gameplay']['gameplay_role'];
  affordances: ArtAssetMetadata['gameplay']['affordances'];
  allowed_contexts: string[];
  blocked_contexts: string[];
};

export type RuntimeArtAssetTechnicalMetadata = {
  file_format: ArtAssetMetadata['technical']['file_format'];
  source_path: string;
  thumbnail_path: string;
  texture_resolution?: NonNullable<ArtAssetMetadata['technical']['texture_resolution']>;
  polycount_lod0?: number;
  platform_budget?: NonNullable<ArtAssetMetadata['technical']['platform_budget']>;
};

export type RuntimeArtAssetRelationsMetadata = {
  variant_of?: string;
  compatible_with?: string[];
};

export type RuntimeArtAssetMetadata = {
  runtime_metadata_version: typeof ART_ASSET_RUNTIME_METADATA_VERSION;
  asset_id: string;
  asset_type: ArtAssetMetadata['asset_type'];
  title: string;
  description: string;
  status: ArtAssetMetadata['status'];
  version: string;
  semantic: RuntimeArtAssetSemanticMetadata;
  gameplay: RuntimeArtAssetGameplayMetadata;
  technical: RuntimeArtAssetTechnicalMetadata;
  relations?: RuntimeArtAssetRelationsMetadata;
};

export type RuntimeArtAssetMetadataExportArtifact = {
  runtime_metadata_version: typeof ART_ASSET_RUNTIME_METADATA_VERSION;
  generated_by: typeof ART_ASSET_RUNTIME_METADATA_GENERATOR;
  asset_count: number;
  assets: RuntimeArtAssetMetadata[];
};

export type ExportRuntimeArtAssetMetadataOptions = {
  checkPaths?: boolean;
  outputPath?: string;
  projectRoot?: string;
};

export type ExportRuntimeArtAssetMetadataResult = {
  ok: boolean;
  diagnostics: ArtAssetRuntimeExportDiagnostic[];
  artifact?: RuntimeArtAssetMetadataExportArtifact;
  outputPath?: string;
};

type RuntimeExportManifestRecord = {
  filePath: string;
  metadata: ArtAssetMetadata;
};

type RuntimeExportInputKind = 'file' | 'directory';

const EXIT_CODE_TWO_DIAGNOSTICS: ReadonlySet<ArtAssetRuntimeExportDiagnosticCode> = new Set([
  'ART_ASSET_METADATA_RUNTIME_EXPORT_EMPTY_INPUT',
  'ART_ASSET_METADATA_RUNTIME_EXPORT_USAGE_ERROR'
]);

export async function exportRuntimeArtAssetMetadataFromFile(
  filePath: string,
  options: ExportRuntimeArtAssetMetadataOptions = {}
): Promise<ExportRuntimeArtAssetMetadataResult> {
  return exportRuntimeArtAssetMetadataFromTargetsInternal([filePath], options, 'file');
}

export async function exportRuntimeArtAssetMetadataFromDirectory(
  directoryPath: string,
  options: ExportRuntimeArtAssetMetadataOptions = {}
): Promise<ExportRuntimeArtAssetMetadataResult> {
  return exportRuntimeArtAssetMetadataFromTargetsInternal([directoryPath], options, 'directory');
}

export async function exportRuntimeArtAssetMetadataFromTargets(
  targets: readonly string[],
  options: ExportRuntimeArtAssetMetadataOptions = {}
): Promise<ExportRuntimeArtAssetMetadataResult> {
  return exportRuntimeArtAssetMetadataFromTargetsInternal(targets, options);
}

async function exportRuntimeArtAssetMetadataFromTargetsInternal(
  targets: readonly string[],
  options: ExportRuntimeArtAssetMetadataOptions,
  expectedInputKind?: RuntimeExportInputKind
): Promise<ExportRuntimeArtAssetMetadataResult> {
  if (expectedInputKind !== undefined) {
    const inputKindResult = await validateExplicitInputKind(targets[0], expectedInputKind);
    if (!inputKindResult.ok) {
      return failedResult([inputKindResult.diagnostic], options.outputPath);
    }
  }

  const validationResult = await validateArtAssetMetadataFiles({
    targets,
    checkPaths: options.checkPaths,
    projectRoot: options.projectRoot
  });
  if (!validationResult.ok) {
    return failedResult(validationResult.diagnostics.map(toRuntimeExportValidationDiagnostic), options.outputPath);
  }

  const parsedManifests = await readValidatedManifests(validationResult.files.map((file) => file.filePath));
  if (!parsedManifests.ok) {
    return failedResult(parsedManifests.diagnostics, options.outputPath);
  }

  const assets = parsedManifests.records.map((record) => buildRuntimeAssetMetadata(record.metadata));
  const pathDiagnostics = assets.flatMap((asset) => validateRuntimeAssetPaths(asset));
  if (pathDiagnostics.length > 0) {
    return failedResult(sortRuntimeExportDiagnostics(pathDiagnostics), options.outputPath);
  }

  assets.sort((left, right) => left.asset_id.localeCompare(right.asset_id));
  const artifact: RuntimeArtAssetMetadataExportArtifact = {
    runtime_metadata_version: ART_ASSET_RUNTIME_METADATA_VERSION,
    generated_by: ART_ASSET_RUNTIME_METADATA_GENERATOR,
    asset_count: assets.length,
    assets
  };

  if (options.outputPath !== undefined) {
    const writeResult = await writeRuntimeExportArtifact(options.outputPath, artifact);
    if (!writeResult.ok) {
      return failedResult([writeResult.diagnostic], options.outputPath);
    }
  }

  return {
    ok: true,
    diagnostics: [],
    artifact,
    ...(options.outputPath === undefined ? {} : { outputPath: options.outputPath })
  };
}

async function validateExplicitInputKind(
  target: string,
  expectedInputKind: RuntimeExportInputKind
): Promise<{ ok: true } | { ok: false; diagnostic: ArtAssetRuntimeExportDiagnostic }> {
  try {
    const stats = await lstat(resolve(target));
    if (expectedInputKind === 'file' && !stats.isFile()) {
      return {
        ok: false,
        diagnostic: createRuntimeExportDiagnostic(
          'ART_ASSET_METADATA_RUNTIME_EXPORT_USAGE_ERROR',
          'Expected --file input to be a .asset.json file.',
          target
        )
      };
    }
    if (expectedInputKind === 'directory' && !stats.isDirectory()) {
      return {
        ok: false,
        diagnostic: createRuntimeExportDiagnostic('ART_ASSET_METADATA_RUNTIME_EXPORT_USAGE_ERROR', 'Expected --dir input to be a directory.', target)
      };
    }
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

export function formatRuntimeArtAssetMetadataExportArtifactJson(artifact: RuntimeArtAssetMetadataExportArtifact): string {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}

export function formatRuntimeArtAssetMetadataExportResultJson(result: ExportRuntimeArtAssetMetadataResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}

export function formatRuntimeArtAssetMetadataExportDiagnosticsText(result: ExportRuntimeArtAssetMetadataResult): string {
  if (result.ok) {
    const outputSuffix = result.outputPath === undefined ? '' : ` -> ${result.outputPath}`;
    return `OK ${result.artifact?.asset_count ?? 0} runtime metadata assets${outputSuffix}\n`;
  }

  const lines = [`FAILED ${result.diagnostics.length} diagnostics`];
  for (const diagnostic of result.diagnostics) {
    lines.push(
      [
        diagnostic.severity.toUpperCase(),
        diagnostic.code,
        diagnostic.filePath ?? '-',
        diagnostic.jsonPath ?? '-',
        diagnostic.assetId ?? '-',
        diagnostic.message
      ].join(' ')
    );
  }
  return `${lines.join('\n')}\n`;
}

export function getRuntimeArtAssetMetadataExportExitCode(result: ExportRuntimeArtAssetMetadataResult): 0 | 1 | 2 {
  if (result.ok) {
    return 0;
  }
  return result.diagnostics.some((diagnostic) => EXIT_CODE_TWO_DIAGNOSTICS.has(diagnostic.code)) ? 2 : 1;
}

export function createRuntimeExportUsageErrorDiagnostic(message: string): ArtAssetRuntimeExportDiagnostic {
  return createRuntimeExportDiagnostic('ART_ASSET_METADATA_RUNTIME_EXPORT_USAGE_ERROR', message);
}

function buildRuntimeAssetMetadata(metadata: ArtAssetMetadata): RuntimeArtAssetMetadata {
  return {
    runtime_metadata_version: ART_ASSET_RUNTIME_METADATA_VERSION,
    asset_id: metadata.asset_id,
    asset_type: metadata.asset_type,
    title: metadata.title,
    description: metadata.description,
    status: metadata.status,
    version: metadata.version,
    semantic: {
      tags: [...metadata.semantic.semantic_tags],
      visual_style: [...metadata.semantic.visual_style],
      world: metadata.semantic.world,
      ...(metadata.semantic.mood === undefined ? {} : { mood: [...metadata.semantic.mood] })
    },
    gameplay: {
      role: [...metadata.gameplay.gameplay_role],
      affordances: [...metadata.gameplay.affordances],
      allowed_contexts: [...metadata.gameplay.allowed_contexts],
      blocked_contexts: [...metadata.gameplay.blocked_contexts]
    },
    technical: {
      file_format: metadata.technical.file_format,
      source_path: metadata.technical.source_path,
      thumbnail_path: metadata.technical.thumbnail_path,
      ...(metadata.technical.texture_resolution === undefined || metadata.technical.texture_resolution === null
        ? {}
        : { texture_resolution: metadata.technical.texture_resolution }),
      ...(metadata.technical.polycount_lod0 === undefined || metadata.technical.polycount_lod0 === null
        ? {}
        : { polycount_lod0: metadata.technical.polycount_lod0 }),
      ...(metadata.technical.platform_budget === undefined ? {} : { platform_budget: [...metadata.technical.platform_budget] })
    },
    ...buildRuntimeRelations(metadata)
  };
}

function buildRuntimeRelations(metadata: ArtAssetMetadata): Pick<RuntimeArtAssetMetadata, 'relations'> {
  const sourceRelations = metadata.relations;
  if (sourceRelations === undefined) {
    return {};
  }

  const relations: RuntimeArtAssetRelationsMetadata = {
    ...(sourceRelations.variant_of === undefined || sourceRelations.variant_of === null ? {} : { variant_of: sourceRelations.variant_of }),
    ...(sourceRelations.compatible_with.length === 0 ? {} : { compatible_with: [...sourceRelations.compatible_with] })
  };
  return Object.keys(relations).length === 0 ? {} : { relations };
}

async function readValidatedManifests(
  filePaths: readonly string[]
): Promise<{ ok: true; records: RuntimeExportManifestRecord[] } | { ok: false; diagnostics: ArtAssetRuntimeExportDiagnostic[] }> {
  const records: RuntimeExportManifestRecord[] = [];
  const diagnostics: ArtAssetRuntimeExportDiagnostic[] = [];

  for (const filePath of filePaths) {
    try {
      const content = await readFile(filePath, 'utf8');
      const parsed = ArtAssetMetadataSchema.safeParse(JSON.parse(content) as unknown);
      if (parsed.success) {
        records.push({ filePath, metadata: parsed.data });
      } else {
        diagnostics.push(
          createRuntimeExportDiagnostic(
            'ART_ASSET_METADATA_RUNTIME_EXPORT_VALIDATION_FAILED',
            'Metadata changed after validation and no longer matches the schema.',
            filePath
          )
        );
      }
    } catch (error) {
      diagnostics.push(
        createRuntimeExportDiagnostic(
          'ART_ASSET_METADATA_RUNTIME_EXPORT_VALIDATION_FAILED',
          `Metadata changed after validation and could not be read: ${error instanceof Error ? error.message : String(error)}`,
          filePath
        )
      );
    }
  }

  return diagnostics.length === 0 ? { ok: true, records } : { ok: false, diagnostics: sortRuntimeExportDiagnostics(diagnostics) };
}

function validateRuntimeAssetPaths(asset: RuntimeArtAssetMetadata): ArtAssetRuntimeExportDiagnostic[] {
  return [
    validateRuntimePath(asset.technical.source_path, '$.technical.source_path', asset.asset_id),
    validateRuntimePath(asset.technical.thumbnail_path, '$.technical.thumbnail_path', asset.asset_id)
  ].filter((diagnostic): diagnostic is ArtAssetRuntimeExportDiagnostic => diagnostic !== undefined);
}

function validateRuntimePath(value: string, jsonPath: string, assetId: string): ArtAssetRuntimeExportDiagnostic | undefined {
  if (isRuntimeSafeRelativePath(value)) {
    return undefined;
  }

  return createRuntimeExportDiagnostic(
    'ART_ASSET_METADATA_RUNTIME_EXPORT_ABSOLUTE_PATH_REJECTED',
    'Runtime export path-like fields must be project-relative and non-absolute.',
    undefined,
    jsonPath,
    assetId
  );
}

function isRuntimeSafeRelativePath(value: string): boolean {
  if (isAbsolute(value) || value.includes('\\') || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return false;
  }
  return value.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

function toRuntimeExportValidationDiagnostic(validationDiagnostic: ArtAssetMetadataValidationDiagnostic): ArtAssetRuntimeExportDiagnostic {
  if (validationDiagnostic.code === 'DUPLICATE_ASSET_ID') {
    return createRuntimeExportDiagnostic(
      'ART_ASSET_METADATA_RUNTIME_EXPORT_DUPLICATE_ASSET_ID',
      `Validation failed: ${validationDiagnostic.message}`,
      validationDiagnostic.filePath,
      validationDiagnostic.jsonPath,
      validationDiagnostic.assetId
    );
  }

  if (validationDiagnostic.code === 'NO_METADATA_FILES') {
    return createRuntimeExportDiagnostic(
      'ART_ASSET_METADATA_RUNTIME_EXPORT_EMPTY_INPUT',
      `Validation failed: ${validationDiagnostic.message}`,
      validationDiagnostic.filePath,
      validationDiagnostic.jsonPath,
      validationDiagnostic.assetId
    );
  }

  if (validationDiagnostic.code === 'INPUT_PATH_NOT_FOUND' || validationDiagnostic.code === 'UNSUPPORTED_INPUT_PATH') {
    return createRuntimeExportDiagnostic(
      'ART_ASSET_METADATA_RUNTIME_EXPORT_USAGE_ERROR',
      `Validation failed: ${validationDiagnostic.message}`,
      validationDiagnostic.filePath,
      validationDiagnostic.jsonPath,
      validationDiagnostic.assetId
    );
  }

  if (
    validationDiagnostic.code === 'INVALID_FIELD_FORMAT' &&
    (validationDiagnostic.jsonPath === '$.technical.source_path' || validationDiagnostic.jsonPath === '$.technical.thumbnail_path')
  ) {
    return createRuntimeExportDiagnostic(
      'ART_ASSET_METADATA_RUNTIME_EXPORT_ABSOLUTE_PATH_REJECTED',
      `Validation failed: exported path-like field is not runtime-safe. ${validationDiagnostic.message}`,
      validationDiagnostic.filePath,
      validationDiagnostic.jsonPath,
      validationDiagnostic.assetId
    );
  }

  return createRuntimeExportDiagnostic(
    'ART_ASSET_METADATA_RUNTIME_EXPORT_VALIDATION_FAILED',
    `Validation failed: ${validationDiagnostic.code} ${validationDiagnostic.message}`,
    validationDiagnostic.filePath,
    validationDiagnostic.jsonPath,
    validationDiagnostic.assetId
  );
}

function failedResult(
  diagnostics: readonly ArtAssetRuntimeExportDiagnostic[],
  outputPath: string | undefined
): ExportRuntimeArtAssetMetadataResult {
  return {
    ok: false,
    diagnostics: sortRuntimeExportDiagnostics([...diagnostics]),
    ...(outputPath === undefined ? {} : { outputPath })
  };
}

function createRuntimeExportDiagnostic(
  code: ArtAssetRuntimeExportDiagnosticCode,
  message: string,
  filePath?: string,
  jsonPath?: string,
  assetId?: string
): ArtAssetRuntimeExportDiagnostic {
  return {
    severity: 'error',
    code,
    message,
    ...(filePath === undefined ? {} : { filePath }),
    ...(jsonPath === undefined ? {} : { jsonPath }),
    ...(assetId === undefined ? {} : { assetId })
  };
}

function sortRuntimeExportDiagnostics(diagnostics: ArtAssetRuntimeExportDiagnostic[]): ArtAssetRuntimeExportDiagnostic[] {
  diagnostics.sort((left, right) => {
    return (
      (left.filePath ?? '').localeCompare(right.filePath ?? '') ||
      left.code.localeCompare(right.code) ||
      (left.jsonPath ?? '').localeCompare(right.jsonPath ?? '') ||
      (left.assetId ?? '').localeCompare(right.assetId ?? '') ||
      left.message.localeCompare(right.message)
    );
  });
  return diagnostics;
}

async function writeRuntimeExportArtifact(
  outputPath: string,
  artifact: RuntimeArtAssetMetadataExportArtifact
): Promise<{ ok: true } | { ok: false; diagnostic: ArtAssetRuntimeExportDiagnostic }> {
  const resolvedOutputPath = resolve(outputPath);
  const temporaryPath = `${resolvedOutputPath}.tmp-${process.pid}`;

  try {
    await mkdir(dirname(resolvedOutputPath), { recursive: true });
    await writeFile(temporaryPath, formatRuntimeArtAssetMetadataExportArtifactJson(artifact), 'utf8');
    await rename(temporaryPath, resolvedOutputPath);
    return { ok: true };
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    return {
      ok: false,
      diagnostic: createRuntimeExportDiagnostic(
        'ART_ASSET_METADATA_RUNTIME_EXPORT_OUTPUT_WRITE_FAILED',
        `Failed to write runtime metadata export: ${error instanceof Error ? error.message : String(error)}`,
        outputPath
      )
    };
  }
}
