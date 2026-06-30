import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  CanonicalGameDslV02Schema,
  GameDslNormalizationReportSchema,
  STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_ARTIFACT_KIND,
  STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
  STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_SCHEMA_VERSION,
  STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID,
  buildDeepSeekRunAndGunValidationProfileSupportSummary,
  buildStep37CapabilityDslDraftReport,
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

describe('Step37 Stage 7 normalize capability DSL draft', () => {
  it('normalizes the Stage 6 capability draft into canonical Game DSL v0.2 without compiling or consuming runtime', () => {
    const { draftReport, composedSchema, exactLock } = currentStage7Inputs();
    const report = buildStep37NormalizeCapabilityDslDraftReport({
      capabilityDslDraftReport: draftReport,
      composedSchemaReport: composedSchema,
      exactCapabilityLockReport: exactLock,
      sourceCapabilityDslDraftPath: capabilityDslDraftPath,
      sourceCapabilityDslDraftAuditHash: draftReport.auditHash,
      expectedCapabilityDslDraftAuditHash: draftReport.auditHash
    });

    expect(report.artifactKind).toBe(STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_ARTIFACT_KIND);
    expect(report.schemaVersion).toBe(STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_SCHEMA_VERSION);
    expect(report.checkpointId).toBe(STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID);
    expect(report.normalizationStatus).toBe('passed');
    expect(report.normalized).toBe(true);
    expect(report.compiled).toBe(false);
    expect(report.runtimeConsumed).toBe(false);
    expect(report.qaObserved).toBe(false);
    expect(report.productionDefaultCutoverActive).toBe(false);
    expect(report.legacyAuthoritativePathExited).toBe(false);
    expect(report.finalClosureNotBlocked).toBe(false);
    expect(report.globalExitConditionsMet).toBe(false);
    expect(report.nextCheckpointId).toBe(STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID);
    expect(report.blockers).toEqual([]);
    expect(report.normalizationLockProfileId).toBe(draftReport.draftProfileId);
    expect(report.sourceExactLockProfileId).not.toBe(report.normalizationLockProfileId);
    expect(report.canonicalGameDsl?.profile.id).toBe(draftReport.draftProfileId);
    expect(report.canonicalGameDsl?.capability_ids).toEqual(draftReport.completeSupportedCapabilityIds);
    expect(report.normalizedCapabilityIds).toEqual(draftReport.completeSupportedCapabilityIds);
    expect(report.canonicalDslHash).toBe(hashStableJson(report.canonicalGameDsl));
    expect(report.normalizationReportHash).toBe(hashStableJson(report.normalizationReport));
    expect(report.normalizationReport?.source).toMatchObject({
      draft_hash: draftReport.draftHash,
      composed_schema_hash: composedSchema.composedSchemaHash,
      capability_lock_hash: report.normalizationLockHash
    });
    expect(CanonicalGameDslV02Schema.parse(report.canonicalGameDsl)).toEqual(report.canonicalGameDsl);
    expect(GameDslNormalizationReportSchema.parse(report.normalizationReport)).toEqual(report.normalizationReport);
  });

  it('fails closed when the reviewed Stage 6 draft audit hash drifts', () => {
    const { draftReport, composedSchema, exactLock } = currentStage7Inputs();
    const report = buildStep37NormalizeCapabilityDslDraftReport({
      capabilityDslDraftReport: draftReport,
      composedSchemaReport: composedSchema,
      exactCapabilityLockReport: exactLock,
      sourceCapabilityDslDraftPath: capabilityDslDraftPath,
      sourceCapabilityDslDraftAuditHash: draftReport.auditHash,
      expectedCapabilityDslDraftAuditHash: 'fnv1a_wrong'
    });

    expect(report.normalizationStatus).toBe('blocked');
    expect(report.normalized).toBe(false);
    expect(report.nextCheckpointId).toBeNull();
    expect(report.blockers).toContainEqual({
      errorCode: 'STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_AUDIT_HASH_MISMATCH',
      capabilityIds: [],
      actual: draftReport.auditHash,
      expected: 'fnv1a_wrong'
    });
  });

  it('fails closed when compilation, runtime, QA, cutover, legacy exit, or final closure is smuggled into normalization', () => {
    const { draftReport, composedSchema, exactLock } = currentStage7Inputs();
    const report = buildStep37NormalizeCapabilityDslDraftReport({
      capabilityDslDraftReport: draftReport,
      composedSchemaReport: composedSchema,
      exactCapabilityLockReport: exactLock,
      sourceCapabilityDslDraftPath: capabilityDslDraftPath,
      sourceCapabilityDslDraftAuditHash: draftReport.auditHash,
      expectedCapabilityDslDraftAuditHash: draftReport.auditHash,
      compiled: true,
      runtimeConsumed: true,
      qaObserved: true,
      productionDefaultCutoverActive: true,
      legacyAuthoritativePathExited: true,
      finalClosureNotBlocked: true
    });

    expect(report.normalizationStatus).toBe('blocked');
    expect(report.blockers.map((blocker) => blocker.errorCode)).toEqual(
      expect.arrayContaining([
        'STAGE7_NORMALIZE_COMPILATION_PREMATURE',
        'STAGE7_NORMALIZE_RUNTIME_CONSUMPTION_PREMATURE',
        'STAGE7_NORMALIZE_QA_OBSERVATION_PREMATURE',
        'STAGE7_NORMALIZE_PRODUCTION_CUTOVER_PREMATURE',
        'STAGE7_NORMALIZE_LEGACY_AUTHORITY_EXIT_PREMATURE',
        'STAGE7_NORMALIZE_FINAL_CLOSURE_PREMATURE'
      ])
    );
  });

  it('persists normalized canonical DSL and report evidence without compile/runtime/cutover/final closure', () => {
    const { draftReport, composedSchema } = currentStage7Inputs();
    const persisted = JSON.parse(readFileSync(normalizedDslPath, 'utf8')) as Record<string, unknown>;
    const canonical = persisted.canonical_game_dsl as Record<string, unknown>;
    const normalizationReport = persisted.normalization_report as Record<string, unknown>;

    expect(persisted).toMatchObject({
      artifact_kind: STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_ARTIFACT_KIND,
      schema_version: STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_SCHEMA_VERSION,
      checkpoint_id: STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
      source_capability_dsl_draft_path: capabilityDslDraftPath,
      source_capability_dsl_draft_audit_hash: draftReport.auditHash,
      expected_capability_dsl_draft_audit_hash: draftReport.auditHash,
      capability_dsl_draft_audit_hash_matches: true,
      source_capability_dsl_draft_hash: draftReport.draftHash,
      source_composed_schema_audit_hash: composedSchema.auditHash,
      source_composed_schema_hash: composedSchema.composedSchemaHash,
      normalization_status: 'passed',
      normalized: true,
      compiled: false,
      runtime_consumed: false,
      qa_observed: false,
      production_default_cutover_active: false,
      legacy_authoritative_path_exited: false,
      final_closure_not_blocked: false,
      global_exit_conditions_met: false,
      parent_stage_status_after_normalization: 'running',
      next_checkpoint_id: STEP37_STAGE8_COMPILE_NORMALIZED_CAPABILITY_DSL_TO_RUNTIME_IR_CHECKPOINT_ID,
      blockers: []
    });
    expect(persisted.required_capability_count).toBe(draftReport.requiredCapabilityCount);
    expect(persisted.complete_supported_count).toBe(draftReport.completeSupportedCount);
    expect(persisted.package_count).toBe(draftReport.packageCount);
    expect(persisted.complete_supported_capability_ids).toEqual(draftReport.completeSupportedCapabilityIds);
    expect(persisted.normalized_capability_ids).toEqual(draftReport.completeSupportedCapabilityIds);
    expect(canonical.capability_ids).toEqual(draftReport.completeSupportedCapabilityIds);
    expect(persisted.canonical_dsl_hash).toBe(hashStableJson(canonical));
    expect(persisted.normalization_report_hash).toBe(hashStableJson(normalizationReport));
    expect(CanonicalGameDslV02Schema.parse(canonical)).toEqual(canonical);
    expect(GameDslNormalizationReportSchema.parse(normalizationReport)).toEqual(normalizationReport);
  });
});

function currentStage7Inputs(): {
  exactLock: Step37ExactCapabilityLockReport;
  composedSchema: Step37ComposedDslSchemaReport;
  draftReport: Step37CapabilityDslDraftReport;
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
  return { exactLock, composedSchema, draftReport };
}
