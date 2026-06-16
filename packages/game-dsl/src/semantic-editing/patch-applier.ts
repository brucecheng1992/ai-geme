import {
  createRollbackPatch,
  parseAppliedPatch,
  parseProposedPatchAndIntent,
  parseRollbackPatch,
  validateAppliedPatchLifecycle
} from './patch-applier-lifecycle.js';
import type {
  SemanticPatchApplier,
  SemanticPatchApplierOptions,
  SemanticPatchApplyError,
  SemanticPatchApplyErrorCode,
  SemanticPatchApplyFailure
} from './patch-applier-types.js';
import { applySemanticPatchOperations } from './patch-document.js';
import { hashSemanticPatchDocument, type SemanticPatchDocument, type SemanticPatchDocumentHasher } from './document-hash.js';
import { createSemanticPatchValidator } from './patch-validator.js';
import type { SemanticPatch } from './types.js';

type ApplyParsedPatchResult =
  | {
      ok: true;
      document: SemanticPatchDocument;
      appliedPatch: SemanticPatch;
      beforeHash: string;
      afterHash: string;
      inverseOperations: SemanticPatch['operations'];
    }
  | SemanticPatchApplyFailure;

/**
 * Creates a pure in-memory applier for proposed semantic patches and generated rollback patches.
 */
export function createSemanticPatchApplier(options: SemanticPatchApplierOptions = {}): SemanticPatchApplier {
  const validator = options.validator ?? createSemanticPatchValidator();
  const hashDocument = options.hashDocument ?? hashSemanticPatchDocument;
  const now = options.now ?? (() => new Date());
  const createRollbackPatchId = options.createRollbackPatchId ?? ((patch: SemanticPatch) => `semantic_rollback:${patch.id}`);

  return {
    apply(request) {
      try {
        const validation = validator.validate({
          patch: request.patch,
          intent: request.intent,
          semanticIndex: request.semanticIndex
        });
        if (!validation.ok) {
          return failure('PATCH_VALIDATION_FAILED', 'Semantic patch validation failed.', { validation });
        }

        const parsed = parseProposedPatchAndIntent(request.patch, request.intent, validation);
        if (!parsed.ok) {
          return parsed;
        }

        const applied = applyParsedPatchToDocument({
          document: request.document,
          patch: parsed.patch,
          hashDocument
        });
        if (!applied.ok) {
          return applied;
        }

        const rollbackPatch = createRollbackPatch({
          patch: parsed.patch,
          afterHash: applied.afterHash,
          inverseOperations: applied.inverseOperations,
          now,
          createRollbackPatchId
        });
        if (!rollbackPatch.ok) {
          return rollbackPatch;
        }

        return {
          ok: true,
          document: applied.document,
          appliedPatch: applied.appliedPatch,
          rollbackPatch: rollbackPatch.patch,
          beforeHash: applied.beforeHash,
          afterHash: applied.afterHash,
          validation
        };
      } catch (cause) {
        return exceptionFailure(cause);
      }
    },

    rollback(request) {
      try {
        const appliedPatch = parseAppliedPatch(request.appliedPatch);
        if (!appliedPatch.ok) {
          return appliedPatch;
        }

        const currentHash = computeDocumentHash(hashDocument, request.document);
        if (!currentHash.ok) {
          return currentHash;
        }

        if (currentHash.hash !== appliedPatch.patch.afterHash) {
          return failure('ROLLBACK_DOCUMENT_HASH_MISMATCH', 'Rollback document hash does not match applied patch afterHash.', {
            intentId: appliedPatch.patch.intentId,
            target: appliedPatch.patch.target
          });
        }

        const validation = validator.validate({
          patch: request.rollbackPatch,
          intent: request.intent,
          semanticIndex: request.semanticIndex
        });
        if (!validation.ok) {
          return failure('PATCH_VALIDATION_FAILED', 'Semantic rollback patch validation failed.', { validation });
        }

        const rollbackPatch = parseRollbackPatch(request.rollbackPatch);
        if (!rollbackPatch.ok) {
          return rollbackPatch;
        }

        if (
          rollbackPatch.patch.intentId !== appliedPatch.patch.intentId ||
          rollbackPatch.patch.target !== appliedPatch.patch.target
        ) {
          return failure('INVALID_ROLLBACK_PATCH', 'Rollback patch intentId and target must match the applied patch.', {
            intentId: rollbackPatch.patch.intentId,
            target: rollbackPatch.patch.target
          });
        }

        if (rollbackPatch.patch.beforeHash !== appliedPatch.patch.afterHash) {
          return failure('PATCH_BEFORE_HASH_MISMATCH', 'Rollback patch beforeHash does not match applied patch afterHash.', {
            intentId: rollbackPatch.patch.intentId,
            target: rollbackPatch.patch.target
          });
        }

        const appliedRollback = applyParsedPatchToDocument({
          document: request.document,
          patch: rollbackPatch.patch,
          hashDocument
        });
        if (!appliedRollback.ok) {
          return appliedRollback;
        }

        if (appliedRollback.afterHash !== appliedPatch.patch.beforeHash) {
          return failure('INVALID_ROLLBACK_PATCH', 'Rollback patch did not restore the original document hash.', {
            intentId: rollbackPatch.patch.intentId,
            target: rollbackPatch.patch.target
          });
        }

        const rolledBackPatch = validateAppliedPatchLifecycle({
          ...appliedPatch.patch,
          status: 'rolled_back'
        });
        if (!rolledBackPatch.ok) {
          return rolledBackPatch;
        }

        return {
          ok: true,
          document: appliedRollback.document,
          appliedRollbackPatch: appliedRollback.appliedPatch,
          rolledBackPatch: rolledBackPatch.patch,
          beforeHash: appliedPatch.patch.afterHash,
          afterHash: appliedRollback.afterHash,
          validation
        };
      } catch (cause) {
        return exceptionFailure(cause);
      }
    }
  };
}

