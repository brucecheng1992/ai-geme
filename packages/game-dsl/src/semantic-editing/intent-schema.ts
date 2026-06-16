import { z } from 'zod';

import { isSemanticId } from './semantic-address.js';
import { SEMANTIC_EDIT_INTENT_KINDS, SEMANTIC_EDIT_REASON_SOURCES, type SemanticEditIntent } from './types.js';

const SemanticEditReasonSchema = z.strictObject({
  source: z.enum(SEMANTIC_EDIT_REASON_SOURCES),
  message: z.string().min(1).max(500),
  traceEventIds: z.array(z.string().min(1).max(160)).optional(),
  qaFindingIds: z.array(z.string().min(1).max(160)).optional()
});

const SemanticEditConstraintsSchema = z.strictObject({
  preserveGameplay: z.boolean().optional(),
  preserveAssets: z.boolean().optional(),
  preserveEntityIds: z.boolean().optional(),
  noGeneratedCodeEdit: z.boolean().optional()
});

/**
 * Validates semantic edit requests before any planner can touch the SSOT.
 */
export const SemanticEditIntentSchema: z.ZodType<SemanticEditIntent> = z.strictObject({
  id: z.string().min(1).max(120),
  kind: z.enum(SEMANTIC_EDIT_INTENT_KINDS),
  target: z.string().refine(isSemanticId, { message: 'target must be a semantic id' }),
  reason: SemanticEditReasonSchema,
  payload: z.record(z.string(), z.unknown()),
  constraints: SemanticEditConstraintsSchema.optional()
});
