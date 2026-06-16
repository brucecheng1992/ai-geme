import { parseSemanticId } from '../semantic-editing/index.js';
import { classifyResolverV2ReferenceTarget } from './asset-reference-rules.js';
import { createResolverV2Diagnostic } from './diagnostics.js';
import { hasOwn, isPlainRecord, sortedKeys } from './reference-extractor-shared.js';
import type { ResolverV2Diagnostic, ResolverV2TransformSummary } from './types.js';

export type ResolverV2SceneBounds = {
  width: number;
  height: number;
};

export type ResolverV2ParentTarget = {
  parentTargetId: string;
  parentFieldPath: string;
};

export function readSceneBounds(
  scene: Record<string, unknown>,
  scenePath: string,
  diagnostics: ResolverV2Diagnostic[]
): ResolverV2SceneBounds | undefined {
  const world = isPlainRecord(scene.world) ? scene.world : undefined;
  if (world !== undefined && (hasOwn(world, 'width') || hasOwn(world, 'height'))) {
    return readBoundsFromRecord(world, `${scenePath}/world`, diagnostics);
  }

  const bounds = isPlainRecord(scene.bounds) ? scene.bounds : undefined;
  if (bounds !== undefined && (hasOwn(bounds, 'width') || hasOwn(bounds, 'height'))) {
    return readBoundsFromRecord(bounds, `${scenePath}/bounds`, diagnostics);
  }

  if (hasOwn(scene, 'width') || hasOwn(scene, 'height')) {
    return readBoundsFromRecord(scene, scenePath, diagnostics);
  }

  return undefined;
}

export function readTransformSummary(
  entity: Record<string, unknown>,
  entityPath: string,
  diagnostics: ResolverV2Diagnostic[]
): ResolverV2TransformSummary | undefined {
  const components = isPlainRecord(entity.components) ? entity.components : undefined;
  if (components !== undefined && hasOwn(components, 'transform')) {
    return readTransformRecord(components.transform, entityPath, `${entityPath}/components/transform`, diagnostics);
  }

  if (hasOwn(entity, 'transform')) {
    return readTransformRecord(entity.transform, entityPath, `${entityPath}/transform`, diagnostics);
  }

  return undefined;
}

export function readSpawnTransform(
  spawn: Record<string, unknown>,
  spawnPath: string,
  bounds: ResolverV2SceneBounds | undefined,
  diagnostics: ResolverV2Diagnostic[]
): ResolverV2TransformSummary | undefined {
  const xValue = spawn.x;
  const yValue = spawn.y;
  const hasValidX = isFiniteNumber(xValue);
  const hasValidY = isFiniteNumber(yValue);
  if (!hasValidX) {
    diagnostics.push(createInvalidTransformDiagnostic(spawnPath, `${spawnPath}/x`));
  }
  if (!hasValidY) {
    diagnostics.push(createInvalidTransformDiagnostic(spawnPath, `${spawnPath}/y`));
  }
  if (!hasValidX || !hasValidY) {
    return undefined;
  }

  const x = xValue;
  const y = yValue;
  const transform = { x, y };
  if (bounds !== undefined && (x < 0 || x > bounds.width || y < 0 || y > bounds.height)) {
    diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'error',
        code: 'RESOLVER_SPAWN_OUT_OF_BOUNDS',
        message: 'Resolver V2 spawn point is outside the scene bounds.',
        sourcePath: spawnPath,
        targetId: `${x},${y}`
      })
    );
  }

  return transform;
}

export function readVisibility(
  entity: Record<string, unknown>,
  entityPath: string,
  diagnostics: ResolverV2Diagnostic[]
): boolean | undefined {
  const components = isPlainRecord(entity.components) ? entity.components : undefined;
  const componentRenderable = components !== undefined && isPlainRecord(components.renderable) ? components.renderable : undefined;
  if (componentRenderable !== undefined && hasOwn(componentRenderable, 'visible')) {
    return readBooleanVisibility(componentRenderable.visible, entityPath, `${entityPath}/components/renderable/visible`, diagnostics);
  }

  const renderable = isPlainRecord(entity.renderable) ? entity.renderable : undefined;
  if (renderable !== undefined && hasOwn(renderable, 'visible')) {
    return readBooleanVisibility(renderable.visible, entityPath, `${entityPath}/renderable/visible`, diagnostics);
  }

  if (hasOwn(entity, 'visible')) {
    return readBooleanVisibility(entity.visible, entityPath, `${entityPath}/visible`, diagnostics);
  }

  return undefined;
}

