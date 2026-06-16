import { cloneSemanticPatchJsonValue } from '../document-hash.js';
import type { SemanticPatchOperation } from '../types.js';

export type FixBlankPreviewRepairConfig = {
  ensureRenderableEntity: boolean;
  ensureCameraSeesSpawn: boolean;
  ensureBackgroundVisible: boolean;
  ensureAssetBindings: boolean;
  primaryEntityId: string;
  viewport: {
    width: number;
    height: number;
  };
  spawn: {
    x: number;
    y: number;
  };
  marker: {
    key: string;
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  background: {
    type: string;
    visible: boolean;
  };
  fallbackAsset: {
    key: string;
    type: string;
    shape: string;
    width: number;
    height: number;
  };
};

type PathResolution = {
  parent: Record<string, unknown>;
  key: string;
  exists: boolean;
  value: unknown;
};

export function createDocumentOperationPlanner(document: unknown) {
  const shadow = cloneSemanticPatchJsonValue(document);
  const operations: SemanticPatchOperation[] = [];

  return {
    operations,
    getValue(path: string): unknown {
      const resolved = resolvePath(shadow, path);
      return resolved.exists ? cloneSemanticPatchJsonValue(resolved.value) : undefined;
    },
    ensureObjectContainer(path: string): void {
      const resolved = resolvePath(shadow, path);
      if (resolved.exists) {
        if (!isPlainRecord(resolved.value)) {
          throw new Error(`fix_blank_preview expected object container at ${path}.`);
        }
        return;
      }

      operations.push({ op: 'add', path, value: {} });
      resolved.parent[resolved.key] = {};
    },
    ensureValue(path: string, value: unknown): void {
      const resolved = resolvePath(shadow, path);
      const clonedValue = cloneSemanticPatchJsonValue(value);
      operations.push({
        op: resolved.exists ? 'set' : 'add',
        path,
        value: clonedValue
      });
      resolved.parent[resolved.key] = cloneSemanticPatchJsonValue(value);
    }
  };
}

export function createBackgroundValue(existing: unknown, config: FixBlankPreviewRepairConfig): Record<string, unknown> {
  return {
    ...(isPlainRecord(existing) ? existing : {}),
    type: config.background.type,
    visible: config.background.visible
  };
}

export function createCameraValue(existing: unknown, config: FixBlankPreviewRepairConfig): Record<string, unknown> {
  return {
    ...(isPlainRecord(existing) ? existing : {}),
    id: 'camera:main',
    x: 0,
    y: 0,
    width: config.viewport.width,
    height: config.viewport.height,
    zoom: 1,
    follow: config.primaryEntityId
  };
}

export function createSpawnValue(existing: unknown, config: FixBlankPreviewRepairConfig): Record<string, unknown> {
  return {
    ...(isPlainRecord(existing) ? existing : {}),
    x: config.spawn.x,
    y: config.spawn.y
  };
}

export function createMarkerValue(existing: unknown, config: FixBlankPreviewRepairConfig): Record<string, unknown> {
  const existingComponents = isPlainRecord(existing) && isPlainRecord(existing.components) ? existing.components : {};
  return {
    ...(isPlainRecord(existing) ? existing : {}),
    id: config.marker.id,
    kind: 'entity',
    components: {
      ...existingComponents,
      transform: {
        x: config.marker.x,
        y: config.marker.y
      },
      shape: {
        type: 'rectangle',
        width: config.marker.width,
        height: config.marker.height
      },
      renderable: {
        visible: true
      }
    }
  };
}

export function assertMarkerTargetCanBeRepaired(existing: unknown, config: FixBlankPreviewRepairConfig): void {
  if (existing === undefined) {
    return;
  }

  if (isPlainRecord(existing) && existing.id === config.marker.id) {
    return;
  }

  throw new Error(`fix_blank_preview marker key collides with an existing entity: ${config.marker.key}`);
}

export function createFallbackAssetValue(existing: unknown, config: FixBlankPreviewRepairConfig): Record<string, unknown> {
  return {
    ...(isPlainRecord(existing) ? existing : {}),
    type: config.fallbackAsset.type,
    shape: config.fallbackAsset.shape,
    width: config.fallbackAsset.width,
    height: config.fallbackAsset.height
  };
}

export function validateScenePath(path: string, label: string): string {
  if (!path.startsWith('/scenes/') || path.endsWith('/') || path.includes('//')) {
    throw new Error(`fix_blank_preview ${label} must be an SSOT scene path.`);
  }

  const segments = path.split('/');
  if (segments.length !== 3 || segments[0] !== '' || segments[1] !== 'scenes') {
    throw new Error(`fix_blank_preview ${label} must be an SSOT scene path.`);
  }

  const sceneKey = segments[2];
  if (sceneKey === undefined || !isSafePathSegment(sceneKey)) {
    throw new Error(`fix_blank_preview ${label} contains unsafe path segments.`);
  }

  return path;
}

export function isSafePathSegment(segment: string): boolean {
  const forbiddenSegments = new Set(['src', 'dist', 'build', 'apps', 'packages', 'generated', 'phaser']);
  return (
    segment.length > 0 &&
    !segment.includes('/') &&
    !segment.includes('\\') &&
    !segment.includes('\0') &&
    segment !== '.' &&
    segment !== '..' &&
    segment !== '__proto__' &&
    segment !== 'prototype' &&
    segment !== 'constructor' &&
    !forbiddenSegments.has(segment.toLowerCase())
  );
}

function resolvePath(document: unknown, path: string): PathResolution {
  const segments = path.split('/').filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    throw new Error('fix_blank_preview does not support root document replacement.');
  }

  let current: unknown = document;
  for (const segment of segments.slice(0, -1)) {
    if (!isPlainRecord(current) || !hasOwn(current, segment)) {
      throw new Error(`fix_blank_preview parent path is missing: ${path}`);
    }
    current = current[segment];
  }

  if (!isPlainRecord(current)) {
    throw new Error(`fix_blank_preview parent path is not an object: ${path}`);
  }

  const key = segments[segments.length - 1];
  if (key === undefined || !isSafePathSegment(key)) {
    throw new Error(`fix_blank_preview path has an unsafe final segment: ${path}`);
  }

  return {
    parent: current,
    key,
    exists: hasOwn(current, key),
    value: current[key]
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}
