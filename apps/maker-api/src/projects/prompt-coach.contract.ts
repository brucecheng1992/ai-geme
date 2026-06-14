import { z } from 'zod';

export const SUPPORTED_PROMPT_COACH_DSL_VERSION = 'v1';
export const MOCK_PROMPT_COACH_STRATEGY = 'mock-v1';
export const LLM_PROMPT_COACH_STRATEGY = 'llm-v1';
export const DEFAULT_PROMPT_OPTIMIZATION_MODE = 'mock';

export const PromptOptimizationModeSchema = z.enum(['mock', 'llm']);
export const PromptOptimizationStrategySchema = z.enum([MOCK_PROMPT_COACH_STRATEGY, LLM_PROMPT_COACH_STRATEGY]);

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
  supportedDslVersion: z.literal(SUPPORTED_PROMPT_COACH_DSL_VERSION),
  capabilitiesUsed: z.array(z.string()),
  status: z.literal('prepared'),
  applied: z.literal(false),
  strategy: PromptOptimizationStrategySchema,
  mode: PromptOptimizationModeSchema,
  modelProfile: z.string().min(1).max(80).optional()
}).superRefine((value, context) => {
  if ((value.mode === 'mock') !== (value.strategy === MOCK_PROMPT_COACH_STRATEGY)) {
    context.addIssue({ code: 'custom', path: ['strategy'], message: 'Prompt optimization mode and strategy must match.' });
  }
  if (value.mode === 'mock' && value.modelProfile !== undefined) {
    context.addIssue({ code: 'custom', path: ['modelProfile'], message: 'Mock prompt optimization reports must not include modelProfile.' });
  }
});

export const PromptOptimizationArtifactRefSchema = z.strictObject({
  id: z.enum(['promptOptimizationReport', 'optimizedPrompt']),
  artifactRoot: z.literal('model-output'),
  path: z.string().min(1).refine(isSafeRelativeArtifactPath, 'artifact path must be relative and stay inside its artifact root'),
  format: z.enum(['json', 'txt'])
});

export type PromptOptimizationMode = z.infer<typeof PromptOptimizationModeSchema>;
export type PromptOptimizationReport = z.infer<typeof PromptOptimizationReportSchema>;
export type PromptOptimizationArtifactRef = z.infer<typeof PromptOptimizationArtifactRefSchema>;

export type PromptCoachLlmSuccess = {
  ok: true;
  json: unknown;
};

export type PromptCoachLlmFailure = {
  ok: false;
  code: string;
  message: string;
};

export type PromptCoachLlmResult = PromptCoachLlmSuccess | PromptCoachLlmFailure;

export type PromptCoachLlmClient = {
  optimize(input: { projectId: string; runId?: string; originalPrompt: string; supportedDslVersion: 'v1' }): Promise<PromptCoachLlmResult>;
};

function isSafeRelativeArtifactPath(path: string): boolean {
  return !path.startsWith('/') && !/^[A-Za-z]:\//.test(path) && !path.split('/').includes('..') && !path.includes('\\');
}
