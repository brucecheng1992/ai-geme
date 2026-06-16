import { SemanticEditIntentSchema } from '../semantic-editing/index.js';
import type { SemanticEditIntent } from '../semantic-editing/index.js';
import type { CreateLiveSemanticEditIntentOptions, LiveSemanticEditCommand } from './types.js';

export function createLiveSemanticEditIntent(
  command: LiveSemanticEditCommand,
  options: CreateLiveSemanticEditIntentOptions = {}
): SemanticEditIntent {
  const sequence = options.sequence ?? 0;
  const id = options.createIntentId?.(command, sequence) ?? `semantic_edit:live:${command.kind}:${sequence}`;
  const intent = createIntentDraft(command, id);
  return SemanticEditIntentSchema.parse(intent);
}

function createIntentDraft(command: LiveSemanticEditCommand, id: string): SemanticEditIntent {
  const sceneTarget = command.sceneTarget ?? 'scene:main';
  const entityId = command.entityId ?? 'entity:player';

  if (command.kind === 'fix_blank_preview') {
    return {
      id,
      kind: 'fix_blank_preview',
      target: command.target ?? sceneTarget,
      reason: {
        source: 'workbench',
        message: command.message ?? 'Repair blank preview semantics.'
      },
      payload: {
        ensureRenderableEntity: true,
        ensureCameraSeesSpawn: true,
        ensureBackgroundVisible: true,
        ensureAssetBindings: true
      },
      constraints: {
        preserveGameplay: true,
        preserveAssets: true,
        noGeneratedCodeEdit: true
      }
    };
  }

  if (command.kind === 'move_entity') {
    return {
      id,
      kind: 'move_entity',
      target: command.target ?? entityId,
      reason: {
        source: 'workbench',
        message: command.message ?? 'Move entity transform.'
      },
      payload: {
        x: command.x,
        y: command.y,
        sceneTarget
      },
      constraints: {
        preserveGameplay: true,
        preserveAssets: true,
        preserveEntityIds: true,
        noGeneratedCodeEdit: true
      }
    };
  }

  if (command.kind === 'adjust_camera') {
    return {
      id,
      kind: 'adjust_camera',
      target: command.target ?? sceneTarget,
      reason: {
        source: 'workbench',
        message: command.message ?? 'Adjust camera follow target.'
      },
      payload: {
        follow: entityId
      },
      constraints: {
        preserveGameplay: true,
        preserveAssets: true,
        preserveEntityIds: true,
        noGeneratedCodeEdit: true
      }
    };
  }

  if (command.kind === 'bind_asset') {
    return {
      id,
      kind: 'bind_asset',
      target: command.target ?? entityId,
      reason: {
        source: 'workbench',
        message: command.message ?? 'Bind entity sprite asset.'
      },
      payload: {
        asset: command.assetId
      },
      constraints: {
        preserveGameplay: true,
        preserveEntityIds: true,
        noGeneratedCodeEdit: true
      }
    };
  }

  return {
    id,
    kind: 'modify_rule',
    target: command.target ?? sceneTarget,
    reason: {
      source: 'workbench',
      message: 'Unsupported live semantic edit command.'
    },
    payload: {},
    constraints: {
      noGeneratedCodeEdit: true
    }
  };
}
