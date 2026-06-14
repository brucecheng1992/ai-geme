import { Module } from '@nestjs/common';

import { CompilerModule } from '../compiler/compiler.module.js';
import { TemplateCompilerService } from '../compiler/template-compiler.service.js';
import { ViteBuildRunnerService } from '../compiler/vite-build-runner.service.js';
import { GameDslProviderService } from '../model-provider/game-dsl-provider.service.js';
import { ModelProviderModule } from '../model-provider/model-provider.module.js';
import { PlaywrightQaRunnerService } from '../qa/playwright-qa-runner.service.js';
import { QaModule } from '../qa/qa.module.js';
import { LocalWorkspaceModule } from '../workspace/local-workspace.module.js';
import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import { DslLiveEditService } from './dsl-live-edit.service.js';
import { GenerationPipelineService } from './generation-pipeline.service.js';
import { ProjectStoreService } from './project-store.service.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';
import { RunStoreService } from './run-store.service.js';

@Module({
  imports: [LocalWorkspaceModule, ModelProviderModule, CompilerModule, QaModule],
  controllers: [ProjectsController],
  providers: [
    {
      provide: ProjectStoreService,
      useFactory: (workspace: LocalWorkspaceService) => new ProjectStoreService(workspace),
      inject: [LocalWorkspaceService]
    },
    {
      provide: RunStoreService,
      useFactory: (workspace: LocalWorkspaceService) => new RunStoreService(workspace),
      inject: [LocalWorkspaceService]
    },
    {
      provide: DslLiveEditService,
      useFactory: (workspace: LocalWorkspaceService) => new DslLiveEditService(workspace),
      inject: [LocalWorkspaceService]
    },
    {
      provide: ProjectsService,
      useFactory: (
        projectStore: ProjectStoreService,
        runStore: RunStoreService,
        workspace: LocalWorkspaceService,
        liveEdit: DslLiveEditService,
        pipeline: GenerationPipelineService
      ) => new ProjectsService(projectStore, runStore, workspace, liveEdit, pipeline),
      inject: [ProjectStoreService, RunStoreService, LocalWorkspaceService, DslLiveEditService, GenerationPipelineService]
    },
    {
      provide: GenerationPipelineService,
      useFactory: (
        projectStore: ProjectStoreService,
        runStore: RunStoreService,
        workspace: LocalWorkspaceService,
        modelProvider: GameDslProviderService,
        compiler: TemplateCompilerService,
        buildRunner: ViteBuildRunnerService,
        qaRunner: PlaywrightQaRunnerService
      ) => new GenerationPipelineService(projectStore, runStore, workspace, modelProvider, compiler, buildRunner, qaRunner),
      inject: [
        ProjectStoreService,
        RunStoreService,
        LocalWorkspaceService,
        GameDslProviderService,
        TemplateCompilerService,
        ViteBuildRunnerService,
        PlaywrightQaRunnerService
      ]
    }
  ],
  exports: [ProjectStoreService, RunStoreService, ProjectsService, GenerationPipelineService, DslLiveEditService]
})
export class ProjectsModule {}
