import { describe, expect, it } from 'vitest';

import {
  buildPromptCoachResultView,
  buildGenerateProjectRequest,
  createPromptCoachProvenanceSelection,
  buildPromptCoachPrepareRequest,
  extractPromptCoachErrorMessage,
  getPromptCoachCandidate,
  getSafePromptCoachArtifactRefs,
  resolvePromptCoachDraftAfterCurrentPromptChange,
  sanitizePromptCoachErrorMessage,
  preparePromptOptimization,
  promptCoachReportContainsBlockedText,
  type PromptCoachFetch
} from '../../apps/maker-workbench/src/prompt-coach-client.js';
import type { PromptOptimizationReport } from '../../apps/maker-workbench/src/workbench-api.js';

describe('Workbench Prompt Coach client helpers', () => {
  it('builds a prepare request with mock mode by default and optional run context', () => {
    expect(buildPromptCoachPrepareRequest({ originalPrompt: '  cat shooter  ', runId: 'run_20260615_prompt' })).toEqual({
      originalPrompt: 'cat shooter',
      runId: 'run_20260615_prompt',
      mode: 'mock'
    });
  });

  it('rejects empty prompt before sending a request', async () => {
    const calls: unknown[] = [];
    await expect(
      preparePromptOptimization({
        apiBase: 'http://localhost:3000',
        projectId: 'proj_20260615_prompt',
        originalPrompt: '   ',
        fetcher: async (...args) => {
          calls.push(args);
          return jsonResponse(200, {});
        }
      })
    ).rejects.toThrow('Prompt is required.');
    expect(calls).toEqual([]);
  });

  it('posts only to the prepare endpoint and never submits generation or live edit requests', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const response = makeResponse();
    await preparePromptOptimization({
      apiBase: 'http://localhost:3000',
      projectId: 'proj_20260615_prompt',
      runId: 'run_20260615_prompt',
      originalPrompt: 'cat shooter',
      mode: 'llm',
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init });
        return jsonResponse(200, response);
      }
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('http://localhost:3000/api/projects/proj_20260615_prompt/prompt-optimizations/prepare');
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      originalPrompt: 'cat shooter',
      runId: 'run_20260615_prompt',
      mode: 'llm'
    });
    expect(calls[0]?.url).not.toContain('/generate');
    expect(calls[0]?.url).not.toContain('/live-edits/');
  });

  it('surfaces backend llm unavailable errors without falling back to mock', async () => {
    await expect(
      preparePromptOptimization({
        apiBase: 'http://localhost:3000',
        projectId: 'proj_20260615_prompt',
        originalPrompt: 'cat shooter',
        mode: 'llm',
        fetcher: async () => jsonResponse(500, { message: 'Prompt Coach LLM mode is not configured.' })
      })
    ).rejects.toThrow('Prompt Coach LLM mode is not configured.');
  });

  it('sanitizes env and provider details from backend error messages', async () => {
    await expect(extractPromptCoachErrorMessage(jsonResponse(500, { message: 'Prompt Coach LLM requires DEEPSEEK_API_KEY.' }))).resolves.toBe(
      'Prompt Coach LLM mode is unavailable.'
    );
    expect(sanitizePromptCoachErrorMessage('provider returned raw provider response with authorization header')).toBe('Prompt Coach LLM mode is unavailable.');
    expect(sanitizePromptCoachErrorMessage('OPENAI_API_KEY leaked through process.env.OPENAI_API_KEY with Bearer abc.def token at /tmp/provider.json')).toBe(
      'Prompt Coach LLM mode is unavailable.'
    );
  });

  it('shows only safe relative artifact refs', () => {
    expect(
      getSafePromptCoachArtifactRefs([
        { id: 'promptOptimizationReport', artifactRoot: 'model-output', path: 'prompt-optimizations/opt_proj_abc/prompt_optimization_report.json', format: 'json' },
        { id: 'promptOptimizationReport', artifactRoot: 'model-output', path: '', format: 'json' },
        { id: 'unknown' as 'promptOptimizationReport', artifactRoot: 'model-output', path: 'prompt-optimizations/opt_proj_abc/unknown.json', format: 'json' },
        { id: 'optimizedPrompt', artifactRoot: 'model-output', path: 'prompt-optimizations/opt_proj_abc/optimized_prompt.html', format: 'html' as 'txt' },
        { id: 'optimizedPrompt', artifactRoot: 'model-output', path: '/Users/dahufa/private/optimized_prompt.txt', format: 'txt' },
        { id: 'optimizedPrompt', artifactRoot: 'model-output', path: '../optimized_prompt.txt', format: 'txt' },
        { id: 'optimizedPrompt', artifactRoot: 'model-output', path: 'https://example.test/optimized_prompt.txt', format: 'txt' },
        { id: 'optimizedPrompt', artifactRoot: 'model-output', path: '/tmp/optimized_prompt.txt', format: 'txt' },
        { id: 'optimizedPrompt', artifactRoot: 'model-output', path: 'prompt-optimizations\\opt\\optimized_prompt.txt', format: 'txt' }
      ])
    ).toEqual([{ id: 'promptOptimizationReport', path: 'prompt-optimizations/opt_proj_abc/prompt_optimization_report.json', format: 'json' }]);
  });

  it('keeps candidate adoption client-side and returns only the optimized prompt', () => {
    expect(getPromptCoachCandidate(makeReport({ optimizedPrompt: 'Use a 2D cat shooter.' }))).toBe('Use a 2D cat shooter.');
  });

  it('carries Prompt Coach provenance into generation only while the idea still matches the selected candidate', () => {
    const report = makeReport({ optimizedPrompt: 'Use a 2D cat shooter.' });
    const selection = createPromptCoachProvenanceSelection({ report });

    expect(selection).toEqual({
      promptOptimizationProjectId: 'proj_20260615_prompt',
      promptOptimizationId: 'opt_proj_20260615_prompt_abcdef123456',
      candidatePrompt: 'Use a 2D cat shooter.'
    });
    expect(buildGenerateProjectRequest({ idea: 'Use a 2D cat shooter.', language: 'en', promptOptimizationSelection: selection })).toEqual({
      idea: 'Use a 2D cat shooter.',
      language: 'en',
      promptOptimizationProjectId: 'proj_20260615_prompt',
      promptOptimizationId: 'opt_proj_20260615_prompt_abcdef123456'
    });
    expect(buildGenerateProjectRequest({ idea: 'Use a 2D cat shooter. edited', language: 'en', promptOptimizationSelection: selection })).toEqual({
      idea: 'Use a 2D cat shooter. edited',
      language: 'en'
    });
    expect(buildGenerateProjectRequest({ idea: '  manual prompt  ', language: ' zh ', promptOptimizationSelection: null })).toEqual({
      idea: 'manual prompt',
      language: 'zh'
    });
  });

  it('syncs the draft from the current game brief only while the panel is clean', () => {
    expect(resolvePromptCoachDraftAfterCurrentPromptChange({ draft: 'old brief', nextCurrentPrompt: 'new brief', dirty: false })).toEqual({
      draft: 'new brief',
      dirty: false
    });
    expect(resolvePromptCoachDraftAfterCurrentPromptChange({ draft: 'custom coach draft', nextCurrentPrompt: 'new brief', dirty: true })).toEqual({
      draft: 'custom coach draft',
      dirty: true
    });
  });

  it('detects blocked secrets, env names, and raw provider response labels in visible report fields', () => {
    expect(
      promptCoachReportContainsBlockedText(
        makeReport({
          optimizedPrompt: 'Use a 2D cat shooter.',
          suggestedQuestions: ['authorization: Bearer secret-test-key']
        })
      )
    ).toBe(true);
    expect(
      promptCoachReportContainsBlockedText(
        makeReport({
          optimizedPrompt: 'Use a 2D cat shooter.',
          dslFitWarnings: ['OPENAI_API_KEY leaked through process.env.OPENAI_API_KEY with Bearer abc.def token at /home/provider.json']
        })
      )
    ).toBe(true);
    expect(
      promptCoachReportContainsBlockedText(
        makeReport({
          optimizedPrompt: 'Collect tokens in a 2D arena.'
        })
      )
    ).toBe(false);
    expect(promptCoachReportContainsBlockedText(makeReport({ optimizedPrompt: 'Use a 2D cat shooter.' }))).toBe(false);
  });

  it('extracts nested API error messages without exposing raw objects', async () => {
    await expect(extractPromptCoachErrorMessage(jsonResponse(400, { error: { message: 'originalPrompt is required.' } }))).resolves.toBe('originalPrompt is required.');
  });

  it('builds a result view model with candidate fields and safe artifact refs without provider details', () => {
    const view = buildPromptCoachResultView({
      artifacts: [
        { id: 'promptOptimizationReport', artifactRoot: 'model-output', path: 'prompt-optimizations/opt_proj_abc/prompt_optimization_report.json', format: 'json' },
        { id: 'optimizedPrompt', artifactRoot: 'model-output', path: '/Users/dahufa/private/optimized_prompt.txt', format: 'txt' }
      ],
      report: makeReport({
        optimizedPrompt: 'Use a 2D cat shooter.',
        dslFitWarnings: ['Avoid 3D-only requests.'],
        unsupportedRequests: ['Online leaderboard is not supported.'],
        suggestedQuestions: ['What is the win condition?'],
        modelProfile: 'deepseek-chat'
      })
    });

    expect(view.candidate).toBe('Use a 2D cat shooter.');
    expect(view.dslFitWarnings).toEqual(['Avoid 3D-only requests.']);
    expect(view.unsupportedRequests).toEqual(['Online leaderboard is not supported.']);
    expect(view.suggestedQuestions).toEqual(['What is the win condition?']);
    expect(view.artifacts).toEqual([{ id: 'promptOptimizationReport', path: 'prompt-optimizations/opt_proj_abc/prompt_optimization_report.json', format: 'json' }]);
    expect(JSON.stringify(view)).not.toContain('/Users/');
    expect(JSON.stringify(view)).not.toContain('deepseek-chat');
  });
});

