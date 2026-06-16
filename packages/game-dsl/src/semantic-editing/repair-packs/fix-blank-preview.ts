import type { SemanticIndexEntry } from '../semantic-index.js';
import type { SemanticPatchPlannerHandler, SemanticPatchPlannerHandlers } from '../patch-planner.js';
import { buildRepairConfig, validateRepairConfig, type FixBlankPreviewRepairPayload } from './fix-blank-preview-config.js';
import {
  assertMarkerTargetCanBeRepaired,
  createBackgroundValue,
  createCameraValue,
  createDocumentOperationPlanner,
  createFallbackAssetValue,
  type FixBlankPreviewRepairConfig,
  createMarkerValue,
  createSpawnValue,
  validateScenePath
} from './fix-blank-preview-operations.js';

export const FIX_BLANK_PREVIEW_REPAIR_KIND = 'fix_blank_preview' as const;

export type FixBlankPreviewRepairHandlerOptions = {
  document: unknown;
  scenePath?: string;
  defaults?: Partial<FixBlankPreviewRepairPayload>;
};

/**
 * Creates a planner handler that only emits semantic SSOT operations for blank-preview repair.
 */
export function createFixBlankPreviewRepairHandler(options: FixBlankPreviewRepairHandlerOptions): SemanticPatchPlannerHandler {
  return ({ intent, target }) => {
    const config = buildRepairConfig(options.defaults, intent.payload);
    validateRepairConfig(config);

    if (!hasEnabledRepairSection(config)) {
      return [];
    }

    const scenePath = resolveFixBlankPreviewScenePath(target, options.scenePath);
    const planner = createDocumentOperationPlanner(options.document);
    let sceneContainerEnsured = false;
    const ensureSceneContainer = () => {
      if (sceneContainerEnsured) {
        return;
      }

      planner.ensureObjectContainer('/scenes');
      planner.ensureObjectContainer(scenePath);
      sceneContainerEnsured = true;
    };

    if (config.ensureBackgroundVisible) {
      ensureSceneContainer();
      planner.ensureValue(`${scenePath}/background`, createBackgroundValue(planner.getValue(`${scenePath}/background`), config));
    }

    if (config.ensureCameraSeesSpawn) {
      ensureSceneContainer();
      planner.ensureValue(`${scenePath}/camera`, createCameraValue(planner.getValue(`${scenePath}/camera`), config));
      planner.ensureObjectContainer(`${scenePath}/spawn`);
      planner.ensureValue(`${scenePath}/spawn/player`, createSpawnValue(planner.getValue(`${scenePath}/spawn/player`), config));
    }

    if (config.ensureRenderableEntity) {
      ensureSceneContainer();
      planner.ensureObjectContainer(`${scenePath}/entities`);
      const markerPath = `${scenePath}/entities/${config.marker.key}`;
      const existingMarker = planner.getValue(markerPath);
      assertMarkerTargetCanBeRepaired(existingMarker, config);
      planner.ensureValue(
        markerPath,
        createMarkerValue(existingMarker, config)
      );
    }

    if (config.ensureAssetBindings) {
      planner.ensureObjectContainer('/assets');
      planner.ensureObjectContainer('/assets/fallbacks');
      planner.ensureValue(
        `/assets/fallbacks/${config.fallbackAsset.key}`,
        createFallbackAssetValue(planner.getValue(`/assets/fallbacks/${config.fallbackAsset.key}`), config)
      );
    }

    return planner.operations;
  };
}

export function createFixBlankPreviewRepairHandlers(options: FixBlankPreviewRepairHandlerOptions): SemanticPatchPlannerHandlers {
  return {
    fix_blank_preview: createFixBlankPreviewRepairHandler(options)
  };
}

function resolveFixBlankPreviewScenePath(target: SemanticIndexEntry, explicitScenePath?: string): string {
  if (explicitScenePath !== undefined) {
    return validateScenePath(explicitScenePath, 'explicit scenePath');
  }

  if (target.kind !== 'scene') {
    throw new Error(`fix_blank_preview requires a scene target, got ${target.id}.`);
  }

  if (target.path.startsWith('/scenes/')) {
    return validateScenePath(target.path, `target path for ${target.id}`);
  }

  throw new Error(
    `fix_blank_preview target ${target.id} must resolve to an explicit /scenes/{sceneKey} SSOT path or provide scenePath.`
  );
}

function hasEnabledRepairSection(config: FixBlankPreviewRepairConfig): boolean {
  return (
    config.ensureBackgroundVisible ||
    config.ensureCameraSeesSpawn ||
    config.ensureRenderableEntity ||
    config.ensureAssetBindings
  );
}
