import { z } from 'zod';

export const DslPatchOperationSchema = z.strictObject({
  op: z.enum(['add', 'replace', 'remove']),
  path: z.string().min(1),
  value: z.unknown().optional()
});

export const DslPatchSchema = z.strictObject({
  patch_version: z.literal('game-dsl-patch-v0.1'),
  target_dsl_version: z.literal('game-dsl-v0.1'),
  reason: z.string().min(1).max(500),
  changes: z.array(DslPatchOperationSchema).min(1).max(10)
});

export type DslPatch = z.infer<typeof DslPatchSchema>;
export type DslPatchOperation = z.infer<typeof DslPatchOperationSchema>;
