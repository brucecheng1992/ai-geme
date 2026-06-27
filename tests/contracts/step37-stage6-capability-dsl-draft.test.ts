import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  CapabilityGameDslDraftV1Schema,
  STEP37_STAGE6_CAPABILITY_DSL_DRAFT_ARTIFACT_KIND,
  STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
  STEP37_STAGE6_CAPABILITY_DSL_DRAFT_SCHEMA_VERSION,
  STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
  buildDeepSeekRunAndGunValidationProfileSupportSummary,
  buildStep37CapabilityDslDraftReport,
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
  type Step37ComposedDslSchemaReport
} from '../../packages/game-dsl/src/index.js';
import { hashStableJson } from '../../packages/game-dsl/src/gameplay-capabilities/stable-json.js';

const supportPromotionInventoryPath = 'docs/plans/step37-support-promotion-per-capability-inventory.v0.1.json';
const supportPromotionCompleteSupportedViewPath = 'docs/plans/step37-support-promotion-complete-supported-view.v0.1.json';
const stage4ExitAuditPath = 'docs/plans/step37-stage4-exit-audit-after-support-promotion.v0.1.json';
const stage5EntryAuditPath = 'docs/plans/step37-stage5-entry-audit-after-stage4-exit.v0.1.json';
const exactLockPath = 'docs/plans/step37-exact-capability-lock-from-complete-supported-packages.v0.1.json';
const composedSchemaPath = 'docs/plans/step37-composed-dsl-schema-from-exact-capability-lock.v0.1.json';
const capabilityDslDraftPath = 'docs/plans/step37-capability-dsl-draft-from-composed-schema.v0.1.json';

