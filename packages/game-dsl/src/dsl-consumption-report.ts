import { z } from 'zod';

import { AuthorityBundleRefSchema, type AuthorityBundleRef } from './authority-bundle.js';
import { buildDeepSeekRunAndGunValidationProfileSupportSummary } from './deepseek-run-and-gun-validation-profile-v1.js';
import type { NormalizedGameIr } from './schemas/normalized-game-ir-v0.1.schema.js';
import type { RawGameDsl } from './schemas/raw-game-dsl-v0.1.schema.js';

export const DslConsumptionStatusSchema = z.enum([
  'consumed',
  'normalized',
  'compiled',
  'defaulted',
  'deferred',
  'unsupported',
  'ignored_non_authoritative'
]);

export const DslConsumptionEntrySchema = z.strictObject({
  path: z.string().min(1).regex(/^\//),
  status: DslConsumptionStatusSchema,
  authoritative: z.boolean(),
  consumer: z.string().min(1).optional(),
  outputRefs: z.array(z.string().min(1)).optional(),
  reason: z.string().min(1).optional(),
  runtimeProfile: z.string().min(1)
});

export const DslConsumptionTargetProfileSupportSchema = z.strictObject({
  profileId: z.string().min(1),
  profileVersion: z.string().min(1),
  requirementCount: z.number().int().min(0),
  capabilityClusterCount: z.number().int().min(0),
  completeSupportedCount: z.number().int().min(0),
  capabilities: z.array(
    z.strictObject({
      capabilityId: z.string().min(1),
      classification: z.enum(['COMPLETE_SUPPORTED', 'CONDITIONAL_LEGACY_BACKED', 'UNSUPPORTED', 'DEFERRED', 'CONTRACT_SEEDED']),
      completeSupported: z.boolean(),
      legacyBacked: z.boolean(),
      evidenceDimensions: z.strictObject({
        schema_expressible: z.boolean(),
        normalized: z.boolean(),
        compiled: z.boolean(),
        runtime_consumed: z.boolean(),
        qa_observed: z.boolean()
      }),
      missingEvidenceDimensions: z.array(z.enum(['schema_expressible', 'normalized', 'compiled', 'runtime_consumed', 'qa_observed']))
    })
  )
});

export const DslConsumptionReportSchema = z.strictObject({
  schemaVersion: z.literal('step33.dsl-consumption.v1'),
  projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
  runId: z.string().regex(/^run_[A-Za-z0-9_-]+$/),
  authorityBundleRef: AuthorityBundleRefSchema.optional(),
  dslHash: z.string().min(1),
  runtimeProfile: z.string().min(1),
  entries: z.array(DslConsumptionEntrySchema).min(1),
  summary: z.strictObject({
    authoritativePathCount: z.number().int().min(0),
    consumedCount: z.number().int().min(0),
    defaultedCount: z.number().int().min(0),
    deferredCount: z.number().int().min(0),
    unsupportedCount: z.number().int().min(0),
    ignoredAuthoritativeCount: z.number().int().min(0),
    coverageRatio: z.number().min(0).max(1)
  }),
  targetProfileSupport: DslConsumptionTargetProfileSupportSchema.optional()
});

export type DslConsumptionStatus = z.infer<typeof DslConsumptionStatusSchema>;
export type DslConsumptionEntry = z.infer<typeof DslConsumptionEntrySchema>;
export type DslConsumptionTargetProfileSupport = z.infer<typeof DslConsumptionTargetProfileSupportSchema>;
export type DslConsumptionReport = z.infer<typeof DslConsumptionReportSchema>;

type BuildDslConsumptionReportInput = {
  projectId: string;
  runId: string;
  rawDsl: RawGameDsl;
  ir: NormalizedGameIr;
  authorityBundleRef?: AuthorityBundleRef;
};

type EntrySpec = {
  path: string;
  status: DslConsumptionStatus;
  authoritative: boolean;
  consumer?: string;
  outputRefs?: string[];
  reason?: string;
};

const NON_AUTHORITATIVE_METADATA_REASON = 'Metadata is retained for display/provenance and is not authoritative runtime content.';

export function buildDslConsumptionReport(input: BuildDslConsumptionReportInput): DslConsumptionReport {
  const runtimeProfile = input.ir.template_params.template_id;
  const entries = collectDslConsumptionEntries(input.rawDsl, input.ir).map((entry) => ({ ...entry, runtimeProfile }));
  const summary = summarizeDslConsumptionEntries(entries);

  return DslConsumptionReportSchema.parse({
    schemaVersion: 'step33.dsl-consumption.v1',
    projectId: input.projectId,
    runId: input.runId,
    ...(input.authorityBundleRef === undefined ? {} : { authorityBundleRef: input.authorityBundleRef }),
    dslHash: stableDslHash(input.rawDsl),
    runtimeProfile,
    entries,
    summary,
    targetProfileSupport: buildDslConsumptionTargetProfileSupport()
  });
}

function buildDslConsumptionTargetProfileSupport(): DslConsumptionTargetProfileSupport {
  const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
  return {
    profileId: support.profileId,
    profileVersion: support.profileVersion,
    requirementCount: support.summary.requirementCount,
    capabilityClusterCount: support.summary.capabilityClusterCount,
    completeSupportedCount: support.summary.completeSupportedCount,
    capabilities: support.capabilities.map((capability) => ({
      capabilityId: capability.capabilityId,
      classification: capability.classification,
      completeSupported: capability.completeSupported,
      legacyBacked: capability.legacyBacked,
      evidenceDimensions: capability.evidenceDimensions,
      missingEvidenceDimensions: capability.missingEvidenceDimensions
    }))
  };
}

function collectDslConsumptionEntries(rawDsl: RawGameDsl, ir: NormalizedGameIr): EntrySpec[] {
  const entries: EntrySpec[] = [
    ignored('/metadata', NON_AUTHORITATIVE_METADATA_REASON),
    compiled('/game', 'normalizer.runtime_requirements', ['game.genre', 'runtime_requirements']),
    compiled('/world', 'normalizer.world', ['world', 'runtime_plan']),
    compiled('/world/width', 'normalizer.world + runtime_plan', ['world.width', 'runtime_plan']),
    compiled('/world/height', 'normalizer.world + runtime_plan', ['world.height', 'runtime_plan']),
    consumed('/world/visual_theme', 'normalizer.template_params + asset-plan', ['template_params.params.style.visualTheme', 'asset_plan.style']),
    compiled('/player', 'normalizer.runtime_plan + template_params', ['runtime_plan', 'template_params.params.player']),
    compiled('/entities', 'normalizer.runtime_plan + asset-plan', ['runtime_plan', 'template_params.params.assetLabels']),
    compiled('/rules/collisions', 'normalizer.runtime_plan', ['runtime_plan', 'runtime_requirements.collision']),
    compiled('/objectives', 'normalizer.runtime_plan + qa_plan', ['runtime_plan', 'qa_plan']),
    consumed('/ui', 'normalizer.template_params', ['template_params.params.ui'])
  ];

  if (rawDsl.camera !== undefined) {
    entries.push(compiled('/camera', 'normalizer.runtime_plan', ['runtime_plan.side_scrolling.camera']));
  }
  if (rawDsl.semanticModel !== undefined) {
    entries.push(consumed('/semanticModel', 'normalizer.semanticModel + asset-plan', ['semanticModel', 'asset_plan.items.semantic']));
  }
  if (rawDsl.feedback !== undefined) {
    entries.push(unsupported('/feedback', 'feedback DSL is validated, but Phaser runtime feedback binding is not implemented in this profile.'));
  }
  if (rawDsl.audio !== undefined) {
    entries.push(unsupported('/audio', 'audio DSL is validated, but audio event runtime binding is not implemented in this profile.'));
  }
  if (rawDsl.effects !== undefined) {
    entries.push(unsupported('/effects', 'effect DSL is validated, but visual/audio effect runtime binding is not implemented in this profile.'));
  }
  if (rawDsl.projectiles !== undefined) {
    entries.push(compiled('/projectiles', 'normalizer.runtime_plan', ['runtime_plan.side_scrolling.player.projectileEntityId', 'runtime_plan.side_scrolling.enemyDefinitions.firing']));
  }
  if (rawDsl.enemyTypes !== undefined) {
    entries.push(compiled('/enemyTypes', 'normalizer.runtime_plan', ['runtime_plan.side_scrolling.enemyDefinitions']));
  }
  if (rawDsl.level !== undefined) {
    entries.push(compiled('/level', 'normalizer.runtime_plan', ['runtime_plan.side_scrolling']));
    entries.push(deferred('/level/segments', 'level segments are bounds-validated; first runtime slice consumes terrain, spawns, and win target for traversal.'));
    entries.push(compiled('/level/terrain', 'normalizer.runtime_plan', ['runtime_plan.side_scrolling.platforms']));
    entries.push(compiled('/level/spawns', 'normalizer.runtime_plan', ['runtime_plan.side_scrolling.waves']));
  }
  if (rawDsl.scenes !== undefined) {
    entries.push(deferred('/scenes', 'Scene DSL contract is schema-validated; Step 33.3 will compile it into Scene IR.'));
  }
  if (rawDsl.pickups !== undefined) {
    entries.push(compiled('/pickups', 'normalizer.runtime_plan + asset-plan', ['runtime_plan.side_scrolling.pickups', 'asset_plan.items.pickup']));
  }
  if (rawDsl.bosses !== undefined) {
    entries.push(unsupported('/bosses', 'boss DSL is validated, but side-scrolling boss runtime binding is not implemented in this profile.'));
  }
  if (rawDsl.winLose !== undefined) {
    entries.push(compiled('/winLose', 'normalizer.runtime_plan', ['runtime_plan.side_scrolling.player.lives']));
    if (rawDsl.winLose.checkpoints !== undefined) {
      entries.push(deferred('/winLose/checkpoints', 'checkpoint coordinates are validated, but runtime checkpoint restoration is not yet compiled from DSL.'));
    }
  }

  if (ir.game.genre !== 'side_scrolling_run_and_gun') {
    entries.push(defaulted('/runtime_plan', 'normalizer.runtime_plan', ['runtime_plan'], 'Runtime plan may derive deterministic defaults for non-side-scrolling profiles.'));
  }

  return appendPresentPathInventory(entries, rawDsl, ir).sort((left, right) => left.path.localeCompare(right.path));
}

function summarizeDslConsumptionEntries(entries: DslConsumptionEntry[]): DslConsumptionReport['summary'] {
  const authoritativeEntries = entries.filter((entry) => entry.authoritative);
  const consumedCount = authoritativeEntries.filter((entry) => entry.status === 'consumed' || entry.status === 'normalized' || entry.status === 'compiled').length;
  const defaultedCount = authoritativeEntries.filter((entry) => entry.status === 'defaulted').length;
  const deferredCount = authoritativeEntries.filter((entry) => entry.status === 'deferred').length;
  const unsupportedCount = authoritativeEntries.filter((entry) => entry.status === 'unsupported').length;
  const ignoredAuthoritativeCount = authoritativeEntries.filter((entry) => entry.status === 'ignored_non_authoritative').length;
  const coveredCount = consumedCount + defaultedCount;

  return {
    authoritativePathCount: authoritativeEntries.length,
    consumedCount,
    defaultedCount,
    deferredCount,
    unsupportedCount,
    ignoredAuthoritativeCount,
    coverageRatio: authoritativeEntries.length === 0 ? 1 : roundRatio(coveredCount / authoritativeEntries.length)
  };
}

function appendPresentPathInventory(entries: EntrySpec[], rawDsl: RawGameDsl, ir: NormalizedGameIr): EntrySpec[] {
  const byPath = new Map(entries.map((entry) => [entry.path, entry]));

  for (const node of collectPresentDslNodes(rawDsl)) {
    if (byPath.has(node.path)) {
      continue;
    }
    byPath.set(node.path, inferPresentPathConsumption(node, rawDsl, ir));
  }

  return [...byPath.values()];
}

function collectPresentDslNodes(value: unknown, path: string[] = []): Array<{ path: string; value: unknown }> {
  const currentPath = `/${path.join('/')}`;
  const nodes = path.length === 0 ? [] : [{ path: currentPath, value }];

  if (Array.isArray(value)) {
    return [
      ...nodes,
      ...value.flatMap((item, index) => collectPresentDslNodes(item, [...path, String(index)]))
    ];
  }

  if (value !== null && typeof value === 'object') {
    return [
      ...nodes,
      ...Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => collectPresentDslNodes(child, [...path, key]))
    ];
  }

  return nodes;
}

