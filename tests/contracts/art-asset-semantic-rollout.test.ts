import { describe, expect, it } from 'vitest';

import {
  ART_ASSET_SEMANTIC_ROLLOUT_ENV,
  createArtAssetSemanticRolloutSummary,
  PIRATE_KIT_ROLLOUT_FIXTURE_ROOT,
  PIRATE_KIT_ROLLOUT_METADATA_DIR,
  readArtAssetSemanticRolloutConfig,
  runArtAssetSemanticRollout,
  type ArtAssetSemanticRolloutConfig,
  type RuntimeMetadataExporter
} from '../../scripts/art-asset-semantic-rollout.js';
import {
  exportRuntimeArtAssetMetadataFromDirectory,
  type RuntimeArtAssetMetadataExportArtifact
} from '../../packages/asset-pipeline/src/index.js';

describe('Step 14B controlled art asset semantic rollout', () => {
  it('keeps the semantic rollout disabled by default and avoids metadata export I/O', async () => {
    const config = readArtAssetSemanticRolloutConfig({} as NodeJS.ProcessEnv);
    let exportCalled = false;
    const summary = await runArtAssetSemanticRollout(config, async () => {
      exportCalled = true;
      throw new Error('disabled rollout should not export metadata');
    });

    expect(config).toEqual({
      enabled: false,
      envName: ART_ASSET_SEMANTIC_ROLLOUT_ENV,
      mode: 'disabled'
    });
    expect(exportCalled).toBe(false);
    expect(summary).toEqual({
      rollout_version: '0.1',
      enabled: false,
      mode: 'disabled',
      ok: true,
      rollback: 'disable ART_ASSET_SEMANTIC_ROLLOUT_ENABLED',
      diagnostic_count: 0,
      diagnostics: []
    });
    assertStableRolloutJson(summary);
  });

  it('accepts only the approved Pirate Kit rollout flag value', () => {
    expect(readArtAssetSemanticRolloutConfig({ ART_ASSET_SEMANTIC_ROLLOUT_ENABLED: '' } as NodeJS.ProcessEnv)).toMatchObject({
      enabled: false,
      mode: 'disabled'
    });
    expect(readArtAssetSemanticRolloutConfig({ ART_ASSET_SEMANTIC_ROLLOUT_ENABLED: 'pirate-kit-v0.1' } as NodeJS.ProcessEnv)).toEqual(enabledConfig());
    expect(() => readArtAssetSemanticRolloutConfig({ ART_ASSET_SEMANTIC_ROLLOUT_ENABLED: 'large-library' } as NodeJS.ProcessEnv)).toThrow(
      'Unsupported ART_ASSET_SEMANTIC_ROLLOUT_ENABLED value: large-library'
    );
  });

  it('runs flag-on rollout only against the approved Pirate Kit fixture runtime-safe export', async () => {
    const requestedDirs: string[] = [];
    const summary = await runArtAssetSemanticRollout(enabledConfig(), async (metadataDir) => {
      requestedDirs.push(metadataDir);
      return exportRuntimeArtAssetMetadataFromDirectory(metadataDir);
    });

    expect(requestedDirs).toEqual([PIRATE_KIT_ROLLOUT_METADATA_DIR]);
    expect(summary).toEqual({
      rollout_version: '0.1',
      enabled: true,
      mode: 'pirate-kit-v0.1',
      fixture: PIRATE_KIT_ROLLOUT_FIXTURE_ROOT,
      metadata_dir: PIRATE_KIT_ROLLOUT_METADATA_DIR,
      approved_input: 'runtime-safe-metadata-export',
      ok: true,
      asset_count: 20,
      rollback: 'disable ART_ASSET_SEMANTIC_ROLLOUT_ENABLED',
      diagnostic_count: 0,
      diagnostics: []
    });
    assertStableRolloutJson(summary);
  });

  it('proves rollback by disabling the flag restores the flag-off behavior', async () => {
    const enabledSummary = await runArtAssetSemanticRollout(enabledConfig(), exportRuntimeArtAssetMetadataFromDirectory);
    const disabledSummary = await runArtAssetSemanticRollout(readArtAssetSemanticRolloutConfig({} as NodeJS.ProcessEnv), async () => {
      throw new Error('rollback should not export metadata');
    });

    expect(enabledSummary.enabled).toBe(true);
    expect(disabledSummary).toEqual({
      rollout_version: '0.1',
      enabled: false,
      mode: 'disabled',
      ok: true,
      rollback: 'disable ART_ASSET_SEMANTIC_ROLLOUT_ENABLED',
      diagnostic_count: 0,
      diagnostics: []
    });
  });

  it('fails closed when runtime metadata export fails', async () => {
    const failingExporter: RuntimeMetadataExporter = async () => ({
      ok: false,
      diagnostics: [],
      artifact: undefined
    });

    const summary = await runArtAssetSemanticRollout(enabledConfig(), failingExporter);

    expect(summary).toEqual({
      rollout_version: '0.1',
      enabled: true,
      mode: 'pirate-kit-v0.1',
      fixture: PIRATE_KIT_ROLLOUT_FIXTURE_ROOT,
      metadata_dir: PIRATE_KIT_ROLLOUT_METADATA_DIR,
      approved_input: 'runtime-safe-metadata-export',
      ok: false,
      rollback: 'disable ART_ASSET_SEMANTIC_ROLLOUT_ENABLED',
      diagnostic_count: 1,
      diagnostics: [
        {
          severity: 'error',
          code: 'ART_ASSET_SEMANTIC_ROLLOUT_EXPORT_FAILED',
          message: 'Pirate Kit runtime metadata export failed.'
        }
      ]
    });
    assertStableRolloutJson(summary);
  });

  it('rejects invalid rollout artifacts without mutating metadata', async () => {
    const artifact = await loadPirateKitArtifact();
    const invalidArtifact: RuntimeArtAssetMetadataExportArtifact = {
      ...artifact,
      asset_count: 19,
      assets: artifact.assets.map((asset, index) =>
        index === 0
          ? {
              ...asset,
              technical: {
                ...asset.technical,
                source_path: 'assets/asset-packs/large-library/pirate.glb'
              }
            }
          : asset
      )
    };
    const before = JSON.stringify(invalidArtifact);
    const summary = createArtAssetSemanticRolloutSummary(invalidArtifact, enabledConfig());

    expect(JSON.stringify(invalidArtifact)).toBe(before);
    expect(summary).toEqual({
      rollout_version: '0.1',
      enabled: true,
      mode: 'pirate-kit-v0.1',
      fixture: PIRATE_KIT_ROLLOUT_FIXTURE_ROOT,
      metadata_dir: PIRATE_KIT_ROLLOUT_METADATA_DIR,
      approved_input: 'runtime-safe-metadata-export',
      ok: false,
      asset_count: 19,
      rollback: 'disable ART_ASSET_SEMANTIC_ROLLOUT_ENABLED',
      diagnostic_count: 2,
      diagnostics: [
        {
          severity: 'error',
          code: 'ART_ASSET_SEMANTIC_ROLLOUT_UNEXPECTED_ASSET_COUNT',
          message: 'Expected 20 Pirate Kit runtime assets but received 19.',
          jsonPath: '$.asset_count'
        },
        {
          severity: 'error',
          code: 'ART_ASSET_SEMANTIC_ROLLOUT_UNSAFE_PATH',
          message: 'Runtime metadata asset "pirate_kit_barrel_001" has source_path outside the approved Pirate Kit fixture root.',
          assetId: 'pirate_kit_barrel_001',
          jsonPath: '$.assets[0].technical.source_path'
        }
      ]
    });
    assertStableRolloutJson(summary);
  });
});

function enabledConfig(): Extract<ArtAssetSemanticRolloutConfig, { enabled: true }> {
  return {
    enabled: true,
    envName: ART_ASSET_SEMANTIC_ROLLOUT_ENV,
    mode: 'pirate-kit-v0.1',
    fixtureRoot: PIRATE_KIT_ROLLOUT_FIXTURE_ROOT,
    metadataDir: PIRATE_KIT_ROLLOUT_METADATA_DIR
  };
}

async function loadPirateKitArtifact(): Promise<RuntimeArtAssetMetadataExportArtifact> {
  const result = await exportRuntimeArtAssetMetadataFromDirectory(PIRATE_KIT_ROLLOUT_METADATA_DIR);
  expect(result.ok).toBe(true);
  expect(result.diagnostics).toEqual([]);
  expect(result.artifact).toBeDefined();
  return result.artifact!;
}

function assertStableRolloutJson(value: unknown): void {
  const json = JSON.stringify(value);
  expect(json).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  expect(json).not.toContain(process.cwd());
  expect(json).not.toContain('/Users/');
  expect(json).not.toContain('assets/asset-packs');
}
