import { z } from 'zod';

import { checkPhaserRuntimeCapabilities } from './runtime-capability-gate.js';
import {
  buildGameDslArtifact,
  GameDslArtifactSchema,
  validateGameDslArtifact,
  type GameDslArtifact,
  type DslValidationReport,
  type DslValidationReportIssue
} from './artifact-contract.js';
import { validateAndNormalizeRawGameDsl } from './normalizer.js';

export const RUNTIME_CAPABILITY_REPORT_KIND = 'runtime_capability_report';
export const RUNTIME_CAPABILITY_REPORT_SCHEMA_VERSION = 'runtime_capability_report.v1';
export const DSL_PATCH_ARTIFACT_KIND = 'dsl_patch';
export const DSL_PATCH_SCHEMA_VERSION = 'dsl_patch.v1';
export const PATCH_VALIDATION_REPORT_KIND = 'patch_validation_report';
export const PATCH_VALIDATION_REPORT_SCHEMA_VERSION = 'patch_validation_report.v1';
export const LIVE_UPDATE_PLAN_KIND = 'live_update_plan';
export const LIVE_UPDATE_PLAN_SCHEMA_VERSION = 'live_update_plan.v1';
export const RUNTIME_APPLY_REPORT_KIND = 'runtime_apply_report';
export const RUNTIME_APPLY_REPORT_SCHEMA_VERSION = 'runtime_apply_report.v1';

const PatchIdSchema = z.string().regex(/^patch_[a-z0-9_]{4,40}$/);
const VersionIdSchema = z.string().regex(/^v_[A-Za-z0-9_-]{3,80}$/);
const AdapterIdSchema = z.literal('top_down_shooter.phaser.v1');

const LiveEditCapabilitiesSchema = z.strictObject({
  hot: z.array(z.string()),
  assetSwap: z.array(z.string()),
  warmRestart: z.array(z.string()),
  rebuildRequired: z.array(z.string())
});

export const topDownShooterPhaserLiveEditCapabilities = {
  hot: [
    '/player/physics/maxSpeed',
    '/player/render/scale',
    '/player/health/max',
    '/enemyTypes/*/physics/speed',
    '/enemyTypes/*/health/max',
    '/projectiles/*/speed',
    '/projectiles/*/damage'
  ],
  assetSwap: ['/assets/roles/player', '/assets/roles/enemy', '/assets/roles/projectile', '/assets/roles/background'],
  warmRestart: ['/level/waves', '/level/spawnRules', '/pickups', '/bosses'],
  rebuildRequired: ['/genre', '/world/coordinateSystem', '/world/physics/mode', '/player/controller']
} as const;

export const RuntimeCapabilityReportSchema = z.strictObject({
  artifactKind: z.literal(RUNTIME_CAPABILITY_REPORT_KIND),
  schemaVersion: z.literal(RUNTIME_CAPABILITY_REPORT_SCHEMA_VERSION),
  runId: z.string().min(1).max(120),
  validatedDslRef: z.strictObject({
    artifactKind: z.literal('game_dsl'),
    schemaVersion: z.literal('game_dsl.v1'),
    dslId: z.string().min(1)
  }),
  selectedAdapterId: AdapterIdSchema,
  status: z.enum(['supported', 'unsupported']),
  requiredCapabilities: z.array(z.string()),
  adapterCapabilities: z.array(z.string()),
  unsupportedCapabilities: z.array(z.strictObject({ capability: z.string(), path: z.string(), reason: z.string() })),
  unsupportedDslPaths: z.array(z.string()),
  liveEditCapabilities: LiveEditCapabilitiesSchema
});

export type RuntimeCapabilityReport = z.infer<typeof RuntimeCapabilityReportSchema>;
export type LiveEditCapabilities = z.infer<typeof LiveEditCapabilitiesSchema>;

const PatchOperationSchema = z.strictObject({
  op: z.enum(['replace', 'add', 'remove']),
  path: z.string().min(1).max(200),
  value: z.unknown().optional()
});