function inferPresentPathConsumption(
  node: { path: string; value: unknown },
  rawDsl: RawGameDsl,
  ir: NormalizedGameIr
): EntrySpec {
  const path = node.path;
  if (path === '/metadata' || path.startsWith('/metadata/')) {
    return ignored(path, NON_AUTHORITATIVE_METADATA_REASON);
  }
  if (path === '/player/invulnerabilityFrames' || path.startsWith('/player/invulnerabilityFrames/')) {
    return unsupported(path, 'player invulnerability frames are validated, but no runtime binding consumes them in this profile.');
  }
  if (path === '/ui/warningBanner' || path.startsWith('/ui/warningBanner/')) {
    return unsupported(path, 'warning banner DSL is validated, but no runtime UI binding consumes it in this profile.');
  }
  if (path === '/feedback' || path.startsWith('/feedback/')) {
    return unsupported(path, 'feedback DSL is validated, but Phaser runtime feedback binding is not implemented in this profile.');
  }
  if (path === '/audio' || path.startsWith('/audio/')) {
    return unsupported(path, 'audio DSL is validated, but audio event runtime binding is not implemented in this profile.');
  }
  if (path === '/effects' || path.startsWith('/effects/')) {
    return unsupported(path, 'effect DSL is validated, but visual/audio effect runtime binding is not implemented in this profile.');
  }
  if (path === '/bosses' || path.startsWith('/bosses/')) {
    return unsupported(path, 'boss DSL is validated, but runtime boss binding is not implemented in this profile.');
  }
  if (path === '/level/segments' || path.startsWith('/level/segments/')) {
    return deferred(path, 'level segments are bounds-validated; first runtime slice consumes terrain, spawns, and win target for traversal.');
  }
  if (path === '/winLose/checkpoints' || path.startsWith('/winLose/checkpoints/')) {
    return deferred(path, 'checkpoint coordinates are validated, but runtime checkpoint restoration is not yet compiled from DSL.');
  }
  if (path === '/scenes' || path.startsWith('/scenes/')) {
    return deferred(path, 'Scene DSL contract is schema-validated; Step 33.3 will compile it into Scene IR.');
  }

  const collisionEffect = classifyCollisionEffectPath(path, rawDsl);
  if (collisionEffect === 'unsupported') {
    return unsupported(path, 'collision effect is validated, but this effect type is not compiled into the current runtime profile.');
  }
  if (collisionEffect === 'compiled') {
    return compiled(path, 'normalizer.runtime_plan', ['runtime_plan', 'template_params']);
  }

  const worldPath = classifyWorldPath(path, ir);
  if (worldPath !== undefined) {
    return worldPath;
  }

  const entityPath = classifyEntityPath(path, rawDsl, ir);
  if (entityPath !== undefined) {
    return entityPath;
  }

  const playerPath = classifyPlayerPath(path, rawDsl, ir);
  if (playerPath !== undefined) {
    return playerPath;
  }

  const enemyTypePath = classifyEnemyTypePath(path, ir);
  if (enemyTypePath !== undefined) {
    return enemyTypePath;
  }

  if (path === '/world/visual_theme' || path.startsWith('/world/visual_theme/')) {
    return consumed(path, 'normalizer.template_params + asset-plan', ['template_params.params.style.visualTheme', 'asset_plan.style']);
  }
  if (path === '/semanticModel' || path.startsWith('/semanticModel/')) {
    return consumed(path, 'normalizer.semanticModel + asset-plan', ['semanticModel', 'asset_plan.items.semantic']);
  }
  if (path === '/ui' || path.startsWith('/ui/')) {
    return consumed(path, 'normalizer.template_params', ['template_params.params.ui']);
  }
  if (path === '/game' || path.startsWith('/game/')) {
    return compiled(path, 'normalizer.runtime_requirements', ['game', 'runtime_requirements']);
  }
  if (path === '/camera' || path.startsWith('/camera/')) {
    return compiled(path, 'normalizer.runtime_plan', runtimePlanRefs(ir, 'camera'));
  }
  if (path === '/projectiles' || path.startsWith('/projectiles/')) {
    return compiled(path, 'normalizer.runtime_plan', runtimePlanRefs(ir, 'projectiles'));
  }
  if (path === '/level/terrain' || path.startsWith('/level/terrain/')) {
    return compiled(path, 'normalizer.runtime_plan', runtimePlanRefs(ir, 'terrain'));
  }
  if (path === '/level/spawns' || path.startsWith('/level/spawns/')) {
    return compiled(path, 'normalizer.runtime_plan', runtimePlanRefs(ir, 'spawns'));
  }
  if (path === '/level' || path.startsWith('/level/')) {
    return compiled(path, 'normalizer.runtime_plan', ['runtime_plan']);
  }
  if (path === '/pickups' || path.startsWith('/pickups/')) {
    return compiled(path, 'normalizer.runtime_plan + asset-plan', runtimePlanRefs(ir, 'pickups'));
  }
  if (path === '/winLose' || path.startsWith('/winLose/')) {
    return compiled(path, 'normalizer.runtime_plan', runtimePlanRefs(ir, 'winLose'));
  }
  if (path === '/rules/collisions' || path.startsWith('/rules/collisions/')) {
    return compiled(path, 'normalizer.runtime_plan', ['runtime_plan', 'runtime_requirements.collision']);
  }
  if (path === '/objectives' || path.startsWith('/objectives/')) {
    return compiled(path, 'normalizer.runtime_plan + qa_plan', ['runtime_plan', 'qa_plan']);
  }

  return unsupported(path, 'Present authoritative DSL path has no explicit Step 33.1 consumption mapping yet.');
}

