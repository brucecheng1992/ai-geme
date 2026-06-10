import { DslPatchSchema, type DslPatch, type DslPatchOperation } from '../../../../packages/game-dsl/src/index.js';

export function applyDslPatch(rawDsl: unknown, patch: DslPatch): unknown {
  const parsed = DslPatchSchema.parse(patch);
  const next = cloneJson(rawDsl);

  for (const change of parsed.changes) {
    assertAllowedPatchPath(change.path);
    applyOperation(next, change);
  }

  return next;
}

function applyOperation(target: unknown, change: DslPatchOperation): void {
  const parts = change.path.split('.');
  const key = parts.pop();
  if (!key) {
    throw new Error(`Invalid patch path: ${change.path}`);
  }

  const parent = resolveParent(target, parts);
  if (change.op === 'remove') {
    delete parent[key];
    return;
  }

  parent[key] = change.value;
}

function resolveParent(target: unknown, parts: string[]): Record<string, unknown> {
  let current = looseRecord(target);
  for (const part of parts) {
    const next = looseRecord(current[part]);
    current[part] = next;
    current = next;
  }
  return current;
}

function assertAllowedPatchPath(path: string): void {
  const segments = path.split('.');
  const unsafeSegment = segments.find((segment) => segment === '__proto__' || segment === 'prototype' || segment === 'constructor');
  if (unsafeSegment !== undefined) {
    throw new Error(`Repair patch cannot modify unsafe path segment: ${unsafeSegment}`);
  }

  if (path === 'dsl_version' || path === 'game.genre' || path.startsWith('game.genre.') || path.includes('template')) {
    throw new Error(`Repair patch cannot modify protected path: ${path}`);
  }
}

function looseRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function cloneJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}
