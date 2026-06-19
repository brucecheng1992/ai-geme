import { z } from 'zod';

import {
  CanonicalGameDslV02Schema,
  CANONICAL_GAME_DSL_V02_PATH,
  type CanonicalGameDslV02
} from './schemas/game-dsl-v0.2.schema.js';
import { GameplayCapabilityLockSchema, GAMEPLAY_CAPABILITY_LOCK_KIND, type GameplayCapabilityLock } from './gameplay-capabilities/capability-lock.js';
import {
  CAPABILITY_GAME_IR_CONTRACT_VERSION,
  type CapabilityDrivenGameIr
} from './gameplay-capabilities/capability-ir.js';
import {
  PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY,
  PHASER_RUNTIME_SYSTEM_MANIFEST_KIND,
  PHASER_RUNTIME_SYSTEM_MANIFEST_SCHEMA_VERSION,
  PhaserRuntimeSystemManifestSchema,
  type PhaserRuntimeSystemManifest
} from './gameplay-capabilities/phaser-runtime-loader.js';
import { hashStableJson } from './gameplay-capabilities/stable-json.js';
import type { SceneDomain, SceneIrAuthorityReport } from './scene-ir.js';

export const CAPABILITY_RUNTIME_PLAN_KIND = 'capability_runtime_plan';
export const CAPABILITY_RUNTIME_PLAN_SCHEMA_VERSION = 'capability_runtime_plan.v0.2';
export const CAPABILITY_RUNTIME_PLAN_PATH = 'runtime-plan.generated.json';
export const CAPABILITY_IR_PATH = 'capability-ir.json';
export const RUNTIME_SYSTEM_MANIFEST_PATH = 'runtime-system-manifest.json';
export const CANONICAL_CAPABILITY_COMPILATION_REPORT_KIND = 'canonical_capability_compilation_report';
export const CANONICAL_CAPABILITY_COMPILATION_REPORT_SCHEMA_VERSION = 'canonical_capability_compilation_report.v0.2';

const HashLikeSchema = z.string().min(1);
const StableRuntimeIdSchema = z.string().regex(/^[a-z][a-z0-9_.-]{1,159}$/);

export const CapabilityRuntimePlanSchema = z.strictObject({
  artifactKind: z.literal(CAPABILITY_RUNTIME_PLAN_KIND),
  schemaVersion: z.literal(CAPABILITY_RUNTIME_PLAN_SCHEMA_VERSION),
  projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
  runId: z.string().regex(/^run_[A-Za-z0-9_-]+$/),
  source: z.strictObject({
    canonicalDslPath: z.literal(CANONICAL_GAME_DSL_V02_PATH),
    canonicalDslHash: HashLikeSchema,
    capabilityLockHash: HashLikeSchema
  }),
  profileId: z.string().min(1),
  runtimeFamily: z.literal(PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY),
  progression: z.strictObject({
    estimatedTotalSec: z.strictObject({
      min: z.number().int().positive(),
      max: z.number().int().positive()
    }),
    segments: z.array(
      z.strictObject({
        id: z.string().min(1),
        order: z.number().int().min(0),
        startSec: z.number().int().min(0),
        targetDurationSec: z.number().int().positive(),
        endSec: z.number().int().positive(),
        capabilityIds: z.array(z.string().min(1))
      })
    ).min(1)
  }),
  runtimeSystems: z.array(
    z.strictObject({
      id: StableRuntimeIdSchema,
      capabilityId: z.string().min(1),
      configSourceIds: z.array(z.string().min(1)),
      appliesToEntityIds: z.array(z.string().min(1))
    })
  ).min(1),
  gameplay: z.strictObject({
    entityIds: z.array(z.string().min(1)),
    waveIds: z.array(z.string().min(1)),
    pickupIds: z.array(z.string().min(1)),
    objectiveIds: z.array(z.string().min(1)),
    bossIds: z.array(z.string().min(1))
  }),
  planHash: HashLikeSchema
}).superRefine((plan, ctx) => {
  if (plan.planHash !== hashCapabilityRuntimePlanPayload(plan)) {
    ctx.addIssue({
      code: 'custom',
      path: ['planHash'],
      message: 'planHash must match the deterministic capability runtime plan payload.'
    });
  }
});

