import { createHash } from 'node:crypto';

import {
  planArtifactSandboxWrite,
  type ArtifactSandboxWritePlan
} from './art-provider-artifact-write-sandbox.js';

export const ALIYUN_BAILIAN_IMAGE_PROVIDER_ID = 'aliyun_bailian_images' as const;
export const ALIYUN_BAILIAN_QWEN_IMAGE_DEFAULT_MODEL = 'qwen-image-2.0-pro' as const;
export const ALIYUN_BAILIAN_QWEN_IMAGE_SMOKE_MODEL = 'qwen-image-2.0' as const;
export const ALIYUN_BAILIAN_DASHSCOPE_CREDENTIAL_REF = 'env:DASHSCOPE_API_KEY' as const;
export const ALIYUN_BAILIAN_IMAGE_ADAPTER_VERSION = 'art-provider-aliyun-bailian-image-adapter-v0.1' as const;

export const ART_PROVIDER_ALIYUN_BAILIAN_IMAGE_CUTOVER_RECORD = {
  producerChange: 'aliyun_bailian_images source image provider adapter',
  provider: ALIYUN_BAILIAN_IMAGE_PROVIDER_ID,
  defaultModel: ALIYUN_BAILIAN_QWEN_IMAGE_DEFAULT_MODEL,
  consumers: ['policy', 'live preflight', 'source resolver/report', 'artifact sandbox', 'contract tests'],
  compatibilityType: 'NEW_CONSUMER_REQUIRED',
  legacyStrategy: 'fake, disabled-live, live_dry_run preserved; adapter is standalone and opt-in only',
  failurePolicy: 'fail closed if any live/network/credential/cost/artifact/runtime-use gate is missing',
  cutoverBoundary: 'no CI live calls; manual/protected smoke only; source_image only; runtimeUseAllowed=false',
  rollback: 'revert Loop13A commit; no generated/archive/art assets expected'
} as const;

export type AliyunBailianQwenImageModel = typeof ALIYUN_BAILIAN_QWEN_IMAGE_DEFAULT_MODEL | typeof ALIYUN_BAILIAN_QWEN_IMAGE_SMOKE_MODEL;

export type AliyunBailianImageIntendedUse =
  | 'concept_reference'
  | 'character_source'
  | 'prop_source'
  | 'background_layer_source'
  | 'ui_icon_source'
  | 'vfx_texture_source'
  | 'tile_source';

export type AliyunBailianImageBlocker =
  | 'art_provider_live_call_not_allowed'
  | 'art_provider_live_network_not_allowed'
  | 'art_provider_live_credentials_missing'
  | 'art_provider_live_cost_not_acknowledged'
  | 'art_provider_live_artifact_write_not_approved'
  | 'art_provider_live_endpoint_missing'
  | 'art_provider_live_endpoint_not_allowed'
  | 'art_provider_live_credential_resolver_missing'
  | 'art_provider_live_http_client_missing'
  | 'art_provider_secret_access_not_allowed'
  | 'art_provider_source_image_runtime_use_forbidden'
  | 'art_provider_source_image_intended_use_unsupported'
  | 'art_provider_source_image_model_unsupported'
  | 'art_provider_source_image_budget_exceeded'
  | 'provider_generation_failed'
  | 'provider_output_malformed';

export type AliyunBailianImageSourceAssetBudget = {
  maxWidth: number;
  maxHeight: number;
  maxBytes: number;
  maxOutputCount: number;
  allowedContentTypes: readonly string[];
};

export type AliyunBailianImageGenerateInput = {
  prompt: string;
  intendedUse: AliyunBailianImageIntendedUse;
  model?: AliyunBailianQwenImageModel;
  endpoint?: string;
  size?: string;
  n?: number;
  negativePrompt?: string;
  promptExtend?: boolean;
  watermark?: boolean;
  seed?: number;
  expectedContentType?: string;
  sourceAssetBudget?: AliyunBailianImageSourceAssetBudget;
  credentialRef?: string;
  credentialAvailable?: boolean;
  allowLiveProvider?: boolean;
  allowNetwork?: boolean;
  costAcknowledged?: boolean;
  budgetLimitCents?: number;
  artifactWriteIntent?: 'none' | 'dry-run' | 'sandbox-write-approved';
  runtimeUseAllowed?: boolean;
};

