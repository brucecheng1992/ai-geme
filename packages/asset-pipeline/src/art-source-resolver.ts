import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { z } from 'zod';

import { ArtAssetMetadataSchema, type ArtAssetMetadata } from './art-asset-metadata.schema.js';
import { AssetIntentManifestSchema, type AssetIntent } from './asset-intent-manifest.js';
import type { ArtProvider } from './fake-art-provider.js';
import {
  ART_SOURCE_PRIORITY,
  ART_SOURCE_MANIFEST_VERSION,
  ArtSourceManifestRecordSchema,
  ArtSourceManifestSchema,
  ArtSourceTypeSchema,
  type ArtSourceManifest,
  type ArtSourceManifestRecord,
  type ArtSourceType
} from './art-source-manifest.js';
import { AssetPlanSchema, type AssetPlan, type AssetPlanItem } from './schemas.js';

export const ART_SOURCE_RESOLUTION_REPORT_VERSION = 'art-source-resolution-report-v0.1' as const;

export const ArtSourceResolutionBlockerSchema = z.enum([
  'art_source_manifest_missing_for_manual_locked',
  'manual_locked_provider_overwrite_forbidden',
  'local_asset_path_missing',
  'local_asset_sha256_mismatch',
  'local_asset_metadata_malformed',
  'provider_output_malformed',
  'provider_generation_failed',
  'raw_provider_output_bypassed_normalization',
  'placeholder_art_not_explicit',
  'runtime_export_rejected_raw_provider_output',
  'source_resolved_metadata_missing'
]);

export type ArtSourceResolutionBlocker = z.infer<typeof ArtSourceResolutionBlockerSchema>;

export const ResolvedArtSourceAssetSchema = z.strictObject({
  assetId: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
  assetIntentId: z.string().regex(/^[a-z][a-z0-9_.-]{1,79}$/),
  selectedSourceType: ArtSourceTypeSchema,
  sourcePriority: z.number().int().min(1).max(5),
  sourceManifestId: z.string().regex(/^[a-z][a-z0-9_]{1,79}$/),
  normalizedMetadataRef: z.string().min(1).max(240),
  normalizedMetadata: ArtAssetMetadataSchema,
  providerId: z.string().min(1).max(120).optional(),
  contentSha256: z.string().regex(/^[a-f0-9]{64}$/),
  locked: z.boolean(),
  providerMayReplace: z.boolean(),
  placeholder: z.boolean(),
  fallback: z.boolean(),
  provenance: z.array(z.string().min(1).max(240)).min(1).max(24),
  blockers: z.array(ArtSourceResolutionBlockerSchema).max(12)
});

export const ArtSourceResolutionFailureSchema = z.strictObject({
  assetId: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
  assetIntentId: z.string().regex(/^[a-z][a-z0-9_.-]{1,79}$/),
  blockers: z.array(ArtSourceResolutionBlockerSchema).min(1)
});

export const ArtSourceResolutionReportSchema = z.strictObject({
  version: z.literal(ART_SOURCE_RESOLUTION_REPORT_VERSION),
  sourceManifestVersion: z.literal(ART_SOURCE_MANIFEST_VERSION),
  projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
  ok: z.boolean(),
  blockers: z.array(ArtSourceResolutionBlockerSchema),
  summary: z.strictObject({
    total: z.number().int().min(0),
    resolved: z.number().int().min(0),
    blocked: z.number().int().min(0),
    providerCalls: z.number().int().min(0),
    placeholderUsed: z.number().int().min(0),
    fallbackUsed: z.number().int().min(0)
  }),
  assets: z.array(ResolvedArtSourceAssetSchema),
  failures: z.array(ArtSourceResolutionFailureSchema)
});

export type ResolvedArtSourceAsset = z.infer<typeof ResolvedArtSourceAssetSchema>;
export type ArtSourceResolutionFailure = z.infer<typeof ArtSourceResolutionFailureSchema>;
export type ArtSourceResolutionReport = z.infer<typeof ArtSourceResolutionReportSchema>;

export type ResolveArtSourcesInput = {
  projectRoot?: string;
  plan: AssetPlan;
  intentManifest: unknown;
  sourceManifest?: unknown;
  checkedInDefaults?: readonly ArtSourceManifestRecord[];
  provider?: ArtProvider;
  allowExplicitPlaceholder?: boolean;
  requireManualLocked?: boolean;
};

type ResolveIntentInput = {
  projectRoot: string | undefined;
  intent: AssetIntent;
  planItem: AssetPlanItem | undefined;
  records: readonly ArtSourceManifestRecord[];
  provider: ArtProvider | undefined;
  allowExplicitPlaceholder: boolean;
};

