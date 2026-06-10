import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';

import type {
  BuildLogResponse,
  GenerateProjectResponse,
  ProjectStatusResponse,
  QaReportResponse,
  RepairReportResponse,
  RunEventsResponse
} from './project-api.types.js';
import { ProjectsService } from './projects.service.js';

@Controller('api/projects')
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly projectsService: ProjectsService) {}

  @Post('generate')
  async generateProject(@Body() body: unknown): Promise<GenerateProjectResponse> {
    return await this.projectsService.generateProject(body);
  }

  @Get(':projectId')
  async getProject(@Param('projectId') projectId: string): Promise<ProjectStatusResponse> {
    return await this.projectsService.getProject(projectId);
  }

  @Get(':projectId/runs/:runId/events')
  async getRunEvents(@Param('projectId') projectId: string, @Param('runId') runId: string): Promise<RunEventsResponse> {
    return await this.projectsService.getRunEvents(projectId, runId);
  }

  @Get(':projectId/runs/:runId/qa-report')
  async getQaReport(@Param('projectId') projectId: string, @Param('runId') runId: string): Promise<QaReportResponse> {
    return await this.projectsService.getQaReport(projectId, runId);
  }

  @Get(':projectId/runs/:runId/repair-report')
  async getRepairReport(@Param('projectId') projectId: string, @Param('runId') runId: string): Promise<RepairReportResponse> {
    return await this.projectsService.getRepairReport(projectId, runId);
  }

  @Get(':projectId/runs/:runId/build-log')
  async getBuildLog(@Param('projectId') projectId: string, @Param('runId') runId: string): Promise<BuildLogResponse> {
    return await this.projectsService.getBuildLog(projectId, runId);
  }
}
