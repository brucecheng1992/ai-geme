import { stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

import { Controller, Get, Inject, NotFoundException, Param, Res } from '@nestjs/common';

import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';

type FileResponse = {
  contentType(type: string): FileResponse;
  sendFile(path: string): void;
};

@Controller('preview')
export class PreviewController {
  constructor(@Inject(LocalWorkspaceService) private readonly workspace: LocalWorkspaceService) {}

  @Get(':projectId/index.html')
  async index(@Param('projectId') projectId: string, @Res() response: FileResponse): Promise<void> {
    const filePath = join(this.workspace.getGeneratedProjectDistDir(projectId), 'index.html');
    await this.assertPreviewFile(filePath, 'Preview index.html not found.');

    response.contentType('text/html').sendFile(filePath);
  }

  @Get(':projectId/assets/:fileName')
  async asset(@Param('projectId') projectId: string, @Param('fileName') fileName: string, @Res() response: FileResponse): Promise<void> {
    const assetsDir = join(this.workspace.getGeneratedProjectDistDir(projectId), 'assets');
    const filePath = resolve(assetsDir, fileName);
    const pathFromAssets = relative(assetsDir, filePath);

    if (pathFromAssets === '' || pathFromAssets.startsWith('..') || isAbsolute(pathFromAssets)) {
      throw new NotFoundException('Preview asset not found.');
    }

    await this.assertPreviewFile(filePath, 'Preview asset not found.');

    response.sendFile(filePath);
  }

  private async assertPreviewFile(filePath: string, message: string): Promise<void> {
    this.workspace.assertInsideWorkspace(filePath);
    try {
      await stat(filePath);
    } catch {
      throw new NotFoundException(message);
    }
  }
}
