import { createHash } from 'node:crypto';

import { z } from 'zod';

import type { ArtAssetMetadata } from './art-asset-metadata.schema.js';
import type { AssetIntent } from './asset-intent-manifest.js';
import {
  LIVE_DRY_RUN_ART_PROVIDER_CAPABILITIES,
  type ArtProvider,
  type ArtProviderLiveDryRunResultEnvelope,
  type ArtProviderRequest,
  type ArtProviderResult
} from './art-provider-contract.js';
import type { ArtProviderLivePreflightEvidence } from './art-provider-live-preflight-evidence.js';
import type { ArtSourceManifestRecord } from './art-source-manifest.js';

export const ART_PROVIDER_LIVE_DRY_RUN_ADAPTER_VERSION = 'art-provider-live-dry-run-adapter-v0.1' as const;
export const LIVE_DRY_RUN_ART_PROVIDER_ID = 'live_dry_run_art_provider' as const;

export const ArtProviderLiveDryRunResultSchema: z.ZodType<ArtProviderLiveDryRunResultEnvelope> = z.strictObject({
  contractVersion: z.literal(ART_PROVIDER_LIVE_DRY_RUN_ADAPTER_VERSION),
  source: z.literal('art_provider_live_dry_run_adapter'),
  adapterMode: z.literal('live-dry-run'),
  executionMode: z.literal('dry-run'),
  dryRun: z.literal(true),
  realLiveExecutionEnabled: z.literal(false),
  providerId: z.string().min(1).max(120),
  providerMode: z.literal('live_dry_run'),
  providerRequestId: z.string().regex(/^live_dry_run_[a-z0-9_]{2,79}$/),
  requestedProvider: z.literal('live'),
  assetIntentId: z.string().regex(/^[a-z][a-z0-9_.-]{1,79}$/),
  assetPlanId: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
  status: z.enum(['ready', 'blocked']),
  artifactWrite: z.strictObject({
    artifactWriteApproved: z.boolean(),
    wouldWriteArtifact: z.literal(false),
    intent: z.enum(['none', 'write-through-approved'])
  }),
  evidence: z.strictObject({
    evidenceContractVersion: z.string().min(1).optional(),
    readinessStatus: z.string().min(1).max(80),
    summaryCode: z.string().min(1).max(120),
    blockerCodes: z.array(z.string().min(1).max(120)).max(12),
    invalidFieldNames: z.array(z.string().min(1).max(120)).max(12)
  }),
  normalizedProviderResult: z.strictObject({
    outputKind: z.literal('art_source_manifest_record'),
    sourceType: z.literal('provider_generated'),
    contentType: z.literal('metadata/json'),
    path: z.string().min(1).max(240),
    contentSha256: z.string().regex(/^[a-f0-9]{64}$/),
    width: z.number().int().positive(),
    height: z.number().int().positive()
  }).optional()
});

export type ArtProviderLiveDryRunResult = z.infer<typeof ArtProviderLiveDryRunResultSchema>;

export type LiveDryRunArtProviderOptions = {
  providerId?: string;
  livePreflightEvidence?: ArtProviderLivePreflightEvidence;
};

type LiveDryRunBlocker = ArtProviderLivePreflightEvidence['blockerCodes'][number] | 'art_provider_live_preflight_invalid' | 'art_provider_live_call_not_allowed';

/**
 * Creates a deterministic rehearsal adapter for the future live-provider lane.
 * It accepts only sanitized preflight evidence and never reads env, secrets,
 * network, SDKs, files, binary payloads, or artifact destinations.
 */