export const DslPatchV1Schema = z.strictObject({
  artifactKind: z.literal(DSL_PATCH_ARTIFACT_KIND),
  schemaVersion: z.literal(DSL_PATCH_SCHEMA_VERSION),
  patchId: PatchIdSchema,
  runId: z.string().min(1).max(120),
  baseDslId: z.string().min(1).max(80),
  baseVersionId: VersionIdSchema,
  source: z.enum(['workbench', 'system', 'test']),
  intent: z.string().min(1).max(500),
  ops: z.array(PatchOperationSchema).min(1).max(20)
});

export type DslPatchV1 = z.infer<typeof DslPatchV1Schema>;
export type DslPatchV1Operation = DslPatchV1['ops'][number];

const ReportIssueSchema = z.strictObject({
  code: z.string().min(1),
  path: z.string().min(1),
  message: z.string().min(1)
});

export const PatchValidationReportSchema = z.strictObject({
  artifactKind: z.literal(PATCH_VALIDATION_REPORT_KIND),
  schemaVersion: z.literal(PATCH_VALIDATION_REPORT_SCHEMA_VERSION),
  patchId: z.string().min(1),
  status: z.enum(['valid', 'invalid']),
  errorCount: z.number().int().min(0),
  warningCount: z.number().int().min(0),
  errors: z.array(ReportIssueSchema),
  warnings: z.array(ReportIssueSchema),
  checks: z.array(z.strictObject({ name: z.string().min(1), status: z.enum(['passed', 'failed']), message: z.string().optional() }))
});

export type PatchValidationReport = z.infer<typeof PatchValidationReportSchema>;
export type PatchValidationIssue = PatchValidationReport['errors'][number];

const RuntimePatchSchema = z.strictObject({
  player: z.strictObject({ scale: z.number().optional(), maxSpeed: z.number().optional(), maxHealth: z.number().optional() }).optional(),
  enemyTypes: z.record(z.string(), z.strictObject({ speed: z.number().optional(), maxHealth: z.number().optional() })).optional(),
  projectiles: z.record(z.string(), z.strictObject({ speed: z.number().optional(), damage: z.number().optional() })).optional()
});

export const LiveUpdatePlanSchema = z.strictObject({
  artifactKind: z.literal(LIVE_UPDATE_PLAN_KIND),
  schemaVersion: z.literal(LIVE_UPDATE_PLAN_SCHEMA_VERSION),
  patchId: z.string().min(1),
  status: z.enum(['hot_patchable', 'warm_restart_required', 'rebuild_required', 'unsupported', 'failed_validation']),
  applyMode: z.enum(['hot', 'warm_restart', 'rebuild', 'none']),
  affectedPaths: z.array(z.string()),
  runtimePatch: RuntimePatchSchema.optional(),
  reason: z.string().optional()
});

export type LiveUpdatePlan = z.infer<typeof LiveUpdatePlanSchema>;

export const RuntimeApplyReportSchema = z.strictObject({
  artifactKind: z.literal(RUNTIME_APPLY_REPORT_KIND),
  schemaVersion: z.literal(RUNTIME_APPLY_REPORT_SCHEMA_VERSION),
  runId: z.string().min(1).max(120),
  patchId: z.string().min(1).max(80),
  liveUpdatePlanRef: z.strictObject({
    artifact: z.string().min(1).max(160),
    patchId: z.string().min(1).max(80)
  }),
  status: z.enum(['applied_hot', 'applied_warm_restart', 'failed_runtime_apply', 'unsupported', 'requires_rebuild']),
  applyMode: z.enum(['hot', 'warm_restart', 'rebuild', 'none']),
  runtimeTarget: z.string().min(1).max(160),
  appliedPaths: z.array(z.string().min(1).max(200)),
  warnings: z.array(ReportIssueSchema),
  errors: z.array(ReportIssueSchema)
});

export type RuntimeApplyReport = z.infer<typeof RuntimeApplyReportSchema>;

type PatchPathRule = {
  kind: 'hot' | 'assetSwap' | 'warmRestart' | 'rebuildRequired';
  pattern: string;
  value: 'speed' | 'player-health' | 'enemy-health' | 'projectile-damage' | 'scale' | 'genre' | 'coordinate-system' | 'asset-role' | 'unknown';
};

