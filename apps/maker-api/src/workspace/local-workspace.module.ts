import { Module } from '@nestjs/common';

import { LocalWorkspaceService } from './local-workspace.service.js';

@Module({
  providers: [LocalWorkspaceService],
  exports: [LocalWorkspaceService]
})
export class LocalWorkspaceModule {}