export function createLiveDryRunArtProvider(options: LiveDryRunArtProviderOptions = {}): ArtProvider {
  const providerId = options.providerId ?? LIVE_DRY_RUN_ART_PROVIDER_ID;
  let calls = 0;

  return {
    providerId,
    mode: 'live_dry_run',
    capabilities: LIVE_DRY_RUN_ART_PROVIDER_CAPABILITIES,
    get calls() {
      return calls;
    },
    async generate(request: ArtProviderRequest): Promise<ArtProviderResult> {
      calls += 1;
      const readiness = liveDryRunReadiness(options.livePreflightEvidence);
      if (!readiness.ready) {
        const liveDryRunResult = buildDryRunResult({
          providerId,
          intent: request.intent,
          evidence: options.livePreflightEvidence,
          status: 'blocked'
        });
        const blocker = readiness.blocker;
        return {
          ok: false,
          providerId,
          providerMode: 'live_dry_run',
          assetIntentId: request.intent.id,
          errorCode: blocker,
          blocker,
          message: 'Live provider dry-run is blocked because sanitized live preflight evidence is not ready.',
          liveDryRunResult
        };
      }

      const source = buildLiveDryRunProviderSource({
        providerId,
        intent: request.intent,
        evidence: options.livePreflightEvidence
      });
      const liveDryRunResult = buildDryRunResult({
        providerId,
        intent: request.intent,
        evidence: options.livePreflightEvidence,
        status: 'ready',
        source
      });
      return {
        ok: true,
        providerId,
        providerMode: 'live_dry_run',
        assetIntentId: request.intent.id,
        outputKind: 'art_source_manifest_record',
        source,
        liveDryRunResult
      };
    }
  };
}

function liveDryRunReadiness(evidence: ArtProviderLivePreflightEvidence | undefined):
  | { ready: true }
  | { ready: false; blocker: LiveDryRunBlocker } {
  if (evidence === undefined) {
    return { ready: false, blocker: 'art_provider_live_preflight_invalid' };
  }

  const ready =
    evidence.liveRequested === true &&
    evidence.liveAllowed === true &&
    evidence.executionEnabled === false &&
    evidence.readinessStatus === 'preflight_ready_provider_unimplemented' &&
    evidence.summaryCode === 'live_provider_disabled_pending_implementation' &&
    evidence.blockerCodes.length === 0 &&
    evidence.invalidFieldNames.length === 0 &&
    evidence.networkPermission === true &&
    evidence.credentialEvidence.credentialRefPresent === true &&
    evidence.credentialEvidence.credentialAvailable === true &&
    evidence.costAcknowledged === true &&
    evidence.artifactWriteApproved === true;

  if (ready) {
    return { ready: true };
  }

  return {
    ready: false,
    blocker: primaryBlockerForEvidence(evidence)
  };
}

function primaryBlockerForEvidence(evidence: ArtProviderLivePreflightEvidence): LiveDryRunBlocker {
  if (evidence.invalidFieldNames.length > 0) {
    return 'art_provider_live_preflight_invalid';
  }
  const precedence: LiveDryRunBlocker[] = [
    'art_provider_live_call_not_allowed',
    'art_provider_live_network_not_allowed',
    'art_provider_live_credentials_missing',
    'art_provider_live_cost_not_acknowledged',
    'art_provider_live_artifact_write_not_approved',
    'art_provider_live_preflight_invalid'
  ];
  return precedence.find((blocker) => evidence.blockerCodes.includes(blocker)) ?? 'art_provider_live_call_not_allowed';
}

function buildDryRunResult(input: {
  providerId: string;
  intent: AssetIntent;
  evidence: ArtProviderLivePreflightEvidence | undefined;
  status: ArtProviderLiveDryRunResult['status'];
  source?: ArtSourceManifestRecord;
}): ArtProviderLiveDryRunResult {
  const result = {
    contractVersion: ART_PROVIDER_LIVE_DRY_RUN_ADAPTER_VERSION,
    source: 'art_provider_live_dry_run_adapter',
    adapterMode: 'live-dry-run',
    executionMode: 'dry-run',
    dryRun: true,
    realLiveExecutionEnabled: false,
    providerId: input.providerId,
    providerMode: 'live_dry_run',
    providerRequestId: providerRequestIdFor(input.providerId, input.intent, input.evidence),
    requestedProvider: 'live',
    assetIntentId: input.intent.id,
    assetPlanId: input.intent.assetPlanId,
    status: input.status,
    artifactWrite: {
      artifactWriteApproved: input.evidence?.artifactWriteApproved === true,
      wouldWriteArtifact: false,
      intent: input.evidence?.artifactWriteApproved === true ? 'write-through-approved' : 'none'
    },
    evidence: {
      ...(input.evidence === undefined ? {} : { evidenceContractVersion: input.evidence.contractVersion }),
      readinessStatus: input.evidence?.readinessStatus ?? 'missing',
      summaryCode: input.evidence?.summaryCode ?? 'live_preflight_missing',
      blockerCodes: sortedUnique(input.evidence?.blockerCodes ?? ['art_provider_live_preflight_invalid']),
      invalidFieldNames: sortedUnique(input.evidence?.invalidFieldNames ?? [])
    },
    ...(input.source === undefined
      ? {}
      : {
          normalizedProviderResult: {
            outputKind: 'art_source_manifest_record',
            sourceType: 'provider_generated',
            contentType: 'metadata/json',
            path: input.source.path,
            contentSha256: input.source.content_sha256,
            width: input.source.width,
            height: input.source.height
          }
        })
  } satisfies ArtProviderLiveDryRunResult;

  return ArtProviderLiveDryRunResultSchema.parse(result);
}

