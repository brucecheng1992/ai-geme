import { hashStableJson } from './gameplay-capabilities/stable-json.js';
import { type Step37ObserveRuntimeConsumedIrWithQaReport } from './step37-observe-runtime-consumed-ir-with-qa.js';
import {
  STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID,
  STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_CHECKPOINT_ID
} from './step37-remaining-inventory-driver.js';

export const STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_ARTIFACT_KIND =
  'step37_production_default_cutover_from_runtime_qa_observation';
export const STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_SCHEMA_VERSION =
  'step37_production_default_cutover_from_runtime_qa_observation.v0.1';
export const STEP37_STAGE11_PRODUCTION_DEFAULT_CUTOVER_PATH =
  'docs/plans/step37-production-default-cutover-from-runtime-qa-observation.v0.1.json';

export type Step37ActivateProductionDefaultCutoverStatus = 'passed' | 'blocked';

export type Step37ActivateProductionDefaultCutoverBlocker = {
  errorCode:
    | 'STAGE11_QA_OBSERVATION_AUDIT_HASH_MISMATCH'
    | 'STAGE11_QA_OBSERVATION_REPORT_HASH_MISMATCH'
    | 'STAGE11_QA_OBSERVATION_NOT_PASSED'
    | 'STAGE11_QA_OBSERVED_BINDING_REPORT_MISSING'
    | 'STAGE11_QA_OBSERVED_BINDING_REPORT_HASH_MISMATCH'
    | 'STAGE11_RUNTIME_MODULE_COUNT_MISMATCH'
    | 'STAGE11_PRODUCTION_DEFAULT_CUTOVER_NOT_ACTIVATED'
    | 'STAGE11_LEGACY_AUTHORITY_EXIT_PREMATURE'
    | 'STAGE11_FINAL_CLOSURE_PREMATURE';
  capabilityIds: string[];
  actual?: string | number | boolean | null;
  expected?: string | number | boolean | null;
  path?: string;
};

export type Step37ActivateProductionDefaultCutoverReport = {
  artifactKind: typeof STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_ARTIFACT_KIND;
  schemaVersion: typeof STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_SCHEMA_VERSION;
  checkpointId: typeof STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID;
  parentStageId: 'stage11';
  sourceRuntimeQaObservationPath: string;
  sourceRuntimeQaObservationAuditHash: string;
  expectedRuntimeQaObservationAuditHash: string;
  runtimeQaObservationAuditHashMatches: boolean;
  sourceRuntimeConsumptionAuditHash: string;
  sourceRuntimeLoaderReportHash: string | null;
  sourceRuntimeLoaderPlanHash: string | null;
  sourceRuntimeBindingReportHash: string | null;
  sourceQaObservedBindingReportHash: string | null;
  sourceQaObservationStatus: Step37ObserveRuntimeConsumedIrWithQaReport['qaObservationStatus'];
  requiredRuntimeModuleCount: number;
  observedRuntimeModuleCount: number;
  observedRuntimeSystemIds: string[];
  observedCapabilityIds: string[];
  observedProbeIds: string[];
  cutoverStatus: Step37ActivateProductionDefaultCutoverStatus;
  normalized: boolean;
  compiled: boolean;
  runtimeConsumed: boolean;
  qaObserved: boolean;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
  globalExitConditionsMet: false;
  parentStageStatusAfterCutover: 'running' | 'complete';
  nextCheckpointId: typeof STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_CHECKPOINT_ID | null;
  blockers: Step37ActivateProductionDefaultCutoverBlocker[];
  auditHash: string;
};