export type CapabilityRuntimePlan = z.infer<typeof CapabilityRuntimePlanSchema>;

export const CanonicalCapabilityCompilationReportSchema = z.strictObject({
  artifactKind: z.literal(CANONICAL_CAPABILITY_COMPILATION_REPORT_KIND),
  schemaVersion: z.literal(CANONICAL_CAPABILITY_COMPILATION_REPORT_SCHEMA_VERSION),
  projectId: z.string().regex(/^proj_[A-Za-z0-9_-]+$/),
  runId: z.string().regex(/^run_[A-Za-z0-9_-]+$/),
  status: z.enum(['compiled', 'blocked']),
  canonicalDslHash: HashLikeSchema.optional(),
  capabilityLockHash: HashLikeSchema.optional(),
  outputRefs: z.strictObject({
    capabilityIr: z.literal(CAPABILITY_IR_PATH).optional(),
    runtimePlan: z.literal(CAPABILITY_RUNTIME_PLAN_PATH).optional(),
    runtimeSystemManifest: z.literal(RUNTIME_SYSTEM_MANIFEST_PATH).optional()
  }),
  sceneIrAuthorityReport: z.custom<SceneIrAuthorityReport>().optional(),
  issues: z.array(
    z.strictObject({
      code: z.enum([
        'CANONICAL_DSL_INVALID',
        'CAPABILITY_LOCK_INVALID',
        'LOCK_HASH_MISMATCH',
        'PROFILE_MISMATCH',
        'CAPABILITY_SET_MISMATCH',
        'RUNTIME_FAMILY_UNSUPPORTED',
        'RUNTIME_MANIFEST_INVALID',
        'RUNTIME_PLAN_INVALID'
      ]),
      path: z.string().min(1),
      message: z.string().min(1)
    })
  ),
  reportHash: HashLikeSchema
}).superRefine((report, ctx) => {
  const hasAllOutputRefs =
    report.outputRefs.capabilityIr !== undefined &&
    report.outputRefs.runtimePlan !== undefined &&
    report.outputRefs.runtimeSystemManifest !== undefined;
  const hasAnyOutputRefs =
    report.outputRefs.capabilityIr !== undefined ||
    report.outputRefs.runtimePlan !== undefined ||
    report.outputRefs.runtimeSystemManifest !== undefined;
  if (report.status === 'compiled') {
    if (report.canonicalDslHash === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['canonicalDslHash'],
        message: 'compiled reports must include canonicalDslHash.'
      });
    }
    if (report.capabilityLockHash === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['capabilityLockHash'],
        message: 'compiled reports must include capabilityLockHash.'
      });
    }
    if (!hasAllOutputRefs) {
      ctx.addIssue({
        code: 'custom',
        path: ['outputRefs'],
        message: 'compiled reports must include every canonical compilation output ref.'
      });
    }
    if (report.sceneIrAuthorityReport === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['sceneIrAuthorityReport'],
        message: 'compiled reports must include Scene IR authority evidence.'
      });
    }
    if (report.issues.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['issues'],
        message: 'compiled reports must not contain unresolved issues.'
      });
    }
  }
  if (report.status === 'blocked') {
    if (hasAnyOutputRefs) {
      ctx.addIssue({
        code: 'custom',
        path: ['outputRefs'],
        message: 'blocked reports must not include compilation output refs.'
      });
    }
    if (report.sceneIrAuthorityReport !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['sceneIrAuthorityReport'],
        message: 'blocked reports must not include Scene IR authority evidence.'
      });
    }
    if (report.issues.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['issues'],
        message: 'blocked reports must explain the blocking issue.'
      });
    }
  }
  if (report.reportHash !== hashCanonicalCapabilityCompilationReportPayload(report)) {
    ctx.addIssue({
      code: 'custom',
      path: ['reportHash'],
      message: 'reportHash must match the deterministic canonical compilation report payload.'
    });
  }
});

