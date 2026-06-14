import { Injectable } from '@nestjs/common';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createSmallLibraryWorkbenchPreview,
  exportRuntimeArtAssetMetadataFromDirectory,
  SMALL_LIBRARY_WORKBENCH_PREVIEW_FIXTURE_ROOT
} from '../../../../packages/asset-pipeline/src/index.js';
import type { SmallLibraryArtAssetPreviewResponse } from './art-asset-preview.types.js';

const SMALL_LIBRARY_METADATA_DIR = `${SMALL_LIBRARY_WORKBENCH_PREVIEW_FIXTURE_ROOT}/metadata`;
const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const SMALL_LIBRARY_METADATA_ABSOLUTE_DIR = resolve(REPOSITORY_ROOT, SMALL_LIBRARY_METADATA_DIR);

@Injectable()
export class ArtAssetPreviewService {
  async getSmallLibraryPreview(): Promise<SmallLibraryArtAssetPreviewResponse> {
    const result = await exportRuntimeArtAssetMetadataFromDirectory(SMALL_LIBRARY_METADATA_ABSOLUTE_DIR);
    if (!result.ok || result.artifact === undefined) {
      throw new Error('Small library runtime-safe metadata export failed for Workbench preview.');
    }

    return {
      ok: true,
      preview: createSmallLibraryWorkbenchPreview(result.artifact)
    };
  }
}
