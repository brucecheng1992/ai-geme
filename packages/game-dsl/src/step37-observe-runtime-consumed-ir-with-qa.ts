import { type CapabilityRuntimeBindingReport } from './gameplay-capabilities/phaser-runtime-loader.js';
import { hashStableJson } from './gameplay-capabilities/stable-json.js';
import { type Step37ConsumeCompiledRuntimeIrReport } from './step37-consume-compiled-runtime-ir.js';
import {
  STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID,
  STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID
} from './step37-remaining-inventory-driver.js';

export const STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_ARTIFACT_KIND =
  'step37_runtime_qa_observation_from_consumed_runtime_ir';
export const STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_SCHEMA_VERSION =
  'step37_runtime_qa_observation_from_consumed_runtime_ir.v0.1';
export const STEP37_STAGE10_RUNTIME_QA_OBSERVATION_PATH =
  'docs/plans/step37-runtime-qa-observation-from-consumed-runtime-ir.v0.1.json';

export type Step37RuntimeQaObservation = {
  systemId: string;
  capabilityId: string;
  probeId: string;
  status: 'observed' | 'missing';
  sourceRef?: string;
};

export type Step37ObserveRuntimeConsumedIrWithQaStatus = 'passed' | 'blocked';

export type Step37ObserveRuntimeConsumedIrWithQaBlocker = {
  errorCode:
    | 'STAGE10_RUNTIME_CONSUMPTION_AUDIT_HASH_MISMATCH'
    | 'STAGE10_RUNTIME_CONSUMPTION_NOT_PASSED'
    | 'STAGE10_RUNTIME_LOADER_REPORT_MISSING'
    | 'STAGE10_RUNTIME_BINDING_REPORT_MISSING'
    | 'STAGE10_RUNTIME_MODULE_QA_OBSERVATION_MISSING'
    | 'STAGE10_RUNTIME_MODULE_QA_PROBE_UNDECLARED'
    | 'STAGE10_RUNTIME_MODULE_QA_CAPABILITY_MISMATCH'
    | 'STAGE10_RUNTIME_MODULE_QA_STATUS_NOT_OBSERVED'
    | 'STAGE10_PRODUCTION_CUTOVER_PREMATURE'
    | 'STAGE10_LEGACY_AUTHORITY_EXIT_PREMATURE'
    | 'STAGE10_FINAL_CLOSURE_PREMATURE';
  capabilityIds: string[];
  systemId?: string;
  probeId?: string;
  actual?: string | number | boolean | null;
  expected?: string | number | boolean | null;
  path?: string;
  sourceRef?: string;
};

export type Step37ObserveRuntimeConsumedIrWithQaReport = {
  artifactKind: typeof STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_ARTIFACT_KIND;
  schemaVersion: typeof STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_SCHEMA_VERSION;
  checkpointId: typeof STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID;
  parentStageId: 'stage10';
  sourceRuntimeConsumptionPath: string;
  sourceRuntimeConsumptionAuditHash: string;
  expectedRuntimeConsumptionAuditHash: string;
  runtimeConsumptionAuditHashMatches: boolean;
  sourceRuntimeLoaderReportHash: string | null;
  sourceRuntimeLoaderPlanHash: string | null;
  sourceRuntimeBindingReportHash: string | null;
  sourceRuntimeBindingStatus: Step37ConsumeCompiledRuntimeIrReport['runtimeBindingStatus'];
  qaObservedBindingReport: CapabilityRuntimeBindingReport | null;
  qaObservedBindingReportHash: string | null;
  requiredRuntimeModuleCount: number;
  observedRuntimeModuleCount: number;
  requiredRuntimeSystemIds: string[];
  observedRuntimeSystemIds: string[];
  observedCapabilityIds: string[];
  observedProbeIds: string[];
  qaObservationStatus: Step37ObserveRuntimeConsumedIrWithQaStatus;
  normalized: boolean;
  compiled: boolean;
  runtimeConsumed: boolean;
  qaObserved: boolean;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
  globalExitConditionsMet: false;
  parentStageStatusAfterQaObservation: 'running' | 'complete';
  nextCheckpointId: typeof STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID | null;
  blockers: Step37ObserveRuntimeConsumedIrWithQaBlocker[];
  auditHash: string;
};

