import { createResolverV2Diagnostic } from './diagnostics.js';
import { AUDIO_ASSET_KINDS, FONT_ASSET_KINDS, SPRITE_ASSET_KINDS } from './asset-reference-rules.js';
import {
  collectStringReference,
  hasOwn,
  isPlainRecord,
  readString,
  sortedKeys,
  type ResolverV2ReferenceExtractionResult
} from './reference-extractor-shared.js';

export type { ResolverV2ReferenceExtractionResult } from './reference-extractor-shared.js';

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

  const result: ResolverV2ReferenceExtractionResult = { references: [], diagnostics: [] };

  const scenes = document.scenes;
  if (scenes !== undefined && !isPlainRecord(scenes)) {
    result.diagnostics.push(
      createResolverV2Diagnostic({
        severity: 'warning',
        code: 'RESOLVER_UNSUPPORTED_REFERENCE_SHAPE',
        message: 'Resolver V2 scenes must be an object.',
        sourcePath: '/scenes'
      })
    );
  } else if (scenes !== undefined) {
    collectSceneContainerReferences(scenes, result);
  }

  return result;
}

function collectSceneContainerReferences(
  scenes: Record<string, unknown>,
  result: ResolverV2ReferenceExtractionResult
): void {
  for (const sceneKey of sortedKeys(scenes)) {
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
      continue;
    }

    collectSceneReferences(scene, sceneKey, result);
  }
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
  if (isPlainRecord(sprite) && hasOwn(sprite, 'asset')) {
    collectStringReference({
      value: sprite.asset,
      kind: 'sprite_asset',
      sourceId: entityId,
      sourcePath: entityPath,
      fieldPath: `${spritePath}/asset`,
      expectedTargetKind: 'asset',
      expectedAssetKinds: SPRITE_ASSET_KINDS,
      result
    });
  }

  const audioPath = `${entityPath}/components/audio`;
  const audio = isPlainRecord(components) ? components.audio : undefined;
  if (isPlainRecord(audio) && hasOwn(audio, 'asset')) {
    collectStringReference({
      value: audio.asset,
      kind: 'audio_asset',
      sourceId: entityId,
      sourcePath: entityPath,
      fieldPath: `${audioPath}/asset`,
      expectedTargetKind: 'asset',
      expectedAssetKinds: AUDIO_ASSET_KINDS,
      result
    });
  }

  const soundPath = `${entityPath}/components/sound`;
  const sound = isPlainRecord(components) ? components.sound : undefined;
  if (isPlainRecord(sound) && hasOwn(sound, 'asset')) {
    collectStringReference({
      value: sound.asset,
      kind: 'audio_asset',
      sourceId: entityId,
      sourcePath: entityPath,
      fieldPath: `${soundPath}/asset`,
      expectedTargetKind: 'asset',
      expectedAssetKinds: AUDIO_ASSET_KINDS,
      result
    });
  }

  const textPath = `${entityPath}/components/text`;
  const text = isPlainRecord(components) ? components.text : undefined;
  if (isPlainRecord(text) && hasOwn(text, 'fontAsset')) {
    collectStringReference({
      value: text.fontAsset,
      kind: 'font_asset',
      sourceId: entityId,
      sourcePath: entityPath,
      fieldPath: `${textPath}/fontAsset`,
      expectedTargetKind: 'asset',
      expectedAssetKinds: FONT_ASSET_KINDS,
      result
    });
  }

  const nestedFont = isPlainRecord(text) && isPlainRecord(text.font) ? text.font : undefined;
  if (nestedFont !== undefined && hasOwn(nestedFont, 'asset')) {
    collectStringReference({
      value: nestedFont.asset,
      kind: 'font_asset',
      sourceId: entityId,
      sourcePath: entityPath,
      fieldPath: `${textPath}/font/asset`,
      expectedTargetKind: 'asset',
      expectedAssetKinds: FONT_ASSET_KINDS,
      result
    });
  }
}