type PatchValidationResult =
  | { ok: true; patch: DslPatchV1; report: PatchValidationReport; candidateDsl: unknown; candidateDslValidationReport: DslValidationReport; appliedDsl?: GameDslArtifact; plan: LiveUpdatePlan }
  | { ok: false; patch?: DslPatchV1; report: PatchValidationReport; plan: LiveUpdatePlan };

const patchPathRules: PatchPathRule[] = [
  { kind: 'hot', pattern: '/player/physics/maxSpeed', value: 'speed' },
  { kind: 'hot', pattern: '/player/render/scale', value: 'scale' },
  { kind: 'hot', pattern: '/player/health/max', value: 'player-health' },
  { kind: 'hot', pattern: '/enemyTypes/*/physics/speed', value: 'speed' },
  { kind: 'hot', pattern: '/enemyTypes/*/health/max', value: 'enemy-health' },
  { kind: 'hot', pattern: '/projectiles/*/speed', value: 'speed' },
  { kind: 'hot', pattern: '/projectiles/*/damage', value: 'projectile-damage' },
  { kind: 'assetSwap', pattern: '/assets/roles/player', value: 'asset-role' },
  { kind: 'assetSwap', pattern: '/assets/roles/enemy', value: 'asset-role' },
  { kind: 'assetSwap', pattern: '/assets/roles/projectile', value: 'asset-role' },
  { kind: 'assetSwap', pattern: '/assets/roles/background', value: 'asset-role' },
  { kind: 'warmRestart', pattern: '/level/waves', value: 'unknown' },
  { kind: 'warmRestart', pattern: '/level/spawnRules', value: 'unknown' },
  { kind: 'warmRestart', pattern: '/pickups', value: 'unknown' },
  { kind: 'warmRestart', pattern: '/bosses', value: 'unknown' },
  { kind: 'rebuildRequired', pattern: '/genre', value: 'genre' },
  { kind: 'rebuildRequired', pattern: '/world/coordinateSystem', value: 'coordinate-system' },
  { kind: 'rebuildRequired', pattern: '/world/physics/mode', value: 'unknown' },
  { kind: 'rebuildRequired', pattern: '/player/controller', value: 'unknown' }
];

export function buildRuntimeCapabilityReport(input: { runId: string; validatedDsl: GameDslArtifact }): RuntimeCapabilityReport {
  const adapterCapabilities = [
    'top_down_camera',
    'eight_direction_movement',
    'projectile_combat',
    'enemy_waves',
    ...topDownShooterPhaserLiveEditCapabilities.hot,
    ...topDownShooterPhaserLiveEditCapabilities.assetSwap,
    ...topDownShooterPhaserLiveEditCapabilities.warmRestart,
    ...topDownShooterPhaserLiveEditCapabilities.rebuildRequired
  ];
  const normalized = validateAndNormalizeRawGameDsl(input.validatedDsl.sourceDsl);
  const runtimeGate = normalized.ok ? checkPhaserRuntimeCapabilities(normalized.ir) : { ok: false as const, unsupportedCapabilities: [] };
  const unsupportedFromAdapter =
    input.validatedDsl.genre === 'top_down_shooter'
      ? []
      : input.validatedDsl.requiredCapabilities
          .filter((capability) => !adapterCapabilities.includes(capability))
          .map((capability) => ({
            capability,
            path: 'requiredCapabilities',
            reason: `top_down_shooter.phaser.v1 does not support ${capability}.`
          }));
  const unsupportedCapabilities = [...unsupportedFromAdapter, ...(!runtimeGate.ok ? runtimeGate.unsupportedCapabilities : [])];
  const supported = input.validatedDsl.genre === 'top_down_shooter' && unsupportedCapabilities.length === 0;

  return RuntimeCapabilityReportSchema.parse({
    artifactKind: RUNTIME_CAPABILITY_REPORT_KIND,
    schemaVersion: RUNTIME_CAPABILITY_REPORT_SCHEMA_VERSION,
    runId: input.runId,
    validatedDslRef: { artifactKind: 'game_dsl', schemaVersion: 'game_dsl.v1', dslId: input.validatedDsl.dslId },
    selectedAdapterId: 'top_down_shooter.phaser.v1',
    status: supported ? 'supported' : 'unsupported',
    requiredCapabilities: input.validatedDsl.requiredCapabilities,
    adapterCapabilities,
    unsupportedCapabilities,
    unsupportedDslPaths: unsupportedCapabilities.map((item) => item.path),
    liveEditCapabilities: supported ? topDownShooterPhaserLiveEditCapabilities : { hot: [], assetSwap: [], warmRestart: [], rebuildRequired: [] }
  });
}

