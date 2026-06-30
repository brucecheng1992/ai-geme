import {
  CAPABILITY_IR_PATH,
  CAPABILITY_RUNTIME_PLAN_PATH,
  RUNTIME_SYSTEM_MANIFEST_PATH,
  type CanonicalCapabilityCompilationReport,
  type CapabilityRuntimePlan,
  compileCanonicalCapabilityDslToRuntimePlan
} from './canonical-capability-runtime-compiler.js';
import { type CapabilityDrivenGameIr } from './gameplay-capabilities/capability-ir.js';
import { type GameplayCapabilityLock } from './gameplay-capabilities/capability-lock.js';
import { hashStableJson } from './gameplay-capabilities/stable-json.js';
import { type PhaserRuntimeSystemManifest } from './gameplay-capabilities/phaser-runtime-loader.js';
import { type CanonicalGameDslV02 } from './schemas/game-dsl-v0.2.schema.js';
import { type SceneIrAuthorityReport } from './scene-ir.js';
import { type Step37ExactCapabilityLockReport } from './step37-exact-capability-lock.js';
import {
  buildStep37NormalizationCapabilityLock,
  type Step37NormalizeCapabilityDslDraftReport
} from './step37-normalize-capability-dsl-draft.js';
import {
  STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID,
  STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID
} from './step37-remaining-inventory-driver.js';

export const STEP37_STAGE8_COMPILE_NORMALIZED_RUNTIME_IR_ARTIFACT_KIND =
  'step37_compiled_runtime_ir_from_normalized_capability_dsl';
export const STEP37_STAGE8_COMPILE_NORMALIZED_RUNTIME_IR_SCHEMA_VERSION =
  'step37_compiled_runtime_ir_from_normalized_capability_dsl.v0.1';
export const STEP37_STAGE8_COMPILED_RUNTIME_IR_PATH =
  'docs/plans/step37-compiled-runtime-ir-from-normalized-capability-dsl.v0.1.json';

const DEFAULT_STRAIGHT_SINGLE_WEAPON_CAPABILITY_ID = 'weapon.default_straight_single.v1';
const SPAWN_ENEMY_WAVE_CAPABILITY_ID = 'spawn.enemy_wave.v1';

export type Step37CompileNormalizedCapabilityDslStatus = 'passed' | 'blocked';

export type Step37CompileAdapterAction = {
  kind:
    | 'weapon_default_straight_single_compile_contract_completed'
    | 'wave_spawn_capability_declared';
  capabilityIds: string[];
  path: string;
  beforeHash: string;
  afterHash: string;
  reason: string;
};

export type Step37CompileNormalizedCapabilityDslBlocker = {
  errorCode:
    | 'STAGE8_COMPILE_NORMALIZED_AUDIT_HASH_MISMATCH'
    | 'STAGE8_COMPILE_NORMALIZE_REPORT_NOT_PASSED'
    | 'STAGE8_COMPILE_SOURCE_HASH_MISMATCH'
    | 'STAGE8_COMPILE_LOCK_ADAPTER_MISSING'
    | 'STAGE8_COMPILE_REPORT_BLOCKED'
    | 'STAGE8_COMPILE_OUTPUT_HASH_MISMATCH'
    | 'STAGE8_RUNTIME_CONSUMPTION_PREMATURE'
    | 'STAGE8_QA_OBSERVATION_PREMATURE'
    | 'STAGE8_PRODUCTION_CUTOVER_PREMATURE'
    | 'STAGE8_LEGACY_AUTHORITY_EXIT_PREMATURE'
    | 'STAGE8_FINAL_CLOSURE_PREMATURE';
  capabilityIds: string[];
  actual?: string | number | boolean | null;
  expected?: string | number | boolean | null;
  path?: string;
};