export type CanonicalCapabilityCompilationReport = z.infer<typeof CanonicalCapabilityCompilationReportSchema>;

export type CompileCanonicalCapabilityDslResult =
  | {
      status: 'compiled';
      capabilityIr: CapabilityDrivenGameIr;
      runtimePlan: CapabilityRuntimePlan;
      runtimeSystemManifest: PhaserRuntimeSystemManifest;
      sceneIrAuthorityReport: SceneIrAuthorityReport;
      compilationReport: CanonicalCapabilityCompilationReport;
    }
  | { status: 'blocked'; compilationReport: CanonicalCapabilityCompilationReport };

export function compileCanonicalCapabilityDslToRuntimePlan(input: {
  canonicalDsl: unknown;
  capabilityLock: unknown;
}): CompileCanonicalCapabilityDslResult {
  const dsl = CanonicalGameDslV02Schema.safeParse(input.canonicalDsl);
  const lock = GameplayCapabilityLockSchema.safeParse(input.capabilityLock);
  const issues: CanonicalCapabilityCompilationReport['issues'] = [
    ...zodIssues('CANONICAL_DSL_INVALID', dsl),
    ...zodIssues('CAPABILITY_LOCK_INVALID', lock)
  ];

  if (dsl.success && lock.success) {
    issues.push(...validateCanonicalCompileInputs(dsl.data, lock.data));
  }

  if (!dsl.success || !lock.success || issues.length > 0) {
    return {
      status: 'blocked',
      compilationReport: buildCompilationReport({
        projectId: dsl.success ? dsl.data.projectId : 'proj_invalid',
        runId: dsl.success ? dsl.data.runId : 'run_invalid',
        status: 'blocked',
        canonicalDslHash: dsl.success ? hashStableJson(dsl.data) : undefined,
        capabilityLockHash: lock.success ? lock.data.lockHash : undefined,
        issues
      })
    };
  }

  const canonicalDslHash = hashStableJson(dsl.data);
  const capabilityIr = buildCapabilityIr(dsl.data, lock.data);
  const runtimePlan = buildRuntimePlanPayload(dsl.data, lock.data, canonicalDslHash);
  const runtimeSystemManifest = buildRuntimeSystemManifestPayload(lock.data);
  const manifestResult = PhaserRuntimeSystemManifestSchema.safeParse(runtimeSystemManifest);
  const runtimePlanResult = CapabilityRuntimePlanSchema.safeParse(runtimePlan);
  const outputIssues: CanonicalCapabilityCompilationReport['issues'] = [
    ...zodIssues('RUNTIME_MANIFEST_INVALID', manifestResult),
    ...zodIssues('RUNTIME_PLAN_INVALID', runtimePlanResult)
  ];
  if (outputIssues.length > 0 || !manifestResult.success || !runtimePlanResult.success) {
    return {
      status: 'blocked',
      compilationReport: buildCompilationReport({
        projectId: dsl.data.projectId,
        runId: dsl.data.runId,
        status: 'blocked',
        canonicalDslHash,
        capabilityLockHash: lock.data.lockHash,
        issues: outputIssues
      })
    };
  }

  const sceneIrAuthorityReport = buildCanonicalSceneIrAuthorityReport(dsl.data.runId);
  return {
    status: 'compiled',
    capabilityIr,
    runtimePlan: runtimePlanResult.data,
    runtimeSystemManifest: manifestResult.data,
    sceneIrAuthorityReport,
    compilationReport: buildCompilationReport({
      projectId: dsl.data.projectId,
      runId: dsl.data.runId,
      status: 'compiled',
      canonicalDslHash,
      capabilityLockHash: lock.data.lockHash,
      sceneIrAuthorityReport,
      issues: []
    })
  };
}

