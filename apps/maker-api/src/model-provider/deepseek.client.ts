import { Logger } from '@nestjs/common';

import { JsonFileStore } from '../projects/json-file-store.js';
import { LocalWorkspaceService } from '../workspace/local-workspace.service.js';
import { readDeepSeekConfig } from './model-provider.config.js';
import type { DeepSeekClientConfig, GenerateJsonFailure, GenerateJsonResult, JsonChatParams } from './model-provider.types.js';

type FetchLike = typeof fetch;
type ModelRequestLogger = Pick<Logger, 'log' | 'warn' | 'error'>;

type ChatCompletionRequest = {
  model: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  thinking: { type: 'disabled' };
  response_format: { type: 'json_object' };
  temperature: number;
  max_tokens: number;
};

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
    private readonly fetchImpl: FetchLike = fetch,
    private readonly logger: ModelRequestLogger = new Logger(DeepSeekClient.name)
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
    const timeoutMs = params.timeoutMs ?? this.config.defaultTimeoutMs;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const endpoint = `${this.config.baseUrl}/chat/completions`;
    const startedAt = Date.now();

    try {
      const body = this.buildChatCompletionRequest(params);
      const summary = this.buildRequestLogSummary(params, endpoint, body, timeoutMs);

      this.logger.log(JSON.stringify({ event: 'model.request.started', ...summary }));

      const response = await this.fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const completedSummary = { ...summary, status: response.status, durationMs: Date.now() - startedAt };

      if (response.ok) {
        this.logger.log(JSON.stringify({ event: 'model.request.completed', ...completedSummary }));
      } else {
        this.logger.warn(JSON.stringify({ event: 'model.request.failed', ...completedSummary }));
      }

      return {
        status: response.status,
        ok: response.ok,
        bodyText: await response.text()
      };
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'model.request.failed',
          endpoint,
          projectId: params.projectId,
          runId: params.runId,
          outputName: params.outputName,
          model: params.model ?? this.config.defaultModel,
          timeoutMs,
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : 'Model provider request failed.'
        })
      );

      if (this.isAbortError(error)) {
        return this.failure('MODEL_TIMEOUT', 'Model provider request timed out.');
      }

      return this.failure('MODEL_PROVIDER_FAILED', error instanceof Error ? error.message : 'Model provider request failed.');
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildChatCompletionRequest(params: JsonChatParams): ChatCompletionRequest {
    return {
      model: params.model ?? this.config.defaultModel,
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: JSON.stringify(params.user) }
      ],
      thinking: { type: 'disabled' },
      response_format: { type: 'json_object' },
      temperature: params.temperature ?? 0.2,
      max_tokens: params.maxTokens ?? 2000
    };
  }

  /**
   * Logs the model call chain and final provider parameters without recording prompts, API keys,
   * or provider response bodies.
   */
  private buildRequestLogSummary(
    params: JsonChatParams,
    endpoint: string,
    body: ChatCompletionRequest,
    timeoutMs: number
  ): Record<string, string | number> {
    return {
      provider: 'deepseek',
      endpoint,
      projectId: params.projectId,
      runId: params.runId,
      outputName: params.outputName,
      model: body.model,
      temperature: body.temperature,
      maxTokens: body.max_tokens,
      timeoutMs,
      systemPromptLength: params.system.length,
      userPromptLength: body.messages.find((message) => message.role === 'user')?.content.length ?? 0,
      callPath:
        params.callPath ?? 'ProjectsController.generateProject>GenerationPipelineService.generateRawDsl>GameDslProviderService>DeepSeekClient.generateJson'
    };
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