describe('Step37 Stage 6 capability DSL draft from composed schema', () => {
  it('produces a valid CapabilityGameDslDraft v1 artifact from the composed schema without entering normalization or runtime gates', () => {
    const composedSchema = currentComposedSchemaReport();
    const report = buildStep37CapabilityDslDraftReport({
      composedSchemaReport: composedSchema,
      sourceComposedSchemaPath: composedSchemaPath,
      sourceComposedSchemaAuditHash: composedSchema.auditHash,
      expectedComposedSchemaAuditHash: composedSchema.auditHash
    });

    expect(report.artifactKind).toBe(STEP37_STAGE6_CAPABILITY_DSL_DRAFT_ARTIFACT_KIND);
    expect(report.schemaVersion).toBe(STEP37_STAGE6_CAPABILITY_DSL_DRAFT_SCHEMA_VERSION);
    expect(report.checkpointId).toBe(STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID);
    expect(report.draftStatus).toBe('passed');
    expect(report.capabilityDslDraftProduced).toBe(true);
    expect(report.providerDraftProduced).toBe(false);
    expect(report.schemaExpressible).toBe(true);
    expect(report.capabilityDslDraft).not.toBeNull();
    expect(CapabilityGameDslDraftV1Schema.parse(report.capabilityDslDraft)).toEqual(report.capabilityDslDraft);
    expect(report.capabilityDslDraft?.profile.id).toBe(composedSchema.draftProfileId);
    expect(report.draftCapabilityIds).toEqual(composedSchema.completeSupportedCapabilityIds);
    expect(report.composedSchemaCapabilityIds).toEqual(composedSchema.completeSupportedCapabilityIds);
    expect(report.draftHash).toBe(hashStableJson(report.capabilityDslDraft));
    expect(report.normalized).toBe(false);
    expect(report.compiled).toBe(false);
    expect(report.runtimeConsumed).toBe(false);
    expect(report.qaObserved).toBe(false);
    expect(report.productionDefaultCutoverActive).toBe(false);
    expect(report.legacyAuthoritativePathExited).toBe(false);
    expect(report.finalClosureNotBlocked).toBe(false);
    expect(report.globalExitConditionsMet).toBe(false);
    expect(report.nextCheckpointId).toBe(STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID);
    expect(report.blockers).toEqual([]);
  });

  it('fails closed when the reviewed composed-schema audit hash drifts', () => {
    const composedSchema = currentComposedSchemaReport();
    const report = buildStep37CapabilityDslDraftReport({
      composedSchemaReport: composedSchema,
      sourceComposedSchemaPath: composedSchemaPath,
      sourceComposedSchemaAuditHash: composedSchema.auditHash,
      expectedComposedSchemaAuditHash: 'fnv1a_wrong'
    });

    expect(report.draftStatus).toBe('blocked');
    expect(report.capabilityDslDraftProduced).toBe(false);
    expect(report.providerDraftProduced).toBe(false);
    expect(report.nextCheckpointId).toBeNull();
    expect(report.blockers).toContainEqual({
      errorCode: 'STAGE6_CAPABILITY_DSL_DRAFT_COMPOSED_SCHEMA_AUDIT_HASH_MISMATCH',
      capabilityIds: [],
      actual: composedSchema.auditHash,
      expected: 'fnv1a_wrong'
    });
  });

  it('fails closed when draft capability identities diverge from the composed schema', () => {
    const composedSchema = currentComposedSchemaReport();
    const staleCapabilityIds = composedSchema.completeSupportedCapabilityIds.filter((capabilityId) => capabilityId !== 'weapon.spread_shot.v1');
    const report = buildStep37CapabilityDslDraftReport({
      composedSchemaReport: composedSchema,
      sourceComposedSchemaPath: composedSchemaPath,
      sourceComposedSchemaAuditHash: composedSchema.auditHash,
      expectedComposedSchemaAuditHash: composedSchema.auditHash,
      capabilityDslDraft: createDraftOverride(composedSchema, staleCapabilityIds)
    });

    expect(report.draftStatus).toBe('blocked');
    expect(report.blockers).toContainEqual({
      errorCode: 'STAGE6_CAPABILITY_DSL_DRAFT_CAPABILITY_IDS_MISMATCH',
      capabilityIds: ['weapon.spread_shot.v1']
    });
  });

  it('fails closed when trusted evidence fields are smuggled into the model-owned draft payload', () => {
    const composedSchema = currentComposedSchemaReport();
    const report = buildStep37CapabilityDslDraftReport({
      composedSchemaReport: composedSchema,
      sourceComposedSchemaPath: composedSchemaPath,
      sourceComposedSchemaAuditHash: composedSchema.auditHash,
      expectedComposedSchemaAuditHash: composedSchema.auditHash,
      capabilityDslDraft: {
        ...createDraftOverride(composedSchema, composedSchema.completeSupportedCapabilityIds),
        capability_configs: [
          {
            id: 'fake_lock_fact',
            capability_id: 'movement.run_jump.v1',
            applies_to: ['player'],
            config: { capabilityLockHash: 'fnv1a_deadbeef' }
          }
        ]
      }
    });

    expect(report.draftStatus).toBe('blocked');
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          errorCode: 'STAGE6_CAPABILITY_DSL_DRAFT_SCHEMA_INVALID',
          expected: 'valid_capability_game_dsl_draft_v1'
        })
      ])
    );
  });

  it('fails closed when normalization, runtime, cutover, legacy exit, or final closure is smuggled into this atom', () => {
    const composedSchema = currentComposedSchemaReport();
    const report = buildStep37CapabilityDslDraftReport({
      composedSchemaReport: composedSchema,
      sourceComposedSchemaPath: composedSchemaPath,
      sourceComposedSchemaAuditHash: composedSchema.auditHash,
      expectedComposedSchemaAuditHash: composedSchema.auditHash,
      normalized: true,
      compiled: true,
      runtimeConsumed: true,
      qaObserved: true,
      productionDefaultCutoverActive: true,
      legacyAuthoritativePathExited: true,
      finalClosureNotBlocked: true
    });

    expect(report.draftStatus).toBe('blocked');
    expect(report.globalExitConditionsMet).toBe(false);
    expect(report.blockers.map((blocker) => blocker.errorCode)).toEqual(
      expect.arrayContaining([
        'STAGE6_CAPABILITY_DSL_DRAFT_NORMALIZATION_PREMATURE',
        'STAGE6_CAPABILITY_DSL_DRAFT_COMPILATION_PREMATURE',
        'STAGE6_CAPABILITY_DSL_DRAFT_RUNTIME_CONSUMPTION_PREMATURE',
        'STAGE6_CAPABILITY_DSL_DRAFT_QA_OBSERVATION_PREMATURE',
        'STAGE6_CAPABILITY_DSL_DRAFT_PRODUCTION_CUTOVER_PREMATURE',
        'STAGE6_CAPABILITY_DSL_DRAFT_LEGACY_AUTHORITY_EXIT_PREMATURE',
        'STAGE6_CAPABILITY_DSL_DRAFT_FINAL_CLOSURE_PREMATURE'
      ])
    );
  });

  it('persists draft evidence without normalization, runtime, cutover, legacy exit, or final closure', () => {
    const composedSchema = currentComposedSchemaReport();
    const persisted = JSON.parse(readFileSync(capabilityDslDraftPath, 'utf8')) as Record<string, unknown>;
    const draft = persisted.capability_dsl_draft as { capabilities: string[]; profile: { id: string } };

    expect(persisted).toMatchObject({
      artifact_kind: STEP37_STAGE6_CAPABILITY_DSL_DRAFT_ARTIFACT_KIND,
      schema_version: STEP37_STAGE6_CAPABILITY_DSL_DRAFT_SCHEMA_VERSION,
      checkpoint_id: STEP37_STAGE6_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
      source_composed_schema_path: composedSchemaPath,
      source_composed_schema_audit_hash: composedSchema.auditHash,
      expected_composed_schema_audit_hash: composedSchema.auditHash,
      composed_schema_audit_hash_matches: true,
      source_composed_schema_hash: composedSchema.composedSchemaHash,
      draft_status: 'passed',
      capability_dsl_draft_produced: true,
      provider_draft_produced: false,
      schema_expressible: true,
      normalized: false,
      compiled: false,
      runtime_consumed: false,
      qa_observed: false,
      production_default_cutover_active: false,
      legacy_authoritative_path_exited: false,
      final_closure_not_blocked: false,
      global_exit_conditions_met: false,
      parent_stage_status_after_draft: 'running',
      next_checkpoint_id: STEP37_STAGE7_NORMALIZE_CAPABILITY_DSL_DRAFT_FROM_COMPOSED_SCHEMA_CHECKPOINT_ID,
      blockers: []
    });
    expect(persisted.draft_hash).toBe(hashStableJson(draft));
    expect(draft.profile.id).toBe(composedSchema.draftProfileId);
    expect(draft.capabilities).toEqual(composedSchema.completeSupportedCapabilityIds);
    expect(CapabilityGameDslDraftV1Schema.parse(draft)).toEqual(draft);
  });
});

