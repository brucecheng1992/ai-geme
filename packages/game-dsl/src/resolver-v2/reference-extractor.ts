import { createResolverV2Diagnostic } from './diagnostics.js';
import type { ExtractedResolverV2Reference, ResolverV2Diagnostic } from './types.js';

type CollectStringReferenceInput = Pick<ExtractedResolverV2Reference, 'kind' | 'sourceId' | 'sourcePath' | 'fieldPath' | 'expectedTargetKind'> & {
  value: unknown;
  result: ResolverV2ReferenceExtractionResult;
};

export type ResolverV2ReferenceExtractionResult = {
  references: ExtractedResolverV2Reference[];
  diagnostics: ResolverV2Diagnostic[];
};

/**
 * Extracts Resolver V2 semantic references from an in-memory SSOT-like object.
 * It does not resolve targets or require the full Raw DSL schema.
 */
export function extractResolverV2References(document: unknown): ResolverV2ReferenceExtractionResult {
  if (!isPlainRecord(document)) {
    return {
      references: [],
      diagnostics: [
        createResolverV2Diagnostic({
          severity: 'error',
          code: 'INVALID_RESOLVER_DOCUMENT',
          message: 'Resolver V2 document must be an object.'
        })
      ]
    };
  }

  if (document.scenes === undefined) {
    return { references: [], diagnostics: [] };
  }

  const scenes = document.scenes;
  if (!isPlainRecord(scenes)) {
    return {
      references: [],
      diagnostics: [
        createResolverV2Diagnostic({
          severity: 'warning',
          code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
          message: 'Resolver V2 scenes must be an object.',
          sourcePath: '/scenes'
        })
      ]
    };
  }

  return sortedKeys(scenes).reduce<ResolverV2ReferenceExtractionResult>(
    (result, sceneKey) => {
      const scene = scenes[sceneKey];
      if (!isPlainRecord(scene)) {
        result.diagnostics.push(
          createResolverV2Diagnostic({
            severity: 'warning',
            code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
            message: 'Resolver V2 scene must be an object.',
            sourcePath: `/scenes/${sceneKey}`
          })
        );
        return result;
      }

      collectSceneReferences(scene, sceneKey, result);
      return result;
    },
    { references: [], diagnostics: [] }
  );
}

function collectSceneReferences(
  scene: Record<string, unknown>,
  sceneKey: string,
  result: ResolverV2ReferenceExtractionResult
): void {
  const sceneId = readString(scene, 'id') ?? `scene:${sceneKey}`;
  const cameraPath = `/scenes/${sceneKey}/camera`;
  const camera = scene.camera;

  if (isPlainRecord(camera) && hasOwn(camera, 'follow')) {
    collectStringReference({
      value: camera.follow,
      kind: 'camera_follow_entity',
      sourceId: sceneId,
      sourcePath: cameraPath,
      fieldPath: `${cameraPath}/follow`,
      expectedTargetKind: 'entity',
      result
    });
  } else if (camera !== undefined && !isPlainRecord(camera)) {
    result.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'warning',
        code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
        message: 'Resolver V2 camera must be an object.',
        sourceId: sceneId,
        sourcePath: cameraPath
      })
    );
  }

  const entities = scene.entities;
  if (entities === undefined) {
    return;
  }

  if (!isPlainRecord(entities)) {
    result.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'warning',
        code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
        message: 'Resolver V2 entities must be an object.',
        sourceId: sceneId,
        sourcePath: `/scenes/${sceneKey}/entities`
      })
    );
    return;
  }

  for (const entityKey of sortedKeys(entities)) {
    collectEntityReferences(entities[entityKey], sceneKey, entityKey, result);
  }
}

function collectEntityReferences(
  entity: unknown,
  sceneKey: string,
  entityKey: string,
  result: ResolverV2ReferenceExtractionResult
): void {
  const entityPath = `/scenes/${sceneKey}/entities/${entityKey}`;
  if (!isPlainRecord(entity)) {
    result.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'warning',
        code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
        message: 'Resolver V2 entity must be an object.',
        sourcePath: entityPath
      })
    );
    return;
  }

  const entityId = readString(entity, 'id') ?? `entity:${entityKey}`;
  const spritePath = `${entityPath}/components/sprite`;
  const components = entity.components;
  const sprite = isPlainRecord(components) ? components.sprite : undefined;
  if (!isPlainRecord(sprite)) {
    return;
  }

  if (!hasOwn(sprite, 'asset')) {
    return;
  }

  collectStringReference({
    value: sprite.asset,
    kind: 'sprite_asset',
    sourceId: entityId,
    sourcePath: entityPath,
    fieldPath: `${spritePath}/asset`,
    expectedTargetKind: 'asset',
    result
  });
}

function collectStringReference(input: CollectStringReferenceInput): void {
  if (typeof input.value === 'string' && input.value.trim().length > 0) {
    input.result.references.push({
      kind: input.kind,
      sourceId: input.sourceId,
      sourcePath: input.sourcePath,
      fieldPath: input.fieldPath,
      targetId: input.value,
      expectedTargetKind: input.expectedTargetKind
    });
    return;
  }

  if (input.value !== undefined) {
    input.result.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'warning',
        code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
        message: 'Resolver V2 reference value must be a non-empty string.',
        sourceId: input.sourceId,
        sourcePath: input.sourcePath,
        fieldPath: input.fieldPath,
        expectedTargetKind: input.expectedTargetKind
      })
    );
  }
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function hasOwn(record: Record<string, unknown>, key: string): boolean { return Object.prototype.hasOwnProperty.call(record, key); }

function sortedKeys(record: Record<string, unknown>): string[] { return Object.keys(record).sort(compareCodeUnits); }

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