export function readParentTarget(
  entity: Record<string, unknown>,
  entityPath: string,
  entityId: string,
  diagnostics: ResolverV2Diagnostic[]
): ResolverV2ParentTarget | undefined {
  const direct = readParentCandidate(entity, 'parent', `${entityPath}/parent`);
  const parentId = direct ?? readParentCandidate(entity, 'parentId', `${entityPath}/parentId`);
  const components = isPlainRecord(entity.components) ? entity.components : undefined;
  const hierarchy = components !== undefined && isPlainRecord(components.hierarchy) ? components.hierarchy : undefined;
  const hierarchyParent = hierarchy === undefined ? undefined : readParentCandidate(hierarchy, 'parent', `${entityPath}/components/hierarchy/parent`);
  const candidate = parentId ?? hierarchyParent;
  if (candidate === undefined) {
    return undefined;
  }

  const targetId = readEntityReferenceTarget({
    value: candidate.value,
    sourceId: entityId,
    sourcePath: entityPath,
    fieldPath: candidate.fieldPath,
    diagnostics,
    diagnoseWrongKind: true
  });
  return targetId === undefined ? undefined : { parentTargetId: targetId, parentFieldPath: candidate.fieldPath };
}

export function readEntityReferenceTarget(input: {
  value: unknown;
  sourceId: string;
  sourcePath: string;
  fieldPath: string;
  diagnostics: ResolverV2Diagnostic[];
  diagnoseWrongKind: boolean;
}): string | undefined {
  if (typeof input.value !== 'string' || input.value.trim().length === 0) {
    input.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'warning',
        code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
        message: 'Resolver V2 scene graph entity reference must be a non-empty string.',
        sourceId: input.sourceId,
        sourcePath: input.sourcePath,
        fieldPath: input.fieldPath,
        expectedTargetKind: 'entity'
      })
    );
    return undefined;
  }

  const classification = classifyResolverV2ReferenceTarget(input.value);
  if (!classification.ok) {
    input.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'error',
        code: classification.code,
        message:
          classification.code === 'UNSAFE_RESOLVER_REFERENCE'
            ? 'Resolver V2 scene graph reference target must be a semantic id, not a path or generated-code address.'
            : 'Resolver V2 scene graph reference target must be a valid semantic id.',
        sourceId: input.sourceId,
        sourcePath: input.sourcePath,
        fieldPath: input.fieldPath,
        targetId: input.value,
        expectedTargetKind: 'entity'
      })
    );
    return undefined;
  }

  const parsed = parseSemanticId(input.value);
  if (parsed?.kind !== 'entity') {
    if (input.diagnoseWrongKind) {
      input.diagnostics.push(
        createResolverV2Diagnostic({
          severity: 'error',
          code: 'INVALID_RESOLVER_SEMANTIC_ID',
          message: 'Resolver V2 scene graph reference target must be an entity semantic id.',
          sourceId: input.sourceId,
          sourcePath: input.sourcePath,
          fieldPath: input.fieldPath,
          targetId: input.value,
          expectedTargetKind: 'entity',
          actualTargetKind: parsed?.kind
        })
      );
    }
    return undefined;
  }

  return input.value;
}

export function isResolverV2EntitySemanticId(value: string): boolean {
  return parseSemanticId(value)?.kind === 'entity';
}

