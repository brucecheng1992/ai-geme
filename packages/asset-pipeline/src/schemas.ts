import { isAbsolute } from 'node:path';

import { z } from 'zod';

import { ArtSourceTypeSchema } from './art-source-manifest.js';

const AssetIdSchema = z.string().regex(/^[a-z][a-z0-9_]{1,39}$/);
export const AssetRoleSchema = z.enum([
  'player_character',
  'enemy',
  'projectile',
  'collectible',
  'hazard',
  'background',
  'ui_panel',
  'tileset',
  'pickup'
]);
const AssetProviderSchema = z.enum(['local_asset_pack', 'runtime_asset', 'template_svg', 'placeholder']);
const RuntimeAssetFormatSchema = z.enum(['svg', 'png']);
const AssetLoadKeySchema = z.string().regex(/^agm\.[a-z][a-z0-9_]{1,39}$/);
export const SemanticTagSchema = z.string().regex(/^[a-z][a-z0-9_]{1,39}$/);
const AssetSizeSchema = z.strictObject({ w: z.number().int().min(1).max(1920), h: z.number().int().min(1).max(1080) });
const AssetRenderTransformSchema = z.strictObject({
  rotationDegrees: z.number().int().min(0).max(359)
});
const AssetIntentIdSchema = z.string().regex(/^[a-z][a-z0-9_.-]{1,79}$/);
const ArtSourceManifestIdSchema = z.string().regex(/^[a-z][a-z0-9_]{1,79}$/);
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const SafeMetadataRefSchema = z.string().min(1).max(240).refine(isSafeProjectRelativePath, {
  message: 'metadata ref must be project-relative and must not contain .., URL schemes, or absolute path segments'
});
export const AssetCatalogRefSchema = z.strictObject({
  catalogVersion: z.literal('template_asset_catalog.v1'),
  catalogAssetId: z.string().regex(/^[a-z][a-z0-9-]*(?::[A-Za-z0-9_.-]+)+$/),
  source: z.literal('local-template')
});
const SafeAssetPathSchema = z.string().min(1).refine(isSafeRelativeAssetPath, {
  message: 'asset path must be relative and must not contain .., URL schemes, or absolute path segments'
});

export const AssetSemanticConstraintSchema = z.strictObject({
  expectedConcept: SemanticTagSchema,
  expectedAnyTags: z.array(SemanticTagSchema).min(1).max(12),
  forbiddenTags: z.array(SemanticTagSchema).max(16).default([]),
  strictness: z.enum(['hard', 'medium', 'soft'])
});

export const AssetSemanticFitStatusSchema = z.enum(['exact', 'compatible', 'fallback_generated', 'not_applicable', 'unknown', 'mismatch']);
export const AssetSemanticFitSchema = z.strictObject({
  status: AssetSemanticFitStatusSchema,
  confidence: z.number().min(0).max(1),
  strictness: z.enum(['hard', 'medium', 'soft']).optional(),
  expectedConcept: SemanticTagSchema.optional(),
  expectedAnyTags: z.array(SemanticTagSchema).max(12).optional(),
  actualTags: z.array(SemanticTagSchema).max(32).optional(),
  missingTags: z.array(SemanticTagSchema).max(12).optional(),
  conflictingTags: z.array(SemanticTagSchema).max(32).optional(),
  reason: z.string().min(1).max(240).optional()
});

export const AssetManifestArtSourceSchema = z.strictObject({
  type: ArtSourceTypeSchema,
  assetIntentId: AssetIntentIdSchema,
  sourceManifestId: ArtSourceManifestIdSchema.optional(),
  contentSha256: Sha256Schema.optional(),
  locked: z.boolean(),
  providerMayReplace: z.boolean(),
  normalizedMetadataRef: SafeMetadataRefSchema.optional(),
  provenance: z.array(z.string().min(1).max(240)).min(1).max(24)
});

export const AssetPlanItemSchema = z.strictObject({
  id: AssetIdSchema,
  role: AssetRoleSchema,
  subject: z.string().min(1).max(120),
  semantic: AssetSemanticConstraintSchema.optional(),
  view: z.enum(['top_down', 'side_view']).default('top_down'),
  size: AssetSizeSchema,
  format: z.literal('svg'),
  required: z.boolean(),
  provider_priority: z.array(AssetProviderSchema).min(1)
});

export const AssetPlanSchema = z
  .strictObject({
    version: z.literal('asset-plan-v0.1'),
    projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
    style: z.strictObject({
      visual_theme: z.string().min(1).max(80),
      camera: z.enum(['top_down', 'side_view'])
    }),
    items: z.array(AssetPlanItemSchema).min(1)
  })
  .superRefine((plan, ctx) => {
    addDuplicateIdIssues(plan.items, ctx);

    for (const [index, item] of plan.items.entries()) {
      if (item.required && !item.provider_priority.some((provider) => provider === 'template_svg' || provider === 'placeholder')) {
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'provider_priority'],
          message: 'required asset must include a deterministic fallback provider'
        });
      }
    }
  });

