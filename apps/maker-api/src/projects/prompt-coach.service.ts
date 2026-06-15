import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import {
  DEFAULT_PROMPT_OPTIMIZATION_MODE,
  LLM_PROMPT_COACH_STRATEGY,
  MOCK_PROMPT_COACH_STRATEGY,
  PromptOptimizationArtifactRefSchema,
  PromptOptimizationReportSchema,
  SUPPORTED_PROMPT_COACH_DSL_VERSION,
  type PromptCoachLlmClient,
  type PromptCoachLlmResult,
  type PromptOptimizationArtifactRef,
  type PromptOptimizationMode,
  type PromptOptimizationReport
} from './prompt-coach.contract.js';
import { parsePromptCoachLlmPayload } from './prompt-coach-llm-output.js';
import { buildMockPromptCoachFields } from './prompt-coach-mock.js';
import { ProjectRequestError } from './project-request.error.js';

export type PromptOptimizationPrepareInput = {
  projectId: string;
  originalPrompt: string;
  supportedDslVersion?: 'v1';
  runId?: string;
  mode?: PromptOptimizationMode;
};

export type PromptOptimizationPrepareResult = {
  report: PromptOptimizationReport;
  artifacts: PromptOptimizationArtifactRef[];
};

export type PromptCoachServiceOptions = {
  llm?: {
    enabled: boolean;
    modelProfile?: string;
    client?: PromptCoachLlmClient;
  } & Partial<PromptCoachLlmClient>;
};

export class PromptCoachService {
  constructor(
    private readonly workspace: LocalWorkspaceService,
    private readonly options: PromptCoachServiceOptions = {}
  ) {}

  /**
   * Prepares auditable prompt coaching artifacts only.
   * Mock mode is deterministic; LLM mode uses a gated narrow adapter and still never applies a prompt or writes DSL artifacts.
   */
  async prepare(input: PromptOptimizationPrepareInput): Promise<PromptOptimizationPrepareResult> {
    const originalPrompt = normalizePrompt(input.originalPrompt);
    if (originalPrompt.length === 0) {
      throw new ProjectRequestError('originalPrompt is required.');
    }

    const supportedDslVersion = input.supportedDslVersion ?? SUPPORTED_PROMPT_COACH_DSL_VERSION;
    const mode = input.mode ?? DEFAULT_PROMPT_OPTIMIZATION_MODE;
    const report =
      mode === 'mock'
        ? this.buildMockReport({ ...input, originalPrompt, supportedDslVersion, mode })
        : await this.buildLlmReport({ ...input, originalPrompt, supportedDslVersion, mode });
    const artifacts = buildArtifactRefs(report.optimizationId).map((artifact) => PromptOptimizationArtifactRefSchema.parse(artifact));

    await writeArtifact(
      this.workspace.getProjectPromptOptimizationArtifactPath(input.projectId, report.optimizationId, 'prompt_optimization_report.json'),
      `${JSON.stringify(report, null, 2)}\n`
    );
    await writeArtifact(this.workspace.getProjectPromptOptimizationArtifactPath(input.projectId, report.optimizationId, 'optimized_prompt.txt'), `${report.optimizedPrompt}\n`);

    return { report, artifacts };
  }

  private buildMockReport(input: Required<Pick<PromptOptimizationPrepareInput, 'projectId' | 'originalPrompt' | 'supportedDslVersion' | 'mode'>> & Pick<PromptOptimizationPrepareInput, 'runId'>): PromptOptimizationReport {
    const optimizationId = buildOptimizationId(input.projectId, input.originalPrompt, input.supportedDslVersion, input.runId, 'mock');
    const fields = buildMockPromptCoachFields(input.originalPrompt);

    return PromptOptimizationReportSchema.parse({
      reportVersion: 'prompt_optimization_report.v1',
      projectId: input.projectId,
      optimizationId,
      runId: input.runId,
      originalPrompt: input.originalPrompt,
      optimizedPrompt: fields.optimizedPrompt,
      intentSummary: fields.intentSummary,
      dslFitWarnings: fields.dslFitWarnings,
      unsupportedRequests: fields.unsupportedRequests,
      suggestedQuestions: fields.suggestedQuestions,
      supportedDslVersion: input.supportedDslVersion,
      capabilitiesUsed: fields.capabilitiesUsed,
      status: 'prepared',
      applied: false,
      strategy: MOCK_PROMPT_COACH_STRATEGY,
      mode: input.mode
    });
  }

