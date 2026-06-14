import { describe, expect, it } from 'vitest';

import {
  createSmallLibraryRuntimeCanarySummary,
  readArtAssetRuntimeCanaryConfig,
  runArtAssetRuntimeCanary,
  SMALL_LIBRARY_FIXTURE_ROOT,
  SMALL_LIBRARY_METADATA_DIR,
  type ArtAssetRuntimeCanaryConfig,
  type RuntimeMetadataExporter
} from '../../scripts/art-asset-runtime-canary.js';
import {
  exportRuntimeArtAssetMetadataFromDirectory,
  type RuntimeArtAssetMetadataExportArtifact
} from '../../packages/asset-pipeline/src/index.js';

describe('Step 11B non-default runtime metadata canary', () => {
  it('keeps the runtime canary disabled by default and avoids metadata export I/O', async () => {
    const config = readArtAssetRuntimeCanaryConfig({} as NodeJS.ProcessEnv);
    let exportCalled = false;
    const summary = await runArtAssetRuntimeCanary(config, async () => {
      exportCalled = true;
      throw new Error('disabled canary should not export metadata');
    });

    expect(config).toEqual({
      enabled: false,
      envName: 'ASSET_RUNTIME_METADATA_CANARY',
      mode: 'disabled'
    });
    expect(exportCalled).toBe(false);
    expect(summary).toEqual({
      canary_version: '0.1',
      enabled: false,
      mode: 'disabled',
      ok: true,
      diagnostic_count: 0,
      diagnostics: []
    });
  });

  it('accepts only the small-library runtime canary flag value', () => {
    expect(readArtAssetRuntimeCanaryConfig({ ASSET_RUNTIME_METADATA_CANARY: '' } as NodeJS.ProcessEnv)).toMatchObject({
      enabled: false,
      mode: 'disabled'
    });
    expect(readArtAssetRuntimeCanaryConfig({ ASSET_RUNTIME_METADATA_CANARY: 'small-library-v0.1' } as NodeJS.ProcessEnv)).toEqual(enabledConfig());
    expect(() => readArtAssetRuntimeCanaryConfig({ ASSET_RUNTIME_METADATA_CANARY: 'large-library' } as NodeJS.ProcessEnv)).toThrow(
      'Unsupported ASSET_RUNTIME_METADATA_CANARY value: large-library'
    );
  });

  it('runs the flag-on canary only against the small fixture runtime-safe export', async () => {
    const requestedDirs: string[] = [];
    const summary = await runArtAssetRuntimeCanary(enabledConfig(), async (metadataDir) => {
      requestedDirs.push(metadataDir);
      return exportRuntimeArtAssetMetadataFromDirectory(metadataDir);
    });

    expect(requestedDirs).toEqual([SMALL_LIBRARY_METADATA_DIR]);
    expect(summary).toEqual({
      canary_version: '0.1',
      enabled: true,
      mode: 'small-library-v0.1',
      fixture: SMALL_LIBRARY_FIXTURE_ROOT,
      metadata_dir: SMALL_LIBRARY_METADATA_DIR,
      ok: true,
      asset_count: 10,
      diagnostic_count: 0,
      diagnostics: []
    });
    assertStableCanaryJson(summary);
  });

  it('fails closed when runtime metadata export fails', async () => {
    const failingExporter: RuntimeMetadataExporter = async () => ({
      ok: false,
      diagnostics: [],
      artifact: undefined
    });

    const summary = await runArtAssetRuntimeCanary(enabledConfig(), failingExporter);

    expect(summary).toEqual({
      canary_version: '0.1',
      enabled: true,
      mode: 'small-library-v0.1',
      fixture: SMALL_LIBRARY_FIXTURE_ROOT,
      metadata_dir: SMALL_LIBRARY_METADATA_DIR,
      ok: false,
      diagnostic_count: 1,
      diagnostics: [
        {
          severity: 'error',
          code: 'ART_ASSET_RUNTIME_CANARY_EXPORT_FAILED',
          message: 'Small library runtime metadata export failed.'
        }
      ]
    });
    assertStableCanaryJson(summary);
  });

  it('rejects invalid runtime artifacts without mutating metadata', async () => {
    const artifact = await loadSmallLibraryArtifact();
    const invalidArtifact: RuntimeArtAssetMetadataExportArtifact = {
      ...artifact,
      asset_count: 9,
      assets: artifact.assets.map((asset, index) =>
        index === 0
          ? {
              ...asset,
              technical: {
                ...asset.technical,
                source_path: 'assets/asset-packs/large-library/cat.glb'
              }
            }
          : asset
      )
    };
    const before = JSON.stringify(invalidArtifact);
    const summary = createSmallLibraryRuntimeCanarySummary(invalidArtifact, enabledConfig());

    expect(JSON.stringify(invalidArtifact)).toBe(before);
    expect(summary).toEqual({
      canary_version: '0.1',
      enabled: true,
      mode: 'small-library-v0.1',
      fixture: SMALL_LIBRARY_FIXTURE_ROOT,
      metadata_dir: SMALL_LIBRARY_METADATA_DIR,
      ok: false,
      asset_count: 9,
      diagnostic_count: 2,
      diagnostics: [
        {
          severity: 'error',
          code: 'ART_ASSET_RUNTIME_CANARY_UNEXPECTED_ASSET_COUNT',
          message: 'Expected 10 small-library runtime assets but received 9.',
          jsonPath: '$.asset_count'
        },
        {
          severity: 'error',
          code: 'ART_ASSET_RUNTIME_CANARY_UNSAFE_PATH',
          message: 'Runtime metadata asset "creature_kenney_cube_pet_bee_001" has source_path outside the small-library fixture root.',
          assetId: 'creature_kenney_cube_pet_bee_001',
          jsonPath: '$.assets[0].technical.source_path'
        }
      ]
    });
    assertStableCanaryJson(summary);
  });
});

function enabledConfig(): Extract<ArtAssetRuntimeCanaryConfig, { enabled: true }> {
  return {
    enabled: true,
    envName: 'ASSET_RUNTIME_METADATA_CANARY',
    mode: 'small-library-v0.1',
    fixtureRoot: SMALL_LIBRARY_FIXTURE_ROOT,
    metadataDir: SMALL_LIBRARY_METADATA_DIR
  };
}

async function loadSmallLibraryArtifact(): Promise<RuntimeArtAssetMetadataExportArtifact> {
  const result = await exportRuntimeArtAssetMetadataFromDirectory(SMALL_LIBRARY_METADATA_DIR);
  expect(result.ok).toBe(true);
  expect(result.diagnostics).toEqual([]);
  expect(result.artifact).toBeDefined();
  return result.artifact!;
}

function assertStableCanaryJson(value: unknown): void {
  const json = JSON.stringify(value);
  expect(json).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  expect(json).not.toContain(process.cwd());
  expect(json).not.toContain('/Users/');
  expect(json).not.toContain('assets/asset-packs');
}