export const AssetManifestAssetSchema = z.strictObject({
  id: AssetIdSchema,
  loadKey: AssetLoadKeySchema,
  role: AssetRoleSchema,
  type: z.literal('image'),
  format: RuntimeAssetFormatSchema,
  path: SafeAssetPathSchema,
  source: AssetProviderSchema,
  sourcePack: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/).optional(),
  licenseId: z.string().min(1).max(40).optional(),
  licenseName: z.string().min(1).max(120).optional(),
  attribution: z.string().min(1).max(160).optional(),
  sourceUrl: z.string().url().optional(),
  runtimeAssetId: z.string().min(1).max(120).optional(),
  runtimeContext: z.string().min(1).max(80).optional(),
  catalogRef: AssetCatalogRefSchema.optional(),
  conversion: z
    .strictObject({
      status: z.enum(['not_required', 'thumbnail_copied', 'template_generated']),
      sourcePath: z.string().min(1).optional(),
      outputPath: SafeAssetPathSchema
    })
    .optional(),
  required: z.boolean(),
  status: z.enum(['ready', 'fallback_used', 'missing']),
  size: AssetSizeSchema,
  renderTransform: AssetRenderTransformSchema.optional(),
  semanticFit: AssetSemanticFitSchema.optional(),
  artSource: AssetManifestArtSourceSchema.optional()
});

export const AssetManifestSchema = z
  .strictObject({
    version: z.literal('asset-manifest-v0.1'),
    projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
    strict: z.literal(true),
    assets: z.array(AssetManifestAssetSchema).min(1),
    summary: z.strictObject({
      required: z.number().int().min(0),
      ready: z.number().int().min(0),
      fallback_used: z.number().int().min(0),
      missing: z.number().int().min(0),
      placeholder_used: z.number().int().min(0)
    })
  })
  .superRefine((manifest, ctx) => {
    addDuplicateIdIssues(manifest.assets, ctx, 'assets');

    const summary = summarizeManifestAssets(manifest.assets);
    for (const key of ['required', 'ready', 'fallback_used', 'missing', 'placeholder_used'] as const) {
      if (manifest.summary[key] !== summary[key]) {
        ctx.addIssue({
          code: 'custom',
          path: ['summary', key],
          message: `summary.${key} must match manifest assets`
        });
      }
    }

    for (const [index, asset] of manifest.assets.entries()) {
      if (asset.source === 'local_asset_pack') {
        for (const key of ['sourcePack', 'licenseId', 'licenseName', 'attribution', 'sourceUrl'] as const) {
          if (asset[key] === undefined) {
            ctx.addIssue({
              code: 'custom',
              path: ['assets', index, key],
              message: `${key} is required for local_asset_pack assets`
            });
          }
        }
      }
    }
  });

export type AssetPlan = z.infer<typeof AssetPlanSchema>;
export type AssetPlanItem = z.infer<typeof AssetPlanItemSchema>;
export type AssetSemanticConstraint = z.infer<typeof AssetSemanticConstraintSchema>;
export type AssetManifest = z.infer<typeof AssetManifestSchema>;
export type AssetManifestAsset = z.infer<typeof AssetManifestAssetSchema>;
export type AssetManifestArtSource = z.infer<typeof AssetManifestArtSourceSchema>;
export type AssetCatalogRef = z.infer<typeof AssetCatalogRefSchema>;
export type AssetSemanticFitStatus = z.infer<typeof AssetSemanticFitStatusSchema>; export type AssetSemanticFit = z.infer<typeof AssetSemanticFitSchema>;
export function summarizeManifestAssets(assets: AssetManifestAsset[]): AssetManifest['summary'] {
  return {
    required: assets.filter((asset) => asset.required).length,
    ready: assets.filter((asset) => asset.status === 'ready').length,
    fallback_used: assets.filter((asset) => asset.status === 'fallback_used').length,
    missing: assets.filter((asset) => asset.status === 'missing').length,
    placeholder_used: assets.filter((asset) => asset.source === 'placeholder').length
  };
}

function addDuplicateIdIssues(
  items: ReadonlyArray<{ id: string; path?: string; loadKey?: string; format?: string }>,
  ctx: z.RefinementCtx,
  pathPrefix: 'items' | 'assets' = 'items'
): void {
  const seen = new Set<string>();
  const seenPaths = new Set<string>();
  const seenLoadKeys = new Set<string>();

  for (const [index, item] of items.entries()) {
    if (seen.has(item.id)) {
      ctx.addIssue({
        code: 'custom',
        path: [pathPrefix, index, 'id'],
        message: `duplicate asset id: ${item.id}`
      });
    }
    seen.add(item.id);

    if (item.path !== undefined) {
      if (seenPaths.has(item.path)) {
        ctx.addIssue({
          code: 'custom',
          path: [pathPrefix, index, 'path'],
          message: `duplicate asset path: ${item.path}`
        });
      }

      const expectedPath = `assets/${item.id}.${item.format}`;
      if (item.path !== expectedPath) {
        ctx.addIssue({
          code: 'custom',
          path: [pathPrefix, index, 'path'],
          message: `asset path must match ${expectedPath}`
        });
      }

      seenPaths.add(item.path);
    }

    if (item.loadKey !== undefined) {
      if (seenLoadKeys.has(item.loadKey)) {
        ctx.addIssue({
          code: 'custom',
          path: [pathPrefix, index, 'loadKey'],
          message: `duplicate asset loadKey: ${item.loadKey}`
        });
      }

      if (item.loadKey !== `agm.${item.id}`) {
        ctx.addIssue({
          code: 'custom',
          path: [pathPrefix, index, 'loadKey'],
          message: `asset loadKey must match agm.${item.id}`
        });
      }

      seenLoadKeys.add(item.loadKey);
    }
  }
}

function isSafeRelativeAssetPath(value: string): boolean {
  if (isAbsolute(value) || value.includes('\\') || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return false;
  }

  if (!value.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..')) {
    return false;
  }

  return /^assets\/[a-z][a-z0-9_]{1,39}\.(svg|png)$/.test(value);
}

function isSafeProjectRelativePath(value: string): boolean {
  if (isAbsolute(value) || value.includes('\\') || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return false;
  }

  return value.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}
