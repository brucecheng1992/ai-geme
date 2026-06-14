import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';

import type {
  BuildLogResponse,
  GenerateProjectResponse,
  LiveCurrentResponse,
  PrepareDeterministicPatchResponse,
  ProjectStatusResponse,
  QaReportResponse,
  RepairReportResponse,
  RuntimeApplyResultResponse,
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

  @Get(':projectId/runs/:runId/live/current')
  async getLiveCurrent(@Param('projectId') projectId: string, @Param('runId') runId: string): Promise<LiveCurrentResponse> {
    return await this.projectsService.getLiveCurrent(projectId, runId);
  }

  @Post(':projectId/runs/:runId/live-edits/prepare')
  async prepareLiveEdit(@Param('projectId') projectId: string, @Param('runId') runId: string, @Body() body: unknown): Promise<PrepareDeterministicPatchResponse> {
    return await this.projectsService.prepareWorkbenchLiveEdit(projectId, runId, body);
  }

  @Post(':projectId/runs/:runId/live-edits/:patchId/runtime-result')
  async recordLiveEditRuntimeResult(
    @Param('projectId') projectId: string,
    @Param('runId') runId: string,
    @Param('patchId') patchId: string,
    @Body() body: unknown
  ): Promise<RuntimeApplyResultResponse> {
    return await this.projectsService.recordWorkbenchRuntimeApplyResult(projectId, runId, patchId, body);
  }

  @Post(':projectId/runs/:runId/live-edit/deterministic-patch')
  async prepareDeterministicPatch(@Param('projectId') projectId: string, @Param('runId') runId: string): Promise<PrepareDeterministicPatchResponse> {
    return await this.projectsService.prepareWorkbenchDeterministicPatch(projectId, runId);
  }

  @Post(':projectId/runs/:runId/live-edit/:patchId/runtime-apply')
  async recordRuntimeApplyResult(
    @Param('projectId') projectId: string,
    @Param('runId') runId: string,
    @Param('patchId') patchId: string,
    @Body() body: unknown
  ): Promise<RuntimeApplyResultResponse> {
    return await this.projectsService.recordWorkbenchRuntimeApplyResult(projectId, runId, patchId, body);
  }
}
