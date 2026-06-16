export const SEMANTIC_ID_KINDS = ['project', 'scene', 'entity', 'asset', 'system', 'rule', 'camera', 'input', 'physics'] as const;

export type SemanticIdKind = (typeof SEMANTIC_ID_KINDS)[number];

export type SemanticId =
  | `project:${string}`
  | `scene:${string}`
  | `entity:${string}`
  | `asset:${string}`
  | `system:${string}`
  | `rule:${string}`
  | `camera:${string}`
  | `input:${string}`
  | `physics:${string}`;

export type ParsedSemanticId = {
  kind: SemanticIdKind;
  name: string;
};

const semanticIdPattern = /^([a-z]+):([a-z][a-z0-9_]{0,63})$/;
const semanticIdKinds = new Set<string>(SEMANTIC_ID_KINDS);

/**
 * Parses stable SSOT semantic addresses and rejects generated file paths or unknown domains.
 */
export function parseSemanticId(id: string): ParsedSemanticId | null {
  const match = semanticIdPattern.exec(id);
  if (match === null) {
    return null;
  }

  const [, kind, name] = match;
  if (!semanticIdKinds.has(kind)) {
    return null;
  }

  return { kind: kind as SemanticIdKind, name };
}

export function isSemanticId(value: unknown): value is SemanticId {
  return typeof value === 'string' && parseSemanticId(value) !== null;
}

export function makeSemanticId(kind: SemanticIdKind, name: string): SemanticId {
  const candidate = `${kind}:${name}`;
  if (!isSemanticId(candidate)) {
    throw new Error(`Invalid semantic id "${candidate}"`);
  }

  return candidate;
}
