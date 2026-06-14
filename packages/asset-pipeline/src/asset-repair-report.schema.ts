import { z } from 'zod';

import type { AssetRepairReportSection } from './asset-repair-executor.types.js';

const AssetIdSchema = z.string().regex(/^[a-z][a-z0-9_]{1,39}$/);
const AssetProviderSchema = z.enum(['local_asset_pack', 'runtime_asset', 'template_svg', 'placeholder']);
const PackIdSchema = z.string().regex(/^[a-z][a-z0-9_-]{1,63}$/);

const AssetRepairSnapshotSchema = z.strictObject({
  source: AssetProviderSchema.optional(),
  packId: PackIdSchema.optional(),
  path: z.string().min(1).optional(),
  semanticFitStatus: z.string().min(1).optional()
});

export const AssetResolutionRepairSectionSchema = z.strictObject({
  version: z.literal('asset-repair-v0.1'),
  planVersion: z.literal('asset-repair-plan-v0.1'),
  status: z.enum(['not_triggered', 'no_action', 'repaired', 'failed']),
  attempts: z.number().int().min(0).max(1),
  maxAttempts: z.number().int().min(0).max(1),
  blacklistedCandidates: z.array(
    z.strictObject({
      packId: PackIdSchema,
      assetId: AssetIdSchema,
      role: z.string().min(1),
      reason: z.string().min(1).max(320)
    })
  ),
  repairedRequirementIds: z.array(AssetIdSchema),
  items: z.array(
    z.strictObject({
      requirementId: z.string().min(1).max(80),
      role: z.string().min(1),
      action: z.enum(['blacklist_candidate_then_reresolve', 'force_template_svg_fallback', 'no_action']),
      before: AssetRepairSnapshotSchema.optional(),
      after: AssetRepairSnapshotSchema.optional(),
      reason: z.string().min(1).max(360)
    })
  )
}) satisfies z.ZodType<AssetRepairReportSection>;
