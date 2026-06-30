import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  STEP37_STAGE5_EXACT_CAPABILITY_LOCK_ARTIFACT_KIND,
  STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID,
  STEP37_STAGE5_EXACT_CAPABILITY_LOCK_SCHEMA_VERSION,
  STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID,
  buildDeepSeekRunAndGunValidationProfileSupportSummary,
  buildStep37ExactCapabilityLockReport,
  buildStep37PromotedSupportSummary,
  buildStep37Stage4ExitAuditReport,
  buildStep37Stage5EntryAuditReport,
  buildStep37SupportPromotionApplicationReport,
  buildStep37SupportPromotionInventory,
  createStep37CompleteSupportedPackageContracts,
  hashStep37SupportPromotionInventoryArtifact,
  parseStep37SupportPromotionInventoryArtifact,
  type DeepSeekRunAndGunProfileSupportSummary,
  type Step37Stage5EntryAuditReport,
  type Step37SupportPromotionApplicationReport
} from '../../packages/game-dsl/src/index.js';
import { hashStableJson } from '../../packages/game-dsl/src/gameplay-capabilities/stable-json.js';

const supportPromotionInventoryPath = 'docs/plans/step37-support-promotion-per-capability-inventory.v0.1.json';
const supportPromotionCompleteSupportedViewPath = 'docs/plans/step37-support-promotion-complete-supported-view.v0.1.json';
const stage4ExitAuditPath = 'docs/plans/step37-stage4-exit-audit-after-support-promotion.v0.1.json';
const stage5EntryAuditPath = 'docs/plans/step37-stage5-entry-audit-after-stage4-exit.v0.1.json';
const exactLockPath = 'docs/plans/step37-exact-capability-lock-from-complete-supported-packages.v0.1.json';