function runtimePlanRefs(ir: NormalizedGameIr, domain: 'camera' | 'projectiles' | 'enemyTypes' | 'terrain' | 'spawns' | 'pickups' | 'winLose'): string[] {
  if (ir.game.genre === 'side_scrolling_run_and_gun') {
    const refs = {
      camera: ['runtime_plan.side_scrolling.camera'],
      projectiles: ['runtime_plan.side_scrolling.player.projectileEntityId', 'runtime_plan.side_scrolling.enemyDefinitions.firing'],
      enemyTypes: ['runtime_plan.side_scrolling.enemyDefinitions'],
      terrain: ['runtime_plan.side_scrolling.platforms'],
      spawns: ['runtime_plan.side_scrolling.waves'],
      pickups: ['runtime_plan.side_scrolling.pickups', 'asset_plan.items.pickup'],
      winLose: ['runtime_plan.side_scrolling.player.lives']
    } as const;
    return [...refs[domain]];
  }

  return ['runtime_plan', 'template_params'];
}

function classifyWorldPath(path: string, ir: NormalizedGameIr): EntrySpec | undefined {
  if (path === '/world') {
    return compiled(path, 'normalizer.world + runtime_plan', ['world', 'runtime_plan']);
  }
  if (path === '/world/width' || path === '/world/height') {
    return compiled(path, 'normalizer.world + runtime_plan', ['world', 'runtime_plan']);
  }
  if (path === '/world/visual_theme' || path.startsWith('/world/visual_theme/')) {
    return consumed(path, 'normalizer.template_params + asset-plan', ['template_params.params.style.visualTheme', 'asset_plan.style']);
  }
  if (path === '/world/coordinateSystem') {
    return ir.game.genre === 'side_scrolling_run_and_gun'
      ? normalized(path, 'raw-dsl-validator', ['game.camera', 'runtime_requirements.camera'])
      : unsupported(path, 'world.coordinateSystem is validated, but non-side-scrolling runtime profiles do not consume it.');
  }
  if (path === '/world/gravity') {
    return ir.game.genre === 'side_scrolling_run_and_gun'
      ? compiled(path, 'normalizer.runtime_plan', ['runtime_plan.side_scrolling.scene.world.gravityY'])
      : unsupported(path, 'world.gravity is validated, but non-side-scrolling runtime profiles do not consume it.');
  }
  if (path.startsWith('/world/')) {
    return unsupported(path, 'Present world DSL path has no explicit Step 33.1 consumption mapping yet.');
  }

  return undefined;
}