export function validateAndPlanDslPatch(input: {
  baseDsl: GameDslArtifact;
  patch: unknown;
  baseVersionId: string;
  capabilityReport?: RuntimeCapabilityReport;
}): PatchValidationResult {
  const parsedPatch = DslPatchV1Schema.safeParse(input.patch);
  const patchId = readPatchId(input.patch);
  const schemaErrors = parsedPatch.success
    ? []
    : parsedPatch.error.issues.map((issue) => ({ code: 'PATCH_SCHEMA_INVALID', path: issue.path.map(String).join('.') || '<root>', message: issue.message }));

  if (!parsedPatch.success) {
    const report = buildPatchValidationReport(patchId, schemaErrors, [{ name: 'patch_schema', status: 'failed' }]);
    return { ok: false, report, plan: buildFailedValidationPlan(patchId, []) };
  }

  const patch = parsedPatch.data;
  const baseValidation = validateGameDslArtifact(input.baseDsl);
  const errors: PatchValidationIssue[] = [...schemaErrors];
  const checks: PatchValidationReport['checks'] = [{ name: 'base_dsl_valid', status: baseValidation.ok ? 'passed' : 'failed' }];
  if (!baseValidation.ok) {
    errors.push(...baseValidation.report.errors.map((issue) => ({ ...issue, path: `baseDsl.${issue.path}` })));
  }
  if (patch.baseDslId !== input.baseDsl.dslId) {
    errors.push({ code: 'PATCH_BASE_DSL_MISMATCH', path: 'baseDslId', message: 'Patch baseDslId does not match the current DSL.' });
  }
  if (patch.baseVersionId !== input.baseVersionId) {
    errors.push({ code: 'PATCH_BASE_VERSION_MISMATCH', path: 'baseVersionId', message: 'Patch baseVersionId does not match the current version.' });
  }

  for (const [index, op] of patch.ops.entries()) {
    validatePatchOperation(op, index, input.baseDsl, errors);
  }

  const affectedPaths = patch.ops.map((op) => op.path);
  const capabilityReport = input.capabilityReport ?? buildRuntimeCapabilityReport({ runId: patch.runId, validatedDsl: input.baseDsl });
  if (capabilityReport.runId !== patch.runId || capabilityReport.validatedDslRef.dslId !== input.baseDsl.dslId) {
    errors.push({ code: 'RUNTIME_CAPABILITY_REPORT_MISMATCH', path: 'runtime', message: 'Runtime capability report does not match this patch and base DSL.' });
  }

  checks.push({ name: 'ops_allowed', status: errors.some((error) => error.code === 'PATCH_OP_NOT_ALLOWED' || error.code === 'PATCH_PATH_NOT_ALLOWED') ? 'failed' : 'passed' });
  checks.push({ name: 'value_types', status: errors.some((error) => error.code === 'PATCH_VALUE_INVALID') ? 'failed' : 'passed' });
  checks.push({ name: 'arbitrary_code_blocked', status: errors.some((error) => error.code === 'ARBITRARY_CODE_NOT_ALLOWED') ? 'failed' : 'passed' });

  if (errors.length > 0) {
    const report = buildPatchValidationReport(patch.patchId, errors, checks);
    return { ok: false, patch, report, plan: buildFailedValidationPlan(patch.patchId, affectedPaths) };
  }

  if (capabilityReport.status !== 'supported') {
    const candidateDsl = applyCandidatePatch(input.baseDsl, patch);
    const candidateDslValidation = validateGameDslArtifact(candidateDsl, { sourceArtifact: 'game_dsl.candidate.json' });
    const report = buildPatchValidationReport(patch.patchId, [], checks);
    return {
      ok: true,
      patch,
      report,
      candidateDsl,
      candidateDslValidationReport: candidateDslValidation.report,
      plan: buildUnsupportedPlan(patch.patchId, affectedPaths)
    };
  }

  const classification = classifyPatch(patch);
  const candidateDsl = classification.kind === 'hot' ? applyHotPatch(input.baseDsl, patch) : applyCandidatePatch(input.baseDsl, patch);
  const candidateDslValidation = validateGameDslArtifact(candidateDsl, { sourceArtifact: 'game_dsl.candidate.json' });
  if (classification.kind === 'hot') {
    checks.push({ name: 'patched_dsl_valid', status: candidateDslValidation.ok ? 'passed' : 'failed' });
  }
  if (classification.kind === 'hot' && !candidateDslValidation.ok) {
    const report = buildPatchValidationReport(
      patch.patchId,
      candidateDslValidation.report.errors.map((issue) => ({ ...issue, path: `patchedDsl.${issue.path}` })),
      checks
    );
    return { ok: false, patch, report, plan: buildFailedValidationPlan(patch.patchId, affectedPaths) };
  }

  const report = buildPatchValidationReport(patch.patchId, [], checks);
  const plan = buildLiveUpdatePlan({ patch, classification, affectedPaths });
  return {
    ok: true,
    patch,
    report,
    candidateDsl,
    candidateDslValidationReport: candidateDslValidation.report,
    appliedDsl: classification.kind === 'hot' ? GameDslArtifactSchema.parse(candidateDsl) : undefined,
    plan
  };
}