export type Step37CompileNormalizedCapabilityDslReport = {
  artifactKind: typeof STEP37_STAGE8_COMPILE_NORMALIZED_RUNTIME_IR_ARTIFACT_KIND;
  schemaVersion: typeof STEP37_STAGE8_COMPILE_NORMALIZED_RUNTIME_IR_SCHEMA_VERSION;
  checkpointId: typeof STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID;
  parentStageId: 'stage8';
  sourceNormalizedCapabilityDslPath: string;
  sourceNormalizedCapabilityDslAuditHash: string;
  expectedNormalizedCapabilityDslAuditHash: string;
  normalizedCapabilityDslAuditHashMatches: boolean;
  sourceNormalizedCanonicalDslHash: string | null;
  sourceNormalizationReportHash: string | null;
  sourceNormalizationLockHash: string | null;
  sourceNormalizationLockProfileId: string | null;
  sourceCapabilityDslDraftAuditHash: string;
  sourceCapabilityDslDraftHash: string | null;
  sourceComposedSchemaAuditHash: string;
  sourceComposedSchemaHash: string | null;
  sourceExactCapabilityLockAuditHash: string;
  sourceExactCapabilityLockHash: string | null;
  sourceExactLockProfileId: string | null;
  requiredCapabilityCount: number;
  completeSupportedCount: number;
  packageCount: number;
  completeSupportedCapabilityIds: string[];
  normalizedCapabilityIds: string[];
  compileReadyCapabilityIds: string[];
  compileAdapterStatus: 'applied' | 'not_required' | 'disabled';
  compileAdapterActions: Step37CompileAdapterAction[];
  compileReadyCanonicalGameDsl: CanonicalGameDslV02 | null;
  compileReadyCanonicalDslHash: string | null;
  compilationReport: CanonicalCapabilityCompilationReport | null;
  compilationReportHash: string | null;
  capabilityIr: CapabilityDrivenGameIr | null;
  capabilityIrHash: string | null;
  runtimePlan: CapabilityRuntimePlan | null;
  runtimePlanHash: string | null;
  runtimeSystemManifest: PhaserRuntimeSystemManifest | null;
  runtimeSystemManifestHash: string | null;
  sceneIrAuthorityReport: SceneIrAuthorityReport | null;
  sceneIrAuthorityReportHash: string | null;
  compileStatus: Step37CompileNormalizedCapabilityDslStatus;
  normalized: boolean;
  compiled: boolean;
  runtimeConsumed: boolean;
  qaObserved: boolean;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
  globalExitConditionsMet: false;
  parentStageStatusAfterCompile: 'running' | 'complete';
  nextCheckpointId: typeof STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID | null;
  outputRefs: {
    capabilityIr: typeof CAPABILITY_IR_PATH | null;
    runtimePlan: typeof CAPABILITY_RUNTIME_PLAN_PATH | null;
    runtimeSystemManifest: typeof RUNTIME_SYSTEM_MANIFEST_PATH | null;
  };
  blockers: Step37CompileNormalizedCapabilityDslBlocker[];
  auditHash: string;
};

