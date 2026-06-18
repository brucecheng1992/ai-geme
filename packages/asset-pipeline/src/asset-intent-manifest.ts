import { createHash } from 'node:crypto';

import { z } from 'zod';

import type { SceneIr } from '../../game-dsl/src/index.js';
import type { AssetResolutionReport } from './resolution-report.js';
import type { AssetPlan, AssetPlanItem } from './schemas.js';

const AssetIntentIdSchema = z.string().regex(/^[a-z][a-z0-9_.-]{1,79}$/);
const AssetPlanIdSchema = z.string().regex(/^[a-z][a-z0-9_.-]{1,79}$/);
const SourcePathSchema = z.string().regex(/^\//).refine((value) => !value.includes('..'), 'source path must not contain parent traversal');
const AssetIntentRoleSchema = z.enum([
  'background_layer',
  'terrain_tileset',
  'player_sprite',
  'enemy_sprite',
  'projectile_sprite',
  'goal_sprite',
  'decoration',
  'ui_element',
  'audio_event'
]);
const AssetIntentRequiredLevelSchema = z.enum(['core_required', 'request_required', 'optional']);
const AssetIntentCacheKeySchema = z.strictObject({
  version: z.literal('asset-intent-cache-v0.1'),
  intentHash: z.string().regex(/^[a-f0-9]{64}$/),
  styleProfileVersion: z.literal('asset-style-profile-v0.1'),
  providerPolicyVersion: z.literal('asset-provider-policy-v0.1')
});

export const AssetIntentSchema = z.strictObject({
  id: AssetIntentIdSchema,
  assetPlanId: AssetPlanIdSchema,
  role: AssetIntentRoleSchema,
  requiredLevel: AssetIntentRequiredLevelSchema,
  style: z.string().min(1).max(120),
  subject: z.string().min(1).max(120),
  environment: z.string().min(1).max(120).optional(),
  paletteIntent: z.string().min(1).max(120).optional(),
  animationIntent: z.array(z.string().min(1).max(80)).max(12).optional(),
  dimensions: z
    .strictObject({
      width: z.number().int().min(1).optional(),
      height: z.number().int().min(1).optional(),
      frameWidth: z.number().int().min(1).optional(),
      frameHeight: z.number().int().min(1).optional()
    })
    .optional(),
  tiling: z.strictObject({ repeatX: z.boolean().optional(), repeatY: z.boolean().optional() }).optional(),
  sourceDslPaths: z.array(SourcePathSchema).min(1),
  fallbackPolicy: z.strictObject({
    allowed: z.boolean(),
    reason: z.enum(['not_allowed_for_core_required', 'not_allowed_for_request_required', 'allowed_for_optional'])
  }),
  cacheKey: AssetIntentCacheKeySchema
});

export const AssetIntentManifestSchema = z
  .strictObject({
    version: z.literal('asset-intent-manifest-v0.1'),
    projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
    sourceArtifacts: z.strictObject({
      assetPlan: z.literal('asset_plan.json'),
      sceneIr: z.literal('game.scene.ir.json').optional()
    }),
    summary: z.strictObject({
      total: z.number().int().min(0),
      coreRequired: z.number().int().min(0),
      requestRequired: z.number().int().min(0),
      optional: z.number().int().min(0),
      fallbackAllowed: z.number().int().min(0),
      cacheKeyVersion: z.literal('asset-intent-cache-v0.1')
    }),
    intents: z.array(AssetIntentSchema).min(1)
  })
  .superRefine((manifest, ctx) => {
    const seen = new Set<string>();
    for (const [index, intent] of manifest.intents.entries()) {
      if (seen.has(intent.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['intents', index, 'id'],
          message: `duplicate asset intent id: ${intent.id}`
        });
      }
      seen.add(intent.id);
    }

    const summary = summarizeIntents(manifest.intents);
    for (const key of ['total', 'coreRequired', 'requestRequired', 'optional', 'fallbackAllowed'] as const) {
      if (manifest.summary[key] !== summary[key]) {
        ctx.addIssue({
          code: 'custom',
          path: ['summary', key],
          message: `summary.${key} must match asset intents`
        });
      }
    }
  });

