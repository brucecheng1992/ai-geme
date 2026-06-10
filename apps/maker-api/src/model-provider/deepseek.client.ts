import { JsonFileStore } from '../projects/json-file-store.js';
import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import { readDeepSeekConfig } from './model-provider.config.js';
import type { DeepSeekClientConfig, GenerateJsonFailure, GenerateJsonResult, JsonChatParams } from './model-provider.types.js';

type FetchLike = typeof fetch;

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
    code?: string;
  };
};

type ProviderHttpResponse = {
  status: number;
  ok: boolean;
  bodyText: string;
};

export class DeepSeekClient {
  private readonly files: JsonFileStore;

  constructor(
    private readonly workspace = new LocalWorkspaceService(),
    private readonly config: DeepSeekClientConfig = readDeepSeekConfig(),
    private readonly fetchImpl: FetchLike = fetch
  ) {
    this.files = new JsonFileStore(workspace);
  }

  async generateJson(params: JsonChatParams): Promise<GenerateJsonResult> {
    const apiKey = this.config.apiKey?.trim();

    if (apiKey === undefined || apiKey.length === 0 || apiKey === 'your_deepseek_api_key') {
      return this.failure('MODEL_NOT_AVAILABLE', 'Please check DEEPSEEK_API_KEY in .env');
    }

    const firstAttempt = await this.requestAndParse(params, apiKey);

    if (firstAttempt.ok || firstAttempt.code !== 'MODEL_EMPTY_CONTENT') {
      return firstAttempt;
    }

    return await this.requestAndParse(params, apiKey);
  }

  private async requestAndParse(params: JsonChatParams, apiKey: string): Promise<GenerateJsonResult> {
    const rawOutputPath = this.workspace.getModelOutputPath(params.projectId, params.runId, params.outputName);
    const response = await this.requestModel(params, apiKey);

    if (!('status' in response)) {
      return response;
    }

    if (!response.ok) {
      if (response.status === 429) {
        return this.failure('MODEL_RATE_LIMITED', 'Model provider rate limited the request.');
      }

      return this.failure('MODEL_PROVIDER_FAILED', this.readProviderErrorMessage(response));
    }

    await this.files.writeJson(rawOutputPath, {
      status: response.status,
      body: response.bodyText
    });

    let raw: ChatCompletionResponse;

    try {
      raw = JSON.parse(response.bodyText) as ChatCompletionResponse;
    } catch {
      return this.failure('MODEL_PROVIDER_FAILED', 'Model provider returned a non-JSON response.', response.bodyText, rawOutputPath);
    }

    const rawText = (raw.choices?.[0]?.message?.content ?? '').trim();

    if (rawText.length === 0) {
      return this.failure('MODEL_EMPTY_CONTENT', 'Model returned empty content.', rawText, rawOutputPath);
    }

    try {
      return {
        ok: true,
        json: JSON.parse(rawText) as unknown,
        rawText,
        rawOutputPath
      };
    } catch {
      return this.failure('MODEL_JSON_PARSE_FAILED', 'Model returned invalid JSON content.', rawText, rawOutputPath);
    }
  }

  private async requestModel(params: JsonChatParams, apiKey: string): Promise<ProviderHttpResponse | GenerateJsonFailure> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? this.config.defaultTimeoutMs);

    try {
      const response = await this.fetchImpl(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: params.model ?? this.config.defaultModel,
          messages: [
            { role: 'system', content: params.system },
            { role: 'user', content: JSON.stringify(params.user) }
          ],
          thinking: { type: 'disabled' },
          response_format: { type: 'json_object' },
          temperature: params.temperature ?? 0.2,
          max_tokens: params.maxTokens ?? 2000
        }),
        signal: controller.signal
      });

      return {
        status: response.status,
        ok: response.ok,
        bodyText: await response.text()
      };
    } catch (error) {
      if (this.isAbortError(error)) {
        return this.failure('MODEL_TIMEOUT', 'Model provider request timed out.');
      }

      return this.failure('MODEL_PROVIDER_FAILED', error instanceof Error ? error.message : 'Model provider request failed.');
    } finally {
      clearTimeout(timeout);
    }
  }

  private isAbortError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
  }

  private readProviderErrorMessage(response: ProviderHttpResponse): string {
    try {
      const raw = JSON.parse(response.bodyText) as ChatCompletionResponse;
      return raw.error?.message ?? `Model provider failed with HTTP ${response.status}`;
    } catch {
      return `Model provider failed with HTTP ${response.status}`;
    }
  }

  private failure(
    code: GenerateJsonFailure['code'],
    message: string,
    rawText?: string,
    rawOutputPath?: string
  ): GenerateJsonFailure {
    return {
      ok: false,
      code,
      message,
      rawText,
      rawOutputPath
    };
  }
}