export type AliyunBailianImageGenerationRequest = {
  method: 'POST';
  url: string;
  providerId: typeof ALIYUN_BAILIAN_IMAGE_PROVIDER_ID;
  model: string;
  credentialRef: typeof ALIYUN_BAILIAN_DASHSCOPE_CREDENTIAL_REF;
  sanitizedRequestFingerprint: string;
  body: {
    model: string;
    input: {
      messages: [
        {
          role: 'user';
          content: [{ text: string }];
        }
      ];
    };
    parameters: {
      negative_prompt?: string;
      prompt_extend: boolean;
      watermark: boolean;
      size: string;
      n: number;
      seed?: number;
    };
  };
};

export type AliyunBailianImageHttpRequest = {
  method: 'POST';
  url: string;
  headers: {
    Authorization: string;
    'Content-Type': 'application/json';
  };
  body: AliyunBailianImageGenerationRequest['body'];
};

export type AliyunBailianImageHttpResponse = {
  status: number;
  json: unknown;
};

export type AliyunBailianImageHttpClient = (request: AliyunBailianImageHttpRequest) => Promise<AliyunBailianImageHttpResponse>;
export type AliyunBailianImageCredentialResolver = (credentialRef: typeof ALIYUN_BAILIAN_DASHSCOPE_CREDENTIAL_REF) => Promise<string | undefined>;

export type AliyunBailianImageSourceCandidate = {
  candidateId: string;
  contentType: 'image/png';
  width: number;
  height: number;
  outputUrlPresent: boolean;
  transientOutputKind: 'temporary_url' | 'provider_reference';
};

export type AliyunBailianImageProviderErrorEvidence = {
  httpStatus: number;
  providerErrorCode?: string;
  providerMessageSha256?: string;
  providerRequestIdSha256?: string;
};

type SourceResultCommon = {
  providerId: string;
  model: string;
  artifactKind: 'source_image';
  outputKind: 'image';
  contentType: 'image/png';
  runtimeUseAllowed: false;
  requiresOptimization: true;
  allowAsRuntimeAsset: false;
  intendedUse: AliyunBailianImageIntendedUse;
  sourceAssetBudget: AliyunBailianImageSourceAssetBudget;
};

export type AliyunBailianImageSourceSuccess = SourceResultCommon & {
  ok: true;
  width: number;
  height: number;
  providerRequestId: string;
  sanitizedRequestFingerprint: string;
  sourceImageCandidates: AliyunBailianImageSourceCandidate[];
  sandboxWritePlan: ArtifactSandboxWritePlan;
  evidence: {
    adapterVersion: typeof ALIYUN_BAILIAN_IMAGE_ADAPTER_VERSION;
    providerResponseKind: 'qwen_image_generation';
    candidateCount: number;
    sourceImageOnly: true;
    sandboxWriteAutomatic: false;
  };
};

export type AliyunBailianImageSourceFailure = SourceResultCommon & {
  ok: false;
  blocker: AliyunBailianImageBlocker;
  errorCode: AliyunBailianImageBlocker;
  message: string;
  credentialEvidence?: {
    credentialRefKind: 'env' | 'unsafe' | 'missing';
    credentialAvailable: boolean;
  };
  providerErrorEvidence?: AliyunBailianImageProviderErrorEvidence;
};

export type AliyunBailianImageSourceResult = AliyunBailianImageSourceSuccess | AliyunBailianImageSourceFailure;

export type AliyunBailianImageProviderOptions = {
  providerId?: string;
  model?: AliyunBailianQwenImageModel;
  endpoint?: string;
  httpClient?: AliyunBailianImageHttpClient;
  credentialResolver?: AliyunBailianImageCredentialResolver;
  sourceAssetBudget?: AliyunBailianImageSourceAssetBudget;
};