export function buildStep37CompileNormalizedCapabilityDslReport(input: {
  normalizeCapabilityDslDraftReport: Step37NormalizeCapabilityDslDraftReport;
  exactCapabilityLockReport: Step37ExactCapabilityLockReport;
  sourceNormalizedCapabilityDslPath: string;
  sourceNormalizedCapabilityDslAuditHash: string;
  expectedNormalizedCapabilityDslAuditHash: string;
  applyCompileAdapters?: boolean;
  runtimeConsumed?: boolean;
  qaObserved?: boolean;
  productionDefaultCutoverActive?: boolean;
  legacyAuthoritativePathExited?: boolean;
  finalClosureNotBlocked?: boolean;
}): Step37CompileNormalizedCapabilityDslReport {
  const sourceNormalizedCapabilityDslPath = requireNonEmpty(input.sourceNormalizedCapabilityDslPath, 'sourceNormalizedCapabilityDslPath');
  const sourceNormalizedCapabilityDslAuditHash = requireNonEmpty(
    input.sourceNormalizedCapabilityDslAuditHash,
    'sourceNormalizedCapabilityDslAuditHash'
  );
  const expectedNormalizedCapabilityDslAuditHash = requireNonEmpty(
    input.expectedNormalizedCapabilityDslAuditHash,
    'expectedNormalizedCapabilityDslAuditHash'
  );
  const runtimeConsumed = input.runtimeConsumed ?? false;
  const qaObserved = input.qaObserved ?? false;
  const productionDefaultCutoverActive = input.productionDefaultCutoverActive ?? false;
  const legacyAuthoritativePathExited = input.legacyAuthoritativePathExited ?? false;
  const finalClosureNotBlocked = input.finalClosureNotBlocked ?? false;
  const applyCompileAdapters = input.applyCompileAdapters ?? true;
  const normalizationReport = input.normalizeCapabilityDslDraftReport;
  const normalizationLock = buildStep37NormalizationCapabilityLock(
    input.exactCapabilityLockReport.capabilityLock,
    normalizationReport.normalizationLockProfileId ?? normalizationReport.draftProfileId
  );
  const compileReady =
    normalizationReport.canonicalGameDsl === null
      ? {
          canonicalDsl: null,
          actions: [] as Step37CompileAdapterAction[],
          adapterStatus: applyCompileAdapters ? ('not_required' as const) : ('disabled' as const)
        }
      : buildCompileReadyCanonicalDsl({
          canonicalDsl: normalizationReport.canonicalGameDsl,
          capabilityLock: normalizationLock,
          applyCompileAdapters
        });
  const compileReadyCanonicalDslHash = compileReady.canonicalDsl === null ? null : hashStableJson(compileReady.canonicalDsl);
  const compileResult =
    compileReady.canonicalDsl === null || normalizationLock === null
      ? null
      : compileCanonicalCapabilityDslToRuntimePlan({
          canonicalDsl: compileReady.canonicalDsl,
          capabilityLock: normalizationLock
        });
  const compilationReport = compileResult?.compilationReport ?? null;
  const compilationReportHash = compilationReport === null ? null : hashStableJson(compilationReport);
  const capabilityIr = compileResult?.status === 'compiled' ? compileResult.capabilityIr : null;
  const runtimePlan = compileResult?.status === 'compiled' ? compileResult.runtimePlan : null;
  const runtimeSystemManifest = compileResult?.status === 'compiled' ? compileResult.runtimeSystemManifest : null;
  const sceneIrAuthorityReport = compileResult?.status === 'compiled' ? compileResult.sceneIrAuthorityReport : null;
  const blockers = buildCompileNormalizedCapabilityDslBlockers({
    normalizeCapabilityDslDraftReport: normalizationReport,
    exactCapabilityLockReport: input.exactCapabilityLockReport,
    sourceNormalizedCapabilityDslAuditHash,
    expectedNormalizedCapabilityDslAuditHash,
    normalizationLock,
    compileResult,
    compilationReportHash,
    runtimeConsumed,
    qaObserved,
    productionDefaultCutoverActive,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked
  });
  const compileStatus: Step37CompileNormalizedCapabilityDslStatus =
    blockers.length === 0 && compileResult?.status === 'compiled' ? 'passed' : 'blocked';
  const compiled = compileStatus === 'passed';
  const payloadWithoutHash: Omit<Step37CompileNormalizedCapabilityDslReport, 'auditHash'> = {
    artifactKind: STEP37_STAGE8_COMPILE_NORMALIZED_RUNTIME_IR_ARTIFACT_KIND,
    schemaVersion: STEP37_STAGE8_COMPILE_NORMALIZED_RUNTIME_IR_SCHEMA_VERSION,
    checkpointId: STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID,
    parentStageId: 'stage8',
    sourceNormalizedCapabilityDslPath,
    sourceNormalizedCapabilityDslAuditHash,
    expectedNormalizedCapabilityDslAuditHash,
    normalizedCapabilityDslAuditHashMatches: sourceNormalizedCapabilityDslAuditHash === expectedNormalizedCapabilityDslAuditHash,
    sourceNormalizedCanonicalDslHash: normalizationReport.canonicalDslHash,
    sourceNormalizationReportHash: normalizationReport.normalizationReportHash,
    sourceNormalizationLockHash: normalizationReport.normalizationLockHash,
    sourceNormalizationLockProfileId: normalizationReport.normalizationLockProfileId,
    sourceCapabilityDslDraftAuditHash: normalizationReport.sourceCapabilityDslDraftAuditHash,
    sourceCapabilityDslDraftHash: normalizationReport.sourceCapabilityDslDraftHash,
    sourceComposedSchemaAuditHash: normalizationReport.sourceComposedSchemaAuditHash,
    sourceComposedSchemaHash: normalizationReport.sourceComposedSchemaHash,
    sourceExactCapabilityLockAuditHash: normalizationReport.sourceExactCapabilityLockAuditHash,
    sourceExactCapabilityLockHash: normalizationReport.sourceExactCapabilityLockHash,
    sourceExactLockProfileId: normalizationReport.sourceExactLockProfileId,
    requiredCapabilityCount: normalizationReport.requiredCapabilityCount,
    completeSupportedCount: normalizationReport.completeSupportedCount,
    packageCount: normalizationReport.packageCount,
    completeSupportedCapabilityIds: [...normalizationReport.completeSupportedCapabilityIds],
    normalizedCapabilityIds: [...normalizationReport.normalizedCapabilityIds],
    compileReadyCapabilityIds: compileReady.canonicalDsl?.capability_ids ?? [],
    compileAdapterStatus: compileReady.adapterStatus,
    compileAdapterActions: compileReady.actions,
    compileReadyCanonicalGameDsl: compiled ? compileReady.canonicalDsl : null,
    compileReadyCanonicalDslHash: compiled ? compileReadyCanonicalDslHash : null,
    compilationReport: compiled ? compilationReport : null,
    compilationReportHash: compiled ? compilationReportHash : null,
    capabilityIr: compiled ? capabilityIr : null,
    capabilityIrHash: compiled && capabilityIr !== null ? hashStableJson(capabilityIr) : null,
    runtimePlan: compiled ? runtimePlan : null,
    runtimePlanHash: compiled && runtimePlan !== null ? hashStableJson(runtimePlan) : null,
    runtimeSystemManifest: compiled ? runtimeSystemManifest : null,
    runtimeSystemManifestHash: compiled && runtimeSystemManifest !== null ? hashStableJson(runtimeSystemManifest) : null,
    sceneIrAuthorityReport: compiled ? sceneIrAuthorityReport : null,
    sceneIrAuthorityReportHash: compiled && sceneIrAuthorityReport !== null ? hashStableJson(sceneIrAuthorityReport) : null,
    compileStatus,
    normalized: normalizationReport.normalized,
    compiled,
    runtimeConsumed,
    qaObserved,
    productionDefaultCutoverActive,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked,
    globalExitConditionsMet: false,
    parentStageStatusAfterCompile: compiled ? 'running' : 'complete',
    nextCheckpointId: compiled ? STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID : null,
    outputRefs: {
      capabilityIr: compiled ? CAPABILITY_IR_PATH : null,
      runtimePlan: compiled ? CAPABILITY_RUNTIME_PLAN_PATH : null,
      runtimeSystemManifest: compiled ? RUNTIME_SYSTEM_MANIFEST_PATH : null
    },
    blockers
  };
  return { ...payloadWithoutHash, auditHash: hashStableJson(payloadWithoutHash) };
}

