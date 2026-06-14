import {
  exportRuntimeArtAssetMetadataFromDirectory,
  type ExportRuntimeArtAssetMetadataResult,
  type RuntimeArtAssetMetadataExportArtifact
} from '../packages/asset-pipeline/src/index.js';

export const ART_ASSET_RUNTIME_CANARY_ENV = 'ASSET_RUNTIME_METADATA_CANARY' as const;
export const ART_ASSET_RUNTIME_CANARY_MODE = 'small-library-v0.1' as const;
export const ART_ASSET_RUNTIME_CANARY_VERSION = '0.1' as const;
export const SMALL_LIBRARY_FIXTURE_ROOT = 'tests/fixtures/art-library-small-v0.1' as const;
export const SMALL_LIBRARY_METADATA_DIR = `${SMALL_LIBRARY_FIXTURE_ROOT}/metadata` as const;
const EXPECTED_SMALL_LIBRARY_ASSET_COUNT = 10;

export type ArtAssetRuntimeCanaryConfig =
  | {
      enabled: false;
      envName: typeof ART_ASSET_RUNTIME_CANARY_ENV;
      mode: 'disabled';
    }
  | {
      enabled: true;
      envName: typeof ART_ASSET_RUNTIME_CANARY_ENV;
      mode: typeof ART_ASSET_RUNTIME_CANARY_MODE;
      fixtureRoot: typeof SMALL_LIBRARY_FIXTURE_ROOT;
      metadataDir: typeof SMALL_LIBRARY_METADATA_DIR;
    };

export type ArtAssetRuntimeCanaryDiagnostic = {
  severity: 'error';
  code:
    | 'ART_ASSET_RUNTIME_CANARY_EXPORT_FAILED'
    | 'ART_ASSET_RUNTIME_CANARY_UNEXPECTED_ASSET_COUNT'
    | 'ART_ASSET_RUNTIME_CANARY_UNSAFE_PATH'
    | 'ART_ASSET_RUNTIME_CANARY_UNEXPECTED_METADATA_VERSION';
  message: string;
  assetId?: string;
  jsonPath?: string;
};

export type ArtAssetRuntimeCanarySummary = {
  canary_version: typeof ART_ASSET_RUNTIME_CANARY_VERSION;
  enabled: boolean;
  mode: 'disabled' | typeof ART_ASSET_RUNTIME_CANARY_MODE;
  ok: boolean;
  fixture?: typeof SMALL_LIBRARY_FIXTURE_ROOT;
  metadata_dir?: typeof SMALL_LIBRARY_METADATA_DIR;
  asset_count?: number;
  diagnostic_count: number;
  diagnostics: ArtAssetRuntimeCanaryDiagnostic[];
};

export type RuntimeMetadataExporter = (metadataDir: string) => Promise<ExportRuntimeArtAssetMetadataResult>;

export function readArtAssetRuntimeCanaryConfig(env: NodeJS.ProcessEnv = process.env): ArtAssetRuntimeCanaryConfig {
  const value = env[ART_ASSET_RUNTIME_CANARY_ENV];
  if (value === undefined || value === '') {
    return {
      enabled: false,
      envName: ART_ASSET_RUNTIME_CANARY_ENV,
      mode: 'disabled'
    };
  }

  if (value !== ART_ASSET_RUNTIME_CANARY_MODE) {
    throw new Error(`Unsupported ${ART_ASSET_RUNTIME_CANARY_ENV} value: ${value}`);
  }

  return {
    enabled: true,
    envName: ART_ASSET_RUNTIME_CANARY_ENV,
    mode: ART_ASSET_RUNTIME_CANARY_MODE,
    fixtureRoot: SMALL_LIBRARY_FIXTURE_ROOT,
    metadataDir: SMALL_LIBRARY_METADATA_DIR
  };
}

export async function runArtAssetRuntimeCanary(
  config: ArtAssetRuntimeCanaryConfig,
  exportRuntimeMetadata: RuntimeMetadataExporter = exportRuntimeArtAssetMetadataFromDirectory
): Promise<ArtAssetRuntimeCanarySummary> {
  if (!config.enabled) {
    return {
      canary_version: ART_ASSET_RUNTIME_CANARY_VERSION,
      enabled: false,
      mode: 'disabled',
      ok: true,
      diagnostic_count: 0,
      diagnostics: []
    };
  }

  const result = await exportRuntimeMetadata(config.metadataDir);
  if (!result.ok || result.artifact === undefined) {
    return {
      canary_version: ART_ASSET_RUNTIME_CANARY_VERSION,
      enabled: true,
      mode: config.mode,
      fixture: config.fixtureRoot,
      metadata_dir: config.metadataDir,
      ok: false,
      diagnostic_count: 1,
      diagnostics: [
        {
          severity: 'error',
          code: 'ART_ASSET_RUNTIME_CANARY_EXPORT_FAILED',
          message: 'Small library runtime metadata export failed.'
        }
      ]
    };
  }

  return createSmallLibraryRuntimeCanarySummary(result.artifact, config);
}

export function createSmallLibraryRuntimeCanarySummary(
  artifact: RuntimeArtAssetMetadataExportArtifact,
  config: Extract<ArtAssetRuntimeCanaryConfig, { enabled: true }>
): ArtAssetRuntimeCanarySummary {
  const diagnostics: ArtAssetRuntimeCanaryDiagnostic[] = [];

  if (artifact.runtime_metadata_version !== '0.1') {
    diagnostics.push({
      severity: 'error',
      code: 'ART_ASSET_RUNTIME_CANARY_UNEXPECTED_METADATA_VERSION',
      message: `Expected runtime metadata version "0.1" but received "${artifact.runtime_metadata_version}".`,
      jsonPath: '$.runtime_metadata_version'
    });
  }

  if (artifact.asset_count !== EXPECTED_SMALL_LIBRARY_ASSET_COUNT) {
    diagnostics.push({
      severity: 'error',
      code: 'ART_ASSET_RUNTIME_CANARY_UNEXPECTED_ASSET_COUNT',
      message: `Expected ${EXPECTED_SMALL_LIBRARY_ASSET_COUNT} small-library runtime assets but received ${artifact.asset_count}.`,
      jsonPath: '$.asset_count'
    });
  }

  artifact.assets.forEach((asset, index) => {
    for (const [field, value] of [
      ['source_path', asset.technical.source_path],
      ['thumbnail_path', asset.technical.thumbnail_path]
    ] as const) {
      if (!value.startsWith(`${config.fixtureRoot}/`)) {
        diagnostics.push({
          severity: 'error',
          code: 'ART_ASSET_RUNTIME_CANARY_UNSAFE_PATH',
          message: `Runtime metadata asset "${asset.asset_id}" has ${field} outside the small-library fixture root.`,
          assetId: asset.asset_id,
          jsonPath: `$.assets[${index}].technical.${field}`
        });
      }
    }
  });

  return {
    canary_version: ART_ASSET_RUNTIME_CANARY_VERSION,
    enabled: true,
    mode: config.mode,
    fixture: config.fixtureRoot,
    metadata_dir: config.metadataDir,
    ok: diagnostics.length === 0,
    asset_count: artifact.asset_count,
    diagnostic_count: diagnostics.length,
    diagnostics
  };
}
