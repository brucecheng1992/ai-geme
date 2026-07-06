import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  ALIYUN_BAILIAN_DASHSCOPE_CREDENTIAL_REF,
  ALIYUN_BAILIAN_IMAGE_PROVIDER_ID,
  ALIYUN_BAILIAN_QWEN_IMAGE_DEFAULT_MODEL,
  ALIYUN_BAILIAN_QWEN_IMAGE_SMOKE_MODEL,
  ART_PROVIDER_ALIYUN_BAILIAN_IMAGE_CUTOVER_RECORD,
  buildAliyunBailianImageGenerationRequest,
  createAliyunBailianImageProvider,
  normalizeAliyunBailianImageResponse,
  type AliyunBailianImageGenerateInput,
  type AliyunBailianImageHttpClient,
  type AliyunBailianImageIntendedUse
} from '../../packages/asset-pipeline/src/index.js';

const ENDPOINT = 'https://workspace123.cn-beijing.maas.aliyuncs.com';

describe('Loop13A Aliyun Bailian Qwen image source-asset adapter', () => {
  it('exposes a configurable provider identity without making it the runtime default', () => {
    const defaultProvider = createAliyunBailianImageProvider();
    const smokeProvider = createAliyunBailianImageProvider({ model: ALIYUN_BAILIAN_QWEN_IMAGE_SMOKE_MODEL });

    expect(ALIYUN_BAILIAN_IMAGE_PROVIDER_ID).toBe('aliyun_bailian_images');
    expect(defaultProvider).toMatchObject({
      providerId: 'aliyun_bailian_images',
      model: 'qwen-image-2.0-pro',
      defaultModel: 'qwen-image-2.0-pro',
      outputKind: 'source_image',
      runtimeUseAllowed: false
    });
    expect(smokeProvider.model).toBe('qwen-image-2.0');
    expect(ART_PROVIDER_ALIYUN_BAILIAN_IMAGE_CUTOVER_RECORD).toMatchObject({
      provider: 'aliyun_bailian_images',
      defaultModel: 'qwen-image-2.0-pro',
      legacyStrategy: expect.stringContaining('fake, disabled-live, live_dry_run preserved'),
      failurePolicy: expect.stringContaining('fail closed')
    });
  });

  it('builds the official-style Qwen image generation request with deterministic defaults', () => {
    const request = buildAliyunBailianImageGenerationRequest({
      endpoint: ENDPOINT,
      prompt: 'side-view heroic runner sprite reference',
      intendedUse: 'character_source',
      negativePrompt: 'blurry, low quality',
      seed: 123
    });

    expect(request).toEqual({
      method: 'POST',
      url: `${ENDPOINT}/api/v1/services/aigc/multimodal-generation/generation`,
      providerId: 'aliyun_bailian_images',
      model: 'qwen-image-2.0-pro',
      credentialRef: 'env:DASHSCOPE_API_KEY',
      sanitizedRequestFingerprint: expect.stringMatching(/^aliyun_qwen_[a-f0-9]{16}$/),
      body: {
        model: 'qwen-image-2.0-pro',
        input: {
          messages: [
            {
              role: 'user',
              content: [{ text: 'side-view heroic runner sprite reference' }]
            }
          ]
        },
        parameters: {
          negative_prompt: 'blurry, low quality',
          prompt_extend: false,
          watermark: false,
          size: '1024*1024',
          n: 1,
          seed: 123
        }
      }
    });
    expect(JSON.stringify(request)).not.toMatch(/Authorization|Bearer|sk-live-secret|raw_provider_response/i);
  });

  it('fails closed before execution when any live, credential, cost, artifact, source, or budget gate is missing', async () => {
    const provider = createAliyunBailianImageProvider({
      endpoint: ENDPOINT,
      httpClient: async () => {
        throw new Error('http client must not be reached for blocked gates');
      },
      credentialResolver: async () => 'fake-credential'
    });

    const cases: Array<[string, Partial<AliyunBailianImageGenerateInput>, string]> = [
      ['missing credentialRef', { credentialRef: undefined }, 'art_provider_live_credentials_missing'],
      ['credential unavailable', { credentialAvailable: false }, 'art_provider_live_credentials_missing'],
      ['network not allowed', { allowNetwork: false }, 'art_provider_live_network_not_allowed'],
      ['cost not acknowledged', { costAcknowledged: false }, 'art_provider_live_cost_not_acknowledged'],
      ['artifact intent missing', { artifactWriteIntent: 'none' }, 'art_provider_live_artifact_write_not_approved'],
      ['runtime use requested', { runtimeUseAllowed: true }, 'art_provider_source_image_runtime_use_forbidden'],
      ['unsupported intended use', { intendedUse: 'full_game_screenshot' as AliyunBailianImageIntendedUse }, 'art_provider_source_image_intended_use_unsupported'],
      ['unsupported model', { model: 'qwen-image-unbounded' as AliyunBailianImageGenerateInput['model'] }, 'art_provider_source_image_model_unsupported'],
      ['invalid n', { n: 7 }, 'art_provider_source_image_budget_exceeded'],
      ['oversized source image', { size: '2048*2048' }, 'art_provider_source_image_budget_exceeded'],
      ['unsupported content type', { expectedContentType: 'image/jpeg' }, 'art_provider_source_image_budget_exceeded']
    ];

    for (const [name, override, blocker] of cases) {
      const result = await provider.generateSourceImage({ ...readyInput(), ...override });
      expect(result, name).toMatchObject({ ok: false, blocker, errorCode: blocker });
      expect(JSON.stringify(result), name).not.toMatch(/Authorization|Bearer|fake-credential|temporary\.example|raw_provider_response/i);
    }

    const unsafeCredentialRef = await provider.generateSourceImage({
      ...readyInput(),
      credentialRef: 'sk-live-secret-123'
    });
    expect(unsafeCredentialRef).toMatchObject({
      ok: false,
      blocker: 'art_provider_secret_access_not_allowed'
    });
    expect(JSON.stringify(unsafeCredentialRef)).not.toContain('sk-live-secret-123');

    const unsafeModel = await provider.generateSourceImage({
      ...readyInput(),
      model: 'Bearer sk-live-secret-123' as AliyunBailianImageGenerateInput['model']
    });
    expect(unsafeModel).toMatchObject({
      ok: false,
      blocker: 'art_provider_source_image_model_unsupported',
      model: 'unsupported_model'
    });
    expect(JSON.stringify(unsafeModel)).not.toContain('sk-live-secret-123');
  });

  it('blocks untrusted endpoints before resolving credentials', async () => {
    let credentialCalls = 0;
    let httpCalls = 0;
    const provider = createAliyunBailianImageProvider({
      endpoint: 'https://attacker.dashscope.aliyuncs.com',
      httpClient: async () => {
        httpCalls += 1;
        throw new Error('http client must not be reached for untrusted endpoints');
      },
      credentialResolver: async () => {
        credentialCalls += 1;
        return 'fake-credential';
      }
    });

    const result = await provider.generateSourceImage(readyInput());

    expect(credentialCalls).toBe(0);
    expect(httpCalls).toBe(0);
    expect(result).toMatchObject({
      ok: false,
      blocker: 'art_provider_live_endpoint_not_allowed'
    });
    expect(JSON.stringify(result)).not.toMatch(/attacker\.dashscope|fake-credential|Authorization|Bearer/i);
  });

  it('converts credential and HTTP dependency throws into sanitized typed failures', async () => {
    const credentialFailure = await createAliyunBailianImageProvider({
      endpoint: ENDPOINT,
      httpClient: async () => {
        throw new Error('http client must not be reached after credential failure');
      },
      credentialResolver: async () => {
        throw new Error('Bearer fake-credential should not leak');
      }
    }).generateSourceImage(readyInput());

    expect(credentialFailure).toMatchObject({
      ok: false,
      blocker: 'art_provider_live_credentials_missing'
    });
    expect(JSON.stringify(credentialFailure)).not.toMatch(/fake-credential|Bearer|should not leak/i);

    const httpFailure = await createAliyunBailianImageProvider({
      endpoint: ENDPOINT,
      httpClient: async () => {
        throw new Error('Authorization: Bearer fake-credential should not leak');
      },
      credentialResolver: async () => 'fake-credential'
    }).generateSourceImage(readyInput());

    expect(httpFailure).toMatchObject({
      ok: false,
      blocker: 'provider_generation_failed'
    });
    expect(JSON.stringify(httpFailure)).not.toMatch(/fake-credential|Authorization|Bearer|should not leak/i);
  });

  it('uses injected fake credential and HTTP dependencies to normalize source_image output without writes or secret leaks', async () => {
    let credentialCalls = 0;
    let httpCalls = 0;
    const httpClient: AliyunBailianImageHttpClient = async (request) => {
      httpCalls += 1;
      expect(request.url).toBe(`${ENDPOINT}/api/v1/services/aigc/multimodal-generation/generation`);
      expect(request.headers).toEqual({
        Authorization: 'Bearer fake-credential',
        'Content-Type': 'application/json'
      });
      expect(request.body.parameters).toMatchObject({ size: '1024*1024', n: 1 });
      return {
        status: 200,
        json: {
          request_id: 'req_safe_123',
          output: {
            choices: [
              {
                message: {
                  content: [
                    {
                      image: {
                        url: 'https://temporary.example/source.png?signature=must-not-persist',
                        width: 1024,
                        height: 1024
                      }
                    }
                  ]
                }
              }
            ]
          },
          raw_provider_response_secret: 'sk-live-secret-123'
        }
      };
    };

    const provider = createAliyunBailianImageProvider({
      endpoint: ENDPOINT,
      httpClient,
      credentialResolver: async (credentialRef) => {
        credentialCalls += 1;
        expect(credentialRef).toBe(ALIYUN_BAILIAN_DASHSCOPE_CREDENTIAL_REF);
        return 'fake-credential';
      }
    });

    const result = await provider.generateSourceImage(readyInput());

    expect(credentialCalls).toBe(1);
    expect(httpCalls).toBe(1);
    expect(result).toMatchObject({
      ok: true,
      providerId: 'aliyun_bailian_images',
      model: 'qwen-image-2.0-pro',
      artifactKind: 'source_image',
      outputKind: 'image',
      contentType: 'image/png',
      runtimeUseAllowed: false,
      requiresOptimization: true,
      allowAsRuntimeAsset: false,
      intendedUse: 'character_source',
      width: 1024,
      height: 1024,
      providerRequestId: 'req_safe_123',
      sourceImageCandidates: [
        {
          candidateId: expect.stringMatching(/^aliyun_qwen_[a-f0-9]{16}_0$/),
          contentType: 'image/png',
          width: 1024,
          height: 1024,
          outputUrlPresent: true,
          transientOutputKind: 'temporary_url'
        }
      ],
      sandboxWritePlan: {
        ok: true,
        wouldWriteArtifact: false,
        sandboxRequired: true,
        dryRun: true,
        sandbox: true,
        contentType: 'application/json',
        providerMode: 'live',
        adapterMode: 'aliyun-bailian-qwen-image-source'
      }
    });
    expect(JSON.stringify(result)).not.toMatch(/fake-credential|Authorization|Bearer|temporary\.example|signature=|sk-live-secret|raw_provider_response_secret/i);
  });

  it('normalizes malformed fake provider responses into typed blockers', () => {
    const result = normalizeAliyunBailianImageResponse({
      providerId: ALIYUN_BAILIAN_IMAGE_PROVIDER_ID,
      model: ALIYUN_BAILIAN_QWEN_IMAGE_DEFAULT_MODEL,
      request: buildAliyunBailianImageGenerationRequest({
        endpoint: ENDPOINT,
        prompt: 'broken response',
        intendedUse: 'concept_reference'
      }),
      intendedUse: 'concept_reference',
      sourceAssetBudget: defaultSourceBudget(),
      responseJson: { output: { choices: [] } }
    });

    expect(result).toMatchObject({
      ok: false,
      providerId: 'aliyun_bailian_images',
      model: 'qwen-image-2.0-pro',
      blocker: 'provider_output_malformed',
      errorCode: 'provider_output_malformed',
      runtimeUseAllowed: false,
      requiresOptimization: true
    });
  });

  it('fails closed when provider response ids or dimensions are unsafe for long-lived evidence', () => {
    const unsafeRequestId = normalizeAliyunBailianImageResponse({
      providerId: ALIYUN_BAILIAN_IMAGE_PROVIDER_ID,
      model: ALIYUN_BAILIAN_QWEN_IMAGE_DEFAULT_MODEL,
      request: buildAliyunBailianImageGenerationRequest({
        endpoint: ENDPOINT,
        prompt: 'unsafe request id response',
        intendedUse: 'concept_reference'
      }),
      intendedUse: 'concept_reference',
      sourceAssetBudget: defaultSourceBudget(),
      responseJson: {
        request_id: 'https://temporary.example/signed-image?sig=abc',
        output: {
          choices: [
            {
              message: {
                content: [{ image: { url: 'https://temporary.example/image.png', width: 1024, height: 1024 } }]
              }
            }
          ]
        }
      }
    });

    expect(unsafeRequestId).toMatchObject({ ok: true });
    if (unsafeRequestId.ok) {
      expect(unsafeRequestId.providerRequestId).toBe(unsafeRequestId.sanitizedRequestFingerprint);
      expect(JSON.stringify(unsafeRequestId)).not.toMatch(/temporary\.example|sig=abc/i);
    }

    const oversizedResponse = normalizeAliyunBailianImageResponse({
      providerId: ALIYUN_BAILIAN_IMAGE_PROVIDER_ID,
      model: ALIYUN_BAILIAN_QWEN_IMAGE_DEFAULT_MODEL,
      request: buildAliyunBailianImageGenerationRequest({
        endpoint: ENDPOINT,
        prompt: 'oversized response',
        intendedUse: 'concept_reference'
      }),
      intendedUse: 'concept_reference',
      sourceAssetBudget: defaultSourceBudget(),
      responseJson: {
        request_id: 'req_safe_456',
        output: {
          choices: [
            {
              message: {
                content: [{ image: { url: 'https://temporary.example/image.png', width: 2048, height: 1024 } }]
              }
            }
          ]
        }
      }
    });

    expect(oversizedResponse).toMatchObject({
      ok: false,
      blocker: 'art_provider_source_image_budget_exceeded'
    });
    expect(JSON.stringify(oversizedResponse)).not.toMatch(/temporary\.example|req_safe_456/i);

    const aggregateBudgetExceeded = normalizeAliyunBailianImageResponse({
      providerId: ALIYUN_BAILIAN_IMAGE_PROVIDER_ID,
      model: ALIYUN_BAILIAN_QWEN_IMAGE_DEFAULT_MODEL,
      request: buildAliyunBailianImageGenerationRequest({
        endpoint: ENDPOINT,
        prompt: 'aggregate oversized response',
        intendedUse: 'concept_reference',
        size: '512*512',
        n: 2
      }),
      intendedUse: 'concept_reference',
      sourceAssetBudget: {
        ...defaultSourceBudget(),
        maxOutputCount: 2
      },
      responseJson: {
        request_id: 'req_safe_789',
        output: {
          choices: [
            {
              message: {
                content: [{ image: { url: 'https://temporary.example/a.png', width: 1024, height: 1024 } }]
              }
            },
            {
              message: {
                content: [{ image: { url: 'https://temporary.example/b.png', width: 1024, height: 1024 } }]
              }
            }
          ]
        }
      }
    });

    expect(aggregateBudgetExceeded).toMatchObject({
      ok: false,
      blocker: 'art_provider_source_image_budget_exceeded'
    });
    expect(JSON.stringify(aggregateBudgetExceeded)).not.toMatch(/temporary\.example|req_safe_789/i);
  });

  it('does not call global fetch and blocks execution when injected live dependencies are absent', async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      throw new Error('global fetch must not be used by the adapter');
    }) as typeof fetch;

    try {
      const result = await createAliyunBailianImageProvider({ endpoint: ENDPOINT }).generateSourceImage(readyInput());

      expect(fetchCalls).toBe(0);
      expect(result).toMatchObject({
        ok: false,
        blocker: 'art_provider_live_credential_resolver_missing'
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('keeps core adapter source free of direct env reads and real provider SDK imports', async () => {
    const source = await readFile(
      new URL('../../packages/asset-pipeline/src/art-provider-aliyun-bailian-image-adapter.ts', import.meta.url),
      'utf8'
    );

    expect(source).not.toContain('process.env');
    expect(source).not.toMatch(/from ['"].*(dashscope|aliyun|bailian).*['"]/i);
    expect(source.match(/DASHSCOPE_API_KEY/g)).toHaveLength(1);
    expect(source).toContain("ALIYUN_BAILIAN_DASHSCOPE_CREDENTIAL_REF = 'env:DASHSCOPE_API_KEY'");
  });
});

function readyInput(): AliyunBailianImageGenerateInput {
  return {
    prompt: 'side-view heroic runner sprite reference',
    intendedUse: 'character_source',
    credentialRef: ALIYUN_BAILIAN_DASHSCOPE_CREDENTIAL_REF,
    credentialAvailable: true,
    allowLiveProvider: true,
    allowNetwork: true,
    costAcknowledged: true,
    budgetLimitCents: 2500,
    artifactWriteIntent: 'sandbox-write-approved',
    runtimeUseAllowed: false
  };
}

function defaultSourceBudget() {
  return {
    maxWidth: 1024,
    maxHeight: 1024,
    maxBytes: 4_194_304,
    maxOutputCount: 1,
    allowedContentTypes: ['image/png']
  };
}
