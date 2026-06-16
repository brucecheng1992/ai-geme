import { cloneSemanticPatchJsonValue, type SemanticPatchDocument } from './document-hash.js';
import type { SemanticPatchOperation } from './types.js';

export type SemanticPatchDocumentOperationError = {
  message: string;
  path?: string;
  operationIndex?: number;
  cause?: unknown;
};

export type SemanticPatchDocumentOperationResult =
  | {
      ok: true;
      document: SemanticPatchDocument;
      inverseOperations: SemanticPatchOperation[];
    }
  | {
      ok: false;
      error: SemanticPatchDocumentOperationError;
    };

type ResolvedParent = {
  parent: Record<string, unknown>;
  key: string;
  exists: boolean;
  value: unknown;
};

/**
 * Applies semantic object-path operations to a cloned JSON document and returns rollback-ready inverse operations.
 */
export function applySemanticPatchOperations(
  document: SemanticPatchDocument,
  operations: SemanticPatchOperation[]
): SemanticPatchDocumentOperationResult {
  let workingDocument: SemanticPatchDocument;
  try {
    workingDocument = cloneSemanticPatchJsonValue(document);
  } catch (cause) {
    return {
      ok: false,
      error: {
        message: 'Semantic patch document must be JSON-compatible.',
        cause
      }
    };
  }

  const inverseOperations: SemanticPatchOperation[] = [];

  for (const [operationIndex, operation] of operations.entries()) {
    const result = applyOperation(workingDocument, operation);
    if (!result.ok) {
      return {
        ok: false,
        error: {
          ...result.error,
          path: operation.path,
          operationIndex
        }
      };
    }

    inverseOperations.push(result.inverse);
  }

  return {
    ok: true,
    document: workingDocument,
    inverseOperations: inverseOperations.reverse()
  };
}

function applyOperation(
  document: SemanticPatchDocument,
  operation: SemanticPatchOperation
):
  | {
      ok: true;
      inverse: SemanticPatchOperation;
    }
  | {
      ok: false;
      error: SemanticPatchDocumentOperationError;
    } {
  const resolved = resolveParent(document, operation.path);
  if (!resolved.ok) {
    return resolved;
  }

  const { parent, key, exists, value } = resolved;

  try {
    switch (operation.op) {
      case 'set': {
        const inverse: SemanticPatchOperation = exists
          ? { op: 'set', path: operation.path, value: cloneSemanticPatchJsonValue(value) }
          : { op: 'remove', path: operation.path };
        parent[key] = cloneSemanticPatchJsonValue(operation.value);
        return { ok: true, inverse };
      }
      case 'add': {
        if (exists) {
          return operationFailure('Cannot add semantic patch value because the final key already exists.');
        }

        parent[key] = cloneSemanticPatchJsonValue(operation.value);
        return { ok: true, inverse: { op: 'remove', path: operation.path } };
      }
      case 'replace': {
        if (!exists) {
          return operationFailure('Cannot replace semantic patch value because the final key is missing.');
        }

        const inverse: SemanticPatchOperation = { op: 'replace', path: operation.path, value: cloneSemanticPatchJsonValue(value) };
        parent[key] = cloneSemanticPatchJsonValue(operation.value);
        return { ok: true, inverse };
      }
      case 'remove': {
        if (!exists) {
          return operationFailure('Cannot remove semantic patch value because the final key is missing.');
        }

        const inverse: SemanticPatchOperation = { op: 'add', path: operation.path, value: cloneSemanticPatchJsonValue(value) };
        delete parent[key];
        return { ok: true, inverse };
      }
    }
  } catch (cause) {
    return operationFailure('Semantic patch operation value must be JSON-compatible.', cause);
  }
}

function resolveParent(
  document: SemanticPatchDocument,
  path: string
):
  | {
      ok: true;
    } & ResolvedParent
  | {
      ok: false;
      error: SemanticPatchDocumentOperationError;
    } {
  const segments = parseSemanticPath(path);
  if (segments.length === 0) {
    return operationFailure('Semantic patch applier does not support replacing the root document.');
  }

  let current: unknown = document;
  for (const segment of segments.slice(0, -1)) {
    if (!isJsonRecord(current)) {
      return operationFailure('Semantic patch parent path must resolve through object values.');
    }

    if (isUnsafePathSegment(segment) || !hasOwn(current, segment)) {
      return operationFailure('Semantic patch parent path is missing.');
    }

    current = current[segment];
  }

  if (!isJsonRecord(current)) {
    return operationFailure('Semantic patch final parent must be an object.');
  }

  const key = segments[segments.length - 1];
  if (key === undefined || isUnsafePathSegment(key)) {
    return operationFailure('Semantic patch final key is invalid.');
  }

  const exists = hasOwn(current, key);
  return {
    ok: true,
    parent: current,
    key,
    exists,
    value: exists ? current[key] : undefined
  };
}

function parseSemanticPath(path: string): string[] {
  if (path === '/') {
    return [];
  }

  return path
    .split('/')
    .slice(1)
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function isUnsafePathSegment(segment: string): boolean {
  return segment === '' || segment === '__proto__' || segment === 'prototype' || segment === 'constructor';
}

function operationFailure(message: string, cause?: unknown): { ok: false; error: SemanticPatchDocumentOperationError } {
  return {
    ok: false,
    error: {
      message,
      cause
    }
  };
}
