import { SemanticEditIntentSchema } from './intent-schema.js';
import { SemanticPatchSchema } from './patch-schema.js';
import type { SemanticPatchApplyFailure, SemanticPatchApplyError, SemanticPatchApplyErrorCode } from './patch-applier-types.js';
import type { SemanticEditIntent, SemanticPatch, SemanticPatchValidationResult } from './types.js';

export type ParsedProposedPatch =
  | {
      ok: true;
      patch: SemanticPatch;
      intent: SemanticEditIntent;
    }
  | SemanticPatchApplyFailure;

export type ParsedAppliedPatch =
  | {
      ok: true;
      patch: SemanticPatch & { afterHash: string };
    }
  | SemanticPatchApplyFailure;

export type ParsedLifecyclePatch =
  | {
      ok: true;
      patch: SemanticPatch;
    }
  | SemanticPatchApplyFailure;

export function parseProposedPatchAndIntent(
  patchInput: unknown,
  intentInput: unknown,
  validation: SemanticPatchValidationResult
): ParsedProposedPatch {
  const patchResult = SemanticPatchSchema.safeParse(patchInput);
  if (!patchResult.success) {
    return failure('PATCH_VALIDATION_FAILED', 'Semantic patch failed schema validation after validation.', {
      cause: patchResult.error,
      validation
    });
  }

  const intentResult = SemanticEditIntentSchema.safeParse(intentInput);
  if (!intentResult.success) {
    return failure('PATCH_VALIDATION_FAILED', 'Semantic edit intent failed schema validation after validation.', {
      cause: intentResult.error,
      validation
    });
  }

  if (patchResult.data.status !== 'proposed') {
    return failure('PATCH_STATUS_NOT_PROPOSED', 'Semantic patch status must be proposed before apply.', {
      intentId: patchResult.data.intentId,
      target: patchResult.data.target
    });
  }

  if (patchResult.data.afterHash !== undefined) {
    return failure('PATCH_AFTER_HASH_ALREADY_SET', 'Semantic patch afterHash must not be set before apply.', {
      intentId: patchResult.data.intentId,
      target: patchResult.data.target
    });
  }

  return {
    ok: true,
    patch: patchResult.data,
    intent: intentResult.data
  };
}

export function createRollbackPatch(input: {
  patch: SemanticPatch;
  afterHash: string;
  inverseOperations: SemanticPatch['operations'];
  now: () => Date;
  createRollbackPatchId: (patch: SemanticPatch) => string;
}): ParsedLifecyclePatch {
  const patchResult = SemanticPatchSchema.safeParse({
    id: input.createRollbackPatchId(input.patch),
    intentId: input.patch.intentId,
    target: input.patch.target,
    operations: input.inverseOperations,
    beforeHash: input.afterHash,
    status: 'proposed',
    createdAt: input.now().toISOString()
  });

  if (!patchResult.success) {
    return failure('INVALID_ROLLBACK_PATCH', 'Generated rollback patch failed schema validation.', {
      intentId: input.patch.intentId,
      target: input.patch.target,
      cause: patchResult.error
    });
  }

  return { ok: true, patch: patchResult.data };
}

export function parseAppliedPatch(input: unknown): ParsedAppliedPatch {
  const patchResult = SemanticPatchSchema.safeParse(input);
  if (!patchResult.success || patchResult.data.status !== 'applied' || typeof patchResult.data.afterHash !== 'string') {
    return failure('INVALID_APPLIED_PATCH', 'Applied semantic patch must have status applied and a non-empty afterHash.', {
      cause: patchResult.success ? undefined : patchResult.error
    });
  }

  return { ok: true, patch: patchResult.data as SemanticPatch & { afterHash: string } };
}

export function parseRollbackPatch(input: unknown): ParsedLifecyclePatch {
  const patchResult = SemanticPatchSchema.safeParse(input);
  if (!patchResult.success || patchResult.data.status !== 'proposed' || patchResult.data.afterHash !== undefined) {
    return failure('INVALID_ROLLBACK_PATCH', 'Rollback semantic patch must be proposed and must not have afterHash set.', {
      cause: patchResult.success ? undefined : patchResult.error
    });
  }

  return { ok: true, patch: patchResult.data };
}

export function validateAppliedPatchLifecycle(input: SemanticPatch): ParsedLifecyclePatch {
  const patchResult = SemanticPatchSchema.safeParse(input);
  if (!patchResult.success) {
    return failure('INVALID_APPLIED_PATCH', 'Semantic patch lifecycle view failed schema validation.', { cause: patchResult.error });
  }

  return { ok: true, patch: patchResult.data };
}

function failure(
  code: SemanticPatchApplyErrorCode,
  message: string,
  context: Omit<SemanticPatchApplyError, 'code' | 'message'> = {}
): SemanticPatchApplyFailure {
  return {
    ok: false,
    error: {
      code,
      message,
      ...context
    }
  };
}