function validatePatchOperation(op: DslPatchV1Operation, index: number, baseDsl: GameDslArtifact, errors: PatchValidationIssue[]): void {
  if (op.op !== 'replace') {
    errors.push({ code: 'PATCH_OP_NOT_ALLOWED', path: `ops.${index}.op`, message: 'Only replace operations are enabled in dsl_patch.v1 MVP.' });
  }
  if (hasUnsafePatchValue(op.value)) {
    errors.push({ code: 'ARBITRARY_CODE_NOT_ALLOWED', path: `ops.${index}.value`, message: 'Patch values cannot include code-like keys or strings.' });
  }
  const rule = findRule(op.path);
  if (rule === undefined) {
    errors.push({ code: 'PATCH_PATH_NOT_ALLOWED', path: `ops.${index}.path`, message: `Patch path is not whitelisted: ${op.path}` });
    return;
  }
  if (!valueMatchesRule(op.value, rule, baseDsl, op.path)) {
    errors.push({ code: 'PATCH_VALUE_INVALID', path: `ops.${index}.value`, message: `Patch value is invalid for ${op.path}.` });
  }
}

function classifyPatch(patch: DslPatchV1): { kind: PatchPathRule['kind'] } {
  const kinds = patch.ops.map((op) => findRule(op.path)?.kind ?? 'rebuildRequired');
  if (kinds.includes('rebuildRequired')) {
    return { kind: 'rebuildRequired' };
  }
  if (kinds.includes('warmRestart')) {
    return { kind: 'warmRestart' };
  }
  if (kinds.includes('assetSwap')) {
    return { kind: 'warmRestart' };
  }
  return { kind: 'hot' };
}

