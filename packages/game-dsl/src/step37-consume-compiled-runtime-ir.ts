import { CAPABILITY_RUNTIME_PLAN_PATH, CAPABILITY_IR_PATH, RUNTIME_SYSTEM_MANIFEST_PATH } from './canonical-capability-runtime-compiler.js';
import { GAMEPLAY_CAPABILITY_LOCK_KIND } from './gameplay-capabilities/capability-lock.js';
import {
  buildPhaserRuntimeSystemLoaderPlan,
  type PhaserRuntimeLoaderIssue,
  type PhaserRuntimeLoaderReport
} from './gameplay-capabilities/phaser-runtime-loader.js';
import { hashStableJson } from './gameplay-capabilities/stable-json.js';
import { type Step37CompileNormalizedCapabilityDslReport } from './step37-compile-normalized-capability-dsl.js';
import { type Step37ExactCapabilityLockReport } from './step37-exact-capability-lock.js';
import {
  STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID,
  STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID
} from './step37-remaining-inventory-driver.js';

export const STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_ARTIFACT_KIND =
  'step37_runtime_consumption_from_compiled_runtime_ir';
export const STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_SCHEMA_VERSION =
  'step37_runtime_consumption_from_compiled_runtime_ir.v0.1';
export const STEP37_STAGE9_RUNTIME_CONSUMPTION_PATH =
  'docs/plans/step37-runtime-consumption-from-compiled-runtime-ir.v0.1.json';

export type Step37ConsumeCompiledRuntimeIrStatus = 'passed' | 'blocked';

export type Step37ConsumeCompiledRuntimeIrBlocker = {
  errorCode:
    | 'STAGE9_COMPILED_RUNTIME_IR_AUDIT_HASH_MISMATCH'
    | 'STAGE9_COMPILE_REPORT_NOT_PASSED'
    | 'STAGE9_COMPILE_OUTPUT_MISSING'
    | 'STAGE9_COMPILE_OUTPUT_HASH_MISMATCH'
    | 'STAGE9_EXACT_LOCK_MISMATCH'
    | 'STAGE9_RUNTIME_LOADER_INVALID'
    | 'STAGE9_QA_OBSERVATION_PREMATURE'
    | 'STAGE9_PRODUCTION_CUTOVER_PREMATURE'
    | 'STAGE9_LEGACY_AUTHORITY_EXIT_PREMATURE'
    | 'STAGE9_FINAL_CLOSURE_PREMATURE';
  capabilityIds: string[];
  actual?: string | number | boolean | null;
  expected?: string | number | boolean | null;
  path?: string;
};

export type Step37ConsumeCompiledRuntimeIrReport = {
  artifactKind: typeof STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_ARTIFACT_KIND;
  schemaVersion: typeof STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_SCHEMA_VERSION;
  checkpointId: typeof STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID;
  parentStageId: 'stage9';
  sourceCompiledRuntimeIrPath: string;
  sourceCompiledRuntimeIrAuditHash: string;
  expectedCompiledRuntimeIrAuditHash: string;
  compiledRuntimeIrAuditHashMatches: boolean;
  sourceCapabilityIrHash: string | null;
  sourceRuntimePlanHash: string | null;
  sourceRuntimeSystemManifestHash: string | null;
  sourceSceneIrAuthorityReportHash: string | null;
  sourceExactCapabilityLockHash: string | null;
  sourceExactLockProfileId: string | null;
  compileStatus: Step37CompileNormalizedCapabilityDslReport['compileStatus'];
  compileNextCheckpointId: Step37CompileNormalizedCapabilityDslReport['nextCheckpointId'];
  runtimeLoaderReport: PhaserRuntimeLoaderReport | null;
  runtimeLoaderReportHash: string | null;
  runtimeLoaderStatus: PhaserRuntimeLoaderReport['status'] | 'not_attempted';
  runtimeLoaderPlanHash: string | null;
  runtimeBindingReportHash: string | null;
  runtimeBindingStatus: 'bound_pending_qa' | 'qa_observed' | 'not_attempted';
  outputRefs: {
    capabilityIr: typeof CAPABILITY_IR_PATH | null;
    runtimePlan: typeof CAPABILITY_RUNTIME_PLAN_PATH | null;
    runtimeSystemManifest: typeof RUNTIME_SYSTEM_MANIFEST_PATH | null;
  };
  requiredCapabilityCount: number;
  completeSupportedCount: number;
  packageCount: number;
  completeSupportedCapabilityIds: string[];
  runtimeSystemCapabilityIds: string[];
  runtimeSystemIds: string[];
  runtimeConsumptionStatus: Step37ConsumeCompiledRuntimeIrStatus;
  normalized: boolean;
  compiled: boolean;
  runtimeConsumed: boolean;
  qaObserved: boolean;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
  globalExitConditionsMet: false;
  parentStageStatusAfterRuntimeConsumption: 'running' | 'complete';
  nextCheckpointId: typeof STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID | null;
  blockers: Step37ConsumeCompiledRuntimeIrBlocker[];
  auditHash: string;
};

