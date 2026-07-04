import { createHash } from 'node:crypto';

import type { ArtAssetMetadata } from './art-asset-metadata.schema.js';
import type { AssetIntent } from './asset-intent-manifest.js';
import {
  DETERMINISTIC_FAKE_ART_PROVIDER_CAPABILITIES,
  type ArtProvider,
  type ArtProviderFailure,
  type ArtProviderRequest,
  type ArtProviderResult,
  type ArtProviderSuccess
} from './art-provider-contract.js';
import type { ArtSourceManifestRecord } from './art-source-manifest.js';

export const DETERMINISTIC_FAKE_ART_PROVIDER_ID = 'deterministic_fake_art_provider' as const;

export type FakeArtProviderMode = 'success' | 'malformed' | 'failure';
export type ArtProviderGenerationFailure = ArtProviderFailure;
export type ArtProviderGenerationSuccess = ArtProviderSuccess;
export type ArtProviderGenerationResult = ArtProviderResult;

export type DeterministicFakeArtProviderOptions = {
  mode?: FakeArtProviderMode;
};

export function createDeterministicFakeArtProvider(options: DeterministicFakeArtProviderOptions = {}): ArtProvider {
  const mode = options.mode ?? 'success';
  let calls = 0;

  return {
    providerId: DETERMINISTIC_FAKE_ART_PROVIDER_ID,
    mode: 'deterministic_fake',
    capabilities: DETERMINISTIC_FAKE_ART_PROVIDER_CAPABILITIES,
    get calls() {
      return calls;
    },
    async generate(request: ArtProviderRequest): Promise<ArtProviderGenerationResult> {
      calls += 1;
      const intent = request.intent;

      if (mode === 'failure') {
        return {
          ok: false,
          providerId: DETERMINISTIC_FAKE_ART_PROVIDER_ID,
          providerMode: 'deterministic_fake',
          assetIntentId: intent.id,
          errorCode: 'art_provider_generation_failed',
          blocker: 'provider_generation_failed',
          message: `Deterministic fake provider failed for ${intent.id}.`
        };
      }

      if (mode === 'malformed') {
        return {
          ok: true,
          providerId: DETERMINISTIC_FAKE_ART_PROVIDER_ID,
          providerMode: 'deterministic_fake',
          assetIntentId: intent.id,
          outputKind: 'art_source_manifest_record',
          source: {
            source_id: `fake_${toSlug(intent.id)}`,
            asset_id: intent.assetPlanId,
            asset_intent_id: intent.id,
            source_type: 'provider_generated',
            locked: false,
            provider_may_replace: true,
            path: `provider_generated/${toSlug(intent.assetPlanId)}.metadata.json`
          }
        };
      }

      return {
        ok: true,
        providerId: DETERMINISTIC_FAKE_ART_PROVIDER_ID,
        providerMode: 'deterministic_fake',
        assetIntentId: intent.id,
        outputKind: 'art_source_manifest_record',
        source: buildFakeProviderSource(intent)
      };
    }
  };
}

function buildFakeProviderSource(intent: AssetIntent): ArtSourceManifestRecord {
  const width = intent.dimensions?.width ?? intent.dimensions?.frameWidth ?? 64;
  const height = intent.dimensions?.height ?? intent.dimensions?.frameHeight ?? 64;
  const payload = {
    providerId: DETERMINISTIC_FAKE_ART_PROVIDER_ID,
    assetIntentId: intent.id,
    assetPlanId: intent.assetPlanId,
    role: intent.role,
    subject: intent.subject,
    style: intent.style,
    intentHash: intent.cacheKey.intentHash,
    width,
    height
  };
  const contentSha256 = sha256(stableStringify(payload));
  const sourcePath = `provider_generated/${toSlug(intent.assetPlanId)}.metadata.json`;

  return {
    source_id: `fake_${toSlug(intent.id)}`,
    asset_id: intent.assetPlanId,
    asset_intent_id: intent.id,
    source_type: 'provider_generated',
    locked: false,
    provider_may_replace: true,
    path: sourcePath,
    content_type: 'metadata/json',
    width,
    height,
    intended_use: toSlug(intent.role),
    style_tags: uniqueTags(['stylized', toSlug(intent.style)]),
    content_sha256: contentSha256,
    review_status: 'review_required',
    provenance: [`${DETERMINISTIC_FAKE_ART_PROVIDER_ID}:${intent.cacheKey.intentHash}`],
    metadata: buildProviderMetadata(intent, sourcePath, width, height)
  };
}

