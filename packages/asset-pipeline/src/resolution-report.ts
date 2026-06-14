import { z } from 'zod';

import type { LocalPackAssetSemanticMetadata } from './local-asset-pack.schema.js';
import { AssetResolutionRepairSectionSchema } from './asset-repair-report.schema.js';
import { AssetSemanticConstraintSchema, AssetSemanticFitSchema, SemanticTagSchema, type AssetManifest, type AssetManifestAsset, type AssetPlan, type AssetPlanItem, type AssetSemanticFit } from './schemas.js';

const AssetIdSchema = z.string().regex(/^[a-z][a-z0-9_]{1,39}$/);
const AssetProviderSchema = z.enum(['local_asset_pack', 'runtime_asset', 'template_svg', 'placeholder']);
const AssetResolutionSummaryProviderSchema = z.enum(['local_asset_pack', 'local_mixed_assets', 'template_svg', 'placeholder']);

export const AssetResolutionCandidateRejectionSchema = z.strictObject({
  assetId: AssetIdSchema,
  role: z.string().min(1),
  expectedConcept: SemanticTagSchema.optional(),
  expectedAnyTags: z.array(SemanticTagSchema).max(12).optional(),
  actualTags: z.array(SemanticTagSchema).max(32).default([]),
  missingTags: z.array(SemanticTagSchema).max(12).default([]),
  conflictingTags: z.array(SemanticTagSchema).max(32).default([]),
  reason: z.string().min(1).max(240)
});

export const AssetResolutionMissingAssetSchema = z.strictObject({
  assetId: AssetIdSchema,
  expectedRole: z.string().min(1),
  expectedFormat: z.literal('svg'),
  actualRole: z.string().min(1).optional(),
  actualFormat: z.string().min(1).optional(),
  reason: z.enum(['missing', 'role_mismatch', 'format_mismatch'])
});

export const AssetResolutionCandidateSchema = z.strictObject({
  packId: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/),
  status: z.enum(['selected', 'rejected', 'skipped']),
  reason: z.enum(['selected', 'style_mismatch', 'incomplete_pack', 'hard_semantic_mismatch']),
  message: z.string().min(1).max(240),
  expectedStyle: z.strictObject({ genre: z.string().min(1), camera: z.literal('top_down') }).optional(),
  actualStyle: z.strictObject({ genres: z.array(z.string().min(1)), camera: z.literal('top_down') }).optional(),
  missingAssets: z.array(AssetResolutionMissingAssetSchema).optional(),
  assetRejections: z.array(AssetResolutionCandidateRejectionSchema).optional()
});

export const AssetResolutionReportSchema = z.strictObject({
  version: z.literal('asset-resolution-report-v0.1'),
  projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
  summary: z.strictObject({
    selectedProvider: AssetResolutionSummaryProviderSchema,
    selectedPackId: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/).optional(),
    fallbackUsed: z.boolean(),
    fullFallbackUsed: z.boolean().optional(),
    perRoleFallbackUsed: z.boolean().optional(),
    reason: z.string().min(1).max(240)
  }),
  assets: z.array(
    z.strictObject({
      id: AssetIdSchema,
      role: z.string().min(1),
      selected: z.strictObject({
        source: AssetProviderSchema,
        sourcePack: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/).optional(),
        path: z.string().min(1),
        status: z.enum(['ready', 'fallback_used', 'missing'])
      }),
      expectedSemantic: AssetSemanticConstraintSchema.optional(),
      semanticFit: AssetSemanticFitSchema
    })
  ),
  selectedAssets: z
    .array(
      z.strictObject({
        id: AssetIdSchema,
        role: z.string().min(1),
        source: AssetProviderSchema,
        sourcePack: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/).optional(),
        path: z.string().min(1),
        status: z.enum(['ready', 'fallback_used', 'missing']),
        runtimeAssetId: z.string().min(1).max(120).optional(),
        runtimeContext: z.string().min(1).max(80).optional(),
        fallbackScope: z.enum(['none', 'full', 'per_role']).optional(),
        conversion: z
          .strictObject({
            status: z.enum(['not_required', 'thumbnail_copied', 'template_generated']),
            sourcePath: z.string().min(1).optional(),
            outputPath: z.string().min(1)
          })
          .optional(),
        renderTransform: z.strictObject({ rotationDegrees: z.number().int().min(0).max(359) }).optional(),
        expectedSemantic: AssetSemanticConstraintSchema.optional(),
        semanticFit: AssetSemanticFitSchema
      })
    )
    .optional(),
  candidates: z.array(AssetResolutionCandidateSchema),
  repair: AssetResolutionRepairSectionSchema.optional()
});
export type AssetResolutionCandidateRejection = z.infer<typeof AssetResolutionCandidateRejectionSchema>;
export type AssetResolutionMissingAsset = z.infer<typeof AssetResolutionMissingAssetSchema>;
export type AssetResolutionCandidate = z.infer<typeof AssetResolutionCandidateSchema>;
export type AssetResolutionRepairSection = z.infer<typeof AssetResolutionRepairSectionSchema>;
export type AssetResolutionReport = z.infer<typeof AssetResolutionReportSchema>;

