import { z } from 'zod';

import { isSemanticId, parseSemanticId } from '../semantic-address.js';
import type { SemanticEditIntent } from '../types.js';
import { isSafePathSegment, type FixBlankPreviewRepairConfig } from './fix-blank-preview-operations.js';

export type FixBlankPreviewRepairPayload = {
  ensureRenderableEntity?: boolean;
  ensureCameraSeesSpawn?: boolean;
  ensureBackgroundVisible?: boolean;
  ensureAssetBindings?: boolean;
  primaryEntityId?: string;
  viewport?: {
    width?: number;
    height?: number;
  };
  spawn?: {
    x?: number;
    y?: number;
  };
  marker?: {
    key?: string;
    id?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  background?: {
    type?: string;
    visible?: boolean;
  };
  fallbackAsset?: {
    key?: string;
    type?: string;
    shape?: string;
    width?: number;
    height?: number;
  };
};

const FixBlankPreviewRepairPayloadSchema = z
  .object({
    ensureRenderableEntity: z.boolean().optional(),
    ensureCameraSeesSpawn: z.boolean().optional(),
    ensureBackgroundVisible: z.boolean().optional(),
    ensureAssetBindings: z.boolean().optional(),
    primaryEntityId: z.string().optional(),
    viewport: z
      .object({
        width: z.number().positive().optional(),
        height: z.number().positive().optional()
      })
      .optional(),
    spawn: z
      .object({
        x: z.number().finite().optional(),
        y: z.number().finite().optional()
      })
      .optional(),
    marker: z
      .object({
        key: z.string().min(1).optional(),
        id: z.string().min(1).optional(),
        x: z.number().finite().optional(),
        y: z.number().finite().optional(),
        width: z.number().positive().optional(),
        height: z.number().positive().optional()
      })
      .optional(),
    background: z
      .object({
        type: z.string().min(1).optional(),
        visible: z.boolean().optional()
      })
      .optional(),
    fallbackAsset: z
      .object({
        key: z.string().min(1).optional(),
        type: z.string().min(1).optional(),
        shape: z.string().min(1).optional(),
        width: z.number().positive().optional(),
        height: z.number().positive().optional()
      })
      .optional()
  })
  .passthrough();

const DEFAULT_FIX_BLANK_PREVIEW_REPAIR: FixBlankPreviewRepairConfig = {
  ensureRenderableEntity: true,
  ensureCameraSeesSpawn: true,
  ensureBackgroundVisible: true,
  ensureAssetBindings: true,
  primaryEntityId: 'entity:player',
  viewport: {
    width: 800,
    height: 600
  },
  spawn: {
    x: 160,
    y: 320
  },
  marker: {
    key: 'debug_visible_marker',
    id: 'entity:debug_visible_marker',
    x: 160,
    y: 320,
    width: 64,
    height: 64
  },
  background: {
    type: 'solid',
    visible: true
  },
  fallbackAsset: {
    key: 'missing_sprite',
    type: 'generated_shape',
    shape: 'rectangle',
    width: 32,
    height: 32
  }
};

export function buildRepairConfig(
  defaults: Partial<FixBlankPreviewRepairPayload> | undefined,
  payload: SemanticEditIntent['payload']
): FixBlankPreviewRepairConfig {
  const parsedDefaults = parsePayload(defaults ?? {});
  const parsedPayload = parsePayload(payload);
  return mergeRepairPayload(mergeRepairPayload(DEFAULT_FIX_BLANK_PREVIEW_REPAIR, parsedDefaults), parsedPayload);
}

export function validateRepairConfig(config: FixBlankPreviewRepairConfig): void {
  if (!isSemanticId(config.primaryEntityId)) {
    throw new Error(`fix_blank_preview primaryEntityId must be a semantic id: ${config.primaryEntityId}`);
  }

  if (!isSafePathSegment(config.marker.key) || !isSafePathSegment(config.fallbackAsset.key)) {
    throw new Error('fix_blank_preview marker and fallback keys must be safe semantic path segments.');
  }

  if (!isSemanticId(config.marker.id)) {
    throw new Error(`fix_blank_preview marker id must be a semantic id: ${config.marker.id}`);
  }

  const primaryEntity = parseSemanticId(config.primaryEntityId);
  if (primaryEntity?.name === config.marker.key) {
    throw new Error(`fix_blank_preview marker key collides with primary entity: ${config.marker.key}`);
  }
}

function parsePayload(payload: Record<string, unknown> | Partial<FixBlankPreviewRepairPayload>): Partial<FixBlankPreviewRepairPayload> {
  const parsed = FixBlankPreviewRepairPayloadSchema.safeParse(payload);
  if (parsed.success) {
    return parsed.data;
  }

  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
    .join('; ');
  throw new Error(`fix_blank_preview payload failed schema validation: ${issues}`);
}

function mergeRepairPayload(
  base: FixBlankPreviewRepairConfig,
  override: Partial<FixBlankPreviewRepairPayload>
): FixBlankPreviewRepairConfig {
  return {
    ...base,
    ...definedObjectFields(override),
    viewport: {
      ...base.viewport,
      ...definedObjectFields(override.viewport)
    },
    spawn: {
      ...base.spawn,
      ...definedObjectFields(override.spawn)
    },
    marker: {
      ...base.marker,
      ...definedObjectFields(override.marker)
    },
    background: {
      ...base.background,
      ...definedObjectFields(override.background)
    },
    fallbackAsset: {
      ...base.fallbackAsset,
      ...definedObjectFields(override.fallbackAsset)
    }
  };
}

function definedObjectFields<T extends Record<string, unknown>>(value: T | undefined): Partial<T> {
  if (value === undefined) {
    return {};
  }

  return Object.fromEntries(Object.entries(value).filter(([, child]) => child !== undefined)) as Partial<T>;
}