function validateCanonicalCompileInputs(dsl: CanonicalGameDslV02, lock: GameplayCapabilityLock): CanonicalCapabilityCompilationReport['issues'] {
  const issues: CanonicalCapabilityCompilationReport['issues'] = [];
  if (lock.lockHash !== recomputeGameplayCapabilityLockHash(lock)) {
    issues.push({ code: 'LOCK_HASH_MISMATCH', path: 'capabilityLock.lockHash', message: 'Capability lock hash does not match lock payload.' });
  }
  if (dsl.profile.id !== lock.profileId) {
    issues.push({ code: 'PROFILE_MISMATCH', path: 'profile.id', message: 'Canonical DSL profile must match the exact capability lock profile.' });
  }
  if (dsl.profile.runtime_family !== lock.runtimeFamily) {
    issues.push({ code: 'PROFILE_MISMATCH', path: 'profile.runtime_family', message: 'Canonical DSL runtime family must match the exact capability lock runtime family.' });
  }
  if (dsl.source.capability_lock_hash !== lock.lockHash) {
    issues.push({ code: 'LOCK_HASH_MISMATCH', path: 'source.capability_lock_hash', message: 'Canonical DSL source capability lock hash must match the exact capability lock.' });
  }
  if (lock.runtimeFamily !== PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY) {
    issues.push({ code: 'RUNTIME_FAMILY_UNSUPPORTED', path: 'capabilityLock.runtimeFamily', message: 'Commit 4 compiler currently supports the Phaser 2D action arcade runtime family.' });
  }
  if (!sameStringSet(sortedUnique(dsl.capability_ids), sortedUnique(lock.capabilityIds))) {
    issues.push({ code: 'CAPABILITY_SET_MISMATCH', path: 'capability_ids', message: 'Canonical DSL capabilities must match the exact capability lock.' });
  }
  const lockCapabilityIds = [...lock.capabilityIds].sort();
  const packageCapabilityIds = lock.packages.map((pkg) => pkg.capabilityId).sort();
  if (hasDuplicates(lock.capabilityIds) || hasDuplicates(lock.packages.map((pkg) => pkg.capabilityId)) || !sameStringSet(lockCapabilityIds, packageCapabilityIds)) {
    issues.push({ code: 'CAPABILITY_SET_MISMATCH', path: 'capabilityLock.packages', message: 'Exact lock packages must match capabilityIds.' });
  }
  const lockedCapabilities = new Set(lock.capabilityIds);
  for (const ref of collectCanonicalCapabilityRefs(dsl)) {
    if (!lockedCapabilities.has(ref.capabilityId)) {
      issues.push({
        code: 'CAPABILITY_SET_MISMATCH',
        path: ref.path,
        message: `Canonical capability reference ${ref.capabilityId} is not present in the exact capability lock.`
      });
    }
  }
  dsl.waves.forEach((wave, index) => {
    if (!wave.capability_ids.some((capabilityId) => capabilityId.startsWith('spawn.'))) {
      issues.push({
        code: 'CAPABILITY_SET_MISMATCH',
        path: `/waves/${index}/capability_ids`,
        message: `Wave ${wave.id} must declare a locked spawn capability instead of relying on compiler defaults.`
      });
    }
  });
  return issues;
}

