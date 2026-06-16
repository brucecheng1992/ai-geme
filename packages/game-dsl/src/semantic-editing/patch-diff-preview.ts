import type { SemanticPatchDiffPathReadResult } from './patch-diff-path.js';
import type {
  CreateSemanticPatchDiffViewModelOptions,
  SemanticPatchDiffValueKind,
  SemanticPatchDiffValuePreview
} from './patch-diff-types.js';

type PreviewRenderResult = {
  text: string;
  redacted: boolean;
};

const DEFAULT_MAX_PREVIEW_LENGTH = 240;
const DEFAULT_MAX_PREVIEW_DEPTH = 3;
const DEFAULT_MAX_KEYS = 12;
const DEFAULT_REDACTED_KEYS = ['password', 'secret', 'token', 'apiKey', 'authorization', 'privateKey'];

export function createSemanticPatchDiffValuePreview(
  value: unknown,
  options: CreateSemanticPatchDiffViewModelOptions = {}
): SemanticPatchDiffValuePreview {
  return createSemanticPatchDiffPreviewFromReadResult({ exists: true, value }, normalizeSemanticPatchDiffPreviewOptions(options));
}

export function createSemanticPatchDiffPreviewFromReadResult(
  readResult: SemanticPatchDiffPathReadResult,
  options: Required<CreateSemanticPatchDiffViewModelOptions>,
  forceRedacted = false
): SemanticPatchDiffValuePreview {
  if (!readResult.exists) {
    return {
      kind: 'missing',
      preview: '(missing)',
      truncated: false,
      redacted: false
    };
  }

  const kind = getValueKind(readResult.value);
  if (forceRedacted) {
    return {
      kind,
      preview: kind === 'string' ? '"[REDACTED]"' : '[REDACTED]',
      truncated: false,
      redacted: true,
      ...getValueMetadata(readResult.value, options)
    };
  }

  try {
    const rendered = renderPreviewValue(readResult.value, options, 0, new WeakSet<object>());
    const truncated = truncatePreview(rendered.text, options.maxPreviewLength);
    return {
      kind,
      preview: truncated.preview,
      truncated: truncated.truncated,
      redacted: rendered.redacted,
      ...getValueMetadata(readResult.value, options)
    };
  } catch {
    return {
      kind: 'unknown',
      preview: '[Unpreviewable]',
      truncated: false,
      redacted: false
    };
  }
}

export function normalizeSemanticPatchDiffPreviewOptions(
  options: CreateSemanticPatchDiffViewModelOptions = {}
): Required<CreateSemanticPatchDiffViewModelOptions> {
  return {
    maxPreviewLength: Math.max(16, options.maxPreviewLength ?? DEFAULT_MAX_PREVIEW_LENGTH),
    maxPreviewDepth: Math.max(1, options.maxPreviewDepth ?? DEFAULT_MAX_PREVIEW_DEPTH),
    maxKeys: Math.max(1, options.maxKeys ?? DEFAULT_MAX_KEYS),
    redactedKeys: options.redactedKeys ?? DEFAULT_REDACTED_KEYS
  };
}

function renderPreviewValue(
  value: unknown,
  options: Required<CreateSemanticPatchDiffViewModelOptions>,
  depth: number,
  seen: WeakSet<object>
): PreviewRenderResult {
  if (value === null) {
    return { text: 'null', redacted: false };
  }

  if (typeof value === 'string') {
    if (containsSensitiveScalarText(value)) {
      return { text: '"[REDACTED]"', redacted: true };
    }

    return { text: JSON.stringify(value), redacted: false };
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return { text: String(value), redacted: false };
  }

  if (typeof value === 'bigint') {
    return { text: `${value.toString()}n`, redacted: false };
  }

  if (typeof value === 'symbol') {
    return { text: '[Symbol]', redacted: false };
  }

  if (typeof value === 'function') {
    return { text: '[Function]', redacted: false };
  }

  if (value === undefined) {
    return { text: '[Undefined]', redacted: false };
  }

  if (typeof value !== 'object') {
    return { text: '[Unknown]', redacted: false };
  }

  if (seen.has(value)) {
    return { text: '[Circular]', redacted: false };
  }

  if (depth >= options.maxPreviewDepth) {
    return { text: Array.isArray(value) ? '[Array]' : '[Object]', redacted: false };
  }

  seen.add(value);
  try {
    return Array.isArray(value)
      ? renderArrayPreview(value, options, depth, seen)
      : renderObjectPreview(value as Record<string, unknown>, options, depth, seen);
  } finally {
    seen.delete(value);
  }
}