export function buildStep37ConsumeCompiledRuntimeIrReport(input: {
  compileNormalizedCapabilityDslReport: Step37CompileNormalizedCapabilityDslReport;
  exactCapabilityLockReport: Step37ExactCapabilityLockReport;
  sourceCompiledRuntimeIrPath: string;
  sourceCompiledRuntimeIrAuditHash: string;
  expectedCompiledRuntimeIrAuditHash: string;
  qaObserved?: boolean;
  productionDefaultCutoverActive?: boolean;
  legacyAuthoritativePathExited?: boolean;
  finalClosureNotBlocked?: boolean;
}): Step37ConsumeCompiledRuntimeIrReport {
  const sourceCompiledRuntimeIrPath = requireNonEmpty(input.sourceCompiledRuntimeIrPath, 'sourceCompiledRuntimeIrPath');
  const sourceCompiledRuntimeIrAuditHash = requireNonEmpty(input.sourceCompiledRuntimeIrAuditHash, 'sourceCompiledRuntimeIrAuditHash');
  const expectedCompiledRuntimeIrAuditHash = requireNonEmpty(
    input.expectedCompiledRuntimeIrAuditHash,
    'expectedCompiledRuntimeIrAuditHash'
  );
  const qaObserved = input.qaObserved ?? false;
  const productionDefaultCutoverActive = input.productionDefaultCutoverActive ?? false;
  const legacyAuthoritativePathExited = input.legacyAuthoritativePathExited ?? false;
  const finalClosureNotBlocked = input.finalClosureNotBlocked ?? false;
  const compileReport = input.compileNormalizedCapabilityDslReport;
  const exactLockReport = input.exactCapabilityLockReport;
  const preLoaderBlockers = buildPreLoaderBlockers({
    compileReport,
    exactLockReport,
    sourceCompiledRuntimeIrAuditHash,
    expectedCompiledRuntimeIrAuditHash,
    qaObserved,
    productionDefaultCutoverActive,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked
  });
  const loaderReport =
    preLoaderBlockers.length === 0 && compileReport.capabilityIr !== null && compileReport.runtimeSystemManifest !== null
      ? buildPhaserRuntimeSystemLoaderPlan({
          gameIr: compileReport.capabilityIr,
          manifest: compileReport.runtimeSystemManifest,
          capabilityLock: {
            ref: `${GAMEPLAY_CAPABILITY_LOCK_KIND}.json`,
            hash: exactLockReport.lockHash ?? '',
            capabilityIds: exactLockReport.capabilityLock?.capabilityIds ?? []
          }
        })
      : null;
  const loaderBlockers =
    loaderReport === null || loaderReport.status === 'ready' ? [] : loaderIssuesToBlockers(loaderReport.issues);
  const blockers = [...preLoaderBlockers, ...loaderBlockers];
  const runtimeConsumptionStatus: Step37ConsumeCompiledRuntimeIrStatus =
    blockers.length === 0 && loaderReport?.status === 'ready' ? 'passed' : 'blocked';
  const runtimeConsumed = runtimeConsumptionStatus === 'passed';
  const runtimeSystemCapabilityIds =
    loaderReport?.plan?.loadOrder.map((entry) => entry.capabilityId).sort() ?? [];
  const runtimeSystemIds = loaderReport?.plan?.loadOrder.map((entry) => entry.systemId).sort() ?? [];
  const payloadWithoutHash: Omit<Step37ConsumeCompiledRuntimeIrReport, 'auditHash'> = {
    artifactKind: STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_ARTIFACT_KIND,
    schemaVersion: STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_SCHEMA_VERSION,
    checkpointId: STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID,
    parentStageId: 'stage9',
    sourceCompiledRuntimeIrPath,
    sourceCompiledRuntimeIrAuditHash,
    expectedCompiledRuntimeIrAuditHash,
    compiledRuntimeIrAuditHashMatches: sourceCompiledRuntimeIrAuditHash === expectedCompiledRuntimeIrAuditHash,
    sourceCapabilityIrHash: compileReport.capabilityIrHash,
    sourceRuntimePlanHash: compileReport.runtimePlanHash,
    sourceRuntimeSystemManifestHash: compileReport.runtimeSystemManifestHash,
    sourceSceneIrAuthorityReportHash: compileReport.sceneIrAuthorityReportHash,
    sourceExactCapabilityLockHash: compileReport.sourceExactCapabilityLockHash,
    sourceExactLockProfileId: compileReport.sourceExactLockProfileId,
    compileStatus: compileReport.compileStatus,
    compileNextCheckpointId: compileReport.nextCheckpointId,
    runtimeLoaderReport: loaderReport?.status === 'ready' ? loaderReport : null,
    runtimeLoaderReportHash: loaderReport?.status === 'ready' ? hashStableJson(loaderReport) : null,
    runtimeLoaderStatus: loaderReport?.status ?? 'not_attempted',
    runtimeLoaderPlanHash: loaderReport?.status === 'ready' ? loaderReport.planHash ?? null : null,
    runtimeBindingReportHash: loaderReport?.status === 'ready' ? loaderReport.bindingReportHash ?? null : null,
    runtimeBindingStatus: loaderReport?.status === 'ready' ? loaderReport.bindingReport?.status ?? 'not_attempted' : 'not_attempted',
    outputRefs: {
      capabilityIr: runtimeConsumed ? CAPABILITY_IR_PATH : null,
      runtimePlan: runtimeConsumed ? CAPABILITY_RUNTIME_PLAN_PATH : null,
      runtimeSystemManifest: runtimeConsumed ? RUNTIME_SYSTEM_MANIFEST_PATH : null
    },
    requiredCapabilityCount: compileReport.requiredCapabilityCount,
    completeSupportedCount: compileReport.completeSupportedCount,
    packageCount: compileReport.packageCount,
    completeSupportedCapabilityIds: [...compileReport.completeSupportedCapabilityIds],
    runtimeSystemCapabilityIds,
    runtimeSystemIds,
    runtimeConsumptionStatus,
    normalized: compileReport.normalized,
    compiled: compileReport.compiled,
    runtimeConsumed,
    qaObserved,
    productionDefaultCutoverActive,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked,
    globalExitConditionsMet: false,
    parentStageStatusAfterRuntimeConsumption: runtimeConsumed ? 'running' : 'complete',
    nextCheckpointId: runtimeConsumed ? STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID : null,
    blockers
  };
  return { ...payloadWithoutHash, auditHash: hashStableJson(payloadWithoutHash) };
}

