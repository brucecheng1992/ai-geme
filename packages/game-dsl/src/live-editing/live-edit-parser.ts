import { isSemanticId, parseSemanticId } from '../semantic-editing/index.js';
import type {
  LiveSemanticEditCommand,
  LiveSemanticEditParseFailure,
  LiveSemanticEditParseResult,
  ParseLiveSemanticEditTextOptions
} from './types.js';

const DEFAULT_SCENE_TARGET = 'scene:main' as const;
const DEFAULT_ENTITY_ID = 'entity:player' as const;
const COORDINATE_PATTERN = /(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)/u;
const SEMANTIC_ID_PATTERN = /(?<![a-z0-9_:])(?:project|scene|entity|asset|system|rule|camera|input|physics):[a-z][a-z0-9_]{0,63}(?![a-z0-9_:-])/u;
const ASSET_ID_PATTERN = /(?<![a-z0-9_:])asset:[a-z][a-z0-9_]{0,63}(?![a-z0-9_:-])/u;
const ENTITY_ID_PATTERN = /(?<![a-z0-9_:])entity:[a-z][a-z0-9_]{0,63}(?![a-z0-9_:-])/u;

export function parseLiveSemanticEditText(
  text: string,
  options: ParseLiveSemanticEditTextOptions = {}
): LiveSemanticEditParseResult {
  const raw = text.trim();
  if (raw.length === 0) {
    return failure('empty_input', 'Live semantic edit text is empty.');
  }

  const normalized = normalizeText(raw);
  if (containsUnsafeTarget(raw, normalized)) {
    return failure('unsafe_target', 'Live semantic edit rejected a path, generated-code target, or runtime command.');
  }

  const defaults = {
    sceneTarget: options.defaultSceneTarget ?? DEFAULT_SCENE_TARGET,
    entityId: options.defaultEntityId ?? DEFAULT_ENTITY_ID
  };

  try {
    if (looksLikeFixBlankPreview(normalized)) {
      return command({
        kind: 'fix_blank_preview',
        target: defaults.sceneTarget,
        sceneTarget: defaults.sceneTarget,
        confidence: 'high',
        message: 'Repair blank preview semantics.'
      });
    }

    if (looksLikeMoveCommand(normalized)) {
      return parseMoveCommand(raw, normalized, defaults);
    }

    if (looksLikeCameraCommand(normalized)) {
      return parseCameraCommand(raw, defaults);
    }

    if (looksLikeBindAssetCommand(normalized)) {
      return parseBindAssetCommand(raw, defaults);
    }
  } catch {
    return failure('parse_error', 'Live semantic edit parser failed to read the command safely.');
  }

  return failure('unsupported_command', 'Live semantic edit command is not supported by the deterministic MVP parser.');
}

function parseMoveCommand(
  raw: string,
  normalized: string,
  defaults: { sceneTarget: `scene:${string}`; entityId: `entity:${string}` }
): LiveSemanticEditParseResult {
  const coordinates = COORDINATE_PATTERN.exec(raw);
  if (coordinates === null) {
    return failure('ambiguous_command', 'Move commands must include finite x and y coordinates.');
  }

  const x = Number(coordinates[1]);
  const y = Number(coordinates[2]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return failure('ambiguous_command', 'Move command coordinates must be finite numbers.');
  }

  const entityId = readEntityId(raw, normalized, defaults.entityId);
  if (entityId === null) {
    return failure('ambiguous_command', 'Move command target must be a semantic entity id or the default player.');
  }

  return command({
    kind: 'move_entity',
    target: entityId,
    sceneTarget: defaults.sceneTarget,
    entityId,
    x,
    y,
    confidence: 'high',
    message: 'Move entity transform.'
  });
}

function parseCameraCommand(
  raw: string,
  defaults: { sceneTarget: `scene:${string}`; entityId: `entity:${string}` }
): LiveSemanticEditParseResult {
  const entityId = readEntityId(raw, normalizeText(raw), defaults.entityId);
  if (entityId === null) {
    return failure('ambiguous_command', 'Camera follow command target must be a semantic entity id or the default player.');
  }

  return command({
    kind: 'adjust_camera',
    target: defaults.sceneTarget,
    sceneTarget: defaults.sceneTarget,
    entityId,
    confidence: 'high',
    message: 'Adjust camera follow target.'
  });
}

function parseBindAssetCommand(
  raw: string,
  defaults: { sceneTarget: `scene:${string}`; entityId: `entity:${string}` }
): LiveSemanticEditParseResult {
  const assetMatch = ASSET_ID_PATTERN.exec(raw);
  if (assetMatch === null) {
    return failure('ambiguous_command', 'Asset binding commands must use a semantic asset id such as asset:player_sprite.');
  }

  const assetId = assetMatch[0] as `asset:${string}`;
  if (parseSemanticId(assetId)?.kind !== 'asset') {
    return failure('unsafe_target', 'Asset binding target must be a semantic asset id.');
  }

  const normalized = normalizeText(raw);
  const entityId = readEntityId(raw, normalized, defaults.entityId);
  if (entityId === null) {
    return failure('ambiguous_command', 'Asset binding entity target must be a semantic entity id or the default player.');
  }

  return command({
    kind: 'bind_asset',
    target: entityId,
    sceneTarget: defaults.sceneTarget,
    entityId,
    assetId,
    confidence: 'high',
    message: 'Bind entity sprite asset.'
  });
}

