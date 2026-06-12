import type { ZodIssue } from 'zod';

import type {
  ArtAssetMetadataValidatedFile,
  ArtAssetMetadataValidationDiagnostic,
  ArtAssetMetadataValidationDiagnosticCode
} from './art-asset-metadata-validation.types.js';

export function createArtAssetMetadataValidationDiagnostic(
  code: ArtAssetMetadataValidationDiagnosticCode,
  filePath: string,
  message: string,
  jsonPath?: string,
  assetId?: string
): ArtAssetMetadataValidationDiagnostic {
  return {
    severity: 'error',
    code,
    message,
    filePath,
    ...(jsonPath === undefined ? {} : { jsonPath }),
    ...(assetId === undefined ? {} : { assetId })
  };
}

export function createSchemaDiagnostic(
  issue: ZodIssue,
  filePath: string,
  assetId: string | undefined,
  source: unknown
): ArtAssetMetadataValidationDiagnostic {
  return createArtAssetMetadataValidationDiagnostic(classifyZodIssue(issue, source), filePath, issue.message, toJsonPath(issue.path), assetId);
}

export function readAssetId(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || !('asset_id' in value)) {
    return undefined;
  }
  const assetId = (value as { asset_id: unknown }).asset_id;
  return typeof assetId === 'string' ? assetId : undefined;
}

export function sortValidatedFiles(files: ArtAssetMetadataValidatedFile[]): void {
  files.sort((left, right) => left.filePath.localeCompare(right.filePath));
}

export function sortValidationDiagnostics(diagnostics: ArtAssetMetadataValidationDiagnostic[]): void {
  diagnostics.sort((left, right) => {
    return (
      left.filePath.localeCompare(right.filePath) ||
      left.code.localeCompare(right.code) ||
      (left.jsonPath ?? '').localeCompare(right.jsonPath ?? '') ||
      (left.assetId ?? '').localeCompare(right.assetId ?? '')
    );
  });
}

function classifyZodIssue(issue: ZodIssue, source: unknown): ArtAssetMetadataValidationDiagnosticCode {
  if (issue.code === 'invalid_type' && issue.path.length > 0 && !hasJsonPath(source, issue.path)) {
    return 'REQUIRED_FIELD_MISSING';
  }
  if (issue.code === 'invalid_value') {
    return 'INVALID_CONTROLLED_VOCABULARY';
  }
  if (issue.code === 'invalid_format' || issue.code === 'custom') {
    return 'INVALID_FIELD_FORMAT';
  }
  return 'SCHEMA_VALIDATION_FAILED';
}

function toJsonPath(path: readonly (string | number | symbol)[]): string | undefined {
  if (path.length === 0) {
    return undefined;
  }

  return `$${path.map((segment) => `.${String(segment)}`).join('')}`;
}

function hasJsonPath(source: unknown, path: readonly (string | number | symbol)[]): boolean {
  let current = source;
  for (const segment of path) {
    if (typeof segment === 'symbol') {
      return false;
    }
    if (typeof current !== 'object' || current === null || !(segment in current)) {
      return false;
    }
    current = (current as Record<string | number, unknown>)[segment];
  }

  return true;
}
