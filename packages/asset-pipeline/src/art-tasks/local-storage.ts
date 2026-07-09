import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { GeneratedAssetStorage, StoredGeneratedImage } from './types.js';

export type LocalGeneratedAssetStorageOptions = {
  rootDir?: string;
};

export function createLocalGeneratedAssetStorage(options: LocalGeneratedAssetStorageOptions = {}): GeneratedAssetStorage {
  return new LocalGeneratedAssetStorage(options.rootDir ?? '.');
}

class LocalGeneratedAssetStorage implements GeneratedAssetStorage {
  private readonly baseDir: string;

  constructor(rootDir: string) {
    this.baseDir = join(rootDir, 'artifacts', 'generated-assets');
  }

  async store(input: {
    projectId: string;
    taskId: string;
    assetId: string;
    base64?: string;
    temporaryUrl?: string;
    mimeType?: string;
  }): Promise<StoredGeneratedImage> {
    if (input.base64 !== undefined) {
      const extension = extensionForMimeType(input.mimeType);
      const localPath = join(this.baseDir, input.projectId, input.taskId, `${input.assetId}.${extension}`);
      await mkdir(join(this.baseDir, input.projectId, input.taskId), { recursive: true });
      await writeFile(localPath, Buffer.from(input.base64, 'base64'));
      return {
        localPath,
        storagePath: localPath
      };
    }

    // TODO: Copy provider temporary URLs into durable storage once a downloader/storage helper exists.
    if (input.temporaryUrl !== undefined) {
      return { temporaryUrl: input.temporaryUrl };
    }

    throw new Error(`Generated image for asset ${input.assetId} did not include base64 or a temporary URL.`);
  }
}

function extensionForMimeType(mimeType: string | undefined): string {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
    case 'image/jpg':
    case undefined:
      return 'jpg';
    default:
      return 'bin';
  }
}