export function readSemanticIdForKind(input: {
  value: unknown;
  fallbackId: string;
  expectedKind: 'scene' | 'entity' | 'camera';
  sourcePath: string;
  fieldPath: string;
  diagnostics: ResolverV2Diagnostic[];
}): string {
  const candidate = typeof input.value === 'string' && input.value.trim().length > 0 ? input.value : input.fallbackId;
  const classification = classifyResolverV2ReferenceTarget(candidate);
  const parsed = parseSemanticId(candidate);

  if (!classification.ok || parsed?.kind !== input.expectedKind) {
    input.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'error',
        code: classification.ok ? 'INVALID_RESOLVER_SEMANTIC_ID' : classification.code,
        message: `Resolver V2 ${input.expectedKind} id must be a valid ${input.expectedKind} semantic id.`,
        sourcePath: input.sourcePath,
        fieldPath: input.fieldPath,
        targetId: candidate,
        expectedTargetKind: input.expectedKind,
        actualTargetKind: parsed?.kind
      })
    );
  }

  return candidate;
}

export function readComponentKeys(entity: Record<string, unknown>): string[] | undefined {
  const components = entity.components;
  if (!isPlainRecord(components)) {
    return undefined;
  }

  const keys = sortedKeys(components);
  return keys.length === 0 ? undefined : keys;
}

function readBoundsFromRecord(
  record: Record<string, unknown>,
  sourcePath: string,
  diagnostics: ResolverV2Diagnostic[]
): ResolverV2SceneBounds | undefined {
  const width = record.width;
  const height = record.height;
  const validWidth = isPositiveFiniteNumber(width);
  const validHeight = isPositiveFiniteNumber(height);
  if (!validWidth || !validHeight) {
    diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'error',
        code: 'RESOLVER_SCENE_BOUNDS_INVALID',
        message: 'Resolver V2 scene bounds width and height must be positive finite numbers.',
        sourcePath,
        fieldPath: !validWidth ? `${sourcePath}/width` : `${sourcePath}/height`
      })
    );
    return undefined;
  }

  return { width, height };
}

function readTransformRecord(
  value: unknown,
  entityPath: string,
  transformPath: string,
  diagnostics: ResolverV2Diagnostic[]
): ResolverV2TransformSummary | undefined {
  if (!isPlainRecord(value)) {
    diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'error',
        code: 'RESOLVER_INVALID_TRANSFORM',
        message: 'Resolver V2 entity transform must be an object.',
        sourcePath: entityPath,
        fieldPath: transformPath
      })
    );
    return undefined;
  }

  const summary: ResolverV2TransformSummary = {};
  let hasSummary = false;
  for (const field of ['x', 'y', 'rotation', 'scaleX', 'scaleY'] as const) {
    if (!hasOwn(value, field)) {
      continue;
    }
    if (!isFiniteNumber(value[field])) {
      diagnostics.push(createInvalidTransformDiagnostic(entityPath, `${transformPath}/${field}`));
      continue;
    }
    summary[field] = value[field];
    hasSummary = true;
  }

  for (const field of ['width', 'height'] as const) {
    if (!hasOwn(value, field)) {
      continue;
    }
    if (!isPositiveFiniteNumber(value[field])) {
      diagnostics.push(createInvalidTransformDiagnostic(entityPath, `${transformPath}/${field}`));
      continue;
    }
    summary[field] = value[field];
    hasSummary = true;
  }

  return hasSummary ? summary : undefined;
}

function readBooleanVisibility(
  value: unknown,
  sourcePath: string,
  fieldPath: string,
  diagnostics: ResolverV2Diagnostic[]
): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  diagnostics.push(
    createResolverV2Diagnostic({
      severity: 'warning',
      code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
      message: 'Resolver V2 renderable visibility must be a boolean.',
      sourcePath,
      fieldPath
    })
  );
  return undefined;
}

function readParentCandidate(
  record: Record<string, unknown>,
  key: string,
  fieldPath: string
): { value: unknown; fieldPath: string } | undefined {
  return hasOwn(record, key) ? { value: record[key], fieldPath } : undefined;
}

function createInvalidTransformDiagnostic(sourcePath: string, fieldPath: string): ResolverV2Diagnostic {
  return createResolverV2Diagnostic({
    severity: 'error',
    code: 'RESOLVER_INVALID_TRANSFORM',
    message: 'Resolver V2 transform fields must be finite numbers, and width/height must be positive finite numbers.',
    sourcePath,
    fieldPath
  });
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}