function makeResponse() {
  const report = makeReport({ optimizedPrompt: 'Use a 2D cat shooter.' });
  return {
    ok: true,
    report,
    artifacts: [
      { id: 'promptOptimizationReport', artifactRoot: 'model-output', path: 'prompt-optimizations/opt_proj_abc/prompt_optimization_report.json', format: 'json' },
      { id: 'optimizedPrompt', artifactRoot: 'model-output', path: 'prompt-optimizations/opt_proj_abc/optimized_prompt.txt', format: 'txt' }
    ]
  };
}

function makeReport(overrides: Partial<PromptOptimizationReport> = {}): PromptOptimizationReport {
  return {
    reportVersion: 'prompt_optimization_report.v1',
    projectId: 'proj_20260615_prompt',
    optimizationId: 'opt_proj_20260615_prompt_abcdef123456',
    runId: 'run_20260615_prompt',
    originalPrompt: 'cat shooter',
    optimizedPrompt: 'Use a 2D cat shooter.',
    intentSummary: 'Prepare a DSL-friendly 2D game brief.',
    dslFitWarnings: ['Avoid 3D-only requests.'],
    unsupportedRequests: ['Online leaderboard is not supported.'],
    suggestedQuestions: ['What is the win condition?'],
    supportedDslVersion: 'v1',
    capabilitiesUsed: ['prompt-coach'],
    status: 'prepared',
    applied: false,
    strategy: 'mock-v1',
    mode: 'mock',
    ...overrides
  };
}

function jsonResponse(status: number, body: unknown): Awaited<ReturnType<PromptCoachFetch>> {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    json: async () => body
  } as Awaited<ReturnType<PromptCoachFetch>>;
}