function currentComposedSchemaReport(): Step37ComposedDslSchemaReport {
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
  return buildStep37ComposedDslSchemaReport({
    exactCapabilityLockReport: exactLock,
    sourceExactCapabilityLockPath: exactLockPath,
    sourceExactCapabilityLockAuditHash: exactLock.auditHash,
    expectedExactCapabilityLockAuditHash: exactLock.auditHash
  });
}

function createDraftOverride(composedSchema: Step37ComposedDslSchemaReport, capabilityIds: string[]): Record<string, unknown> {
  const sortedCapabilityIds = [...capabilityIds].sort();
  return {
    artifactKind: 'capability_game_dsl_draft',
    schemaVersion: 'capability-game-dsl-draft.v1',
    profile: { id: composedSchema.draftProfileId },
    play_time_intent: { mode: 'range', min_sec: 480, max_sec: 720 },
    capabilities: sortedCapabilityIds,
    progression: {
      estimated_total_sec: { min_sec: 480, max_sec: 720 },
      segments: [
        { id: 'approach', order: 0, duration_target_sec: { min_sec: 160, max_sec: 240 } },
        { id: 'escalation', order: 1, duration_target_sec: { min_sec: 160, max_sec: 240 } },
        { id: 'finale', order: 2, duration_target_sec: { min_sec: 160, max_sec: 240 } }
      ]
    },
    scenes: [{ id: 'main_scene', segment_refs: ['approach', 'escalation', 'finale'], entity_refs: ['player'] }],
    entities: [{ id: 'player', role: 'player' }],
    behaviors: [],
    waves: [],
    pickups: [],
    objectives: [{ id: 'survive_goal', kind: 'survive_duration', target: { min_sec: 480 }, success_condition: { event: 'timer.reached' } }],
    bosses: [],
    capability_configs: sortedCapabilityIds.map((capabilityId) => ({
      id: `cfg_${capabilityId.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`,
      capability_id: capabilityId,
      config: { enabled: true, design_note: 'declared_by_stage6_draft' }
    })),
    metadata: { title: 'Step37 capability DSL draft' }
  };
}