export type AssetIntent = z.infer<typeof AssetIntentSchema>;
export type AssetIntentManifest = z.infer<typeof AssetIntentManifestSchema>;

type BuildAssetIntentManifestInput = {
  projectId: string;
  plan: AssetPlan;
  sceneIr?: SceneIr;
};

type SceneIntentRef = {
  id: string;
  role: AssetIntent['role'];
  assetPlanId?: string;
  subject?: string;
  dimensions?: AssetIntent['dimensions'];
  sourceDslPaths: string[];
  tiling?: AssetIntent['tiling'];
};

export function buildAssetIntentManifest(input: BuildAssetIntentManifestInput): AssetIntentManifest {
  const sceneRefs = mergeSceneIntentRefs(collectSceneIntentRefs(input.sceneIr));
  const planRefs = new Map(sceneRefs.filter((ref) => ref.assetPlanId !== undefined).map((ref) => [ref.assetPlanId as string, ref]));
  const planItemIds = new Set(input.plan.items.map((item) => item.id));
  const planBoundIntents = input.plan.items.map((item) => buildAssetIntent(input.plan, item, planRefs.get(item.id)));
  const planBoundIntentIds = new Set(planBoundIntents.map((intent) => intent.id));
  const standaloneIntents = sceneRefs
    .filter((ref) => ref.assetPlanId === undefined || !planItemIds.has(ref.assetPlanId))
    .filter((ref) => !planBoundIntentIds.has(ref.id))
    .map((ref) => buildStandaloneSceneIntent(input.plan, ref));
  const intents = [...planBoundIntents, ...standaloneIntents];

  return AssetIntentManifestSchema.parse({
    version: 'asset-intent-manifest-v0.1',
    projectId: input.projectId,
    sourceArtifacts: {
      assetPlan: 'asset_plan.json',
      sceneIr: input.sceneIr === undefined ? undefined : 'game.scene.ir.json'
    },
    summary: {
      ...summarizeIntents(intents),
      cacheKeyVersion: 'asset-intent-cache-v0.1'
    },
    intents
  });
}

function mergeSceneIntentRefs(refs: SceneIntentRef[]): SceneIntentRef[] {
  const refsById = new Map<string, SceneIntentRef>();
  for (const ref of refs) {
    const existing = refsById.get(ref.id);
    if (existing === undefined) {
      refsById.set(ref.id, { ...ref, sourceDslPaths: unique(ref.sourceDslPaths) });
      continue;
    }

    const preferred = existing.assetPlanId === undefined && ref.assetPlanId !== undefined ? ref : existing;
    refsById.set(ref.id, {
      ...preferred,
      assetPlanId: preferred.assetPlanId ?? existing.assetPlanId ?? ref.assetPlanId,
      subject: preferred.subject ?? existing.subject ?? ref.subject,
      dimensions: preferred.dimensions ?? existing.dimensions ?? ref.dimensions,
      tiling: mergeTiling(existing.tiling, ref.tiling),
      sourceDslPaths: unique([...existing.sourceDslPaths, ...ref.sourceDslPaths])
    });
  }

  return [...refsById.values()];
}

function mergeTiling(left: AssetIntent['tiling'] | undefined, right: AssetIntent['tiling'] | undefined): AssetIntent['tiling'] | undefined {
  if (left === undefined) {
    return right;
  }
  if (right === undefined) {
    return left;
  }
  return {
    repeatX: left.repeatX ?? right.repeatX,
    repeatY: left.repeatY ?? right.repeatY
  };
}

