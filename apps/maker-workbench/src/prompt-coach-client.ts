import type { PreparePromptOptimizationResponse, PromptOptimizationArtifactRef, PromptOptimizationMode, PromptOptimizationReport } from './workbench-api.js';

export type PromptCoachFetch = (input: string | URL, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'statusText' | 'json'>>;

export type PromptCoachPrepareInput = {
  apiBase: string;
  projectId: string;
  runId?: string;
  originalPrompt: string;
  mode?: PromptOptimizationMode;
  fetcher?: PromptCoachFetch;
};

export type PromptCoachPrepareBody = {
  originalPrompt: string;
  runId?: string;
  mode: PromptOptimizationMode;
};

export function buildPromptCoachPrepareRequest(input: { originalPrompt: string; runId?: string; mode?: PromptOptimizationMode }): PromptCoachPrepareBody {
  const originalPrompt = input.originalPrompt.trim();
  if (originalPrompt.length === 0) {
    throw new Error('Prompt is required.');
  }

  return {
    originalPrompt,
    ...(input.runId?.trim() ? { runId: input.runId.trim() } : {}),
    mode: input.mode ?? 'mock'
  };
}

export async function preparePromptOptimization(input: PromptCoachPrepareInput): Promise<PreparePromptOptimizationResponse> {
  if (input.projectId.trim().length === 0) {
    throw new Error('Project ID is required.');
  }

  const body = buildPromptCoachPrepareRequest(input);
  const fetcher = input.fetcher ?? fetch;
  const response = await fetcher(`${input.apiBase}/api/projects/${input.projectId.trim()}/prompt-optimizations/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(await extractPromptCoachErrorMessage(response));
  }

  const value = (await response.json()) as PreparePromptOptimizationResponse;
  if (promptCoachReportContainsBlockedText(value.report)) {
    throw new Error('Prompt Coach response contains blocked sensitive text.');
  }

  return {
    ...value,
    artifacts: value.artifacts.filter((artifact) => artifact.artifactRoot === 'model-output' && isSafeRelativeArtifactPath(artifact.path))
  };
}

export async function extractPromptCoachErrorMessage(response: Pick<Response, 'status' | 'statusText' | 'json'>): Promise<string> {
  try {
    const body = (await response.json()) as unknown;
    const message = findErrorMessage(body);
    if (message !== undefined) {
      return sanitizePromptCoachErrorMessage(message);
    }
  } catch {
    // Fall back to HTTP status below; raw response bodies are intentionally not surfaced in Workbench.
  }

  return `${response.status} ${response.statusText}`.trim();
}

export function getSafePromptCoachArtifactRefs(artifacts: PromptOptimizationArtifactRef[]): Array<Pick<PromptOptimizationArtifactRef, 'id' | 'path' | 'format'>> {
  return artifacts
    .filter((artifact) => artifact.artifactRoot === 'model-output' && isKnownPromptCoachArtifactRef(artifact) && isSafeRelativeArtifactPath(artifact.path))
    .map((artifact) => ({ id: artifact.id, path: artifact.path, format: artifact.format }));
}

export function getPromptCoachCandidate(report: PromptOptimizationReport): string {
  return report.optimizedPrompt;
}

export function buildPromptCoachResultView(input: { report: PromptOptimizationReport; artifacts: PromptOptimizationArtifactRef[] }) {
  return {
    candidate: input.report.optimizedPrompt,
    originalPrompt: input.report.originalPrompt,
    intentSummary: input.report.intentSummary,
    dslFitWarnings: input.report.dslFitWarnings,
    unsupportedRequests: input.report.unsupportedRequests,
    suggestedQuestions: input.report.suggestedQuestions,
    supportedDslVersion: input.report.supportedDslVersion,
    mode: input.report.mode,
    strategy: input.report.strategy,
    artifacts: getSafePromptCoachArtifactRefs(input.artifacts)
  };
}

export function sanitizePromptCoachErrorMessage(message: string): string {
  if (containsBlockedWorkbenchText(message)) {
    return 'Prompt Coach LLM mode is unavailable.';
  }

  return message;
}

export function resolvePromptCoachDraftAfterCurrentPromptChange(input: { draft: string; nextCurrentPrompt: string; dirty: boolean }): { draft: string; dirty: boolean } {
  if (input.dirty) {
    return { draft: input.draft, dirty: true };
  }

  return { draft: input.nextCurrentPrompt, dirty: false };
}

export function promptCoachReportContainsBlockedText(report: PromptOptimizationReport): boolean {
  return [
    report.originalPrompt,
    report.optimizedPrompt,
    report.intentSummary,
    ...report.dslFitWarnings,
    ...report.unsupportedRequests,
    ...report.suggestedQuestions,
    ...report.capabilitiesUsed
  ].some(containsBlockedWorkbenchText);
}

function findErrorMessage(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.message === 'string' && record.message.trim().length > 0) {
    return record.message.trim();
  }

  return findErrorMessage(record.error);
}

function isSafeRelativeArtifactPath(path: string): boolean {
  return path.length > 0 && !path.startsWith('/') && !/^[A-Za-z]:\//.test(path) && !path.includes('\\') && !path.split('/').includes('..');
}

function isKnownPromptCoachArtifactRef(artifact: PromptOptimizationArtifactRef): boolean {
  return (
    (artifact.id === 'promptOptimizationReport' && artifact.format === 'json') ||
    (artifact.id === 'optimizedPrompt' && artifact.format === 'txt')
  );
}

function containsBlockedWorkbenchText(value: string): boolean {
  return /authorization|api key|secret|DEEPSEEK_API_KEY|raw provider|\/Users\/|[A-Za-z]:\\/i.test(value);
}
