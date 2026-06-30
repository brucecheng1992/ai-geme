import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  STEP37_SUPPORT_PROMOTION_INVENTORY_ARTIFACT_KIND,
  STEP37_SUPPORT_PROMOTION_INVENTORY_CHECKPOINT_ID,
  STEP37_SUPPORT_PROMOTION_INVENTORY_SCHEMA_VERSION,
  buildStep37PromotedSupportSummary,
  buildStep37SupportPromotionApplicationReport,
  buildDeepSeekRunAndGunValidationProfileSupportSummary,
  buildStep37SupportPromotionInventory,
  hashStep37SupportPromotionInventoryArtifact,
  parseStep37SupportPromotionInventoryArtifact,
  type DeepSeekRunAndGunProfileCapabilitySupport,
  type DeepSeekRunAndGunProfileSupportSummary,
  type Step37SupportPromotionCapabilityClosureRecord,
  type Step37SupportPromotionInventoryArtifact
} from '../../packages/game-dsl/src/index.js';

const supportPromotionInventoryPath = 'docs/plans/step37-support-promotion-per-capability-inventory.v0.1.json';
const supportPromotionCompleteSupportedViewPath = 'docs/plans/step37-support-promotion-complete-supported-view.v0.1.json';
const currentRunId = 'run-step37-stage4-package-receipts';
const sourcePlanRevision = '0171ce6ef5c9bb7d7a45e4f21596a8dba6425477:docs/plans/step37-authoritative-path-reconciliation-stage-04-complete-capability-packages.md';