export function buildStep37ObserveRuntimeConsumedIrWithQaReport(input: {
  runtimeConsumptionReport: Step37ConsumeCompiledRuntimeIrReport;
  sourceRuntimeConsumptionPath: string;
  sourceRuntimeConsumptionAuditHash: string;
  expectedRuntimeConsumptionAuditHash: string;
  qaObservations: readonly Step37RuntimeQaObservation[];
  productionDefaultCutoverActive?: boolean;
  legacyAuthoritativePathExited?: boolean;
  finalClosureNotBlocked?: boolean;
}): Step37ObserveRuntimeConsumedIrWithQaReport {
  const sourceRuntimeConsumptionPath = requireNonEmpty(input.sourceRuntimeConsumptionPath, 'sourceRuntimeConsumptionPath');
  const sourceRuntimeConsumptionAuditHash = requireNonEmpty(
    input.sourceRuntimeConsumptionAuditHash,
    'sourceRuntimeConsumptionAuditHash'
  );
  const expectedRuntimeConsumptionAuditHash = requireNonEmpty(
    input.expectedRuntimeConsumptionAuditHash,
    'expectedRuntimeConsumptionAuditHash'
  );
  const productionDefaultCutoverActive = input.productionDefaultCutoverActive ?? false;
  const legacyAuthoritativePathExited = input.legacyAuthoritativePathExited ?? false;
  const finalClosureNotBlocked = input.finalClosureNotBlocked ?? false;
  const runtimeReport = input.runtimeConsumptionReport;
  const bindingReport = runtimeReport.runtimeLoaderReport?.bindingReport ?? null;
  const blockers = [
    ...buildSourceBlockers({
      runtimeReport,
      sourceRuntimeConsumptionAuditHash,
      expectedRuntimeConsumptionAuditHash,
      productionDefaultCutoverActive,
      legacyAuthoritativePathExited,
      finalClosureNotBlocked
    }),
    ...buildQaObservationBlockers(bindingReport, input.qaObservations)
  ];
  const qaObservationStatus: Step37ObserveRuntimeConsumedIrWithQaStatus = blockers.length === 0 ? 'passed' : 'blocked';
  const qaObservedBindingReport = qaObservationStatus === 'passed' && bindingReport !== null ? buildQaObservedBindingReport(bindingReport) : null;
  const observedRuntimeSystemIds =
    qaObservationStatus === 'passed'
      ? uniqueSorted(input.qaObservations.filter((observation) => observation.status === 'observed').map((observation) => observation.systemId))
      : [];
  const observedCapabilityIds =
    qaObservationStatus === 'passed'
      ? uniqueSorted(input.qaObservations.filter((observation) => observation.status === 'observed').map((observation) => observation.capabilityId))
      : [];
  const observedProbeIds =
    qaObservationStatus === 'passed'
      ? uniqueSorted(input.qaObservations.filter((observation) => observation.status === 'observed').map((observation) => observation.probeId))
      : [];
  const requiredRuntimeSystemIds = bindingReport?.modules.map((module) => module.systemId).sort() ?? [];
  const payloadWithoutHash: Omit<Step37ObserveRuntimeConsumedIrWithQaReport, 'auditHash'> = {
    artifactKind: STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_ARTIFACT_KIND,
    schemaVersion: STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_SCHEMA_VERSION,
    checkpointId: STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID,
    parentStageId: 'stage10',
    sourceRuntimeConsumptionPath,
    sourceRuntimeConsumptionAuditHash,
    expectedRuntimeConsumptionAuditHash,
    runtimeConsumptionAuditHashMatches: sourceRuntimeConsumptionAuditHash === expectedRuntimeConsumptionAuditHash,
    sourceRuntimeLoaderReportHash: runtimeReport.runtimeLoaderReportHash,
    sourceRuntimeLoaderPlanHash: runtimeReport.runtimeLoaderPlanHash,
    sourceRuntimeBindingReportHash: runtimeReport.runtimeBindingReportHash,
    sourceRuntimeBindingStatus: runtimeReport.runtimeBindingStatus,
    qaObservedBindingReport,
    qaObservedBindingReportHash: qaObservedBindingReport === null ? null : hashStableJson(qaObservedBindingReport),
    requiredRuntimeModuleCount: bindingReport?.modules.length ?? 0,
    observedRuntimeModuleCount: observedRuntimeSystemIds.length,
    requiredRuntimeSystemIds,
    observedRuntimeSystemIds,
    observedCapabilityIds,
    observedProbeIds,
    qaObservationStatus,
    normalized: runtimeReport.normalized,
    compiled: runtimeReport.compiled,
    runtimeConsumed: runtimeReport.runtimeConsumed,
    qaObserved: qaObservationStatus === 'passed',
    productionDefaultCutoverActive,
    legacyAuthoritativePathExited,
    finalClosureNotBlocked,
    globalExitConditionsMet: false,
    parentStageStatusAfterQaObservation: qaObservationStatus === 'passed' ? 'running' : 'complete',
    nextCheckpointId: qaObservationStatus === 'passed' ? STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID : null,
    blockers
  };
  return { ...payloadWithoutHash, auditHash: hashStableJson(payloadWithoutHash) };
}