function buildCapabilityIr(dsl: CanonicalGameDslV02, lock: GameplayCapabilityLock): CapabilityDrivenGameIr {
  return {
    contractVersion: CAPABILITY_GAME_IR_CONTRACT_VERSION,
    runtimeFamily: lock.runtimeFamily,
    profileId: lock.profileId,
    capabilityLockRef: `${GAMEPLAY_CAPABILITY_LOCK_KIND}.json`,
    runtimeSystemConfigs: lock.capabilityIds.map((capabilityId) => ({
      id: runtimeSystemIdForCapability(capabilityId),
      capabilityId,
      config: {
        canonicalDslPath: CANONICAL_GAME_DSL_V02_PATH,
        canonicalDslHash: hashStableJson(dsl),
        systemSourceIds: dsl.systems.filter((system) => system.capability_id === capabilityId).map((system) => system.id).sort(),
        progressionSegmentIds: dsl.progression.segments.filter((segment) => segment.capability_ids.includes(capabilityId)).map((segment) => segment.id).sort()
      }
    })),
    entityComponents: dsl.entities.flatMap((entity) =>
      entity.capability_ids.map((capabilityId) => ({
        id: `entity.${entity.id}.${capabilityId}`,
        capabilityId,
        config: { entityId: entity.id, role: entity.role }
      }))
    ),
    rules: dsl.waves.flatMap((wave) =>
      wave.capability_ids
        .filter((capabilityId) => capabilityId.startsWith('spawn.'))
        .map((capabilityId) => ({
          id: `wave.${wave.id}.${capabilityId}`,
          capabilityId,
          config: { segmentId: wave.segment_id, enemyEntityId: wave.enemy_entity_id, count: wave.count, spawn: wave.spawn }
        }))
    ),
    goals: dsl.objectives.flatMap((objective) =>
      objective.capability_ids.map((capabilityId) => ({
        id: `objective.${objective.id}.${capabilityId}`,
        capabilityId,
        config: { kind: objective.kind, target: objective.target ?? null, successCondition: objective.success_condition }
      }))
    ),
    assetRequirements: [],
    telemetryRequirements: dsl.capability_ids.includes('telemetry.gameplay_events.v1')
      ? [{ id: 'telemetry.gameplay_events.required', capabilityId: 'telemetry.gameplay_events.v1', config: { requiredEvents: ['enemy.fired'] } }]
      : [],
    assetManifestRef: 'asset_manifest.json',
    telemetryPlanRef: 'telemetry_plan.json',
    qaPlanRef: 'capability_qa_plan.json'
  };
}

function buildRuntimePlanPayload(dsl: CanonicalGameDslV02, lock: GameplayCapabilityLock, canonicalDslHash: string): unknown {
  const segments = [...dsl.progression.segments].sort((left, right) => left.order - right.order);
  let cursor = 0;
  const realizedSegments = segments.map((segment) => {
    const targetDurationSec = Math.round((segment.duration_target_sec.min_sec + segment.duration_target_sec.max_sec) / 2);
    const realized = {
      id: segment.id,
      order: segment.order,
      startSec: cursor,
      targetDurationSec,
      endSec: cursor + targetDurationSec,
      capabilityIds: [...segment.capability_ids].sort()
    };
    cursor = realized.endSec;
    return realized;
  });
  const payload = {
    artifactKind: CAPABILITY_RUNTIME_PLAN_KIND,
    schemaVersion: CAPABILITY_RUNTIME_PLAN_SCHEMA_VERSION,
    projectId: dsl.projectId,
    runId: dsl.runId,
    source: {
      canonicalDslPath: CANONICAL_GAME_DSL_V02_PATH,
      canonicalDslHash,
      capabilityLockHash: lock.lockHash
    },
    profileId: dsl.profile.id,
    runtimeFamily: PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY,
    progression: {
      estimatedTotalSec: {
        min: dsl.progression.estimated_total_sec.min_sec,
        max: dsl.progression.estimated_total_sec.max_sec
      },
      segments: realizedSegments
    },
    runtimeSystems: lock.capabilityIds.map((capabilityId) => {
      const systems = dsl.systems.filter((system) => system.capability_id === capabilityId);
      return {
        id: runtimeSystemIdForCapability(capabilityId),
        capabilityId,
        configSourceIds: systems.map((system) => system.source_draft_id).sort(),
        appliesToEntityIds: sortedUnique(systems.flatMap((system) => system.applies_to_entity_ids ?? []))
      };
    }),
    gameplay: {
      entityIds: dsl.entities.map((entity) => entity.id).sort(),
      waveIds: dsl.waves.map((wave) => wave.id).sort(),
      pickupIds: dsl.pickups.map((pickup) => pickup.id).sort(),
      objectiveIds: dsl.objectives.map((objective) => objective.id).sort(),
      bossIds: dsl.bosses.map((boss) => boss.id).sort()
    }
  };
  return { ...payload, planHash: hashStableJson(payload) };
}

