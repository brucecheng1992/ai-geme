import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID,
  STEP37_STAGE5_ENTRY_AUDIT_ARTIFACT_KIND,
  STEP37_STAGE5_ENTRY_AUDIT_SCHEMA_VERSION,
  STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID,
  buildDeepSeekRunAndGunValidationProfileSupportSummary,
  buildStep37PromotedSupportSummary,
  buildStep37Stage4ExitAuditReport,
  buildStep37Stage5EntryAuditReport,
  buildStep37SupportPromotionApplicationReport,
  buildStep37SupportPromotionInventory,
  hashStep37SupportPromotionInventoryArtifact,
  parseStep37SupportPromotionInventoryArtifact,
  type DeepSeekRunAndGunProfileSupportSummary,
  type Step37Stage4ExitAuditReport,
  type Step37SupportPromotionApplicationReport
} from '../../packages/game-dsl/src/index.js';
import { hashStableJson } from '../../packages/game-dsl/src/gameplay-capabilities/stable-json.js';

const supportPromotionInventoryPath = 'docs/plans/step37-support-promotion-per-capability-inventory.v0.1.json';
const supportPromotionCompleteSupportedViewPath = 'docs/plans/step37-support-promotion-complete-supported-view.v0.1.json';
const stage4ExitAuditPath = 'docs/plans/step37-stage4-exit-audit-after-support-promotion.v0.1.json';
const stage5EntryAuditPath = 'docs/plans/step37-stage5-entry-audit-after-stage4-exit.v0.1.json';

