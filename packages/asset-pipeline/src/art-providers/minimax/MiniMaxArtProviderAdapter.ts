import {
  ArtProviderAdapterError,
  type ArtCapability,
  type ArtProviderAdapter,
  type ArtProviderManifest,
  type AspectRatio,
  type GeneratedImage,
  type GeneratedImageResult,
  type GenerateImageInput,
  type ImageResponseFormat,
  type ImageToImageInput,
  type NormalizedProviderError
} from '../types.js';
import {
  createMiniMaxManifest,
  MINIMAX_DEFAULT_BASE_URL,
  MINIMAX_DEFAULT_IMAGE_MODEL,
  MINIMAX_MAX_OUTPUT_COUNT,
  MINIMAX_MAX_PROMPT_LENGTH,
  MINIMAX_PROVIDER_ID,
  MINIMAX_SUPPORTED_ASPECT_RATIOS
} from './manifest.js';

export type MiniMaxArtProviderAdapterConfig = {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  fetchImpl?: typeof fetch;
};

type MiniMaxImageGenerationPayload = {
  model: string;
  prompt: string;
  aspect_ratio: AspectRatio;
  response_format: ImageResponseFormat;
  n: number;
  prompt_optimizer: boolean;
  seed?: number;
  subject_reference?: Array<{
    type: 'character';
    image_file: string;
  }>;
};

type MiniMaxBaseResponse = {
  status_code?: unknown;
  status_msg?: unknown;
};

type MiniMaxResponseBody = {
  id?: unknown;
  data?: unknown;
  base_resp?: MiniMaxBaseResponse;
};

const JSON_CONTENT_TYPE = 'application/json' as const;

export function createMiniMaxArtProviderAdapter(config: MiniMaxArtProviderAdapterConfig = {}): ArtProviderAdapter {
  return new MiniMaxArtProviderAdapter(config);
}

