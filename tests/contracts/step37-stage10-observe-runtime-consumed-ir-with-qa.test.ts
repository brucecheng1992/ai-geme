import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_ARTIFACT_KIND,
  STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID,
  STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_SCHEMA_VERSION,
  STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID,
  buildDeepSeekRunAndGunValidationProfileSupportSummary,
  buildStep37CapabilityDslDraftReport,
  buildStep37CompileNormalizedCapabilityDslReport,
  buildStep37ComposedDslSchemaReport,
  buildStep37ConsumeCompiledRuntimeIrReport,
  buildStep37ExactCapabilityLockReport,
  buildStep37NormalizeCapabilityDslDraftReport,
  buildStep37ObserveRuntimeConsumedIrWithQaReport,
  buildStep37PromotedSupportSummary,
  buildStep37Stage4ExitAuditReport,
  buildStep37Stage5EntryAuditReport,
  buildStep37SupportPromotionApplicationReport,
  buildStep37SupportPromotionInventory,
  createStep37CompleteSupportedPackageContracts,
  hashStep37SupportPromotionInventoryArtifact,
  parseStep37SupportPromotionInventoryArtifact,
  type Step37ConsumeCompiledRuntimeIrReport,
  type Step37RuntimeQaObservation
} from '../../packages/game-dsl/src/index.js';
import { hashStableJson } from '../../packages/game-dsl/src/gameplay-capabilities/stable-json.js';

const supportPromotionInventoryPath = 'docs/plans/step37-support-promotion-per-capability-inventory.v0.1.json';
const supportPromotionCompleteSupportedViewPath = 'docs/plans/step37-support-promotion-complete-supported-view.v0.1.json';
const stage4ExitAuditPath = 'docs/plans/step37-stage4-exit-audit-after-support-promotion.v0.1.json';
const stage5EntryAuditPath = 'docs/plans/step37-stage5-entry-audit-after-stage4-exit.v0.1.json';
const exactLockPath = 'docs/plans/step37-exact-capability-lock-from-complete-supported-packages.v0.1.json';
const composedSchemaPath = 'docs/plans/step37-composed-dsl-schema-from-exact-capability-lock.v0.1.json';
const capabilityDslDraftPath = 'docs/plans/step37-capability-dsl-draft-from-composed-schema.v0.1.json';
const normalizedDslPath = 'docs/plans/step37-normalized-capability-dsl-from-draft.v0.1.json';
const compiledRuntimeIrPath = 'docs/plans/step37-compiled-runtime-ir-from-normalized-capability-dsl.v0.1.json';
const runtimeConsumptionPath = 'docs/plans/step37-runtime-consumption-from-compiled-runtime-ir.v0.1.json';
const runtimeQaObservationPath = 'docs/plans/step37-runtime-qa-observation-from-consumed-runtime-ir.v0.1.json';