function buildLiveUpdatePlan(input: {
  patch: DslPatchV1;
  classification: { kind: PatchPathRule['kind'] };
  affectedPaths: string[];
}): LiveUpdatePlan {
  if (input.classification.kind === 'hot') {
    return LiveUpdatePlanSchema.parse({
      artifactKind: LIVE_UPDATE_PLAN_KIND,
      schemaVersion: LIVE_UPDATE_PLAN_SCHEMA_VERSION,
      patchId: input.patch.patchId,
      status: 'hot_patchable',
      applyMode: 'hot',
      affectedPaths: input.affectedPaths,
      runtimePatch: buildRuntimePatch(input.patch)
    });
  }
  if (input.classification.kind === 'warmRestart' || input.classification.kind === 'assetSwap') {
    return LiveUpdatePlanSchema.parse({
      artifactKind: LIVE_UPDATE_PLAN_KIND,
      schemaVersion: LIVE_UPDATE_PLAN_SCHEMA_VERSION,
      patchId: input.patch.patchId,
      status: 'warm_restart_required',
      applyMode: 'warm_restart',
      affectedPaths: input.affectedPaths,
      reason: 'Patch touches paths that require a warm restart.'
    });
  }
  return LiveUpdatePlanSchema.parse({
    artifactKind: LIVE_UPDATE_PLAN_KIND,
    schemaVersion: LIVE_UPDATE_PLAN_SCHEMA_VERSION,
    patchId: input.patch.patchId,
    status: 'rebuild_required',
    applyMode: 'rebuild',
    affectedPaths: input.affectedPaths,
    reason: 'Patch touches paths that require rebuild.'
  });
}

function applyHotPatch(baseDsl: GameDslArtifact, patch: DslPatchV1): GameDslArtifact {
  const next = cloneArtifact(baseDsl);
  for (const op of patch.ops) {
    const segments = op.path.split('/').slice(1);
    const value = op.value;
    if (segments.join('/') === 'player/physics/maxSpeed' && typeof value === 'number') {
      next.player.physics.maxSpeed = value;
      next.player.movement.speedPxPerSec = value;
      next.sourceDsl.player.movement.speed_px_per_sec = value;
    } else if (segments.join('/') === 'player/render/scale' && typeof value === 'number') {
      next.player.render.scale = value;
    } else if (segments.join('/') === 'player/health/max' && typeof value === 'number') {
      next.player.health.max = value;
      next.sourceDsl.player.health = value;
    } else if (segments[0] === 'enemyTypes' && typeof segments[1] === 'string' && typeof value === 'number') {
      applyEnemyTypePatch(next, segments[1], segments.slice(2).join('/'), value);
    } else if (segments[0] === 'projectiles' && typeof segments[1] === 'string' && typeof value === 'number') {
      applyProjectilePatch(next, segments[1], segments.slice(2).join('/'), value);
    }
  }

  return GameDslArtifactSchema.parse(next);
}

function applyCandidatePatch(baseDsl: GameDslArtifact, patch: DslPatchV1): unknown {
  const next: unknown = JSON.parse(JSON.stringify(baseDsl));
  for (const op of patch.ops) {
    if (op.op !== 'replace') {
      continue;
    }
    replaceJsonPointerValue(next, op.path, op.value);
  }
  return next;
}

function replaceJsonPointerValue(root: unknown, path: string, value: unknown): void {
  const segments = path.split('/').slice(1).map(decodeJsonPointerSegment);
  if (segments.length === 0 || root === null || typeof root !== 'object') {
    return;
  }

  let cursor: unknown = root;
  for (const segment of segments.slice(0, -1)) {
    if (cursor === null || typeof cursor !== 'object') {
      return;
    }
    const record = cursor as Record<string, unknown>;
    if (!(segment in record)) {
      record[segment] = {};
    }
    cursor = record[segment];
  }

  if (cursor !== null && typeof cursor === 'object') {
    (cursor as Record<string, unknown>)[segments[segments.length - 1]] = value;
  }
}

function decodeJsonPointerSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

function applyEnemyTypePatch(artifact: GameDslArtifact, enemyTypeId: string, subpath: string, value: number): void {
  const enemyType = artifact.enemyTypes[enemyTypeId];
  if (enemyType === undefined) {
    return;
  }
  const sourceEntity = artifact.sourceDsl.entities.find((entity) => entity.id === enemyTypeId);
  const sourceEnemyType = artifact.sourceDsl.enemyTypes?.find((item) => item.id === enemyTypeId);
  if (subpath === 'physics/speed') {
    enemyType.physics.speed = value;
    enemyType.movement.speedPxPerSec = value;
    if (sourceEntity !== undefined) {
      sourceEntity.movement.speed_px_per_sec = value;
    }
    if (sourceEnemyType !== undefined) {
      sourceEnemyType.movement.speed_px_per_sec = value;
    }
  }
  if (subpath === 'health/max') {
    enemyType.health.max = value;
    if (sourceEntity !== undefined) {
      sourceEntity.health = value;
    }
    if (sourceEnemyType !== undefined) {
      sourceEnemyType.health = value;
    }
  }
}