function buildAssetIntent(plan: AssetPlan, item: AssetPlanItem, sceneRef: SceneIntentRef | undefined): AssetIntent {
  const requiredLevel: AssetIntent['requiredLevel'] = sceneRef === undefined ? (item.required ? 'core_required' : 'optional') : 'request_required';
  const intentSeed = {
    id: sceneRef?.id ?? item.id,
    assetPlanId: item.id,
    role: roleForPlanItem(item.role),
    requiredLevel,
    style: plan.style.visual_theme,
    subject: item.subject,
    dimensions: {
      width: item.size.w,
      height: item.size.h
    },
    tiling: sceneRef?.tiling ?? tilingForPlanItem(item),
    sourceDslPaths: sceneRef?.sourceDslPaths ?? sourceDslPathsForPlanItem(item),
    fallbackPolicy: fallbackPolicyFor(requiredLevel)
  };

  return AssetIntentSchema.parse({
    ...intentSeed,
    cacheKey: {
      version: 'asset-intent-cache-v0.1',
      intentHash: sha256(stableStringify(intentSeed)),
      styleProfileVersion: 'asset-style-profile-v0.1',
      providerPolicyVersion: 'asset-provider-policy-v0.1'
    }
  });
}

function buildStandaloneSceneIntent(plan: AssetPlan, sceneRef: SceneIntentRef): AssetIntent {
  const intentSeed = {
    id: sceneRef.id,
    assetPlanId: sceneRef.assetPlanId ?? sceneRef.id,
    role: sceneRef.role,
    requiredLevel: 'request_required' as const,
    style: plan.style.visual_theme,
    subject: sceneRef.subject ?? sceneRef.id,
    dimensions: sceneRef.dimensions,
    tiling: sceneRef.tiling,
    sourceDslPaths: sceneRef.sourceDslPaths,
    fallbackPolicy: fallbackPolicyFor('request_required')
  };

  return AssetIntentSchema.parse({
    ...intentSeed,
    cacheKey: {
      version: 'asset-intent-cache-v0.1',
      intentHash: sha256(stableStringify(intentSeed)),
      styleProfileVersion: 'asset-style-profile-v0.1',
      providerPolicyVersion: 'asset-provider-policy-v0.1'
    }
  });
}

function collectSceneIntentRefs(sceneIr: SceneIr | undefined): SceneIntentRef[] {
  const scene = sceneIr?.scenes[0];
  if (sceneIr === undefined || scene === undefined) {
    return [];
  }

  const refs: SceneIntentRef[] = [];
  scene.backgrounds.forEach((background, index) => {
    if (background.assetIntentRef === undefined) {
      return;
    }
    refs.push({
      id: background.assetIntentRef,
      role: 'background_layer',
      assetPlanId: index === 0 ? 'background_main' : undefined,
      subject: `${background.role} background layer`,
      sourceDslPaths: provenancePaths(sceneIr, background.provenanceRef),
      tiling: background.repeatX === undefined ? undefined : { repeatX: background.repeatX }
    });
  });

  if (scene.player.visualAssetIntentRef !== undefined) {
    refs.push({
      id: scene.player.visualAssetIntentRef,
      role: 'player_sprite',
      assetPlanId: 'player',
      subject: 'player sprite',
      sourceDslPaths: provenancePaths(sceneIr, scene.player.provenanceRef)
    });
  }

  scene.enemyInstances.forEach((enemy, index) => {
    if (enemy.visualAssetIntentRef === undefined) {
      return;
    }
    refs.push({
      id: enemy.visualAssetIntentRef,
      role: 'enemy_sprite',
      assetPlanId: index === 0 ? 'enemy' : undefined,
      subject: `enemy sprite ${enemy.archetypeRef}`,
      sourceDslPaths: provenancePaths(sceneIr, enemy.provenanceRef)
    });
  });

  scene.platforms.forEach((platform, index) => {
    if (platform.visualAssetIntentRef === undefined) {
      return;
    }
    refs.push({
      id: platform.visualAssetIntentRef,
      role: 'terrain_tileset',
      assetPlanId: index === 0 ? 'tileset' : undefined,
      subject: platform.materialRef ?? 'terrain tileset',
      sourceDslPaths: provenancePaths(sceneIr, platform.provenanceRef),
      tiling: { repeatX: true }
    });
  });

  scene.goals.forEach((goal) => {
    if (goal.visualAssetIntentRef === undefined) {
      return;
    }
    refs.push({
      id: goal.visualAssetIntentRef,
      role: 'goal_sprite',
      subject: `${goal.kind} goal sprite`,
      sourceDslPaths: provenancePaths(sceneIr, goal.provenanceRef)
    });
  });
  return refs;
}

