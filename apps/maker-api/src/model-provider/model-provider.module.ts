import { Module } from '@nestjs/common';

import { DeepSeekClient } from './deepseek.client.js';
import { GameDslProviderService } from './game-dsl-provider.service.js';
import { readDeepSeekConfig } from './model-provider.config.js';
import { LocalWorkspaceModule } from '../workspace/local-workspace.module.js';
import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';

@Module({
  imports: [LocalWorkspaceModule],
  providers: [
    {
      provide: DeepSeekClient,
      useFactory: (workspace: LocalWorkspaceService) => new DeepSeekClient(workspace, readDeepSeekConfig()),
      inject: [LocalWorkspaceService]
    },
    {
      provide: GameDslProviderService,
      useFactory: (modelClient: DeepSeekClient) => new GameDslProviderService(modelClient),
      inject: [DeepSeekClient]
    }
  ],
  exports: [DeepSeekClient, GameDslProviderService]
})
export class ModelProviderModule {}