function applyParsedPatchToDocument(input: {
  document: SemanticPatchDocument;
  patch: SemanticPatch;
  hashDocument: SemanticPatchDocumentHasher;
}): ApplyParsedPatchResult {
  const beforeHash = computeDocumentHash(input.hashDocument, input.document);
  if (!beforeHash.ok) {
    return beforeHash;
  }

  if (beforeHash.hash !== input.patch.beforeHash) {
    return failure('PATCH_BEFORE_HASH_MISMATCH', 'Semantic patch beforeHash does not match current document hash.', {
      intentId: input.patch.intentId,
      target: input.patch.target
    });
  }

  const operationResult = applySemanticPatchOperations(input.document, input.patch.operations);
  if (!operationResult.ok) {
    return failure('SEMANTIC_PATCH_OPERATION_FAILED', operationResult.error.message, {
      intentId: input.patch.intentId,
      target: input.patch.target,
      path: operationResult.error.path,
      operationIndex: operationResult.error.operationIndex,
      cause: operationResult.error.cause
    });
  }

  const afterHash = computeDocumentHash(input.hashDocument, operationResult.document);
  if (!afterHash.ok) {
    return afterHash;
  }

  const appliedPatch = validateAppliedPatchLifecycle({
    ...input.patch,
    status: 'applied',
    afterHash: afterHash.hash
  });
  if (!appliedPatch.ok) {
    return appliedPatch;
  }

  return {
    ok: true,
    document: operationResult.document,
    appliedPatch: appliedPatch.patch,
    beforeHash: beforeHash.hash,
    afterHash: afterHash.hash,
    inverseOperations: operationResult.inverseOperations
  };
}

function computeDocumentHash(
  hashDocument: SemanticPatchDocumentHasher,
  document: SemanticPatchDocument
):
  | {
      ok: true;
      hash: string;
    }
  | SemanticPatchApplyFailure {
  try {
    return { ok: true, hash: hashDocument(document) };
  } catch (cause) {
    return failure('INVALID_SEMANTIC_PATCH_DOCUMENT', 'Semantic patch document hash could not be computed.', { cause });
  }
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

function exceptionFailure(cause: unknown): SemanticPatchApplyFailure {
  return failure('SEMANTIC_PATCH_APPLIER_EXCEPTION', 'Semantic patch applier failed unexpectedly.', { cause });
}
