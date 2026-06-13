import { lstat } from 'node:fs/promises';
import { basename, join, relative, resolve, sep } from 'node:path';

import {
  exportRuntimeArtAssetMetadataFromDirectory,
  validateArtAssetMetadataFiles,
  type RuntimeArtAssetMetadata
} from '../packages/asset-pipeline/src/index.js';
import type { AssetSemanticCanaryCaseSummary, AssetSemanticCanaryFixtureSummary, AssetSemanticCanarySummary } from './asset-semantic-canary-report.js';

export type SmallArtLibraryCanaryDryRunOptions = {
  fixtureRoot: string;
  outputDir: string;
  repairEnabled: boolean;
  createdAt: string;
  projectRoot?: string;
};

const dryRunRepairSkippedReason = 'small_library_metadata_only_dry_run';

export async function isSmallArtLibraryFixtureRoot(fixturePath: string, projectRoot = process.cwd()): Promise<boolean> {
  try {
    const rootStat = await lstat(resolve(projectRoot, fixturePath));
    if (!rootStat.isDirectory()) {
      return false;
    }

    const metadataStat = await lstat(resolve(projectRoot, fixturePath, 'metadata'));
    return metadataStat.isDirectory();
  } catch {
    return false;
  }
}

export async function buildSmallArtLibraryCanaryDryRunSummary(options: SmallArtLibraryCanaryDryRunOptions): Promise<AssetSemanticCanarySummary> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const fixtureRoot = toProjectRelativePath(options.fixtureRoot, projectRoot, 'small art library fixture root');
  const outputDir = toProjectRelativePath(options.outputDir, projectRoot, 'small art library output directory');
  const metadataDir = join(fixtureRoot, 'metadata');

  const validationResult = await validateArtAssetMetadataFiles({
    targets: [metadataDir],
    checkPaths: true,
    projectRoot
  });
  if (!validationResult.ok) {
    throw new Error(`Small art library metadata validation failed: ${validationResult.diagnostics.map((item) => item.code).join(', ')}`);
  }

  const exportResult = await exportRuntimeArtAssetMetadataFromDirectory(metadataDir, {
    checkPaths: true,
    projectRoot
  });
  if (!exportResult.ok || exportResult.artifact === undefined) {
    throw new Error(`Small art library runtime export failed: ${exportResult.diagnostics.map((item) => item.code).join(', ')}`);
  }

  const fixture: AssetSemanticCanaryFixtureSummary = {
    kind: 'small_art_library',
    identity: basename(fixtureRoot),
    assetCount: exportResult.artifact.asset_count
  };
  const cases = exportResult.artifact.assets.map((asset) => buildDryRunCase(asset, outputDir, options.repairEnabled));

  return {
    version: 'asset-semantic-canary-v0.1',
    createdAt: options.createdAt,
    fixturePath: fixtureRoot,
    fixture,
    total: cases.length,
    runnable: cases.length,
    passed: cases.length,
    failed: 0,
    skipped: 0,
    experimental: 0,
    exitCode: 0,
    repairEnabled: options.repairEnabled,
    repairAttempted: false,
    repairAttemptedCount: 0,
    repairSucceededCount: 0,
    repairFailedCount: 0,
    repairSkippedReasons: options.repairEnabled ? { [dryRunRepairSkippedReason]: cases.length } : {},
    counts: {
      playable: cases.length,
      playableWithFallbackAssets: 0,
      playableWithArtWarnings: 0,
      needsAssetRepair: 0,
      qaFailed: 0,
      hardMismatch: 0,
      hardUnknown: 0,
      mediumWarnings: 0,
      fallbackGenerated: 0,
      placeholderUsed: 0,
      requiredAssetMissing: 0,
      assetLoadFailures: 0
    },
    repair: {
      enabled: options.repairEnabled,
      attemptedCount: 0,
      succeededCount: 0,
      failedCount: 0,
      skippedCount: options.repairEnabled ? cases.length : 0,
      skippedReasons: options.repairEnabled ? { [dryRunRepairSkippedReason]: cases.length } : {}
    },
    cases
  };
}

function buildDryRunCase(asset: RuntimeArtAssetMetadata, outputDir: string, repairEnabled: boolean): AssetSemanticCanaryCaseSummary {
  return {
    id: asset.asset_id,
    brief: `Small art library metadata dry-run asset: ${asset.title}`,
    category: 'supported_core_semantic',
    skipped: false,
    runtimeStatus: 'PASSED',
    assetSemanticStatus: 'PASSED',
    overallStatus: 'PLAYABLE',
    fallbackGeneratedCount: 0,
    mismatchCount: 0,
    unknownCount: 0,
    warningCount: 0,
    placeholderUsedCount: 0,
    requiredAssetMissingCount: 0,
    assetLoadFailureCount: 0,
    selectedPacks: ['art-library-small-v0.1'],
    reportPath: `${outputDir}/summary.json`,
    repair: repairEnabled
      ? {
          enabled: true,
          attempted: false,
          attemptCount: 0,
          skippedReason: dryRunRepairSkippedReason
        }
      : undefined,
    pass: true
  };
}

function toProjectRelativePath(value: string, projectRoot: string, label: string): string {
  const relativePath = relative(projectRoot, resolve(projectRoot, value)).split(sep).join('/');
  if (relativePath === '' || relativePath === '..' || relativePath.startsWith('../')) {
    throw new Error(`Expected ${label} to stay inside the project root.`);
  }
  return relativePath;
}
