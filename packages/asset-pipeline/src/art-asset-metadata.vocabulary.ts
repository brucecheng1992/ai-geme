import { z } from 'zod';

export const ART_ASSET_TYPES = [
  'concept_art',
  'character',
  'creature',
  'environment',
  'prop',
  'weapon',
  'vehicle',
  'ui',
  'icon',
  'vfx',
  'material',
  'texture',
  'animation',
  'rig',
  'prefab',
  'tile',
  'skybox',
  'reference'
] as const;

export const ART_ASSET_VISUAL_STYLES = [
  'realistic',
  'semi_realistic',
  'stylized',
  'anime',
  'pixel_art',
  'low_poly',
  'voxel',
  'hand_painted',
  'painterly',
  'comic',
  'toon',
  'dark_fantasy',
  'cozy_fantasy',
  'cyberpunk',
  'steampunk',
  'sci_fi'
] as const;

export const ART_ASSET_MOODS = [
  'friendly',
  'cute',
  'warm',
  'mysterious',
  'dangerous',
  'heroic',
  'sad',
  'ominous',
  'luxurious',
  'ancient',
  'magical',
  'industrial',
  'ruined',
  'peaceful',
  'chaotic'
] as const;

export const ART_ASSET_GAMEPLAY_ROLES = [
  'npc',
  'player_character',
  'vendor',
  'quest_giver',
  'enemy',
  'ally',
  'loot_container',
  'cover',
  'decoration',
  'environment',
  'ui',
  'icon',
  'material',
  'texture',
  'collectible',
  'projectile'
] as const;

export const ART_ASSET_AFFORDANCES = [
  'talkable',
  'trading',
  'idle_animation',
  'collectible',
  'equipable',
  'crafting_material',
  'destructible',
  'container',
  'cover',
  'climbable',
  'walkable',
  'interactable',
  'quest_item',
  'ambient',
  'decorative',
  'animated',
  'physics_object',
  'inventory_action',
  'texture_source',
  'material_source'
] as const;

export const ART_ASSET_WORKFLOW_STATUSES = [
  'idea',
  'generated',
  'selected',
  'in_paintover',
  'in_modeling',
  'in_texturing',
  'in_rigging',
  'in_animation',
  'in_engine',
  'needs_review',
  'approved',
  'deprecated',
  'rejected',
  'archived'
] as const;

export const ART_ASSET_LICENSE_TYPES = ['internal_project_only', 'cc0', 'cc_by', 'cc_by_sa', 'commercial', 'unknown'] as const;
export const ART_ASSET_HUMAN_EDIT_LEVELS = ['ai_generated', 'paintover_minor', 'paintover_major', 'human_made', 'unknown'] as const;
export const ART_ASSET_RIGHTS_RISK_LEVELS = ['low', 'medium', 'high', 'blocked', 'unknown'] as const;
export const ART_ASSET_FILE_FORMATS = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'fbx', 'glb', 'gltf', 'uasset', 'material', 'json'] as const;

export const ArtAssetTypeSchema = z.enum(ART_ASSET_TYPES);
export const ArtAssetVisualStyleSchema = z.enum(ART_ASSET_VISUAL_STYLES);
export const ArtAssetMoodSchema = z.enum(ART_ASSET_MOODS);
export const ArtAssetGameplayRoleSchema = z.enum(ART_ASSET_GAMEPLAY_ROLES);
export const ArtAssetAffordanceSchema = z.enum(ART_ASSET_AFFORDANCES);
export const ArtAssetWorkflowStatusSchema = z.enum(ART_ASSET_WORKFLOW_STATUSES);
export const ArtAssetLicenseTypeSchema = z.enum(ART_ASSET_LICENSE_TYPES);
export const ArtAssetHumanEditLevelSchema = z.enum(ART_ASSET_HUMAN_EDIT_LEVELS);
export const ArtAssetRightsRiskLevelSchema = z.enum(ART_ASSET_RIGHTS_RISK_LEVELS);
export const ArtAssetFileFormatSchema = z.enum(ART_ASSET_FILE_FORMATS);

export const ArtAssetControlledVocabularySchema = z
  .strictObject({
    version: z.literal('art-asset-controlled-vocabulary-v0.1'),
    asset_type: z.array(ArtAssetTypeSchema).min(1),
    visual_style: z.array(ArtAssetVisualStyleSchema).min(1),
    mood: z.array(ArtAssetMoodSchema).min(1),
    gameplay_role: z.array(ArtAssetGameplayRoleSchema).min(1),
    affordances: z.array(ArtAssetAffordanceSchema).min(1),
    workflow_status: z.array(ArtAssetWorkflowStatusSchema).min(1),
    license_type: z.array(ArtAssetLicenseTypeSchema).min(1),
    human_edit_level: z.array(ArtAssetHumanEditLevelSchema).min(1),
    rights_risk_level: z.array(ArtAssetRightsRiskLevelSchema).min(1),
    file_format: z.array(ArtAssetFileFormatSchema).min(1)
  })
  .superRefine((vocabulary, ctx) => {
    for (const [key, values] of Object.entries(vocabulary)) {
      if (!Array.isArray(values)) {
        continue;
      }
      const unique = new Set(values);
      if (unique.size !== values.length) {
        ctx.addIssue({ code: 'custom', path: [key], message: `${key} must not contain duplicate values` });
      }
    }
  });

export const ART_ASSET_CONTROLLED_VOCABULARY = {
  version: 'art-asset-controlled-vocabulary-v0.1',
  asset_type: [...ART_ASSET_TYPES],
  visual_style: [...ART_ASSET_VISUAL_STYLES],
  mood: [...ART_ASSET_MOODS],
  gameplay_role: [...ART_ASSET_GAMEPLAY_ROLES],
  affordances: [...ART_ASSET_AFFORDANCES],
  workflow_status: [...ART_ASSET_WORKFLOW_STATUSES],
  license_type: [...ART_ASSET_LICENSE_TYPES],
  human_edit_level: [...ART_ASSET_HUMAN_EDIT_LEVELS],
  rights_risk_level: [...ART_ASSET_RIGHTS_RISK_LEVELS],
  file_format: [...ART_ASSET_FILE_FORMATS]
};

export type ArtAssetControlledVocabulary = z.infer<typeof ArtAssetControlledVocabularySchema>;