type ResolveIntentResult =
  | { ok: true; asset: ResolvedArtSourceAsset; providerCalls: number }
  | { ok: false; failure: ArtSourceResolutionFailure; providerCalls: number };

type NormalizeRecordInput = {
  projectRoot: string | undefined;
  intent: AssetIntent;
  planItem: AssetPlanItem | undefined;
  record: ArtSourceManifestRecord;
  providerId: string | undefined;
  allowExplicitPlaceholder: boolean;
};

export async function resolveArtSources(input: ResolveArtSourcesInput): Promise<ArtSourceResolutionReport> {
  const planResult = AssetPlanSchema.safeParse(input.plan);
  const intentManifestResult = AssetIntentManifestSchema.safeParse(input.intentManifest);
  if (!planResult.success || !intentManifestResult.success) {
    return buildReport({
      projectId: input.plan.projectId,
      assets: [],
      failures: input.plan.items.map((item) => ({
        assetId: item.id,
        assetIntentId: item.id,
        blockers: ['source_resolved_metadata_missing']
      })),
      blockers: ['source_resolved_metadata_missing'],
      providerCalls: 0
    });
  }

  if (input.requireManualLocked === true && input.sourceManifest === undefined) {
    return buildReport({
      projectId: planResult.data.projectId,
      assets: [],
      failures: planResult.data.items.map((item) => ({
        assetId: item.id,
        assetIntentId: item.id,
        blockers: ['art_source_manifest_missing_for_manual_locked']
      })),
      blockers: ['art_source_manifest_missing_for_manual_locked'],
      providerCalls: 0
    });
  }

  const manifestResult = parseOptionalArtSourceManifest(input.sourceManifest);
  if (!manifestResult.ok) {
    return buildReport({
      projectId: planResult.data.projectId,
      assets: [],
      failures: planResult.data.items.map((item) => ({
        assetId: item.id,
        assetIntentId: item.id,
        blockers: [manifestResult.blocker]
      })),
      blockers: [manifestResult.blocker],
      providerCalls: 0
    });
  }

  const checkedInDefaults = parseCheckedInDefaults(input.checkedInDefaults ?? []);
  if (!checkedInDefaults.ok) {
    return buildReport({
      projectId: planResult.data.projectId,
      assets: [],
      failures: planResult.data.items.map((item) => ({
        assetId: item.id,
        assetIntentId: item.id,
        blockers: ['local_asset_metadata_malformed']
      })),
      blockers: ['local_asset_metadata_malformed'],
      providerCalls: 0
    });
  }

  const records = [...manifestResult.records, ...checkedInDefaults.records];
  const planById = new Map(planResult.data.items.map((item) => [item.id, item]));
  const assets: ResolvedArtSourceAsset[] = [];
  const failures: ArtSourceResolutionFailure[] = [];
  let providerCalls = 0;

  for (const intent of intentManifestResult.data.intents) {
    const result = await resolveIntent({
      projectRoot: input.projectRoot,
      intent,
      planItem: planById.get(intent.assetPlanId),
      records,
      provider: input.provider,
      allowExplicitPlaceholder: input.allowExplicitPlaceholder === true
    });
    providerCalls += result.providerCalls;
    if (result.ok) {
      assets.push(result.asset);
    } else {
      failures.push(result.failure);
    }
  }

  return buildReport({
    projectId: planResult.data.projectId,
    assets,
    failures,
    blockers: uniqueBlockers(failures.flatMap((failure) => failure.blockers)),
    providerCalls
  });
}