describe('Step37 Stage 10 observe runtime-consumed IR with QA', () => {
  it('marks runtime-consumed IR as QA-observed only when every runtime module has matching module-owned QA evidence', () => {
    const runtimeConsumption = currentStage10Input();
    const report = buildStep37ObserveRuntimeConsumedIrWithQaReport({
      runtimeConsumptionReport: runtimeConsumption,
      sourceRuntimeConsumptionPath: runtimeConsumptionPath,
      sourceRuntimeConsumptionAuditHash: runtimeConsumption.auditHash,
      expectedRuntimeConsumptionAuditHash: runtimeConsumption.auditHash,
      qaObservations: qaObservationsFor(runtimeConsumption)
    });

    expect(report.artifactKind).toBe(STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_ARTIFACT_KIND);
    expect(report.schemaVersion).toBe(STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_SCHEMA_VERSION);
    expect(report.checkpointId).toBe(STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID);
    expect(report.qaObservationStatus).toBe('passed');
    expect(report.normalized).toBe(true);
    expect(report.compiled).toBe(true);
    expect(report.runtimeConsumed).toBe(true);
    expect(report.qaObserved).toBe(true);
    expect(report.productionDefaultCutoverActive).toBe(false);
    expect(report.legacyAuthoritativePathExited).toBe(false);
    expect(report.finalClosureNotBlocked).toBe(false);
    expect(report.globalExitConditionsMet).toBe(false);
    expect(report.parentStageStatusAfterQaObservation).toBe('running');
    expect(report.nextCheckpointId).toBe(STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID);
    expect(report.blockers).toEqual([]);
    expect(report.requiredRuntimeModuleCount).toBe(runtimeConsumption.runtimeLoaderReport?.bindingReport?.modules.length);
    expect(report.observedRuntimeModuleCount).toBe(report.requiredRuntimeModuleCount);
    expect(report.observedRuntimeSystemIds).toEqual(runtimeConsumption.runtimeSystemIds);
    expect(report.observedCapabilityIds).toEqual(runtimeConsumption.runtimeSystemCapabilityIds);
    expect(report.qaObservedBindingReport?.status).toBe('qa_observed');
    expect(report.qaObservedBindingReport?.modules.every((module) => module.status === 'qa_observed')).toBe(true);
    expect(report.qaObservedBindingReportHash).toBe(hashStableJson(report.qaObservedBindingReport));
  });

  it('fails closed when a runtime module observation is missing', () => {
    const runtimeConsumption = currentStage10Input();
    const observations = qaObservationsFor(runtimeConsumption).slice(1);
    const report = buildStep37ObserveRuntimeConsumedIrWithQaReport({
      runtimeConsumptionReport: runtimeConsumption,
      sourceRuntimeConsumptionPath: runtimeConsumptionPath,
      sourceRuntimeConsumptionAuditHash: runtimeConsumption.auditHash,
      expectedRuntimeConsumptionAuditHash: runtimeConsumption.auditHash,
      qaObservations: observations
    });

    expect(report.qaObservationStatus).toBe('blocked');
    expect(report.qaObserved).toBe(false);
    expect(report.nextCheckpointId).toBeNull();
    expect(report.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ errorCode: 'STAGE10_RUNTIME_MODULE_QA_OBSERVATION_MISSING' })]));
  });

  it('fails closed when generic QA evidence tries to replace module-owned probe evidence', () => {
    const runtimeConsumption = currentStage10Input();
    const observations = qaObservationsFor(runtimeConsumption).map((observation) => ({
      ...observation,
      probeId: 'qa.generic.runtime.loaded'
    }));
    const report = buildStep37ObserveRuntimeConsumedIrWithQaReport({
      runtimeConsumptionReport: runtimeConsumption,
      sourceRuntimeConsumptionPath: runtimeConsumptionPath,
      sourceRuntimeConsumptionAuditHash: runtimeConsumption.auditHash,
      expectedRuntimeConsumptionAuditHash: runtimeConsumption.auditHash,
      qaObservations: observations
    });

    expect(report.qaObservationStatus).toBe('blocked');
    expect(report.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ errorCode: 'STAGE10_RUNTIME_MODULE_QA_PROBE_UNDECLARED' })]));
  });

  it('fails closed when the consumed runtime IR source hash drifts', () => {
    const runtimeConsumption = currentStage10Input();
    const report = buildStep37ObserveRuntimeConsumedIrWithQaReport({
      runtimeConsumptionReport: runtimeConsumption,
      sourceRuntimeConsumptionPath: runtimeConsumptionPath,
      sourceRuntimeConsumptionAuditHash: 'fnv1a_stale_stage9',
      expectedRuntimeConsumptionAuditHash: runtimeConsumption.auditHash,
      qaObservations: qaObservationsFor(runtimeConsumption)
    });

    expect(report.qaObservationStatus).toBe('blocked');
    expect(report.qaObserved).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          errorCode: 'STAGE10_RUNTIME_CONSUMPTION_AUDIT_HASH_MISMATCH',
          actual: 'fnv1a_stale_stage9',
          expected: runtimeConsumption.auditHash
        })
      ])
    );
  });

  it('fails closed when callers smuggle cutover, legacy exit, or final closure into QA observation', () => {
    const runtimeConsumption = currentStage10Input();
    const report = buildStep37ObserveRuntimeConsumedIrWithQaReport({
      runtimeConsumptionReport: runtimeConsumption,
      sourceRuntimeConsumptionPath: runtimeConsumptionPath,
      sourceRuntimeConsumptionAuditHash: runtimeConsumption.auditHash,
      expectedRuntimeConsumptionAuditHash: runtimeConsumption.auditHash,
      qaObservations: qaObservationsFor(runtimeConsumption),
      productionDefaultCutoverActive: true,
      legacyAuthoritativePathExited: true,
      finalClosureNotBlocked: true
    });

    expect(report.qaObservationStatus).toBe('blocked');
    expect(report.qaObserved).toBe(false);
    expect(report.blockers.map((blocker) => blocker.errorCode)).toEqual(
      expect.arrayContaining([
        'STAGE10_PRODUCTION_CUTOVER_PREMATURE',
        'STAGE10_LEGACY_AUTHORITY_EXIT_PREMATURE',
        'STAGE10_FINAL_CLOSURE_PREMATURE'
      ])
    );
  });

  it('persists QA observation evidence while keeping cutover, legacy exit, and final closure open', () => {
    const runtimeConsumption = currentStage10Input();
    const report = buildStep37ObserveRuntimeConsumedIrWithQaReport({
      runtimeConsumptionReport: runtimeConsumption,
      sourceRuntimeConsumptionPath: runtimeConsumptionPath,
      sourceRuntimeConsumptionAuditHash: runtimeConsumption.auditHash,
      expectedRuntimeConsumptionAuditHash: runtimeConsumption.auditHash,
      qaObservations: qaObservationsFor(runtimeConsumption)
    });
    const persisted = JSON.parse(readFileSync(runtimeQaObservationPath, 'utf8')) as Record<string, unknown>;

    expect(persisted).toMatchObject({
      artifact_kind: STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_ARTIFACT_KIND,
      schema_version: STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_SCHEMA_VERSION,
      checkpoint_id: STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID,
      source_runtime_consumption_path: runtimeConsumptionPath,
      source_runtime_consumption_audit_hash: runtimeConsumption.auditHash,
      expected_runtime_consumption_audit_hash: runtimeConsumption.auditHash,
      runtime_consumption_audit_hash_matches: true,
      qa_observation_status: 'passed',
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: true,
      production_default_cutover_active: false,
      legacy_authoritative_path_exited: false,
      final_closure_not_blocked: false,
      global_exit_conditions_met: false,
      parent_stage_status_after_qa_observation: 'running',
      next_checkpoint_id: STEP37_STAGE11_ACTIVATE_PRODUCTION_DEFAULT_CUTOVER_CHECKPOINT_ID,
      blockers: []
    });
    expect(persisted.audit_hash).toBe(report.auditHash);
    expect(persisted.qa_observed_binding_report_hash).toBe(report.qaObservedBindingReportHash);
    expect(persisted.observed_runtime_system_ids).toEqual(runtimeConsumption.runtimeSystemIds);
  });
});

