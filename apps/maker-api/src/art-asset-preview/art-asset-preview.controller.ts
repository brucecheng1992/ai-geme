import { Controller, Get, Inject } from '@nestjs/common';

import { ArtAssetPreviewService } from './art-asset-preview.service.js';
import type { SmallLibraryArtAssetPreviewResponse } from './art-asset-preview.types.js';

@Controller('api/art-assets/preview')
export class ArtAssetPreviewController {
  constructor(@Inject(ArtAssetPreviewService) private readonly artAssetPreviewService: ArtAssetPreviewService) {}

  @Get('small-library')
  async getSmallLibraryPreview(): Promise<SmallLibraryArtAssetPreviewResponse> {
    return await this.artAssetPreviewService.getSmallLibraryPreview();
  }
}
