import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
  STEP37_STAGE6_COMPOSED_DSL_SCHEMA_ARTIFACT_KIND,
  STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID,
  STEP37_STAGE6_COMPOSED_DSL_SCHEMA_SCHEMA_VERSION,
  buildCapabilityGameDslDraftComposedSchemaIdentity,
  buildDeepSeekRunAndGunValidationProfileSupportSummary,
  buildStep37ComposedDslSchemaReport,
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
  type Step37ExactCapabilityLockReport,
  type Step37Stage5EntryAuditReport,
  type Step37SupportPromotionApplicationReport
} from '../../packages/game-dsl/src/index.js';
import { hashStableJson } from '../../packages/game-dsl/src/gameplay-capabilities/stable-json.js';
import { RUN_AND_GUN_REFERENCE_PROFILE_ID } from '../../packages/game-dsl/src/gameplay-capabilities/run-and-gun-reference-composition.js';

const supportPromotionInventoryPath = 'docs/plans/step37-support-promotion-per-capability-inventory.v0.1.json';
const supportPromotionCompleteSupportedViewPath = 'docs/plans/step37-support-promotion-complete-supported-view.v0.1.json';
const stage4ExitAuditPath = 'docs/plans/step37-stage4-exit-audit-after-support-promotion.v0.1.json';
const stage5EntryAuditPath = 'docs/plans/step37-stage5-entry-audit-after-stage4-exit.v0.1.json';
const exactLockPath = 'docs/plans/step37-exact-capability-lock-from-complete-supported-packages.v0.1.json';
const composedSchemaPath = 'docs/plans/step37-composed-dsl-schema-from-exact-capability-lock.v0.1.json';