function buildCompileReadyCanonicalDsl(input: {
  canonicalDsl: CanonicalGameDslV02;
  capabilityLock: GameplayCapabilityLock | null;
  applyCompileAdapters: boolean;
}): {
  canonicalDsl: CanonicalGameDslV02;
  actions: Step37CompileAdapterAction[];
  adapterStatus: 'applied' | 'not_required' | 'disabled';
} {
  const canonicalDsl = cloneCanonicalDsl(input.canonicalDsl);
  const actions: Step37CompileAdapterAction[] = [];
  if (!input.applyCompileAdapters) {
    return { canonicalDsl, actions, adapterStatus: 'disabled' };
  }

  const lockedCapabilities = new Set(input.capabilityLock?.capabilityIds ?? []);
  if (lockedCapabilities.has(DEFAULT_STRAIGHT_SINGLE_WEAPON_CAPABILITY_ID)) {
    actions.push(...completeDefaultWeaponCompileContract(canonicalDsl));
  }
  if (lockedCapabilities.has(SPAWN_ENEMY_WAVE_CAPABILITY_ID)) {
    actions.push(...declareWaveSpawnCapabilities(canonicalDsl));
  }

  return { canonicalDsl, actions, adapterStatus: actions.length > 0 ? 'applied' : 'not_required' };
}

