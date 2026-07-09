import { describe, expect, it } from 'vitest';

import {
  clearRegisteredArtProvidersForTests,
  createMiniMaxArtProviderAdapter,
  createMiniMaxProviderProfileFromEnv,
  getProvider,
  listProviders,
  registerProvider,
  type GenerateImageInput,
  type NormalizedProviderError
} from '../../packages/asset-pipeline/src/index.js';

describe('MiniMax ArtProviderAdapter', () => {
  it('maps provider-neutral text-to-image requests to MiniMax image_generation payloads', async () => {
    const requests: CapturedRequest[] = [];
    const adapter = createMiniMaxArtProviderAdapter({
      apiKey: 'sk-minimax-test-key',
      baseUrl: 'https://minimax.test/',
      defaultModel: 'image-test',
      fetchImpl: captureFetch(requests, {
        id: 'trace-text',
        data: { image_base64: ['BASE64_IMAGE'] },
        base_resp: { status_code: 0, status_msg: 'success' }
      })
    });

    const result = await adapter.generateImage({
      taskId: 'task-text',
      assetType: 'skill_icon',
      prompt: '2D glowing sword slash icon',
      negativePrompt: 'photorealistic',
      aspectRatio: '1:1',
      count: 2,
      seed: 42,
      providerOptions: { prompt_optimizer: true }
    });

    expect(requests).toEqual([
      {
        url: 'https://minimax.test/v1/image_generation',
        method: 'POST',
        headers: {
          authorization: 'Bearer sk-minimax-test-key',
          'content-type': 'application/json'
        },
        body: {
          model: 'image-test',
          prompt: '2D glowing sword slash icon\n\nAvoid: photorealistic',
          aspect_ratio: '1:1',
          response_format: 'base64',
          n: 2,
          prompt_optimizer: true,
          seed: 42
        }
      }
    ]);
    expect(result).toEqual({
      providerId: 'minimax',
      modelId: 'image-test',
      traceId: 'trace-text',
      images: [{ base64: 'BASE64_IMAGE', mimeType: 'image/jpeg' }],
      raw: {
        id: 'trace-text',
        data: { image_base64: ['BASE64_IMAGE'] },
        base_resp: { status_code: 0, status_msg: 'success' }
      }
    });
  });

  it('maps image-to-image requests to a single MiniMax subject reference and URL results', async () => {
    const requests: CapturedRequest[] = [];
    const adapter = createMiniMaxArtProviderAdapter({
      apiKey: 'sk-minimax-test-key',
      fetchImpl: captureFetch(requests, {
        id: 'trace-i2i',
        data: { image_urls: ['https://temporary.example/image.jpg'] },
        base_resp: { status_code: 0, status_msg: 'success' }
      })
    });

    const result = await adapter.imageToImage?.({
      taskId: 'task-reference',
      assetType: 'character_concept',
      prompt: 'same hero in winter armor',
      aspectRatio: '3:4',
      responseFormat: 'url',
      referenceImages: [
        { type: 'style', imageUrl: 'https://example.com/reference.png' },
        { type: 'object', imageUrl: 'https://example.com/ignored.png' }
      ]
    });

    expect(requests[0]?.body).toMatchObject({
      model: 'image-01',
      prompt: 'same hero in winter armor',
      aspect_ratio: '3:4',
      response_format: 'url',
      n: 1,
      prompt_optimizer: false,
      subject_reference: [{ type: 'character', image_file: 'https://example.com/reference.png' }]
    });
    expect(result?.images).toEqual([{ temporaryUrl: 'https://temporary.example/image.jpg' }]);
  });

  it('rejects invalid canonical inputs before any network call', async () => {
    const requests: CapturedRequest[] = [];
    const adapter = createMiniMaxArtProviderAdapter({
      apiKey: 'sk-minimax-test-key',
      fetchImpl: captureFetch(requests, {
        id: 'should-not-run',
        data: { image_base64: ['BASE64_IMAGE'] },
        base_resp: { status_code: 0, status_msg: 'success' }
      })
    });

    await expect(adapter.generateImage(validInput({ count: 0 }))).rejects.toMatchObject({
      normalizedError: {
        providerId: 'minimax',
        operation: 'image.generate',
        code: 'MINIMAX_INVALID_COUNT',
        retryable: false
      }
    });
    await expect(adapter.generateImage(validInput({ count: 10 }))).rejects.toMatchObject({
      normalizedError: { code: 'MINIMAX_INVALID_COUNT' }
    });
    await expect(adapter.generateImage(validInput({ prompt: 'x'.repeat(1501) }))).rejects.toMatchObject({
      normalizedError: { code: 'MINIMAX_PROMPT_TOO_LONG' }
    });
    await expect(adapter.generateImage(validInput({ aspectRatio: '5:4' as GenerateImageInput['aspectRatio'] }))).rejects.toMatchObject({
      normalizedError: { code: 'MINIMAX_UNSUPPORTED_ASPECT_RATIO' }
    });
    await expect(
      adapter.imageToImage?.({
        ...validInput(),
        referenceImages: []
      })
    ).rejects.toMatchObject({
      normalizedError: { code: 'MINIMAX_REFERENCE_IMAGE_REQUIRED' }
    });
    expect(requests).toHaveLength(0);
  });

  it('normalizes HTTP and provider errors without leaking API keys', async () => {
    const http401 = createMiniMaxArtProviderAdapter({
      apiKey: 'sk-minimax-secret',
      fetchImpl: captureFetch([], {
        error: { code: 'InvalidApiKey', message: 'bad key' }
      }, 401)
    });
    const providerFailure = createMiniMaxArtProviderAdapter({
      apiKey: 'sk-minimax-secret',
      fetchImpl: captureFetch([], {
        id: 'trace-provider-error',
        data: {},
        base_resp: { status_code: 1008, status_msg: 'quota exceeded' }
      })
    });

    const authError = await captureNormalizedError(() => http401.generateImage(validInput()));
    expect(authError).toMatchObject({
      providerId: 'minimax',
      operation: 'image.generate',
      httpStatus: 401,
      code: 'InvalidApiKey',
      retryable: false
    });
    expect(JSON.stringify(authError)).not.toContain('sk-minimax-secret');

    const providerError = await captureNormalizedError(() => providerFailure.generateImage(validInput()));
    expect(providerError).toMatchObject({
      providerId: 'minimax',
      operation: 'image.generate',
      code: 1008,
      message: 'quota exceeded',
      retryable: false
    });
    expect(JSON.stringify(providerError)).not.toContain('sk-minimax-secret');
  });

  it('defers missing API key failure until a live call is attempted', async () => {
    const originalApiKey = process.env.MINIMAX_API_KEY;
    process.env.MINIMAX_API_KEY = 'sk-minimax-env-key';
    const envRequests: CapturedRequest[] = [];
    const envAdapter = createMiniMaxArtProviderAdapter({
      fetchImpl: captureFetch(envRequests, {
        id: 'trace-env',
        data: { image_base64: ['BASE64_IMAGE'] },
        base_resp: { status_code: 0, status_msg: 'success' }
      })
    });
    const adapter = createMiniMaxArtProviderAdapter({
      apiKey: '',
      fetchImpl: captureFetch([], {
        id: 'should-not-run',
        data: { image_base64: ['BASE64_IMAGE'] },
        base_resp: { status_code: 0, status_msg: 'success' }
      })
    });

    try {
      await expect(envAdapter.generateImage(validInput())).resolves.toMatchObject({
        providerId: 'minimax',
        images: [{ base64: 'BASE64_IMAGE', mimeType: 'image/jpeg' }]
      });
      expect(envRequests[0]?.headers.authorization).toBe('Bearer sk-minimax-env-key');

      expect(adapter.providerId).toBe('minimax');
      await expect(adapter.validateConfig?.()).resolves.toEqual({
        ok: false,
        error: 'MINIMAX_API_KEY is required for MiniMax live image generation.'
      });
      await expect(adapter.generateImage(validInput())).rejects.toMatchObject({
        normalizedError: {
          providerId: 'minimax',
          operation: 'image.generate',
          code: 'MINIMAX_API_KEY_MISSING',
          retryable: false
        }
      });
    } finally {
      if (originalApiKey === undefined) {
        delete process.env.MINIMAX_API_KEY;
      } else {
        process.env.MINIMAX_API_KEY = originalApiKey;
      }
    }
  });

  it('exposes a provider manifest, env profile, and duplicate-safe registry skeleton', () => {
    clearRegisteredArtProvidersForTests();
    const adapter = createMiniMaxArtProviderAdapter({ apiKey: 'sk-minimax-test-key' });
    const manifest = adapter.getManifest();

    expect(manifest).toMatchObject({
      providerId: 'minimax',
      displayName: 'MiniMax',
      capabilities: {
        textToImage: true,
        imageToImage: true,
        maskedImageEdit: false,
        styleReference: false,
        subjectReference: true,
        batchGeneration: true,
        seedControl: true,
        asyncJob: false
      },
      limits: {
        maxPromptLength: 1500,
        maxOutputCount: 9
      },
      models: [{ modelId: 'image-01', capabilities: ['image.generate', 'image.image_to_image'] }]
    });

    expect(
      createMiniMaxProviderProfileFromEnv({
        MINIMAX_IMAGE_MODEL: 'image-profile',
        RUN_MINIMAX_LIVE_TESTS: '1'
      })
    ).toEqual({
      providerProfileId: 'minimax-env',
      providerId: 'minimax',
      auth: { mode: 'env', apiKeyRef: 'MINIMAX_API_KEY' },
      defaults: {
        modelId: 'image-profile',
        imageCount: 1,
        aspectRatio: '1:1',
        responseFormat: 'base64'
      },
      enabled: true
    });

    registerProvider(adapter);
    expect(getProvider('minimax')).toBe(adapter);
    expect(listProviders()).toEqual([adapter]);
    expect(() => registerProvider(adapter)).toThrow('Art provider already registered: minimax.');
  });
});

type CapturedRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
};

function validInput(overrides: Partial<GenerateImageInput> = {}): GenerateImageInput {
  return {
    taskId: 'task-valid',
    assetType: 'skill_icon',
    prompt: '2D fantasy game skill icon',
    ...overrides
  };
}

function captureFetch(requests: CapturedRequest[], responseBody: unknown, status = 200): typeof fetch {
  return (async (input, init) => {
    requests.push({
      url: String(input),
      method: init?.method ?? 'GET',
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: init?.body === undefined ? undefined : JSON.parse(String(init.body))
    });
    return new Response(JSON.stringify(responseBody), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }) as typeof fetch;
}

async function captureNormalizedError(action: () => Promise<unknown>): Promise<NormalizedProviderError> {
  try {
    await action();
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'normalizedError' in error &&
      typeof error.normalizedError === 'object' &&
      error.normalizedError !== null
    ) {
      return error.normalizedError as NormalizedProviderError;
    }
    throw error;
  }

  throw new Error('Expected action to throw a normalized provider error.');
}