export type AliyunBailianImageProvider = {
  readonly providerId: string;
  readonly model: string;
  readonly defaultModel: typeof ALIYUN_BAILIAN_QWEN_IMAGE_DEFAULT_MODEL;
  readonly outputKind: 'source_image';
  readonly runtimeUseAllowed: false;
  generateSourceImage(input: AliyunBailianImageGenerateInput): Promise<AliyunBailianImageSourceResult>;
};

export type BuildAliyunBailianImageGenerationRequestInput = Pick<
  AliyunBailianImageGenerateInput,
  'prompt' | 'intendedUse' | 'model' | 'size' | 'n' | 'negativePrompt' | 'promptExtend' | 'watermark' | 'seed'
> & {
  endpoint: string;
};

export type NormalizeAliyunBailianImageResponseInput = {
  providerId: string;
  model: string;
  request: AliyunBailianImageGenerationRequest;
  intendedUse: AliyunBailianImageIntendedUse;
  sourceAssetBudget: AliyunBailianImageSourceAssetBudget;
  responseJson: unknown;
  status?: number;
};

const DEFAULT_SOURCE_ASSET_BUDGET: AliyunBailianImageSourceAssetBudget = {
  maxWidth: 1024,
  maxHeight: 1024,
  maxBytes: 4_194_304,
  maxOutputCount: 1,
  allowedContentTypes: ['image/png']
};

const TRUSTED_ALIYUN_ENDPOINT_HOSTS = ['dashscope.aliyuncs.com', 'dashscope-intl.aliyuncs.com'] as const;
const TRUSTED_ALIYUN_WORKSPACE_ENDPOINT_PATTERN = /^[A-Za-z0-9-]+\.(cn-beijing|ap-southeast-1)\.maas\.aliyuncs\.com$/;
const SAFE_PROVIDER_ERROR_CODES = new Set([
  'InvalidApiKey',
  'InvalidParameter',
  'BadRequest',
  'Unauthorized',
  'Forbidden',
  'Throttling',
  'RateLimit',
  'QuotaExceeded',
  'InternalError',
  'ServiceUnavailable'
]);

/**
 * Builds the provider request body without headers or credentials. Authorization
 * is created only inside the explicit injected execution path.
 */
export function buildAliyunBailianImageGenerationRequest(input: BuildAliyunBailianImageGenerationRequestInput): AliyunBailianImageGenerationRequest {
  const model = normalizeNonEmpty(input.model) ?? ALIYUN_BAILIAN_QWEN_IMAGE_DEFAULT_MODEL;
  const endpoint = trustedEndpoint(input.endpoint);
  if (!endpoint.ok) {
    throw new Error('Aliyun Bailian endpoint must be a trusted HTTPS DashScope endpoint.');
  }
  const size = normalizeNonEmpty(input.size) ?? '1024*1024';
  const n = input.n ?? 1;
  const parameters: AliyunBailianImageGenerationRequest['body']['parameters'] = {
    ...(normalizeNonEmpty(input.negativePrompt) === undefined ? {} : { negative_prompt: normalizeNonEmpty(input.negativePrompt) }),
    prompt_extend: input.promptExtend === true,
    watermark: input.watermark === true,
    size,
    n,
    ...(input.seed === undefined ? {} : { seed: input.seed })
  };
  const body: AliyunBailianImageGenerationRequest['body'] = {
    model,
    input: {
      messages: [
        {
          role: 'user' as const,
          content: [{ text: input.prompt }]
        }
      ]
    },
    parameters
  };

  return {
    method: 'POST',
    url: `${endpoint.endpoint}/api/v1/services/aigc/multimodal-generation/generation`,
    providerId: ALIYUN_BAILIAN_IMAGE_PROVIDER_ID,
    model,
    credentialRef: ALIYUN_BAILIAN_DASHSCOPE_CREDENTIAL_REF,
    sanitizedRequestFingerprint: requestFingerprint({ model, intendedUse: input.intendedUse, body }),
    body
  };
}

/**
 * Creates an explicit, opt-in adapter for manual/protected live smoke. The
 * default resolver path does not instantiate or call this adapter.
 */