function completeDefaultWeaponCompileContract(canonicalDsl: CanonicalGameDslV02): Step37CompileAdapterAction[] {
  const actions: Step37CompileAdapterAction[] = [];
  const player = canonicalDsl.entities.find((entity) => entity.role === 'player');
  const system = canonicalDsl.systems.find((candidate) => candidate.capability_id === DEFAULT_STRAIGHT_SINGLE_WEAPON_CAPABILITY_ID);
  if (player === undefined || system === undefined) {
    return actions;
  }

  if (!player.capability_ids.includes(DEFAULT_STRAIGHT_SINGLE_WEAPON_CAPABILITY_ID)) {
    const beforeHash = hashStableJson(player);
    player.capability_ids = [...player.capability_ids, DEFAULT_STRAIGHT_SINGLE_WEAPON_CAPABILITY_ID].sort();
    actions.push({
      kind: 'weapon_default_straight_single_compile_contract_completed',
      capabilityIds: [DEFAULT_STRAIGHT_SINGLE_WEAPON_CAPABILITY_ID],
      path: `/entities/${player.id}/capability_ids`,
      beforeHash,
      afterHash: hashStableJson(player),
      reason: 'Stage 8 compile adapter binds the default weapon capability to the player owner required by the compiler contract.'
    });
  }

  const requiredConfig = {
    slot: 'primary',
    pattern: 'straight',
    projectile_count: 1,
    fire_action: 'shoot_projectile'
  };
  const alreadyConcrete =
    system.applies_to_entity_ids?.length === 1 &&
    system.applies_to_entity_ids[0] === player.id &&
    isRecord(system.config) &&
    system.config.slot === requiredConfig.slot &&
    system.config.pattern === requiredConfig.pattern &&
    system.config.projectile_count === requiredConfig.projectile_count &&
    system.config.fire_action === requiredConfig.fire_action;
  if (!alreadyConcrete) {
    const beforeHash = hashStableJson(system);
    system.applies_to_entity_ids = [player.id];
    system.config = requiredConfig;
    actions.push({
      kind: 'weapon_default_straight_single_compile_contract_completed',
      capabilityIds: [DEFAULT_STRAIGHT_SINGLE_WEAPON_CAPABILITY_ID],
      path: `/systems/${system.id}`,
      beforeHash,
      afterHash: hashStableJson(system),
      reason: 'Stage 8 compile adapter turns the Stage 7 generic capability config into the concrete primary straight single-shot compiler contract.'
    });
  }

  return actions;
}

function declareWaveSpawnCapabilities(canonicalDsl: CanonicalGameDslV02): Step37CompileAdapterAction[] {
  return canonicalDsl.waves.flatMap((wave) => {
    if (wave.capability_ids.some((capabilityId) => capabilityId.startsWith('spawn.'))) {
      return [];
    }
    const beforeHash = hashStableJson(wave);
    wave.capability_ids = [...wave.capability_ids, SPAWN_ENEMY_WAVE_CAPABILITY_ID].sort();
    return [
      {
        kind: 'wave_spawn_capability_declared' as const,
        capabilityIds: [SPAWN_ENEMY_WAVE_CAPABILITY_ID],
        path: `/waves/${wave.id}/capability_ids`,
        beforeHash,
        afterHash: hashStableJson(wave),
        reason: 'Stage 8 compile adapter makes the wave spawn authority explicit instead of relying on compiler defaults.'
      }
    ];
  });
}