export function buildStep37ActivateProductionDefaultCutoverReport(input: {
  runtimeQaObservationReport: Step37ObserveRuntimeConsumedIrWithQaReport;
  sourceRuntimeQaObservationPath: string;
  sourceRuntimeQaObservationAuditHash: string;
  expectedRuntimeQaObservationAuditHash: string;
  productionDefaultCutoverActive?: boolean;
  legacyAuthoritativePathExited?: boolean;
  finalClosureNotBlocked?: boolean;
}): Step37ActivateProductionDefaultCutoverReport {
  const sourceRuntimeQaObservationPath = requireNonEmpty(input.sourceRuntimeQaObservationPath, 'sourceRuntimeQaObservationPath');
  const sourceRuntimeQaObservationAuditHash = requireNonEmpty(
    input.sourceRuntimeQaObservationAuditHash,
    'sourceRuntimeQaObservationAuditHash'
  );
  const expectedRuntimeQaObservationAuditHash = requireNonEmpty(
    input.expectedRuntimeQaObservationAuditHash,
    'expectedRuntimeQaObservationAuditHash'
  );
  const productionDefaultCutoverActive = input.productionDefaultCutoverActive ?? true;
  const legacyAuthoritativePathExited = input.legacyAuthoritativePathExited ?? false;
  const finalClosureNotBlocked = input.finalClosureNotBlocked ?? false;
  const runtimeQaObservationReport = input.runtimeQaObservationReport;
  const blockers = buildCutoverBlockers({
    runtimeQaObservationReport,
    sourceRuntimeQaObservationAuditHash,
    expectedRuntimeQaObservationAuditHash,
    productionDefaultCutoverActive,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked
  });
  const cutoverStatus: Step37ActivateProductionDefaultCutoverStatus = blockers.length === 0 ? 'passed' : 'blocked';
  const payloadWithoutHash: Omit<Step37ActivateProductionDefaultCutoverReport, 'auditHash'> = {
    artifactKind: STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_ARTIFACT_KIND,
    schemaVersion: STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_SCHEMA_VERSION,
    checkpointId: STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID,
    parentStageId: 'stage11',
    sourceRuntimeQaObservationPath,
    sourceRuntimeQaObservationAuditHash,
    expectedRuntimeQaObservationAuditHash,
    runtimeQaObservationAuditHashMatches: sourceRuntimeQaObservationAuditHash === expectedRuntimeQaObservationAuditHash,
    sourceRuntimeConsumptionAuditHash: runtimeQaObservationReport.sourceRuntimeConsumptionAuditHash,
    sourceRuntimeLoaderReportHash: runtimeQaObservationReport.sourceRuntimeLoaderReportHash,
    sourceRuntimeLoaderPlanHash: runtimeQaObservationReport.sourceRuntimeLoaderPlanHash,
    sourceRuntimeBindingReportHash: runtimeQaObservationReport.sourceRuntimeBindingReportHash,
    sourceQaObservedBindingReportHash: runtimeQaObservationReport.qaObservedBindingReportHash,
    sourceQaObservationStatus: runtimeQaObservationReport.qaObservationStatus,
    requiredRuntimeModuleCount: runtimeQaObservationReport.requiredRuntimeModuleCount,
    observedRuntimeModuleCount: runtimeQaObservationReport.observedRuntimeModuleCount,
    observedRuntimeSystemIds: [...runtimeQaObservationReport.observedRuntimeSystemIds],
    observedCapabilityIds: [...runtimeQaObservationReport.observedCapabilityIds],
    observedProbeIds: [...runtimeQaObservationReport.observedProbeIds],
    cutoverStatus,
    normalized: runtimeQaObservationReport.normalized,
    compiled: runtimeQaObservationReport.compiled,
    runtimeConsumed: runtimeQaObservationReport.runtimeConsumed,
    qaObserved: runtimeQaObservationReport.qaObserved,
    productionDefaultCutoverActive,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked,
    globalExitConditionsMet: false,
    parentStageStatusAfterCutover: cutoverStatus === 'passed' ? 'running' : 'complete',
    nextCheckpointId: cutoverStatus === 'passed' ? STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_CHECKPOINT_ID : null,
    blockers
  };
  return { ...payloadWithoutHash, auditHash: hashStableJson(payloadWithoutHash) };
}