function buildRuntimeSystemManifestPayload(lock: GameplayCapabilityLock): unknown {
  return {
    artifactKind: PHASER_RUNTIME_SYSTEM_MANIFEST_KIND,
    schemaVersion: PHASER_RUNTIME_SYSTEM_MANIFEST_SCHEMA_VERSION,
    runtimeFamily: PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY,
    kernel: {
      id: 'phaser_2d_action_arcade.kernel.v1',
      version: 'v1',
      runtimeFamily: PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY,
      templateBoundary: 'universal_kernel',
      profileBranching: 'forbidden',
      defaultGameplayObjects: 'forbidden',
      services: ['event_bus', 'scheduler', 'entity_registry', 'telemetry', 'qa_observer']
    },
    compatibilityMode: {
      selection: 'universal_composition',
      selectedBy: 'profile_compiler_version',
      selectorValue: 'canonical-game-dsl.v0.2',
      universalTemplatePath: 'templates/phaser/universal-2d-action'
    },
    systems: lock.packages.map((pkg) => ({
      id: runtimeSystemIdForCapability(pkg.capabilityId),
      version: 'v1',
      capabilityId: pkg.capabilityId,
      runtimeFamily: PHASER_2D_ACTION_ARCADE_RUNTIME_FAMILY,
      phase: runtimePhaseForCapability(pkg.capabilityId),
      dependencies: [],
      services: runtimeServicesForCapability(pkg.capabilityId),
      authoritativeConfig: 'capability_ir',
      qaProbeIds: [`qa.${runtimeSystemIdForCapability(pkg.capabilityId)}.loaded`]
    }))
  };
}

function buildCanonicalSceneIrAuthorityReport(runId: string): SceneIrAuthorityReport {
  const owner = 'canonical_game_dsl_v0.2_runtime_plan';
  const domainOwnership = Object.fromEntries(sceneDomains().map((domain) => [domain, owner])) as Record<SceneDomain, string>;
  return {
    schemaVersion: 'step37.scene-ir-authority-report.v1',
    runId,
    decision: 'runtime_plan_authoritative',
    domainOwnership,
    conflicts: [],
    diagnostics: []
  };
}

function buildCompilationReport(input: {
  projectId: string;
  runId: string;
  status: CanonicalCapabilityCompilationReport['status'];
  canonicalDslHash?: string;
  capabilityLockHash?: string;
  sceneIrAuthorityReport?: SceneIrAuthorityReport;
  issues: CanonicalCapabilityCompilationReport['issues'];
}): CanonicalCapabilityCompilationReport {
  const payload: Omit<CanonicalCapabilityCompilationReport, 'reportHash'> = {
    artifactKind: CANONICAL_CAPABILITY_COMPILATION_REPORT_KIND,
    schemaVersion: CANONICAL_CAPABILITY_COMPILATION_REPORT_SCHEMA_VERSION,
    projectId: input.projectId,
    runId: input.runId,
    status: input.status,
    ...(input.canonicalDslHash === undefined ? {} : { canonicalDslHash: input.canonicalDslHash }),
    ...(input.capabilityLockHash === undefined ? {} : { capabilityLockHash: input.capabilityLockHash }),
    outputRefs:
      input.status === 'compiled'
        ? {
            capabilityIr: CAPABILITY_IR_PATH,
            runtimePlan: CAPABILITY_RUNTIME_PLAN_PATH,
            runtimeSystemManifest: RUNTIME_SYSTEM_MANIFEST_PATH
          }
        : {},
    ...(input.sceneIrAuthorityReport === undefined ? {} : { sceneIrAuthorityReport: input.sceneIrAuthorityReport }),
    issues: [...input.issues].sort((left, right) => `${left.code}:${left.path}:${left.message}`.localeCompare(`${right.code}:${right.path}:${right.message}`))
  };
  return CanonicalCapabilityCompilationReportSchema.parse({ ...payload, reportHash: hashStableJson(payload) });
}

function hashCapabilityRuntimePlanPayload(plan: Omit<CapabilityRuntimePlan, 'planHash'> | CapabilityRuntimePlan): string {
  const { planHash: _planHash, ...payload } = plan as CapabilityRuntimePlan;
  return hashStableJson(stripUndefined(payload));
}