  private async buildLlmReport(input: Required<Pick<PromptOptimizationPrepareInput, 'projectId' | 'originalPrompt' | 'supportedDslVersion' | 'mode'>> & Pick<PromptOptimizationPrepareInput, 'runId'>): Promise<PromptOptimizationReport> {
    const llm = this.resolveLlmClient();
    const result = await llm.optimize({
      projectId: input.projectId,
      runId: input.runId,
      originalPrompt: input.originalPrompt,
      supportedDslVersion: input.supportedDslVersion
    });

    if (!result.ok) {
      throw new ProjectRequestError(promptCoachLlmFailureMessage(result));
    }

    const payload = parsePromptCoachLlmPayload(result.json);
    const optimizationId = buildOptimizationId(input.projectId, input.originalPrompt, input.supportedDslVersion, input.runId, 'llm', stablePayloadHash(payload));

    return PromptOptimizationReportSchema.parse({
      reportVersion: 'prompt_optimization_report.v1',
      projectId: input.projectId,
      optimizationId,
      runId: input.runId,
      originalPrompt: input.originalPrompt,
      optimizedPrompt: payload.optimizedPrompt,
      intentSummary: payload.intentSummary,
      dslFitWarnings: payload.dslFitWarnings,
      unsupportedRequests: payload.unsupportedRequests,
      suggestedQuestions: payload.suggestedQuestions,
      supportedDslVersion: input.supportedDslVersion,
      capabilitiesUsed: payload.capabilitiesUsed,
      status: 'prepared',
      applied: false,
      strategy: LLM_PROMPT_COACH_STRATEGY,
      mode: input.mode,
      modelProfile: this.options.llm?.modelProfile
    });
  }

  private resolveLlmClient(): PromptCoachLlmClient {
    const llm = this.options.llm;
    const client = llm?.client ?? (typeof llm?.optimize === 'function' ? { optimize: llm.optimize } : undefined);

    if (llm?.enabled !== true || client === undefined) {
      throw new ProjectRequestError('Prompt Coach LLM mode is not configured.');
    }

    return client;
  }
}

function promptCoachLlmFailureMessage(result: PromptCoachLlmResult): string {
  if (result.ok) {
    return 'Prompt Coach LLM mode is unavailable.';
  }
  if (result.code === 'MODEL_RATE_LIMITED') {
    return 'Prompt Coach LLM is rate limited.';
  }
  return 'Prompt Coach LLM mode is unavailable.';
}

function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, ' ');
}

function buildOptimizationId(projectId: string, originalPrompt: string, supportedDslVersion: 'v1', runId: string | undefined, mode: PromptOptimizationMode, payloadHash?: string): string {
  const modeScope = mode === 'mock' ? '' : `${mode}\n`;
  const stableHash = createHash('sha256')
    .update(`${projectId}\n${runId ?? 'project-level'}\n${modeScope}${payloadHash === undefined ? '' : `${payloadHash}\n`}${originalPrompt}\n${supportedDslVersion}\n${mode === 'mock' ? MOCK_PROMPT_COACH_STRATEGY : LLM_PROMPT_COACH_STRATEGY}`)
    .digest('hex')
    .slice(0, 12);
  return `opt_${projectId}_${stableHash}`;
}

function stablePayloadHash(payload: {
  optimizedPrompt: string;
  intentSummary: string;
  dslFitWarnings: string[];
  unsupportedRequests: string[];
  suggestedQuestions: string[];
  capabilitiesUsed: string[];
}): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 12);
}

function buildArtifactRefs(optimizationId: string): PromptOptimizationArtifactRef[] {
  return [
    {
      id: 'promptOptimizationReport',
      artifactRoot: 'model-output',
      path: `prompt-optimizations/${optimizationId}/prompt_optimization_report.json`,
      format: 'json'
    },
    {
      id: 'optimizedPrompt',
      artifactRoot: 'model-output',
      path: `prompt-optimizations/${optimizationId}/optimized_prompt.txt`,
      format: 'txt'
    }
  ];
}


async function writeArtifact(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}
