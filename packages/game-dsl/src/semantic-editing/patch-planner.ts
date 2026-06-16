import { SemanticEditIntentSchema } from './intent-schema.js';
import { SemanticPatchSchema } from './patch-schema.js';
import type { SemanticIndex, SemanticIndexEntry } from './semantic-index.js';
import type { SemanticEditIntent, SemanticEditIntentKind, SemanticPatch, SemanticPatchOperation } from './types.js';

export type SemanticPatchPlannerErrorCode =
  | 'INVALID_SEMANTIC_EDIT_INTENT'
  | 'SEMANTIC_TARGET_NOT_FOUND'
  | 'UNSUPPORTED_SEMANTIC_EDIT_KIND'
  | 'EMPTY_SEMANTIC_PATCH_OPERATIONS'
  | 'SEMANTIC_PATCH_HANDLER_EXCEPTION'
  | 'INVALID_SEMANTIC_PATCH';

export type SemanticPatchPlannerError = {
  code: SemanticPatchPlannerErrorCode;
  message: string;
  intentId?: string;
  target?: string;
  kind?: string;
  cause?: unknown;
};

export type SemanticPatchPlanResult = { ok: true; patch: SemanticPatch } | { ok: false; error: SemanticPatchPlannerError };

export type SemanticPatchPlanRequest = {
  intent: unknown;
  semanticIndex: SemanticIndex;
  beforeHash: string;
  now?: () => Date;
  createPatchId?: (intent: SemanticEditIntent) => string;
};

export type SemanticPatchPlannerHandlerInput = {
  intent: SemanticEditIntent;
  target: SemanticIndexEntry;
};

export type SemanticPatchPlannerHandler = (input: SemanticPatchPlannerHandlerInput) => SemanticPatchOperation[];

export type SemanticPatchPlannerHandlers = Partial<Record<SemanticEditIntentKind, SemanticPatchPlannerHandler>>;

export type SemanticPatchPlanner = {
  plan(request: SemanticPatchPlanRequest): SemanticPatchPlanResult;
};

/**
 * Converts a validated semantic edit intent into a proposed patch without applying or validating guards.
 */
export function createSemanticPatchPlanner(handlers: SemanticPatchPlannerHandlers = {}): SemanticPatchPlanner {
  return {
    plan(request) {
      const intentResult = SemanticEditIntentSchema.safeParse(request.intent);
      if (!intentResult.success) {
        return {
          ok: false,
          error: {
            code: 'INVALID_SEMANTIC_EDIT_INTENT',
            message: 'Semantic edit intent failed schema validation.',
            cause: intentResult.error
          }
        };
      }

      const intent = intentResult.data;
      const target = request.semanticIndex.resolve(intent.target);
      if (target === null) {
        return {
          ok: false,
          error: {
            code: 'SEMANTIC_TARGET_NOT_FOUND',
            intentId: intent.id,
            target: intent.target,
            kind: intent.kind,
            message: 'Semantic edit target was not found in SemanticIndex.'
          }
        };
      }

      const handler = handlers[intent.kind];
      if (handler === undefined) {
        return {
          ok: false,
          error: {
            code: 'UNSUPPORTED_SEMANTIC_EDIT_KIND',
            intentId: intent.id,
            target: intent.target,
            kind: intent.kind,
            message: 'Unsupported semantic edit kind.'
          }
        };
      }

      let operations: unknown;
      try {
        operations = handler({ intent, target: cloneSemanticIndexEntryForHandler(target) });
      } catch (cause) {
        return {
          ok: false,
          error: {
            code: 'SEMANTIC_PATCH_HANDLER_EXCEPTION',
            intentId: intent.id,
            target: intent.target,
            kind: intent.kind,
            message: 'Semantic patch planner handler failed.',
            cause
          }
        };
      }

      if (!Array.isArray(operations)) {
        return {
          ok: false,
          error: {
            code: 'INVALID_SEMANTIC_PATCH',
            intentId: intent.id,
            target: intent.target,
            kind: intent.kind,
            message: 'Semantic patch failed schema validation.',
            cause: new Error('Semantic patch handler must return an array of operations.')
          }
        };
      }

      if (operations.length === 0) {
        return {
          ok: false,
          error: {
            code: 'EMPTY_SEMANTIC_PATCH_OPERATIONS',
            intentId: intent.id,
            target: intent.target,
            kind: intent.kind,
            message: 'Semantic patch must contain at least one operation.'
          }
        };
      }

      const patch: SemanticPatch = {
        id: request.createPatchId?.(intent) ?? `semantic_patch:${intent.id}`,
        intentId: intent.id,
        target: intent.target,
        operations: operations as SemanticPatchOperation[],
        beforeHash: request.beforeHash,
        status: 'proposed',
        createdAt: (request.now?.() ?? new Date()).toISOString()
      };
      const patchResult = SemanticPatchSchema.safeParse(patch);

      if (!patchResult.success) {
        return {
          ok: false,
          error: {
            code: 'INVALID_SEMANTIC_PATCH',
            intentId: intent.id,
            target: intent.target,
            kind: intent.kind,
            message: 'Semantic patch failed schema validation.',
            cause: patchResult.error
          }
        };
      }

      return { ok: true, patch: patchResult.data };
    }
  };
}

function cloneSemanticIndexEntryForHandler(entry: SemanticIndexEntry): SemanticIndexEntry {
  return deepFreeze({
    ...entry,
    value: cloneUnknown(entry.value)
  });
}

function cloneUnknown(value: unknown): unknown {
  return value === undefined ? undefined : structuredClone(value);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }

  return value;
}
