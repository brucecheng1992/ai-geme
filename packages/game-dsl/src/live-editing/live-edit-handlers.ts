import { cloneSemanticPatchJsonValue } from '../semantic-editing/document-hash.js';
import {
  createFixBlankPreviewRepairHandlers,
  isSemanticId,
  parseSemanticId,
  type SemanticPatchOperation,
  type SemanticPatchPlannerHandler,
  type SemanticPatchPlannerHandlers
} from '../semantic-editing/index.js';
import type { CreateLiveSemanticEditHandlersOptions } from './types.js';

type PathResolution = {
  parent: Record<string, unknown>;
  key: string;
  exists: boolean;
  value: unknown;
};

export function createLiveSemanticEditHandlers(options: CreateLiveSemanticEditHandlersOptions): SemanticPatchPlannerHandlers {
  return {
    ...createFixBlankPreviewRepairHandlers({
      document: options.document,
      scenePath: options.scenePath
    }),
    move_entity: createMoveEntityHandler(options),
    adjust_camera: createAdjustCameraHandler(options),
    bind_asset: createBindAssetHandler(options)
  };
}

function createMoveEntityHandler(options: CreateLiveSemanticEditHandlersOptions): SemanticPatchPlannerHandler {
  return ({ intent, target }) => {
    const x = readFiniteNumber(intent.payload.x, 'move_entity x');
    const y = readFiniteNumber(intent.payload.y, 'move_entity y');
    const scenePath = resolveScenePath(intent.payload.sceneTarget, options.scenePath);
    const entityPath = resolveEntityPath({ entityId: intent.target, targetPath: target.path, scenePath });
    const planner = createLiveDocumentOperationPlanner(options.document);

    planner.assertObject(entityPath, `move_entity target ${intent.target}`);
    planner.ensureObjectContainer(`${entityPath}/components`);
    const transformPath = `${entityPath}/components/transform`;
    const existingTransform = planner.getValue(transformPath);
    const transform = {
      ...(isPlainRecord(existingTransform) ? existingTransform : {}),
      x,
      y
    };
    planner.setValue(transformPath, transform);
    return planner.operations;
  };
}

function createAdjustCameraHandler(options: CreateLiveSemanticEditHandlersOptions): SemanticPatchPlannerHandler {
  return ({ intent }) => {
    const follow = readSemanticEntityId(intent.payload.follow, 'adjust_camera follow');
    const scenePath = resolveScenePath(intent.target, options.scenePath);
    const planner = createLiveDocumentOperationPlanner(options.document);

    planner.assertObject(scenePath, `adjust_camera target ${intent.target}`);
    const cameraPath = `${scenePath}/camera`;
    const existingCamera = planner.getValue(cameraPath);
    const camera = {
      ...(isPlainRecord(existingCamera) ? existingCamera : {}),
      id: isPlainRecord(existingCamera) && typeof existingCamera.id === 'string' ? existingCamera.id : 'camera:main',
      follow
    };
    planner.setValue(cameraPath, camera);
    return planner.operations;
  };
}

function createBindAssetHandler(options: CreateLiveSemanticEditHandlersOptions): SemanticPatchPlannerHandler {
  return ({ intent, target }) => {
    const asset = readSemanticAssetId(intent.payload.asset, 'bind_asset asset');
    const scenePath = resolveScenePath(intent.payload.sceneTarget, options.scenePath);
    const entityPath = resolveEntityPath({ entityId: intent.target, targetPath: target.path, scenePath });
    const planner = createLiveDocumentOperationPlanner(options.document);

    planner.assertObject(entityPath, `bind_asset target ${intent.target}`);
    planner.ensureObjectContainer(`${entityPath}/components`);
    planner.ensureObjectContainer(`${entityPath}/components/sprite`);
    planner.setValue(`${entityPath}/components/sprite/asset`, asset);
    return planner.operations;
  };
}

