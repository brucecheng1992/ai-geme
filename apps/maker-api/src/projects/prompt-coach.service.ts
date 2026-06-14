import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { z } from 'zod';

import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import { ProjectRequestError } from './project-request.error.js';

const SUPPORTED_DSL_VERSION = 'v1';
const PROMPT_COACH_STRATEGY = 'mock-v1';

export const PromptOptimizationReportSchema = z.strictObject({
  reportVersion: z.literal('prompt_optimization_report.v1'),
  projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
  optimizationId: z.string().regex(/^opt_proj_[A-Za-z0-9_-]+_[a-f0-9]{12}$/),
  runId: z.string().regex(/^run_[A-Za-z0-9_-]+$/).optional(),
  originalPrompt: z.string().min(1),
  optimizedPrompt: z.string().min(1),
  intentSummary: z.string().min(1),
  dslFitWarnings: z.array(z.string()),
  unsupportedRequests: z.array(z.string()),
  suggestedQuestions: z.array(z.string()),
  supportedDslVersion: z.literal(SUPPORTED_DSL_VERSION),
  capabilitiesUsed: z.array(z.string()),
  status: z.literal('prepared'),
  applied: z.literal(false),
  strategy: z.literal(PROMPT_COACH_STRATEGY)
});

export const PromptOptimizationArtifactRefSchema = z.strictObject({
  id: z.enum(['promptOptimizationReport', 'optimizedPrompt']),
  artifactRoot: z.literal('model-output'),
  path: z.string().min(1).refine(isSafeRelativeArtifactPath, 'artifact path must be relative and stay inside its artifact root'),
  format: z.enum(['json', 'txt'])
});

export type PromptOptimizationReport = z.infer<typeof PromptOptimizationReportSchema>;
export type PromptOptimizationArtifactRef = z.infer<typeof PromptOptimizationArtifactRefSchema>;

export type PromptOptimizationPrepareInput = {
  projectId: string;
  originalPrompt: string;
  supportedDslVersion?: 'v1';
  runId?: string;
};

export type PromptOptimizationPrepareResult = {
  report: PromptOptimizationReport;
  artifacts: PromptOptimizationArtifactRef[];
};

export class PromptCoachService {
  constructor(private readonly workspace: LocalWorkspaceService) {}

  /**
   * Prepares deterministic, auditable prompt coaching artifacts only.
   * It never calls a model provider, applies a prompt, or writes DSL artifacts.
   */
  async prepare(input: PromptOptimizationPrepareInput): Promise<PromptOptimizationPrepareResult> {
    const originalPrompt = normalizePrompt(input.originalPrompt);
    if (originalPrompt.length === 0) {
      throw new ProjectRequestError('originalPrompt is required.');
    }

    const supportedDslVersion = input.supportedDslVersion ?? SUPPORTED_DSL_VERSION;
    const optimizationId = buildOptimizationId(input.projectId, originalPrompt, supportedDslVersion, input.runId);
    const report = PromptOptimizationReportSchema.parse({
      reportVersion: 'prompt_optimization_report.v1',
      projectId: input.projectId,
      optimizationId,
      runId: input.runId,
      originalPrompt,
      optimizedPrompt: buildOptimizedPrompt(originalPrompt),
      intentSummary: buildIntentSummary(originalPrompt),
      dslFitWarnings: detectDslFitWarnings(originalPrompt),
      unsupportedRequests: detectUnsupportedRequests(originalPrompt),
      suggestedQuestions: [
        'What is the player objective in one sentence?',
        'Which 2D camera style should the game use?',
        'What obstacle, enemy, or collectible should appear first?'
      ],
      supportedDslVersion,
      capabilitiesUsed: ['deterministic-whitespace-normalization', 'dsl-friendly-brief-structure', 'unsupported-request-detection'],
      status: 'prepared',
      applied: false,
      strategy: PROMPT_COACH_STRATEGY
    });
    const artifacts = buildArtifactRefs(optimizationId).map((artifact) => PromptOptimizationArtifactRefSchema.parse(artifact));

    await writeArtifact(
      this.workspace.getProjectPromptOptimizationArtifactPath(input.projectId, optimizationId, 'prompt_optimization_report.json'),
      `${JSON.stringify(report, null, 2)}\n`
    );
    await writeArtifact(this.workspace.getProjectPromptOptimizationArtifactPath(input.projectId, optimizationId, 'optimized_prompt.txt'), `${report.optimizedPrompt}\n`);

    return { report, artifacts };
  }
}

function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, ' ');
}

function buildOptimizationId(projectId: string, originalPrompt: string, supportedDslVersion: 'v1', runId?: string): string {
  const stableHash = createHash('sha256')
    .update(`${projectId}\n${runId ?? 'project-level'}\n${originalPrompt}\n${supportedDslVersion}\n${PROMPT_COACH_STRATEGY}`)
    .digest('hex')
    .slice(0, 12);
  return `opt_${projectId}_${stableHash}`;
}

function buildOptimizedPrompt(originalPrompt: string): string {
  return [
    originalPrompt,
    '',
    'DSL-friendly constraints:',
    '- Describe a 2D game loop with player objective, camera style, controls, obstacles or enemies, collectibles, and win/lose condition.',
    '- Keep mechanics expressible by the supported game_dsl.v1 contract.',
    '- Prefer concrete entities and measurable objectives over implementation details.'
  ].join('\n');
}

function buildIntentSummary(originalPrompt: string): string {
  return `Prepare a DSL-friendly 2D game brief from: ${originalPrompt}`;
}

function detectDslFitWarnings(prompt: string): string[] {
  const normalized = prompt.toLowerCase();
  const warnings: string[] = [];
  if (/\b3d\b|三维|3维/.test(normalized)) {
    warnings.push('complex_3d_request_detected');
  }
  if (/multiplayer|多人|联机/.test(normalized)) {
    warnings.push('multiplayer_request_detected');
  }
  if (/leaderboard|排行榜|online/.test(normalized)) {
    warnings.push('online_leaderboard_request_detected');
  }
  if (/physics|物理/.test(normalized)) {
    warnings.push('advanced_physics_request_detected');
  }
  return warnings;
}

function detectUnsupportedRequests(prompt: string): string[] {
  const normalized = prompt.toLowerCase();
  const unsupported: string[] = [];
  if (/\b3d\b|三维|3维/.test(normalized)) {
    unsupported.push('complex_3d');
  }
  if (/multiplayer|多人|联机/.test(normalized)) {
    unsupported.push('multiplayer');
  }
  if (/leaderboard|排行榜|online/.test(normalized)) {
    unsupported.push('online_leaderboard');
  }
  if (/physics|物理/.test(normalized)) {
    unsupported.push('advanced_physics');
  }
  return unsupported;
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

function isSafeRelativeArtifactPath(path: string): boolean {
  return !path.startsWith('/') && !/^[A-Za-z]:\//.test(path) && !path.split('/').includes('..') && !path.includes('\\');
}