function buildProviderMetadata(intent: AssetIntent, sourcePath: string, width: number, height: number): ArtAssetMetadata {
  const roleProfile = metadataRoleProfile(intent.role);
  return {
    asset_id: metadataAssetId(intent.assetPlanId),
    project_code: 'proj_loop4',
    asset_type: roleProfile.assetType,
    asset_subtype: roleProfile.assetSubtype,
    title: titleFor(intent.subject),
    description: `Deterministic fake provider metadata for ${intent.subject}.`,
    version: '1.0.0',
    status: 'generated',
    semantic: {
      world: 'loop4_test_world',
      subject: uniqueTags([toSlug(intent.subject), toSlug(intent.assetPlanId)]),
      semantic_tags: uniqueTags([toSlug(intent.subject), toSlug(intent.role), toSlug(intent.assetPlanId)]),
      visual_style: ['stylized'],
      mood: roleProfile.mood
    },
    gameplay: {
      gameplay_role: roleProfile.gameplayRole,
      affordances: roleProfile.affordances,
      allowed_contexts: ['loop4_test_world'],
      blocked_contexts: []
    },
    technical: {
      source_path: sourcePath,
      thumbnail_path: sourcePath,
      file_format: 'json',
      engine_targets: ['web'],
      texture_resolution: `${width}x${height}`,
      polycount_lod0: 0,
      platform_budget: ['desktop', 'mobile']
    },
    ai_generation: {
      generated_by_ai: true,
      ai_system_used: DETERMINISTIC_FAKE_ART_PROVIDER_ID,
      ai_system_version: 'v0.1',
      prompt_summary: `deterministic metadata for ${intent.subject}`,
      negative_prompt_summary: null,
      seed: intent.cacheKey.intentHash.slice(0, 16),
      human_edit_level: 'ai_generated'
    },
    rights: {
      creator: DETERMINISTIC_FAKE_ART_PROVIDER_ID,
      owner: 'loop4_test',
      license: 'internal_project_only',
      commercial_use: false,
      training_use_allowed: false,
      third_party_sources: [],
      rights_risk_level: 'low'
    },
    workflow: {
      owner: 'loop4_test',
      reviewed_by: null,
      review_notes: 'Deterministic fake provider output requires review before production use.',
      updated_at: '2026-07-04',
      approved_at: null
    },
    relations: {
      derived_from: [],
      depends_on: [],
      compatible_with: [],
      used_by: ['loop4_test']
    },
    search: {
      embedding_input: `deterministic ${intent.role} ${intent.subject}`
    }
  };
}

function metadataRoleProfile(role: AssetIntent['role']): {
  assetType: ArtAssetMetadata['asset_type'];
  assetSubtype: string;
  gameplayRole: ArtAssetMetadata['gameplay']['gameplay_role'];
  affordances: ArtAssetMetadata['gameplay']['affordances'];
  mood: NonNullable<ArtAssetMetadata['semantic']['mood']>;
} {
  if (role === 'player_sprite') {
    return {
      assetType: 'character',
      assetSubtype: 'sprite',
      gameplayRole: ['player_character'],
      affordances: ['animated'],
      mood: ['heroic']
    };
  }
  if (role === 'enemy_sprite') {
    return {
      assetType: 'creature',
      assetSubtype: 'sprite',
      gameplayRole: ['enemy'],
      affordances: ['animated'],
      mood: ['dangerous']
    };
  }
  if (role === 'projectile_sprite') {
    return {
      assetType: 'weapon',
      assetSubtype: 'projectile',
      gameplayRole: ['projectile'],
      affordances: ['physics_object'],
      mood: ['dangerous']
    };
  }
  if (role === 'background_layer' || role === 'terrain_tileset') {
    return {
      assetType: 'environment',
      assetSubtype: role === 'terrain_tileset' ? 'tileset' : 'background',
      gameplayRole: ['environment'],
      affordances: ['ambient'],
      mood: ['warm']
    };
  }
  if (role === 'ui_element') {
    return {
      assetType: 'ui',
      assetSubtype: 'icon',
      gameplayRole: ['ui', 'icon'],
      affordances: ['inventory_action'],
      mood: ['friendly']
    };
  }
  return {
    assetType: 'prop',
    assetSubtype: 'collectible',
    gameplayRole: role === 'goal_sprite' ? ['collectible'] : ['decoration'],
    affordances: role === 'goal_sprite' ? ['collectible'] : ['decorative'],
    mood: ['warm']
  };
}

function metadataAssetId(assetPlanId: string): string {
  return `asset_${toSlug(assetPlanId)}_001`;
}

function titleFor(value: string): string {
  return toSlug(value)
    .split('_')
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join(' ');
}

function uniqueTags(values: string[]): string[] {
  return [...new Set(values.map(toSlug).filter((value) => value.length > 0))].slice(0, 12);
}

function toSlug(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/_+/g, '_');
  return slug.length < 2 ? 'asset' : slug.slice(0, 63);
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
