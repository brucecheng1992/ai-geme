import { Module } from '@nestjs/common';

import { LocalWorkspaceModule } from '../workspace/local-workspace.module.js';
import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import { PlayableQaGateService } from './playable-qa-gate.service.js';
import { PlaywrightQaRunnerService } from './playwright-qa-runner.service.js';

@Module({
  imports: [LocalWorkspaceModule],
  providers: [
    PlayableQaGateService,
    {
      provide: PlaywrightQaRunnerService,
      useFactory: (workspace: LocalWorkspaceService, gate: PlayableQaGateService) => new PlaywrightQaRunnerService(workspace, gate),
      inject: [LocalWorkspaceService, PlayableQaGateService]
    }
  ],
  exports: [PlayableQaGateService, PlaywrightQaRunnerService]
})
export class QaModule {}