function classifyPlayerPath(path: string, rawDsl: RawGameDsl, ir: NormalizedGameIr): EntrySpec | undefined {
  if (path === '/player') {
    return compiled(path, 'normalizer.runtime_plan + template_params', ['runtime_plan', 'template_params.params.player']);
  }
  if (!path.startsWith('/player/')) {
    return undefined;
  }

  const childPath = path.slice('/player/'.length);
  if (childPath === 'invulnerabilityFrames' || childPath.startsWith('invulnerabilityFrames/')) {
    return unsupported(path, 'player invulnerability frames are validated, but no runtime binding consumes them in this profile.');
  }
  if (childPath === 'visual' || childPath.startsWith('visual/')) {
    return deferred(path, 'Player visual DSL contract is schema-validated; Step 33.4 and Step 33.5 will bind it to assets and runtime visuals.');
  }
  if (childPath === 'id') {
    return consumed(path, 'normalizer.runtime_plan + template_params + asset-plan', [
      'runtime_plan',
      'template_params.params.player.sourceEntityId',
      'asset_plan.items.player'
    ]);
  }
  if (childPath === 'label') {
    return consumed(path, 'normalizer.template_params + asset-plan', ['template_params.params.player.label', 'asset_plan.items.player']);
  }
  if (childPath === 'health') {
    return compiled(path, 'normalizer.runtime_plan + template_params', ['runtime_plan', 'template_params.params.player.health']);
  }
  if (childPath === 'movement' || childPath.startsWith('movement/')) {
    return compiled(path, 'normalizer.runtime_requirements + runtime_plan + template_params', [
      'runtime_requirements.movement',
      'runtime_plan',
      'template_params.params.player.speedPxPerSec'
    ]);
  }
  if (childPath === 'controller') {
    return ir.game.genre === 'side_scrolling_run_and_gun'
      ? compiled(path, 'normalizer.runtime_requirements', ['runtime_requirements.movement'])
      : unsupported(path, 'player.controller is validated, but this runtime profile does not consume it.');
  }
  if (childPath === 'aiming' || childPath.startsWith('aiming/')) {
    return ir.game.genre === 'side_scrolling_run_and_gun'
      ? compiled(path, 'normalizer.runtime_requirements', ['runtime_requirements.movement'])
      : unsupported(path, 'player.aiming is validated, but this runtime profile does not consume it.');
  }
  if (childPath === 'actions') {
    return compiled(path, 'normalizer.runtime_requirements', ['runtime_requirements.actions']);
  }

  const actionMatch = /^actions\/(\d+)(?:\/(.*))?$/.exec(childPath);
  if (actionMatch !== null) {
    return classifyPlayerActionPath(path, actionMatch[2], rawDsl.player.actions[Number(actionMatch[1])], ir);
  }

  return unsupported(path, 'Present player DSL path has no explicit Step 33.1 consumption mapping yet.');
}