export function createAliyunBailianImageProvider(options: AliyunBailianImageProviderOptions = {}): AliyunBailianImageProvider {
  const providerId = options.providerId ?? ALIYUN_BAILIAN_IMAGE_PROVIDER_ID;
  const model = options.model ?? ALIYUN_BAILIAN_QWEN_IMAGE_DEFAULT_MODEL;
  const configuredBudget = options.sourceAssetBudget ?? DEFAULT_SOURCE_ASSET_BUDGET;

  return {
    providerId,
    model,
    defaultModel: ALIYUN_BAILIAN_QWEN_IMAGE_DEFAULT_MODEL,
    outputKind: 'source_image',
    runtimeUseAllowed: false,
    async generateSourceImage(input: AliyunBailianImageGenerateInput): Promise<AliyunBailianImageSourceResult> {
      const sourceAssetBudget = input.sourceAssetBudget ?? configuredBudget;
      const endpoint = normalizeNonEmpty(input.endpoint) ?? normalizeNonEmpty(options.endpoint);
      const effectiveModel = input.model ?? model;
      const gateBlocker = firstExecutionBlocker({ ...input, model: effectiveModel, sourceAssetBudget });
      if (gateBlocker !== undefined) {
        return blockedSourceResult(providerId, effectiveModel, input, sourceAssetBudget, gateBlocker);
      }
      if (endpoint === undefined) {
        return blockedSourceResult(providerId, effectiveModel, input, sourceAssetBudget, 'art_provider_live_endpoint_missing');
      }
      const endpointValidation = trustedEndpoint(endpoint);
      if (!endpointValidation.ok) {
        return blockedSourceResult(providerId, effectiveModel, input, sourceAssetBudget, endpointValidation.blocker);
      }
      if (options.credentialResolver === undefined) {
        return blockedSourceResult(providerId, effectiveModel, input, sourceAssetBudget, 'art_provider_live_credential_resolver_missing');
      }
      if (options.httpClient === undefined) {
        return blockedSourceResult(providerId, effectiveModel, input, sourceAssetBudget, 'art_provider_live_http_client_missing');
      }

      let credential: string | undefined;
      try {
        credential = await options.credentialResolver(ALIYUN_BAILIAN_DASHSCOPE_CREDENTIAL_REF);
      } catch {
        return blockedSourceResult(providerId, effectiveModel, input, sourceAssetBudget, 'art_provider_live_credentials_missing');
      }
      if (credential === undefined || credential.trim().length === 0) {
        return blockedSourceResult(providerId, effectiveModel, input, sourceAssetBudget, 'art_provider_live_credentials_missing');
      }

      const request = buildAliyunBailianImageGenerationRequest({
        endpoint: endpointValidation.endpoint,
        prompt: input.prompt,
        intendedUse: input.intendedUse,
        model: effectiveModel,
        size: input.size,
        n: input.n,
        negativePrompt: input.negativePrompt,
        promptExtend: input.promptExtend,
        watermark: input.watermark,
        seed: input.seed
      });
      let response: AliyunBailianImageHttpResponse;
      try {
        response = await options.httpClient({
          method: 'POST',
          url: request.url,
          headers: {
            Authorization: `Bearer ${credential}`,
            'Content-Type': 'application/json'
          },
          body: request.body
        });
      } catch {
        return blockedSourceResult(providerId, effectiveModel, input, sourceAssetBudget, 'provider_generation_failed');
      }
      if (!Number.isInteger(response.status) || response.status < 200 || response.status > 299) {
        return blockedSourceResult(providerId, effectiveModel, input, sourceAssetBudget, 'provider_generation_failed', {
          providerErrorEvidence: providerErrorEvidenceFor(response.status, response.json)
        });
      }

      return normalizeAliyunBailianImageResponse({
        providerId,
        model: effectiveModel,
        request,
        intendedUse: input.intendedUse,
        sourceAssetBudget,
        responseJson: response.json,
        status: response.status
      });
    }
  };
}

