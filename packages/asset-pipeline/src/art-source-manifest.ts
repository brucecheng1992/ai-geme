import { isAbsolute } from 'node:path';

import { z } from 'zod';

import { ArtAssetMetadataSchema } from './art-asset-metadata.schema.js';

export const ART_SOURCE_MANIFEST_VERSION = 'art-source-manifest-v0.1' as const;

const SourceIdSchema = z.string().regex(/^[a-z][a-z0-9_]{1,79}$/);
const AssetIdSchema = z.string().regex(/^[a-z][a-z0-9_]{1,39}$/);
const AssetIntentIdSchema = z.string().regex(/^[a-z][a-z0-9_.-]{1,79}$/);
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const ArtSourceTagSchema = z.string().regex(/^[a-z][a-z0-9_]{1,63}$/);
const SafeProjectRelativePathSchema = z.string().min(1).max(240).refine(isSafeProjectRelativePath, {
  message: 'path must be project-relative and must not contain .., URL schemes, or absolute path segments'
});

export const ArtSourceTypeSchema = z.enum(['manual_locked', 'local_asset', 'provider_generated', 'checked_in_default', 'explicit_placeholder']);
export const ArtSourceContentTypeSchema = z.enum(['image/png', 'image/svg+xml', 'image/webp', 'metadata/json']);
export const ArtSourceReviewStatusSchema = z.enum(['approved', 'review_required', 'rejected']);

export const ART_SOURCE_PRIORITY = {
  manual_locked: 1,
  local_asset: 2,
  provider_generated: 3,
  checked_in_default: 4,
  explicit_placeholder: 5
} as const;

export const ArtSourceManifestRecordSchema = z
  .strictObject({
    source_id: SourceIdSchema,
    asset_id: AssetIdSchema,
    asset_intent_id: AssetIntentIdSchema,
    source_type: ArtSourceTypeSchema,
    locked: z.boolean(),
    provider_may_replace: z.boolean(),
    path: SafeProjectRelativePathSchema,
    content_type: ArtSourceContentTypeSchema,
    width: z.number().int().min(1).max(8192),
    height: z.number().int().min(1).max(8192),
    intended_use: ArtSourceTagSchema,
    style_tags: z.array(ArtSourceTagSchema).min(1).max(24),
    content_sha256: Sha256Schema,
    review_status: ArtSourceReviewStatusSchema,
    provenance: z.array(z.string().min(1).max(240)).min(1).max(24),
    metadata: ArtAssetMetadataSchema
  })
  .superRefine((record, ctx) => {
    if (record.source_type === 'manual_locked') {
      if (!record.locked) {
        ctx.addIssue({
          code: 'custom',
          path: ['locked'],
          message: 'manual_locked source records must set locked=true'
        });
      }
      if (record.provider_may_replace) {
        ctx.addIssue({
          code: 'custom',
          path: ['provider_may_replace'],
          message: 'manual_locked source records must set provider_may_replace=false'
        });
      }
    }

    if (record.source_type !== 'manual_locked' && record.locked) {
      ctx.addIssue({
        code: 'custom',
        path: ['locked'],
        message: 'only manual_locked source records may set locked=true'
      });
    }
  });

export const ArtSourceManifestSchema = z
  .strictObject({
    version: z.literal(ART_SOURCE_MANIFEST_VERSION),
    projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
    records: z.array(ArtSourceManifestRecordSchema).min(1)
  })
  .superRefine((manifest, ctx) => {
    const sourceIds = new Set<string>();
    for (const [index, record] of manifest.records.entries()) {
      if (sourceIds.has(record.source_id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['records', index, 'source_id'],
          message: `duplicate art source id: ${record.source_id}`
        });
      }
      sourceIds.add(record.source_id);
    }
  });

export type ArtSourceType = z.infer<typeof ArtSourceTypeSchema>;
export type ArtSourceContentType = z.infer<typeof ArtSourceContentTypeSchema>;
export type ArtSourceReviewStatus = z.infer<typeof ArtSourceReviewStatusSchema>;
export type ArtSourceManifestRecord = z.infer<typeof ArtSourceManifestRecordSchema>;
export type ArtSourceManifest = z.infer<typeof ArtSourceManifestSchema>;

export function isSafeArtSourceProjectRelativePath(value: string): boolean {
  return isSafeProjectRelativePath(value);
}

function isSafeProjectRelativePath(value: string): boolean {
  if (isAbsolute(value) || value.includes('\\') || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return false;
  }

  return value.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}
