import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID,
  STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_ARTIFACT_KIND,
  STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID,
  STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_SCHEMA_VERSION,
  buildDeepSeekRunAndGunValidationProfileSupportSummary,
  buildStep37CapabilityDslDraftReport,
  buildStep37CompileNormalizedCapabilityDslReport,
  buildStep37ComposedDslSchemaReport,
  buildStep37ConsumeCompiledRuntimeIrReport,
  buildStep37ExactCapabilityLockReport,
  buildStep37NormalizeCapabilityDslDraftReport,
  buildStep37PromotedSupportSummary,
  buildStep37Stage4ExitAuditReport,
  buildStep37Stage5EntryAuditReport,
  buildStep37SupportPromotionApplicationReport,
  buildStep37SupportPromotionInventory,
  createStep37CompleteSupportedPackageContracts,
  hashStep37SupportPromotionInventoryArtifact,
  parseStep37SupportPromotionInventoryArtifact,
  type Step37CompileNormalizedCapabilityDslReport,
  type Step37ExactCapabilityLockReport
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

describe('Step37 Stage 9 consume compiled runtime IR in runtime', () => {
  it('consumes the Stage 8 compiled runtime IR through the Phaser runtime loader without QA observation', () => {
    const { exactLock, compileReport } = currentStage9Inputs();
    const report = buildStep37ConsumeCompiledRuntimeIrReport({
      compileNormalizedCapabilityDslReport: compileReport,
      exactCapabilityLockReport: exactLock,
      sourceCompiledRuntimeIrPath: compiledRuntimeIrPath,
      sourceCompiledRuntimeIrAuditHash: compileReport.auditHash,
      expectedCompiledRuntimeIrAuditHash: compileReport.auditHash
    });

    expect(report.artifactKind).toBe(STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_ARTIFACT_KIND);
    expect(report.schemaVersion).toBe(STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_SCHEMA_VERSION);
    expect(report.checkpointId).toBe(STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID);
    expect(report.runtimeConsumptionStatus).toBe('passed');
    expect(report.normalized).toBe(true);
    expect(report.compiled).toBe(true);
    expect(report.runtimeConsumed).toBe(true);
    expect(report.qaObserved).toBe(false);
    expect(report.productionDefaultCutoverActive).toBe(false);
    expect(report.legacyAuthoritativePathExited).toBe(false);
    expect(report.finalClosureNotBlocked).toBe(false);
    expect(report.globalExitConditionsMet).toBe(false);
    expect(report.parentStageStatusAfterRuntimeConsumption).toBe('running');
    expect(report.nextCheckpointId).toBe(STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID);
    expect(report.blockers).toEqual([]);
    expect(report.runtimeLoaderReport?.status).toBe('ready');
    expect(report.runtimeLoaderReportHash).toBe(hashStableJson(report.runtimeLoaderReport));
    expect(report.runtimeLoaderPlanHash).toBe(report.runtimeLoaderReport?.planHash);
    expect(report.runtimeBindingReportHash).toBe(report.runtimeLoaderReport?.bindingReportHash);
    expect(report.runtimeBindingStatus).toBe('bound_pending_qa');
    expect(report.runtimeSystemCapabilityIds).toEqual(compileReport.completeSupportedCapabilityIds);
    expect(report.runtimeSystemIds).toHaveLength(compileReport.completeSupportedCapabilityIds.length);
  });

  it('fails closed when the reviewed Stage 8 compiled runtime IR audit hash drifts', () => {
    const { exactLock, compileReport } = currentStage9Inputs();
    const report = buildStep37ConsumeCompiledRuntimeIrReport({
      compileNormalizedCapabilityDslReport: compileReport,
      exactCapabilityLockReport: exactLock,
      sourceCompiledRuntimeIrPath: compiledRuntimeIrPath,
      sourceCompiledRuntimeIrAuditHash: 'fnv1a_stale_stage8',
      expectedCompiledRuntimeIrAuditHash: compileReport.auditHash
    });

    expect(report.runtimeConsumptionStatus).toBe('blocked');
    expect(report.runtimeConsumed).toBe(false);
    expect(report.nextCheckpointId).toBeNull();
    expect(report.runtimeLoaderReport).toBeNull();
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          errorCode: 'STAGE9_COMPILED_RUNTIME_IR_AUDIT_HASH_MISMATCH',
          actual: 'fnv1a_stale_stage8',
          expected: compileReport.auditHash
        })
      ])
    );
  });

  it('fails closed when Stage 8 compile evidence is blocked', () => {
    const { exactLock, compileReport } = currentStage9Inputs();
    const blockedCompile: Step37CompileNormalizedCapabilityDslReport = {
      ...compileReport,
      compileStatus: 'blocked',
      compiled: false,
      blockers: [{ errorCode: 'STAGE8_COMPILE_REPORT_BLOCKED', capabilityIds: [], actual: 'RUNTIME_PLAN_INVALID' }],
      nextCheckpointId: null
    };
    const report = buildStep37ConsumeCompiledRuntimeIrReport({
      compileNormalizedCapabilityDslReport: blockedCompile,
      exactCapabilityLockReport: exactLock,
      sourceCompiledRuntimeIrPath: compiledRuntimeIrPath,
      sourceCompiledRuntimeIrAuditHash: blockedCompile.auditHash,
      expectedCompiledRuntimeIrAuditHash: blockedCompile.auditHash
    });

    expect(report.runtimeConsumptionStatus).toBe('blocked');
    expect(report.blockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ errorCode: 'STAGE9_COMPILE_REPORT_NOT_PASSED', actual: 'blocked' })])
    );
  });

  it('fails closed when the exact lock no longer matches the Stage 8 compiled runtime IR', () => {
    const { exactLock, compileReport } = currentStage9Inputs();
    const staleExactLock: Step37ExactCapabilityLockReport = {
      ...exactLock,
      lockHash: 'fnv1a_wrong_exact_lock',
      capabilityLock: exactLock.capabilityLock === null ? null : { ...exactLock.capabilityLock, lockHash: 'fnv1a_wrong_exact_lock' }
    };
    const report = buildStep37ConsumeCompiledRuntimeIrReport({
      compileNormalizedCapabilityDslReport: compileReport,
      exactCapabilityLockReport: staleExactLock,
      sourceCompiledRuntimeIrPath: compiledRuntimeIrPath,
      sourceCompiledRuntimeIrAuditHash: compileReport.auditHash,
      expectedCompiledRuntimeIrAuditHash: compileReport.auditHash
    });

    expect(report.runtimeConsumptionStatus).toBe('blocked');
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          errorCode: 'STAGE9_EXACT_LOCK_MISMATCH',
          actual: 'fnv1a_0c570c26',
          expected: 'fnv1a_wrong_exact_lock'
        })
      ])
    );
  });

  it('fails closed when callers try to smuggle QA, cutover, legacy exit, or final closure into runtime consumption', () => {
    const { exactLock, compileReport } = currentStage9Inputs();
    const report = buildStep37ConsumeCompiledRuntimeIrReport({
      compileNormalizedCapabilityDslReport: compileReport,
      exactCapabilityLockReport: exactLock,
      sourceCompiledRuntimeIrPath: compiledRuntimeIrPath,
      sourceCompiledRuntimeIrAuditHash: compileReport.auditHash,
      expectedCompiledRuntimeIrAuditHash: compileReport.auditHash,
      qaObserved: true,
      productionDefaultCutoverActive: true,
      legacyAuthoritativePathExited: true,
      finalClosureNotBlocked: true
    });

    expect(report.runtimeConsumptionStatus).toBe('blocked');
    expect(report.runtimeConsumed).toBe(false);
    expect(report.blockers.map((blocker) => blocker.errorCode)).toEqual(
      expect.arrayContaining([
        'STAGE9_QA_OBSERVATION_PREMATURE',
        'STAGE9_PRODUCTION_CUTOVER_PREMATURE',
        'STAGE9_LEGACY_AUTHORITY_EXIT_PREMATURE',
        'STAGE9_FINAL_CLOSURE_PREMATURE'
      ])
    );
  });

  it('persists runtime consumption evidence while keeping QA, cutover, legacy exit, and final closure open', () => {
    const { exactLock, compileReport } = currentStage9Inputs();
    const report = buildStep37ConsumeCompiledRuntimeIrReport({
      compileNormalizedCapabilityDslReport: compileReport,
      exactCapabilityLockReport: exactLock,
      sourceCompiledRuntimeIrPath: compiledRuntimeIrPath,
      sourceCompiledRuntimeIrAuditHash: compileReport.auditHash,
      expectedCompiledRuntimeIrAuditHash: compileReport.auditHash
    });
    const persisted = JSON.parse(readFileSync(runtimeConsumptionPath, 'utf8')) as Record<string, unknown>;

    expect(persisted).toMatchObject({
      artifact_kind: STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_ARTIFACT_KIND,
      schema_version: STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_SCHEMA_VERSION,
      checkpoint_id: STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID,
      source_compiled_runtime_ir_path: compiledRuntimeIrPath,
      source_compiled_runtime_ir_audit_hash: compileReport.auditHash,
      expected_compiled_runtime_ir_audit_hash: compileReport.auditHash,
      compiled_runtime_ir_audit_hash_matches: true,
      source_capability_ir_hash: compileReport.capabilityIrHash,
      source_runtime_plan_hash: compileReport.runtimePlanHash,
      source_runtime_system_manifest_hash: compileReport.runtimeSystemManifestHash,
      runtime_consumption_status: 'passed',
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false,
      production_default_cutover_active: false,
      legacy_authoritative_path_exited: false,
      final_closure_not_blocked: false,
      global_exit_conditions_met: false,
      parent_stage_status_after_runtime_consumption: 'running',
      next_checkpoint_id: STEP37_STAGE10_OBSERVE_RUNTIME_CONSUMED_IR_WITH_QA_CHECKPOINT_ID,
      blockers: []
    });
    expect(persisted.audit_hash).toBe(report.auditHash);
    expect(persisted.runtime_loader_report_hash).toBe(report.runtimeLoaderReportHash);
    expect(persisted.runtime_system_capability_ids).toEqual(compileReport.completeSupportedCapabilityIds);
  });
});

function currentStage9Inputs(): {
  exactLock: Step37ExactCapabilityLockReport;
  compileReport: Step37CompileNormalizedCapabilityDslReport;
} {
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
  return { exactLock, compileReport };
}