function classifyPlayerActionPath(
  path: string,
  childPath: string | undefined,
  action: RawGameDsl['player']['actions'][number] | undefined,
  ir: NormalizedGameIr
): EntrySpec {
  if (action === undefined) {
    return unsupported(path, 'Player action path does not resolve to a valid DSL action.');
  }
  if (childPath === undefined || childPath.length === 0) {
    return compiled(path, 'normalizer.runtime_requirements', ['runtime_requirements.actions']);
  }

  const field = childPath.split('/')[0];
  if (field === 'id') {
    return consumed(path, 'raw-dsl-validator + artifact-contract', ['validated_unique_ids', 'artifact_contract.player.actions.id']);
  }
  if (field === 'type') {
    return compiled(path, 'normalizer.runtime_requirements', ['runtime_requirements.actions']);
  }
  if (field === 'spawns') {
    return action.type === 'shoot_projectile' && ir.game.genre === 'side_scrolling_run_and_gun'
      ? compiled(path, 'normalizer.runtime_plan', ['runtime_plan.side_scrolling.player.projectileEntityId'])
      : unsupported(path, 'player action spawns is validated, but this action kind/profile does not compile it into runtime.');
  }
  if (field === 'cooldown_ms') {
    return action.type === 'shoot_projectile' && ir.game.genre === 'side_scrolling_run_and_gun'
      ? compiled(path, 'normalizer.runtime_plan', ['runtime_plan.side_scrolling.player.fireCooldownMs'])
      : unsupported(path, 'player action cooldown_ms is validated, but this action kind/profile does not compile it into runtime.');
  }

  return unsupported(path, 'Present player action DSL path has no explicit Step 33.1 consumption mapping yet.');
}