function command(command: Omit<LiveSemanticEditCommand, 'warnings'> & { warnings?: string[] }): LiveSemanticEditParseResult {
  return {
    ok: true,
    command: {
      ...command,
      warnings: command.warnings ?? []
    }
  };
}

function failure(
  reason: LiveSemanticEditParseFailure['reason'],
  message: string,
  warnings: string[] = []
): LiveSemanticEditParseFailure {
  return {
    ok: false,
    reason,
    message,
    warnings
  };
}

function looksLikeFixBlankPreview(normalized: string): boolean {
  return (
    normalized.includes('fix blank preview') ||
    normalized.includes('repair blank preview') ||
    normalized.includes('fix blank screen') ||
    normalized.includes('blank preview') ||
    normalized.includes('修复空白预览') ||
    normalized.includes('修复黑屏') ||
    normalized.includes('空白预览')
  );
}

function looksLikeMoveCommand(normalized: string): boolean {
  return (
    /\bmove\b/u.test(normalized) ||
    normalized.includes('移动') ||
    normalized.includes('移到') ||
    normalized.includes('放到')
  );
}

function looksLikeCameraCommand(normalized: string): boolean {
  return (
    (normalized.includes('camera') && normalized.includes('follow')) ||
    normalized.includes('摄像机跟随') ||
    normalized.includes('镜头跟随') ||
    normalized.includes('相机跟随')
  );
}

function looksLikeBindAssetCommand(normalized: string): boolean {
  return (
    (normalized.includes('bind') && normalized.includes('asset')) ||
    (normalized.includes('sprite') && normalized.includes('asset:')) ||
    normalized.includes('绑定') ||
    normalized.includes('贴图')
  );
}

function readEntityId(raw: string, normalized: string, defaultEntityId: `entity:${string}`): `entity:${string}` | null {
  const explicit = ENTITY_ID_PATTERN.exec(raw)?.[0];
  if (explicit !== undefined && isSemanticId(explicit) && parseSemanticId(explicit)?.kind === 'entity') {
    return explicit as `entity:${string}`;
  }

  if (raw.includes('entity:') || hasUnsupportedEntityTarget(normalized)) {
    return null;
  }

  if (mentionsDefaultEntity(normalized)) {
    return defaultEntityId;
  }

  return defaultEntityId;
}

function mentionsDefaultEntity(normalized: string): boolean {
  return (
    normalized.includes('player') ||
    normalized.includes('玩家') ||
    normalized.includes('主角') ||
    normalized.includes('hero')
  );
}

function hasUnsupportedEntityTarget(normalized: string): boolean {
  const englishTarget =
    /\bmove\s+(?!to\b)(.+?)\s+(?:to|at)\b/u.exec(normalized)?.[1] ??
    /\bbind\s+(.+?)\s+(?:sprite\s+)?to\s+asset:/u.exec(normalized)?.[1] ??
    /\bfollow\s+(.+?)$/u.exec(normalized)?.[1];
  if (englishTarget !== undefined && englishTarget.trim().length > 0 && !mentionsDefaultEntity(englishTarget)) {
    return true;
  }

  const chineseTarget =
    /把(.+?)(?:移动到|移动|移到|放到)/u.exec(normalized)?.[1] ??
    /(?:摄像机|镜头|相机)跟随(.+?)$/u.exec(normalized)?.[1] ??
    /绑定(.+?)(?:贴图|sprite|到)/u.exec(normalized)?.[1];
  return chineseTarget !== undefined && chineseTarget.trim().length > 0 && !mentionsDefaultEntity(chineseTarget);
}

function containsUnsafeTarget(raw: string, normalized: string): boolean {
  if (/run\s+(?:phaser|code)|execute\s+(?:phaser|code)|运行.*(?:phaser|代码)/iu.test(normalized)) {
    return true;
  }

  const pathLikePattern = /(?:^|\s)(?:\.{1,2}\/|\/|[A-Za-z]:\\)|\\|\0|(?:packages|apps|src|dist|build|generated|phaser)[/\\:]|(?:\.ts|\.tsx|\.js|\.jsx|\.mjs|\.cjs)(?:\s|$)|(?:\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg|\.mp3|\.wav|\.ogg|\.m4a|\.ttf|\.otf|\.woff2?)(?:\s|$)/iu;
  if (pathLikePattern.test(raw)) {
    return true;
  }

  const semanticMatch = SEMANTIC_ID_PATTERN.exec(raw)?.[0];
  if (semanticMatch !== undefined && !isSemanticId(semanticMatch)) {
    return true;
  }

  return false;
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/gu, ' ');
}
