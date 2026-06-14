import { isAbsolute } from 'node:path';

import { z } from 'zod';

import { AssetRoleSchema, SemanticTagSchema } from './schemas.js';

const PackAssetSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/),
  role: AssetRoleSchema,
  file: z.string().min(1).refine(isSafePackAssetFile, {
    message: 'asset file must be a relative .svg path inside the local pack'
  }),
  format: z.literal('svg'),
  semantic: z
    .strictObject({
      subjectTags: z.array(SemanticTagSchema).min(1).max(16),
      themeTags: z.array(SemanticTagSchema).max(16).default([]),
      forbiddenTags: z.array(SemanticTagSchema).max(16).default([])
    })
    .optional(),
  license: z
    .strictObject({
      id: z.string().min(1).max(40),
      name: z.string().min(1).max(120),
      attribution: z.string().min(1).max(160),
      sourceUrl: z.string().url()
    })
    .optional()
});

const RoleCoverageSchema = z.strictObject({
  player_character: z.array(SemanticTagSchema).min(1).max(16).optional(),
  enemy: z.array(SemanticTagSchema).min(1).max(16).optional(),
  projectile: z.array(SemanticTagSchema).min(1).max(16).optional(),
  collectible: z.array(SemanticTagSchema).min(1).max(16).optional(),
  hazard: z.array(SemanticTagSchema).min(1).max(16).optional(),
  background: z.array(SemanticTagSchema).min(1).max(16).optional(),
  ui_panel: z.array(SemanticTagSchema).min(1).max(16).optional(),
  tileset: z.array(SemanticTagSchema).min(1).max(16).optional(),
  pickup: z.array(SemanticTagSchema).min(1).max(16).optional()
});

export const AssetPackProfileSchema = z.strictObject({
  version: z.literal('asset-pack-profile-v0.1'),
  packId: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
  displayName: z.string().min(1).max(120).optional(),
  taxonomyVersion: z.string().min(1).max(40),
  priority: z.number().int().min(0).max(1000).optional(),
  primaryGenre: z.array(SemanticTagSchema).max(8).optional(),
  primaryTheme: z.array(SemanticTagSchema).max(12).optional(),
  styleTags: z.array(SemanticTagSchema).max(16).optional(),
  camera: z.array(z.enum(['top_down', 'side_view'])).max(4).optional(),
  subjectCoverageByRole: RoleCoverageSchema.optional(),
  incompatibleConcepts: z.array(SemanticTagSchema).max(24).optional(),
  notes: z.string().min(1).max(240).optional()
});

export const LocalAssetPackSchema = z
  .strictObject({
    version: z.literal('local-asset-pack-v0.1'),
    id: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
    label: z.string().min(1).max(120),
    priority: z.number().int().min(0).max(1000).optional(),
    profile: AssetPackProfileSchema.optional(),
    license: z.strictObject({
      id: z.string().min(1).max(40),
      name: z.string().min(1).max(120),
      attribution: z.string().min(1).max(160),
      sourceUrl: z.string().url()
    }),
    style: z.strictObject({
      genres: z.array(z.enum(['collector', 'dodger', 'shooter', 'side_scrolling_run_and_gun'])).min(1),
      camera: z.enum(['top_down', 'side_view']),
      tags: z.array(z.string().min(1).max(40)).min(1)
    }),
    assets: z.array(PackAssetSchema).min(1)
  })
  .superRefine((pack, ctx) => {
    addDuplicateAssetIdIssues(pack, ctx);

    if (pack.profile === undefined) {
      return;
    }

    if (pack.profile.packId !== pack.id) {
      ctx.addIssue({
        code: 'custom',
        path: ['profile', 'packId'],
        message: 'profile.packId must match local asset pack id'
      });
    }

    if (pack.profile.priority !== undefined && pack.priority !== undefined && pack.profile.priority !== pack.priority) {
      ctx.addIssue({
        code: 'custom',
        path: ['profile', 'priority'],
        message: 'profile.priority must match local asset pack priority'
      });
    }

    addProfileCoverageIssues(pack, ctx);
  });

export type AssetPackProfile = z.infer<typeof AssetPackProfileSchema>;
export type LocalAssetPack = z.infer<typeof LocalAssetPackSchema>;
export type LocalPackAssetSemanticMetadata = NonNullable<LocalAssetPack['assets'][number]['semantic']>;

export type LocalAssetPackMetadataIndex = {
  packId: string;
  profile?: AssetPackProfile;
  assetsById: Map<string, LocalAssetPack['assets'][number]>;
  semanticByAssetId: Map<string, LocalPackAssetSemanticMetadata>;
};

/** Indexes optional pack semantic metadata for later resolver gates without changing selection behavior. */
export function indexLocalAssetPackMetadata(pack: LocalAssetPack): LocalAssetPackMetadataIndex {
  const assetsById = new Map<string, LocalAssetPack['assets'][number]>();
  const semanticByAssetId = new Map<string, LocalPackAssetSemanticMetadata>();

  for (const asset of pack.assets) {
    assetsById.set(asset.id, asset);
    if (asset.semantic !== undefined) {
      semanticByAssetId.set(asset.id, asset.semantic);
    }
  }

  return {
    packId: pack.id,
    profile: pack.profile,
    assetsById,
    semanticByAssetId
  };
}

function addDuplicateAssetIdIssues(pack: LocalAssetPack, ctx: z.RefinementCtx): void {
  const seen = new Set<string>();

  for (const [index, asset] of pack.assets.entries()) {
    if (seen.has(asset.id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['assets', index, 'id'],
        message: `duplicate local asset pack asset id: ${asset.id}`
      });
    }

    seen.add(asset.id);
  }
}

function addProfileCoverageIssues(pack: LocalAssetPack, ctx: z.RefinementCtx): void {
  const coverage = pack.profile?.subjectCoverageByRole;
  if (coverage === undefined) {
    return;
  }

  for (const role of AssetRoleSchema.options) {
    const profileTags = coverage[role];
    if (profileTags === undefined) {
      continue;
    }

    const assetsForRole = pack.assets.filter((asset) => asset.role === role);
    const coveredByAssets = new Set(assetsForRole.flatMap((asset) => asset.semantic?.subjectTags ?? []));
    const overclaimedTags = profileTags.filter((tag) => !coveredByAssets.has(tag));
    if (overclaimedTags.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['profile', 'subjectCoverageByRole', role],
        message: `profile subject coverage for ${role} is not backed by asset semantic tags: ${overclaimedTags.join(', ')}`
      });
    }

    for (const [assetIndex, asset] of pack.assets.entries()) {
      if (asset.role !== role || asset.semantic === undefined) {
        continue;
      }

      const missingFromProfile = asset.semantic.subjectTags.filter((tag) => !profileTags.includes(tag));
      if (missingFromProfile.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['assets', assetIndex, 'semantic', 'subjectTags'],
          message: `asset semantic tags for ${asset.id} are missing from profile subject coverage: ${missingFromProfile.join(', ')}`
        });
      }
    }
  }
}

function isSafePackAssetFile(value: string): boolean {
  if (isAbsolute(value) || value.includes('\\') || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return false;
  }

  if (!value.endsWith('.svg')) {
    return false;
  }

  return value.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}
