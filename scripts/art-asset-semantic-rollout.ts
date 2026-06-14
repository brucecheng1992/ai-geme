import {
  exportRuntimeArtAssetMetadataFromDirectory,
  type ExportRuntimeArtAssetMetadataResult,
  type RuntimeArtAssetMetadataExportArtifact
} from '../packages/asset-pipeline/src/index.js';

export const ART_ASSET_SEMANTIC_ROLLOUT_ENV = 'ART_ASSET_SEMANTIC_ROLLOUT_ENABLED' as const;
export const ART_ASSET_SEMANTIC_ROLLOUT_MODE = 'pirate-kit-v0.1' as const;
export const ART_ASSET_SEMANTIC_ROLLOUT_VERSION = '0.1' as const;
export const PIRATE_KIT_ROLLOUT_FIXTURE_ROOT = 'tests/fixtures/art-library-batch-zero-pirate-kit-v0.1' as const;
export const PIRATE_KIT_ROLLOUT_METADATA_DIR = `${PIRATE_KIT_ROLLOUT_FIXTURE_ROOT}/metadata` as const;

const EXPECTED_PIRATE_KIT_ROLLOUT_ASSET_COUNT = 20;
const ROLLOUT_ROLLBACK_INSTRUCTION = `disable ${ART_ASSET_SEMANTIC_ROLLOUT_ENV}` as const;

export type ArtAssetSemanticRolloutConfig =
  | {
      enabled: false;
      envName: typeof ART_ASSET_SEMANTIC_ROLLOUT_ENV;
      mode: 'disabled';
    }
  | {
      enabled: true;
      envName: typeof ART_ASSET_SEMANTIC_ROLLOUT_ENV;
      mode: typeof ART_ASSET_SEMANTIC_ROLLOUT_MODE;
      fixtureRoot: typeof PIRATE_KIT_ROLLOUT_FIXTURE_ROOT;
      metadataDir: typeof PIRATE_KIT_ROLLOUT_METADATA_DIR;
    };

export type ArtAssetSemanticRolloutDiagnostic = {
  severity: 'error';
  code:
    | 'ART_ASSET_SEMANTIC_ROLLOUT_EXPORT_FAILED'
    | 'ART_ASSET_SEMANTIC_ROLLOUT_UNEXPECTED_ASSET_COUNT'
    | 'ART_ASSET_SEMANTIC_ROLLOUT_UNSAFE_PATH'
    | 'ART_ASSET_SEMANTIC_ROLLOUT_UNEXPECTED_METADATA_VERSION';
  message: string;
  assetId?: string;
  jsonPath?: string;
};

export type ArtAssetSemanticRolloutSummary = {
  rollout_version: typeof ART_ASSET_SEMANTIC_ROLLOUT_VERSION;
  enabled: boolean;
  mode: 'disabled' | typeof ART_ASSET_SEMANTIC_ROLLOUT_MODE;
  ok: boolean;
  rollback: typeof ROLLOUT_ROLLBACK_INSTRUCTION;
  fixture?: typeof PIRATE_KIT_ROLLOUT_FIXTURE_ROOT;
  metadata_dir?: typeof PIRATE_KIT_ROLLOUT_METADATA_DIR;
  approved_input?: 'runtime-safe-metadata-export';
  asset_count?: number;
  diagnostic_count: number;
  diagnostics: ArtAssetSemanticRolloutDiagnostic[];
};

export type RuntimeMetadataExporter = (metadataDir: string) => Promise<ExportRuntimeArtAssetMetadataResult>;

export function readArtAssetSemanticRolloutConfig(env: NodeJS.ProcessEnv = process.env): ArtAssetSemanticRolloutConfig {
  const value = env[ART_ASSET_SEMANTIC_ROLLOUT_ENV];
  if (value === undefined || value === '') {
    return {
      enabled: false,
      envName: ART_ASSET_SEMANTIC_ROLLOUT_ENV,
      mode: 'disabled'
    };
  }

  if (value !== ART_ASSET_SEMANTIC_ROLLOUT_MODE) {
    throw new Error(`Unsupported ${ART_ASSET_SEMANTIC_ROLLOUT_ENV} value: ${value}`);
  }

  return {
    enabled: true,
    envName: ART_ASSET_SEMANTIC_ROLLOUT_ENV,
    mode: ART_ASSET_SEMANTIC_ROLLOUT_MODE,
    fixtureRoot: PIRATE_KIT_ROLLOUT_FIXTURE_ROOT,
    metadataDir: PIRATE_KIT_ROLLOUT_METADATA_DIR
  };
}