function hashCanonicalCapabilityCompilationReportPayload(
  report: Omit<CanonicalCapabilityCompilationReport, 'reportHash'> | CanonicalCapabilityCompilationReport
): string {
  const { reportHash: _reportHash, ...payload } = report as CanonicalCapabilityCompilationReport;
  return hashStableJson(stripUndefined(payload));
}

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item));
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .map(([key, child]) => [key, stripUndefined(child)])
  );
}

function zodIssues(
  code: CanonicalCapabilityCompilationReport['issues'][number]['code'],
  result: { success: true } | { success: false; error: z.ZodError }
): CanonicalCapabilityCompilationReport['issues'] {
  if (result.success) {
    return [];
  }
  return result.error.issues.map((zodIssue) => ({
    code,
    path: zodIssue.path.map(String).join('.') || '<root>',
    message: zodIssue.message
  }));
}

function runtimeSystemIdForCapability(capabilityId: string): string {
  return `system.${capabilityId}`;
}

function runtimePhaseForCapability(capabilityId: string): PhaserRuntimeSystemManifest['systems'][number]['phase'] {
  if (capabilityId.startsWith('camera.') || capabilityId.startsWith('scene.')) {
    return 'scene';
  }
  if (capabilityId.startsWith('telemetry.')) {
    return 'telemetry';
  }
  if (capabilityId.startsWith('asset.')) {
    return 'bootstrap';
  }
  return 'gameplay';
}

function runtimeServicesForCapability(capabilityId: string): PhaserRuntimeSystemManifest['systems'][number]['services'] {
  if (capabilityId.startsWith('telemetry.')) {
    return ['telemetry', 'event_bus'];
  }
  if (capabilityId.startsWith('movement.')) {
    return ['input', 'physics_body', 'entity_registry'];
  }
  if (capabilityId.startsWith('combat.') || capabilityId.startsWith('weapon.')) {
    return ['projectile', 'damage', 'event_bus'];
  }
  if (capabilityId.startsWith('goal.')) {
    return ['goal', 'event_bus'];
  }
  return ['entity_registry', 'event_bus'];
}

function recomputeGameplayCapabilityLockHash(lock: GameplayCapabilityLock): string {
  const { lockHash: _lockHash, ...payload } = lock;
  return hashStableJson(payload);
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function sceneDomains(): SceneDomain[] {
  return [
    'terrain',
    'spawns',
    'pickups',
    'objectives',
    'camera_gameplay_bounds',
    'presentation',
    'background',
    'lighting',
    'decorations',
    'asset_bindings'
  ];
}

function collectCanonicalCapabilityRefs(dsl: CanonicalGameDslV02): Array<{ path: string; capabilityId: string }> {
  const refs: Array<{ path: string; capabilityId: string }> = [];
  dsl.progression.segments.forEach((segment, index) => collectRefList(refs, segment.capability_ids, `/progression/segments/${index}/capability_ids`));
  dsl.scenes.forEach((scene, index) => collectRefList(refs, scene.capability_ids, `/scenes/${index}/capability_ids`));
  dsl.entities.forEach((entity, index) => collectRefList(refs, entity.capability_ids, `/entities/${index}/capability_ids`));
  dsl.systems.forEach((system, index) => refs.push({ path: `/systems/${index}/capability_id`, capabilityId: system.capability_id }));
  dsl.objectives.forEach((objective, index) => collectRefList(refs, objective.capability_ids, `/objectives/${index}/capability_ids`));
  dsl.waves.forEach((wave, index) => collectRefList(refs, wave.capability_ids, `/waves/${index}/capability_ids`));
  dsl.pickups.forEach((pickup, index) => collectRefList(refs, pickup.capability_ids, `/pickups/${index}/capability_ids`));
  dsl.bosses.forEach((boss, bossIndex) =>
    boss.phases.forEach((phase, phaseIndex) => collectRefList(refs, phase.capability_ids, `/bosses/${bossIndex}/phases/${phaseIndex}/capability_ids`))
  );
  return refs;
}

function collectRefList(refs: Array<{ path: string; capabilityId: string }>, capabilityIds: readonly string[], path: string): void {
  capabilityIds.forEach((capabilityId, index) => refs.push({ path: `${path}/${index}`, capabilityId }));
}