describe('Step37 Stage 5 exact capability lock from complete-supported packages', () => {
  it('builds an exact lock from the promoted 59/59 support view and package contracts without cutover', () => {
    const { promotedSupport, entryAudit } = currentExactLockInput();
    const report = buildStep37ExactCapabilityLockReport({
      supportSummary: promotedSupport,
      stage5EntryAuditReport: entryAudit,
      sourceStage5EntryAuditPath: stage5EntryAuditPath,
      sourceStage5EntryAuditHash: entryAudit.auditHash,
      expectedStage5EntryAuditHash: entryAudit.auditHash,
      packages: createStep37CompleteSupportedPackageContracts()
    });

    expect(report.artifactKind).toBe(STEP37_STAGE5_EXACT_CAPABILITY_LOCK_ARTIFACT_KIND);
    expect(report.schemaVersion).toBe(STEP37_STAGE5_EXACT_CAPABILITY_LOCK_SCHEMA_VERSION);
    expect(report.checkpointId).toBe(STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID);
    expect(report.exactLockStatus).toBe('passed');
    expect(report.exactLockProduced).toBe(true);
    expect(report.requiredCapabilityCount).toBe(59);
    expect(report.completeSupportedCount).toBe(59);
    expect(report.packageCount).toBe(59);
    expect(report.resolutionStatus).toBe('resolved');
    expect(report.capabilityLock).not.toBeNull();
    const capabilityLock = report.capabilityLock;
    if (capabilityLock === null) {
      throw new Error('expected exact capability lock to be produced');
    }
    expect(capabilityLock.capabilityIds).toEqual(report.completeSupportedCapabilityIds);
    expect(capabilityLock.packages.map((entry) => entry.capabilityId)).toEqual(report.completeSupportedCapabilityIds);
    expect(report.lockHash).toBe(capabilityLock.lockHash);
    expect(report.composedSchemaProduced).toBe(false);
    expect(report.productionDefaultCutoverActive).toBe(false);
    expect(report.legacyAuthoritativePathExited).toBe(false);
    expect(report.finalClosureNotBlocked).toBe(false);
    expect(report.globalExitConditionsMet).toBe(false);
    expect(report.nextCheckpointId).toBe(STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID);
    expect(report.blockers).toEqual([]);
  });

  it('fails closed when the reviewed Stage 5 entry audit hash drifts', () => {
    const { promotedSupport, entryAudit } = currentExactLockInput();
    const report = buildStep37ExactCapabilityLockReport({
      supportSummary: promotedSupport,
      stage5EntryAuditReport: entryAudit,
      sourceStage5EntryAuditPath: stage5EntryAuditPath,
      sourceStage5EntryAuditHash: entryAudit.auditHash,
      expectedStage5EntryAuditHash: 'fnv1a_wrong',
      packages: createStep37CompleteSupportedPackageContracts()
    });

    expect(report.exactLockStatus).toBe('blocked');
    expect(report.exactLockProduced).toBe(false);
    expect(report.nextCheckpointId).toBeNull();
    expect(report.blockers).toContainEqual({
      errorCode: 'STAGE5_EXACT_LOCK_STAGE5_ENTRY_AUDIT_HASH_MISMATCH',
      capabilityIds: [],
      actual: entryAudit.auditHash,
      expected: 'fnv1a_wrong'
    });
  });

  it('fails closed when a complete-supported capability lacks a matching package contract', () => {
    const { promotedSupport, entryAudit } = currentExactLockInput();
    const packages = createStep37CompleteSupportedPackageContracts().filter((contract) => contract.manifest.id !== 'weapon.spread_shot.v1');
    const report = buildStep37ExactCapabilityLockReport({
      supportSummary: promotedSupport,
      stage5EntryAuditReport: entryAudit,
      sourceStage5EntryAuditPath: stage5EntryAuditPath,
      sourceStage5EntryAuditHash: entryAudit.auditHash,
      expectedStage5EntryAuditHash: entryAudit.auditHash,
      packages
    });

    expect(report.exactLockStatus).toBe('blocked');
    expect(report.capabilityLock).toBeNull();
    expect(report.blockers).toContainEqual({
      errorCode: 'STAGE5_EXACT_LOCK_PACKAGE_IDS_MISMATCH',
      capabilityIds: ['weapon.spread_shot.v1']
    });
    expect(report.resolutionDiagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'MISSING_CAPABILITY', capabilityId: 'weapon.spread_shot.v1' })])
    );
  });

  it('fails closed when package contracts contain duplicate capability ownership', () => {
    const { promotedSupport, entryAudit } = currentExactLockInput();
    const packages = createStep37CompleteSupportedPackageContracts();
    const report = buildStep37ExactCapabilityLockReport({
      supportSummary: promotedSupport,
      stage5EntryAuditReport: entryAudit,
      sourceStage5EntryAuditPath: stage5EntryAuditPath,
      sourceStage5EntryAuditHash: entryAudit.auditHash,
      expectedStage5EntryAuditHash: entryAudit.auditHash,
      packages: [...packages, packages[0]]
    });

    expect(report.exactLockStatus).toBe('blocked');
    expect(report.capabilityLock).toBeNull();
    expect(report.blockers).toContainEqual({
      errorCode: 'STAGE5_EXACT_LOCK_DUPLICATE_PACKAGE_CAPABILITY',
      capabilityIds: [packages[0].manifest.id]
    });
  });

  it('fails closed when callers try to smuggle composed schema, cutover, legacy exit, or final closure into the exact-lock atom', () => {
    const { promotedSupport, entryAudit } = currentExactLockInput();
    const report = buildStep37ExactCapabilityLockReport({
      supportSummary: promotedSupport,
      stage5EntryAuditReport: entryAudit,
      sourceStage5EntryAuditPath: stage5EntryAuditPath,
      sourceStage5EntryAuditHash: entryAudit.auditHash,
      expectedStage5EntryAuditHash: entryAudit.auditHash,
      packages: createStep37CompleteSupportedPackageContracts(),
      composedSchemaProduced: true,
      productionDefaultCutoverActive: true,
      legacyAuthoritativePathExited: true,
      finalClosureNotBlocked: true
    });

    expect(report.exactLockStatus).toBe('blocked');
    expect(report.globalExitConditionsMet).toBe(false);
    expect(report.blockers.map((blocker) => blocker.errorCode)).toEqual(
      expect.arrayContaining([
        'STAGE5_EXACT_LOCK_COMPOSED_SCHEMA_PREMATURE',
        'STAGE5_EXACT_LOCK_PRODUCTION_CUTOVER_PREMATURE',
        'STAGE5_EXACT_LOCK_LEGACY_AUTHORITY_EXIT_PREMATURE',
        'STAGE5_EXACT_LOCK_FINAL_CLOSURE_PREMATURE'
      ])
    );
  });

  it('persists the exact capability lock as machine-readable evidence for the composed schema atom', () => {
    const { entryAudit } = currentExactLockInput();
    const persisted = JSON.parse(readFileSync(exactLockPath, 'utf8')) as Record<string, unknown>;
    const capabilityLock = persisted.capability_lock as { lockHash: string; capabilityIds: string[]; packages: Array<{ capabilityId: string }> };

    expect(persisted).toMatchObject({
      artifact_kind: STEP37_STAGE5_EXACT_CAPABILITY_LOCK_ARTIFACT_KIND,
      schema_version: STEP37_STAGE5_EXACT_CAPABILITY_LOCK_SCHEMA_VERSION,
      checkpoint_id: STEP37_STAGE5_EXACT_CAPABILITY_LOCK_FROM_COMPLETE_SUPPORTED_PACKAGES_CHECKPOINT_ID,
      parent_stage_id: 'stage5',
      source_stage5_entry_audit_path: stage5EntryAuditPath,
      source_stage5_entry_audit_hash: entryAudit.auditHash,
      expected_stage5_entry_audit_hash: entryAudit.auditHash,
      stage5_entry_audit_hash_matches: true,
      exact_lock_status: 'passed',
      exact_lock_produced: true,
      resolution_status: 'resolved',
      required_capability_count: 59,
      complete_supported_count: 59,
      package_count: 59,
      composed_schema_produced: false,
      production_default_cutover_active: false,
      legacy_authoritative_path_exited: false,
      final_closure_not_blocked: false,
      global_exit_conditions_met: false,
      next_checkpoint_id: STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID,
      blockers: []
    });
    expect(persisted.lock_hash).toBe(capabilityLock.lockHash);
    expect(capabilityLock.capabilityIds).toEqual(persisted.complete_supported_capability_ids);
    expect(capabilityLock.packages.map((entry) => entry.capabilityId)).toEqual(persisted.complete_supported_capability_ids);
  });
});

function currentExactLockInput(): {
  promotedSupport: DeepSeekRunAndGunProfileSupportSummary;
  application: Step37SupportPromotionApplicationReport;
  entryAudit: Step37Stage5EntryAuditReport;
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
  const entryAudit = buildStep37Stage5EntryAuditReport({
    supportSummary: promotedSupport,
    stage4ExitAuditReport: stage4ExitAudit,
    sourceStage4ExitAuditPath: stage4ExitAuditPath,
    sourceStage4ExitAuditHash: stage4ExitAudit.auditHash,
    expectedStage4ExitAuditHash: stage4ExitAudit.auditHash
  });
  return { promotedSupport, application, entryAudit };
}
