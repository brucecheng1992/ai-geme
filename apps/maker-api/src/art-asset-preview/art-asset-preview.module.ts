import { Module } from '@nestjs/common';

import { ArtAssetPreviewController } from './art-asset-preview.controller.js';
import { ArtAssetPreviewService } from './art-asset-preview.service.js';

@Module({
  controllers: [ArtAssetPreviewController],
  providers: [ArtAssetPreviewService],
  exports: [ArtAssetPreviewService]
})
export class ArtAssetPreviewModule {}
