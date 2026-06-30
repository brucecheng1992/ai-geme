import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_CHECKPOINT_ID,
  STEP37_STAGE4_EXIT_AUDIT_ARTIFACT_KIND,
  STEP37_STAGE4_EXIT_AUDIT_SCHEMA_VERSION,
  STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID,
  buildDeepSeekRunAndGunValidationProfileSupportSummary,
  buildStep37PromotedSupportSummary,
  buildStep37Stage4ExitAuditReport,
  buildStep37SupportPromotionApplicationReport,
  buildStep37SupportPromotionInventory,
  hashStep37SupportPromotionInventoryArtifact,
  parseStep37SupportPromotionInventoryArtifact,
  type DeepSeekRunAndGunProfileSupportSummary,
  type Step37SupportPromotionApplicationReport
} from '../../packages/game-dsl/src/index.js';
import { hashStableJson } from '../../packages/game-dsl/src/gameplay-capabilities/stable-json.js';

const supportPromotionInventoryPath = 'docs/plans/step37-support-promotion-per-capability-inventory.v0.1.json';
const supportPromotionCompleteSupportedViewPath = 'docs/plans/step37-support-promotion-complete-supported-view.v0.1.json';
const stage4ExitAuditPath = 'docs/plans/step37-stage4-exit-audit-after-support-promotion.v0.1.json';

