import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  CanonicalCapabilityCompilationReportSchema,
  CapabilityRuntimePlanSchema,
  STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID,
  STEP37_STAGE8_COMPILE_NORMALIZED_RUNTIME_IR_ARTIFACT_KIND,
  STEP37_STAGE8_COMPILE_NORMALIZED_RUNTIME_IR_SCHEMA_VERSION,
  STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID,
  buildDeepSeekRunAndGunValidationProfileSupportSummary,
  buildStep37CapabilityDslDraftReport,
  buildStep37CompileNormalizedCapabilityDslReport,
  buildStep37ComposedDslSchemaReport,
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
  type Step37CapabilityDslDraftReport,
  type Step37ComposedDslSchemaReport,
  type Step37ExactCapabilityLockReport,
  type Step37NormalizeCapabilityDslDraftReport
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

describe('Step37 Stage 8 compile normalized capability DSL to runtime IR', () => {
  it('compiles the normalized DSL through explicit compile-ready adapter actions without runtime or QA consumption', () => {
    const { exactLock, normalizeReport } = currentStage8Inputs();
    const report = buildStep37CompileNormalizedCapabilityDslReport({
      normalizeCapabilityDslDraftReport: normalizeReport,
      exactCapabilityLockReport: exactLock,
      sourceNormalizedCapabilityDslPath: normalizedDslPath,
      sourceNormalizedCapabilityDslAuditHash: normalizeReport.auditHash,
      expectedNormalizedCapabilityDslAuditHash: normalizeReport.auditHash
    });

    expect(report.artifactKind).toBe(STEP37_STAGE8_COMPILE_NORMALIZED_RUNTIME_IR_ARTIFACT_KIND);
    expect(report.schemaVersion).toBe(STEP37_STAGE8_COMPILE_NORMALIZED_RUNTIME_IR_SCHEMA_VERSION);
    expect(report.checkpointId).toBe(STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID);
    expect(report.compileStatus).toBe('passed');
    expect(report.normalized).toBe(true);
    expect(report.compiled).toBe(true);
    expect(report.runtimeConsumed).toBe(false);
    expect(report.qaObserved).toBe(false);
    expect(report.productionDefaultCutoverActive).toBe(false);
    expect(report.legacyAuthoritativePathExited).toBe(false);
    expect(report.finalClosureNotBlocked).toBe(false);
    expect(report.globalExitConditionsMet).toBe(false);
    expect(report.nextCheckpointId).toBe(STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID);
    expect(report.blockers).toEqual([]);
    expect(report.compileAdapterStatus).toBe('applied');
    expect(report.compileAdapterActions.map((action) => action.kind)).toEqual(
      expect.arrayContaining(['weapon_default_straight_single_compile_contract_completed', 'wave_spawn_capability_declared'])
    );
    expect(report.sourceNormalizedCanonicalDslHash).toBe(normalizeReport.canonicalDslHash);
    expect(report.compileReadyCanonicalDslHash).toBe(hashStableJson(report.compileReadyCanonicalGameDsl));
    expect(report.compileReadyCanonicalDslHash).not.toBe(report.sourceNormalizedCanonicalDslHash);
    expect(report.compileReadyCapabilityIds).toEqual(normalizeReport.normalizedCapabilityIds);
    expect(report.compilationReportHash).toBe(hashStableJson(report.compilationReport));
    expect(report.capabilityIrHash).toBe(hashStableJson(report.capabilityIr));
    expect(report.runtimePlanHash).toBe(hashStableJson(report.runtimePlan));
    expect(report.runtimeSystemManifestHash).toBe(hashStableJson(report.runtimeSystemManifest));
    expect(report.sceneIrAuthorityReportHash).toBe(hashStableJson(report.sceneIrAuthorityReport));
    expect(CanonicalCapabilityCompilationReportSchema.parse(report.compilationReport)).toEqual(report.compilationReport);
    expect(CapabilityRuntimePlanSchema.parse(report.runtimePlan)).toEqual(report.runtimePlan);
  });

  it('fails closed when the Stage 8 compile adapters are disabled and the raw normalized DSL violates compiler preconditions', () => {
    const { exactLock, normalizeReport } = currentStage8Inputs();
    const report = buildStep37CompileNormalizedCapabilityDslReport({
      normalizeCapabilityDslDraftReport: normalizeReport,
      exactCapabilityLockReport: exactLock,
      sourceNormalizedCapabilityDslPath: normalizedDslPath,
      sourceNormalizedCapabilityDslAuditHash: normalizeReport.auditHash,
      expectedNormalizedCapabilityDslAuditHash: normalizeReport.auditHash,
      applyCompileAdapters: false
    });

    expect(report.compileStatus).toBe('blocked');
    expect(report.compiled).toBe(false);
    expect(report.nextCheckpointId).toBeNull();
    expect(report.compileReadyCanonicalGameDsl).toBeNull();
    expect(report.compileAdapterStatus).toBe('disabled');
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          errorCode: 'STAGE8_COMPILE_REPORT_BLOCKED',
          actual: 'CAPABILITY_CONTRACT_INVALID',
          path: '/systems/config_cfg_weapon_default_straight_single_v1/applies_to_entity_ids'
        }),
        expect.objectContaining({
          errorCode: 'STAGE8_COMPILE_REPORT_BLOCKED',
          actual: 'CAPABILITY_SET_MISMATCH',
          path: '/waves/1/capability_ids'
        })
      ])
    );
  });

  it('fails closed when the reviewed Stage 7 normalized DSL audit hash drifts', () => {
    const { exactLock, normalizeReport } = currentStage8Inputs();
    const report = buildStep37CompileNormalizedCapabilityDslReport({
      normalizeCapabilityDslDraftReport: normalizeReport,
      exactCapabilityLockReport: exactLock,
      sourceNormalizedCapabilityDslPath: normalizedDslPath,
      sourceNormalizedCapabilityDslAuditHash: normalizeReport.auditHash,
      expectedNormalizedCapabilityDslAuditHash: 'fnv1a_wrong'
    });

    expect(report.compileStatus).toBe('blocked');
    expect(report.compiled).toBe(false);
    expect(report.nextCheckpointId).toBeNull();
    expect(report.blockers).toContainEqual({
      errorCode: 'STAGE8_COMPILE_NORMALIZED_AUDIT_HASH_MISMATCH',
      capabilityIds: [],
      actual: normalizeReport.auditHash,
      expected: 'fnv1a_wrong'
    });
  });

  it('fails closed when runtime, QA, cutover, legacy exit, or final closure is smuggled into compile', () => {
    const { exactLock, normalizeReport } = currentStage8Inputs();
    const report = buildStep37CompileNormalizedCapabilityDslReport({
      normalizeCapabilityDslDraftReport: normalizeReport,
      exactCapabilityLockReport: exactLock,
      sourceNormalizedCapabilityDslPath: normalizedDslPath,
      sourceNormalizedCapabilityDslAuditHash: normalizeReport.auditHash,
      expectedNormalizedCapabilityDslAuditHash: normalizeReport.auditHash,
      runtimeConsumed: true,
      qaObserved: true,
      productionDefaultCutoverActive: true,
      legacyAuthoritativePathExited: true,
      finalClosureNotBlocked: true
    });

    expect(report.compileStatus).toBe('blocked');
    expect(report.blockers.map((blocker) => blocker.errorCode)).toEqual(
      expect.arrayContaining([
        'STAGE8_RUNTIME_CONSUMPTION_PREMATURE',
        'STAGE8_QA_OBSERVATION_PREMATURE',
        'STAGE8_PRODUCTION_CUTOVER_PREMATURE',
        'STAGE8_LEGACY_AUTHORITY_EXIT_PREMATURE',
        'STAGE8_FINAL_CLOSURE_PREMATURE'
      ])
    );
  });

  it('persists compiled runtime IR evidence while keeping runtime consumption, QA, cutover, legacy exit, and final closure open', () => {
    const { normalizeReport } = currentStage8Inputs();
    const persisted = JSON.parse(readFileSync(compiledRuntimeIrPath, 'utf8')) as Record<string, unknown>;
    const compileReadyDsl = persisted.compile_ready_canonical_game_dsl as Record<string, unknown>;
    const compilationReport = persisted.compilation_report as Record<string, unknown>;
    const runtimePlan = persisted.runtime_plan as Record<string, unknown>;

    expect(persisted).toMatchObject({
      artifact_kind: STEP37_STAGE8_COMPILE_NORMALIZED_RUNTIME_IR_ARTIFACT_KIND,
      schema_version: STEP37_STAGE8_COMPILE_NORMALIZED_RUNTIME_IR_SCHEMA_VERSION,
      checkpoint_id: STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID,
      source_normalized_capability_dsl_path: normalizedDslPath,
      source_normalized_capability_dsl_audit_hash: normalizeReport.auditHash,
      expected_normalized_capability_dsl_audit_hash: normalizeReport.auditHash,
      normalized_capability_dsl_audit_hash_matches: true,
      source_normalized_canonical_dsl_hash: normalizeReport.canonicalDslHash,
      source_normalization_report_hash: normalizeReport.normalizationReportHash,
      compile_status: 'passed',
      normalized: true,
      compiled: true,
      runtime_consumed: false,
      qa_observed: false,
      production_default_cutover_active: false,
      legacy_authoritative_path_exited: false,
      final_closure_not_blocked: false,
      global_exit_conditions_met: false,
      parent_stage_status_after_compile: 'running',
      next_checkpoint_id: STEP37_STAGE9_CONSUME_COMPILED_RUNTIME_IR_IN_RUNTIME_CHECKPOINT_ID,
      blockers: []
    });
    expect(persisted.complete_supported_capability_ids).toEqual(normalizeReport.completeSupportedCapabilityIds);
    expect(persisted.normalized_capability_ids).toEqual(normalizeReport.normalizedCapabilityIds);
    expect(persisted.compile_ready_capability_ids).toEqual(normalizeReport.normalizedCapabilityIds);
    expect(persisted.compile_ready_canonical_dsl_hash).toBe(hashStableJson(compileReadyDsl));
    expect(persisted.compilation_report_hash).toBe(hashStableJson(compilationReport));
    expect(persisted.runtime_plan_hash).toBe(hashStableJson(runtimePlan));
    expect(CanonicalCapabilityCompilationReportSchema.parse(compilationReport)).toEqual(compilationReport);
    expect(CapabilityRuntimePlanSchema.parse(runtimePlan)).toEqual(runtimePlan);
  });
});

function currentStage8Inputs(): {
  exactLock: Step37ExactCapabilityLockReport;
  composedSchema: Step37ComposedDslSchemaReport;
  draftReport: Step37CapabilityDslDraftReport;
  normalizeReport: Step37NormalizeCapabilityDslDraftReport;
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
  return { exactLock, composedSchema, draftReport, normalizeReport };
}
