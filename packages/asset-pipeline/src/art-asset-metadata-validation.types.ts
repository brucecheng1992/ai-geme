export const ART_ASSET_METADATA_VALIDATION_VERSION = 'art-asset-metadata-validation-v0.1' as const;

export type ArtAssetMetadataValidationDiagnosticSeverity = 'error';

export type ArtAssetMetadataValidationDiagnosticCode =
  | 'MALFORMED_JSON'
  | 'REQUIRED_FIELD_MISSING'
  | 'INVALID_CONTROLLED_VOCABULARY'
  | 'INVALID_FIELD_FORMAT'
  | 'SCHEMA_VALIDATION_FAILED'
  | 'DUPLICATE_ASSET_ID'
  | 'SOURCE_PATH_MISSING'
  | 'THUMBNAIL_PATH_MISSING'
  | 'INPUT_PATH_NOT_FOUND'
  | 'UNSUPPORTED_INPUT_PATH'
  | 'NO_METADATA_FILES';

export type ArtAssetMetadataValidationDiagnostic = {
  severity: ArtAssetMetadataValidationDiagnosticSeverity;
  code: ArtAssetMetadataValidationDiagnosticCode;
  message: string;
  filePath: string;
  jsonPath?: string;
  assetId?: string;
};

export type ArtAssetMetadataValidatedFile = {
  filePath: string;
  assetId?: string;
};

export type ArtAssetMetadataValidationResult = {
  version: typeof ART_ASSET_METADATA_VALIDATION_VERSION;
  ok: boolean;
  files: ArtAssetMetadataValidatedFile[];
  diagnostics: ArtAssetMetadataValidationDiagnostic[];
};

export type ArtAssetMetadataValidationOptions = {
  targets: readonly string[];
  cwd?: string;
  checkPaths?: boolean;
  projectRoot?: string;
};

export type ArtAssetMetadataValidationExitCode = 0 | 1 | 2;
