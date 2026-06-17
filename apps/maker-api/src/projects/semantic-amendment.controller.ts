import { Body, Controller, Inject, Param, Post } from '@nestjs/common';

import { SemanticAmendmentService } from './semantic-amendment.service.js';
import type {
  AcceptSemanticAmendmentResponse,
  PlanSemanticAmendmentResponse,
  PreviewSemanticAmendmentResponse,
  RejectSemanticAmendmentResponse,
  UndoSemanticAmendmentResponse
} from './semantic-amendment.types.js';

@Controller('api/projects/:projectId/runs/:runId/semantic-amendments')
export class SemanticAmendmentController {
  constructor(@Inject(SemanticAmendmentService) private readonly semanticAmendmentService: SemanticAmendmentService) {}

  @Post('plan')
  async plan(
    @Param('projectId') projectId: string,
    @Param('runId') runId: string,
    @Body() body: unknown
  ): Promise<PlanSemanticAmendmentResponse> {
    return await this.semanticAmendmentService.plan(projectId, runId, body);
  }

  @Post(':proposalId/preview')
  async preview(
    @Param('projectId') projectId: string,
    @Param('runId') runId: string,
    @Param('proposalId') proposalId: string
  ): Promise<PreviewSemanticAmendmentResponse> {
    return await this.semanticAmendmentService.preview(projectId, runId, proposalId);
  }

  @Post(':proposalId/accept')
  async accept(
    @Param('projectId') projectId: string,
    @Param('runId') runId: string,
    @Param('proposalId') proposalId: string,
    @Body() body: unknown
  ): Promise<AcceptSemanticAmendmentResponse> {
    return await this.semanticAmendmentService.accept(projectId, runId, proposalId, body);
  }

  @Post(':proposalId/reject')
  async reject(
    @Param('projectId') projectId: string,
    @Param('runId') runId: string,
    @Param('proposalId') proposalId: string,
    @Body() body: unknown
  ): Promise<RejectSemanticAmendmentResponse> {
    return await this.semanticAmendmentService.reject(projectId, runId, proposalId, body);
  }

  @Post(':proposalId/undo')
  async undo(
    @Param('projectId') projectId: string,
    @Param('runId') runId: string,
    @Param('proposalId') proposalId: string,
    @Body() body: unknown
  ): Promise<UndoSemanticAmendmentResponse> {
    return await this.semanticAmendmentService.undo(projectId, runId, proposalId, body);
  }
}
