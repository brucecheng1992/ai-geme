import { isSemanticId } from '../semantic-editing/index.js';
import type { ResolverV2AssetKind } from './types.js';

export const SPRITE_ASSET_KINDS: ResolverV2AssetKind[] = ['image', 'sprite', 'generated_shape', 'atlas'];
export const AUDIO_ASSET_KINDS: ResolverV2AssetKind[] = ['audio'];
export const FONT_ASSET_KINDS: ResolverV2AssetKind[] = ['font'];

const UNSAFE_REFERENCE_SEGMENTS = new Set(['src', 'dist', 'build', 'apps', 'packages', 'generated', 'phaser']);
const CODE_FILE_EXTENSION_PATTERN = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/i;
const ASSET_FILE_EXTENSION_PATTERN = /\.(?:png|jpg|jpeg|gif|webp|svg|mp3|wav|ogg|m4a|ttf|otf|woff|woff2)$/i;

export type ResolverV2ReferenceTargetClassification =
  | { ok: true }
  | { ok: false; code: 'INVALID_RESOLVER_SEMANTIC_ID' | 'UNSAFE_RESOLVER_REFERENCE' };

export function classifyResolverV2ReferenceTarget(targetId: string): ResolverV2ReferenceTargetClassification {
  if (isSemanticId(targetId)) {
    return { ok: true };
  }

  if (isUnsafeResolverV2PathLike(targetId)) {
    return { ok: false, code: 'UNSAFE_RESOLVER_REFERENCE' };
  }

  return { ok: false, code: 'INVALID_RESOLVER_SEMANTIC_ID' };
}

export function isUnsafeResolverV2AssetSource(source: string): boolean {
  return isGeneratedOrWorkspacePath(source) || CODE_FILE_EXTENSION_PATTERN.test(source);
}

function isUnsafeResolverV2PathLike(value: string): boolean {
  return (
    value.startsWith('/') ||
    value.startsWith('./') ||
    value.includes('\\') ||
    value.includes('\0') ||
    value.includes('..') ||
    CODE_FILE_EXTENSION_PATTERN.test(value) ||
    ASSET_FILE_EXTENSION_PATTERN.test(value) ||
    isGeneratedOrWorkspacePath(value)
  );
}

function isGeneratedOrWorkspacePath(value: string): boolean {
  return value
    .split(/[/:\\]/)
    .filter((segment) => segment.length > 0 && segment !== '.')
    .some((segment) => UNSAFE_REFERENCE_SEGMENTS.has(segment));
}