function buildCutoverBlockers(input: {
  runtimeQaObservationReport: Step37ObserveRuntimeConsumedIrWithQaReport;
  sourceRuntimeQaObservationAuditHash: string;
  expectedRuntimeQaObservationAuditHash: string;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
}): Step37ActivateProductionDefaultCutoverBlocker[] {
  const blockers: Step37ActivateProductionDefaultCutoverBlocker[] = [];
  if (input.sourceRuntimeQaObservationAuditHash !== input.expectedRuntimeQaObservationAuditHash) {
    blockers.push({
      errorCode: 'STAGE11_QA_OBSERVATION_AUDIT_HASH_MISMATCH',
      capabilityIds: [],
      actual: input.sourceRuntimeQaObservationAuditHash,
      expected: input.expectedRuntimeQaObservationAuditHash,
      path: 'sourceRuntimeQaObservationAuditHash'
    });
  }
  if (input.runtimeQaObservationReport.auditHash !== hashReportWithoutAuditHash(input.runtimeQaObservationReport)) {
    blockers.push({
      errorCode: 'STAGE11_QA_OBSERVATION_REPORT_HASH_MISMATCH',
      capabilityIds: [],
      actual: input.runtimeQaObservationReport.auditHash,
      expected: hashReportWithoutAuditHash(input.runtimeQaObservationReport),
      path: 'runtimeQaObservationReport.auditHash'
    });
  }
  if (
    input.runtimeQaObservationReport.qaObservationStatus !== 'passed' ||
    !input.runtimeQaObservationReport.qaObserved ||
    input.runtimeQaObservationReport.nextCheckpointId !== STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID
  ) {
    blockers.push({
      errorCode: 'STAGE11_QA_OBSERVATION_NOT_PASSED',
      capabilityIds: [],
      actual: input.runtimeQaObservationReport.qaObservationStatus,
      expected: 'passed',
      path: 'qaObservationStatus'
    });
  }
  if (input.runtimeQaObservationReport.qaObservedBindingReport === null) {
    blockers.push({
      errorCode: 'STAGE11_QA_OBSERVED_BINDING_REPORT_MISSING',
      capabilityIds: [],
      actual: null,
      expected: 'present',
      path: 'qaObservedBindingReport'
    });
  } else if (input.runtimeQaObservationReport.qaObservedBindingReportHash !== hashStableJson(input.runtimeQaObservationReport.qaObservedBindingReport)) {
    blockers.push({
      errorCode: 'STAGE11_QA_OBSERVED_BINDING_REPORT_HASH_MISMATCH',
      capabilityIds: [],
      actual: input.runtimeQaObservationReport.qaObservedBindingReportHash,
      expected: hashStableJson(input.runtimeQaObservationReport.qaObservedBindingReport),
      path: 'qaObservedBindingReportHash'
    });
  }
  if (input.runtimeQaObservationReport.observedRuntimeModuleCount !== input.runtimeQaObservationReport.requiredRuntimeModuleCount) {
    blockers.push({
      errorCode: 'STAGE11_RUNTIME_MODULE_COUNT_MISMATCH',
      capabilityIds: input.runtimeQaObservationReport.observedCapabilityIds,
      actual: input.runtimeQaObservationReport.observedRuntimeModuleCount,
      expected: input.runtimeQaObservationReport.requiredRuntimeModuleCount,
      path: 'observedRuntimeModuleCount'
    });
  }
  if (!input.productionDefaultCutoverActive) {
    blockers.push({
      errorCode: 'STAGE11_PRODUCTION_DEFAULT_CUTOVER_NOT_ACTIVATED',
      capabilityIds: [],
      actual: false,
      expected: true,
      path: 'productionDefaultCutoverActive'
    });
  }
  if (input.legacyAuthoritativePathExited) {
    blockers.push({
      errorCode: 'STAGE11_LEGACY_AUTHORITY_EXIT_PREMATURE',
      capabilityIds: [],
      actual: true,
      expected: false,
      path: 'legacyAuthoritativePathExited'
    });
  }
  if (input.finalClosureNotBlocked) {
    blockers.push({
      errorCode: 'STAGE11_FINAL_CLOSURE_PREMATURE',
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
    throw new Error(`STEP37_STAGE11_FIELD_REQUIRED field="${field}"`);
  }
  return value;
}
