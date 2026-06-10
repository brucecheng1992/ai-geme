import { Module } from '@nestjs/common';

import { LocalWorkspaceModule } from '../workspace/local-workspace.module.js';
import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import { PreviewController } from './preview.controller.js';
import { TemplateCompilerService } from './template-compiler.service.js';
import { ViteBuildRunnerService } from './vite-build-runner.service.js';

@Module({
  imports: [LocalWorkspaceModule],
  controllers: [PreviewController],
  providers: [
    {
      provide: TemplateCompilerService,
      useFactory: (workspace: LocalWorkspaceService) => new TemplateCompilerService(workspace),
      inject: [LocalWorkspaceService]
    },
    {
      provide: ViteBuildRunnerService,
      useFactory: (workspace: LocalWorkspaceService) => new ViteBuildRunnerService(workspace),
      inject: [LocalWorkspaceService]
    }
  ],
  exports: [TemplateCompilerService, ViteBuildRunnerService]
})
export class CompilerModule {}