export function summarizeAssetIntentResolutionFallbacks(input: {
  manifest: AssetIntentManifest;
  resolutionReport: AssetResolutionReport;
}): { coreRequiredFallbackCount: number; requestRequiredFallbackCount: number; optionalFallbackCount: number } {
  const resolvedByPlanId = new Map(input.resolutionReport.assets.map((asset) => [asset.id, asset]));
  let coreRequiredFallbackCount = 0;
  let requestRequiredFallbackCount = 0;
  let optionalFallbackCount = 0;

  for (const intent of input.manifest.intents) {
    const resolved = resolvedByPlanId.get(intent.assetPlanId);
    if (resolved !== undefined && !isFallbackResolutionSource(resolved.selected.source)) {
      continue;
    }
    if (intent.requiredLevel === 'core_required') {
      coreRequiredFallbackCount += 1;
    }
    if (intent.requiredLevel === 'request_required') {
      requestRequiredFallbackCount += 1;
    }
    if (intent.requiredLevel === 'optional') {
      optionalFallbackCount += 1;
    }
  }

  return { coreRequiredFallbackCount, requestRequiredFallbackCount, optionalFallbackCount };
}

function isFallbackResolutionSource(source: AssetResolutionReport['assets'][number]['selected']['source']): boolean {
  return source === 'template_svg' || source === 'placeholder';
}

function provenancePaths(sceneIr: SceneIr, provenanceRef: string): string[] {
  const provenance = sceneIr.provenance[provenanceRef];
  if (provenance === undefined) {
    return ['/scene'];
  }

  return unique([provenance.dslPath, ...(provenance.relatedDslPaths ?? [])]);
}

function summarizeIntents(intents: AssetIntent[]): AssetIntentManifest['summary'] {
  return {
    total: intents.length,
    coreRequired: intents.filter((intent) => intent.requiredLevel === 'core_required').length,
    requestRequired: intents.filter((intent) => intent.requiredLevel === 'request_required').length,
    optional: intents.filter((intent) => intent.requiredLevel === 'optional').length,
    fallbackAllowed: intents.filter((intent) => intent.fallbackPolicy.allowed).length,
    cacheKeyVersion: 'asset-intent-cache-v0.1'
  };
}

function roleForPlanItem(role: AssetPlanItem['role']): AssetIntent['role'] {
  if (role === 'background') {
    return 'background_layer';
  }
  if (role === 'tileset') {
    return 'terrain_tileset';
  }
  if (role === 'player_character') {
    return 'player_sprite';
  }
  if (role === 'enemy' || role === 'hazard') {
    return 'enemy_sprite';
  }
  if (role === 'projectile') {
    return 'projectile_sprite';
  }
  if (role === 'collectible' || role === 'pickup') {
    return 'goal_sprite';
  }
  if (role === 'ui_panel') {
    return 'ui_element';
  }
  return 'decoration';
}

function sourceDslPathsForPlanItem(item: AssetPlanItem): string[] {
  if (item.role === 'background') {
    return ['/world'];
  }
  if (item.role === 'tileset') {
    return ['/level/terrain'];
  }
  if (item.role === 'player_character') {
    return ['/player'];
  }
  if (item.role === 'enemy' || item.role === 'hazard') {
    return ['/entities'];
  }
  if (item.role === 'projectile') {
    return ['/player/actions'];
  }
  if (item.role === 'collectible' || item.role === 'pickup') {
    return ['/entities'];
  }
  if (item.role === 'ui_panel') {
    return ['/ui'];
  }
  return ['/assets'];
}

function tilingForPlanItem(item: AssetPlanItem): AssetIntent['tiling'] | undefined {
  if (item.role === 'background' || item.role === 'tileset') {
    return { repeatX: true };
  }
  return undefined;
}

function fallbackPolicyFor(requiredLevel: AssetIntent['requiredLevel']): AssetIntent['fallbackPolicy'] {
  if (requiredLevel === 'optional') {
    return { allowed: true, reason: 'allowed_for_optional' };
  }

  return {
    allowed: false,
    reason: requiredLevel === 'request_required' ? 'not_allowed_for_request_required' : 'not_allowed_for_core_required'
  };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