function buildLiveDryRunProviderSource(input: {
  providerId: string;
  intent: AssetIntent;
  evidence: ArtProviderLivePreflightEvidence | undefined;
}): ArtSourceManifestRecord {
  const width = input.intent.dimensions?.width ?? input.intent.dimensions?.frameWidth ?? 64;
  const height = input.intent.dimensions?.height ?? input.intent.dimensions?.frameHeight ?? 64;
  const providerRequestId = providerRequestIdFor(input.providerId, input.intent, input.evidence);
  const sourcePath = `provider_dry_run/${toSlug(input.intent.assetPlanId)}.metadata.json`;
  const payload = {
    providerId: input.providerId,
    providerRequestId,
    assetIntentId: input.intent.id,
    assetPlanId: input.intent.assetPlanId,
    role: input.intent.role,
    subject: input.intent.subject,
    style: input.intent.style,
    intentHash: input.intent.cacheKey.intentHash,
    evidenceSummaryCode: input.evidence?.summaryCode ?? 'missing',
    width,
    height
  };
  const contentSha256 = sha256(stableStringify(payload));

  return {
    source_id: `live_dry_run_${toSlug(input.intent.id)}`,
    asset_id: input.intent.assetPlanId,
    asset_intent_id: input.intent.id,
    source_type: 'provider_generated',
    locked: false,
    provider_may_replace: true,
    path: sourcePath,
    content_type: 'metadata/json',
    width,
    height,
    intended_use: toSlug(input.intent.role),
    style_tags: uniqueTags(['live_dry_run', toSlug(input.intent.style)]),
    content_sha256: contentSha256,
    review_status: 'review_required',
    provenance: [`${input.providerId}:${providerRequestId}`],
    metadata: buildProviderMetadata(input.intent, input.providerId, providerRequestId, sourcePath, width, height)
  };
}

function buildProviderMetadata(
  intent: AssetIntent,
  providerId: string,
  providerRequestId: string,
  sourcePath: string,
  width: number,
  height: number
): ArtAssetMetadata {
  const roleProfile = metadataRoleProfile(intent.role);
  return {
    asset_id: metadataAssetId(intent.assetPlanId),
    project_code: 'proj_loop10',
    asset_type: roleProfile.assetType,
    asset_subtype: roleProfile.assetSubtype,
    title: titleFor(intent.subject),
    description: `Live provider dry-run metadata for ${intent.subject}.`,
    version: '1.0.0',
    status: 'generated',
    semantic: {
      world: 'loop10_test_world',
      subject: uniqueTags([toSlug(intent.subject), toSlug(intent.assetPlanId)]),
      semantic_tags: uniqueTags([toSlug(intent.subject), toSlug(intent.role), toSlug(intent.assetPlanId), 'live_dry_run']),
      visual_style: ['stylized'],
      mood: roleProfile.mood
    },
    gameplay: {
      gameplay_role: roleProfile.gameplayRole,
      affordances: roleProfile.affordances,
      allowed_contexts: ['loop10_test_world'],
      blocked_contexts: []
    },
    technical: {
      source_path: sourcePath,
      thumbnail_path: sourcePath,
      file_format: 'json',
      engine_targets: ['web'],
      texture_resolution: `${width}x${height}`,
      polycount_lod0: 0,
      platform_budget: ['desktop', 'mobile']
    },
    ai_generation: {
      generated_by_ai: true,
      ai_system_used: providerId,
      ai_system_version: 'dry-run-v0.1',
      prompt_summary: `sanitized live dry-run metadata for ${intent.subject}`,
      negative_prompt_summary: null,
      seed: providerRequestId,
      human_edit_level: 'ai_generated'
    },
    rights: {
      creator: providerId,
      owner: 'loop10_test',
      license: 'internal_project_only',
      commercial_use: false,
      training_use_allowed: false,
      third_party_sources: [],
      rights_risk_level: 'low'
    },
    workflow: {
      owner: 'loop10_test',
      reviewed_by: null,
      review_notes: 'Dry-run metadata only; not real live provider output and not approved art.',
      updated_at: '2026-07-05',
      approved_at: null
    },
    relations: {
      derived_from: [],
      depends_on: [],
      compatible_with: [],
      used_by: ['loop10_test']
    },
    search: {
      embedding_input: `live dry run ${intent.role} ${intent.subject}`
    }
  };
}