export function normalizeAliyunBailianImageResponse(input: NormalizeAliyunBailianImageResponseInput): AliyunBailianImageSourceResult {
  const requestSize = parseSize(input.request.body.parameters.size);
  const extracted = extractImageCandidates(input.responseJson, requestSize);
  if (extracted.length === 0 || requestSize === undefined) {
    return blockedSourceResult(input.providerId, input.model, {
      intendedUse: input.intendedUse,
      credentialRef: ALIYUN_BAILIAN_DASHSCOPE_CREDENTIAL_REF,
      credentialAvailable: true
    }, input.sourceAssetBudget, 'provider_output_malformed');
  }

  const candidateInputs = extracted.slice(0, input.request.body.parameters.n);
  if (!candidatesFitBudget(candidateInputs, requestSize, input.sourceAssetBudget)) {
    return blockedSourceResult(input.providerId, input.model, {
      intendedUse: input.intendedUse,
      credentialRef: ALIYUN_BAILIAN_DASHSCOPE_CREDENTIAL_REF,
      credentialAvailable: true
    }, input.sourceAssetBudget, 'art_provider_source_image_budget_exceeded');
  }

  const providerRequestId = providerRequestIdFor(input.responseJson, input.request.sanitizedRequestFingerprint);
  const candidates = candidateInputs.map((candidate, index) => ({
    candidateId: `${input.request.sanitizedRequestFingerprint}_${index}`,
    contentType: 'image/png' as const,
    width: candidate.width ?? requestSize.width,
    height: candidate.height ?? requestSize.height,
    outputUrlPresent: candidate.outputUrlPresent,
    transientOutputKind: candidate.outputUrlPresent ? 'temporary_url' as const : 'provider_reference' as const
  }));
  const firstCandidate = candidates[0];
  if (firstCandidate === undefined) {
    return blockedSourceResult(input.providerId, input.model, {
      intendedUse: input.intendedUse,
      credentialRef: ALIYUN_BAILIAN_DASHSCOPE_CREDENTIAL_REF,
      credentialAvailable: true
    }, input.sourceAssetBudget, 'provider_output_malformed');
  }

  const handoff = sourceImageHandoff({
    providerId: input.providerId,
    model: input.model,
    requestFingerprint: input.request.sanitizedRequestFingerprint,
    providerRequestId,
    intendedUse: input.intendedUse,
    width: firstCandidate.width,
    height: firstCandidate.height,
    candidates,
    sourceAssetBudget: input.sourceAssetBudget
  });
  const sandboxWritePlan = planArtifactSandboxWrite({
    artifactId: input.request.sanitizedRequestFingerprint,
    artifactPlanId: input.intendedUse,
    targetPath: `${input.request.sanitizedRequestFingerprint}.source-image-plan.json`,
    content: `${stableStringify(handoff)}\n`,
    contentType: 'application/json',
    artifactWriteApproved: true,
    artifactWriteIntent: 'sandbox-write-approved',
    providerMode: 'live',
    adapterMode: 'aliyun-bailian-qwen-image-source',
    evidenceRef: providerRequestId,
    reportRef: input.request.sanitizedRequestFingerprint
  });

  return {
    ok: true,
    providerId: input.providerId,
    model: input.model,
    artifactKind: 'source_image',
    outputKind: 'image',
    contentType: 'image/png',
    runtimeUseAllowed: false,
    requiresOptimization: true,
    allowAsRuntimeAsset: false,
    intendedUse: input.intendedUse,
    sourceAssetBudget: input.sourceAssetBudget,
    width: firstCandidate.width,
    height: firstCandidate.height,
    providerRequestId,
    sanitizedRequestFingerprint: input.request.sanitizedRequestFingerprint,
    sourceImageCandidates: candidates,
    sandboxWritePlan,
    evidence: {
      adapterVersion: ALIYUN_BAILIAN_IMAGE_ADAPTER_VERSION,
      providerResponseKind: 'qwen_image_generation',
      candidateCount: candidates.length,
      sourceImageOnly: true,
      sandboxWriteAutomatic: false
    }
  };
}

