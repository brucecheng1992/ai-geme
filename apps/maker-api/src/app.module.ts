import { Module } from '@nestjs/common';

import { HealthController } from './health.controller.js';
import { CompilerModule } from './compiler/compiler.module.js';
import { ModelProviderModule } from './model-provider/model-provider.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { QaModule } from './qa/qa.module.js';
import { RepairModule } from './repair/repair.module.js';
import { LocalWorkspaceModule } from './workspace/local-workspace.module.js';

@Module({
  imports: [LocalWorkspaceModule, ProjectsModule, ModelProviderModule, CompilerModule, QaModule, RepairModule],
  controllers: [HealthController]
})
export class AppModule {}
