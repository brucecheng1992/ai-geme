export type SemanticPatchDocument = unknown;

export type SemanticPatchDocumentHasher = (document: SemanticPatchDocument) => string;

/**
 * Produces a deterministic, non-cryptographic hash over JSON-compatible SSOT-like documents.
 */
export function hashSemanticPatchDocument(document: SemanticPatchDocument): string {
  return `semantic_hash:${hashStableString(stableStringifyJson(document))}`;
}

export function cloneSemanticPatchJsonValue<T>(value: T): T {
  stableStringifyJson(value);
  return structuredClone(value);
}

function stableStringifyJson(value: unknown, seen = new WeakSet<object>()): string {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('JSON-compatible numbers must be finite.');
    }

    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      throw new TypeError('JSON-compatible documents must not contain circular references.');
    }

    seen.add(value);
    try {
      return `[${value.map((child) => stableStringifyJson(child, seen)).join(',')}]`;
    } finally {
      seen.delete(value);
    }
  }

  if (isPlainJsonObject(value)) {
    if (seen.has(value)) {
      throw new TypeError('JSON-compatible documents must not contain circular references.');
    }

    seen.add(value);
    try {
      return `{${Object.entries(value)
        .sort(([left], [right]) => compareCodeUnits(left, right))
        .map(([key, child]) => `${JSON.stringify(key)}:${stableStringifyJson(child, seen)}`)
        .join(',')}}`;
    } finally {
      seen.delete(value);
    }
  }

  throw new TypeError('Semantic patch document must contain only JSON-compatible values.');
}

function hashStableString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return hash.toString(36).padStart(7, '0');
}

function compareCodeUnits(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