async function resolveIntent(input: ResolveIntentInput): Promise<ResolveIntentResult> {
  const candidates = candidateRecordsForIntent(input.records, input.intent);
  const manifestCandidate = candidates[0];
  if (manifestCandidate !== undefined) {
    const normalized = await normalizeSelectedRecord({
      projectRoot: input.projectRoot,
      intent: input.intent,
      planItem: input.planItem,
      record: manifestCandidate,
      providerId: manifestCandidate.source_type === 'provider_generated' ? 'manifest_provider_generated' : undefined,
      allowExplicitPlaceholder: input.allowExplicitPlaceholder
    });
    if (normalized.ok) {
      return { ok: true, asset: normalized.asset, providerCalls: 0 };
    }
    return {
      ok: false,
      failure: {
        assetId: input.intent.assetPlanId,
        assetIntentId: input.intent.id,
        blockers: [normalized.blocker]
      },
      providerCalls: 0
    };
  }

  if (input.provider !== undefined) {
    const providerResult = await input.provider.generate(input.intent);
    if (!providerResult.ok) {
      return {
        ok: false,
        failure: {
          assetId: input.intent.assetPlanId,
          assetIntentId: input.intent.id,
          blockers: [providerResult.blocker]
        },
        providerCalls: 1
      };
    }

    const sourceResult = ArtSourceManifestRecordSchema.safeParse(providerResult.source);
    if (!sourceResult.success) {
      return providerMalformed(input.intent);
    }

    const normalized = await normalizeSelectedRecord({
      projectRoot: input.projectRoot,
      intent: input.intent,
      planItem: input.planItem,
      record: sourceResult.data,
      providerId: providerResult.providerId,
      allowExplicitPlaceholder: input.allowExplicitPlaceholder
    });
    if (!normalized.ok) {
      return {
        ok: false,
        failure: {
          assetId: input.intent.assetPlanId,
          assetIntentId: input.intent.id,
          blockers: [normalized.blocker === 'placeholder_art_not_explicit' ? normalized.blocker : 'provider_output_malformed']
        },
        providerCalls: 1
      };
    }
    return { ok: true, asset: normalized.asset, providerCalls: 1 };
  }

  return {
    ok: false,
    failure: {
      assetId: input.intent.assetPlanId,
      assetIntentId: input.intent.id,
      blockers: ['source_resolved_metadata_missing']
    },
    providerCalls: 0
  };
}

async function normalizeSelectedRecord(
  input: NormalizeRecordInput
): Promise<{ ok: true; asset: ResolvedArtSourceAsset } | { ok: false; blocker: ArtSourceResolutionBlocker }> {
  const record = input.record;
  if (record.asset_id !== input.intent.assetPlanId || record.asset_intent_id !== input.intent.id) {
    return { ok: false, blocker: metadataBlockerFor(record.source_type) };
  }

  if (isPlaceholderLike(record) && record.source_type !== 'explicit_placeholder') {
    return { ok: false, blocker: 'placeholder_art_not_explicit' };
  }

  if (record.source_type === 'explicit_placeholder' && !input.allowExplicitPlaceholder) {
    return { ok: false, blocker: 'placeholder_art_not_explicit' };
  }

  if (requiresLocalFileValidation(record.source_type)) {
    const fileResult = await validateLocalFile(input.projectRoot, record);
    if (!fileResult.ok) {
      return { ok: false, blocker: fileResult.blocker };
    }
  }

  const metadataResult = normalizeMetadata(record);
  if (!metadataResult.ok) {
    return { ok: false, blocker: metadataBlockerFor(record.source_type) };
  }

  const metadata = metadataResult.metadata;
  if (metadata.technical.source_path !== record.path || metadata.technical.thumbnail_path !== record.path) {
    return { ok: false, blocker: metadataBlockerFor(record.source_type) };
  }

  if (metadata.asset_id !== metadataAssetId(record.asset_id)) {
    return { ok: false, blocker: metadataBlockerFor(record.source_type) };
  }

  if (record.source_type === 'provider_generated' && metadata.ai_generation.generated_by_ai !== true) {
    return { ok: false, blocker: 'provider_output_malformed' };
  }

  const asset = ResolvedArtSourceAssetSchema.parse({
    assetId: record.asset_id,
    assetIntentId: record.asset_intent_id,
    selectedSourceType: record.source_type,
    sourcePriority: ART_SOURCE_PRIORITY[record.source_type],
    sourceManifestId: record.source_id,
    normalizedMetadataRef: `metadata/${metadata.asset_id}.asset.json`,
    normalizedMetadata: metadata,
    providerId: input.providerId,
    contentSha256: record.content_sha256,
    locked: record.locked,
    providerMayReplace: record.provider_may_replace,
    placeholder: record.source_type === 'explicit_placeholder',
    fallback: record.source_type === 'explicit_placeholder',
    provenance: record.provenance,
    blockers: []
  });

  return { ok: true, asset };
}

async function validateLocalFile(
  projectRoot: string | undefined,
  record: ArtSourceManifestRecord
): Promise<{ ok: true } | { ok: false; blocker: 'local_asset_path_missing' | 'local_asset_sha256_mismatch' }> {
  if (projectRoot === undefined) {
    return { ok: false, blocker: 'local_asset_path_missing' };
  }

  try {
    const content = await readFile(join(projectRoot, record.path));
    if (sha256(content) !== record.content_sha256) {
      return { ok: false, blocker: 'local_asset_sha256_mismatch' };
    }
    return { ok: true };
  } catch {
    return { ok: false, blocker: 'local_asset_path_missing' };
  }
}

function normalizeMetadata(
  record: ArtSourceManifestRecord
): { ok: true; metadata: ArtAssetMetadata } | { ok: false } {
  if (record.metadata === undefined) {
    return { ok: false };
  }

  const parsed = ArtAssetMetadataSchema.safeParse(record.metadata);
  if (!parsed.success) {
    return { ok: false };
  }
  return { ok: true, metadata: parsed.data };
}