describe('Step37 support-promotion per-capability inventory', () => {
  it('does not let aggregate observed 59/59 substitute for per-capability closure records', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const aggregateObservedIds = support.capabilities.map((capability) => capability.capabilityId);
    const report = buildStep37SupportPromotionInventory({
      supportSummary: support,
      aggregateObservedCapabilityIds: aggregateObservedIds,
      currentRunId,
      capabilityClosureRecords: [],
      sourcePlanRevision
    });

    expect(report.artifactKind).toBe(STEP37_SUPPORT_PROMOTION_INVENTORY_ARTIFACT_KIND);
    expect(report.schemaVersion).toBe(STEP37_SUPPORT_PROMOTION_INVENTORY_SCHEMA_VERSION);
    expect(report.requiredCapabilityCount).toBe(59);
    expect(report.registeredCapabilityCount).toBe(59);
    expect(report.aggregateObservedCount).toBe(59);
    expect(report.machineParseableClosureCount).toBe(0);
    expect(report.missingClosureEntries).toHaveLength(59);
    expect(report.promotionEligibleCount).toBe(0);
    expect(report.supportPromotionInputStatus).toBe('blocked');
    expect(report.gapTypes).toContain('missing_per_capability_metadata');
    expect(report.gapTypes).toContain('aggregate_only_evidence');
    expect(report.stage5EntryAllowed).toBe(false);
  });

  it('classifies duplicate, stale, generic-only and wrong-package entries before promotion eligibility', () => {
    const support = supportSummary([
      capability('ready.alpha.v1'),
      capability('duplicate.beta.v1'),
      capability('stale.gamma.v1'),
      capability('generic.delta.v1'),
      capability('wrong.epsilon.v1'),
      capability('missing.zeta.v1'),
      capability('wrong_stage.eta.v1'),
      capability('wrong_checkpoint.theta.v1')
    ]);
    const report = buildStep37SupportPromotionInventory({
      supportSummary: support,
      aggregateObservedCapabilityIds: support.capabilities.map((capabilityItem) => capabilityItem.capabilityId),
      currentRunId,
      sourcePlanRevision,
      capabilityClosureRecords: [
        record('ready.alpha.v1'),
        record('duplicate.beta.v1'),
        record('duplicate.beta.v1'),
        record('stale.gamma.v1', { evidenceRunId: 'previous-run', evidenceRunScope: 'previous_run' }),
        record('generic.delta.v1', { evidenceScope: 'generic_only' }),
        record('wrong.epsilon.v1', { packageId: 'wrong.other_package.v1' }),
        record('wrong_stage.eta.v1', { parentStageId: 'stage5' }),
        record('wrong_checkpoint.theta.v1', {
          checkpointId: 'stage4.other_checkpoint.complete_supported_package_slice'
        })
      ]
    });

    expect(report.promotionEligibleEntries.map((entry) => entry.capabilityId)).toEqual(['ready.alpha.v1']);
    expect(report.duplicateEntries).toEqual([
      {
        capabilityId: 'duplicate.beta.v1',
        recordCount: 2,
        checkpointIds: [
          'stage4.duplicate_beta_v1.complete_supported_package_slice',
          'stage4.duplicate_beta_v1.complete_supported_package_slice'
        ]
      }
    ]);
    expect(report.staleOrPreviousRunEntries.map((entry) => entry.capabilityId)).toEqual(['stale.gamma.v1']);
    expect(report.genericOnlyEvidenceEntries.map((entry) => entry.capabilityId)).toEqual(['generic.delta.v1']);
    expect(report.wrongPackageEntries).toEqual([
      {
        capabilityId: 'wrong.epsilon.v1',
        packageId: 'wrong.other_package.v1',
        expectedPackageId: 'wrong.epsilon.v1',
        checkpointId: 'stage4.wrong_epsilon_v1.complete_supported_package_slice'
      }
    ]);
    expect(report.wrongParentStageEntries).toEqual([
      {
        capabilityId: 'wrong_stage.eta.v1',
        checkpointId: 'stage4.wrong_stage_eta_v1.complete_supported_package_slice',
        parentStageId: 'stage5',
        expectedParentStageId: 'stage4'
      }
    ]);
    expect(report.wrongCheckpointEntries).toEqual([
      {
        capabilityId: 'wrong_checkpoint.theta.v1',
        checkpointId: 'stage4.other_checkpoint.complete_supported_package_slice',
        expectedCheckpointId: 'stage4.wrong_checkpoint_theta_v1.complete_supported_package_slice',
        parentStageId: 'stage4'
      }
    ]);
    expect(report.missingClosureEntries).toEqual(['missing.zeta.v1']);
    expect(report.supportPromotionInputStatus).toBe('blocked');
    expect(report.stage5EntryAllowed).toBe(false);
  });

  it('blocks promotion when a per-capability closure lacks Oracle approval', () => {
    const support = supportSummary([capability('oracle.approved.v1'), capability('oracle.missing.v1')]);
    const report = buildStep37SupportPromotionInventory({
      supportSummary: support,
      aggregateObservedCapabilityIds: support.capabilities.map((capabilityItem) => capabilityItem.capabilityId),
      currentRunId,
      sourcePlanRevision,
      capabilityClosureRecords: [record('oracle.approved.v1'), record('oracle.missing.v1', { oracleStatus: 'not_approved' })]
    });

    expect(report.missingOracleApprovalEntries.map((entry) => entry.capabilityId)).toEqual(['oracle.missing.v1']);
    expect(report.promotionEligibleEntries.map((entry) => entry.capabilityId)).toEqual(['oracle.approved.v1']);
    expect(report.supportPromotionInputStatus).toBe('blocked');
    const application = buildStep37SupportPromotionApplicationReport({
      supportSummary: support,
      inventoryReport: report,
      sourceInventoryPath: supportPromotionInventoryPath,
      sourceInventoryHash: 'fnv1a_test',
      expectedInventoryHash: 'fnv1a_test'
    });
    expect(application.applicationStatus).toBe('blocked');
    expect(application.blockers).toContainEqual({
      errorCode: 'SUPPORT_PROMOTION_ORACLE_APPROVAL_MISSING',
      capabilityIds: ['oracle.missing.v1']
    });
  });

  it('requires the current Stage 4 support-promotion inventory to machine-verify every required capability without promoting static support', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const inventory = readStage4SupportPromotionInventory();
    const report = buildStep37SupportPromotionInventory({
      supportSummary: support,
      aggregateObservedCapabilityIds: inventory.aggregateObservedCapabilityIds,
      currentRunId: inventory.currentRunId,
      sourcePlanRevision: inventory.sourcePlanRevision,
      capabilityClosureRecords: inventory.capabilityClosureRecords
    });

    expect(inventory.artifactKind).toBe(STEP37_SUPPORT_PROMOTION_INVENTORY_ARTIFACT_KIND);
    expect(inventory.schemaVersion).toBe(STEP37_SUPPORT_PROMOTION_INVENTORY_SCHEMA_VERSION);
    expect(inventory.checkpointId).toBe(STEP37_SUPPORT_PROMOTION_INVENTORY_CHECKPOINT_ID);
    expect(report.requiredCapabilityCount).toBe(59);
    expect(report.registeredCapabilityCount).toBe(59);
    expect(report.completeSupportedCount).toBe(0);
    expect(report.aggregateObservedCount).toBe(59);
    expect(report.machineParseableClosureCount).toBe(59);
    expect(report.missingClosureEntries).toEqual([]);
    expect(report.duplicateEntries).toEqual([]);
    expect(report.staleOrPreviousRunEntries).toEqual([]);
    expect(report.genericOnlyEvidenceEntries).toEqual([]);
    expect(report.wrongPackageEntries).toEqual([]);
    expect(report.wrongParentStageEntries).toEqual([]);
    expect(report.wrongCheckpointEntries).toEqual([]);
    expect(report.missingOracleApprovalEntries).toEqual([]);
    expect(report.promotionEligibleCount).toBe(59);
    expect(report.supportPromotionInputStatus).toBe('ready');
    expect(report.stage5EntryAllowed).toBe(false);
    for (const record of inventory.capabilityClosureRecords) {
      expect(record.receiptRef).toMatch(/^[0-9a-f]{40}$/);
      expect(gitObjectExists(record.receiptRef)).toBe(true);
    }
  });

  it('applies the current verified inventory into a promoted complete-supported support view without hardcoding the count', () => {
    const support = buildDeepSeekRunAndGunValidationProfileSupportSummary();
    const inventory = readStage4SupportPromotionInventory();
    const report = buildStep37SupportPromotionInventory({
      supportSummary: support,
      aggregateObservedCapabilityIds: inventory.aggregateObservedCapabilityIds,
      currentRunId: inventory.currentRunId,
      sourcePlanRevision: inventory.sourcePlanRevision,
      capabilityClosureRecords: inventory.capabilityClosureRecords
    });
    const inventoryHash = hashStep37SupportPromotionInventoryArtifact(inventory);
    const application = buildStep37SupportPromotionApplicationReport({
      supportSummary: support,
      inventoryReport: report,
      sourceInventoryPath: supportPromotionInventoryPath,
      sourceInventoryHash: inventoryHash,
      expectedInventoryHash: inventoryHash
    });
    const promotedSupport = buildStep37PromotedSupportSummary({ supportSummary: support, promotionApplicationReport: application });

    expect(application.applicationStatus).toBe('applied');
    expect(application.inventoryHashMatches).toBe(true);
    expect(application.completeSupportedCount).toBe(application.completeSupportedCapabilityIds.length);
    expect(application.completeSupportedCount).toBe(59);
    expect(application.stage5EntryAllowed).toBe(false);
    expect(promotedSupport.summary.completeSupportedCount).toBe(59);
    expect(promotedSupport.capabilities).toHaveLength(59);
    expect(promotedSupport.capabilities.every((capabilityItem) => capabilityItem.completeSupported)).toBe(true);
    expect(promotedSupport.capabilities.every((capabilityItem) => capabilityItem.classification === 'COMPLETE_SUPPORTED')).toBe(true);

    const persistedView = JSON.parse(readFileSync(supportPromotionCompleteSupportedViewPath, 'utf8')) as Record<string, unknown>;
    expect(persistedView).toMatchObject({
      artifact_kind: 'step37_support_promotion_complete_supported_view',
      schema_version: 'step37_support_promotion_complete_supported_view.v0.1',
      checkpoint_id: STEP37_SUPPORT_PROMOTION_INVENTORY_CHECKPOINT_ID,
      source_inventory_hash: inventoryHash,
      expected_inventory_hash: inventoryHash,
      inventory_hash_matches: true,
      support_summary_consumer: 'buildStep37PromotedSupportSummary',
      support_promotion_input_status: 'ready',
      application_status: 'applied',
      promotion_eligible_count: 59,
      complete_supported_count: 59,
      stage5_entry_allowed: false
    });
    expect(persistedView.complete_supported_count).toBe((persistedView.complete_supported_capability_ids as string[]).length);
  });

  it('fails closed when the inventory hash no longer matches the reviewed promotion input', () => {
    const support = supportSummary([capability('hash.alpha.v1')]);
    const report = buildStep37SupportPromotionInventory({
      supportSummary: support,
      aggregateObservedCapabilityIds: ['hash.alpha.v1'],
      currentRunId,
      sourcePlanRevision,
      capabilityClosureRecords: [record('hash.alpha.v1')]
    });
    const application = buildStep37SupportPromotionApplicationReport({
      supportSummary: support,
      inventoryReport: report,
      sourceInventoryPath: supportPromotionInventoryPath,
      sourceInventoryHash: 'fnv1a_current',
      expectedInventoryHash: 'fnv1a_reviewed'
    });

    expect(application.applicationStatus).toBe('blocked');
    expect(application.inventoryHashMatches).toBe(false);
    expect(application.completeSupportedCount).toBe(0);
    expect(application.blockers).toContainEqual({
      errorCode: 'SUPPORT_PROMOTION_INVENTORY_HASH_MISMATCH',
      capabilityIds: [],
      actual: 'fnv1a_current',
      expected: 'fnv1a_reviewed'
    });
    expect(() => buildStep37PromotedSupportSummary({ supportSummary: support, promotionApplicationReport: application })).toThrow(
      /STEP37_SUPPORT_PROMOTION_APPLICATION_BLOCKED/
    );
  });

  it('fails closed when the machine-readable artifact is missing required closure metadata', () => {
    const parsed = JSON.parse(readFileSync(supportPromotionInventoryPath, 'utf8')) as Record<string, unknown>;
    const records = parsed.capability_closure_records as Array<Record<string, unknown>>;
    const [firstRecord, ...remainingRecords] = records;
    expect(firstRecord).toBeDefined();
    const { receipt_ref: _receiptRef, ...recordWithoutReceiptRef } = firstRecord;

    expect(() =>
      parseStep37SupportPromotionInventoryArtifact({
        ...parsed,
        capability_closure_records: [recordWithoutReceiptRef, ...remainingRecords]
      })
    ).toThrow(/STEP37_SUPPORT_PROMOTION_INVENTORY_STRING_REQUIRED field="receipt_ref"/);
  });

  it('fails closed when the artifact checkpoint identity does not match the support-promotion atom', () => {
    const parsed = JSON.parse(readFileSync(supportPromotionInventoryPath, 'utf8')) as Record<string, unknown>;

    expect(() =>
      parseStep37SupportPromotionInventoryArtifact({
        ...parsed,
        checkpoint_id: 'stage5.entry_audit.v1'
      })
    ).toThrow(/STEP37_SUPPORT_PROMOTION_INVENTORY_INVALID_CHECKPOINT_ID/);
  });
});

