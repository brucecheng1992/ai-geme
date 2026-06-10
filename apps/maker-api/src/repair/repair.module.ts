import { Module } from '@nestjs/common';

import { LocalWorkspaceModule } from '../workspace/local-workspace.module.js';
import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import { DslRepairService } from './dsl-repair.service.js';

@Module({
  imports: [LocalWorkspaceModule],
  providers: [
    {
      provide: DslRepairService,
      useFactory: (workspace: LocalWorkspaceService) => new DslRepairService(workspace),
      inject: [LocalWorkspaceService]
    }
  ],
  exports: [DslRepairService]
})
export class RepairModule {}