function classifyEnemyTypePath(path: string, ir: NormalizedGameIr): EntrySpec | undefined {
  if (path === '/enemyTypes') {
    return compiled(path, 'normalizer.runtime_plan', runtimePlanRefs(ir, 'enemyTypes'));
  }

  const match = /^\/enemyTypes\/\d+(?:\/(.*))?$/.exec(path);
  if (match === null) {
    return undefined;
  }

  const childPath = match[1];
  if (childPath === undefined || childPath.length === 0) {
    return compiled(path, 'normalizer.runtime_plan', runtimePlanRefs(ir, 'enemyTypes'));
  }

  const field = childPath.split('/')[0];
  if (field === 'id' || field === 'label' || field === 'health' || field === 'movement') {
    return compiled(path, 'normalizer.runtime_plan', runtimePlanRefs(ir, 'enemyTypes'));
  }
  if (field === 'visual' || field === 'behaviorRef' || field === 'colliderRef' || field === 'weaponRef' || field === 'movementRef' || field === 'tags') {
    return deferred(path, 'Enemy archetype visual/behavior DSL contract is schema-validated; Step 33.3-33.5 will compile it into Scene IR, prefabs, and runtime bindings.');
  }

  return unsupported(path, 'Present enemy type DSL path has no explicit Step 33.1 consumption mapping yet.');
}

