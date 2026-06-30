import { hashStableJson } from './gameplay-capabilities/stable-json.js';
import {
  STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_CHECKPOINT_ID,
  STEP37_STAGE13_FINAL_CLOSURE_CHECKPOINT_ID
} from './step37-remaining-inventory-driver.js';
import { type Step37ActivateProductionDefaultCutoverReport } from './step37-activate-production-default-cutover.js';

export const STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_ARTIFACT_KIND =
  'step37_legacy_authoritative_path_exit_from_production_cutover';
export const STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_SCHEMA_VERSION =
  'step37_legacy_authoritative_path_exit_from_production_cutover.v0.1';
export const STEP37_STAGE12_LEGACY_AUTHORITATIVE_PATH_EXIT_PATH =
  'docs/plans/step37-legacy-authoritative-path-exit-from-production-cutover.v0.1.json';

export type Step37ExitLegacyAuthoritativePathStatus = 'passed' | 'blocked';

export type Step37ExitLegacyAuthoritativePathBlocker = {
  errorCode:
    | 'STAGE12_PRODUCTION_CUTOVER_AUDIT_HASH_MISMATCH'
    | 'STAGE12_PRODUCTION_CUTOVER_REPORT_HASH_MISMATCH'
    | 'STAGE12_PRODUCTION_CUTOVER_NOT_PASSED'
    | 'STAGE12_PRODUCTION_DEFAULT_CUTOVER_NOT_ACTIVE'
    | 'STAGE12_LEGACY_AUTHORITY_EXIT_NOT_ACTIVATED'
    | 'STAGE12_FINAL_CLOSURE_PREMATURE';
  capabilityIds: string[];
  actual?: string | number | boolean | null;
  expected?: string | number | boolean | null;
  path?: string;
};

export type Step37ExitLegacyAuthoritativePathReport = {
  artifactKind: typeof STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_ARTIFACT_KIND;
  schemaVersion: typeof STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_SCHEMA_VERSION;
  checkpointId: typeof STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_CHECKPOINT_ID;
  parentStageId: 'stage12';
  sourceProductionDefaultCutoverPath: string;
  sourceProductionDefaultCutoverAuditHash: string;
  expectedProductionDefaultCutoverAuditHash: string;
  productionDefaultCutoverAuditHashMatches: boolean;
  sourceRuntimeQaObservationAuditHash: string;
  sourceRuntimeConsumptionAuditHash: string;
  sourceRuntimeLoaderReportHash: string | null;
  sourceRuntimeLoaderPlanHash: string | null;
  sourceRuntimeBindingReportHash: string | null;
  sourceQaObservedBindingReportHash: string | null;
  sourceCutoverStatus: Step37ActivateProductionDefaultCutoverReport['cutoverStatus'];
  requiredRuntimeModuleCount: number;
  observedRuntimeModuleCount: number;
  observedRuntimeSystemIds: string[];
  observedCapabilityIds: string[];
  observedProbeIds: string[];
  exitStatus: Step37ExitLegacyAuthoritativePathStatus;
  normalized: boolean;
  compiled: boolean;
  runtimeConsumed: boolean;
  qaObserved: boolean;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
  globalExitConditionsMet: false;
  parentStageStatusAfterExit: 'running' | 'complete';
  nextCheckpointId: typeof STEP37_STAGE13_FINAL_CLOSURE_CHECKPOINT_ID | null;
  blockers: Step37ExitLegacyAuthoritativePathBlocker[];
  auditHash: string;
};