export function buildTemplateSemanticFit(planItem: AssetPlanItem): AssetSemanticFit {
  const constraint = planItem.semantic;
  if (constraint === undefined) {
    return {
      status: 'not_applicable',
      confidence: 1,
      actualTags: ['template_svg'],
      reason: 'No semantic constraint was requested for this generated template asset.'
    };
  }

  return {
    status: 'fallback_generated',
    confidence: 1,
    strictness: constraint.strictness,
    expectedConcept: constraint.expectedConcept,
    expectedAnyTags: constraint.expectedAnyTags,
    actualTags: ['template_svg'],
    reason: `Generated deterministic template SVG fallback for expected ${constraint.expectedConcept}.`
  };
}

export function buildLocalAssetSemanticFit(planItem: AssetPlanItem, assetSemantic: LocalPackAssetSemanticMetadata | undefined): AssetSemanticFit {
  const constraint = planItem.semantic;
  if (constraint === undefined) {
    return {
      status: 'not_applicable',
      confidence: 1,
      actualTags: assetSemantic === undefined ? undefined : uniqueTags([...assetSemantic.subjectTags, ...assetSemantic.themeTags]),
      reason: 'No semantic constraint was requested for this local asset.'
    };
  }

  if (assetSemantic === undefined) {
    return {
      status: 'unknown',
      confidence: 0,
      strictness: constraint.strictness,
      expectedConcept: constraint.expectedConcept,
      expectedAnyTags: constraint.expectedAnyTags,
      missingTags: constraint.expectedAnyTags,
      reason: `No asset-level semantic metadata is available for expected ${constraint.expectedConcept}.`
    };
  }

  const actualTags = uniqueTags([...assetSemantic.subjectTags, ...assetSemantic.themeTags]);
  const missingTags = constraint.expectedAnyTags.filter((tag) => !assetSemantic.subjectTags.includes(tag));
  const conflictingTags = uniqueTags([
    ...actualTags.filter((tag) => constraint.forbiddenTags.includes(tag)),
    ...assetSemantic.forbiddenTags.filter((tag) => constraint.expectedAnyTags.includes(tag))
  ]);

  if (conflictingTags.length > 0 || missingTags.length === constraint.expectedAnyTags.length) {
    return {
      status: 'mismatch',
      confidence: 0,
      strictness: constraint.strictness,
      expectedConcept: constraint.expectedConcept,
      expectedAnyTags: constraint.expectedAnyTags,
      actualTags,
      missingTags,
      conflictingTags,
      reason: `Local asset semantic tags do not satisfy expected ${constraint.expectedConcept}.`
    };
  }

  const exact = assetSemantic.subjectTags.includes(constraint.expectedConcept);
  return {
    status: exact ? 'exact' : 'compatible',
    confidence: exact ? 1 : 0.85,
    strictness: constraint.strictness,
    expectedConcept: constraint.expectedConcept,
    expectedAnyTags: constraint.expectedAnyTags,
    actualTags,
    missingTags,
    conflictingTags,
    reason: exact
      ? `Local asset semantic tags exactly match expected ${constraint.expectedConcept}.`
      : `Local asset semantic tags are compatible with expected ${constraint.expectedConcept}.`
  };
}

