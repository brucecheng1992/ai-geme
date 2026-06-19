import { z } from 'zod';

import { hashStableJson } from './gameplay-capabilities/stable-json.js';

export const GENERATION_PATH_RECEIPT_KIND = 'generation_path_receipt';
export const GENERATION_PATH_RECEIPT_SCHEMA_VERSION = 'generation_path_receipt.v0.1';

export const GenerationPathReceiptSchema = z.strictObject({
  artifactKind: z.literal(GENERATION_PATH_RECEIPT_KIND),
  schemaVersion: z.literal(GENERATION_PATH_RECEIPT_SCHEMA_VERSION),
  projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
  runId: z.string().regex(/^run_[A-Za-z0-9_-]+$/),
  selectedPath: z.enum([
    'legacy_template_v1',
    'capability_composed_v1',
    'fail_closed_invalid_dsl',
    'fail_closed_unsupported_intent',
    'fail_closed_runtime_unsupported',
    'fail_closed_compile_failed',
    'fail_closed_model_unavailable',
    'fail_closed_model_generation_failed',
    'blocked'
  ]),
  targetPath: z.enum(['legacy_template_v1', 'capability_composed_v1']).optional(),
  dslSource: z.enum(['model_provider', 'deterministic_local_fallback', 'not_generated']),
  selectionReason: z.string().min(1),
  modelFailureCode: z.string().min(1).optional(),
  legacyRepresentable: z.boolean().optional(),
  blocker: z.string().min(1).optional(),
  profileId: z.string().min(1).optional(),
  defaultPathForSupportedProfiles: z.literal('capability_composed_v1'),
  legacyPathPolicy: z.strictObject({
    auditable: z.literal(true),
    rollbackOnlyWhenCapabilityReady: z.boolean()
  }),
  capabilityReadiness: z.enum(['ready', 'blocked', 'not_evaluated']),
  artifactRefs: z.array(
    z.strictObject({
      artifactKind: z.string().min(1),
      path: z.string().min(1)
    })
  ),
  receiptHash: z.string().min(1)
});

export type GenerationPathReceipt = z.infer<typeof GenerationPathReceiptSchema>;

export function buildGenerationPathReceipt(input: {
  projectId: string;
  runId: string;
  selectedPath: GenerationPathReceipt['selectedPath'];
  targetPath?: GenerationPathReceipt['targetPath'];
  dslSource: GenerationPathReceipt['dslSource'];
  selectionReason: string;
  modelFailureCode?: string;
  legacyRepresentable?: boolean;
  blocker?: string;
  profileId?: string;
  capabilityReadiness?: GenerationPathReceipt['capabilityReadiness'];
  artifactRefs?: GenerationPathReceipt['artifactRefs'];
}): GenerationPathReceipt {
  const payload: Omit<GenerationPathReceipt, 'receiptHash'> = {
    artifactKind: GENERATION_PATH_RECEIPT_KIND,
    schemaVersion: GENERATION_PATH_RECEIPT_SCHEMA_VERSION,
    projectId: input.projectId,
    runId: input.runId,
    selectedPath: input.selectedPath,
    ...(input.targetPath === undefined ? {} : { targetPath: input.targetPath }),
    dslSource: input.dslSource,
    selectionReason: input.selectionReason,
    ...(input.modelFailureCode === undefined ? {} : { modelFailureCode: input.modelFailureCode }),
    ...(input.legacyRepresentable === undefined ? {} : { legacyRepresentable: input.legacyRepresentable }),
    ...(input.blocker === undefined ? {} : { blocker: input.blocker }),
    ...(input.profileId === undefined ? {} : { profileId: input.profileId }),
    defaultPathForSupportedProfiles: 'capability_composed_v1',
    legacyPathPolicy: {
      auditable: true,
      rollbackOnlyWhenCapabilityReady: input.selectedPath === 'capability_composed_v1'
    },
    capabilityReadiness: input.capabilityReadiness ?? 'not_evaluated',
    artifactRefs: [...(input.artifactRefs ?? [])].sort((left, right) => `${left.artifactKind}:${left.path}`.localeCompare(`${right.artifactKind}:${right.path}`))
  };

  return GenerationPathReceiptSchema.parse({ ...payload, receiptHash: hashStableJson(payload) });
}
