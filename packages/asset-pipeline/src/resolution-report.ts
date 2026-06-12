import { z } from 'zod';

import type { LocalPackAssetSemanticMetadata } from './local-asset-pack.schema.js';
import { AssetResolutionRepairSectionSchema } from './asset-repair-report.schema.js';
import { AssetSemanticConstraintSchema, AssetSemanticFitSchema, SemanticTagSchema, type AssetManifest, type AssetManifestAsset, type AssetPlan, type AssetPlanItem, type AssetSemanticFit } from './schemas.js';

const AssetIdSchema = z.string().regex(/^[a-z][a-z0-9_]{1,39}$/);
const AssetProviderSchema = z.enum(['local_asset_pack', 'template_svg', 'placeholder']);

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
    selectedProvider: AssetProviderSchema,
    selectedPackId: z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/).optional(),
    fallbackUsed: z.boolean(),
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
  const selectedProvider = input.manifest.assets[0]?.source ?? 'template_svg';
  const selectedPackId = firstDefined(input.manifest.assets.map((asset) => asset.sourcePack));
  const fallbackUsed = input.manifest.assets.some((asset) => asset.source === 'template_svg');
  const reason =
    selectedProvider === 'local_asset_pack' && selectedPackId !== undefined
      ? `Selected complete local asset pack ${selectedPackId}.`
      : 'No semantic-compatible complete local asset pack was selected; generated deterministic template SVG assets.';

  return AssetResolutionReportSchema.parse({
    version: 'asset-resolution-report-v0.1',
    projectId: input.plan.projectId,
    summary: {
      selectedProvider,
      selectedPackId,
      fallbackUsed,
      reason
    },
    assets: input.manifest.assets.map((asset) => buildReportAsset(asset, planById.get(asset.id))),
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

function firstDefined<T>(values: Array<T | undefined>): T | undefined { return values.find((value): value is T => value !== undefined); }

function uniqueTags(tags: readonly string[]): string[] { return [...new Set(tags)]; }