export function buildStep37ExitLegacyAuthoritativePathReport(input: {
  productionDefaultCutoverReport: Step37ActivateProductionDefaultCutoverReport;
  sourceProductionDefaultCutoverPath: string;
  sourceProductionDefaultCutoverAuditHash: string;
  expectedProductionDefaultCutoverAuditHash: string;
  legacyAuthoritativePathExited?: boolean;
  finalClosureNotBlocked?: boolean;
}): Step37ExitLegacyAuthoritativePathReport {
  const sourceProductionDefaultCutoverPath = requireNonEmpty(
    input.sourceProductionDefaultCutoverPath,
    'sourceProductionDefaultCutoverPath'
  );
  const sourceProductionDefaultCutoverAuditHash = requireNonEmpty(
    input.sourceProductionDefaultCutoverAuditHash,
    'sourceProductionDefaultCutoverAuditHash'
  );
  const expectedProductionDefaultCutoverAuditHash = requireNonEmpty(
    input.expectedProductionDefaultCutoverAuditHash,
    'expectedProductionDefaultCutoverAuditHash'
  );
  const legacyAuthoritativePathExited = input.legacyAuthoritativePathExited ?? true;
  const finalClosureNotBlocked = input.finalClosureNotBlocked ?? false;
  const cutoverReport = input.productionDefaultCutoverReport;
  const blockers = buildLegacyExitBlockers({
    cutoverReport,
    sourceProductionDefaultCutoverAuditHash,
    expectedProductionDefaultCutoverAuditHash,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked
  });
  const exitStatus: Step37ExitLegacyAuthoritativePathStatus = blockers.length === 0 ? 'passed' : 'blocked';
  const payloadWithoutHash: Omit<Step37ExitLegacyAuthoritativePathReport, 'auditHash'> = {
    artifactKind: STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_ARTIFACT_KIND,
    schemaVersion: STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_SCHEMA_VERSION,
    checkpointId: STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_CHECKPOINT_ID,
    parentStageId: 'stage12',
    sourceProductionDefaultCutoverPath,
    sourceProductionDefaultCutoverAuditHash,
    expectedProductionDefaultCutoverAuditHash,
    productionDefaultCutoverAuditHashMatches: sourceProductionDefaultCutoverAuditHash === expectedProductionDefaultCutoverAuditHash,
    sourceRuntimeQaObservationAuditHash: cutoverReport.sourceRuntimeQaObservationAuditHash,
    sourceRuntimeConsumptionAuditHash: cutoverReport.sourceRuntimeConsumptionAuditHash,
    sourceRuntimeLoaderReportHash: cutoverReport.sourceRuntimeLoaderReportHash,
    sourceRuntimeLoaderPlanHash: cutoverReport.sourceRuntimeLoaderPlanHash,
    sourceRuntimeBindingReportHash: cutoverReport.sourceRuntimeBindingReportHash,
    sourceQaObservedBindingReportHash: cutoverReport.sourceQaObservedBindingReportHash,
    sourceCutoverStatus: cutoverReport.cutoverStatus,
    requiredRuntimeModuleCount: cutoverReport.requiredRuntimeModuleCount,
    observedRuntimeModuleCount: cutoverReport.observedRuntimeModuleCount,
    observedRuntimeSystemIds: [...cutoverReport.observedRuntimeSystemIds],
    observedCapabilityIds: [...cutoverReport.observedCapabilityIds],
    observedProbeIds: [...cutoverReport.observedProbeIds],
    exitStatus,
    normalized: cutoverReport.normalized,
    compiled: cutoverReport.compiled,
    runtimeConsumed: cutoverReport.runtimeConsumed,
    qaObserved: cutoverReport.qaObserved,
    productionDefaultCutoverActive: cutoverReport.productionDefaultCutoverActive,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked,
    globalExitConditionsMet: false,
    parentStageStatusAfterExit: exitStatus === 'passed' ? 'running' : 'complete',
    nextCheckpointId: exitStatus === 'passed' ? STEP37_STAGE13_FINAL_CLOSURE_CHECKPOINT_ID : null,
    blockers
  };
  return { ...payloadWithoutHash, auditHash: hashStableJson(payloadWithoutHash) };
}

function buildLegacyExitBlockers(input: {
  cutoverReport: Step37ActivateProductionDefaultCutoverReport;
  sourceProductionDefaultCutoverAuditHash: string;
  expectedProductionDefaultCutoverAuditHash: string;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
}): Step37ExitLegacyAuthoritativePathBlocker[] {
  const blockers: Step37ExitLegacyAuthoritativePathBlocker[] = [];
  if (input.sourceProductionDefaultCutoverAuditHash !== input.expectedProductionDefaultCutoverAuditHash) {
    blockers.push({
      errorCode: 'STAGE12_PRODUCTION_CUTOVER_AUDIT_HASH_MISMATCH',
      capabilityIds: [],
      actual: input.sourceProductionDefaultCutoverAuditHash,
      expected: input.expectedProductionDefaultCutoverAuditHash,
      path: 'sourceProductionDefaultCutoverAuditHash'
    });
  }
  if (input.cutoverReport.auditHash !== hashReportWithoutAuditHash(input.cutoverReport)) {
    blockers.push({
      errorCode: 'STAGE12_PRODUCTION_CUTOVER_REPORT_HASH_MISMATCH',
      capabilityIds: [],
      actual: input.cutoverReport.auditHash,
      expected: hashReportWithoutAuditHash(input.cutoverReport),
      path: 'productionDefaultCutoverReport.auditHash'
    });
  }
  if (
    input.cutoverReport.cutoverStatus !== 'passed' ||
    !input.cutoverReport.productionDefaultCutoverActive ||
    input.cutoverReport.nextCheckpointId !== STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_CHECKPOINT_ID
  ) {
    blockers.push({
      errorCode: 'STAGE12_PRODUCTION_CUTOVER_NOT_PASSED',
      capabilityIds: [],
      actual: input.cutoverReport.cutoverStatus,
      expected: 'passed',
      path: 'cutoverStatus'
    });
  }
  if (!input.cutoverReport.productionDefaultCutoverActive) {
    blockers.push({
      errorCode: 'STAGE12_PRODUCTION_DEFAULT_CUTOVER_NOT_ACTIVE',
      capabilityIds: [],
      actual: false,
      expected: true,
      path: 'productionDefaultCutoverActive'
    });
  }
  if (!input.legacyAuthoritativePathExited) {
    blockers.push({
      errorCode: 'STAGE12_LEGACY_AUTHORITY_EXIT_NOT_ACTIVATED',
      capabilityIds: [],
      actual: false,
      expected: true,
      path: 'legacyAuthoritativePathExited'
    });
  }
  if (input.finalClosureNotBlocked) {
    blockers.push({
      errorCode: 'STAGE12_FINAL_CLOSURE_PREMATURE',
      capabilityIds: [],
      actual: true,
      expected: false,
      path: 'finalClosureNotBlocked'
    });
  }
  return blockers;
}

function hashReportWithoutAuditHash<TReport extends { auditHash: string }>(report: TReport): string {
  const { auditHash: _auditHash, ...payloadWithoutHash } = report;
  return hashStableJson(payloadWithoutHash);
}

function requireNonEmpty(value: string, field: string): string {
  if (value.trim().length === 0) {
    throw new Error(`STEP37_STAGE12_FIELD_REQUIRED field="${field}"`);
  }
  return value;
}