function currentStage10Input(): Step37ConsumeCompiledRuntimeIrReport {
  const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
  const inventory = parseStep37SupportPromotionInventoryArtifact(JSON.parse(readFileSync(supportPromotionInventoryPath, 'utf8')));
  const inventoryReport = buildStep37SupportPromotionInventory({
    supportSummary: support,
    aggregateObservedCapabilityIds: inventory.aggregateObservedCapabilityIds,
    currentRunId: inventory.currentRunId,
    sourcePlanRevision: inventory.sourcePlanRevision,
    capabilityClosureRecords: inventory.capabilityClosureRecords
  });
  const inventoryHash = hashStep37SupportPromotionInventoryArtifact(inventory);
  const application = buildStep37SupportPromotionApplicationReport({
    supportSummary: support,
    inventoryReport,
    sourceInventoryPath: supportPromotionInventoryPath,
    sourceInventoryHash: inventoryHash,
    expectedInventoryHash: inventoryHash
  });
  const promotedSupport = buildStep37PromotedSupportSummary({ supportSummary: support, promotionApplicationReport: application });
  const supportViewHash = hashStableJson(JSON.parse(readFileSync(supportPromotionCompleteSupportedViewPath, 'utf8')));
  const stage4ExitAudit = buildStep37Stage4ExitAuditReport({
    supportSummary: promotedSupport,
    promotionApplicationReport: application,
    sourceSupportViewPath: supportPromotionCompleteSupportedViewPath,
    sourceSupportViewHash: supportViewHash,
    expectedSupportViewHash: supportViewHash
  });
  const entryAudit = buildStep37Stage5EntryAuditReport({
    supportSummary: promotedSupport,
    stage4ExitAuditReport: stage4ExitAudit,
    sourceStage4ExitAuditPath: stage4ExitAuditPath,
    sourceStage4ExitAuditHash: stage4ExitAudit.auditHash,
    expectedStage4ExitAuditHash: stage4ExitAudit.auditHash
  });
  const exactLock = buildStep37ExactCapabilityLockReport({
    supportSummary: promotedSupport,
    stage5EntryAuditReport: entryAudit,
    sourceStage5EntryAuditPath: stage5EntryAuditPath,
    sourceStage5EntryAuditHash: entryAudit.auditHash,
    expectedStage5EntryAuditHash: entryAudit.auditHash,
    packages: createStep37CompleteSupportedPackageContracts()
  });
  const composedSchema = buildStep37ComposedDslSchemaReport({
    exactCapabilityLockReport: exactLock,
    sourceExactCapabilityLockPath: exactLockPath,
    sourceExactCapabilityLockAuditHash: exactLock.auditHash,
    expectedExactCapabilityLockAuditHash: exactLock.auditHash
  });
  const draftReport = buildStep37CapabilityDslDraftReport({
    composedSchemaReport: composedSchema,
    sourceComposedSchemaPath: composedSchemaPath,
    sourceComposedSchemaAuditHash: composedSchema.auditHash,
    expectedComposedSchemaAuditHash: composedSchema.auditHash
  });
  const normalizeReport = buildStep37NormalizeCapabilityDslDraftReport({
    capabilityDslDraftReport: draftReport,
    composedSchemaReport: composedSchema,
    exactCapabilityLockReport: exactLock,
    sourceCapabilityDslDraftPath: capabilityDslDraftPath,
    sourceCapabilityDslDraftAuditHash: draftReport.auditHash,
    expectedCapabilityDslDraftAuditHash: draftReport.auditHash
  });
  const compileReport = buildStep37CompileNormalizedCapabilityDslReport({
    normalizeCapabilityDslDraftReport: normalizeReport,
    exactCapabilityLockReport: exactLock,
    sourceNormalizedCapabilityDslPath: normalizedDslPath,
    sourceNormalizedCapabilityDslAuditHash: normalizeReport.auditHash,
    expectedNormalizedCapabilityDslAuditHash: normalizeReport.auditHash
  });
  return buildStep37ConsumeCompiledRuntimeIrReport({
    compileNormalizedCapabilityDslReport: compileReport,
    exactCapabilityLockReport: exactLock,
    sourceCompiledRuntimeIrPath: compiledRuntimeIrPath,
    sourceCompiledRuntimeIrAuditHash: compileReport.auditHash,
    expectedCompiledRuntimeIrAuditHash: compileReport.auditHash
  });
}

function qaObservationsFor(runtimeConsumption: Step37ConsumeCompiledRuntimeIrReport): Step37RuntimeQaObservation[] {
  return (
    runtimeConsumption.runtimeLoaderReport?.bindingReport?.modules.map((module) => ({
      systemId: module.systemId,
      capabilityId: module.capabilityId,
      probeId: module.qaProbeIds[0],
      status: 'observed' as const,
      sourceRef: `qa:${module.systemId}:loaded`
    })) ?? []
  );
}