function applyProjectilePatch(artifact: GameDslArtifact, projectileId: string, subpath: string, value: number): void {
  const projectile = artifact.projectiles[projectileId];
  if (projectile === undefined) {
    return;
  }
  const sourceEntity = artifact.sourceDsl.entities.find((entity) => entity.id === projectileId);
  const sourceProjectile = artifact.sourceDsl.projectiles?.find((item) => item.id === projectileId);
  if (subpath === 'speed') {
    projectile.speed = value;
    projectile.speedPxPerSec = value;
    if (sourceEntity !== undefined) {
      sourceEntity.movement.speed_px_per_sec = value;
    }
    if (sourceProjectile !== undefined) {
      sourceProjectile.speed_px_per_sec = value;
    }
  }
  if (subpath === 'damage') {
    projectile.damage = value;
    if (sourceEntity !== undefined) {
      sourceEntity.damage = value;
    }
    if (sourceProjectile !== undefined) {
      sourceProjectile.damage = value;
    }
  }
}

function buildRuntimePatch(patch: DslPatchV1): NonNullable<LiveUpdatePlan['runtimePatch']> {
  const runtimePatch: NonNullable<LiveUpdatePlan['runtimePatch']> = {};
  for (const op of patch.ops) {
    if (typeof op.value !== 'number') {
      continue;
    }
    const segments = op.path.split('/').slice(1);
    if (segments.join('/') === 'player/render/scale') {
      runtimePatch.player = { ...runtimePatch.player, scale: op.value };
    } else if (segments.join('/') === 'player/physics/maxSpeed') {
      runtimePatch.player = { ...runtimePatch.player, maxSpeed: op.value };
    } else if (segments.join('/') === 'player/health/max') {
      runtimePatch.player = { ...runtimePatch.player, maxHealth: op.value };
    } else if (segments[0] === 'enemyTypes' && segments[1] !== undefined) {
      const current = runtimePatch.enemyTypes?.[segments[1]] ?? {};
      runtimePatch.enemyTypes = { ...runtimePatch.enemyTypes, [segments[1]]: { ...current, ...enemyRuntimePatch(segments.slice(2).join('/'), op.value) } };
    } else if (segments[0] === 'projectiles' && segments[1] !== undefined) {
      const current = runtimePatch.projectiles?.[segments[1]] ?? {};
      runtimePatch.projectiles = { ...runtimePatch.projectiles, [segments[1]]: { ...current, ...projectileRuntimePatch(segments.slice(2).join('/'), op.value) } };
    }
  }

  return RuntimePatchSchema.parse(runtimePatch);
}

function enemyRuntimePatch(subpath: string, value: number): { speed?: number; maxHealth?: number } {
  return subpath === 'physics/speed' ? { speed: value } : subpath === 'health/max' ? { maxHealth: value } : {};
}

function projectileRuntimePatch(subpath: string, value: number): { speed?: number; damage?: number } {
  return subpath === 'speed' ? { speed: value } : subpath === 'damage' ? { damage: value } : {};
}

function buildPatchValidationReport(patchId: string, errors: PatchValidationIssue[], checks: PatchValidationReport['checks']): PatchValidationReport {
  return PatchValidationReportSchema.parse({
    artifactKind: PATCH_VALIDATION_REPORT_KIND,
    schemaVersion: PATCH_VALIDATION_REPORT_SCHEMA_VERSION,
    patchId,
    status: errors.length === 0 ? 'valid' : 'invalid',
    errorCount: errors.length,
    warningCount: 0,
    errors,
    warnings: [],
    checks
  });
}

