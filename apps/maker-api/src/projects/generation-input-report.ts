import { z } from 'zod';

import type { PromptOptimizationReport } from './prompt-coach.contract.js';

const SAFE_RELATIVE_PATH = z.string().min(1).refine(isSafeRelativeArtifactPath, 'artifact path must be relative and stay inside its artifact root');

export const GenerationInputReportSchema = z.strictObject({
  reportVersion: z.literal('generation_input_report.v1'),
  projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
  runId: z.string().regex(/^run_[A-Za-z0-9_-]+$/),
  source: z.enum(['manual', 'prompt-coach-candidate']),
  effectivePrompt: z.string().min(1),
  promptOptimizationRef: z
    .strictObject({
      projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
      optimizationId: z.string().regex(/^opt_proj_[A-Za-z0-9_-]+_[a-f0-9]{12}$/),
      reportPath: SAFE_RELATIVE_PATH,
      optimizedPromptPath: SAFE_RELATIVE_PATH,
      mode: z.enum(['mock', 'llm']),
      strategy: z.enum(['mock-v1', 'llm-v1']),
      reportVersion: z.literal('prompt_optimization_report.v1')
    })
    .nullable(),
  candidatePromptMatchesEffectivePrompt: z.boolean(),
  checkedPaths: z.array(z.string()).readonly(),
  status: z.literal('accepted'),
  warnings: z.array(z.string()).readonly(),
  errors: z.array(z.string()).readonly()
});

export type GenerationInputReport = z.infer<typeof GenerationInputReportSchema>;

export function buildGenerationInputReport(input: {
  projectId: string;
  runId: string;
  effectivePrompt: string;
  promptOptimizationRef?: GenerationInputReport['promptOptimizationRef'];
  candidatePromptMatchesEffectivePrompt?: boolean;
}): GenerationInputReport {
  const hasPromptOptimizationRef = input.promptOptimizationRef !== undefined && input.promptOptimizationRef !== null;

  return GenerationInputReportSchema.parse({
    reportVersion: 'generation_input_report.v1',
    projectId: input.projectId,
    runId: input.runId,
    source: hasPromptOptimizationRef ? 'prompt-coach-candidate' : 'manual',
    effectivePrompt: input.effectivePrompt,
    promptOptimizationRef: input.promptOptimizationRef ?? null,
    candidatePromptMatchesEffectivePrompt: input.candidatePromptMatchesEffectivePrompt ?? false,
    checkedPaths: hasPromptOptimizationRef
      ? [
          'effectivePrompt',
          'promptOptimizationRef.optimizationId',
          'promptOptimizationRef.optimizedPrompt',
          'promptOptimizationRef.projectId',
          'source'
        ]
      : ['effectivePrompt', 'source'],
    status: 'accepted',
    warnings: [],
    errors: []
  });
}

export function resolvePromptOptimizationGenerationInput(input: {
  projectId: string;
  runId: string;
  promptOptimizationProjectId: string;
  optimizationId: string;
  effectivePrompt: string;
  report: PromptOptimizationReport;
}): GenerationInputReport {
  if (input.report.projectId !== input.promptOptimizationProjectId) {
    throw new Error('prompt optimization projectId does not match source project.');
  }
  if (input.report.optimizationId !== input.optimizationId) {
    throw new Error('prompt optimization id does not match request.');
  }
  if (input.report.optimizedPrompt !== input.effectivePrompt) {
    throw new Error('effectivePrompt must match prompt optimization optimizedPrompt.');
  }

  return buildGenerationInputReport({
    projectId: input.projectId,
    runId: input.runId,
    effectivePrompt: input.effectivePrompt,
    promptOptimizationRef: {
      projectId: input.report.projectId,
      optimizationId: input.report.optimizationId,
      reportPath: `prompt-optimizations/${input.report.optimizationId}/prompt_optimization_report.json`,
      optimizedPromptPath: `prompt-optimizations/${input.report.optimizationId}/optimized_prompt.txt`,
      mode: input.report.mode,
      strategy: input.report.strategy,
      reportVersion: input.report.reportVersion
    },
    candidatePromptMatchesEffectivePrompt: true
  });
}

function isSafeRelativeArtifactPath(path: string): boolean {
  return !path.startsWith('/') && !/^[A-Za-z]:\//.test(path) && !path.split('/').includes('..') && !path.includes('\\');
}
