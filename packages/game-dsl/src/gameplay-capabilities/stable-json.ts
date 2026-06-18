export function hashStableJson(value: unknown): string {
  const stableJson = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < stableJson.length; index += 1) {
    hash ^= stableJson.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function stableStringify(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Cannot stable-hash non-finite numbers.');
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'object' && value !== null) {
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      throw new Error('Cannot stable-hash non-plain objects.');
    }
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  throw new Error(`Cannot stable-hash ${typeof value} values.`);
}