function metadataRoleProfile(role: AssetIntent['role']): {
  assetType: ArtAssetMetadata['asset_type'];
  assetSubtype: string;
  gameplayRole: ArtAssetMetadata['gameplay']['gameplay_role'];
  affordances: ArtAssetMetadata['gameplay']['affordances'];
  mood: NonNullable<ArtAssetMetadata['semantic']['mood']>;
} {
  if (role === 'player_sprite') {
    return {
      assetType: 'character',
      assetSubtype: 'sprite',
      gameplayRole: ['player_character'],
      affordances: ['animated'],
      mood: ['heroic']
    };
  }
  if (role === 'enemy_sprite') {
    return {
      assetType: 'creature',
      assetSubtype: 'sprite',
      gameplayRole: ['enemy'],
      affordances: ['animated'],
      mood: ['dangerous']
    };
  }
  if (role === 'projectile_sprite') {
    return {
      assetType: 'weapon',
      assetSubtype: 'projectile',
      gameplayRole: ['projectile'],
      affordances: ['physics_object'],
      mood: ['dangerous']
    };
  }
  if (role === 'background_layer' || role === 'terrain_tileset') {
    return {
      assetType: 'environment',
      assetSubtype: role === 'terrain_tileset' ? 'tileset' : 'background',
      gameplayRole: ['environment'],
      affordances: ['ambient'],
      mood: ['warm']
    };
  }
  if (role === 'ui_element') {
    return {
      assetType: 'ui',
      assetSubtype: 'icon',
      gameplayRole: ['ui', 'icon'],
      affordances: ['inventory_action'],
      mood: ['friendly']
    };
  }
  return {
    assetType: 'prop',
    assetSubtype: 'collectible',
    gameplayRole: role === 'goal_sprite' ? ['collectible'] : ['decoration'],
    affordances: role === 'goal_sprite' ? ['collectible'] : ['decorative'],
    mood: ['warm']
  };
}

function providerRequestIdFor(providerId: string, intent: AssetIntent, evidence: ArtProviderLivePreflightEvidence | undefined): string {
  const payload = {
    providerId,
    assetIntentId: intent.id,
    assetPlanId: intent.assetPlanId,
    intentHash: intent.cacheKey.intentHash,
    evidence: evidenceSummary(evidence)
  };
  return `live_dry_run_${toSlug(intent.id)}_${sha256(stableStringify(payload)).slice(0, 16)}`;
}

function evidenceSummary(evidence: ArtProviderLivePreflightEvidence | undefined): unknown {
  if (evidence === undefined) {
    return { summaryCode: 'live_preflight_missing' };
  }
  return {
    contractVersion: evidence.contractVersion,
    readinessStatus: evidence.readinessStatus,
    summaryCode: evidence.summaryCode,
    blockerCodes: sortedUnique(evidence.blockerCodes),
    invalidFieldNames: sortedUnique(evidence.invalidFieldNames),
    liveRequested: evidence.liveRequested,
    liveAllowed: evidence.liveAllowed,
    executionEnabled: evidence.executionEnabled,
    networkPermission: evidence.networkPermission,
    costAcknowledged: evidence.costAcknowledged,
    artifactWriteApproved: evidence.artifactWriteApproved,
    credentialEvidence: evidence.credentialEvidence
  };
}

function metadataAssetId(assetPlanId: string): string {
  return `asset_${toSlug(assetPlanId)}_001`;
}

function titleFor(value: string): string {
  return toSlug(value)
    .split('_')
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join(' ');
}

function uniqueTags(values: string[]): string[] {
  return [...new Set(values.map(toSlug).filter((value) => value.length > 0))].slice(0, 12);
}

function sortedUnique<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function toSlug(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/_+/g, '_');
  return slug.length < 2 ? 'asset' : slug.slice(0, 63);
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