class MiniMaxArtProviderAdapter implements ArtProviderAdapter {
  readonly providerId = MINIMAX_PROVIDER_ID;

  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: MiniMaxArtProviderAdapterConfig) {
    this.apiKey = hasOwnProperty(config, 'apiKey') ? normalizeOptionalString(config.apiKey) : normalizeOptionalString(process.env.MINIMAX_API_KEY);
    this.baseUrl = withoutTrailingSlash(
      normalizeOptionalString(config.baseUrl) ?? normalizeOptionalString(process.env.MINIMAX_BASE_URL) ?? MINIMAX_DEFAULT_BASE_URL
    );
    this.defaultModel = normalizeOptionalString(config.defaultModel) ?? normalizeOptionalString(process.env.MINIMAX_IMAGE_MODEL) ?? MINIMAX_DEFAULT_IMAGE_MODEL;
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  getManifest(): ArtProviderManifest {
    return createMiniMaxManifest(this.defaultModel);
  }

  async validateConfig(): Promise<{ ok: boolean; error?: string }> {
    if (this.apiKey === undefined) {
      return {
        ok: false,
        error: 'MINIMAX_API_KEY is required for MiniMax live image generation.'
      };
    }
    return { ok: true };
  }

  async generateImage(input: GenerateImageInput): Promise<GeneratedImageResult> {
    const payload = buildPayload(input, this.defaultModel, 'image.generate');
    return this.requestMiniMax('image.generate', payload);
  }

  async imageToImage(input: ImageToImageInput): Promise<GeneratedImageResult> {
    const firstReference = input.referenceImages[0];
    if (firstReference === undefined || normalizeOptionalString(firstReference.imageUrl) === undefined) {
      throw normalizedError({
        operation: 'image.image_to_image',
        code: 'MINIMAX_REFERENCE_IMAGE_REQUIRED',
        message: 'MiniMax image-to-image requires one reference image URL.',
        retryable: false
      });
    }

    const payload = buildPayload(input, this.defaultModel, 'image.image_to_image');
    payload.subject_reference = [
      {
        // TODO: Revisit style/object reference mapping when MiniMax richer reference modes are supported.
        type: 'character',
        image_file: firstReference.imageUrl
      }
    ];
    return this.requestMiniMax('image.image_to_image', payload);
  }

  private async requestMiniMax(operation: ArtCapability, payload: MiniMaxImageGenerationPayload): Promise<GeneratedImageResult> {
    if (this.apiKey === undefined) {
      throw normalizedError({
        operation,
        code: 'MINIMAX_API_KEY_MISSING',
        message: 'MINIMAX_API_KEY is required for MiniMax live image generation.',
        retryable: false
      });
    }

    const response = await this.fetchImpl(`${this.baseUrl}/v1/image_generation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': JSON_CONTENT_TYPE
      },
      body: JSON.stringify(payload)
    });
    const raw = await readJsonResponse(response, operation);

    if (!response.ok) {
      throw normalizedError({
        operation,
        httpStatus: response.status,
        code: errorCodeFrom(raw),
        message: errorMessageFrom(raw, `MiniMax image generation failed with HTTP ${response.status}.`),
        retryable: isRetryable(response.status, errorCodeFrom(raw), errorMessageFrom(raw, ''))
      });
    }

    const baseResp = asRecord(raw).base_resp;
    if (isRecord(baseResp)) {
      const statusCode = baseResp.status_code;
      if (typeof statusCode === 'number' && statusCode !== 0) {
        const message = typeof baseResp.status_msg === 'string' ? baseResp.status_msg : 'MiniMax provider returned a non-zero status code.';
        throw normalizedError({
          operation,
          code: statusCode,
          message,
          retryable: isRetryable(undefined, statusCode, message),
          raw
        });
      }
    }

    const images = normalizeImages(raw);
    if (images.length === 0) {
      throw normalizedError({
        operation,
        code: 'MINIMAX_EMPTY_IMAGE_RESPONSE',
        message: 'MiniMax response did not include image_base64 or image_urls.',
        retryable: true,
        raw
      });
    }

    const traceId = asRecord(raw).id;
    return {
      providerId: MINIMAX_PROVIDER_ID,
      modelId: payload.model,
      ...(typeof traceId === 'string' ? { traceId } : {}),
      images,
      raw
    };
  }
}

function buildPayload(input: GenerateImageInput, model: string, operation: ArtCapability): MiniMaxImageGenerationPayload {
  const prompt = normalizePrompt(input.prompt, input.negativePrompt, operation);
  const count = input.count ?? 1;
  if (!Number.isInteger(count) || count < 1 || count > MINIMAX_MAX_OUTPUT_COUNT) {
    throw normalizedError({
      operation,
      code: 'MINIMAX_INVALID_COUNT',
      message: `MiniMax image count must be an integer from 1 to ${MINIMAX_MAX_OUTPUT_COUNT}.`,
      retryable: false
    });
  }

  const aspectRatio = input.aspectRatio ?? '1:1';
  if (!isSupportedAspectRatio(aspectRatio)) {
    throw normalizedError({
      operation,
      code: 'MINIMAX_UNSUPPORTED_ASPECT_RATIO',
      message: `MiniMax aspect ratio is unsupported: ${String(aspectRatio)}.`,
      retryable: false
    });
  }

  const responseFormat = input.responseFormat ?? 'base64';
  const payload: MiniMaxImageGenerationPayload = {
    model,
    prompt,
    aspect_ratio: aspectRatio,
    response_format: responseFormat,
    n: count,
    prompt_optimizer: input.providerOptions?.prompt_optimizer === true
  };

  if (input.seed !== undefined) {
    payload.seed = input.seed;
  }

  return payload;
}

function normalizePrompt(prompt: string, negativePrompt: string | undefined, operation: ArtCapability): string {
  if (prompt.length > MINIMAX_MAX_PROMPT_LENGTH) {
    throw normalizedError({
      operation,
      code: 'MINIMAX_PROMPT_TOO_LONG',
      message: `MiniMax prompt must be ${MINIMAX_MAX_PROMPT_LENGTH} characters or fewer.`,
      retryable: false
    });
  }

  const normalizedNegativePrompt = normalizeOptionalString(negativePrompt);
  const combined = normalizedNegativePrompt === undefined ? prompt : `${prompt}\n\nAvoid: ${normalizedNegativePrompt}`;
  if (combined.length > MINIMAX_MAX_PROMPT_LENGTH) {
    throw normalizedError({
      operation,
      code: 'MINIMAX_PROMPT_TOO_LONG',
      message: `MiniMax prompt plus negative prompt must be ${MINIMAX_MAX_PROMPT_LENGTH} characters or fewer.`,
      retryable: false
    });
  }
  return combined;
}

function normalizeImages(raw: unknown): GeneratedImage[] {
  const data = asRecord(asRecord(raw).data);
  const imageBase64 = Array.isArray(data.image_base64) ? data.image_base64.filter((value): value is string => typeof value === 'string') : [];
  const imageUrls = Array.isArray(data.image_urls) ? data.image_urls.filter((value): value is string => typeof value === 'string') : [];

  return [
    ...imageBase64.map((base64) => ({
      base64,
      mimeType: 'image/jpeg'
    })),
    ...imageUrls.map((temporaryUrl) => ({
      temporaryUrl
    }))
  ];
}

async function readJsonResponse(response: Response, operation: ArtCapability): Promise<MiniMaxResponseBody> {
  const text = await response.text();
  if (text.trim().length === 0) {
    return {};
  }
  try {
    return JSON.parse(text) as MiniMaxResponseBody;
  } catch (error) {
    throw normalizedError({
      operation,
      httpStatus: response.status,
      code: 'MINIMAX_INVALID_JSON_RESPONSE',
      message: error instanceof Error ? `MiniMax returned invalid JSON: ${error.message}` : 'MiniMax returned invalid JSON.',
      retryable: response.status >= 500
    });
  }
}

function errorCodeFrom(raw: unknown): string | number | undefined {
  const record = asRecord(raw);
  const baseResp = asRecord(record.base_resp);
  if (typeof baseResp.status_code === 'number' || typeof baseResp.status_code === 'string') {
    return baseResp.status_code;
  }
  const error = asRecord(record.error);
  if (typeof error.code === 'number' || typeof error.code === 'string') {
    return error.code;
  }
  if (typeof record.code === 'number' || typeof record.code === 'string') {
    return record.code;
  }
  return undefined;
}

function errorMessageFrom(raw: unknown, fallback: string): string {
  const record = asRecord(raw);
  const baseResp = asRecord(record.base_resp);
  if (typeof baseResp.status_msg === 'string' && baseResp.status_msg.length > 0) {
    return baseResp.status_msg;
  }
  const error = asRecord(record.error);
  if (typeof error.message === 'string' && error.message.length > 0) {
    return error.message;
  }
  if (typeof record.message === 'string' && record.message.length > 0) {
    return record.message;
  }
  return fallback;
}

function isRetryable(httpStatus: number | undefined, code: string | number | undefined, message: string): boolean {
  if (httpStatus === 429 || (httpStatus !== undefined && httpStatus >= 500)) {
    return true;
  }

  const searchable = `${String(code ?? '')} ${message}`.toLowerCase();
  if (searchable.includes('rate limit') || searchable.includes('too many requests') || searchable.includes('timeout')) {
    return true;
  }
  if (searchable.includes('auth') || searchable.includes('api key') || searchable.includes('apikey') || searchable.includes('quota')) {
    return false;
  }

  return false;
}

function normalizedError(input: {
  operation: ArtCapability;
  httpStatus?: number;
  code?: string | number;
  message: string;
  retryable: boolean;
  raw?: unknown;
}): ArtProviderAdapterError {
  const error: NormalizedProviderError = {
    providerId: MINIMAX_PROVIDER_ID,
    operation: input.operation,
    ...(input.httpStatus === undefined ? {} : { httpStatus: input.httpStatus }),
    ...(input.code === undefined ? {} : { code: input.code }),
    message: input.message,
    retryable: input.retryable,
    ...(input.raw === undefined ? {} : { raw: input.raw })
  };
  return new ArtProviderAdapterError(error);
}

function isSupportedAspectRatio(value: unknown): value is AspectRatio {
  return typeof value === 'string' && MINIMAX_SUPPORTED_ASPECT_RATIOS.includes(value as AspectRatio);
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}

function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function hasOwnProperty<T extends object>(value: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}
