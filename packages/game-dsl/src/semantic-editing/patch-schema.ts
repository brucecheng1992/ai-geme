import { z } from 'zod';

import { isSemanticId } from './semantic-address.js';
import { SEMANTIC_PATCH_STATUSES, type SemanticPatch } from './types.js';

const generatedPathPatterns = [/^\/generated(?:\/|$)/, /^\/dist(?:\/|$)/, /^\/phaser(?:\/|$)/, /^\/src(?:\/|$)/, /\.(?:ts|tsx|js|jsx)$/];

const SemanticPatchPathSchema = z
  .string()
  .min(1)
  .max(240)
  .refine((path) => path.startsWith('/'), { message: 'path must be an SSOT path starting with /' })
  .refine((path) => !path.includes('..'), { message: 'path must not contain traversal segments' })
  .refine((path) => !generatedPathPatterns.some((pattern) => pattern.test(path)), {
    message: 'path must not target generated output or source code'
  });

const DefinedPatchValueSchema = z.unknown().refine((value) => value !== undefined, { message: 'value is required' });

const SemanticPatchSetOperationSchema = z.strictObject({
  op: z.literal('set'),
  path: SemanticPatchPathSchema,
  value: DefinedPatchValueSchema
});

const SemanticPatchAddOperationSchema = z.strictObject({
  op: z.literal('add'),
  path: SemanticPatchPathSchema,
  value: DefinedPatchValueSchema
});

const SemanticPatchRemoveOperationSchema = z.strictObject({
  op: z.literal('remove'),
  path: SemanticPatchPathSchema
});

const SemanticPatchReplaceOperationSchema = z.strictObject({
  op: z.literal('replace'),
  path: SemanticPatchPathSchema,
  value: DefinedPatchValueSchema
});

const SemanticPatchValidationSchema = z.strictObject({
  ok: z.boolean(),
  errors: z.array(z.string().min(1).max(500)),
  warnings: z.array(z.string().min(1).max(500))
});

/**
 * Validates serializable semantic patches before planner output can reach guards or appliers.
 */
export const SemanticPatchSchema: z.ZodType<SemanticPatch> = z.strictObject({
  id: z.string().min(1).max(120),
  intentId: z.string().min(1).max(120),
  target: z.string().refine(isSemanticId, { message: 'target must be a semantic id' }),
  operations: z
    .array(
      z.discriminatedUnion('op', [
        SemanticPatchSetOperationSchema,
        SemanticPatchAddOperationSchema,
        SemanticPatchRemoveOperationSchema,
        SemanticPatchReplaceOperationSchema
      ])
    )
    .min(1)
    .max(20),
  beforeHash: z.string().min(1).max(160),
  afterHash: z.string().min(1).max(160).optional(),
  status: z.enum(SEMANTIC_PATCH_STATUSES),
  createdAt: z.string().min(1).max(80),
  validation: SemanticPatchValidationSchema.optional()
});