function classifyEntityPath(path: string, rawDsl: RawGameDsl, ir: NormalizedGameIr): EntrySpec | undefined {
  if (path === '/entities') {
    return compiled(path, 'normalizer.runtime_plan + asset-plan', ['runtime_plan', 'template_params.params.assetLabels']);
  }

  const match = /^\/entities\/(\d+)(?:\/(.*))?$/.exec(path);
  if (match === null) {
    return undefined;
  }

  const entity = rawDsl.entities[Number(match[1])];
  if (entity === undefined) {
    return unsupported(path, 'Entity path does not resolve to a valid DSL entity.');
  }

  const childPath = match[2];
  if (childPath === undefined || childPath.length === 0) {
    return compiled(path, 'normalizer.runtime_plan + asset-plan', ['runtime_plan', 'template_params.params.assetLabels']);
  }

  const field = childPath.split('/')[0];
  if (ir.game.genre !== 'side_scrolling_run_and_gun') {
    return classifyTopDownEntityPath(path, field, entity, ir);
  }

  if (entity.kind === 'projectile') {
    return field === 'id' || field === 'kind' || field === 'label' || field === 'damage' || field === 'movement'
      ? compiled(path, 'normalizer.runtime_plan + asset-plan', ['runtime_plan.side_scrolling.player', 'template_params.params.assetLabels.projectile'])
      : unsupported(path, 'side-scrolling projectile entity field is validated, but not consumed by the current runtime profile.');
  }

  if (entity.kind === 'enemy') {
    if (field === 'id' || field === 'kind' || field === 'label') {
      return consumed(path, 'normalizer.template_params + asset-plan', ['template_params.params.assetLabels.enemy', 'asset_plan.items.enemy']);
    }

    return unsupported(path, 'side-scrolling enemy runtime count, health, and movement come from level.spawns and enemyTypes, not entities enemy fields.');
  }

  return unsupported(path, 'side-scrolling runtime does not consume this entity kind from the generic entities array.');
}

