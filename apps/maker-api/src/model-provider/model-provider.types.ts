export type JsonChatParams = {
  model?: string;
  system: string;
  user: unknown;
  callPath?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  projectId: string;
  runId: string;
  outputName: string;
};

export type ModelProviderErrorCode =
  | 'MODEL_PROVIDER_FAILED'
  | 'MODEL_TIMEOUT'
  | 'MODEL_EMPTY_CONTENT'
  | 'MODEL_JSON_PARSE_FAILED'
  | 'MODEL_RATE_LIMITED'
  | 'MODEL_NOT_AVAILABLE';

export type GenerateJsonSuccess = {
  ok: true;
  json: unknown;
  rawText: string;
  rawOutputPath: string;
};

export type GenerateJsonFailure = {
  ok: false;
  code: ModelProviderErrorCode;
  message: string;
  rawText?: string;
  rawOutputPath?: string;
};

export type GenerateJsonResult = GenerateJsonSuccess | GenerateJsonFailure;

export type DeepSeekClientConfig = {
  apiKey?: string;
  baseUrl: string;
  defaultModel: string;
  defaultTimeoutMs: number;
};
