export type SemanticPatchDiffPathReadResult =
  | {
      exists: true;
      value: unknown;
    }
  | {
      exists: false;
    };

const GENERATED_PATH_PATTERNS = [/^\/generated(?:\/|$)/, /^\/dist(?:\/|$)/, /^\/phaser(?:\/|$)/, /^\/src(?:\/|$)/, /\.(?:ts|tsx|js|jsx)$/];
const DEFAULT_SENSITIVE_PATH_KEYS = ['password', 'secret', 'token', 'apiKey', 'authorization', 'privateKey'];

export function readSemanticPatchDiffPathValue(document: unknown, path: string): SemanticPatchDiffPathReadResult {
  if (!isSafeReadablePath(path)) {
    return { exists: false };
  }

  const segments = parseSemanticPath(path);
  if (segments.length === 0) {
    return { exists: false };
  }

  let current = document;
  for (const segment of segments) {
    if (isUnsafePathSegment(segment)) {
      return { exists: false };
    }

    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return { exists: false };
      }
      current = current[index];
      continue;
    }

    if (!isRecord(current) || !hasOwn(current, segment)) {
      return { exists: false };
    }

    current = current[segment];
  }

  return { exists: true, value: current };
}

export function isSafeSemanticPatchDiffPath(path: string): boolean {
  return isSafeReadablePath(path) && !GENERATED_PATH_PATTERNS.some((pattern) => pattern.test(path)) && parseSemanticPath(path).every((segment) => !isUnsafePathSegment(segment));
}

export function isSensitiveSemanticPatchDiffPath(path: string, redactedKeys: readonly string[] = DEFAULT_SENSITIVE_PATH_KEYS): boolean {
  if (!isSafeReadablePath(path)) {
    return false;
  }

  return parseSemanticPath(path).some((segment) => {
    const normalizedSegment = normalizeSensitiveKey(segment);
    return redactedKeys.some((key) => {
      const normalizedKey = normalizeSensitiveKey(key);
      return normalizedKey.length > 0 && normalizedSegment.includes(normalizedKey);
    });
  });
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

function isSafeReadablePath(path: string): boolean {
  return typeof path === 'string' && path.startsWith('/') && !path.includes('\0') && !path.includes('//') && !path.includes('..');
}

function isUnsafePathSegment(segment: string): boolean {
  return segment === '' || segment === '__proto__' || segment === 'prototype' || segment === 'constructor';
}

function normalizeSensitiveKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}