function buildFailedValidationPlan(patchId: string, affectedPaths: string[]): LiveUpdatePlan {
  return LiveUpdatePlanSchema.parse({
    artifactKind: LIVE_UPDATE_PLAN_KIND,
    schemaVersion: LIVE_UPDATE_PLAN_SCHEMA_VERSION,
    patchId,
    status: 'failed_validation',
    applyMode: 'none',
    affectedPaths,
    reason: 'Patch failed validation.'
  });
}

function buildUnsupportedPlan(patchId: string, affectedPaths: string[]): LiveUpdatePlan {
  return LiveUpdatePlanSchema.parse({
    artifactKind: LIVE_UPDATE_PLAN_KIND,
    schemaVersion: LIVE_UPDATE_PLAN_SCHEMA_VERSION,
    patchId,
    status: 'unsupported',
    applyMode: 'none',
    affectedPaths,
    reason: 'Runtime adapter does not support live editing for this DSL.'
  });
}

function findRule(path: string): PatchPathRule | undefined {
  return patchPathRules.find((rule) => pathMatchesPattern(path, rule.pattern));
}

function pathMatchesPattern(path: string, pattern: string): boolean {
  const pathSegments = path.split('/').slice(1);
  const patternSegments = pattern.split('/').slice(1);
  return pathSegments.length === patternSegments.length && patternSegments.every((segment, index) => segment === '*' || segment === pathSegments[index]);
}

function valueMatchesRule(value: unknown, rule: PatchPathRule, baseDsl: GameDslArtifact, path: string): boolean {
  if (rule.value === 'speed') {
    return isIntInRange(value, 1, 2000) && referencedIdExists(baseDsl, path);
  }
  if (rule.value === 'player-health') {
    return isIntInRange(value, 1, 20);
  }
  if (rule.value === 'enemy-health') {
    return isIntInRange(value, 1, 50) && referencedIdExists(baseDsl, path);
  }
  if (rule.value === 'projectile-damage') {
    return isIntInRange(value, 1, 50) && referencedIdExists(baseDsl, path);
  }
  if (rule.value === 'scale') {
    return typeof value === 'number' && value >= 0.1 && value <= 5;
  }
  if (rule.value === 'genre') {
    return typeof value === 'string' && ['top_down_shooter', 'vertical_shooter', 'side_scrolling_platformer', 'side_scrolling_run_and_gun', 'dodger_collector', 'breakout'].includes(value);
  }
  if (rule.value === 'coordinate-system') {
    return typeof value === 'string' && ['top_down_2d', 'vertical_scroll_2d', 'side_view_2d', 'grid_2d'].includes(value);
  }
  if (rule.value === 'asset-role') {
    return typeof value === 'string' && value.length > 0 && value.length <= 120;
  }
  return value !== undefined;
}

function isIntInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function referencedIdExists(baseDsl: GameDslArtifact, path: string): boolean {
  const segments = path.split('/').slice(1);
  if (segments[0] === 'enemyTypes' && segments[1] !== undefined) {
    return baseDsl.enemyTypes[segments[1]] !== undefined;
  }
  if (segments[0] === 'projectiles' && segments[1] !== undefined) {
    return baseDsl.projectiles[segments[1]] !== undefined;
  }
  return true;
}

function hasUnsafePatchValue(value: unknown): boolean {
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return (
      lower.includes('eval') ||
      lower.includes('function') ||
      lower.includes('=>') ||
      lower.includes('<script') ||
      lower.includes('script') ||
      lower.includes('javascript:') ||
      lower.includes('code')
    );
  }
  if (Array.isArray(value)) {
    return value.some(hasUnsafePatchValue);
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).some(([key, child]) => ['__proto__', 'prototype', 'constructor', 'script', 'eval', 'function', 'code'].includes(key) || hasUnsafePatchValue(child));
  }
  return false;
}

function readPatchId(input: unknown): string {
  if (input !== null && typeof input === 'object' && 'patchId' in input && typeof input.patchId === 'string' && PatchIdSchema.safeParse(input.patchId).success) {
    return input.patchId;
  }
  return 'patch_invalid';
}

function cloneArtifact(artifact: GameDslArtifact): GameDslArtifact {
  return GameDslArtifactSchema.parse(JSON.parse(JSON.stringify(artifact)));
}