function buildPreLoaderBlockers(input: {
  compileReport: Step37CompileNormalizedCapabilityDslReport;
  exactLockReport: Step37ExactCapabilityLockReport;
  sourceCompiledRuntimeIrAuditHash: string;
  expectedCompiledRuntimeIrAuditHash: string;
  qaObserved: boolean;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
}): Step37ConsumeCompiledRuntimeIrBlocker[] {
  const blockers: Step37ConsumeCompiledRuntimeIrBlocker[] = [];
  if (input.sourceCompiledRuntimeIrAuditHash !== input.expectedCompiledRuntimeIrAuditHash) {
    blockers.push({
      errorCode: 'STAGE9_COMPILED_RUNTIME_IR_AUDIT_HASH_MISMATCH',
      capabilityIds: [],
      actual: input.sourceCompiledRuntimeIrAuditHash,
      expected: input.expectedCompiledRuntimeIrAuditHash,
      path: 'sourceCompiledRuntimeIrAuditHash'
    });
  }
  if (
    input.compileReport.compileStatus !== 'passed' ||
    !input.compileReport.compiled ||
    input.compileReport.nextCheckpointId !== STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID
  ) {
    blockers.push({
      errorCode: 'STAGE9_COMPILE_REPORT_NOT_PASSED',
      capabilityIds: [],
      actual: input.compileReport.compileStatus,
      expected: 'passed',
      path: 'compileStatus'
    });
  }
  blockers.push(...missingOutputBlockers(input.compileReport));
  blockers.push(...outputHashBlockers(input.compileReport));
  blockers.push(...exactLockBlockers(input.compileReport, input.exactLockReport));
  if (input.qaObserved) {
    blockers.push({ errorCode: 'STAGE9_QA_OBSERVATION_PREMATURE', capabilityIds: [], actual: true, expected: false, path: 'qaObserved' });
  }
  if (input.productionDefaultCutoverActive) {
    blockers.push({
      errorCode: 'STAGE9_PRODUCTION_CUTOVER_PREMATURE',
      capabilityIds: [],
      actual: true,
      expected: false,
      path: 'productionDefaultCutoverActive'
    });
  }
  if (input.legacyAuthoritativePathExited) {
    blockers.push({
      errorCode: 'STAGE9_LEGACY_AUTHORITY_EXIT_PREMATURE',
      capabilityIds: [],
      actual: true,
      expected: false,
      path: 'legacyAuthoritativePathExited'
    });
  }
  if (input.finalClosureNotBlocked) {
    blockers.push({
      errorCode: 'STAGE9_FINAL_CLOSURE_PREMATURE',
      capabilityIds: [],
      actual: true,
      expected: false,
      path: 'finalClosureNotBlocked'
    });
  }
  return blockers;
}