describe('Step37 Stage 5 entry audit after Stage 4 exit', () => {
  it('passes only after Stage 4 exit audit and promoted support are hash-bound, without producing exact lock', () => {
    const { promotedSupport, stage4ExitAudit } = currentStage5EntryInput();
    const audit = buildStep37Stage5EntryAuditReport({
      supportSummary: promotedSupport,
      stage4ExitAuditReport: stage4ExitAudit,
      sourceStage4ExitAuditPath: stage4ExitAuditPath,
      sourceStage4ExitAuditHash: stage4ExitAudit.auditHash,
      expectedStage4ExitAuditHash: stage4ExitAudit.auditHash
    });

    expect(audit.artifactKind).toBe(STEP37_STAGE5_ENTRY_AUDIT_ARTIFACT_KIND);
    expect(audit.schemaVersion).toBe(STEP37_STAGE5_ENTRY_AUDIT_SCHEMA_VERSION);
    expect(audit.checkpointId).toBe(STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID);
    expect(audit.stage5EntryStatus).toBe('passed');
    expect(audit.stage5EntryConditionsMet).toBe(true);
    expect(audit.requiredCapabilityCount).toBe(59);
    expect(audit.completeSupportedCount).toBe(59);
    expect(audit.stage4ExitConditionsMet).toBe(true);
    expect(audit.stage4ExitAuditHashMatches).toBe(true);
    expect(audit.parentStageStatusAfterAudit).toBe('running');
    expect(audit.stage5ExactLockImplementationAllowed).toBe(true);
    expect(audit.exactCapabilityLockProduced).toBe(false);
    expect(audit.productionDefaultCutoverActive).toBe(false);
    expect(audit.legacyAuthoritativePathExited).toBe(false);
    expect(audit.finalClosureNotBlocked).toBe(false);
    expect(audit.globalExitConditionsMet).toBe(false);
    expect(audit.nextCheckpointId).toBe(STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID);
    expect(audit.blockers).toEqual([]);
  });

  it('fails closed when the reviewed Stage 4 exit audit hash drifts', () => {
    const { promotedSupport, stage4ExitAudit } = currentStage5EntryInput();
    const audit = buildStep37Stage5EntryAuditReport({
      supportSummary: promotedSupport,
      stage4ExitAuditReport: stage4ExitAudit,
      sourceStage4ExitAuditPath: stage4ExitAuditPath,
      sourceStage4ExitAuditHash: stage4ExitAudit.auditHash,
      expectedStage4ExitAuditHash: 'fnv1a_wrong'
    });

    expect(audit.stage5EntryStatus).toBe('blocked');
    expect(audit.stage4ExitAuditHashMatches).toBe(false);
    expect(audit.nextCheckpointId).toBeNull();
    expect(audit.blockers).toContainEqual({
      errorCode: 'STAGE5_ENTRY_STAGE4_EXIT_AUDIT_HASH_MISMATCH',
      capabilityIds: [],
      actual: stage4ExitAudit.auditHash,
      expected: 'fnv1a_wrong'
    });
  });

  it('fails closed when Stage 4 exit audit has not actually passed', () => {
    const { promotedSupport, stage4ExitAudit } = currentStage5EntryInput();
    const audit = buildStep37Stage5EntryAuditReport({
      supportSummary: promotedSupport,
      stage4ExitAuditReport: { ...stage4ExitAudit, stage4ExitStatus: 'blocked', stage4ExitConditionsMet: false },
      sourceStage4ExitAuditPath: stage4ExitAuditPath,
      sourceStage4ExitAuditHash: stage4ExitAudit.auditHash,
      expectedStage4ExitAuditHash: stage4ExitAudit.auditHash
    });

    expect(audit.stage5EntryStatus).toBe('blocked');
    expect(audit.stage5EntryConditionsMet).toBe(false);
    expect(audit.nextCheckpointId).toBeNull();
    expect(audit.blockers.map((blocker) => blocker.errorCode)).toContain('STAGE5_ENTRY_STAGE4_EXIT_AUDIT_NOT_PASSED');
  });

  it('fails closed when callers try to smuggle exact lock, cutover, legacy exit, or final closure into the entry audit', () => {
    const { promotedSupport, stage4ExitAudit } = currentStage5EntryInput();
    const audit = buildStep37Stage5EntryAuditReport({
      supportSummary: promotedSupport,
      stage4ExitAuditReport: stage4ExitAudit,
      sourceStage4ExitAuditPath: stage4ExitAuditPath,
      sourceStage4ExitAuditHash: stage4ExitAudit.auditHash,
      expectedStage4ExitAuditHash: stage4ExitAudit.auditHash,
      exactCapabilityLockProduced: true,
      productionDefaultCutoverActive: true,
      legacyAuthoritativePathExited: true,
      finalClosureNotBlocked: true
    });

    expect(audit.stage5EntryStatus).toBe('blocked');
    expect(audit.globalExitConditionsMet).toBe(false);
    expect(audit.blockers.map((blocker) => blocker.errorCode)).toEqual(
      expect.arrayContaining([
        'STAGE5_ENTRY_EXACT_LOCK_PREMATURE',
        'STAGE5_ENTRY_PRODUCTION_CUTOVER_PREMATURE',
        'STAGE5_ENTRY_LEGACY_AUTHORITY_EXIT_PREMATURE',
        'STAGE5_ENTRY_FINAL_CLOSURE_PREMATURE'
      ])
    );
  });

  it('persists the current Stage 5 entry audit as machine-readable evidence for the next exact-lock atom', () => {
    const { stage4ExitAudit } = currentStage5EntryInput();
    const persisted = JSON.parse(readFileSync(stage5EntryAuditPath, 'utf8')) as Record<string, unknown>;

    expect(persisted).toMatchObject({
      artifact_kind: STEP37_STAGE5_ENTRY_AUDIT_ARTIFACT_KIND,
      schema_version: STEP37_STAGE5_ENTRY_AUDIT_SCHEMA_VERSION,
      checkpoint_id: STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID,
      parent_stage_id: 'stage5',
      source_stage4_exit_audit_path: stage4ExitAuditPath,
      source_stage4_exit_audit_hash: stage4ExitAudit.auditHash,
      expected_stage4_exit_audit_hash: stage4ExitAudit.auditHash,
      stage4_exit_audit_hash_matches: true,
      stage4_exit_status: 'passed',
      stage4_exit_conditions_met: true,
      required_capability_count: 59,
      complete_supported_count: 59,
      stage5_entry_status: 'passed',
      stage5_entry_conditions_met: true,
      parent_stage_status_after_audit: 'running',
      stage5_exact_lock_implementation_allowed: true,
      exact_capability_lock_produced: false,
      production_default_cutover_active: false,
      legacy_authoritative_path_exited: false,
      final_closure_not_blocked: false,
      global_exit_conditions_met: false,
      next_checkpoint_id: STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID,
      blockers: []
    });
    expect(persisted.complete_supported_count).toBe((persisted.complete_supported_capability_ids as string[]).length);
  });
});

function currentStage5EntryInput(): {
  promotedSupport: DeepSeekRunAndGunProfileSupportSummary;
  application: Step37SupportPromotionApplicationReport;
  stage4ExitAudit: Step37Stage4ExitAuditReport;
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
  const persistedView = JSON.parse(readFileSync(supportPromotionCompleteSupportedViewPath, 'utf8'));
  const supportViewHash = hashStableJson(persistedView);
  const stage4ExitAudit = buildStep37Stage4ExitAuditReport({
    supportSummary: promotedSupport,
    promotionApplicationReport: application,
    sourceSupportViewPath: supportPromotionCompleteSupportedViewPath,
    sourceSupportViewHash: supportViewHash,
    expectedSupportViewHash: supportViewHash
  });
  return { promotedSupport, application, stage4ExitAudit };
}