function classifyCollisionEffectPath(path: string, rawDsl: RawGameDsl): 'compiled' | 'unsupported' | undefined {
  const match = /^\/rules\/collisions\/(\d+)\/effects\/(\d+)(?:\/|$)/.exec(path);
  if (match === null) {
    return undefined;
  }

  const collisionIndex = Number(match[1]);
  const effectIndex = Number(match[2]);
  const effectType = rawDsl.rules.collisions[collisionIndex]?.effects[effectIndex]?.type;
  return effectType === 'damage' || effectType === 'score_add' ? 'compiled' : 'unsupported';
}

function classifyTopDownEntityPath(
  path: string,
  field: string,
  entity: RawGameDsl['entities'][number],
  ir: NormalizedGameIr
): EntrySpec {
  if (field === 'id' || field === 'kind' || field === 'label') {
    return consumed(path, 'normalizer.template_params + asset-plan', ['template_params', 'asset_plan.items']);
  }

  if (field === 'spawn') {
    return ir.game.genre === 'dodger'
      ? compiled(path, 'normalizer.runtime_plan.spawn_rules', ['runtime_plan.spawn_rules'])
      : unsupported(path, 'entity.spawn is not consumed by this runtime profile.');
  }

  if (ir.game.genre === 'collector') {
    return entity.kind === 'collectible' && field === 'count'
      ? compiled(path, 'normalizer.template_params', ['template_params.params.collectible.count'])
      : unsupported(path, 'collector runtime does not consume this entity field.');
  }

  if (ir.game.genre === 'dodger') {
    if (entity.kind === 'hazard' && (field === 'movement' || field === 'damage' || field === 'count')) {
      return compiled(path, 'normalizer.template_params + runtime_plan', ['template_params.params.hazard', 'runtime_plan.spawn_rules']);
    }
    if (entity.kind === 'collectible' && field === 'count') {
      return compiled(path, 'normalizer.template_params + runtime_plan', ['template_params.params.collectible', 'runtime_plan.spawn_rules']);
    }
    return unsupported(path, 'dodger runtime does not consume this entity field.');
  }

  if (ir.game.genre === 'shooter') {
    if (entity.kind === 'projectile' && (field === 'damage' || field === 'movement')) {
      return compiled(path, 'normalizer.template_params', ['template_params.params.projectile']);
    }
    if (entity.kind === 'enemy' && (field === 'count' || field === 'health' || field === 'movement')) {
      return compiled(path, 'normalizer.template_params + runtime_plan', ['template_params.params.enemy', 'runtime_plan.enemy_waves']);
    }
    return unsupported(path, 'shooter runtime does not consume this entity field.');
  }

  return unsupported(path, 'Entity field has no explicit Step 33.1 consumption mapping for this runtime profile.');
}

function compiled(path: string, consumer: string, outputRefs: string[]): EntrySpec {
  return { path, status: 'compiled', authoritative: true, consumer, outputRefs };
}

function consumed(path: string, consumer: string, outputRefs: string[]): EntrySpec {
  return { path, status: 'consumed', authoritative: true, consumer, outputRefs };
}

function normalized(path: string, consumer: string, outputRefs: string[]): EntrySpec {
  return { path, status: 'normalized', authoritative: true, consumer, outputRefs };
}

function defaulted(path: string, consumer: string, outputRefs: string[], reason: string): EntrySpec {
  return { path, status: 'defaulted', authoritative: true, consumer, outputRefs, reason };
}

function deferred(path: string, reason: string): EntrySpec {
  return { path, status: 'deferred', authoritative: true, reason };
}

function unsupported(path: string, reason: string): EntrySpec {
  return { path, status: 'unsupported', authoritative: true, reason };
}

function ignored(path: string, reason: string): EntrySpec {
  return { path, status: 'ignored_non_authoritative', authoritative: false, reason };
}

function stableDslHash(value: unknown): string {
  const text = stableStringify(value);
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = (hash * prime) & mask;
  }

  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

function roundRatio(value: number): number {
  return Math.round(value * 10000) / 10000;
}