function candidateRecordsForIntent(records: readonly ArtSourceManifestRecord[], intent: AssetIntent): ArtSourceManifestRecord[] {
  return records
    .filter((record) => record.asset_id === intent.assetPlanId || record.asset_intent_id === intent.id)
    .sort((left, right) => ART_SOURCE_PRIORITY[left.source_type] - ART_SOURCE_PRIORITY[right.source_type] || left.source_id.localeCompare(right.source_id));
}

function parseOptionalArtSourceManifest(input: unknown):
  | { ok: true; records: ArtSourceManifest['records'] }
  | { ok: false; blocker: ArtSourceResolutionBlocker } {
  if (input === undefined) {
    return { ok: true, records: [] };
  }

  if (hasManualLockedProviderOverwrite(input)) {
    return { ok: false, blocker: 'manual_locked_provider_overwrite_forbidden' };
  }

  const parsed = ArtSourceManifestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, blocker: 'local_asset_metadata_malformed' };
  }

  return { ok: true, records: parsed.data.records };
}

function parseCheckedInDefaults(
  records: readonly ArtSourceManifestRecord[]
): { ok: true; records: ArtSourceManifestRecord[] } | { ok: false } {
  const parsedRecords: ArtSourceManifestRecord[] = [];
  for (const record of records) {
    const parsed = ArtSourceManifestRecordSchema.safeParse(record);
    if (!parsed.success) {
      return { ok: false };
    }
    parsedRecords.push(parsed.data);
  }
  return { ok: true, records: parsedRecords };
}

function providerMalformed(intent: AssetIntent): ResolveIntentResult {
  return {
    ok: false,
    failure: {
      assetId: intent.assetPlanId,
      assetIntentId: intent.id,
      blockers: ['provider_output_malformed']
    },
    providerCalls: 1
  };
}

function buildReport(input: {
  projectId: string;
  assets: ResolvedArtSourceAsset[];
  failures: ArtSourceResolutionFailure[];
  blockers: ArtSourceResolutionBlocker[];
  providerCalls: number;
}): ArtSourceResolutionReport {
  const blockers = uniqueBlockers(input.blockers);
  return ArtSourceResolutionReportSchema.parse({
    version: ART_SOURCE_RESOLUTION_REPORT_VERSION,
    sourceManifestVersion: ART_SOURCE_MANIFEST_VERSION,
    projectId: input.projectId,
    ok: blockers.length === 0,
    blockers,
    summary: {
      total: input.assets.length + input.failures.length,
      resolved: input.assets.length,
      blocked: input.failures.length,
      providerCalls: input.providerCalls,
      placeholderUsed: input.assets.filter((asset) => asset.placeholder).length,
      fallbackUsed: input.assets.filter((asset) => asset.fallback).length
    },
    assets: input.assets,
    failures: input.failures
  });
}

function hasManualLockedProviderOverwrite(value: unknown): boolean {
  if (value === null || typeof value !== 'object' || !('records' in value)) {
    return false;
  }
  const records = (value as { records?: unknown }).records;
  if (!Array.isArray(records)) {
    return false;
  }
  return records.some(
    (record) =>
      record !== null &&
      typeof record === 'object' &&
      (record as Record<string, unknown>).source_type === 'manual_locked' &&
      (record as Record<string, unknown>).provider_may_replace === true
  );
}

function isPlaceholderLike(record: ArtSourceManifestRecord): boolean {
  return (
    record.source_type === 'explicit_placeholder' ||
    record.style_tags.includes('placeholder') ||
    record.style_tags.includes('fallback') ||
    record.provenance.some((entry) => entry.includes('placeholder') || entry.includes('fallback'))
  );
}

function requiresLocalFileValidation(sourceType: ArtSourceType): boolean {
  return sourceType === 'manual_locked' || sourceType === 'local_asset' || sourceType === 'checked_in_default';
}

function metadataBlockerFor(sourceType: ArtSourceType): ArtSourceResolutionBlocker {
  return sourceType === 'provider_generated' ? 'provider_output_malformed' : 'local_asset_metadata_malformed';
}

function metadataAssetId(assetId: string): string {
  return `asset_${toSlug(assetId)}_001`;
}

function toSlug(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/_+/g, '_');
  return slug.length < 2 ? 'asset' : slug.slice(0, 63);
}

function sha256(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function uniqueBlockers(blockers: readonly ArtSourceResolutionBlocker[]): ArtSourceResolutionBlocker[] {
  return [...new Set(blockers)];
}