export async function runArtAssetSemanticRollout(
  config: ArtAssetSemanticRolloutConfig,
  exportRuntimeMetadata: RuntimeMetadataExporter = exportRuntimeArtAssetMetadataFromDirectory
): Promise<ArtAssetSemanticRolloutSummary> {
  if (!config.enabled) {
    return {
      rollout_version: ART_ASSET_SEMANTIC_ROLLOUT_VERSION,
      enabled: false,
      mode: 'disabled',
      ok: true,
      rollback: ROLLOUT_ROLLBACK_INSTRUCTION,
      diagnostic_count: 0,
      diagnostics: []
    };
  }

  const result = await exportRuntimeMetadata(config.metadataDir);
  if (!result.ok || result.artifact === undefined) {
    return {
      rollout_version: ART_ASSET_SEMANTIC_ROLLOUT_VERSION,
      enabled: true,
      mode: config.mode,
      fixture: config.fixtureRoot,
      metadata_dir: config.metadataDir,
      approved_input: 'runtime-safe-metadata-export',
      ok: false,
      rollback: ROLLOUT_ROLLBACK_INSTRUCTION,
      diagnostic_count: 1,
      diagnostics: [
        {
          severity: 'error',
          code: 'ART_ASSET_SEMANTIC_ROLLOUT_EXPORT_FAILED',
          message: 'Pirate Kit runtime metadata export failed.'
        }
      ]
    };
  }

  return createArtAssetSemanticRolloutSummary(result.artifact, config);
}

export function createArtAssetSemanticRolloutSummary(
  artifact: RuntimeArtAssetMetadataExportArtifact,
  config: Extract<ArtAssetSemanticRolloutConfig, { enabled: true }>
): ArtAssetSemanticRolloutSummary {
  const diagnostics: ArtAssetSemanticRolloutDiagnostic[] = [];

  if (artifact.runtime_metadata_version !== '0.1') {
    diagnostics.push({
      severity: 'error',
      code: 'ART_ASSET_SEMANTIC_ROLLOUT_UNEXPECTED_METADATA_VERSION',
      message: `Expected runtime metadata version "0.1" but received "${artifact.runtime_metadata_version}".`,
      jsonPath: '$.runtime_metadata_version'
    });
  }

  if (artifact.asset_count !== EXPECTED_PIRATE_KIT_ROLLOUT_ASSET_COUNT) {
    diagnostics.push({
      severity: 'error',
      code: 'ART_ASSET_SEMANTIC_ROLLOUT_UNEXPECTED_ASSET_COUNT',
      message: `Expected ${EXPECTED_PIRATE_KIT_ROLLOUT_ASSET_COUNT} Pirate Kit runtime assets but received ${artifact.asset_count}.`,
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
          code: 'ART_ASSET_SEMANTIC_ROLLOUT_UNSAFE_PATH',
          message: `Runtime metadata asset "${asset.asset_id}" has ${field} outside the approved Pirate Kit fixture root.`,
          assetId: asset.asset_id,
          jsonPath: `$.assets[${index}].technical.${field}`
        });
      }
    }
  });

  return {
    rollout_version: ART_ASSET_SEMANTIC_ROLLOUT_VERSION,
    enabled: true,
    mode: config.mode,
    fixture: config.fixtureRoot,
    metadata_dir: config.metadataDir,
    approved_input: 'runtime-safe-metadata-export',
    ok: diagnostics.length === 0,
    asset_count: artifact.asset_count,
    rollback: ROLLOUT_ROLLBACK_INSTRUCTION,
    diagnostic_count: diagnostics.length,
    diagnostics
  };
}