describe('Step37 Stage 6 composed DSL schema from exact capability lock', () => {
  it('builds a deterministic composed schema identity from the exact 59/59 capability lock without entering downstream gates', () => {
    const { exactLock } = currentComposedSchemaInput();
    const report = buildStep37ComposedDslSchemaReport({
      exactCapabilityLockReport: exactLock,
      sourceExactCapabilityLockPath: exactLockPath,
      sourceExactCapabilityLockAuditHash: exactLock.auditHash,
      expectedExactCapabilityLockAuditHash: exactLock.auditHash
    });

    expect(report.artifactKind).toBe(STEP37_STAGE6_COMPOSED_DSL_SCHEMA_ARTIFACT_KIND);
    expect(report.schemaVersion).toBe(STEP37_STAGE6_COMPOSED_DSL_SCHEMA_SCHEMA_VERSION);
    expect(report.checkpointId).toBe(STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID);
    expect(report.composedSchemaStatus).toBe('passed');
    expect(report.composedSchemaProduced).toBe(true);
    expect(report.schemaExpressible).toBe(true);
    expect(report.draftProfileId).toBe(RUN_AND_GUN_REFERENCE_PROFILE_ID);
    expect(report.completeSupportedCount).toBe(59);
    expect(report.packageCount).toBe(59);
    expect(report.composedSchemaIdentity).not.toBeNull();
    expect(report.composedSchemaIdentity?.profileId).toBe(RUN_AND_GUN_REFERENCE_PROFILE_ID);
    expect(report.composedSchemaIdentity?.capabilityIds).toEqual(report.completeSupportedCapabilityIds);
    expect(report.composedSchemaHash).toBe(report.composedSchemaIdentity?.schemaHash);
    expect(report.providerDraftProduced).toBe(false);
    expect(report.normalized).toBe(false);
    expect(report.compiled).toBe(false);
    expect(report.runtimeConsumed).toBe(false);
    expect(report.qaObserved).toBe(false);
    expect(report.productionDefaultCutoverActive).toBe(false);
    expect(report.legacyAuthoritativePathExited).toBe(false);
    expect(report.finalClosureNotBlocked).toBe(false);
    expect(report.globalExitConditionsMet).toBe(false);
    expect(report.parentStageStatusAfterSchema).toBe('running');
    expect(report.nextCheckpointId).toBe(STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID);
    expect(report.blockers).toEqual([]);
  });

  it('fails closed when the reviewed exact-lock audit hash drifts', () => {
    const { exactLock } = currentComposedSchemaInput();
    const report = buildStep37ComposedDslSchemaReport({
      exactCapabilityLockReport: exactLock,
      sourceExactCapabilityLockPath: exactLockPath,
      sourceExactCapabilityLockAuditHash: exactLock.auditHash,
      expectedExactCapabilityLockAuditHash: 'fnv1a_wrong'
    });

    expect(report.composedSchemaStatus).toBe('blocked');
    expect(report.composedSchemaProduced).toBe(false);
    expect(report.nextCheckpointId).toBeNull();
    expect(report.blockers).toContainEqual({
      errorCode: 'STAGE6_COMPOSED_SCHEMA_EXACT_LOCK_AUDIT_HASH_MISMATCH',
      capabilityIds: [],
      actual: exactLock.auditHash,
      expected: 'fnv1a_wrong'
    });
  });

  it('fails closed when exact-lock capability identities drift before schema composition', () => {
    const { exactLock } = currentComposedSchemaInput();
    const staleExactLock: Step37ExactCapabilityLockReport = {
      ...exactLock,
      selectedCapabilityIds: exactLock.selectedCapabilityIds.filter((capabilityId) => capabilityId !== 'weapon.spread_shot.v1')
    };
    const report = buildStep37ComposedDslSchemaReport({
      exactCapabilityLockReport: staleExactLock,
      sourceExactCapabilityLockPath: exactLockPath,
      sourceExactCapabilityLockAuditHash: exactLock.auditHash,
      expectedExactCapabilityLockAuditHash: exactLock.auditHash
    });

    expect(report.composedSchemaStatus).toBe('blocked');
    expect(report.blockers).toContainEqual({
      errorCode: 'STAGE6_COMPOSED_SCHEMA_CAPABILITY_IDS_MISMATCH',
      capabilityIds: ['weapon.spread_shot.v1']
    });
  });

  it('fails closed when a caller supplies a stale composed schema identity hash', () => {
    const { exactLock } = currentComposedSchemaInput();
    const identity = buildCapabilityGameDslDraftComposedSchemaIdentity({
      profileId: RUN_AND_GUN_REFERENCE_PROFILE_ID,
      capabilityIds: exactLock.completeSupportedCapabilityIds
    });
    const report = buildStep37ComposedDslSchemaReport({
      exactCapabilityLockReport: exactLock,
      sourceExactCapabilityLockPath: exactLockPath,
      sourceExactCapabilityLockAuditHash: exactLock.auditHash,
      expectedExactCapabilityLockAuditHash: exactLock.auditHash,
      composedSchemaIdentity: { ...identity, schemaHash: 'fnv1a_deadbeef' }
    });

    expect(report.composedSchemaStatus).toBe('blocked');
    expect(report.composedSchemaIdentity).toBeNull();
    expect(report.blockers).toContainEqual({
      errorCode: 'STAGE6_COMPOSED_SCHEMA_IDENTITY_INVALID',
      capabilityIds: exactLock.completeSupportedCapabilityIds,
      actual: null,
      expected: 'valid_composed_schema_identity'
    });
  });

  it('fails closed when downstream draft, normalization, runtime, cutover, legacy exit, or final closure is smuggled into this atom', () => {
    const { exactLock } = currentComposedSchemaInput();
    const report = buildStep37ComposedDslSchemaReport({
      exactCapabilityLockReport: exactLock,
      sourceExactCapabilityLockPath: exactLockPath,
      sourceExactCapabilityLockAuditHash: exactLock.auditHash,
      expectedExactCapabilityLockAuditHash: exactLock.auditHash,
      providerDraftProduced: true,
      normalized: true,
      compiled: true,
      runtimeConsumed: true,
      qaObserved: true,
      productionDefaultCutoverActive: true,
      legacyAuthoritativePathExited: true,
      finalClosureNotBlocked: true
    });

    expect(report.composedSchemaStatus).toBe('blocked');
    expect(report.globalExitConditionsMet).toBe(false);
    expect(report.blockers.map((blocker) => blocker.errorCode)).toEqual(
      expect.arrayContaining([
        'STAGE6_COMPOSED_SCHEMA_PROVIDER_DRAFT_PREMATURE',
        'STAGE6_COMPOSED_SCHEMA_NORMALIZATION_PREMATURE',
        'STAGE6_COMPOSED_SCHEMA_COMPILATION_PREMATURE',
        'STAGE6_COMPOSED_SCHEMA_RUNTIME_CONSUMPTION_PREMATURE',
        'STAGE6_COMPOSED_SCHEMA_QA_OBSERVATION_PREMATURE',
        'STAGE6_COMPOSED_SCHEMA_PRODUCTION_CUTOVER_PREMATURE',
        'STAGE6_COMPOSED_SCHEMA_LEGACY_AUTHORITY_EXIT_PREMATURE',
        'STAGE6_COMPOSED_SCHEMA_FINAL_CLOSURE_PREMATURE'
      ])
    );
  });

  it('persists composed schema evidence without model draft, normalization, runtime, cutover, or final closure', () => {
    const { exactLock } = currentComposedSchemaInput();
    const persisted = JSON.parse(readFileSync(composedSchemaPath, 'utf8')) as Record<string, unknown>;
    const identity = persisted.composed_schema_identity as { profileId: string; capabilityIds: string[]; schemaHash: string };

    expect(persisted).toMatchObject({
      artifact_kind: STEP37_STAGE6_COMPOSED_DSL_SCHEMA_ARTIFACT_KIND,
      schema_version: STEP37_STAGE6_COMPOSED_DSL_SCHEMA_SCHEMA_VERSION,
      checkpoint_id: STEP37_STAGE6_COMPOSED_DSL_SCHEMA_FROM_EXACT_CAPABILITY_LOCK_CHECKPOINT_ID,
      parent_stage_id: 'stage6',
      source_exact_capability_lock_path: exactLockPath,
      source_exact_capability_lock_audit_hash: exactLock.auditHash,
      expected_exact_capability_lock_audit_hash: exactLock.auditHash,
      exact_capability_lock_audit_hash_matches: true,
      source_exact_capability_lock_hash: exactLock.lockHash,
      composed_schema_status: 'passed',
      composed_schema_produced: true,
      schema_expressible: true,
      provider_draft_produced: false,
      normalized: false,
      compiled: false,
      runtime_consumed: false,
      qa_observed: false,
      production_default_cutover_active: false,
      legacy_authoritative_path_exited: false,
      final_closure_not_blocked: false,
      global_exit_conditions_met: false,
      parent_stage_status_after_schema: 'running',
      next_checkpoint_id: STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
      blockers: []
    });
    expect(persisted.composed_schema_hash).toBe(identity.schemaHash);
    expect(identity.profileId).toBe(RUN_AND_GUN_REFERENCE_PROFILE_ID);
    expect(identity.capabilityIds).toEqual(persisted.complete_supported_capability_ids);
  });
});

function currentComposedSchemaInput(): {
  promotedSupport: DeepSeekRunAndGunProfileSupportSummary;
  application: Step37SupportPromotionApplicationReport;
  entryAudit: Step37Stage5EntryAuditReport;
  exactLock: Step37ExactCapabilityLockReport;
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
  const exactLock = buildStep37ExactCapabilityLockReport({
    supportSummary: promotedSupport,
    stage5EntryAuditReport: entryAudit,
    sourceStage5EntryAuditPath: stage5EntryAuditPath,
    sourceStage5EntryAuditHash: entryAudit.auditHash,
    expectedStage5EntryAuditHash: entryAudit.auditHash,
    packages: createStep37CompleteSupportedPackageContracts()
  });
  return { promotedSupport, application, entryAudit, exactLock };
}
