import { isAbsolute } from 'node:path';

import { z } from 'zod';

import {
  ArtAssetAffordanceSchema,
  ArtAssetFileFormatSchema,
  ArtAssetGameplayRoleSchema,
  ArtAssetHumanEditLevelSchema,
  ArtAssetLicenseTypeSchema,
  ArtAssetMoodSchema,
  ArtAssetRightsRiskLevelSchema,
  ArtAssetTypeSchema,
  ArtAssetVisualStyleSchema,
  ArtAssetWorkflowStatusSchema
} from './art-asset-metadata.vocabulary.js';

const AssetMetadataIdSchema = z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)+_[0-9]{3}$/);
const SlugSchema = z.string().regex(/^[a-z][a-z0-9_]{1,63}$/);
const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const SafeProjectRelativePathSchema = z.string().min(1).max(240).refine(isSafeProjectRelativePath, {
  message: 'path must be project-relative and must not contain .., URL schemes, or absolute path segments'
});

export const ArtAssetMetadataSchema = z.strictObject({
  asset_id: AssetMetadataIdSchema,
  project_code: SlugSchema.optional(),
  asset_type: ArtAssetTypeSchema,
  asset_subtype: SlugSchema,
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(500),
  version: z.string().min(1).max(40),
  status: ArtAssetWorkflowStatusSchema,
  semantic: z.strictObject({
    world: SlugSchema,
    genre: z.array(SlugSchema).max(8).optional(),
    subject: z.array(SlugSchema).max(12).optional(),
    semantic_tags: z.array(SlugSchema).min(1).max(32),
    visual_style: z.array(ArtAssetVisualStyleSchema).min(1).max(8),
    mood: z.array(ArtAssetMoodSchema).max(8).optional(),
    color_palette: z.array(SlugSchema).max(12).optional(),
    dominant_colors: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(12).optional()
  }),
  gameplay: z.strictObject({
    gameplay_role: z.array(ArtAssetGameplayRoleSchema).min(1).max(12),
    affordances: z.array(ArtAssetAffordanceSchema).min(1).max(20),
    biome: z.array(SlugSchema).max(12).optional(),
    faction: SlugSchema.nullable().optional(),
    rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']).optional(),
    spawnable: z.boolean().optional(),
    allowed_contexts: z.array(SlugSchema).min(1).max(32),
    blocked_contexts: z.array(SlugSchema).max(32),
    interaction_type: z.array(SlugSchema).max(12).optional()
  }),
  technical: z.strictObject({
    source_path: SafeProjectRelativePathSchema,
    thumbnail_path: SafeProjectRelativePathSchema,
    file_format: ArtAssetFileFormatSchema,
    engine_targets: z.array(SlugSchema).max(8).optional(),
    polycount_lod0: z.number().int().min(0).nullable().optional(),
    texture_resolution: z.string().min(1).max(40).nullable().optional(),
    platform_budget: z.array(SlugSchema).max(8).optional()
  }),
  ai_generation: z.strictObject({
    generated_by_ai: z.boolean(),
    ai_system_used: z.string().min(1).max(80).nullable().optional(),
    ai_system_version: z.string().min(1).max(80).nullable().optional(),
    prompt_summary: z.string().min(1).max(500).nullable().optional(),
    negative_prompt_summary: z.string().min(1).max(500).nullable().optional(),
    seed: z.string().min(1).max(80).nullable().optional(),
    human_edit_level: ArtAssetHumanEditLevelSchema.optional()
  }),
  rights: z.strictObject({
    creator: z.string().min(1).max(120),
    owner: z.string().min(1).max(120).optional(),
    license: ArtAssetLicenseTypeSchema,
    commercial_use: z.boolean(),
    training_use_allowed: z.boolean(),
    third_party_sources: z.array(z.string().min(1).max(160)).max(24).default([]),
    rights_risk_level: ArtAssetRightsRiskLevelSchema
  }),
  workflow: z.strictObject({
    owner: z.string().min(1).max(120),
    reviewed_by: z.string().min(1).max(120).nullable().optional(),
    review_notes: z.string().min(1).max(500).nullable().optional(),
    created_at: DateStringSchema.optional(),
    updated_at: DateStringSchema,
    approved_at: DateStringSchema.nullable().optional()
  }),
  relations: z
    .strictObject({
      variant_of: AssetMetadataIdSchema.nullable().optional(),
      derived_from: z.array(AssetMetadataIdSchema).max(24).default([]),
      depends_on: z.array(AssetMetadataIdSchema).max(24).default([]),
      compatible_with: z.array(AssetMetadataIdSchema).max(24).default([]),
      used_by: z.array(SlugSchema).max(24).default([])
    })
    .optional(),
  search: z
    .strictObject({
      embedding_input: z.string().min(1).max(1000).optional()
    })
    .optional()
});

export type ArtAssetMetadata = z.infer<typeof ArtAssetMetadataSchema>;

/** Parses complete sidecar metadata before an art asset can enter the asset library. */
export function parseArtAssetMetadata(input: unknown): ArtAssetMetadata {
  return ArtAssetMetadataSchema.parse(input);
}

function isSafeProjectRelativePath(value: string): boolean {
  if (isAbsolute(value) || value.includes('\\') || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return false;
  }

  return value.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}