function buildSourceBlockers(input: {
  runtimeReport: Step37ConsumeCompiledRuntimeIrReport;
  sourceRuntimeConsumptionAuditHash: string;
  expectedRuntimeConsumptionAuditHash: string;
  productionDefaultCutoverActive: boolean;
  legacyAuthoritativePathExited: boolean;
  finalClosureNotBlocked: boolean;
}): Step37ObserveRuntimeConsumedIrWithQaBlocker[] {
  const blockers: Step37ObserveRuntimeConsumedIrWithQaBlocker[] = [];
  if (input.sourceRuntimeConsumptionAuditHash !== input.expectedRuntimeConsumptionAuditHash) {
    blockers.push({
      errorCode: 'STAGE10_RUNTIME_CONSUMPTION_AUDIT_HASH_MISMATCH',
      capabilityIds: [],
      actual: input.sourceRuntimeConsumptionAuditHash,
      expected: input.expectedRuntimeConsumptionAuditHash,
      path: 'sourceRuntimeConsumptionAuditHash'
    });
  }
  if (input.runtimeReport.runtimeConsumptionStatus !== 'passed' || !input.runtimeReport.runtimeConsumed) {
    blockers.push({
      errorCode: 'STAGE10_RUNTIME_CONSUMPTION_NOT_PASSED',
      capabilityIds: [],
      actual: input.runtimeReport.runtimeConsumptionStatus,
      expected: 'passed',
      path: 'runtimeConsumptionStatus'
    });
  }
  if (input.runtimeReport.runtimeLoaderReport === null || input.runtimeReport.runtimeLoaderReport.status !== 'ready') {
    blockers.push({
      errorCode: 'STAGE10_RUNTIME_LOADER_REPORT_MISSING',
      capabilityIds: [],
      actual: input.runtimeReport.runtimeLoaderStatus,
      expected: 'ready',
      path: 'runtimeLoaderReport'
    });
  }
  if (input.runtimeReport.runtimeLoaderReport?.bindingReport === undefined) {
    blockers.push({
      errorCode: 'STAGE10_RUNTIME_BINDING_REPORT_MISSING',
      capabilityIds: [],
      actual: null,
      expected: 'present',
      path: 'runtimeLoaderReport.bindingReport'
    });
  }
  if (input.productionDefaultCutoverActive) {
    blockers.push({
      errorCode: 'STAGE10_PRODUCTION_CUTOVER_PREMATURE',
      capabilityIds: [],
      actual: true,
      expected: false,
      path: 'productionDefaultCutoverActive'
    });
  }
  if (input.legacyAuthoritativePathExited) {
    blockers.push({
      errorCode: 'STAGE10_LEGACY_AUTHORITY_EXIT_PREMATURE',
      capabilityIds: [],
      actual: true,
      expected: false,
      path: 'legacyAuthoritativePathExited'
    });
  }
  if (input.finalClosureNotBlocked) {
    blockers.push({
      errorCode: 'STAGE10_FINAL_CLOSURE_PREMATURE',
      capabilityIds: [],
      actual: true,
      expected: false,
      path: 'finalClosureNotBlocked'
    });
  }
  return blockers;
}