function firstExecutionBlocker(
  input: AliyunBailianImageGenerateInput & { model: string; sourceAssetBudget: AliyunBailianImageSourceAssetBudget }
): AliyunBailianImageBlocker | undefined {
  if (input.allowLiveProvider !== true) return 'art_provider_live_call_not_allowed';
  if (input.allowNetwork !== true) return 'art_provider_live_network_not_allowed';
  if (input.credentialRef === undefined || input.credentialRef.trim().length === 0) return 'art_provider_live_credentials_missing';
  if (isUnsafeCredentialRef(input.credentialRef) || input.credentialRef !== ALIYUN_BAILIAN_DASHSCOPE_CREDENTIAL_REF) return 'art_provider_secret_access_not_allowed';
  if (input.credentialAvailable !== true) return 'art_provider_live_credentials_missing';
  if (input.costAcknowledged !== true || !isValidBudgetLimitCents(input.budgetLimitCents)) return 'art_provider_live_cost_not_acknowledged';
  if (input.artifactWriteIntent !== 'sandbox-write-approved') return 'art_provider_live_artifact_write_not_approved';
  if (input.runtimeUseAllowed === true) return 'art_provider_source_image_runtime_use_forbidden';
  if (!isSupportedIntendedUse(input.intendedUse)) return 'art_provider_source_image_intended_use_unsupported';
  if (!isSupportedModel(input.model)) return 'art_provider_source_image_model_unsupported';
  if (!sourceBudgetAllows(input)) return 'art_provider_source_image_budget_exceeded';
  return undefined;
}

function sourceBudgetAllows(input: AliyunBailianImageGenerateInput & { sourceAssetBudget: AliyunBailianImageSourceAssetBudget }): boolean {
  const expectedContentType = input.expectedContentType ?? 'image/png';
  if (!input.sourceAssetBudget.allowedContentTypes.includes(expectedContentType)) {
    return false;
  }
  const size = parseSize(input.size ?? '1024*1024');
  if (size === undefined) {
    return false;
  }
  const n = input.n ?? 1;
  if (!Number.isInteger(n) || n < 1 || n > 6 || n > input.sourceAssetBudget.maxOutputCount) {
    return false;
  }
  if (size.width > input.sourceAssetBudget.maxWidth || size.height > input.sourceAssetBudget.maxHeight) {
    return false;
  }
  const bytesPerPixel = 4;
  return size.width * size.height * bytesPerPixel * n <= input.sourceAssetBudget.maxBytes;
}

function blockedSourceResult(
  providerId: string,
  model: string,
  input: Pick<AliyunBailianImageGenerateInput, 'intendedUse' | 'credentialRef' | 'credentialAvailable'>,
  sourceAssetBudget: AliyunBailianImageSourceAssetBudget,
  blocker: AliyunBailianImageBlocker,
  evidence: { providerErrorEvidence?: AliyunBailianImageProviderErrorEvidence } = {}
): AliyunBailianImageSourceFailure {
  const intendedUse = isSupportedIntendedUse(input.intendedUse) ? input.intendedUse : 'concept_reference';
  return {
    ok: false,
    providerId,
    model: safeModelForEvidence(model),
    artifactKind: 'source_image',
    outputKind: 'image',
    contentType: 'image/png',
    runtimeUseAllowed: false,
    requiresOptimization: true,
    allowAsRuntimeAsset: false,
    intendedUse,
    sourceAssetBudget,
    blocker,
    errorCode: blocker,
    message: `Aliyun Bailian image source adapter blocked: ${blocker}.`,
    credentialEvidence: {
      credentialRefKind: credentialRefKind(input.credentialRef),
      credentialAvailable: input.credentialAvailable === true
    },
    ...evidence
  };
}