function renderArrayPreview(
  value: readonly unknown[],
  options: Required<CreateSemanticPatchDiffViewModelOptions>,
  depth: number,
  seen: WeakSet<object>
): PreviewRenderResult {
  const items = value.slice(0, options.maxKeys).map((child) => renderPreviewValue(child, options, depth + 1, seen));
  const suffix = value.length > options.maxKeys ? ', ...' : '';
  return {
    text: `[${items.map((item) => item.text).join(', ')}${suffix}]`,
    redacted: items.some((item) => item.redacted)
  };
}

function renderObjectPreview(
  value: Record<string, unknown>,
  options: Required<CreateSemanticPatchDiffViewModelOptions>,
  depth: number,
  seen: WeakSet<object>
): PreviewRenderResult {
  const keys = Object.keys(value).sort(compareCodeUnits);
  const renderedEntries = keys.slice(0, options.maxKeys).map((key) => {
    if (isRedactedKey(key, options.redactedKeys)) {
      return {
        text: `${JSON.stringify(key)}: "[REDACTED]"`,
        redacted: true
      };
    }

    const rendered = renderPreviewValue(value[key], options, depth + 1, seen);
    return {
      text: `${JSON.stringify(key)}: ${rendered.text}`,
      redacted: rendered.redacted
    };
  });
  const suffix = keys.length > options.maxKeys ? ', ...' : '';

  return {
    text: `{ ${renderedEntries.map((entry) => entry.text).join(', ')}${suffix} }`,
    redacted: renderedEntries.some((entry) => entry.redacted)
  };
}

function getValueMetadata(value: unknown, options: Required<CreateSemanticPatchDiffViewModelOptions>): Pick<SemanticPatchDiffValuePreview, 'size' | 'keys'> {
  if (Array.isArray(value)) {
    return { size: value.length };
  }

  if (isRecord(value)) {
    const keys = Object.keys(value).sort(compareCodeUnits);
    return {
      size: keys.length,
      keys: keys.slice(0, options.maxKeys)
    };
  }

  return {};
}

function truncatePreview(preview: string, maxLength: number): { preview: string; truncated: boolean } {
  if (preview.length <= maxLength) {
    return { preview, truncated: false };
  }

  return {
    preview: `${preview.slice(0, Math.max(0, maxLength - 3))}...`,
    truncated: true
  };
}

function getValueKind(value: unknown): SemanticPatchDiffValueKind {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return 'boolean';
  }

  if (typeof value === 'number') {
    return 'number';
  }

  if (typeof value === 'string') {
    return 'string';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  if (isRecord(value)) {
    return 'object';
  }

  return 'unknown';
}

function isRedactedKey(key: string, redactedKeys: readonly string[]): boolean {
  const normalizedKey = normalizeSensitiveKey(key);
  return redactedKeys.some((redactedKey) => {
    const normalizedRedactedKey = normalizeSensitiveKey(redactedKey);
    return normalizedRedactedKey.length > 0 && normalizedKey.includes(normalizedRedactedKey);
  });
}

function normalizeSensitiveKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function containsSensitiveScalarText(value: string): boolean {
  return (
    /Bearer\s+[A-Za-z0-9._~+/=-]+/i.test(value) ||
    /\bsk-[A-Za-z0-9._-]{6,}\b/.test(value) ||
    /\b(?:api[_ -]?key|authorization|private[_ -]?key|secret|token)\b\s*[:=]/i.test(value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
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