function buildQaObservationBlockers(
  bindingReport: CapabilityRuntimeBindingReport | null,
  qaObservations: readonly Step37RuntimeQaObservation[]
): Step37ObserveRuntimeConsumedIrWithQaBlocker[] {
  if (bindingReport === null) {
    return [];
  }
  const observationBySystemId = new Map(qaObservations.map((observation) => [observation.systemId, observation]));
  return bindingReport.modules.flatMap((module) => {
    const observation = observationBySystemId.get(module.systemId);
    if (observation === undefined) {
      return [
        {
          errorCode: 'STAGE10_RUNTIME_MODULE_QA_OBSERVATION_MISSING' as const,
          capabilityIds: [module.capabilityId],
          systemId: module.systemId,
          actual: null,
          expected: 'observed',
          path: `qaObservations.${module.systemId}`
        }
      ];
    }
    const blockers: Step37ObserveRuntimeConsumedIrWithQaBlocker[] = [];
    if (observation.capabilityId !== module.capabilityId) {
      blockers.push({
        errorCode: 'STAGE10_RUNTIME_MODULE_QA_CAPABILITY_MISMATCH',
        capabilityIds: [module.capabilityId],
        systemId: module.systemId,
        actual: observation.capabilityId,
        expected: module.capabilityId,
        path: `qaObservations.${module.systemId}.capabilityId`,
        sourceRef: observation.sourceRef
      });
    }
    if (!module.qaProbeIds.includes(observation.probeId)) {
      blockers.push({
        errorCode: 'STAGE10_RUNTIME_MODULE_QA_PROBE_UNDECLARED',
        capabilityIds: [module.capabilityId],
        systemId: module.systemId,
        probeId: observation.probeId,
        actual: observation.probeId,
        expected: module.qaProbeIds.join(','),
        path: `qaObservations.${module.systemId}.probeId`,
        sourceRef: observation.sourceRef
      });
    }
    if (observation.status !== 'observed') {
      blockers.push({
        errorCode: 'STAGE10_RUNTIME_MODULE_QA_STATUS_NOT_OBSERVED',
        capabilityIds: [module.capabilityId],
        systemId: module.systemId,
        probeId: observation.probeId,
        actual: observation.status,
        expected: 'observed',
        path: `qaObservations.${module.systemId}.status`,
        sourceRef: observation.sourceRef
      });
    }
    return blockers;
  });
}

function buildQaObservedBindingReport(bindingReport: CapabilityRuntimeBindingReport): CapabilityRuntimeBindingReport {
  const payload: Omit<CapabilityRuntimeBindingReport, 'reportHash'> = {
    artifactKind: bindingReport.artifactKind,
    schemaVersion: bindingReport.schemaVersion,
    runtimeFamily: bindingReport.runtimeFamily,
    profileId: bindingReport.profileId,
    capabilityLockRef: bindingReport.capabilityLockRef,
    capabilityLockHash: bindingReport.capabilityLockHash,
    status: 'qa_observed',
    modules: bindingReport.modules.map((module) => ({ ...module, status: 'qa_observed' }))
  };
  return { ...payload, reportHash: hashStableJson(payload) };
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${field} must be non-empty`);
  }
  return trimmed;
}
