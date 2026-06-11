import { isAbsolute } from 'node:path';

import { z } from 'zod';

const AssetIdSchema = z.string().regex(/^[a-z][a-z0-9_]{1,39}$/);
const AssetRoleSchema = z.enum(['player_character', 'enemy', 'projectile', 'collectible', 'hazard', 'background', 'ui_panel']);
const AssetProviderSchema = z.enum(['local_asset_pack', 'template_svg', 'placeholder']);
const AssetLoadKeySchema = z.string().regex(/^agm\.[a-z][a-z0-9_]{1,39}$/);
const AssetSizeSchema = z.strictObject({
  w: z.number().int().min(1).max(1920),
  h: z.number().int().min(1).max(1080)
});

const SafeAssetPathSchema = z.string().min(1).refine(isSafeRelativeAssetPath, {
  message: 'asset path must be relative and must not contain .., URL schemes, or absolute path segments'
});

export const AssetPlanItemSchema = z.strictObject({
  id: AssetIdSchema,
  role: AssetRoleSchema,
  subject: z.string().min(1).max(120),
  view: z.enum(['top_down']).default('top_down'),
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
      camera: z.literal('top_down')
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
  format: z.literal('svg'),
  path: SafeAssetPathSchema,
  source: AssetProviderSchema,
  required: z.boolean(),
  status: z.enum(['ready', 'fallback_used', 'missing']),
  size: AssetSizeSchema
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
  });

export type AssetPlan = z.infer<typeof AssetPlanSchema>;
export type AssetPlanItem = z.infer<typeof AssetPlanItemSchema>;
export type AssetManifest = z.infer<typeof AssetManifestSchema>;
export type AssetManifestAsset = z.infer<typeof AssetManifestAssetSchema>;

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
  items: ReadonlyArray<{ id: string; path?: string; loadKey?: string }>,
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

      if (item.path !== `assets/${item.id}.svg`) {
        ctx.addIssue({
          code: 'custom',
          path: [pathPrefix, index, 'path'],
          message: `asset path must match assets/${item.id}.svg`
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

  return /^assets\/[a-z][a-z0-9_]{1,39}\.svg$/.test(value);
}
