import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_ARTIFACT_KIND,
  STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_CHECKPOINT_ID,
  STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_SCHEMA_VERSION,
  STEP37_STAGE13_FINAL_CLOSURE_CHECKPOINT_ID,
  buildDeepSeekRunAndGunValidationProfileSupportSummary,
  buildStep37ActivateProductionDefaultCutoverReport,
  buildStep37CapabilityDslDraftReport,
  buildStep37CompileNormalizedCapabilityDslReport,
  buildStep37ComposedDslSchemaReport,
  buildStep37ConsumeCompiledRuntimeIrReport,
  buildStep37ExactCapabilityLockReport,
  buildStep37ExitLegacyAuthoritativePathReport,
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
  type Step37ActivateProductionDefaultCutoverReport,
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
const productionDefaultCutoverPath = 'docs/plans/step37-production-default-cutover-from-runtime-qa-observation.v0.1.json';
const legacyAuthoritativePathExitPath = 'docs/plans/step37-legacy-authoritative-path-exit-from-production-cutover.v0.1.json';

describe('Step37 Stage 12 exit legacy authoritative path', () => {
  it('exits the legacy authoritative path only from a fresh production-default cutover report', () => {
    const cutover = currentStage12Input();
    const report = buildStep37ExitLegacyAuthoritativePathReport({
      productionDefaultCutoverReport: cutover,
      sourceProductionDefaultCutoverPath: productionDefaultCutoverPath,
      sourceProductionDefaultCutoverAuditHash: cutover.auditHash,
      expectedProductionDefaultCutoverAuditHash: cutover.auditHash
    });

    expect(report.artifactKind).toBe(STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_ARTIFACT_KIND);
    expect(report.schemaVersion).toBe(STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_SCHEMA_VERSION);
    expect(report.checkpointId).toBe(STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_CHECKPOINT_ID);
    expect(report.exitStatus).toBe('passed');
    expect(report.normalized).toBe(true);
    expect(report.compiled).toBe(true);
    expect(report.runtimeConsumed).toBe(true);
    expect(report.qaObserved).toBe(true);
    expect(report.productionDefaultCutoverActive).toBe(true);
    expect(report.legacyAuthoritativePathExited).toBe(true);
    expect(report.finalClosureNotBlocked).toBe(false);
    expect(report.globalExitConditionsMet).toBe(false);
    expect(report.parentStageStatusAfterExit).toBe('running');
    expect(report.nextCheckpointId).toBe(STEP37_STAGE13_FINAL_CLOSURE_CHECKPOINT_ID);
    expect(report.blockers).toEqual([]);
    expect(report.auditHash).toBe(hashReportWithoutAuditHash(report));
  });

  it('fails closed when the Stage 11 production cutover source hash drifts', () => {
    const cutover = currentStage12Input();
    const report = buildStep37ExitLegacyAuthoritativePathReport({
      productionDefaultCutoverReport: cutover,
      sourceProductionDefaultCutoverPath: productionDefaultCutoverPath,
      sourceProductionDefaultCutoverAuditHash: 'fnv1a_stale_stage11',
      expectedProductionDefaultCutoverAuditHash: cutover.auditHash
    });

    expect(report.exitStatus).toBe('blocked');
    expect(report.legacyAuthoritativePathExited).toBe(true);
    expect(report.nextCheckpointId).toBeNull();
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          errorCode: 'STAGE12_PRODUCTION_CUTOVER_AUDIT_HASH_MISMATCH',
          actual: 'fnv1a_stale_stage11',
          expected: cutover.auditHash
        })
      ])
    );
  });

  it('fails closed when the Stage 11 report content changes without refreshing its auditHash', () => {
    const cutover = currentStage12Input();
    const staleCutover: Step37ActivateProductionDefaultCutoverReport = {
      ...cutover,
      observedProbeIds: [...cutover.observedProbeIds, 'probe.unreviewed_extra']
    };
    const report = buildStep37ExitLegacyAuthoritativePathReport({
      productionDefaultCutoverReport: staleCutover,
      sourceProductionDefaultCutoverPath: productionDefaultCutoverPath,
      sourceProductionDefaultCutoverAuditHash: cutover.auditHash,
      expectedProductionDefaultCutoverAuditHash: cutover.auditHash
    });

    expect(staleCutover.cutoverStatus).toBe('passed');
    expect(report.exitStatus).toBe('blocked');
    expect(report.blockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ errorCode: 'STAGE12_PRODUCTION_CUTOVER_REPORT_HASH_MISMATCH' })])
    );
  });

  it('fails closed when the legacy authoritative path is not actually exited', () => {
    const cutover = currentStage12Input();
    const report = buildStep37ExitLegacyAuthoritativePathReport({
      productionDefaultCutoverReport: cutover,
      sourceProductionDefaultCutoverPath: productionDefaultCutoverPath,
      sourceProductionDefaultCutoverAuditHash: cutover.auditHash,
      expectedProductionDefaultCutoverAuditHash: cutover.auditHash,
      legacyAuthoritativePathExited: false
    });

    expect(report.exitStatus).toBe('blocked');
    expect(report.legacyAuthoritativePathExited).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ errorCode: 'STAGE12_LEGACY_AUTHORITY_EXIT_NOT_ACTIVATED' })])
    );
  });

  it('fails closed when callers smuggle final closure into legacy path exit', () => {
    const cutover = currentStage12Input();
    const report = buildStep37ExitLegacyAuthoritativePathReport({
      productionDefaultCutoverReport: cutover,
      sourceProductionDefaultCutoverPath: productionDefaultCutoverPath,
      sourceProductionDefaultCutoverAuditHash: cutover.auditHash,
      expectedProductionDefaultCutoverAuditHash: cutover.auditHash,
      finalClosureNotBlocked: true
    });

    expect(report.exitStatus).toBe('blocked');
    expect(report.legacyAuthoritativePathExited).toBe(true);
    expect(report.blockers.map((blocker) => blocker.errorCode)).toContain('STAGE12_FINAL_CLOSURE_PREMATURE');
  });

  it('persists legacy authoritative path exit evidence while keeping final closure open', () => {
    const cutover = currentStage12Input();
    const report = buildStep37ExitLegacyAuthoritativePathReport({
      productionDefaultCutoverReport: cutover,
      sourceProductionDefaultCutoverPath: productionDefaultCutoverPath,
      sourceProductionDefaultCutoverAuditHash: cutover.auditHash,
      expectedProductionDefaultCutoverAuditHash: cutover.auditHash
    });
    const persisted = JSON.parse(readFileSync(legacyAuthoritativePathExitPath, 'utf8')) as Record<string, unknown>;

    expect(persisted).toMatchObject({
      artifact_kind: STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_ARTIFACT_KIND,
      schema_version: STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_SCHEMA_VERSION,
      checkpoint_id: STEP37_STAGE12_EXIT_LEGACY_AUTHORITATIVE_PATH_CHECKPOINT_ID,
      source_production_default_cutover_path: productionDefaultCutoverPath,
      source_production_default_cutover_audit_hash: cutover.auditHash,
      expected_production_default_cutover_audit_hash: cutover.auditHash,
      production_default_cutover_audit_hash_matches: true,
      source_cutover_status: 'passed',
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: true,
      production_default_cutover_active: true,
      legacy_authoritative_path_exited: true,
      final_closure_not_blocked: false,
      global_exit_conditions_met: false,
      parent_stage_status_after_exit: 'running',
      next_checkpoint_id: STEP37_STAGE13_FINAL_CLOSURE_CHECKPOINT_ID,
      blockers: []
    });
    expect(persisted.audit_hash).toBe(report.auditHash);
    expect(persisted.source_qa_observed_binding_report_hash).toBe(report.sourceQaObservedBindingReportHash);
    expect(persisted.observed_runtime_system_ids).toEqual(cutover.observedRuntimeSystemIds);
  });
});

function currentStage12Input(): Step37ActivateProductionDefaultCutoverReport {
  const runtimeQaObservation = currentStage11Input();
  return buildStep37ActivateProductionDefaultCutoverReport({
    runtimeQaObservationReport: runtimeQaObservation,
    sourceRuntimeQaObservationPath: runtimeQaObservationPath,
    sourceRuntimeQaObservationAuditHash: runtimeQaObservation.auditHash,
    expectedRuntimeQaObservationAuditHash: runtimeQaObservation.auditHash
  });
}

function currentStage11Input() {
  const runtimeConsumption = currentStage10Input();
  return buildStep37ObserveRuntimeConsumedIrWithQaReport({
    runtimeConsumptionReport: runtimeConsumption,
    sourceRuntimeConsumptionPath: runtimeConsumptionPath,
    sourceRuntimeConsumptionAuditHash: runtimeConsumption.auditHash,
    expectedRuntimeConsumptionAuditHash: runtimeConsumption.auditHash,
    qaObservations: qaObservationsFor(runtimeConsumption)
  });
}

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

function hashReportWithoutAuditHash(report: { auditHash: string }): string {
  const { auditHash: _auditHash, ...payloadWithoutHash } = report;
  return hashStableJson(payloadWithoutHash);
}