function extractImageCandidates(responseJson: unknown, requestSize: { width: number; height: number } | undefined): Array<{ width?: number; height?: number; outputUrlPresent: boolean }> {
  const choices = readArray(readPath(responseJson, ['output', 'choices']));
  const candidates: Array<{ width?: number; height?: number; outputUrlPresent: boolean }> = [];
  for (const choice of choices) {
    const content = readArray(readPath(choice, ['message', 'content']));
    for (const item of content) {
      const image = readRecord(readPath(item, ['image']));
      if (typeof readPath(item, ['image']) === 'string') {
        candidates.push({ ...requestSize, outputUrlPresent: true });
        continue;
      }
      if (image !== undefined) {
        candidates.push({
          width: readPositiveInteger(image.width) ?? requestSize?.width,
          height: readPositiveInteger(image.height) ?? requestSize?.height,
          outputUrlPresent: typeof image.url === 'string' && image.url.length > 0
        });
      }
    }
  }
  return candidates;
}

function sourceImageHandoff(input: {
  providerId: string;
  model: string;
  requestFingerprint: string;
  providerRequestId: string;
  intendedUse: AliyunBailianImageIntendedUse;
  width: number;
  height: number;
  candidates: AliyunBailianImageSourceCandidate[];
  sourceAssetBudget: AliyunBailianImageSourceAssetBudget;
}): unknown {
  return {
    schemaVersion: ALIYUN_BAILIAN_IMAGE_ADAPTER_VERSION,
    providerId: input.providerId,
    model: input.model,
    artifactKind: 'source_image',
    outputKind: 'image',
    contentType: 'image/png',
    runtimeUseAllowed: false,
    requiresOptimization: true,
    allowAsRuntimeAsset: false,
    intendedUse: input.intendedUse,
    width: input.width,
    height: input.height,
    providerRequestId: input.providerRequestId,
    requestFingerprint: input.requestFingerprint,
    sourceAssetBudget: input.sourceAssetBudget,
    sourceImageCandidates: input.candidates
  };
}

function providerRequestIdFor(responseJson: unknown, fallback: string): string {
  const candidate =
    readString(readPath(responseJson, ['request_id'])) ??
    readString(readPath(responseJson, ['requestId'])) ??
    readString(readPath(responseJson, ['output', 'task_id'])) ??
    readString(readPath(responseJson, ['task_id']));
  if (candidate === undefined || !isSafeProviderRequestId(candidate)) {
    return fallback;
  }
  return candidate;
}

function parseSize(value: string): { width: number; height: number } | undefined {
  const match = /^(\d{2,5})\*(\d{2,5})$/.exec(value);
  if (match === null) {
    return undefined;
  }
  const width = Number(match[1]);
  const height = Number(match[2]);
  return Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 ? { width, height } : undefined;
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/g, '');
}

function trustedEndpoint(endpoint: string): { ok: true; endpoint: string } | { ok: false; blocker: 'art_provider_live_endpoint_not_allowed' } {
  const normalized = normalizeEndpoint(endpoint);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { ok: false, blocker: 'art_provider_live_endpoint_not_allowed' };
  }
  if (parsed.protocol !== 'https:' || parsed.username.length > 0 || parsed.password.length > 0 || parsed.search.length > 0 || parsed.hash.length > 0) {
    return { ok: false, blocker: 'art_provider_live_endpoint_not_allowed' };
  }
  if (!isTrustedAliyunEndpointHost(parsed.hostname)) {
    return { ok: false, blocker: 'art_provider_live_endpoint_not_allowed' };
  }
  return { ok: true, endpoint: normalized };
}

function normalizeNonEmpty(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
}

function requestFingerprint(value: unknown): string {
  return `aliyun_qwen_${sha256(stableStringify(value)).slice(0, 16)}`;
}

function isSupportedIntendedUse(value: unknown): value is AliyunBailianImageIntendedUse {
  return (
    value === 'concept_reference' ||
    value === 'character_source' ||
    value === 'prop_source' ||
    value === 'background_layer_source' ||
    value === 'ui_icon_source' ||
    value === 'vfx_texture_source' ||
    value === 'tile_source'
  );
}

function isSupportedModel(value: unknown): value is AliyunBailianQwenImageModel {
  return value === ALIYUN_BAILIAN_QWEN_IMAGE_DEFAULT_MODEL || value === ALIYUN_BAILIAN_QWEN_IMAGE_SMOKE_MODEL;
}

