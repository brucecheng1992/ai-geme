import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import { DslLiveEditService } from './dsl-live-edit.service.js';
import { PipelineArtifactIndexSchema } from './pipeline-artifact-index.js';
import { ProjectRequestError } from './project-request.error.js';
import { ProjectStoreService } from './project-store.service.js';
import { resolveLiveRuntimeCapabilityReport } from './runtime-capability-resolution.js';
import { RunStoreService } from './run-store.service.js';
import {
  attachSemanticAmendmentArtifactRefs,
  buildSemanticAmendmentArtifactRefs,
  writeSemanticAmendmentPlanArtifacts
} from './semantic-amendment-artifacts.js';
import {
  acceptSemanticAmendment,
  previewSemanticAmendment,
  rejectSemanticAmendment,
  undoSemanticAmendment
} from './semantic-amendment-lifecycle.js';
import { assertRunBelongsToProject, readCurrentGameDsl } from './semantic-amendment-live-state.js';
import type {
  AcceptSemanticAmendmentResponse,
  PlanSemanticAmendmentRequest,
  PlanSemanticAmendmentResponse,
  PreviewSemanticAmendmentResponse,
  RejectSemanticAmendmentResponse,
  UndoSemanticAmendmentResponse
} from './semantic-amendment.types.js';
import {
  buildAmendmentContextPack,
  planSemanticAmendment
} from '../../../../packages/game-dsl/src/index.js';

type ProposalIdFactory = (createdAt: Date) => string;
type NowFactory = () => Date;

export class SemanticAmendmentService {
  constructor(
    private readonly projectStore: ProjectStoreService,
    private readonly runStore: RunStoreService,
    private readonly workspace: LocalWorkspaceService,
    private readonly liveEdit: DslLiveEditService,
    private readonly now: NowFactory = () => new Date(),
    private readonly proposalIdFactory: ProposalIdFactory = createSemanticAmendmentProposalId
  ) {}

  /**
   * Plans a natural-language game amendment and persists audit artifacts only.
   * It deliberately does not prepare live patches, create candidate runs, or advance live current state.
   */
  async plan(projectId: string, runId: string, body: unknown): Promise<PlanSemanticAmendmentResponse> {
    const project = await this.projectStore.readProject(projectId);
    await assertRunBelongsToProject(this.runStore, projectId, runId);

    const request = this.parsePlanRequest(body);
    const currentDsl = await readCurrentGameDsl(this.workspace, projectId, runId);
    const runtimeCapabilityReport = await resolveLiveRuntimeCapabilityReport({ projectId, runId, gameDsl: currentDsl, workspace: this.workspace });
    const pipelineArtifactIndex = await this.readPipelineArtifactIndexIfPresent(projectId, runId);
    const context = buildAmendmentContextPack({
      projectId,
      runId,
      currentBrief: { idea: project.idea, language: project.language },
      currentDsl,
      runtimeCapabilityReport,
      generatorCapabilities: ['candidate_brief', 'candidate_dsl', 'candidate_run', 'candidate_theme_player'],
      ...(pipelineArtifactIndex === undefined ? {} : { pipelineArtifactIndex })
    });
    const createdAt = this.now();
    const planned = planSemanticAmendment({
      projectId,
      runId,
      text: request.text,
      language: request.language,
      context,
      now: () => createdAt,
      createProposalId: () => this.proposalIdFactory(createdAt)
    });
    const artifactRefs = buildSemanticAmendmentArtifactRefs(planned.id);
    const proposal = attachSemanticAmendmentArtifactRefs(planned, artifactRefs);

    await writeSemanticAmendmentPlanArtifacts(this.workspace, {
      projectId,
      runId,
      proposal,
      context,
      request: {
        projectId,
        runId,
        sourceText: request.text,
        language: proposal.language,
        requestedAt: createdAt.toISOString()
      }
    });

    return {
      ok: true,
      proposal,
      artifact_refs: artifactRefs
    };
  }

  async preview(projectId: string, runId: string, proposalId: string): Promise<PreviewSemanticAmendmentResponse> {
    return await previewSemanticAmendment(this.lifecycleDeps(), projectId, runId, proposalId);
  }

  async accept(projectId: string, runId: string, proposalId: string, body: unknown): Promise<AcceptSemanticAmendmentResponse> {
    return await acceptSemanticAmendment(this.lifecycleDeps(), projectId, runId, proposalId, body);
  }

  async reject(projectId: string, runId: string, proposalId: string, body: unknown): Promise<RejectSemanticAmendmentResponse> {
    return await rejectSemanticAmendment(this.lifecycleDeps(), projectId, runId, proposalId, body);
  }

  async undo(projectId: string, runId: string, proposalId: string, body: unknown): Promise<UndoSemanticAmendmentResponse> {
    return await undoSemanticAmendment(this.lifecycleDeps(), projectId, runId, proposalId, body);
  }

  private lifecycleDeps() {
    return {
      projectStore: this.projectStore,
      runStore: this.runStore,
      workspace: this.workspace,
      liveEdit: this.liveEdit,
      now: this.now
    };
  }

  private parsePlanRequest(body: unknown): Required<Pick<PlanSemanticAmendmentRequest, 'text'>> & Pick<PlanSemanticAmendmentRequest, 'language'> {
    if (!isRecord(body)) {
      throw new ProjectRequestError('Request body must be an object.');
    }
    if (typeof body.text !== 'string' || body.text.trim().length === 0) {
      throw new ProjectRequestError('text is required.');
    }
    if (body.language !== undefined && body.language !== 'zh' && body.language !== 'en') {
      throw new ProjectRequestError('language must be "zh" or "en" when provided.');
    }

    return {
      text: body.text.trim(),
      language: body.language
    };
  }

  private async readPipelineArtifactIndexIfPresent(projectId: string, runId: string): Promise<unknown | undefined> {
    try {
      const artifactIndex = PipelineArtifactIndexSchema.parse(
        JSON.parse(await readFile(this.workspace.getModelOutputPath(projectId, runId, 'pipeline_artifact_index.json'), 'utf8'))
      );
      if (artifactIndex.projectId !== projectId || artifactIndex.runId !== runId) {
        throw new ProjectRequestError(`pipeline artifact index identity does not match run: ${projectId}/${runId}`);
      }
      return artifactIndex;
    } catch (error) {
      if (isNodeErrorCode(error, 'ENOENT')) {
        return undefined;
      }
      throw error;
    }
  }
}

function createSemanticAmendmentProposalId(createdAt: Date): string {
  const timestamp = createdAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '').replace('T', '_');
  return `amend_${timestamp}_${randomBytes(4).toString('hex')}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === code;
}
