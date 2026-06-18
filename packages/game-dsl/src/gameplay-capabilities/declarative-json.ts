import { z } from 'zod';

export type DeclarativeJsonValue = null | boolean | number | string | DeclarativeJsonValue[] | { [key: string]: DeclarativeJsonValue };

export const DeclarativeJsonValueSchema: z.ZodType<DeclarativeJsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.array(DeclarativeJsonValueSchema),
    z.record(z.string(), DeclarativeJsonValueSchema)
  ])
);

export const DeclarativeJsonObjectSchema = z.record(z.string(), DeclarativeJsonValueSchema).superRefine((value, ctx) => {
  const unsafePath = findUnsafeDeclarativeJsonKeyPath(value);
  if (unsafePath !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: unsafePath,
      message: 'declarative JSON cannot use executable-looking keys.'
    });
  }
});

export const SafeDeclarativeJsonValueSchema = DeclarativeJsonValueSchema.superRefine((value, ctx) => {
  const unsafePath = findUnsafeDeclarativeJsonKeyPath(value);
  if (unsafePath !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: unsafePath,
      message: 'declarative JSON cannot use executable-looking keys.'
    });
  }
});

const unsafeExecutableKeys = new Set(['script', 'import', 'eval', 'function', 'code', 'module']);

export function findUnsafeDeclarativeJsonKeyPath(value: DeclarativeJsonValue, path: Array<string | number> = []): Array<string | number> | undefined {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const unsafePath = findUnsafeDeclarativeJsonKeyPath(value[index], [...path, index]);
      if (unsafePath !== undefined) {
        return unsafePath;
      }
    }
    return undefined;
  }
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  for (const [key, child] of Object.entries(value)) {
    if (isUnsafeDeclarativeJsonKey(key)) {
      return [...path, key];
    }
    const unsafePath = findUnsafeDeclarativeJsonKeyPath(child, [...path, key]);
    if (unsafePath !== undefined) {
      return unsafePath;
    }
  }
  return undefined;
}

function isUnsafeDeclarativeJsonKey(key: string): boolean {
  const lower = key.toLowerCase();
  return unsafeExecutableKeys.has(lower) || lower.startsWith('on_') || /^on(?:click|update|create|load|error|input|change|submit)/.test(lower);
}
