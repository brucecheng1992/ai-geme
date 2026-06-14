import type { DeepSeekClientConfig } from '../model-provider/model-provider.types.js';
import type { PromptCoachLlmClient, PromptCoachLlmResult } from './prompt-coach.contract.js';

type FetchLike = typeof fetch;

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

export class PromptCoachDeepSeekClient implements PromptCoachLlmClient {
  constructor(
    private readonly config: DeepSeekClientConfig,
    private readonly fetchImpl: FetchLike = fetch
  ) {}

  async optimize(input: { projectId: string; runId?: string; originalPrompt: string; supportedDslVersion: 'v1' }): Promise<PromptCoachLlmResult> {
    const apiKey = this.config.apiKey?.trim();

    if (apiKey === undefined || apiKey.length === 0 || apiKey === 'your_deepseek_api_key') {
      return { ok: false, code: 'MODEL_NOT_AVAILABLE', message: 'Prompt Coach LLM requires DEEPSEEK_API_KEY.' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.defaultTimeoutMs);

    try {
      const response = await this.fetchImpl(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.defaultModel,
          messages: [
            { role: 'system', content: buildPromptCoachSystemPrompt() },
            { role: 'user', content: JSON.stringify(buildPromptCoachUserPayload(input)) }
          ],
          thinking: { type: 'disabled' },
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 1200
        }),
        signal: controller.signal
      });
      const bodyText = await response.text();

      if (!response.ok) {
        return { ok: false, code: response.status === 429 ? 'MODEL_RATE_LIMITED' : 'MODEL_PROVIDER_FAILED', message: readProviderErrorMessage(bodyText, response.status) };
      }

      let providerBody: ChatCompletionResponse;
      try {
        providerBody = JSON.parse(bodyText) as ChatCompletionResponse;
      } catch {
        return { ok: false, code: 'MODEL_PROVIDER_FAILED', message: 'Prompt Coach LLM provider returned non-JSON response.' };
      }

      const content = providerBody.choices?.[0]?.message?.content?.trim() ?? '';
      if (content.length === 0) {
        return { ok: false, code: 'MODEL_EMPTY_CONTENT', message: 'Prompt Coach LLM returned empty content.' };
      }

      try {
        return { ok: true, json: JSON.parse(content) as unknown };
      } catch {
        return { ok: false, code: 'MODEL_JSON_PARSE_FAILED', message: 'Prompt Coach LLM returned invalid JSON content.' };
      }
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError') {
        return { ok: false, code: 'MODEL_TIMEOUT', message: 'Prompt Coach LLM request timed out.' };
      }
      return { ok: false, code: 'MODEL_PROVIDER_FAILED', message: error instanceof Error ? error.message : 'Prompt Coach LLM request failed.' };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function buildPromptCoachSystemPrompt(): string {
  return [
    'You are Prompt Coach for a 2D game DSL generator.',
    'Return strict JSON only. Do not wrap JSON in markdown or code fences.',
    'Only improve the player prompt for DSL-friendly intent expression.',
    'Do not output Phaser code, JavaScript, TypeScript, game_dsl.json, asset manifest, runtime patch, provider call, file system path, secrets, environment variables, API keys, headers, or raw provider data.',
    'Return exactly: optimizedPrompt, intentSummary, dslFitWarnings, unsupportedRequests, suggestedQuestions, capabilitiesUsed.'
  ].join('\n');
}

function buildPromptCoachUserPayload(input: { projectId: string; runId?: string; originalPrompt: string; supportedDslVersion: 'v1' }) {
  return {
    task: 'prompt_coach_prepare',
    mode: 'llm',
    supportedDslVersion: input.supportedDslVersion,
    originalPrompt: input.originalPrompt,
    constraints: {
      keepOriginalPromptUnmodified: true,
      prepareOnly: true,
      noDslGeneration: true,
      noCodeGeneration: true
    }
  };
}

function readProviderErrorMessage(bodyText: string, status: number): string {
  try {
    const body = JSON.parse(bodyText) as ChatCompletionResponse;
    return body.error?.message ?? `Prompt Coach LLM provider failed with HTTP ${status}`;
  } catch {
    return `Prompt Coach LLM provider failed with HTTP ${status}`;
  }
}