describe('Step37 Stage 4 exit audit after support promotion', () => {
  it('passes only after the promoted support view is hash-bound and fully consumed', () => {
    const { promotedSupport, application, supportViewHash } = currentPromotedSupportInput();
    const audit = buildStep37Stage4ExitAuditReport({
      supportSummary: promotedSupport,
      promotionApplicationReport: application,
      sourceSupportViewPath: supportPromotionCompleteSupportedViewPath,
      sourceSupportViewHash: supportViewHash,
      expectedSupportViewHash: supportViewHash
    });

    expect(audit.artifactKind).toBe(STEP37_STAGE4_EXIT_AUDIT_ARTIFACT_KIND);
    expect(audit.schemaVersion).toBe(STEP37_STAGE4_EXIT_AUDIT_SCHEMA_VERSION);
    expect(audit.checkpointId).toBe(STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_CHECKPOINT_ID);
    expect(audit.stage4ExitStatus).toBe('passed');
    expect(audit.stage4ExitConditionsMet).toBe(true);
    expect(audit.requiredCapabilityCount).toBe(59);
    expect(audit.registeredCapabilityCount).toBe(59);
    expect(audit.completeSupportedCount).toBe(59);
    expect(audit.promotionEligibleCount).toBe(59);
    expect(audit.supportViewHashMatches).toBe(true);
    expect(audit.parentStageStatusAfterAudit).toBe('complete');
    expect(audit.stage5EntryAuditAllowed).toBe(true);
    expect(audit.stage5ExactLockAllowed).toBe(false);
    expect(audit.productionDefaultCutoverActive).toBe(false);
    expect(audit.legacyAuthoritativePathExited).toBe(false);
    expect(audit.finalClosureNotBlocked).toBe(false);
    expect(audit.globalExitConditionsMet).toBe(false);
    expect(audit.nextCheckpointId).toBe(STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID);
    expect(audit.blockers).toEqual([]);
  });

  it('fails closed when complete support has not actually been consumed by the support summary', () => {
    const { application, supportViewHash } = currentPromotedSupportInput();
    const audit = buildStep37Stage4ExitAuditReport({
      supportSummary: buildDeepSeekRunAndGunValidationProfileSupportSummary(),
      promotionApplicationReport: application,
      sourceSupportViewPath: supportPromotionCompleteSupportedViewPath,
      sourceSupportViewHash: supportViewHash,
      expectedSupportViewHash: supportViewHash
    });

    expect(audit.stage4ExitStatus).toBe('blocked');
    expect(audit.stage4ExitConditionsMet).toBe(false);
    expect(audit.nextCheckpointId).toBeNull();
    expect(audit.blockers).toEqual(
      expect.arrayContaining([
        {
          errorCode: 'STAGE4_EXIT_SUPPORT_SUMMARY_NOT_COMPLETE',
          capabilityIds: application.completeSupportedCapabilityIds,
          actual: 0,
          expected: 59
        }
      ])
    );
  });

  it('fails closed when the reviewed promoted support-view hash drifts', () => {
    const { promotedSupport, application, supportViewHash } = currentPromotedSupportInput();
    const audit = buildStep37Stage4ExitAuditReport({
      supportSummary: promotedSupport,
      promotionApplicationReport: application,
      sourceSupportViewPath: supportPromotionCompleteSupportedViewPath,
      sourceSupportViewHash: supportViewHash,
      expectedSupportViewHash: 'fnv1a_wrong'
    });

    expect(audit.stage4ExitStatus).toBe('blocked');
    expect(audit.supportViewHashMatches).toBe(false);
    expect(audit.blockers).toContainEqual({
      errorCode: 'STAGE4_EXIT_SUPPORT_VIEW_HASH_MISMATCH',
      capabilityIds: [],
      actual: supportViewHash,
      expected: 'fnv1a_wrong'
    });
  });

  it('fails closed when callers try to smuggle Stage 5 exact lock, cutover, legacy exit, or final closure into the audit', () => {
    const { promotedSupport, application, supportViewHash } = currentPromotedSupportInput();
    const audit = buildStep37Stage4ExitAuditReport({
      supportSummary: promotedSupport,
      promotionApplicationReport: application,
      sourceSupportViewPath: supportPromotionCompleteSupportedViewPath,
      sourceSupportViewHash: supportViewHash,
      expectedSupportViewHash: supportViewHash,
      stage5ExactLockAllowed: true,
      productionDefaultCutoverActive: true,
      legacyAuthoritativePathExited: true,
      finalClosureNotBlocked: true
    });

    expect(audit.stage4ExitStatus).toBe('blocked');
    expect(audit.globalExitConditionsMet).toBe(false);
    expect(audit.blockers.map((blocker) => blocker.errorCode)).toEqual(
      expect.arrayContaining([
        'STAGE4_EXIT_STAGE5_EXACT_LOCK_PREMATURE',
        'STAGE4_EXIT_PRODUCTION_CUTOVER_PREMATURE',
        'STAGE4_EXIT_LEGACY_AUTHORITY_EXIT_PREMATURE',
        'STAGE4_EXIT_FINAL_CLOSURE_PREMATURE'
      ])
    );
  });

  it('persists the current Stage 4 exit audit as a machine-readable artifact without entering Stage 5', () => {
    const { application, supportViewHash } = currentPromotedSupportInput();
    const persisted = JSON.parse(readFileSync(stage4ExitAuditPath, 'utf8')) as Record<string, unknown>;

    expect(persisted).toMatchObject({
      artifact_kind: STEP37_STAGE4_EXIT_AUDIT_ARTIFACT_KIND,
      schema_version: STEP37_STAGE4_EXIT_AUDIT_SCHEMA_VERSION,
      checkpoint_id: STEP37_STAGE4_EXIT_AUDIT_AFTER_SUPPORT_PROMOTION_CHECKPOINT_ID,
      source_support_view_path: supportPromotionCompleteSupportedViewPath,
      source_support_view_hash: supportViewHash,
      expected_support_view_hash: supportViewHash,
      support_view_hash_matches: true,
      support_promotion_application_status: 'applied',
      support_summary_consumer: 'buildStep37PromotedSupportSummary',
      source_inventory_hash: application.sourceInventoryHash,
      required_capability_count: 59,
      registered_capability_count: 59,
      promotion_eligible_count: 59,
      complete_supported_count: 59,
      stage4_exit_status: 'passed',
      stage4_exit_conditions_met: true,
      parent_stage_status_after_audit: 'complete',
      stage5_entry_audit_allowed: true,
      stage5_exact_lock_allowed: false,
      production_default_cutover_active: false,
      legacy_authoritative_path_exited: false,
      final_closure_not_blocked: false,
      global_exit_conditions_met: false,
      next_checkpoint_id: STEP37_STAGE5_ENTRY_AUDIT_AFTER_STAGE4_EXIT_CHECKPOINT_ID,
      blockers: []
    });
    expect(persisted.complete_supported_count).toBe((persisted.complete_supported_capability_ids as string[]).length);
  });
});

function currentPromotedSupportInput(): {
  promotedSupport: DeepSeekRunAndGunProfileSupportSummary;
  application: Step37SupportPromotionApplicationReport;
  supportViewHash: string;
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
  return {
    promotedSupport,
    application,
    supportViewHash: hashStableJson(persistedView)
  };
}
