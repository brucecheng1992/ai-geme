import { lstat, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { createArtAssetMetadataValidationDiagnostic } from './art-asset-metadata-validation.diagnostics.js';
import type { ArtAssetMetadataValidationDiagnostic } from './art-asset-metadata-validation.types.js';

export async function discoverArtAssetMetadataFiles(
  targets: readonly string[],
  cwd: string,
  diagnostics: ArtAssetMetadataValidationDiagnostic[]
): Promise<string[]> {
  const filePaths: string[] = [];

  for (const target of targets) {
    const targetPath = resolve(cwd, target);
    let stats;
    try {
      stats = await lstat(targetPath);
    } catch {
      diagnostics.push(createArtAssetMetadataValidationDiagnostic('INPUT_PATH_NOT_FOUND', targetPath, 'Input path does not exist.'));
      continue;
    }

    if (stats.isDirectory()) {
      filePaths.push(...(await collectMetadataFiles(targetPath)));
      continue;
    }

    if (stats.isFile() && targetPath.endsWith('.asset.json')) {
      filePaths.push(targetPath);
      continue;
    }

    diagnostics.push(
      createArtAssetMetadataValidationDiagnostic('UNSUPPORTED_INPUT_PATH', targetPath, 'Input must be a .asset.json file or a directory.')
    );
  }

  const uniqueFilePaths = [...new Set(filePaths)].sort();
  if (uniqueFilePaths.length === 0 && diagnostics.length === 0) {
    for (const target of targets) {
      diagnostics.push(createArtAssetMetadataValidationDiagnostic('NO_METADATA_FILES', resolve(cwd, target), 'No .asset.json files found.'));
    }
  }

  return uniqueFilePaths;
}

async function collectMetadataFiles(directoryPath: string): Promise<string[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const collected: string[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      collected.push(...(await collectMetadataFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith('.asset.json')) {
      collected.push(entryPath);
    }
  }

  return collected;
}
