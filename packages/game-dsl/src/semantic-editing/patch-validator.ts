import { defaultSemanticPatchGuards } from './guards.js';
import { SemanticEditIntentSchema } from './intent-schema.js';
import { SemanticPatchSchema } from './patch-schema.js';
import type { SemanticIndex, SemanticIndexEntry } from './semantic-index.js';
import type {
  SemanticEditIntent,
  SemanticPatch,
  SemanticPatchValidationIssue,
  SemanticPatchValidationResult
} from './types.js';

export type SemanticPatchValidationRequest = {
  patch: unknown;
  intent: unknown;
  semanticIndex: SemanticIndex;
};

export type SemanticPatchGuardInput = {
  patch: SemanticPatch;
  intent: SemanticEditIntent;
  semanticIndex: SemanticIndex;
};

export type SemanticPatchGuard = {
  id: string;
  validate(input: SemanticPatchGuardInput): SemanticPatchValidationIssue[];
};

export type SemanticPatchValidatorOptions = {
  includeDefaultGuards?: boolean;
  guards?: SemanticPatchGuard[];
};

export type SemanticPatchValidator = {
  validate(request: SemanticPatchValidationRequest): SemanticPatchValidationResult;
};

export function createSemanticPatchValidator(options: SemanticPatchValidatorOptions = {}): SemanticPatchValidator {
  const includeDefaultGuards = options.includeDefaultGuards ?? true;
  const guards = [...(includeDefaultGuards ? defaultSemanticPatchGuards : []), ...(options.guards ?? [])];

  return {
    validate(request) {
      const intentResult = SemanticEditIntentSchema.safeParse(request.intent);
      if (!intentResult.success) {
        return validationResultFromError({
          severity: 'error',
          code: 'INVALID_SEMANTIC_EDIT_INTENT_SCHEMA',
          message: 'Semantic edit intent failed schema validation.',
          cause: intentResult.error
        });
      }

      let intent: SemanticEditIntent;
      try {
        intent = cloneForGuard(intentResult.data);
      } catch (cause) {
        return validationResultFromError({
          severity: 'error',
          code: 'INVALID_SEMANTIC_EDIT_INTENT_SCHEMA',
          message: 'Semantic edit intent failed schema validation.',
          cause
        });
      }

      const patchResult = SemanticPatchSchema.safeParse(request.patch);
      if (!patchResult.success) {
        return validationResultFromError({
          severity: 'error',
          code: 'INVALID_SEMANTIC_PATCH_SCHEMA',
          message: 'Semantic patch failed schema validation.',
          cause: patchResult.error
        });
      }

      let patch: SemanticPatch;
      try {
        patch = cloneForGuard(patchResult.data);
      } catch (cause) {
        return validationResultFromError({
          severity: 'error',
          code: 'INVALID_SEMANTIC_PATCH_SCHEMA',
          message: 'Semantic patch failed schema validation.',
          cause
        });
      }

      const input: SemanticPatchGuardInput = {
        intent,
        patch,
        semanticIndex: createGuardSemanticIndex(request.semanticIndex)
      };
      const issues: SemanticPatchValidationIssue[] = [];

      for (const guard of guards) {
        try {
          issues.push(...guard.validate(input));
        } catch (cause) {
          issues.push({
            severity: 'error',
            code: 'GUARD_EXCEPTION',
            guardId: guard.id,
            message: `Semantic patch guard failed: ${guard.id}`,
            cause
          });
        }
      }

      return toValidationResult(issues);
    }
  };
}

function validationResultFromError(issue: SemanticPatchValidationIssue): SemanticPatchValidationResult {
  return toValidationResult([issue]);
}

function toValidationResult(issues: SemanticPatchValidationIssue[]): SemanticPatchValidationResult {
  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Guards are user-extensible, so they receive frozen snapshots instead of live
 * parsed request objects or SSOT-backed SemanticIndex entries.
 */
function createGuardSemanticIndex(semanticIndex: SemanticIndex): SemanticIndex {
  return Object.freeze({
    resolve(id) {
      const entry = semanticIndex.resolve(id);
      return entry === null ? null : cloneSemanticIndexEntryForGuard(entry);
    },
    has(id) {
      return semanticIndex.has(id);
    },
    list(kind) {
      return semanticIndex.list(kind).map(cloneSemanticIndexEntryForGuard);
    }
  });
}

function cloneSemanticIndexEntryForGuard(entry: SemanticIndexEntry): SemanticIndexEntry {
  return deepFreeze({
    ...entry,
    value: cloneUnknown(entry.value)
  });
}

function cloneForGuard<T>(value: T): T {
  return deepFreeze(cloneUnknown(value) as T);
}

function cloneUnknown(value: unknown): unknown {
  return value === undefined ? undefined : structuredClone(value);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && (typeof value === 'object' || typeof value === 'function') && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }

  return value;
}