function missingOutputBlockers(report: Step37CompileNormalizedCapabilityDslReport): Step37ConsumeCompiledRuntimeIrBlocker[] {
  return [
    ['capabilityIr', report.capabilityIr],
    ['runtimePlan', report.runtimePlan],
    ['runtimeSystemManifest', report.runtimeSystemManifest],
    ['sceneIrAuthorityReport', report.sceneIrAuthorityReport]
  ].flatMap(([path, value]) =>
    value === null
      ? [
          {
            errorCode: 'STAGE9_COMPILE_OUTPUT_MISSING' as const,
            capabilityIds: [],
            actual: null,
            expected: 'present',
            path: String(path)
          }
        ]
      : []
  );
}

function outputHashBlockers(report: Step37CompileNormalizedCapabilityDslReport): Step37ConsumeCompiledRuntimeIrBlocker[] {
  return [
    ['capabilityIrHash', report.capabilityIrHash, report.capabilityIr],
    ['runtimePlanHash', report.runtimePlanHash, report.runtimePlan],
    ['runtimeSystemManifestHash', report.runtimeSystemManifestHash, report.runtimeSystemManifest],
    ['sceneIrAuthorityReportHash', report.sceneIrAuthorityReportHash, report.sceneIrAuthorityReport]
  ].flatMap(([path, recordedHash, value]) => {
    if (value === null) {
      return [];
    }
    const actualHash = hashStableJson(value);
    return recordedHash === actualHash
      ? []
      : [
          {
            errorCode: 'STAGE9_COMPILE_OUTPUT_HASH_MISMATCH' as const,
            capabilityIds: [],
            actual: recordedHash as string | null,
            expected: actualHash,
            path: String(path)
          }
        ];
  });
}

function exactLockBlockers(
  compileReport: Step37CompileNormalizedCapabilityDslReport,
  exactLockReport: Step37ExactCapabilityLockReport
): Step37ConsumeCompiledRuntimeIrBlocker[] {
  const exactCapabilityIds = exactLockReport.capabilityLock?.capabilityIds ?? [];
  const blockers: Step37ConsumeCompiledRuntimeIrBlocker[] = [];
  if (
    exactLockReport.lockHash === null ||
    compileReport.sourceExactCapabilityLockHash !== exactLockReport.lockHash ||
    exactLockReport.capabilityLock?.lockHash !== exactLockReport.lockHash
  ) {
    blockers.push({
      errorCode: 'STAGE9_EXACT_LOCK_MISMATCH',
      capabilityIds: [],
      actual: compileReport.sourceExactCapabilityLockHash,
      expected: exactLockReport.lockHash,
      path: 'sourceExactCapabilityLockHash'
    });
  }
  if (!sameStringSet(compileReport.completeSupportedCapabilityIds, [...exactCapabilityIds].sort())) {
    blockers.push({
      errorCode: 'STAGE9_EXACT_LOCK_MISMATCH',
      capabilityIds: [],
      actual: compileReport.completeSupportedCapabilityIds.length,
      expected: exactCapabilityIds.length,
      path: 'completeSupportedCapabilityIds'
    });
  }
  return blockers;
}

function loaderIssuesToBlockers(issues: readonly PhaserRuntimeLoaderIssue[]): Step37ConsumeCompiledRuntimeIrBlocker[] {
  return issues.map((issue) => ({
    errorCode: 'STAGE9_RUNTIME_LOADER_INVALID',
    capabilityIds: issue.capabilityId === undefined ? [] : [issue.capabilityId],
    actual: issue.code,
    expected: 'ready',
    path: issue.path
  }));
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.length === sortedRight.length && sortedLeft.every((value, index) => value === sortedRight[index]);
}

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${field} must be non-empty`);
  }
  return trimmed;
}