function createLiveDocumentOperationPlanner(document: unknown) {
  const shadow = cloneSemanticPatchJsonValue(document);
  const operations: SemanticPatchOperation[] = [];

  return {
    operations,
    getValue(path: string): unknown {
      const resolved = resolvePath(shadow, path, false);
      return resolved.exists ? cloneSemanticPatchJsonValue(resolved.value) : undefined;
    },
    assertObject(path: string, label: string): void {
      const resolved = resolvePath(shadow, path, false);
      if (!resolved.exists || !isPlainRecord(resolved.value)) {
        throw new Error(`${label} must exist as an object in the live edit document.`);
      }
    },
    ensureObjectContainer(path: string): void {
      const resolved = resolvePath(shadow, path, true);
      if (resolved.exists) {
        if (!isPlainRecord(resolved.value)) {
          throw new Error(`live edit expected object container at ${path}.`);
        }
        return;
      }

      operations.push({ op: 'add', path, value: {} });
      resolved.parent[resolved.key] = {};
    },
    setValue(path: string, value: unknown): void {
      const resolved = resolvePath(shadow, path, true);
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

function resolvePath(document: unknown, path: string, createParents: boolean): PathResolution {
  const segments = path.split('/').filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    throw new Error('live edit does not support root document replacement.');
  }

  let current: unknown = document;
  const parentSegments = segments.slice(0, -1);
  let currentPath = '';
  for (const segment of parentSegments) {
    assertSafePathSegment(segment, path);
    currentPath = `${currentPath}/${segment}`;
    if (!isPlainRecord(current)) {
      throw new Error(`live edit parent path is not an object: ${path}`);
    }

    if (!hasOwn(current, segment)) {
      if (!createParents) {
        throw new Error(`live edit parent path is missing: ${path}`);
      }
      current[segment] = {};
    }

    const child = current[segment];
    if (!isPlainRecord(child)) {
      throw new Error(`live edit parent path is not an object: ${currentPath}`);
    }
    current = child;
  }

  if (!isPlainRecord(current)) {
    throw new Error(`live edit parent path is not an object: ${path}`);
  }

  const key = segments[segments.length - 1];
  if (key === undefined) {
    throw new Error(`live edit path is empty: ${path}`);
  }
  assertSafePathSegment(key, path);

  return {
    parent: current,
    key,
    exists: hasOwn(current, key),
    value: current[key]
  };
}

function resolveScenePath(value: unknown, explicitScenePath?: string): string {
  if (explicitScenePath !== undefined) {
    return validateScenePath(explicitScenePath);
  }

  const sceneTarget = typeof value === 'string' ? value : 'scene:main';
  const parsed = parseSemanticId(sceneTarget);
  if (parsed?.kind !== 'scene') {
    throw new Error(`live edit scene target must be a scene semantic id: ${sceneTarget}`);
  }

  return `/scenes/${parsed.name}`;
}

function resolveEntityPath(input: { entityId: string; targetPath: string; scenePath: string }): string {
  const parsed = parseSemanticId(input.entityId);
  if (parsed?.kind !== 'entity') {
    throw new Error(`live edit entity target must be an entity semantic id: ${input.entityId}`);
  }

  const targetPrefix = `${input.scenePath}/entities/`;
  if (input.targetPath.startsWith(targetPrefix) && !input.targetPath.slice(targetPrefix.length).includes('/')) {
    return validateEntityPath(input.targetPath, input.scenePath);
  }

  return `${input.scenePath}/entities/${parsed.name}`;
}

function validateScenePath(path: string): string {
  const segments = path.split('/');
  if (segments.length !== 3 || segments[0] !== '' || segments[1] !== 'scenes') {
    throw new Error('live edit scenePath must be an SSOT scene path.');
  }
  assertSafePathSegment(segments[2] ?? '', path);
  return path;
}

function validateEntityPath(path: string, scenePath: string): string {
  const prefix = `${scenePath}/entities/`;
  if (!path.startsWith(prefix)) {
    throw new Error('live edit entity path must be inside the selected scene.');
  }
  assertSafePathSegment(path.slice(prefix.length), path);
  return path;
}

function readFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return value;
}

function readSemanticEntityId(value: unknown, label: string): `entity:${string}` {
  if (typeof value !== 'string' || !isSemanticId(value) || parseSemanticId(value)?.kind !== 'entity') {
    throw new Error(`${label} must be an entity semantic id.`);
  }
  return value as `entity:${string}`;
}

function readSemanticAssetId(value: unknown, label: string): `asset:${string}` {
  if (typeof value !== 'string' || !isSemanticId(value) || parseSemanticId(value)?.kind !== 'asset') {
    throw new Error(`${label} must be an asset semantic id.`);
  }
  return value as `asset:${string}`;
}

function assertSafePathSegment(segment: string, path: string): void {
  const forbiddenSegments = new Set(['src', 'dist', 'build', 'apps', 'packages', 'generated', 'phaser']);
  if (
    segment.length === 0 ||
    segment.includes('/') ||
    segment.includes('\\') ||
    segment.includes('\0') ||
    segment === '.' ||
    segment === '..' ||
    segment === '__proto__' ||
    segment === 'prototype' ||
    segment === 'constructor' ||
    forbiddenSegments.has(segment.toLowerCase())
  ) {
    throw new Error(`live edit path has an unsafe segment: ${path}`);
  }
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