export function buildHardSemanticRejection(planItem: AssetPlanItem, assetSemantic: LocalPackAssetSemanticMetadata | undefined): AssetResolutionCandidateRejection | undefined {
  if (planItem.semantic?.strictness !== 'hard') {
    return undefined;
  }

  const semanticFit = buildLocalAssetSemanticFit(planItem, assetSemantic);
  if (semanticFit.status === 'exact' || semanticFit.status === 'compatible') {
    return undefined;
  }

  return {
    assetId: planItem.id,
    role: planItem.role,
    expectedConcept: planItem.semantic.expectedConcept,
    expectedAnyTags: planItem.semantic.expectedAnyTags,
    actualTags: semanticFit.actualTags ?? [],
    missingTags: semanticFit.missingTags ?? [],
    conflictingTags: semanticFit.conflictingTags ?? [],
    reason:
      assetSemantic === undefined
        ? `Hard semantic mismatch: local asset ${planItem.id} is missing semantic metadata.`
        : `Hard semantic mismatch: local asset ${planItem.id} does not satisfy expected ${planItem.semantic.expectedConcept}.`
  };
}

export function buildAssetResolutionReport(input: { plan: AssetPlan; manifest: AssetManifest; candidates: AssetResolutionCandidate[] }): AssetResolutionReport {
  const planById = new Map(input.plan.items.map((item) => [item.id, item]));
  const sources = [...new Set(input.manifest.assets.map((asset) => asset.source))];
  const selectedProvider = sources.length === 1 ? sources[0] ?? 'template_svg' : 'local_mixed_assets';
  const selectedPackId = firstDefined(input.manifest.assets.map((asset) => asset.sourcePack));
  const fullFallbackUsed = input.manifest.assets.every((asset) => asset.source === 'template_svg');
  const perRoleFallbackUsed = !fullFallbackUsed && input.manifest.assets.some((asset) => asset.source === 'template_svg');
  const fallbackUsed = fullFallbackUsed;
  const reason =
    selectedProvider === 'local_asset_pack' && selectedPackId !== undefined
      ? `Selected complete local asset pack ${selectedPackId}.`
      : selectedProvider === 'local_mixed_assets'
        ? 'Selected mixed local assets by role after complete local packs failed.'
        : 'No semantic-compatible complete local asset pack was selected; generated deterministic template SVG assets.';

  return AssetResolutionReportSchema.parse({
    version: 'asset-resolution-report-v0.1',
    projectId: input.plan.projectId,
    summary: {
      selectedProvider,
      selectedPackId: selectedProvider === 'local_asset_pack' ? selectedPackId : undefined,
      fallbackUsed,
      fullFallbackUsed,
      perRoleFallbackUsed,
      reason
    },
    assets: input.manifest.assets.map((asset) => buildReportAsset(asset, planById.get(asset.id))),
    selectedAssets: input.manifest.assets.map((asset) => buildSelectedAsset(asset, planById.get(asset.id), fullFallbackUsed)),
    candidates: input.candidates
  });
}

function buildReportAsset(asset: AssetManifestAsset, planItem: AssetPlanItem | undefined): AssetResolutionReport['assets'][number] {
  const semanticFit = asset.semanticFit ?? { status: 'unknown', confidence: 0, reason: 'Manifest asset did not include semantic fit metadata.' };

  return {
    id: asset.id,
    role: asset.role,
    selected: {
      source: asset.source,
      sourcePack: asset.sourcePack,
      path: asset.path,
      status: asset.status
    },
    expectedSemantic: planItem?.semantic,
    semanticFit
  };
}

function buildSelectedAsset(
  asset: AssetManifestAsset,
  planItem: AssetPlanItem | undefined,
  fullFallbackUsed: boolean
): NonNullable<AssetResolutionReport['selectedAssets']>[number] {
  const reportAsset = buildReportAsset(asset, planItem);
  return {
    id: reportAsset.id,
    role: reportAsset.role,
    source: reportAsset.selected.source,
    sourcePack: reportAsset.selected.sourcePack,
    path: reportAsset.selected.path,
    status: reportAsset.selected.status,
    runtimeAssetId: 'runtimeAssetId' in asset ? asset.runtimeAssetId : undefined,
    runtimeContext: 'runtimeContext' in asset ? asset.runtimeContext : undefined,
    fallbackScope: asset.source === 'template_svg' ? (fullFallbackUsed ? 'full' : 'per_role') : 'none',
    conversion: 'conversion' in asset ? asset.conversion : undefined,
    renderTransform: 'renderTransform' in asset ? asset.renderTransform : undefined,
    expectedSemantic: reportAsset.expectedSemantic,
    semanticFit: reportAsset.semanticFit
  };
}

function firstDefined<T>(values: Array<T | undefined>): T | undefined { return values.find((value): value is T => value !== undefined); }

function uniqueTags(tags: readonly string[]): string[] { return [...new Set(tags)]; }