function buildCompileNormalizedCapabilityDslBlockers(input: {
  normalizeCapabilityDslDraftReport: Step37NormalizeCapabilityDslDraftReport;
  exactCapabilityLockReport: Step37ExactCapabilityLockReport;
  sourceNormalizedCapabilityDslAuditHash: string;
  expectedNormalizedCapabilityDslAuditHash: string;
  normalizationLock: GameplayCapabilityLock | null;
  compileResult: ReturnType<typeof compileCanonicalCapabilityDslToRuntimePlan> | null;
  compilationReportHash: string | null;
  runtimeConsumed: boolean;
  qaObserved: boolean;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
}): Step37CompileNormalizedCapabilityDslBlocker[] {
  const blockers: Step37CompileNormalizedCapabilityDslBlocker[] = [];
  const normalizedReport = input.normalizeCapabilityDslDraftReport;
  if (input.sourceNormalizedCapabilityDslAuditHash !== input.expectedNormalizedCapabilityDslAuditHash) {
    blockers.push({
      errorCode: 'STAGE8_COMPILE_NORMALIZED_AUDIT_HASH_MISMATCH',
      capabilityIds: [],
      actual: input.sourceNormalizedCapabilityDslAuditHash,
      expected: input.expectedNormalizedCapabilityDslAuditHash
    });
  }
  if (
    normalizedReport.normalizationStatus !== 'passed' ||
    !normalizedReport.normalized ||
    normalizedReport.canonicalGameDsl === null ||
    normalizedReport.normalizationReport === null ||
    normalizedReport.nextCheckpointId !== STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID
  ) {
    blockers.push({
      errorCode: 'STAGE8_COMPILE_NORMALIZE_REPORT_NOT_PASSED',
      capabilityIds: [...normalizedReport.completeSupportedCapabilityIds],
      actual: normalizedReport.normalizationStatus,
      expected: 'passed'
    });
  }
  if (
    normalizedReport.sourceExactCapabilityLockAuditHash !== input.exactCapabilityLockReport.auditHash ||
    normalizedReport.sourceExactCapabilityLockHash !== input.exactCapabilityLockReport.lockHash ||
    normalizedReport.normalizationLockHash !== input.normalizationLock?.lockHash
  ) {
    blockers.push({
      errorCode: 'STAGE8_COMPILE_SOURCE_HASH_MISMATCH',
      capabilityIds: [...normalizedReport.completeSupportedCapabilityIds]
    });
  }
  if (input.normalizationLock === null) {
    blockers.push({
      errorCode: 'STAGE8_COMPILE_LOCK_ADAPTER_MISSING',
      capabilityIds: [...normalizedReport.completeSupportedCapabilityIds],
      actual: null,
      expected: normalizedReport.normalizationLockProfileId
    });
  }
  if (input.compileResult === null || input.compileResult.status !== 'compiled') {
    for (const issue of input.compileResult?.compilationReport.issues ?? []) {
      blockers.push({
        errorCode: 'STAGE8_COMPILE_REPORT_BLOCKED',
        capabilityIds: [...normalizedReport.completeSupportedCapabilityIds],
        actual: issue.code,
        expected: 'compiled',
        path: issue.path
      });
    }
    if ((input.compileResult?.compilationReport.issues.length ?? 0) === 0) {
      blockers.push({
        errorCode: 'STAGE8_COMPILE_REPORT_BLOCKED',
        capabilityIds: [...normalizedReport.completeSupportedCapabilityIds],
        actual: input.compileResult?.compilationReport.status ?? null,
        expected: 'compiled'
      });
    }
  }
  if (input.compileResult?.status === 'compiled' && input.compilationReportHash !== hashStableJson(input.compileResult.compilationReport)) {
    blockers.push({
      errorCode: 'STAGE8_COMPILE_OUTPUT_HASH_MISMATCH',
      capabilityIds: [],
      actual: input.compilationReportHash,
      expected: hashStableJson(input.compileResult.compilationReport)
    });
  }
  if (input.runtimeConsumed) {
    blockers.push({ errorCode: 'STAGE8_RUNTIME_CONSUMPTION_PREMATURE', capabilityIds: [], actual: true, expected: false });
  }
  if (input.qaObserved) {
    blockers.push({ errorCode: 'STAGE8_QA_OBSERVATION_PREMATURE', capabilityIds: [], actual: true, expected: false });
  }
  if (input.productionDefaultCutoverActive) {
    blockers.push({ errorCode: 'STAGE8_PRODUCTION_CUTOVER_PREMATURE', capabilityIds: [], actual: true, expected: false });
  }
  if (input.legacyAuthoritativePathExited) {
    blockers.push({ errorCode: 'STAGE8_LEGACY_AUTHORITY_EXIT_PREMATURE', capabilityIds: [], actual: true, expected: false });
  }
  if (input.finalClosureNotBlocked) {
    blockers.push({ errorCode: 'STAGE8_FINAL_CLOSURE_PREMATURE', capabilityIds: [], actual: true, expected: false });
  }
  return blockers;
}

function cloneCanonicalDsl(canonicalDsl: CanonicalGameDslV02): CanonicalGameDslV02 {
  return JSON.parse(JSON.stringify(canonicalDsl)) as CanonicalGameDslV02;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`STEP37_COMPILE_NORMALIZED_CAPABILITY_DSL_FIELD_REQUIRED field="${field}"`);
  }
  return trimmed;
}