function supportSummary(capabilities: DeepSeekRunAndGunProfileCapabilitySupport[]): DeepSeekRunAndGunProfileSupportSummary {
  return {
    profileId: 'DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1',
    profileVersion: 'v1',
    summary: {
      requirementCount: capabilities.length,
      capabilityClusterCount: 1,
      requiredCapabilityCount: capabilities.length,
      registeredCapabilityCount: capabilities.length,
      completeSupportedCount: 0,
      legacyBackedCapabilityCount: 0
    },
    capabilities
  };
}

function capability(capabilityId: string): DeepSeekRunAndGunProfileCapabilitySupport {
  return {
    capabilityId,
    registered: true,
    classification: 'DEFERRED',
    evidenceDimensions: {
      schema_expressible: true,
      normalized: true,
      compiled: true,
      runtime_consumed: true,
      qa_observed: false
    },
    missingEvidenceDimensions: ['qa_observed'],
    missingSupportEvidencePrerequisites: ['requiredProbesVerified'],
    completeSupported: false,
    legacyBacked: false
  };
}

function record(
  capabilityId: string,
  overrides: Partial<Step37SupportPromotionCapabilityClosureRecord> = {}
): Step37SupportPromotionCapabilityClosureRecord {
  const checkpointId = `stage4.${capabilityId.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase()}.complete_supported_package_slice`;
  return {
    capabilityId,
    packageId: capabilityId,
    checkpointId,
    parentStageId: 'stage4',
    closureStatus: 'closed',
    receiptStatus: 'receipt_closed',
    oracleStatus: 'approved',
    receiptRef: `receipt.${capabilityId}`,
    sourceRevision: `commit.${capabilityId}:docs/plans/stage4.md`,
    sourceSection: `Stage 4 ${capabilityId} closure`,
    evidenceRunId: currentRunId,
    evidenceRunScope: 'same_run',
    evidenceScope: 'capability_specific',
    ...overrides
  };
}

function readStage4SupportPromotionInventory(): Step37SupportPromotionInventoryArtifact {
  return parseStep37SupportPromotionInventoryArtifact(JSON.parse(readFileSync(supportPromotionInventoryPath, 'utf8')));
}

function gitObjectExists(commitSha: string): boolean {
  try {
    execFileSync('git', ['cat-file', '-e', `${commitSha}^{commit}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
