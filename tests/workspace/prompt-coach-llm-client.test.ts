import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PromptCoachDeepSeekClient } from '../../apps/maker-api/src/projects/prompt-coach-llm-client.js';
import { LocalWorkspaceService } from '../../apps/maker-api/src/workspace/local-workspace.service.js';

describe('PromptCoachDeepSeekClient', () => {
  let root: string;
  let workspace: LocalWorkspaceService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ai-game-maker-prompt-coach-llm-'));
    workspace = new LocalWorkspaceService(root);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('calls the JSON model endpoint with Prompt Coach-only instructions and does not write raw provider output', async () => {
    const requests: Array<{ endpoint: string; init: RequestInit; body: Record<string, unknown> }> = [];
    const client = new PromptCoachDeepSeekClient(
      {
        apiKey: 'secret-test-key',
        baseUrl: 'https://example.test',
        defaultModel: 'deepseek-prompt-coach-test',
        defaultTimeoutMs: 1000
      },
      async (endpoint, init) => {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        requests.push({ endpoint: String(endpoint), init: init ?? {}, body });

        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    optimizedPrompt: 'Use a 2D cat shooter.',
                    intentSummary: 'cat shooter',
                    dslFitWarnings: [],
                    unsupportedRequests: [],
                    suggestedQuestions: ['What is the win condition?'],
                    capabilitiesUsed: ['llm-json-prompt-coaching']
                  })
                }
              }
            ]
          }),
          { status: 200 }
        );
      }
    );

    const result = await client.optimize({
      projectId: 'proj_20260615_prompt',
      runId: 'run_20260615_prompt_a',
      originalPrompt: 'cat shooter',
      supportedDslVersion: 'v1'
    });

    expect(result).toMatchObject({
      ok: true,
      json: {
        optimizedPrompt: 'Use a 2D cat shooter.',
        intentSummary: 'cat shooter'
      }
    });
    expect(requests).toHaveLength(1);
    expect(requests[0].endpoint).toBe('https://example.test/chat/completions');
    expect(requests[0].init.headers).toMatchObject({
      authorization: 'Bearer secret-test-key',
      'content-type': 'application/json'
    });
    expect(JSON.stringify(requests[0].body)).toContain('Do not output Phaser code');
    expect(JSON.stringify(requests[0].body)).toContain('mode');
    expect(JSON.stringify(requests[0].body)).not.toContain('secret-test-key');
    await expect(readFile(workspace.getModelOutputPath('proj_20260615_prompt', 'run_20260615_prompt_a', 'prompt-coach.raw.json'), 'utf8')).rejects.toThrow();
  });

  it('returns a clear unavailable failure when the api key is absent', async () => {
    const client = new PromptCoachDeepSeekClient({
      apiKey: '   ',
      baseUrl: 'https://example.test',
      defaultModel: 'deepseek-prompt-coach-test',
      defaultTimeoutMs: 1000
    });

    await expect(
      client.optimize({
        projectId: 'proj_20260615_prompt',
        originalPrompt: 'cat shooter',
        supportedDslVersion: 'v1'
      })
    ).resolves.toMatchObject({
      ok: false,
      code: 'MODEL_NOT_AVAILABLE',
      message: 'Prompt Coach LLM requires DEEPSEEK_API_KEY.'
    });
  });
});