function candidateFitsBudget(
  candidate: { width?: number; height?: number },
  requestSize: { width: number; height: number },
  budget: AliyunBailianImageSourceAssetBudget
): boolean {
  const width = candidate.width ?? requestSize.width;
  const height = candidate.height ?? requestSize.height;
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0 &&
    width <= budget.maxWidth &&
    height <= budget.maxHeight &&
    width * height * 4 <= budget.maxBytes
  );
}

function candidatesFitBudget(
  candidates: ReadonlyArray<{ width?: number; height?: number }>,
  requestSize: { width: number; height: number },
  budget: AliyunBailianImageSourceAssetBudget
): boolean {
  if (candidates.length === 0 || candidates.length > budget.maxOutputCount) {
    return false;
  }
  let totalBytes = 0;
  for (const candidate of candidates) {
    if (!candidateFitsBudget(candidate, requestSize, budget)) {
      return false;
    }
    const width = candidate.width ?? requestSize.width;
    const height = candidate.height ?? requestSize.height;
    totalBytes += width * height * 4;
  }
  return totalBytes <= budget.maxBytes;
}

function isTrustedAliyunEndpointHost(hostname: string): boolean {
  return TRUSTED_ALIYUN_ENDPOINT_HOSTS.some((host) => hostname === host) || TRUSTED_ALIYUN_WORKSPACE_ENDPOINT_PATTERN.test(hostname);
}

function providerErrorEvidenceFor(status: number, responseJson: unknown): AliyunBailianImageProviderErrorEvidence {
  const code =
    readString(readPath(responseJson, ['code'])) ??
    readString(readPath(responseJson, ['error_code'])) ??
    readString(readPath(responseJson, ['errorCode']));
  const message =
    readString(readPath(responseJson, ['message'])) ??
    readString(readPath(responseJson, ['error_message'])) ??
    readString(readPath(responseJson, ['errorMessage']));
  const requestId =
    readString(readPath(responseJson, ['request_id'])) ??
    readString(readPath(responseJson, ['requestId'])) ??
    readString(readPath(responseJson, ['output', 'task_id'])) ??
    readString(readPath(responseJson, ['task_id']));

  return {
    httpStatus: status,
    ...(code === undefined ? {} : { providerErrorCode: safeProviderDiagnosticCode(code) }),
    ...(message === undefined ? {} : { providerMessageSha256: sha256(message).slice(0, 16) }),
    ...(requestId === undefined ? {} : { providerRequestIdSha256: sha256(requestId).slice(0, 16) })
  };
}

function safeProviderDiagnosticCode(value: string): string {
  return SAFE_PROVIDER_ERROR_CODES.has(value) ? value : `sha256:${sha256(value).slice(0, 16)}`;
}

function credentialRefKind(value: string | undefined): 'env' | 'unsafe' | 'missing' {
  if (value === undefined || value.trim().length === 0) {
    return 'missing';
  }
  return value === ALIYUN_BAILIAN_DASHSCOPE_CREDENTIAL_REF ? 'env' : 'unsafe';
}

function isUnsafeCredentialRef(value: string): boolean {
  return /sk-[a-z0-9_-]+|secret|token|authorization|bearer/i.test(value);
}

function isSafeProviderRequestId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(value) && !/[/?#=&%]/.test(value) && !isUnsafeCredentialRef(value);
}

function safeModelForEvidence(model: string): string {
  return isSupportedModel(model) ? model : 'unsupported_model';
}

function isValidBudgetLimitCents(value: number | undefined): boolean {
  return Number.isInteger(value) && value !== undefined && value > 0;
}

function readPath(value: unknown, path: readonly string[]): unknown {
  let current = value;
  for (const key of path) {
    const record = readRecord(current);
    if (record === undefined) {
      return undefined;
    }
    current = record[key];
  }
  return current;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readPositiveInteger(value: unknown): number | undefined {
  return Number.isInteger(value) && typeof value === 'number' && value > 0 ? value : undefined;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
